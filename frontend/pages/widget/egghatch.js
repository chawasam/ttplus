// widget/egghatch.js — Egg Hatch Overlay สำหรับ OBS
// OBS Size แนะนำ: 300 × 420
// URL params: ?cid=xxx&goal=500&eggname=Mystery+Egg&creature=🐉
// กด R หรือปุ่ม Reset ใน TTplus เพื่อเริ่มใหม่
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const STORAGE_KEY = 'ttplus_egg_diamonds';

const CRACK_STAGES = [
  [],
  ['M 60,32 L 56,46 L 63,40 Z'],
  ['M 60,30 L 54,52 L 64,44 L 58,62', 'M 46,68 L 41,80'],
  ['M 60,30 L 52,56 L 66,48 L 56,70 L 64,86', 'M 46,65 L 38,82 L 50,90', 'M 74,58 L 80,72'],
  ['M 60,28 L 50,60 L 68,52 L 54,74 L 66,92', 'M 46,62 L 36,82 L 50,94 L 40,110', 'M 74,55 L 82,74 L 70,92', 'M 32,92 L 44,112'],
  ['M 60,27 L 47,62 L 70,52 L 52,78 L 67,96 L 54,116', 'M 46,58 L 33,82 L 50,96 L 36,114', 'M 74,52 L 84,74 L 68,92 L 82,112', 'M 30,94 L 44,116', 'M 90,80 L 76,104', 'M 60,27 L 66,46 L 55,56'],
];

// ───── Web Audio ─────────────────────────────────────────────
let _ctx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function playCollect(pct) {
  // เสียงกระดิ่งเบาๆ — ยิ่งใกล้ goal ยิ่งสูง
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const t    = ctx.currentTime;
    const freq = 600 + pct * 800; // 600Hz → 1400Hz
    const osc  = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t); osc.stop(t + 0.28);
    // shimmer overtone
    const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.frequency.value = freq * 2.01; osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.07, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc2.start(t); osc2.stop(t + 0.18);
  } catch {}
}

function playHatch() {
  // เสียง magical sparkle ขึ้นบันได
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.6);
    });
  } catch {}
}
// ─────────────────────────────────────────────────────────────

