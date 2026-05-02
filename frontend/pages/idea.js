// pages/idea.js — Product Lab: feature planning board
// Backed by Firestore (admin-only) + drag/drop kanban + markdown desc + tags + search + history
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import * as ideasApi from '../lib/ideas';

// ─── Constants ────────────────────────────────────────────────────────────────
const OWNER_EMAIL  = process.env.NEXT_PUBLIC_OWNER_EMAIL;
const LS_KEY       = 'ttplus_product_lab';            // legacy localStorage key
const LS_MIGRATED  = 'ttplus_product_lab_migrated';   // marker set after one-time migration

const COLS = [
  { id: 'idea',  label: '💡 Idea',         color: '#818cf8' },
  { id: 'plan',  label: '🤔 กำลังคิด',     color: '#f59e0b' },
  { id: 'build', label: '⚡ กำลังทำ',       color: '#34d399' },
  { id: 'done',  label: '✅ เสร็จแล้ว',    color: '#6b7280' },
];

const PM_PROMPTS = [
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — ใครคือ user กลุ่มหลักที่ได้ประโยชน์สูงสุด และทำไม?`,
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — pain point หลักที่แก้คืออะไร และปัจจุบัน user แก้ปัญหานี้ยังไง?`,
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — ควรวัดความสำเร็จด้วย metric อะไร?`,
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — มีวิธีที่ง่ายกว่าหรือ MVP ที่เล็กกว่านี้ไหม?`,
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — ต้องพึ่งพา feature อื่น หรือต้องทำอะไรก่อน?`,
  (n) => `สำหรับ feature "${n}" ใน ttsam.app — user ใหม่จะเจอ feature นี้ยังไง และ onboard ได้เลยหรือต้องการ setup?`,
];

const PM_LABELS = [
  'ใครได้ประโยชน์?',
  'แก้ pain point อะไร?',
  'วัดความสำเร็จยังไง?',
  'มี MVP ที่เล็กกว่านี้ไหม?',
  'ต้องทำอะไรก่อน?',
  'user จะ onboard ยังไง?',
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  card: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: '16px 18px',
  },
  input: {
    background: '#0f172a',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#e5e7eb',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: (col = '#818cf8') => ({
    background: col + '22',
    color: col,
    border: `1px solid ${col}44`,
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  }),
  badge: (col) => ({
    background: col + '22',
    color: col,
    border: `1px solid ${col}44`,
    borderRadius: 99,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    display: 'inline-block',
    lineHeight: 1.5,
  }),
};

// ─── Score helpers ─────────────────────────────────────────────────────────────
// score = (impact / effort) * 10 — สูง = quick win (impact สูง effort ต่ำ)
// range: 2 (i=1,e=5) ถึง 50 (i=5,e=1)
function scoreOf(idea) {
  const i = idea.impact || 1;
  const e = idea.effort || 1;
  return Math.round((i / e) * 10);
}
function scoreColor(sc) {
  if (sc >= 30) return '#34d399';   // quick win
  if (sc >= 15) return '#f59e0b';   // ok
  return '#6b7280';                  // low priority
}

// ─── Time helpers ──────────────────────────────────────────────────────────────
function relTime(ms) {
  if (!ms) return '';
  const d = Date.now() - ms;
  if (d < 60_000) return 'ตอนนี้';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} นาทีที่แล้ว`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} ชม.ที่แล้ว`;
  if (d < 604_800_000) return `${Math.floor(d / 86_400_000)} วันที่แล้ว`;
  const date = new Date(ms);
  return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(2)}`;
}

