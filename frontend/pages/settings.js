// pages/settings.js — User Settings
import { useEffect, useState, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api, { getCachedSettings, setCachedSettings, clearSettingsCache } from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import { showError } from '../lib/errorHandler';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';

export default function SettingsPage({ theme, setTheme, user, authLoading, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const [saving, setSaving]       = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  const [settings, setSettings]       = useState({ tiktokUsername: '' });
  const [heapMB, setHeapMB]           = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyAccount,  setSpotifyAccount]  = useState(''); // displayName

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        let s = getCachedSettings();
        if (!s) {
          const res = await api.get('/api/settings');
          s = res.data.settings;
          setCachedSettings(s);
        }
        setSettings(prev => ({ ...prev, ...s }));
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.error('[Settings] load failed:', err?.message);
      }
    })();
  }, [user]);

  // ── Spotify status ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get('/api/spotify/status').then(r => {
      setSpotifyConnected(r.data.connected);
      if (r.data.connected) setSpotifyAccount(r.data.displayName || '');
    }).catch(() => {});
    // รับ message จาก popup เมื่อ connect สำเร็จ
    const onMsg = (e) => {
      if (e.data === 'spotify_connected') {
        setSpotifyConnected(true);
        // ดึงชื่อบัญชีใหม่หลัง connect
        api.get('/api/spotify/status').then(r => setSpotifyAccount(r.data.displayName || '')).catch(() => {});
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [user]);

  const connectSpotify = async () => {
    try {
      // window.open ส่ง Authorization header ไม่ได้ → ใช้ ?t=<idToken> แทน
      const idToken = await auth.currentUser.getIdToken();
      window.open(
        `${API_URL}/api/spotify/auth?t=${encodeURIComponent(idToken)}`,
        'spotify_auth',
        'width=500,height=700'
      );
    } catch {
      toast.error('ไม่สามารถเริ่ม Spotify connect ได้ — ลอง login ใหม่');
    }
  };

  const disconnectSpotify = async () => {
    await api.delete('/api/spotify/disconnect').catch(() => {});
    setSpotifyConnected(false);
  };

  // ── Browser tab memory (JS Heap) ─────────────────────────────────────────
  useEffect(() => {
    const readHeap = () => {
      const mem = performance?.memory;
      if (!mem) return;
      setHeapMB(Math.round(mem.usedJSHeapSize / 1024 / 1024));
    };
    readHeap();
    const interval = setInterval(readHeap, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleSave = async () => {
    if (!user) { setShowLoginModal(true); return; }
    setSaving(true);
    try {
      await api.post('/api/settings', { settings });
      clearSettingsCache();
      toast.success('บันทึก settings แล้ว ✅');
    } catch (err) {
      showError(err, 'บันทึก Settings ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = useCallback(() => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    setSettings(s => ({ ...s, theme: t }));
  }, [theme, setTheme]);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const inputClass = clsx(
    'w-full px-3 py-2 rounded-lg text-sm outline-none border transition',
    theme === 'dark'
      ? 'bg-gray-800 border-gray-700 text-white focus:border-brand-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-brand-500'
  );

  return (
    <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className={clsx('p-4 md:p-6 max-w-2xl', sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-56')}>
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>⚙️ Settings</h1>
          <div className="flex items-center gap-2">
            {/* Global Export Backup */}
            {user && (
              <button
                onClick={async () => {
                  const toastId = toast.loading('กำลังเตรียมไฟล์...');
                  try {
                    const res  = await api.get('/api/settings');
                    const data = {
                      version: 1,
                      exportedAt: new Date().toISOString(),
                      tab: 'all',
                      settings: res.data,
                    };
                    const json     = JSON.stringify(data, null, 2);
                    const filename = `ttplus-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    const uri      = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
                    const a        = document.createElement('a');
                    a.href = uri; a.download = filename;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a);
                    toast.success('⬇ Full Backup เรียบร้อย', { id: toastId });
                  } catch (err) {
                    toast.error('Export ไม่สำเร็จ: ' + err.message, { id: toastId });
                  }
                }}
                title="Export การตั้งค่าทั้งหมดเป็นไฟล์ Backup"
                className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition',
                  theme === 'dark' ? 'bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
              >
                ⬇ Full Backup
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 text-lg">{theme === 'dark' ? '☀️' : '🌙'}</button>
          </div>
        </div>
        <div className="space-y-4">
          {/* Spotify — แสดงเสมอ (login หรือไม่ก็ตาม) */}
          <Section title="🎵 Spotify — Now Playing Widget" theme={theme}>
            <Label theme={theme}>เชื่อมต่อ Spotify เพื่อให้ widget แสดงเพลงที่กำลังฟังอยู่ใน OBS / TikTok Studio</Label>

            {!user ? (
              /* ยังไม่ login */
              <div className={clsx(
                'flex items-center gap-3 mt-2 px-3 py-2.5 rounded-lg border text-xs',
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-400'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              )}>
                <span className="text-base">🔒</span>
                <span>Login ก่อน แล้วกลับมาเชื่อมต่อ Spotify ที่นี่</span>
              </div>
            ) : spotifyConnected ? (
              /* connect แล้ว */
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                    เชื่อมต่อแล้ว
                  </span>
                  {spotifyAccount ? (
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700')}>
                      🎵 {spotifyAccount}
                    </span>
                  ) : null}
                  <button
                    onClick={disconnectSpotify}
                    className="text-xs text-gray-500 hover:text-red-400 transition underline">
                    ยกเลิก
                  </button>
                </div>
                <p className={clsx('text-[10px]', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
                  Copy Widget URL ได้ที่แถบ <strong>Widgets</strong> → Now Playing
                </p>
              </div>
            ) : (
              /* ยัง connect ไม่ได้ */
              <div className="mt-2 space-y-2">
                <button
                  onClick={connectSpotify}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90 active:scale-95"
                  style={{ background: '#1DB954', color: '#000' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  เชื่อมต่อ Spotify
                </button>
                <p className={clsx('text-[10px]', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                  หน้าต่าง Spotify จะเปิดขึ้นมา — อนุญาตแล้วปิดหน้าต่างได้เลย
                </p>
              </div>
            )}
          </Section>

          <Section title="TikTok" theme={theme}>
            <Label theme={theme}>Default TikTok Username</Label>
            <input className={inputClass} value={settings.tiktokUsername || ''} onChange={e => set('tiktokUsername', e.target.value)} placeholder="@username" />
          </Section>
          {/* Browser Tab RAM */}
          {heapMB !== null && (
            <Section title="🖥 การใช้งาน RAM (Browser Tab นี้)" theme={theme}>
              <Label theme={theme}>RAM ที่ ttsam.app ใช้อยู่ใน browser tab นี้ — อัพเดตทุก 5 วินาที</Label>
              <div className={clsx('rounded-lg p-3 mt-1 flex items-center gap-4', theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100')}>
                <p className={clsx('text-3xl font-bold tabular-nums', heapMB > 300 ? 'text-red-400' : heapMB > 150 ? 'text-yellow-400' : 'text-green-400')}>
                  {heapMB}<span className="text-sm font-normal text-gray-500"> MB</span>
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">JS Heap ที่ใช้จริง<br/>วัดเฉพาะ tab นี้เท่านั้น<br/>(รองรับเฉพาะ Chrome)</p>
              </div>
            </Section>
          )}

          <Section title="Appearance" theme={theme}>
            <Label theme={theme}>Theme</Label>
            <div className="flex gap-2">
              {['dark', 'light'].map(t => (
                <button key={t} onClick={() => { if (theme !== t) toggleTheme(); }}
                  className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize',
                    theme === t ? 'bg-brand-500 text-white' : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600')}>
                  {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </Section>

        </div>
        <button onClick={handleSave} disabled={saving}
          className="mt-6 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
          {saving ? 'กำลังบันทึก...' : user ? '💾 บันทึก Settings' : '🔒 เข้าสู่ระบบเพื่อบันทึก'}
        </button>
      </main>
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อบันทึก Settings</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
              {loginLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'G'}
              {loginLoading ? 'กำลัง Login...' : 'เข้าสู่ระบบด้วย Google'}
            </button>
            <button onClick={() => setShowLoginModal(false)} className={clsx('w-full mt-3 py-2 rounded-xl text-sm transition', theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, theme }) {
  return (
    <div className={clsx('rounded-xl p-4 space-y-3', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
      <h3 className={clsx('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>{title}</h3>
      {children}
    </div>
  );
}
function Label({ children, theme }) {
  return <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{children}</p>;
}
