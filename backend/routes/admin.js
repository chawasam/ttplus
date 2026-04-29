// routes/admin.js — Admin-only routes (owner email check)

const express  = require('express');
const router   = express.Router();
const { verifyToken }                    = require('../middleware/auth');
const { generalLimiter, connectLimiter } = require('../middleware/rateLimiter');
const { getServerMetrics }               = require('../handlers/admin/metrics');
const { reportError, getErrors, resolveError } = require('../handlers/admin/errorLog');
const { getGameMetrics }                 = require('../handlers/admin/gameMetrics');
const { stopConnection }                 = require('../handlers/tiktok');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'cksamg@gmail.com';

function ownerOnly(req, res, next) {
  if (!req.user || req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── Error reporting — auth required (ไม่ต้องเป็น owner, แต่ต้อง login) ────
// rate limit เพื่อป้องกัน spam report
router.post('/errors/report', generalLimiter, verifyToken, reportError);

// ─── Admin-only endpoints ────────────────────────────────────────────────────
router.use(verifyToken, ownerOnly);

router.get('/metrics',     getServerMetrics);
router.get('/game-metrics', getGameMetrics);
router.get('/errors',      getErrors);
router.patch('/errors/:id/resolve', resolveError);

// Kick a TikTok connection (force disconnect)
router.post('/connections/:userId/kick', async (req, res) => {
  const { userId } = req.params;
  if (!userId || typeof userId !== 'string' || userId.length > 128) {
    return res.status(400).json({ error: 'Invalid userId' });
  }
  try {
    await stopConnection(userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to kick connection' });
  }
});

module.exports = router;
