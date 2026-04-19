// GoalBar.js — Progress bar สำหรับ goal
import { memo } from 'react';
import clsx from 'clsx';

const GoalBar = memo(function GoalBar({ current = 0, target = 100, label = 'Goal', theme }) {
  const pct = Math.min((current / target) * 100, 100);

  return (
    <div className={clsx('rounded-xl p-4', theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200 shadow-sm')}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={clsx('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
          🎯 {label}
        </h3>
        <span className="text-xs font-bold text-brand-400">
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className={clsx('h-3 rounded-full overflow-hidden', theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')}>
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={clsx('text-right text-xs mt-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
        {pct.toFixed(1)}%
      </p>
    </div>
  );
});

export default GoalBar;
