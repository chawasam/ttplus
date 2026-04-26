// pages/ASHENVEIL/story.js — Dedicated Story & Lore page
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getMainQuestLog } from '../../lib/gameApi';
import Head from 'next/head';
import Link from 'next/link';

// ─── Static lore data (mirrors backend/data/lore.js categories) ──────────────
const LORE_CATEGORIES = {
  sealer:  { label: 'ผู้ปิดผนึก',    color: 'text-amber-400',  border: 'border-amber-900',  bg: 'bg-amber-950/20'  },
  seal:    { label: 'ตราผนึก',       color: 'text-green-400',  border: 'border-green-900',  bg: 'bg-green-950/20'  },
  void:    { label: 'Void / Prophet', color: 'text-purple-400', border: 'border-purple-900', bg: 'bg-purple-950/20' },
  vorath:  { label: 'Vorath',         color: 'text-indigo-400', border: 'border-indigo-900', bg: 'bg-indigo-950/20' },
  mystery: { label: 'ความลึกลับ',    color: 'text-rose-400',   border: 'border-rose-900',   bg: 'bg-rose-950/20'   },
};

const ACT_INFO = [
  null,
  { act: 1, title: 'เมืองที่ถูกลืม',    subtitle: 'City Ruins → Darkroot Hollow',  emoji: '🏚️', color: 'border-stone-700', textColor: 'text-stone-300',
    summary: 'ผู้เล่นตื่นขึ้นในซากปรักของ City Ruins ค้นพบร่องรอยของ Void Rift และพบว่าตราผนึกอ่อนแอลงเรื่อยๆ การพบกับ Lyra นำไปสู่การตามหาความจริงที่ซ่อนอยู่ใน Darkroot Hollow',
    npcs: ['Lyra — สาวผู้รอดชีวิตที่ซ่อนความลับ'] },
  { act: 2, title: 'คนตายพูดได้',        subtitle: 'Shadowfell Depths',             emoji: '💀', color: 'border-slate-700',  textColor: 'text-slate-300',
    summary: 'ใน Shadowfell Depths ผู้เล่นพบกับ The Echo — วิญญาณของ Sealer คนที่ 2 ที่ยังคงอยู่เพราะเพลงที่ยังไม่จบ เรื่องราวเปิดเผยว่าผู้ปิดผนึกไม่ได้ "ตาย" แต่ถูกกักขังอยู่ระหว่างโลก',
    npcs: ['The Echo — Sealer คนที่ 2 ที่ไม่ยอมตาย', 'Sythara — ผู้รู้ความลับของ Sealer'] },
  { act: 3, title: 'ตราที่พัง',           subtitle: 'Sunken Crypts + Voidspire Ruins', emoji: '🔮', color: 'border-cyan-800',   textColor: 'text-cyan-300',
    summary: 'ตราผนึกที่ 3 และ 4 กำลังจะพัง ผู้เล่นต้องเผชิญกับ Void Colossus Igrath ที่เป็นกุญแจสำคัญในการเปิดตราโดยไม่ทำลายผู้ปิดผนึก กระจก Void เผยภาพลึกลับของ "R.H."',
    npcs: ['Igrath — Void Colossus ที่รักษาความลับ', 'Corvin — พ่อค้าที่รู้มากกว่าที่บอก'] },
  { act: 4, title: 'ด้านที่มองไม่เห็น', subtitle: 'Void Frontier',                  emoji: '🌑', color: 'border-violet-800',  textColor: 'text-violet-300',
    summary: 'ใน Void Frontier ผู้เล่นค้นพบ Void Memory ของ Vorath เอง — เรื่องราวที่แท้จริง: Vorath ไม่ใช่ผู้ร้าย เขาถูกหลอกให้มาและถูกผนึกโดยกลุ่มนักเวทย์ที่กลัวจะควบคุมเขาไม่ได้',
    npcs: [] },
  { act: 5, title: 'เทพผู้ถูกลืม',       subtitle: 'Vorath Citadel',                emoji: '⚡', color: 'border-indigo-700',  textColor: 'text-indigo-300',
    summary: 'ผู้เล่นเผชิญหน้ากับ Vorath โดยตรง เขาถามว่า "เจ้ามาเพื่อผนึกฉันอีกครั้ง... หรือมาพูดคุย?" การเลือกของผู้เล่นจะกำหนด Ending — ส่ง Vorath กลับบ้าน หรือ ผนึกเขาใหม่',
    npcs: ['Vorath — เทพแห่ง Void ผู้ถูกลืม'] },
];

