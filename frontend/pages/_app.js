import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

// ฟังก์ชันกลาง — apply theme ทั้ง class + body background
function applyTheme(t) {
  const isDark = t === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  // ทำให้ body/html มีสีพื้นหลังถูกต้อง (ป้องกันสีขาวโผล่ขณะ scroll)
  document.documentElement.style.backgroundColor = isDark ? '#030712' : '#f9fafb';
  document.body.style.backgroundColor            = isDark ? '#030712' : '#f9fafb';
}

export default function App({ Component, pageProps }) {
  // อ่าน theme จาก localStorage ก่อน mount เพื่อป้องกัน flash
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  // Sync DOM ทุกครั้งที่ theme เปลี่ยน (ไม่ใช่แค่ตอน mount)
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // setTheme — ห่อให้ save localStorage พร้อมกันด้วย
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
      <Component {...pageProps} theme={theme} setTheme={setTheme} />
    </>
  );
}