export default function EggHatchWidget() {
  const [current,    setCurrent]    = useState(0);
  const [goal,       setGoal]       = useState(500);
  const [creature,   setCreature]   = useState('🐉');
  const [eggName,    setEggName]    = useState('Mystery Egg');
  const [phase,      setPhase]      = useState('waiting'); // waiting | hatching | hatched
  const [shaking,    setShaking]    = useState(false);
  const [lastSender, setLastSender] = useState(null);

  const currentRef = useRef(0);
  const goalRef    = useRef(500);
  const phaseRef   = useRef('waiting');
  const shakeTimer = useRef(null);

  const resetEgg = useCallback(() => {
    clearTimeout(shakeTimer.current);
    currentRef.current = 0;
    phaseRef.current   = 'waiting';
    setCurrent(0); setPhase('waiting');
    setLastSender(null); setShaking(false);
    try { localStorage.setItem(STORAGE_KEY, '0'); } catch {}
  }, []);

  const addDiamonds = useCallback((amount, sender) => {
    if (phaseRef.current === 'hatched') return;

    const newVal = Math.min(goalRef.current, currentRef.current + amount);
    currentRef.current = newVal;
    setCurrent(newVal);
    setLastSender(sender);
    try { localStorage.setItem(STORAGE_KEY, String(newVal)); } catch {}

    // เสียงตาม progress
    playCollect(newVal / goalRef.current);

    // shake
    clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 500);

    if (newVal >= goalRef.current && phaseRef.current === 'waiting') {
      phaseRef.current = 'hatching';
      setPhase('hatching');
      playHatch();
      setTimeout(() => {
        phaseRef.current = 'hatched';
        setPhase('hatched');
      }, 1800);
    }
  }, []);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt') ?? '';
    const isPreview = params.get('preview') === '1';
    const doReset   = params.get('reset') === '1';
    const g         = Math.max(1, parseInt(params.get('goal') ?? '500'));
    const cre       = params.get('creature') ?? '🐉';
    const name      = params.get('eggname') ?? 'Mystery Egg';

    goalRef.current = g;
    setGoal(g);
    setCreature(decodeURIComponent(cre));
    setEggName(decodeURIComponent(name));

    let startVal = 0;
    if (!doReset && !isPreview) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) startVal = Math.min(g, parseInt(stored) || 0);
      } catch {}
    } else {
      try { localStorage.setItem(STORAGE_KEY, '0'); } catch {}
    }

    currentRef.current = startVal;
    setCurrent(startVal);
    if (startVal >= g) { phaseRef.current = 'hatched'; setPhase('hatched'); }

    if (isPreview) {
      setTimeout(() => addDiamonds(80,  'PreviewFan'), 700);
      setTimeout(() => addDiamonds(120, 'BigGifter'), 1500);
      setTimeout(() => addDiamonds(60,  'TikUser'), 2200);
      return;
    }

    const socket = createWidgetSocket(wt, {
      gift: (data) => {
        if (!data) return;
        const ev       = sanitizeEvent(data);
        const diamonds = (ev.diamondCount || 1) * (ev.repeatCount || 1);
        addDiamonds(diamonds, ev.nickname || ev.uniqueId || 'Unknown');
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'egghatch') return;
        if (style?._reset) resetEgg();
      },
    });

    return () => socket?.disconnect();
  }, [addDiamonds, resetEgg]);

  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'r') resetEgg(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetEgg]);

  const pct        = goal > 0 ? Math.min(1, current / goal) : 0;
  const crackStage = phase === 'hatching' || phase === 'hatched' ? 5 : Math.min(4, Math.floor(pct * 5));
  const cracks     = CRACK_STAGES[crackStage];

  const eggHue  = 38 - pct * 15;
  const eggSat  = 55 + pct * 20;
  const eggLit  = 88 - pct * 15;
  const eggFill = phase === 'hatching' ? '#fffde7' : `hsl(${eggHue},${eggSat}%,${eggLit}%)`;
  const innerAlpha = pct * 0.55;
  const innerColor = `rgba(255,${Math.round(200 - pct * 100)},50,${innerAlpha})`;

  const wobbleAnim =
    phase === 'hatching' ? 'eggHatch 1.8s forwards' :
    shaking              ? 'eggShake 0.5s ease'      :
    crackStage >= 4      ? 'eggWobble 0.75s ease-in-out infinite' :
    crackStage >= 2      ? 'eggWobble 2.2s ease-in-out infinite'  : 'none';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'transparent', position: 'relative', overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif', userSelect: 'none',
    }}>
      <style>{`
        @keyframes eggWobble { 0%,100%{transform:rotate(0);}20%{transform:rotate(-4deg);}40%{transform:rotate(4deg);}60%{transform:rotate(-3deg);}80%{transform:rotate(3deg);} }
        @keyframes eggShake  { 0%,100%{transform:translateX(0);}20%{transform:translateX(-9px) rotate(-2deg);}40%{transform:translateX(9px) rotate(2deg);}60%{transform:translateX(-6px) rotate(-1deg);}80%{transform:translateX(6px) rotate(1deg);} }
        @keyframes eggHatch  { 0%{transform:scale(1) rotate(0);opacity:1;filter:brightness(1);}30%{transform:scale(1.2) rotate(-6deg);filter:brightness(1.5);}55%{transform:scale(1.5) rotate(6deg);opacity:0.7;filter:brightness(3);}100%{transform:scale(2.2) rotate(0);opacity:0;} }
        @keyframes creatureIn { 0%{transform:scale(0.2) translateY(30px);opacity:0;filter:brightness(3);}55%{transform:scale(1.15) translateY(-8px);opacity:1;}100%{transform:scale(1) translateY(0);opacity:1;filter:brightness(1);} }
        @keyframes creatureFloat { 0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);} }
        @keyframes innerPulse { 0%,100%{opacity:0.7;}50%{opacity:1;} }
        @keyframes hatchedPop { 0%{transform:scale(0.5);opacity:0;}70%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;} }
        @keyframes barGlow { 0%,100%{box-shadow:0 0 6px rgba(245,158,11,0.6);}50%{box-shadow:0 0 18px rgba(245,158,11,0.95);} }
      `}</style>

      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.07em', marginBottom: '14px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
        🥚 {eggName}
      </div>

      <div style={{ position: 'relative', marginBottom: '22px' }}>
        {phase === 'hatched' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '96px', lineHeight: 1, filter: 'drop-shadow(0 0 28px rgba(255,200,50,0.95)) drop-shadow(0 0 8px rgba(255,255,255,0.5))', animation: 'creatureIn 0.9s ease both, creatureFloat 3s 1s ease-in-out infinite', display: 'block' }}>
              {creature}
            </div>
          </div>
        ) : (
          <div style={{ animation: wobbleAnim }}>
            <svg viewBox="0 0 120 160" width="160" height="213" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="eggGrad" cx="42%" cy="38%" r="58%">
                  <stop offset="0%"   stopColor="rgba(255,255,255,0.45)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>
              {pct > 0.15 && (
                <ellipse cx="60" cy="95" rx="32" ry="42" fill={innerColor} style={{ animation: 'innerPulse 1.4s ease-in-out infinite' }} />
              )}
              <ellipse cx="60" cy="88" rx="46" ry="58" fill={eggFill} stroke="rgba(160,120,60,0.5)" strokeWidth="1.5" />
              <ellipse cx="60" cy="88" rx="46" ry="58" fill="url(#eggGrad)" />
              <ellipse cx="46" cy="60" rx="10" ry="14" fill="rgba(255,255,255,0.32)" transform="rotate(-12,46,60)" />
              {cracks.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="rgba(70,40,10,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          </div>
        )}
      </div>

      {phase !== 'hatched' && (
        <div style={{ width: '78%', maxWidth: '210px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>💎 {current.toLocaleString()}</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{goal.toLocaleString()}</span>
          </div>
          <div style={{ height: '9px', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius: '5px', transition: 'width 0.4s ease', animation: crackStage >= 3 ? 'barGlow 1.2s ease-in-out infinite' : 'none' }} />
          </div>
          {lastSender && (
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>✨ {lastSender}</div>
          )}
        </div>
      )}

      {phase === 'hatched' && (
        <div style={{ textAlign: 'center', animation: 'hatchedPop 0.7s 0.6s both' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 24px rgba(251,191,36,0.9)' }}>ฟักออกแล้ว! 🎊</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>กด R หรือปุ่ม Reset ใน TTplus</div>
        </div>
      )}
    </div>
  );
}
