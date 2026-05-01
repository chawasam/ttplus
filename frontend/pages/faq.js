// pages/faq.js — คำถามที่พบบ่อย
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import api from '../lib/api';

const OWNER_EMAIL = 'cksamg@gmail.com';

// ─── FAQ items ────────────────────────────────────────────────────────────────
// type: 'faq'   → Q&A ธรรมดา
// type: 'guide' → มี iframe embed (guideUrl)
const FAQS = [
  // ── คู่มือ (Interactive Guides) ──
  {
    type: 'guide',
    tag: 'คู่มือ',
    q: 'วิธีเพิ่ม Widget ใน TikTok LIVE Studio / OBS',
    a: 'คู่มือแบบ step-by-step — เลือกโปรแกรมที่คุณใช้แล้วทำตามขั้นตอน',
    guideUrl: '/widget/widget-obs-guide.html',
  },
  {
    type: 'guide',
    tag: 'คู่มือ',
    q: 'วิธีตั้งค่า OBS WebSocket Server',
    a: 'จำเป็นสำหรับ Actions — ให้ TTplus สั่ง OBS เปลี่ยน Scene หรือเปิด/ปิด Source ได้',
    guideUrl: '/widget/obs-websocket-guide.html',
  },
  {
    type: 'guide',
    tag: 'คู่มือ',
    q: 'วิธีตั้งค่า Actions + Events ครบ loop',
    a: 'สร้าง Action (จะทำอะไร) → สร้าง Event (เมื่อไหร่จะทำ) → ผูกกัน → ทดสอบ',
    guideUrl: '/widget/actions-guide.html',
  },
  // ── การตั้งค่า ──
  {
    type: 'guide',
    tag: 'การตั้งค่า',
    q: 'วิธีสร้าง Google Cloud TTS API Key',
    a: 'ทำตามขั้นตอนด้านล่างเพื่อสร้าง API Key สำหรับ Google Cloud Text-to-Speech',
    guideUrl: '/widget/gcloud-tts-guide.html',
  },
  {
    type: 'faq',
    tag: 'การตั้งค่า',
    q: 'วิธีเชื่อมต่อ TikTok Live',
    a: 'เปิดหน้า Dashboard → กด "Connect TikTok" → ใส่ TikTok Username ของคุณ → กด Connect รอสักครู่จนสถานะเปลี่ยนเป็น "เชื่อมต่อสำเร็จ" แล้วเริ่ม Live ได้เลย ต้อง Connect ใหม่ทุกครั้งที่จะเริ่ม Live',
  },
  {
    type: 'faq',
    tag: 'การตั้งค่า',
    q: 'Google Cloud TTS กับ Gemini TTS ต่างกันยังไง?',
    a: 'Google Cloud TTS — เสียงคุณภาพสูง (WaveNet/Neural2) เหมาะ production, ใช้ API Key จาก Google Cloud Console, มี free tier 1 ล้านตัวอักษร/เดือน\n\nGemini TTS — เสียง AI สมัยใหม่ เป็นธรรมชาติมากขึ้น, ใช้ Gemini API Key ตรงๆ ไม่ต้องตั้ง GCP Project',
  },

  // ── เชื่อมต่อ ──
  {
    type: 'faq',
    tag: 'เชื่อมต่อ',
    q: '[HTTP-400] No active connection. Please refresh.',
    a: 'Connection ระหว่าง browser กับ server ขาดชั่วคราว เช่น tab ทิ้งไว้นานหรือ server restart\n\nวิธีแก้: กด Ctrl+Shift+R refresh หน้าเว็บ รอ 5 วินาที แล้วกด Connect ใหม่ ปัญหานี้จะหายเองและไม่ได้หมายความว่า account มีปัญหา',
  },
  {
    type: 'faq',
    tag: 'เชื่อมต่อ',
    q: 'เชื่อมต่อได้แล้ว แต่ไม่มี event เข้าเลย',
    a: 'TikTok event (gift, chat, follow) จะส่งมาเฉพาะตอนที่ Live อยู่เท่านั้น ถ้าไม่ได้ Live จะไม่มีข้อมูลเข้า ลองเริ่ม Live แล้ว Connect ใหม่อีกครั้ง',
  },
  {
    type: 'faq',
    tag: 'เชื่อมต่อ',
    q: 'ต้อง refresh ทุกครั้งที่เปิด browser ใหม่ไหม?',
    a: 'ไม่ต้อง — แค่เปิดหน้าเว็บแล้วกด Connect TikTok ใหม่ทุกครั้งที่จะเริ่ม Live เพราะ TikTok session จะ reset เมื่อปิด browser',
  },

  // ── Login ──
  {
    type: 'faq',
    tag: 'Login',
    q: 'Login Google ไม่สำเร็จ / หน้าต่าง Login ไม่ขึ้น',
    a: 'ลองใช้ Chrome (แนะนำ) หรือปิด extension ที่อาจบล็อก popup เช่น ad blocker\n\nถ้า browser ถาม "Allow Popup" ให้กดอนุญาต แล้วลอง Login ใหม่ หรือลอง Incognito mode',
  },

  // ── Widget/OBS ──
  {
    type: 'faq',
    tag: 'Widget',
    q: 'วิธีเพิ่ม Widget ใน OBS',
    a: 'ไปหน้า Widgets → เลือก Widget ที่ต้องการ → กด Customize แล้ว Copy URL\n\nใน OBS: Scene → Sources → + → Browser Source → วาง URL → ตั้งขนาด Width/Height ตามที่แนะนำในหน้า Widget → กด OK',
  },
  {
    type: 'faq',
    tag: 'Widget',
    q: 'Widget ไม่แสดงผลใน OBS / เป็น URL เปล่า',
    a: 'ตรวจว่า URL ที่ copy มาจากหน้า Widgets ถูกต้อง ต้องมี ?cid=... ต่อท้าย\n\nกด Refresh ใน OBS Browser Source แล้วรอสักครู่ ถ้ายังไม่แสดงให้กด Ctrl+Shift+R ใน OBS Browser Source properties',
  },
  {
    type: 'faq',
    tag: 'Widget',
    q: 'Widget แสดงอยู่แต่ไม่อัปเดต real-time',
    a: 'ตรวจว่ากด Connect TikTok ใน Dashboard แล้ว สถานะต้องแสดง "เชื่อมต่อสำเร็จ"\n\nถ้ายังไม่อัปเดต ให้กด Refresh ใน OBS Browser Source แล้ว Connect ใหม่อีกครั้ง',
  },
  {
    type: 'faq',
    tag: 'Widget',
    q: 'คีย์ลัด PK Widget ใช้ยังไง / คีย์กดแล้วไม่ทำงาน',
    a: 'ไปหน้า PK → ตรวจว่าสวิตช์ "คีย์ลัด" เปิดอยู่ (ไม่มีขีดทับ)\n\nหน้าต่างที่ Active ต้องเป็น browser ที่เปิด TTplus อยู่ ถ้าโฟกัสอยู่ที่ OBS หรือแอปอื่น คีย์ลัดจะไม่ทำงาน',
  },

  // ── TTS ──
  {
    type: 'faq',
    tag: 'TTS',
    q: 'TTS ไม่มีเสียงออก',
    a: 'ตรวจลำดับนี้:\n1. หน้า TTS → ตรวจว่าเลือก Engine แล้ว\n2. กดปุ่ม Test เพื่อฟังเสียงก่อน\n3. ถ้าใช้ Google Cloud TTS → ตรวจว่าใส่ API Key ถูกต้องใน Settings และ Enable API แล้ว\n4. ตรวจ Volume ของ OBS Browser Source ไม่ได้ปิดอยู่',
  },

  // ── Actions ──
  {
    type: 'faq',
    tag: 'Actions',
    q: 'Actions คืออะไร / วิธีให้ OBS เปลี่ยน Scene อัตโนมัติ',
    a: 'Actions คือคำสั่งที่ทำงานอัตโนมัติเมื่อมี TikTok event เช่น gift หรือ follow\n\nวิธีตั้ง: ไปหน้า Actions → สร้าง Action ใหม่ → เลือก Type "OBS Scene" → ใส่ชื่อ Scene → สร้าง Event ผูกกับ Action นั้น → เลือก Trigger (เช่น gift ขั้นต่ำ 10 coins)\n\nต้องเปิด OBS WebSocket Server ที่ port 4455 ด้วย',
  },
  {
    type: 'faq',
    tag: 'Actions',
    q: 'Action ตั้งแล้วแต่ไม่ทำงาน / OBS ไม่เปลี่ยน Scene',
    a: 'เช็ค 4 จุด:\n1. สวิตช์ Actions (master switch) ต้องเปิดอยู่ในหน้า Actions\n2. OBS WebSocket Server เปิดที่ port 4455 (Tools → WebSocket Server Settings)\n3. Dashboard เปิดอยู่และ Connect TikTok แล้ว\n4. Cooldown ยังไม่หมด — แต่ละ Action มี cooldown เพื่อกันยิงถี่เกินไป',
  },

  // ── Soundboard ──
  {
    type: 'faq',
    tag: 'Soundboard',
    q: 'Soundboard กดปุ่มแล้วไม่มีเสียง',
    a: 'Browser ต้องการ interaction ก่อนเล่นเสียง — คลิกที่หน้าจอ Soundboard สักครั้งแล้วกดปุ่มใหม่\n\nถ้ายังไม่ได้ ตรวจว่าไฟล์เสียงอัปโหลดถูกปุ่มหรือไม่ (Right-click ที่ปุ่ม → Preview เสียง)',
  },
];

