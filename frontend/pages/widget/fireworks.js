// widget/fireworks.js — Gift Fireworks Overlay
// OBS Size: 800 × 800 — transparent background
// Rocket = sender avatar (circle), explosion particles = gift image/emoji
// Physics: launch from bottom (random X), drift by wind to targetX, random targetY
// URL params: cid=<token>  preview=1

import { useEffect, useRef } from 'react';
import Head from 'next/head';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

const W = 800;
const H = 800;
const AVATAR_R       = 22;   // rocket avatar radius (px)
const PARTICLE_COUNT = 10;   // particles per explosion
const PARTICLE_TRAIL = 16;  // trail points ต่อ particle (เหมือนเส้นหางพลุจริง)
const TRAIL_LEN      = 12;   // trail dot count
const LAUNCH_MS      = 3000; // ms to reach explosion point (aligned to audio)
const EXPLODE_MS     = 3200; // ms explosion animation stays alive

// ── Easing ──────────────────────────────────────────────────────────────────
const easeOutQuad = t => 1 - (1 - t) * (1 - t);

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
function makeRocket({ avatarImg, giftImg, giftEmoji, senderName, giftName, coins, patterns, pcount }) {
  // Launch: random X at bottom edge, Y fixed at bottom
  const startX = W * 0.08 + Math.random() * W * 0.84;
  const startY = H + AVATAR_R + 4;

  // Wind drift: determines how far the rocket drifts horizontally
  const windDrift = (Math.random() - 0.5) * 380; // ±190px max drift

  // Explosion point: X follows startX + wind, Y is random height
  const targetX = Math.max(W * 0.07, Math.min(W * 0.93, startX + windDrift));
  const targetY = H * 0.10 + Math.random() * H * 0.45; // 10%–55% from top

  return {
    startX, startY,
    targetX, targetY,
    x: startX, y: startY,

    startTime:   Date.now(),
    explodeTime: null,  // set when explosion starts

    trail: [],
    particles: [],

    avatarImg, giftImg,
    giftEmoji:  giftEmoji || '🎁',
    senderName: senderName || '',
    giftName:   giftName   || '',
    coins:      coins      || 0,
    patterns:   patterns   || ALL_PATTERNS,
    pcount:     [10, 20, 30].includes(pcount) ? pcount : 10,

    phase:      'launch',   // 'launch' | 'explode'
    labelAlpha: 0,
    done:       false,
  };
}

// ── Create explosion particles (random pattern + count + flash) ──────────────
const ALL_PATTERNS = ['ring', 'willow', 'scatter', 'star', 'fan'];

function explode(r) {
  // สุ่ม pattern จากที่ผู้ใช้เลือก และจำนวน particle ทุกครั้ง
  const pool  = (r.patterns && r.patterns.length > 0) ? r.patterns : ALL_PATTERNS;
  r.pattern   = pool[Math.floor(Math.random() * pool.length)];
  const count = r.pcount || 10; // จำนวนสะเก็ด: 10 | 20 | 30 จาก customize

  // Flash วงกลมสว่างวูบที่จุดระเบิด
  r.flash = { alpha: 1.0, radius: 10 };

  for (let i = 0; i < count; i++) {
    let angle, speed, gravity;

    if (r.pattern === 'ring') {
      // สม่ำเสมอรอบวง — เหมือนพลุดอกไม้จริง
      angle   = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      speed   = 5.5 + Math.random() * 2.5;
      gravity = 0.055 + Math.random() * 0.03;
    } else if (r.pattern === 'willow') {
      // พุ่งขึ้นแล้วโค้งตกลงมาเหมือนต้นหลิว — ครึ่งบนของวง
      angle   = -Math.PI + Math.random() * Math.PI;
      speed   = 3.5 + Math.random() * 5.5;
      gravity = 0.10 + Math.random() * 0.05;
    } else if (r.pattern === 'star') {
      // แฉกสลับเร็ว-ช้า → เกิดรูปดาว
      angle   = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      speed   = i % 2 === 0 ? 7.5 + Math.random() * 2 : 3.5 + Math.random() * 1.5;
      gravity = 0.05 + Math.random() * 0.03;
    } else if (r.pattern === 'fan') {
      // พุ่งขึ้นครึ่งวงบนเหมือนพัด
      angle   = -Math.PI + (count > 1 ? (i / (count - 1)) : 0.5) * Math.PI + (Math.random() - 0.5) * 0.3;
      speed   = 5 + Math.random() * 4;
      gravity = 0.05 + Math.random() * 0.03;
    } else {
      // scatter — สุ่มทิศทางและความเร็วอิสระ
      angle   = Math.random() * Math.PI * 2;
      speed   = 2 + Math.random() * 9;
      gravity = 0.05 + Math.random() * 0.05;
    }

    const upBias = r.pattern === 'willow' ? 2.2 : 1.2;
    r.particles.push({
      x:        r.targetX,
      y:        r.targetY,
      vx:       Math.cos(angle) * speed,
      vy:       Math.sin(angle) * speed - upBias,
      gravity,
      alpha:    0.95 + Math.random() * 0.05,
      decay:    0.0032 + Math.random() * 0.003,
      size:     26 + Math.random() * 16,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      trail:    [],
    });
  }
}

