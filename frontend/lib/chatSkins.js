// chatSkins.js — 10 Premium chat overlay skins
// ใช้ร่วมกับ widget/chat.js และ widget/pinchat.js
import { useMemo } from 'react';

// ============================================================
// Skin ID list (ใช้ใน widgetStyles.js และ validate.js ด้วย)
// ============================================================
export const VALID_SKIN_IDS = [
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
];

// ============================================================
// CSS Keyframes ที่ใช้ร่วมกัน
// ============================================================
export const SHARED_KEYFRAMES = `
@keyframes skinFall {
  0%   { transform: translateY(-10px) rotate(0deg);    opacity:0; }
  5%   { opacity:1; }
  95%  { opacity:0.7; }
  100% { transform: translateY(110vh) rotate(360deg);  opacity:0; }
}
@keyframes skinFallSway {
  0%   { transform: translate(0,-10px) rotate(-15deg);  opacity:0; }
  5%   { opacity:1; }
  25%  { transform: translate(14px,25vh)  rotate(5deg); }
  50%  { transform: translate(-6px,55vh)  rotate(-10deg); }
  75%  { transform: translate(10px,82vh)  rotate(8deg); }
  95%  { opacity:0.6; }
  100% { transform: translate(0,110vh) rotate(-15deg);  opacity:0; }
}
@keyframes skinFallDiag {
  0%   { transform: translate(0,-10px) rotate(0deg);         opacity:0; }
  5%   { opacity:1; }
  95%  { opacity:0.7; }
  100% { transform: translate(28vw,110vh) rotate(270deg);    opacity:0; }
}
@keyframes skinRise {
  0%   { transform: translateY(0) scale(1);    opacity:0; }
  5%   { opacity:0.9; }
  85%  { opacity:0.5; }
  100% { transform: translateY(-110vh) scale(0.5); opacity:0; }
}
@keyframes skinTwinkle {
  0%,100% { opacity:0.1; transform:scale(0.7); }
  50%     { opacity:1;   transform:scale(1.3); }
}
@keyframes skinEmber {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity:1; }
  100% { transform: translateY(-110vh) translateX(var(--ex,10px)) scale(0); opacity:0; }
}
@keyframes skinBubbleRise {
  0%   { transform: translateY(0) scale(1);   opacity:0.75; }
  80%  { opacity:0.4; }
  100% { transform: translateY(-110vh) scale(1.5); opacity:0; }
}
@keyframes skinScanline {
  0%   { top:-4%; }
  100% { top:106%; }
}
@keyframes skinNebula {
  0%,100% { opacity:0.10; transform:scale(1)    rotate(0deg); }
  50%     { opacity:0.18; transform:scale(1.05) rotate(4deg); }
}
@keyframes skinBloom {
  0%,100% { opacity:0.08; }
  50%     { opacity:0.16; }
}
`;

