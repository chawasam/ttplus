// soundboard.js — หน้า Soundboard
// iPad/Mobile friendly — QWERTY layout, keyboard binding, polyphony, custom upload
import { useEffect, useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import {
  loadSettings, saveSettings, playKey, uploadCustom, removeCustom, getAudioContext,
} from '../lib/soundboardStore';
import { SOUND_DEFS, KB_ROWS } from '../lib/soundSynth';

// ===== คงที่ =====
const KEY_BASE_PX  = 68;   // ขนาดปุ่มฐาน (px) ที่ scale=1
const KEY_MIN_SCALE = 0.55;
const KEY_MAX_SCALE = 1.45;

// ===== Login Gate =====
function LoginGate({ theme }) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center h-screen gap-4',
      theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
    )}>
      <span className="text-5xl">🎹</span>
      <p className="text-lg font-semibold">กรุณาเข้าสู่ระบบก่อนใช้งาน Soundboard</p>
      <p className={clsx('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
        ไปที่ Dashboard เพื่อ Sign in ด้วย Google
      </p>
    </div>
  );
}

// ===== SoundKey =====
function SoundKey({ keyChar, store, pressing, editMode, theme, onPress, onUpload, onRemove }) {
  const def     = SOUND_DEFS[keyChar] || { emoji: '?', name: '?' };
  const isDown  = pressing.has(keyChar);
  const hasCustom = !!store?.customs?.[keyChar]?.b64;
  const scale   = store?.keySize ?? 1.0;
  const sizePx  = Math.round(KEY_BASE_PX * scale);

  return (
    <div
      style={{ width: sizePx, height: sizePx, fontSize: Math.round(sizePx * 0.34) }}
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-xl select-none cursor-pointer',
        'transition-all duration-75 active:scale-90',
        'border font-medium',
        isDown
          ? 'bg-brand-500 border-brand-400 shadow-lg shadow-brand-500/30 scale-90'
          : theme === 'dark'
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
        editMode && 'ring-2 ring-yellow-400/60'
      )}
      onPointerDown={(e) => { e.preventDefault(); onPress(keyChar); }}
      title={editMode
        ? `[${keyChar}] คลิกเพื่ออัปโหลดเสียงสำหรับปุ่มนี้`
        : `[${keyChar}] ${def.emoji} ${def.name}`}
    >
      {/* Key letter — มุมซ้ายบน */}
      <span className={clsx(
        'absolute top-1 left-1.5 text-[10px] font-bold leading-none',
        isDown
          ? 'text-white/70'
          : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      )}>
        {keyChar}
      </span>

      {/* Custom badge */}
      {hasCustom && (
        <span
          className="absolute top-1 right-1 text-[8px] bg-green-500 text-white rounded px-0.5 leading-none cursor-pointer"
          title="คลิกขวาเพื่อเอาออก"
          onPointerDown={(e) => {
            if (!editMode) return;
            e.stopPropagation();
            onRemove(keyChar);
          }}
        >
          ✔
        </span>
      )}

      {/* Emoji */}
      <span style={{ fontSize: Math.round(sizePx * 0.34) }} className="leading-none">
        {editMode ? '📂' : def.emoji}
      </span>

      {/* Thai name */}
      <span
        style={{ fontSize: Math.max(8, Math.round(sizePx * 0.14)) }}
        className={clsx(
          'mt-0.5 px-0.5 truncate max-w-full leading-none',
          isDown
            ? 'text-white/80'
            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        )}
      >
        {hasCustom && !editMode
          ? (store.customs[keyChar].name || def.name).slice(0, 8)
          : def.name}
      </span>
    </div>
  );
}

