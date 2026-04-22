// pages/tts.js — TTS (สิริ) หน้าตั้งค่าเสียงอ่านออกเสียง
import { useEffect, useState, useCallback, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import {
  configureTTS, speak, speakDirect, onVoicesReady,
  GEMINI_31_MODEL, GEMINI_25_MODEL,
  GOOGLE_THAI_VOICES, loadGoogleApiKey, saveGoogleApiKey,
  GEMINI_VOICES, GEMINI_PERSONAS, loadGeminiApiKey, saveGeminiApiKey,
  loadGeminiShuffle, saveGeminiShuffle,
  loadEnabledEngines, saveEnabledEngines,
} from '../lib/tts';
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
  const [tts, setTts]               = useState(DEFAULT_TTS);
  const [voices, setVoices]         = useState([]);
  const [saving, setSaving]         = useState(false);
  const [testText, setTestText]     = useState('');
  const [simpleMode, setSimpleMode] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  const [googleKey, setGoogleKey]   = useState('');
  const [googleVoice, setGoogleVoice] = useState('th-TH-Neural2-C');
  const [showKey, setShowKey]             = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [showGoogleSection, setShowGoogleSection] = useState(false);
  // Gemini state
  const [geminiKey, setGeminiKey]         = useState('');
  const [geminiVoice, setGeminiVoice]     = useState('Aoede');
  const [geminiPersona, setGeminiPersona] = useState('');
  const [showGeminiKey, setShowGeminiKey]     = useState(false);
  const [testingGemini31, setTestingGemini31]   = useState(false);
  const [testingGemini25, setTestingGemini25]   = useState(false);
  const [geminiShuffle, setGeminiShuffle]   = useState(false);
  const [enabledEngines, setEnabledEngines] = useState(['web']);
  const [testGeminiText, setTestGeminiText]   = useState('สวัสดีค่ะ');
  const [testGoogleText, setTestGoogleText]   = useState('สวัสดีค่ะ');
  const [testWebText, setTestWebText]         = useState('สวัสดีค่ะ');
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

  // โหลด Google + Gemini API keys จาก localStorage
  useEffect(() => {
    const gKey   = loadGoogleApiKey();
    const gVoice = localStorage.getItem('ttplus_google_tts_voice') || 'th-TH-Neural2-C';
    setGoogleKey(gKey);
    setGoogleVoice(gVoice);

    const mKey      = loadGeminiApiKey();
    const mVoice    = localStorage.getItem('ttplus_gemini_voice')   || 'Aoede';
    const mPersona  = localStorage.getItem('ttplus_gemini_persona') || '';
    const mShuffle  = loadGeminiShuffle();
    const engs      = loadEnabledEngines();
    setGeminiKey(mKey);
    setGeminiVoice(mVoice);
    setGeminiPersona(mPersona);
    setGeminiShuffle(mShuffle);
    setEnabledEngines(engs);

    if (mKey || gKey) {
      configureTTS({ googleApiKey: gKey, googleVoice: gVoice, geminiApiKey: mKey, geminiVoice: mVoice, geminiPersona: mPersona, geminiShuffle: mShuffle, enabledEngines: engs });
      setShowGoogleSection(true);
    } else {
      configureTTS({ enabledEngines: engs });
    }
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

  // เสียงไทยทั้งหมด + เรียง: Neural/Online ขึ้นก่อน
  const thaiVoices = voices
    .filter(v => v.lang?.startsWith('th'))
    .sort((a, b) => {
      const score = v => (v.localService ? 0 : 1); // online/neural ขึ้นก่อน
      return score(b) - score(a);
    });

  // สลับ mode — ถ้าไปหน้าง่ายให้ reset rate/pitch
  const switchMode = useCallback((toSimple) => {
    setSimpleMode(toSimple);
  }, []);

  const isDark   = theme === 'dark';
  const card     = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  // การ์ด paid engine (Gemini 3.1 / 2.5 / Google Cloud) — ไฮไลสีชมพูจางๆ
  const paidCard = isDark ? 'bg-pink-950/25 border-pink-900/50' : 'bg-rose-50 border-rose-100 shadow-sm';
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

          {/* ══ 1. เปิด/ปิด ══ */}
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

          {/* ══ 2. Web Speech ฟรี — เสียงและความเร็ว + ทดสอบ (รวมการ์ดเดียว) ══ */}
          <div className={clsx('rounded-2xl p-4 border', card)}>

            {/* Header + mode toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                🔈 Web Speech
                <span className="text-xs font-normal text-brand-400 ml-1.5">ฟรี ไม่ต้อง key</span>
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
              /* ── Mode ง่าย ── */
              <div className="space-y-4">
                <div>
                  <Label isDark={isDark}>เสียงภาษาไทย ({thaiVoices.length} เสียงในเครื่องคุณ)</Label>
                  {thaiVoices.length === 0 ? (
                    <div className={clsx('p-3 rounded-xl border text-xs', isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500')}>
                      ไม่พบเสียงไทยในเครื่อง — ใช้เสียงเริ่มต้นของระบบ
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-1">
                      {thaiVoices.map(v => {
                        const isSelected = tts.voice === v.name || (!tts.voice && v === thaiVoices[0]);
                        const isOnline   = !v.localService;
                        return (
                          <button
                            key={v.name}
                            onClick={() => handleChange('voice', v.name)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition',
                              isSelected
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : isDark
                                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            )}>
                            <span className="text-base flex-shrink-0">{isOnline ? '🌐' : '💻'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{v.name}</p>
                              <p className={clsx('text-xs', isSelected ? 'text-white/70' : isDark ? 'text-gray-500' : 'text-gray-400')}>
                                {isOnline ? 'Online · Neural (เสียงดีกว่า)' : 'Offline · ในเครื่อง'}
                              </p>
                            </div>
                            {isSelected && <span className="text-xs font-bold flex-shrink-0">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              /* ── Mode ปรับได้ ── */
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

            {/* ── divider + ทดสอบ ── */}
            <div className={clsx('border-t mt-4 pt-4', isDark ? 'border-gray-800' : 'border-gray-100')}>
              <p className={clsx('text-xs font-semibold mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>ทดสอบเสียง</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={testWebText}
                  onChange={e => setTestWebText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.nextSibling?.click(); }}
                  className={clsx('flex-1 px-3 py-2 rounded-lg text-sm outline-none border transition',
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500'
                           : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-brand-500')}
                />
                <button
                  onClick={async () => {
                    if (!testWebText.trim()) return;
                    configureTTS({ voice: tts.voice, rate: tts.rate, pitch: tts.pitch, volume: tts.volume });
                    try {
                      await speakDirect('web', testWebText.trim());
                    } catch (e) {
                      toast.error(`Web Speech: ${e.message}`);
                    }
                  }}
                  disabled={!testWebText.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold transition">
                  ▶
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { text: 'สวัสดีครับ ผม TTsam', label: '👋 ทักทาย' },
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

          {/* ══ 3. Engine Mode ══ */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <h2 className={clsx('font-semibold text-sm mb-1', isDark ? 'text-white' : 'text-gray-900')}>
              🎚️ เลือก Engine เสียง
            </h2>
            <p className={clsx('text-xs mb-3', isDark ? 'text-gray-500' : 'text-gray-400')}>
              ติ๊กเลือกได้หลายตัว — ระบบลองตามลำดับ ถ้าตัวแรกล้มเหลวข้ามถัดไปอัตโนมัติ
            </p>

            {[
              { id: 'gemini31', icon: '✨', label: 'Gemini 3.1 Flash TTS', sub: '30 เสียง × 10 persona = 300 combo', color: 'text-purple-400', needKey: 'gemini' },
              { id: 'gemini25', icon: '🌟', label: 'Gemini 2.5 Flash TTS', sub: '30 เสียง × 10 persona = 300 combo', color: 'text-violet-400', needKey: 'gemini' },
              { id: 'google',   icon: '🔑', label: 'Google Cloud TTS',     sub: 'Neural Thai · เสียงดีมาก',         color: 'text-green-400',  needKey: 'google'  },
              { id: 'web',      icon: '🔈', label: 'Web Speech',            sub: 'ฟรี · ไม่ต้อง key',               color: 'text-brand-400',  needKey: null      },
            ].map(({ id, icon, label, sub, color, needKey }, idx) => {
              const checked   = enabledEngines.includes(id);
              const missingKey = needKey === 'gemini' ? !geminiKey : needKey === 'google' ? !googleKey : false;
              const priority  = (() => {
                const order = ['gemini31','gemini25','google','web'];
                const pos   = enabledEngines.filter(e => order.indexOf(e) <= order.indexOf(id)).length;
                return checked ? pos : null;
              })();

              const toggle = () => {
                setEnabledEngines(prev => {
                  const next = prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id];
                  // ป้องกัน empty — อย่างน้อยต้องมีหนึ่ง
                  const result = next.length > 0 ? next : ['web'];
                  saveEnabledEngines(result);
                  configureTTS({ enabledEngines: result });
                  return result;
                });
              };

              return (
                <label key={id}
                  onClick={toggle}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border mb-2 cursor-pointer transition select-none',
                    checked
                      ? isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-300'
                      : isDark ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-white border-gray-200 opacity-60'
                  )}>
                  {/* Checkbox */}
                  <div className={clsx(
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition',
                    checked ? 'bg-brand-500 border-brand-500' : isDark ? 'border-gray-600' : 'border-gray-300'
                  )}>
                    {checked && <span className="text-white text-xs font-bold">✓</span>}
                  </div>

                  <span className="text-base leading-none flex-shrink-0">{icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{label}</p>
                    <p className={clsx('text-xs mt-0.5', color)}>{sub}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {missingKey && checked && (
                      <span className="text-xs text-yellow-500">⚠️ ต้อง key</span>
                    )}
                    {checked && priority !== null && (
                      <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded',
                        isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')}>
                        #{priority}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}

            {/* แสดงลำดับจริงที่จะใช้ */}
            {enabledEngines.length > 0 && (
              <p className={clsx('text-xs mt-1', isDark ? 'text-gray-600' : 'text-gray-400')}>
                ลำดับ:{' '}
                {['gemini31','gemini25','google','web']
                  .filter(e => enabledEngines.includes(e))
                  .map(e => ({ gemini31:'Gemini 3.1', gemini25:'Gemini 2.5', google:'Google Cloud', web:'Web Speech' }[e]))
                  .join(' → ')
                }
              </p>
            )}
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowGoogleSection(s => !s)}
            className={clsx('w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs transition',
              isDark ? 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                     : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300')}>
            <span>⚙️ ตั้งค่าขั้นสูง (Advanced)</span>
            <span className="flex items-center gap-2">
              {geminiKey && <span className="text-purple-400 font-semibold">Gemini ✓</span>}
              {googleKey && !geminiKey && <span className="text-green-400 font-semibold">Google ✓</span>}
              {showGoogleSection ? '▲' : '▼'}
            </span>
          </button>

          {showGoogleSection && (<>

          {/* ─── Gemini 3.1 TTS ─── */}
          <div className={clsx('rounded-2xl p-4 border', paidCard)}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                ✨ Gemini 3.1 TTS
                <span className="text-xs font-normal text-purple-400 ml-2">ใหม่ล่าสุด · 300 combo</span>
              </h2>
              {geminiKey
                ? <span className="text-xs text-purple-400 font-semibold">✓ เปิดใช้งาน</span>
                : <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>ปิดอยู่</span>}
            </div>
            <p className={clsx('text-xs mb-3', isDark ? 'text-gray-500' : 'text-gray-400')}>
              โมเดลใหม่ล่าสุดจาก Google — ใช้ Google AI Studio key (ฟรี) เก็บในเครื่องคุณ ไม่ส่ง server
            </p>

            {/* Gemini API key */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIza... (จาก aistudio.google.com)"
                  className={clsx('w-full px-3 py-2 rounded-lg text-sm outline-none border transition pr-10',
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                           : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500')}
                />
                <button onClick={() => setShowGeminiKey(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs px-1">
                  {showGeminiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                onClick={() => {
                  saveGeminiApiKey(geminiKey);
                  configureTTS({ geminiApiKey: geminiKey });
                  toast.success(geminiKey ? '✨ บันทึก Gemini key แล้ว' : 'ลบ key แล้ว');
                }}
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex-shrink-0">
                บันทึก
              </button>
            </div>

            {/* Voice selector — grid 2 cols */}
            <div className="mb-3">
              <Label isDark={isDark}>เสียง (Voice) — {GEMINI_VOICES.length} แบบ</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1 max-h-48 overflow-y-auto pr-1">
                {GEMINI_VOICES.map(v => (
                  <button key={v.name}
                    onClick={() => {
                      setGeminiVoice(v.name);
                      localStorage.setItem('ttplus_gemini_voice', v.name);
                      configureTTS({ geminiVoice: v.name });
                    }}
                    className={clsx(
                      'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition',
                      geminiVoice === v.name
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}>
                    <span className="text-xs font-semibold">{v.name}</span>
                    <span className={clsx('text-xs', geminiVoice === v.name ? 'text-white/70' : isDark ? 'text-gray-500' : 'text-gray-400')}>
                      {v.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Persona selector */}
            <div className="mb-3">
              <Label isDark={isDark}>Persona (สไตล์การพูด) — 10 แบบ</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {GEMINI_PERSONAS.map(p => (
                  <button key={p.id}
                    onClick={() => {
                      setGeminiPersona(p.instruction);
                      localStorage.setItem('ttplus_gemini_persona', p.instruction);
                      configureTTS({ geminiPersona: p.instruction });
                    }}
                    className={clsx(
                      'px-3 py-2 rounded-xl border text-left text-xs font-semibold transition',
                      geminiPersona === p.instruction
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shuffle toggle */}
            <div className={clsx('flex items-center justify-between p-3 rounded-xl border mb-3 transition',
              geminiShuffle
                ? isDark ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-purple-300'
                : isDark ? 'bg-gray-800 border-gray-700'        : 'bg-gray-50 border-gray-200')}>
              <div>
                <p className={clsx('text-xs font-semibold', geminiShuffle ? 'text-purple-400' : isDark ? 'text-gray-300' : 'text-gray-700')}>
                  🎲 สุ่ม 300 combo ทุกแชท
                </p>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-500' : 'text-gray-400')}>
                  {geminiShuffle
                    ? 'เปิดอยู่ — ทุกแชทสุ่ม voice+persona ใหม่'
                    : 'ปิดอยู่ — ใช้ voice+persona ที่เลือกไว้'}
                </p>
              </div>
              <Toggle
                value={geminiShuffle}
                onChange={v => {
                  setGeminiShuffle(v);
                  saveGeminiShuffle(v);
                  configureTTS({ geminiShuffle: v });
                  toast.success(v ? '🎲 เปิดสุ่มทุกแชทแล้ว!' : 'ปิดโหมดสุ่มแล้ว');
                }}
              />
            </div>

            {/* ทดสอบ Gemini 3.1 */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={testGeminiText}
                onChange={e => setTestGeminiText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const btn = e.currentTarget.nextSibling;
                    btn?.click();
                  }
                }}
                placeholder="พิมพ์ข้อความทดสอบ Gemini 3.1..."
                className={clsx('flex-1 px-3 py-2 rounded-lg text-xs outline-none border transition',
                  isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                         : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500')}
              />
              <button
                disabled={!geminiKey || testingGemini31 || !testGeminiText.trim()}
                onClick={async () => {
                  if (!geminiKey || !testGeminiText.trim()) return;
                  setTestingGemini31(true);
                  configureTTS({ geminiApiKey: geminiKey, geminiVoice, geminiPersona, geminiShuffle: false });
                  try {
                    await speakDirect('gemini31', testGeminiText.trim());
                  } catch (e) {
                    toast.error(`Gemini 3.1: ${e.message}`);
                  } finally {
                    setTestingGemini31(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 flex-shrink-0">
                {testingGemini31 ? '🔊' : '▶ ทดสอบ'}
              </button>
            </div>

            <p className={clsx('text-xs mt-3', isDark ? 'text-gray-600' : 'text-gray-400')}>
              ยังไม่มี key?{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                className="text-purple-400 hover:underline">
                aistudio.google.com/apikey
              </a>
              {' '}— ฟรี ไม่ต้องใส่บัตรเครดิต
            </p>
          </div>

          {/* ─── Gemini 2.5 TTS ─── */}
          <div className={clsx('rounded-2xl p-4 border', paidCard)}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                🌟 Gemini 2.5 TTS
                <span className="text-xs font-normal text-violet-400 ml-2">สำรอง · 300 combo · ยืนยันแล้ว</span>
              </h2>
              {geminiKey
                ? <span className="text-xs text-violet-400 font-semibold">✓ เปิดใช้งาน</span>
                : <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>ปิดอยู่</span>}
            </div>
            <p className={clsx('text-xs mb-3', isDark ? 'text-gray-500' : 'text-gray-400')}>
              ใช้ key เดียวกับ Gemini 3.1 ด้านบน — voice / persona / shuffle ก็ใช้ร่วมกัน — เปิดใช้เป็น fallback อัตโนมัติเมื่อ 3.1 ล้มเหลว
            </p>

            {/* แสดง key status */}
            <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 text-xs',
              geminiKey
                ? isDark ? 'bg-violet-900/20 border-violet-700 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'
                : isDark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400')}>
              {geminiKey
                ? <><span>🔑</span><span>ใช้ key จาก Gemini 3.1 (บันทึกแล้ว)</span></>
                : <><span>⚠️</span><span>ใส่ key ในการ์ด Gemini 3.1 ด้านบนก่อน</span></>}
            </div>

            {/* ทดสอบ Gemini 2.5 */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={testGeminiText}
                onChange={e => setTestGeminiText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const btn = e.currentTarget.nextSibling;
                    btn?.click();
                  }
                }}
                placeholder="พิมพ์ข้อความทดสอบ Gemini 2.5..."
                className={clsx('flex-1 px-3 py-2 rounded-lg text-xs outline-none border transition',
                  isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-violet-500'
                         : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500')}
              />
              <button
                disabled={!geminiKey || testingGemini25 || !testGeminiText.trim()}
                onClick={async () => {
                  if (!geminiKey || !testGeminiText.trim()) return;
                  setTestingGemini25(true);
                  configureTTS({ geminiApiKey: geminiKey, geminiVoice, geminiPersona, geminiShuffle: false });
                  try {
                    await speakDirect('gemini25', testGeminiText.trim());
                  } catch (e) {
                    toast.error(`Gemini 2.5: ${e.message}`);
                  } finally {
                    setTestingGemini25(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20 flex-shrink-0">
                {testingGemini25 ? '🔊' : '▶ ทดสอบ'}
              </button>
            </div>
          </div>

          {/* ─── Google Cloud TTS ─── */}
          <div className={clsx('rounded-2xl p-4 border', paidCard)}>
            <div className="flex items-center justify-between mb-1">
              <h2 className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                🔑 Google Cloud TTS
                <span className="text-xs font-normal text-green-400 ml-1">เสียงดีกว่ามาก</span>
              </h2>
              {googleKey && (
                <span className="text-xs text-green-400 font-semibold">✓ เปิดใช้งาน</span>
              )}
            </div>
            <p className={clsx('text-xs mb-3', isDark ? 'text-gray-500' : 'text-gray-400')}>
              ใส่ API key ของคุณเองเพื่อใช้เสียง Neural ภาษาไทย ฟรี 1M chars/เดือน — key เก็บในเครื่องคุณเท่านั้น ไม่ส่ง server
            </p>

            {/* API Key input */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={googleKey}
                  onChange={e => setGoogleKey(e.target.value)}
                  placeholder="AIza..."
                  className={clsx('w-full px-3 py-2 rounded-lg text-sm outline-none border transition pr-10',
                    isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-brand-500'
                           : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-brand-500')}
                />
                <button
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs px-1">
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                onClick={() => {
                  saveGoogleApiKey(googleKey);
                  configureTTS({ googleApiKey: googleKey, googleVoice });
                  toast.success(googleKey ? 'บันทึก API key แล้ว' : 'ลบ API key แล้ว — ใช้ Web Speech');
                }}
                className="px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition flex-shrink-0">
                บันทึก
              </button>
            </div>

            {/* Voice selector */}
            <div className="mb-3">
              <Label isDark={isDark}>เสียงที่ใช้</Label>
              <div className="space-y-1.5 mt-1">
                {GOOGLE_THAI_VOICES.map(v => (
                  <button
                    key={v.name}
                    onClick={() => {
                      setGoogleVoice(v.name);
                      localStorage.setItem('ttplus_google_tts_voice', v.name);
                      configureTTS({ googleVoice: v.name });
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition',
                      googleVoice === v.name
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    )}>
                    <span className="text-xs font-mono flex-shrink-0 w-16 opacity-60">{v.tier}</span>
                    <span className="text-xs flex-1">{v.label}</span>
                    {googleVoice === v.name && <span className="text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ทดสอบ Google TTS */}
            <div className="flex gap-2">
              <input
                type="text"
                value={testGoogleText}
                onChange={e => setTestGoogleText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.nextSibling?.click(); }}
                className={clsx('flex-1 px-3 py-2 rounded-lg text-xs outline-none border transition',
                  isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500'
                         : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-green-500')}
              />
              <button
                disabled={!googleKey || testingGoogle || !testGoogleText.trim()}
                onClick={async () => {
                  if (!googleKey || !testGoogleText.trim()) return;
                  setTestingGoogle(true);
                  configureTTS({ googleApiKey: googleKey, googleVoice });
                  try {
                    await speakDirect('google', testGoogleText.trim());
                  } catch (e) {
                    toast.error(`Google TTS: ${e.message}`);
                  } finally {
                    setTestingGoogle(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 flex-shrink-0">
                {testingGoogle ? '🔊' : '▶'}
              </button>
            </div>

            {/* ลิงก์ขอ key */}
            <p className={clsx('text-xs mt-3', isDark ? 'text-gray-600' : 'text-gray-400')}>
              ยังไม่มี API key?{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank" rel="noreferrer"
                className="text-brand-400 hover:underline">
                สร้างได้ที่ Google Cloud Console
              </a>
              {' '}→ เปิด Text-to-Speech API → สร้าง API key
            </p>
          </div>
          </>)}


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