const NPC_DB = [
  { name: 'Lyra', emoji: '👩', role: 'นักรบผู้รอดชีวิต', zone: 'City Ruins', desc: 'สาวผู้รอดชีวิตจากการโจมตีของ Void Rift คืนนั้น เธอซ่อนความจริงบางอย่างเกี่ยวกับครอบครัวของเธอ — ครอบครัวที่เชื่อมโยงกับผู้ปิดผนึก', color: 'text-rose-400' },
  { name: 'Sythara', emoji: '🧙', role: 'นักเวทย์โบราณ', zone: 'Darkroot Hollow', desc: 'นักเวทย์ที่รู้จัก Sealer ทุกคนเป็นการส่วนตัว เธออยู่มาก่อนพิธีผนึก และยังคงรู้สึกผิดที่ไม่ได้ห้าม', color: 'text-blue-400' },
  { name: 'Corvin', emoji: '🧍', role: 'พ่อค้าลึกลับ', zone: 'Voidspire Ruins', desc: 'พ่อค้าที่ปรากฏตัวในทุก Zone โดยไม่มีคำอธิบาย เขารู้เรื่องราวมากกว่าที่ยอมบอก และชื่อย่อ "R.H." ที่เห็นในกระจก Void นั้น...', color: 'text-green-400' },
  { name: 'The Echo', emoji: '👻', role: 'Sealer คนที่ 2', zone: 'Shadowfell Depths', desc: 'วิญญาณที่ยังคงอยู่ได้เพราะเพลงที่ไม่มีตอนจบ เขาทิ้งโน้ตเพลง Requiem of the Sealed ไว้ในสามส่วน', color: 'text-gray-400' },
  { name: 'Vorath', emoji: '🌑', role: 'เทพแห่ง Void', zone: 'Vorath Citadel', desc: 'ไม่ใช่ผู้ร้าย — แต่เป็นเหยื่อ เขาถูกเรียกมาจาก Void โดยนักเวทย์ที่ต้องการพลังของเขา แล้วถูกผนึกเมื่อควบคุมเขาไม่ได้ เขาเพียงต้องการกลับบ้าน', color: 'text-violet-400' },
];

