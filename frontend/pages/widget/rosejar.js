// widget/rosejar.js — Rose Jar Physics Widget สำหรับ OBS / TikTok Studio
// โถแก้วรับของขวัญ: Rose = 🌹 ตกลงมา, gift อื่น = emoji/รูปตามชนิด
// OBS Size แนะนำ: 400 × 600  (พื้นหลังโปร่งใส)
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles }   from '../../lib/widgetStyles';
import { createWidgetSocket }  from '../../lib/widgetSocket';

const W = 400;
const H = 600;
const ITEM_R    = 20;   // รัศมี item (px)
const MAX_ITEMS = 80;   // สูงสุดในโถ

// พิกัดโถ (wide-mouth vase — ไม่มี neck/ฝา)
const J = {
  L: 82, R: 318,    // ผนังซ้าย/ขวา inner
  jarTop: 90,       // ปากโถ (items ตกจากเหนือนี้)
  floor: 535,       // ก้นโถ inner
};

// ===== Emoji map =====
const EMOJI_MAP = {
  rose: '🌹', roses: '🌹', flower: '🌸', lily: '💐', sunflower: '🌻',
  tulip: '🌷', bouquet: '💐', daisy: '🌼', blossom: '🌸',
  lion: '🦁', panda: '🐼', bear: '🐻', tiger: '🐯', cat: '🐱', dog: '🐶',
  crown: '👑', ring: '💍', bow: '🎀', ribbon: '🎀',
  rocket: '🚀', universe: '🌌', planet: '🪐',
  diamond: '💎', gem: '💎', crystal: '🔮',
  fire: '🔥', star: '⭐', heart: '❤️', love: '❤️',
  cake: '🎂', candy: '🍬',
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

// ===== Physics helpers =====
function setupEngine(M) {
  const { Engine, Composite } = M;
  const engine = Engine.create({ gravity: { y: 2.0 } });
  Composite.add(engine.world, buildVaseWalls(M.Bodies));
  return engine;
}

function setupRunner(engine, M) {
  const { Runner } = M;
  const runner = Runner.create({ delta: 1000 / 60 });
  Runner.run(runner, engine);
  return runner;
}

function startAnimationLoop(engine, M, setItems) {
  const { Composite } = M;
  let frameCount = 0;
  let rafId;
  const tick = () => {
    frameCount++;
    if (frameCount % 2 === 0) {
      const bodies = Composite.allBodies(engine.world)
        .filter(b => b.label === 'gift')
        .map(b => ({ id: b.id, x: b.position.x, y: b.position.y, angle: b.angle, img: b._img, emoji: b._emoji }));
      setItems([...bodies]);
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return { cancel: () => cancelAnimationFrame(rafId) };
}

function runPreviewMode(spawnItem, setTotal, setRoses, setLb) {
  const gifts = [
    { emoji: '🌹', count: 5, rose: true },
    { emoji: '🌹', count: 3, rose: true },
    { emoji: '💎', count: 1 },
    { emoji: '❤️', count: 4 },
    { emoji: '🌹', count: 2, rose: true },
    { emoji: '🌸', count: 2 },
    { emoji: '🔥', count: 3 },
    { emoji: '🌹', count: 6, rose: true },
  ];
  let delay = 0;
  gifts.forEach(g => {
    setTimeout(() => spawnItem(null, g.emoji, g.count), delay);
    delay += 580;
  });
  setTotal(312);
  setRoses(16);
  setLb([
    { name: 'RoseLover',   roses: 8, diamonds: 144 },
    { name: 'TikTokUser',  roses: 5, diamonds: 90  },
    { name: 'น้องแมว',     roses: 3, diamonds: 78  },
  ]);
}

// ===== Main Widget =====
let _roseSeq = 0;   // monotonic key counter

export default function RoseJarWidget() {
  const [items, setItems]   = useState([]);
  const [popup, setPopup]   = useState(null);
  const [lb, setLb]         = useState([]);
  const [total, setTotal]   = useState(0);
  const [roses, setRoses]   = useState(0);
  const [styles, setStyles] = useState(null);

  const engineRef  = useRef(null);
  const mRef       = useRef(null);
  const runnerRef  = useRef(null);
  const animRef    = useRef(null);
  const popupTimer = useRef(null);
  const lbMap      = useRef(new Map());

  const spawnItem = useCallback((imgUrl, emoji, count = 1) => {
    const M = mRef.current;
    if (!M || !engineRef.current) return;
    const { Bodies, Body, Composite } = M;
    const n = Math.min(count, 8);

    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        if (!engineRef.current) return;
        const x = J.L + ITEM_R + 4 + Math.random() * (J.R - J.L - (ITEM_R + 4) * 2);
        const y = J.jarTop - 20;

        const body = Bodies.circle(x, y, ITEM_R, {
          restitution: 0.30,
          friction:    0.55,
          frictionAir: 0.010,
          density:     0.002,
          label:       'gift',
        });
        body._img   = imgUrl;
        body._emoji = emoji;
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: Math.random() * 1.5 });
        Composite.add(engineRef.current.world, body);

        const all = Composite.allBodies(engineRef.current.world).filter(b => b.label === 'gift');
        if (all.length > MAX_ITEMS) Composite.remove(engineRef.current.world, all[0]);
      }, i * 150);
    }
  }, []);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
    const isPreview = params.get('preview') === '1';
    setStyles(parseWidgetStyles(params, 'rosejar'));

    let mounted = true;

    const initPhysics = () => {
      if (!mounted) return;
      const M = window.Matter;
      if (!M) return;

      mRef.current    = { Runner: M.Runner, Composite: M.Composite };
      engineRef.current = setupEngine(M);
      runnerRef.current = setupRunner(engineRef.current, M);
      animRef.current   = startAnimationLoop(engineRef.current, M, setItems);

      if (isPreview) {
        runPreviewMode(spawnItem, setTotal, setRoses, setLb);
        return;
      }

      createWidgetSocket(wt, {
        gift: (data) => {
          const safe     = sanitizeEvent(data);
          const diamonds = Math.round((safe.diamondCount || 0) * (safe.repeatCount || 1));
          const emoji    = getEmoji(safe.giftName || '');
          const imgUrl   = safeTikTokImageUrl(safe.giftPictureUrl) || null;
          const rose     = isRose(safe.giftName || '');

          spawnItem(imgUrl, emoji, Math.min(safe.repeatCount || 1, 8));

          if (popupTimer.current) clearTimeout(popupTimer.current);
          setPopup({ user: safe.nickname || safe.uniqueId || 'ผู้ใช้', gift: safe.giftName || 'Gift', emoji, diamonds, imgUrl, rose });
          popupTimer.current = setTimeout(() => setPopup(null), 4500);

          setTotal(c => c + diamonds);
          if (rose) setRoses(c => c + (safe.repeatCount || 1));

          const map  = lbMap.current;
          const uid  = safe.uniqueId || 'unknown';
          const prev = map.get(uid) || { name: safe.nickname || uid || '?', roses: 0, diamonds: 0 };
          map.set(uid, { name: prev.name, roses: prev.roses + (rose ? (safe.repeatCount || 1) : 0), diamonds: prev.diamonds + diamonds });

          if (map.size > 300) {
            lbMap.current = new Map(
              [...map.entries()].sort((a, b) => b[1].diamonds - a[1].diamonds).slice(0, 150)
            );
          }
          setLb([...lbMap.current.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, 3));
        },
      });
    };

    if (window.Matter) {
      initPhysics();
    } else {
      const script   = document.createElement('script');
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      script.async   = true;
      script.onload  = initPhysics;
      script.onerror = () => console.error('[RoseJar] ไม่สามารถโหลด Matter.js');
      document.head.appendChild(script);
    }

    return () => {
      mounted = false;
      animRef.current?.cancel?.();
      if (runnerRef.current && mRef.current?.Runner) mRef.current.Runner.stop(runnerRef.current);
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, [spawnItem]);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: 'transparent', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ===== Gift notification popup ===== */}
      {popup && (
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 10, maxWidth: 252,
          background: 'rgba(28,0,18,0.82)', backdropFilter: 'blur(8px)',
          borderRadius: 14, padding: '9px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          border: `1px solid ${popup.rose ? 'rgba(255,143,163,0.50)' : 'rgba(200,100,150,0.28)'}`,
          animation: 'rosePopIn 0.28s ease',
        }}>
          {popup.imgUrl
            ? <img src={popup.imgUrl} style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{popup.emoji}</span>
          }
          <div>
            <p style={{ color: popup.rose ? '#ff8fa3' : styles.ac, fontWeight: 700, fontSize: styles.fs, margin: 0, lineHeight: 1.3 }}>
              {popup.user}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: styles.fs - 2, margin: 0, lineHeight: 1.3 }}>
              {popup.gift} +{popup.diamonds} 💎
            </p>
          </div>
        </div>
      )}

      {/* ===== Physics items layer ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {items.map(item => (
          <div key={item.id} style={{
            position: 'absolute',
            left: item.x - ITEM_R, top: item.y - ITEM_R,
            width: ITEM_R * 2, height: ITEM_R * 2,
            transform: `rotate(${item.angle}rad)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: ITEM_R * 1.5, lineHeight: 1,
            userSelect: 'none',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))',
          }}>
            {item.img
              ? <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" onError={e => { e.currentTarget.style.display = 'none'; }} />
              : item.emoji
            }
          </div>
        ))}
      </div>

      {/* ===== Glass vase SVG overlay (z > items) ===== */}
      <VaseSVG acColor={styles.ac} />

      {/* ===== Stats + Leaderboard ===== */}
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 5 }}>

        {/* Rose + diamond counters */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: 'rgba(28,0,14,0.74)', borderRadius: 24, padding: '5px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,120,160,0.38)' }}>
            <span style={{ fontSize: 18 }}>🌹</span>
            <span style={{ color: '#ff8fa3', fontWeight: 800, fontSize: styles.fs + 4 }}>{roses.toLocaleString()}</span>
          </div>
          <div style={{ background: 'rgba(0,14,28,0.74)', borderRadius: 24, padding: '5px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(100,150,255,0.38)' }}>
            <span style={{ fontSize: 18 }}>💎</span>
            <span style={{ color: '#93c5fd', fontWeight: 800, fontSize: styles.fs + 4 }}>{total.toLocaleString()}</span>
          </div>
        </div>

        {/* Leaderboard top 3 */}
        {lb.map((item, i) => (
          <div key={item.name} style={{ background: 'rgba(20,0,12,0.62)', borderRadius: 20, padding: '3px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: styles.fs - 2, minWidth: 210 }}>
            <span>{['🥇','🥈','🥉'][i]}</span>
            <span style={{ color: styles.tc, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <span style={{ color: '#ff8fa3', fontWeight: 700, flexShrink: 0 }}>🌹 {item.roses}</span>
            <span style={{ color: '#93c5fd', fontWeight: 600, flexShrink: 0, fontSize: styles.fs - 3 }}>💎{item.diamonds}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes rosePopIn {
          from { opacity: 0; transform: translateX(-16px) scale(0.94); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ===== Physics walls: wide-mouth vase (ไม่มี neck) =====
function buildVaseWalls(Bodies) {
  const T = 12;
  return [
    // ก้นโถ
    Bodies.rectangle(
      (J.L + J.R) / 2, J.floor + T / 2,
      J.R - J.L + T, T,
      { isStatic: true, friction: 0.7, label: 'wall' }
    ),
    // ผนังซ้าย
    Bodies.rectangle(
      J.L - T / 2, (J.jarTop + J.floor) / 2,
      T, J.floor - J.jarTop,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
    // ผนังขวา
    Bodies.rectangle(
      J.R + T / 2, (J.jarTop + J.floor) / 2,
      T, J.floor - J.jarTop,
      { isStatic: true, friction: 0.3, label: 'wall' }
    ),
  ];
}

// ===== Glass vase SVG visual =====
function VaseSVG() {
  const L    = J.L, R = J.R;
  const TOP  = J.jarTop, FLOOR = J.floor;
  const RIM  = 18;   // ปีกขอบโถ extra width

  return (
    <svg
      width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
    >
      <defs>
        {/* Rose-tinted glass: left edge highlight → transparent center → right edge highlight */}
        <linearGradient id="rjGlass" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#f0c0d8" stopOpacity="0.32" />
          <stop offset="7%"   stopColor="#fce4f0" stopOpacity="0.58" />
          <stop offset="45%"  stopColor="#e8b0c8" stopOpacity="0.07" />
          <stop offset="93%"  stopColor="#fce4f0" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#f0c0d8" stopOpacity="0.24" />
        </linearGradient>

        {/* Rim gradient */}
        <linearGradient id="rjRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#fda4c0" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#be185d" stopOpacity="0.78" />
        </linearGradient>

        {/* Glow สำหรับ reflection */}
        <filter id="rjGlow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── ตัวโถ ── */}
      <path
        d={`
          M ${L} ${TOP + 16}
          L ${L} ${FLOOR - 22}
          Q ${L} ${FLOOR + 9} ${L + 22} ${FLOOR + 9}
          L ${R - 22} ${FLOOR + 9}
          Q ${R} ${FLOOR + 9} ${R} ${FLOOR - 22}
          L ${R} ${TOP + 16}
          Z
        `}
        fill="url(#rjGlass)"
        stroke="rgba(249,168,196,0.42)"
        strokeWidth="2"
      />

      {/* ── Rim (ขอบปากโถ) ── */}
      <rect
        x={L - RIM} y={TOP - 5}
        width={R - L + RIM * 2} height={20}
        fill="url(#rjRim)" rx="7"
        stroke="rgba(244,114,182,0.58)" strokeWidth="1.5"
      />

      {/* ── Rim top ellipse ── */}
      <ellipse
        cx={W / 2} cy={TOP + 6}
        rx={(R - L) / 2 + RIM - 2} ry={6}
        fill="none"
        stroke="rgba(253,200,224,0.60)" strokeWidth="2"
      />

      {/* ── Reflections ── */}
      <line x1={L + 14} y1={TOP + 22} x2={L + 14} y2={FLOOR - 55}
        stroke="rgba(255,255,255,0.42)" strokeWidth="7"
        strokeLinecap="round" filter="url(#rjGlow)" />
      <line x1={L + 27} y1={TOP + 55} x2={L + 27} y2={TOP + 170}
        stroke="rgba(255,255,255,0.22)" strokeWidth="3" strokeLinecap="round" />
      <line x1={R - 16} y1={TOP + 28} x2={R - 16} y2={TOP + 120}
        stroke="rgba(255,255,255,0.17)" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── ก้นโถ glow ── */}
      <ellipse
        cx={W / 2} cy={FLOOR + 2}
        rx={(R - L) / 2 - 12} ry={7}
        fill="rgba(249,168,196,0.10)"
        stroke="rgba(249,168,196,0.20)" strokeWidth="1"
      />

    </svg>
  );
}

export function getServerSideProps() { return { props: {} }; }
