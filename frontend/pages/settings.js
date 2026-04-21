// pages/settings.js — User Settings
import { useEffect, useState, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api, { getCachedSettings, setCachedSettings, clearSettingsCache } from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import { showError } from '../lib/errorHandler';

export default function SettingsPage({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
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
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />
      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>⚙️ Settings</h1>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 text-lg">{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
        <div className="space-y-4">
          <Section title="TikTok" theme={theme}>
            <Label theme={theme}>Default TikTok Username</Label>
            <input className={inputClass} value={settings.tiktokUsername || ''} onChange={e => set('tiktokUsername', e.target.value)} placeholder="@username" />
          </Section>
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
          <Section title="Alert Settings" theme={theme}>
            <div className="flex items-center justify-between">
              <Label theme={theme}>เสียง Alert</Label>
              <Toggle value={settings.alertSound} onChange={v => set('alertSound', v)} />
            </div>
            <Label theme={theme}>ความดังเสียง ({settings.alertVolume}%)</Label>
            <input type="range" min="0" max="100" value={settings.alertVolume} onChange={e => set('alertVolume', +e.target.value)} className="w-full accent-brand-500" />
          </Section>
          <Section title="Chat Settings" theme={theme}>
            <Label theme={theme}>จำนวน comment สูงสุดใน Feed</Label>
            <input type="number" min="10" max="200" className={inputClass} value={settings.chatMaxItems} onChange={e => set('chatMaxItems', +e.target.value)} />
          </Section>
          <Section title="Goal Settings" theme={theme}>
            <Label theme={theme}>ประเภท Goal</Label>
            <select className={inputClass} value={settings.goalType} onChange={e => set('goalType', e.target.value)}>
              <option value="gift">จำนวน Gift</option>
              <option value="diamond">จำนวน Diamond</option>
              <option value="follower">จำนวน Follower</option>
            </select>
            <Label theme={theme} className="mt-2">เป้าหมาย</Label>
            <input type="number" min="1" className={inputClass} value={settings.goalTarget} onChange={e => set('goalTarget', +e.target.value)} />
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
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className={clsx('w-10 h-5 rounded-full transition relative', value ? 'bg-brand-500' : 'bg-gray-600')}>
      <span className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', value ? 'left-5' : 'left-0.5')} />
    </button>
  );
}
