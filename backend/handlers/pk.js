// handlers/pk.js — PK Panel: Video Config + Upload + Server Presets
// GET  /api/pk/config          — โหลด config ของ user (hotkeys + video lists + presetChecked)
// POST /api/pk/config          — บันทึก config
// GET  /api/pk/presets         — ดึงรายการวิดีโอ preset จาก _shared/{cat}/
// POST /api/pk/upload          — อัพโหลดไฟล์วิดีโอ (multer)
// DELETE /api/pk/video/:name   — ลบไฟล์

const admin  = require('firebase-admin');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pk');
const SHARED_DIR = path.join(UPLOAD_DIR, '_shared');
const MAX_SIZE   = 200 * 1024 * 1024; // 200 MB per file
const ALLOWED    = ['.webm', '.mp4'];

const CATEGORIES = ['taptap', 'nwm', 'x2', 'x3', 'mvp'];
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';

// ── Default config structure ────────────────────────────────────────────────
function defaultConfig() {
  return {
    hotkeys:      { taptap: 'Q', nwm: 'W', x2: 'E', x3: 'R', mvp: 'T' },
    categories:   { taptap: [], nwm: [], x2: [], x3: [], mvp: [] },
    presetChecked: {},   // { catId: { filename: boolean } }
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
    // ensure presetChecked field exists (backward compat)
    if (!cfg.presetChecked) cfg.presetChecked = {};
    return res.json({ config: cfg });
  } catch (err) {
    console.error('[PK] getConfig:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── POST config ──────────────────────────────────────────────────────────────
async function saveConfig(req, res) {
  const { hotkeys, categories, presetChecked, enabled } = req.body || {};
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

  // Sanitize presetChecked — { catId: { safeFilename: boolean } }
  const cleanPresetChecked = {};
  if (presetChecked && typeof presetChecked === 'object') {
    for (const cat of CATEGORIES) {
      const catMap = presetChecked[cat];
      if (!catMap || typeof catMap !== 'object') continue;
      cleanPresetChecked[cat] = {};
      for (const [filename, val] of Object.entries(catMap)) {
        // ห้าม path traversal, ต้อง ext ที่ allowed, ความยาวสมเหตุสมผล
        if (
          typeof filename !== 'string' ||
          filename.length > 120 ||
          /[/\\]/.test(filename) ||
          filename.startsWith('.')
        ) continue;
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED.includes(ext)) continue;
        cleanPresetChecked[cat][filename] = !!val;
      }
    }
  }

  try {
    const doc = {
      hotkeys:       cleanHotkeys,
      categories:    cleanCats,
      presetChecked: cleanPresetChecked,
      updatedAt:     Date.now(),
    };
    if (typeof enabled === 'boolean') doc.enabled = enabled;
    await admin.firestore().collection('pk_config').doc(req.user.uid).set(doc);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PK] saveConfig:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── GET presets — อ่านไฟล์จาก _shared/{catId}/ ──────────────────────────────
async function getPresets(_req, res) {
  const result = {};
  for (const cat of CATEGORIES) {
    const dir = path.join(SHARED_DIR, cat);
    if (!fs.existsSync(dir)) { result[cat] = []; continue; }
    const files = fs.readdirSync(dir)
      .filter(f => ALLOWED.includes(path.extname(f).toLowerCase()))
      .sort(); // alphabetical
    result[cat] = files.map(f => ({
      filename: f,
      name:     f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      url:      `/uploads/pk/_shared/${cat}/${f}`,
      type:     path.extname(f).slice(1).toLowerCase(), // 'webm' or 'mp4'
    }));
  }
  return res.json({ presets: result });
}

// ── POST upload (multer file already on req.file) ────────────────────────────
async function uploadVideo(req, res) {
  if (!req.file) return res.status(400).json({ error: 'ไม่มีไฟล์' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: 'รองรับเฉพาะ .webm และ .mp4 เท่านั้น' });
  }

  const type     = ext === '.webm' ? 'webm' : 'mp4';
  const filename = req.file.filename;
  const url      = `/uploads/pk/${req.user.uid}/${filename}`;

  return res.json({
    success:  true,
    filename,
    url,
    type,
    name: req.file.originalname.slice(0, 100),
  });
}

// ── POST upload-shared — อัพโหลดไปยัง _shared/{cat}/ (owner only) ────────────
async function uploadSharedVideo(req, res) {
  // Owner-only guard
  if (!req.user?.email || req.user.email !== OWNER_EMAIL) {
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    return res.status(403).json({ error: 'เฉพาะ owner เท่านั้น' });
  }
  if (!req.file) return res.status(400).json({ error: 'ไม่มีไฟล์' });

  const cat = req.params.catId;
  if (!CATEGORIES.includes(cat)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: 'category ไม่ถูกต้อง' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: 'รองรับเฉพาะ .webm และ .mp4 เท่านั้น' });
  }

  const filename = req.file.filename;
  const url      = `/uploads/pk/_shared/${cat}/${filename}`;
  const type     = ext === '.webm' ? 'webm' : 'mp4';
  const name     = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

  return res.json({ success: true, filename, url, type, name });
}

// ── DELETE shared video — owner only ─────────────────────────────────────────
async function deleteSharedVideo(req, res) {
  if (!req.user?.email || req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'เฉพาะ owner เท่านั้น' });
  }
  const { catId, filename } = req.params;
  if (!CATEGORIES.includes(catId)) return res.status(400).json({ error: 'category ไม่ถูกต้อง' });
  if (!filename || /[/\\]/.test(filename) || filename.startsWith('.')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED.includes(ext)) return res.status(400).json({ error: 'Invalid file type' });

  const filePath = path.join(SHARED_DIR, catId, filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PK] deleteSharedVideo:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── DELETE video ─────────────────────────────────────────────────────────────
async function deleteVideo(req, res) {
  const { filename } = req.params;
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

module.exports = { getConfig, saveConfig, getPresets, uploadVideo, uploadSharedVideo, deleteVideo, deleteSharedVideo, ensureUserDir, UPLOAD_DIR, SHARED_DIR, MAX_SIZE, CATEGORIES };
