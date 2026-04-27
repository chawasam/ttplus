// GiftLeaderboard.js — อันดับผู้ส่งของขวัญ
import { memo } from 'react';
import clsx from 'clsx';
import { safeTikTokImageUrl } from '../lib/sanitize';

const GiftLeaderboard = memo(function GiftLeaderboard({ leaderboard = [], theme }) {
  const top = leaderboard.slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className={clsx('rounded-xl', theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
      <div className={clsx('px-4 py-3 border-b', theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200')}>
        <h3 className={clsx('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          🏆 Gift Leaderboard
        </h3>
      </div>
      <div className="p-3 space-y-2">
        {top.length === 0 ? (
          <p className={clsx('text-center text-sm py-4', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
            ยังไม่มีของขวัญ
          </p>
        ) : (
          top.map((user, idx) => (
            <div key={user.uniqueId} className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold">
                {medals[idx] || `${idx + 1}`}
              </span>
              {user.profilePictureUrl && (
                <img src={safeTikTokImageUrl(user.profilePictureUrl)} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className={clsx('text-xs font-semibold truncate', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                  {user.nickname || user.uniqueId}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-brand-400 font-bold">
                <span>💎</span>
                <span>{user.diamonds?.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default GiftLeaderboard;
