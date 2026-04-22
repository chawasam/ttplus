// widgetToken.js — Permanent widget tokens (ผูกกับ userId ตลอดไป)
// - Token เก็บใน Firestore: widget_tokens/{token} → { uid }
// - In-memory cache ลด Firestore reads หลัง server restart
// - ไม่มี expiry — URL ไม่เปลี่ยนแม้ปิดเปิด browser
// - ถ้า Firestore ไม่พร้อม → fallback เป็น session-only token (ยังใช้งานได้)

const crypto = require('crypto');

// Bidirectional in-memory cache
const tokenCache = new Map(); // token → uid
const uidCache   = new Map(); // uid   → token

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
  uidCache.set(uid, token);
}

/**
 * ตรวจ token จาก memory cache เท่านั้น (sync, fast path)
 * คืน uid หรือ null
 */
function verifyTokenFromMemory(token) {
  if (!token || typeof token !== 'string' || token.length !== 64) return null;
  return tokenCache.get(token) || null;
}

/**
 * ค้นหา token ที่ uid เคย register ไว้ (reverse lookup)
 * คืน token หรือ null
 */
function getTokenForUid(uid) {
  return uidCache.get(uid) || null;
}

module.exports = { generateToken, registerToken, verifyTokenFromMemory, getTokenForUid };
