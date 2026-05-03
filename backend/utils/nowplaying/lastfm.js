// lastfm.js — fetch "currently scrobbling" track จาก Last.fm
// In-memory token bucket: 4 req/s, burst 8 (ใต้ Last.fm cap 5 req/s/key)
const axios = require('axios');

const API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const RATE_PER_SEC = 4;
const BURST = 8;

const bucket = { tokens: BURST, lastRefill: Date.now() };

function takeToken() {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(BURST, bucket.tokens + elapsed * RATE_PER_SEC);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function emptyPayload() {
  return { playing: false, source: 'lastfm', updatedAt: Date.now() };
}

// fetchNowPlaying(username) → unified payload
// คืน { playing: false, error: 'rate_limited' } เมื่อโดน throttle
// คืน { playing: false, error: 'not_configured' } เมื่อ API key ไม่มี
async function fetchNowPlaying(username) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return { ...emptyPayload(), error: 'not_configured' };
  }
  if (!username || typeof username !== 'string') {
    return emptyPayload();
  }
  if (!takeToken()) {
    return { ...emptyPayload(), error: 'rate_limited' };
  }

  try {
    const res = await axios.get(API_BASE, {
      params: {
        method:   'user.getRecentTracks',
        user:     username,
        api_key:  apiKey,
        format:   'json',
        extended: 1,
        limit:    1,
      },
      timeout: 5000,
    });

    const tracks = res?.data?.recenttracks?.track;
    const track  = Array.isArray(tracks) ? tracks[0] : tracks;
    if (!track) return emptyPayload();

    const isNowPlaying = track['@attr']?.nowplaying === 'true';
    if (!isNowPlaying) return emptyPayload();

    // images: small/medium/large/extralarge — เลือก extralarge ถ้ามี
    const images = Array.isArray(track.image) ? track.image : [];
    const albumArt =
      images.find(i => i.size === 'extralarge')?.['#text'] ||
      images.find(i => i.size === 'large')?.['#text'] ||
      images.find(i => i.size === 'medium')?.['#text'] ||
      '';

    const artistName = typeof track.artist === 'object'
      ? (track.artist.name || track.artist['#text'] || '')
      : (track.artist || '');

    return {
      playing:    true,
      source:     'lastfm',
      title:      String(track.name || '').slice(0, 200),
      artist:     String(artistName).slice(0, 200),
      album:      String(track.album?.['#text'] || track.album?.name || '').slice(0, 200),
      albumArt:   albumArt && albumArt.startsWith('http') ? albumArt : '',
      trackUrl:   String(track.url || '').slice(0, 500),
      durationMs: null,
      progressMs: null,
      updatedAt:  Date.now(),
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 6) {
      return { ...emptyPayload(), error: 'user_not_found' };
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[lastfm] fetch error:', err?.message);
    }
    return { ...emptyPayload(), error: 'fetch_failed' };
  }
}

module.exports = { fetchNowPlaying };
