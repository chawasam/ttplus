// pages/faq.js — คำถามที่พบบ่อย
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import api from '../lib/api';

const OWNER_EMAIL = 'cksamg@gmail.com';

const FAQS = [
  {
    q: '[HTTP-400] No active connection. Please refresh.',
    a: 'เกิดจาก connection ระหว่าง browser กับ server ขาดชั่วคราว (เช่น tab ทิ้งไว้นาน หรือ server restart) วิธีแก้: กด Ctrl+Shift+R เพื่อ refresh หน้าเว็บ รอ 5 วินาที แล้วกด Connect ใหม่ ถ้ายังขึ้นซ้ำให้ refresh อีกครั้ง ปัญหานี้จะหายเองและไม่ได้หมายความว่า account มีปัญหา',
    tag: 'เชื่อมต่อ',
  },
  {
    q: 'Login Google ไม่สำเร็จ / Login ไม่สำเร็จ กรุณาลองใหม่',
    a: 'ลองใช้ browser อื่น (Chrome แนะนำ) หรือปิด extension ที่อาจบล็อก popup ก่อน ถ้า browser ถาม Allow Popup ให้กดอนุญาต แล้วลอง login ใหม่',
    tag: 'Login',
  },
  {
    q: 'Widget ไม่แสดงผลใน OBS',
    a: 'เช็คว่า URL ที่ copy มาจากหน้า Widgets ถูกต้อง → วางใน OBS Browser Source → ตั้ง Width: 600, Height: 600 (สำหรับ Coin Jar) กด Refresh ใน OBS หลังวาง URL',
    tag: 'Widget',
  },
  {
    q: 'Widget แสดงอยู่ แต่ไม่อัปเดต real-time',
    a: 'กด Refresh ใน OBS Browser Source และตรวจว่ากด Connect TikTok ใน Dashboard แล้ว สถานะจะแสดงเป็น "เชื่อมต่อสำเร็จ"',
    tag: 'Widget',
  },
  {
    q: 'TTS ไม่มีเสียง',
    a: 'เข้าหน้า TTS → ตรวจว่าเลือก Engine แล้ว → กดปุ่ม Test ฟังเสียงก่อน ถ้าใช้ Gemini ให้ตรวจว่าใส่ API Key ถูกต้องในหน้า Settings',
    tag: 'TTS',
  },
  {
    q: 'ต้อง refresh ทุกครั้งที่เปิด browser ใหม่ไหม?',
    a: 'ไม่ต้อง — แค่เปิดหน้าเว็บแล้วกด Connect TikTok ใหม่ทุกครั้งที่จะเริ่ม Live เพราะ TikTok session จะ reset เมื่อปิด browser',
    tag: 'ทั่วไป',
  },
  {
    q: 'เชื่อมต่อได้แล้ว แต่ไม่มี event เข้า',
    a: 'ต้อง Live จริงใน TikTok ถึงจะมี event เข้า ถ้าไม่ได้ Live อยู่จะไม่มีข้อมูล gift/chat/follow ส่งมา',
    tag: 'ทั่วไป',
  },
  {
    q: 'Boss Battle ไม่แสดงรูปบอส / โชว์แค่ emoji',
    a: 'ถ้าเลือก preset "Stone Golem" แต่เห็นแค่ emoji ให้ลองกด Refresh ใน OBS เพราะรูปโหลดจาก server อาจใช้เวลาครั้งแรก ตรวจว่า URL ที่ copy มีคำว่า bossframes= อยู่ด้วย ถ้าไม่มีให้กลับไปเลือก preset ใน Customize แล้ว Copy URL ใหม่',
    tag: 'Widget',
  },
  {
    q: 'ของขวัญตกลงมาแต่ HP บอสไม่ลด',
    a: 'ตรวจว่ากด Connect TikTok แล้วและสถานะแสดง "เชื่อมต่อสำเร็จ" ถ้าเชื่อมแล้วแต่ยังไม่ลด ให้กด Refresh OBS แล้วลองส่ง gift อีกครั้ง บางครั้ง socket ขาดช่วงสั้นๆ ตอนเปิด OBS ใหม่',
    tag: 'Widget',
  },
  {
    q: 'Soundboard กดปุ่มแล้วไม่มีเสียง',
    a: 'Browser ต้องการ interaction ก่อนเล่นเสียง — ลองคลิกที่หน้าจอ Soundboard สักครั้งแล้วกดปุ่มใหม่ ถ้ายังไม่ได้ให้ตรวจว่าไฟล์เสียงอัปโหลดถูกปุ่มหรือไม่ (Right-click → Preview เสียง)',
    tag: 'Soundboard',
  },
  {
    q: 'Export Soundboard ได้ไฟล์ใหญ่มาก / ใช้เวลานาน',
    a: 'ไฟล์ export รวมเสียงทุกปุ่มที่อัปโหลดเอง ขนาดขึ้นอยู่กับจำนวนและขนาดไฟล์เสียง ระบบจะแจ้งขนาดก่อนดาวน์โหลดให้กด ยืนยัน ก่อนเสมอ ถ้าไฟล์ใหญ่เกิน 50 MB แนะนำให้ลด bitrate ไฟล์เสียงก่อน export',
    tag: 'Soundboard',
  },
];

