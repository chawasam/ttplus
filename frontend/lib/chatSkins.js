// chatSkins.js — 14 Premium chat overlay skins
// ใช้ร่วมกับ widget/chat.js และ widget/pinchat.js
import { useMemo } from 'react';
import { hexAlphaToRgba } from './widgetStyles';

// ============================================================
// Skin ID list (sync กับ widgetStyles.js และ validate.js)
// ============================================================
export const VALID_SKIN_IDS = [
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
  'snowfall', 'autumn', 'witch', 'music', 'aurora',
];

// ============================================================
// CSS Keyframes ที่ใช้ร่วมกัน
// ============================================================
export const SHARED_KEYFRAMES = `
@keyframes skinFall {
  0%   { transform: translateY(-10px) rotate(0deg);   opacity:0; }
  5%   { opacity:1; }
  95%  { opacity:0.7; }
  100% { transform: translateY(110vh) rotate(360deg); opacity:0; }
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
@keyframes skinLeafFall {
  0%   { transform: translate(0,-10px) rotate(0deg);    opacity:0; }
  5%   { opacity:1; }
  20%  { transform: translate(20px,22vh)  rotate(45deg); }
  40%  { transform: translate(-12px,46vh) rotate(-25deg); }
  60%  { transform: translate(16px,68vh)  rotate(60deg); }
  80%  { transform: translate(-6px,88vh)  rotate(30deg); }
  95%  { opacity:0.6; }
  100% { transform: translate(0,110vh) rotate(-15deg);  opacity:0; }
}
@keyframes skinFallDiag {
  0%   { transform: translate(0,-10px) rotate(0deg);       opacity:0; }
  5%   { opacity:1; }
  95%  { opacity:0.7; }
  100% { transform: translate(28vw,110vh) rotate(270deg);  opacity:0; }
}
@keyframes skinRise {
  0%   { transform: translateY(0) scale(1);       opacity:0; }
  5%   { opacity:0.9; }
  85%  { opacity:0.5; }
  100% { transform: translateY(-110vh) scale(0.5); opacity:0; }
}
@keyframes skinWitchRise {
  0%   { transform: translateY(0) translateX(0) scale(1);        opacity:0; }
  8%   { opacity:0.85; }
  25%  { transform: translateY(-28vh) translateX(8px)  scale(1.1); }
  50%  { transform: translateY(-55vh) translateX(-7px) scale(0.9); }
  75%  { transform: translateY(-80vh) translateX(5px)  scale(1.05); }
  90%  { opacity:0.3; }
  100% { transform: translateY(-110vh) translateX(0) scale(0.6); opacity:0; }
}
@keyframes skinNoteRise {
  0%   { transform: translateY(0) rotate(0deg) scale(1);    opacity:0; }
  5%   { opacity:0.9; }
  50%  { transform: translateY(-55vh) rotate(15deg) scale(1.1); }
  85%  { opacity:0.4; }
  100% { transform: translateY(-110vh) rotate(-10deg) scale(0.7); opacity:0; }
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
  0%   { transform: translateY(0) scale(1);    opacity:0.75; }
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
@keyframes skinWitchMist {
  0%,100% { opacity:0.08; transform:scaleX(1); }
  50%     { opacity:0.14; transform:scaleX(1.04); }
}
@keyframes skinSnowDrift {
  0%   { transform: translate(0,-10px) rotate(0deg);   opacity:0; }
  5%   { opacity:0.85; }
  30%  { transform: translate(10px,28vh)  rotate(20deg); }
  55%  { transform: translate(-8px,58vh)  rotate(-10deg); }
  80%  { transform: translate(6px,85vh)   rotate(15deg); }
  95%  { opacity:0.45; }
  100% { transform: translate(0,110vh) rotate(0deg);   opacity:0; }
}
`;

// ============================================================
// ฟังก์ชัน helper สร้าง bubbleStyle ที่ใช้ bga ของ user
// หมายเหตุ: ไม่ใส่ borderRadius ที่นี่ — user ควบคุมได้ผ่าน slider br เสมอ
// ============================================================
function makeBubble(bgHex, borderColor, extra = {}) {
  // eslint-disable-next-line no-unused-vars
  const { borderRadius: _ignored, ...safeExtra } = extra; // strip borderRadius ถ้าหลุดมา
  return (userColor, ac, bga = 80) => ({
    background:  hexAlphaToRgba(bgHex, bga),
    borderLeft:  `3px solid ${typeof borderColor === 'function' ? borderColor(userColor, ac) : borderColor}`,
    ...safeExtra,
  });
}

