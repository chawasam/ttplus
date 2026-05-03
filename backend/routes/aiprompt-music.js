// routes/aiprompt-music.js — Proxy สำหรับ Replicate API (musicgen)
//
// เหตุผล: Replicate API ไม่ส่ง CORS headers → browser เรียก api.replicate.com ตรงไม่ได้
// → /aiprompt page ใช้ proxy นี้แทน · ttsam server แค่ relay ไม่ได้เก็บ token
//
// Endpoints:
//   POST /api/aiprompt-music/predictions     — สร้าง prediction (forward body + Authorization)
//   GET  /api/aiprompt-music/predictions/:id — poll status (forward Authorization)
//   GET  /api/aiprompt-music/audio?url=...   — proxy ดึงไฟล์ mp3 จาก replicate.delivery
//                                              (เผื่อ CDN ไม่ส่ง CORS — ส่วนใหญ่ส่ง แต่กัน edge case)
//
// Auth flow:
//   - Frontend ส่ง Authorization: Token r8_... (Replicate token ของ user เอง)
//   - Backend forward header เดียวกันไป Replicate
//   - ttsam ไม่เก็บ token ที่ไหน · ไม่ log ด้วย
//
// Validation:
//   - prediction id ต้อง alphanumeric เท่านั้น (กัน path injection)
//   - audio URL ต้อง startsWith 'https://replicate.delivery/' (กัน SSRF)

const express = require('express');
const router = express.Router();

// === helper: forward Replicate response transparently ====================
async function forwardReplicate(method, url, headers, bodyJson, res) {
  try {
    const init = { method, headers };
    if (bodyJson !== undefined) init.body = JSON.stringify(bodyJson);
    const r = await fetch(url, init);
    const text = await r.text();
    // Replicate ตอบเป็น JSON เสมอ → forward ทั้ง status + body
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'proxy failed', detail: String(e?.message || e).slice(0, 200) });
  }
}

// ── POST /api/aiprompt-music/predictions ───────────────────────────────
// Body: { version, input: { prompt, duration, ... } }
router.post('/predictions', express.json({ limit: '64kb' }), async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Token ')) {
    return res.status(401).json({ error: 'missing or invalid Replicate token (expect "Token r8_...")' });
  }
  // basic body sanity
  const body = req.body || {};
  if (!body.version || typeof body.version !== 'string') {
    return res.status(400).json({ error: 'missing version' });
  }
  if (!body.input || typeof body.input !== 'object') {
    return res.status(400).json({ error: 'missing input' });
  }
  await forwardReplicate(
    'POST',
    'https://api.replicate.com/v1/predictions',
    { 'Authorization': auth, 'Content-Type': 'application/json' },
    body,
    res
  );
});

// ── GET /api/aiprompt-music/predictions/:id ────────────────────────────
router.get('/predictions/:id', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Token ')) {
    return res.status(401).json({ error: 'missing or invalid Replicate token' });
  }
  const id = String(req.params.id || '');
  if (!/^[a-z0-9]+$/i.test(id) || id.length > 64) {
    return res.status(400).json({ error: 'invalid prediction id' });
  }
  await forwardReplicate(
    'GET',
    `https://api.replicate.com/v1/predictions/${id}`,
    { 'Authorization': auth },
    undefined,
    res
  );
});

// ── GET /api/aiprompt-music/audio?url=... ──────────────────────────────
// Proxy เผื่อ replicate.delivery ไม่ส่ง CORS header (ส่วนใหญ่ส่ง — กันเหนียว)
// validate URL strict: ต้องเป็น https://replicate.delivery/* เท่านั้น
router.get('/audio', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url.startsWith('https://replicate.delivery/')) {
    return res.status(400).json({ error: 'invalid audio URL — must be replicate.delivery' });
  }
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: `upstream fetch failed (${r.status})` });
    }
    res.status(200);
    const ct = r.headers.get('content-type') || 'audio/mpeg';
    res.type(ct);
    const cl = r.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);
    // pipe via arrayBuffer (simpler ใน Node 18+)
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'audio proxy failed', detail: String(e?.message || e).slice(0, 200) });
  }
});

module.exports = router;
