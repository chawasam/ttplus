import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { loadSettings as loadSbSettings } from '../lib/soundboardStore';
import '../styles/globals.css';

// โหลดทุกหน้าพร้อมกัน — ไม่ unmount เมื่อสลับแถบ
import Dashboard      from './dashboard';
import TtsPage        from './tts';
import ActionsPage    from './actions';
import WidgetsPage    from './widgets';
import SoundboardPage from './soundboard';
import SettingsPage   from './settings';
import DonatePage     from './donate';
import FaqPage        from './faq';

// ── Minimal status bar — แสดงสถานะ TikTok / Soundboard / TTS ──
function StatusBar({ theme }) {
  const [conn, setConn]       = useState({ connected: false, username: '' });
  const [sbOn, setSbOn]       = useState(false);
  const [ttsOn, setTtsOn]     = useState(false);

  useEffect(() => {
    // อ่านค่าเริ่มต้น soundboard จาก localStorage
    setSbOn(loadSbSettings().enabled || false);

    const onConn = (e) => setConn({ connected: e.detail.connected, username: e.detail.username || '' });
    const onTts  = (e) => setTtsOn(!!e.detail.enabled);
    const onSb   = (e) => setSbOn(!!e.detail.enabled);

    window.addEventListener('ttplus-conn', onConn);
    window.addEventListener('ttplus-tts',  onTts);
    window.addEventListener('ttplus-sb',   onSb);
    return () => {
      window.removeEventListener('ttplus-conn', onConn);
      window.removeEventListener('ttplus-tts',  onTts);
      window.removeEventListener('ttplus-sb',   onSb);
    };
  }, []);

  const dark      = theme === 'dark';
  const bar       = dark ? 'rgba(9,9,11,0.92)' : 'rgba(248,250,252,0.92)';
  const border    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textMuted = dark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const divider   = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';

  const dot = (on, onColor = '#22c55e') => ({
    display:      'inline-block',
    width:        6, height: 6,
    borderRadius: '50%',
    background:   on ? onColor : (dark ? '#3f3f46' : '#d4d4d8'),
    marginRight:  5,
    flexShrink:   0,
    boxShadow:    on ? `0 0 5px ${onColor}88` : 'none',
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
        <span style={dot(conn.connected, '#22c55e')} />
        {conn.connected
          ? <span style={{ color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)' }}>
              @{conn.username}
            </span>
          : <span>ไม่ได้เชื่อมต่อ</span>
        }
      </span>

      <span style={{ width: 1, height: 12, background: divider, flexShrink: 0 }} />

      {/* Soundboard */}
      <span style={item}>
        <span style={dot(sbOn, '#f59e0b')} />
        <span style={sbOn ? { color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)' } : {}}>
          Soundboard
        </span>
      </span>

      <span style={{ width: 1, height: 12, background: divider, flexShrink: 0 }} />

      {/* TTS */}
      <span style={item}>
        <span style={dot(ttsOn, '#a78bfa')} />
        <span style={ttsOn ? { color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)' } : {}}>
          TTS
        </span>
      </span>
    </div>
  );
}

const PAGES = [
  { id: 'dashboard',  Component: Dashboard      },
  { id: 'tts',        Component: TtsPage        },
  { id: 'actions',    Component: ActionsPage    },
  { id: 'widgets',    Component: WidgetsPage    },
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
  document.documentElement.style.backgroundColor = isDark ? '#030712' : '#f9fafb';
  document.body.style.backgroundColor            = isDark ? '#030712' : '#f9fafb';
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // เริ่มต้น 'dark' เสมอ (ทั้ง server + client first render ต้องตรงกันเพื่อไม่เกิด hydration mismatch)
  // อ่าน localStorage ใน useEffect หลัง hydration แทน
  const [theme, setThemeState] = useState('dark');

  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(t) {
    localStorage.setItem('theme', t);
    setThemeState(t);
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
  const sharedProps = { theme, setTheme, user, authLoading, activePage, setActivePage };

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
      <StatusBar theme={theme} />
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
