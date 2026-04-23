// widgetStyles.js — ค่า default + encode/decode URL params สำหรับ Widget Appearance

// skin IDs ที่ valid (sync กับ chatSkins.js และ validate.js)
export const VALID_SKIN_IDS = [
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
  'snowfall', 'autumn', 'witch', 'music', 'aurora', 'neonrain',
];

// ค่า default ของแต่ละ widget (hex ไม่มี #)
export const WIDGET_DEFAULTS = {
  alert:       { bg: '1a0a1e', bga: 92, tc: 'ffffff', ac: 'ff2d62', fs: 14, br: 16 },
  chat:        { bg: '000000', bga: 65, tc: 'ffffff', ac: 'ff2d62', fs: 13, br: 10, dir: 'down', max: 12, rx: 0, ry: 0, rz: 0, skin: '', bw: 100, layout: 'inline' },
  pinchat:     { bg: '111111', bga: 85, tc: 'ffffff', ac: 'ff2d62', fs: 15, br: 12, rx: 0, ry: 0, rz: 0, skin: '' },
  pinprofile:  { bg: '0a0a14', bga: 92, tc: 'ffffff', ac: 'ff2d62', fs: 13, br: 16, rx: 0, ry: 0, rz: 0, skin: '', orient: 'h', showChat: 0 },
  leaderboard: { bg: '000000', bga: 70, tc: 'ffffff', ac: 'a78bfa', fs: 13, br: 16 },
  goal:        { bg: '000000', bga: 70, tc: 'ffffff', ac: 'ff2d62', fs: 13, br: 12 },
  viewers:     { bg: '000000', bga: 70, tc: 'ffffff', ac: 'ffffff', fs: 22, br: 12 },
  coinjar:     { bg: '000000', bga:  0, tc: 'ffffff', ac: 'ff8fa3', fs: 13, br: 20, jx: 0, mi: 150, gs: 100 },
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
 * สร้าง CSS transform string จาก rx/ry/rz
 * perspective 800px = ค่า default ที่ให้ความลึก 3D สมดุล
 */
export function make3DTransform(rx = 0, ry = 0, rz = 0) {
  if (!rx && !ry && !rz) return 'none';
  return `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
}

/**
 * อ่าน style params จาก URLSearchParams แล้วคืน object พร้อมใช้
 * @param {URLSearchParams} params
 * @param {string} widgetId
 * @returns {{ bgRgba, tc, ac, fs, br, rx, ry, rz, transform3D, raw }}
 */
export function parseWidgetStyles(params, widgetId) {
  const d = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;

  const bg  = /^[0-9a-f]{6}$/i.test(params.get('bg')  || '') ? params.get('bg')  : d.bg;
  const bga = clamp(parseInt(params.get('bga') ?? d.bga), 0, 100);
  const tc  = /^[0-9a-f]{6}$/i.test(params.get('tc')  || '') ? params.get('tc')  : d.tc;
  const ac  = /^[0-9a-f]{6}$/i.test(params.get('ac')  || '') ? params.get('ac')  : d.ac;
  const fs  = clamp(parseInt(params.get('fs')  ?? d.fs),  10, 28);
  const br  = clamp(parseInt(params.get('br')  ?? d.br),  0,  48);

  // chat-specific params
  const dir = ['up', 'down'].includes(params.get('dir') || '') ? params.get('dir') : (d.dir || 'down');
  const max = clamp(parseInt(params.get('max') ?? (d.max ?? 12)), 3, 50);

  // 3D transform params (chat + pinchat เท่านั้น)
  const rx = clamp(parseInt(params.get('rx') ?? (d.rx ?? 0)), -60, 60);
  const ry = clamp(parseInt(params.get('ry') ?? (d.ry ?? 0)), -60, 60);
  const rz = clamp(parseInt(params.get('rz') ?? (d.rz ?? 0)), -30, 30);

  // coinjar-specific params
  const jx  = clamp(parseInt(params.get('jx') ?? (d.jx ?? 0)), -200, 200);
  const mi  = clamp(parseInt(params.get('mi') ?? (d.mi ?? 150)), 10, 600);
  const gs  = clamp(parseInt(params.get('gs') ?? (d.gs ?? 100)), 50, 300);

  // skin (chat + pinchat เท่านั้น)
  const skinParam = params.get('skin') ?? '';
  const skin = d.skin !== undefined
    ? (VALID_SKIN_IDS.includes(skinParam) ? skinParam : (d.skin || ''))
    : '';

  // bw — bubble width % (chat เท่านั้น)
  const bw = d.bw !== undefined
    ? clamp(parseInt(params.get('bw') ?? d.bw), 30, 100)
    : 100;

  // layout — inline | stack (chat เท่านั้น)
  const layoutParam = params.get('layout') ?? '';
  const layout = d.layout !== undefined
    ? (['inline','stack'].includes(layoutParam) ? layoutParam : (d.layout || 'inline'))
    : 'inline';

  // orient — h | v (pinprofile เท่านั้น)
  const orientParam = params.get('orient') ?? '';
  const orient = d.orient !== undefined
    ? (['h','v'].includes(orientParam) ? orientParam : (d.orient || 'h'))
    : 'h';

  // showChat — 0 | 1 (pinprofile เท่านั้น)
  const showChat = d.showChat !== undefined
    ? (parseInt(params.get('showChat') ?? d.showChat) === 1 ? 1 : 0)
    : 0;

  return {
    bgRgba:      hexAlphaToRgba(bg, bga),
    tc:          '#' + tc,
    ac:          '#' + ac,
    fs,
    br,
    dir,
    max,
    rx, ry, rz,
    jx, mi, gs,
    skin, bw, layout, orient, showChat,
    transform3D: make3DTransform(rx, ry, rz),
    raw:         { bg, bga, tc, ac, fs, br, dir, max, rx, ry, rz, jx, mi, gs, skin, bw, layout, orient, showChat },
  };
}

/**
 * สร้าง query string จาก style object (สำหรับ widgets.js ใช้ต่อ URL)
 */
export function styleToParams(style, widgetId) {
  const d = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;
  const p = new URLSearchParams();
  // encode เฉพาะค่าที่ต่างจาก default เพื่อให้ URL สั้น
  if (style.bg  !== d.bg)  p.set('bg',  style.bg);
  if (style.bga !== d.bga) p.set('bga', style.bga);
  if (style.tc  !== d.tc)  p.set('tc',  style.tc);
  if (style.ac  !== d.ac)  p.set('ac',  style.ac);
  if (style.fs  !== d.fs)  p.set('fs',  style.fs);
  if (style.br  !== d.br)  p.set('br',  style.br);
  // chat-specific
  if (d.dir !== undefined && style.dir !== d.dir) p.set('dir', style.dir);
  if (d.max !== undefined && style.max !== d.max) p.set('max', style.max);
  // 3D transform (chat + pinchat)
  if (d.rx !== undefined && style.rx !== d.rx) p.set('rx', style.rx);
  if (d.ry !== undefined && style.ry !== d.ry) p.set('ry', style.ry);
  if (d.rz !== undefined && style.rz !== d.rz) p.set('rz', style.rz);
  // coinjar-specific
  if (d.jx   !== undefined && style.jx   !== d.jx)   p.set('jx',   style.jx);
  if (d.mi   !== undefined && style.mi   !== d.mi)   p.set('mi',   style.mi);
  if (d.gs   !== undefined && style.gs   !== d.gs)   p.set('gs',   style.gs);
  if (d.skin   !== undefined && style.skin   !== d.skin)   p.set('skin',   style.skin);
  if (d.bw     !== undefined && style.bw     !== d.bw)     p.set('bw',     style.bw);
  if (d.layout !== undefined && style.layout !== d.layout) p.set('layout', style.layout);
  if (d.orient    !== undefined && style.orient    !== d.orient)    p.set('orient',   style.orient);
  if (d.showChat  !== undefined && style.showChat  !== d.showChat)  p.set('showChat', style.showChat);
  return p.toString();
}

function clamp(n, min, max) {
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * แปลง raw style object (จาก style_update socket event) → parsed style
 * เหมือน parseWidgetStyles แต่รับ object แทน URLSearchParams
 */
export function rawToStyle(raw = {}, widgetId) {
  const d   = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;
  const bg  = /^[0-9a-f]{6}$/i.test(raw.bg  || '') ? raw.bg  : d.bg;
  const bga = clamp(parseInt(raw.bga  ?? d.bga), 0,  100);
  const tc  = /^[0-9a-f]{6}$/i.test(raw.tc  || '') ? raw.tc  : d.tc;
  const ac  = /^[0-9a-f]{6}$/i.test(raw.ac  || '') ? raw.ac  : d.ac;
  const fs  = clamp(parseInt(raw.fs   ?? d.fs),  10, 28);
  const br  = clamp(parseInt(raw.br   ?? d.br),  0,  48);
  const dir = ['up', 'down'].includes(raw.dir || '') ? raw.dir : (d.dir || 'down');
  const max = clamp(parseInt(raw.max  ?? (d.max ?? 12)), 3, 50);
  const rx  = clamp(parseInt(raw.rx   ?? (d.rx ?? 0)), -60, 60);
  const ry  = clamp(parseInt(raw.ry   ?? (d.ry ?? 0)), -60, 60);
  const rz  = clamp(parseInt(raw.rz   ?? (d.rz ?? 0)), -30, 30);
  const jx  = clamp(parseInt(raw.jx   ?? (d.jx ?? 0)), -200, 200);
  const mi  = clamp(parseInt(raw.mi   ?? (d.mi ?? 150)), 10, 300);
  const gs  = clamp(parseInt(raw.gs   ?? (d.gs ?? 100)), 50, 200);
  const rawSkin = raw.skin ?? '';
  const skin = d.skin !== undefined
    ? (VALID_SKIN_IDS.includes(rawSkin) ? rawSkin : (d.skin || ''))
    : '';
  const bw = d.bw !== undefined
    ? clamp(parseInt(raw.bw ?? d.bw), 30, 100)
    : 100;
  const rawLayout = raw.layout ?? '';
  const layout = d.layout !== undefined
    ? (['inline','stack'].includes(rawLayout) ? rawLayout : (d.layout || 'inline'))
    : 'inline';
  const rawOrient = raw.orient ?? '';
  const orient = d.orient !== undefined
    ? (['h','v'].includes(rawOrient) ? rawOrient : (d.orient || 'h'))
    : 'h';
  const showChat = d.showChat !== undefined
    ? (parseInt(raw.showChat ?? d.showChat) === 1 ? 1 : 0)
    : 0;
  return {
    bgRgba:      hexAlphaToRgba(bg, bga),
    tc:          '#' + tc,
    ac:          '#' + ac,
    fs, br, dir, max,
    rx, ry, rz,
    jx, mi, gs,
    skin, bw, layout, orient, showChat,
    transform3D: make3DTransform(rx, ry, rz),
    raw:         { bg, bga, tc, ac, fs, br, dir, max, rx, ry, rz, jx, mi, gs, skin, bw, layout, orient, showChat },
  };
}
