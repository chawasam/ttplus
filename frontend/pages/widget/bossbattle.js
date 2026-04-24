// widget/bossbattle.js — Boss Battle Overlay สำหรับ OBS
// OBS Size แนะนำ: 400 × 380
// URL params: ?cid=xxx&hp=1000&bossname=Dragon&emoji=🐉&element=fire&dmgmult=1&taprate=0&wrongheal=1&respawn=1
// กด R ในเบราว์เซอร์เพื่อ reset
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const STORAGE_KEY   = 'ttplus_boss_hp';
const STORAGE_ROUND = 'ttplus_boss_round';
const RESPAWN_SECS  = 5;

// ───── Element system ─────────────────────────────────────────
// วงจร: ไฟ > ดิน > ลม > น้ำ > ไฟ
// ดิน แพ้ ไฟ | ไฟ แพ้ น้ำ | น้ำ แพ้ ลม | ลม แพ้ ดิน
const ELEMENTS = {
  neutral: { id: 'neutral', label: 'กลาง', emoji: '⚪', color: '#94a3b8', aura: 'rgba(148,163,184,0.25)', flash: 'rgba(148,163,184,0.18)' },
  fire:    { id: 'fire',    label: 'ไฟ',   emoji: '🔥', color: '#f97316', aura: 'rgba(249,115,22,0.35)',  flash: 'rgba(249,115,22,0.22)' },
  water:   { id: 'water',   label: 'น้ำ',  emoji: '💧', color: '#38bdf8', aura: 'rgba(56,189,248,0.35)',  flash: 'rgba(56,189,248,0.22)' },
  earth:   { id: 'earth',   label: 'ดิน',  emoji: '🌍', color: '#ca8a04', aura: 'rgba(202,138,4,0.35)',   flash: 'rgba(202,138,4,0.22)' },
  wind:    { id: 'wind',    label: 'ลม',   emoji: '🌪️', color: '#34d399', aura: 'rgba(52,211,153,0.35)',  flash: 'rgba(52,211,153,0.22)' },
};

// BEATS[x] = y → ธาตุ x ชนะธาตุ y (y แพ้ x)
// ไฟ > ดิน, น้ำ > ไฟ, ลม > น้ำ, ดิน > ลม
const BEATS = { fire: 'earth', water: 'fire', wind: 'water', earth: 'wind' };

function effectiveAgainst(bossElem) {
  for (const [atk, victim] of Object.entries(BEATS)) if (victim === bossElem) return atk;
  return null; // neutral มีไม่มีธาตุ effective
}
function weakGiftFor(bossElem) { return BEATS[bossElem] || null; }

function calcHitType(giftElem, bossElem) {
  if (bossElem === 'neutral' || giftElem === 'neutral') return 'neutral';
  if (giftElem === effectiveAgainst(bossElem)) return 'effective';
  if (giftElem === weakGiftFor(bossElem)) return 'wrong';
  return 'neutral';
}

