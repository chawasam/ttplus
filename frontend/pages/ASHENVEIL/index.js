// pages/game/index.js — Ashenveil: The Shattered Age — Entry (Login → Verify → Char Create)
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncAccount, requestVerify, getVerifyStatus, createCharacter, loadCharacter, getUnlockedRaces } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';

const RACES = [
  { id: 'HUMAN',    th: 'มนุษย์',    desc: 'สมดุลทุกด้าน เหมาะกับมือใหม่', emoji: '👤' },
  { id: 'ELVEN',    th: 'เอลฟ์',     desc: 'อายุยืน ปัญญาสูง เร็วกว่าคนทั่วไป', emoji: '🧝' },
  { id: 'DWARF',    th: 'ดวาร์ฟ',    desc: 'ร่างแกร่งที่สุด มือทอง', emoji: '⛏️' },
  { id: 'SHADE',    th: 'เชด',       desc: 'ลูกหลานเงา ปริศนา ต้นกำเนิดไม่ทราบ', emoji: '🌑' },
  // Locked races
  { id: 'REVENANT', th: 'เรเวแนนท์', desc: 'ผู้ที่ตายแล้วฟื้น ทนทาน ไม่กลัว death penalty', emoji: '💀',
    locked: true, unlockHint: 'ตาย 50 ครั้ง', unlockKey: 'REVENANT' },
  { id: 'VOIDBORN', th: 'วอยด์บอร์น', desc: 'สิ่งมีชีวิตจาก The Void เร็ว เวทย์สูงสุด', emoji: '🌀',
    locked: true, unlockHint: 'สำรวจ 100 ครั้ง', unlockKey: 'VOIDBORN' },
  { id: 'BEASTKIN', th: 'บีสท์คิน',  desc: 'ลูกหลานสัตว์ป่า พลังแกร่ง Stamina ฟื้นเร็ว', emoji: '🐾',
    locked: true, unlockHint: 'สังหาร 200 มอนสเตอร์', unlockKey: 'BEASTKIN' },
];

const CLASSES_BY_RACE = {
  HUMAN: [
    { id: 'WARRIOR',     th: 'นักรบ',         desc: 'ดาบโล่ แนวหน้า ทนทาน', emoji: '⚔️' },
    { id: 'ROGUE',       th: 'โจร',           desc: 'เร็ว คม เน้น Crit', emoji: '🗡️' },
    { id: 'CLERIC',      th: 'พระ',           desc: 'เวทย์ศักดิ์สิทธิ์ ฮีล', emoji: '✨' },
  ],
  ELVEN: [
    { id: 'RANGER',      th: 'นักล่า',         desc: 'ธนู ป่า ไว', emoji: '🏹' },
    { id: 'MAGE',        th: 'นักเวทย์',       desc: 'พลังเวทย์สูงสุด', emoji: '🪄' },
    { id: 'BARD',        th: 'บาร์ด',          desc: 'เพลงเวทย์ support + attack', emoji: '🎵' },
  ],
  DWARF: [
    { id: 'BERSERKER',   th: 'บีเซอร์เกอร์',   desc: 'พลังสูงสุด ไม่กลัวตาย', emoji: '🪓' },
    { id: 'ENGINEER',    th: 'วิศวกร',         desc: 'กับดักและกลไก', emoji: '⚙️' },
    { id: 'RUNESMITH',   th: 'รูนสมิธ',        desc: 'แกะรูนบนอาวุธ', emoji: '🔨' },
  ],
  SHADE: [
    { id: 'ASSASSIN',    th: 'นักฆ่า',         desc: 'ฆ่าทีเดียวจบ', emoji: '🌙' },
    { id: 'HEXBLADE',    th: 'เฮกซ์เบลด',      desc: 'ดาบสีดำ + สาปแช่ง', emoji: '🔮' },
    { id: 'PHANTOM',     th: 'แฟนทอม',        desc: 'เวทย์เงา ล่องหนได้', emoji: '👻' },
  ],
  REVENANT: [
    { id: 'DEATHKNIGHT', th: 'เดธไนท์',        desc: 'ดาบมืด ดูดชีวิตศัตรู', emoji: '🗡️' },
    { id: 'NECROMANCER', th: 'เนโครแมนเซอร์',  desc: 'ปลุกอันเดด เวทย์มืด', emoji: '💀' },
    { id: 'GRAVECALLER', th: 'เกรฟคอลเลอร์',   desc: 'เรียกวิญญาณ ฮีลมืด', emoji: '👻' },
  ],
  VOIDBORN: [
    { id: 'VOIDWALKER',  th: 'วอยด์วอล์กเกอร์', desc: 'เทเลพอร์ต เวทย์ Void', emoji: '🌀' },
    { id: 'RIFTER',      th: 'ริฟเตอร์',        desc: 'ตัดมิติ พลังสูง', emoji: '⚡' },
    { id: 'SOULSEER',    th: 'โซลเซียร์',       desc: 'มองเห็นวิญญาณ เวทย์สูง', emoji: '👁️' },
  ],
  BEASTKIN: [
    { id: 'WILDGUARD',   th: 'ไวลด์การ์ด',      desc: 'โล่ธรรมชาติ กำแพงเนื้อ', emoji: '🛡️' },
    { id: 'TRACKER',     th: 'แทร็กเกอร์',      desc: 'ล่าเป้าหมาย Crit สูง', emoji: '🐾' },
    { id: 'SHAMAN',      th: 'ชาแมน',           desc: 'วิญญาณสัตว์ เวทย์ธรรมชาติ', emoji: '🌿' },
  ],
};

