// routes/filehost.js — อัปโหลดไฟล์ไปยัง file hosting services (catbox / litterbox / uguu)
const express  = require('express');
const multer   = require('multer');
const os       = require('os');
const router   = express.Router();
const { verifyToken }   = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { uploadFile }    = require('../handlers/filehost');

// เก็บไฟล์ชั่วคราวใน OS temp dir — ลบหลัง upload เสร็จ
const upload = multer({
  dest:   os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB (max ของ catbox / litterbox / uguu)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('รองรับเฉพาะไฟล์วิดีโอ รูปภาพ หรือเสียง'));
  },
});

// verifyToken ก่อน uploadLimiter เสมอ — เพื่อให้ keyGenerator เข้าถึง req.user.uid ได้
router.post('/upload', verifyToken, uploadLimiter, upload.single('file'), uploadFile);

// ── Audio proxy ───────────────────────────────────────────────────────────────
// widget ใช้ proxy นี้เพื่อหลีกเลี่ยง CORS + Cross-Origin-Resource-Policy ของ file hosts
// ไม่ต้อง auth เพราะ widget page ไม่มี Firebase context + URL เป็น public file อยู่แล้ว
// ป้องกัน abuse ด้วย allowlist hostname เท่านั้น
const PROXY_ALLOWED = [
  'files.catbox.moe',
  'litter.catbox.moe',
  'h.uguu.se',
  'uguu.se',
  'a.uguu.se',
];

router.get('/audio-proxy', async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) return res.status(400).json({ error: 'missing url' });

  let parsed;
  try { parsed = new URL(rawUrl); } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  const allowed = PROXY_ALLOWED.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!allowed) return res.status(403).json({ error: 'host not allowed' });

  // เฉพาะ audio เท่านั้น
  const ext = parsed.pathname.split('.').pop().toLowerCase();
  if (!['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'].includes(ext)) {
    return res.status(400).json({ error: 'audio files only' });
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TTsam/1.0)' },
    });
    if (!upstream.ok) return res.status(upstream.status).end();

    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';

    res.set({
      'Content-Type':                contentType,
      'Content-Length':              buf.byteLength,
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control':               'public, max-age=86400', // cache 1 วัน
    });
    res.end(buf);
  } catch (err) {
    console.error('[audio-proxy] error:', err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

module.exports = router;
