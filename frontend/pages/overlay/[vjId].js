// pages/overlay/[vjId].js — Stream Overlay for OBS Browser Source
// URL: /overlay/tiktok_username
// ใช้เป็น Browser Source ใน OBS — แสดงสถานะเกม + events แบบ real-time

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_INTERVAL = 5000; // refresh ทุก 5 วินาที

const ZONE_NAMES = {
  town_square:    '🏘️ Town Square',
  town_outskirts: '🌾 ชานเมือง',
  forest_path:    '🌲 ทางป่า',
  dark_cave:      '🕳️ ถ้ำมืด',
};

const EVENT_COLORS = {
  kill:          '#e8a23a',
  level_up:      '#4fc96f',
  dungeon_clear: '#9b59b6',
  achievement:   '#f1c40f',
  gift:          '#e74c3c',
  default:       '#aaa',
};

export default function OverlayPage() {
  const router = useRouter();
  const { vjId } = router.query;

  const [state,     setState]     = useState(null);
  const [events,    setEvents]    = useState([]);      // visible event queue (animated)
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const prevEventsRef = useRef([]);
  const pollRef       = useRef(null);

  const fetchState = useCallback(async () => {
    if (!vjId) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/overlay/${vjId}`);
      const data = await res.json();

      if (!data.found || !data.hasChar) {
        setError(data.found ? 'ยังไม่มี Character' : `ไม่พบ @${vjId}`);
        setLoading(false);
        return;
      }

      setState(data);
      setError(null);
      setLoading(false);

      // Detect new events compared to last fetch
      const prevTs = prevEventsRef.current[0]?.ts || 0;
      const newEvts = (data.recentEvents || []).filter(e => e.ts > prevTs);
      if (newEvts.length > 0) {
        setEvents(prev => [...newEvts.reverse(), ...prev].slice(0, 8));
      }
      prevEventsRef.current = data.recentEvents || [];
    } catch (err) {
      setError('เชื่อมต่อไม่ได้');
      setLoading(false);
    }
  }, [vjId]);

  // Start polling
  useEffect(() => {
    if (!vjId) return;
    fetchState();
    pollRef.current = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [vjId, fetchState]);

  // Auto-remove old events after 8 seconds
  useEffect(() => {
    if (events.length === 0) return;
    const t = setTimeout(() => {
      setEvents(prev => prev.slice(0, -1));
    }, 8000);
    return () => clearTimeout(t);
  }, [events]);

  if (loading) return (
    <div style={styles.root}>
      <p style={{ color: '#888', fontFamily: 'monospace', fontSize: 13 }}>กำลังโหลด...</p>
    </div>
  );

  if (error) return (
    <div style={styles.root}>
      <p style={{ color: '#e74c3c', fontFamily: 'monospace', fontSize: 13 }}>⚠️ {error}</p>
    </div>
  );

  if (!state) return null;

  const char  = state.character;
  const hpPct = Math.min(100, ((char.hp / char.hpMax) * 100));
  const mpPct = Math.min(100, ((char.mp / char.mpMax) * 100));
  const xpPct = Math.min(100, ((char.xp / char.xpToNext) * 100));

  return (
    <>
      <Head>
        <title>Overlay — {char.name}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: transparent !important; }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
        `}</style>
      </Head>

      <div style={styles.root}>
        {/* ── CHARACTER CARD ── */}
        <div style={styles.card}>
          {/* Header row */}
          <div style={styles.headerRow}>
            <span style={styles.charName}>{char.name}</span>
            <span style={styles.charMeta}>{char.race} {char.class}</span>
            <span style={styles.level}>Lv.{char.level}</span>
          </div>

          {/* HP bar */}
          <div style={styles.barRow}>
            <span style={styles.barLabel}>❤️</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: `${hpPct}%`, background: '#c0392b' }} />
            </div>
            <span style={styles.barVal}>{char.hp}/{char.hpMax}</span>
          </div>

          {/* MP bar */}
          <div style={styles.barRow}>
            <span style={styles.barLabel}>💧</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: `${mpPct}%`, background: '#2980b9' }} />
            </div>
            <span style={styles.barVal}>{char.mp}/{char.mpMax}</span>
          </div>

          {/* XP bar */}
          <div style={styles.barRow}>
            <span style={styles.barLabel}>⭐</span>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: `${xpPct}%`, background: '#8e44ad' }} />
            </div>
            <span style={styles.barVal}>{char.xp}/{char.xpToNext}</span>
          </div>

          {/* Stats row */}
          <div style={styles.statsRow}>
            <StatChip label="💰" val={state.gold?.toLocaleString()} />
            <StatChip label="🗡️" val={char.monstersKilled} />
            <StatChip label="🏆" val={state.achievements} />
            {state.inDungeon && (
              <StatChip label="🏰" val={`${state.inDungeon.room + 1}/${state.inDungeon.total}`} />
            )}
            <StatChip label="📍" val={ZONE_NAMES[char.location] || char.location} />
          </div>
        </div>

        {/* ── EVENT FEED ── */}
        <div style={styles.eventFeed}>
          {events.map((ev, i) => (
            <div key={`${ev.ts}_${i}`} style={{
              ...styles.eventItem,
              borderLeftColor: EVENT_COLORS[ev.type] || EVENT_COLORS.default,
              animation: `slideIn 0.3s ease`,
            }}>
              <span style={{ color: EVENT_COLORS[ev.type] || EVENT_COLORS.default, fontSize: 11 }}>
                {ev.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatChip({ label, val }) {
  return (
    <div style={styles.statChip}>
      <span style={{ fontSize: 10 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#e8c96f', marginLeft: 2 }}>{val}</span>
    </div>
  );
}

// ─── Inline styles (no Tailwind — ใช้ตรงๆ ใน OBS browser source) ───
const styles = {
  root: {
    position:   'fixed',
    top:        0,
    left:       0,
    padding:    '10px',
    display:    'flex',
    flexDirection: 'column',
    gap:        6,
    userSelect: 'none',
    pointerEvents: 'none',
    fontFamily: "'Courier New', monospace",
  },
  card: {
    background:   'rgba(10,10,10,0.82)',
    border:       '1px solid rgba(255,200,80,0.25)',
    borderRadius: 6,
    padding:      '8px 10px',
    minWidth:     220,
    maxWidth:     260,
    backdropFilter: 'blur(4px)',
  },
  headerRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        6,
    marginBottom: 6,
  },
  charName: {
    color:      '#f0d080',
    fontSize:   13,
    fontWeight: 'bold',
    flex:       1,
  },
  charMeta: {
    color:    '#888',
    fontSize: 9,
  },
  level: {
    color:      '#f0d080',
    fontSize:   11,
    background: 'rgba(255,200,80,0.1)',
    border:     '1px solid rgba(255,200,80,0.3)',
    borderRadius: 3,
    padding:    '1px 5px',
  },
  barRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        5,
    marginBottom: 3,
  },
  barLabel: { fontSize: 9, width: 14 },
  barBg: {
    flex:         1,
    height:       5,
    background:   '#222',
    borderRadius: 3,
    overflow:     'hidden',
  },
  barFill: {
    height:       '100%',
    borderRadius: 3,
    transition:   'width 0.5s ease',
  },
  barVal: {
    color:    '#666',
    fontSize: 9,
    width:    55,
    textAlign: 'right',
  },
  statsRow: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:       4,
    marginTop: 5,
  },
  statChip: {
    display:      'flex',
    alignItems:   'center',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 3,
    padding:      '1px 5px',
  },
  eventFeed: {
    display:       'flex',
    flexDirection: 'column',
    gap:           3,
    maxWidth:      260,
  },
  eventItem: {
    background:     'rgba(10,10,10,0.80)',
    border:         '1px solid rgba(255,255,255,0.1)',
    borderLeft:     '3px solid',
    borderRadius:   4,
    padding:        '4px 8px',
    backdropFilter: 'blur(4px)',
  },
};
