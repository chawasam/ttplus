// components/AshenveilSettings.js
// Floating accessibility/display settings panel — ใช้ได้ทุกหน้า Ashenveil
// เรียกใช้: hook + panel component

import { useState, useCallback, useMemo, useEffect } from 'react';

// ─── Color Themes ─────────────────────────────────────────────────────────────
// ใช้ CSS filter hue-rotate บน container — ไม่ต้องแก้ Tailwind class ใดเลย
// background #0a0a0a (black) ไม่ได้รับผลจาก hue-rotate เพราะไม่มี chroma
export const THEMES = {
  amber: {
    label: 'Ember',
    emoji: '🟡',
    desc:  'สีทองอำพัน (ดั้งเดิม)',
    filter: '',
    dot:   '#f59e0b',
  },
  void: {
    label: 'Void',
    emoji: '🔵',
    desc:  'ฟ้าน้ำทะเล (Void สีสัน)',
    filter: 'hue-rotate(180deg) saturate(1.3)',
    dot:   '#22d3ee',
  },
  matrix: {
    label: 'Matrix',
    emoji: '🟢',
    desc:  'เขียว Terminal คลาสสิก',
    filter: 'hue-rotate(-60deg) saturate(1.15)',
    dot:   '#4ade80',
  },
  blood: {
    label: 'Blood',
    emoji: '🔴',
    desc:  'แดงเข้ม Gothic',
    filter: 'hue-rotate(-110deg) saturate(1.4)',
    dot:   '#f87171',
  },
  ash: {
    label: 'Ash',
    emoji: '⚪',
    desc:  'เทา-ขาว อ่านง่ายสุด',
    filter: 'grayscale(0.55) brightness(1.35)',
    dot:   '#d1d5db',
  },
};

