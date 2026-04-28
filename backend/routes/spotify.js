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
// รองรับ 2 วิธีส่ง Firebase token:
//   1. Authorization: Bearer <token>  (axios / API call ปกติ)
//   2. ?t=<token>                     (window.open ไม่สามารถส่ง header ได้)
router.get('/auth', async (req, res) => {
  let uid;

  // ── วิธีที่ 1: Authorization header (API call) ──
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1], true);
      uid = decoded.uid;
    } catch {
      return res.status(401).send('<script>window.close();</script>');
    }
  }

  // ── วิธีที่ 2: ?t= query param (window.open redirect flow) ──
  if (!uid && req.query.t) {
    const qt = String(req.query.t);
    if (qt.length > 4096) return res.status(401).send('<script>window.close();</script>');
    try {
      const decoded = await admin.auth().verifyIdToken(qt, true);
      uid = decoded.uid;
    } catch {
      return res.status(401).send('<script>window.close();</script>');
    }
  }

  if (!uid) return res.status(401).send('<script>window.close();</script>');

  const state = Buffer.from(uid).toString('base64');
  const url   = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id',     CLIENT_ID);
  url.searchParams.set('scope',         SCOPES);
  url.searchParams.set('redirect_uri',  REDIRECT_URI);
  url.searchParams.set('state',         state);
  res.redirect(url.toString());
});

// ── helper — HTML page สำหรับ popup (ปิดอัตโนมัติ + fallback message) ─────────
function popupPage({ success, accountName = '', errorMsg = '' }) {
  const color  = success ? '#1DB954' : '#f87171';
  const icon   = success ? '✅' : '❌';
  const title  = success ? 'เชื่อมต่อ Spotify สำเร็จ!' : 'เกิดข้อผิดพลาด';
  const sub    = success && accountName ? `บัญชี: <strong>${accountName}</strong>` : (errorMsg || '');
  const event  = success ? 'spotify_connected' : 'spotify_error';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e5e7eb;font-family:system-ui,sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;text-align:center;gap:10px}
.icon{font-size:52px}.title{font-size:18px;font-weight:700;color:${color}}
.sub{font-size:13px;color:#9ca3af}.note{font-size:11px;color:#374151;margin-top:16px}</style>
</head><body>
<div class="icon">${icon}</div>
<div class="title">${title}</div>
${sub ? `<div class="sub">${sub}</div>` : ''}
<div class="note">ปิดหน้าต่างนี้ได้เลย</div>
<script>
  try{if(window.opener)window.opener.postMessage('${event}','*');}catch(e){}
  setTimeout(function(){try{window.close();}catch(e){}},1200);
</script>
</body></html>`;
}

// ── GET /api/spotify/callback — รับ code แลก token ──────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state) {
    return res.send(popupPage({ success: false, errorMsg: error === 'access_denied' ? 'ยกเลิกการเชื่อมต่อ' : 'ไม่ได้รับ authorization code' }));
  }

  try {
    const uid = Buffer.from(state, 'base64').toString('utf8');

    // แลก code → tokens
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      { headers: { Authorization: spotifyAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // ดึง Spotify profile เพื่อเก็บชื่อบัญชี
    let displayName = '';
    let spotifyId   = '';
    try {
      const meRes = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      displayName = meRes.data.display_name || meRes.data.id || '';
      spotifyId   = meRes.data.id || '';
    } catch { /* ไม่ critical */ }

    await db().collection('spotify_tokens').doc(uid).set({
      accessToken:  access_token,
      refreshToken: refresh_token,
      expiresAt:    Date.now() + (expires_in - 60) * 1000,
      connectedAt:  Date.now(),
      displayName,
      spotifyId,
    });

    res.send(popupPage({ success: true, accountName: displayName }));
  } catch (e) {
    console.error('[Spotify] callback error:', e?.response?.data || e?.message);
    res.send(popupPage({ success: false, errorMsg: 'token exchange ล้มเหลว — กรุณาลองใหม่' }));
  }
});

// ── GET /api/spotify/status — ตรวจสอบว่า connect แล้วหรือยัง + ชื่อบัญชี ────
router.get('/status', verifyToken, async (req, res) => {
  const doc = await db().collection('spotify_tokens').doc(req.user.uid).get();
  if (!doc.exists) return res.json({ connected: false });
  const { displayName, spotifyId, connectedAt } = doc.data();
  res.json({ connected: true, displayName: displayName || '', spotifyId: spotifyId || '', connectedAt: connectedAt || null });
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