// ============================================================
// Skin definitions
// ============================================================
const SKINS = {

  // ───── COOL ─────────────────────────────────────────────

  cyber: {
    id: 'cyber', label: 'Cyber', emoji: '⚡', category: 'cool',
    preview: { from: '#0a0a1a', to: '#00fff7', ac: '#8b5cf6' },
    particleCount: 0,
    particleOrigin: 'top',
    dur: 0, sizeMin: 0, sizeMax: 0,
    renderType: 'div',
    bubbleStyle: (userColor) => ({
      background: 'rgba(0,8,24,0.90)',
      borderLeft: `3px solid ${userColor}`,
      borderRadius: 3,
      boxShadow: `0 0 8px ${userColor}55, inset 0 0 18px rgba(0,255,247,0.03)`,
    }),
    nameStyle: (userColor) => ({
      color: userColor,
      fontFamily: '"Courier New",monospace',
      letterSpacing: '0.05em',
    }),
    textStyle: () => ({
      color: '#c0fffe',
      fontFamily: '"Courier New",monospace',
    }),
    css: `
      .skin-cyber-scanline {
        position:fixed; top:-4%; left:0; width:100%; height:3px;
        background:linear-gradient(transparent,rgba(0,255,247,0.18),transparent);
        animation:skinScanline 4s linear infinite;
        pointer-events:none; z-index:0;
      }
      .skin-cyber-scanline2 {
        position:fixed; top:-4%; left:0; width:100%; height:1px;
        background:rgba(139,92,246,0.35);
        animation:skinScanline 7s linear 2.5s infinite;
        pointer-events:none; z-index:0;
      }
      .skin-cyber-grid {
        position:fixed; inset:0;
        background-image:
          linear-gradient(rgba(0,255,247,0.025) 1px,transparent 1px),
          linear-gradient(90deg,rgba(0,255,247,0.025) 1px,transparent 1px);
        background-size:40px 40px;
        pointer-events:none; z-index:0;
      }
    `,
  },

  samurai: {
    id: 'samurai', label: 'Samurai', emoji: '⚔️', category: 'cool',
    preview: { from: '#0d0205', to: '#cc0020', ac: '#8b0000' },
    particleCount: 18,
    particleOrigin: 'top',
    dur: 8, sizeMin: 6, sizeMax: 15,
    renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(160,0,20,0.65)','rgba(55,8,8,0.75)','rgba(210,0,30,0.50)'][i % 3],
    }),
    bubbleStyle: () => ({
      background: 'rgba(10,2,5,0.93)',
      borderLeft: '3px solid #cc0020',
      borderRadius: 2,
      boxShadow: '0 1px 14px rgba(180,0,20,0.30)',
    }),
    nameStyle: () => ({ color: '#cc2030', letterSpacing: '0.02em' }),
    textStyle: () => ({ color: '#e4cccc' }),
    css: `
      .skin-particle-samurai {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50% 0 50% 0;
        animation:skinFallSway var(--dur,8s) var(--delay,0s) ease-in-out infinite;
      }
    `,
  },

  galaxy: {
    id: 'galaxy', label: 'Galaxy', emoji: '🌌', category: 'cool',
    preview: { from: '#06040f', to: '#8b5cf6', ac: '#3b82f6' },
    particleCount: 42,
    particleOrigin: 'fixed',   // ดาวอยู่กับที่ — twinkling
    dur: 2.5, sizeMin: 2, sizeMax: 5,
    renderType: 'div',
    extraPerParticle: (i, n) => ({
      color: ['rgba(139,92,246,0.95)','rgba(59,130,246,0.90)','rgba(255,255,255,0.95)','rgba(236,72,153,0.85)'][i % 4],
      top: (i * 43.7) % 90 + 4,   // ตำแหน่ง Y คงที่ (%)
    }),
    bubbleStyle: () => ({
      background: 'rgba(6,4,20,0.88)',
      borderLeft: '3px solid #8b5cf6',
      borderRadius: 6,
      boxShadow: '0 0 14px rgba(139,92,246,0.35)',
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#d4c8ff' }),
    css: `
      .skin-galaxy-nebula {
        position:fixed; inset:0; pointer-events:none; z-index:0;
        background:
          radial-gradient(ellipse 65% 40% at 28% 50%,rgba(139,92,246,0.13) 0%,transparent 70%),
          radial-gradient(ellipse 50% 30% at 72% 28%,rgba(59,130,246,0.10) 0%,transparent 70%);
        animation:skinNebula 9s ease-in-out infinite;
      }
      .skin-particle-galaxy {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50%;
        animation:skinTwinkle var(--dur,2.5s) var(--delay,0s) ease-in-out infinite;
      }
    `,
  },

  matrix: {
    id: 'matrix', label: 'Matrix', emoji: '💻', category: 'cool',
    preview: { from: '#000800', to: '#00ff41', ac: '#00cc33' },
    particleCount: 22,
    particleOrigin: 'top',
    dur: 4.5, sizeMin: 11, sizeMax: 16,
    renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['0','1','ア','イ','ウ','エ','カ','∑','Ω','λ','π','01'][i % 12],
      color: i % 5 === 0 ? 'rgba(0,255,65,1)' : 'rgba(0,200,50,0.72)',
    }),
    bubbleStyle: () => ({
      background: 'rgba(0,10,0,0.93)',
      borderLeft: '3px solid #00ff41',
      borderRadius: 2,
      boxShadow: '0 0 6px rgba(0,255,65,0.20)',
    }),
    nameStyle: () => ({
      color: '#00ff41',
      fontFamily: '"Courier New",monospace',
      letterSpacing: '0.10em',
    }),
    textStyle: () => ({
      color: '#7dff99',
      fontFamily: '"Courier New",monospace',
    }),
    css: `
      .skin-particle-matrix {
        position:fixed; pointer-events:none; z-index:0;
        font-family:"Courier New",monospace; font-weight:bold; line-height:1;
        text-shadow:0 0 7px currentColor;
        animation:skinFall var(--dur,4.5s) var(--delay,0s) linear infinite;
      }
    `,
  },

  volcanic: {
    id: 'volcanic', label: 'Volcanic', emoji: '🌋', category: 'cool',
    preview: { from: '#100500', to: '#ff6a00', ac: '#ee0979' },
    particleCount: 32,
    particleOrigin: 'bottom',
    dur: 3.5, sizeMin: 3, sizeMax: 8,
    renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(255,105,0,0.9)','rgba(255,50,0,0.80)','rgba(255,190,0,0.70)','rgba(200,50,0,0.65)'][i % 4],
      ex: ((i % 11) - 5) * 16,
    }),
    bubbleStyle: () => ({
      background: 'rgba(16,5,0,0.92)',
      borderLeft: '3px solid #ff4500',
      borderRadius: 4,
      boxShadow: '0 0 10px rgba(255,69,0,0.22)',
    }),
    nameStyle: () => ({ color: '#ff6a00' }),
    textStyle: () => ({ color: '#ffd8b0' }),
    css: `
      .skin-particle-volcanic {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
        filter:blur(0.5px);
        animation:skinEmber var(--dur,3.5s) var(--delay,0s) ease-out infinite;
      }
    `,
  },

  // ───── CUTE ─────────────────────────────────────────────

  sakura: {
    id: 'sakura', label: 'Sakura', emoji: '🌸', category: 'cute',
    preview: { from: '#1a0a10', to: '#ff9db5', ac: '#ffcdd9' },
    particleCount: 24,
    particleOrigin: 'top',
    dur: 9, sizeMin: 8, sizeMax: 20,
    renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(255,180,200,0.72)','rgba(255,215,225,0.62)','rgba(255,150,178,0.68)','rgba(255,235,242,0.55)'][i % 4],
    }),
    bubbleStyle: () => ({
      background: 'rgba(30,8,16,0.88)',
      borderLeft: '3px solid #ff9db5',
      borderRadius: 12,
      boxShadow: '0 0 16px rgba(255,157,181,0.22)',
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#ffe8ef' }),
    css: `
      .skin-sakura-bloom {
        position:fixed; inset:0; pointer-events:none; z-index:0;
        background:radial-gradient(ellipse 70% 50% at 50% 90%,rgba(255,150,180,0.10) 0%,transparent 70%);
        animation:skinBloom 6s ease-in-out infinite;
      }
      .skin-particle-sakura {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50% 0 50% 0;
        animation:skinFallSway var(--dur,9s) var(--delay,0s) ease-in-out infinite;
      }
    `,
  },

  pastel: {
    id: 'pastel', label: 'Pastel Dream', emoji: '💕', category: 'cute',
    preview: { from: '#100815', to: '#f0abfc', ac: '#fb7185' },
    particleCount: 22,
    particleOrigin: 'bottom',
    dur: 7, sizeMin: 10, sizeMax: 18,
    renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['♥','★','✿','♡','◆','✦','❀','☆','♪','✨'][i % 10],
      color: [
        'rgba(240,171,252,0.85)', 'rgba(251,113,133,0.85)',
        'rgba(167,139,250,0.82)', 'rgba(251,191,36,0.75)',
        'rgba(110,231,183,0.78)',
      ][i % 5],
    }),
    bubbleStyle: () => ({
      background: 'rgba(20,8,28,0.88)',
      borderLeft: '3px solid #f0abfc',
      borderRadius: 14,
      boxShadow: '0 0 14px rgba(240,171,252,0.22)',
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#fce7f3' }),
    css: `
      .skin-particle-pastel {
        position:fixed; pointer-events:none; z-index:0;
        font-family:sans-serif; line-height:1;
        animation:skinRise var(--dur,7s) var(--delay,0s) ease-in infinite;
      }
    `,
  },

  ocean: {
    id: 'ocean', label: 'Ocean', emoji: '🌊', category: 'cute',
    preview: { from: '#020f18', to: '#06b6d4', ac: '#0ea5e9' },
    particleCount: 28,
    particleOrigin: 'bottom',
    dur: 5.5, sizeMin: 5, sizeMax: 18,
    renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(6,182,212,0.5)','rgba(14,165,233,0.42)','rgba(56,189,248,0.48)','rgba(103,232,249,0.38)'][i % 4],
    }),
    bubbleStyle: () => ({
      background: 'rgba(2,15,24,0.90)',
      borderLeft: '3px solid #06b6d4',
      borderRadius: 8,
      boxShadow: '0 0 12px rgba(6,182,212,0.22)',
    }),
    nameStyle: () => ({ color: '#38bdf8' }),
    textStyle: () => ({ color: '#e0f7ff' }),
    css: `
      .skin-particle-ocean {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50%;
        border:1.5px solid currentColor;
        animation:skinBubbleRise var(--dur,5.5s) var(--delay,0s) ease-in infinite;
      }
    `,
  },

  starfall: {
    id: 'starfall', label: 'Starfall', emoji: '⭐', category: 'cute',
    preview: { from: '#04050f', to: '#fbbf24', ac: '#f59e0b' },
    particleCount: 26,
    particleOrigin: 'top',
    dur: 4.5, sizeMin: 6, sizeMax: 12,
    renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(251,191,36,0.88)','rgba(245,158,11,0.78)','rgba(255,255,210,0.82)','rgba(253,230,138,0.68)'][i % 4],
    }),
    bubbleStyle: () => ({
      background: 'rgba(4,5,16,0.90)',
      borderLeft: '3px solid #fbbf24',
      borderRadius: 6,
      boxShadow: '0 0 14px rgba(251,191,36,0.22)',
    }),
    nameStyle: () => ({ color: '#fbbf24' }),
    textStyle: () => ({ color: '#fef3c7' }),
    css: `
      .skin-particle-starfall {
        position:fixed; pointer-events:none; z-index:0;
        clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
        animation:skinFallDiag var(--dur,4.5s) var(--delay,0s) linear infinite;
      }
    `,
  },

  candy: {
    id: 'candy', label: 'Candy Pop', emoji: '🍬', category: 'cute',
    preview: { from: '#0c0218', to: '#e879f9', ac: '#f472b6' },
    particleCount: 22,
    particleOrigin: 'bottom',
    dur: 5.5, sizeMin: 8, sizeMax: 16,
    renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['●','◆','▲','★','♦','✦','♠','♣'][i % 8],
      color: [
        'rgba(232,121,249,0.85)', 'rgba(244,114,182,0.85)',
        'rgba(129,140,248,0.82)', 'rgba(52,211,153,0.78)',
        'rgba(251,191,36,0.82)',  'rgba(248,113,113,0.82)',
      ][i % 6],
    }),
    bubbleStyle: (userColor) => ({
      background: 'rgba(12,2,24,0.88)',
      borderLeft: `3px solid ${userColor}`,
      borderRadius: 16,
      boxShadow: `0 0 10px ${userColor}44`,
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#fce7ff' }),
    css: `
      .skin-particle-candy {
        position:fixed; pointer-events:none; z-index:0;
        font-family:sans-serif; font-weight:bold; line-height:1;
        animation:skinRise var(--dur,5.5s) var(--delay,0s) ease-in infinite;
      }
    `,
  },
};

