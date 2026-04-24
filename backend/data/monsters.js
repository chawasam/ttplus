// data/monsters.js — Monster definitions for Ashenveil

const MONSTERS = {

  // ===== ZONE: town_outskirts =====
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

  // ===== ZONE: forest_path =====
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
    flee_chance: 0.9, // วิ่งหนีจากต้นไม้ได้ง่าย
    special: 'mini_boss',
  },

  // ===== ZONE: dark_cave =====
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
    regen: 8, // ฟื้น HP ทุก turn
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
    desc: 'วิญญาณจาก The Void หลุดเข้ามาในโลก ไม่มีรูปร่างชัดเจน โจมตีไม่ค่อยโดน',
    attackMsg: ['ดูดพลังงาน', 'แทงทะลุกาย', 'ส่งคลื่นความกลัว'],
    drops: [
      { itemId: 'void_crystal', chance: 0.25 },
      { itemId: 'crystal_shard', chance: 0.4 },
      { itemId: 'ancient_scroll', chance: 0.1 },
    ],
    flee_chance: 0.5, // หนียาก
  },

};

// Zone definitions (monsters ที่อาจเจอ)
const ZONE_MONSTERS = {
  town_outskirts: ['stray_dog', 'goblin_scout'],
  forest_path:    ['forest_wolf', 'goblin_warrior', 'giant_spider', 'ancient_treant'],
  dark_cave:      ['cave_bat', 'cave_troll', 'void_wisp'],
};

function getMonster(monsterId) {
  return MONSTERS[monsterId] || null;
}

function getRandomMonster(zone) {
  const pool = ZONE_MONSTERS[zone] || [];
  if (!pool.length) return null;
  return MONSTERS[pool[Math.floor(Math.random() * pool.length)]];
}

// Calculate damage with variance ±15%
function calcDamage(atk, def) {
  const base    = Math.max(1, atk - def * 0.5);
  const variance = base * 0.15;
  const raw     = base + (Math.random() * variance * 2 - variance);
  return Math.max(1, Math.round(raw));
}

module.exports = { MONSTERS, ZONE_MONSTERS, getMonster, getRandomMonster, calcDamage };
