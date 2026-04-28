// widget/nowplaying.js — Spotify Now Playing Overlay สำหรับ OBS
// URL params: ?cid=xxx &style=glass|eq|notes|vinyl|aurora|neon|cassette|pulse|particles|spectrum &fade=0|1
import { useEffect, useState, useRef } from 'react';
import { createWidgetSocket } from '../../lib/widgetSocket';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 10_000;

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes eq0 { 0%{height:12%} 25%{height:88%} 50%{height:35%} 75%{height:72%} 100%{height:15%} }
  @keyframes eq1 { 0%{height:50%} 25%{height:20%} 50%{height:90%} 75%{height:40%} 100%{height:65%} }
  @keyframes eq2 { 0%{height:75%} 25%{height:45%} 50%{height:15%} 75%{height:85%} 100%{height:30%} }
  @keyframes eq3 { 0%{height:30%} 25%{height:70%} 50%{height:55%} 75%{height:10%} 100%{height:80%} }
  @keyframes eq4 { 0%{height:60%} 25%{height:15%} 50%{height:80%} 75%{height:30%} 100%{height:45%} }
  @keyframes noteFall0 { 0%{transform:translateY(-20px) rotate(-15deg);opacity:0} 10%{opacity:.7} 90%{opacity:.5} 100%{transform:translateY(100px) rotate(20deg);opacity:0} }
  @keyframes noteFall1 { 0%{transform:translateY(-20px) rotate(10deg);opacity:0} 10%{opacity:.6} 90%{opacity:.4} 100%{transform:translateY(105px) rotate(-25deg);opacity:0} }
  @keyframes noteFall2 { 0%{transform:translateY(-20px) rotate(-5deg);opacity:0} 10%{opacity:.8} 90%{opacity:.3} 100%{transform:translateY(95px) rotate(15deg);opacity:0} }
  @keyframes vinylSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes aurora { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes neonPulse { 0%,100%{box-shadow:0 0 5px #1DB954,0 0 15px #1DB954,0 0 30px rgba(29,185,84,.3)} 50%{box-shadow:0 0 10px #1DB954,0 0 30px #1DB954,0 0 60px rgba(29,185,84,.45)} }
  @keyframes neonText { 0%,100%{text-shadow:0 0 6px rgba(29,185,84,.8),0 0 14px rgba(29,185,84,.4)} 50%{text-shadow:0 0 10px rgba(29,185,84,1),0 0 24px rgba(29,185,84,.6)} }
  @keyframes ringExpand { 0%{transform:scale(1);opacity:.65} 100%{transform:scale(3.8);opacity:0} }
  @keyframes particleFloat { 0%{transform:translateY(0) scale(1);opacity:.85} 100%{transform:translateY(-84px) scale(.15);opacity:0} }
  @keyframes reelSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes reelSpinR { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
`;

const DEMO_TRACK = {
  playing: true,
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  album: 'After Hours',
  albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  durationMs: 200040,
  progressMs: 80000,
};

export default function NowPlayingWidget() {
  const [track,   setTrack]   = useState(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cfg,     setCfg]     = useState({ style: 'glass', fade: true });
  const prevIdRef = useRef('');
  const timerRef  = useRef(null);

  useEffect(() => {
    setMounted(true);
    const p     = new URLSearchParams(window.location.search);
    const cid   = p.get('cid') || p.get('uid'); // รองรับ cid (ใหม่) และ uid (เก่า)
    const style = p.get('style') || 'glass';
    const fade  = p.get('fade') !== '0';
    setCfg({ style, fade });

    if (p.get('preview') === '1') {
      setTrack(DEMO_TRACK);
      setTimeout(() => setVisible(true), 100);
      return;
    }
    if (!cid) return;

    // ── REST poll (primary data source) ──
    const poll = async () => {
      try {
        const isCid = /^\d{4,8}$/.test(cid);
        const qs    = isCid ? `cid=${cid}` : `uid=${cid}`;
        const res   = await fetch(`${BACKEND}/api/spotify/now-playing?${qs}`);
        const data  = await res.json();
        if (!data.playing) {
          setVisible(false);
          timerRef.current = setTimeout(() => setTrack(null), 600);
          return;
        }
        const trackId = data.title + data.artist;
        if (trackId !== prevIdRef.current) {
          prevIdRef.current = trackId;
          setVisible(false);
          timerRef.current = setTimeout(() => {
            setTrack(data);
            setTimeout(() => setVisible(true), 50);
          }, 400);
        } else {
          setTrack(data);
          setVisible(true);
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_MS);

    // ── Socket (style_update เมื่อ customize จาก Widgets page) ──
    let socket = null;
    if (/^\d{4,8}$/.test(cid)) {
      socket = createWidgetSocket(cid, {
        style_update: ({ widgetId, style: newStyle }) => {
          if (widgetId !== 'nowplaying') return;
          const s = newStyle?.style;
          const f = newStyle?.fade;
          setCfg(prev => ({
            style: s || prev.style,
            fade:  f !== undefined ? f !== '0' && f !== 0 : prev.fade,
          }));
        },
      });
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timerRef.current);
      socket?.disconnect();
    };
  }, []);

  if (!mounted || !track) return <><style>{BASE_CSS}</style><div style={{ background: 'transparent' }} /></>;

  const fadeStyle = cfg.fade ? {
    WebkitMaskImage: [
      'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
    ].join(', '),
    WebkitMaskComposite: 'source-in',
    maskImage: [
      'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
    ].join(', '),
    maskComposite: 'intersect',
  } : {};

  const inner = (() => {
    switch (cfg.style) {
      case 'eq':        return <StyleEQ        track={track} />;
      case 'notes':     return <StyleNotes     track={track} />;
      case 'vinyl':     return <StyleVinyl     track={track} />;
      case 'aurora':    return <StyleAurora    track={track} />;
      case 'neon':      return <StyleNeon      track={track} />;
      case 'cassette':  return <StyleCassette  track={track} />;
      case 'pulse':     return <StylePulse     track={track} />;
      case 'particles': return <StyleParticles track={track} />;
      case 'spectrum':  return <StyleSpectrum  track={track} />;
      case 'simple':    return <StyleSimple    track={track} />;
      default:          return <StyleGlass     track={track} />;
    }
  })();

  return (
    <>
      <style>{BASE_CSS}</style>
      <div style={{
        display:    'inline-block',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity .4s ease, transform .4s ease',
        ...fadeStyle,
      }}>
        {inner}
      </div>
    </>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function AlbumArt({ src, size, radius, extra }) {
  const base = {
    width: size, height: size, borderRadius: radius,
    flexShrink: 0, objectFit: 'cover',
    boxShadow: '0 2px 10px rgba(0,0,0,0.55)',
    ...extra,
  };
  if (src) return <img src={src} alt="" style={base} />;
  return (
    <div style={{ ...base, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38 }}>
      🎵
    </div>
  );
}

function MiniEQBars({ playing, color = '#1DB954' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, flexShrink: 0 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 1, background: color,
          height: playing ? '60%' : '35%',
          animation: playing ? `eq${i} ${0.55 + i * 0.15}s ease-in-out ${-i * 0.2}s infinite` : 'none',
        }} />
      ))}
    </div>
  );
}

function SpotifyLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0, opacity: 0.7 }} fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

// N animated EQ bars filling parent height
function EQBars({ count, playing, gradient }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: '100%' }}>
      {Array.from({ length: count }, (_, i) => {
        const seed = (i * 137 + 41) % 100;
        const dur  = (0.32 + (seed % 48) / 100).toFixed(2);
        const del  = -((i * 73) % 100) / 100;
        return (
          <div key={i} style={{
            flex: 1, minHeight: 2,
            borderRadius: '2px 2px 0 0',
            background: gradient,
            height: playing ? '20%' : '8%',
            animation: playing ? `eq${i % 5} ${dur}s ease-in-out ${del}s infinite` : 'none',
            opacity: .8,
          }} />
        );
      })}
    </div>
  );
}

// ── Style 1: Glass ────────────────────────────────────────────────────────────
function StyleGlass({ track }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderRadius: 12, padding: '10px 16px 10px 10px',
      minWidth: 260, maxWidth: 380,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.09)',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      <AlbumArt src={track.albumArt} size={54} radius={8} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <MiniEQBars playing={track.playing} />
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
            {track.title}
          </p>
        </div>
        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </p>
      </div>
      <SpotifyLogo />
    </div>
  );
}

// ── Style 2: EQ Bars ─────────────────────────────────────────────────────────
function StyleEQ({ track }) {
  return (
    <div style={{
      position: 'relative', width: 380, height: 88,
      borderRadius: 12, overflow: 'hidden',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      {/* EQ background */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', padding: '0 4px', display: 'flex', alignItems: 'flex-end' }}>
        <EQBars count={36} playing={track.playing} gradient="linear-gradient(to top,#1DB954,#1ed76090)" />
      </div>
      {/* Gradient overlay left-to-right so info is readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,.72) 0%,rgba(0,0,0,.4) 55%,rgba(0,0,0,.05) 100%)' }} />
      {/* Info */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <AlbumArt src={track.albumArt} size={60} radius={6} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,.8)' }}>
            {track.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, margin: '3px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.artist}
          </p>
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 3: Falling Notes ────────────────────────────────────────────────────
function StyleNotes({ track }) {
  const NOTE_CHARS = ['♩','♪','♫','♬','🎵','🎶'];
  const notes = Array.from({ length: 14 }, (_, i) => {
    const s = (i * 137 + 23) % 100;
    return {
      key: i,
      left:     `${(s * 3.7) % 100}%`,
      fontSize: 13 + (s % 13),
      color:    `rgba(29,185,84,${0.25 + (i % 5) * 0.1})`,
      anim:     `noteFall${i % 3} ${2.2 + (s % 22) / 10}s linear ${-(s % 28) / 10}s infinite`,
      char:     NOTE_CHARS[i % NOTE_CHARS.length],
    };
  });
  return (
    <div style={{
      position: 'relative', width: 380, height: 88,
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(5,5,10,0.68)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      {notes.map(n => (
        <div key={n.key} style={{
          position: 'absolute', top: 0, left: n.left,
          fontSize: n.fontSize, color: n.color,
          animation: track.playing ? n.anim : 'none',
          pointerEvents: 'none', lineHeight: 1,
        }}>{n.char}</div>
      ))}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, margin: '3px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.artist}
          </p>
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 4: Vinyl Record ─────────────────────────────────────────────────────
function StyleVinyl({ track }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'system-ui,sans-serif', userSelect: 'none', gap: 10 }}>
      {/* Vinyl disc */}
      <div style={{ position: 'relative', width: 162, height: 162 }}>
        <div style={{
          width: 162, height: 162, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #111 0%, #2a2a2a 5%, #111 10%, #222 15%, #111 20%, #2a2a2a 25%, #111 30%, #222 35%, #111 40%, #2a2a2a 45%, #111 50%, #222 55%, #111 60%, #2a2a2a 65%, #111 70%, #222 75%, #111 80%, #2a2a2a 85%, #111 90%, #222 95%, #111 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,.65), inset 0 0 20px rgba(0,0,0,.4)',
          animation: track.playing ? 'vinylSpin 2.4s linear infinite' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid rgba(255,255,255,0.04)',
        }}>
          {/* Center label */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.12)',
            boxShadow: '0 0 12px rgba(0,0,0,.5)',
          }}>
            <AlbumArt src={track.albumArt} size={72} radius="50%" />
          </div>
        </div>
        {/* Hole */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 9, height: 9, borderRadius: '50%',
          background: '#000', zIndex: 2, pointerEvents: 'none',
        }} />
        {/* Shine arc */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.06) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />
      </div>
      {/* Track info pill */}
      <div style={{
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 10, padding: '7px 18px',
        textAlign: 'center', minWidth: 170, maxWidth: 220,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
        <p style={{ color: 'rgba(255,255,255,.58)', fontSize: 11, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
      </div>
    </div>
  );
}

// ── Style 5: Aurora ───────────────────────────────────────────────────────────
function StyleAurora({ track }) {
  return (
    <div style={{
      position: 'relative', width: 380, height: 88,
      borderRadius: 12, overflow: 'hidden',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      {/* Animated aurora gradient */}
      <div style={{
        position: 'absolute', inset: '-12px',
        background: 'linear-gradient(-55deg,#051018,#180830,#0b3320,#1e1808,#0a1e2a,#190818)',
        backgroundSize: '400% 400%',
        animation: 'aurora 9s ease infinite',
      }} />
      {/* Aurora glow blobs */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 25% 55%,rgba(29,185,84,.28) 0%,transparent 58%), radial-gradient(ellipse at 72% 28%,rgba(100,45,200,.22) 0%,transparent 55%), radial-gradient(ellipse at 55% 80%,rgba(0,160,220,.18) 0%,transparent 50%)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
        <AlbumArt src={track.albumArt} size={60} radius={8} extra={{ boxShadow: '0 2px 14px rgba(0,0,0,.6)' }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
            {track.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, margin: '3px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.artist}
          </p>
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 6: Neon Club ────────────────────────────────────────────────────────
function StyleNeon({ track }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: '#040404',
      borderRadius: 12, padding: '10px 16px 10px 10px',
      minWidth: 260, maxWidth: 380,
      border: '1.5px solid #1DB954',
      animation: 'neonPulse 2.2s ease-in-out infinite',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      <AlbumArt src={track.albumArt} size={56} radius={6} extra={{ filter: 'brightness(1.05) saturate(1.15)' }} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 800, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', animation: 'neonText 2.2s ease-in-out infinite' }}>
          {track.title}
        </p>
        <p style={{ color: '#1DB954', fontSize: 11, margin: '4px 0 5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', opacity: .85 }}>
          {track.artist}
        </p>
        <MiniEQBars playing={track.playing} />
      </div>
      <SpotifyLogo />
    </div>
  );
}

// ── Style 7: Cassette ─────────────────────────────────────────────────────────
function StyleCassette({ track }) {
  return (
    <div style={{
      width: 320, borderRadius: 14,
      background: 'linear-gradient(145deg,#1a1206,#120e04)',
      padding: 14, boxShadow: '0 6px 26px rgba(0,0,0,.65)',
      border: '2px solid #3a2808',
      fontFamily: 'Georgia,serif', userSelect: 'none',
    }}>
      {/* Label */}
      <div style={{
        background: 'linear-gradient(130deg,#e85d20,#f7931e 50%,#ffd040)',
        borderRadius: 8, padding: '7px 10px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#1a0800', fontSize: 11, fontWeight: 900, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', letterSpacing: 1, fontFamily: 'system-ui,sans-serif' }}>
            ♫ {track.title.toUpperCase()}
          </p>
          <p style={{ color: 'rgba(26,8,0,.72)', fontSize: 9, margin: '2px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'system-ui,sans-serif' }}>
            {track.artist}
          </p>
        </div>
        {track.albumArt && (
          <img src={track.albumArt} alt="" style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', flexShrink: 0, boxShadow: '0 1px 5px rgba(0,0,0,.4)' }} />
        )}
      </div>
      {/* Cassette body with reels */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {/* Left reel */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle,#2a2a2a 28%,#3a3a3a 29%,#222 56%,#444 58%,#333 100%)',
          border: '2px solid #555',
          animation: track.playing ? 'reelSpin 2s linear infinite' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.5)',
        }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#888', border: '1px solid #aaa' }} />
        </div>
        {/* Tape window */}
        <div style={{
          width: 64, height: 30,
          background: '#000', borderRadius: 5,
          border: '1px solid #444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4, overflow: 'hidden',
        }}>
          <div style={{ width: 44, height: 2, background: '#5a3a10', borderRadius: 1 }} />
          <div style={{ width: 44, height: 2, background: '#5a3a10', borderRadius: 1 }} />
          <div style={{ width: 44, height: 2, background: '#5a3a10', borderRadius: 1 }} />
        </div>
        {/* Right reel */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle,#2a2a2a 28%,#3a3a3a 29%,#222 56%,#444 58%,#333 100%)',
          border: '2px solid #555',
          animation: track.playing ? 'reelSpinR 1.7s linear infinite' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.5)',
        }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#888', border: '1px solid #aaa' }} />
        </div>
      </div>
    </div>
  );
}

// ── Style 8: Pulse Rings ──────────────────────────────────────────────────────
function StylePulse({ track }) {
  return (
    <div style={{
      position: 'relative', width: 210, height: 210,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      {/* Expanding rings */}
      {track.playing && [0,1,2].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 90, height: 90,
          borderRadius: '50%', border: '2px solid rgba(29,185,84,.6)',
          animation: `ringExpand 2.6s ease-out ${i * 0.86}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      {/* Art circle */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%', overflow: 'hidden',
        border: '3px solid rgba(29,185,84,.65)',
        boxShadow: '0 0 24px rgba(29,185,84,.28), 0 6px 20px rgba(0,0,0,.5)',
        zIndex: 1, flexShrink: 0,
      }}>
        <AlbumArt src={track.albumArt} size={100} radius="50%" />
      </div>
      {/* Info pill bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        textAlign: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 9, padding: '6px 12px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </p>
        <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 10, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </p>
      </div>
    </div>
  );
}

// ── Style 9: Particles ────────────────────────────────────────────────────────
function StyleParticles({ track }) {
  const pts = Array.from({ length: 18 }, (_, i) => {
    const s = (i * 137 + 23) % 100;
    return {
      key: i,
      left:   `${(s * 3.7) % 100}%`,
      bottom: `${(s * 1.7) % 40}%`,
      size:   2 + (s % 4),
      color:  `rgba(29,185,84,${0.35 + (i % 6) * 0.09})`,
      anim:   `particleFloat ${1.4 + (s % 25) / 10}s ease-out ${-(s % 20) / 10}s infinite`,
    };
  });
  return (
    <div style={{
      position: 'relative', width: 380, height: 88,
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(4,4,8,0.65)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {track.playing && pts.map(p => (
        <div key={p.key} style={{
          position: 'absolute', left: p.left, bottom: p.bottom,
          width: p.size, height: p.size, borderRadius: '50%',
          background: p.color, animation: p.anim,
          boxShadow: `0 0 ${p.size * 2}px rgba(29,185,84,.55)`,
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, margin: '3px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.artist}
          </p>
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 10: Spectrum ────────────────────────────────────────────────────────
function StyleSpectrum({ track }) {
  const progress = track.durationMs ? Math.min(1, track.progressMs / track.durationMs) : 0;
  return (
    <div style={{
      width: 380, borderRadius: 12, overflow: 'hidden',
      background: 'rgba(4,4,8,0.78)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.07)',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
    }}>
      {/* Info row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 6px' }}>
        <AlbumArt src={track.albumArt} size={52} radius={6} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, margin: '2px 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {track.artist}
          </p>
        </div>
        <SpotifyLogo />
      </div>
      {/* Spectrum bars */}
      <div style={{ height: 40, padding: '0 8px 2px', display: 'flex', alignItems: 'flex-end' }}>
        <EQBars
          count={52}
          playing={track.playing}
          gradient="linear-gradient(to top,#1DB954 0%,#1ed760 40%,#6ee7a0 80%,#a7f3d0 100%)"
        />
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: '#1DB954', transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}

// ── Style 11: Simple ─────────────────────────────────────────────────────────
function StyleSimple({ track }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12,
      background: 'rgba(18,18,18,0.90)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 12, padding: '10px 16px 10px 10px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'system-ui,sans-serif', userSelect: 'none',
      minWidth: 220, maxWidth: 340,
    }}>
      <AlbumArt src={track.albumArt} size={60} radius={8} />
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {track.title}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </p>
      </div>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