export default SKINS;
export const SKIN_LIST = Object.values(SKINS);

// ============================================================
// buildParticles — สร้าง config array แบบ deterministic
// ============================================================
function buildParticles(skin) {
  const n = skin.particleCount;
  const out = [];
  for (let i = 0; i < n; i++) {
    const left  = (i * 61.803) % 100;                          // golden-ratio spread
    const delay = -(i * skin.dur / n);                         // negative = pre-started
    const dur   = skin.dur + (i % 5) * (skin.dur * 0.12);
    const size  = skin.sizeMin + ((i * 7) % (skin.sizeMax - skin.sizeMin + 1));
    out.push({
      id: i, left, delay, dur, size,
      ...(skin.extraPerParticle?.(i, n) ?? {}),
    });
  }
  return out;
}

// ============================================================
// SkinParticleEl — render อนุภาคแต่ละตัว
// ============================================================
function SkinParticleEl({ p, skin }) {
  const isChar   = skin.renderType === 'char';
  const isFixed  = skin.particleOrigin === 'fixed';
  const isBottom = skin.particleOrigin === 'bottom';

  const posStyle = isFixed
    ? { top: `${p.top}%`,  left: `${p.left}%` }
    : isBottom
      ? { bottom: '-5%',   left: `${p.left}%` }
      : { top:    '-5%',   left: `${p.left}%` };

  return (
    <div
      className={`skin-particle-${skin.id}`}
      style={{
        ...posStyle,
        ...(isChar
          ? { fontSize: p.size, color: p.color }
          : { width: p.size, height: p.size, background: p.color, color: p.color }
        ),
        '--dur':   `${p.dur}s`,
        '--delay': `${p.delay}s`,
        '--ex':    p.ex != null ? `${p.ex}px` : '10px',
      }}
    >
      {isChar ? p.char : null}
    </div>
  );
}

// ============================================================
// SkinParticles — component หลักที่ render ใน widget
// ============================================================
export function SkinParticles({ skinId }) {
  const skin = skinId ? SKINS[skinId] : null;

  const particles = useMemo(
    () => (skin ? buildParticles(skin) : []),
    [skinId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!skin) return null;

  return (
    <>
      <style>{SHARED_KEYFRAMES + skin.css}</style>

      {/* Overlay effects per skin */}
      {skinId === 'cyber' && (
        <>
          <div className="skin-cyber-scanline" />
          <div className="skin-cyber-scanline2" />
          <div className="skin-cyber-grid" />
        </>
      )}
      {skinId === 'galaxy' && <div className="skin-galaxy-nebula" />}
      {skinId === 'sakura' && <div className="skin-sakura-bloom" />}

      {/* Particle elements */}
      {particles.map(p => (
        <SkinParticleEl key={p.id} p={p} skin={skin} />
      ))}
    </>
  );
}
