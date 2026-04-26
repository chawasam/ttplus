// data/quests_main.js — Main Story Quest definitions (Vorath / The Shattered Age)
//
// Step types:
//   talk        → { npcId }          trigger: talkToNPC handler
//   kill        → { monsterId?, zone?, count }  trigger: combat handler (boss or any kill)
//   explore     → { zone, count }    trigger: explore handler
//   travel      → { zone }           trigger: explore/travel handler
//   dungeon_clear → { dungeonId }    trigger: dungeon handler
//   choice      → { choiceKey, options: ['a','b'] }  trigger: frontend POST
//   lore_collect → { loreId }        trigger: collectLore handler

const MAIN_QUESTS = [

  // ══════════════════════════════════════════════════════════════════
  // ACT 1 — "เมืองที่ถูกลืม"  (City Ruins → Darkroot Hollow)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'MQ_101',
    act: 1,
    actTitle: 'เมืองที่ถูกลืม',
    name: 'รอยแตก',
    nameEN: 'The First Crack',
    zone: 'city_ruins',
    giver: 'elder_brennan',
    prereqs: [],
    autoStart: true,
    desc: 'ท้องฟ้าเหนือ Ashenveil แตกร้าวเหมือนกระจก Elder Brennan ดึงคุณลุกขึ้นจากซากปรัก ตราผนึกแรกถูกทำลายแล้ว — ไปหาผู้รอดชีวิตและสืบสวนที่ Voidspire Tower',
    narrative: '"ลุกขึ้น! ตราผนึกแรกถูกทำลายแล้ว — เราเหลือเวลาไม่มาก" — Elder Brennan',
    steps: [
      { id: 'talk_brennan_1', type: 'talk', npcId: 'elder_brennan', count: 1, hint: 'คุยกับ Elder Brennan ผู้รู้ประวัติศาสตร์ครึ่งหนึ่งของ Vorath' },
      { id: 'explore_ruins',  type: 'explore', zone: 'city_ruins', count: 3, hint: 'สำรวจ City Ruins เพื่อหาข้อมูลเกี่ยวกับ Void Rift (0/3)' },
      { id: 'collect_lore_1', type: 'lore_collect', loreId: 1, hint: 'ค้นพบบันทึกของ Sealer คนที่ 1 ที่ซ่อนอยู่ใน City Ruins' },
      { id: 'kill_void_1',    type: 'kill', monsterId: null, zone: 'city_ruins', count: 5, hint: 'ปราบ Void Creatures ที่รุกรานซากเมือง (0/5)' },
    ],
    rewards: { xp: 500, gold: 200 },
    completionText: 'Elder Brennan ดูตกใจยิ่งกว่าเดิม "Voidspire Tower พัง จากข้างใน... นี่ไม่ใช่อุบัติเหตุ มีคนทำ — ต้องหา Lyra ทันที"',
    nextQuest: 'MQ_102',
    unlocks: { npcChain: 'lyra' },
    dropLore: [1],
  },

  {
    id: 'MQ_102',
    act: 1,
    actTitle: 'เมืองที่ถูกลืม',
    name: 'อัศวินเงา',
    nameEN: 'Iron Veil',
    zone: 'city_ruins',
    giver: 'elder_brennan',
    prereqs: ['MQ_101'],
    autoStart: true,
    desc: 'Lyra "Ironveil" อัศวินเงาซ่อนตัวในโบสถ์ร้าง เธอปฏิเสธว่าตัวเองเป็นลูกหลาน Sealer แต่ Void Creatures กำลังรุกราน — เธอคงหนีไม่ได้',
    narrative: 'Lyra: "ฉันไม่รู้จักพวกผู้ปิดผนึก อย่ามาดึงฉันเข้าไปในเรื่องนี้" ... จากนั้น Void Rift ก็เปิดออกที่ผนังโบสถ์',
    steps: [
      { id: 'travel_chapel', type: 'travel', zone: 'city_ruins', count: 1, hint: 'ไปที่โบสถ์ร้างใน City Ruins ตามหา Lyra' },
      { id: 'talk_lyra_1',   type: 'talk', npcId: 'lyra', count: 1, hint: 'พูดคุยกับ Lyra "Ironveil" ในโบสถ์ร้าง' },
      { id: 'kill_chapel',   type: 'kill', monsterId: null, zone: 'city_ruins', count: 8, hint: 'ป้องกันโบสถ์จาก Void Creatures ร่วมกับ Lyra (0/8)' },
      { id: 'talk_lyra_2',   type: 'talk', npcId: 'lyra', count: 1, hint: 'พูดคุยกับ Lyra หลังการต่อสู้' },
    ],
    rewards: { xp: 1200, gold: 500 },
    completionText: 'Lyra ถอนหายใจ "ได้... ฉันจะไปกับพวกคุณ แต่ฉันทำเพราะ Void Creatures กำลังฆ่าคน ไม่ใช่เพราะเรื่องผู้ปิดผนึก" เธอปิดหน้ากากเหล็กลง',
    nextQuest: 'MQ_103',
  },

  {
    id: 'MQ_103',
    act: 1,
    actTitle: 'เมืองที่ถูกลืม',
    name: 'ราก',
    nameEN: 'The Ancient Ash',
    zone: 'darkroot_hollow',
    giver: 'lyra',
    prereqs: ['MQ_102'],
    autoStart: true,
    desc: 'Ancient Ash Tree ใน Darkroot Hollow คือ "กุญแจ" ของตราผนึกที่ 2 Void Creepers กำลังกัดทำลายมัน และ Rootblight Monarch กำลังเดินทางมาเพื่อทำให้สำเร็จ',
    narrative: 'Lyra ยืนอยู่หน้าต้น Ash ที่กำลังเปลี่ยนเป็นสีดำ "ต้นนี้ไม่ใช่แค่ต้นไม้ — มันคือสะพาน ถ้ามันตาย ตราผนึกที่ 2 จะพังภายในชั่วโมง"',
    steps: [
      { id: 'travel_darkroot',    type: 'travel', zone: 'darkroot_hollow', count: 1, hint: 'เดินทางไปยัง Darkroot Hollow' },
      { id: 'explore_darkroot',   type: 'explore', zone: 'darkroot_hollow', count: 4, hint: 'สำรวจ Darkroot Hollow เพื่อตามหา Ancient Ash Tree (0/4)' },
      { id: 'kill_creepers',      type: 'kill', monsterId: null, zone: 'darkroot_hollow', count: 12, hint: 'ปราบ Void Creepers ที่กัดกิน Ancient Ash (0/12)' },
      { id: 'kill_rootblight',    type: 'kill', monsterId: 'rootblight_monarch', zone: null, count: 1, hint: '⚔️ สังหาร Rootblight Monarch — Boss Act 1' },
      { id: 'collect_lore_2',     type: 'lore_collect', loreId: 2, hint: 'รับ Lore Fragment จาก Rootblight Monarch' },
    ],
    rewards: { xp: 3000, gold: 1200 },
    completionText: 'Ancient Ash รอดมาได้ แต่มีรอยเสียหาย Lyra แตะลำต้น "ตราผนึกยังคงอยู่... แต่เวลากำลังถอยหลัง" เธอหันมามอง "ต้องหา Sythara — เธอรู้บางอย่างที่พวกเราไม่รู้"',
    nextQuest: 'MQ_201',
    unlocks: { zone: 'shadowfell_depths', npcChain: 'mira' },
    dropLore: [2],
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT 2 — "คนตายพูดได้"  (Darkroot → Shadowfell Depths)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'MQ_201',
    act: 2,
    actTitle: 'คนตายพูดได้',
    name: 'เสียงสะท้อน',
    nameEN: 'The Echo',
    zone: 'shadowfell_depths',
    giver: 'sythara',
    prereqs: ['MQ_103'],
    autoStart: true,
    desc: 'Sythara นักเวทย์ Void ผู้ลึกลับบอกว่าวิญญาณของ Sealer คนที่ 5 — "The Echo" — ถูกผนึกอยู่ใน Shadowfell Depths ไม่ใช่เพราะตาย แต่เพราะเขาเลือกติดอยู่เพื่อเฝ้าตราผนึกที่ 3',
    narrative: 'Sythara: "ฉันรู้ว่าใครทำลายตราแรก — แต่บอกไม่ได้ ไม่ใช่เพราะไม่อยากบอก แต่เพราะถ้าบอก เขาจะรู้ว่าฉันรู้" เธอชี้ทางไปยัง Shadowfell',
    steps: [
      { id: 'talk_sythara_1',   type: 'talk', npcId: 'sythara', count: 1, hint: 'รับข้อมูลจาก Sythara นักเวทย์ผู้ศึกษา Void' },
      { id: 'travel_shadowfell', type: 'travel', zone: 'shadowfell_depths', count: 1, hint: 'เดินทางลงไปยัง Shadowfell Depths' },
      { id: 'explore_shadow',   type: 'explore', zone: 'shadowfell_depths', count: 5, hint: 'ผ่าน Spirit Trial — สำรวจ Shadowfell โดยไม่ Rest (0/5)' },
      { id: 'collect_lore_3',   type: 'lore_collect', loreId: 3, hint: 'ค้นพบบันทึกที่ The Echo ทิ้งไว้' },
      { id: 'talk_echo',        type: 'talk', npcId: 'the_echo', count: 1, hint: 'พบ The Echo — วิญญาณ Sealer คนที่ 5 ที่ยังมีชีวิตอยู่' },
    ],
    rewards: { xp: 7000, gold: 2500 },
    completionText: 'The Echo พูดด้วยเสียงที่แก่กว่าที่เห็น "ฉันรอพวกคุณมา 300 ปี มีคนเข้าไปในแกนเงาก่อนแล้ว ตราผนึกที่ 3 ยังอยู่... แต่มีรอยพยายามจะทำลาย"',
    nextQuest: 'MQ_202',
    dropLore: [3],
  },

  {
    id: 'MQ_202',
    act: 2,
    actTitle: 'คนตายพูดได้',
    name: 'ราชาว่างเปล่า',
    nameEN: 'The Hollow King',
    zone: 'shadowfell_depths',
    giver: 'the_echo',
    prereqs: ['MQ_201'],
    autoStart: true,
    desc: 'The Shattered Prophet ส่ง "The Hollow King" — Undead ผู้มีพลังมาก เพื่อทำลายตราผนึกที่ 3 ก่อนที่คุณจะไปถึง ต้องหยุดมันก่อน',
    narrative: 'The Echo: "เขายังมีชีวิตอยู่ — ผู้ที่พยายามทำลายตรา เขาส่งมันมาก่อน เพื่อเบี่ยงความสนใจ..."',
    steps: [
      { id: 'explore_shadow_deep', type: 'explore', zone: 'shadowfell_depths', count: 6, hint: 'ไปถึงแกนเงา — ส่วนที่ลึกที่สุดของ Shadowfell (0/6)' },
      { id: 'kill_hollow_king',    type: 'kill', monsterId: 'hollow_king', zone: null, count: 1, hint: '⚔️ สังหาร The Hollow King — Boss Act 2' },
      { id: 'collect_lore_4',      type: 'lore_collect', loreId: 4, hint: 'รับ Lore Fragment จาก Hollow King' },
      { id: 'talk_echo_2',         type: 'talk', npcId: 'the_echo', count: 1, hint: 'รับการเปิดเผยจาก The Echo — ใครพยายามทำลายตราที่ 3?' },
    ],
    rewards: { xp: 5000, gold: 2000 },
    completionText: 'ตราผนึกที่ 3 ยังอยู่ แต่มีรอยเหมือนมีดบาก The Echo กระซิบ "รอยนี้ — ทำจากข้างใน ไม่ใช่ภายนอก คนที่พยายามทำลายตรา... เคยเป็นผู้รักษาตรานี้"',
    nextQuest: 'MQ_301',
    dropLore: [4],
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT 3 — "ตราที่พัง"  (Sunken Crypts + Voidspire Ruins)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'MQ_301',
    act: 3,
    actTitle: 'ตราที่พัง',
    name: 'หลุมศพว่าง',
    nameEN: 'The Empty Graves',
    zone: 'sunken_crypts',
    giver: 'the_echo',
    prereqs: ['MQ_202'],
    autoStart: true,
    desc: 'ค้นหาความจริงใน Sunken Crypts — สุสานของผู้ปิดผนึกทั้งห้า ที่นั่นมีหลุมศพ... ที่ว่างเปล่า',
    narrative: '"ผู้ปิดผนึกไม่ได้ตาย — พวกเขาถูก transform เป็นส่วนหนึ่งของตราผนึกเอง" — Elder Brennan',
    steps: [
      { id: 'travel_crypts',    type: 'travel', zone: 'sunken_crypts', count: 1, hint: 'เดินทางไปยัง Sunken Crypts' },
      { id: 'explore_crypts',   type: 'explore', zone: 'sunken_crypts', count: 5, hint: 'อ่าน inscription โบราณในสุสาน — 5 จุด (0/5)' },
      { id: 'collect_lore_5',   type: 'lore_collect', loreId: 5, hint: 'ค้นพบ Lore Fragment ที่ 5 — ความจริงของผู้ปิดผนึก' },
      { id: 'collect_lore_6',   type: 'lore_collect', loreId: 6, hint: 'ค้นพบ Lore Fragment ที่ 6 — บันทึกของ Sealer คนที่ 3' },
      { id: 'kill_igrath',      type: 'kill', monsterId: 'void_colossus_igrath', zone: null, count: 1, hint: '⚔️ สังหาร Void Colossus Igrath — Boss Act 3' },
      { id: 'collect_lore_7',   type: 'lore_collect', loreId: 7, hint: 'รับ Lore Fragment จาก Igrath — ความจริงที่ The Prophet รู้' },
    ],
    rewards: { xp: 15000, gold: 5000 },
    completionText: 'The Shattered Prophet ปรากฏตัวครั้งแรก "ฉันมาช่วยปลดปล่อยพวกเขา ผู้ปิดผนึกทั้งห้าถูกบังคับ โดย Vorath ผู้ที่เจ้าคิดว่าเป็นเทพชั่ว" — แล้วก็หายไปในเงา',
    nextQuest: 'MQ_302',
    choiceAvailable: false,
    dropLore: [5, 6, 7],
  },

  {
    id: 'MQ_302',
    act: 3,
    actTitle: 'ตราที่พัง',
    name: 'ซากหอคอย',
    nameEN: 'Voidspire Truth',
    zone: 'voidspire_ruins',
    giver: null,
    prereqs: ['MQ_301'],
    autoStart: true,
    desc: 'ไปที่ Voidspire Ruins — จุดที่ตราผนึกแรกถูกทำลาย เพื่อค้นหาเบาะแสว่าใครอยู่เบื้องหลัง',
    narrative: 'Lyra เริ่มตั้งคำถาม... "ถ้าผู้ปิดผนึกเป็นส่วนหนึ่งของตราผนึก... ฉันก็ด้วยใช่ไหม?"',
    steps: [
      { id: 'travel_voidspire',   type: 'travel', zone: 'voidspire_ruins', count: 1, hint: 'เดินทางไปยัง Voidspire Ruins' },
      { id: 'explore_voidspire',  type: 'explore', zone: 'voidspire_ruins', count: 6, hint: 'สำรวจ Voidspire Ruins เพื่อค้นหาเบาะแส (0/6)' },
      { id: 'collect_lore_8',     type: 'lore_collect', loreId: 8, hint: 'ค้นพบห้องลับใต้ Voidspire — บันทึก Void Mirror' },
    ],
    rewards: { xp: 12000, gold: 4000 },
    completionText: 'คุณพบกระจก Void ที่บันทึกเหตุการณ์วันที่ตราถูกทำลาย เห็นเงาของ Prophet กับ... อีกคนที่คุ้นหน้าคุ้นตา แต่ยังจำไม่ได้',
    nextQuest: 'MQ_401',
    dropLore: [8],
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT 4 — "ด้านที่มองไม่เห็น"  (Void Frontier)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'MQ_401',
    act: 4,
    actTitle: 'ด้านที่มองไม่เห็น',
    name: 'พรมแดนว่าง',
    nameEN: 'Void Frontier',
    zone: 'void_frontier',
    giver: 'the_echo',
    prereqs: ['MQ_302'],
    autoStart: true,
    desc: 'The Echo เปิดเผยความจริงสุดท้าย: Vorath ไม่ใช่เทพชั่ว เขาคือ Void God ที่ถูกหลอก The Shattered Prophet รอคุณอยู่ใน Void Frontier',
    narrative: '"Vorath ไม่ใช่ศัตรู เขาคือเหยื่อคนแรก" — The Echo',
    steps: [
      { id: 'travel_void',     type: 'travel', zone: 'void_frontier', count: 1, hint: 'เดินทางไปยัง Void Frontier — พรมแดนสุดท้าย' },
      { id: 'explore_void',    type: 'explore', zone: 'void_frontier', count: 7, hint: 'ตามหา The Shattered Prophet ใน Void Frontier (0/7)' },
      { id: 'collect_lore_9',  type: 'lore_collect', loreId: 9, hint: 'ค้นพบ Void Memory — ความทรงจำของ Vorath' },
      { id: 'talk_prophet',    type: 'talk', npcId: 'shattered_prophet', count: 1, hint: 'เผชิญหน้ากับ The Shattered Prophet' },
      { id: 'kill_sythara',    type: 'kill', monsterId: 'sythara_void_vessel', zone: null, count: 1, hint: '⚔️ ต่อสู้กับ Sythara ที่ถูก Void สิง — Boss Act 4' },
    ],
    rewards: { xp: 30000, gold: 10000 },
    completionText: 'Sythara ถูก Void สิงครึ่งหนึ่ง เธอกระซิบก่อนหมดสติ "ฉัน... ขอโทษ" Lyra ค้นพบความจริง: เลือดของเธอเชื่อมกับตราผนึก ถ้าตราพัง เธอจะตายด้วย',
    nextQuest: 'MQ_501',
    dropLore: [9],
  },

  // ══════════════════════════════════════════════════════════════════
  // FINAL ACT — "เทพผู้ถูกลืม"  (Vorath Citadel)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'MQ_501',
    act: 5,
    actTitle: 'เทพผู้ถูกลืม',
    name: 'เทพ',
    nameEN: 'The God Within the Stone',
    zone: 'vorath_citadel',
    giver: 'lyra',
    prereqs: ['MQ_401'],
    autoStart: true,
    desc: 'Vorath Citadel คือ Vorath เอง ที่แปลงร่างเป็นโครงสร้างหิน เมื่อเข้าไป เขาจะพูด — ไม่ใช่ตะโกน แต่ถาม เจ้าจะเลือกอะไร?',
    narrative: '"เจ้ามาเพื่อผนึกฉันอีกครั้ง... หรือมาพูดคุย?" — Vorath',
    steps: [
      { id: 'travel_citadel',   type: 'travel', zone: 'vorath_citadel', count: 1, hint: 'เดินทางเข้าสู่ Vorath Citadel' },
      { id: 'explore_citadel',  type: 'explore', zone: 'vorath_citadel', count: 5, hint: 'ค้นหาทางไปยังใจกลาง Citadel (0/5)' },
      { id: 'collect_lore_10',  type: 'lore_collect', loreId: 10, hint: 'ฟังคำบอกเล่าของ Vorath — ความจริงทั้งหมด' },
      { id: 'make_choice',      type: 'choice', choiceKey: 'vorath_ending',
        options: ['accord', 'seal'],
        hint: 'เลือก: Ending A — "The Accord" (negotiate กับ Vorath) หรือ Ending B — "The New Seal" (ต่อสู้)' },
      { id: 'kill_vorath',      type: 'kill', monsterId: 'vorath_void_god', zone: null, count: 1, hint: '⚔️ เผชิญหน้ากับ Vorath — Final Boss (2 phases)' },
    ],
    rewards: { xp: 100000, gold: 50000 },
    completionText: 'The Shattered Age สิ้นสุดลง แต่ Void Rift ที่เปิดไปแล้วยังคงอยู่... โลกที่เปลี่ยนแปลงไปแล้วรอการฟื้นฟู',
    dropLore: [10],
  },
];

function getMainQuest(id) {
  return MAIN_QUESTS.find(q => q.id === id) || null;
}

function getMainQuestByAct(act) {
  return MAIN_QUESTS.filter(q => q.act === act);
}

// Get next quest in chain
function getNextMainQuest(completedId) {
  const q = getMainQuest(completedId);
  if (!q?.nextQuest) return null;
  return getMainQuest(q.nextQuest);
}

// All quests that should auto-start given completed set
function getAutoStartableQuests(completedIds) {
  return MAIN_QUESTS.filter(q => {
    if (!q.autoStart) return false;
    if (completedIds.includes(q.id)) return false;
    return q.prereqs.every(p => completedIds.includes(p));
  });
}

module.exports = { MAIN_QUESTS, getMainQuest, getMainQuestByAct, getNextMainQuest, getAutoStartableQuests };
