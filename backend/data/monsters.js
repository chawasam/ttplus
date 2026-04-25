// data/monsters.js — Monster definitions for Ashenveil

const MONSTERS = {

  // ===== ZONE: town_outskirts (Lv 1-5) =====
  stray_dog: {
    monsterId: 'stray_dog', name: 'Stray Dog', emoji: '🐕',
    zone: 'town_outskirts',
    level: 1, xpReward: 8, goldReward: [2, 6],
    hp: 28, atk: 6, def: 2, spd: 8,
    desc: 'สุนัขจรจัดที่หิวโหย ดวงตาดุดัน',
    attackMsg: ['กัดข้อเท้า', 'พุ่งเข้าหา', 'ขย้ำแขน'],
    drops: [
      { itemId: null, chance: 0.7 },
      { itemId: 'bread', chance: 0.1 },
    ],
    flee_chance: 0.8,
  },

  goblin_scout: {
    monsterId: 'goblin_scout', name: 'Goblin Scout', emoji: '👺',
    zone: 'town_outskirts',
    level: 2, xpReward: 15, goldReward: [5, 12],
    hp: 42, atk: 9, def: 4, spd: 6,
    desc: 'โกบลินผอมบาง ตัวเล็ก แต่เร็วและฉลาดแกมโกง',
    attackMsg: ['แทงด้วยหลาว', 'ขว้างก้อนหิน', 'กัดอย่างสุนัข'],
    drops: [
      { itemId: 'goblin_ear', chance: 0.8 },
      { itemId: 'monster_fang', chance: 0.3 },
      { itemId: 'health_potion_small', chance: 0.15 },
    ],
    flee_chance: 0.75,
  },

  // ===== ZONE: forest_path (Lv 3-10) =====
  forest_wolf: {
    monsterId: 'forest_wolf', name: 'Forest Wolf', emoji: '🐺',
    zone: 'forest_path',
    level: 3, xpReward: 22, goldReward: [8, 18],
    hp: 65, atk: 14, def: 5, spd: 10,
    desc: 'หมาป่าขนาดใหญ่ ดวงตาสีเหลือง เยื้องกรายเงียบกริบ',
    attackMsg: ['กัดคอ', 'เล็บขูด', 'พุ่งโดดเต็มแรง'],
    drops: [
      { itemId: 'wolf_pelt', chance: 0.7 },
      { itemId: 'monster_fang', chance: 0.5 },
      { itemId: 'wild_flower', chance: 0.2 },
    ],
    flee_chance: 0.65,
  },

  goblin_warrior: {
    monsterId: 'goblin_warrior', name: 'Goblin Warrior', emoji: '👹',
    zone: 'forest_path',
    level: 4, xpReward: 30, goldReward: [10, 22],
    hp: 80, atk: 18, def: 10, spd: 5,
    desc: 'โกบลินใหญ่กว่าปกติ สวมเกราะหนังขรุขระ ดูหน้ากลัว',
    attackMsg: ['ฟันด้วยกระบี่สนิม', 'กดโล่ทับ', 'โถมใส่เต็มแรง'],
    drops: [
      { itemId: 'goblin_ear', chance: 0.9 },
      { itemId: 'iron_ore', chance: 0.4 },
      { itemId: 'worn_dagger', chance: 0.05 },
    ],
    flee_chance: 0.6,
  },

  giant_spider: {
    monsterId: 'giant_spider', name: 'Giant Spider', emoji: '🕷️',
    zone: 'forest_path',
    level: 4, xpReward: 28, goldReward: [8, 16],
    hp: 58, atk: 16, def: 6, spd: 12,
    statusAttack: { type: 'POISON', chance: 0.35, duration: 3, dmgPerTurn: 5 },
    desc: 'แมงมุมขนาดยักษ์ แปดตาเปล่งประกาย พิษถึงตาย',
    attackMsg: ['กัดด้วยเขี้ยวพิษ', 'ปาตาข่าย', 'ตะปบด้วยขา'],
    drops: [
      { itemId: 'slime_gel', chance: 0.6 },
      { itemId: 'antidote', chance: 0.2 },
      { itemId: 'blue_gem_fragment', chance: 0.08 },
    ],
    flee_chance: 0.7,
  },

  ancient_treant: {
    monsterId: 'ancient_treant', name: 'Ancient Treant', emoji: '🌳',
    zone: 'forest_path',
    level: 6, xpReward: 55, goldReward: [20, 40],
    hp: 160, atk: 22, def: 18, spd: 2,
    desc: 'ต้นไม้เดินได้อายุนับร้อยปี ตื่นขึ้นเพราะมีคนบุกรุกป่าของมัน',
    attackMsg: ['กระแทกด้วยกิ่งขนาดใหญ่', 'ราก entangle', 'ปล่อยสปอร์พิษ'],
    drops: [
      { itemId: 'rotten_wood', chance: 0.8 },
      { itemId: 'wild_flower', chance: 0.6 },
      { itemId: 'honey_jar', chance: 0.3 },
      { itemId: 'crystal_shard', chance: 0.1 },
    ],
    flee_chance: 0.9,
    special: 'mini_boss',
  },

  // ===== ZONE: dark_cave (Lv 5-15) =====
  cave_bat: {
    monsterId: 'cave_bat', name: 'Cave Bat', emoji: '🦇',
    zone: 'dark_cave',
    level: 5, xpReward: 20, goldReward: [6, 14],
    hp: 45, atk: 12, def: 3, spd: 15,
    desc: 'ค้างคาวถ้ำตัวใหญ่ บินวนซ้ำหลอกทิศทาง',
    attackMsg: ['โฉบเฉี่ยวข้ามหัว', 'ฝูงบินพุ่งเข้าหา', 'ส่งเสียงอัลตราโซนิก'],
    drops: [
      { itemId: null, chance: 0.5 },
      { itemId: 'monster_fang', chance: 0.4 },
    ],
    flee_chance: 0.7,
  },

  cave_troll: {
    monsterId: 'cave_troll', name: 'Cave Troll', emoji: '👾',
    zone: 'dark_cave',
    level: 7, xpReward: 65, goldReward: [25, 50],
    hp: 200, atk: 28, def: 20, spd: 3,
    regen: 8,
    desc: 'ทรอลล์ใต้ถ้ำ ผิวหนาแน่น ฟื้นร่างกายตัวเองได้เรื่อยๆ',
    attackMsg: ['ทุบด้วยกำปั้นหิน', 'โยนก้อนหิน', 'ทำให้ตึงตัว'],
    drops: [
      { itemId: 'iron_ore', chance: 0.7 },
      { itemId: 'steel_ingot', chance: 0.2 },
      { itemId: 'blue_gem_fragment', chance: 0.15 },
      { itemId: 'crystal_shard', chance: 0.08 },
    ],
    flee_chance: 0.85,
    special: 'mini_boss',
  },

  void_wisp: {
    monsterId: 'void_wisp', name: 'Void Wisp', emoji: '🌑',
    zone: 'dark_cave',
    level: 8, xpReward: 70, goldReward: [20, 45],
    hp: 90, atk: 30, def: 5, spd: 14,
    desc: 'วิญญาณจาก The Void หลุดเข้ามาในโลก ไม่มีรูปร่างชัดเจน',
    attackMsg: ['ดูดพลังงาน', 'แทงทะลุกาย', 'ส่งคลื่นความกลัว'],
    drops: [
      { itemId: 'void_crystal', chance: 0.25 },
      { itemId: 'crystal_shard', chance: 0.4 },
      { itemId: 'ancient_scroll', chance: 0.1 },
    ],
    flee_chance: 0.5,
  },

  // ===== ZONE: city_ruins (Lv 10-20) =====
  ruined_knight: {
    monsterId: 'ruined_knight', name: 'Ruined Knight', emoji: '🪖',
    zone: 'city_ruins',
    level: 10, xpReward: 90, goldReward: [35, 65],
    hp: 220, atk: 38, def: 30, spd: 5,
    desc: 'อัศวินที่ตายในสงครามและลุกขึ้นมาอีก เกราะแตกร้าวแต่ยังสู้ได้',
    attackMsg: ['ฟาดด้วยดาบสนิม', 'กดโล่เก่าทับ', 'พุ่งจากด้านหลัง'],
    drops: [
      { itemId: 'iron_ore', chance: 0.6 },
      { itemId: 'steel_ingot', chance: 0.3 },
      { itemId: 'chainmail_fragment', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.08 },
    ],
    flee_chance: 0.7,
  },

  plague_rat: {
    monsterId: 'plague_rat', name: 'Plague Rat', emoji: '🐀',
    zone: 'city_ruins',
    level: 11, xpReward: 75, goldReward: [25, 45],
    hp: 130, atk: 32, def: 8, spd: 18,
    statusAttack: { type: 'POISON', chance: 0.5, duration: 4, dmgPerTurn: 8 },
    desc: 'หนูกลายพันธุ์ขนาดสุนัข มีเชื้อโรคในน้ำลาย',
    attackMsg: ['กัดและแพร่เชื้อ', 'พุ่งฝูงเข้ามา', 'ขูดด้วยเล็บสกปรก'],
    drops: [
      { itemId: 'slime_gel', chance: 0.7 },
      { itemId: 'antidote', chance: 0.3 },
      { itemId: 'rotten_wood', chance: 0.4 },
    ],
    flee_chance: 0.65,
  },

  city_ghoul: {
    monsterId: 'city_ghoul', name: 'City Ghoul', emoji: '🧟',
    zone: 'city_ruins',
    level: 12, xpReward: 100, goldReward: [40, 70],
    hp: 185, atk: 42, def: 12, spd: 8,
    regen: 5,
    desc: 'ผีดิบอดีตชาวเมือง ฟื้นฟูตัวเองช้าๆ จากเนื้อเน่า',
    attackMsg: ['ขูดด้วยเล็บดำ', 'กัดที่ไหล่', 'โถมใส่อย่างบ้าคลั่ง'],
    drops: [
      { itemId: 'void_crystal', chance: 0.12 },
      { itemId: 'crystal_shard', chance: 0.35 },
      { itemId: 'ancient_scroll', chance: 0.1 },
      { itemId: 'health_potion_medium', chance: 0.15 },
    ],
    flee_chance: 0.6,
  },

  shadow_rogue: {
    monsterId: 'shadow_rogue', name: 'Shadow Rogue', emoji: '🥷',
    zone: 'city_ruins',
    level: 14, xpReward: 120, goldReward: [50, 90],
    hp: 160, atk: 55, def: 10, spd: 22,
    desc: 'โจรที่ตายในเมือง กลายร่างเป็นเงา โจมตีจากมุมมืดสุดคม',
    attackMsg: ['แทงจากหลัง', 'ฟันสองมือ', 'ปาดคอในความมืด'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.4 },
      { itemId: 'void_crystal', chance: 0.15 },
      { itemId: 'steel_ingot', chance: 0.25 },
      { itemId: 'shadow_dagger', chance: 0.06 },
    ],
    flee_chance: 0.55,
  },

  iron_golem_shard: {
    monsterId: 'iron_golem_shard', name: 'Iron Golem Fragment', emoji: '🤖',
    zone: 'city_ruins',
    level: 16, xpReward: 180, goldReward: [80, 130],
    hp: 500, atk: 60, def: 45, spd: 2,
    desc: 'ชิ้นส่วนของ Iron Golem เก่าที่ยังเคลื่อนไหวได้ ทุบยาก',
    attackMsg: ['กดทับด้วยกำปั้นเหล็ก', 'ยิงไอน้ำร้อน', 'กระแทกพื้น'],
    drops: [
      { itemId: 'steel_ingot', chance: 0.8 },
      { itemId: 'iron_ore', chance: 0.9 },
      { itemId: 'void_crystal', chance: 0.2 },
      { itemId: 'golem_core', chance: 0.15 },
    ],
    flee_chance: 0.95,
    special: 'mini_boss',
  },

  // ===== ZONE: cursed_marshlands (Lv 18-28) =====
  bog_lurker: {
    monsterId: 'bog_lurker', name: 'Bog Lurker', emoji: '🐊',
    zone: 'cursed_marshlands',
    level: 18, xpReward: 160, goldReward: [60, 100],
    hp: 310, atk: 65, def: 25, spd: 7,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 12 },
    desc: 'สัตว์เลื้อยคลานขนาดใหญ่ที่ถูกพิษหนองสาบเข้าสิง ซ่อนอยู่ในโคลน',
    attackMsg: ['กัดดึงลงน้ำ', 'ตีด้วยหาง', 'พ่นพิษหนอง'],
    drops: [
      { itemId: 'bog_scale', chance: 0.6 },
      { itemId: 'antidote', chance: 0.4 },
      { itemId: 'void_crystal', chance: 0.18 },
      { itemId: 'ancient_scroll', chance: 0.12 },
    ],
    flee_chance: 0.6,
  },

  swamp_wraith: {
    monsterId: 'swamp_wraith', name: 'Swamp Wraith', emoji: '👻',
    zone: 'cursed_marshlands',
    level: 20, xpReward: 190, goldReward: [70, 120],
    hp: 240, atk: 72, def: 15, spd: 16,
    mpDrain: 15,
    desc: 'วิญญาณติดอยู่ในหนอง ดูดพลังมนตร์จากเหยื่อ',
    attackMsg: ['ดูด MP', 'ส่งคลื่นความหนาว', 'แทะผ่านกาย'],
    drops: [
      { itemId: 'void_crystal', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.2 },
      { itemId: 'mp_potion_medium', chance: 0.25 },
      { itemId: 'wraith_essence', chance: 0.15 },
    ],
    flee_chance: 0.5,
  },

  giant_leech: {
    monsterId: 'giant_leech', name: 'Giant Leech', emoji: '🪱',
    zone: 'cursed_marshlands',
    level: 22, xpReward: 210, goldReward: [80, 140],
    hp: 380, atk: 68, def: 20, spd: 5,
    lifesteal: 0.3,
    desc: 'ปลิงยักษ์ขนาดแขน ดูดเลือดและฟื้น HP ตัวเอง',
    attackMsg: ['ดูดเลือด', 'พันรอบตัว', 'หลั่งกรดกัดกร่อน'],
    drops: [
      { itemId: 'bog_scale', chance: 0.5 },
      { itemId: 'slime_gel', chance: 0.7 },
      { itemId: 'health_potion_large', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.1 },
    ],
    flee_chance: 0.65,
  },

  marsh_basilisk: {
    monsterId: 'marsh_basilisk', name: 'Marsh Basilisk', emoji: '🦎',
    zone: 'cursed_marshlands',
    level: 25, xpReward: 280, goldReward: [100, 180],
    hp: 420, atk: 88, def: 35, spd: 10,
    statusAttack: { type: 'STUN', chance: 0.3, duration: 1, dmgPerTurn: 0 },
    desc: 'บาซิลิสก์หนองน้ำ สายตาทำให้เป็นหินชั่วคราว',
    attackMsg: ['จ้องตาทำให้งง', 'กัดด้วยพิษหิน', 'ตีด้วยหางหิน'],
    drops: [
      { itemId: 'basilisk_scale', chance: 0.5 },
      { itemId: 'void_crystal', chance: 0.25 },
      { itemId: 'ancient_scroll', chance: 0.2 },
      { itemId: 'basilisk_eye', chance: 0.1 },
    ],
    flee_chance: 0.55,
    special: 'mini_boss',
  },

  // ===== ZONE: void_frontier (Lv 28-40) =====
  void_stalker: {
    monsterId: 'void_stalker', name: 'Void Stalker', emoji: '🕳️',
    zone: 'void_frontier',
    level: 28, xpReward: 320, goldReward: [120, 200],
    hp: 350, atk: 100, def: 20, spd: 25,
    desc: 'นักล่าจาก The Void เคลื่อนที่เหนือแสง โจมตีก่อนที่เห็น',
    attackMsg: ['โจมตีจากมิติอื่น', 'ตัดผ่านความว่างเปล่า', 'เร่งความเร็ว Void'],
    drops: [
      { itemId: 'void_crystal', chance: 0.5 },
      { itemId: 'void_essence', chance: 0.25 },
      { itemId: 'ancient_scroll', chance: 0.15 },
      { itemId: 'void_dagger', chance: 0.05 },
    ],
    flee_chance: 0.4,
  },

  soul_harvester: {
    monsterId: 'soul_harvester', name: 'Soul Harvester', emoji: '💀',
    zone: 'void_frontier',
    level: 32, xpReward: 400, goldReward: [150, 250],
    hp: 480, atk: 115, def: 28, spd: 14,
    desc: 'ปีศาจเก็บเกี่ยววิญญาณ ยิ่งฆ่ายิ่งแกร่ง',
    attackMsg: ['เก็บเกี่ยววิญญาณ', 'เคียวเงาหวด', 'ดูด XP ออกจากร่าง'],
    drops: [
      { itemId: 'void_crystal', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.35 },
      { itemId: 'soul_gem', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.25 },
    ],
    flee_chance: 0.45,
  },

  void_titan: {
    monsterId: 'void_titan', name: 'Void Titan', emoji: '🌑',
    zone: 'void_frontier',
    level: 36, xpReward: 550, goldReward: [200, 350],
    hp: 900, atk: 140, def: 50, spd: 6,
    regen: 15,
    desc: 'ไททันแห่ง Void มหาศาล ฟื้นฟูตัวเองจากพลังงานมืด',
    attackMsg: ['กำปั้นแห่ง Void', 'คลื่นพลังงานมืด', 'บดขยี้ด้วยน้ำหนัก'],
    drops: [
      { itemId: 'void_crystal', chance: 0.8 },
      { itemId: 'void_essence', chance: 0.5 },
      { itemId: 'soul_gem', chance: 0.3 },
      { itemId: 'titan_core', chance: 0.12 },
    ],
    flee_chance: 0.8,
    special: 'mini_boss',
  },

  chaos_elemental: {
    monsterId: 'chaos_elemental', name: 'Chaos Elemental', emoji: '🌀',
    zone: 'void_frontier',
    level: 38, xpReward: 600, goldReward: [220, 380],
    hp: 550, atk: 155, def: 30, spd: 18,
    desc: 'ธาตุแห่งความโกลาหล ทุกตีมีองค์ประกอบแตกต่าง คาดเดาไม่ได้',
    attackMsg: ['ฟ้าผ่า Chaos', 'ไฟน้ำแข็งพร้อมกัน', 'ระเบิดพลังงานสุ่ม'],
    drops: [
      { itemId: 'void_crystal', chance: 0.7 },
      { itemId: 'void_essence', chance: 0.4 },
      { itemId: 'chaos_shard', chance: 0.25 },
      { itemId: 'ancient_scroll', chance: 0.3 },
    ],
    flee_chance: 0.5,
  },

};

