// pages/dashboard.js — Main Dashboard
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { connectSocket, disconnectSocket } from '../lib/socket';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import { showError } from '../lib/errorHandler';
import { sanitizeEvent } from '../lib/sanitize';
import { configureTTS, speak, clearTTSQueue } from '../lib/tts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ===== TikTok username helpers =====
const USERNAME_HISTORY_KEY = 'tiktok_usernames';
const LAST_USERNAME_KEY    = 'tiktok_last_username';
const MAX_HISTORY = 5;

function loadUsernameHistory() {
  try {
    return JSON.parse(localStorage.getItem(USERNAME_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function loadLastUsername() {
  try { return localStorage.getItem(LAST_USERNAME_KEY) || ''; } catch { return ''; }
}

function saveLastUsername(username) {
  try { localStorage.setItem(LAST_USERNAME_KEY, username); } catch { /* quota full */ }
}

function saveUsernameHistory(username, current) {
  const filtered = current.filter(u => u !== username);
  const next = [username, ...filtered].slice(0, MAX_HISTORY);
  try { localStorage.setItem(USERNAME_HISTORY_KEY, JSON.stringify(next)); } catch { /* quota full */ }
  return next;
}

import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import LiveFeed from '../components/LiveFeed';

const MAX_EVENTS = 100;

// user, authLoading มาจาก _app.js (global auth state)
export default function Dashboard({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
  const router = useRouter();

  const [tiktokUsername, setTiktokUsername] = useState('');
  const [connected, setConnected]           = useState(false);
  const [connecting, setConnecting]         = useState(false);

  const [viewers, setViewers]           = useState(0);
  const [totalLikes, setTotalLikes]     = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  const eventsRef       = useRef([]);
  const [events, setEvents] = useState([]);

  const socketRef = useRef(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);


  // ===== TikTok username history =====
  const [usernameHistory, setUsernameHistory] = useState([]);
  const [showHistory, setShowHistory]         = useState(false);
  const usernameInputRef = useRef(null);

  useEffect(() => {
    setUsernameHistory(loadUsernameHistory());
    // โหลด username ที่พิมพ์ล่าสุด (client-side only — ไม่รัน SSR)
    const last = loadLastUsername();
    if (last) setTiktokUsername(last);
  }, []);

  // ===== addEvent / updateLeaderboard — stable refs =====
  const addEvent = useCallback((event) => {
    const next = [...eventsRef.current.slice(-(MAX_EVENTS - 1)), event];
    eventsRef.current = next;
    setEvents(next);
  }, []);


  // ===== Socket Listeners =====
  const setupSocketListeners = useCallback((socket) => {
    socket.on('connection_status', (data) => {
      if (data.status === 'connected') {
        setConnected(true);
        setConnecting(false);
        toast.success(`✅ เชื่อมต่อ @${data.tiktokUsername} สำเร็จ!`);
        // Save to username history
        if (data.tiktokUsername) {
          setUsernameHistory(prev => saveUsernameHistory(data.tiktokUsername, prev));
        }
      } else if (data.status === 'disconnected') {
        setConnected(false);
        toast(`📴 ตัดการเชื่อมต่อแล้ว`);
      } else if (data.status === 'error') {
        setConnected(false);
        setConnecting(false);
        toast.error(data.message);
      }
    });
    socket.on('chat',     (data) => {
      const s = sanitizeEvent(data); addEvent(s); setTotalComments(c => c + 1);
      if (s.comment) speak(s.comment, 'chat');
    });
    socket.on('gift',     (data) => { addEvent(sanitizeEvent(data)); });
    socket.on('like',     (data) => { const s = sanitizeEvent(data); addEvent(s); if (s.totalLikeCount) setTotalLikes(s.totalLikeCount); });
    socket.on('follow',   (data) => { const s = sanitizeEvent(data); addEvent(s); });
    socket.on('share',    (data) => addEvent(sanitizeEvent(data)));
    socket.on('roomUser', (data) => setViewers(Math.max(0, Number(data.viewerCount) || 0)));
  }, [addEvent]);

  // ===== React to user prop (from _app.js) =====
  useEffect(() => {
    if (authLoading) return; // รอ auth check เสร็จก่อน

    if (user) {
      // Connect socket + load settings เมื่อ login แล้ว
      user.getIdToken().then(token => {
        const socket = connectSocket(token);
        socketRef.current = socket;
        setupSocketListeners(socket);
      });

      (async () => {
        try {
          let s = getCachedSettings();
          if (!s) {
            const res = await api.get('/api/settings');
            s = res.data.settings;
            setCachedSettings(s);
          }
          // ถ้ายังไม่มีใน localStorage ให้ใช้จาก settings
          if (s.tiktokUsername && !loadLastUsername()) {
            setTiktokUsername(s.tiktokUsername);
            saveLastUsername(s.tiktokUsername);
          }
          // Configure TTS from saved settings
          const ttsCfg = {
            enabled:    !!s.ttsEnabled,
            readChat:   s.ttsReadChat  !== false,
            readGift:   s.ttsReadGift  !== false,
            readFollow: s.ttsReadFollow !== false,
            rate:       s.ttsRate   || 1.0,
            pitch:      s.ttsPitch  || 1.0,
            volume:     s.ttsVolume !== undefined ? s.ttsVolume : 1.0,
            voice:      s.ttsVoice  || '',
          };
          configureTTS(ttsCfg); // โหลดค่า TTS เข้า lib เพื่อให้ speak() ทำงานถูกต้อง
        } catch { /* ignore */ }
      })();
    } else {
      // User logged out — disconnect socket
      disconnectSocket();
      socketRef.current = null;
      clearTTSQueue();
    }

    return () => {
      disconnectSocket();
      clearTTSQueue();
    };
  }, [user, authLoading, setupSocketListeners]);

  // ===== Google Login =====
  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      toast.success('เข้าสู่ระบบสำเร็จ!');
    } catch (err) {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    if (!user) { setShowLoginModal(true); return; }
    const rawUsername = tiktokUsername.trim();
    if (!rawUsername) { toast.error('กรุณากรอก TikTok username'); return; }
    const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 50);
    if (!cleanUsername) { toast.error('Username ไม่ถูกต้อง (ใช้ได้เฉพาะ a-z, 0-9, . และ _)'); return; }
    setConnecting(true);
    try {
      await api.post('/api/connect', { tiktokUsername: cleanUsername });
    } catch (err) {
      showError(err, 'ไม่สามารถเชื่อมต่อได้');
      setConnecting(false);
    }
  }, [user, tiktokUsername]);

  const handleDisconnect = useCallback(async () => {
    try {
      await api.post('/api/disconnect');
      setConnected(false);
      setViewers(0); setTotalLikes(0); setTotalComments(0);
      eventsRef.current = []; setEvents([]);
      clearTTSQueue();
    } catch { /* ignore */ }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    disconnectSocket();
    router.push('/');
  }, [router]);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  // Loading spinner ขณะรอ auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />

      <main className="ml-16 md:ml-56 p-4 md:p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>Dashboard</h1>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 hover:text-white transition text-lg" aria-label="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                {/* Profile picture */}
                {user.photoURL ? (
                  <img src={user.photoURL} alt="profile" className="w-7 h-7 rounded-full object-cover border border-gray-600" referrerPolicy="no-referrer" onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                {/* Email */}
                <span className={clsx('text-xs hidden sm:block max-w-[120px] truncate', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                  {user.email}
                </span>
                <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-400 transition px-2 py-1">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>

        {/* Connect Section */}
        <div className={clsx('rounded-2xl p-4 mb-5 border', theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm')}>
          <h2 className={clsx('text-sm font-semibold mb-3', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>🔴 TikTok Live</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={usernameInputRef}
                className={clsx('w-full px-3 py-2 rounded-lg text-sm outline-none border transition', theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500' : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-brand-500')}
                placeholder={user ? 'TikTok username (ไม่ต้องมี @)' : '🔒 ต้องเข้าสู่ระบบก่อนเชื่อมต่อ TikTok'}
                value={tiktokUsername}
                onChange={e => { setTiktokUsername(e.target.value); saveLastUsername(e.target.value); setShowHistory(true); }}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                onKeyDown={e => e.key === 'Enter' && !connected && !connecting && handleConnect()}
                disabled={connected || connecting}
              />
              {showHistory && !connected && !connecting && usernameHistory.length > 0 && (
                <div className={clsx('absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-20 overflow-hidden', theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
                  {usernameHistory
                    .filter(u => !tiktokUsername || u.toLowerCase().includes(tiktokUsername.toLowerCase()))
                    .map(u => (
                      <button key={u}
                        onMouseDown={e => { e.preventDefault(); setTiktokUsername(u); setShowHistory(false); }}
                        className={clsx('w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition', theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}>
                        <span className="text-gray-500 text-xs">🕐</span>
                        @{u}
                      </button>
                    ))}
                </div>
              )}
            </div>
            {connected ? (
              <button onClick={handleDisconnect} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition">
                ตัดการเชื่อมต่อ
              </button>
            ) : (
              <button onClick={handleConnect} disabled={connecting} className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-60">
                {connecting ? '⏳ กำลังเชื่อมต่อ...' : 'เชื่อมต่อ'}
              </button>
            )}
          </div>
          {!user && (
            <p className={clsx('text-xs mt-2', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
              🔒 ต้องเข้าสู่ระบบก่อนเชื่อมต่อ TikTok
            </p>
          )}
        </div>

        {/* Live Feed */}
        <div className="mb-5">
          <LiveFeed events={events} theme={theme} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="👥 ผู้ชม"   value={viewers}       theme={theme} />
          <StatCard label="❤️ Likes"   value={totalLikes}    theme={theme} />
          <StatCard label="💬 แชท"     value={totalComments} theme={theme} />
        </div>

      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อเชื่อมต่อ TikTok Live</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
              {loginLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }
              {loginLoading ? 'กำลัง Login...' : 'เข้าสู่ระบบด้วย Google'}
            </button>
            <button onClick={() => setShowLoginModal(false)} className={clsx('w-full mt-3 py-2 rounded-xl text-sm transition', theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}
