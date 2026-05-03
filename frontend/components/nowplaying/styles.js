// Shared display primitives + Style* components for Now Playing widgets.

export const BASE_CSS = `
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
  @keyframes marqueeLeft  { 0%{transform:translateX(0)}    100%{transform:translateX(-50%)} }
  @keyframes marqueeRight { 0%{transform:translateX(-50%)} 100%{transform:translateX(0)}    }
  @keyframes waveScroll   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes fireRise     { 0%{transform:translateY(0) scale(1);opacity:.85} 100%{transform:translateY(-55px) scale(.2);opacity:0} }
  @keyframes rainFall     { 0%{transform:translateY(-12px);opacity:0} 10%{opacity:.55} 90%{opacity:.3} 100%{transform:translateY(110px);opacity:0} }
  @keyframes plasmaHue    { 0%{filter:hue-rotate(0deg) brightness(1)} 50%{filter:hue-rotate(180deg) brightness(1.15)} 100%{filter:hue-rotate(360deg) brightness(1)} }
  @keyframes starFly      { 0%{transform:scale(0) translateZ(-200px);opacity:0} 60%{opacity:.9} 100%{transform:scale(3) translateZ(0);opacity:0} }
  @keyframes glitchShift  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(1px)} }
  @keyframes scanMove     { 0%{top:-4px} 100%{top:110%} }
  @keyframes swingPend    { 0%,100%{transform:rotate(-28deg)} 50%{transform:rotate(28deg)} }
  @keyframes rippleOut    { 0%{transform:scale(.5);opacity:.7} 100%{transform:scale(3.5);opacity:0} }
  @keyframes floatBob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes shimmerSlide { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes hueRotate    { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
  @keyframes osciWave     { 0%,100%{transform:scaleY(1)} 25%{transform:scaleY(1.9)} 50%{transform:scaleY(.4)} 75%{transform:scaleY(1.6)} }
  @keyframes matrixFall   { 0%{transform:translateY(-30px);opacity:0} 5%{opacity:.8} 95%{opacity:.5} 100%{transform:translateY(120px);opacity:0} }
  @keyframes typeChar     { from{border-right-color:rgba(255,255,255,.9)} to{border-right-color:transparent} }
  @keyframes sunsetShift  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes iceFrost     { 0%,100%{opacity:.4} 50%{opacity:.7} }
  @keyframes goldShimmer  { 0%{background-position:-300% 0} 100%{background-position:300% 0} }
  @keyframes ghostPulse   { 0%,100%{opacity:.65} 50%{opacity:1} }
  @keyframes lavaBlob     { 0%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} 100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} }
  @keyframes cosmicDrift  { 0%{background-position:0 0} 100%{background-position:100px 60px} }
  @keyframes vhsFlicker   { 0%,97%,100%{opacity:1} 98%{opacity:.85} 99%{opacity:.7} }
`;


export const DEMO_TRACK = {
  playing: true,
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  album: 'After Hours',
  albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  durationMs: 200040,
  progressMs: 80000,
};

// ── Color parser ───────────────────────────────────────────────────────────────
export function parseColor(raw, def) {
  if (!raw) return def;
  if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw)) return `#${raw}`;
  return def;
}

// ── DEFAULT cfg ───────────────────────────────────────────────────────────────
export const DEFAULT_CFG = {
  style: 'glass', fade: true,
  fontSize: 13, titleColor: '#fff', artistColor: 'rgba(255,255,255,0.6)',
  marquee: false, marqueeSpeed: 8, marqueeDir: 'left',
};

// ── Text helpers with marquee support ─────────────────────────────────────────

export function TitleText({ text, cfg, extra = {} }) {
  const style = {
    color: cfg.titleColor,
    fontSize: cfg.fontSize,
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.3,
    ...extra,
  };
  if (cfg.marquee) {
    const anim = cfg.marqueeDir === 'right' ? 'marqueeRight' : 'marqueeLeft';
    return (
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <div style={{ display: 'inline-flex', animation: `${anim} ${cfg.marqueeSpeed}s linear infinite`, whiteSpace: 'nowrap' }}>
          <span style={{ ...style, paddingRight: '3em' }}>{text}</span>
          <span style={{ ...style, paddingRight: '3em' }}>{text}</span>
        </div>
      </div>
    );
  }
  return <p style={{ ...style, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</p>;
}

export function ArtistText({ text, cfg, extra = {} }) {
  const fontSize = Math.max(9, cfg.fontSize - 2);
  const style = {
    color: cfg.artistColor,
    fontSize,
    fontWeight: 400,
    ...extra,
  };
  if (cfg.marquee) {
    const anim   = cfg.marqueeDir === 'right' ? 'marqueeRight' : 'marqueeLeft';
    const speed  = cfg.marqueeSpeed * 1.3;
    return (
      <div style={{ overflow: 'hidden', width: '100%', marginTop: 3 }}>
        <div style={{ display: 'inline-flex', animation: `${anim} ${speed}s linear infinite`, whiteSpace: 'nowrap' }}>
          <span style={{ ...style, paddingRight: '3em' }}>{text}</span>
          <span style={{ ...style, paddingRight: '3em' }}>{text}</span>
        </div>
      </div>
    );
  }
  return <p style={{ ...style, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</p>;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function AlbumArt({ src, size, radius, extra }) {
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

export function MiniEQBars({ playing, color = '#1DB954' }) {
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

export function SpotifyLogo() { return null; }

// N animated EQ bars filling parent height
export function EQBars({ count, playing, gradient }) {
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
export function StyleGlass({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} />
        </div>
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
      <SpotifyLogo />
    </div>
  );
}

// ── Style 2: EQ Bars ─────────────────────────────────────────────────────────
export function StyleEQ({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 800, textShadow: '0 1px 8px rgba(0,0,0,.8)' }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 3: Falling Notes ────────────────────────────────────────────────────
export function StyleNotes({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 4: Vinyl Record ─────────────────────────────────────────────────────
export function StyleVinyl({ track, cfg }) {
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
        overflow: 'hidden',
      }}>
        <TitleText text={track.title} cfg={cfg} extra={{ textAlign: 'center' }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign: 'center' }} />
      </div>
    </div>
  );
}

// ── Style 5: Aurora ───────────────────────────────────────────────────────────
export function StyleAurora({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 700, textShadow: '0 1px 8px rgba(0,0,0,.6)' }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 6: Neon Club ────────────────────────────────────────────────────────
export function StyleNeon({ track, cfg }) {
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
        <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 800, animation: 'neonText 2.2s ease-in-out infinite' }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ marginBottom: 5 }} />
        <MiniEQBars playing={track.playing} />
      </div>
      <SpotifyLogo />
    </div>
  );
}

// ── Style 7: Cassette ─────────────────────────────────────────────────────────
export function StyleCassette({ track, cfg }) {
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
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TitleText
            text={`♫ ${track.title.toUpperCase()}`}
            cfg={cfg}
            extra={{ fontWeight: 900, letterSpacing: 1, fontFamily: 'system-ui,sans-serif' }}
          />
          <ArtistText
            text={track.artist}
            cfg={cfg}
            extra={{ fontFamily: 'system-ui,sans-serif' }}
          />
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
export function StylePulse({ track, cfg }) {
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
        overflow: 'hidden',
      }}>
        <TitleText text={track.title} cfg={cfg} extra={{ textAlign: 'center' }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign: 'center' }} />
      </div>
    </div>
  );
}

