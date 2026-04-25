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

];

// helper
function getStoryQuest(id) {
  return STORY_QUESTS.find(q => q.id === id) || null;
}

function getStoryQuestsByAct(act) {
  return STORY_QUESTS.filter(q => q.act === act);
}

module.exports = { STORY_QUESTS, getStoryQuest, getStoryQuestsByAct };
