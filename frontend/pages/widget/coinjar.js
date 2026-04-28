// widget/coinjar.js — Gift Jar Physics Widget สำหรับ OBS / TikTok Studio
// OBS Size แนะนำ: 1200 × 1200  (jar อยู่ด้านล่าง ส่วนบนเป็นพื้นที่ gifts ร่วง)
// เมื่อมีคนส่ง gift ใน TikTok Live → รูป gift ตกลงมาในโถพร้อม physics จริง
// ของขวัญล้นออกนอกโถได้ — กองบนพื้นข้างขวดโหล
// URL params: ?cid=CID&jx=OFFSET(-200~200)&preview=1
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';

// ขนาด canvas — W=1200, H=1200 (jar อยู่ด้านล่าง ส่วนบนเป็นพื้นที่ gifts ร่วงลงมา)
const W = 1200;
const H = 1200;

/**
 * คำนวณ radius แบบ log-scale: 1 diamond → 12px, 34999 diamonds → 33px
 * ใช้ log เพื่อให้ของที่ราคาต่างกันมากๆ ยังเห็นความแตกต่างได้ชัด
 * กลาง: ~100 diamonds ≈ 18px, ~1000 diamonds ≈ 23px, ~10000 diamonds ≈ 29px
 */
function getItemR(diamonds = 0, giftScale = 100) {
  const MIN_R = 12, MAX_R = 33;
  const d = Math.max(1, diamonds || 1);
  const t = Math.min(1, Math.log(d) / Math.log(34999)); // 0→1 on log scale
  const r = Math.round(MIN_R + t * (MAX_R - MIN_R));
  return Math.round(r * (giftScale / 100));
}

// พื้น ground สำหรับ overflow — ของที่ล้นออกมากองที่นี่
const GROUND_Y = H - 30;

