// lib/tts.js — Text-to-Speech utility
// Engines (auto cascade order):
//   1. Gemini 3.1 TTS  (gemini API key — 30 voices × 10 personas = 300 combo)
//   2. Gemini 2.5 TTS  (same key — fallback)
//   3. Google Cloud TTS (cloud key — Neural Thai voices)
//   4. Web Speech API   (ฟรี fallback ไม่ต้อง key)

// ── Gemini TTS model names ──────────────────────────────────────────────────
// อัปเดตตรงนี้ถ้า Google เปลี่ยนชื่อ model
export const GEMINI_31_MODEL = 'gemini-3.1-flash-tts-preview';
export const GEMINI_25_MODEL = 'gemini-2.5-flash-preview-tts';

const MAX_QUEUE = 8;

let _queue    = [];
let _busy     = false;
let _audioCtx = null;   // shared AudioContext สำหรับ Gemini TTS
let _cfg = {
  enabled:        false,
  readChat:       true,
  readGift:       true,
  readFollow:     true,
  rate:           1.0,
  pitch:          1.0,
  volume:         1.0,
  voice:          '',               // Web Speech voice name
  enabledEngines: ['web'],          // engine ที่เปิดใช้ — ลองตามลำดับ priority (3.1→2.5→google→web)
  googleApiKey:   '',               // Google Cloud TTS key
  googleVoice:    'th-TH-Neural2-C',
  geminiApiKey:   '',               // Google AI Studio / Gemini key (ใช้ได้ทั้ง 3.1 + 2.5)
  geminiVoice:    'Aoede',
  geminiPersona:  '',               // style instruction ฝังใน content text
  geminiShuffle:  false,            // สุ่ม voice+persona ทุกแชท (ใช้กับทั้ง 3.1 + 2.5)
};

