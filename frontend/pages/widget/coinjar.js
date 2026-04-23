// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size แนะนำ: 600 × 600
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
// ของขวัญล้นออกนอกโถได้ — กองบนพื้นข้างขวดโหล
// URL params: ?wt=TOKEN&jx=OFFSET(-150~150)&preview=1
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ขนาด canvas (กว้างขึ้น → พื้นที่รอบขวดโหลมากขึ้น)
const W = 600;
const H = 600;

// รัศมี gift item base (px) — ปรับได้ผ่าน gs param (50-200%)
// ITEM_R=24 → tier 1 (×0.50) = 12px radius → เต็มขวดที่ ~100 ชิ้น
const ITEM_R = 24;

/**
 * คำนวณ radius ตาม diamond tier + base scale (5 ระดับ)
 * Tier 1  1–9:      ×0.50 → 12px   (~100 ชิ้นเต็มขวด)
 * Tier 2  10–99:    ×0.67 → 16px
 * Tier 3  100–999:  ×0.88 → 21px
 * Tier 4  1k–9.9k:  ×1.21 → 29px
 * Tier 5  10k+:     ×1.67 → 40px
 */
function getItemR(diamonds = 0, giftScale = 100) {
  const base = Math.round(ITEM_R * (giftScale / 100));
  if (diamonds >= 10000) return Math.round(base * 1.67);
  if (diamonds >= 1000)  return Math.round(base * 1.21);
  if (diamonds >= 100)   return Math.round(base * 0.88);
  if (diamonds >= 10)    return Math.round(base * 0.67);
  return Math.round(base * 0.50); // 1–9 coins → 12px
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
  // เพิ่ม iterations + constraintIterations ป้องกัน tunneling
  const engine = Engine.create({
    gravity:              { y: 2.2 },
    positionIterations:   12,
    velocityIterations:   10,
    constraintIterations: 4,
  });
  Composite.add(engine.world, buildJarWalls(M.Bodies, ox));
  return engine;
}

/** สร้าง Runner และเริ่มรัน
 *  30fps physics (delta=33ms) — เบากว่า 60fps ครึ่งนึง เหมาะกับ streaming PC
 *  ป้องกัน tunneling ด้วยผนัง T=40 (floor หนา 120px) แทนการเพิ่ม fps
 */
function setupRunner(engine, M) {
  const { Runner } = M;
  const runner = Runner.create({ delta: 1000 / 30 }); // 30fps physics
  Runner.run(runner, engine);
  return runner;
}

/** เริ่ม animation loop (DOM update ~20fps, physics 60fps)
 *  คืน requestAnimationFrame ID เพื่อ cancel ได้ */
