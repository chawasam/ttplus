// lib/aipromptImageGen.js — Gemini image generation (Nano Banana / Pro)
//
// ใช้ Gemini API endpoint เดียวกับ text แต่:
//   - model: gemini-2.5-flash-image (Nano Banana 2) หรือ gemini-2.5-pro-image
//   - generationConfig.responseModalities: ['IMAGE']
//
// รับ prompt + reference images (auto-bind จาก slot ตาม "input image #N" ใน prompt)
// → คืน array ของ { dataUrl, mimeType }
//
// "count" variants — เรียก N parallel calls (Gemini image API ยังไม่รองรับ
// candidateCount > 1 ตอนนี้)
//
// 9:16 PORTRAIT — บังคับทุกรูปที่ gen ผ่าน lib นี้ให้เป็น vertical TikTok format
// (Gemini image API ยังไม่มี aspectRatio param → ฝังใน prompt text ตรงๆ)
const PORTRAIT_FORMAT_HEADER =
  '[FORMAT: 9:16 vertical portrait orientation — TikTok/Reels/Shorts standard. ' +
  'Image MUST be tall (portrait), NOT square or landscape. Aspect ratio 9:16 strictly.]\n\n';

// ── Available image models ──────────────────────────────────────────────────

export const MODELS_IMAGE = [
  {
    id: 'gemini-2.5-flash-image',
    label: 'Nano Banana 2 (Flash) — เร็ว / ถูก',
    note: '~$0.04 ต่อรูป',
  },
  {
    id: 'gemini-2.5-flash-image-preview',
    label: 'Nano Banana (Preview) — fallback',
    note: 'ถ้า ID ใหม่ยังไม่ enabled',
  },
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image (Preview) — คุณภาพสูงสุด',
    note: 'แพง / ช้ากว่า · อาจต้องเปิดใช้ใน console',
  },
];

export const DEFAULT_MODEL_IMAGE = 'gemini-2.5-flash-image';

// ── Helpers (duplicated จาก aipromptApi.js เพื่อ keep modules independent) ──

function splitDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

function safeErrorSnippet(bodyText) {
  if (!bodyText) return '';
  try {
    const parsed = JSON.parse(bodyText);
    const msg = parsed?.error?.message || parsed?.message || '';
    return String(msg).slice(0, 160);
  } catch {
    return bodyText.replace(/[A-Za-z0-9_-]{30,}/g, '[redacted]').replace(/\s+/g, ' ').slice(0, 160);
  }
}

function mapHttpError(status, bodyText) {
  if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.error('[image gen error]', status, safeErrorSnippet(bodyText));
  }
  if (status === 401 || status === 403) return 'API key ผิด หรือไม่มีสิทธิ์เรียก image model นี้';
  if (status === 429)                    return 'เรียกถี่เกินไป — รอสักครู่แล้วลองใหม่';
  const snippet = safeErrorSnippet(bodyText);
  if (status === 400)                    return 'คำขอไม่ถูกต้อง' + (snippet ? ': ' + snippet : '');
  if (status >= 500)                     return `Provider ตอบ error (${status}) — ลองใหม่อีกครั้ง`;
  return `เรียก API ไม่สำเร็จ (${status})` + (snippet ? ': ' + snippet : '');
}

// ── Detect slot numbers ที่ปรากฏใน prompt text ─────────────────────────────
// "reference ... from input image #1" → 1
export function detectSlotsInPrompt(promptText) {
  if (!promptText) return [];
  const found = new Set();
  const re = /input image #(\d+)/gi;
  let m;
  while ((m = re.exec(promptText)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 9) found.add(n);
  }
  return Array.from(found).sort((a, b) => a - b);
}

// ── 1 image gen call ────────────────────────────────────────────────────────

async function generateOneImage({ apiKey, model, prompt, referenceImages = [], aspectRatio = '9:16' }) {
  // ใช้ x-goog-api-key header แทน ?key= ใน URL (security)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts = [{ text: prompt }];
  for (const img of referenceImages) {
    const split = splitDataUrl(img.dataUrl);
    if (split) parts.push({ inlineData: { mimeType: split.mimeType, data: split.base64 } });
  }

  // imageConfig.aspectRatio = official Gemini Image API param สำหรับบังคับสัดส่วน
  // (text prompt อย่างเดียวไม่พอ — Nano Banana default 1:1)
  // values: '1:1' | '9:16' | '16:9' | '3:4' | '4:3' | '21:9'
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(mapHttpError(res.status, text));

  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Image API ตอบกลับไม่ใช่ JSON'); }

  const cand = json?.candidates?.[0];
  const imagePart = cand?.content?.parts?.find(p => p?.inlineData?.data);
  if (!imagePart) {
    const reason = cand?.finishReason || cand?.safetyRatings?.[0]?.category || 'unknown';
    throw new Error(`ไม่มีรูปจาก API (finishReason: ${reason})`);
  }

  const { mimeType, data } = imagePart.inlineData;
  return {
    dataUrl: `data:${mimeType || 'image/png'};base64,${data}`,
    mimeType: mimeType || 'image/png',
  };
}

// ── Public: generate N variants in parallel ─────────────────────────────────

/**
 * @param {object} args
 * @param {string} args.apiKey — Gemini API key
 * @param {string} args.model — image model id
 * @param {string} args.prompt — full prompt text
 * @param {Array<{dataUrl,mimeType}>} args.referenceImages — รูปอ้างอิง (slot 1/2/3...)
 * @param {number} args.count — จำนวน variants (default 1, max 4)
 * @returns {Promise<Array<{dataUrl, mimeType, generatedAt, model}>>}
 */
export async function generateShotImage({ apiKey, model, prompt, referenceImages = [], count = 1, aspectRatio = '9:16' }) {
  if (!apiKey)  throw new Error('ยังไม่ได้กรอก API key');
  if (!model)   throw new Error('ยังไม่ได้เลือก image model');
  if (!prompt?.trim()) throw new Error('Prompt ว่าง');
  const n = Math.min(Math.max(1, count | 0), 4);

  // belt-and-suspenders: ใส่ในทั้ง imageConfig.aspectRatio (param API) + prompt header
  // (บาง model variant อาจไม่ honor imageConfig — prompt header ช่วย)
  const finalPrompt = PORTRAIT_FORMAT_HEADER + prompt;

  const calls = Array.from({ length: n }, () =>
    generateOneImage({ apiKey, model, prompt: finalPrompt, referenceImages, aspectRatio }));
  const results = await Promise.allSettled(calls);

  const out = [];
  const errors = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      out.push({
        ...r.value,
        generatedAt: Date.now(),
        model,
      });
    } else {
      errors.push(r.reason);
    }
  }
  if (out.length === 0) {
    throw new Error(errors[0]?.message || 'สร้างรูปไม่สำเร็จทั้งหมด');
  }
  // ถ้า partial fail บางตัว — log แต่ไม่ throw
  if (errors.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `generateShotImage: ${errors.length}/${n} variants failed:`,
      errors.map(e => e?.message || String(e)).slice(0, 5)
    );
  }
  return out;
}