// ===== Internal: strip emoji + brackets =====
function _stripEmoji(str) {
  return str
    .replace(/\[.*?\]/g, '')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ===== Engine 1+2: Gemini TTS (3.1 หรือ 2.5 ตาม model param) =====
async function _speakGemini(text, voiceOverride, personaOverride, model = GEMINI_31_MODEL) {
  const key     = _cfg.geminiApiKey;
  const voice   = voiceOverride   ?? _cfg.geminiVoice   ?? 'Aoede';
  const persona = personaOverride ?? _cfg.geminiPersona ?? '';

  // Gemini TTS ไม่รองรับ systemInstruction — model จะพยายาม generate text แทน audio
  // วิธีใส่ persona: ฝัง style instruction ลงใน content text โดยตรง
  const ttsText = persona
    ? `[Speaking style: ${persona}]\n${text}`
    : text;

  const body = {
    contents: [{ parts: [{ text: ttsText }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  };

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

  const mime = (part.mimeType || '').toLowerCase();
  if (process.env.NODE_ENV !== 'production') {
    console.info('[TTsam Gemini] mimeType:', part.mimeType, 'bytes(b64):', part.data.length);
  }

  // decode base64 → Uint8Array
  const binaryStr = atob(part.data);
  const bytes     = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const rateMatch  = mime.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

  // ── Strategy 1: Blob URL + Audio element ──────────────────────────────────
  // ดีกว่า data URI เพราะ browser จัดการ format detection เองได้ดีกว่า
  const blob      = new Blob([bytes], { type: part.mimeType || 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);

  const blobPlayOk = await new Promise((resolve) => {
    const audio   = new Audio(objectUrl);
    audio.volume  = Math.max(0, Math.min(1, _cfg.volume));
    audio.oncanplaythrough = () => { /* ready */ };
    audio.onended  = () => resolve(true);
    audio.onerror  = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });

  URL.revokeObjectURL(objectUrl);
  if (blobPlayOk) return;

  // ── Strategy 2–4: AudioContext fallback ──────────────────────────────────
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();

  let audioBuffer = null;

  // 2: decodeAudioData โดยตรง
  try { audioBuffer = await _audioCtx.decodeAudioData(bytes.buffer.slice(0)); } catch { /* ต่อ */ }

  // 3: ครอบ WAV header (สำหรับ raw L16 PCM)
  if (!audioBuffer) {
    try { audioBuffer = await _audioCtx.decodeAudioData(_pcmToWav(bytes.buffer, sampleRate)); } catch { /* ต่อ */ }
  }

  // 4: แปลง INT16 → Float32 มือ (ultimate fallback)
  if (!audioBuffer) {
    try {
      const off   = (bytes[0] === 0x52 && bytes[1] === 0x49) ? 44 : 0;  // ข้าม RIFF header
      const i16   = new Int16Array(bytes.buffer, off);
      const f32   = new Float32Array(i16.length);
      for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0;
      audioBuffer = _audioCtx.createBuffer(1, f32.length, sampleRate);
      audioBuffer.getChannelData(0).set(f32);
    } catch (e) {
      console.error('[TTsam Gemini] all strategies failed, mime:', part.mimeType, e);
      throw new Error(`Gemini: เล่นเสียงไม่ได้ (${part.mimeType})`);
    }
  }

  return new Promise((resolve) => {
    const source = _audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const gain    = _audioCtx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, _cfg.volume));
    source.connect(gain).connect(_audioCtx.destination);
    source.onended = resolve;
    source.start(0);
  });
}

// ===== Helper: เพิ่ม WAV header ให้ raw LINEAR16 PCM =====
function _pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const dataLen  = pcmBuffer.byteLength;
  const wav      = new ArrayBuffer(44 + dataLen);
  const v        = new DataView(wav);
  const w        = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  w(0,  'RIFF');
  v.setUint32(4,  36 + dataLen, true);
  w(8,  'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);                                              // fmt chunk size
  v.setUint16(20, 1,  true);                                              // PCM = 1
  v.setUint16(22, numChannels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);   // byte rate
  v.setUint16(32, numChannels * bitsPerSample / 8, true);                // block align
  v.setUint16(34, bitsPerSample, true);
  w(36, 'data');
  v.setUint32(40, dataLen, true);
  new Uint8Array(wav, 44).set(new Uint8Array(pcmBuffer));
  return wav;
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
// ลำดับ priority คงที่ — ใช้เฉพาะ engine ที่ user เปิด (enabledEngines)
const ENGINE_PRIORITY = ['gemini31', 'gemini25', 'google', 'web'];

async function _next() {
  if (_busy || _queue.length === 0) return;
  if (typeof window === 'undefined') return;

  _busy = true;
  const text = _queue.shift();

  // เรียง engine ตาม priority คงที่ กรองเฉพาะที่ user เปิด
  const enabled = _cfg.enabledEngines?.length ? _cfg.enabledEngines : ['web'];
  const ordered = ENGINE_PRIORITY.filter(e => enabled.includes(e));

  // สุ่ม voice+persona สำหรับ Gemini ถ้า shuffle เปิด
  let gVoice   = _cfg.geminiVoice;
  let gPersona = _cfg.geminiPersona;
  if (_cfg.geminiShuffle && _cfg.geminiApiKey) {
    gVoice   = GEMINI_VOICES  [Math.floor(Math.random() * GEMINI_VOICES.length)  ].name;
    gPersona = GEMINI_PERSONAS[Math.floor(Math.random() * GEMINI_PERSONAS.length)].instruction;
  }

  // ลอง engine ตามลำดับ — ถ้าล้มเหลวข้ามถัดไปอัตโนมัติ
  for (const eng of ordered) {
    try {
      if      (eng === 'gemini31' && _cfg.geminiApiKey) { await _speakGemini(text, gVoice, gPersona, GEMINI_31_MODEL); break; }
      else if (eng === 'gemini25' && _cfg.geminiApiKey) { await _speakGemini(text, gVoice, gPersona, GEMINI_25_MODEL); break; }
      else if (eng === 'google'   && _cfg.googleApiKey) { await _speakGoogle(text); break; }
      else if (eng === 'web')                           { await _speakWeb(text);   break; }
    } catch { /* cascade → ถัดไป */ }
  }

  _busy = false;
  _next();
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
  { name: 'Aoede',          desc: 'หญิง · นุ่มนวล'        },
  { name: 'Puck',           desc: 'ชาย · ร่าเริง'          },
  { name: 'Charon',         desc: 'ชาย · ทรงพลัง'          },
  { name: 'Kore',           desc: 'หญิง · จริงจัง'         },
  { name: 'Fenrir',         desc: 'ชาย · หนักแน่น'         },
  { name: 'Leda',           desc: 'หญิง · อ่อนโยน'         },
  { name: 'Orus',           desc: 'ชาย · มั่นใจ'           },
  { name: 'Zephyr',         desc: 'ชาย · เบาสบาย'          },
  { name: 'Achird',         desc: 'ชาย · เป็นกันเอง'       },
  { name: 'Algenib',        desc: 'ชาย · เป็นทางการ'       },
  { name: 'Algieba',        desc: 'ชาย · อบอุ่น'           },
  { name: 'Alnilam',        desc: 'ชาย · หนักแน่นมั่นคง'   },
  { name: 'Achernar',       desc: 'หญิง · อ่อนโยนนุ่มนวล'  },
  { name: 'Autonoe',        desc: 'หญิง · สดใสมีชีวิตชีวา' },
  { name: 'Callirrhoe',     desc: 'หญิง · ผ่อนคลายเป็นกันเอง' },
  { name: 'Despina',        desc: 'หญิง · เบาบาง'          },
  { name: 'Enceladus',      desc: 'ชาย · เงียบสงบ'         },
  { name: 'Erinome',        desc: 'หญิง · ละเอียดอ่อน'     },
  { name: 'Gacrux',         desc: 'ชาย · กังวาน'           },
  { name: 'Iapetus',        desc: 'ชาย · ชัดเจนกระชับ'     },
  { name: 'Laomedeia',      desc: 'หญิง · สุภาพ'           },
  { name: 'Pulcherrima',    desc: 'หญิง · แสดงออกสดใส'     },
  { name: 'Rasalgethi',     desc: 'ชาย · เป็นทางการมืออาชีพ' },
  { name: 'Sadachbia',      desc: 'ชาย · มีชีวิตชีวา'      },
  { name: 'Sadaltager',     desc: 'ชาย · มีความรู้น้ำเสียงดี' },
  { name: 'Schedar',        desc: 'ชาย · เข้มแข็ง'         },
  { name: 'Sulafat',        desc: 'หญิง · นุ่มนวล'         },
  { name: 'Umbriel',        desc: 'ชาย · ลึก'              },
  { name: 'Vindemiatrix',   desc: 'หญิง · สดใส'            },
  { name: 'Zubenelgenubi',  desc: 'ชาย · สบายๆ เป็นกันเอง' },
];

// ===== Gemini personas (speaking styles) =====
export const GEMINI_PERSONAS = [
  { id: 'mouth',      label: '🍬 อมของอยู่ในปาก',    instruction: '[muffled] Speak as if you have something large in your mouth — muffled, slurred, lips barely moving, words come out unclear and garbled.' },
  { id: 'sleepy',     label: '😴 เพิ่งตื่นนอน',      instruction: 'Speak as if you just woke up and are very groggy and half-asleep. Slur your words slightly, speak slowly, sound exhausted.' },
  { id: 'lazy',       label: '🛋️ ขี้เกียจ',          instruction: 'Speak in the most lazy, unenthusiastic, monotone way possible, as if you cannot be bothered to care about anything.' },
  { id: 'annoyed',    label: '😒 กวนตีน',             instruction: 'Speak in a slightly snarky, mischievous, and teasing tone, like you are casually trolling someone.' },
  { id: 'bored',      label: '🥱 เบื่อมาก',           instruction: 'Speak as if you are extremely bored and have zero interest in what you are saying. Flat, slow, lifeless.' },
  { id: 'hungry',     label: '🍜 หิวข้าว',            instruction: 'Speak as if you are very hungry and distracted, occasionally sounding like you are thinking about food.' },
  { id: 'dramatic',   label: '🎭 ดราม่า',              instruction: 'Speak dramatically with extreme emotion and expression, as if everything is a life-or-death situation.' },
  { id: 'excited',    label: '🎉 ตื่นเต้น',           instruction: 'Speak with very high energy and excitement, like you just won the lottery.' },
  { id: 'oldman',     label: '👴 คนแก่เคี้ยวหมาก',   instruction: 'Speak like a very old Thai person slowly chewing betel nut — gravelly raspy voice, slow mumbling pace, pausing mid-sentence, teeth sound missing, warm but very aged.' },
  { id: 'cute',       label: '🐱 น่ารักมาก',          instruction: 'Speak in an extremely cute, bubbly, and sweet tone, like an anime character.' },
];

/**
 * สุ่ม voice + persona combination (30 × 10 = 300 แบบ)
 */
export function randomGeminiCombo() {
  const voice   = GEMINI_VOICES[Math.floor(Math.random() * GEMINI_VOICES.length)];
  const persona = GEMINI_PERSONAS[Math.floor(Math.random() * GEMINI_PERSONAS.length)];
  return { voice: voice.name, persona: persona.instruction, voiceObj: voice, personaObj: persona };
}

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
// โหลด engine list — backward compat กับ format เก่า (single string)
export function loadEnabledEngines() {
  if (typeof window === 'undefined') return ['web'];
  try {
    const saved = localStorage.getItem('ttplus_enabled_engines');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // แปลง format เก่า (single engine string) → array
  const old = localStorage.getItem('ttplus_tts_engine') || 'web';
  if (old === 'auto') return ['gemini31', 'gemini25', 'google', 'web'];
  if (old !== 'web') return [old, 'web'];
  return ['web'];
}
export function saveEnabledEngines(engines) {
  if (typeof window === 'undefined') return;
  if (Array.isArray(engines) && engines.length > 0) {
    localStorage.setItem('ttplus_enabled_engines', JSON.stringify(engines));
  }
}

/**
 * ทดสอบ engine โดยตรง — ไม่ผ่าน queue ได้ error จริง
 * engine: 'gemini31' | 'gemini25' | 'google' | 'web'
 */
export async function speakDirect(engine, text) {
  if (typeof window === 'undefined') return;
  const clean = _stripEmoji(text).slice(0, 200);
  if (!clean) throw new Error('ข้อความว่างเปล่า');
  switch (engine) {
    case 'gemini31': return _speakGemini(clean, _cfg.geminiVoice, _cfg.geminiPersona, GEMINI_31_MODEL);
    case 'gemini25': return _speakGemini(clean, _cfg.geminiVoice, _cfg.geminiPersona, GEMINI_25_MODEL);
    case 'gemini':   return _speakGemini(clean, _cfg.geminiVoice, _cfg.geminiPersona, GEMINI_31_MODEL); // backward compat
    case 'google':   return _speakGoogle(clean);
    case 'web':      return _speakWeb(clean);
    default: throw new Error(`unknown engine: ${engine}`);
  }
}

export function loadGeminiApiKey()     { return typeof window !== 'undefined' ? localStorage.getItem('ttplus_gemini_tts_key')    || '' : ''; }
export function saveGeminiApiKey(k)    { if (typeof window === 'undefined') return; k ? localStorage.setItem('ttplus_gemini_tts_key', k)    : localStorage.removeItem('ttplus_gemini_tts_key'); }
export function loadGeminiShuffle()    { return typeof window !== 'undefined' ? localStorage.getItem('ttplus_gemini_shuffle') === '1' : false; }
export function saveGeminiShuffle(on)  { if (typeof window === 'undefined') return; on ? localStorage.setItem('ttplus_gemini_shuffle', '1') : localStorage.removeItem('ttplus_gemini_shuffle'); }
