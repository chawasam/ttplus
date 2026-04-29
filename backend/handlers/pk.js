// handlers/pk.js — PK Panel: Video Config + Upload
// GET  /api/pk/config          — โหลด config ของ user (hotkeys + video lists)
// POST /api/pk/config          — บันทึก config
// POST /api/pk/upload          — อัพโหลดไฟล์วิดีโอ (multer)
// DELETE /api/pk/video/:name   — ลบไฟล์

const admin  = require('firebase-admin');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pk');
const MAX_SIZE   = 200 * 1024 * 1024; // 200 MB per file
const ALLOWED    = ['.webm', '.mp4'];

const CATEGORIES = ['taptap', 'nwm', 'x2', 'x3', 'mvp'];

// ── Default config structure ────────────────────────────────────────────────
function defaultConfig() {
  return {
    hotkeys:    { taptap: 'Q', nwm: 'W', x2: 'E', x3: 'R', mvp: 'T' },
    categories: {
      taptap: [],
      nwm:    [],
      x2:     [],
      x3:     [],
      mvp:    [],
    },
  };
}

// ── Ensure upload dir exists ─────────────────────────────────────────────────
function ensureUserDir(uid) {
  const dir = path.join(UPLOAD_DIR, uid);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── GET config ───────────────────────────────────────────────────────────────
async function getConfig(req, res) {
  try {
    const db  = admin.firestore();
    const doc = await db.collection('pk_config').doc(req.user.uid).get();
    const cfg = doc.exists ? doc.data() : defaultConfig();
    return res.json({ config: cfg });
  } catch (err) {
    console.error('[PK] getConfig:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── POST config ──────────────────────────────────────────────────────────────
async function saveConfig(req, res) {
  const { hotkeys, categories } = req.body || {};
  // Validate
  if (!hotkeys || typeof hotkeys !== 'object') return res.status(400).json({ error: 'hotkeys required' });
  if (!categories || typeof categories !== 'object') return res.status(400).json({ error: 'categories required' });

  // Sanitize hotkeys
  const cleanHotkeys = {};
  for (const cat of CATEGORIES) {
    const k = hotkeys[cat];
    cleanHotkeys[cat] = typeof k === 'string' ? k.slice(0, 20) : '';
  }

  // Sanitize categories (each entry: { id, name, url, type, checked })
  const cleanCats = {};
  for (const cat of CATEGORIES) {
    const list = Array.isArray(categories[cat]) ? categories[cat] : [];
    cleanCats[cat] = list.slice(0, 50).map(v => ({
      id:      String(v.id      || '').slice(0, 64),
      name:    String(v.name    || '').slice(0, 100),
      url:     String(v.url     || '').slice(0, 500),
      type:    ['webm', 'mp4'].includes(v.type) ? v.type : 'mp4',
      checked: !!v.checked,
    }));
  }

  try {
    await admin.firestore().collection('pk_config').doc(req.user.uid).set({
      hotkeys:    cleanHotkeys,
      categories: cleanCats,
      updatedAt:  Date.now(),
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[PK] saveConfig:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── POST upload (multer file already on req.file) ────────────────────────────
async function uploadVideo(req, res) {
  if (!req.file) return res.status(400).json({ error: 'ไม่มีไฟล์' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    // ลบไฟล์ที่อัพโหลดมาแล้วถ้า ext ไม่ถูก
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: 'รองรับเฉพาะ .webm และ .mp4 เท่านั้น' });
  }

  const type     = ext === '.webm' ? 'webm' : 'mp4';
  const filename = req.file.filename; // multer กำหนดชื่อแล้ว (uid-timestamp-random.ext)
  const url      = `/uploads/pk/${req.user.uid}/${filename}`;

  return res.json({
    success:  true,
    filename,
    url,
    type,
    name: req.file.originalname.slice(0, 100),
  });
}

// ── DELETE video ─────────────────────────────────────────────────────────────
async function deleteVideo(req, res) {
  const { filename } = req.params;
  // Sanitize: ห้ามมี path traversal
  if (!filename || /[/\\]/.test(filename) || filename.startsWith('.')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED.includes(ext)) return res.status(400).json({ error: 'Invalid file type' });

  const filePath = path.join(UPLOAD_DIR, req.user.uid, filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PK] deleteVideo:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getConfig, saveConfig, uploadVideo, deleteVideo, ensureUserDir, UPLOAD_DIR, MAX_SIZE };
