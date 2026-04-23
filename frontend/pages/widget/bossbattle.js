// widget/bossbattle.js — Boss Battle Overlay สำหรับ OBS
// OBS Size แนะนำ: 400 × 350
// URL params: ?cid=xxx&hp=1000&bossname=Dark+Dragon&emoji=🐉
// กด R ในเบราว์เซอร์เพื่อ reset boss
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const STORAGE_KEY = 'ttplus_boss_hp';

export default function BossBattleWidget() {
  const [hp,         setHp]         = useState(null);
  const [maxHp,      setMaxHp]      = useState(1000);
  const [bossEmoji,  setBossEmoji]  = useState('🐉');
  const [bossName,   setBossName]   = useState('Dark Dragon');
  const [phase,      setPhase]      = useState('battle'); // battle | dead
  const [damages,    setDamages]    = useState([]);
  const [shaking,    setShaking]    = useState(false);
  const [lastHitter, setLastHitter] = useState(null);
  const [hpColor,    setHpColor]    = useState('#22c55e');

  const hpRef      = useRef(1000);
  const maxHpRef   = useRef(1000);
  const dmgIdRef   = useRef(0);
  const shakeTimer = useRef(null);
  const phaseRef   = useRef('battle');

  const addDamageNum = useCallback((amount, x) => {
    const id = ++dmgIdRef.current;
    setDamages(prev => [...prev.slice(-8), { id, amount, x }]);
    setTimeout(() => setDamages(prev => prev.filter(d => d.id !== id)), 1600);
  }, []);

  const applyDamage = useCallback((amount, hitter) => {
    if (phaseRef.current === 'dead') return;

    const newHp = Math.max(0, hpRef.current - amount);
    hpRef.current = newHp;
    setHp(newHp);
    try { localStorage.setItem(STORAGE_KEY, String(newHp)); } catch {}

    const pct = newHp / maxHpRef.current;
    setHpColor(pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444');
    setLastHitter(hitter);
    addDamageNum(amount, 25 + Math.random() * 50);

    clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 450);

    if (newHp <= 0) {
      phaseRef.current = 'dead';
      setPhase('dead');
    }
  }, [addDamageNum]);

  const resetBoss = useCallback((mhp) => {
    const hp = mhp ?? maxHpRef.current;
    hpRef.current = hp;
    phaseRef.current = 'battle';
    setHp(hp);
    setPhase('battle');
    setDamages([]);
    setLastHitter(null);
    setHpColor('#22c55e');
    try { localStorage.setItem(STORAGE_KEY, String(hp)); } catch {}
  }, []);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt') ?? '';
    const isPreview = params.get('preview') === '1';
    const doReset   = params.get('reset') === '1';
    const mhp       = Math.max(10, parseInt(params.get('hp') ?? '1000'));
    const emoji     = params.get('emoji') ?? '🐉';
    const name      = params.get('bossname') ?? 'Dark Dragon';

    maxHpRef.current = mhp;
    setMaxHp(mhp);
    setBossEmoji(decodeURIComponent(emoji));
    setBossName(decodeURIComponent(name));

    let startHp = mhp;
    if (!doReset && !isPreview) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) startHp = Math.max(0, parseInt(stored) || mhp);
      } catch {}
    } else {
      try { localStorage.setItem(STORAGE_KEY, String(mhp)); } catch {}
    }

    hpRef.current = startHp;
    setHp(startHp);
    const initPct = startHp / mhp;
    setHpColor(initPct > 0.6 ? '#22c55e' : initPct > 0.3 ? '#f59e0b' : '#ef4444');

    if (startHp <= 0) { phaseRef.current = 'dead'; setPhase('dead'); }
    else              { phaseRef.current = 'battle'; setPhase('battle'); }

    if (isPreview) {
      setTimeout(() => applyDamage(150, 'PreviewFan99'), 800);
      setTimeout(() => applyDamage(50,  'TikTokUser'), 1600);
      setTimeout(() => applyDamage(300, 'BigGifter'), 2400);
      return;
    }

    const socket = createWidgetSocket(wt, {
      gift: (data) => {
        if (!data) return;
        const ev  = sanitizeEvent(data);
        const dmg = (ev.diamondCount || 1) * (ev.repeatCount || 1);
        applyDamage(dmg, ev.nickname || ev.uniqueId || 'Unknown');
      },
    });

    return () => socket?.disconnect();
  }, [applyDamage]);

  // R key = reset boss
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'r') resetBoss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetBoss]);

  if (hp === null) return null;

  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'transparent', position: 'relative', overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      userSelect: 'none',
    }}>
      <style>{`
        @keyframes floatDmg {
          0%   { transform: translateX(-50%) translateY(0)    scale(1);    opacity: 1; }
          70%  { transform: translateX(-50%) translateY(-65px) scale(1.05); opacity: 0.9; }
          100% { transform: translateX(-50%) translateY(-90px) scale(0.8);  opacity: 0; }
        }
        @keyframes bossFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes bossShake {
          0%   { transform: translateX(0)    rotate(0deg); }
          15%  { transform: translateX(-10px) rotate(-5deg); }
          35%  { transform: translateX(10px)  rotate(5deg); }
          55%  { transform: translateX(-7px)  rotate(-3deg); }
          75%  { transform: translateX(7px)   rotate(3deg); }
          100% { transform: translateX(0)    rotate(0deg); }
        }
        @keyframes explode {
          0%   { transform: scale(1);   opacity: 1; filter: brightness(1); }
          25%  { transform: scale(1.4); opacity: 1; filter: brightness(4) hue-rotate(30deg); }
          60%  { transform: scale(2);   opacity: 0.4; filter: brightness(2); }
          100% { transform: scale(3);   opacity: 0; }
        }
        @keyframes winPop {
          0%   { transform: scale(0.3); opacity: 0; }
          65%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes hpPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 8px var(--hp-color); }
          50%      { box-shadow: 0 0 20px var(--hp-color); }
        }
      `}</style>

      {phase === 'dead' ? (
        /* ===== WIN SCREEN ===== */
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '86px', lineHeight: 1,
            animation: 'explode 0.9s forwards',
          }}>{bossEmoji}</div>
          <div style={{
            fontSize: '42px', fontWeight: 900,
            color: '#fbbf24',
            textShadow: '0 0 30px rgba(251,191,36,0.95), 0 0 60px rgba(251,191,36,0.5)',
            animation: 'winPop 0.55s 0.6s both',
          }}>YOU WIN! 🎉</div>
          {lastHitter && (
            <div style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.65)',
              animation: 'winPop 0.5s 0.9s both',
            }}>
              ⚔️ {lastHitter} ทำลาย {bossName}
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
            กด R เพื่อ Respawn Boss
          </div>
        </div>
      ) : (
        /* ===== BATTLE SCREEN ===== */
        <>
          {/* HP Bar */}
          <div style={{ width: '84%', maxWidth: '340px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em' }}>
                {bossEmoji} {bossName}
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.7)', fontSize: '12px',
                fontVariantNumeric: 'tabular-nums',
                animation: pct < 25 ? 'hpPulse 0.7s ease-in-out infinite' : 'none',
              }}>
                {hp.toLocaleString()} / {maxHp.toLocaleString()}
              </span>
            </div>
            <div style={{
              height: '14px',
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '7px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: hpColor,
                borderRadius: '7px',
                transition: 'width 0.35s ease, background 0.5s ease',
                boxShadow: `0 0 10px ${hpColor}bb`,
              }} />
            </div>
          </div>

          {/* Boss Sprite */}
          <div style={{
            fontSize: '90px', lineHeight: 1,
            filter: `drop-shadow(0 0 20px rgba(255,45,98,0.75))`,
            animation: shaking
              ? 'bossShake 0.45s ease'
              : 'bossFloat 3s ease-in-out infinite',
          }}>{bossEmoji}</div>

          {/* Last hitter */}
          <div style={{ marginTop: '14px', minHeight: '18px' }}>
            {lastHitter && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                ⚔️ Last hit: {lastHitter}
              </span>
            )}
          </div>
        </>
      )}

      {/* Floating damage numbers */}
      {damages.map(d => (
        <div key={d.id} style={{
          position: 'absolute',
          left: `${d.x}%`,
          top: '55%',
          color: '#ff2d62',
          fontSize: d.amount >= 500 ? '34px' : d.amount >= 100 ? '28px' : d.amount >= 10 ? '23px' : '19px',
          fontWeight: 900,
          textShadow: '0 0 14px rgba(255,45,98,0.95), 0 2px 4px rgba(0,0,0,0.8)',
          animation: 'floatDmg 1.6s forwards',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.02em',
        }}>
          -{d.amount.toLocaleString()}
        </div>
      ))}
    </div>
  );
}
