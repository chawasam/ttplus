// tiktok.js — จัดการ TikTok Live connection + auto-reconnect exponential backoff (3s→5s→10s→20s→40s→60s×5)
const { WebcastPushConnection } = require('tiktok-live-connector');
const { logSession, logError } = require('../utils/logger');
const { sanitizeTikTokEvent, sanitizeStr } = require('../utils/validate');
const { processGift }  = require('./game/tiktokCurrency');
const { checkChatVerify } = require('./game/account');
const { processEvent, invalidateCache, clearVjCooldowns } = require('./actions/eventProcessor');
const crypto = require('crypto');
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'default_salt';

const admin = require('firebase-admin');

const activeConnections = new Map(); // userId -> { connection, tiktokUsername, connectedAt, manualDisconnect }
const reconnectTimers   = new Map(); // userId -> timerId
const reconnectAttempts = new Map(); // userId -> attempt count
const likesLeaderboard  = new Map(); // vjId -> Map<uniqueId, {nickname, profilePictureUrl, likeCount}>
const giftsLeaderboard  = new Map(); // vjId -> Map<uniqueId, {nickname, profilePictureUrl, totalCoins}>
const recentMembers     = new Map(); // vjId -> [{uniqueId, nickname, profilePictureUrl, joinedAt}, ...] (max 50)
const lbPersistTimers   = new Map(); // vjId -> debounce timer handle
// Global gift catalog — TikTok gift definitions เหมือนกันทุกคน ไม่ต้อง per-user
// รวบรวมจาก extendedGiftInfo ระหว่าง live + persist ลง Firestore
const globalGiftCatalog = new Map(); // name -> { name, diamondCount, pictureUrl }
let   giftCatalogLoaded = false;     // โหลดจาก Firestore ครั้งแรกแล้วหรือยัง

const MAX_MEMBERS_TRACK = 50;

// First-activity tracking: vjUid → Set<uniqueId> (reset ทุก manual connect)
const firstActivityUsers = new Map();

// ตรวจและ mark first activity — return true ถ้าเป็นครั้งแรกของ user นี้ใน session
function checkFirstActivity(vjUid, uniqueId) {
  if (!uniqueId) return false;
  const seen = firstActivityUsers.get(vjUid) || new Set();
  if (seen.has(uniqueId)) return false;
  seen.add(uniqueId);
  firstActivityUsers.set(vjUid, seen);
  return true;
}

// จำกัด connections สูงสุดต่อ server (ป้องกัน resource exhaustion)
const MAX_CONNECTIONS        = 100;
const MAX_RECONNECT_ATTEMPTS = 10;   // ~3s+5s+10s+20s+40s+60s×5 ≈ 8 นาที
const RECONNECT_BASE_MS      = 3000; // delay ครั้งแรก (เร็วขึ้น)
const RECONNECT_CAP_MS       = 60_000; // cap ที่ 60 วิ (ไม่รอนานเกิน)

// Timeout สำหรับ connect (ms)
const CONNECT_TIMEOUT_MS = 15000;

// ===== Global Gift Catalog — Firestore Persistence =====

// โหลด gift catalog จาก Firestore ครั้งแรก (เรียกตอน getGiftCatalog ครั้งแรก)
async function ensureGiftCatalogLoaded() {
  if (giftCatalogLoaded) return;
  giftCatalogLoaded = true; // ตั้งเลย ป้องกัน race condition
  try {
    const doc = await admin.firestore().collection('system').doc('gift_catalog').get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data.gifts)) {
        for (const g of data.gifts) {
          if (g.name && !globalGiftCatalog.has(g.name)) {
            globalGiftCatalog.set(g.name, {
              name:        g.name,
              diamondCount: Number(g.diamondCount) || 0,
              pictureUrl:  g.pictureUrl || '',
            });
          }
        }
        console.log(`[GiftCatalog] โหลดจาก Firestore ${globalGiftCatalog.size} รายการ`);
      }
    }
  } catch (e) {
    console.warn('[GiftCatalog] โหลดจาก Firestore ไม่ได้:', e?.message);
  }
}

