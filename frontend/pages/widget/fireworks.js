// widget/fireworks.js — Gift Fireworks Overlay
// OBS Size: 800 × 800 — transparent background
// Triggered by Gift events via socket
// Rocket = sender avatar (circle), explosion particles = gift image/emoji
// Display name fades in after explosion

import { useEffect, useRef } from 'react';
import Head from 'next/head';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

const W = 800;
const H = 800;
const AVATAR_R = 22;        // rocket avatar radius (px)
const PARTICLE_COUNT = 28;  // particles per explosion
const TRAIL_LEN = 10;       // trail dot count

// ── Easing ──────────────────────────────────────────────────────────────────
const easeOutCubic  = t => 1 - Math.pow(1 - t, 3);
const easeOutQuart  = t => 1 - Math.pow(1 - t, 4);

// ── Image loader (with CORS + timeout) ──────────────────────────────────────
function loadImage(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload  = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

// ── Draw a circular-clipped image ──────────────────────────────────────────
function drawCircleImg(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

// ── Build a rocket object ──────────────────────────────────────────────────
function makeRocket({ avatarImg, giftImg, giftEmoji, senderName, giftName, coins }) {
  const startX  = W * 0.08 + Math.random() * W * 0.84;
  const startY  = H + AVATAR_R + 4;

  // Explosion point: avoid very top (top fade zone) and edges
  const targetX = W * 0.12 + Math.random() * W * 0.76;
  const targetY = H * 0.12 + Math.random() * H * 0.48; // 12%–60% from top

  // Wind: random drift direction, consistent per rocket
  const windAmp = (Math.random() - 0.5) * 60; // ±60px max at peak

  // Speed: easeOut progress increment — vary per rocket
  const baseSpeed = 0.007 + Math.random() * 0.006;

  // Store trailing positions for smoke trail
  const trail = [];

  // Particles (populated at explosion)
  const particles = [];

  return {
    startX, startY,
    targetX, targetY,
    windAmp,
    x: startX, y: startY,

    progress:  0,        // 0 → 1 launch progress
    baseSpeed,
    trail,

    avatarImg, giftImg,
    giftEmoji: giftEmoji || '🎁',
    senderName: senderName || '',
    giftName:   giftName   || '',
    coins:      coins      || 0,

    phase:      'launch', // 'launch' | 'explode'
    particles,
    labelAlpha: 0,
    labelTimer: 0,
    done:       false,
  };
}

// ── Create explosion particles ───────────────────────────────────────────────
function explode(r) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 2.0 + Math.random() * 4.0;
    r.particles.push({
      x:        r.targetX,
      y:        r.targetY,
      vx:       Math.cos(angle) * speed,
      vy:       Math.sin(angle) * speed - 0.8, // slight upward bias at burst
      gravity:  0.07 + Math.random() * 0.07,
      alpha:    0.85 + Math.random() * 0.15,
      decay:    0.010 + Math.random() * 0.012,
      size:     22 + Math.random() * 18,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
    });
  }
}

