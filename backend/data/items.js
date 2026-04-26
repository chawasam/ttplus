// data/items.js — Static item definitions for Ashenveil
// itemId → definition (immutable reference data)

const ITEMS = {

  // ===== WEAPONS =====

  iron_sword: {
    itemId: 'iron_sword', name: 'Iron Sword', emoji: '⚔️',
    grade: 'UNCOMMON', type: 'MAIN_HAND',
    classReq: ['WARRIOR', 'PALADIN', 'BERSERKER'],
    levelReq: 1,
    base: { atk: 18 },
    rolls: { crit_rate: [1, 4] },
    sockets: 1,
    desc: 'ดาบเหล็กธรรมดาที่ตีขึ้นในหมู่บ้าน คมพอประมาณ',
    sellPrice: 40, buyPrice: 120,
  },

  worn_dagger: {
    itemId: 'worn_dagger', name: 'Worn Dagger', emoji: '🗡️',
    grade: 'COMMON', type: 'MAIN_HAND',
    classReq: ['ROGUE', 'ASSASSIN', 'PHANTOM'],
    levelReq: 1,
    base: { atk: 12, spd: 5 },
    rolls: { crit_rate: [3, 8] },
    sockets: 0,
    desc: 'มีดสั้นเก่า มีรอยขีดข่วนมาก แต่ยังคมอยู่',
    sellPrice: 25, buyPrice: 80,
  },

  apprentice_staff: {
    itemId: 'apprentice_staff', name: "Apprentice's Staff", emoji: '🪄',
    grade: 'COMMON', type: 'MAIN_HAND',
    classReq: ['MAGE', 'HEXBLADE'],
    levelReq: 1,
    base: { mag: 20, atk: 5 },
    rolls: { spell_power: [2, 6] },
    sockets: 0,
    desc: 'ไม้เท้าของนักเรียนเวทย์ ยังมีพลังงานอ่อนๆ สั่นสะเทือนอยู่ในนั้น',
    sellPrice: 30, buyPrice: 90,
  },

  short_bow: {
    itemId: 'short_bow', name: 'Short Bow', emoji: '🏹',
    grade: 'COMMON', type: 'MAIN_HAND',
    classReq: ['RANGER', 'BARD'],
    levelReq: 1,
    base: { atk: 14, spd: 3 },
    rolls: { crit_rate: [2, 5] },
    sockets: 0,
    desc: 'ธนูไม้สั้น เหมาะสำหรับผู้เริ่มต้น น้ำหนักเบา',
    sellPrice: 30, buyPrice: 90,
  },

  rusted_axe: {
    itemId: 'rusted_axe', name: 'Rusted Axe', emoji: '🪓',
    grade: 'COMMON', type: 'MAIN_HAND',
    classReq: ['BERSERKER', 'WARRIOR'],
    levelReq: 1,
    base: { atk: 22 },
    rolls: { crit_rate: [0, 2] },
    sockets: 0,
    desc: 'ขวานเก่าสนิมจับ หนักมาก แต่เมื่อฟาดลงไป... ไม่มีอะไรหยุดได้',
    sellPrice: 20, buyPrice: 70,
  },

  rune_chisel: {
    itemId: 'rune_chisel', name: 'Rune Chisel', emoji: '🔨',
    grade: 'UNCOMMON', type: 'MAIN_HAND',
    classReq: ['RUNESMITH', 'ENGINEER'],
    levelReq: 1,
    base: { atk: 15, mag: 10 },
    rolls: { rune_power: [3, 8] },
    sockets: 1,
    desc: 'สิ่วแกะรูน เครื่องมือแห่ง Dwarven ที่ผสมระหว่างอาวุธและศิลปะ',
    sellPrice: 50, buyPrice: 150,
  },

  // ===== ARMOR =====

  // Common leather set
  leather_cap: {
    itemId: 'leather_cap', name: 'Leather Cap', emoji: '🪖',
    grade: 'COMMON', type: 'HEAD',
    classReq: [],
    levelReq: 1,
    base: { def: 5 },
    rolls: {},
    sockets: 0,
    desc: 'หมวกหนังธรรมดา บางเบา แต่ก็ยังดีกว่าไม่มีอะไร',
    sellPrice: 15, buyPrice: 50,
  },

  leather_chest: {
    itemId: 'leather_chest', name: 'Leather Chest', emoji: '🥋',
    grade: 'COMMON', type: 'CHEST',
    classReq: [],
    levelReq: 1,
    base: { def: 10 },
    rolls: {},
    sockets: 0,
    desc: 'เสื้อเกราะหนัง สวมใส่สะดวก เหมาะกับนักผจญภัยมือใหม่',
    sellPrice: 20, buyPrice: 65,
  },

  leather_gloves: {
    itemId: 'leather_gloves', name: 'Leather Gloves', emoji: '🧤',
    grade: 'COMMON', type: 'GLOVES',
    classReq: [],
    levelReq: 1,
    base: { def: 4, atk_spd: 2 },
    rolls: {},
    sockets: 0,
    desc: 'ถุงมือหนังอ่อน ช่วยให้จับอาวุธได้มั่นขึ้น',
    sellPrice: 12, buyPrice: 40,
  },

  leather_legs: {
    itemId: 'leather_legs', name: 'Leather Pants', emoji: '👖',
    grade: 'COMMON', type: 'LEGS',
    classReq: [],
    levelReq: 1,
    base: { def: 7, spd: 2 },
    rolls: {},
    sockets: 0,
    desc: 'กางเกงหนัง เหนียวทน เดินทางไกลได้สบาย',
    sellPrice: 18, buyPrice: 55,
  },

  leather_boots: {
    itemId: 'leather_boots', name: 'Leather Boots', emoji: '👢',
    grade: 'COMMON', type: 'FEET',
    classReq: [],
    levelReq: 1,
    base: { def: 4, spd: 5 },
    rolls: {},
    sockets: 0,
    desc: 'รองเท้าหนังที่สึกหรอนิดหน่อย แต่ยังใช้ได้ดี',
    sellPrice: 15, buyPrice: 48,
  },

  // Iron set (better)
  iron_helmet: {
    itemId: 'iron_helmet', name: 'Iron Helmet', emoji: '⛑️',
    grade: 'UNCOMMON', type: 'HEAD',
    classReq: ['WARRIOR', 'PALADIN', 'BERSERKER'],
    levelReq: 5,
    base: { def: 14 },
    rolls: { hp_bonus: [10, 30] },
    sockets: 1,
    desc: 'หมวกเหล็กหนา ป้องกันได้ดี แต่ร้อนมากตอนอากาศร้อน',
    sellPrice: 60, buyPrice: 180,
  },

  iron_chest: {
    itemId: 'iron_chest', name: 'Iron Chestplate', emoji: '🛡️',
    grade: 'UNCOMMON', type: 'CHEST',
    classReq: ['WARRIOR', 'PALADIN', 'BERSERKER'],
    levelReq: 5,
    base: { def: 28 },
    rolls: { hp_bonus: [20, 50] },
    sockets: 1,
    desc: 'เกราะเหล็กหนักแต่แข็งแกร่ง เป็นที่นิยมของนักรบทั่วไป',
    sellPrice: 100, buyPrice: 300,
  },

  // ===== OFF HAND =====
  wooden_shield: {
    itemId: 'wooden_shield', name: 'Wooden Shield', emoji: '🛡️',
    grade: 'COMMON', type: 'OFF_HAND',
    classReq: ['WARRIOR', 'PALADIN'],
    levelReq: 1,
    base: { def: 8, block_rate: 10 },
    rolls: {},
    sockets: 0,
    desc: 'โล่ไม้ธรรมดา มีรอยขีดข่วนจากการต่อสู้หลายครั้ง',
    sellPrice: 20, buyPrice: 65,
  },

  // ===== ACCESSORIES =====
  copper_ring: {
    itemId: 'copper_ring', name: 'Copper Ring', emoji: '💍',
    grade: 'COMMON', type: 'RING_L',
    classReq: [],
    levelReq: 1,
    base: { hp: 15 },
    rolls: {},
    sockets: 0,
    desc: 'แหวนทองแดงเรียบๆ ไม่มีอะไรพิเศษ แต่ยังรู้สึกอุ่นเมื่อสวม',
    sellPrice: 10, buyPrice: 35,
  },

  // ===== CONSUMABLES =====
  health_potion_small: {
    itemId: 'health_potion_small', name: 'Small Health Potion', emoji: '🧪',
    grade: 'COMMON', type: 'CONSUMABLE',
    classReq: [],
    levelReq: 1,
    effect: { heal: 40 },
    desc: 'ยาฟื้นฟูขนาดเล็ก มีกลิ่นสมุนไพรแปลกๆ แต่ใช้ได้ผล',
    sellPrice: 8, buyPrice: 25,
    stackable: true, maxStack: 99,
  },

  health_potion_medium: {
    itemId: 'health_potion_medium', name: 'Health Potion', emoji: '🍶',
    grade: 'UNCOMMON', type: 'CONSUMABLE',
    classReq: [],
    levelReq: 1,
    effect: { heal: 100 },
    desc: 'ยาฟื้นฟูมาตรฐาน สีแดงเข้ม หอมกรุ่น',
    sellPrice: 20, buyPrice: 60,
    stackable: true, maxStack: 99,
  },

  mp_potion_small: {
    itemId: 'mp_potion_small', name: 'Small Mana Potion', emoji: '💧',
    grade: 'COMMON', type: 'CONSUMABLE',
    classReq: [],
    levelReq: 1,
    effect: { restoreMP: 30 },
    desc: 'ยาฟื้นฟูพลังเวทย์ขนาดเล็ก สีน้ำเงินใส',
    sellPrice: 8, buyPrice: 25,
    stackable: true, maxStack: 99,
  },

  antidote: {
    itemId: 'antidote', name: 'Antidote', emoji: '🩺',
    grade: 'COMMON', type: 'CONSUMABLE',
    classReq: [],
    levelReq: 1,
    effect: { cureStatus: 'POISON' },
    desc: 'ยาแก้พิษ ทำจากสมุนไพรหายาก ใช้เมื่อถูกวางยาพิษ',
    sellPrice: 12, buyPrice: 35,
    stackable: true, maxStack: 99,
  },

  // ===== MATERIALS (NPC gifts + crafting) =====
  wild_flower: {
    itemId: 'wild_flower', name: 'Wild Flower', emoji: '🌸',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ดอกไม้ป่าสีชมพูอ่อน หอมอ่อนๆ เก็บได้จากทุ่งหญ้า',
    sellPrice: 5, buyPrice: null,
    stackable: true, maxStack: 999,
  },

  honey_jar: {
    itemId: 'honey_jar', name: 'Honey Jar', emoji: '🍯',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'น้ำผึ้งใสสีทองในขวดแก้ว หวานหอม ต้องไปหาจากรัง',
    sellPrice: 15, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  blue_gem_fragment: {
    itemId: 'blue_gem_fragment', name: 'Blue Gem Fragment', emoji: '💎',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เศษอัญมณีสีน้ำเงิน ประกายสวยงาม พบได้ในถ้ำ',
    sellPrice: 35, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  iron_ore: {
    itemId: 'iron_ore', name: 'Iron Ore', emoji: '🪨',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'แร่เหล็กดิบ ต้องถลุงก่อนนำไปใช้',
    sellPrice: 8, buyPrice: null,
    stackable: true, maxStack: 999,
  },

  steel_ingot: {
    itemId: 'steel_ingot', name: 'Steel Ingot', emoji: '🔩',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'แท่งเหล็กกล้าที่ถลุงแล้ว แข็งและทนทาน',
    sellPrice: 25, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  monster_fang: {
    itemId: 'monster_fang', name: 'Monster Fang', emoji: '🦷',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เขี้ยวของมอนสเตอร์ คม มีกลิ่นคาว',
    sellPrice: 12, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  rotten_wood: {
    itemId: 'rotten_wood', name: 'Rotten Wood', emoji: '🪵',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ไม้ผุเก่า มีกลิ่นอับ ไม่มีใครต้องการมัน',
    sellPrice: 1, buyPrice: null,
    stackable: true, maxStack: 999,
  },

  crystal_shard: {
    itemId: 'crystal_shard', name: 'Crystal Shard', emoji: '🔮',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เศษคริสตัลลึกลับ มีแสงวาวเมื่อถูกแสงจันทร์',
    sellPrice: 40, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  ancient_scroll: {
    itemId: 'ancient_scroll', name: 'Ancient Scroll', emoji: '📜',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ม้วนกระดาษโบราณ อักขระที่เขียนบนนั้นไม่มีใครอ่านออก',
    sellPrice: 80, buyPrice: null,
    stackable: true, maxStack: 20,
  },

  star_map_fragment: {
    itemId: 'star_map_fragment', name: 'Star Map Fragment', emoji: '🗺️',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เศษแผนที่ดาว ส่วนหนึ่งของบางอย่างที่ใหญ่กว่ามาก',
    sellPrice: 60, buyPrice: null,
    stackable: true, maxStack: 20,
  },

  military_ration: {
    itemId: 'military_ration', name: 'Military Ration', emoji: '🍱',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'อาหารสำเร็จรูปของทหาร อร่อยพอประมาณ แต่ทนทาน',
    sellPrice: 10, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  old_war_medal: {
    itemId: 'old_war_medal', name: 'Old War Medal', emoji: '🎖️',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เหรียญสงครามเก่า สึกกร่อนมาก แต่ยังเห็นตราประทับได้',
    sellPrice: 45, buyPrice: null,
    stackable: true, maxStack: 10,
  },

  bread: {
    itemId: 'bread', name: 'Bread', emoji: '🍞',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ขนมปังธรรมดา ยังสด กลิ่นหอม',
    sellPrice: 3, buyPrice: 10,
    stackable: true, maxStack: 99,
  },

  void_crystal: {
    itemId: 'void_crystal', name: 'Void Crystal', emoji: '🌑',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 10,
    desc: 'คริสตัลที่เก็บรวบรวมพลังงานจาก The Void มืดทะลุ ไม่สะท้อนแสง ใช้เปิด Ancient Gate',
    sellPrice: 0, buyPrice: null, // ขายไม่ได้ — rare resource
    stackable: true, maxStack: 10,
  },

  // ===== ENHANCEMENT MATERIALS =====
  black_stone_weapon: {
    itemId: 'black_stone_weapon', name: 'Black Stone (Weapon)', emoji: '🪨',
    grade: 'UNCOMMON', type: 'ENHANCE_MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'หินดำเข้มสำหรับเสริมอาวุธ หาได้จาก dungeon และ NPC shop',
    sellPrice: 20, buyPrice: 80,
    stackable: true, maxStack: 999,
  },

  black_stone_armor: {
    itemId: 'black_stone_armor', name: 'Black Stone (Armor)', emoji: '⬛',
    grade: 'UNCOMMON', type: 'ENHANCE_MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'หินดำสำหรับเสริมเกราะ หนักกว่า Black Stone ทั่วไปเล็กน้อย',
    sellPrice: 20, buyPrice: 80,
    stackable: true, maxStack: 999,
  },

  memory_fragment: {
    itemId: 'memory_fragment', name: 'Memory Fragment', emoji: '✨',
    grade: 'RARE', type: 'ENHANCE_MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เศษความทรงจำของอาวุธเก่า ใช้ซ่อม durability ที่เสียหายจากการ enhance ล้มเหลว',
    sellPrice: 50, buyPrice: 200,
    stackable: true, maxStack: 99,
  },

  guardian_stone: {
    itemId: 'guardian_stone', name: 'Guardian Stone', emoji: '🔒',
    grade: 'EPIC', type: 'ENHANCE_MATERIAL',
    classReq: [], levelReq: 15,
    desc: 'หินผู้คุ้มครอง ป้องกันไม่ให้ไอเทมแตกเมื่อ enhance ล้มเหลวครั้งหนึ่ง หายากมาก',
    sellPrice: 200, buyPrice: 800,
    stackable: true, maxStack: 20,
  },

  // ===== JUNK / DROPS =====
  goblin_ear: {
    itemId: 'goblin_ear', name: "Goblin's Ear", emoji: '👂',
    grade: 'COMMON', type: 'JUNK',
    classReq: [], levelReq: 1,
    desc: 'หูของโกบลิน บางคนรับซื้อเพื่อพิสูจน์ว่าฆ่าได้จริง',
    sellPrice: 6, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  wolf_pelt: {
    itemId: 'wolf_pelt', name: 'Wolf Pelt', emoji: '🐺',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'หนังหมาป่า ใช้ทำเครื่องหนังได้',
    sellPrice: 18, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  slime_gel: {
    itemId: 'slime_gel', name: 'Slime Gel', emoji: '🫧',
    grade: 'COMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เจลลี่เหนียวจาก Slime ใช้เป็นส่วนผสมในการทำยา',
    sellPrice: 8, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  forget_me_not: {
    itemId: 'forget_me_not', name: 'Forget-me-not', emoji: '💐',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ดอกไม้สีน้ำเงินหายาก บานเฉพาะหลังฝนตก มีนัยว่า "อย่าลืมฉัน"',
    sellPrice: 50, buyPrice: null,
    stackable: true, maxStack: 10,
  },

  // ===== CONSUMABLES (Tier 2) =====
  health_potion_large: {
    itemId: 'health_potion_large', name: 'Large Health Potion', emoji: '🍾',
    grade: 'UNCOMMON', type: 'CONSUMABLE',
    classReq: [], levelReq: 10,
    effect: { heal: 250 },
    desc: 'ยาฟื้นฟูขนาดใหญ่ สีแดงเข้มข้น หอมฉุน ฟื้นฟูได้มาก',
    sellPrice: 50, buyPrice: 150,
    stackable: true, maxStack: 99,
  },

  mp_potion_medium: {
    itemId: 'mp_potion_medium', name: 'Mana Potion', emoji: '🫙',
    grade: 'UNCOMMON', type: 'CONSUMABLE',
    classReq: [], levelReq: 5,
    effect: { restoreMP: 80 },
    desc: 'ยาฟื้นฟูพลังเวทย์ขนาดกลาง สีน้ำเงินเข้ม มีประกายวิบวับ',
    sellPrice: 25, buyPrice: 75,
    stackable: true, maxStack: 99,
  },

  poison_vial: {
    itemId: 'poison_vial', name: 'Poison Vial', emoji: '🧫',
    grade: 'UNCOMMON', type: 'CONSUMABLE',
    classReq: [],  levelReq: 15,
    effect: { applyPoison: { duration: 5, dmgPerTurn: 20 } },
    desc: 'ขวดแก้วบรรจุพิษสกัดจากสิ่งมีชีวิตในหนอง ทาบนอาวุธเพื่อวางยาศัตรู',
    sellPrice: 60, buyPrice: null,
    stackable: true, maxStack: 30,
  },

  // ===== CITY RUINS DROPS =====
  chainmail_fragment: {
    itemId: 'chainmail_fragment', name: 'Chainmail Fragment', emoji: '⛓️',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ชิ้นส่วนของเกราะลูกโซ่ที่แตกกระจาย เชื่อมกันอย่างประณีต ยังแข็งแรงอยู่',
    sellPrice: 35, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  shadow_cloth: {
    itemId: 'shadow_cloth', name: 'Shadow Cloth', emoji: '🩱',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 10,
    desc: 'ผ้าสีดำที่ดูดซับแสงอย่างสมบูรณ์ ทำจากด้ายที่ปั่นจากเงา ใช้ตัดชุดนักฆ่า',
    sellPrice: 90, buyPrice: null,
    stackable: true, maxStack: 30,
  },

  golem_core: {
    itemId: 'golem_core', name: 'Golem Core', emoji: '⚙️',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 10,
    desc: 'แกนกลางพลังงานของ Iron Golem ยังมีพลังงานสะสมอยู่ ใช้ทำเครื่องจักรหรือ Rune',
    sellPrice: 120, buyPrice: null,
    stackable: true, maxStack: 20,
  },

  shadow_dagger: {
    itemId: 'shadow_dagger', name: 'Shadow Dagger', emoji: '🌙',
    grade: 'RARE', type: 'MAIN_HAND',
    classReq: ['ROGUE', 'ASSASSIN', 'PHANTOM', 'HEXBLADE'],
    levelReq: 12,
    base: { atk: 35, spd: 12 },
    rolls: { crit_rate: [6, 14], shadow_dmg: [5, 15] },
    sockets: 1,
    desc: 'มีดสั้นที่ตีจากเงาล้วน เมื่อฟาดไม่มีเสียง ทำให้ศัตรูสับสน',
    sellPrice: 200, buyPrice: null,
  },

  // ===== CURSED MARSHLANDS DROPS =====
  bog_scale: {
    itemId: 'bog_scale', name: 'Bog Scale', emoji: '🐉',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เกล็ดสัตว์เลื้อยคลานจากหนองน้ำ เหนียวและทนทาน ต้านทานพิษได้ดี',
    sellPrice: 45, buyPrice: null,
    stackable: true, maxStack: 99,
  },

  wraith_essence: {
    itemId: 'wraith_essence', name: 'Wraith Essence', emoji: '💜',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 15,
    desc: 'แก่นสารจากวิญญาณ Wraith ของเหลวสีม่วงเข้มที่ดูดซับพลังชีวิต ใช้ทำยาและอาวุธเวทย์มืด',
    sellPrice: 100, buyPrice: null,
    stackable: true, maxStack: 30,
  },

  basilisk_scale: {
    itemId: 'basilisk_scale', name: 'Basilisk Scale', emoji: '🦎',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'เกล็ดบาซิลิสก์ แข็งราวหิน ยังมีพลังงานเปโตรฟิเคชันอ่อนๆ ใช้ทำเกราะระดับสูง',
    sellPrice: 130, buyPrice: null,
    stackable: true, maxStack: 20,
  },

  basilisk_eye: {
    itemId: 'basilisk_eye', name: "Basilisk's Eye", emoji: '👁️',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ดวงตาของ Marsh Basilisk มีพลังสะกดชั่วคราว หายากมาก ใช้ทำ Accessory ระดับ Epic',
    sellPrice: 300, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // ===== VOID FRONTIER DROPS =====
  void_essence: {
    itemId: 'void_essence', name: 'Void Essence', emoji: '🌌',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 25,
    desc: 'แก่นสารบริสุทธิ์จาก The Void พลังงานมืดที่เข้มข้นที่สุด ใช้ enhance อาวุธระดับ Legendary',
    sellPrice: 500, buyPrice: null,
    stackable: true, maxStack: 20,
  },

  soul_gem: {
    itemId: 'soul_gem', name: 'Soul Gem', emoji: '🔴',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 25,
    desc: 'อัญมณีที่กักเก็บวิญญาณของ Void creature สั่นสะเทือนเมื่อจับ ใช้ปลดล็อก Legendary recipe',
    sellPrice: 600, buyPrice: null,
    stackable: true, maxStack: 10,
  },

  chaos_shard: {
    itemId: 'chaos_shard', name: 'Chaos Shard', emoji: '🌪️',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 30,
    desc: 'เศษพลังงาน Chaos ที่แข็งตัวเป็นผลึก ไม่เสถียร ต้องจัดเก็บด้วยความระมัดระวัง',
    sellPrice: 450, buyPrice: null,
    stackable: true, maxStack: 10,
  },

  titan_core: {
    itemId: 'titan_core', name: 'Void Titan Core', emoji: '💠',
    grade: 'LEGENDARY', type: 'MATERIAL',
    classReq: [], levelReq: 30,
    desc: 'แกนกลางของ Void Titan หนักผิดปกติ แผ่พลังงานมืดอย่างต่อเนื่อง วัตถุดิบ Legendary ชั้นสูงสุด',
    sellPrice: 0, buyPrice: null, // ขายไม่ได้ — Legendary crafting only
    stackable: true, maxStack: 5,
  },

  // ===== ZONE BOSS UNIQUE DROPS (Crafting Materials) =====
  // Town Outskirts Boss: Goblin King Grak
  goblin_king_seal: {
    itemId: 'goblin_king_seal', name: "Goblin King's Seal", emoji: '👑',
    grade: 'UNCOMMON', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'ตราประทับของ Goblin King Grak — พิสูจน์ว่าคุณโค่นกษัตริย์โกบลิน ใช้ Craft อาวุธระดับ Uncommon',
    sellPrice: 50, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // Whispering Forest Boss: Elder Treant Monarch
  treant_heartwood: {
    itemId: 'treant_heartwood', name: 'Treant Heartwood', emoji: '🪵',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'แก่นไม้จากใจกลางของ Elder Treant — มีพลังชีวิตสูง ใช้ Craft Staff ระดับ Rare หรือ Armor ที่ฟื้นฟู HP',
    sellPrice: 120, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // Crystal Caves Boss: Crystal Troll Lord
  troll_crystal_heart: {
    itemId: 'troll_crystal_heart', name: 'Crystal Troll Heart', emoji: '💎',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'หัวใจคริสตัลของ Troll Lord — เปล่งแสงสั่นสะเทือน ใช้ Craft Shield หรือ Armor ที่มี DEF สูงพิเศษ',
    sellPrice: 160, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // Forgotten Ruins Boss: Iron Golem Prime
  prime_golem_core: {
    itemId: 'prime_golem_core', name: 'Prime Golem Core', emoji: '⚙️',
    grade: 'RARE', type: 'MATERIAL',
    classReq: [], levelReq: 1,
    desc: 'แกนกลางของ Iron Golem Prime — ยังเต้นเป็นจังหวะ ใช้ Craft Heavy Armor หรือ Weapon ที่มีพิเศษ',
    sellPrice: 200, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // Mirewood Marsh Boss: Hydra of the Deep
  hydra_venom_sac: {
    itemId: 'hydra_venom_sac', name: 'Hydra Venom Sac', emoji: '🐍',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 20,
    desc: 'ถุงพิษของ Hydra — เต็มไปด้วยพิษเข้มข้น ใช้ Craft Weapon ที่มี POISON effect หรือ Antidote ระดับ High',
    sellPrice: 300, buyPrice: null,
    stackable: true, maxStack: 5,
  },

  // Void Frontier Boss: Void Herald Azh'kal
  void_herald_sigil: {
    itemId: 'void_herald_sigil', name: "Void Herald's Sigil", emoji: '🌀',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 30,
    desc: "ตราของ Void Herald Azh'kal — เปล่งพลังงาน Void อย่างต่อเนื่อง ใช้ Craft อาวุธ Legendary tier",
    sellPrice: 400, buyPrice: null,
    stackable: true, maxStack: 3,
  },

  // Shadowfell Depths Boss: Shadow Archon Vael
  shadow_archon_essence: {
    itemId: 'shadow_archon_essence', name: "Shadow Archon's Essence", emoji: '🌑',
    grade: 'EPIC', type: 'MATERIAL',
    classReq: [], levelReq: 40,
    desc: 'แก่นสารเงามืดของ Shadow Archon Vael — ควบคุมยาก แต่ทรงพลังสุดๆ ใช้ Craft Shadow Gear ระดับ Legendary',
    sellPrice: 600, buyPrice: null,
    stackable: true, maxStack: 3,
  },

  // Vorath's Citadel Boss: Avatar of Vorath
  vorath_tear: {
    itemId: 'vorath_tear', name: "Tear of Vorath", emoji: '👁️',
    grade: 'LEGENDARY', type: 'MATERIAL',
    classReq: [], levelReq: 50,
    desc: 'น้ำตาของ Avatar of Vorath — วัตถุที่หายากที่สุดในโลก Ashenveil ใช้ Craft ชุด Mythic หรือ Legendary Relic',
    sellPrice: 0, buyPrice: null, // ขายไม่ได้ — Legendary/Mythic crafting เท่านั้น
    stackable: true, maxStack: 1,
  },

  void_dagger: {
    itemId: 'void_dagger', name: 'Void Dagger', emoji: '🗡️',
    grade: 'EPIC', type: 'MAIN_HAND',
    classReq: ['ROGUE', 'ASSASSIN', 'PHANTOM', 'VOIDWALKER'],
    levelReq: 28,
    base: { atk: 65, spd: 18 },
    rolls: { crit_rate: [10, 20], void_dmg: [15, 35] },
    sockets: 2,
    desc: 'มีดสั้นที่ตีจากผลึก Void ฟาดทุกครั้งทำให้เกิดรอยแยกมิติเล็กๆ บนร่างศัตรู',
    sellPrice: 800, buyPrice: null,
  },

};

// Grade ordering (สำหรับ sort)
const GRADE_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5 };

// Grade colors (สำหรับ UI)
const GRADE_COLOR = {
  COMMON:    '#9ca3af',
  UNCOMMON:  '#4ade80',
  RARE:      '#60a5fa',
  EPIC:      '#a78bfa',
  LEGENDARY: '#fb923c',
  MYTHIC:    '#f87171',
};

// Equipment slot display names
const SLOT_NAMES = {
  HEAD: 'หมวก', FACE: 'หน้ากาก', CHEST: 'เกราะตัว',
  GLOVES: 'ถุงมือ', LEGS: 'กางเกง', FEET: 'รองเท้า', CAPE: 'เสื้อคลุม',
  MAIN_HAND: 'อาวุธหลัก', OFF_HAND: 'มือซ้าย',
  RING_L: 'แหวนซ้าย', RING_R: 'แหวนขวา',
  AMULET: 'สร้อยคอ', BELT: 'เข็มขัด', RELIC: 'โบราณวัตถุ',
};

function getItem(itemId) {
  return ITEMS[itemId] || null;
}

function getItemsByType(type) {
  return Object.values(ITEMS).filter(i => i.type === type);
}

// Roll random stats when item drops
function rollItem(itemId) {
  const def = getItem(itemId);
  if (!def) return null;
  const rolled = {};
  for (const [stat, [min, max]] of Object.entries(def.rolls || {})) {
    rolled[stat] = Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return {
    itemId,
    instanceId: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    grade:       def.grade,
    enhancement: 0,
    durability:  100,
    rolls:       rolled,
    sockets:     def.sockets || 0,
    gem_slots:   [],
    equipped:    null,
    obtainedAt:  Date.now(),
  };
}

module.exports = { ITEMS, GRADE_ORDER, GRADE_COLOR, SLOT_NAMES, getItem, getItemsByType, rollItem };