// ── Style 9: Particles ────────────────────────────────────────────────────────
export function StyleParticles({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ── Style 10: Spectrum ────────────────────────────────────────────────────────
export function StyleSpectrum({ track, cfg }) {
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
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
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
export function StyleSimple({ track, cfg }) {
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
        <TitleText text={track.title} cfg={cfg} extra={{ fontWeight: 700 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MINIMAL STYLES ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Pill — ไม่มีอาร์ต เน้น text ล้วนๆ ในแคปซูลโค้งมน
export function StylePill({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10,
      background:'rgba(0,0,0,0.72)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      borderRadius:999, padding:'8px 18px 8px 12px',
      border:'1px solid rgba(255,255,255,0.12)',
      boxShadow:'0 4px 20px rgba(0,0,0,0.45)',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <MiniEQBars playing={track.playing} />
      <div style={{ overflow:'hidden', maxWidth:260 }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// Banner — แถบแนวนอนบาง เหมาะวางขอบจอล่าง
export function StyleBanner({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10,
      background:'linear-gradient(90deg,rgba(0,0,0,0.85) 0%,rgba(20,20,20,0.82) 100%)',
      borderTop:'1px solid rgba(29,185,84,0.5)',
      padding:'7px 20px 7px 12px', minWidth:320, maxWidth:500,
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <AlbumArt src={track.albumArt} size={36} radius={4} />
      <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, overflow:'hidden' }}>
        <MiniEQBars playing={track.playing} color="#1DB954" />
        <TitleText text={`${track.title} — ${track.artist}`} cfg={cfg} extra={{ fontWeight:600 }} />
      </div>
      <SpotifyLogo />
    </div>
  );
}

// Ghost — โปร่งใสมาก ลอยเหนือ stream
export function StyleGhost({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10,
      padding:'8px 14px', borderRadius:10, maxWidth:380,
      animation: track.playing ? 'ghostPulse 3s ease-in-out infinite' : 'none',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <AlbumArt src={track.albumArt} size={44} radius={6}
        extra={{ opacity:.7, filter:'saturate(0.6)', flexShrink:0 }} />
      <div style={{ overflow:'hidden', minWidth:0, flex:1 }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, textShadow:'0 2px 12px rgba(0,0,0,.9)' }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textShadow:'0 1px 8px rgba(0,0,0,.8)' }} />
      </div>
    </div>
  );
}

// Ticker — แบบ news ticker วิ่งข้อความเดี่ยว
export function StyleTicker({ track, cfg }) {
  const text = `♫ ${track.title} — ${track.artist}  ·  `;
  return (
    <div style={{ width:420, overflow:'hidden',
      background:'rgba(0,0,0,0.85)', borderBottom:'2px solid #1DB954',
      padding:'5px 0', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <div style={{ display:'inline-flex', animation:`marqueeLeft ${cfg.marquee ? cfg.marqueeSpeed : 12}s linear infinite`, whiteSpace:'nowrap' }}>
        {[0,1].map(i => <span key={i} style={{ color:cfg.titleColor, fontSize:cfg.fontSize, fontWeight:600, paddingRight:'2em' }}>{text}</span>)}
      </div>
    </div>
  );
}

// Badge — compact chip เหมาะมุมจอ
export function StyleBadge({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:7,
      background:'rgba(0,0,0,0.80)', borderRadius:8,
      padding:'5px 12px 5px 6px',
      border:'1px solid rgba(29,185,84,0.4)',
      boxShadow:'0 2px 12px rgba(0,0,0,0.5)',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <AlbumArt src={track.albumArt} size={30} radius={4} />
      <MiniEQBars playing={track.playing} />
      <div style={{ overflow:'hidden', maxWidth:200 }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, lineHeight:1.2 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// Corner — เล็กสุด สำหรับมุมล่างซ้าย/ขวา OBS
export function StyleCorner({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8,
      background:'rgba(0,0,0,0.75)', borderRadius:'0 10px 10px 0',
      padding:'6px 14px 6px 8px',
      borderLeft:'3px solid #1DB954',
      fontFamily:'system-ui,sans-serif', userSelect:'none', maxWidth:240,
    }}>
      <AlbumArt src={track.albumArt} size={32} radius={4} />
      <div style={{ overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// MinimalDark — แถบบางมีจุดสีเขียวกะพริบ
export function StyleMinimalDark({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10,
      background:'rgba(8,8,8,0.92)', borderRadius:8, padding:'9px 16px',
      border:'1px solid rgba(255,255,255,0.05)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:240,
    }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:'#1DB954', flexShrink:0,
        animation: track.playing ? 'ghostPulse 1.5s ease-in-out infinite' : 'none',
        boxShadow: track.playing ? '0 0 6px #1DB954' : 'none',
      }} />
      <div style={{ overflow:'hidden', flex:1 }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:600 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// Outline — การ์ดขอบเส้น ไม่มีพื้นหลัง
export function StyleOutline({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      borderRadius:12, padding:'10px 16px 10px 10px',
      border:'2px solid rgba(255,255,255,0.55)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260, maxWidth:380,
    }}>
      <AlbumArt src={track.albumArt} size={50} radius={8} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <MiniEQBars playing={track.playing} color="rgba(255,255,255,0.8)" />
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:700, textShadow:'0 1px 8px rgba(0,0,0,1)' }} />
        </div>
        <ArtistText text={track.artist} cfg={cfg} extra={{ textShadow:'0 1px 6px rgba(0,0,0,1)' }} />
      </div>
    </div>
  );
}

// Frosted — blur หนักมาก เหมือนกระจกฝ้า
export function StyleFrosted({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'rgba(255,255,255,0.08)',
      backdropFilter:'blur(32px) saturate(1.8)', WebkitBackdropFilter:'blur(32px) saturate(1.8)',
      borderRadius:14, padding:'11px 18px 11px 11px',
      border:'1px solid rgba(255,255,255,0.22)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260, maxWidth:380,
    }}>
      <AlbumArt src={track.albumArt} size={54} radius={9} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <MiniEQBars playing={track.playing} color="rgba(255,255,255,0.85)" />
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:700 }} />
        </div>
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
      <SpotifyLogo />
    </div>
  );
}

// CardWhite — การ์ดสีขาวสว่าง
export function StyleCardWhite({ track, cfg }) {
  const wTitle  = cfg.titleColor  === '#fff' ? '#111' : cfg.titleColor;
  const wArtist = cfg.artistColor === 'rgba(255,255,255,0.6)' ? '#555' : cfg.artistColor;
  const whiteCfg = { ...cfg, titleColor: wTitle, artistColor: wArtist };
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'rgba(255,255,255,0.95)',
      backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      borderRadius:12, padding:'10px 16px 10px 10px',
      boxShadow:'0 4px 24px rgba(0,0,0,0.3)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260, maxWidth:380,
    }}>
      <AlbumArt src={track.albumArt} size={54} radius={8} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <MiniEQBars playing={track.playing} color="#1DB954" />
          <TitleText text={track.title} cfg={whiteCfg} extra={{ fontWeight:700 }} />
        </div>
        <ArtistText text={track.artist} cfg={whiteCfg} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ANIMATED STYLES ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Wave — พื้นหลังคลื่น sine วิ่ง
export function StyleWave({ track, cfg }) {
  const waves = [0,1].map(i => (
    <div key={i} style={{
      position:'absolute', bottom:0, left:'-50%', width:'200%', height:'100%',
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 80'%3E%3Cpath d='M0,40 Q100,0 200,40 T400,40 T600,40 T800,40 V80 H0Z' fill='rgba(29,185,84,${i===0?'0.25':'0.12'})'/%3E%3C/svg%3E")`,
      backgroundRepeat:'repeat-x', backgroundSize:'400px 100%',
      animation:`waveScroll ${i===0?6:9}s linear infinite`,
    }} />
  ));
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(2,10,6,0.80)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {waves}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={60} radius={8} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Fire — อนุภาคไฟพุ่งขึ้น
export function StyleFire({ track, cfg }) {
  const fires = Array.from({length:18},(_,i)=>{
    const s=(i*137+23)%100;
    return { key:i, left:`${(s*3.7)%100}%`, bottom:`${(s*1.3)%35}%`,
      size:3+(s%5), color:`rgba(${220+(s%35)},${80+(s%80)},0,${0.5+(i%6)*0.08})`,
      anim:`fireRise ${0.9+(s%12)/10}s ease-out ${-(s%10)/10}s infinite` };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(5,2,0,0.85)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && fires.map(f=>(
        <div key={f.key} style={{ position:'absolute', left:f.left, bottom:f.bottom,
          width:f.size, height:f.size*2.5, borderRadius:'50% 50% 30% 30%',
          background:f.color, animation:f.anim, filter:'blur(1px)', pointerEvents:'none' }} />
      ))}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(5,2,0,.7) 0%,transparent 100%)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} extra={{ boxShadow:'0 0 12px rgba(255,100,0,.4)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Rain — สายฝนตก
export function StyleRain({ track, cfg }) {
  const drops = Array.from({length:22},(_,i)=>{
    const s=(i*97+13)%100;
    return { key:i, left:`${(s*4.1)%100}%`, height:8+(s%14),
      color:`rgba(120,200,255,${0.2+(i%7)*0.05})`,
      anim:`rainFall ${0.7+(s%15)/10}s linear ${-(s%12)/10}s infinite` };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(3,8,18,0.82)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && drops.map(d=>(
        <div key={d.key} style={{ position:'absolute', left:d.left, top:0,
          width:1.5, height:d.height, background:d.color, animation:d.anim, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Plasma — พื้นหลัง plasma สีสัน
export function StylePlasma({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <div style={{ position:'absolute', inset:'-10px',
        background:'linear-gradient(45deg,#0d1b8e,#8b0da8,#0d8b2e,#8b6d0d,#0d1b8e)',
        backgroundSize:'400% 400%',
        animation: track.playing ? 'aurora 5s ease infinite, plasmaHue 8s linear infinite' : 'none',
        filter:'blur(4px)',
      }} />
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Starfield — ดาวพุ่งในอวกาศ
export function StyleStarfield({ track, cfg }) {
  const stars = Array.from({length:30},(_,i)=>{
    const s=(i*173+37)%100;
    return { key:i, left:`${(s*3.3)%100}%`, top:`${(s*2.7)%100}%`,
      size:1+(i%3),
      anim:`particleFloat ${1.2+(s%20)/10}s ease-out ${-(s%15)/10}s infinite` };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'radial-gradient(ellipse at center,#0a0a1a 0%,#050508 100%)',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && stars.map(s=>(
        <div key={s.key} style={{ position:'absolute', left:s.left, top:s.top,
          width:s.size, height:s.size, borderRadius:'50%',
          background:`rgba(255,255,255,${0.4+(s.key%5)*0.1})`,
          animation:s.anim, pointerEvents:'none' }} />
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} extra={{ boxShadow:'0 0 16px rgba(100,100,255,.35)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Fireflies — จุดเรืองแสงลอย
export function StyleFireflies({ track, cfg }) {
  const flies = Array.from({length:20},(_,i)=>{
    const s=(i*113+57)%100;
    const colors=['rgba(255,230,0,','rgba(100,255,80,','rgba(255,180,50,'];
    return { key:i, left:`${(s*4.3)%100}%`, top:`${(s*3.1)%80}%`,
      size:2+(i%3), color:`${colors[i%3]}${0.5+(i%5)*0.1})`,
      anim:`floatBob ${2+(s%18)/10}s ease-in-out ${-(s%20)/10}s infinite` };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(2,8,4,0.82)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && flies.map(f=>(
        <div key={f.key} style={{ position:'absolute', left:f.left, top:f.top,
          width:f.size, height:f.size, borderRadius:'50%',
          background:f.color, animation:f.anim,
          boxShadow:`0 0 ${f.size*3}px ${f.color.replace('rgba','rgb').replace(/,[\d.]+\)$/,')')}`,
          pointerEvents:'none' }} />
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Glitch — กระตุก CRT artifact
export function StyleGlitch({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(0,0,0,0.9)', fontFamily:'monospace', userSelect:'none',
      animation: track.playing ? 'vhsFlicker 4s linear infinite' : 'none',
    }}>
      {/* Scanlines */}
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)',
        pointerEvents:'none', zIndex:4 }} />
      {/* Glitch bar */}
      {track.playing && <div style={{ position:'absolute', left:0, right:0, height:3,
        background:'rgba(0,255,200,0.6)', top:'30%',
        animation:'scanMove 3s linear infinite', pointerEvents:'none', zIndex:3 }} />}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px', zIndex:2 }}>
        <AlbumArt src={track.albumArt} size={58} radius={4}
          extra={{ filter:'saturate(1.5) contrast(1.1)', imageRendering:'pixelated' }} />
        <div style={{ flex:1, overflow:'hidden',
          animation: track.playing ? 'glitchShift 6s ease-in-out infinite' : 'none' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, fontFamily:'monospace', letterSpacing:1 }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ fontFamily:'monospace', color:'rgba(0,255,200,0.7)' }} />
        </div>
      </div>
    </div>
  );
}

// Matrix — อักษรเขียวตก
export function StyleMatrix({ track, cfg }) {
  const chars = '01アイウエオカキクケコサシスセソ';
  const drops = Array.from({length:24},(_,i)=>{
    const s=(i*89+43)%chars.length;
    return { key:i, left:`${(i/24)*100}%`,
      char:chars[s], color:`rgba(0,${180+(s%75)},0,${0.4+(i%6)*0.08})`,
      anim:`matrixFall ${0.8+(((i*89+43)%100)/10)*0.6}s linear ${-((i*89+43)%100)/10}s infinite`,
      fontSize:9+((i*89+43)%8) };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(0,5,0,0.88)', fontFamily:'monospace', userSelect:'none',
    }}>
      {track.playing && drops.map(d=>(
        <div key={d.key} style={{ position:'absolute', left:d.left, top:0,
          color:d.color, fontSize:d.fontSize, animation:d.anim, lineHeight:1, pointerEvents:'none' }}>
          {d.char}
        </div>
      ))}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(0,5,0,.75) 0%,rgba(0,5,0,.5) 50%,rgba(0,5,0,.75) 100%)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={4} extra={{ filter:'sepia(1) saturate(3) hue-rotate(80deg)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, color:'#00ff41', fontFamily:'monospace' }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ color:'rgba(0,200,40,0.7)', fontFamily:'monospace' }} />
        </div>
      </div>
    </div>
  );
}

// Ripple — วงขยายจากศูนย์กลาง
export function StyleRipple({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:210, height:210,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && [0,1,2,3].map(i=>(
        <div key={i} style={{ position:'absolute', width:70, height:70, borderRadius:'50%',
          border:'2px solid rgba(29,185,84,0.5)',
          animation:`rippleOut 2.8s ease-out ${i*0.7}s infinite`, pointerEvents:'none' }} />
      ))}
      <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', zIndex:1, flexShrink:0,
        border:'3px solid rgba(29,185,84,.7)', boxShadow:'0 0 20px rgba(29,185,84,.3)' }}>
        <AlbumArt src={track.albumArt} size={90} radius="50%" />
      </div>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, textAlign:'center',
        background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        borderRadius:9, padding:'6px 12px', overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ textAlign:'center', fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign:'center' }} />
      </div>
    </div>
  );
}

// Smoke — หมอกควันลอย
export function StyleSmoke({ track, cfg }) {
  const puffs = Array.from({length:12},(_,i)=>{
    const s=(i*127+19)%100;
    return { key:i, left:`${(s*4.7)%90}%`, bottom:`${(s*2)%50}%`,
      size:20+(s%30),
      anim:`fireRise ${2+(s%18)/10}s ease-out ${-(s%15)/10}s infinite` };
  });
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(8,8,12,0.82)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {track.playing && puffs.map(p=>(
        <div key={p.key} style={{ position:'absolute', left:p.left, bottom:p.bottom,
          width:p.size, height:p.size, borderRadius:'50%',
          background:'rgba(180,180,200,0.04)',
          animation:p.anim, filter:'blur(6px)', pointerEvents:'none' }} />
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8} extra={{ filter:'brightness(0.85)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MUSICAL STYLES ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Turntable — โต๊ะ DJ หมุนแผ่นเสียง
export function StyleTurntable({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none', gap:8 }}>
      {/* Platter */}
      <div style={{ position:'relative', width:120, height:120 }}>
        <div style={{ width:120, height:120, borderRadius:'50%',
          background:'conic-gradient(from 0deg,#1a1a1a 0%,#2a2a2a 8%,#111 16%,#222 24%,#111 32%,#2a2a2a 40%,#111 48%,#222 56%,#111 64%,#2a2a2a 72%,#111 80%,#222 88%,#111 100%)',
          animation: track.playing ? 'vinylSpin 1.8s linear infinite' : 'none',
          boxShadow:'0 4px 20px rgba(0,0,0,.7), inset 0 0 20px rgba(0,0,0,.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden',
            border:'2px solid rgba(255,255,255,.15)' }}>
            <AlbumArt src={track.albumArt} size={52} radius="50%" />
          </div>
        </div>
        {/* Tonearm */}
        <div style={{ position:'absolute', top:'10%', right:'-10%', width:4, height:52,
          background:'linear-gradient(to bottom,#aaa,#666)',
          borderRadius:2, transformOrigin:'top center',
          transform: track.playing ? 'rotate(-20deg)' : 'rotate(-5deg)',
          transition:'transform 0.8s ease', boxShadow:'0 1px 4px rgba(0,0,0,.4)' }} />
        <div style={{ position:'absolute', top:6, right:'-8%', width:14, height:14, borderRadius:'50%',
          background:'radial-gradient(circle,#ddd,#888)', border:'1px solid #555' }} />
      </div>
      <div style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        borderRadius:8, padding:'6px 16px', textAlign:'center', minWidth:140, maxWidth:200,
        border:'1px solid rgba(255,255,255,.08)', overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ textAlign:'center', fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign:'center' }} />
      </div>
    </div>
  );
}

// Piano — แป้นเปียโนที่กระพริบตาม EQ
export function StylePiano({ track, cfg }) {
  const WHITE_KEYS = 14;
  const BLACK_PATTERN = [1,1,0,1,1,1,0]; // 1=black exists between this and next
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none', gap:0 }}>
      {/* Info bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10,
        background:'rgba(0,0,0,0.85)', borderRadius:'12px 12px 0 0',
        padding:'8px 14px', minWidth:300, maxWidth:380 }}>
        <AlbumArt src={track.albumArt} size={44} radius={6} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
      </div>
      {/* Piano keys */}
      <div style={{ position:'relative', height:48, display:'flex',
        background:'rgba(0,0,0,0.9)', borderRadius:'0 0 8px 8px',
        padding:'0 6px 6px', gap:2, alignItems:'flex-end' }}>
        {Array.from({length:WHITE_KEYS},(_,i)=>{
          const seed=(i*137+23)%100;
          const isActive = track.playing && (seed < 35);
          return (
            <div key={i} style={{ width:16, height:40, borderRadius:'0 0 3px 3px',
              background: isActive ? '#1DB954' : '#f0f0f0',
              border:'1px solid rgba(0,0,0,0.3)',
              transition:'background 0.15s',
              animation: isActive ? `eq${i%5} ${0.5+i*0.07}s ease-in-out ${-i*0.1}s infinite` : 'none',
            }} />
          );
        })}
        {/* Black keys overlay */}
        {Array.from({length:WHITE_KEYS-1},(_,i)=>{
          if (!BLACK_PATTERN[i%7]) return null;
          return (
            <div key={`b${i}`} style={{ position:'absolute', left:`${6 + i*18 + 10}px`, top:6,
              width:11, height:26, borderRadius:'0 0 2px 2px',
              background:'rgba(10,10,10,0.95)', zIndex:2,
              border:'1px solid rgba(255,255,255,.05)' }} />
          );
        })}
      </div>
    </div>
  );
}

// Waveform — waveform bars (symmetric)
export function StyleWaveform({ track, cfg }) {
  const BARS = 40;
  return (
    <div style={{ width:380, borderRadius:12, overflow:'hidden',
      background:'rgba(4,4,8,0.82)', fontFamily:'system-ui,sans-serif', userSelect:'none',
      border:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px 4px' }}>
        <AlbumArt src={track.albumArt} size={48} radius={6} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
      {/* Symmetric waveform */}
      <div style={{ height:36, padding:'0 8px 4px', display:'flex', alignItems:'center', gap:1.5 }}>
        {Array.from({length:BARS},(_,i)=>{
          const seed=(i*73+11)%100;
          const dur=(0.3+(seed%50)/100).toFixed(2);
          const h = track.playing ? `${15+(seed%60)}%` : '10%';
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1, height:'100%', justifyContent:'center' }}>
              <div style={{ width:'100%', borderRadius:1, background:'#1DB954',
                height:h, animation: track.playing ? `eq${i%5} ${dur}s ease-in-out ${-((i*73+11)%100)/100}s infinite` : 'none', opacity:.85 }} />
              <div style={{ width:'100%', borderRadius:1, background:'#1DB954',
                height:h, animation: track.playing ? `eq${(i+2)%5} ${dur}s ease-in-out ${-((i*73+11)%100)/100}s infinite` : 'none', opacity:.45 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Oscilloscope — เส้น sine wave
export function StyleOscilloscope({ track, cfg }) {
  const W2 = 380, H2 = 88;
  const POINTS = 60;
  const pts = Array.from({length:POINTS+1},(_,i)=>{
    const x = (i/POINTS)*W2;
    const y = H2/2 + Math.sin((i/POINTS)*Math.PI*6) * (track.playing ? 18 : 5);
    return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{ position:'relative', width:W2, height:H2, borderRadius:12, overflow:'hidden',
      background:'rgba(0,10,0,0.88)', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <svg width={W2} height={H2} style={{ position:'absolute', inset:0 }}>
        <path d={pts} fill="none" stroke="#00ff88" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ filter:'drop-shadow(0 0 3px #00ff88)',
            animation: track.playing ? 'osciWave 0.8s ease-in-out infinite' : 'none' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={54} radius={6} extra={{ filter:'sepia(1) saturate(3) hue-rotate(80deg)', opacity:.9 }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, fontFamily:'monospace' }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ fontFamily:'monospace' }} />
        </div>
      </div>
    </div>
  );
}

// VinylColor — แผ่นเสียงสีสัน
export function StyleVinylColor({ track, cfg }) {
  const colors = ['#e84393','#43b8e8','#43e888','#e8a843','#a843e8'];
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none', gap:8 }}>
      <div style={{ position:'relative', width:150, height:150 }}>
        <div style={{ width:150, height:150, borderRadius:'50%',
          background:`conic-gradient(${colors.map((c,i)=>`${c} ${i*20}% ${(i+1)*20}%`).join(',')})`,
          animation: track.playing ? 'vinylSpin 2s linear infinite' : 'none',
          boxShadow:'0 6px 28px rgba(0,0,0,.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation: track.playing ? 'vinylSpin 2s linear infinite, hueRotate 8s linear infinite' : 'none',
        }}>
          <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden',
            border:'3px solid rgba(0,0,0,.4)' }}>
            <AlbumArt src={track.albumArt} size={60} radius="50%" />
          </div>
        </div>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:8, height:8, borderRadius:'50%', background:'#000', zIndex:2 }} />
      </div>
      <div style={{ background:'rgba(0,0,0,0.7)', borderRadius:9, padding:'6px 16px',
        textAlign:'center', minWidth:150, overflow:'hidden',
        border:'1px solid rgba(255,255,255,.08)' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ textAlign:'center', fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign:'center' }} />
      </div>
    </div>
  );
}

// SpectrumRing — วงกลม spectrum รอบอาร์ต
export function StyleSpectrumRing({ track, cfg }) {
  const BARS = 36;
  const R = 75, INNER = 54;
  return (
    <div style={{ position:'relative', width:180, height:180,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none' }}>
      <svg width={180} height={180} style={{ position:'absolute', inset:0 }}>
        {Array.from({length:BARS},(_,i)=>{
          const angle = (i/BARS)*Math.PI*2 - Math.PI/2;
          const seed  = (i*137+23)%100;
          const barH  = track.playing ? INNER*0.15 + (seed%100)/100*INNER*0.35 : INNER*0.1;
          const x1 = 90 + Math.cos(angle)*INNER;
          const y1 = 90 + Math.sin(angle)*INNER;
          const x2 = 90 + Math.cos(angle)*(INNER+barH);
          const y2 = 90 + Math.sin(angle)*(INNER+barH);
          const hue = (i/BARS)*360;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={`hsl(${hue},90%,60%)`} strokeWidth="3" strokeLinecap="round"
              style={{ animation: track.playing ? `eq${i%5} ${0.4+(seed%40)/100}s ease-in-out ${-(seed%100)/100}s infinite` : 'none' }}
            />
          );
        })}
      </svg>
      <div style={{ width:INNER*2-4, height:INNER*2-4, borderRadius:'50%', overflow:'hidden', zIndex:1 }}>
        <AlbumArt src={track.albumArt} size={INNER*2-4} radius="50%" />
      </div>
    </div>
  );
}

// Metronome — ลูกตุ้มแกว่ง
export function StyleMetronome({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center',
      fontFamily:'system-ui,sans-serif', userSelect:'none', gap:10 }}>
      {/* Pendulum */}
      <div style={{ position:'relative', width:80, height:100, display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:3, height:80, background:'linear-gradient(to bottom,#888,#555)',
          borderRadius:2, transformOrigin:'top center',
          animation: track.playing ? 'swingPend 0.6s ease-in-out infinite alternate' : 'none' }}>
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translate(-50%,50%)',
            width:20, height:20, borderRadius:'50%', background:'radial-gradient(circle,#ddd,#888)',
            border:'2px solid rgba(255,255,255,.2)', boxShadow:'0 2px 8px rgba(0,0,0,.5)' }} />
        </div>
        <div style={{ width:40, height:4, borderRadius:2, background:'#666', marginTop:-2 }} />
      </div>
      {/* Info */}
      <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:10, padding:'7px 18px',
        textAlign:'center', minWidth:160, border:'1px solid rgba(255,255,255,.07)', overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ textAlign:'center', fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} extra={{ textAlign:'center' }} />
      </div>
    </div>
  );
}

// CassetteMini — cassette แบบมินิมอล ไม่มี housing รก
export function StyleCassetteMini({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'linear-gradient(135deg,#1a1004,#0e0902)',
      borderRadius:12, padding:'10px 16px 10px 12px',
      border:'1.5px solid #3a2808', boxShadow:'0 4px 20px rgba(0,0,0,.6)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260,
    }}>
      {/* Mini reels */}
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {[0,1].map(i=>(
          <div key={i} style={{ width:32, height:32, borderRadius:'50%',
            background:'radial-gradient(circle,#2a2a2a 30%,#333 31%,#1a1a1a 55%,#444 57%,#2a2a2a 100%)',
            border:'1.5px solid #555',
            animation: track.playing ? `${i===0?'reelSpin':'reelSpinR'} ${i===0?1.8:2.2}s linear infinite` : 'none',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#777' }} />
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} />
      </div>
    </div>
  );
}

// BoomBox — ตู้เพลง retro
export function StyleBoomBox({ track, cfg }) {
  return (
    <div style={{ width:320, borderRadius:14,
      background:'linear-gradient(145deg,#1c1c1c,#111)',
      padding:'10px 14px', border:'2px solid #333',
      boxShadow:'0 6px 24px rgba(0,0,0,.7)',
      fontFamily:'system-ui,sans-serif', userSelect:'none' }}>
      {/* Speakers + display */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* Left speaker */}
        <div style={{ width:50, height:50, borderRadius:'50%', background:'#0a0a0a',
          border:'3px solid #333', flexShrink:0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, padding:8 }}>
          {Array.from({length:9}).map((_,i)=>(
            <div key={i} style={{ borderRadius:'50%', background:'#222', width:8, height:8 }} />
          ))}
        </div>
        {/* Center display */}
        <div style={{ flex:1, background:'#0a0a0a', borderRadius:6, padding:'6px 8px',
          border:'1px solid #222', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#ff4444',
              animation: track.playing ? 'ghostPulse 1s ease-in-out infinite' : 'none' }} />
            <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:700, fontSize: Math.min(cfg.fontSize, 12) }} />
          </div>
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        {/* Right speaker */}
        <div style={{ width:50, height:50, borderRadius:'50%', background:'#0a0a0a',
          border:'3px solid #333', flexShrink:0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, padding:8 }}>
          {Array.from({length:9}).map((_,i)=>(
            <div key={i} style={{ borderRadius:'50%', background:'#222', width:8, height:8 }} />
          ))}
        </div>
      </div>
      {/* EQ bars at bottom */}
      <div style={{ height:20, marginTop:6, display:'flex', gap:2, alignItems:'flex-end' }}>
        <EQBars count={24} playing={track.playing} gradient="linear-gradient(to top,#ff4444,#ffaa00)" />
      </div>
    </div>
  );
}

// Headphones — หูฟังพร้อมข้อมูล
export function StyleHeadphones({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:14,
      background:'rgba(0,0,0,0.78)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      borderRadius:14, padding:'12px 18px 12px 14px',
      border:'1px solid rgba(255,255,255,0.08)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260,
    }}>
      {/* Headphones SVG */}
      <svg width="48" height="40" viewBox="0 0 48 40" style={{ flexShrink:0, opacity:.9 }}>
        <path d="M24 4 C12 4 4 13 4 22" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
        <rect x="2" y="22" width="8" height="14" rx="3" fill="#1DB954" style={{ animation: track.playing ? 'ghostPulse 1.2s ease-in-out infinite' : 'none' }}/>
        <path d="M24 4 C36 4 44 13 44 22" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
        <rect x="38" y="22" width="8" height="14" rx="3" fill="#1DB954" style={{ animation: track.playing ? 'ghostPulse 1.2s ease-in-out 0.4s infinite' : 'none' }}/>
      </svg>
      <div style={{ flex:1, overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700 }} />
        <ArtistText text={track.artist} cfg={cfg} />
        <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:4 }}>
          <MiniEQBars playing={track.playing} color="#1DB954" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── THEMED STYLES ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Retro80s — synthwave neon grid
export function StyleRetro80s({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:96, borderRadius:4, overflow:'hidden',
      background:'#0a001a', fontFamily:'"Courier New",monospace', userSelect:'none',
    }}>
      {/* Grid floor */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:40,
        backgroundImage:'linear-gradient(to right,rgba(255,0,200,.15) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,0,200,.15) 1px,transparent 1px)',
        backgroundSize:'30px 15px',
        transform:'perspective(100px) rotateX(30deg)', transformOrigin:'bottom',
      }} />
      {/* Glow horizon */}
      <div style={{ position:'absolute', bottom:40, left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,#ff00c8,#00ffff,#ff00c8,transparent)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'8px 16px' }}>
        <AlbumArt src={track.albumArt} size={60} radius={2}
          extra={{ filter:'saturate(1.5) contrast(1.1)', boxShadow:'0 0 12px rgba(255,0,200,.5)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title.toUpperCase()} cfg={cfg}
            extra={{ fontWeight:700, letterSpacing:2, textShadow:'0 0 10px #ff00c8, 0 0 20px rgba(255,0,200,.4)' }} />
          <ArtistText text={track.artist} cfg={cfg}
            extra={{ color:'#00ffff', textShadow:'0 0 8px #00ffff', letterSpacing:1 }} />
        </div>
      </div>
    </div>
  );
}

// VHS — ม้วนวิดีโอเก่า scanlines
export function StyleVHS({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:4, overflow:'hidden',
      background:'rgba(5,5,5,0.92)', fontFamily:'"Courier New",monospace', userSelect:'none',
      animation:'vhsFlicker 5s linear infinite',
    }}>
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)',
        pointerEvents:'none', zIndex:4 }} />
      {track.playing && <div style={{ position:'absolute', left:0, right:0, height:2,
        background:'rgba(255,255,255,0.06)', animation:'scanMove 2.5s linear infinite', zIndex:3 }} />}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px', zIndex:2 }}>
        <div style={{ flexShrink:0, width:60, height:60, background:'#111', borderRadius:2,
          display:'flex', alignItems:'center', justifyContent:'center',
          border:'1px solid #333', overflow:'hidden' }}>
          <AlbumArt src={track.albumArt} size={60} radius={0}
            extra={{ filter:'contrast(1.2) saturate(0.7) sepia(0.2)' }} />
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, overflow:'hidden' }}>
            <span style={{ color:'#ff4444', fontSize:9, fontWeight:700, letterSpacing:1, flexShrink:0 }}>▶REC</span>
            <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:700, letterSpacing:0.5 }} />
          </div>
          <ArtistText text={track.artist} cfg={cfg} extra={{ color:'rgba(180,180,180,0.7)', letterSpacing:0.5 }} />
        </div>
        <span style={{ color:'#ff4444', fontSize:10, fontWeight:700, flexShrink:0, letterSpacing:1 }}>VHS</span>
      </div>
    </div>
  );
}

// Terminal — หน้าจอ terminal เขียว
export function StyleTerminal({ track, cfg }) {
  const time = new Date().toLocaleTimeString('en-US', { hour12:false });
  return (
    <div style={{ display:'inline-flex', flexDirection:'column',
      background:'rgba(0,8,0,0.94)', borderRadius:8, padding:'10px 14px',
      border:'1px solid rgba(0,200,0,0.3)', minWidth:280, maxWidth:400,
      fontFamily:'"Courier New",monospace', userSelect:'none',
      boxShadow:'0 4px 20px rgba(0,0,0,.7), 0 0 0 1px rgba(0,200,0,.08)',
    }}>
      <span style={{ color:'rgba(0,200,0,0.5)', fontSize:9, marginBottom:4 }}>
        $ spotify-now-playing [{time}]
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, overflow:'hidden' }}>
        <span style={{ color:'#00c800', fontSize:9, flexShrink:0 }}>TRACK:</span>
        <TitleText text={track.title} cfg={{ ...cfg, titleColor: cfg.titleColor !== '#fff' ? cfg.titleColor : '#00ff00' }} extra={{ fontWeight:700, fontFamily:'"Courier New",monospace' }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, overflow:'hidden' }}>
        <span style={{ color:'#00c800', fontSize:9, flexShrink:0 }}>ARTIST:</span>
        <ArtistText text={track.artist} cfg={{ ...cfg, artistColor: cfg.artistColor !== 'rgba(255,255,255,0.6)' ? cfg.artistColor : 'rgba(0,200,0,0.7)' }} extra={{ fontFamily:'"Courier New",monospace', margin:0 }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
        <span style={{ color:'rgba(0,255,0,0.4)', fontSize:9 }}>{track.playing ? '▶ playing' : '■ paused'}</span>
        <span style={{ color:'rgba(0,255,0,0.2)', fontSize:9, marginLeft:'auto' }}>_</span>
      </div>
    </div>
  );
}

// Hologram — โฮโลแกรม sci-fi
export function StyleHologram({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'rgba(0,8,22,0.85)', fontFamily:'system-ui,sans-serif', userSelect:'none',
      border:'1px solid rgba(0,200,255,0.3)',
      boxShadow:'0 0 20px rgba(0,150,255,0.2), inset 0 0 30px rgba(0,100,200,0.08)',
    }}>
      {/* Hologram scanlines */}
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,200,255,0.04) 3px,rgba(0,200,255,0.04) 6px)',
        pointerEvents:'none' }} />
      {/* Corner brackets */}
      {[{t:0,l:0,bTop:true,bLeft:true},{t:0,r:0,bTop:true,bRight:true},
        {b:0,l:0,bBottom:true,bLeft:true},{b:0,r:0,bBottom:true,bRight:true}].map((pos,i)=>(
        <div key={i} style={{ position:'absolute', width:12, height:12, ...pos,
          borderTop: pos.bTop ? '2px solid rgba(0,200,255,0.8)' : 'none',
          borderBottom: pos.bBottom ? '2px solid rgba(0,200,255,0.8)' : 'none',
          borderLeft: pos.bLeft ? '2px solid rgba(0,200,255,0.8)' : 'none',
          borderRight: pos.bRight ? '2px solid rgba(0,200,255,0.8)' : 'none',
        }} />
      ))}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={6}
          extra={{ filter:'hue-rotate(170deg) saturate(1.5)', opacity:.85,
            boxShadow:'0 0 14px rgba(0,200,255,.4)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700,
            textShadow:'0 0 8px rgba(0,200,255,.8)', color:'#90e8ff' }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ color:'rgba(0,200,255,0.6)' }} />
        </div>
        <div style={{ flexShrink:0, fontSize:9, color:'rgba(0,200,255,0.5)', textAlign:'right', lineHeight:1.4 }}>
          <div>SIG OK</div>
          <div style={{ animation:'ghostPulse 1.5s ease-in-out infinite' }}>● LIVE</div>
        </div>
      </div>
    </div>
  );
}