// ===== Main =====
export default function SoundboardPage({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
  const [store,    setStore]    = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pressing, setPressing] = useState(new Set());
  const [uploadKey, setUploadKey] = useState(null);
  const fileInputRef = useRef(null);

  // โหลด settings จาก localStorage
  useEffect(() => {
    setStore(loadSettings());
  }, []);

  // Keyboard listener
  useEffect(() => {
    if (!store) return;

    const onDown = (e) => {
      if (e.repeat) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const key = e.key.toUpperCase();
      if (!SOUND_DEFS[key]) return;
      e.preventDefault();

      // iOS AudioContext unlock
      getAudioContext();

      setPressing(s => new Set([...s, key]));
      if (!editMode) playKey(key, store);
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
  }, [store, editMode]);

  // ปรับ setting แล้ว sync state + localStorage
  const patch = useCallback((update) => {
    setStore(prev => {
      const next = saveSettings(typeof update === 'function' ? update(prev) : update);
      return { ...prev, ...next };
    });
  }, []);

  // กดปุ่มบน UI
  const handleKeyPress = useCallback((key) => {
    if (!store) return;
    if (editMode) {
      setUploadKey(key);
      fileInputRef.current?.click();
      return;
    }
    getAudioContext();
    playKey(key, store);
    setPressing(s => new Set([...s, key]));
    setTimeout(() => setPressing(s => { const ns = new Set(s); ns.delete(key); return ns; }), 130);
  }, [store, editMode]);

  // อัปโหลดไฟล์
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadKey) return;
    try {
      const res = await uploadCustom(uploadKey, file);
      setStore(loadSettings());
      toast.success(`[${uploadKey}] อัปโหลด "${res.name}" สำเร็จ`);
    } catch (err) {
      toast.error(err.message);
    }
    setUploadKey(null);
  }, [uploadKey]);

  // ลบ custom sound
  const handleRemove = useCallback((key) => {
    removeCustom(key);
    setStore(loadSettings());
    toast.success(`[${key}] ลบเสียงสำหรับปุ่มนี้แล้ว`);
  }, []);

  // ===== Auth loading =====
  if (authLoading) {
    return (
      <div className={clsx('flex h-screen items-center justify-center', theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50')}>
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginGate theme={theme} />;
  if (!store) return null;

  const isDark   = theme === 'dark';
  const scale    = store.keySize ?? 1.0;
  const rowOffsets = [0, KEY_BASE_PX * scale * 0.35, KEY_BASE_PX * scale * 0.65];
  const gap      = Math.round(KEY_BASE_PX * scale * 0.12);

  return (
    <div className={clsx('flex h-screen overflow-hidden', isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900')}>
      {/* Sidebar */}
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />

      {/* Content */}
      <main className="flex-1 ml-16 md:ml-56 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ===== Header ===== */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              🎹 Soundboard
            </h1>

            {/* Master ON/OFF */}
            <button
              onClick={() => patch({ enabled: !store.enabled })}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                store.enabled
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              )}
            >
              <span className={clsx(
                'w-2.5 h-2.5 rounded-full',
                store.enabled ? 'bg-green-300 animate-pulse' : 'bg-gray-500'
              )} />
              {store.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </button>

            {/* Edit Mode toggle */}
            <button
              onClick={() => setEditMode(m => !m)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                editMode
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              )}
            >
              ✏️ {editMode ? 'โหมดอัปโหลด (คลิกเพื่อออก)' : 'อัปโหลดเสียง'}
            </button>
          </div>

          {/* Edit mode hint */}
          {editMode && (
            <div className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm border',
              isDark ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            )}>
              📂 คลิกปุ่มใดก็ได้เพื่ออัปโหลดเสียงแทน (.mp3 / .ogg / .wav, ≤ 2 MB) — ปุ่มที่มีเสียง custom จะแสดง ✔ คลิกที่ ✔ เพื่อลบ
            </div>
          )}

          {/* ===== Controls ===== */}
          <div className={clsx(
            'rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-5',
            isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
          )}>
            {/* Volume */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">🔊 ระดับเสียง SFX</span>
                <span className={clsx('text-sm font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {Math.round(store.volume * 100)}%
                </span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={store.volume}
                onChange={e => patch({ volume: parseFloat(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>

            {/* Key size */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">⌨️ ขนาดปุ่ม</span>
                <span className={clsx('text-sm font-mono', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <input
                type="range" min={KEY_MIN_SCALE} max={KEY_MAX_SCALE} step="0.05"
                value={scale}
                onChange={e => patch({ keySize: parseFloat(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
          </div>

          {/* ===== Keyboard ===== */}
          <div className={clsx(
            'rounded-2xl p-4 overflow-x-auto',
            isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
          )}>
            <div className="inline-flex flex-col items-start" style={{ gap }}>
              {KB_ROWS.map((row, ri) => (
                <div
                  key={ri}
                  className="flex flex-row flex-nowrap"
                  style={{ paddingLeft: rowOffsets[ri], gap }}
                >
                  {row.map(key => (
                    <SoundKey
                      key={key}
                      keyChar={key}
                      store={store}
                      pressing={pressing}
                      editMode={editMode}
                      theme={theme}
                      onPress={handleKeyPress}
                      onUpload={handleFileChange}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ===== Legend ===== */}
          <div className={clsx(
            'rounded-2xl p-4 text-xs space-y-2',
            isDark ? 'bg-gray-900 border border-gray-800 text-gray-400' : 'bg-gray-50 border border-gray-200 text-gray-500'
          )}>
            <p className="font-semibold text-sm mb-1">วิธีใช้</p>
            <p>• กดปุ่มคีย์บอร์ด (Q W E …) เพื่อเล่นเสียง — กดหลายปุ่มพร้อมกันได้ (Polyphony)</p>
            <p>• แตะปุ่มบนหน้าจอได้เช่นกัน เหมาะสำหรับ iPad / มือถือ</p>
            <p>• เสียงไม่หยุดเพลงพื้นหลัง (Spotify / YouTube) — ทำงานแยกกัน</p>
            <p>• กด "อัปโหลดเสียง" แล้วคลิกปุ่มใดก็ได้เพื่อใส่เสียง .mp3 ของคุณเอง (≤ 2 MB)</p>
            <p>• ข้อมูลทั้งหมดเก็บในเครื่องของคุณ ไม่ส่งขึ้น server</p>
          </div>

        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
