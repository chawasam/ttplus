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
  // Slider UI state — updates live on every mousemove (for labels only)
  const [targetLvSlider, setTargetLvSlider] = React.useState(50);
  const [sessionsSlider, setSessionsSlider] = React.useState(2);
  const [zone, setZone] = React.useState(4); // city_ruins index

  // Debounced state — used for all calculations (updates 150ms after slider stops)
  const [targetLv, setTargetLv] = React.useState(50);
  const [sessionsPerDay, setSessionsPerDay] = React.useState(2);
  React.useEffect(() => {
    const id = setTimeout(() => setTargetLv(targetLvSlider), 150);
    return () => clearTimeout(id);
  }, [targetLvSlider]);
  React.useEffect(() => {
    const id = setTimeout(() => setSessionsPerDay(sessionsSlider), 150);
    return () => clearTimeout(id);
  }, [sessionsSlider]);

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
            <input type="range" min={1} max={99} value={targetLvSlider}
              onChange={e=>setTargetLvSlider(+e.target.value)}
              onWheel={e=>e.currentTarget.blur()}
              style={{ flex:1, accentColor:'#f59e0b' }} />
            <span style={{ color:'#f59e0b', fontWeight:700, minWidth:32, textAlign:'right' }}>Lv.{targetLvSlider}</span>
          </div>
        </div>
        <div>
          <div style={{ color:'#9ca3af', fontSize:11, marginBottom:6 }}>Session ต่อวัน</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="range" min={1} max={6} value={sessionsSlider}
              onChange={e=>setSessionsSlider(+e.target.value)}
              onWheel={e=>e.currentTarget.blur()}
              style={{ flex:1, accentColor:'#818cf8' }} />
            <span style={{ color:'#818cf8', fontWeight:700, minWidth:60, textAlign:'right' }}>{sessionsSlider}×30m</span>
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
          { label:`ถึง Lv.${targetLvSlider} ใน`, value: daysToTarget >= 365 ? `${(daysToTarget/365).toFixed(1)} ปี` : `${daysToTarget} วัน`, color:'#f59e0b', icon:'🎯' },
          { label:'ถึง Lv.99 ใน', value:`${years} ปี`, color: Math.abs(+years - 3) < 0.5 ? '#34d399' : +years < 2 ? '#f87171' : '#fb923c', icon:'🏆', sub: daysTo99 + ' วัน' },
          { label:'XP ต่อวัน (avg)', value: Math.round(totalXpPerDay).toLocaleString(), color:'#34d399', icon:'⚡', sub:'combat+quest+dungeon' },
          { label:'Gold ต่อวัน (avg)', value: Math.round(totalGoldPerDay).toLocaleString() + ' 🪙', color:'#f59e0b', icon:'💰', sub: zone >= 0 ? zoneData.label : '' },
        ].map((s,i) => <StatCard key={i} {...s} />)}
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

