// auth.js — ตรวจสอบ Firebase ID Token
const admin = require('firebase-admin');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' }); // ไม่บอกรายละเอียด
  }

  const idToken = authHeader.split('Bearer ')[1];

  // ป้องกัน token ที่ยาวผิดปกติ (ป้องกัน DoS จาก large token)
  if (idToken.length > 4096) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken, true); // checkRevoked = true

    req.user = {
      uid:   decodedToken.uid,
      email: decodedToken.email,
      name:  decodedToken.name,
    };
    next();
  } catch (err) {
    // Log เฉพาะ error type ไม่ log token
    console.warn('[Auth] Token verification failed:', err.code || 'unknown');
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { verifyToken };
