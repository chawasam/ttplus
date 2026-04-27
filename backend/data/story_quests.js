// data/story_quests.js — Main story quest definitions for Ashenveil

// Step types:
// talk        → { npcId }
// kill        → { monsterId? (null = any), zone? (null = any), count }
// explore     → { zone? (null = any), count }
// travel      → { zone }
// dungeon_enter  → { dungeonId }
// dungeon_clear  → { dungeonId }

const STORY_QUESTS = [

  // ══════════════════════════════════════════
  //  ACT 0 — PROLOGUE: The Resonance
  // ══════════════════════════════════════════

  {
    id:      'SQ_000',
    act:     0,
    chapter: 'โปรล็อก',
    name:    'เสียงจากใต้ดิน',
    desc:    'บางอย่างสั่นสะเทือนใต้ Ashenveil Shard ไปหา Elder Maren นักวิชาการแก่แห่ง Town Square เพื่อสอบถาม',
    prereqs: [],         // เริ่มต้นอัตโนมัติ
    autoStart: true,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'talk_maren_01',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'คุยกับ Elder Maren ใน Town Square',
      },
      {
        id:    'explore_outskirts',
        type:  'explore',
        zone:  'town_outskirts',
        count: 3,
        hint:  'สำรวจชานเมือง 3 ครั้งเพื่อหาแหล่งที่มาของการสั่นสะเทือน',
      },
      {
        id:    'talk_maren_02',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงานผลให้ Elder Maren ฟัง',
      },
    ],
    rewards: { xp: 150, gold: 100 },
    completionText: 'Elder Maren ดูตกใจ "The Resonance... รุนแรงกว่าที่ฉันคิด ครั้งนี้ไม่ธรรมดา ลองดูในป่าทางเหนือดูไหม?"',
  },

  {
    id:      'SQ_001',
    act:     0,
    chapter: 'โปรล็อก',
    name:    'เงาในป่า',
    desc:    'การสั่นสะเทือนแรงขึ้นในป่าทางเหนือ สิ่งมีชีวิตในป่าเริ่มแปรปรวน ออกสำรวจก่อนจะสายเกินไป',
    prereqs: ['SQ_000'],
    autoStart: true,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'travel_forest',
        type:  'travel',
        zone:  'forest_path',
        count: 1,
        hint:  'เดินทางไปยังทางป่า',
      },
      {
        id:    'kill_forest',
        type:  'kill',
        monsterId: null, // any monster
        zone:  'forest_path',
        count: 5,
        hint:  'สังหารมอนสเตอร์ในทางป่า 5 ตัว — พวกมันดูเป็นบ้าผิดปกติ',
      },
      {
        id:    'talk_maren_03',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'กลับไปบอก Elder Maren เรื่องที่พบ',
      },
    ],
    rewards: { xp: 200, gold: 150 },
    completionText: 'Elder Maren ค้นบันทึกโบราณอย่างรีบเร่ง "Darkroot Hollow... เคยเป็นที่อยู่ของ Guardian แห่งป่า ถ้ามันถูกรบกวน นั่นหมายความว่า..."',
  },

  {
    id:      'SQ_002',
    act:     0,
    chapter: 'โปรล็อก',
    name:    'ห้องเก็บบันทึกที่ถูกลืม',
    desc:    'Elder Maren ขอให้ค้นหาบันทึกโบราณในถ้ำมืดที่เคยเป็นห้องเก็บเอกสารของสภา Archon ก่อน The Sundering',
    prereqs: ['SQ_001'],
    autoStart: true,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'travel_cave',
        type:  'travel',
        zone:  'dark_cave',
        count: 1,
        hint:  'เดินทางไปยังถ้ำมืด',
      },
      {
        id:    'explore_cave',
        type:  'explore',
        zone:  'dark_cave',
        count: 4,
        hint:  'ค้นหาในถ้ำมืด 4 ครั้ง — บันทึกต้องอยู่ที่ใดที่หนึ่ง',
      },
      {
        id:    'talk_maren_04',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'นำบันทึกที่พบกลับมาให้ Elder Maren',
      },
    ],
    rewards: { xp: 300, gold: 200, items: ['ancient_scroll'] },
    completionText: 'Elder Maren อ่านบันทึกแล้วหน้าซีด "The Sundering... ไม่ได้เกิดจากอุบัติเหตุ Vorath ทำเองโดยตั้งใจ และตอนนี้... The Resonance นี้คือสัญญาณว่าเขากำลังจะกลับมา"',
  },

  // ══════════════════════════════════════════
  //  ACT 1 — THE HOLLOW CALLS
  // ══════════════════════════════════════════

  {
    id:      'SQ_100',
    act:     1,
    chapter: 'Act 1 — ดงรากมืด',
    name:    'ป่าที่ร้องไห้',
    desc:    'Guardian แห่ง Darkroot Hollow เสียสติแล้ว ชาวบ้าน 3 คนที่หายไปในป่าอาจยังมีชีวิต เข้าไปในดันเจี้ยนและเอาชนะ Guardian เพื่อหยุดการแพร่กระจายของ Void',
    prereqs: ['SQ_002'],
    autoStart: true,
    minLevel: 1,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'enter_darkroot',
        type:  'dungeon_enter',
        dungeonId: 'darkroot_hollow',
        count: 1,
        hint:  'เข้าสู่ Darkroot Hollow',
      },
      {
        id:    'clear_darkroot',
        type:  'dungeon_clear',
        dungeonId: 'darkroot_hollow',
        count: 1,
        hint:  'เอาชนะ Darkroot Guardian และเคลียร์ดันเจี้ยน',
      },
    ],
    rewards: { xp: 600, gold: 350, items: ['crystal_shard', 'health_potion'] },
    completionText: 'Guardian ล้มลง... ร่างยักษ์ย่อส่วนลงเป็นต้นไม้เล็กๆ ก่อนจะกระซิบ "ขอบคุณ... ไปหาเพื่อน... ของ Sylvara... อีกสองแห่ง..."',
  },

  {
    id:      'SQ_101',
    act:     1,
    chapter: 'Act 1 — ดงรากมืด',
    name:    'เศษวิญญาณ',
    desc:    'Guardian มอบ Fragment of Sylvara ให้ Elder Maren ต้องรู้เรื่องนี้ทันที',
    prereqs: ['SQ_100'],
    autoStart: true,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'talk_maren_05',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren เรื่อง Fragment of Sylvara',
      },
    ],
    rewards: { xp: 150, gold: 200 },
    completionText: 'Elder Maren จ้องดู Fragment อย่างตะลึง "นี่คือ... พลังของ Sylvara ผู้เป็น Shard-Anchor แห่ง Ashenveil ถ้าเธอแตกสลาย เราทุกคนจะจมสู่ The Void" เขาชี้ไปทางตะวันออก "Sunken Crypts. ไปที่นั่น"',
  },

  // ══════════════════════════════════════════
  //  ACT 2 — THE SLEEPING KING
  // ══════════════════════════════════════════

  {
    id:      'SQ_200',
    act:     2,
    chapter: 'Act 2 — สุสานจม',
    name:    'ขุนนางผู้ไม่ยอมตาย',
    desc:    'Cryptlord Malachar ฟื้นขึ้นมาจากสุสานและเริ่มเรียกกองทัพผีดิบ Elder Maren เชื่อว่าเขาถูก Void ควบคุม ต้องเข้าไปปลดปล่อยเขา',
    prereqs: ['SQ_101'],
    autoStart: true,
    minLevel: 5,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'kill_crypt_prep',
        type:  'kill',
        monsterId: null,
        zone:  null,
        count: 10,
        hint:  'ฝึกฝนฝีมือ — สังหารมอนสเตอร์ 10 ตัวก่อนเข้าสุสาน',
      },
      {
        id:    'enter_sunken',
        type:  'dungeon_enter',
        dungeonId: 'sunken_crypts',
        count: 1,
        hint:  'เข้าสู่ Sunken Crypts',
      },
      {
        id:    'clear_sunken',
        type:  'dungeon_clear',
        dungeonId: 'sunken_crypts',
        count: 1,
        hint:  'เอาชนะ Cryptlord Malachar',
      },
    ],
    rewards: { xp: 1000, gold: 600, items: ['void_crystal', 'health_potion'] },
    completionText: 'Malachar สลายตัวลงพร้อมรอยยิ้มสงบ "...ขอบคุณ ข้าสู้มานานจนแทบแพ้ Vorath... เขายังมีชีวิต ใน Void เขาแข็งแกร่งขึ้นทุกวัน... รีบไปที่หอคอยเถิด..." Fragment ที่สองปรากฏขึ้น',
  },

  {
    id:      'SQ_201',
    act:     2,
    chapter: 'Act 2 — สุสานจม',
    name:    'คำสารภาพของขุนนาง',
    desc:    'Malachar ทิ้งข้อมูลสำคัญเกี่ยวกับ Vorath ไว้ นำทุกอย่างกลับไปให้ Elder Maren วิเคราะห์',
    prereqs: ['SQ_200'],
    autoStart: true,
    steps: [
      {
        id:    'talk_maren_06',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รายงาน Elder Maren เรื่องทั้งหมดที่ Malachar เปิดเผย',
      },
    ],
    rewards: { xp: 200, gold: 300, items: ['ancient_scroll'] },
    completionText: 'Elder Maren สรุปด้วยน้ำเสียงสั่น "Vorath อยู่ใน The Void มา 500 ปี ความโดดเดี่ยวเปลี่ยนเขาจนจำไม่ได้ และตอนนี้เขากำลังใช้ Voidspire Ruins เป็นประตูกลับมา เราต้องไปหยุดเขาก่อนที่ Sylvara จะไม่มีแรงต้านอีกต่อไป"',
  },

  // ══════════════════════════════════════════
  //  ACT 3 — INTO THE VOID
  // ══════════════════════════════════════════

  {
    id:      'SQ_300',
    act:     3,
    chapter: 'Act 3 — ซากปรักวอยด์',
    name:    'ผ่านประตูความว่างเปล่า',
    desc:    'Voidspire Ruins คือต้นกำเนิดของทุกอย่าง Vorath อยู่ที่นั่น ถ้าไม่หยุดเขาตอนนี้ Sylvara จะแตกสลายและ Ashenveil Shard จะถูก The Void กลืนกิน',
    prereqs: ['SQ_201'],
    autoStart: true,
    minLevel: 10,
    steps: [
      {
        id:    'talk_sylvara',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'คุยกับ Elder Maren — Sylvara กำลังส่งสัญญาณผ่านเขา',
      },
      {
        id:    'enter_voidspire',
        type:  'dungeon_enter',
        dungeonId: 'voidspire_ruins',
        count: 1,
        hint:  'เข้าสู่ Voidspire Ruins',
      },
      {
        id:    'clear_voidspire',
        type:  'dungeon_clear',
        dungeonId: 'voidspire_ruins',
        count: 1,
        hint:  'เอาชนะ Voidspire Colossus — Avatar ของ Vorath',
      },
    ],
    rewards: { xp: 2000, gold: 1200, items: ['void_crystal', 'void_crystal', 'ancient_scroll'] },
    completionText: 'Avatar พ่ายแพ้ เสียงของ Vorath ก้องในความว่างเปล่า "...น่าสนใจ คุณแข็งแกร่งกว่าที่คิด" Sylvara ฟื้นคืนสติชั่วคราว เธอปิดผนึก Voidspire ไว้ก่อน แล้วกระซิบ "World Core... ยังอยู่ มี 7 ชิ้น... กระจายอยู่ใน 7 Shard... รวมมันกลับมา... แล้ว Vorath จะต้องเผชิญกับสิ่งที่เขาสร้างขึ้น..." Fragment ที่สามสว่างจ้า',
  },

  {
    id:      'SQ_301',
    act:     3,
    chapter: 'Act 3 — ซากปรักวอยด์',
    name:    'รุ่งอรุณใหม่',
    desc:    'ภารกิจสำคัญของ Ashenveil Shard สำเร็จแล้ว แต่นี่เป็นเพียงจุดเริ่มต้น World Core ยังรอการรวบรวม กลับไปคุยกับ Elder Maren เพื่อรับพรก่อนออกเดินทางต่อ',
    prereqs: ['SQ_300'],
    autoStart: true,
    steps: [
      {
        id:    'talk_maren_final',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'กลับมาพบ Elder Maren ที่ Town Square',
      },
    ],
    rewards: { xp: 500, gold: 500, items: ['health_potion', 'mana_potion', 'antidote'] },
    completionText: 'Elder Maren โอบกอดคุณอย่างไม่คาดคิด "เราทุกคนยังอยู่ได้เพราะคุณ ไปเถอะ ยังมีอีก 6 Shard ที่ต้องการความช่วยเหลือ..." เขาส่งสัญลักษณ์โบราณให้ "นี่คือ Seal of Ashenveil — จะช่วยพิสูจน์ว่าคุณปกป้อง Shard นี้มา"',
  },

  // ══════════════════════════════════════════
  //  ACT 4 — THE SHATTERED CITY
  // ══════════════════════════════════════════

  {
    id:      'SQ_400',
    act:     4,
    chapter: 'Act 4 — เมืองแตกสลาย',
    name:    'เงาแห่งจักรวรรดิเก่า',
    desc:    'World Core ชิ้นที่สองถูกบันทึกว่าซ่อนอยู่ในซากเมือง Archon โบราณ ทางตะวันออกของ Ashenveil Mira ช่างตีเหล็กรู้เส้นทางเข้าไป',
    prereqs: ['SQ_301'],
    autoStart: true,
    minLevel: 10,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'talk_mira_ruins',
        type:  'talk',
        target: 'mira',
        count: 1,
        hint:  'ถาม Mira ช่างตีเหล็กเรื่องเส้นทางเข้า City Ruins',
      },
      {
        id:    'travel_ruins',
        type:  'travel',
        zone:  'city_ruins',
        count: 1,
        hint:  'เดินทางไปยังซากเมือง',
      },
      {
        id:    'explore_ruins',
        type:  'explore',
        zone:  'city_ruins',
        count: 5,
        hint:  'ค้นหาในซากเมือง 5 ครั้ง — ร่องรอยของ World Core ต้องมีที่ไหนสักแห่ง',
      },
      {
        id:    'kill_ruins_guardians',
        type:  'kill',
        monsterId: null,
        zone:  'city_ruins',
        count: 8,
        hint:  'Golem ยามรักษาการณ์เก่ายังทำงานอยู่ — กำจัด 8 ตัวเพื่อเปิดทางเข้า',
      },
      {
        id:    'talk_mira_ruins_02',
        type:  'talk',
        target: 'mira',
        count: 1,
        hint:  'รายงาน Mira เรื่องที่ค้นพบ',
      },
    ],
    rewards: { xp: 1500, gold: 900, items: ['void_crystal', 'ancient_scroll'] },
    completionText: 'Mira จ้องดู Fragment ในมือคุณด้วยสายตาซับซ้อน "นี่คือสิ่งที่พ่อข้าค้นหามาตลอดชีวิต..." เธอหยุดนิดหนึ่ง "ตามข้ามาก่อน มีอะไรอยากให้เห็น"',
  },

  {
    id:      'SQ_401',
    act:     4,
    chapter: 'Act 4 — เมืองแตกสลาย',
    name:    'ความลับของช่างตีเหล็ก',
    desc:    'Mira มีความลับเกี่ยวกับ The Sundering ที่ไม่เคยบอกใคร ฟังเรื่องของเธอแล้วนำข้อมูลกลับไปให้ Elder Maren',
    prereqs: ['SQ_400'],
    autoStart: true,
    giverNpc: 'mira',
    steps: [
      {
        id:    'talk_mira_secret',
        type:  'talk',
        target: 'mira',
        count: 1,
        hint:  'ฟังเรื่องราวความลับของ Mira',
      },
      {
        id:    'kill_marshlands_vanguard',
        type:  'kill',
        monsterId: null,
        zone:  'city_ruins',
        count: 5,
        hint:  'สังหาร Void Vanguard ที่ Mira ชี้เป้าให้ 5 ตัว — พวกมันรู้ตำแหน่ง World Core',
      },
      {
        id:    'talk_maren_act4',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'นำข้อมูลที่ได้กลับไปให้ Elder Maren',
      },
    ],
    rewards: { xp: 800, gold: 600 },
    completionText: 'Elder Maren ถอนหายใจยาว "พ่อของ Mira... เป็นหนึ่งในสภา Archon ที่ช่วย Vorath ทำ The Sundering เธอต้องแบกภาระนั้นมาตลอด" เขาพลิกแผนที่ "World Core ชิ้นต่อไปอยู่ในหนองสาปแช่ง ระวังตัว"',
  },

  // ══════════════════════════════════════════
  //  ACT 5 — THE CURSED MARSHLANDS
  // ══════════════════════════════════════════

  {
    id:      'SQ_500',
    act:     5,
    chapter: 'Act 5 — หนองสาปแช่ง',
    name:    'เสียงร้องจากหนอง',
    desc:    'หนองสาปแช่งเต็มไปด้วยพลัง Void เข้มข้นที่สุดนอกจาก Vorath Citadel สิ่งมีชีวิตในนั้นเปลี่ยนรูปร่างไปแล้ว ต้องผ่านเข้าไปหา World Core ชิ้นที่สาม',
    prereqs: ['SQ_401'],
    autoStart: true,
    minLevel: 18,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'travel_marshlands',
        type:  'travel',
        zone:  'cursed_marshlands',
        count: 1,
        hint:  'เดินทางไปยังหนองสาปแช่ง',
      },
      {
        id:    'survive_marsh',
        type:  'kill',
        monsterId: null,
        zone:  'cursed_marshlands',
        count: 12,
        hint:  'รอดชีวิตจากการโจมตีของสัตว์ประหลาดในหนอง — สังหาร 12 ตัว',
      },
      {
        id:    'explore_marsh_core',
        type:  'explore',
        zone:  'cursed_marshlands',
        count: 5,
        hint:  'ค้นหา World Core Fragment ในส่วนลึกของหนอง 5 ครั้ง',
      },
      {
        id:    'talk_maren_marsh',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'ส่ง Fragment ที่ 4 ให้ Elder Maren',
      },
    ],
    rewards: { xp: 3000, gold: 1800, items: ['void_crystal', 'void_crystal', 'health_potion'] },
    completionText: 'Elder Maren จัด Fragment ทั้ง 4 ชิ้นวางไว้ข้างกัน แสงสีม่วงเรืองรองออกมา "4 ชิ้น... ยังขาดอีก 3 Vorath คงรู้ว่าเราใกล้เข้ามาแล้ว เขาจะไม่รอ Lyra เด็กสาวเพิ่งเห็นนิมิตบางอย่าง ไปถามเธอดู"',
  },

  {
    id:      'SQ_501',
    act:     5,
    chapter: 'Act 5 — หนองสาปแช่ง',
    name:    'ชายขอบแห่ง Void',
    desc:    'Lyra เห็นนิมิตสถานที่ที่ World Core ชิ้นที่ 5 และ 6 ซ่อนอยู่ — Void Frontier ที่ซึ่งความจริงและ Void แยกกันไม่ออก',
    prereqs: ['SQ_500'],
    autoStart: true,
    minLevel: 28,
    giverNpc: 'lyra',
    steps: [
      {
        id:    'talk_lyra_vision',
        type:  'talk',
        target: 'lyra',
        count: 1,
        hint:  'ฟังนิมิตของ Lyra เกี่ยวกับ Void Frontier',
      },
      {
        id:    'travel_void',
        type:  'travel',
        zone:  'void_frontier',
        count: 1,
        hint:  'เดินทางไปยัง Void Frontier',
      },
      {
        id:    'explore_void',
        type:  'explore',
        zone:  'void_frontier',
        count: 6,
        hint:  'ค้นหาใน Void Frontier 6 ครั้ง — ความจริงและ Void ผสมกันที่นี่',
      },
      {
        id:    'kill_void_born',
        type:  'kill',
        monsterId: null,
        zone:  'void_frontier',
        count: 15,
        hint:  'สิ่งที่ถือกำเนิดจาก Void — สังหาร 15 ตัว',
      },
      {
        id:    'talk_lyra_return',
        type:  'talk',
        target: 'lyra',
        count: 1,
        hint:  'กลับมารายงาน Lyra',
      },
    ],
    rewards: { xp: 5000, gold: 3000, items: ['void_crystal', 'void_crystal', 'ancient_scroll', 'health_potion'] },
    completionText: 'Lyra กอด Fragment ทั้งสองไว้ แล้วเงยหน้าด้วยน้ำตา "ข้าเห็นในนิมิต... Vorath ไม่ได้เป็นผู้ร้ายตลอด เขาสร้าง The Sundering เพื่อปกป้องบางสิ่ง แต่มันผิดพลาด..." เธอส่ง Fragment กลับ "ไปที่ Shadowfell ชิ้นสุดท้ายอยู่กับผู้พิทักษ์เงา"',
  },

  // ══════════════════════════════════════════
  //  ACT 6 — THE FINAL RECKONING
  // ══════════════════════════════════════════

  {
    id:      'SQ_600',
    act:     6,
    chapter: 'Act 6 — การเผชิญหน้าครั้งสุดท้าย',
    name:    'ผู้พิทักษ์เงาสุดท้าย',
    desc:    'Shadowfell Depths คือดินแดนที่เงาของผู้ตายมาอาศัย World Core ชิ้นสุดท้ายถูกปกป้องโดย Shade Sovereign — วิญญาณ Archon ที่เลือกอยู่เฝ้าแทนการเข้าสู่ Void',
    prereqs: ['SQ_501'],
    autoStart: true,
    minLevel: 38,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'talk_maren_final_prep',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'รับคำสั่งสุดท้ายจาก Elder Maren ก่อนเข้า Shadowfell',
      },
      {
        id:    'travel_shadowfell',
        type:  'travel',
        zone:  'shadowfell_depths',
        count: 1,
        hint:  'เดินทางลงสู่ Shadowfell Depths',
      },
      {
        id:    'kill_shadow_guards',
        type:  'kill',
        monsterId: null,
        zone:  'shadowfell_depths',
        count: 20,
        hint:  'ผ่านด่านทหารเงา — สังหาร 20 ตัว เพื่อเข้าถึง Shade Sovereign',
      },
      {
        id:    'explore_shadowfell',
        type:  'explore',
        zone:  'shadowfell_depths',
        count: 7,
        hint:  'ค้นหา World Core Fragment ที่ซ่อนอยู่ในความมืด 7 ครั้ง',
      },
      {
        id:    'talk_all_npcs',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'กลับมาหา Elder Maren พร้อม Fragment ทั้ง 7 ชิ้น',
      },
    ],
    rewards: { xp: 10000, gold: 6000, items: ['void_crystal', 'void_crystal', 'void_crystal', 'ancient_scroll', 'health_potion', 'mana_potion'] },
    completionText: 'Elder Maren วาง Fragment ทั้ง 7 ชิ้นเป็นวงกลม แสงสีทองระเบิดออกมา World Core สมบูรณ์อีกครั้ง ทุกคนในห้องรู้สึกถึงพลังที่เปลี่ยนไป "ตอนนี้..." Elder Maren หันมายิ้ม "ถึงเวลาเผชิญหน้ากับ Vorath เป็นครั้งสุดท้าย ไป Vorath Citadel เถอะ"',
  },

  {
    id:      'SQ_601',
    act:     6,
    chapter: 'Act 6 — การเผชิญหน้าครั้งสุดท้าย',
    name:    'วันสิ้นสุดของ The Void',
    desc:    'Vorath Citadel — ปราสาทที่ Vorath สร้างจากความเจ็บปวดและโดดเดี่ยวตลอด 500 ปี เขาไม่ใช่ผู้ร้าย เขาคือคนที่สูญเสียทุกอย่างและไม่รู้จะหยุด World Core จะเป็นกุญแจสู่ความจริง',
    prereqs: ['SQ_600'],
    autoStart: true,
    minLevel: 50,
    giverNpc: 'elder_maren',
    steps: [
      {
        id:    'travel_citadel',
        type:  'travel',
        zone:  'vorath_citadel',
        count: 1,
        hint:  'เดินทางไปยัง Vorath Citadel',
      },
      {
        id:    'kill_citadel_guardians',
        type:  'kill',
        monsterId: null,
        zone:  'vorath_citadel',
        count: 25,
        hint:  'ฝ่าแนวป้องกันของ Vorath — สังหารผู้พิทักษ์ 25 ตัว',
      },
      {
        id:    'explore_citadel_throne',
        type:  'explore',
        zone:  'vorath_citadel',
        count: 5,
        hint:  'ค้นหาห้องบัลลังก์ของ Vorath ในปราสาท 5 ครั้ง',
      },
      {
        id:    'talk_maren_epilogue',
        type:  'talk',
        target: 'elder_maren',
        count: 1,
        hint:  'กลับมาหา Elder Maren — บทสุดท้ายของ Ashenveil ใกล้เข้ามาแล้ว',
      },
    ],
    rewards: { xp: 20000, gold: 10000, items: ['void_crystal', 'void_crystal', 'void_crystal', 'ancient_scroll', 'health_potion', 'mana_potion', 'antidote'] },
    completionText: 'Vorath ยืนอยู่กลางบัลลังก์ที่พังทลาย เมื่อเห็น World Core เขาหยุดนิ่ง ใบหน้าที่แข็งกระด้างค่อยๆ อ่อนลง "500 ปี... ข้าทำทั้งหมดนี้เพื่อปกป้องมัน แต่กลับทำลายทุกอย่างแทน" เขาก้มหัว "เอาไปเถอะ ใช้ให้เป็นประโยชน์" Ashenveil Shard เงียบลงในคืนนั้น The Resonance หยุดสั่นสะเทือน และดาวเริ่มปรากฏบนท้องฟ้าที่ดำมืดมานานหลายศตวรรษ',
  },

];

// helper
function getStoryQuest(id) {
  return STORY_QUESTS.find(q => q.id === id) || null;
}

function getStoryQuestsByAct(act) {
  return STORY_QUESTS.filter(q => q.act === act);
}

module.exports = { STORY_QUESTS, getStoryQuest, getStoryQuestsByAct };
