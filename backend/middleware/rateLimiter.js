// rateLimiter.js — Rate limiting ป้องกัน abuse และ DoS
const rateLimit = require('express-rate-limit');

// ===== HTTP Rate Limiters =====

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 300,                  // เพิ่มจาก 100 → 300 รองรับ game actions (~1/3s)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.path === '/health',
});

// Tight limiter สำหรับ unauthenticated endpoints (login, csrf-token, widget-styles)
// ป้องกัน flood ก่อน auth โดยไม่กระทบ game routes ที่มี verifyToken แล้ว
const unauthLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 นาที
  max: 20,              // 20 req / min per IP — เพียงพอสำหรับ login/widget load
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});

const connectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connect attempts. Please wait 15 minutes.' },
});

const settingsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,   // 120 ครั้ง / 5 นาที — รองรับ customize + ทดสอบ skin หลายแบบ
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many settings updates. Please try again later.' },
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token requests. Try again in 1 hour.' },
});

// ===== Socket.io Rate Limiter — Per USER (ไม่ใช่ per socket) =====
// ป้องกันการสร้าง socket ใหม่เพื่อ bypass limit
const userEventCounts = new Map(); // userId -> { count, resetAt }
const socketEventCounts = new Map(); // socketId -> { count, resetAt } สำหรับ unauthenticated

/**
 * Rate limit per userId (สำหรับ authenticated socket)
 */
function socketRateLimitByUser(userId, maxEvents = 60, windowMs = 10000) {
  const now = Date.now();
  const entry = userEventCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    userEventCounts.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxEvents) return false;
  entry.count++;
  return true;
}

/**
 * Rate limit per socketId (สำหรับ unauthenticated — เช่น authenticate event)
 */
function socketRateLimit(socketId, maxEvents = 5, windowMs = 10000) {
  const now = Date.now();
  const entry = socketEventCounts.get(socketId);

  if (!entry || now > entry.resetAt) {
    socketEventCounts.set(socketId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxEvents) return false;
  entry.count++;
  return true;
}

function clearSocketLimit(socketId) {
  socketEventCounts.delete(socketId);
}

function clearUserLimit(userId) {
  userEventCounts.delete(userId);
}

// ล้าง expired entries ทุก 1 นาที
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of userEventCounts.entries())  { if (now > v.resetAt) userEventCounts.delete(k); }
  for (const [k, v] of socketEventCounts.entries()) { if (now > v.resetAt) socketEventCounts.delete(k); }
}, 60 * 1000);

module.exports = {
  generalLimiter, unauthLimiter, connectLimiter, settingsLimiter, tokenLimiter,
  socketRateLimit, socketRateLimitByUser,
  clearSocketLimit, clearUserLimit,
};
