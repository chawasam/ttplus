// pages/widgets.js — OBS Widgets + per-widget style editor
import { useEffect, useState, useRef, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import { showError } from '../lib/errorHandler';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import WidgetStyleEditor from '../components/WidgetStyleEditor';
import { WIDGET_DEFAULTS, styleToParams } from '../lib/widgetStyles';

const BOSS_EMOJIS    = ['🐉','👾','💀','🦁','🤖','🐙','👹','🦂','🐺','🦊','🐲','🦅'];

const NP_STYLES = [
  { id: 'glass',     icon: '🔲', name: 'Glass',     desc: 'Frosted glass card' },
  { id: 'eq',        icon: '📊', name: 'EQ Bars',   desc: 'Animated equalizer BG' },
  { id: 'notes',     icon: '🎵', name: 'Notes',     desc: 'Falling music notes' },
  { id: 'vinyl',     icon: '💿', name: 'Vinyl',     desc: 'Spinning vinyl record' },
  { id: 'aurora',    icon: '🌌', name: 'Aurora',    desc: 'Northern lights BG' },
  { id: 'neon',      icon: '💡', name: 'Neon',      desc: 'Neon club glow' },
  { id: 'cassette',  icon: '📼', name: 'Cassette',  desc: 'Retro cassette tape' },
  { id: 'pulse',     icon: '🔴', name: 'Pulse',     desc: 'Sonar pulse rings' },
  { id: 'particles', icon: '✨', name: 'Particles', desc: 'Floating sparkles' },
  { id: 'spectrum',  icon: '🌈', name: 'Spectrum',  desc: 'Spectrum + progress' },
  { id: 'simple',    icon: '🎧', name: 'Simple',    desc: 'Clean card + progress bar' },
];

// Boss presets — เพิ่ม boss ใหม่ที่นี่ (images host ใน /public/boss/)
// frames: relative path 6 ไฟล์ คั่นด้วย comma (idle1,idle2,idle3,enrage1,enrage2,death)
const BOSS_PRESETS = [
  {
    id:         'golem',
    name:       'Stone Golem',
    desc:       'ลุงหินพิกเซลอาร์ต • 6 frame animation',
    emoji:      '🗿',
    preview:    '/boss/golem1.png',
    frames:     '/boss/golem1.png,/boss/golem2.png,/boss/golem3.png,/boss/golem4.png,/boss/golem5.png,/boss/golem6.png',
  },
  // เพิ่ม preset ใหม่ได้ที่นี่ เช่น:
  // { id: 'dragon', name: 'Fire Dragon', emoji: '🐉', preview: '/boss/dragon1.png', frames: '/boss/dragon1.png,...' },
];
const BOSS_ELEMENTS  = [
  { val: 'neutral', label: '⚪ กลาง (ไม่มีธาตุ)', desc: 'ดาเมจปกติทุกของขวัญ' },
  { val: 'fire',    label: '🔥 ไฟ',               desc: 'แพ้น้ำ | ทน: ดิน' },
  { val: 'water',   label: '💧 น้ำ',              desc: 'แพ้ลม | ทน: ไฟ' },
  { val: 'earth',   label: '🌍 ดิน',              desc: 'แพ้ไฟ | ทน: ลม' },
  { val: 'wind',    label: '🌪️ ลม',               desc: 'แพ้ดิน | ทน: น้ำ' },
];
const CREATURE_EMOJIS = ['🐉','🦋','🦄','🐣','🔥','🌟','👑','🐺'];

const WIDGETS = [
  { id: 'coinjar',     icon: '🫙', name: 'Gift Jar',        desc: 'ขวดโหลของขวัญ',                        size: '1200 × 600' },
  {
    id: 'bossbattle', icon: '👾', name: 'Boss Battle',
    desc: 'มอนสเตอร์บน OBS — gift ทำดาเมจ ระบบธาตุ 5 ธาตุ ส่งผิดธาตุ = heal boss',
    size: '380 × 675', noStyle: true,
    configFields: [
      { key: '_g1',        label: '🐉 Boss Setup',                    type: 'group' },
      { key: 'hp',         label: 'Boss HP (รอบแรก)',                 type: 'number',  default: 1000,         min: 10,  max: 100000, step: 100 },
      { key: 'bossname',   label: 'ชื่อ Boss',                        type: 'text',    default: 'Dark Dragon', maxLen: 30 },
      { key: 'bosstype',   label: '🎨 Boss Sprite',                   type: 'bosstype', default: 'emoji' },
      // bossimg + bossframes: hidden from UI — ถูก set อัตโนมัติโดย bosstype selector
      { key: 'bossimg',    type: 'url',  default: '', hideInUI: true },
      { key: 'bossframes', type: 'text', default: '', hideInUI: true, maxLen: 2000 },
      { key: 'element',    label: 'ธาตุ Boss',                        type: 'element', default: 'neutral' },
      { key: 'hideelement', label: 'ซ่อนธาตุ Boss',                  type: 'toggle',  default: 0, onLabel: 'ซ่อน — เปิดเผยที่ HP ≤75%', offLabel: 'แสดงธาตุตั้งแต่ต้น' },
      { key: '_g2',       label: '⚔️ Gameplay',                      type: 'group' },
      { key: 'dmgmult',   label: 'ตัวคูณดาเมจ (1 coin = X dmg)',     type: 'number',  default: 1,            min: 0.1, max: 20,     step: 0.1 },
      { key: '_tap',      label: 'Like → Damage',                    type: 'row',
        fields: [
          { key: 'taprate', label: 'ทุกกี่ like (0=ปิด)', type: 'number', default: 0,  min: 0, max: 1000,  step: 1 },
          { key: 'tapdmg',  label: 'dmg ต่อครั้ง',        type: 'number', default: 1,  min: 1, max: 10000, step: 1 },
        ]
      },
      { key: 'wrongheal', label: 'ผิดธาตุ = Heal Boss',              type: 'toggle',  default: 1, onLabel: 'เปิด — ผิดธาตุ heal boss', offLabel: 'ปิด — ผิดธาตุ = 0 dmg' },
      { key: 'respawn',   label: 'Respawn Mode',                     type: 'toggle',  default: 0, onLabel: 'เปิด — HP ×1.5 ต่อรอบ', offLabel: 'ปิด — จบแล้วจบเลย' },
      { key: '_g3',       label: '🖼️ Display',                       type: 'group' },
      { key: 'side',      label: 'ตำแหน่ง',   type: 'select',  default: 'center', options: [{ value:'center', label:'■ กลาง' }, { value:'left', label:'◀ ซ้าย' }, { value:'right', label:'ขวา ▶' }] },
      { key: 'ww',        label: 'ความกว้าง Widget (px) — ตรงกับ OBS Source Width', type: 'number', default: 380, min: 280, max: 800, step: 10 },
      { key: 'carda',     label: 'ความทึบแผง (0=โปร่งใส → 100=ทึบ)', type: 'number', default: 58,  min: 0,   max: 100, step: 5  },
      { key: '_g4',       label: '🔊 เสียง',                           type: 'group' },
      { key: 'vol',       label: '🔊 ระดับเสียง',                      type: 'volume', default: 80 },
    ],
  },
  { id: 'chat',        icon: '💬', name: 'Chat Overlay',    desc: 'แสดงแผงคอมเม้น',                                  size: '400 × 600' },
  { id: 'pinchat',     icon: '📌', name: 'Pin Chat',        desc: 'แสดงข้อความที่ Pin จาก Chat Overlay',             size: '500 × 100' },
  { id: 'pinprofile',  icon: '👤', name: 'Pin Profile Card', desc: 'แสดงโปรไฟล์ TikTok ของข้อความที่ Pin',           size: '400×150 / 240×320' },
  { id: 'ttsmonitor',  icon: '🔊', name: 'TTS Monitor',     desc: 'แสดง engine/เสียง/persona ที่กำลังพูด — เห็นแค่ผู้ใช้ · ฟังก์ชันเฉพาะทาง', size: '400 × 200', noStyle: true },
  { id: 'likes-leaderboard', icon: '👍', name: 'Likes Leaderboard', desc: 'Top 10 ผู้ที่ Like มากที่สุด ตอนไลฟ์', size: '300 × 520' },
  { id: 'gift-leaderboard',  icon: '🎁', name: 'Gift Leaderboard',  desc: 'Top 10 ผู้ส่งของขวัญมากที่สุด ตอนไลฟ์', size: '300 × 520' },
  { id: 'fireworks',         icon: '🎆', name: 'Gift Fireworks',    desc: 'พลุของขวัญ — Rocket = avatar ผู้ส่ง, ระเบิด = รูปของขวัญ', size: '800 × 800' },
  { id: 'myactions',         icon: '🎬', name: 'Actions Overlay',   desc: 'แสดง GIF/วิดีโอ/Alert จากระบบ ลูกเล่น TT บน OBS', size: '1920 × 1080', noStyle: true },
  {
    id: 'nowplaying', icon: '🎶', name: 'Now Playing',
    desc: 'แสดงเพลงที่กำลังฟังจาก Spotify — 10 สไตล์ให้เลือก เชื่อมต่อ Spotify ได้ที่ Settings',
    size: 'ขึ้นอยู่กับ Style', noStyle: true, noToken: true,
    configFields: [
      { key: 'style', label: '🎨 เลือก Style', type: 'nowplaying_style', default: 'glass' },
      { key: 'fade',  label: '🌫️ Fade รอบขอบ Widget', type: 'toggle', default: 1,
        onLabel: 'เปิด — ขอบ Widget จะ Fade โปร่งใส (แนะนำสำหรับ OBS)', offLabel: 'ปิด — ขอบทึบ' },
    ],
  },
  // ── ซ่อนชั่วคราว — ยังไม่พร้อมใช้งาน ──
  // { id: 'dungeon', icon: '🏚️', name: 'Dungeon Activity', desc: 'แสดงผู้เล่นที่กำลัง run dungeon อยู่ + feed เหตุการณ์ live', size: '360 × 480', noStyle: true },
  // { id: 'leaderboard', ... }
  // { id: 'egghatch', ... }
];

// ── Widget groups — ลำดับและสมาชิกในแต่ละหมวด ──────────────────────────────
const WIDGET_GROUPS = [
  { id: 'chat',  label: '💬 Chat',                    ids: ['chat', 'pinchat', 'pinprofile'] },
  { id: 'gifts', label: '🎁 ของขวัญ & Leaderboard',  ids: ['coinjar', 'fireworks', 'likes-leaderboard', 'gift-leaderboard'] },
  { id: 'obs',   label: '🎛️ OBS / Stream',            ids: ['bossbattle', 'myactions', 'ttsmonitor'] },
  { id: 'music', label: '🎵 Music',                   ids: ['nowplaying'] },
];

// user, authLoading มาจาก _app.js
export default function WidgetsPage({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
  const [widgetCid, setWidgetCid]     = useState(''); // channel ID สั้น เช่น "10001"
  const [tokenLoading, setTokenLoading] = useState(false);
  const [baseUrl, setBaseUrl]         = useState('');
  const [styles, setStyles]           = useState(() =>
    Object.fromEntries(
      Object.entries(WIDGET_DEFAULTS).map(([k, v]) => [k, { ...v }])
    )
  );
  // drawer: widgetId ที่กำลัง customize | null = ปิด
  const [drawerWidget, setDrawerWidget] = useState(null);
  // howto: collapsed/expanded — จำไว้ใน localStorage
  const [howtoOpen, setHowtoOpen] = useState(() => {
    try { return localStorage.getItem('ttplus_howto') !== '0'; } catch { return true; }
  });
  // group collapse state — default เปิดทั้งหมด
  const [groupOpen, setGroupOpen] = useState({ chat: true, gifts: true, obs: true, music: true });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  // config สำหรับ widget ที่มี configFields (bossbattle, egghatch ฯลฯ)
  const [customConfigs, setCustomConfigs] = useState(() =>
    Object.fromEntries(
      WIDGETS.filter(w => w.configFields).map(w => [
        w.id,
        Object.fromEntries(w.configFields.map(f => [f.key, f.default])),
      ])
    )
  );

  const socketRef = useRef(null);

  // ===== React to user prop =====
  useEffect(() => {
    setBaseUrl(window.location.origin);
    if (authLoading) return;

    let mounted = true;

    if (user) {
      // Connect socket for real-time style push
      user.getIdToken().then(token => {
        if (!mounted) return;
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
          if (!mounted) return;
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
        if (mounted) await fetchWidgetToken(user);
      })();
    } else {
      // Not logged in — no socket needed on widgets page
      setWidgetCid('');
    }

    return () => {
      mounted = false;
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
      const res = await api.post('/api/widget-token');
      const cid = res.data?.cid;
      if (typeof cid === 'string' && /^\d{4,8}$/.test(cid)) {
        setWidgetCid(cid);
      } else {
        toast.error('Widget ID ไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch (err) {
      showError(err, 'ไม่สามารถสร้าง Widget ID ได้');
    } finally {
      setTokenLoading(false);
    }
  }, [user]);

  const buildCustomParams = useCallback((w, overrides = {}) => {
    const cfg = customConfigs[w.id] || {};
    const params = [];
    for (const f of w.configFields) {
      if (f.type === 'group' || f.type === 'bosstype') continue; // UI-only, ไม่ใส่ใน URL
      if (f.type === 'row') {
        for (const sf of f.fields) {
          const val = overrides[sf.key] ?? cfg[sf.key] ?? sf.default;
          params.push(`${sf.key}=${encodeURIComponent(val)}`);
        }
        continue;
      }
      const val = overrides[f.key] ?? cfg[f.key] ?? f.default;
      // ข้าม url/text fields ที่ว่าง
      if ((f.type === 'url' || f.type === 'text') && !val) continue;
      params.push(`${f.key}=${encodeURIComponent(val)}`);
    }
    return params.join('&');
  }, [customConfigs]);

  const getWidgetUrl = useCallback((widgetId) => {
    // nowplaying ใช้ ?uid= แทน ?cid=
    if (widgetId === 'nowplaying') {
      if (!baseUrl || !user?.uid) return '';
      const cfg   = customConfigs['nowplaying'] || {};
      const style = cfg.style || 'glass';
      const fade  = cfg.fade ?? 1;
      return `${baseUrl}/widget/nowplaying?uid=${user.uid}&style=${style}&fade=${fade}`;
    }
    if (!baseUrl || !widgetCid) return '';
    const w = WIDGETS.find(ww => ww.id === widgetId);
    // ทุก widget ใช้ ?cid= เหมือนกันหมด (leaderboard, myactions, fireworks, ฯลฯ)
    const base = `${baseUrl}/widget/${widgetId}?cid=${widgetCid}`;
    if (w?.configFields) return `${base}&${buildCustomParams(w)}`;
    const style = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    if (!style) return base;
    const styleQ = styleToParams(style, widgetId);
    return styleQ ? `${base}&${styleQ}` : base;
  }, [widgetCid, baseUrl, styles, buildCustomParams, user, customConfigs]);

  const copyUrl = useCallback((widgetId) => {
    if (!user) { setShowLoginModal(true); return; }
    const url = getWidgetUrl(widgetId);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('✅ Copy URL แล้ว! วางใน TikTok Studio ได้เลย');
    });
  }, [user, getWidgetUrl]);

  // Copy Boss Battle URL with specific side override
  const copyBossBattleSide = useCallback((side) => {
    if (!user) { setShowLoginModal(true); return; }
    if (!widgetCid || !baseUrl) return;
    const w      = WIDGETS.find(ww => ww.id === 'bossbattle');
    const params = buildCustomParams(w, { side });
    const url    = `${baseUrl}/widget/bossbattle?cid=${widgetCid}&${params}`;
    navigator.clipboard.writeText(url).then(() => {
      const label = side === 'left' ? 'ซ้าย ◀' : side === 'right' ? 'ขวา ▶' : 'กลาง ■';
      toast.success(`✅ Copy URL ${label} แล้ว!`);
    });
  }, [user, widgetCid, baseUrl, buildCustomParams]);

  const getPreviewUrl = useCallback((widgetId) => {
    if (!baseUrl) return '#';
    // nowplaying preview ใช้ style + fade params
    if (widgetId === 'nowplaying') {
      const cfg   = customConfigs['nowplaying'] || {};
      const style = cfg.style || 'glass';
      const fade  = cfg.fade ?? 1;
      return `${baseUrl}/widget/nowplaying?preview=1&style=${style}&fade=${fade}`;
    }
    const w = WIDGETS.find(ww => ww.id === widgetId);
    // preview ใช้ ?preview=1 เสมอ — ไม่ต้องการ cid/vjId
    const base = `${baseUrl}/widget/${widgetId}?preview=1`;

    if (w?.configFields) return `${base}&${buildCustomParams(w)}`;
    const style = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    if (!style) return base;
    const styleQ = styleToParams(style, widgetId);
    return styleQ ? `${base}&${styleQ}` : base;
  }, [baseUrl, styles, buildCustomParams, customConfigs]);

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
      showError(err, 'บันทึก Widget ไม่สำเร็จ');
    }
  }, [user, styles]);

  const toggleHowto = () => setHowtoOpen(prev => {
    const next = !prev;
    try { localStorage.setItem('ttplus_howto', next ? '1' : '0'); } catch {}
    return next;
  });
  const toggleGroup = (id) => setGroupOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const tokenReady = !!widgetCid && !tokenLoading;

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
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />

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
            ✅ Widget URL พร้อมให้ copy แล้ว 🔗
          </div>
        ) : (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
            ⏳ {tokenLoading ? 'กำลังโหลด Widget URL... (Railway cold start อาจใช้เวลา 30-60 วินาที)' : 'กำลังเตรียม Widget URL...'}
          </div>
        )}

        {/* วิธีใช้ — collapsible */}
        <div className={clsx('rounded-xl mb-5 border overflow-hidden',
          isDark ? 'bg-blue-500/10 border-blue-500/25' : 'bg-blue-50 border-blue-200')}>
          <button
            onClick={toggleHowto}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-blue-400 font-semibold text-sm">📌 วิธีใช้กับ TikTok Studio / OBS</span>
            <span className={clsx('text-blue-400 text-sm transition-transform', howtoOpen ? 'rotate-180' : '')}>▾</span>
          </button>
          {howtoOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-blue-500/20 pt-3">
              {[
                { n: '1', t: 'Login ด้วย Google',    d: 'กดปุ่ม Login มุมขวาบน — URL ของคุณจะถูกสร้างอัตโนมัติและไม่เปลี่ยนแปลง' },
                { n: '2', t: 'Copy URL ของ Widget',   d: 'กด 📋 Copy URL → วางใน OBS หรือ TikTok Studio ครั้งเดียวพอ' },
                { n: '3', t: 'Customize ได้ตลอด',    d: 'กด ⚙️ Customize → ปรับสี → กด บันทึก → Widget update ทันที ไม่ต้อง copy URL ใหม่!' },
                { n: '4', t: 'TikTok Studio',          d: 'Copy Link ในเว็บ → Add Sources → Link → วาง URL (Ctrl+V)' },
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
          )}
        </div>

        {/* Widget Groups */}
        <div className="space-y-6">
          {WIDGET_GROUPS.map(group => {
            const groupWidgets = WIDGET_GROUPS
              ? group.ids.map(id => WIDGETS.find(w => w.id === id)).filter(Boolean)
              : [];
            const isGroupOpen = groupOpen[group.id] !== false;
            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 mb-3 text-left group"
                >
                  <span className={clsx('text-sm font-bold', isDark ? 'text-gray-200' : 'text-gray-700')}>{group.label}</span>
                  <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
                  <span className={clsx(
                    'text-xs transition-transform',
                    isDark ? 'text-gray-500' : 'text-gray-400',
                    isGroupOpen ? 'rotate-180' : ''
                  )}>▾</span>
                </button>

                {/* Widget cards in group */}
                {isGroupOpen && (
                  <div className="space-y-3">
                    {groupWidgets.map((w) => {
                      const url          = getWidgetUrl(w.id);
                      const isDrawerOpen = drawerWidget === w.id;
                      // nowplaying ไม่ต้องรอ widgetCid — ใช้ uid แทน
                      const widgetReady  = w.noToken ? !!user?.uid : tokenReady;
                      return (
                        <div key={w.id} className={clsx('rounded-xl border overflow-hidden', card)}>
                          <div className="p-4">
                            {/* Top: icon + name + size */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{w.icon}</span>
                                <div>
                                  <h3 className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{w.name}</h3>
                                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>{w.desc}</p>
                                </div>
                              </div>
                              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ml-2', isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}>
                                {w.size}
                              </span>
                            </div>

                            {/* URL row */}
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className={clsx('flex-1 rounded-lg px-3 py-2 font-mono text-xs truncate cursor-pointer', urlBox)}
                                title={widgetReady ? url : ''}
                                onClick={() => widgetReady && copyUrl(w.id)}
                              >
                                {widgetReady ? url : (w.noToken ? '🔒 Login ก่อนเพื่อรับ URL' : tokenLoading ? '⏳ กำลังโหลด...' : '— รอสักครู่ —')}
                              </div>
                              <button
                                onClick={() => copyUrl(w.id)}
                                disabled={!widgetReady}
                                className="shrink-0 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50"
                              >
                                📋 Copy
                              </button>
                            </div>

                            {/* Boss Battle quick-side copy */}
                            {w.id === 'bossbattle' && (
                              <div className="flex gap-1.5 mb-3">
                                {[
                                  { side: 'left',   label: '◀ ซ้าย' },
                                  { side: 'center', label: '■ กลาง' },
                                  { side: 'right',  label: 'ขวา ▶' },
                                ].map(({ side, label }) => (
                                  <button
                                    key={side}
                                    onClick={() => copyBossBattleSide(side)}
                                    disabled={!tokenReady}
                                    className={clsx(
                                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition border disabled:opacity-40',
                                      isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-brand-500/50 hover:text-brand-300'
                                             : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700'
                                    )}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <a
                                href={getPreviewUrl(w.id)}
                                target="_blank"
                                rel="noreferrer"
                                className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold text-center transition border', btn2nd)}
                              >
                                ▶ ดูตัวอย่าง
                              </a>
                              {(!w.noStyle || w.configFields) && (
                                <button
                                  onClick={() => setDrawerWidget(isDrawerOpen ? null : w.id)}
                                  className={clsx(
                                    'flex-1 py-2 rounded-lg text-sm font-semibold transition border',
                                    isDrawerOpen
                                      ? 'bg-brand-500/15 border-brand-500/50 text-brand-400'
                                      : btn2nd
                                  )}
                                >
                                  ⚙️ Customize
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>

      {/* ── Customize Drawer ── */}
      {drawerWidget && (() => {
        const dw  = WIDGETS.find(x => x.id === drawerWidget);
        if (!dw) return null;
        const style  = styles[dw.id] || WIDGET_DEFAULTS[dw.id];
        const cfg    = customConfigs[dw.id] || {};
        const setKey = (k, v) => setCustomConfigs(prev => ({ ...prev, [dw.id]: { ...prev[dw.id], [k]: v } }));
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerWidget(null)}
            />
            {/* Panel */}
            <div className={clsx(
              'fixed right-0 top-0 bottom-0 z-50 w-full md:w-[440px] flex flex-col shadow-2xl border-l',
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            )}>
              {/* Header */}
              <div className={clsx('flex items-center gap-3 px-5 py-4 border-b shrink-0', isDark ? 'border-gray-800' : 'border-gray-100')}>
                <span className="text-2xl">{dw.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{dw.name}</h3>
                  <p className={clsx('text-[10px] font-mono', isDark ? 'text-gray-500' : 'text-gray-400')}>{dw.size} px</p>
                </div>
                <button
                  onClick={() => setDrawerWidget(null)}
                  className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-lg transition', isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900')}
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Standard style editor */}
                {!dw.noStyle && (
                  <>
                    <WidgetStyleEditor
                      widgetId={dw.id}
                      style={style}
                      onChange={newStyle => setStyles(prev => ({ ...prev, [dw.id]: newStyle }))}
                      theme={theme}
                    />
                  </>
                )}

                {/* Custom config (bossbattle ฯลฯ) */}
                {dw.configFields && (
                  <div className="space-y-4">
                    {dw.configFields.map(f => {
                      if (f.type === 'group') return (
                        <div key={f.key} className="flex items-center gap-2 pt-1">
                          <span className={clsx('text-xs font-bold tracking-wide', isDark ? 'text-gray-300' : 'text-gray-600')}>{f.label}</span>
                          <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-700' : 'bg-gray-200')} />
                        </div>
                      );
                      if (f.hideInUI) return null;
                      if (f.type === 'nowplaying_style') {
                        const cur = cfg[f.key] ?? f.default;
                        return (
                          <div key={f.key}>
                            <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {NP_STYLES.map(s => (
                                <button key={s.id} onClick={() => setKey('style', s.id)}
                                  className={clsx(
                                    'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition',
                                    cur === s.id
                                      ? 'border-brand-500 bg-brand-500/15'
                                      : isDark ? 'border-gray-700 bg-gray-800/50 hover:border-gray-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                  )}>
                                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                                  <div className="min-w-0">
                                    <p className={clsx('text-xs font-semibold leading-tight', isDark ? 'text-gray-200' : 'text-gray-800')}>{s.name}</p>
                                    <p className={clsx('text-[10px] leading-tight', isDark ? 'text-gray-500' : 'text-gray-400')}>{s.desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                            {/* Spotify connect hint */}
                            {!user && (
                              <p className={clsx('text-[10px] mt-2', isDark ? 'text-yellow-400/80' : 'text-yellow-600')}>
                                ⚠️ ต้อง Login และเชื่อมต่อ Spotify ใน Settings ก่อนใช้งาน
                              </p>
                            )}
                          </div>
                        );
                      }
                      if (f.type === 'bosstype') {
                        const curType  = cfg['bosstype'] ?? f.default;
                        const curEmoji = cfg['emoji'] ?? '🐉';
                        return (
                          <div key={f.key}>
                            <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => { setKey('bosstype','emoji'); setKey('bossframes',''); setKey('bossimg',''); }}
                                className={clsx('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition', curType==='emoji' ? 'border-brand-500 bg-brand-500/15' : isDark ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')}>
                                <span style={{ fontSize:32, lineHeight:1 }}>{curEmoji}</span>
                                <span className={clsx('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-600')}>Emoji</span>
                              </button>
                              {BOSS_PRESETS.map(preset => (
                                <button key={preset.id}
                                  onClick={() => { const abs=preset.frames.split(',').map(p=>`${baseUrl}${p}`).join(','); setKey('bosstype',preset.id); setKey('bossframes',abs); setKey('bossimg',''); }}
                                  className={clsx('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition', curType===preset.id ? 'border-brand-500 bg-brand-500/15' : isDark ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')}>
                                  <img src={preset.preview} alt={preset.name} style={{ width:42, height:42, objectFit:'contain', imageRendering:'pixelated' }} />
                                  <span className={clsx('text-xs font-medium text-center', isDark ? 'text-gray-300' : 'text-gray-600')}>{preset.name}</span>
                                </button>
                              ))}
                            </div>
                            {curType!=='emoji' && BOSS_PRESETS.find(p=>p.id===curType) && (
                              <p className={clsx('text-xs mt-2', isDark ? 'text-gray-500' : 'text-gray-400')}>{BOSS_PRESETS.find(p=>p.id===curType).desc}</p>
                            )}
                          </div>
                        );
                      }
                      if (f.type === 'row') return (
                        <div key={f.key}>
                          <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                          <div className="grid grid-cols-2 gap-3">
                            {f.fields.map(sf => {
                              const sv = cfg[sf.key] ?? sf.default;
                              return (
                                <div key={sf.key}>
                                  <p className={clsx('text-xs mb-1', isDark ? 'text-gray-500' : 'text-gray-400')}>{sf.label}</p>
                                  <input type="number" min={sf.min} max={sf.max} step={sf.step||1} value={sv}
                                    onChange={e => setKey(sf.key, Math.max(sf.min, Math.min(sf.max, Number(e.target.value))))}
                                    className={clsx('w-full px-2 py-1.5 rounded-lg text-sm text-center font-mono border', isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-200 text-gray-900')}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                      const val = cfg[f.key] ?? f.default;
                      return (
                        <div key={f.key}>
                          <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                          {f.type==='volume' && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <input type="range" min={0} max={100} step={5} value={val} onChange={e => setKey(f.key, Number(e.target.value))} className="flex-1 accent-orange-500" />
                                <span className={clsx('w-16 text-right text-xs font-bold font-mono flex-shrink-0', val===0 ? (isDark?'text-gray-500':'text-gray-400') : 'text-orange-400')}>{val===0?'🔇 เงียบ':`🔊 ${val}%`}</span>
                              </div>
                              <div className={clsx('flex justify-between text-xs', isDark?'text-gray-600':'text-gray-400')}><span>🔇 เงียบ (0)</span><span>🔊 ดังสุด (100)</span></div>
                            </div>
                          )}
                          {f.type==='number' && (
                            <div className="flex items-center gap-3">
                              <input type="range" min={f.min} max={f.max} step={f.step||1} value={val} onChange={e => setKey(f.key, Number(e.target.value))} className="flex-1 accent-brand-500" />
                              <input type="number" min={f.min} max={f.max} step={f.step||1} value={val} onChange={e => setKey(f.key, Math.max(f.min, Math.min(f.max, Number(e.target.value))))}
                                className={clsx('w-24 px-2 py-1 rounded-lg text-sm text-center font-mono border', isDark?'bg-gray-800 border-gray-700 text-white':'bg-gray-100 border-gray-200 text-gray-900')} />
                            </div>
                          )}
                          {f.type==='text' && (
                            <input type="text" value={val} maxLength={f.maxLen||40} onChange={e => setKey(f.key, e.target.value)}
                              className={clsx('w-full px-3 py-2 rounded-lg text-sm border', isDark?'bg-gray-800 border-gray-700 text-white':'bg-gray-100 border-gray-200 text-gray-900')} />
                          )}
                          {f.type==='toggle' && (
                            <button onClick={() => setKey(f.key, val ? 0 : 1)}
                              className={clsx('w-full py-2 rounded-lg text-sm font-semibold border transition', val ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : isDark?'bg-gray-800 border-gray-700 text-gray-400':'bg-gray-100 border-gray-200 text-gray-500')}>
                              {val ? `✅ ${f.onLabel}` : `⬜ ${f.offLabel}`}
                            </button>
                          )}
                          {f.type==='select' && (
                            <div className="flex gap-2 flex-wrap">
                              {f.options.map(opt => (
                                <button key={opt.value} onClick={() => setKey(f.key, opt.value)}
                                  className={clsx('flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition', val===opt.value ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : isDark?'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500':'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200')}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {f.type==='element' && (
                            <div className="space-y-1.5">
                              {BOSS_ELEMENTS.map(el => (
                                <button key={el.val} onClick={() => setKey(f.key, el.val)}
                                  className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border transition text-left', val===el.val ? 'bg-brand-500/15 border-brand-500/50 text-brand-300' : isDark?'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500':'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300')}>
                                  <span className="font-bold">{el.label}</span>
                                  <span className={clsx('text-xs ml-auto', isDark?'text-gray-500':'text-gray-400')}>{el.desc}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className={clsx('rounded-lg p-3 text-xs border', isDark?'bg-blue-500/10 border-blue-500/25 text-blue-300':'bg-blue-50 border-blue-200 text-blue-700')}>
                      💡 หลัง Copy URL แล้วกด ▶ ดูตัวอย่าง — กด <strong>R</strong> ในหน้า preview เพื่อ reset
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={clsx('px-5 py-4 border-t shrink-0 space-y-2', isDark ? 'border-gray-800' : 'border-gray-100')}>
                {/* Standard widget: save button */}
                {!dw.noStyle && (
                  <button onClick={() => saveStyleForWidget(dw.id, style)}
                    className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
                    💾 บันทึกและ Update Widget แบบ Real-time
                  </button>
                )}
                {/* Custom config: reset + copy URL */}
                {dw.configFields && (() => {
                  const dwReady = dw.noToken ? !!user?.uid : tokenReady;
                  return (
                    <div className="flex gap-2">
                      {!dw.noToken && (
                        <button
                          onClick={() => { const s=socketRef.current||getSocket(); if(s?.connected){s.emit('push_style_update',{widgetId:dw.id,style:{_reset:true}});toast.success(`🔄 Reset ${dw.name} แล้ว`);}else{toast.error('ต้อง Login และ Connect Socket ก่อน');} }}
                          className={clsx('flex-1 py-2.5 rounded-xl text-sm font-semibold border transition', isDark?'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20':'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')}>
                          🔄 Reset
                        </button>
                      )}
                      <button onClick={() => copyUrl(dw.id)} disabled={!dwReady}
                        className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition disabled:opacity-50">
                        📋 Copy URL
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        );
      })()}

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
