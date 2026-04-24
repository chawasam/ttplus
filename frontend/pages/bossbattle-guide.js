// pages/bossbattle-guide.js — คู่มือการเล่น Boss Battle
// URL: /bossbattle-guide
import Head from 'next/head';

const ELEMENTS = [
  { emoji: '🔥', label: 'ไฟ',   color: '#f97316', weakTo: '💧 น้ำ', weakToColor: '#38bdf8', resistTo: '🌍 ดิน', gifts: 'Rose, Heart, Fire, Rocket, Star, Lightning' },
  { emoji: '💧', label: 'น้ำ',  color: '#38bdf8', weakTo: '🌪️ ลม', weakToColor: '#34d399', resistTo: '🔥 ไฟ',  gifts: 'Ice, Snow, Fish, Whale, Ocean, Wave, Penguin' },
  { emoji: '🌍', label: 'ดิน', color: '#ca8a04', weakTo: '🔥 ไฟ', weakToColor: '#f97316', resistTo: '🌪️ ลม',  gifts: 'Panda, Bear, Lion, Diamond, Crown, Gold' },
  { emoji: '🌪️', label: 'ลม',  color: '#34d399', weakTo: '🌍 ดิน', weakToColor: '#ca8a04', resistTo: '💧 น้ำ', gifts: 'Butterfly, Bird, Balloon, Cloud, Flower, Fairy' },
  { emoji: '⚪', label: 'กลาง', color: '#94a3b8', weakTo: '—',     weakToColor: '#64748b', resistTo: '—',      gifts: 'TikTok, Like, และของขวัญที่ไม่อยู่ในธาตุอื่น' },
];

