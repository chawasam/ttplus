// csrf.js — CSRF Protection
// ป้องกัน Cross-Site Request Forgery บน POST endpoints
//
// วิธีทำงาน:
// 1. Frontend เรียก GET /api/csrf-token ได้ token
// 2. ทุก POST request ต้องแนบ header: X-CSRF-Token: <token>
// 3. Middleware ตรวจสอบ header ก่อนผ่าน route

const crypto = require('crypto');

// Map: token -> createdAt (ms) — เก็บเวลา เพื่อ cleanup ตามอายุได้ถูกต้อง
const validTokens = new Map();
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 ชั่วโมง
const MAX_TOKENS = 10000; // ป้องกัน memory flood

/**
 * สร้าง CSRF token ใหม่
 */
function generateCsrfToken() {
  // ถ้า tokens มากเกินไป ลบที่หมดอายุก่อน จากนั้นลบเก่าสุดถ้ายังเกิน
  if (validTokens.size >= MAX_TOKENS) {
    const now = Date.now();
    // รอบแรก: ลบที่หมดอายุแล้ว
    for (const [t, createdAt] of validTokens.entries()) {
      if (now - createdAt >= TOKEN_TTL_MS) validTokens.delete(t);
    }
    // รอบสอง: ถ้ายังเกิน MAX ให้ลบเก่าสุด 1000 รายการ (เรียงตาม insertion order ของ Map)
    if (validTokens.size >= MAX_TOKENS) {
      let removed = 0;
      for (const t of validTokens.keys()) {
        validTokens.delete(t);
        if (++removed >= 1000) break;
      }
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  validTokens.set(token, Date.now());

  // ลบ token นี้หลัง TTL (backup cleanup)
  setTimeout(() => validTokens.delete(token), TOKEN_TTL_MS);

  return token;
}

/**
 * Middleware: ตรวจสอบ CSRF token บน POST/PUT/DELETE
 * ยกเว้น: /health, /api/csrf-token, Socket.io
 */
function csrfProtection(req, res, next) {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const token = req.headers['x-csrf-token'];

  if (!token || typeof token !== 'string' || token.length !== 64) {
    return res.status(403).json({ error: 'Invalid CSRF token. Please refresh the page.' });
  }

  const createdAt = validTokens.get(token);
  if (createdAt === undefined) {
    return res.status(403).json({ error: 'Invalid CSRF token. Please refresh the page.' });
  }

  // ตรวจ TTL อีกครั้งแบบ explicit (ป้องกัน setTimeout drift)
  if (Date.now() - createdAt >= TOKEN_TTL_MS) {
    validTokens.delete(token);
    return res.status(403).json({ error: 'CSRF token expired. Please refresh the page.' });
  }

  // CSRF token ใช้ได้ครั้งเดียว (single-use, double-submit prevention)
  validTokens.delete(token);

  next();
}

module.exports = { generateCsrfToken, csrfProtection };
