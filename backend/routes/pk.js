// routes/pk.js — PK Panel routes
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');

const { verifyToken }           = require('../middleware/auth');
const { generalLimiter }        = require('../middleware/rateLimiter');
const { getConfig, saveConfig, getPresets, uploadVideo, uploadSharedVideo, deleteVideo, deleteSharedVideo, ensureUserDir, MAX_SIZE, CATEGORIES, SHARED_DIR } = require('../handlers/pk');
const fs = require('fs');

// ─── Auth required for all PK routes ────────────────────────────────────────
router.use(verifyToken);

// ─── Multer storage — per-user folder ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = ensureUserDir(req.user.uid);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.webm', '.mp4'].includes(ext)) return cb(null, true);
    cb(new Error('รองรับเฉพาะ .webm และ .mp4'), false);
  },
});

// ─── Multer storage — _shared/{catId}/ (owner upload) ───────────────────────
const storageShared = multer.diskStorage({
  destination: (req, _file, cb) => {
    const cat = req.params.catId;
    if (!CATEGORIES.includes(cat)) return cb(new Error('invalid category'));
    const dir = require('path').join(SHARED_DIR, cat);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    // ใช้ชื่อไฟล์เดิม (sanitized) เพื่อให้ชื่อใน UI อ่านได้
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9ก-ฮ\s._-]/g, '').trim().slice(0, 60) || 'video';
    cb(null, `${base}${ext}`);
  },
});

const uploadShared = multer({
  storage: storageShared,
  limits:  { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.webm', '.mp4'].includes(ext)) return cb(null, true);
    cb(new Error('รองรับเฉพาะ .webm และ .mp4'), false);
  },
});

// ─── Routes ─────────────────────────────────────────────────────────────────
router.get('/config',                        generalLimiter, getConfig);
router.post('/config',                       generalLimiter, saveConfig);
router.get('/presets',                       generalLimiter, getPresets);
router.post('/upload',                       upload.single('video'), uploadVideo);
router.post('/upload-shared/:catId',         uploadShared.single('video'), uploadSharedVideo);
router.delete('/shared/:catId/:filename',    generalLimiter, deleteSharedVideo);
router.delete('/video/:filename',            generalLimiter, deleteVideo);

module.exports = router;
