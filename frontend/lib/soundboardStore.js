// soundboardStore.js — จัดการ settings + custom audio สำหรับ Soundboard
// Settings (modes, colors, volumes ฯลฯ) → localStorage (ข้อมูลเล็ก)
// Audio data (b64) → IndexedDB (ไม่มีลิมิต 5MB — รองรับทุกอุปกรณ์รวมมือถือ)

import { SYNTHS } from './soundSynth';

const STORE_KEY   = 'ttplus_soundboard';
const MAX_FILE_MB = 20; // IndexedDB รองรับได้มากกว่า localStorage มาก

// ===== Defaults =====

export const SFX_KEYS = new Set(['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M']);

// ฟิลด์ที่มี per-page object — ต้องรักษาไว้เมื่อ save บางส่วน
const PAGE_FIELDS = [
  'customs','modes','colors','volumes','speeds',
  'customs2','modes2','colors2','volumes2','speeds2',
  'customs3','modes3','colors3','volumes3','speeds3',
  'customs4','modes4','colors4','volumes4','speeds4',
];

// helper: ชื่อ field ของแต่ละ page
function pageField(base, page) {
  return page === 1 ? base : `${base}${page}`;
}

function getDefaults() {
  return {
    enabled:    false,
    volume:     0.75,
    keySize:    1.0,
    layout:     'h',       // 'h' | 'v' | 'pad'
    showKbHint: true,      // แสดง keyboard key ใน Pad mode
    // page 1
    customs:  {}, modes:  {}, colors:  {}, volumes:  {}, speeds:  {},
    // page 2
    customs2: {}, modes2: {}, colors2: {}, volumes2: {}, speeds2: {},
    // page 3
    customs3: {}, modes3: {}, colors3: {}, volumes3: {}, speeds3: {},
    // page 4
    customs4: {}, modes4: {}, colors4: {}, volumes4: {}, speeds4: {},
  };
}

// ===== IndexedDB helpers =====

const IDB_NAME    = 'ttplus_audio';
const IDB_VERSION = 1;
const IDB_STORE   = 'clips';

let _dbPromise = null;

function openDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB ไม่รองรับในสภาพแวดล้อมนี้'));
  }
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => { e.target.result.createObjectStore(IDB_STORE); };
    req.onsuccess  = e  => {
      const db = e.target.result;
      db.onclose = () => { _dbPromise = null; }; // reset เมื่อ connection ปิดตัวเอง → reopen ได้ครั้งต่อไป
      resolve(db);
    };
    req.onerror    = e  => { _dbPromise = null; reject(e.target.error); };
    req.onblocked  = () => { _dbPromise = null; reject(new Error('IndexedDB blocked')); };
  });
  return _dbPromise;
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = e => resolve(e.target.result ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = e  => reject(e.target.error);
  });
}

function idbDelete(db, key) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = e  => reject(e.target.error);
  });
}

// ดึงทุก entry: returns { [idbKey]: { b64, mime, name } }
function idbGetAll(db) {
  return new Promise((resolve, reject) => {
    const result = {};
    const req    = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).openCursor();
    req.onsuccess = e => {
      const cur = e.target.result;
      if (cur) { result[cur.key] = cur.value; cur.continue(); }
      else resolve(result);
    };
    req.onerror = e => reject(e.target.error);
  });
}

// ลบทุก clip ของ page ที่ระบุ (key format: "${page}_${keyChar}")
function idbDeletePage(db, page) {
  return new Promise((resolve, reject) => {
    const prefix = `${page}_`;
    const tx     = db.transaction(IDB_STORE, 'readwrite');
    const req    = tx.objectStore(IDB_STORE).openCursor();
    req.onsuccess = e => {
      const cur = e.target.result;
      if (cur) { if (String(cur.key).startsWith(prefix)) cur.delete(); cur.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = e  => reject(e.target.error);
  });
}

// ลบทุก clip (ทุก page)
function idbClear(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = e  => reject(e.target.error);
  });
}

