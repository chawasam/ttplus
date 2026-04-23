import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import '../styles/globals.css';

// โหลดทุกหน้าพร้อมกัน — ไม่ unmount เมื่อสลับแถบ
import Dashboard     from './dashboard';
import TtsPage       from './tts';
import WidgetsPage   from './widgets';
import SoundboardPage from './soundboard';
import SettingsPage  from './settings';
import DonatePage    from './donate';
import FaqPage       from './faq';

const PAGES = [
  { id: 'dashboard',  Component: Dashboard      },
  { id: 'tts',        Component: TtsPage        },
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
      {PAGES.map(({ id, Component: PageComp }) => (
        <div key={id} style={{ display: activePage === id ? 'block' : 'none' }}>
          <PageComp {...sharedProps} />
        </div>
      ))}
    </>
  );
}
