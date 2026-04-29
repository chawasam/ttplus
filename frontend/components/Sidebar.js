// Sidebar.js — Navigation sidebar (SPA mode — ไม่ navigate เปลี่ยนหน้า)
import clsx from 'clsx';

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

export default function Sidebar({ theme, user, activePage, setActivePage, onSignOut }) {
  return (
    <aside className={clsx(
      'flex flex-col w-16 md:w-56 fixed left-0 z-40 border-r transition-all',
      theme === 'dark'
        ? 'bg-gray-900 border-gray-800'
        : 'bg-white border-gray-200'
    )}
    style={{ top: 26, height: 'calc(100vh - 26px)' }}>
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-3 md:px-4 py-5 border-b', theme === 'dark' ? 'border-gray-800' : 'border-gray-200')}>
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
          </svg>
        </div>
        <span className={clsx('hidden md:block font-bold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          TTsam
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ id, icon, label }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage?.(id)}
              className={clsx(
                'w-full flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-lg transition text-left',
                active
                  ? 'bg-brand-500 text-white'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-lg">{icon}</span>
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* TikTok promo */}
      <div className={clsx('px-2 pb-3 border-t pt-3', theme === 'dark' ? 'border-gray-800' : 'border-gray-100')}>
        <a
          href="https://www.tiktok.com/@samsoundcard"
          target="_blank"
          rel="noreferrer"
          title="@samsoundcard บน TikTok"
          className={clsx(
            'group flex items-center gap-3 px-2 md:px-3 py-2 rounded-xl transition-all duration-200',
            theme === 'dark'
              ? 'hover:bg-[#00ffe710] hover:shadow-[0_0_12px_#00ffe730]'
              : 'hover:bg-sky-50'
          )}
        >
          {/* TikTok icon */}
          <div className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
            theme === 'dark'
              ? 'bg-gray-800 group-hover:bg-[#00ffe715]'
              : 'bg-gray-100 group-hover:bg-sky-100'
          )}>
            <svg viewBox="0 0 24 24" fill="currentColor"
              className={clsx('w-4 h-4 transition-colors duration-200',
                theme === 'dark' ? 'text-gray-400 group-hover:text-[#00ffe7]' : 'text-gray-500 group-hover:text-sky-500'
              )}>
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
            </svg>
          </div>
          {/* Label — hidden on mobile */}
          <div className="hidden md:block overflow-hidden">
            <p className={clsx(
              'text-xs font-semibold truncate transition-colors duration-200',
              theme === 'dark' ? 'text-gray-400 group-hover:text-[#00ffe7]' : 'text-gray-500 group-hover:text-sky-500'
            )}>
              @samsoundcard
            </p>
            <p className={clsx('text-xs truncate', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              ซับพอร์ทหน่อยคับ🙏🥺
            </p>
          </div>
        </a>
      </div>

      {/* User + Logout */}
      {user && (
        <div className={clsx(
          'border-t p-3',
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        )}>
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
            <div className="hidden md:block overflow-hidden flex-1">
              <p className={clsx('text-xs font-medium truncate', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                {user.displayName}
              </p>
              <p className={clsx('text-xs truncate', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                {user.email}
              </p>
            </div>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="ออกจากระบบ"
              className={clsx(
                'mt-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition',
                theme === 'dark'
                  ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              )}
            >
              <span>⬡</span>
              <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
