// routes/spotify.js — Spotify Now Playing integration
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const admin   = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = 'https://api.ttsam.app/api/spotify/callback';
const SCOPES        = 'user-read-currently-playing user-read-playback-state';

const { getUidForCid } = require('../utils/widgetToken');

function db() { return admin.firestore(); }

// ── helpers ──────────────────────────────────────────────────────────────────
function spotifyAuthHeader() {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

async function refreshAccessToken(uid) {
  const doc  = await db().collection('spotify_tokens').doc(uid).get();
  if (!doc.exists) throw new Error('no_token');
  const { refreshToken } = doc.data();

  const res = await axios.post('https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    { headers: { Authorization: spotifyAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const { access_token, expires_in } = res.data;
  const expiresAt = Date.now() + (expires_in - 60) * 1000;

  await db().collection('spotify_tokens').doc(uid).update({ accessToken: access_token, expiresAt });
  return access_token;
}

async function getValidToken(uid) {
  const doc = await db().collection('spotify_tokens').doc(uid).get();
  if (!doc.exists) throw new Error('no_token');
  const { accessToken, expiresAt } = doc.data();
  if (Date.now() < expiresAt) return accessToken;
  return refreshAccessToken(uid);
}

// ── GET /api/spotify/auth — redirect ไป Spotify OAuth ───────────────────────
router.get('/auth', verifyToken, (req, res) => {
  const uid   = req.user.uid;
  const state = Buffer.from(uid).toString('base64');
  const url   = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id',     CLIENT_ID);
  url.searchParams.set('scope',         SCOPES);
  url.searchParams.set('redirect_uri',  REDIRECT_URI);
  url.searchParams.set('state',         state);
  res.redirect(url.toString());
});

// ── GET /api/spotify/callback — รับ code แลก token ──────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state) return res.send('<script>window.close();</script>');

  try {
    const uid = Buffer.from(state, 'base64').toString('utf8');
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      { headers: { Authorization: spotifyAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = tokenRes.data;
    await db().collection('spotify_tokens').doc(uid).set({
      accessToken:  access_token,
      refreshToken: refresh_token,
      expiresAt:    Date.now() + (expires_in - 60) * 1000,
      connectedAt:  Date.now(),
    });
    // ปิดหน้าต่างและแจ้ง parent
    res.send(`<script>
      if(window.opener) window.opener.postMessage('spotify_connected','*');
      window.close();
    </script>`);
  } catch (e) {
    console.error('[Spotify] callback error:', e?.message);
    res.send('<script>window.close();</script>');
  }
});

// ── GET /api/spotify/status — ตรวจสอบว่า connect แล้วหรือยัง ────────────────
router.get('/status', verifyToken, async (req, res) => {
  const doc = await db().collection('spotify_tokens').doc(req.user.uid).get();
  res.json({ connected: doc.exists });
});

// ── DELETE /api/spotify/disconnect — ยกเลิกการเชื่อมต่อ ─────────────────────
router.delete('/disconnect', verifyToken, async (req, res) => {
  await db().collection('spotify_tokens').doc(req.user.uid).delete().catch(() => {});
  res.json({ ok: true });
});

// ── GET /api/spotify/now-playing?uid=xxx OR ?cid=xxx — widget เรียก (public) ──
router.get('/now-playing', async (req, res) => {
  const { uid, cid } = req.query;

  // resolve uid จาก cid (รองรับ widget URL แบบ cid เหมือน widget อื่น)
  let resolvedUid = uid || null;
  if (!resolvedUid && cid) {
    // 1. in-memory cache (เร็ว)
    resolvedUid = getUidForCid(String(cid)) || null;
    // 2. Firestore fallback (กรณี server restart)
    if (!resolvedUid) {
      try {
        const doc = await db().collection('widget_cids').doc(String(cid)).get();
        if (doc.exists) resolvedUid = doc.data().uid || null;
      } catch { /* ignore */ }
    }
  }

  if (!resolvedUid) return res.status(400).json({ error: 'uid or cid required' });
  try {
    const token   = await getValidToken(resolvedUid);
    const spRes   = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (spRes.status === 204 || !spRes.data || !spRes.data.item) {
      return res.json({ playing: false });
    }

    const track = spRes.data.item;
    res.json({
      playing:    spRes.data.is_playing,
      title:      track.name,
      artist:     track.artists.map(a => a.name).join(', '),
      album:      track.album.name,
      albumArt:   track.album.images?.[1]?.url || track.album.images?.[0]?.url || '',
      trackUrl:   track.external_urls?.spotify || '',
      durationMs: track.duration_ms,
      progressMs: spRes.data.progress_ms,
    });
  } catch (e) {
    if (e.message === 'no_token') return res.json({ playing: false, error: 'not_connected' });
    console.error('[Spotify] now-playing error:', e?.message);
    res.json({ playing: false });
  }
});

module.exports = router;