// ───── Gift → Element (keyword match) ──────────────────────────
const GIFT_KEYWORDS = {
  fire:  ['rose','heart','fire','rocket','sun','flame','love bang','star','firework','bomb','lightning','thunder','dragon','phoenix','hot','glow','spark','passion','blaze'],
  water: ['ice','snow','fish','whale','dolphin','ocean','sea','wave','blue','aqua','rain','drop','penguin','crystal','cool','freeze','blue','water','pool'],
  earth: ['panda','bear','lion','tiger','tree','diamond','crown','gold','mountain','rock','stone','turtle','fossil','gem','kingdom','castle','medal'],
  wind:  ['butterfly','bird','balloon','cloud','sky','flower','leaf','feather','fairy','angel','fly','kite','breeze','wings','wish','dream','spirit'],
};
function giftToElement(giftName) {
  if (!giftName) return 'neutral';
  const lower = giftName.toLowerCase();
  for (const [elem, kws] of Object.entries(GIFT_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return elem;
  }
  return 'neutral';
}

// ───── Web Audio ─────────────────────────────────────────────
let _ctx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function playHit(dmg, elem = 'neutral') {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    const baseFreqs = { fire: 140, water: 220, earth: 80, wind: 320, neutral: 160 };
    const waveTypes = { fire: 'sawtooth', water: 'sine', earth: 'sawtooth', wind: 'triangle', neutral: 'sawtooth' };
    const base = baseFreqs[elem] ?? 160;
    const scale = dmg >= 500 ? 0.5 : dmg >= 100 ? 0.7 : 1.0;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(base * 2.2 * scale, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.5 * scale, t + 0.16);
    osc.type = waveTypes[elem] ?? 'sawtooth';
    gain.gain.setValueAtTime(0.36, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.start(t); osc.stop(t + 0.24);
    const click = ctx.createOscillator(); const cg = ctx.createGain();
    click.connect(cg); cg.connect(ctx.destination);
    click.frequency.value = elem === 'wind' ? 5000 : 3000; click.type = 'square';
    cg.gain.setValueAtTime(0.07, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    click.start(t); click.stop(t + 0.02);
  } catch {}
}

function playHeal() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    [523, 659, 784].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.45);
    });
  } catch {}
}

function playEffective() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'square';
      gain.gain.setValueAtTime(0.12, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
      osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.2);
    });
  } catch {}
}

function playWin() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.13;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch {}
}

function playRespawn() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    [880, 740, 622, 740, 880, 1047].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'triangle';
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    });
  } catch {}
}

const STREAK_THRESHOLD = 3;

