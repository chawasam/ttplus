// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size แนะนำ: 400 × 600
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
// ของขวัญล้นออกนอกโถได้ — กองบนพื้นข้างขวดโหล
// URL params: ?wt=TOKEN&jx=OFFSET(-150~150)&cat=left|right|behind&preview=1
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ขนาด canvas
const W = 400;
const H = 600;

// รัศมี gift item (px)
const ITEM_R = 22;

// จำนวน item สูงสุด (มากพอให้ล้นออกนอกโถได้)
const MAX_ITEMS = 150;

// พื้น ground สำหรับ overflow — ของที่ล้นออกมากองที่นี่
const GROUND_Y = H - 30;

// พิกัดโถ base (offset = 0 → กลาง canvas)
// ปรับ jarOffset จาก URL param ?jx=... (-150 ถึง +150)
const JAR_BASE = {
  nL: 128, nR: 272,
  nT: 62,  nB: 158,
  bL: 68,  bR: 332,
  bB: 516,
  floor: 522,
};

// คำนวณพิกัดโถพร้อม horizontal offset
function getJ(ox = 0) {
  return {
    nL: JAR_BASE.nL + ox, nR: JAR_BASE.nR + ox,
    nT: JAR_BASE.nT,      nB: JAR_BASE.nB,
    bL: JAR_BASE.bL + ox, bR: JAR_BASE.bR + ox,
    bB: JAR_BASE.bB,
    floor: JAR_BASE.floor,
  };
}

// J global — อัปเดตจาก URL param ก่อน init physics
let J = getJ(0);

// ===================== Emoji fallback =====================
const EMOJI_MAP = {
  rose: '🌹', roses: '🌹', flower: '🌸', lily: '💐', sunflower: '🌻',
  lion: '🦁', panda: '🐼', bear: '🐻', tiger: '🐯', cat: '🐱', dog: '🐶',
  crown: '👑', hat: '🎩', ring: '💍', bow: '🎀', ribbon: '🎀',
  rocket: '🚀', universe: '🌌', galaxy: '🌌', planet: '🪐',
  diamond: '💎', gem: '💎', crystal: '🔮',
  fire: '🔥', star: '⭐', heart: '❤️', love: '❤️',
  cake: '🎂', candy: '🍬', ice: '🍦', lollipop: '🍭',
  car: '🚗', sports: '⚽', ball: '⚽',
  money: '💰', coin: '🪙', gold: '🥇',
};

function getEmoji(name = '') {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🎁';
}

function isRose(name = '') {
  const lower = name.toLowerCase();
  return lower.includes('rose');
}

// ===================== Physics Helper Functions =====================

/** สร้าง Matter.js engine + เพิ่ม walls
 *  ox = horizontal offset ของโถ (จาก ?jx=) */
function setupEngine(M, ox = 0) {
  const { Engine, Composite } = M;
  const engine = Engine.create({ gravity: { y: 2.2 } });
  Composite.add(engine.world, buildJarWalls(M.Bodies, ox));
  return engine;
}

/** สร้าง Runner และเริ่มรัน */
function setupRunner(engine, M) {
  const { Runner } = M;
  const runner = Runner.create({ delta: 1000 / 60 });
  Runner.run(runner, engine);
  return runner;
}

/** เริ่ม animation loop (~30fps DOM update, 60fps physics)
 *  คืน requestAnimationFrame ID เพื่อ cancel ได้ */
