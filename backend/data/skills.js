// data/skills.js — Active skill definitions per class
// Unlocked with skillPoints, used in battle with MP

// damage: multiplier ของ ATK (หรือ MAG ถ้า magicDamage: true)
// selfBuff: buff ตัวเอง ไม่ deal damage
// effect: debuff ใส่ enemy

const CLASS_SKILLS = {

  // ══════════════════════════════════════════
  //  WARRIOR — ถัง + ดาเมจสูง
  // ══════════════════════════════════════════
  warrior: [
    {
      id:             'heavy_strike',
      name:           '⚔️ Heavy Strike',
      desc:           'โจมตีหนักเต็มแรง — ดาเมจ 2× ไม่มีผลพิเศษ',
      mpCost:         15,
      skillPointCost: 1,
      minLevel:       3,
      damage:         2.0,
      magicDamage:    false,
      selfBuff:       null,
      effect:         null,
    },
    {
      id:             'shield_bash',
      name:           '🛡️ Shield Bash',
      desc:           'กระแทกด้วยโล่ — ดาเมจ 1.5× + enemy สตัน 1 เทิร์น (ข้ามการโจมตี)',
      mpCost:         20,
      skillPointCost: 2,
      minLevel:       5,
      damage:         1.5,
      magicDamage:    false,
      selfBuff:       null,
      effect:         { type: 'STUN', duration: 1 },
    },
    {
      id:             'berserk',
      name:           '🔥 Berserk',
      desc:           'เข้าสู่สถานะ Berserk — ATK +60%, DEF -30% เป็นเวลา 3 เทิร์น',
      mpCost:         25,
      skillPointCost: 3,
      minLevel:       8,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { atkMult: 1.6, defMult: 0.7, duration: 3 },
      effect:         null,
    },
  ],

  // ══════════════════════════════════════════
  //  MAGE — Magic DPS สูง
  // ══════════════════════════════════════════
  mage: [
    {
      id:             'fireball',
      name:           '🔥 Fireball',
      desc:           'ยิง Fireball — ดาเมจ Magic 2.5× ไม่ถูก DEF ลด',
      mpCost:         20,
      skillPointCost: 1,
      minLevel:       3,
      damage:         2.5,
      magicDamage:    true,
      selfBuff:       null,
      effect:         null,
    },
    {
      id:             'frost_nova',
      name:           '❄️ Frost Nova',
      desc:           'ระเบิดน้ำแข็ง — ดาเมจ Magic 1.8× + ชะลอ enemy (ATK -30%) 2 เทิร์น',
      mpCost:         25,
      skillPointCost: 2,
      minLevel:       5,
      damage:         1.8,
      magicDamage:    true,
      selfBuff:       null,
      effect:         { type: 'SLOW', atkMult: 0.7, duration: 2 },
    },
    {
      id:             'arcane_burst',
      name:           '✨ Arcane Burst',
      desc:           'ระเบิดพลังลึกลับ — ดาเมจ Magic 4× ใช้ MP เยอะ',
      mpCost:         40,
      skillPointCost: 3,
      minLevel:       8,
      damage:         4.0,
      magicDamage:    true,
      selfBuff:       null,
      effect:         null,
    },
  ],

  // ══════════════════════════════════════════
  //  ARCHER — ความเร็ว + Debuff
  // ══════════════════════════════════════════
  archer: [
    {
      id:             'quick_shot',
      name:           '🏹 Quick Shot',
      desc:           'ยิงเร็ว — ดาเมจ 1.5× โจมตีก่อน enemy เสมอในเทิร์นนั้น',
      mpCost:         10,
      skillPointCost: 1,
      minLevel:       3,
      damage:         1.5,
      magicDamage:    false,
      goFirst:        true,
      selfBuff:       null,
      effect:         null,
    },
    {
      id:             'poison_arrow',
      name:           '☠️ Poison Arrow',
      desc:           'ลูกศรพิษ — ดาเมจ 1× + พิษ 8 ดาเมจ/เทิร์น เป็นเวลา 4 เทิร์น',
      mpCost:         18,
      skillPointCost: 2,
      minLevel:       5,
      damage:         1.0,
      magicDamage:    false,
      selfBuff:       null,
      effect:         { type: 'POISON', dmgPerTurn: 8, duration: 4 },
    },
    {
      id:             'eagle_eye',
      name:           '🦅 Eagle Eye',
      desc:           'จับจ้องจุดอ่อน — Crit +40% เป็นเวลา 3 เทิร์น',
      mpCost:         20,
      skillPointCost: 3,
      minLevel:       8,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { critBonus: 0.4, duration: 3 },
      effect:         null,
    },
  ],
  // ══════════════════════════════════════════
  //  PALADIN — ถัง + รักษา + Holy DPS
  // ══════════════════════════════════════════
  paladin: [
    {
      id:             'holy_strike',
      name:           '✨ Holy Strike',
      desc:           'โจมตีศักดิ์สิทธิ์ — ดาเมจ Magic 1.8× + ทำให้ Enemy BLIND (ATK -40%) 1 เทิร์น',
      mpCost:         18,
      skillPointCost: 1,
      minLevel:       3,
      damage:         1.8,
      magicDamage:    true,
      selfBuff:       null,
      effect:         { type: 'SLOW', atkMult: 0.6, duration: 1 },
    },
    {
      id:             'divine_shield',
      name:           '🛡️ Divine Shield',
      desc:           'โล่ศักดิ์สิทธิ์ — DEF +80% 2 เทิร์น พร้อมฟื้นฟู HP 15%',
      mpCost:         22,
      skillPointCost: 2,
      minLevel:       5,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { defMult: 1.8, healPercent: 0.15, duration: 2 },
      effect:         null,
    },
    {
      id:             'smite',
      name:           '⚡ Smite',
      desc:           'ประณามศักดิ์สิทธิ์ — ดาเมจ Magic 3.5× ไม่ถูก DEF ลด ทะลุเกราะ',
      mpCost:         38,
      skillPointCost: 3,
      minLevel:       8,
      damage:         3.5,
      magicDamage:    true,
      armorPierce:    true, // ไม่ถูก DEF หักลด
      selfBuff:       null,
      effect:         null,
    },
  ],

  // ══════════════════════════════════════════
  //  BERSERKER — Glass Cannon ATK สูงสุด
  // ══════════════════════════════════════════
  berserker: [
    {
      id:             'reckless_assault',
      name:           '💢 Reckless Assault',
      desc:           'โจมตีบ้าระห่ำ — ดาเมจ 3× แต่ DEF ตัวเองลด -20% เป็นเวลา 2 เทิร์น',
      mpCost:         20,
      skillPointCost: 1,
      minLevel:       3,
      damage:         3.0,
      magicDamage:    false,
      selfBuff:       { defMult: 0.8, duration: 2 },
      effect:         null,
    },
    {
      id:             'bloodlust',
      name:           '🩸 Bloodlust',
      desc:           'กระหายเลือด — ดาเมจ 2× และดูดพลังชีวิต 40% ของดาเมจที่ทำ',
      mpCost:         28,
      skillPointCost: 2,
      minLevel:       5,
      damage:         2.0,
      magicDamage:    false,
      lifeSteal:      0.4,  // ฟื้น HP = 40% ของดาเมจ
      selfBuff:       null,
      effect:         null,
    },
    {
      id:             'warcry',
      name:           '📣 Warcry',
      desc:           'กู่ก้องสนามรบ — ATK +100% 2 เทิร์น แต่ DEF -50%',
      mpCost:         30,
      skillPointCost: 3,
      minLevel:       8,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { atkMult: 2.0, defMult: 0.5, duration: 2 },
      effect:         null,
    },
  ],

  // ══════════════════════════════════════════
  //  ROGUE — เร็ว + Crit + Debuff
  // ══════════════════════════════════════════
  rogue: [
    {
      id:             'backstab',
      name:           '🗡️ Backstab',
      desc:           'แทงหลัง — ดาเมจ 2.5× ถ้า Enemy สตัน/ช้า จะเป็น 4× แทน',
      mpCost:         15,
      skillPointCost: 1,
      minLevel:       3,
      damage:         2.5,
      magicDamage:    false,
      bonusVsCC:      { multiplier: 4.0 }, // bonus vs stunned/slowed
      selfBuff:       null,
      effect:         null,
    },
    {
      id:             'smoke_bomb',
      name:           '💨 Smoke Bomb',
      desc:           'ระเบิดควัน — ATK ของ Enemy -60% 2 เทิร์น + โอกาสหนี +50%',
      mpCost:         20,
      skillPointCost: 2,
      minLevel:       5,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { fleeBonus: 0.5, duration: 2 },
      effect:         { type: 'SLOW', atkMult: 0.4, duration: 2 },
    },
    {
      id:             'shadow_step',
      name:           '🌑 Shadow Step',
      desc:           'ก้าวเงา — Crit +50% และ SPD +50% เป็นเวลา 2 เทิร์น',
      mpCost:         25,
      skillPointCost: 3,
      minLevel:       8,
      damage:         0,
      magicDamage:    false,
      selfBuff:       { critBonus: 0.5, spdMult: 1.5, duration: 2 },
      effect:         null,
    },
  ],
};