// Newspaper — หนังสือพิมพ์ขาวดำ
export function StyleNewspaper({ track, cfg }) {
  const bwCfg = { ...cfg, titleColor:'#111', artistColor:'#444' };
  return (
    <div style={{ display:'inline-flex', flexDirection:'column',
      background:'rgba(240,235,220,0.96)', borderRadius:4, padding:'10px 14px',
      border:'1px solid #888', minWidth:260, maxWidth:360,
      fontFamily:'"Times New Roman",Georgia,serif', userSelect:'none',
      boxShadow:'0 2px 8px rgba(0,0,0,.3)',
    }}>
      <div style={{ borderBottom:'2px solid #111', marginBottom:6, paddingBottom:4,
        fontSize:8, color:'#444', letterSpacing:2, textTransform:'uppercase' }}>
        ♪ NOW PLAYING ♪
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <AlbumArt src={track.albumArt} size={52} radius={2}
          extra={{ filter:'grayscale(1)', border:'1px solid #999' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={bwCfg} extra={{ fontWeight:700, fontFamily:'Georgia,serif', fontStyle:'italic' }} />
          <ArtistText text={track.artist} cfg={bwCfg} extra={{ fontFamily:'Georgia,serif' }} />
          <div style={{ marginTop:4, fontSize:8, color:'#666', display:'flex', alignItems:'center', gap:4 }}>
            <MiniEQBars playing={track.playing} color="#333" />
            <span>{track.playing ? 'Playing...' : 'Paused'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Polaroid — รูปโพลาลอยด์
export function StylePolaroid({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', flexDirection:'column',
      background:'rgba(252,250,244,0.97)', borderRadius:3, padding:'8px 8px 20px',
      boxShadow:'0 4px 20px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.2)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:130,
      transform:'rotate(-1.5deg)',
    }}>
      <div style={{ width:130, height:130, overflow:'hidden', marginBottom:8 }}>
        <AlbumArt src={track.albumArt} size={130} radius={0} />
      </div>
      <div style={{ textAlign:'center', overflow:'hidden', padding:'0 4px' }}>
        <TitleText text={track.title}  cfg={{ ...cfg, titleColor:'#222' }}
          extra={{ fontFamily:'"Courier New",monospace', fontStyle:'italic', fontWeight:600 }} />
        <ArtistText text={track.artist} cfg={{ ...cfg, artistColor:'#666' }}
          extra={{ fontFamily:'"Courier New",monospace' }} />
      </div>
      {track.playing && (
        <div style={{ position:'absolute', bottom:5, right:8, fontSize:8, color:'#1DB954',
          display:'flex', alignItems:'center', gap:2 }}>
          <span style={{ width:4, height:4, borderRadius:'50%', background:'#1DB954',
            animation:'ghostPulse 1s ease-in-out infinite' }} />
          <span>♫</span>
        </div>
      )}
    </div>
  );
}

// Cyberpunk — สีเหลือง/ม่วง cyberpunk
export function StyleCyberpunk({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, overflow:'hidden',
      background:'rgba(5,0,10,0.92)', fontFamily:'"Courier New",system-ui,sans-serif', userSelect:'none',
      borderTop:'2px solid #ffea00', borderBottom:'2px solid #cc00ff',
    }}>
      {/* Diagonal stripes */}
      <div style={{ position:'absolute', inset:0,
        backgroundImage:'repeating-linear-gradient(-45deg,rgba(255,234,0,0.03) 0px,rgba(255,234,0,0.03) 2px,transparent 2px,transparent 14px)',
        pointerEvents:'none' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:10, padding:'8px 14px' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <AlbumArt src={track.albumArt} size={56} radius={0}
            extra={{ filter:'saturate(1.4) contrast(1.2)', clipPath:'polygon(0 0,95% 0,100% 5%,100% 100%,5% 100%,0 95%)' }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#ffea00' }} />
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700,
            textShadow:'0 0 10px rgba(255,234,0,.6)', letterSpacing:1 }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ color:'#cc00ff',
            textShadow:'0 0 8px rgba(200,0,255,.5)', letterSpacing:1 }} />
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:8, color:'#ffea00', letterSpacing:1, marginBottom:2 }}>NEURAL//NET</div>
          <MiniEQBars playing={track.playing} color="#ffea00" />
        </div>
      </div>
    </div>
  );
}

