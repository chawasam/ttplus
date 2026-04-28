// WidgetStyleEditor.js — UI สำหรับปรับแต่ง Widget Appearance
// รับ: styles object, widgetId, theme, onChange callback
import { useState } from 'react';
import clsx from 'clsx';
import { addHash, stripHash, hexAlphaToRgba, WIDGET_DEFAULTS } from '../lib/widgetStyles';
import { SKIN_LIST } from '../lib/chatSkins';

const WIDGET_LABELS = {
  alert:              '🔔 Gift Alert',
  chat:               '💬 Chat Overlay',
  pinchat:            '📌 Pin Chat',
  pinprofile:         '👤 Pin Profile Card',
  leaderboard:        '🏆 Leaderboard',
  goal:               '🎯 Goal Bar',
  viewers:            '👥 Viewer Count',
  coinjar:            '🫙 Coin Jar',
  likesLeaderboard:    '👍 Likes Leaderboard',
  'likes-leaderboard': '👍 Likes Leaderboard',
  giftLeaderboard:     '🎁 Gift Leaderboard',
  'gift-leaderboard':  '🎁 Gift Leaderboard',
  fireworks:          '🎆 Gift Fireworks',
};

export default function WidgetStyleEditor({ widgetId, style: styleProp, onChange, theme }) {
  // ป้องกัน crash ถ้า style ยังไม่มีค่า (ใช้ default แทน)
  const d     = WIDGET_DEFAULTS[widgetId] || WIDGET_DEFAULTS.chat;
  const style = styleProp || d;
  const set   = (key, val) => onChange({ ...style, [key]: val });

  // skin tab: auto-select tab ตาม skin ปัจจุบัน
  const activeSkinCat = SKIN_LIST.find(s => s.id === (style.skin || ''))?.category || 'cool';
  const [skinTab, setSkinTab] = useState(activeSkinCat);

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

          {/* Full-width bubble toggle */}
          <div className="space-y-2">
            <span className={label}>ขนาด Bubble</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 0, icon: '◀▶', text: 'ขนาดตามเนื้อหา' },
                { val: 1, icon: '⬛', text: 'เต็มความกว้าง' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('fullBubble', opt.val)}
                  className={clsx(
                    'py-2 px-2 rounded-lg text-xs font-semibold transition border text-left',
                    (style.fullBubble ?? 0) === opt.val
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

          {/* Page Background (สำหรับ OBS Dock) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={label}>พื้นหลังทั้งหน้า <span className={clsx('text-xs font-normal', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>(OBS Dock)</span></span>
              {style.pagebg && (
                <button onClick={() => set('pagebg', '')}
                  className={clsx('text-xs px-2 py-0.5 rounded border transition',
                    theme === 'dark' ? 'border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-500/40' : 'border-gray-300 text-gray-500 hover:text-red-500')}>
                  ✕ ล้าง (โปร่งใส)
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input type="color"
                value={style.pagebg ? `#${style.pagebg}` : '#1a1a1a'}
                onChange={e => set('pagebg', e.target.value.replace('#', ''))}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                style={{ padding: 2 }}
              />
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'โปร่งใส', val: '',       preview: 'rgba(0,0,0,0)',   border: true },
                  { label: 'เกือบดำ', val: '111111', preview: '#111111' },
                  { label: 'เทาเข้ม', val: '1e1e2e', preview: '#1e1e2e' },
                  { label: 'น้ำเงินเข้ม', val: '0d1117', preview: '#0d1117' },
                ].map(p => (
                  <button key={p.val} onClick={() => set('pagebg', p.val)}
                    title={p.label}
                    className={clsx(
                      'w-8 h-8 rounded-lg border-2 transition',
                      (style.pagebg ?? '') === p.val
                        ? 'border-brand-400 scale-110'
                        : theme === 'dark' ? 'border-gray-600 hover:border-gray-400' : 'border-gray-300 hover:border-gray-500'
                    )}
                    style={{ background: p.preview ?? p.val }}>
                    {p.border && <span className="text-gray-400 text-xs">∅</span>}
                  </button>
                ))}
              </div>
              {style.pagebg && (
                <span className={clsx('text-xs font-mono', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>#{style.pagebg}</span>
              )}
            </div>
            <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              💡 OBS Overlay ใช้โปร่งใส — OBS Dock เลือกสีเข้ม
            </p>
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

          {/* Show sender name toggle */}
          <div className="space-y-2">
            <span className={label}>แสดงชื่อผู้ส่งของขวัญ</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 1, icon: '👤', text: 'แสดงชื่อ' },
                { val: 0, icon: '🙈', text: 'ซ่อนชื่อ' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('showSender', opt.val)}
                  className={clsx(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition border',
                    (style.showSender ?? 1) === opt.val
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

          {/* Show gift name toggle */}
          <div className="space-y-2">
            <span className={label}>แสดงชื่อของขวัญ</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 1, icon: '🎁', text: 'แสดงชื่อ' },
                { val: 0, icon: '🙈', text: 'ซ่อนชื่อ' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('showGiftName', opt.val)}
                  className={clsx(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition border',
                    (style.showGiftName ?? 1) === opt.val
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

          {/* Show gift image toggle */}
          <div className="space-y-2">
            <span className={label}>แสดงรูปของขวัญ (ในโถ + popup)</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 1, icon: '🖼️', text: 'แสดงรูป' },
                { val: 0, icon: '⚫', text: 'ซ่อนรูป' },
              ].map(opt => (
                <button key={opt.val}
                  onClick={() => set('showGiftImage', opt.val)}
                  className={clsx(
                    'py-2 px-3 rounded-lg text-xs font-semibold transition border',
                    (style.showGiftImage ?? 1) === opt.val
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

        </div>
      )}

      {/* ── Skin Selector (chat + pinchat + leaderboards) ── */}
      {(widgetId === 'chat' || widgetId === 'pinchat' ||
        widgetId === 'gift-leaderboard' || widgetId === 'giftLeaderboard' ||
        widgetId === 'likes-leaderboard' || widgetId === 'likesLeaderboard') && (
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

          {/* Active skin badge */}
          {(style.skin || '') !== '' && (() => {
            const cur = SKIN_LIST.find(s => s.id === style.skin);
            return cur ? (
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold border border-brand-500/40"
                style={{ background: `linear-gradient(135deg,${cur.preview.from} 0%,${cur.preview.to} 100%)`, color: '#fff' }}
              >
                <span>{cur.emoji}</span>
                <span className="truncate">{cur.label}</span>
                <span className="ml-auto opacity-70">✓ active</span>
              </div>
            ) : null;
          })()}

          {/* Tab pills */}
          <div className="flex gap-1 flex-wrap">
            {[
              { id: 'none',    label: '🚫 ไม่ใช้' },
              { id: 'cool',    label: '⚡ Cool' },
              { id: 'cute',    label: '🌸 Cute' },
              { id: 'premium', label: '✨ Premium' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSkinTab(tab.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition border',
                  skinTab === tab.id
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {skinTab === 'none' && (
            <button
              onClick={() => set('skin', '')}
              className={clsx(
                'w-full py-2 px-3 rounded-lg text-xs font-semibold transition border flex items-center gap-2',
                (style.skin || '') === ''
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
              )}
            >
              🚫 ไม่ใช้ Skin
              {(style.skin || '') === '' && <span className="ml-auto">✓</span>}
            </button>
          )}

          {(skinTab === 'cool' || skinTab === 'cute') && (
            <div className="grid grid-cols-2 gap-1">
              {SKIN_LIST.filter(s => s.category === skinTab).map(skin => {
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
          )}

          {skinTab === 'premium' && (
            <div
              className={clsx(
                'rounded-xl border overflow-y-auto',
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              )}
              style={{ maxHeight: 220 }}
            >
              <div className="grid grid-cols-3 gap-1 p-1.5">
                {SKIN_LIST.filter(s => s.category === 'premium').map(skin => {
                  const isActive = (style.skin || '') === skin.id;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => set('skin', skin.id)}
                      title={skin.label}
                      className={clsx(
                        'py-1.5 px-1 rounded-lg text-[10px] font-semibold transition border flex flex-col items-center gap-0.5 overflow-hidden',
                        isActive
                          ? 'border-yellow-500 text-white'
                          : theme === 'dark'
                            ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-700/60'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300'
                      )}
                      style={isActive ? { background: `linear-gradient(135deg,${skin.preview.from} 0%,${skin.preview.to} 100%)` } : {}}
                    >
                      <span className="text-base leading-none">{skin.emoji}</span>
                      <span className="truncate w-full text-center leading-tight">{skin.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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

      {/* ── Fireworks: Pattern + Volume ── */}
      {widgetId === 'fireworks' && (
        <div className="space-y-3 pt-1">

          {/* Pattern checkboxes */}
          <div className="space-y-2">
            <div className={clsx('text-xs font-semibold', theme === 'dark' ? 'text-orange-400' : 'text-orange-600')}>
              💥 รูปแบบระเบิด (สุ่มจากที่เลือก)
            </div>
            {[
              { id: 'ring',    label: 'Ring',    desc: 'กระจายรอบวงสม่ำเสมอ' },
              { id: 'willow',  label: 'Willow',  desc: 'พุ่งขึ้นแล้วโค้งตกลงมา' },
              { id: 'scatter', label: 'Scatter', desc: 'สุ่มทิศทางอิสระ' },
              { id: 'star',    label: 'Star',    desc: 'แฉกสลับเร็ว-ช้า' },
              { id: 'fan',     label: 'Fan',     desc: 'พุ่งขึ้นครึ่งวงบน' },
            ].map(p => {
              const active = (style.patterns ?? 'ring,willow,scatter,star,fan').split(',').includes(p.id);
              const toggle = () => {
                const cur  = (style.patterns ?? 'ring,willow,scatter,star,fan').split(',');
                const next = active ? cur.filter(x => x !== p.id) : [...cur, p.id];
                if (next.length === 0) return; // ต้องเลือกอย่างน้อย 1
                set('patterns', next.join(','));
              };
              return (
                <button
                  key={p.id}
                  onClick={toggle}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition border text-left',
                    active
                      ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  <span className={clsx(
                    'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                    active
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : theme === 'dark' ? 'border-gray-600' : 'border-gray-400'
                  )}>
                    {active ? '✓' : ''}
                  </span>
                  <span className="font-semibold">{p.label}</span>
                  <span className={clsx('ml-auto', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>{p.desc}</span>
                </button>
              );
            })}
            <p className={clsx('text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
              💡 ติ๊กหลายอัน = สุ่มสลับทุก explosion
            </p>
          </div>

        </div>
      )}

      {/* ── Fireworks: Particle Count ── */}
      {widgetId === 'fireworks' && (
        <div className="space-y-2 pt-1">
          <div className={clsx('text-xs font-semibold', theme === 'dark' ? 'text-orange-400' : 'text-orange-600')}>
            ✨ จำนวนสะเก็ดพลุ
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 10, label: '10', desc: 'เบา' },
              { val: 20, label: '20', desc: 'ปานกลาง' },
              { val: 30, label: '30', desc: 'หนาแน่น' },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => set('pcount', opt.val)}
                className={clsx(
                  'py-2 px-1 rounded-lg text-xs font-semibold transition border flex flex-col items-center gap-0.5',
                  (style.pcount ?? 10) === opt.val
                    ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                    : theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                )}
              >
                <span className="text-sm font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fireworks: Volume (แยก block) ── */}
      {widgetId === 'fireworks' && (
        <div className="space-y-1 pt-1">
          <div className={clsx('text-xs font-semibold mb-1', theme === 'dark' ? 'text-orange-400' : 'text-orange-600')}>
            🔊 เสียงพลุ
          </div>
          <div className={row}>
            <span className={label}>ระดับเสียง</span>
            <span className={clsx('text-xs font-mono font-bold',
              (style.vol ?? 80) === 0 ? (theme === 'dark' ? 'text-gray-500' : 'text-gray-400') : 'text-orange-400')}>
              {(style.vol ?? 80) === 0 ? '🔇 เงียบ' : `${style.vol ?? 80}%`}
            </span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={style.vol ?? 80}
            onChange={e => set('vol', +e.target.value)}
            className="w-full accent-orange-500"
          />
          <div className={clsx('flex justify-between text-xs', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
            <span>🔇 เงียบ (0)</span><span>🔊 ดังสุด (100)</span>
          </div>
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
