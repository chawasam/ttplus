// widgetToken.js — Permanent widget tokens (ผูกกับ userId ตลอดไป)
// - Token เก็บใน Firestore: widget_tokens/{token} → { uid }
// - In-memory cache ลด Firestore reads หลัง server restart
// - ไม่มี expiry — URL ไม่เปลี่ยนแม้ปิดเปิด browser

const crypto = require('crypto');

// In-memory cache: token → uid
// โหลดจาก Firestore ครั้งแรกที่ใช้ แล้วเก็บ cache ไว้ตลอด server uptime
const tokenCache = new Map();

/**
 * สร้าง token ใหม่ (64-char hex)
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * เพิ่ม token เข้า memory cache (เรียกหลังอ่านจาก Firestore หรือหลัง generate ใหม่)
 */
function registerToken(token, uid) {
  tokenCache.set(token, uid);
}

/**
 * ตรวจ token จาก memory cache เท่านั้น (sync, fast path)
 * คืน uid หรือ null
 */
function verifyTokenFromMemory(token) {
  if (!token || typeof token !== 'string' || token.length !== 64) return null;
  return tokenCache.get(token) || null;
}

module.exports = { generateToken, registerToken, verifyTokenFromMemory };
