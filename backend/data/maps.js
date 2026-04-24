// data/maps.js — Zone definitions, explore events, atmosphere for Ashenveil

const ZONES = {

  town_square: {
    zoneId: 'town_square',
    name: 'Town Square',
    nameTH: 'จัตุรัสกลางเมือง',
    shard: 'starter',
    level: [1, 99],
    atmosphere: [
      'ตลาดคึกคัก เสียงดาบเหล็กดังเป็นจังหวะจากร้านช่างตีเหล็ก',
      'เด็กๆ วิ่งเล่นรอบน้ำพุกลางเมือง น้ำในอ่างใสจนมองเห็นก้น',
      'กลิ่นขนมปังอบร้อนลอยมาจากร้านเบเกอรี่ข้างๆ',
      'พ่อค้าแม่ขายกำลังเรียกลูกค้า เสียงต่อรองราคาดังไปทั่ว',
    ],
    canFight: false,
    canExplore: false,
    npcs: ['mira', 'erik', 'yena'],
    connections: ['town_outskirts', 'forest_path'],
    icon: '🏘️',
  },

  town_outskirts: {
    zoneId: 'town_outskirts',
    name: 'Town Outskirts',
    nameTH: 'ชานเมือง',
    shard: 'starter',
    level: [1, 5],
    atmosphere: [
      'ทุ่งหญ้าโล่งกว้าง ลมเย็นพัดผ่าน ไม่มีต้นไม้บังแสง',
      'รอยเท้าสัตว์หลายชนิดบนดินชื้น บางอันใหญ่ผิดปกติ',
      'กระท่อมร้างอยู่ไกลออกไป หน้าต่างแตก ประตูเปิดค้าง',
      'ดอกไม้ป่าสีชมพูขึ้นรกร้างทั่วไป หอมอ่อนๆ',
      'ก้อนหินก้อนหนึ่งมีรอยขีดเขียนประหลาด... อ่านไม่ออก',
    ],
    canFight: true,
    canExplore: true,
    monsters: ['stray_dog', 'goblin_scout'],
    icon: '🌾',
    events: [
      { id: 'find_flowers', weight: 20, result: { type: 'item', items: ['wild_flower'], gold: 0, msg: 'คุณพบดอกไม้ป่าสีชมพูขึ้นอยู่ริมทาง...' } },
      { id: 'find_gold', weight: 15, result: { type: 'gold', gold: [3, 12], msg: 'มีกระเป๋าหนังเก่าอยู่ใต้พุ่มไม้ ภายในมีเหรียญเล็กน้อย' } },
      { id: 'find_ore', weight: 10, result: { type: 'item', items: ['iron_ore'], gold: 0, msg: 'พบก้อนแร่โผล่จากดิน ดูมีค่าพอสมควร' } },
      { id: 'encounter', weight: 35, result: { type: 'encounter', msg: 'บางอย่างเคลื่อนไหวในพุ่มไม้...' } },
      { id: 'nothing_1', weight: 10, result: { type: 'nothing', msg: 'เดินวนดูรอบๆ ไม่พบอะไรน่าสนใจ ลมพัดเย็นสบาย' } },
      { id: 'nothing_2', weight: 10, result: { type: 'nothing', msg: 'สงบ ใบไม้ร่วงช้าๆ เสียงนกร้องไกลๆ' } },
    ],
  },

  forest_path: {
    zoneId: 'forest_path',
    name: 'Forest Path',
    nameTH: 'ทางป่า',
    shard: 'starter',
    level: [3, 10],
    atmosphere: [
      'ป่าทึบ แสงแดดส่องทะลุมาเป็นลำบางๆ พื้นดินปกคลุมด้วยใบไม้เก่า',
      'เสียงกิ่งไม้หักดังๆ แต่ไม่มีอะไรให้เห็น',
      'รังผึ้งขนาดใหญ่แขวนอยู่บนกิ่งสูง ผึ้งบินวนไม่หยุด',
      'ต้นไม้ต้นหนึ่งมีรอยเกือกตะปูลึกมาก เหมือนถูกอะไรบางอย่างกรงเล็บ',
      'น้ำตกเล็กๆ ซ่อนอยู่หลังพุ่มไม้ ข้างๆ มีรอยเท้าสัตว์แปลกๆ',
      'กลิ่นเลือดอ่อนๆ ลอยมาตามลม... มาจากทิศไหนไม่แน่ใจ',
    ],
    canFight: true,
    canExplore: true,
    monsters: ['forest_wolf', 'goblin_warrior', 'giant_spider', 'ancient_treant'],
    icon: '🌲',
    events: [
      { id: 'find_herb', weight: 15, result: { type: 'item', items: ['wild_flower', 'forget_me_not'], gold: 0, msg: 'ในซอกหินพบดอกไม้หายาก กลีบดูแปลกกว่าดอกทั่วไป' } },
      { id: 'find_honey', weight: 8, result: { type: 'item', items: ['honey_jar'], gold: 0, msg: 'รังผึ้งร้างอยู่บนกิ่งต่ำ ยังมีน้ำผึ้งเหลืออยู่บ้าง' } },
      { id: 'find_gem', weight: 5, result: { type: 'item', items: ['blue_gem_fragment'], gold: 0, msg: 'บางอย่างแวววาวอยู่ใต้รากไม้... เป็นเศษอัญมณี' } },
      { id: 'find_gold', weight: 12, result: { type: 'gold', gold: [8, 25], msg: 'พบกระสอบเล็กหล่นอยู่ เหมือนใครทำหายไว้' } },
      { id: 'find_potion', weight: 10, result: { type: 'item', items: ['health_potion_small'], gold: 0, msg: 'ขวดยาเก่าวางอยู่บนก้อนหิน ยังไม่ได้เปิด' } },
      { id: 'encounter', weight: 38, result: { type: 'encounter', msg: 'เสียงก้าวเท้าหนักๆ เข้ามาใกล้...' } },
      { id: 'nothing_1', weight: 7, result: { type: 'nothing', msg: 'ป่าเงียบผิดปกติ แม้แต่นกก็ไม่ร้อง' } },
      { id: 'nothing_2', weight: 5, result: { type: 'nothing', msg: 'เดินไปเรื่อยๆ ต้นไม้ทุกต้นดูเหมือนกันหมด' } },
    ],
  },

  dark_cave: {
    zoneId: 'dark_cave',
    name: 'Dark Cave',
    nameTH: 'ถ้ำมืด',
    shard: 'starter',
    level: [5, 15],
    atmosphere: [
      'มืดสนิท เสียงหยดน้ำดังเป็นจังหวะ ไม่รู้ว่ามาจากไหน',
      'ผนังถ้ำมีผลึกแร่เล็กๆ เปล่งแสงน้ำเงินอ่อนๆ',
      'มีกระดูกสัตว์กองอยู่มุมหนึ่ง ยังสด... เพิ่งกินเมื่อกี้นี้เอง',
      'รู้สึกว่ามีสายตาจับอยู่ แต่มองไปรอบๆ ไม่เห็นอะไร',
      'อากาศเย็นฉ่ำ เหมือนลมพัดมาจากก้นบึ้งที่ลึกกว่า',
    ],
    canFight: true,
    canExplore: true,
    monsters: ['cave_bat', 'cave_troll', 'void_wisp'],
    icon: '🕳️',
    events: [
      { id: 'find_crystal', weight: 15, result: { type: 'item', items: ['crystal_shard'], gold: 0, msg: 'ในซอกหิน พบเศษคริสตัลแวววาวแม้ในความมืด' } },
      { id: 'find_gem', weight: 10, result: { type: 'item', items: ['blue_gem_fragment'], gold: 0, msg: 'ผนังถ้ำมีก้อนแร่โผล่ออกมา ใช้มือขุดออกได้' } },
      { id: 'find_ore', weight: 15, result: { type: 'item', items: ['iron_ore', 'iron_ore'], gold: 0, msg: 'แร่เหล็กจำนวนมากฝังอยู่ในผนัง' } },
      { id: 'find_scroll', weight: 5, result: { type: 'item', items: ['ancient_scroll'], gold: 0, msg: 'บนแท่นหินมีม้วนกระดาษเก่า... ฝุ่นหนามาก' } },
      { id: 'find_void_crystal', weight: 3, result: { type: 'item', items: ['void_crystal'], gold: 0, msg: 'มุมมืดสุดของถ้ำมีก้อนสีดำทะมึน ไม่สะท้อนแสง...' } },
      { id: 'find_gold', weight: 12, result: { type: 'gold', gold: [15, 40], msg: 'พบซากเป้ของนักผจญภัยที่ไม่โชคดี ยังมีทองเหลืออยู่บ้าง' } },
      { id: 'encounter', weight: 30, result: { type: 'encounter', msg: 'ได้ยินเสียงหายใจในความมืด...' } },
      { id: 'nothing_1', weight: 5, result: { type: 'nothing', msg: 'ทางตันอีกแล้ว ผนังหิน ไม่มีอะไรต่างออกไป' } },
      { id: 'nothing_2', weight: 5, result: { type: 'nothing', msg: 'ค้างคาวฝูงใหญ่บินออกจากรอยแยก แต่ไม่โจมตี' } },
    ],
  },

};

// NPC Shop inventory by zone
const SHOP_INVENTORY = {
  starter: [
    { itemId: 'health_potion_small', stock: 99 },
    { itemId: 'health_potion_medium', stock: 50 },
    { itemId: 'mp_potion_small', stock: 99 },
    { itemId: 'antidote', stock: 50 },
    { itemId: 'bread', stock: 99 },
    { itemId: 'black_stone_weapon', stock: 30 },
    { itemId: 'black_stone_armor', stock: 30 },
    { itemId: 'leather_cap', stock: 5 },
    { itemId: 'leather_chest', stock: 5 },
    { itemId: 'leather_gloves', stock: 5 },
    { itemId: 'leather_legs', stock: 5 },
    { itemId: 'leather_boots', stock: 5 },
    { itemId: 'wooden_shield', stock: 5 },
  ],
};

function getZone(zoneId) {
  return ZONES[zoneId] || null;
}

function getExploreEvent(zoneId) {
  const zone = ZONES[zoneId];
  if (!zone || !zone.events) return null;

  const totalWeight = zone.events.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of zone.events) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return zone.events[zone.events.length - 1];
}

module.exports = { ZONES, SHOP_INVENTORY, getZone, getExploreEvent };
