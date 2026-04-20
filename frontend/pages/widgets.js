// pages/widgets.js — OBS Widgets + per-widget style editor
import { useEffect, useState, useRef, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import WidgetStyleEditor from '../components/WidgetStyleEditor';
import { WIDGET_DEFAULTS, styleToParams } from '../lib/widgetStyles';

const WIDGETS = [
  { id: 'coinjar',     icon: '🫙', name: 'Coin Jar',      desc: 'โถฟิสิกส์ของขวัญ TikTok',  size: '400 × 600' },
  { id: 'alert',       icon: '🔔', name: 'Gift Alert',    desc: 'Popup เมื่อมีคนส่ง gift',   size: '400 × 150' },
  { id: 'chat',        icon: '💬', name: 'Chat Overlay',  desc: 'แสดง comment บนจอ',          size: '400 × 600' },
  { id: 'leaderboard', icon: '🏆', name: 'Leaderboard',   desc: 'อันดับผู้ส่งของขวัญ',        size: '300 × 400' },
  { id: 'goal',        icon: '🎯', name: 'Goal Bar',      desc: 'Progress bar เป้าหมาย',     size: '500 × 80'  },
  { id: 'viewers',     icon: '👥', name: 'Viewer Count',  desc: 'แสดงจำนวนคนดู',             size: '200 × 80'  },
];

// user, authLoading มาจาก _app.js
export default function WidgetsPage({ theme, setTheme, user, authLoading }) {
  const [widgetToken, setWidgetToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [baseUrl, setBaseUrl]         = useState('');
  const [styles, setStyles]           = useState(() =>
    Object.fromEntries(
      Object.entries(WIDGET_DEFAULTS).map(([k, v]) => [k, { ...v }])
    )
  );
  const [expanded, setExpanded]       = useState({});
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);

  const socketRef = useRef(null);

  // ===== React to user prop =====
  useEffect(() => {
    setBaseUrl(window.location.origin);
    if (authLoading) return;

    if (user) {
      // Connect socket for real-time style push
      user.getIdToken().then(token => {
        const socket = connectSocket(token);
        socketRef.current = socket;
      });

      // Load settings + fetch widget token
      (async () => {
        try {
          let s = getCachedSettings();
          if (!s) {
            const res = await api.get('/api/settings');
            s = res.data.settings;
            setCachedSettings(s);
          }
          if (s?.widgetStyles) {
            setStyles(prev => {
              const merged = { ...prev };
              for (const id of Object.keys(prev)) {
                merged[id] = { ...WIDGET_DEFAULTS[id], ...(s.widgetStyles[id] || {}) };
              }
              return merged;
            });
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error('[Widgets] settings load failed:', err?.message);
        }
        await fetchWidgetToken(user); // ส่ง user โดยตรง ไม่ใช่ state
      })();
    } else {
      // Not logged in — no socket needed on widgets page
      setWidgetToken('');
    }

    return () => {
      // ไม่ disconnect socket ที่นี่ เพราะ dashboard อาจยังใช้อยู่
    };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      toast.success('เข้าสู่ระบบสำเร็จ!');
    } catch {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const fetchWidgetToken = useCallback(async (forceUser) => {
    const u = forceUser ?? user;
    if (!u) { setShowLoginModal(true); return; }
    setTokenLoading(true);
    try {
      const res   = await api.post('/api/widget-token');
      const token = res.data?.token;
      if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
        setWidgetToken(token);
      } else {
        toast.error('Widget Token ไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch (err) {
      const status = err?.response?.status;
      const code   = status ? `ERR-${status}` : 'ERR-NET';
      toast.error(`[${code}] ไม่สามารถสร้าง Widget Token ได้ — แจ้งโค้ดนี้เพื่อขอความช่วยเหลือ`);
    } finally {
      setTokenLoading(false);
    }
  }, [user]);

  const getWidgetUrl = useCallback((widgetId) => {
    if (!widgetToken || !baseUrl) return '';
    const style  = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    const styleQ = styleToParams(style, widgetId);
    const base   = `${baseUrl}/widget/${widgetId}?wt=${widgetToken}`;
    return styleQ ? `${base}&${styleQ}` : base;
  }, [widgetToken, baseUrl, styles]);

  const copyUrl = useCallback((widgetId) => {
    if (!user) { setShowLoginModal(true); return; }
    const url = getWidgetUrl(widgetId);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('✅ Copy URL แล้ว! วางใน TikTok Studio ได้เลย');
    });
  }, [user, getWidgetUrl]);

  const getPreviewUrl = useCallback((widgetId) => {
    if (!baseUrl) return '#';
    const style  = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    const styleQ = styleToParams(style, widgetId);
    const base   = `${baseUrl}/widget/${widgetId}?preview=1`;
    return styleQ ? `${base}&${styleQ}` : base;
  }, [baseUrl, styles]);

  const saveStyleForWidget = useCallback(async (widgetId, style) => {
    if (!user) { setShowLoginModal(true); return; }
    const newStyles = { ...styles, [widgetId]: style };
    setStyles(newStyles);

    // ===== Real-time push ไปยัง widget ที่เปิดอยู่ใน OBS =====
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit('push_style_update', { widgetId, style });
    }

    try {
      await api.post('/api/settings', { settings: { widgetStyles: newStyles } });
      toast.success(`✅ บันทึก ${WIDGETS.find(w => w.id === widgetId)?.name} แล้ว`);
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.error;
      if (status === 403) toast.error('⚠️ Session หมดอายุ กรุณา Refresh หน้าเว็บ');
      else if (status === 401) toast.error('⚠️ กรุณา Login ใหม่');
      else if (msg)  toast.error(`บันทึกไม่สำเร็จ: ${msg}`);
      else           toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    }
  }, [user, styles]);

  const toggleExpand = useCallback((id) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] })), []);

  const tokenReady = !!widgetToken && !tokenLoading;

  const isDark  = theme === 'dark';
  const bg      = isDark ? 'bg-gray-950 text-white'       : 'bg-gray-100 text-gray-900';
  const card    = isDark ? 'bg-gray-900 border-gray-800'  : 'bg-white border-gray-200 shadow-sm';
  const divider = isDark ? 'border-gray-800'              : 'border-gray-100';
  const urlBox  = isDark ? 'bg-gray-800 text-gray-400'    : 'bg-gray-100 text-gray-500';
  const btn2nd  = isDark
    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
    : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600';

  return (
    <div className={clsx('min-h-screen', bg)}>
      <Sidebar theme={theme} user={user} />

      <main className="ml-16 md:ml-56 p-4 md:p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              OBS / TikTok Studio Widgets
            </h1>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
              Copy URL แล้ววางใน TikTok Studio หรือ OBS — ปรับแต่งสีแล้วบันทึก Widget จะ update ทันที ✨
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <button onClick={() => setShowLoginModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
                เข้าสู่ระบบ
              </button>
            )}
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 text-lg" aria-label="Toggle theme">
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Token status */}
        {!user ? (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-brand-500/10 border-brand-500/25 text-brand-300' : 'bg-brand-50 border-brand-200 text-brand-700')}>
            🔒{' '}
            <button onClick={() => setShowLoginModal(true)} className="underline hover:no-underline transition">
              เข้าสู่ระบบ
            </button>
            {' '}เพื่อรับ Widget URL สำหรับใช้งานจริงใน OBS / TikTok Studio
          </div>
        ) : tokenReady ? (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-green-500/10 border-green-500/25 text-green-400' : 'bg-green-50 border-green-200 text-green-700')}>
            ✅ Widget URL ของคุณพร้อมใช้งาน — URL นี้ผูกกับบัญชีของคุณ ไม่เปลี่ยนแปลง 🔗
          </div>
        ) : (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
            ⏳ {tokenLoading ? 'กำลังโหลด Widget URL...' : 'กำลังเตรียม Widget URL...'}
          </div>
        )}

        {/* วิธีใช้ */}
        <div className={clsx('rounded-xl p-4 mb-6 border',
          isDark ? 'bg-blue-500/10 border-blue-500/25' : 'bg-blue-50 border-blue-200')}>
          <h3 className="text-blue-400 font-semibold text-sm mb-3">📌 วิธีใช้กับ TikTok Studio / OBS</h3>
          <div className="space-y-2">
            {[
              { n: '1', t: 'Login ด้วย Google',    d: 'กดปุ่ม Login มุมขวาบน — URL ของคุณจะถูกสร้างอัตโนมัติและไม่เปลี่ยนแปลง' },
              { n: '2', t: 'Copy URL ของ Widget',   d: 'กด 📋 Copy URL → วางใน OBS หรือ TikTok Studio ครั้งเดียวพอ' },
              { n: '3', t: 'Customize ได้ตลอด',    d: 'กด ⚙️ Customize → ปรับสี → กด บันทึก → Widget update ทันที ไม่ต้อง copy URL ใหม่!' },
              { n: '4', t: 'TikTok Studio',          d: 'Add Sources → Link → วาง URL' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 bg-blue-500 text-white">{s.n}</span>
                <div>
                  <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{s.t}</p>
                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget Cards */}
        <div className="space-y-4">
          {WIDGETS.map((w) => {
            const style  = styles[w.id] || WIDGET_DEFAULTS[w.id];
            const url    = getWidgetUrl(w.id);
            const isOpen = !!expanded[w.id];

            return (
              <div key={w.id} className={clsx('rounded-xl border overflow-hidden', card)}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{w.icon}</span>
                      <div>
                        <h3 className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{w.name}</h3>
                        <p className={clsx('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>{w.desc}</p>
                      </div>
                    </div>
                    <span className={clsx('text-xs px-2 py-1 rounded font-mono flex-shrink-0', isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}>
                      {w.size} px
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx('flex-1 rounded-lg px-3 py-2 font-mono text-xs truncate cursor-pointer select-all', urlBox)}
                      title={tokenReady ? url : ''}
                      onClick={() => tokenReady && copyUrl(w.id)}>
                      {tokenReady
                        ? (url.length > 54 ? url.slice(0, 54) + '…' : url)
                        : (tokenLoading ? '⏳ กำลังโหลด...' : '— กด Refresh Token ก่อน —')}
                    </div>
                    <button onClick={() => copyUrl(w.id)} disabled={!tokenReady}
                      className="flex-shrink-0 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap">
                      📋 Copy URL
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <a href={getPreviewUrl(w.id)} target="_blank" rel="noreferrer"
                      className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold text-center transition border', btn2nd)}>
                      ▶ Test
                    </a>
                    <button onClick={() => toggleExpand(w.id)}
                      className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold transition border',
                        isOpen ? 'bg-brand-500/10 border-brand-500/40 text-brand-400' : btn2nd)}>
                      ⚙️ {isOpen ? 'ปิด' : 'Customize'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className={clsx('border-t px-4 pb-4 pt-3', divider)}>
                    <WidgetStyleEditor
                      widgetId={w.id}
                      style={style}
                      onChange={newStyle => setStyles(prev => ({ ...prev, [w.id]: newStyle }))}
                      theme={theme}
                    />
                    <button onClick={() => saveStyleForWidget(w.id, style)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
                      💾 บันทึกและ Update Widget {w.name} แบบ Real-time
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อรับ Widget URL</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
              {loginLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }
              {loginLoading ? 'กำลัง Login...' : 'เข้าสู่ระบบด้วย Google'}
            </button>
            <button onClick={() => setShowLoginModal(false)}
              className={clsx('w-full mt-3 py-2 rounded-xl text-sm transition', isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