// ── Update + draw one rocket each frame ─────────────────────────────────────
function tickRocket(ctx, r, now) {
  if (r.phase === 'launch') {
    const elapsed = now - r.startTime;
    const t       = Math.min(elapsed / LAUNCH_MS, 1);  // 0 → 1 over 3 s exactly

    // Y: eased (decelerates naturally like a rocket losing momentum)
    const easedY = easeOutQuad(t);
    // X: linear wind drift (consistent wind direction throughout flight)
    r.x = r.startX + (r.targetX - r.startX) * t;
    r.y = r.startY + (r.targetY - r.startY) * easedY;

    // Store trail
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > TRAIL_LEN) r.trail.shift();

    // Draw smoke trail
    for (let i = 0; i < r.trail.length; i++) {
      const f   = i / r.trail.length;
      const pt  = r.trail[i];
      const rad = 2 + f * (AVATAR_R * 0.55);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,80,${f * 0.55})`;
      ctx.fill();
    }

    // Draw rocket avatar
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
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.font = `${AVATAR_R * 1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', r.x, r.y);
    }
    ctx.restore();

    // Trigger explosion at exactly LAUNCH_MS (3 s)
    if (t >= 1) {
      r.phase      = 'explode';
      r.explodeTime = now;
      r.x = r.targetX;
      r.y = r.targetY;
      explode(r);
    }

  } else if (r.phase === 'explode') {
    const explodeElapsed = now - r.explodeTime;
    let alive = false;

    // ── Flash วูบ ──────────────────────────────────────────────────────────
    if (r.flash && r.flash.alpha > 0) {
      r.flash.radius += 14;          // ขยายเร็ว
      r.flash.alpha  -= 0.07;        // จาง ~14 frames ≈ 0.23 วิ
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.flash.alpha);
      // วงนอก (ส้ม-ขาว)
      ctx.beginPath();
      ctx.arc(r.targetX, r.targetY, r.flash.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,230,160,1)';
      ctx.fill();
      // วงในสว่างกว่า (ขาวสุด)
      ctx.beginPath();
      ctx.arc(r.targetX, r.targetY, r.flash.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,230,1)';
      ctx.fill();
      ctx.restore();
    }

    for (const p of r.particles) {
      if (p.alpha <= 0) continue;
      alive = true;

      // บันทึกตำแหน่งก่อนขยับ → ใช้วาดหาง
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > PARTICLE_TRAIL) p.trail.shift();

      p.vx  *= 0.982;
      p.vy  += p.gravity;
      p.x   += p.vx;
      p.y   += p.vy;
      p.alpha -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.alpha <= 0) continue;

      // ── วาดเส้นหาง (trail) ──────────────────────────────────────────────
      if (p.trail.length > 1) {
        ctx.save();
        for (let t = 1; t < p.trail.length; t++) {
          const f    = t / p.trail.length;          // 0 = เก่า, 1 = ใหม่
          const prev = p.trail[t - 1];
          const curr = p.trail[t];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = `rgba(255,220,120,${f * f * p.alpha * 0.85})`;
          ctx.lineWidth   = f * 3.5;
          ctx.lineCap     = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── วาด gift image / emoji ที่หัว particle ──────────────────────────
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

    // ── Label fade: appear quickly, hold, fade out near end ──
    const fadeInEnd  = 400;   // ms: fully visible
    const fadeOutStart = explodeElapsed > 2400; // start fading at 2.4 s after explosion

    if (explodeElapsed < fadeInEnd) {
      r.labelAlpha = Math.min(1, explodeElapsed / fadeInEnd);
    } else if (fadeOutStart) {
      const fadeElapsed = explodeElapsed - 2400;
      r.labelAlpha = Math.max(0, 1 - fadeElapsed / 700);
    } else {
      r.labelAlpha = 1;
    }

    if (r.labelAlpha > 0) {
      const lx = r.targetX;
      const ly = r.targetY + AVATAR_R + 36;

      ctx.save();
      ctx.globalAlpha  = r.labelAlpha;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 20px "Noto Sans Thai", system-ui, sans-serif';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 8;
      ctx.fillStyle    = '#ffffff';
      ctx.fillText(r.senderName, lx, ly);

      ctx.font = '14px "Noto Sans Thai", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,210,60,0.95)';
      ctx.shadowBlur = 5;
      ctx.fillText(`${r.giftName}  ·  ${r.coins.toLocaleString()} 💎`, lx, ly + 24);

      ctx.restore();
    }

    // Done when particles all gone + animation held for EXPLODE_MS
    if (!alive && explodeElapsed > EXPLODE_MS) {
      r.done = true;
    }
    // Force done after 3.5 s even if something's still faintly visible
    if (explodeElapsed > 3500) {
      r.done = true;
    }
  }
}

// ── Web Audio helpers (OBS-safe — ไม่ถูก autoplay block) ───────────────────
let _audioCtx    = null;
let _fireworkBuf = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // OBS CEF: resume ทุกครั้งเพื่อหลีกเลี่ยง suspended state
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

