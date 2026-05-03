// lib/aipromptApi.js — Gemini + Claude clients + prompt builders
// เรียก provider ตรงจาก browser — ไม่ผ่าน backend
//
// dataUrl format: "data:image/jpeg;base64,XXXX..."
// → ต้อง split เป็น { mimeType, base64 } ก่อนส่ง

// ── Provider model lists ─────────────────────────────────────────────────────

export const MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default — เร็ว, ถูก, ฟรี tier)' },
    { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (เก่งสุด, แพงกว่า ~16x)' },
  ],
  claude: [
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (สมดุล)' },
    { id: 'claude-opus-4-1-20250805',   label: 'Claude Opus 4.1 (เก่งสุด, แพงกว่า)' },
  ],
};

export const DEFAULT_MODEL = {
  gemini: 'gemini-2.5-flash',           // เปลี่ยนจาก pro → flash (ถูกกว่า ~16x)
  claude: 'claude-sonnet-4-5-20250929',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

function safeErrorSnippet(bodyText) {
  // ดึงแค่ message ของ error (ถ้า provider คืน JSON) ไม่ลีก stack/key/quota
  if (!bodyText) return '';
  try {
    const parsed = JSON.parse(bodyText);
    const msg = parsed?.error?.message || parsed?.message || '';
    return String(msg).slice(0, 160);
  } catch {
    // plain text — ตัดสั้นๆ + remove anything that looks like a key/token
    return bodyText
      .replace(/[A-Za-z0-9_-]{30,}/g, '[redacted]')
      .replace(/\s+/g, ' ')
      .slice(0, 160);
  }
}

function mapHttpError(status, bodyText) {
  // Log only sanitized snippet — bodyText อาจมี project ID / quota detail / token-like substring
  if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.error('[ai api error]', status, safeErrorSnippet(bodyText));
  }
  if (status === 401 || status === 403) return 'API key ผิด หรือไม่มีสิทธิ์เรียก model นี้';
  if (status === 429)                    return 'เรียกถี่เกินไป — รอสักครู่แล้วลองใหม่';
  const snippet = safeErrorSnippet(bodyText);
  if (status === 400)                    return 'คำขอไม่ถูกต้อง' + (snippet ? ': ' + snippet : '');
  if (status >= 500)                     return `Provider ตอบ error (${status}) — ลองใหม่อีกครั้ง`;
  return `เรียก API ไม่สำเร็จ (${status})` + (snippet ? ': ' + snippet : '');
}

function stripJsonFence(text) {
  if (!text) return text;
  // Claude มักห่อด้วย ```json ... ``` หรือ ``` ... ```
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return m ? m[1].trim() : text.trim();
}

// ── Public: Test API key (cheap call) ────────────────────────────────────────
//
// ทดสอบว่า key ถูกต้องเรียก provider ได้ก่อน user เริ่มใช้งานจริง
// - gemini: GET /v1beta/models?pageSize=1  (ไม่เปลือง quota เลย ฟรี)
// - claude: POST /v1/messages with max_tokens=1 + 1-token prompt (~$0.000003)
export async function testApiKey({ provider, apiKey }) {
  if (!apiKey?.trim()) throw new Error('ใส่ key ก่อน');
  if (provider === 'gemini') {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(mapHttpError(res.status, text));
    return { ok: true, provider: 'gemini' };
  }
  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(mapHttpError(res.status, text));
    return { ok: true, provider: 'claude' };
  }
  throw new Error(`provider ไม่รู้จัก: ${provider}`);
}

// ── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini({ apiKey, model, system, userText, images = [], expectJson, schema }) {
  // ใช้ x-goog-api-key header แทน ?key= ใน URL (ไม่ leak ใน Network tab / referrer / extension log)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const parts = [{ text: userText }];
  for (const img of images) {
    const split = splitDataUrl(img.dataUrl);
    if (split) parts.push({ inlineData: { mimeType: split.mimeType, data: split.base64 } });
  }

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 8192,
      ...(expectJson
        ? { responseMimeType: 'application/json', ...(schema ? { responseSchema: schema } : {}) }
        : {}),
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
  try { json = JSON.parse(text); } catch { throw new Error('Gemini ตอบกลับมาไม่ใช่ JSON'); }
  const out = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
  if (!out) {
    const reason = json?.candidates?.[0]?.finishReason || 'unknown';
    throw new Error('Gemini ไม่ได้ตอบเนื้อหา (finishReason: ' + reason + ')');
  }
  return out;
}

// ── Claude call ──────────────────────────────────────────────────────────────

