// soundboardStore.js — จัดการ settings + custom audio สำหรับ Soundboard
// ข้อมูลเก็บใน localStorage (ฝั่ง client ล้วนๆ — ไม่ส่ง server)
// AudioContext singleton สำหรับ Web Audio API

import { SYNTHS } from './soundSynth';

const STORE_KEY   = 'ttplus_soundboard';
const MAX_FILE_MB = 2;

// ===== Defaults =====

// ครบ 26 ตัว — ทุก key มีไฟล์ MP3 ใน /public/sfx/ (page 1 เท่านั้น)
export const SFX_KEYS = new Set(['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M']);

function getDefaults() {
  return {
    enabled:  false, // ปิดค่าเริ่มต้น
    volume:   0.75,
    keySize:  1.0,
    layout:   'h',   // 'h' | 'v'
    customs:  {},    // page 1: key → { b64, mime, name }
    modes:    {},    // page 1: key → 'poly' | 'stop'
    customs2: {},    // page 2: key → { b64, mime, name }
    modes2:   {},    // page 2: key → 'poly' | 'stop'
  };
}

// ===== localStorage helpers =====

export function loadSettings() {
  if (typeof window === 'undefined') return getDefaults();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaults();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaults(),
      ...parsed,
      customs:  parsed.customs  || {},
      modes:    parsed.modes    || {},
      customs2: parsed.customs2 || {},
      modes2:   parsed.modes2   || {},
    };
  } catch {
    return getDefaults();
  }
}

export function saveSettings(patch) {
  const cur  = loadSettings();
  const next = { ...cur, ...patch };
  // ไม่เขียน object fields ทับถ้าไม่ได้ส่งมา
  const guards = ['customs', 'modes', 'customs2', 'modes2'];
  guards.forEach(f => {
    if (!Object.prototype.hasOwnProperty.call(patch, f)) next[f] = cur[f];
  });
  try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

// ===== AudioContext singleton =====

let _ctx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// ===== Decoded buffer cache =====

const _cache    = new Map(); // key → AudioBuffer (custom upload — cleared on page switch)
const _sfxCache = new Map(); // key → AudioBuffer | null (default /public/sfx/)

export function clearCustomCache() {
  _cache.clear();
}

// ===== Active source tracking =====

const _activeSources = new Map(); // key → AudioBufferSourceNode[]

function trackSource(key, src) {
  if (!_activeSources.has(key)) _activeSources.set(key, []);
  _activeSources.get(key).push(src);
  src.onended = () => {
    const list = _activeSources.get(key);
    if (list) _activeSources.set(key, list.filter(s => s !== src));
  };
}

export function stopKeyAudio(key) {
  const list = _activeSources.get(key) || [];
  list.forEach(src => { try { src.stop(); } catch {} });
  _activeSources.set(key, []);
}

export function stopAllAudio() {
  for (const key of _activeSources.keys()) {
    stopKeyAudio(key);
  }
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
  } catch {
    _sfxCache.set(key, null);
    return null;
  }
}

async function decodeB64(ctx, b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return ctx.decodeAudioData(bytes.buffer.slice(0));
}

// ===== Play =====
// store ที่ส่งมาควรเป็น effectiveStore (custom/modes ถูกเลือกตาม page แล้ว)
// page 1 ใช้ SFX fallback, page 2 ไม่มี default SFX (fallback เป็น synth)

export async function playKey(key, store, useSfx = true) {
  if (!store?.enabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { return; }
  }

  const mode = store.modes?.[key] || 'poly';
  if (mode === 'stop') stopKeyAudio(key);

  const v = Math.max(0, Math.min(1, store.volume ?? 0.75));
  const t = ctx.currentTime + 0.01;

  function playBuffer(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(ctx.destination);
    src.connect(g);
    src.start(t);
    trackSource(key, src);
  }

  // 1. Custom upload (current page)
  const custom = store.customs?.[key];
  if (custom?.b64) {
    try {
      let buf = _cache.get(key);
      if (!buf) {
        buf = await decodeB64(ctx, custom.b64);
        _cache.set(key, buf);
      }
      playBuffer(buf);
      return;
    } catch {}
  }

  // 2. Default SFX files (page 1 only)
  if (useSfx && SFX_KEYS.has(key)) {
    const sfxBuf = await loadSfxBuffer(ctx, key);
    if (sfxBuf) { playBuffer(sfxBuf); return; }
  }

  // 3. Synthesizer fallback
  SYNTHS[key]?.(ctx, t, v);
}

// ===== Custom upload =====

export function uploadCustom(key, file, page = 1) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('ไม่มีไฟล์')); return; }
    if (!file.type.startsWith('audio/')) {
      reject(new Error('ไฟล์ต้องเป็นเสียง (.mp3 .ogg .wav)'));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      reject(new Error(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB} MB`));
      return;
    }
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
