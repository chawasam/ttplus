// routes/nowplaying.js — Now Playing (Universal) — Last.fm / Manual / Extension / Companion
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { getUidForCid } = require('../utils/widgetToken');
const { trackRead } = require('../utils/readTracker');
const { getUserNP, setUserNP, VALID_SOURCES } = require('../utils/nowplaying/state');
const { fetchNowPlaying: fetchLastfm } = require('../utils/nowplaying/lastfm');
const { sanitizeStr } = require('../utils/validate');

function db() { return admin.firestore(); }

// ── helpers ──────────────────────────────────────────────────────────────────

async function resolveUid({ uid, cid }) {
  if (uid) return String(uid);
  if (!cid) return null;
  const cached = getUidForCid(String(cid));
  if (cached) return cached;
  try {
    const doc = await db().collection('widget_cids').doc(String(cid)).get();
    if (doc.exists) return doc.data()?.uid || null;
  } catch { /* ignore */ }
  return null;
}

function emptyPayload(source) {
  return { playing: false, source: source || null, updatedAt: Date.now() };
}

// dispatch: เลือก source แล้วเรียก fetcher ที่เหมาะสม
async function fetchForUid(uid) {
  const { source, config } = await getUserNP(uid);
  if (!source) return emptyPayload(null);
  if (source === 'lastfm') {
    const username = config?.lastfm?.username || '';
    return fetchLastfm(username);
  }
  // manual / extension / companion ยังไม่ implement ใน Phase 1
  return emptyPayload(source);
}

// ── GET /api/nowplaying/current — public, widget poll ────────────────────────
router.get('/current', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.removeHeader('Access-Control-Allow-Credentials');
  const uid = await resolveUid(req.query);
  if (!uid) return res.status(400).json({ error: 'uid or cid required' });
  trackRead('nowplaying.current', 1);
  try {
    const payload = await fetchForUid(uid);
    res.json(payload);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[nowplaying] /current error:', err?.message);
    }
    res.json(emptyPayload(null));
  }
});

// ── GET /api/nowplaying/status — auth — สำหรับหน้า Settings ─────────────────
router.get('/status', verifyToken, async (req, res) => {
  try {
    const { source, config } = await getUserNP(req.user.uid);
    let lastTrack = null;
    if (source) {
      try {
        lastTrack = await fetchForUid(req.user.uid);
      } catch { /* ignore */ }
    }
    res.json({
      source,
      lastfm:    { username: config?.lastfm?.username || '' },
      manual:    { hasUrl: !!config?.manual?.lastUrl },
      extension: { configured: !!config?.extension?.tokenHash, tokenPreview: config?.extension?.tokenPreview || '' },
      companion: { configured: !!config?.companion?.tokenHash, tokenPreview: config?.companion?.tokenPreview || '' },
      lastTrack,
      lastUpdate: lastTrack?.updatedAt || null,
    });
  } catch (err) {
    console.error('[nowplaying] /status:', err?.message);
    res.status(500).json({ error: 'failed' });
  }
});

// ── POST /api/nowplaying/source — auth — เลือก source ──────────────────────
router.post('/source', verifyToken, async (req, res) => {
  const source = req.body?.source;
  if (source !== null && !VALID_SOURCES.has(source)) {
    return res.status(400).json({ error: 'invalid source' });
  }
  try {
    await setUserNP(req.user.uid, { source });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'failed' });
  }
});

// ── POST /api/nowplaying/lastfm — auth — บันทึก Last.fm username ───────────
router.post('/lastfm', verifyToken, async (req, res) => {
  const username = sanitizeStr(req.body?.username || '', 50);
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    await setUserNP(req.user.uid, { config: { lastfm: { username } } });
    res.json({ ok: true, username });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'failed' });
  }
});

// ── POST /api/nowplaying/lastfm/test — auth — ทดสอบ username (ไม่ save) ────
router.post('/lastfm/test', verifyToken, async (req, res) => {
  const username = sanitizeStr(req.body?.username || '', 50);
  if (!username) return res.status(400).json({ error: 'username required' });
  try {
    const payload = await fetchLastfm(username);
    if (payload.error === 'not_configured') {
      return res.status(503).json({ error: 'lastfm_not_configured' });
    }
    if (payload.error === 'rate_limited') {
      return res.status(429).json({ error: 'rate_limited' });
    }
    if (payload.error === 'user_not_found') {
      return res.status(404).json({ error: 'user_not_found' });
    }
    res.json({ ok: true, preview: payload });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'failed' });
  }
});

// ── Stubs สำหรับ Phase 2-4 ──────────────────────────────────────────────────
router.post('/manual',           verifyToken, (_req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/manual/clear',     verifyToken, (_req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/extension/push',                (_req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/companion/push',                (_req, res) => res.status(501).json({ error: 'not_implemented' }));
router.post('/token/rotate',     verifyToken, (_req, res) => res.status(501).json({ error: 'not_implemented' }));
router.delete('/token',          verifyToken, (_req, res) => res.status(501).json({ error: 'not_implemented' }));

module.exports = router;