// ───── Main component ────────────────────────────────────────
export default function BossBattleWidget() {
  const [hp,          setHp]          = useState(null);
  const [maxHp,       setMaxHp]       = useState(1000);
  const [round,       setRound]       = useState(1);
  const [bossEmoji,   setBossEmoji]   = useState('🐉');
  const [bossName,    setBossName]    = useState('Dark Dragon');
  const [bossElem,    setBossElem]    = useState('neutral');
  const [phase,       setPhase]       = useState('battle');
  const [countdown,   setCountdown]   = useState(RESPAWN_SECS);
  const [damages,     setDamages]     = useState([]);
  const [shaking,     setShaking]     = useState(false);
  const [lastHitter,  setLastHitter]  = useState(null);
  const [lastHitType, setLastHitType] = useState('neutral');
  const [hpColor,     setHpColor]     = useState('#22c55e');
  const [flashColor,  setFlashColor]  = useState(null);
  const [streakCount, setStreakCount] = useState(0);
  const [showStreak,  setShowStreak]  = useState(false);
  const [elemRevealed, setElemRevealed] = useState(false); // ธาตุถูก reveal แล้ว

  const hpRef         = useRef(1000);
  const maxHpRef      = useRef(1000);
  const roundRef      = useRef(1);
  const baseHpRef     = useRef(1000);
  const respawnRef    = useRef(false);
  const phaseRef      = useRef('battle');
  const dmgIdRef      = useRef(0);
  const shakeTimer    = useRef(null);
  const flashTimer    = useRef(null);
  const streakTimer   = useRef(null);
  const countdownRef  = useRef(null);
  const streakRef     = useRef(0);
  const streakElemRef = useRef(null);
  const dmgMultRef    = useRef(1);
  const tapRateRef    = useRef(0);
  const wrongHealRef  = useRef(true);
  const bossElemRef   = useRef('neutral');
  const likeBuffRef   = useRef(0);
  const hideElemRef   = useRef(false); // ซ่อนธาตุจนกว่า HP ≤ 75%

  const addDamageNum = useCallback((amount, x, type, giftEmoji) => {
    const id = ++dmgIdRef.current;
    setDamages(prev => [...prev.slice(-10), { id, amount, x, type: type || 'neutral', giftEmoji: giftEmoji || '' }]);
    setTimeout(() => setDamages(prev => prev.filter(d => d.id !== id)), 1800);
  }, []);

  const triggerFlash = useCallback((color) => {
    setFlashColor(color);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashColor(null), 340);
  }, []);

  const startBattle = useCallback((hp, rnd) => {
    hpRef.current    = hp;
    roundRef.current = rnd;
    phaseRef.current = 'battle';
    streakRef.current = 0; streakElemRef.current = null;
    setHp(hp); setRound(rnd); setPhase('battle');
    setDamages([]); setHpColor('#22c55e');
    setStreakCount(0); setShowStreak(false); setLastHitType('neutral');
    try {
      localStorage.setItem(STORAGE_KEY,   String(hp));
      localStorage.setItem(STORAGE_ROUND, String(rnd));
    } catch {}
    if (rnd > 1) playRespawn();
  }, []);

  const triggerReset = useCallback(() => {
    clearInterval(countdownRef.current);
    startBattle(baseHpRef.current, 1);
    setLastHitter(null);
  }, [startBattle]);

  const triggerRespawn = useCallback(() => {
    if (!respawnRef.current) return;
    const nextRound = roundRef.current + 1;
    const nextHp = Math.min(9999999, Math.round(baseHpRef.current * Math.pow(1.5, nextRound - 1)));
    maxHpRef.current = nextHp;
    setMaxHp(nextHp);
    startBattle(nextHp, nextRound);
  }, [startBattle]);

  const applyDamage = useCallback((baseDmg, hitter, giftElem, giftEmoji) => {
    if (phaseRef.current !== 'battle') return;
    const bossEl  = bossElemRef.current;
    const giftEl  = giftElem || 'neutral';
    const hitType = calcHitType(giftEl, bossEl);

    // Streak (effective gifts ติดกัน)
    let streakBonus = false;
    if (hitType === 'effective') {
      streakRef.current = (streakElemRef.current === giftEl) ? streakRef.current + 1 : 1;
      streakElemRef.current = giftEl;
      if (streakRef.current >= STREAK_THRESHOLD) {
        streakBonus = true;
        clearTimeout(streakTimer.current);
        setShowStreak(true);
        streakTimer.current = setTimeout(() => setShowStreak(false), 2200);
      }
    } else {
      streakRef.current = 0; streakElemRef.current = null;
      setShowStreak(false);
    }
    setStreakCount(streakRef.current);

    let mult = dmgMultRef.current;
    if (hitType === 'effective') { mult *= 2; if (streakBonus) mult *= 1.5; }
    const absDmg = Math.max(1, Math.round(baseDmg * mult));

    // ผิดธาตุ → heal boss
    if (hitType === 'wrong' && wrongHealRef.current) {
      const healAmt = Math.round(absDmg * 0.5);
      const newHp   = Math.min(maxHpRef.current, hpRef.current + healAmt);
      hpRef.current = newHp;
      setHp(newHp);
      try { localStorage.setItem(STORAGE_KEY, String(newHp)); } catch {}
      triggerFlash('rgba(34,197,94,0.28)');
      addDamageNum(healAmt, 25 + Math.random() * 50, 'wrong', giftEmoji || ELEMENTS[giftEl]?.emoji || '');
      setLastHitter(hitter); setLastHitType('wrong');
      playHeal();
      return;
    }

    // ดาเมจปกติ
    const newHp = Math.max(0, hpRef.current - absDmg);
    hpRef.current = newHp;
    setHp(newHp);
    try { localStorage.setItem(STORAGE_KEY, String(newHp)); } catch {}

    const pct = newHp / maxHpRef.current;
    setHpColor(pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444');
    setLastHitter(hitter); setLastHitType(hitType);

    // Reveal ธาตุเมื่อ HP ≤ 75% (ถ้าเปิด hideelement)
    if (hideElemRef.current && pct <= 0.75) {
      setElemRevealed(true);
      hideElemRef.current = false; // reveal แล้ว ไม่ต้องทำซ้ำ
    }

    triggerFlash(ELEMENTS[giftEl]?.flash || 'rgba(255,45,98,0.18)');
    addDamageNum(absDmg, 25 + Math.random() * 50, hitType, giftEmoji || ELEMENTS[giftEl]?.emoji || '');

    if (hitType === 'effective') { playEffective(); setTimeout(() => playHit(absDmg, giftEl), 80); }
    else playHit(absDmg, giftEl);

    clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 450);

    if (newHp <= 0) {
      phaseRef.current = 'dead'; setPhase('dead');
      playWin();
      if (respawnRef.current) {
        setTimeout(() => {
          phaseRef.current = 'countdown'; setPhase('countdown');
          let secs = RESPAWN_SECS; setCountdown(secs);
          countdownRef.current = setInterval(() => {
            secs -= 1; setCountdown(secs);
            if (secs <= 0) { clearInterval(countdownRef.current); triggerRespawn(); }
          }, 1000);
        }, 2500);
      }
    }
  }, [addDamageNum, triggerFlash, triggerRespawn]);

  // ───── Init ──────────────────────────────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt') ?? '';
    const isPreview = params.get('preview') === '1';
    const doReset   = params.get('reset') === '1';
    const mhp       = Math.max(10, parseInt(params.get('hp') ?? '1000'));
    const emoji     = params.get('emoji') ?? '🐉';
    const name      = params.get('bossname') ?? 'Dark Dragon';
    const respawn   = params.get('respawn') === '1';
    const elemParam = params.get('element') ?? 'neutral';
    const dmgMult   = Math.max(0.1, parseFloat(params.get('dmgmult') ?? '1'));
    const tapRate   = Math.max(0, parseInt(params.get('taprate') ?? '0'));
    const wrongHeal = params.get('wrongheal') !== '0';

    const elem     = ELEMENTS[elemParam] ? elemParam : 'neutral';
    const hideElem = params.get('hideelement') === '1';
    bossElemRef.current  = elem;
    dmgMultRef.current   = dmgMult;
    tapRateRef.current   = tapRate;
    wrongHealRef.current = wrongHeal;
    hideElemRef.current  = hideElem && elem !== 'neutral';
    setElemRevealed(!hideElem || elem === 'neutral');
    baseHpRef.current    = mhp;
    maxHpRef.current     = mhp;
    respawnRef.current   = respawn;

    setMaxHp(mhp);
    setBossEmoji(decodeURIComponent(emoji));
    setBossName(decodeURIComponent(name));
    setBossElem(elem);

    let startHp = mhp, startRound = 1;
    if (!doReset && !isPreview) {
      try {
        const sh = localStorage.getItem(STORAGE_KEY);
        const sr = localStorage.getItem(STORAGE_ROUND);
        if (sh !== null) startHp    = Math.max(0, parseInt(sh) || mhp);
        if (sr !== null) startRound = Math.max(1, parseInt(sr) || 1);
        const roundMaxHp = Math.min(9999999, Math.round(mhp * Math.pow(1.5, startRound - 1)));
        maxHpRef.current = roundMaxHp; setMaxHp(roundMaxHp);
      } catch {}
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, String(mhp));
        localStorage.setItem(STORAGE_ROUND, '1');
      } catch {}
    }

    hpRef.current    = startHp;
    roundRef.current = startRound;
    setHp(startHp); setRound(startRound);
    const initPct = startHp / maxHpRef.current;
    setHpColor(initPct > 0.6 ? '#22c55e' : initPct > 0.3 ? '#f59e0b' : '#ef4444');
    if (startHp <= 0) { phaseRef.current = 'dead';   setPhase('dead'); }
    else              { phaseRef.current = 'battle'; setPhase('battle'); }

    if (isPreview) {
      const eff = effectiveAgainst(elem) || 'neutral';
      const wrg = weakGiftFor(elem) || 'neutral';
      setTimeout(() => applyDamage(80,  'PreviewFan',   'neutral', '🌹'), 800);
      setTimeout(() => applyDamage(200, 'ElementPro',   eff, ELEMENTS[eff]?.emoji || ''), 1800);
      setTimeout(() => applyDamage(50,  'WrongGifter',  wrg, ELEMENTS[wrg]?.emoji || ''), 2800);
      return;
    }

    likeBuffRef.current = 0;

    const socket = createWidgetSocket(wt, {
      gift: (data) => {
        if (!data) return;
        const ev       = sanitizeEvent(data);
        const baseDmg  = (ev.diamondCount || 1) * (ev.repeatCount || 1);
        const giftName = ev.giftName || ev.gift_name || '';
        const giftEl   = giftToElement(giftName);
        applyDamage(baseDmg, ev.nickname || ev.uniqueId || 'Unknown', giftEl, ELEMENTS[giftEl]?.emoji || '🎁');
      },
      like: (data) => {
        if (!data || tapRateRef.current <= 0) return;
        const ev = sanitizeEvent(data);
        likeBuffRef.current += (ev.likeCount || ev.count || 1);
        if (likeBuffRef.current >= tapRateRef.current) {
          const dmg = Math.floor(likeBuffRef.current / tapRateRef.current);
          likeBuffRef.current = likeBuffRef.current % tapRateRef.current;
          applyDamage(dmg, ev.nickname || 'Tapper', 'neutral', '❤️');
        }
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'bossbattle') return;
        if (style?._reset) { clearInterval(countdownRef.current); triggerReset(); }
      },
    });

    return () => { socket?.disconnect(); clearInterval(countdownRef.current); };
  }, [applyDamage, triggerReset]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'r') return;
      clearInterval(countdownRef.current);
      triggerReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerReset]);

  if (hp === null) return null;

  const elemInfo    = elemRevealed ? (ELEMENTS[bossElem] || ELEMENTS.neutral) : ELEMENTS.neutral;
  const effElem     = elemRevealed ? effectiveAgainst(bossElem) : null;
  const effInfo     = effElem ? ELEMENTS[effElem] : null;
  const isHidden    = !elemRevealed && bossElem !== 'neutral';
  const maxHpNow    = maxHp;
  const pct         = maxHpNow > 0 ? Math.max(0, Math.min(100, (hp / maxHpNow) * 100)) : 0;

  const dmgColor = (type, giftEl) => {
    if (type === 'wrong')     return '#22c55e';
    if (type === 'effective') return ELEMENTS[giftEl]?.color || '#fbbf24';
    return '#ff2d62';
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'transparent', position: 'relative', overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif', userSelect: 'none',
    }}>
      <style>{`
        @keyframes floatDmg  { 0%{transform:translateX(-50%) translateY(0) scale(1);opacity:1;} 70%{transform:translateX(-50%) translateY(-70px) scale(1.05);opacity:0.9;} 100%{transform:translateX(-50%) translateY(-95px) scale(0.75);opacity:0;} }
        @keyframes bossFloat { 0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);} }
        @keyframes bossShake { 0%{transform:translateX(0) rotate(0);}15%{transform:translateX(-10px) rotate(-5deg);}35%{transform:translateX(10px) rotate(5deg);}55%{transform:translateX(-7px) rotate(-3deg);}75%{transform:translateX(7px) rotate(3deg);}100%{transform:translateX(0) rotate(0);} }
        @keyframes explode   { 0%{transform:scale(1);opacity:1;filter:brightness(1);}25%{transform:scale(1.4);filter:brightness(4);}60%{transform:scale(2);opacity:0.4;}100%{transform:scale(3);opacity:0;} }
        @keyframes winPop    { 0%{transform:scale(0.3);opacity:0;}65%{transform:scale(1.15);}100%{transform:scale(1);opacity:1;} }
        @keyframes hpPulse   { 0%,100%{opacity:1;}50%{opacity:0.45;} }
        @keyframes countPulse{ 0%,100%{transform:scale(1);}50%{transform:scale(1.12);} }
        @keyframes roundBadge{ 0%{transform:scale(0);opacity:0;}60%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;} }
        @keyframes streakPop { 0%{transform:scale(0.6) translateX(-50%);opacity:0;}60%{transform:scale(1.1) translateX(-50%);}100%{transform:scale(1) translateX(-50%);opacity:1;} }
      `}</style>

      {/* Screen flash */}
      {flashColor && (
        <div style={{ position: 'absolute', inset: 0, background: flashColor, pointerEvents: 'none', zIndex: 5 }} />
      )}

      {/* ===== DEAD / WIN ===== */}
      {(phase === 'dead' || phase === 'countdown') && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '86px', lineHeight: 1, animation: 'explode 0.9s forwards' }}>{bossEmoji}</div>
          <div style={{ fontSize: '40px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 30px rgba(251,191,36,0.95)', animation: 'winPop 0.55s 0.6s both' }}>
            YOU WIN! 🎉
          </div>
          {lastHitter && (
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', animation: 'winPop 0.5s 0.9s both' }}>
              ⚔️ {lastHitter} ทำลาย {bossName}
            </div>
          )}
          {phase === 'countdown' && (
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Round {round + 1} เริ่มใน...</div>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.8)', animation: 'countPulse 1s ease-in-out infinite' }}>
                {countdown}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>HP ×1.5 จากรอบที่แล้ว</div>
            </div>
          )}
          {phase === 'dead' && !respawnRef.current && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>กด R หรือปุ่ม Reset ใน TTplus</div>
          )}
        </div>
      )}

      {/* ===== BATTLE ===== */}
      {phase === 'battle' && (
        <>
          {round > 1 && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: '4px', animation: 'roundBadge 0.5s ease both' }}>
              ROUND {round}
            </div>
          )}

          {/* HP Bar */}
          <div style={{ width: '80%', maxWidth: '260px', marginBottom: '12px' }}>
            {/* Boss name + element badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', flexWrap: 'wrap' }}>
              {bossElem !== 'neutral' && (
                <span style={{ fontSize: '13px', filter: `drop-shadow(0 0 6px ${elemInfo.color}99)` }}>
                  {elemInfo.emoji}
                </span>
              )}
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{bossEmoji} {bossName}</span>
              {isHidden ? (
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', background: '#ffffff15', color: '#94a3b8', border: '1px solid #ffffff25', letterSpacing: '0.1em' }}>
                  ???
                </span>
              ) : bossElem !== 'neutral' && (
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', background: elemInfo.color + '22', color: elemInfo.color, border: `1px solid ${elemInfo.color}44` }}>
                  {elemInfo.emoji} {elemInfo.label}
                </span>
              )}
            </div>
            {/* HP bar + numbers */}
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', marginBottom: '3px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: hpColor, borderRadius: '5px', transition: 'width 0.35s ease, background 0.5s ease', boxShadow: `0 0 8px ${hpColor}bb` }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums', animation: pct < 25 ? 'hpPulse 0.7s ease-in-out infinite' : 'none' }}>
              {hp.toLocaleString()} / {maxHpNow.toLocaleString()}
            </div>
          </div>

          {/* Boss Sprite + element aura */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', background: `radial-gradient(circle, ${elemInfo.aura} 0%, transparent 70%)`, filter: 'blur(10px)' }} />
            <div style={{
              fontSize: '90px', lineHeight: 1, position: 'relative', zIndex: 2,
              filter: `drop-shadow(0 0 22px ${elemInfo.color}99)`,
              animation: shaking ? 'bossShake 0.45s ease' : 'bossFloat 3s ease-in-out infinite',
            }}>
              {bossEmoji}
            </div>
          </div>

          {/* Last hit + weakness hint */}
          <div style={{ marginTop: '10px', minHeight: '38px', textAlign: 'center' }}>
            {lastHitter && (
              <div style={{
                display: 'inline-block',
                fontSize: '13px',
                padding: '3px 10px',
                borderRadius: '8px',
                background: lastHitType === 'effective' ? 'rgba(251,191,36,0.22)'
                          : lastHitType === 'wrong'     ? 'rgba(34,197,94,0.22)'
                          : 'rgba(0,0,0,0.55)',
                border: lastHitType === 'effective' ? '1px solid rgba(251,191,36,0.35)'
                      : lastHitType === 'wrong'     ? '1px solid rgba(34,197,94,0.35)'
                      : '1px solid rgba(255,255,255,0.12)',
                color: lastHitType === 'wrong'     ? '#4ade80'
                     : lastHitType === 'effective' ? '#fbbf24'
                     : 'rgba(255,255,255,0.92)',
                textShadow: lastHitType === 'effective' ? '0 0 10px rgba(251,191,36,0.7)'
                          : lastHitType === 'wrong'     ? '0 0 10px rgba(34,197,94,0.7)'
                          : 'none',
              }}>
                {lastHitType === 'effective' ? '⚡ EFFECTIVE! ' : lastHitType === 'wrong' ? '💚 HEALED! ' : '⚔️ '}
                {lastHitter}
              </div>
            )}
            {isHidden ? (
              <div style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.45)' }}>
                ธาตุ: <span style={{ color: '#64748b', letterSpacing: '0.12em' }}>???</span> — เปิดเผยที่ HP ≤75%
              </div>
            ) : bossElem !== 'neutral' && effInfo && (
              <div style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.55)' }}>
                แพ้ทาง: <span style={{ color: effInfo.color }}>{effInfo.emoji} {effInfo.label}</span>
              </div>
            )}
          </div>

          {/* Streak banner */}
          {showStreak && streakCount >= STREAK_THRESHOLD && (
            <div style={{
              position: 'absolute', top: '8px', left: '50%',
              background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.5)',
              borderRadius: '20px', padding: '4px 14px',
              fontSize: '12px', fontWeight: 700, color: '#fbbf24',
              whiteSpace: 'nowrap', zIndex: 10,
              animation: 'streakPop 0.3s ease both',
              textShadow: '0 0 12px rgba(251,191,36,0.8)',
            }}>
              🔥 COMBO ×{streakCount} — BONUS!
            </div>
          )}
        </>
      )}

      {/* Guide link — มุมล่างขวา เล็กๆ สำหรับผู้ชมที่อยากรู้วิธีเล่น */}
      <div style={{
        position: 'absolute', bottom: '6px', right: '8px', zIndex: 4,
        fontSize: '9px', color: 'rgba(255,255,255,0.28)',
        fontFamily: 'monospace', letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}>
        📖 ttsam.app/bossbattle-guide
      </div>

      {/* Floating damage numbers */}
      {damages.map(d => (
        <div key={d.id} style={{
          position: 'absolute', left: `${d.x}%`, top: '58%', zIndex: 6,
          color: dmgColor(d.type, d.giftEmoji),
          fontSize: Math.abs(d.amount) >= 500 ? '36px' : Math.abs(d.amount) >= 100 ? '30px' : Math.abs(d.amount) >= 10 ? '24px' : '20px',
          fontWeight: 900,
          textShadow: `0 0 14px ${dmgColor(d.type, d.giftEmoji)}cc, 0 2px 4px rgba(0,0,0,0.8)`,
          animation: 'floatDmg 1.8s forwards',
          pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.02em',
        }}>
          {d.giftEmoji && <span style={{ marginRight: '2px', fontSize: '0.75em' }}>{d.giftEmoji}</span>}
          {d.type === 'wrong' ? '+' : '-'}{Math.abs(d.amount).toLocaleString()}{d.type === 'effective' ? ' ✦' : ''}
        </div>
      ))}
    </div>
  );
}
