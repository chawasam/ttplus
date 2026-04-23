// widget/bossbattle.js — Boss Battle Overlay สำหรับ OBS
// OBS Size แนะนำ: 400 × 350
// URL params: ?cid=xxx&hp=1000&bossname=Dark+Dragon&emoji=🐉&respawn=1
// กด R ในเบราว์เซอร์เพื่อ reset | ปุ่ม Reset ใน Widgets page
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const STORAGE_KEY     = 'ttplus_boss_hp';
const STORAGE_ROUND   = 'ttplus_boss_round';
const RESPAWN_SECS    = 5;

// ───── Web Audio ─────────────────────────────────────────────
let _ctx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function playHit(dmg) {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const base = dmg >= 500 ? 55 : dmg >= 100 ? 80 : dmg >= 10 ? 120 : 160;
    osc.frequency.setValueAtTime(base * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.14);
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t); osc.stop(t + 0.22);
    // Click accent
    const click = ctx.createOscillator(); const cg = ctx.createGain();
    click.connect(cg); cg.connect(ctx.destination);
    click.frequency.value = 3000; click.type = 'square';
    cg.gain.setValueAtTime(0.08, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    click.start(t); click.stop(t + 0.02);
  } catch {}
}

function playWin() {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
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
    // Descending then rising sting
    const seq = [880, 740, 622, 740, 880, 1047];
    seq.forEach((freq, i) => {
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
// ─────────────────────────────────────────────────────────────

export default function BossBattleWidget() {
  const [hp,         setHp]         = useState(null);
  const [maxHp,      setMaxHp]      = useState(1000);
  const [round,      setRound]      = useState(1);
  const [bossEmoji,  setBossEmoji]  = useState('🐉');
  const [bossName,   setBossName]   = useState('Dark Dragon');
  const [phase,      setPhase]      = useState('battle'); // battle | dead | countdown
  const [countdown,  setCountdown]  = useState(RESPAWN_SECS);
  const [damages,    setDamages]    = useState([]);
  const [shaking,    setShaking]    = useState(false);
  const [lastHitter, setLastHitter] = useState(null);
  const [hpColor,    setHpColor]    = useState('#22c55e');

  const hpRef        = useRef(1000);
  const maxHpRef     = useRef(1000);
  const roundRef     = useRef(1);
  const baseHpRef    = useRef(1000); // HP รอบแรก (ก่อน multiplier)
  const respawnRef   = useRef(false);
  const phaseRef     = useRef('battle');
  const dmgIdRef     = useRef(0);
  const shakeTimer   = useRef(null);
  const countdownRef = useRef(null);

  const addDamageNum = useCallback((amount, x) => {
    const id = ++dmgIdRef.current;
    setDamages(prev => [...prev.slice(-8), { id, amount, x }]);
    setTimeout(() => setDamages(prev => prev.filter(d => d.id !== id)), 1600);
  }, []);

  const startBattle = useCallback((hp, rnd) => {
    hpRef.current   = hp;
    roundRef.current = rnd;
    phaseRef.current = 'battle';
    setHp(hp); setRound(rnd); setPhase('battle');
    setDamages([]); setHpColor('#22c55e');
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
    // HP ×1.5 ต่อรอบ, cap ที่ 9,999,999
    const nextHp = Math.min(9999999, Math.round(baseHpRef.current * Math.pow(1.5, nextRound - 1)));
    maxHpRef.current = nextHp;
    setMaxHp(nextHp);
    startBattle(nextHp, nextRound);
  }, [startBattle]);

  const applyDamage = useCallback((amount, hitter) => {
    if (phaseRef.current !== 'battle') return;
    const newHp = Math.max(0, hpRef.current - amount);
    hpRef.current = newHp;
    setHp(newHp);
    try { localStorage.setItem(STORAGE_KEY, String(newHp)); } catch {}

    const pct = newHp / maxHpRef.current;
    setHpColor(pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444');
    setLastHitter(hitter);
    addDamageNum(amount, 25 + Math.random() * 50);
    playHit(amount);

    clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 450);

    if (newHp <= 0) {
      phaseRef.current = 'dead';
      setPhase('dead');
      playWin();

      if (respawnRef.current) {
        // เริ่ม countdown แล้ว respawn
        setTimeout(() => {
          phaseRef.current = 'countdown';
          setPhase('countdown');
          let secs = RESPAWN_SECS;
          setCountdown(secs);
          countdownRef.current = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) {
              clearInterval(countdownRef.current);
              triggerRespawn();
            }
          }, 1000);
        }, 2500); // แสดง YOU WIN 2.5 วินาที
      }
    }
  }, [addDamageNum, triggerRespawn]);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt') ?? '';
    const isPreview = params.get('preview') === '1';
    const doReset   = params.get('reset') === '1';
    const mhp       = Math.max(10, parseInt(params.get('hp') ?? '1000'));
    const emoji     = params.get('emoji') ?? '🐉';
    const name      = params.get('bossname') ?? 'Dark Dragon';
    const respawn   = params.get('respawn') === '1';

    baseHpRef.current  = mhp;
    maxHpRef.current   = mhp;
    respawnRef.current = respawn;
    setMaxHp(mhp);
    setBossEmoji(decodeURIComponent(emoji));
    setBossName(decodeURIComponent(name));

    let startHp = mhp, startRound = 1;
    if (!doReset && !isPreview) {
      try {
        const sh = localStorage.getItem(STORAGE_KEY);
        const sr = localStorage.getItem(STORAGE_ROUND);
        if (sh !== null) startHp    = Math.max(0, parseInt(sh) || mhp);
        if (sr !== null) startRound = Math.max(1, parseInt(sr) || 1);
        // คำนวณ maxHp ของรอบที่บันทึกไว้
        const roundMaxHp = Math.min(9999999, Math.round(mhp * Math.pow(1.5, startRound - 1)));
        maxHpRef.current = roundMaxHp;
        setMaxHp(roundMaxHp);
      } catch {}
    } else {
      try {
        localStorage.setItem(STORAGE_KEY,   String(mhp));
        localStorage.setItem(STORAGE_ROUND, '1');
      } catch {}
    }

    hpRef.current    = startHp;
    roundRef.current = startRound;
    setHp(startHp); setRound(startRound);
    const initPct = startHp / maxHpRef.current;
    setHpColor(initPct > 0.6 ? '#22c55e' : initPct > 0.3 ? '#f59e0b' : '#ef4444');
    if (startHp <= 0) { phaseRef.current = 'dead';   setPhase('dead'); }
    else              { phaseRef.current = 'battle';  setPhase('battle'); }

    if (isPreview) {
      setTimeout(() => applyDamage(150, 'PreviewFan99'), 800);
      setTimeout(() => applyDamage(50,  'TikTokUser'),  1600);
      setTimeout(() => applyDamage(300, 'BigGifter'),   2400);
      return;
    }

    const socket = createWidgetSocket(wt, {
      gift: (data) => {
        if (!data) return;
        const ev  = sanitizeEvent(data);
        const dmg = (ev.diamondCount || 1) * (ev.repeatCount || 1);
        applyDamage(dmg, ev.nickname || ev.uniqueId || 'Unknown');
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'bossbattle') return;
        if (style?._reset) { clearInterval(countdownRef.current); triggerReset(); }
      },
    });

    return () => { socket?.disconnect(); clearInterval(countdownRef.current); };
  }, [applyDamage, triggerReset]);

  // R key = reset
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

  const maxHpNow = maxHp;
  const pct      = maxHpNow > 0 ? Math.max(0, Math.min(100, (hp / maxHpNow) * 100)) : 0;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'transparent', position: 'relative', overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif', userSelect: 'none',
    }}>
      <style>{`
        @keyframes floatDmg {
          0%   { transform: translateX(-50%) translateY(0)     scale(1);    opacity: 1; }
          70%  { transform: translateX(-50%) translateY(-65px) scale(1.05); opacity: 0.9; }
          100% { transform: translateX(-50%) translateY(-90px) scale(0.8);  opacity: 0; }
        }
        @keyframes bossFloat  { 0%,100%{transform:translateY(0);}  50%{transform:translateY(-14px);} }
        @keyframes bossShake  { 0%{transform:translateX(0) rotate(0);}15%{transform:translateX(-10px) rotate(-5deg);}35%{transform:translateX(10px) rotate(5deg);}55%{transform:translateX(-7px) rotate(-3deg);}75%{transform:translateX(7px) rotate(3deg);}100%{transform:translateX(0) rotate(0);} }
        @keyframes explode    { 0%{transform:scale(1);opacity:1;filter:brightness(1);}25%{transform:scale(1.4);filter:brightness(4);}60%{transform:scale(2);opacity:0.4;}100%{transform:scale(3);opacity:0;} }
        @keyframes winPop     { 0%{transform:scale(0.3);opacity:0;}65%{transform:scale(1.15);}100%{transform:scale(1);opacity:1;} }
        @keyframes hpPulse    { 0%,100%{opacity:1;}50%{opacity:0.45;} }
        @keyframes countPulse { 0%,100%{transform:scale(1);}50%{transform:scale(1.12);} }
        @keyframes roundBadge { 0%{transform:scale(0);opacity:0;}60%{transform:scale(1.2);}100%{transform:scale(1);opacity:1;} }
      `}</style>

      {/* ===== DEAD / WIN screen ===== */}
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
          {/* Respawn countdown */}
          {phase === 'countdown' && (
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                Round {round + 1} เริ่มใน...
              </div>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.8)', animation: 'countPulse 1s ease-in-out infinite' }}>
                {countdown}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                HP ×1.5 จากรอบที่แล้ว
              </div>
            </div>
          )}
          {phase === 'dead' && !respawnRef.current && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>กด R หรือปุ่ม Reset ใน TTplus</div>
          )}
        </div>
      )}

      {/* ===== BATTLE screen ===== */}
      {phase === 'battle' && (
        <>
          {/* Round badge */}
          {round > 1 && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', marginBottom: '6px', animation: 'roundBadge 0.5s ease both' }}>
              ROUND {round}
            </div>
          )}

          {/* HP Bar */}
          <div style={{ width: '84%', maxWidth: '340px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em' }}>
                {bossEmoji} {bossName}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontVariantNumeric: 'tabular-nums', animation: pct < 25 ? 'hpPulse 0.7s ease-in-out infinite' : 'none' }}>
                {hp.toLocaleString()} / {maxHpNow.toLocaleString()}
              </span>
            </div>
            <div style={{ height: '14px', background: 'rgba(255,255,255,0.07)', borderRadius: '7px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: hpColor, borderRadius: '7px', transition: 'width 0.35s ease, background 0.5s ease', boxShadow: `0 0 10px ${hpColor}bb` }} />
            </div>
          </div>

          {/* Boss Sprite */}
          <div style={{ fontSize: '90px', lineHeight: 1, filter: 'drop-shadow(0 0 20px rgba(255,45,98,0.75))', animation: shaking ? 'bossShake 0.45s ease' : 'bossFloat 3s ease-in-out infinite' }}>
            {bossEmoji}
          </div>

          <div style={{ marginTop: '14px', minHeight: '18px' }}>
            {lastHitter && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⚔️ Last hit: {lastHitter}</span>}
          </div>
        </>
      )}

      {/* Floating damage numbers */}
      {damages.map(d => (
        <div key={d.id} style={{
          position: 'absolute', left: `${d.x}%`, top: '55%',
          color: '#ff2d62',
          fontSize: d.amount >= 500 ? '34px' : d.amount >= 100 ? '28px' : d.amount >= 10 ? '23px' : '19px',
          fontWeight: 900,
          textShadow: '0 0 14px rgba(255,45,98,0.95), 0 2px 4px rgba(0,0,0,0.8)',
          animation: 'floatDmg 1.6s forwards',
          pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.02em',
        }}>
          -{d.amount.toLocaleString()}
        </div>
      ))}
    </div>
  );
}