// ── Update + draw one rocket each frame ─────────────────────────────────────
function tickRocket(ctx, r) {
  if (r.phase === 'launch') {
    // Progress advances fast then slows (easeOut effect via damping)
    const remaining = 1 - r.progress;
    r.progress += r.baseSpeed * (0.3 + remaining * 1.4); // decelerate near target

    const t  = easeOutQuart(Math.min(r.progress, 1));
    const sx = Math.sin(t * Math.PI) * r.windAmp; // wind arc: 0→peak→0

    r.x = r.startX + (r.targetX - r.startX) * t + sx;
    r.y = r.startY + (r.targetY - r.startY) * t;

    // Store trail
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > TRAIL_LEN) r.trail.shift();

    // Draw smoke trail
    for (let i = 0; i < r.trail.length; i++) {
      const f   = i / r.trail.length; // 0=oldest, 1=newest
      const pt  = r.trail[i];
      const rad = 2 + f * (AVATAR_R * 0.6);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,80,${f * 0.55})`;
      ctx.fill();
    }

    // Draw rocket avatar (or glowing dot fallback)
    ctx.save();
    ctx.shadowColor = 'rgba(255,220,60,0.9)';
    ctx.shadowBlur  = 18;
    if (r.avatarImg) {
      drawCircleImg(ctx, r.avatarImg, r.x, r.y, AVATAR_R);
      ctx.beginPath();
      ctx.arc(r.x, r.y, AVATAR_R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,210,60,0.85)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(r.x, r.y, AVATAR_R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,220,60,0.95)';
      ctx.fill();
      // Person icon (tiny)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = `${AVATAR_R * 1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', r.x, r.y);
    }
    ctx.restore();

    if (r.progress >= 1) {
      r.phase = 'explode';
      r.x = r.targetX;
      r.y = r.targetY;
      explode(r);
    }

  } else if (r.phase === 'explode') {
    let alive = false;

    for (const p of r.particles) {
      if (p.alpha <= 0) continue;
      alive = true;

      p.vx  *= 0.985;             // air drag
      p.vy  += p.gravity;
      p.x   += p.vx;
      p.y   += p.vy;
      p.alpha -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (r.giftImg) {
        ctx.drawImage(r.giftImg, -p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.font = `${p.size}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.giftEmoji, 0, 0);
      }
      ctx.restore();
    }

    // ── Label: fade in after 10 frames, hold, then fade out ──
    r.labelTimer++;
    if (r.labelTimer > 8 && r.labelAlpha < 1) {
      r.labelAlpha = Math.min(1, r.labelAlpha + 0.07);
    }
    if (r.labelTimer > 110) {
      r.labelAlpha = Math.max(0, r.labelAlpha - 0.025);
    }

    if (r.labelAlpha > 0) {
      const lx = r.targetX;
      const ly = r.targetY + AVATAR_R + 34;

      ctx.save();
      ctx.globalAlpha = r.labelAlpha;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // Name
      ctx.font = 'bold 20px "Noto Sans Thai", system-ui, sans-serif';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 8;
      ctx.fillStyle    = '#ffffff';
      ctx.fillText(r.senderName, lx, ly);

      // Gift + coins subtitle
      ctx.font = '14px "Noto Sans Thai", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,210,60,0.95)';
      ctx.shadowBlur = 5;
      ctx.fillText(`${r.giftName}  ·  ${r.coins.toLocaleString()} 💎`, lx, ly + 24);

      ctx.restore();
    }

    if (!alive && r.labelTimer > 140) {
      r.done = true;
    }
  }
}

// ── Main component ──────────────────────────────────────────────────────────
export default function FireworksWidget() {
  const canvasRef = useRef(null);
  const rocketsRef = useRef([]);
  const runningRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── Animation loop ──
    let raf;
    const loop = () => {
      if (!runningRef.current) return;

      // Clear with transparency
      ctx.clearRect(0, 0, W, H);

      // Tick all rockets
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        tickRocket(ctx, rockets[i]);
        if (rockets[i].done) rockets.splice(i, 1);
      }

      // ── Top edge fade (destination-out punch out pixels at top) ──
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const fadeH = H * 0.18; // fade zone height
      const grad  = ctx.createLinearGradient(0, 0, 0, fadeH);
      grad.addColorStop(0,   'rgba(0,0,0,0.90)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.30)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, fadeH);
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ── Spawn rocket helper ──
    async function spawnFromGift(data) {
      const safe = sanitizeEvent(data);
      if (safe.diamondCount <= 0) return;

      // Load avatar + gift image concurrently (non-blocking)
      const [avatarImg, giftImg] = await Promise.all([
        loadImage(safeTikTokImageUrl(safe.profilePictureUrl)),
        loadImage(safe.giftPictureUrl),
      ]);

      rocketsRef.current.push(makeRocket({
        avatarImg,
        giftImg,
        giftEmoji: safe.giftName ? '🎁' : '🎁',
        senderName: safe.nickname,
        giftName:   safe.giftName,
        coins:      safe.diamondCount * safe.repeatCount,
      }));
    }

    // ── Preview mode ──
    const params   = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === '1';

    if (isPreview) {
      const demoGifts = [
        { nickname: 'ทดสอบพลุ', giftName: 'Rose',    diamondCount: 1,    repeatCount: 1  },
        { nickname: 'แฟนคลับ',  giftName: 'Galaxy',  diamondCount: 500,  repeatCount: 1  },
        { nickname: 'Supporter', giftName: 'Lion',    diamondCount: 29999, repeatCount: 1 },
      ];
      let idx = 0;
      const fireDemo = () => {
        if (!runningRef.current) return;
        spawnFromGift(demoGifts[idx % demoGifts.length]);
        idx++;
      };
      fireDemo();
      const demoTimer = setInterval(fireDemo, 3000);
      return () => {
        runningRef.current = false;
        cancelAnimationFrame(raf);
        clearInterval(demoTimer);
      };
    }

    // ── Socket connection ──
    const wt     = params.get('cid') ?? params.get('wt');
    let socket   = null;
    if (wt) {
      socket = createWidgetSocket(wt, {
        gift: spawnFromGift,
      });
    }

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(raf);
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Gift Fireworks</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { background: transparent !important; overflow: hidden; width: ${W}px; height: ${H}px; }
        `}</style>
      </Head>
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H, display: 'block', background: 'transparent' }}
      />
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
