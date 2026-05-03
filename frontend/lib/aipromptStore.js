// lib/aipromptStore.js — IndexedDB CRUD สำหรับหน้า /aiprompt
// เก็บทุกอย่างใน browser เท่านั้น ไม่มี request ไป backend
//
// Stores:
//   projects — keyPath 'id', value = full project state (รวมรูป base64)
//   apiKeys  — keyPath 'provider' ('gemini' | 'claude'), value = { apiKey, model }
//
// ใช้ raw IndexedDB API (ไม่เพิ่ม dependency)

import { v4 as uuidv4 } from 'uuid';

const DB_NAME    = 'ttplus_aiprompt';
const DB_VERSION = 1;
const STORE_PROJ = 'projects';
const STORE_KEYS = 'apiKeys';

// Style fields — แต่ละ field เป็น dropdown ใน UI
// option แรก = default (ตรงกับ cinematic block จาก PDF)
// value '' = ไม่ใช้ (skip ใน styleBlock ที่ generate)
export const STYLE_FIELDS = [
  {
    key: 'style', label: 'Cinematography vibe',
    options: [
      { value: 'ultra-cinematic cinematography style', label: 'Ultra-cinematic (default)' },
      { value: 'commercial advertising photography style', label: 'Commercial ad' },
      { value: 'documentary realism style', label: 'Documentary realism' },
      { value: 'editorial fashion photography style', label: 'Editorial fashion' },
      { value: 'street photography style', label: 'Street photography' },
      { value: 'vintage film aesthetic', label: 'Vintage film' },
      { value: 'modern minimal aesthetic', label: 'Modern minimal' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'dof', label: 'Depth of field',
    options: [
      { value: 'shallow depth of field', label: 'Shallow (default)' },
      { value: 'very shallow depth of field', label: 'Very shallow' },
      { value: 'medium depth of field', label: 'Medium' },
      { value: 'deep depth of field, everything in focus', label: 'Deep / everything in focus' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'background', label: 'Background',
    options: [
      { value: 'soft blurry background with creamy bokeh', label: 'Creamy bokeh (default)' },
      { value: 'soft blurry background with hexagonal bokeh', label: 'Hexagonal bokeh' },
      { value: 'clean seamless studio backdrop', label: 'Clean studio backdrop' },
      { value: 'richly detailed environment in soft focus', label: 'Detailed environment, soft focus' },
      { value: 'busy environment in sharp focus', label: 'Detailed environment, in focus' },
      { value: 'minimalist negative-space background', label: 'Negative space minimal' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'focus', label: 'Subject focus',
    options: [
      { value: 'subject in sharp focus', label: 'Sharp focus (default)' },
      { value: 'subject in razor-sharp tack focus', label: 'Razor-sharp / tack focus' },
      { value: 'soft focus on subject for dreamy look', label: 'Soft / dreamy focus' },
      { value: 'selective focus on product detail', label: 'Selective on product detail' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'lens', label: 'Lens type',
    options: [
      { value: 'anamorphic lens with subtle edge curvature', label: 'Anamorphic (default)' },
      { value: '50mm prime lens with sharp center', label: '50mm prime' },
      { value: '85mm telephoto portrait lens', label: '85mm portrait' },
      { value: '24mm wide-angle lens', label: '24mm wide' },
      { value: '14mm ultra-wide lens', label: '14mm ultra-wide' },
      { value: 'macro lens, extreme close-up detail', label: 'Macro close-up' },
      { value: 'fisheye lens distortion', label: 'Fisheye' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'lensFx', label: 'Lens character & flare',
    options: [
      { value: 'cinematic distortion, lens compression, lens flare', label: 'Cinematic distortion + flare (default)' },
      { value: 'subtle horizontal anamorphic lens flare', label: 'Anamorphic horizontal flare' },
      { value: 'vintage soft glow halation', label: 'Vintage soft halation' },
      { value: 'clean modern optics, no distortion or flare', label: 'Clean modern, no flare' },
      { value: 'strong dramatic lens flare', label: 'Dramatic strong flare' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'grain', label: 'Film grain texture',
    options: [
      { value: 'natural film grain', label: 'Natural film grain (default)' },
      { value: 'subtle Kodak Portra grain', label: 'Subtle Kodak Portra' },
      { value: 'heavy 16mm film grain texture', label: 'Heavy 16mm grain' },
      { value: 'gritty Super 8 grain', label: 'Gritty Super 8' },
      { value: 'clean digital, no grain', label: 'Clean digital (no grain)' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'atmosphere', label: 'Atmosphere',
    options: [
      { value: 'atmospheric haze', label: 'Atmospheric haze (default)' },
      { value: 'volumetric light haze', label: 'Volumetric light beams' },
      { value: 'soft mist in background', label: 'Soft mist' },
      { value: 'light smoke wisps', label: 'Light smoke' },
      { value: 'gentle rain mist', label: 'Rain mist' },
      { value: 'crystal clean air, no atmosphere', label: 'Crystal clean (none)' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'realism', label: 'Realism / skin',
    options: [
      { value: 'realistic film style with detailed skin', label: 'Realistic film + skin detail (default)' },
      { value: 'hyperreal magazine retouching', label: 'Hyperreal magazine' },
      { value: 'soft cinematic skin glow', label: 'Cinematic skin glow' },
      { value: 'natural unretouched skin', label: 'Natural unretouched' },
      { value: 'painterly stylized rendering', label: 'Painterly stylized' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'lighting', label: 'Lighting',
    options: [
      { value: 'film lighting and shadow', label: 'Film lighting + shadow (default)' },
      { value: 'golden hour warm sunlight', label: 'Golden hour warm sun' },
      { value: 'hard midday sun, strong shadows', label: 'Hard midday sun' },
      { value: 'soft north window light', label: 'Soft window light' },
      { value: 'studio three-point lighting', label: 'Studio 3-point' },
      { value: 'moody low-key dramatic lighting', label: 'Moody low-key' },
      { value: 'high-key bright even lighting', label: 'High-key bright' },
      { value: 'neon night cyberpunk lighting', label: 'Neon cyberpunk' },
      { value: 'backlit silhouette rim lighting', label: 'Backlit silhouette' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'quality', label: 'Output target',
    options: [
      { value: 'movie still quality', label: 'Movie still (default)' },
      { value: 'high-end advertising photography quality', label: 'High-end ad photography' },
      { value: 'magazine cover quality', label: 'Magazine cover' },
      { value: 'editorial fashion still', label: 'Editorial fashion still' },
      { value: 'IMAX 70mm still', label: 'IMAX 70mm still' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'camera', label: 'Camera & format',
    options: [
      { value: '35mm, professional cinema camera', label: '35mm cinema (default)' },
      { value: 'shot on ARRI Alexa 35, 35mm format', label: 'ARRI Alexa 35' },
      { value: 'shot on RED Komodo 6K', label: 'RED Komodo 6K' },
      { value: 'shot on Sony Venice with anamorphic 2x', label: 'Sony Venice anamorphic' },
      { value: 'shot on 70mm IMAX', label: '70mm IMAX' },
      { value: 'shot on 16mm vintage film', label: '16mm vintage film' },
      { value: 'shot on iPhone Pro for natural grit', label: 'iPhone Pro grit' },
      { value: 'medium format Hasselblad still', label: 'Hasselblad medium format' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
];

// Default styleParts สำหรับ AD — derive จาก STYLE_FIELDS
export const DEFAULT_STYLE_PARTS = STYLE_FIELDS.reduce((acc, f) => {
  acc[f.key] = f.options[0].value;
  return acc;
}, {});

// ── STYLE_FIELDS_MVP — น้อยกว่าแต่ใหญ่ๆ ตามแนว clip MVP ของ TikTok live ───
// เน้น "วิบ/แนวการ์ตูน/ตัวละคร" มากกว่ารายละเอียด cinematography
export const STYLE_FIELDS_MVP = [
  {
    key: 'vibe', label: 'แนว / สไตล์',
    options: [
      { value: 'shounen battle anime style (Bleach / Naruto / Dragon Ball aesthetic), bold linework, dramatic action lines', label: '🥋 อนิเมะแอ็คชั่น (Bleach/Naruto) — default' },
      { value: 'Studio Ghibli soft magical anime style, warm hand-painted feel', label: '🌸 Ghibli อบอุ่นใส' },
      { value: 'modern Disney/Pixar 3D animation style, cute expressive', label: '🎈 Disney/Pixar 3D' },
      { value: 'Marvel cinematic universe superhero style, dynamic action', label: '🦸 Marvel ซูเปอร์ฮีโร่' },
      { value: 'DC dark gritty superhero style, moody intense (Batman vibe)', label: '🦇 DC ดาร์คฮีโร่' },
      { value: 'Korean webtoon manhwa style, sleek modern', label: '📱 Webtoon เกาหลี' },
      { value: 'cyberpunk neon hero style, futuristic Tokyo aesthetic', label: '🌆 Cyberpunk neon' },
      { value: 'cool cinematic action movie style, John Wick / spy thriller vibe', label: '😎 หนังแอ็คชั่นเท่ๆ' },
      { value: 'dark moody noir hero style, hard shadows, Sin City vibe', label: '🌑 Noir ดาร์คเท่' },
      { value: 'cartoonish exaggerated comedy style, big expressive features, slapstick', label: '🤣 ตลกการ์ตูน' },
      { value: 'meme-style absurd comedy, viral internet aesthetic', label: '😂 Meme ตลกบ้า' },
      { value: 'epic fantasy hero style, Lord of the Rings / Game of Thrones vibe', label: '⚔️ แฟนตาซีเอปิค' },
      { value: 'K-pop idol hero style, polished glossy fashion editorial', label: '✨ K-pop idol สไตล์' },
      { value: 'retro vaporwave 80s aesthetic, synthwave colors', label: '📼 Retro vaporwave 80s' },
      { value: 'samurai warrior anime style, dramatic katana action', label: '⚔️ ซามูไรอนิเมะ' },
      { value: 'mecha pilot anime style, giant robot vibe, Gundam aesthetic', label: '🤖 Mecha Gundam' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'aura', label: 'Aura / Power effect',
    options: [
      { value: 'glowing golden power aura radiating around the body', label: '✨ ออร่าทอง — default' },
      { value: 'crackling electric lightning aura', label: '⚡ สายฟ้าฟาด' },
      { value: 'blazing fire flames aura', label: '🔥 เพลิงพิโรธ' },
      { value: 'icy frost crystal aura, cold mist swirling', label: '❄️ น้ำแข็ง' },
      { value: 'dark shadow aura with smoke tendrils', label: '🌫 เงาดำพลัง' },
      { value: 'rainbow energy explosion bursting outward', label: '🌈 พลังรุ้ง' },
      { value: 'sparkles and stardust shimmering', label: '⭐ เกล็ดดาว' },
      { value: 'no aura, clean realistic look', label: '— ไม่มี aura, ดูจริงๆ —' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'palette', label: 'โทนสี',
    options: [
      { value: 'vibrant cinematic colors with deep contrast', label: '🎨 สดใส cinematic — default' },
      { value: 'warm golden hour palette, sunset tones', label: '🌅 อบอุ่น golden hour' },
      { value: 'cool neon cyan and magenta', label: '💙💗 Neon ฟ้า/ม่วง' },
      { value: 'monochrome dramatic black and white with gold accents', label: '⚫ ขาวดำ + ทอง' },
      { value: 'pastel soft anime palette', label: '🌸 พาสเทลอนิเมะ' },
      { value: 'rich saturated comic book palette', label: '📕 สีจัด comic book' },
      { value: 'dark moody desaturated palette', label: '🌑 มืดทึม' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'pose', label: 'ท่าโพส',
    options: [
      { value: 'heroic stance, looking confidently at camera, chest out', label: '🦸 ยืนเท่ฮีโร่ — default' },
      { value: 'mid-action dynamic leap or jump', label: '🤸 กระโดดกลางอากาศ' },
      { value: 'slow-motion dramatic walk toward camera', label: '🚶 เดินเท่ๆ มาทางกล้อง' },
      { value: 'crossed arms power pose', label: '💪 กอดอกแสดงพลัง' },
      { value: 'arms raised celebrating victory', label: '🙌 ฉลองชัยชนะ' },
      { value: 'looking down on camera from above, dominant pose', label: '👁 มองลงมา (อยู่สูง)' },
      { value: 'silhouette turning toward camera in slow reveal', label: '🎭 หันมาเปิดตัว' },
      { value: 'sitting on a throne, regal pose', label: '👑 นั่งบัลลังก์' },
      { value: 'flying above the city', label: '🦅 บินเหนือเมือง' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
  {
    key: 'lighting', label: 'แสง',
    options: [
      { value: 'dramatic rim lighting from behind, hero silhouette', label: '💡 Rim light หลัง — default' },
      { value: 'cinematic three-point lighting, polished and clean', label: '🎬 Cinematic 3-point' },
      { value: 'moody low-key dramatic shadows', label: '🌑 มืดดราม่า' },
      { value: 'bright high-key heroic lighting', label: '☀️ สว่างเต็ม heroic' },
      { value: 'mixed neon colored lights from multiple angles', label: '🌈 Neon mixed' },
      { value: 'sunset golden hour glow', label: '🌅 Golden hour' },
      { value: 'lightning flash dramatic strobe', label: '⚡ ฟ้าผ่าวาบ' },
      { value: 'spotlight beam from above', label: '🔦 Spotlight ลงมา' },
      { value: '', label: '— ไม่ใช้ —' },
    ],
  },
];

export const DEFAULT_STYLE_PARTS_MVP = STYLE_FIELDS_MVP.reduce((acc, f) => {
  acc[f.key] = f.options[0].value;
  return acc;
}, {});

// helper: คืน fields/defaults ตาม category
export function getStyleFields(category) {
  return category === 'mvp' ? STYLE_FIELDS_MVP : STYLE_FIELDS;
}
export function getDefaultStyleParts(category) {
  return category === 'mvp' ? DEFAULT_STYLE_PARTS_MVP : DEFAULT_STYLE_PARTS;
}

// รวม styleParts + styleExtra เป็น string เดียว (ส่งให้ AI ต่อท้ายทุก image prompt)
// รับ category เพื่อรู้ว่าจะ iterate field set ไหน
export function composeStyleBlock(parts = {}, extra = '', category = 'ad') {
  const fields = getStyleFields(category);
  const ordered = fields
    .map(f => parts[f.key])
    .filter(v => typeof v === 'string' && v.trim().length > 0);
  const extraTrim = (extra || '').trim();
  if (extraTrim) ordered.push(extraTrim);
  return ordered.join(', ');
}

// Default styleBlock — สำหรับ legacy / display (ad)
export const DEFAULT_STYLE_BLOCK = composeStyleBlock(DEFAULT_STYLE_PARTS, '', 'ad');

let dbPromise = null;

function openDb() {
  if (typeof window === 'undefined') return Promise.reject(new Error('IndexedDB ใช้ได้ใน browser เท่านั้น'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJ)) {
        db.createObjectStore(STORE_PROJ, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: 'provider' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDb().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────

// Project categories — accent ของแต่ละ tab (ใช้ใน tab bar) และตรงกับ tt.accent ใน aiprompt.js
export const CATEGORIES = [
  { key: 'ad',  label: '🎬 Video Ad',  icon: '🎬', accent: '#60a5fa' },  // blue (Ad theme)
  { key: 'mvp', label: '🏆 Video MVP', icon: '🏆', accent: '#fbbf24' },  // gold (MVP theme)
];

// Default duration ตาม category
const CATEGORY_DEFAULTS = {
  ad:  { totalDuration: 40, perShotDuration: 6 },  // 7 shots
  mvp: { totalDuration: 16, perShotDuration: 6 },  // 2-3 shots
};

export function makeBlankProject(name = 'โปรเจกต์ใหม่', category = 'ad') {
  const now = Date.now();
  const cat = CATEGORIES.some(c => c.key === category) ? category : 'ad';
  const styleParts = { ...getDefaultStyleParts(cat) };
  const styleExtra = '';
  const dur = CATEGORY_DEFAULTS[cat];
  return {
    id: uuidv4(),
    name,
    category: cat,
    createdAt: now,
    updatedAt: now,
    totalDuration: dur.totalDuration,
    perShotDuration: dur.perShotDuration,
    styleParts,                                                  // dropdowns state (source of truth)
    styleExtra,                                                  // free-text append
    styleBlock: composeStyleBlock(styleParts, styleExtra, cat),  // derived — ส่งให้ AI
    // Common output
    imagePrompts: null,    // { shots: [{ index, prompt }] } หรือ null
    shotImages: [],        // จาก Stage B
    videoPlan: null,       // { shots: [...], music: {...} } หรือ null

    // Ad-specific
    brief: '',
    productImages: [],
    sizeRefImages: [],
    modelMode: 'text',         // 'text' | 'image'
    modelText: '',
    modelImages: [],
    modelFraming: 'full',      // 'full' | 'half' — สำหรับปุ่ม Gen รูปนางแบบ

    // MVP-specific
    transformationTheme: '',
    supporterImages: [],   // REQUIRED face references
    vjBrandImages: [],     // optional

    // Phase 3 — Image generation (Nano Banana)
    // anchors: รูปอ้างอิงสำหรับแต่ละ slot (#1/#2/#3) ที่ user gen ใน app
    //   shape: { '1': { dataUrl, mimeType, pickedAt } | null, '2': ..., '3': ... }
    //   ถ้า user upload reference เอง (productImages, supporterImages, etc.)
    //   ก็จะใช้ตัว upload ก่อน (anchor เป็น fallback ตอน slot ไม่มี upload)
    anchors: {},
  };
}

// Migrate project ที่บันทึกไว้ก่อน schema ใหม่ — ใส่ field ที่ขาดให้ครบ
export function ensureStyleSchema(proj) {
  if (!proj) return proj;
  let changed = false;
  const next = { ...proj };

  // category ก่อน — ต้องรู้ก่อนเพื่อเลือก style fields ที่ถูก
  if (!CATEGORIES.some(c => c.key === next.category)) {
    next.category = 'ad';
    changed = true;
  }

  const fields   = getStyleFields(next.category);
  const defaults = getDefaultStyleParts(next.category);
  const primaryKey = fields[0].key;

  // styleParts: ถ้าไม่มี primary key ของ category นี้ → reset (เช่น MVP project ที่
  // styleParts ยัง shape เป็น ad — สลับเลย)
  if (!next.styleParts || typeof next.styleParts !== 'object'
      || typeof next.styleParts[primaryKey] !== 'string') {
    next.styleParts = { ...defaults };
    changed = true;
  } else {
    // เผื่อ field ใหม่ของ category นี้ถูก add หลัง project ถูกสร้าง
    for (const f of fields) {
      if (typeof next.styleParts[f.key] !== 'string') {
        next.styleParts = { ...next.styleParts, [f.key]: f.options[0].value };
        changed = true;
      }
    }
  }
  if (typeof next.styleExtra !== 'string') {
    next.styleExtra = '';
    changed = true;
  }
  if (changed || !next.styleBlock) {
    next.styleBlock = composeStyleBlock(next.styleParts, next.styleExtra, next.category);
  }

  // MVP-specific defaults (เผื่อ project เก่าไม่มี)
  if (typeof next.transformationTheme !== 'string') next.transformationTheme = '';
  if (!Array.isArray(next.supporterImages))         next.supporterImages = [];
  if (!Array.isArray(next.vjBrandImages))           next.vjBrandImages = [];
  // Ad-specific defaults (เผื่อ shape ขาด)
  if (typeof next.brief !== 'string')               next.brief = '';
  if (!Array.isArray(next.productImages))           next.productImages = [];
  if (!Array.isArray(next.sizeRefImages))           next.sizeRefImages = [];
  if (typeof next.modelMode !== 'string')           next.modelMode = 'text';
  if (typeof next.modelText !== 'string')           next.modelText = '';
  if (!Array.isArray(next.modelImages))             next.modelImages = [];
  if (next.modelFraming !== 'full' && next.modelFraming !== 'half') next.modelFraming = 'full';

  // Phase 3 — Image generation defaults
  if (!next.anchors || typeof next.anchors !== 'object') next.anchors = {};
  // generated[] + mainImageId อยู่ใน imagePrompts.shots[i] — migrate ถ้าขาด
  if (next.imagePrompts?.shots?.length) {
    next.imagePrompts = {
      ...next.imagePrompts,
      shots: next.imagePrompts.shots.map(sh => ({
        ...sh,
        generated: Array.isArray(sh.generated) ? sh.generated : [],
        mainImageId: typeof sh.mainImageId === 'string' ? sh.mainImageId : null,
      })),
    };
  }

  return next;
}

// ── Image generation helpers ─────────────────────────────────────────────────

// ลบรูปที่ gen ทั้งหมด (per-shot generated[] + project anchors) — สำหรับ "Clear all generated"
export function clearAllGenerated(project) {
  if (!project) return project;
  const next = { ...project, anchors: {} };
  if (project.imagePrompts?.shots?.length) {
    next.imagePrompts = {
      ...project.imagePrompts,
      shots: project.imagePrompts.shots.map(sh => ({ ...sh, generated: [] })),
    };
  }
  return next;
}

// listProjects(filterCategory?) — ถ้าใส่ category จะกรองเฉพาะ tab นั้น
export async function listProjects(filterCategory) {
  const store = await tx(STORE_PROJ);
  const all = await reqToPromise(store.getAll());
  return all
    .map(p => ({ id: p.id, name: p.name, category: p.category || 'ad', updatedAt: p.updatedAt }))
    .filter(p => !filterCategory || p.category === filterCategory)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadProject(id) {
  if (!id) return null;
  const store = await tx(STORE_PROJ);
  return reqToPromise(store.get(id));
}

export async function saveProject(state) {
  if (!state || !state.id) throw new Error('saveProject: state.id required');
  const store = await tx(STORE_PROJ, 'readwrite');
  const next = { ...state, updatedAt: Date.now() };
  await reqToPromise(store.put(next));
  return next;
}

export async function createProject(name, category = 'ad') {
  const proj = makeBlankProject(name, category);
  const store = await tx(STORE_PROJ, 'readwrite');
  await reqToPromise(store.add(proj));
  return proj;
}

export async function renameProject(id, name) {
  const proj = await loadProject(id);
  if (!proj) return null;
  proj.name = name;
  return saveProject(proj);
}

export async function deleteProject(id) {
  const store = await tx(STORE_PROJ, 'readwrite');
  await reqToPromise(store.delete(id));
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function getApiConfig(provider) {
  const store = await tx(STORE_KEYS);
  return reqToPromise(store.get(provider));
}

export async function saveApiConfig(provider, { apiKey, model }) {
  const store = await tx(STORE_KEYS, 'readwrite');
  await reqToPromise(store.put({ provider, apiKey, model }));
}
