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
      desc: 'ระเบิดแสงศักดิ์สิทธิ์ — ดาเมจ Magic 2.0× + สตัน Enemy 1 เทิร์น',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 2.0, magicDamage: true, selfBuff: null,
      effect: { type: 'STUN', duration: 1 },
    },
    {
      id: 'divine_intervention', name: '⚡ Divine Intervention',
      desc: 'การแทรกแซงของพระเจ้า — ฟื้นฟู HP 50% ของ hpMax + ATK +40% 2 เทิร์น',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { healPercent: 0.50, atkMult: 1.4, duration: 2 }, effect: null,
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
      desc: 'ลูกศรพิษ — ดาเมจ 1.2× + พิษ 10 ดาเมจ/เทิร์น เป็นเวลา 4 เทิร์น',
      mpCost: 18, skillPointCost: 2, minLevel: 5,
      damage: 1.2, magicDamage: false, selfBuff: null,
      effect: { type: 'POISON', dmgPerTurn: 10, duration: 4 },
    },
    {
      id: 'eagle_eye', name: '🦅 Eagle Eye',
      desc: 'ตาอินทรี — Crit +40% เป็นเวลา 3 เทิร์น + SPD +20%',
      mpCost: 22, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { critBonus: 0.4, spdMult: 1.2, duration: 3 }, effect: null,
    },
  ],

  // ══════════════════════════════════════════
  //  MAGE (ELVEN) — Magic DPS สูง
  // ══════════════════════════════════════════
  mage: [
    {
      id: 'fireball', name: '🔥 Fireball',
      desc: 'ยิง Fireball — ดาเมจ Magic 2.5× ไม่ถูก DEF ลด',
      mpCost: 20, skillPointCost: 1, minLevel: 3,
      damage: 2.5, magicDamage: true, selfBuff: null, effect: null,
    },
    {
      id: 'frost_nova', name: '❄️ Frost Nova',
      desc: 'ระเบิดน้ำแข็ง — ดาเมจ Magic 1.8× + ชะลอ enemy (ATK -30%) 2 เทิร์น',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 1.8, magicDamage: true, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.7, duration: 2 },
    },
    {
      id: 'arcane_burst', name: '✨ Arcane Burst',
      desc: 'ระเบิดพลังลึกลับ — ดาเมจ Magic 4× ใช้ MP เยอะ',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.0, magicDamage: true, selfBuff: null, effect: null,
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
      effect: { type: 'STUN', duration: 1 },
    },
  ],

  // ══════════════════════════════════════════
  //  RUNESMITH (DWARF) — Rune buff + Magic-Physical
  // ══════════════════════════════════════════
  runesmith: [
    {
      id: 'rune_strike', name: '🔮 Rune Strike',
      desc: 'โจมตีพลังรูน — ดาเมจ 2.0× (ผสม Physical + Magic ทะลุ DEF บางส่วน)',
      mpCost: 18, skillPointCost: 1, minLevel: 3,
      damage: 2.0, magicDamage: false, armorPierce: true,
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
      selfBuff: null, effect: null,
    },
    {
      id: 'void_hex', name: '🌑 Void Hex',
      desc: 'คาถาแห่ง Void — ดาเมจ Magic 3.5× ไม่ถูก DEF ลด',
      mpCost: 38, skillPointCost: 3, minLevel: 8,
      damage: 3.5, magicDamage: true, armorPierce: true,
      selfBuff: null, effect: null,
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
      desc: 'โจมตีวิญญาณ — ดาเมจ Magic 3.0× ทะลุร่างกาย Enemy โต้กลับไม่ได้',
      mpCost: 28, skillPointCost: 2, minLevel: 5,
      damage: 3.0, magicDamage: true, selfBuff: null, effect: null,
    },
    {
      id: 'soul_rend', name: '💨 Soul Rend',
      desc: 'ฉีกวิญญาณ — ดาเมจ Magic 2.5× + FEAR 2 เทิร์น (ATK -40%)',
      mpCost: 32, skillPointCost: 3, minLevel: 8,
      damage: 2.5, magicDamage: true, selfBuff: null,
      effect: { type: 'SLOW', atkMult: 0.6, duration: 2 },
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
  ],

  // ══════════════════════════════════════════
  //  NECROMANCER (REVENANT) — Death Magic
  // ══════════════════════════════════════════
  necromancer: [
    {
      id: 'death_bolt', name: '💀 Death Bolt',
      desc: 'สายฟ้ามรณะ — ดาเมจ Magic 3.0× ทะลุ DEF',
      mpCost: 22, skillPointCost: 1, minLevel: 3,
      damage: 3.0, magicDamage: true, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'life_drain', name: '🩸 Life Drain',
      desc: 'ดูดชีวิต — ดาเมจ Magic 2.5× ฟื้นฟู HP 60% ของดาเมจ',
      mpCost: 30, skillPointCost: 2, minLevel: 5,
      damage: 2.5, magicDamage: true, lifeSteal: 0.6,
      selfBuff: null, effect: null,
    },
    {
      id: 'bone_explosion', name: '💥 Bone Explosion',
      desc: 'ระเบิดกระดูก — ดาเมจ Magic 4.5× แต่เสีย HP ตัวเอง 10%',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.5, magicDamage: true,
      selfCost: { hpPercent: 0.10 }, selfBuff: null, effect: null,
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
      effect: { type: 'STUN', duration: 1 },
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
      desc: 'ฟันรอยแยก — ดาเมจ 2.5× (Physical + Void ทะลุ DEF)',
      mpCost: 25, skillPointCost: 2, minLevel: 5,
      damage: 2.5, magicDamage: false, armorPierce: true,
      selfBuff: null, effect: null,
    },
    {
      id: 'void_surge', name: '⚡ Void Surge',
      desc: 'พุ่ง Void — ATK +50%, MAG +50% เป็นเวลา 2 เทิร์น',
      mpCost: 30, skillPointCost: 3, minLevel: 8,
      damage: 0, magicDamage: false,
      selfBuff: { atkMult: 1.5, magMult: 1.5, duration: 2 }, effect: null,
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
      selfBuff: { critBonus: 0.3, duration: 1 }, effect: null,
    },
    {
      id: 'phase_assault', name: '💥 Phase Assault',
      desc: 'โจมตีข้ามมิติ — ดาเมจ 2.0× โจมตี 2 ครั้งในเทิร์นเดียว',
      mpCost: 32, skillPointCost: 3, minLevel: 8,
      damage: 2.0, magicDamage: false, multiHit: 2,
      selfBuff: null, effect: null,
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
      desc: 'พลังวิญญาณสูงสุด — ดาเมจ Magic 4.0× ทะลุ DEF',
      mpCost: 40, skillPointCost: 3, minLevel: 8,
      damage: 4.0, magicDamage: true, armorPierce: true,
      selfBuff: null, effect: null,
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
