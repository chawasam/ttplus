// pages/aiprompt.js — AI Video Ad Prompt Generator
// Public standalone page — ใส่ API key เอง, เก็บทุกอย่างใน browser (IndexedDB)
// ไม่อยู่ใน PATH_TO_ID ของ _app.js → render เป็น standalone อัตโนมัติ

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

import {
  listProjects, loadProject, saveProject, createProject, renameProject, deleteProject,
  getApiConfig, saveApiConfig,
  makeBlankProject, ensureStyleSchema,
  composeStyleBlock,
  getStyleFields, getDefaultStyleParts,
  STYLE_PRESETS_AD,
  CATEGORIES, clearAllGenerated,
  clearAllNarrationAudio, clearAllGeneratedImagesAcrossProjects,
  listProjectsWithStats, clearNarrationAudio,
} from '../lib/aipromptStore';
import {
  generateImagePrompts, generateVideoPrompts,
  generateMvpImagePrompts, generateMvpVideoPrompts,
  generateStoryboardFromScript, generateImagePromptsFromStoryboard,
  testApiKey,
  MODELS, DEFAULT_MODEL,
} from '../lib/aipromptApi';
import {
  exportToGoogleDoc, buildImagePromptsDoc, buildVideoPromptsDoc,
  uploadImagesToDrive,
} from '../lib/aipromptDocs';
import {
  generateShotImage, detectSlotsInPrompt,
  MODELS_IMAGE, DEFAULT_MODEL_IMAGE,
} from '../lib/aipromptImageGen';
import {
  synthesizeNarration, audioBase64ToBlobUrl, downloadAudioBase64,
} from '../lib/aipromptTTS';
import {
  GEMINI_VOICES, GEMINI_PERSONAS,
  GEMINI_31_MODEL, GEMINI_25_MODEL,
} from '../lib/tts.js';

// Gemini TTS models ที่ user เลือกได้ — ฝัง label ที่นี่ (ไม่อยู่ใน lib/tts.js)
const TTS_MODELS = [
  { id: GEMINI_31_MODEL, label: 'Gemini 3.1 Flash TTS', note: 'ใหม่ที่สุด · 30 voices · แนะนำ' },
  { id: GEMINI_25_MODEL, label: 'Gemini 2.5 Flash TTS', note: 'เสถียร · fallback' },
];

// ── Slot mapping per category ───────────────────────────────────────────────
// slot # → { name, uploadField (in project) }
const SLOT_CONFIG = {
  ad: {
    1: { name: 'รูปผลิตภัณฑ์',  uploadField: 'productImages' },
    2: { name: 'ขนาดผลิตภัณฑ์', uploadField: 'sizeRefImages' },
    3: { name: 'นางแบบ',         uploadField: 'modelImages' },
  },
  mvp: {
    1: { name: 'หน้าผู้ส่ง', uploadField: 'supporterImages' },
    2: { name: 'VJ branding', uploadField: 'vjBrandImages' },
  },
};
function getSlotsFor(category) { return SLOT_CONFIG[category] || SLOT_CONFIG.ad; }

// resolve รูปสำหรับ slot — uploaded ก่อน, ถ้าไม่มีก็ใช้ anchor (ถ้า user gen ไว้)
function getSlotAnchorImage(project, slotNum) {
  if (!project) return null;
  const cfg = getSlotsFor(project.category)[slotNum];
  if (!cfg) return null;
  const uploaded = project[cfg.uploadField]?.[0];
  if (uploaded?.dataUrl) return { dataUrl: uploaded.dataUrl, mimeType: uploaded.mimeType, source: 'uploaded' };
  const anchor = project.anchors?.[slotNum];
  if (anchor?.dataUrl) return { dataUrl: anchor.dataUrl, mimeType: anchor.mimeType, source: 'anchor' };
  return null;
}

// ── Theme tokens — มี 2 mode ─────────────────────────────────────────────────
// AD = professional / cool (blue/purple/teal)
// MVP = celebratory / hot (gold/hot-pink/orange)
//
// ค่าที่ "ไม่เปลี่ยนตาม category" (border/text/err) อยู่ใน T (module scope)
// ค่าที่ "เปลี่ยนตาม category" — ใช้ผ่าน getTheme() แล้วใช้ตัวแปร tt ในหน้า

const T = {
  bg:       '#0b0d12',
  panel:    '#111827',
  panel2:   '#0f172a',
  border:   '#1f2937',
  borderHi: '#374151',
  text:     '#e5e7eb',
  textMute: '#9ca3af',
  textDim:  '#6b7280',
  accent:   '#60a5fa',
  accent2:  '#a78bfa',
  ok:       '#34d399',
  warn:     '#f59e0b',
  err:      '#f87171',
  pink:     '#ec4899',
};

const THEME_AD = {
  accent:   '#60a5fa',   // blue   — Stage A
  accent2:  '#a78bfa',   // purple — Stage C
  ok:       '#34d399',   // green  — duration / supporter
  warn:     '#f59e0b',   // amber  — style block
  pink:     '#ec4899',   // pink   — primary input
  bg:       '#0b0d12',
  panel:    '#111827',
  panel2:   '#0f172a',
};

const THEME_MVP = {
  accent:   '#fbbf24',   // gold        — Stage A (hero gold)
  accent2:  '#ec4899',   // hot magenta — Stage C
  ok:       '#fb7185',   // rose        — duration sub
  warn:     '#a855f7',   // violet      — style block (royal vibe)
  pink:     '#f97316',   // fiery orange — primary theme input
  bg:       '#100a0e',   // warm dark
  panel:    '#1a1117',
  panel2:   '#120a0f',
};

function getTheme(category) {
  return category === 'mvp' ? THEME_MVP : THEME_AD;
}

const s = {
  card: {
    background: T.panel,
    border:     `1px solid ${T.border}`,
    borderRadius: 14,
    padding:    20,
  },
  input: {
    background: T.panel2,
    border:     `1px solid ${T.borderHi}`,
    borderRadius: 8,
    padding:    '10px 13px',
    color:      T.text,
    fontSize:   14,
    outline:    'none',
    width:      '100%',
    boxSizing:  'border-box',
    fontFamily: 'inherit',
  },
  label: {
    fontSize:   13,
    fontWeight: 600,
    color:      T.textMute,
    marginBottom: 6,
    display:    'block',
  },
  btn: (col = T.accent, filled = false) => ({
    background:  filled ? col : col + '22',
    color:       filled ? '#0b0d12' : col,
    border:      `1px solid ${col}55`,
    borderRadius: 8,
    padding:     '10px 17px',
    fontSize:    14,
    fontWeight:  600,
    cursor:      'pointer',
    fontFamily:  'inherit',
    whiteSpace:  'nowrap',
  }),
  btnGhost: {
    background: 'transparent',
    color:      T.textMute,
    border:     `1px solid ${T.borderHi}`,
    borderRadius: 6,
    padding:    '7px 12px',
    fontSize:   13,
    cursor:     'pointer',
    fontFamily: 'inherit',
  },
  badge: (col) => ({
    background: col + '22',
    color:      col,
    border:     `1px solid ${col}55`,
    borderRadius: 99,
    padding:    '3px 10px',
    fontSize:   12,
    fontWeight: 700,
    display:    'inline-block',
  }),
  // Section card with colored left border (เห็นจากทั้งหน้าได้ทันที)
  sectionCard: (accent) => ({
    background: T.panel,
    border:     `1px solid ${T.border}`,
    borderLeft: `5px solid ${accent}`,
    borderRadius: 14,
    padding:    20,
    boxShadow:  `0 0 0 1px ${accent}11, 0 12px 24px -16px ${accent}33`,
  }),
  // Sub-panel inside a section (กลุ่มสีอ่อนๆ ไว้คั่น input groups)
  subPanel: (accent) => ({
    background: accent + '0a',
    border:     `1px solid ${accent}33`,
    borderRadius: 10,
    padding:    14,
  }),
  subLabel: (accent) => ({
    fontSize:   11,
    fontWeight: 700,
    color:      accent,
    marginBottom: 8,
    display:    'flex',
    alignItems: 'center',
    gap:        6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }),
  sectionTitle: {
    fontSize:    18,
    fontWeight:  700,
    color:       T.text,
    marginBottom: 14,
    display:     'flex',
    alignItems:  'center',
    gap:         10,
  },
  hint: {
    fontSize: 12,
    color:    T.textDim,
    marginTop: 4,
    lineHeight: 1.55,
  },
};

// ─── Image helpers ──────────────────────────────────────────────────────────

