// soundboardStore.js — จัดการ settings + custom audio สำหรับ Soundboard
// ข้อมูลเก็บใน localStorage (ฝั่ง client ล้วนๆ — ไม่ส่ง server)

import { SYNTHS } from './soundSynth';

const STORE_KEY   = 'ttplus_soundboard';
const MAX_FILE_MB = 5;

// ===== Defaults =====

export const SFX_KEYS = new Set(['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M']);

function getDefaults() {
  return {
    enabled:  false,
    volume:   0.75,
    keySize:  1.0,
    layout:   'h',     // 'h' | 'v'
    customs:  {},      // page 1: key → { b64, mime, name }
    modes:    {},      // page 1: key → 'poly' | 'stop' | 'toggle' | 'loop'
    customs2: {},      // page 2
    modes2:   {},      // page 2
    colors:   {},      // page 1: key → css color string ('' = default)
    colors2:  {},      // page 2
    volumes:  {},      // page 1: key → 0.1-2.0 multiplier (default 1.0)
    volumes2: {},      // page 2
  };
}

// ===== localStorage helpers =====

export function loadSettings() {
  if (typeof window === 'undefined') return getDefaults();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaults();
    const p = JSON.parse(raw);
    return {
      ...getDefaults(), ...p,
      customs:  p.customs   || {}, modes:    p.modes    || {},
      customs2: p.customs2  || {}, modes2:   p.modes2   || {},
      colors:   p.colors    || {}, colors2:  p.colors2  || {},
      volumes:  p.volumes   || {}, volumes2: p.volumes2 || {},
    };
  } catch { return getDefaults(); }
}

export function saveSettings(patch) {
  const cur  = loadSettings();
  const next = { ...cur, ...patch };
  ['customs','modes','customs2','modes2','colors','colors2','volumes','volumes2'].forEach(f => {
    if (!Object.prototype.hasOwnProperty.call(patch, f)) next[f] = cur[f];
  });
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    // broadcast soundboard enabled → StatusBar
    if (typeof window !== 'undefined' && patch.enabled !== undefined) {
      window.dispatchEvent(new CustomEvent('ttplus-sb', { detail: { enabled: next.enabled } }));
    }
  } catch {}
  return next;
}

// ===== AudioContext =====

let _ctx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

// ===== Cache =====

const _cache    = new Map(); // custom upload decode cache
const _sfxCache = new Map(); // default sfx decode cache

export function clearCustomCache() { _cache.clear(); }

// ===== Active source tracking =====
// เก็บทั้ง src + gain เพื่อรองรับ fade out

const _activeSources = new Map(); // key → Array<{ src, gain }>

function trackSource(key, src, gain) {
  if (!_activeSources.has(key)) _activeSources.set(key, []);
  const entry = { src, gain };
  _activeSources.get(key).push(entry);
  src.onended = () => {
    const list = _activeSources.get(key);
    if (list) _activeSources.set(key, list.filter(e => e !== entry));
  };
}

// หยุดทันที — ใช้ใน mode 'stop' (restart)
export function stopKeyAudio(key) {
  const list = _activeSources.get(key) || [];
  list.forEach(({ src }) => { try { src.stop(); } catch {} });
  _activeSources.set(key, []);
}

// หยุดทุกเสียง + fade out — ใช้กับ Stop All button / Escape
export function stopAllAudio(fadeMs = 300) {
  const ctx = _ctx;
  if (!ctx) {
    for (const key of _activeSources.keys()) stopKeyAudio(key);
    return;
  }
  const now   = ctx.currentTime;
  const fadeS = Math.max(0, fadeMs) / 1000;

  for (const [key, list] of _activeSources) {
    list.forEach(({ src, gain }) => {
      try {
        if (fadeS > 0 && gain) {
          const cur = gain.gain.value;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(cur, now);
          gain.gain.linearRampToValueAtTime(0, now + fadeS);
          src.stop(now + fadeS);
        } else {
          src.stop();
        }
      } catch {}
    });
    _activeSources.set(key, []);
  }
}

// ส่งคืน Set ของ key ที่กำลังเล่นอยู่ตอนนี้
export function getPlayingKeys() {
  const playing = new Set();
  for (const [key, list] of _activeSources) {
    if (list.length > 0) playing.add(key);
  }
  return playing;
}

// ===== SFX loader =====

async function loadSfxBuffer(ctx, key) {
  if (_sfxCache.has(key)) return _sfxCache.get(key);
  try {
    const resp = await fetch(`/sfx/${key.toLowerCase()}.mp3`);
    if (!resp.ok) { _sfxCache.set(key, null); return null; }
    const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
    _sfxCache.set(key, buf);
    return buf;
  } catch { _sfxCache.set(key, null); return null; }
}

const _sfx2Cache = new Map(); // page 2 default sfx decode cache

async function loadSfx2Buffer(ctx, key) {
  if (_sfx2Cache.has(key)) return _sfx2Cache.get(key);
  try {
    const resp = await fetch(`/sfx2/${key.toLowerCase()}.mp3`);
    if (!resp.ok) { _sfx2Cache.set(key, null); return null; }
    const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
    _sfx2Cache.set(key, buf);
    return buf;
  } catch { _sfx2Cache.set(key, null); return null; }
}

