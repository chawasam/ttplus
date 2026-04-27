// LiveFeed.js — แสดง events real-time (chat, gift, follow, like)
import { memo, useMemo, useState } from 'react';
import clsx from 'clsx';

const TYPE_COLORS = {
  chat:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   label: '💬' },
  gift:   { bg: 'bg-brand-500/10',  text: 'text-brand-400',  label: '🎁' },
  follow: { bg: 'bg-green-500/10',  text: 'text-green-400',  label: '➕' },
  like:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: '❤️' },
  share:  { bg: 'bg-purple-500/10', text: 'text-purple-400', label: '🔗' },
};

const LiveFeed = memo(function LiveFeed({ events = [], theme }) {
  const [filter, setFilter] = useState('all');

  // useMemo ป้องกัน reverse + filter ทำงานซ้ำเมื่อ theme เปลี่ยน (ไม่ใช่ events/filter)
  const reversed = useMemo(() => {
    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
    return [...filtered].reverse();
  }, [events, filter]);

  return (
    <div className={clsx('rounded-xl flex flex-col h-96', theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
      {/* Header */}
      <div className={clsx('flex items-center justify-between px-4 py-3 border-b', theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200')}>
        <h3 className={clsx('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          Live Feed
        </h3>
        <div className="flex gap-1">
          {['all', 'chat', 'gift', 'follow'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-2 py-1 rounded text-xs capitalize transition',
                filter === f
                  ? 'bg-brand-500 text-white'
                  : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {reversed.length === 0 ? (
          <div className={clsx('text-center text-sm py-8', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
            รอข้อมูล Live...
          </div>
        ) : (
          reversed.map((event, idx) => {
            const style = TYPE_COLORS[event.type] || TYPE_COLORS.chat;
            return (
              <div key={`${event.type}_${event.timestamp || 0}_${event.uniqueId || ''}_${idx}`} className={clsx('flex items-start gap-2 p-2 rounded-lg animate-slide-in-up', style.bg)}>
                <span className="text-base mt-0.5">{style.label}</span>
                <div className="flex-1 min-w-0">
                  <span className={clsx('font-semibold text-xs', style.text)}>
                    {event.nickname || event.uniqueId}
                  </span>
                  {event.type === 'chat' && (
                    <p className={clsx('text-xs mt-0.5 break-words', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                      {event.comment}
                    </p>
                  )}
                  {event.type === 'gift' && (
                    <p className={clsx('text-xs mt-0.5', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                      ส่ง <span className="font-semibold">{event.giftName}</span>
                      {event.repeatCount > 1 && <span> x{event.repeatCount}</span>}
                      {' '}({event.diamondCount * (event.repeatCount || 1)} 💎)
                    </p>
                  )}
                  {event.type === 'follow' && (
                    <p className={clsx('text-xs mt-0.5', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                      ติดตามแล้ว
                    </p>
                  )}
                  {event.type === 'like' && (
                    <p className={clsx('text-xs mt-0.5', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                      ❤️ {event.likeCount?.toLocaleString()} likes
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default LiveFeed;
