// lib/tts.js — Text-to-Speech utility
// Priority:
//   Engine 1: Gemini TTS  (gemini API key — 30 voices × personas)
//   Engine 2: Google Cloud TTS (cloud API key — Neural Thai voices)
//   Engine 3: Web Speech API (ฟรี fallback ไม่ต้อง key)

const MAX_QUEUE = 8;

let _queue = [];
let _busy  = false;
let _cfg = {
  enabled:       false,
  readChat:      true,
  readGift:      true,
  readFollow:    true,
  rate:          1.0,
  pitch:         1.0,
  volume:        1.0,
  voice:         '',               // Web Speech voice name
  googleApiKey:  '',               // Google Cloud TTS key
  googleVoice:   'th-TH-Neural2-C',
  geminiApiKey:  '',               // Google AI Studio / Gemini key
  geminiVoice:   'Aoede',
  geminiPersona: '',               // system instruction สำหรับ persona
};

// ===== Internal: strip emoji + brackets =====
function _stripEmoji(str) {
  return str
    .replace(/\[.*?\]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ===== Engine 1: Gemini TTS =====
async function _speakGemini(text) {
  const key      = _cfg.geminiApiKey;
  const voice    = _cfg.geminiVoice  || 'Aoede';
  const persona  = _cfg.geminiPersona || '';
  const model    = 'gemini-2.5-flash-preview-tts';

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  };

  if (persona) {
    body.systemInstruction = { parts: [{ text: persona }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }

  const data      = await res.json();
  const part      = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('Gemini: ไม่มี audio ในผลลัพธ์');

  return new Promise((resolve, reject) => {
    const audio   = new Audio(`data:${part.mimeType};base64,${part.data}`);
    audio.volume  = Math.max(0, Math.min(1, _cfg.volume));
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('audio play error'));
    audio.play().catch(reject);
  });
}

// ===== Engine 2: Google Cloud TTS =====
async function _speakGoogle(text) {
  const key       = _cfg.googleApiKey;
  const voiceName = _cfg.googleVoice || 'th-TH-Neural2-C';
  const langCode  = voiceName.slice(0, 5);
  const pitchSemi = Math.round((_cfg.pitch - 1.0) * 10);
  const rate      = Math.max(0.25, Math.min(4.0, _cfg.rate));

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input:       { text },
        voice:       { languageCode: langCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: rate, pitch: pitchSemi },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google HTTP ${res.status}`);
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

// ===== Engine 3: Web Speech API =====
function _speakWeb(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = Math.max(0.5, Math.min(2.0, _cfg.rate));
    utt.pitch  = Math.max(0.0, Math.min(2.0, _cfg.pitch));
    utt.volume = Math.max(0.0, Math.min(1.0, _cfg.volume));
    if (_cfg.voice) {
      const found = window.speechSynthesis.getVoices().find(v => v.name === _cfg.voice);
      if (found) utt.voice = found;
    }
    utt.onend   = () => resolve();
    utt.onerror = () => resolve();
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
    if (_cfg.geminiApiKey) {
      await _speakGemini(text);
    } else if (_cfg.googleApiKey) {
      await _speakGoogle(text);
    } else {
      await _speakWeb(text);
    }
  } catch {
    // ข้ามไปข้อความถัดไปถ้า error
  } finally {
    _busy = false;
    _next();
  }
}

// ===== Public API =====

export function configureTTS(cfg = {}) {
  _cfg = { ..._cfg, ...cfg };
}

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

export function clearTTSQueue() {
  _queue = [];
  _busy  = false;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

export function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function onVoicesReady(callback) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {};
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { callback(voices); return () => {}; }
  const handler = () => callback(window.speechSynthesis.getVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

// ===== Gemini voices (30 prebuilt) =====
export const GEMINI_VOICES = [
  { name: 'Aoede',       desc: 'หญิง · นุ่มนวล'     },
  { name: 'Puck',        desc: 'ชาย · ร่าเริง'       },
  { name: 'Charon',      desc: 'ชาย · ทรงพลัง'       },
  { name: 'Kore',        desc: 'หญิง · จริงจัง'      },
  { name: 'Fenrir',      desc: 'ชาย · หนักแน่น'      },
  { name: 'Leda',        desc: 'หญิง · อ่อนโยน'      },
  { name: 'Orus',        desc: 'ชาย · มั่นใจ'        },
  { name: 'Zephyr',      desc: 'ชาย · เบาสบาย'       },
  { name: 'Achird',      desc: 'ชาย · เป็นกันเอง'    },
  { name: 'Algenib',     desc: 'ชาย · เป็นทางการ'    },
  { name: 'Algieba',     desc: 'ชาย · อบอุ่น'        },
  { name: 'Alnair',      desc: 'หญิง · ชัดเจน'       },
  { name: 'Auva',        desc: 'หญิง · อ่อนหวาน'     },
  { name: 'Caliban',     desc: 'ชาย · ลึกซึ้ง'       },
  { name: 'Capella',     desc: 'หญิง · สดใส'         },
  { name: 'Despina',     desc: 'หญิง · เบาบาง'       },
  { name: 'Enceladus',   desc: 'ชาย · เงียบสงบ'      },
  { name: 'Erinome',     desc: 'หญิง · ละเอียดอ่อน'  },
  { name: 'Gacrux',      desc: 'ชาย · กังวาน'        },
  { name: 'Iocaste',     desc: 'หญิง · อบอุ่น'       },
  { name: 'Izar',        desc: 'ชาย · ชัดเจน'        },
  { name: 'Laomedeia',   desc: 'หญิง · สุภาพ'        },
  { name: 'Rasalas',     desc: 'ชาย · หนักแน่น'      },
  { name: 'Sadachbia',   desc: 'ชาย · เบาสบาย'       },
  { name: 'Schedar',     desc: 'ชาย · เข้มแข็ง'      },
  { name: 'Sulafat',     desc: 'หญิง · นุ่มนวล'      },
  { name: 'Umbriel',     desc: 'ชาย · ลึก'           },
  { name: 'Vindemiatrix',desc: 'หญิง · สดใส'         },
  { name: 'Wasat',       desc: 'ชาย · เป็นกันเอง'    },
  { name: 'Yildun',      desc: 'ชาย · มีพลัง'        },
];

// ===== Gemini personas (speaking styles) =====
export const GEMINI_PERSONAS = [
  { id: '',          label: '😐 ปกติ',          instruction: '' },
  { id: 'cheerful',  label: '😄 สนุกสนาน',      instruction: 'Speak in a cheerful, warm, and friendly tone.' },
  { id: 'excited',   label: '🎉 กระตือรือร้น',  instruction: 'Speak with high energy and excitement, like you are very enthusiastic.' },
  { id: 'soft',      label: '🌸 นุ่มนวล',       instruction: 'Speak in a soft, gentle, and calming voice.' },
  { id: 'formal',    label: '👔 เป็นทางการ',     instruction: 'Speak in a formal, professional, and clear tone.' },
  { id: 'dramatic',  label: '🎭 ดราม่า',         instruction: 'Speak dramatically with lots of emotion and expression.' },
  { id: 'funny',     label: '😂 ตลก',            instruction: 'Speak in a playful, humorous tone, like a comedian.' },
  { id: 'news',      label: '📰 ข่าว',           instruction: 'Speak like a news anchor — clear, authoritative, and neutral.' },
  { id: 'cute',      label: '🐱 น่ารัก',         instruction: 'Speak in a cute, bubbly, and innocent tone.' },
  { id: 'whisper',   label: '🤫 กระซิบ',         instruction: 'Speak in a soft whisper, as if sharing a secret.' },
];

// ===== Google Cloud TTS voices =====
export const GOOGLE_THAI_VOICES = [
  { name: 'th-TH-Neural2-C', label: 'Neural2 C (หญิง) — ดีที่สุด', tier: 'Neural2'  },
  { name: 'th-TH-Wavenet-A', label: 'WaveNet A (หญิง)',             tier: 'WaveNet'  },
  { name: 'th-TH-Wavenet-B', label: 'WaveNet B (ชาย)',              tier: 'WaveNet'  },
  { name: 'th-TH-Wavenet-C', label: 'WaveNet C (หญิง)',             tier: 'WaveNet'  },
  { name: 'th-TH-Wavenet-D', label: 'WaveNet D (ชาย)',              tier: 'WaveNet'  },
  { name: 'th-TH-Standard-A',label: 'Standard A (หญิง)',            tier: 'Standard' },
];

// ===== localStorage helpers (key ไม่ผ่าน server) =====
export function loadGoogleApiKey()   { return typeof window !== 'undefined' ? localStorage.getItem('ttplus_google_tts_key')  || '' : ''; }
export function saveGoogleApiKey(k)  { if (typeof window === 'undefined') return; k ? localStorage.setItem('ttplus_google_tts_key', k)  : localStorage.removeItem('ttplus_google_tts_key'); }
export function loadGeminiApiKey()   { return typeof window !== 'undefined' ? localStorage.getItem('ttplus_gemini_tts_key')  || '' : ''; }
export function saveGeminiApiKey(k)  { if (typeof window === 'undefined') return; k ? localStorage.setItem('ttplus_gemini_tts_key', k)  : localStorage.removeItem('ttplus_gemini_tts_key'); }