// debounce timer สำหรับบันทึก gift catalog
let giftCatalogSaveTimer = null;

function schedulePersistGiftCatalog() {
  if (giftCatalogSaveTimer) clearTimeout(giftCatalogSaveTimer);
  giftCatalogSaveTimer = setTimeout(async () => {
    giftCatalogSaveTimer = null;
    try {
      const gifts = Array.from(globalGiftCatalog.values());
      await admin.firestore().collection('system').doc('gift_catalog').set({
        gifts,
        updatedAt: Date.now(),
        count:     gifts.length,
      });
      console.log(`[GiftCatalog] บันทึก ${gifts.length} รายการลง Firestore`);
    } catch (e) {
      console.warn('[GiftCatalog] บันทึกลง Firestore ไม่ได้:', e?.message);
    }
  }, 5000); // debounce 5 วิ
}

// ===== Leaderboard Firestore Persistence =====

// บันทึก leaderboard ลง Firestore แบบ debounced (รอ 5 วิ หลังอัปเดตล่าสุด)
// ป้องกัน write เยอะเกินตอนมี gift combo
function schedulePersistLeaderboard(userId) {
  if (lbPersistTimers.has(userId)) clearTimeout(lbPersistTimers.get(userId));
  const timer = setTimeout(async () => {
    lbPersistTimers.delete(userId);
    try {
      const giftsData = getLeaderboard(userId, 'gifts');
      const likesData = getLeaderboard(userId, 'likes');
      await admin.firestore().collection('leaderboard_state').doc(userId).set({
        gifts:     giftsData,
        likes:     likesData,
        updatedAt: Date.now(),
      });
    } catch {} // silent — in-memory ยังทำงานได้ปกติ
  }, 5000);
  lbPersistTimers.set(userId, timer);
}

// โหลด leaderboard จาก Firestore ถ้า in-memory ว่างเปล่า (เช่น backend restart)
async function loadLeaderboardFromFirestore(userId) {
  try {
    const doc = await admin.firestore().collection('leaderboard_state').doc(userId).get();
    if (!doc.exists) return;
    const data = doc.data();
    if (Array.isArray(data.gifts) && data.gifts.length > 0) {
      const glb = new Map();
      for (const item of data.gifts) {
        if (item.uniqueId) glb.set(item.uniqueId, item);
      }
      giftsLeaderboard.set(userId, glb);
    }
    if (Array.isArray(data.likes) && data.likes.length > 0) {
      const llb = new Map();
      for (const item of data.likes) {
        if (item.uniqueId) llb.set(item.uniqueId, item);
      }
      likesLeaderboard.set(userId, llb);
    }
  } catch {} // silent
}

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
      await startConnection(userId, tiktokUsername, io, socketId, true); // isReconnect=true → ไม่ reset leaderboard
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

