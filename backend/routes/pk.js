// routes/pk.js — PK Panel routes
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');

const { verifyToken }           = require('../middleware/auth');
const { generalLimiter }        = require('../middleware/rateLimiter');
const { getConfig, saveConfig, uploadVideo, deleteVideo, ensureUserDir, MAX_SIZE } = require('../handlers/pk');

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

// ─── Routes ─────────────────────────────────────────────────────────────────
router.get('/config',            generalLimiter, getConfig);
router.post('/config',           generalLimiter, saveConfig);
router.post('/upload',           upload.single('video'), uploadVideo);
router.delete('/video/:filename', generalLimiter, deleteVideo);

module.exports = router;
