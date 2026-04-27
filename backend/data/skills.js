// data/skills.js — Active skill definitions per class
// Class names match CLASSES_BY_RACE in account.js (lowercase key = char.class.toLowerCase())
//
// damage: multiplier ของ ATK (หรือ MAG ถ้า magicDamage: true)
// selfBuff: buff ตัวเอง ไม่ deal damage
// effect: debuff ใส่ enemy

const CLASS_SKILLS = {

  // ══════════════════════════════════════════
  //  WARRIOR (HUMAN) — ถัง + ดาเมจสูง
  // ══════════════════════════════════════════
  warrior: [
    {
      id: 'heavy_strike', name: '⚔️ Heavy Strike',
      desc: 'โจมตีหนักเต็มแรง — ดาเมจ 2× ไม่มีผลพิเศษ',
      mpCost: 15, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: false, selfBuff: null, effect: null,
    },
    {
      id: 'shield_bash', name: '🛡️ Shield Bash',
      desc: 'กระแทกด้วยโล่ — ดาเมจ 1.5× + enemy สตัน 1 เทิร์น',
      mpCost: 20, skillPointCost: 2, minLevel: 5,
      damage: 1.5, magicDamage: false, selfBuff: null,
      effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'battle_cry', name: '📣 Battle Cry',
      desc: 'กู่ร้องสนามรบ — ATK +60%, DEF -30% เป็นเวลา 3 เทิร์น',
      mpCost: 25, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.6, defMult: 0.7, duration: 3 }, effect: null,
    },

    {
      id: 'counter_stance', name: '🛡️ Counter Stance',
      desc: 'ท่าโต้กลับ — DEF +60% 2 เทิร์น และโต้กลับการโจมตีถัดไป 1.8×',
      mpCost: 25, skillPointCost: 4, minLevel: 10,
      damage: 1.8, magicDamage: false,
      selfBuff: { defMult: 1.6, duration: 2 }, effect: null,
    },
    {
      id: 'blade_flurry', name: '⚔️ Blade Flurry',
      desc: 'ฟันพายุ — ดาเมจ 1.6× โจมตี 3 ครั้ง',
      mpCost: 30, skillPointCost: 5, minLevel: 15,
      damage: 1.6, magicDamage: false, multiHit: 3,
      selfBuff: null, effect: null,
    },
    {
      id: 'iron_fortress', name: '🏰 Iron Fortress',
      desc: 'ป้อมเหล็ก — DEF +150% 1 เทิร์น + ฟื้นฟู HP 20%',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.5, healPercent: 0.2, duration: 1 }, effect: null,
    },
    {
      id: 'titan_cleave', name: '💥 Titan Cleave',
      desc: 'ฟันไททัน — ดาเมจ 3.0× ทะลุ DEF + สตัน 1 เทิร์น',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 3.0, magicDamage: false, armorPierce: true,
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'last_stand', name: '🔥 Last Stand',
      desc: 'ยืนหยัดสุดท้าย — ATK +80% DEF +80% เป็นเวลา 3 เทิร์น แต่เสีย HP 15%',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 0, magicDamage: false,
      selfCost: { hpPercent: 0.15 },
      selfBuff: { atkMult: 1.8, defMult: 1.8, duration: 3 }, effect: null,
    },
    {
      id: 'unstoppable_force', name: '🌪️ Unstoppable Force',
      desc: 'พลังที่ยับยั้งไม่ได้ — ดาเมจ 3.5× Crit อัตโนมัติ + ATK +60% 3 เทิร์น',
      mpCost: 60, skillPointCost: 9, minLevel: 65,
      damage: 3.5, magicDamage: false, forceCrit: true,
      selfBuff: { atkMult: 1.6, duration: 3 }, effect: null,
    },
    {
      id: 'judgment_of_steel', name: '⚜️ Judgment of Steel',
      desc: '【Signature】ดาเมจ 5.0× ทะลุ DEF ทั้งหมด + สตัน 2 เทิร์น — ทำลายล้างไม่ยั้ง',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: false, forceCrit: true, armorPierce: true,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  ROGUE (HUMAN) — เร็ว + Crit + Debuff
  // ══════════════════════════════════════════
  rogue: [
    {
      id: 'backstab', name: '🗡️ Backstab',
      desc: 'แทงหลัง — ดาเมจ 2.5× ถ้า Enemy สตัน/ช้า จะเป็น 4× แทน',
      mpCost: 15, skillPointCost: 1, minLevel: 3,
      damage: 2.5, magicDamage: false,
      bonusVsCC: { multiplier: 4.0 }, selfBuff: null, effect: null,
    },
    {
      id: 'smoke_bomb', name: '💨 Smoke Bomb',
      desc: 'ระเบิดควัน — ATK ของ Enemy -60% 2 เทิร์น + โอกาสหนีสูงขึ้น',
      mpCost: 20, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false,
      selfBuff: { fleeBonus: 0.5, duration: 2 },
      effect: { type: 'SLOW', atkMult: 0.4, duration: 2 },
    },
    {
      id: 'shadow_step', name: '🌑 Shadow Step',
      desc: 'ก้าวเงา — Crit +50% และ SPD +50% เป็นเวลา 2 เทิร์น',
      mpCost: 25, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { critBonus: 0.5, spdMult: 1.5, duration: 2 }, effect: null,
    },

    {
      id: 'throat_slash', name: '🗡️ Throat Slash',
      desc: 'กรีดคอ — ดาเมจ 2.0× + เลือดไหล 8/เทิร์น 4 เทิร์น',
      mpCost: 22, skillPointCost: 4, minLevel: 10,
      damage: 2.0, magicDamage: false,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 8, duration: 4 },
    },
    {
      id: 'vanish', name: '🌫️ Vanish',
      desc: 'หายตัว — หลบการโจมตีถัดไป + โจมตีถัดไป Crit อัตโนมัติ + ดาเมจ +50%',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { dodgeNext: 1, forceCritCount: 1, atkMult: 1.5, duration: 2 }, effect: null,
    },
    {
      id: 'poison_shiv', name: '☠️ Poison Shiv',
      desc: 'มีดพิษ — ดาเมจ 1.5× + พิษ 15/เทิร์น 5 เทิร์น + ชะลอ ATK -40% 2 เทิร์น',
      mpCost: 32, skillPointCost: 6, minLevel: 25,
      damage: 1.5, magicDamage: false,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 15, duration: 5, slowAtkMult: 0.6, slowDuration: 2 },
    },
    {
      id: 'twin_fangs', name: '🐍 Twin Fangs',
      desc: 'เขี้ยวคู่ — ดาเมจ 2.0× โจมตี 2 ครั้ง ถ้า Enemy สตัน/ช้า แต่ละครั้งเป็น 3.5×',
      mpCost: 38, skillPointCost: 7, minLevel: 35,
      damage: 2.0, magicDamage: false, multiHit: 2,
      bonusVsCC: { multiplier: 3.5 },
      selfBuff: null, effect: null,
    },
    {
      id: 'assassinate', name: '💀 Assassinate',
      desc: 'ลอบสังหาร — ดาเมจ 3.5× Crit อัตโนมัติ + ทะลุ DEF',
      mpCost: 48, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: false, forceCrit: true, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'shadow_clone', name: '🌑 Shadow Clone',
      desc: 'โคลนเงา — Crit +70%, SPD +80%, หลบ 2 ครั้ง เป็นเวลา 3 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { critBonus: 0.7, spdMult: 1.8, dodgeCount: 2, duration: 3 }, effect: null,
    },
    {
      id: 'deathmark', name: '☠️ Deathmark',
      desc: '【Signature】ดาเมจ 5.5× Crit อัตโนมัติ ทะลุ DEF — ถ้า Enemy HP < 40% เป็น 8.0× แทน',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: false, forceCrit: true, armorPierce: true,
      executeBonus: { threshold: 0.4, multiplier: 8.0 },
      selfBuff: null, effect: null,
    },
    ],

  // ══════════════════════════════════════════
  //  CLERIC (HUMAN) — รักษา + Holy
  // ══════════════════════════════════════════
  cleric: [
    {
      id: 'sacred_light', name: '💚 Sacred Light',
      desc: 'แสงศักดิ์สิทธิ์ — ฟื้นฟู HP 30% ของ hpMax',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.30, duration: 1 }, effect: null,
    },
    {
      id: 'holy_nova', name: '✨ Holy Nova',
      desc: 'ระเบิดแสงศักดิ์สิทธิ์ — ดาเมจ Magic 2.0× + สตัน Enemy 1 เทิร์น [+60% vs Undead/Demon]',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 2.0, magicDamage: true, selfBuff: null,
      bonusVsType: ['undead', 'demon'], bonusMult: 1.6,
      element: 'holy',
      effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'divine_intervention', name: '⚡ Divine Intervention',
      desc: 'การแทรกแซงของพระเจ้า — ฟื้นฟู HP 50% ของ hpMax + ATK +40% 2 เทิร์น',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.50, atkMult: 1.4, duration: 2 }, effect: null,
    },

    {
      id: 'holy_shield', name: '✝️ Holy Shield',
      desc: 'โล่ศักดิ์สิทธิ์ — DEF +80% 2 เทิร์น + ฟื้นฟู HP 15%/เทิร์น',
      mpCost: 25, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.8, hpRegenPerTurn: 15, duration: 2 }, effect: null,
    },
    {
      id: 'radiant_strike', name: '🌟 Radiant Strike',
      desc: 'โจมตีแสงสว่าง — ดาเมจ Magic 2.5× ดูด HP 30% ของดาเมจ [+60% vs Undead/Demon]',
      mpCost: 30, skillPointCost: 5, minLevel: 15,
      damage: 2.5, magicDamage: true, lifeSteal: 0.3, element: 'holy',
      bonusVsType: ['undead', 'demon'],
      bonusMult: 1.6,
      selfBuff: null, effect: null,
    },
    {
      id: 'consecration', name: '🔆 Consecration',
      desc: 'ทำพื้นที่ศักดิ์สิทธิ์ — ดาเมจ Magic 2.0× + เผาพิษศักดิ์สิทธิ์ 12/เทิร์น 4 เทิร์น [+80% vs Undead/Demon]',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 2.0, magicDamage: true, element: 'holy',
      bonusVsType: ['undead', 'demon'],
      bonusMult: 1.8,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 12, duration: 4 },
    },
    {
      id: 'mass_heal', name: '💖 Mass Heal',
      desc: 'รักษามหาศาล — ฟื้นฟู HP 60% ของ hpMax',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.6, duration: 1 }, effect: null,
    },
    {
      id: 'banishment', name: '⚡ Banishment',
      desc: 'ขับไล่ — ดาเมจ Magic 3.5× [+100% vs Undead/Demon] + สตัน 2 เทิร์น',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: true, element: 'holy',
      bonusVsType: ['undead', 'demon'],
      bonusMult: 2.0,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'holy_armor', name: '🛡️ Holy Armor',
      desc: 'เกราะศักดิ์สิทธิ์ — DEF +150% 3 เทิร์น + ฟื้นฟู HP 8%/เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.5, hpRegenPerTurn: 8, duration: 3 }, effect: null,
    },
    {
      id: 'divine_wrath', name: '☀️ Divine Wrath',
      desc: '【Signature】ดาเมจ Magic 5.0× Holy + สตัน 2 เทิร์น + ฟื้นฟู HP 40% หลังโจมตี [+120% vs Undead/Demon]',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, element: 'holy',
      bonusVsType: ['undead', 'demon'],
      bonusMult: 2.2,
      selfBuff: { healPercent: 0.4, duration: 1 }, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  RANGER (ELVEN) — ความเร็ว + Debuff + ธรรมชาติ
  // ══════════════════════════════════════════
  ranger: [
    {
      id: 'precise_shot', name: '🏹 Precise Shot',
      desc: 'ยิงแม่นยำ — ดาเมจ 2.0× โจมตีก่อน enemy เสมอในเทิร์นนั้น',
      mpCost: 12, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: false, goFirst: true, selfBuff: null, effect: null,
    },
    {
      id: 'poison_arrow', name: '☠️ Poison Arrow',
      desc: 'ลูกศรพิษ — ดาเมจ 1.2× + พิษ 10 ดาเมจ/เทิร์น เป็นเวลา 4 เทิร์น [+40% vs Beast]',
      mpCost: 18, skillPointCost: 2, minLevel: 5,
      damage: 1.2, magicDamage: false, selfBuff: null,
      bonusVsType: ['beast'], bonusMult: 1.4,
      effect: { type: 'POISON', dmgPerTurn: 10, duration: 4 },
    },
    {
      id: 'eagle_eye', name: '🦅 Eagle Eye',
      desc: 'ตาอินทรี — Crit +40% เป็นเวลา 3 เทิร์น + SPD +20%',
      mpCost: 22, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { critBonus: 0.4, spdMult: 1.2, duration: 3 }, effect: null,
    },

    {
      id: 'rain_of_arrows', name: '🌧️ Rain of Arrows',
      desc: 'ฝนลูกศร — ดาเมจ 1.5× โจมตี 3 ครั้ง',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 1.5, magicDamage: false, multiHit: 3,
      selfBuff: null, effect: null,
    },
    {
      id: 'crippling_shot', name: '🏹 Crippling Shot',
      desc: 'ยิงพิการ — ดาเมจ 2.0× + DEF ของ Enemy -60% 3 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 2.0, magicDamage: false,
      selfBuff: null, effect: { type: 'MARKED', defMult: 0.4, duration: 3 },
    },
    {
      id: 'explosive_arrow', name: '💥 Explosive Arrow',
      desc: 'ลูกศรระเบิด — ดาเมจ 2.5× ไฟ + สตัน Enemy 1 เทิร์น',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: false, element: 'fire',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'natures_wrath', name: "🌿 Nature's Wrath",
      desc: 'ความพิโรธแห่งธรรมชาติ — ดาเมจ Magic 3.0× + พิษ 12/เทิร์น 5 เทิร์น [+60% vs Beast]',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 3.0, magicDamage: true, element: 'nature',
      bonusVsType: ['beast'],
      bonusMult: 1.6,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 12, duration: 5 },
    },
    {
      id: 'hawk_dive', name: '🦅 Hawk Dive',
      desc: 'พุ่งนกอินทรี — ดาเมจ 3.5× โจมตีก่อนเสมอ Crit อัตโนมัติ',
      mpCost: 48, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: false, forceCrit: true, goFirst: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'barrage', name: '🔥 Barrage',
      desc: 'ยิงถล่ม — ดาเมจ 1.5× โจมตี 4 ครั้ง',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 1.5, magicDamage: false, multiHit: 4,
      selfBuff: null, effect: null,
    },
    {
      id: 'arrow_of_judgment', name: '⚡ Arrow of Judgment',
      desc: '【Signature】ดาเมจ 5.0× ทะลุ DEF ทั้งหมด + พิษ 20/เทิร์น 4 เทิร์น โจมตีก่อนเสมอ',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: false, forceCrit: true, goFirst: true, armorPierce: true,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 20, duration: 4 },
    },
    ],

  // ══════════════════════════════════════════
  //  MAGE (ELVEN) — Magic DPS สูง
  // ══════════════════════════════════════════
  mage: [
    {
      id: 'fireball', name: '🔥 Fireball',
      desc: 'ยิง Fireball — ดาเมจ Magic 2.5× ไม่ถูก DEF ลด [+50% vs Beast/Construct]',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.5, magicDamage: true, selfBuff: null,
      bonusVsType: ['beast', 'construct'], bonusMult: 1.5,
      element: 'fire',
      effect: null,
    },
    {
      id: 'frost_nova', name: '❄️ Frost Nova',
      desc: 'ระเบิดน้ำแข็ง — ดาเมจ Magic 1.8× + ชะลอ enemy (ATK -30%) 2 เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 1.8, magicDamage: true, selfBuff: null,
      element: 'ice',
      effect: { type: 'SLOW', atkMult: 0.7, duration: 2 },
    },
    {
      id: 'arcane_burst', name: '✨ Arcane Burst',
      desc: 'ระเบิดพลังลึกลับ — ดาเมจ Magic 4× ใช้ MP เยอะ',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.0, magicDamage: true, selfBuff: null,
      element: 'arcane',
      effect: null,
    },

    {
      id: 'thunder_bolt', name: '⚡ Thunder Bolt',
      desc: 'สายฟ้าฟาด — ดาเมจ Magic 2.0× สายฟ้า + ชะลอ ATK -30% 2 เทิร์น',
      mpCost: 25, skillPointCost: 4, minLevel: 10,
      damage: 2.0, magicDamage: true, element: 'lightning',
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.7, duration: 2 },
    },
    {
      id: 'mana_shield', name: '💧 Mana Shield',
      desc: 'โล่มานา — DEF +100% 2 เทิร์น + MAG +30%',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.0, magMult: 1.3, duration: 2 }, effect: null,
    },
    {
      id: 'blizzard', name: '🌨️ Blizzard',
      desc: 'พายุหิมะ — ดาเมจ Magic 2.5× น้ำแข็ง + ชะลอ ATK -50% 3 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: true, element: 'ice',
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.5, duration: 3 },
    },
    {
      id: 'meteor', name: '☄️ Meteor',
      desc: 'อุกาบาต — ดาเมจ Magic 3.5× ไฟ + สตัน 1 เทิร์น',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 3.5, magicDamage: true, element: 'fire',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'arcane_overload', name: '🔮 Arcane Overload',
      desc: 'โอเวอร์โหลด Arcane — ดาเมจ Magic 3.0× + MAG +60% 3 เทิร์น',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.0, magicDamage: true, element: 'arcane',
      selfBuff: { magMult: 1.6, duration: 3 }, effect: null,
    },
    {
      id: 'spellstorm', name: '🌀 Spellstorm',
      desc: 'พายุมนต์ — ดาเมจ Magic 2.0× โจมตี 3 ครั้ง ทะลุ DEF',
      mpCost: 60, skillPointCost: 9, minLevel: 65,
      damage: 2.0, magicDamage: true, multiHit: 3, armorPierce: true, element: 'arcane',
      selfBuff: null, effect: null,
    },
    {
      id: 'void_collapse', name: '🌌 Void Collapse',
      desc: '【Signature】ดาเมจ Magic 5.5× ทะลุ DEF ทั้งหมด + สตัน 2 เทิร์น — ความว่างเปล่าครอบงำ',
      mpCost: 80, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  BARD (ELVEN) — Support + Debuff
  // ══════════════════════════════════════════
  bard: [
    {
      id: 'battle_hymn', name: '🎵 Battle Hymn',
      desc: 'เพลงสงคราม — ATK +40% เป็นเวลา 3 เทิร์น + ฟื้นฟู 5 MP',
      mpCost: 15, skillPointCost: 1, minLevel: 3,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.4, mpRestore: 5, duration: 3 }, effect: null,
    },
    {
      id: 'dissonance', name: '🔇 Dissonance',
      desc: 'เสียงรบกวน — ATK ของ Enemy -50% เป็นเวลา 3 เทิร์น',
      mpCost: 22, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.5, duration: 3 },
    },
    {
      id: 'encore', name: '🎶 Encore',
      desc: 'บทเพลงสุดท้าย — ดาเมจ Magic 2.5× + ฟื้นฟู 15 MP',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 2.5, magicDamage: true,
      selfBuff: { mpRestore: 15, duration: 1 }, effect: null,
    },

    {
      id: 'heroic_verse', name: '🎵 Heroic Verse',
      desc: 'บทกวีวีรบุรุษ — ATK +60%, SPD +30% เป็นเวลา 3 เทิร์น',
      mpCost: 22, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.6, spdMult: 1.3, duration: 3 }, effect: null,
    },
    {
      id: 'lullaby', name: '💤 Lullaby',
      desc: 'บทเพลงกล่อม — สตัน Enemy 2 เทิร์น (ไม่ทำดาเมจ)',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'battle_elegy', name: '🎶 Battle Elegy',
      desc: 'บทเพลงสงคราม — ดาเมจ Magic 2.5× + ฟื้นฟู 20 MP',
      mpCost: 20, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: true,
      selfBuff: { mpRestore: 20, duration: 1 }, effect: null,
    },
    {
      id: 'discordant_shriek', name: '🔊 Discordant Shriek',
      desc: 'กรีดร้องไม่สอดคล้อง — ATK ของ Enemy -70%, DEF -30% 3 เทิร์น',
      mpCost: 38, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.3, defMult: 0.7, duration: 3 },
    },
    {
      id: 'power_ballad', name: '🎸 Power Ballad',
      desc: 'บัลลาดพลัง — ATK +80%, MAG +60% 3 เทิร์น + ฟื้นฟู 15 MP',
      mpCost: 35, skillPointCost: 8, minLevel: 50,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.8, magMult: 1.6, mpRestore: 15, duration: 3 }, effect: null,
    },
    {
      id: 'grand_finale', name: '🎭 Grand Finale',
      desc: 'จุดไคลแมกซ์ — ดาเมจ Magic 3.5× + สตัน 2 เทิร์น + ฟื้นฟู 30 MP',
      mpCost: 45, skillPointCost: 9, minLevel: 65,
      damage: 3.5, magicDamage: true,
      selfBuff: { mpRestore: 30, duration: 1 }, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'song_of_oblivion', name: '🌌 Song of Oblivion',
      desc: '【Signature】ดาเมจ Magic 5.0× + ATK ของ Enemy -80% 4 เทิร์น + ฟื้นฟู 40 MP — เพลงแห่งการสูญสลาย',
      mpCost: 70, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true,
      selfBuff: { mpRestore: 40, duration: 1 }, effect: { type: 'SLOW', atkMult: 0.2, duration: 4 },
    },
    ],

  // ══════════════════════════════════════════
  //  BERSERKER (DWARF) — Glass Cannon ATK สูงสุด
  // ══════════════════════════════════════════
  berserker: [
    {
      id: 'reckless_assault', name: '💢 Reckless Assault',
      desc: 'โจมตีบ้าระห่ำ — ดาเมจ 3× แต่ DEF ตัวเองลด -20% เป็นเวลา 2 เทิร์น',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 3.0, magicDamage: false,
      selfBuff: { defMult: 0.8, duration: 2 }, effect: null,
    },
    {
      id: 'bloodlust', name: '🩸 Bloodlust',
      desc: 'กระหายเลือด — ดาเมจ 2× และดูดพลังชีวิต 40% ของดาเมจที่ทำ',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 2.0, magicDamage: false, lifeSteal: 0.4,
      selfBuff: null, effect: null,
    },
    {
      id: 'warcry', name: '📣 Warcry',
      desc: 'กู่ก้องสนามรบ — ATK +100% 2 เทิร์น แต่ DEF -50%',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 2.0, defMult: 0.5, duration: 2 }, effect: null,
    },

    {
      id: 'frenzied_strike', name: '💢 Frenzied Strike',
      desc: 'ฟันบ้าคลั่ง — ดาเมจ 2.5× Crit +40%, DEF ตัวเอง -30% 2 เทิร์น',
      mpCost: 25, skillPointCost: 4, minLevel: 10,
      damage: 2.5, magicDamage: false,
      selfBuff: { critBonus: 0.4, defMult: 0.7, duration: 2 }, effect: null,
    },
    {
      id: 'blood_frenzy', name: '🩸 Blood Frenzy',
      desc: 'คลั่งเลือด — ATK +100% 3 เทิร์น แต่เสีย HP 8%/เทิร์น',
      mpCost: 30, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 2.0, hpCostPerTurn: 0.08, duration: 3 }, effect: null,
    },
    {
      id: 'devastate', name: '💥 Devastate',
      desc: 'ทำลายล้าง — ดาเมจ 3.0× + DEF ตัวเอง -30% 2 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: false,
      selfBuff: { defMult: 0.7, duration: 2 }, effect: null,
    },
    {
      id: 'death_charge', name: '⚡ Death Charge',
      desc: 'พุ่งมรณะ — ดาเมจ 3.5× โจมตีก่อนเสมอ + สตัน 1 เทิร์น',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 3.5, magicDamage: false, goFirst: true,
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'rampage', name: '🔥 Rampage',
      desc: 'คลุ้มคลั่ง — ดาเมจ 2.0× โจมตี 3 ครั้ง ดูด HP 30% ของดาเมจ',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 2.0, magicDamage: false, multiHit: 3, lifeSteal: 0.3,
      selfBuff: null, effect: null,
    },
    {
      id: 'berserkers_rage', name: "😡 Berserker's Rage",
      desc: 'ความโกรธแค้น — ATK +150% 2 เทิร์น แต่ DEF -60%',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 2.5, defMult: 0.4, duration: 2 }, effect: null,
    },
    {
      id: 'world_ender', name: '🌋 World Ender',
      desc: '【Signature】ดาเมจ 5.5× Crit อัตโนมัติ — เสีย HP 20% ก่อนโจมตี ทุบทำลายทุกอย่าง',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: false, forceCrit: true,
      selfCost: { hpPercent: 0.2 },
      selfBuff: null, effect: null,
    },
    ],

  // ══════════════════════════════════════════
  //  ENGINEER (DWARF) — กลไก + DEF
  // ══════════════════════════════════════════
  engineer: [
    {
      id: 'deploy_turret', name: '⚙️ Deploy Turret',
      desc: 'ติดตั้งหอคอย — ดาเมจ 1.5× + พิษกล 10/เทิร์น 3 เทิร์น',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 1.5, magicDamage: false, selfBuff: null,
      effect: { type: 'POISON', dmgPerTurn: 10, duration: 3 },
    },
    {
      id: 'repair_kit', name: '🔧 Repair Kit',
      desc: 'ชุดซ่อมแซม — ฟื้นฟู HP 30% และ DEF +40% 2 เทิร์น',
      mpCost: 22, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.30, defMult: 1.4, duration: 2 }, effect: null,
    },
    {
      id: 'explosive_shot', name: '💣 Explosive Shot',
      desc: 'กระสุนระเบิด — ดาเมจ 2.5× + สตัน Enemy 1 เทิร์น',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 2.5, magicDamage: false, selfBuff: null,
      element: 'fire',
      effect: { type: 'STUN', duration: 1 },
    },

    {
      id: 'overclocked_turret', name: '⚙️ Overclocked Turret',
      desc: 'หอคอยโอเวอร์คล็อก — ดาเมจ 1.5× + พิษกล 15/เทิร์น 4 เทิร์น',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 1.5, magicDamage: false,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 15, duration: 4 },
    },
    {
      id: 'barrier', name: '🔒 Barrier',
      desc: 'กำแพงป้องกัน — DEF +150% 1 เทิร์น + ฟื้นฟู HP 25%',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.5, healPercent: 0.25, duration: 1 }, effect: null,
    },
    {
      id: 'napalm_bomb', name: '🔥 Napalm Bomb',
      desc: 'ระเบิดนาปาล์ม — ดาเมจ 2.5× ไฟ + เผาไหม้ 12/เทิร์น 3 เทิร์น',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: false, element: 'fire',
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 12, duration: 3 },
    },
    {
      id: 'mechanical_golem', name: '🤖 Mechanical Golem',
      desc: 'โกเล็มกล — DEF +60%, ATK +40% เป็นเวลา 3 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.6, atkMult: 1.4, duration: 3 }, effect: null,
    },
    {
      id: 'charged_shot', name: '⚡ Charged Shot',
      desc: 'ยิงชาร์จ — ดาเมจ 3.5× + สตัน Enemy 2 เทิร์น',
      mpCost: 48, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'fortress_mode', name: '🏰 Fortress Mode',
      desc: 'โหมดป้อมปราการ — DEF +200% 2 เทิร์น + ฟื้นฟู HP 30%',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 3.0, healPercent: 0.3, duration: 2 }, effect: null,
    },
    {
      id: 'nuclear_strike', name: '☢️ Nuclear Strike',
      desc: '【Signature】ดาเมจ Magic 5.0× ไฟ/ระเบิด + สตัน 2 เทิร์น + เผา 20/เทิร์น 4 เทิร์น',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, element: 'fire',
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 20, duration: 4 },
    },
    ],

  // ══════════════════════════════════════════
  //  RUNESMITH (DWARF) — Rune buff + Magic-Physical
  // ══════════════════════════════════════════
  runesmith: [
    {
      id: 'rune_strike', name: '🔮 Rune Strike',
      desc: 'โจมตีพลังรูน — ดาเมจ 2.0× (ผสม Physical + Magic ทะลุ DEF บางส่วน) [+50% vs Construct]',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: false, armorPierce: true,
      bonusVsType: ['construct'], bonusMult: 1.5,
      element: 'lightning',
      selfBuff: null, effect: null,
    },
    {
      id: 'runic_ward', name: '🛡️ Runic Ward',
      desc: 'กำแพงรูน — DEF +80% เป็นเวลา 3 เทิร์น',
      mpCost: 22, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.8, duration: 3 }, effect: null,
    },
    {
      id: 'empowered_rune', name: '⚡ Empowered Rune',
      desc: 'รูนทรงพลัง — ATK +50% และ MAG +50% เป็นเวลา 2 เทิร์น',
      mpCost: 32, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.5, magMult: 1.5, duration: 2 }, effect: null,
    },

    {
      id: 'rune_blade', name: '⚡ Rune Blade',
      desc: 'ใบมีดรูน — ดาเมจ 2.5× สายฟ้า ทะลุ DEF [+50% vs Construct]',
      mpCost: 26, skillPointCost: 4, minLevel: 10,
      damage: 2.5, magicDamage: false, armorPierce: true, element: 'lightning',
      bonusVsType: ['construct'],
      bonusMult: 1.5,
      selfBuff: null, effect: null,
    },
    {
      id: 'mana_rune', name: '💧 Mana Rune',
      desc: 'รูนมานา — ฟื้นฟู 25 MP + ATK +30%, MAG +30% 2 เทิร์น',
      mpCost: 15, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { mpRestore: 25, atkMult: 1.3, magMult: 1.3, duration: 2 }, effect: null,
    },
    {
      id: 'rune_burst', name: '💥 Rune Burst',
      desc: 'ระเบิดรูน — ดาเมจ Magic 3.0× สายฟ้า + สตัน 1 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: true, element: 'lightning',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'enchanted_armor', name: '🛡️ Enchanted Armor',
      desc: 'เกราะมนตร์ — DEF +100%, ATK +50% เป็นเวลา 3 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.0, atkMult: 1.5, duration: 3 }, effect: null,
    },
    {
      id: 'rune_storm', name: '⛈️ Rune Storm',
      desc: 'พายุรูน — ดาเมจ Magic 2.0× สายฟ้า โจมตี 3 ครั้ง',
      mpCost: 48, skillPointCost: 8, minLevel: 50,
      damage: 2.0, magicDamage: true, multiHit: 3, element: 'lightning',
      selfBuff: null, effect: null,
    },
    {
      id: 'rune_overdrive', name: '⚡ Rune Overdrive',
      desc: 'รูนโอเวอร์ไดรฟ์ — ATK +80%, MAG +80% เป็นเวลา 3 เทิร์น, DEF -20%',
      mpCost: 55, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.8, magMult: 1.8, defMult: 0.8, duration: 3 }, effect: null,
    },
    {
      id: 'runic_annihilation', name: '🌩️ Runic Annihilation',
      desc: '【Signature】ดาเมจ Magic 5.0× สายฟ้า ทะลุ DEF + สตัน 2 เทิร์น [+100% vs Construct]',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, armorPierce: true, element: 'lightning',
      bonusVsType: ['construct'],
      bonusMult: 2.0,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  ASSASSIN (SHADE) — Burst สูง + Execute
  // ══════════════════════════════════════════
  assassin: [
    {
      id: 'shadow_strike', name: '🗡️ Shadow Strike',
      desc: 'โจมตีจากเงา — ดาเมจ 3.5× Crit อัตโนมัติ',
      mpCost: 22, skillPointCost: 1, minLevel: 3,
      damage: 3.5, magicDamage: false, forceCrit: true,
      element: 'shadow',
      selfBuff: null, effect: null,
    },
    {
      id: 'crippling_blow', name: '💀 Crippling Blow',
      desc: 'ฟาดทำลาย — ดาเมจ 2.0× + ลด SPD Enemy -50% 3 เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 2.0, magicDamage: false, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.5, duration: 3 },
    },
    {
      id: 'execute', name: '⚰️ Execute',
      desc: 'ประหาร — ดาเมจ 2.0× ถ้า Enemy HP < 30% → 6.0× แทน',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 2.0, magicDamage: false,
      executeBonus: { threshold: 0.3, multiplier: 6.0 },
      selfBuff: null, effect: null,
    },

    {
      id: 'nerve_strike', name: '💀 Nerve Strike',
      desc: 'ฟันเส้นประสาท — ดาเมจ 2.0× + สตัน Enemy 2 เทิร์น',
      mpCost: 26, skillPointCost: 4, minLevel: 10,
      damage: 2.0, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'shadow_meld', name: '🌑 Shadow Meld',
      desc: 'ซ่อนในเงา — หลบการโจมตีถัดไป + Crit +80% 2 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { dodgeNext: 1, critBonus: 0.8, duration: 2 }, effect: null,
    },
    {
      id: 'thousand_cuts', name: '🗡️ Thousand Cuts',
      desc: 'หนึ่งพันแผล — ดาเมจ 1.2× โจมตี 4 ครั้ง ทะลุ DEF',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 1.2, magicDamage: false, multiHit: 4, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'mark_for_death', name: '☠️ Mark for Death',
      desc: 'ตราตาย — DEF ของ Enemy -80% เป็นเวลา 3 เทิร์น',
      mpCost: 38, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'MARKED', defMult: 0.2, duration: 3 },
    },
    {
      id: 'lethal_strike', name: '💎 Lethal Strike',
      desc: 'โจมตีสังหาร — ดาเมจ 4.0× Crit อัตโนมัติ ทะลุ DEF ทั้งหมด',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 4.0, magicDamage: false, forceCrit: true, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'death_blossom', name: '🌸 Death Blossom',
      desc: 'ดอกไม้แห่งความตาย — ดาเมจ 2.5× โจมตี 2 ครั้ง Crit อัตโนมัติทุกครั้ง',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 2.5, magicDamage: false, multiHit: 2, forceCrit: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'final_execution', name: '⚰️ Final Execution',
      desc: '【Signature】ดาเมจ 5.5× Shadow Crit อัตโนมัติ ทะลุ DEF — ถ้า Enemy HP < 50% เป็น 8.5× แทน',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: false, forceCrit: true, armorPierce: true, element: 'shadow',
      executeBonus: { threshold: 0.5, multiplier: 8.5 },
      selfBuff: null, effect: null,
    },
    ],

  // ══════════════════════════════════════════
  //  HEXBLADE (SHADE) — Curse + Life Drain
  // ══════════════════════════════════════════
  hexblade: [
    {
      id: 'hex_bolt', name: '💜 Hex Bolt',
      desc: 'ลูกธนูสาป — ดาเมจ Magic 2.0× + CURSE 3 เทิร์น',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: true, selfBuff: null,
      effect: { type: 'CURSE', duration: 3, dmgPerTurn: 10 },
    },
    {
      id: 'drain_life', name: '🩸 Drain Life',
      desc: 'ดูดชีวิต — ดาเมจ Magic 2.0× ฟื้นฟู HP 50% ของดาเมจที่ทำ',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 2.0, magicDamage: true, lifeSteal: 0.5,
      element: 'shadow',
      selfBuff: null, effect: null,
    },
    {
      id: 'void_hex', name: '🌑 Void Hex',
      desc: 'คาถาแห่ง Void — ดาเมจ Magic 3.5× ไม่ถูก DEF ลด [+50% vs Void]',
      mpCost: 38, skillPointCost: 3, minLevel: 8,
      damage: 3.5, magicDamage: true, armorPierce: true,
      bonusVsType: ['void'], bonusMult: 1.5,
      element: 'void',
      selfBuff: null, effect: null,
    },

    {
      id: 'dark_pact', name: '🖤 Dark Pact',
      desc: 'สัญญามืด — ดาเมจ Magic 2.5× + สาป 3 เทิร์น + ดูด HP 30%',
      mpCost: 26, skillPointCost: 4, minLevel: 10,
      damage: 2.5, magicDamage: true, lifeSteal: 0.3, element: 'shadow',
      selfBuff: null, effect: { type: 'CURSE', duration: 3, dmgPerTurn: 10 },
    },
    {
      id: 'hex_armor', name: '💜 Hex Armor',
      desc: 'เกราะคาถา — DEF +60%, MAG +40% เป็นเวลา 3 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.6, magMult: 1.4, duration: 3 }, effect: null,
    },
    {
      id: 'soul_siphon', name: '🩸 Soul Siphon',
      desc: 'ดูดวิญญาณ — ดาเมจ Magic 2.5× ดูด HP 60% ของดาเมจ',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: true, lifeSteal: 0.6, element: 'shadow',
      selfBuff: null, effect: null,
    },
    {
      id: 'cursed_storm', name: '🌀 Cursed Storm',
      desc: 'พายุสาป — ดาเมจ Magic 2.0× + สาป 4 เทิร์น ทุก stat -30%',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 2.0, magicDamage: true, element: 'shadow',
      selfBuff: null, effect: { type: 'CURSE', duration: 4, dmgPerTurn: 15, atkMult: 0.7 },
    },
    {
      id: 'eldritch_blast', name: '🌌 Eldritch Blast',
      desc: 'ระเบิดพลัง Eldritch — ดาเมจ Magic 3.5× Void ทะลุ DEF + สตัน 1 เทิร์น',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'deaths_embrace', name: "💀 Death's Embrace",
      desc: 'โอบกอดมรณะ — ดาเมจ Magic 3.0× ดูด HP 80% ของดาเมจ',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 3.0, magicDamage: true, lifeSteal: 0.8, element: 'shadow',
      selfBuff: null, effect: null,
    },
    {
      id: 'hexmancers_doom', name: "🌑 Hexmancer's Doom",
      desc: '【Signature】ดาเมจ Magic 5.0× + สาป 5 เทิร์น + ดูด HP 50% — ความสาปแช่งสูงสุด',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, lifeSteal: 0.5, element: 'shadow',
      selfBuff: null, effect: { type: 'CURSE', duration: 5, dmgPerTurn: 20 },
    },
    ],

  // ══════════════════════════════════════════
  //  PHANTOM (SHADE) — Ghost + Dodge
  // ══════════════════════════════════════════
  phantom: [
    {
      id: 'phase_shift', name: '👻 Phase Shift',
      desc: 'เปลี่ยนเฟส — หลบหลีกการโจมตีครั้งถัดไปและโต้กลับ 1.5×',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 1.5, magicDamage: false,
      selfBuff: { dodgeNext: 1, duration: 1 }, effect: null,
    },
    {
      id: 'phantom_strike', name: '🌫️ Phantom Strike',
      desc: 'โจมตีวิญญาณ — ดาเมจ Magic 3.0× ทะลุร่างกาย Enemy โต้กลับไม่ได้ [+40% vs Undead/Demon]',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 3.0, magicDamage: true, selfBuff: null,
      bonusVsType: ['undead', 'demon'], bonusMult: 1.4,
      element: 'void',
      effect: null,
    },
    {
      id: 'soul_rend', name: '💨 Soul Rend',
      desc: 'ฉีกวิญญาณ — ดาเมจ Magic 2.5× + FEAR 2 เทิร์น (ATK -40%)',
      mpCost: 32, skillPointCost: 3, minLevel: 8,
      damage: 2.5, magicDamage: true, selfBuff: null,
      element: 'void',
      effect: { type: 'SLOW', atkMult: 0.6, duration: 2 },
    },

    {
      id: 'spectral_blade', name: '👻 Spectral Blade',
      desc: 'ใบมีดวิญญาณ — ดาเมจ Magic 2.5× Void + หลบการโจมตีถัดไป',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 2.5, magicDamage: true, element: 'void',
      selfBuff: { dodgeNext: 1, duration: 1 }, effect: null,
    },
    {
      id: 'ethereal_form', name: '🌫️ Ethereal Form',
      desc: 'รูปร่างอีเธอร์ — หลบ 2 ครั้งถัดไป + SPD +50% 3 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { dodgeCount: 2, spdMult: 1.5, duration: 3 }, effect: null,
    },
    {
      id: 'haunting_strike', name: '💀 Haunting Strike',
      desc: 'โจมตีหลอนสะพรึง — ดาเมจ Magic 3.0× Void + FEAR ATK -40% 3 เทิร์น',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.6, duration: 3 },
    },
    {
      id: 'poltergeist', name: '🌀 Poltergeist',
      desc: 'โพลเตอร์ไกสต์ — ดาเมจ Magic 2.5× Void โจมตี 2 ครั้ง ทั้งคู่ทะลุ DEF',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 2.5, magicDamage: true, multiHit: 2, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'wraith_walk', name: '👁️ Wraith Walk',
      desc: 'เดินแบบ Wraith — หลบ 3 ครั้งถัดไป + การโจมตีถัดไป 4.0× Crit อัตโนมัติ',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 0, magicDamage: false,
      selfBuff: { dodgeCount: 3, forceCritCount: 1, nextAtkMult: 4.0, duration: 3 }, effect: null,
    },
    {
      id: 'soul_crush', name: '💨 Soul Crush',
      desc: 'บดขยี้วิญญาณ — ดาเมจ Magic 3.5× Void + สตัน 2 เทิร์น + ATK -60% 3 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 3.5, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'spectral_annihilation', name: '🌌 Spectral Annihilation',
      desc: '【Signature】ดาเมจ Magic 5.0× Void Crit อัตโนมัติ + หลบ 2 ครั้ง + สตัน 2 เทิร์น — ทำลายทุกสิ่ง',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, forceCrit: true, armorPierce: true, element: 'void',
      selfBuff: { dodgeCount: 2, duration: 2 }, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  DEATHKNIGHT (REVENANT) — Undead Warrior
  // ══════════════════════════════════════════
  deathknight: [
    {
      id: 'death_strike', name: '💀 Death Strike',
      desc: 'ฟันมรณะ — ดาเมจ 2.5× ทะลุ 50% DEF',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.5, magicDamage: false, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'unholy_aura', name: '🖤 Unholy Aura',
      desc: 'ออร่าอสุภ — ATK +30%, DEF +30% เป็นเวลา 2 เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.3, defMult: 1.3, duration: 2 }, effect: null,
    },
    {
      id: 'bone_shield', name: '🦴 Bone Shield',
      desc: 'โล่กระดูก — DEF +100% 1 เทิร์น + ฟื้นฟู HP 20%',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.0, healPercent: 0.20, duration: 1 }, effect: null,
    },

    {
      id: 'death_grip', name: '💀 Death Grip',
      desc: 'กำมือมรณะ — ดาเมจ 2.0× + สตัน 1 เทิร์น + DEF ของ Enemy -30% 3 เทิร์น',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 2.0, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 1, defMult: 0.7, defDuration: 3 },
    },
    {
      id: 'corpse_explosion', name: '💥 Corpse Explosion',
      desc: 'ระเบิดซากศพ — ดาเมจ Magic 3.0× Void แต่เสีย HP 15% ก่อนโจมตี',
      mpCost: 30, skillPointCost: 5, minLevel: 15,
      damage: 3.0, magicDamage: true, element: 'void',
      selfCost: { hpPercent: 0.15 },
      selfBuff: null, effect: null,
    },
    {
      id: 'dark_shield', name: '🖤 Dark Shield',
      desc: 'โล่มืด — DEF +120% 2 เทิร์น + ดูด HP 20% ทุกเทิร์น',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.2, lifeStealPerTurn: 0.2, duration: 2 }, effect: null,
    },
    {
      id: 'plague_strike', name: '☠️ Plague Strike',
      desc: 'โจมตีโรคระบาด — ดาเมจ 2.5× + พิษ 15/เทิร์น 4 เทิร์น + สาป 3 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 2.5, magicDamage: false,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 15, duration: 4 },
    },
    {
      id: 'soul_reaper', name: '⚰️ Soul Reaper',
      desc: 'เก็บเกี่ยววิญญาณ — ดาเมจ 3.5× ทะลุ DEF + ดูด HP 40%',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: false, armorPierce: true, lifeSteal: 0.4,
      selfBuff: null, effect: null,
    },
    {
      id: 'deaths_door', name: "🚪 Death's Door",
      desc: 'ประตูมรณะ — ATK +80%, DEF +80% 2 เทิร์น แต่เสีย HP 20%',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfCost: { hpPercent: 0.2 },
      selfBuff: { atkMult: 1.8, defMult: 1.8, duration: 2 }, effect: null,
    },
    {
      id: 'lichs_judgment', name: "👑 Lich's Judgment",
      desc: '【Signature】ดาเมจ Magic 5.0× Void + สตัน 2 เทิร์น + ดูด HP 60% — คำพิพากษาของ Lich',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, lifeSteal: 0.6, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  NECROMANCER (REVENANT) — Death Magic
  // ══════════════════════════════════════════
  necromancer: [
    {
      id: 'death_bolt', name: '💀 Death Bolt',
      desc: 'สายฟ้ามรณะ — ดาเมจ Magic 3.0× ทะลุ DEF [+50% vs Undead]',
      mpCost: 22, skillPointCost: 1, minLevel: 3,
      damage: 3.0, magicDamage: true, armorPierce: true,
      bonusVsType: ['undead'], bonusMult: 1.5,
      element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'life_drain', name: '🩸 Life Drain',
      desc: 'ดูดชีวิต — ดาเมจ Magic 2.5× ฟื้นฟู HP 60% ของดาเมจ',
      mpCost: 30, skillPointCost: 2, minLevel: 5,
      damage: 2.5, magicDamage: true, lifeSteal: 0.6,
      element: 'shadow',
      selfBuff: null, effect: null,
    },
    {
      id: 'bone_explosion', name: '💥 Bone Explosion',
      desc: 'ระเบิดกระดูก — ดาเมจ Magic 4.5× แต่เสีย HP ตัวเอง 10%',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.5, magicDamage: true,
      element: 'void',
      selfCost: { hpPercent: 0.10 }, selfBuff: null, effect: null,
    },

    {
      id: 'corpse_wave', name: '🦴 Corpse Wave',
      desc: 'คลื่นซากศพ — ดาเมจ Magic 2.0× Void โจมตี 2 ครั้ง',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 2.0, magicDamage: true, multiHit: 2, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'dark_ritual', name: '🕯️ Dark Ritual',
      desc: 'พิธีกรรมมืด — ATK +30%, MAG +30% 3 เทิร์น + ฟื้นฟู 30 MP แต่เสีย HP 10%',
      mpCost: 10, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfCost: { hpPercent: 0.1 },
      selfBuff: { atkMult: 1.3, magMult: 1.3, mpRestore: 30, duration: 3 }, effect: null,
    },
    {
      id: 'wither', name: '🥀 Wither',
      desc: 'เหี่ยวเฉา — ATK ของ Enemy -60%, DEF -50% เป็นเวลา 3 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.4, defMult: 0.5, duration: 3 },
    },
    {
      id: 'death_nova', name: '💀 Death Nova',
      desc: 'โนวามรณะ — ดาเมจ Magic 3.5× Void ทะลุ DEF',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 3.5, magicDamage: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'entropy', name: '🌀 Entropy',
      desc: 'เอนโทรปี — ดาเมจ Magic 3.0× + สาป 4 เทิร์น + Enemy สูญเสีย HP 5%/เทิร์น',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.0, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'CURSE', duration: 4, dmgPerTurn: 12 },
    },
    {
      id: 'soul_storm', name: '⚡ Soul Storm',
      desc: 'พายุวิญญาณ — ดาเมจ Magic 2.5× Void โจมตี 3 ครั้ง ทะลุ DEF',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 2.5, magicDamage: true, multiHit: 3, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'apocalypse', name: '🌋 Apocalypse',
      desc: '【Signature】ดาเมจ Magic 5.5× Void ทะลุ DEF + สตัน 2 เทิร์น + สาป 5 เทิร์น — วันสิ้นโลก',
      mpCost: 80, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: { type: 'CURSE', duration: 5, dmgPerTurn: 20 },
    },
    ],

  // ══════════════════════════════════════════
  //  GRAVECALLER (REVENANT) — Summon + Control
  // ══════════════════════════════════════════
  gravecaller: [
    {
      id: 'grave_touch', name: '🪦 Grave Touch',
      desc: 'สัมผัสหลุมฝังศพ — ดาเมจ Magic 2.0× + สตัน Enemy 1 เทิร์น',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: true, selfBuff: null,
      effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'summon_specter', name: '👻 Summon Specter',
      desc: 'เรียกวิญญาณ — ดาเมจ 1.5× + ATK Enemy -40% 2 เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 1.5, magicDamage: true, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.6, duration: 2 },
    },
    {
      id: 'death_rattle', name: '💀 Death Rattle',
      desc: 'เสียงแห่งความตาย — ดาเมจ Magic 4.0× สตัน Enemy 1 เทิร์น',
      mpCost: 38, skillPointCost: 3, minLevel: 8,
      damage: 4.0, magicDamage: true, selfBuff: null,
      element: 'void',
      effect: { type: 'STUN', duration: 1 },
    },

    {
      id: 'spirit_chains', name: '⛓️ Spirit Chains',
      desc: 'โซ่วิญญาณ — สตัน Enemy 2 เทิร์น + ATK -40% 3 เทิร์น',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'grave_ward', name: '🪦 Grave Ward',
      desc: 'การ์ดหลุมศพ — DEF +80% 3 เทิร์น + ฟื้นฟู HP 15%/เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.8, hpRegenPerTurn: 15, duration: 3 }, effect: null,
    },
    {
      id: 'undead_army', name: '💀 Undead Army',
      desc: 'กองทัพซอมบี้ — ดาเมจ Magic 2.0× Void โจมตี 3 ครั้ง',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 2.0, magicDamage: true, multiHit: 3, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'soul_bind', name: '🔗 Soul Bind',
      desc: 'ผูกวิญญาณ — ATK ของ Enemy -70%, สาป 4 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'CURSE', duration: 4, dmgPerTurn: 10, atkMult: 0.3 },
    },
    {
      id: 'phantom_swarm', name: '👻 Phantom Swarm',
      desc: 'ฝูงวิญญาณ — ดาเมจ Magic 3.0× + สตัน 2 เทิร์น + ดูด HP 30%',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.0, magicDamage: true, lifeSteal: 0.3, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'deaths_herald', name: "📯 Death's Herald",
      desc: 'ผู้ประกาศมรณะ — ดาเมจ Magic 3.5× Void + DEF ของ Enemy -60% 4 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 3.5, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'MARKED', defMult: 0.4, duration: 4 },
    },
    {
      id: 'rise_of_the_dead', name: '☠️ Rise of the Dead',
      desc: '【Signature】ดาเมจ Magic 5.0× Void + สตัน 2 เทิร์น + ดูด HP 50% + สาป 5 เทิร์น — จงลุกขึ้น',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, lifeSteal: 0.5, element: 'void',
      selfBuff: null, effect: { type: 'CURSE', duration: 5, dmgPerTurn: 18 },
    },
    ],

  // ══════════════════════════════════════════
  //  VOIDWALKER (VOIDBORN) — Void Powers
  // ══════════════════════════════════════════
  voidwalker: [
    {
      id: 'void_step', name: '🌀 Void Step',
      desc: 'ก้าว Void — หลบหนึ่งครั้ง แล้วโต้กลับ 2.0×',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: false,
      selfBuff: { dodgeNext: 1, duration: 1 }, effect: null,
    },
    {
      id: 'rift_slash', name: '🌌 Rift Slash',
      desc: 'ฟันรอยแยก — ดาเมจ 2.5× (Physical + Void ทะลุ DEF) [+40% vs Human/Beast]',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 2.5, magicDamage: false, armorPierce: true,
      bonusVsType: ['human', 'beast'], bonusMult: 1.4,
      element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'void_surge', name: '⚡ Void Surge',
      desc: 'พุ่ง Void — ATK +50%, MAG +50% เป็นเวลา 2 เทิร์น',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.5, magMult: 1.5, duration: 2 }, effect: null,
    },

    {
      id: 'void_slash', name: '🌌 Void Slash',
      desc: 'ฟัน Void — ดาเมจ 2.5× Void ทะลุ DEF',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 2.5, magicDamage: false, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'void_shield', name: '🛡️ Void Shield',
      desc: 'โล่ Void — DEF +80%, MAG +40% 2 เทิร์น + หลบการโจมตีถัดไป',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.8, magMult: 1.4, dodgeNext: 1, duration: 2 }, effect: null,
    },
    {
      id: 'reality_tear', name: '🌀 Reality Tear',
      desc: 'ฉีกความจริง — ดาเมจ Magic 3.0× Void + สตัน 1 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'void_eruption', name: '💥 Void Eruption',
      desc: 'ระเบิด Void — ดาเมจ Magic 2.5× Void โจมตี 2 ครั้ง ทะลุ DEF',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 2.5, magicDamage: true, multiHit: 2, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'oblivion_strike', name: '⚫ Oblivion Strike',
      desc: 'โจมตีแห่งความหายนะ — ดาเมจ 4.0× Void Crit อัตโนมัติ ทะลุ DEF',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 4.0, magicDamage: false, forceCrit: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'void_mastery', name: '🌌 Void Mastery',
      desc: 'เชี่ยวชาญ Void — ATK +70%, MAG +70% เป็นเวลา 3 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.7, magMult: 1.7, duration: 3 }, effect: null,
    },
    {
      id: 'void_singularity', name: '🕳️ Void Singularity',
      desc: '【Signature】ดาเมจ Magic 5.5× Void ทะลุ DEF Crit อัตโนมัติ + สตัน 2 เทิร์น — จุดสิ้นสุดของทุกสิ่ง',
      mpCost: 80, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: true, forceCrit: true, armorPierce: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  RIFTER (VOIDBORN) — ความเร็ว + Multi-hit
  // ══════════════════════════════════════════
  rifter: [
    {
      id: 'rift_punch', name: '👊 Rift Punch',
      desc: 'หมัดรอยแยก — ดาเมจ 2.5× โจมตีก่อนเสมอ',
      mpCost: 15, skillPointCost: 1, minLevel: 3,
      damage: 2.5, magicDamage: false, goFirst: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'dimensional_slash', name: '🌀 Dimensional Slash',
      desc: 'ฟันมิติ — ดาเมจ 3.0× อัตรา Crit สูง',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 3.0, magicDamage: false,
      element: 'void',
      selfBuff: { critBonus: 0.3, duration: 1 }, effect: null,
    },
    {
      id: 'phase_assault', name: '💥 Phase Assault',
      desc: 'โจมตีข้ามมิติ — ดาเมจ 2.0× โจมตี 2 ครั้งในเทิร์นเดียว',
      mpCost: 32, skillPointCost: 3, minLevel: 8,
      damage: 2.0, magicDamage: false, multiHit: 2,
      element: 'void',
      selfBuff: null, effect: null,
    },

    {
      id: 'rift_barrage', name: '🌀 Rift Barrage',
      desc: 'ระดมยิงรอยแยก — ดาเมจ 1.5× โจมตี 3 ครั้ง Void',
      mpCost: 22, skillPointCost: 4, minLevel: 10,
      damage: 1.5, magicDamage: false, multiHit: 3, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'time_skip', name: '⏩ Time Skip',
      desc: 'ข้ามเวลา — โจมตีก่อน 3 เทิร์น + SPD +100%',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: { goFirstCount: 3, spdMult: 2.0, duration: 3 }, effect: null,
    },
    {
      id: 'phase_blade', name: '💫 Phase Blade',
      desc: 'ใบมีดเฟส — ดาเมจ 3.0× Void ทะลุ DEF',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: false, armorPierce: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'rift_storm', name: '⛈️ Rift Storm',
      desc: 'พายุรอยแยก — ดาเมจ 2.0× Void โจมตี 4 ครั้ง',
      mpCost: 42, skillPointCost: 7, minLevel: 35,
      damage: 2.0, magicDamage: false, multiHit: 4, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'warp_strike', name: '⚡ Warp Strike',
      desc: 'โจมตีวาร์ป — ดาเมจ 3.5× โจมตีก่อนเสมอ Crit อัตโนมัติ',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: false, forceCrit: true, goFirst: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'dimension_break', name: '💥 Dimension Break',
      desc: 'ทำลายมิติ — ดาเมจ 2.5× Void โจมตี 3 ครั้ง ทุกครั้ง Crit อัตโนมัติ',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 2.5, magicDamage: false, multiHit: 3, forceCrit: true, element: 'void',
      selfBuff: null, effect: null,
    },
    {
      id: 'temporal_collapse', name: '⌛ Temporal Collapse',
      desc: '【Signature】ดาเมจ 5.0× Void โจมตีก่อนเสมอ Crit อัตโนมัติ + สตัน 2 เทิร์น — ยุบพับเวลา',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: false, forceCrit: true, goFirst: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  SOULSEER (VOIDBORN) — ทำนาย + Control
  // ══════════════════════════════════════════
  soulseer: [
    {
      id: 'foresight', name: '👁️ Foresight',
      desc: 'ทำนาย — การโจมตีถัดไป 2 ครั้ง Crit อัตโนมัติ',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 0, magicDamage: false,
      selfBuff: { forceCritCount: 2, duration: 2 }, effect: null,
    },
    {
      id: 'mind_spike', name: '🔮 Mind Spike',
      desc: 'ทิ่มจิตใจ — ดาเมจ Magic 3.0× + สตัน Enemy 1 เทิร์น',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 3.0, magicDamage: true, selfBuff: null,
      effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'destiny_mark', name: '⭐ Destiny Mark',
      desc: 'ตราแห่งโชคชะตา — Enemy รับดาเมจ +60% เป็นเวลา 3 เทิร์น',
      mpCost: 35, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false, selfBuff: null,
      effect: { type: 'MARKED', dmgMultiplier: 1.6, duration: 3 },
    },

    {
      id: 'soul_reading', name: '👁️ Soul Reading',
      desc: 'อ่านวิญญาณ — DEF ของ Enemy -60% เป็นเวลา 3 เทิร์น',
      mpCost: 22, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'MARKED', defMult: 0.4, duration: 3 },
    },
    {
      id: 'vision_of_doom', name: '🔮 Vision of Doom',
      desc: 'นิมิตหายนะ — ดาเมจ Magic 2.5× Void + MARKED (รับดาเมจ +60%) 3 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 2.5, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'MARKED', dmgMultiplier: 1.6, duration: 3 },
    },
    {
      id: 'psychic_crush', name: '🧠 Psychic Crush',
      desc: 'บดขยี้จิต — ดาเมจ Magic 3.0× Void + สตัน 1 เทิร์น',
      mpCost: 35, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'fates_hand', name: "⭐ Fate's Hand",
      desc: 'มือแห่งโชคชะตา — Crit อัตโนมัติ 3 ครั้งถัดไป + ATK +40%',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: { forceCritCount: 3, atkMult: 1.4, duration: 3 }, effect: null,
    },
    {
      id: 'soul_fracture', name: '💀 Soul Fracture',
      desc: 'แตกสลายวิญญาณ — ดาเมจ Magic 3.5× Void + Enemy สูญเสีย HP 8%/เทิร์น 3 เทิร์น',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 3.5, magicDamage: true, element: 'void',
      selfBuff: null, effect: { type: 'CURSE', duration: 3, dmgPerTurn: 15 },
    },
    {
      id: 'temporal_sight', name: '⏳ Temporal Sight',
      desc: 'มองทะลุเวลา — โจมตีก่อนเสมอ + ATK +60% + Crit อัตโนมัติทุกครั้งในเทิร์นนั้น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { goFirstCount: 1, atkMult: 1.6, forceCritCount: 1, duration: 1 }, effect: null,
    },
    {
      id: 'revelation', name: '🌟 Revelation',
      desc: '【Signature】ดาเมจ Magic 5.0× Void Crit อัตโนมัติ + สตัน 2 เทิร์น + MARKED 4 เทิร์น — ความจริงแห่งจักรวาล',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, forceCrit: true, element: 'void',
      selfBuff: null, effect: { type: 'MARKED', dmgMultiplier: 1.8, duration: 4 },
    },
    ],

  // ══════════════════════════════════════════
  //  WILDGUARD (BEASTKIN) — ธรรมชาติ + DEF
  // ══════════════════════════════════════════
  wildguard: [
    {
      id: 'savage_roar', name: '🦁 Savage Roar',
      desc: 'คำรามดุร้าย — ATK ของ Enemy -40% เป็นเวลา 3 เทิร์น',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 0, magicDamage: false, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.6, duration: 3 },
    },
    {
      id: 'primal_strike', name: '🐾 Primal Strike',
      desc: 'โจมตีดั้งเดิม — ดาเมจ 2.5× + ชะลอ Enemy (ATK -30%) 1 เทิร์น',
      mpCost: 22, skillPointCost: 2, minLevel: 5,
      damage: 2.5, magicDamage: false, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.7, duration: 1 },
    },
    {
      id: 'nature_shield', name: '🌿 Nature Shield',
      desc: 'โล่ธรรมชาติ — DEF +80% 2 เทิร์น + ฟื้นฟู HP 20%',
      mpCost: 28, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.8, healPercent: 0.20, duration: 2 }, effect: null,
    },

    {
      id: 'bark_skin', name: '🌳 Bark Skin',
      desc: 'ผิวเปลือกไม้ — DEF +100% 2 เทิร์น + ฟื้นฟู HP 10%/เทิร์น',
      mpCost: 24, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 2.0, hpRegenPerTurn: 10, duration: 2 }, effect: null,
    },
    {
      id: 'vine_trap', name: '🌿 Vine Trap',
      desc: 'กับดักเถาวัลย์ — สตัน Enemy 2 เทิร์น + SLOW 3 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 0, magicDamage: false,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'natures_fury', name: "🌪️ Nature's Fury",
      desc: 'ความโกรธแห่งธรรมชาติ — ดาเมจ 2.5× + พิษ 12/เทิร์น 4 เทิร์น [+60% vs Void/Demon]',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 2.5, magicDamage: false, element: 'nature',
      bonusVsType: ['void', 'demon'],
      bonusMult: 1.6,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 12, duration: 4 },
    },
    {
      id: 'wild_surge', name: '⚡ Wild Surge',
      desc: 'พุ่งพลังป่า — ATK +70%, DEF +50% เป็นเวลา 3 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.7, defMult: 1.5, duration: 3 }, effect: null,
    },
    {
      id: 'stone_form', name: '🪨 Stone Form',
      desc: 'รูปร่างหิน — DEF +200% 2 เทิร์น + ฟื้นฟู HP 30%',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 3.0, healPercent: 0.3, duration: 2 }, effect: null,
    },
    {
      id: 'primal_rage', name: '🦁 Primal Rage',
      desc: 'ความโกรธดั้งเดิม — ATK +100%, Crit +40% เป็นเวลา 3 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 2.0, critBonus: 0.4, duration: 3 }, effect: null,
    },
    {
      id: 'force_of_nature', name: '🌊 Force of Nature',
      desc: '【Signature】ดาเมจ 5.0× + สตัน 2 เทิร์น + พิษ 20/เทิร์น 4 เทิร์น + ฟื้นฟู HP 30% — พลังของธรรมชาติ',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: false, element: 'nature',
      selfBuff: { healPercent: 0.3, duration: 1 }, effect: { type: 'STUN', duration: 2 },
    },
    ],

  // ══════════════════════════════════════════
  //  TRACKER (BEASTKIN) — Hunter + Poison
  // ══════════════════════════════════════════
  tracker: [
    {
      id: 'marked_prey', name: '🎯 Marked Prey',
      desc: 'ทำเครื่องหมายเหยื่อ — DEF ของ Enemy -50% เป็นเวลา 3 เทิร์น',
      mpCost: 16, skillPointCost: 1, minLevel: 3,
      damage: 0, magicDamage: false, selfBuff: null,
      effect: { type: 'MARKED', defMult: 0.5, duration: 3 },
    },
    {
      id: 'rapid_fire', name: '🏹 Rapid Fire',
      desc: 'ยิงรัว — ดาเมจ 1.5× โจมตี 2 ครั้งในเทิร์นเดียว',
      mpCost: 22, skillPointCost: 2, minLevel: 5,
      damage: 1.5, magicDamage: false, multiHit: 2,
      selfBuff: null, effect: null,
    },
    {
      id: 'hunter_instinct', name: '🦊 Hunter Instinct',
      desc: 'สัญชาตญาณนักล่า — Crit +35%, SPD +30% เป็นเวลา 3 เทิร์น',
      mpCost: 28, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { critBonus: 0.35, spdMult: 1.3, duration: 3 }, effect: null,
    },

    {
      id: 'smoke_arrow', name: '💨 Smoke Arrow',
      desc: 'ลูกศรควัน — ดาเมจ 1.5× + DEF ของ Enemy -50% 3 เทิร์น + SLOW 2 เทิร์น',
      mpCost: 22, skillPointCost: 4, minLevel: 10,
      damage: 1.5, magicDamage: false,
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.6, duration: 2, defMult: 0.5, defDuration: 3 },
    },
    {
      id: 'explosive_trap', name: '💣 Explosive Trap',
      desc: 'กับดักระเบิด — ดาเมจ 2.5× + สตัน 2 เทิร์น [+50% vs Beast]',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 2.5, magicDamage: false,
      bonusVsType: ['beast'],
      bonusMult: 1.5,
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'sniper_shot', name: '🎯 Sniper Shot',
      desc: 'ยิงซุ่ม — ดาเมจ 3.0× โจมตีก่อนเสมอ Crit อัตโนมัติ',
      mpCost: 34, skillPointCost: 6, minLevel: 25,
      damage: 3.0, magicDamage: false, forceCrit: true, goFirst: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'venom_storm', name: '☠️ Venom Storm',
      desc: 'พายุพิษ — ดาเมจ 1.5× + พิษ 20/เทิร์น 5 เทิร์น + SLOW 3 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 1.5, magicDamage: false,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 20, duration: 5 },
    },
    {
      id: 'death_volley', name: '🌧️ Death Volley',
      desc: 'ฝนมรณะ — ดาเมจ 1.8× โจมตี 4 ครั้ง + พิษ 8/เทิร์น ต่อครั้ง',
      mpCost: 48, skillPointCost: 8, minLevel: 50,
      damage: 1.8, magicDamage: false, multiHit: 4,
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 8, duration: 3 },
    },
    {
      id: 'alpha_predator', name: '🦅 Alpha Predator',
      desc: 'นักล่าชั้นยอด — ATK +80%, Crit +50%, SPD +40% เป็นเวลา 3 เทิร์น',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.8, critBonus: 0.5, spdMult: 1.4, duration: 3 }, effect: null,
    },
    {
      id: 'killshot', name: '💥 Killshot',
      desc: '【Signature】ดาเมจ 5.5× โจมตีก่อนเสมอ Crit อัตโนมัติ + พิษ 20/เทิร์น 4 เทิร์น — ถ้า Enemy HP < 40% เป็น 8.0× แทน',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.5, magicDamage: false, forceCrit: true, goFirst: true,
      executeBonus: { threshold: 0.4, multiplier: 8.0 },
      selfBuff: null, effect: { type: 'POISON', dmgPerTurn: 20, duration: 4 },
    },
    ],

  // ══════════════════════════════════════════
  //  SHAMAN (BEASTKIN) — Spirit + Heal + Magic
  // ══════════════════════════════════════════
  shaman: [
    {
      id: 'spirit_strike', name: '🌊 Spirit Strike',
      desc: 'โจมตีวิญญาณ — ดาเมจ Magic 2.0× + ฟื้นฟู HP 15%',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: true,
      selfBuff: { healPercent: 0.15, duration: 1 }, effect: null,
    },
    {
      id: 'totem_ward', name: '🪆 Totem Ward',
      desc: 'โทเท็มปกป้อง — DEF +60% 3 เทิร์น + ฟื้นฟู HP 8/เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 0, magicDamage: false,
      selfBuff: { defMult: 1.6, hpRegenPerTurn: 8, duration: 3 }, effect: null,
    },
    {
      id: 'spirit_surge', name: '⚡ Spirit Surge',
      desc: 'พลังวิญญาณสูงสุด — ดาเมจ Magic 4.0× ทะลุ DEF [+70% vs Void]',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.0, magicDamage: true, armorPierce: true,
      bonusVsType: ['void'], bonusMult: 1.7,
      element: 'lightning',
      selfBuff: null, effect: null,
    },

    {
      id: 'healing_rain', name: '🌧️ Healing Rain',
      desc: 'ฝนเยียวยา — ฟื้นฟู HP 50% ของ hpMax + DEF +30% 2 เทิร์น',
      mpCost: 28, skillPointCost: 4, minLevel: 10,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.5, defMult: 1.3, duration: 2 }, effect: null,
    },
    {
      id: 'lightning_totem', name: '⚡ Lightning Totem',
      desc: 'โทเท็มสายฟ้า — ดาเมจ Magic 2.0× สายฟ้า + SLOW ATK -30% 2 เทิร์น',
      mpCost: 28, skillPointCost: 5, minLevel: 15,
      damage: 2.0, magicDamage: true, element: 'lightning',
      selfBuff: null, effect: { type: 'SLOW', atkMult: 0.7, duration: 2 },
    },
    {
      id: 'spirit_walk', name: '👁️ Spirit Walk',
      desc: 'เดินวิญญาณ — หลบการโจมตีถัดไป + MAG +50% 2 เทิร์น',
      mpCost: 30, skillPointCost: 6, minLevel: 25,
      damage: 0, magicDamage: false,
      selfBuff: { dodgeNext: 1, magMult: 1.5, duration: 2 }, effect: null,
    },
    {
      id: 'thunderstrike', name: '⛈️ Thunderstrike',
      desc: 'ฟ้าถล่ม — ดาเมจ Magic 3.5× สายฟ้า + สตัน 2 เทิร์น',
      mpCost: 40, skillPointCost: 7, minLevel: 35,
      damage: 3.5, magicDamage: true, element: 'lightning',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    {
      id: 'spirit_army', name: '👻 Spirit Army',
      desc: 'กองทัพวิญญาณ — ดาเมจ Magic 2.0× สายฟ้า โจมตี 3 ครั้ง + ดูด HP 20%',
      mpCost: 50, skillPointCost: 8, minLevel: 50,
      damage: 2.0, magicDamage: true, multiHit: 3, lifeSteal: 0.2, element: 'lightning',
      selfBuff: null, effect: null,
    },
    {
      id: 'ancestral_blessing', name: '🌟 Ancestral Blessing',
      desc: 'พรบรรพบุรุษ — ฟื้นฟู HP 70% + DEF +80% 3 เทิร์น + MAG +60%',
      mpCost: 58, skillPointCost: 9, minLevel: 65,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.7, defMult: 1.8, magMult: 1.6, duration: 3 }, effect: null,
    },
    {
      id: 'cataclysm', name: '🌋 Cataclysm',
      desc: '【Signature】ดาเมจ Magic 5.0× สายฟ้า ทะลุ DEF + สตัน 2 เทิร์น + พิษ 15/เทิร์น 4 เทิร์น — ยุคสิ้นโลก',
      mpCost: 75, skillPointCost: 10, minLevel: 70,
      damage: 5.0, magicDamage: true, armorPierce: true, element: 'lightning',
      selfBuff: null, effect: { type: 'STUN', duration: 2 },
    },
    ],
};

