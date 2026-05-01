// data/monsters.js — Monster definitions for Ashenveil (Balanced v2)

const MONSTERS = {

  // ===== ZONE: town_outskirts (Lv 1-5) =====
  stray_dog: {
    monsterId: 'stray_dog', name: 'Stray Dog', emoji: '🐕',
    zone: 'town_outskirts', type: 'beast',
    level: 1, xpReward: 10, goldReward: [3, 8],
    hp: 195, atk: 18, def: 4, spd: 10,
    desc: 'สุนัขจรจัดที่หิวโหย ดวงตาดุดัน',
    attackMsg: ['กัดข้อเท้า', 'พุ่งเข้าหา', 'ขย้ำแขน'],
    drops: [
      { itemId: 'bread', chance: 0.1 },
      { itemId: 'monster_fang', chance: 0.2 },
    ],
    flee_chance: 0.8,
  },

  feral_cat: {
    monsterId: 'feral_cat', name: 'Feral Cat', emoji: '🐱',
    zone: 'town_outskirts', type: 'beast',
    level: 1, xpReward: 8, goldReward: [2, 6],
    hp: 170, atk: 18, def: 3, spd: 14,
    statusAttack: { type: 'BLEED', chance: 0.2, duration: 2, dmgPerTurn: 5 },
    desc: 'แมวป่าที่หิวโหยและดุร้าย เล็บแหลมคมพอฉีกหนัง',
    attackMsg: ['ข่วนหน้า', 'กัดนิ้ว', 'พุ่งตะปบ'],
    drops: [
      { itemId: 'monster_fang', chance: 0.25 },
      { itemId: 'wild_flower', chance: 0.1 },
    ],
    flee_chance: 0.85,
  },

  giant_rat: {
    monsterId: 'giant_rat', name: 'Giant Rat', emoji: '🐀',
    zone: 'town_outskirts', type: 'beast',
    level: 2, xpReward: 12, goldReward: [4, 10],
    hp: 205, atk: 19, def: 4, spd: 10,
    statusAttack: { type: 'POISON', chance: 0.25, duration: 2, dmgPerTurn: 4 },
    desc: 'หนูกลายพันธุ์ขนาดสุนัข อาศัยอยู่ตามท่อระบายน้ำ',
    attackMsg: ['กัดติดโรค', 'ตะปบด้วยเล็บ', 'พุ่งโดด'],
    drops: [
      { itemId: 'slime_gel', chance: 0.3 },
      { itemId: 'bread', chance: 0.1 },
    ],
    flee_chance: 0.75,
  },

  plague_bat: {
    monsterId: 'plague_bat', name: 'Plague Bat', emoji: '🦇',
    zone: 'town_outskirts', type: 'beast',
    level: 2, xpReward: 11, goldReward: [3, 9],
    hp: 190, atk: 20, def: 3, spd: 14,
    statusAttack: { type: 'POISON', chance: 0.3, duration: 2, dmgPerTurn: 5 },
    desc: 'ค้างคาวพาหะโรคระบาด บินวนอยู่รอบชุมชนช่วงกลางคืน',
    attackMsg: ['โฉบกัด', 'กรีดด้วยปีก', 'ส่งเสียงรบกวน'],
    drops: [
      { itemId: 'monster_fang', chance: 0.2 },
      { itemId: 'antidote', chance: 0.1 },
    ],
    flee_chance: 0.8,
  },

  goblin_scout: {
    monsterId: 'goblin_scout', name: 'Goblin Scout', emoji: '👺',
    zone: 'town_outskirts', type: 'human',
    level: 2, xpReward: 18, goldReward: [6, 15],
    hp: 225, atk: 22, def: 6, spd: 8,
    desc: 'โกบลินผอมบาง ตัวเล็ก แต่เร็วและฉลาดแกมโกง',
    attackMsg: ['แทงด้วยหลาว', 'ขว้างก้อนหิน', 'กัดอย่างสุนัข'],
    drops: [
      { itemId: 'goblin_ear', chance: 0.8 },
      { itemId: 'monster_fang', chance: 0.3 },
      { itemId: 'health_potion_small', chance: 0.15 },
    ],
    flee_chance: 0.75,
  },

  bandit_thug: {
    monsterId: 'bandit_thug', name: 'Bandit Thug', emoji: '🗡️',
    zone: 'town_outskirts', type: 'human',
    level: 2, xpReward: 14, goldReward: [5, 12],
    hp: 215, atk: 22, def: 5, spd: 7,
    desc: 'โจรถนนที่โดนขับไล่ออกจากกลุ่ม ระเบิดอารมณ์ง่าย',
    attackMsg: ['ฟันด้วยมีด', 'กระแทกหัวเข่า', 'ปาดิน'],
    drops: [
      { itemId: 'iron_ore', chance: 0.2 },
      { itemId: 'bread', chance: 0.15 },
      { itemId: 'health_potion_small', chance: 0.1 },
    ],
    flee_chance: 0.7,
  },

  corrupt_farmer: {
    monsterId: 'corrupt_farmer', name: 'Corrupt Farmer', emoji: '🧑‍🌾',
    zone: 'town_outskirts', type: 'human',
    level: 3, xpReward: 20, goldReward: [7, 16],
    hp: 265, atk: 24, def: 7, spd: 6,
    desc: 'ชาวนาที่ถูกพิษ Void ปนเปื้อน ดวงตาสีม่วงมืด',
    attackMsg: ['ฟันด้วยเคียว', 'ขว้างจอบ', 'กรีดด้วยเล็บ'],
    drops: [
      { itemId: 'rotten_wood', chance: 0.4 },
      { itemId: 'wild_flower', chance: 0.2 },
      { itemId: 'goblin_ear', chance: 0.15 },
    ],
    flee_chance: 0.7,
  },

  hollow_scarecrow: {
    monsterId: 'hollow_scarecrow', name: 'Hollow Scarecrow', emoji: '🎃',
    zone: 'town_outskirts', type: 'undead',
    level: 3, xpReward: 22, goldReward: [8, 18],
    hp: 295, atk: 22, def: 9, spd: 5,
    desc: 'หุ่นไล่กาที่ถูกวิญญาณเข้าสิง เคลื่อนไหวกระตุกๆ น่าขนลุก',
    attackMsg: ['ตบด้วยมือฟาง', 'ปักด้วยไม้', 'ขัดขวางการหลีก'],
    drops: [
      { itemId: 'rotten_wood', chance: 0.6 },
      { itemId: 'ancient_scroll', chance: 0.05 },
    ],
    flee_chance: 0.75,
  },

  mud_crab: {
    monsterId: 'mud_crab', name: 'Mud Crab', emoji: '🦀',
    zone: 'town_outskirts', type: 'beast',
    level: 3, xpReward: 24, goldReward: [8, 20],
    hp: 315, atk: 20, def: 13, spd: 4,
    desc: 'ปูโคลนขนาดใหญ่ กระดองแข็งมาก แต่ช้า',
    attackMsg: ['หนีบด้วยก้าม', 'กดทับ', 'ฉีดน้ำโคลน'],
    drops: [
      { itemId: 'slime_gel', chance: 0.5 },
      { itemId: 'monster_fang', chance: 0.2 },
    ],
    flee_chance: 0.8,
  },

  bone_imp: {
    monsterId: 'bone_imp', name: 'Bone Imp', emoji: '💀',
    zone: 'town_outskirts', type: 'undead',
    level: 4, xpReward: 32, goldReward: [10, 22],
    hp: 335, atk: 28, def: 8, spd: 9,
    desc: 'อิมป์กระดูกขนาดเล็ก กระโดดโจมตีอย่างบ้าคลั่ง',
    attackMsg: ['กรีดด้วยกระดูก', 'กัดคอ', 'ระเบิดพลังงานความมืด'],
    drops: [
      { itemId: 'monster_fang', chance: 0.4 },
      { itemId: 'ancient_scroll', chance: 0.06 },
      { itemId: 'health_potion_small', chance: 0.1 },
    ],
    flee_chance: 0.65,
  },

  // ===== ZONE: forest_path (Lv 3-10) =====
  vine_serpent: {
    monsterId: 'vine_serpent', name: 'Vine Serpent', emoji: '🐍',
    zone: 'forest_path', type: 'beast',
    level: 3, xpReward: 25, goldReward: [9, 20],
    hp: 280, atk: 26, def: 6, spd: 9,
    statusAttack: { type: 'POISON', chance: 0.3, duration: 3, dmgPerTurn: 6 },
    desc: 'งูที่ลวดลายคล้ายเส้นเถา ซ่อนตัวในพุ่มไม้รอเหยื่อ',
    attackMsg: ['กัดพิษ', 'พันรอบตัว', 'โจมตีสายฟ้า'],
    drops: [
      { itemId: 'slime_gel', chance: 0.4 },
      { itemId: 'antidote', chance: 0.15 },
      { itemId: 'wild_flower', chance: 0.2 },
    ],
    flee_chance: 0.65,
  },

  forest_boar: {
    monsterId: 'forest_boar', name: 'Forest Boar', emoji: '🐗',
    zone: 'forest_path', type: 'beast',
    level: 3, xpReward: 26, goldReward: [9, 22],
    hp: 335, atk: 24, def: 10, spd: 7,
    desc: 'หมูป่าขนาดใหญ่ งาแหลม วิ่งพุ่งเต็มแรง',
    attackMsg: ['พุ่งงา', 'เหยียบ', 'คำรามขู่'],
    drops: [
      { itemId: 'rotten_wood', chance: 0.3 },
      { itemId: 'monster_fang', chance: 0.4 },
      { itemId: 'wild_flower', chance: 0.15 },
    ],
    flee_chance: 0.7,
  },

  forest_wolf: {
    monsterId: 'forest_wolf', name: 'Forest Wolf', emoji: '🐺',
    zone: 'forest_path', type: 'beast',
    level: 3, xpReward: 28, goldReward: [8, 18],
    hp: 310, atk: 28, def: 8, spd: 10,
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
    zone: 'forest_path', type: 'human',
    level: 4, xpReward: 40, goldReward: [10, 22],
    hp: 365, atk: 32, def: 10, spd: 5,
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
    zone: 'forest_path', type: 'beast',
    level: 4, xpReward: 38, goldReward: [8, 16],
    hp: 310, atk: 28, def: 7, spd: 12,
    statusAttack: { type: 'POISON', chance: 0.35, duration: 3, dmgPerTurn: 8 },
    desc: 'แมงมุมขนาดยักษ์ แปดตาเปล่งประกาย พิษถึงตาย',
    attackMsg: ['กัดด้วยเขี้ยวพิษ', 'ปาตาข่าย', 'ตะปบด้วยขา'],
    moves: [
      { name: 'ฉีกด้วยเขี้ยว', emoji: '🕷️', dmgMult: 1.0, weight: 50 },
      { name: 'Web Wrap', emoji: '🕸️', dmgMult: 0.6, weight: 30, effect: { type: 'SLOW', duration: 2, atkMult: 0.75 } },
      { name: 'Venom Strike', emoji: '☠️', dmgMult: 0.8, weight: 20, telegraphed: true, effect: { type: 'POISON', duration: 3, dmgPerTurn: 8 } },
    ],
    drops: [
      { itemId: 'slime_gel', chance: 0.6 },
      { itemId: 'antidote', chance: 0.2 },
      { itemId: 'blue_gem_fragment', chance: 0.08 },
    ],
    flee_chance: 0.7,
  },

  goblin_shaman: {
    monsterId: 'goblin_shaman', name: 'Goblin Shaman', emoji: '🧙',
    zone: 'forest_path', type: 'human',
    level: 5, xpReward: 50, goldReward: [14, 28],
    hp: 365, atk: 32, def: 7, spd: 8,
    desc: 'หมอผีโกบลินที่ร่ายมนตร์ได้ ขอบตาวาดด้วยเขม่า',
    attackMsg: ['ขว้างลูกไฟ', 'สาปช้า', 'เรียกโกบลินมาช่วย'],
    drops: [
      { itemId: 'goblin_ear', chance: 0.7 },
      { itemId: 'ancient_scroll', chance: 0.15 },
      { itemId: 'health_potion_small', chance: 0.2 },
    ],
    flee_chance: 0.65,
  },

  giant_hornet: {
    monsterId: 'giant_hornet', name: 'Giant Hornet', emoji: '🐝',
    zone: 'forest_path', type: 'beast',
    level: 5, xpReward: 45, goldReward: [12, 24],
    hp: 310, atk: 30, def: 5, spd: 16,
    statusAttack: { type: 'POISON', chance: 0.35, duration: 2, dmgPerTurn: 8 },
    desc: 'แตนยักษ์ขนาดแมว ต่อยพิษและบินเร็วมาก',
    attackMsg: ['ต่อยพิษ', 'โฉบพุ่ง', 'โจมตีแบบหมู่'],
    drops: [
      { itemId: 'monster_fang', chance: 0.4 },
      { itemId: 'antidote', chance: 0.25 },
      { itemId: 'slime_gel', chance: 0.2 },
    ],
    flee_chance: 0.6,
  },

  stone_golem_shard: {
    monsterId: 'stone_golem_shard', name: 'Stone Golem Shard', emoji: '🗿',
    zone: 'forest_path', type: 'construct',
    level: 6, xpReward: 80, goldReward: [20, 40],
    hp: 505, atk: 30, def: 20, spd: 3,
    desc: 'ชิ้นส่วนของหินผีที่ยังเคลื่อนไหวได้ในป่า กระดองแน่นหนา',
    attackMsg: ['กระแทกหมัดหิน', 'กดทับ', 'ปาก้อนหิน'],
    drops: [
      { itemId: 'iron_ore', chance: 0.6 },
      { itemId: 'crystal_shard', chance: 0.2 },
      { itemId: 'rotten_wood', chance: 0.3 },
    ],
    flee_chance: 0.85,
    special: 'mini_boss',
  },

  shadow_elk: {
    monsterId: 'shadow_elk', name: 'Shadow Elk', emoji: '🦌',
    zone: 'forest_path', type: 'beast',
    level: 7, xpReward: 90, goldReward: [25, 50],
    hp: 590, atk: 40, def: 14, spd: 12,
    desc: 'กวางเงาแห่งป่าลึก เขาเรืองแสงสีม่วง ร่างกายทำจากความมืด',
    attackMsg: ['ขวิดด้วยเขา', 'เหยียบ', 'คลื่นเงา'],
    drops: [
      { itemId: 'wolf_pelt', chance: 0.5 },
      { itemId: 'void_crystal', chance: 0.1 },
      { itemId: 'crystal_shard', chance: 0.2 },
    ],
    flee_chance: 0.6,
  },

  ancient_treant: {
    monsterId: 'ancient_treant', name: 'Ancient Treant', emoji: '🌳',
    zone: 'forest_path', type: 'beast',
    level: 6, xpReward: 120, goldReward: [20, 40],
    hp: 895, atk: 50, def: 18, spd: 2,
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
    zone: 'dark_cave', type: 'beast',
    level: 5, xpReward: 28, goldReward: [6, 14],
    hp: 265, atk: 24, def: 5, spd: 15,
    desc: 'ค้างคาวถ้ำตัวใหญ่ บินวนซ้ำหลอกทิศทาง',
    attackMsg: ['โฉบเฉี่ยวข้ามหัว', 'ฝูงบินพุ่งเข้าหา', 'ส่งเสียงอัลตราโซนิก'],
    drops: [
      { itemId: 'monster_fang', chance: 0.4 },
    ],
    flee_chance: 0.7,
  },

  cave_spider: {
    monsterId: 'cave_spider', name: 'Cave Spider', emoji: '🕷️',
    zone: 'dark_cave', type: 'beast',
    level: 5, xpReward: 35, goldReward: [10, 22],
    hp: 200, atk: 26, def: 6, spd: 12,
    statusAttack: { type: 'POISON', chance: 0.3, duration: 2, dmgPerTurn: 7 },
    desc: 'แมงมุมถ้ำตาบอด ล่าเหยื่อด้วยการสั่นสะเทือน',
    attackMsg: ['กัดเขี้ยวพิษ', 'ปาใย', 'ตะปบสายฟ้า'],
    drops: [
      { itemId: 'slime_gel', chance: 0.5 },
      { itemId: 'antidote', chance: 0.2 },
    ],
    flee_chance: 0.7,
  },

  crystal_lizard: {
    monsterId: 'crystal_lizard', name: 'Crystal Lizard', emoji: '🦎',
    zone: 'dark_cave', type: 'beast',
    level: 6, xpReward: 48, goldReward: [14, 28],
    hp: 280, atk: 28, def: 16, spd: 8,
    desc: 'กิ้งก่าที่กินผลึกมาจนผิวหนังกลายเป็นผลึก DEF สูง',
    attackMsg: ['ตีด้วยหางผลึก', 'กัดเจ็บปวด', 'สะท้อนแสงตาบอด'],
    drops: [
      { itemId: 'crystal_shard', chance: 0.5 },
      { itemId: 'blue_gem_fragment', chance: 0.2 },
    ],
    flee_chance: 0.75,
  },

  blind_stalker: {
    monsterId: 'blind_stalker', name: 'Blind Stalker', emoji: '👁️',
    zone: 'dark_cave', type: 'undead',
    level: 6, xpReward: 52, goldReward: [15, 30],
    hp: 310, atk: 30, def: 10, spd: 10,
    desc: 'วิญญาณที่หลงทางในถ้ำ ตาบอดแต่รับรู้ความร้อน',
    attackMsg: ['กรงเล็บเงา', 'ดูดพลัง', 'โจมตีเงา'],
    drops: [
      { itemId: 'void_crystal', chance: 0.1 },
      { itemId: 'ancient_scroll', chance: 0.08 },
    ],
    flee_chance: 0.65,
  },

  dark_dwarf: {
    monsterId: 'dark_dwarf', name: 'Dark Dwarf', emoji: '⛏️',
    zone: 'dark_cave', type: 'human',
    level: 8, xpReward: 75, goldReward: [22, 45],
    hp: 400, atk: 38, def: 18, spd: 6,
    desc: 'คนแคระใต้ดินที่ถูกความมืดกลืนกิน ฟันด้วยขวานหนักมือ',
    attackMsg: ['ฟันขวาน', 'เหวี่ยงค้อน', 'ตะโกนใส่หน้า'],
    drops: [
      { itemId: 'iron_ore', chance: 0.7 },
      { itemId: 'steel_ingot', chance: 0.15 },
      { itemId: 'crystal_shard', chance: 0.1 },
    ],
    flee_chance: 0.6,
  },

  ghost_miner: {
    monsterId: 'ghost_miner', name: 'Ghost Miner', emoji: '👻',
    zone: 'dark_cave', type: 'undead',
    level: 9, xpReward: 85, goldReward: [25, 50],
    hp: 340, atk: 42, def: 12, spd: 8,
    desc: 'ผีคนงานเหมืองที่ตายในอุบัติเหตุ ยังถือจอบอยู่',
    attackMsg: ['ฟันด้วยจอบ', 'ส่งเสียงหลอน', 'ดูดพลัง'],
    drops: [
      { itemId: 'iron_ore', chance: 0.5 },
      { itemId: 'crystal_shard', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.08 },
    ],
    flee_chance: 0.6,
  },

  rock_elemental: {
    monsterId: 'rock_elemental', name: 'Rock Elemental', emoji: '🪨',
    zone: 'dark_cave', type: 'construct',
    level: 10, xpReward: 120, goldReward: [30, 60],
    hp: 520, atk: 38, def: 28, spd: 4,
    desc: 'ธาตุหินที่เกิดขึ้นเองในถ้ำลึก ร่างกายทำจากหินล้วน',
    attackMsg: ['กำปั้นหิน', 'กระแทกพื้น', 'สะเก็ดหิน'],
    drops: [
      { itemId: 'iron_ore', chance: 0.8 },
      { itemId: 'crystal_shard', chance: 0.4 },
      { itemId: 'steel_ingot', chance: 0.1 },
    ],
    flee_chance: 0.85,
  },

  cave_wyrm: {
    monsterId: 'cave_wyrm', name: 'Cave Wyrm', emoji: '🐲',
    zone: 'dark_cave', type: 'beast',
    level: 12, xpReward: 160, goldReward: [40, 80],
    hp: 600, atk: 50, def: 20, spd: 10,
    desc: 'มังกรถ้ำขนาดกลาง ยังอ่อนวัย แต่ก็อันตราย',
    attackMsg: ['หายใจไฟ', 'กัดด้วยฟัน', 'ตีด้วยหาง'],
    drops: [
      { itemId: 'dragon_scale', chance: 0.3 },
      { itemId: 'crystal_shard', chance: 0.5 },
      { itemId: 'void_crystal', chance: 0.1 },
    ],
    flee_chance: 0.5,
  },

  cave_troll: {
    monsterId: 'cave_troll', name: 'Cave Troll', emoji: '👾',
    zone: 'dark_cave', type: 'beast',
    level: 7, xpReward: 150, goldReward: [25, 50],
    hp: 700, atk: 55, def: 20, spd: 3,
    regen: 8,
    desc: 'ทรอลล์ใต้ถ้ำ ผิวหนาแน่น ฟื้นร่างกายตัวเองได้เรื่อยๆ',
    attackMsg: ['ทุบด้วยกำปั้นหิน', 'โยนก้อนหิน', 'ทำให้ตึงตัว'],
    moves: [
      { name: 'ทุบกำปั้น', emoji: '👊', dmgMult: 1.0, weight: 50 },
      { name: 'โยนก้อนหิน', emoji: '🪨', dmgMult: 0.8, weight: 30 },
      { name: 'Crushing Slam', emoji: '💥', dmgMult: 1.6, weight: 20, telegraphed: true },
    ],
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
    zone: 'dark_cave', type: 'void',
    level: 8, xpReward: 100, goldReward: [20, 45],
    hp: 340, atk: 60, def: 8, spd: 14,
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
    zone: 'city_ruins', type: 'undead',
    level: 10, xpReward: 130, goldReward: [35, 65],
    hp: 770, atk: 76, def: 30, spd: 5,
    desc: 'อัศวินที่ตายในสงครามและลุกขึ้นมาอีก เกราะแตกร้าวแต่ยังสู้ได้',
    attackMsg: ['ฟาดด้วยดาบสนิม', 'กดโล่เก่าทับ', 'พุ่งจากด้านหลัง'],
    moves: [
      { name: 'ฟันดาบสนิม', emoji: '⚔️', dmgMult: 1.0, weight: 50 },
      { name: 'Shield Bash', emoji: '🛡️', dmgMult: 0.7, weight: 30, effect: { type: 'STUN', duration: 1 } },
      { name: 'Death Charge', emoji: '💀', dmgMult: 1.5, weight: 20, telegraphed: true },
    ],
    drops: [
      { itemId: 'iron_ore', chance: 0.6 },
      { itemId: 'steel_ingot', chance: 0.3 },
      { itemId: 'chainmail_fragment', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.08 },
    ],
    flee_chance: 0.7,
  },

  tomb_revenant: {
    monsterId: 'tomb_revenant', name: 'Tomb Revenant', emoji: '⚰️',
    zone: 'city_ruins', type: 'undead',
    level: 11, xpReward: 145, goldReward: [40, 72],
    hp: 460, atk: 45, def: 12, spd: 6,
    desc: 'ผีที่ถูกฝังทั้งเป็นในหลุมฝังศพ เต็มไปด้วยความแค้น',
    attackMsg: ['กรีดเล็บดำ', 'ดูดชีพ', 'ปลุกวิญญาณ'],
    drops: [
      { itemId: 'void_crystal', chance: 0.15 },
      { itemId: 'crystal_shard', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.1 },
    ],
    flee_chance: 0.65,
  },

  plague_rat: {
    monsterId: 'plague_rat', name: 'Plague Rat', emoji: '🐀',
    zone: 'city_ruins', type: 'beast',
    level: 11, xpReward: 110, goldReward: [25, 45],
    hp: 520, atk: 64, def: 10, spd: 18,
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
    zone: 'city_ruins', type: 'undead',
    level: 12, xpReward: 150, goldReward: [40, 70],
    hp: 700, atk: 70, def: 12, spd: 8,
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

  bone_archer: {
    monsterId: 'bone_archer', name: 'Bone Archer', emoji: '🏹',
    zone: 'city_ruins', type: 'undead',
    level: 12, xpReward: 135, goldReward: [35, 65],
    hp: 380, atk: 48, def: 10, spd: 14,
    desc: 'โครงกระดูกยิงธนูแม่นยำ ซ่อนตัวบนซากปรักหักพัง',
    attackMsg: ['ยิงธนูกระดูก', 'ธนูพิษ', 'ถ่วงขา'],
    drops: [
      { itemId: 'iron_ore', chance: 0.4 },
      { itemId: 'monster_fang', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.06 },
    ],
    flee_chance: 0.65,
  },

  rust_golem: {
    monsterId: 'rust_golem', name: 'Rust Golem', emoji: '🤖',
    zone: 'city_ruins', type: 'construct',
    level: 13, xpReward: 175, goldReward: [45, 85],
    hp: 580, atk: 50, def: 32, spd: 3,
    desc: 'โกเลมสนิมเก่าที่ยังทำงานอยู่ ลำตัวส่งเสียงดังเอี๊ยด',
    attackMsg: ['หมัดเหล็กสนิม', 'พ่นไอน้ำ', 'กระแทกพื้น'],
    drops: [
      { itemId: 'steel_ingot', chance: 0.5 },
      { itemId: 'iron_ore', chance: 0.7 },
      { itemId: 'void_crystal', chance: 0.1 },
    ],
    flee_chance: 0.8,
  },

  void_spawn: {
    monsterId: 'void_spawn', name: 'Void Spawn', emoji: '🕳️',
    zone: 'city_ruins', type: 'void',
    level: 15, xpReward: 210, goldReward: [55, 100],
    hp: 480, atk: 60, def: 14, spd: 12,
    desc: 'สิ่งมีชีวิตที่คลานออกมาจากรอยแยกแห่ง Void ในเมือง',
    attackMsg: ['ดูดพลัง', 'โจมตีมิติ', 'แตกตัว'],
    drops: [
      { itemId: 'void_crystal', chance: 0.3 },
      { itemId: 'crystal_shard', chance: 0.4 },
      { itemId: 'ancient_scroll', chance: 0.12 },
    ],
    flee_chance: 0.55,
  },

  shadow_rogue: {
    monsterId: 'shadow_rogue', name: 'Shadow Rogue', emoji: '🥷',
    zone: 'city_ruins', type: 'human',
    level: 14, xpReward: 180, goldReward: [50, 90],
    hp: 600, atk: 85, def: 12, spd: 22,
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

  forsaken_mage: {
    monsterId: 'forsaken_mage', name: 'Forsaken Mage', emoji: '🧙',
    zone: 'city_ruins', type: 'human',
    level: 17, xpReward: 240, goldReward: [65, 120],
    hp: 440, atk: 75, def: 12, spd: 15,
    statusAttack: { type: 'BURN', chance: 0.35, duration: 2, dmgPerTurn: 12 },
    desc: 'นักเวทย์ที่ขายวิญญาณเพื่อพลังและตายในสภาพสิ้นหวัง',
    attackMsg: ['ขว้าง Fireball', 'เวทมนตร์ Frost', 'สาป Void'],
    drops: [
      { itemId: 'ancient_scroll', chance: 0.4 },
      { itemId: 'void_crystal', chance: 0.2 },
      { itemId: 'steel_ingot', chance: 0.2 },
    ],
    flee_chance: 0.55,
  },

  iron_golem_shard: {
    monsterId: 'iron_golem_shard', name: 'Iron Golem Fragment', emoji: '🤖',
    zone: 'city_ruins', type: 'construct',
    level: 16, xpReward: 300, goldReward: [80, 130],
    hp: 1750, atk: 120, def: 45, spd: 2,
    desc: 'ชิ้นส่วนของ Iron Golem เก่าที่ยังเคลื่อนไหวได้ ทุบยาก',
    attackMsg: ['กดทับด้วยกำปั้นเหล็ก', 'ยิงไอน้ำร้อน', 'กระแทกพื้น'],
    moves: [
      { name: 'Iron Fist', emoji: '🤜', dmgMult: 1.0, weight: 45 },
      { name: 'Steam Blast', emoji: '💨', dmgMult: 0.9, weight: 35, effect: { type: 'BURN', duration: 2, dmgPerTurn: 10 } },
      { name: 'Core Overload', emoji: '⚡', dmgMult: 2.0, weight: 20, telegraphed: true },
    ],
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
  poison_frog: {
    monsterId: 'poison_frog', name: 'Poison Frog', emoji: '🐸',
    zone: 'cursed_marshlands', type: 'beast',
    level: 18, xpReward: 200, goldReward: [60, 110],
    hp: 440, atk: 60, def: 14, spd: 14,
    statusAttack: { type: 'POISON', chance: 0.45, duration: 3, dmgPerTurn: 15 },
    desc: 'กบพิษขนาดใหญ่ผิวฉูดฉาด แค่แตะก็อันตราย',
    attackMsg: ['กระโดดพิษ', 'พ่นพิษ', 'ฉีดกรด'],
    drops: [
      { itemId: 'slime_gel', chance: 0.6 },
      { itemId: 'antidote', chance: 0.4 },
      { itemId: 'poison_vial', chance: 0.2 },
    ],
    flee_chance: 0.65,
  },

  mud_golem: {
    monsterId: 'mud_golem', name: 'Mud Golem', emoji: '💩',
    zone: 'cursed_marshlands', type: 'construct',
    level: 19, xpReward: 220, goldReward: [65, 120],
    hp: 600, atk: 62, def: 30, spd: 4,
    desc: 'โกเลมโคลนที่เกิดขึ้นเองในหนองน้ำ ยิ่งตียิ่งกระจาย',
    attackMsg: ['ขว้างโคลน', 'กดทับ', 'หลอมรวมใหม่'],
    drops: [
      { itemId: 'slime_gel', chance: 0.8 },
      { itemId: 'bog_scale', chance: 0.3 },
      { itemId: 'antidote', chance: 0.2 },
    ],
    flee_chance: 0.8,
  },

  bog_lurker: {
    monsterId: 'bog_lurker', name: 'Bog Lurker', emoji: '🐊',
    zone: 'cursed_marshlands', type: 'beast',
    level: 18, xpReward: 240, goldReward: [60, 100],
    hp: 1085, atk: 130, def: 25, spd: 7,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 12 },
    desc: 'สัตว์เลื้อยคลานขนาดใหญ่ที่ถูกพิษหนองสาบเข้าสิง ซ่อนอยู่ในโคลน',
    attackMsg: ['กัดดึงลงน้ำ', 'ตีด้วยหาง', 'พ่นพิษหนอง'],
    moves: [
      { name: 'กัดดึงลงน้ำ', emoji: '🐊', dmgMult: 1.0, weight: 45 },
      { name: 'Tail Sweep', emoji: '💨', dmgMult: 0.8, weight: 30 },
      { name: 'Bog Venom Spit', emoji: '🤢', dmgMult: 0.6, weight: 25, telegraphed: true, effect: { type: 'POISON', duration: 4, dmgPerTurn: 15 } },
    ],
    drops: [
      { itemId: 'bog_scale', chance: 0.6 },
      { itemId: 'antidote', chance: 0.4 },
      { itemId: 'void_crystal', chance: 0.18 },
      { itemId: 'ancient_scroll', chance: 0.12 },
    ],
    flee_chance: 0.6,
  },

  will_o_wisp: {
    monsterId: 'will_o_wisp', name: 'Will-o-Wisp', emoji: '🔥',
    zone: 'cursed_marshlands', type: 'void',
    level: 21, xpReward: 260, goldReward: [70, 130],
    hp: 380, atk: 70, def: 10, spd: 18,
    statusAttack: { type: 'BURN', chance: 0.35, duration: 2, dmgPerTurn: 15 },
    desc: 'แสงหลงทางในหนอง ล่อเหยื่อแล้วเผาไหม้',
    attackMsg: ['ลวงหลง', 'เผาไหม้', 'แตกออกเป็นประกาย'],
    drops: [
      { itemId: 'void_crystal', chance: 0.2 },
      { itemId: 'crystal_shard', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.1 },
    ],
    flee_chance: 0.55,
  },

  swamp_wraith: {
    monsterId: 'swamp_wraith', name: 'Swamp Wraith', emoji: '👻',
    zone: 'cursed_marshlands', type: 'undead',
    level: 20, xpReward: 280, goldReward: [70, 120],
    hp: 840, atk: 144, def: 15, spd: 16,
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

  thornback_turtle: {
    monsterId: 'thornback_turtle', name: 'Thornback Turtle', emoji: '🐢',
    zone: 'cursed_marshlands', type: 'beast',
    level: 22, xpReward: 310, goldReward: [80, 150],
    hp: 800, atk: 65, def: 40, spd: 3,
    desc: 'เต่าหนองน้ำกระดองมีหนาม ป้องกันตัวเองเก่งมาก',
    attackMsg: ['กัดด้วยปาก', 'หนามกระดองทิ่ม', 'หดตัว'],
    drops: [
      { itemId: 'bog_scale', chance: 0.6 },
      { itemId: 'slime_gel', chance: 0.4 },
      { itemId: 'crystal_shard', chance: 0.15 },
    ],
    flee_chance: 0.85,
  },

  giant_leech: {
    monsterId: 'giant_leech', name: 'Giant Leech', emoji: '🪱',
    zone: 'cursed_marshlands', type: 'beast',
    level: 22, xpReward: 320, goldReward: [80, 140],
    hp: 1330, atk: 136, def: 20, spd: 5,
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

  bog_witch: {
    monsterId: 'bog_witch', name: 'Bog Witch', emoji: '🧙‍♀️',
    zone: 'cursed_marshlands', type: 'human',
    level: 23, xpReward: 340, goldReward: [90, 170],
    hp: 480, atk: 80, def: 16, spd: 10,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 18 },
    desc: 'แม่มดที่อาศัยในหนองน้ำ รับรู้ทุกอย่างในหนอง',
    attackMsg: ['สาปพิษ', 'โยนยาพิษ', 'เรียกสัตว์หนอง'],
    drops: [
      { itemId: 'poison_vial', chance: 0.5 },
      { itemId: 'antidote', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.2 },
      { itemId: 'slime_gel', chance: 0.4 },
    ],
    flee_chance: 0.55,
  },

  nightmare_croc: {
    monsterId: 'nightmare_croc', name: 'Nightmare Croc', emoji: '🐊',
    zone: 'cursed_marshlands', type: 'beast',
    level: 24, xpReward: 380, goldReward: [100, 180],
    hp: 720, atk: 84, def: 32, spd: 8,
    desc: 'จระเข้ฝันร้ายที่กลายพันธุ์จากพลัง Void ตาเป็นสีม่วง',
    attackMsg: ['กัดสองคาย', 'ปีนขึ้นทับ', 'หางฟาด'],
    drops: [
      { itemId: 'bog_scale', chance: 0.7 },
      { itemId: 'void_crystal', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.15 },
    ],
    flee_chance: 0.6,
  },

  marsh_basilisk: {
    monsterId: 'marsh_basilisk', name: 'Marsh Basilisk', emoji: '🦎',
    zone: 'cursed_marshlands', type: 'beast',
    level: 25, xpReward: 450, goldReward: [100, 180],
    hp: 1470, atk: 176, def: 35, spd: 10,
    statusAttack: { type: 'STUN', chance: 0.3, duration: 1, dmgPerTurn: 0 },
    desc: 'บาซิลิสก์หนองน้ำ สายตาทำให้เป็นหินชั่วคราว',
    attackMsg: ['จ้องตาทำให้งง', 'กัดด้วยพิษหิน', 'ตีด้วยหางหิน'],
    moves: [
      { name: 'กัดพิษหิน', emoji: '🦎', dmgMult: 1.0, weight: 40 },
      { name: 'Tail Strike', emoji: '💥', dmgMult: 1.2, weight: 35 },
      { name: 'Petrifying Gaze', emoji: '👁️', dmgMult: 0.4, weight: 25, telegraphed: true, effect: { type: 'STUN', duration: 2 } },
    ],
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
  void_shade: {
    monsterId: 'void_shade', name: 'Void Shade', emoji: '🌑',
    zone: 'void_frontier', type: 'void',
    level: 28, xpReward: 500, goldReward: [120, 210],
    hp: 480, atk: 95, def: 18, spd: 20,
    desc: 'เงาจาก Void ที่อยู่กึ่งกลางระหว่างมิติ โจมตีแล้วหายไป',
    attackMsg: ['โจมตีจากเงา', 'ดูดพลัง', 'หายตัว'],
    drops: [
      { itemId: 'void_crystal', chance: 0.4 },
      { itemId: 'void_essence', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.12 },
    ],
    flee_chance: 0.45,
  },

  void_stalker: {
    monsterId: 'void_stalker', name: 'Void Stalker', emoji: '🕳️',
    zone: 'void_frontier', type: 'void',
    level: 28, xpReward: 500, goldReward: [120, 200],
    hp: 1225, atk: 200, def: 22, spd: 25,
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

  void_spawn_greater: {
    monsterId: 'void_spawn_greater', name: 'Greater Void Spawn', emoji: '🕳️',
    zone: 'void_frontier', type: 'void',
    level: 29, xpReward: 520, goldReward: [125, 215],
    hp: 520, atk: 100, def: 20, spd: 15,
    desc: 'Void Spawn ที่โตเต็มที่ พลังงานความมืดเข้มข้นกว่า',
    attackMsg: ['ดูดพลังงาน', 'ระเบิด Void', 'แตกตัวคูณสอง'],
    drops: [
      { itemId: 'void_crystal', chance: 0.45 },
      { itemId: 'void_essence', chance: 0.22 },
      { itemId: 'crystal_shard', chance: 0.3 },
    ],
    flee_chance: 0.45,
  },

  dimensional_horror: {
    monsterId: 'dimensional_horror', name: 'Dimensional Horror', emoji: '🌀',
    zone: 'void_frontier', type: 'void',
    level: 30, xpReward: 550, goldReward: [130, 230],
    hp: 620, atk: 108, def: 24, spd: 12,
    desc: 'สิ่งมีชีวิตที่อยู่ในมิติที่เราไม่รู้จัก รูปร่างเปลี่ยนตลอด',
    attackMsg: ['โจมตีจากมุมที่เป็นไปไม่ได้', 'บิดความจริง', 'กลืนกินสสาร'],
    drops: [
      { itemId: 'void_crystal', chance: 0.5 },
      { itemId: 'chaos_shard', chance: 0.15 },
      { itemId: 'void_essence', chance: 0.25 },
    ],
    flee_chance: 0.4,
  },

  phase_wraith: {
    monsterId: 'phase_wraith', name: 'Phase Wraith', emoji: '👻',
    zone: 'void_frontier', type: 'void',
    level: 33, xpReward: 620, goldReward: [150, 260],
    hp: 550, atk: 118, def: 22, spd: 18,
    desc: 'ผีที่เดินทางระหว่างมิติ โจมตีแล้วหายไปทันที',
    attackMsg: ['กรีดมิติ', 'ดูดชีพ', 'หายตัว Phase'],
    drops: [
      { itemId: 'void_crystal', chance: 0.5 },
      { itemId: 'wraith_essence', chance: 0.3 },
      { itemId: 'ancient_scroll', chance: 0.2 },
    ],
    flee_chance: 0.4,
  },

  soul_harvester: {
    monsterId: 'soul_harvester', name: 'Soul Harvester', emoji: '💀',
    zone: 'void_frontier', type: 'void',
    level: 32, xpReward: 620, goldReward: [150, 250],
    hp: 1680, atk: 230, def: 28, spd: 14,
    desc: 'ปีศาจเก็บเกี่ยววิญญาณ ยิ่งฆ่ายิ่งแกร่ง',
    attackMsg: ['เก็บเกี่ยววิญญาณ', 'เคียวเงาหวด', 'ดูด XP ออกจากร่าง'],
    moves: [
      { name: 'เคียวเงา', emoji: '💀', dmgMult: 1.0, weight: 45 },
      { name: 'Soul Rend', emoji: '👻', dmgMult: 1.1, weight: 35, effect: { type: 'CURSE', duration: 2, dmgPerTurn: 12 } },
      { name: 'Harvest', emoji: '⚰️', dmgMult: 1.8, weight: 20, telegraphed: true },
    ],
    drops: [
      { itemId: 'void_crystal', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.35 },
      { itemId: 'soul_gem', chance: 0.2 },
      { itemId: 'ancient_scroll', chance: 0.25 },
    ],
    flee_chance: 0.45,
  },

  reality_eater: {
    monsterId: 'reality_eater', name: 'Reality Eater', emoji: '🌀',
    zone: 'void_frontier', type: 'void',
    level: 35, xpReward: 680, goldReward: [170, 290],
    hp: 680, atk: 130, def: 28, spd: 14,
    desc: 'สิ่งที่กินความจริงเป็นอาหาร ทุกอย่างรอบมันบิดเบี้ยว',
    attackMsg: ['กัดกินความจริง', 'บิดสสาร', 'สร้างสุญญากาศ'],
    drops: [
      { itemId: 'void_crystal', chance: 0.55 },
      { itemId: 'chaos_shard', chance: 0.2 },
      { itemId: 'void_essence', chance: 0.3 },
    ],
    flee_chance: 0.4,
  },

  void_titan: {
    monsterId: 'void_titan', name: 'Void Titan', emoji: '🌑',
    zone: 'void_frontier', type: 'void',
    level: 36, xpReward: 900, goldReward: [200, 350],
    hp: 3150, atk: 280, def: 50, spd: 6,
    regen: 15,
    desc: 'ไททันแห่ง Void มหาศาล ฟื้นฟูตัวเองจากพลังงานมืด',
    attackMsg: ['กำปั้นแห่ง Void', 'คลื่นพลังงานมืด', 'บดขยี้ด้วยน้ำหนัก'],
    moves: [
      { name: 'Void Fist', emoji: '🌑', dmgMult: 1.0, weight: 40 },
      { name: 'Dark Wave', emoji: '🌊', dmgMult: 1.2, weight: 35 },
      { name: 'Void Nova', emoji: '💥', dmgMult: 2.5, weight: 25, telegraphed: true },
    ],
    drops: [
      { itemId: 'void_crystal', chance: 0.8 },
      { itemId: 'void_essence', chance: 0.5 },
      { itemId: 'soul_gem', chance: 0.3 },
      { itemId: 'titan_core', chance: 0.12 },
    ],
    flee_chance: 0.8,
    special: 'mini_boss',
  },

  null_guardian: {
    monsterId: 'null_guardian', name: 'Null Guardian', emoji: '⬛',
    zone: 'void_frontier', type: 'void',
    level: 37, xpReward: 750, goldReward: [185, 320],
    hp: 820, atk: 138, def: 35, spd: 10,
    desc: 'ผู้พิทักษ์แห่งความว่างเปล่า ร่างกายดูดซับทุกสิ่ง',
    attackMsg: ['ดูดพลังงาน', 'สร้างสุญญากาศ', 'กดทับ Null'],
    drops: [
      { itemId: 'void_crystal', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.3 },
      { itemId: 'chaos_shard', chance: 0.15 },
    ],
    flee_chance: 0.5,
  },

  chaos_elemental: {
    monsterId: 'chaos_elemental', name: 'Chaos Elemental', emoji: '🌀',
    zone: 'void_frontier', type: 'void',
    level: 38, xpReward: 950, goldReward: [220, 380],
    hp: 1925, atk: 310, def: 30, spd: 18,
    desc: 'ธาตุแห่งความโกลาหล ทุกตีมีองค์ประกอบแตกต่าง คาดเดาไม่ได้',
    attackMsg: ['ฟ้าผ่า Chaos', 'ไฟน้ำแข็งพร้อมกัน', 'ระเบิดพลังงานสุ่ม'],
    moves: [
      { name: 'Chaos Bolt', emoji: '⚡', dmgMult: 1.0, weight: 35 },
      { name: 'Firestorm', emoji: '🔥', dmgMult: 1.1, weight: 30, effect: { type: 'BURN', duration: 2, dmgPerTurn: 18 } },
      { name: 'Chaos Burst', emoji: '🌀', dmgMult: 2.2, weight: 20, telegraphed: true },
      { name: 'Void Chill', emoji: '❄️', dmgMult: 0.7, weight: 15, effect: { type: 'SLOW', duration: 2, atkMult: 0.75 } },
    ],
    drops: [
      { itemId: 'void_crystal', chance: 0.7 },
      { itemId: 'void_essence', chance: 0.4 },
      { itemId: 'chaos_shard', chance: 0.25 },
      { itemId: 'ancient_scroll', chance: 0.3 },
    ],
    flee_chance: 0.5,
  },

  // ===== ZONE: shadowfell_depths (Lv 38-55) =====
  shadow_wraith: {
    monsterId: 'shadow_wraith', name: 'Shadow Wraith', emoji: '👻',
    zone: 'shadowfell_depths', type: 'undead',
    level: 38, xpReward: 900, goldReward: [200, 340],
    hp: 1680, atk: 280, def: 32, spd: 20,
    statusAttack: { type: 'POISON', chance: 0.3, duration: 2, dmgPerTurn: 20 },
    desc: 'ผีร้ายจากมิติเงา ร่างกายทำจากความมืดล้วนๆ',
    attackMsg: ['กรงเล็บเงา', 'ดูดชีพ', 'ขยายความมืด'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.8 },
      { itemId: 'wraith_essence', chance: 0.5 },
      { itemId: 'soul_gem', chance: 0.15 },
    ],
    flee_chance: 0.5,
  },

  death_reaper: {
    monsterId: 'death_reaper', name: 'Death Reaper', emoji: '💀',
    zone: 'shadowfell_depths', type: 'undead',
    level: 39, xpReward: 950, goldReward: [210, 360],
    hp: 660, atk: 145, def: 30, spd: 18,
    desc: 'ผู้เก็บเกี่ยวความตาย เคียวของมันตัดทะลุเกราะทุกชนิด',
    attackMsg: ['ฟันเคียวมรณะ', 'ส่งคลื่นความตาย', 'สาปแช่ง'],
    drops: [
      { itemId: 'void_essence', chance: 0.4 },
      { itemId: 'soul_gem', chance: 0.2 },
      { itemId: 'wraith_essence', chance: 0.35 },
    ],
    flee_chance: 0.45,
  },

  nightmare_hound: {
    monsterId: 'nightmare_hound', name: 'Nightmare Hound', emoji: '🐕‍🦺',
    zone: 'shadowfell_depths', type: 'beast',
    level: 40, xpReward: 1000, goldReward: [210, 360],
    hp: 1820, atk: 320, def: 30, spd: 25,
    statusAttack: { type: 'SLEEP', chance: 0.25, duration: 1, dmgPerTurn: 0 },
    desc: 'สุนัขนรกจากฝันร้าย ส่งเสียงหอนที่ทำให้ผู้ได้ยินหยุดนิ่ง',
    attackMsg: ['กัดคอ', 'เล็บฉีก', 'หอน Nightmare'],
    drops: [
      { itemId: 'monster_fang', chance: 0.9 },
      { itemId: 'shadow_cloth', chance: 0.3 },
      { itemId: 'void_essence', chance: 0.2 },
    ],
    flee_chance: 0.55,
  },

  dark_elemental: {
    monsterId: 'dark_elemental', name: 'Dark Elemental', emoji: '🌑',
    zone: 'shadowfell_depths', type: 'void',
    level: 42, xpReward: 1050, goldReward: [250, 420],
    hp: 750, atk: 165, def: 38, spd: 16,
    statusAttack: { type: 'CURSE', chance: 0.3, duration: 2, dmgPerTurn: 20 },
    desc: 'ธาตุแห่งความมืด บอร์นจากพลังงาน Shadowfell บริสุทธิ์',
    attackMsg: ['คลื่นความมืด', 'ดูดแสง', 'ระเบิดเงา'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.5 },
      { itemId: 'void_crystal', chance: 0.4 },
      { itemId: 'void_essence', chance: 0.25 },
    ],
    flee_chance: 0.45,
  },

  dark_knight: {
    monsterId: 'dark_knight', name: 'Dark Knight', emoji: '🖤',
    zone: 'shadowfell_depths', type: 'undead',
    level: 42, xpReward: 1100, goldReward: [250, 420],
    hp: 2275, atk: 340, def: 55, spd: 12,
    desc: 'อัศวินผู้ถูกสาปให้รับใช้ความมืดชั่วนิรันดร์ ไม่รู้จักความเจ็บปวด',
    attackMsg: ['ฟัน Dark Slash', 'ชาร์จ Void Strike', 'โล่ Shadow Bash'],
    drops: [
      { itemId: 'dark_steel', chance: 0.7 },
      { itemId: 'void_crystal', chance: 0.4 },
      { itemId: 'shadow_cloth', chance: 0.5 },
    ],
    flee_chance: 0.35,
  },

  void_knight: {
    monsterId: 'void_knight', name: 'Void Knight', emoji: '⚔️',
    zone: 'shadowfell_depths', type: 'void',
    level: 44, xpReward: 1150, goldReward: [270, 450],
    hp: 900, atk: 175, def: 55, spd: 14,
    desc: 'อัศวิน Void ที่ฝึกฝนมาเพื่อสังหารในความมืด',
    attackMsg: ['ฟันดาบ Void', 'ชาร์จ Null', 'โล่ Shadow'],
    drops: [
      { itemId: 'dark_steel', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.4 },
      { itemId: 'soul_gem', chance: 0.15 },
    ],
    flee_chance: 0.4,
  },

  shadow_assassin: {
    monsterId: 'shadow_assassin', name: 'Shadow Assassin', emoji: '🥷',
    zone: 'shadowfell_depths', type: 'human',
    level: 46, xpReward: 1200, goldReward: [290, 480],
    hp: 700, atk: 190, def: 28, spd: 26,
    desc: 'นักฆ่าเงาที่ฝึกในมิติ Shadowfell เร็วและร้ายแรงที่สุด',
    attackMsg: ['แทงจากมืด', 'ฟันสองมือ', 'หายตัวแล้วโจมตี'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.3 },
      { itemId: 'shadow_dagger', chance: 0.08 },
    ],
    flee_chance: 0.4,
  },

  soul_devourer: {
    monsterId: 'soul_devourer', name: 'Soul Devourer', emoji: '👾',
    zone: 'shadowfell_depths', type: 'void',
    level: 48, xpReward: 1350, goldReward: [320, 540],
    hp: 850, atk: 210, def: 35, spd: 16,
    desc: 'สัตว์ประหลาดที่กินวิญญาณเป็นอาหาร ยิ่งกินยิ่งแข็งแกร่ง',
    attackMsg: ['กินวิญญาณ', 'ดูดพลัง', 'ระเบิดวิญญาณ'],
    drops: [
      { itemId: 'soul_gem', chance: 0.3 },
      { itemId: 'void_essence', chance: 0.5 },
      { itemId: 'void_crystal', chance: 0.4 },
    ],
    flee_chance: 0.4,
  },

  corruption_shade: {
    monsterId: 'corruption_shade', name: 'Corruption Shade', emoji: '🌑',
    zone: 'shadowfell_depths', type: 'void',
    level: 50, xpReward: 1500, goldReward: [350, 580],
    hp: 1000, atk: 220, def: 42, spd: 18,
    desc: 'เงาแห่งการทุจริต กัดกร่อนทุกสิ่งที่สัมผัส',
    attackMsg: ['กัดกร่อนเกราะ', 'ระบาดความมืด', 'Corrupt Aura'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.7 },
      { itemId: 'void_essence', chance: 0.5 },
      { itemId: 'chaos_shard', chance: 0.2 },
    ],
    flee_chance: 0.45,
  },

  infernal_demon: {
    monsterId: 'infernal_demon', name: 'Infernal Demon', emoji: '😈',
    zone: 'shadowfell_depths', type: 'void',
    level: 52, xpReward: 1700, goldReward: [380, 630],
    hp: 1100, atk: 240, def: 48, spd: 14,
    statusAttack: { type: 'BURN', chance: 0.4, duration: 3, dmgPerTurn: 30 },
    desc: 'ปีศาจนรกที่ถูกปลุกโดยพิธีกรรมต้องห้าม เต็มไปด้วยความโกรธ',
    attackMsg: ['ตบด้วยปีก', 'กรีดเขา', 'ระเบิดไฟนรก'],
    drops: [
      { itemId: 'void_essence', chance: 0.6 },
      { itemId: 'chaos_shard', chance: 0.3 },
      { itemId: 'soul_gem', chance: 0.25 },
      { itemId: 'dark_steel', chance: 0.4 },
    ],
    flee_chance: 0.35,
  },

  // ===== ZONE: vorath_citadel (Lv 50+) =====
  iron_warden: {
    monsterId: 'iron_warden', name: 'Iron Warden', emoji: '🛡️',
    zone: 'vorath_citadel', type: 'construct',
    level: 50, xpReward: 1600, goldReward: [350, 600],
    hp: 1200, atk: 195, def: 80, spd: 6,
    desc: 'ผู้พิทักษ์เหล็กแห่ง Citadel ถูกตั้งโปรแกรมให้ฆ่าผู้บุกรุก',
    attackMsg: ['กำปั้นเหล็ก', 'โล่กระแทก', 'ยิงพลังงาน'],
    drops: [
      { itemId: 'steel_ingot', chance: 0.7 },
      { itemId: 'dark_steel', chance: 0.4 },
      { itemId: 'void_crystal', chance: 0.3 },
    ],
    flee_chance: 0.7,
  },

  shadow_construct: {
    monsterId: 'shadow_construct', name: 'Shadow Construct', emoji: '🌑',
    zone: 'vorath_citadel', type: 'construct',
    level: 51, xpReward: 1650, goldReward: [360, 610],
    hp: 1100, atk: 200, def: 72, spd: 8,
    desc: 'โครงสร้างที่ทำจากเงาล้วน แข็งแกร่งเกินกว่าที่ตาเห็น',
    attackMsg: ['กระแทกเงา', 'ดูดพลัง', 'ปล่อยคลื่นความมืด'],
    drops: [
      { itemId: 'shadow_cloth', chance: 0.6 },
      { itemId: 'void_crystal', chance: 0.4 },
      { itemId: 'dark_steel', chance: 0.35 },
    ],
    flee_chance: 0.65,
  },

  citadel_sentinel: {
    monsterId: 'citadel_sentinel', name: 'Citadel Sentinel', emoji: '🗿',
    zone: 'vorath_citadel', type: 'construct',
    level: 52, xpReward: 1400, goldReward: [350, 600],
    hp: 2500, atk: 280, def: 80, spd: 8,
    regen: 15,
    desc: 'ผู้พิทักษ์หินยักษ์แห่ง Vorath Citadel ฟื้นร่างไม่หยุด',
    attackMsg: ['กระแทกกำปั้นหิน', 'กวาดแขนพลังสูง', 'ปล่อยพลังงาน Void'],
    drops: [
      { itemId: 'void_crystal', chance: 0.9 },
      { itemId: 'titan_core', chance: 0.3 },
      { itemId: 'dark_steel', chance: 0.6 },
    ],
    flee_chance: 0.6,
  },

  void_colossus: {
    monsterId: 'void_colossus', name: 'Void Colossus', emoji: '🌑',
    zone: 'vorath_citadel', type: 'void',
    level: 53, xpReward: 1750, goldReward: [370, 630],
    hp: 1400, atk: 210, def: 85, spd: 5,
    desc: 'ยักษ์แห่ง Void ขนาดมหึมา เดินก็ทำให้แผ่นดินสั่น',
    attackMsg: ['กำปั้น Void', 'กระแทกพื้น', 'คลื่นพลังงานมืด'],
    drops: [
      { itemId: 'void_essence', chance: 0.6 },
      { itemId: 'void_crystal', chance: 0.5 },
      { itemId: 'titan_core', chance: 0.2 },
    ],
    flee_chance: 0.75,
  },

  void_reaper: {
    monsterId: 'void_reaper', name: 'Void Reaper', emoji: '💀',
    zone: 'vorath_citadel', type: 'void',
    level: 54, xpReward: 1800, goldReward: [380, 650],
    hp: 1050, atk: 220, def: 50, spd: 18,
    desc: 'ผู้เก็บเกี่ยวแห่ง Void เคียวที่ตัดทะลุมิติ',
    attackMsg: ['เคียว Void', 'ดึงวิญญาณ', 'Null Strike'],
    drops: [
      { itemId: 'void_essence', chance: 0.7 },
      { itemId: 'soul_gem', chance: 0.35 },
      { itemId: 'chaos_shard', chance: 0.25 },
    ],
    flee_chance: 0.4,
  },

  void_priest: {
    monsterId: 'void_priest', name: 'Void Priest', emoji: '🧙‍♂️',
    zone: 'vorath_citadel', type: 'void',
    level: 55, xpReward: 1700, goldReward: [400, 700],
    hp: 2000, atk: 300, def: 45, spd: 22,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 40 },
    desc: 'นักบวชแห่ง Void ผู้ศรัทธาในพลังงานมืดสูงสุด เวทมนตร์รุนแรงมาก',
    attackMsg: ['ขับ Void Bolt', 'ระเบิด Dark Nova', 'สาป Corruption'],
    drops: [
      { itemId: 'void_essence', chance: 0.8 },
      { itemId: 'chaos_shard', chance: 0.5 },
      { itemId: 'ancient_scroll', chance: 0.4 },
      { itemId: 'soul_gem', chance: 0.25 },
    ],
    flee_chance: 0.4,
  },

  chaos_sorcerer: {
    monsterId: 'chaos_sorcerer', name: 'Chaos Sorcerer', emoji: '🧙',
    zone: 'vorath_citadel', type: 'void',
    level: 56, xpReward: 1900, goldReward: [410, 720],
    hp: 950, atk: 235, def: 48, spd: 20,
    statusAttack: { type: 'BURN', chance: 0.3, duration: 2, dmgPerTurn: 35 },
    desc: 'นักเวทย์ Chaos ที่เชี่ยวชาญมนตร์ที่คาดเดาไม่ได้',
    attackMsg: ['ระเบิด Chaos', 'Chaos Bolt', 'บิดความจริง'],
    drops: [
      { itemId: 'chaos_shard', chance: 0.6 },
      { itemId: 'void_essence', chance: 0.5 },
      { itemId: 'ancient_scroll', chance: 0.4 },
    ],
    flee_chance: 0.4,
  },

  ancient_lich: {
    monsterId: 'ancient_lich', name: 'Ancient Lich', emoji: '💀',
    zone: 'vorath_citadel', type: 'undead',
    level: 57, xpReward: 2000, goldReward: [420, 740],
    hp: 1150, atk: 240, def: 58, spd: 14,
    regen: 20,
    desc: 'ลิชโบราณที่มีชีวิตมานับพันปี ความรู้ด้านเวทมนตร์มืดสูงสุด',
    attackMsg: ['สาปมรณะ', 'ดูดวิญญาณ', 'ปลุกผีตาย'],
    drops: [
      { itemId: 'soul_gem', chance: 0.4 },
      { itemId: 'void_essence', chance: 0.6 },
      { itemId: 'ancient_scroll', chance: 0.5 },
      { itemId: 'chaos_shard', chance: 0.3 },
    ],
    flee_chance: 0.35,
  },

  abyssal_dragon: {
    monsterId: 'abyssal_dragon', name: 'Abyssal Dragon', emoji: '🐉',
    zone: 'vorath_citadel', type: 'void',
    level: 58, xpReward: 2100, goldReward: [500, 900],
    hp: 3000, atk: 420, def: 70, spd: 18,
    statusAttack: { type: 'BURN', chance: 0.45, duration: 3, dmgPerTurn: 35 },
    desc: 'มังกรเหวลึกแห่ง Void ผู้ถูกปลุกโดย Vorath เป็นผู้พิทักษ์ขั้นสุดท้าย',
    attackMsg: ['หายใจไฟ Void', 'เขียวหางฟาด', 'บินโฉบโจมตี'],
    drops: [
      { itemId: 'dragon_scale', chance: 0.6 },
      { itemId: 'chaos_shard', chance: 0.6 },
      { itemId: 'void_crystal', chance: 0.9 },
      { itemId: 'soul_gem', chance: 0.35 },
    ],
    flee_chance: 0.3,
    special: 'mini_boss',
  },

  citadel_horror: {
    monsterId: 'citadel_horror', name: 'Citadel Horror', emoji: '👾',
    zone: 'vorath_citadel', type: 'void',
    level: 60, xpReward: 2300, goldReward: [460, 800],
    hp: 1800, atk: 260, def: 88, spd: 10,
    desc: 'สิ่งมีชีวิตที่น่าหวาดกลัวที่สุดใน Citadel รูปร่างเปลี่ยนไปเรื่อย',
    attackMsg: ['โจมตีสุ่มมิติ', 'กลืนกิน', 'ระเบิดร่าง'],
    drops: [
      { itemId: 'void_essence', chance: 0.7 },
      { itemId: 'chaos_shard', chance: 0.5 },
      { itemId: 'soul_gem', chance: 0.35 },
      { itemId: 'titan_core', chance: 0.15 },
    ],
    flee_chance: 0.35,
  },

  // ===== ZONE BOSSES =====
  outskirts_boss: {
    monsterId: 'outskirts_boss', name: 'Goblin King Grak', emoji: '👑',
    zone: 'town_outskirts', type: 'human',
    level: 6, xpReward: 800, goldReward: [150, 300],
    hp: 1800, atk: 58, def: 14, spd: 7,
    desc: '👑 ราชาโกบลิน Grak — ครองพื้นที่ชานเมืองด้วยกำลังและความโหดร้าย แกนนำกองกำลังโกบลินทั้งหมด',
    attackMsg: ['ฟันกระบี่ทองคำ', 'ตะโกนให้ลูกน้องช่วย', 'กระแทกโล่สูง', 'พุ่งเต็มแรง'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3, response: { type: 'counterAttack', dmgMult: 1.5, log: '👑 Grak โต้กลับ! กระบี่ทองแฝดฟัน!' } },
      { trigger: 'hpBelow', threshold: 0.3, response: { type: 'enrage', atkMult: 1.3, defMult: 0.8, log: '👑 Grak ENRAGE! "ฉันจะล้มแค่ตายเท่านั้น!!"' } },
    ],
    drops: [
      { itemId: 'goblin_ear',           chance: 1.0 },
      { itemId: 'iron_ore',             chance: 0.9 },
      { itemId: 'health_potion_medium', chance: 0.7 },
      { itemId: 'ancient_scroll',       chance: 0.2 },
      { itemId: 'goblin_king_seal',     chance: 1.0 },
    ],
    flee_chance: 0.03, special: 'zone_boss', cooldownHours: 24,
  },

  forest_boss: {
    monsterId: 'forest_boss', name: 'Elder Treant Monarch', emoji: '🌳',
    zone: 'forest_path', type: 'beast',
    level: 10, xpReward: 1600, goldReward: [300, 600],
    hp: 3600, atk: 95, def: 30, spd: 2,
    desc: '🌳 Treant ผู้เฒ่าแห่งป่า — อายุกว่า 2000 ปี ตื่นขึ้นเพราะป่าของมันถูกทำลาย พลังธรรมชาติมหาศาล',
    attackMsg: ['กิ่งยักษ์กวาด', 'รากดึงลงดิน', 'ปล่อยสปอร์พิษ', 'เรียกพาย'],
    drops: [
      { itemId: 'rotten_wood',      chance: 1.0 },
      { itemId: 'wild_flower',      chance: 0.9 },
      { itemId: 'honey_jar',        chance: 0.6 },
      { itemId: 'crystal_shard',    chance: 0.4 },
      { itemId: 'ancient_scroll',   chance: 0.25 },
      { itemId: 'treant_heartwood', chance: 1.0 },
    ],
    flee_chance: 0.02, special: 'zone_boss', cooldownHours: 24,
  },

  cave_boss: {
    monsterId: 'cave_boss', name: 'Crystal Troll Lord', emoji: '💎',
    zone: 'dark_cave', type: 'beast',
    level: 14, xpReward: 2200, goldReward: [400, 800],
    hp: 4800, atk: 130, def: 40, spd: 4,
    regen: 20,
    desc: '💎 ท่านเจ้าแห่งถ้ำ — ทรอลล์ผู้ฟื้นฟูตัวเองด้วยพลังคริสตัล ผิวหนังกลายเป็นผลึกแข็งระดับเพชร',
    attackMsg: ['กำปั้นคริสตัล', 'คลื่นพลังฟื้นฟู', 'เซาะผลึกพิษ', 'กระแทกพื้น'],
    drops: [
      { itemId: 'crystal_shard',      chance: 1.0 },
      { itemId: 'iron_ore',           chance: 0.9 },
      { itemId: 'void_crystal',       chance: 0.35 },
      { itemId: 'ancient_scroll',     chance: 0.3 },
      { itemId: 'troll_crystal_heart', chance: 1.0 },
    ],
    flee_chance: 0.02, special: 'zone_boss', cooldownHours: 24,
  },

  ruins_boss: {
    monsterId: 'ruins_boss', name: 'Iron Golem Prime', emoji: '🤖',
    zone: 'city_ruins', type: 'construct',
    level: 20, xpReward: 3400, goldReward: [700, 1200],
    hp: 7200, atk: 190, def: 65, spd: 5,
    desc: '🤖 Golem ต้นแบบของ Ashenveil — สร้างขึ้นเพื่อปกป้องเมือง แต่ถูก Void ปรับแต่งให้เป็นผู้ทำลาย',
    attackMsg: ['ชกพลังไอน้ำ', 'ยิงลูกเหล็ก', 'กระแทกพื้น Shockwave', 'เปลี่ยนโหมดโจมตี'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3, response: { type: 'counterAttack', dmgMult: 1.5, log: '🤖 Iron Golem ตอบโต้! Hydraulic Overdrive!!' } },
      { trigger: 'hpBelow', threshold: 0.3, response: { type: 'shieldPhase', defMult: 0.3, duration: 2, log: '🛡️ Iron Golem เปิดเกราะฉุกเฉิน! DEF ลด 70% เป็นเวลา 2 turns!' } },
      { trigger: 'statusApplied', response: { type: 'enrage', atkMult: 1.3, defMult: 0.8, log: '🤖 ERROR — COMBAT OVERRIDE! ATK +30%!' } },
    ],
    drops: [
      { itemId: 'steel_ingot',        chance: 1.0 },
      { itemId: 'iron_ore',           chance: 0.9 },
      { itemId: 'chainmail_fragment', chance: 0.5 },
      { itemId: 'void_crystal',       chance: 0.3 },
      { itemId: 'ancient_scroll',     chance: 0.35 },
      { itemId: 'prime_golem_core',   chance: 1.0 },
    ],
    flee_chance: 0.01, special: 'zone_boss', cooldownHours: 24,
  },

  marsh_boss: {
    monsterId: 'marsh_boss', name: 'Hydra of the Deep', emoji: '🐍',
    zone: 'cursed_marshlands', type: 'beast',
    level: 28, xpReward: 5000, goldReward: [1000, 1800],
    hp: 10000, atk: 255, def: 55, spd: 10,
    regen: 30,
    statusAttack: { type: 'POISON', chance: 0.5, duration: 4, dmgPerTurn: 25 },
    desc: '🐍 Hydra แห่งหนองลึก — 7 หัวที่ฟื้นคืนตัวเองได้ พิษรุนแรงพอจะฆ่าคนได้ภายในนาที',
    attackMsg: ['กัดพิษสามทาง', 'หัวหักพื้น', 'ฉีดพิษกรด', 'พันด้วยหาง', 'ฟื้นหัวใหม่'],
    drops: [
      { itemId: 'bog_scale',       chance: 1.0 },
      { itemId: 'poison_vial',     chance: 0.8 },
      { itemId: 'void_crystal',    chance: 0.5 },
      { itemId: 'soul_gem',        chance: 0.25 },
      { itemId: 'ancient_scroll',  chance: 0.4 },
      { itemId: 'hydra_venom_sac', chance: 1.0 },
    ],
    flee_chance: 0.01, special: 'zone_boss', cooldownHours: 24,
  },

  void_boss: {
    monsterId: 'void_boss', name: "Void Herald Azh'kal", emoji: '🌌',
    zone: 'void_frontier', type: 'void',
    level: 38, xpReward: 8000, goldReward: [1600, 2800],
    hp: 14000, atk: 390, def: 70, spd: 22,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 50 },
    desc: "🌌 ผู้ส่งสารจาก The Void — Azh'kal มาก่อนการทำลายล้างครั้งใหญ่เสมอ พลังงาน Void ไหลออกจากร่างกายตลอดเวลา",
    attackMsg: ['Void Beam เต็มพลัง', 'ดึงผู้เล่นเข้า Void', 'ระเบิด Null Field', 'เปิดประตูมิติ'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3, response: { type: 'counterAttack', dmgMult: 2.0, log: "🌌 Azh'kal ดูดพลังโจมตี — Void Absorption! ×2 damage!!" } },
      { trigger: 'hpBelow', threshold: 0.5, response: { type: 'evasionPhase', dodgeRate: 0.4, duration: 1, log: "🌌 Azh'kal เข้าสู่ Void Phase! หลบหลีก +40% ต่อ 1 turn!" } },
      { trigger: 'hpBelow', threshold: 0.3, response: { type: 'enrage', atkMult: 1.4, defMult: 0.9, log: "🌌 VOID SINGULARITY! Azh'kal ระเบิดพลัง ATK +40%!" } },
    ],
    drops: [
      { itemId: 'void_crystal',      chance: 1.0 },
      { itemId: 'void_essence',      chance: 0.8 },
      { itemId: 'soul_gem',          chance: 0.5 },
      { itemId: 'chaos_shard',       chance: 0.4 },
      { itemId: 'ancient_scroll',    chance: 0.5 },
      { itemId: 'void_herald_sigil', chance: 1.0 },
    ],
    flee_chance: 0.01, special: 'zone_boss', cooldownHours: 24,
  },

  shadow_boss: {
    monsterId: 'shadow_boss', name: 'Shadow Archon Vael', emoji: '🌑',
    zone: 'shadowfell_depths', type: 'void',
    level: 48, xpReward: 12000, goldReward: [2400, 4000],
    hp: 20000, atk: 530, def: 90, spd: 28,
    statusAttack: { type: 'POISON', chance: 0.45, duration: 3, dmgPerTurn: 60 },
    desc: '🌑 Archon แห่ง Shadowfell — Vael ผู้ปกครองมิติเงา เคยเป็นมนุษย์ก่อนจะขายวิญญาณเพื่อพลังสูงสุด',
    attackMsg: ['Shadow Strike ทั้งสาม', 'ดูดวิญญาณ', 'ความมืดกลืนกิน', 'Clone จากเงา'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3, response: { type: 'counterAttack', dmgMult: 2.0, log: '🌑 Vael สะท้อนเงา — Shadow Clone Strike! ×2 damage!' } },
      { trigger: 'hpBelow', threshold: 0.5, response: { type: 'evasionPhase', dodgeRate: 0.4, duration: 1, log: '🌑 Vael กลืนเข้าเงา — Dodge +40%!' } },
    ],
    drops: [
      { itemId: 'shadow_cloth',          chance: 1.0 },
      { itemId: 'void_essence',          chance: 0.9 },
      { itemId: 'soul_gem',              chance: 0.6 },
      { itemId: 'chaos_shard',           chance: 0.55 },
      { itemId: 'ancient_scroll',        chance: 0.6 },
      { itemId: 'shadow_archon_essence', chance: 1.0 },
    ],
    flee_chance: 0.01, special: 'zone_boss', cooldownHours: 24,
  },

  vorath_boss: {
    monsterId: 'vorath_boss', name: 'Avatar of Vorath', emoji: '👁️',
    zone: 'vorath_citadel', type: 'void',
    level: 60, xpReward: 20000, goldReward: [4000, 8000],
    hp: 28000, atk: 700, def: 120, spd: 30,
    regen: 50,
    statusAttack: { type: 'POISON', chance: 0.5, duration: 3, dmgPerTurn: 80 },
    desc: '👁️ อวตารของ Vorath — ไม่ใช่ตัว Vorath จริงๆ แต่เป็นเศษพลังงานที่เขาทิ้งไว้ ยังคงทรงพลังมหาศาล ความพ่ายแพ้ที่นี่ไม่ใช่จุดจบ แต่เป็นการทดสอบ',
    attackMsg: ['พลัง The Sundering', 'Void Annihilation', 'ตา Vorath เปิด', 'ดึงกลับก่อนมีชีวิต', 'ปลดพลัง Shard-Anchor'],
    counters: [
      { trigger: 'consecutiveAttack', count: 2, response: { type: 'counterAttack', dmgMult: 2.5, log: '👁️ ตา Vorath มองเห็น — REALITY SHATTER! ×2.5 damage!!' } },
      { trigger: 'hpBelow', threshold: 0.5, response: { type: 'shieldPhase', defMult: 0.3, duration: 2, log: '👁️ Vorath เรียก Void Shield — รับดาเมจ -70% 2 turns! ต้องฝ่าด้วยพลัง!' } },
      { trigger: 'hpBelow', threshold: 0.25, response: { type: 'enrage', atkMult: 1.5, defMult: 0.8, log: '👁️ THE EYE OPENS FULLY!! — VOID ASCENSION! ATK +50%!! (ต้องพิชิตให้ได้!)' } },
      { trigger: 'statusApplied', response: { type: 'evasionPhase', dodgeRate: 0.35, duration: 1, log: '👁️ Vorath บิดมิติหลีกภัย! Dodge +35% ชั่วคราว!' } },
    ],
    drops: [
      { itemId: 'void_crystal',   chance: 1.0 },
      { itemId: 'void_essence',   chance: 1.0 },
      { itemId: 'soul_gem',       chance: 0.8 },
      { itemId: 'chaos_shard',    chance: 0.8 },
      { itemId: 'ancient_scroll', chance: 0.8 },
      { itemId: 'titan_core',     chance: 0.5 },
      { itemId: 'vorath_tear',    chance: 1.0 },
    ],
    flee_chance: 0.0, special: 'zone_boss', cooldownHours: 48,
  },

  // ===== VORATH — True Form (Phase 2) =====
  vorath_true: {
    monsterId: 'vorath_true', name: 'Vorath — The Forgotten God', emoji: '🌑',
    zone: 'vorath_citadel', type: 'void',
    level: 65, xpReward: 35000, goldReward: [10000, 18000],
    hp: 17500, atk: 900, def: 80, spd: 40,
    regen: 0,
    statusAttack: { type: 'VOID_DRAIN', chance: 0.6, duration: 2, dmgPerTurn: 120 },
    desc: '🌑 ตัวตนที่แท้จริงของ Vorath ปรากฏออกมา — ไม่ใช่ความโกรธหรือความชั่วร้าย แต่เป็นความเจ็บปวดของการถูกกักขังมาห้าร้อยปี',
    phaseEntry: {
      log: [
        '🌑 "พอแล้ว..."',
        '🌑 Avatar พังสลาย — แสงสีม่วงระเบิดออกจากกลางกาย',
        '🌑 เสียงหึ่งที่ดังกึกก้องทั่ว Citadel — แล้วทุกอย่างก็เงียบ',
        '🌑 Vorath ตัวจริงปรากฏออกมา...',
        '🌑 "เจ้ามาไกลมาก ฉันจะดูว่าเจ้าสมกับที่จะได้รับคำตอบไหม"',
      ],
    },
    attackMsg: [
      '"ห้าร้อยปีในความมืด" — Void Surge',
      '"ฉันแค่อยากกลับบ้าน" — Despair Wave',
      '"ทำไมพวกเจ้าต้องกลัวสิ่งที่ไม่เข้าใจ?" — Reality Crack',
      'Void Tendril ม้วนรอบร่าง',
      '"ฉันยังคงจำ Void ได้ — บ้านของฉัน"',
    ],
    counters: [
      { trigger: 'consecutiveAttack', count: 2, response: { type: 'counterAttack', dmgMult: 3.0, log: '🌑 "เจ้าโจมตีโดยไม่ฟัง!" — VOID RETALIATION ×3.0!!' } },
      { trigger: 'hpBelow', threshold: 0.5, response: { type: 'healSelf', amount: 500, log: '🌑 Vorath ดึงพลัง Void กลับ — ฟื้นฟู 500 HP!' } },
      { trigger: 'hpBelow', threshold: 0.2, response: { type: 'enrage', atkMult: 2.0, defMult: 0.5, log: '🌑 "ถ้านั่นคือสิ่งที่เจ้าต้องการ..." — FINAL VOID AWAKENING! ATK ×2!!' } },
      { trigger: 'skillUsed', response: { type: 'counterAttack', dmgMult: 1.5, log: '🌑 Vorath อ่านพลังงาน Skill — VOID ABSORPTION! ×1.5 counter!' } },
    ],
    drops: [
      { itemId: 'void_crystal',    chance: 1.0 },
      { itemId: 'void_essence',    chance: 1.0 },
      { itemId: 'chaos_shard',     chance: 1.0 },
      { itemId: 'soul_gem',        chance: 1.0 },
      { itemId: 'titan_core',      chance: 0.8 },
      { itemId: 'vorath_tear',     chance: 1.0 },
      { itemId: 'memory_fragment', chance: 1.0 },
      { itemId: 'ancient_scroll',  chance: 1.0 },
    ],
    flee_chance: 0.0,
    special: 'final_boss',
    isPhase2: true,
    phase2From: 'vorath_boss',
    phase2Threshold: 0.30,
    cooldownHours: 72,
  },

};