// Lofi — cozy อบอุ่น pastel
export function StyleLofi({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'rgba(35,28,40,0.88)',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      borderRadius:16, padding:'12px 18px 12px 12px',
      border:'1px solid rgba(255,200,230,0.12)',
      boxShadow:'0 4px 24px rgba(0,0,0,.4)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260,
    }}>
      <AlbumArt src={track.albumArt} size={56} radius={12}
        extra={{ filter:'saturate(0.85) brightness(0.95)', border:'2px solid rgba(255,180,210,.15)' }} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <span style={{ fontSize:10 }}>☁️</span>
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:600 }} />
        </div>
        <ArtistText text={track.artist} cfg={{ ...cfg, artistColor: cfg.artistColor === 'rgba(255,255,255,0.6)' ? 'rgba(255,180,210,0.65)' : cfg.artistColor }} />
        <div style={{ display:'flex', gap:4, marginTop:5 }}>
          {['☁','☕','📖','🌙'].map((e,i)=>(
            <span key={i} style={{ fontSize:10, opacity:0.5 }}>{e}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Anime — อนิเมะ-inspired สไตล์
export function StyleAnime({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10,
      background:'linear-gradient(135deg,rgba(20,0,30,0.9),rgba(0,10,30,0.9))',
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      borderRadius:12, padding:'8px 16px 8px 8px',
      border:'1px solid rgba(255,150,200,0.25)',
      boxShadow:'0 4px 20px rgba(255,0,150,0.15)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:250,
    }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <AlbumArt src={track.albumArt} size={58} radius={8}
          extra={{ border:'2px solid rgba(255,100,180,.4)' }} />
        {track.playing && (
          <div style={{ position:'absolute', top:-4, right:-4, width:12, height:12, borderRadius:'50%',
            background:'linear-gradient(135deg,#ff69b4,#ff4da6)',
            boxShadow:'0 0 8px rgba(255,100,180,.8)', fontSize:7, color:'white',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>♪</div>
        )}
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700,
          textShadow:'0 0 12px rgba(255,100,180,.4)' }} />
        <ArtistText text={track.artist} cfg={{ ...cfg,
          artistColor: cfg.artistColor === 'rgba(255,255,255,0.6)' ? 'rgba(255,150,200,0.7)' : cfg.artistColor }} />
        <div style={{ display:'flex', gap:3, marginTop:4 }}>
          <MiniEQBars playing={track.playing} color="#ff69b4" />
          <span style={{ fontSize:8, color:'rgba(255,150,200,.5)', marginLeft:4 }}>♡ music</span>
        </div>
      </div>
    </div>
  );
}

// Nature — ธรรมชาติ ใบไม้สีเขียว
export function StyleNature({ track, cfg }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'rgba(6,18,8,0.85)',
      backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
      borderRadius:14, padding:'10px 16px 10px 10px',
      border:'1px solid rgba(50,180,60,0.2)',
      boxShadow:'0 4px 20px rgba(0,50,0,.3)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260,
    }}>
      <AlbumArt src={track.albumArt} size={56} radius={8}
        extra={{ filter:'saturate(1.1) brightness(0.95)',
          boxShadow:'0 2px 10px rgba(0,100,0,.4)' }} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
          <span style={{ fontSize:10 }}>🍃</span>
          <TitleText text={track.title} cfg={cfg} extra={{ fontWeight:700,
            color: cfg.titleColor === '#fff' ? '#c8f5cc' : cfg.titleColor }} />
        </div>
        <ArtistText text={track.artist} cfg={{ ...cfg,
          artistColor: cfg.artistColor === 'rgba(255,255,255,0.6)' ? 'rgba(140,220,140,0.7)' : cfg.artistColor }} />
        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
          <MiniEQBars playing={track.playing} color="#3db854" />
          <span style={{ fontSize:8, color:'rgba(100,200,100,.5)', marginLeft:4 }}>🌿 🌱 🌿</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── COLOR / GRADIENT STYLES ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function GradientCard({ gradient, border, track, cfg, children }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      <div style={{ position:'absolute', inset:0, background:gradient,
        animation:'sunsetShift 8s ease infinite', backgroundSize:'200% 200%' }} />
      {border && <div style={{ position:'absolute', inset:0, border:`1px solid ${border}` }} />}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.28)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={60} radius={8} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700, textShadow:'0 1px 6px rgba(0,0,0,.5)' }} />
          <ArtistText text={track.artist} cfg={cfg} extra={{ textShadow:'0 1px 4px rgba(0,0,0,.4)' }} />
        </div>
        {children}
        <SpotifyLogo />
      </div>
    </div>
  );
}