// ===== localStorage helpers =====

export function loadSettings() {
  if (typeof window === 'undefined') return getDefaults();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaults();
    const p = JSON.parse(raw);
    const result = { ...getDefaults(), ...p };
    PAGE_FIELDS.forEach(f => { result[f] = p[f] || {}; });
    return result;
  } catch { return getDefaults(); }
}

export function saveSettings(patch) {
  const cur  = loadSettings();
  const next = { ...cur, ...patch };
  PAGE_FIELDS.forEach(f => {
    if (!Object.prototype.hasOwnProperty.call(patch, f)) next[f] = cur[f];
  });
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
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

const _cache     = new Map(); // custom upload decode cache (AudioBuffer)
const _sfxCache  = new Map(); // page 1 sfx decode cache
const _sfx2Cache = new Map(); // page 2 sfx decode cache

export function clearCustomCache() { _cache.clear(); }

// ===== Active source tracking (รวม timing สำหรับ progress bar) =====

const _activeSources = new Map(); // key → Array<{src, gain, startTime, duration}>

function trackSource(key, src, gain, startTime, duration) {
  if (!_activeSources.has(key)) _activeSources.set(key, []);
  const entry = { src, gain, startTime, duration };
  _activeSources.get(key).push(entry);
  src.onended = () => {
    const list = _activeSources.get(key);
    if (list) _activeSources.set(key, list.filter(e => e !== entry));
  };
}

// หยุดทันที — mode 'stop' (restart)
export function stopKeyAudio(key) {
  const list = _activeSources.get(key) || [];
  list.forEach(({ src }) => { try { src.stop(); } catch {} });
  _activeSources.set(key, []);
}

// หยุดทุกเสียง + fade out
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

// ส่งคืน Set ของ key ที่กำลังเล่นอยู่
export function getPlayingKeys() {
  const playing = new Set();
  for (const [key, list] of _activeSources) {
    if (list.length > 0) playing.add(key);
  }
  return playing;
}

// ส่งคืน Map<key, {progress: 0-1, duration: seconds}> สำหรับ progress bar
export function getPlayingProgress() {
  const ctx = _ctx;
  if (!ctx) return new Map();
  const result = new Map();
  for (const [key, list] of _activeSources) {
    if (list.length > 0) {
      const last = list[list.length - 1];
      if (last.duration > 0) {
        const elapsed  = Math.max(0, ctx.currentTime - last.startTime);
        const progress = Math.min(1, elapsed / last.duration);
        result.set(key, { elapsed, duration: last.duration, progress });
      }
    }
  }
  return result;
}

// ===== SFX loaders =====

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
    if (getPlayingKeys().has(key)) { stopKeyAudio(key); return; }
  }

  const perKeyVol = store.volumes?.[key] ?? 1.0;
  const speed     = Math.max(0.1, Math.min(4, store.speeds?.[key] ?? 1.0));
  const v = Math.max(0, Math.min(2, (store.volume ?? 0.75) * perKeyVol));
  const t = ctx.currentTime + 0.01;

  function playBuffer(buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = speed;
    if (mode === 'loop') src.loop = true;
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(ctx.destination);
    src.connect(g);
    src.start(t);
    const duration = mode === 'loop' ? 0 : buf.duration / speed;
    trackSource(key, src, g, t, duration);
  }

  // 1. Custom upload — ตรวจ cache ก่อน
  const custom = store.customs?.[key];
  if (custom) {
    try {
      let buf = _cache.get(key);
      if (!buf) {
        let b64 = custom.b64; // รูปแบบเก่า: b64 อยู่ใน localStorage

        if (b64) {
          // === Auto-migrate เสียงเก่า (localStorage → IndexedDB) ===
          try {
            const db = await openDB();
            await idbPut(db, `${page}_${key}`, { b64, mime: custom.mime, name: custom.name });
            // ลบ b64 ออกจาก localStorage (ประหยัดพื้นที่)
            const s = loadSettings();
            const f = pageField('customs', page);
            if (s[f]?.[key]) {
              s[f][key] = { mime: custom.mime, name: custom.name }; // เก็บแค่ metadata
              try {
                localStorage.setItem(STORE_KEY, JSON.stringify(s));
                // แจ้ง component ให้ reload store จาก localStorage (sync React state)
                window.dispatchEvent(new CustomEvent('ttplus-sb-migrated'));
              } catch {}
            }
          } catch {}
        } else {
          // รูปแบบใหม่: b64 อยู่ใน IndexedDB
          try {
            const db  = await openDB();
            const clip = await idbGet(db, `${page}_${key}`);
            b64 = clip?.b64 ?? null;
          } catch {}
        }

        if (b64) {
          buf = await decodeB64(ctx, b64);
          _cache.set(key, buf);
        }
      }
      if (buf) { playBuffer(buf); return; }
    } catch {}
  }

  // 2. Default SFX — page 1: /sfx/, page 2: /sfx2/, page 3-4: ไม่มี default
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
    reader.onload = async (e) => {
      try {
        const b64 = e.target.result.split(',')[1];

        // บันทึก audio data ลง IndexedDB (ไม่มีลิมิต 5 MB)
        const db = await openDB();
        await idbPut(db, `${page}_${key}`, { b64, mime: file.type, name: file.name });

        // บันทึก metadata (ชื่อไฟล์ + mime) ลง localStorage (ข้อมูลเล็กมาก ไม่มีปัญหา)
        const store = loadSettings();
        const field = pageField('customs', page);
        store[field][key] = { mime: file.type, name: file.name }; // ไม่เก็บ b64 ใน localStorage อีกต่อไป
        _cache.delete(key);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}

        resolve({ name: file.name });
      } catch (err) {
        reject(new Error('บันทึกไม่สำเร็จ: ' + (err?.message || 'ข้อผิดพลาด กรุณาลองใหม่')));
      }
    };
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
    reader.readAsDataURL(file);
  });
}