// ══════════════════════════════════════════════════════════
//  PASSIVE SKILLS — 1 passive ต่อ class (ไม่ต้อง unlock)
// ══════════════════════════════════════════════════════════
const PASSIVE_SKILLS = {
  warrior:     { id: 'iron_will',          name: '🪨 Iron Will',          desc: 'DEF +10% ตลอดเวลา' },
  rogue:       { id: 'shadow_veil',        name: '🌑 Shadow Veil',        desc: 'อัตราหนีสำเร็จเพิ่มเป็น 90% เสมอ' },
  cleric:      { id: 'divine_grace',       name: '💚 Divine Grace',       desc: 'ฟื้นฟู 8 HP ทุกเทิร์น' },
  ranger:      { id: 'forest_stride',      name: '🌿 Forest Stride',      desc: 'Crit +5%, SPD +10% ตลอดเวลา' },
  mage:        { id: 'mana_flow',          name: '💧 Mana Flow',          desc: 'ฟื้นฟู 5 MP ทุกเทิร์น' },
  bard:        { id: 'inspiring_melody',   name: '🎵 Inspiring Melody',   desc: 'ฟื้นฟู 5 MP ทุกเทิร์น + ATK +5%' },
  berserker:   { id: 'bloodthirst',        name: '🔥 Bloodthirst',        desc: 'ATK +20% เมื่อ HP เหลือต่ำกว่า 50%' },
  engineer:    { id: 'overclock',          name: '⚙️ Overclock',          desc: 'DEF +15% ตลอดเวลา' },
  runesmith:   { id: 'rune_forge',         name: '🔮 Rune Forge',         desc: 'ATK +10% ตลอดเวลา' },
  assassin:    { id: 'lethal_focus',       name: '🗡️ Lethal Focus',       desc: 'Crit rate +10%, ดาเมจ Crit ×2.5' },
  hexblade:    { id: 'cursed_weapon',      name: '💜 Cursed Weapon',      desc: '20% โอกาส CURSE enemy เมื่อโจมตีธรรมดา' },
  phantom:     { id: 'incorporeal',        name: '👻 Incorporeal',        desc: '15% โอกาสหลบหลีกการโจมตีใดๆ' },
  deathknight: { id: 'undying',            name: '💀 Undying',            desc: 'ฟื้นฟู 15 HP ทุกเทิร์น' },
  necromancer: { id: 'death_aura',         name: '🖤 Death Aura',         desc: 'Enemy ไม่สามารถ Regen HP ได้ตลอดการต่อสู้' },
  gravecaller: { id: 'soul_harvest',       name: '🪦 Soul Harvest',       desc: 'ดาเมจ +5% ต่อ status ที่ Enemy มี' },
  voidwalker:  { id: 'void_affinity',      name: '🌀 Void Affinity',      desc: 'ดาเมจ Magic +15%, ภูมิต้านทาน VOID_DRAIN' },
  rifter:      { id: 'unstable_rift',      name: '🌌 Unstable Rift',      desc: '15% โอกาสหลบหลีกการโจมตีใดๆ' },
  soulseer:    { id: 'true_sight',         name: '👁️ True Sight',         desc: 'Crit +8% ตลอดเวลา, มองเห็นจุดอ่อน' },
  wildguard:   { id: 'thick_hide',         name: '🦏 Thick Hide',         desc: 'DEF +12%, ลดระยะเวลา status ของ Enemy ลง 1' },
  tracker:     { id: 'predator',           name: '🦊 Predator',           desc: 'ดาเมจ +10% ต่อ Enemy ที่มี status (พิษ/ช้า ฯลฯ)' },
  shaman:      { id: 'elemental_harmony',  name: '🌊 Elemental Harmony',  desc: 'ฟื้นฟู 5 HP + 5 MP ทุกเทิร์น' },
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
