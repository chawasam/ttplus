// pages/admin.js — Ashenveil Admin Dashboard
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from '../lib/api';
import Head from 'next/head';
import toast, { Toaster } from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const REFRESH_SEC = 30;
const SOURCE_COLOR = {
  combat_drop:    '#f59e0b',
  explore:        '#34d399',
  dungeon_clear:  '#818cf8',
  sell_item:      '#94a3b8',
  buy_item:       '#f87171',
  default:        '#6b7280',
};
const RACE_EMOJI  = { HUMAN:'👤', ELVEN:'🧝', DWARF:'⛏️', SHADE:'🌑', REVENANT:'💀', VOIDBORN:'🌀', BEASTKIN:'🐾' };
const CLASS_EMOJI = { WARRIOR:'⚔️', ROGUE:'🗡️', CLERIC:'✨', RANGER:'🏹', MAGE:'🪄', BARD:'🎵', BERSERKER:'🪓',
  ENGINEER:'⚙️', RUNESMITH:'🔨', ASSASSIN:'🌙', HEXBLADE:'🔮', PHANTOM:'👻', DEATHKNIGHT:'🗡️',
  NECROMANCER:'💀', GRAVECALLER:'👻', VOIDWALKER:'🌀', RIFTER:'⚡', SOULSEER:'👁️',
  WILDGUARD:'🛡️', TRACKER:'🐾', SHAMAN:'🌿' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n) => (n ?? 0).toLocaleString();
const pct  = (v, max) => max ? Math.min(100, Math.round((v / max) * 100)) : 0;
function timeAgo(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function srcColor(src) { return SOURCE_COLOR[src] || SOURCE_COLOR.default; }

// ─── Shared style ─────────────────────────────────────────────────────────────
const card  = { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '20px 24px' };
const badge = (col) => ({ background: col + '22', color: col, border: `1px solid ${col}44`,
  borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, display: 'inline-block' });

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color = '#f59e0b', onClick }) {
  return (
    <div onClick={onClick} style={{ ...card, borderColor: color + '44', cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .2s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = color + '44')}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'#6b7280', fontSize:12, marginBottom:4 }}>{label}</div>
          <div style={{ color, fontSize:28, fontWeight:800, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ color:'#4b5563', fontSize:11, marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:26, opacity:.5 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────
function XpBar({ xp, xpToNext, color = '#f59e0b' }) {
  const p = pct(xp, xpToNext);
  return (
    <div style={{ width:'100%', height:4, background:'#1f2937', borderRadius:2, overflow:'hidden' }}>
      <div style={{ width:`${p}%`, height:'100%', background:color, borderRadius:2, transition:'width .3s' }} />
    </div>
  );
}

// ─── SeverityBadge ────────────────────────────────────────────────────────────
function SeverityBadge({ reason }) {
  const isHourly = reason?.startsWith('[HOURLY]');
  const isManual = reason?.startsWith('[MANUAL]');
  if (isManual) return <span style={badge('#818cf8')}>MANUAL</span>;
  if (isHourly) return <span style={badge('#f87171')}>HOURLY</span>;
  return <span style={badge('#fb923c')}>SINGLE</span>;
}

// ─── ResolveModal ─────────────────────────────────────────────────────────────
function ResolveModal({ flag, onClose, onResolved }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await api.post(`/api/game/audit/flags/${flag.id}/resolve`, { note });
      toast.success('Resolved');
      onResolved(flag.id);
      onClose();
    } catch { toast.error('ล้มเหลว'); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width:480, border:'1px solid #f87171' }}>
        <h3 style={{ color:'#f87171', marginBottom:12 }}>🚩 Resolve Flag</h3>
        <div style={{ color:'#9ca3af', fontSize:13, marginBottom:4 }}>Player: <span style={{ color:'#f59e0b' }}>{flag.tiktokId}</span></div>
        <div style={{ color:'#6b7280', fontSize:12, marginBottom:16 }}>{flag.reason}</div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="หมายเหตุ (เช่น: ตรวจสอบแล้ว — ไม่ผิดปกติ)" rows={3}
          style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
            padding:'10px 12px', fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
        <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #374151', color:'#6b7280', background:'transparent', cursor:'pointer' }}>
            ยกเลิก
          </button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#f87171', color:'#0a0a0a', fontWeight:700, cursor:'pointer' }}>
            {busy ? '...' : '✓ Resolve'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PlayerModal ──────────────────────────────────────────────────────────────
function PlayerModal({ player, onClose, onFlag }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flagNote, setFlagNote] = useState('');
  const [showFlag, setShowFlag] = useState(false);

  useEffect(() => {
    api.get(`/api/game/audit/player/${player.uid}?limit=30`)
      .then(r => setHistory(r.data))
      .catch(() => setHistory({ history: [], totalXp: 0, totalGold: 0, levelUps: 0 }))
      .finally(() => setLoading(false));
  }, [player.uid]);

  async function submitFlag() {
    try {
      await api.post(`/api/game/audit/players/${player.uid}/flag`, { reason: flagNote || 'Manual review' });
      toast.success(`Flagged ${player.tiktokId}`);
      setShowFlag(false);
      onFlag?.();
    } catch { toast.error('ล้มเหลว'); }
  }

  const e = RACE_EMOJI[player.race] || '❓';
  const c = CLASS_EMOJI[player.charClass] || '⚔️';

  return (
    <div style={{ position:'fixed', inset:0, background:'#000b', zIndex:100, display:'flex', alignItems:'flex-start',
      justifyContent:'flex-end', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width:480, maxHeight:'90vh', overflowY:'auto', border:'1px solid #f59e0b' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ color:'#f59e0b', fontSize:20, fontWeight:700 }}>{e} {player.name}</div>
            <div style={{ color:'#6b7280', fontSize:13 }}>@{player.tiktokId}</div>
          </div>
          <button onClick={onClose} style={{ color:'#4b5563', background:'none', border:'none', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { l:'Level', v: player.level },
            { l:'Gold', v: fmt(player.gold) + ' 🪙' },
            { l:'Race / Class', v: `${player.race} ${c}${player.charClass}` },
            { l:'Location', v: player.location },
            { l:'Monsters Killed', v: fmt(player.monstersKilled) },
            { l:'Deaths', v: player.deathCount },
            { l:'Explores', v: fmt(player.explorationCount) },
            { l:'HP', v: `${fmt(player.hp)} / ${fmt(player.hpMax)}` },
          ].map(({ l, v }) => (
            <div key={l} style={{ background:'#1f2937', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ color:'#6b7280', fontSize:10, marginBottom:2 }}>{l}</div>
              <div style={{ color:'#e5e7eb', fontSize:13, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7280', marginBottom:4 }}>
            <span>XP Progress</span><span>{fmt(player.xp)} / {fmt(player.xpToNext)}</span>
          </div>
          <XpBar xp={player.xp} xpToNext={player.xpToNext} />
        </div>

        {/* History */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:10 }}>REWARD HISTORY (30 รายการล่าสุด)</div>
          {loading ? <div style={{ color:'#4b5563', fontSize:13 }}>กำลังโหลด...</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:240, overflowY:'auto' }}>
              {history.history.length === 0 && <div style={{ color:'#4b5563', fontSize:13 }}>ไม่มีข้อมูล</div>}
              {history.history.map(row => (
                <div key={row.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 10px',
                  background: row.suspicious ? '#7f1d1d44' : '#1f2937', borderRadius:6,
                  border: row.suspicious ? '1px solid #f8717144' : '1px solid transparent' }}>
                  <span style={{ ...badge(srcColor(row.source)), whiteSpace:'nowrap' }}>{row.source}</span>
                  <span style={{ color:'#34d399', fontSize:12, minWidth:60 }}>+{fmt(row.xp)} XP</span>
                  <span style={{ color:'#f59e0b', fontSize:12, minWidth:60 }}>+{fmt(row.gold)}🪙</span>
                  {row.levelUp && <span style={{ color:'#818cf8', fontSize:11 }}>LV{row.levelUp}!</span>}
                  <span style={{ color:'#374151', fontSize:11, marginLeft:'auto' }}>{timeAgo(row.ts)}</span>
                </div>
              ))}
            </div>
          )}
          {history && (
            <div style={{ display:'flex', gap:16, marginTop:10 }}>
              <span style={{ color:'#6b7280', fontSize:11 }}>Total XP: <span style={{ color:'#34d399' }}>{fmt(history.totalXp)}</span></span>
              <span style={{ color:'#6b7280', fontSize:11 }}>Total Gold: <span style={{ color:'#f59e0b' }}>{fmt(history.totalGold)}</span></span>
              <span style={{ color:'#6b7280', fontSize:11 }}>Level-ups: <span style={{ color:'#818cf8' }}>{history.levelUps}</span></span>
            </div>
          )}
        </div>

        {/* Flag */}
        <div style={{ borderTop:'1px solid #1f2937', paddingTop:14 }}>
          {!showFlag ? (
            <button onClick={() => setShowFlag(true)}
              style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #f8717144', color:'#f87171',
                background:'transparent', cursor:'pointer', fontSize:13 }}>
              🚩 Flag player manually
            </button>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <input value={flagNote} onChange={e => setFlagNote(e.target.value)} placeholder="เหตุผล..."
                style={{ flex:1, background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
                  padding:'8px 12px', fontSize:13 }} />
              <button onClick={submitFlag}
                style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#f87171',
                  color:'#0a0a0a', fontWeight:700, cursor:'pointer' }}>Flag</button>
              <button onClick={() => setShowFlag(false)}
                style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #374151', color:'#6b7280',
                  background:'transparent', cursor:'pointer' }}>✕</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ summary, setTab }) {
  if (!summary) return <div style={{ color:'#4b5563', padding:40, textAlign:'center' }}>กำลังโหลด...</div>;
  const { unresolvedFlags, rewardsLast24h, topPlayersByXp } = summary;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:24 }}>
        <StatCard label="Unresolved Flags" value={unresolvedFlags} icon="🚩"
          color={unresolvedFlags > 0 ? '#f87171' : '#34d399'}
          sub={unresolvedFlags > 0 ? 'ต้องตรวจสอบ' : 'ทุกอย่างปกติ'}
          onClick={() => setTab('flags')} />
        <StatCard label="Rewards (24h)" value={fmt(rewardsLast24h)} icon="📊" color="#818cf8"
          sub="combat + explore events" />
        <StatCard label="Active Players (24h)" value={topPlayersByXp?.length || 0} icon="👥" color="#34d399"
          sub="มีกิจกรรมใน 24h" />
      </div>

      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:13, fontWeight:700, marginBottom:16 }}>
          🏆 TOP PLAYERS (24h by XP)
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #1f2937' }}>
              {['#', 'UID', 'XP ได้รับ', 'Gold ได้รับ', 'Combat', 'Level-ups'].map(h => (
                <th key={h} style={{ color:'#4b5563', fontSize:11, fontWeight:600, textAlign:'left',
                  padding:'6px 12px', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPlayersByXp?.slice(0, 15).map((p, i) => (
              <tr key={p.uid} style={{ borderBottom:'1px solid #111827' }}
                onMouseEnter={e => e.currentTarget.style.background='#1f2937'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'8px 12px', color: i < 3 ? '#f59e0b' : '#4b5563', fontWeight:700 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                </td>
                <td style={{ padding:'8px 12px', color:'#9ca3af', fontSize:12, fontFamily:'monospace' }}>
                  {p.uid.slice(0, 12)}...
                </td>
                <td style={{ padding:'8px 12px', color:'#34d399', fontWeight:600 }}>{fmt(p.xp)}</td>
                <td style={{ padding:'8px 12px', color:'#f59e0b' }}>{fmt(p.gold)}</td>
                <td style={{ padding:'8px 12px', color:'#9ca3af' }}>{p.combats}</td>
                <td style={{ padding:'8px 12px', color:'#818cf8' }}>{p.levelUps || 0}</td>
              </tr>
            ))}
            {(!topPlayersByXp || topPlayersByXp.length === 0) && (
              <tr><td colSpan={6} style={{ padding:24, color:'#4b5563', textAlign:'center' }}>ไม่มีข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Flags ───────────────────────────────────────────────────────────────
function FlagsTab({ flags, setFlags }) {
  const [filter, setFilter]     = useState('unresolved');
  const [resolving, setResolving] = useState(null);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/game/audit/flags?resolved=${filter === 'resolved'}&limit=100`);
      setFlags(r.data.flags || []);
    } catch { toast.error('โหลด flags ไม่ได้'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = flags.filter(f =>
    !search || f.tiktokId?.toLowerCase().includes(search.toLowerCase()) ||
    f.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
        {['unresolved', 'resolved'].map(v => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${filter===v ? '#f87171' : '#374151'}`,
              background: filter===v ? '#f8717122' : 'transparent', color: filter===v ? '#f87171' : '#6b7280',
              cursor:'pointer', fontSize:13, textTransform:'capitalize' }}>
            {v === 'unresolved' ? '🔴' : '✅'} {v}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา TikTok ID / เหตุผล..."
          style={{ flex:1, background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
            padding:'7px 12px', fontSize:13 }} />
        <button onClick={load} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #374151',
          color:'#9ca3af', background:'transparent', cursor:'pointer' }}>↻ Refresh</button>
      </div>

      {/* Table */}
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading && <div style={{ padding:24, color:'#4b5563', textAlign:'center' }}>กำลังโหลด...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:32, color:'#4b5563', textAlign:'center' }}>
            {filter === 'unresolved' ? '✅ ไม่มี flag ที่รอดำเนินการ' : 'ไม่มีข้อมูล'}
          </div>
        )}
        {!loading && filtered.map((f, i) => (
          <div key={f.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 20px',
            borderBottom: i < filtered.length-1 ? '1px solid #111827' : 'none',
            background: f.resolved ? 'transparent' : '#7f1d1d11' }}>
            <SeverityBadge reason={f.reason} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                <span style={{ color:'#f59e0b', fontWeight:600 }}>@{f.tiktokId}</span>
                <span style={{ color:'#374151', fontSize:11, fontFamily:'monospace' }}>{f.uid?.slice(0,10)}...</span>
              </div>
              <div style={{ color:'#9ca3af', fontSize:13 }}>{f.reason}</div>
              {f.data && Object.keys(f.data).length > 0 && (
                <div style={{ color:'#4b5563', fontSize:11, marginTop:4, fontFamily:'monospace' }}>
                  {JSON.stringify(f.data).slice(0, 120)}
                </div>
              )}
              {f.note && <div style={{ color:'#818cf8', fontSize:12, marginTop:4 }}>Note: {f.note}</div>}
            </div>
            <div style={{ textAlign:'right', minWidth:90 }}>
              <div style={{ color:'#374151', fontSize:11 }}>{timeAgo(f.ts)}</div>
              {!f.resolved && (
                <button onClick={() => setResolving(f)}
                  style={{ marginTop:6, padding:'4px 10px', borderRadius:6, border:'1px solid #374151',
                    color:'#6b7280', background:'transparent', cursor:'pointer', fontSize:12 }}>
                  Resolve
                </button>
              )}
              {f.resolved && <div style={{ ...badge('#34d399'), marginTop:6 }}>Resolved</div>}
            </div>
          </div>
        ))}
      </div>

      {resolving && (
        <ResolveModal flag={resolving} onClose={() => setResolving(null)}
          onResolved={(id) => setFlags(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f))} />
      )}
    </div>
  );
}