// ============================================================
// Skin definitions
// ============================================================
const SKINS = {

  // ───── COOL ─────────────────────────────────────────────

  cyber: {
    id: 'cyber', label: 'Cyber', emoji: '⚡', category: 'cool',
    preview: { from: '#0a0a1a', to: '#00fff7', ac: '#8b5cf6' },
    particleCount: 0, particleOrigin: 'top',
    dur: 0, sizeMin: 0, sizeMax: 0, renderType: 'div',
    bubbleStyle: makeBubble('000818', (u) => u, {
      borderRadius: 3,
      boxShadow: 'inset 0 0 18px rgba(0,255,247,0.04)',
    }),
    nameStyle: (userColor) => ({
      color: userColor,
      fontFamily: '"Courier New",monospace',
      letterSpacing: '0.05em',
    }),
    textStyle: () => ({ color: '#c0fffe', fontFamily: '"Courier New",monospace' }),
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
    particleCount: 18, particleOrigin: 'top',
    dur: 8, sizeMin: 6, sizeMax: 15, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(160,0,20,0.65)','rgba(55,8,8,0.75)','rgba(210,0,30,0.50)'][i % 3],
    }),
    bubbleStyle: makeBubble('0a0205', '#cc0020', {
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
    particleCount: 42, particleOrigin: 'fixed',
    dur: 2.5, sizeMin: 2, sizeMax: 5, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(139,92,246,0.95)','rgba(59,130,246,0.90)','rgba(255,255,255,0.95)','rgba(236,72,153,0.85)'][i % 4],
      top: (i * 43.7) % 90 + 4,
    }),
    bubbleStyle: makeBubble('060414', '#8b5cf6', {
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
    particleCount: 22, particleOrigin: 'top',
    dur: 4.5, sizeMin: 11, sizeMax: 16, renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['0','1','ア','イ','ウ','エ','カ','∑','Ω','λ','π','01'][i % 12],
      color: i % 5 === 0 ? 'rgba(0,255,65,1)' : 'rgba(0,200,50,0.72)',
    }),
    bubbleStyle: makeBubble('000a00', '#00ff41', {
      borderRadius: 2,
      boxShadow: '0 0 6px rgba(0,255,65,0.20)',
    }),
    nameStyle: () => ({
      color: '#00ff41',
      fontFamily: '"Courier New",monospace',
      letterSpacing: '0.10em',
    }),
    textStyle: () => ({ color: '#7dff99', fontFamily: '"Courier New",monospace' }),
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
    particleCount: 32, particleOrigin: 'bottom',
    dur: 3.5, sizeMin: 3, sizeMax: 8, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(255,105,0,0.9)','rgba(255,50,0,0.80)','rgba(255,190,0,0.70)','rgba(200,50,0,0.65)'][i % 4],
      ex: ((i % 11) - 5) * 16,
    }),
    bubbleStyle: makeBubble('100500', '#ff4500', {
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
    particleCount: 24, particleOrigin: 'top',
    dur: 9, sizeMin: 8, sizeMax: 20, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(255,180,200,0.72)','rgba(255,215,225,0.62)','rgba(255,150,178,0.68)','rgba(255,235,242,0.55)'][i % 4],
    }),
    bubbleStyle: makeBubble('1e0810', '#ff9db5', {
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
    particleCount: 22, particleOrigin: 'bottom',
    dur: 7, sizeMin: 10, sizeMax: 18, renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['♥','★','✿','♡','◆','✦','❀','☆','♪','✨'][i % 10],
      color: [
        'rgba(240,171,252,0.85)','rgba(251,113,133,0.85)',
        'rgba(167,139,250,0.82)','rgba(251,191,36,0.75)',
        'rgba(110,231,183,0.78)',
      ][i % 5],
    }),
    bubbleStyle: makeBubble('14081c', '#f0abfc', {
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
    particleCount: 28, particleOrigin: 'bottom',
    dur: 5.5, sizeMin: 5, sizeMax: 18, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(6,182,212,0.5)','rgba(14,165,233,0.42)','rgba(56,189,248,0.48)','rgba(103,232,249,0.38)'][i % 4],
    }),
    bubbleStyle: makeBubble('020f18', '#06b6d4', {
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
    particleCount: 26, particleOrigin: 'top',
    dur: 4.5, sizeMin: 6, sizeMax: 12, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(251,191,36,0.88)','rgba(245,158,11,0.78)','rgba(255,255,210,0.82)','rgba(253,230,138,0.68)'][i % 4],
    }),
    bubbleStyle: makeBubble('040510', '#fbbf24', {
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
    particleCount: 22, particleOrigin: 'bottom',
    dur: 5.5, sizeMin: 8, sizeMax: 16, renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['●','◆','▲','★','♦','✦','♠','♣'][i % 8],
      color: [
        'rgba(232,121,249,0.85)','rgba(244,114,182,0.85)',
        'rgba(129,140,248,0.82)','rgba(52,211,153,0.78)',
        'rgba(251,191,36,0.82)','rgba(248,113,113,0.82)',
      ][i % 6],
    }),
    bubbleStyle: makeBubble('0c0218', (u) => u, { borderRadius: 16 }),
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

  // ───── NEW SKINS ─────────────────────────────────────────

  snowfall: {
    id: 'snowfall', label: 'Snowfall', emoji: '❄️', category: 'cute',
    preview: { from: '#04091a', to: '#bfdbfe', ac: '#93c5fd' },
    particleCount: 28, particleOrigin: 'top',
    dur: 10, sizeMin: 4, sizeMax: 12, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(219,234,254,0.75)','rgba(147,197,253,0.65)','rgba(255,255,255,0.80)','rgba(186,230,253,0.60)'][i % 4],
    }),
    bubbleStyle: makeBubble('050a14', '#93c5fd', {
      borderRadius: 10,
      boxShadow: '0 0 12px rgba(147,197,253,0.18)',
    }),
    nameStyle: () => ({ color: '#bfdbfe' }),
    textStyle: () => ({ color: '#e0f2fe' }),
    css: `
      .skin-particle-snowfall {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:50%;
        animation:skinSnowDrift var(--dur,10s) var(--delay,0s) ease-in-out infinite;
      }
    `,
  },

  autumn: {
    id: 'autumn', label: 'Autumn', emoji: '🍂', category: 'cute',
    preview: { from: '#0f0500', to: '#f97316', ac: '#dc2626' },
    particleCount: 20, particleOrigin: 'top',
    dur: 7, sizeMin: 8, sizeMax: 18, renderType: 'div',
    extraPerParticle: (i) => ({
      color: ['rgba(249,115,22,0.78)','rgba(220,38,38,0.72)','rgba(180,83,9,0.80)','rgba(252,176,64,0.68)','rgba(120,40,10,0.65)'][i % 5],
    }),
    bubbleStyle: makeBubble('0f0500', '#f97316', {
      borderRadius: 4,
      boxShadow: '0 0 10px rgba(249,115,22,0.20)',
    }),
    nameStyle: () => ({ color: '#fb923c' }),
    textStyle: () => ({ color: '#fed7aa' }),
    css: `
      .skin-particle-autumn {
        position:fixed; pointer-events:none; z-index:0;
        border-radius:0 50% 0 50%;
        animation:skinLeafFall var(--dur,7s) var(--delay,0s) ease-in-out infinite;
      }
    `,
  },

  witch: {
    id: 'witch', label: 'Witch', emoji: '🔮', category: 'cool',
    preview: { from: '#08030f', to: '#7c3aed', ac: '#a855f7' },
    particleCount: 28, particleOrigin: 'bottom',
    dur: 6, sizeMin: 8, sizeMax: 16, renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['✦','✧','⋆','✵','✴','⬡','◈','✷'][i % 8],
      color: [
        'rgba(167,85,247,0.90)','rgba(124,58,237,0.85)',
        'rgba(216,180,254,0.80)','rgba(88,28,135,0.70)',
        'rgba(192,132,252,0.88)',
      ][i % 5],
    }),
    bubbleStyle: makeBubble('08030f', '#7c3aed', {
      borderRadius: 6,
      boxShadow: '0 0 16px rgba(124,58,237,0.30)',
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#e9d5ff' }),
    css: `
      .skin-witch-mist {
        position:fixed; inset:0; pointer-events:none; z-index:0;
        background:radial-gradient(ellipse 80% 40% at 50% 100%,rgba(88,28,135,0.18) 0%,transparent 70%);
        animation:skinWitchMist 7s ease-in-out infinite;
      }
      .skin-particle-witch {
        position:fixed; pointer-events:none; z-index:0;
        font-family:sans-serif; line-height:1;
        animation:skinWitchRise var(--dur,6s) var(--delay,0s) ease-in infinite;
      }
    `,
  },

  music: {
    id: 'music', label: 'Music', emoji: '🎵', category: 'cute',
    preview: { from: '#03001a', to: '#06b6d4', ac: '#e879f9' },
    particleCount: 20, particleOrigin: 'bottom',
    dur: 6.5, sizeMin: 12, sizeMax: 20, renderType: 'char',
    extraPerParticle: (i) => ({
      char: ['♩','♪','♫','♬','𝅘𝅥𝅮','♩','♫','♬','♪','♩'][i % 10],
      color: [
        'rgba(6,182,212,0.88)','rgba(232,121,249,0.85)',
        'rgba(167,139,250,0.82)','rgba(251,191,36,0.78)',
        'rgba(110,231,183,0.80)',
      ][i % 5],
    }),
    bubbleStyle: makeBubble('030010', '#06b6d4', {
      borderRadius: 10,
      boxShadow: '0 0 12px rgba(6,182,212,0.18)',
    }),
    nameStyle: (userColor) => ({ color: userColor }),
    textStyle: () => ({ color: '#e0f2fe' }),
    css: `
      .skin-particle-music {
        position:fixed; pointer-events:none; z-index:0;
        font-family:sans-serif; line-height:1;
        animation:skinNoteRise var(--dur,6.5s) var(--delay,0s) ease-in infinite;
      }
    `,
  },

  // ───── PREMIUM ───────────────────────────────────────────

  aurora: {
    id: 'aurora', label: 'Aurora Borealis', emoji: '🌠', category: 'premium',
    preview: { from: '#000d18', to: '#00ffd0', ac: '#a855f7' },
    particleCount: 30, particleOrigin: 'bottom',
    dur: 9, sizeMin: 4, sizeMax: 12, renderType: 'div',
    extraPerParticle: (i) => ({
      color: [
        'rgba(0,255,170,0.70)',
        'rgba(0,200,255,0.62)',
        'rgba(140,70,255,0.58)',
        'rgba(0,255,220,0.65)',
        'rgba(60,160,255,0.56)',
      ][i % 5],
    }),
    // glass-morphism bubble — borderLeft บางมาก เพราะ ::before จะทำ animated edge แทน
    bubbleStyle: (_userColor, _ac, bga = 80) => ({
      position:   'relative',
      overflow:   'hidden',
      background: `rgba(0,8,20,${((bga / 100) * 0.90).toFixed(2)})`,
      borderLeft: '2px solid rgba(0,255,185,0.10)',
      borderTop:  '1px solid rgba(0,255,185,0.10)',
      boxShadow:  [
        '0 0 0 1px rgba(0,240,185,0.06)',
        '0 0 20px rgba(0,240,185,0.15)',
        '0 8px 36px rgba(0,0,0,0.65)',
        'inset 0 0 28px rgba(0,240,185,0.03)',
      ].join(','),
    }),
    // ชื่อ: สีขาวสะอาด + glow สีของผู้ใช้แต่ละคน ราวกับถูกแสงเหนือส่อง (4 ชั้น)
    nameStyle: (userColor) => ({
      color: '#ffffff',
      textShadow: [
        `0 0 4px ${userColor}`,
        `0 0 14px ${userColor}`,
        '0 0 28px rgba(0,255,185,0.55)',
        '0 0 50px rgba(0,200,255,0.25)',
      ].join(', '),
    }),
    textStyle: () => ({ color: '#d8fff8' }),
    css: `
      /* ═══════════════════════════════════════════
         AURORA BOREALIS — Full Power
         ═══════════════════════════════════════════ */

      /* ─── Background container ─── */
      .skin-aurora-bg {
        position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden;
      }

      /* ─── Band 1: green-teal (หลัก) + hue-rotate cycling ─── */
      .skin-aurora-band1 {
        position:absolute;
        top:8%; left:-12%; width:124%; height:32%;
        background:linear-gradient(180deg,
          transparent 0%,
          rgba(0,255,150,0.16) 26%,
          rgba(0,220,200,0.22) 52%,
          rgba(0,255,150,0.14) 78%,
          transparent 100%
        );
        border-radius:50%;
        animation:auroraBand1 15s ease-in-out infinite,
                  auroraHue1  28s linear infinite;
      }

      /* ─── Band 2: purple-blue + reverse hue ─── */
      .skin-aurora-band2 {
        position:absolute;
        top:33%; left:-18%; width:136%; height:28%;
        background:linear-gradient(180deg,
          transparent 0%,
          rgba(90,40,255,0.13) 25%,
          rgba(0,120,255,0.17) 52%,
          rgba(100,0,240,0.11) 78%,
          transparent 100%
        );
        border-radius:50%;
        animation:auroraBand2 22s ease-in-out 5s infinite,
                  auroraHue2  22s linear reverse infinite;
      }

      /* ─── Band 3: cyan accent เคลื่อนสวนทาง + hue offset ─── */
      .skin-aurora-band3 {
        position:absolute;
        top:55%; left:-8%; width:116%; height:20%;
        background:linear-gradient(180deg,
          transparent 0%,
          rgba(0,255,220,0.11) 38%,
          rgba(60,240,200,0.16) 56%,
          transparent 100%
        );
        border-radius:50%;
        animation:auroraBand1 11s ease-in-out 8s infinite reverse,
                  auroraHue3  18s linear 4s infinite;
      }

      /* ─── Star field ─── */
      .skin-aurora-stars {
        position:absolute; inset:0;
        background-image:
          radial-gradient(1px 1px at 8%  7%,  rgba(255,255,255,0.70) 0%, transparent 100%),
          radial-gradient(1px 1px at 23% 12%, rgba(255,255,255,0.55) 0%, transparent 100%),
          radial-gradient(1px 1px at 42% 5%,  rgba(200,248,255,0.62) 0%, transparent 100%),
          radial-gradient(1px 1px at 64% 9%,  rgba(255,255,255,0.50) 0%, transparent 100%),
          radial-gradient(1px 1px at 80% 4%,  rgba(255,255,255,0.65) 0%, transparent 100%),
          radial-gradient(1px 1px at 92% 17%, rgba(200,255,240,0.56) 0%, transparent 100%),
          radial-gradient(1px 1px at 14% 28%, rgba(255,255,255,0.42) 0%, transparent 100%),
          radial-gradient(1px 1px at 36% 22%, rgba(255,255,255,0.46) 0%, transparent 100%),
          radial-gradient(1px 1px at 58% 31%, rgba(255,255,255,0.38) 0%, transparent 100%),
          radial-gradient(1px 1px at 77% 26%, rgba(200,242,255,0.50) 0%, transparent 100%),
          radial-gradient(2px 2px at 5%  20%, rgba(255,255,255,0.34) 0%, transparent 100%),
          radial-gradient(1px 1px at 89% 36%, rgba(255,255,255,0.44) 0%, transparent 100%);
        animation:skinTwinkle 5s ease-in-out 1.5s infinite alternate;
      }

      /* ─── Aurora wave motion ─── */
      @keyframes auroraBand1 {
        0%,100% { transform:skewX(-4deg) translateY(0)   scaleX(1.00); opacity:0.75; }
        22%     { transform:skewX( 7deg) translateY(-5%) scaleX(1.06); opacity:1.00; }
        48%     { transform:skewX(-2deg) translateY( 4%) scaleX(0.95); opacity:0.52; }
        73%     { transform:skewX( 5deg) translateY(-2%) scaleX(1.04); opacity:0.88; }
      }
      @keyframes auroraBand2 {
        0%,100% { transform:skewX( 3deg) translateY(0)   scaleX(1.00); opacity:0.60; }
        30%     { transform:skewX(-7deg) translateY( 4%) scaleX(1.06); opacity:0.92; }
        62%     { transform:skewX( 9deg) translateY(-5%) scaleX(0.96); opacity:0.40; }
      }

      /* ─── Aurora color cycling ─── */
      @keyframes auroraHue1 {
        from { filter:blur(34px) hue-rotate(  0deg); }
        to   { filter:blur(34px) hue-rotate(360deg); }
      }
      @keyframes auroraHue2 {
        from { filter:blur(42px) hue-rotate(  0deg); }
        to   { filter:blur(42px) hue-rotate(360deg); }
      }
      @keyframes auroraHue3 {
        from { filter:blur(26px) hue-rotate(120deg); }
        to   { filter:blur(26px) hue-rotate(480deg); }
      }

      /* ─── Bubble: animated rainbow left edge (::before) ─── */
      .skin-aurora-bubble::before {
        content:'';
        position:absolute; left:0; top:0; bottom:0; width:2px;
        background:linear-gradient(180deg,
          #00ffb4 0%,
          #00c8ff 25%,
          #8040ff 50%,
          #00c8ff 75%,
          #00ffb4 100%
        );
        background-size:100% 300%;
        animation:auroraEdgeFlow 3s linear infinite;
        z-index:3;
      }
      @keyframes auroraEdgeFlow {
        0%   { background-position:0% 0%;   }
        100% { background-position:0% 300%; }
      }

      /* ─── Bubble: shimmer sweep (::after) ─── */
      .skin-aurora-bubble::after {
        content:'';
        position:absolute;
        top:0; left:-80%; width:60%; height:100%;
        background:linear-gradient(
          105deg,
          transparent 0%,
          rgba(120,255,220,0.14) 50%,
          transparent 100%
        );
        animation:auroraShimmer 6s ease-in-out infinite;
        pointer-events:none;
        z-index:2;
      }
      @keyframes auroraShimmer {
        0%   { transform:translateX(0);    opacity:0; }
        15%  { opacity:1; }
        85%  { opacity:1; }
        100% { transform:translateX(300%); opacity:0; }
      }

      /* ─── Orb particles ─── */
      @keyframes skinAuroraOrb {
        0%   { transform:translateY(0)      translateX(0)    scale(1.00); opacity:0;    }
        6%   { opacity:0.88; }
        28%  { transform:translateY(-26vh)  translateX(8px)  scale(1.20); }
        52%  { transform:translateY(-54vh)  translateX(-10px) scale(0.86); opacity:0.65; }
        78%  { transform:translateY(-82vh)  translateX(7px)  scale(1.08); opacity:0.32; }
        100% { transform:translateY(-112vh) translateX(0)    scale(0.62); opacity:0;    }
      }
      .skin-particle-aurora {
        position:fixed; pointer-events:none; z-index:1;
        border-radius:50%;
        filter:blur(2.5px);
        box-shadow:0 0 12px 4px currentColor;
        animation:skinAuroraOrb var(--dur,9s) var(--delay,0s) ease-in infinite;
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
    const left  = (i * 61.803) % 100;
    const delay = -(i * skin.dur / n);
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
      {skinId === 'cyber'   && <><div className="skin-cyber-scanline"/><div className="skin-cyber-scanline2"/><div className="skin-cyber-grid"/></>}
      {skinId === 'galaxy'  && <div className="skin-galaxy-nebula"/>}
      {skinId === 'sakura'  && <div className="skin-sakura-bloom"/>}
      {skinId === 'witch'   && <div className="skin-witch-mist"/>}
      {skinId === 'aurora'  && (
        <div className="skin-aurora-bg">
          <div className="skin-aurora-band1" />
          <div className="skin-aurora-band2" />
          <div className="skin-aurora-band3" />
          <div className="skin-aurora-stars" />
        </div>
      )}

      {/* Particle elements */}
      {particles.map(p => (
        <SkinParticleEl key={p.id} p={p} skin={skin} />
      ))}
    </>
  );
}