// Zone monster pools
const ZONE_MONSTERS = {
  town_outskirts:     ['stray_dog', 'goblin_scout'],
  forest_path:        ['forest_wolf', 'goblin_warrior', 'giant_spider', 'ancient_treant'],
  dark_cave:          ['cave_bat', 'cave_troll', 'void_wisp'],
  city_ruins:         ['ruined_knight', 'plague_rat', 'city_ghoul', 'shadow_rogue', 'iron_golem_shard'],
  cursed_marshlands:  ['bog_lurker', 'swamp_wraith', 'giant_leech', 'marsh_basilisk'],
  void_frontier:      ['void_stalker', 'soul_harvester', 'void_titan', 'chaos_elemental'],
};

function getMonster(monsterId) {
  return MONSTERS[monsterId] || null;
}

function getRandomMonster(zone) {
  const pool = ZONE_MONSTERS[zone] || [];
  if (!pool.length) return null;
  // Weight mini-bosses lower
  const filtered = pool.filter(id => !MONSTERS[id]?.special || Math.random() < 0.2);
  const pick = filtered.length ? filtered : pool;
  return MONSTERS[pick[Math.floor(Math.random() * pick.length)]];
}

// Calculate damage with variance ±15%
function calcDamage(atk, def) {
  const base    = Math.max(1, atk - def * 0.5);
  const variance = base * 0.15;
  const raw     = base + (Math.random() * variance * 2 - variance);
  return Math.max(1, Math.round(raw));
}

module.exports = { MONSTERS, ZONE_MONSTERS, getMonster, getRandomMonster, calcDamage };
