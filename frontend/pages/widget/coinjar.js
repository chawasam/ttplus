// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size แนะนำ: 600 × 600
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
// ของขวัญล้นออกนอกโถได้ — กองบนพื้นข้างขวดโหล
// URL params: ?wt=TOKEN&jx=OFFSET(-150~150)&cat=left|right|behind&preview=1
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ขนาด canvas (กว้างขึ้น → พื้นที่รอบขวดโหลมากขึ้น)
const W = 600;
const H = 600;

// รัศมี gift item base (px) — ปรับได้ผ่าน gs param (50-200%)
const ITEM_R = 22;

// คำนวณ radius ตาม diamond tier + base scale
function getItemR(diamonds = 0, giftScale = 100) {
  const base = Math.round(ITEM_R * (giftScale / 100));
  if (diamonds >= 9999) return Math.round(base * 1.5);
  if (diamonds >= 999)  return Math.round(base * 0.75);
  return Math.round(base * 0.5);
}

// จำนวน item สูงสุด default (อ่านจาก ?mi= ที่ runtime)

// พื้น ground สำหรับ overflow — ของที่ล้นออกมากองที่นี่
const GROUND_Y = H - 30;

// พิกัดโถ base (offset = 0 → กลาง canvas W=600)
// shift +100 จากเดิม (W=400 center=200 → W=600 center=300)
// ปรับ jarOffset จาก URL param ?jx=... (-200 ถึง +200)
const JAR_BASE = {
  nL: 228, nR: 372,   // เดิม 128/272 + 100
  nT: 62,  nB: 158,
  bL: 168, bR: 432,   // เดิม 68/332 + 100
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
  // เพิ่ม iterations ป้องกัน tunneling (ค่า default: position=6, velocity=4)
  const engine = Engine.create({
    gravity: { y: 2.2 },
    positionIterations: 10,
    velocityIterations: 8,
  });
  Composite.add(engine.world, buildJarWalls(M.Bodies, ox));
  return engine;
}

