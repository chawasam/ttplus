import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loadSettings as loadSbSettings } from '../lib/soundboardStore';
import { startKeepAlive } from '../lib/keepAlive';
import '../styles/globals.css';

// โหลดทุกหน้าพร้อมกัน — ไม่ unmount เมื่อสลับแถบ
import Dashboard      from './dashboard';
import TtsPage        from './tts';
import ActionsPage    from './actions';
import WidgetsPage    from './widgets';
import PKPage         from './pk';
import SoundboardPage from './soundboard';
import SettingsPage   from './settings';
import DonatePage     from './donate';
import FaqPage        from './faq';

// ── Minimal status bar — แสดงสถานะ TikTok / Soundboard / TTS ──
function StatusBar({ theme, setTheme }) {
  const [conn,       setConn]       = useState({ connected: false, username: '' });
  const [sbOn,       setSbOn]       = useState(false);
  const [ttsOn,      setTtsOn]      = useState(false);
  const [actionsOn,  setActionsOn]  = useState(() => {
    try { return localStorage.getItem('ttplus_actions_system') !== '0'; } catch { return true; }
  });

  useEffect(() => {
    // อ่านค่าเริ่มต้น soundboard จาก localStorage
    setSbOn(loadSbSettings().enabled || false);

    const onConn    = (e) => setConn({ connected: e.detail.connected, username: e.detail.username || '' });
    const onTts     = (e) => setTtsOn(!!e.detail.enabled);
    const onSb      = (e) => setSbOn(!!e.detail.enabled);
    const onActions = (e) => setActionsOn(!!e.detail.enabled);

    window.addEventListener('ttplus-conn',    onConn);
    window.addEventListener('ttplus-tts',     onTts);
    window.addEventListener('ttplus-sb',      onSb);
    window.addEventListener('ttplus-actions', onActions);
    return () => {
      window.removeEventListener('ttplus-conn',    onConn);
      window.removeEventListener('ttplus-tts',     onTts);
      window.removeEventListener('ttplus-sb',      onSb);
      window.removeEventListener('ttplus-actions', onActions);
    };
  }, []);

  const dark      = theme === 'dark';
  const bar       = dark ? 'rgba(9,9,11,0.92)' : 'rgba(252,225,240,0.96)';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(236,72,153,0.18)';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : 'rgba(157,23,77,0.55)';
  const textOn    = dark ? 'rgba(255,255,255,0.82)' : 'rgba(131,24,67,0.90)';
  const divider   = dark ? 'rgba(255,255,255,0.10)' : 'rgba(236,72,153,0.18)';

  const ON_COLOR = '#60a5fa';   // blue-400 — สีเดียวทุก indicator
  const dot = (on) => ({
    display:      'inline-block',
    width:        6, height: 6,
    borderRadius: '50%',
    background:   on ? ON_COLOR : (dark ? '#3f3f46' : '#f0abcb'),
    marginRight:  5,
    flexShrink:   0,
    boxShadow:    on ? `0 0 5px ${ON_COLOR}88` : 'none',
  });

  const item = {
    display:    'flex',
    alignItems: 'center',
    fontSize:   11,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    gap:        0,
    color:      textMuted,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      position:        'fixed',
      top:             0, left: 0, right: 0,
      height:          26,
      zIndex:          9999,
      display:         'flex',
      alignItems:      'center',
      gap:             12,
      paddingLeft:     14,
      paddingRight:    14,
      background:      bar,
      borderBottom:    `1px solid ${border}`,
      backdropFilter:  'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }}>
      {/* TikTok connection */}
      <span style={item}>
        <span style={dot(conn.connected)} />
        {conn.connected
          ? <span style={{ color: textOn }}>@{conn.username}</span>
          : <span>ไม่ได้เชื่อมต่อ</span>
        }
      </span>

      <span style={{ width: 1, height: 12, background: divider, flexShrink: 0 }} />

      {/* Soundboard */}
      <span style={item}>
        <span style={dot(sbOn)} />
        <span style={sbOn ? { color: textOn } : {}}>Soundboard</span>
      </span>

      <span style={{ width: 1, height: 12, background: divider, flexShrink: 0 }} />

      {/* TTS */}
      <span style={item}>
        <span style={dot(ttsOn)} />
        <span style={ttsOn ? { color: textOn } : {}}>TTS</span>
      </span>

      <span style={{ width: 1, height: 12, background: divider, flexShrink: 0 }} />

      {/* Actions */}
      <span style={item}>
        <span style={dot(actionsOn)} />
        <span style={actionsOn ? { color: textOn } : {}}>Action</span>
      </span>

      {/* Theme toggle — ขวาสุด */}
      {setTheme && (
        <button
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          title={dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          style={{
            marginLeft:  'auto',
            flexShrink:  0,
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            fontSize:    13,
            lineHeight:  1,
            padding:     '2px 4px',
            borderRadius: 4,
            color:       textMuted,
            transition:  'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {dark ? '🌸' : '🌙'}
        </button>
      )}
    </div>
  );
}

// ── Hook: ติดตาม audio activity ต่อ tab สำหรับ speaker indicator ใน Sidebar ──
// ฟัง 2 events:
//   ttplus-tts-active  → lib/tts.js ยิงเมื่อ TTS queue เริ่ม/จบ (map → tab 'tts')
//   ttplus-audio-tab   → pages ยิงพร้อม { tab, active, duration? }
export function useAudioActivity() {
  const [activity, setActivity] = useState({});
  const timersRef = useRef({});

  useEffect(() => {
    const onTtsActive = (e) => {
      setActivity(prev => ({ ...prev, tts: !!e.detail?.active }));
    };
    const onAudioTab = (e) => {
      const { tab, active, duration } = e.detail || {};
      if (!tab) return;
      clearTimeout(timersRef.current[tab]);
      setActivity(prev => ({ ...prev, [tab]: !!active }));
      // auto-reset หลัง duration ถ้ากำหนดมา (สำหรับ action audio ที่ไม่รู้วันจบชัดเจน)
      if (active && duration > 0) {
        timersRef.current[tab] = setTimeout(() => {
          setActivity(prev => ({ ...prev, [tab]: false }));
        }, duration);
      }
    };
    window.addEventListener('ttplus-tts-active', onTtsActive);
    window.addEventListener('ttplus-audio-tab',  onAudioTab);
    return () => {
      window.removeEventListener('ttplus-tts-active', onTtsActive);
      window.removeEventListener('ttplus-audio-tab',  onAudioTab);
    };
  }, []);

  return activity;
}

const PAGES = [
  { id: 'dashboard',  Component: Dashboard      },
  { id: 'tts',        Component: TtsPage        },
  { id: 'actions',    Component: ActionsPage    },
  { id: 'widgets',    Component: WidgetsPage    },
  { id: 'pk',         Component: PKPage         },
  { id: 'soundboard', Component: SoundboardPage },
  { id: 'settings',   Component: SettingsPage   },
  { id: 'donate',     Component: DonatePage     },
  { id: 'faq',        Component: FaqPage        },
];

const PATH_TO_ID = {
  '/':           'dashboard',
  '/dashboard':  'dashboard',
  '/tts':        'tts',
  '/actions':    'actions',
  '/widgets':    'widgets',
  '/pk':         'pk',
  '/soundboard': 'soundboard',
  '/settings':   'settings',
  '/donate':     'donate',
  '/faq':        'faq',
};

function applyTheme(t) {
  // Widget pages ต้องการพื้นหลังโปร่งใสสำหรับ OBS
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/widget/')) {
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor            = 'transparent';
    return;
  }
  const isDark = t === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.backgroundColor = isDark ? '#030712' : '#fdf0f7';
  document.body.style.backgroundColor            = isDark ? '#030712' : '#fdf0f7';
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // เริ่มต้น 'dark' เสมอ (ทั้ง server + client first render ต้องตรงกันเพื่อไม่เกิด hydration mismatch)
  // อ่าน localStorage ใน useEffect หลัง hydration แทน
  const [theme, setThemeState] = useState('dark');

  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // activePage — เริ่มจาก URL ปัจจุบัน
  const [activePage, setActivePageState] = useState('dashboard');

  // sync activePage กับ URL ตอน mount
  useEffect(() => {
    const id = PATH_TO_ID[router.pathname];
    if (id) setActivePageState(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ฟังก์ชัน navigate — เปลี่ยน activePage + update URL โดยไม่ reload
  function setActivePage(id) {
    setActivePageState(id);
    const href = id === 'dashboard' ? '/dashboard' : `/${id}`;
    router.replace(href, undefined, { shallow: true });
  }

  // ── ป้องกัน browser throttle background tabs ────────────────────────────────
  useEffect(() => { startKeepAlive(); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // อ่าน theme จาก localStorage หลัง hydration เสร็จ (ป้องกัน hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved && saved !== theme) {
      setThemeState(saved);
    }
    try {
      const col = localStorage.getItem('ttplus_sidebar_col');
      if (col !== null) setSidebarCollapsed(col === '1');
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(t) {
    localStorage.setItem('theme', t);
    setThemeState(t);
  }

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('ttplus_sidebar_col', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  // Widget pages และหน้าอื่นที่ไม่ใช่ main app — render ตามปกติ
  const isMainPage = !!PATH_TO_ID[router.pathname];

  // ── Single-tab enforcement (เฉพาะ main app เท่านั้น) ──────────────────────
  // tabRole: null = ปกติ | 'new_asks' = แถบใหม่เพิ่งเปิดและมีแถบเก่าอยู่แล้ว | 'taken_over' = แถบนี้ถูกแทนที่
  const [tabRole, setTabRole] = useState(null);
  const tabIdRef = useRef(null);
  const chRef    = useRef(null);
  if (tabIdRef.current === null && typeof window !== 'undefined') {
    tabIdRef.current = sessionStorage.getItem('ttplus_tabid') || (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem('ttplus_tabid', id);
      return id;
    })();
  }

  useEffect(() => {
    if (!isMainPage) return;
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    const ch = new BroadcastChannel('ttplus_main_tab');
    chRef.current = ch;
    // ตั้ง listener ก่อนเสมอ แล้วค่อย broadcast — ป้องกัน race condition
    const handler = (e) => {
      if (!e.data || e.data.id === tabIdRef.current) return;
      if (e.data.type === 'TAB_OPEN') {
        // มีแถบใหม่เพิ่งเปิด — เราเป็นแถบที่ active อยู่แล้ว ตอบกลับเงียบๆ ไม่แสดง overlay
        ch.postMessage({ type: 'TAB_ALREADY_OPEN', id: tabIdRef.current });
      }
      if (e.data.type === 'TAB_ALREADY_OPEN') {
        // เราเป็นแถบใหม่ มีแถบเก่าอยู่แล้ว — ถามผู้ใช้ว่าจะใช้แถบนี้แทนไหม
        setTabRole('new_asks');
      }
      if (e.data.type === 'TAB_TAKE_OVER') {
        // แถบอื่นตัดสินใจใช้แทนเรา — แจ้งให้ทราบ
        setTabRole('taken_over');
      }
    };
    ch.addEventListener('message', handler);
    // ประกาศว่าเพิ่งเปิด (หลัง listener พร้อมแล้ว)
    ch.postMessage({ type: 'TAB_OPEN', id: tabIdRef.current });
    return () => {
      ch.removeEventListener('message', handler);
      ch.close();
      chRef.current = null;
    };
  }, [isMainPage]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isMainPage) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:  theme === 'dark' ? '#1f2937' : '#ffffff',
              color:       theme === 'dark' ? '#f9fafb' : '#111827',
              border: '1px solid',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            },
          }}
        />
        <Component {...pageProps} theme={theme} setTheme={setTheme} user={user} authLoading={authLoading} />
      </>
    );
  }

  // Main app — render ทุกหน้าพร้อมกัน ซ่อน/แสดงด้วย display
  const sharedProps = { theme, setTheme, user, authLoading, activePage, setActivePage, sidebarCollapsed, toggleSidebar };

  // ── Single-tab overlay (แสดงเฉพาะเมื่อ tabRole !== null) ──────────────────
  if (tabRole) {
    const isDark    = theme === 'dark';
    const isNew     = tabRole === 'new_asks';
    const cardBg    = isDark ? '#111827' : '#ffffff';
    const cardBorder = isDark ? '#374151' : '#e5e7eb';
    const textMain  = isDark ? '#f9fafb' : '#111827';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const btnBorder = isDark ? '#374151' : '#d1d5db';

    return (
      <div style={{
        position:'fixed', inset:0, zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: isDark ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.75)',
        backdropFilter:'blur(8px)',
      }}>
        <div style={{
          textAlign:'center', padding:'40px 36px', borderRadius:20,
          background: cardBg, border: `1px solid ${cardBorder}`,
          maxWidth:400, margin:'0 16px', boxShadow:'0 25px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize:48, marginBottom:16 }}>{isNew ? '🪟' : '📦'}</div>
          <h2 style={{ color: textMain, fontSize:20, fontWeight:800, margin:'0 0 10px' }}>
            {isNew ? 'แอปเปิดอยู่ที่แถบอื่นแล้ว' : 'แถบนี้ถูกย้ายออกแล้ว'}
          </h2>
          <p style={{ color: textMuted, fontSize:14, lineHeight:1.6, margin:'0 0 24px' }}>
            {isNew
              ? <>ttsam.app กำลังทำงานที่แถบอื่นอยู่<br />ต้องการย้ายมาใช้แถบนี้แทนไหม?</>
              : <>แถบอื่นเข้ามาใช้งานแทนแล้ว<br />กด <strong>"ใช้แถบนี้ต่อ"</strong> ถ้าต้องการกลับมาที่แถบนี้</>
            }
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button
              onClick={() => {
                chRef.current?.postMessage({ type: 'TAB_TAKE_OVER', id: tabIdRef.current });
                setTabRole(null);
              }}
              style={{
                padding:'12px', borderRadius:12, border:'none', cursor:'pointer',
                background:'#f59e0b', color:'#000', fontWeight:700, fontSize:14,
              }}>
              {isNew ? '✅ ใช้แถบนี้แทน' : '🔄 ใช้แถบนี้ต่อ'}
            </button>
            <button
              onClick={() => window.close()}
              style={{
                padding:'12px', borderRadius:12, cursor:'pointer', fontSize:14,
                background:'transparent', border:`1px solid ${btnBorder}`,
                color: textMuted, fontWeight:500,
              }}>
              ✕ ปิดแถบนี้
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <StatusBar theme={theme} setTheme={setTheme} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:  theme === 'dark' ? '#1f2937' : '#ffffff',
            color:       theme === 'dark' ? '#f9fafb' : '#111827',
            border: '1px solid',
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        }}
      />
      <div style={{ paddingTop: 26 }}>
        {PAGES.map(({ id, Component: PageComp }) => (
          <div key={id} style={{ display: activePage === id ? 'block' : 'none' }}>
            <PageComp {...sharedProps} />
          </div>
        ))}
      </div>
    </>
  );
}
