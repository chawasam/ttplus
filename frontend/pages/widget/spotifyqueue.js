// widget/spotifyqueue.js — Spotify Queue Widget สำหรับ OBS
// URL params:
//   ?cid=xxx
//   &maxItems=10          (จำนวนเพลงในคิว, 5–20, default 10)
//   &theme=dark           (dark|light|glass|minimal, default dark)
//   &showArt=1            (แสดง album art, 0=ซ่อน, default 1)
//   &showArtist=1         (แสดงชื่อศิลปิน, 0=ซ่อน, default 1)
//   &showDuration=1       (แสดงความยาวเพลง, 0=ซ่อน, default 1)
//   &showNumber=1         (แสดงตัวเลขลำดับ, 0=ซ่อน, default 1)
//   &showCurrent=1        (แสดงเพลงที่กำลังเล่น, 0=ซ่อน, default 1)
//   &fontSize=13          (ขนาดตัวอักษร title, px, default 13)
//   &rowHeight=56         (ความสูงแต่ละแถว, px, default 56)
//   &titleColor=ffffff    (สี title, hex, default ตามธีม)
//   &artistColor=ffffff99 (สี artist, hex, default ตามธีม)
//   &bgColor=             (สี background custom, hex, default ตามธีม)
//   &bgOpacity=90         (ความโปร่งแสง 0–100, default 90)
//   &accentColor=1DB954   (สี accent (เพลงปัจจุบัน / progress), hex, default #1DB954)
//   &marquee=0            (ตัวหนังสือวิ่งเมื่อยาว, default 0)
//   &scrollSpeed=20       (ความเร็ว marquee วินาที/รอบ, default 20)
//   &roundArt=1           (art corner radius มน, 0=เหลี่ยม, default 1)
//   &showDivider=1        (เส้นคั่นระหว่าง current กับ queue, default 1)

import { useEffect, useState, useRef } from 'react';
import { createWidgetSocket } from '../../lib/widgetSocket';

const BACKEND  = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS  = 10_000; // refresh ทุก 10 วิ