// Zone monster pools (10 per zone)
const ZONE_MONSTERS = {
  town_outskirts:    ['stray_dog','feral_cat','giant_rat','plague_bat','goblin_scout','bandit_thug','corrupt_farmer','hollow_scarecrow','mud_crab','bone_imp'],
  forest_path:       ['vine_serpent','forest_boar','forest_wolf','goblin_warrior','giant_spider','goblin_shaman','giant_hornet','stone_golem_shard','shadow_elk','ancient_treant'],
  dark_cave:         ['cave_bat','cave_spider','crystal_lizard','blind_stalker','dark_dwarf','ghost_miner','rock_elemental','cave_wyrm','cave_troll','void_wisp'],
  city_ruins:        ['ruined_knight','tomb_revenant','plague_rat','city_ghoul','bone_archer','rust_golem','void_spawn','shadow_rogue','forsaken_mage','iron_golem_shard'],
  cursed_marshlands: ['poison_frog','mud_golem','bog_lurker','will_o_wisp','swamp_wraith','thornback_turtle','giant_leech','bog_witch','nightmare_croc','marsh_basilisk'],
  void_frontier:     ['void_shade','void_stalker','void_spawn_greater','dimensional_horror','phase_wraith','soul_harvester','reality_eater','void_titan','null_guardian','chaos_elemental'],
  shadowfell_depths: ['shadow_wraith','death_reaper','nightmare_hound','dark_elemental','dark_knight','void_knight','shadow_assassin','soul_devourer','corruption_shade','infernal_demon'],
  vorath_citadel:    ['iron_warden','shadow_construct','citadel_sentinel','void_colossus','void_reaper','void_priest','chaos_sorcerer','ancient_lich','abyssal_dragon','citadel_horror'],
};

