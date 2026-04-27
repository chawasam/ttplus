// pages/bossbattle-guide.js — คู่มือระบบธาตุ Boss Battle
import { useState } from 'react';
import Head from 'next/head';
import clsx from 'clsx';
import { ELEMENTS, BEATS, GIFT_KEYWORDS, EXAMPLE_GIFTS } from '../lib/bossbattleData';

export default function BossBattleGuide() {
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState('');

  const isDark = dark;
  const bg   = isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';

  const searchResult = search.trim()
    ? (() => {
        const q = search.trim().toLowerCase();
        for (const [elem, kws] of Object.entries(GIFT_KEYWORDS)) {
          if (kws.some(k => k.includes(q) || q.includes(k))) return elem;
        }
        return 'neutral';
      })()
    : null;

  return (
    <>
      <Head>
        <title>Boss Battle — คู่มือระบบธาตุ | TTplus</title>
        <meta name="description" content="ตารางธาตุของขวัญ TikTok Boss Battle" />
      </Head>

      <div className={clsx('min-h-screen', bg)}>

        {/* Header */}
        <div className={clsx('sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between',
          isDark ? 'bg-gray-950/90 border-gray-800 backdrop-blur' : 'bg-white/90 border-gray-200 backdrop-blur')}>
          <div className="flex items-center gap-3">
            <a href="/widgets" className={clsx('text-sm px-3 py-1.5 rounded-lg border transition',
              isDark ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-200 text-gray-500 hover:text-gray-900')}>
              ← Widgets
            </a>
            <h1 className="font-bold text-base">👾 คู่มือระบบธาตุ Boss Battle</h1>
          </div>
          <button onClick={() => setDark(!dark)} className="p-2 rounded-lg text-gray-400 text-lg">
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Search */}
          <div className={clsx('rounded-xl border p-4', card)}>
            <p className={clsx('text-xs font-semibold mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>
              🔍 เช็คธาตุของขวัญ — พิมพ์ชื่อของขวัญ (ภาษาอังกฤษ)
            </p>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="เช่น  Rose,  Panda,  Ice,  Butterfly..."
              className={clsx('w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-orange-500 transition',
                isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400')}
            />
            {search.trim() && (
              <div className="mt-3 flex items-center gap-3 px-1">
                {searchResult !== 'neutral' ? (
                  <>
                    <span className="text-3xl">{ELEMENTS[searchResult].emoji}</span>
                    <div>
                      <p className="font-bold" style={{ color: ELEMENTS[searchResult].color }}>
                        ธาตุ{ELEMENTS[searchResult].label}
                      </p>
                      <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        ⚡ ชนะ {ELEMENTS[BEATS[searchResult]].emoji} {ELEMENTS[BEATS[searchResult]].label}
                        {' · '}
                        {(() => {
                          const weak = Object.entries(BEATS).find(([, v]) => v === searchResult)?.[0];
                          return weak ? `💚 แพ้ ${ELEMENTS[weak].emoji} ${ELEMENTS[weak].label}` : '';
                        })()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">⚪</span>
                    <p className={clsx('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      ไม่พบ keyword — ถือว่าเป็น{' '}
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>ธาตุกลาง</strong>
                      {' '}(dmg ×1)
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* วงจรธาตุ */}
          <div className={clsx('rounded-xl border p-4', card)}>
            <p className={clsx('text-xs font-bold mb-3 tracking-wide uppercase', isDark ? 'text-gray-400' : 'text-gray-500')}>
              ⚗️ วงจรธาตุ
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(BEATS).map(([atk, def]) => {
                const atkEl  = ELEMENTS[atk];
                const defEl  = ELEMENTS[def];
                const weakKey = Object.entries(BEATS).find(([, v]) => v === atk)?.[0];
                const weakEl  = weakKey ? ELEMENTS[weakKey] : null;
                return (
                  <div key={atk} className="rounded-xl p-3 border" style={{ background: atkEl.bg, borderColor: atkEl.border }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{atkEl.emoji}</span>
                      <span className="font-bold text-sm" style={{ color: atkEl.color }}>ธาตุ{atkEl.label}</span>
                    </div>
                    <p className={clsx('text-xs mb-0.5', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      ⚡ ชนะ {defEl.emoji} {defEl.label}
                      {' '}<span className="font-bold text-yellow-400">×2 dmg</span>
                    </p>
                    {weakEl && (
                      <p className={clsx('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        💚 แพ้ {weakEl.emoji} {weakEl.label} → heal boss
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={clsx('mt-3 rounded-lg px-3 py-2 text-xs flex items-center gap-2',
              isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')}>
              <span>⚪</span>
              <span>
                <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>ธาตุกลาง</strong>
                {' '}— ของขวัญที่ไม่มี keyword → dmg ×1 ไม่มี bonus ไม่ heal boss
              </span>
            </div>
          </div>

          {/* ตารางของขวัญแต่ละธาตุ */}
          {Object.entries(GIFT_KEYWORDS).map(([elem, kws]) => {
            const el      = ELEMENTS[elem];
            const examples = EXAMPLE_GIFTS[elem];
            const beatEl  = ELEMENTS[BEATS[elem]];
            const weakKey = Object.entries(BEATS).find(([, v]) => v === elem)?.[0];
            const weakEl  = weakKey ? ELEMENTS[weakKey] : null;
            return (
              <div key={elem} className={clsx('rounded-xl border overflow-hidden', card)}>
                {/* Section header */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: el.bg, borderBottom: `1px solid ${el.border}` }}>
                  <span className="text-2xl">{el.emoji}</span>
                  <div>
                    <p className="font-bold" style={{ color: el.color }}>ธาตุ{el.label}</p>
                    <p className={clsx('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      ⚡ ชนะ {beatEl.emoji} {beatEl.label}
                      {weakEl && <> · 💚 แพ้ {weakEl.emoji} {weakEl.label}</>}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* ตัวอย่างของขวัญ */}
                  <div>
                    <p className={clsx('text-xs font-semibold mb-1.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      ตัวอย่างของขวัญ
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {examples.map(g => (
                        <span key={g} className={clsx('text-xs px-2 py-1 rounded-lg border',
                          isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600')}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <p className={clsx('text-xs font-semibold mb-1.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      Keywords ที่ระบบจับ (ชื่อของขวัญมีคำเหล่านี้ = ธาตุ{el.label})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {kws.map(k => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{ background: el.bg, color: el.color, border: `1px solid ${el.border}` }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bonus systems */}
          <div className={clsx('rounded-xl border p-4 space-y-3', card)}>
            <p className={clsx('text-xs font-bold tracking-wide uppercase', isDark ? 'text-gray-400' : 'text-gray-500')}>
              🎮 Bonus Systems
            </p>
            <div className={clsx('rounded-lg p-3 text-xs border',
              isDark ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800')}>
              <p className="font-bold mb-1">🔥 Streak Bonus</p>
              <p>ส่งธาตุที่ชนะบอส <strong>3 ครั้งติดกัน</strong> → <strong>×3 dmg</strong> (streak ×1.5 เพิ่มเติม)</p>
              <p className="mt-1 opacity-75">ส่งธาตุต่างกัน หรือส่งผิดธาตุ → streak reset</p>
            </div>
            <div className={clsx('rounded-lg p-3 text-xs border',
              isDark ? 'bg-pink-500/10 border-pink-500/25 text-pink-200' : 'bg-pink-50 border-pink-200 text-pink-800')}>
              <p className="font-bold mb-1">❤️ Like → Damage</p>
              <p>ตั้ง <strong>taprate</strong> (ทุกกี่ like ทำ dmg 1 ครั้ง) + <strong>tapdmg</strong> (dmg ต่อครั้ง) ใน Config</p>
              <p className="mt-1 opacity-75">taprate = 0 = ปิดระบบ Like damage</p>
            </div>
          </div>

          <p className={clsx('text-center text-xs pb-6', isDark ? 'text-gray-700' : 'text-gray-400')}>
            TTplus Boss Battle · ttsam.app
          </p>

        </div>
      </div>
    </>
  );
}
