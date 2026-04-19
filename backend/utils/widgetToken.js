// widgetToken.js — Short-lived widget token สำหรับ OBS widgets
const crypto = require('crypto');

// Forward map: token -> { userId, expiresAt }
const widgetTokens = new Map();
// Reverse index: userId -> token  (ทำให้ generateWidgetToken O(1) แทน O(n))
const userTokens   = new Map();

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 นาที
const MAX_TOKENS   = 5000;            // flood guard — ป้องกัน map โตไม่จำกัด

/**
 * สร้าง token ใหม่ — 1 user = 1 token เท่านั้น
 * ใช้ reverse index เพื่อ O(1) lookup แทนการ scan map ทั้งหมด
 */
function generateWidgetToken(userId) {
  // ลบ token เดิมของ user (O(1) ด้วย reverse index)
  const existing = userTokens.get(userId);
  if (existing) {
    widgetTokens.delete(existing);
    userTokens.delete(userId);
  }

  // Flood guard: ถ้า map เต็ม ล้าง expired ก่อน
  if (widgetTokens.size >= MAX_TOKENS) {
    const now = Date.now();
    for (const [t, v] of widgetTokens.entries()) {
      if (now > v.expiresAt) {
        widgetTokens.delete(t);
        userTokens.delete(v.userId);
      }
    }
    // ถ้ายังเกินอยู่ (expired ไม่พอ) ให้ปฏิเสธ — ป้องกัน memory flood
    if (widgetTokens.size >= MAX_TOKENS) {
      throw new Error('Server token capacity exceeded. Please try again later.');
    }
  }

  const token    = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  widgetTokens.set(token, { userId, expiresAt });
  userTokens.set(userId, token);
  return token;
}

/**
 * Verify — คืน userId หรือ null
 * @param {boolean} consume - true = ลบ token หลัง verify (single-use)
 */
function verifyWidgetToken(token, consume = false) {
  if (!token || typeof token !== 'string' || token.length !== 64) return null;
  const entry = widgetTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    widgetTokens.delete(token);
    userTokens.delete(entry.userId);
    return null;
  }
  if (consume) {
    widgetTokens.delete(token);
    userTokens.delete(entry.userId);
  }
  return entry.userId;
}

// ล้าง expired entries ทุก 1 นาที (cleanup ทั้ง 2 map พร้อมกัน)
setInterval(() => {
  const now = Date.now();
  for (const [t, v] of widgetTokens.entries()) {
    if (now > v.expiresAt) {
      widgetTokens.delete(t);
      userTokens.delete(v.userId);
    }
  }
}, 60 * 1000);

module.exports = { generateWidgetToken, verifyWidgetToken };
