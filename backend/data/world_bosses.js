// data/world_bosses.js — World Boss definitions (community fight event)
// Boss ถูก spawn จาก Gift threshold หรือ VJ trigger ด้วยมือ

const WORLD_BOSSES = [

  {
    bossId:    'malachar_reborn',
    name:      'Malachar the Reborn',
    nameTH:    'มาลาชาร์ผู้ฟื้นคืน',
    emoji:     '💀',
    desc:      'จอมมารที่ตายแล้วฟื้นขึ้นใหม่แกร่งกว่าเดิม ใครสังหารเขาได้จะได้รับพรของเหล่าทวยเทพ',
    lore:      '500 ปีก่อน Malachar เป็นผู้ก่อ The Sundering ตอนนี้เขาหวนคืนอีกครั้ง...',
    hp:        50000,    // HP รวมของ community ต้องช่วยกันกด
    atk:       200,
    def:       60,
    timeLimit: 30,       // นาที
    minPlayers: 1,
    attackMsgs: [
      'Malachar ปล่อยคลื่นพลังมืดถล่มทั้งโลก!',
      'กระบี่เงาโฉบข้ามสนามรบ!',
      'เสียงหัวเราะดังก้องสรวงสวรรค์!',
      'Malachar เรียก Soul Rift — พลังงานมืดพุ่งขึ้นจากพื้น!',
    ],
    // legendaryPool: random 1 จาก pool นี้ให้กับ MVP (top damage dealer)
    legendaryPool: [
      'ashenfury', 'blade_of_ashenveil', 'eclipse_blade', 'reality_render',
      'world_core_staff', 'death_scythe', 'harbinger', 'whisperwind_bow',
      'shard_bow', 'harmony_of_ash', 'worldcore_orb', 'aetheric_engine',
    ],
    rewards: {
      participation: { gold: 500,  xp: 300,  items: ['ancient_scroll'] },
      top3:          { gold: 3000, xp: 1500, items: ['void_crystal', 'ancient_scroll', 'soul_gem'] },
      // first = MVP (top damage): ได้ legendary weapon แบบ random จาก legendaryPool
      first:         { gold: 8000, xp: 5000, items: ['void_crystal', 'soul_gem'], legendaryDrop: true, title: 'ผู้พิชิต Malachar' },
    },
    spawnMsg: '⚡ WORLD BOSS ปรากฏตัว! Malachar the Reborn โผล่ขึ้นมาจาก Void! ช่วยกันกด!',
    killMsg:  '🏆 World Boss ถูกสังหาร! เหล่าวีรบุรุษแห่ง Ashenveil ได้ชัยชนะ!',
  },

  {
    bossId:    'void_leviathan',
    name:      'Void Leviathan',
    nameTH:    'เลวีอาธานแห่ง Void',
    emoji:     '🌊',
    desc:      'สัตว์ประหลาดจาก The Void ขนาดเท่าภูเขา ผุดขึ้นมาจากรอยแยกระหว่างมิติ',
    lore:      'มันมาจากที่ที่ไม่มีแสงไม่มีเสียง... และมันหิว',
    hp:        80000,
    atk:       250,
    def:       80,
    timeLimit: 45,
    minPlayers: 1,
    attackMsgs: [
      'Void Leviathan กวาดหางถล่มโลก!',
      'Void Breath พุ่งออกมาท้วมทุกทิศ!',
      'มันดูดพลังงานจากทุกสิ่งรอบข้าง...',
      'รอยแยก Void เปิดใต้เท้าผู้กล้า!',
    ],
    // voidPool: random 1 จาก pool นี้ให้กับ MVP
    voidPool: [
      'void_greatsword', 'voidforged_blade', 'void_fang_blade', 'void_rift_blade',
      'void_staff', 'void_touched_orb', 'void_circuit_arm', 'void_chord',
    ],
    rewards: {
      participation: { gold: 800,   xp: 500,  items: ['void_crystal'] },
      top3:          { gold: 5000,  xp: 2500, items: ['void_crystal', 'void_crystal', 'soul_gem'] },
      // first = MVP: ได้ void weapon แบบ random จาก voidPool
      first:         { gold: 12000, xp: 8000, items: ['void_crystal', 'titan_core'], voidDrop: true, title: 'นักล่า Leviathan' },
    },
    spawnMsg: '🌊 ระวัง! Void Leviathan โผล่ขึ้นจากรอยแยกมิติ! ทุกคนช่วยกันโจมตี!',
    killMsg:  '🏆 Void Leviathan ถูกสังหาร! มิติอีกด้านหนึ่งสั่นสะเทือน!',
  },

];

// ผลัดเปลี่ยน boss แบบ random
function getRandomBoss() {
  return WORLD_BOSSES[Math.floor(Math.random() * WORLD_BOSSES.length)];
}

function getBoss(bossId) {
  return WORLD_BOSSES.find(b => b.bossId === bossId) || null;
}

module.exports = { WORLD_BOSSES, getRandomBoss, getBoss };
