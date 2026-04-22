// pages/donate.js — Donate / Support page
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';

export default function DonatePage({ theme, setTheme, user, activePage, setActivePage }) {
  const isDark = theme === 'dark';
  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  return (
    <div className={clsx('min-h-screen', isDark ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />
      <main className="ml-16 md:ml-56 p-4 md:p-6 max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>❤️ สนับสนุน</h1>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
              TTplus ฟรี ถ้าชอบช่วยสนับสนุนได้นะครับ 🙏
            </p>
          </div>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg text-gray-400 text-lg">{isDark ? '☀️' : '🌙'}</button>
        </div>

        <div className="space-y-4">

          {/* PromptPay */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)' }}>
                💳
              </div>
              <div>
                <p className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>PromptPay · KBank</p>
                <p className="text-base font-bold text-brand-400">149-3-90921-1</p>
                <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>ชวลิต คำจันทร์</p>
              </div>
            </div>
          </div>

          {/* PayPal */}
          <div className={clsx('rounded-2xl p-4 border', card)}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #003087 0%, #009cde 100%)' }}>
                🅿️
              </div>
              <div className="flex-1">
                <p className={clsx('text-sm font-bold', isDark ? 'text-white' : 'text-gray-900')}>PayPal</p>
                <p className="text-sm font-bold text-blue-400">cksamg@gmail.com</p>
              </div>
              <a
                href="https://paypal.me/cksamg"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
                style={{ background: '#009cde' }}>
                Send
              </a>
            </div>
          </div>

          {/* Row: TikTok + Shopee */}
          <div className="grid grid-cols-2 gap-3">

            {/* TikTok — Cyberpunk */}
            <a href="https://www.tiktok.com/@samsoundcard" target="_blank" rel="noreferrer"
              className="block rounded-2xl overflow-hidden transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: '#05050f',
                border: '1px solid #00ffe7',
                boxShadow: '0 0 12px #00ffe740, inset 0 0 20px #00ffe708',
              }}>
              <div className="p-4">
                {/* Icon row */}
                <div className="flex items-center justify-between mb-3">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                  </svg>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: '#00ffe7', border: '1px solid #00ffe7', background: '#00ffe710' }}>
                    FOLLOW
                  </span>
                </div>
                <p className="text-white font-bold text-sm">@samsoundcard</p>
                <p className="text-xs mt-1" style={{ color: '#00ffe799' }}>
                  ซื้อสินค้าผ่านวิดีโอ<br />ได้ค่าคอม 🙏
                </p>
                {/* Cyberpunk bottom line */}
                <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, #00ffe7, #ff00aa, transparent)' }} />
              </div>
            </a>

            {/* Shopee */}
            <a href="https://collshp.com/samsoundcard363?view=storefront" target="_blank" rel="noreferrer"
              className="block rounded-2xl overflow-hidden transition hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isDark ? '#1a0a00' : '#fff5f0',
                border: '1px solid #EE4D2D',
                boxShadow: '0 0 10px #EE4D2D30',
              }}>
              <div className="p-4">
                {/* Shopee icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: '#EE4D2D' }}>
                    🛍
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: '#EE4D2D' }}>
                    SHOP
                  </span>
                </div>
                <p className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#333' }}>Shopee</p>
                <p className="text-xs mt-1" style={{ color: isDark ? '#ff8c6b' : '#EE4D2D' }}>
                  กดลิ้งค์ก่อนซื้อของ<br />ได้ค่าคอมทุกชิ้น 🙏<br />อย่าลืมกดส่วนลดก่อน!
                </p>
                <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, #EE4D2D, #ff8c6b, transparent)' }} />
              </div>
            </a>

          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
            <span className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>หรือสนับสนุนโดยตรง</span>
            <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
          </div>

          {/* Row: Buy Me a Coffee + Ko-fi */}
          <div className="grid grid-cols-2 gap-3">

            {/* Buy Me a Coffee — no link */}
            <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl font-semibold"
              style={{ background: '#FFDD00', color: '#1a1a1a', opacity: 0.6 }}>
              <span className="text-2xl">☕</span>
              <div className="text-center">
                <p className="text-xs font-bold">Buy Me a Coffee</p>
                <p className="text-xs opacity-60 mt-0.5">เร็วๆ นี้</p>
              </div>
            </div>

            {/* Ko-fi — no link */}
            <div className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl font-semibold"
              style={{ background: '#29ABE0', color: '#fff', opacity: 0.6 }}>
              <span className="text-2xl">🎁</span>
              <div className="text-center">
                <p className="text-xs font-bold">Ko-fi</p>
                <p className="text-xs opacity-60 mt-0.5">เร็วๆ นี้</p>
              </div>
            </div>

          </div>

        </div>

        <p className={clsx('text-center text-xs mt-6', isDark ? 'text-gray-600' : 'text-gray-400')}>
          ขอบคุณทุกการสนับสนุนครับ 🙏
        </p>
      </main>
    </div>
  );
}
