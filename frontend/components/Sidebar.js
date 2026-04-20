// Sidebar.js — Navigation sidebar
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', icon: '📊',  label: 'Dashboard'   },
  { href: '/tts',       icon: '🔊',  label: 'TTS (สิริ)'  },
  { href: '/widgets',   icon: '🎛️', label: 'Widgets'     },
  { href: '/settings',  icon: '⚙️', label: 'Settings'    },
  { href: '/donate',    icon: '❤️', label: 'Donate'      },
];

export default function Sidebar({ theme, user }) {
  const router = useRouter();

  return (
    <aside className={clsx(
      'flex flex-col w-16 md:w-56 h-screen fixed left-0 top-0 z-40 border-r transition-all',
      theme === 'dark'
        ? 'bg-gray-900 border-gray-800'
        : 'bg-white border-gray-200'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-3 md:px-4 py-5 border-b', theme === 'dark' ? 'border-gray-800' : 'border-gray-200')}>
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
          </svg>
        </div>
        <span className={clsx('hidden md:block font-bold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          TTplus
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ href, icon, label }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href}>
              <div className={clsx(
                'flex items-center gap-3 px-2 md:px-3 py-2.5 rounded-lg cursor-pointer transition',
                active
                  ? 'bg-brand-500 text-white'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}>
                <span className="text-lg">{icon}</span>
                <span className="hidden md:block text-sm font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className={clsx(
          'border-t p-3 flex items-center gap-3',
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        )}>
          {user.photoURL && (
            <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full flex-shrink-0" />
          )}
          <div className="hidden md:block overflow-hidden">
            <p className={clsx('text-xs font-medium truncate', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
              {user.displayName}
            </p>
            <p className={clsx('text-xs truncate', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
              {user.email}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
