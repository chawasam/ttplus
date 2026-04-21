// pages/donate.js — Donate page
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';

export default function DonatePage({ theme, setTheme, user }) {
  const isDark = theme === 'dark';
  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={clsx('min-h-screen', isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} />
      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>❤️ สนับสนุน</h1>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
              TTplus ฟรี 100% ถ้าชอบช่วยสนับสนุนได้นะครับ 🙏
            </p>
          </div>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg text-gray-400 text-lg">{isDark ? '☀️' : '🌙'}</button>
        </div>

        <div className="space-y-4">

          {/* TikTok Channel Card */}
          <a href="https://www.tiktok.com/@samsoundcard" target="_blank" rel="noreferrer"
            className={clsx(
              'block rounded-2xl border overflow-hidden transition hover:scale-[1.01] active:scale-[0.99]',
              isDark ? 'bg-gray-900 border-gray-800 hover:border-gray-600' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
            )}>
            {/* TikTok gradient banner */}
            <div className="h-24 relative flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #010101 0%, #161823 40%, #69C9D0 70%, #EE1D52 100%)' }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #69C9D0 0%, transparent 50%), radial-gradient(circle at 70% 50%, #EE1D52 0%, transparent 50%)' }} />
              {/* TikTok logo */}
              <svg className="w-10 h-10 relative z-10" viewBox="0 0 24 24" fill="white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
              </svg>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #69C9D0, #EE1D52)' }}>
                  S
                </div>
                <div>
                  <p className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>@samsoundcard</p>
                  <p className={clsx('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>TikTok Creator</p>
                </div>
                <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg, #EE1D52, #69C9D0)' }}>
                  Follow ➜
                </span>
              </div>
              <div className={clsx('rounded-xl p-3 text-sm', isDark ? 'bg-gray-800' : 'bg-gray-50')}>
                <p className={clsx(isDark ? 'text-gray-300' : 'text-gray-600')}>
                  🛒 หรือสนับสนุนโดยการสั่งซื้อสินค้าผ่านวีดิโอผมได้ค่าคอม
                </p>
                <p className={clsx('text-xs mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
                  กดที่วีดิโอ → กดสั่งซื้อสินค้า → ผมได้ค่า commission ขอบคุณครับ 🙏
                </p>
              </div>
            </div>
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
            <span className={clsx('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>หรือสนับสนุนโดยตรง</span>
            <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
          </div>

          {/* Buy Me a Coffee */}
          <a href="https://www.buymeacoffee.com/samsoundcard" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 w-full py-3.5 px-5 rounded-2xl font-semibold transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#FFDD00', color: '#1a1a1a' }}>
            <span className="text-xl">☕</span>
            <div className="flex-1">
              <p className="text-sm font-bold">Buy Me a Coffee</p>
              <p className="text-xs opacity-60">buymeacoffee.com/samsoundcard</p>
            </div>
            <span className="text-sm opacity-50">→</span>
          </a>

          {/* Ko-fi */}
          <a href="https://ko-fi.com/samsoundcard" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 w-full py-3.5 px-5 rounded-2xl font-semibold transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#29ABE0', color: '#fff' }}>
            <span className="text-xl">🎁</span>
            <div className="flex-1">
              <p className="text-sm font-bold">Ko-fi</p>
              <p className="text-xs opacity-70">ko-fi.com/samsoundcard</p>
            </div>
            <span className="text-sm opacity-50">→</span>
          </a>

          {/* PromptPay */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a237e, #283593)' }}>
                💳
              </div>
              <div>
                <p className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>PromptPay</p>
                <p className="text-base font-bold text-brand-400">0XX-XXX-XXXX</p>
              </div>
            </div>
          </div>

        </div>

        <p className={clsx('text-center text-xs mt-6', isDark ? 'text-gray-600' : 'text-gray-400')}>
          ขอบคุณทุกการสนับสนุนครับ 🙏 ทำให้ TTplus พัฒนาต่อได้
        </p>
      </main>
    </div>
  );
}
