// pages/ASHENVEIL/index.js — Ashenveil Lobby (Login → Lobby → World)
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { syncAccount, requestVerify, getVerifyStatus, createCharacter, getUnlockedRaces, deleteCharacter } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';
import AshenveilSettings, { useAshenveilSettings } from '../../components/AshenveilSettings';

// ─── Race / Class data ───────────────────────────────────────────────
const RACES = [
  { id: 'HUMAN',    th: 'มนุษย์',     desc: 'สมดุลทุกด้าน เหมาะกับมือใหม่',              emoji: '👤' },
  { id: 'ELVEN',    th: 'เอลฟ์',      desc: 'อายุยืน ปัญญาสูง เร็วกว่าคนทั่วไป',          emoji: '🧝' },
  { id: 'DWARF',    th: 'ดวาร์ฟ',     desc: 'ร่างแกร่งที่สุด มือทอง',                      emoji: '⛏️' },
  { id: 'SHADE',    th: 'เชด',        desc: 'ลูกหลานเงา ปริศนา ต้นกำเนิดไม่ทราบ',          emoji: '🌑' },
  { id: 'REVENANT', th: 'เรเวแนนท์',  desc: 'ผู้ที่ตายแล้วฟื้น ทนทาน ไม่กลัว death penalty', emoji: '💀',
    locked: true, unlockHint: 'ตาย 50 ครั้ง', unlockKey: 'REVENANT' },
  { id: 'VOIDBORN', th: 'วอยด์บอร์น', desc: 'สิ่งมีชีวิตจาก The Void เร็ว เวทย์สูงสุด',   emoji: '🌀',
    locked: true, unlockHint: 'สำรวจ 100 ครั้ง', unlockKey: 'VOIDBORN' },
  { id: 'BEASTKIN', th: 'บีสท์คิน',   desc: 'ลูกหลานสัตว์ป่า พลังแกร่ง Stamina ฟื้นเร็ว', emoji: '🐾',
    locked: true, unlockHint: 'สังหาร 200 มอนสเตอร์', unlockKey: 'BEASTKIN' },
];

