// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size: 800 × 600  (jar อยู่ด้านล่าง ส่วนบนเป็นพื้นที่ gifts ร่วง)
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
// URL params: ?cid=CID&jx=OFFSET(-100~100)&preview=1
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ── Canvas ──────────────────────────────────────────────────────────────────
// 800×600 (ลดจาก 1200×1200 เพื่อลด CPU ~60%)
const W = 800;
const H = 600;

/**
 * Gift radius — 4 tier ตามราคา diamond:
 *   <100    → 10px (1×)    ผ่านคอขวดสบาย
 *   100-999 → 18px (1.8×)  ผ่านคอขวดสบาย
 *  1000-9999→ 28px (2.8×)  ผ่านคอขวดได้ (neck=86px, max r=43)
 *  10000+  → 38px (3.8×)   เกือบเต็มคอพอดี — เห็นความต่างชัด
 * giftScale: URL param gs= ให้ VJ ปรับ % ได้ (10–200)
 */
function getItemR(diamonds = 0, giftScale = 100) {
  const d = Math.max(1, diamonds || 1);
  let r;
  if      (d >= 10000) r = 38;
  else if (d >=  1000) r = 28;
  else if (d >=   100) r = 18;
  else                 r = 10;
  return Math.max(3, Math.round(r * (giftScale / 100)));
}

// พื้น ground สำหรับ overflow
const GROUND_Y = H - 15; // 585

// ── JAR_BASE: scale ×0.5 จาก 1200×1200 + shift +100px (center ใน 800px) ──────
// Original → ×0.5 → +100x:
//   nL:514→257→357  nR:686→343→443  (neck กว้าง 86px, center=400)
//   nT:662→331      nB:758→379
//   bL:442→221→321  bR:758→379→479  (body กว้าง 158px)
//   bB:1116→558     floor:1122→561
const JAR_BASE = {
  nL: 357, nR: 443,
  nT: 331, nB: 379,
  bL: 321, bR: 479,
  bB: 558,
  floor: 561,
};

function getJ(ox = 0) {
  return {
    nL: JAR_BASE.nL + ox, nR: JAR_BASE.nR + ox,
    nT: JAR_BASE.nT,      nB: JAR_BASE.nB,
    bL: JAR_BASE.bL + ox, bR: JAR_BASE.bR + ox,
    bB: JAR_BASE.bB,
    floor: JAR_BASE.floor,
  };
}

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
  return name.toLowerCase().includes('rose');
}

// ===================== Physics Helper Functions =====================

function setupEngine(M, ox = 0) {
  const { Engine, Composite } = M;
  const engine = Engine.create({
    gravity:              { y: 2.2 },
    positionIterations:   12,
    velocityIterations:   10,
    constraintIterations: 4,
    enableSleeping:       true,
  });
  Composite.add(engine.world, buildJarWalls(M.Bodies, ox));
  return engine;
}

function setupRunner(engine, M) {
  const { Runner } = M;
  const runner = Runner.create({ delta: 1000 / 30 }); // 30fps physics
  Runner.run(runner, engine);
  return runner;
}