// ─── Markdown renderer (compact, dark theme) ──────────────────────────────────
const mdComponents = {
  p: ({ children }) => <p style={{ margin: '4px 0', lineHeight: 1.5 }}>{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>{children}</a>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code style={{ background: '#0a0a14', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace', color: '#fcd34d' }}>{children}</code>
    ) : (
      <pre style={{ background: '#0a0a14', padding: 8, borderRadius: 6, overflowX: 'auto', margin: '4px 0' }}>
        <code style={{ fontSize: '0.85em', fontFamily: 'monospace', color: '#cbd5e1' }}>{children}</code>
      </pre>
    ),
  ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '2px 0', lineHeight: 1.45 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid #374151', paddingLeft: 8, margin: '4px 0', color: '#94a3b8' }}>{children}</blockquote>
  ),
};

function Markdown({ text }) {
  if (!text) return null;
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{text}</ReactMarkdown>;
}

// ─── IdeaCard ─────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onEdit, onDelete, onShowHistory, dragHandleProps, isDragging }) {
  const sc = scoreOf(idea);
  return (
    <div style={{
      ...s.card,
      padding: '12px 14px',
      marginBottom: 8,
      transition: 'border-color .15s, box-shadow .15s',
      ...(isDragging ? { borderColor: '#818cf8', boxShadow: '0 4px 12px rgba(129,140,248,0.3)' } : {}),
    }}>
      {/* Drag handle area + title */}
      <div {...dragHandleProps} style={{ cursor: 'grab', marginBottom: idea.desc ? 4 : 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', lineHeight: 1.4 }}>
          {idea.name}
        </div>
      </div>

      {idea.desc && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
          <Markdown text={idea.desc} />
        </div>
      )}

      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {idea.tags.map(t => (
            <span key={t} style={{ ...s.badge('#a78bfa'), fontSize: 10, padding: '1px 7px' }}>#{t}</span>
          ))}
        </div>
      )}

      {/* Score badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={s.badge(scoreColor(sc))}>score {sc}</span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>I:{idea.impact} ÷ E:{idea.effort}</span>
        {idea.history && idea.history.length > 0 && (
          <span style={{ fontSize: 10, color: '#4b5563' }}>· {idea.history.length} ครั้ง</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button style={{ ...s.btn('#818cf8'), fontSize: 11, padding: '3px 9px' }} onClick={() => onEdit(idea)}>แก้ไข</button>
        {idea.history && idea.history.length > 0 && (
          <button style={{ ...s.btn('#94a3b8'), fontSize: 11, padding: '3px 9px' }} onClick={() => onShowHistory(idea)}>📜 history</button>
        )}
        <button style={{ ...s.btn('#f87171'), fontSize: 11, padding: '3px 9px' }} onClick={() => onDelete(idea.id)}>ลบ</button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function IdeaModal({ idea, onSave, onClose }) {
  const [name,    setName]    = useState(idea?.name    ?? '');
  const [desc,    setDesc]    = useState(idea?.desc    ?? '');
  const [impact,  setImpact]  = useState(idea?.impact  ?? 3);
  const [effort,  setEffort]  = useState(idea?.effort  ?? 3);
  const [status,  setStatus]  = useState(idea?.status  ?? 'idea');
  const [tags,    setTags]    = useState((idea?.tags || []).join(', '));
  const [pmIdx,   setPmIdx]   = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const score = useMemo(() => scoreOf({ impact, effort }), [impact, effort]);

  function handleSave() {
    if (!name.trim()) return;
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10);
    onSave({ name: name.trim(), desc: desc.trim(), impact, effort, status, tags: tagList });
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}>
      <div style={{ ...s.card, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb' }}>
            {idea ? '✏️ แก้ไข idea' : '✨ เพิ่ม idea ใหม่'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>ชื่อ idea *</div>
          <input
            autoFocus
            style={s.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="เช่น Donation goal bar widget"
          />
        </div>

        {/* Desc with preview toggle */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>รายละเอียด (markdown · ไม่บังคับ)</span>
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 11, cursor: 'pointer', padding: 0 }}>
              {showPreview ? '✏️ edit' : '👁 preview'}
            </button>
          </div>
          {showPreview ? (
            <div style={{
              ...s.input,
              height: 'auto',
              minHeight: 100,
              padding: '10px 12px',
              color: '#cbd5e1',
              fontSize: 12,
            }}>
              {desc ? <Markdown text={desc} /> : <span style={{ color: '#4b5563' }}>(ว่าง)</span>}
            </div>
          ) : (
            <textarea
              style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="รองรับ **bold**, *italic*, `code`, - list, [link](url) ..."
            />
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>tags (คั่นด้วย comma · max 10)</div>
          <input
            style={s.input}
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="เช่น widget, OBS, urgent"
          />
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Impact (ผลต่อ user)', val: impact, set: setImpact },
            { label: 'Effort (ความยาก)',   val: effort, set: setEffort },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{label}</div>
              <input
                type="range" min={1} max={5} step={1}
                value={val}
                onChange={e => set(+e.target.value)}
                style={{ width: '100%', accentColor: '#818cf8' }}
              />
              <div style={{ textAlign: 'center', fontSize: 13, color: '#e5e7eb', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Priority score:</span>
          <span style={s.badge(scoreColor(score))}>score {score}</span>
          <span style={{ fontSize: 11, color: '#4b5563' }}>(impact ÷ effort × 10)</span>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>สถานะ</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLS.map(c => (
              <button
                key={c.id}
                onClick={() => setStatus(c.id)}
                style={{
                  ...s.btn(status === c.id ? c.color : '#374151'),
                  fontSize: 11,
                  padding: '4px 10px',
                }}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* PM prompts */}
        <div style={{ borderTop: '1px solid #1f2937', paddingTop: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>💡 คำถาม PM — ช่วยคิด</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PM_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => { setPmIdx(i); }}
                style={{
                  background: pmIdx === i ? '#818cf822' : '#0f172a',
                  color: '#94a3b8',
                  border: `1px solid ${pmIdx === i ? '#818cf844' : '#1f2937'}`,
                  borderRadius: 7,
                  padding: '6px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                  lineHeight: 1.4,
                }}
              >{label}</button>
            ))}
          </div>
          {pmIdx !== null && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#0f172a', borderRadius: 8, border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 6 }}>คำถามสำหรับ Claude:</div>
              <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{PM_PROMPTS[pmIdx](name || 'idea นี้')}</div>
              <button
                style={{ ...s.btn('#818cf8'), marginTop: 8, fontSize: 11, padding: '4px 12px' }}
                onClick={() => {
                  const q = PM_PROMPTS[pmIdx](name || 'idea นี้');
                  navigator.clipboard?.writeText(q).catch(() => {});
                  setPmIdx(null);
                }}>คัดลอกคำถาม</button>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#4b5563' }}>{idea ? '⌘+Enter บันทึก · Esc ปิด' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn('#6b7280')} onClick={onClose}>ยกเลิก</button>
            <button
              style={{ ...s.btn('#34d399'), opacity: name.trim() ? 1 : 0.5 }}
              onClick={handleSave}
              disabled={!name.trim()}>
              {idea ? 'บันทึก' : 'เพิ่ม'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History modal ─────────────────────────────────────────────────────────────
function HistoryModal({ idea, onClose }) {
  const history = (idea.history || []).slice().reverse();
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.card, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f9fafb' }}>📜 ประวัติ — {idea.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: '#4b5563' }}>ยังไม่มีการเปลี่ยนสถานะ</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => {
              const fromCol = COLS.find(c => c.id === h.from);
              const toCol   = COLS.find(c => c.id === h.to);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280', width: 100, fontSize: 11 }}>{relTime(h.at)}</span>
                  <span style={{ ...s.badge(fromCol?.color || '#6b7280'), fontSize: 10 }}>{fromCol?.label || h.from}</span>
                  <span style={{ color: '#4b5563' }}>→</span>
                  <span style={{ ...s.badge(toCol?.color || '#6b7280'), fontSize: 10 }}>{toCol?.label || h.to}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button style={s.btn('#6b7280')} onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

// ─── Matrix view ──────────────────────────────────────────────────────────────
function MatrixView({ ideas }) {
  const quads = [
    { label: 'Quick wins',  sub: 'Impact สูง / Effort ต่ำ',  col: '#34d399', test: i => i.impact >= 4 && i.effort <= 2 },
    { label: 'Big bets',    sub: 'Impact สูง / Effort สูง',  col: '#818cf8', test: i => i.impact >= 4 && i.effort >= 3 },
    { label: 'Fill-ins',    sub: 'Impact ต่ำ / Effort ต่ำ',  col: '#f59e0b', test: i => i.impact <= 3 && i.effort <= 2 },
    { label: 'Reconsider',  sub: 'Impact ต่ำ / Effort สูง',  col: '#f87171', test: i => i.impact <= 3 && i.effort >= 3 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {quads.map(q => {
        const items = ideas.filter(q.test).sort((a, b) => scoreOf(b) - scoreOf(a));
        return (
          <div key={q.label} style={{ ...s.card, borderColor: q.col + '33' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: q.col, marginBottom: 2 }}>{q.label}</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 10 }}>{q.sub}</div>
            {items.length === 0
              ? <div style={{ fontSize: 11, color: '#374151' }}>— ไม่มี</div>
              : items.map(i => (
                  <div key={i.id} style={{ fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #1f2937', padding: '5px 0', lineHeight: 1.4 }}>
                    {i.name}
                    <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 6 }}>score {scoreOf(i)}</span>
                  </div>
                ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Export to markdown ───────────────────────────────────────────────────────
function ideasToMarkdown(ideas) {
  const lines = ['# Product Lab — Ideas', `_exported ${new Date().toLocaleString('th-TH')}_`, ''];
  for (const col of COLS) {
    const items = ideas.filter(i => i.status === col.id).sort((a, b) => scoreOf(b) - scoreOf(a));
    lines.push(`## ${col.label} (${items.length})`);
    if (items.length === 0) {
      lines.push('_(ว่าง)_', '');
      continue;
    }
    for (const i of items) {
      const tagStr = i.tags && i.tags.length ? ' ' + i.tags.map(t => `\`#${t}\``).join(' ') : '';
      lines.push(`### ${i.name} — score ${scoreOf(i)} (I:${i.impact}÷E:${i.effort})${tagStr}`);
      if (i.desc) lines.push('', i.desc, '');
      else lines.push('');
    }
  }
  return lines.join('\n');
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function IdeaPage() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [ideas,   setIdeas]   = useState([]);
  const [tab,     setTab]     = useState('kanban');
  const [modal,   setModal]   = useState(null);     // null | 'new' | { idea } | { history: idea }
  const [quickInput, setQuickInput] = useState('');
  const [search,  setSearch]  = useState('');
  const [activeTag, setActiveTag] = useState(null); // filter by tag
  const [busy,    setBusy]    = useState(false);    // saving/loading flag
  const [toast,   setToast]   = useState('');
  const searchRef = useRef(null);

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u || u.email !== OWNER_EMAIL) {
        router.replace('/');
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ─── Load from Firestore + one-time localStorage migration ──────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let list = await ideasApi.listIdeas();

        // Migration: ถ้ายังไม่ migrate และมี localStorage data → import ขึ้น Firestore
        const migrated = typeof window !== 'undefined' && localStorage.getItem(LS_MIGRATED);
        if (!migrated && list.length === 0) {
          let raw;
          try { raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { raw = []; }
          if (Array.isArray(raw) && raw.length > 0) {
            const imported = await ideasApi.bulkImport(raw);
            list = imported;
            showToast(`migrate ${imported.length} ideas จาก localStorage แล้ว`);
          }
          localStorage.setItem(LS_MIGRATED, '1');
        }

        if (!cancelled) setIdeas(list);
      } catch (err) {
        console.error('[Idea] load failed:', err);
        if (!cancelled) showToast('โหลด ideas ไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const addIdea = useCallback(async (fields) => {
    setBusy(true);
    try {
      const created = await ideasApi.createIdea(fields);
      if (created) setIdeas(prev => [...prev, created]);
      setModal(null);
    } catch (err) {
      showToast('บันทึกไม่สำเร็จ');
    } finally { setBusy(false); }
  }, []);

  const updateIdea = useCallback(async (id, fields) => {
    setBusy(true);
    try {
      const updated = await ideasApi.updateIdea(id, fields);
      if (updated) setIdeas(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) {
      showToast('อัปเดตไม่สำเร็จ');
    } finally { setBusy(false); }
  }, []);

  async function handleSaveEdit(fields) {
    if (!modal?.idea) return;
    await updateIdea(modal.idea.id, fields);
    setModal(null);
  }

  async function deleteIdea(id) {
    if (!confirm('ลบ idea นี้?')) return;
    setBusy(true);
    try {
      await ideasApi.deleteIdea(id);
      setIdeas(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      showToast('ลบไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  async function moveIdea(id, status) {
    // optimistic update
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    try {
      await ideasApi.updateIdea(id, { status });
    } catch (err) {
      showToast('เปลี่ยนสถานะไม่สำเร็จ — refresh หน้า');
    }
  }

  async function handleQuickAdd(e) {
    if (e.key !== 'Enter' || !quickInput.trim()) return;
    const text = quickInput.trim();
    setQuickInput('');
    await addIdea({ name: text, desc: '', impact: 3, effort: 3, status: 'idea', tags: [] });
  }

  function handleExport() {
    const md = ideasToMarkdown(ideas);
    navigator.clipboard?.writeText(md)
      .then(() => showToast('คัดลอก markdown ลง clipboard แล้ว'))
      .catch(() => showToast('copy ไม่สำเร็จ'));
  }

  // ─── Drag & drop handler ────────────────────────────────────────────────────
  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    moveIdea(draggableId, destination.droppableId);
  }

  // ─── Filtered ideas (search + tag filter) ────────────────────────────────────
  const filteredIdeas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ideas.filter(i => {
      if (activeTag && !(i.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      const hay = [i.name, i.desc, ...(i.tags || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [ideas, search, activeTag]);

  // ─── All tags (for filter chips) ─────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set();
    for (const i of ideas) for (const t of (i.tags || [])) set.add(t);
    return Array.from(set).sort();
  }, [ideas]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      // ignore shortcuts when typing
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || modal) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setModal('new');
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const total    = ideas.length;
  const highPri  = ideas.filter(i => scoreOf(i) >= 30).length;
  const inProg   = ideas.filter(i => i.status === 'build').length;
  const done     = ideas.filter(i => i.status === 'done').length;

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4b5563', fontSize: 14 }}>กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Product Lab — ttsam.app</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #1f2937', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/admin')}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, padding: 0 }}>
              ← Admin
            </button>
            <span style={{ color: '#1f2937' }}>|</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f9fafb' }}>🔬 Product Lab</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn('#6b7280')} onClick={handleExport} title="Export markdown ลง clipboard">📋 export</button>
            <button style={s.btn('#818cf8')} onClick={() => setModal('new')}>+ เพิ่ม idea <kbd style={{ fontSize: 9, padding: '1px 4px', background: '#0f172a', borderRadius: 3, marginLeft: 4 }}>N</kbd></button>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'ทั้งหมด',          value: total,   color: '#818cf8', icon: '💡' },
              { label: 'High priority',    value: highPri, color: '#34d399', icon: '🚀' },
              { label: 'กำลังทำ',           value: inProg,  color: '#f59e0b', icon: '⚡' },
              { label: 'เสร็จแล้ว',         value: done,    color: '#6b7280', icon: '✅' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ ...s.card, borderColor: color + '33', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Quick add + search */}
          <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="+ พิมพ์ idea ใหม่แล้วกด Enter..."
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={handleQuickAdd}
            />
            <input
              ref={searchRef}
              style={{ ...s.input, flex: 1 }}
              placeholder="🔍 ค้นหา (กด /)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>tag:</span>
              <button
                onClick={() => setActiveTag(null)}
                style={{
                  ...s.btn(activeTag === null ? '#818cf8' : '#374151'),
                  fontSize: 11, padding: '2px 9px',
                }}>ทั้งหมด</button>
              {allTags.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  style={{
                    ...s.btn(activeTag === t ? '#a78bfa' : '#374151'),
                    fontSize: 11, padding: '2px 9px',
                  }}>#{t}</button>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1f2937', marginBottom: 20 }}>
            {[{ id: 'kanban', label: '📋 Kanban' }, { id: 'matrix', label: '🎯 Priority Matrix' }].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${tab === t.id ? '#818cf8' : 'transparent'}`,
                  color: tab === t.id ? '#818cf8' : '#6b7280',
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}>{t.label}</button>
            ))}
          </div>

          {/* Kanban with drag-drop */}
          {tab === 'kanban' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {COLS.map(col => {
                  const colIdeas = filteredIdeas
                    .filter(i => i.status === col.id)
                    .sort((a, b) => scoreOf(b) - scoreOf(a));
                  return (
                    <div key={col.id}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        marginBottom: 12, paddingBottom: 8,
                        borderBottom: `2px solid ${col.color}44`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          {col.label}
                        </span>
                        <span style={{ ...s.badge(col.color), fontSize: 10 }}>{colIdeas.length}</span>
                      </div>
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              minHeight: 60,
                              padding: 4,
                              borderRadius: 8,
                              background: snapshot.isDraggingOver ? col.color + '11' : 'transparent',
                              transition: 'background .15s',
                            }}>
                            {colIdeas.length === 0 && !snapshot.isDraggingOver
                              ? <div style={{ fontSize: 12, color: '#374151', textAlign: 'center', padding: '16px 0' }}>ลากมาที่นี่</div>
                              : colIdeas.map((idea, idx) => (
                                  <Draggable key={idea.id} draggableId={idea.id} index={idx}>
                                    {(prov, snap) => (
                                      <div ref={prov.innerRef} {...prov.draggableProps}>
                                        <IdeaCard
                                          idea={idea}
                                          dragHandleProps={prov.dragHandleProps}
                                          isDragging={snap.isDragging}
                                          onEdit={i => setModal({ idea: i })}
                                          onDelete={deleteIdea}
                                          onShowHistory={i => setModal({ history: i })}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          )}

          {/* Matrix */}
          {tab === 'matrix' && <MatrixView ideas={filteredIdeas} />}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px', color: '#374151', fontSize: 11 }}>
          ☁️ ซิงค์ผ่าน Firestore — ใช้ได้ข้าม browser/อุปกรณ์ · ลาก-วาง card · กด <kbd style={{ background: '#1f2937', padding: '1px 5px', borderRadius: 3 }}>N</kbd> เพิ่ม · <kbd style={{ background: '#1f2937', padding: '1px 5px', borderRadius: 3 }}>/</kbd> ค้นหา
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', color: '#e5e7eb', padding: '10px 18px',
          borderRadius: 8, fontSize: 13, zIndex: 1100, border: '1px solid #374151',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>{toast}</div>
      )}

      {/* Saving indicator */}
      {busy && (
        <div style={{
          position: 'fixed', top: 14, right: 14, fontSize: 11, color: '#6b7280',
          background: '#111827', padding: '4px 10px', borderRadius: 6, border: '1px solid #1f2937',
        }}>กำลังบันทึก...</div>
      )}

      {/* Modals */}
      {modal === 'new' && (
        <IdeaModal onSave={addIdea} onClose={() => setModal(null)} />
      )}
      {modal && modal.idea && (
        <IdeaModal idea={modal.idea} onSave={handleSaveEdit} onClose={() => setModal(null)} />
      )}
      {modal && modal.history && (
        <HistoryModal idea={modal.history} onClose={() => setModal(null)} />
      )}
    </>
  );
}