async function compressImage(file, maxDim = 1920, quality = 0.85) {
  const reader = new FileReader();
  const dataUrl = await new Promise((res, rej) => {
    reader.onload  = () => res(reader.result);
    reader.onerror = () => rej(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = () => rej(new Error('โหลดรูปไม่ได้'));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const ratio = width > height ? maxDim / width : maxDim / height;
    width  = Math.round(width  * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function filesToImages(fileList) {
  const out = [];
  for (const file of Array.from(fileList || [])) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const dataUrl = await compressImage(file);
      out.push({
        id:       Math.random().toString(36).slice(2),
        name:     file.name,
        dataUrl,
        mimeType: 'image/jpeg',
      });
    } catch (e) {
      toast.error('โหลดรูปไม่ได้: ' + file.name);
    }
  }
  return out;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว');
  } catch {
    toast.error('คัดลอกไม่สำเร็จ');
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ImageThumbList({ images, onRemove }) {
  if (!images?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
      {images.map(img => (
        <div key={img.id} style={{ position: 'relative' }}>
          <img
            src={img.dataUrl}
            alt={img.name}
            style={{
              width: 72, height: 72, objectFit: 'cover',
              borderRadius: 6, border: `1px solid ${T.borderHi}`,
            }}
          />
          {onRemove && (
            <button
              onClick={() => onRemove(img.id)}
              title="ลบ"
              style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                background: T.err, color: '#000', border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}
            >×</button>
          )}
        </div>
      ))}
    </div>
  );
}

function ImageUploadButton({ multiple, onAdd, label, accent }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const inputRef = useRef(null);
  const col = accent || T.textMute;

  const handleFiles = async (fileList) => {
    setBusy(true);
    try {
      const imgs = await filesToImages(fileList);
      if (imgs.length) onAdd(imgs);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => !busy && inputRef.current?.click()}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragLeave={(e) => {
        // ใช้ relatedTarget เช็คว่าออกจากตัวเองจริงๆ ไม่ใช่เข้าลูกใน
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
      }}
      onDrop={async (e) => {
        if (!e.dataTransfer?.types?.includes('Files')) return;
        e.preventDefault();
        setDragOver(false);
        await handleFiles(e.dataTransfer.files);
      }}
      style={{
        background:   dragOver ? col + '22' : 'transparent',
        border:       `${dragOver ? 2 : 1}px dashed ${dragOver ? col : T.borderHi}`,
        borderRadius: 8,
        padding:      '14px 12px',
        textAlign:    'center',
        color:        dragOver ? col : T.textMute,
        cursor:       busy ? 'wait' : 'pointer',
        fontSize:     12,
        fontWeight:   600,
        transition:   'all 0.12s ease',
        userSelect:   'none',
        opacity:      busy ? 0.6 : 1,
      }}
    >
      {busy ? '⌛ กำลังโหลด…' : (
        <>
          <span style={{ fontSize: 16, marginRight: 4 }}>{dragOver ? '⬇' : '+'}</span>
          {dragOver ? 'วางที่นี่' : (label || 'เพิ่มรูป')}
          <div style={{ fontSize: 10, color: T.textDim, fontWeight: 400, marginTop: 3 }}>
            คลิกหรือลากไฟล์มาวาง · รองรับหลายรูป
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={!!multiple}
        style={{ display: 'none' }}
        onChange={async (e) => {
          await handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

const FRAME_ROLE = {
  start: { label: 'Start frame',       color: T.accent },
  end:   { label: 'End frame',         color: T.accent2 },
  both:  { label: 'Start + End frame', color: T.ok },
};

// ─── StyleCombobox — dropdown + พิมพ์เองได้ ─────────────────────────────────
function StyleCombobox({ value, options, onChange, placeholder, accent }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const col      = accent || T.accent;

  // ปิดเมื่อคลิกนอก
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // ตรวจว่า value ตรงกับ preset ไหน
  const matched = options.find(o => o.value === value);
  const isCustom = !matched && value && value.length > 0;

  // กรอง options เมื่อพิมพ์
  const filtered = filter.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(filter.toLowerCase()) ||
        o.value.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          onChange={e => { onChange(e.target.value); setFilter(e.target.value); }}
          onFocus={() => { setFilter(''); setOpen(true); }}
          style={{
            ...s.input, padding: '7px 10px', fontSize: 12,
            borderColor: open ? col + '99' : T.borderHi,
            paddingRight: 32,
          }}
        />
        <button
          type="button"
          onClick={() => { setFilter(''); setOpen(o => !o); inputRef.current?.focus(); }}
          title="แสดงตัวเลือก"
          style={{
            position: 'absolute', right: 4, top: 4, bottom: 4, width: 26,
            background: 'transparent', border: 'none', color: T.textMute,
            cursor: 'pointer', fontSize: 11, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >▾</button>
      </div>

      {/* Indicator: matched preset / custom */}
      {(matched || isCustom) && (
        <div style={{
          fontSize: 9, marginTop: 3,
          color: isCustom ? T.warn : T.textDim,
          fontWeight: 600, letterSpacing: 0.3,
        }}>
          {isCustom ? '✎ custom' : `✓ ${matched.label}`}
        </div>
      )}

      {open && (
        <div style={{
          position:  'absolute',
          top:       'calc(100% + 4px)',
          left:      0, right: 0,
          background: T.panel,
          border:    `1px solid ${col}66`,
          borderRadius: 8,
          maxHeight: 280, overflowY: 'auto',
          zIndex:    50,
          boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: 10, fontSize: 11, color: T.textDim, textAlign: 'center' }}>
              ไม่มี preset ตรงกัน — ใช้ค่า custom ที่พิมพ์ได้เลย
            </div>
          )}
          {filtered.map((opt, i) => {
            const selected = opt.value === value;
            return (
              <div
                key={i}
                onMouseDown={(e) => {        // mousedown ก่อน blur ทำให้ select ทันก่อน input ปิด
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding:    '8px 10px',
                  cursor:     'pointer',
                  background: selected ? col + '22' : 'transparent',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = col + '11'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: 12, color: T.text, fontWeight: selected ? 700 : 500 }}>
                  {opt.label} {selected && <span style={{ color: col }}>✓</span>}
                </div>
                {opt.value && (
                  <div style={{ fontSize: 10, color: T.textDim, marginTop: 2, fontFamily: 'monospace' }}>
                    {opt.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function AiPromptPage() {
  // ── Auth state ───────────────────────────────────────────────────────────
  const [user,         setUser]         = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [signingIn,    setSigningIn]    = useState(false);

  // ── Provider / API key state ─────────────────────────────────────────────
  const [provider, setProvider] = useState('gemini');
  const [apiKey,   setApiKey]   = useState('');
  const [keyTestStatus, setKeyTestStatus] = useState(null); // null | 'busy' | 'ok' | 'fail'
  const [keyTestMsg,    setKeyTestMsg]    = useState('');
  const [model,    setModel]    = useState(DEFAULT_MODEL.gemini);
  const [showKey,  setShowKey]  = useState(false);

  // image gen model — แยกจาก text model (image gen ใช้ Gemini API key เสมอ)
  const [imageModel, setImageModel] = useState(DEFAULT_MODEL_IMAGE);

  // ── Tab + Project state ──────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState('ad'); // 'ad' | 'mvp'
  const [projectList, setProjectList] = useState([]);   // filtered ตาม activeTab — [{id, name, category, updatedAt}]
  const [project,     setProject]     = useState(null); // full state
  const [hydrated,    setHydrated]    = useState(false);

  // theme ตาม tab — 'ad' = cool blue/purple, 'mvp' = hot gold/magenta
  // หมายเหตุ: เราตั้งใจ "shadow" module-level T ด้วย local binding ในฟังก์ชันนี้
  // เพื่อให้ JSX ที่ reference T.accent/T.bg/etc. หยิบสีตาม tab อัตโนมัติ
  // โดยไม่ต้องแก้ทุกบรรทัด สี non-themable (border/text/err) merge กลับจาก T เดิม
  // sub-component ที่อยู่นอกฟังก์ชัน (StyleCombobox, ImageThumbList, ImageUploadButton)
  // ยังใช้ module T ตามเดิม — ไม่ affected
  // eslint-disable-next-line no-shadow
  const T = useMemo(() => {
    const themed = getTheme(activeTab);
    return {
      // ค่าเดิมจาก module T (border/text/err)
      border:   '#1f2937',
      borderHi: '#374151',
      text:     '#e5e7eb',
      textMute: '#9ca3af',
      textDim:  '#6b7280',
      err:      '#f87171',
      // override ตาม tab
      ...themed,
    };
  }, [activeTab]);

  // FRAME_ROLE ที่ใช้ใน Stage C output — สร้างใหม่ให้สีเปลี่ยนตาม theme
  // eslint-disable-next-line no-shadow
  const FRAME_ROLE = useMemo(() => ({
    start: { label: 'Start frame',       color: T.accent },
    end:   { label: 'End frame',         color: T.accent2 },
    both:  { label: 'Start + End frame', color: T.ok },
  }), [T]);

  // ── Flow stepper — derive ขั้นที่ user อยู่จาก state ────────────────────
  const flowSteps = useMemo(() => {
    if (!project) return [];
    const hasKey         = !!apiKey?.trim();
    const hasBriefOrTheme = project.category === 'mvp'
      ? !!project.transformationTheme?.trim()
      : project.scriptMode === 'script'
        ? ((project.storyboard?.length || 0) > 0 || !!project.scriptText?.trim())
        : !!project.brief?.trim();
    const hasPrompts      = (project.imagePrompts?.shots?.length || 0) > 0;
    const hasAnyGenerated = (project.imagePrompts?.shots || []).some(s => s.generated?.length > 0);
    const hasVideoPlan    = (project.videoPlan?.shots?.length || 0) > 0;
    const hasNarration    = !!project.narration?.audio?.base64;

    // Stage 2 label เปลี่ยนตาม category + mode
    const stageALabel = project.category === 'mvp'
      ? 'Theme + Style + รูป'
      : (project.scriptMode === 'brief'
          ? 'Brief + Style + รูป'
          : 'Script → Story → Style');
    const steps = [
      { num: 1, label: 'Setup',          done: hasKey,           sectionId: 'setup' },
      { num: 2, label: stageALabel,      done: hasBriefOrTheme,  sectionId: 'stageA' },
      { num: 3, label: 'Image prompts',  done: hasPrompts,       sectionId: 'stageA' },
      { num: 4, label: 'Gen รูป',         done: hasAnyGenerated,  sectionId: 'anchors' },
      { num: 5, label: 'Video prompts',  done: hasVideoPlan,     sectionId: 'stageC' },
      { num: 6, label: 'พากย์เสียง',      done: hasNarration,     sectionId: 'narration' },
    ];
    const firstUndone = steps.findIndex(s => !s.done);
    const currentNum = firstUndone === -1 ? steps.length : steps[firstUndone].num;
    return steps.map(s => ({ ...s, current: s.num === currentNum }));
  }, [project, apiKey]);

  const currentStepNum = useMemo(
    () => flowSteps.find(s => s.current)?.num || 1,
    [flowSteps]
  );

  // ── UI state (not persisted) ─────────────────────────────────────────────
  const [genStageA, setGenStageA] = useState(false);
  const [genStoryboardBusy, setGenStoryboardBusy] = useState(false);
  const [genStageC, setGenStageC] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);

  // Refs to avoid race conditions
  const saveDebounceRef = useRef(null);
  const isLoadingRef    = useRef(true);   // กันไม่ให้ save ตอน load ครั้งแรก

  // ── Auth subscription ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        toast.error('Login ไม่สำเร็จ — ลองใหม่');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(auth); } catch {}
    // reset in-memory state — IndexedDB ของเครื่องนี้ยังคงอยู่ ครั้งหน้า login กลับมาก็เห็นเหมือนเดิม
    setProject(null);
    setProjectList([]);
    setHydrated(false);
    isLoadingRef.current = true;
  };

  // ── INIT: hydrate provider/apikey + project list (เมื่อ login แล้วเท่านั้น) ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Provider config
        const cfgGem = await getApiConfig('gemini');
        const cfgCla = await getApiConfig('claude');
        const lastProvider = localStorage.getItem('aiprompt_provider') || 'gemini';
        setProvider(lastProvider);
        const cfg = lastProvider === 'claude' ? cfgCla : cfgGem;
        setApiKey(cfg?.apiKey || '');
        setModel(cfg?.model || DEFAULT_MODEL[lastProvider]);

        // Image model (เก็บใน apiKeys.gemini.imageModel)
        if (cfgGem?.imageModel) setImageModel(cfgGem.imageModel);

        // Tab + Project init — เลือก tab ล่าสุด แล้วโหลด project ของ tab นั้น
        const lastTab = localStorage.getItem('aiprompt_last_tab');
        const tab     = (lastTab === 'mvp' || lastTab === 'ad') ? lastTab : 'ad';
        setActiveTab(tab);

        const lastIdNew = localStorage.getItem(`aiprompt_last_project_id_${tab}`);
        const lastIdOld = localStorage.getItem('aiprompt_last_project_id');  // legacy key
        let target = null;
        if (lastIdNew) target = await loadProject(lastIdNew);
        if (!target && lastIdOld) {
          const legacy = await loadProject(lastIdOld);
          if (legacy && (legacy.category || 'ad') === tab) target = legacy;
        }
        if (!target) {
          // ลอง project ล่าสุดใน category นี้
          const list = await listProjects(tab);
          if (list.length) target = await loadProject(list[0].id);
        }
        if (!target) {
          target = await createProject(tab === 'mvp' ? 'MVP โปรเจกต์แรก' : 'โปรเจกต์แรก', tab);
        }
        setProject(ensureStyleSchema(target));
        setProjectList(await listProjects(tab));
        localStorage.setItem(`aiprompt_last_project_id_${tab}`, target.id);
        localStorage.setItem('aiprompt_last_tab', tab);
      } catch (e) {
        console.error(e);
        toast.error('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
      } finally {
        setHydrated(true);
        // ปลดล็อก save หลัง state นิ่ง 1 tick
        setTimeout(() => { isLoadingRef.current = false; }, 50);
      }
    })();
  }, [user]);

  // ── Save provider config when changed ────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    saveApiConfig(provider, { apiKey, model }).catch(() => {});
    localStorage.setItem('aiprompt_provider', provider);
  }, [provider, apiKey, model, hydrated]);

  // ── Save image model into gemini's apiKey config ─────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      const cfg = (await getApiConfig('gemini')) || { apiKey: '', model: DEFAULT_MODEL.gemini };
      await saveApiConfig('gemini', { ...cfg, imageModel });
    })().catch(() => {});
  }, [imageModel, hydrated]);

  // ── Auto-save project (debounce 700ms) ───────────────────────────────────
  useEffect(() => {
    if (!project || isLoadingRef.current) return;
    setSavingFlag(true);
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        await saveProject(project);
        setProjectList(await listProjects(activeTab));   // refresh dropdown order/names (filtered ตาม tab)
      } catch (e) {
        toast.error('บันทึกไม่สำเร็จ: ' + e.message);
      } finally {
        setSavingFlag(false);
      }
    }, 700);
    return () => clearTimeout(saveDebounceRef.current);
  }, [project]);

  // ── Project mutators (immutable update of `project`) ─────────────────────
  // ถ้า patch มี styleParts/styleExtra → recompute styleBlock อัตโนมัติ (ตาม category)
  const updateProject = useCallback((patch) => {
    setProject(p => {
      if (!p) return p;
      const next = { ...p, ...patch };
      if ('styleParts' in patch || 'styleExtra' in patch) {
        next.styleBlock = composeStyleBlock(next.styleParts, next.styleExtra, next.category);
      }
      return next;
    });
  }, []);

  // ── Switch provider ──────────────────────────────────────────────────────
  const handleProviderChange = async (next) => {
    setProvider(next);
    const cfg = await getApiConfig(next);
    setApiKey(cfg?.apiKey || '');
    setModel(cfg?.model || DEFAULT_MODEL[next]);
  };

  // ── Tab switch ───────────────────────────────────────────────────────────
  const handleSwitchTab = async (newTab) => {
    if (newTab === activeTab) return;
    if (newTab !== 'ad' && newTab !== 'mvp') return;
    isLoadingRef.current = true;
    setActiveTab(newTab);
    localStorage.setItem('aiprompt_last_tab', newTab);

    // load last project ของ tab นั้น (หรือสร้างใหม่ถ้าไม่มี)
    const lastId = localStorage.getItem(`aiprompt_last_project_id_${newTab}`);
    let next = lastId ? await loadProject(lastId) : null;
    if (!next || next.category !== newTab) {
      const list = await listProjects(newTab);
      if (list.length) next = await loadProject(list[0].id);
      else             next = await createProject(newTab === 'mvp' ? 'MVP โปรเจกต์ใหม่' : 'โปรเจกต์ใหม่', newTab);
    }
    setProject(ensureStyleSchema(next));
    setProjectList(await listProjects(newTab));
    localStorage.setItem(`aiprompt_last_project_id_${newTab}`, next.id);
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  };

  // ── Project ops ──────────────────────────────────────────────────────────
  const handleNewProject = async () => {
    const catLabel = activeTab === 'mvp' ? 'MVP' : 'Ad';
    const name = window.prompt(`ชื่อโปรเจกต์ ${catLabel} ใหม่:`, `${catLabel} ${new Date().toLocaleString('th-TH')}`);
    if (!name) return;
    isLoadingRef.current = true;
    const proj = await createProject(name, activeTab);
    setProject(ensureStyleSchema(proj));
    setProjectList(await listProjects(activeTab));
    localStorage.setItem(`aiprompt_last_project_id_${activeTab}`, proj.id);
    setTimeout(() => { isLoadingRef.current = false; }, 50);
    toast.success('สร้างโปรเจกต์แล้ว');
  };

  const handleRenameProject = async () => {
    if (!project) return;
    const name = window.prompt('เปลี่ยนชื่อ:', project.name);
    if (!name || name === project.name) return;
    const updated = await renameProject(project.id, name);
    if (updated) {
      setProject(ensureStyleSchema(updated));
      setProjectList(await listProjects(activeTab));
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(`ลบ "${project.name}" ใช่ไหม? (ลบแล้วเอาคืนไม่ได้)`)) return;
    isLoadingRef.current = true;
    await deleteProject(project.id);
    const list = await listProjects(activeTab);
    let next;
    if (list.length) next = await loadProject(list[0].id);
    else             next = await createProject(activeTab === 'mvp' ? 'MVP โปรเจกต์ใหม่' : 'โปรเจกต์ใหม่', activeTab);
    setProject(ensureStyleSchema(next));
    setProjectList(await listProjects(activeTab));
    localStorage.setItem(`aiprompt_last_project_id_${activeTab}`, next.id);
    setTimeout(() => { isLoadingRef.current = false; }, 50);
    toast.success('ลบแล้ว');
  };

  const handleSwitchProject = async (id) => {
    if (!id || id === project?.id) return;
    isLoadingRef.current = true;
    const proj = await loadProject(id);
    if (proj) {
      setProject(ensureStyleSchema(proj));
      localStorage.setItem(`aiprompt_last_project_id_${activeTab}`, id);
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  };

  // ── Export state ─────────────────────────────────────────────────────────
  const [exportingA, setExportingA] = useState(false);
  const [exportingC, setExportingC] = useState(false);

  // ── Image gen state (busy map ต่อ shot) ─────────────────────────────────
  const [shotGenBusy, setShotGenBusy] = useState({}); // { [shotIdx]: boolean }
  const [genModelBusy, setGenModelBusy] = useState(false); // gen รูปนางแบบ
  // Generic image picker modal — { variants, title, hint, onPick(v), onClose() }
  const [imagePicker, setImagePicker] = useState(null);

  // ── Narration (TTS) state ────────────────────────────────────────────────
  const [narrationBusy, setNarrationBusy] = useState(false);

  // ── Image lightbox (กดรูปใหญ่ดู — Chrome block data: URL ใน new tab แล้ว) ──
  const [lightboxSrc, setLightboxSrc] = useState(null);
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxSrc]);

  // ── Daily generation counter (localStorage — soft warning, ไม่กั้น) ────────
  // นับเฉพาะ image gen + tts gen — text gen ถูก/เร็วไม่ต้องเตือน
  const GEN_COUNTER_KEY = 'aiprompt_gen_counter_v1';
  const [genCount, setGenCount] = useState(0);
  const incGenCount = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const raw = localStorage.getItem(GEN_COUNTER_KEY);
      const data = raw ? JSON.parse(raw) : { day: today, count: 0 };
      const next = data.day === today ? { day: today, count: data.count + 1 } : { day: today, count: 1 };
      localStorage.setItem(GEN_COUNTER_KEY, JSON.stringify(next));
      setGenCount(next.count);
      if (next.count === 50)  toast(`📊 วันนี้ gen ไปแล้ว 50 ครั้ง — เริ่มเปลือง quota แล้วนะ`, { icon: '⚠️' });
      if (next.count === 100) toast(`📊 วันนี้ gen ไปแล้ว 100 ครั้ง!`, { icon: '🚨', duration: 6000 });
    } catch { /* localStorage block — ข้าม */ }
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(GEN_COUNTER_KEY);
      const data = raw ? JSON.parse(raw) : null;
      setGenCount(data?.day === today ? data.count : 0);
    } catch { /* ignore */ }
  }, []);

  // ── Storage usage (IndexedDB quota awareness) ────────────────────────────
  const [storageInfo, setStorageInfo] = useState(null); // { usedMB, quotaMB, percent } | null
  const [projectStats, setProjectStats] = useState([]); // per-project size breakdown
  const refreshStorageInfo = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const usedMB  = (est.usage  || 0) / (1024 * 1024);
        const quotaMB = (est.quota  || 0) / (1024 * 1024);
        const percent = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;
        setStorageInfo({ usedMB, quotaMB, percent });
      }
    } catch { /* navigator.storage ไม่ support — ไม่เป็นไร */ }
  }, []);
  const refreshProjectStats = useCallback(async () => {
    try { setProjectStats(await listProjectsWithStats()); } catch {}
  }, []);
  useEffect(() => {
    refreshStorageInfo();
    refreshProjectStats();
  }, [refreshStorageInfo, refreshProjectStats, project?.updatedAt, project?.id]);

  // ── Image gen helpers ────────────────────────────────────────────────────

  // คืน Gemini API key (ใช้สำหรับ image gen เสมอ ไม่ว่า text provider จะเป็นอะไร)
  const getGeminiKeyForImage = useCallback(async () => {
    if (provider === 'gemini' && apiKey?.trim()) return apiKey;
    const cfg = await getApiConfig('gemini');
    return cfg?.apiKey || '';
  }, [provider, apiKey]);

  // รวม slot ที่ใช้ใน prompts ทั้งหมด
  const slotsUsedInPrompts = useMemo(() => {
    if (!project?.imagePrompts?.shots) return [];
    const set = new Set();
    for (const sh of project.imagePrompts.shots) {
      for (const n of detectSlotsInPrompt(sh.prompt || '')) set.add(n);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [project?.imagePrompts]);

  // เช็คว่า shot นี้พร้อม gen หรือไม่ (anchor ของทุก slot ที่ใช้ใน prompt ครบ)
  const shotReadiness = useCallback((shotPrompt) => {
    const slots = detectSlotsInPrompt(shotPrompt || '');
    const missing = slots.filter(n => !getSlotAnchorImage(project, n));
    return { ready: missing.length === 0, missing, slots };
  }, [project]);

  // Gen รูปนางแบบ (Ad mode) — text description + framing → gen ทีละ 1 (default)
  // append เข้า project.modelGenerated → user ดูแล้วกดเลือก 1 รูป (handleSelectModelGenerated)
  const handleGenModelImage = async (count = 1) => {
    if (!project) return;
    if (project.category !== 'ad') return;
    if (project.modelMode !== 'text' || !project.modelText?.trim()) {
      return toast.error('สลับเป็น "พิมพ์ข้อความ" + กรอกรายละเอียดนางแบบก่อน');
    }
    const key = await getGeminiKeyForImage();
    if (!key) return toast.error('ใส่ Gemini API key ก่อน (ที่ Setup ด้านบน)');

    const framing = project.modelFraming === 'half' ? 'half' : 'full';
    const framingDesc = framing === 'full'
      ? 'FULL-BODY portrait — entire person visible from head to feet, showing the COMPLETE outfit clearly: top/shirt, bottom/pants/skirt, and shoes all visible in frame. Standing pose.'
      : 'HALF-BODY portrait from waist up, showing upper outfit (shirt, accessories) clearly. Confident pose facing camera.';
    const prompt = `Fashion model identity reference photo. ${framingDesc} Subject description: ${project.modelText.trim()}. Neutral confident pose, even soft studio lighting (3-point softbox), plain neutral light-gray seamless background. Photorealistic, sharp focus throughout, natural skin tone, no retouching artifacts. This image will be reused as a CONSISTENT identity reference for an advertisement campaign — keep the model's face, body proportions, and outfit instantly recognizable. STRICT: no text, no letters, no words, no numbers, no watermarks, no logos with text anywhere in the image. The clothing labels (if visible) should be stylized abstract patches without readable typography.`;

    setGenModelBusy(true);
    try {
      const variants = await generateShotImage({
        apiKey: key, model: imageModel, prompt, count,
      });
      const newOnes = variants.map(v => ({
        id: Math.random().toString(36).slice(2),
        name: `gen_model_${framing}.png`,
        dataUrl: v.dataUrl,
        mimeType: v.mimeType,
        framing,
      }));
      updateProject({
        modelGenerated: [...(project.modelGenerated || []), ...newOnes],
      });
      newOnes.forEach(() => incGenCount());
      toast.success(`Gen ${newOnes.length} รูปแล้ว — กดเลือก 1 รูปที่ชอบด้านล่าง`);
    } catch (e) {
      toast.error('Gen ไม่สำเร็จ: ' + e.message);
    } finally {
      setGenModelBusy(false);
    }
  };

  // เลือก 1 รูปจากที่ gen ไว้ → ตั้งเป็น modelImages[0] + สลับโหมดเป็น "อัพโหลดรูป"
  const handleSelectModelGenerated = (genId) => {
    const gen = (project.modelGenerated || []).find(g => g.id === genId);
    if (!gen) return;
    const newImg = {
      id: Math.random().toString(36).slice(2),
      name: gen.name || 'gen_model.png',
      dataUrl: gen.dataUrl,
      mimeType: gen.mimeType,
    };
    updateProject({
      modelMode: 'image',
      modelImages: [newImg],
    });
    toast.success('ตั้งรูปนางแบบแล้ว — สลับไปโหมด "อัพโหลดรูป" อัตโนมัติ');
  };

  // ลบรูปจาก modelGenerated
  const handleDeleteModelGenerated = (genId) => {
    updateProject({
      modelGenerated: (project.modelGenerated || []).filter(g => g.id !== genId),
    });
  };

  // Gen รูปต่อ shot — confirm ก่อน (มี cost)
  const handleGenShot = async (shotIdx, count = 1) => {
    const key = await getGeminiKeyForImage();
    if (!key) return toast.error('ใส่ Gemini API key ก่อน');
    const sh = project.imagePrompts?.shots?.[shotIdx];
    if (!sh) return;

    // Confirm ก่อน gen (estimated cost)
    const estCost = (count * 0.04).toFixed(2);
    if (!window.confirm(`สร้าง ${count} รูปสำหรับ Shot ${shotIdx + 1}?\n\nใช้ Gemini API · ประมาณ $${estCost} (${count} × $0.04)`)) return;

    const slots = detectSlotsInPrompt(sh.prompt);
    const refs = slots.map(n => getSlotAnchorImage(project, n)).filter(Boolean);

    setShotGenBusy(prev => ({ ...prev, [shotIdx]: true }));
    try {
      const variants = await generateShotImage({
        apiKey: key, model: imageModel, prompt: sh.prompt,
        referenceImages: refs, count,
      });
      // append เข้า shots[idx].generated
      const newShots = project.imagePrompts.shots.map((s, i) =>
        i === shotIdx
          ? { ...s, generated: [
              ...(s.generated || []),
              ...variants.map(v => ({ id: Math.random().toString(36).slice(2), ...v })),
            ] }
          : s);
      updateProject({ imagePrompts: { ...project.imagePrompts, shots: newShots } });
      variants.forEach(() => incGenCount());
      toast.success(`Gen ${variants.length} รูปแล้ว`);
    } catch (e) {
      toast.error('Gen ไม่สำเร็จ: ' + e.message);
    } finally {
      setShotGenBusy(prev => ({ ...prev, [shotIdx]: false }));
    }
  };

  // ── Set as main → auto-queue ไป Stage C shotImages ─────────────────────
  // Toggle: ถ้าอันนี้เป็น main อยู่แล้ว → ยกเลิก + ลบจาก shotImages
  // ไม่ใช่ → set เป็น main + insert/replace ใน shotImages เรียงตาม shotIdx
  const handleSetAsMain = (shotIdx, genId) => {
    const sh = project.imagePrompts?.shots?.[shotIdx];
    const gen = sh?.generated?.find(g => g.id === genId);
    if (!gen) return;
    const isCurrent = sh.mainImageId === genId;

    if (isCurrent) {
      // ยกเลิก main
      const newShots = project.imagePrompts.shots.map((s, i) =>
        i === shotIdx ? { ...s, mainImageId: null } : s);
      const newShotImages = (project.shotImages || []).filter(si => si.sourceShotIdx !== shotIdx);
      updateProject({
        imagePrompts: { ...project.imagePrompts, shots: newShots },
        shotImages: newShotImages,
      });
      toast.success(`ยกเลิกรูปหลัก Shot ${shotIdx + 1}`);
      return;
    }

    // Set new main
    const newShots = project.imagePrompts.shots.map((s, i) =>
      i === shotIdx ? { ...s, mainImageId: genId } : s);

    const newShotImage = {
      id: 'main_' + shotIdx + '_' + Math.random().toString(36).slice(2),
      name: `${(project.name || 'shot').replace(/[^\w-]/g, '_')}_shot${shotIdx + 1}.png`,
      dataUrl: gen.dataUrl,
      mimeType: gen.mimeType || 'image/png',
      sourceShotIdx: shotIdx,
    };
    let newShotImages = (project.shotImages || []).filter(si => si.sourceShotIdx !== shotIdx);
    // insert ตามลำดับ shot
    const insertAt = newShotImages.findIndex(si =>
      typeof si.sourceShotIdx === 'number' && si.sourceShotIdx > shotIdx);
    if (insertAt === -1) newShotImages.push(newShotImage);
    else newShotImages.splice(insertAt, 0, newShotImage);

    updateProject({
      imagePrompts: { ...project.imagePrompts, shots: newShots },
      shotImages: newShotImages,
    });
    toast.success(`👑 รูปหลัก Shot ${shotIdx + 1} → ส่งไป STEP ⑤ Stage C แล้ว`);
  };

  // ลบรูปที่ gen ของ shot (clear main + remove จาก Stage C ถ้าเป็น main)
  const handleDeleteGenerated = (shotIdx, genId) => {
    const sh = project.imagePrompts?.shots?.[shotIdx];
    const wasMain = sh?.mainImageId === genId;
    const newShots = project.imagePrompts.shots.map((s, i) =>
      i === shotIdx ? {
        ...s,
        generated: (s.generated || []).filter(g => g.id !== genId),
        mainImageId: wasMain ? null : s.mainImageId,
      } : s);
    const patch = { imagePrompts: { ...project.imagePrompts, shots: newShots } };
    if (wasMain) {
      patch.shotImages = (project.shotImages || []).filter(si => si.sourceShotIdx !== shotIdx);
    }
    updateProject(patch);
  };

  // Download รูป
  const handleDownloadGenerated = (g, shotIdx, variantIdx) => {
    const a = document.createElement('a');
    a.href = g.dataUrl;
    a.download = `${(project.name || 'shot').replace(/[^\w-]/g, '_')}_shot${shotIdx + 1}_v${variantIdx + 1}.png`;
    a.click();
  };

  // ── Narration (TTS) handlers ─────────────────────────────────────────────

  // gen เสียงพากย์ → เก็บลง project.narration.audio (base64 wav)
  const handleGenNarration = async () => {
    if (!project) return;
    const key = await getGeminiKeyForImage();
    if (!key) return toast.error('ใส่ Gemini API key ก่อน (ที่ Setup ด้านบน)');
    const script  = (project.narration?.script  || '').trim();
    const voice   =  project.narration?.voice   || 'Aoede';
    const persona =  project.narration?.persona || '';
    const model   =  project.narration?.model   || GEMINI_31_MODEL;
    if (!script) return toast.error('พิมพ์บทพากย์ก่อน');

    setNarrationBusy(true);
    try {
      const result = await synthesizeNarration({ apiKey: key, script, voice, persona, model });
      updateProject({
        narration: {
          ...(project.narration || {}),
          script, voice, persona, model,
          audio: {
            base64:       result.base64,
            mimeType:     result.mimeType,
            durationSec:  result.durationSec,
            generatedAt:  Date.now(),
            voice, persona,
            model:        result.model,
          },
        },
      });
      incGenCount();
      toast.success(`สร้างเสียงพากย์สำเร็จ (~${result.durationSec.toFixed(1)} วินาที)`);
    } catch (e) {
      toast.error('TTS ล้มเหลว: ' + e.message);
    } finally {
      setNarrationBusy(false);
    }
  };

  // download เสียงพากย์เป็น .wav
  const handleDownloadNarration = () => {
    const a = project.narration?.audio;
    if (!a?.base64) return;
    const namebase = (project.name || 'project').replace(/[^\w-]/g, '_');
    downloadAudioBase64(a.base64, `${namebase}_narration.wav`, a.mimeType || 'audio/wav');
  };

  // Blob URL สำหรับ <audio src> — re-create เมื่อ audio เปลี่ยน + revoke ตอน unmount
  const narrationBlobUrl = useMemo(() => {
    const a = project?.narration?.audio;
    if (!a?.base64) return null;
    return audioBase64ToBlobUrl(a.base64, a.mimeType || 'audio/wav');
  }, [project?.narration?.audio]);

  useEffect(() => {
    return () => {
      if (narrationBlobUrl) URL.revokeObjectURL(narrationBlobUrl);
    };
  }, [narrationBlobUrl]);

  // helper: ดึง main images ของทุก shot ที่ตั้งไว้
  const getMainImagesList = () => (project.imagePrompts?.shots || [])
    .map((s, i) => ({ shotIdx: i, image: s.generated?.find(g => g.id === s.mainImageId) }))
    .filter(x => x.image);

  // ── Save all mains → ดาวน์โหลดลงเครื่อง ──────────────────────────────────
  const handleSaveAllMainsLocal = async () => {
    const mains = getMainImagesList();
    if (!mains.length) return toast.error('ยังไม่มีรูปหลัก — กด 👑 ที่รูปที่ชอบของแต่ละ shot ก่อน');
    if (!window.confirm(
      `ดาวน์โหลดลงเครื่อง ${mains.length} รูปหลัก?\n\n` +
      `ตั้งชื่อ: ${(project.name || 'project').replace(/[^\w-]/g, '_')}_Shot_{N}.png\n\n` +
      'แนะนำเซฟไว้บ่อยๆ — ถ้า browser ล้าง cache/IndexedDB รูปจะหาย'
    )) return;

    const namebase = (project.name || 'project').replace(/[^\w-]/g, '_');
    for (let i = 0; i < mains.length; i++) {
      const { shotIdx, image } = mains[i];
      const a = document.createElement('a');
      a.href = image.dataUrl;
      a.download = `${namebase}_Shot_${shotIdx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < mains.length - 1) await new Promise(r => setTimeout(r, 250));
    }
    toast.success(`ดาวน์โหลด ${mains.length} รูปหลักแล้ว`);
  };

  // ── Save all mains → upload ขึ้น Google Drive (folder ตามชื่อ project) ──
  const [savingDrive, setSavingDrive] = useState(false);
  const handleSaveAllMainsDrive = async () => {
    const mains = getMainImagesList();
    if (!mains.length) return toast.error('ยังไม่มีรูปหลัก — กด 👑 ที่รูปที่ชอบของแต่ละ shot ก่อน');

    const namebase  = (project.name || 'project').trim();
    const stamp     = new Date().toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[/:]/g, '-').replace(/[^\w_-]/g, '_');
    const folderName = `${namebase} (${stamp})`;

    if (!window.confirm(
      `อัพ ${mains.length} รูปหลักขึ้น Google Drive?\n\n` +
      `📁 Folder: "${folderName}"\n` +
      `📄 ไฟล์: Shot_1.png, Shot_2.png, ... Shot_${mains.length}.png\n\n` +
      'ครั้งแรกจะขอสิทธิ์ Google Drive (เฉพาะ folder ที่ app นี้สร้างเท่านั้น)'
    )) return;

    setSavingDrive(true);
    const toastId = toast.loading(`กำลังอัพ 0/${mains.length}…`);
    try {
      const files = mains.map(({ shotIdx, image }) => ({
        name: `Shot_${shotIdx + 1}.png`,
        dataUrl: image.dataUrl,
        mimeType: image.mimeType || 'image/png',
      }));

      const { folderUrl } = await uploadImagesToDrive(folderName, files, (done, total) => {
        toast.loading(`กำลังอัพ ${done}/${total}…`, { id: toastId });
      });

      toast.success(`อัพขึ้น Drive แล้ว ${mains.length} รูป`, { id: toastId, duration: 4000 });
      if (window.confirm('สำเร็จ — เปิด folder ใน Google Drive ตอนนี้?')) {
        window.open(folderUrl, '_blank', 'noopener');
      }
    } catch (e) {
      toast.dismiss(toastId);
      handleExportError(e);
    } finally {
      setSavingDrive(false);
    }
  };

  // Clear ทั้งหมด
  const handleClearAllGenerated = () => {
    if (!window.confirm(
      'ลบรูปที่ gen ทั้งหมด + รูปหลักของทุก shot ของโปรเจกต์นี้ใช่ไหม?\n\n' +
      'รูปที่ส่งไป Stage C (มาจาก main) จะหายด้วย — แนะนำ "💾 Save all mains" ก่อนถ้ายังไม่เซฟ'
    )) return;
    setProject(p => {
      const cleared = clearAllGenerated(p);
      // ลบ shotImages ที่มาจาก main (sourceShotIdx) ออกด้วย — เหลือแต่ที่ user upload เอง
      cleared.shotImages = (p.shotImages || []).filter(si => typeof si.sourceShotIdx !== 'number');
      return cleared;
    });
    toast.success('ล้างรูปที่ gen แล้ว');
  };

  // ── Helper: handle export errors (รวมไว้เพราะ Stage A/C ใช้เหมือนกัน) ─
  const handleExportError = (e) => {
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
      return; // ผู้ใช้ปิด popup เอง — เงียบไว้
    }
    if ((e?.code === 'docs-api-disabled' || e?.code === 'drive-api-disabled') && e?.enableUrl) {
      const apiName = e.code === 'drive-api-disabled' ? 'Google Drive API' : 'Google Docs API';
      const ok = window.confirm(
        `${apiName} ยังไม่ได้เปิดใน Google Cloud Console ของโปรเจกต์นี้\n\n` +
        'ขั้นตอน:\n' +
        '1. กด OK เพื่อเปิดหน้า Console (แถบใหม่)\n' +
        '2. กดปุ่ม "ENABLE" / "เปิดใช้"\n' +
        '3. รอประมาณ 1-2 นาที แล้วกลับมาลองใหม่\n\n' +
        'เปิด Console ตอนนี้?'
      );
      if (ok) window.open(e.enableUrl, '_blank', 'noopener');
      return;
    }
    toast.error('Export ไม่สำเร็จ: ' + (e?.message || 'unknown'));
  };

  const handleExportImagePrompts = async () => {
    if (!project?.imagePrompts?.shots?.length) return toast.error('ยังไม่มี image prompts');
    setExportingA(true);
    try {
      const url = await exportToGoogleDoc(
        `${project.name} — Image Prompts`,
        buildImagePromptsDoc(project),
      );
      window.open(url, '_blank', 'noopener');
      toast.success('Export เปิดในแถบใหม่แล้ว');
    } catch (e) {
      handleExportError(e);
    } finally {
      setExportingA(false);
    }
  };

  const handleExportVideoPrompts = async () => {
    if (!project?.videoPlan?.shots?.length) return toast.error('ยังไม่มี video prompts');
    setExportingC(true);
    try {
      const url = await exportToGoogleDoc(
        `${project.name} — Video Prompts`,
        buildVideoPromptsDoc(project),
      );
      window.open(url, '_blank', 'noopener');
      toast.success('Export เปิดในแถบใหม่แล้ว');
    } catch (e) {
      handleExportError(e);
    } finally {
      setExportingC(false);
    }
  };

  // ── Stage A: Generate image prompts ──────────────────────────────────────
  const shotCount = useMemo(() => {
    if (!project) return 0;
    return Math.max(1, Math.ceil((project.totalDuration || 40) / (project.perShotDuration || 6)));
  }, [project?.totalDuration, project?.perShotDuration]);

  const handleGenerateImagePrompts = async () => {
    if (!project)        return;
    if (!apiKey.trim())  return toast.error('กรอก API key ก่อน');

    const isScriptMode = project.category !== 'mvp' && project.scriptMode === 'script';

    if (isScriptMode) {
      if ((project.storyboard?.length || 0) === 0) {
        return toast.error('แตก storyboard ก่อน — กดปุ่ม "AI แตก script → storyboard"');
      }
    } else {
      if (project.category !== 'mvp' && !project.brief?.trim()) return toast.error('กรอก brief ลูกค้าก่อน');
    }
    if (project.category === 'mvp' && !project.transformationTheme?.trim()) return toast.error('กรอก Transformation theme ก่อน');

    // Confirm — text gen ราคาน้อยกว่า image แต่ก็ยังคิด token
    const sc = isScriptMode
      ? project.storyboard.length
      : Math.max(1, Math.ceil((project.totalDuration || 40) / (project.perShotDuration || 6)));
    const overwrite = (project.imagePrompts?.shots?.length || 0) > 0;
    const modeLabel = isScriptMode ? ' (Script-driven จาก storyboard)' : '';
    const msg = `สร้าง ${sc} image prompts${modeLabel} ${overwrite ? '(ทับของเดิม)' : ''}?\n\nใช้ ${provider === 'gemini' ? 'Gemini' : 'Claude'} ${model}\n· คิดเงินตาม token usage (text gen ~$0.001-0.01)`;
    if (!window.confirm(msg)) return;

    setGenStageA(true);
    try {
      const fn = project.category === 'mvp'
        ? generateMvpImagePrompts
        : isScriptMode
          ? generateImagePromptsFromStoryboard
          : generateImagePrompts;
      const result = await fn({ provider, model, apiKey, project });
      updateProject({ imagePrompts: result });
      // Auto-fill Stage 6 narration.script ถ้ายังว่างและยังไม่ gen audio
      if (isScriptMode && project.scriptText
          && !project.narration?.audio?.base64
          && !project.narration?.script) {
        updateProject({
          narration: { ...(project.narration || {}), script: project.scriptText },
        });
      }
      toast.success(`ได้ ${result.shots.length} prompts`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGenStageA(false);
    }
  };

  // ── Stage A (alt) — Script → Storyboard ──────────────────────────────────
  const handleGenStoryboard = async () => {
    if (!project) return;
    if (!apiKey?.trim()) return toast.error('กรอก API key ก่อน');
    if (!project.scriptText?.trim()) return toast.error('paste voiceover script ก่อน');
    if ((project.storyboard?.length || 0) > 0) {
      if (!window.confirm('มี storyboard อยู่แล้ว — แตกใหม่ทับของเดิม?')) return;
    }
    setGenStoryboardBusy(true);
    try {
      const result = await generateStoryboardFromScript({ provider, model, apiKey, project });
      updateProject({ storyboard: result.segments });
      toast.success(`แตก storyboard ${result.segments.length} segments แล้ว — แก้ visual ด้านล่างได้`);
    } catch (e) {
      toast.error('แตก storyboard ไม่สำเร็จ: ' + e.message);
    } finally {
      setGenStoryboardBusy(false);
    }
  };

  // ── Stage C: Generate video prompts ──────────────────────────────────────
  const handleGenerateVideoPrompts = async () => {
    if (!project)       return;
    if (!apiKey.trim()) return toast.error('กรอก API key ก่อน');
    if (!project.shotImages?.length) return toast.error('อัพโหลดรูปอย่างน้อย 1 รูปก่อน');

    const overwrite = (project.videoPlan?.shots?.length || 0) > 0;
    const msg = `สร้าง video prompts จาก ${project.shotImages.length} รูป ${overwrite ? '(ทับของเดิม)' : ''}?\n\nใช้ ${provider === 'gemini' ? 'Gemini' : 'Claude'} ${model} (vision)\n· คิดเงินตาม token usage + image input`;
    if (!window.confirm(msg)) return;

    setGenStageC(true);
    try {
      const fn = project.category === 'mvp' ? generateMvpVideoPrompts : generateVideoPrompts;
      const result = await fn({ provider, model, apiKey, project });
      updateProject({ videoPlan: result });
      toast.success('สร้าง video plan แล้ว');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGenStageC(false);
    }
  };

  // ── Reorder shotImages via drag&drop ────────────────────────────────────
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(project.shotImages || []);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    updateProject({ shotImages: items });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Gate 1: ตรวจ auth ────────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.textMute,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        กำลังตรวจสอบ…
      </div>
    );
  }

  // ── Gate 2: ยังไม่ login → แสดง sign-in card ────────────────────────────
  if (!user) {
    return (
      <>
        <Head><title>เข้าสู่ระบบ — AI Prompt Generator</title></Head>
        <div style={{
          minHeight: '100vh', background: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          fontFamily: 'Inter, "Noto Sans Thai", system-ui, sans-serif',
        }}>
          <div style={{ ...s.card, maxWidth: 420, width: '100%', textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accent2} 100%)`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: '#0b0d12',
              marginBottom: 16,
            }}>AI</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: T.text }}>
              Video Ad Prompt Generator
            </h1>
            <p style={{ fontSize: 13, color: T.textMute, margin: '0 0 24px', lineHeight: 1.6 }}>
              เข้าสู่ระบบด้วย Google เพื่อใช้งาน<br />
              <span style={{ color: T.textDim, fontSize: 11 }}>
                ข้อมูล/API key ทั้งหมดเก็บในเครื่องคุณเท่านั้น
              </span>
            </p>
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: `1px solid ${T.borderHi}`, background: '#fff', color: '#1f1f1f',
                fontSize: 14, fontWeight: 600, cursor: signingIn ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: signingIn ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {signingIn ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Gate 3: login แล้ว แต่ data ยังโหลดไม่เสร็จ ─────────────────────────
  if (!hydrated || !project) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.textMute,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        กำลังโหลด…
      </div>
    );
  }

  const allPromptsText = (project.imagePrompts?.shots || [])
    .map((sh, i) => `# Shot ${i + 1}\n${sh.prompt}`)
    .join('\n\n');

  return (
    <>
      <Head>
        <title>AI Video Prompt Generator — ttsam.app</title>
        <meta name="description" content="สร้าง prompt ภาพ + วีดีโอ สำหรับ Video โฆษณา + MVP TikTok live" />
      </Head>

      {/* Global keyframes สำหรับ flow indicators (pulse step + arrow) */}
      <style>{`
        @keyframes ttplusPulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 ${T.accent}00; }
          50%      { box-shadow: 0 0 0 4px ${T.accent}55; }
        }
        @keyframes ttplusPulseArrow {
          0%, 100% { opacity: 0.45; transform: translateY(-3px); }
          50%      { opacity: 1;    transform: translateY(3px); }
        }
        @keyframes ttplusBtnPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${T.accent}00; transform: scale(1); }
          50%      { box-shadow: 0 0 0 6px ${T.accent}40; transform: scale(1.02); }
        }
        /* Stage 6 — TTS waveform skeleton (loading) */
        @keyframes ttplusWave1 { 0%,100% { height: 18%; } 50% { height: 70%; } }
        @keyframes ttplusWave2 { 0%,100% { height: 50%; } 50% { height: 90%; } }
        @keyframes ttplusWave3 { 0%,100% { height: 30%; } 50% { height: 100%; } }
        @keyframes ttplusWave4 { 0%,100% { height: 80%; } 50% { height: 25%; } }
        @keyframes ttplusWave5 { 0%,100% { height: 40%; } 50% { height: 75%; } }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: T.bg,
        color:      T.text,
        fontFamily: 'Inter, "Noto Sans Thai", system-ui, sans-serif',
        padding:    '24px 16px 80px',
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <header style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accent2} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#0b0d12',
            }}>AI</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: T.text }}>
                AI Video Prompt Generator
              </h1>
              <p style={{ fontSize: 12, color: T.textMute, margin: '2px 0 0' }}>
                Video โฆษณาสินค้า + MVP hype clip สำหรับ TikTok live
                <span style={{ color: T.textDim }}> · ทุกอย่างทำงานในเครื่องคุณ ไม่ส่ง API key ไปไหน</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11,
                color:    savingFlag ? T.warn : T.ok,
                fontWeight: 600,
              }}>{savingFlag ? '● กำลังบันทึก…' : '✓ บันทึกแล้ว'}</span>
              <span style={{ width: 1, height: 16, background: T.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.photoURL && (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
                    style={{ width: 24, height: 24, borderRadius: '50%' }} />
                )}
                <span style={{ fontSize: 11, color: T.textMute, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={user.email || ''}>
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  style={{ ...s.btnGhost, padding: '4px 8px', fontSize: 10 }}
                  title="ออกจากระบบ"
                >ออก</button>
              </div>
            </div>
          </header>

          {/* ── Flow Stepper — บอก user ทำขั้นไหนต่อ ─────────────── */}
          <div style={{
            display: 'flex', gap: 4, alignItems: 'center',
            background: T.panel, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '8px 10px', marginBottom: 10,
            overflowX: 'auto', whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 10, color: T.textDim, fontWeight: 700, padding: '0 6px', flexShrink: 0 }}>
              FLOW:
            </span>
            {flowSteps.map((step, i) => (
              <React.Fragment key={step.num}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 8,
                  background: step.current ? T.accent + '22' : (step.done ? T.ok + '14' : 'transparent'),
                  border:     `1px solid ${step.current ? T.accent + 'cc' : (step.done ? T.ok + '55' : 'transparent')}`,
                  flexShrink: 0,
                  animation: step.current ? 'ttplusPulseGlow 1.6s ease-in-out infinite' : 'none',
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: step.done ? T.ok : (step.current ? T.accent : T.borderHi),
                    color: (step.done || step.current) ? '#0b0d12' : T.textMute,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                  }}>{step.done ? '✓' : step.num}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: step.current ? T.accent : (step.done ? T.ok : T.textMute),
                  }}>{step.label}</span>
                </div>
                {i < flowSteps.length - 1 && (
                  <span style={{ color: T.textDim, fontSize: 12, padding: '0 1px', flexShrink: 0 }}>▶</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Tab bar — Video Ad / Video MVP ─────────────────────── */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 18,
            background: T.panel,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 5,
          }}>
            {CATEGORIES.map(cat => {
              const active = activeTab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleSwitchTab(cat.key)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 9,
                    border: 'none',
                    background: active ? cat.accent : 'transparent',
                    color:      active ? '#0b0d12' : T.textMute,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: active ? `0 4px 14px -4px ${cat.accent}` : 'none',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = cat.accent + '14'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span>{cat.label.replace(cat.icon + ' ', '')}</span>
                  {active && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(0,0,0,0.2)', fontWeight: 600,
                    }}>active</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Setup card ─────────────────────────────────────────── */}
          <div style={{ ...s.sectionCard(T.textMute), marginBottom: 0 }}>
            <div style={{ ...s.sectionTitle, fontSize: 14, marginBottom: 14, color: T.textMute }}>
              <span style={{
                ...s.badge(T.textMute), fontSize: 12, padding: '4px 10px',
                background: T.textMute + '22', color: T.text,
              }}>STEP ①</span>
              <span style={{ color: T.textMute }}>⚙</span> Setup — provider, key, project
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {/* Provider */}
              <div>
                <label style={s.label}>Provider</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['gemini', 'claude'].map(p => (
                    <button
                      key={p}
                      onClick={() => handleProviderChange(p)}
                      style={{
                        ...s.btn(provider === p ? T.accent : T.borderHi, provider === p),
                        flex: 1, padding: '8px 12px', fontSize: 12,
                      }}
                    >{p === 'gemini' ? 'Gemini' : 'Claude'}</button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div>
                <label style={s.label}>Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={s.input}
                >
                  {(MODELS[provider] || []).map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* API key */}
              <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
                <label style={s.label}>
                  API key ({provider === 'gemini' ? 'Google AI Studio' : 'Anthropic Console'})
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setKeyTestStatus(null); }}
                    placeholder={provider === 'gemini' ? 'AIza…' : 'sk-ant-…'}
                    style={{ ...s.input, fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    style={s.btnGhost}
                    title={showKey ? 'ซ่อน' : 'แสดง'}
                  >{showKey ? '🙈' : '👁'}</button>
                  <button
                    onClick={async () => {
                      if (!apiKey?.trim()) { setKeyTestStatus('fail'); setKeyTestMsg('ใส่ key ก่อน'); return; }
                      setKeyTestStatus('busy'); setKeyTestMsg('');
                      try {
                        await testApiKey({ provider, apiKey });
                        setKeyTestStatus('ok'); setKeyTestMsg('Key ใช้งานได้');
                      } catch (e) {
                        setKeyTestStatus('fail'); setKeyTestMsg(e.message || 'ทดสอบไม่ผ่าน');
                      }
                    }}
                    disabled={keyTestStatus === 'busy' || !apiKey?.trim()}
                    style={{
                      ...s.btnGhost,
                      borderColor:
                        keyTestStatus === 'ok'   ? T.ok :
                        keyTestStatus === 'fail' ? T.err :
                        T.borderHi,
                      color:
                        keyTestStatus === 'ok'   ? T.ok :
                        keyTestStatus === 'fail' ? T.err :
                        T.text,
                      opacity: !apiKey?.trim() ? 0.5 : 1,
                      cursor: keyTestStatus === 'busy' ? 'wait' : (!apiKey?.trim() ? 'not-allowed' : 'pointer'),
                      whiteSpace: 'nowrap',
                    }}
                    title="ทดสอบว่า key เรียก API ได้จริง"
                  >
                    {keyTestStatus === 'busy' ? '⌛ กำลังเทส…' :
                     keyTestStatus === 'ok'   ? '✓ Key OK' :
                     keyTestStatus === 'fail' ? '✗ Key ไม่ผ่าน' :
                     '🔍 Test key'}
                  </button>
                </div>
                {keyTestStatus === 'fail' && keyTestMsg && (
                  <div style={{
                    fontSize: 11, color: T.err, marginTop: 4,
                    background: T.err + '11', padding: '6px 10px',
                    borderRadius: 4, lineHeight: 1.5,
                  }}>
                    ⚠ {keyTestMsg}
                  </div>
                )}
                <div style={s.hint}>
                  เก็บใน browser ของคุณเท่านั้น (IndexedDB) ไม่ส่งไป server ttsam · {' '}
                  {provider === 'gemini'
                    ? <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: T.accent }}>ขอ Gemini key ฟรี</a>
                    : <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: T.accent }}>ขอ Claude key</a>
                  }
                </div>
              </div>
            </div>

            {/* Image gen model — แยก row (ใช้ Gemini API key เสมอ) */}
            <div style={{
              marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`,
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'minmax(140px, auto) 1fr', gap: 12, alignItems: 'center',
              }}>
                <label style={{ ...s.label, marginBottom: 0 }}>
                  🖼 Image gen model
                  <div style={{ fontSize: 9, color: T.textDim, fontWeight: 400, marginTop: 2 }}>
                    (ใช้ Gemini key)
                  </div>
                </label>
                <select
                  value={imageModel}
                  onChange={e => setImageModel(e.target.value)}
                  style={s.input}
                >
                  {MODELS_IMAGE.map(m => (
                    <option key={m.id} value={m.id}>{m.label}{m.note ? ` — ${m.note}` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{
                marginTop: 8,
                background: T.warn + '11', border: `1px solid ${T.warn}33`,
                borderRadius: 6, padding: '8px 10px',
                fontSize: 11, color: T.textMute, lineHeight: 1.6,
              }}>
                💡 ถ้ากด Gen แล้วเจอ <code style={{ color: T.warn, background: T.bg, padding: '1px 4px', borderRadius: 3 }}>403 / API not enabled</code> →
                เปิด Generative Language API ใน Cloud Console:{' '}
                <a
                  href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
                  target="_blank" rel="noreferrer"
                  style={{ color: T.warn, fontWeight: 600 }}
                >
                  เปิดที่นี่ ▶
                </a>
                {' '}กดปุ่ม <strong>ENABLE</strong> แล้วรอ 1-2 นาที
              </div>
            </div>

            {/* Project bar */}
            <div style={{
              marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ ...s.label, marginBottom: 0, marginRight: 4 }}>Project:</span>
              <select
                value={project.id}
                onChange={e => handleSwitchProject(e.target.value)}
                style={{ ...s.input, width: 'auto', minWidth: 200, flex: '0 1 280px' }}
              >
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={handleNewProject}    style={s.btnGhost}>+ ใหม่</button>
              <button onClick={handleRenameProject} style={s.btnGhost}>เปลี่ยนชื่อ</button>
              <button
                onClick={handleDeleteProject}
                style={{ ...s.btnGhost, color: T.err, borderColor: T.err + '55' }}
              >ลบ</button>
            </div>
          </div>

          {/* Flow arrow Setup → Stage A */}
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '8px 0',
          }}>
            <span style={{
              fontSize: 28, color: currentStepNum >= 2 && currentStepNum <= 4 ? T.accent : T.textDim,
              animation: currentStepNum === 2 ? 'ttplusPulseArrow 1.4s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }}>▼</span>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* STAGE A — Brief → Image Prompts                          */}
          {/* ─────────────────────────────────────────────────────── */}
          <div style={{ ...s.sectionCard(T.accent), marginBottom: 0 }}>
            <div style={{ ...s.sectionTitle, color: T.accent }}>
              <span style={{
                ...s.badge(T.accent), fontSize: 12, padding: '4px 10px',
                background: T.accent, color: '#0b0d12',
              }}>STEP ②③④</span>
              <span style={s.badge(T.accent)}>STAGE A</span>
              {project.category === 'mvp' ? 'รูปผู้ส่ง + Theme → Image Prompts → Gen' : 'Brief → Image Prompts → Gen'}
            </div>

            {/* Duration */}
            {/* ── Sub: Duration (green) ───────────────────────────── */}
            <div style={{ ...s.subPanel(T.ok), marginBottom: 12 }}>
              <div style={s.subLabel(T.ok)}>⏱ Duration</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>ความยาวรวม (วินาที)</label>
                  <input type="number" min={6} value={project.totalDuration}
                    onChange={e => updateProject({ totalDuration: Number(e.target.value) || 0 })}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>ต่อ shot (วินาที)</label>
                  <input type="number" min={1} value={project.perShotDuration}
                    onChange={e => updateProject({ perShotDuration: Number(e.target.value) || 1 })}
                    style={s.input} />
                </div>
                <div>
                  <label style={s.label}>จำนวน shot</label>
                  <div style={{ ...s.input, background: T.ok + '11', borderColor: T.ok + '55', color: T.ok, fontWeight: 800, textAlign: 'center' }}>
                    {shotCount} shots
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sub: Style block (amber) — MVP เท่านั้น (AD ย้ายไปอยู่ในลำดับ Step ④) ── */}
            {project.category === 'mvp' && (
              <div style={{ ...s.subPanel(T.warn), marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ ...s.subLabel(T.warn), marginBottom: 0 }}>
                    🎨 Style block
                    <span style={{ marginLeft: 6, fontSize: 9, color: T.textDim, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                      (ต่อท้ายทุก prompt · เลือก preset หรือพิมพ์เองได้)
                    </span>
                  </div>
                  <button
                    onClick={() => updateProject({ styleParts: { ...getDefaultStyleParts(project.category) }, styleExtra: '' })}
                    style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 10, borderColor: T.warn + '55', color: T.warn }}
                    title="คืนค่า default"
                  >↺ reset all</button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 10,
                }}>
                  {getStyleFields(project.category).map(field => (
                    <div key={field.key}>
                      <div style={{ fontSize: 10, color: T.warn, marginBottom: 3, fontWeight: 700, opacity: 0.85 }}>
                        {field.label}
                      </div>
                      <StyleCombobox
                        value={project.styleParts?.[field.key] ?? ''}
                        options={field.options}
                        accent={T.warn}
                        placeholder="พิมพ์ระบุเอง หรือเลือก preset…"
                        onChange={(v) => updateProject({
                          styleParts: { ...(project.styleParts || {}), [field.key]: v },
                        })}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.warn}33` }}>
                  <div style={{ fontSize: 10, color: T.warn, marginBottom: 3, fontWeight: 700, opacity: 0.85 }}>
                    + Custom append (อะไรก็ได้ที่อยากเติม)
                  </div>
                  <input
                    type="text"
                    value={project.styleExtra || ''}
                    onChange={e => updateProject({ styleExtra: e.target.value })}
                    placeholder="เช่น: warm orange teal color grading, 2.39:1 aspect ratio"
                    style={{ ...s.input, padding: '7px 10px', fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {project.category === 'mvp' ? (
              <>
                {/* ── MVP: Transformation theme (pink — primary input) ── */}
                <div style={{ ...s.subPanel(T.pink), marginBottom: 12 }}>
                  <div style={s.subLabel(T.pink)}>🦸 Transformation theme</div>
                  <textarea
                    value={project.transformationTheme || ''}
                    onChange={e => updateProject({ transformationTheme: e.target.value })}
                    rows={4}
                    placeholder="เช่น: แปลงเป็น superhero ใส่ชุดเกราะทอง บินอยู่เหนือเมือง&#10;หรือ: anime warrior with glowing magical aura, samurai armor, cherry blossom petals&#10;หรือ: cyberpunk hacker in neon Tokyo alley, holographic visor, rain"
                    style={{ ...s.input, resize: 'vertical', borderColor: T.pink + '55' }}
                  />
                  <div style={s.hint}>
                    ระบุว่าอยากให้ผู้ส่งของขวัญ "กลายเป็น" อะไร — AI จะรักษาหน้าให้เหมือน แต่เปลี่ยนชุด/ฉาก/ท่าตามนี้
                  </div>
                </div>

                {/* ── MVP: References (green) ──────────────────────── */}
                <div style={{ ...s.subPanel(T.ok), marginBottom: 14 }}>
                  <div style={s.subLabel(T.ok)}>🏆 ผู้ส่ง + Branding</div>
                  <div style={{
                    fontSize: 11, color: T.textMute, lineHeight: 1.6,
                    background: T.panel2, border: `1px solid ${T.border}`,
                    borderRadius: 6, padding: '8px 10px', marginBottom: 10,
                  }}>
                    💡 <strong>2 slot คงที่</strong>: <span style={{ color: T.warn }}>#1 = หน้าผู้ส่ง</span> · <span style={{ color: T.accent2 }}>#2 = VJ branding</span><br />
                    prompt จะใส่คำว่า <code style={{ color: T.text, background: T.bg, padding: '1px 4px', borderRadius: 3 }}>"reference from input image #N"</code> ทั้ง 2 slot <strong>เสมอ</strong> — ไปอัพโหลดที่ Midjourney/Nano Banana ตามลำดับ<br />
                    ที่อัพโหลดที่นี่ = AI จะเห็นรูปด้วย vision และบรรยายลง prompt เพิ่ม (เช่น สีผิว/ทรงผม/โลโก้) ทำให้ prompt informative ขึ้น
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    {/* Supporter (slot #1) */}
                    <div style={{
                      background: T.warn + '08', border: `1px dashed ${T.warn}44`,
                      borderRadius: 8, padding: 10,
                    }}>
                      <label style={{ ...s.label, color: T.warn, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>รูปผู้ส่ง ★ สำคัญ (ต้องมี)</span>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>#1</span>
                      </label>
                      <ImageUploadButton multiple label="เพิ่มรูปผู้ส่ง" accent={T.warn}
                        onAdd={imgs => updateProject({ supporterImages: [...(project.supporterImages || []), ...imgs] })} />
                      <div style={{ ...s.hint, color: T.warn, opacity: 0.8 }}>
                        prompt จะใส่ <code style={{ background: T.bg, padding: '1px 4px', borderRadius: 3 }}>image #1</code> เสมอ
                        {(project.supporterImages || []).length > 0 && ' · AI จะบรรยายหน้า/ลักษณะจากรูปด้วย'}
                      </div>
                      <ImageThumbList
                        images={project.supporterImages}
                        onRemove={id => updateProject({ supporterImages: project.supporterImages.filter(i => i.id !== id) })}
                      />
                    </div>

                    {/* VJ branding (slot #2) */}
                    <div style={{
                      background: T.accent2 + '08', border: `1px dashed ${T.accent2}44`,
                      borderRadius: 8, padding: 10,
                    }}>
                      <label style={{ ...s.label, color: T.accent2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>VJ branding <span style={{ color: T.textDim, fontWeight: 400, fontSize: 10 }}>(optional)</span></span>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>#2</span>
                      </label>
                      <ImageUploadButton multiple label="เพิ่ม logo / สี / branding" accent={T.accent2}
                        onAdd={imgs => updateProject({ vjBrandImages: [...(project.vjBrandImages || []), ...imgs] })} />
                      <div style={{ ...s.hint, color: T.accent2, opacity: 0.8 }}>
                        prompt จะใส่ <code style={{ background: T.bg, padding: '1px 4px', borderRadius: 3 }}>image #2</code> เสมอ
                        {(project.vjBrandImages || []).length > 0 && ' · AI จะบรรยาย logo/สีจากรูปด้วย'}
                      </div>
                      <ImageThumbList
                        images={project.vjBrandImages}
                        onRemove={id => updateProject({ vjBrandImages: project.vjBrandImages.filter(i => i.id !== id) })}
                      />
                    </div>
                  </div>
                  <div style={{
                    marginTop: 10,
                    background: T.pink + '11', border: `1px solid ${T.pink}33`,
                    borderRadius: 6, padding: '8px 10px',
                    fontSize: 11, color: T.pink, lineHeight: 1.6,
                  }}>
                    💡 prompt จะระบุให้ AI <strong>เว้น negative space</strong> ไว้ในแต่ละรูป — เอาไว้ overlay ชื่อ/เลขของขวัญ ตอน post-prod (CapCut/Premiere) เอง
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Default = Script mode · Brief mode = advanced option */}
                {(project.scriptMode || 'script') === 'brief' ? (
                  /* ── Brief mode (เปิดผ่าน collapsible เท่านั้น) ── */
                  <>
                    <div style={{
                      background: T.warn + '11', border: `1px solid ${T.warn}33`,
                      borderRadius: 8, padding: '10px 12px', marginBottom: 10,
                      fontSize: 12, color: T.warn,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      flexWrap: 'wrap',
                    }}>
                      <span>
                        ⚠ ตอนนี้อยู่ในโหมด <strong>Brief</strong> (เขียน brief อิสระ)
                      </span>
                      <button
                        onClick={() => updateProject({ scriptMode: 'script' })}
                        style={{
                          ...s.btn(T.pink, true), padding: '5px 12px', fontSize: 12,
                          fontWeight: 700,
                        }}
                      >🎬 กลับไปใช้ Script mode (แนะนำ)</button>
                    </div>
                    <div style={{ ...s.subPanel(T.pink), marginBottom: 12 }}>
                      <div style={s.subLabel(T.pink)}>📝 Brief จากลูกค้า</div>
                      <textarea
                        value={project.brief}
                        onChange={e => updateProject({ brief: e.target.value })}
                        rows={5}
                        placeholder="วาง brief / สคริปต์บทพูดของลูกค้าที่นี่ ~1 พารากราฟ&#10;เช่น: ครีมบำรุงผิวสำหรับวัย 30+ เน้นกระชับและยืดหยุ่น ใช้ส่วนผสมจากธรรมชาติ..."
                        style={{ ...s.input, resize: 'vertical', borderColor: T.pink + '55' }}
                      />
                    </div>
                  </>
                ) : (
                  /* ── Script mode (default) ─────────────────────── */
                  <>
                    {/* Optional product context — ใช้ brief field เดิม */}
                    <div style={{
                      ...s.subPanel(T.textMute), marginBottom: 10,
                      borderColor: T.borderHi,
                    }}>
                      <div style={{
                        fontSize: 12, color: T.textMute, fontWeight: 600, marginBottom: 6,
                      }}>
                        Product context (optional — ช่วย AI เข้าใจสินค้า)
                      </div>
                      <input
                        type="text"
                        value={project.brief || ''}
                        onChange={e => updateProject({ brief: e.target.value })}
                        placeholder="เช่น: ครีมขัดผิวจากกาแฟ · กลุ่มเป้าหมาย หญิง 25-40"
                        style={{ ...s.input, fontSize: 13 }}
                      />
                    </div>

                    {/* Script paste */}
                    <div style={{ ...s.subPanel(T.pink), marginBottom: 10 }}>
                      <div style={{ ...s.subLabel(T.pink), fontSize: 13 }}>
                        🎬 Voiceover Script ทั้งคลิป
                      </div>
                      <textarea
                        value={project.scriptText || ''}
                        onChange={e => updateProject({ scriptText: e.target.value })}
                        placeholder={`วาง voiceover ทั้งคลิปที่นี่...\n\nเช่น:\nฮันนี่ สครัปกาแฟ\nหน้าร้อนนี้ไม่ต้องสนใคร ไม่ต้องไปเที่ยวที่ไหน\nแค่พักผิวกายกับสครัปกาแฟ กลิ่นหอมๆ ก็พอ\n...`}
                        rows={8}
                        style={{
                          ...s.input, minHeight: 200, fontSize: 14, lineHeight: 1.7,
                          resize: 'vertical', borderColor: T.pink + '88', borderWidth: 1.5,
                          padding: '12px 14px',
                        }}
                      />
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 6, lineHeight: 1.55 }}>
                        AI จะแตกเป็น <strong style={{ color: T.text }}>{Math.max(1, Math.ceil((project.totalDuration || 40) / (project.perShotDuration || 6)))} ส่วน</strong>
                        {' '}({project.totalDuration || 40}s ÷ {project.perShotDuration || 6}s ต่อ shot) ·
                        ลำดับและคำของคุณจะถูกรักษาไว้ · script นี้ใช้ใน Stage 6 TTS ได้ด้วย
                      </div>
                      <button
                        onClick={handleGenStoryboard}
                        disabled={genStoryboardBusy || !project.scriptText?.trim() || !apiKey?.trim()}
                        style={{
                          ...s.btn(T.pink, true),
                          marginTop: 12, width: '100%',
                          padding: '12px 16px', fontSize: 15, fontWeight: 700,
                          opacity: (genStoryboardBusy || !project.scriptText?.trim() || !apiKey?.trim()) ? 0.5 : 1,
                          cursor: genStoryboardBusy ? 'wait' : 'pointer',
                        }}
                      >
                        {genStoryboardBusy
                          ? '⌛ AI กำลังแตก storyboard…'
                          : (project.storyboard?.length || 0) > 0
                            ? '🔄 แตก storyboard ใหม่ (จะแทนของเดิม)'
                            : '⚡ AI แตก script → storyboard'}
                      </button>
                    </div>

                    {/* Storyboard editor — Step ③ purple */}
                    {(project.storyboard?.length || 0) > 0 && (
                      <div style={{ ...s.subPanel(T.accent2), marginBottom: 12 }}>
                        <div style={{
                          ...s.subLabel(T.accent2), fontSize: 13,
                          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
                        }}>
                          <span>✏ Storyboard ({project.storyboard.length} shots) — แก้ visual ได้</span>
                          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            แก้แล้วกด "🎬 สร้าง image prompts" ด้านล่าง
                          </span>
                        </div>
                        {project.storyboard.map((seg, i) => (
                          <div key={i} style={{
                            background: T.bg, border: `1px solid ${T.border}`,
                            borderRadius: 8, padding: 12, marginBottom: 8,
                          }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700, color: T.accent2, marginBottom: 6,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                            }}>
                              <span>🗣 Shot {i + 1} — Voiceover (แก้ได้)</span>
                              <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400 }}>
                                ~{project.perShotDuration || 6}s
                              </span>
                            </div>
                            <input
                              type="text"
                              value={seg.voiceoverLine}
                              onChange={e => updateProject({
                                storyboard: project.storyboard.map((sg, j) =>
                                  j === i ? { ...sg, voiceoverLine: e.target.value } : sg),
                              })}
                              style={{
                                ...s.input, fontSize: 13, marginBottom: 8,
                                fontStyle: 'italic', color: T.text,
                              }}
                            />
                            <div style={{
                              fontSize: 12, fontWeight: 600, color: T.warn, marginBottom: 4,
                            }}>
                              🎥 Visual ที่จะ gen — เปลี่ยนได้ตามใจ
                            </div>
                            <textarea
                              value={seg.visualHint}
                              onChange={e => updateProject({
                                storyboard: project.storyboard.map((sg, j) =>
                                  j === i ? { ...sg, visualHint: e.target.value } : sg),
                              })}
                              rows={2}
                              placeholder="เช่น: split-screen — เห็นเพื่อนขนกระเป๋าเที่ยว vs นางเอกอยู่บ้านขัดผิว"
                              style={{
                                ...s.input, fontSize: 13, lineHeight: 1.6,
                                resize: 'vertical', minHeight: 56,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Advanced: switch to Brief mode (collapsible) */}
                    <details style={{ marginBottom: 12 }}>
                      <summary style={{
                        fontSize: 11, color: T.textDim, cursor: 'pointer',
                        userSelect: 'none', padding: '6px 10px',
                        background: T.panel2, border: `1px dashed ${T.border}`,
                        borderRadius: 6, fontWeight: 500,
                      }}>
                        ⚙ ตัวเลือกขั้นสูง — สลับไปใช้ Brief mode (สำหรับเคสไม่มีสคริปต์)
                      </summary>
                      <div style={{
                        marginTop: 8, padding: '10px 12px',
                        background: T.bg, border: `1px solid ${T.border}`,
                        borderRadius: 6, fontSize: 12, color: T.textMute, lineHeight: 1.6,
                      }}>
                        Brief mode ให้พิมพ์ brief อิสระแบบ paragraph เดียว — AI จะคิด storyboard เอง<br />
                        <strong>ไม่แนะนำ</strong>เพราะ visual จะไม่ match กับ voiceover line ตรงๆ ใช้เฉพาะตอนยังไม่มีสคริปต์
                        <button
                          onClick={() => {
                            if (window.confirm('สลับไปใช้ Brief mode?\n\n· script + storyboard ที่ทำไว้จะยังเก็บอยู่ แต่จะไม่ใช้แล้ว\n· จะใช้ brief field แทน')) {
                              updateProject({ scriptMode: 'brief' });
                            }
                          }}
                          style={{
                            ...s.btnGhost, marginTop: 8, padding: '6px 12px', fontSize: 11,
                            borderColor: T.warn + '55', color: T.warn,
                          }}
                        >สลับไป Brief mode →</button>
                      </div>
                    </details>
                  </>
                )}

                {/* ── Step ④ Image Style (amber) — quick-pick presets + 12 fields ── */}
                <div style={{ ...s.subPanel(T.warn), marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ ...s.subLabel(T.warn), marginBottom: 0, fontSize: 13 }}>
                      🎨 Step ④ — เลือกสไตล์ภาพ
                      <span style={{ marginLeft: 6, fontSize: 11, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        (ต่อท้ายทุก prompt — กด preset หรือเลือกแต่ละ field เองได้)
                      </span>
                    </div>
                    <button
                      onClick={() => updateProject({ styleParts: { ...getDefaultStyleParts('ad') }, styleExtra: '' })}
                      style={{ ...s.btnGhost, padding: '5px 10px', fontSize: 11, borderColor: T.warn + '55', color: T.warn }}
                      title="คืนค่า default"
                    >↺ reset</button>
                  </div>

                  {/* Quick-pick preset chips */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    marginBottom: 14, paddingBottom: 12,
                    borderBottom: `1px dashed ${T.warn}33`,
                  }}>
                    <div style={{
                      width: '100%', fontSize: 11, color: T.warn,
                      fontWeight: 700, marginBottom: 4, letterSpacing: 0.3,
                    }}>
                      ⚡ Quick preset — กด 1 ครั้ง fill ครบทุก field
                    </div>
                    {STYLE_PRESETS_AD.map(preset => {
                      // ดูว่า preset ปัจจุบันถูกใช้อยู่ไหม (compare key field 'style')
                      const isActive = project.styleParts?.style === preset.parts.style
                                    && project.styleParts?.lighting === preset.parts.lighting;
                      return (
                        <button
                          key={preset.key}
                          onClick={() => updateProject({
                            styleParts: { ...preset.parts },
                            styleExtra: '',
                          })}
                          title={preset.desc}
                          style={{
                            background: isActive ? T.warn : T.warn + '14',
                            color:      isActive ? '#0b0d12' : T.warn,
                            border:     `1px solid ${T.warn}${isActive ? '' : '55'}`,
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'flex-start',
                            lineHeight: 1.3,
                          }}
                        >
                          <span>{preset.label}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 400,
                            opacity: isActive ? 0.85 : 0.7,
                            marginTop: 2,
                          }}>{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 12 individual fields */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                  }}>
                    {getStyleFields('ad').map(field => (
                      <div key={field.key}>
                        <div style={{ fontSize: 11, color: T.warn, marginBottom: 4, fontWeight: 700 }}>
                          {field.label}
                        </div>
                        <StyleCombobox
                          value={project.styleParts?.[field.key] ?? ''}
                          options={field.options}
                          accent={T.warn}
                          placeholder="พิมพ์ระบุเอง หรือเลือก preset…"
                          onChange={(v) => updateProject({
                            styleParts: { ...(project.styleParts || {}), [field.key]: v },
                          })}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.warn}33` }}>
                    <div style={{ fontSize: 11, color: T.warn, marginBottom: 4, fontWeight: 700 }}>
                      + Custom append (อะไรก็ได้ที่อยากเติม)
                    </div>
                    <input
                      type="text"
                      value={project.styleExtra || ''}
                      onChange={e => updateProject({ styleExtra: e.target.value })}
                      placeholder="เช่น: warm orange teal color grading, 2.39:1 aspect ratio"
                      style={{ ...s.input, fontSize: 13 }}
                    />
                  </div>

                  <details style={{ marginTop: 10 }}>
                    <summary style={{
                      fontSize: 12, color: T.warn, cursor: 'pointer',
                      userSelect: 'none', padding: '4px 0', fontWeight: 600,
                    }}>
                      ดู style block ที่จะส่งให้ AI ({project.styleBlock?.length || 0} ตัวอักษร)
                    </summary>
                    <div style={{
                      marginTop: 6,
                      background: T.panel2, border: `1px solid ${T.warn}33`, borderRadius: 6,
                      padding: '8px 10px', fontSize: 12, color: T.text,
                      fontFamily: 'monospace', lineHeight: 1.6, wordBreak: 'break-word',
                    }}>
                      {project.styleBlock || <span style={{ color: T.textDim }}>(ว่าง)</span>}
                    </div>
                  </details>
                </div>

                {/* ── Step ⑤ References / Uploads (green) ─────────── */}
                <div style={{ ...s.subPanel(T.ok), marginBottom: 14 }}>
                  <div style={{ ...s.subLabel(T.ok), fontSize: 13 }}>
                    🖼 Step ⑤ — References (รูปประกอบ 3 slot)
                  </div>
                  <div style={{
                    fontSize: 11, color: T.textMute, lineHeight: 1.6,
                    background: T.panel2, border: `1px solid ${T.border}`,
                    borderRadius: 6, padding: '8px 10px', marginBottom: 10,
                  }}>
                    💡 <strong>3 slot คงที่</strong>: <span style={{ color: T.warn }}>#1 = ผลิตภัณฑ์</span> · <span style={{ color: T.ok }}>#2 = ขนาด</span> · <span style={{ color: T.accent2 }}>#3 = นางแบบ</span><br />
                    prompt จะใส่คำว่า <code style={{ color: T.text, background: T.bg, padding: '1px 4px', borderRadius: 3 }}>"reference from input image #N"</code> ทั้ง 3 slot <strong>เสมอ</strong> — ไปอัพโหลดที่ Midjourney/Nano Banana ตามลำดับ ถ้า slot ไหนไม่ใช้ ลบทิ้งจาก prompt ได้เอง<br />
                    ที่อัพโหลดที่นี่ = AI จะเห็นรูปด้วย vision และบรรยายลง prompt เพิ่ม (เช่น สี/ทรง/label) ทำให้ prompt informative ขึ้น
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    {/* Product (slot #1) */}
                    <div style={{
                      background: T.warn + '08', border: `1px dashed ${T.warn}44`,
                      borderRadius: 8, padding: 10,
                    }}>
                      <label style={{ ...s.label, color: T.warn, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>รูปผลิตภัณฑ์ ★ สำคัญ</span>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>#1</span>
                      </label>
                      <ImageUploadButton multiple label="เพิ่มรูปผลิตภัณฑ์" accent={T.warn}
                        onAdd={imgs => updateProject({ productImages: [...(project.productImages || []), ...imgs] })} />
                      <div style={{ ...s.hint, color: T.warn, opacity: 0.8 }}>
                        prompt จะใส่ <code style={{ background: T.bg, padding: '1px 4px', borderRadius: 3 }}>image #1</code> เสมอ
                        {(project.productImages || []).length > 0 && ' · AI จะบรรยายสินค้าจากรูปเพิ่ม'}
                      </div>
                      <ImageThumbList
                        images={project.productImages}
                        onRemove={id => updateProject({ productImages: project.productImages.filter(i => i.id !== id) })}
                      />
                    </div>

                    {/* Size ref (slot #2) */}
                    <div style={{
                      background: T.ok + '08', border: `1px dashed ${T.ok}44`,
                      borderRadius: 8, padding: 10,
                    }}>
                      <label style={{ ...s.label, color: T.ok, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>รูปอ้างอิงขนาด <span style={{ color: T.textDim, fontWeight: 400, fontSize: 10 }}>(optional)</span></span>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>#2</span>
                      </label>
                      <ImageUploadButton multiple label="เพิ่มรูปอ้างอิงขนาด" accent={T.ok}
                        onAdd={imgs => updateProject({ sizeRefImages: [...(project.sizeRefImages || []), ...imgs] })} />
                      <div style={{ ...s.hint, color: T.ok, opacity: 0.8 }}>
                        prompt จะใส่ <code style={{ background: T.bg, padding: '1px 4px', borderRadius: 3 }}>image #2</code> เสมอ
                        {(project.sizeRefImages || []).length > 0 && ' · AI จะอ้างอิงขนาดจริงจากรูปด้วย'}
                      </div>
                      <ImageThumbList
                        images={project.sizeRefImages}
                        onRemove={id => updateProject({ sizeRefImages: project.sizeRefImages.filter(i => i.id !== id) })}
                      />
                    </div>

                    {/* Model (slot #3) */}
                    <div style={{
                      background: T.accent2 + '08', border: `1px dashed ${T.accent2}44`,
                      borderRadius: 8, padding: 10,
                    }}>
                      <label style={{ ...s.label, color: T.accent2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>นางแบบ <span style={{ color: T.textDim, fontWeight: 400, fontSize: 10 }}>(optional)</span></span>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>#3</span>
                      </label>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {['text', 'image'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => updateProject({ modelMode: mode })}
                            style={{
                              ...s.btn(project.modelMode === mode ? T.accent2 : T.borderHi, project.modelMode === mode),
                              flex: 1, padding: '6px 10px', fontSize: 11,
                            }}
                          >{mode === 'text' ? 'พิมพ์ข้อความ' : 'อัพโหลดรูป'}</button>
                        ))}
                      </div>
                      {project.modelMode === 'text' ? (
                        <>
                          <input
                            type="text"
                            value={project.modelText}
                            onChange={e => updateProject({ modelText: e.target.value })}
                            placeholder="เช่น: หญิงไทยอายุ 30+ ผมยาวสีน้ำตาล ผิวขาวเหลือง"
                            style={s.input}
                          />
                          {/* Framing toggle */}
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: T.textMute, fontWeight: 600, marginRight: 4 }}>
                              Framing:
                            </span>
                            {[
                              { key: 'full', label: '👤 เต็มตัว (เห็นชุด/รองเท้าครบ)' },
                              { key: 'half', label: '👔 ครึ่งตัว' },
                            ].map(opt => {
                              const active = (project.modelFraming || 'full') === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  onClick={() => updateProject({ modelFraming: opt.key })}
                                  style={{
                                    background:  active ? T.accent2 + '33' : 'transparent',
                                    color:       active ? T.accent2 : T.textMute,
                                    border:      `1px solid ${active ? T.accent2 + '99' : T.borderHi}`,
                                    borderRadius: 6, padding: '4px 10px',
                                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                  }}
                                >{opt.label}</button>
                              );
                            })}
                          </div>
                          {/* Gen button */}
                          {(() => {
                            const genList = project.modelGenerated || [];
                            const hasGen  = genList.length > 0;
                            const disabled = genModelBusy || !project.modelText?.trim();
                            return (
                              <button
                                onClick={() => handleGenModelImage(1)}
                                disabled={disabled}
                                style={{
                                  ...s.btn(T.accent2, true),
                                  padding: '8px 14px', fontSize: 12,
                                  marginTop: 8, width: '100%',
                                  opacity: disabled ? 0.5 : 1,
                                  cursor:  genModelBusy ? 'wait' : (project.modelText?.trim() ? 'pointer' : 'not-allowed'),
                                }}
                                title={!project.modelText?.trim() ? 'พิมพ์รายละเอียดนางแบบก่อน' : ''}
                              >
                                {genModelBusy
                                  ? '⌛ กำลังสร้างรูป…'
                                  : hasGen
                                    ? `➕ Gen เพิ่มอีก 1 รูป (มีอยู่ ${genList.length})`
                                    : '🖼 Gen รูปนางแบบ 1 รูป'}
                              </button>
                            );
                          })()}
                          <div style={{ fontSize: 10, color: T.textDim, marginTop: 4, lineHeight: 1.5 }}>
                            ใช้ Gemini image · ~$0.04 ต่อรูป · gen เพิ่มได้เรื่อยๆจนกว่าจะถูกใจ → กด ✓ เพื่อเลือก
                          </div>

                          {/* Generated thumbnails — เลือก 1 รูป */}
                          {(project.modelGenerated || []).length > 0 && (
                            <div style={{
                              marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}`,
                            }}>
                              <div style={{ fontSize: 11, color: T.accent2, marginBottom: 6, fontWeight: 700 }}>
                                🎨 รูปที่ gen ไว้ ({project.modelGenerated.length}) — กด ✓ เพื่อเลือกใช้
                              </div>
                              <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6,
                              }}>
                                {project.modelGenerated.map((g, gi) => (
                                  <div key={g.id} style={{ position: 'relative' }}>
                                    <img
                                      src={g.dataUrl}
                                      alt={`gen ${gi + 1}`}
                                      onClick={() => setLightboxSrc(g.dataUrl)}
                                      title="คลิกเพื่อดูรูปใหญ่"
                                      style={{
                                        width: '100%', aspectRatio: '9/16', objectFit: 'cover',
                                        borderRadius: 6,
                                        border: `1px solid ${T.borderHi}`,
                                        cursor: 'zoom-in', display: 'block',
                                        background: T.bg,
                                      }}
                                    />
                                    <div style={{
                                      position: 'absolute', bottom: 4, left: 4, right: 4,
                                      display: 'flex', gap: 3, justifyContent: 'center',
                                    }}>
                                      <button
                                        onClick={() => handleSelectModelGenerated(g.id)}
                                        title="เลือกรูปนี้เป็นรูปนางแบบ → สลับไปโหมดอัพโหลด"
                                        style={{
                                          background: T.ok, color: '#0b0d12', border: 'none',
                                          borderRadius: 4, padding: '3px 10px', fontSize: 11,
                                          cursor: 'pointer', fontWeight: 800,
                                        }}
                                      >✓ เลือก</button>
                                      <button
                                        onClick={() => handleDeleteModelGenerated(g.id)}
                                        title="ลบรูปนี้"
                                        style={{
                                          background: 'rgba(0,0,0,0.75)', color: T.err, border: 'none',
                                          borderRadius: 4, padding: '3px 8px', fontSize: 10,
                                          cursor: 'pointer', fontWeight: 600,
                                        }}
                                      >🗑</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <ImageUploadButton multiple label="เพิ่มรูปนางแบบ" accent={T.accent2}
                            onAdd={imgs => updateProject({ modelImages: [...(project.modelImages || []), ...imgs] })} />
                          <ImageThumbList
                            images={project.modelImages}
                            onRemove={id => updateProject({ modelImages: project.modelImages.filter(i => i.id !== id) })}
                          />
                        </>
                      )}
                      <div style={{ ...s.hint, color: T.accent2, opacity: 0.8, marginTop: 6 }}>
                        prompt จะใส่ <code style={{ background: T.bg, padding: '1px 4px', borderRadius: 3 }}>image #3</code> เสมอ
                        {((project.modelMode === 'image' && (project.modelImages || []).length > 0) ||
                          (project.modelMode === 'text' && project.modelText?.trim())) &&
                          ' · AI จะรวมข้อมูลที่ระบุลง prompt ด้วย'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Generate button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={handleGenerateImagePrompts}
                disabled={genStageA}
                style={{
                  ...s.btn(T.accent, true),
                  padding: '12px 22px',
                  opacity: genStageA ? 0.6 : 1,
                  cursor:  genStageA ? 'wait' : 'pointer',
                  animation: (currentStepNum === 3 && !genStageA) ? 'ttplusBtnPulse 1.6s ease-in-out infinite' : 'none',
                }}
              >
                {genStageA ? '⌛ กำลังคิด…' : `✨ สร้าง ${shotCount} Image Prompts`}
              </button>
              {project.imagePrompts?.shots?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => copyText(allPromptsText)} style={s.btnGhost}>
                    📋 Copy all ({project.imagePrompts.shots.length})
                  </button>
                  <button
                    onClick={handleExportImagePrompts}
                    disabled={exportingA}
                    style={{
                      ...s.btnGhost,
                      borderColor: '#4285F4' + '55',
                      color: '#4285F4',
                      opacity: exportingA ? 0.6 : 1,
                      cursor:  exportingA ? 'wait' : 'pointer',
                    }}
                    title="สร้าง Google Doc ใหม่ (ครั้งแรกจะขอสิทธิ์ Google Docs)"
                  >
                    {exportingA ? '⌛ Exporting…' : '📄 Export to Google Docs'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Anchors panel — status only (no gen button) ─────── */}
            {project.imagePrompts?.shots?.length > 0 && slotsUsedInPrompts.length > 0 && (
              <div style={{
                marginTop: 18,
                background: T.panel2, border: `2px solid ${T.warn}55`, borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={s.badge(T.warn)}>🖼 REFERENCE STATUS</span>
                  <span style={{ fontSize: 11, color: T.textMute }}>
                    Prompts ใช้ slot: {slotsUsedInPrompts.map(n => `#${n}`).join(', ')} —
                    upload รูปที่ References (ด้านบน) ให้ครบจะได้ผล gen รูปที่ consistent ที่สุด
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {slotsUsedInPrompts.map(slotNum => {
                    const slotCfg = getSlotsFor(project.category)[slotNum];
                    if (!slotCfg) return null;
                    const anchor = getSlotAnchorImage(project, slotNum);
                    const slotCol = slotNum === 1 ? T.warn : slotNum === 2 ? T.ok : T.accent2;
                    return (
                      <div key={slotNum} style={{
                        background: anchor ? T.ok + '0e' : T.warn + '08',
                        border: `1px solid ${anchor ? T.ok + '55' : T.warn + '55'}`,
                        borderRadius: 8, padding: 10,
                        display: 'flex', gap: 10, alignItems: 'center',
                      }}>
                        {anchor ? (
                          <img src={anchor.dataUrl} alt="" style={{
                            width: 48, height: 48, objectFit: 'cover', borderRadius: 4,
                            flexShrink: 0, border: `1px solid ${T.borderHi}`,
                          }} />
                        ) : (
                          <div style={{
                            width: 48, height: 48, borderRadius: 4, flexShrink: 0,
                            background: T.bg, border: `1px dashed ${slotCol}55`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, color: slotCol,
                          }}>?</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: slotCol }}>
                            #{slotNum} {slotCfg.name}
                          </div>
                          <div style={{ fontSize: 10, color: anchor ? T.ok : T.warn, marginTop: 2, lineHeight: 1.5 }}>
                            {anchor
                              ? '✓ พร้อม (ใช้รูปที่ upload)'
                              : <>⚠ ไม่มีรูป — gen จะใช้แค่ text prompt<br/><span style={{ color: T.textDim }}>(upload ที่ References ด้านบน)</span></>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Output cards (image prompts + per-shot Gen UI) ──── */}
            {project.imagePrompts?.shots?.length > 0 && (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.imagePrompts.shots.map((sh, i) => {
                  const slotsInThis = detectSlotsInPrompt(sh.prompt);
                  const { ready, missing } = shotReadiness(sh.prompt);
                  const busy = !!shotGenBusy[i];
                  const generated = sh.generated || [];
                  return (
                    <div key={i} style={{
                      background: T.panel2, border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: 14,
                    }}>
                      {/* Voiceover line — แสดงเมื่อมาจาก script mode */}
                      {sh.voiceoverLine && (
                        <div style={{
                          background: T.pink + '12',
                          border: `1px solid ${T.pink}33`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          marginBottom: 10,
                          fontSize: 13, color: T.pink,
                          fontStyle: 'italic',
                          display: 'flex', alignItems: 'center', gap: 6,
                          lineHeight: 1.5,
                        }} title="Voiceover line ของ shot นี้ (จาก script)">
                          <span style={{ flexShrink: 0 }}>🗣</span>
                          <span>"{sh.voiceoverLine}"</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={s.badge(T.accent)}>Shot {i + 1} / {project.imagePrompts.shots.length}</span>
                          {slotsInThis.map(n => {
                            const slotCol = n === 1 ? T.warn : n === 2 ? T.ok : T.accent2;
                            const hasAnchor = !!getSlotAnchorImage(project, n);
                            const slotCfg = getSlotsFor(project.category)[n];
                            const slotLabel = slotCfg?.name || `#${n}`;
                            return (
                              <span key={n} style={{
                                ...s.badge(slotCol),
                                fontSize: 10, padding: '2px 8px',
                                opacity: hasAnchor ? 1 : 0.5,
                              }} title={hasAnchor ? `${slotLabel} พร้อม` : `${slotLabel} ยังไม่มีรูป`}>
                                {hasAnchor ? '✓' : '⚠'} {slotLabel}
                              </span>
                            );
                          })}
                        </div>
                        <button onClick={() => copyText(sh.prompt)} style={s.btnGhost}>📋 Copy</button>
                      </div>
                      <div style={{
                        fontSize: 13, color: T.text, lineHeight: 1.65,
                        fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>{sh.prompt}</div>

                      {/* Gen buttons */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleGenShot(i, 1)}
                          disabled={busy}
                          style={{
                            ...s.btn(T.warn, true), padding: '7px 14px', fontSize: 12,
                            opacity: busy ? 0.5 : 1,
                            cursor:  busy ? 'wait' : 'pointer',
                          }}
                        >{busy ? '⌛ Gen…' : '🖼 Gen 1 รูป'}</button>
                        <button
                          onClick={() => handleGenShot(i, 4)}
                          disabled={busy}
                          style={{
                            ...s.btnGhost, padding: '7px 14px', fontSize: 12,
                            borderColor: T.warn + '55', color: T.warn,
                            opacity: busy ? 0.5 : 1,
                            cursor:  busy ? 'wait' : 'pointer',
                          }}
                          title="gen 4 variants"
                        >× 4 variants</button>
                        {missing.length > 0 && (
                          <span style={{ fontSize: 10, color: T.warn }}>
                            ⚠ slot #{missing.join(', #')} ไม่มีรูป — gen จะใช้แค่ text prompt (อาจไม่ consistent ระหว่าง shot)
                          </span>
                        )}
                      </div>

                      {/* Generated images grid */}
                      {generated.length > 0 && (
                        <div style={{
                          marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${T.border}`,
                        }}>
                          {sh.mainImageId && (
                            <div style={{
                              fontSize: 11, color: T.warn, marginBottom: 6, fontWeight: 600,
                            }}>
                              👑 รูปหลักของ Shot {i + 1} ส่งไป STEP ⑤ Stage C แล้ว · กด 👑 อีกครั้งเพื่อยกเลิก
                            </div>
                          )}
                          <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8,
                          }}>
                            {generated.map((g, gi) => {
                              const isMain = sh.mainImageId === g.id;
                              return (
                                <div key={g.id} style={{ position: 'relative' }}>
                                  {isMain && (
                                    <div style={{
                                      position: 'absolute', top: 4, left: 4, zIndex: 2,
                                      background: T.warn, color: '#0b0d12',
                                      borderRadius: 4, padding: '2px 6px',
                                      fontSize: 10, fontWeight: 800,
                                    }}>👑 MAIN</div>
                                  )}
                                  <img src={g.dataUrl} alt={`gen ${gi + 1}`}
                                    title="คลิกเพื่อดูรูปใหญ่"
                                    style={{
                                      width: '100%', aspectRatio: '9/16', objectFit: 'cover',
                                      borderRadius: 6,
                                      border: `${isMain ? 3 : 1}px solid ${isMain ? T.warn : T.borderHi}`,
                                      cursor: 'zoom-in', display: 'block',
                                      boxShadow: isMain ? `0 0 0 2px ${T.warn}33` : 'none',
                                      background: T.bg,
                                    }} onClick={() => setLightboxSrc(g.dataUrl)} />
                                  <div style={{
                                    position: 'absolute', bottom: 4, left: 4, right: 4,
                                    display: 'flex', gap: 3, justifyContent: 'center',
                                  }}>
                                    <button
                                      onClick={() => handleSetAsMain(i, g.id)}
                                      title={isMain ? 'ยกเลิกรูปหลัก' : 'ตั้งเป็นรูปหลัก → ส่งไป Stage C'}
                                      style={{
                                        background: isMain ? T.warn : 'rgba(0,0,0,0.75)',
                                        color: isMain ? '#0b0d12' : T.warn,
                                        border: 'none',
                                        borderRadius: 4, padding: '3px 8px', fontSize: 10,
                                        cursor: 'pointer', fontWeight: 700,
                                      }}
                                    >👑</button>
                                    <button
                                      onClick={() => handleDownloadGenerated(g, i, gi)}
                                      title="Download"
                                      style={{
                                        background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none',
                                        borderRadius: 4, padding: '3px 8px', fontSize: 10,
                                        cursor: 'pointer', fontWeight: 600,
                                      }}
                                    >💾</button>
                                    <button
                                      onClick={() => handleDeleteGenerated(i, g.id)}
                                      title="Delete"
                                      style={{
                                        background: 'rgba(0,0,0,0.75)', color: T.err, border: 'none',
                                        borderRadius: 4, padding: '3px 8px', fontSize: 10,
                                        cursor: 'pointer', fontWeight: 600,
                                      }}
                                    >🗑</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Footer: Save mains + Clear all + warning */}
                {(slotsUsedInPrompts.length > 0 || project.imagePrompts.shots.some(s => s.generated?.length > 0)) && (() => {
                  const mainCount = (project.imagePrompts.shots || []).filter(s => s.mainImageId && s.generated?.find(g => g.id === s.mainImageId)).length;
                  return (
                    <div style={{
                      marginTop: 6,
                      background: T.warn + '0e', border: `1px solid ${T.warn}33`,
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <div style={{
                        fontSize: 11, color: T.warn, marginBottom: 8, lineHeight: 1.6,
                      }}>
                        ⚠ <strong>เซฟรูปหลักไว้เสมอ</strong> — รูปทั้งหมดเก็บใน browser (IndexedDB) ถ้า browser ล้าง cache/data หรือเปลี่ยนเครื่อง รูปจะหาย ต้องเอากลับมา upload ใหม่ที่ Stage C
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleSaveAllMainsLocal}
                          disabled={mainCount === 0}
                          style={{
                            ...s.btn(T.warn, true), padding: '7px 14px', fontSize: 11,
                            opacity: mainCount === 0 ? 0.5 : 1,
                            cursor:  mainCount === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title={mainCount === 0 ? 'ยังไม่มีรูปหลัก — กด 👑 ที่รูปที่ชอบของแต่ละ shot ก่อน' : 'ดาวน์โหลดเป็นไฟล์ลงเครื่อง'}
                        >💾 Save to computer ({mainCount})</button>
                        <button
                          onClick={handleSaveAllMainsDrive}
                          disabled={mainCount === 0 || savingDrive}
                          style={{
                            ...s.btnGhost,
                            borderColor: '#4285F4' + '55', color: '#4285F4', fontSize: 11,
                            opacity: (mainCount === 0 || savingDrive) ? 0.5 : 1,
                            cursor:  savingDrive ? 'wait' : (mainCount === 0 ? 'not-allowed' : 'pointer'),
                            fontWeight: 700,
                          }}
                          title={mainCount === 0 ? 'ยังไม่มีรูปหลัก' : 'อัพขึ้น Google Drive — สร้าง folder ตามชื่อ project'}
                        >{savingDrive ? '⌛ กำลังอัพ…' : `☁ Upload to Google Drive (${mainCount})`}</button>
                        <button
                          onClick={handleClearAllGenerated}
                          style={{ ...s.btnGhost, color: T.err, borderColor: T.err + '55', fontSize: 11 }}
                          title="ลบรูปที่ gen ทั้งหมด"
                        >🗑 Clear all generated</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Flow arrow Stage A → Stage C */}
          <div style={{
            display: 'flex', justifyContent: 'center', padding: '8px 0',
          }}>
            <span style={{
              fontSize: 28, color: currentStepNum === 5 ? T.accent2 : T.textDim,
              animation: currentStepNum === 5 ? 'ttplusPulseArrow 1.4s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }}>▼</span>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* STAGE C — Images → Video Prompts                         */}
          {/* ─────────────────────────────────────────────────────── */}
          <div style={s.sectionCard(T.accent2)}>
            <div style={{ ...s.sectionTitle, color: T.accent2 }}>
              <span style={{
                ...s.badge(T.accent2), fontSize: 12, padding: '4px 10px',
                background: T.accent2, color: '#0b0d12',
              }}>STEP ⑤</span>
              <span style={s.badge(T.accent2)}>STAGE C</span>
              Shot Images → Video Prompts + Music
            </div>
            <p style={{ fontSize: 12, color: T.textMute, marginTop: -8, marginBottom: 14, lineHeight: 1.6 }}>
              สร้างรูปจาก Stage A ด้วยตัวเองแล้วอัพโหลดกลับมาตามลำดับเหตุการณ์ ลากเพื่อจัดเรียงใหม่ได้
            </p>

            {/* ── Sub: Upload + reorder (blue) ────────────────────── */}
            <div style={{ ...s.subPanel(T.accent), marginBottom: 14 }}>
              <div style={s.subLabel(T.accent)}>📤 Upload + จัดลำดับ shot</div>
              <ImageUploadButton multiple label="อัพโหลดรูป shot (เพิ่มได้หลายรูป)" accent={T.accent}
                onAdd={imgs => updateProject({ shotImages: [...(project.shotImages || []), ...imgs] })} />

              {project.shotImages?.length > 0 && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="shots" direction="horizontal">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}
                      >
                        {project.shotImages.map((img, i) => (
                          <Draggable key={img.id} draggableId={img.id} index={i}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={{
                                  position: 'relative',
                                  ...prov.draggableProps.style,
                                  opacity: snap.isDragging ? 0.7 : 1,
                                }}
                              >
                                <div style={{
                                  position: 'absolute', top: 4, left: 4,
                                  background: 'rgba(0,0,0,0.7)', color: '#fff',
                                  borderRadius: 4, padding: '2px 6px',
                                  fontSize: 11, fontWeight: 700, zIndex: 1,
                                }}>{i + 1}</div>
                                <img
                                  src={img.dataUrl} alt={img.name}
                                  style={{
                                    width: 110, height: 110, objectFit: 'cover',
                                    borderRadius: 8, border: `1px solid ${T.borderHi}`,
                                    cursor: 'grab', display: 'block',
                                  }}
                                />
                                <button
                                  onClick={() => updateProject({ shotImages: project.shotImages.filter(x => x.id !== img.id) })}
                                  title="ลบ"
                                  style={{
                                    position: 'absolute', top: -6, right: -6,
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: T.err, color: '#000', border: 'none',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    lineHeight: 1, zIndex: 2,
                                  }}
                                >×</button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Generate button + Export */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={handleGenerateVideoPrompts}
                disabled={genStageC || !project.shotImages?.length}
                style={{
                  ...s.btn(T.accent2, true),
                  padding: '12px 22px',
                  opacity:  (genStageC || !project.shotImages?.length) ? 0.6 : 1,
                  cursor:   genStageC ? 'wait' : 'pointer',
                  animation: (currentStepNum === 5 && project.shotImages?.length > 0 && !genStageC) ? 'ttplusBtnPulse 1.6s ease-in-out infinite' : 'none',
                }}
              >
                {genStageC ? '⌛ กำลังวิเคราะห์รูป…' : `🎬 สร้าง Video Prompts (${project.shotImages?.length || 0} shots)`}
              </button>
              {project.videoPlan?.shots?.length > 0 && (
                <button
                  onClick={handleExportVideoPrompts}
                  disabled={exportingC}
                  style={{
                    ...s.btnGhost,
                    borderColor: '#4285F4' + '55',
                    color: '#4285F4',
                    opacity: exportingC ? 0.6 : 1,
                    cursor:  exportingC ? 'wait' : 'pointer',
                  }}
                  title="สร้าง Google Doc ใหม่ (ครั้งแรกจะขอสิทธิ์ Google Docs)"
                >
                  {exportingC ? '⌛ Exporting…' : '📄 Export to Google Docs'}
                </button>
              )}
            </div>

            {/* Output: shots */}
            {project.videoPlan?.shots?.length > 0 && (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.videoPlan.shots.map((sh, i) => {
                  const role  = FRAME_ROLE[sh.frameRole] || FRAME_ROLE.start;
                  const thumb = project.shotImages?.[sh.sourceImageIndex];
                  return (
                    <div key={i} style={{
                      background: T.panel2, border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: 14,
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                    }}>
                      {thumb && (
                        <img src={thumb.dataUrl} alt=""
                          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={s.badge(T.accent2)}>Shot {sh.index || i + 1}</span>
                            <span style={s.badge(role.color)}>{role.label}</span>
                            {typeof sh.sourceImageIndex === 'number' && (
                              <span style={{ fontSize: 11, color: T.textDim }}>← รูปที่ {sh.sourceImageIndex + 1}</span>
                            )}
                          </div>
                          <button onClick={() => copyText(sh.videoPromptEn)} style={s.btnGhost}>📋 Copy</button>
                        </div>
                        <div style={{
                          fontSize: 13, color: T.text, lineHeight: 1.65,
                          fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          marginBottom: sh.frameNote ? 8 : 0,
                        }}>{sh.videoPromptEn}</div>
                        {sh.frameNote && (
                          <div style={{ fontSize: 12, color: T.textMute, lineHeight: 1.5 }}>
                            💡 {sh.frameNote}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Output: music */}
            {project.videoPlan?.music && (
              <div style={{
                marginTop: 14,
                background: `linear-gradient(135deg, ${T.pink}11 0%, ${T.accent2}11 100%)`,
                border: `1px solid ${T.pink}44`, borderRadius: 10, padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>🎵</span>
                  <span style={{ fontWeight: 700, color: T.text }}>ดนตรีประกอบ</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ ...s.label, color: T.pink }}>Mood</div>
                    <div style={{ color: T.text }}>{project.videoPlan.music.mood || '-'}</div>
                  </div>
                  <div>
                    <div style={{ ...s.label, color: T.pink }}>Tempo</div>
                    <div style={{ color: T.text }}>{project.videoPlan.music.tempo || '-'} BPM</div>
                  </div>
                  <div>
                    <div style={{ ...s.label, color: T.pink }}>Instruments</div>
                    <div style={{ color: T.text }}>
                      {(project.videoPlan.music.instruments || []).join(', ') || '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...s.label, color: T.pink }}>References</div>
                    <div style={{ color: T.text, lineHeight: 1.6 }}>
                      {(project.videoPlan.music.references || []).map((r, i) => (
                        <div key={i}>· {r}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flow arrow Stage C → Narration */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <span style={{
              fontSize: 28,
              color: currentStepNum === 6 ? T.pink : T.textDim,
              animation: currentStepNum === 6 ? 'ttplusPulseArrow 1.4s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }}>▼</span>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* STAGE 6 — TTS Narration (พากย์เสียงโฆษณา)                 */}
          {/* ─────────────────────────────────────────────────────── */}
          <div id="narration" style={s.sectionCard(T.pink)}>
            <div style={{ ...s.sectionTitle, color: T.pink, fontSize: 20 }}>
              <span style={{
                ...s.badge(T.pink), fontSize: 13, padding: '5px 11px',
                background: T.pink, color: '#0b0d12',
              }}>STEP ⑥</span>
              <span style={{ ...s.badge(T.pink), fontSize: 12 }}>NARRATION</span>
              🎙 พากย์เสียงโฆษณา (TTS)
            </div>
            <p style={{ fontSize: 14, color: T.textMute, marginTop: -8, marginBottom: 16, lineHeight: 1.65 }}>
              พิมพ์บทพากย์ → AI สร้างเสียงพากย์ภาษาไทย/อังกฤษ → เล่น + ดาวน์โหลด .wav ไปใส่ในวีดีโอ<br />
              ใช้ Gemini TTS · ฝัง persona ได้ (ตื่นเต้น, นุ่มนวล, ฯลฯ) · ~$0.000016/ตัวอักษร
            </p>

            {/* Sub: Model + Voice + Persona */}
            <div style={{ ...s.subPanel(T.pink), marginBottom: 14 }}>
              <div style={{ ...s.subLabel(T.pink), fontSize: 13 }}>🎚 เลือกเสียง</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 6 }}>
                    Model
                  </div>
                  <select
                    value={project.narration?.model || GEMINI_31_MODEL}
                    onChange={e => updateProject({
                      narration: { ...(project.narration || {}), model: e.target.value },
                    })}
                    style={{
                      ...s.input, padding: '9px 12px', fontSize: 14, width: '100%',
                    }}
                  >
                    {TTS_MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.note}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 6 }}>
                    Voice ({GEMINI_VOICES.length} เสียง)
                  </div>
                  <select
                    value={project.narration?.voice || 'Aoede'}
                    onChange={e => updateProject({
                      narration: { ...(project.narration || {}), voice: e.target.value },
                    })}
                    style={{
                      ...s.input, padding: '9px 12px', fontSize: 14, width: '100%',
                    }}
                  >
                    {GEMINI_VOICES.map(v => (
                      <option key={v.name} value={v.name}>
                        {v.name}{v.desc ? ` — ${v.desc}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 6 }}>
                    Persona (อารมณ์/สำเนียง) — เลือก preset หรือพิมพ์เอง
                  </div>
                  <select
                    value={
                      (project.narration?.persona || '') === ''
                        ? ''
                        : GEMINI_PERSONAS.some(p => p.instruction === project.narration.persona)
                          ? project.narration.persona
                          : '__custom__'
                    }
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '__custom__') return; // ไม่ทำอะไร — ให้ textarea ขับ
                      updateProject({
                        narration: { ...(project.narration || {}), persona: v },
                      });
                    }}
                    style={{
                      ...s.input, padding: '9px 12px', fontSize: 14, width: '100%',
                    }}
                  >
                    <option value="">— ไม่ใส่ persona (เสียงปกติ) —</option>
                    {GEMINI_PERSONAS.map((p, i) => (
                      <option key={i} value={p.instruction}>
                        {p.label || p.instruction}
                      </option>
                    ))}
                    <option value="__custom__">✏️ พิมพ์เอง (ดูช่องด้านล่าง)</option>
                  </select>
                  <textarea
                    value={project.narration?.persona || ''}
                    onChange={e => updateProject({
                      narration: { ...(project.narration || {}), persona: e.target.value },
                    })}
                    placeholder="หรือพิมพ์ persona instruction เอง เช่น: Speak slowly with a warm grandmother voice, gentle and caring tone..."
                    rows={2}
                    style={{
                      ...s.input, width: '100%', marginTop: 8,
                      fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit',
                      resize: 'vertical', minHeight: 56,
                      borderColor: T.pink + '88', borderWidth: 1.5,
                    }}
                  />
                  <div style={{ fontSize: 12, color: T.pink, marginTop: 4, lineHeight: 1.55, fontWeight: 600 }}>
                    ↑ ค่าที่ใช้จริง · พิมพ์ภาษาอังกฤษได้ผลดีที่สุด · ลบให้ว่าง = ไม่ใส่ persona
                  </div>
                </div>
              </div>
            </div>

            {/* Sub: Script textarea */}
            <div style={{ ...s.subPanel(T.pink), marginBottom: 14 }}>
              <div style={{ ...s.subLabel(T.pink), fontSize: 13 }}>📝 บทพากย์</div>
              <textarea
                value={project.narration?.script || ''}
                onChange={e => updateProject({
                  narration: { ...(project.narration || {}), script: e.target.value },
                })}
                placeholder="พิมพ์บทพากย์โฆษณาที่นี่ — ภาษาไทยหรืออังกฤษก็ได้&#10;&#10;เช่น: ผลิตภัณฑ์ดูแลผิวอันดับ 1 ขายดีที่สุด ลองวันนี้รับส่วนลด 50% สั่งเลย!"
                rows={6}
                style={{
                  ...s.input, width: '100%', minHeight: 160, fontSize: 15,
                  fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical',
                  padding: '12px 14px',
                }}
              />
              {(() => {
                const len = (project.narration?.script || '').length;
                const estSec = Math.ceil(len / 15);
                const estCost = (len * 0.000016).toFixed(4);
                return (
                  <div style={{
                    fontSize: 13, color: T.textMute, marginTop: 8,
                    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                    fontWeight: 500,
                  }}>
                    <span>{len} ตัวอักษร · ประมาณ {estSec} วินาที</span>
                    <span>~${estCost}</span>
                  </div>
                );
              })()}
            </div>

            {/* Generate button */}
            {(() => {
              const len = (project.narration?.script || '').trim().length;
              const disabled = narrationBusy || len === 0;
              return (
                <button
                  onClick={handleGenNarration}
                  disabled={disabled}
                  style={{
                    ...s.btn(T.pink, true),
                    padding: '12px 18px', fontSize: 15, width: '100%',
                    fontWeight: 700,
                    opacity: disabled ? 0.5 : 1,
                    cursor: narrationBusy ? 'wait' : (len === 0 ? 'not-allowed' : 'pointer'),
                  }}
                  title={len === 0 ? 'พิมพ์บทพากย์ก่อน' : ''}
                >
                  {narrationBusy
                    ? '⌛ กำลังสร้างเสียงพากย์…'
                    : project.narration?.audio
                      ? '🔄 สร้างเสียงใหม่ (จะแทนที่ของเดิม)'
                      : '🎙 สร้างเสียงพากย์'}
                </button>
              );
            })()}

            {/* Loading waveform skeleton — animated bars */}
            {narrationBusy && (
              <div style={{
                marginTop: 14,
                background: T.pink + '0c', border: `1px solid ${T.pink}33`,
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 4,
                  width: 80, height: 40, flexShrink: 0,
                }}>
                  {[
                    'ttplusWave1 0.9s ease-in-out infinite',
                    'ttplusWave2 1.1s ease-in-out infinite 0.05s',
                    'ttplusWave3 0.8s ease-in-out infinite 0.1s',
                    'ttplusWave4 1.0s ease-in-out infinite 0.15s',
                    'ttplusWave5 1.2s ease-in-out infinite 0.2s',
                    'ttplusWave2 0.95s ease-in-out infinite 0.25s',
                    'ttplusWave1 1.05s ease-in-out infinite 0.3s',
                  ].map((anim, i) => (
                    <div key={i} style={{
                      flex: 1, background: T.pink,
                      borderRadius: 2, animation: anim,
                      transformOrigin: 'bottom',
                    }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: T.pink, fontWeight: 700, marginBottom: 2 }}>
                    🎙 Gemini กำลังสังเคราะห์เสียง…
                  </div>
                  <div style={{ fontSize: 12, color: T.textMute, lineHeight: 1.5 }}>
                    ส่วนใหญ่ใช้เวลา ~5-15 วินาที · อย่าปิดหน้านี้
                  </div>
                </div>
              </div>
            )}

            {/* Audio player + download */}
            {project.narration?.audio?.base64 && narrationBlobUrl && (
              <div style={{
                marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${T.border}`,
              }}>
                <div style={{
                  fontSize: 14, color: T.ok, marginBottom: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  <span>✓ พร้อมเล่น</span>
                  <span style={{ color: T.textDim, fontWeight: 500, fontSize: 13 }}>
                    · {project.narration.audio.durationSec?.toFixed(1) || '?'} วินาที
                    · เสียง {project.narration.audio.voice}
                    {project.narration.audio.model
                      ? ` · ${TTS_MODELS.find(m => m.id === project.narration.audio.model)?.label || project.narration.audio.model}`
                      : ''}
                  </span>
                </div>
                <audio
                  controls
                  src={narrationBlobUrl}
                  style={{ width: '100%', marginBottom: 12 }}
                >
                  เบราว์เซอร์ของคุณไม่รองรับ HTML5 audio
                </audio>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleDownloadNarration}
                    style={{
                      ...s.btn(T.ok, true), padding: '10px 16px', fontSize: 14,
                      fontWeight: 700,
                    }}
                  >💾 ดาวน์โหลด .wav</button>
                  <button
                    onClick={() => {
                      if (window.confirm('ลบเสียงพากย์นี้? (script ยังเก็บไว้)')) {
                        updateProject({
                          narration: { ...(project.narration || {}), audio: null },
                        });
                      }
                    }}
                    style={{
                      ...s.btnGhost, padding: '10px 16px', fontSize: 13,
                      borderColor: T.err + '55', color: T.err,
                    }}
                  >🗑 ลบเสียง</button>
                </div>
              </div>
            )}
          </div>

          {/* Storage usage panel — IndexedDB quota awareness */}
          {storageInfo && (
            <div style={{
              marginTop: 24,
              background: T.panel2,
              border: `1px solid ${storageInfo.percent > 80 ? T.err + '66' : T.border}`,
              borderRadius: 10, padding: 14,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                💾 พื้นที่เก็บใน browser
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: storageInfo.percent > 80 ? T.err : T.textMute,
                }}>
                  · {storageInfo.usedMB.toFixed(1)} / {storageInfo.quotaMB.toFixed(0)} MB
                  ({storageInfo.percent.toFixed(1)}%)
                </span>
              </div>
              <div style={{
                height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden',
                marginBottom: 10,
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, storageInfo.percent)}%`,
                  background:
                    storageInfo.percent > 80 ? T.err :
                    storageInfo.percent > 50 ? T.warn :
                    T.ok,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              {storageInfo.percent > 60 && (
                <div style={{
                  fontSize: 12, color: T.warn, marginBottom: 8, lineHeight: 1.6,
                }}>
                  ⚠ ใช้พื้นที่เยอะแล้ว — ถ้าเต็มจะ save project ใหม่ไม่ได้
                </div>
              )}
              {genCount > 0 && (
                <div style={{
                  fontSize: 12, color: genCount >= 50 ? T.warn : T.textMute,
                  marginBottom: 10, lineHeight: 1.6,
                }}>
                  📊 วันนี้ gen รูป + เสียง ไปแล้ว <strong>{genCount}</strong> ครั้ง
                  {genCount >= 100 ? ' — เปลือง quota เยอะมากนะ!' :
                   genCount >= 50  ? ' — เริ่มใช้ quota เยอะแล้ว' : ''}
                </div>
              )}

              {/* Per-project breakdown — เรียงใหญ่ → เล็ก */}
              {projectStats.length > 0 && (
                <div style={{
                  marginBottom: 12, paddingBottom: 12,
                  borderBottom: `1px dashed ${T.border}`,
                }}>
                  <div style={{
                    fontSize: 12, color: T.textMute, marginBottom: 8, fontWeight: 600,
                    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
                  }}>
                    <span>📂 Project ({projectStats.length}) — ใหญ่สุดก่อน</span>
                    <span style={{ fontSize: 11, color: T.textDim }}>
                      🎵 ล้างเฉพาะเสียง · 🗑 ลบ project
                    </span>
                  </div>
                  {(() => {
                    const maxBytes = Math.max(1, projectStats[0]?.sizeBytes || 1);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {projectStats.map(p => {
                          const sizeMB = p.sizeBytes / (1024 * 1024);
                          const pct = (p.sizeBytes / maxBytes) * 100;
                          const isActive = p.id === project?.id;
                          const sizeLabel = sizeMB >= 0.1
                            ? `${sizeMB.toFixed(1)} MB`
                            : `${(p.sizeBytes / 1024).toFixed(0)} KB`;
                          return (
                            <div key={p.id} style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0,1fr) auto',
                              gap: 8, alignItems: 'center',
                              padding: '7px 10px', borderRadius: 6,
                              background: isActive ? T.accent + '14' : T.bg + '88',
                              border: `1px solid ${isActive ? T.accent + '55' : 'transparent'}`,
                            }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 600, color: T.text,
                                  display: 'flex', gap: 8, alignItems: 'center',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  <span style={{
                                    ...s.badge(p.category === 'mvp' ? T.pink : T.accent),
                                    fontSize: 9, padding: '1px 6px', flexShrink: 0,
                                  }}>{p.category === 'mvp' ? 'MVP' : 'AD'}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                                    {p.name || '(ไม่มีชื่อ)'}
                                  </span>
                                  {isActive && (
                                    <span style={{
                                      fontSize: 10, color: T.accent, fontWeight: 700, flexShrink: 0,
                                    }}>← เปิดอยู่</span>
                                  )}
                                </div>
                                <div style={{
                                  height: 4, background: T.bg, borderRadius: 2,
                                  overflow: 'hidden', marginTop: 5,
                                }}>
                                  <div style={{
                                    height: '100%', width: `${pct}%`,
                                    background: pct > 70 ? T.warn : T.accent2,
                                    transition: 'width 0.3s ease',
                                  }} />
                                </div>
                                <div style={{
                                  fontSize: 11, color: T.textDim, marginTop: 4,
                                  display: 'flex', gap: 8, flexWrap: 'wrap',
                                }}>
                                  <strong style={{ color: T.text }}>{sizeLabel}</strong>
                                  {p.genImageCount > 0 && <span>· {p.genImageCount} รูป gen</span>}
                                  {p.shotCount > 0 && <span>· {p.shotCount} shots</span>}
                                  {p.hasAudio && <span style={{ color: T.pink }}>· 🎵 มีเสียง</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                {p.hasAudio && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(
                                        `⚠️ ล้างเสียงพากย์ของ project นี้?\n\n` +
                                        `"${p.name}"\n\n` +
                                        `· script + voice + persona ยังเก็บไว้\n` +
                                        `· gen ใหม่ได้เสมอ\n\n` +
                                        `กด OK เพื่อยืนยัน`
                                      )) return;
                                      try {
                                        await clearNarrationAudio(p.id);
                                        if (p.id === project?.id) {
                                          const fresh = await loadProject(p.id);
                                          if (fresh) setProject(ensureStyleSchema(fresh));
                                        }
                                        await refreshStorageInfo();
                                        await refreshProjectStats();
                                        toast.success('ล้างเสียงแล้ว');
                                      } catch (e) {
                                        toast.error('ล้างไม่สำเร็จ: ' + e.message);
                                      }
                                    }}
                                    style={{
                                      ...s.btnGhost, padding: '5px 9px', fontSize: 12,
                                      borderColor: T.pink + '55', color: T.pink,
                                    }}
                                    title="ล้างเฉพาะเสียงพากย์ของ project นี้ (ยืนยันก่อน)"
                                  >🎵</button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(
                                      `⚠️ ลบ project นี้ทั้งหมด?\n\n` +
                                      `"${p.name}"\n\n` +
                                      `จะลบ:\n` +
                                      `· ขนาด ${sizeLabel}\n` +
                                      `· ${p.shotCount} shots · ${p.genImageCount} รูป gen` +
                                      (p.hasAudio ? `\n· เสียงพากย์ที่สร้างไว้` : '') +
                                      `\n\n🚨 ลบแล้วกู้คืนไม่ได้\n\nกด OK เพื่อยืนยันการลบ`
                                    )) return;
                                    try {
                                      await deleteProject(p.id);
                                      if (p.id === project?.id) {
                                        // active ถูกลบ → switch ไป project แรกที่เหลือ หรือ null
                                        const list = await listProjects();
                                        if (list.length > 0) {
                                          const fresh = await loadProject(list[0].id);
                                          if (fresh) setProject(ensureStyleSchema(fresh));
                                        } else {
                                          setProject(null);
                                        }
                                      }
                                      await refreshStorageInfo();
                                      await refreshProjectStats();
                                      toast.success(`ลบ "${p.name}" แล้ว`);
                                    } catch (e) {
                                      toast.error('ลบไม่สำเร็จ: ' + e.message);
                                    }
                                  }}
                                  style={{
                                    ...s.btnGhost, padding: '5px 9px', fontSize: 12,
                                    borderColor: T.err + '55', color: T.err,
                                  }}
                                  title="ลบ project ทั้งหมด — กู้คืนไม่ได้ (ยืนยันก่อน)"
                                >🗑</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    const audioCount = projectStats.filter(p => p.hasAudio).length;
                    if (audioCount === 0) {
                      toast('ไม่มี project ไหนมีเสียงพากย์ — ไม่ต้องล้าง', { icon: '💡' });
                      return;
                    }
                    if (!window.confirm(
                      `⚠️ ล้างเสียงพากย์ทุก project?\n\n` +
                      `จะล้างเสียงจาก ${audioCount} project\n\n` +
                      `· script + voice + persona ยังเก็บไว้\n` +
                      `· gen ใหม่ได้เสมอ (ไม่หายถาวร)\n\n` +
                      `กด OK เพื่อยืนยัน`
                    )) return;
                    try {
                      const n = await clearAllNarrationAudio();
                      if (project?.id) {
                        const fresh = await loadProject(project.id);
                        if (fresh) setProject(ensureStyleSchema(fresh));
                      }
                      await refreshStorageInfo();
                      await refreshProjectStats();
                      toast.success(`ล้างเสียงไป ${n} project แล้ว`);
                    } catch (e) {
                      toast.error('ล้างไม่สำเร็จ: ' + e.message);
                    }
                  }}
                  style={{ ...s.btnGhost, fontSize: 12, padding: '7px 12px',
                           borderColor: T.pink + '55', color: T.pink }}
                >🗑 ล้างเสียง (ทุก project)</button>
                <button
                  onClick={async () => {
                    const total = projectStats.reduce((acc, p) => acc + p.genImageCount, 0);
                    if (total === 0) {
                      toast('ไม่มีรูป gen อยู่ — ไม่ต้องล้าง', { icon: '💡' });
                      return;
                    }
                    if (!window.confirm(
                      `⚠️ ลบรูปที่ gen ทั้งหมดในทุก project?\n\n` +
                      `จะลบรูป ${total} รูปจากทุก project\n\n` +
                      `· prompts + reference uploads ยังเก็บไว้\n` +
                      `· รูปหลัก 👑 ที่ตั้งไว้ก็จะหาย\n` +
                      `· gen ใหม่ได้ (ต้องเสีย Gemini quota ใหม่)\n\n` +
                      `🚨 ลบแล้วกู้คืนไม่ได้\n\nกด OK เพื่อยืนยันการลบ`
                    )) return;
                    try {
                      const n = await clearAllGeneratedImagesAcrossProjects();
                      if (project?.id) {
                        const fresh = await loadProject(project.id);
                        if (fresh) setProject(ensureStyleSchema(fresh));
                      }
                      await refreshStorageInfo();
                      await refreshProjectStats();
                      toast.success(`ล้างรูปไป ${n} project แล้ว`);
                    } catch (e) {
                      toast.error('ล้างไม่สำเร็จ: ' + e.message);
                    }
                  }}
                  style={{ ...s.btnGhost, fontSize: 12, padding: '7px 12px',
                           borderColor: T.warn + '55', color: T.warn }}
                >🗑 ล้างรูป gen (ทุก project)</button>
                <button
                  onClick={async () => {
                    await refreshStorageInfo();
                    await refreshProjectStats();
                  }}
                  style={{ ...s.btnGhost, fontSize: 12, padding: '7px 12px' }}
                  title="คำนวณใหม่"
                >🔄</button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: T.textDim, lineHeight: 1.75 }}>
            <strong style={{ color: T.text }}>🔒 ทุกอย่างทำงานในเครื่องคุณเท่านั้น</strong><br />
            API key, รูป, prompts, เสียง ถูกเก็บใน browser (IndexedDB) — <em>ไม่</em>ถูกส่งไป server ttsam<br />
            อย่าใช้บนเครื่องสาธารณะหรือเครื่องที่ไม่ใช่ของคุณ · เปลี่ยนเครื่องต้อง paste key ใหม่<br />
            <span style={{ color: T.textDim, fontSize: 11 }}>
              Sign-in กับ Google จะใช้ OAuth ของ ttsam เพื่อขอ scope <code style={{ background: T.bg, padding: '0 4px', borderRadius: 3 }}>documents</code> + <code style={{ background: T.bg, padding: '0 4px', borderRadius: 3 }}>drive.file</code> สำหรับ export — token เก็บใน browser ไม่ถูกส่งกลับเรา
            </span>
          </p>

        </div>

        {/* ── Lightbox — รูปขยาย (Chrome block data: URL ใน new tab) ──── */}
        {lightboxSrc && (
          <div
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24, cursor: 'zoom-out',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
              style={{
                position: 'absolute', top: 16, right: 16, zIndex: 10001,
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 999, width: 40, height: 40,
                fontSize: 18, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="ปิด (ESC)"
            >✕</button>
            <img
              src={lightboxSrc}
              alt="preview"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '95vw', maxHeight: '92vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8)',
                cursor: 'default',
              }}
            />
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              padding: '6px 14px', borderRadius: 99,
              fontSize: 12, fontWeight: 500,
              pointerEvents: 'none',
            }}>
              คลิกพื้นหลัง / กด ESC เพื่อปิด
            </div>
          </div>
        )}

        {/* ── Generic image picker modal (gen รูปนางแบบ + อนาคต อื่นๆ) ──── */}
        {imagePicker && (
          <div
            onClick={() => { imagePicker.onClose?.(); setImagePicker(null); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: T.panel, border: `1px solid ${T.borderHi}`,
                borderRadius: 14, padding: 24, maxWidth: 720, width: '100%',
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
                  {imagePicker.title || 'เลือก 1 รูป'}
                </h2>
                <button
                  onClick={() => { imagePicker.onClose?.(); setImagePicker(null); }}
                  style={{ ...s.btnGhost, padding: '4px 10px' }}
                  title="ปิด"
                >✕</button>
              </div>
              {imagePicker.hint && (
                <p style={{ fontSize: 12, color: T.textMute, margin: '0 0 16px', lineHeight: 1.6 }}>
                  {imagePicker.hint}
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {imagePicker.variants.map((v, idx) => (
                  <div
                    key={idx}
                    onClick={() => imagePicker.onPick(v)}
                    style={{
                      cursor: 'pointer', borderRadius: 10,
                      border: `2px solid ${T.borderHi}`,
                      overflow: 'hidden', position: 'relative',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.ok; e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <img src={v.dataUrl} alt={`variant ${idx + 1}`}
                      style={{ width: '100%', display: 'block', aspectRatio: '1/1', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      color: '#fff', padding: '20px 10px 10px',
                      fontSize: 12, fontWeight: 700, textAlign: 'center',
                    }}>
                      ✓ ใช้ตัวที่ {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
