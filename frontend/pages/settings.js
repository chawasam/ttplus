// pages/settings.js — User Settings
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api, { getCachedSettings, setCachedSettings, clearSettingsCache } from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';

export default function SettingsPage({ theme, setTheme }) {
  const [user, setUser]           = useState(null);
  const [saving, setSaving]       = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  const [settings, setSettings] = useState({
    tiktokUsername: '',
    alertSound: true,
    alertVolume: 80,
    chatMaxItems: 50,
    goalTarget: 100,
    goalType: 'gift',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        try {
          let s = getCachedSettings();
          if (!s) {
            const res = await api.get('/api/settings');
            s = res.data.settings;
            setCachedSettings(s);
          }
          setSettings(prev => ({ ...prev, ...s }));
        } catch (e) { /* ignore */ }
      }
    });
    return () => unsub();
  }, []);

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

  const handleSave = async () => {
    if (!user) { setShowLoginModal(true); return; }
    setSaving(true);
    try {
      await api.post('/api/settings', { settings });
      clearSettingsCache();
      toast.success('บันทึก settings แล้ว ✅');
    } catch (e) {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่');
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
      <Sidebar theme={theme} user={user} />

      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>⚙️ Settings</h1>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 text-lg" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="space-y-4">

          {/* TikTok */}
          <Section title="TikTok" theme={theme}>
            <Label theme={theme}>Default TikTok Username</Label>
            <input
              className={inputClass}
              value={settings.tiktokUsername || ''}
              onChange={e => set('tiktokUsername', e.target.value)}
              placeholder="@username"
            />
          </Section>

          {/* Theme */}
          <Section title="Appearance" theme={theme}>
            <Label theme={theme}>Theme</Label>
            <div className="flex gap-2">
              {['dark', 'light'].map(t => (
                <button
                  key={t}
                  onClick={() => { if (theme !== t) toggleTheme(); }}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize',
                    theme === t
                      ? 'bg-brand-500 text-white'
                      : theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </Section>

          {/* Alert */}
          <Section title="Alert Settings" theme={theme}>
            <div className="flex items-center justify-between">
              <Label theme={theme}>เสียง Alert</Label>
              <Toggle value={settings.alertSound} onChange={v => set('alertSound', v)} />
            </div>
            <Label theme={theme}>ความดังเสียง ({settings.alertVolume}%)</Label>
            <input
              type="range" min="0" max="100"
              value={settings.alertVolume}
              onChange={e => set('alertVolume', +e.target.value)}
              className="w-full accent-brand-500"
            />
          </Section>

          {/* Chat */}
          <Section title="Chat Settings" theme={theme}>
            <Label theme={theme}>จำนวน comment สูงสุดใน Feed</Label>
            <input
              type="number" min="10" max="200"
              className={inputClass}
              value={settings.chatMaxItems}
              onChange={e => set('chatMaxItems', +e.target.value)}
            />
          </Section>

          {/* Goal */}
          <Section title="Goal Settings" theme={theme}>
            <Label theme={theme}>ประเภท Goal</Label>
            <select className={inputClass} value={settings.goalType} onChange={e => set('goalType', e.target.value)}>
              <option value="gift">จำนวน Gift</option>
              <option value="diamond">จำนวน Diamond</option>
              <option value="follower">จำนวน Follower</option>
            </select>
            <Label theme={theme} className="mt-2">เป้าหมาย</Label>
            <input
              type="number" min="1"
              className={inputClass}
              value={settings.goalTarget}
              onChange={e => set('goalTarget', +e.target.value)}
            />
          </Section>

        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : user ? '💾 บันทึก Settings' : '🔒 เข้าสู่ระบบเพื่อบันทึก'}
        </button>
      </main>

      {/* ===== Login Modal ===== */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}
        >
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อบันทึก Settings</p>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60"
            >
              {loginLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
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

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={clsx('w-10 h-5 rounded-full transition relative', value ? 'bg-brand-500' : 'bg-gray-600')}
    >
      <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', value ? 'left-5' : 'left-0.5')} />
    </button>
  );
}