const CLASSES_BY_RACE = {
  HUMAN:    [
    { id: 'WARRIOR',     th: 'นักรบ',           desc: 'ดาบโล่ แนวหน้า ทนทาน',          emoji: '⚔️' },
    { id: 'ROGUE',       th: 'โจร',             desc: 'เร็ว คม เน้น Crit',              emoji: '🗡️' },
    { id: 'CLERIC',      th: 'พระ',             desc: 'เวทย์ศักดิ์สิทธิ์ ฮีล',          emoji: '✨' },
  ],
  ELVEN:    [
    { id: 'RANGER',      th: 'นักล่า',           desc: 'ธนู ป่า ไว',                   emoji: '🏹' },
    { id: 'MAGE',        th: 'นักเวทย์',         desc: 'พลังเวทย์สูงสุด',               emoji: '🪄' },
    { id: 'BARD',        th: 'บาร์ด',            desc: 'เพลงเวทย์ support + attack',    emoji: '🎵' },
  ],
  DWARF:    [
    { id: 'BERSERKER',   th: 'บีเซอร์เกอร์',     desc: 'พลังสูงสุด ไม่กลัวตาย',         emoji: '🪓' },
    { id: 'ENGINEER',    th: 'วิศวกร',           desc: 'กับดักและกลไก',                 emoji: '⚙️' },
    { id: 'RUNESMITH',   th: 'รูนสมิธ',          desc: 'แกะรูนบนอาวุธ',                emoji: '🔨' },
  ],
  SHADE:    [
    { id: 'ASSASSIN',    th: 'นักฆ่า',           desc: 'ฆ่าทีเดียวจบ',                 emoji: '🌙' },
    { id: 'HEXBLADE',    th: 'เฮกซ์เบลด',        desc: 'ดาบสีดำ + สาปแช่ง',             emoji: '🔮' },
    { id: 'PHANTOM',     th: 'แฟนทอม',          desc: 'เวทย์เงา ล่องหนได้',             emoji: '👻' },
  ],
  REVENANT: [
    { id: 'DEATHKNIGHT', th: 'เดธไนท์',          desc: 'ดาบมืด ดูดชีวิตศัตรู',           emoji: '🗡️' },
    { id: 'NECROMANCER', th: 'เนโครแมนเซอร์',    desc: 'ปลุกอันเดด เวทย์มืด',            emoji: '💀' },
    { id: 'GRAVECALLER', th: 'เกรฟคอลเลอร์',     desc: 'เรียกวิญญาณ ฮีลมืด',             emoji: '👻' },
  ],
  VOIDBORN: [
    { id: 'VOIDWALKER',  th: 'วอยด์วอล์กเกอร์',  desc: 'เทเลพอร์ต เวทย์ Void',          emoji: '🌀' },
    { id: 'RIFTER',      th: 'ริฟเตอร์',          desc: 'ตัดมิติ พลังสูง',               emoji: '⚡' },
    { id: 'SOULSEER',    th: 'โซลเซียร์',         desc: 'มองเห็นวิญญาณ เวทย์สูง',        emoji: '👁️' },
  ],
  BEASTKIN: [
    { id: 'WILDGUARD',   th: 'ไวลด์การ์ด',        desc: 'โล่ธรรมชาติ กำแพงเนื้อ',        emoji: '🛡️' },
    { id: 'TRACKER',     th: 'แทร็กเกอร์',        desc: 'ล่าเป้าหมาย Crit สูง',          emoji: '🐾' },
    { id: 'SHAMAN',      th: 'ชาแมน',            desc: 'วิญญาณสัตว์ เวทย์ธรรมชาติ',      emoji: '🌿' },
  ],
};

const CLASS_EMOJI = {};
Object.values(CLASSES_BY_RACE).flat().forEach(c => { CLASS_EMOJI[c.id] = c.emoji; });
const RACE_EMOJI  = {};
RACES.forEach(r => { RACE_EMOJI[r.id] = r.emoji; });

const STEP = { LOADING: 0, LOGIN: 1, LOBBY: 2, VERIFY_WAIT: 3, CREATE_CHAR: 4 };

