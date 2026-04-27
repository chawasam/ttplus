// tiktok.js — จัดการ TikTok Live connection + auto-reconnect exponential backoff (3s→5s→10s→20s→40s→60s×5)
const { WebcastPushConnection } = require('tiktok-live-connector');
const { logSession, logError } = require('../utils/logger');
const { sanitizeTikTokEvent, sanitizeStr } = require('../utils/validate');
const { processGift }  = require('./game/tiktokCurrency');
const { checkChatVerify } = require('./game/account');
const { processEvent } = require('./actions/eventProcessor');
const crypto = require('crypto');
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'default_salt';

const activeConnections = new Map(); // userId -> { connection, tiktokUsername, connectedAt, manualDisconnect }
const reconnectTimers   = new Map(); // userId -> timerId
const reconnectAttempts = new Map(); // userId -> attempt count
const likesLeaderboard  = new Map(); // vjId -> Map<uniqueId, {nickname, profilePictureUrl, likeCount}>
const giftsLeaderboard  = new Map(); // vjId -> Map<uniqueId, {nickname, profilePictureUrl, totalCoins}>

// จำกัด connections สูงสุดต่อ server (ป้องกัน resource exhaustion)
const MAX_CONNECTIONS        = 100;
const MAX_RECONNECT_ATTEMPTS = 10;   // ~3s+5s+10s+20s+40s+60s×5 ≈ 8 นาที
const RECONNECT_BASE_MS      = 3000; // delay ครั้งแรก (เร็วขึ้น)
const RECONNECT_CAP_MS       = 60_000; // cap ที่ 60 วิ (ไม่รอนานเกิน)

// Timeout สำหรับ connect (ms)
const CONNECT_TIMEOUT_MS = 15000;

// ===== Reconnect helpers =====

function clearReconnectTimer(userId) {
  const t = reconnectTimers.get(userId);
  if (t) { clearTimeout(t); reconnectTimers.delete(userId); }
}

function scheduleReconnect(userId, tiktokUsername, io, socketId) {
  const attempt   = (reconnectAttempts.get(userId) || 0) + 1;
  const widgetRoom = `widget_${userId}`;
  reconnectAttempts.set(userId, attempt);

  if (attempt > MAX_RECONNECT_ATTEMPTS) {
    // หมดความพยายาม — แจ้ง disconnect จริง
    reconnectAttempts.delete(userId);
    console.log(`[TikTok] Auto-reconnect exhausted for @${tiktokUsername} (userId=${userId})`);
    if (socketId) io.to(socketId).emit('connection_status', { status: 'disconnected', tiktokUsername });
    io.to(widgetRoom).emit('connection_status', { status: 'disconnected', tiktokUsername });
    return;
  }

  // Exponential backoff: 3s → 5s → 10s → 20s → 40s → 60s (cap, attempts 6-10 คง 60s)
  const delayMs = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt - 1), RECONNECT_CAP_MS);

  console.log(`[TikTok] Auto-reconnect @${tiktokUsername} attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs / 1000}s`);

  if (socketId) io.to(socketId).emit('connection_status', {
    status: 'reconnecting', tiktokUsername, attempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, nextRetryMs: delayMs,
  });
  io.to(widgetRoom).emit('connection_status', {
    status: 'reconnecting', tiktokUsername, attempt, maxAttempts: MAX_RECONNECT_ATTEMPTS, nextRetryMs: delayMs,
  });

  const timer = setTimeout(async () => {
    reconnectTimers.delete(userId);
    if (activeConnections.has(userId)) return; // เชื่อมต่อแล้ว (อาจมีคนกด reconnect manual)

    try {
      await startConnection(userId, tiktokUsername, io, socketId);
      reconnectAttempts.delete(userId); // สำเร็จ — reset attempts
    } catch {
      // startConnection ส่ง error event ให้ frontend แล้ว
      // วนต่อ (scheduleReconnect ถูกเรียกจาก error catch ใน startConnection ไม่ได้ — ต้องเรียกตรงนี้)
      scheduleReconnect(userId, tiktokUsername, io, socketId);
    }
  }, delayMs);

  reconnectTimers.set(userId, timer);
}

// ===== Main connection =====

