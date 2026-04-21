// lib/tts.js — Text-to-Speech utility
// Engine 1: Google Cloud TTS (ถ้าผู้ใช้ใส่ API key)
// Engine 2: Web Speech API (fallback ฟรี ไม่ต้อง key)
// Queue-based: ไม่ตัดกัน, กันสแปม, ตั้งค่าได้

const MAX_QUEUE = 8;

let _queue = [];
let _busy  = false;
let _cfg = {
  enabled:      false,
  readChat:     true,
  readGift:     true,
  readFollow:   true,
  rate:         1.0,    // 0.5 – 2.0
  pitch:        1.0,    // 0.0 – 2.0
  volume:       1.0,    // 0.0 – 1.0
  voice:        '',     // Web Speech voice name
  googleApiKey: '',     // Google Cloud TTS API key (เก็บใน localStorage)
  googleVoice:  'th-TH-Neural2-C', // Google voice name
};

// ===== Internal: strip emoji + brackets =====
function _stripEmoji(str) {
  return str
    .replace(/\[.*?\]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ===== Engine 1: Google Cloud TTS =====
async function _speakGoogle(text) {
  const key       = _cfg.googleApiKey;
  const voiceName = _cfg.googleVoice || 'th-TH-Neural2-C';
  const langCode  = voiceName.slice(0, 5); // 'th-TH'

  // Google pitch: semitones (-20 to +20), แปลงจาก 0-2 scale
  const pitchSemitones = Math.round((_cfg.pitch - 1.0) * 10);
  const speakingRate   = Math.max(0.25, Math.min(4.0, _cfg.rate));

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input:       { text },
        voice:       { languageCode: langCode, name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch: pitchSemitones,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const { audioContent } = await res.json();

  return new Promise((resolve, reject) => {
    const audio   = new Audio(`data:audio/mp3;base64,${audioContent}`);
    audio.volume  = Math.max(0, Math.min(1, _cfg.volume));
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('audio play error'));
    audio.play().catch(reject);
  });
}

// ===== Engine 2: Web Speech API =====
function _speakWeb(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();

    const utt   = new SpeechSynthesisUtterance(text);
    utt.rate    = Math.max(0.5, Math.min(2.0, _cfg.rate));
    utt.pitch   = Math.max(0.0, Math.min(2.0, _cfg.pitch));
    utt.volume  = Math.max(0.0, Math.min(1.0, _cfg.volume));

    if (_cfg.voice) {
      const found = window.speechSynthesis.getVoices().find(v => v.name === _cfg.voice);
      if (found) utt.voice = found;
    }

    utt.onend   = () => resolve();
    utt.onerror = () => resolve(); // resolve ต่อ queue แม้ error
    window.speechSynthesis.speak(utt);
  });
}

// ===== Internal: process queue =====
async function _next() {
  if (_busy || _queue.length === 0) return;
  if (typeof window === 'undefined') return;

  _busy = true;
  const text = _queue.shift();

  try {
    if (_cfg.googleApiKey) {
      await _speakGoogle(text);
    } else {
      await _speakWeb(text);
    }
  } catch {
    // ถ้า error ให้ข้ามไปข้อความถัดไป
  } finally {
    _busy = false;
    _next();
  }
}

// ===== Public API =====

/**
 * ตั้งค่า TTS (merge กับค่าเดิม)
 */
export function configureTTS(cfg = {}) {
  _cfg = { ..._cfg, ...cfg };
}

/**
 * อ่านข้อความ (เพิ่มเข้า queue)
 * type: 'chat' | 'gift' | 'follow' | null
 */
export function speak(text, type = null) {
  if (!_cfg.enabled) return;
  if (typeof window === 'undefined') return;
  if (!text || typeof text !== 'string') return;

  if (type === 'chat'   && !_cfg.readChat)   return;
  if (type === 'gift'   && !_cfg.readGift)   return;
  if (type === 'follow' && !_cfg.readFollow) return;

  if (_queue.length >= MAX_QUEUE) return;

  const clean = _stripEmoji(text).slice(0, 200);
  if (!clean) return;

  _queue.push(clean);
  _next();
}

/**
 * ล้าง queue + หยุดพูดทันที
 */
export function clearTTSQueue() {
  _queue = [];
  _busy  = false;
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
}

/**
 * คืน list ของ voices ที่ browser มี (Web Speech)
 */
export function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Subscribe voiceschanged
 */
export function onVoicesReady(callback) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { callback(voices); return () => {}; }
  const handler = () => callback(window.speechSynthesis.getVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

/**
 * Google Cloud TTS voices ภาษาไทยที่รองรับ
 */
export const GOOGLE_THAI_VOICES = [
  { name: 'th-TH-Neural2-C', label: 'Neural2 C (หญิง) — ดีที่สุด',  tier: 'Neural2'   },
  { name: 'th-TH-Wavenet-A', label: 'WaveNet A (หญิง)',              tier: 'WaveNet'   },
  { name: 'th-TH-Wavenet-B', label: 'WaveNet B (ชาย)',               tier: 'WaveNet'   },
  { name: 'th-TH-Wavenet-C', label: 'WaveNet C (หญิง)',              tier: 'WaveNet'   },
  { name: 'th-TH-Wavenet-D', label: 'WaveNet D (ชาย)',               tier: 'WaveNet'   },
  { name: 'th-TH-Standard-A', label: 'Standard A (หญิง) — ธรรมดา', tier: 'Standard'  },
];

/**
 * โหลด / บันทึก Google API key จาก localStorage
 * key ไม่ส่งไป server — เก็บในเครื่อง user เท่านั้น
 */
export function loadGoogleApiKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('ttplus_google_tts_key') || '';
}

export function saveGoogleApiKey(key) {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem('ttplus_google_tts_key', key);
  } else {
    localStorage.removeItem('ttplus_google_tts_key');
  }
}
