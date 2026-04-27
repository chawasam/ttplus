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
// FloatOrbCanvas — floating glowing orbs (parameterized)
// ============================================================
function FloatOrbCanvas({ colors = [[0,200,255],[180,0,255],[0,255,150]] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const orbs = Array.from({ length: 14 }, (_, i) => {
      const c = colors[i % colors.length];
      return {
        x: Math.random(), y: Math.random(),
        r: 80 + Math.random() * 160,
        vx: (Math.random() - 0.5) * 0.0003, vy: (Math.random() - 0.5) * 0.0003,
        phase: Math.random() * Math.PI * 2, speed: 0.004 + Math.random() * 0.008,
        r0: c[0], g0: c[1], b0: c[2], alpha: 0.06 + Math.random() * 0.10,
      };
    });
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const o of orbs) {
        o.phase += o.speed; o.x += o.vx; o.y += o.vy;
        if (o.x < 0) o.x = 1; if (o.x > 1) o.x = 0;
        if (o.y < 0) o.y = 1; if (o.y > 1) o.y = 0;
        const pulse = o.alpha * (0.7 + 0.3 * Math.sin(o.phase));
        const g = ctx.createRadialGradient(o.x*w, o.y*h, 0, o.x*w, o.y*h, o.r);
        g.addColorStop(0,   `rgba(${o.r0},${o.g0},${o.b0},${pulse})`);
        g.addColorStop(0.5, `rgba(${o.r0},${o.g0},${o.b0},${+(pulse*0.3).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${o.r0},${o.g0},${o.b0},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// HolographicCanvas — rainbow interference + scanlines
// ============================================================
function HolographicCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) {
        const hue = (y / h * 360 + t * 40) % 360;
        const alpha = 0.03 + 0.015 * Math.sin(y * 0.04 + t * 2);
        ctx.fillStyle = `hsla(${hue},100%,60%,${alpha})`;
        ctx.fillRect(0, y, w, 2);
      }
      for (let i = 0; i < 3; i++) {
        const hue = (t * 60 + i * 120) % 360;
        const x = w * (0.2 + 0.6 * ((Math.sin(t * 0.3 + i) + 1) / 2));
        const y = h * (0.2 + 0.6 * ((Math.cos(t * 0.2 + i * 1.3) + 1) / 2));
        const g = ctx.createRadialGradient(x, y, 0, x, y, w * 0.35);
        g.addColorStop(0,   `hsla(${hue},100%,70%,0.07)`);
        g.addColorStop(1,   `hsla(${hue},100%,70%,0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// LightningCanvas — electric arcs
// ============================================================
function LightningCanvas({ color = [0, 200, 255] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const bolts = [];
    function branch(pts, x1, y1, x2, y2, depth) {
      if (depth === 0) { pts.push([x1, y1, x2, y2]); return; }
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 80 / depth;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 80 / depth;
      branch(pts, x1, y1, mx, my, depth - 1);
      branch(pts, mx, my, x2, y2, depth - 1);
      if (Math.random() < 0.3) {
        branch(pts, mx, my, mx + (Math.random()-0.5)*120, my + 80 + Math.random()*80, depth - 1);
      }
    }
    function spawnBolt(w, h) {
      const pts = [];
      branch(pts, Math.random() * w, 0, Math.random() * w, h * (0.4 + Math.random() * 0.6), 4);
      bolts.push({ pts, age: 0, maxAge: 18 + Math.random() * 25 });
    }
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (Math.random() < 0.04 && bolts.length < 4) spawnBolt(w, h);
      const [r, g, b] = color;
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i]; bolt.age++;
        if (bolt.age >= bolt.maxAge) { bolts.splice(i, 1); continue; }
        const alpha = Math.sin((bolt.age / bolt.maxAge) * Math.PI) * 0.9;
        ctx.shadowBlur = 18; ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1 + alpha;
        for (const [x1, y1, x2, y2] of bolt.pts) {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// FluidCanvas — fluid lava-lamp blobs
// ============================================================
function FluidCanvas({ colors = [[255,80,0],[220,20,0],[255,160,0]] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const blobs = Array.from({ length: 8 }, (_, i) => {
      const c = colors[i % colors.length];
      return { phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.006,
               r: 100 + Math.random() * 180, xP: Math.random(), yP: Math.random(),
               r0: c[0], g0: c[1], b0: c[2] };
    });
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        b.phase += b.speed;
        const x = w * (b.xP + 0.2 * Math.sin(b.phase * 0.7));
        const y = h * (b.yP + 0.15 * Math.cos(b.phase * 0.5));
        const pulse = 0.08 + 0.04 * Math.sin(b.phase * 1.3);
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        g.addColorStop(0,   `rgba(${b.r0},${b.g0},${b.b0},${pulse})`);
        g.addColorStop(0.6, `rgba(${b.r0},${b.g0},${b.b0},${+(pulse*0.4).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${b.r0},${b.g0},${b.b0},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// FrostCanvas — ice crystal patterns
// ============================================================
function FrostCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const crystals = Array.from({ length: 12 }, () => ({
      x: Math.random(), y: Math.random(),
      size: 40 + Math.random() * 90,
      angle: Math.random() * Math.PI,
      speed: 0.001 + Math.random() * 0.003,
      alpha: 0.04 + Math.random() * 0.08,
    }));
    function drawCrystal(cx, cy, size, angle, alpha) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
      ctx.strokeStyle = `rgba(180,230,255,${alpha})`; ctx.lineWidth = 0.8;
      for (let a = 0; a < 6; a++) {
        ctx.save(); ctx.rotate((a * Math.PI) / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -size);
        for (let j = 1; j <= 3; j++) {
          const d = size * (j / 4);
          ctx.moveTo(0, -d); ctx.lineTo(size * 0.25, -d + size * 0.12);
          ctx.moveTo(0, -d); ctx.lineTo(-size * 0.25, -d + size * 0.12);
        }
        ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const c of crystals) { c.angle += c.speed; drawCrystal(c.x*w, c.y*h, c.size, c.angle, c.alpha); }
      const vg = ctx.createRadialGradient(w/2,h/2,h*0.3, w/2,h/2,h*0.8);
      vg.addColorStop(0, 'rgba(180,230,255,0)'); vg.addColorStop(1, 'rgba(180,230,255,0.06)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// VortexCanvas — spinning vortex spiral
// ============================================================
function VortexCanvas({ color = [120, 0, 255] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const [r0, g0, b0] = color;
      for (let arm = 0; arm < 3; arm++) {
        const armAngle = (arm * Math.PI * 2) / 3;
        for (let i = 0; i < 120; i++) {
          const frac = i / 120;
          const angle = armAngle + frac * Math.PI * 6 + t * 0.8;
          const radius = frac * Math.min(w, h) * 0.48;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const alpha = (1 - frac) * 0.12;
          const size = (1 - frac) * 3 + 0.5;
          ctx.fillStyle = `rgba(${r0},${g0},${b0},${alpha})`;
          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        }
      }
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      cg.addColorStop(0, `rgba(${r0},${g0},${b0},0.18)`);
      cg.addColorStop(1, `rgba(${r0},${g0},${b0},0)`);
      ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// GlitchCanvas — digital glitch rectangles
// ============================================================
function GlitchCanvas({ color = [0, 255, 200] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const glitches = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    function spawnGlitch(w, h) {
      const [r, g, b] = color;
      glitches.push({
        x: Math.random() * w, y: Math.random() * h,
        width: 20 + Math.random() * w * 0.4, height: 1 + Math.random() * 6,
        offset: (Math.random() - 0.5) * 30, age: 0, maxAge: 3 + Math.random() * 8,
        r, g, b, alpha: 0.15 + Math.random() * 0.25, hue: Math.random() < 0.3,
      });
    }
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (Math.random() < 0.15 && glitches.length < 20) spawnGlitch(w, h);
      for (let i = glitches.length - 1; i >= 0; i--) {
        const g2 = glitches[i]; g2.age++;
        if (g2.age >= g2.maxAge) { glitches.splice(i, 1); continue; }
        const alpha = g2.alpha * (1 - g2.age / g2.maxAge);
        if (g2.hue) {
          ctx.fillStyle = `rgba(255,0,80,${alpha*0.7})`;
          ctx.fillRect(g2.x + g2.offset + 2, g2.y, g2.width, g2.height);
          ctx.fillStyle = `rgba(0,255,220,${alpha*0.7})`;
          ctx.fillRect(g2.x + g2.offset - 2, g2.y, g2.width, g2.height);
        }
        ctx.fillStyle = `rgba(${g2.r},${g2.g},${g2.b},${alpha})`;
        ctx.fillRect(g2.x + g2.offset, g2.y, g2.width, g2.height);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// InkWashCanvas — ink spreading in water
// ============================================================
function InkWashCanvas({ color = [10, 8, 20] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const blobs = Array.from({ length: 6 }, () => ({
      x: Math.random(), y: Math.random(), r: 60 + Math.random() * 120,
      phase: Math.random() * Math.PI * 2, speed: 0.002 + Math.random() * 0.004,
    }));
    const [r0, g0, b0] = color;
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        b.phase += b.speed;
        const x = w * (b.x + 0.12 * Math.sin(b.phase * 0.6));
        const y = h * (b.y + 0.10 * Math.cos(b.phase * 0.4));
        const pulse = 0.04 + 0.02 * Math.sin(b.phase);
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        g.addColorStop(0,   `rgba(${r0},${g0},${b0},${pulse})`);
        g.addColorStop(0.7, `rgba(${r0},${g0},${b0},${+(pulse*0.3).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${r0},${g0},${b0},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      t += 0.016; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// BioluminescenceCanvas — glowing plankton dots
// ============================================================
function BioluminescenceCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const COLS = [[0,255,200],[0,180,255],[100,255,180],[0,255,150]];
    const dots = Array.from({ length: 120 }, (_, i) => {
      const c = COLS[i % COLS.length];
      return {
        x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 4,
        vx: (Math.random()-0.5)*0.0002, vy: (Math.random()-0.5)*0.0002,
        phase: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.04,
        r0: c[0], g0: c[1], b0: c[2],
      };
    });
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.phase += d.speed; d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = 1; if (d.x > 1) d.x = 0;
        if (d.y < 0) d.y = 1; if (d.y > 1) d.y = 0;
        const alpha = 0.3 + 0.7 * ((Math.sin(d.phase) + 1) / 2);
        ctx.shadowBlur = d.r * 4; ctx.shadowColor = `rgba(${d.r0},${d.g0},${d.b0},0.8)`;
        ctx.fillStyle = `rgba(${d.r0},${d.g0},${d.b0},${alpha})`;
        ctx.beginPath(); ctx.arc(d.x*w, d.y*h, d.r, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// BloodMoonCanvas — red moon glow + drips
// ============================================================
function BloodMoonCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const drips = [];
    function spawnDrip(w) {
      drips.push({ x: Math.random()*w, y:0, speed: 0.4 + Math.random()*1.2,
                   len: 30 + Math.random()*80, age:0, maxAge: 200+Math.random()*200 });
    }
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const mx = w*0.78, my = h*0.12, mr = Math.min(w,h)*0.28;
      const mg = ctx.createRadialGradient(mx,my,0, mx,my,mr);
      mg.addColorStop(0, 'rgba(180,0,0,0.18)'); mg.addColorStop(0.3,'rgba(200,20,0,0.10)');
      mg.addColorStop(1, 'rgba(100,0,0,0)');
      ctx.fillStyle = mg; ctx.fillRect(0,0,w,h);
      const pg = ctx.createLinearGradient(0,h*0.8,0,h);
      pg.addColorStop(0,'rgba(100,0,0,0)'); pg.addColorStop(1,'rgba(160,0,0,0.08)');
      ctx.fillStyle = pg; ctx.fillRect(0,0,w,h);
      if (Math.random()<0.02 && drips.length<12) spawnDrip(w);
      for (let i = drips.length-1; i>=0; i--) {
        const d = drips[i]; d.age++; d.y += d.speed;
        if (d.age>=d.maxAge || d.y>h+d.len) { drips.splice(i,1); continue; }
        const alpha = Math.min(1,d.age/20)*(1-d.age/d.maxAge)*0.7;
        const dg = ctx.createLinearGradient(d.x,d.y-d.len, d.x,d.y);
        dg.addColorStop(0,'rgba(160,0,0,0)'); dg.addColorStop(0.5,`rgba(180,10,10,${alpha})`);
        dg.addColorStop(1,`rgba(200,0,0,${alpha})`);
        ctx.strokeStyle = dg; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(d.x,d.y-d.len); ctx.lineTo(d.x,d.y); ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// NeuralCanvas — neural network nodes + connections
// ============================================================
function NeuralCanvas({ color = [180, 0, 255] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const [r0, g0, b0] = color;
    const nodes = Array.from({ length: 28 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.0002, vy: (Math.random()-0.5)*0.0002,
      phase: Math.random()*Math.PI*2, speed: 0.02 + Math.random()*0.03,
    }));
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0,0,w,h);
      for (const n of nodes) {
        n.phase += n.speed; n.x += n.vx; n.y += n.vy;
        if (n.x<0.02) n.vx=Math.abs(n.vx); if (n.x>0.98) n.vx=-Math.abs(n.vx);
        if (n.y<0.02) n.vy=Math.abs(n.vy); if (n.y>0.98) n.vy=-Math.abs(n.vy);
      }
      const threshold = 0.22;
      for (let i=0;i<nodes.length;i++) {
        for (let j=i+1;j<nodes.length;j++) {
          const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if (dist<threshold) {
            const alpha=(1-dist/threshold)*0.18;
            ctx.strokeStyle=`rgba(${r0},${g0},${b0},${alpha})`;
            ctx.lineWidth=(1-dist/threshold)*1.5;
            ctx.beginPath(); ctx.moveTo(nodes[i].x*w,nodes[i].y*h);
            ctx.lineTo(nodes[j].x*w,nodes[j].y*h); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const pulse=0.5+0.5*Math.sin(n.phase);
        ctx.shadowBlur=8; ctx.shadowColor=`rgba(${r0},${g0},${b0},0.8)`;
        ctx.fillStyle=`rgba(${r0},${g0},${b0},${0.4+pulse*0.5})`;
        ctx.beginPath(); ctx.arc(n.x*w,n.y*h,2+pulse*2,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// CelestialCanvas — orrery / hypercube / blackhole / mandala
// ============================================================
function CelestialCanvas({ type = 'orrery' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0,0,w,h);
      const cx = w/2, cy = h/2;
      if (type === 'orrery') {
        const orbits = [
          { r:Math.min(w,h)*0.08, speed:1.2,  color:'rgba(255,200,50,0.35)',  pr:4 },
          { r:Math.min(w,h)*0.14, speed:0.75, color:'rgba(100,180,255,0.28)', pr:5 },
          { r:Math.min(w,h)*0.21, speed:0.45, color:'rgba(255,120,50,0.25)',  pr:6 },
          { r:Math.min(w,h)*0.30, speed:0.28, color:'rgba(200,160,100,0.22)', pr:7 },
        ];
        const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,18);
        sg.addColorStop(0,'rgba(255,220,80,0.55)'); sg.addColorStop(1,'rgba(255,150,0,0)');
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
        for (const o of orbits) {
          ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(cx,cy,o.r,0,Math.PI*2); ctx.stroke();
          const px=cx+Math.cos(t*o.speed)*o.r, py=cy+Math.sin(t*o.speed)*o.r;
          const pg=ctx.createRadialGradient(px,py,0,px,py,o.pr);
          pg.addColorStop(0,o.color); pg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,o.pr,0,Math.PI*2); ctx.fill();
        }
      } else if (type === 'hypercube') {
        const s=Math.min(w,h)*0.2;
        const verts4=[];
        for (let i=0;i<16;i++) {
          const x4=((i>>3)&1)*2-1, y4=((i>>2)&1)*2-1;
          const z4=((i>>1)&1)*2-1, w4=(i&1)*2-1;
          const cos1=Math.cos(t*0.5), sin1=Math.sin(t*0.5);
          const cos2=Math.cos(t*0.3), sin2=Math.sin(t*0.3);
          const rx=x4*cos1-w4*sin1;
          const rw=x4*sin1+w4*cos1;
          const ry=y4*cos2-z4*sin2;
          const proj=1/(3-rw);
          verts4.push([cx+rx*proj*s, cy+ry*proj*s]);
        }
        ctx.strokeStyle='rgba(100,200,255,0.22)'; ctx.lineWidth=1;
        for (let i=0;i<16;i++) {
          for (let bit=0;bit<4;bit++) {
            const j=i^(1<<bit);
            if (j>i) {
              ctx.beginPath(); ctx.moveTo(verts4[i][0],verts4[i][1]);
              ctx.lineTo(verts4[j][0],verts4[j][1]); ctx.stroke();
            }
          }
        }
      } else if (type === 'blackhole') {
        for (let ring=8;ring>0;ring--) {
          const r=Math.min(w,h)*0.04*ring;
          const hue=(ring*30+t*40)%360;
          const alpha=(9-ring)*0.012;
          ctx.strokeStyle=`hsla(${hue},80%,60%,${alpha})`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.ellipse(cx,cy,r,r*0.35,t*0.3,0,Math.PI*2); ctx.stroke();
        }
        const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(w,h)*0.06);
        bg.addColorStop(0,'rgba(0,0,0,0.5)'); bg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(cx,cy,Math.min(w,h)*0.06,0,Math.PI*2); ctx.fill();
      } else if (type === 'mandala') {
        const arms=8, layers=5;
        for (let layer=1;layer<=layers;layer++) {
          const r=Math.min(w,h)*0.05*layer;
          for (let arm=0;arm<arms;arm++) {
            const angle=(arm/arms)*Math.PI*2 + t*0.2*(layer%2?1:-1);
            const x=cx+Math.cos(angle)*r, y=cy+Math.sin(angle)*r;
            const hue=(layer*40+t*30)%360;
            ctx.fillStyle=`hsla(${hue},70%,65%,${0.12-layer*0.01})`;
            ctx.beginPath(); ctx.arc(x,y,3+layer,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle=`hsla(${hue},70%,65%,0.08)`; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
          }
        }
      }
      t+=0.016; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [type]);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// EmberCanvas — rising fire embers
// ============================================================
function EmberCanvas({ colors = [[255,100,0],[255,60,0],[255,200,0]] }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const embers = Array.from({ length: 60 }, (_, i) => {
      const c = colors[i % colors.length];
      return { x:Math.random(), y:1+Math.random()*0.3,
               vx:(Math.random()-0.5)*0.0008, vy:-(0.001+Math.random()*0.003),
               r:1+Math.random()*3, age:Math.random(), maxAge:0.6+Math.random()*0.4,
               r0:c[0], g0:c[1], b0:c[2] };
    });
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      for (const e of embers) {
        e.age += 0.005+Math.random()*0.005;
        e.x += e.vx + Math.sin(e.age*8)*0.0003; e.y += e.vy;
        if (e.y<-0.05 || e.age>e.maxAge) {
          e.x=Math.random(); e.y=1+Math.random()*0.1; e.age=0;
          const c=colors[Math.floor(Math.random()*colors.length)];
          e.r0=c[0]; e.g0=c[1]; e.b0=c[2];
        }
        const life=Math.sin((e.age/e.maxAge)*Math.PI);
        ctx.shadowBlur=e.r*3; ctx.shadowColor=`rgba(${e.r0},${e.g0},${e.b0},0.9)`;
        ctx.fillStyle=`rgba(${e.r0},${e.g0},${e.b0},${life*0.9})`;
        ctx.beginPath(); ctx.arc(e.x*w,e.y*h,e.r,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// SandRippleCanvas — zen sand ripple rings
// ============================================================
function SandRippleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const centers = [[0.5,0.5],[0.25,0.35],[0.75,0.65]];
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      for (const [cx,cy] of centers) {
        for (let ring=0;ring<12;ring++) {
          const r=((ring*55+t*18)%(Math.min(w,h)*0.55));
          const alpha=(1-r/(Math.min(w,h)*0.55))*0.07;
          ctx.strokeStyle=`rgba(180,150,100,${alpha})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.ellipse(cx*w,cy*h,r,r*0.55,0,0,Math.PI*2); ctx.stroke();
        }
      }
      t+=0.5; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// DNAHelixCanvas — rotating double helix
// ============================================================
function DNAHelixCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const SCOLS = ['rgba(0,200,255,', 'rgba(255,80,200,'];
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const cx=w/2, amplitude=Math.min(w,h)*0.12, period=h/4, rungs=28;
      for (let strand=0;strand<2;strand++) {
        const phase=strand*Math.PI;
        ctx.beginPath();
        for (let y=0;y<h;y+=3) {
          const x=cx+Math.sin((y/period)*Math.PI*2+t+phase)*amplitude;
          const depth=(Math.sin((y/period)*Math.PI*2+t+phase)+1)/2;
          const alpha=0.1+depth*0.25;
          ctx.strokeStyle=`${SCOLS[strand]}${alpha})`;
          ctx.lineWidth=1+depth;
          if (y===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      for (let i=0;i<rungs;i++) {
        const y=(i/rungs)*h+(t*20%(h/rungs));
        const x1=cx+Math.sin((y/period)*Math.PI*2+t)*amplitude;
        const x2=cx+Math.sin((y/period)*Math.PI*2+t+Math.PI)*amplitude;
        const depth=(Math.sin((y/period)*Math.PI*2+t)+1)/2;
        ctx.strokeStyle=`rgba(180,230,255,${0.06+depth*0.12})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke();
      }
      t+=0.016; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// SoundwaveCanvas — audio waveform bars
// ============================================================
function SoundwaveCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const BARS = 64;
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const bw=w/BARS, cy=h/2;
      for (let i=0;i<BARS;i++) {
        const freq=i/BARS;
        const amp=(Math.sin(freq*Math.PI*3+t*2)*0.5+0.5)*(Math.sin(freq*Math.PI*7+t*1.3)*0.5+0.5);
        const barH=(0.2+0.8*amp)*h*0.38;
        const hue=200+freq*120;
        const alpha=0.15+amp*0.35;
        ctx.fillStyle=`hsla(${hue},80%,60%,${alpha})`;
        ctx.fillRect(i*bw,cy-barH,bw-1,barH*2);
        ctx.fillStyle=`hsla(${hue},80%,60%,${alpha*0.3})`;
        ctx.fillRect(i*bw,cy+barH,bw-1,barH*0.5);
      }
      t+=0.025; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// DragonScalesCanvas — animated hexagonal scale pattern
// ============================================================
function DragonScalesCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const sz=28, cols=Math.ceil(w/sz)+2, rows=Math.ceil(h/(sz*0.75))+2;
      for (let row=0;row<rows;row++) {
        for (let col=0;col<cols;col++) {
          const cx=col*sz*1.5-sz, cy=row*sz*0.866+(col%2)*sz*0.433-sz;
          const dist=Math.sqrt(cx*cx+cy*cy)/(Math.max(w,h)*0.6);
          const hue=(dist*180+t*25)%360;
          const pulse=Math.sin(dist*8-t*2)*0.5+0.5;
          const alpha=0.03+pulse*0.05;
          ctx.strokeStyle=`hsla(${hue},80%,50%,${alpha+0.04})`;
          ctx.fillStyle=`hsla(${hue},60%,30%,${alpha})`;
          ctx.lineWidth=0.8;
          ctx.beginPath();
          for (let v=0;v<6;v++) {
            const a=(v*Math.PI)/3, vx=cx+Math.cos(a)*sz*0.5, vy=cy+Math.sin(a)*sz*0.5;
            v===0?ctx.moveTo(vx,vy):ctx.lineTo(vx,vy);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      t+=0.016; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// ExplosionCanvas — void implosion / reality tear
// ============================================================
function ExplosionCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let raf, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 80 }, () => ({
      angle: Math.random()*Math.PI*2, speed: 0.0001+Math.random()*0.0004,
      r: Math.random()*0.3, size: 1+Math.random()*2.5,
      alpha: 0.4+Math.random()*0.6, hue: Math.random()*60-30,
    }));
    const draw = () => {
      const w=canvas.width, h=canvas.height;
      ctx.clearRect(0,0,w,h);
      const cx=w/2, cy=h/2;
      const vg=ctx.createRadialGradient(cx,cy,0, cx,cy,Math.min(w,h)*0.3);
      vg.addColorStop(0,'rgba(0,0,0,0.35)'); vg.addColorStop(0.4,'rgba(20,0,40,0.12)');
      vg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
      for (let ring=0;ring<5;ring++) {
        const r=Math.min(w,h)*(0.05+ring*0.04)*(1+0.05*Math.sin(t*3+ring));
        const hue=(t*50+ring*30)%360;
        ctx.strokeStyle=`hsla(${hue},100%,60%,${0.06-ring*0.01})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
      }
      for (const p of particles) {
        p.r -= p.speed; p.angle += 0.01;
        if (p.r<0) p.r=0.45;
        const x=cx+Math.cos(p.angle)*p.r*Math.min(w,h)*0.55;
        const y=cy+Math.sin(p.angle)*p.r*Math.min(w,h)*0.55;
        const hue=(p.hue+t*40)%360;
        ctx.fillStyle=`hsla(${hue},100%,70%,${p.alpha*(p.r*2)})`;
        ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fill();
      }
      t+=0.016; raf=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, width:'100%', height:'100%' }} />;
}

// ============================================================
// Skin ID list (sync กับ widgetStyles.js และ validate.js)
// ============================================================
export const VALID_SKIN_IDS = [
  // originals
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
  'snowfall', 'autumn', 'witch', 'music', 'aurora', 'neonrain',
  // tier 1
  'obsidian', 'linen', 'carbon', 'chalk', 'studio', 'tungsten',
  'parchment', 'graphite', 'onyx', 'ivory', 'slate', 'matteblack',
  'fog', 'washi', 'concrete', 'raw', 'ecru', 'vapor', 'blueprint', 'noir',
  // tier 2
  'obsidianglass', 'rosegold', 'midnight', 'aquazen', 'amberhaze',
  'deepforest', 'burgundy', 'chrome', 'titanium', 'emberstorm',
  'dusk2', 'reef', 'northernpine', 'peachfuzz', 'moonstone',
  'bordeaux', 'mirage', 'cerulean', 'espresso', 'dustyrose',
  // tier 3
  'holographic', 'liquidmetal', 'cybergrid2', 'katana2', 'bloodmoon',
  'deepocean', 'thunder', 'seraphim', 'sakurastorm2', 'inkwash',
  'neondusk', 'wildfire', 'frozen', 'lava', 'spectral',
  'circuit', 'prism', 'tempest', 'bioluminescence', 'mosaic',
  // tier 4
  'nebulacore', 'eventhorizon', 'quantumfoam', 'dragonscales', 'abyssal',
  'stormfront', 'astralplane', 'eclipse', 'reactor', 'rift',
  'aurora2', 'cosmicdust', 'volcanicglass', 'singularity', 'tesseract',
  'deepspace', 'tempestvortex', 'phosphor', 'crystalcave', 'arcanesigil',
  // tier 5
  'livingportrait', 'cyberpunkrain2', 'shogunsgarden', 'lovecraftian',
  'timecrystal', 'neuralstorm', 'quantumentangle', 'ghostprotocol',
  'forbiddencity', 'eldritchcodex', 'celestialorrery', 'soundwave',
  'mirrorworld', 'wormhole', 'dnahelix', 'volcaniceruption',
  'sentientslime', 'akashicrecord', 'realityglitch', 'thevoid',
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

  // ══════════════════════════════════════════════════════════
  // TIER 1 — Minimal Premium (CSS only, no particles)
  // ══════════════════════════════════════════════════════════

  obsidian: {
    id:'obsidian', label:'Obsidian', emoji:'🖤', category:'premium',
    preview:{ from:'#0a0a0a', to:'#2a2a2a', ac:'#888' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0d0d0d','#333',{ boxShadow:'0 2px 12px rgba(0,0,0,0.6)' }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ccc' }),
    css:`.skin-obsidian-bg{position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 100%,rgba(40,40,40,0.18) 0%,transparent 70%);pointer-events:none;z-index:0;}`,
  },

  linen: {
    id:'linen', label:'Linen', emoji:'🪡', category:'premium',
    preview:{ from:'#1a1814', to:'#c8b99a', ac:'#8a7560' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('16140f','rgba(200,185,154,0.4)',{ boxShadow:'0 1px 8px rgba(0,0,0,0.4)' }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Georgia",serif', letterSpacing:'0.03em' }),
    textStyle:()=>({ color:'#e8dece', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  carbon: {
    id:'carbon', label:'Carbon', emoji:'⬛', category:'premium',
    preview:{ from:'#080808', to:'#444', ac:'#666' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0b0b0b','#2a2a2a',{
      background:'repeating-linear-gradient(45deg,rgba(255,255,255,0.012) 0px,rgba(255,255,255,0.012) 1px,transparent 1px,transparent 4px)',
      boxShadow:'0 2px 10px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#bbb' }),
    css:``,
  },

  chalk: {
    id:'chalk', label:'Chalk', emoji:'🖊️', category:'premium',
    preview:{ from:'#1a1a2e', to:'#e8e8f0', ac:'#aaa' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('141420','rgba(232,232,240,0.35)',{
      borderLeft:'none', borderTop:'none',
      outline:'1px dashed rgba(220,220,240,0.15)',
      boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
    }),
    nameStyle:()=>({ color:'#dde', fontFamily:'"Courier New",monospace', letterSpacing:'0.04em' }),
    textStyle:()=>({ color:'#c8c8d8', fontFamily:'"Courier New",monospace' }),
    css:``,
  },

  studio: {
    id:'studio', label:'Studio', emoji:'🎨', category:'premium',
    preview:{ from:'#0e0e12', to:'#5c5c7a', ac:'#9090c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0f0f14','rgba(90,90,120,0.35)',{
      boxShadow:'0 0 0 1px rgba(120,120,180,0.12), 0 4px 16px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c8c8e8' }),
    css:`.skin-studio-bg{position:fixed;inset:0;background:radial-gradient(ellipse 100% 60% at 50% 0%,rgba(80,80,140,0.08) 0%,transparent 70%);pointer-events:none;z-index:0;}`,
  },

  tungsten: {
    id:'tungsten', label:'Tungsten', emoji:'🔩', category:'premium',
    preview:{ from:'#111', to:'#555', ac:'#888' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('101010','#3a3a3a',{
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05), 0 3px 12px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#bbb' }),
    css:``,
  },

  parchment: {
    id:'parchment', label:'Parchment', emoji:'📜', category:'premium',
    preview:{ from:'#120e08', to:'#c4a96a', ac:'#8a6a30' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('16100a','rgba(196,169,106,0.3)',{
      boxShadow:'0 2px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(196,169,106,0.03)',
    }),
    nameStyle:()=>({ color:'#d4aa60', fontFamily:'"Georgia",serif', letterSpacing:'0.03em' }),
    textStyle:()=>({ color:'#ddc898', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  graphite: {
    id:'graphite', label:'Graphite', emoji:'✏️', category:'premium',
    preview:{ from:'#0d0d0d', to:'#4a4a4a', ac:'#777' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('111','rgba(80,80,80,0.3)',{
      borderLeft:'2px solid rgba(130,130,130,0.2)',
      boxShadow:'0 1px 6px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#bbb' }),
    css:``,
  },

  onyx: {
    id:'onyx', label:'Onyx', emoji:'💎', category:'premium',
    preview:{ from:'#050508', to:'#1a1a2a', ac:'#6060b0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('06060a','rgba(30,30,50,0.5)',{
      boxShadow:'0 0 0 1px rgba(80,80,150,0.12), 0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0b0d0' }),
    css:``,
  },

  ivory: {
    id:'ivory', label:'Ivory', emoji:'🦷', category:'premium',
    preview:{ from:'#14120e', to:'#ede0c4', ac:'#b09060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('161410','rgba(237,224,196,0.2)',{
      boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
    }),
    nameStyle:()=>({ color:'#ddd0a8', fontFamily:'"Georgia",serif' }),
    textStyle:()=>({ color:'#e8dcc0', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  slate: {
    id:'slate', label:'Slate', emoji:'🪨', category:'premium',
    preview:{ from:'#0d1015', to:'#3a4a5a', ac:'#607080' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0e1218','rgba(60,80,100,0.3)',{
      boxShadow:'0 2px 10px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b8c8d8' }),
    css:``,
  },

  matteblack: {
    id:'matteblack', label:'Matte Black', emoji:'🔲', category:'premium',
    preview:{ from:'#080808', to:'#1a1a1a', ac:'#444' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0a0a','rgba(50,50,50,0.4)',{
      borderLeft:'none', borderTop:'none',
      outline:'1px solid rgba(60,60,60,0.4)',
      boxShadow:'0 4px 16px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#aaa' }),
    css:``,
  },

  fog: {
    id:'fog', label:'Fog', emoji:'🌫️', category:'premium',
    preview:{ from:'#101418', to:'#8090a0', ac:'#aabbc0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('121620','rgba(140,160,180,0.15)',{
      backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
      boxShadow:'0 2px 12px rgba(0,0,0,0.4)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c0ccd8' }),
    css:`.skin-fog-bg{position:fixed;inset:0;background:radial-gradient(ellipse 120% 60% at 50% 50%,rgba(140,160,180,0.05) 0%,transparent 70%);pointer-events:none;z-index:0;}`,
  },

  washi: {
    id:'washi', label:'Washi', emoji:'🗞️', category:'premium',
    preview:{ from:'#141210', to:'#c8b89a', ac:'#907858' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('161210','rgba(200,184,154,0.22)',{
      boxShadow:'0 1px 6px rgba(0,0,0,0.4)',
    }),
    nameStyle:()=>({ color:'#c8a870', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif' }),
    textStyle:()=>({ color:'#ddd0b8', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif' }),
    css:``,
  },

  concrete: {
    id:'concrete', label:'Concrete', emoji:'🏗️', category:'premium',
    preview:{ from:'#0e0e0e', to:'#5a5a5a', ac:'#888' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('101010','rgba(90,90,90,0.25)',{
      borderLeft:'3px solid rgba(120,120,120,0.3)',
      boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'system-ui,sans-serif', letterSpacing:'0.06em', textTransform:'uppercase', fontSize:'0.82em' }),
    textStyle:()=>({ color:'#bbb' }),
    css:``,
  },

  raw: {
    id:'raw', label:'Raw', emoji:'🔸', category:'premium',
    preview:{ from:'#100a06', to:'#a06030', ac:'#c07840' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('120c08','rgba(160,96,48,0.2)',{
      borderLeft:'3px solid rgba(160,96,48,0.4)',
      boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d8b898' }),
    css:``,
  },

  ecru: {
    id:'ecru', label:'Ecru', emoji:'🍂', category:'premium',
    preview:{ from:'#14120e', to:'#c8b898', ac:'#906848' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('161410','rgba(200,184,152,0.2)',{
      boxShadow:'0 1px 6px rgba(0,0,0,0.4)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Georgia",serif' }),
    textStyle:()=>({ color:'#ddd0b8', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  vapor: {
    id:'vapor', label:'Vaporwave', emoji:'📼', category:'premium',
    preview:{ from:'#0a0518', to:'#ff6ec7', ac:'#00e5ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: (_u, _ac, bga=80)=>({
      background:`rgba(10,5,24,${((bga/100)*0.88).toFixed(2)})`,
      borderLeft:'2px solid rgba(255,110,199,0.35)',
      borderTop:'1px solid rgba(0,229,255,0.15)',
      boxShadow:'0 0 12px rgba(255,110,199,0.18), 0 0 24px rgba(0,229,255,0.10)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Courier New",monospace', letterSpacing:'0.08em',
      textShadow:`0 0 8px ${u}, 0 0 20px rgba(255,110,199,0.6)` }),
    textStyle:()=>({ color:'#e0c8ff', fontFamily:'"Courier New",monospace' }),
    css:`.skin-vapor-bg{position:fixed;inset:0;
      background:
        linear-gradient(180deg,rgba(255,110,199,0.04) 0%,transparent 40%),
        linear-gradient(0deg,rgba(0,229,255,0.04) 0%,transparent 40%);
      pointer-events:none;z-index:0;}`,
  },

  blueprint: {
    id:'blueprint', label:'Blueprint', emoji:'📐', category:'premium',
    preview:{ from:'#02123a', to:'#1a6aff', ac:'#60a0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('021040','rgba(26,106,255,0.18)',{
      borderLeft:'2px solid rgba(26,106,255,0.4)',
      boxShadow:'0 0 10px rgba(26,106,255,0.15)',
    }),
    nameStyle:()=>({ color:'#60a0ff', fontFamily:'"Courier New",monospace', letterSpacing:'0.06em' }),
    textStyle:()=>({ color:'#a0c8ff', fontFamily:'"Courier New",monospace' }),
    css:`.skin-blueprint-bg{position:fixed;inset:0;
      background-image:linear-gradient(rgba(26,106,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(26,106,255,0.06) 1px,transparent 1px);
      background-size:32px 32px;pointer-events:none;z-index:0;}`,
  },

  noir: {
    id:'noir', label:'Noir', emoji:'🎬', category:'premium',
    preview:{ from:'#050505', to:'#2a2a2a', ac:'#ccc' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080808','rgba(200,200,200,0.08)',{
      borderLeft:'3px solid rgba(200,200,200,0.2)',
      boxShadow:'0 2px 12px rgba(0,0,0,0.8)',
    }),
    nameStyle:()=>({ color:'#ccc', fontFamily:'"Georgia",serif', fontStyle:'italic' }),
    textStyle:()=>({ color:'#bbb', fontFamily:'"Georgia",serif' }),
    css:`.skin-noir-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 50%,rgba(0,0,0,0.5) 100%);pointer-events:none;z-index:0;}`,
  },

  // ══════════════════════════════════════════════════════════
  // TIER 2 — Polished Premium (canvas orbs + refined CSS)
  // ══════════════════════════════════════════════════════════

  obsidianglass: {
    id:'obsidianglass', label:'Obsidian Glass', emoji:'🪞', category:'premium',
    preview:{ from:'#050508', to:'#3a2060', ac:'#8040ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(5,5,10,${((bga/100)*0.90).toFixed(2)})`,
      borderLeft:'1px solid rgba(128,64,255,0.25)',
      borderTop:'1px solid rgba(128,64,255,0.12)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      boxShadow:'0 0 0 1px rgba(128,64,255,0.08), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c8b8e8' }),
    css:``,
  },

  rosegold: {
    id:'rosegold', label:'Rose Gold', emoji:'🌹', category:'premium',
    preview:{ from:'#120808', to:'#e8a0a0', ac:'#d06080' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('160a0a','rgba(232,160,160,0.22)',{
      boxShadow:'0 0 12px rgba(200,100,120,0.15), 0 4px 16px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0d0d8' }),
    css:``,
  },

  midnight: {
    id:'midnight', label:'Midnight', emoji:'🌙', category:'premium',
    preview:{ from:'#03050f', to:'#1a2060', ac:'#4060c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040610','rgba(30,40,100,0.28)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0c0e8' }),
    css:``,
  },

  aquazen: {
    id:'aquazen', label:'Aqua Zen', emoji:'💧', category:'premium',
    preview:{ from:'#021820', to:'#00c8d8', ac:'#40e0f0' },
    particleCount:16, particleOrigin:'bottom', dur:8, sizeMin:6, sizeMax:14, renderType:'div',
    extraPerParticle:(i)=>({ color:['rgba(0,200,220,0.3)','rgba(64,224,240,0.25)','rgba(0,180,200,0.28)'][i%3] }),
    bubbleStyle: makeBubble('021c22','rgba(0,200,220,0.18)',{
      boxShadow:'0 0 12px rgba(0,200,220,0.12)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0e8f0' }),
    css:`.skin-particle-aquazen{position:fixed;pointer-events:none;z-index:0;border-radius:50%;filter:blur(1px);animation:skinBubbleRise var(--dur,8s) var(--delay,0s) ease-in infinite;}`,
  },

  amberhaze: {
    id:'amberhaze', label:'Amber Haze', emoji:'🍯', category:'premium',
    preview:{ from:'#100800', to:'#f0a020', ac:'#e08010' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('120c00','rgba(240,160,32,0.18)',{
      boxShadow:'0 0 14px rgba(200,120,20,0.12), 0 4px 16px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffd898' }),
    css:``,
  },

  deepforest: {
    id:'deepforest', label:'Deep Forest', emoji:'🌲', category:'premium',
    preview:{ from:'#030a04', to:'#2a6030', ac:'#48a058' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040c06','rgba(42,96,48,0.28)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a8d8a8' }),
    css:`.skin-deepforest-bg{position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% 100%,rgba(40,100,40,0.10) 0%,transparent 70%);pointer-events:none;z-index:0;}`,
  },

  burgundy: {
    id:'burgundy', label:'Burgundy', emoji:'🍷', category:'premium',
    preview:{ from:'#0e0208', to:'#8b1a3a', ac:'#c03060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('100408','rgba(139,26,58,0.28)',{
      boxShadow:'0 0 12px rgba(160,30,60,0.15), 0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0b8c8' }),
    css:``,
  },

  chrome: {
    id:'chrome', label:'Chrome', emoji:'🔮', category:'premium',
    preview:{ from:'#0a0a10', to:'#a0a8c0', ac:'#c0c8e8' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(10,10,16,${((bga/100)*0.88).toFixed(2)})`,
      borderLeft:'1px solid rgba(200,210,240,0.3)',
      borderTop:'1px solid rgba(200,210,240,0.15)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0d8f0' }),
    css:``,
  },

  titanium: {
    id:'titanium', label:'Titanium', emoji:'⚙️', category:'premium',
    preview:{ from:'#080a0c', to:'#607080', ac:'#8090a8' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0c10','rgba(96,112,128,0.22)',{
      borderLeft:'2px solid rgba(128,144,168,0.3)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04), 0 3px 12px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b8c8d8' }),
    css:``,
  },

  emberstorm: {
    id:'emberstorm', label:'Ember Storm', emoji:'🔥', category:'premium',
    preview:{ from:'#0e0300', to:'#ff5500', ac:'#ff9900' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('120400','#ff4400',{
      boxShadow:'0 0 16px rgba(255,80,0,0.20), 0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffd0a0' }),
    css:``,
  },

  dusk2: {
    id:'dusk2', label:'Dusk', emoji:'🌆', category:'premium',
    preview:{ from:'#0a0614', to:'#7c3aed', ac:'#f59e0b' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0c0818','rgba(124,58,237,0.18)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#e0d0f8' }),
    css:`.skin-dusk2-bg{position:fixed;inset:0;
      background:linear-gradient(180deg,rgba(124,58,237,0.06) 0%,transparent 40%,rgba(245,158,11,0.05) 100%);
      pointer-events:none;z-index:0;}`,
  },

  reef: {
    id:'reef', label:'Reef', emoji:'🐠', category:'premium',
    preview:{ from:'#010e18', to:'#0080c0', ac:'#00d0e0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('021220','rgba(0,128,192,0.22)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0e8f8' }),
    css:``,
  },

  northernpine: {
    id:'northernpine', label:'Northern Pine', emoji:'🌿', category:'premium',
    preview:{ from:'#030a08', to:'#1a5040', ac:'#38907a' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040c0a','rgba(26,80,64,0.28)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#90d8c0' }),
    css:``,
  },

  peachfuzz: {
    id:'peachfuzz', label:'Peach Fuzz', emoji:'🍑', category:'premium',
    preview:{ from:'#14080a', to:'#ffb088', ac:'#ff8060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('180a0c','rgba(255,176,136,0.2)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffd8c0' }),
    css:``,
  },

  moonstone: {
    id:'moonstone', label:'Moonstone', emoji:'🌑', category:'premium',
    preview:{ from:'#080c18', to:'#a0b8e0', ac:'#c0d8f8' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0e20','rgba(160,184,224,0.18)',{
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 12px rgba(160,200,240,0.12), 0 4px 20px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0e4f8' }),
    css:``,
  },

  bordeaux: {
    id:'bordeaux', label:'Bordeaux', emoji:'🍾', category:'premium',
    preview:{ from:'#0e0206', to:'#6a0828', ac:'#9a2040' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('100406','rgba(106,8,40,0.3)',{
      boxShadow:'0 0 14px rgba(140,20,50,0.15), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0a8bc' }),
    css:``,
  },

  mirage: {
    id:'mirage', label:'Mirage', emoji:'🏜️', category:'premium',
    preview:{ from:'#050812', to:'#2040a0', ac:'#60a0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(5,8,18,${((bga/100)*0.85).toFixed(2)})`,
      borderLeft:'1px solid rgba(96,160,255,0.2)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      boxShadow:'0 8px 32px rgba(0,0,80,0.4)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0d0f8' }),
    css:``,
  },

  cerulean: {
    id:'cerulean', label:'Cerulean', emoji:'🔵', category:'premium',
    preview:{ from:'#020c1a', to:'#1060b0', ac:'#2080e0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('030e20','rgba(16,96,176,0.22)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c8f0' }),
    css:``,
  },

  espresso: {
    id:'espresso', label:'Espresso', emoji:'☕', category:'premium',
    preview:{ from:'#0c0806', to:'#4a2c18', ac:'#8a5030' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('100a08','rgba(74,44,24,0.3)',{
      boxShadow:'0 3px 12px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d8b898' }),
    css:``,
  },

  dustyrose: {
    id:'dustyrose', label:'Dusty Rose', emoji:'🌷', category:'premium',
    preview:{ from:'#14080e', to:'#d09090', ac:'#e0a0b0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('180a10','rgba(208,144,144,0.2)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0d0d8' }),
    css:``,
  },

  // ══════════════════════════════════════════════════════════
  // TIER 3 — Statement skins (canvas-driven)
  // ══════════════════════════════════════════════════════════

  holographic: {
    id:'holographic', label:'Holographic', emoji:'🌈', category:'premium',
    preview:{ from:'#080610', to:'#c0a0ff', ac:'#ff80c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(8,6,16,${((bga/100)*0.80).toFixed(2)})`,
      borderLeft:'1px solid rgba(200,160,255,0.3)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 20px rgba(200,160,255,0.12), 0 8px 32px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#e8d8ff' }),
    css:``,
  },

  liquidmetal: {
    id:'liquidmetal', label:'Liquid Metal', emoji:'🪙', category:'premium',
    preview:{ from:'#080808', to:'#c0c8e0', ac:'#e0e8ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(8,8,12,${((bga/100)*0.85).toFixed(2)})`,
      borderLeft:'1px solid rgba(220,228,255,0.35)',
      borderTop:'1px solid rgba(220,228,255,0.15)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(200,210,255,0.10), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d8e0f8' }),
    css:``,
  },

  cybergrid2: {
    id:'cybergrid2', label:'Cyber Grid', emoji:'⚡', category:'premium',
    preview:{ from:'#010820', to:'#0040ff', ac:'#00ffaa' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('010a20','#0040ff',{
      boxShadow:'0 0 10px rgba(0,64,255,0.3), 0 0 20px rgba(0,255,170,0.10)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Courier New",monospace', letterSpacing:'0.05em',
      textShadow:`0 0 8px ${u}` }),
    textStyle:()=>({ color:'#80d8ff', fontFamily:'"Courier New",monospace' }),
    css:`.skin-cybergrid2-bg{position:fixed;inset:0;
      background-image:linear-gradient(rgba(0,64,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,64,255,0.05) 1px,transparent 1px);
      background-size:36px 36px;pointer-events:none;z-index:0;}`,
  },

  katana2: {
    id:'katana2', label:'Katana', emoji:'🗡️', category:'premium',
    preview:{ from:'#060208', to:'#8020c0', ac:'#c060ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080408','#6010a0',{
      boxShadow:'0 0 16px rgba(128,32,192,0.25), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u, letterSpacing:'0.08em' }),
    textStyle:()=>({ color:'#d0a8f8' }),
    css:``,
  },

  bloodmoon: {
    id:'bloodmoon', label:'Blood Moon', emoji:'🔴', category:'premium',
    preview:{ from:'#0a0002', to:'#aa0010', ac:'#ff2020' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0c0004','#880010',{
      boxShadow:'0 0 20px rgba(180,0,20,0.22), 0 4px 16px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffb0b0' }),
    css:``,
  },

  deepocean: {
    id:'deepocean', label:'Deep Ocean', emoji:'🦑', category:'premium',
    preview:{ from:'#000814', to:'#0020a0', ac:'#0060e0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('000a18','rgba(0,32,160,0.28)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#80c0ff' }),
    css:``,
  },

  thunder: {
    id:'thunder', label:'Thunder', emoji:'⛈️', category:'premium',
    preview:{ from:'#060810', to:'#3060ff', ac:'#80c0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080a14','rgba(48,96,255,0.20)',{
      boxShadow:'0 0 16px rgba(48,96,255,0.15), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c8ff' }),
    css:``,
  },

  seraphim: {
    id:'seraphim', label:'Seraphim', emoji:'👼', category:'premium',
    preview:{ from:'#080608', to:'#d0a0ff', ac:'#ffe080' },
    particleCount:20, particleOrigin:'bottom', dur:9, sizeMin:6, sizeMax:14, renderType:'char',
    extraPerParticle:(i)=>({
      char:['✦','✧','⋆','★','✨'][i%5],
      color:['rgba(208,160,255,0.7)','rgba(255,224,128,0.65)','rgba(255,200,200,0.6)'][i%3],
    }),
    bubbleStyle: makeBubble('0c0a10','rgba(208,160,255,0.18)',{
      boxShadow:'0 0 20px rgba(208,160,255,0.12), 0 4px 20px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f8e8ff' }),
    css:`.skin-particle-seraphim{position:fixed;pointer-events:none;z-index:0;font-family:sans-serif;line-height:1;animation:skinRise var(--dur,9s) var(--delay,0s) ease-in infinite;}`,
  },

  sakurastorm2: {
    id:'sakurastorm2', label:'Sakura Storm', emoji:'🌸', category:'premium',
    preview:{ from:'#0e060c', to:'#ff80b0', ac:'#ffc0d8' },
    particleCount:32, particleOrigin:'top', dur:8, sizeMin:8, sizeMax:20, renderType:'div',
    extraPerParticle:(i)=>({
      color:['rgba(255,160,192,0.70)','rgba(255,200,220,0.60)','rgba(255,130,170,0.65)','rgba(255,240,248,0.50)'][i%4],
    }),
    bubbleStyle: makeBubble('140810','#ff80b0',{
      borderRadius:12, boxShadow:'0 0 18px rgba(255,128,176,0.18)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffe8f0' }),
    css:`.skin-particle-sakurastorm2{position:fixed;pointer-events:none;z-index:0;border-radius:50% 0 50% 0;animation:skinFallSway var(--dur,8s) var(--delay,0s) ease-in-out infinite;}`,
  },

  inkwash: {
    id:'inkwash', label:'Ink Wash', emoji:'🖌️', category:'premium',
    preview:{ from:'#080808', to:'#2a2a3a', ac:'#8080b0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0a0a','rgba(80,80,100,0.25)',{
      boxShadow:'0 3px 12px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c8c8d8' }),
    css:``,
  },

  neondusk: {
    id:'neondusk', label:'Neon Dusk', emoji:'🌇', category:'premium',
    preview:{ from:'#080414', to:'#c020a0', ac:'#ff8020' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0c0618','rgba(192,32,160,0.18)',{
      borderLeft:'2px solid rgba(192,32,160,0.35)',
      boxShadow:'0 0 16px rgba(192,32,160,0.15), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0c0e8' }),
    css:``,
  },

  wildfire: {
    id:'wildfire', label:'Wildfire', emoji:'🔥', category:'premium',
    preview:{ from:'#100200', to:'#ff4400', ac:'#ff9900' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('140400','#dd3300',{
      boxShadow:'0 0 20px rgba(255,68,0,0.22), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffd0a0' }),
    css:``,
  },

  frozen: {
    id:'frozen', label:'Frozen', emoji:'❄️', category:'premium',
    preview:{ from:'#020c18', to:'#80c0ff', ac:'#c0e8ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(2,12,24,${((bga/100)*0.85).toFixed(2)})`,
      borderLeft:'1px solid rgba(128,192,255,0.3)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 16px rgba(128,192,255,0.12), 0 8px 32px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c8e8ff' }),
    css:``,
  },

  lava: {
    id:'lava', label:'Lava', emoji:'🌋', category:'premium',
    preview:{ from:'#0e0200', to:'#ff3300', ac:'#ff6600' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('140400','rgba(255,51,0,0.2)',{
      boxShadow:'0 0 18px rgba(255,60,0,0.20), 0 4px 16px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffc890' }),
    css:``,
  },

  spectral: {
    id:'spectral', label:'Spectral', emoji:'👻', category:'premium',
    preview:{ from:'#060410', to:'#6040c0', ac:'#80d0ff' },
    particleCount:12, particleOrigin:'bottom', dur:10, sizeMin:8, sizeMax:18, renderType:'div',
    extraPerParticle:(i)=>({
      color:['rgba(96,64,192,0.25)','rgba(128,208,255,0.20)','rgba(200,160,255,0.22)'][i%3],
    }),
    bubbleStyle: makeBubble('080614','rgba(96,64,192,0.18)',{
      backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
      boxShadow:'0 0 20px rgba(96,64,192,0.15), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c8d8ff' }),
    css:`.skin-particle-spectral{position:fixed;pointer-events:none;z-index:0;border-radius:50%;filter:blur(3px);animation:skinRise var(--dur,10s) var(--delay,0s) ease-in infinite;}`,
  },

  circuit: {
    id:'circuit', label:'Circuit', emoji:'🔌', category:'premium',
    preview:{ from:'#010810', to:'#004020', ac:'#00c060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('020c08','rgba(0,64,32,0.28)',{
      borderLeft:'2px solid rgba(0,192,96,0.3)',
      boxShadow:'0 0 10px rgba(0,192,96,0.15), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:()=>({ color:'#00c060', fontFamily:'"Courier New",monospace', letterSpacing:'0.06em' }),
    textStyle:()=>({ color:'#80e8b0', fontFamily:'"Courier New",monospace' }),
    css:`.skin-circuit-bg{position:fixed;inset:0;
      background-image:linear-gradient(rgba(0,192,96,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,192,96,0.04) 1px,transparent 1px);
      background-size:24px 24px;pointer-events:none;z-index:0;}`,
  },

  prism: {
    id:'prism', label:'Prism', emoji:'🔺', category:'premium',
    preview:{ from:'#060408', to:'#ff80ff', ac:'#80ffff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(6,4,8,${((bga/100)*0.82).toFixed(2)})`,
      borderLeft:'1px solid rgba(255,128,255,0.25)',
      borderTop:'1px solid rgba(128,255,255,0.12)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 20px rgba(200,128,255,0.10), 0 8px 32px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#e0d8ff' }),
    css:``,
  },

  tempest: {
    id:'tempest', label:'Tempest', emoji:'🌀', category:'premium',
    preview:{ from:'#040810', to:'#2060c0', ac:'#60a0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060a14','rgba(32,96,192,0.22)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c8ff' }),
    css:``,
  },

  bioluminescence: {
    id:'bioluminescence', label:'Bioluminescence', emoji:'🦋', category:'premium',
    preview:{ from:'#000c10', to:'#00d8b0', ac:'#00f8d0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('001018','rgba(0,216,176,0.18)',{
      boxShadow:'0 0 20px rgba(0,216,176,0.15), 0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0f8e0' }),
    css:``,
  },

  mosaic: {
    id:'mosaic', label:'Mosaic', emoji:'🎨', category:'premium',
    preview:{ from:'#080612', to:'#9060e0', ac:'#e08060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0c0818','rgba(144,96,224,0.22)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d8c8f8' }),
    css:``,
  },

  // ══════════════════════════════════════════════════════════
  // TIER 4 — Ultra Immersive
  // ══════════════════════════════════════════════════════════

  nebulacore: {
    id:'nebulacore', label:'Nebula Core', emoji:'🌌', category:'premium',
    preview:{ from:'#020010', to:'#6020d0', ac:'#c040ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040014','rgba(96,32,208,0.22)',{
      boxShadow:'0 0 24px rgba(160,64,255,0.15), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0b0ff' }),
    css:``,
  },

  eventhorizon: {
    id:'eventhorizon', label:'Event Horizon', emoji:'🕳️', category:'premium',
    preview:{ from:'#000000', to:'#400080', ac:'#8000ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('020008','rgba(64,0,128,0.25)',{
      boxShadow:'0 0 30px rgba(128,0,255,0.18), 0 8px 40px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c890ff' }),
    css:``,
  },

  quantumfoam: {
    id:'quantumfoam', label:'Quantum Foam', emoji:'⚛️', category:'premium',
    preview:{ from:'#040212', to:'#2040c0', ac:'#80c0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060318','rgba(32,64,192,0.22)',{
      boxShadow:'0 4px 24px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c8ff' }),
    css:``,
  },

  dragonscales: {
    id:'dragonscales', label:'Dragon Scales', emoji:'🐉', category:'premium',
    preview:{ from:'#060204', to:'#802010', ac:'#e04020' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0408','rgba(128,32,16,0.25)',{
      boxShadow:'0 0 20px rgba(200,64,32,0.18), 0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0c0a0' }),
    css:``,
  },

  abyssal: {
    id:'abyssal', label:'Abyssal', emoji:'🌊', category:'premium',
    preview:{ from:'#000510', to:'#001060', ac:'#002080' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('000814','rgba(0,16,96,0.30)',{
      boxShadow:'0 4px 24px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#6090d8' }),
    css:``,
  },

  stormfront: {
    id:'stormfront', label:'Storm Front', emoji:'⛈️', category:'premium',
    preview:{ from:'#050710', to:'#203060', ac:'#4080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080a16','rgba(32,48,96,0.28)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#90b8e8' }),
    css:``,
  },

  astralplane: {
    id:'astralplane', label:'Astral Plane', emoji:'✨', category:'premium',
    preview:{ from:'#020412', to:'#1020a0', ac:'#6080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('030518','rgba(16,32,160,0.22)',{
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 24px rgba(96,128,255,0.12), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0c4ff' }),
    css:``,
  },

  eclipse: {
    id:'eclipse', label:'Eclipse', emoji:'🌑', category:'premium',
    preview:{ from:'#080004', to:'#800010', ac:'#ff2020' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0c0008','rgba(128,0,16,0.22)',{
      boxShadow:'0 0 20px rgba(180,0,20,0.15), 0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffb0a0' }),
    css:``,
  },

  reactor: {
    id:'reactor', label:'Reactor', emoji:'☢️', category:'premium',
    preview:{ from:'#040800', to:'#406000', ac:'#80c000' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060c00','rgba(64,96,0,0.28)',{
      borderLeft:'2px solid rgba(128,192,0,0.3)',
      boxShadow:'0 0 16px rgba(128,192,0,0.15), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:()=>({ color:'#aaee00', fontFamily:'"Courier New",monospace', letterSpacing:'0.06em' }),
    textStyle:()=>({ color:'#c8f060', fontFamily:'"Courier New",monospace' }),
    css:``,
  },

  rift: {
    id:'rift', label:'Rift', emoji:'💥', category:'premium',
    preview:{ from:'#040212', to:'#6010c0', ac:'#c040ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060418','rgba(96,16,192,0.25)',{
      boxShadow:'0 0 24px rgba(160,64,255,0.18), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0a8ff' }),
    css:``,
  },

  aurora2: {
    id:'aurora2', label:'Aurora II', emoji:'🌌', category:'premium',
    preview:{ from:'#000a08', to:'#00ff90', ac:'#0080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('001408','rgba(0,200,128,0.18)',{
      boxShadow:'0 0 20px rgba(0,200,128,0.12), 0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0f8d0' }),
    css:``,
  },

  cosmicdust: {
    id:'cosmicdust', label:'Cosmic Dust', emoji:'💫', category:'premium',
    preview:{ from:'#020108', to:'#3010a0', ac:'#8060ff' },
    particleCount:36, particleOrigin:'fixed', dur:3, sizeMin:1, sizeMax:4, renderType:'div',
    extraPerParticle:(i)=>({
      color:['rgba(180,160,255,0.9)','rgba(255,220,255,0.85)','rgba(200,180,255,0.8)'][i%3],
      top:(i*37.1)%90+4,
    }),
    bubbleStyle: makeBubble('040210','rgba(48,16,160,0.22)',{
      boxShadow:'0 4px 24px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0c8ff' }),
    css:`.skin-particle-cosmicdust{position:fixed;pointer-events:none;z-index:0;border-radius:50%;animation:skinTwinkle var(--dur,3s) var(--delay,0s) ease-in-out infinite;}`,
  },

  volcanicglass: {
    id:'volcanicglass', label:'Volcanic Glass', emoji:'🌋', category:'premium',
    preview:{ from:'#0a0202', to:'#cc2200', ac:'#ff6600' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('120606','rgba(204,34,0,0.22)',{
      boxShadow:'0 0 20px rgba(255,60,0,0.18), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffc090' }),
    css:``,
  },

  singularity: {
    id:'singularity', label:'Singularity', emoji:'🌀', category:'premium',
    preview:{ from:'#000000', to:'#800080', ac:'#ff00ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040004','rgba(128,0,128,0.22)',{
      boxShadow:'0 0 30px rgba(200,0,200,0.18), 0 8px 40px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#f0c0ff' }),
    css:``,
  },

  tesseract: {
    id:'tesseract', label:'Tesseract', emoji:'🔷', category:'premium',
    preview:{ from:'#020418', to:'#0040c0', ac:'#40a0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('030620','rgba(0,64,192,0.22)',{
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 24px rgba(64,160,255,0.12), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c8ff' }),
    css:``,
  },

  deepspace: {
    id:'deepspace', label:'Deep Space', emoji:'🚀', category:'premium',
    preview:{ from:'#000005', to:'#0a0a30', ac:'#3040a0' },
    particleCount:48, particleOrigin:'fixed', dur:2, sizeMin:1, sizeMax:3, renderType:'div',
    extraPerParticle:(i)=>({
      color:['rgba(255,255,255,0.95)','rgba(200,220,255,0.85)','rgba(255,240,200,0.80)'][i%3],
      top:(i*43.7)%94+2,
    }),
    bubbleStyle: makeBubble('000208','rgba(10,10,48,0.30)',{
      boxShadow:'0 4px 24px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#8090d8' }),
    css:`.skin-particle-deepspace{position:fixed;pointer-events:none;z-index:0;border-radius:50%;animation:skinTwinkle var(--dur,2s) var(--delay,0s) ease-in-out infinite;}`,
  },

  tempestvortex: {
    id:'tempestvortex', label:'Tempest Vortex', emoji:'🌪️', category:'premium',
    preview:{ from:'#030818', to:'#104080', ac:'#2080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('050a1a','rgba(16,64,128,0.25)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#88beff' }),
    css:``,
  },

  phosphor: {
    id:'phosphor', label:'Phosphor', emoji:'💚', category:'premium',
    preview:{ from:'#010a02', to:'#00bb22', ac:'#44ff44' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('020e04','rgba(0,187,34,0.18)',{
      borderLeft:'2px solid rgba(0,187,34,0.35)',
      boxShadow:'0 0 12px rgba(0,187,34,0.18), 0 4px 16px rgba(0,0,0,0.7)',
    }),
    nameStyle:()=>({ color:'#00ee33', fontFamily:'"Courier New",monospace', letterSpacing:'0.06em' }),
    textStyle:()=>({ color:'#88ff99', fontFamily:'"Courier New",monospace' }),
    css:``,
  },

  crystalcave: {
    id:'crystalcave', label:'Crystal Cave', emoji:'💎', category:'premium',
    preview:{ from:'#050814', to:'#4060c0', ac:'#80a8ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(5,8,20,${((bga/100)*0.82).toFixed(2)})`,
      borderLeft:'1px solid rgba(128,168,255,0.3)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      boxShadow:'0 0 20px rgba(96,144,255,0.12), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b8d0ff' }),
    css:``,
  },

  arcanesigil: {
    id:'arcanesigil', label:'Arcane Sigil', emoji:'🔮', category:'premium',
    preview:{ from:'#060214', to:'#6020b0', ac:'#c060ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0a0418','rgba(96,32,176,0.25)',{
      boxShadow:'0 0 24px rgba(160,64,255,0.15), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0a8ff' }),
    css:``,
  },

  // ══════════════════════════════════════════════════════════
  // TIER 5 — GOAT Ultra
  // ══════════════════════════════════════════════════════════

  livingportrait: {
    id:'livingportrait', label:'Living Portrait', emoji:'🖼️', category:'premium',
    preview:{ from:'#080604', to:'#c0900a', ac:'#ffe080' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('0e0c08','rgba(192,144,10,0.22)',{
      borderLeft:'3px solid rgba(192,144,10,0.4)',
      boxShadow:'0 0 18px rgba(200,150,10,0.15), 0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:()=>({ color:'#f0c040', fontFamily:'"Georgia",serif', fontStyle:'italic' }),
    textStyle:()=>({ color:'#e8d8a8', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  cyberpunkrain2: {
    id:'cyberpunkrain2', label:'Cyberpunk Rain', emoji:'🌧️', category:'premium',
    preview:{ from:'#010010', to:'#cc0080', ac:'#00ccff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(1,0,16,${((bga/100)*0.90).toFixed(2)})`,
      borderLeft:'2px solid rgba(204,0,128,0.30)',
      boxShadow:'0 0 20px rgba(204,0,128,0.18), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Courier New",monospace', letterSpacing:'0.04em' }),
    textStyle:()=>({ color:'#f0b0ff', fontFamily:'"Courier New",monospace' }),
    css:`.skin-cyberpunkrain2-glow{position:fixed;inset:0;pointer-events:none;z-index:1;
      background:radial-gradient(ellipse 90% 25% at 50% 100%,rgba(204,0,128,0.08) 0%,transparent 70%);}`,
  },

  shogunsgarden: {
    id:'shogunsgarden', label:"Shogun's Garden", emoji:'🗾', category:'premium',
    preview:{ from:'#060806', to:'#2a5020', ac:'#60a050' },
    particleCount:18, particleOrigin:'top', dur:9, sizeMin:8, sizeMax:18, renderType:'div',
    extraPerParticle:(i)=>({
      color:['rgba(100,160,80,0.5)','rgba(80,130,60,0.45)','rgba(200,200,160,0.35)'][i%3],
    }),
    bubbleStyle: makeBubble('080a08','rgba(42,80,32,0.28)',{
      boxShadow:'0 4px 16px rgba(0,0,0,0.6)',
    }),
    nameStyle:()=>({ color:'#90c870', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif' }),
    textStyle:()=>({ color:'#c8e0b8', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif' }),
    css:`.skin-particle-shogunsgarden{position:fixed;pointer-events:none;z-index:0;border-radius:50% 0 50% 0;animation:skinLeafFall var(--dur,9s) var(--delay,0s) ease-in-out infinite;}`,
  },

  lovecraftian: {
    id:'lovecraftian', label:'Lovecraftian', emoji:'🦑', category:'premium',
    preview:{ from:'#020410', to:'#102040', ac:'#304060' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040618','rgba(16,32,64,0.30)',{
      boxShadow:'0 4px 24px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Georgia",serif', fontStyle:'italic' }),
    textStyle:()=>({ color:'#8090b0', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  timecrystal: {
    id:'timecrystal', label:'Time Crystal', emoji:'⌛', category:'premium',
    preview:{ from:'#040814', to:'#204080', ac:'#60a0ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(4,8,20,${((bga/100)*0.85).toFixed(2)})`,
      borderLeft:'1px solid rgba(96,160,255,0.25)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      boxShadow:'0 0 24px rgba(64,128,255,0.12), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a8c8ff' }),
    css:``,
  },

  neuralstorm: {
    id:'neuralstorm', label:'Neural Storm', emoji:'🧠', category:'premium',
    preview:{ from:'#050310', to:'#4010c0', ac:'#c040ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080514','rgba(64,16,192,0.22)',{
      boxShadow:'0 0 24px rgba(160,64,255,0.15), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0a8ff' }),
    css:``,
  },

  quantumentangle: {
    id:'quantumentangle', label:'Quantum Entangle', emoji:'🔗', category:'premium',
    preview:{ from:'#030412', to:'#1020b0', ac:'#6080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(3,4,18,${((bga/100)*0.85).toFixed(2)})`,
      borderLeft:'1px solid rgba(96,128,255,0.25)',
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 20px rgba(64,96,255,0.12), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0c4ff' }),
    css:``,
  },

  ghostprotocol: {
    id:'ghostprotocol', label:'Ghost Protocol', emoji:'👻', category:'premium',
    preview:{ from:'#030508', to:'#203040', ac:'#60a0c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(3,5,8,${((bga/100)*0.80).toFixed(2)})`,
      borderLeft:'1px solid rgba(96,160,192,0.20)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      boxShadow:'0 0 24px rgba(64,128,160,0.10), 0 8px 40px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Courier New",monospace', letterSpacing:'0.06em' }),
    textStyle:()=>({ color:'#90b8c8', fontFamily:'"Courier New",monospace' }),
    css:``,
  },

  forbiddencity: {
    id:'forbiddencity', label:'Forbidden City', emoji:'🏯', category:'premium',
    preview:{ from:'#100004', to:'#8a0010', ac:'#d04000' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('160008','rgba(138,0,16,0.28)',{
      borderLeft:'3px solid rgba(200,60,0,0.4)',
      boxShadow:'0 0 18px rgba(200,60,0,0.15), 0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:()=>({ color:'#e06020', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",serif', letterSpacing:'0.04em' }),
    textStyle:()=>({ color:'#f0c090', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",serif' }),
    css:``,
  },

  eldritchcodex: {
    id:'eldritchcodex', label:'Eldritch Codex', emoji:'📖', category:'premium',
    preview:{ from:'#050208', to:'#301050', ac:'#8040c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080412','rgba(48,16,80,0.30)',{
      boxShadow:'0 0 24px rgba(100,40,160,0.15), 0 8px 32px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Georgia",serif', fontStyle:'italic' }),
    textStyle:()=>({ color:'#c0a0d8', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  celestialorrery: {
    id:'celestialorrery', label:'Celestial Orrery', emoji:'🌍', category:'premium',
    preview:{ from:'#020410', to:'#102060', ac:'#4080ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040618','rgba(16,32,96,0.25)',{
      backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      boxShadow:'0 0 24px rgba(64,128,255,0.10), 0 8px 32px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0c0ff' }),
    css:``,
  },

  soundwave: {
    id:'soundwave', label:'Soundwave', emoji:'🎵', category:'premium',
    preview:{ from:'#040212', to:'#2010a0', ac:'#6040ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060318','rgba(32,16,160,0.22)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#c0b0ff' }),
    css:``,
  },

  mirrorworld: {
    id:'mirrorworld', label:'Mirror World', emoji:'🪞', category:'premium',
    preview:{ from:'#050510', to:'#2020a0', ac:'#6060ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(5,5,16,${((bga/100)*0.82).toFixed(2)})`,
      borderLeft:'1px solid rgba(96,96,255,0.25)',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      boxShadow:'0 0 20px rgba(96,96,255,0.10), 0 8px 40px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#b0b8ff' }),
    css:``,
  },

  wormhole: {
    id:'wormhole', label:'Wormhole', emoji:'🌀', category:'premium',
    preview:{ from:'#020010', to:'#5010c0', ac:'#c060ff' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040014','rgba(80,16,192,0.25)',{
      boxShadow:'0 0 28px rgba(160,64,255,0.18), 0 8px 40px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#d0a8ff' }),
    css:``,
  },

  dnahelix: {
    id:'dnahelix', label:'DNA Helix', emoji:'🧬', category:'premium',
    preview:{ from:'#020a14', to:'#0060c0', ac:'#c040c0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('040c18','rgba(0,96,192,0.22)',{
      boxShadow:'0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#a0d0ff' }),
    css:``,
  },

  volcaniceruption: {
    id:'volcaniceruption', label:'Volcanic Eruption', emoji:'🌋', category:'premium',
    preview:{ from:'#120200', to:'#ff2200', ac:'#ff8800' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('160400','rgba(255,34,0,0.22)',{
      boxShadow:'0 0 24px rgba(255,80,0,0.22), 0 8px 32px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#ffc080' }),
    css:``,
  },

  sentientslime: {
    id:'sentientslime', label:'Sentient Slime', emoji:'🫧', category:'premium',
    preview:{ from:'#020c04', to:'#10a020', ac:'#40ff60' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('041008','rgba(16,160,32,0.20)',{
      backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
      boxShadow:'0 0 20px rgba(32,255,64,0.12), 0 4px 20px rgba(0,0,0,0.7)',
    }),
    nameStyle:()=>({ color:'#40ff60' }),
    textStyle:()=>({ color:'#a0ffb0' }),
    css:``,
  },

  akashicrecord: {
    id:'akashicrecord', label:'Akashic Record', emoji:'📚', category:'premium',
    preview:{ from:'#040210', to:'#401080', ac:'#8040d0' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('080418','rgba(64,16,128,0.28)',{
      boxShadow:'0 0 24px rgba(120,48,200,0.15), 0 8px 32px rgba(0,0,0,0.9)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Georgia",serif' }),
    textStyle:()=>({ color:'#c8a8f0', fontFamily:'"Georgia",serif' }),
    css:``,
  },

  realityglitch: {
    id:'realityglitch', label:'Reality Glitch', emoji:'📺', category:'premium',
    preview:{ from:'#040410', to:'#0040c0', ac:'#00ffaa' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle: makeBubble('060618','rgba(0,64,192,0.22)',{
      borderLeft:'2px solid rgba(0,255,170,0.25)',
      boxShadow:'0 0 18px rgba(0,64,192,0.18), 0 4px 20px rgba(0,0,0,0.8)',
    }),
    nameStyle:(u)=>({ color:u, fontFamily:'"Courier New",monospace' }),
    textStyle:()=>({ color:'#80ffcc', fontFamily:'"Courier New",monospace' }),
    css:``,
  },

  thevoid: {
    id:'thevoid', label:'The Void', emoji:'🕳️', category:'premium',
    preview:{ from:'#000000', to:'#100020', ac:'#400080' },
    particleCount:0, particleOrigin:'top', dur:0, sizeMin:0, sizeMax:0, renderType:'div',
    bubbleStyle:(_u,_ac,bga=80)=>({
      background:`rgba(0,0,0,${((bga/100)*0.92).toFixed(2)})`,
      borderLeft:'1px solid rgba(80,0,160,0.30)',
      boxShadow:'0 0 30px rgba(60,0,120,0.20), 0 8px 40px rgba(0,0,0,0.95)',
    }),
    nameStyle:(u)=>({ color:u }),
    textStyle:()=>({ color:'#8060c0' }),
    css:``,
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
// SKIN_CANVAS_RENDERERS — map skinId → canvas component JSX
// ============================================================
const SKIN_CANVAS_RENDERERS = {
  // originals
  aurora:           () => <><AuroraCanvas /><div className="skin-aurora-stars"/></>,
  neonrain:         () => <><NeonRainCanvas /><div className="skin-neonrain-glow"/></>,
  // tier 2
  midnight:         () => <FloatOrbCanvas colors={[[30,60,200],[80,40,255],[0,100,255]]} />,
  rosegold:         () => <FloatOrbCanvas colors={[[220,120,140],[180,80,100],[255,160,170]]} />,
  amberhaze:        () => <FloatOrbCanvas colors={[[220,140,20],[200,100,10],[255,180,40]]} />,
  deepforest:       () => <FloatOrbCanvas colors={[[20,100,30],[40,140,50],[10,80,20]]} />,
  burgundy:         () => <FloatOrbCanvas colors={[[140,20,50],[100,10,30],[180,30,60]]} />,
  dusk2:            () => <FloatOrbCanvas colors={[[120,50,220],[200,120,20],[80,20,180]]} />,
  bordeaux:         () => <FloatOrbCanvas colors={[[100,8,36],[140,15,50],[80,5,25]]} />,
  espresso:         () => <FloatOrbCanvas colors={[[80,40,20],[60,30,10],[100,50,25]]} />,
  reef:             () => <FloatOrbCanvas colors={[[0,120,200],[0,180,220],[0,80,160]]} />,
  northernpine:     () => <FloatOrbCanvas colors={[[20,80,60],[30,110,80],[10,60,45]]} />,
  peachfuzz:        () => <FloatOrbCanvas colors={[[255,160,120],[230,130,100],[255,190,150]]} />,
  dustyrose:        () => <FloatOrbCanvas colors={[[200,130,140],[170,100,110],[220,150,160]]} />,
  moonstone:        () => <FrostCanvas />,
  cerulean:         () => <FloatOrbCanvas colors={[[0,80,200],[20,120,230],[0,60,160]]} />,
  chrome:           () => <HolographicCanvas />,
  titanium:         () => <HolographicCanvas />,
  // tier 3
  holographic:      () => <HolographicCanvas />,
  liquidmetal:      () => <HolographicCanvas />,
  prism:            () => <HolographicCanvas />,
  quantumentangle:  () => <HolographicCanvas />,
  cybergrid2:       () => <LightningCanvas color={[0,64,255]} />,
  thunder:          () => <LightningCanvas color={[48,96,255]} />,
  circuit:          () => <LightningCanvas color={[0,192,96]} />,
  stormfront:       () => <LightningCanvas color={[64,128,255]} />,
  phosphor:         () => <LightningCanvas color={[0,187,34]} />,
  lava:             () => <FluidCanvas colors={[[255,51,0],[200,20,0],[255,120,0]]} />,
  reactor:          () => <FluidCanvas colors={[[100,180,0],[80,160,0],[128,200,0]]} />,
  sentientslime:    () => <FluidCanvas colors={[[16,200,32],[10,160,20],[32,255,48]]} />,
  volcanicglass:    () => <FluidCanvas colors={[[200,30,0],[160,15,0],[255,80,0]]} />,
  frozen:           () => <FrostCanvas />,
  crystalcave:      () => <FrostCanvas />,
  tempest:          () => <VortexCanvas color={[32,96,200]} />,
  singularity:      () => <VortexCanvas color={[200,0,200]} />,
  wormhole:         () => <VortexCanvas color={[128,16,255]} />,
  mirage:           () => <VortexCanvas color={[64,128,255]} />,
  tempestvortex:    () => <VortexCanvas color={[16,96,200]} />,
  katana2:          () => <GlitchCanvas color={[150,30,255]} />,
  realityglitch:    () => <GlitchCanvas color={[0,180,255]} />,
  timecrystal:      () => <GlitchCanvas color={[64,160,255]} />,
  ghostprotocol:    () => <GlitchCanvas color={[80,160,192]} />,
  mirrorworld:      () => <GlitchCanvas color={[96,96,255]} />,
  mosaic:           () => <GlitchCanvas color={[180,100,255]} />,
  rift:             () => <GlitchCanvas color={[180,40,255]} />,
  inkwash:          () => <InkWashCanvas color={[10,8,20]} />,
  forbiddencity:    () => <InkWashCanvas color={[100,10,0]} />,
  eldritchcodex:    () => <InkWashCanvas color={[30,8,60]} />,
  akashicrecord:    () => <InkWashCanvas color={[40,10,80]} />,
  arcanesigil:      () => <InkWashCanvas color={[60,10,120]} />,
  shogunsgarden:    () => <SandRippleCanvas />,
  bioluminescence:  () => <BioluminescenceCanvas />,
  deepocean:        () => <BioluminescenceCanvas />,
  abyssal:          () => <BioluminescenceCanvas />,
  bloodmoon:        () => <BloodMoonCanvas />,
  eclipse:          () => <BloodMoonCanvas />,
  neuralstorm:      () => <NeuralCanvas color={[180,0,255]} />,
  quantumfoam:      () => <NeuralCanvas color={[32,80,220]} />,
  lovecraftian:     () => <NeuralCanvas color={[16,40,80]} />,
  // tier 4
  celestialorrery:  () => <CelestialCanvas type="orrery" />,
  tesseract:        () => <CelestialCanvas type="hypercube" />,
  eventhorizon:     () => <CelestialCanvas type="blackhole" />,
  astralplane:      () => <CelestialCanvas type="mandala" />,
  wildfire:         () => <EmberCanvas colors={[[255,80,0],[255,40,0],[255,160,0]]} />,
  emberstorm:       () => <EmberCanvas colors={[[255,90,0],[220,30,0],[255,180,0]]} />,
  volcaniceruption: () => <EmberCanvas colors={[[255,30,0],[220,10,0],[255,100,0]]} />,
  dnahelix:         () => <DNAHelixCanvas />,
  soundwave:        () => <SoundwaveCanvas />,
  dragonscales:     () => <DragonScalesCanvas />,
  thevoid:          () => <ExplosionCanvas />,
  // tier 4 orbs
  nebulacore:       () => <FloatOrbCanvas colors={[[100,20,220],[160,40,255],[60,10,180]]} />,
  cosmicdust:       () => <FloatOrbCanvas colors={[[160,130,255],[200,170,255],[180,150,255]]} />,
  deepspace:        () => <FloatOrbCanvas colors={[[10,10,80],[20,20,120],[5,5,60]]} />,
  seraphim:         () => <FloatOrbCanvas colors={[[200,150,255],[255,220,100],[255,180,180]]} />,
  neondusk:         () => <FloatOrbCanvas colors={[[200,20,160],[255,100,20],[160,10,120]]} />,
  sakurastorm2:     () => <FloatOrbCanvas colors={[[255,150,180],[255,200,210],[255,120,160]]} />,
  livingportrait:   () => <FloatOrbCanvas colors={[[200,150,10],[180,130,8],[220,170,15]]} />,
  // tier 4 misc
  aurora2:          () => <AuroraCanvas />,
  cyberpunkrain2:   () => <><NeonRainCanvas /><div className="skin-cyberpunkrain2-glow"/></>,
};

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

  // lookup canvas renderer
  const canvasRenderer = SKIN_CANVAS_RENDERERS[skinId];

  // CSS overlay divs (non-canvas)
  const overlayDivs = {
    cyber:      <><div className="skin-cyber-scanline"/><div className="skin-cyber-scanline2"/><div className="skin-cyber-grid"/></>,
    galaxy:     <div className="skin-galaxy-nebula"/>,
    sakura:     <div className="skin-sakura-bloom"/>,
    witch:      <div className="skin-witch-mist"/>,
    obsidian:   <div className="skin-obsidian-bg"/>,
    studio:     <div className="skin-studio-bg"/>,
    fog:        <div className="skin-fog-bg"/>,
    vapor:      <div className="skin-vapor-bg"/>,
    blueprint:  <div className="skin-blueprint-bg"/>,
    noir:       <div className="skin-noir-vignette"/>,
    deepforest: <div className="skin-deepforest-bg"/>,
    dusk2:      <div className="skin-dusk2-bg"/>,
    cybergrid2: <div className="skin-cybergrid2-bg"/>,
    circuit:    <div className="skin-circuit-bg"/>,
  };

  return (
    <>
      <style>{SHARED_KEYFRAMES + skin.css}</style>

      {/* Canvas renderer (if any) */}
      {canvasRenderer?.()}

      {/* CSS overlay divs */}
      {overlayDivs[skinId] ?? null}

      {/* Particle elements */}
      {particles.map(p => (
        <SkinParticleEl key={p.id} p={p} skin={skin} />
      ))}
    </>
  );
}
