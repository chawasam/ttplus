// Sidebar.js — Navigation sidebar (SPA mode — ไม่ navigate เปลี่ยนหน้า)
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

// ── Hook: ฟัง window events แล้ว track ว่าแถบไหนกำลังส่งเสียง ──
// ttplus-tts-active  → { active: bool }  จาก lib/tts.js (map เป็น key 'tts')
// ttplus-audio-tab   → { tab, active, duration? } จาก pages ต่างๆ
function useAudioActivity() {
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

const navItems = [
  { id: 'dashboard',  icon: '📊',  label: 'Dashboard'   },
  { id: 'tts',        icon: '🔊',  label: 'TTS (สิริ)'  },
  { id: 'actions',    icon: '🎁',  label: 'Actions & Events' },
  { id: 'widgets',    icon: '🎛️', label: 'Widgets'     },
  { id: 'pk',         icon: '⚔️',  label: 'PK Panel'    },
  { id: 'soundboard', icon: '🎹',  label: 'Soundboard'  },
  { id: 'settings',   icon: '⚙️', label: 'Settings'    },
  { id: 'donate',     icon: '❤️', label: 'Donate'      },
  { id: 'faq',        icon: '❓',  label: 'FAQ'         },
];

export default function Sidebar({ theme, user, activePage, setActivePage, onSignOut, collapsed, onToggleCollapse }) {
  const dark = theme === 'dark';
  const isCol = !!collapsed; // collapsed state จาก parent (_app.js)
  const audioActivity = useAudioActivity();

  return (
    <aside
      className={clsx(
        'flex flex-col fixed left-0 z-40 border-r transition-all duration-200',
        // mobile: เสมอ w-16 | desktop: ขึ้นกับ collapsed
        isCol ? 'w-16' : 'w-16 md:w-48',
        dark ? 'bg-gray-900 border-gray-800' : 'bg-[#fce4f0] border-pink-200'
      )}
      style={{ top: 26, height: 'calc(100vh - 26px)' }}
    >
      {/* ── Logo ── */}
      <div className={clsx(
        'flex items-center gap-3 px-3 py-5 border-b flex-shrink-0',
        !isCol && 'md:px-4',
        dark ? 'border-gray-800' : 'border-pink-200'
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
          </svg>
        </div>
        {!isCol && (
          <span className={clsx('hidden md:block font-bold text-sm truncate', dark ? 'text-white' : 'text-pink-900')}>
            TTsam
          </span>
        )}
        {/* Sakura decoration — light mode only */}
        {!dark && !isCol && (
          <span className="hidden md:block ml-auto select-none" aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
            🌸
          </span>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ id, icon, label }) => {
          const active    = activePage === id;
          const audioOn   = !!audioActivity?.[id];
          return (
            <button
              key={id}
              onClick={() => setActivePage?.(id)}
              title={isCol ? label : undefined}
              className={clsx(
                'relative w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors text-left',
                !isCol && 'md:px-3',
                active
                  ? dark
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-900/50'
                    : 'bg-pink-400 text-white shadow-sm shadow-pink-300/60'
                  : dark
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-pink-800 hover:bg-pink-100 hover:text-pink-900'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-lg flex-shrink-0 leading-none">{icon}</span>
              {!isCol && <span className="hidden md:block text-sm font-medium truncate flex-1">{label}</span>}

              {/* ── Speaker indicator ── */}
              {!isCol ? (
                // Expanded: speaker icon on the right
                <span
                  className="hidden md:block ml-auto flex-shrink-0 text-xs leading-none select-none"
                  style={{
                    opacity:    audioOn ? 1 : 0.18,
                    filter:     audioOn ? (active ? 'none' : 'drop-shadow(0 0 3px #f59e0b)') : 'none',
                    transition: 'opacity 0.3s, filter 0.3s',
                  }}
                  aria-hidden="true"
                >
                  🔊
                </span>
              ) : (
                // Collapsed: dot in top-right corner
                <span
                  style={{
                    position:     'absolute',
                    top:          5, right: 5,
                    width:        6, height: 6,
                    borderRadius: '50%',
                    background:   audioOn ? '#f59e0b' : (dark ? '#3f3f46' : '#d4d4d8'),
                    opacity:      audioOn ? 1 : 0.3,
                    boxShadow:    audioOn ? '0 0 5px #f59e0baa' : 'none',
                    transition:   'background 0.3s, opacity 0.3s, box-shadow 0.3s',
                    pointerEvents: 'none',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Collapse toggle — desktop only ── */}
      {onToggleCollapse && (
        <div className="hidden md:block px-2 pb-2 flex-shrink-0">
          <button
            onClick={onToggleCollapse}
            title={isCol ? 'ขยาย Sidebar' : 'ย่อ Sidebar'}
            className={clsx(
              'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border',
              dark
                ? 'text-brand-400 border-brand-800/60 bg-brand-900/20 hover:bg-brand-900/40 hover:border-brand-600/70 hover:text-brand-300'
                : 'text-pink-600 border-pink-200 bg-pink-50 hover:bg-pink-100 hover:border-pink-300'
            )}
          >
            {/* ลูกศรชี้ซ้าย/ขวา แบบ animated */}
            <span
              className="text-base leading-none transition-transform duration-200"
              style={{ transform: isCol ? 'scaleX(-1)' : 'scaleX(1)' }}
            >
              ‹‹
            </span>
            {!isCol && <span className="hidden md:inline">ย่อ</span>}
          </button>
        </div>
      )}

      {/* ── TikTok promo ── */}
      <div className={clsx('px-2 pb-3 border-t pt-3 flex-shrink-0', dark ? 'border-gray-800' : 'border-pink-100')}>
        <a
          href="https://www.tiktok.com/@samsoundcard"
          target="_blank"
          rel="noreferrer"
          title="@samsoundcard บน TikTok"
          className={clsx(
            'group flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200',
            dark
              ? 'hover:bg-[#00ffe710] hover:shadow-[0_0_12px_#00ffe730]'
              : 'hover:bg-pink-100'
          )}
        >
          <div className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
            dark ? 'bg-gray-800 group-hover:bg-[#00ffe715]' : 'bg-pink-100 group-hover:bg-pink-200'
          )}>
            <svg viewBox="0 0 24 24" fill="currentColor"
              className={clsx('w-4 h-4 transition-colors duration-200',
                dark ? 'text-gray-400 group-hover:text-[#00ffe7]' : 'text-pink-400 group-hover:text-pink-600'
              )}>
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
            </svg>
          </div>
          {!isCol && (
            <div className="hidden md:block overflow-hidden">
              <p className={clsx(
                'text-xs font-semibold truncate transition-colors duration-200',
                dark ? 'text-gray-400 group-hover:text-[#00ffe7]' : 'text-pink-500 group-hover:text-pink-700'
              )}>
                @samsoundcard
              </p>
              <p className={clsx('text-xs truncate', dark ? 'text-gray-600' : 'text-pink-300')}>
                ซับพอร์ทหน่อยคับ🙏🥺
              </p>
            </div>
          )}
        </a>
      </div>

      {/* ── User + Logout ── */}
      {user && (
        <div className={clsx('border-t p-3 flex-shrink-0', dark ? 'border-gray-800' : 'border-pink-200')}>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="avatar"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full flex-shrink-0"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            {!isCol && (
              <div className="hidden md:block overflow-hidden flex-1">
                <p className={clsx('text-xs font-medium truncate', dark ? 'text-white' : 'text-pink-900')}>
                  {user.displayName}
                </p>
                <p className={clsx('text-xs truncate', dark ? 'text-gray-500' : 'text-pink-400')}>
                  {user.email}
                </p>
              </div>
            )}
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title={isCol ? 'ออกจากระบบ' : undefined}
              className={clsx(
                'mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition',
                dark
                  ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
                  : 'text-pink-300 hover:text-red-500 hover:bg-red-50'
              )}
            >
              <span>⬡</span>
              {!isCol && <span className="hidden md:inline">ออกจากระบบ</span>}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
