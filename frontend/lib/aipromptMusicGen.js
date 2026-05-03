// lib/aipromptMusicGen.js — Music generation via Replicate musicgen
//
// ใช้ meta/musicgen on Replicate (official model) — ~$0.005/run · 30s default
// API doc: https://replicate.com/meta/musicgen/api
//
// Auth: Authorization: Token <REPLICATE_API_TOKEN>
//   user สมัครฟรีที่ replicate.com → settings → api tokens
//
// CORS: Replicate API ไม่ส่ง CORS headers → browser เรียกตรงไม่ได้
// → ผ่าน backend proxy ที่ ttsam (/api/aiprompt-music/*) ที่ relay ให้
// → token ของ user ถูก forward ผ่าน Authorization header · ttsam ไม่เก็บ
//
// Flow:
//   1. POST /api/aiprompt-music/predictions  → {id, status, urls: {get, cancel}}
//   2. Poll /api/aiprompt-music/predictions/:id จนได้ status === 'succeeded' (~15-30s)
//   3. result.output = URL ของ mp3 (replicate.delivery)
//   4. fetch via /api/aiprompt-music/audio?url=... → blob → base64 (เก็บใน IndexedDB)

// musicgen-medium = balance speed/quality (ใช้ default ที่ stable)
// ถ้า Replicate update version → แก้ตรงนี้
const MUSICGEN_VERSION = '671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb';

// Backend proxy base — ใช้ NEXT_PUBLIC_BACKEND_URL ถ้ามี ไม่งั้น default localhost:4000
function getProxyBase() {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:4000';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function mapReplicateError(status, body) {
  let msg = '';
  try { msg = JSON.parse(body)?.detail || JSON.parse(body)?.title || ''; } catch {}
  if (status === 401 || status === 403) return 'Replicate token ผิดหรือหมดอายุ';
  if (status === 402)                    return 'Replicate quota หมด — เติมเงินที่ replicate.com/account';
  if (status === 404)                    return 'Replicate model version หาย — โปรดอัพเดท MUSICGEN_VERSION';
  if (status === 429)                    return 'Replicate rate limit — ลองใหม่อีกสักครู่';
  if (status >= 500)                     return `Replicate server error (${status})`;
  return msg || `Replicate HTTP ${status}`;
}

// poll prediction จนกว่าจะ succeeded/failed/canceled (ผ่าน backend proxy)
async function pollPrediction(predictionId, apiToken, onTick) {
  const startedAt = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 นาที max
  const pollUrl = `${getProxyBase()}/api/aiprompt-music/predictions/${encodeURIComponent(predictionId)}`;
  while (true) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      throw new Error('Replicate timeout (รอเกิน 5 นาที)');
    }
    const res = await fetch(pollUrl, {
      headers: { 'Authorization': `Token ${apiToken}` },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(mapReplicateError(res.status, body));
    const data = JSON.parse(body);
    if (typeof onTick === 'function') {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      onTick({ status: data.status, elapsed });
    }
    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate ${data.status}: ${data.error || 'ไม่ทราบสาเหตุ'}`);
    }
    // starting/processing → รอ 2 วินาที แล้ว poll ใหม่
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ── Public ──────────────────────────────────────────────────────────────────

/**
 * Generate music ด้วย meta/musicgen
 * @param {object} args
 * @param {string} args.apiToken     — Replicate API token (Token <token>)
 * @param {string} args.prompt       — text prompt (English เช่น "uplifting cinematic ad music, 120 BPM, soft piano + strings")
 * @param {number} [args.durationSec=30] — 5-30 (medium model max 30s)
 * @param {function} [args.onTick]    — callback({status, elapsed}) ทุก 2 วินาที
 * @returns {Promise<{base64, mimeType, durationSec, prompt, model, generatedAt}>}
 */
export async function generateMusic({ apiToken, prompt, durationSec = 30, onTick }) {
  if (!apiToken)        throw new Error('ยังไม่ได้กรอก Replicate API token');
  if (!prompt?.trim())  throw new Error('Music prompt ว่าง');

  const dur = Math.min(Math.max(5, durationSec | 0), 30);
  const proxyBase = getProxyBase();

  // 1. Create prediction (ผ่าน backend proxy — Replicate ไม่มี CORS)
  const createRes = await fetch(`${proxyBase}/api/aiprompt-music/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiToken}`,
    },
    body: JSON.stringify({
      version: MUSICGEN_VERSION,
      input: {
        prompt: prompt.trim(),
        duration: dur,
        output_format: 'mp3',
        normalization_strategy: 'peak',
      },
    }),
  });
  const createBody = await createRes.text();
  if (!createRes.ok) throw new Error(mapReplicateError(createRes.status, createBody));
  const prediction = JSON.parse(createBody);
  const predictionId = prediction.id;
  if (!predictionId) throw new Error('Replicate ไม่คืน prediction id');

  // 2. Poll (ผ่าน backend proxy)
  const final = await pollPrediction(predictionId, apiToken, onTick);
  let outputUrl = Array.isArray(final.output) ? final.output[0] : final.output;
  if (!outputUrl) throw new Error('Replicate ไม่คืน audio output URL');

  // 3. Fetch mp3 → bytes → base64 (ลอง direct ก่อน · ถ้า CORS ผิด → fallback ผ่าน proxy)
  let audioBuf;
  try {
    const direct = await fetch(outputUrl);
    if (!direct.ok) throw new Error(`direct fetch ${direct.status}`);
    audioBuf = await direct.arrayBuffer();
  } catch (_directErr) {
    // fallback: proxy ผ่าน backend
    const proxied = await fetch(`${proxyBase}/api/aiprompt-music/audio?url=${encodeURIComponent(outputUrl)}`);
    if (!proxied.ok) throw new Error(`ดึงไฟล์เพลงไม่สำเร็จ (proxy ${proxied.status})`);
    audioBuf = await proxied.arrayBuffer();
  }
  const bytes = new Uint8Array(audioBuf);
  const base64 = bytesToB64(bytes);

  return {
    base64,
    mimeType: 'audio/mpeg',
    durationSec: dur,
    prompt: prompt.trim(),
    model: 'meta/musicgen',
    generatedAt: Date.now(),
  };
}

/** เปลี่ยน base64 → Blob URL สำหรับ <audio> */
export function musicBase64ToBlobUrl(base64, mimeType = 'audio/mpeg') {
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/** download mp3 */
export function downloadMusicBase64(base64, filename = 'music.mp3', mimeType = 'audio/mpeg') {
  if (!base64) return;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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
