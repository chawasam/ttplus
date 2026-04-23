// WidgetStyleEditor.js — UI สำหรับปรับแต่ง Widget Appearance
// รับ: styles object, widgetId, theme, onChange callback
import clsx from 'clsx';
import { addHash, stripHash, hexAlphaToRgba, WIDGET_DEFAULTS } from '../lib/widgetStyles';
import { SKIN_LIST } from '../lib/chatSkins';

const WIDGET_LABELS = {
  alert:       '🔔 Gift Alert',
  chat:        '💬 Chat Overlay',
  pinchat:     '📌 Pin Chat',
  pinprofile:  '👤 Pin Profile Card',
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
            <span className={label}>แชทใหม่โผล่ที่ไหน</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'down', icon: '⬇️', text: 'ล่าง (แนะนำ)' },
                { val: 'up',   icon: '⬆️', text: 'บน'            },
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

          {/* Bubble width */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>↔ ความกว้าง Bubble</span>
              <div className="flex items-center gap-1.5">
                <span className={clsx('text-xs font-mono font-bold',
                  (style.bw ?? 100) < 100 ? 'text-brand-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                  {style.bw ?? 100}%
                </span>
                {(style.bw ?? 100) < 100 && (
                  <button onClick={() => set('bw', 100)} className="text-xs text-gray-500 hover:text-brand-400 transition" title="รีเซ็ต">↩</button>
                )}
              </div>
            </div>
            <input type="range" min="30" max="100" step="5"
              value={style.bw ?? 100}
              onChange={e => set('bw', +e.target.value)}
              className="w-full accent-brand-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>แคบ (30%)</span><span>เต็ม (100%)</span>
            </div>
          </div>

          {/* Layout: inline vs stack */}
          <div className="space-y-2">
            <span className={label}>รูปแบบ Bubble</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'inline', icon: '▬', text: 'ชื่อ + ข้อความ (บรรทัดเดียว)' },
                { val: 'stack',  icon: '☰', text: 'ชื่อบน / ข้อความล่าง' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('layout', opt.val)}
                  title={opt.text}
                  className={clsx(
                    'py-2 px-2 rounded-lg text-xs font-semibold transition border text-left',
                    (style.layout ?? 'inline') === opt.val
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
        </>
      )}

      {/* ── Pin Profile Card ── */}
      {widgetId === 'pinprofile' && (
        <div className="space-y-4">
          {/* Layout toggle */}
          <div className="space-y-2">
            <span className={label}>รูปแบบการ์ด</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'h', icon: '⬛', text: 'แนวนอน  (400×150)' },
                { val: 'v', icon: '▬',  text: 'แนวตั้ง  (240×240)' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('orient', opt.val)}
                  className={clsx(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition border',
                    (style.orient ?? 'h') === opt.val
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

          {/* Show chat toggle */}
          <div className="space-y-2">
            <span className={label}>แสดงข้อความแชทในการ์ด</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 0, icon: '🙈', text: 'ซ่อน (ชื่อ + avatar เท่านั้น)' },
                { val: 1, icon: '💬', text: 'แสดง (ชื่อ + ข้อความที่คลิก)' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('showChat', opt.val)}
                  title={opt.text}
                  className={clsx(
                    'py-2 px-2 rounded-lg text-xs font-semibold transition border text-left',
                    (style.showChat ?? 0) === opt.val
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                  )}>
                  {opt.icon} <span className="truncate">{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Coinjar: ตำแหน่งโถ + ของขวัญสูงสุด ── */}
      {widgetId === 'coinjar' && (
        <div className="space-y-3 pt-1">
          <span className={clsx('text-xs font-semibold', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
            🫙 ตั้งค่าขวดโหล
          </span>

          {/* Jar X offset */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>↔ ตำแหน่งซ้าย-ขวา</span>
              <div className="flex items-center gap-1.5">
                <span className={clsx('text-xs font-mono font-bold', (style.jx ?? 0) !== 0 ? 'text-amber-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                  {(style.jx ?? 0) > 0 ? '+' : ''}{style.jx ?? 0}px
                </span>
                {(style.jx ?? 0) !== 0 && (
                  <button onClick={() => set('jx', 0)} className="text-xs text-gray-500 hover:text-brand-400 transition" title="รีเซ็ต">↩</button>
                )}
              </div>
            </div>
            <input
              type="range" min="-200" max="200" step="5"
              value={style.jx ?? 0}
              onChange={e => set('jx', +e.target.value)}
              className="w-full accent-amber-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>← ซ้าย</span><span>กลาง</span><span>ขวา →</span>
            </div>
          </div>

          {/* Gift size scale */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>📦 ขนาด Gift (Base Size)</span>
              <span className={clsx('text-xs font-mono font-bold', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                {style.gs ?? 100}%
              </span>
            </div>
            <input
              type="range" min="50" max="300" step="5"
              value={style.gs ?? 100}
              onChange={e => set('gs', +e.target.value)}
              className="w-full accent-amber-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>เล็ก (50%)</span><span>ปกติ (100%)</span><span>ใหญ่ (300%)</span>
            </div>
            <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              💡 &lt;999 coin = 0.5× &nbsp;|&nbsp; 999+ = 0.75× &nbsp;|&nbsp; 9999+ = 1.5×
            </p>
          </div>

          {/* Max items */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>🎁 ของขวัญสูงสุดใน Widget</span>
              <span className={clsx('text-xs font-mono font-bold', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                {style.mi ?? 150} ชิ้น
              </span>
            </div>
            <input
              type="range" min="10" max="600" step="10"
              value={style.mi ?? 150}
              onChange={e => set('mi', +e.target.value)}
              className="w-full accent-amber-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>น้อย (10)</span><span>150</span><span>เยอะ (600) ⚠️CPU</span>
            </div>
            {(style.mi ?? 150) > 300 && (
              <p className={clsx('text-xs', theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600')}>
                ⚠️ {style.mi} ชิ้น — physics หนัก อาจ lag บน PC ทั่วไป แนะนำ ≤ 300
              </p>
            )}
          </div>

        </div>
      )}

      {/* ── Skin Selector (chat + pinchat เท่านั้น) ── */}
      {(widgetId === 'chat' || widgetId === 'pinchat') && (
        <div className="space-y-2 pt-1">
          {/* Header + active skin badge */}
          <div className={row}>
            <span className={clsx('text-xs font-semibold', theme === 'dark' ? 'text-pink-400' : 'text-pink-600')}>
              ✨ Overlay Skin
            </span>
            {(style.skin || '') !== ''
              ? <button onClick={() => set('skin', '')} className="text-xs text-gray-500 hover:text-brand-400 transition">↩ ปิด</button>
              : <span className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>ไม่ใช้ skin</span>
            }
          </div>

          {/* Grid 2 columns — cool + cute รวมกัน */}
          <div className="grid grid-cols-2 gap-1">

            {/* ปิด skin */}
            <button
              onClick={() => set('skin', '')}
              className={clsx(
                'col-span-2 py-1.5 px-2 rounded-lg text-xs font-medium transition border flex items-center gap-1.5',
                (style.skin || '') === ''
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
              )}
            >
              🚫 <span>ไม่ใช้ Skin</span>
            </button>

            {/* หัวข้อ Cool */}
            <div className={clsx('col-span-2 text-xs pt-0.5', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              ⚡ Cool
            </div>

            {SKIN_LIST.filter(s => s.category === 'cool').map(skin => {
              const isActive = (style.skin || '') === skin.id;
              return (
                <button
                  key={skin.id}
                  onClick={() => set('skin', skin.id)}
                  title={skin.label}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 overflow-hidden',
                    isActive
                      ? 'border-brand-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  )}
                  style={isActive ? { background: `linear-gradient(135deg,${skin.preview.from} 0%,${skin.preview.to} 100%)` } : {}}
                >
                  <span>{skin.emoji}</span>
                  <span className="truncate">{skin.label}</span>
                  {isActive && <span className="ml-auto flex-shrink-0 opacity-80">✓</span>}
                </button>
              );
            })}

            {/* หัวข้อ Cute */}
            <div className={clsx('col-span-2 text-xs pt-0.5', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              🌸 Cute
            </div>

            {SKIN_LIST.filter(s => s.category === 'cute').map(skin => {
              const isActive = (style.skin || '') === skin.id;
              return (
                <button
                  key={skin.id}
                  onClick={() => set('skin', skin.id)}
                  title={skin.label}
                  className={clsx(
                    'py-1.5 px-2 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 overflow-hidden',
                    isActive
                      ? 'border-brand-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                  )}
                  style={isActive ? { background: `linear-gradient(135deg,${skin.preview.from} 0%,${skin.preview.to} 100%)` } : {}}
                >
                  <span>{skin.emoji}</span>
                  <span className="truncate">{skin.label}</span>
                  {isActive && <span className="ml-auto flex-shrink-0 opacity-80">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3D Transform (chat + pinchat เท่านั้น) ── */}
      {(widgetId === 'chat' || widgetId === 'pinchat') && (
        <div className="space-y-3 pt-1">
          {/* Section header */}
          <div className={row}>
            <span className={clsx('text-xs font-semibold', theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
              🎲 3D Perspective
            </span>
            {(style.rx || style.ry || style.rz) ? (
              <button
                onClick={() => onChange({ ...style, rx: 0, ry: 0, rz: 0 })}
                className="text-xs text-gray-500 hover:text-brand-400 transition"
                title="รีเซ็ต 3D">
                ↩ รีเซ็ต 3D
              </button>
            ) : (
              <span className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>0° / 0° / 0°</span>
            )}
          </div>

          {/* แกน X — เอียงหน้า/หลัง */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>↕ แกน X (เอียงหน้า-หลัง)</span>
              <span className={clsx('text-xs font-mono font-bold', (style.rx ?? 0) !== 0 ? 'text-purple-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                {style.rx ?? 0}°
              </span>
            </div>
            <input
              type="range" min="-60" max="60" step="1"
              value={style.rx ?? 0}
              onChange={e => set('rx', +e.target.value)}
              className="w-full accent-purple-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>-60° (เอียงมา)</span><span>0°</span><span>+60° (เอียงไป)</span>
            </div>
          </div>

          {/* แกน Y — เอียงซ้าย/ขวา */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>↔ แกน Y (เอียงซ้าย-ขวา)</span>
              <span className={clsx('text-xs font-mono font-bold', (style.ry ?? 0) !== 0 ? 'text-purple-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                {style.ry ?? 0}°
              </span>
            </div>
            <input
              type="range" min="-60" max="60" step="1"
              value={style.ry ?? 0}
              onChange={e => set('ry', +e.target.value)}
              className="w-full accent-purple-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>-60° (ซ้าย)</span><span>0°</span><span>+60° (ขวา)</span>
            </div>
          </div>

          {/* แกน Z — หมุนตามเข็ม/ทวน */}
          <div className="space-y-1">
            <div className={row}>
              <span className={label}>🔄 แกน Z (หมุนแกนหลัก)</span>
              <span className={clsx('text-xs font-mono font-bold', (style.rz ?? 0) !== 0 ? 'text-purple-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                {style.rz ?? 0}°
              </span>
            </div>
            <input
              type="range" min="-30" max="30" step="1"
              value={style.rz ?? 0}
              onChange={e => set('rz', +e.target.value)}
              className="w-full accent-purple-500"
            />
            <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              <span>-30° (ทวน)</span><span>0°</span><span>+30° (ตาม)</span>
            </div>
          </div>

          {/* hint */}
          <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
            💡 เปลี่ยนแปลง real-time ใน OBS ไม่ต้องใช้ plugin 3D Effect
          </p>
        </div>
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