// ALL classes get 1 passive skill automatically (no unlock needed)
const PASSIVE_SKILLS = {
  warrior:   { id: 'iron_will',     name: '🪨 Iron Will',     desc: 'DEF +10% ตลอดเวลา' },
  mage:      { id: 'mana_flow',     name: '💧 Mana Flow',     desc: 'ฟื้นฟู 5 MP ทุกเทิร์น' },
  archer:    { id: 'keen_senses',   name: '👁️ Keen Senses',   desc: 'Crit rate +5% ตลอดเวลา' },
  paladin:   { id: 'holy_blessing', name: '💚 Holy Blessing',  desc: 'ฟื้นฟู 8 HP ทุกเทิร์น' },
  berserker: { id: 'bloodthirst',   name: '🔥 Bloodthirst',   desc: 'ATK +20% เมื่อ HP เหลือต่ำกว่า 50%' },
  rogue:     { id: 'shadow_veil',   name: '🌑 Shadow Veil',   desc: 'อัตราหนีสำเร็จเพิ่มเป็น 90% เสมอ' },
};

function getClassSkills(className) {
  return CLASS_SKILLS[className?.toLowerCase()] || [];
}

function getSkill(skillId) {
  for (const skills of Object.values(CLASS_SKILLS)) {
    const s = skills.find(s => s.id === skillId);
    if (s) return s;
  }
  return null;
}

function getPassive(className) {
  return PASSIVE_SKILLS[className?.toLowerCase()] || null;
}

module.exports = { CLASS_SKILLS, PASSIVE_SKILLS, getClassSkills, getSkill, getPassive };