async function callClaude({ apiKey, model, system, userText, images = [] }) {
  const content = [];
  // Claude วาง image ก่อน text แนะนำใน docs
  for (const img of images) {
    const split = splitDataUrl(img.dataUrl);
    if (split) content.push({ type: 'image', source: { type: 'base64', media_type: split.mimeType, data: split.base64 } });
  }
  content.push({ type: 'text', text: userText });

  const body = {
    model,
    max_tokens: 4096,
    temperature: 0.85,
    system,
    messages: [{ role: 'user', content }],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(mapHttpError(res.status, text));

  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Claude ตอบกลับมาไม่ใช่ JSON'); }
  const out = json?.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') || '';
  if (!out) throw new Error('Claude ไม่ได้ตอบเนื้อหา');
  return out;
}

// ── Unified caller ──────────────────────────────────────────────────────────

async function callAi({ provider, model, apiKey, system, userText, images = [], expectJson, schema }) {
  if (!apiKey) throw new Error('ยังไม่ได้กรอก API key');
  if (!model)  throw new Error('ยังไม่ได้เลือก model');

  if (provider === 'gemini') {
    return callGemini({ apiKey, model, system, userText, images, expectJson, schema });
  }
  if (provider === 'claude') {
    return callClaude({ apiKey, model, system, userText, images });
  }
  throw new Error('Provider ไม่รู้จัก: ' + provider);
}

// ── JSON parsing helper ─────────────────────────────────────────────────────

function parseJsonStrict(raw) {
  const cleaned = stripJsonFence(raw);
  try { return JSON.parse(cleaned); }
  catch (e) {
    // ลองหา {...} ก้อนใหญ่สุดใน text
    const m = /\{[\s\S]*\}/.exec(cleaned);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw new Error('Parse JSON ไม่ได้: ' + e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage A — Brief → Image Prompts
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_IMAGE_PROMPTS = {
  type: 'object',
  properties: {
    shots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:  { type: 'integer' },
          prompt: { type: 'string' },
        },
        required: ['index', 'prompt'],
      },
    },
  },
  required: ['shots'],
};

function buildImageSystem({ shotCount, styleBlock }) {
  return `You are a creative director crafting prompts for an AI image generator (e.g. Midjourney, Nano Banana, Imagen, Stable Diffusion) that supports multi-image input. The end goal is a ~${shotCount * 6}-second product advertisement video, assembled from ${shotCount} shots (~6 seconds each, generated by AI video tools that need a still image as start/end frame).

Your job: produce ${shotCount} IMAGE prompts (one per shot) that form a coherent visual narrative for the brief below.

PROMPT STRUCTURE — every prompt must include all 5 elements as one rich, comma-separated paragraph (English):
1. Image type (cinematic advertising photography is the default for this project)
2. Subject + Object (person/animal/thing + key descriptive details — keep PRODUCT appearance EXACTLY consistent across all shots)
3. Action / Scene (pose, location, what is happening)
4. Style / Mood / Lighting
5. Camera angle / camera type / F-stop / bokeh / lens

STYLE BLOCK — append this verbatim at the end of every prompt:
"${styleBlock}"

REFERENCE-IMAGE PLACEHOLDER CONVENTION (CRITICAL — ALWAYS APPLY):
The downstream image generator accepts up to 3 numbered reference images at fixed positions:
- #1 = product reference
- #2 = product size-scale reference
- #3 = model identity reference

You MUST include all 3 placeholder phrases naturally in EVERY prompt, regardless of whether the user attached references in this tool. The exact substrings to include verbatim:
- "reference the product appearance from input image #1"
- "reference the product size scale from input image #2"
- "reference the model identity from input image #3"

The user can manually delete any phrase they don't need from a prompt — your job is to ALWAYS emit all 3.

WHEN A REFERENCE IS ATTACHED HERE (you can see it via vision):
- ALSO describe what you see (e.g. product color/shape/labeling, model age/hair/build, size context) IN ADDITION to the placeholder phrase. The phrase tells the downstream tool which slot to use; the description tells it what to render.
- Example with attached product: "...a sleek matte-white serum bottle with gold cap and minimalist black label (reference the product appearance from input image #1)..."

WHEN A REFERENCE IS NOT ATTACHED:
- Just emit the placeholder phrase without inventing details. The user will upload that reference at the matching position in their image generator.
- Example without attached product: "...the product (reference the product appearance from input image #1)..."

NO TEXT IN IMAGE — HARD RULE (read carefully):
AI image generators render text/letters/numbers very poorly (gibberish, misspelled words). NEVER ask the image generator to draw any of:
- text, letters, words, numbers, written content
- captions, titles, subtitles, name tags
- signs, billboards, posters with readable text
- watermarks, logos containing text
- product labels with readable typography (the product CAN have a label, but describe it as "stylized abstract label" / "minimalist non-readable label" / "blurred packaging text")
- speech bubbles, dialogue, on-screen text overlays

Even if the user's brief mentions text (e.g. "with the brand name visible", "with a banner saying SALE"), you must IGNORE that text request and produce a purely visual scene. Text overlays will be added in post-production.

You MUST include an explicit no-text instruction in EVERY prompt — phrase it as one of:
- "no text, no letters, no readable typography anywhere in the image"
- "completely text-free composition"
- "avoid any rendered text, numbers, or readable signage"
Pick one of these phrasings (or natural variants) and include it in every shot prompt.

RULES:
- Generate exactly ${shotCount} prompts (no more, no less).
- Prompts must be in English.
- Each prompt should be a single paragraph (no line breaks, no numbered lists inside the prompt).
- ALWAYS include all 3 reference phrases in every prompt — even if the user attached the corresponding reference here.
- Vary camera angles and compositions across shots to keep the edit dynamic.

OUTPUT FORMAT — strictly JSON, no prose, no markdown:
{
  "shots": [
    { "index": 1, "prompt": "..." },
    { "index": 2, "prompt": "..." }
  ]
}`;
}

function buildImageUserText({ brief, modelMode, modelText, hasProductImages, hasSizeRefImages, hasModelImages }) {
  const lines = [];
  lines.push('=== BRIEF FROM CLIENT (Thai) ===');
  lines.push(brief || '(no brief provided)');

  // REFERENCE SLOTS — บอก AI สถานะของแต่ละ slot
  // (เก็บ #1/#2/#3 ใน prompt เสมอ — แค่บอก AI ว่าตอนนี้ vision ใส่อะไรมาบ้าง)
  const hasModelDescription = (modelMode === 'text' && modelText.trim().length > 0) || hasModelImages;
  lines.push('');
  lines.push('=== REFERENCE SLOTS (placeholders #1/#2/#3 must appear in EVERY prompt) ===');
  lines.push(`- Slot #1 (product appearance): ${hasProductImages ? 'ATTACHED via vision — describe what you see + still emit the #1 phrase' : 'NOT attached — emit only the #1 phrase, no invented details'}`);
  lines.push(`- Slot #2 (product size scale): ${hasSizeRefImages ? 'ATTACHED via vision — gauge size + still emit the #2 phrase' : 'NOT attached — emit only the #2 phrase'}`);
  if (hasModelImages) {
    lines.push('- Slot #3 (model identity): ATTACHED via vision — describe the model + still emit the #3 phrase');
  } else if (modelMode === 'text' && modelText.trim()) {
    lines.push('- Slot #3 (model identity): TEXT description provided: "' + modelText.trim() + '" — incorporate this + still emit the #3 phrase');
  } else {
    lines.push('- Slot #3 (model identity): NOT provided — emit only the #3 phrase');
  }

  lines.push('');
  lines.push('Now produce the JSON.');
  return lines.join('\n');
}

export async function generateImagePrompts({ provider, model, apiKey, project }) {
  const shotCount = Math.max(1, Math.ceil((project.totalDuration || 40) / (project.perShotDuration || 6)));
  const system = buildImageSystem({ shotCount, styleBlock: project.styleBlock });

  const images = [
    ...(project.productImages || []),
    ...(project.sizeRefImages || []),
    ...(project.modelMode === 'image' ? (project.modelImages || []) : []),
  ];

  const userText = buildImageUserText({
    brief:           project.brief || '',
    modelMode:       project.modelMode,
    modelText:       project.modelText || '',
    hasProductImages: (project.productImages || []).length > 0,
    hasSizeRefImages: (project.sizeRefImages || []).length > 0,
    hasModelImages:   project.modelMode === 'image' && (project.modelImages || []).length > 0,
  });

  const raw = await callAi({
    provider, model, apiKey,
    system, userText, images,
    expectJson: true, schema: SCHEMA_IMAGE_PROMPTS,
  });
  const parsed = parseJsonStrict(raw);
  if (!parsed?.shots || !Array.isArray(parsed.shots)) throw new Error('AI ตอบกลับมาแต่ไม่มี shots[]');
  // sort by index + clamp to expected count
  const sorted = [...parsed.shots].sort((a, b) => (a.index || 0) - (b.index || 0));
  return { shots: sorted };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage A (alt) — Script-Driven Mode: Voiceover Script → Storyboard → Prompts
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_STORYBOARD = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          voiceoverLine: { type: 'string' },
          visualHint:    { type: 'string' },
        },
        required: ['voiceoverLine', 'visualHint'],
      },
    },
  },
  required: ['segments'],
};

