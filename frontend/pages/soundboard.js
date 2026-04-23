// soundboard.js — หน้า Soundboard
// 2 pages × 26 ปุ่ม = 52 เสียง | สลับ page ด้วย Tab
// Stop All ด้วย Escape | Layout แนวนอน/แนวตั้ง
// ชื่อปุ่มตั้งเองได้ ผูกกับ email | โหมดกดซ้ำ: poly / stop
import { useEffect, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import {
  loadSettings, saveSettings, playKey, uploadCustom, removeCustom, removeAllCustom,
  getAudioContext, loadNames, saveName, stopAllAudio, clearCustomCache,
  getPlayingKeys, exportSettings, importSettings,
} from '../lib/soundboardStore';
import { KB_ROWS } from '../lib/soundSynth';

const KEY_BASE_PX   = 68;
const KEY_MIN_SCALE = 0.55;
const KEY_MAX_SCALE = 1.45;
const LONG_PRESS_MS = 380;
const STOP_FADE_MS  = 280;
const GLOW_MS       = 400;   // minimum glow duration after a key plays

const ALL_KEYS = new Set(KB_ROWS.flat());

// ===== SoundKey =====
function SoundKey({
  keyChar, keyName, mode, store, pressing, editMode, theme,
  isPlaying, recentlyPlayed,
  onPress, onPreview, onRemove, onRename, onModeToggle,
}) {
  const timerRef  = useRef(null);
  const startedAt = useRef(null);

  const isDown     = pressing.has(keyChar);
  const hasCustom  = !!store?.customs?.[keyChar]?.b64;
  const custFile   = store?.customs?.[keyChar]?.name || '';
  const scale      = store?.keySize ?? 1.0;
  const sizePx     = Math.round(KEY_BASE_PX * scale);
  const isStop     = mode === 'stop';
  const isLit      = isPlaying || recentlyPlayed.has(keyChar);

  const titleParts = editMode
    ? [`[${keyChar}] กดสั้น = อัปโหลด | กดค้าง = preview`, '✏️ คลิกชื่อ = ตั้งชื่อ']
    : [keyName ? `[${keyChar}] ${keyName}` : `[${keyChar}]`, custFile && `📄 ${custFile}`].filter(Boolean);
  const titleText = titleParts.join('\n');

  const handlePointerDown = (e) => {
    e.preventDefault();
    startedAt.current = Date.now();
    if (editMode) timerRef.current = setTimeout(() => onPreview(keyChar), LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    const held = Date.now() - (startedAt.current || 0);
    clearTimeout(timerRef.current);
    startedAt.current = null;
    if (editMode) { if (held < LONG_PRESS_MS) onPress(keyChar); }
    else onPress(keyChar);
  };

  const handlePointerLeave = () => {
    clearTimeout(timerRef.current);
    startedAt.current = null;
  };

  return (
    <div
      style={{ width: sizePx, height: sizePx }}
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-xl select-none cursor-pointer',
        'transition-all duration-75 border font-medium',
        isDown
          ? 'bg-brand-500 border-brand-400 shadow-lg shadow-brand-500/30 scale-90'
          : isLit
            ? theme === 'dark'
              ? 'bg-gray-800 border-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.45)]'
              : 'bg-white border-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.35)]'
            : theme === 'dark'
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
        editMode && 'ring-2 ring-yellow-400/60'
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      title={titleText}
    >
      {/* Key letter — มุมซ้ายบน */}
      <span className={clsx(
        'absolute top-1 left-1.5 text-[10px] font-bold leading-none',
        isDown ? 'text-white/70' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      )}>
        {keyChar}
      </span>

      {/* Mode badge ∞/⏹ — มุมซ้ายล่าง (คลิกได้เฉพาะ edit mode ป้องกันกดโดน) */}
      <span
        className={clsx(
          'absolute bottom-1 left-1.5 text-[9px] font-bold leading-none transition-colors',
          editMode ? 'cursor-pointer' : 'cursor-default',
          isStop
            ? editMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-400'
            : isDown ? 'text-white/30' : theme === 'dark' ? 'text-gray-700' : 'text-gray-200'
        )}
        title={editMode
          ? (isStop ? 'หยุดแล้วเล่นใหม่ — คลิกเปลี่ยน' : 'เล่นซ้อนกัน — คลิกเปลี่ยน')
          : (isStop ? '⏹ หยุดแล้วเล่นใหม่' : '∞ เล่นซ้อนกัน')}
        onPointerDown={editMode ? (e) => { e.stopPropagation(); onModeToggle(keyChar); } : undefined}
      >
        {isStop ? '⏹' : '∞'}
      </span>

      {/* Custom badge ✔ — มุมขวาบน */}
      {hasCustom && (
        <span
          className="absolute top-1 right-1 text-[8px] bg-green-500 text-white rounded px-0.5 leading-none cursor-pointer hover:bg-red-500 transition-colors"
          title={`ไฟล์: ${custFile} — คลิกลบ`}
          onPointerDown={(e) => { e.stopPropagation(); onRemove(keyChar); }}
        >
          ✔
        </span>
      )}

      {/* Icon */}
      <span style={{ fontSize: Math.round(sizePx * 0.34) }} className="leading-none">
        {editMode ? '📂' : (keyName ? '🔊' : '🔈')}
      </span>

      {/* ชื่อปุ่ม */}
      <span
        style={{ fontSize: Math.max(8, Math.round(sizePx * 0.14)) }}
        className={clsx(
          'mt-0.5 px-0.5 truncate max-w-full leading-none',
          isDown ? 'text-white/80' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500',
          editMode && 'underline decoration-dotted cursor-text'
        )}
        onPointerDown={editMode ? (e) => { e.stopPropagation(); onRename(keyChar); } : undefined}
      >
        {keyName || (editMode ? '—' : '')}
      </span>
    </div>
  );
}

// ===== KeyboardLayout =====
function KeyboardLayout({
  store, names, pressing, editMode, theme,
  playingKeys, recentlyPlayed,
  onPress, onPreview, onRemove, onRename, onModeToggle,
}) {
  const scale   = store?.keySize ?? 1.0;
  const sizePx  = Math.round(KEY_BASE_PX * scale);
  const gap     = Math.round(sizePx * 0.12);
  const stagger = Math.round(sizePx * 0.35);
  const isVert  = store?.layout === 'v';

  const keyProps = (key) => ({
    keyChar: key, keyName: names[key] || '',
    mode: store?.modes?.[key] || 'poly',
    store, pressing, editMode, theme,
    isPlaying: playingKeys.has(key),
    recentlyPlayed,
    onPress, onPreview, onRemove, onRename, onModeToggle,
  });

  // แนวตั้ง — KB_ROWS เป็น column (Q→Z, W→X, …)
  // stagger: column ซ้ายสุด (Q-Z) มี offset มากที่สุด → ลดลงทางขวา
  // → ให้ดูเป็น keyboard stagger ที่ถูกต้องเมื่อพลิกจอ
  if (isVert) {
    return (
      <div className="inline-flex flex-row items-start" style={{ gap }}>
        {KB_ROWS.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ paddingTop: (KB_ROWS.length - 1 - ci) * stagger, gap }}>
            {col.map(key => <SoundKey key={key} {...keyProps(key)} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start" style={{ gap }}>
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="flex flex-row flex-nowrap" style={{ paddingLeft: ri * stagger, gap }}>
          {row.map(key => <SoundKey key={key} {...keyProps(key)} />)}
        </div>
      ))}
    </div>
  );
}

// ===== Main =====
export default function SoundboardPage({ theme, user, activePage: navPage, setActivePage }) {
  const [store,          setStore]          = useState(null);
  const [names,          setNames]          = useState({});
  const [page,           setPage]           = useState(1);
  const [editMode,       setEditMode]       = useState(false);
  const [pressing,       setPressing]       = useState(new Set());
  const [playingKeys,    setPlayingKeys]    = useState(new Set());
  const [recentlyPlayed, setRecentlyPlayed] = useState(new Set());
  const [uploadKey,      setUploadKey]      = useState(null);

  const fileInputRef   = useRef(null);
  const importInputRef = useRef(null);
  const recentTimers   = useRef({});   // key → timeout id

  const email = user?.email || null;

  useEffect(() => { setStore(loadSettings()); }, []);
  useEffect(() => { setNames(loadNames(email, page)); }, [email, page]);

  // Poll getPlayingKeys ทุก 80 ms
  useEffect(() => {
    const id = setInterval(() => {
      setPlayingKeys(getPlayingKeys());
    }, 80);
    return () => clearInterval(id);
  }, []);

  // effectiveStore: แทน customs/modes ด้วย page ปัจจุบัน
  const effectiveStore = store
    ? page === 2
      ? { ...store, customs: store.customs2 || {}, modes: store.modes2 || {} }
      : store
    : null;

  // flashKey — guarantee minimum glow even for very short sounds
  // CRITICAL: ต้องประกาศก่อน useEffect ที่ใช้ flashKey ใน dependency array
  const flashKey = useCallback((key) => {
    setRecentlyPlayed(prev => new Set([...prev, key]));
    if (recentTimers.current[key]) clearTimeout(recentTimers.current[key]);
    recentTimers.current[key] = setTimeout(() => {
      setRecentlyPlayed(prev => {
        const ns = new Set(prev);
        ns.delete(key);
        return ns;
      });
      delete recentTimers.current[key];
    }, GLOW_MS);
  }, []);

  // Keyboard: Q-M + Escape + Tab
  useEffect(() => {
    if (!store) return;
    const onDown = (e) => {
      // Escape = Stop All
      if (e.key === 'Escape') {
        e.preventDefault();
        stopAllAudio(STOP_FADE_MS);
        toast('⏹ หยุดเสียงทั้งหมด', { duration: 800 });
        return;
      }
      // Tab = สลับ page
      if (e.key === 'Tab') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
        setPage(p => {
          const next = p === 1 ? 2 : 1;
          clearCustomCache();
          return next;
        });
        return;
      }
      if (e.repeat) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const key = e.key.toUpperCase();
      if (!ALL_KEYS.has(key)) return;
      e.preventDefault();
      getAudioContext();
      setPressing(s => new Set([...s, key]));
      if (!editMode) {
        playKey(key, effectiveStore, page === 1);
        flashKey(key);
      }
    };
    const onUp = (e) => {
      const key = e.key.toUpperCase();
      setPressing(s => { const ns = new Set(s); ns.delete(key); return ns; });
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, [store, editMode, effectiveStore, page, flashKey]);

  const patch = useCallback((update) => {
    setStore(prev => {
      const next = saveSettings(typeof update === 'function' ? update(prev) : update);
      return { ...prev, ...next };
    });
  }, []);

  const handleKeyPress = useCallback((key) => {
    if (!effectiveStore) return;
    if (editMode) { setUploadKey(key); fileInputRef.current?.click(); return; }
    getAudioContext();
    playKey(key, effectiveStore, page === 1);
    flashKey(key);
    setPressing(s => new Set([...s, key]));
    setTimeout(() => setPressing(s => { const ns = new Set(s); ns.delete(key); return ns; }), 130);
  }, [effectiveStore, editMode, page, flashKey]);

  const handleKeyPreview = useCallback((key) => {
    if (!effectiveStore) return;
    getAudioContext();
    playKey(key, effectiveStore, page === 1);
    flashKey(key);
    setPressing(s => new Set([...s, key]));
    setTimeout(() => setPressing(s => { const ns = new Set(s); ns.delete(key); return ns; }), 300);
    toast(`🔊 preview [${key}]`, { duration: 900 });
  }, [effectiveStore, page, flashKey]);

  const handleStopAll = useCallback(() => {
    stopAllAudio(STOP_FADE_MS);
    toast('⏹ หยุดเสียงทั้งหมด', { duration: 800 });
  }, []);

  const handleSwitchPage = useCallback((newPage) => {
    clearCustomCache();
    setPage(newPage);
  }, []);

  const handleModeToggle = useCallback((key) => {
    const field = page === 2 ? 'modes2' : 'modes';
    const cur   = (store?.[field] || {})[key] || 'poly';
    const next  = cur === 'poly' ? 'stop' : 'poly';
    patch({ [field]: { ...(store?.[field] || {}), [key]: next } });
    toast(next === 'stop' ? `[${key}] ⏹ หยุดแล้วเล่นใหม่` : `[${key}] ∞ เล่นซ้อนกัน`, { duration: 1000 });
  }, [store, patch, page]);

  const handleRename = useCallback((key) => {
    const current = names[key] || '';
    const input   = window.prompt(`ตั้งชื่อปุ่ม [${key}] — Page ${page}\n(ลบข้อความออกเพื่อลบชื่อ):`, current);
    if (input === null) return;
    const updated = saveName(email, key, input, page);
    setNames({ ...updated });
    toast.success(input.trim() ? `[${key}] ชื่อ "${input.trim()}"` : `[${key}] ลบชื่อแล้ว`);
  }, [names, email, page]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadKey) return;
    try {
      const res = await uploadCustom(uploadKey, file, page);
      setStore(loadSettings());
      toast.success(`[${uploadKey}] อัปโหลด "${res.name}" — Page ${page}`);
    } catch (err) { toast.error(err.message); }
    setUploadKey(null);
  }, [uploadKey, page]);

  const handleRemove = useCallback((key) => {
    removeCustom(key, page);
    setStore(loadSettings());
    toast.success(`[${key}] ลบเสียง custom (Page ${page})`);
  }, [page]);

  const handleResetAll = useCallback(() => {
    const customs = page === 2 ? store?.customs2 : store?.customs;
    const count   = Object.keys(customs || {}).length;
    if (!count) { toast('ไม่มีเสียง custom ใน Page ' + page, { duration: 1500 }); return; }
    const ok = window.confirm(
      `⚠️ รีเซ็ต Page ${page} — จะลบไฟล์เสียง custom ทั้งหมด ${count} เสียง\n\n` +
      `หลังรีเซ็ตจะต้องอัปโหลดไฟล์เสียงใหม่ทั้งหมด — กู้คืนไม่ได้!\n\n` +
      `กด OK เพื่อยืนยัน`
    );
    if (!ok) return;
    removeAllCustom(page);
    setStore(loadSettings());
    toast.success(`รีเซ็ต Page ${page} แล้ว (ลบ ${count} เสียง)`);
  }, [store, page]);

  const handleExport = useCallback(() => {
    try {
      const data = exportSettings(email);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `soundboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export เรียบร้อย');
    } catch (err) { toast.error('Export ไม่สำเร็จ: ' + err.message); }
  }, [email]);

  const handleImportFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const restored = importSettings(data, email);
      setStore(restored);
      setNames(loadNames(email, page));
      toast.success('Import เรียบร้อย — โหลดการตั้งค่าแล้ว');
    } catch (err) { toast.error('Import ไม่สำเร็จ: ' + err.message); }
  }, [email, page]);

  if (!store || !effectiveStore) return null;

  const isDark      = theme === 'dark';
  const scale       = store.keySize ?? 1.0;
  const isVertical  = store.layout === 'v';
  const customCount = Object.keys((page === 2 ? store.customs2 : store.customs) || {}).length;

  return (
    <div className={clsx('flex h-screen overflow-hidden', isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={navPage} setActivePage={setActivePage} />

      <main className="flex-1 ml-16 md:ml-56 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

          {/* ===== Header ===== */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">🎹 Soundboard</h1>

            {/* ON/OFF */}
            <button
              onClick={() => patch({ enabled: !store.enabled })}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                store.enabled
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              )}
            >
              <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', store.enabled ? 'bg-green-300 animate-pulse' : 'bg-gray-500')} />
              {store.enabled ? 'เปิด' : 'ปิด'}
            </button>

            {/* Stop All */}
            <button
              onClick={handleStopAll}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                isDark
                  ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 border border-red-900/50'
                  : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
              )}
              title="หยุดทุกเสียงทันที (Escape)"
            >
              ⏹ หยุดทั้งหมด
            </button>

            {/* Layout */}
            <button
              onClick={() => patch({ layout: isVertical ? 'h' : 'v' })}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
            >
              {isVertical ? '↔ แนวนอน' : '↕ แนวตั้ง'}
            </button>

            {/* Edit mode */}
            <button
              onClick={() => setEditMode(m => !m)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                editMode
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              )}
            >
              ✏️ {editMode ? 'กำลังแก้ไข...' : 'แก้ไข'}
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
              title="Export การตั้งค่าทั้งหมด + ชื่อปุ่ม"
            >
              ⬇ Export
            </button>

            {/* Import */}
            <button
              onClick={() => importInputRef.current?.click()}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
              title="Import การตั้งค่าจากไฟล์ backup"
            >
              ⬆ Import
            </button>

            {/* Reset page */}
            {customCount > 0 && (
              <button
                onClick={handleResetAll}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                  isDark ? 'bg-gray-800 text-red-400 hover:bg-red-900/30 border border-red-900/40' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                )}
              >
                🗑️ รีเซ็ต ({customCount})
              </button>
            )}
          </div>

          {/* ===== Page Tabs ===== */}
          <div className="flex items-center gap-2">
            {[1, 2].map(p => (
              <button
                key={p}
                onClick={() => handleSwitchPage(p)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                  page === p
                    ? isDark ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-300 shadow-sm'
                    : isDark ? 'bg-gray-900 text-gray-500 hover:text-gray-300' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', page === p ? 'bg-brand-500' : isDark ? 'bg-gray-600' : 'bg-gray-300')} />
                Page {p}
                {(() => {
                  const cnt = Object.keys((p === 2 ? store.customs2 : store.customs) || {}).length;
                  return cnt > 0 ? <span className={clsx('text-[10px] px-1 rounded-full', isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-500')}>{cnt}</span> : null;
                })()}
              </button>
            ))}
            <span className={clsx('text-xs ml-1', isDark ? 'text-gray-600' : 'text-gray-400')}>
              Tab = สลับ Page
            </span>
          </div>

          {/* Disabled notice */}
          {!store.enabled && (
            <div className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm border',
              isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            )}>
              <span>⚠️</span>
              <p className="flex-1 font-medium">Soundboard ปิดอยู่ — กดเล่นเสียงไม่ได้</p>
              <button onClick={() => patch({ enabled: true })} className="px-3 py-1.5 rounded-lg bg-brand-500 text-white font-semibold text-xs hover:bg-brand-600 transition">
                เปิดใช้งาน
              </button>
            </div>
          )}

          {/* Edit mode hint */}
          {editMode && (
            <div className={clsx(
              'flex items-start gap-2 px-4 py-3 rounded-xl text-sm border',
              isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            )}>
              <span className="mt-0.5">✏️</span>
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-sm">โหมดแก้ไข — Page {page}</p>
                <p><b>กดสั้น</b> ที่ปุ่ม = เลือกไฟล์เสียง (.mp3 / .ogg / .wav ≤ 2 MB)</p>
                <p><b>กดค้าง</b> ที่ปุ่ม = ฟัง preview ก่อน</p>
                <p><b>คลิกชื่อ</b>ใต้ปุ่ม = ตั้งชื่อ (บันทึกตาม account + page)</p>
                <p>คลิก <b>∞ / ⏹</b> มุมล่างซ้าย = สลับโหมดกดซ้ำ | คลิก <b>✔</b> มุมบนขวา = ลบไฟล์ custom</p>
              </div>
            </div>
          )}

          {/* ===== Controls ===== */}
          <div className={clsx(
            'rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-5',
            isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
          )}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">🔊 ระดับเสียง</span>
                <span className={clsx('text-sm font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>{Math.round(store.volume * 100)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={store.volume}
                onChange={e => patch({ volume: parseFloat(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">⌨️ ขนาดปุ่ม</span>
                <span className={clsx('text-sm font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>{Math.round(scale * 100)}%</span>
              </div>
              <input type="range" min={KEY_MIN_SCALE} max={KEY_MAX_SCALE} step="0.05" value={scale}
                onChange={e => patch({ keySize: parseFloat(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer" />
            </div>
          </div>

          {/* ===== Keyboard ===== */}
          <div className={clsx(
            'rounded-2xl p-4 overflow-auto',
            isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
          )}>
            {/* Page indicator บน keyboard */}
            <div className="flex items-center justify-between mb-3">
              <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}>
                📄 Page {page}
              </span>
              {page === 2 && (
                <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>
                  Page 2 ไม่มีเสียง default — อัปโหลดเองได้เลย
                </span>
              )}
            </div>
            <KeyboardLayout
              store={effectiveStore}
              names={names}
              pressing={pressing}
              editMode={editMode}
              theme={theme}
              playingKeys={playingKeys}
              recentlyPlayed={recentlyPlayed}
              onPress={handleKeyPress}
              onPreview={handleKeyPreview}
              onRemove={handleRemove}
              onRename={handleRename}
              onModeToggle={handleModeToggle}
            />
          </div>

          {/* ===== Help ===== */}
          <div className={clsx(
            'rounded-2xl p-5 text-sm',
            isDark ? 'bg-gray-900 border border-gray-800 text-gray-400' : 'bg-gray-50 border border-gray-200 text-gray-500'
          )}>
            <p className={clsx('font-semibold mb-3', isDark ? 'text-gray-200' : 'text-gray-700')}>วิธีใช้งาน</p>
            <div className="space-y-3 text-xs">
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🎵 เล่นเสียง</p>
                <p>กดปุ่มตัวอักษรบน<b>คีย์บอร์ด</b> (Q–P / A–L / Z–M) หรือ<b>แตะปุ่มบนหน้าจอ</b> กดหลายปุ่มพร้อมกันได้ ไม่ตัดเสียงกัน ไม่หยุดเพลงพื้นหลัง ปุ่มจะ<b>เรืองแสง</b>ขณะเสียงกำลังเล่น</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⏹ หยุดเสียง</p>
                <p>กด <b>Escape</b> หรือปุ่ม "หยุดทั้งหมด" เพื่อตัดทุกเสียงที่กำลังเล่นทันที</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🔁 โหมดกดซ้ำ (ต้องอยู่ในโหมดแก้ไขเพื่อเปลี่ยน)</p>
                <p><b>∞ เล่นซ้อน</b> — กดซ้ำขณะเสียงยังเล่นอยู่จะเล่นทับกันเลย เช่น เสียง 2 วินาที กดซ้ำตอน 1 วิ → จะมีเสียงซ้อน 2 ชั้นและจบภายใน 3 วินาที</p>
                <p className="mt-0.5"><b>⏹ หยุดแล้วเล่นใหม่</b> — กดซ้ำขณะเล่นจะหยุดทันทีแล้วเริ่มใหม่จากต้น</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>📄 2 Pages (Tab = สลับ)</p>
                <p>Page 1 มีเสียง default พร้อมใช้ทุกปุ่ม — Page 2 ว่างไว้ อัปโหลดเสียงเพิ่มเองได้อีก 26 เสียง</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>✏️ แก้ไข (กดปุ่ม "แก้ไข" ก่อน)</p>
                <p><b>กดสั้น</b> = อัปโหลดไฟล์เสียง | <b>กดค้าง</b> = ฟัง preview | <b>คลิกชื่อ</b> = ตั้งชื่อปุ่ม | <b>คลิก ✔</b> = ลบไฟล์ custom</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⬇⬆ Export / Import</p>
                <p>บันทึกการตั้งค่าทั้งหมด (โหมด, ชื่อปุ่ม, เสียง custom) เป็นไฟล์ .json เพื่อสำรองข้อมูลหรือย้ายไปเครื่องอื่น</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <input ref={fileInputRef}   type="file" accept="audio/*"       className="hidden" onChange={handleFileChange} />
      <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
    </div>
  );
}