// ─── Tag colors ───────────────────────────────────────────────────────────────
const TAG_COLORS = {
  'คู่มือ':     'bg-violet-500/20 text-violet-400',
  'การตั้งค่า': 'bg-blue-500/20 text-blue-400',
  'เชื่อมต่อ':  'bg-red-500/20 text-red-400',
  'Login':      'bg-indigo-500/20 text-indigo-400',
  'Widget':     'bg-purple-500/20 text-purple-400',
  'TTS':        'bg-green-500/20 text-green-400',
  'Actions':    'bg-yellow-500/20 text-yellow-400',
  'Soundboard': 'bg-orange-500/20 text-orange-400',
};

// ─── Tag order for filter bar ─────────────────────────────────────────────────
const ALL_TAGS = ['ทั้งหมด', 'คู่มือ', 'การตั้งค่า', 'เชื่อมต่อ', 'Login', 'Widget', 'TTS', 'Actions', 'Soundboard'];

// ─── Single FAQ item ──────────────────────────────────────────────────────────
function FaqItem({ item, isDark, defaultOpen }) {
  const [open, setOpen]         = useState(defaultOpen || false);
  const [guideLoaded, setLoaded] = useState(false);

  const tagCls = TAG_COLORS[item.tag] || 'bg-gray-500/20 text-gray-400';

  // Multi-line answer: convert \n to <br/>
  const answerLines = (item.a || '').split('\n');

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden transition-all',
        isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#fff5fb] border-pink-200 shadow-sm',
        open && item.type === 'guide' && 'ring-1 ring-blue-500/30'
      )}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start gap-3 p-4 md:p-5"
      >
        <span className={clsx('mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap', tagCls)}>
          {item.tag}
        </span>
        <span className={clsx('flex-1 font-semibold text-sm', isDark ? 'text-white' : 'text-gray-900')}>
          {item.type === 'guide' && (
            <span className="inline-flex items-center gap-1 text-blue-400 text-xs font-normal mr-2 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
              📖 คู่มือ
            </span>
          )}
          {item.q}
        </span>
        <span className={clsx('text-xs mt-0.5 flex-shrink-0', isDark ? 'text-gray-600' : 'text-gray-400')}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className={clsx('border-t px-4 md:px-5 pb-4 pt-3', isDark ? 'border-gray-800' : 'border-gray-100')}>
          {/* Short description */}
          <div className={clsx('text-sm leading-relaxed mb-3', isDark ? 'text-gray-400' : 'text-gray-600')}>
            {answerLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < answerLines.length - 1 && <br />}
              </span>
            ))}
          </div>

          {/* Guide embed */}
          {item.type === 'guide' && item.guideUrl && (
            <div className={clsx('rounded-xl overflow-hidden border', isDark ? 'border-gray-700' : 'border-gray-200')}>
              {!guideLoaded && (
                <div className={clsx('flex items-center justify-center py-8 text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>
                  กำลังโหลด คู่มือ...
                </div>
              )}
              <iframe
                src={item.guideUrl}
                title={item.q}
                onLoad={() => setLoaded(true)}
                style={{
                  width: '100%',
                  height: guideLoaded ? 540 : 0,
                  border: 'none',
                  display: 'block',
                  borderRadius: 12,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FaqPage({ theme, user, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const isDark  = theme === 'dark';
  const isOwner = user?.email === OWNER_EMAIL;

  const [stats, setStats]       = useState(null);
  const [statsErr, setStatsErr] = useState(false);
  const [activeTag, setTag]     = useState('ทั้งหมด');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    if (!isOwner) return;
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/stats');
        setStats(res.data);
        setStatsErr(false);
      } catch { setStatsErr(true); }
    };
    fetchStats();
    const iv = setInterval(fetchStats, 30000);
    return () => clearInterval(iv);
  }, [isOwner]);

  // Filter
  const filtered = FAQS.filter(item => {
    const matchTag    = activeTag === 'ทั้งหมด' || item.tag === activeTag;
    const q           = search.toLowerCase();
    const matchSearch = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    return matchTag && matchSearch;
  });

  return (
    <div className={clsx('flex min-h-screen', isDark ? 'bg-gray-950 text-white' : 'bg-[#fdf0f7] text-gray-900')}>
      <Sidebar
        theme={theme} user={user}
        activePage={activePage} setActivePage={setActivePage}
        collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar}
      />

      <main className={clsx('flex-1 p-4 md:p-8 max-w-3xl', sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-48')}>

        {/* Header */}
        <div className="mb-6">
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            ❓ คำถามที่พบบ่อย
          </h1>
          <p className={clsx('mt-1 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
            ปัญหาที่เจอบ่อยและวิธีแก้ไข
          </p>
        </div>

        {/* Owner stats */}
        {isOwner && (
          <div className={clsx('mb-6 rounded-xl border p-4', isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-gray-50 border-gray-200')}>
            <p className={clsx('text-xs font-semibold mb-3', isDark ? 'text-gray-500' : 'text-gray-400')}>
              🔒 สถิติ (เห็นเฉพาะเจ้าของ)
            </p>
            {statsErr ? (
              <p className="text-xs text-red-400">โหลด stats ไม่ได้ — ลอง refresh</p>
            ) : !stats ? (
              <p className={clsx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>กำลังโหลด...</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🟢 Online ตอนนี้', value: stats.online,       sub: 'dashboard เปิดอยู่' },
                  { label: '🎥 Live sessions',  value: stats.liveSessions, sub: 'เชื่อม TikTok อยู่' },
                  { label: '📦 Registered',     value: stats.registered,   sub: 'user ทั้งหมด' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className={clsx('rounded-lg p-3 text-center border', isDark ? 'bg-gray-800 border-gray-700' : 'bg-[#fff5fb] border-pink-200')}>
                    <p className={clsx('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{label}</p>
                    <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>{value ?? '—'}</p>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-600' : 'text-gray-400')}>{sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="ค้นหาคำถาม..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none',
              isDark
                ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600 focus:border-gray-600'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300'
            )}
          />
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {ALL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setTag(tag)}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-all',
                activeTag === tag
                  ? 'bg-blue-500 text-white'
                  : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {tag}
              {tag !== 'ทั้งหมด' && (
                <span className="ml-1 opacity-60">
                  {FAQS.filter(f => f.tag === tag).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* FAQ list */}
        {filtered.length === 0 ? (
          <div className={clsx('text-center py-16 text-sm', isDark ? 'text-gray-600' : 'text-gray-400')}>
            ไม่พบคำถามที่ตรงกับการค้นหา
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                isDark={isDark}
                defaultOpen={item.type === 'guide' && activeTag === 'การตั้งค่า' && i === 0}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className={clsx('mt-8 text-xs text-center', isDark ? 'text-gray-600' : 'text-gray-400')}>
          ถ้าปัญหายังไม่หาย ติดต่อได้ที่{' '}
          <a
            href="https://www.tiktok.com/@samsoundcard"
            target="_blank" rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            @samsoundcard
          </a>
        </p>
      </main>
    </div>
  );
}