const SCHEMA_IMAGE_PROMPTS_WITH_VO = {
  type: 'object',
  properties: {
    shots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:         { type: 'integer' },
          prompt:        { type: 'string' },
          voiceoverLine: { type: 'string' },
        },
        required: ['index', 'prompt'],
      },
    },
  },
  required: ['shots'],
};

function buildStoryboardSystem({ shotCount }) {
  return `You are a Thai creative director planning a ${shotCount}-shot product advertisement video for TikTok/Reels (9:16 vertical).

Your job: split the voiceover script below into EXACTLY ${shotCount} segments (one per shot, ~${Math.round(40/shotCount * 1.5)}s each in playback), then suggest a visual hint (in Thai) for each segment that LITERALLY VISUALIZES that line.

CRITICAL — visual hints must DRAMATIZE the voiceover, not just illustrate the product:
- If the line says "ไม่ต้องไปเที่ยวที่ไหน" → visual should show CONTRAST (others travelling vs heroine relaxing at home)
- If the line says "เนื้อครีมเข้มข้น" → visual should be macro/close-up of texture
- If the line says product name → visual should be the product hero shot
- If the line says ingredients → flat-lay or hero ingredients shot
- If the line is emotional/aspirational → final glamour shot of confident heroine

DO NOT invent voiceover content — only re-segment what the user wrote. Combine short adjacent lines or split long lines as needed to hit EXACTLY ${shotCount} shots. Preserve the order and the user's exact wording.

Output strict JSON, no prose:
{ "segments": [{ "voiceoverLine": "...", "visualHint": "..." }, ...] }

Both fields in Thai. visualHint should describe what the camera sees (subject, action, scene, framing, mood) — 1-3 sentences.`;
}