function startAnimationLoop(engine, M, setItems) {
  const { Composite } = M;
  const KILL_Y = GROUND_Y + 40; // kill zone ใต้ ground
  let frameCount = 0;
  let rafId;

  const tick = () => {
    frameCount++;

    if (frameCount % 10 === 0) {
      Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift' && b.position.y > KILL_Y)
        .forEach(b => Composite.remove(engine.world, b));
    }

    if (frameCount % 3 === 0) {
      const bodies = Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift')
        .map(b => ({
          id:    b.id,
          x:     b.position.x,
          y:     b.position.y,
          angle: b.angle,
          img:   b._img,
          emoji: b._emoji,
          r:     b._r || 10,
        }));
      setItems([...bodies]);
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return { cancel: () => cancelAnimationFrame(rafId) };
}

function runPreviewMode(spawnItem) {
  const testGifts = [
    { emoji: '🌹', count: 3, diamonds: 5    },
    { emoji: '🦁', count: 2, diamonds: 100  },
    { emoji: '💎', count: 2, diamonds: 2000 },
    { emoji: '❤️', count: 2, diamonds: 5000 },
    { emoji: '👑', count: 1, diamonds: 15000},
    { emoji: '🌹', count: 2, diamonds: 50   },
    { emoji: '🔥', count: 2, diamonds: 1500 },
    { emoji: '🐼', count: 1, diamonds: 9999 },
  ];
  let delay = 0;
  testGifts.forEach(g => {
    setTimeout(() => spawnItem(null, g.emoji, g.count, g.diamonds), delay);
    delay += 700;
  });
}

function setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, showSenderRef, showGiftNameRef, showGiftImageRef, engineRef, mRef, setJarOffset, catalogRef }) {
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
    const isStreakable = !!data.isStreakable;
    const isRepeatEnd  = !isStreakable || !!data.isRepeatEnd;
    if (!isRepeatEnd) return;

    const safe     = sanitizeEvent(data);
    const emoji    = getEmoji(safe.giftName || '');
    const catalogEntry = catalogRef?.current?.[safe.giftName?.toLowerCase()] || null;
    const imgUrl   = safeTikTokImageUrl(safe.giftPictureUrl)
                  || safeTikTokImageUrl(catalogEntry?.pictureUrl)
                  || null;
    const repeat   = safe.repeatCount || 1;
    const diamonds = Math.max(0, Number(safe.diamondCount) || 0);

    spawnItem(imgUrl, emoji, Math.min(repeat, 8), diamonds);

    if (popupTimer.current) clearTimeout(popupTimer.current);
    setPopup({
      user:       safe.nickname || safe.uniqueId || 'ผู้ใช้',
      gift:       safe.giftName || 'Gift',
      emoji,      imgUrl,
      rose:       isRose(safe.giftName || ''),
      showSender:    showSenderRef.current,
      showGiftName:  showGiftNameRef.current,
      showGiftImage: showGiftImageRef.current,
    });
    popupTimer.current = setTimeout(() => setPopup(null), 4500);
  });

  socket.on('style_update', ({ widgetId, style }) => {
    if (widgetId !== 'coinjar') return;

    if (style?.mi !== undefined) {
      maxItemsRef.current = Math.max(10, Math.min(300, parseInt(style.mi) || 80));
    }

    if (style?.jx !== undefined) {
      const newOx = Math.max(-100, Math.min(100, parseInt(style.jx) || 0)); // ±100 สำหรับ canvas 800px
      const M      = mRef.current;
      const engine = engineRef.current;
      if (M && engine) {
        const { Composite, Bodies } = M;
        const toRemove = Composite.allBodies(engine.world)
          .filter(b => b.label === 'wall' || b.label === 'ground');
        toRemove.forEach(b => Composite.remove(engine.world, b));
        J = getJ(newOx);
        Composite.add(engine.world, buildJarWalls(Bodies, newOx));
        setJarOffset(newOx);
      }
    }

    if (style?.gs !== undefined) {
      giftScaleRef.current = Math.max(10, Math.min(200, parseInt(style.gs) || 100));
    }
    if (style?.showSender    !== undefined) showSenderRef.current    = parseInt(style.showSender)    === 0 ? 0 : 1;
    if (style?.showGiftName  !== undefined) showGiftNameRef.current  = parseInt(style.showGiftName)  === 0 ? 0 : 1;
    if (style?.showGiftImage !== undefined) showGiftImageRef.current = parseInt(style.showGiftImage) === 0 ? 0 : 1;
  });

  socket.on('widget_error', () => socket.disconnect());
  return socket;
}

