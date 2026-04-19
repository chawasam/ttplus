// widgetStyles.js — ค่า default + encode/decode URL params สำหรับ Widget Appearance

// ค่า default ของแต่ละ widget (hex ไม่มี #)
export const WIDGET_DEFAULTS = {
  alert:       { bg: '1a0a1e', bga: 92, tc: 'ffffff', ac: 'ff2d62', fs: 14, br: 16 },
  chat:        { bg: '000000', bga: 65, tc: 'ffffff', ac: 'ff2d62', fs: 13, br: 10 },
  leaderboard: { bg: '000000', bga: 70, tc: 'ffffff', ac: 'a78bfa', fs: 13, br: 16 },
  goal:        { bg: '000000', bga: 70, tc: 'ffffff', ac: 'ff2d62', fs: 13, br: 12 },
  viewers:     { bg: '000000', bga: 70, tc: 'ffffff', ac: 'ffffff', fs: 22, br: 12 },
  coinjar:     { bg: '000000', bga:  0, tc: 'ffffff', ac: 'fbbf24', fs: 13, br: 20 },
};

/** hex (6 chars no #) + alpha (0-100) -> rgba(r,g,b,a) */
export function hexAlphaToRgba(hex, alpha) {
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${(alpha / 100).toFixed(2)})`;
}

/** '#rrggbb' -> 'rrggbb' */
export function stripHash(color) {
  return (color || '').replace(/^#/, '').toLowerCase().slice(0, 6);
}

/** 'rrggbb' -> '#rrggbb' */
export function addHash(hex) {
  return '#' + (hex || '000000').replace(/^#/, '').slice(0, 6);
}

/**
 * อ่าน style params จาก URLSearchParams แล้วคืน object พร้อมใช้
 * @param {URLSearchParams} params
 * @param {string} widgetId
 * @returns {{ bgRgba, tc, ac, fs, br, raw }}
 */
export function parseWidgetStyles(params, widgetId) {
  const d = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;

  const bg  = /^[0-9a-f]{6}$/i.test(params.get('bg')  || '') ? params.get('bg')  : d.bg;
  const bga = clamp(parseInt(params.get('bga') ?? d.bga), 0, 100);
  const tc  = /^[0-9a-f]{6}$/i.test(params.get('tc')  || '') ? params.get('tc')  : d.tc;
  const ac  = /^[0-9a-f]{6}$/i.test(params.get('ac')  || '') ? params.get('ac')  : d.ac;
  const fs  = clamp(parseInt(params.get('fs')  ?? d.fs),  10, 28);
  const br  = clamp(parseInt(params.get('br')  ?? d.br),  0,  48);

  return {
    bgRgba: hexAlphaToRgba(bg, bga),
    tc:     '#' + tc,
    ac:     '#' + ac,
    fs,
    br,
    raw:    { bg, bga, tc, ac, fs, br },
  };
}

/**
 * สร้าง query string จาก style object (สำหรับ widgets.js ใช้ต่อ URL)
 */
export function styleToParams(style, widgetId) {
  const d = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;
  const p = new URLSearchParams();
  // encode เฉพาะค่าที่ต่างจาก default เพื่อให้ URL สั้น
  if (style.bg  !== d.bg)                  p.set('bg',  style.bg);
  if (style.bga !== d.bga)                 p.set('bga', style.bga);
  if (style.tc  !== d.tc)                  p.set('tc',  style.tc);
  if (style.ac  !== d.ac)                  p.set('ac',  style.ac);
  if (style.fs  !== d.fs)                  p.set('fs',  style.fs);
  if (style.br  !== d.br)                  p.set('br',  style.br);
  return p.toString();
}

function clamp(n, min, max) {
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
