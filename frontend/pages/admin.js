// pages/admin.js — Ashenveil Admin Dashboard
import { useState, useEffect, useCallback, useRef } from 'react';
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
          toast.error('ไม่มีสิทธิ์เข้าถึง Admin');
          router.replace('/ashenveil');
        } else {
          toast.error('เชื่อมต่อ server ไม่ได้');
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
            <button onClick={() => router.push('/ashenveil')}
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
        </div>
      </div>
    </>
  );
}
