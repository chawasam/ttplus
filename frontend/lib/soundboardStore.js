// soundboardStore.js — จัดการ settings + custom audio สำหรับ Soundboard
// ข้อมูลเก็บใน localStorage (ฝั่ง client ล้วนๆ — ไม่ส่ง server)
// AudioContext singleton สำหรับ Web Audio API

import { SYNTHS } from './soundSynth';

const STORE_KEY   = 'ttplus_soundboard';
const MAX_FILE_MB = 2;

// ===== Defaults =====

function getDefaults() {
  return {
    enabled: true,
    volume:  0.75, // 0-1
    keySize: 1.0,  // scale: 0.6 – 1.4
    customs: {},   // key → { b64, mime, name }
  };
}

// ===== localStorage helpers =====

export function loadSettings() {
  if (typeof window === 'undefined') return getDefaults();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaults();
    const parsed = JSON.parse(raw);
    return { ...getDefaults(), ...parsed, customs: parsed.customs || {} };
  } catch {
    return getDefaults();
  }
}

export function saveSettings(patch) {
  const cur  = loadSettings();
  const next = { ...cur, ...patch };
  // ไม่เขียน customs ทับถ้าไม่ได้ส่งมา
  if (!patch.hasOwnProperty('customs')) next.customs = cur.customs;
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
  // iOS / Chrome อาจ suspend ถ้าไม่มี user gesture — resume ทุกครั้ง
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// ===== Decoded buffer cache (in-memory — ไม่ต้อง decode ซ้ำ) =====

const _cache = new Map(); // key → AudioBuffer

async function decodeB64(ctx, b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // .slice(0) สร้าง copy ก่อนส่งให้ decodeAudioData (buffer transfer)
  return ctx.decodeAudioData(bytes.buffer.slice(0));
}

// ===== Play =====

export async function playKey(key, store) {
  if (!store?.enabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // รอ resume ก่อน (บาง browser ต้องการ)
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch { return; }
  }

  const v = Math.max(0, Math.min(1, store.volume ?? 0.75));
  const t = ctx.currentTime + 0.01;

  const custom = store.customs?.[key];
  if (custom?.b64) {
    try {
      let buf = _cache.get(key);
      if (!buf) {
        buf = await decodeB64(ctx, custom.b64);
        _cache.set(key, buf);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(ctx.destination);
      src.connect(g);
      src.start(t);
      return;
    } catch {
      // decode ล้มเหลว — fallback ไป synth
    }
  }

  SYNTHS[key]?.(ctx, t, v);
}

// ===== Custom upload =====

export function uploadCustom(key, file) {
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
      const dataUrl = e.target.result; // "data:audio/mpeg;base64,AAA..."
      const b64     = dataUrl.split(',')[1];
      const store   = loadSettings();
      store.customs[key] = { b64, mime: file.type, name: file.name };
      _cache.delete(key); // invalidate cache
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* quota */ }
      resolve({ name: file.name });
    };
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.readAsDataURL(file);
  });
}

export function removeCustom(key) {
  const store = loadSettings();
  delete store.customs[key];
  _cache.delete(key);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

export function removeAllCustom() {
  const store = loadSettings();
  store.customs = {};
  _cache.clear();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}
