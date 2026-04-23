// chatSkins.js — 14 Premium chat overlay skins
// ใช้ร่วมกับ widget/chat.js และ widget/pinchat.js
import { useMemo, useEffect, useRef } from 'react';
import { hexAlphaToRgba } from './widgetStyles';

// ============================================================
// AuroraCanvas — Perlin FBM noise + vertical rays + chat-reactive flash
// ============================================================
function AuroraCanvas() {
  const ref       = useRef(null);
  const flashesRef = useRef([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Perlin noise (Ken Perlin 2D) ──
    const _P = Array.from({ length: 256 }, (_, i) => i).sort(() => Math.random() - 0.5);
    const _T = [..._P, ..._P];
    const _f = v => v * v * v * (v * (v * 6 - 15) + 10);
    const _l = (a, b, t) => a + (b - a) * t;
    const _g = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
    function pnoise(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = _f(xf), v = _f(yf);
      const a = _T[X] + Y, b = _T[X + 1] + Y;
      return _l(_l(_g(_T[a],     xf,     yf), _g(_T[b],     xf - 1, yf    ), u),
                _l(_g(_T[a + 1], xf,     yf - 1), _g(_T[b + 1], xf - 1, yf - 1), u), v);
    }
    // 3-octave FBM → organic, non-repeating curtain shape
    function fbm(x, y) {
      return pnoise(x, y) * 0.500
           + pnoise(x * 2.0, y * 2.0) * 0.250
           + pnoise(x * 4.0, y * 4.0) * 0.125;
    }

    // ── 4 aurora curtains (Perlin-driven) ──
    const CURTAINS = [
      { r:   0, g: 255, b: 150, yF: 0.22, amp: 0.14, sc: 0.008, al: 0.26 },
      { r:   0, g: 140, b: 255, yF: 0.36, amp: 0.11, sc: 0.011, al: 0.20 },
      { r: 110, g:   0, b: 255, yF: 0.44, amp: 0.09, sc: 0.007, al: 0.16 },
      { r:   0, g: 255, b: 220, yF: 0.56, amp: 0.08, sc: 0.013, al: 0.13 },
    ];
    const STEP = 4;

    // ── Vertical light rays ──
    const rays = [];
    const RAY_COLORS = [[0, 255, 170], [0, 200, 255], [110, 60, 255], [0, 255, 220]];
    function spawnRay(w, h) {
      const c = RAY_COLORS[Math.floor(Math.random() * RAY_COLORS.length)];
      rays.push({
        x: Math.random() * w,
        width: 0.8 + Math.random() * 2.5,
        yTop: Math.random() * h * 0.25,
        height: h * (0.18 + Math.random() * 0.38),
        r: c[0], g: c[1], b: c[2],
        age: 0,
        maxAge: 55 + Math.random() * 90,
      });
    }

    // ── Chat-reactive aurora flash ──
    const hexRgb = hex => {
      const h = hex.replace('#', '');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    };
    const onMsg = (e) => {
      const { r, g, b } = hexRgb(e.detail?.color || '#00ffd0');
      flashesRef.current.push({
        r, g, b,
        xFrac:  0.20 + Math.random() * 0.60,
        yFrac:  0.08 + Math.random() * 0.28,
        age:    0,
        maxAge: 55,
      });
    };
    window.addEventListener('aurora-msg', onMsg);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // ── Draw aurora curtains ──
      for (const c of CURTAINS) {
        const baseY = h * c.yF;
        const amp   = h * c.amp;
        const halfH = h * 0.18;
        for (let x = 0; x <= w; x += STEP) {
          const noise = fbm(x * c.sc + t * 0.10, t * 0.07);
          const midY  = baseY + noise * amp * 2;
          const top   = midY - halfH;
          const bot   = midY + halfH;
          const grad  = ctx.createLinearGradient(x, top, x, bot);
          const a     = c.al;
          grad.addColorStop(0,    `rgba(${c.r},${c.g},${c.b},0)`);
          grad.addColorStop(0.25, `rgba(${c.r},${c.g},${c.b},${+(a * 0.40).toFixed(3)})`);
          grad.addColorStop(0.50, `rgba(${c.r},${c.g},${c.b},${a})`);
          grad.addColorStop(0.75, `rgba(${c.r},${c.g},${c.b},${+(a * 0.35).toFixed(3)})`);
          grad.addColorStop(1,    `rgba(${c.r},${c.g},${c.b},0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(x, top, STEP, bot - top);
        }
      }

      // ── Draw vertical rays ──
      if (Math.random() < 0.025 && rays.length < 14) spawnRay(w, h);
      for (let i = rays.length - 1; i >= 0; i--) {
        const ray   = rays[i];
        ray.age++;
        if (ray.age >= ray.maxAge) { rays.splice(i, 1); continue; }
        const alpha = Math.sin((ray.age / ray.maxAge) * Math.PI) * 0.22;
        const rg    = ctx.createLinearGradient(ray.x, ray.yTop, ray.x, ray.yTop + ray.height);
        rg.addColorStop(0,   `rgba(${ray.r},${ray.g},${ray.b},0)`);
        rg.addColorStop(0.3, `rgba(${ray.r},${ray.g},${ray.b},${alpha})`);
        rg.addColorStop(0.7, `rgba(${ray.r},${ray.g},${ray.b},${alpha})`);
        rg.addColorStop(1,   `rgba(${ray.r},${ray.g},${ray.b},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(ray.x - ray.width / 2, ray.yTop, ray.width, ray.height);
      }

      // ── Draw chat-reactive flashes ──
      const flashes = flashesRef.current;
      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl    = flashes[i];
        fl.age++;
        if (fl.age >= fl.maxAge) { flashes.splice(i, 1); continue; }
        const life  = fl.age / fl.maxAge;
        const alpha = Math.sin(life * Math.PI) * 0.38;
        const radius = Math.min(w, h) * (0.25 + life * 0.45);
        const fg    = ctx.createRadialGradient(
          fl.xFrac * w, fl.yFrac * h, 0,
          fl.xFrac * w, fl.yFrac * h, radius,
        );
        fg.addColorStop(0,   `rgba(${fl.r},${fl.g},${fl.b},${alpha})`);
        fg.addColorStop(0.5, `rgba(${fl.r},${fl.g},${fl.b},${+(alpha * 0.28).toFixed(3)})`);
        fg.addColorStop(1,   `rgba(${fl.r},${fl.g},${fl.b},0)`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }

      t += 0.016;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('aurora-msg', onMsg);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }}
    />
  );
}

// ============================================================
// NeonRainCanvas — Cyberpunk neon rain drops (Canvas API)
// ============================================================
function NeonRainCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = [
      [255, 20, 147], [0, 255, 255], [255, 255, 0],
      [180, 0, 255], [0, 255, 100], [255, 120, 0], [255, 255, 255],
    ];

    const drops = Array.from({ length: 180 }, (_, i) => {
      const c = COLORS[i % COLORS.length];
      return {
        x:     Math.random() * 1920,
        y:     Math.random() * 1080,
        speed: 3 + Math.random() * 11,
        len:   18 + Math.random() * 65,
        width: 0.4 + Math.random() * 1.6,
        r: c[0], g: c[1], b: c[2],
        alpha: 0.25 + Math.random() * 0.55,
      };
    });

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const d of drops) {
        d.y += d.speed;
        if (d.y > h + d.len) {
          d.y     = -d.len - Math.random() * 300;
          d.x     = Math.random() * w;
          const nc = COLORS[Math.floor(Math.random() * COLORS.length)];
          d.r = nc[0]; d.g = nc[1]; d.b = nc[2];
          d.speed = 3 + Math.random() * 11;
          d.alpha = 0.25 + Math.random() * 0.55;
        }

        // Rain streak
        const sg = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
        sg.addColorStop(0,   `rgba(${d.r},${d.g},${d.b},0)`);
        sg.addColorStop(0.6, `rgba(${d.r},${d.g},${d.b},${+(d.alpha * 0.55).toFixed(3)})`);
        sg.addColorStop(1,   `rgba(${d.r},${d.g},${d.b},${d.alpha})`);
        ctx.strokeStyle = sg;
        ctx.lineWidth   = d.width;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - d.len);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        // Glowing tip
        const tg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.width * 4);
        tg.addColorStop(0, `rgba(${d.r},${d.g},${d.b},0.90)`);
        tg.addColorStop(1, `rgba(${d.r},${d.g},${d.b},0)`);
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.width * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }}
    />
  );
}