async function startConnection(userId, tiktokUsername, io, socketId, isReconnect = false) {
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
    enableWebsocketUpgrade: true,
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
      socketId,          // เก็บ socketId ไว้เพื่อ emit kicked ไปยัง tab ที่ถูก takeover
    });

    // Invalidate event/action cache ทุกครั้ง — ให้ VJ เห็นการแก้ไขล่าสุดทันที
    invalidateCache(userId);

    // Reset leaderboards เฉพาะ manual connect ใหม่ (ไม่รีเซ็ตตอน auto-reconnect)
    // → ชื่อคนส่งของขวัญยังอยู่บน leaderboard แม้ VJ หลุดแล้วเชื่อมต่อใหม่
    if (!isReconnect) {
      likesLeaderboard.set(userId, new Map());
      giftsLeaderboard.set(userId, new Map());
      recentMembers.set(userId, []);
      firstActivityUsers.set(userId, new Set()); // reset first-activity tracking
      // ลบ Firestore state ของ session เก่า — session ใหม่เริ่มนับใหม่
      admin.firestore().collection('leaderboard_state').doc(userId).delete().catch(() => {});
      // ลบ stale queue items ที่ค้างจาก session เก่า (> 10 นาที)
      const staleCutoff = Date.now() - 10 * 60 * 1000;
      admin.firestore().collection('tt_action_queue')
        .where('vjUid', '==', userId)
        .where('queuedAt', '<', staleCutoff)
        .get()
        .then(snap => {
          if (snap.empty) return;
          const batch = admin.firestore().batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          return batch.commit();
        })
        .catch(() => {});
    }

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
        isSubscriber:      !!(data.isSubscriber   ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:       !!(data.isModerator    ?? data.userDetails?.isModerator),
        isTopGifter:       !!(data.isTopGifter),
        isSubscriberEmote: !!(data.isSubscriberEmote),
        isFanClubSticker:  !!(data.isFanClubSticker),
        timestamp:         Date.now(),
      };
      emitAll('chat', chatPayload);
      checkChatVerify(safe.uniqueId, safe.comment || '').catch(() => {});
      // ลูกเล่น TT — fire chat/command events + first_activity
      const chatEvPayload = { ...chatPayload, comment: safe.comment || '' };
      processEvent(userId, 'chat', chatEvPayload).catch(() => {});
      if (checkFirstActivity(userId, safe.uniqueId)) {
        processEvent(userId, 'first_activity', chatEvPayload).catch(() => {});
      }
    });

    connection.on('gift', (data) => {
      const isStreakable = data.giftType === 1;          // gift ที่กดค้างได้ (combo)
      const isRepeatEnd  = !isStreakable || !!data.repeatEnd; // true = event สุดท้าย / non-combo

      const safe         = sanitizeTikTokEvent(data);
      const diamondCount = Math.max(0, Number(data.diamondCount) || 0);
      const repeatCount  = Math.min(Number(data.repeatCount) || 1, 9999);

      // ── Emit ทุก event (intermediate + final) ให้ widget แสดงผลทันที ──
      // isRepeatEnd=false  → intermediate tap (fireworks จุด 1 ลูก)
      // isRepeatEnd=true   → final / non-combo (fireworks จุดตาม repeatCount)
      const giftPayload = {
        type: 'gift',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        giftName:          safe.giftName,
        giftPictureUrl:    safe.giftPictureUrl,
        diamondCount,
        repeatCount,
        isStreakable,   // widget ใช้ตัดสินใจจำนวน rocket
        isRepeatEnd,    // widget ใช้ตัดสินใจจำนวน rocket
        followRole:    Number(data.followRole) || 0,
        isSubscriber:  !!(data.isSubscriber  ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:   !!(data.isModerator   ?? data.userDetails?.isModerator),
        isTopGifter:   !!(data.isTopGifter),
        timestamp:      Date.now(),
      };
      emitAll('gift', giftPayload);

      // ── รวบรวม gift catalog จาก extendedGiftInfo (global) ──
      const extInfo = data.extendedGiftInfo;
      const gName   = extInfo?.name ? String(extInfo.name).trim() : safe.giftName;
      if (gName && !globalGiftCatalog.has(gName)) {
        // ดึง pictureUrl — ลอง extendedGiftInfo.image.urls[0] ก่อน, fallback safe.giftPictureUrl
        const extImgUrl = extInfo?.image?.urls?.[0] || extInfo?.icon?.urls?.[0] || '';
        const picUrl    = extImgUrl || safe.giftPictureUrl || '';
        globalGiftCatalog.set(gName, {
          name:         gName,
          diamondCount: Math.max(0, Number(extInfo?.diamondCount ?? data.diamondCount) || 0),
          pictureUrl:   picUrl.slice(0, 512),
        });
        schedulePersistGiftCatalog(); // debounced save ลง Firestore
      } else if (gName && globalGiftCatalog.has(gName)) {
        // อัพเดท pictureUrl ถ้ายังไม่มี
        const existing = globalGiftCatalog.get(gName);
        if (!existing.pictureUrl && safe.giftPictureUrl) {
          existing.pictureUrl = safe.giftPictureUrl.slice(0, 512);
          schedulePersistGiftCatalog();
        }
      }

      // ── คิดเงิน / leaderboard / ลูกเล่น TT เฉพาะ event สุดท้ายเท่านั้น ──
      if (!isRepeatEnd) return;

      const coinsThisEvent = diamondCount * repeatCount;
      // Update gifts leaderboard
      const glb = giftsLeaderboard.get(userId) || new Map();
      const gprev = glb.get(safe.uniqueId) || { nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, totalCoins: 0 };
      glb.set(safe.uniqueId, { ...gprev, nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, totalCoins: gprev.totalCoins + coinsThisEvent });
      giftsLeaderboard.set(userId, glb);
      // Push leaderboard update ผ่าน socket ทันที (ไม่ต้องรอ REST poll)
      io.to(widgetRoom).emit('leaderboard_update', { type: 'gifts', data: getLeaderboard(userId, 'gifts') });
      schedulePersistLeaderboard(userId); // debounced Firestore write
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
      // ลูกเล่น TT — fire gift events (เฉพาะ final) + first_activity
      processEvent(userId, 'gift', giftPayload).catch(() => {});
      if (checkFirstActivity(userId, safe.uniqueId)) {
        processEvent(userId, 'first_activity', giftPayload).catch(() => {});
      }
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
        followRole:    Number(data.followRole) || 0,
        isSubscriber:  !!(data.isSubscriber  ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:   !!(data.isModerator   ?? data.userDetails?.isModerator),
        isTopGifter:   !!(data.isTopGifter),
        timestamp:      Date.now(),
      };
      emitAll('like', likePayload);
      // Update likes leaderboard
      const lb = likesLeaderboard.get(userId) || new Map();
      const prev = lb.get(safe.uniqueId) || { nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, likeCount: 0 };
      lb.set(safe.uniqueId, { ...prev, nickname: safe.nickname, profilePictureUrl: safe.profilePictureUrl, likeCount: prev.likeCount + likeCount });
      likesLeaderboard.set(userId, lb);
      // Push leaderboard update ผ่าน socket ทันที
      io.to(widgetRoom).emit('leaderboard_update', { type: 'likes', data: getLeaderboard(userId, 'likes') });
      schedulePersistLeaderboard(userId); // debounced Firestore write
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
        followRole:    Number(data.followRole) || 0,
        isSubscriber:  !!(data.isSubscriber  ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:   !!(data.isModerator   ?? data.userDetails?.isModerator),
        isTopGifter:   !!(data.isTopGifter),
        timestamp:         Date.now(),
      };
      emitAll('follow', followPayload);
      // ลูกเล่น TT — fire follow events + first_activity
      processEvent(userId, 'follow', followPayload).catch(() => {});
      if (checkFirstActivity(userId, safe.uniqueId)) {
        processEvent(userId, 'first_activity', followPayload).catch(() => {});
      }
    });

    connection.on('share', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const sharePayload = {
        type: 'share',
        uniqueId:  safe.uniqueId,
        nickname:  safe.nickname,
        followRole:    Number(data.followRole) || 0,
        isSubscriber:  !!(data.isSubscriber  ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:   !!(data.isModerator   ?? data.userDetails?.isModerator),
        isTopGifter:   !!(data.isTopGifter),
        timestamp: Date.now(),
      };
      emitAll('share', sharePayload);
      // ลูกเล่น TT — fire share events + first_activity
      processEvent(userId, 'share', sharePayload).catch(() => {});
      if (checkFirstActivity(userId, safe.uniqueId)) {
        processEvent(userId, 'first_activity', sharePayload).catch(() => {});
      }
    });

    // ── Member join (คนกดเข้าดู live) ──
    connection.on('member', (data) => {
      const safe = sanitizeTikTokEvent(data);
      if (!safe.uniqueId) return;
      const members = recentMembers.get(userId) || [];
      // ลบ entry เก่าของคนเดิม (ถ้ามี) แล้วใส่ใหม่ด้านบน
      const filtered = members.filter(m => m.uniqueId !== safe.uniqueId);
      filtered.unshift({
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname || safe.uniqueId,
        profilePictureUrl: safe.profilePictureUrl || '',
        joinedAt:          Date.now(),
      });
      recentMembers.set(userId, filtered.slice(0, MAX_MEMBERS_TRACK));
      emitAll('member', {
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        timestamp:         Date.now(),
      });
      // ลูกเล่น TT — fire join + first_activity events
      const joinEvPayload = {
        type: 'join', uniqueId: safe.uniqueId, nickname: safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        followRole:   Number(data.followRole) || 0,
        isSubscriber: !!(data.isSubscriber  ?? data.userBadges?.some?.(b => b.type === 'sub')),
        isModerator:  !!(data.isModerator   ?? data.userDetails?.isModerator),
        isTopGifter:  !!(data.isTopGifter),
        timestamp: Date.now(),
      };
      processEvent(userId, 'join', joinEvPayload).catch(() => {});
      if (checkFirstActivity(userId, safe.uniqueId)) {
        processEvent(userId, 'first_activity', joinEvPayload).catch(() => {});
      }
    });

    connection.on('roomUser', (data) => {
      const topViewers = Array.isArray(data.topViewers)
        ? data.topViewers.slice(0, 10).map(tv => ({
            coinCount:         Number(tv.coinCount) || 0,
            uniqueId:          String(tv.user?.uniqueId   || '').slice(0, 64),
            nickname:          String(tv.user?.nickname   || '').slice(0, 100),
            profilePictureUrl: String(tv.user?.profilePictureUrl || '').slice(0, 512),
          }))
        : [];
      emitAll('roomUser', {
        viewerCount: Math.max(0, Number(data.viewerCount) || 0),
        topViewers,
        timestamp:   Date.now(),
      });
    });

    connection.on('disconnected', async () => {
      const conn      = activeConnections.get(userId);
      const wasManual = conn?.manualDisconnect ?? false;

      activeConnections.delete(userId);
      await logSession({ userId, tiktokUsername, action: 'disconnect' });

      // ล้าง in-memory state เมื่อ manual disconnect — ป้องกัน memory leak
      if (wasManual) {
        clearVjCooldowns(userId);
        likesLeaderboard.delete(userId);
        giftsLeaderboard.delete(userId);
        recentMembers.delete(userId);
        firstActivityUsers.delete(userId);
      }

      if (wasManual) {
        // Manual stop — แจ้ง disconnected ทันที ไม่ reconnect (state ถูก clear ข้างบนแล้ว)
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

function getRecentMembers(vjId) {
  return recentMembers.get(vjId) || [];
}

async function getGiftCatalog() {
  await ensureGiftCatalogLoaded();
  return Array.from(globalGiftCatalog.values()).sort((a, b) => a.diamondCount - b.diamondCount);
}

// Reverse lookup: หา userId จาก tiktokUsername (case-insensitive)
// คืน { userId, tiktokUsername, connectedAt } หรือ null
function getConnectionByUsername(tiktokUsername) {
  const lower = (tiktokUsername || '').toLowerCase();
  for (const [userId, conn] of activeConnections.entries()) {
    if ((conn.tiktokUsername || '').toLowerCase() === lower) {
      return { userId, tiktokUsername: conn.tiktokUsername, connectedAt: conn.connectedAt };
    }
  }
  return null;
}

// ข้อมูล connection ของ user คนนี้ (สำหรับ status restore หลัง refresh + takeover)
// socketId = socketId ของ tab ที่กำลัง connect อยู่ (สำหรับ emit kicked ไปถูก tab)
function getConnectionInfo(userId) {
  const conn = activeConnections.get(userId);
  if (!conn) return null;
  return { tiktokUsername: conn.tiktokUsername, connectedAt: conn.connectedAt, socketId: conn.socketId };
}

module.exports = {
  startConnection, stopConnection, hasConnection, getActiveConnectionCount,
  getLeaderboard, loadLeaderboardFromFirestore, getRecentMembers, getGiftCatalog,
  getConnectionByUsername, getConnectionInfo,
};