function getMonster(monsterId) {
  return MONSTERS[monsterId] || null;
}

function getRandomMonster(zone) {
  const pool = ZONE_MONSTERS[zone] || [];
  if (!pool.length) return null;
  const filtered = pool.filter(id => !MONSTERS[id]?.special || Math.random() < 0.2);
  const pick = filtered.length ? filtered : pool;
  return MONSTERS[pick[Math.floor(Math.random() * pick.length)]];
}

// Calculate physical damage with variance ±15%
// DEF mitigates 50% → breaks down when DEF > ATK×2
function calcDamage(atk, def) {
  const base     = Math.max(1, atk - def * 0.5);
  const variance = base * 0.15;
  const raw      = base + (Math.random() * variance * 2 - variance);
  return Math.max(1, Math.round(raw));
}

// Calculate spell/magic damage with variance ±15%
// DEF mitigates only 15% → magic ignores most armor, strong vs high-DEF enemies
function calcSpellDamage(mag, def) {
  const base     = Math.max(1, mag - def * 0.15);
  const variance = base * 0.15;
  const raw      = base + (Math.random() * variance * 2 - variance);
  return Math.max(1, Math.round(raw));
}

// ── Tier-based bonus drop pools (by zone) ──────────────────────────────────
// When a monster dies, combat.js rolls these for a small chance at equipment
const ZONE_TIER_DROPS = {
  town_outskirts: {
    tier: 1,
    materials: ['monster_fang', 'slime_gel', 'rotten_wood', 'wild_flower', 'iron_ore', 'bread'],
    equipment: [
      'leather_cap', 'leather_chest', 'leather_gloves', 'leather_legs', 'leather_boots',
      'worn_dagger', 'short_bow', 'iron_sword', 'apprentice_staff', 'rusted_axe',
      'tattered_iron_head', 'tattered_iron_chest', 'tattered_iron_gloves',
      'tattered_iron_legs', 'tattered_iron_feet', 'wooden_shield', 'copper_ring',
    ],
    equipChance: 0.06,   // 6% per kill for a T1 equipment piece
    materialChance: 0.0, // materials already in individual drop tables
  },
  forest_path: {
    tier: 1,
    materials: ['wolf_pelt', 'monster_fang', 'crystal_shard', 'honey_jar', 'iron_ore', 'wild_flower'],
    equipment: [
      'leather_chest', 'leather_legs', 'iron_sword', 'short_bow', 'rune_chisel',
      'tattered_iron_chest', 'tattered_iron_legs', 'wooden_shield', 'copper_ring',
    ],
    equipChance: 0.06,
    materialChance: 0.0,
  },
  dark_cave: {
    tier: 2,
    materials: ['iron_ore', 'steel_ingot', 'crystal_shard', 'blue_gem_fragment'],
    equipment: [
      'iron_helmet', 'iron_chest', 'iron_shield',
      'chainmail_head', 'chainmail_chest', 'chainmail_gloves', 'chainmail_legs', 'chainmail_feet',
      'cloth_head', 'cloth_chest', 'cloth_gloves', 'cloth_legs', 'cloth_feet',
      'crude_mech_head', 'crude_mech_chest', 'crude_mech_gloves', 'crude_mech_legs', 'crude_mech_feet',
    ],
    equipChance: 0.055,
    materialChance: 0.0,
  },
  city_ruins: {
    tier: 2,
    materials: ['steel_ingot', 'iron_ore', 'chainmail_fragment', 'void_crystal', 'ancient_scroll'],
    equipment: [
      'chainmail_head', 'chainmail_chest', 'chainmail_gloves', 'chainmail_legs', 'chainmail_feet',
      'cloth_chest', 'cloth_legs', 'iron_shield', 'iron_helmet',
      'crude_mech_chest', 'reinforced_mech_head', 'reinforced_mech_chest',
    ],
    equipChance: 0.055,
    materialChance: 0.0,
  },
  cursed_marshlands: {
    tier: 3,
    materials: ['void_crystal', 'bog_scale', 'ancient_scroll', 'basilisk_scale', 'poison_vial', 'wraith_essence'],
    equipment: [
      'mystic_head', 'mystic_chest', 'mystic_gloves', 'mystic_legs', 'mystic_feet',
      'runic_mech_head', 'runic_mech_chest', 'runic_mech_gloves', 'runic_mech_legs', 'runic_mech_feet',
      'darksteel_shield', 'darksteel_head', 'darksteel_chest',
    ],
    equipChance: 0.05,
    materialChance: 0.0,
  },
  void_frontier: {
    tier: 3,
    materials: ['void_crystal', 'void_essence', 'chaos_shard', 'soul_gem', 'ancient_scroll'],
    equipment: [
      'mystic_chest', 'mystic_legs', 'mystic_feet',
      'darksteel_head', 'darksteel_chest', 'darksteel_gloves', 'darksteel_legs', 'darksteel_feet',
      'void_circuit_mech_head', 'void_circuit_mech_chest',
    ],
    equipChance: 0.05,
    materialChance: 0.0,
  },
  shadowfell_depths: {
    tier: 4,
    materials: ['dark_steel', 'shadow_cloth', 'void_essence', 'soul_gem', 'chaos_shard', 'wraith_essence'],
    equipment: [
      'voidplate_head', 'voidplate_chest', 'voidplate_gloves', 'voidplate_legs', 'voidplate_feet',
      'void_silk_head', 'void_silk_chest', 'void_silk_gloves', 'void_silk_legs', 'void_silk_feet',
      'aetheric_mech_head', 'aetheric_mech_chest', 'aetheric_mech_gloves',
    ],
    equipChance: 0.045,
    materialChance: 0.0,
  },
  vorath_citadel: {
    tier: 4,
    materials: ['dark_steel', 'chaos_shard', 'titan_core', 'dragon_scale', 'void_essence', 'soul_gem'],
    equipment: [
      'voidplate_chest', 'voidplate_legs', 'voidplate_feet',
      'arcane_robe_head', 'arcane_robe_chest', 'arcane_robe_gloves', 'arcane_robe_legs', 'arcane_robe_feet',
      'aetheric_mech_chest', 'aetheric_mech_legs', 'aetheric_mech_feet',
    ],
    equipChance: 0.045,
    materialChance: 0.0,
  },
};

// Roll bonus drops from zone tier pool — called by combat.js after kill
function rollZoneTierDrop(zone) {
  const pool = ZONE_TIER_DROPS[zone];
  if (!pool) return null;
  if (Math.random() < pool.equipChance) {
    const eq = pool.equipment;
    return eq[Math.floor(Math.random() * eq.length)];
  }
  return null;
}

module.exports = {
  MONSTERS, ZONE_MONSTERS, ZONE_TIER_DROPS,
  getMonster, getRandomMonster,
  calcDamage, calcSpellDamage, rollZoneTierDrop,
};