// ============================================================
// Skin ID list (sync กับ widgetStyles.js และ validate.js)
// ============================================================
export const VALID_SKIN_IDS = [
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
  'snowfall', 'autumn', 'witch', 'music', 'aurora', 'neonrain',
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
         AURORA BOREALIS — Canvas Full Power
         (aurora bands rendered by AuroraCanvas component)
         ═══════════════════════════════════════════ */

      /* ─── Star field (CSS twinkle) ─── */
      .skin-aurora-stars {
        position:fixed; inset:0; pointer-events:none; z-index:1;
        background-image:
          radial-gradient(1px 1px at 8%  7%,  rgba(255,255,255,0.72) 0%, transparent 100%),
          radial-gradient(1px 1px at 23% 12%, rgba(255,255,255,0.56) 0%, transparent 100%),
          radial-gradient(1px 1px at 42% 5%,  rgba(200,248,255,0.64) 0%, transparent 100%),
          radial-gradient(1px 1px at 64% 9%,  rgba(255,255,255,0.52) 0%, transparent 100%),
          radial-gradient(1px 1px at 80% 4%,  rgba(255,255,255,0.68) 0%, transparent 100%),
          radial-gradient(1px 1px at 92% 17%, rgba(200,255,240,0.58) 0%, transparent 100%),
          radial-gradient(1px 1px at 14% 28%, rgba(255,255,255,0.44) 0%, transparent 100%),
          radial-gradient(1px 1px at 36% 22%, rgba(255,255,255,0.48) 0%, transparent 100%),
          radial-gradient(1px 1px at 58% 31%, rgba(255,255,255,0.40) 0%, transparent 100%),
          radial-gradient(1px 1px at 77% 26%, rgba(200,242,255,0.52) 0%, transparent 100%),
          radial-gradient(2px 2px at 5%  20%, rgba(255,255,255,0.36) 0%, transparent 100%),
          radial-gradient(1px 1px at 89% 36%, rgba(255,255,255,0.46) 0%, transparent 100%);
        animation:skinTwinkle 5s ease-in-out 1.5s infinite alternate;
      }

      /* ─── Bubble: animated rainbow left edge ─── */
      .skin-aurora-bubble::before {
        content:'';
        position:absolute; left:0; top:0; bottom:0; width:2px;
        background:linear-gradient(180deg,
          #00ffb4 0%, #00c8ff 25%, #8040ff 50%, #00c8ff 75%, #00ffb4 100%
        );
        background-size:100% 300%;
        animation:auroraEdgeFlow 3s linear infinite;
        z-index:3;
      }
      @keyframes auroraEdgeFlow {
        0%   { background-position:0% 0%;   }
        100% { background-position:0% 300%; }
      }

      /* ─── Bubble: shimmer light sweep ─── */
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

      /* ─── Name: breathing aurora glow ─── */
      .skin-aurora-name {
        animation:auroraNamePulse 2.8s ease-in-out infinite;
        display:inline;
      }
      @keyframes auroraNamePulse {
        0%,100% { filter:brightness(1.0) drop-shadow(0 0 0px transparent); }
        50%     { filter:brightness(1.5) drop-shadow(0 0 8px rgba(0,255,185,0.90)); }
      }

      /* ─── Orb particles ─── */
      @keyframes skinAuroraOrb {
        0%   { transform:translateY(0)       translateX(0)     scale(1.00); opacity:0;    }
        6%   { opacity:0.90; }
        28%  { transform:translateY(-26vh)   translateX(8px)   scale(1.22); }
        52%  { transform:translateY(-54vh)   translateX(-10px) scale(0.85); opacity:0.65; }
        78%  { transform:translateY(-82vh)   translateX(7px)   scale(1.08); opacity:0.32; }
        100% { transform:translateY(-112vh)  translateX(0)     scale(0.60); opacity:0;    }
      }
      .skin-particle-aurora {
        position:fixed; pointer-events:none; z-index:2;
        border-radius:50%;
        filter:blur(2.5px);
        box-shadow:0 0 14px 5px currentColor;
        animation:skinAuroraOrb var(--dur,9s) var(--delay,0s) ease-in infinite;
      }
    `,
  },

  neonrain: {
    id: 'neonrain', label: 'Neon Rain', emoji: '🌧️', category: 'premium',
    preview: { from: '#020010', to: '#ff1493', ac: '#00ffff' },
    particleCount: 0, particleOrigin: 'top',
    dur: 0, sizeMin: 0, sizeMax: 0, renderType: 'div',
    // glass-dark bubble — ::before ทำ neon edge ที่กระพริบ
    bubbleStyle: (_userColor, _ac, bga = 80) => ({
      position:   'relative',
      overflow:   'hidden',
      background: `rgba(2,0,16,${((bga / 100) * 0.92).toFixed(2)})`,
      borderLeft: '2px solid rgba(255,20,147,0.15)',
      borderTop:  '1px solid rgba(0,255,255,0.10)',
      boxShadow:  [
        '0 0 0 1px rgba(255,20,147,0.08)',
        '0 0 18px rgba(255,20,147,0.22)',
        '0 8px 32px rgba(0,0,0,0.70)',
        'inset 0 0 24px rgba(0,255,255,0.04)',
      ].join(','),
    }),
    nameStyle: (userColor) => ({
      color:          userColor,
      fontFamily:     '"Courier New",monospace',
      letterSpacing:  '0.04em',
      textShadow: [
        `0 0 6px ${userColor}`,
        `0 0 20px ${userColor}`,
        '0 0 40px rgba(255,20,147,0.65)',
        '0 0 70px rgba(0,255,255,0.30)',
      ].join(', '),
    }),
    textStyle: () => ({ color: '#ffe0f8', fontFamily: '"Courier New",monospace' }),
    css: `
      /* ═══════════════════════════════════════════
         NEON RAIN — Cyberpunk city rain
         (rain drops rendered by NeonRainCanvas component)
         ═══════════════════════════════════════════ */

      /* ─── City glow at bottom of screen ─── */
      .skin-neonrain-glow {
        position:fixed; inset:0; pointer-events:none; z-index:1;
        background:
          radial-gradient(ellipse 90% 25% at 50% 100%, rgba(255,20,147,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 60% 18% at 22% 100%, rgba(0,255,255,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 50% 16% at 78% 100%, rgba(180,0,255,0.08) 0%, transparent 70%);
      }

      /* ─── Bubble: neon edge with scroll + flicker ─── */
      .skin-neonrain-bubble::before {
        content:'';
        position:absolute; left:0; top:0; bottom:0; width:2px;
        background:linear-gradient(180deg,
          #ff1493 0%, #00ffff 33%, #ff1493 66%, #b400ff 100%
        );
        background-size:100% 300%;
        animation:neonEdgeScroll 2s linear infinite, neonFlicker 4.2s step-end infinite;
        z-index:3;
      }
      @keyframes neonEdgeScroll {
        0%   { background-position:0% 0%;   }
        100% { background-position:0% 300%; }
      }
      @keyframes neonFlicker {
        0%,89%,91%,94%,96%,100% { opacity:1;   }
        90%                     { opacity:0.08; }
        92%,93%                 { opacity:0.05; }
        95%                     { opacity:0.4;  }
      }

      /* ─── Bubble: rain streak sliding down glass ─── */
      .skin-neonrain-bubble::after {
        content:'';
        position:absolute;
        top:-10%; left:68%;
        width:1px; height:35%;
        background:linear-gradient(
          180deg,
          transparent 0%,
          rgba(0,255,255,0.40) 40%,
          rgba(255,20,147,0.28) 70%,
          transparent 100%
        );
        animation:neonRainStreak 4.0s ease-in infinite;
        pointer-events:none; z-index:2;
      }
      @keyframes neonRainStreak {
        0%   { top:-10%; opacity:0; }
        6%   { opacity:1; }
        88%  { opacity:0.7; }
        100% { top:110%;  opacity:0; }
      }

      /* ─── Name: chromatic glitch animation ─── */
      .skin-neonrain-name {
        animation:neonGlitch 5.5s linear infinite;
        display:inline;
      }
      @keyframes neonGlitch {
        0%,83%,91%,100% { transform:none;                         filter:none; }
        84% { transform:skewX(-3deg) translateX(-2px); filter:hue-rotate(180deg) brightness(1.8); }
        85% { transform:skewX( 3deg) translateX( 2px); filter:hue-rotate( 90deg) brightness(2.2); }
        86% { transform:skewX(-1deg) translateX(   0); filter:hue-rotate(270deg) brightness(1.3); }
        87% { transform:none;                         filter:brightness(0.4);                      }
        88% { transform:skewX( 2deg) translateX( 1px); filter:hue-rotate(180deg) brightness(2.0); }
        89% { transform:none;                         filter:none;                                 }
        90% { transform:skewX(-1deg);                 filter:hue-rotate(120deg) brightness(1.5);  }
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
      {skinId === 'aurora'    && (
        <>
          <AuroraCanvas />
          <div className="skin-aurora-stars" />
        </>
      )}
      {skinId === 'neonrain'  && (
        <>
          <NeonRainCanvas />
          <div className="skin-neonrain-glow" />
        </>
      )}

      {/* Particle elements */}
      {particles.map(p => (
        <SkinParticleEl key={p.id} p={p} skin={skin} />
      ))}
    </>
  );
}