export function removeCustom(key, page = 1) {
  const store = loadSettings();
  const field = pageField('customs', page);
  delete store[field][key];
  _cache.delete(key);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  // ลบออกจาก IndexedDB (fire-and-forget)
  openDB().then(db => idbDelete(db, `${page}_${key}`)).catch(() => {});
}

export function removeAllCustom(page) {
  const store = loadSettings();
  const pages = page ? [page] : [1, 2, 3, 4];
  pages.forEach(p => { store[pageField('customs', p)] = {}; });
  _cache.clear();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  // ลบออกจาก IndexedDB (fire-and-forget)
  openDB().then(async db => {
    for (const p of pages) await idbDeletePage(db, p).catch(() => {});
  }).catch(() => {});
}

// ===== Key names (per user email + page) =====

const NAMES_PREFIX = 'ttplus_sb_names_';

function namesKey(email, page) {
  const suffix = page === 1 ? '' : `_p${page}`;
  return NAMES_PREFIX + (email || 'guest') + suffix;
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

// ===== Copy key between pages =====

export function copyKey(key, fromPage, toPage, email) {
  const store = loadSettings();
  const updates = {};

  ['customs','modes','colors','volumes','speeds'].forEach(base => {
    const src = pageField(base, fromPage);
    const dst = pageField(base, toPage);
    if (store[src]?.[key] !== undefined) {
      updates[dst] = { ...(store[dst] || {}), [key]: store[src][key] };
    }
  });

  if (Object.keys(updates).length > 0) {
    Object.assign(store, updates);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }

  // copy audio ใน IndexedDB (fire-and-forget)
  openDB().then(async db => {
    let clip = await idbGet(db, `${fromPage}_${key}`);
    if (!clip) {
      // รองรับ format เก่า: b64 ยังอยู่ใน localStorage (ยังไม่ได้ play = ยังไม่ migrate)
      const s    = loadSettings();
      const old  = s[pageField('customs', fromPage)]?.[key];
      if (old?.b64) clip = { b64: old.b64, mime: old.mime, name: old.name };
    }
    if (clip) await idbPut(db, `${toPage}_${key}`, clip);
  }).catch(() => {});

  // copy name
  const srcName = loadNames(email, fromPage)[key];
  if (srcName) saveName(email, key, srcName, toPage);

  return store;
}

// ===== Export / Import =====

// export เป็น async แล้ว — ต้องใช้ await ใน soundboard.js
export async function exportSettings(email) {
  // รวบรวม audio data จาก IndexedDB
  const audio = {};
  try {
    const db      = await openDB();
    const entries = await idbGetAll(db);
    Object.assign(audio, entries);
  } catch {}

  // รองรับ format เก่า: b64 ที่อาจยังอยู่ใน localStorage customs (auto-include)
  const settings = loadSettings();
  [1, 2, 3, 4].forEach(p => {
    const field   = pageField('customs', p);
    const customs = settings[field] || {};
    Object.entries(customs).forEach(([k, v]) => {
      const idbKey = `${p}_${k}`;
      if (v.b64 && !audio[idbKey]) {
        audio[idbKey] = { b64: v.b64, mime: v.mime, name: v.name };
      }
    });
  });

  return {
    version:    3,
    exportedAt: new Date().toISOString(),
    settings,
    names: {
      1: loadNames(email, 1),
      2: loadNames(email, 2),
      3: loadNames(email, 3),
      4: loadNames(email, 4),
    },
    audio, // audio data แยกออกมา ไม่ใช่ embed ใน settings.customs
  };
}

// import เป็น async แล้ว — ต้องใช้ await ใน soundboard.js
export async function importSettings(data, email) {
  if (!data?.version || !data?.settings) throw new Error('ไฟล์ไม่ถูกต้อง');
  const s = data.settings;

  const restored = {
    ...getDefaults(),
    enabled:    s.enabled    ?? false,
    volume:     typeof s.volume    === 'number' ? s.volume    : 0.75,
    keySize:    typeof s.keySize   === 'number' ? s.keySize   : 1.0,
    layout:     s.layout     || 'h',
    showKbHint: s.showKbHint ?? true,
  };

  PAGE_FIELDS.forEach(f => {
    restored[f] = s[f] || {};
    // ลบ b64 ออกจาก localStorage (จะเก็บใน IndexedDB แทน)
    if (f.startsWith('customs')) {
      Object.keys(restored[f]).forEach(k => {
        const entry = restored[f][k];
        if (entry && typeof entry === 'object' && entry.b64) {
          restored[f][k] = { mime: entry.mime, name: entry.name };
        }
      });
    }
  });

  try { localStorage.setItem(STORE_KEY, JSON.stringify(restored)); } catch {}
  try {
    [1, 2, 3, 4].forEach(p => {
      localStorage.setItem(namesKey(email, p), JSON.stringify(data.names?.[p] || {}));
    });
  } catch {}

  // Restore audio ลง IndexedDB
  try {
    const db        = await openDB();
    const audioData = { ...(data.audio || {}) };

    // รองรับ format เก่า (version 2): b64 ที่อยู่ใน settings.customs
    if ((data.version ?? 2) < 3) {
      [1, 2, 3, 4].forEach(p => {
        const field   = pageField('customs', p);
        const customs = s[field] || {};
        Object.entries(customs).forEach(([k, v]) => {
          const idbKey = `${p}_${k}`;
          if (v?.b64 && !audioData[idbKey]) {
            audioData[idbKey] = { b64: v.b64, mime: v.mime, name: v.name };
          }
        });
      });
    }

    for (const [idbKey, clip] of Object.entries(audioData)) {
      if (clip?.b64) {
        try { await idbPut(db, idbKey, clip); } catch {}
      }
    }
  } catch {}

  clearCustomCache();
  return restored;
}
