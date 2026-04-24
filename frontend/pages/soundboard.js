// soundboard.js — หน้า Soundboard
// 2 pages × 26 ปุ่ม = 52 เสียง | สลับ page ด้วย Tab
// Stop All ด้วย Escape | Layout แนวนอน/แนวตั้ง
// ชื่อปุ่มตั้งเองได้ ผูกกับ email | โหมด: poly / stop / toggle / loop
// Drag & drop ไฟล์ลงปุ่มได้ (Desktop/iPad) | Right-click context menu (Desktop ≥1024px)
// Per-key color + volume
import { useEffect, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import {
  loadSettings, saveSettings, playKey, uploadCustom, removeCustom, removeAllCustom,
  getAudioContext, loadNames, saveName, stopAllAudio, clearCustomCache,
  getPlayingKeys, getPlayingProgress, copyKey, exportSettings, importSettings,
} from '../lib/soundboardStore';
import { KB_ROWS } from '../lib/soundSynth';

const KEY_BASE_PX   = 68;
const KEY_MIN_SCALE = 0.55;
const KEY_MAX_SCALE = 1.45;
const LONG_PRESS_MS = 380;
const STOP_FADE_MS  = 280;
const GLOW_MS       = 400;   // minimum glow duration after a key plays

const ALL_KEYS = new Set(KB_ROWS.flat());

// 12 swatches: index 0 = default/clear, 1-11 = colors
const KEY_COLORS = [
  '',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#a16207', '#6b7280', '#f1f5f9',
];

const MODE_OPTS = [
  { id: 'poly',   icon: '∞',  label: 'เล่นซ้อน' },
  { id: 'stop',   icon: '⏹', label: 'หยุด-เล่นใหม่' },
  { id: 'toggle', icon: '⏯', label: 'กดซ้ำ=หยุด' },
  { id: 'loop',   icon: '🔁', label: 'เล่นวน' },
];

// ===== SoundKey =====
function SoundKey({
  keyChar, keyName, mode, store, pressing, editMode, theme,
  isPlaying, recentlyPlayed, keyColor, isDragTarget, padMode,
  progress, showKbHint,
  onPress, onPreview, onRemove, onRename, onModeToggle, onContextMenu,
  onDragOver, onDrop,
}) {
  const timerRef  = useRef(null);
  const startedAt = useRef(null);

  const isDown    = pressing.has(keyChar);
  const hasCustom = !!store?.customs?.[keyChar]?.b64;
  const custFile  = store?.customs?.[keyChar]?.name || '';
  const scale     = store?.keySize ?? 1.0;
  const sizePx    = Math.round(KEY_BASE_PX * scale);
  const isLit     = isPlaying || recentlyPlayed.has(keyChar);

  const modeIcon  = mode === 'stop' ? '⏹' : mode === 'toggle' ? '⏯' : mode === 'loop' ? '🔁' : '∞';
  const modeOpt   = MODE_OPTS.find(m => m.id === mode) || MODE_OPTS[0];
  const modeColorClass =
    mode === 'stop'   ? 'text-orange-400'
    : mode === 'toggle' ? 'text-purple-400'
    : mode === 'loop'   ? 'text-cyan-400'
    : isDown ? 'text-white/30' : theme === 'dark' ? 'text-gray-700' : 'text-gray-200';

  const titleParts = editMode
    ? [`[${keyChar}] กดเพื่อเปิดเมนูแก้ไข${custFile ? ` — 📄 ${custFile}` : ''}`, 'กดค้าง = ฟัง preview']
    : [keyName ? `[${keyChar}] ${keyName}` : `[${keyChar}]`, custFile && `📄 ${custFile}`].filter(Boolean);

  const handlePointerDown = (e) => {
    e.preventDefault();
    startedAt.current = Date.now();
    if (editMode) timerRef.current = setTimeout(() => onPreview(keyChar), LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    if (!startedAt.current) return; // gesture ถูก cancel แล้ว
    const held = Date.now() - startedAt.current;
    clearTimeout(timerRef.current);
    startedAt.current = null;
    if (editMode) { if (held < LONG_PRESS_MS) onPress(keyChar); }
    else onPress(keyChar);
  };

  const handlePointerLeave = () => {
    clearTimeout(timerRef.current);
    // ไม่ null startedAt — บน mobile pointerLeave อาจยิงก่อน pointerUp
  };

  const handlePointerCancel = () => {
    clearTimeout(timerRef.current);
    startedAt.current = null;
  };

  // Inline style overrides for drag target / custom color
  const colorStyle = {};
  if (isDragTarget) {
    colorStyle.borderColor = '#22c55e';
    colorStyle.boxShadow   = '0 0 0 2px #22c55e, 0 0 15px rgba(34,197,94,0.4)';
    colorStyle.background  = 'rgba(34,197,94,0.12)';
  } else if (keyColor && !isDown) {
    colorStyle.borderColor     = keyColor;
    colorStyle.backgroundColor = keyColor + '22'; // ~13% opacity
    if (isLit) colorStyle.boxShadow = `0 0 10px 2px ${keyColor}80`;
  }

  return (
    <div
      data-key={keyChar}
      style={padMode
        ? { aspectRatio: '1 / 1', ...colorStyle }
        : { width: sizePx, height: sizePx, ...colorStyle }}
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-xl select-none cursor-pointer',
        'transition-all duration-75 border font-medium',
        padMode && 'w-full',
        isDown
          ? 'bg-brand-500 border-brand-400 shadow-lg shadow-brand-500/30 scale-95'
          : isLit && !keyColor
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
      onPointerCancel={handlePointerCancel}
      onContextMenu={onContextMenu ? (e) => { e.preventDefault(); onContextMenu(keyChar, e); } : undefined}
      onDragOver={onDragOver ? (e) => { e.preventDefault(); onDragOver(keyChar); } : undefined}
      onDrop={onDrop ? (e) => { e.preventDefault(); onDrop(keyChar, e); } : undefined}
      title={titleParts.join('\n')}
    >
      {/* Key letter — มุมซ้ายบน (pad mode: แสดงเฉพาะเมื่อ showKbHint=true) */}
      {(!padMode || showKbHint !== false) && (
        <span className={clsx(
          'absolute top-1 left-1.5 text-[10px] font-bold leading-none',
          isDown ? 'text-white/70'
            : padMode && showKbHint
              ? theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
              : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        )}>
          {keyChar}
        </span>
      )}

      {/* Mode badge — มุมซ้ายล่าง (editMode: bubble ขึ้น parent เพื่อเปิด Action Sheet) */}
      <span
        className={clsx(
          'absolute bottom-1 left-1.5 text-[9px] font-bold leading-none transition-colors',
          editMode ? 'cursor-pointer' : 'cursor-default',
          modeColorClass
        )}
        title={editMode ? `เปิดเมนูแก้ไข [${keyChar}]` : `${modeIcon} ${modeOpt.label}`}
        onPointerDown={editMode ? undefined : undefined}
      >
        {modeIcon}
      </span>

      {/* Custom badge ✔ — มุมขวาบน (editMode: bubble ขึ้น parent เพื่อเปิด Action Sheet) */}
      {hasCustom && (
        <span
          className={clsx(
            'absolute top-1 right-1 text-[8px] rounded px-0.5 leading-none transition-colors',
            editMode
              ? 'bg-green-500 text-white cursor-pointer'
              : 'bg-green-500 text-white cursor-pointer hover:bg-red-500'
          )}
          title={editMode ? `เปิดเมนูแก้ไข [${keyChar}]` : `ไฟล์: ${custFile} — คลิกลบ`}
          onPointerDown={editMode ? undefined : (e) => { e.stopPropagation(); onRemove(keyChar); }}
        >
          ✔
        </span>
      )}

      {/* Center content — pad mode แสดงชื่อเด่น, keyboard mode แสดง icon */}
      {padMode ? (
        editMode ? (
          <span style={{ fontSize: Math.round(sizePx * 0.28) }} className="leading-none">📂</span>
        ) : (
          <>
            <span
              style={{ fontSize: keyName ? Math.max(10, Math.round(sizePx * 0.20)) : Math.max(14, Math.round(sizePx * 0.38)) }}
              className={clsx(
                'px-1 text-center font-bold leading-tight break-all line-clamp-2 max-w-full',
                isDown ? 'text-white' : theme === 'dark' ? 'text-gray-100' : 'text-gray-800',
              )}
            >
              {keyName || keyChar}
            </span>
            {hasCustom && <span className="text-[8px] mt-0.5 opacity-50">🎵</span>}
          </>
        )
      ) : (
        <>
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
            )}
          >
            {keyName || (editMode ? '—' : '')}
          </span>
        </>
      )}

      {/* Progress bar — ด้านล่างสุดของปุ่ม เมื่อมีเสียงกำลังเล่น */}
      {progress != null && progress > 0 && progress < 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl overflow-hidden">
          <div
            className={clsx(
              'h-full transition-none',
              keyColor ? '' : 'bg-cyan-400'
            )}
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: keyColor || undefined,
              opacity: 0.85,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ===== KeyboardLayout =====
function KeyboardLayout({
  store, names, pressing, editMode, theme,
  playingKeys, recentlyPlayed, colors, dragOverKey, playingProgress,
  isDesktop, isMobile,
  onPress, onPreview, onRemove, onRename, onModeToggle, onContextMenu, onDragOver, onDrop,
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
    keyColor: colors?.[key] || '',
    isDragTarget: dragOverKey === key,
    progress: playingProgress?.get(key)?.progress ?? null,
    onPress, onPreview, onRemove, onRename, onModeToggle,
    onContextMenu: isDesktop && editMode ? onContextMenu : undefined,
    onDragOver:    !isMobile  ? onDragOver   : undefined,
    onDrop:        !isMobile  ? onDrop       : undefined,
  });

  if (isVert) {
    return (
      <div className="inline-flex flex-row items-start" style={{ gap }}>
        {KB_ROWS.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ paddingTop: ci * stagger, gap }}>
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

// ===== PadLayout — grid ตาราง A-Z ชื่อเด่น ไม่มี stagger =====
const ALL_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function PadLayout({
  store, names, pressing, editMode, theme,
  playingKeys, recentlyPlayed, colors, dragOverKey, playingProgress,
  isDesktop, isMobile,
  onPress, onPreview, onRemove, onRename, onModeToggle, onContextMenu, onDragOver, onDrop,
}) {
  const scale      = store?.keySize ?? 1.0;
  const sizePx     = Math.round(KEY_BASE_PX * scale);
  const gap        = Math.max(4, Math.round(sizePx * 0.10));
  const cols       = isMobile ? 4 : 6;
  const showKbHint = store?.showKbHint ?? true;

  const keyProps = (key) => ({
    keyChar: key, keyName: names[key] || '',
    mode: store?.modes?.[key] || 'poly',
    store, pressing, editMode, theme,
    isPlaying: playingKeys.has(key),
    recentlyPlayed,
    keyColor: colors?.[key] || '',
    isDragTarget: dragOverKey === key,
    padMode: true,
    showKbHint,
    progress: playingProgress?.get(key)?.progress ?? null,
    onPress, onPreview, onRemove, onRename, onModeToggle,
    onContextMenu: isDesktop && editMode ? onContextMenu : undefined,
    onDragOver:    !isMobile  ? onDragOver   : undefined,
    onDrop:        !isMobile  ? onDrop       : undefined,
  });

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}
    >
      {ALL_ALPHA.map(key => <SoundKey key={key} {...keyProps(key)} />)}
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
  const [playingProgress,setPlayingProgress]= useState(new Map());
  const [recentlyPlayed, setRecentlyPlayed] = useState(new Set());
  const [uploadKey,      setUploadKey]      = useState(null);
  // Rename overlay
  const [selectedKey,    setSelectedKey]    = useState(null);
  const [renaming,       setRenaming]       = useState(null);
  const [renameVal,      setRenameVal]      = useState('');
  // Combined upload+rename modal (mobile)
  const [combinedKey,    setCombinedKey]    = useState(null);
  const [combinedName,   setCombinedName]   = useState('');
  const [combinedFile,   setCombinedFile]   = useState(null);
  // Device type
  const [isMobile,       setIsMobile]       = useState(false);
  const [isDesktop,      setIsDesktop]      = useState(false);
  // Drag & drop
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragOverKey,    setDragOverKey]    = useState(null);
  // Right-click context menu (desktop only)
  const [ctxMenu,        setCtxMenu]        = useState(null); // { key, x, y } | null

  const fileInputRef         = useRef(null);
  const importInputRef       = useRef(null);
  const combinedFileInputRef = useRef(null);
  const recentTimers   = useRef({});
  const renameInputRef = useRef(null);
  const swipeTouchX    = useRef(null);
  const swipeTouchY    = useRef(null);

  const email = user?.email || null;

  useEffect(() => { setStore(loadSettings()); }, []);
  useEffect(() => { setNames(loadNames(email, page)); }, [email, page]);

  // Device detection
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setIsDesktop(window.innerWidth >= 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Poll getPlayingKeys + getPlayingProgress ทุก 80 ms
  useEffect(() => {
    const id = setInterval(() => {
      setPlayingKeys(getPlayingKeys());
      setPlayingProgress(getPlayingProgress());
    }, 80);
    return () => clearInterval(id);
  }, []);

  // Window-level drag & drop detection (Desktop/iPad, not Mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let counter = 0;

    const onDragEnter = (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      counter++;
      setIsDragging(true);
    };
    const onDragLeave = () => {
      counter--;
      if (counter <= 0) { counter = 0; setIsDragging(false); setDragOverKey(null); }
    };
    const onDragOver = (e) => { e.preventDefault(); }; // allow drop on page
    const onDrop = (e) => {
      e.preventDefault();
      counter = 0;
      setIsDragging(false);
      setDragOverKey(null);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover',  onDragOver);
    window.addEventListener('drop',      onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover',  onDragOver);
      window.removeEventListener('drop',      onDrop);
    };
  }, []);

  // Close context menu on Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  // ป้องกัน Chrome native context menu ใน edit mode (desktop)
  // ใช้ capture phase เพื่อให้ preventDefault() มีผลก่อน browser จะ render เมนู
  useEffect(() => {
    if (!editMode || !isDesktop) return;
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent, true);
    return () => document.removeEventListener('contextmenu', prevent, true);
  }, [editMode, isDesktop]);

  // effectiveStore: map pageN fields → primary names (รองรับ 4 pages)
  const effectiveStore = store ? (() => {
    if (page === 1) return store;
    const p = page;
    return {
      ...store,
      customs: store[`customs${p}`] || {},
      modes:   store[`modes${p}`]   || {},
      colors:  store[`colors${p}`]  || {},
      volumes: store[`volumes${p}`] || {},
      speeds:  store[`speeds${p}`]  || {},
    };
  })() : null;

  // flashKey — guarantee minimum glow even for very short sounds
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
      if (e.key === 'Escape') {
        e.preventDefault();
        stopAllAudio(STOP_FADE_MS);
        toast('⏹ หยุดเสียงทั้งหมด', { duration: 800 });
        return;
      }
      if (e.key === 'Tab') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
        setPage(p => { const next = p >= 4 ? 1 : p + 1; clearCustomCache(); return next; });
        return;
      }
      // กด 1-4: สลับ Page โดยตรง
      if (['1','2','3','4'].includes(e.key)) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
        const np = parseInt(e.key);
        setPage(p => { if (p !== np) clearCustomCache(); return np; });
        return;
      }
      // กด 5: toggle ON/OFF
      if (e.key === '5') {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        e.preventDefault();
        patch({ enabled: !store.enabled });
        toast(store.enabled ? '🔇 Soundboard ปิด' : '🔊 Soundboard เปิด', { duration: 800 });
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
        playKey(key, effectiveStore, page);
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
    if (editMode) { setSelectedKey(k => k === key ? null : key); return; }
    if (isMobile && navigator.vibrate) navigator.vibrate(22);
    getAudioContext();
    playKey(key, effectiveStore, page);
    flashKey(key);
    setPressing(s => new Set([...s, key]));
    setTimeout(() => setPressing(s => { const ns = new Set(s); ns.delete(key); return ns; }), 130);
  }, [effectiveStore, editMode, page, flashKey]);

  const handleKeyPreview = useCallback((key) => {
    if (!effectiveStore) return;
    getAudioContext();
    playKey(key, effectiveStore, page);
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

  // helper: ชื่อ field ของ page ปัจจุบัน
  const pf = useCallback((base) => page === 1 ? base : `${base}${page}`, [page]);

  // Cycle through 4 modes: poly → stop → toggle → loop → poly
  const handleModeToggle = useCallback((key) => {
    const field = pf('modes');
    const cur   = (store?.[field] || {})[key] || 'poly';
    const next  = cur === 'poly' ? 'stop' : cur === 'stop' ? 'toggle' : cur === 'toggle' ? 'loop' : 'poly';
    patch({ [field]: { ...(store?.[field] || {}), [key]: next } });
    const opt = MODE_OPTS.find(m => m.id === next);
    toast(`[${key}] ${opt?.icon} ${opt?.label}`, { duration: 1000 });
  }, [store, patch, pf]);

  // Set mode directly (for context menu / action sheet 4-button UI)
  const handleModeSet = useCallback((key, mode) => {
    const field = pf('modes');
    patch({ [field]: { ...(store?.[field] || {}), [key]: mode } });
  }, [store, patch, pf]);

  // Per-key color — ใช้ functional update เพื่อหลีกเลี่ยง stale closure
  const handleColorChange = useCallback((key, color) => {
    const field = pf('colors');
    patch((prev) => ({ [field]: { ...(prev?.[field] || {}), [key]: color } }));
  }, [patch, pf]);

  // Per-key volume (multiplier 0.1–2.0)
  const handleVolumeChange = useCallback((key, vol) => {
    const field = pf('volumes');
    patch({ [field]: { ...(store?.[field] || {}), [key]: parseFloat(Number(vol).toFixed(2)) } });
  }, [store, patch, pf]);

  // Per-key speed (0.25–2.0)
  const handleSpeedChange = useCallback((key, spd) => {
    const field = pf('speeds');
    patch({ [field]: { ...(store?.[field] || {}), [key]: parseFloat(Number(spd).toFixed(2)) } });
  }, [store, patch, pf]);

  // Copy key to another page
  const handleCopyKey = useCallback((key, toPage) => {
    const updated = copyKey(key, page, toPage, email);
    setStore(updated);
    toast.success(`[${key}] คัดลอก Page ${page} → Page ${toPage}`);
    setCtxMenu(null);
  }, [page, email]);

  // Drag & drop onto a specific key
  const handleKeyDrop = useCallback(async (key, e) => {
    setDragOverKey(null);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { toast.error('ไฟล์ต้องเป็น audio (.mp3 .ogg .wav)'); return; }
    try {
      const res = await uploadCustom(key, file, page);
      setStore(loadSettings());
      toast.success(`[${key}] 🎵 "${res.name}"`);
    } catch (err) { toast.error(err.message); }
  }, [page]);

  // Right-click context menu (desktop only — gated via prop passed to KeyboardLayout)
  const handleContextMenu = useCallback((key, e) => {
    setCtxMenu({ key, x: e.clientX, y: e.clientY });
  }, []);

  const handleRename = useCallback((key) => {
    setRenaming(key);
    setRenameVal(names[key] || '');
    setSelectedKey(null);
    setTimeout(() => renameInputRef.current?.focus(), 60);
  }, [names]);

  const handleRenameConfirm = useCallback(() => {
    if (!renaming) return;
    const updated = saveName(email, renaming, renameVal, page);
    setNames({ ...updated });
    toast.success(renameVal.trim() ? `[${renaming}] ชื่อ "${renameVal.trim()}"` : `[${renaming}] ลบชื่อแล้ว`);
    setRenaming(null);
  }, [renaming, renameVal, email, page]);

  const handleCombinedSubmit = useCallback(async () => {
    if (!combinedKey) return;
    if (combinedName.trim()) {
      const updated = saveName(email, combinedKey, combinedName.trim(), page);
      setNames({ ...updated });
    }
    if (combinedFile) {
      try {
        const res = await uploadCustom(combinedKey, combinedFile, page);
        setStore(loadSettings());
        toast.success(`[${combinedKey}] อัปโหลด "${res.name}" — Page ${page}`);
      } catch (err) { toast.error(err.message); }
    } else if (combinedName.trim()) {
      toast.success(`[${combinedKey}] ชื่อ "${combinedName.trim()}"`);
    }
    setCombinedKey(null);
    setCombinedFile(null);
    setCombinedName('');
  }, [combinedKey, combinedName, combinedFile, email, page]);

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
    const customsField = page === 1 ? store?.customs : page === 2 ? store?.customs2 : page === 3 ? store?.customs3 : store?.customs4;
    const count   = Object.keys(customsField || {}).length;
    if (!count) { toast('ไม่มีเสียง custom ใน Page ' + page, { duration: 1500 }); return; }
    const ok = window.confirm(
      `⚠️ รีเซ็ต Page ${page} — จะลบไฟล์เสียง custom ทั้งหมด ${count} เสียง\n\n` +
      `หลังรีเซ็ตจะต้องอัปโหลดไฟล์เสียงใหม่ทั้งหมด — กู้คืนไม่ได้!\n\nกด OK เพื่อยืนยัน`
    );
    if (!ok) return;
    const ok2 = window.confirm(
      `🗑️ ยืนยันอีกครั้ง — ลบเสียง custom ${count} เสียงใน Page ${page} ถาวร?\n\nกด OK เพื่อลบ`
    );
    if (!ok2) return;
    removeAllCustom(page);
    setStore(loadSettings());
    toast.success(`รีเซ็ต Page ${page} แล้ว (ลบ ${count} เสียง)`);
  }, [store, page]);

  const handleExport = useCallback(() => {
    try {
      const data = exportSettings(email);
      const json = JSON.stringify(data, null, 2);
      const filename = `soundboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
      const a   = document.createElement('a');
      a.href     = uri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Export เรียบร้อย (${(json.length / 1024).toFixed(1)} KB)`);
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
  const isPadMode   = store.layout === 'pad';
  const customCount = Object.keys(
    (page === 1 ? store.customs : page === 2 ? store.customs2 : page === 3 ? store.customs3 : store.customs4) || {}
  ).length;

  const LAYOUT_CYCLE = { h: 'v', v: 'pad', pad: 'h' };
  const LAYOUT_LABEL = { h: '↔ แนวนอน', v: '↕ แนวตั้ง', pad: '⊞ Pad' };
  const curLayout    = store.layout || 'h';

  // Helper for mode button color in action sheet / context menu
  const modeActiveClass = (id) => {
    if (id === 'stop')   return 'bg-orange-500 border-orange-400 text-white';
    if (id === 'toggle') return 'bg-purple-500 border-purple-400 text-white';
    if (id === 'loop')   return 'bg-cyan-500 border-cyan-400 text-white';
    return 'bg-brand-500 border-brand-400 text-white';
  };
  const modeInactiveClass = isDark
    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100';

  // Color swatch renderer (shared between action sheet + context menu)
  // ใช้ onPointerDown แทน onClick เพื่อ fire ทันทีก่อน re-render จะ unmount element
  const ColorSwatch = ({ targetKey, size = 22 }) => (
    <div className="flex flex-wrap gap-1.5">
      {KEY_COLORS.map((c, i) => {
        const isActive = (effectiveStore?.colors?.[targetKey] ?? '') === c;
        return (
          <button
            key={i}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleColorChange(targetKey, c);
              toast(c ? `[${targetKey}] 🎨 สีเปลี่ยนแล้ว` : `[${targetKey}] 🎨 ล้างสีแล้ว`, { duration: 700 });
            }}
            style={{
              width: size, height: size, borderRadius: '50%', flexShrink: 0,
              background: c || (isDark ? '#374151' : '#e5e7eb'),
              outline: isActive ? `2px solid ${isDark ? '#e5e7eb' : '#374151'}` : 'none',
              outlineOffset: 2,
              border: `1.5px solid ${c ? c + '80' : isDark ? '#4b5563' : '#d1d5db'}`,
              cursor: 'pointer', touchAction: 'none',
            }}
            title={c || 'ค่าเริ่มต้น'}
          />
        );
      })}
    </div>
  );

  // Mode buttons (shared) — ใช้ onPointerDown เพื่อ fire ก่อน re-render
  const ModeBtns = ({ targetKey, compact = false }) => {
    const cur = effectiveStore?.modes?.[targetKey] || 'poly';
    return (
      <div className={clsx('grid gap-1', compact ? 'grid-cols-4' : 'grid-cols-4')}>
        {MODE_OPTS.map(opt => (
          <button
            key={opt.id}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleModeSet(targetKey, opt.id);
              toast(`${opt.icon} ${opt.label}`, { duration: 700 });
            }}
            title={opt.label}
            className={clsx(
              'flex flex-col items-center py-1.5 rounded-lg transition border',
              compact ? 'text-[10px]' : 'text-xs',
              cur === opt.id ? modeActiveClass(opt.id) : modeInactiveClass
            )}
          >
            <span>{opt.icon}</span>
            {!compact && <span className="text-[9px] mt-0.5">{opt.label}</span>}
          </button>
        ))}
      </div>
    );
  };

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

            {/* Stop All + active sounds counter */}
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
              {playingKeys.size > 0 && (
                <span className={clsx(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse',
                  isDark ? 'bg-red-500/30 text-red-300' : 'bg-red-200 text-red-600'
                )}>
                  {playingKeys.size}
                </span>
              )}
            </button>

            {/* Layout — cycle h → v → pad → h */}
            <button
              onClick={() => patch({ layout: LAYOUT_CYCLE[curLayout] || 'v' })}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all',
                isPadMode
                  ? isDark ? 'bg-brand-900/40 text-brand-300 border border-brand-800/50 hover:bg-brand-900/60' : 'bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100'
                  : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
              title="สลับ Layout (แนวนอน / แนวตั้ง / Pad)"
            >
              {LAYOUT_LABEL[curLayout] || '↔ แนวนอน'}
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
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 2, 3, 4].map(p => (
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
                  const f = p === 1 ? store.customs : p === 2 ? store.customs2 : p === 3 ? store.customs3 : store.customs4;
                  const cnt = Object.keys(f || {}).length;
                  return cnt > 0 ? <span className={clsx('text-[10px] px-1 rounded-full', isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-500')}>{cnt}</span> : null;
                })()}
              </button>
            ))}
            <span className={clsx('text-xs ml-1', isDark ? 'text-gray-600' : 'text-gray-400')}>
              Tab / 1–4 = สลับ Page {isMobile ? '| ปัดซ้าย/ขวา' : ''}
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
                <p className="font-semibold text-sm">โหมดแก้ไข — Page {page} ({LAYOUT_LABEL[curLayout]})</p>
                <p><b>กดที่ปุ่ม</b> = เปิดเมนูแก้ไขรวม (อัปโหลด / ตั้งชื่อ / สี / ความเร็ว / โหมด / คัดลอก)</p>
                {!isPadMode && <p><b>กดค้าง</b> ที่ปุ่ม = ฟัง preview เสียง</p>}
                {isDesktop && <p>🖱️ <b>Right-click</b> ปุ่ม = เมนูด่วน (สี, ระดับเสียง, โหมด, คัดลอก)</p>}
                {!isMobile && <p>🎵 <b>ลากไฟล์</b>จาก File Explorer มาวางบนปุ่มได้โดยตรง</p>}
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
                <span className="text-sm font-medium">🔊 ระดับเสียงรวม</span>
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
            {/* showKbHint — เฉพาะ Pad mode */}
            {isPadMode && (
              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="text-sm font-medium">⌨️ แสดง Key บนปุ่ม Pad</span>
                <button
                  onClick={() => patch({ showKbHint: !(store.showKbHint ?? true) })}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all border',
                    (store.showKbHint ?? true)
                      ? isDark ? 'bg-brand-600/30 border-brand-500/50 text-brand-300' : 'bg-brand-50 border-brand-200 text-brand-700'
                      : isDark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'
                  )}
                >
                  {(store.showKbHint ?? true) ? '👁 แสดง' : '🙈 ซ่อน'}
                </button>
              </div>
            )}
          </div>

          {/* ===== Keyboard / Pad ===== */}
          <div
            className={clsx(
              'rounded-2xl p-4',
              isPadMode ? '' : 'overflow-auto',
              isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
            )}
            onTouchStart={isMobile ? (e) => {
              swipeTouchX.current = e.touches[0].clientX;
              swipeTouchY.current = e.touches[0].clientY;
            } : undefined}
            onTouchEnd={isMobile ? (e) => {
              if (swipeTouchX.current === null) return;
              if (renaming || selectedKey || ctxMenu || combinedKey) { swipeTouchX.current = null; return; }
              const dx = e.changedTouches[0].clientX - swipeTouchX.current;
              const dy = e.changedTouches[0].clientY - swipeTouchY.current;
              if (Math.abs(dx) > 72 && Math.abs(dy) < Math.abs(dx) * 0.65) {
                if (dx < 0 && page < 4) { clearCustomCache(); setPage(p => p + 1); }
                else if (dx > 0 && page > 1) { clearCustomCache(); setPage(p => p - 1); }
              }
              swipeTouchX.current = null;
              swipeTouchY.current = null;
            } : undefined}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                  isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}>
                  📄 Page {page}
                </span>
                {isPadMode && isMobile && (
                  <span className={clsx('text-[10px]', isDark ? 'text-gray-600' : 'text-gray-400')}>
                    ← ปัดซ้าย/ขวา สลับ Page →
                  </span>
                )}
              </div>
              {(page === 1 || page === 2) && (
                <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>
                  Page {page} มีเสียง default ครบ — อัปโหลดทับได้
                </span>
              )}
              {(page === 3 || page === 4) && (
                <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>
                  Page {page} — อัปโหลดเสียงได้ (ไม่มี default)
                </span>
              )}
            </div>

            {isPadMode ? (
              <PadLayout
                store={effectiveStore}
                names={names}
                pressing={pressing}
                editMode={editMode}
                theme={theme}
                playingKeys={playingKeys}
                recentlyPlayed={recentlyPlayed}
                colors={effectiveStore?.colors || {}}
                dragOverKey={dragOverKey}
                playingProgress={playingProgress}
                isDesktop={isDesktop}
                isMobile={isMobile}
                onPress={handleKeyPress}
                onPreview={handleKeyPreview}
                onRemove={handleRemove}
                onRename={handleRename}
                onModeToggle={handleModeToggle}
                onContextMenu={handleContextMenu}
                onDragOver={setDragOverKey}
                onDrop={handleKeyDrop}
              />
            ) : (
              <KeyboardLayout
                store={effectiveStore}
                names={names}
                pressing={pressing}
                editMode={editMode}
                theme={theme}
                playingKeys={playingKeys}
                recentlyPlayed={recentlyPlayed}
                colors={effectiveStore?.colors || {}}
                dragOverKey={dragOverKey}
                playingProgress={playingProgress}
                isDesktop={isDesktop}
                isMobile={isMobile}
                onPress={handleKeyPress}
                onPreview={handleKeyPreview}
                onRemove={handleRemove}
                onRename={handleRename}
                onModeToggle={handleModeToggle}
                onContextMenu={handleContextMenu}
                onDragOver={setDragOverKey}
                onDrop={handleKeyDrop}
              />
            )}
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
                {isPadMode
                  ? <p><b>แตะหรือคลิกปุ่ม</b>บนหน้าจอได้โดยตรง ปุ่มจะ<b>เรืองแสง</b>ขณะเสียงกำลังเล่น{isMobile ? ' | ปัดซ้าย/ขวา = สลับ Page' : ''}</p>
                  : <p>กดปุ่มตัวอักษรบน<b>คีย์บอร์ด</b> (Q–P / A–L / Z–M) หรือ<b>แตะปุ่มบนหน้าจอ</b> กดหลายปุ่มพร้อมกันได้ ปุ่มจะ<b>เรืองแสง</b>ขณะเสียงกำลังเล่น</p>
                }
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⏹ หยุดเสียง</p>
                <p>กด <b>Escape</b> หรือปุ่ม "หยุดทั้งหมด" เพื่อตัดทุกเสียงที่กำลังเล่นทันที ตัวเลขสีแดงบนปุ่มแสดงจำนวนเสียงที่กำลังเล่น</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🔁 โหมดกดซ้ำ 4 แบบ</p>
                <p><b>∞ เล่นซ้อน</b> — กดซ้ำ = เสียงซ้อนกัน | <b>⏹ หยุด-เล่นใหม่</b> — กดซ้ำ = restart ทันที | <b>⏯ กดซ้ำ=หยุด</b> — toggle on/off | <b>🔁 เล่นวน</b> — loop ไม่จบ กดซ้ำ = หยุด</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🎨 สี + 🔊 ระดับเสียงแต่ละปุ่ม</p>
                <p>ตั้งสีและระดับเสียงเฉพาะปุ่มได้ผ่าน <b>Action Sheet</b> (โหมดแก้ไข &gt; กดปุ่ม){isDesktop ? ' หรือ Right-click ปุ่ม' : ''}</p>
              </div>
              {!isMobile && (
                <div>
                  <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🎵 Drag & Drop</p>
                  <p>ลากไฟล์ .mp3 / .ogg / .wav (≤ 5 MB) จาก File Explorer มาวางบนปุ่มใดก็ได้โดยตรง — ไม่ต้องเข้าโหมดแก้ไข</p>
                </div>
              )}
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⊞ Layout 3 แบบ</p>
                <p><b>↔ แนวนอน</b> — QWERTY keyboard | <b>↕ แนวตั้ง</b> — QWERTY ตั้ง | <b>⊞ Pad</b> — ตารางสี่เหลี่ยม A–Z ชื่อเด่น เหมาะกับแตะหรือคลิก คลิกปุ่ม Layout เพื่อสลับ</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>📄 4 Pages (Tab / กด 1–4 = สลับ{isMobile ? ' | ปัดซ้าย/ขวา' : ''})</p>
                <p>Page 1–2 มีเสียง default พร้อมใช้ — Page 3–4 สำหรับอัปโหลดเองได้ครบ อัปโหลดทับปุ่มไหนก็ได้ทุก Page</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>🎚 ความเร็วเสียงแต่ละปุ่ม</p>
                <p>ปรับความเร็วเล่น 0.25×–2.0× ได้ผ่าน Action Sheet (แก้ไข &gt; กดปุ่ม){isDesktop ? ' หรือ Right-click' : ''}</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>📋 คัดลอกปุ่มระหว่าง Page</p>
                <p>คัดลอก settings + ชื่อ + เสียงของปุ่มไปยัง Page อื่นได้ผ่าน Action Sheet หรือ Right-click</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⌨️ Hotkeys</p>
                <p><b>Escape</b> = หยุดทั้งหมด | <b>Tab</b> = สลับ Page | <b>1–4</b> = ไป Page โดยตรง | <b>5</b> = เปิด/ปิด Soundboard</p>
              </div>
              <div>
                <p className={clsx('font-semibold mb-1', isDark ? 'text-gray-300' : 'text-gray-600')}>⬇⬆ Export / Import</p>
                <p>บันทึกการตั้งค่าทั้งหมด (โหมด, ชื่อ, สี, ระดับเสียง, เสียง custom, ทุก Page) เป็นไฟล์ .json</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <input ref={fileInputRef}         type="file" accept="audio/*"            className="hidden" onChange={handleFileChange} />
      <input ref={combinedFileInputRef} type="file" accept="audio/*"            className="hidden" onChange={e => { setCombinedFile(e.target.files?.[0] || null); e.target.value = ''; }} />
      <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      {/* ===== Drag & Drop Banner (เล็กๆ ลอยบนสุด ไม่บังปุ่ม) ===== */}
      {isDragging && !isMobile && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-full border border-dashed shadow-lg text-sm font-medium',
            isDark ? 'bg-gray-900/90 border-cyan-400 text-cyan-300' : 'bg-white/90 border-brand-400 text-brand-600'
          )}>
            <span>🎵</span>
            <span>วางไฟล์บนปุ่มใดก็ได้</span>
            <span className="opacity-60 text-xs">(.mp3 / .ogg / .wav ≤ 5 MB)</span>
          </div>
        </div>
      )}

      {/* ===== Action Sheet (Edit Mode) ===== */}
      {editMode && selectedKey && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedKey(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={clsx(
              'w-full max-w-sm mx-auto mb-4 rounded-2xl shadow-2xl border p-4 space-y-3',
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className={clsx('font-bold text-base', isDark ? 'text-white' : 'text-gray-900')}>
                ปุ่ม [{selectedKey}]
                {names[selectedKey] && <span className={clsx('ml-2 font-normal text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>"{names[selectedKey]}"</span>}
                {effectiveStore?.customs?.[selectedKey]?.name && (
                  <span className={clsx('ml-2 text-xs', isDark ? 'text-green-400' : 'text-green-600')}>🎵 {effectiveStore.customs[selectedKey].name}</span>
                )}
              </span>
              <button onClick={() => setSelectedKey(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Upload + Rename / Preview */}
            <div className="grid grid-cols-2 gap-2">
              {isMobile ? (
                <button
                  onClick={() => { setCombinedKey(selectedKey); setCombinedName(names[selectedKey] || ''); setCombinedFile(null); setSelectedKey(null); }}
                  className={clsx(
                    'col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition',
                    isDark ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300 hover:bg-brand-600/30' : 'bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100'
                  )}
                >
                  <span className="text-xl">📂✏️</span>
                  <span>ตั้งชื่อ & อัปโหลดเสียง</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setUploadKey(selectedKey); setSelectedKey(null); fileInputRef.current?.click(); }}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition',
                      isDark ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300 hover:bg-brand-600/30' : 'bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100'
                    )}
                  >
                    <span className="text-2xl">📂</span>
                    <span>อัปโหลดเสียง</span>
                    <span className={clsx('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>mp3 / ogg / wav ≤ 5MB</span>
                  </button>
                  <button
                    onClick={() => handleRename(selectedKey)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition',
                      isDark ? 'bg-yellow-600/15 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-600/25' : 'bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                    )}
                  >
                    <span className="text-2xl">✏️</span>
                    <span>ตั้งชื่อปุ่ม</span>
                    <span className={clsx('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>ชื่อที่แสดงบนปุ่ม</span>
                  </button>
                </>
              )}
              <button
                onClick={() => { handleKeyPreview(selectedKey); setSelectedKey(null); }}
                className={clsx(
                  'flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition',
                  isDark ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                )}
              >
                🔊 ฟัง Preview
              </button>
              <button
                onClick={() => setSelectedKey(null)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition',
                  isDark ? 'bg-gray-800 border border-gray-700 text-gray-500 hover:bg-gray-700' : 'bg-gray-100 border border-gray-200 text-gray-400 hover:bg-gray-200'
                )}
              >
                ✕ ปิด
              </button>
            </div>

            {/* Mode — 4 buttons */}
            <div className="space-y-1.5">
              <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-500' : 'text-gray-400')}>โหมด</span>
              <ModeBtns targetKey={selectedKey} />
            </div>

            {/* Color swatches */}
            <div className="space-y-1.5">
              <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-500' : 'text-gray-400')}>สีปุ่ม</span>
              <ColorSwatch targetKey={selectedKey} size={24} />
            </div>

            {/* Per-key Volume */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-500' : 'text-gray-400')}>ระดับเสียงเฉพาะปุ่ม</span>
                <span className={clsx('text-xs font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {Math.round((effectiveStore?.volumes?.[selectedKey] ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.1" max="2" step="0.05"
                value={effectiveStore?.volumes?.[selectedKey] ?? 1.0}
                onChange={e => handleVolumeChange(selectedKey, parseFloat(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            {/* Per-key Speed */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-500' : 'text-gray-400')}>ความเร็วเสียง</span>
                <span className={clsx('text-xs font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {(effectiveStore?.speeds?.[selectedKey] ?? 1.0).toFixed(2)}×
                </span>
              </div>
              <input
                type="range" min="0.25" max="2" step="0.05"
                value={effectiveStore?.speeds?.[selectedKey] ?? 1.0}
                onChange={e => handleSpeedChange(selectedKey, parseFloat(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            {/* Copy to Page */}
            <div className="space-y-1.5">
              <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-500' : 'text-gray-400')}>คัดลอกไป</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4].filter(p => p !== page).map(p => (
                  <button
                    key={p}
                    onClick={() => handleCopyKey(selectedKey, p)}
                    className={clsx(
                      'flex-1 py-2 rounded-xl text-xs font-semibold transition border',
                      isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    📋 Page {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Remove custom */}
            {effectiveStore?.customs?.[selectedKey]?.b64 && (
              <button
                onClick={() => { handleRemove(selectedKey); setSelectedKey(null); }}
                className={clsx(
                  'w-full py-2.5 rounded-xl text-sm font-semibold transition',
                  isDark ? 'bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                )}
              >
                🗑️ ลบเสียง Custom
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== Right-click Context Menu (Desktop) ===== */}
      {ctxMenu && (
        <>
        {/* Backdrop — mousedown นอกเมนูปิด */}
        <div className="fixed inset-0" style={{ zIndex: 49 }} onMouseDown={() => setCtxMenu(null)} />
        <div
          className="fixed z-50"
          style={{
            left: Math.min(ctxMenu.x, (typeof window !== 'undefined' ? window.innerWidth  : 1200) - 250),
            top:  Math.min(ctxMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800)  - 420),
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className={clsx(
            'w-56 rounded-xl shadow-2xl border p-3 space-y-2.5',
            isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          )}>
            {/* Header */}
            <div className={clsx('flex items-center gap-2 pb-1.5 border-b', isDark ? 'border-gray-800' : 'border-gray-100')}>
              <span className={clsx('font-bold text-sm', isDark ? 'text-gray-100' : 'text-gray-800')}>
                [{ctxMenu.key}]
              </span>
              {names[ctxMenu.key] && (
                <span className={clsx('text-xs truncate flex-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {names[ctxMenu.key]}
                </span>
              )}
              {effectiveStore?.customs?.[ctxMenu.key]?.name && (
                <span className="text-xs text-green-500">🎵</span>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-0.5">
              {[
                { icon: '📂', label: 'อัปโหลด', action: () => { setUploadKey(ctxMenu.key); setCtxMenu(null); fileInputRef.current?.click(); } },
                { icon: '✏️', label: 'ตั้งชื่อ', action: () => { handleRename(ctxMenu.key); setCtxMenu(null); } },
                { icon: '🔊', label: 'Preview',  action: () => { handleKeyPreview(ctxMenu.key); setCtxMenu(null); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition text-left',
                    isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  )}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              {effectiveStore?.customs?.[ctxMenu.key]?.b64 && (
                <button
                  onClick={() => { handleRemove(ctxMenu.key); setCtxMenu(null); }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition text-left',
                    isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'
                  )}
                >
                  🗑️ ลบเสียง
                </button>
              )}
            </div>

            {/* Mode */}
            <div className="space-y-1.5">
              <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', isDark ? 'text-gray-500' : 'text-gray-400')}>โหมด</span>
              <div className="grid grid-cols-4 gap-1">
                {MODE_OPTS.map(opt => {
                  const isActive = (effectiveStore?.modes?.[ctxMenu.key] || 'poly') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleModeSet(ctxMenu.key, opt.id);
                        toast(`[${ctxMenu.key}] ${opt.icon} ${opt.label}`, { duration: 900 });
                      }}
                      title={opt.label}
                      className={clsx(
                        'flex flex-col items-center py-1.5 rounded-lg text-xs transition border',
                        isActive ? modeActiveClass(opt.id) : modeInactiveClass
                      )}
                    >
                      {opt.icon}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', isDark ? 'text-gray-500' : 'text-gray-400')}>สีปุ่ม</span>
              <ColorSwatch targetKey={ctxMenu.key} size={20} />
            </div>

            {/* Per-key Volume */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', isDark ? 'text-gray-500' : 'text-gray-400')}>ระดับเสียงปุ่มนี้</span>
                <span className={clsx('text-[10px] font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {Math.round((effectiveStore?.volumes?.[ctxMenu.key] ?? 1.0) * 100)}%
                </span>
              </div>
              <input
                type="range" min="0.1" max="2" step="0.05"
                value={effectiveStore?.volumes?.[ctxMenu.key] ?? 1.0}
                onChange={e => handleVolumeChange(ctxMenu.key, parseFloat(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Per-key Speed */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', isDark ? 'text-gray-500' : 'text-gray-400')}>ความเร็วเสียง</span>
                <span className={clsx('text-[10px] font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {(effectiveStore?.speeds?.[ctxMenu.key] ?? 1.0).toFixed(2)}×
                </span>
              </div>
              <input
                type="range" min="0.25" max="2" step="0.05"
                value={effectiveStore?.speeds?.[ctxMenu.key] ?? 1.0}
                onChange={e => handleSpeedChange(ctxMenu.key, parseFloat(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
                onClick={e => e.stopPropagation()}
              />
            </div>

            {/* Copy to Page */}
            <div className="space-y-1.5">
              <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', isDark ? 'text-gray-500' : 'text-gray-400')}>คัดลอกไป</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].filter(p => p !== page).map(p => (
                  <button
                    key={p}
                    onClick={() => handleCopyKey(ctxMenu.key, p)}
                    className={clsx(
                      'flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition border',
                      isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    Page {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* ===== Rename Overlay ===== */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4" onClick={() => setRenaming(null)}>
          <div
            className={clsx(
              'w-full max-w-sm mb-6 rounded-2xl shadow-2xl border p-4 space-y-3',
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className={clsx('font-semibold', isDark ? 'text-gray-100' : 'text-gray-800')}>
                ✏️ ตั้งชื่อปุ่ม [{renaming}] — Page {page}
              </span>
              <button onClick={() => setRenaming(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(null); }}
              placeholder="ชื่อปุ่ม (เว้นว่างเพื่อลบชื่อ)"
              maxLength={40}
              className={clsx(
                'w-full px-4 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-brand-400 transition',
                isDark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              )}
            />
            <div className="flex gap-2">
              <button onClick={handleRenameConfirm} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition">
                บันทึก
              </button>
              <button
                onClick={() => setRenaming(null)}
                className={clsx('px-5 py-2.5 rounded-xl font-semibold text-sm transition', isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Combined Upload + Rename Modal (Mobile) ===== */}
      {combinedKey && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4" onClick={() => { setCombinedKey(null); setCombinedFile(null); }}>
          <div
            className={clsx(
              'w-full max-w-sm mb-6 rounded-2xl shadow-2xl border p-4 space-y-3',
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            )}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className={clsx('font-semibold', isDark ? 'text-gray-100' : 'text-gray-800')}>
                📂✏️ ปุ่ม [{combinedKey}] — Page {page}
              </span>
              <button onClick={() => { setCombinedKey(null); setCombinedFile(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="space-y-1">
              <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-400' : 'text-gray-500')}>ชื่อปุ่ม</span>
              <input
                type="text"
                value={combinedName}
                onChange={e => setCombinedName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCombinedSubmit(); if (e.key === 'Escape') { setCombinedKey(null); setCombinedFile(null); } }}
                placeholder="ชื่อที่แสดงบนปุ่ม (เว้นว่างเพื่อลบชื่อ)"
                maxLength={40}
                className={clsx(
                  'w-full px-4 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-brand-400 transition',
                  isDark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                )}
              />
            </div>
            <div className="space-y-1">
              <span className={clsx('text-xs font-semibold', isDark ? 'text-gray-400' : 'text-gray-500')}>ไฟล์เสียง (ไม่บังคับ)</span>
              <button
                onClick={() => combinedFileInputRef.current?.click()}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition border',
                  combinedFile
                    ? isDark ? 'bg-green-900/30 border-green-700/50 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
                    : isDark ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                )}
              >
                <span className="text-lg">{combinedFile ? '🎵' : '📂'}</span>
                <span className="truncate">{combinedFile ? combinedFile.name : 'เลือกไฟล์ mp3 / ogg / wav ≤ 5MB'}</span>
                {combinedFile && (
                  <button
                    onClick={e => { e.stopPropagation(); setCombinedFile(null); }}
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >✕</button>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCombinedSubmit} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition">
                บันทึก
              </button>
              <button
                onClick={() => { setCombinedKey(null); setCombinedFile(null); }}
                className={clsx('px-5 py-2.5 rounded-xl font-semibold text-sm transition', isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