export function StyleSunset({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#1a0030,#6b0f3a,#c44a1a,#e8821a,#f5c842)" />;
}
export function StyleMidnight({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#010215,#050b2e,#0d1a5a,#0a0525,#010215)" />;
}
export function StyleCherry({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#200010,#6b0030,#c0004a,#800030,#300015)" />;
}
export function StyleOcean({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#001020,#003060,#006090,#004070,#001020)" />;
}
export function StyleForest({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#010a02,#051a08,#0b3010,#082008,#010a02)" />;
}

// Gold — หรูหรา ทองคำ
export function StyleGold({ track, cfg }) {
  const goldCfg = { ...cfg, titleColor: cfg.titleColor === '#fff' ? '#1a0e00' : cfg.titleColor,
    artistColor: cfg.artistColor === 'rgba(255,255,255,0.6)' ? 'rgba(60,30,0,0.75)' : cfg.artistColor };
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      borderRadius:12, padding:'10px 16px 10px 10px',
      background:'linear-gradient(135deg,#f5d060,#c8940a,#f5d060,#a07200)',
      backgroundSize:'300% 100%',
      animation:'goldShimmer 3s linear infinite',
      boxShadow:'0 4px 20px rgba(180,120,0,.4)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260, maxWidth:380,
    }}>
      <AlbumArt src={track.albumArt} size={56} radius={8}
        extra={{ border:'2px solid rgba(255,220,80,.5)' }} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <MiniEQBars playing={track.playing} color="#5a3800" />
          <TitleText text={track.title} cfg={goldCfg} extra={{ fontWeight:700 }} />
        </div>
        <ArtistText text={track.artist} cfg={goldCfg} />
      </div>
    </div>
  );
}

// Cosmic — อวกาศสีหลากหลาย
export function StyleCosmic({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'radial-gradient(ellipse at 20% 50%,rgba(100,0,150,.6) 0%,transparent 50%), radial-gradient(ellipse at 80% 20%,rgba(0,50,150,.5) 0%,transparent 50%), radial-gradient(ellipse at 60% 80%,rgba(150,0,80,.4) 0%,transparent 50%), #030008',
      animation:'cosmicDrift 20s linear infinite',
      fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {/* Stars */}
      {Array.from({length:25},(_,i)=>{
        const s=(i*97+13)%100;
        return <div key={i} style={{ position:'absolute',
          left:`${(s*4.1)%100}%`, top:`${(s*3.3)%100}%`,
          width:1+(i%2), height:1+(i%2), borderRadius:'50%',
          background:`rgba(255,255,255,${0.3+(i%6)*0.1})`,
          animation:`floatBob ${2+(s%20)/10}s ease-in-out ${-(s%15)/10}s infinite` }} />;
      })}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8}
          extra={{ boxShadow:'0 0 20px rgba(150,0,255,.4)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700,
            textShadow:'0 0 12px rgba(200,100,255,.5)' }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Candy — pastel หวาน
export function StyleCandy({ track, cfg }) {
  return <GradientCard track={track} cfg={cfg}
    gradient="linear-gradient(-45deg,#2a0035,#4a0060,#350050,#1a0025,#3a005a)" />;
}

// Lava — magma สีส้ม
export function StyleLava({ track, cfg }) {
  return (
    <div style={{ position:'relative', width:380, height:88, borderRadius:12, overflow:'hidden',
      background:'#080200', fontFamily:'system-ui,sans-serif', userSelect:'none',
    }}>
      {/* Lava blobs */}
      <div style={{ position:'absolute', bottom:'-20%', left:'10%', width:200, height:80,
        background:'rgba(255,80,0,0.2)', borderRadius:'60% 40% 30% 70% / 60% 30% 70% 40%',
        filter:'blur(12px)',
        animation: track.playing ? 'lavaBlob 4s ease-in-out infinite' : 'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', right:'5%', width:140, height:60,
        background:'rgba(200,50,0,0.15)', borderRadius:'40% 60% 70% 30% / 50% 60% 30% 60%',
        filter:'blur(10px)',
        animation: track.playing ? 'lavaBlob 5s ease-in-out 1s infinite' : 'none' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', gap:12, padding:'10px 16px' }}>
        <AlbumArt src={track.albumArt} size={58} radius={8}
          extra={{ boxShadow:'0 0 15px rgba(255,80,0,.3)' }} />
        <div style={{ flex:1, overflow:'hidden' }}>
          <TitleText text={track.title}  cfg={cfg} extra={{ fontWeight:700,
            textShadow:'0 0 8px rgba(255,100,0,.5)' }} />
          <ArtistText text={track.artist} cfg={cfg} />
        </div>
        <SpotifyLogo />
      </div>
    </div>
  );
}

// Ice — น้ำแข็ง เย็น
export function StyleIce({ track, cfg }) {
  const iceCfg = { ...cfg,
    titleColor: cfg.titleColor === '#fff' ? '#e8f8ff' : cfg.titleColor,
    artistColor: cfg.artistColor === 'rgba(255,255,255,0.6)' ? 'rgba(180,230,255,0.7)' : cfg.artistColor };
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12,
      background:'linear-gradient(135deg,rgba(180,220,255,0.12),rgba(100,180,255,0.08))',
      backdropFilter:'blur(20px) brightness(1.1)', WebkitBackdropFilter:'blur(20px) brightness(1.1)',
      borderRadius:14, padding:'10px 16px 10px 10px',
      border:'1px solid rgba(180,230,255,0.3)',
      boxShadow:'0 4px 24px rgba(100,180,255,.15), inset 0 1px 0 rgba(255,255,255,.2)',
      fontFamily:'system-ui,sans-serif', userSelect:'none', minWidth:260, maxWidth:380,
    }}>
      <AlbumArt src={track.albumArt} size={56} radius={8}
        extra={{ filter:'saturate(0.7) brightness(1.1)', border:'1px solid rgba(180,230,255,.3)' }} />
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <MiniEQBars playing={track.playing} color="#80d0ff" />
          <TitleText text={track.title} cfg={iceCfg} extra={{ fontWeight:700 }} />
        </div>
        <ArtistText text={track.artist} cfg={iceCfg} />
      </div>
      <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink:0, opacity:.5 }} fill="#80d0ff">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    </div>
  );
}
