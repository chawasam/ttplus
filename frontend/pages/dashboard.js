// pages/dashboard.js — Main Dashboard (Performance-optimized)
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { connectSocket, disconnectSocket } from '../lib/socket';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import { sanitizeEvent, safeTikTokImageUrl } from '../lib/sanitize';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import LiveFeed from '../components/LiveFeed';
import GiftLeaderboard from '../components/GiftLeaderboard';
import GoalBar from '../components/GoalBar';

const MAX_EVENTS = 100;

export default function Dashboard({ theme, setTheme }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // TikTok connection state
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Stats — ใช้ useRef เก็บ mutable ค่า เพื่อลด re-render ที่ไม่จำเป็น
  const [viewers, setViewers] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalGifts, setTotalGifts] = useState(0);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  // Events: เก็บใน ref เพื่อไม่ recreate listener ทุกครั้ง
  const eventsRef = useRef([]);
  const [events, setEvents] = useState([]);

  // Leaderboard: ใช้ Map เก็บใน ref แล้ว sync state ตาม
  const leaderboardMapRef = useRef(new Map());
  const [leaderboard, setLeaderboard] = useState([]);

  // Goal
  const goalCurrentRef = useRef(0);
  const [goalCurrent, setGoalCurrent] = useState(0);
  const [goalTarget, setGoalTarget] = useState(100);

  const socketRef = useRef(null);

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ===== Auth Check — ไม่ redirect ถ้าไม่ login, แค่ set user=null =====
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setLoading(false);

      if (u) {
        // Connect socket เฉพาะเมื่อ login แล้ว
        const token = await u.getIdToken();
        const socket = connectSocket(token);
        socketRef.current = socket;
        setupSocketListeners(socket);

        // Load settings — ใช้ cache ก่อน ลด Firestore reads
        try {
          let s = getCachedSettings();
          if (!s) {
            const res = await api.get('/api/settings');
            s = res.data.settings;
            setCachedSettings(s);
          }
          if (s.tiktokUsername) setTiktokUsername(s.tiktokUsername);
          if (s.goalTarget) setGoalTarget(s.goalTarget);
          if (s.goalCurrent) {
            goalCurrentRef.current = s.goalCurrent;
            setGoalCurrent(s.goalCurrent);
          }
        } catch (e) { /* ignore */ }
      }
    });
    return () => { unsub(); disconnectSocket(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Google Login (จาก modal) =====
  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      toast.success('เข้าสู่ระบบสำเร็จ!');
    } catch (err) {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
      if (process.env.NODE_ENV !== 'production') console.error('[Login]', err.code);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // ===== addEvent — stable reference, ไม่ recreate ทุก render =====
  const addEvent = useCallback((event) => {
    const next = [...eventsRef.current.slice(-(MAX_EVENTS - 1)), event];
    eventsRef.current = next;
    setEvents(next); // single state update
  }, []);

  // ===== updateLeaderboard — stable reference =====
  const updateLeaderboard = useCallback((giftData, diamonds) => {
    const map = leaderboardMapRef.current;
    const existing = map.get(giftData.uniqueId);
    map.set(giftData.uniqueId, {
      uniqueId:          giftData.uniqueId,
      nickname:          giftData.nickname,
      profilePictureUrl: safeTikTokImageUrl(giftData.profilePictureUrl), // sanitize URL ก่อนเก็บ
      diamonds:          (existing?.diamonds || 0) + diamonds,
    });
    // Sort และ slice เฉพาะ top 20 ก่อน set state
    const sorted = Array.from(map.values())
      .sort((a, b) => b.diamonds - a.diamonds)
      .slice(0, 20);
    setLeaderboard(sorted);
  }, []);

  // ===== Socket listeners — ใช้ stable callbacks =====
  function setupSocketListeners(socket) {
    socket.on('connection_status', (data) => {
      if (data.status === 'connected') {
        setConnected(true);
        setConnecting(false);
        toast.success(`✅ เชื่อมต่อ @${data.tiktokUsername} สำเร็จ!`);
      } else if (data.status === 'disconnected') {
        setConnected(false);
        toast(`📴 ตัดการเชื่อมต่อแล้ว`);
      } else if (data.status === 'error') {
        setConnected(false);
        setConnecting(false);
        toast.error(data.message);
      }
    });

    socket.on('chat', (data) => {
      const safe = sanitizeEvent(data);
      addEvent(safe);
      setTotalComments(c => c + 1);
    });

    socket.on('gift', (data) => {
      const safe = sanitizeEvent(data);
      addEvent(safe);
      setTotalGifts(c => c + 1);
      const diamonds = safe.diamondCount * safe.repeatCount;
      setTotalDiamonds(c => c + diamonds);
      // Update goal via ref (ไม่ต้องอ่าน state ใน closure)
      goalCurrentRef.current += diamonds;
      setGoalCurrent(goalCurrentRef.current);
      updateLeaderboard(safe, diamonds);
    });

    socket.on('like', (data) => {
      const safe = sanitizeEvent(data);
      addEvent(safe);
      if (safe.totalLikeCount) setTotalLikes(safe.totalLikeCount);
    });

    socket.on('follow', (data) => {
      const safe = sanitizeEvent(data);
      addEvent(safe);
      toast(`➕ ${safe.nickname || safe.uniqueId} ติดตามแล้ว!`, { icon: '🎉' });
    });

    socket.on('share', (data) => addEvent(sanitizeEvent(data)));

    socket.on('roomUser', (data) => {
      setViewers(Math.max(0, Number(data.viewerCount) || 0));
    });
  }

  const handleConnect = useCallback(async () => {
    // ถ้ายังไม่ login → เปิด modal แทน
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const rawUsername = tiktokUsername.trim();
    if (!rawUsername) {
      toast.error('กรุณากรอก TikTok username');
      return;
    }

    // Sanitize client-side ก่อนส่ง (backend จะ sanitize อีกรอบ)
    const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 50);
    if (!cleanUsername) {
      toast.error('Username ไม่ถูกต้อง (ใช้ได้เฉพาะ a-z, 0-9, . และ _)');
      return;
    }

    setConnecting(true);
    try {
      await api.post('/api/connect', { tiktokUsername: cleanUsername });
    } catch (err) {
      const msg = err.response?.data?.error || 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่';
      toast.error(msg);
      setConnecting(false);
    }
  }, [tiktokUsername]);

  const handleDisconnect = useCallback(async () => {
    try {
      await api.post('/api/disconnect');
      setConnected(false);
      // Reset stats
      setViewers(0); setTotalLikes(0); setTotalGifts(0);
      setTotalDiamonds(0); setTotalComments(0);
      eventsRef.current = [];
      setEvents([]);
      leaderboardMapRef.current.clear();
      setLeaderboard([]);
      goalCurrentRef.current = 0;
      setGoalCurrent(0);
    } catch (e) { /* ignore */ }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    disconnectSocket();
    router.push('/');
  }, [router]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Memoize top-5 leaderboard slice เพื่อไม่ให้ GiftLeaderboard re-render ถ้าอันดับ 6+ เปลี่ยน
  const topLeaderboard = useMemo(() => leaderboard.slice(0, 5), [leaderboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} />

      {/* Main Content */}
      <main className="ml-16 md:ml-56 p-4 md:p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 hover:text-white transition text-lg" aria-label="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-400 transition px-3 py-2">
                ออกจากระบบ
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>

        {/* Connect Bar */}
        <div className={clsx('rounded-xl p-4 mb-6', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 w-full sm:w-auto">
              <span className="text-gray-400 text-sm">@</span>
              <input
                type="text"
                placeholder="TikTok username"
                value={tiktokUsername}
                onChange={e => setTiktokUsername(e.target.value)}
                disabled={connected}
                className={clsx(
                  'flex-1 bg-transparent text-sm outline-none',
                  theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400',
                  connected && 'opacity-60'
                )}
                onKeyDown={e => e.key === 'Enter' && !connected && handleConnect()}
              />
            </div>

            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2 justify-center"
              >
                {connecting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {connecting ? 'กำลังเชื่อมต่อ...' : '🔌 เชื่อมต่อ'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition flex items-center gap-2 justify-center"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-fast" />
                ตัดการเชื่อมต่อ
              </button>
            )}
          </div>

          {/* hint เมื่อยังไม่ login */}
          {!user && (
            <p className="mt-2 text-xs text-gray-500">
              🔒 ต้อง{' '}
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-brand-400 hover:text-brand-300 underline transition"
              >
                เข้าสู่ระบบ
              </button>
              {' '}ก่อนเชื่อมต่อ TikTok
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard icon="👥" label="Viewers"  value={viewers}       color="blue"   theme={theme} />
          <StatCard icon="❤️" label="Likes"    value={totalLikes}    color="brand"  theme={theme} />
          <StatCard icon="🎁" label="Gifts"    value={totalGifts}    color="yellow" theme={theme} />
          <StatCard icon="💎" label="Diamonds" value={totalDiamonds} color="purple" theme={theme} />
          <StatCard icon="💬" label="Comments" value={totalComments} color="green"  theme={theme} />
        </div>

        {/* Goal */}
        <div className="mb-6">
          <GoalBar current={goalCurrent} target={goalTarget} label="Diamond Goal" theme={theme} />
        </div>

        {/* Feed + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <LiveFeed events={events} theme={theme} />
          </div>
          <div>
            <GiftLeaderboard leaderboard={topLeaderboard} theme={theme} />
          </div>
        </div>

      </main>

      {/* ===== Login Modal ===== */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}
        >
          <div className={clsx(
            'w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl',
            theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
          )}>
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                Login เพื่อเชื่อมต่อ TikTok Live
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60"
            >
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loginLoading ? 'กำลัง Login...' : 'เข้าสู่ระบบด้วย Google'}
            </button>

            <button
              onClick={() => setShowLoginModal(false)}
              className={clsx('w-full mt-3 py-2 rounded-xl text-sm transition', theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
