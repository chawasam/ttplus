// pages/idea.js — Product Lab: feature planning board
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Head from 'next/head';

// ─── Constants ────────────────────────────────────────────────────────────────
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL;
const LS_KEY = 'ttplus_product_lab';

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
function scoreOf(idea) { return idea.impact * idea.effort; }
function scoreColor(s) {
  if (s >= 15) return '#34d399';
  if (s >= 8)  return '#f59e0b';
  return '#6b7280';
}

// ─── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_IDEAS = [
  { id: 1, name: 'Live donation goal bar', desc: 'แสดง progress bar เป้าหมาย donation แบบ real-time บน OBS', impact: 5, effort: 3, status: 'idea',  created: Date.now() },
  { id: 2, name: 'Widget theme presets',   desc: 'ชุดสี preset สำหรับ widget ไม่ต้องตั้งค่าทีละอัน',          impact: 4, effort: 2, status: 'plan',  created: Date.now() },
  { id: 3, name: 'TTS queue list overlay', desc: 'แสดง queue ข้อความ TTS ที่รอพูดบน OBS',                    impact: 3, effort: 3, status: 'build', created: Date.now() },
];

// ─── IdeaCard ─────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onEdit, onDelete, onMove }) {
  const sc = scoreOf(idea);
  const colIdx = COLS.findIndex(c => c.id === idea.status);
  const prev = COLS[colIdx - 1];
  const next = COLS[colIdx + 1];

  return (
    <div style={{
      ...s.card,
      padding: '12px 14px',
      marginBottom: 8,
      transition: 'border-color .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#374151')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1f2937')}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: idea.desc ? 4 : 8, lineHeight: 1.4 }}>
        {idea.name}
      </div>
      {idea.desc && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>{idea.desc}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={s.badge(scoreColor(sc))}>score {sc}</span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>I:{idea.impact} × E:{idea.effort}</span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {prev && (
          <button style={{ ...s.btn('#94a3b8'), fontSize: 11, padding: '3px 9px' }} onClick={() => onMove(idea.id, prev.id)}>
            ← {prev.label}
          </button>
        )}
        {next && (
          <button style={{ ...s.btn(next.color), fontSize: 11, padding: '3px 9px' }} onClick={() => onMove(idea.id, next.id)}>
            {next.label} →
          </button>
        )}
        <button style={{ ...s.btn('#818cf8'), fontSize: 11, padding: '3px 9px' }} onClick={() => onEdit(idea)}>แก้ไข</button>
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
  const [pmIdx,   setPmIdx]   = useState(null);

  const score = impact * effort;

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), desc: desc.trim(), impact, effort, status });
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && e.metaKey) handleSave();
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
      <div style={{ ...s.card, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
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

        {/* Desc */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>รายละเอียด (ไม่บังคับ)</div>
          <textarea
            style={{ ...s.input, height: 64, resize: 'none' }}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="อธิบายเพิ่มเติม..."
          />
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Impact (ผลต่อ user)', val: impact, set: setImpact },
            { label: 'Effort (ความยาก)', val: effort, set: setEffort },
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
          <span style={{ fontSize: 11, color: '#4b5563' }}>({impact} × {effort})</span>
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
                  borderWidth: status === c.id ? 1 : 1,
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={s.btn('#6b7280')} onClick={onClose}>ยกเลิก</button>
          <button
            style={{ ...s.btn('#34d399'), opacity: name.trim() ? 1 : 0.5 }}
            onClick={handleSave}
            disabled={!name.trim()}>
            {idea ? 'บันทึกการแก้ไข' : 'เพิ่ม idea'}
          </button>
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
        const items = ideas.filter(q.test);
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function IdeaPage() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [ideas,   setIdeas]   = useState([]);
  const [tab,     setTab]     = useState('kanban');
  const [modal,   setModal]   = useState(null);  // null | 'new' | {idea}
  const [quickInput, setQuickInput] = useState('');

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u || u.email !== OWNER_EMAIL) {
        router.replace('/');
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      setIdeas(raw ? JSON.parse(raw) : DEFAULT_IDEAS);
    } catch {
      setIdeas(DEFAULT_IDEAS);
    }
  }, [user]);

  const saveIdeas = useCallback((next) => {
    setIdeas(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  function addIdea(fields) {
    const next = [...ideas, { id: Date.now(), ...fields, created: Date.now() }];
    saveIdeas(next);
    setModal(null);
  }

  function updateIdea(fields) {
    const next = ideas.map(i => i.id === modal.idea.id ? { ...i, ...fields } : i);
    saveIdeas(next);
    setModal(null);
  }

  function deleteIdea(id) {
    if (!confirm('ลบ idea นี้?')) return;
    saveIdeas(ideas.filter(i => i.id !== id));
  }

  function moveIdea(id, status) {
    saveIdeas(ideas.map(i => i.id === id ? { ...i, status } : i));
  }

  function handleQuickAdd(e) {
    if (e.key !== 'Enter' || !quickInput.trim()) return;
    addIdea({ name: quickInput.trim(), desc: '', impact: 3, effort: 3, status: 'idea' });
    setQuickInput('');
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const total    = ideas.length;
  const highPri  = ideas.filter(i => scoreOf(i) >= 15).length;
  const inProg   = ideas.filter(i => i.status === 'build').length;
  const done     = ideas.filter(i => i.status === 'done').length;

  if (loading) {
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
          <button style={s.btn('#818cf8')} onClick={() => setModal('new')}>+ เพิ่ม idea</button>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>
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

          {/* Quick add */}
          <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="พิมพ์ idea ใหม่แล้วกด Enter..."
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={handleQuickAdd}
            />
            <button style={s.btn('#818cf8')} onClick={() => setModal('new')}>✏️ เพิ่มแบบเต็ม</button>
          </div>

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

          {/* Kanban */}
          {tab === 'kanban' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {COLS.map(col => {
                const colIdeas = ideas
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
                    {colIdeas.length === 0
                      ? <div style={{ fontSize: 12, color: '#374151', textAlign: 'center', padding: '16px 0' }}>ว่างอยู่</div>
                      : colIdeas.map(idea => (
                          <IdeaCard
                            key={idea.id}
                            idea={idea}
                            onEdit={i => setModal({ idea: i })}
                            onDelete={deleteIdea}
                            onMove={moveIdea}
                          />
                        ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Matrix */}
          {tab === 'matrix' && <MatrixView ideas={ideas} />}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px', color: '#374151', fontSize: 11 }}>
          ข้อมูลเก็บใน localStorage — ไม่ซิงค์ข้าม browser
        </div>
      </div>

      {/* Modal */}
      {modal === 'new' && (
        <IdeaModal onSave={addIdea} onClose={() => setModal(null)} />
      )}
      {modal && modal.idea && (
        <IdeaModal idea={modal.idea} onSave={updateIdea} onClose={() => setModal(null)} />
      )}
    </>
  );
}