// ─── Tab: Players ─────────────────────────────────────────────────────────────
function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [sort, setSort]       = useState('level');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/game/audit/players?sort=${sort}&limit=200`);
      setPlayers(r.data.players || []);
    } catch { toast.error('โหลด players ไม่ได้'); }
    finally { setLoading(false); }
  }, [sort]);

  useEffect(() => { load(); }, [load]);

  const filtered = players.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.tiktokId?.toLowerCase().includes(search.toLowerCase())
  );

  const SORTS = [
    { key:'level', label:'Level' },
    { key:'gold', label:'Gold' },
    { key:'monstersKilled', label:'Kills' },
    { key:'xp', label:'XP' },
    { key:'explorationCount', label:'Explore' },
  ];

  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / TikTok..."
          style={{ flex:1, minWidth:200, background:'#1f2937', border:'1px solid #374151', borderRadius:8,
            color:'#e5e7eb', padding:'7px 12px', fontSize:13 }} />
        <div style={{ display:'flex', gap:4 }}>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${sort===s.key ? '#f59e0b' : '#374151'}`,
                background: sort===s.key ? '#f59e0b22' : 'transparent', color: sort===s.key ? '#f59e0b' : '#6b7280',
                cursor:'pointer', fontSize:12 }}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={load} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #374151',
          color:'#9ca3af', background:'transparent', cursor:'pointer' }}>↻</button>
      </div>

      <div style={{ color:'#4b5563', fontSize:12, marginBottom:10 }}>
        {filtered.length} ผู้เล่น
      </div>

      {loading ? <div style={{ color:'#4b5563', padding:40, textAlign:'center' }}>กำลังโหลด...</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
          {filtered.map(p => {
            const re = RACE_EMOJI[p.race] || '❓';
            const ce = CLASS_EMOJI[p.charClass] || '⚔️';
            return (
              <div key={p.uid} onClick={() => setSelected(p)}
                style={{ ...card, cursor:'pointer', transition:'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#f59e0b55'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#1f2937'}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ color:'#f59e0b', fontWeight:700, fontSize:15 }}>{re} {p.name || '—'}</div>
                    <div style={{ color:'#6b7280', fontSize:12 }}>@{p.tiktokId}</div>
                  </div>
                  <div style={{ ...badge('#818cf8') }}>Lv.{p.level}</div>
                </div>
                <div style={{ fontSize:12, color:'#9ca3af', marginBottom:8 }}>
                  {p.race} · {ce} {p.charClass} · {p.location}
                </div>
                <XpBar xp={p.xp} xpToNext={p.xpToNext} />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:12 }}>
                  <span style={{ color:'#f59e0b' }}>{fmt(p.gold)} 🪙</span>
                  <span style={{ color:'#9ca3af' }}>⚔️{fmt(p.monstersKilled)} 💀{p.deathCount}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ color:'#4b5563', textAlign:'center', padding:40, gridColumn:'1/-1' }}>
              ไม่พบผู้เล่น
            </div>
          )}
        </div>
      )}

      {selected && (
        <PlayerModal player={selected} onClose={() => setSelected(null)}
          onFlag={() => load()} />
      )}
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────
function ActivityTab() {
  const [activity, setActivity]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [autoRefresh, setAuto]    = useState(true);
  const [filterSrc, setFilterSrc] = useState('all');
  const [countdown, setCountdown] = useState(REFRESH_SEC);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/game/audit/activity?limit=200');
      setActivity(r.data.activity || []);
    } catch { toast.error('โหลด activity ไม่ได้'); }
    finally { setLoading(false); setCountdown(REFRESH_SEC); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(); return REFRESH_SEC; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, load]);

  const sources = ['all', ...new Set(activity.map(a => a.source))];
  const filtered = activity.filter(a => filterSrc === 'all' || a.source === filterSrc);
  const suspicious = activity.filter(a => a.suspicious).length;

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {sources.slice(0, 6).map(s => (
            <button key={s} onClick={() => setFilterSrc(s)}
              style={{ padding:'5px 12px', borderRadius:8,
                border:`1px solid ${filterSrc===s ? srcColor(s) : '#374151'}`,
                background: filterSrc===s ? srcColor(s)+'22' : 'transparent',
                color: filterSrc===s ? srcColor(s) : '#6b7280', cursor:'pointer', fontSize:12 }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          {suspicious > 0 && (
            <span style={badge('#f87171')}>🚨 {suspicious} suspicious</span>
          )}
          <button onClick={() => setAuto(v => !v)}
            style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${autoRefresh ? '#34d399' : '#374151'}`,
              color: autoRefresh ? '#34d399' : '#6b7280', background:'transparent', cursor:'pointer', fontSize:12 }}>
            {autoRefresh ? `⏱ Auto (${countdown}s)` : '⏸ Paused'}
          </button>
          <button onClick={load}
            style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #374151',
              color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:12 }}>
            ↻ Now
          </button>
        </div>
      </div>

      {/* Feed */}
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading && <div style={{ padding:24, textAlign:'center', color:'#4b5563' }}>กำลังโหลด...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:'#4b5563' }}>ไม่มีข้อมูล</div>
        )}
        <div style={{ maxHeight:600, overflowY:'auto' }}>
          {filtered.map((a, i) => (
            <div key={a.id} style={{
              display:'flex', gap:12, alignItems:'center', padding:'10px 20px',
              borderBottom: i < filtered.length-1 ? '1px solid #111827' : 'none',
              background: a.suspicious ? '#7f1d1d22' : 'transparent',
            }}>
              {a.suspicious && <span title="Suspicious" style={{ color:'#f87171', fontSize:16 }}>🚨</span>}
              <span style={{ ...badge(srcColor(a.source)), minWidth:90, textAlign:'center' }}>{a.source}</span>
              <span style={{ color:'#6b7280', fontSize:11, fontFamily:'monospace', minWidth:100 }}>
                {a.uid?.slice(0, 10)}...
              </span>
              <span style={{ color:'#34d399', fontSize:13, minWidth:80 }}>+{fmt(a.xp)} XP</span>
              <span style={{ color:'#f59e0b', fontSize:13, minWidth:80 }}>+{fmt(a.gold)} 🪙</span>
              {a.levelUp && <span style={{ ...badge('#818cf8') }}>LV{a.levelUp}!</span>}
              {a.items?.length > 0 && (
                <span style={{ color:'#9ca3af', fontSize:11 }}>📦 {a.items.join(', ').slice(0, 30)}</span>
              )}
              <span style={{ color:'#374151', fontSize:11, marginLeft:'auto', whiteSpace:'nowrap' }}>
                {timeAgo(a.ts)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ─── ECONOMY DATA (embedded from game files) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const XP_FORMULA = (lv) => Math.floor(200 * Math.pow(lv, 1.9));

const ZONE_MONSTERS = [
  { zone:'town_outskirts', monsters:[{xp:8,g:[2,6]},{xp:15,g:[5,12]}], label:'🌾 ชานเมือง', minLv:1 },
  { zone:'forest_path',    monsters:[{xp:22,g:[8,18]},{xp:30,g:[10,22]},{xp:28,g:[8,16]},{xp:55,g:[20,40]}], label:'🌲 ทางป่า', minLv:3 },
  { zone:'dark_cave',      monsters:[{xp:20,g:[6,14]},{xp:65,g:[25,50]},{xp:70,g:[20,45]}], label:'🕳️ ถ้ำมืด', minLv:5 },
  { zone:'city_ruins',     monsters:[{xp:90,g:[35,65]},{xp:75,g:[25,45]},{xp:100,g:[40,70]},{xp:120,g:[50,90]},{xp:180,g:[80,130]}], label:'🏚️ ซากเมือง', minLv:10 },
  { zone:'cursed_marshlands', monsters:[{xp:160,g:[60,100]},{xp:190,g:[70,120]},{xp:210,g:[80,140]},{xp:280,g:[100,180]}], label:'🌿 หนองสาปแช่ง', minLv:18 },
  { zone:'void_frontier',  monsters:[{xp:320,g:[120,200]},{xp:400,g:[150,250]},{xp:550,g:[200,350]}], label:'🌀 ชายขอบ Void', minLv:28 },
  { zone:'shadowfell_depths', monsters:[{xp:600,g:[220,380]},{xp:580,g:[200,340]},{xp:700,g:[250,420]},{xp:630,g:[210,360]}], label:'🌑 ห้วงเงา', minLv:38 },
  { zone:'vorath_citadel', monsters:[{xp:900,g:[350,600]},{xp:1100,g:[400,700]},{xp:1400,g:[500,900]}], label:'🏰 Vorath', minLv:52 },
];

const BOSS_DATA = [
  { name:'Goblin King Grak',    lv:6,  xp:350,  gold:[80,150],   zone:'town_outskirts' },
  { name:'Elder Treant Monarch',lv:10, xp:700,  gold:[150,280],  zone:'forest_path' },
  { name:'Crystal Troll Lord',  lv:14, xp:1000, gold:[200,400],  zone:'dark_cave' },
  { name:'Iron Golem Prime',    lv:20, xp:1500, gold:[350,600],  zone:'city_ruins' },
  { name:'Hydra of the Deep',   lv:28, xp:2200, gold:[500,900],  zone:'cursed_marshlands' },
  { name:"Void Herald Azh'kal", lv:38, xp:3500, gold:[800,1400], zone:'void_frontier' },
  { name:'Shadow Archon Vael',  lv:48, xp:5500, gold:[1200,2000],zone:'shadowfell_depths' },
  { name:'Avatar of Vorath',    lv:60, xp:9999, gold:[2000,4000],zone:'vorath_citadel' },
];

const QUEST_XP_DAILY = 280;   // avg daily quest XP (explore+kill+rest quests)
const QUEST_GOLD_DAILY = 950; // avg daily quest gold
const DUNGEON_XP_DAILY = 420; // avg 2 dungeon runs × 3 rooms
const DUNGEON_GOLD_DAILY = 320;
const LOGIN_BONUS_XP = 25;    // per day avg
const LOGIN_BONUS_GOLD = 400;

// BATTLES_PER_SESSION: 12 battles/30min session, 2 sessions/day = 24 battles
const BATTLES_PER_DAY = 24;

// ─── Tab: Economy Calculator ──────────────────────────────────────────────────
function EconomyTab() {
  const [targetLv, setTargetLv] = React.useState(50);
  const [sessionsPerDay, setSessionsPerDay] = React.useState(2);
  const [zone, setZone] = React.useState(4); // city_ruins index

  // Compute XP curve total
  const lvCurve = React.useMemo(() => {
    const rows = [];
    let cumulative = 0;
    for (let lv = 1; lv <= 99; lv++) {
      const needed = XP_FORMULA(lv);
      cumulative += needed;
      rows.push({ lv, needed, cumulative });
    }
    return rows;
  }, []);

  const totalXpTo99 = lvCurve[98].cumulative;

  // Daily XP estimate
  const zoneData = ZONE_MONSTERS[zone] || ZONE_MONSTERS[3];
  const avgMonsterXp = zoneData.monsters.reduce((s,m) => s + m.xp, 0) / zoneData.monsters.length;
  const avgMonsterGold = zoneData.monsters.reduce((s,m) => s + (m.g[0]+m.g[1])/2, 0) / zoneData.monsters.length;
  const battlesPerDay = 12 * sessionsPerDay;
  const combatXpPerDay = battlesPerDay * avgMonsterXp;
  const combatGoldPerDay = battlesPerDay * avgMonsterGold;
  const totalXpPerDay = combatXpPerDay + QUEST_XP_DAILY + DUNGEON_XP_DAILY + LOGIN_BONUS_XP;
  const totalGoldPerDay = combatGoldPerDay + QUEST_GOLD_DAILY + DUNGEON_GOLD_DAILY + LOGIN_BONUS_GOLD;

  const totalXpForTarget = lvCurve[targetLv - 1]?.cumulative || 0;
  const daysToTarget = Math.ceil(totalXpForTarget / totalXpPerDay);
  const daysTo99 = Math.ceil(totalXpTo99 / totalXpPerDay);
  const years = (daysTo99 / 365).toFixed(1);

  // Milestone levels
  const milestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];

  // Gold economy by zone
  const goldByZone = ZONE_MONSTERS.map(z => {
    const avgG = z.monsters.reduce((s,m) => s + (m.g[0]+m.g[1])/2, 0) / z.monsters.length;
    const hph = avgG * 12 * 2; // 2 sessions/day is displayed as per hour
    return { ...z, avgGold: Math.round(avgG), goldPerHour: Math.round(hph * 2) };
  });

  const barMax = lvCurve[98].needed;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <h2 style={{ color:'#f59e0b', fontWeight:800, fontSize:20, margin:0 }}>📈 Economy Calculator</h2>
        <span style={{ color:'#4b5563', fontSize:12 }}>อ้างอิงจาก game files จริง • XP = 200 × Lv^1.9</span>
      </div>

      {/* Controls */}
      <div style={{ ...card, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <div>
          <div style={{ color:'#9ca3af', fontSize:11, marginBottom:6 }}>เป้าหมาย Level</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="range" min={1} max={99} value={targetLv} onChange={e=>setTargetLv(+e.target.value)}
              style={{ flex:1, accentColor:'#f59e0b' }} />
            <span style={{ color:'#f59e0b', fontWeight:700, minWidth:32, textAlign:'right' }}>Lv.{targetLv}</span>
          </div>
        </div>
        <div>
          <div style={{ color:'#9ca3af', fontSize:11, marginBottom:6 }}>Session ต่อวัน</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="range" min={1} max={6} value={sessionsPerDay} onChange={e=>setSessionsPerDay(+e.target.value)}
              style={{ flex:1, accentColor:'#818cf8' }} />
            <span style={{ color:'#818cf8', fontWeight:700, minWidth:60, textAlign:'right' }}>{sessionsPerDay}×30m</span>
          </div>
        </div>
        <div>
          <div style={{ color:'#9ca3af', fontSize:11, marginBottom:6 }}>Zone ที่ฟาร์ม</div>
          <select value={zone} onChange={e=>setZone(+e.target.value)}
            style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8,
              color:'#e5e7eb', padding:'8px 12px', fontSize:13 }}>
            {ZONE_MONSTERS.map((z,i) => <option key={z.zone} value={i}>{z.label} (Lv.{z.minLv}+)</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:`ถึง Lv.${targetLv} ใน`, value: daysToTarget >= 365 ? `${(daysToTarget/365).toFixed(1)} ปี` : `${daysToTarget} วัน`, color:'#f59e0b', icon:'🎯' },
          { label:'ถึง Lv.99 ใน', value:`${years} ปี`, color: Math.abs(+years - 3) < 0.5 ? '#34d399' : +years < 2 ? '#f87171' : '#fb923c', icon:'🏆', sub: daysTo99 + ' วัน' },
          { label:'XP ต่อวัน (avg)', value: Math.round(totalXpPerDay).toLocaleString(), color:'#34d399', icon:'⚡', sub:'combat+quest+dungeon' },
          { label:'Gold ต่อวัน (avg)', value: Math.round(totalGoldPerDay).toLocaleString() + ' 🪙', color:'#f59e0b', icon:'💰', sub: zone >= 0 ? zoneData.label : '' },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* XP breakdown */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📊 XP ต่อวัน — แหล่งที่มา</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { label:`⚔️ Combat (${battlesPerDay} battles × ${Math.round(avgMonsterXp)} xp)`, xp: Math.round(combatXpPerDay), pct: combatXpPerDay/totalXpPerDay, color:'#f59e0b' },
            { label:'📋 Daily Quests', xp: QUEST_XP_DAILY, pct: QUEST_XP_DAILY/totalXpPerDay, color:'#818cf8' },
            { label:'🏰 Dungeon (2 runs)', xp: DUNGEON_XP_DAILY, pct: DUNGEON_XP_DAILY/totalXpPerDay, color:'#34d399' },
            { label:'🎁 Login Bonus', xp: LOGIN_BONUS_XP, pct: LOGIN_BONUS_XP/totalXpPerDay, color:'#fb923c' },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ color:'#9ca3af', fontSize:12, minWidth:280 }}>{row.label}</div>
              <div style={{ flex:1, height:12, background:'#1f2937', borderRadius:6, overflow:'hidden' }}>
                <div style={{ width:`${(row.pct*100).toFixed(1)}%`, height:'100%', background:row.color, borderRadius:6 }} />
              </div>
              <div style={{ color:row.color, fontSize:12, fontWeight:700, minWidth:70, textAlign:'right' }}>{row.xp.toLocaleString()} xp</div>
              <div style={{ color:'#4b5563', fontSize:11, minWidth:40 }}>{(row.pct*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone table */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>🗺️ Milestone Timeline (ฟาร์ม {sessionsPerDay} session/วัน ที่ {zoneData.label})</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
          {milestones.map(lv => {
            const xpNeeded = lvCurve[lv-1]?.cumulative || 0;
            const days = Math.ceil(xpNeeded / totalXpPerDay);
            const months = (days/30).toFixed(1);
            const isTarget = lv === Math.min(...milestones.filter(m => m >= targetLv));
            return (
              <div key={lv} style={{ background: isTarget ? '#f59e0b22' : '#1f2937', borderRadius:10, padding:'12px',
                border: isTarget ? '1px solid #f59e0b44' : '1px solid #374151', textAlign:'center' }}>
                <div style={{ color: isTarget ? '#f59e0b' : '#6b7280', fontSize:11, marginBottom:4 }}>Lv.{lv}</div>
                <div style={{ color:'#e5e7eb', fontSize:14, fontWeight:700 }}>{days >= 365 ? `${(days/365).toFixed(1)}ปี` : `${days}วัน`}</div>
                <div style={{ color:'#4b5563', fontSize:10, marginTop:2 }}>{months} เดือน</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* XP per level chart (bar) */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📉 XP ที่ต้องการต่อ Level (สเกล exponential)</div>
        <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:80, overflowX:'auto' }}>
          {lvCurve.map((r,i) => {
            const h = Math.max(2, (r.needed / barMax) * 80);
            const isTarget = r.lv === targetLv;
            return (
              <div key={r.lv} title={`Lv.${r.lv}: ${r.needed.toLocaleString()} XP`}
                style={{ flex:'0 0 8px', height:h, background: isTarget ? '#f59e0b' : i < 33 ? '#34d399' : i < 66 ? '#818cf8' : '#f87171',
                  borderRadius:'2px 2px 0 0', cursor:'pointer', transition:'opacity .1s', opacity:.85 }}
                onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=.85}
              />
            );
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', color:'#4b5563', fontSize:10, marginTop:4 }}>
          <span>Lv.1</span><span>Lv.33</span><span>Lv.66</span><span>Lv.99</span>
        </div>
      </div>

      {/* Gold by zone */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>💰 Gold Economy ต่อ Zone (24 battles/วัน = 2 sessions × 12 battles)</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {goldByZone.map((z,i) => (
            <div key={z.zone} style={{ background:'#1f2937', borderRadius:10, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ color:'#e5e7eb', fontSize:13, fontWeight:600 }}>{z.label}</div>
                <div style={{ color:'#6b7280', fontSize:11 }}>avg {z.avgGold} gold/kill • Lv.{z.minLv}+</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:'#f59e0b', fontWeight:700, fontSize:16 }}>{z.goldPerHour.toLocaleString()}</div>
                <div style={{ color:'#4b5563', fontSize:10 }}>gold/วัน</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:'10px 14px', background:'#1f2937', borderRadius:8, fontSize:12, color:'#6b7280' }}>
          ⚠️ <span style={{ color:'#fb923c' }}>ความเสี่ยงเงินเฟ้อ:</span> ผู้เล่น Lv.50+ ใน void_frontier ได้ ~{Math.round(ZONE_MONSTERS[5].monsters.reduce((s,m)=>(s+(m.g[0]+m.g[1])/2),0)/ZONE_MONSTERS[5].monsters.length * 24).toLocaleString()} gold/วัน
          {' '}— Shop items ควรมีราคาสูงกว่านี้สำหรับ end-game
        </div>
      </div>

      {/* Boss rewards */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>👑 Boss Rewards (24h cooldown)</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {BOSS_DATA.map(b => (
            <div key={b.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'#1f2937', borderRadius:8 }}>
              <span style={{ color:'#f87171', fontSize:12, minWidth:180 }}>{b.name}</span>
              <span style={{ color:'#6b7280', fontSize:11, minWidth:60 }}>Lv.{b.lv}</span>
              <span style={{ color:'#34d399', fontSize:12, minWidth:80 }}>+{b.xp.toLocaleString()} XP</span>
              <span style={{ color:'#f59e0b', fontSize:12, minWidth:100 }}>+{b.gold[0]}-{b.gold[1]} Gold</span>
              <span style={{ color:'#4b5563', fontSize:11 }}>{b.zone}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: RP Monitor ──────────────────────────────────────────────────────────
function RPMonitorTab() {
  const [players, setPlayers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('rp');
  const [flagging, setFlagging] = React.useState(null);
  const [flagNote, setFlagNote] = React.useState('');

  React.useEffect(() => {
    api.get('/api/game/audit/players?limit=200&sortBy=rp')
      .then(r => setPlayers(r.data?.players || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = players
    .filter(p => !search || p.tiktokId?.toLowerCase().includes(search.toLowerCase()) || p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy === 'rp') return (b.rp||0) - (a.rp||0);
      if (sortBy === 'gold') return (b.gold||0) - (a.gold||0);
      if (sortBy === 'level') return (b.level||0) - (a.level||0);
      return 0;
    });

  // RP anomaly detection: RP > 2× expected from gifts
  const flagRisk = (p) => {
    if ((p.rp || 0) > 500) return { level:'high', msg:'RP สูงผิดปกติ (>500)' };
    if ((p.rp || 0) > 200 && (p.level || 0) < 10) return { level:'med', msg:'RP สูงเทียบกับ level' };
    return null;
  };

  async function submitFlag(p) {
    try {
      await api.post(`/api/game/audit/players/${p.uid}/flag`, { reason: flagNote || `RP Anomaly: ${p.rp} RP — manual review` });
      toast.success(`Flagged @${p.tiktokId}`);
      setFlagging(null);
      setFlagNote('');
    } catch { toast.error('ล้มเหลว'); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <h2 style={{ color:'#818cf8', fontWeight:800, fontSize:20, margin:0 }}>💎 RP Monitor</h2>
        <span style={{ color:'#4b5563', fontSize:12 }}>ตรวจสอบ RP balance รายผู้เล่น • หา anomaly</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        <StatCard label="ผู้เล่นทั้งหมด" value={players.length} icon="👥" color="#818cf8" />
        <StatCard label="มี RP > 0" value={players.filter(p=>p.rp>0).length} icon="💎" color="#a78bfa" />
        <StatCard label="RP สูงสงสัย (>200)" value={players.filter(p=>(p.rp||0)>200).length} icon="⚠️" color="#f87171" />
      </div>

      <div style={{ ...card }}>
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา TikTok ID / ชื่อ..."
            style={{ flex:1, minWidth:200, background:'#1f2937', border:'1px solid #374151', borderRadius:8,
              color:'#e5e7eb', padding:'8px 12px', fontSize:13 }} />
          {['rp','gold','level'].map(s => (
            <button key={s} onClick={()=>setSortBy(s)}
              style={{ padding:'8px 14px', borderRadius:8, border:`1px solid ${sortBy===s?'#818cf8':'#374151'}`,
                color: sortBy===s ? '#818cf8' : '#6b7280', background:'transparent', cursor:'pointer', fontSize:13 }}>
              Sort: {s.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? <div style={{ color:'#4b5563', padding:'20px', textAlign:'center' }}>กำลังโหลด...</div> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #374151' }}>
                  {['#','TikTok ID','ชื่อ','Lv','RP 💎','Gold 🪙','Risk','Action'].map(h => (
                    <th key={h} style={{ color:'#6b7280', fontWeight:600, padding:'8px 10px', textAlign:'left', fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0,100).map((p,i) => {
                  const risk = flagRisk(p);
                  return (
                    <tr key={p.uid} style={{ borderBottom:'1px solid #1f2937', background: risk?.level==='high' ? '#7f1d1d22' : 'transparent' }}>
                      <td style={{ padding:'8px 10px', color:'#4b5563' }}>{i+1}</td>
                      <td style={{ padding:'8px 10px', color:'#f59e0b' }}>@{p.tiktokId}</td>
                      <td style={{ padding:'8px 10px', color:'#e5e7eb' }}>{p.name}</td>
                      <td style={{ padding:'8px 10px', color:'#818cf8' }}>{p.level}</td>
                      <td style={{ padding:'8px 10px', color:'#a78bfa', fontWeight:700 }}>{(p.rp||0).toLocaleString()}</td>
                      <td style={{ padding:'8px 10px', color:'#f59e0b' }}>{(p.gold||0).toLocaleString()}</td>
                      <td style={{ padding:'8px 10px' }}>
                        {risk ? <span style={badge(risk.level==='high'?'#f87171':'#fb923c')}>{risk.msg}</span> : <span style={{ color:'#4b5563' }}>—</span>}
                      </td>
                      <td style={{ padding:'8px 10px' }}>
                        <button onClick={()=>setFlagging(p)}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #f8717144', color:'#f87171',
                            background:'transparent', cursor:'pointer', fontSize:11 }}>🚩</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flagging && (
        <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setFlagging(null)}>
          <div style={{ ...card, width:440, border:'1px solid #f87171' }}>
            <h3 style={{ color:'#f87171', marginBottom:12 }}>🚩 Flag: @{flagging.tiktokId}</h3>
            <div style={{ color:'#9ca3af', fontSize:13, marginBottom:12 }}>RP: {flagging.rp} • Gold: {flagging.gold?.toLocaleString()} • Lv.{flagging.level}</div>
            <input value={flagNote} onChange={e=>setFlagNote(e.target.value)} placeholder="เหตุผล (เช่น: RP สูงผิดปกติ ตรวจสอบด้วย)..."
              style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb',
                padding:'10px 12px', fontSize:13, boxSizing:'border-box', marginBottom:12 }} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setFlagging(null)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #374151', color:'#6b7280', background:'transparent', cursor:'pointer' }}>ยกเลิก</button>
              <button onClick={()=>submitFlag(flagging)} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#f87171', color:'#0a0a0a', fontWeight:700, cursor:'pointer' }}>Flag</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Bug Radar ───────────────────────────────────────────────────────────
function BugRadarTab() {
  const [bugs, setBugs] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const fetchBugs = React.useCallback(() => {
    setLoading(true);
    api.get('/api/game/audit/bugs')
      .then(r => setBugs(r.data))
      .catch(() => setBugs({ stuckBattles:[], failedTx:[], errorPatterns:[], recentFlags:[] }))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchBugs(); }, [fetchBugs]);

  const SEV_COLOR = { critical:'#f87171', high:'#fb923c', medium:'#fbbf24', low:'#34d399' };

  const autoDetected = React.useMemo(() => {
    if (!bugs) return [];
    const items = [];
    (bugs.stuckBattles||[]).forEach(b => items.push({
      sev:'high', category:'⚔️ Stuck Battle', uid: b.uid, detail: `Battle stuck ${b.minutesAgo}m ago`, data: b
    }));
    (bugs.failedTx||[]).forEach(t => items.push({
      sev:'medium', category:'💸 Failed Transaction', uid: t.uid, detail: `${t.txId} — ${t.error||'unknown'}`, data: t
    }));
    (bugs.errorPatterns||[]).forEach(p => items.push({
      sev: p.count > 10 ? 'critical' : p.count > 5 ? 'high' : 'medium',
      category:'🔴 Error Pattern', uid:'system', detail: `${p.type}: ${p.count}x — ${p.lastSeen}`, data: p
    }));
    return items.sort((a,b) => { const o={critical:0,high:1,medium:2,low:3}; return o[a.sev]-o[b.sev]; });
  }, [bugs]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <h2 style={{ color:'#f87171', fontWeight:800, fontSize:20, margin:0 }}>🐛 Bug Radar</h2>
          <span style={{ color:'#4b5563', fontSize:12 }}>ตรวจจับอัตโนมัติจาก Firestore — ไม่ต้องให้ผู้เล่นรายงาน</span>
        </div>
        <button onClick={fetchBugs} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #374151', color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:13 }}>↻ Refresh</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Critical', value: autoDetected.filter(b=>b.sev==='critical').length, color:'#f87171', icon:'🔴' },
          { label:'High', value: autoDetected.filter(b=>b.sev==='high').length, color:'#fb923c', icon:'🟠' },
          { label:'Medium', value: autoDetected.filter(b=>b.sev==='medium').length, color:'#fbbf24', icon:'🟡' },
          { label:'Stuck Battles', value: bugs?.stuckBattles?.length||0, color:'#818cf8', icon:'⚔️' },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign:'center', color:'#4b5563', padding:40 }}>🔍 กำลังสแกน Firestore...</div>
      ) : autoDetected.length === 0 ? (
        <div style={{ ...card, textAlign:'center', color:'#34d399', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:600 }}>ไม่พบ bug อัตโนมัติ</div>
          <div style={{ color:'#4b5563', fontSize:13, marginTop:6 }}>ระบบทำงานปกติ</div>
        </div>
      ) : (
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>
            ⚠️ พบ {autoDetected.length} รายการ (เรียงตาม severity)
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {autoDetected.map((bug, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px',
                background:'#1f2937', borderRadius:10, borderLeft:`3px solid ${SEV_COLOR[bug.sev]||'#6b7280'}` }}>
                <span style={badge(SEV_COLOR[bug.sev]||'#6b7280')}>{bug.sev.toUpperCase()}</span>
                <span style={{ color:'#9ca3af', fontSize:12, minWidth:160 }}>{bug.category}</span>
                <span style={{ color:'#e5e7eb', fontSize:12, flex:1 }}>{bug.detail}</span>
                {bug.uid !== 'system' && <span style={{ color:'#4b5563', fontSize:11 }}>uid:{bug.uid?.slice(0,8)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📋 สิ่งที่ Bug Radar ตรวจจับอัตโนมัติ</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { icon:'⚔️', title:'Stuck Battles', desc:'Battle ที่ไม่มี activity นานกว่า 30 นาที — น่าจะ crash ระหว่างต่อสู้' },
            { icon:'💸', title:'Failed Transactions', desc:'game_transactions ที่ processed=false นานกว่า 5 นาที — TikTok gift ไม่ได้ gold' },
            { icon:'🔴', title:'Error Patterns', desc:'API error เดิมเกิดซ้ำ > 5 ครั้ง ใน 1 ชั่วโมง — น่าจะเป็น systematic bug' },
            { icon:'🔄', title:'Duplicate Transactions', desc:'txId ซ้ำ — gift นับสองครั้ง (idempotency fail)' },
          ].map(item => (
            <div key={item.title} style={{ background:'#1f2937', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ color:'#e5e7eb', fontSize:13, fontWeight:600, marginBottom:6 }}>{item.icon} {item.title}</div>
              <div style={{ color:'#6b7280', fontSize:12 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Churn Predictor ─────────────────────────────────────────────────────
function ChurnTab() {
  const [players, setPlayers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get('/api/game/audit/players?limit=200')
      .then(r => setPlayers(r.data?.players || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scored = React.useMemo(() => {
    return players.map(p => {
      let score = 0; // 0-100 churn risk
      const reasons = [];

      const lastLogin = p.lastLoginAt ? new Date(p.lastLoginAt) : null;
      const daysSince = lastLogin ? Math.floor((Date.now()-lastLogin)/86400000) : 999;

      // Days inactive
      if (daysSince >= 14) { score += 40; reasons.push(`ไม่ active ${daysSince} วัน`); }
      else if (daysSince >= 7) { score += 20; reasons.push(`ไม่ active ${daysSince} วัน`); }
      else if (daysSince >= 3) { score += 10; }

      // Streak broken
      if (p.loginStreak === 0 || p.loginStreak == null) { score += 15; reasons.push('Streak หัก'); }

      // Low level after long time
      if ((p.level||1) < 5 && daysSince < 7) { score += 10; reasons.push('Level ต่ำ — ติดช่วงต้น'); }

      // Stagnant — same level for long
      if ((p.level||1) < 20 && daysSince >= 7) { score += 10; reasons.push('Level หยุดนิ่ง'); }

      // High death count vs low level
      if ((p.deathCount||0) > (p.level||1) * 3) { score += 15; reasons.push('ตายบ่อย — อาจยาก'); }

      const risk = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
      return { ...p, churnScore: Math.min(score, 100), churnRisk: risk, churnReasons: reasons, daysSince };
    }).sort((a,b) => b.churnScore - a.churnScore);
  }, [players]);

  const high = scored.filter(p => p.churnRisk === 'high').length;
  const medium = scored.filter(p => p.churnRisk === 'medium').length;
  const avgDays = scored.length ? Math.round(scored.reduce((s,p)=>s+(p.daysSince<30?p.daysSince:30),0)/scored.length) : 0;

  const RISK_COLOR = { high:'#f87171', medium:'#fb923c', low:'#34d399' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <h2 style={{ color:'#fb923c', fontWeight:800, fontSize:20, margin:0 }}>😴 Churn Predictor</h2>
        <span style={{ color:'#4b5563', fontSize:12 }}>คาดการณ์ผู้เล่นที่จะเลิกเล่น ก่อนที่จะเลิก</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard label="High Risk" value={high} color="#f87171" icon="🔴" sub="เสี่ยงเลิกเล่นสูง" />
        <StatCard label="Medium Risk" value={medium} color="#fb923c" icon="🟠" sub="เสี่ยงปานกลาง" />
        <StatCard label="ไม่ active (7d+)" value={scored.filter(p=>p.daysSince>=7).length} color="#818cf8" icon="💤" />
        <StatCard label="Avg วันไม่ active" value={avgDays + ' วัน'} color="#6b7280" icon="📅" />
      </div>

      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>
          ⚠️ ผู้เล่นเสี่ยง Churn สูงสุด (เรียงตาม risk score)
        </div>
        {loading ? <div style={{ color:'#4b5563', padding:20, textAlign:'center' }}>กำลังวิเคราะห์...</div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {scored.slice(0,30).map((p,i) => (
              <div key={p.uid} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                background: p.churnRisk==='high'?'#7f1d1d22':'#1f2937', borderRadius:10,
                borderLeft:`3px solid ${RISK_COLOR[p.churnRisk]||'#374151'}` }}>
                <span style={{ color:'#4b5563', fontSize:12, minWidth:24 }}>{i+1}</span>
                <span style={{ color:'#f59e0b', minWidth:140, fontSize:13 }}>@{p.tiktokId||'—'}</span>
                <span style={{ color:'#e5e7eb', fontSize:12, minWidth:80 }}>Lv.{p.level}</span>
                <div style={{ flex:1, height:8, background:'#111827', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${p.churnScore}%`, height:'100%', background: RISK_COLOR[p.churnRisk], borderRadius:4 }} />
                </div>
                <span style={{ ...badge(RISK_COLOR[p.churnRisk]||'#6b7280'), minWidth:40, textAlign:'center' }}>{p.churnScore}</span>
                <span style={{ color:'#4b5563', fontSize:11, minWidth:80, textAlign:'right' }}>
                  {p.daysSince >= 999 ? 'never logged' : `${p.daysSince}d ago`}
                </span>
                <div style={{ flex:1, color:'#6b7280', fontSize:11 }}>
                  {p.churnReasons.join(' • ') || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>💡 ปัจจัยที่ใช้คำนวณ Churn Score</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { factor:'ไม่ login > 14 วัน', weight:'+40 คะแนน', color:'#f87171' },
            { factor:'ไม่ login 7-13 วัน', weight:'+20 คะแนน', color:'#fb923c' },
            { factor:'Streak หัก', weight:'+15 คะแนน', color:'#fb923c' },
            { factor:'ตายบ่อย (>3× level)', weight:'+15 คะแนน', color:'#fbbf24' },
            { factor:'Level ต่ำ (< 5 หลัง 1 สัปดาห์)', weight:'+10 คะแนน', color:'#fbbf24' },
            { factor:'Level หยุดนิ่ง', weight:'+10 คะแนน', color:'#fbbf24' },
          ].map(f => (
            <div key={f.factor} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'#1f2937', borderRadius:8 }}>
              <span style={{ color:'#9ca3af', fontSize:12 }}>{f.factor}</span>
              <span style={{ ...badge(f.color) }}>{f.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Roadmap & Competitor ────────────────────────────────────────────────
const COMPETITOR_FEATURES = [
  { cat:'🎮 Core Loop', features:[
    { name:'Combat System', them:'Basic turn-based', us:'✅ Turn-based + Guard + Crit + Combo + Limit Break + Elemental + Enemy Counter', score:95 },
    { name:'Character Classes', them:'4-6 classes avg', us:'✅ 20 classes (Warrior→Rifter→Voidwalker)', score:90 },
    { name:'Skill Tree / Unlock', them:'✅ Standard', us:'✅ Skill Points + unlock system', score:80 },
    { name:'Status Effects', them:'✅ Standard', us:'✅ BURN/BLEED/POISON + unique effects', score:85 },
    { name:'Equipment/Enhance', them:'✅ Standard', us:'✅ Enhance +1→+10 system', score:80 },
  ]},
  { cat:'📖 Progression', features:[
    { name:'Level System', them:'✅ Standard', us:'✅ Lv.1-99 (3 year curve)', score:90 },
    { name:'Quest System', them:'✅ Daily quests', us:'✅ Story + Side + Daily + Weekly', score:95 },
    { name:'Achievement System', them:'✅ Standard', us:'✅ Multiple tiers + Title rewards', score:85 },
    { name:'World Boss', them:'✅ Many games', us:'✅ Real-time shared + cooldown + leaderboard', score:80 },
    { name:'Dungeon System', them:'✅ Standard', us:'✅ Room-based + floor rewards', score:75 },
  ]},
  { cat:'🎁 TikTok Live Integration', features:[
    { name:'Gift → Currency', them:'❌ Most games miss this', us:'✅ Gift→Gold+RP pipeline', score:95 },
    { name:'Element-based Gift System', them:'❌ Unique to us', us:'✅ 5-element boss battle system', score:100 },
    { name:'OBS Widget', them:'❌ Rare', us:'✅ Gift Jar + Boss Battle + Chat Overlay + TTS', score:95 },
    { name:'Live Viewer Participation', them:'❌ Most games miss', us:'✅ Verified viewers get Gold in-game', score:90 },
    { name:'Gift Jar Widget', them:'❌ None', us:'✅ Real-time jar fills', score:100 },
  ]},
  { cat:'💰 Economy', features:[
    { name:'Dual Currency (Gold/RP)', them:'✅ Standard', us:'✅ Gold (free) + RP (premium/TikTok)', score:85 },
    { name:'Crafting System', them:'✅ Standard', us:'✅ Recipe-based crafting', score:75 },
    { name:'NPC/Shop Economy', them:'✅ Standard', us:'✅ Multi-NPC + Bond system', score:70 },
    { name:'Anti-Inflation', them:'Varies', us:'⚠️ Basic (gold sinks: buy items, enhance)', score:55 },
  ]},
  { cat:'🚧 ช่องว่างที่ต้องปิด', features:[
    { name:'PVP System', them:'✅ Most games have', us:'❌ ยังไม่มี', score:0 },
    { name:'Guild/Party System', them:'✅ Most games have', us:'❌ ยังไม่มี', score:0 },
    { name:'Trading/Marketplace', them:'✅ Many games have', us:'❌ ยังไม่มี', score:0 },
    { name:'Leaderboard (in-game)', them:'✅ Standard', us:'⚠️ มีใน admin แต่ซ่อนอยู่', score:40 },
    { name:'Seasonal Events', them:'✅ Critical for retention', us:'❌ ยังไม่มี', score:0 },
    { name:'Mobile App', them:'✅ Most have', us:'⚠️ Web-based (Next.js)', score:30 },
  ]},
];

const ROADMAP = [
  { phase:'Phase 1-2', label:'Battle Core + Depth', status:'done', items:['Status Effects','Guard/Block','Crits','Skill Synergy','Momentum','Limit Break','Enemy Counter','Elemental Damage'] },
  { phase:'Phase 3', label:'Class Resources', status:'done', items:['Berserker Rage','Engineer Turret','Necromancer Shards','Rifter Charges','Bard Song','Phantom Ethereal'] },
  { phase:'Phase 4', label:'Economy + TikTok', status:'done', items:['Gift→Gold→RP','RP Shop','Crafting','Weekly Quests','Achievements','World Boss'] },
  { phase:'Phase 5', label:'Admin Tools', status:'current', items:['Economy Calculator','RP Monitor','Bug Radar','Churn Predictor','Roadmap Tracker','Push Advisor'] },
  { phase:'Phase 6', label:'Retention Loop', status:'planned', items:['Seasonal Events','Streak Rewards++','Leaderboard Widget','Login Bonus Expansion','Achievement Titles in OBS'] },
  { phase:'Phase 7', label:'Social Features', status:'planned', items:['Guild System','PVP Arena','Player Trading','Chat in-game','Friend System'] },
  { phase:'Phase 8', label:'Content Expansion', status:'planned', items:['New Zones (Lv.60-99)','New Boss Types','New Class (x5)','Legendary Equipment','Story Chapters 2-3'] },
];

function RoadmapTab() {
  const [showCat, setShowCat] = React.useState(null);

  const allFeatures = COMPETITOR_FEATURES.flatMap(c => c.features);
  const avgScore = Math.round(allFeatures.reduce((s,f)=>s+f.score,0)/allFeatures.length);
  const done = allFeatures.filter(f=>f.score>=70).length;
  const gaps = allFeatures.filter(f=>f.score<40).length;

  const STATUS_COLOR = { done:'#34d399', current:'#f59e0b', planned:'#818cf8' };
  const STATUS_LABEL = { done:'✅ Done', current:'🔨 In Progress', planned:'📋 Planned' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <h2 style={{ color:'#34d399', fontWeight:800, fontSize:20, margin:0 }}>🗺️ Roadmap & Competitor</h2>
        <span style={{ color:'#4b5563', fontSize:12 }}>เปรียบเทียบกับ world-class TikTok games</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard label="Overall Score" value={avgScore + '%'} icon="🏆" color={avgScore>=80?'#34d399':avgScore>=60?'#f59e0b':'#f87171'} sub="เทียบ world-class" />
        <StatCard label="Feature Parity" value={done + '/' + allFeatures.length} icon="✅" color="#34d399" sub="feature ≥70% done" />
        <StatCard label="Critical Gaps" value={gaps} icon="❌" color="#f87171" sub="ต้องปิดด่วน" />
        <StatCard label="TikTok Unique" value="3" icon="⭐" color="#f59e0b" sub="คุณสมบัติที่คนอื่นไม่มี" />
      </div>

      {/* Roadmap */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:16 }}>📍 Roadmap Progress</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {ROADMAP.map(p => (
            <div key={p.phase} style={{ display:'flex', gap:14, padding:'12px 16px', background:'#1f2937', borderRadius:10,
              borderLeft:`3px solid ${STATUS_COLOR[p.status]}` }}>
              <div style={{ minWidth:80 }}>
                <div style={{ color: STATUS_COLOR[p.status], fontSize:11, fontWeight:700 }}>{p.phase}</div>
                <div style={{ ...badge(STATUS_COLOR[p.status]), marginTop:4 }}>{STATUS_LABEL[p.status]}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'#e5e7eb', fontSize:13, fontWeight:600, marginBottom:6 }}>{p.label}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {p.items.map(item => (
                    <span key={item} style={{ background:'#111827', color: p.status==='done'?'#34d399':p.status==='current'?'#f59e0b':'#6b7280',
                      borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                      {p.status==='done'?'✓ ':''}{item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor comparison */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:16 }}>⚔️ Feature Comparison vs World-Class TikTok Games</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
          {COMPETITOR_FEATURES.map(c => (
            <button key={c.cat} onClick={()=>setShowCat(showCat===c.cat?null:c.cat)}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${showCat===c.cat?'#f59e0b':'#374151'}`,
                color:showCat===c.cat?'#f59e0b':'#6b7280', background:'transparent', cursor:'pointer', fontSize:12 }}>
              {c.cat}
            </button>
          ))}
        </div>
        {COMPETITOR_FEATURES.filter(c=>!showCat||c.cat===showCat).map(cat => (
          <div key={cat.cat} style={{ marginBottom:16 }}>
            <div style={{ color:'#9ca3af', fontSize:11, fontWeight:700, marginBottom:8 }}>{cat.cat}</div>
            {cat.features.map(f => (
              <div key={f.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                background:'#1f2937', borderRadius:8, marginBottom:4 }}>
                <span style={{ color:'#e5e7eb', fontSize:12, minWidth:180 }}>{f.name}</span>
                <div style={{ flex:1, height:8, background:'#111827', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${f.score}%`, height:'100%', borderRadius:4,
                    background: f.score>=80?'#34d399':f.score>=50?'#f59e0b':'#f87171' }} />
                </div>
                <span style={{ color: f.score>=80?'#34d399':f.score>=50?'#f59e0b':'#f87171',
                  fontWeight:700, fontSize:12, minWidth:36, textAlign:'right' }}>{f.score}%</span>
                <span style={{ color:'#4b5563', fontSize:11, minWidth:100 }}>{f.them}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Insights & Push Advisor ────────────────────────────────────────────
function InsightsTab() {
  const [activity, setActivity] = React.useState(null);
  const [players, setPlayers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      api.get('/api/game/audit/activity?limit=100').then(r=>r.data).catch(()=>null),
      api.get('/api/game/audit/players?limit=200').then(r=>r.data?.players||[]).catch(()=>[]),
    ]).then(([act, pl]) => {
      setActivity(act);
      setPlayers(pl);
    }).finally(() => setLoading(false));
  }, []);

  // Zone distribution from players
  const zoneCount = React.useMemo(() => {
    const m = {};
    players.forEach(p => { if(p.location) m[p.location] = (m[p.location]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [players]);

  // Level distribution
  const lvBuckets = React.useMemo(() => {
    const buckets = [0,0,0,0,0,0,0,0,0,0]; // 0-9,10-19,...,90-99
    players.forEach(p => { const b = Math.min(9,Math.floor((p.level||1)/10)); buckets[b]++; });
    return buckets;
  }, [players]);
  const maxBucket = Math.max(...lvBuckets, 1);

  // Recent activity source breakdown
  const sourceBreakdown = React.useMemo(() => {
    if (!activity?.events) return [];
    const m = {};
    activity.events.forEach(e => { m[e.source] = (m[e.source]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [activity]);

  const PUSH_TIPS = [
    { icon:'⚠️', color:'#f87171', title:'Economy Fix เร่งด่วน', desc:'XP formula ปัจจุบัน: Lv.50 ≈ 9 เดือน / Lv.99 ≈ 2 ปี — ต่ำกว่าเป้า 3 ปีที่ตั้งไว้ แนะนำปรับ exponent 1.9 → 2.1' },
    { icon:'💡', color:'#f59e0b', title:'Gold Sink ขาด', desc:'ผู้เล่น Lv.50+ ใน void_frontier ได้ ~7,200 gold/วัน แต่ยังไม่มี end-game item ราคาสูง — ควรเพิ่ม legendary items ราคา 50,000+ gold' },
    { icon:'📈', color:'#34d399', title:'TikTok Integration แข็งแกร่ง', desc:'Gift→Gold pipeline และ element boss เป็น USP ที่แข็งแกร่ง ควร market เรื่องนี้มากกว่า' },
    { icon:'🎯', color:'#818cf8', title:'Retention Gap', desc:'ยังไม่มี Seasonal Events และ Guild System — ผู้เล่น end-game (Lv.60+) จะเบื่อเร็ว ควร implement Phase 6 โดยเร็ว' },
    { icon:'🐛', color:'#fb923c', title:'Monitor Bug Radar', desc:'ตรวจสอบ Bug Radar tab หลังทุก push — โดยเฉพาะ stuck battles และ failed TikTok transactions' },
  ];

  const ZONE_LABELS = {
    town_square:'🏘️ Town Square', town_outskirts:'🌾 ชานเมือง',
    forest_path:'🌲 ทางป่า', dark_cave:'🕳️ ถ้ำมืด',
    city_ruins:'🏚️ ซากเมือง', cursed_marshlands:'🌿 หนองสาปแช่ง',
    void_frontier:'🌀 ชายขอบ Void', shadowfell_depths:'🌑 ห้วงเงา', vorath_citadel:'🏰 Vorath',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <h2 style={{ color:'#a78bfa', fontWeight:800, fontSize:20, margin:0 }}>💡 Insights & Push Advisor</h2>
        <span style={{ color:'#4b5563', fontSize:12 }}>Zone heatmap • Level distribution • คำแนะนำ real-time</span>
      </div>

      {/* Push Tips */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>🔔 คำแนะนำสำหรับ Push ถัดไป</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {PUSH_TIPS.map((tip,i) => (
            <div key={i} style={{ display:'flex', gap:14, padding:'14px 16px', background:'#1f2937', borderRadius:10,
              borderLeft:`3px solid ${tip.color}` }}>
              <span style={{ fontSize:20 }}>{tip.icon}</span>
              <div>
                <div style={{ color:tip.color, fontWeight:700, fontSize:13, marginBottom:4 }}>{tip.title}</div>
                <div style={{ color:'#9ca3af', fontSize:12 }}>{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Zone Heatmap */}
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>🗺️ Zone Heatmap (ผู้เล่นอยู่ที่ไหน)</div>
          {loading ? <div style={{ color:'#4b5563', fontSize:13 }}>กำลังโหลด...</div> : zoneCount.length === 0 ? (
            <div style={{ color:'#4b5563', fontSize:13 }}>ไม่มีข้อมูล</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {zoneCount.map(([zone, count]) => {
                const pctVal = Math.round((count / players.length) * 100);
                return (
                  <div key={zone} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#9ca3af', fontSize:11, minWidth:160 }}>{ZONE_LABELS[zone]||zone}</span>
                    <div style={{ flex:1, height:10, background:'#111827', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${pctVal}%`, height:'100%', background:'#818cf8', borderRadius:4 }} />
                    </div>
                    <span style={{ color:'#818cf8', fontSize:11, fontWeight:700, minWidth:40, textAlign:'right' }}>{count}คน</span>
                    <span style={{ color:'#4b5563', fontSize:10, minWidth:30 }}>{pctVal}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Level distribution */}
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📊 Level Distribution</div>
          {loading ? <div style={{ color:'#4b5563', fontSize:13 }}>กำลังโหลด...</div> : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {lvBuckets.map((count, i) => {
                const pctVal = Math.round((count / Math.max(1, players.length)) * 100);
                const label = i===0?'Lv.1-9':`Lv.${i*10}-${i*10+9}`;
                const color = i<2?'#34d399':i<5?'#f59e0b':i<8?'#818cf8':'#f87171';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#9ca3af', fontSize:11, minWidth:70 }}>{label}</span>
                    <div style={{ flex:1, height:10, background:'#111827', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${(count/maxBucket)*100}%`, height:'100%', background:color, borderRadius:4 }} />
                    </div>
                    <span style={{ color, fontSize:11, fontWeight:700, minWidth:30, textAlign:'right' }}>{count}</span>
                    <span style={{ color:'#4b5563', fontSize:10, minWidth:30 }}>{pctVal}%</span>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && players.length > 0 && (
            <div style={{ marginTop:10, padding:'8px 12px', background:'#1f2937', borderRadius:8, fontSize:12, color:'#6b7280' }}>
              {lvBuckets[0] > players.length * 0.5 && '⚠️ ผู้เล่น > 50% อยู่ที่ Lv.1-9 — ช่วง early game ต้องการ improvement'}
              {lvBuckets.slice(6).reduce((s,c)=>s+c,0) > 0 && ' • มีผู้เล่น end-game (Lv.60+) ต้องการ content เพิ่ม'}
            </div>
          )}
        </div>
      </div>

      {/* Activity source */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📜 Activity Breakdown (100 รายการล่าสุด)</div>
        {loading ? <div style={{ color:'#4b5563', fontSize:13 }}>กำลังโหลด...</div> : sourceBreakdown.length === 0 ? (
          <div style={{ color:'#4b5563', fontSize:13 }}>ไม่มีข้อมูล</div>
        ) : (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {sourceBreakdown.map(([src, cnt]) => (
              <div key={src} style={{ background:'#1f2937', borderRadius:8, padding:'10px 16px', textAlign:'center' }}>
                <div style={{ color:'#e5e7eb', fontSize:16, fontWeight:700 }}>{cnt}</div>
                <div style={{ ...badge(srcColor(src)), marginTop:4 }}>{src}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gift→RP funnel */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>🫙 Gift → Gold → RP Funnel</div>
        <div style={{ display:'flex', gap:0, alignItems:'stretch' }}>
          {[
            { label:'TikTok Viewers', desc:'ดูไลฟ์', color:'#6b7280', width:'100%' },
            { label:'ส่ง Gift', desc:'~5-15% ของผู้ชม', color:'#f59e0b', width:'15%' },
            { label:'Verified Account', desc:'มี game account', color:'#34d399', width:'8%' },
            { label:'ได้ Gold', desc:'1 diamond = 1 gold', color:'#818cf8', width:'8%' },
            { label:'ได้ RP', desc:'10 diamonds = 1 RP', color:'#a78bfa', width:'5%' },
          ].map((step, i) => (
            <div key={step.label} style={{ flex:`0 0 ${i===0?'20%':'20%'}`, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:'100%', height:40, background: step.color+'22', border:`1px solid ${step.color}44`,
                borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:step.color, fontSize:11, fontWeight:700 }}>{step.label}</span>
              </div>
              <div style={{ color:'#4b5563', fontSize:10, textAlign:'center' }}>{step.desc}</div>
              {i < 4 && <span style={{ color:'#374151', fontSize:16 }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, color:'#6b7280', fontSize:12 }}>
          💡 <strong style={{color:'#f59e0b'}}>Conversion tip:</strong> เพิ่ม conversion จาก "ดูไลฟ์" → "verify account" โดยแสดง popup in-OBS ว่า "ส่ง gift แล้วได้อะไร" — น่าจะเพิ่ม verified players ได้ 2-3×
        </div>
      </div>
    </div>
  );
}



// ─── Tab: Item Economy ────────────────────────────────────────────────────────
function ItemEconomyTab() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState('buy');

  React.useEffect(() => {
    api.get('/api/game/audit/item-stats').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const items = React.useMemo(() => {
    if (!data?.items) return [];
    const list = [...data.items];
    if (sortBy === 'buy') list.sort((a,b) => b.buyCount - a.buyCount);
    else if (sortBy === 'sell') list.sort((a,b) => b.sellCount - a.sellCount);
    else list.sort((a,b) => (a.buyCount + a.sellCount) - (b.buyCount + b.sellCount)); // dead items first
    return list;
  }, [data, sortBy]);

  const maxBuy  = Math.max(...(data?.items||[]).map(i=>i.buyCount), 1);
  const maxSell = Math.max(...(data?.items||[]).map(i=>i.sellCount), 1);
  const deadItems = (data?.items||[]).filter(i => i.buyCount === 0 && i.sellCount === 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#34d399', fontSize:24, fontWeight:800 }}>{data?.items?.length || 0}</div>
          <div style={{ color:'#6b7280', fontSize:12 }}>รายการ items ที่มีข้อมูล</div>
        </div>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#f59e0b', fontSize:24, fontWeight:800 }}>
            {(data?.items||[]).reduce((s,i)=>s+i.buyCount,0)}
          </div>
          <div style={{ color:'#6b7280', fontSize:12 }}>ครั้งที่ซื้อทั้งหมด</div>
        </div>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#f87171', fontSize:24, fontWeight:800 }}>{deadItems.length}</div>
          <div style={{ color:'#6b7280', fontSize:12 }}>Items ที่ยังไม่มีใครแตะ</div>
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700 }}>🛒 Item Economy Breakdown</div>
          <div style={{ display:'flex', gap:8 }}>
            {[['buy','ซื้อมาก'],['sell','ขายมาก'],['dead','ไม่มีใชใช้']].map(([k,l])=>(
              <button key={k} onClick={()=>setSortBy(k)}
                style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #374151', fontSize:12,
                  background: sortBy===k ? '#1f2937':'transparent', color: sortBy===k ? '#f59e0b':'#6b7280', cursor:'pointer' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color:'#4b5563', fontSize:14, textAlign:'center', padding:40 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color:'#4b5563', fontSize:14, textAlign:'center', padding:40 }}>
            ยังไม่มีข้อมูล — จะเริ่มสะสมเมื่อผู้เล่นซื้อ/ขาย items
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.slice(0,30).map(item => (
              <div key={item.itemId} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'10px 14px', borderRadius:8, background:'#111827', border:'1px solid #1f2937' }}>
                <span style={{ fontSize:20 }}>{item.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ color:'#e5e7eb', fontSize:13, fontWeight:600 }}>{item.name}</span>
                    <span style={{ color:'#4b5563', fontSize:11 }}>{item.type}</span>
                  </div>
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
                      <span style={{ color:'#34d399', fontSize:11, minWidth:28 }}>🛒 {item.buyCount}</span>
                      <div style={{ flex:1, height:6, background:'#1f2937', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${(item.buyCount/maxBuy*100).toFixed(1)}%`, height:'100%', background:'#34d399', borderRadius:3 }}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
                      <span style={{ color:'#f59e0b', fontSize:11, minWidth:28 }}>💰 {item.sellCount}</span>
                      <div style={{ flex:1, height:6, background:'#1f2937', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${(item.sellCount/maxSell*100).toFixed(1)}%`, height:'100%', background:'#f59e0b', borderRadius:3 }}/>
                      </div>
                    </div>
                  </div>
                </div>
                {item.buyCount === 0 && item.sellCount === 0 && (
                  <span style={{ ...badge('#f87171'), fontSize:10 }}>DEAD</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {deadItems.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:12 }}>⚠️ Items ที่ไม่มีใครสนใจ — แนะนำ Re-balance</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {deadItems.map(item => (
              <div key={item.itemId} style={{ padding:'6px 12px', borderRadius:8,
                background:'#1f1010', border:'1px solid #7f1d1d',
                color:'#fca5a5', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, color:'#6b7280', fontSize:12 }}>
            💡 ลอง: ลด buyPrice, เพิ่ม stat bonus, หรือเพิ่มใน daily quest reward เพื่อ expose items เหล่านี้
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Skill Usage Stats ───────────────────────────────────────────────────
function SkillStatsTab() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [filterClass, setFilterClass] = React.useState('all');

  React.useEffect(() => {
    api.get('/api/game/audit/skill-stats').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const classes = React.useMemo(() => {
    if (!data?.skills) return [];
    const s = new Set(data.skills.map(sk=>sk.charClass));
    return ['all', ...Array.from(s).sort()];
  }, [data]);

  const skills = React.useMemo(() => {
    if (!data?.skills) return [];
    let list = [...data.skills];
    if (filterClass !== 'all') list = list.filter(sk => sk.charClass === filterClass || sk.charClass === 'any');
    return list.sort((a,b) => b.useCount - a.useCount);
  }, [data, filterClass]);

  const maxUse = Math.max(...skills.map(s=>s.useCount), 1);
  const neverUsed = skills.filter(s => s.useCount === 0);
  const totalUses = skills.reduce((s,sk)=>s+sk.useCount,0);

  const CLASS_COLORS = { warrior:'#ef4444', mage:'#818cf8', archer:'#34d399', rogue:'#a78bfa',
    berserker:'#f97316', engineer:'#38bdf8', necromancer:'#c084fc', rifter:'#22d3ee',
    bard:'#fb923c', phantom:'#6b7280', any:'#9ca3af' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#818cf8', fontSize:24, fontWeight:800 }}>{data?.skills?.length || 0}</div>
          <div style={{ color:'#6b7280', fontSize:12 }}>Skills ที่มีข้อมูล</div>
        </div>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#34d399', fontSize:24, fontWeight:800 }}>{totalUses.toLocaleString()}</div>
          <div style={{ color:'#6b7280', fontSize:12 }}>ครั้งที่ใช้ทั้งหมด</div>
        </div>
        <div style={{ ...card, textAlign:'center' }}>
          <div style={{ color:'#f87171', fontSize:24, fontWeight:800 }}>{neverUsed.length}</div>
          <div style={{ color:'#6b7280', fontSize:12 }}>Skills ที่ไม่มีใครใช้</div>
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700 }}>⚔️ Skill Usage Ranking</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {classes.map(cls => (
              <button key={cls} onClick={()=>setFilterClass(cls)}
                style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${CLASS_COLORS[cls]||'#374151'}44`,
                  fontSize:11, background: filterClass===cls ? (CLASS_COLORS[cls]||'#374151')+'22':'transparent',
                  color: filterClass===cls ? (CLASS_COLORS[cls]||'#9ca3af'):'#6b7280', cursor:'pointer' }}>
                {cls}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color:'#4b5563', fontSize:14, textAlign:'center', padding:40 }}>Loading…</div>
        ) : skills.length === 0 ? (
          <div style={{ color:'#4b5563', fontSize:14, textAlign:'center', padding:40 }}>
            ยังไม่มีข้อมูล — จะเริ่มสะสมเมื่อผู้เล่นใช้ skills ในการต่อสู้
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {skills.map((sk, i) => {
              const clrKey = sk.charClass in CLASS_COLORS ? sk.charClass : 'any';
              const clr = CLASS_COLORS[clrKey];
              const pct = (sk.useCount/maxUse*100).toFixed(1);
              return (
                <div key={sk.skillId} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'8px 12px', borderRadius:8, background:'#111827', border:'1px solid #1f2937' }}>
                  <span style={{ color:'#4b5563', fontSize:12, minWidth:24, textAlign:'right' }}>#{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ color:'#e5e7eb', fontSize:13, fontWeight:600 }}>{sk.name}</span>
                      <span style={{ ...badge(clr), fontSize:10 }}>{sk.charClass}</span>
                      {sk.useCount === 0 && <span style={{ ...badge('#f87171'), fontSize:10 }}>UNUSED</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'#1f2937', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: clr, borderRadius:3, transition:'width .3s' }}/>
                      </div>
                      <span style={{ color:'#9ca3af', fontSize:12, minWidth:50, textAlign:'right' }}>
                        {sk.useCount.toLocaleString()} ครั้ง
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {neverUsed.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:12 }}>🔴 Skills ที่ไม่มีใครใช้ — ควร Re-balance</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            {neverUsed.map(sk => {
              const clr = CLASS_COLORS[sk.charClass] || '#9ca3af';
              return (
                <div key={sk.skillId} style={{ padding:'6px 12px', borderRadius:8,
                  background:'#1f1010', border:`1px solid ${clr}44`,
                  color: clr, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span>{sk.name}</span>
                  <span style={{ color:'#4b5563', fontSize:10 }}>({sk.charClass})</span>
                </div>
              );
            })}
          </div>
          <div style={{ color:'#6b7280', fontSize:12 }}>
            💡 แนะนำ: ลด mpCost, เพิ่ม damage multiplier, หรือเพิ่ม unique effect (stun/debuff) เพื่อดึงดูดการใช้งาน
          </div>
        </div>
      )}

      {totalUses > 0 && skills.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:12 }}>📊 Usage Distribution</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(CLASS_COLORS).filter(([cls])=>cls!=='any').map(([cls, clr]) => {
              const clsSkills = skills.filter(s=>s.charClass===cls||s.charClass==='any');
              const clsTotal  = clsSkills.reduce((s,sk)=>s+sk.useCount,0);
              if (clsTotal === 0) return null;
              return (
                <div key={cls} style={{ padding:'8px 14px', borderRadius:8,
                  background:clr+'11', border:`1px solid ${clr}33`, textAlign:'center' }}>
                  <div style={{ color:clr, fontSize:16, fontWeight:700 }}>{clsTotal.toLocaleString()}</div>
                  <div style={{ color:'#6b7280', fontSize:11 }}>{cls}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab]           = useState('overview');
  const [summary, setSummary]   = useState(null);
  const [flags, setFlags]       = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/ASHENVEIL'); return; }
      try {
        const r = await api.get('/api/game/audit/summary');
        setSummary(r.data);
        setAuthed(true);
        setLastRefresh(new Date());
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error(`ไม่มีสิทธิ์ Admin — UID: ${user.uid.slice(0,12)}… ตรวจสอบ ADMIN_UID ใน Railway`);
          router.replace('/ASHENVEIL');
        } else if (err.response?.status === 503) {
          toast.error('ADMIN_UID ยังไม่ได้ตั้งค่าใน Railway env');
          setAuthed(true);
        } else {
          toast.error('Server ยังไม่พร้อม — ลองใหม่ในสักครู่');
          setAuthed(true); // ยังให้เข้าได้ แต่ข้อมูลว่าง
        }
      } finally { setChecking(false); }
    });
    return unsub;
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const r = await api.get('/api/game/audit/summary');
      setSummary(r.data);
      setLastRefresh(new Date());
      toast.success('Refreshed');
    } catch { toast.error('Refresh ไม่ได้'); }
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center',
        justifyContent:'center', color:'#4b5563', fontFamily:'system-ui' }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }
  if (!authed) return null;

  const unresolvedCount = summary?.unresolvedFlags || 0;
  const TABS = [
    { key:'overview',  label:'📊 Overview' },
    { key:'flags',     label:`🚩 Flags${unresolvedCount > 0 ? ` (${unresolvedCount})` : ''}` },
    { key:'players',   label:'👥 Players' },
    { key:'activity',  label:'📜 Activity' },
    { key:'economy',   label:'📈 Economy' },
    { key:'rp',        label:'💎 RP Monitor' },
    { key:'bugs',      label:'🐛 Bug Radar' },
    { key:'churn',     label:'😴 Churn' },
    { key:'roadmap',   label:'🗺️ Roadmap' },
    { key:'insights',  label:'💡 Insights' },
    { key:'items',     label:'🛒 Item Economy' },
    { key:'skills',    label:'⚔️ Skill Stats' },
  ];

  return (
    <>
      <Head><title>Admin — Ashenveil</title></Head>
      <Toaster position="top-right" toastOptions={{ style: { background:'#1f2937', color:'#e5e7eb' } }} />

      <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#e5e7eb',
        fontFamily:'system-ui, -apple-system, sans-serif' }}>

        {/* Navbar */}
        <div style={{ background:'#111827', borderBottom:'1px solid #1f2937', padding:'14px 28px',
          display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>⚙️</span>
            <div>
              <div style={{ color:'#f59e0b', fontWeight:800, fontSize:18, letterSpacing:2 }}>ASHENVEIL ADMIN</div>
              <div style={{ color:'#374151', fontSize:11 }}>
                {lastRefresh ? `Last updated ${timeAgo(lastRefresh.toISOString())}` : 'Dashboard'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {unresolvedCount > 0 && (
              <span style={{ ...badge('#f87171'), fontSize:13 }}>🚨 {unresolvedCount} flags</span>
            )}
            <button onClick={refreshSummary}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #374151', color:'#9ca3af',
                background:'transparent', cursor:'pointer', fontSize:13 }}>
              ↻ Refresh
            </button>
            <button onClick={() => router.push('/ASHENVEIL')}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #374151', color:'#6b7280',
                background:'transparent', cursor:'pointer', fontSize:13 }}>
              ← เกม
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ background:'#111827', borderBottom:'1px solid #1f2937', padding:'0 28px',
          display:'flex', gap:2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'12px 18px', border:'none', background:'transparent', cursor:'pointer',
                fontSize:14, fontWeight: tab===t.key ? 700 : 400,
                color: tab===t.key ? '#f59e0b' : '#6b7280',
                borderBottom: tab===t.key ? '2px solid #f59e0b' : '2px solid transparent',
                transition:'color .15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 28px' }}>
          {tab === 'overview'  && <OverviewTab summary={summary} setTab={setTab} />}
          {tab === 'flags'     && <FlagsTab flags={flags} setFlags={setFlags} />}
          {tab === 'players'   && <PlayersTab />}
          {tab === 'activity'  && <ActivityTab />}
          {tab === 'economy'   && <EconomyTab />}
          {tab === 'rp'        && <RPMonitorTab />}
          {tab === 'bugs'      && <BugRadarTab />}
          {tab === 'churn'     && <ChurnTab />}
          {tab === 'roadmap'   && <RoadmapTab />}
          {tab === 'insights'  && <InsightsTab />}
          {tab === 'items'     && <ItemEconomyTab />}
          {tab === 'skills'    && <SkillStatsTab />}
        </div>
      </div>
    </>
  );
}