// ─── Feature Details — คลิกได้เพื่อดูรายละเอียด ──────────────────────────────
const FEATURE_DETAILS = {
  // ── DONE: improvement suggestions ──
  'Status Effects': {
    phase:'Phase 1-2', status:'done',
    summary:'BURN/BLEED/POISON พร้อมแล้ว — แต่ยังปรับปรุงได้อีก',
    improvements:[
      { icon:'🛡️', text:'เพิ่ม Immunity visual (เช่น shield glow เมื่อ mob immune to BURN)' },
      { icon:'💀', text:'Debuff stacking cap — ป้องกัน BLEED×10 ทำ damage ผิดปกติ' },
      { icon:'🔀', text:'Cross-debuff reaction: BURN + BLEED = HEMORRHAGE (bonus damage)' },
      { icon:'⏱️', text:'Debuff timer bar แสดงใน battle UI ว่าอีกกี่ turn จะหาย' },
    ],
  },
  'Guard/Block': {
    phase:'Phase 1-2', status:'done',
    summary:'Guard action block damage ได้แล้ว',
    improvements:[
      { icon:'⚔️', text:'Counter-Attack: Guard สำเร็จ → ได้ free attack ในครั้งเดียวกัน' },
      { icon:'💎', text:'Unbreakable Guard Limit Break สำหรับ WARRIOR — block 100% 1 turn' },
      { icon:'📊', text:'แสดง damage absorbed ในหน้า battle log' },
    ],
  },
  'Crits': {
    phase:'Phase 1-2', status:'done',
    summary:'Crit + Super Crit ทำงานแล้ว',
    improvements:[
      { icon:'🔥', text:'Crit Streak Bonus: crit 3 ครั้งติด → +15% crit damage ชั่วคราว' },
      { icon:'✨', text:'Super Crit explosion animation ที่โดดเด่นกว่านี้ (screen flash)' },
      { icon:'📈', text:'แสดง Crit Rate % ในหน้า character stats' },
    ],
  },
  'Skill Synergy': {
    phase:'Phase 1-2', status:'done',
    summary:'Combo system (MARKED + Heavy Strike = EXECUTION) พร้อมแล้ว',
    improvements:[
      { icon:'🎭', text:'Cross-class synergy: WARRIOR MARK + MAGE spell = Arcane Execution' },
      { icon:'📖', text:'Synergy Codex — หน้ารวมคอมโบทั้งหมดให้ผู้เล่นค้น' },
      { icon:'⚡', text:'Double Synergy: trigger 2 combos ในทีเดียว เมื่อมี buff พิเศษ' },
    ],
  },
  'Momentum': {
    phase:'Phase 1-2', status:'done',
    summary:'Momentum bar 0-100 ทำงานแล้ว',
    improvements:[
      { icon:'💔', text:'Momentum decay on death — reset เป็น 0 เมื่อตาย เพิ่ม stakes' },
      { icon:'🎁', text:'Momentum Potion item — เพิ่ม momentum +30 ทันที (craft ได้)' },
      { icon:'📡', text:'Momentum shared progress ในหน้า OBS widget' },
    ],
  },
  'Limit Break': {
    phase:'Phase 1-2', status:'done',
    summary:'Per-class Limit Break animations และ multiplier พร้อมแล้ว',
    improvements:[
      { icon:'🎬', text:'Full-screen cinematic flash ตอน Limit Break activate' },
      { icon:'⏳', text:'Cooldown indicator หลัง Limit Break ใช้ไปแล้ว (3-turn lockout)' },
      { icon:'🌟', text:'Legendary Limit Break: ปลดล็อคเมื่อ Lv.80+ ทำ ×2 effect' },
    ],
  },
  'Enemy Counter': {
    phase:'Phase 1-2', status:'done',
    summary:'Enemy reaction/counter system ทำงานแล้ว',
    improvements:[
      { icon:'💡', text:'Telegraph animation — แสดง icon ก่อน 1 turn ว่า mob จะ counter' },
      { icon:'🔵', text:'Counter-Counter: skill พิเศษที่ interrupt mob counter ได้' },
      { icon:'📚', text:'Bestiary — รวมข้อมูล counter pattern ของ mob แต่ละตัว' },
    ],
  },
  'Elemental Damage': {
    phase:'Phase 1-2', status:'done',
    summary:'Fire/Ice/Lightning/Void/Holy/Shadow damage ทำงานแล้ว',
    improvements:[
      { icon:'🛡️', text:'Elemental Resistance gear — แต่ละ zone มี resist set ที่เหมาะสม' },
      { icon:'🌍', text:'Zone elemental theme — cursed_marshlands mob ควร resistant ต่อ Poison' },
      { icon:'⚡', text:'Elemental Chain Reaction: Ice + Lightning = Shatter (x1.5 damage)' },
    ],
  },
  'Berserker Rage': {
    phase:'Phase 3', status:'done',
    summary:'Rage stacks 0-10 → FRENZY mode พร้อมแล้ว',
    improvements:[
      { icon:'🔥', text:'Rage Aura visual: ไฟล้อมตัวละครเมื่อ Rage ≥7' },
      { icon:'🧪', text:'Rage Potion: item ที่เพิ่ม Rage +3 ทันที (craft จาก Monster Blood)' },
      { icon:'💀', text:'Blood Frenzy passive: ยิ่ง HP ต่ำ ยิ่ง Rage สะสมเร็ว' },
    ],
  },
  'Engineer Turret': {
    phase:'Phase 3', status:'done',
    summary:'Auto-attack turret ทุก turn พร้อมแล้ว',
    improvements:[
      { icon:'⚙️', text:'Turret Upgrade Tree: Lv.1 basic → Lv.3 laser → Lv.5 mortar' },
      { icon:'🤖', text:'Dual Turret Limit Break: วาง turret 2 ตัวพร้อมกัน 3 turns' },
      { icon:'💣', text:'Turret Overcharge: sacrifice turret เพื่อระเบิด deal massive damage' },
    ],
  },
  'Necromancer Shards': {
    phase:'Phase 3', status:'done',
    summary:'Soul Shards → Raise Dead minion system พร้อมแล้ว',
    improvements:[
      { icon:'👾', text:'Minion AI: command minion ให้ attack specific target หรือ defend' },
      { icon:'💀', text:'Horde Mode Limit Break: raise minion 3 ตัวพร้อมกัน (1 turn duration)' },
      { icon:'🦴', text:'Minion Tier: ศัตรูที่แกร่งกว่าเมื่อตายให้ minion ที่แกร่งกว่า' },
    ],
  },
  'Rifter Charges': {
    phase:'Phase 3', status:'done',
    summary:'Void Charges 0-5 → burst release พร้อมแล้ว',
    improvements:[
      { icon:'🌀', text:'Dimensional Portal animation เมื่อ release charges ครบ 5' },
      { icon:'⚡', text:'Void Overcharge: charge เกิน 5 → unstable state, bonus damage แต่ self-damage' },
      { icon:'🎯', text:'Charge Targeting: เลือก mob target ก่อน release เพื่อ bonus precision' },
    ],
  },
  'Bard Song': {
    phase:'Phase 3', status:'done',
    summary:'Song stacking buffs พร้อมแล้ว',
    improvements:[
      { icon:'🎵', text:'Melody Combos: 3 songs ต่างกัน → Harmony buff (+20% all stats)' },
      { icon:'🏰', text:'Guild Song Sharing: Bard ใน Guild สามารถ buff คนในกิลด์ได้ (Phase 7)' },
      { icon:'🎶', text:'Song of Silence: special song ที่ silence mob 2 turns' },
    ],
  },
  'Phantom Ethereal': {
    phase:'Phase 3', status:'done',
    summary:'Ethereal Plane dodge mode พร้อมแล้ว',
    improvements:[
      { icon:'👻', text:'Phase Through Boss: Ethereal ทำให้ dodge Boss attack ได้ 1 ครั้ง' },
      { icon:'⚡', text:'Ethereal Strike: โจมตีจาก ethereal plane deal +50% damage' },
      { icon:'🌙', text:'Shadow Merge: รวมร่างกับ shadow เพื่อ stealth 1 turn ไม่โดน attack' },
    ],
  },
  'Gift→Gold→RP': {
    phase:'Phase 4', status:'done',
    summary:'TikTok gift → Gold/RP conversion ทำงานแล้ว',
    improvements:[
      { icon:'🎁', text:'Gift Multiplier Events: ช่วงเทศกาล gift ได้ RP ×2 (seasonal event)' },
      { icon:'🔥', text:'Gift Streak Bonus: gift ติดต่อกัน 5 ครั้ง → bonus RP +20%' },
      { icon:'📊', text:'Gift Leaderboard: แสดงใน OBS ว่าใครให้ gift มากสุดวันนี้' },
    ],
  },
  'RP Shop': {
    phase:'Phase 4', status:'done',
    summary:'RP exchange shop พร้อมแล้ว',
    improvements:[
      { icon:'⏰', text:'Limited-time RP items: flash sale 30 นาที สุ่มทุก 6 ชั่วโมง' },
      { icon:'🎰', text:'RP Gacha: random item tier draw (ไม่ให้ pay-to-win แต่ cosmetic)' },
      { icon:'🌟', text:'VIP RP Track: สมาชิก TikTok subscriber ได้ RP rate พิเศษ' },
    ],
  },
  'Crafting': {
    phase:'Phase 4', status:'done',
    summary:'Item crafting system พร้อมแล้ว',
    improvements:[
      { icon:'📜', text:'Legendary Recipe Discovery: drop จาก boss เท่านั้น (excitement factor)' },
      { icon:'⚗️', text:'Crafting Mastery: craft อย่างเดียวกัน 10 ครั้ง → unlock enhanced version' },
      { icon:'🔮', text:'Enchanting Station: เพิ่ม bonus stat ให้ existing item (endgame activity)' },
    ],
  },
  'Weekly Quests': {
    phase:'Phase 4', status:'done',
    summary:'Weekly quest system พร้อมแล้ว',
    improvements:[
      { icon:'📖', text:'Monthly Narrative Quest: quest chain ยาว 4 ตอนต่อเดือน มีเรื่องราว' },
      { icon:'🏆', text:'Hardcore Weekly: quest ยากพิเศษ ให้ Legendary reward เมื่อทำสำเร็จ' },
      { icon:'👥', text:'Guild Weekly: quest ที่ทั้ง guild ต้องช่วยกัน complete (Phase 7)' },
    ],
  },
  'Achievements': {
    phase:'Phase 4', status:'done',
    summary:'Achievement system พร้อมแล้ว',
    improvements:[
      { icon:'🔒', text:'Hidden Achievements: ค้นพบได้เมื่อทำ action ลึกลับ (ฆ่า boss ด้วย 1 HP เหลือ ฯลฯ)' },
      { icon:'🎖️', text:'Achievement Medals: badge สวมใส่ได้ แสดงใน TikTok comment' },
      { icon:'📡', text:'OBS Achievement Pop: แสดง achievement unlock บน stream ทันที' },
    ],
  },
  'World Boss': {
    phase:'Phase 4', status:'done',
    summary:'World Boss encounter พร้อมแล้ว',
    improvements:[
      { icon:'👑', text:'Multiple World Bosses: ให้ active พร้อมกัน 2-3 ตัว schedule ต่างเวลา' },
      { icon:'📅', text:'Boss Schedule Widget: OBS overlay แสดง next world boss เวลาไหน' },
      { icon:'🏅', text:'Contribution Leaderboard: ผู้เล่นที่ damage boss มากสุดได้ bonus loot' },
    ],
  },

  // ── CURRENT: Phase 5 Admin Tools ──
  'Economy Calculator': {
    phase:'Phase 5', status:'current',
    summary:'Economy calculator พร้อมใช้งานแล้ว ✅',
    todos:[
      { done:true, text:'XP curve visualization + daily income calculator' },
      { done:true, text:'Zone-by-zone gold breakdown' },
      { done:true, text:'Milestone timeline table' },
      { done:true, text:'Debounce slider + fix card key bug' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },
  'RP Monitor': {
    phase:'Phase 5', status:'current',
    summary:'RP Monitor + fraud detection พร้อมแล้ว ✅',
    todos:[
      { done:true, text:'Player RP leaderboard + search' },
      { done:true, text:'Hourly cap violation flags' },
      { done:true, text:'Manual flag + resolve workflow' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },
  'Bug Radar': {
    phase:'Phase 5', status:'current',
    summary:'Bug auto-detection dashboard พร้อมแล้ว ✅',
    todos:[
      { done:true, text:'Error pattern detection จาก activity log' },
      { done:true, text:'Suspicious behavior flags' },
      { done:true, text:'Priority severity scoring' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },
  'Churn Predictor': {
    phase:'Phase 5', status:'current',
    summary:'Churn risk score + boredom predictor พร้อมแล้ว ✅',
    todos:[
      { done:true, text:'Risk scoring algorithm (0-100)' },
      { done:true, text:'Inactivity day tracking' },
      { done:true, text:'Recommended action per player' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },
  'Roadmap Tracker': {
    phase:'Phase 5', status:'current',
    summary:'Roadmap + Competitor comparison พร้อมแล้ว ✅ (หน้านี้!)',
    todos:[
      { done:true, text:'Phase progress visualization' },
      { done:true, text:'Competitor feature score comparison' },
      { done:true, text:'คลิก feature เพื่อดู detail + suggestions' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },
  'Push Advisor': {
    phase:'Phase 5', status:'current',
    summary:'Real-time push advisor + bonus analytics พร้อมแล้ว ✅',
    todos:[
      { done:true, text:'Activity pattern analysis' },
      { done:true, text:'Best time to push recommendations' },
      { done:true, text:'Zone + class distribution insights' },
    ],
    next:'ไม่มีงานค้าง — พร้อมแล้ว',
  },

  // ── PLANNED: Phase 6 ──
  'Seasonal Events': {
    phase:'Phase 6', status:'planned',
    summary:'Event พิเศษตามช่วงเวลาของปี — สำคัญมากสำหรับ retention',
    effort:'2-3 สัปดาห์',
    priority:'🔴 สูงมาก — ผู้เล่น end-game จะ churn ถ้าไม่มี fresh content',
    todos:[
      { done:false, text:'Halloween Event (ต.ค.): mob แต่งผีหลอน, XP ×1.5, exclusive cosmetic' },
      { done:false, text:'New Year Login Bonus (ม.ค.): 7-day mega reward calendar' },
      { done:false, text:'Valentine RP Discount (ก.พ.): RP shop -30% สำหรับ pair bonuses' },
      { done:false, text:'Backend: event schedule table + active_event flag ใน config' },
      { done:false, text:'Frontend: seasonal theme overlay + event countdown widget' },
    ],
  },
  'Streak Rewards++': {
    phase:'Phase 6', status:'planned',
    summary:'เพิ่ม tier ให้ login streak ที่มีอยู่แล้ว',
    effort:'1 สัปดาห์',
    priority:'🟡 กลาง — เพิ่ม retention ง่าย cost ต่ำ',
    todos:[
      { done:false, text:'7-day streak: Rare item box' },
      { done:false, text:'14-day streak: Epic equipment piece' },
      { done:false, text:'30-day streak: Legendary title + exclusive cosmetic' },
      { done:false, text:'Streak Freeze item: ใช้เมื่อ miss 1 วัน ไม่ให้ streak หัก (ซื้อด้วย RP)' },
      { done:false, text:'OBS widget: แสดง streak count ผู้เล่นใน live stream' },
    ],
  },
  'Leaderboard Widget': {
    phase:'Phase 6', status:'planned',
    summary:'OBS browser source แสดง top players แบบ real-time',
    effort:'1 สัปดาห์',
    priority:'🟡 กลาง — เพิ่ม engagement สำหรับผู้ชม TikTok Live',
    todos:[
      { done:false, text:'API endpoint: GET /widget/leaderboard (top 5 by XP/Gold/Level)' },
      { done:false, text:'Widget page /widget/leaderboard — animated live rankings' },
      { done:false, text:'Streamer config: เลือก sort by XP | Gold | Level | Streak' },
      { done:false, text:'Auto-refresh ทุก 30 วินาที โดยไม่ reload หน้า' },
      { done:false, text:'Highlight when rank changes (animate up/down arrow)' },
    ],
  },
  'Login Bonus Expansion': {
    phase:'Phase 6', status:'planned',
    summary:'ขยาย login bonus ให้หลากหลายและน่าสนใจกว่าเดิม',
    effort:'4-5 วัน',
    priority:'🟢 ต่ำ — ดีแต่ไม่ urgent',
    todos:[
      { done:false, text:'Mega Bonus Week: 7 วันพิเศษต่อเดือน bonus ×3' },
      { done:false, text:'VIP Login Track: TikTok Subscriber ได้ parallel bonus track ที่ดีกว่า' },
      { done:false, text:'Bonus Calendar UI: แสดงรายวันว่าวันไหนได้อะไร' },
      { done:false, text:'Milestone Login Rewards: login ครบ 100/365 วัน ได้ exclusive item' },
    ],
  },
  'Achievement Titles in OBS': {
    phase:'Phase 6', status:'planned',
    summary:'แสดง title/badge ของผู้เล่นใน TikTok comment อัตโนมัติ',
    effort:'1 สัปดาห์',
    priority:'🟡 กลาง — ดี สำหรับ social proof ใน stream',
    todos:[
      { done:false, text:'Title system: achievement unlock → ได้ title string (เช่น "Dragon Slayer")' },
      { done:false, text:'TikTok comment hook: ตรวจจับ comment → overlay username + title ใน OBS' },
      { done:false, text:'Widget /widget/comment-overlay แสดง comment + title badge' },
      { done:false, text:'Equip Title UI: ผู้เล่นเลือก title ที่จะแสดง (มีหลายตัว)' },
    ],
  },

  // ── PLANNED: Phase 7 ──
  'Guild System': {
    phase:'Phase 7', status:'planned',
    summary:'สร้าง / เข้าร่วม guild — content สำคัญสำหรับ social retention',
    effort:'4-6 สัปดาห์',
    priority:'🔴 สูง — endgame ขาด guild จะทำให้ผู้เล่น Lv.60+ เลิก',
    todos:[
      { done:false, text:'Guild document ใน Firestore: name, members[], bank_gold, level' },
      { done:false, text:'Create/Join/Leave guild endpoints' },
      { done:false, text:'Guild Bank: member deposit gold → guild fund events/boss' },
      { done:false, text:'Guild Boss: exclusive weekly boss สำหรับ guild เท่านั้น' },
      { done:false, text:'Guild Weekly Quest: ทุกคนช่วยกัน complete ได้ shared reward' },
      { done:false, text:'Frontend: Guild Hall page ใน /ashenveil/guild' },
    ],
  },
  'PVP Arena': {
    phase:'Phase 7', status:'planned',
    summary:'Turn-based 1v1 ระหว่างผู้เล่น พร้อม ELO ranking',
    effort:'4-5 สัปดาห์',
    priority:'🔴 สูง — ผู้เล่น competitive ต้องการ PVP เพื่ออยู่ long-term',
    todos:[
      { done:false, text:'Arena match-making: ELO-based pairing (±200 ELO)' },
      { done:false, text:'Async PVP: challenge ผู้เล่นคนอื่น → ตอบรับภายใน 24h' },
      { done:false, text:'Arena Token: currency พิเศษจาก PVP → แลก exclusive gear' },
      { done:false, text:'Season ranking: reset รายเดือน, top 10 ได้ Legendary reward' },
      { done:false, text:'Frontend: Arena page + challenge flow + ELO display' },
    ],
  },
  'Player Trading': {
    phase:'Phase 7', status:'planned',
    summary:'Item marketplace ระหว่างผู้เล่น',
    effort:'3-4 สัปดาห์',
    priority:'🟡 กลาง — เพิ่ม economy depth แต่ต้องระวัง duplication exploit',
    todos:[
      { done:false, text:'Trade Request: ส่ง offer item A แลก item B โดยตรง' },
      { done:false, text:'Marketplace Listing: วาง item ให้คนอื่น bid gold' },
      { done:false, text:'Anti-exploit: validate item ownership ก่อน transfer ทุกครั้ง' },
      { done:false, text:'Trade History log: เก็บทุก transaction ใน Firestore' },
      { done:false, text:'Trade Tax: 5% gold cut ป้องกัน gold duplication' },
    ],
  },
  'Chat in-game': {
    phase:'Phase 7', status:'planned',
    summary:'Global / Guild chat system ใน game',
    effort:'2-3 สัปดาห์',
    priority:'🟡 กลาง — social feature ที่ดี แต่ TikTok Live comment ทำหน้าที่นี้แทนได้บางส่วน',
    todos:[
      { done:false, text:'WebSocket chat channel: global + guild namespace' },
      { done:false, text:'Emote system: shortcode → emoji (เช่น :sword: → ⚔️)' },
      { done:false, text:'Message moderation: auto-filter + manual ban' },
      { done:false, text:'Chat bubble ใน battle screen สำหรับ quick emotes' },
    ],
  },
  'Friend System': {
    phase:'Phase 7', status:'planned',
    summary:'Friend list + co-op battle invite',
    effort:'2 สัปดาห์',
    priority:'🟢 ต่ำ — nice-to-have แต่ guild ควร priority กว่า',
    todos:[
      { done:false, text:'Friend Request: ส่ง/รับคำขอ เป็น friend' },
      { done:false, text:'Friend List page: ดู online status, level, last active' },
      { done:false, text:'Co-op Invite: ชวน friend ลง dungeon ด้วยกัน (shared loot)' },
      { done:false, text:'Friend Activity Feed: เห็นว่า friend ไป zone ไหน kill อะไร' },
    ],
  },

  // ── PLANNED: Phase 8 ──
  'New Zones (Lv.60-99)': {
    phase:'Phase 8', status:'planned',
    summary:'เพิ่ม zones สำหรับ end-game player (ปัจจุบัน cap ที่ vorath_citadel Lv.52)',
    effort:'3-4 สัปดาห์',
    priority:'🔴 สูงมาก — ผู้เล่น Lv.60+ ไม่มีที่ฟาร์ม จะ churn แน่นอน',
    todos:[
      { done:false, text:'Abyssal Void (Lv.60-75): void-type monsters, void resistance gear drop' },
      { done:false, text:"Vorath's Sanctum (Lv.76-99): post-game area หลังฆ่า Vorath แล้ว" },
      { done:false, text:'New monster data ใน monsters.js + zone config ใน ZONE_MONSTERS' },
      { done:false, text:'Frontend: zone unlock condition (ต้องผ่าน previous zone boss)' },
      { done:false, text:'Zone storyline: ทำไมมี zone ใหม่หลัง Vorath ตาย' },
    ],
  },
  'New Boss Types': {
    phase:'Phase 8', status:'planned',
    summary:'Boss รูปแบบใหม่ที่ท้าทายกว่า Vorath',
    effort:'2-3 สัปดาห์',
    priority:'🔴 สูง — boss variety ทำให้ game ไม่จำเจ',
    todos:[
      { done:false, text:'Elemental Dragon: phase 2 เปลี่ยน element ทุก 5 turns' },
      { done:false, text:'Void Titan: absorb player skills แล้วใช้กลับ (counter-meta)' },
      { done:false, text:'Undead Legion: boss spawn minion ทุก 3 turns' },
      { done:false, text:'Duo Boss: 2 boss ต่อสู้พร้อมกัน (ยากที่สุดใน game)' },
      { done:false, text:'Boss-specific loot table: unique legendary per boss type' },
    ],
  },
  'New Class (x5)': {
    phase:'Phase 8', status:'planned',
    summary:'เพิ่ม 5 class ใหม่ เน้น playstyle ที่ยังไม่มี',
    effort:'6-8 สัปดาห์',
    priority:'🟡 กลาง — content expansion ดี แต่ balance ยาก',
    todos:[
      { done:false, text:'Paladin: Holy shield + heal hybrid — tank ที่ support ได้' },
      { done:false, text:'Alchemist: Potion throwing combat — item-based attacker' },
      { done:false, text:'Summoner: multi-minion commander (ต่างจาก Necromancer ที่ undead)' },
      { done:false, text:'Dark Priest: AoE curse/debuff specialist — shadow healer' },
      { done:false, text:'Warlord: battlefield commander — buff allies, debuff enemies' },
      { done:false, text:'Balance test: 50 mock battles ต่อ class ก่อน release' },
    ],
  },
  'Legendary Equipment': {
    phase:'Phase 8', status:'planned',
    summary:'Tier สูงกว่า Epic — class-locked, ต้องหา recipe ก่อน',
    effort:'2 สัปดาห์',
    priority:'🟡 กลาง — endgame gear progression เพิ่ม replay value',
    todos:[
      { done:false, text:'Legendary tier ใน item schema (rarity: legendary)' },
      { done:false, text:'Recipe drop จาก Phase 8 boss เท่านั้น' },
      { done:false, text:'Class-lock requirement: WARRIOR legendary ใช้ได้เฉพาะ WARRIOR' },
      { done:false, text:'Unique passive per legendary: เช่น ดาบ "Soul Reaper" steal HP on kill' },
      { done:false, text:'Legendary forge: crafting station ใหม่ ต้องใช้ materials หายาก' },
    ],
  },
  'Story Chapters 2-3': {
    phase:'Phase 8', status:'planned',
    summary:'เรื่องราวต่อจาก Vorath defeated — antagonist ใหม่',
    effort:'3-4 สัปดาห์',
    priority:'🟢 ต่ำ — story ดีสำหรับ dedicated player แต่ไม่ urgent',
    todos:[
      { done:false, text:'Chapter 2: The Void Awakens — Vorath เป็นแค่ pawns ของ Void God' },
      { done:false, text:'Chapter 3: Return to Origin — ผู้เล่นกลับไปต้นกำเนิด Ashenveil' },
      { done:false, text:'New NPC: Seraph (ฝ่ายดีที่แท้จริง) + Null (antagonist ใหม่)' },
      { done:false, text:'Story quest chain 12 ตอน เชื่อมกับ Phase 8 zones' },
      { done:false, text:'Cutscene improvements: animated text + character art per NPC' },
    ],
  },
};

function RoadmapTab() {
  const [showCat, setShowCat] = React.useState(null);
  const [selectedFeature, setSelectedFeature] = React.useState(null);

  // ── Live overrides จาก Firestore ─────────────────────────────────────────
  const [overrides, setOverrides] = React.useState({});       // { 'Feature': { status, note, completedAt, updatedAt } }
  const [loadingRM, setLoadingRM] = React.useState(true);
  const [lastSync, setLastSync] = React.useState(null);

  // edit state สำหรับ detail panel
  const [editStatus, setEditStatus] = React.useState('');
  const [editNote, setEditNote]     = React.useState('');
  const [saving, setSaving]         = React.useState(false);
  const [saveOk, setSaveOk]         = React.useState(false);

  // โหลด overrides จาก API
  const loadOverrides = React.useCallback(() => {
    setLoadingRM(true);
    api.get('/api/game/audit/roadmap')
      .then(r => {
        setOverrides(r.data?.features || {});
        setLastSync(new Date());
      })
      .catch(() => {})
      .finally(() => setLoadingRM(false));
  }, []);

  React.useEffect(() => { loadOverrides(); }, [loadOverrides]);

  // เมื่อเลือก feature — seed edit state จาก override หรือ default
  React.useEffect(() => {
    if (!selectedFeature) return;
    const ov = overrides[selectedFeature];
    const def = FEATURE_DETAILS[selectedFeature];
    setEditStatus(ov?.status || def?.status || 'planned');
    setEditNote(ov?.note || '');
    setSaveOk(false);
  }, [selectedFeature, overrides]);

  // บันทึก override ไป Firestore
  async function saveOverride() {
    if (!selectedFeature) return;
    setSaving(true);
    try {
      await api.post('/api/game/audit/roadmap', {
        feature: selectedFeature,
        status: editStatus,
        note: editNote,
      });
      setOverrides(prev => ({
        ...prev,
        [selectedFeature]: {
          status: editStatus,
          note: editNote,
          updatedAt: new Date().toISOString(),
          completedAt: editStatus === 'done' ? (prev[selectedFeature]?.completedAt || new Date().toISOString()) : null,
        },
      }));
      setLastSync(new Date());
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch { toast.error('บันทึกไม่ได้'); }
    finally { setSaving(false); }
  }

  // helper: effective status ของ feature (override > default)
  function effectiveStatus(featureName) {
    return overrides[featureName]?.status || FEATURE_DETAILS[featureName]?.status || 'planned';
  }

  const allFeatures = COMPETITOR_FEATURES.flatMap(c => c.features);
  const avgScore = Math.round(allFeatures.reduce((s,f)=>s+f.score,0)/allFeatures.length);
  const done = allFeatures.filter(f=>f.score>=70).length;
  const gaps = allFeatures.filter(f=>f.score<40).length;

  const STATUS_COLOR = { done:'#34d399', in_progress:'#f59e0b', current:'#f59e0b', planned:'#818cf8' };
  const STATUS_LABEL = { done:'✅ Done', in_progress:'🔨 In Progress', current:'🔨 In Progress', planned:'📋 Planned' };

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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700 }}>📍 Roadmap Progress</div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {lastSync && <span style={{ color:'#374151', fontSize:10 }}>sync {timeAgo(lastSync.toISOString())}</span>}
            <button onClick={loadOverrides} style={{ background:'transparent', border:'1px solid #374151',
              color:'#6b7280', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11 }}>
              {loadingRM ? '…' : '↻ sync'}
            </button>
            <span style={{ color:'#4b5563', fontSize:11 }}>คลิก feature เพื่อแก้สถานะ / ดูรายละเอียด</span>
          </div>
        </div>
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
                  {p.items.map(item => {
                    const isSelected = selectedFeature === item;
                    const hasDetail = !!FEATURE_DETAILS[item];
                    const eff = effectiveStatus(item);  // live status จาก Firestore
                    const baseColor = eff==='done'?'#34d399':eff==='in_progress'?'#f59e0b':eff==='planned'?'#6b7280':'#6b7280';
                    const ov = overrides[item];  // มี override จาก Firestore ไหม
                    return (
                      <span key={item}
                        onClick={() => hasDetail && setSelectedFeature(isSelected ? null : item)}
                        title={hasDetail ? 'คลิกเพื่อดูรายละเอียด / แก้สถานะ' : ''}
                        style={{
                          background: isSelected ? baseColor + '33' : '#111827',
                          color: baseColor,
                          border: isSelected ? `1px solid ${baseColor}` : ov ? `1px solid ${baseColor}44` : '1px solid transparent',
                          borderRadius:6, padding:'3px 10px', fontSize:11,
                          cursor: hasDetail ? 'pointer' : 'default',
                          transition:'all .15s',
                          userSelect:'none',
                        }}>
                        {eff==='done'?'✓ ':eff==='in_progress'?'⚙ ':''}{item}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Detail Panel */}
      {selectedFeature && FEATURE_DETAILS[selectedFeature] && (() => {
        const d = FEATURE_DETAILS[selectedFeature];
        const ov = overrides[selectedFeature];
        const liveStatus = editStatus || effectiveStatus(selectedFeature);
        const col = liveStatus==='done'?'#34d399':liveStatus==='in_progress'?'#f59e0b':'#818cf8';
        const isDone = liveStatus === 'done';
        const isInProgress = liveStatus === 'in_progress';

        // ถ้า override เป็น 'done' ให้แสดง improvements แม้ default จะเป็น planned
        const showImprovements = d.improvements && isDone;
        const showTodos = d.todos && !isDone;

        return (
          <div style={{ ...card, border:`1px solid ${col}44`, position:'relative' }}>
            {/* close button */}
            <button onClick={()=>setSelectedFeature(null)}
              style={{ position:'absolute', top:12, right:12, background:'transparent', border:'none',
                color:'#4b5563', cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>

            {/* Header */}
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:16, paddingRight:32 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ color:col, fontWeight:800, fontSize:16 }}>{selectedFeature}</span>
                  <span style={{ ...badge(col) }}>{d.phase}</span>
                  {ov?.updatedAt && (
                    <span style={{ color:'#374151', fontSize:10 }}>
                      อัปเดต {timeAgo(ov.updatedAt)}
                    </span>
                  )}
                </div>
                <div style={{ color:'#9ca3af', fontSize:12 }}>{d.summary}</div>
              </div>
            </div>

            {/* ── Status Editor ──────────────────────────────────────────────── */}
            <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginBottom:18,
              padding:'12px 14px', background:'#1f2937', borderRadius:10 }}>
              <div style={{ flex:'0 0 auto' }}>
                <div style={{ color:'#6b7280', fontSize:10, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>สถานะ</div>
                <select value={editStatus} onChange={e=>setEditStatus(e.target.value)}
                  style={{ background:'#111827', border:`1px solid ${col}44`, borderRadius:8,
                    color:'#e5e7eb', padding:'7px 12px', fontSize:13, cursor:'pointer' }}>
                  <option value="planned">📋 Planned</option>
                  <option value="in_progress">🔨 In Progress</option>
                  <option value="done">✅ Done</option>
                </select>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'#6b7280', fontSize:10, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>
                  บันทึก / progress note
                </div>
                <input type="text" value={editNote} onChange={e=>setEditNote(e.target.value)}
                  placeholder="เช่น: deploy วันที่ 25 เม.ย. / กำลัง implement backend..."
                  style={{ width:'100%', background:'#111827', border:'1px solid #374151', borderRadius:8,
                    color:'#e5e7eb', padding:'7px 12px', fontSize:13, boxSizing:'border-box' }} />
              </div>
              <button onClick={saveOverride} disabled={saving}
                style={{ padding:'8px 20px', borderRadius:8, border:'none',
                  background: saveOk ? '#34d399' : col, color:'#000',
                  fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0,
                  opacity: saving ? 0.6 : 1, transition:'background .3s' }}>
                {saving ? '…' : saveOk ? '✓ บันทึกแล้ว' : 'บันทึก'}
              </button>
            </div>

            {/* ── ถ้า Done → แสดง improvement suggestions ──────────────────── */}
            {showImprovements && (
              <div>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, marginBottom:10,
                  textTransform:'uppercase', letterSpacing:1 }}>💡 แนะนำการพัฒนาต่อ</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {d.improvements.map((imp,i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px',
                      background:'#1f2937', borderRadius:8, alignItems:'flex-start' }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{imp.icon}</span>
                      <span style={{ color:'#d1d5db', fontSize:12, lineHeight:1.5 }}>{imp.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ถ้า Planned / In Progress → แสดง todo checklist ─────────── */}
            {showTodos && (
              <div>
                {d.effort && (
                  <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
                    <div style={{ padding:'6px 14px', background:'#1f2937', borderRadius:8, fontSize:12 }}>
                      <span style={{ color:'#6b7280' }}>⏱ ประมาณ: </span>
                      <span style={{ color:'#e5e7eb', fontWeight:700 }}>{d.effort}</span>
                    </div>
                    {d.priority && (
                      <div style={{ padding:'6px 14px', background:'#1f2937', borderRadius:8, fontSize:12, flex:1 }}>
                        <span style={{ color:'#6b7280' }}>Priority: </span>
                        <span style={{ color:'#e5e7eb' }}>{d.priority}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, marginBottom:10,
                  textTransform:'uppercase', letterSpacing:1 }}>
                  {isInProgress ? '⚙ กำลังทำ — สิ่งที่ต้องทำ' : '📋 สิ่งที่ต้องทำ'}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {d.todos.map((t,i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px',
                      background:'#1f2937', borderRadius:8, alignItems:'flex-start' }}>
                      <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{t.done ? '✅' : '⬜'}</span>
                      <span style={{ color: t.done ? '#6b7280' : '#d1d5db', fontSize:12,
                        lineHeight:1.5, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                    </div>
                  ))}
                </div>
                {d.next && (
                  <div style={{ marginTop:10, padding:'8px 14px', background:'#34d39911', borderRadius:8,
                    border:'1px solid #34d39944', color:'#34d399', fontSize:12 }}>✔ {d.next}</div>
                )}
              </div>
            )}

            {/* ── ถ้า mark เป็น done แต่ default เป็น planned → แสดง todo ด้วย ── */}
            {isDone && d.todos && (
              <div style={{ marginTop:16 }}>
                <div style={{ color:'#374151', fontSize:11, fontWeight:700, marginBottom:8,
                  textTransform:'uppercase', letterSpacing:1 }}>✅ Checklist ที่ครอบคลุม</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {d.todos.map((t,i) => (
                    <div key={i} style={{ display:'flex', gap:8, padding:'6px 10px',
                      borderRadius:6, alignItems:'flex-start' }}>
                      <span style={{ fontSize:12, flexShrink:0, color:'#374151' }}>✓</span>
                      <span style={{ color:'#4b5563', fontSize:11, lineHeight:1.5, textDecoration:'line-through' }}>{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

// ─── DatabaseTab ──────────────────────────────────────────────────────────────
const TYPE_COLOR = { beast:'#f59e0b', human:'#60a5fa', undead:'#a78bfa', void:'#818cf8',
  elemental:'#34d399', demon:'#f87171', spirit:'#c084fc', construct:'#94a3b8' };
const RANK_COLOR = { S:'#f59e0b', A:'#f87171', B:'#60a5fa', C:'#4ade80', D:'#94a3b8' };

// ─── Balance Simulator ────────────────────────────────────────────────────────
// SIM_CLASSES — ค่าจาก CLASS_BASE_STATS + LIMIT_BREAKS จริงในเกม (21 อาชีพ)
// baseATK/DEF/HP/MP: ค่าจาก account.js CLASS_BASE_STATS
// sigMult:           ค่าจาก combat.js LIMIT_BREAKS[class].dmgMult
// weaponTier/basicMult/sigMP: sim parameter (ปรับได้ใน admin)
const SIM_CLASSES = [
  // baseATK = ใช้สำหรับ physical classes
  // baseMAG = ใช้สำหรับ magic classes (magic:true) — ใน simRun จะใช้ baseMAG แทน baseATK
  // ค่า mag จาก CLASS_BASE_STATS จริงใน account.js
  { name:'Warrior',     baseATK:22, baseMAG:5,  baseDEF:18, baseHP:150, baseMP:40,  sigMult:2.5, sigMP:25, basicMult:0.90, magic:false, weaponTier:3 },
  { name:'Rogue',       baseATK:20, baseMAG:8,  baseDEF:12, baseHP:110, baseMP:60,  sigMult:2.5, sigMP:28, basicMult:1.10, magic:false, weaponTier:3 },
  { name:'Cleric',      baseATK:14, baseMAG:20, baseDEF:14, baseHP:120, baseMP:100, sigMult:2.5, sigMP:40, basicMult:0.70, magic:true,  weaponTier:1 },
  { name:'Ranger',      baseATK:20, baseMAG:10, baseDEF:12, baseHP:115, baseMP:70,  sigMult:2.5, sigMP:30, basicMult:1.00, magic:false, weaponTier:3 },
  { name:'Mage',        baseATK:10, baseMAG:30, baseDEF:8,  baseHP:90,  baseMP:130, sigMult:3.5, sigMP:45, basicMult:1.00, magic:true,  weaponTier:1 },
  { name:'Bard',        baseATK:14, baseMAG:22, baseDEF:12, baseHP:110, baseMP:90,  sigMult:2.5, sigMP:38, basicMult:0.85, magic:true,  weaponTier:1 },
  { name:'Berserker',   baseATK:28, baseMAG:3,  baseDEF:14, baseHP:170, baseMP:30,  sigMult:3.0, sigMP:30, basicMult:1.10, magic:false, weaponTier:3 },
  { name:'Engineer',    baseATK:18, baseMAG:12, baseDEF:20, baseHP:130, baseMP:60,  sigMult:2.5, sigMP:30, basicMult:1.00, magic:false, weaponTier:3 },
  { name:'Runesmith',   baseATK:16, baseMAG:18, baseDEF:18, baseHP:120, baseMP:80,  sigMult:2.5, sigMP:35, basicMult:0.90, magic:false, weaponTier:3 },
  { name:'Assassin',    baseATK:25, baseMAG:8,  baseDEF:10, baseHP:100, baseMP:70,  sigMult:3.5, sigMP:28, basicMult:1.20, magic:false, weaponTier:4 },
  { name:'Hexblade',    baseATK:18, baseMAG:22, baseDEF:12, baseHP:105, baseMP:100, sigMult:2.5, sigMP:42, basicMult:0.90, magic:true,  weaponTier:2 },
  { name:'Phantom',     baseATK:15, baseMAG:28, baseDEF:8,  baseHP:115, baseMP:110, sigMult:2.5, sigMP:45, basicMult:0.90, magic:true,  weaponTier:1 },
  { name:'Deathknight', baseATK:22, baseMAG:12, baseDEF:16, baseHP:140, baseMP:60,  sigMult:2.5, sigMP:30, basicMult:0.90, magic:false, weaponTier:3 },
  { name:'Necromancer', baseATK:10, baseMAG:32, baseDEF:8,  baseHP:95,  baseMP:130, sigMult:3.0, sigMP:50, basicMult:0.80, magic:true,  weaponTier:1 },
  { name:'Gravecaller', baseATK:12, baseMAG:28, baseDEF:10, baseHP:115, baseMP:110, sigMult:2.5, sigMP:45, basicMult:0.90, magic:true,  weaponTier:1 },
  { name:'Voidwalker',  baseATK:20, baseMAG:20, baseDEF:10, baseHP:120, baseMP:100, sigMult:2.5, sigMP:35, basicMult:1.00, magic:false, weaponTier:3 },
  { name:'Rifter',      baseATK:24, baseMAG:15, baseDEF:8,  baseHP:105, baseMP:90,  sigMult:2.5, sigMP:28, basicMult:1.10, magic:false, weaponTier:4 },
  { name:'Soulseer',    baseATK:8,  baseMAG:30, baseDEF:9,  baseHP:90,  baseMP:120, sigMult:2.5, sigMP:45, basicMult:0.90, magic:true,  weaponTier:1 },
  { name:'Wildguard',   baseATK:24, baseMAG:5,  baseDEF:16, baseHP:145, baseMP:50,  sigMult:2.5, sigMP:30, basicMult:0.90, magic:false, weaponTier:3 },
  { name:'Tracker',     baseATK:20, baseMAG:8,  baseDEF:12, baseHP:115, baseMP:65,  sigMult:3.0, sigMP:28, basicMult:1.10, magic:false, weaponTier:3 },
  { name:'Shaman',      baseATK:14, baseMAG:22, baseDEF:12, baseHP:110, baseMP:100, sigMult:2.5, sigMP:42, basicMult:0.90, magic:true,  weaponTier:2 },
];
// SIM_ZONES — ค่าเฉลี่ยจาก monster จริงในฐานข้อมูล (excl. mini-boss)
// ATK city_ruins ปรับลง (excl. shadow_rogue 110 → ค่าเฉลี่ยทั่วไป)
// ATK vorath_citadel ปรับลง (excl. void_priest 460 / abyssal_dragon 520)
const SIM_ZONES = [
  { name:'Town Outskirts', monHP:300,  monATK:22,  monDEF:6,  level:1  },
  { name:'Forest Path',    monHP:580,  monATK:36,  monDEF:12, level:5  },
  { name:'Dark Cave',      monHP:750,  monATK:45,  monDEF:17, level:10 },
  { name:'City Ruins',     monHP:548,  monATK:65,  monDEF:18, level:15 },
  { name:'Cursed Marsh',   monHP:1200, monATK:100, monDEF:27, level:22 },
  { name:'Void Frontier',  monHP:2100, monATK:175, monDEF:32, level:33 },
  { name:'Shadowfell',     monHP:2600, monATK:230, monDEF:44, level:45 },
  { name:'Vorath Citadel', monHP:1600, monATK:265, monDEF:67, level:55 },
];
// SIM_BASELINE — ค่าจริงจาก combat.js (อัปเดตอัตโนมัติผ่าน combatConstants API)
// cr=0.10, cm=1.50, scm=2.20, scr=cr/3≈0.0333
const SIM_BASELINE = {
  defK:1.0, defCap:0.75, magCap:0.20,
  cr:0.10, cm:1.50, scr:+(0.10/3).toFixed(4), scm:2.20,
  mpR:8,
  wt:[0,8,16,28,45,68],
  zScale:[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0],
};

function simCalcDR(def, atk, defK, cap) {
  return Math.min(cap, (def * defK) / (def * defK + atk));
}
function simCalcECrit(cr, cm, scr, scm) {
  return (1 - cr) * 1.0 + (cr - scr) * cm + scr * scm;
}
function simRun(cls, zone, pr, classIdx) {
  const weapATK = pr.wt[cls.weaponTier] || 0;
  // magic classes ใช้ MAG stat (baseMAG) แทน ATK — ตรงกับ combat.js: max(1, mag - def*0.15)
  const rawATK  = cls.magic ? (cls.baseMAG || 0) + weapATK : cls.baseATK + weapATK;
  const sigMult = pr.classSigMult[classIdx ?? 0] || cls.sigMult;
  const cap     = cls.magic ? pr.magCap : pr.defCap;
  const monDR   = simCalcDR(zone.monDEF, rawATK, pr.defK, cap);
  const eCrit   = simCalcECrit(pr.cr, pr.cm, pr.scr, pr.scm);
  const sigDmg  = rawATK * sigMult * (1 - monDR) * eCrit;
  const basicDmg= rawATK * cls.basicMult * (1 - monDR) * eCrit;
  const N       = Math.ceil(cls.sigMP / pr.mpR);
  const avgDPS  = (sigDmg + (N - 1) * basicDmg) / N;
  const adjMonATK = zone.monATK * pr.zScale[SIM_ZONES.indexOf(zone)];
  const playerDR  = simCalcDR(cls.baseDEF, adjMonATK, pr.defK, pr.defCap);
  const monDMG    = adjMonATK * (1 - playerDR);
  const adjMonHP  = zone.monHP * pr.zScale[SIM_ZONES.indexOf(zone)];
  const TTK  = avgDPS > 0 ? Math.ceil(adjMonHP / avgDPS) : 999;
  const TSF  = monDMG > 0 ? Math.floor(cls.baseHP / monDMG) : 999;
  const ratio = TTK > 0 ? TSF / TTK : 0;
  return { avgDPS, TTK, TSF, ratio, monDMG, sigDmg, basicDmg, N, adjMonHP };
}
function simRatioColor(r) {
  if (r < 0.8)  return '#ef4444';
  if (r < 1.2)  return '#f97316';
  if (r < 1.5)  return '#f59e0b';
  if (r < 2.5)  return '#84cc16';
  if (r < 4.0)  return '#22c55e';
  return '#10b981';
}
function simBgColor(r) {
  const c = simRatioColor(r);
  return c + '22';
}

function BalanceSimTab() {
  const [defK,    setDefK]    = useState(SIM_BASELINE.defK);
  const [defCap,  setDefCap]  = useState(SIM_BASELINE.defCap);
  const [magCap,  setMagCap]  = useState(SIM_BASELINE.magCap);
  const [cr,      setCr]      = useState(SIM_BASELINE.cr);
  const [cm,      setCm]      = useState(SIM_BASELINE.cm);
  const [scr,     setScr]     = useState(SIM_BASELINE.scr);
  const [scm,     setScm]     = useState(SIM_BASELINE.scm);
  const [mpR,     setMpR]     = useState(SIM_BASELINE.mpR);
  const [wt,      setWt]      = useState([...SIM_BASELINE.wt]);
  const [zScale,  setZScale]  = useState([...SIM_BASELINE.zScale]);
  const [sigMults,setSigMults]= useState(SIM_CLASSES.map(c => c.sigMult));
  const [view,    setView]    = useState('ratio');
  const [selZone, setSelZone] = useState(0);
  const [popup,   setPopup]   = useState(null);
  const [showFormula, setShowFormula] = useState(false);
  const [liveClasses, setLiveClasses] = useState(SIM_CLASSES);

  // ── Load real game constants from API when tab mounts ──────────────────────
  useEffect(() => {
    api.get('/api/game/audit/gamedata').then(r => {
      const cc  = r.data?.combatConstants;
      const cls = r.data?.classData;
      if (cc) {
        setDefK(v  => v);          // defK is sim param, keep as-is
        setCr(cc.cr);
        setCm(cc.cm);
        setScr(+(cc.cr / cc.scrDiv).toFixed(4));
        setScm(cc.scm);
      }
      if (cls && Array.isArray(cls) && cls.length) {
        // Merge real class data (baseATK/DEF/HP/MP + sigMult + magic) with sim params
        const merged = cls.map(c => ({
          name:       c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase(),
          baseATK:    c.baseATK,
          baseDEF:    c.baseDEF,
          baseHP:     c.baseHP,
          baseMP:     c.baseMP,
          sigMult:    c.sigMult,
          sigMP:      c.sigMP,
          basicMult:  c.basicMult,
          magic:      c.magic,
          weaponTier: c.weaponTier,
        }));
        setLiveClasses(merged);
        setSigMults(merged.map(c => c.sigMult));
      }
    }).catch(() => {/* silent — fall back to SIM_BASELINE */});
  }, []);

  const pr = { defK, defCap, magCap, cr, cm, scr, scm, mpR, wt, zScale, classSigMult: sigMults };
  const matrix = liveClasses.map((cls, ci) => SIM_ZONES.map(zone => simRun(cls, zone, pr, ci)));

  // Balance metrics
  const allRatios = matrix.flatMap(row => row.map(m => m.ratio));
  const allDPS    = matrix.flatMap(row => row.map(m => m.avgDPS));
  const meanDPS   = allDPS.reduce((a,b) => a+b, 0) / allDPS.length;
  const stdDPS    = Math.sqrt(allDPS.map(v => (v-meanDPS)**2).reduce((a,b)=>a+b,0) / allDPS.length);
  const cv        = stdDPS / meanDPS;
  const parityScore = Math.max(0, 100 - cv * 200);
  const inRange   = allRatios.filter(r => r >= 1.2 && r <= 4.0).length;
  const diffScore = (inRange / allRatios.length) * 100;
  const balScore  = Math.round((parityScore + diffScore) / 2);
  const avgRatio  = allRatios.reduce((a,b)=>a+b,0) / allRatios.length;
  const minRatio  = Math.min(...allRatios);

  const issues = [];
  if (minRatio < 0.8) issues.push({ t:'crit', m:`Min ratio ${minRatio.toFixed(2)} — บางอาชีพตายก่อนฆ่า mob ได้` });
  else if (minRatio < 1.2) issues.push({ t:'warn', m:`Min ratio ${minRatio.toFixed(2)} — อยู่บนขอบอันตราย` });
  if (cv > 0.5) issues.push({ t:'crit', m:`DPS spread CV=${cv.toFixed(2)} — ความต่างอาชีพสูงมาก` });
  else if (cv > 0.3) issues.push({ t:'warn', m:`DPS spread CV=${cv.toFixed(2)} — มีความต่างพอสังเกต` });
  const overpowered = liveClasses.filter((_,ci) => SIM_ZONES.every((_,zi) => matrix[ci][zi].ratio > 4.5));
  if (overpowered.length) issues.push({ t:'warn', m:`${overpowered.map(c=>c.name).join(', ')} แข็งแกร่งเกินทุก zone` });
  const underpowered = liveClasses.filter((_,ci) => SIM_ZONES.some((_,zi) => matrix[ci][zi].ratio < 1.0));
  if (underpowered.length) issues.push({ t:'crit', m:`${underpowered.map(c=>c.name).join(', ')} ไม่รอดใน บาง zone` });
  if (balScore >= 75) issues.push({ t:'ok', m:'สมดุลอยู่ในเกณฑ์ดี ไม่พบปัญหาหลัก' });
  if (!issues.length) issues.push({ t:'ok', m:'ไม่พบปัญหาวิกฤต' });

  const scoreColor = balScore > 70 ? '#22c55e' : balScore > 50 ? '#f59e0b' : '#ef4444';
  const minColor   = minRatio < 1 ? '#ef4444' : minRatio < 1.5 ? '#f59e0b' : '#22c55e';
  const cvColor    = cv < 0.3 ? '#22c55e' : cv < 0.5 ? '#f59e0b' : '#ef4444';

  const sliderStyle = { accentColor:'#f59e0b', width:'100%', height:4, cursor:'pointer' };
  const inputStyle  = { background:'#0a0a0a', border:'1px solid #374151', borderRadius:6, color:'#9ca3af', padding:'4px 8px', fontSize:11, width:'100%', cursor:'pointer' };
  const sectionCard = { ...card, marginBottom:16 };
  const tabBtn = (k) => ({
    padding:'6px 14px', border:'none', borderRadius:6, fontSize:12, cursor:'pointer',
    background: view===k ? '#f59e0b22' : 'transparent',
    color: view===k ? '#f59e0b' : '#6b7280',
    fontWeight: view===k ? 700 : 400,
  });
  const issueStyle = (t) => ({
    padding:'6px 10px', borderRadius:6, marginBottom:6, fontSize:12,
    borderLeft: `3px solid ${t==='crit'?'#ef4444':t==='warn'?'#f59e0b':'#22c55e'}`,
    background: t==='crit'?'#ef444411':t==='warn'?'#f59e0b11':'#22c55e11',
    color: t==='crit'?'#fca5a5':t==='warn'?'#fcd34d':'#86efac',
  });

  function resetAll() {
    setDefK(SIM_BASELINE.defK); setDefCap(SIM_BASELINE.defCap); setMagCap(SIM_BASELINE.magCap);
    setCr(SIM_BASELINE.cr); setCm(SIM_BASELINE.cm); setScr(SIM_BASELINE.scr); setScm(SIM_BASELINE.scm);
    setMpR(SIM_BASELINE.mpR);
    setWt([...SIM_BASELINE.wt]);
    setZScale([1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0]);
    setSigMults(liveClasses.map(c => c.sigMult));
  }

  // Gauge arc drawing via canvas ref
  const gaugeRef = useRef(null);
  useEffect(() => {
    const c = gaugeRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 120, 70);
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(60, 62, 48, Math.PI, 2*Math.PI); ctx.stroke();
    ctx.strokeStyle = scoreColor; ctx.lineWidth = 10;
    const ang = Math.PI + Math.PI * (balScore / 100);
    ctx.beginPath(); ctx.arc(60, 62, 48, Math.PI, ang); ctx.stroke();
    ctx.fillStyle = scoreColor; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(balScore, 60, 56);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#6b7280';
    ctx.fillText('/100', 60, 68);
  }, [balScore, scoreColor]);

  // DPS chart values for selected zone
  const dpsData = liveClasses
    .map((c,ci) => ({ name:c.name, dps: matrix[ci][selZone].avgDPS }))
    .sort((a,b) => b.dps - a.dps);
  const maxDPS = dpsData[0]?.dps || 1;

  const slRow = (label, val, min, max, step, setter, fmt, key) => (
    <div key={key || label} style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:11, color:'#9ca3af' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>{fmt ? fmt(val) : val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => setter(parseFloat(e.target.value))} style={sliderStyle} />
    </div>
  );

  return (
    <div style={{ color:'#e5e7eb' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#f59e0b', letterSpacing:1 }}>⚖️ Balance Simulator</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>จำลองผลกระทบต่อสมดุลเกมแบบ real-time — สูตร expected-value combat model</div>
        </div>
        <button onClick={resetAll} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #374151',
          color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:13 }}>
          ↺ Reset baseline
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16 }}>

        {/* ── Left panel: sliders ── */}
        <div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Defense system</div>
            {slRow('DEF factor k', defK, 0.1, 3, 0.05, setDefK, v => v.toFixed(2))}
            {slRow('DEF cap (physical)', defCap, 0.3, 0.9, 0.01, setDefCap, v => v.toFixed(2))}
            {slRow('DEF cap (magic)', magCap, 0.1, 0.5, 0.01, setMagCap, v => v.toFixed(2))}
          </div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Crit system</div>
            {slRow('Crit rate', cr, 0.02, 0.4, 0.01, setCr, v => Math.round(v*100)+'%')}
            {slRow('Crit multiplier', cm, 1.2, 3, 0.05, setCm, v => v.toFixed(2)+'×')}
            {slRow('Super-crit rate', scr, 0, 0.2, 0.005, setScr, v => Math.round(v*100)+'%')}
            {slRow('Super-crit mult', scm, 2, 6, 0.1, setScm, v => v.toFixed(2)+'×')}
          </div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>MP & rotation</div>
            {slRow('MP regen / turn', mpR, 3, 20, 1, setMpR, v => Math.round(v))}
          </div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Weapon ATK (Tier 1–5)</div>
            {[1,2,3,4,5].map(i => slRow(`T${i}`, wt[i], i===1?4:i===2?10:i===3?18:i===4?30:50, i===1?20:i===2?30:i===3?50:i===4?70:100, 1,
              v => { const nw=[...wt]; nw[i]=Math.round(v); setWt(nw); }, v => Math.round(v), 'wt'+i))}
          </div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Monster ATK scale (zone 1–6)</div>
            {SIM_ZONES.map((z,i) => slRow(z.name, zScale[i], 0.5, 8, 0.05,
              v => { const nz=[...zScale]; nz[i]=v; setZScale(nz); }, v => v.toFixed(2)+'×', 'zs'+i))}
          </div>
          <div style={sectionCard}>
            <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Class signature mult</div>
            {liveClasses.map((c,i) => slRow(c.name, sigMults[i], 0.5, 6, 0.05,
              v => { const nm=[...sigMults]; nm[i]=v; setSigMults(nm); }, v => v.toFixed(2)+'×', 'csm'+i))}
          </div>
        </div>

        {/* ── Right panel: output ── */}
        <div>
          {/* Score cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'Balance score', val: balScore, color: scoreColor, suffix:'' },
              { label:'Avg ratio TSF/TTK', val: avgRatio.toFixed(1), color:'#e5e7eb', suffix:'' },
              { label:'Min ratio', val: minRatio.toFixed(2), color: minColor, suffix:'' },
              { label:'DPS parity', val: Math.round(parityScore), color: cvColor, suffix:'' },
            ].map(m => (
              <div key={m.label} style={{ background:'#111827', border:'1px solid #1f2937', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#6b7280', marginBottom:4 }}>{m.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:m.color }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* Gauge + Issues */}
          <div style={{ ...sectionCard, display:'flex', gap:16, alignItems:'flex-start' }}>
            <canvas ref={gaugeRef} width={120} height={70} />
            <div style={{ flex:1 }}>
              {issues.map((iss,i) => (
                <div key={i} style={issueStyle(iss.t)}>{iss.m}</div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div style={sectionCard}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#e5e7eb' }}>Class × Zone heatmap</div>
              <div style={{ display:'flex', gap:4 }}>
                {['ratio','ttk','dps'].map(v => (
                  <button key={v} onClick={() => setView(v)} style={tabBtn(v)}>
                    {v==='ratio'?'TSF/TTK':v==='ttk'?'TTK':'DPS'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', width:'100%', fontSize:11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', padding:'4px 8px', color:'#6b7280', fontWeight:500 }}>Class \ Zone</th>
                    {SIM_ZONES.map(z => (
                      <th key={z.name} style={{ padding:'4px 6px', color:'#6b7280', fontWeight:500, textAlign:'center', whiteSpace:'nowrap' }}>{z.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveClasses.map((cls, ci) => (
                    <tr key={cls.name}>
                      <td style={{ padding:'3px 8px', fontWeight:600, color:'#e5e7eb', whiteSpace:'nowrap' }}>{cls.name}</td>
                      {SIM_ZONES.map((zone, zi) => {
                        const m = matrix[ci][zi];
                        let displayVal, cellColor;
                        if (view === 'ratio') {
                          displayVal = m.ratio.toFixed(1);
                          cellColor  = simRatioColor(m.ratio);
                        } else if (view === 'ttk') {
                          displayVal = m.TTK;
                          cellColor  = m.TTK < 5 ? '#22c55e' : m.TTK < 15 ? '#84cc16' : m.TTK < 25 ? '#f59e0b' : '#ef4444';
                        } else {
                          const maxZ = Math.max(...liveClasses.map((_,cj) => matrix[cj][zi].avgDPS));
                          const t = m.avgDPS / maxZ;
                          cellColor = t > 0.8 ? '#22c55e' : t > 0.5 ? '#84cc16' : t > 0.3 ? '#f59e0b' : '#f97316';
                          displayVal = m.avgDPS.toFixed(0);
                        }
                        return (
                          <td key={zone.name}
                            onClick={() => setPopup({ ci, zi, m, cls, zone })}
                            style={{ padding:'4px 6px', textAlign:'center', cursor:'pointer', borderRadius:4,
                              background: cellColor + '22', color: cellColor, fontWeight:600,
                              transition:'filter .1s' }}
                            onMouseEnter={e => e.currentTarget.style.filter='brightness(1.3)'}
                            onMouseLeave={e => e.currentTarget.style.filter='brightness(1)'}>
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* legend */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:10, color:'#6b7280' }}>ต่ำ</span>
              <div style={{ flex:1, height:6, borderRadius:3,
                background:'linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)' }} />
              <span style={{ fontSize:10, color:'#6b7280' }}>สูง</span>
            </div>
          </div>

          {/* DPS bar chart */}
          <div style={sectionCard}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#e5e7eb' }}>DPS comparison —</div>
              <select value={selZone} onChange={e => setSelZone(parseInt(e.target.value))}
                style={{ ...inputStyle, width:'auto', padding:'4px 8px' }}>
                {SIM_ZONES.map((z,i) => <option key={i} value={i}>{z.name}</option>)}
              </select>
            </div>
            {dpsData.map(d => (
              <div key={d.name} style={{ marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>{d.name}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#e5e7eb' }}>{d.dps.toFixed(1)}</span>
                </div>
                <div style={{ height:8, background:'#1f2937', borderRadius:4, overflow:'hidden' }}>
                  <div style={{
                    width:`${(d.dps/maxDPS)*100}%`, height:'100%', borderRadius:4,
                    background: d.dps/maxDPS > 0.8 ? '#22c55e' : d.dps/maxDPS > 0.5 ? '#84cc16' : d.dps/maxDPS > 0.3 ? '#f59e0b' : '#f97316',
                    transition:'width .3s',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Formula reference */}
          <div style={sectionCard}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#e5e7eb' }}>Formula reference</div>
              <button onClick={() => setShowFormula(v => !v)}
                style={{ fontSize:11, color:'#6b7280', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                {showFormula ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
            {showFormula && (
              <div style={{ marginTop:10, fontSize:11, color:'#9ca3af', lineHeight:1.8,
                fontFamily:'system-ui', background:'#0a0a0a', borderRadius:8, padding:'12px 14px' }}>
                <b style={{ color:'#f59e0b' }}>Defense reduction:</b><br/>
                <code style={{ color:'#34d399' }}>DR = min(defCap, DEF×k / (DEF×k + ATK))</code><br/>
                Magic: <code style={{ color:'#34d399' }}>DR = min(magicCap, DEF×k / (DEF×k + ATK))</code><br/><br/>
                <b style={{ color:'#f59e0b' }}>Expected crit multiplier:</b><br/>
                <code style={{ color:'#34d399' }}>E[C] = (1-cr)×1.0 + (cr-scr)×critMult + scr×superCritMult</code><br/><br/>
                <b style={{ color:'#f59e0b' }}>Damage per hit:</b><br/>
                <code style={{ color:'#34d399' }}>finalDmg = (baseATK + weaponATK) × skillMult × (1−DR) × E[C]</code><br/><br/>
                <b style={{ color:'#f59e0b' }}>Skill rotation DPS:</b><br/>
                <code style={{ color:'#34d399' }}>N = ceil(sigMP / mpRegen)  ← รอบ sig skill</code><br/>
                <code style={{ color:'#34d399' }}>avgDPS = (sigDmg + (N−1)×basicDmg) / N</code><br/><br/>
                <b style={{ color:'#f59e0b' }}>Balance ratios:</b><br/>
                <code style={{ color:'#34d399' }}>TTK = ceil(monHP / avgDPS)</code><br/>
                <code style={{ color:'#34d399' }}>TSF = floor(playerHP / monDmgPerTurn)</code><br/>
                <code style={{ color:'#34d399' }}>ratio = TSF / TTK  (ideal ≈ 1.5–3.0)</code><br/><br/>
                <b style={{ color:'#f59e0b' }}>Balance score:</b><br/>
                <code style={{ color:'#34d399' }}>parityScore = max(0, 100 − CV×200)</code><br/>
                <code style={{ color:'#34d399' }}>diffScore% = zones in ratio [1.2–4.0] / total</code><br/>
                <code style={{ color:'#34d399' }}>balanceScore = (parityScore + diffScore) / 2</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup detail */}
      {popup && (
        <div onClick={() => setPopup(null)}
          style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(0,0,0,.5)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#111827', border:'1px solid #374151', borderRadius:12, padding:'20px 24px',
              minWidth:280, maxWidth:340 }}>
            <div style={{ fontWeight:800, fontSize:15, color:'#f59e0b', marginBottom:12 }}>
              {popup.cls.name} vs {popup.zone.name}
            </div>
            {[
              ['TSF/TTK ratio', popup.m.ratio.toFixed(2), simRatioColor(popup.m.ratio)],
              ['TTK (turns)', popup.m.TTK, '#e5e7eb'],
              ['TSF (turns)', popup.m.TSF, '#e5e7eb'],
              ['Avg DPS', popup.m.avgDPS.toFixed(1), '#60a5fa'],
              ['Mon DMG/turn', popup.m.monDMG.toFixed(1), '#f87171'],
              ['Sig skill dmg', popup.m.sigDmg.toFixed(1), '#a78bfa'],
              ['Basic dmg', popup.m.basicDmg.toFixed(1), '#94a3b8'],
              ['Rotation N', popup.m.N + ' turns', '#6b7280'],
            ].map(([k,v,col]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                <span style={{ color:'#6b7280' }}>{k}</span>
                <span style={{ fontWeight:700, color: col }}>{v}</span>
              </div>
            ))}
            <button onClick={() => setPopup(null)}
              style={{ marginTop:10, width:'100%', padding:'7px', borderRadius:8, border:'1px solid #374151',
                color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:12 }}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseTab() {
  const [subTab,    setSubTab]    = useState('monsters');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [loadErr,   setLoadErr]   = useState(null);
  const [search,    setSearch]    = useState('');
  const [zoneFilter,setZoneFilter]= useState('all');
  const [typeFilter,setTypeFilter]= useState('all');
  const [selected,  setSelected]  = useState(null);

  const loadData = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setLoadErr(null);
    api.get('/api/game/audit/gamedata')
      .then(r => { setData(r.data); setLoadErr(null); })
      .catch(err => {
        const status = err?.response?.status;
        const msg    = err?.response?.data?.error || err?.message || 'unknown';
        console.error('[DatabaseTab] gamedata error', status, msg);
        setLoadErr(`${status ? status + ' — ' : ''}${msg}`);
        toast.error(`gamedata: ${status || 'error'} ${msg.slice(0,60)}`);
      })
      .finally(() => setLoading(false));
  }, [loading]);

  useEffect(() => { if (!data && !loading) loadData(); }, []);

  const exportJSON = (key) => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data[key], null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `ashenveil_${key}_${new Date().toISOString().slice(0,10)}.json`; a.click();
  };

  const inputStyle = { background:'#111827', border:'1px solid #374151', borderRadius:8,
    padding:'6px 12px', color:'#e5e7eb', fontSize:13, outline:'none' };
  const thStyle = { padding:'8px 12px', textAlign:'left', color:'#6b7280', fontSize:11,
    fontWeight:700, letterSpacing:'0.05em', borderBottom:'1px solid #1f2937', whiteSpace:'nowrap' };
  const tdStyle = { padding:'8px 12px', fontSize:12, borderBottom:'1px solid #111827', verticalAlign:'middle' };

  // ── Monster sub-tab ──
  const MonsterView = () => {
    if (!data) return null;
    const zones = [...new Set(data.monsters.map(m => m.zone))].sort();
    const types = [...new Set(data.monsters.map(m => m.type).filter(Boolean))].sort();
    const filtered = data.monsters.filter(m => {
      const q = search.toLowerCase();
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.monsterId.includes(q);
      const matchZ = zoneFilter === 'all' || m.zone === zoneFilter;
      const matchT = typeFilter === 'all' || m.type === typeFilter;
      return matchQ && matchZ && matchT;
    });

    return (
      <div>
        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา monster..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <select style={inputStyle} value={zoneFilter} onChange={e => { setZoneFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Zone</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select style={inputStyle} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Type</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} / {data.monsters.length} monsters</span>
          <button onClick={() => exportJSON('monsters')}
            style={{ marginLeft:'auto', ...inputStyle, color:'#34d399', cursor:'pointer', border:'1px solid #34d39944' }}>
            ⬇ Export JSON
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap:16 }}>
          {/* Table */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d1117' }}>
                  {['','ชื่อ','Zone','Lv','HP','ATK','DEF','SPD','Type','XP','Gold'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.monsterId}
                    onClick={() => setSelected(selected?.monsterId === m.monsterId ? null : m)}
                    style={{ cursor:'pointer', background: selected?.monsterId === m.monsterId ? '#1a2235' : 'transparent',
                      transition:'background .1s' }}
                    onMouseEnter={e => { if (selected?.monsterId !== m.monsterId) e.currentTarget.style.background = '#111827'; }}
                    onMouseLeave={e => { if (selected?.monsterId !== m.monsterId) e.currentTarget.style.background = 'transparent'; }}>
                    <td style={tdStyle}>{m.emoji}</td>
                    <td style={{ ...tdStyle, color:'#e5e7eb', fontWeight:600 }}>
                      {m.name}{m.isBoss && <span style={{ ...badge('#f59e0b'), marginLeft:6, fontSize:9 }}>BOSS</span>}
                      {m.rank && <span style={{ ...badge(RANK_COLOR[m.rank]||'#6b7280'), marginLeft:4, fontSize:9 }}>{m.rank}</span>}
                    </td>
                    <td style={{ ...tdStyle, color:'#6b7280', fontSize:11 }}>{m.zone}</td>
                    <td style={{ ...tdStyle, color:'#f59e0b' }}>{m.level}</td>
                    <td style={{ ...tdStyle, color:'#f87171' }}>{m.hp}</td>
                    <td style={{ ...tdStyle, color:'#fb923c' }}>{m.atk}</td>
                    <td style={{ ...tdStyle, color:'#60a5fa' }}>{m.def}</td>
                    <td style={{ ...tdStyle, color:'#4ade80' }}>{m.spd}</td>
                    <td style={tdStyle}>
                      {m.type && <span style={{ ...badge(TYPE_COLOR[m.type]||'#6b7280'), fontSize:10 }}>{m.type}</span>}
                    </td>
                    <td style={{ ...tdStyle, color:'#a78bfa' }}>{m.xpReward}</td>
                    <td style={{ ...tdStyle, color:'#fbbf24', fontSize:11 }}>{m.goldMin}–{m.goldMax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ ...card, borderColor:'#374151', position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ fontSize:28, marginBottom:4 }}>{selected.emoji}</div>
              <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:11, marginBottom:12 }}>{selected.monsterId}</div>
              {selected.desc && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:12, lineHeight:1.6 }}>{selected.desc}</p>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {[['Level','#f59e0b',selected.level],['HP','#f87171',selected.hp],
                  ['ATK','#fb923c',selected.atk],['DEF','#60a5fa',selected.def],
                  ['SPD','#4ade80',selected.spd],['Flee','#9ca3af',`${Math.round((selected.flee_chance||0)*100)}%`],
                  ['XP','#a78bfa',selected.xpReward],['Gold','#fbbf24',`${selected.goldMin}–${selected.goldMax}`],
                ].map(([l,c,v]) => (
                  <div key={l} style={{ background:'#0d1117', borderRadius:6, padding:'6px 10px' }}>
                    <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                    <div style={{ color:c, fontWeight:700, fontSize:14 }}>{v}</div>
                  </div>
                ))}
              </div>

              {selected.drops.length > 0 && (<>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>DROP TABLE (เฉพาะตัว)</div>
                {selected.drops.map((d,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12,
                    padding:'4px 0', borderBottom:'1px solid #111827' }}>
                    <span style={{ color:'#e5e7eb' }}>{d.itemId}</span>
                    <span style={{ color:'#f59e0b' }}>{Math.round(d.chance*100)}%</span>
                  </div>
                ))}
              </>)}

              {selected.zonePool && (<>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, margin:'12px 0 6px', letterSpacing:'0.06em' }}>
                  ZONE POOL (Tier {selected.zonePool.tier} — {Math.round(selected.zonePool.equipChance*100)}% ต่อ kill)
                </div>
                <div style={{ color:'#4b5563', fontSize:10, marginBottom:6 }}>
                  อุปกรณ์ ({selected.zonePool.equipment.length} ชิ้น):
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                  {selected.zonePool.equipment.map((id,i) => (
                    <span key={i} style={{ background:'#1f2937', borderRadius:4, padding:'2px 6px',
                      fontSize:11, color:'#d1d5db', border:'1px solid #374151' }}>{id}</span>
                  ))}
                </div>
                {selected.zonePool.materials.length > 0 && (<>
                  <div style={{ color:'#4b5563', fontSize:10, marginBottom:4 }}>วัตถุดิบ:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {selected.zonePool.materials.map((id,i) => (
                      <span key={i} style={{ background:'#111827', borderRadius:4, padding:'2px 6px',
                        fontSize:11, color:'#9ca3af', border:'1px solid #1f2937' }}>{id}</span>
                    ))}
                  </div>
                </>)}
              </>)}

              {selected.attackMsg.length > 0 && (<>
                <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, margin:'12px 0 6px', letterSpacing:'0.06em' }}>ATTACK MSGS</div>
                {selected.attackMsg.map((msg,i) => (
                  <div key={i} style={{ color:'#9ca3af', fontSize:12, padding:'2px 0' }}>• {msg}</div>
                ))}
              </>)}

              <button onClick={() => setSelected(null)}
                style={{ marginTop:16, width:'100%', background:'#1f2937', border:'none',
                  borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>
                ✕ ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── NPC sub-tab ──
  const NpcView = () => {
    if (!data) return null;
    const zones = [...new Set(data.npcs.map(n => n.zone))].sort();
    const filtered = data.npcs.filter(n => {
      const q = search.toLowerCase();
      return !q || n.name.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q) || n.zone?.includes(q);
    }).filter(n => zoneFilter === 'all' || n.zone === zoneFilter);

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา NPC..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <select style={inputStyle} value={zoneFilter} onChange={e => { setZoneFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Zone</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} / {data.npcs.length} NPCs</span>
          <button onClick={() => exportJSON('npcs')}
            style={{ marginLeft:'auto', ...inputStyle, color:'#34d399', cursor:'pointer', border:'1px solid #34d39944' }}>
            ⬇ Export JSON
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap:16 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d1117' }}>
                  {['','ชื่อ','Title','Zone','Shop','Likes','Hates','Decay/day'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.npcId}
                    onClick={() => setSelected(selected?.npcId === n.npcId ? null : n)}
                    style={{ cursor:'pointer', background: selected?.npcId === n.npcId ? '#1a2235' : 'transparent' }}
                    onMouseEnter={e => { if (selected?.npcId !== n.npcId) e.currentTarget.style.background = '#111827'; }}
                    onMouseLeave={e => { if (selected?.npcId !== n.npcId) e.currentTarget.style.background = 'transparent'; }}>
                    <td style={tdStyle}>{n.emoji}</td>
                    <td style={{ ...tdStyle, color:'#e5e7eb', fontWeight:600 }}>{n.name}</td>
                    <td style={{ ...tdStyle, color:'#9ca3af', fontSize:11 }}>{n.title}</td>
                    <td style={{ ...tdStyle, color:'#6b7280', fontSize:11 }}>{n.zone}</td>
                    <td style={tdStyle}>{n.isShopkeeper ? <span style={badge('#34d399')}>🏪 Shop</span> : '—'}</td>
                    <td style={{ ...tdStyle, fontSize:11, color:'#fbbf24' }}>{n.likes?.slice(0,3).join(', ')}{n.likes?.length>3?'…':''}</td>
                    <td style={{ ...tdStyle, fontSize:11, color:'#f87171' }}>{n.hates?.slice(0,3).join(', ')}{n.hates?.length>3?'…':''}</td>
                    <td style={{ ...tdStyle, color:'#6b7280' }}>{n.decayPerDay ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div style={{ ...card, borderColor:'#374151', position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ fontSize:28 }}>{selected.emoji}</div>
              <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:11, marginBottom:8 }}>{selected.title} · {selected.zone}</div>
              {selected.personality && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:12, lineHeight:1.6, fontStyle:'italic' }}>"{selected.personality}"</p>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                {[['Affection +like','#fbbf24',`+${selected.likeBonus}`],
                  ['Affection -hate','#f87171',`-${selected.hatePenalty}`],
                  ['Decay/day','#6b7280',selected.decayPerDay],
                  ['Decay floor','#6b7280',selected.decayFloor],
                ].map(([l,c,v]) => (
                  <div key={l} style={{ background:'#0d1117', borderRadius:6, padding:'5px 8px' }}>
                    <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                    <div style={{ color:c, fontWeight:700, fontSize:13 }}>{v}</div>
                  </div>
                ))}
              </div>

              {selected.likes?.length > 0 && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>❤️ LIKES</div>
                  <div style={{ fontSize:11, color:'#fbbf24' }}>{selected.likes.join(', ')}</div>
                </div>
              )}
              {selected.hates?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>💔 HATES</div>
                  <div style={{ fontSize:11, color:'#f87171' }}>{selected.hates.join(', ')}</div>
                </div>
              )}

              {Object.keys(selected.dialogs).length > 0 && (<>
                <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>DIALOG BY AFFECTION</div>
                {Object.entries(selected.dialogs).map(([aff, lines]) => (
                  <div key={aff} style={{ marginBottom:8 }}>
                    <div style={{ color:'#f59e0b', fontSize:10, fontWeight:700, marginBottom:2 }}>≥ {aff}</div>
                    {(Array.isArray(lines) ? lines : [lines]).map((l,i) =>
                      <div key={i} style={{ color:'#9ca3af', fontSize:11, padding:'2px 0', lineHeight:1.5 }}>"{l}"</div>)}
                  </div>
                ))}
              </>)}

              {selected.bondDesc && (
                <div style={{ marginTop:10, padding:'8px', background:'#1f2937', borderRadius:6,
                  fontSize:11, color:'#a78bfa', border:'1px solid #4b5563' }}>
                  💝 {selected.bondDesc}
                </div>
              )}

              <button onClick={() => setSelected(null)}
                style={{ marginTop:16, width:'100%', background:'#1f2937', border:'none',
                  borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>
                ✕ ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Map/Zone sub-tab ──
  const MapView = () => {
    if (!data) return null;
    const filtered = data.zones.filter(z => {
      const q = search.toLowerCase();
      return !q || z.name.toLowerCase().includes(q) || z.nameTH?.includes(q) || z.zoneId.includes(q);
    });

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา zone..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} / {data.zones.length} zones</span>
          <button onClick={() => exportJSON('zones')}
            style={{ marginLeft:'auto', ...inputStyle, color:'#34d399', cursor:'pointer', border:'1px solid #34d39944' }}>
            ⬇ Export JSON
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap:16 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d1117' }}>
                  {['','Zone','ชื่อไทย','Lv Range','Fight','Explore','Monsters','NPCs','Boss'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(z => (
                  <tr key={z.zoneId}
                    onClick={() => setSelected(selected?.zoneId === z.zoneId ? null : z)}
                    style={{ cursor:'pointer', background: selected?.zoneId === z.zoneId ? '#1a2235' : 'transparent' }}
                    onMouseEnter={e => { if (selected?.zoneId !== z.zoneId) e.currentTarget.style.background = '#111827'; }}
                    onMouseLeave={e => { if (selected?.zoneId !== z.zoneId) e.currentTarget.style.background = 'transparent'; }}>
                    <td style={tdStyle}>{z.icon}</td>
                    <td style={{ ...tdStyle, color:'#e5e7eb', fontWeight:600 }}>{z.name}</td>
                    <td style={{ ...tdStyle, color:'#9ca3af', fontSize:11 }}>{z.nameTH}</td>
                    <td style={{ ...tdStyle, color:'#f59e0b' }}>
                      {z.levelMin === z.levelMax ? z.levelMin : `${z.levelMin}–${z.levelMax}`}
                    </td>
                    <td style={tdStyle}>{z.canFight ? <span style={badge('#f87171')}>⚔️</span> : '—'}</td>
                    <td style={tdStyle}>{z.canExplore ? <span style={badge('#34d399')}>🔍</span> : '—'}</td>
                    <td style={{ ...tdStyle, color:'#fb923c' }}>{z.monsters.length}</td>
                    <td style={{ ...tdStyle, color:'#60a5fa' }}>{z.npcs.length}</td>
                    <td style={tdStyle}>{z.zoneBossId ? <span style={badge('#a78bfa')}>👑</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div style={{ ...card, borderColor:'#374151', position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ fontSize:28 }}>{selected.icon}</div>
              <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:12, marginBottom:12 }}>{selected.nameTH} · {selected.zoneId}</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                {[['Level Range','#f59e0b',`${selected.levelMin}–${selected.levelMax}`],
                  ['Min Level','#6b7280',selected.minLevel ?? '—'],
                  ['Can Fight','#f87171',selected.canFight ? 'ใช่' : 'ไม่'],
                  ['Can Explore','#34d399',selected.canExplore ? 'ใช่' : 'ไม่'],
                ].map(([l,c,v]) => (
                  <div key={l} style={{ background:'#0d1117', borderRadius:6, padding:'5px 8px' }}>
                    <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                    <div style={{ color:c, fontWeight:700, fontSize:13 }}>{v}</div>
                  </div>
                ))}
              </div>

              {selected.monsters.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>⚔️ MONSTERS</div>
                  <div style={{ fontSize:11, color:'#fb923c' }}>{selected.monsters.join(', ')}</div>
                </div>
              )}
              {selected.npcs.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>💬 NPCs</div>
                  <div style={{ fontSize:11, color:'#60a5fa' }}>{selected.npcs.join(', ')}</div>
                </div>
              )}
              {selected.zoneBossId && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>👑 ZONE BOSS</div>
                  <div style={{ fontSize:12, color:'#a78bfa' }}>{selected.zoneBossId}</div>
                </div>
              )}
              {selected.connections.length > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:4 }}>🔗 CONNECTIONS</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{selected.connections.join(' → ')}</div>
                </div>
              )}
              {selected.events.length > 0 && (<>
                <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>EXPLORE EVENTS</div>
                {selected.events.map(e => (
                  <div key={e.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11,
                    padding:'3px 0', borderBottom:'1px solid #111827' }}>
                    <span style={{ color:'#9ca3af' }}>{e.type}</span>
                    <span style={{ color:'#6b7280' }}>w:{e.weight}</span>
                  </div>
                ))}
              </>)}
              {selected.atmosphere.length > 0 && (<>
                <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, margin:'10px 0 6px', letterSpacing:'0.06em' }}>ATMOSPHERE</div>
                {selected.atmosphere.slice(0,2).map((a,i) =>
                  <div key={i} style={{ color:'#9ca3af', fontSize:11, padding:'2px 0', fontStyle:'italic' }}>"{a}"</div>)}
              </>)}

              <button onClick={() => setSelected(null)}
                style={{ marginTop:16, width:'100%', background:'#1f2937', border:'none',
                  borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>
                ✕ ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Item sub-tab ──
  const GRADE_COLOR = {
    COMMON:'#9ca3af', UNCOMMON:'#4ade80', RARE:'#60a5fa',
    EPIC:'#a78bfa', LEGENDARY:'#f59e0b',
  };
  const SLOT_LABEL = {
    MAIN_HAND:'⚔️ อาวุธ', OFF_HAND:'🛡️ โล่', HEAD:'⛑️ หมวก',
    CHEST:'🧥 เสื้อ', GLOVES:'🧤 ถุงมือ', LEGS:'👖 กางเกง',
    FEET:'👟 รองเท้า', RING_L:'💍 แหวน', CONSUMABLE:'🧪 สมุนไพร',
    MATERIAL:'📦 วัตถุดิบ', ENHANCE_MATERIAL:'⚒️ Enhancement', JUNK:'🗑️ ขยะ',
  };

  const ItemView = () => {
    const [gradeFilter, setGradeFilter] = useState('all');
    const [typeFilter2, setTypeFilter2] = useState('all');
    if (!data?.items) return null;
    const grades = [...new Set(data.items.map(i => i.grade))].sort();
    const types  = [...new Set(data.items.map(i => i.type))].sort();
    const filtered = data.items.filter(it => {
      const q = search.toLowerCase();
      const matchQ = !q || it.name.toLowerCase().includes(q) || it.itemId.includes(q) || (it.desc||'').toLowerCase().includes(q);
      const matchG = gradeFilter === 'all' || it.grade === gradeFilter;
      const matchT = typeFilter2 === 'all' || it.type === typeFilter2;
      return matchQ && matchG && matchT;
    });

    return (
      <div>
        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา item..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <select style={inputStyle} value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Grade</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={inputStyle} value={typeFilter2} onChange={e => { setTypeFilter2(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Slot</option>
            {types.map(t => <option key={t} value={t}>{SLOT_LABEL[t] || t}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} / {data.items.length} items</span>
          <button onClick={() => exportJSON('items')}
            style={{ marginLeft:'auto', ...inputStyle, color:'#34d399', cursor:'pointer', border:'1px solid #34d39944' }}>
            ⬇ Export JSON
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap:16 }}>
          {/* Card Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(185px, 1fr))', gap:8, alignContent:'start' }}>
            {filtered.map(it => {
              const gc = GRADE_COLOR[it.grade] || '#6b7280';
              const isSelected = selected?.itemId === it.itemId;
              const statStr = Object.entries(it.base||{}).slice(0,3).map(([k,v]) => `${k.toUpperCase()}+${v}`).join(' · ');
              return (
                <div key={it.itemId}
                  onClick={() => setSelected(isSelected ? null : it)}
                  style={{
                    background: isSelected ? '#111d30' : '#0d1117',
                    border: `1px solid ${isSelected ? gc+'88' : gc+'22'}`,
                    borderRadius:8, padding:'10px 12px', cursor:'pointer',
                    transition:'all .15s',
                    boxShadow: isSelected ? `0 0 0 1px ${gc}44` : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = gc+'55'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = gc+'22'; }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:22, lineHeight:1 }}>{it.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:gc, fontWeight:700, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.name}</div>
                      <div style={{ display:'flex', gap:4, marginTop:2, flexWrap:'wrap' }}>
                        <span style={{ ...badge(gc), fontSize:9, padding:'1px 4px' }}>{it.grade}</span>
                        <span style={{ ...badge('#1f2937'), fontSize:9, padding:'1px 4px', color:'#6b7280' }}>{SLOT_LABEL[it.type]||it.type}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'#4ade80', marginBottom:4, minHeight:13 }}>{statStr || <span style={{ color:'#374151' }}>—</span>}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#6b7280' }}>
                    <span>Lv.<span style={{ color:'#f59e0b' }}>{it.levelReq}</span></span>
                    {it.buyPrice > 0 && <span>🛒<span style={{ color:'#f87171' }}>{it.buyPrice}G</span></span>}
                    {it.sellPrice > 0 && <span>💰<span style={{ color:'#fbbf24' }}>{it.sellPrice}G</span></span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ ...card, borderColor: GRADE_COLOR[selected.grade]+'44' || '#374151',
              position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ fontSize:32, marginBottom:4 }}>{selected.emoji}</div>
              <div style={{ color: GRADE_COLOR[selected.grade]||'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:11, marginBottom:4 }}>{selected.itemId}</div>
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ ...badge(GRADE_COLOR[selected.grade]||'#9ca3af'), fontSize:10 }}>{selected.grade}</span>
                <span style={{ ...badge('#374151'), fontSize:10 }}>{SLOT_LABEL[selected.type]||selected.type}</span>
                {selected.sockets > 0 && <span style={{ ...badge('#c084fc'), fontSize:10 }}>◈ {selected.sockets} socket</span>}
              </div>
              {selected.desc && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:12, lineHeight:1.6, fontStyle:'italic' }}>"{selected.desc}"</p>}

              {/* Stats */}
              {Object.keys(selected.base||{}).length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>BASE STATS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {Object.entries(selected.base).map(([k,v]) => (
                      <div key={k} style={{ background:'#0d1117', borderRadius:6, padding:'5px 8px' }}>
                        <div style={{ color:'#4b5563', fontSize:10 }}>{k.toUpperCase()}</div>
                        <div style={{ color:'#4ade80', fontWeight:700, fontSize:14 }}>+{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Roll ranges */}
              {Object.keys(selected.rolls||{}).length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>ROLL BONUS</div>
                  {Object.entries(selected.rolls).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'1px solid #111827' }}>
                      <span style={{ color:'#9ca3af' }}>{k}</span>
                      <span style={{ color:'#60a5fa' }}>{Array.isArray(v) ? `${v[0]}–${v[1]}` : v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Effect (consumables) */}
              {selected.effect && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>EFFECT</div>
                  {Object.entries(selected.effect).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'1px solid #111827' }}>
                      <span style={{ color:'#9ca3af' }}>{k}</span>
                      <span style={{ color:'#a78bfa' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Econ */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                {[['Req Level','#f59e0b', selected.levelReq],
                  ['Sockets','#c084fc', selected.sockets],
                  ['ขาย','#fbbf24', selected.sellPrice > 0 ? `${selected.sellPrice}G` : '—'],
                  ['ซื้อ','#f87171', selected.buyPrice > 0 ? `${selected.buyPrice}G` : '—'],
                ].map(([l,c,v]) => (
                  <div key={l} style={{ background:'#0d1117', borderRadius:6, padding:'5px 8px' }}>
                    <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                    <div style={{ color:c, fontWeight:700, fontSize:13 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Class req */}
              {selected.classReq?.length > 0 && (
                <div>
                  <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>CLASS REQ</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {selected.classReq.map(c => (
                      <span key={c} style={{ ...badge('#1f2937'), fontSize:10, color:'#9ca3af', border:'1px solid #374151' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setSelected(null)}
                style={{ marginTop:16, width:'100%', background:'#1f2937', border:'none',
                  borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>
                ✕ ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Skills Encyclopedia sub-tab ───────────────────────────────────────────
  const SkillsView = () => {
    const [classFilter, setClassFilter] = useState('all');
    if (!data?.skills) return null;
    const classes = data.skills.map(c => c.className).sort();
    const rows = data.skills
      .filter(c => classFilter === 'all' || c.className === classFilter)
      .flatMap(c => c.skills.map(s => ({ ...s, className: c.className })));
    const filtered = rows.filter(s => {
      const q = search.toLowerCase();
      return !q || s.name.toLowerCase().includes(q) || s.id.includes(q) || s.desc.toLowerCase().includes(q);
    });

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา skill..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <select style={inputStyle} value={classFilter} onChange={e => { setClassFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Class</option>
            {classes.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} skills</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap:16 }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#0d1117' }}>
                  {['Class','Skill','Lv.','SP Cost','MP','Damage','Type','Effect'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const isSelected = selected?.id === s.id && selected?.className === s.className;
                  const dmgStr = s.damage > 0 ? (s.multiHit ? `${s.damage}× ×${s.multiHit}` : `${s.damage}×`) : (s.selfBuff ? 'BUFF' : '—');
                  return (
                    <tr key={`${s.className}-${s.id}`}
                      onClick={() => setSelected(isSelected ? null : s)}
                      style={{ cursor:'pointer', background: isSelected ? '#1a2235' : i%2===0?'transparent':'#0d1117', transition:'background .1s' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#111827'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i%2===0?'transparent':'#0d1117'; }}>
                      <td style={{ ...tdStyle, color:'#f59e0b', fontWeight:700, fontSize:11 }}>{s.className.toUpperCase()}</td>
                      <td style={{ ...tdStyle, color:'#e5e7eb', fontWeight:600 }}>{s.name}</td>
                      <td style={{ ...tdStyle, color:'#818cf8' }}>{s.minLevel}</td>
                      <td style={{ ...tdStyle, color:'#a78bfa' }}>{s.skillPointCost} SP</td>
                      <td style={{ ...tdStyle, color:'#60a5fa' }}>{s.mpCost} MP</td>
                      <td style={{ ...tdStyle, color: s.magicDamage?'#c084fc':'#fb923c' }}>{dmgStr}</td>
                      <td style={tdStyle}>{s.magicDamage ? <span style={badge('#c084fc')}>MAG</span> : s.damage>0 ? <span style={badge('#fb923c')}>PHY</span> : '—'}</td>
                      <td style={{ ...tdStyle, fontSize:11 }}>
                        {s.effect && <span style={badge('#f87171')}>{s.effect.type}</span>}
                        {s.selfBuff && <span style={badge('#34d399')}>BUFF</span>}
                        {s.armorPierce && <span style={badge('#fbbf24')}>Pierce</span>}
                        {s.forceCrit && <span style={badge('#f59e0b')}>ForceCrit</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected && (
            <div style={{ ...card, borderColor:'#a78bfa44', position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ color:'#f59e0b', fontSize:11, fontWeight:700, marginBottom:4 }}>{selected.className?.toUpperCase()}</div>
              <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:11, marginBottom:10 }}>{selected.id}</div>
              {selected.desc && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:14, lineHeight:1.6 }}>{selected.desc}</p>}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                {[['Min Level','#818cf8',selected.minLevel],['SP Cost','#a78bfa',`${selected.skillPointCost} SP`],
                  ['MP Cost','#60a5fa',`${selected.mpCost} MP`],['Damage','#fb923c',selected.damage>0?`${selected.damage}×`:'—'],
                ].map(([l,c,v]) => (
                  <div key={l} style={{ background:'#0d1117', borderRadius:6, padding:'5px 8px' }}>
                    <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                    <div style={{ color:c, fontWeight:700, fontSize:14 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
                {selected.magicDamage && <span style={badge('#c084fc')}>MAG Damage</span>}
                {selected.multiHit && <span style={badge('#f59e0b')}>×{selected.multiHit} hits</span>}
                {selected.armorPierce && <span style={badge('#fbbf24')}>Armor Pierce</span>}
                {selected.forceCrit && <span style={badge('#f59e0b')}>Force Crit</span>}
              </div>

              {selected.effect && (
                <div style={{ marginBottom:10, padding:'8px 12px', background:'#7f1d1d22', borderRadius:8, border:'1px solid #f8717144' }}>
                  <div style={{ color:'#f87171', fontSize:11, fontWeight:700, marginBottom:4 }}>DEBUFF: {selected.effect.type}</div>
                  {Object.entries(selected.effect).filter(([k])=>k!=='type').map(([k,v]) =>
                    <div key={k} style={{ color:'#9ca3af', fontSize:11 }}>{k}: {String(v)}</div>)}
                </div>
              )}
              {selected.selfBuff && (
                <div style={{ marginBottom:10, padding:'8px 12px', background:'#14532d22', borderRadius:8, border:'1px solid #34d39944' }}>
                  <div style={{ color:'#34d399', fontSize:11, fontWeight:700, marginBottom:4 }}>SELF BUFF</div>
                  {Object.entries(selected.selfBuff).map(([k,v]) =>
                    <div key={k} style={{ color:'#9ca3af', fontSize:11 }}>{k}: {String(v)}</div>)}
                </div>
              )}
              {selected.bonusVsCC && (
                <div style={{ padding:'6px 10px', background:'#1f2937', borderRadius:8, fontSize:11, color:'#fbbf24' }}>
                  Bonus vs CC'd: {selected.bonusVsCC.multiplier}×
                </div>
              )}
              {selected.bonusVsType && (
                <div style={{ marginTop:6, padding:'6px 10px', background:'#1f2937', borderRadius:8, fontSize:11, color:'#fb923c' }}>
                  Bonus vs type: {JSON.stringify(selected.bonusVsType)}
                </div>
              )}
              <button onClick={() => setSelected(null)} style={{ marginTop:14, width:'100%', background:'#1f2937', border:'none', borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>✕ ปิด</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Crafting Recipes sub-tab ──────────────────────────────────────────────
  const CraftingView = () => {
    const [catFilter, setCatFilter] = useState('all');
    if (!data?.crafting) return null;
    const cats = [...new Set(data.crafting.map(r => r.category))].sort();
    const filtered = data.crafting.filter(r => {
      const q = search.toLowerCase();
      const matchQ = !q || r.name.toLowerCase().includes(q) || r.recipeId.includes(q) || r.resultItemId.includes(q);
      const matchC = catFilter === 'all' || r.category === catFilter;
      return matchQ && matchC;
    });

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา recipe..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <select style={inputStyle} value={catFilter} onChange={e => { setCatFilter(e.target.value); setSelected(null); }}>
            <option value="all">ทุก Category</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} recipes</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(r => {
              const isSelected = selected?.recipeId === r.recipeId;
              const GRADE_COLOR2 = { COMMON:'#9ca3af', UNCOMMON:'#4ade80', RARE:'#60a5fa', EPIC:'#a78bfa', LEGENDARY:'#f59e0b' };
              const gc = GRADE_COLOR2[r.resultGrade] || '#9ca3af';
              return (
                <div key={r.recipeId}
                  onClick={() => setSelected(isSelected ? null : r)}
                  style={{ ...card, cursor:'pointer', padding:'14px 18px', borderColor: isSelected ? gc+'66' : '#1f2937',
                    transition:'border-color .15s', background: isSelected ? '#0d1117' : '#111827' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:18 }}>{r.emoji}</span>
                        <span style={{ color:'#e5e7eb', fontWeight:700, fontSize:14 }}>{r.name}</span>
                        <span style={{ ...badge(gc), fontSize:10 }}>{r.resultGrade}</span>
                        <span style={{ ...badge('#374151'), fontSize:10 }}>{r.category}</span>
                        <span style={{ color:'#6b7280', fontSize:11 }}>Lv.{r.levelReq}+</span>
                      </div>
                      {r.desc && <div style={{ color:'#6b7280', fontSize:12, marginBottom:6 }}>{r.desc}</div>}
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {r.ingredients.map((ing, i) => (
                          <span key={i} style={{ background:'#1f2937', borderRadius:4, padding:'2px 8px',
                            fontSize:11, color:'#d1d5db', border:'1px solid #374151' }}>
                            {ing.itemId} ×{ing.qty}
                          </span>
                        ))}
                        {r.goldCost > 0 && <span style={{ background:'#78350f33', borderRadius:4, padding:'2px 8px',
                          fontSize:11, color:'#fbbf24', border:'1px solid #fbbf2444' }}>{r.goldCost} 🪙</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ color:'#9ca3af', fontSize:11, marginBottom:2 }}>→</div>
                      <div style={{ color: gc, fontWeight:700, fontSize:13 }}>{r.resultItemId}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div style={{ ...card, borderColor:'#374151', position:'sticky', top:80, height:'fit-content', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{selected.emoji}</div>
              <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
              <div style={{ color:'#6b7280', fontSize:11, marginBottom:10 }}>{selected.recipeId}</div>
              {selected.desc && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:12, lineHeight:1.6 }}>{selected.desc}</p>}

              <div style={{ marginBottom:12 }}>
                <div style={{ color:'#6b7280', fontSize:10, fontWeight:700, marginBottom:6, letterSpacing:'0.06em' }}>INGREDIENTS</div>
                {selected.ingredients.map((ing, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1f2937', fontSize:12 }}>
                    <span style={{ color:'#d1d5db' }}>{ing.itemId}</span>
                    <span style={{ color:'#f59e0b' }}>×{ing.qty}</span>
                  </div>
                ))}
                {selected.goldCost > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12 }}>
                    <span style={{ color:'#6b7280' }}>Gold Cost</span>
                    <span style={{ color:'#fbbf24' }}>{selected.goldCost} 🪙</span>
                  </div>
                )}
              </div>

              <div style={{ padding:'10px 12px', background:'#0d1117', borderRadius:8, marginBottom:8 }}>
                <div style={{ color:'#4b5563', fontSize:10, marginBottom:4 }}>RESULT</div>
                <div style={{ color:'#e5e7eb', fontWeight:700 }}>{selected.resultItemId}</div>
                <div style={{ color:'#6b7280', fontSize:11 }}>Grade: {selected.resultGrade} | Req Lv.{selected.levelReq}</div>
              </div>

              <button onClick={() => setSelected(null)} style={{ marginTop:10, width:'100%', background:'#1f2937', border:'none', borderRadius:6, padding:'8px', color:'#6b7280', cursor:'pointer', fontSize:12 }}>✕ ปิด</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Dungeons sub-tab ──────────────────────────────────────────────────────
  const DungeonsView = () => {
    if (!data?.dungeons) return null;
    const filtered = data.dungeons.filter(d => {
      const q = search.toLowerCase();
      return !q || d.name.toLowerCase().includes(q) || d.nameTH?.includes(q) || d.id.includes(q);
    });

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา dungeon..." value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }} />
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} dungeons</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : 'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
          {!selected && filtered.map(d => {
            const DIFF_COLOR = ['','#4ade80','#fbbf24','#fb923c','#f87171','#a78bfa','#f59e0b','#ef4444','#dc2626','#b91c1c'];
            const dc = DIFF_COLOR[d.difficulty] || '#6b7280';
            return (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ ...card, cursor:'pointer', transition:'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = dc + '66'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:24 }}>{d.emoji}</div>
                    <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:15, marginTop:4 }}>{d.name}</div>
                    <div style={{ color:'#6b7280', fontSize:12 }}>{d.nameTH} · {d.region}</div>
                  </div>
                  <span style={{ ...badge(dc) }}>★{d.difficulty} {d.difficultyLabel}</span>
                </div>
                <div style={{ color:'#9ca3af', fontSize:12, marginBottom:10, lineHeight:1.5 }}>{d.desc?.slice(0,100)}...</div>
                <div style={{ display:'flex', gap:10, fontSize:12 }}>
                  <span style={{ color:'#818cf8' }}>Lv.{d.minLevel}+</span>
                  <span style={{ color:'#f59e0b' }}>{d.totalRooms} ห้อง</span>
                  <span style={{ color:'#4b5563' }}>⏰ {d.clearCooldownHours}h CD</span>
                </div>
              </div>
            );
          })}

          {selected && (() => {
            const boss = selected.rooms?.find(r => r.type === 'boss');
            const ROOM_ICON = { combat:'⚔️', trap:'🕸️', treasure:'💎', rest:'💧', boss:'👑', npc:'💬' };
            const DIFF_COLOR2 = ['','#4ade80','#fbbf24','#fb923c','#f87171','#a78bfa','#f59e0b','#ef4444','#dc2626','#b91c1c'];
            const dc2 = DIFF_COLOR2[selected.difficulty] || '#6b7280';
            return (
              <>
                {/* Dungeon list (small) */}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {filtered.map(d => (
                    <div key={d.id} onClick={() => setSelected(d)}
                      style={{ ...card, cursor:'pointer', padding:'10px 14px', borderColor: selected?.id===d.id ? '#60a5fa44' : '#1f2937',
                        background: selected?.id===d.id ? '#0d1117' : '#111827' }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:18 }}>{d.emoji}</span>
                        <div>
                          <div style={{ color:'#e5e7eb', fontWeight:600, fontSize:13 }}>{d.name}</div>
                          <div style={{ color:'#4b5563', fontSize:11 }}>Lv.{d.minLevel}+ · {d.totalRooms} ห้อง</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detail panel */}
                <div style={{ ...card, borderColor: dc2 + '44', position:'sticky', top:80, height:'fit-content', maxHeight:'82vh', overflowY:'auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:28 }}>{selected.emoji}</div>
                      <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:16 }}>{selected.name}</div>
                      <div style={{ color:'#6b7280', fontSize:11 }}>{selected.nameTH} · {selected.region}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background:'transparent', border:'none', color:'#4b5563', cursor:'pointer', fontSize:18 }}>✕</button>
                  </div>

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                    <span style={{ ...badge(dc2) }}>★{selected.difficulty} {selected.difficultyLabel}</span>
                    <span style={{ ...badge('#818cf8') }}>Lv.{selected.minLevel}+</span>
                    <span style={{ ...badge('#374151') }}>{selected.totalRooms} ห้อง</span>
                    <span style={{ ...badge('#374151') }}>⏰ {selected.clearCooldownHours}h</span>
                  </div>

                  {selected.desc && <p style={{ color:'#9ca3af', fontSize:12, marginBottom:14, lineHeight:1.6 }}>{selected.desc}</p>}

                  <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, marginBottom:8, letterSpacing:'0.06em' }}>FLOOR MAP</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
                    {selected.rooms?.map(room => (
                      <div key={room.room} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 10px',
                        background: room.type==='boss' ? '#7f1d1d22' : '#1f2937', borderRadius:8,
                        borderLeft: `3px solid ${room.type==='boss'?'#f87171':room.type==='rest'?'#34d399':room.type==='treasure'?'#fbbf24':room.type==='trap'?'#fb923c':'#374151'}` }}>
                        <div style={{ minWidth:22, color:'#4b5563', fontSize:11, marginTop:1 }}>R{room.room+1}</div>
                        <div style={{ minWidth:20 }}>{ROOM_ICON[room.type] || '❓'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ color:'#e5e7eb', fontSize:12, fontWeight:600 }}>{room.name}</div>
                          {room.type === 'combat' && room.monsterId && <div style={{ color:'#fb923c', fontSize:11 }}>⚔️ {room.monsterId}</div>}
                          {room.type === 'trap' && room.trapDmg && <div style={{ color:'#f87171', fontSize:11 }}>💀 ดาเมจ {room.trapDmg}</div>}
                          {room.type === 'rest' && room.healPercent && <div style={{ color:'#34d399', fontSize:11 }}>💚 ฟื้นฟู {Math.round(room.healPercent*100)}% HP</div>}
                          {room.type === 'treasure' && room.gold && <div style={{ color:'#fbbf24', fontSize:11 }}>💰 {room.gold[0]}–{room.gold[1]} Gold</div>}
                          {room.boss && (
                            <div style={{ marginTop:4 }}>
                              <div style={{ color:'#f87171', fontWeight:700, fontSize:12 }}>👑 {room.boss.name}</div>
                              <div style={{ color:'#9ca3af', fontSize:11 }}>HP:{room.boss.hp} ATK:{room.boss.atk} DEF:{room.boss.def}</div>
                              <div style={{ color:'#34d399', fontSize:11 }}>XP:{room.boss.xpReward} Gold:{Array.isArray(room.boss.goldReward)?`${room.boss.goldReward[0]}–${room.boss.goldReward[1]}`:room.boss.goldReward}</div>
                              {room.boss.drops?.length > 0 && (
                                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                                  {room.boss.drops.map((d,i) => <span key={i} style={{ background:'#1f2937', borderRadius:4, padding:'1px 6px', fontSize:10, color:'#9ca3af' }}>{d.itemId} {Math.round(d.chance*100)}%</span>)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  // ── World Bosses sub-tab ──────────────────────────────────────────────────
  const WorldBossView = () => {
    if (!data?.worldBosses) return null;
    const filtered = data.worldBosses.filter(b => {
      const q = search.toLowerCase();
      return !q || b.name.toLowerCase().includes(q) || b.nameTH?.includes(q) || b.bossId.includes(q);
    });

    return (
      <div>
        <input style={{ ...inputStyle, width:200, marginBottom:16 }} placeholder="🔍 ค้นหา boss..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(b => (
            <div key={b.bossId} style={{ ...card, borderColor:'#f8717144' }}>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{ fontSize:48, lineHeight:1 }}>{b.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#f87171', fontWeight:800, fontSize:18 }}>{b.name}</div>
                  <div style={{ color:'#6b7280', fontSize:13, marginBottom:6 }}>{b.nameTH} · {b.bossId}</div>
                  {b.desc && <div style={{ color:'#9ca3af', fontSize:12, marginBottom:6 }}>{b.desc}</div>}
                  {b.lore && <div style={{ color:'#4b5563', fontSize:11, fontStyle:'italic', marginBottom:10 }}>"{b.lore}"</div>}

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                    {[['HP','#f87171',b.hp.toLocaleString()],['ATK','#fb923c',b.atk],['DEF','#60a5fa',b.def],['Time Limit','#818cf8',`${b.timeLimit}m`]].map(([l,c,v]) => (
                      <div key={l} style={{ background:'#0d1117', borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                        <div style={{ color:'#4b5563', fontSize:10 }}>{l}</div>
                        <div style={{ color:c, fontWeight:800, fontSize:16 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ color:'#6b7280', fontSize:11, fontWeight:700, marginBottom:8 }}>REWARDS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      { tier:'Participation', data: b.rewards.participation, color:'#374151' },
                      { tier:'🥈 Top 3',      data: b.rewards.top3,          color:'#9ca3af' },
                      { tier:'🥇 First Kill', data: b.rewards.first,         color:'#f59e0b' },
                    ].map(rw => (
                      <div key={rw.tier} style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px', border:`1px solid ${rw.color}44` }}>
                        <div style={{ color: rw.color, fontSize:11, fontWeight:700, marginBottom:6 }}>{rw.tier}</div>
                        <div style={{ color:'#fbbf24', fontSize:12 }}>🪙 {rw.data.gold.toLocaleString()}</div>
                        <div style={{ color:'#34d399', fontSize:12 }}>+{rw.data.xp.toLocaleString()} XP</div>
                        {rw.data.items?.length > 0 && <div style={{ color:'#9ca3af', fontSize:11 }}>📦 {rw.data.items.join(', ')}</div>}
                        {rw.data.title && <div style={{ color:'#a78bfa', fontSize:11, fontWeight:700 }}>👑 "{rw.data.title}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Achievements sub-tab ──────────────────────────────────────────────────
  const AchievementsView = () => {
    const [typeFilter, setTypeFilter2] = useState('all');
    if (!data?.achievements) return null;
    const types = [...new Set(data.achievements.map(a => a.type))].sort();
    const filtered = data.achievements.filter(a => {
      const q = search.toLowerCase();
      const matchQ = !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || a.id.includes(q);
      const matchT = typeFilter === 'all' || a.type === typeFilter;
      return matchQ && matchT;
    });

    const REWARD_COLORS = { gold:'#fbbf24', xp:'#34d399', title:'#a78bfa' };

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input style={{ ...inputStyle, width:200 }} placeholder="🔍 ค้นหา achievement..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <select style={inputStyle} value={typeFilter} onChange={e => setTypeFilter2(e.target.value)}>
            <option value="all">ทุก Type</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ color:'#4b5563', fontSize:12 }}>{filtered.length} / {data.achievements.length} achievements</span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0d1117' }}>
                {['Achievement','คำอธิบาย','Type','Target','Gold','XP','Title'].map(h =>
                  <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{ borderBottom:'1px solid #111827', background: i%2===0?'transparent':'#0d1117' }}>
                  <td style={{ ...tdStyle, color:'#e5e7eb', fontWeight:600, minWidth:160 }}>{a.name}</td>
                  <td style={{ ...tdStyle, color:'#9ca3af', fontSize:11 }}>{a.desc}</td>
                  <td style={tdStyle}><span style={badge('#60a5fa')}>{a.type}</span></td>
                  <td style={{ ...tdStyle, color:'#f59e0b', fontWeight:700 }}>{a.target?.toLocaleString()}</td>
                  <td style={{ ...tdStyle, color:'#fbbf24' }}>{a.reward?.gold ? `${a.reward.gold.toLocaleString()}🪙` : '—'}</td>
                  <td style={{ ...tdStyle, color:'#34d399' }}>{a.reward?.xp ? `+${a.reward.xp.toLocaleString()}` : '—'}</td>
                  <td style={{ ...tdStyle, color:'#a78bfa' }}>{a.reward?.title ? `"${a.reward.title}"` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Quests sub-tab ────────────────────────────────────────────────────────
  const QuestsView = () => {
    const [questCat, setQuestCat] = useState('story');
    if (!data?.quests) return null;

    const CAT_TABS = [
      { key:'story',  label:`📖 Story (${data.quests.story?.length || 0})` },
      { key:'side',   label:`📜 Side (${data.quests.side?.length || 0})` },
      { key:'daily',  label:`📅 Daily (${data.quests.daily?.length || 0})` },
      { key:'weekly', label:`🗓️ Weekly (${data.quests.weekly?.length || 0})` },
    ];

    const list = questCat === 'story' ? data.quests.story
               : questCat === 'side'  ? data.quests.side
               : questCat === 'daily' ? data.quests.daily
               : data.quests.weekly;

    const filtered = (list || []).filter(q => {
      const qs = search.toLowerCase();
      return !qs || (q.name||'').toLowerCase().includes(qs) || (q.desc||'').toLowerCase().includes(qs) || (q.id||'').includes(qs);
    });

    return (
      <div>
        <div style={{ display:'flex', gap:4, borderBottom:'1px solid #1f2937', marginBottom:16 }}>
          {CAT_TABS.map(t => (
            <button key={t.key} onClick={() => { setQuestCat(t.key); setSearch(''); }}
              style={{ padding:'8px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13,
                color: questCat===t.key ? '#f59e0b' : '#6b7280', fontWeight: questCat===t.key ? 700 : 400,
                borderBottom: questCat===t.key ? '2px solid #f59e0b' : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
          <input style={{ ...inputStyle, marginLeft:'auto', width:180 }} placeholder="🔍 ค้นหา..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {(questCat === 'daily' || questCat === 'weekly') && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(q => (
              <div key={q.id} style={{ ...card, padding:'12px 16px', borderColor:'#1f2937' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ color:'#e5e7eb', fontWeight:700, fontSize:14, marginBottom:4 }}>{q.name}</div>
                    <div style={{ color:'#6b7280', fontSize:12 }}>{q.desc}</div>
                    <div style={{ display:'flex', gap:8, marginTop:6, fontSize:11 }}>
                      <span style={{ ...badge('#60a5fa') }}>{q.type}</span>
                      <span style={{ color:'#f59e0b' }}>Target: {q.target}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {q.reward?.gold > 0 && <div style={{ color:'#fbbf24', fontSize:12 }}>🪙 {q.reward.gold.toLocaleString()}</div>}
                    {q.reward?.xp > 0 && <div style={{ color:'#34d399', fontSize:12 }}>+{q.reward.xp} XP</div>}
                    {q.reward?.rp > 0 && <div style={{ color:'#a78bfa', fontSize:12 }}>+{q.reward.rp} RP</div>}
                  </div>
                </div>
              </div>
            ))}
            {questCat === 'daily' && data.quests.dailyBonus && (
              <div style={{ ...card, borderColor:'#f59e0b44', padding:'12px 16px', background:'#78350f11' }}>
                <div style={{ color:'#f59e0b', fontWeight:700, fontSize:13, marginBottom:4 }}>🎁 DAILY BONUS (ทำครบทุก quest)</div>
                <div style={{ display:'flex', gap:12, fontSize:12 }}>
                  <span style={{ color:'#fbbf24' }}>🪙 {data.quests.dailyBonus.gold}</span>
                  <span style={{ color:'#34d399' }}>+{data.quests.dailyBonus.xp} XP</span>
                  {data.quests.dailyBonus.itemId && <span style={{ color:'#9ca3af' }}>📦 {data.quests.dailyBonus.itemId}</span>}
                </div>
              </div>
            )}
            {questCat === 'weekly' && data.quests.weeklyBonus && (
              <div style={{ ...card, borderColor:'#818cf844', padding:'12px 16px', background:'#1e1b4b11' }}>
                <div style={{ color:'#818cf8', fontWeight:700, fontSize:13, marginBottom:4 }}>🎁 WEEKLY BONUS (ทำครบทุก quest)</div>
                <div style={{ display:'flex', gap:12, fontSize:12 }}>
                  <span style={{ color:'#fbbf24' }}>🪙 {data.quests.weeklyBonus.gold}</span>
                  <span style={{ color:'#34d399' }}>+{data.quests.weeklyBonus.xp} XP</span>
                  {data.quests.weeklyBonus.rp > 0 && <span style={{ color:'#a78bfa' }}>+{data.quests.weeklyBonus.rp} RP</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {(questCat === 'story' || questCat === 'side') && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(q => {
              const isSelected = selected?.id === q.id;
              return (
                <div key={q.id}
                  onClick={() => setSelected(isSelected ? null : q)}
                  style={{ ...card, cursor:'pointer', padding:'14px 18px', borderColor: isSelected ? '#f59e0b44' : '#1f2937',
                    background: isSelected ? '#0d1117' : '#111827' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ color:'#e5e7eb', fontWeight:700, fontSize:14 }}>{q.name}</span>
                        {q.act && <span style={{ ...badge('#f59e0b') }}>Act {q.act}</span>}
                        {q.category && <span style={{ ...badge('#818cf8') }}>{q.category}</span>}
                        {q.npcId && <span style={{ ...badge('#34d399') }}>NPC: {q.npcId}</span>}
                      </div>
                      {q.desc && <div style={{ color:'#6b7280', fontSize:12, marginBottom:6 }}>{q.desc}</div>}
                      <div style={{ color:'#4b5563', fontSize:11 }}>{q.steps?.length || 0} steps</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, paddingLeft:12 }}>
                      {q.finalReward?.gold > 0 && <div style={{ color:'#fbbf24', fontSize:12 }}>🪙 {q.finalReward.gold.toLocaleString()}</div>}
                      {q.finalReward?.xp > 0 && <div style={{ color:'#34d399', fontSize:12 }}>+{q.finalReward.xp} XP</div>}
                      {q.finalReward?.rp > 0 && <div style={{ color:'#a78bfa', fontSize:12 }}>+{q.finalReward.rp} RP</div>}
                      {q.finalReward?.title && <div style={{ color:'#a78bfa', fontSize:11 }}>👑 "{q.finalReward.title}"</div>}
                    </div>
                  </div>

                  {isSelected && q.steps?.length > 0 && (
                    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:4 }}>
                      <div style={{ color:'#4b5563', fontSize:11, fontWeight:700, marginBottom:4, letterSpacing:'0.06em' }}>STEPS</div>
                      {q.steps.map((s, i) => (
                        <div key={i} style={{ display:'flex', gap:10, padding:'6px 10px', background:'#1f2937', borderRadius:6, alignItems:'flex-start' }}>
                          <span style={{ color:'#4b5563', fontSize:11, minWidth:20 }}>{i+1}.</span>
                          <div style={{ flex:1 }}>
                            <div style={{ color:'#9ca3af', fontSize:12 }}>{s.desc}</div>
                            <div style={{ display:'flex', gap:6, marginTop:2 }}>
                              <span style={{ ...badge('#374151'), fontSize:10 }}>{s.type}</span>
                              {s.target > 0 && <span style={{ color:'#f59e0b', fontSize:11 }}>target: {s.target}</span>}
                            </div>
                          </div>
                          {s.reward && (
                            <div style={{ fontSize:11, textAlign:'right', flexShrink:0 }}>
                              {s.reward.gold > 0 && <div style={{ color:'#fbbf24' }}>🪙{s.reward.gold}</div>}
                              {s.reward.xp > 0 && <div style={{ color:'#34d399' }}>+{s.reward.xp} XP</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && <div style={{ color:'#4b5563', padding:40, textAlign:'center' }}>ไม่พบข้อมูล</div>}
      </div>
    );
  };

  // ── Drop Lookup sub-tab (Reverse Drop Index) ──────────────────────────────
  const DropLookupView = () => {
    if (!data?.monsters || !data?.items) return null;

    // Build reverse index: itemId → list of {source, chance/info}
    const index = {};
    const addEntry = (itemId, entry) => {
      if (!index[itemId]) index[itemId] = [];
      index[itemId].push(entry);
    };

    // From monster individual drops
    data.monsters.forEach(m => {
      (m.drops || []).forEach(d => {
        addEntry(d.itemId, { source: m.name, sourceEmoji: m.emoji, zone: m.zone, chance: d.chance, type: 'monster', level: m.level });
      });
    });

    // From zone pools (deduplicated by zone)
    const seenZonePools = {};
    data.monsters.forEach(m => {
      if (!m.zonePool || seenZonePools[m.zone]) return;
      seenZonePools[m.zone] = true;
      (m.zonePool.equipment || []).forEach(itemId => {
        addEntry(itemId, { source: `Zone Pool: ${m.zone}`, sourceEmoji: '🗺️', zone: m.zone, chance: m.zonePool.equipChance, type: 'zone_pool', level: 0 });
      });
      (m.zonePool.materials || []).forEach(itemId => {
        addEntry(itemId, { source: `Zone Pool: ${m.zone}`, sourceEmoji: '🗺️', zone: m.zone, chance: m.zonePool.equipChance, type: 'zone_pool', level: 0 });
      });
    });

    // From dungeon boss drops
    (data.dungeons || []).forEach(dg => {
      (dg.rooms || []).forEach(room => {
        if (!room.boss) return;
        (room.boss.drops || []).forEach(d => {
          addEntry(d.itemId, { source: `${dg.name} Boss`, sourceEmoji: '🏰', zone: dg.region, chance: d.chance, type: 'dungeon_boss', level: dg.minLevel });
        });
      });
    });

    // From crafting (results)
    (data.crafting || []).forEach(r => {
      addEntry(r.resultItemId, { source: `Craft: ${r.name}`, sourceEmoji: '⚒️', zone: '—', chance: 1.0, type: 'craft', level: r.levelReq });
    });

    // From NPC Shop (buyPrice > 0)
    (data.items || []).forEach(it => {
      if ((it.buyPrice || 0) > 0) {
        addEntry(it.itemId, { source: `NPC Shop`, sourceEmoji: '🛒', zone: '—', chance: 1.0, type: 'shop', level: it.levelReq || 1, buyPrice: it.buyPrice });
      }
    });

    // From planned_content.js (coming soon — admin visibility only)
    (data.plannedSources || []).forEach(p => {
      addEntry(p.itemId, { source: p.source, sourceEmoji: p.sourceEmoji, zone: '—', chance: null, type: 'planned', level: 0, note: p.note });
    });

    const q = search.toLowerCase();
    const itemNames = Object.keys(index).filter(itemId => {
      if (!q) return true;
      const item = data.items.find(i => i.itemId === itemId);
      return itemId.includes(q) || (item?.name || '').toLowerCase().includes(q);
    }).sort();

    const TYPE_BADGE = {
      monster:     ['#fb923c', '⚔️ Monster'],
      zone_pool:   ['#60a5fa', '🗺️ Zone Pool'],
      dungeon_boss:['#a78bfa', '🏰 Dungeon'],
      craft:       ['#34d399', '⚒️ Craft'],
      shop:        ['#fbbf24', '🛒 Shop'],
      planned:     ['#6b7280', '🔒 Coming Soon'],
    };

    return (
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
          <input style={{ ...inputStyle, flex:1, maxWidth:320 }} placeholder="🔍 พิมพ์ชื่อ item หรือ ID เพื่อค้นหาแหล่งดรอป..." value={search}
            onChange={e => setSearch(e.target.value)} />
          <span style={{ color:'#4b5563', fontSize:12 }}>{itemNames.length} items</span>
        </div>
        <div style={{ color:'#374151', fontSize:11, marginBottom:16 }}>ข้อมูลจาก: monster drops + zone pool + dungeon boss + crafting + NPC shop + 🔒 planned (coming soon)</div>

        {itemNames.length === 0 && search && <div style={{ color:'#4b5563', padding:20, textAlign:'center' }}>ไม่พบ item ที่ค้นหา</div>}
        {!search && <div style={{ color:'#4b5563', padding:20, textAlign:'center' }}>พิมพ์ชื่อ item เพื่อค้นหาว่าได้มาจากไหน</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {itemNames.slice(0, 50).map(itemId => {
            const item = data.items.find(i => i.itemId === itemId);
            const sources = index[itemId] || [];
            const GRADE_COLOR2 = { COMMON:'#9ca3af', UNCOMMON:'#4ade80', RARE:'#60a5fa', EPIC:'#a78bfa', LEGENDARY:'#f59e0b' };
            const gc = GRADE_COLOR2[item?.grade] || '#9ca3af';
            return (
              <div key={itemId} style={{ ...card, padding:'14px 16px', borderColor: gc ? gc+'33' : '#1f2937' }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{item?.emoji || '📦'}</span>
                  <div>
                    <div style={{ color: gc, fontWeight:700, fontSize:14 }}>{item?.name || itemId}</div>
                    <div style={{ color:'#4b5563', fontSize:11 }}>{itemId} {item?.grade && <span style={{ ...badge(gc), fontSize:10 }}>{item.grade}</span>}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {sources.map((src, i) => {
                    const [tc, tl] = TYPE_BADGE[src.type] || ['#6b7280', '?'];
                    return (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'6px 10px',
                        background:'#0d1117', borderRadius:6 }}>
                        <span style={{ ...badge(tc), fontSize:10, whiteSpace:'nowrap' }}>{tl}</span>
                        <span style={{ fontSize:14 }}>{src.sourceEmoji}</span>
                        <span style={{ color:'#e5e7eb', fontSize:12, flex:1 }}>{src.source}</span>
                        <span style={{ color:'#6b7280', fontSize:11 }}>{src.zone}</span>
                        {src.level > 0 && <span style={{ color:'#f59e0b', fontSize:11 }}>Lv.{src.level}</span>}
                        {src.type === 'planned'
                          ? <span style={{ color:'#6b7280', fontSize:11, fontStyle:'italic' }}>{src.note || 'ยังไม่เปิด'}</span>
                          : <span style={{ color: src.type === 'shop' ? '#fbbf24' : src.chance >= 0.5 ? '#34d399' : src.chance >= 0.2 ? '#fbbf24' : '#f87171',
                              fontWeight:700, fontSize:12 }}>
                              {src.type === 'craft' ? '100%' : src.type === 'shop' ? `${src.buyPrice}G` : `${Math.round(src.chance*100)}%`}
                            </span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {itemNames.length > 50 && <div style={{ color:'#4b5563', textAlign:'center', fontSize:12 }}>... ค้นหาเพื่อกรองให้แคบลง ({itemNames.length} ผลลัพธ์)</div>}
        </div>
      </div>
    );
  };

  const SUBTABS = [
    { key:'monsters',   label:`🐉 Monsters${data ? ` (${data.monsters.length})` : ''}` },
    { key:'npcs',       label:`👥 NPCs${data ? ` (${data.npcs.length})` : ''}` },
    { key:'maps',       label:`🗺️ Maps${data ? ` (${data.zones.length})` : ''}` },
    { key:'items',      label:`🎒 Items${data ? ` (${data.items?.length || 0})` : ''}` },
    { key:'skills',     label:`⚔️ Skills${data ? ` (${data.skills?.reduce((s,c)=>s+c.skills.length,0)||0})` : ''}` },
    { key:'crafting',   label:`⚒️ Crafting${data ? ` (${data.crafting?.length || 0})` : ''}` },
    { key:'dungeons',   label:`🏰 Dungeons${data ? ` (${data.dungeons?.length || 0})` : ''}` },
    { key:'worldboss',  label:`💀 World Boss${data ? ` (${data.worldBosses?.length || 0})` : ''}` },
    { key:'achievements',label:`🏅 Achievements${data ? ` (${data.achievements?.length || 0})` : ''}` },
    { key:'quests',     label:`📖 Quests` },
    { key:'droplookup', label:`🔍 Drop Lookup` },
  ];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ color:'#e5e7eb', fontWeight:800, fontSize:18 }}>🗄️ Game Database</div>
          <div style={{ color:'#4b5563', fontSize:12, marginTop:2 }}>Read-only viewer — แก้ไขผ่าน code + push</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {loading && <div style={{ color:'#6b7280', fontSize:13 }}>⏳ กำลังโหลด...</div>}
          {!loading && data && (
            <button onClick={() => { setData(null); setTimeout(loadData, 50); }}
              style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #374151', color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:12 }}>
              ↻ Reload
            </button>
          )}
          {!loading && loadErr && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ color:'#f87171', fontSize:12 }}>❌ {loadErr}</span>
              <button onClick={loadData}
                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #f8717144', color:'#f87171', background:'transparent', cursor:'pointer', fontSize:12 }}>
                ↺ Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #1f2937', marginBottom:20 }}>
        {SUBTABS.map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setSearch(''); setZoneFilter('all'); setTypeFilter('all'); setSelected(null); }}
            style={{ padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontSize:13,
              fontWeight: subTab===t.key ? 700 : 400,
              color: subTab===t.key ? '#60a5fa' : '#6b7280',
              borderBottom: subTab===t.key ? '2px solid #60a5fa' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {!data && !loading && !loadErr && <div style={{ color:'#6b7280', textAlign:'center', padding:40 }}>กำลังเตรียมข้อมูล...</div>}
      {!data && !loading && loadErr && (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ color:'#f87171', fontSize:14, marginBottom:16 }}>โหลดข้อมูลไม่สำเร็จ</div>
          <div style={{ color:'#4b5563', fontSize:12, marginBottom:20, fontFamily:'monospace', background:'#0d1117', padding:'8px 16px', borderRadius:8, display:'inline-block' }}>{loadErr}</div>
          <br/>
          <button onClick={loadData}
            style={{ padding:'8px 20px', borderRadius:8, border:'1px solid #60a5fa44', color:'#60a5fa', background:'transparent', cursor:'pointer', fontSize:13 }}>
            ↺ ลองใหม่
          </button>
        </div>
      )}
      {data && subTab === 'monsters'    && <MonsterView />}
      {data && subTab === 'npcs'        && <NpcView />}
      {data && subTab === 'maps'        && <MapView />}
      {data && subTab === 'items'       && <ItemView />}
      {data && subTab === 'skills'      && <SkillsView />}
      {data && subTab === 'crafting'    && <CraftingView />}
      {data && subTab === 'dungeons'    && <DungeonsView />}
      {data && subTab === 'worldboss'   && <WorldBossView />}
      {data && subTab === 'achievements'&& <AchievementsView />}
      {data && subTab === 'quests'      && <QuestsView />}
      {data && subTab === 'droplookup'  && <DropLookupView />}
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
      if (!user) { router.replace('/ashenveil'); return; }
      try {
        const r = await api.get('/api/game/audit/summary');
        setSummary(r.data);
        setAuthed(true);
        setLastRefresh(new Date());
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error(`ไม่มีสิทธิ์ Admin — UID: ${user.uid.slice(0,12)}… ตรวจสอบ ADMIN_UID ใน Railway`);
          router.replace('/ashenveil');
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

  // ─── Two-tier nav: section + game sub-tabs ──────────────────────────────────
  const GAME_TABS = [
    { key:'overview',  label:'📊 Overview' },
    { key:'flags',     label:`🚩 Flags${unresolvedCount > 0 ? ` (${unresolvedCount})` : ''}` },
    { key:'players',   label:'👥 Players' },
    { key:'activity',  label:'📜 Activity' },
    { key:'economy',   label:'📈 Economy' },
    { key:'rp',        label:'💎 RP' },
    { key:'bugs',      label:'🐛 Bugs' },
    { key:'churn',     label:'😴 Churn' },
    { key:'roadmap',   label:'🗺️ Roadmap' },
    { key:'insights',  label:'💡 Insights' },
    { key:'items',     label:'🛒 Items' },
    { key:'skills',    label:'⚔️ Skills' },
    { key:'database',  label:'🗄️ Database' },
    { key:'balance',   label:'⚖️ Balance' },
    { key:'gifts',     label:'🎁 Gifts' },
    { key:'season',    label:'🎉 Season Events' },
  ];
  const isGameTab   = GAME_TABS.some(t => t.key === tab);
  const section     = tab === 'system' ? 'system' : 'game';

  const sectionBtnStyle = (active) => ({
    padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    borderRadius: 8,
    background: active ? '#f59e0b22' : 'transparent',
    color:       active ? '#f59e0b'   : '#6b7280',
    outline:     active ? '2px solid #f59e0b55' : 'none',
    transition:  'all .15s',
  });

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
            <button onClick={() => router.push('/ashenveil')}
              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #374151', color:'#6b7280',
                background:'transparent', cursor:'pointer', fontSize:13 }}>
              ← เกม
            </button>
          </div>
        </div>

        {/* Section selector (tier 1) */}
        <div style={{ background:'#0d1117', borderBottom:'1px solid #1f2937', padding:'10px 28px',
          display:'flex', alignItems:'center', gap:8 }}>
          <button style={sectionBtnStyle(section === 'system')}
            onClick={() => setTab('system')}>
            🖥️ ระบบ
          </button>
          <button style={sectionBtnStyle(section === 'game')}
            onClick={() => { if (!isGameTab) setTab('overview'); }}>
            ⚔️ เกม
          </button>
        </div>

        {/* Game sub-tabs (tier 2) — only when section === 'game' */}
        {section === 'game' && (
          <div style={{ background:'#111827', borderBottom:'1px solid #1f2937', padding:'0 20px',
            display:'flex', gap:0, overflowX:'auto', scrollbarWidth:'thin',
            scrollbarColor:'#374151 transparent' }}>
            {GAME_TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer',
                  fontSize:13, fontWeight: tab===t.key ? 700 : 400,
                  color: tab===t.key ? '#f59e0b' : '#6b7280',
                  borderBottom: tab===t.key ? '2px solid #f59e0b' : '2px solid transparent',
                  whiteSpace:'nowrap', transition:'color .15s', flexShrink:0 }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 28px' }}>
          {tab === 'system'    && <SystemTab />}
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
          {tab === 'database'  && <DatabaseTab />}
          {tab === 'balance'   && <BalanceSimTab />}
          {tab === 'gifts'     && <GiftCatalogTab />}
          {tab === 'season'    && <SeasonEventsTab />}
        </div>
      </div>
    </>
  );
}

// ─── SeasonEventsTab ──────────────────────────────────────────────────────────
function SeasonEventsTab() {
  const [events,  setEvents]  = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing,  setEditing]  = React.useState(null); // event obj | null
  const [saving,   setSaving]   = React.useState(false);
  const [deleting, setDeleting] = React.useState(null);

  const EMPTY = { name:'', type:'double_xp', description:'', startAt:'', endAt:'', multiplier:2, dungeonId:'', banner:'🎉', active:true };
  const [form, setForm] = React.useState(EMPTY);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/admin/season-events');
      setEvents(r.data?.events || []);
    } catch { toast.error('โหลด events ไม่ได้'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const now = Date.now();

  function statusOf(ev) {
    if (!ev.active) return { label: 'ปิด', color: '#6b7280' };
    if (ev.startAt > now) return { label: '⏳ รอเริ่ม', color: '#f59e0b' };
    if (ev.endAt   < now) return { label: '✅ จบแล้ว',  color: '#4b5563' };
    return { label: '🟢 กำลังใช้งาน', color: '#22c55e' };
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(Number(ts)).toLocaleString('th-TH', { dateStyle:'short', timeStyle:'short' });
  }

  function toInput(ts) {
    if (!ts) return '';
    return new Date(Number(ts)).toISOString().slice(0,16);
  }

  function fromInput(str) {
    return str ? new Date(str).getTime() : 0;
  }

  function openCreate() {
    setForm(EMPTY);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(ev) {
    setForm({
      name:        ev.name        || '',
      type:        ev.type        || 'double_xp',
      description: ev.description || '',
      startAt:     toInput(ev.startAt),
      endAt:       toInput(ev.endAt),
      multiplier:  ev.multiplier  ?? 2,
      dungeonId:   ev.dungeonId   || '',
      banner:      ev.banner      || '🎉',
      active:      ev.active      ?? true,
    });
    setEditing(ev);
    setShowForm(true);
  }

  async function submit() {
    if (!form.name.trim()) { toast.error('ต้องมีชื่อ'); return; }
    if (!form.startAt || !form.endAt) { toast.error('ต้องระบุวันที่'); return; }
    setSaving(true);
    const payload = {
      ...form,
      startAt: fromInput(form.startAt),
      endAt:   fromInput(form.endAt),
      multiplier: Number(form.multiplier) || 2,
    };
    try {
      if (editing) {
        await api.put(`/api/admin/season-events/${editing.id}`, payload);
        toast.success('อัปเดตสำเร็จ');
      } else {
        await api.post('/api/admin/season-events', payload);
        toast.success('สร้าง event สำเร็จ');
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'ล้มเหลว');
    } finally { setSaving(false); }
  }

  async function doDelete(id) {
    try {
      await api.delete(`/api/admin/season-events/${id}`);
      toast.success('ลบแล้ว');
      setDeleting(null);
      load();
    } catch { toast.error('ลบไม่ได้'); }
  }

  async function toggleActive(ev) {
    try {
      await api.put(`/api/admin/season-events/${ev.id}`, { active: !ev.active });
      load();
    } catch { toast.error('ล้มเหลว'); }
  }

  const TYPE_LABELS = {
    double_xp:       '⚡ Double XP',
    double_gold:     '💰 Double Gold',
    bonus_drop:      '📦 Bonus Drop Rate',
    limited_dungeon: '🏰 Limited Dungeon',
    custom:          '✨ Custom',
  };

  const activeNow = events.filter(e => e.active && e.startAt <= now && e.endAt >= now);
  const upcoming  = events.filter(e => e.active && e.startAt > now);
  const past      = events.filter(e => !e.active || e.endAt < now);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <h2 style={{ color:'#f59e0b', fontWeight:800, fontSize:20, margin:0 }}>🎉 Season & Event Management</h2>
          <span style={{ color:'#4b5563', fontSize:12 }}>สร้าง / จัดการ seasonal events และ limited content</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={load} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #374151', color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:13 }}>↻ Refresh</button>
          <button onClick={openCreate} style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'#f59e0b', color:'#000', fontWeight:700, cursor:'pointer', fontSize:13 }}>+ สร้าง Event</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        <StatCard label="กำลังใช้งาน" value={activeNow.length} icon="🟢" color="#22c55e" sub="events ที่ active อยู่ตอนนี้" />
        <StatCard label="กำลังจะมา" value={upcoming.length} icon="⏳" color="#f59e0b" sub="scheduled ไว้" />
        <StatCard label="ทั้งหมด" value={events.length} icon="📋" color="#818cf8" />
      </div>

      {/* Active now banner */}
      {activeNow.length > 0 && (
        <div style={{ ...card, borderColor:'#22c55e44', background:'#052e1644' }}>
          <div style={{ color:'#22c55e', fontSize:13, fontWeight:700, marginBottom:10 }}>🟢 กำลังใช้งานอยู่ตอนนี้</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {activeNow.map(ev => (
              <div key={ev.id} style={{ background:'#052e16', border:'1px solid #22c55e44', borderRadius:10, padding:'10px 16px', minWidth:180 }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{ev.banner || '🎉'}</div>
                <div style={{ color:'#f9fafb', fontWeight:700, fontSize:14 }}>{ev.name}</div>
                <div style={{ color:'#22c55e', fontSize:12, marginTop:2 }}>{TYPE_LABELS[ev.type] || ev.type}</div>
                {ev.multiplier > 1 && <div style={{ color:'#f59e0b', fontSize:12 }}>×{ev.multiplier}</div>}
                <div style={{ color:'#4b5563', fontSize:11, marginTop:4 }}>หมด {fmtDate(ev.endAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event list */}
      {loading ? (
        <div style={{ ...card, textAlign:'center', color:'#4b5563', padding:40 }}>กำลังโหลด...</div>
      ) : events.length === 0 ? (
        <div style={{ ...card, textAlign:'center', color:'#4b5563', padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <div>ยังไม่มี event — กด "สร้าง Event" เพื่อเริ่มต้น</div>
        </div>
      ) : (
        <div style={{ ...card, padding:0, overflow:'hidden' }}>
          {events.map((ev, i) => {
            const st = statusOf(ev);
            return (
              <div key={ev.id} style={{ display:'flex', gap:14, alignItems:'center', padding:'14px 20px',
                borderBottom: i < events.length-1 ? '1px solid #111827' : 'none',
                background: st.color === '#22c55e' ? '#052e1622' : 'transparent' }}>
                <div style={{ fontSize:28, flexShrink:0 }}>{ev.banner || '🎉'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                    <span style={{ color:'#f9fafb', fontWeight:700, fontSize:14 }}>{ev.name}</span>
                    <span style={{ ...badge(st.color), fontSize:11 }}>{st.label}</span>
                    <span style={{ ...badge('#818cf8'), fontSize:11 }}>{TYPE_LABELS[ev.type] || ev.type}</span>
                    {ev.multiplier > 1 && <span style={{ ...badge('#f59e0b'), fontSize:11 }}>×{ev.multiplier}</span>}
                  </div>
                  {ev.description && <div style={{ color:'#6b7280', fontSize:12, marginBottom:4 }}>{ev.description}</div>}
                  <div style={{ color:'#4b5563', fontSize:11 }}>
                    {fmtDate(ev.startAt)} → {fmtDate(ev.endAt)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={() => toggleActive(ev)}
                    style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${ev.active?'#22c55e44':'#374151'}`,
                      color: ev.active?'#22c55e':'#6b7280', background:'transparent', cursor:'pointer', fontSize:12 }}>
                    {ev.active ? '✓ Active' : '○ Off'}
                  </button>
                  <button onClick={() => openEdit(ev)}
                    style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #374151',
                      color:'#9ca3af', background:'transparent', cursor:'pointer', fontSize:12 }}>
                    ✏️ แก้ไข
                  </button>
                  <button onClick={() => setDeleting(ev.id)}
                    style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #f8717144',
                      color:'#f87171', background:'transparent', cursor:'pointer', fontSize:12 }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div style={{ ...card, width:520, border:'1px solid #f59e0b44', maxHeight:'90vh', overflowY:'auto' }}>
            <h3 style={{ color:'#f59e0b', marginBottom:20 }}>{editing ? '✏️ แก้ไข Event' : '🎉 สร้าง Event ใหม่'}</h3>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Name + Banner */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
                <div>
                  <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>ชื่อ Event *</div>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                    placeholder="เช่น: Double XP Weekend" maxLength={80}
                    style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
                </div>
                <div>
                  <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>Banner</div>
                  <input value={form.banner} onChange={e=>setForm(p=>({...p,banner:e.target.value}))}
                    placeholder="🎉" maxLength={10}
                    style={{ width:60, background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:18, textAlign:'center' }} />
                </div>
              </div>

              {/* Type */}
              <div>
                <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>ประเภท *</div>
                <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}
                  style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13 }}>
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>คำอธิบาย</div>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  rows={2} maxLength={300} placeholder="อธิบาย event..."
                  style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
              </div>

              {/* Dates */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>เริ่ม *</div>
                  <input type="datetime-local" value={form.startAt} onChange={e=>setForm(p=>({...p,startAt:e.target.value}))}
                    style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
                </div>
                <div>
                  <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>สิ้นสุด *</div>
                  <input type="datetime-local" value={form.endAt} onChange={e=>setForm(p=>({...p,endAt:e.target.value}))}
                    style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
                </div>
              </div>

              {/* Multiplier + DungeonId (conditional) */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>Multiplier (เช่น 2 = ×2)</div>
                  <input type="number" min={1} max={10} step={0.5} value={form.multiplier}
                    onChange={e=>setForm(p=>({...p,multiplier:e.target.value}))}
                    style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
                </div>
                {form.type === 'limited_dungeon' && (
                  <div>
                    <div style={{ color:'#6b7280', fontSize:11, marginBottom:5 }}>Dungeon ID</div>
                    <input value={form.dungeonId} onChange={e=>setForm(p=>({...p,dungeonId:e.target.value}))}
                      placeholder="เช่น: shadow_realm" maxLength={50}
                      style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb', padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))} />
                <span style={{ color:'#9ca3af', fontSize:13 }}>เปิดใช้งาน event นี้</span>
              </label>

              {/* Buttons */}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ padding:'9px 18px', borderRadius:8, border:'1px solid #374151', color:'#6b7280', background:'transparent', cursor:'pointer' }}>
                  ยกเลิก
                </button>
                <button onClick={submit} disabled={saving}
                  style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#f59e0b', color:'#000', fontWeight:700, cursor:'pointer' }}>
                  {saving ? '...' : editing ? '✓ อัปเดต' : '+ สร้าง'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div style={{ position:'fixed', inset:0, background:'#000a', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target===e.currentTarget && setDeleting(null)}>
          <div style={{ ...card, width:360, border:'1px solid #f87171' }}>
            <h3 style={{ color:'#f87171', marginBottom:12 }}>🗑️ ลบ Event?</h3>
            <p style={{ color:'#9ca3af', fontSize:13, marginBottom:20 }}>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleting(null)}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #374151', color:'#6b7280', background:'transparent', cursor:'pointer' }}>ยกเลิก</button>
              <button onClick={() => doDelete(deleting)}
                style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#f87171', color:'#0a0a0a', fontWeight:700, cursor:'pointer' }}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      {/* Guide */}
      <div style={{ ...card }}>
        <div style={{ color:'#9ca3af', fontSize:12, fontWeight:700, marginBottom:14 }}>📘 ประเภท Event ที่รองรับ</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { icon:'⚡', type:'Double XP', desc:'ผู้เล่นได้ XP ×N จากทุก source ตลอดช่วงเวลา — ดีสำหรับ retention weekend' },
            { icon:'💰', type:'Double Gold', desc:'Gold จาก combat และ quests ×N — กระตุ้นให้เล่นเพื่อ farm' },
            { icon:'📦', type:'Bonus Drop Rate', desc:'โอกาส item drop เพิ่มขึ้น — เหมาะกับ dungeon event' },
            { icon:'🏰', type:'Limited Dungeon', desc:'Dungeon พิเศษที่เปิดเฉพาะช่วง event — ต้องระบุ Dungeon ID' },
            { icon:'✨', type:'Custom', desc:'Event ประเภทอื่นๆ ที่ต้องใช้ custom logic ใน game code' },
          ].map(item => (
            <div key={item.type} style={{ background:'#1f2937', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ color:'#e5e7eb', fontSize:13, fontWeight:600, marginBottom:4 }}>{item.icon} {item.type}</div>
              <div style={{ color:'#6b7280', fontSize:12 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:'10px 14px', background:'#1f2937', borderRadius:8, fontSize:12, color:'#6b7280' }}>
          💡 Game logic ดึง active events ได้ผ่าน <code style={{ color:'#818cf8' }}>GET /api/game/active-events</code> — รองรับ double XP/gold ใน combat และ quest reward calculation
        </div>
      </div>
    </div>
  );
}

// ─── SystemTab ────────────────────────────────────────────────────────────────
function SystemTab() {
  const [sysData,  setSysData]  = useState(null);
  const [gameData, setGameData] = useState(null);
  const [errors,   setErrors]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const REFRESH = 60;
  const [cd, setCd] = useState(REFRESH);
  const cdRef = useRef(REFRESH);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sysRes, errRes, gameRes] = await Promise.all([
        api.get('/api/admin/metrics'),
        api.get('/api/admin/errors?limit=50'),
        api.get('/api/admin/game-metrics'),
      ]);
      setSysData(sysRes.data);
      setErrors(errRes.data?.errors || []);
      setGameData(gameRes.data);
    } catch { /* 403 = not owner, show nothing */ }
    finally {
      setLoading(false);
      cdRef.current = REFRESH;
      setCd(REFRESH);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH * 1000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  useEffect(() => {
    const iv = setInterval(() => {
      cdRef.current = Math.max(0, cdRef.current - 1);
      setCd(cdRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleKick = useCallback(async (userId) => {
    if (!confirm('Force disconnect TikTok session นี้?')) return;
    try { await api.post(`/api/admin/connections/${userId}/kick`); fetchAll(); }
    catch { alert('Kick ไม่สำเร็จ'); }
  }, [fetchAll]);

  const handleResolve = useCallback(async (id) => {
    try {
      await api.patch(`/api/admin/errors/${id}/resolve`);
      setErrors(prev => prev.filter(e => e.id !== id));
    } catch { alert('Resolve ไม่สำเร็จ'); }
  }, []);

  const s = sysData?.server, c = sysData?.connections, q = sysData?.queue, ev = sysData?.events, hb = sysData?.heartbeats;
  const gt = gameData?.totals;

  // ── inline style helpers ──
  const card  = { background:'#111827', border:'1px solid #1f2937', borderRadius:12, padding:'16px 20px' };
  const label = { color:'#6b7280', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:4 };
  const big   = { fontSize:28, fontWeight:800, color:'#e5e7eb' };
  const muted = { color:'#6b7280', fontSize:12 };
  const grid4 = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:16 };
  const grid3 = { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12, marginBottom:16 };
  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 };

  function fmtNum(n) { return n != null ? Number(n).toLocaleString() : '—'; }
  function timeAgoLocal(ts) {
    if (!ts) return '—';
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return `${s}วิที่แล้ว`;
    if (s < 3600) return `${Math.floor(s / 60)}นาทีที่แล้ว`;
    return `${Math.floor(s / 3600)}ชม.ที่แล้ว`;
  }
  function fmtDurLocal(sec) {
    if (sec == null) return '—';
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), ss = sec%60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${ss}s` : `${ss}s`;
  }
  function fmtTimestamp(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  // Progress bar
  function PBar({ used, total }) {
    const pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0;
    const col  = pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#6366f1';
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7280', marginBottom:4 }}>
          <span>{used} / {total} MB</span><span style={{ color: col, fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ height:6, borderRadius:3, background:'#1f2937', overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3, background: col, width:`${pct}%`, transition:'width .5s' }} />
        </div>
      </div>
    );
  }

  // CPU ring SVG
  function CpuRing({ pct = 0 }) {
    const r = 28, circ = 2 * Math.PI * r;
    const col = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#6366f1';
    return (
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1f2937" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 36 36)"
          style={{ transition:'stroke-dashoffset .5s' }} />
        <text x="36" y="41" textAnchor="middle" fill={col} fontSize="13" fontWeight="700">{pct}%</text>
      </svg>
    );
  }

  // Uptime bars
  function UptimeBars({ hb: heartbeats }) {
    if (!heartbeats?.length) return <span style={muted}>ยังไม่มีข้อมูล heartbeat</span>;
    const now = Date.now(), N = 144, BKT = 5*60*1000;
    const dots = Array.from({ length: N }, (_, i) => {
      const mid = now - (N - 1 - i) * BKT;
      return heartbeats.some(h => Math.abs(h.ts - mid) < BKT * 0.6);
    });
    const upPct = Math.round(dots.filter(Boolean).length / N * 100);
    return (
      <div>
        <span style={{ fontSize:12, fontWeight:700, color: upPct >= 99 ? '#34d399' : upPct >= 95 ? '#fbbf24' : '#f87171' }}>
          {upPct}% uptime (12h)
        </span>
        <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginTop:6 }}>
          {dots.map((up, i) => (
            <div key={i} style={{ width:5, height:20, borderRadius:2, background: up ? '#34d399' : '#1f2937' }} />
          ))}
        </div>
      </div>
    );
  }

  if (loading && !sysData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0', color:'#6b7280' }}>
        กำลังโหลด System Monitor...
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <span style={{ color:'#9ca3af', fontSize:13 }}>
          {loading ? 'กำลังรีเฟรช...' : `auto-refresh ใน ${cd}s`}
        </span>
        <button onClick={fetchAll} disabled={loading}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #374151', color:'#9ca3af',
            background:'transparent', cursor:'pointer', fontSize:13, opacity: loading ? 0.5 : 1 }}>
          ↻ Refresh
        </button>
      </div>

      {sysData && (
        <>
          {/* ── Server stats ── */}
          <div style={grid4}>
            {[
              { label:'Uptime',        value: s?.uptimeStr,    color:'#e5e7eb' },
              { label:'TikTok Live',   value: c?.tiktok ?? 0,  color:'#f472b6' },
              { label:'Online Users',  value: c?.sockets ?? 0, color:'#818cf8' },
              { label:'Queue Backlog', value: q?.backlog ?? 0,  color: (q?.backlog ?? 0) > 20 ? '#fbbf24' : '#34d399' },
            ].map(({ label: lbl, value, color }) => (
              <div key={lbl} style={card}>
                <div style={label}>{lbl}</div>
                <div style={{ ...big, color }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>

          {/* ── Memory + CPU + Events ── */}
          <div style={grid3}>
            <div style={card}>
              <div style={label}>Memory Usage</div>
              <PBar used={s?.memory?.heapUsed} total={s?.memory?.heapTotal} />
              <div style={{ ...muted, marginTop:10 }}>RSS: {s?.memory?.rss ?? '—'} MB</div>
            </div>
            <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <div style={label}>CPU Delta</div>
              <CpuRing pct={s?.cpu ?? 0} />
              <div style={muted}>ตั้งแต่ request ที่แล้ว</div>
            </div>
            <div style={card}>
              <div style={label}>Events / นาที</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 12px' }}>
                {[['🎁 Gift', ev?.gift], ['💬 Chat', ev?.chat], ['❤️ Like', ev?.like],
                  ['➕ Follow', ev?.follow], ['👤 Join', ev?.join], ['🔗 Share', ev?.share]].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'#6b7280' }}>{k}</span>
                    <span style={{ fontWeight:700 }}>{v ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Game totals ── */}
          {gt && (
            <div style={grid4}>
              {[
                { label:'Characters',   value: fmtNum(gt.characters),    color:'#a78bfa' },
                { label:'Accounts',     value: fmtNum(gt.accounts),       color:'#60a5fa' },
                { label:'Dungeons',     value: fmtNum(gt.dungeons),       color:'#fbbf24' },
                { label:'Active Now',   value: fmtNum(gt.activeDungeons), color:'#f87171' },
                { label:'Achievements', value: fmtNum(gt.achievements),   color:'#34d399' },
              ].map(({ label: lbl, value, color }) => (
                <div key={lbl} style={card}>
                  <div style={label}>{lbl}</div>
                  <div style={{ ...big, color, fontSize:22 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Connections table ── */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ ...label, marginBottom:12 }}>TikTok Live Connections ({c?.tiktok ?? 0})</div>
            {!c?.list?.length ? (
              <span style={muted}>ไม่มีการเชื่อมต่อในขณะนี้</span>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ color:'#6b7280', borderBottom:'1px solid #1f2937' }}>
                    <th style={{ textAlign:'left', paddingBottom:8, fontWeight:500 }}>TikTok</th>
                    <th style={{ textAlign:'left', paddingBottom:8, fontWeight:500 }}>เชื่อมต่อ</th>
                    <th style={{ textAlign:'left', paddingBottom:8, fontWeight:500 }}>Duration</th>
                    <th style={{ textAlign:'right', paddingBottom:8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {c.list.map(conn => (
                    <tr key={conn.userId} style={{ borderBottom:'1px solid #1f2937' }}>
                      <td style={{ padding:'10px 0', color:'#f472b6', fontWeight:600 }}>@{conn.tiktokUsername}</td>
                      <td style={{ ...muted, padding:'10px 0' }}>{fmtTimestamp(conn.connectedAt)}</td>
                      <td style={{ ...muted, padding:'10px 0' }}>{fmtDurLocal(conn.durationSec)}</td>
                      <td style={{ padding:'10px 0', textAlign:'right' }}>
                        <button onClick={() => handleKick(conn.userId)}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #7f1d1d',
                            background:'rgba(239,68,68,0.1)', color:'#f87171', cursor:'pointer', fontSize:12 }}>
                          Kick
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Uptime ── */}
          <div style={{ ...card, marginBottom:16 }}>
            <div style={{ ...label, marginBottom:10 }}>Uptime History (12 ชม.)</div>
            <UptimeBars hb={hb} />
          </div>

          {/* ── Error log ── */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={label}>Error Log</span>
              {errors.length > 0 && (
                <span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
                  {errors.length} unresolved
                </span>
              )}
            </div>
            {errors.length === 0 ? (
              <span style={{ ...muted, color:'#34d399' }}>✅ ไม่มี error ที่ยังไม่ได้แก้ไข</span>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {errors.map(err => (
                  <div key={err.id} style={{ border:'1px solid #374151', borderRadius:8, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer',
                      background: expanded === err.id ? '#1f2937' : 'transparent' }}
                      onClick={() => setExpanded(expanded === err.id ? null : err.id)}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 6px', borderRadius:4,
                        background: err.source === 'backend' ? 'rgba(239,68,68,0.15)' : 'rgba(96,165,250,0.15)',
                        color: err.source === 'backend' ? '#f87171' : '#60a5fa', flexShrink:0 }}>
                        {err.source || 'frontend'}
                      </span>
                      <span style={{ fontSize:13, color:'#fca5a5', fontFamily:'monospace', flex:1,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {err.message?.slice(0, 100)}
                      </span>
                      <span style={{ ...muted, flexShrink:0 }}>{timeAgoLocal(err.ts)}</span>
                      <button onClick={e => { e.stopPropagation(); handleResolve(err.id); }}
                        style={{ flexShrink:0, padding:'3px 8px', borderRadius:6, border:'1px solid #374151',
                          background:'#1f2937', color:'#9ca3af', cursor:'pointer', fontSize:12 }}>✓</button>
                    </div>
                    {expanded === err.id && (
                      <div style={{ padding:'10px 12px', borderTop:'1px solid #374151', background:'#0d1117' }}>
                        {err.tiktokUsername && (
                          <span style={{ fontSize:11, color:'#c4b5fd', marginRight:8 }}>@{err.tiktokUsername}</span>
                        )}
                        {err.url && <span style={{ ...muted, fontSize:11 }}>{err.url}</span>}
                        {err.stack && (
                          <pre style={{ marginTop:8, fontSize:11, fontFamily:'monospace', color:'#9ca3af',
                            whiteSpace:'pre-wrap', wordBreak:'break-all', background:'#0a0a0a',
                            borderRadius:6, padding:10, maxHeight:180, overflow:'auto' }}>
                            {err.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── GiftCatalogTab ───────────────────────────────────────────────────────────
function GiftCatalogTab() {
  const [gifts, setGifts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState('diamonds'); // 'diamonds' | 'name'

  useEffect(() => {
    api.get('/api/gifts')
      .then(r => setGifts(r.data.gifts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = gifts
    .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'diamonds'
      ? a.diamondCount - b.diamondCount
      : a.name.localeCompare(b.name));

  const tierColor = (d) => {
    if (d >= 10000) return '#f43f5e';
    if (d >= 1000)  return '#f59e0b';
    if (d >= 100)   return '#818cf8';
    if (d >= 10)    return '#34d399';
    return '#6b7280';
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#f59e0b' }}>🎁 Gift Catalog</div>
          <div style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>
            ข้อมูล gift จริงที่รวบรวมจาก TikTok Live — อัพเดตอัตโนมัติเมื่อมีคนส่งของขวัญ
          </div>
        </div>
        <div style={{ color:'#374151', fontSize:13 }}>{gifts.length} รายการ</div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ gift..."
          style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1px solid #374151',
            background:'#111827', color:'#e5e7eb', fontSize:13, outline:'none' }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #374151',
            background:'#111827', color:'#9ca3af', fontSize:13, cursor:'pointer' }}>
          <option value="diamonds">เรียงตาม 💎 Coins</option>
          <option value="name">เรียงตาม ชื่อ A-Z</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'#6b7280', padding:40 }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', color:'#6b7280', padding:40 }}>
          {gifts.length === 0
            ? 'ยังไม่มีข้อมูล gift — เชื่อมต่อ TikTok Live แล้วรอให้ผู้ชมส่งของขวัญ'
            : 'ไม่พบ gift ที่ค้นหา'}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
          {filtered.map(g => (
            <div key={g.name} style={{ ...card, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
              {g.pictureUrl ? (
                <img src={g.pictureUrl} alt={g.name}
                  style={{ width:36, height:36, objectFit:'contain', borderRadius:6, flexShrink:0 }} />
              ) : (
                <div style={{ width:36, height:36, borderRadius:6, background:'#1f2937',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🎁</div>
              )}
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#e5e7eb', whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize:12, color: tierColor(g.diamondCount), marginTop:2, fontWeight:700 }}>
                  💎 {g.diamondCount.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
