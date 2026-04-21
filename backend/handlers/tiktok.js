// tiktok.js — จัดการ TikTok Live connection
const { WebcastPushConnection } = require('tiktok-live-connector');
const { logSession, logError } = require('../utils/logger');
const { sanitizeTikTokEvent } = require('../utils/validate');

const activeConnections = new Map();

// จำกัด connections สูงสุดต่อ server (ป้องกัน resource exhaustion)
const MAX_CONNECTIONS = 100;

// Timeout สำหรับ connect (ms)
const CONNECT_TIMEOUT_MS = 15000;

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
    processInitialData: true,
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

    activeConnections.set(userId, { connection, tiktokUsername, connectedAt: Date.now() });

    await logSession({ userId, tiktokUsername, action: 'connect', roomId: state.roomId });

    io.to(socketId).emit('connection_status', {
      status: 'connected',
      tiktokUsername,
      roomId: state.roomId,
    });

    // ===== Event Listeners (ทุก event sanitize ก่อนส่ง) =====
    // emit ไปทั้ง dashboard socket (socketId) และ widget room (widget_${userId})
    const widgetRoom = `widget_${userId}`;

    connection.on('chat', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const payload = {
        type: 'chat',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        comment:           safe.comment,
        timestamp:         Date.now(),
      };
      io.to(socketId).emit('chat', payload);
      io.to(widgetRoom).emit('chat', payload);
    });

    connection.on('gift', (data) => {
      // Skip streaming gifts ที่ยังไม่จบ
      if (data.giftType === 1 && !data.repeatEnd) return;

      const safe = sanitizeTikTokEvent(data);
      const repeatCount  = Math.min(Number(data.repeatCount)  || 1, 9999);
      const diamondCount = Math.max(0, Number(data.diamondCount) || 0);

      const payload = {
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
      io.to(socketId).emit('gift', payload);
      io.to(widgetRoom).emit('gift', payload);
    });

    connection.on('like', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const payload = {
        type: 'like',
        uniqueId:       safe.uniqueId,
        nickname:       safe.nickname,
        likeCount:      Math.max(0, Number(data.likeCount) || 0),
        totalLikeCount: Math.max(0, Number(data.totalLikeCount) || 0),
        timestamp:      Date.now(),
      };
      io.to(socketId).emit('like', payload);
      io.to(widgetRoom).emit('like', payload);
    });

    connection.on('follow', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const payload = {
        type: 'follow',
        uniqueId:          safe.uniqueId,
        nickname:          safe.nickname,
        profilePictureUrl: safe.profilePictureUrl,
        timestamp:         Date.now(),
      };
      io.to(socketId).emit('follow', payload);
      io.to(widgetRoom).emit('follow', payload);
    });

    connection.on('share', (data) => {
      const safe = sanitizeTikTokEvent(data);
      const payload = {
        type: 'share',
        uniqueId:  safe.uniqueId,
        nickname:  safe.nickname,
        timestamp: Date.now(),
      };
      io.to(socketId).emit('share', payload);
      io.to(widgetRoom).emit('share', payload);
    });

    connection.on('roomUser', (data) => {
      const payload = {
        viewerCount: Math.max(0, Number(data.viewerCount) || 0),
        timestamp:   Date.now(),
      };
      io.to(socketId).emit('roomUser', payload);
      io.to(widgetRoom).emit('roomUser', payload);
    });

    connection.on('disconnected', async () => {
      activeConnections.delete(userId);
      await logSession({ userId, tiktokUsername, action: 'disconnect' });
      io.to(socketId).emit('connection_status', { status: 'disconnected', tiktokUsername });
    });

    connection.on('error', async (err) => {
      // Log จริง server-side, ส่งข้อความกว้างๆ ไป client
      console.error(`[TikTok] Error for @${tiktokUsername}:`, err.message);
      await logError(userId, tiktokUsername, err.message);
      io.to(socketId).emit('connection_error', { message: 'Connection error. Please reconnect.' });
    });

  } catch (err) {
    console.error(`[TikTok] Failed to connect @${tiktokUsername}:`, err.message);
    await logError(userId, tiktokUsername, err.message);

    // ส่งข้อความที่ user-friendly และไม่รั่ว internal details
    let userMessage = 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่';
    if (err.message?.toLowerCase().includes('offline')) {
      userMessage = `@${tiktokUsername} ไม่ได้ไลฟ์อยู่ในขณะนี้`;
    } else if (err.message?.includes('timed out')) {
      userMessage = 'Connection timed out. Please try again.';
    } else if (err.message?.includes('not found') || err.message?.includes('404')) {
      userMessage = `ไม่พบ username @${tiktokUsername}`;
    }

    io.to(socketId).emit('connection_status', { status: 'error', message: userMessage });
    throw err;
  }
}

async function stopConnection(userId) {
  const conn = activeConnections.get(userId);
  if (!conn) return;
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

module.exports = { startConnection, stopConnection, hasConnection, getActiveConnectionCount };
