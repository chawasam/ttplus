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

function displayKey(hk) {
  if (!hk) return '—';
  if (hk.startsWith('Numpad')) return `⌨${hk.replace('Numpad', '')}`;
  return hk;
}

function cx(...args) { return args.filter(Boolean).join(' '); }

function pickVideo(list) {
  const enabled = list.filter(v => v.checked);
  if (enabled.length === 0) return null;
  return enabled[Math.floor(Math.random() * enabled.length)];
}

// ── Tooltip "i" bubble ────────────────────────────────────────────────────────
function InfoTooltip({ children, isDark, alignRight }) {
  const [show, setShow] = useState(false);
  const bg  = isDark ? '#1e1e2e' : '#ffffff';
  const bdr = isDark ? '#3d3d50' : '#d1d5db';
  const pos = alignRight ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' };
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button style={{
        width: 18, height: 18, borderRadius: '50%', background: 'transparent',
        border: `1px solid ${bdr}`, fontSize: 10, cursor: 'default',
        color: isDark ? '#6b7280' : '#9ca3af',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0,
      }}>i</button>
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', ...pos,
          background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
          padding: '10px 14px', minWidth: 200, maxWidth: 300, zIndex: 1000,
          pointerEvents: 'none', fontSize: 13, lineHeight: 1.65, whiteSpace: 'normal',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Video thumbnail — seek slideshow ─────────────────────────────────────────
// W:H = 9:16 portrait  อัตราส่วน thumbnail
const THUMB_W = 45;
const THUMB_H = 80; // 45 * 16/9

function VideoThumb({ url, type, isDark }) {
  const videoRef  = useRef(null);
  const timerRef  = useRef(null);
  const stepRef   = useRef(0);
  const [ready,      setReady]      = useState(false);
  const [isLandscape, setIsLandscape] = useState(false); // true → fit ไม่ crop

  const STEPS  = [0, 0.25, 0.5, 0.75];
  const bg     = isDark ? '#000' : '#111';
  const bdr    = isDark ? '#2d2d3d' : '#d1d5db';
  const tColor = type === 'webm' ? '#22c55e' : '#3b82f6';

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    stepRef.current = 0;
    setReady(false);
    setIsLandscape(false);

    const seekStep = (idx) => {
      stepRef.current = idx;
      if (v.duration && isFinite(v.duration)) {
        v.currentTime = v.duration * STEPS[idx % STEPS.length];
      }
    };
    const onMeta = () => {
      // ตรวจสอบ orientation — ถ้า videoWidth > videoHeight = landscape
      if (v.videoWidth && v.videoHeight) {
        setIsLandscape(v.videoWidth > v.videoHeight);
      }
      setReady(true);
      seekStep(0);
    };
    const onSeeked = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => seekStep((stepRef.current + 1) % STEPS.length), 2000);
    };

    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('seeked', onSeeked);
    return () => {
      clearTimeout(timerRef.current);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('seeked', onSeeked);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedUrl = url?.startsWith('/') ? `${BACKEND}${url}` : url;

  return (
    <div style={{
      width: THUMB_W, height: THUMB_H,
      borderRadius: 7, overflow: 'hidden',
      background: bg, flexShrink: 0,
      border: `1px solid ${bdr}`,
      position: 'relative',
    }}>
      <video
        ref={videoRef}
        src={resolvedUrl}
        muted playsInline preload="metadata"
        style={{
          width: '100%', height: '100%',
          // portrait → crop เต็ม, landscape → fit ไม่ crop (เห็นทั้งเฟรม)
          objectFit: isLandscape ? 'contain' : 'cover',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, opacity: 0.3 }}>🎬</span>
        </div>
      )}
      {type && (
        <span style={{
          position: 'absolute', bottom: 3, right: 3, fontSize: 8,
          color: tColor, fontFamily: 'monospace', fontWeight: 700,
          background: `${tColor}22`, padding: '0 3px', borderRadius: 3,
        }}>
          {type.toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ── Checkbox square ───────────────────────────────────────────────────────────
function Cb({ checked, onChange, accent, border }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
        background: checked ? accent : 'transparent',
        border: `1.5px solid ${checked ? accent : border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {checked && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
  );
}

export default function PKPage({ theme, user, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const isDark = theme === 'dark';

  const [enabled,         setEnabled]         = useState(true);
  const [hotkeysEnabled,  setHotkeysEnabled]  = useState(true);
  const [masterVolume,    setMasterVolume]    = useState(80); // server-safe default — อ่าน localStorage ใน useEffect
  const [activeTab,       setActiveTab]       = useState('taptap');
  const [hotkeys,         setHotkeys]         = useState(DEFAULT_HOTKEYS);
  const [categories,      setCategories]      = useState({
    taptap: [], nwm: [], x2: [], x3: [], mvp: [],
  });
  const [presets,       setPresets]       = useState({ taptap: [], nwm: [], x2: [], x3: [], mvp: [] });
  const [presetChecked, setPresetChecked] = useState({});

  const [cid,        setCid]        = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [sharingVideoId,  setSharingVideoId]  = useState(null); // id ของวิดีโอที่กำลัง upload-shared
  const [deletePreset,    setDeletePreset]    = useState(null); // { cat, filename, countdown } — pending delete countdown (SERVER)
  const [deletingVideo,   setDeletingVideo]   = useState(null); // { cat, id, countdown } — pending delete countdown (personal)

  const OWNER_EMAIL = 'cksamg@gmail.com';
  const isOwner = user?.email === OWNER_EMAIL;
  const [urlInput,   setUrlInput]   = useState('');
  const [urlName,    setUrlName]    = useState('');
  const [urlType,    setUrlType]    = useState('mp4');
  const [settingKey, setSettingKey] = useState(null);

  const fileRef          = useRef(null);
  const saveTimer        = useRef(null);
  const socketRef        = useRef(null);
  const importRef        = useRef(null);
  const deleteCountTimer  = useRef(null); // interval สำหรับ countdown ลบ preset (SERVER)
  const deleteVideoTimer  = useRef(null); // interval สำหรับ countdown ลบ video (personal)

  // ─── Load config + presets ───────────────────────────────────────────────
  // อ่าน masterVolume จาก localStorage หลัง hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pk_master_volume');
      if (saved !== null) setMasterVolume(parseInt(saved, 10) || 80);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get('/api/pk/config');
        if (data.config) {
          setHotkeys(data.config.hotkeys || DEFAULT_HOTKEYS);
          setCategories(data.config.categories || { taptap: [], nwm: [], x2: [], x3: [], mvp: [] });
          if (typeof data.config.enabled        === 'boolean') setEnabled(data.config.enabled);
          if (typeof data.config.hotkeysEnabled === 'boolean') setHotkeysEnabled(data.config.hotkeysEnabled);
          if (data.config.presetChecked) setPresetChecked(data.config.presetChecked);
        }
      } catch { /* config not set yet */ }

      try {
        const { data } = await api.get('/api/pk/presets');
        if (data.presets) setPresets(data.presets);
      } catch { /* presets unavailable */ }

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

  // ─── Socket setup ────────────────────────────────────────────────────────
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

  // ─── Auto-save (debounce 800ms) ──────────────────────────────────────────
  const autoSave = useCallback((newHotkeys, newCategories, newEnabled, newPresetChecked, newHotkeysEnabled) => {
    if (!user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await api.post('/api/pk/config', {
          hotkeys: newHotkeys, categories: newCategories,
          enabled: newEnabled, presetChecked: newPresetChecked,
          hotkeysEnabled: newHotkeysEnabled,
        });
      } catch { toast.error('บันทึกไม่สำเร็จ'); }
      finally { setSaving(false); }
    }, 800);
  }, [user]);

  function updateCategories(newCats)     { setCategories(newCats);    autoSave(hotkeys, newCats, enabled, presetChecked, hotkeysEnabled); }
  function updateHotkeys(newHk)          { setHotkeys(newHk);         autoSave(newHk, categories, enabled, presetChecked, hotkeysEnabled); }
  function updatePresetChecked(newPc)    { setPresetChecked(newPc);   autoSave(hotkeys, categories, enabled, newPc, hotkeysEnabled); }

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

  // ─── Keyboard listener ───────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (settingKey !== null) {
        e.preventDefault();
        const key = e.code.startsWith('Numpad') ? e.code : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
        setSettingKey(null);
        updateHotkeys({ ...hotkeys, [settingKey]: key });
        return;
      }
      if (!enabled || !hotkeysEnabled) return;
      for (const cat of CATEGORIES) {
        const hk = hotkeys[cat.id];
        if (!hk) continue;
        const match = hk.startsWith('Numpad') ? e.code === hk : e.key.toUpperCase() === hk.toUpperCase();
        if (match) { e.preventDefault(); triggerCategory(cat.id); return; }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeys, categories, presets, presetChecked, settingKey, enabled, hotkeysEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build video pool ────────────────────────────────────────────────────
  function buildPool(catId) {
    const userVideos   = (categories[catId] || []).filter(v => v.checked);
    const catPresets   = (presets[catId]    || []);
    const checkedMap   = presetChecked[catId] || {};
    const presetVideos = catPresets
      .filter(p => checkedMap[p.filename])
      .map(p => ({ ...p, id: `preset__${p.filename}`, checked: true }));
    return [...userVideos, ...presetVideos];
  }

  function triggerCategory(catId) {
    const pool  = buildPool(catId);
    const video = pickVideo(pool);
    if (!video) { toast(`ไม่มีวิดีโอที่เลือกใน ${CATEGORIES.find(c => c.id === catId)?.label}`, { icon: '⚠️' }); return; }
    const socket = socketRef.current || getSocket();
    if (!socket?.connected) { toast.error('Socket ไม่ได้เชื่อมต่อ — รีเฟรชหน้าเว็บ'); return; }
    const videoUrl = video.url.startsWith('/') ? `${BACKEND}${video.url}` : video.url;
    socket.emit('pk_trigger', { videoUrl, videoType: video.type, category: catId, volume: masterVolume / 100 });
    toast.success(`▶ ${CATEGORIES.find(c => c.id === catId)?.label} — ${video.name}`, { duration: 2000 });
  }

  function handleVolumeChange(val) {
    const v = Math.max(0, Math.min(100, val));
    setMasterVolume(v);
    try { localStorage.setItem('pk_master_volume', String(v)); } catch {}
  }

  function volIcon(v) {
    if (v === 0) return '🔇';
    if (v < 35)  return '🔈';
    if (v < 70)  return '🔉';
    return '🔊';
  }

  function addVideoUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const name     = urlName.trim() || url.split('/').pop().slice(0, 60) || 'video';
    const newVideo = { id: uuidv4(), name, url, type: urlType, checked: true };
    updateCategories({ ...categories, [activeTab]: [...(categories[activeTab] || []), newVideo] });
    setUrlInput('');
    setUrlName('');
  }

  // ── Delete server preset — owner only ───────────────────────────────────────
  function startDeletePreset(catId, filename) {
    if (!isOwner) return;
    // ถ้ากดซ้ำตัวเดิม → ยกเลิก
    if (deletePreset?.cat === catId && deletePreset?.filename === filename) {
      clearInterval(deleteCountTimer.current);
      setDeletePreset(null);
      return;
    }
    clearInterval(deleteCountTimer.current);
    setDeletePreset({ cat: catId, filename, countdown: 5 });
    deleteCountTimer.current = setInterval(() => {
      setDeletePreset(prev => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          // countdown หมด → ลบจริง
          clearInterval(deleteCountTimer.current);
          doDeletePreset(prev.cat, prev.filename);
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  }

  async function doDeletePreset(catId, filename) {
    try {
      await api.delete(`/api/pk/shared/${catId}/${encodeURIComponent(filename)}`);
      // reload presets
      const { data } = await api.get('/api/pk/presets');
      if (data.presets) setPresets(data.presets);
      // ล้าง presetChecked ที่ตรงกัน
      setPresetChecked(prev => {
        const next = { ...prev };
        if (next[catId]) {
          next[catId] = { ...next[catId] };
          delete next[catId][filename];
        }
        return next;
      });
      toast.success(`🗑 ลบ "${filename.replace(/\.[^.]+$/, '')}" จาก Server แล้ว`);
    } catch (err) {
      toast.error(`ลบไม่สำเร็จ: ${err.response?.data?.error || err.message}`);
    }
  }

  // startDeleteVideo — countdown 5 วินาที ก่อนลบวิดีโอส่วนตัว
  function startDeleteVideo(catId, video) {
    // กดซ้ำ = ยกเลิก
    if (deletingVideo?.cat === catId && deletingVideo?.id === video.id) {
      clearInterval(deleteVideoTimer.current);
      setDeletingVideo(null);
      return;
    }
    clearInterval(deleteVideoTimer.current);
    setDeletingVideo({ cat: catId, id: video.id, countdown: 5 });
    let count = 5;
    deleteVideoTimer.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(deleteVideoTimer.current);
        setDeletingVideo(null);
        deleteVideo(catId, video); // video captured in closure — ลบจริง
      } else {
        setDeletingVideo(prev => prev ? { ...prev, countdown: count } : null);
      }
    }, 1000);
  }

  // uploadFile — owner only: อัพโหลดไฟล์ไปเก็บใน uploads/pk/{uid}/ (ส่วนตัว)
  async function uploadFile(e) {
    if (!isOwner) return; // ผู้ใช้ทั่วไปใช้ไม่ได้
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['webm', 'mp4'].includes(ext)) { toast.error('รองรับเฉพาะ .webm และ .mp4 เท่านั้น'); return; }
    setUploading(true);
    try {
      const idToken = await user.getIdToken();
      const form    = new FormData();
      form.append('video', file);
      const res  = await fetch(`${BACKEND}/api/pk/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const newVideo = { id: uuidv4(), name: data.name, url: data.url, type: data.type, checked: true };
      updateCategories({ ...categories, [activeTab]: [...(categories[activeTab] || []), newVideo] });
      toast.success(`✅ อัพโหลด "${data.name}" แล้ว — กด 📤 เพื่อแชร์ขึ้น Server`);
    } catch (err) { toast.error(`อัพโหลดไม่สำเร็จ: ${err.message}`); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  // uploadToShared — owner only: อัพโหลดวิดีโอจาก URL บน server ขึ้น _shared/{cat}/
  async function uploadToShared(video, catId) {
    if (!isOwner || !user) return;
    // ดึงไฟล์จาก URL แล้วส่งขึ้น backend
    const tid = `share_${video.id}`;
    toast.loading(`📤 กำลังแชร์ขึ้น Server...`, { id: tid });
    setSharingVideoId(video.id);
    try {
      // Fetch ไฟล์จาก backend URL
      const fileRes  = await fetch(`${BACKEND}${video.url}`);
      if (!fileRes.ok) throw new Error('โหลดไฟล์ไม่ได้');
      const blob     = await fileRes.blob();
      const ext      = video.type === 'webm' ? '.webm' : '.mp4';
      const filename = `${video.name.replace(/[^a-zA-Z0-9ก-ฮ\s._-]/g, '').trim() || 'video'}${ext}`;

      const idToken  = await user.getIdToken();
      const form     = new FormData();
      form.append('video', blob, filename);

      const res  = await fetch(`${BACKEND}/api/pk/upload-shared/${catId}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Reload presets ให้ทุก user เห็น
      const { data: pd } = await api.get('/api/pk/presets');
      if (pd.presets) setPresets(pd.presets);

      toast.success(`✅ แชร์ "${data.name}" ขึ้น Server แล้ว — ทุก user เห็นได้เลย`, { id: tid, duration: 4000 });
    } catch (err) {
      toast.error(`แชร์ไม่สำเร็จ: ${err.message}`, { id: tid });
    } finally {
      setSharingVideoId(null);
    }
  }

  function togglePreset(catId, filename) {
    const catMap  = presetChecked[catId] || {};
    const current = catMap[filename] ?? false;
    updatePresetChecked({ ...presetChecked, [catId]: { ...catMap, [filename]: !current } });
  }

  function toggleChecked(catId, videoId) {
    updateCategories({
      ...categories,
      [catId]: categories[catId].map(v => v.id === videoId ? { ...v, checked: !v.checked } : v),
    });
  }

  async function deleteVideo(catId, video) {
    if (video.url.startsWith('/uploads/pk/') && !video.url.includes('/_shared/')) {
      try { await api.delete(`/api/pk/video/${video.url.split('/').pop()}`); } catch {}
    }
    updateCategories({ ...categories, [catId]: categories[catId].filter(v => v.id !== video.id) });
  }

  const handleExport = useCallback(() => {
    const data     = { version: 2, exportedAt: new Date().toISOString(), tab: 'pk', hotkeys, categories, presetChecked };
    const uri      = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a        = Object.assign(document.createElement('a'), { href: uri, download: `ttplus-pk-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success('⬇ Export PK เรียบร้อย');
  }, [hotkeys, categories, presetChecked]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const toastId = toast.loading('กำลัง Import...');
    try {
      const data = JSON.parse(await file.text());
      if (!data.hotkeys && !data.categories) throw new Error('ไฟล์ไม่ถูกต้อง');
      const newHk = data.hotkeys || hotkeys;
      const newCats = data.categories || categories;
      const newPc   = data.presetChecked || presetChecked;
      setHotkeys(newHk); setCategories(newCats); setPresetChecked(newPc);
      await api.post('/api/pk/config', { hotkeys: newHk, categories: newCats, enabled, presetChecked: newPc });
      toast.success('⬆ Import PK เรียบร้อย', { id: toastId });
    } catch (err) { toast.error('Import ไม่สำเร็จ: ' + err.message, { id: toastId }); }
  }, [hotkeys, categories, presetChecked, enabled]);

  const widgetUrl = cid ? `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/pk?cid=${cid}` : null;
  function copyUrl() { if (!widgetUrl) return; navigator.clipboard.writeText(widgetUrl).then(() => toast.success('คัดลอก URL แล้ว!')); }

  function countChecked(catId) {
    const u = (categories[catId] || []).filter(v => v.checked).length;
    const p = (presets[catId]    || []).filter(p => (presetChecked[catId] || {})[p.filename]).length;
    return u + p;
  }
  function countTotal(catId) { return (categories[catId] || []).length + (presets[catId] || []).length; }

  // ─── Theme tokens ────────────────────────────────────────────────────────
  const bg     = isDark ? '#0f0f13' : '#fdf0f7';
  const card   = isDark ? '#1a1a24' : '#fff5fb';
  const border = isDark ? '#2d2d3d' : '#f9a8d4';
  const txt    = isDark ? '#f1f1f1' : '#111827';
  const muted  = isDark ? '#9ca3af' : '#6b7280';
  const accent = '#f97316';

  const curList        = categories[activeTab] || [];
  const curPresets     = presets[activeTab]    || [];
  const curPresetCheck = presetChecked[activeTab] || {};

  const ghostStyle = {
    padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`,
    background: 'transparent', color: muted, fontSize: 12, cursor: 'pointer',
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className={sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-48'} style={{ padding: '24px 20px' }}>

        {!user && (
          <div style={{ marginBottom: 14, padding: '8px 14px', borderRadius: 10, background: isDark ? '#1f2937' : '#fef9c3', border: `1px solid ${isDark ? '#374151' : '#fde047'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13 }}>🔒</span>
            <span style={{ fontSize: 12, color: isDark ? '#fbbf24' : '#92400e' }}>Login เพื่อโหลดข้อมูลและใช้งาน PK Panel</span>
          </div>
        )}

        <div style={{ maxWidth: 860, margin: '0 auto', opacity: user ? 1 : 0.45, pointerEvents: user ? 'auto' : 'none', transition: 'opacity 0.2s' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>

              {/* Left: title + i + enable pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚔️</span>
                <h1 style={{ fontSize: 20, fontWeight: 500, color: txt, margin: 0 }}>PK Panel</h1>
                <InfoTooltip isDark={isDark}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: txt, display: 'block', marginBottom: 4 }}>PK Panel</span>
                  <span style={{ color: muted }}>เล่นวิดีโอทับ OBS ระหว่าง PK — กดคีย์ลัดหรือคลิกปุ่มเพื่อเปิดใช้งาน</span>
                </InfoTooltip>

                {/* enable/disable pill */}
                <button onClick={toggleEnabled} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 14px',
                  borderRadius: 20, border: `1px solid ${enabled ? '#4ade8066' : border}`,
                  background: enabled ? (isDark ? '#052e1666' : '#dcfce7') : card,
                  color: enabled ? '#4ade80' : muted, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: enabled ? '#4ade80' : border, boxShadow: enabled ? '0 0 0 3px #4ade8033' : 'none', transition: 'all 0.2s', flexShrink: 0 }} />
                  {enabled ? 'เปิดอยู่' : 'ปิดอยู่'}
                </button>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => importRef.current?.click()} style={ghostStyle}>↑ Import</button>
                <button onClick={handleExport} style={ghostStyle}>↓ Export</button>
                <span style={{ fontSize: 12, color: saving ? accent : (isDark ? '#4ade80' : '#16a34a') }}>
                  {saving ? '💾 กำลังบันทึก...' : '✓ บันทึก'}
                </span>
              </div>
            </div>

            {/* ── WIDGET URL ── */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '9px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>📺</span>
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {widgetUrl || 'กำลังโหลด...'}
              </span>
              <InfoTooltip isDark={isDark} alignRight>
                <span style={{ fontWeight: 500, fontSize: 14, color: txt, display: 'block', marginBottom: 4 }}>Widget URL</span>
                <span style={{ color: muted }}>วางใน TikTok Studio หรือ OBS เป็น Browser Source · ขนาด 720×1280 (9:16 portrait)</span>
              </InfoTooltip>
              <button onClick={copyUrl} disabled={!widgetUrl} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                📋 Copy
              </button>
            </div>

            {/* ── HOTKEY BAR ── */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '9px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, transition: 'opacity 0.2s' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⌨️</span>
              <span style={{ fontSize: 13, color: hotkeysEnabled ? txt : muted, transition: 'color 0.2s', flexShrink: 0 }}>คีย์ลัด</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <span key={cat.id} style={{
                    fontFamily: 'monospace', fontSize: 11, padding: '2px 8px', borderRadius: 5,
                    background: hotkeysEnabled ? (isDark ? '#111' : '#f3f4f6') : 'transparent',
                    border: `1px solid ${hotkeysEnabled ? border : 'transparent'}`,
                    color: hotkeysEnabled ? txt : muted,
                    textDecoration: hotkeysEnabled ? 'none' : 'line-through',
                    opacity: hotkeysEnabled ? 1 : 0.45,
                    transition: 'all 0.2s',
                  }}>
                    {displayKey(hotkeys[cat.id])}
                  </span>
                ))}
              </div>
              <InfoTooltip isDark={isDark}>
                <span style={{ fontWeight: 500, fontSize: 14, color: txt, display: 'block', marginBottom: 4 }}>ปิดคีย์ลัดชั่วคราว</span>
                <span style={{ color: muted }}>ใช้เมื่ออยากใช้ PK Panel ด้วยการคลิกเท่านั้น โดยไม่กังวลว่าจะกดคีย์โดยบังเอิญขณะพิมพ์ chat</span>
              </InfoTooltip>

              {/* ── volume slider ── */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{volIcon(masterVolume)}</span>
                <input
                  type="range" min={0} max={100} step={1}
                  value={masterVolume}
                  onChange={e => handleVolumeChange(Number(e.target.value))}
                  title={`ระดับเสียง Widget: ${masterVolume}%`}
                  style={{ width: 80, cursor: 'pointer', accentColor: accent }}
                />
                <span style={{ fontSize: 11, color: muted, minWidth: 30 }}>{masterVolume}%</span>
              </div>

              {/* on/off switch */}
              <div style={{ flexShrink: 0 }}
                onClick={toggleHotkeysEnabled}
              >
                <div style={{ width: 38, height: 22, borderRadius: 11, background: hotkeysEnabled ? accent : (isDark ? '#374151' : '#d1d5db'), position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 4, width: 14, height: 14, borderRadius: '50%', background: '#fff', left: hotkeysEnabled ? 20 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>

            {/* ── CATEGORY TABS ── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => {
                const active = activeTab === cat.id;
                return (
                  <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{
                    padding: '7px 16px', borderRadius: 20,
                    border: `1px solid ${active ? accent : border}`,
                    background: active ? accent : card,
                    color: active ? '#fff' : muted,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                  }}>
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    <span style={{ fontSize: 11, padding: '0 5px', borderRadius: 8, background: active ? 'rgba(0,0,0,0.2)' : (isDark ? '#333' : '#eee'), color: active ? '#fff' : muted }}>
                      {countChecked(cat.id)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── CATEGORY PANEL ── */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>

              {/* Panel header */}
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{CATEGORIES.find(c => c.id === activeTab)?.emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: txt }}>{CATEGORIES.find(c => c.id === activeTab)?.label}</span>
                </div>
                <button
                  onClick={() => enabled && triggerCategory(activeTab)}
                  disabled={!enabled}
                  style={{ padding: '7px 20px', borderRadius: 10, border: 'none', background: enabled ? accent : (isDark ? '#374151' : '#d1d5db'), color: enabled ? '#fff' : muted, fontWeight: 600, fontSize: 13, cursor: enabled ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  ▶ เล่นเลย
                </button>
              </div>

              {/* Hotkey row */}
              <div style={{ padding: '8px 18px', borderBottom: `1px solid ${border}`, background: isDark ? '#13131c' : '#fafafa', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>คีย์ลัด</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                  background: hotkeysEnabled ? (isDark ? '#222' : '#f3f4f6') : 'transparent',
                  border: `1px solid ${hotkeysEnabled ? border : 'transparent'}`,
                  color: hotkeysEnabled ? txt : muted,
                  textDecoration: !hotkeysEnabled ? 'line-through' : 'none',
                  opacity: !hotkeysEnabled ? 0.45 : 1,
                  transition: 'all 0.2s',
                }}>
                  {settingKey === activeTab ? '...' : displayKey(hotkeys[activeTab])}
                </span>
                {settingKey === activeTab
                  ? <span style={{ fontSize: 12, color: accent }}>กดคีย์ที่ต้องการ...</span>
                  : <button onClick={() => setSettingKey(activeTab)} style={{ fontSize: 11, color: isDark ? '#60a5fa' : '#2563eb', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>เปลี่ยน</button>
                }
              </div>

              {/* Server presets */}
              {curPresets.length > 0 && (
                <div>
                  <div style={{ padding: '8px 18px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.04em' }}>📦 SERVER</span>
                    <span style={{ fontSize: 11, color: muted }}>{curPresets.filter(p => curPresetCheck[p.filename]).length}/{curPresets.length} เลือก</span>
                  </div>
                  {curPresets.map(preset => {
                    const isChecked    = !!curPresetCheck[preset.filename];
                    const isPendingDel = isOwner && deletePreset?.cat === activeTab && deletePreset?.filename === preset.filename;
                    return (
                      <div key={preset.filename} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px',
                        borderLeft: `2px solid ${isPendingDel ? '#ef4444' : isChecked ? accent : 'transparent'}`,
                        background: isPendingDel ? (isDark ? '#2a0a0a' : '#fff0f0') : isChecked ? (isDark ? '#1c1609' : '#fff8f0') : 'transparent',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }} onClick={() => togglePreset(activeTab, preset.filename)}>
                        <Cb checked={isChecked} onChange={() => togglePreset(activeTab, preset.filename)} accent={accent} border={border} />
                        <VideoThumb url={preset.url} type={preset.type} isDark={isDark} />
                        <span style={{ flex: 1, fontSize: 13, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</span>
                        {isOwner && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {isPendingDel ? (
                              <>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', minWidth: 18, textAlign: 'center' }}>{deletePreset.countdown}</span>
                                <button onClick={() => { clearInterval(deleteCountTimer.current); setDeletePreset(null); }} style={{
                                  fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${border}`,
                                  background: isDark ? '#2a2a2a' : '#f5f5f5', color: txt, cursor: 'pointer',
                                }}>ยกเลิก</button>
                              </>
                            ) : (
                              <button onClick={() => startDeletePreset(activeTab, preset.filename)} title="ลบออกจาก SERVER" style={{
                                fontSize: 14, background: 'none', border: 'none', cursor: 'pointer',
                                color: isDark ? '#888' : '#aaa', padding: '0 2px', lineHeight: 1,
                                transition: 'color 0.15s',
                              }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                 onMouseLeave={e => e.currentTarget.style.color = isDark ? '#888' : '#aaa'}>🗑</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {curList.length > 0 && <div style={{ margin: '0 18px', borderTop: `1px solid ${border}` }} />}
                </div>
              )}

              {/* User videos */}
              {(curList.length > 0 || (curPresets.length > 0)) && (
                <div>
                  {curPresets.length > 0 && curList.length > 0 && (
                    <div style={{ padding: '8px 18px 4px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.04em' }}>👤 ของฉัน</span>
                    </div>
                  )}
                  {curList.map(video => {
                    const isSharing = sharingVideoId === video.id;
                    // แสดงปุ่ม 📤 เฉพาะ owner + วิดีโอที่อยู่ใน server ของเรา (ไม่ใช่ external link)
                    const canShare  = isOwner && video.url.startsWith('/uploads/pk/') && !video.url.includes('/_shared/');
                    return (
                      <div key={video.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px',
                        borderLeft: `2px solid ${video.checked ? accent : 'transparent'}`,
                        background: video.checked ? (isDark ? '#1c1609' : '#fff8f0') : 'transparent',
                        transition: 'background 0.15s',
                      }}>
                        <Cb checked={video.checked} onChange={() => toggleChecked(activeTab, video.id)} accent={accent} border={border} />
                        <VideoThumb url={video.url} type={video.type} isDark={isDark} />
                        <span style={{ flex: 1, fontSize: 13, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.name}</span>
                        {canShare && (
                          <button
                            onClick={e => { e.stopPropagation(); uploadToShared(video, activeTab); }}
                            disabled={isSharing}
                            title="แชร์วิดีโอนี้ให้ผู้ใช้ทุกคน"
                            style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${accent}55`, background: 'transparent', color: accent, fontSize: 12, cursor: isSharing ? 'wait' : 'pointer', flexShrink: 0, opacity: isSharing ? 0.5 : 1 }}
                          >{isSharing ? '⏳' : '📤'}</button>
                        )}
                        {/* ปุ่มลบ + countdown 5 วินาที */}
                        {(() => {
                          const isPending = deletingVideo?.cat === activeTab && deletingVideo?.id === video.id;
                          return isPending ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', minWidth: 18, textAlign: 'center' }}>{deletingVideo.countdown}</span>
                              <button onClick={() => { clearInterval(deleteVideoTimer.current); setDeletingVideo(null); }} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${border}`,
                                background: isDark ? '#2a2a2a' : '#f5f5f5', color: txt, cursor: 'pointer',
                              }}>ยกเลิก</button>
                            </div>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); startDeleteVideo(activeTab, video); }} style={{
                              padding: '4px 8px', borderRadius: 6, border: `1px solid #ef444433`,
                              background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', flexShrink: 0,
                            }}>🗑</button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              {curList.length === 0 && curPresets.length === 0 && (
                <p style={{ textAlign: 'center', color: muted, fontSize: 13, padding: '24px 0' }}>ยังไม่มีวิดีโอ — เพิ่มด้านล่าง</p>
              )}

              {/* Add video — ทุก user: เพิ่มจากลิงก์ / owner เพิ่ม: อัพโหลดไฟล์ */}
              <div style={{ padding: '12px 18px', borderTop: `1px solid ${border}`, background: isDark ? '#13131c' : '#fafafa' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: isOwner ? 8 : 0 }}>
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addVideoUrl()}
                    placeholder="วาง URL วิดีโอ (https://...)"
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f0f13' : '#fff', color: txt, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                  />
                  <input
                    value={urlName}
                    onChange={e => setUrlName(e.target.value)}
                    placeholder="ชื่อ (ไม่บังคับ)"
                    style={{ width: 130, padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f0f13' : '#fff', color: txt, fontSize: 12, outline: 'none' }}
                  />
                  <select value={urlType} onChange={e => setUrlType(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f0f13' : '#fff', color: txt, fontSize: 12 }}>
                    <option value="mp4">MP4</option>
                    <option value="webm">WebM</option>
                  </select>
                  <button onClick={addVideoUrl} disabled={!urlInput.trim()} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: urlInput.trim() ? accent : (isDark ? '#333' : '#d1d5db'), color: urlInput.trim() ? '#fff' : muted, fontSize: 12, fontWeight: 600, cursor: urlInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                    + เพิ่ม
                  </button>
                </div>
                {/* อัพโหลดไฟล์ — owner เท่านั้น */}
                {isOwner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {uploading ? '⏳ กำลังอัพโหลด...' : '⬆️ อัพโหลดไฟล์ (owner)'}
                    </button>
                    <span style={{ fontSize: 11, color: muted }}>ไฟล์จะเข้า "ของฉัน" — กด 📤 เพื่อแชร์ขึ้น Server</span>
                  </div>
                )}
              </div>

            </div>{/* /category panel */}

            {/* ── INFO FOOTER ── */}
            <div style={{ padding: '8px 14px', borderRadius: 10, background: isDark ? '#1a1a1a' : '#f9f9f9', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: muted }}>WebM = alpha channel &nbsp;·&nbsp; MP4 = Chroma Key ใน OBS &nbsp;·&nbsp; ติ๊กหลายรายการ = สุ่มเล่น &nbsp;·&nbsp; Server = พร้อมใช้งาน</span>
              <div style={{ marginLeft: 'auto' }}>
                <InfoTooltip isDark={isDark} alignRight>
                  <span style={{ fontWeight: 500, fontSize: 14, color: txt, display: 'block', marginBottom: 6 }}>ประเภทไฟล์วิดีโอ</span>
                  <span style={{ color: muted, display: 'block', lineHeight: 1.8 }}>
                    <b style={{ fontWeight: 600, color: txt }}>WebM</b> — โปร่งใสจริง ต้อง encode มา alpha channel<br />
                    <b style={{ fontWeight: 600, color: txt }}>MP4</b> — ต้องตั้ง Chroma Key ใน OBS<br />
                    <b style={{ fontWeight: 600, color: txt }}>Server</b> — วิดีโอจากทีมงาน พร้อมใช้ได้เลย<br />
                    <b style={{ fontWeight: 600, color: txt }}>สุ่มเล่น</b> — ติ๊กหลายรายการ = สุ่ม, อันเดียว = เล่นซ้ำ
                  </span>
                </InfoTooltip>
              </div>
            </div>

          </div>

        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImport} />
        <input ref={fileRef}   type="file" accept=".webm,.mp4"            style={{ display: 'none' }} onChange={uploadFile} />
      </main>
    </div>
  );
}
