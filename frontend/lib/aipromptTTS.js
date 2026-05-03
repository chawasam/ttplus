// lib/aipromptTTS.js — Gemini TTS narration synthesizer (สำหรับ /aiprompt Stage 6)
//
// แยกจาก lib/tts.js เพราะ:
//   - lib/tts.js เป็น production code ใช้กับ chat-reading TTS (เสี่ยงพังถ้าแก้)
//   - lib นี้คืน audio bytes (base64) แทนการเล่นเสียงทันที → เอาไปเก็บใน IndexedDB
//     กับ playback/download ใน UI ของ aiprompt
//
// Gemini TTS endpoint = generateContent ปกติ + responseModalities: ['AUDIO']
// Response inlineData.data คือ raw PCM (16-bit signed LE) → ต้อง wrap WAV header เอง

import { GEMINI_31_MODEL, GEMINI_25_MODEL } from './tts.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

// base64 → Uint8Array
function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Uint8Array → base64
function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// สร้าง WAV header สำหรับ raw PCM 16-bit mono
// rationale: Gemini TTS คืน PCM ดิบ (audio/L16 หรือ audio/wav;rate=24000) → ต้อง wrap RIFF เอง
function wrapPcmAsWav(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const dataSize = pcmBytes.length;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const headerSize = 44;
  const wav = new Uint8Array(headerSize + dataSize);
  const dv = new DataView(wav.buffer);

  // RIFF header
  wav[0] = 0x52; wav[1] = 0x49; wav[2] = 0x46; wav[3] = 0x46;       // "RIFF"
  dv.setUint32(4, 36 + dataSize, true);                              // file size - 8
  wav[8] = 0x57; wav[9] = 0x41; wav[10] = 0x56; wav[11] = 0x45;     // "WAVE"

  // fmt chunk
  wav[12] = 0x66; wav[13] = 0x6d; wav[14] = 0x74; wav[15] = 0x20;   // "fmt "
  dv.setUint32(16, 16, true);                                        // fmt chunk size
  dv.setUint16(20, 1, true);                                         // PCM format
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);

  // data chunk
  wav[36] = 0x64; wav[37] = 0x61; wav[38] = 0x74; wav[39] = 0x61;   // "data"
  dv.setUint32(40, dataSize, true);
  wav.set(pcmBytes, headerSize);

  return wav;
}

// parse rate=NNNNN จาก mimeType เช่น "audio/L16;rate=24000"
function extractSampleRate(mime, fallback = 24000) {
  const m = (mime || '').match(/rate=(\d+)/i);
  return m ? parseInt(m[1], 10) : fallback;
}

// HTTP error → readable Thai message
function mapTtsError(status, bodyText) {
  let msg = '';
  try { msg = JSON.parse(bodyText)?.error?.message || ''; } catch {}
  if (status === 400) return msg || 'TTS API บอกว่า request ไม่ถูกต้อง';
  if (status === 401 || status === 403) return 'API key ไม่ถูกต้องหรือยังไม่เปิด TTS API ใน Google Cloud Console';
  if (status === 404) return 'TTS model นี้ไม่พบ — Gemini อาจเปลี่ยนชื่อ model';
  if (status === 429) return 'Quota หมดหรือถูก rate-limit (เรียกถี่เกินไป)';
  if (status >= 500) return `TTS provider ตอบ error (${status}) — ลองใหม่อีกครั้ง`;
  return msg || `TTS API HTTP ${status}`;
}

// ── 1 TTS call ───────────────────────────────────────────────────────────────

async function callGeminiTts({ apiKey, model, text }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            // voice ฝังใน text แล้ว — แต่ Gemini TTS ต้องระบุที่ speechConfig ด้วย
            // ↓ จะถูก override โดย caller ผ่าน body merging
          },
        },
      },
    },
  };

  // ใส่ voice ตอนเรียกจริง (sync กับ pattern ใน lib/tts.js)
  // ฟังก์ชันนี้รับ voice ผ่าน arg ภายนอก → caller จะ build body เอง

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(mapTtsError(res.status, txt));

  let json;
  try { json = JSON.parse(txt); } catch { throw new Error('TTS API ตอบกลับไม่ใช่ JSON'); }

  const part = json?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
  if (!part) {
    const reason = json?.candidates?.[0]?.finishReason || 'unknown';
    throw new Error(`ไม่มี audio ในผลลัพธ์ (finishReason: ${reason})`);
  }
  return { mimeType: part.inlineData.mimeType || '', data: part.inlineData.data };
}

