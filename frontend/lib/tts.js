// lib/tts.js — Text-to-Speech utility (Web Speech API)
// Queue-based: ไม่ตัดกัน, กันสแปม, ตั้งค่าได้

const MAX_QUEUE = 8; // ถ้า queue เต็มแล้ว ให้ทิ้ง (ป้องกันสแปม)

let _queue   = [];
let _busy    = false;
let _cfg = {
  enabled:     false,
  readChat:    true,
  readGift:    true,
  readFollow:  true,
  rate:        1.0,   // 0.5 – 2.0
  pitch:       1.0,   // 0.0 – 2.0
  volume:      1.0,   // 0.0 – 1.0
  voice:       '',    // voice.name จาก getVoices()
};

// ===== Internal: speak next item in queue =====
function _next() {
  if (_busy || _queue.length === 0) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const text = _queue.shift();
  const utt  = new SpeechSynthesisUtterance(text);

  utt.rate   = Math.max(0.5, Math.min(2.0, _cfg.rate));
  utt.pitch  = Math.max(0.0, Math.min(2.0, _cfg.pitch));
  utt.volume = Math.max(0.0, Math.min(1.0, _cfg.volume));

  // หา voice จากชื่อ
  if (_cfg.voice) {
    const voices = window.speechSynthesis.getVoices();
    const found  = voices.find(v => v.name === _cfg.voice);
    if (found) utt.voice = found;
  }

  utt.onend   = () => { _busy = false; _next(); };
  utt.onerror = () => { _busy = false; _next(); };

  _busy = true;
  window.speechSynthesis.speak(utt);
}

// ===== Internal: strip emoji =====
// ลบ emoji และ symbol ออกจากข้อความก่อนอ่าน
function _stripEmoji(str) {
  return str
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ===== Public API =====

/**
 * ตั้งค่า TTS (merge กับค่าเดิม)
 * cfg: { enabled, readChat, readGift, readFollow, rate, pitch, volume, voice }
 */
export function configureTTS(cfg = {}) {
  _cfg = { ..._cfg, ...cfg };
}

/**
 * อ่านข้อความ (เพิ่มเข้า queue)
 * type: 'chat' | 'gift' | 'follow' | null  — ใช้กรองตาม settings
 */
export function speak(text, type = null) {
  if (!_cfg.enabled) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (!text || typeof text !== 'string') return;

  // กรองตาม type
  if (type === 'chat'   && !_cfg.readChat)   return;
  if (type === 'gift'   && !_cfg.readGift)   return;
  if (type === 'follow' && !_cfg.readFollow) return;

  // กันสแปม: ถ้า queue เต็มแล้ว ให้ทิ้ง
  if (_queue.length >= MAX_QUEUE) return;

  const clean = _stripEmoji(text).slice(0, 200);
  if (!clean) return; // ถ้าเหลือแค่ emoji ล้วนๆ ไม่ต้องอ่าน
  _queue.push(clean);
  _next();
}

/**
 * ล้าง queue + หยุดพูดทันที
 */
export function clearTTSQueue() {
  _queue = [];
  _busy  = false;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * คืน list ของ voices ที่ browser มี
 * (ต้อง call ตอน user interaction หรือหลัง voiceschanged event)
 */
export function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Helper: subscribe voiceschanged (เรียก callback เมื่อ voices โหลดเสร็จ)
 * คืน unsubscribe function
 */
export function onVoicesReady(callback) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  // บางทีมี voices อยู่แล้ว
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { callback(voices); return () => {}; }
  // รอ event
  const handler = () => callback(window.speechSynthesis.getVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}