export default function GameIndex() {
  const router   = useRouter();
  const settings = useAshenveilSettings();

  const [step,         setStep]         = useState(STEP.LOADING);
  const [user,         setUser]         = useState(null);
  const [account,      setAccount]      = useState(null);   // { characterId, tiktokVerified, tiktokUniqueId, ... }
  const [charInfo,     setCharInfo]     = useState(null);   // { name, race, class, level } — loaded after sync
  const [syncError,    setSyncError]    = useState(null);   // error message ถ้า syncAccount ล้มเหลว
  const [loadingMsg,   setLoadingMsg]   = useState('กำลังโหลด...');

  // TikTok link state
  const [tiktokInput,  setTiktokInput]  = useState('');
  const [verifyCode,   setVerifyCode]   = useState('');
  const [polling,      setPolling]      = useState(false);
  const [tikBusy,      setTikBusy]      = useState(false);

  // Character creation state
  const [charName,     setCharName]     = useState('');
  const [race,         setRace]         = useState('');
  const [charClass,    setCharClass]    = useState('');
  const [creating,     setCreating]     = useState(false);
  const [unlockedRaces, setUnlockedRaces] = useState([]);
  const [raceProgress,  setRaceProgress]  = useState({});

  // ===== Auth state =====
  const doSync = useCallback(async (u) => {
    setSyncError(null);
    setLoadingMsg('กำลังโหลดข้อมูลบัญชี...');
    setStep(STEP.LOADING);
    try {
      const { data } = await syncAccount();
      setAccount(data.account);

      // ─── KEY FIX: characterId ตรวจก่อน tiktokVerified ───
      if (data.account.characterId) {
        setStep(STEP.LOBBY);
      } else {
        setLoadingMsg('กำลังโหลดข้อมูลเผ่า...');
        try {
          const ur = await getUnlockedRaces();
          setUnlockedRaces(ur.data.unlockedRaces || []);
          setRaceProgress(ur.data.progress   || {});
        } catch {}
        setStep(STEP.LOBBY);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'ไม่สามารถเชื่อมต่อ server ได้';
      setSyncError(msg);
      setStep(STEP.LOGIN);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setStep(STEP.LOGIN); return; }
      setUser(u);
      await doSync(u);
    });
    return () => unsub();
  }, [doSync]);

  // ===== Google Login =====
  const handleLogin = useCallback(async () => {
    const { signInWithPopup }  = await import('firebase/auth');
    const { googleProvider }   = await import('../../lib/firebase');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
    }
  }, []);

  // ===== TikTok: Request verify code =====
  const handleRequestCode = useCallback(async () => {
    const clean = tiktokInput.replace(/^@/, '').trim();
    if (!clean) return toast.error('กรุณาใส่ TikTok username');
    setTikBusy(true);
    try {
      const { data } = await requestVerify(clean);
      setVerifyCode(data.code);
      setStep(STEP.VERIFY_WAIT);
      toast.success('ได้รับ Code แล้ว! พิมพ์ใน TikTok Live ภายใน 10 นาที');
      setPolling(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally { setTikBusy(false); }
  }, [tiktokInput]);

  // ===== TikTok: Poll verify =====
  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(async () => {
      try {
        const { data } = await getVerifyStatus();
        if (data.verified) {
          setPolling(false);
          toast.success('✅ ยืนยัน TikTok สำเร็จ!');
          setAccount(prev => ({ ...prev, tiktokVerified: true, tiktokUniqueId: data.tiktokUniqueId }));
          setStep(STEP.LOBBY);
        }
      } catch {}
    }, 3000);
    const timeout = setTimeout(() => { setPolling(false); }, 12 * 60 * 1000);
    return () => { clearInterval(iv); clearTimeout(timeout); };
  }, [polling]);

  // ===== Create character =====
  const handleCreateChar = useCallback(async () => {
    if (!charName.trim() || !race || !charClass) return toast.error('กรุณากรอกข้อมูลให้ครบ');
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

  // ===== Enter game =====
  const enterGame = useCallback(() => {
    router.replace('/ASHENVEIL/world');
  }, []);

  // ===== Delete character =====
  const handleDeleteCharacter = useCallback(async () => {
    try {
      await deleteCharacter();
      toast.success('ลบตัวละครสำเร็จ');
      // Reset to creation state
      setAccount(prev => ({ ...prev, characterId: null, charName: null, charRace: null, charClass: null, charLevel: null }));
      // Load races for character creation
      try {
        const ur = await getUnlockedRaces();
        setUnlockedRaces(ur.data.unlockedRaces || []);
        setRaceProgress(ur.data.progress   || {});
      } catch {}
    } catch (err) {
      toast.error(err.response?.data?.error || 'ลบไม่สำเร็จ กรุณาลองใหม่');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Ashenveil: The Shattered Age</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0a] text-amber-100 flex flex-col items-center justify-center p-4"
        style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: settings.fontPx, filter: settings.cssFilter }}>

        {/* ── Title Block ── */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-widest">ASHENVEIL</h1>
          <p className="text-amber-600 text-sm tracking-widest mt-1">THE SHATTERED AGE</p>
          <p className="text-gray-500 text-xs mt-2">500 ปีหลัง The Sundering — โลกแตกออกเป็น Shard</p>
        </div>

        <div className="w-full max-w-md space-y-3">

          {/* ── LOADING ── */}
          {step === STEP.LOADING && (
            <div className="text-center py-8 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-amber-600 text-sm animate-pulse">{loadingMsg}</p>
            </div>
          )}

          {/* ── LOGIN ── */}
          {step === STEP.LOGIN && (
            <Box title="เข้าสู่โลก Ashenveil">
              {syncError ? (
                /* ── Error state ── */
                <div className="mb-4 bg-red-950/30 border border-red-900/50 rounded p-3 space-y-2">
                  <p className="text-red-400 text-xs font-bold">⚠️ เชื่อมต่อไม่สำเร็จ</p>
                  <p className="text-red-300 text-xs">{syncError}</p>
                  {user && (
                    <button onClick={() => doSync(user)}
                      className="w-full py-1.5 border border-amber-700 text-amber-400 hover:bg-amber-900/20 transition text-xs rounded">
                      ลองใหม่อีกครั้ง
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                  ดินแดนนี้รอผู้กล้ามานานแล้ว<br/>
                  <span className="text-gray-500 text-xs">ลงทะเบียนด้วย Google เพื่อเริ่มต้น</span>
                </p>
              )}
              <button onClick={handleLogin}
                className="w-full py-3 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition font-bold tracking-wider">
                [ เข้าสู่ระบบด้วย Google ]
              </button>
              {!syncError && <p className="text-gray-600 text-xs text-center mt-4">ไม่มีคู่มือ — ทุกอย่างค้นพบได้ด้วยตัวเอง</p>}
            </Box>
          )}

          {/* ── LOBBY ── */}
          {step === STEP.LOBBY && account && (
            <>
              {/* ── TikTok Section ── */}
              <Box title="🎵 TikTok Account">
                {account.tiktokVerified ? (
                  /* ✅ Linked */
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-xl">✅</span>
                    <div className="flex-1">
                      <p className="text-green-300 text-sm font-bold">@{account.tiktokUniqueId}</p>
                      <p className="text-gray-500 text-xs">เชื่อม TikTok สำเร็จ — Gift จะแปลงเป็น RP อัตโนมัติ</p>
                    </div>
                  </div>
                ) : (
                  /* ❌ Not linked */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 text-lg">⬜</span>
                      <p className="text-gray-400 text-xs">ยังไม่ได้ผูก TikTok — Gift จะไม่แปลงเป็น RP</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tiktokInput}
                        onChange={e => setTiktokInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRequestCode()}
                        placeholder="@tiktok_username"
                        className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-amber-200 text-xs focus:border-amber-600 outline-none"
                      />
                      <button onClick={handleRequestCode} disabled={tikBusy}
                        className="px-3 py-2 border border-amber-700 text-amber-400 hover:bg-amber-900/20 transition text-xs rounded disabled:opacity-40">
                        {tikBusy ? '...' : 'ผูก'}
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs">ไม่บังคับ — สามารถผูกทีหลังได้ในหน้าตั้งค่าเกม</p>
                  </div>
                )}
              </Box>

              {/* ── Character Section ── */}
              {account.characterId ? (
                /* ── มีตัวละครแล้ว — แสดง Character Card ── */
                <Box title="🗡️ ตัวละครของคุณ">
                  <CharacterCard account={account} onEnter={enterGame} onDelete={handleDeleteCharacter} />
                </Box>
              ) : (
                /* ── ยังไม่มีตัวละคร — แสดงฟอร์มสร้าง ── */
                <Box title="⚔️ สร้าง Character">
                  <label className="text-amber-600 text-xs mb-1 block">ชื่อตัวละคร</label>
                  <input
                    value={charName}
                    onChange={e => setCharName(e.target.value)}
                    maxLength={20}
                    placeholder="ชื่อ 2-20 ตัวอักษร"
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-amber-200 text-sm mb-4 focus:border-amber-600 outline-none"
                  />

                  <label className="text-amber-600 text-xs mb-2 block">เลือกเผ่า</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {RACES.map(r => {
                      const unlocked = !r.locked || unlockedRaces.includes(r.id);
                      const prog = r.locked ? raceProgress[r.id] : null;
                      return (
                        <button key={r.id}
                          onClick={() => { if (unlocked) { setRace(r.id); setCharClass(''); } }}
                          disabled={!unlocked}
                          className={`p-2 border rounded text-left transition text-xs ${
                            race === r.id       ? 'border-amber-500 bg-amber-900/20 text-amber-300' :
                            !unlocked           ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-50' :
                                                  'border-gray-600 text-gray-300 hover:border-gray-400'
                          }`}>
                          <div className="text-base mb-0.5">{r.emoji}{!unlocked && ' 🔒'}</div>
                          <div className="font-bold">{r.th}</div>
                          <div className="text-xs mt-0.5 opacity-70 leading-tight">
                            {unlocked ? r.desc : `${r.unlockHint}${prog ? ` (${prog.current}/${prog.required})` : ''}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {race && (
                    <>
                      <label className="text-amber-600 text-xs mb-2 block">เลือกอาชีพ</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {(CLASSES_BY_RACE[race] || []).map(c => (
                          <button key={c.id} onClick={() => setCharClass(c.id)}
                            className={`p-2 border rounded text-left transition text-xs ${
                              charClass === c.id
                                ? 'border-amber-500 bg-amber-900/20 text-amber-300'
                                : 'border-gray-600 text-gray-300 hover:border-gray-400'
                            }`}>
                            <div className="text-xl mb-1">{c.emoji}</div>
                            <div className="font-bold">{c.th}</div>
                            <div className="text-gray-500 text-xs leading-tight mt-0.5">{c.desc}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <button onClick={handleCreateChar}
                    disabled={creating || !charName.trim() || !race || !charClass}
                    className="w-full py-3 rounded border border-amber-600 text-amber-400 hover:bg-amber-900/20 transition font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                    {creating ? '[ กำลังสร้าง... ]' : '[ เริ่มการผจญภัย ]'}
                  </button>
                </Box>
              )}

              {/* ── Sign out ── */}
              <div className="text-center">
                <button onClick={() => signOut(auth)}
                  className="text-gray-700 hover:text-gray-500 text-xs transition">
                  ออกจากระบบ ({user?.email})
                </button>
              </div>
            </>
          )}

          {/* ── VERIFY WAIT ── */}
          {step === STEP.VERIFY_WAIT && (
            <Box title="พิมพ์ Code ใน TikTok Live">
              <p className="text-gray-400 text-sm mb-4">คัดลอก code แล้วพิมพ์ใน comment ของ TikTok Live ใดก็ได้:</p>
              <CopyCodeBox code={verifyCode} />

              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                รอการยืนยัน...
              </div>
              <button onClick={() => { setPolling(false); setStep(STEP.LOBBY); }}
                className="w-full py-2 text-gray-600 hover:text-gray-400 transition text-xs">
                ยกเลิก / กลับ Lobby
              </button>
            </Box>
          )}

        </div>

        <p className="text-gray-700 text-xs mt-8">Ashenveil • Powered by TTsam</p>
      </div>

      <AshenveilSettings {...settings} />
    </>
  );
}

// ── Copy Code Box ────────────────────────────────────────────────────
function CopyCodeBox({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback สำหรับ browser ที่ไม่รองรับ clipboard API
      try {
        const el = document.createElement('textarea');
        el.value = code;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [code]);

  return (
    <div className="mb-4">
      <button
        onClick={handleCopy}
        className="w-full bg-black border border-amber-600 rounded p-4 text-center transition hover:border-amber-400 hover:bg-amber-950/10 active:scale-95 cursor-pointer group"
        title="กดเพื่อคัดลอก"
      >
        <p className="text-3xl font-bold text-amber-300 tracking-widest select-all">{code}</p>
        <p className="text-xs mt-2 transition">
          {copied
            ? <span className="text-green-400">✅ คัดลอกแล้ว!</span>
            : <span className="text-gray-600 group-hover:text-amber-600">📋 กดเพื่อคัดลอก</span>
          }
        </p>
        <p className="text-gray-700 text-xs mt-0.5">หมดอายุใน 10 นาที</p>
      </button>
    </div>
  );
}

// ── Character Card (shown when characterId exists) ──────────────────
function CharacterCard({ account, onEnter, onDelete }) {
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden 1=confirm1 2=confirm2 3=confirm3
  const [deleting,   setDeleting]   = useState(false);

  const CONFIRM_MSGS = [
    'คุณต้องการลบตัวจริงๆใช่ไหม? 1/3',
    'คุณต้องการลบตัวจริงๆใช่ไหม? 2/3',
    'คุณต้องการลบตัวจริงๆใช่ไหม? 3/3',
  ];

  const handleDeleteClick = async () => {
    if (deleteStep < 2) {
      setDeleteStep(s => s + 1);
      return;
    }
    // step === 2 → this is the 3rd click → execute
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setDeleteStep(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Character info card ── */}
      <div className="border border-amber-900/40 bg-amber-950/20 rounded p-4 flex items-center gap-4">
        <div className="text-4xl">
          {account.charRace ? (RACE_EMOJI[account.charRace] || '⚔️') : '⚔️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-bold text-base">
            {account.charName || 'ตัวละครของคุณ'}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {account.charRace || account.charClass
              ? `${account.charRace || '?'} ${account.charClass || '?'} · Lv.${account.charLevel || '?'}`
              : account.charName
                ? `Lv.${account.charLevel || '?'}`
                : '...'}
          </p>
          <div className="flex gap-3 mt-1 text-xs text-gray-500">
            <span>💰 {(account.gold || 0).toLocaleString()} Gold</span>
            <span>💎 {(account.realmPoints || 0).toLocaleString()} RP</span>
          </div>
        </div>
      </div>

      {/* ── Enter game ── */}
      <button onClick={onEnter}
        className="w-full py-3 rounded border border-amber-500 text-amber-300 hover:bg-amber-900/20 transition font-bold tracking-wider text-sm">
        [ เข้าสู่ Ashenveil ]
      </button>

      {/* ── Delete section ── */}
      <div className="border-t border-gray-800 pt-3 space-y-2">
        {deleteStep === 0 ? (
          /* ── Initial delete button (muted, small) ── */
          <button onClick={() => setDeleteStep(1)}
            className="w-full py-1.5 text-gray-700 hover:text-red-700 transition text-xs">
            🗑️ ลบตัวละคร
          </button>
        ) : (
          /* ── Confirmation zone ── */
          <div className="bg-red-950/20 border border-red-900/50 rounded p-3 space-y-2">
            <p className="text-red-400 text-xs font-bold text-center">
              ⚠️ การลบจะไม่สามารถย้อนกลับได้!
            </p>
            <p className="text-red-300 text-xs text-center">
              {CONFIRM_MSGS[deleteStep - 1]}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteStep(0)}
                disabled={deleting}
                className="flex-1 py-1.5 border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition text-xs rounded disabled:opacity-40">
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="flex-1 py-1.5 border border-red-800 text-red-400 hover:bg-red-900/20 transition text-xs rounded disabled:opacity-40 font-bold">
                {deleting ? 'กำลังลบ...' : `ยืนยัน (${deleteStep}/3)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Box wrapper ──────────────────────────────────────────────────────
function Box({ title, children }) {
  return (
    <div className="border border-gray-800 rounded bg-gray-950/80 p-5">
      <div className="border-b border-gray-800 pb-2 mb-4">
        <h2 className="text-amber-500 font-bold tracking-wider text-xs">▸ {title}</h2>
      </div>
      {children}
    </div>
  );
}