// ── helpers ────────────────────────────────────────────────────────────────────
function parseColor(raw, def) {
  if (!raw) return def;
  if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw)) return `#${raw}`;
  return def;
}
function num(v, def, min, max) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function flag(v, def) {
  if (v === undefined || v === null || v === '') return def;
  return v === '1' || v === 'true' || v === true;
}
function fmtMs(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ── Demo data ──────────────────────────────────────────────────────────────────
const DEMO_CURRENT = {
  id: 'demo-0',
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  album: 'After Hours',
  albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
  durationMs: 200040,
};
const DEMO_QUEUE = [
  { id: 'd1', title: 'Save Your Tears',    artist: 'The Weeknd',     album: 'After Hours',     albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', durationMs: 215560 },
  { id: 'd2', title: 'Levitating',         artist: 'Dua Lipa',       album: 'Future Nostalgia', albumArt: 'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946', durationMs: 203064 },
  { id: 'd3', title: 'Stay',               artist: 'The Kid LAROI',  album: 'F*CK LOVE 3',      albumArt: 'https://i.scdn.co/image/ab67616d0000b273a83a76451a3a7fe3e1e9d3cf', durationMs: 141007 },
  { id: 'd4', title: 'Bad Habits',         artist: 'Ed Sheeran',     album: '=',                albumArt: 'https://i.scdn.co/image/ab67616d0000b273ef24c3fdbf8ebe4d3f84f69e', durationMs: 231041 },
  { id: 'd5', title: 'MONTERO',            artist: 'Lil Nas X',      album: 'MONTERO',          albumArt: 'https://i.scdn.co/image/ab67616d0000b273be82673b5f79d9658ec0a9fd', durationMs: 137533 },
  { id: 'd6', title: 'Easy On Me',         artist: 'Adele',          album: '30',               albumArt: 'https://i.scdn.co/image/ab67616d0000b273c6b577e4c4a6d326354a89b7', durationMs: 224510 },
  { id: 'd7', title: 'Shivers',            artist: 'Ed Sheeran',     album: '=',                albumArt: 'https://i.scdn.co/image/ab67616d0000b273ef24c3fdbf8ebe4d3f84f69e', durationMs: 207853 },
  { id: 'd8', title: 'Butter',             artist: 'BTS',            album: 'Butter',           albumArt: 'https://i.scdn.co/image/ab67616d0000b273783e37ec84a92a94a12e37f6', durationMs: 164422 },
  { id: 'd9', title: 'Peaches',            artist: 'Justin Bieber',  album: 'Justice',          albumArt: 'https://i.scdn.co/image/ab67616d0000b273e6f407c7f3a0ec98845e4431', durationMs: 198082 },
  { id: 'd10', title: 'Dynamite',          artist: 'BTS',            album: 'BE',               albumArt: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f', durationMs: 199054 },
];

// ── Themes ─────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:          'rgba(10,10,15,0.9)',
    trackBg:     'rgba(255,255,255,0.04)',
    trackHover:  'rgba(255,255,255,0.08)',
    currentBg:   'rgba(29,185,84,0.12)',
    currentBorder:'rgba(29,185,84,0.35)',
    title:       '#ffffff',
    artist:      'rgba(255,255,255,0.6)',
    duration:    'rgba(255,255,255,0.4)',
    number:      'rgba(255,255,255,0.25)',
    divider:     'rgba(255,255,255,0.08)',
    header:      'rgba(255,255,255,0.4)',
  },
  light: {
    bg:          'rgba(250,250,250,0.95)',
    trackBg:     'rgba(0,0,0,0.03)',
    trackHover:  'rgba(0,0,0,0.06)',
    currentBg:   'rgba(29,185,84,0.1)',
    currentBorder:'rgba(29,185,84,0.4)',
    title:       '#111111',
    artist:      'rgba(0,0,0,0.55)',
    duration:    'rgba(0,0,0,0.35)',
    number:      'rgba(0,0,0,0.2)',
    divider:     'rgba(0,0,0,0.08)',
    header:      'rgba(0,0,0,0.4)',
  },
  glass: {
    bg:          'rgba(255,255,255,0.08)',
    trackBg:     'rgba(255,255,255,0.06)',
    trackHover:  'rgba(255,255,255,0.12)',
    currentBg:   'rgba(29,185,84,0.18)',
    currentBorder:'rgba(29,185,84,0.5)',
    title:       '#ffffff',
    artist:      'rgba(255,255,255,0.65)',
    duration:    'rgba(255,255,255,0.45)',
    number:      'rgba(255,255,255,0.3)',
    divider:     'rgba(255,255,255,0.1)',
    header:      'rgba(255,255,255,0.5)',
    blur:        'blur(12px)',
    border:      '1px solid rgba(255,255,255,0.15)',
  },
  minimal: {
    bg:          'transparent',
    trackBg:     'transparent',
    trackHover:  'rgba(255,255,255,0.06)',
    currentBg:   'transparent',
    currentBorder:'transparent',
    title:       '#ffffff',
    artist:      'rgba(255,255,255,0.55)',
    duration:    'rgba(255,255,255,0.35)',
    number:      'rgba(255,255,255,0.2)',
    divider:     'rgba(255,255,255,0.12)',
    header:      'rgba(255,255,255,0.4)',
  },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function SpotifyQueueWidget() {
  const [params, setParams] = useState(null);
  const [current, setCurrent] = useState(null);
  const [queue,   setQueue]   = useState([]);
  const [error,   setError]   = useState(null);
  const [isDemo,  setIsDemo]  = useState(false);
  const timerRef  = useRef(null);
  const paramsRef = useRef(null);
  const socketRef = useRef(null);

  // ── parse URL params ──────────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cfg = {
      cid:          p.get('cid') || '',
      maxItems:     num(p.get('maxItems'),   10, 1, 20),
      theme:        ['dark','light','glass','minimal'].includes(p.get('theme')) ? p.get('theme') : 'dark',
      showArt:      flag(p.get('showArt'),      true),
      showArtist:   flag(p.get('showArtist'),   true),
      showDuration: flag(p.get('showDuration'), true),
      showNumber:   flag(p.get('showNumber'),   true),
      showCurrent:  flag(p.get('showCurrent'),  true),
      showDivider:  flag(p.get('showDivider'),  true),
      fontSize:     num(p.get('fontSize'),   13, 8, 28),
      rowHeight:    num(p.get('rowHeight'),  56, 36, 100),
      bgOpacity:    num(p.get('bgOpacity'),  90, 0, 100),
      marquee:      flag(p.get('marquee'),   false),
      scrollSpeed:  num(p.get('scrollSpeed'), 20, 4, 60),
      roundArt:     flag(p.get('roundArt'),  true),
      titleColor:   null,
      artistColor:  null,
      bgColor:      null,
      accentColor:  null,
    };
    if (p.get('titleColor'))  cfg.titleColor  = parseColor(p.get('titleColor'),  null);
    if (p.get('artistColor')) cfg.artistColor = parseColor(p.get('artistColor'), null);
    if (p.get('bgColor'))     cfg.bgColor     = parseColor(p.get('bgColor'),     null);
    if (p.get('accentColor')) cfg.accentColor = parseColor(p.get('accentColor'), null);
    paramsRef.current = cfg;
    setParams(cfg);

    // ── Socket: รับ style_update แบบ real-time จาก widgets page ──────────────
    const socket = createWidgetSocket(cfg.cid, {
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'spotifyqueue') return;
        setParams(prev => {
          if (!prev) return prev;
          const updated = { ...prev };
          // map style keys → param keys (เหมือน configFields ใน widgets.js)
          const boolKeys = ['showArt','showArtist','showDuration','showNumber',
                            'showCurrent','showDivider','marquee','roundArt'];
          for (const [k, v] of Object.entries(style)) {
            if (boolKeys.includes(k)) {
              updated[k] = v === 1 || v === true || v === '1';
            } else if (['fontSize','rowHeight','bgOpacity','scrollSpeed','maxItems'].includes(k)) {
              updated[k] = Number(v);
            } else if (['theme'].includes(k)) {
              updated[k] = v;
            } else if (['titleColor','artistColor','accentColor','bgColor'].includes(k)) {
              // ว่างเปล่า = ล้าง custom color กลับตามธีม
              updated[k] = (v && String(v).trim()) ? parseColor(String(v), null) : null;
            }
          }
          paramsRef.current = updated;
          return updated;
        });
      },
    });
    if (socket) socketRef.current = socket;

    return () => {
      socketRef.current = null;
      socket?.disconnect();
    };
  }, []);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchQueue = async (cfg) => {
    if (!cfg.cid) {
      setIsDemo(true);
      setCurrent(DEMO_CURRENT);
      setQueue(DEMO_QUEUE.slice(0, cfg.maxItems));
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/api/spotify/queue?cid=${encodeURIComponent(cfg.cid)}`);
      if (!res.ok) throw new Error('http_error');
      const data = await res.json();
      if (data.error === 'not_connected') {
        setError('not_connected');
        setCurrent(null);
        setQueue([]);
        return;
      }
      setError(null);
      setIsDemo(false);
      setCurrent(data.current || null);
      setQueue((data.queue || []).slice(0, cfg.maxItems));
    } catch {
      // keep last data on fetch error — don't blank out
    }
  };

  useEffect(() => {
    if (!params) return;
    fetchQueue(params);
    // interval ใช้ paramsRef เพื่อ fetch ด้วย config ล่าสุดเสมอ (รวม real-time update)
    timerRef.current = setInterval(() => fetchQueue(paramsRef.current || params), POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [params]);

  if (!params) return null;

  const t = THEMES[params.theme] || THEMES.dark;
  const accent = params.accentColor || '#1DB954';

  // compose bg color with opacity
  // bgOpacity ใช้ได้เสมอ ไม่ว่าจะมี custom bgColor หรือไม่
  const op = params.bgOpacity / 100;
  let rootBg;
  if (params.bgColor) {
    // custom color + opacity
    const hex = params.bgColor.replace('#', '');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    rootBg = op === 0 ? 'transparent' : `rgba(${r},${g},${b},${op.toFixed(2)})`;
  } else {
    // ใช้ theme color แต่ apply opacity ที่ user กำหนด
    if (op === 0) {
      rootBg = 'transparent';
    } else {
      // parse rgba จาก theme string แล้วแทน alpha
      const m = t.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      rootBg = m
        ? `rgba(${m[1]},${m[2]},${m[3]},${op.toFixed(2)})`
        : t.bg;
    }
  }

  const artRadius = params.roundArt ? '6px' : '2px';

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: transparent; width: 100%; height: 100%; overflow: hidden; }
        @keyframes marqueeLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes currentGlow {
          0%,100% { box-shadow: 0 0 0 1px ${accent}50; }
          50%     { box-shadow: 0 0 8px 2px ${accent}30; }
        }
        .sq-row { animation: fadeIn 0.25s ease; }
        .sq-current { animation: currentGlow 2.5s ease-in-out infinite; }
        .sq-marquee-wrap { overflow: hidden; white-space: nowrap; }
        .sq-marquee-inner { display: inline-block; white-space: nowrap; animation: marqueeLeft linear infinite; }
        .sq-static { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}</style>

      <div style={{
        width: '100%',
        minHeight: '100vh',
        background: rootBg,
        backdropFilter: t.blur || 'none',
        WebkitBackdropFilter: t.blur || 'none',
        border: t.border || 'none',
        borderRadius: '12px',
        padding: '10px 4px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}>

        {/* Error state */}
        {error === 'not_connected' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '120px', gap: '8px',
          }}>
            <span style={{ fontSize: '28px' }}>🎵</span>
            <p style={{ fontSize: '12px', color: t.artist, textAlign: 'center' }}>
              เชื่อมต่อ Spotify ใน Settings ก่อนนะ
            </p>
          </div>
        )}

        {/* Current track */}
        {!error && params.showCurrent && current && (
          <TrackRow
            track={current}
            isCurrent
            index={-1}
            params={params}
            t={t}
            accent={accent}
            artRadius={artRadius}
          />
        )}

        {/* Divider between current and queue */}
        {!error && params.showCurrent && params.showDivider && current && queue.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '4px 10px 4px',
          }}>
            <div style={{ flex: 1, height: '1px', background: t.divider }} />
            <span style={{ fontSize: '10px', color: t.header, letterSpacing: '0.05em', flexShrink: 0 }}>
              คิวถัดไป
            </span>
            <div style={{ flex: 1, height: '1px', background: t.divider }} />
          </div>
        )}

        {/* Queue */}
        {!error && queue.map((track, i) => (
          <TrackRow
            key={track.id || i}
            track={track}
            isCurrent={false}
            index={i + 1}
            params={params}
            t={t}
            accent={accent}
            artRadius={artRadius}
          />
        ))}

        {/* Empty queue */}
        {!error && !current && queue.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '80px', gap: '6px',
          }}>
            <span style={{ fontSize: '22px' }}>🎵</span>
            <p style={{ fontSize: '11px', color: t.artist }}>ยังไม่มีเพลงในคิว</p>
          </div>
        )}

        {/* Demo label */}
        {isDemo && (
          <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
            <span style={{
              fontSize: '10px', color: 'rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.07)', borderRadius: '4px',
              padding: '2px 6px', letterSpacing: '0.04em',
            }}>
              DEMO — เพิ่ม ?cid= เพื่อใช้งานจริง
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── TrackRow ───────────────────────────────────────────────────────────────────
function TrackRow({ track, isCurrent, index, params, t, accent, artRadius }) {
  const rowH = params.rowHeight;
  const artSize = Math.max(28, Math.min(rowH - 10, 44));

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: `4px 10px`,
    minHeight: `${rowH}px`,
    borderRadius: '8px',
    margin: '1px 2px',
    background: isCurrent ? t.currentBg : t.trackBg,
    border: `1px solid ${isCurrent ? t.currentBorder : 'transparent'}`,
    transition: 'background 0.2s',
    position: 'relative',
    overflow: 'hidden',
    className: `sq-row${isCurrent ? ' sq-current' : ''}`,
  };

  return (
    <div style={rowStyle} className={`sq-row${isCurrent ? ' sq-current' : ''}`}>

      {/* Left accent bar for current */}
      {isCurrent && (
        <div style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: '3px', borderRadius: '0 3px 3px 0',
          background: accent,
        }} />
      )}

      {/* Index number */}
      {params.showNumber && (
        <div style={{
          width: '18px', textAlign: 'center', flexShrink: 0,
          fontSize: `${params.fontSize - 2}px`,
          color: isCurrent ? accent : t.number,
          fontWeight: isCurrent ? 700 : 400,
        }}>
          {isCurrent ? '▶' : index}
        </div>
      )}

      {/* Album art */}
      {params.showArt && (
        <img
          src={track.albumArt || ''}
          alt=""
          style={{
            width: `${artSize}px`,
            height: `${artSize}px`,
            borderRadius: artRadius,
            objectFit: 'cover',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.08)',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      {/* Title + artist */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <TextLine
          text={track.title}
          style={{
            fontSize: `${params.fontSize}px`,
            fontWeight: isCurrent ? 700 : 500,
            color: params.titleColor || t.title,
            lineHeight: 1.25,
          }}
          marquee={params.marquee}
          speed={params.scrollSpeed}
        />
        {params.showArtist && (
          <TextLine
            text={track.artist}
            style={{
              fontSize: `${Math.max(9, params.fontSize - 2)}px`,
              color: params.artistColor || t.artist,
              marginTop: '2px',
              lineHeight: 1.2,
            }}
            marquee={params.marquee}
            speed={params.scrollSpeed}
          />
        )}
      </div>

      {/* Duration */}
      {params.showDuration && track.durationMs && (
        <div style={{
          flexShrink: 0,
          fontSize: `${Math.max(9, params.fontSize - 2)}px`,
          color: t.duration,
          fontVariantNumeric: 'tabular-nums',
          paddingLeft: '4px',
        }}>
          {fmtMs(track.durationMs)}
        </div>
      )}
    </div>
  );
}

// ── TextLine — marquee or static ───────────────────────────────────────────────
function TextLine({ text, style, marquee, speed }) {
  const ref = useRef(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const check = () => setOverflow(ref.current.scrollWidth > ref.current.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [text]);

  if (marquee && overflow) {
    const doubled = text + '      ' + text;
    return (
      <div className="sq-marquee-wrap" style={style}>
        <span
          className="sq-marquee-inner"
          style={{ animationDuration: `${speed}s` }}
        >
          {doubled}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className="sq-static" style={style}>
      {text}
    </div>
  );
}