export async function generateStoryboardFromScript({ provider, model, apiKey, project }) {
  const shotCount = Math.max(1, Math.ceil((project.totalDuration || 40) / (project.perShotDuration || 6)));
  const system = buildStoryboardSystem({ shotCount });
  const userText =
    `=== PRODUCT CONTEXT (Thai, optional) ===\n${project.brief?.trim() || '(ไม่ได้กรอก — ใช้บริบทจาก script เอง)'}\n\n` +
    `=== VOICEOVER SCRIPT (Thai, ผู้ใช้พิมพ์เอง) ===\n${project.scriptText || ''}\n\n` +
    `Now produce the JSON with EXACTLY ${shotCount} segments.`;
  const raw = await callAi({
    provider, model, apiKey, system, userText, images: [],
    expectJson: true, schema: SCHEMA_STORYBOARD,
  });
  const parsed = parseJsonStrict(raw);
  if (!Array.isArray(parsed?.segments) || parsed.segments.length === 0) {
    throw new Error('AI ไม่คืน storyboard — ลองใหม่');
  }
  // Trim/clamp to expected count (AI sometimes off by 1)
  const segs = parsed.segments.slice(0, shotCount).map(s => ({
    voiceoverLine: String(s.voiceoverLine || '').trim(),
    visualHint:    String(s.visualHint    || '').trim(),
  }));
  return { segments: segs };
}

function buildStoryboardImageSystem({ shotCount, styleBlock }) {
  return `You are a creative director crafting prompts for an AI image generator (Nano Banana / Imagen) for a ~${shotCount * 6}-second TikTok/Reels product ad video (9:16 vertical portrait).

Each shot has a voiceover line + a Thai visual hint already written by the director. Your job: convert each into ONE rich English image prompt that LITERALLY visualizes that scene as the director described it.

PROMPT STRUCTURE — every prompt is one comma-separated paragraph:
1. Image type (cinematic advertising photography is the default)
2. Subject + Object (PRODUCT consistent across all shots)
3. Action / Scene — DIRECTLY MATCHING the visualHint provided (do not invent unrelated scenes)
4. Style / Mood / Lighting (from style block)
5. Camera angle / lens / F-stop / bokeh

STYLE BLOCK — append this verbatim at end of every prompt:
"${styleBlock}"

REFERENCE-IMAGE PLACEHOLDERS (CRITICAL — every prompt must include all 3 verbatim):
- "reference the product appearance from input image #1"
- "reference the product size scale from input image #2"
- "reference the model identity from input image #3"

NO TEXT IN IMAGE — HARD RULE:
Every prompt must include "no text, no letters, no readable typography anywhere in the image" (or natural variant).

NEVER INVENT NEW NARRATIVE: translate the visualHint faithfully. If hint says "เห็นเพื่อนกำลังขนกระเป๋าเดินทาง", the prompt MUST depict that contrast scene, not a generic product shot. Trust the director's vision.

RULES:
- Generate exactly ${shotCount} prompts (matching storyboard order).
- Prompts in English, single paragraph each.
- Always include all 3 reference phrases.
- Vary camera angles to keep edit dynamic.

OUTPUT — strict JSON, no prose:
{ "shots": [{ "index": 1, "prompt": "...", "voiceoverLine": "..." }, ...] }
voiceoverLine = pass through unchanged from input.`;
}