function startAnimationLoop(engine, M, setItems) {
  const { Composite } = M;
  let frameCount = 0;
  let rafId;

  const tick = () => {
    frameCount++;
    if (frameCount % 2 === 0) {
      const bodies = Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift')
        .map(b => ({
          id:    b.id,
          x:     b.position.x,
          y:     b.position.y,
          angle: b.angle,
          img:   b._img,
          emoji: b._emoji,
        }));
      setItems([...bodies]);
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return { cancel: () => cancelAnimationFrame(rafId) };
}

/** Preview mode: spawn test gifts */
function runPreviewMode(spawnItem) {
  const testGifts = [
    { emoji: '🌹', count: 3 }, { emoji: '🦁', count: 2 },
    { emoji: '💎', count: 1 }, { emoji: '❤️', count: 4 },
    { emoji: '🌹', count: 2 }, { emoji: '🎁', count: 1 },
    { emoji: '🔥', count: 3 }, { emoji: '🐼', count: 2 },
  ];
  let delay = 0;
  testGifts.forEach(g => {
    setTimeout(() => spawnItem(null, g.emoji, g.count), delay);
    delay += 700;
  });
}

/** Live mode: สร้าง socket + set up gift handler */
function setupLiveSocket(wt, { spawnItem, setPopup, popupTimer }) {
  if (!wt || !/^[a-f0-9]{64}$/.test(wt)) return null;

  const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  socket.on('connect', () => socket.emit('join_widget', { widgetToken: wt }));

  socket.on('gift', (data) => {
    const safe   = sanitizeEvent(data);
    const emoji  = getEmoji(safe.giftName || '');
    const imgUrl = safeTikTokImageUrl(safe.giftPictureUrl) || null;
    const repeat = safe.repeatCount || 1;

    spawnItem(imgUrl, emoji, Math.min(repeat, 8));

    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup({
      user:   safe.nickname || safe.uniqueId || 'ผู้ใช้',
      gift:   safe.giftName || 'Gift',
      emoji,  imgUrl,
      rose:   isRose(safe.giftName || ''),
    });
    popupTimer.current = setTimeout(() => setPopup(null), 4500);
  });

  socket.on('widget_error', () => socket.disconnect());
  return socket;
}

// ===================== Main Widget =====================
export default function CoinJarWidget() {
  const [items, setItems]         = useState([]);
  const [popup, setPopup]         = useState(null);
  const [styles, setStyles]       = useState(null);
  const [jarOffset, setJarOffset] = useState(0);
  const [catPos, setCatPos]       = useState(null); // 'left' | 'right' | 'behind' | null

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);

  // ===== spawn gift item =====
  const spawnItem = useCallback((imgUrl, emoji, count = 1) => {
    const M = mRef.current;
    if (!M || !engineRef.current) return;
    const { Bodies, Body, Composite } = M;
    const n = Math.min(count, 8);

    for (let i = 0; i < n; i++) {
      const tid = setTimeout(() => {
        spawnTimers.current = spawnTimers.current.filter(id => id !== tid);
        if (!engineRef.current) return;

        // สุ่ม x ภายในปาก neck
        const x = J.nL + ITEM_R + 4 + Math.random() * (J.nR - J.nL - (ITEM_R + 4) * 2);
        const y = J.nT + 14;

        const body = Bodies.circle(x, y, ITEM_R, {
          restitution: 0.32,
          friction:    0.65,
          frictionAir: 0.009,
          density:     0.002,
          label:       'gift',
        });
        body._img   = imgUrl;
        body._emoji = emoji;

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 3.5,
          y: Math.random() * 1.5 + 0.5,
        });

        Composite.add(engineRef.current.world, body);

        // ตัด item เก่าทิ้งถ้าเกิน MAX
        const all = Composite.allBodies(engineRef.current.world)
          .filter(b => b.label === 'gift');
        if (all.length > MAX_ITEMS) {
          Composite.remove(engineRef.current.world, all[0]);
        }
      }, i * 160);
      spawnTimers.current.push(tid);
    }
  }, []);

  // ===== init =====
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
    const isPreview = params.get('preview') === '1';
    setStyles(parseWidgetStyles(params, 'coinjar'));

    // อ่าน jar offset จาก ?jx= (clamp -150 ถึง +150)
    const ox = Math.max(-150, Math.min(150, parseInt(params.get('jx') || '0') || 0));
    J = getJ(ox);
    setJarOffset(ox);

    // อ่าน cat position จาก ?cat=
    const catParam = params.get('cat');
    if (['left', 'right', 'behind'].includes(catParam)) setCatPos(catParam);

    let socket;
    let mounted = true;

    const initPhysics = () => {
      if (!mounted) return;

      const M = window.Matter;
      if (!M) return;

      // เก็บ Matter refs สำหรับ cleanup — spawnItem ต้องใช้ Bodies+Body+Composite
      mRef.current = { Runner: M.Runner, Composite: M.Composite, Bodies: M.Bodies, Body: M.Body };

      // 1. Engine + walls (ส่ง offset ให้สร้าง walls ตำแหน่งที่ถูกต้อง)
      const engine = setupEngine(M, ox);
      engineRef.current = engine;

      // 2. Runner
      runnerRef.current = setupRunner(engine, M);

      // 3. Animation loop
      const anim = startAnimationLoop(engine, M, setItems);
      animRef.current = { cancel: anim.cancel };

      // 4. Preview หรือ Live mode
      if (isPreview) {
        runPreviewMode(spawnItem);
        return;
      }

      socket = setupLiveSocket(wt, { spawnItem, setPopup, popupTimer });
    };

    // โหลด Matter.js จาก CDN (ถ้าโหลดไปแล้ว ใช้ window.Matter ที่มีอยู่เลย)
    if (window.Matter) {
      initPhysics();
    } else {
      const script    = document.createElement('script');
      script.src      = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      script.async    = true;
      script.onload   = initPhysics;
      script.onerror  = () => { if (process.env.NODE_ENV !== 'production') console.error('[CoinJar] ไม่สามารถโหลด Matter.js ได้'); };
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      if (animRef.current?.cancel)  animRef.current.cancel();
      if (runnerRef.current && mRef.current?.Runner) mRef.current.Runner.stop(runnerRef.current);
      if (popupTimer.current) clearTimeout(popupTimer.current);
      spawnTimers.current.forEach(id => clearTimeout(id));
      spawnTimers.current = [];
      if (socket) socket.disconnect();
    };
  }, [spawnItem]);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const bgStyle = styles.raw.bga === 0 ? 'transparent' : styles.bgRgba;

  return (
    <div style={{
      width: W, height: H,
      position: 'relative',
      overflow: 'hidden',
      background: bgStyle,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ===== Gift notification popup ===== */}
      {popup && (
        <div style={{
          position:       'absolute',
          top:            18,
          left:           18,
          zIndex:         10,
          maxWidth:       252,
          background:     popup.rose ? 'rgba(28,0,18,0.82)' : 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          borderRadius:   14,
          padding:        '9px 14px',
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          border:         `1px solid ${popup.rose ? 'rgba(255,143,163,0.50)' : styles.ac + '55'}`,
          animation:      'jarPopIn 0.3s ease',
        }}>
          {popup.imgUrl
            ? <img src={popup.imgUrl} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{popup.emoji}</span>
          }
          <div>
            <p style={{ color: popup.rose ? '#ff8fa3' : styles.ac, fontWeight: 700, fontSize: styles.fs, margin: 0, lineHeight: 1.3 }}>
              {popup.user}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: styles.fs - 2, margin: 0, lineHeight: 1.3 }}>
              {popup.gift}
            </p>
          </div>
        </div>
      )}

      {/* ===== แมวน่ารัก (behind = ด้านหลัง, z-index ต่ำกว่า jar) ===== */}
      {catPos === 'behind' && <CatMascot position="behind" jarOffset={jarOffset} />}

      {/* ===== Physics items layer (DOM, z-index ต่ำกว่า jar overlay) ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              position:        'absolute',
              left:            item.x - ITEM_R,
              top:             item.y - ITEM_R,
              width:           ITEM_R * 2,
              height:          ITEM_R * 2,
              transform:       `rotate(${item.angle}rad)`,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        ITEM_R * 1.45,
              lineHeight:      1,
              userSelect:      'none',
              filter:          'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }}
          >
            {item.img
              ? (
                <img
                  src={item.img}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt=""
                  crossOrigin="anonymous"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )
              : item.emoji
            }
          </div>
        ))}
      </div>

      {/* ===== Jar SVG overlay (glass visual, z-index สูงกว่า items) ===== */}
      <JarSVG acColor={styles.ac} offset={jarOffset} />

      {/* ===== แมวน่ารัก (left / right = ด้านข้าง, z-index สูงกว่า jar) ===== */}
      {(catPos === 'left' || catPos === 'right') && (
        <CatMascot position={catPos} jarOffset={jarOffset} />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes jarPopIn {
          from { opacity: 0; transform: translateX(-18px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
        @keyframes catBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
      `}</style>
    </div>
  );
}

// ===================== Physics walls =====================
/**
 * สร้าง walls สำหรับโถ + ground + canvas sides
 * ox = horizontal offset (จาก ?jx=)
 */
function buildJarWalls(Bodies, ox = 0) {
  const T  = 12;
  const Jx = getJ(ox);
  // center x ของ shoulder แต่ละข้าง
  const shL = (Jx.nL + Jx.bL) / 2;
  const shR = (Jx.nR + Jx.bR) / 2;

  return [
    // ── ก้นโถ ──
    Bodies.rectangle(
      (Jx.bL + Jx.bR) / 2, Jx.floor + T / 2,
      Jx.bR - Jx.bL + T, T,
      { isStatic: true, friction: 0.7, label: 'wall' }
    ),
    // ── ผนังซ้าย body ──
    Bodies.rectangle(
      Jx.bL - T / 2, (Jx.nB + Jx.bB) / 2,
      T, Jx.bB - Jx.nB,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังขวา body ──
    Bodies.rectangle(
      Jx.bR + T / 2, (Jx.nB + Jx.bB) / 2,
      T, Jx.bB - Jx.nB,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังซ้าย neck ──
    Bodies.rectangle(
      Jx.nL - T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, label: 'wall' }
    ),
    // ── ผนังขวา neck ──
    Bodies.rectangle(
      Jx.nR + T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, label: 'wall' }
    ),
    // ── shoulder ซ้าย (เฉียง: neck → body) ──
    Bodies.rectangle(shL, 172, 68, T, {
      isStatic: true, angle: 0.44, friction: 0.45, label: 'wall',
    }),
    // ── shoulder ขวา ──
    Bodies.rectangle(shR, 172, 68, T, {
      isStatic: true, angle: -0.44, friction: 0.45, label: 'wall',
    }),

    // ── พื้นนอกโถ (transparent ground) — ของที่ล้นออกมากองที่นี่ ──
    Bodies.rectangle(
      W / 2, GROUND_Y + T / 2,
      W + T * 2, T,
      { isStatic: true, friction: 0.8, label: 'ground' }
    ),
    // ── ผนังซ้าย canvas ──
    Bodies.rectangle(
      -T / 2, H / 2,
      T, H * 2,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังขวา canvas ──
    Bodies.rectangle(
      W + T / 2, H / 2,
      T, H * 2,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
  ];
}

// ===================== Jar SVG Visual =====================
function JarSVG({ acColor, offset = 0 }) {
  const Jv    = getJ(offset);
  const NECK_L = Jv.nL, NECK_R = Jv.nR;
  const NECK_T = Jv.nT, NECK_B = Jv.nB;
  const BODY_L = Jv.bL, BODY_R = Jv.bR;
  const BODY_B = Jv.bB;
  const FLOOR  = Jv.floor;
  const CX     = (BODY_L + BODY_R) / 2; // center x ของโถ

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
    >
      <defs>
        {/* Glass gradient (ซ้ายขวา) */}
        <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#c0d8f0" stopOpacity="0.28" />
          <stop offset="12%"  stopColor="#e4f2ff" stopOpacity="0.50" />
          <stop offset="45%"  stopColor="#b8d0e8" stopOpacity="0.10" />
          <stop offset="88%"  stopColor="#e4f2ff" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#c0d8f0" stopOpacity="0.20" />
        </linearGradient>

        {/* Lid gradient */}
        <linearGradient id="lidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#9ca3af" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4b5563" stopOpacity="0.95" />
        </linearGradient>

        {/* Glow filter สำหรับ reflection */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ===== Jar body (ตัวโถ) ===== */}
      <path
        d={`
          M ${NECK_L} ${NECK_B}
          L ${BODY_L + 2} ${NECK_B + 30}
          L ${BODY_L} ${NECK_B + 50}
          L ${BODY_L} ${BODY_B}
          Q ${BODY_L} ${FLOOR} ${BODY_L + 18} ${FLOOR}
          L ${BODY_R - 18} ${FLOOR}
          Q ${BODY_R} ${FLOOR} ${BODY_R} ${BODY_B}
          L ${BODY_R} ${NECK_B + 50}
          L ${BODY_R - 2} ${NECK_B + 30}
          L ${NECK_R} ${NECK_B}
          Z
        `}
        fill="url(#jarGlass)"
        stroke="rgba(190,220,255,0.50)"
        strokeWidth="2"
      />

      {/* ===== Neck (ปากโถ) ===== */}
      <rect
        x={NECK_L} y={NECK_T + 20}
        width={NECK_R - NECK_L}
        height={NECK_B - NECK_T - 20}
        fill="rgba(190,220,255,0.18)"
        stroke="rgba(190,220,255,0.45)"
        strokeWidth="1.5"
        rx="3"
      />

      {/* ===== Lid ===== */}
      <rect
        x={NECK_L - 7}  y={NECK_T}
        width={NECK_R - NECK_L + 14}
        height={22}
        fill="url(#lidGrad)"
        rx="5"
        stroke="rgba(160,180,200,0.7)"
        strokeWidth="1.5"
      />
      {/* thread lines บน lid */}
      {[4, 8, 13, 18].map(dy => (
        <line
          key={dy}
          x1={NECK_L - 5} y1={NECK_T + dy}
          x2={NECK_R + 5} y2={NECK_T + dy}
          stroke="rgba(255,255,255,0.13)"
          strokeWidth="1"
        />
      ))}

      {/* ===== Band ระหว่าง lid กับ neck ===== */}
      <rect
        x={NECK_L - 4} y={NECK_T + 20}
        width={NECK_R - NECK_L + 8}
        height={5}
        fill="rgba(100,120,140,0.65)"
        rx="2"
      />

      {/* ===== Glass reflections ===== */}
      <line
        x1={BODY_L + 12} y1={NECK_B + 55}
        x2={BODY_L + 12} y2={BODY_B - 50}
        stroke="rgba(255,255,255,0.38)"
        strokeWidth="6"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <line
        x1={BODY_L + 22} y1={NECK_B + 90}
        x2={BODY_L + 22} y2={NECK_B + 180}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1={BODY_R - 14} y1={NECK_B + 60}
        x2={BODY_R - 14} y2={NECK_B + 130}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* ===== Rim วงรีบน neck ===== */}
      <ellipse
        cx={CX}
        cy={NECK_T + 21}
        rx={(NECK_R - NECK_L) / 2 + 3}
        ry={4}
        fill="none"
        stroke="rgba(200,225,255,0.55)"
        strokeWidth="2"
      />

      {/* ===== ก้นโถ (วงรีเล็ก) ===== */}
      <ellipse
        cx={CX}
        cy={FLOOR - 2}
        rx={(BODY_R - BODY_L) / 2 - 12}
        ry={6}
        fill="rgba(190,220,255,0.12)"
        stroke="rgba(190,220,255,0.25)"
        strokeWidth="1"
      />
    </svg>
  );
}

// ===================== Cat Mascot =====================
/**
 * แมวน่ารักนั่งข้างขวดโหล
 * position: 'left' | 'right' | 'behind'
 * jarOffset: horizontal offset เดียวกับโถ
 */
function CatMascot({ position, jarOffset = 0 }) {
  const Jc = getJ(jarOffset);

  // คำนวณตำแหน่งแมว
  let left, zIndex;
  if (position === 'left') {
    left   = Jc.bL - 86;
    zIndex = 4; // หน้า jar
  } else if (position === 'right') {
    left   = Jc.bR + 6;
    zIndex = 4;
  } else {
    // behind — อยู่ด้านหลัง items และ jar
    left   = (Jc.bL + Jc.bR) / 2 - 38;
    zIndex = 1;
  }

  const top = GROUND_Y - 95; // นั่งบนพื้น ground

  return (
    <svg
      width={80} height={100}
      viewBox="0 0 80 100"
      style={{ position: 'absolute', left, top, zIndex, pointerEvents: 'none' }}
    >
      {/* หาง */}
      <path
        d="M 52 88 Q 74 74 72 56 Q 70 42 60 38"
        stroke="#f59e0b" strokeWidth="8" fill="none" strokeLinecap="round"
      />
      <path
        d="M 52 88 Q 74 74 72 56 Q 70 42 60 38"
        stroke="#fcd34d" strokeWidth="4" fill="none" strokeLinecap="round"
      />

      {/* ตัว */}
      <ellipse cx="34" cy="72" rx="24" ry="21" fill="#fbbf24" />

      {/* ลายตัว */}
      <path d="M 18 65 Q 34 70 50 65" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <path d="M 16 73 Q 34 79 52 73" stroke="#d97706" strokeWidth="2" fill="none" />

      {/* หัว */}
      <circle cx="34" cy="42" r="22" fill="#fbbf24" />

      {/* หูซ้าย */}
      <polygon points="15,27 9,8 28,21" fill="#fbbf24" />
      <polygon points="17,25 13,12 26,20" fill="#f9a8d4" />

      {/* หูขวา */}
      <polygon points="53,27 59,8 40,21" fill="#fbbf24" />
      <polygon points="51,25 55,12 42,20" fill="#f9a8d4" />

      {/* ตาซ้าย */}
      <ellipse cx="26" cy="40" rx="5" ry="6" fill="#1c1c3a" />
      <circle cx="28" cy="38" r="2" fill="white" />

      {/* ตาขวา */}
      <ellipse cx="42" cy="40" rx="5" ry="6" fill="#1c1c3a"
        style={{ transformOrigin: '42px 40px', animation: 'catBlink 4s ease infinite' }} />
      <circle cx="44" cy="38" r="2" fill="white" />

      {/* จมูก */}
      <ellipse cx="34" cy="47" rx="3.5" ry="2.5" fill="#f9a8d4" />

      {/* ปาก */}
      <path d="M 30.5 50 Q 34 54 37.5 50"
        stroke="#c2410c" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* หนวดซ้าย */}
      <line x1="6"  y1="44" x2="27" y2="47" stroke="rgba(255,255,255,0.88)" strokeWidth="1.4" />
      <line x1="6"  y1="49" x2="27" y2="50" stroke="rgba(255,255,255,0.88)" strokeWidth="1.4" />

      {/* หนวดขวา */}
      <line x1="41" y1="47" x2="62" y2="44" stroke="rgba(255,255,255,0.88)" strokeWidth="1.4" />
      <line x1="41" y1="50" x2="62" y2="49" stroke="rgba(255,255,255,0.88)" strokeWidth="1.4" />

      {/* เท้าหน้าซ้าย */}
      <ellipse cx="19" cy="91" rx="11" ry="7" fill="#fbbf24" />
      <ellipse cx="19" cy="90" rx="9"  ry="5" fill="#f59e0b" />

      {/* เท้าหน้าขวา */}
      <ellipse cx="49" cy="91" rx="11" ry="7" fill="#fbbf24" />
      <ellipse cx="49" cy="90" rx="9"  ry="5" fill="#f59e0b" />
    </svg>
  );
}

// Next.js: ปิด SSR (ใช้ browser API)
export function getServerSideProps() { return { props: {} }; }