// ===================== Main Widget =====================
export default function CoinJarWidget() {
  const [items, setItems]           = useState([]);
  const [popup, setPopup]           = useState(null);
  const [styles, setStyles]         = useState(null);
  const [jarOffset, setJarOffset]   = useState(0);
  const showSenderRef               = useRef(1);
  const showGiftNameRef             = useRef(1);
  const showGiftImageRef            = useRef(1);

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);
  const maxItemsRef   = useRef(80);   // ลดจาก 150 → เหมาะกับ canvas เล็กลง
  const giftScaleRef  = useRef(100);
  const catalogRef    = useRef({});

  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/gifts/public`);
        if (!res.ok) return;
        const gifts = await res.json();
        const map = {};
        if (Array.isArray(gifts)) {
          gifts.forEach(g => { if (g?.name) map[g.name.toLowerCase()] = g; });
          catalogRef.current = map;
        }
      } catch { /* silent fail */ }
    };
    fetchCatalog();
    const iv = setInterval(fetchCatalog, 30_000);
    return () => clearInterval(iv);
  }, []);

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

        // x: สุ่มภายในคอขวด
        const x = J.nL + itemR + 4 + Math.random() * Math.max(0, J.nR - J.nL - (itemR + 4) * 2);
        // y: off-screen เหนือ canvas — ไม่โผล่ให้เห็นก่อนตก
        const y = -itemR;

        const body = Bodies.circle(x, y, itemR, {
          restitution:    0.05,
          friction:       0.35,
          frictionStatic: 0.45,
          frictionAir:    0.04,
          density:        0.002,
          label:          'gift',
          sleepThreshold: 20,
        });
        body._img      = imgUrl;
        body._emoji    = emoji;
        body._r        = itemR;
        body._diamonds = diamonds;

        Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 3.5,
          y: Math.random() * 1.5 + 0.5,
        });

        Composite.add(engineRef.current.world, body);

        const all = Composite.allBodies(engineRef.current.world)
          .filter(b => b.label === 'gift');
        if (all.length > maxItemsRef.current) {
          all.sort((a, b) => (a._diamonds ?? 0) - (b._diamonds ?? 0));
          Composite.remove(engineRef.current.world, all[0]);
        }
      }, i * 160);
      spawnTimers.current.push(tid);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('widget');
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';

    let socket;
    let mounted = true;

    const init = async () => {
      const params    = new URLSearchParams(window.location.search);
      const cidOrWt   = params.get('cid') ?? params.get('wt');
      const isPreview = params.get('preview') === '1';

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

      const ox = Math.max(-100, Math.min(100, s.jx ?? 0));
      maxItemsRef.current  = s.mi ?? 80;
      giftScaleRef.current = s.gs ?? 100;
      showSenderRef.current    = s.showSender    ?? 1;
      showGiftNameRef.current  = s.showGiftName  ?? 1;
      showGiftImageRef.current = s.showGiftImage ?? 1;
      J = getJ(ox);
      setJarOffset(ox);

      const initPhysics = () => {
        if (!mounted) return;
        const M = window.Matter;
        if (!M) return;

        mRef.current = { Runner: M.Runner, Composite: M.Composite, Bodies: M.Bodies, Body: M.Body };

        const engine = setupEngine(M, ox);
        engineRef.current = engine;
        runnerRef.current = setupRunner(engine, M);

        const anim = startAnimationLoop(engine, M, setItems);
        animRef.current = { cancel: anim.cancel };

        if (isPreview) {
          runPreviewMode(spawnItem);
          return;
        }

        socket = setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, showSenderRef, showGiftNameRef, showGiftImageRef, engineRef, mRef, setJarOffset, catalogRef });
      };

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


      {/* ── Gift notification popup ───────────────────────────────────────── */}
      {popup && (
        <div style={{
          position:           'absolute',
          top:                12,
          left:               12,
          zIndex:             10,
          maxWidth:           220,
          background:         popup.rose ? 'rgba(28,0,18,0.90)' : 'rgba(10,8,24,0.88)',
          backdropFilter:     'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius:       12,
          padding:            '8px 12px',
          display:            'flex',
          alignItems:         'center',
          gap:                8,
          border:             `1px solid ${popup.rose ? 'rgba(255,143,163,0.50)' : styles.ac + '55'}`,
          animation:          'jarPopIn 0.3s ease',
        }}>
          {popup.showGiftImage !== 0 && (popup.imgUrl
            ? <img src={popup.imgUrl} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{popup.emoji}</span>
          )}
          <div>
            {popup.showSender !== 0 && (
              <p style={{ color: popup.rose ? '#ff8fa3' : styles.ac, fontWeight: 700, fontSize: styles.fs, margin: 0, lineHeight: 1.3 }}>
                {popup.user}
              </p>
            )}
            {popup.showGiftName !== 0 && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: styles.fs - 2, margin: 0, lineHeight: 1.3 }}>
                {popup.gift}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Physics items layer ───────────────────────────────────────────── */}
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
            {styles.showGiftImage !== 0 && (item.img
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
            )}
          </div>
        ))}
      </div>

      {/* ── Jar SVG overlay ───────────────────────────────────────────────── */}
      <JarSVG acColor={styles.ac} offset={jarOffset} />

      <style>{`
        @keyframes jarPopIn {
          from { opacity: 0; transform: translateX(-14px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ===================== Physics Walls =====================
/**
 * T=22px (สูงกว่า half ของ 40 เล็กน้อย เพื่อ margin anti-tunneling)
 * SHOULDER_H=60 (scale ×0.5 จาก 120)
 */
function buildJarWalls(Bodies, ox = 0) {
  const T          = 22;  // wall thickness — รองรับ velocity ≤38px/frame ที่ 30fps
  const Jx         = getJ(ox);
  const SHOULDER_H = 60;  // scale ×0.5 จากเดิม 120

  const dx          = Jx.nL - Jx.bL;                           // 36px
  const shoulderLen = Math.sqrt(dx * dx + SHOULDER_H * SHOULDER_H); // ≈70px
  const shoulderAng = Math.atan2(dx, SHOULDER_H);               // ≈0.54 rad

  const floorCY     = Jx.floor + T;     // center y ของ floor wall
  const floorHeight = T * 3;            // หนา 3× ป้องกัน tunneling

  return [
    // ── คอขวดซ้าย ──
    Bodies.rectangle(
      Jx.nL - T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── คอขวดขวา ──
    Bodies.rectangle(
      Jx.nR + T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ไหล่ซ้าย ──
    Bodies.rectangle(
      (Jx.nL + Jx.bL) / 2, Jx.nB + SHOULDER_H / 2,
      T, shoulderLen,
      { isStatic: true, angle: shoulderAng, friction: 0.3, label: 'wall' }
    ),
    // ── ไหล่ขวา ──
    Bodies.rectangle(
      (Jx.nR + Jx.bR) / 2, Jx.nB + SHOULDER_H / 2,
      T, shoulderLen,
      { isStatic: true, angle: -shoulderAng, friction: 0.3, label: 'wall' }
    ),
    // ── ก้นโถ (หนา 3× ป้องกัน tunneling) ──
    Bodies.rectangle(
      (Jx.bL + Jx.bR) / 2, floorCY,
      Jx.bR - Jx.bL + T * 2, floorHeight,
      { isStatic: true, friction: 0.7, restitution: 0.05, label: 'wall' }
    ),
    // ── ผนังซ้าย body ──
    Bodies.rectangle(
      Jx.bL - T / 2, (Jx.nB + SHOULDER_H + floorCY) / 2,
      T, floorCY - (Jx.nB + SHOULDER_H),
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังขวา body ──
    Bodies.rectangle(
      Jx.bR + T / 2, (Jx.nB + SHOULDER_H + floorCY) / 2,
      T, floorCY - (Jx.nB + SHOULDER_H),
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── พื้นนอกโถ (ของล้นมากองที่นี่) ──
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
/**
 * แก้บัก "เส้นตรงกลางปากขวดใน OBS":
 *   - jarPath (ปิดด้วย Z) ใช้สำหรับ fill เท่านั้น (stroke=none)
 *   - outlinePath (เปิดปาก ไม่มี Z) ใช้สำหรับ stroke เท่านั้น
 *   → ไม่มีเส้นขวางปากขวดอีกต่อไป ทั้งใน browser และ OBS
 *
 * ขนาด scale ×0.5 จากเดิม:
 *   SHOULDER_H: 120→60, qCtrlY offset: +20→+10
 *   glass reflections offsets ทั้งหมดลดครึ่งหนึ่ง
 */
function JarSVG({ acColor, offset = 0 }) {
  const Jv           = getJ(offset);
  const SHOULDER_H   = 60;
  const shoulderBotY = Jv.nB + SHOULDER_H;        // 439
  const CX           = (Jv.nL + Jv.nR) / 2;       // 400
  const neckRx       = (Jv.nR - Jv.nL) / 2;       // 43
  const rimRy        = Math.round(neckRx * 0.128); // 6

  const dx     = Jv.nL - Jv.bL;                   // 36
  const qOfsX  = Math.round(dx * 0.53);            // 19
  const qCtrlY = Jv.nB + 10;                       // 389

  // ── jarPath: closed (Z) — ใช้สำหรับ fill เท่านั้น ──
  const jarPath = [
    `M ${Jv.nL} ${Jv.nT}`,
    `L ${Jv.nL} ${Jv.nB}`,
    `Q ${Jv.nL - qOfsX} ${qCtrlY} ${Jv.bL} ${shoulderBotY}`,
    `L ${Jv.bL} ${Jv.bB}`,
    `Q ${Jv.bL} ${Jv.floor} ${Jv.bL + 9} ${Jv.floor}`,
    `L ${Jv.bR - 9} ${Jv.floor}`,
    `Q ${Jv.bR} ${Jv.floor} ${Jv.bR} ${Jv.bB}`,
    `L ${Jv.bR} ${shoulderBotY}`,
    `Q ${Jv.nR + qOfsX} ${qCtrlY} ${Jv.nR} ${Jv.nB}`,
    `L ${Jv.nR} ${Jv.nT}`,
    'Z',
  ].join(' ');

  // ── outlinePath: เปิดปาก (ไม่มี Z) — ใช้สำหรับ stroke เท่านั้น ──
  // เริ่มจากขวา nT → วนรอบ → ซ้าย nT โดยไม่ลากข้ามปาก
  const outlinePath = [
    `M ${Jv.nR} ${Jv.nT}`,
    `L ${Jv.nR} ${Jv.nB}`,
    `Q ${Jv.nR + qOfsX} ${qCtrlY} ${Jv.bR} ${shoulderBotY}`,
    `L ${Jv.bR} ${Jv.bB}`,
    `Q ${Jv.bR} ${Jv.floor} ${Jv.bR - 9} ${Jv.floor}`,
    `L ${Jv.bL + 9} ${Jv.floor}`,
    `Q ${Jv.bL} ${Jv.floor} ${Jv.bL} ${Jv.bB}`,
    `L ${Jv.bL} ${shoulderBotY}`,
    `Q ${Jv.nL - qOfsX} ${qCtrlY} ${Jv.nL} ${Jv.nB}`,
    `L ${Jv.nL} ${Jv.nT}`,
    // ไม่มี Z — ปากขวดเปิด ไม่มีเส้นขวาง
  ].join(' ');

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="12%"  stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="45%"  stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="88%"  stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Glass fill: jarPath (closed) fill เท่านั้น ── */}
      <path d={jarPath} fill="url(#jarGlass)" stroke="none" />

      {/* ── Outline: outlinePath (open mouth) stroke เท่านั้น ── */}
      {/* Shadow outline */}
      <path d={outlinePath} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="5" strokeLinejoin="round" />
      {/* Glass edge */}
      <path d={outlinePath} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* ── ไหล่ซ้าย highlight ── */}
      <path
        d={`M ${Jv.nL + 2} ${Jv.nB} Q ${Jv.nL - qOfsX + 2} ${qCtrlY} ${Jv.bL + 3} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round"
      />
      {/* ── ไหล่ขวา sheen ── */}
      <path
        d={`M ${Jv.nR - 2} ${Jv.nB} Q ${Jv.nR + qOfsX - 2} ${qCtrlY} ${Jv.bR - 3} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeLinecap="round"
      />

      {/* ── Glass reflections inside body ── */}
      <line
        x1={Jv.bL + 8} y1={shoulderBotY + 8}
        x2={Jv.bL + 8} y2={Jv.bB - 20}
        stroke="rgba(255,255,255,0.16)" strokeWidth="3"
        strokeLinecap="round" filter="url(#glow)"
      />
      <line
        x1={Jv.bL + 15} y1={shoulderBotY + 30}
        x2={Jv.bL + 15} y2={shoulderBotY + 95}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1={Jv.bR - 10} y1={shoulderBotY + 15}
        x2={Jv.bR - 10} y2={shoulderBotY + 55}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ── ก้นโถ ellipse ── */}
      <ellipse
        cx={CX} cy={Jv.floor - 1}
        rx={(Jv.bR - Jv.bL) / 2 - 7} ry={3}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1"
      />

      {/* ── ปากขวดเปิด (open rim ellipse) ── */}
      <ellipse
        cx={CX} cy={Jv.nT}
        rx={neckRx} ry={rimRy}
        fill="rgba(255,255,255,0.09)"
        stroke="rgba(255,255,255,0.78)" strokeWidth="1.5"
      />
      {/* ขอบใน rim — แสดงความหนาแก้ว */}
      <ellipse
        cx={CX} cy={Jv.nT + 6}
        rx={neckRx - 2} ry={rimRy - 1}
        fill="none"
        stroke="rgba(255,255,255,0.24)" strokeWidth="1"
      />

      {/* ── คอขวด inner edge lines ── */}
      <line x1={Jv.nL} y1={Jv.nT} x2={Jv.nL} y2={Jv.nB} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      <line x1={Jv.nR} y1={Jv.nT} x2={Jv.nR} y2={Jv.nB} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
    </svg>
  );
}

// Next.js: ปิด SSR
export function getServerSideProps() { return { props: {} }; }
