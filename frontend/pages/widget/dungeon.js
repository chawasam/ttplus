// widget/dungeon.js — Dungeon Activity OBS Widget สำหรับ Ashenveil
// OBS Size แนะนำ: 360 × 480 (แนวตั้ง)
// URL params: ?preview=1 (ทดสอบ), &theme=dark|light
//
// แสดง:
//   - ผู้เล่นที่กำลัง run dungeon อยู่ (live)
//   - Feed เหตุการณ์ dungeon (enter / boss / clear)
//   - Auto-refresh ทุก 15 วินาที + real-time socket events

import { useEffect, useState, useRef, useCallback } from 'react';
import { createWidgetSocket } from '../../lib/widgetSocket';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const REFRESH_MS   = 15_000;
const MAX_FEED     = 12;

const ROOM_ICONS = {
  combat:   '⚔️',
  trap:     '⚡',
  treasure: '💰',
  rest:     '💚',
  boss:     '💀',
};

const CLASS_EMOJI = {
  warrior:'🗡️', rogue:'🗡️', cleric:'✨', ranger:'🏹', mage:'🔮', bard:'🎵',
  berserker:'🪓', engineer:'⚙️', runesmith:'🔨', assassin:'🥷', hexblade:'🌀',
  phantom:'👻', deathknight:'💀', necromancer:'☠️', gravecaller:'🦴',
  voidwalker:'🌌', rifter:'⚡', soulseer:'👁️', wildguard:'🐾',
  tracker:'🏹', shaman:'🌿',
};

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
}