export default function BossBattleGuide() {
  return (
    <>
      <Head>
        <title>Boss Battle — คู่มือการเล่น | TTplus</title>
      </Head>
      <div style={{
        minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
        fontFamily: '"Segoe UI", Arial, sans-serif', padding: '32px 16px',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* Header */}
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 24px rgba(251,191,36,0.5)', marginBottom: '4px' }}>
            👾 Boss Battle
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
            คู่มือการเล่น — ระบบธาตุ 5 ธาตุ
          </p>

          {/* Quick summary */}
          <section style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '14px' }}>🎮 วิธีเล่น (สรุปสั้น)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: '🎁', title: 'ส่งของขวัญ', desc: 'ส่งของขวัญผ่าน TikTok Live — ทำดาเมจ boss ตามจำนวน coin' },
                { icon: '🔥', title: 'ถูกธาตุ = ×2', desc: 'ส่งของขวัญธาตุที่ boss แพ้ → ดาเมจ ×2 พร้อม flash สีธาตุ' },
                { icon: '💚', title: 'ผิดธาตุ = HEAL', desc: 'ส่งธาตุที่ boss แข็งแกร่ง → boss ฟื้น HP แทน! ระวัง!' },
                { icon: '🔁', title: 'Combo Streak', desc: 'ส่งถูกธาตุ 3 ครั้งติด → bonus ×1.5 เพิ่ม! สร้างความร่วมมือ' },
                { icon: '❤️', title: 'Tap = Damage', desc: 'กด❤️ใน Live → สะสมครบ X ครั้ง = 1 dmg (streamer ตั้งได้)' },
                { icon: '🏆', title: 'ล้าง Boss', desc: 'ทุกคนช่วยกันลด HP จนถึง 0 → YOU WIN! boss ระเบิด' },
              ].map(item => (
                <div key={item.title} style={{ background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginBottom: '3px' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Element weakness chart */}
          <section style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>⚙️ วงจรธาตุ</h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              ไฟ &gt; ดิน &gt; ลม &gt; น้ำ &gt; ไฟ  (ลูกศร = ชนะ/แพ้ทาง)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ELEMENTS.map(el => (
                <div key={el.label} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#0f172a', borderRadius: '10px', padding: '12px 14px',
                  border: `1px solid ${el.color}33`,
                }}>
                  {/* Element */}
                  <div style={{ width: '52px', flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', lineHeight: 1, filter: `drop-shadow(0 0 6px ${el.color}88)` }}>{el.emoji}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: el.color, marginTop: '2px' }}>{el.label}</div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#14532d', color: '#4ade80', fontWeight: 700 }}>
                        แพ้ทาง: {el.weakTo}
                      </span>
                      {el.resistTo !== '—' && (
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#4c1d1d', color: '#f87171', fontWeight: 700 }}>
                          ทน: {el.resistTo}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>ของขวัญ: </span>{el.gifts}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Damage multiplier */}
          <section style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '14px' }}>⚔️ ตัวคูณดาเมจ</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: '11px', fontWeight: 600 }}>สถานการณ์</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#64748b', fontSize: '11px', fontWeight: 600 }}>ผล</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: '11px', fontWeight: 600 }}>ตัวอย่าง</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { situation: '🎯 ถูกธาตุ', result: '×2 DMG', resultColor: '#4ade80', bg: '#14532d', example: 'บอสไฟ + ส่ง💧น้ำ' },
                  { situation: '⚪ กลาง/ไม่ตรง', result: '×1 DMG', resultColor: '#93c5fd', bg: '#1e3a5f', example: 'ทุกบอส + ส่งกลาง' },
                  { situation: '❌ ผิดธาตุ', result: 'HEAL +50%', resultColor: '#f87171', bg: '#4c1d1d', example: 'บอสไฟ + ส่ง🌍ดิน' },
                  { situation: '🔥 Streak ×3+', result: '×3 DMG', resultColor: '#fbbf24', bg: '#451a03', example: 'ส่งถูกธาตุ 3 ติดกัน' },
                ].map(row => (
                  <tr key={row.situation} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px', color: '#cbd5e1' }}>{row.situation}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: row.bg, color: row.resultColor }}>
                        {row.result}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: '#64748b', fontSize: '11px' }}>{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Gift → Element guide */}
          <section style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>🎁 ของขวัญ → ธาตุ</h2>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>ระบบจะอ่านชื่อของขวัญ TikTok อัตโนมัติ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ELEMENTS.filter(el => el.label !== 'กลาง').map(el => (
                <div key={el.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '60px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: el.color }}>
                    {el.emoji} {el.label}
                  </div>
                  <div style={{ flex: 1, fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>{el.gifts}</div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '60px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: '#64748b' }}>⚪ กลาง</div>
                <div style={{ flex: 1, fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>ของขวัญอื่นที่ระบบไม่รู้จัก → ดาเมจ ×1 ปกติ</div>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section style={{ background: '#1e293b', borderRadius: '14px', padding: '20px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>💡 Tips สำหรับ Streamer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                '📢 บอกผู้ชมธาตุของ Boss และของขวัญที่ถูกธาตุก่อนเริ่ม',
                '🎭 เปิด "ซ่อนธาตุ" เพื่อสร้าง tension — ผู้ชมเดาธาตุกันก่อน reveal ที่ HP 75%',
                '💡 ตั้ง HP ให้สมดุลกับ viewer — 500-2000 สำหรับ viewer 50-200 คน',
                '🔢 dmgmult = 1 คือ 1 coin = 1 dmg, ปรับเป็น 0.1-0.5 ถ้า boss หมด HP ไวเกิน',
                '❤️ เปิด Like Damage เพื่อให้คนที่ไม่มีเงินส่งของขวัญยังช่วยได้',
                '🔁 Respawn Mode ดีสำหรับ long stream — HP ×1.5 ทุกรอบ ยากขึ้นเรื่อยๆ',
              ].map((tip, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, paddingLeft: '4px' }}>
                  {tip}
                </div>
              ))}
            </div>
          </section>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#334155' }}>
            TTplus — Boss Battle Guide
          </div>
        </div>
      </div>
    </>
  );
}