/** สร้าง Runner และเริ่มรัน */
function setupRunner(engine, M) {
  const { Runner } = M;
  const runner = Runner.create({ delta: 1000 / 30 }); // 30fps physics — เบากว่า 60fps ครึ่งนึง
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
    if (frameCount % 3 === 0) { // DOM update ~20fps — ลด reflow
      const bodies = Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift')
        .map(b => ({
          id:    b.id,
          x:     b.position.x,
          y:     b.position.y,
          angle: b.angle,
          img:   b._img,
          emoji: b._emoji,
          r:     b._r || ITEM_R,
        }));
      setItems([...bodies]);
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return { cancel: () => cancelAnimationFrame(rafId) };
}

/** Preview mode: spawn test gifts (ครอบคลุมทั้ง 3 tier) */
function runPreviewMode(spawnItem) {
  const testGifts = [
    { emoji: '🌹', count: 3, diamonds: 5    },  // tier 1 (1x)
    { emoji: '🦁', count: 2, diamonds: 100  },  // tier 1 (1x)
    { emoji: '💎', count: 2, diamonds: 2000 },  // tier 2 (1.5x)
    { emoji: '❤️', count: 2, diamonds: 5000 },  // tier 2 (1.5x)
    { emoji: '👑', count: 1, diamonds: 15000},  // tier 3 (2x)
    { emoji: '🌹', count: 2, diamonds: 50   },  // tier 1 (1x)
    { emoji: '🔥', count: 2, diamonds: 1500 },  // tier 2 (1.5x)
    { emoji: '🐼', count: 1, diamonds: 9999 },  // tier 3 (2x)
  ];
  let delay = 0;
  testGifts.forEach(g => {
    setTimeout(() => spawnItem(null, g.emoji, g.count, g.diamonds), delay);
    delay += 700;
  });
}

/** Live mode: สร้าง socket + set up gift handler */
function setupLiveSocket(wt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, engineRef, mRef, setJarOffset, setCatPos, setCatScale, setCatGap }) {
  if (!wt || !/^[a-f0-9]{64}$/.test(wt)) return null;

  const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  socket.on('connect', () => socket.emit('join_widget', { widgetToken: wt }));

  socket.on('gift', (data) => {
    const safe     = sanitizeEvent(data);
    const emoji    = getEmoji(safe.giftName || '');
    const imgUrl   = safeTikTokImageUrl(safe.giftPictureUrl) || null;
    const repeat   = safe.repeatCount || 1;
    const diamonds = Math.max(0, Number(safe.diamondCount) || 0);

    spawnItem(imgUrl, emoji, Math.min(repeat, 8), diamonds);

    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup({
      user:   safe.nickname || safe.uniqueId || 'ผู้ใช้',
      gift:   safe.giftName || 'Gift',
      emoji,  imgUrl,
      rose:   isRose(safe.giftName || ''),
    });
    popupTimer.current = setTimeout(() => setPopup(null), 4500);
  });

  // real-time style update
  socket.on('style_update', ({ widgetId, style }) => {
    if (widgetId !== 'coinjar') return;

    // mi — อัปเดต ref ทันที ไม่ต้อง rebuild
    if (style?.mi !== undefined) {
      maxItemsRef.current = Math.max(10, Math.min(300, parseInt(style.mi) || 150));
    }

    // jx — rebuild jar walls ใหม่ในตำแหน่งที่ถูกต้อง
    if (style?.jx !== undefined) {
      const newOx = Math.max(-200, Math.min(200, parseInt(style.jx) || 0));
      const M      = mRef.current;
      const engine = engineRef.current;
      if (M && engine) {
        const { Composite, Bodies } = M;
        // ลบ walls + ground เดิมออกทั้งหมด
        const toRemove = Composite.allBodies(engine.world)
          .filter(b => b.label === 'wall' || b.label === 'ground');
        toRemove.forEach(b => Composite.remove(engine.world, b));
        // คำนวณพิกัดโถใหม่ + เพิ่ม walls ชุดใหม่
        J = getJ(newOx);
        Composite.add(engine.world, buildJarWalls(Bodies, newOx));
        setJarOffset(newOx);
      }
    }

    // cat — อัปเดต mascot ทันที
    if (style?.cat !== undefined) {
      setCatPos(['left', 'right', 'behind'].includes(style.cat) ? style.cat : null);
    }

    // cs — ขนาดแมว
    if (style?.cs !== undefined) {
      setCatScale(Math.max(50, Math.min(200, parseInt(style.cs) || 100)));
    }

    // cg — ระยะห่างแมวจากขวด
    if (style?.cg !== undefined) {
      setCatGap(Math.max(-30, Math.min(150, parseInt(style.cg) || 0)));
    }

    // gs — ขนาด gift base scale
    if (style?.gs !== undefined) {
      giftScaleRef.current = Math.max(50, Math.min(200, parseInt(style.gs) || 100));
    }
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
  const [catPos, setCatPos]       = useState(null);   // 'left' | 'right' | 'behind' | null
  const [catScale, setCatScale]   = useState(100);    // 50–200 %
  const [catGap, setCatGap]       = useState(0);      // -30–150 px ระยะห่างจากขวด

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);
  const maxItemsRef   = useRef(150); // อ่านจาก ?mi= ใน useEffect
  const giftScaleRef  = useRef(100); // อ่านจาก ?gs= ใน useEffect (50-200%)

  // ===== spawn gift item =====
  const spawnItem = useCallback((imgUrl, emoji, count = 1, diamonds = 0) => {
    const M = mRef.current;
    if (!M || !engineRef.current) return;
    const { Bodies, Body, Composite } = M;
    const n = Math.min(count, 8);
    const itemR = getItemR(diamonds, giftScaleRef.current);

    for (let i = 0; i < n; i++) {
      const tid = setTimeout(() => {
        spawnTimers.current = spawnTimers.current.filter(id => id !== tid);
        if (!engineRef.current) return;

        // สุ่ม x ภายในปาก neck
        const x = J.nL + itemR + 4 + Math.random() * (J.nR - J.nL - (itemR + 4) * 2);
        const y = J.nT + 14;

        const body = Bodies.circle(x, y, itemR, {
          restitution: 0.32,
          friction:    0.65,
          frictionAir: 0.009,
          density:     0.002,
          label:       'gift',
        });
        body._img   = imgUrl;
        body._emoji = emoji;
        body._r     = itemR;

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 3.5,
          y: Math.random() * 1.5 + 0.5,
        });

        Composite.add(engineRef.current.world, body);

        // ตัด item เก่าทิ้งถ้าเกิน maxItems (อ่านจาก ref เพื่อให้ real-time)
        const all = Composite.allBodies(engineRef.current.world)
          .filter(b => b.label === 'gift');
        if (all.length > maxItemsRef.current) {
          Composite.remove(engineRef.current.world, all[0]);
        }
      }, i * 160);
      spawnTimers.current.push(tid);
    }
  }, []);

  // ===== init =====
  useEffect(() => {
    // ทำให้ html/body โปร่งใสสำหรับ OBS
    document.documentElement.classList.add('widget');
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';

    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
    const isPreview = params.get('preview') === '1';

    // parseWidgetStyles รวม jx, mi, cat ทุกอย่างในก้อนเดียว
    const s = parseWidgetStyles(params, 'coinjar');
    setStyles(s);

    const ox = s.jx ?? 0;
    maxItemsRef.current  = s.mi ?? 150;
    giftScaleRef.current = s.gs ?? 100;
    J = getJ(ox);
    setJarOffset(ox);

    // init cat mascot จาก parsed style
    if (['left', 'right', 'behind'].includes(s.cat)) setCatPos(s.cat);
    setCatScale(s.cs ?? 100);
    setCatGap(s.cg ?? 0);

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

      socket = setupLiveSocket(wt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, engineRef, mRef, setJarOffset, setCatPos, setCatScale, setCatGap });
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
      document.documentElement.classList.remove('widget');
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
      {catPos === 'behind' && <CatMascot position="behind" jarOffset={jarOffset} scale={catScale} catGap={catGap} />}

      {/* ===== Physics items layer (DOM, z-index ต่ำกว่า jar overlay) ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              position:        'absolute',
              left:            item.x - item.r,
              top:             item.y - item.r,
              width:           item.r * 2,
              height:          item.r * 2,
              transform:       `rotate(${item.angle}rad)`,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        item.r * 1.45,
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
        <CatMascot position={catPos} jarOffset={jarOffset} scale={catScale} catGap={catGap} />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes jarPopIn {
          from { opacity: 0; transform: translateX(-18px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
        @keyframes catBob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes catBlink {
          0%, 88%, 100% { transform: scaleY(1); }
          93%           { transform: scaleY(0.08); }
        }
        @keyframes catPawPoint {
          0%,  5%,  48%, 100% { transform: translate(0px, 0px)    rotate(0deg);   }
          20%, 34%            { transform: translate(28px, -68px)  rotate(-55deg); }
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
  const T  = 16; // หนาขึ้น (เดิม 12) ป้องกัน tunneling
  const Jx = getJ(ox);
  // center x ของ shoulder แต่ละข้าง
  const shL = (Jx.nL + Jx.bL) / 2;
  const shR = (Jx.nR + Jx.bR) / 2;
  // ก้นโถ: ขยายลงถึง floor+T เพื่อ overlap กับ body walls
  const floorCY     = Jx.floor + T;          // center y ของ floor wall
  const floorHeight = T * 3;                  // หนา 3× ป้องกัน tunneling

  return [
    // ── ก้นโถ (หนาขึ้น + ขยับขึ้นให้ overlap กับ body walls) ──
    Bodies.rectangle(
      (Jx.bL + Jx.bR) / 2, floorCY,
      Jx.bR - Jx.bL + T * 2, floorHeight,
      { isStatic: true, friction: 0.7, restitution: 0.05, label: 'wall' }
    ),
    // ── ผนังซ้าย body (extend ลงถึง floor+T ปิด gap) ──
    Bodies.rectangle(
      Jx.bL - T / 2, (Jx.nB + floorCY) / 2,
      T, floorCY - Jx.nB,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังขวา body (extend ลงถึง floor+T ปิด gap) ──
    Bodies.rectangle(
      Jx.bR + T / 2, (Jx.nB + floorCY) / 2,
      T, floorCY - Jx.nB,
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
 * แมวน่ารัก 4 ขา ตัวใหญ่เท่าขวดโหล — นั่งข้าง/หลังขวด พร้อม animation
 * position: 'left' | 'right' | 'behind'
 * ขาหน้าขวา animation ชี้ขวด (catPawPoint) ทุก 5 วิ
 */
function CatMascot({ position, jarOffset = 0, scale = 100, catGap = 0 }) {
  const Jc = getJ(jarOffset);

  // viewBox 140×300 — ทุก element อยู่ใน 0-140 ไม่ crop
  const CAT_H = Math.round(460 * scale / 100);
  const CAT_W = Math.round(215 * scale / 100);

  // เท้าอยู่ y=283/300 → วางให้เสมอก้นขวด (JAR_BASE.floor=522)
  const top = Math.round(JAR_BASE.floor - (283 / 300) * CAT_H);

  let left, zIndex, flip;
  if (position === 'left') {
    left   = Math.round(Jc.bL - (75 / 140) * CAT_W - 10 - catGap);
    zIndex = 4;
    flip   = false;
  } else if (position === 'right') {
    left   = Math.round(Jc.bR + 10 + catGap - (65 / 140) * CAT_W);
    zIndex = 4;
    flip   = true;
  } else {
    // behind
    left   = Math.round((Jc.bL + Jc.bR) / 2 - CAT_W / 2);
    zIndex = 1;
    flip   = false;
  }

  return (
    <div style={{
      position:      'absolute',
      left, top,
      width:         CAT_W,
      height:        CAT_H,
      zIndex,
      pointerEvents: 'none',
      transform:     flip ? 'scaleX(-1)' : undefined,
    }}>
      <div style={{ width: '100%', height: '100%', animation: 'catBob 3.5s ease-in-out infinite' }}>
        <svg width={CAT_W} height={CAT_H} viewBox="0 0 140 300" overflow="visible">

          {/* ── หาง (หมุนรอบโคนหาง) ── */}
          <g>
            <path d="M 42 232 C 14 212 8 182 12 158 C 16 135 30 124 34 112 C 38 100 28 90 36 84"
              stroke="#f59e0b" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M 42 232 C 14 212 8 182 12 158 C 16 135 30 124 34 112 C 38 100 28 90 36 84"
              stroke="#fde68a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
            <circle cx="38" cy="82" r="9"   fill="#fde68a" />
            <circle cx="38" cy="82" r="5.5" fill="#fbbf24" />
            <animateTransform attributeName="transform" type="rotate"
              values="0 42 232; 15 42 232; 0 42 232; -12 42 232; 0 42 232"
              dur="2.4s" repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
          </g>

          {/* ── ขาหลังซ้าย (hind leg — อยู่ด้านหลัง วาดก่อน body ทับ) ── */}
          <ellipse cx="47" cy="252" rx="13" ry="22" fill="#f59e0b" />
          <ellipse cx="40" cy="273" rx="17" ry="11" fill="#fbbf24" />
          <ellipse cx="40" cy="271" rx="13" ry="8"  fill="#f59e0b" />
          <path d="M 29 271 Q 32 267 36 271" stroke="#d97706" strokeWidth="1.5" fill="none" />
          <path d="M 36 269 Q 40 265 44 269" stroke="#d97706" strokeWidth="1.5" fill="none" />
          <path d="M 43 270 Q 46 266 50 270" stroke="#d97706" strokeWidth="1.5" fill="none" />

          {/* ── ขาหลังขวา (hind leg — อยู่ด้านหลัง วาดก่อน body ทับ) ── */}
          <ellipse cx="103" cy="252" rx="13" ry="22" fill="#f59e0b" />
          <ellipse cx="110" cy="273" rx="17" ry="11" fill="#fbbf24" />
          <ellipse cx="110" cy="271" rx="13" ry="8"  fill="#f59e0b" />
          <path d="M 99 271 Q 102 267 106 271" stroke="#d97706" strokeWidth="1.5" fill="none" />
          <path d="M 106 269 Q 110 265 114 269" stroke="#d97706" strokeWidth="1.5" fill="none" />
          <path d="M 113 270 Q 116 266 120 270" stroke="#d97706" strokeWidth="1.5" fill="none" />

          {/* ── ตัว (วาดทับขาหลัง) ── */}
          <ellipse cx="75" cy="215" rx="34" ry="54" fill="#fbbf24" />
          <ellipse cx="75" cy="226" rx="22" ry="40" fill="#fde68a" />
          <path d="M 45 195 Q 75 205 103 195" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M 44 211 Q 75 222 106 211" stroke="#d97706" strokeWidth="2"   fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M 45 229 Q 75 241 103 229" stroke="#d97706" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />

          {/* ── ขาหน้าซ้าย (front left leg + paw) ── */}
          <line x1="58" y1="250" x2="54" y2="266" stroke="#fbbf24" strokeWidth="11" strokeLinecap="round" />
          <line x1="58" y1="250" x2="54" y2="266" stroke="#f59e0b" strokeWidth="6.5" strokeLinecap="round" />
          <ellipse cx="54" cy="271" rx="19" ry="12" fill="#fbbf24" />
          <ellipse cx="54" cy="269" rx="15" ry="9"  fill="#f59e0b" />
          <path d="M 42 269 Q 46 265 50 269" stroke="#d97706" strokeWidth="1.6" fill="none" />
          <path d="M 50 267 Q 54 263 58 267" stroke="#d97706" strokeWidth="1.6" fill="none" />
          <path d="M 57 268 Q 61 264 65 268" stroke="#d97706" strokeWidth="1.6" fill="none" />

          {/* ── ขาหน้าขวา + เท้า (ชี้ปากขวดทุก 5 วิ) ── */}
          {/* transformBox:fill-box + transformOrigin:top center = หมุนรอบไหล่/ต้นแขน */}
          <g style={{
            transformBox: 'fill-box',
            transformOrigin: 'top center',
            animation: 'catPawPoint 5s ease-in-out infinite',
            animationDelay: '2s',
          }}>
            {/* ขาหน้า foreleg จากต้นแขน (ไหล่) ลงมาถึงเท้า */}
            <line x1="93" y1="248" x2="96" y2="266" stroke="#fbbf24" strokeWidth="11" strokeLinecap="round" />
            <line x1="93" y1="248" x2="96" y2="266" stroke="#f59e0b" strokeWidth="6.5" strokeLinecap="round" />
            {/* เท้า */}
            <ellipse cx="96" cy="271" rx="19" ry="12" fill="#fbbf24" />
            <ellipse cx="96" cy="269" rx="15" ry="9"  fill="#f59e0b" />
            <path d="M 84 269 Q 88 265 92 269" stroke="#d97706" strokeWidth="1.6" fill="none" />
            <path d="M 92 267 Q 96 263 100 267" stroke="#d97706" strokeWidth="1.6" fill="none" />
            <path d="M 99 268 Q 103 264 107 268" stroke="#d97706" strokeWidth="1.6" fill="none" />
          </g>

          {/* ── หัว (เลื่อนลง 35px — cy 88→123 ก้นหัวชนลำตัว y=161) ── */}
          <circle cx="75" cy="123" r="38" fill="#fbbf24" />
          <path d="M 48 91 Q 57 81 65 91"  stroke="#d97706" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.65" />
          <path d="M 65 86 Q 73 75 81 86"  stroke="#d97706" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.65" />
          <path d="M 83 91 Q 92 81 100 91" stroke="#d97706" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.65" />

          {/* ── หูซ้าย ── */}
          <polygon points="44,101 36,55 64,89" fill="#fbbf24" />
          <polygon points="47,97 42,63 60,86" fill="#f9a8d4" />

          {/* ── หูขวา ── */}
          <polygon points="106,101 116,55 88,89" fill="#fbbf24" />
          <polygon points="103,97 110,63 92,86" fill="#f9a8d4" />

          {/* ── ตาซ้าย ── */}
          <ellipse cx="60" cy="120" rx="8" ry="9" fill="#1c1c3a" />
          <ellipse cx="60" cy="120" rx="4.5" ry="5.5" fill="#3b82f6" />
          <circle  cx="63" cy="117" r="3"   fill="white" />
          <circle  cx="62" cy="116" r="1.2" fill="rgba(255,255,255,0.7)" />

          {/* ── ตาขวา (กะพริบ) ── */}
          <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'catBlink 4.5s ease infinite' }}>
            <ellipse cx="90" cy="120" rx="8" ry="9" fill="#1c1c3a" />
            <ellipse cx="90" cy="120" rx="4.5" ry="5.5" fill="#3b82f6" />
            <circle  cx="93" cy="117" r="3"   fill="white" />
            <circle  cx="92" cy="116" r="1.2" fill="rgba(255,255,255,0.7)" />
          </g>

          {/* ── จมูก ── */}
          <ellipse cx="74" cy="136" rx="4.5" ry="3.5" fill="#f9a8d4" />
          <path d="M 74 132 L 74 136" stroke="#d97706" strokeWidth="1.4" />

          {/* ── ปาก ── */}
          <path d="M 69 141 Q 74 147 79 141" stroke="#c2410c" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* ── หนวดซ้าย (x=15~62) ── */}
          <line x1="15" y1="132" x2="62" y2="136" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
          <line x1="14" y1="139" x2="62" y2="140" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
          <line x1="17" y1="147" x2="62" y2="145" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" />

          {/* ── หนวดขวา (x=86~132) ── */}
          <line x1="86" y1="136" x2="131" y2="132" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
          <line x1="86" y1="140" x2="132" y2="139" stroke="rgba(255,255,255,0.92)" strokeWidth="1.6" />
          <line x1="86" y1="145" x2="129" y2="147" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}

// Next.js: ปิด SSR (ใช้ browser API)
export function getServerSideProps() { return { props: {} }; }
