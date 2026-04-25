// data/side_quests.js — Side quest definitions for Ashenveil

// Side quests are player-accepted (not auto-start)
// They share the same step types as story quests:
// talk / kill / explore / travel / dungeon_enter / dungeon_clear

const SIDE_QUESTS = [

  // ══════════════════════════════════════════
  //  CATEGORY: TOWN — ชีวิตในเมือง
  // ══════════════════════════════════════════

  {
    id:        'SSQ_001',
    category:  'town',
    name:      'สูตรขนมปังหาย',
    desc:      'Pita นักทำขนมปังแห่ง Town Square บอกว่าสูตรลับของเธอถูกซ่อนไว้ในถ้ำโดยใครบางคน ช่วยกลับไปหาให้หน่อยได้ไหม?',
    giverNpc:  'pita',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'go_cave',
        type:  'travel',
        zone:  'dark_cave',
        count: 1,
        hint:  'เดินทางไปถ้ำมืดเพื่อค้นหาสูตรขนมปัง',
      },
      {
        id:    'search_cave',
        type:  'explore',
        zone:  'dark_cave',
        count: 3,
        hint:  'ค้นหาในถ้ำมืด 3 ครั้ง — ต้องอยู่ที่ใดที่หนึ่ง',
      },
      {
        id:    'return_pita',
        type:  'talk',
        target: 'pita',
        count: 1,
        hint:  'นำสูตรกลับมาให้ Pita',
      },
    ],
    rewards: { xp: 120, gold: 180, items: ['health_potion'] },
    completionText: 'Pita โล่งอกมาก "ขอบคุณมากๆ! นี่คือสูตรที่ยายสอนมา ต่อไปนี้ขนมปังฉันจะอร่อยขึ้นแน่เลย!" เธอกดแอปเปิ้ลเค้กชิ้นเล็กๆ ให้คุณ',
  },

  {
    id:        'SSQ_002',
    category:  'town',
    name:      'หนี้เลือดของทหาร',
    desc:      'Dakan ทหารผ่านศึกแห่ง Town Square มีหนี้บุญคุณกับคนที่ช่วยเขาไว้ครั้งหนึ่ง ช่วยไปส่งของขวัญที่เขาเตรียมไว้ให้กับ Elder Maren ที',
    giverNpc:  'dakan',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'kill_for_gift',
        type:  'kill',
        monsterId: null,
        zone:  null,
        count: 5,
        hint:  'Dakan ขอให้คุณพิสูจน์ฝีมือก่อน — สังหารมอนสเตอร์ 5 ตัว',
      },
      {
        id:    'talk_dakan',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'กลับมารายงาน Dakan ว่าพร้อมแล้ว',
      },
      {
        id:    'deliver_gift',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'ส่งของขวัญจาก Dakan ให้ Elder Maren',
      },
    ],
    rewards: { xp: 150, gold: 220 },
    completionText: 'Elder Maren รับของขวัญด้วยรอยยิ้มอบอุ่น "Dakan... คนดีคนนั้น" เขาหยุดชั่วครู่แล้วพยักหน้า "ขอบคุณที่เป็นสื่อกลาง"',
  },

  {
    id:        'SSQ_003',
    category:  'town',
    name:      'ของหายในป่า',
    desc:      'Lyra เด็กสาวใน Town Square ทำสร้อยคอของแม่หายในทางป่า เธอกลัวเกินกว่าจะเข้าไปหาเอง ช่วยเธอตามหาหน่อยได้ไหม?',
    giverNpc:  'lyra',
    prereqs:   ['SSQ_001'],
    minLevel:  2,
    steps: [
      {
        id:    'travel_forest_lyra',
        type:  'travel',
        zone:  'forest_path',
        count: 1,
        hint:  'เดินทางไปทางป่าเพื่อหาสร้อยของ Lyra',
      },
      {
        id:    'search_forest',
        type:  'explore',
        zone:  'forest_path',
        count: 4,
        hint:  'ค้นหาในทางป่า 4 ครั้ง — สร้อยต้องตกอยู่ที่ไหนสักแห่ง',
      },
      {
        id:    'return_lyra',
        type:  'talk',
        target: 'lyra',
        count: 1,
        hint:  'นำสร้อยกลับมาให้ Lyra',
      },
    ],
    rewards: { xp: 180, gold: 150, items: ['mana_potion'] },
    completionText: 'Lyra กอดสร้อยไว้แน่น ตาเป็นประกาย "เจอแล้ว! แม่จะดีใจมากเลย" เธอสะอึกเบาๆ "ขอบคุณนะคะ จริงๆ"',
  },

  // ══════════════════════════════════════════
  //  CATEGORY: BOUNTY — ล่ารางวัล
  // ══════════════════════════════════════════

  {
    id:        'SSQ_101',
    category:  'bounty',
    name:      'ฝูงหมาป่าบ้า',
    desc:      'Wolf Pack ในทางป่าเริ่มรุกรานชาวไร่ที่อยู่ชานเมือง มีหัวหน้าฝูงชื่อ Shadowfang อยู่ด้วย กำจัดพวกมันก่อนที่จะมีคนบาดเจ็บ',
    giverNpc:  'dakan',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'travel_wolf',
        type:  'travel',
        zone:  'forest_path',
        count: 1,
        hint:  'ไปที่ทางป่าซึ่งฝูงหมาป่าอาศัยอยู่',
      },
      {
        id:    'kill_wolves',
        type:  'kill',
        monsterId: 'wolf',
        zone:  'forest_path',
        count: 8,
        hint:  'สังหารหมาป่าในทางป่า 8 ตัว',
      },
      {
        id:    'report_dakan',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'รายงาน Dakan ว่ากำจัดหมาป่าเสร็จแล้ว',
      },
    ],
    rewards: { xp: 200, gold: 300, items: ['antidote'] },
    completionText: 'Dakan พยักหน้าอย่างพอใจ "ดีมาก ชาวไร่จะได้หายใจหายคอได้บ้าง รางวัลนี้คุณสมควรได้รับ"',
  },

  {
    id:        'SSQ_102',
    category:  'bounty',
    name:      'นักสะสมกระดูก',
    desc:      'มีรายงานว่า Undead เร่ร่อนรวมตัวกันในถ้ำมืด อาจเป็นเพราะพลัง Void จาก The Resonance กำจัดพวกมันก่อนที่จะรวมกลุ่มใหญ่',
    giverNpc:  'elder_maren',
    prereqs:   [],
    minLevel:  2,
    steps: [
      {
        id:    'travel_cave_bounty',
        type:  'travel',
        zone:  'dark_cave',
        count: 1,
        hint:  'เดินทางไปถ้ำมืดที่ Undead รวมตัวอยู่',
      },
      {
        id:    'kill_undead',
        type:  'kill',
        monsterId: 'skeleton',
        zone:  'dark_cave',
        count: 10,
        hint:  'สังหาร Skeleton ในถ้ำมืด 10 ตัว',
      },
      {
        id:    'report_maren_bounty',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren ว่าเสร็จสิ้น',
      },
    ],
    rewards: { xp: 250, gold: 350, items: ['health_potion', 'mana_potion'] },
    completionText: 'Elder Maren พยักหน้าหนักใจ "ดี แต่นี่เป็นแค่อาการ ถ้าเราไม่หยุด Void ที่ต้นทาง Undead จะยิ่งมากขึ้น"',
  },

  {
    id:        'SSQ_103',
    category:  'bounty',
    name:      'ปนเปื้อน Void',
    desc:      'ส่วนหนึ่งของ Darkroot Hollow ปนเปื้อน Void อย่างหนัก ต้องเข้าไปเคลียร์และทำลาย Core ที่แพร่เชื้อ งานนี้ต้องการนักผจญภัยที่แข็งแกร่ง',
    giverNpc:  'elder_maren',
    prereqs:   ['SSQ_102'],
    minLevel:  3,
    steps: [
      {
        id:    'enter_darkroot_sq',
        type:  'dungeon_enter',
        dungeonId: 'darkroot_hollow',
        count: 1,
        hint:  'เข้าสู่ Darkroot Hollow เพื่อกำจัดการปนเปื้อน',
      },
      {
        id:    'clear_darkroot_sq',
        type:  'dungeon_clear',
        dungeonId: 'darkroot_hollow',
        count: 1,
        hint:  'เคลียร์ Darkroot Hollow',
      },
      {
        id:    'report_void_clear',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren เรื่องผลลัพธ์',
      },
    ],
    rewards: { xp: 400, gold: 500, items: ['void_crystal'] },
    completionText: 'Elder Maren จ้องดู Void Crystal ด้วยความตื่นเต้นปนกังวล "นี่คือเศษชิ้นส่วนของ Void ที่แท้จริง เก็บไว้ให้ดี มันอาจมีประโยชน์ในอนาคต"',
  },

  // ══════════════════════════════════════════
  //  CATEGORY: EXPLORATION — นักสำรวจ
  // ══════════════════════════════════════════

  {
    id:        'SSQ_201',
    category:  'exploration',
    name:      'แผนที่ที่ไม่สมบูรณ์',
    desc:      'Elder Maren มีแผนที่เก่าของ Ashenveil Shard แต่ขาดข้อมูลพื้นที่หลายจุด เขาขอให้คุณไปสำรวจทุกโซนเพื่ออัปเดตแผนที่',
    giverNpc:  'elder_maren',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'visit_outskirts',
        type:  'travel',
        zone:  'town_outskirts',
        count: 1,
        hint:  'ไปที่ Town Outskirts',
      },
      {
        id:    'visit_forest',
        type:  'travel',
        zone:  'forest_path',
        count: 1,
        hint:  'ไปที่ Forest Path',
      },
      {
        id:    'visit_cave',
        type:  'travel',
        zone:  'dark_cave',
        count: 1,
        hint:  'ไปที่ Dark Cave',
      },
      {
        id:    'report_map',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren ว่าสำรวจครบแล้ว',
      },
    ],
    rewards: { xp: 160, gold: 200, items: ['ancient_scroll'] },
    completionText: 'Elder Maren บันทึกข้อมูลลงในแผนที่อย่างระมัดระวัง "ดีมาก แผนที่นี้จะช่วยเราวางแผนได้ดีขึ้นมาก ขอบคุณที่ช่วย"',
  },

  {
    id:        'SSQ_202',
    category:  'exploration',
    name:      'คลังซ่อนเร้น',
    desc:      'ตำนานเล่าว่า Archon สภาเก่าซ่อนทรัพย์สมบัติไว้ในถ้ำลึก ก่อน The Sundering มันอาจยังอยู่ที่นั่น ลองค้นดูถ้ามีเวลา',
    giverNpc:  'pita',
    prereqs:   ['SSQ_201'],
    minLevel:  2,
    steps: [
      {
        id:    'deep_cave_travel',
        type:  'travel',
        zone:  'dark_cave',
        count: 1,
        hint:  'เดินทางไปถ้ำมืด',
      },
      {
        id:    'deep_cave_search',
        type:  'explore',
        zone:  'dark_cave',
        count: 6,
        hint:  'ค้นหาอย่างละเอียดในถ้ำมืด 6 ครั้ง',
      },
      {
        id:    'report_pita',
        type:  'talk',
        target: 'pita',
        count: 1,
        hint:  'กลับมารายงาน Pita',
      },
    ],
    rewards: { xp: 220, gold: 400, items: ['health_potion', 'antidote'] },
    completionText: 'Pita ตาเป็นประกาย "เจอไหม? โอ้โห แม้ไม่เจอทั้งหมดก็ยังดี ตำนานนี้... อาจจริงก็ได้!"',
  },

];

function getSideQuest(id) {
  return SIDE_QUESTS.find(q => q.id === id) || null;
}

function getSideQuestsByCategory(category) {
  return SIDE_QUESTS.filter(q => q.category === category);
}

function getAvailableSideQuests(completedIds, activeIds, charLevel) {
  return SIDE_QUESTS.filter(q => {
    if (completedIds.includes(q.id)) return false;
    if (activeIds.includes(q.id)) return false;
    if ((q.minLevel || 1) > charLevel) return false;
    if (q.prereqs.some(p => !completedIds.includes(p))) return false;
    return true;
  });
}

module.exports = { SIDE_QUESTS, getSideQuest, getSideQuestsByCategory, getAvailableSideQuests };