async function preloadFirework() {
  try {
    const ctx = getAudioCtx();
    const res  = await fetch('/sfx/firework.mp3');
    const buf  = await res.arrayBuffer();
    _fireworkBuf = await ctx.decodeAudioData(buf);
  } catch (_) {}
}

function playFirework(vol) {
  if (!_fireworkBuf || vol <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    const src  = ctx.createBufferSource();
    src.buffer = _fireworkBuf;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, vol));
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
  } catch (_) {}
}

// ── Main component ──────────────────────────────────────────────────────────
export default function FireworksWidget() {
  const canvasRef  = useRef(null);
  const rocketsRef = useRef([]);
  const runningRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const params = new URLSearchParams(window.location.search);

    // ── Preload audio ──
    preloadFirework();

    // ── Animation loop ──
    let raf;
    const loop = () => {
      if (!runningRef.current) return;

      ctx.clearRect(0, 0, W, H);

      const now     = Date.now();
      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        tickRocket(ctx, rockets[i], now);
        if (rockets[i].done) rockets.splice(i, 1);
      }

      // ── Top edge fade ──
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const fadeH = H * 0.18;
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

    // ── Volume (from URL param ?vol=0-100, default 80) ──
    const volParam = parseInt(params.get('vol') ?? '80');
    const volume   = Math.max(0, Math.min(100, isNaN(volParam) ? 80 : volParam)) / 100;

    // ── Patterns (from URL param ?patterns=ring,willow,... default all) ──
    const patternsParam = params.get('patterns') ?? 'ring,willow,scatter,star,fan';
    const activePatterns = patternsParam.split(',').filter(p => ALL_PATTERNS.includes(p));
    const explodePatterns = activePatterns.length > 0 ? activePatterns : ALL_PATTERNS;

    // ── Particle count (from URL param ?pcount=10|20|30, default 10) ──
    const pcountParam = parseInt(params.get('pcount') ?? '10');
    const explodePcount = [10, 20, 30].includes(pcountParam) ? pcountParam : 10;

    // ── Spawn rocket + play sound ──
    // isRepeatEnd=false (intermediate combo tap) → จุด 1 ลูกทันที
    // isRepeatEnd=true + isStreakable=true (combo final) → ไม่จุดซ้ำ (จุดครบแล้วทีละ tap)
    // isRepeatEnd=true + isStreakable=false (non-combo) → จุด repeatCount ลูก ทยอย delay
    async function spawnFromGift(data) {
      const safe = sanitizeEvent(data);
      if (safe.diamondCount <= 0) return;

      // Combo final event — ไม่จุดซ้ำ (แต่ละ tap จุดไปแล้ว)
      if (data.isRepeatEnd === true && data.isStreakable === true) return;

      // Load avatar + gift image ครั้งเดียว แชร์ทุก rocket
      const [avatarImg, giftImg] = await Promise.all([
        loadImage(safeTikTokImageUrl(safe.profilePictureUrl)),
        loadImage(safe.giftPictureUrl),
      ]);

      const spawnOne = () => {
        if (!runningRef.current) return;
        playFirework(volume);
        rocketsRef.current.push(makeRocket({
          avatarImg,
          giftImg,
          giftEmoji:  '🎁',
          senderName: safe.nickname,
          giftName:   safe.giftName,
          coins:      safe.diamondCount,
          patterns:   explodePatterns,
          pcount:     explodePcount,
        }));
      };

      if (data.isRepeatEnd === false) {
        // Intermediate tap → จุด 1 ลูกทันที
        spawnOne();
      } else {
        // Non-combo gift (repeatCount อาจ > 1) → ทยอย delay
        const count = Math.max(1, Math.min(safe.repeatCount || 1, 50));
        const GAP_MS = count <= 3 ? 400 : count <= 10 ? 300 : 200;
        for (let i = 0; i < count; i++) {
          setTimeout(spawnOne, i * GAP_MS);
        }
      }
    }

    // ── Preview mode ──
    const isPreview = params.get('preview') === '1';

    if (isPreview) {
      const demoGifts = [
        { nickname: 'ทดสอบพลุ',  giftName: 'Rose',   diamondCount: 1,     repeatCount: 3  },
        { nickname: 'แฟนคลับ',   giftName: 'Galaxy', diamondCount: 500,   repeatCount: 5  },
        { nickname: 'Supporter',  giftName: 'Lion',   diamondCount: 29999, repeatCount: 10 },
      ];
      let idx = 0;
      const fireDemo = () => {
        if (!runningRef.current) return;
        spawnFromGift(demoGifts[idx % demoGifts.length]);
        idx++;
      };
      fireDemo();
      const demoTimer = setInterval(fireDemo, 5000);
      return () => {
        runningRef.current = false;
        cancelAnimationFrame(raf);
        clearInterval(demoTimer);
      };
    }

    // ── Socket connection ──
    const wt   = params.get('cid') ?? params.get('wt');
    let socket = null;
    if (wt) {
      socket = createWidgetSocket(wt, { gift: spawnFromGift });
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
