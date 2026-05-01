// pages/pk.js — PK Panel Control Page
import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { getSocket, setTokenRefresher } from '../lib/socket';
import api from '../lib/api';
import Sidebar from '../components/Sidebar';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const CATEGORIES = [
  { id: 'taptap', label: 'Tap Tap',  emoji: '👊' },
  { id: 'nwm',    label: 'นวม',      emoji: '🥊' },
  { id: 'x2',     label: 'คูณ 2',    emoji: '✖️2' },
  { id: 'x3',     label: 'คูณ 3',    emoji: '✖️3' },
  { id: 'mvp',    label: 'MVP',      emoji: '🏆' },
];

const DEFAULT_HOTKEYS = { taptap: 'Numpad1', nwm: 'Numpad2', x2: 'Numpad3', x3: 'Numpad4', mvp: 'Numpad5' };

// แสดงชื่อ hotkey ให้อ่านง่าย
function displayKey(hk) {
  if (!hk) return '—';
  if (hk.startsWith('Numpad')) return `⌨${hk.replace('Numpad', '')}`;
  return hk;
}

// ── clsx minimal ────────────────────────────────────────────────────────────
function cx(...args) { return args.filter(Boolean).join(' '); }

// ── Pick a random checked video from list ───────────────────────────────────
function pickVideo(list) {
  const enabled = list.filter(v => v.checked);
  if (enabled.length === 0) return null;
  return enabled[Math.floor(Math.random() * enabled.length)];
}

