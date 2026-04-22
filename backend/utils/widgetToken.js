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
 * สร้าง token ใหม่
 * Format ใหม่: base64url 16 bytes = 22 chars (สั้นกว่าเดิม ~3x)
 * Format เก่า: hex 64 chars — ยังรองรับสำหรับ user ที่มี token เก่า
 */
function generateToken() {
  return crypto.randomBytes(16).toString('base64url');
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
 * รองรับทั้ง format เก่า (64 hex) และ format ใหม่ (22 base64url)
 */
function verifyTokenFromMemory(token) {
  if (!token || typeof token !== 'string') return null;
  if (token.length < 20 || token.length > 66) return null;
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