// พิกัดโถ base — jar อยู่ด้านล่างของ canvas 1200×1200
// offset = 0 → center=600, jar เริ่มที่ y≈660 (ส่วนบน 660px เป็นพื้นที่ gifts ร่วง)
const JAR_BASE = {
  nL: 514, nR: 686,   // neck กว้าง 172px, center=600
  nT: 662, nB: 758,   // เลื่อนลงมา 600px จากเดิม
  bL: 442, bR: 758,   // body กว้าง 316px
  bB: 1116,
  floor: 1122,
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
    enableSleeping:       true,
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
function setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, showSenderRef, showGiftNameRef, showGiftImageRef, engineRef, mRef, setJarOffset, catalogRef }) {
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
    // กรอง intermediate streak events ออก — รอเฉพาะ final event เพื่อป้องกัน double-spawn
    // isStreakable=true (giftType=1) → TikTok ยิงทั้ง intermediate (isRepeatEnd=false) และ final
    // coinjar ต้องการเฉพาะ final หรือ non-streakable เพื่อนับจำนวนถูกต้อง
    const isStreakable = !!data.isStreakable;
    const isRepeatEnd  = !isStreakable || !!data.isRepeatEnd;
    if (!isRepeatEnd) return; // ข้าม intermediate — รอ final event

    const safe     = sanitizeEvent(data);
    const emoji    = getEmoji(safe.giftName || '');
    // ใช้รูปจาก event ก่อน ถ้าไม่มีให้ fallback จาก catalog ที่ poll มา
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

    // showSender — 0 | 1
    if (style?.showSender !== undefined) {
      showSenderRef.current = parseInt(style.showSender) === 0 ? 0 : 1;
    }
    // showGiftName — 0 | 1
    if (style?.showGiftName !== undefined) {
      showGiftNameRef.current = parseInt(style.showGiftName) === 0 ? 0 : 1;
    }
    // showGiftImage — 0 | 1
    if (style?.showGiftImage !== undefined) {
      showGiftImageRef.current = parseInt(style.showGiftImage) === 0 ? 0 : 1;
    }
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
  const showSenderRef               = useRef(1); // default: แสดงชื่อผู้ส่ง
  const showGiftNameRef             = useRef(1); // default: แสดงชื่อของขวัญ
  const showGiftImageRef            = useRef(1); // default: แสดงรูปของขวัญ

  const engineRef   = useRef(null);
  const mRef        = useRef(null);
  const runnerRef   = useRef(null);
  const animRef     = useRef(null);
  const popupTimer  = useRef(null);
  const spawnTimers = useRef([]);
  const maxItemsRef   = useRef(150); // อ่านจาก ?mi= ใน useEffect
  const giftScaleRef  = useRef(100); // อ่านจาก ?gs= ใน useEffect (50-200%)
  const catalogRef    = useRef({});  // giftName.toLowerCase() → { pictureUrl }

  // ── Gift catalog polling ทุก 30 วินาที ──────────────────────────────────────
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

        // สุ่ม x ภายในคอขวด (neck width) — ตกลงมาผ่านคอก่อนเข้าตัวโถ
        const x = J.nL + itemR + 4 + Math.random() * (J.nR - J.nL - (itemR + 4) * 2);
        const y = J.nT - 144; // 144px เหนือปากขวด (off-screen) — Matter.js รองรับ off-screen

        const body = Bodies.circle(x, y, itemR, {
          restitution:   0.05,   // แทบไม่กระเด้ง
          friction:      0.35,   // ลดลงจาก 0.9 → ของขวัญไหลทับกันสมจริงขึ้น
          frictionStatic: 0.45,  // static friction ต่ำพอให้ถล่มได้เมื่อมีน้ำหนักกด
          frictionAir:   0.04,
          density:       0.002,
          label:         'gift',
          sleepThreshold: 20,    // ลดลง → หยุดนิ่งเร็วขึ้น ไม่ค้างลอย
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
      showSenderRef.current    = s.showSender    ?? 1;
      showGiftNameRef.current  = s.showGiftName  ?? 1;
      showGiftImageRef.current = s.showGiftImage ?? 1;
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

        socket = setupLiveSocket(cidOrWt, { spawnItem, setPopup, popupTimer, maxItemsRef, giftScaleRef, showSenderRef, showGiftNameRef, showGiftImageRef, engineRef, mRef, setJarOffset, catalogRef });
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
      // canvas ใหญ่ขึ้น → ส่วนบน 660px โปร่งใส gifts ร่วงลงมาสวยงาม
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
          {popup.showGiftImage !== 0 && (popup.imgUrl
            ? <img src={popup.imgUrl} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{popup.emoji}</span>
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

  // ไหล่ขวด (shoulder) — ต่อจากคอไปยังตัวโถ
  const SHOULDER_H  = 120;                               // ความสูงแนวตั้งของ shoulder
  const dx          = Jx.nL - Jx.bL;                    // = 60px (คอแคบกว่าตัว 60px ต่อข้าง)
  const shoulderLen = Math.sqrt(dx * dx + SHOULDER_H * SHOULDER_H); // ~134px
  const shoulderAng = Math.atan2(dx, SHOULDER_H);        // ~0.464 rad

  // ก้นโถ: ขยายลงถึง floor+T เพื่อ overlap กับ body walls
  const floorCY     = Jx.floor + T;  // center y ของ floor wall
  const floorHeight = T * 3;         // หนา 3× ป้องกัน tunneling

  return [
    // ── คอขวดซ้าย (neck left wall) ──
    Bodies.rectangle(
      Jx.nL - T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── คอขวดขวา (neck right wall) ──
    Bodies.rectangle(
      Jx.nR + T / 2, (Jx.nT + Jx.nB) / 2,
      T, Jx.nB - Jx.nT,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ไหล่ซ้าย (left shoulder — เอียงซ้าย) ──
    Bodies.rectangle(
      (Jx.nL + Jx.bL) / 2, Jx.nB + SHOULDER_H / 2,
      T, shoulderLen,
      { isStatic: true, angle: shoulderAng, friction: 0.3, label: 'wall' }
    ),
    // ── ไหล่ขวา (right shoulder — เอียงขวา) ──
    Bodies.rectangle(
      (Jx.nR + Jx.bR) / 2, Jx.nB + SHOULDER_H / 2,
      T, shoulderLen,
      { isStatic: true, angle: -shoulderAng, friction: 0.3, label: 'wall' }
    ),
    // ── ก้นโถ (หนาขึ้น + ขยับขึ้นให้ overlap กับ body walls) ──
    Bodies.rectangle(
      (Jx.bL + Jx.bR) / 2, floorCY,
      Jx.bR - Jx.bL + T * 2, floorHeight,
      { isStatic: true, friction: 0.7, restitution: 0.05, label: 'wall' }
    ),
    // ── ผนังซ้าย body (จาก shoulder bottom ถึง floor) ──
    Bodies.rectangle(
      Jx.bL - T / 2, (Jx.nB + SHOULDER_H + floorCY) / 2,
      T, floorCY - (Jx.nB + SHOULDER_H),
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ── ผนังขวา body (จาก shoulder bottom ถึง floor) ──
    Bodies.rectangle(
      Jx.bR + T / 2, (Jx.nB + SHOULDER_H + floorCY) / 2,
      T, floorCY - (Jx.nB + SHOULDER_H),
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
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
// โหลแก้วเปิดปาก (mason jar) — ไม่มีฝา, ปากเปิด, ไหล่โค้ง Q-curve, ก้นมน
// ความใสสูงมาก — ออกแบบสำหรับ OBS overlay วางทับหน้า VTuber
function JarSVG({ acColor, offset = 0 }) {
  const Jv           = getJ(offset);
  const SHOULDER_H   = 120;
  const shoulderBotY = Jv.nB + SHOULDER_H;              // 278 — ด้านล่างไหล่
  const CX           = (Jv.nL + Jv.nR) / 2;             // 600 — center x
  const neckRx       = (Jv.nR - Jv.nL) / 2;             // 86 — half-width คอขวด
  const rimRy        = Math.round(neckRx * 0.128);       // 11 — ความสูง ellipse ปากขวด

  // Q-curve shoulder: control point อยู่ห่างจาก nL เข้าหา bL 53% ของ dx, ต่ำกว่า nB 20px
  // dx=72 → qOfsX=38 → left ctrl=(514−38,158+20)=(476,178), right ctrl=(686+38,178)=(724,178)
  const dx     = Jv.nL - Jv.bL;                         // 72
  const qOfsX  = Math.round(dx * 0.53);                  // 38
  const qCtrlY = Jv.nB + 20;                             // 178

  // Path: คอขวดซ้าย → Q-curve ไหล่ซ้าย → ลำตัวซ้าย → ก้นมน → ลำตัวขวา → Q-curve ไหล่ขวา → คอขวดขวา
  const jarPath = [
    `M ${Jv.nL} ${Jv.nT}`,
    `L ${Jv.nL} ${Jv.nB}`,
    `Q ${Jv.nL - qOfsX} ${qCtrlY} ${Jv.bL} ${shoulderBotY}`,
    `L ${Jv.bL} ${Jv.bB}`,
    `Q ${Jv.bL} ${Jv.floor} ${Jv.bL + 18} ${Jv.floor}`,
    `L ${Jv.bR - 18} ${Jv.floor}`,
    `Q ${Jv.bR} ${Jv.floor} ${Jv.bR} ${Jv.bB}`,
    `L ${Jv.bR} ${shoulderBotY}`,
    `Q ${Jv.nR + qOfsX} ${qCtrlY} ${Jv.nR} ${Jv.nB}`,
    `L ${Jv.nR} ${Jv.nT}`,
    'Z',
  ].join(' ');

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
    >
      <defs>
        {/* แสงสะท้อนแก้ว — ความเข้มต่ำมากสำหรับ OBS overlay */}
        <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="12%"  stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="45%"  stopColor="#ffffff" stopOpacity="0.01" />
          <stop offset="88%"  stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ===== Shadow outline — ทำให้ขอบมีความลึก ===== */}
      <path d={jarPath} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="6" />

      {/* ===== Glass fill — โปร่งใสมาก ===== */}
      <path d={jarPath} fill="url(#jarGlass)" stroke="rgba(255,255,255,0.68)" strokeWidth="2" />

      {/* ===== ไหล่ซ้าย — highlight curve เล็กน้อย ===== */}
      <path
        d={`M ${Jv.nL + 2} ${Jv.nB} Q ${Jv.nL - qOfsX + 2} ${qCtrlY} ${Jv.bL + 4} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" strokeLinecap="round"
      />
      {/* ===== ไหล่ขวา — subtle sheen ===== */}
      <path
        d={`M ${Jv.nR - 2} ${Jv.nB} Q ${Jv.nR + qOfsX - 2} ${qCtrlY} ${Jv.bR - 4} ${shoulderBotY}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round"
      />

      {/* ===== Glass reflections inside body ===== */}
      {/* ซ้ายหนา — แสงหลัก */}
      <line
        x1={Jv.bL + 16} y1={shoulderBotY + 16}
        x2={Jv.bL + 16} y2={Jv.bB - 40}
        stroke="rgba(255,255,255,0.14)" strokeWidth="5"
        strokeLinecap="round" filter="url(#glow)"
      />
      {/* ซ้ายบาง */}
      <line
        x1={Jv.bL + 30} y1={shoulderBotY + 60}
        x2={Jv.bL + 30} y2={shoulderBotY + 190}
        stroke="rgba(255,255,255,0.07)" strokeWidth="2"
        strokeLinecap="round"
      />
      {/* ขวาบาง */}
      <line
        x1={Jv.bR - 20} y1={shoulderBotY + 30}
        x2={Jv.bR - 20} y2={shoulderBotY + 110}
        stroke="rgba(255,255,255,0.05)" strokeWidth="2"
        strokeLinecap="round"
      />

      {/* ===== ก้นโถ — subtle ellipse ===== */}
      <ellipse
        cx={CX} cy={Jv.floor - 2}
        rx={(Jv.bR - Jv.bL) / 2 - 14} ry={6}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.10)" strokeWidth="1"
      />

      {/* ===== ปากขวดเปิด (open rim) — ellipse บนสุด ===== */}
      <ellipse
        cx={CX} cy={Jv.nT}
        rx={neckRx} ry={rimRy}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.75)" strokeWidth="2"
      />
      {/* ขอบใน rim — แสดงความหนาของแก้ว */}
      <ellipse
        cx={CX} cy={Jv.nT + 12}
        rx={neckRx - 3} ry={rimRy - 1}
        fill="none"
        stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"
      />

      {/* ===== คอขวด — inner edge lines ===== */}
      <line
        x1={Jv.nL} y1={Jv.nT}
        x2={Jv.nL} y2={Jv.nB}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1"
      />
      <line
        x1={Jv.nR} y1={Jv.nT}
        x2={Jv.nR} y2={Jv.nB}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1"
      />
    </svg>
  );
}

// Next.js: ปิด SSR (ใช้ browser API)
export function getServerSideProps() { return { props: {} }; }
