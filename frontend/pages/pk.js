// pages/pk.js — PK Panel Control Page
import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { getSocket, setTokenRefresher } from '../lib/socket';
import api from '../lib/api';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const CATEGORIES = [
  { id: 'taptap', label: 'Tap Tap',  emoji: '👊' },
  { id: 'nwm',    label: 'นวม',      emoji: '🥊' },
  { id: 'x2',     label: 'คูณ 2',    emoji: '✖️2' },
  { id: 'x3',     label: 'คูณ 3',    emoji: '✖️3' },
  { id: 'mvp',    label: 'MVP',      emoji: '🏆' },
];

const DEFAULT_HOTKEYS = { taptap: 'Q', nwm: 'W', x2: 'E', x3: 'R', mvp: 'T' };

// ── clsx minimal ────────────────────────────────────────────────────────────
function cx(...args) { return args.filter(Boolean).join(' '); }

// ── Pick a random checked video from category list ───────────────────────────
function pickVideo(list) {
  const enabled = list.filter(v => v.checked);
  if (enabled.length === 0) return null;
  return enabled[Math.floor(Math.random() * enabled.length)];
}

export default function PKPage({ theme, user }) {
  const isDark = theme === 'dark';

  const [activeTab,   setActiveTab]   = useState('taptap');
  const [hotkeys,     setHotkeys]     = useState(DEFAULT_HOTKEYS);
  const [categories,  setCategories]  = useState({
    taptap: [], nwm: [], x2: [], x3: [], mvp: [],
  });
  const [cid,         setCid]         = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [urlInput,    setUrlInput]    = useState('');
  const [urlName,     setUrlName]     = useState('');
  const [urlType,     setUrlType]     = useState('mp4');
  const [settingKey,  setSettingKey]  = useState(null); // catId ที่กำลังตั้ง hotkey

  const fileRef     = useRef(null);
  const saveTimer   = useRef(null);
  const socketRef   = useRef(null);

  // ─── Load config from backend ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get('/api/pk/config');
        if (data.config) {
          setHotkeys(data.config.hotkeys || DEFAULT_HOTKEYS);
          setCategories(data.config.categories || {
            taptap: [], nwm: [], x2: [], x3: [], mvp: [],
          });
        }
      } catch { /* config not set yet */ }

      // Get widget CID
      try {
        const { data } = await api.post('/api/widget-token');
        setCid(data.cid);
      } catch {}
    })();
  }, [user]);

  // ─── Socket setup (authenticated) ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    setTokenRefresher(() => user.getIdToken());
    if (!s.connected) {
      user.getIdToken().then(token => {
        const { connectSocket } = require('../lib/socket');
        connectSocket(token);
      });
    }
    socketRef.current = s;
    return () => { socketRef.current = null; };
  }, [user]);

  // ─── Auto-save config (debounce 800ms) ──────────────────────────────────
  const autoSave = useCallback((newHotkeys, newCategories) => {
    if (!user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await api.post('/api/pk/config', { hotkeys: newHotkeys, categories: newCategories });
      } catch {
        toast.error('บันทึกไม่สำเร็จ');
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [user]);

  function updateCategories(newCats) {
    setCategories(newCats);
    autoSave(hotkeys, newCats);
  }

  function updateHotkeys(newHk) {
    setHotkeys(newHk);
    autoSave(newHk, categories);
  }

  // ─── Keyboard shortcut listener ─────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      // ไม่เปิด hotkey ขณะพิมพ์ใน input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      // ขณะกำลังตั้งค่า hotkey — จับ key แล้ว set
      if (settingKey !== null) {
        e.preventDefault();
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        setSettingKey(null);
        const newHk = { ...hotkeys, [settingKey]: key };
        updateHotkeys(newHk);
        return;
      }
      // เช็ค hotkey ของแต่ละ category
      for (const cat of CATEGORIES) {
        const hk = hotkeys[cat.id]?.toUpperCase();
        if (hk && e.key.toUpperCase() === hk) {
          e.preventDefault();
          triggerCategory(cat.id);
          return;
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeys, categories, settingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Trigger: pick random checked video + emit socket ───────────────────
  function triggerCategory(catId) {
    const list  = categories[catId] || [];
    const video = pickVideo(list);
    if (!video) {
      toast(`ไม่มีวิดีโอที่เลือกใน ${CATEGORIES.find(c => c.id === catId)?.label}`, { icon: '⚠️' });
      return;
    }
    const socket = socketRef.current || getSocket();
    if (!socket?.connected) {
      toast.error('Socket ไม่ได้เชื่อมต่อ — รีเฟรชหน้าเว็บ');
      return;
    }
    const videoUrl = video.url.startsWith('/')
      ? `${BACKEND}${video.url}`
      : video.url;
    socket.emit('pk_trigger', { videoUrl, videoType: video.type, category: catId });
    toast.success(`▶ ${CATEGORIES.find(c => c.id === catId)?.label} — ${video.name}`, { duration: 2000 });
  }

  // ─── Add video by URL ────────────────────────────────────────────────────
  function addVideoUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const name = urlName.trim() || url.split('/').pop().slice(0, 60) || 'video';
    const newVideo = { id: uuidv4(), name, url, type: urlType, checked: true };
    const newCats  = {
      ...categories,
      [activeTab]: [...(categories[activeTab] || []), newVideo],
    };
    updateCategories(newCats);
    setUrlInput('');
    setUrlName('');
  }

  // ─── Upload file ─────────────────────────────────────────────────────────
  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['webm', 'mp4'].includes(ext)) {
      toast.error('รองรับเฉพาะ .webm และ .mp4 เท่านั้น');
      return;
    }

    setUploading(true);
    try {
      const idToken = await user.getIdToken();
      const csrf    = await api.get('/api/csrf-token').then(r => r.data.token).catch(() => null);

      const form = new FormData();
      form.append('video', file);

      const res = await fetch(`${BACKEND}/api/pk/upload`, {
        method:  'POST',
        headers: {
          Authorization:    `Bearer ${idToken}`,
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newVideo = { id: uuidv4(), name: data.name, url: data.url, type: data.type, checked: true };
      const newCats  = {
        ...categories,
        [activeTab]: [...(categories[activeTab] || []), newVideo],
      };
      updateCategories(newCats);
      toast.success(`✅ อัพโหลด ${data.name} สำเร็จ`);
    } catch (err) {
      toast.error(`อัพโหลดไม่สำเร็จ: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ─── Toggle checked ────────────────────────────────────────────────────
  function toggleChecked(catId, videoId) {
    const newCats = {
      ...categories,
      [catId]: categories[catId].map(v =>
        v.id === videoId ? { ...v, checked: !v.checked } : v
      ),
    };
    updateCategories(newCats);
  }

  // ─── Delete video ───────────────────────────────────────────────────────
  async function deleteVideo(catId, video) {
    // ถ้า URL เป็น server upload → ลบไฟล์ด้วย
    if (video.url.startsWith('/uploads/pk/')) {
      const filename = video.url.split('/').pop();
      try { await api.delete(`/api/pk/video/${filename}`); } catch {}
    }
    const newCats = {
      ...categories,
      [catId]: categories[catId].filter(v => v.id !== video.id),
    };
    updateCategories(newCats);
  }

  // ─── Widget URL ──────────────────────────────────────────────────────────
  const widgetUrl = cid
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/pk?cid=${cid}`
    : null;

  function copyUrl() {
    if (!widgetUrl) return;
    navigator.clipboard.writeText(widgetUrl).then(() => toast.success('คัดลอก URL แล้ว!'));
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const bg      = isDark ? '#0f0f13' : '#f3f4f6';
  const card    = isDark ? '#1a1a24' : '#ffffff';
  const border  = isDark ? '#2d2d3d' : '#e5e7eb';
  const txt     = isDark ? '#f1f1f1' : '#111827';
  const muted   = isDark ? '#9ca3af' : '#6b7280';
  const accent  = '#f97316'; // orange — PK theme

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: muted, fontSize: 15 }}>กรุณา Login เพื่อใช้งาน PK Panel</p>
      </div>
    );
  }

  const curList = categories[activeTab] || [];

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '20px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: txt, fontSize: 22, fontWeight: 800, margin: 0 }}>
              ⚔️ PK Panel
            </h1>
            <p style={{ color: muted, fontSize: 13, margin: '3px 0 0' }}>
              เล่นวิดีโอทับ OBS ระหว่าง PK — กดคีย์ลัดหรือคลิกปุ่มเพื่อเปิดใช้งาน
            </p>
          </div>
          <span style={{ fontSize: 12, color: saving ? accent : muted }}>
            {saving ? '💾 กำลังบันทึก...' : '✓ บันทึกแล้ว'}
          </span>
        </div>

        {/* ── Widget URL ── */}
        <div style={{
          background: card, border: `1px solid ${border}`, borderRadius: 14,
          padding: '14px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: muted, flexShrink: 0 }}>🎬 Widget URL (วาง OBS/TikTok Studio):</span>
          <span style={{
            flex: 1, minWidth: 200, background: isDark ? '#111' : '#f9f9f9',
            border: `1px solid ${border}`, borderRadius: 8,
            padding: '5px 10px', fontSize: 12, color: txt,
            fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {widgetUrl || 'กำลังโหลด...'}
          </span>
          <button
            onClick={copyUrl}
            disabled={!widgetUrl}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: accent, color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
            📋 Copy
          </button>
          <span style={{ fontSize: 11, color: muted }}>ขนาด 720×1280 · 9:16 portrait</span>
        </div>

        {/* ── Category Sub-Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                padding: '9px 18px', borderRadius: 10, border: `1.5px solid`,
                borderColor: activeTab === cat.id ? accent : border,
                background:  activeTab === cat.id ? accent : card,
                color:       activeTab === cat.id ? '#fff' : txt,
                fontWeight:  700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span style={{
                background: activeTab === cat.id ? 'rgba(0,0,0,0.2)' : (isDark ? '#333' : '#eee'),
                borderRadius: 10, fontSize: 10, padding: '1px 6px',
                color: activeTab === cat.id ? '#fff' : muted,
              }}>
                {(categories[cat.id] || []).filter(v => v.checked).length} / {(categories[cat.id] || []).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Active Category Panel ── */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>

          {/* Panel Header: hotkey + trigger button */}
          <div style={{
            padding: '16px 20px', borderBottom: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 20 }}>{CATEGORIES.find(c => c.id === activeTab)?.emoji}</span>
            <span style={{ color: txt, fontWeight: 700, fontSize: 16 }}>
              {CATEGORIES.find(c => c.id === activeTab)?.label}
            </span>

            {/* Hotkey setter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <span style={{ color: muted, fontSize: 12 }}>คีย์ลัด:</span>
              <button
                onClick={() => setSettingKey(activeTab)}
                style={{
                  minWidth: 48, padding: '5px 12px', borderRadius: 8,
                  border: `2px solid ${settingKey === activeTab ? accent : border}`,
                  background: settingKey === activeTab ? `${accent}22` : (isDark ? '#222' : '#f5f5f5'),
                  color:  settingKey === activeTab ? accent : txt,
                  fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  fontFamily: 'monospace',
                }}>
                {settingKey === activeTab ? '...' : (hotkeys[activeTab] || '—')}
              </button>
              {settingKey === activeTab && (
                <span style={{ fontSize: 12, color: accent }}>กดคีย์ที่ต้องการ</span>
              )}
              {settingKey !== activeTab && (
                <button
                  onClick={() => setSettingKey(activeTab)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${border}`, background: 'transparent',
                    color: muted, fontSize: 11, cursor: 'pointer',
                  }}>
                  เปลี่ยน
                </button>
              )}
            </div>

            {/* Trigger button */}
            <button
              onClick={() => triggerCategory(activeTab)}
              style={{
                marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none',
                background: accent, color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              ▶ เล่นเลย
            </button>
          </div>

          {/* Video List */}
          <div style={{ padding: '12px 0' }}>
            {curList.length === 0 && (
              <p style={{ textAlign: 'center', color: muted, fontSize: 13, padding: '24px 0' }}>
                ยังไม่มีวิดีโอ — เพิ่มด้านล่าง
              </p>
            )}
            {curList.map(video => (
              <div
                key={video.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px',
                  background: video.checked ? (isDark ? '#1f1f2e' : '#fef9f0') : 'transparent',
                  borderLeft: `3px solid ${video.checked ? accent : 'transparent'}`,
                }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={video.checked}
                  onChange={() => toggleChecked(activeTab, video.id)}
                  style={{ width: 16, height: 16, accentColor: accent, cursor: 'pointer', flexShrink: 0 }}
                />
                {/* Type badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, flexShrink: 0,
                  background: video.type === 'webm' ? '#22c55e22' : '#3b82f622',
                  color:      video.type === 'webm' ? '#22c55e'   : '#3b82f6',
                  border:     `1px solid ${video.type === 'webm' ? '#22c55e44' : '#3b82f644'}`,
                }}>
                  {video.type.toUpperCase()}
                </span>
                {/* Name */}
                <span style={{ flex: 1, color: txt, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.name}
                </span>
                {/* URL preview */}
                <span style={{ color: muted, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.url.startsWith('/') ? '📁 server' : video.url.slice(0, 30) + '...'}
                </span>
                {/* Test play */}
                <button
                  onClick={() => {
                    const socket = socketRef.current || getSocket();
                    const vUrl = video.url.startsWith('/') ? `${BACKEND}${video.url}` : video.url;
                    socket?.emit('pk_trigger', { videoUrl: vUrl, videoType: video.type, category: activeTab });
                    toast(`▶ ทดสอบ: ${video.name}`, { duration: 1500 });
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`,
                    background: 'transparent', color: muted, fontSize: 11, cursor: 'pointer', flexShrink: 0,
                  }}>
                  ▶ Test
                </button>
                {/* Delete */}
                <button
                  onClick={() => deleteVideo(activeTab, video)}
                  style={{
                    padding: '4px 8px', borderRadius: 6, border: `1px solid #ef444433`,
                    background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', flexShrink: 0,
                  }}>
                  🗑
                </button>
              </div>
            ))}
          </div>

          {/* ── Add video section ── */}
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${border}` }}>
            <p style={{ color: muted, fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
              ➕ เพิ่มวิดีโอ
            </p>

            {/* By URL */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input
                type="text"
                placeholder="ชื่อแสดง (ไม่บังคับ)"
                value={urlName}
                onChange={e => setUrlName(e.target.value)}
                style={{
                  width: 160, padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${border}`, background: isDark ? '#111' : '#fff',
                  color: txt, fontSize: 13, outline: 'none',
                }}
              />
              <input
                type="text"
                placeholder="https://... หรือ URL วิดีโอ"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addVideoUrl()}
                style={{
                  flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
                  border: `1px solid ${border}`, background: isDark ? '#111' : '#fff',
                  color: txt, fontSize: 13, outline: 'none',
                }}
              />
              <select
                value={urlType}
                onChange={e => setUrlType(e.target.value)}
                style={{
                  padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${border}`, background: isDark ? '#111' : '#fff',
                  color: txt, fontSize: 13, cursor: 'pointer',
                }}>
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
              </select>
              <button
                onClick={addVideoUrl}
                disabled={!urlInput.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: urlInput.trim() ? accent : (isDark ? '#333' : '#e5e7eb'),
                  color: urlInput.trim() ? '#fff' : muted,
                  fontSize: 13, fontWeight: 600, cursor: urlInput.trim() ? 'pointer' : 'default',
                }}>
                เพิ่ม URL
              </button>
            </div>

            {/* Upload file */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                ref={fileRef}
                type="file"
                accept=".webm,.mp4"
                onChange={uploadFile}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: `1.5px dashed ${isDark ? '#444' : '#ccc'}`,
                  background: 'transparent', color: muted,
                  fontSize: 13, cursor: uploading ? 'default' : 'pointer',
                }}>
                {uploading ? '⏳ กำลังอัพโหลด...' : '📤 อัพโหลดไฟล์ (.webm / .mp4)'}
              </button>
              <span style={{ fontSize: 11, color: muted }}>สูงสุด 200 MB ต่อไฟล์</span>
            </div>
          </div>
        </div>

        {/* ── Hotkey summary ── */}
        <div style={{ marginTop: 20, background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 20px' }}>
          <p style={{ color: muted, fontSize: 12, marginBottom: 10, fontWeight: 600 }}>⌨️ คีย์ลัดทั้งหมด (กดขณะอยู่ในหน้านี้)</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  background: isDark ? '#222' : '#f3f4f6',
                  border: `1.5px solid ${border}`, borderRadius: 7,
                  padding: '3px 10px', fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: txt,
                }}>
                  {hotkeys[cat.id] || '—'}
                </span>
                <span style={{ color: muted, fontSize: 12 }}>{cat.emoji} {cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Info footer ── */}
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: isDark ? '#1a1a1a' : '#f9f9f9', border: `1px solid ${border}` }}>
          <p style={{ color: muted, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
            💡 WebM — โปร่งใสจริง (ต้องเป็นไฟล์ที่ encode มา alpha channel) &nbsp;|&nbsp;
            MP4 — ต้องตั้ง Chroma Key ใน OBS &nbsp;|&nbsp;
            ติ๊กหลายวิดีโอ = สุ่มเล่น &nbsp;|&nbsp;
            ติ๊กอันเดียว = เล่นอันนั้นเสมอ
          </p>
        </div>
      </div>
    </div>
  );
}
