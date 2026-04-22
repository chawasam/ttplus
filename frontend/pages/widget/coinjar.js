// widget/coinjar.js — Coin Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size แนะนำ: 400 × 600
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ขนาด canvas
const W = 400;
const H = 600;

// รัศมี gift item (px)
const ITEM_R = 22;

// จำนวน item สูงสุดในโถ
const MAX_ITEMS = 70;

// พิกัดโถ (สำหรับ physics walls)
// neck = ปากโถ (แคบ), body = ตัวโถ (กว้าง)
const J = {
  nL: 128, nR: 272,   // neck left / right (inner)
  nT: 62,  nB: 158,   // neck top / bottom
  bL: 68,  bR: 332,   // body left / right (inner)
  bB: 516,            // body bottom
  floor: 522,         // ก้นโถ
};

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

// ===================== Physics Helper Functions =====================

/** สร้าง Matter.js engine + เพิ่ม walls */
function setupEngine(M) {
  const { Engine, Composite } = M;
  const engine = Engine.create({ gravity: { y: 2.2 } });
  Composite.add(engine.world, buildJarWalls(M.Bodies));
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

    spawnItem(imgUrl, emoji, Math.min(safe.repeatCount, 8));

    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup({
      user:   safe.nickname || safe.uniqueId || 'ผู้ใช้',
      gift:   safe.giftName || 'Gift',
      emoji,
      coins:  Math.round(safe.diamondCount * safe.repeatCount),
      imgUrl,
    });
    popupTimer.current = setTimeout(() => setPopup(null), 4500);
  });

  socket.on('widget_error', () => socket.disconnect());
  return socket;
}

// ===================== Main Widget =====================
export default function CoinJarWidget() {
  const [items, setItems]   = useState([]);
  const [popup, setPopup]   = useState(null);
  const [styles, setStyles] = useState(null);

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);   // เก็บ setTimeout IDs เพื่อ cleanup

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
        // เก็บข้อมูล render บน body
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

    let socket;
    let mounted = true; // flag ป้องกัน race condition เมื่อ unmount ก่อน script โหลดเสร็จ

    const initPhysics = () => {
      if (!mounted) return;

      const M = window.Matter;
      if (!M) return;

      // เก็บ Matter refs สำหรับ cleanup
      mRef.current = { Runner: M.Runner, Composite: M.Composite };

      // 1. Engine + walls
      const engine = setupEngine(M);
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
      script.onerror  = () => console.error('[CoinJar] ไม่สามารถโหลด Matter.js ได้');
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

  // พื้นหลัง (bga=0 = โปร่งใส 100% → ใช้ transparent)
  const bgStyle = styles.raw.bga === 0
    ? 'transparent'
    : styles.bgRgba;

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
          maxWidth:       250,
          background:     'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          borderRadius:   14,
          padding:        '9px 14px',
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          border:         `1px solid ${styles.ac}55`,
          animation:      'jarPopIn 0.3s ease',
        }}>
          {/* gift image or emoji */}
          {popup.imgUrl
            ? <img src={popup.imgUrl} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{popup.emoji}</span>
          }
          <div>
            <p style={{ color: styles.ac, fontWeight: 700, fontSize: styles.fs, margin: 0, lineHeight: 1.3 }}>
              {popup.user}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: styles.fs - 2, margin: 0, lineHeight: 1.3 }}>
              {popup.gift} +{popup.coins} 🪙
            </p>
          </div>
        </div>
      )}

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
      <JarSVG acColor={styles.ac} />

      {/* CSS animations */}
      <style>{`
        @keyframes jarPopIn {
          from { opacity: 0; transform: translateX(-18px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ===================== Physics walls =====================
function buildJarWalls(Bodies) {
  const T = 12; // wall thickness
  return [
    // ก้น
    Bodies.rectangle(
      (J.bL + J.bR) / 2, J.floor + T / 2,
      J.bR - J.bL + T, T,
      { isStatic: true, friction: 0.7, label: 'wall' }
    ),
    // ผนังซ้าย body
    Bodies.rectangle(
      J.bL - T / 2, (J.nB + J.bB) / 2,
      T, J.bB - J.nB,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ผนังขวา body
    Bodies.rectangle(
      J.bR + T / 2, (J.nB + J.bB) / 2,
      T, J.bB - J.nB,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ผนังซ้าย neck
    Bodies.rectangle(
      J.nL - T / 2, (J.nT + J.nB) / 2,
      T, J.nB - J.nT,
      { isStatic: true, label: 'wall' }
    ),
    // ผนังขวา neck
    Bodies.rectangle(
      J.nR + T / 2, (J.nT + J.nB) / 2,
      T, J.nB - J.nT,
      { isStatic: true, label: 'wall' }
    ),
    // shoulder ซ้าย (แนวเฉียง จาก neck ลงมา body)
    // จาก (128,158) → (68,186): center=(98,172), length≈66, angle=+0.44rad
    Bodies.rectangle(98, 172, 68, T, {
      isStatic: true, angle: 0.44, friction: 0.45, label: 'wall',
    }),
    // shoulder ขวา
    Bodies.rectangle(302, 172, 68, T, {
      isStatic: true, angle: -0.44, friction: 0.45, label: 'wall',
    }),
  ];
}

// ===================== Jar SVG Visual =====================
function JarSVG({ acColor }) {
  // พิกัด SVG ต้องตรงกับ physics walls ด้านบน
  const NECK_L = J.nL, NECK_R = J.nR;
  const NECK_T = J.nT, NECK_B = J.nB;
  const BODY_L = J.bL, BODY_R = J.bR;
  const BODY_B = J.bB;
  const FLOOR  = J.floor;

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
      {/* แถบใหญ่ซ้าย */}
      <line
        x1={BODY_L + 12} y1={NECK_B + 55}
        x2={BODY_L + 12} y2={BODY_B - 50}
        stroke="rgba(255,255,255,0.38)"
        strokeWidth="6"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      {/* แถบเล็กซ้าย */}
      <line
        x1={BODY_L + 22} y1={NECK_B + 90}
        x2={BODY_L + 22} y2={NECK_B + 180}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* แถบขวาเล็ก */}
      <line
        x1={BODY_R - 14} y1={NECK_B + 60}
        x2={BODY_R - 14} y2={NECK_B + 130}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* ===== Rim วงรีบน neck ===== */}
      <ellipse
        cx={W / 2}
        cy={NECK_T + 21}
        rx={(NECK_R - NECK_L) / 2 + 3}
        ry={4}
        fill="none"
        stroke="rgba(200,225,255,0.55)"
        strokeWidth="2"
      />

      {/* ===== ก้นโถ (วงรีเล็ก) ===== */}
      <ellipse
        cx={W / 2}
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

// Next.js: ปิด SSR (ใช้ browser API)
export function getServerSideProps() { return { props: {} }; }
