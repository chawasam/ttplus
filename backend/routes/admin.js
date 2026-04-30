// routes/admin.js — Admin-only routes (owner email check)

const express  = require('express');
const router   = express.Router();
const { verifyToken }                    = require('../middleware/auth');
const { generalLimiter, connectLimiter } = require('../middleware/rateLimiter');
const { getServerMetrics }               = require('../handlers/admin/metrics');
const { reportError, getErrors, resolveError } = require('../handlers/admin/errorLog');
const { getGameMetrics }                 = require('../handlers/admin/gameMetrics');
const { listEvents, createEvent, updateEvent, deleteEvent } = require('../handlers/admin/seasonEvents');
const { getFirebaseUsage } = require('../handlers/admin/firebaseUsage');
const { stopConnection }                 = require('../handlers/tiktok');
const { getReadStats, resetReadStats }   = require('../utils/readTracker');

const OWNER_EMAIL = process.env.OWNER_EMAIL;
if (!OWNER_EMAIL) {
  console.error('[Admin] WARNING: OWNER_EMAIL env var not set — admin endpoints will reject all requests');
}

function ownerOnly(req, res, next) {
  if (!OWNER_EMAIL || !req.user || req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ─── Error reporting — auth required (ไม่ต้องเป็น owner, แต่ต้อง login) ────
// rate limit เพื่อป้องกัน spam report
router.post('/errors/report', generalLimiter, verifyToken, reportError);

// ─── Admin-only endpoints ────────────────────────────────────────────────────
router.use(verifyToken, ownerOnly);

router.get('/metrics',        getServerMetrics);
router.get('/game-metrics',   getGameMetrics);
router.get('/firebase-usage', getFirebaseUsage);
router.get('/errors',         getErrors);
router.get('/read-stats',     (req, res) => res.json(getReadStats()));
router.post('/read-stats/reset', (req, res) => { resetReadStats(); res.json({ ok: true, resetAt: Date.now() }); });
router.patch('/errors/:id/resolve', resolveError);

// ─── Season / Event Management ──────────────────────────────────────────────
router.get('/season-events',      listEvents);
router.post('/season-events',     createEvent);
router.put('/season-events/:id',  updateEvent);
router.delete('/season-events/:id', deleteEvent);

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
