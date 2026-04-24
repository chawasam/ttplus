// pages/game/index.js — Ashenveil: The Shattered Age — Entry (Login → Verify → Char Create)
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncAccount, requestVerify, getVerifyStatus, createCharacter, loadCharacter } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';

const RACES = [
  { id: 'HUMAN',  name: 'Human',  th: 'มนุษย์',  desc: 'คนธรรมดาจากดินแดนกลาง สมดุลในทุกด้าน', emoji: '👤' },
  { id: 'ELVEN',  name: 'Elven',  th: 'เอลฟ์',   desc: 'เผ่าพันธุ์โบราณ อายุยืน ปัญญาสูง เร็วกว่าคนทั่วไป', emoji: '🧝' },
  { id: 'DWARF',  name: 'Dwarf',  th: 'ดวาร์ฟ',  desc: 'แห่งขุนเขา ร่างกายแกร่งที่สุด มือทอง', emoji: '⛏️' },
  { id: 'SHADE',  name: 'Shade',  th: 'เชด',     desc: 'ลูกหลานเงา ปริศนา ไม่มีใครรู้ต้นกำเนิด', emoji: '🌑' },
];

const CLASSES_BY_RACE = {
  HUMAN: [
    { id: 'WARRIOR',  name: 'Warrior',  th: 'นักรบ',     desc: 'ดาบและโล่ แนวหน้า ทนทาน', emoji: '⚔️' },
    { id: 'ROGUE',    name: 'Rogue',    th: 'โจร',       desc: 'เร็ว คม เน้น Crit', emoji: '🗡️' },
    { id: 'CLERIC',   name: 'Cleric',   th: 'พระ',       desc: 'เวทย์ศักดิ์สิทธิ์ ฮีล', emoji: '✨' },
  ],
  ELVEN: [
    { id: 'RANGER',   name: 'Ranger',   th: 'นักล่า',    desc: 'ธนู ป่า ไว', emoji: '🏹' },
    { id: 'MAGE',     name: 'Mage',     th: 'นักเวทย์',  desc: 'พลังเวทย์สูงสุด', emoji: '🪄' },
    { id: 'BARD',     name: 'Bard',     th: 'บาร์ด',     desc: 'เพลงเวทย์ support + attack', emoji: '🎵' },
  ],
  DWARF: [
    { id: 'BERSERKER',name: 'Berserker',th: 'บีเซอร์เกอร์','desc': 'พลังสูงสุด ไม่กลัวตาย', emoji: '🪓' },
    { id: 'ENGINEER', name: 'Engineer', th: 'วิศวกร',    desc: '罠 และกลไก', emoji: '⚙️' },
    { id: 'RUNESMITH',name: 'Runesmith',th: 'รูนสมิธ',   desc: 'แกะรูนบนอาวุธ', emoji: '🔨' },
  ],
  SHADE: [
    { id: 'ASSASSIN', name: 'Assassin', th: 'นักฆ่า',   desc: 'ฆ่าทีเดียวจบ', emoji: '🌙' },
    { id: 'HEXBLADE', name: 'Hexblade', th: 'เฮกซ์เบลด','desc': 'ดาบสีดำ + สาปแช่ง', emoji: '🔮' },
    { id: 'PHANTOM',  name: 'Phantom',  th: 'แฟนทอม',   desc: 'เวทย์เงา ล่องหนได้', emoji: '👻' },
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
  const [creating,    setCreating]    = useState(false);
  const [account,     setAccount]     = useState(null);

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
          setStep(STEP.CREATE_CHAR);
        } else {
          router.replace('/game/world');
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
      router.replace('/game/world');
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
        style={{ fontFamily: "'Courier New', Courier, monospace" }}>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚔️</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-widest">ASHENVEIL</h1>
          <p className="text-amber-600 text-sm tracking-widest mt-1">THE SHATTERED AGE</p>
          <p className="text-gray-600 text-xs mt-2">500 ปีหลัง The Sundering — โลกแตกออกเป็น Shard</p>
        </div>

        <div className="w-full max-w-md">

          {/* ── LOADING ── */}
          {step === STEP.LOADING && (
            <div className="text-center text-amber-600 animate-pulse">กำลังโหลด...</div>
          )}

          {/* ── LOGIN ── */}
          {step === STEP.LOGIN && (
            <GameBox title="เข้าสู่โลก Ashenveil">
              <p className="text-gray-400 text-sm mb-6 text-center">
                ดินแดนนี้รอผู้กล้ามานานแล้ว<br/>
                <span className="text-gray-600 text-xs">ลงทะเบียนด้วย Google เพื่อเริ่มต้น</span>
              </p>
              <button onClick={handleLogin}
                className="w-full py-3 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition font-bold tracking-wider">
                [ เข้าสู่ระบบด้วย Google ]
              </button>
              <p className="text-gray-700 text-xs text-center mt-4">
                ไม่มีคู่มือ — ทุกอย่างค้นพบได้ด้วยตัวเอง
              </p>
            </GameBox>
          )}

          {/* ── VERIFY TIKTOK ── */}
          {step === STEP.VERIFY && (
            <GameBox title="เชื่อม TikTok Account">
              <p className="text-gray-400 text-sm mb-4">
                ใส่ TikTok username ของคุณ เพื่อรับ Gold จาก Gift ในไลฟ์<br/>
                <span className="text-gray-600 text-xs">ข้ามได้ — แต่จะไม่ได้ Gold จาก Gift</span>
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
              <button onClick={() => setStep(STEP.CREATE_CHAR)}
                className="w-full py-2 text-gray-600 hover:text-gray-400 transition text-xs">
                ข้ามขั้นตอนนี้
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
                {RACES.map(r => (
                  <button key={r.id} onClick={() => { setRace(r.id); setCharClass(''); }}
                    className={`p-2 border rounded text-left transition text-xs ${race === r.id ? 'border-amber-500 bg-amber-900/20 text-amber-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    <div className="text-lg mb-1">{r.emoji}</div>
                    <div className="font-bold">{r.th}</div>
                    <div className="text-gray-600 text-xs mt-1 leading-tight">{r.desc}</div>
                  </button>
                ))}
              </div>

              {/* เลือก Class */}
              {race && (
                <>
                  <label className="text-amber-600 text-xs mb-2 block">เลือกอาชีพ</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(CLASSES_BY_RACE[race] || []).map(c => (
                      <button key={c.id} onClick={() => setCharClass(c.id)}
                        className={`p-2 border rounded text-left transition ${charClass === c.id ? 'border-amber-500 bg-amber-900/20 text-amber-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                        <div className="text-xl mb-1">{c.emoji}</div>
                        <div className="text-xs font-bold">{c.th}</div>
                        <div className="text-gray-600 text-xs leading-tight mt-1">{c.desc}</div>
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

        <p className="text-gray-800 text-xs mt-8">Ashenveil • Powered by TTplus</p>
      </div>
    </>
  );
}

function GameBox({ title, children }) {
  return (
    <div className="border border-gray-800 rounded bg-gray-950/80 p-6">
      <div className="border-b border-gray-800 pb-3 mb-4">
        <h2 className="text-amber-500 font-bold tracking-wider text-sm">▸ {title}</h2>
      </div>
      {children}
    </div>
  );
}