export default function StoryPage() {
  const router  = useRouter();
  const [tab,   setTab]   = useState('timeline');  // 'timeline' | 'lore' | 'characters'
  const [mq,    setMQ]    = useState(null);         // main quest log from API
  const [loading, setLoading] = useState(true);
  const [loreCat, setLoreCat] = useState('all');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/login'); return; }
      try {
        const { data } = await getMainQuestLog();
        setMQ(data);
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLore = mq?.loreFragments?.filter(f => loreCat === 'all' || f.category === loreCat) || [];

  return (
    <>
      <Head><title>Ashenveil — The Shattered Age | Story & Lore</title></Head>
      <div style={{ fontFamily: "'Courier New', Courier, monospace", background: '#080a0f', minHeight: '100vh', color: '#e2e8f0' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#080a0f 0%,#0a0a20 50%,#080a0f 100%)', borderBottom: '1px solid #1a1a3a', padding: '24px 20px 16px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Link href="/ASHENVEIL/world" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 12 }}>← กลับเกม</Link>
              <span style={{ color: '#4f46e5', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>The Shattered Age</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>📖 Story & Lore</h1>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              {mq ? `Act ${mq.currentAct}/5 · Lore Fragments ${mq.loreFragments?.length || 0}/10` : 'กำลังโหลด...'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #1a1a2e', background: '#080a0f' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 0 }}>
            {[
              { key: 'timeline',    label: '🗺️ Timeline'    },
              { key: 'lore',        label: '📜 Lore Fragments' },
              { key: 'characters',  label: '👥 ตัวละคร'     },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 16px', fontSize: 12, fontWeight: 600,
                color: tab === t.key ? '#a5b4fc' : '#6b7280',
                borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px' }}>
          {loading ? (
            <p style={{ color: '#4b5563', textAlign: 'center', paddingTop: 40 }}>กำลังโหลด...</p>
          ) : (
            <>
              {/* ── TIMELINE TAB ── */}
              {tab === 'timeline' && (
                <div>
                  {/* World overview */}
                  <div style={{ background: '#0d0f18', border: '1px solid #1e2035', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                    <p style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>โลก Ashenveil</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                      500 ปีที่แล้ว กลุ่มนักเวทย์เรียก Vorath — เทพแห่ง Void — มาสู่โลกมนุษย์ เมื่อควบคุมไม่ได้ พวกเขาผนึกเขาไว้โดยใช้วิญญาณของผู้ปิดผนึกทั้งห้าเป็น anchor
                      ตอนนี้ 500 ปีต่อมา ตราผนึกกำลังสั่นสะเทือน — และผู้เล่นคือคนที่ตื่นขึ้นในซากปรักพอดี
                    </p>
                  </div>

                  {/* Act cards */}
                  {ACT_INFO.slice(1).map(act => {
                    const questsInAct = mq?.quests?.filter(q => q.act === act.act) || [];
                    const done = questsInAct.filter(q => q.status === 'completed').length;
                    const isActive = questsInAct.some(q => q.status === 'active');
                    const isLocked = questsInAct.every(q => q.status === 'locked');

                    return (
                      <div key={act.act} style={{
                        border: `1px solid ${isLocked ? '#111' : isActive ? '#4338ca' : '#1a2a1a'}`,
                        borderRadius: 12, marginBottom: 12, overflow: 'hidden',
                        opacity: isLocked ? 0.35 : 1,
                      }}>
                        {/* Act header */}
                        <div style={{
                          background: isActive ? 'rgba(67,56,202,0.15)' : 'rgba(15,17,25,0.8)',
                          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <span style={{ fontSize: 20 }}>{act.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: isActive ? '#a5b4fc' : '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Act {act.act}</span>
                              {isActive && <span style={{ background: '#4338ca', color: '#c7d2fe', fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>กำลังดำเนิน</span>}
                              {done === questsInAct.length && questsInAct.length > 0 && <span style={{ background: '#166534', color: '#86efac', fontSize: 9, padding: '1px 6px', borderRadius: 99 }}>✅ เสร็จแล้ว</span>}
                            </div>
                            <p style={{ color: isActive ? '#e2e8f0' : '#9ca3af', fontSize: 14, fontWeight: 700, margin: '2px 0 0' }}>{act.title}</p>
                            <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{act.subtitle}</p>
                          </div>
                          <span style={{ color: '#374151', fontSize: 12 }}>{done}/{questsInAct.length}</span>
                        </div>
                        {/* Act body */}
                        {!isLocked && (
                          <div style={{ padding: '12px 16px', background: '#09090f' }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7, margin: '0 0 10px' }}>{act.summary}</p>
                            {act.npcs.length > 0 && (
                              <div>
                                <p style={{ color: '#4b5563', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>NPCs ใน Act นี้</p>
                                {act.npcs.map((n, i) => (
                                  <p key={i} style={{ color: '#6b7280', fontSize: 11, margin: '2px 0' }}>• {n}</p>
                                ))}
                              </div>
                            )}
                            {/* Quest list mini */}
                            {questsInAct.length > 0 && (
                              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {questsInAct.map(q => (
                                  <div key={q.id} style={{
                                    background: q.status === 'active' ? 'rgba(67,56,202,0.1)' : 'rgba(15,17,25,0.5)',
                                    border: `1px solid ${q.status === 'active' ? '#3730a3' : '#1f2937'}`,
                                    borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                                  }}>
                                    <span style={{ fontSize: 12 }}>
                                      {q.status === 'completed' ? '✅' : q.status === 'active' ? '▶' : '🔒'}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ color: q.status === 'active' ? '#c7d2fe' : '#6b7280', fontSize: 12, fontWeight: 600, margin: 0 }}>{q.name}</p>
                                      {q.status === 'active' && q.currentStep && (
                                        <p style={{ color: '#4b5563', fontSize: 10, margin: '2px 0 0' }}>{q.currentStep.hint}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Ending teaser */}
                  <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px', marginTop: 8 }}>
                    <p style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Ending (Act 5)</p>
                    {mq?.choiceFlags?.vorath_ending ? (
                      <p style={{ color: '#a5b4fc', fontSize: 13, margin: 0 }}>
                        เจ้าเลือก: {mq.choiceFlags.vorath_ending === 'accord'
                          ? '🌑 ส่ง Vorath กลับ Void — Ending A: The Accord'
                          : '🔒 ผนึก Vorath ใหม่ — Ending B: The Eternal Seal'}
                      </p>
                    ) : (
                      <p style={{ color: '#4b5563', fontSize: 13, margin: 0 }}>
                        เจ้าต้องตัดสินใจ: ส่ง Vorath กลับบ้าน หรือ ผนึกเขาใหม่ตลอดกาล<br/>
                        <span style={{ color: '#374151', fontSize: 11 }}>ทางที่เจ้าเลือกจะกำหนดชะตากรรมของผู้ปิดผนึกทั้งห้า</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── LORE FRAGMENTS TAB ── */}
              {tab === 'lore' && (
                <div>
                  {/* Category filter */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {['all', ...Object.keys(LORE_CATEGORIES)].map(cat => (
                      <button key={cat} onClick={() => setLoreCat(cat)} style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 99,
                        border: `1px solid ${loreCat === cat ? '#6366f1' : '#1f2937'}`,
                        background: loreCat === cat ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: loreCat === cat ? '#a5b4fc' : '#6b7280',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        {cat === 'all' ? `ทั้งหมด (${mq?.loreFragments?.length || 0}/10)` : LORE_CATEGORIES[cat]?.label}
                      </button>
                    ))}
                  </div>

                  {filteredLore.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#374151' }}>
                      <p style={{ fontSize: 32, marginBottom: 8 }}>📜</p>
                      <p style={{ fontSize: 13 }}>{loreCat === 'all' ? 'ยังไม่พบ Lore Fragment' : `ไม่มี fragment ใน category นี้`}</p>
                      <p style={{ fontSize: 11, color: '#1f2937', marginTop: 4 }}>สำรวจโลก · กำจัดบอส · คุยกับ NPC</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredLore.map(frag => {
                        const cat = LORE_CATEGORIES[frag.category] || { label: frag.category, color: 'text-gray-400', border: 'border-gray-800', bg: '' };
                        return (
                          <div key={frag.id} style={{
                            background: '#0d0f18', border: '1px solid #1e2035',
                            borderRadius: 12, padding: '14px 16px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                              <span style={{ fontSize: 20 }}>📜</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: 0 }}>{frag.title}</p>
                                <p style={{ color: '#4b5563', fontSize: 10, margin: '2px 0 0' }}>
                                  #{frag.id} · {cat.label} · {frag.zone?.replace(/_/g, ' ')}
                                </p>
                              </div>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                              {frag.content}
                            </p>
                            {frag.hint && (
                              <p style={{ color: '#374151', fontSize: 10, marginTop: 8, fontStyle: 'italic' }}>
                                💡 {frag.hint}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Locked fragments hint */}
                  {(mq?.loreFragments?.length || 0) < 10 && (
                    <div style={{ background: '#0a0a14', border: '1px solid #111827', borderRadius: 10, padding: '12px 14px', marginTop: 12 }}>
                      <p style={{ color: '#374151', fontSize: 11, margin: 0 }}>
                        🔒 Fragment ที่ยังไม่พบ: {10 - (mq?.loreFragments?.length || 0)} ชิ้น<br/>
                        <span style={{ color: '#1f2937' }}>บางชิ้นต้องสำรวจ zone จนครบ · บางชิ้น drop จาก boss เฉพาะ</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CHARACTERS TAB ── */}
              {tab === 'characters' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {NPC_DB.map(npc => (
                    <div key={npc.name} style={{ background: '#0d0f18', border: '1px solid #1e2035', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{npc.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 }}>{npc.name}</p>
                          <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 4px' }}>{npc.role} · {npc.zone}</p>
                          <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7, margin: 0 }}>{npc.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* World history note */}
                  <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
                    <p style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>ผู้ปิดผนึกทั้งห้า</p>
                    <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                      ห้าคนที่สละวิญญาณเพื่อผนึก Vorath ไว้ — พวกเขาไม่ตาย แต่ถูกกักขังอยู่ระหว่างโลก
                      รู้สึกทุกอย่างแต่ไม่มีพลังทำอะไรได้ มาสามร้อยปีแล้ว
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
