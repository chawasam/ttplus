// pages/donate.js — Donate page
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';

export default function DonatePage({ theme, setTheme }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u || null); });
    return () => unsub();
  }, []);

  // setTheme จาก _app.js จัดการ localStorage + classList ให้แล้ว — ไม่ต้องทำซ้ำ
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} />

      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>❤️ Donate</h1>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-400 text-lg">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className={clsx('rounded-2xl p-6 text-center mb-6', theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
          <div className="text-5xl mb-4">❤️</div>
          <h2 className={clsx('text-xl font-bold mb-2', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            สนับสนุนการพัฒนา
          </h2>
          <p className={clsx('text-sm mb-6', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            TTplus เป็นบริการฟรี ถ้าชอบและอยากให้พัฒนาต่อเนื่อง สามารถสนับสนุนได้เลยครับ
          </p>

          {/* Donate buttons — แก้ไข link และชื่อบัญชีตามต้องการ */}
          <div className="space-y-3">
            <a
              href="https://www.buymeacoffee.com/YOUR_USERNAME"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold transition"
            >
              ☕ Buy Me a Coffee
            </a>
            <a
              href="https://ko-fi.com/YOUR_USERNAME"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition"
            >
              🎁 Ko-fi
            </a>
            {/* พร้อมเพย์ / PromptPay */}
            <div className={clsx('rounded-xl p-4 text-center', theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100')}>
              <p className={clsx('text-sm font-semibold mb-1', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                💳 PromptPay
              </p>
              <p className={clsx('text-lg font-bold text-brand-400')}>
                0XX-XXX-XXXX {/* แก้ไขเบอร์โทร/เลขบัตรตรงนี้ */}
              </p>
            </div>
          </div>
        </div>

        <p className={clsx('text-center text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
          ขอบคุณทุกการสนับสนุนครับ 🙏
        </p>
      </main>
    </div>
  );
}