const TAG_COLORS = {
  'เชื่อมต่อ': 'bg-red-500/20 text-red-400',
  'Login':     'bg-blue-500/20 text-blue-400',
  'Widget':    'bg-purple-500/20 text-purple-400',
  'TTS':       'bg-green-500/20 text-green-400',
  'Soundboard':'bg-orange-500/20 text-orange-400',
  'ทั่วไป':   'bg-gray-500/20 text-gray-400',
};

export default function FaqPage({ theme, user, activePage, setActivePage }) {
  const isDark  = theme === 'dark';
  const isOwner = user?.email === OWNER_EMAIL;
  const [stats, setStats]       = useState(null);
  const [statsErr, setStatsErr] = useState(false);

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
    const iv = setInterval(fetchStats, 30000); // refresh ทุก 30 วิ
    return () => clearInterval(iv);
  }, [isOwner]);

  return (
    <div className={clsx('flex min-h-screen', isDark ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900')}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 ml-16 md:ml-56 p-4 md:p-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
            ❓ คำถามที่พบบ่อย
          </h1>
          <p className={clsx('mt-1 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
            ปัญหาที่เจอบ่อยและวิธีแก้ไข
          </p>
        </div>

        {/* ===== Owner-only stats ===== */}
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
                  { label: '📦 Registered',     value: stats.registered,   sub: 'user ทั้งหมด'       },
                ].map(({ label, value, sub }) => (
                  <div key={label} className={clsx('rounded-lg p-3 text-center border', isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
                    <p className={clsx('text-xs mb-1', isDark ? 'text-gray-400' : 'text-gray-500')}>{label}</p>
                    <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>{value ?? '—'}</p>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-600' : 'text-gray-400')}>{sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAQ list */}
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div
              key={i}
              className={clsx(
                'rounded-xl border p-4 md:p-5',
                isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
              )}
            >
              <div className="flex items-start gap-3">
                <span className={clsx('mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', TAG_COLORS[item.tag] || TAG_COLORS['ทั่วไป'])}>
                  {item.tag}
                </span>
                <div className="min-w-0">
                  <p className={clsx('font-semibold text-sm mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                    {item.q}
                  </p>
                  <p className={clsx('text-sm leading-relaxed', isDark ? 'text-gray-400' : 'text-gray-600')}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className={clsx('mt-8 text-xs text-center', isDark ? 'text-gray-600' : 'text-gray-400')}>
          ถ้าปัญหายังไม่หาย ติดต่อได้ที่{' '}
          <a href="https://www.tiktok.com/@samsoundcard" target="_blank" rel="noreferrer"
            className="text-brand-400 hover:underline">
            @samsoundcard
          </a>
        </p>
      </main>
    </div>
  );
}