async function startConnection(userId, tiktokUsername, io, socketId) {
  // ตรวจ server capacity
  if (activeConnections.size >= MAX_CONNECTIONS) {
    throw new Error('Server is at capacity. Please try again later.');
  }

  // ถ้ามี connection เดิม ให้ disconnect ก่อน
  if (activeConnections.has(userId)) {
    await stopConnection(userId);
  }

  const connection = new WebcastPushConnection(tiktokUsername, {
    processInitialData: false,  // false = ไม่ replay event เก่าก่อนเชื่อมต่อ (ป้องกัน TTS/actions ยิงทันที)
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: false, // false = ใช้ HTTP polling (ไม่ต้องการ sessionId)
    requestPollingIntervalMs: 2000,
  });

  // Timeout wrapper
  const connectWithTimeout = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Connection timed out. Please try again.'));
    }, CONNECT_TIMEOUT_MS);

    connection.connect()
      .then(state => { clearTimeout(timer); resolve(state); })
      .catch(err  => { clearTimeout(timer); reject(err); });
  });

  try {
    const state = await connectWithTimeout();

    activeConnections.set(userId, {
      connection,
      tiktokUsername,
      connectedAt:      Date.now(),
      manualDisconnect: false,
    });

    // Reset leaderboards on new connection
    likesLeaderboard.set(userId, new Map());
    giftsLeaderboard.set(userId, new Map());

    await logSession({ userId, tiktokUsername, action: 'connect', roomId: state.roomId });

    const widgetRoom = `widget_${userId}`;
    const emitAll = (event, payload) => {
      if (socketId) io.to(socketId).emit(event, payload);
      io.to(widgetRoom).emit(event, payload);
    };

    if (socketId) {
      io.to(socketId).emit('connection_status', {
        status: 'connected',
        tiktokUsername,
        roomId: state.roomId,
      });
    }

    // ===== Event Listeners =====

    connection.on('chat', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const chatPayload = {
        type: 'chat',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        comment:           safe.comment,
        bio:               sanitizeStr(String(data.userDetails?.bioDescription || data.bioDescription || ''), 150),
        followRole:        Number(data.followRole) || 0,
        timestamp:         Date.now(),
      };
      emitAll('chat', chatPayload);
      checkChatVerify(safe.uniqueId, safe.comment || '').catch(() => {});
      // ลูกเล่น TT — fire chat/command events
      processEvent(userId, 'chat', { ...chatPayload, comment: safe.comment || '' }).catch(() => {});
    });

    connection.on('gift', (data) => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      const safe         = sanitizeTikTokEvent(data);
      const diamondCount = Math.max(0, Number(data.diamondCount) || 0);
      const repeatCount  = Math.min(Number(data.repeatCount) || 1, 9999);
      const coinsThisEvent = diamondCount * repeatCount;
      const giftPayload  = {
        type: 'gift',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        giftName:          safe.giftName,
        giftPictureUrl:    safe.giftPictureUrl,
        diamondCount,
        repeatCount,
        timestamp:         Date.now(),
      };
      emitAll('gift', giftPayload);
      // Update gifts leaderboard
      const glb = giftsLeaderboard.get(userId) || new Map();
      const gprev = glb.get(safe.uniqueId) || { nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, totalCoins: 0 };
      glb.set(safe.uniqueId, { ...gprev, nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, totalCoins: gprev.totalCoins + coinsThisEvent });
      giftsLeaderboard.set(userId, glb);
      // Game currency pipeline
      if (diamondCount > 0) {
        const socketIp = io?.sockets?.sockets?.get?.(socketId)?.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || '';
        const ipHash   = socketIp ? crypto.createHmac('sha256', IP_HASH_SALT).update(socketIp).digest('hex').slice(0, 16) : null;
        processGift({
          vjUid:          userId,
          tiktokUniqueId: safe.uniqueId,
          giftName:       safe.giftName,
          diamondCount,
          repeatCount,
          serverTime:     Date.now(),
          ipHash,
        }).catch(err => console.error('[TikTok] processGift error:', err?.message));
      }
      // ลูกเล่น TT — fire gift events
      processEvent(userId, 'gift', giftPayload).catch(() => {});
    });

    connection.on('like', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const likeCount = Math.max(0, Number(data.likeCount) || 0);
      const likePayload = {
        type: 'like',
        uniqueId:       safe.uniqueId,
        nickname:       safe.nickname,
        likeCount:      likeCount,
        totalLikeCount: Math.max(0, Number(data.totalLikeCount) || 0),
        timestamp:      Date.now(),
      };
      emitAll('like', likePayload);
      // Update likes leaderboard
      const lb = likesLeaderboard.get(userId) || new Map();
      const prev = lb.get(safe.uniqueId) || { nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, likeCount: 0 };
      lb.set(safe.uniqueId, { ...prev, nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, likeCount: prev.likeCount + likeCount });
      likesLeaderboard.set(userId, lb);
      // ลูกเล่น TT — fire like events
      processEvent(userId, 'like', likePayload).catch(() => {});
    });

    connection.on('follow', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const followPayload = {
        type: 'follow',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        timestamp:         Date.now(),
      };
      emitAll('follow', followPayload);
      // ลูกเล่น TT — fire follow events
      processEvent(userId, 'follow', followPayload).catch(() => {});
    });

    connection.on('share', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const sharePayload = {
        type: 'share',
        uniqueId:  safe.uniqueId,
        nickname:  safe.nickname,
        timestamp: Date.now(),
      };
      emitAll('share', sharePayload);
      // ลูกเล่น TT — fire share events
      processEvent(userId, 'share', sharePayload).catch(() => {});
    });

    connection.on('roomUser', (data) => {
      emitAll('roomUser', {
        viewerCount: Math.max(0, Number(data.viewerCount) || 0),
        timestamp:   Date.now(),
      });
    });

    connection.on('disconnected', async () => {
      const conn      = activeConnections.get(userId);
      const wasManual = conn?.manualDisconnect ?? false;

      activeConnections.delete(userId);
      await logSession({ userId, tiktokUsername, action: 'disconnect' });

      if (wasManual) {
        // Manual stop — แจ้ง disconnected ทันที ไม่ reconnect
        if (socketId) io.to(socketId).emit('connection_status', { status: 'disconnected', tiktokUsername });
        io.to(widgetRoom).emit('connection_status', { status: 'disconnected', tiktokUsername });
      } else {
        // TikTok-initiated disconnect — เริ่ม auto-reconnect
        console.log(`[TikTok] Unexpected disconnect for @${tiktokUsername} — scheduling reconnect`);
        scheduleReconnect(userId, tiktokUsername, io, socketId);
      }
    });

    connection.on('error', async (err) => {
      console.error(`[TikTok] Error for @${tiktokUsername}:`, err.message);
      await logError(userId, tiktokUsername, err.message);
      if (socketId) io.to(socketId).emit('connection_error', { message: 'Connection error. Please reconnect.' });
    });

  } catch (err) {
    console.error(`[TikTok] Failed to connect @${tiktokUsername}:`, err.message);
    await logError(userId, tiktokUsername, err.message);

    const raw = err.message || '';
    let userMessage = `เชื่อมต่อไม่ได้: ${raw.slice(0, 120)}`;
    if (raw.toLowerCase().includes('offline') || raw.toLowerCase().includes('is not live')) {
      userMessage = `@${tiktokUsername} ไม่ได้ไลฟ์อยู่ในขณะนี้`;
    } else if (raw.includes('timed out')) {
      userMessage = 'Connection timed out. Please try again.';
    } else if (raw.includes('not found') || raw.includes('404')) {
      userMessage = `ไม่พบ username @${tiktokUsername}`;
    } else if (raw.toLowerCase().includes('rate limit') || raw.includes('429')) {
      userMessage = 'TikTok rate limit — รอสักครู่แล้วลองใหม่';
    } else if (raw.toLowerCase().includes('unauthorized') || raw.includes('403')) {
      userMessage = 'TikTok ปฏิเสธการเชื่อมต่อ (403) — อาจต้องใส่ sessionId';
    }

    if (socketId) io.to(socketId).emit('connection_status', { status: 'error', message: userMessage });
    throw new Error(userMessage);
  }
}

async function stopConnection(userId) {
  clearReconnectTimer(userId);
  reconnectAttempts.delete(userId);

  const conn = activeConnections.get(userId);
  if (!conn) return;

  // ตั้ง flag ก่อน disconnect เพื่อกัน auto-reconnect
  conn.manualDisconnect = true;

  try { conn.connection.disconnect(); } catch (e) { console.warn('[TikTok] disconnect error:', e?.message); }
  activeConnections.delete(userId);
  await logSession({ userId, tiktokUsername: conn.tiktokUsername, action: 'manual_disconnect' });
}

function hasConnection(userId) {
  return activeConnections.has(userId);
}

function getActiveConnectionCount() {
  return activeConnections.size;
}

function getLeaderboard(vjId, type) {
  const lb = type === 'likes' ? likesLeaderboard.get(vjId) : giftsLeaderboard.get(vjId);
  if (!lb) return [];
  return Array.from(lb.values())
    .sort((a, b) => (type === 'likes' ? b.likeCount - a.likeCount : b.totalCoins - a.totalCoins))
    .slice(0, 10);
}

module.exports = { startConnection, stopConnection, hasConnection, getActiveConnectionCount, getLeaderboard };
