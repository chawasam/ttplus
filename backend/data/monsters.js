// data/monsters.js — Monster definitions for Ashenveil

const MONSTERS = {

  // ===== ZONE: town_outskirts (Lv 1-5) =====
  stray_dog: {
    monsterId: 'stray_dog', name: 'Stray Dog', emoji: '🐕',
    zone: 'town_outskirts', type: 'beast',
    level: 1, xpReward: 8, goldReward: [2, 6],
    hp: 28, atk: 6, def: 2, spd: 8,
    desc: 'สุนัขจรจัดที่หิวโหย ดวงตาดุดัน',
    attackMsg: ['กัดข้อเท้า', 'พุ่งเข้าหา', 'ขย้ำแขน'],
    drops: [
      { itemId: 'bread', chance: 0.1 },
    ],
    flee_chance: 0.8,
  },

  goblin_scout: {
    monsterId: 'goblin_scout', name: 'Goblin Scout', emoji: '👺',
    zone: 'town_outskirts', type: 'human',
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
    zone: 'forest_path', type: 'beast',
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
    zone: 'forest_path', type: 'human',
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
    zone: 'forest_path', type: 'beast',
    level: 4, xpReward: 28, goldReward: [8, 16],
    hp: 58, atk: 16, def: 6, spd: 12,
    statusAttack: { type: 'POISON', chance: 0.35, duration: 3, dmgPerTurn: 5 },
    desc: 'แมงมุมขนาดยักษ์ แปดตาเปล่งประกาย พิษถึงตาย',
    attackMsg: ['กัดด้วยเขี้ยวพิษ', 'ปาตาข่าย', 'ตะปบด้วยขา'],
    moves: [
      { name: 'ฉีกด้วยเขี้ยว',  emoji: '🕷️', dmgMult: 1.0,  weight: 50 },
      { name: 'Web Wrap',        emoji: '🕸️', dmgMult: 0.6,  weight: 30,
        effect: { type: 'SLOW', duration: 2, atkMult: 0.75 } },
      { name: 'Venom Strike',    emoji: '☠️', dmgMult: 0.8,  weight: 20, telegraphed: true,
        effect: { type: 'POISON', duration: 3, dmgPerTurn: 8 } },
    ],
    drops: [
      { itemId: 'slime_gel', chance: 0.6 },
      { itemId: 'antidote', chance: 0.2 },
      { itemId: 'blue_gem_fragment', chance: 0.08 },
    ],
    flee_chance: 0.7,
  },

  ancient_treant: {
    monsterId: 'ancient_treant', name: 'Ancient Treant', emoji: '🌳',
    zone: 'forest_path', type: 'beast',
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
    zone: 'dark_cave', type: 'beast',
    level: 5, xpReward: 20, goldReward: [6, 14],
    hp: 45, atk: 12, def: 3, spd: 15,
    desc: 'ค้างคาวถ้ำตัวใหญ่ บินวนซ้ำหลอกทิศทาง',
    attackMsg: ['โฉบเฉี่ยวข้ามหัว', 'ฝูงบินพุ่งเข้าหา', 'ส่งเสียงอัลตราโซนิก'],
    drops: [
      { itemId: 'monster_fang', chance: 0.4 },
    ],
    flee_chance: 0.7,
  },

  cave_troll: {
    monsterId: 'cave_troll', name: 'Cave Troll', emoji: '👾',
    zone: 'dark_cave', type: 'beast',
    level: 7, xpReward: 65, goldReward: [25, 50],
    hp: 200, atk: 28, def: 20, spd: 3,
    regen: 8,
    desc: 'ทรอลล์ใต้ถ้ำ ผิวหนาแน่น ฟื้นร่างกายตัวเองได้เรื่อยๆ',
    attackMsg: ['ทุบด้วยกำปั้นหิน', 'โยนก้อนหิน', 'ทำให้ตึงตัว'],
    moves: [
      { name: 'ทุบกำปั้น',      emoji: '👊', dmgMult: 1.0, weight: 50 },
      { name: 'โยนก้อนหิน',     emoji: '🪨', dmgMult: 0.8, weight: 30 },
      { name: 'Crushing Slam',   emoji: '💥', dmgMult: 1.6, weight: 20, telegraphed: true },
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
    zone: 'city_ruins', type: 'undead',
    level: 10, xpReward: 90, goldReward: [35, 65],
    hp: 220, atk: 38, def: 30, spd: 5,
    desc: 'อัศวินที่ตายในสงครามและลุกขึ้นมาอีก เกราะแตกร้าวแต่ยังสู้ได้',
    attackMsg: ['ฟาดด้วยดาบสนิม', 'กดโล่เก่าทับ', 'พุ่งจากด้านหลัง'],
    moves: [
      { name: 'ฟันดาบสนิม',    emoji: '⚔️', dmgMult: 1.0, weight: 50 },
      { name: 'Shield Bash',    emoji: '🛡️', dmgMult: 0.7, weight: 30,
        effect: { type: 'STUN', duration: 1 } },
      { name: 'Death Charge',   emoji: '💀', dmgMult: 1.5, weight: 20, telegraphed: true },
    ],
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
    zone: 'city_ruins', type: 'beast',
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
    zone: 'city_ruins', type: 'undead',
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
    zone: 'city_ruins', type: 'human',
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
    zone: 'city_ruins', type: 'construct',
    level: 16, xpReward: 180, goldReward: [80, 130],
    hp: 500, atk: 60, def: 45, spd: 2,
    desc: 'ชิ้นส่วนของ Iron Golem เก่าที่ยังเคลื่อนไหวได้ ทุบยาก',
    attackMsg: ['กดทับด้วยกำปั้นเหล็ก', 'ยิงไอน้ำร้อน', 'กระแทกพื้น'],
    moves: [
      { name: 'Iron Fist',      emoji: '🤜', dmgMult: 1.0,  weight: 45 },
      { name: 'Steam Blast',    emoji: '💨', dmgMult: 0.9,  weight: 35,
        effect: { type: 'BURN', duration: 2, dmgPerTurn: 10 } },
      { name: 'Core Overload',  emoji: '⚡', dmgMult: 2.0,  weight: 20, telegraphed: true },
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
  bog_lurker: {
    monsterId: 'bog_lurker', name: 'Bog Lurker', emoji: '🐊',
    zone: 'cursed_marshlands', type: 'beast',
    level: 18, xpReward: 160, goldReward: [60, 100],
    hp: 310, atk: 65, def: 25, spd: 7,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 12 },
    desc: 'สัตว์เลื้อยคลานขนาดใหญ่ที่ถูกพิษหนองสาบเข้าสิง ซ่อนอยู่ในโคลน',
    attackMsg: ['กัดดึงลงน้ำ', 'ตีด้วยหาง', 'พ่นพิษหนอง'],
    moves: [
      { name: 'กัดดึงลงน้ำ',   emoji: '🐊', dmgMult: 1.0, weight: 45 },
      { name: 'Tail Sweep',     emoji: '💨', dmgMult: 0.8, weight: 30 },
      { name: 'Bog Venom Spit', emoji: '🤢', dmgMult: 0.6, weight: 25, telegraphed: true,
        effect: { type: 'POISON', duration: 4, dmgPerTurn: 15 } },
    ],
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
    zone: 'cursed_marshlands', type: 'undead',
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
    zone: 'cursed_marshlands', type: 'beast',
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
    zone: 'cursed_marshlands', type: 'beast',
    level: 25, xpReward: 280, goldReward: [100, 180],
    hp: 420, atk: 88, def: 35, spd: 10,
    statusAttack: { type: 'STUN', chance: 0.3, duration: 1, dmgPerTurn: 0 },
    desc: 'บาซิลิสก์หนองน้ำ สายตาทำให้เป็นหินชั่วคราว',
    attackMsg: ['จ้องตาทำให้งง', 'กัดด้วยพิษหิน', 'ตีด้วยหางหิน'],
    moves: [
      { name: 'กัดพิษหิน',       emoji: '🦎', dmgMult: 1.0,  weight: 40 },
      { name: 'Tail Strike',      emoji: '💥', dmgMult: 1.2,  weight: 35 },
      { name: 'Petrifying Gaze',  emoji: '👁️', dmgMult: 0.4,  weight: 25, telegraphed: true,
        effect: { type: 'STUN', duration: 2 } },
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
  void_stalker: {
    monsterId: 'void_stalker', name: 'Void Stalker', emoji: '🕳️',
    zone: 'void_frontier', type: 'void',
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
    zone: 'void_frontier', type: 'void',
    level: 32, xpReward: 400, goldReward: [150, 250],
    hp: 480, atk: 115, def: 28, spd: 14,
    desc: 'ปีศาจเก็บเกี่ยววิญญาณ ยิ่งฆ่ายิ่งแกร่ง',
    attackMsg: ['เก็บเกี่ยววิญญาณ', 'เคียวเงาหวด', 'ดูด XP ออกจากร่าง'],
    moves: [
      { name: 'เคียวเงา',       emoji: '💀', dmgMult: 1.0, weight: 45 },
      { name: 'Soul Rend',       emoji: '👻', dmgMult: 1.1, weight: 35,
        effect: { type: 'CURSE', duration: 2, dmgPerTurn: 12 } },
      { name: 'Harvest',         emoji: '⚰️', dmgMult: 1.8, weight: 20, telegraphed: true },
    ],
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
    zone: 'void_frontier', type: 'void',
    level: 36, xpReward: 550, goldReward: [200, 350],
    hp: 900, atk: 140, def: 50, spd: 6,
    regen: 15,
    desc: 'ไททันแห่ง Void มหาศาล ฟื้นฟูตัวเองจากพลังงานมืด',
    attackMsg: ['กำปั้นแห่ง Void', 'คลื่นพลังงานมืด', 'บดขยี้ด้วยน้ำหนัก'],
    moves: [
      { name: 'Void Fist',     emoji: '🌑', dmgMult: 1.0, weight: 40 },
      { name: 'Dark Wave',     emoji: '🌊', dmgMult: 1.2, weight: 35 },
      { name: 'Void Nova',     emoji: '💥', dmgMult: 2.5, weight: 25, telegraphed: true },
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

  chaos_elemental: {
    monsterId: 'chaos_elemental', name: 'Chaos Elemental', emoji: '🌀',
    zone: 'void_frontier', type: 'void',
    level: 38, xpReward: 600, goldReward: [220, 380],
    hp: 550, atk: 155, def: 30, spd: 18,
    desc: 'ธาตุแห่งความโกลาหล ทุกตีมีองค์ประกอบแตกต่าง คาดเดาไม่ได้',
    attackMsg: ['ฟ้าผ่า Chaos', 'ไฟน้ำแข็งพร้อมกัน', 'ระเบิดพลังงานสุ่ม'],
    moves: [
      { name: 'Chaos Bolt',    emoji: '⚡', dmgMult: 1.0, weight: 35 },
      { name: 'Firestorm',     emoji: '🔥', dmgMult: 1.1, weight: 30,
        effect: { type: 'BURN', duration: 2, dmgPerTurn: 18 } },
      { name: 'Chaos Burst',   emoji: '🌀', dmgMult: 2.2, weight: 20, telegraphed: true },
      { name: 'Void Chill',    emoji: '❄️', dmgMult: 0.7, weight: 15,
        effect: { type: 'SLOW', duration: 2, atkMult: 0.75 } },
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
    level: 38, xpReward: 580, goldReward: [200, 340],
    hp: 480, atk: 140, def: 32, spd: 20,
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

  dark_knight: {
    monsterId: 'dark_knight', name: 'Dark Knight', emoji: '🖤',
    zone: 'shadowfell_depths', type: 'undead',
    level: 42, xpReward: 700, goldReward: [250, 420],
    hp: 650, atk: 170, def: 55, spd: 12,
    desc: 'อัศวินผู้ถูกสาปให้รับใช้ความมืดชั่วนิรันดร์ ไม่รู้จักความเจ็บปวด',
    attackMsg: ['ฟัน Dark Slash', 'ชาร์จ Void Strike', 'โล่ Shadow Bash'],
    drops: [
      { itemId: 'dark_steel', chance: 0.7 },
      { itemId: 'void_crystal', chance: 0.4 },
      { itemId: 'shadow_cloth', chance: 0.5 },
    ],
    flee_chance: 0.35,
  },

  nightmare_hound: {
    monsterId: 'nightmare_hound', name: 'Nightmare Hound', emoji: '🐕‍🦺',
    zone: 'shadowfell_depths', type: 'beast',
    level: 40, xpReward: 630, goldReward: [210, 360],
    hp: 520, atk: 160, def: 28, spd: 25,
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

  // ===== ZONE: vorath_citadel (Lv 50+) =====
  citadel_sentinel: {
    monsterId: 'citadel_sentinel', name: 'Citadel Sentinel', emoji: '🗿',
    zone: 'vorath_citadel', type: 'construct',
    level: 52, xpReward: 900, goldReward: [350, 600],
    hp: 900, atk: 200, def: 80, spd: 8,
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

  void_priest: {
    monsterId: 'void_priest', name: 'Void Priest', emoji: '🧙‍♂️',
    zone: 'vorath_citadel', type: 'void',
    level: 55, xpReward: 1100, goldReward: [400, 700],
    hp: 720, atk: 230, def: 45, spd: 22,
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

  abyssal_dragon: {
    monsterId: 'abyssal_dragon', name: 'Abyssal Dragon', emoji: '🐉',
    zone: 'vorath_citadel', type: 'void',
    level: 58, xpReward: 1400, goldReward: [500, 900],
    hp: 1100, atk: 260, def: 70, spd: 18,
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

  // ===== ZONE BOSSES (1 per zone, 24h cooldown) =====
  outskirts_boss: {
    monsterId: 'outskirts_boss', name: 'Goblin King Grak', emoji: '👑',
    zone: 'town_outskirts', type: 'human',
    level: 6, xpReward: 350, goldReward: [80, 150],
    hp: 450, atk: 26, def: 14, spd: 7,
    desc: '👑 ราชาโกบลิน Grak — ครองพื้นที่ชานเมืองด้วยกำลังและความโหดร้าย แกนนำกองกำลังโกบลินทั้งหมด',
    attackMsg: ['ฟันกระบี่ทองคำ', 'ตะโกนให้ลูกน้องช่วย', 'กระแทกโล่สูง', 'พุ่งเต็มแรง'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3,
        response: { type: 'counterAttack', dmgMult: 1.5, log: '👑 Grak โต้กลับ! กระบี่ทองแฝดฟัน!' } },
      { trigger: 'hpBelow', threshold: 0.3,
        response: { type: 'enrage', atkMult: 1.3, defMult: 0.8, log: '👑 Grak ENRAGE! "ฉันจะล้มแค่ตายเท่านั้น!!"' } },
    ],
    drops: [
      { itemId: 'goblin_ear',           chance: 1.0 },
      { itemId: 'iron_ore',             chance: 0.9 },
      { itemId: 'health_potion_medium', chance: 0.7 },
      { itemId: 'ancient_scroll',       chance: 0.2 },
      { itemId: 'goblin_king_seal',     chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.03,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  forest_boss: {
    monsterId: 'forest_boss', name: 'Elder Treant Monarch', emoji: '🌳',
    zone: 'forest_path', type: 'beast',
    level: 10, xpReward: 700, goldReward: [150, 280],
    hp: 900, atk: 42, def: 30, spd: 2,
    desc: '🌳 Treant ผู้เฒ่าแห่งป่า — อายุกว่า 2000 ปี ตื่นขึ้นเพราะป่าของมันถูกทำลาย พลังธรรมชาติมหาศาล',
    attackMsg: ['กิ่งยักษ์กวาด', 'รากดึงลงดิน', 'ปล่อยสปอร์พิษ', 'เรียกพาย'],
    drops: [
      { itemId: 'rotten_wood',     chance: 1.0 },
      { itemId: 'wild_flower',     chance: 0.9 },
      { itemId: 'honey_jar',       chance: 0.6 },
      { itemId: 'crystal_shard',   chance: 0.4 },
      { itemId: 'ancient_scroll',  chance: 0.25 },
      { itemId: 'treant_heartwood', chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.02,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  cave_boss: {
    monsterId: 'cave_boss', name: 'Crystal Troll Lord', emoji: '💎',
    zone: 'dark_cave', type: 'beast',
    level: 14, xpReward: 1000, goldReward: [200, 400],
    hp: 1200, atk: 58, def: 40, spd: 4,
    regen: 20,
    desc: '💎 ท่านเจ้าแห่งถ้ำ — ทรอลล์ผู้ฟื้นฟูตัวเองด้วยพลังคริสตัล ผิวหนังกลายเป็นผลึกแข็งระดับเพชร',
    attackMsg: ['กำปั้นคริสตัล', 'คลื่นพลังฟื้นฟู', 'เซาะผลึกพิษ', 'กระแทกพื้น'],
    drops: [
      { itemId: 'crystal_shard',     chance: 1.0 },
      { itemId: 'iron_ore',          chance: 0.9 },
      { itemId: 'void_crystal',      chance: 0.35 },
      { itemId: 'ancient_scroll',    chance: 0.3 },
      { itemId: 'troll_crystal_heart', chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.02,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  ruins_boss: {
    monsterId: 'ruins_boss', name: 'Iron Golem Prime', emoji: '🤖',
    zone: 'city_ruins', type: 'construct',
    level: 20, xpReward: 1500, goldReward: [350, 600],
    hp: 1800, atk: 85, def: 65, spd: 5,
    desc: '🤖 Golem ต้นแบบของ Ashenveil — สร้างขึ้นเพื่อปกป้องเมือง แต่ถูก Void ปรับแต่งให้เป็นผู้ทำลาย',
    attackMsg: ['ชกพลังไอน้ำ', 'ยิงลูกเหล็ก', 'กระแทกพื้น Shockwave', 'เปลี่ยนโหมดโจมตี'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3,
        response: { type: 'counterAttack', dmgMult: 1.5, log: '🤖 Iron Golem ตอบโต้! Hydraulic Overdrive!!' } },
      { trigger: 'hpBelow', threshold: 0.3,
        response: { type: 'shieldPhase', defMult: 0.3, duration: 2, log: '🛡️ Iron Golem เปิดเกราะฉุกเฉิน! DEF ลด 70% เป็นเวลา 2 turns!' } },
      { trigger: 'statusApplied',
        response: { type: 'enrage', atkMult: 1.3, defMult: 0.8, log: '🤖 ERROR — COMBAT OVERRIDE! ATK +30%!' } },
    ],
    drops: [
      { itemId: 'steel_ingot',        chance: 1.0 },
      { itemId: 'iron_ore',           chance: 0.9 },
      { itemId: 'chainmail_fragment', chance: 0.5 },
      { itemId: 'void_crystal',       chance: 0.3 },
      { itemId: 'ancient_scroll',     chance: 0.35 },
      { itemId: 'prime_golem_core',   chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.01,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  marsh_boss: {
    monsterId: 'marsh_boss', name: 'Hydra of the Deep', emoji: '🐍',
    zone: 'cursed_marshlands', type: 'beast',
    level: 28, xpReward: 2200, goldReward: [500, 900],
    hp: 2500, atk: 115, def: 55, spd: 10,
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
      { itemId: 'hydra_venom_sac', chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.01,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  void_boss: {
    monsterId: 'void_boss', name: 'Void Herald Azh\'kal', emoji: '🌌',
    zone: 'void_frontier', type: 'void',
    level: 38, xpReward: 3500, goldReward: [800, 1400],
    hp: 3500, atk: 175, def: 70, spd: 22,
    statusAttack: { type: 'POISON', chance: 0.4, duration: 3, dmgPerTurn: 50 },
    desc: '🌌 ผู้ส่งสารจาก The Void — Azh\'kal มาก่อนการทำลายล้างครั้งใหญ่เสมอ พลังงาน Void ไหลออกจากร่างกายตลอดเวลา',
    attackMsg: ['Void Beam เต็มพลัง', 'ดึงผู้เล่นเข้า Void', 'ระเบิด Null Field', 'เปิดประตูมิติ'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3,
        response: { type: 'counterAttack', dmgMult: 2.0, log: '🌌 Azh\'kal ดูดพลังโจมตี — Void Absorption! ×2 damage!!' } },
      { trigger: 'hpBelow', threshold: 0.5,
        response: { type: 'evasionPhase', dodgeRate: 0.4, duration: 1, log: '🌌 Azh\'kal เข้าสู่ Void Phase! หลบหลีก +40% ต่อ 1 turn!' } },
      { trigger: 'hpBelow', threshold: 0.3,
        response: { type: 'enrage', atkMult: 1.4, defMult: 0.9, log: '🌌 VOID SINGULARITY! Azh\'kal ระเบิดพลัง ATK +40%!' } },
    ],
    drops: [
      { itemId: 'void_crystal',      chance: 1.0 },
      { itemId: 'void_essence',      chance: 0.8 },
      { itemId: 'soul_gem',          chance: 0.5 },
      { itemId: 'chaos_shard',       chance: 0.4 },
      { itemId: 'ancient_scroll',    chance: 0.5 },
      { itemId: 'void_herald_sigil', chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.01,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  shadow_boss: {
    monsterId: 'shadow_boss', name: 'Shadow Archon Vael', emoji: '🌑',
    zone: 'shadowfell_depths', type: 'void',
    level: 48, xpReward: 5500, goldReward: [1200, 2000],
    hp: 5000, atk: 240, def: 90, spd: 28,
    statusAttack: { type: 'POISON', chance: 0.45, duration: 3, dmgPerTurn: 60 },
    desc: '🌑 Archon แห่ง Shadowfell — Vael ผู้ปกครองมิติเงา เคยเป็นมนุษย์ก่อนจะขายวิญญาณเพื่อพลังสูงสุด',
    attackMsg: ['Shadow Strike ทั้งสาม', 'ดูดวิญญาณ', 'ความมืดกลืนกิน', 'Clone จากเงา'],
    counters: [
      { trigger: 'consecutiveAttack', count: 3,
        response: { type: 'counterAttack', dmgMult: 2.0, log: '🌑 Vael สะท้อนเงา — Shadow Clone Strike! ×2 damage!' } },
      { trigger: 'hpBelow', threshold: 0.5,
        response: { type: 'evasionPhase', dodgeRate: 0.4, duration: 1, log: '🌑 Vael กลืนเข้าเงา — Dodge +40%!' } },
    ],
    drops: [
      { itemId: 'shadow_cloth',         chance: 1.0 },
      { itemId: 'void_essence',         chance: 0.9 },
      { itemId: 'soul_gem',             chance: 0.6 },
      { itemId: 'chaos_shard',          chance: 0.55 },
      { itemId: 'ancient_scroll',       chance: 0.6 },
      { itemId: 'shadow_archon_essence', chance: 1.0 }, // Unique guaranteed drop
    ],
    flee_chance: 0.01,
    special: 'zone_boss',
    cooldownHours: 24,
  },

  vorath_boss: {
    monsterId: 'vorath_boss', name: 'Avatar of Vorath', emoji: '👁️',
    zone: 'vorath_citadel', type: 'void',
    level: 60, xpReward: 9999, goldReward: [2000, 4000],
    hp: 8000, atk: 320, def: 120, spd: 30,
    regen: 50,
    statusAttack: { type: 'POISON', chance: 0.5, duration: 3, dmgPerTurn: 80 },
    desc: '👁️ อวตารของ Vorath — ไม่ใช่ตัว Vorath จริงๆ แต่เป็นเศษพลังงานที่เขาทิ้งไว้ ยังคงทรงพลังมหาศาล ความพ่ายแพ้ที่นี่ไม่ใช่จุดจบ แต่เป็นการทดสอบ',
    attackMsg: ['พลัง The Sundering', 'Void Annihilation', 'ตา Vorath เปิด', 'ดึงกลับก่อนมีชีวิต', 'ปลดพลัง Shard-Anchor'],
    counters: [
      { trigger: 'consecutiveAttack', count: 2,
        response: { type: 'counterAttack', dmgMult: 2.5, log: '👁️ ตา Vorath มองเห็น — REALITY SHATTER! ×2.5 damage!!' } },
      { trigger: 'hpBelow', threshold: 0.5,
        response: { type: 'shieldPhase', defMult: 0.3, duration: 2, log: '👁️ Vorath เรียก Void Shield — รับดาเมจ -70% 2 turns! ต้องฝ่าด้วยพลัง!' } },
      { trigger: 'hpBelow', threshold: 0.25,
        response: { type: 'enrage', atkMult: 1.5, defMult: 0.8, log: '👁️ THE EYE OPENS FULLY!! — VOID ASCENSION! ATK +50%!! (ต้องพิชิตให้ได้!)' } },
      { trigger: 'statusApplied',
        response: { type: 'evasionPhase', dodgeRate: 0.35, duration: 1, log: '👁️ Vorath บิดมิติหลีกภัย! Dodge +35% ชั่วคราว!' } },
    ],
    drops: [
      { itemId: 'void_crystal',  chance: 1.0 },
      { itemId: 'void_essence',  chance: 1.0 },
      { itemId: 'soul_gem',      chance: 0.8 },
      { itemId: 'chaos_shard',   chance: 0.8 },
      { itemId: 'ancient_scroll', chance: 0.8 },
      { itemId: 'titan_core',    chance: 0.5 },
      { itemId: 'vorath_tear',   chance: 1.0 }, // Unique guaranteed drop — rarest item in game
    ],
    flee_chance: 0.0,
    special: 'zone_boss',
    cooldownHours: 48,
  },

  // ===== VORATH — True Form (Phase 2, triggers when vorath_boss reaches 30% HP) =====
  vorath_true: {
    monsterId: 'vorath_true', name: 'Vorath — The Forgotten God', emoji: '🌑',
    zone: 'vorath_citadel', type: 'void',
    level: 65, xpReward: 15000, goldReward: [5000, 8000],
    hp: 5000, atk: 420, def: 80, spd: 40,
    regen: 0, // ไม่ regen — ทุกอย่างอยู่ที่การโจมตี
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
      { trigger: 'consecutiveAttack', count: 2,
        response: { type: 'counterAttack', dmgMult: 3.0,
          log: '🌑 "เจ้าโจมตีโดยไม่ฟัง!" — VOID RETALIATION ×3.0!!' } },
      { trigger: 'hpBelow', threshold: 0.5,
        response: { type: 'healSelf', amount: 500,
          log: '🌑 Vorath ดึงพลัง Void กลับ — ฟื้นฟู 500 HP!' } },
      { trigger: 'hpBelow', threshold: 0.2,
        response: { type: 'enrage', atkMult: 2.0, defMult: 0.5,
          log: '🌑 "ถ้านั่นคือสิ่งที่เจ้าต้องการ..." — FINAL VOID AWAKENING! ATK ×2!!' } },
      { trigger: 'skillUsed',
        response: { type: 'counterAttack', dmgMult: 1.5,
          log: '🌑 Vorath อ่านพลังงาน Skill — VOID ABSORPTION! ×1.5 counter!' } },
    ],
    drops: [
      { itemId: 'void_crystal',   chance: 1.0 },
      { itemId: 'void_essence',   chance: 1.0 },
      { itemId: 'chaos_shard',    chance: 1.0 },
      { itemId: 'soul_gem',       chance: 1.0 },
      { itemId: 'titan_core',     chance: 0.8 },
      { itemId: 'vorath_tear',    chance: 1.0 }, // always drops
      { itemId: 'memory_fragment', chance: 1.0 },
      { itemId: 'ancient_scroll', chance: 1.0 },
    ],
    flee_chance: 0.0,
    special: 'final_boss',
    isPhase2: true,
    phase2From: 'vorath_boss',
    phase2Threshold: 0.30, // trigger เมื่อ vorath_boss HP <= 30%
    cooldownHours: 72,
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
  shadowfell_depths:  ['shadow_wraith', 'dark_knight', 'nightmare_hound'],
  vorath_citadel:     ['citadel_sentinel', 'void_priest', 'abyssal_dragon'],
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
