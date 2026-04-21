// pages/tts.js — TTS (สิริ) หน้าตั้งค่าเสียงอ่านออกเสียง
import { useEffect, useState, useCallback, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import { configureTTS, speak, onVoicesReady } from '../lib/tts';
import toast from 'react-hot-toast';
import { showError } from '../lib/errorHandler';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';

const DEFAULT_TTS = {
  enabled:    false,
  readChat:   true,
  readGift:   true,
  readFollow: true,
  rate:       1.0,
  pitch:      1.0,
  volume:     1.0,
  voice:      '',
};

export default function TtsPage({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
  const [tts, setTts]           = useState(DEFAULT_TTS);
  const [voices, setVoices]     = useState([]);
  const [saving, setSaving]     = useState(false);
  const [testText, setTestText] = useState('');
  const [simpleMode, setSimpleMode] = useState(true); // true = ง่าย, false = ปรับได้
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  const saveTimerRef  = useRef(null);
  const mountedRef    = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // โหลด voice list จาก browser
  useEffect(() => {
    const unsub = onVoicesReady(v => setVoices(v));
    return unsub;
  }, []);

  // โหลด settings จาก API
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
        const loaded = {
          enabled:    !!s.ttsEnabled,
          readChat:   s.ttsReadChat   !== false,
          readGift:   s.ttsReadGift   !== false,
          readFollow: s.ttsReadFollow !== false,
          rate:       s.ttsRate   || 1.0,
          pitch:      s.ttsPitch  || 1.0,
          volume:     s.ttsVolume !== undefined ? s.ttsVolume : 1.0,
          voice:      s.ttsVoice  || '',
        };
        setTts(loaded);
        configureTTS(loaded);
      } catch { /* ignore */ }
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

  // เปลี่ยนค่า → อัปเดต state + lib ทันที, debounce บันทึก API 600ms
  const handleChange = useCallback((key, val) => {
    if (!user) { setShowLoginModal(true); return; }
    const next = { ...tts, [key]: val };
    setTts(next);
    configureTTS(next);

    // ยกเลิก timer เดิม — รอหยุดเลื่อนแล้วค่อย save ครั้งเดียว
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      setSaving(true);
      try {
        await api.post('/api/settings', {
          settings: {
            ttsEnabled:    next.enabled,
            ttsReadChat:   next.readChat,
            ttsReadGift:   next.readGift,
            ttsReadFollow: next.readFollow,
            ttsRate:       next.rate,
            ttsPitch:      next.pitch,
            ttsVolume:     next.volume,
            ttsVoice:      next.voice,
          },
        });
        if (!mountedRef.current) return;
        setCachedSettings({
          ...(getCachedSettings() || {}),
          ttsEnabled:    next.enabled,
          ttsReadChat:   next.readChat,
          ttsReadGift:   next.readGift,
          ttsReadFollow: next.readFollow,
          ttsRate:       next.rate,
          ttsPitch:      next.pitch,
          ttsVolume:     next.volume,
          ttsVoice:      next.voice,
        });
      } catch (err) {
        if (mountedRef.current) showError(err, 'บันทึก TTS ไม่สำเร็จ');
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    }, 600);
  }, [tts, user]);

  // หาเสียงไทยตัวแรกจาก voices list
  const thaiVoice = voices.find(v => v.lang?.startsWith('th')) || null;

  // สลับ mode — ถ้าไปหน้าง่ายให้ reset rate/pitch + ใช้เสียงไทย
  const switchMode = useCallback((toSimple) => {
    setSimpleMode(toSimple);
    if (toSimple) {
      const thai = voices.find(v => v.lang?.startsWith('th'));
      const patch = { rate: 1.0, pitch: 1.0, voice: thai ? thai.name : '' };
      const next = { ...tts, ...patch };
      setTts(next);
      configureTTS(next);
      // save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        try {
          await api.post('/api/settings', { settings: {
            ttsEnabled: next.enabled, ttsReadChat: next.readChat, ttsReadGift: next.readGift,
            ttsReadFollow: next.readFollow, ttsRate: next.rate, ttsPitch: next.pitch,
            ttsVolume: next.volume, ttsVoice: next.voice,
          }});
          if (!mountedRef.current) return;
          setCachedSettings({ ...(getCachedSettings() || {}),
            ttsEnabled: next.enabled, ttsReadChat: next.readChat, ttsReadGift: next.readGift,
            ttsReadFollow: next.readFollow, ttsRate: next.rate, ttsPitch: next.pitch,
            ttsVolume: next.volume, ttsVoice: next.voice,
          });
        } catch (err) { if (mountedRef.current) showError(err, 'บันทึก TTS ไม่สำเร็จ'); }
      }, 600);
    }
  }, [tts, voices, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDark = theme === 'dark';
  const card   = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const inputCls = clsx('w-full px-3 py-2 rounded-lg text-sm outline-none border transition',
    isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900');

  return (
    <div className={clsx('min-h-screen', isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />

      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              🔊 TTS (สิริ)
            </h1>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
              ให้สิริอ่าน Chat
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-500">💾 กำลังบันทึก...</span>}
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 text-lg">{isDark ? '☀️' : '🌙'}</button>
          </div>
        </div>

        {!user && (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-brand-500/10 border-brand-500/25 text-brand-300' : 'bg-brand-50 border-brand-200 text-brand-700')}>
            🔒{' '}
            <button onClick={() => setShowLoginModal(true)} className="underline">เข้าสู่ระบบ</button>
            {' '}เพื่อบันทึกการตั้งค่า
          </div>
        )}

        <div className="space-y-4">

          {/* เปิด/ปิด */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                  เปิดใช้งาน TTS (สิริ)
                </h2>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {tts.enabled ? '✅ สิริพร้อมอ่านแล้ว' : 'ปิดอยู่ — กดเพื่อเปิด'}
                </p>
              </div>
              <Toggle value={tts.enabled} onChange={v => handleChange('enabled', v)} />
            </div>
          </div>


          {/* เสียงและความเร็ว */}
          <div className={clsx('rounded-2xl p-4 border', card)}>

            {/* Mode toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                เสียงและความเร็ว
              </h2>
              <div className={clsx('flex rounded-xl p-0.5 gap-0.5', isDark ? 'bg-gray-800' : 'bg-gray-100')}>
                {[
                  { val: true,  label: '⚡ ง่าย'   },
                  { val: false, label: '🎛️ ปรับได้' },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => switchMode(opt.val)}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition',
                      simpleMode === opt.val
                        ? 'bg-brand-500 text-white shadow-sm'
                        : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {simpleMode ? (
              /* ===== Mode ง่าย ===== */
              <div className="space-y-4">

                {/* เสียงภาษาไทย */}
                <div className={clsx('flex items-center gap-3 p-3 rounded-xl border',
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                  <span className="text-xl">🇹🇭</span>
                  <div>
                    <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                      เสียงภาษาไทย
                    </p>
                    <p className={clsx('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      {thaiVoice ? thaiVoice.name : 'ใช้เสียงเริ่มต้นของระบบ'}
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-green-400 font-semibold">✓ ใช้งาน</span>
                </div>

                {/* ความเร็ว + ระดับเสียง — fixed */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={clsx('flex items-center gap-2 p-3 rounded-xl border',
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <span className="text-lg">🐢</span>
                    <div>
                      <p className={clsx('text-xs font-semibold', isDark ? 'text-white' : 'text-gray-900')}>ความเร็ว</p>
                      <p className="text-xs text-brand-400 font-bold">x1.0</p>
                    </div>
                  </div>
                  <div className={clsx('flex items-center gap-2 p-3 rounded-xl border',
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <span className="text-lg">🎵</span>
                    <div>
                      <p className={clsx('text-xs font-semibold', isDark ? 'text-white' : 'text-gray-900')}>ระดับเสียง</p>
                      <p className="text-xs text-brand-400 font-bold">1.0</p>
                    </div>
                  </div>
                </div>

                {/* ความดัง — 3 preset */}
                <div>
                  <Label isDark={isDark}>ความดัง</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { pct: 0.25, label: '🔈 25%' },
                      { pct: 0.50, label: '🔉 50%' },
                      { pct: 1.00, label: '🔊 100%' },
                    ].map(opt => (
                      <button
                        key={opt.pct}
                        onClick={() => handleChange('volume', opt.pct)}
                        className={clsx(
                          'py-2.5 rounded-xl text-sm font-bold transition border',
                          Math.abs(tts.volume - opt.pct) < 0.01
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : isDark
                              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            ) : (
              /* ===== Mode ปรับได้ ===== */
              <div className="space-y-4">

                {voices.length > 0 && (
                  <div>
                    <Label isDark={isDark}>เสียง (Voice)</Label>
                    <select className={inputCls} value={tts.voice} onChange={e => handleChange('voice', e.target.value)}>
                      <option value="">— ค่าเริ่มต้น (เสียงไทยถ้ามี) —</option>
                      {voices.map(v => (
                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label isDark={isDark}>ความเร็ว ({tts.rate}x)</Label>
                  <input type="range" min="0.5" max="2" step="0.1" value={tts.rate}
                    onChange={e => handleChange('rate', +e.target.value)}
                    className="w-full accent-brand-500 mt-1" />
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5"><span>ช้า (0.5)</span><span>เร็ว (2.0)</span></div>
                </div>

                <div>
                  <Label isDark={isDark}>ระดับเสียง ({tts.pitch})</Label>
                  <input type="range" min="0.5" max="2" step="0.1" value={tts.pitch}
                    onChange={e => handleChange('pitch', +e.target.value)}
                    className="w-full accent-brand-500 mt-1" />
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5"><span>ต่ำ</span><span>สูง</span></div>
                </div>

                <div>
                  <Label isDark={isDark}>ความดัง ({Math.round(tts.volume * 100)}%)</Label>
                  <input type="range" min="0" max="1" step="0.05" value={tts.volume}
                    onChange={e => handleChange('volume', +e.target.value)}
                    className="w-full accent-brand-500 mt-1" />
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5"><span>เบา</span><span>ดัง</span></div>
                </div>
              </div>
            )}
          </div>

          {/* ทดสอบ */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <h2 className={clsx('font-semibold text-sm mb-3', isDark ? 'text-white' : 'text-gray-900')}>
              ทดสอบเสียง
            </h2>

            {/* ช่องพิมพ์ custom */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && testText.trim()) {
                    configureTTS({ ...tts, enabled: true });
                    speak(testText.trim(), null);
                  }
                }}
                placeholder="พิมพ์ข้อความแล้วกด ▶ หรือ Enter..."
                className={clsx('flex-1 px-3 py-2 rounded-lg text-sm outline-none border transition',
                  isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500'
                         : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-brand-500')}
              />
              <button
                onClick={() => {
                  if (!testText.trim()) return;
                  configureTTS({ ...tts, enabled: true });
                  speak(testText.trim(), null);
                }}
                disabled={!testText.trim()}
                className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold transition">
                ▶
              </button>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { text: 'สวัสดีครับ ผม TTplus', label: '👋 ทักทาย' },
                { text: 'มีคนส่งของขวัญ 10 ชิ้น', label: '🎁 Gift' },
                { text: 'มีคนใหม่ติดตามแล้ว', label: '➕ Follow' },
              ].map(({ text, label }) => (
                <button key={label}
                  onClick={() => {
                    configureTTS({ ...tts, enabled: true });
                    speak(text, null);
                  }}
                  className={clsx('py-2.5 rounded-xl text-xs font-semibold transition border',
                    isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อบันทึกการตั้งค่า TTS</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
              {loginLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
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

function Label({ children, isDark }) {
  return <p className={clsx('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{children}</p>;
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0',
        value ? 'bg-brand-500' : 'bg-gray-600')}
      role="switch" aria-checked={value}>
      <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}