async function decodeB64(ctx, b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return ctx.decodeAudioData(bytes.buffer.slice(0));
}

// ===== Play =====

// page: 1 = โหลดจาก /sfx/, 2 = โหลดจาก /sfx2/, 0/false = ไม่โหลด default
export async function playKey(key, store, page = 1) {
  if (!store?.enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { return; }
  }

  const mode = store.modes?.[key] || 'poly';
  if (mode === 'stop') stopKeyAudio(key);
  if (mode === 'toggle' || mode === 'loop') {
    // ถ้ากำลังเล่นอยู่ → หยุด (ไม่เริ่มใหม่)
    if (getPlayingKeys().has(key)) { stopKeyAudio(key); return; }
  }

  // per-key volume multiplier (default 1.0) × global volume
  const perKeyVol = store.volumes?.[key] ?? 1.0;
  const v = Math.max(0, Math.min(2, (store.volume ?? 0.75) * perKeyVol));
  const t = ctx.currentTime + 0.01;

  function playBuffer(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (mode === 'loop') src.loop = true; // loop mode — เล่นวนไม่จบ
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(ctx.destination);
    src.connect(g);
    src.start(t);
    trackSource(key, src, g); // track ทั้ง src และ gain
  }

  // 1. Custom upload
  const custom = store.customs?.[key];
  if (custom?.b64) {
    try {
      let buf = _cache.get(key);
      if (!buf) { buf = await decodeB64(ctx, custom.b64); _cache.set(key, buf); }
      playBuffer(buf); return;
    } catch {}
  }

  // 2. Default SFX — page 1: /sfx/, page 2: /sfx2/
  if (page === 1 && SFX_KEYS.has(key)) {
    const sfxBuf = await loadSfxBuffer(ctx, key);
    if (sfxBuf) { playBuffer(sfxBuf); return; }
  }
  if (page === 2 && SFX_KEYS.has(key)) {
    const sfxBuf = await loadSfx2Buffer(ctx, key);
    if (sfxBuf) { playBuffer(sfxBuf); return; }
  }

  // 3. Synthesizer fallback
  SYNTHS[key]?.(ctx, t, v);
}

// ===== Custom upload/remove =====

export function uploadCustom(key, file, page = 1) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('ไม่มีไฟล์')); return; }
    if (!file.type.startsWith('audio/')) { reject(new Error('ไฟล์ต้องเป็นเสียง (.mp3 .ogg .wav)')); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { reject(new Error(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB} MB`)); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64   = e.target.result.split(',')[1];
      const store = loadSettings();
      const field = page === 2 ? 'customs2' : 'customs';
      store[field][key] = { b64, mime: file.type, name: file.name };
      _cache.delete(key);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
      resolve({ name: file.name });
    };
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.readAsDataURL(file);
  });
}

export function removeCustom(key, page = 1) {
  const store = loadSettings();
  const field = page === 2 ? 'customs2' : 'customs';
  delete store[field][key];
  _cache.delete(key);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

export function removeAllCustom(page) {
  const store = loadSettings();
  if (!page || page === 1) store.customs  = {};
  if (!page || page === 2) store.customs2 = {};
  _cache.clear();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

// ===== Key names (per user email + page) =====

const NAMES_PREFIX = 'ttplus_sb_names_';

function namesKey(email, page) {
  return NAMES_PREFIX + (email || 'guest') + (page === 2 ? '_p2' : '');
}

export function loadNames(email, page = 1) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(namesKey(email, page));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveName(email, key, name, page = 1) {
  const names = loadNames(email, page);
  if (name?.trim()) names[key] = name.trim();
  else delete names[key];
  try { localStorage.setItem(namesKey(email, page), JSON.stringify(names)); } catch {}
  return names;
}

// ===== Export / Import =====

export function exportSettings(email) {
  return {
    version:    1,
    exportedAt: new Date().toISOString(),
    settings:   loadSettings(),
    names: {
      1: loadNames(email, 1),
      2: loadNames(email, 2),
    },
  };
}

export function importSettings(data, email) {
  if (!data?.version || !data?.settings) throw new Error('ไฟล์ไม่ถูกต้อง');
  const s = data.settings;
  const restored = {
    ...getDefaults(),
    enabled:  s.enabled  ?? false,
    volume:   typeof s.volume  === 'number' ? s.volume  : 0.75,
    keySize:  typeof s.keySize === 'number' ? s.keySize : 1.0,
    layout:   s.layout   || 'h',
    customs:  s.customs  || {},
    modes:    s.modes    || {},
    customs2: s.customs2 || {},
    modes2:   s.modes2   || {},
    colors:   s.colors   || {},
    colors2:  s.colors2  || {},
    volumes:  s.volumes  || {},
    volumes2: s.volumes2 || {},
  };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(restored)); } catch {}
  // restore names
  try {
    localStorage.setItem(namesKey(email, 1), JSON.stringify(data.names?.[1] || {}));
    localStorage.setItem(namesKey(email, 2), JSON.stringify(data.names?.[2] || {}));
  } catch {}
  clearCustomCache();
  return restored;
}