const STEP = { LOADING: 0, LOGIN: 1, VERIFY: 2, VERIFY_WAIT: 3, CREATE_CHAR: 4, DONE: 5 };

export default function GameIndex() {
  const router  = useRouter();
  const [step,        setStep]        = useState(STEP.LOADING);
  const [user,        setUser]        = useState(null);
  const [verifyCode,  setVerifyCode]  = useState('');
  const [tiktokInput, setTiktokInput] = useState('');
  const [polling,     setPolling]     = useState(false);
  const [charName,    setCharName]    = useState('');
  const [race,        setRace]        = useState('');
  const [charClass,   setCharClass]   = useState('');
  const [creating,      setCreating]      = useState(false);
  const [account,       setAccount]       = useState(null);
  const [unlockedRaces, setUnlockedRaces] = useState([]);
  const [raceProgress,  setRaceProgress]  = useState({});
  const [brightness,    setBrightness]    = useState(1.0);
  const [showBrPanel,   setShowBrPanel]   = useState(false);

  // ===== Load brightness preference =====
  useEffect(() => {
    try {
      const saved = parseFloat(localStorage.getItem('ashenveil_brightness') || '1.0');
      if (saved >= 1.0 && saved <= 2.0) setBrightness(saved);
    } catch {}
  }, []);

  const handleBrightnessChange = useCallback((val) => {
    setBrightness(val);
    try { localStorage.setItem('ashenveil_brightness', String(val)); } catch {}
  }, []);

  // ===== Auth state =====
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setStep(STEP.LOGIN); return; }
      setUser(u);
      try {
        const { data } = await syncAccount();
        setAccount(data.account);

        if (!data.account.tiktokVerified) {
          setStep(STEP.VERIFY);
        } else if (!data.account.characterId) {
          // โหลด unlocked races ก่อนแสดงหน้าสร้าง character
          try {
            const ur = await getUnlockedRaces();
            setUnlockedRaces(ur.data.unlockedRaces || []);
            setRaceProgress(ur.data.progress || {});
          } catch {}
          setStep(STEP.CREATE_CHAR);
        } else {
          router.replace('/ASHENVEIL/world');
        }
      } catch {
        setStep(STEP.VERIFY);
      }
    });
    return () => unsub();
  }, []);

  // ===== Google Login =====
  const handleLogin = useCallback(async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const { googleProvider }  = await import('../../lib/firebase');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
    }
  }, []);

  // ===== Request verify code =====
  const handleRequestCode = useCallback(async () => {
    const clean = tiktokInput.replace(/^@/, '').trim();
    if (!clean) return toast.error('กรุณาใส่ TikTok username');
    try {
      const { data } = await requestVerify(clean);
      setVerifyCode(data.code);
      setStep(STEP.VERIFY_WAIT);
      toast.success('ได้รับ code แล้ว! พิมพ์ใน TikTok Live ภายใน 10 นาที');
      // เริ่ม polling
      setPolling(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  }, [tiktokInput]);

  // ===== Poll verify status =====
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await getVerifyStatus();
        if (data.verified) {
          setPolling(false);
          toast.success('✅ ยืนยัน TikTok สำเร็จ!');
          setStep(STEP.CREATE_CHAR);
        }
      } catch {}
    }, 3000);
    // หยุด poll หลัง 12 นาที
    const timeout = setTimeout(() => { setPolling(false); }, 12 * 60 * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [polling]);

  // ===== Create character =====
  const handleCreateChar = useCallback(async () => {
    if (!charName.trim() || !race || !charClass) {
      return toast.error('กรุณากรอกข้อมูลให้ครบ');
    }
    setCreating(true);
    try {
      await createCharacter({ name: charName.trim(), race, characterClass: charClass });
      toast.success('🎉 สร้าง Character สำเร็จ!');
      router.replace('/ASHENVEIL/world');
    } catch (err) {
      toast.error(err.response?.data?.error || 'สร้างไม่สำเร็จ');
      setCreating(false);
    }
  }, [charName, race, charClass]);

  // ===== Render =====
  return (
    <>
      <Head>
        <title>Ashenveil: The Shattered Age</title>
      </Head>
      <div className="min-h-screen bg-[#0a0a0a] text-amber-100 flex flex-col items-center justify-center p-4"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          filter: brightness !== 1.0 ? `brightness(${brightness})` : undefined,
        }}>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚔️</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-widest">ASHENVEIL</h1>
          <p className="text-amber-600 text-sm tracking-widest mt-1">THE SHATTERED AGE</p>
          <p className="text-gray-400 text-xs mt-2">500 ปีหลัง The Sundering — โลกแตกออกเป็น Shard</p>
        </div>

        <div className="w-full max-w-md">

          {/* ── LOADING ── */}
          {step === STEP.LOADING && (
            <div className="text-center text-amber-600 animate-pulse">กำลังโหลด...</div>
          )}

          {/* ── LOGIN ── */}
          {step === STEP.LOGIN && (
            <GameBox title="เข้าสู่โลก Ashenveil">
              <p className="text-gray-300 text-sm mb-6 text-center">
                ดินแดนนี้รอผู้กล้ามานานแล้ว<br/>
                <span className="text-gray-500 text-xs">ลงทะเบียนด้วย Google เพื่อเริ่มต้น</span>
              </p>
              <button onClick={handleLogin}
                className="w-full py-3 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition font-bold tracking-wider">
                [ เข้าสู่ระบบด้วย Google ]
              </button>
              <p className="text-gray-500 text-xs text-center mt-4">
                ไม่มีคู่มือ — ทุกอย่างค้นพบได้ด้วยตัวเอง
              </p>
            </GameBox>
          )}

          {/* ── VERIFY TIKTOK ── */}
          {step === STEP.VERIFY && (
            <GameBox title="เชื่อม TikTok Account">

              {/* เงื่อนไขสำคัญ */}
              <div className="border border-amber-900/60 bg-amber-950/30 rounded p-3 mb-4 text-xs space-y-1">
                <p className="text-amber-400 font-bold">⚠️ เงื่อนไขการรับ Gold</p>
                <p className="text-amber-300 leading-relaxed">
                  Gold จาก Gift จะเข้าก็ต่อเมื่อ <span className="text-amber-400">VJ / Host ที่คุณส่ง Gift ให้</span> เชื่อมต่อ TikTok Live ผ่านเว็บ{' '}
                  <span className="text-amber-300 font-bold">ttsam.app</span> อยู่ในขณะนั้น
                </p>
                <p className="text-amber-300 leading-relaxed">
                  ถ้า VJ ไม่ได้เปิด ttsam.app — Gift จะ<span className="text-red-400"> ไม่ถูกนับ</span> ไม่ว่าจะส่งกี่ครั้ง
                </p>
              </div>

              {/* disclaimer */}
              <div className="border border-gray-700 rounded p-3 mb-4 text-xs text-gray-400 leading-relaxed">
                <p className="text-gray-300 font-bold mb-1">⚙️ เกมกำลังพัฒนา (Early Access)</p>
                ระบบยังอยู่ระหว่างทดสอบ อาจมีข้อผิดพลาดได้ ทีมงาน<span className="text-gray-300"> ไม่รับผิดชอบ</span>ต่อ Gold หรือ item ที่อาจเกิดความผิดพลาดระหว่างช่วง Early Access นี้
              </div>

              <p className="text-gray-300 text-xs mb-3">
                ใส่ TikTok username ของคุณเพื่อเชื่อม account และรับ Gold จาก Gift
              </p>
              <input
                value={tiktokInput}
                onChange={e => setTiktokInput(e.target.value)}
                placeholder="@username (ไม่ต้องมี @)"
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-amber-200 text-sm mb-3 focus:border-amber-600 outline-none"
              />
              <button onClick={handleRequestCode}
                className="w-full py-2 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition text-sm mb-2">
                [ ขอ Code ยืนยัน ]
              </button>
              <button onClick={async () => {
                  try { const ur = await getUnlockedRaces(); setUnlockedRaces(ur.data.unlockedRaces||[]); setRaceProgress(ur.data.progress||{}); } catch {}
                  setStep(STEP.CREATE_CHAR);
                }}
                className="w-full py-2 text-gray-700 hover:text-gray-500 transition text-xs">
                ข้ามขั้นตอนนี้ (เล่นได้แต่ไม่รับ Gold จาก Gift)
              </button>
            </GameBox>
          )}

          {/* ── VERIFY WAIT ── */}
          {step === STEP.VERIFY_WAIT && (
            <GameBox title="พิมพ์ Code ใน TikTok Live">
              <p className="text-gray-400 text-sm mb-4">พิมพ์ข้อความนี้ใน comment ของ TikTok Live ใดก็ได้:</p>
              <div className="bg-black border border-amber-600 rounded p-4 text-center mb-4">
                <p className="text-2xl font-bold text-amber-300 tracking-wider">{verifyCode}</p>
                <p className="text-gray-600 text-xs mt-1">หมดอายุใน 10 นาที</p>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                รอการยืนยัน...
              </div>
              <button onClick={() => setStep(STEP.VERIFY)}
                className="w-full py-2 text-gray-600 hover:text-gray-400 transition text-xs mt-4">
                กลับ / เปลี่ยน username
              </button>
            </GameBox>
          )}

          {/* ── CREATE CHARACTER ── */}
          {step === STEP.CREATE_CHAR && (
            <GameBox title="สร้าง Character">

              {/* ชื่อ */}
              <label className="text-amber-600 text-xs mb-1 block">ชื่อของคุณ</label>
              <input
                value={charName}
                onChange={e => setCharName(e.target.value)}
                maxLength={20}
                placeholder="ชื่อ 2-20 ตัวอักษร"
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-amber-200 text-sm mb-4 focus:border-amber-600 outline-none"
              />

              {/* เลือก Race */}
              <label className="text-amber-600 text-xs mb-2 block">เลือกเผ่า</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {RACES.map(r => {
                  const isUnlocked = !r.locked || unlockedRaces.includes(r.id);
                  const prog = r.locked ? raceProgress[r.id] : null;
                  return (
                    <button key={r.id}
                      onClick={() => { if (isUnlocked) { setRace(r.id); setCharClass(''); } }}
                      disabled={!isUnlocked}
                      title={r.locked && !isUnlocked ? `🔒 ${r.unlockHint}${prog ? ` (${prog.current}/${prog.required})` : ''}` : ''}
                      className={`p-2 border rounded text-left transition text-xs relative ${
                        race === r.id ? 'border-amber-500 bg-amber-900/20 text-amber-300' :
                        !isUnlocked ? 'border-gray-700 text-gray-500 cursor-not-allowed opacity-60' :
                        'border-gray-600 text-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="text-lg mb-1">{r.emoji}{!isUnlocked && ' 🔒'}</div>
                      <div className="font-bold">{r.th}</div>
                      {isUnlocked
                        ? <div className="text-gray-400 text-xs mt-1 leading-tight">{r.desc}</div>
                        : <div className="text-gray-500 text-xs mt-1 leading-tight">
                            {r.unlockHint}
                            {prog && <span className="block text-gray-600">{prog.current}/{prog.required}</span>}
                          </div>
                      }
                    </button>
                  );
                })}
              </div>

              {/* เลือก Class */}
              {race && (
                <>
                  <label className="text-amber-600 text-xs mb-2 block">เลือกอาชีพ</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(CLASSES_BY_RACE[race] || []).map(c => (
                      <button key={c.id} onClick={() => setCharClass(c.id)}
                        className={`p-2 border rounded text-left transition ${charClass === c.id ? 'border-amber-500 bg-amber-900/20 text-amber-300' : 'border-gray-600 text-gray-300 hover:border-gray-400'}`}>
                        <div className="text-xl mb-1">{c.emoji}</div>
                        <div className="text-xs font-bold">{c.th}</div>
                        <div className="text-gray-400 text-xs leading-tight mt-1">{c.desc}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button onClick={handleCreateChar} disabled={creating || !charName || !race || !charClass}
                className="w-full py-3 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                {creating ? '[ กำลังสร้าง... ]' : '[ เริ่มการผจญภัย ]'}
              </button>
            </GameBox>
          )}

        </div>

        <p className="text-gray-600 text-xs mt-8">Ashenveil • Powered by TTsam</p>

        {/* ── Brightness panel (fixed, ไม่โดนกรอง) ── */}
      </div>

      {/* Brightness control — อยู่นอก filtered div เพื่อให้ปุ่มเองไม่ถูกกรอง */}
      <div className="fixed bottom-4 right-4 z-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
        {showBrPanel && (
          <div className="mb-2 bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl w-52"
            style={{ filter: `brightness(${brightness})` }}>
            <p className="text-amber-400 text-xs font-bold mb-2">🔆 ความสว่างข้อความ</p>
            <input
              type="range" min="1.0" max="2.0" step="0.05"
              value={brightness}
              onChange={e => handleBrightnessChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-gray-400 text-xs mt-1">
              <span>ปกติ</span>
              <span className="text-amber-400">{Math.round((brightness - 1) * 100)}%</span>
              <span>สว่างสุด</span>
            </div>
            {brightness > 1.0 && (
              <button onClick={() => handleBrightnessChange(1.0)}
                className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 transition">
                รีเซ็ต
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setShowBrPanel(p => !p)}
          title="ปรับความสว่าง"
          className="w-9 h-9 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-base hover:border-amber-600 hover:text-amber-400 transition shadow-lg"
          style={{ color: brightness > 1.1 ? '#fbbf24' : '#6b7280' }}
        >
          🔆
        </button>
      </div>
    </>
  );
}

function GameBox({ title, children }) {
  return (
    <div className="border border-gray-700 rounded bg-gray-950/80 p-6">
      <div className="border-b border-gray-700 pb-3 mb-4">
        <h2 className="text-amber-400 font-bold tracking-wider text-sm">▸ {title}</h2>
      </div>
      {children}
    </div>
  );
}
