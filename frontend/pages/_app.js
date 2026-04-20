import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import '../styles/globals.css';

function applyTheme(t) {
  const isDark = t === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.backgroundColor = isDark ? '#030712' : '#f9fafb';
  document.body.style.backgroundColor            = isDark ? '#030712' : '#f9fafb';
}

export default function App({ Component, pageProps }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  // ===== Global Auth State — single source of truth =====
  // ทุก page ใช้ user จาก _app.js ผ่าน props
  // ไม่มี onAuthStateChanged แยกในแต่ละ page อีกต่อไป
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(t) {
    localStorage.setItem('theme', t);
    setThemeState(t);
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color:      theme === 'dark' ? '#f9fafb' : '#111827',
            border: '1px solid',
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        }}
      />
      <Component
        {...pageProps}
        theme={theme}
        setTheme={setTheme}
        user={user}
        authLoading={authLoading}
      />
    </>
  );
}
