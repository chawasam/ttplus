// lib/bossbattleData.js — Source of truth สำหรับระบบธาตุ Boss Battle
// ใช้ร่วมกันใน widget/bossbattle.js และ pages/bossbattle-guide.js

export const ELEMENTS = {
  neutral: { id: 'neutral', label: 'กลาง', emoji: '⚪', color: '#94a3b8', aura: 'rgba(148,163,184,0.25)', flash: 'rgba(148,163,184,0.18)', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
  fire:    { id: 'fire',    label: 'ไฟ',   emoji: '🔥', color: '#f97316', aura: 'rgba(249,115,22,0.35)',  flash: 'rgba(249,115,22,0.22)',  bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)' },
  water:   { id: 'water',   label: 'น้ำ',  emoji: '💧', color: '#38bdf8', aura: 'rgba(56,189,248,0.35)',  flash: 'rgba(56,189,248,0.22)',  bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)' },
  earth:   { id: 'earth',   label: 'ดิน',  emoji: '🌍', color: '#ca8a04', aura: 'rgba(202,138,4,0.35)',   flash: 'rgba(202,138,4,0.22)',   bg: 'rgba(202,138,4,0.12)',   border: 'rgba(202,138,4,0.35)' },
  wind:    { id: 'wind',    label: 'ลม',   emoji: '🌪️', color: '#34d399', aura: 'rgba(52,211,153,0.35)',  flash: 'rgba(52,211,153,0.22)',  bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)' },
};

// atk → def (ธาตุ atk ชนะธาตุ def)
export const BEATS = { fire: 'earth', water: 'fire', wind: 'water', earth: 'wind' };

// keyword ที่ระบบจับจากชื่อของขวัญ (lowercase)
export const GIFT_KEYWORDS = {
  fire:  ['rose','heart','fire','rocket','sun','flame','love bang','star','firework','bomb','lightning','thunder','dragon','phoenix','hot','glow','spark','passion','blaze'],
  water: ['ice','snow','fish','whale','dolphin','ocean','sea','wave','blue','aqua','rain','drop','penguin','crystal','cool','freeze','water','pool'],
  earth: ['panda','bear','lion','tiger','tree','diamond','crown','gold','mountain','rock','stone','turtle','fossil','gem','kingdom','castle','medal'],
  wind:  ['butterfly','bird','balloon','cloud','sky','flower','leaf','feather','fairy','angel','fly','kite','breeze','wings','wish','dream','spirit'],
};

// ตัวอย่างของขวัญ (สำหรับหน้า guide)
export const EXAMPLE_GIFTS = {
  fire:  ['🌹 Rose','❤️ Heart','🔥 Fire','🚀 Rocket','⭐ Star','💥 Firework','🐉 Dragon','✨ Glow','💣 Bomb','⚡ Lightning'],
  water: ['🧊 Ice','🐟 Fish','🐋 Whale','❄️ Snow','🌊 Wave','🐬 Dolphin','🐧 Penguin','💎 Crystal','🌧️ Rain','🌀 Cool'],
  earth: ['🐼 Panda','🦁 Lion','🐯 Tiger','💎 Diamond','👑 Crown','🏔️ Mountain','🪨 Rock','🐢 Turtle','🥇 Medal','🏰 Castle'],
  wind:  ['🦋 Butterfly','🐦 Bird','🎈 Balloon','☁️ Cloud','🌸 Flower','🍃 Leaf','🧚 Fairy','👼 Angel','🪁 Kite','💫 Wish'],
};

// ── helpers ──────────────────────────────────────────────────────

/** ธาตุที่ชนะ bossElem (effective against) */
export function effectiveAgainst(bossElem) {
  for (const [atk, victim] of Object.entries(BEATS)) if (victim === bossElem) return atk;
  return null;
}

/** ธาตุที่แพ้ bossElem (wrong element → heal) */
export function weakGiftFor(bossElem) { return BEATS[bossElem] || null; }

/** คำนวณประเภทการโจมตี */
export function calcHitType(giftElem, bossElem) {
  if (bossElem === 'neutral' || giftElem === 'neutral') return 'neutral';
  if (giftElem === effectiveAgainst(bossElem)) return 'effective';
  if (giftElem === weakGiftFor(bossElem)) return 'wrong';
  return 'neutral';
}

/** แปลงชื่อของขวัญ → ธาตุ */
export function giftToElement(giftName) {
  if (!giftName) return 'neutral';
  const lower = giftName.toLowerCase();
  for (const [elem, kws] of Object.entries(GIFT_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return elem;
  }
  return 'neutral';
}
