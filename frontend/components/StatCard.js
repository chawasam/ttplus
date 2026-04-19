// StatCard.js — แสดงตัวเลข stat เดียว (viewers, likes, gifts, etc.)
import { memo } from 'react';
import clsx from 'clsx';

const StatCard = memo(function StatCard({ icon, label, value, color = 'brand', theme }) {
  const colorMap = {
    brand:  'bg-brand-500/10 text-brand-400',
    blue:   'bg-blue-500/10 text-blue-400',
    green:  'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className={clsx(
      'rounded-xl p-4 flex items-center gap-4',
      theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200 shadow-sm'
    )}>
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0', colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>{label}</p>
        <p className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
});

export default StatCard;
