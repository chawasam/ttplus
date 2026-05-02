// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size: 800 × 600  (container อยู่ด้านล่าง ส่วนบนเป็นพื้นที่ gifts ร่วง)
// URL params: ?cid=CID&ct=CONTAINER&jx=OFFSET(-100~100)&gs=SCALE&preview=1
// ct = jar | fatjar | fishbowl | beermug | trophy | cauldron | chest | bucket | popcorn | skull | wineglass | flowerpot
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ── Canvas ──────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;

/**
 * Gift radius — 4 tier ตามราคา diamond
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

const GROUND_Y = H - 15; // 585

// ── JAR_BASE coords (jar container) ─────────────────────────────────────────
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

// ── Module-level spawn zone (updated on container/offset change) ─────────────
// openL/openR = actual x after offset applied
let currentSpawnZone = { openL: JAR_BASE.nL, openR: JAR_BASE.nR, spawnY: JAR_BASE.nT };

// ── Container registry ───────────────────────────────────────────────────────
// Note: buildXxx functions are function declarations → hoisted, safe to ref here
const CONTAINERS = {
  jar:       { label: 'โถแก้ว',       openL: 357, openR: 443, spawnY: 331, buildWalls: buildJarWalls       },
  fatjar:    { label: 'ขวดโหล',       openL: 287, openR: 513, spawnY: 288, buildWalls: buildFatJarWalls    },
  fishbowl:  { label: 'โถปลา',        openL: 370, openR: 430, spawnY: 295, buildWalls: buildFishbowlWalls  },
  beermug:   { label: 'แก้วเบียร์',   openL: 325, openR: 475, spawnY: 290, buildWalls: buildBeerMugWalls   },
  trophy:    { label: 'ถ้วยรางวัล',   openL: 295, openR: 505, spawnY: 285, buildWalls: buildTrophyWalls    },
  cauldron:  { label: 'หม้อเวทย์',    openL: 305, openR: 495, spawnY: 285, buildWalls: buildCauldronWalls  },
  chest:     { label: 'หีบสมบัติ',    openL: 290, openR: 510, spawnY: 335, buildWalls: buildChestWalls     },
  bucket:    { label: 'ถัง',          openL: 315, openR: 485, spawnY: 290, buildWalls: buildBucketWalls    },
  popcorn:   { label: 'ป๊อปคอร์น',    openL: 285, openR: 515, spawnY: 285, buildWalls: buildPopcornWalls   },
  skull:     { label: 'กะโหลก',       openL: 360, openR: 440, spawnY: 285, buildWalls: buildSkullWalls     },
  wineglass: { label: 'แก้วไวน์',     openL: 305, openR: 495, spawnY: 285, buildWalls: buildWineGlassWalls },
  flowerpot: { label: 'กระถาง',       openL: 305, openR: 495, spawnY: 325, buildWalls: buildFlowerpotWalls },
  pandajar:  { label: 'Panda Jar',    openL: 313, openR: 487, spawnY: 288, buildWalls: buildPandaJarWalls  },
  catjar2a:  { label: 'CatJar 2 (A)', openL: 295, openR: 505, spawnY: 288, buildWalls: buildCatjar2AWalls  },
  catjar2b:  { label: 'CatJar 2 (B)', openL: 325, openR: 475, spawnY: 231, buildWalls: buildCatjar2BWalls  },
  catjar3:   { label: 'CatJar 3',     openL: 291, openR: 509, spawnY: 288, buildWalls: buildCatjar3Walls   },
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

function isRose(name = '') {
  return name.toLowerCase().includes('rose');
}

// ===================== Physics Helper Functions =====================

function setupEngine(M, buildWallsFn, ox = 0) {
  const { Engine, Composite } = M;
  const engine = Engine.create({
    gravity:              { y: 2.2 },
    positionIterations:   12,
    velocityIterations:   10,
    constraintIterations: 4,
    enableSleeping:       true,
  });
  Composite.add(engine.world, buildWallsFn(M.Bodies, ox));
  return engine;
}

function setupRunner(engine, M) {
  const { Runner, Events, Body, Composite } = M;
  const runner = Runner.create({ delta: 1000 / 60 }); // 60fps — ลด tunneling (step เล็กลงครึ่งนึง)
  Runner.run(runner, engine);

  // ── Velocity cap — ป้องกัน gift ตกเร็ว/กระเด็นออกข้างหลังชนกอง ────────────
  // MAX_VY: ลดจาก 18→14 → ชนกองนุ่มขึ้น ถ่ายแรงน้อยลง
  // MAX_VX: cap horizontal 7 px/step — กันของกระเด็นออกทางซ้าย-ขวาหลัง collision
  const MAX_VY = 14;
  const MAX_VX = 7;
  Events.on(engine, 'beforeUpdate', () => {
    for (const body of Composite.allBodies(engine.world)) {
      if (body.label === 'gift') {
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        if (vy > MAX_VY || Math.abs(vx) > MAX_VX) {
          Body.setVelocity(body, {
            x: Math.max(-MAX_VX, Math.min(MAX_VX, vx)),
            y: Math.min(MAX_VY, vy),
          });
        }
      }
    }
  });

  return runner;
}

function startAnimationLoop(engine, M, setItems) {
  const { Composite } = M;
  const KILL_Y = GROUND_Y + 40;
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

function setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, showSenderRef, showGiftNameRef, showGiftImageRef, engineRef, mRef, setJarOffset, catalogRef, containerRef }) {
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

    const safe         = sanitizeEvent(data);
    const emoji        = getEmoji(safe.giftName || '');
    const catalogEntry = catalogRef?.current?.[safe.giftName?.toLowerCase()] || null;
    const imgUrl       = safeTikTokImageUrl(safe.giftPictureUrl)
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
      const newOx  = Math.max(-100, Math.min(100, parseInt(style.jx) || 0));
      const M      = mRef.current;
      const engine = engineRef.current;
      if (M && engine) {
        const { Composite, Bodies } = M;
        const toRemove = Composite.allBodies(engine.world)
          .filter(b => b.label === 'wall' || b.label === 'ground');
        toRemove.forEach(b => Composite.remove(engine.world, b));
        J = getJ(newOx);
        const con = containerRef.current || CONTAINERS.jar;
        currentSpawnZone = { openL: con.openL + newOx, openR: con.openR + newOx, spawnY: con.spawnY ?? JAR_BASE.nT };
        Composite.add(engine.world, con.buildWalls(Bodies, newOx));
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
  const [items, setItems]               = useState([]);
  const [popup, setPopup]               = useState(null);
  const [styles, setStyles]             = useState(null);
  const [jarOffset, setJarOffset]       = useState(0);
  const [containerType, setContainerType] = useState('jar');

  const showSenderRef               = useRef(0);
  const showGiftNameRef             = useRef(0);
  const showGiftImageRef            = useRef(0);

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);
  const maxItemsRef   = useRef(80);
  const giftScaleRef  = useRef(100);
  const catalogRef    = useRef({});
  const containerRef  = useRef(CONTAINERS.jar);

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

        // x: สุ่มภายในช่องเปิดของ container
        const { openL, openR } = currentSpawnZone;
        const x = openL + itemR + 4 + Math.random() * Math.max(0, openR - openL - (itemR + 4) * 2);
        const y = (currentSpawnZone.spawnY ?? JAR_BASE.nT) / 2 - itemR; // กำเนิดกึ่งกลางระหว่าง top canvas กับปากขวด

        const body = Bodies.circle(x, y, itemR, {
          restitution:    0.02, // เด้งน้อยมาก — ตกแล้วเกือบหยุดเลย
          friction:       0.35,
          frictionStatic: 0.45,
          frictionAir:    0.04,
          density:        0.002,
          slop:           0.02, // ยอมทับกัน 2px (default 0.05) — กองแน่น ดูแข็ง
          label:          'gift',
          sleepThreshold: 60, // 1s @ 60fps — ให้เวลากลิ้งก่อนหลับ
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

        // ── ปลุก sleeping pile ทุกครั้งที่ของใหม่ตกลงมา ─────────────────────
        // ราคาถูกมาก: iterate ≤50 bodies, check flag, wake เฉพาะที่ isSleeping
        // ให้ pile สูงๆ ได้กลิ้ง/พังตามฟิสิกส์จริง ก่อนที่จะหลับใหม่
        if (M.Sleeping) {
          const { openL, openR } = currentSpawnZone;
          const margin = itemR * 2;
          for (const b of Composite.allBodies(engineRef.current.world)) {
            if (b.label === 'gift' && b.isSleeping &&
                b.position.x >= openL - margin && b.position.x <= openR + margin) {
              M.Sleeping.set(b, false);
            }
          }
        }

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

      // ── Container type ──
      const ctParam = (params.get('ct') ?? 'jar').toLowerCase();
      const container = CONTAINERS[ctParam] || CONTAINERS.jar;
      containerRef.current = container;

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
      showSenderRef.current    = s.showSender    ?? 0;
      showGiftNameRef.current  = s.showGiftName  ?? 0;
      showGiftImageRef.current = s.showGiftImage ?? 0;

      J = getJ(ox);
      currentSpawnZone = { openL: container.openL + ox, openR: container.openR + ox, spawnY: container.spawnY ?? JAR_BASE.nT };
      setJarOffset(ox);
      setContainerType(ctParam in CONTAINERS ? ctParam : 'jar');

      const initPhysics = () => {
        if (!mounted) return;
        const M = window.Matter;
        if (!M) return;

        mRef.current = { Runner: M.Runner, Composite: M.Composite, Bodies: M.Bodies, Body: M.Body };

        const engine = setupEngine(M, container.buildWalls, ox);
        engineRef.current = engine;
        runnerRef.current = setupRunner(engine, M);

        const anim = startAnimationLoop(engine, M, setItems);
        animRef.current = { cancel: anim.cancel };

        if (isPreview) {
          runPreviewMode(spawnItem);
          return;
        }

        socket = setupLiveSocket(cidOrWt, {
          spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef,
          showSenderRef, showGiftNameRef, showGiftImageRef,
          engineRef, mRef, setJarOffset, catalogRef, containerRef,
        });
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

      {/* ── Container SVG overlay ─────────────────────────────────────────── */}
      <ContainerSVG type={containerType} acColor={styles.ac} offset={jarOffset} />

      {/* ── Panda Jar image overlay (replaces SVG for pandajar skin) ──────── */}
      {/* scale=270/940≈0.2872 → 310×551px | left=277, top=150                */}
      {/* ปากขวด canvas y=288 พื้นขวด y=558 — ตรงกับ fatjar / container อื่นๆ */}
      {containerType === 'pandajar' && (
        <img
          src="/jar/panda-jar.png"
          alt=""
          style={{
            position:      'absolute',
            width:         310,
            height:        551,
            left:          277 + jarOffset,
            top:           150,
            zIndex:        3,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── CatJar2 A — Rear layer (scale=0.4355 → 470×836px | left=164, top=−34) ── */}
      {/* ปากขวด y=288 พื้นขวด y=558 | ภาพล้น canvas ด้านบน/ล่าง (overflow:hidden) */}
      {containerType === 'catjar2a' && (
        <img
          src="/jar/catjar2_R.png"
          alt=""
          style={{
            position:      'absolute',
            width:         470,
            height:        836,
            left:          164 + jarOffset,
            top:           -34,
            zIndex:        0,
            pointerEvents: 'none',
          }}
        />
      )}
      {containerType === 'catjar2a' && (
        <img
          src="/jar/catjar2_F.png"
          alt=""
          style={{
            position:      'absolute',
            width:         470,
            height:        836,
            left:          164 + jarOffset,
            top:           -34,
            zIndex:        3,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── CatJar2 B — Rear layer (scale=0.3125 → 338×600px | left=231, top=0) ── */}
      {/* ปากขวด y=231 พื้นขวด y=425 | ภาพพอดี canvas ไม่ล้น                      */}
      {containerType === 'catjar2b' && (
        <img
          src="/jar/catjar2_R.png"
          alt=""
          style={{
            position:      'absolute',
            width:         338,
            height:        600,
            left:          231 + jarOffset,
            top:           0,
            zIndex:        0,
            pointerEvents: 'none',
          }}
        />
      )}
      {containerType === 'catjar2b' && (
        <img
          src="/jar/catjar2_F.png"
          alt=""
          style={{
            position:      'absolute',
            width:         338,
            height:        600,
            left:          231 + jarOffset,
            top:           0,
            zIndex:        3,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── CatJar3 — Rear layer (scale=0.4441 → 480×853px | left=160, top=-39) ── */}
      {/* ปากขวด y=288 พื้นขวด y=558 | overflow:hidden บน container ตัดส่วนล้น    */}
      {containerType === 'catjar3' && (
        <img
          src="/jar/catjar3_R.png"
          alt=""
          style={{
            position:      'absolute',
            width:         480,
            height:        853,
            left:          160 + jarOffset,
            top:           -39,
            zIndex:        0,
            pointerEvents: 'none',
          }}
        />
      )}
      {containerType === 'catjar3' && (
        <img
          src="/jar/catjar3_F.png"
          alt=""
          style={{
            position:      'absolute',
            width:         480,
            height:        853,
            left:          160 + jarOffset,
            top:           -39,
            zIndex:        3,
            pointerEvents: 'none',
          }}
        />
      )}

      <style>{`
        @keyframes jarPopIn {
          from { opacity: 0; transform: translateX(-14px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ===================== Physics Walls — JAR (original โถแก้วมีคอ) =====================
function buildJarWalls(Bodies, ox = 0) {
  const T          = 22;
  const Jx         = getJ(ox);
  const SHOULDER_H = 60;

  const dx          = Jx.nL - Jx.bL;
  const shoulderLen = Math.sqrt(dx * dx + SHOULDER_H * SHOULDER_H);
  const shoulderAng = Math.atan2(dx, SHOULDER_H);

  const floorCY     = Jx.floor + T;
  const floorHeight = T * 3;

  return [
    Bodies.rectangle(Jx.nL - T/2, (Jx.nT+Jx.nB)/2, T, Jx.nB-Jx.nT, { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle(Jx.nR + T/2, (Jx.nT+Jx.nB)/2, T, Jx.nB-Jx.nT, { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle((Jx.nL+Jx.bL)/2, Jx.nB+SHOULDER_H/2, T, shoulderLen, { isStatic:true, angle:shoulderAng,  friction:0.3, label:'wall' }),
    Bodies.rectangle((Jx.nR+Jx.bR)/2, Jx.nB+SHOULDER_H/2, T, shoulderLen, { isStatic:true, angle:-shoulderAng, friction:0.3, label:'wall' }),
    Bodies.rectangle((Jx.bL+Jx.bR)/2, floorCY, Jx.bR-Jx.bL+T*2, floorHeight, { isStatic:true, friction:0.7, restitution:0.05, label:'wall' }),
    Bodies.rectangle(Jx.bL - T/2, (Jx.nB+SHOULDER_H+floorCY)/2, T, floorCY-(Jx.nB+SHOULDER_H), { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle(Jx.bR + T/2, (Jx.nB+SHOULDER_H+floorCY)/2, T, floorCY-(Jx.nB+SHOULDER_H), { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle(W/2, GROUND_Y+T/2, W+T*2, T, { isStatic:true, friction:0.8, label:'ground' }),
    Bodies.rectangle(-T/2, H/2, T, H*2, { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle(W+T/2, H/2, T, H*2, { isStatic:true, friction:0.3, label:'wall' }),
  ];
}

// ===================== Physics Walls — FATJAR (ขวดโหลทรงกระบอกอ้วน ปากกว้าง) =====================
function buildFatJarWalls(Bodies, ox = 0) {
  const o = ox;
  const L = 287+o, R = 513+o;
  const topY = 288, botY = 558;
  return [
    vW(Bodies, L, topY, botY, true),
    vW(Bodies, R, topY, botY, false),
    cFloor(Bodies, botY, L, R),
    ...commonWalls(Bodies),
  ];
}

// ===================== Physics Wall Helpers =====================
const _T = 22;

/**
 * สร้าง wall segment จากจุด (x1,y1) ไป (x2,y2)
 * angle = atan2(x1-x2, y2-y1) ทำให้ rectangle ตามแนวเส้น
 */
function makeSeg(Bodies, x1, y1, x2, y2, opts = {}) {
  const cx  = (x1 + x2) / 2;
  const cy  = (y1 + y2) / 2;
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy) || _T;
  const ang = Math.atan2(x1 - x2, y2 - y1);
  return Bodies.rectangle(cx, cy, _T, len, { isStatic:true, friction:0.3, label:'wall', angle:ang, ...opts });
}

/** พื้น container — หนา 3× เพื่อป้องกัน tunneling */
function cFloor(Bodies, y, x1, x2) {
  return Bodies.rectangle(
    (x1+x2)/2, y + _T,
    (x2-x1) + _T*2, _T*3,
    { isStatic:true, friction:0.7, restitution:0.05, label:'wall' }
  );
}

/** ผนังตั้งตรง — isLeft: center ห่างเข้าด้านใน */
function vW(Bodies, innerX, y1, y2, isLeft = true) {
  const cx = isLeft ? innerX - _T/2 : innerX + _T/2;
  return Bodies.rectangle(cx, (y1+y2)/2, _T, Math.max(y2-y1, _T),
    { isStatic:true, friction:0.3, label:'wall' });
}

/** ผนัง canvas ทั่วไป + พื้น overflow */
function commonWalls(Bodies) {
  return [
    Bodies.rectangle(W/2, GROUND_Y+_T/2, W+_T*2, _T, { isStatic:true, friction:0.8, label:'ground' }),
    Bodies.rectangle(-_T/2, H/2, _T, H*2, { isStatic:true, friction:0.3, label:'wall' }),
    Bodies.rectangle(W+_T/2, H/2, _T, H*2, { isStatic:true, friction:0.3, label:'wall' }),
  ];
}

// ===================== Container Wall Builders =====================

/** โถปลา — คอแคบ ตัวโป่งออก */
function buildFishbowlWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    vW(Bodies, 370+o, 295, 325, true),
    vW(Bodies, 430+o, 295, 325, false),
    makeSeg(Bodies, 370+o,325, 310+o,400),
    makeSeg(Bodies, 310+o,400, 275+o,470),
    makeSeg(Bodies, 275+o,470, 300+o,540),
    makeSeg(Bodies, 300+o,540, 320+o,558),
    makeSeg(Bodies, 430+o,325, 490+o,400),
    makeSeg(Bodies, 490+o,400, 525+o,470),
    makeSeg(Bodies, 525+o,470, 500+o,540),
    makeSeg(Bodies, 500+o,540, 480+o,558),
    cFloor(Bodies, 558, 320+o, 480+o),
    ...commonWalls(Bodies),
  ];
}

/** แก้วเบียร์ — สี่เหลี่ยมตรง */
function buildBeerMugWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    vW(Bodies, 325+o, 290, 558, true),
    vW(Bodies, 475+o, 290, 558, false),
    cFloor(Bodies, 558, 325+o, 475+o),
    ...commonWalls(Bodies),
  ];
}

/** ถ้วยรางวัล — ปากกว้าง → คอคอด → ฐานแผ่ */
function buildTrophyWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 295+o,285, 383+o,460),
    makeSeg(Bodies, 505+o,285, 417+o,460),
    vW(Bodies, 383+o, 460, 505, true),
    vW(Bodies, 417+o, 460, 505, false),
    makeSeg(Bodies, 383+o,505, 345+o,535),
    makeSeg(Bodies, 417+o,505, 455+o,535),
    vW(Bodies, 345+o, 535, 555, true),
    vW(Bodies, 455+o, 535, 555, false),
    cFloor(Bodies, 555, 345+o, 455+o),
    ...commonWalls(Bodies),
  ];
}

/** หม้อเวทย์ — ป่องออกตรงกลาง */
function buildCauldronWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 305+o,285, 265+o,400),
    makeSeg(Bodies, 265+o,400, 295+o,558),
    makeSeg(Bodies, 495+o,285, 535+o,400),
    makeSeg(Bodies, 535+o,400, 505+o,558),
    cFloor(Bodies, 558, 295+o, 505+o),
    ...commonWalls(Bodies),
  ];
}

/** หีบสมบัติ — สี่เหลี่ยมตรง เปิดบน */
function buildChestWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    vW(Bodies, 290+o, 335, 558, true),
    vW(Bodies, 510+o, 335, 558, false),
    cFloor(Bodies, 558, 290+o, 510+o),
    ...commonWalls(Bodies),
  ];
}

/** ถัง — บนกว้าง ล่างแคบ */
function buildBucketWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 315+o,290, 350+o,558),
    makeSeg(Bodies, 485+o,290, 450+o,558),
    cFloor(Bodies, 558, 350+o, 450+o),
    ...commonWalls(Bodies),
  ];
}

/** กล่องป๊อปคอร์น — บานกว้าง กางมากกว่าถัง */
function buildPopcornWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 285+o,285, 345+o,558),
    makeSeg(Bodies, 515+o,285, 455+o,558),
    cFloor(Bodies, 558, 345+o, 455+o),
    ...commonWalls(Bodies),
  ];
}

/** กะโหลก — คอ → หัวป่อง → คาง */
function buildSkullWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    vW(Bodies, 360+o, 285, 315, true),
    vW(Bodies, 440+o, 285, 315, false),
    makeSeg(Bodies, 360+o,315, 295+o,390),
    vW(Bodies, 295+o, 390, 455, true),
    makeSeg(Bodies, 295+o,455, 340+o,510),
    makeSeg(Bodies, 440+o,315, 505+o,390),
    vW(Bodies, 505+o, 390, 455, false),
    makeSeg(Bodies, 505+o,455, 460+o,510),
    cFloor(Bodies, 510, 340+o, 460+o),
    ...commonWalls(Bodies),
  ];
}

/** แก้วไวน์ — ปากกว้าง → ก้านเรียว → ฐาน */
function buildWineGlassWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 305+o,285, 383+o,455),
    makeSeg(Bodies, 495+o,285, 417+o,455),
    vW(Bodies, 383+o, 455, 500, true),
    vW(Bodies, 417+o, 455, 500, false),
    makeSeg(Bodies, 383+o,500, 340+o,525),
    makeSeg(Bodies, 417+o,500, 460+o,525),
    vW(Bodies, 340+o, 525, 545, true),
    vW(Bodies, 460+o, 525, 545, false),
    cFloor(Bodies, 545, 340+o, 460+o),
    ...commonWalls(Bodies),
  ];
}

/** กระถาง — บนกว้างมีขอบ ล่างแคบ */
function buildFlowerpotWalls(Bodies, ox = 0) {
  const o = ox;
  return [
    makeSeg(Bodies, 305+o,325, 345+o,558),
    makeSeg(Bodies, 495+o,325, 455+o,558),
    cFloor(Bodies, 558, 345+o, 455+o),
    ...commonWalls(Bodies),
  ];
}

// ===================== Physics Walls — PANDAJAR (ขวดโหลแพนด้า image overlay) =====================
// Image: /jar/panda-jar.png (1080×1920 RGBA)
// Scale = 270/940 ≈ 0.2872  →  display 310×551 px, left=277, top=150
// Mapping: canvas_x = image_x × 0.2872 + 277
//          canvas_y = image_y × 0.2872 + 150
//
// Key measurements (panda-free zone, image y=1000–1280):
//   left  inner x = 124  →  canvas x = 312.6 → 313
//   right inner x = 732  →  canvas x = 487.3 → 487
//   center = (313+487)/2 = 400.0  ← กึ่งกลาง canvas พอดี
//
// Bottom curve (image y=1280→1415):
//   left_inner:  307 → 310 → 316 → 323  (canvas y=518→531→544→556)
//   right_inner: 493 → 491 → 484 → 477
function buildPandaJarWalls(Bodies, ox = 0) {
  const o  = ox;
  const L  = 313 + o;   // left inner wall x  (image x=124, scale 0.2872, left=277)
  const R  = 487 + o;   // right inner wall x (image x=732)
  const tY = 288;       // ปากขวด — ตรงกับ fatjar / container อื่น
  const bY = 518;       // จุดเริ่มโค้งก้นขวด (image y≈1280)
  return [
    vW(Bodies, L, tY, bY, true),              // ผนังซ้ายตรง
    vW(Bodies, R, tY, bY, false),             // ผนังขวาตรง
    makeSeg(Bodies, L,   bY,    L+3,  531),   // โค้งซ้าย ท่อนที่ 1
    makeSeg(Bodies, L+3, 531,   L+10, 558),   // โค้งซ้าย ท่อนที่ 2
    makeSeg(Bodies, R,   bY,    R-2,  531),   // โค้งขวา ท่อนที่ 1
    makeSeg(Bodies, R-2, 531,   R-10, 558),   // โค้งขวา ท่อนที่ 2
    cFloor(Bodies, 558, L+10, R-10),          // พื้น: x=323 → 477
    ...commonWalls(Bodies),
  ];
}

// ===================== Physics Walls — CATJAR2 A =====================
// Option A: scale = 270/620 ≈ 0.4355 → display 470×836 px | left=164, top=−34
// canvas_x = image_x × 0.4355 + 164
// canvas_y = image_y × 0.4355 − 34
//
// Key measurements (stable zone image y=1000–1240):
//   left  inner x = 300 → canvas x = 295
//   right inner x = 782 → canvas x = 505
//   center = (295+505)/2 = 400.0 ✓
//
// Bottom curve (image y=1240→1360):
//   left:  (299,506)→(290,545)→(287,558)
//   right: (502,506)→(510,545)→(513,558)
function buildCatjar2AWalls(Bodies, ox = 0) {
  const o  = ox;
  const L  = 295 + o;
  const R  = 505 + o;
  const tY = 288;   // ปากขวด
  const bY = 506;   // จุดเริ่มโค้งก้น (image y≈1240)
  return [
    vW(Bodies, L,     tY,  bY,   true),            // ผนังซ้ายตรง
    vW(Bodies, R,     tY,  bY,   false),            // ผนังขวาตรง
    makeSeg(Bodies, L+4,  bY,  L-5,  545),          // โค้งซ้าย ท่อนที่ 1
    makeSeg(Bodies, L-5,  545, L-8,  558),          // โค้งซ้าย ท่อนที่ 2
    makeSeg(Bodies, R-3,  bY,  R+5,  545),          // โค้งขวา ท่อนที่ 1
    makeSeg(Bodies, R+5,  545, R+8,  558),          // โค้งขวา ท่อนที่ 2
    cFloor(Bodies, 558, L-8, R+8),                  // พื้นในขวด: x=287→513
    // พื้นนอกขวด (เส้นน้ำเงิน y≈390) — หนา 3× ป้องกัน tunneling
    Bodies.rectangle(400 + o, 390 + 15, 800, 30, { isStatic: true, friction: 0.3 }),
    ...commonWalls(Bodies),
  ];
}

// ===================== Physics Walls — CATJAR2 B =====================
// Option B: scale = 600/1920 ≈ 0.3125 → display 338×600 px | left=231, top=0
// canvas_x = image_x × 0.3125 + 231
// canvas_y = image_y × 0.3125 + 0
//
// Key measurements:
//   left  inner x = 300 → canvas x = 325
//   right inner x = 782 → canvas x = 475
//   center = (325+475)/2 = 400.0 ✓
//   ปากขวด canvas y = 231  |  พื้นขวด canvas y = 425
//
// Bottom curve (image y=1240→1360):
//   left:  (327,388)→(321,416)→(319,425)
//   right: (474,388)→(479,416)→(481,425)
function buildCatjar2BWalls(Bodies, ox = 0) {
  const o  = ox;
  const L  = 325 + o;
  const R  = 475 + o;
  const tY = 231;   // ปากขวด (image y=740 × 0.3125)
  const bY = 388;   // จุดเริ่มโค้งก้น (image y≈1240 × 0.3125)
  const fY = 425;   // พื้นขวด (image y=1360 × 0.3125)
  return [
    vW(Bodies, L,     tY,  bY,   true),
    vW(Bodies, R,     tY,  bY,   false),
    makeSeg(Bodies, L+2,  bY,  L-4,  416),
    makeSeg(Bodies, L-4,  416, L-6,  fY),
    makeSeg(Bodies, R-1,  bY,  R+4,  416),
    makeSeg(Bodies, R+4,  416, R+6,  fY),
    cFloor(Bodies, fY, L-6, R+6),
    ...commonWalls(Bodies),
  ];
}

// ===================== Physics Walls — CATJAR3 =====================
// Image: /jar/catjar3_F.png  1080×1920 px RGBA
// scale = 270 / (1344 - 736) = 270 / 608 = 0.4441
// CSS: width=480px height=853px left=160px top=-39px
// canvas_x = image_x * 0.4441 + 160
// canvas_y = image_y * 0.4441 - 39
//
// Key measurements (image coords → canvas):
//   left  inner x = 295 → canvas x = 291
//   right inner x = 786 → canvas x = 509
//   center = (291+509)/2 = 400 ✓
//   ปากขวด image y=736  → canvas y=288 ✓
//   พื้นขวด image y=1344 → canvas y=558 ✓
//
// Bottom curve (image y=1284→1344): walls flare very slightly outward
//   left:  (291,540)→(288,558)
//   right: (509,540)→(512,558)
function buildCatjar3Walls(Bodies, ox = 0) {
  const o  = ox;
  const L  = 291 + o;
  const R  = 509 + o;
  const tY = 288;   // ปากขวด
  const bY = 540;   // จุดเริ่มโค้งก้น (image y≈1304)
  return [
    vW(Bodies, L,    tY,  bY,  true),             // ผนังซ้ายตรง
    vW(Bodies, R,    tY,  bY,  false),             // ผนังขวาตรง
    makeSeg(Bodies, L,    bY,  L - 3, 558),        // โค้งซ้าย
    makeSeg(Bodies, R,    bY,  R + 3, 558),        // โค้งขวา
    cFloor(Bodies, 558, L - 3, R + 3),             // พื้น: x=288→512
    ...commonWalls(Bodies),
  ];
}

// ===================== SVG — Shared gradient + shell =====================
/**
 * ทุก container ใช้สไตล์แก้วใส:
 *  - fill โปร่งแสงมากๆ (เห็นทะลุ)
 *  - stroke edge ขาวบาง
 *  - ไม่มี solid background
 */
function glassGrad(id) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.10" />
      <stop offset="18%"  stopColor="#ffffff" stopOpacity="0.05" />
      <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.01" />
      <stop offset="82%"  stopColor="#ffffff" stopOpacity="0.05" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.09" />
    </linearGradient>
  );
}

function glassShell(fillPath, strokePath, gradId = 'g0') {
  return (
    <>
      <path d={fillPath}   fill={`url(#${gradId})`} stroke="none" />
      <path d={strokePath} fill="none" stroke="rgba(0,0,0,0.25)"       strokeWidth="5"   strokeLinejoin="round" strokeLinecap="round" />
      <path d={strokePath} fill="none" stroke="rgba(255,255,255,0.70)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
}

// SVG wrapper
const SVG_STYLE = { position:'absolute', inset:0, zIndex:3, pointerEvents:'none' };

// ===================== ContainerSVG dispatcher =====================
function ContainerSVG({ type, acColor, offset = 0 }) {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={SVG_STYLE}>
      {(type === 'jar'       || !type) && <JarInner       acColor={acColor} ox={offset} />}
      {type === 'fatjar'               && <FatJarInner    acColor={acColor} ox={offset} />}
      {type === 'fishbowl'             && <FishbowlInner   acColor={acColor} ox={offset} />}
      {type === 'beermug'              && <BeerMugInner    acColor={acColor} ox={offset} />}
      {type === 'trophy'               && <TrophyInner     acColor={acColor} ox={offset} />}
      {type === 'cauldron'             && <CauldronInner   acColor={acColor} ox={offset} />}
      {type === 'chest'                && <ChestInner      acColor={acColor} ox={offset} />}
      {type === 'bucket'               && <BucketInner     acColor={acColor} ox={offset} />}
      {type === 'popcorn'              && <PopcornInner    acColor={acColor} ox={offset} />}
      {type === 'skull'                && <SkullInner      acColor={acColor} ox={offset} />}
      {type === 'wineglass'            && <WineGlassInner  acColor={acColor} ox={offset} />}
      {type === 'flowerpot'            && <FlowerpotInner  acColor={acColor} ox={offset} />}
    </svg>
  );
}

// ===================== JarInner (original โถแก้วมีคอ) =====================
function JarInner({ ox = 0 }) {
  const Jv           = getJ(ox);
  const SHOULDER_H   = 60;
  const shoulderBotY = Jv.nB + SHOULDER_H;
  const CX           = (Jv.nL + Jv.nR) / 2;
  const neckRx       = (Jv.nR - Jv.nL) / 2;
  const rimRy        = Math.round(neckRx * 0.128);
  const dx    = Jv.nL - Jv.bL;
  const qOfsX = Math.round(dx * 0.53);
  const qCtrlY = Jv.nB + 10;

  const fillPath = [
    `M ${Jv.nL} ${Jv.nT}`,
    `L ${Jv.nL} ${Jv.nB}`,
    `Q ${Jv.nL-qOfsX} ${qCtrlY} ${Jv.bL} ${shoulderBotY}`,
    `L ${Jv.bL} ${Jv.bB}`,
    `Q ${Jv.bL} ${Jv.floor} ${Jv.bL+9} ${Jv.floor}`,
    `L ${Jv.bR-9} ${Jv.floor}`,
    `Q ${Jv.bR} ${Jv.floor} ${Jv.bR} ${Jv.bB}`,
    `L ${Jv.bR} ${shoulderBotY}`,
    `Q ${Jv.nR+qOfsX} ${qCtrlY} ${Jv.nR} ${Jv.nB}`,
    `L ${Jv.nR} ${Jv.nT}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M ${Jv.nR} ${Jv.nT}`,
    `L ${Jv.nR} ${Jv.nB}`,
    `Q ${Jv.nR+qOfsX} ${qCtrlY} ${Jv.bR} ${shoulderBotY}`,
    `L ${Jv.bR} ${Jv.bB}`,
    `Q ${Jv.bR} ${Jv.floor} ${Jv.bR-9} ${Jv.floor}`,
    `L ${Jv.bL+9} ${Jv.floor}`,
    `Q ${Jv.bL} ${Jv.floor} ${Jv.bL} ${Jv.bB}`,
    `L ${Jv.bL} ${shoulderBotY}`,
    `Q ${Jv.nL-qOfsX} ${qCtrlY} ${Jv.nL} ${Jv.nB}`,
    `L ${Jv.nL} ${Jv.nT}`,
  ].join(' ');

  return (
    <>
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={fillPath}   fill="url(#jarGlass)" stroke="none" />
      <path d={strokePath} fill="none" stroke="rgba(0,0,0,0.28)"       strokeWidth="5"   strokeLinejoin="round" />
      <path d={strokePath} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M ${Jv.nL+2} ${Jv.nB} Q ${Jv.nL-qOfsX+2} ${qCtrlY} ${Jv.bL+3} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M ${Jv.nR-2} ${Jv.nB} Q ${Jv.nR+qOfsX-2} ${qCtrlY} ${Jv.bR-3} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={Jv.bL+8} y1={shoulderBotY+8}  x2={Jv.bL+8}  y2={Jv.bB-20}
        stroke="rgba(255,255,255,0.16)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
      <line x1={Jv.bL+15} y1={shoulderBotY+30} x2={Jv.bL+15} y2={shoulderBotY+95}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={Jv.bR-10} y1={shoulderBotY+15} x2={Jv.bR-10} y2={shoulderBotY+55}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx={CX} cy={Jv.floor-1} rx={(Jv.bR-Jv.bL)/2-7} ry={3}
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <ellipse cx={CX} cy={Jv.nT} rx={neckRx} ry={rimRy}
        fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.78)" strokeWidth="1.5" />
      <ellipse cx={CX} cy={Jv.nT+6} rx={neckRx-2} ry={Math.max(1,rimRy-1)}
        fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
      <line x1={Jv.nL} y1={Jv.nT} x2={Jv.nL} y2={Jv.nB} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
      <line x1={Jv.nR} y1={Jv.nT} x2={Jv.nR} y2={Jv.nB} stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
    </>
  );
}

// ===================== FatJarInner — ขวดโหลทรงกระบอกอ้วน (สมจริง) =====================
function FatJarInner({ ox = 0 }) {
  const o   = ox;
  const L   = 287+o, R = 513+o, CX = 400+o;
  const tY  = 288;           // ขอบบน (ปากขวด)
  const bIY = 558;           // พื้นด้านใน
  const bOY = 572;           // พื้นด้านนอก (นูนเล็กน้อย)
  const HW  = (R - L) / 2;  // half-width = 113
  const rimRx = HW;
  const rimRy = Math.round(HW * 0.13); // ~15

  // ─── Body path ───
  // ปิด: M ซ้ายบน → ซ้ายล่าง → โค้งก้น → ขวาล่าง → ขวาบน → Z
  const bodyFill = [
    `M${L} ${tY}`,
    `L${L} ${bIY}`,
    `Q${L}  ${bOY} ${CX} ${bOY}`,
    `Q${R}  ${bOY} ${R}  ${bIY}`,
    `L${R} ${tY}`,
    'Z',
  ].join(' ');

  // เปิดบน: วาดเส้นขอบ (ไม่ปิดด้านบน — ปากขวดเปิด)
  const bodyStroke = [
    `M${L} ${tY}`,
    `L${L} ${bIY}`,
    `Q${L}  ${bOY} ${CX} ${bOY}`,
    `Q${R}  ${bOY} ${R}  ${bIY}`,
    `L${R} ${tY}`,
  ].join(' ');

  return (
    <>
      <defs>
        {/* gradient หลัก: ขาวจางมากที่ขอบ → โปร่งใสตรงกลาง */}
        <linearGradient id="jg2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"    stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="7%"    stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="25%"   stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="50%"   stopColor="#ffffff" stopOpacity="0.01" />
          <stop offset="75%"   stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="93%"   stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="100%"  stopColor="#ffffff" stopOpacity="0.18" />
        </linearGradient>
        {/* gradient แนวตั้ง: มืดด้านล่างเล็กน้อย (depth) */}
        <linearGradient id="jgV" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"    stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="70%"   stopColor="#000000" stopOpacity="0.00" />
          <stop offset="100%"  stopColor="#000000" stopOpacity="0.10" />
        </linearGradient>
        <filter id="jGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* 1. เนื้อแก้วโปร่งใส (fill) */}
      <path d={bodyFill} fill="url(#jg2)"  stroke="none" />
      <path d={bodyFill} fill="url(#jgV)"  stroke="none" />

      {/* 2. เส้นขอบนอก — เงาดำ */}
      <path d={bodyStroke} fill="none"
        stroke="rgba(0,0,0,0.32)" strokeWidth="7"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* 3. เส้นขอบแก้ว — ขาวสว่าง */}
      <path d={bodyStroke} fill="none"
        stroke="rgba(255,255,255,0.80)" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* 4. ไฮไลต์หลัก ซ้าย: แถบสว่างแนวตั้ง (แสงหักเหที่ผิวแก้ว) */}
      <rect x={L+4} y={tY+12} width={16} height={bIY-tY-50} rx={8}
        fill="rgba(255,255,255,0.13)" />
      <line x1={L+7}  y1={tY+24}  x2={L+7}  y2={bIY-40}
        stroke="rgba(255,255,255,0.42)" strokeWidth="3"
        strokeLinecap="round" filter="url(#jGlow)" />
      <line x1={L+14} y1={tY+50}  x2={L+14} y2={tY+220}
        stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round" />

      {/* 5. ไฮไลต์เล็กซ้ายที่สอง */}
      <line x1={L+22} y1={tY+60}  x2={L+22} y2={tY+150}
        stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeLinecap="round" />

      {/* 6. ไฮไลต์ขวาจาง */}
      <line x1={R-7}  y1={tY+30}  x2={R-7}  y2={tY+130}
        stroke="rgba(255,255,255,0.10)" strokeWidth="2" strokeLinecap="round" />

      {/* 7. เส้นโค้งแนวนอน กลางลำตัว — แสดงความนูนของทรงกระบอก */}
      <path d={`M${L+10} ${tY+145} Q${CX} ${tY+132} ${R-10} ${tY+145}`}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
      <path d={`M${L+10} ${tY+260} Q${CX} ${tY+248} ${R-10} ${tY+260}`}
        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />

      {/* 8. พื้นก้นขวด — แสงสะท้อน */}
      <ellipse cx={CX} cy={bOY-3} rx={HW-10} ry={4}
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* 9. ขอบปากขวด (rim) — ellipse ด้านล่าง (depth) */}
      <ellipse cx={CX} cy={tY} rx={rimRx-1} ry={rimRy}
        fill="rgba(0,0,0,0.14)" stroke="none" />
      {/* ขอบปากขวด — ellipse ขาวสว่าง (ขอบแก้ว) */}
      <ellipse cx={CX} cy={tY} rx={rimRx} ry={rimRy}
        fill="rgba(255,255,255,0.07)"
        stroke="rgba(255,255,255,0.88)" strokeWidth="2.5" />
      {/* inner rim shadow line */}
      <ellipse cx={CX} cy={tY+5} rx={rimRx-5} ry={Math.max(2, rimRy-2)}
        fill="none"
        stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
    </>
  );
}

// ===================== FishbowlInner =====================
function FishbowlInner({ ox = 0 }) {
  const o  = ox;
  const nL = 370+o, nR = 430+o, nT = 295, nB = 325;
  const CX = 400+o;
  const nRx = (nR-nL)/2; // 30
  // Left bowl points (top→bottom)
  const lp = [[310+o,400],[275+o,470],[300+o,540],[320+o,558]];
  // Right bowl points (top→bottom)
  const rp = [[490+o,400],[525+o,470],[500+o,540],[480+o,558]];

  const L = (pts) => pts.map(p=>`L${p[0]} ${p[1]}`).join(' ');

  // fillPath: closed, goes down left side, across floor, up right side, back up neck
  const fillPath = `M${nL} ${nT} L${nL} ${nB} ${L(lp)} L${rp[3][0]} ${rp[3][1]} ${L([...rp].reverse())} L${nR} ${nB} L${nR} ${nT} Z`;
  // strokePath: open at top
  const strokePath = `M${nR} ${nT} L${nR} ${nB} ${L(rp)} L${lp[3][0]} ${lp[3][1]} ${L([...lp].reverse())} L${nL} ${nB} L${nL} ${nT}`;

  return (
    <>
      <defs>{glassGrad('fb')}</defs>
      {glassShell(fillPath, strokePath, 'fb')}
      {/* rim ellipse */}
      <ellipse cx={CX} cy={nT} rx={nRx} ry={Math.round(nRx*0.2)}
        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
      {/* left highlight */}
      <path d={`M${lp[0][0]+4} ${lp[0][1]} L${lp[1][0]+4} ${lp[1][1]}`}
        fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="2.5" strokeLinecap="round" />
      {/* waterline hint */}
      <path d={`M${275+o} 440 Q${CX} 452 ${525+o} 440`}
        fill="none" stroke="rgba(140,220,255,0.09)" strokeWidth="1.5" />
    </>
  );
}

// ===================== BeerMugInner =====================
function BeerMugInner({ ox = 0 }) {
  const o  = ox;
  const L  = 325+o, R = 475+o;
  const tY = 290, bY = 558;
  const CX = 400+o;
  // Handle on right side
  const hL  = R+2, hR = R+38, hT = 320, hB = 460;

  const fillPath   = `M${L} ${tY} L${L} ${bY} L${R} ${bY} L${R} ${tY} Z`;
  const strokePath = `M${R} ${tY} L${R} ${bY} L${L} ${bY} L${L} ${tY}`;

  return (
    <>
      <defs>{glassGrad('bm')}</defs>
      {glassShell(fillPath, strokePath, 'bm')}
      {/* Handle outline — glass */}
      <path d={`M${hL} ${hT} Q${hR+10} ${hT} ${hR} ${(hT+hB)/2} Q${hR+10} ${hB} ${hL} ${hB}`}
        fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${hL} ${hT} Q${hR+10} ${hT} ${hR} ${(hT+hB)/2} Q${hR+10} ${hB} ${hL} ${hB}`}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round" />
      {/* foam line */}
      <path d={`M${L+4} ${tY+8} Q${CX} ${tY-4} ${R-4} ${tY+8}`}
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.40)" strokeWidth="1" />
      {/* left highlight */}
      <line x1={L+8} y1={tY+20} x2={L+8} y2={bY-20}
        stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" strokeLinecap="round" />
      {/* base line */}
      <line x1={L+4} y1={bY-4} x2={R-4} y2={bY-4}
        stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
    </>
  );
}

// ===================== TrophyInner =====================
function TrophyInner({ ox = 0 }) {
  const o = ox;
  // Cup walls (angled inward)
  const lTop=[295+o,285], lBot=[383+o,460];
  const rTop=[505+o,285], rBot=[417+o,460];
  // Stem
  const sL=383+o, sR=417+o, sT=460, sB=505;
  // Base
  const bL=345+o, bR=455+o, bT=505, bB=555;
  const CX=400+o;

  const fillPath = [
    `M${lTop[0]} ${lTop[1]}`,
    `L${lBot[0]} ${lBot[1]}`,
    `L${sL} ${sB}`,
    `L${bL} ${bT}`,
    `L${bL} ${bB}`,
    `L${bR} ${bB}`,
    `L${bR} ${bT}`,
    `L${sR} ${sB}`,
    `L${rBot[0]} ${rBot[1]}`,
    `L${rTop[0]} ${rTop[1]}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M${rTop[0]} ${rTop[1]}`,
    `L${rBot[0]} ${rBot[1]}`,
    `L${sR} ${sB}`,
    `L${bR} ${bT}`,
    `L${bR} ${bB}`,
    `L${bL} ${bB}`,
    `L${bL} ${bT}`,
    `L${sL} ${sB}`,
    `L${lBot[0]} ${lBot[1]}`,
    `L${lTop[0]} ${lTop[1]}`,
  ].join(' ');

  return (
    <>
      <defs>{glassGrad('tr')}</defs>
      {glassShell(fillPath, strokePath, 'tr')}
      {/* opening rim */}
      <line x1={lTop[0]} y1={lTop[1]} x2={rTop[0]} y2={rTop[1]}
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* star on cup */}
      <text x={CX} y={385} fontSize="32" textAnchor="middle"
        fill="rgba(255,255,255,0.10)" style={{ userSelect:'none' }}>★</text>
      {/* left cup highlight */}
      <path d={`M${lTop[0]+6} ${lTop[1]+10} L${lBot[0]+4} ${lBot[1]-10}`}
        fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="2" strokeLinecap="round" />
      {/* base ellipse */}
      <ellipse cx={CX} cy={bB-2} rx={(bR-bL)/2-4} ry={3}
        fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </>
  );
}

// ===================== CauldronInner =====================
function CauldronInner({ ox = 0 }) {
  const o = ox;
  const tL=305+o, tR=495+o, tY=285;
  const mL=265+o, mR=535+o, mY=400;
  const bL=295+o, bR=505+o, bY=558;
  const CX=400+o;

  const fillPath = [
    `M${tL} ${tY}`,
    `L${mL} ${mY}`,
    `L${bL} ${bY}`,
    `L${bR} ${bY}`,
    `L${mR} ${mY}`,
    `L${tR} ${tY}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M${tR} ${tY}`,
    `L${mR} ${mY}`,
    `L${bR} ${bY}`,
    `L${bL} ${bY}`,
    `L${mL} ${mY}`,
    `L${tL} ${tY}`,
  ].join(' ');

  return (
    <>
      <defs>{glassGrad('ca')}</defs>
      {glassShell(fillPath, strokePath, 'ca')}
      {/* Left handle */}
      <path d={`M${tL} ${tY+20} Q${tL-32} ${tY+20} ${tL-30} ${tY+55} Q${tL-28} ${tY+90} ${tL} ${tY+90}`}
        fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${tL} ${tY+20} Q${tL-32} ${tY+20} ${tL-30} ${tY+55} Q${tL-28} ${tY+90} ${tL} ${tY+90}`}
        fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right handle */}
      <path d={`M${tR} ${tY+20} Q${tR+32} ${tY+20} ${tR+30} ${tY+55} Q${tR+28} ${tY+90} ${tR} ${tY+90}`}
        fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${tR} ${tY+20} Q${tR+32} ${tY+20} ${tR+30} ${tY+55} Q${tR+28} ${tY+90} ${tR} ${tY+90}`}
        fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" />
      {/* opening rim */}
      <ellipse cx={CX} cy={tY} rx={(tR-tL)/2} ry={8}
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" />
      {/* left highlight */}
      <path d={`M${mL+6} ${mY} L${bL+6} ${bY-10}`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

// ===================== ChestInner =====================
function ChestInner({ ox = 0 }) {
  const o = ox;
  const L=290+o, R=510+o;
  const tY=335, bY=558;
  const CX=400+o;
  const midY=(tY+bY)/2;

  const fillPath   = `M${L} ${tY} L${L} ${bY} L${R} ${bY} L${R} ${tY} Z`;
  const strokePath = `M${R} ${tY} L${R} ${bY} L${L} ${bY} L${L} ${tY}`;

  // Lid (open, tilted back)
  const lidPath = `M${L} ${tY} Q${CX} ${tY-60} ${R} ${tY}`;

  return (
    <>
      <defs>{glassGrad('ch')}</defs>
      {glassShell(fillPath, strokePath, 'ch')}
      {/* Lid arc */}
      <path d={lidPath} fill="rgba(255,255,255,0.04)" stroke="rgba(0,0,0,0.22)" strokeWidth="5" />
      <path d={lidPath} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" />
      {/* Metal band across middle */}
      <line x1={L} y1={midY} x2={R} y2={midY}
        stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      {/* Lock */}
      <rect x={CX-10} y={midY-10} width={20} height={18} rx={4}
        fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      <path d={`M${CX-6} ${midY-10} Q${CX-6} ${midY-20} ${CX} ${midY-20} Q${CX+6} ${midY-20} ${CX+6} ${midY-10}`}
        fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      {/* Corners rivet hints */}
      {[[L+8,tY+8],[R-8,tY+8],[L+8,bY-8],[R-8,bY-8]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      ))}
      {/* left highlight */}
      <line x1={L+8} y1={tY+20} x2={L+8} y2={bY-20}
        stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

// ===================== BucketInner =====================
function BucketInner({ ox = 0 }) {
  const o = ox;
  // Top opening, bottom narrower
  const tL=315+o, tR=485+o, tY=290;
  const bL=350+o, bR=450+o, bY=558;
  const CX=400+o;

  const fillPath = `M${tL} ${tY} L${bL} ${bY} L${bR} ${bY} L${tR} ${tY} Z`;
  const strokePath = `M${tR} ${tY} L${bR} ${bY} L${bL} ${bY} L${tL} ${tY}`;

  return (
    <>
      <defs>{glassGrad('bk')}</defs>
      {glassShell(fillPath, strokePath, 'bk')}
      {/* Handle */}
      <path d={`M${tL+10} ${tY} Q${CX} ${tY-45} ${tR-10} ${tY}`}
        fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${tL+10} ${tY} Q${CX} ${tY-45} ${tR-10} ${tY}`}
        fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5" strokeLinecap="round" />
      {/* rim ellipse */}
      <ellipse cx={CX} cy={tY} rx={(tR-tL)/2} ry={5}
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" />
      {/* left highlight */}
      <line x1={tL+10} y1={tY+15} x2={bL+5} y2={bY-12}
        stroke="rgba(255,255,255,0.13)" strokeWidth="2.5" strokeLinecap="round" />
      {/* base */}
      <line x1={bL+3} y1={bY-3} x2={bR-3} y2={bY-3}
        stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
    </>
  );
}

// ===================== PopcornInner =====================
function PopcornInner({ ox = 0 }) {
  const o = ox;
  const tL=285+o, tR=515+o, tY=285;
  const bL=345+o, bR=455+o, bY=558;
  const CX=400+o;
  const h=(bY-tY);

  const fillPath   = `M${tL} ${tY} L${bL} ${bY} L${bR} ${bY} L${tR} ${tY} Z`;
  const strokePath = `M${tR} ${tY} L${bR} ${bY} L${bL} ${bY} L${tL} ${tY}`;

  // Stripes (vertical, white & red alternating — just white lines for glass look)
  const stripes = [];
  for (let i = 1; i <= 3; i++) {
    const frac = i / 4;
    const x1 = tL + (tR-tL)*frac;
    const x2 = bL + (bR-bL)*frac;
    stripes.push(<line key={i} x1={x1} y1={tY+4} x2={x2} y2={bY-4}
      stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />);
  }

  return (
    <>
      <defs>{glassGrad('pc')}</defs>
      {glassShell(fillPath, strokePath, 'pc')}
      {/* Stripes */}
      {stripes}
      {/* Wavy popcorn top edge */}
      <path d={`M${tL} ${tY} Q${tL+15} ${tY-12} ${tL+30} ${tY} Q${tL+45} ${tY-10} ${CX-20} ${tY} Q${CX} ${tY-14} ${CX+20} ${tY} Q${CX+35} ${tY-10} ${tR-30} ${tY} Q${tR-15} ${tY-12} ${tR} ${tY}`}
        fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      {/* Top rim fill hint */}
      <line x1={tL+8} y1={tY+15} x2={bL+5} y2={bY-15}
        stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

// ===================== SkullInner =====================
function SkullInner({ ox = 0 }) {
  const o = ox;
  const nL=360+o, nR=440+o, nT=285, nB=315;
  // Cranium expand
  const hL=295+o, hR=505+o, hT=390;
  // Jaw
  const jL=340+o, jR=460+o, jY=510;
  const CX=400+o;

  // Fill: neck → expand → jaw → close
  const fillPath = [
    `M${nL} ${nT}`,
    `L${nL} ${nB}`,
    `L${hL} ${hT}`,
    `L${hL} ${455}`,
    `L${jL} ${jY}`,
    `L${jR} ${jY}`,
    `L${hR} ${455}`,
    `L${hR} ${hT}`,
    `L${nR} ${nB}`,
    `L${nR} ${nT}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M${nR} ${nT}`,
    `L${nR} ${nB}`,
    `L${hR} ${hT}`,
    `L${hR} ${455}`,
    `L${jR} ${jY}`,
    `L${jL} ${jY}`,
    `L${hL} ${455}`,
    `L${hL} ${hT}`,
    `L${nL} ${nB}`,
    `L${nL} ${nT}`,
  ].join(' ');

  // Eye socket positions
  const eyeRx=22, eyeRy=14;
  const leftEyeCX=CX-50, rightEyeCX=CX+50, eyeCY=415;

  return (
    <>
      <defs>{glassGrad('sk')}</defs>
      {glassShell(fillPath, strokePath, 'sk')}
      {/* Eye sockets — dark ellipses */}
      <ellipse cx={leftEyeCX}  cy={eyeCY} rx={eyeRx} ry={eyeRy}
        fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      <ellipse cx={rightEyeCX} cy={eyeCY} rx={eyeRx} ry={eyeRy}
        fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      {/* Nose */}
      <path d={`M${CX} ${eyeCY+20} L${CX-8} ${eyeCY+38} L${CX+8} ${eyeCY+38} Z`}
        fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.20)" strokeWidth="1" />
      {/* Teeth marks on jaw line */}
      {[-24,-8,8,24].map((dx,i) => (
        <line key={i} x1={CX+dx} y1={jY-4} x2={CX+dx} y2={jY}
          stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" />
      ))}
      {/* Cranium highlight */}
      <path d={`M${hL+8} ${hT} Q${hL+8} ${nB+10} ${nL+4} ${nB}`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

// ===================== WineGlassInner =====================
function WineGlassInner({ ox = 0 }) {
  const o = ox;
  const tL=305+o, tR=495+o, tY=285;
  const sL=383+o, sR=417+o, sT=455, sB=500;
  const baseL=340+o, baseR=460+o, baseTY=500, baseBY=545;
  const CX=400+o;

  const fillPath = [
    `M${tL} ${tY}`,
    `L${sL} ${sT}`,
    `L${sL} ${sB}`,
    `L${baseL} ${baseTY}`,
    `L${baseL} ${baseBY}`,
    `L${baseR} ${baseBY}`,
    `L${baseR} ${baseTY}`,
    `L${sR} ${sB}`,
    `L${sR} ${sT}`,
    `L${tR} ${tY}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M${tR} ${tY}`,
    `L${sR} ${sT}`,
    `L${sR} ${sB}`,
    `L${baseR} ${baseTY}`,
    `L${baseR} ${baseBY}`,
    `L${baseL} ${baseBY}`,
    `L${baseL} ${baseTY}`,
    `L${sL} ${sB}`,
    `L${sL} ${sT}`,
    `L${tL} ${tY}`,
  ].join(' ');

  return (
    <>
      <defs>{glassGrad('wg')}</defs>
      {glassShell(fillPath, strokePath, 'wg')}
      {/* Rim ellipse */}
      <ellipse cx={CX} cy={tY} rx={(tR-tL)/2} ry={6}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      {/* Bowl left highlight */}
      <path d={`M${tL+8} ${tY+10} L${sL+4} ${sT-10}`}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stem highlight */}
      <line x1={sL+4} y1={sT+5} x2={sL+4} y2={sB-5}
        stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Base ellipse */}
      <ellipse cx={CX} cy={baseBY-2} rx={(baseR-baseL)/2-4} ry={3}
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Wine level hint */}
      <path d={`M${sL+2} ${380} Q${CX} ${395} ${sR-2} ${380}`}
        fill="rgba(180,30,30,0.06)" stroke="rgba(200,60,60,0.10)" strokeWidth="1" />
    </>
  );
}

// ===================== FlowerpotInner =====================
function FlowerpotInner({ ox = 0 }) {
  const o  = ox;
  // Outer rim
  const rimL=290+o, rimR=510+o, rimT=295, rimB=325;
  // Inner (below rim, slightly inset)
  const iL=305+o, iR=495+o, iT=325;
  // Bottom
  const bL=345+o, bR=455+o, bY=558;
  const CX=400+o;

  const fillPath = [
    `M${rimL} ${rimT}`,
    `L${rimL} ${rimB}`,
    `L${iL} ${iT}`,
    `L${bL} ${bY}`,
    `L${bR} ${bY}`,
    `L${iR} ${iT}`,
    `L${rimR} ${rimB}`,
    `L${rimR} ${rimT}`,
    'Z',
  ].join(' ');

  const strokePath = [
    `M${rimR} ${rimT}`,
    `L${rimR} ${rimB}`,
    `L${iR} ${iT}`,
    `L${bR} ${bY}`,
    `L${bL} ${bY}`,
    `L${iL} ${iT}`,
    `L${rimL} ${rimB}`,
    `L${rimL} ${rimT}`,
  ].join(' ');

  return (
    <>
      <defs>{glassGrad('fp')}</defs>
      {glassShell(fillPath, strokePath, 'fp')}
      {/* Rim top ellipse */}
      <ellipse cx={CX} cy={rimT} rx={(rimR-rimL)/2} ry={6}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Rim bottom line */}
      <line x1={rimL} y1={rimB} x2={rimR} y2={rimB}
        stroke="rgba(255,255,255,0.20)" strokeWidth="1" />
      {/* Left body highlight */}
      <line x1={iL+8} y1={iT+15} x2={bL+5} y2={bY-12}
        stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Drainage hole hint */}
      <ellipse cx={CX} cy={bY-3} rx={10} ry={3}
        fill="rgba(0,0,0,0.10)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* Base */}
      <line x1={bL+3} y1={bY-4} x2={bR-3} y2={bY-4}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
    </>
  );
}

// ── Keep JarSVG as alias for backward compat (used nowhere now but safe) ──────
function JarSVG({ acColor, offset = 0 }) {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={SVG_STYLE}>
      <JarInner ox={offset} />
    </svg>
  );
}

// Next.js: ปิด SSR
export function getServerSideProps() { return { props: {} }; }