function ProgressBar({ current, total, color = '#7c4dff' }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

export default function DungeonWidget() {
  const [runs,       setRuns]       = useState([]);
  const [feed,       setFeed]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isPreview,  setIsPreview]  = useState(false);
  const feedIdRef = useRef(0);
  const tokenRef  = useRef('');

  const addFeed = useCallback((item) => {
    const id = ++feedIdRef.current;
    setFeed(prev => [{ id, ...item, ts: Date.now() }, ...prev].slice(0, MAX_FEED));
  }, []);

  const fetchRuns = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res  = await fetch(`${BACKEND}/api/game/dungeon/active-runs`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs || []);
      setLastUpdate(Date.now());
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt') ?? '';
    const preview   = params.get('preview') === '1';
    tokenRef.current = wt;
    setIsPreview(preview);

    if (preview) {
      setLoading(false);
      setRuns([
        { runId: 'r1', charName: 'ArconWolf',   charClass: 'warrior',    dungeonId: 'shadowfell_depths', dungeonName: '🌑 ห้วงเงามืด', dungeonEmoji: '🌑', currentRoom: 8,  totalRooms: 14, roomType: 'boss',   roomName: 'Boss Chamber', startedAt: Date.now() - 1200000 },
        { runId: 'r2', charName: 'SilverMoon',  charClass: 'mage',       dungeonId: 'voidspire_ruins',   dungeonName: '👁️ ซากปรักวอยด์', dungeonEmoji: '👁️', currentRoom: 6,  totalRooms: 10, roomType: 'combat', roomName: 'Void Chamber', startedAt: Date.now() - 480000  },
        { runId: 'r3', charName: 'ThornGuard',  charClass: 'wildguard',  dungeonId: 'darkroot_hollow',   dungeonName: '🌿 ดงรากมืด', dungeonEmoji: '🌿',   currentRoom: 3,  totalRooms: 6,  roomType: 'trap',   roomName: 'Root Maze',    startedAt: Date.now() - 120000  },
      ]);
      setFeed([
        { id: 1, type: 'boss',  charName: 'ArconWolf',  dungeonName: '🌑 ห้วงเงามืด', ts: Date.now() - 90000  },
        { id: 2, type: 'enter', charName: 'SilverMoon', dungeonName: '👁️ ซากปรักวอยด์', ts: Date.now() - 480000 },
        { id: 3, type: 'clear', charName: 'DragonFang', dungeonName: '⚰️ สุสานจม', ts: Date.now() - 900000, gold: 1240, xp: 800 },
      ]);
      return;
    }

    // Fetch immediately + poll every 15s
    fetchRuns();
    const timer = setInterval(fetchRuns, REFRESH_MS);

    // Connect game socket for real-time dungeon events
    const socket = createWidgetSocket(wt, {
      dungeon_event: (data) => {
        if (!data) return;
        addFeed({
          type:       data.type,
          charName:   data.charName,
          charClass:  data.charClass,
          dungeonName: data.dungeonName,
          gold:       data.gold,
          xp:         data.xp,
        });
        // Refresh runs list after any event
        fetchRuns();
      },
    });

    return () => {
      clearInterval(timer);
      socket?.disconnect?.();
    };
  }, [fetchRuns, addFeed]);

  const DUNGEON_COLORS = {
    darkroot_hollow:   '#2d6a4f',
    sunken_crypts:     '#4a3f6b',
    voidspire_ruins:   '#1a2a4a',
    city_ruins:        '#4a3728',
    cursed_marshlands: '#2d4a30',
    void_frontier:     '#1a1a4a',
    shadowfell_depths: '#1a0a2a',
    vorath_citadel:    '#4a0a0a',
  };

  const feedTypeStyle = {
    enter: { icon: '🚪', color: '#60a5fa', label: 'เข้า' },
    boss:  { icon: '💀', color: '#f87171', label: 'Boss!' },
    clear: { icon: '🏆', color: '#fbbf24', label: 'เคลียร์!' },
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'transparent',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding: '12px',
      boxSizing: 'border-box',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 20 }}>🏚️</span>
          <span style={{ color: '#e8eaf6', fontWeight: 800, fontSize: 15, letterSpacing: '0.03em' }}>
            DUNGEON ACTIVITY
          </span>
          {isPreview && (
            <span style={{ fontSize: 10, color: '#7c4dff', background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.4)', padding: '1px 7px', borderRadius: 8 }}>
              PREVIEW
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {runs.length > 0 ? `${runs.length} active` : 'ไม่มี run'}
          {lastUpdate && ` · ${timeAgo(lastUpdate)} ago`}
        </div>
      </div>

      {/* Active Runs */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>กำลังโหลด...</div>
        ) : runs.length === 0 ? (
          <div style={{
            padding: '20px 14px', borderRadius: 12,
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center',
          }}>
            😴 ยังไม่มีใคร run dungeon อยู่
          </div>
        ) : (
          runs.map(run => {
            const accentColor = DUNGEON_COLORS[run.dungeonId] || '#1a1040';
            const roomIcon    = ROOM_ICONS[run.roomType] || '❓';
            const isBoss      = run.roomType === 'boss';
            const elapsed     = run.startedAt ? timeAgo(run.startedAt) : '';

            return (
              <div key={run.runId} style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.65) 0%, ${accentColor}55 100%)`,
                border: `1px solid ${isBoss ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderLeft: `3px solid ${isBoss ? '#ef4444' : '#7c4dff'}`,
                borderRadius: 10, padding: '10px 12px',
                boxShadow: isBoss ? '0 0 12px rgba(239,68,68,0.2)' : 'none',
                animation: isBoss ? 'bossGlow 1.8s ease-in-out infinite alternate' : 'none',
              }}>
                <style>{`
                  @keyframes bossGlow { from{box-shadow:0 0 8px rgba(239,68,68,0.15);} to{box-shadow:0 0 18px rgba(239,68,68,0.35);} }
                `}</style>

                {/* Row 1: Name + dungeon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 14 }}>{CLASS_EMOJI[run.charClass] || '⚔️'}</span>
                    <span style={{ color: '#e8eaf6', fontWeight: 700, fontSize: 13 }}>{run.charName}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>({run.charClass})</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{elapsed}</span>
                </div>

                {/* Row 2: Dungeon name + room */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600 }}>{run.dungeonName}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 8,
                    background: isBoss ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)',
                    color: isBoss ? '#fca5a5' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${isBoss ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    fontWeight: isBoss ? 700 : 400,
                  }}>
                    {roomIcon} {run.roomName}
                  </span>
                </div>

                {/* Progress bar: rooms */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProgressBar current={run.currentRoom} total={run.totalRooms} color={isBoss ? '#ef4444' : '#7c4dff'} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, whiteSpace: 'nowrap' }}>
                    {run.currentRoom}/{run.totalRooms}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Divider */}
      {feed.length > 0 && (
        <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
      )}

      {/* Event Feed */}
      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {feed.map(ev => {
          const ft = feedTypeStyle[ev.type] || { icon: '📌', color: '#94a3b8', label: ev.type };
          return (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 7,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 13 }}>{ft.icon}</span>
              <span style={{ color: ft.color, fontWeight: 700, fontSize: 11 }}>{ft.label}</span>
              <span style={{ color: '#e8eaf6', fontSize: 11 }}>{ev.charName}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.dungeonName}
                {ev.type === 'clear' && ev.gold ? ` · 💰${ev.gold} ✨${ev.xp}` : ''}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, flexShrink: 0 }}>
                {timeAgo(ev.ts)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'right', marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>
        ttsam.app
      </div>
    </div>
  );
}