export async function generateImagePromptsFromStoryboard({ provider, model, apiKey, project }) {
  const shotCount = project.storyboard?.length || 0;
  if (shotCount === 0) throw new Error('Storyboard ยังว่าง — กดปุ่ม "AI แตก storyboard" ก่อน');

  const system = buildStoryboardImageSystem({ shotCount, styleBlock: project.styleBlock });
  const images = [
    ...(project.productImages || []),
    ...(project.sizeRefImages || []),
    ...(project.modelMode === 'image' ? (project.modelImages || []) : []),
  ];

  const userText = [
    '=== STORYBOARD (Thai — director-edited, ห้ามเปลี่ยน narrative) ===',
    project.storyboard.map((seg, i) =>
      `Shot ${i + 1}:\n  Voiceover: "${seg.voiceoverLine}"\n  Visual: ${seg.visualHint}`
    ).join('\n\n'),
    '',
    '=== REFERENCE SLOTS (placeholders #1/#2/#3 must appear in EVERY prompt) ===',
    `- Slot #1 (product): ${(project.productImages?.length || 0) > 0
        ? 'ATTACHED via vision — describe what you see + still emit the #1 phrase'
        : 'NOT attached — emit only the #1 phrase, no invented details'}`,
    `- Slot #2 (size):    ${(project.sizeRefImages?.length || 0) > 0
        ? 'ATTACHED via vision — gauge size + still emit the #2 phrase'
        : 'NOT attached — emit only the #2 phrase'}`,
    `- Slot #3 (model):   ${
      project.modelMode === 'image' && project.modelImages?.length
        ? 'ATTACHED via vision — describe the model + still emit the #3 phrase'
        : project.modelMode === 'text' && project.modelText?.trim()
          ? `TEXT: "${project.modelText.trim()}" — incorporate + still emit the #3 phrase`
          : 'NOT provided — emit only the #3 phrase'
    }`,
    '',
    'Now produce the JSON with all 3 reference phrases in every prompt.',
  ].join('\n');

  const raw = await callAi({
    provider, model, apiKey, system, userText, images,
    expectJson: true, schema: SCHEMA_IMAGE_PROMPTS_WITH_VO,
  });
  const parsed = parseJsonStrict(raw);
  if (!parsed?.shots || !Array.isArray(parsed.shots)) {
    throw new Error('AI ตอบกลับมาแต่ไม่มี shots[]');
  }
  const sorted = [...parsed.shots].sort((a, b) => (a.index || 0) - (b.index || 0));
  // Backfill voiceoverLine if AI dropped it
  return {
    shots: sorted.map((s, i) => ({
      ...s,
      voiceoverLine: s.voiceoverLine || project.storyboard[i]?.voiceoverLine || '',
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage C — Shot images → Video Prompts + Music
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_VIDEO_PROMPTS = {
  type: 'object',
  properties: {
    shots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:            { type: 'integer' },
          sourceImageIndex: { type: 'integer' },
          videoPromptEn:    { type: 'string' },
          frameRole:        { type: 'string', enum: ['start', 'end', 'both'] },
          frameNote:        { type: 'string' },
        },
        required: ['index', 'sourceImageIndex', 'videoPromptEn', 'frameRole', 'frameNote'],
      },
    },
    music: {
      type: 'object',
      properties: {
        mood:        { type: 'string' },
        tempo:       { type: 'integer' },
        instruments: { type: 'array', items: { type: 'string' } },
        references:  { type: 'array', items: { type: 'string' } },
      },
      required: ['mood', 'tempo', 'instruments', 'references'],
    },
  },
  required: ['shots', 'music'],
};

function buildVideoSystem({ shotCount, styleBlock, perShotDuration }) {
  return `You are an AI video director planning a ~${shotCount * perShotDuration}-second product advertisement, composed of ${shotCount} clips of ~${perShotDuration} seconds each. The user uploaded ${shotCount} image frames in narrative order (image index 0, 1, 2, ...).

Modern AI video generators (Runway, Veo, Kling, Luma etc.) accept images in 3 ways:
- start frame only — generates motion FORWARD from this image
- end frame only — generates motion ARRIVING at this image
- start + end frame — interpolates between two images

YOUR JOB:
1. For each shot, write a single English video prompt (max ~60 words) describing camera movement, subject motion, and atmosphere. Match this overall style:
"${styleBlock}"
2. Recommend frame role for each image:
   - "start" → use as opening; the next image is the destination
   - "end"   → use as closing; the previous image was the start
   - "both"  → use this single image as both anchors (when subject barely moves, just camera push/pull/orbit)
3. Recommend ONE background-music STYLE concept for the full video — keep it short (mood + tempo + a couple instrument suggestions + 2-3 reference tracks). This goes in the SEPARATE "music" object — do NOT mix audio/music into per-shot video prompts.

NO AUDIO IN SHOT PROMPTS — HARD RULE:
Each "videoPromptEn" must describe ONLY visual elements: camera motion, subject motion, lighting, atmosphere, color, texture, composition. NEVER mention any of these in a shot prompt:
- music, soundtrack, BGM, song, melody
- sound effects, SFX, foley, audio cues
- voice, dialogue, narration, voice-over, ASMR
- silence, ambient sound, room tone, "no sound"
- audio mixing instructions
The audio/music description goes EXCLUSIVELY in the separate "music" field at the bottom of the JSON. Per-shot prompts are 100% silent visual descriptions — the editor will mix music separately during post-production.

RULES:
- Total shots in output = total uploaded images.
- "sourceImageIndex" refers to the 0-based index of the uploaded image used as the primary anchor for this shot.
- Video prompts: English only.
- "frameNote" and music fields: Thai is fine (this user is Thai).

OUTPUT FORMAT — strictly JSON, no prose, no markdown:
{
  "shots": [
    {
      "index": 1,
      "sourceImageIndex": 0,
      "videoPromptEn": "...",
      "frameRole": "start",
      "frameNote": "ใช้เป็น opening — กล้อง dolly เข้าหา subject"
    }
  ],
  "music": {
    "mood": "เช่น uplifting cinematic / minimal warm / energetic urban",
    "tempo": 95,
    "instruments": ["piano", "soft strings", "subtle electronic pad"],
    "references": ["ชื่อเพลง / ศิลปิน 2-3 ตัว"]
  }
}`;
}

export async function generateVideoPrompts({ provider, model, apiKey, project }) {
  const images = project.shotImages || [];
  if (images.length === 0) throw new Error('กรุณาอัพโหลดรูปอย่างน้อย 1 รูปก่อน');

  const system = buildVideoSystem({
    shotCount: images.length,
    styleBlock: project.styleBlock,
    perShotDuration: project.perShotDuration || 6,
  });

  const userText = [
    '=== BRIEF FROM CLIENT (Thai) ===',
    project.brief || '(no brief provided)',
    '',
    `=== UPLOADED IMAGES (${images.length} frames, in narrative order, indices 0..${images.length - 1}) ===`,
    'Now produce the JSON.',
  ].join('\n');

  const raw = await callAi({
    provider, model, apiKey,
    system, userText, images,
    expectJson: true, schema: SCHEMA_VIDEO_PROMPTS,
  });
  const parsed = parseJsonStrict(raw);
  if (!parsed?.shots || !Array.isArray(parsed.shots)) throw new Error('AI ตอบกลับมาแต่ไม่มี shots[]');
  if (!parsed?.music) parsed.music = { mood: '', tempo: 0, instruments: [], references: [] };
  parsed.shots = [...parsed.shots].sort((a, b) => (a.index || 0) - (b.index || 0));
  return parsed;
}

// ═════════════════════════════════════════════════════════════════════════════
// MVP — Stage A: Supporter photo + theme → Image prompts
// ═════════════════════════════════════════════════════════════════════════════

function buildMvpImageSystem({ shotCount, styleBlock, theme }) {
  return `You are a creative director crafting prompts for an AI image generator (e.g. Midjourney, Nano Banana, Imagen) that supports multi-image input. The end goal is a ~${shotCount * 6}-second TIKTOK LIVE "MVP" hype video — a celebration clip a streamer plays to honor a top supporter who sent many gifts.

Your job: produce ${shotCount} IMAGE prompts (one per shot) that TRANSFORM the supporter (face from input image #1) into hero/character versions while keeping the SAME PERSON's face recognizable across all shots.

CRITICAL RULES — read carefully:
1. FACE LIKENESS — Every shot must depict the SAME real person, with face identity preserved from input image #1. Describe them faithfully (apparent age, ethnicity, hair color/style, distinguishing features) when supporter reference is attached here. Always instruct the image generator to keep face identity exactly as input image #1.
2. TRANSFORMATION THEME — The user provides a theme like "superhero in golden armor" or "anime warrior with magical aura". Each shot should explore a different angle/pose/setting/outfit detail of this transformation, but the PERSON remains the same.
3. NEGATIVE SPACE FOR TEXT OVERLAY — Each shot MUST leave a clear, intentional empty area (upper-third or lower-third or one side) where the streamer will overlay the supporter's username + gift count in post-production. The composition should frame the subject so the empty space feels deliberate, not awkward. Mention this in every prompt: e.g. "subject framed to the right side, leaving the left third clear for text overlay" or "low camera angle with sky/empty space above for title overlay".
4. HYPE / HERO ENERGY — Vibe should be epic, dramatic, celebratory. Pose suggestions: heroic stance, slow-motion entrance, looking down on camera, action mid-leap, glowing aura, rim light from behind.
5. PROMPT STRUCTURE — Single rich English paragraph per shot covering:
   • Image type (cinematic hero portrait / cinematic wide hero shot / etc.)
   • Subject + person description (faithful to reference) + transformation details (outfit, props, glow)
   • Action / Scene (pose + location)
   • Style / mood / lighting
   • Camera angle / lens
   • Negative space note (where to leave empty for text)

REFERENCE-IMAGE PLACEHOLDER CONVENTION (CRITICAL — ALWAYS APPLY):
The downstream image generator accepts up to 2 numbered reference images at fixed positions:
- #1 = supporter face/identity reference (REQUIRED — face must match this)
- #2 = VJ branding reference (logo, colors, style — OPTIONAL)

You MUST include both placeholder phrases naturally in EVERY prompt, regardless of whether the user attached references in this tool. The exact substrings to include verbatim:
- "reference the supporter face from input image #1, keep identity exactly the same"
- "reference VJ branding colors and logo from input image #2"

The user can manually delete the #2 phrase if they don't use VJ branding — your job is to ALWAYS emit both.

WHEN A REFERENCE IS ATTACHED HERE (you can see it via vision):
- ALSO describe what you see (supporter's apparent age/ethnicity/hair/features for #1, brand color/logo/style for #2) IN ADDITION to the placeholder phrase.
- Example with attached supporter: "...a young Thai woman with long black hair and warm smile (reference the supporter face from input image #1, keep identity exactly the same), wearing a glowing golden cape..."

WHEN A REFERENCE IS NOT ATTACHED:
- Just emit the placeholder phrase without inventing details. The user will upload that reference at the matching position in their image generator.

NO TEXT IN IMAGE — HARD RULE (read carefully):
AI image generators render text/letters/numbers very poorly (gibberish, misspelled words). NEVER ask the image generator to draw text/letters/numbers/watermarks/signs/captions/speech-bubbles. Username + gift count will be overlaid in POST-PRODUCTION (CapCut/Premiere). Even if the brief implies text (e.g. "with the supporter's name floating"), produce a purely visual scene with NEGATIVE SPACE for the text instead.

If a VJ logo reference is attached, the visual logo can appear but instruct: "stylized abstract logo, no readable text/letters in the logo".

You MUST include an explicit no-text instruction in EVERY prompt — phrase it as one of:
- "no text, no letters, no readable typography anywhere in the image"
- "completely text-free composition"
- "avoid any rendered text, numbers, or readable signage"
Pick one of these phrasings (or natural variants) and include it in every shot prompt.

STYLE BLOCK — append verbatim at the end of every prompt:
"${styleBlock}"

TRANSFORMATION THEME (from user):
"${theme}"

OUTPUT FORMAT — strictly JSON, no prose, no markdown. Generate exactly ${shotCount} prompts:
{
  "shots": [
    { "index": 1, "prompt": "..." },
    { "index": 2, "prompt": "..." }
  ]
}`;
}

export async function generateMvpImagePrompts({ provider, model, apiKey, project }) {
  const shotCount = Math.max(1, Math.ceil((project.totalDuration || 16) / (project.perShotDuration || 6)));
  const theme = (project.transformationTheme || '').trim();
  if (!theme) throw new Error('กรอก Transformation theme ก่อน');
  if (!project.supporterImages?.length) throw new Error('อัพโหลดรูปผู้ส่งอย่างน้อย 1 รูปก่อน (ต้องการเพื่อรักษา face likeness)');

  const system = buildMvpImageSystem({ shotCount, styleBlock: project.styleBlock, theme });

  const images = [
    ...(project.supporterImages || []),
    ...(project.vjBrandImages   || []),
  ];

  const hasSupporter = (project.supporterImages || []).length > 0;
  const hasBrand     = (project.vjBrandImages   || []).length > 0;

  const lines = [];
  lines.push('=== TRANSFORMATION THEME ===');
  lines.push(theme);
  lines.push('');
  lines.push('=== REFERENCE SLOTS (placeholders #1/#2 must appear in EVERY prompt) ===');
  lines.push(`- Slot #1 (supporter face/identity): ${hasSupporter ? `ATTACHED via vision (${project.supporterImages.length} photo(s)) — describe what you see + still emit the #1 phrase verbatim` : 'NOT attached — emit only the #1 phrase'}`);
  lines.push(`- Slot #2 (VJ branding): ${hasBrand ? `ATTACHED via vision (${project.vjBrandImages.length} photo(s)) — describe brand colors/logo + still emit the #2 phrase` : 'NOT attached — emit only the #2 phrase (user can delete if they will not add VJ branding)'}`);
  lines.push('');
  lines.push(`Now produce exactly ${shotCount} JSON prompts.`);
  const userText = lines.join('\n');

  const raw = await callAi({
    provider, model, apiKey,
    system, userText, images,
    expectJson: true, schema: SCHEMA_IMAGE_PROMPTS,
  });
  const parsed = parseJsonStrict(raw);
  if (!parsed?.shots || !Array.isArray(parsed.shots)) throw new Error('AI ตอบกลับมาแต่ไม่มี shots[]');
  const sorted = [...parsed.shots].sort((a, b) => (a.index || 0) - (b.index || 0));
  return { shots: sorted };
}

// ═════════════════════════════════════════════════════════════════════════════
// MVP — Stage C: Shot images → Video Prompts (HYPE) + High-energy Music
// ═════════════════════════════════════════════════════════════════════════════

function buildMvpVideoSystem({ shotCount, styleBlock, perShotDuration, theme }) {
  return `You are an AI video director planning a ~${shotCount * perShotDuration}-second TIKTOK LIVE "MVP" hype clip — a streamer's tribute video to a top gift-sender. ${shotCount} image frames have been uploaded in narrative order (image index 0..${shotCount - 1}).

This is HIGH-ENERGY HERO REVEAL content, not a calm product ad. Energy should be dramatic, celebratory, anime-trailer/superhero-reveal vibe.

Modern AI video generators (Runway, Veo, Kling, Luma etc.) accept images in 3 ways:
- start frame only — generates motion FORWARD from this image
- end frame only — generates motion ARRIVING at this image
- start + end frame — interpolates between two images

YOUR JOB:
1. For each shot, write a single English video prompt (max ~70 words) that emphasizes HYPE motion: slow-motion entrance, dramatic camera push-in, dolly-zoom, orbit reveal, particle effects, light bursts, lens flares, wind/cape motion, hero pose hold. Match this overall style:
"${styleBlock}"
2. Recommend frame role for each image:
   - "start" → use as opening; the next image is the destination
   - "end"   → use as closing; the previous image was the start
   - "both"  → use this single image as both anchors (subject barely moves, camera does the work — push-in, orbit, parallax)
3. Recommend ONE background-music STYLE concept — bias TOWARD high-energy / anime hero / cinematic trailer / EDM-with-drop / orchestral epic. Include 2-3 specific reference tracks or artists. This goes EXCLUSIVELY in the separate "music" object — do NOT mention music in per-shot video prompts.

NO AUDIO IN SHOT PROMPTS — HARD RULE:
Each "videoPromptEn" must describe ONLY visual elements: camera motion, subject motion, lighting, atmosphere, particles, lens flare, color. NEVER mention any of these in a shot prompt:
- music, soundtrack, BGM, song, melody, beat drop
- sound effects, SFX, foley, audio cues, whoosh, boom
- voice, dialogue, narration, voice-over
- silence, ambient sound, room tone, "no sound"
The audio/music description goes EXCLUSIVELY in the separate "music" field at the bottom of the JSON. Per-shot prompts are 100% silent visual descriptions — the editor will mix music separately during post-production.

CONTEXT — transformation theme used to create the images:
"${theme}"

RULES:
- Total shots in output = total uploaded images (${shotCount}).
- "sourceImageIndex" = 0-based index of the uploaded image used as the primary anchor for this shot.
- Video prompts: English only.
- "frameNote" and music fields: Thai is fine.
- Pacing: this clip is short (${shotCount * perShotDuration}s) — every motion should hit hard. No subtle ambient stuff.

OUTPUT FORMAT — strictly JSON, no prose, no markdown:
{
  "shots": [
    {
      "index": 1,
      "sourceImageIndex": 0,
      "videoPromptEn": "...",
      "frameRole": "start",
      "frameNote": "เปิดด้วย dramatic dolly-in + lens flare → ตามด้วย hero reveal shot ที่ 2"
    }
  ],
  "music": {
    "mood": "เช่น epic cinematic trailer / anime hero theme / EDM build-with-drop",
    "tempo": 128,
    "instruments": ["epic orchestra", "synth bass drop", "taiko drums"],
    "references": ["Two Steps From Hell - Heart of Courage", "Hi-Finesse - Outlive", "อื่นๆ"]
  }
}`;
}

export async function generateMvpVideoPrompts({ provider, model, apiKey, project }) {
  const images = project.shotImages || [];
  if (images.length === 0) throw new Error('กรุณาอัพโหลดรูป shot อย่างน้อย 1 รูปก่อน');

  const system = buildMvpVideoSystem({
    shotCount:       images.length,
    styleBlock:      project.styleBlock,
    perShotDuration: project.perShotDuration || 6,
    theme:           project.transformationTheme || '(no theme provided)',
  });

  const userText = [
    '=== TRANSFORMATION THEME ===',
    project.transformationTheme || '(no theme)',
    '',
    `=== UPLOADED IMAGES (${images.length} frames, in narrative order, indices 0..${images.length - 1}) ===`,
    'Now produce the JSON.',
  ].join('\n');

  const raw = await callAi({
    provider, model, apiKey,
    system, userText, images,
    expectJson: true, schema: SCHEMA_VIDEO_PROMPTS,
  });
  const parsed = parseJsonStrict(raw);
  if (!parsed?.shots || !Array.isArray(parsed.shots)) throw new Error('AI ตอบกลับมาแต่ไม่มี shots[]');
  if (!parsed?.music) parsed.music = { mood: '', tempo: 0, instruments: [], references: [] };
  parsed.shots = [...parsed.shots].sort((a, b) => (a.index || 0) - (b.index || 0));
  return parsed;
}
