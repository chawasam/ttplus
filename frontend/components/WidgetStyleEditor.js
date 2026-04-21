// WidgetStyleEditor.js — UI สำหรับปรับแต่ง Widget Appearance
// รับ: styles object, widgetId, theme, onChange callback
import clsx from 'clsx';
import { addHash, stripHash, hexAlphaToRgba, WIDGET_DEFAULTS } from '../lib/widgetStyles';

const WIDGET_LABELS = {
  alert:       '🔔 Gift Alert',
  chat:        '💬 Chat Overlay',
  pinchat:     '📌 Pin Chat',
  leaderboard: '🏆 Leaderboard',
  goal:        '🎯 Goal Bar',
  viewers:     '👥 Viewer Count',
  coinjar:     '🫙 Coin Jar',
};

export default function WidgetStyleEditor({ widgetId, style, onChange, theme }) {
  const set = (key, val) => onChange({ ...style, [key]: val });
  const d = WIDGET_DEFAULTS[widgetId];

  const label   = clsx('text-xs font-medium', theme === 'dark' ? 'text-gray-400' : 'text-gray-500');
  const card    = clsx('rounded-xl p-4 space-y-4 border', theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm');
  const row     = 'flex items-center justify-between gap-3';
  const preview = hexAlphaToRgba(style.bg, style.bga);

  return (
    <div className={card}>
      <h4 className={clsx('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-900')}>
        {WIDGET_LABELS[widgetId]}
      </h4>

      {/* Preview strip */}
      <div
        className="rounded-lg p-3 flex items-center gap-3 transition-all duration-200"
        style={{ background: preview, border: `1px solid ${addHash(style.ac)}44` }}
      >
        <span style={{ color: addHash(style.ac), fontWeight: 700, fontSize: style.fs, borderRadius: style.br }}>
          ชื่อผู้ใช้
        </span>
        <span style={{ color: addHash(style.tc), fontSize: style.fs - 1 }}>
          ตัวอย่างข้อความ Widget
        </span>
      </div>

      {/* Background Color */}
      <div className={row}>
        <span className={label}>สีพื้นหลัง</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={addHash(style.bg)}
            onChange={e => set('bg', stripHash(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            title="เลือกสีพื้นหลัง"
          />
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            #{style.bg.toUpperCase()}
          </span>
          <button
            onClick={() => set('bg', d.bg)}
            className="text-xs text-gray-500 hover:text-brand-400 transition"
            title="รีเซ็ตค่า"
          >↩</button>
        </div>
      </div>

      {/* Background Opacity */}
      <div className="space-y-1">
        <div className={row}>
          <span className={label}>ความโปร่งใสพื้นหลัง</span>
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            {style.bga}%
          </span>
        </div>
        <input
          type="range" min="0" max="100"
          value={style.bga}
          onChange={e => set('bga', +e.target.value)}
          className="w-full accent-brand-500"
        />
        <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
          <span>โปร่งใสสุด (0%)</span>
          <span>ทึบสุด (100%)</span>
        </div>
      </div>

      {/* Text Color */}
      <div className={row}>
        <span className={label}>สีตัวอักษร</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={addHash(style.tc)}
            onChange={e => set('tc', stripHash(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            #{style.tc.toUpperCase()}
          </span>
          <button onClick={() => set('tc', d.tc)} className="text-xs text-gray-500 hover:text-brand-400 transition" title="รีเซ็ต">↩</button>
        </div>
      </div>

      {/* Accent Color */}
      <div className={row}>
        <span className={label}>สี Accent (ชื่อ / ไฮไลต์)</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={addHash(style.ac)}
            onChange={e => set('ac', stripHash(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            #{style.ac.toUpperCase()}
          </span>
          <button onClick={() => set('ac', d.ac)} className="text-xs text-gray-500 hover:text-brand-400 transition" title="รีเซ็ต">↩</button>
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-1">
        <div className={row}>
          <span className={label}>ขนาดตัวอักษร</span>
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            {style.fs}px
          </span>
        </div>
        <input
          type="range" min="10" max="28"
          value={style.fs}
          onChange={e => set('fs', +e.target.value)}
          className="w-full accent-brand-500"
        />
      </div>

      {/* Border Radius */}
      <div className="space-y-1">
        <div className={row}>
          <span className={label}>ความโค้งมุม</span>
          <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
            {style.br}px
          </span>
        </div>
        <input
          type="range" min="0" max="48"
          value={style.br}
          onChange={e => set('br', +e.target.value)}
          className="w-full accent-brand-500"
        />
      </div>

      {/* Chat-specific: direction + max messages */}
      {widgetId === 'chat' && (
        <>
          <div className="space-y-2">
            <span className={label}>ทิศทางแชท (แชทใหม่อยู่ที่ไหน)</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'down', icon: '⬇️', text: 'ล่างสุด' },
                { val: 'up',   icon: '⬆️', text: 'บนสุด'  },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('dir', opt.val)}
                  className={clsx(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition border',
                    (style.dir ?? 'down') === opt.val
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                  )}>
                  {opt.icon} {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className={row}>
              <span className={label}>จำนวนข้อความสูงสุด</span>
              <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                {style.max ?? 12} ข้อความ
              </span>
            </div>
            <input type="range" min="3" max="50"
              value={style.max ?? 12}
              onChange={e => set('max', +e.target.value)}
              className="w-full accent-brand-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>น้อย (3)</span><span>เยอะ (50)</span>
            </div>
          </div>
        </>
      )}

      {/* Reset all */}
      <button
        onClick={() => onChange({ ...d })}
        className={clsx('w-full py-1.5 rounded-lg text-xs font-medium transition border', theme === 'dark' ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:text-gray-800')}
      >
        ↩ รีเซ็ตค่าเริ่มต้น
      </button>
    </div>
  );
}