export const FONT_SIZES = {
  xs:   { label: 'S',  px: '11px' },
  sm:   { label: 'M',  px: '13px' },
  base: { label: 'L',  px: '15px' },
  lg:   { label: 'XL', px: '18px' },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAshenveilSettings() {
  const get = (k, def) => {
    if (typeof window === 'undefined') return def;
    return localStorage.getItem(k) ?? def;
  };

  const [theme,      setThemeRaw]  = useState(() => get('ash_theme',      'amber'));
  const [fontSize,   setFontRaw]   = useState(() => get('ash_fontSize',   'sm'));
  const [brightness, setBrightRaw] = useState(() => {
    const saved = parseFloat(get('ash_brightness', '1.0'));
    // ป้องกัน bad value จาก localStorage เก่า
    return (isNaN(saved) || saved < 1.0 || saved > 2.0) ? 1.0 : saved;
  });

  const setTheme = useCallback((v) => {
    setThemeRaw(v);
    try { localStorage.setItem('ash_theme', v); } catch {}
  }, []);

  const setFontSize = useCallback((v) => {
    setFontRaw(v);
    try { localStorage.setItem('ash_fontSize', v); } catch {}
  }, []);

  const setBrightness = useCallback((v) => {
    setBrightRaw(v);
    try { localStorage.setItem('ash_brightness', String(v)); } catch {}
  }, []);

  // รวม filter จาก theme + brightness
  const cssFilter = useMemo(() => {
    const parts = [];
    const tf = THEMES[theme]?.filter;
    if (tf) parts.push(tf);
    if (brightness !== 1.0) parts.push(`brightness(${brightness})`);
    return parts.length ? parts.join(' ') : undefined;
  }, [theme, brightness]);

  const fontPx = FONT_SIZES[fontSize]?.px ?? '13px';

  return { theme, setTheme, fontSize, setFontSize, brightness, setBrightness, cssFilter, fontPx };
}

// ─── Panel Component ──────────────────────────────────────────────────────────
// Props:
//   hook result (theme, setTheme, fontSize, setFontSize, brightness, setBrightness)
//   bgm?: { enabled, volume, onToggle, onVolume }  — ถ้าไม่ส่ง จะไม่แสดง BGM section
export default function AshenveilSettings({
  theme, setTheme,
  fontSize, setFontSize,
  brightness, setBrightness,
  bgm,          // optional BGM controls
}) {
  const [open, setOpen] = useState(false);

  // ปิด panel เมื่อกด Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);

  const themeColor = THEMES[theme]?.dot ?? '#f59e0b';

  return (
    <div
      className="fixed bottom-4 right-4 z-[70]"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Panel ── */}
      {open && (
        <div
          className="mb-2 w-64 bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            animation: 'ash-slide-up 0.2s ease',
          }}
        >
          <style>{`
            @keyframes ash-slide-up {
              from { opacity:0; transform:translateY(8px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
            <span className="text-gray-300 text-xs font-bold tracking-wider">⚙ การแสดงผล</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 hover:text-gray-400 text-xs"
            >✕</button>
          </div>

          <div className="p-4 space-y-4">

            {/* Color Theme */}
            <div>
              <p className="text-gray-500 text-xs mb-2 font-semibold tracking-wide">🎨 สีธีม</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    title={`${t.label} — ${t.desc}`}
                    className="flex flex-col items-center gap-1 py-1.5 rounded-lg border transition"
                    style={{
                      borderColor: theme === key ? t.dot : '#374151',
                      background:  theme === key ? `${t.dot}18` : 'transparent',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full block"
                      style={{ background: t.dot }}
                    />
                    <span className="text-gray-500 text-[9px] leading-none">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-[10px] mt-1.5 text-center">
                {THEMES[theme]?.desc}
              </p>
            </div>

            {/* Font Size */}
            <div>
              <p className="text-gray-500 text-xs mb-2 font-semibold tracking-wide">📝 ขนาดตัวอักษร</p>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(FONT_SIZES).map(([key, f]) => (
                  <button
                    key={key}
                    onClick={() => setFontSize(key)}
                    className="py-1.5 rounded-lg border text-center transition"
                    style={{
                      borderColor: fontSize === key ? themeColor : '#374151',
                      color:       fontSize === key ? themeColor : '#6b7280',
                      background:  fontSize === key ? `${themeColor}18` : 'transparent',
                      fontSize:    f.px,
                      fontFamily:  "'Courier New', monospace",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-500 text-xs font-semibold tracking-wide">🔆 ความสว่าง</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: themeColor }}>
                    {brightness === 1.0 ? 'ปกติ' : `+${Math.round((brightness - 1) * 100)}%`}
                  </span>
                  {brightness !== 1.0 && (
                    <button
                      onClick={() => setBrightness(1.0)}
                      title="รีเซ็ตความสว่าง"
                      className="text-[10px] text-gray-600 hover:text-gray-400 transition px-1 border border-gray-700 rounded"
                    >↩</button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="1.0" max="2.0" step="0.05"
                value={brightness}
                onChange={e => setBrightness(parseFloat(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: themeColor }}
              />
              <div className="flex justify-between text-gray-700 text-[10px] mt-0.5">
                <span>ปกติ (0%)</span><span>+100%</span>
              </div>
            </div>

            {/* BGM — optional */}
            {bgm && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 text-xs font-semibold tracking-wide">🎵 เสียงเพลง</p>
                  <button
                    onClick={bgm.onToggle}
                    className="text-xs px-2 py-0.5 rounded border transition"
                    style={{
                      borderColor: bgm.enabled ? themeColor : '#374151',
                      color:       bgm.enabled ? themeColor : '#6b7280',
                    }}
                  >
                    {bgm.enabled ? 'เปิด' : 'ปิด'}
                  </button>
                </div>
                {bgm.enabled && (
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={bgm.volume}
                    onChange={e => bgm.onVolume(parseFloat(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: themeColor }}
                  />
                )}
              </div>
            )}

          </div>

          {/* Footer hint */}
          <div className="px-4 pb-3 text-center">
            <p className="text-gray-700 text-[10px]">ตั้งค่าจะถูกบันทึกอัตโนมัติ</p>
          </div>
        </div>
      )}

      {/* ── Toggle Button ── */}
      <button
        onClick={() => setOpen(p => !p)}
        title="ตั้งค่าการแสดงผล"
        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200"
        style={{
          background:   '#0a0a0a',
          borderColor:  open ? themeColor : '#374151',
          color:        open ? themeColor : '#6b7280',
          fontSize:     '16px',
          boxShadow:    open ? `0 0 12px ${themeColor}40` : undefined,
        }}
      >
        ⚙
      </button>
    </div>
  );
}
