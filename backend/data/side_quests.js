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

  // ══════════════════════════════════════════
  //  CATEGORY: TOWN — เพิ่มเติม
  // ══════════════════════════════════════════

  {
    id:        'SSQ_004',
    category:  'town',
    name:      'ซ่อมแซมบ้านเรือน',
    desc:      'The Resonance ทำให้บ้านเรือนหลายหลังพังเสียหาย Pita และชาวบ้านช่วยกันซ่อมแต่ขาดวัสดุ ช่วยหามาจากป่าได้ไหม?',
    giverNpc:  'pita',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'gather_wood',
        type:  'explore',
        zone:  'forest_path',
        count: 3,
        hint:  'หาวัสดุในทางป่า 3 ครั้ง — ไม้และหินจำนวนมาก',
      },
      {
        id:    'gather_stone',
        type:  'explore',
        zone:  'dark_cave',
        count: 2,
        hint:  'หาหินจากถ้ำอีก 2 ครั้ง',
      },
      {
        id:    'return_pita_repair',
        type:  'talk',
        target: 'pita',
        count: 1,
        hint:  'ส่งวัสดุให้ Pita',
      },
    ],
    rewards: { xp: 100, gold: 150, items: ['health_potion'] },
    completionText: 'Pita รับวัสดุด้วยรอยยิ้มอิ่มเอม "ชาวบ้านจะได้อยู่อาศัยได้แล้ว ขอบคุณมาก คุณใจดีจริงๆ"',
  },

  {
    id:        'SSQ_005',
    category:  'town',
    name:      'บันทึกที่หายไป',
    desc:      'Elder Maren ทำบันทึกการวิจัยเก่าหายระหว่าง The Resonance เขาเชื่อว่าตกอยู่แถวชานเมืองตอนที่วิ่งหนีออกมา',
    giverNpc:  'elder_maren',
    prereqs:   [],
    minLevel:  1,
    steps: [
      {
        id:    'search_notes',
        type:  'explore',
        zone:  'town_outskirts',
        count: 4,
        hint:  'ค้นหาบันทึกในชานเมือง 4 ครั้ง',
      },
      {
        id:    'return_notes',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'นำบันทึกกลับมาให้ Elder Maren',
      },
    ],
    rewards: { xp: 80, gold: 120 },
    completionText: '"เจอแล้ว! นี่คือ..." Elder Maren เปิดบันทึกพลางพึมพำ "บันทึก The Resonance ครั้งก่อนเมื่อ 200 ปีก่อน... มันเคยเกิดขึ้นมาแล้ว"',
  },

  // ══════════════════════════════════════════
  //  CATEGORY: BOUNTY — เพิ่มเติม (ระดับสูง)
  // ══════════════════════════════════════════

  {
    id:        'SSQ_104',
    category:  'bounty',
    name:      'ล่า Golem ในซากเมือง',
    desc:      'Golem ยามรักษาการณ์โบราณในซากเมืองเริ่มโจมตีนักสำรวจที่เข้าไป พวกมันถูก Void ควบคุมและสั่งการผิดพลาด ต้องกำจัดก่อนจะมีคนเสียชีวิต',
    giverNpc:  'dakan',
    prereqs:   ['SSQ_101'],
    minLevel:  10,
    steps: [
      {
        id:    'travel_ruins_bounty',
        type:  'travel',
        zone:  'city_ruins',
        count: 1,
        hint:  'เดินทางไปซากเมือง',
      },
      {
        id:    'kill_golem',
        type:  'kill',
        monsterId: null,
        zone:  'city_ruins',
        count: 15,
        hint:  'กำจัด Golem และสิ่งมีชีวิต Void ในซากเมือง 15 ตัว',
      },
      {
        id:    'report_dakan_golem',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'รายงาน Dakan ว่าเสร็จสิ้น',
      },
    ],
    rewards: { xp: 800, gold: 1000, items: ['void_crystal', 'health_potion'] },
    completionText: 'Dakan พยักหน้าหนัก "เขาไม่ได้ถูกทำลายตาม เขาแค่... สับสน น่าเศร้า แต่ต้องทำ ขอบใจ"',
  },

  {
    id:        'SSQ_105',
    category:  'bounty',
    name:      'พิษจากหนองสาปแช่ง',
    desc:      'สัตว์ประหลาดจากหนองสาปแช่งเริ่มข้ามมาโจมตีพื้นที่ใกล้เคียง พิษของพวกมันทำให้ชาวบ้านล้มป่วย ต้องจัดการแหล่งที่มาก่อน',
    giverNpc:  'elder_maren',
    prereqs:   ['SSQ_102'],
    minLevel:  18,
    steps: [
      {
        id:    'travel_marsh_bounty',
        type:  'travel',
        zone:  'cursed_marshlands',
        count: 1,
        hint:  'เดินทางไปหนองสาปแช่ง',
      },
      {
        id:    'kill_marsh_creatures',
        type:  'kill',
        monsterId: null,
        zone:  'cursed_marshlands',
        count: 20,
        hint:  'สังหารสัตว์ประหลาดในหนอง 20 ตัว — ทำลายแหล่งสร้างพิษ',
      },
      {
        id:    'report_marsh_clear',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren ว่าเคลียร์แล้ว',
      },
    ],
    rewards: { xp: 2000, gold: 2500, items: ['void_crystal', 'void_crystal', 'antidote'] },
    completionText: 'Elder Maren โล่งใจ "ชาวบ้านจะฟื้นตัวได้แล้ว The Resonance ยังคงทำให้สัตว์ป่าผิดปกติอยู่ คงต้องระวังกันต่อไป"',
  },

  {
    id:        'SSQ_106',
    category:  'bounty',
    name:      'Void Entity ระดับสูง',
    desc:      'สิ่งมีชีวิตที่มาจาก Void โดยตรงปรากฏตัวใน Void Frontier พวกมันไม่ใช่สัตว์ธรรมดา — เป็นชิ้นส่วนของ The Void เอง',
    giverNpc:  'elder_maren',
    prereqs:   ['SSQ_105'],
    minLevel:  28,
    steps: [
      {
        id:    'travel_void_bounty',
        type:  'travel',
        zone:  'void_frontier',
        count: 1,
        hint:  'เดินทางไป Void Frontier',
      },
      {
        id:    'kill_void_entity',
        type:  'kill',
        monsterId: null,
        zone:  'void_frontier',
        count: 25,
        hint:  'ทำลาย Void Entity 25 ชิ้น — ระวัง พวกมันไม่มีรูปร่างชัดเจน',
      },
      {
        id:    'report_void_entity',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren ผลลัพธ์',
      },
    ],
    rewards: { xp: 5000, gold: 6000, items: ['void_crystal', 'void_crystal', 'void_crystal', 'ancient_scroll'] },
    completionText: 'Elder Maren จดบันทึกอย่างรีบเร่ง "สิ่งที่คุณพบ... มันคือ Pure Void Fragment ถ้า Vorath รวบรวมมันได้... เราต้องรีบ"',
  },

  // ══════════════════════════════════════════
  //  CATEGORY: EXPLORATION — เพิ่มเติม
  // ══════════════════════════════════════════

  {
    id:        'SSQ_203',
    category:  'exploration',
    name:      'สำรวจ Void Frontier',
    desc:      'ยังไม่มีใครทำแผนที่ Void Frontier อย่างละเอียด ทั้งที่มันอาจเป็นสมรภูมิสำคัญในอนาคต Elder Maren ต้องการข้อมูลนี้',
    giverNpc:  'elder_maren',
    prereqs:   ['SSQ_201'],
    minLevel:  28,
    steps: [
      {
        id:    'travel_void_map',
        type:  'travel',
        zone:  'void_frontier',
        count: 1,
        hint:  'เดินทางไป Void Frontier',
      },
      {
        id:    'map_void',
        type:  'explore',
        zone:  'void_frontier',
        count: 8,
        hint:  'สำรวจ Void Frontier อย่างละเอียด 8 ครั้ง',
      },
      {
        id:    'kill_for_samples',
        type:  'kill',
        monsterId: null,
        zone:  'void_frontier',
        count: 10,
        hint:  'เก็บตัวอย่างจากสิ่งมีชีวิต Void 10 ตัว',
      },
      {
        id:    'report_void_map',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'ส่งข้อมูลให้ Elder Maren',
      },
    ],
    rewards: { xp: 3500, gold: 4000, items: ['void_crystal', 'ancient_scroll', 'ancient_scroll'] },
    completionText: 'Elder Maren กางแผนที่ที่ได้ข้อมูลใหม่ "สิ่งที่คุณพบมันน่ากลัว... แต่มีประโยชน์มาก ขอบใจ"',
  },

  {
    id:        'SSQ_204',
    category:  'exploration',
    name:      'สายลับในเงา',
    desc:      'Dakan ต้องการสายงานข่าวกรองใน Shadowfell Depths ก่อนที่จะส่งใครเข้าไปจริงๆ ต้องการคนที่กล้าไปลาดตระเวณก่อน',
    giverNpc:  'dakan',
    prereqs:   ['SSQ_203'],
    minLevel:  38,
    steps: [
      {
        id:    'travel_shadow_scout',
        type:  'travel',
        zone:  'shadowfell_depths',
        count: 1,
        hint:  'ลงไปลาดตระเวณ Shadowfell Depths',
      },
      {
        id:    'scout_shadow',
        type:  'explore',
        zone:  'shadowfell_depths',
        count: 6,
        hint:  'สำรวจ Shadowfell อย่างระมัดระวัง 6 ครั้ง',
      },
      {
        id:    'test_strength_shadow',
        type:  'kill',
        monsterId: null,
        zone:  'shadowfell_depths',
        count: 15,
        hint:  'ทดสอบความแข็งแกร่งของศัตรู — สังหาร 15 ตัว',
      },
      {
        id:    'report_dakan_scout',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'รายงาน Dakan ข้อมูลที่ได้',
      },
    ],
    rewards: { xp: 8000, gold: 9000, items: ['void_crystal', 'void_crystal', 'ancient_scroll', 'health_potion'] },
    completionText: 'Dakan จ้องแผนที่ที่คุณวาดมาอย่างจริงจัง "ดีมาก ด้วยข้อมูลนี้... เราพอมีโอกาสเอาชนะได้"',
  },

  // ══════════════════════════════════════════
  //  CATEGORY: PERSONAL — เรื่องส่วนตัว NPC
  //  (ต้องการ minAffection — ต้องสร้างความสัมพันธ์ก่อน)
  // ══════════════════════════════════════════

  {
    id:        'SSQ_301',
    category:  'personal',
    name:      'บาดแผลของนักรบเก่า',
    desc:      'Dakan ไม่เคยเล่าว่าทำไมถึงออกจากกองทัพมาอยู่เมืองเล็กๆ แบบนี้ หลังจากที่คุณได้รับความไว้วางใจจากเขา เขาเริ่มบอกเล่าความจริง',
    giverNpc:  'dakan',
    prereqs:   [],
    minLevel:  3,
    minAffection: { npcId: 'dakan', amount: 40 },
    steps: [
      {
        id:    'listen_dakan',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'นั่งฟัง Dakan เล่าเรื่องราวอดีตของเขา',
      },
      {
        id:    'avenge_dakan',
        type:  'kill',
        monsterId: null,
        zone:  'city_ruins',
        count: 10,
        hint:  'ไปที่ซากเมืองซึ่ง Dakan เคยสูญเสียเพื่อน — กำจัดสิ่งที่ยังอยู่ 10 ตัว',
      },
      {
        id:    'return_dakan',
        type:  'talk',
        target: 'dakan',
        count: 1,
        hint:  'กลับมาบอก Dakan ว่าคุณไปให้แล้ว',
      },
    ],
    rewards: { xp: 400, gold: 300, items: ['ancient_scroll'] },
    completionText: 'Dakan เงียบนานมาก แล้วถามเบาๆ ว่า "คุณจะไม่ตัดสินข้าไหม?" เขาหัวเราะอย่างเขินๆ "พวกเราน้อยคนนักที่จะทำแบบนี้ให้กัน ขอบใจ"',
  },

  {
    id:        'SSQ_302',
    category:  'personal',
    name:      'เปลวไฟในใจ Mira',
    desc:      'Mira มีความฝันที่ซ่อนเอาไว้ เธออยากสร้างอาวุธชิ้นหนึ่งเพื่ออุทิศให้พ่อที่จากไป แต่ขาดวัสดุหายาก ช่วยเธอสักครั้งหนึ่งได้ไหม',
    giverNpc:  'mira',
    prereqs:   [],
    minLevel:  5,
    minAffection: { npcId: 'mira', amount: 40 },
    steps: [
      {
        id:    'talk_mira_dream',
        type:  'talk',
        target: 'mira',
        count: 1,
        hint:  'ฟัง Mira เล่าถึงความฝันและพ่อของเธอ',
      },
      {
        id:    'collect_for_mira',
        type:  'kill',
        monsterId: null,
        zone:  'dark_cave',
        count: 8,
        hint:  'ล่าสัตว์ประหลาดในถ้ำมืด 8 ตัว — วัสดุที่ต้องการตกอยู่กับพวกมัน',
      },
      {
        id:    'explore_cave_mira',
        type:  'explore',
        zone:  'dark_cave',
        count: 3,
        hint:  'ค้นหาแร่หายากในถ้ำมืดอีก 3 ครั้ง',
      },
      {
        id:    'return_mira_dream',
        type:  'talk',
        target: 'mira',
        count: 1,
        hint:  'นำของที่ได้มากลับไปให้ Mira',
      },
    ],
    rewards: { xp: 500, gold: 400 },
    completionText: 'Mira รับวัสดุไปด้วยมือสั่นเล็กน้อย "ข้าจะทำมันให้เสร็จคืนนี้" เธอหันมาพร้อมรอยยิ้มที่แทบไม่เคยเห็น "ถ้าคุณต้องการอาวุธที่ดีที่สุดในชีวิต... มาหาข้า ข้าจะทำให้"',
  },

  {
    id:        'SSQ_303',
    category:  'personal',
    name:      'ความลับของ Pita',
    desc:      'ร้านขนมปังของ Pita ไม่ได้เปิดขายเพื่อเงินเพียงอย่างเดียว มีเรื่องที่เธอไม่เคยบอกใครว่าทำไมถึงยังอยู่ที่เมืองนี้ทั้งที่สามารถไปได้',
    giverNpc:  'pita',
    prereqs:   ['SSQ_001'],
    minLevel:  2,
    minAffection: { npcId: 'pita', amount: 60 },
    steps: [
      {
        id:    'talk_pita_secret',
        type:  'talk',
        target: 'pita',
        count: 1,
        hint:  'ถาม Pita เกี่ยวกับเรื่องที่เธอไม่เคยเล่า',
      },
      {
        id:    'deliver_pita_letter',
        type:  'travel',
        zone:  'forest_path',
        count: 1,
        hint:  'Pita ขอให้คุณไปที่ทางป่า — มีบางอย่างที่เธอทิ้งไว้',
      },
      {
        id:    'explore_pita_memory',
        type:  'explore',
        zone:  'forest_path',
        count: 2,
        hint:  'ค้นหาสิ่งที่ Pita อธิบายไว้ในทางป่า',
      },
      {
        id:    'return_pita_final',
        type:  'talk',
        target: 'pita',
        count: 1,
        hint:  'กลับมาหา Pita ด้วยสิ่งที่พบ',
      },
    ],
    rewards: { xp: 350, gold: 250, items: ['health_potion', 'mana_potion'] },
    completionText: 'Pita กอดสิ่งที่คุณนำมาไว้แน่น ร้องไห้เงียบๆ ก่อนจะหัวเราะอย่างอบอุ่น "ขอบคุณที่ช่วยข้าจำ ว่าเหตุผลที่อยู่ที่นี่คืออะไร" ตั้งแต่วันนั้น ขนมปังของ Pita อร่อยขึ้นผิดปกติ',
  },

  {
    id:        'SSQ_304',
    category:  'personal',
    name:      'นิมิตของ Lyra',
    desc:      'Lyra เห็นนิมิตที่น่ากลัวมาหลายคืน เธอไม่กล้าบอกใคร แต่ไว้ใจคุณพอที่จะเล่า นิมิตนั้นอาจเป็นเบาะแสสำคัญเกี่ยวกับ The Void',
    giverNpc:  'lyra',
    prereqs:   ['SSQ_003'],
    minLevel:  4,
    minAffection: { npcId: 'lyra', amount: 60 },
    steps: [
      {
        id:    'talk_lyra_nightmare',
        type:  'talk',
        target: 'lyra',
        count: 1,
        hint:  'ฟัง Lyra เล่านิมิตที่หลอกหลอนเธอ',
      },
      {
        id:    'investigate_marsh_lyra',
        type:  'travel',
        zone:  'cursed_marshlands',
        count: 1,
        hint:  'Lyra เห็นหนองน้ำในนิมิต — ไปดูว่าจริงไหม',
      },
      {
        id:    'search_marsh_lyra',
        type:  'explore',
        zone:  'cursed_marshlands',
        count: 4,
        hint:  'ค้นหาสัญลักษณ์ที่ Lyra เห็นในหนอง 4 ครั้ง',
      },
      {
        id:    'tell_maren_lyra',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'บอก Elder Maren เรื่องนิมิตของ Lyra',
      },
      {
        id:    'comfort_lyra',
        type:  'talk',
        target: 'lyra',
        count: 1,
        hint:  'กลับมาหา Lyra และบอกว่านิมิตของเธอมีความหมาย',
      },
    ],
    rewards: { xp: 600, gold: 450, items: ['mana_potion', 'mana_potion'] },
    completionText: 'Lyra ยิ้มเป็นครั้งแรกในรอบหลายสัปดาห์ "ข้าไม่บ้าใช่ไหม?" เธอพยักหน้าเบาๆ "ขอบคุณที่เชื่อข้า ถ้าจำเป็น... ข้าจะใช้นิมิตนี้ช่วยคุณ"',
  },

];

function getSideQuest(id) {
  return SIDE_QUESTS.find(q => q.id === id) || null;
}

function getSideQuestsByCategory(category) {
  return SIDE_QUESTS.filter(q => q.category === category);
}

// affectionMap: { npcId: currentAffectionScore }
function getAvailableSideQuests(completedIds, activeIds, charLevel, affectionMap = {}) {
  return SIDE_QUESTS.filter(q => {
    if (completedIds.includes(q.id)) return false;
    if (activeIds.includes(q.id)) return false;
    if ((q.minLevel || 1) > charLevel) return false;
    if (q.prereqs.some(p => !completedIds.includes(p))) return false;
    // affection gate: personal quests require minimum affection with giverNpc
    if (q.minAffection) {
      const current = affectionMap[q.minAffection.npcId] || 0;
      if (current < q.minAffection.amount) return false;
    }
    return true;
  });
}

module.exports = { SIDE_QUESTS, getSideQuest, getSideQuestsByCategory, getAvailableSideQuests };