export default function PKPage({ theme, user, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const isDark = theme === 'dark';

  const [enabled,         setEnabled]         = useState(true);
  const [hotkeysEnabled,  setHotkeysEnabled]  = useState(true);
  const [activeTab,       setActiveTab]       = useState('taptap');
  const [hotkeys,         setHotkeys]         = useState(DEFAULT_HOTKEYS);
  const [categories,    setCategories]    = useState({
    taptap: [], nwm: [], x2: [], x3: [], mvp: [],
  });
  // presets: { catId: [{ filename, name, url, type }] }
  const [presets,       setPresets]       = useState({ taptap: [], nwm: [], x2: [], x3: [], mvp: [] });
  // presetChecked: { catId: { filename: boolean } }
  const [presetChecked, setPresetChecked] = useState({});

  const [cid,           setCid]           = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [urlInput,      setUrlInput]      = useState('');
  const [urlName,       setUrlName]       = useState('');
  const [urlType,       setUrlType]       = useState('mp4');
  const [settingKey,    setSettingKey]    = useState(null);

  const fileRef     = useRef(null);
  const saveTimer   = useRef(null);
  const socketRef   = useRef(null);
  const importRef   = useRef(null);

  // ─── Load config + presets from backend ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get('/api/pk/config');
        if (data.config) {
          setHotkeys(data.config.hotkeys || DEFAULT_HOTKEYS);
          setCategories(data.config.categories || { taptap: [], nwm: [], x2: [], x3: [], mvp: [] });
          if (typeof data.config.enabled         === 'boolean') setEnabled(data.config.enabled);
          if (typeof data.config.hotkeysEnabled  === 'boolean') setHotkeysEnabled(data.config.hotkeysEnabled);
          if (data.config.presetChecked) setPresetChecked(data.config.presetChecked);
        }
      } catch { /* config not set yet */ }

      // โหลด presets จาก server
      try {
        const { data } = await api.get('/api/pk/presets');
        if (data.presets) setPresets(data.presets);
      } catch { /* presets unavailable */ }

      // Get widget CID
      try {
        const cacheKey = `ttplus_cid_${user.uid}`;
        const cached   = localStorage.getItem(cacheKey);
        if (cached && /^\d{4,8}$/.test(cached)) {
          setCid(cached);
        } else {
          const { data } = await api.post('/api/widget-token');
          if (data.cid) {
            setCid(data.cid);
            try { localStorage.setItem(cacheKey, data.cid); } catch {}
          }
        }
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
  const autoSave = useCallback((newHotkeys, newCategories, newEnabled, newPresetChecked, newHotkeysEnabled) => {
    if (!user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await api.post('/api/pk/config', {
          hotkeys:        newHotkeys,
          categories:     newCategories,
          enabled:        newEnabled,
          presetChecked:  newPresetChecked,
          hotkeysEnabled: newHotkeysEnabled,
        });
      } catch {
        toast.error('บันทึกไม่สำเร็จ');
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [user]);

  function updateCategories(newCats) {
    setCategories(newCats);
    autoSave(hotkeys, newCats, enabled, presetChecked, hotkeysEnabled);
  }

  function updateHotkeys(newHk) {
    setHotkeys(newHk);
    autoSave(newHk, categories, enabled, presetChecked, hotkeysEnabled);
  }

  function updatePresetChecked(newPc) {
    setPresetChecked(newPc);
    autoSave(hotkeys, categories, enabled, newPc, hotkeysEnabled);
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    autoSave(hotkeys, categories, next, presetChecked, hotkeysEnabled);
    toast(next ? '✅ PK Panel เปิดใช้งานแล้ว' : '⏸ PK Panel ปิดอยู่', { duration: 1800 });
  }

  function toggleHotkeysEnabled() {
    const next = !hotkeysEnabled;
    setHotkeysEnabled(next);
    autoSave(hotkeys, categories, enabled, presetChecked, next);
    toast(next ? '⌨️ คีย์ลัดเปิดใช้งานแล้ว' : '⌨️ คีย์ลัดปิดอยู่', { duration: 1800 });
  }

  // ─── Keyboard shortcut listener ─────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (settingKey !== null) {
        e.preventDefault();
        const key = e.code.startsWith('Numpad') ? e.code : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
        setSettingKey(null);
        const newHk = { ...hotkeys, [settingKey]: key };
        updateHotkeys(newHk);
        return;
      }
      if (!enabled || !hotkeysEnabled) return;
      for (const cat of CATEGORIES) {
        const hk = hotkeys[cat.id];
        if (!hk) continue;
        const match = hk.startsWith('Numpad') ? e.code === hk : e.key.toUpperCase() === hk.toUpperCase();
        if (match) {
          e.preventDefault();
          triggerCategory(cat.id);
          return;
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeys, categories, presets, presetChecked, settingKey, enabled, hotkeysEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build combined pool (user videos + checked presets) ────────────────
  function buildPool(catId) {
    const userVideos   = (categories[catId] || []).filter(v => v.checked);
    const catPresets   = (presets[catId]    || []);
    const checkedMap   = presetChecked[catId] || {};
    const presetVideos = catPresets
      .filter(p => checkedMap[p.filename])
      .map(p => ({ ...p, id: `preset__${p.filename}`, checked: true }));
    return [...userVideos, ...presetVideos];
  }

  // ─── Trigger: pick random from combined pool ─────────────────────────────
  function triggerCategory(catId) {
    const pool  = buildPool(catId);
    const video = pickVideo(pool);
    if (!video) {
      toast(`ไม่มีวิดีโอที่เลือกใน ${CATEGORIES.find(c => c.id === catId)?.label}`, { icon: '⚠️' });
      return;
    }
    const socket = socketRef.current || getSocket();
    if (!socket?.connected) {
      toast.error('Socket ไม่ได้เชื่อมต่อ — รีเฟรชหน้าเว็บ');
      return;
    }
    const videoUrl = video.url.startsWith('/') ? `${BACKEND}${video.url}` : video.url;
    socket.emit('pk_trigger', { videoUrl, videoType: video.type, category: catId });
    toast.success(`▶ ${CATEGORIES.find(c => c.id === catId)?.label} — ${video.name}`, { duration: 2000 });
  }

  // ─── Add video by URL ────────────────────────────────────────────────────
  function addVideoUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const name = urlName.trim() || url.split('/').pop().slice(0, 60) || 'video';
    const newVideo = { id: uuidv4(), name, url, type: urlType, checked: true };
    const newCats  = { ...categories, [activeTab]: [...(categories[activeTab] || []), newVideo] };
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
      const form    = new FormData();
      form.append('video', file);
      const res  = await fetch(`${BACKEND}/api/pk/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${idToken}`, ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const newVideo = { id: uuidv4(), name: data.name, url: data.url, type: data.type, checked: true };
      const newCats  = { ...categories, [activeTab]: [...(categories[activeTab] || []), newVideo] };
      updateCategories(newCats);
      toast.success(`✅ อัพโหลด ${data.name} สำเร็จ`);
    } catch (err) {
      toast.error(`อัพโหลดไม่สำเร็จ: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ─── Toggle preset checked ─────────────────────────────────────────────
  function togglePreset(catId, filename) {
    const catMap  = presetChecked[catId] || {};
    const current = catMap[filename] ?? false;
    const newPc   = { ...presetChecked, [catId]: { ...catMap, [filename]: !current } };
    updatePresetChecked(newPc);
  }

  // ─── Toggle user video checked ─────────────────────────────────────────
  function toggleChecked(catId, videoId) {
    const newCats = {
      ...categories,
      [catId]: categories[catId].map(v => v.id === videoId ? { ...v, checked: !v.checked } : v),
    };
    updateCategories(newCats);
  }

  // ─── Delete user video ─────────────────────────────────────────────────
  async function deleteVideo(catId, video) {
    if (video.url.startsWith('/uploads/pk/') && !video.url.includes('/_shared/')) {
      const filename = video.url.split('/').pop();
      try { await api.delete(`/api/pk/video/${filename}`); } catch {}
    }
    const newCats = { ...categories, [catId]: categories[catId].filter(v => v.id !== video.id) };
    updateCategories(newCats);
  }

  // ─── Export / Import ─────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const data = { version: 2, exportedAt: new Date().toISOString(), tab: 'pk', hotkeys, categories, presetChecked };
    const json     = JSON.stringify(data, null, 2);
    const filename = `ttplus-pk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const uri      = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    const a        = document.createElement('a');
    a.href = uri; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    toast.success('⬇ Export PK เรียบร้อย');
  }, [hotkeys, categories, presetChecked]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const toastId = toast.loading('กำลัง Import...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.hotkeys && !data.categories) throw new Error('ไฟล์ไม่ถูกต้อง (ไม่พบ hotkeys/categories)');
      const newHotkeys      = data.hotkeys      || hotkeys;
      const newCategories   = data.categories   || categories;
      const newPresetChecked = data.presetChecked || presetChecked;
      setHotkeys(newHotkeys);
      setCategories(newCategories);
      setPresetChecked(newPresetChecked);
      await api.post('/api/pk/config', { hotkeys: newHotkeys, categories: newCategories, enabled, presetChecked: newPresetChecked });
      toast.success('⬆ Import PK เรียบร้อย', { id: toastId });
    } catch (err) { toast.error('Import ไม่สำเร็จ: ' + err.message, { id: toastId }); }
  }, [hotkeys, categories, presetChecked, enabled]);

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
  const accent  = '#f97316';

  const curList        = categories[activeTab] || [];
  const curPresets     = presets[activeTab]    || [];
  const curPresetCheck = presetChecked[activeTab] || {};

  // นับ checked รวม (user + preset) สำหรับ badge บน tab
  function countChecked(catId) {
    const userChecked   = (categories[catId] || []).filter(v => v.checked).length;
    const pcMap         = presetChecked[catId] || {};
    const presetCheckedN = (presets[catId] || []).filter(p => pcMap[p.filename]).length;
    return userChecked + presetCheckedN;
  }
  function countTotal(catId) {
    return (categories[catId] || []).length + (presets[catId] || []).length;
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className={sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-56'} style={{ padding: '20px 16px' }}>
      {!user && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ color: muted, fontSize: 15 }}>กรุณา Login เพื่อใช้งาน PK Panel</p>
        </div>
      )}
      {user && (<>

      {/* ── Header ── */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <h1 style={{ color: txt, fontSize: 22, fontWeight: 800, margin: 0 }}>
                ⚔️ PK Panel
              </h1>
              <p style={{ color: muted, fontSize: 13, margin: '3px 0 0' }}>
                เล่นวิดีโอทับ OBS ระหว่าง PK — กดคีย์ลัดหรือคลิกปุ่มเพื่อเปิดใช้งาน
              </p>
            </div>

            {/* ── Enable / Disable toggle ── */}
            <button
              onClick={toggleEnabled}
              title={enabled ? 'คลิกเพื่อปิด PK Panel' : 'คลิกเพื่อเปิด PK Panel'}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: enabled ? '#16a34a' : (isDark ? '#374151' : '#d1d5db'),
                boxShadow: enabled ? '0 0 16px #16a34a66' : 'none',
                transition: 'all 0.2s', flexShrink: 0,
              }}>
              <div style={{ width: 42, height: 24, borderRadius: 12, background: enabled ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', left: enabled ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: enabled ? '#fff' : (isDark ? '#9ca3af' : '#6b7280') }}>
                {enabled ? '🟢 เปิดใช้งาน' : '⏸ ปิดอยู่'}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => importRef.current?.click()} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#1e1e2e' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⬆ Import</button>
            <button onClick={handleExport} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#1e1e2e' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⬇ Export</button>
            <span style={{ fontSize: 12, color: saving ? accent : muted }}>{saving ? '💾 กำลังบันทึก...' : '✓ บันทึกแล้ว'}</span>
          </div>
        </div>

        {/* ── Widget URL ── */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: muted, flexShrink: 0 }}>🎬 Widget URL (วาง OBS/TikTok Studio):</span>
          <span style={{ flex: 1, minWidth: 200, background: isDark ? '#111' : '#f9f9f9', border: `1px solid ${border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: txt, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {widgetUrl || 'กำลังโหลด...'}
          </span>
          <button onClick={copyUrl} disabled={!widgetUrl} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: accent, color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>📋 Copy</button>
          <span style={{ fontSize: 11, color: muted }}>ขนาด 720×1280 · 9:16 portrait</span>
        </div>

        {/* ── Category Sub-Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{ padding: '9px 18px', borderRadius: 10, border: `1.5px solid`, borderColor: activeTab === cat.id ? accent : border, background: activeTab === cat.id ? accent : card, color: activeTab === cat.id ? '#fff' : txt, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span style={{ background: activeTab === cat.id ? 'rgba(0,0,0,0.2)' : (isDark ? '#333' : '#eee'), borderRadius: 10, fontSize: 10, padding: '1px 6px', color: activeTab === cat.id ? '#fff' : muted }}>
                {countChecked(cat.id)} / {countTotal(cat.id)}
              </span>
            </button>
          ))}
        </div>

        {/* ── Active Category Panel ── */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>

          {/* Panel Header: hotkey + trigger button */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>{CATEGORIES.find(c => c.id === activeTab)?.emoji}</span>
            <span style={{ color: txt, fontWeight: 700, fontSize: 16 }}>{CATEGORIES.find(c => c.id === activeTab)?.label}</span>

            {/* Hotkey setter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <span style={{ color: muted, fontSize: 12 }}>คีย์ลัด:</span>
              <button onClick={() => setSettingKey(activeTab)} style={{ minWidth: 52, padding: '5px 12px', borderRadius: 8, border: `2px solid ${settingKey === activeTab ? accent : border}`, background: settingKey === activeTab ? `${accent}22` : (isDark ? '#222' : '#f5f5f5'), color: settingKey === activeTab ? accent : txt, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'monospace' }}>
                {settingKey === activeTab ? '...' : displayKey(hotkeys[activeTab])}
              </button>
              {settingKey === activeTab && <span style={{ fontSize: 12, color: accent }}>กดคีย์ที่ต้องการ</span>}
              {settingKey !== activeTab && (
                <button onClick={() => setSettingKey(activeTab)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 11, cursor: 'pointer' }}>เปลี่ยน</button>
              )}
            </div>

            {/* Trigger button */}
            <button
              onClick={() => enabled && triggerCategory(activeTab)}
              title={!enabled ? 'เปิด PK Panel ก่อน' : undefined}
              style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 10, border: 'none', background: enabled ? accent : (isDark ? '#374151' : '#d1d5db'), color: enabled ? '#fff' : muted, fontWeight: 700, fontSize: 14, cursor: enabled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: enabled ? 1 : 0.6, transition: 'all 0.2s' }}>
              ▶ เล่นเลย
            </button>
          </div>

          {/* ── Section: จาก Server ── */}
          {curPresets.length > 0 && (
            <div>
              {/* Section header */}
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: '0.05em', textTransform: 'uppercase' }}>📦 จาก Server</span>
                <span style={{ fontSize: 10, color: muted }}>({curPresets.filter(p => curPresetCheck[p.filename]).length}/{curPresets.length} เลือกอยู่)</span>
              </div>
              {curPresets.map(preset => {
                const isChecked = !!curPresetCheck[preset.filename];
                return (
                  <div
                    key={preset.filename}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 20px',
                      background: isChecked ? (isDark ? '#1f1a10' : '#fff8f0') : 'transparent',
                      borderLeft: `3px solid ${isChecked ? '#f97316' : 'transparent'}`,
                    }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePreset(activeTab, preset.filename)}
                      style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, flexShrink: 0, background: preset.type === 'webm' ? '#22c55e22' : '#3b82f622', color: preset.type === 'webm' ? '#22c55e' : '#3b82f6', border: `1px solid ${preset.type === 'webm' ? '#22c55e44' : '#3b82f644'}` }}>
                      {preset.type.toUpperCase()}
                    </span>
                    <span style={{ flex: 1, color: txt, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preset.name}
                    </span>
                    <span style={{ color: muted, fontSize: 10, flexShrink: 0 }}>📦 server</span>
                    {/* Test play */}
                    <button
                      onClick={() => {
                        const socket = socketRef.current || getSocket();
                        const vUrl   = `${BACKEND}${preset.url}`;
                        socket?.emit('pk_trigger', { videoUrl: vUrl, videoType: preset.type, category: activeTab });
                        toast(`▶ ทดสอบ: ${preset.name}`, { duration: 1500 });
                      }}
                      style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                      ▶ Test
                    </button>
                  </div>
                );
              })}
              {/* Divider */}
              {curList.length > 0 && (
                <div style={{ margin: '4px 20px', borderTop: `1px solid ${border}` }} />
              )}
            </div>
          )}

          {/* ── Section: ของฉัน (user videos) ── */}
          <div style={{ padding: curList.length > 0 ? '4px 0' : '0' }}>
            {curPresets.length > 0 && curList.length > 0 && (
              <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>👤 ของฉัน</span>
              </div>
            )}
            {curList.length === 0 && curPresets.length === 0 && (
              <p style={{ textAlign: 'center', color: muted, fontSize: 13, padding: '24px 0' }}>
                ยังไม่มีวิดีโอ
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
                <input type="checkbox" checked={video.checked} onChange={() => toggleChecked(activeTab, video.id)} style={{ width: 16, height: 16, accentColor: accent, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, flexShrink: 0, background: video.type === 'webm' ? '#22c55e22' : '#3b82f622', color: video.type === 'webm' ? '#22c55e' : '#3b82f6', border: `1px solid ${video.type === 'webm' ? '#22c55e44' : '#3b82f644'}` }}>
                  {video.type.toUpperCase()}
                </span>
                <span style={{ flex: 1, color: txt, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.name}</span>
                <span style={{ color: muted, fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.url.startsWith('/') ? '📁 server' : video.url.slice(0, 30) + '...'}
                </span>
                <button
                  onClick={() => {
                    const socket = socketRef.current || getSocket();
                    const vUrl   = video.url.startsWith('/') ? `${BACKEND}${video.url}` : video.url;
                    socket?.emit('pk_trigger', { videoUrl: vUrl, videoType: video.type, category: activeTab });
                    toast(`▶ ทดสอบ: ${video.name}`, { duration: 1500 });
                  }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  ▶ Test
                </button>
                <button
                  onClick={() => deleteVideo(activeTab, video)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid #ef444433`, background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hotkey summary ── */}
        <div style={{ marginTop: 20, background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: muted, fontSize: 12, fontWeight: 600, margin: 0 }}>
              ⌨️ คีย์ลัดทั้งหมด (กดขณะอยู่ในหน้านี้)
              {(!enabled || !hotkeysEnabled) && (
                <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                  — {!enabled ? 'panel ปิดอยู่' : 'คีย์ลัดปิดอยู่'}
                </span>
              )}
            </p>
            {/* Toggle คีย์ลัด */}
            <button
              onClick={toggleHotkeysEnabled}
              title={hotkeysEnabled ? 'คลิกเพื่อปิดคีย์ลัด' : 'คลิกเพื่อเปิดคีย์ลัด'}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            6,
                padding:        '4px 12px',
                borderRadius:   20,
                border:         `1.5px solid ${hotkeysEnabled ? '#22c55e' : '#f59e0b'}`,
                background:     hotkeysEnabled
                  ? (isDark ? '#14532d55' : '#dcfce7')
                  : (isDark ? '#78350f55' : '#fef3c7'),
                color:          hotkeysEnabled ? '#22c55e' : '#f59e0b',
                fontSize:       11,
                fontWeight:     700,
                cursor:         'pointer',
                flexShrink:     0,
                transition:     'all 0.2s',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{hotkeysEnabled ? '⌨️' : '🚫'}</span>
              {hotkeysEnabled ? 'เปิด' : 'ปิด'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', opacity: (enabled && hotkeysEnabled) ? 1 : 0.4 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: isDark ? '#222' : '#f3f4f6', border: `1.5px solid ${border}`, borderRadius: 7, padding: '3px 10px', fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: txt }}>
                  {displayKey(hotkeys[cat.id])}
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
            ติ๊กอันเดียว = เล่นอันนั้นเสมอ &nbsp;|&nbsp;
            📦 Server = วิดีโอจากทีมงาน ใช้ได้เลย
          </p>
        </div>
      </div>{/* /maxWidth */}
      </>)}

      {/* Hidden inputs */}
      <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImport} />
      <input ref={fileRef}   type="file" accept=".webm,.mp4"            style={{ display: 'none' }} onChange={uploadFile} />
      </main>
    </div>
  );
}
