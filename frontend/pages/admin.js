// pages/admin.js — Admin Dashboard (System + Game) — owner only
// เข้าได้เฉพาะ owner เท่านั้น | auto-refresh ทุก 60 วินาที | responsive
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '../lib/api';
import clsx from 'clsx';

const REFRESH_SEC = 60;
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || 'cksamg@gmail.com';

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function timeAgo(ts) {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)    return `${s}วิที่แล้ว`;
  if (s < 3600)  return `${Math.floor(s / 60)}นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)}ชม.ที่แล้ว`;
  return `${Math.floor(s / 86400)}วันที่แล้ว`;
}
function fmtDuration(sec) {
  if (sec === undefined || sec === null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
function fmtNum(n) {
  if (n === undefined || n === null) return '—';
  return Number(n).toLocaleString();
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:      'bg-[#0a0f1a]',
  card:    'bg-[#0e1629] border border-[#1e293b]',
  text:    'text-slate-100',
  muted:   'text-slate-500',
  accent:  'text-indigo-400',
  sep:     'border-[#1e293b]',
};

// ─── Shared UI components ─────────────────────────────────────────────────────
function Card({ children, className }) {
  return (
    <div className={clsx('rounded-2xl p-4 md:p-5', D.card, className)}>
      {children}
    </div>
  );
}
function SectionTitle({ children }) {
  return (
    <p className={clsx('text-xs font-semibold uppercase tracking-widest mb-3', D.muted)}>
      {children}
    </p>
  );
}
function Badge({ children, color = 'gray' }) {
  const cls = {
    green:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    red:    'bg-red-500/15 text-red-400 border border-red-500/30',
    yellow: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    pink:   'bg-pink-500/15 text-pink-400 border border-pink-500/30',
    gray:   'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', cls[color] || cls.gray)}>
      {children}
    </span>
  );
}
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className={clsx('text-xs font-medium uppercase tracking-wider', D.muted)}>{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={clsx('text-2xl md:text-3xl font-bold', accent || D.text)}>{value ?? '—'}</p>
      {sub && <p className={clsx('text-xs', D.muted)}>{sub}</p>}
    </Card>
  );
}
function ProgressBar({ value, max, colorClass = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const col = pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : colorClass;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={D.muted}>{value} / {max} MB</span>
        <span className={clsx('font-semibold', pct > 85 ? 'text-red-400' : pct > 65 ? 'text-amber-400' : 'text-slate-300')}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-500', col)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function CpuRing({ pct = 0 }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  const col  = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#6366f1';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={col} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      <text x="36" y="41" textAnchor="middle" fill={col} fontSize="13" fontWeight="700">{pct}%</text>
    </svg>
  );
}
function UptimeHistory({ heartbeats }) {
  if (!heartbeats || heartbeats.length === 0) {
    return <p className={clsx('text-xs', D.muted)}>ยังไม่มีข้อมูล heartbeat (บันทึกทุก 5 นาที)</p>;
  }
  const now = Date.now(), N = 144, BKT = 5 * 60 * 1000;
  const dots = Array.from({ length: N }, (_, i) => {
    const mid = now - (N - 1 - i) * BKT;
    return heartbeats.some(h => Math.abs(h.ts - mid) < BKT * 0.6);
  });
  const upCount = dots.filter(Boolean).length;
  const pct     = Math.round((upCount / N) * 100);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Badge color={pct >= 99 ? 'green' : pct >= 95 ? 'yellow' : 'red'}>{pct}% uptime (12h)</Badge>
        <span className={clsx('text-xs', D.muted)}>{upCount}/{N} buckets</span>
      </div>
      <div className="flex gap-[2px] flex-wrap">
        {dots.map((up, i) => (
          <div key={i} title={fmtTime(now - (N - 1 - i) * BKT)}
            className={clsx('w-[5px] h-5 rounded-sm flex-shrink-0 transition-colors',
              up ? 'bg-emerald-500' : 'bg-slate-800')} />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className={clsx('text-[10px]', D.muted)}>12 ชม.ที่แล้ว</span>
        <span className={clsx('text-[10px]', D.muted)}>ตอนนี้</span>
      </div>
    </div>
  );
}
function ErrorLog({ errors, onResolve }) {
  const [expanded, setExpanded] = useState(null);
  if (errors.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="text-emerald-400 text-lg">✅</span>
        <p className={clsx('text-sm', D.muted)}>ไม่มี error ที่ยังไม่ได้แก้ไข</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {errors.map(err => (
        <div key={err.id} className="rounded-xl border border-slate-700/50 overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-800/50 transition-colors"
            onClick={() => setExpanded(expanded === err.id ? null : err.id)}
          >
            <Badge color={err.source === 'backend' ? 'red' : err.source === 'unhandled_rejection' ? 'yellow' : 'blue'}>
              {err.source || 'frontend'}
            </Badge>
            <p className="text-sm text-red-300 font-mono flex-1 truncate min-w-0">{err.message?.slice(0, 100)}</p>
            <span className={clsx('text-xs flex-shrink-0', D.muted)}>{timeAgo(err.ts)}</span>
            <button
              onClick={e => { e.stopPropagation(); onResolve(err.id); }}
              className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition font-medium"
            >✓</button>
          </div>
          {expanded === err.id && (
            <div className="px-3 pb-3 border-t border-slate-700/50 bg-slate-900/40 space-y-2">
              <div className="flex gap-2 flex-wrap pt-2">
                {err.tiktokUsername && <Badge color="purple">@{err.tiktokUsername}</Badge>}
                {err.url && <span className={clsx('text-xs truncate max-w-xs', D.muted)}>{err.url}</span>}
              </div>
              {err.stack && (
                <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap break-all bg-slate-900 rounded-lg p-3 overflow-auto max-h-48">
                  {err.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab bar (underline style) ────────────────────────────────────────────────
const TABS = [
  { id: 'system', label: 'ระบบ',  icon: '🖥️' },
  { id: 'game',   label: 'เกม',   icon: '⚔️' },
];
function TabBar({ active, onChange }) {
  return (
    <div className="border-b border-[#1e293b] bg-[#0a0f1a]">
      <div className="max-w-7xl mx-auto px-4 flex gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              active === t.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage({ user, authLoading }) {
  const router = useRouter();

  const [tab,      setTab]      = useState('system');
  const [sysData,  setSysData]  = useState(null);
  const [gameData, setGameData] = useState(null);
  const [errors,   setErrors]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [lastTs,   setLastTs]   = useState(null);
  const [cd,       setCd]       = useState(REFRESH_SEC);
  const cdRef = useRef(REFRESH_SEC);

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
      setLastTs(Date.now());
    } catch (err) {
      if (err?.response?.status === 403) { router.replace('/'); return; }
    } finally {
      setLoading(false);
      cdRef.current = REFRESH_SEC;
      setCd(REFRESH_SEC);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== OWNER_EMAIL) { router.replace('/'); return; }
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_SEC * 1000);
    return () => clearInterval(iv);
  }, [user, authLoading, fetchAll, router]);

  useEffect(() => {
    const iv = setInterval(() => {
      cdRef.current = Math.max(0, cdRef.current - 1);
      setCd(cdRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleKick = useCallback(async (userId) => {
    if (!confirm('Force disconnect TikTok session นี้?')) return;
    try {
      await api.post(`/api/admin/connections/${userId}/kick`);
      fetchAll();
    } catch { alert('Kick ไม่สำเร็จ'); }
  }, [fetchAll]);

  const handleResolve = useCallback(async (id) => {
    try {
      await api.patch(`/api/admin/errors/${id}/resolve`);
      setErrors(prev => prev.filter(e => e.id !== id));
    } catch { alert('Resolve ไม่สำเร็จ'); }
  }, []);

  // System shorthands
  const s  = sysData?.server;
  const c  = sysData?.connections;
  const q  = sysData?.queue;
  const ev = sysData?.events;
  const hb = sysData?.heartbeats;
  // Game shorthands
  const gt = gameData?.totals;

  if (authLoading) return (
    <div className={clsx('min-h-screen flex items-center justify-center', D.bg)}>
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Head>
        <title>{tab === 'game' ? 'Game Admin' : 'System Admin'} | TTplus</title>
      </Head>
      <div className={clsx('min-h-screen', D.bg, D.text)}>

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-40 border-b border-[#1e293b] bg-[#0a0f1a]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {/* Left: logo + title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                A
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm md:text-base">TTplus Admin</h1>
                {lastTs && <p className={clsx('text-xs truncate', D.muted)}>อัปเดต {fmtTime(lastTs)}</p>}
              </div>
            </div>

            {/* Right: refresh */}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sm font-medium transition"
            >
              <svg className={clsx('w-4 h-4', loading && 'animate-spin')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className={clsx('text-slate-300', loading ? '' : 'tabular-nums')}>
                {loading ? 'โหลด...' : `${cd}s`}
              </span>
            </button>
          </div>

          {/* ── Tab Bar ── */}
          <TabBar active={tab} onChange={setTab} />
        </header>

        {/* ── Content ── */}
        <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">

          {/* Loading skeleton */}
          {loading && !sysData && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className={clsx('text-sm', D.muted)}>กำลังโหลดข้อมูล...</p>
            </div>
          )}

          {/* ════════════════ SYSTEM TAB ════════════════ */}
          {sysData && tab === 'system' && (
            <>
              {/* Row 1: Key stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon="⏱️" label="Uptime"        value={s?.uptimeStr}    sub={`Node ${s?.nodeVersion}`} />
                <StatCard icon="📡" label="TikTok Live"   value={c?.tiktok ?? 0}  sub="connections" accent="text-pink-400" />
                <StatCard icon="👥" label="Online Users"  value={c?.sockets ?? 0} sub="browser tabs" accent="text-indigo-400" />
                <StatCard icon="📋" label="Queue Backlog" value={q?.backlog ?? 0}  sub="actions รอ play"
                  accent={(q?.backlog ?? 0) > 20 ? 'text-amber-400' : 'text-emerald-400'} />
              </div>

              {/* Row 2: Memory + CPU + Events */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <SectionTitle>Memory Usage</SectionTitle>
                  <div className="space-y-4">
                    <div>
                      <p className={clsx('text-xs mb-2', D.muted)}>Heap Used / Total</p>
                      <ProgressBar value={s?.memory?.heapUsed} max={s?.memory?.heapTotal} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={D.muted}>RSS (process total)</span>
                      <span className="font-semibold">{s?.memory?.rss ?? '—'} MB</span>
                    </div>
                  </div>
                </Card>
                <Card className="flex flex-col items-center justify-center gap-2">
                  <SectionTitle>CPU Delta</SectionTitle>
                  <CpuRing pct={s?.cpu ?? 0} />
                  <p className={clsx('text-xs', D.muted)}>ตั้งแต่ request ที่แล้ว</p>
                </Card>
                <Card>
                  <SectionTitle>Events / นาที</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '🎁 Gift',   v: ev?.gift   ?? 0 },
                      { label: '💬 Chat',   v: ev?.chat   ?? 0 },
                      { label: '❤️ Like',  v: ev?.like   ?? 0 },
                      { label: '➕ Follow',v: ev?.follow ?? 0 },
                      { label: '👤 Join',  v: ev?.join   ?? 0 },
                      { label: '🔗 Share', v: ev?.share  ?? 0 },
                    ].map(({ label, v }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className={D.muted}>{label}</span>
                        <span className="font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Row 3: Connections */}
              <Card>
                <SectionTitle>TikTok Live Connections ({c?.tiktok ?? 0})</SectionTitle>
                {!c?.list?.length ? (
                  <p className={clsx('text-sm py-2', D.muted)}>ไม่มีการเชื่อมต่อในขณะนี้</p>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className={clsx('text-xs border-b', D.muted, D.sep)}>
                          <th className="text-left pb-2 font-medium">TikTok</th>
                          <th className="text-left pb-2 font-medium">เชื่อมต่อเมื่อ</th>
                          <th className="text-left pb-2 font-medium">Duration</th>
                          <th className="text-right pb-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.list.map(conn => (
                          <tr key={conn.userId} className={clsx('border-b', D.sep)}>
                            <td className="py-2.5 font-semibold text-pink-400">@{conn.tiktokUsername}</td>
                            <td className={clsx('py-2.5 text-xs', D.muted)}>{fmtTime(conn.connectedAt)}</td>
                            <td className={clsx('py-2.5 text-xs', D.muted)}>{fmtDuration(conn.durationSec)}</td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => handleKick(conn.userId)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition font-medium"
                              >Kick</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Row 4: Uptime */}
              <Card>
                <SectionTitle>Uptime History (12 ชม.)</SectionTitle>
                <UptimeHistory heartbeats={hb} />
              </Card>

              {/* Row 5: Errors */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>Error Log</SectionTitle>
                  {errors.length > 0 && <Badge color="red">{errors.length} unresolved</Badge>}
                </div>
                <ErrorLog errors={errors} onResolve={handleResolve} />
              </Card>
            </>
          )}

          {/* ════════════════ GAME TAB ════════════════ */}
          {tab === 'game' && (
            <>
              {!gameData ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className={clsx('text-sm', D.muted)}>กำลังโหลดข้อมูลเกม...</p>
                </div>
              ) : (
                <>
                  {/* Row 1: Totals */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard icon="🧙" label="Characters"    value={fmtNum(gt?.characters)}    accent="text-violet-400" />
                    <StatCard icon="👤" label="Accounts"      value={fmtNum(gt?.accounts)}       accent="text-blue-400" />
                    <StatCard icon="⚔️" label="Dungeons"      value={fmtNum(gt?.dungeons)}       accent="text-amber-400" />
                    <StatCard icon="🔥" label="Active Now"    value={fmtNum(gt?.activeDungeons)} accent="text-red-400" sub="dungeons กำลังเล่น" />
                    <StatCard icon="🏆" label="Achievements"  value={fmtNum(gt?.achievements)}   accent="text-emerald-400" />
                  </div>

                  {/* Row 2: Leaderboards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Top Gold */}
                    <Card>
                      <SectionTitle>🥇 Top Gold</SectionTitle>
                      <div className="space-y-1">
                        {gameData.topGold?.length ? gameData.topGold.map((p, i) => (
                          <div key={p.uid} className={clsx('flex items-center gap-3 py-1.5 text-sm', i < gameData.topGold.length - 1 && `border-b ${D.sep}`)}>
                            <span className={clsx('w-5 text-center text-xs font-bold flex-shrink-0',
                              i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : D.muted)}>
                              {i + 1}
                            </span>
                            <span className="flex-1 truncate font-medium">
                              {p.tiktokUniqueId ? `@${p.tiktokUniqueId}` : <span className={D.muted}>{p.uid.slice(0, 12)}…</span>}
                            </span>
                            <span className="font-bold text-yellow-400 tabular-nums">{fmtNum(p.gold)}</span>
                            <span className={clsx('text-xs', D.muted)}>G</span>
                          </div>
                        )) : <p className={clsx('text-sm py-2', D.muted)}>ไม่มีข้อมูล</p>}
                      </div>
                    </Card>

                    {/* Top Realm Points */}
                    <Card>
                      <SectionTitle>🌟 Top Realm Points</SectionTitle>
                      <div className="space-y-1">
                        {gameData.topRp?.length ? gameData.topRp.map((p, i) => (
                          <div key={p.uid} className={clsx('flex items-center gap-3 py-1.5 text-sm', i < gameData.topRp.length - 1 && `border-b ${D.sep}`)}>
                            <span className={clsx('w-5 text-center text-xs font-bold flex-shrink-0',
                              i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : D.muted)}>
                              {i + 1}
                            </span>
                            <span className="flex-1 truncate font-medium">
                              {p.tiktokUniqueId ? `@${p.tiktokUniqueId}` : <span className={D.muted}>{p.uid.slice(0, 12)}…</span>}
                            </span>
                            <span className="font-bold text-violet-400 tabular-nums">{fmtNum(p.realmPoints)}</span>
                            <span className={clsx('text-xs', D.muted)}>RP</span>
                          </div>
                        )) : <p className={clsx('text-sm py-2', D.muted)}>ไม่มีข้อมูล</p>}
                      </div>
                    </Card>
                  </div>

                  {/* Row 3: Recent Dungeons */}
                  <Card>
                    <SectionTitle>Dungeon Runs ล่าสุด</SectionTitle>
                    {!gameData.recentDungeons?.length ? (
                      <p className={clsx('text-sm py-2', D.muted)}>ยังไม่มีข้อมูล</p>
                    ) : (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm min-w-[480px]">
                          <thead>
                            <tr className={clsx('text-xs border-b', D.muted, D.sep)}>
                              <th className="text-left pb-2 font-medium">Dungeon</th>
                              <th className="text-left pb-2 font-medium">Progress</th>
                              <th className="text-left pb-2 font-medium">สถานะ</th>
                              <th className="text-left pb-2 font-medium">เริ่มเมื่อ</th>
                              <th className="text-left pb-2 font-medium">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameData.recentDungeons.map(d => {
                              const dur = d.completedAt && d.startedAt
                                ? Math.round((d.completedAt - d.startedAt) / 1000)
                                : null;
                              const statusColor = d.status === 'completed' ? 'green'
                                : d.status === 'active' ? 'blue'
                                : d.status === 'failed' ? 'red' : 'gray';
                              return (
                                <tr key={d.id} className={clsx('border-b', D.sep)}>
                                  <td className="py-2.5 font-mono text-xs text-slate-300">{d.dungeonId || '—'}</td>
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-indigo-500 transition-all"
                                          style={{ width: d.totalRooms > 0 ? `${Math.round((d.currentRoom / d.totalRooms) * 100)}%` : '0%' }}
                                        />
                                      </div>
                                      <span className={clsx('text-xs', D.muted)}>
                                        {d.currentRoom}/{d.totalRooms}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5"><Badge color={statusColor}>{d.status}</Badge></td>
                                  <td className={clsx('py-2.5 text-xs', D.muted)}>{timeAgo(d.startedAt)}</td>
                                  <td className={clsx('py-2.5 text-xs', D.muted)}>{dur !== null ? fmtDuration(dur) : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