// ── Public: synthesize narration ─────────────────────────────────────────────

/**
 * @param {object} args
 * @param {string} args.apiKey  — Gemini API key
 * @param {string} args.script  — บทพากย์ (ไทย/อังกฤษ)
 * @param {string} [args.voice='Aoede']   — ชื่อ voice จาก GEMINI_VOICES
 * @param {string} [args.persona='']      — persona instruction (จาก GEMINI_PERSONAS) หรือ ''
 * @param {string} [args.model]           — ค่า default = GEMINI_31_MODEL, fallback ไป 25
 * @returns {Promise<{ base64: string, mimeType: string, durationSec: number, model: string }>}
 */
export async function synthesizeNarration({ apiKey, script, voice = 'Aoede', persona = '', model }) {
  if (!apiKey)        throw new Error('ยังไม่ได้กรอก Gemini API key');
  if (!script?.trim()) throw new Error('Script ว่าง');

  const ttsText = persona ? `[Speaking style: ${persona}]\n${script}` : script;
  const tryModels = model ? [model] : [GEMINI_31_MODEL, GEMINI_25_MODEL];

  let lastErr;
  for (const m of tryModels) {
    try {
      // Build body inline (override speechConfig.voiceConfig ทุกครั้ง)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
      const body = {
        contents: [{ parts: [{ text: ttsText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
      const txt = await res.text();
      if (!res.ok) {
        // 404 → ลอง model ถัดไป
        if (res.status === 404 && tryModels.length > 1) { lastErr = new Error(mapTtsError(404, txt)); continue; }
        throw new Error(mapTtsError(res.status, txt));
      }
      const json = JSON.parse(txt);
      const part = json?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
      if (!part) {
        const reason = json?.candidates?.[0]?.finishReason || 'unknown';
        throw new Error(`ไม่มี audio ในผลลัพธ์ (finishReason: ${reason})`);
      }

      const mime = (part.inlineData.mimeType || '').toLowerCase();
      const sampleRate = extractSampleRate(mime, 24000);
      const rawBytes = b64ToBytes(part.inlineData.data);

      // Gemini ส่ง PCM ดิบ (audio/L16 หรือ audio/wav;rate=...) → wrap WAV header
      // ถ้า mimeType มี "wav" และ bytes ขึ้นต้น "RIFF" ก็ไม่ต้อง wrap
      const isAlreadyWav = mime.includes('wav')
        && rawBytes.length >= 4
        && rawBytes[0] === 0x52 && rawBytes[1] === 0x49
        && rawBytes[2] === 0x46 && rawBytes[3] === 0x46;
      const wavBytes = isAlreadyWav ? rawBytes : wrapPcmAsWav(rawBytes, sampleRate);

      const durationSec = isAlreadyWav
        ? (rawBytes.length - 44) / (sampleRate * 2)   // 16-bit mono
        : rawBytes.length / (sampleRate * 2);

      return {
        base64: bytesToB64(wavBytes),
        mimeType: 'audio/wav',
        durationSec: Math.max(0, durationSec),
        model: m,
      };
    } catch (e) {
      lastErr = e;
      // ถ้า error 404 ลอง model ถัดไปแล้ว — ถ้ายังเหลือ model
      if (/404|model.*not found/i.test(e.message) && tryModels.length > 1) continue;
      throw e;
    }
  }
  throw lastErr || new Error('TTS ล้มเหลวทุก model');
}

// ── Helpers สำหรับ UI ────────────────────────────────────────────────────────

/** decode base64 (.wav) → Blob URL สำหรับ <audio src=...> */
export function audioBase64ToBlobUrl(base64, mimeType = 'audio/wav') {
  if (!base64) return null;
  const bytes = b64ToBytes(base64);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** trigger download ของ base64 audio */
export function downloadAudioBase64(base64, filename = 'narration.wav', mimeType = 'audio/wav') {
  if (!base64) return;
  const bytes = b64ToBytes(base64);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