function startAnimationLoop(engine, M, setItems) {
  const { Composite } = M;
  const KILL_Y = GROUND_Y + 80; // kill zone: ของที่หลุดใต้นี้ถือว่า tunneled
  let frameCount = 0;
  let rafId;

  const tick = () => {
    frameCount++;

    // kill zone: safety net สำหรับของที่ tunneling ผ่านก้นขวดไปจริงๆ
    if (frameCount % 10 === 0) { // ตรวจทุก 10 frames (~6 ครั้ง/วิ)
      Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift' && b.position.y > KILL_Y)
        .forEach(b => Composite.remove(engine.world, b));
    }

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
function setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, engineRef, mRef, setJarOffset }) {
  // รองรับ cid ตัวเลข (ใหม่) และ wt token (เก่า)
  const isCid   = /^\d{4,8}$/.test(cidOrWt);
  const isToken = /^[a-zA-Z0-9_-]{20,66}$/.test(cidOrWt);
  if (!cidOrWt || (!isCid && !isToken)) return null;

  const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  socket.on('connect', () => {
    if (isCid) socket.emit('join_widget', { cid: cidOrWt });
    else        socket.emit('join_widget', { widgetToken: cidOrWt });
  });

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
      maxItemsRef.current = Math.max(10, Math.min(600, parseInt(style.mi) || 150));
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
        body._img      = imgUrl;
        body._emoji    = emoji;
        body._r        = itemR;
        body._diamonds = diamonds; // เก็บราคาไว้สำหรับ evict ถูกสุดก่อน

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 3.5,
          y: Math.random() * 1.5 + 0.5,
        });

        Composite.add(engineRef.current.world, body);

        // ตัด item ทิ้งถ้าเกิน maxItems — ลบอันที่ราคาถูกสุดก่อน (diamonds ต่ำสุด)
        const all = Composite.allBodies(engineRef.current.world)
          .filter(b => b.label === 'gift');
        if (all.length > maxItemsRef.current) {
          // sort ascending by diamonds → [0] = ถูกสุด
          all.sort((a, b) => (a._diamonds ?? 0) - (b._diamonds ?? 0));
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

    let socket;
    let mounted = true;

    const init = async () => {
      const params    = new URLSearchParams(window.location.search);
      const cidOrWt   = params.get('cid') ?? params.get('wt'); // cid ใหม่ หรือ wt เก่า
      const isPreview = params.get('preview') === '1';

      // โหลด style: ถ้ามี cid/wt และไม่ใช่ preview → ดึงจาก API
      // URL params ที่ตั้งชัดเจน (jx, gs, mi) ชนะ API เสมอ
      let s = parseWidgetStyles(params, 'coinjar');
      if (cidOrWt && !isPreview) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
          const isCid = /^\d{4,8}$/.test(cidOrWt);
          const qs    = isCid ? `cid=${encodeURIComponent(cidOrWt)}` : `wt=${encodeURIComponent(cidOrWt)}`;
          const res   = await fetch(`${backendUrl}/api/widget-styles?${qs}`);
          if (res.ok) {
            const data = await res.json();
            if (data.styles?.coinjar) {
              const apiStyle = rawToStyle(data.styles.coinjar, 'coinjar');
              // Merge: API เป็น base, URL params ที่ตั้งชัดเจนชนะ
              s = { ...apiStyle };
              if (params.has('jx'))  s.jx  = parseWidgetStyles(params, 'coinjar').jx;
              if (params.has('gs'))  s.gs  = parseWidgetStyles(params, 'coinjar').gs;
              if (params.has('mi'))  s.mi  = parseWidgetStyles(params, 'coinjar').mi;
            }
          }
        } catch { /* ใช้ URL params แทน */ }
      }

      if (!mounted) return;
      setStyles(s);

      const ox = s.jx ?? 0;
      maxItemsRef.current  = s.mi ?? 150;
      giftScaleRef.current = s.gs ?? 100;
      J = getJ(ox);
      setJarOffset(ox);

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

        socket = setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, engineRef, mRef, setJarOffset });
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
    };

    init();

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
/**
 * สร้าง walls สำหรับโถ + ground + canvas sides
 * ox = horizontal offset (จาก ?jx=)
 */
function buildJarWalls(Bodies, ox = 0) {
  const T  = 40; // หนา 40px — รองรับ velocity ≤96px/frame ที่ 30fps (floor = T×3 = 120px)
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
        {/* Glass gradient — ใส ไม่มีสี */}
        <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="12%"  stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="45%"  stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="88%"  stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>

        {/* Lid gradient */}
        <linearGradient id="lidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#9ca3af" stopOpacity="0.70" />
          <stop offset="100%" stopColor="#4b5563" stopOpacity="0.80" />
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

      {/* ===== Jar body — outline ด้านหลัง (เงา/ความลึก) ===== */}
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
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="5"
      />

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
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="2.5"
      />

      {/* ===== Neck (ปากโถ) ===== */}
      <rect
        x={NECK_L} y={NECK_T + 20}
        width={NECK_R - NECK_L}
        height={NECK_B - NECK_T - 20}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="2.5"
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
        fill="rgba(100,120,140,0.35)"
        rx="2"
      />

      {/* ===== Glass reflections ===== */}
      <line
        x1={BODY_L + 12} y1={NECK_B + 55}
        x2={BODY_L + 12} y2={BODY_B - 50}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="4"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <line
        x1={BODY_L + 22} y1={NECK_B + 90}
        x2={BODY_L + 22} y2={NECK_B + 180}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={BODY_R - 14} y1={NECK_B + 60}
        x2={BODY_R - 14} y2={NECK_B + 130}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* ===== Rim วงรีบน neck ===== */}
      <ellipse
        cx={CX}
        cy={NECK_T + 21}
        rx={(NECK_R - NECK_L) / 2 + 3}
        ry={4}
        fill="none"
        stroke="rgba(200,225,255,0.22)"
        strokeWidth="2"
      />

      {/* ===== ก้นโถ (วงรีเล็ก) ===== */}
      <ellipse
        cx={CX}
        cy={FLOOR - 2}
        rx={(BODY_R - BODY_L) / 2 - 12}
        ry={6}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
    </svg>
  );
}

// Next.js: ปิด SSR (ใช้ browser API)
export function getServerSideProps() { return { props: {} }; }
