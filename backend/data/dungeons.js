// data/dungeons.js — Dungeon definitions for Ashenveil

const DUNGEONS = {

  // ========================================================
  // 1) DARKROOT HOLLOW — ดงรากมืด (Level 1+, 6 rooms)
  // ========================================================
  darkroot_hollow: {
    id: 'darkroot_hollow',
    name: 'Darkroot Hollow',
    nameTH: 'ดงรากมืด',
    emoji: '🌲',
    region: 'ป่าโบราณ',
    desc: 'ป่าโบราณที่ถูกปกคลุมด้วยความมืดตลอดกาล มีต้นไม้ขนาดยักษ์และสัตว์ประหลาดซ่อนตัวอยู่ในเงา ใครที่เข้าไปในป่านี้แทบไม่มีใครกลับออกมา...',
    difficulty: 1,
    difficultyLabel: 'เริ่มต้น',
    minLevel: 1,
    totalRooms: 6,
    clearCooldownHours: 4, // สามารถ clear ซ้ำได้ทุก 4 ชั่วโมง
    rooms: [
      {
        room: 0,
        type: 'combat',
        name: 'ทางเข้าป่า',
        desc: '🌿 กลิ่นดินชื้นและใบไม้เน่าคลุ้ง... เสียงหอนเยือกเย็นดังขึ้นจากทุกทิศ หมาป่าตัวใหญ่เหลือบสายตาสีเหลืองเข้าหาคุณ',
        monsterId: 'forest_wolf',
      },
      {
        room: 1,
        type: 'trap',
        name: 'โพรงรากไม้',
        desc: '🕸️ เดินลึกเข้าไป รากไม้โบราณพุ่งขึ้นจากพื้นดิน พันรัดรอบข้อเท้าในพริบตา! คุณต้องรีบหลบ...',
        trapDmg: 18,
        dodgeStat: 'spd',
        dodgeThreshold: 12,
        avoidMsg: '💨 ก้าวเท้าทันเวลา! รากไม้พลาดไป คุณรอดได้!',
        hitMsg: '🩸 รากบีบแน่น... ก่อนคุณจะดึงออกได้รับ {dmg} ความเสียหาย',
      },
      {
        room: 2,
        type: 'combat',
        name: 'ค่ายโกบลิน',
        desc: '👹 กลิ่นควันไฟ... มีค่ายชั่วคราวอยู่ข้างหน้า โกบลินนักรบสวมเกราะขรุขระหันมาจ้องคุณด้วยสายตาสุดดุ',
        monsterId: 'goblin_warrior',
      },
      {
        room: 3,
        type: 'treasure',
        name: 'ซากแคมป์นักสำรวจ',
        desc: '💀 คุณพบซากแคมป์เก่า... กระสอบฉีกขาด สิ่งของกระจัดกระจาย นักสำรวจที่มาก่อนคุณไม่ได้กลับไปแล้ว',
        gold: [55, 130],
        itemPool: ['health_potion', 'antidote', 'wild_flower'],
        findChance: 0.65,
      },
      {
        room: 4,
        type: 'rest',
        name: 'ลำธารศักดิ์สิทธิ์',
        desc: '💧 แสงสีทองส่องผ่านเพดานใบไม้ที่ทึบ... ลำธารเล็กๆ ใสสะอาดไหลเอื่อย น้ำสัมผัสบาดแผลของคุณแล้วรู้สึกรักษา',
        healPercent: 0.3,
      },
      {
        room: 5,
        type: 'boss',
        name: 'ห้องโถงหัวใจป่า',
        desc: '🌳 พื้นดินสั่นสะเทือน... ต้นไม้ยักษ์กลางป่าหันมอง ดวงตาสีแดงเรืองรองบนลำต้น รากไม้โผล่ขึ้นล้อมรอบคุณ',
        boss: {
          monsterId: 'darkroot_guardian',
          name: 'Darkroot Guardian',
          emoji: '🌲',
          hp: 320, atk: 28, def: 20, spd: 3, mag: 0,
          hpMax: 320,
          xpReward: 220, goldReward: [160, 300],
          desc: 'ผู้พิทักษ์ป่าโบราณ ร่างยักษ์ที่สานจากรากไม้และพลังธรรมชาติโบราณ',
          attackMsg: ['กระแทกด้วยกิ่งยักษ์', 'ปล่อยสปอร์พิษ', 'เรียกรากไม้ใต้ดิน', 'โถมร่างทั้งต้น'],
          drops: [
            { itemId: 'crystal_shard', chance: 0.9 },
            { itemId: 'wild_flower', chance: 0.8 },
            { itemId: 'rotten_wood', chance: 0.5 },
          ],
          regen: 5,
          flee_chance: 0.3,
          statusAttack: { type: 'POISON', chance: 0.25, duration: 3, dmgPerTurn: 6 },
        },
      },
    ],
    clearRewards: {
      gold: [200, 380],
      xp: 280,
      itemPool: ['wolf_pelt', 'crystal_shard', 'antidote', 'health_potion'],
      itemCount: 2,
    },
  },

  // ========================================================
  // 2) SUNKEN CRYPTS — สุสานจม (Level 5+, 8 rooms)
  // ========================================================
  sunken_crypts: {
    id: 'sunken_crypts',
    name: 'Sunken Crypts',
    nameTH: 'สุสานจม',
    emoji: '⚰️',
    region: 'เขตผีดิบ',
    desc: 'สุสานโบราณที่จมลงใต้ดินจากแผ่นดินไหวเมื่อสองร้อยปีก่อน ผีดิบและโครงกระดูกครองทุกซอกมุม ขุนนางผู้ปกครองยังไม่ยอมตายอย่างแท้จริง',
    difficulty: 2,
    difficultyLabel: 'กลาง',
    minLevel: 5,
    totalRooms: 8,
    clearCooldownHours: 6,
    rooms: [
      {
        room: 0,
        type: 'combat',
        name: 'ทางเข้าสุสาน',
        desc: '💀 กลิ่นเน่าคลุ้ง... ประตูหินพัง โครงกระดูกตัวใหญ่เดินโซเซเข้าหา เสียงกระดูกกระทบดังก้องอุโมงค์',
        monsterId: 'crypt_shambler',
      },
      {
        room: 1,
        type: 'trap',
        name: 'ทางเดินร้าว',
        desc: '💥 พื้นหินถล่ม! หินขนาดใหญ่พังทลายจากเพดาน คุณต้องกระโดดหลบ...',
        trapDmg: 25,
        dodgeStat: 'spd',
        dodgeThreshold: 10,
        avoidMsg: '🏃 กระโดดข้ามหลุมได้ทัน! ฝุ่นพัดใส่หน้า แต่คุณปลอดภัย',
        hitMsg: '💥 หินกระแทกไหล่ก่อนคุณคว้าขอบได้... รับ {dmg} ความเสียหาย',
      },
      {
        room: 2,
        type: 'combat',
        name: 'ห้องเก็บศพ',
        desc: '🏹 แสงกระบอกไฟสั่นไหว... โครงกระดูกถือธนูยืนอยู่ระหว่างโลงศพ หัวลูกธนูชี้ตรงหน้าคุณ',
        monsterId: 'bone_archer',
      },
      {
        room: 3,
        type: 'treasure',
        name: 'ห้องสมบัติขุนนาง',
        desc: '👑 โลงศพทองคำ... เครื่องประดับขุนนางวางเรียงรายบนแท่นหิน ยังคงมีค่าอยู่แม้ผ่านมาสองร้อยปี',
        gold: [100, 240],
        itemPool: ['health_potion', 'mana_potion', 'iron_ore', 'antidote'],
        findChance: 0.7,
      },
      {
        room: 4,
        type: 'combat',
        name: 'วิหารร้าง',
        desc: '👻 เสียงครวญครางแว่วมาจากทุกทิศ... วิญญาณผู้ไม่ยอมจากโลก ปรากฏตัวเป็นรูปร่างจางๆ เรืองแสงสีฟ้า',
        monsterId: 'wailing_wraith',
      },
      {
        room: 5,
        type: 'rest',
        name: 'แท่นบูชาโบราณ',
        desc: '✨ แสงสีม่วงอ่อนๆ ส่องออกจากแท่นบูชาพัง... รู้สึกแปลกประหลาดเมื่อสัมผัส แต่บาดแผลเริ่มหาย',
        healPercent: 0.25,
      },
      {
        room: 6,
        type: 'combat',
        name: 'ห้องยามใหญ่',
        desc: '⚔️ ร่างขนาดใหญ่กว่าโครงกระดูกธรรมดา... เกราะหนักดำสนิท ถือตะบองขนาดมหึมา ผู้พิทักษ์สุสานตัวจริง',
        monsterId: 'crypt_elite',
      },
      {
        room: 7,
        type: 'boss',
        name: 'ห้องบัลลังก์',
        desc: '👑 บัลลังก์กระดูกตรงกลางห้อง... ร่างในชุดเกราะดำลุกขึ้น ดวงตาสีม่วงเรืองรอง เสียงหัวเราะก้องสุสาน',
        boss: {
          monsterId: 'cryptlord_malachar',
          name: 'Cryptlord Malachar',
          emoji: '💀',
          hp: 480, atk: 35, def: 22, spd: 5, mag: 25,
          hpMax: 480,
          xpReward: 420, goldReward: [300, 480],
          desc: 'ขุนนางผีดิบผู้ปกครองสุสาน ร่างสูงใหญ่ในชุดเกราะดำ อมตะชั่วกาล',
          attackMsg: ['ฟันด้วยตะบองกระดูก', 'ปล่อยคลื่นความตาย', 'เรียกกองทัพซอมบี้', 'สาปแช่งชีวิต'],
          drops: [
            { itemId: 'void_crystal', chance: 0.5 },
            { itemId: 'crystal_shard', chance: 0.85 },
            { itemId: 'ancient_scroll', chance: 0.2 },
          ],
          regen: 0,
          flee_chance: 0.1,
          statusAttack: { type: 'CURSE', chance: 0.3, duration: 3, dmgPerTurn: 8 },
        },
      },
    ],
    clearRewards: {
      gold: [350, 580],
      xp: 520,
      itemPool: ['void_crystal', 'ancient_scroll', 'crystal_shard', 'mana_potion'],
      itemCount: 2,
    },
  },

  // ========================================================
  // 3) VOIDSPIRE RUINS — ซากปรักวอยด์ (Level 10+, 10 rooms)
  // ========================================================
  voidspire_ruins: {
    id: 'voidspire_ruins',
    name: 'Voidspire Ruins',
    nameTH: 'ซากปรักวอยด์',
    emoji: '🌑',
    region: 'เขตว่างเปล่า',
    desc: 'ซากหอคอยของนักเวทย์ผู้บ้าคลั่งที่เปิดประตูสู่ The Void เมื่อสามร้อยปีก่อน ทุกอย่างในบริเวณนี้ถูกกลืนกินโดยความว่างเปล่า ความเป็นจริงบิดเบี้ยว',
    difficulty: 3,
    difficultyLabel: 'ยาก',
    minLevel: 10,
    totalRooms: 10,
    clearCooldownHours: 12,
    rooms: [
      {
        room: 0,
        type: 'combat',
        name: 'ซากประตูหอคอย',
        desc: '🌑 พื้นดินสีดำสนิท... วิสป์แห่งความว่างเปล่าลอยเร่ร่อน แสงไม่อาจส่องถึง มีบางอย่างที่ไม่ควรมีอยู่',
        monsterId: 'void_wisp',
      },
      {
        room: 1,
        type: 'trap',
        name: 'ห้องบิดเบี้ยว',
        desc: '🌀 ความเป็นจริงพังทลาย... พื้นที่บิดเบี้ยวรอบตัวคุณ จิตใจถูกโจมตีโดยความว่างเปล่า',
        trapDmg: 30,
        trapMpDmg: 20,
        dodgeStat: 'mag',
        dodgeThreshold: 20,
        avoidMsg: '✨ พลังเวทย์สร้างกำแพงจิตใจ! คุณต้านทานความว่างเปล่าได้',
        hitMsg: '🌀 ความจริงพังทลายโจมตีร่างกาย... HP -{dmg}, MP -20',
      },
      {
        room: 2,
        type: 'combat',
        name: 'ห้องทดลองแตกสลาย',
        desc: '🧪 อุปกรณ์ทดลองกระจัดกระจาย รอยแตกในกาลอวกาศเปิดออก... Void Horror โผล่ออกมาจากรอยแตก',
        monsterId: 'void_horror',
      },
      {
        room: 3,
        type: 'treasure',
        name: 'ห้องสมุดต้องห้าม',
        desc: '📚 ชั้นหนังสือยังสมบูรณ์ท่ามกลางความวุ่นวาย... ความรู้ต้องห้ามที่นักเวทย์ผู้นี้รวบรวมก่อนสูญหาย',
        gold: [180, 320],
        itemPool: ['ancient_scroll', 'void_crystal', 'mana_potion', 'crystal_shard'],
        findChance: 0.75,
      },
      {
        room: 4,
        type: 'combat',
        name: 'ทางเดินเงา',
        desc: '🌑 เงาดำเคลื่อนไหวตามผนัง... Void Shade แยกออกจากความมืดโจมตีจากทุกทิศทาง',
        monsterId: 'void_shade',
      },
      {
        room: 5,
        type: 'rest',
        name: 'แก่นพลังงานบริสุทธิ์',
        desc: '⚡ คริสตัลพลังงานสีขาวลอยอยู่กลางอากาศ... ท่ามกลางความมืดของ Void มันยังคงสะอาดและบริสุทธิ์',
        healPercent: 0.35,
        healMpPercent: 0.5,
      },
      {
        room: 6,
        type: 'combat',
        name: 'ห้องสะท้อนเงา',
        desc: '🪞 กระจกขนาดใหญ่ตั้งอยู่กลางห้อง... มันสะท้อนเวอร์ชันมืดของคุณ แล้วก็ก้าวออกจากกระจกเพื่อโจมตี',
        monsterId: 'void_wisp',
      },
      {
        room: 7,
        type: 'trap',
        name: 'เส้นทางผ่านกาลเวลา',
        desc: '⏳ กระแสเวลาบิดเบี้ยว... ร่างกายแก่และหนุ่มสลับกัน เซลล์ในร่างกายสับสน',
        trapDmg: 38,
        dodgeStat: 'spd',
        dodgeThreshold: 14,
        avoidMsg: '💨 เคลื่อนที่เร็วกว่ากระแสเวลา! ผ่านไปได้!',
        hitMsg: '⏳ กาลเวลาสัมผัสร่าง... เซลล์แก่ชราชั่วคราว รับ {dmg} ความเสียหาย',
      },
      {
        room: 8,
        type: 'combat',
        name: 'ห้องศูนย์กลาง',
        desc: '👾 แกนกลางของหอคอย... Void Horror ขนาดใหญ่กว่าปกติ ผู้พิทักษ์ประตู Void',
        monsterId: 'void_horror',
      },
      {
        room: 9,
        type: 'boss',
        name: 'แกนกลางแห่ง Void',
        desc: '🌌 ความมืดรวมตัว... รูปร่างขนาดยักษ์ก่อตัวขึ้นจากความว่างเปล่า Voidspire Colossus ตื่นขึ้นจากการหลับใหล',
        boss: {
          monsterId: 'voidspire_colossus',
          name: 'Voidspire Colossus',
          emoji: '🌌',
          hp: 700, atk: 45, def: 15, spd: 8, mag: 40,
          hpMax: 700,
          xpReward: 850, goldReward: [520, 850],
          desc: 'อสูรกายจาก The Void ที่รวบรวมพลังงานจากมิติอื่น ใหญ่เท่าห้องโถง',
          attackMsg: ['โจมตีด้วยคลื่น Void', 'เปิดรูโหว่กาลอวกาศ', 'ดูดพลังชีวิต', 'ปล่อยพลัง Annihilation'],
          drops: [
            { itemId: 'void_crystal', chance: 1.0 },
            { itemId: 'ancient_scroll', chance: 0.6 },
            { itemId: 'crystal_shard', chance: 0.8 },
          ],
          regen: 12,
          flee_chance: 0.05,
          statusAttack: { type: 'VOID_DRAIN', chance: 0.35, duration: 2, dmgPerTurn: 18 },
        },
      },
    ],
    clearRewards: {
      gold: [650, 1000],
      xp: 1100,
      itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
      itemCount: 3,
    },
  },

};

// ===== Dungeon-exclusive monsters =====
const DUNGEON_MONSTERS = {

  // — Sunken Crypts —
  crypt_shambler: {
    monsterId: 'crypt_shambler', name: 'Crypt Shambler', emoji: '🧟',
    level: 5, xpReward: 38, goldReward: [12, 28],
    hp: 95, atk: 19, def: 12, spd: 4, mag: 0,
    hpMax: 95,
    desc: 'ซอมบี้จากสุสาน เดินโซเซ ช้า แต่แข็งแกร่งและไม่รู้สึกเจ็บ',
    attackMsg: ['ตบหัว', 'กัดแขน', 'กอดบีบ', 'เหวี่ยงร่าง'],
    drops: [{ itemId: 'iron_ore', chance: 0.3 }],
    flee_chance: 0.9,
  },

  bone_archer: {
    monsterId: 'bone_archer', name: 'Bone Archer', emoji: '💀',
    level: 6, xpReward: 48, goldReward: [15, 32],
    hp: 72, atk: 24, def: 8, spd: 10, mag: 0,
    hpMax: 72,
    desc: 'โครงกระดูกถือธนู แม่นยำสูง โจมตีจากระยะไกลก่อนเข้าประชิด',
    attackMsg: ['ยิงธนูกระดูก', 'ลูกธนูพิษ', 'ยิงเต็มแรง', 'ยิงรัวสองลูก'],
    drops: [
      { itemId: 'monster_fang', chance: 0.4 },
      { itemId: 'antidote', chance: 0.2 },
    ],
    flee_chance: 0.75,
  },

  wailing_wraith: {
    monsterId: 'wailing_wraith', name: 'Wailing Wraith', emoji: '👻',
    level: 7, xpReward: 62, goldReward: [18, 38],
    hp: 68, atk: 26, def: 5, spd: 14, mag: 16,
    hpMax: 68,
    desc: 'วิญญาณที่ครวญครางไม่หยุด พลังสูงมาก แต่ร่างบาง หนีได้ยากเพราะล่องหนได้',
    attackMsg: ['ครางสยอง', 'สัมผัสผีสาง', 'ดูดพลังชีวิต', 'กรีดร้องอย่างบ้าคลั่ง'],
    statusAttack: { type: 'FEAR', chance: 0.25, duration: 2, dmgPerTurn: 4 },
    drops: [
      { itemId: 'crystal_shard', chance: 0.55 },
      { itemId: 'void_crystal', chance: 0.12 },
    ],
    flee_chance: 0.6,
  },

  crypt_elite: {
    monsterId: 'crypt_elite', name: 'Crypt Guardian', emoji: '⚔️',
    level: 8, xpReward: 85, goldReward: [28, 55],
    hp: 185, atk: 30, def: 24, spd: 5, mag: 5,
    hpMax: 185,
    desc: 'ผู้พิทักษ์สุสานชั้นนำ ใส่เกราะหนักสุด ถือตะบองขนาดมหึมา Elite ประจำ Dungeon',
    attackMsg: ['ฟันด้วยตะบอง', 'กดด้วยโล่หนัก', 'ทุบพื้นสั่น', 'ปราบด้วยน้ำหนักเกราะ'],
    drops: [
      { itemId: 'iron_ore', chance: 0.65 },
      { itemId: 'steel_ingot', chance: 0.25 },
    ],
    flee_chance: 0.8,
  },

  // — Voidspire Ruins —
  void_horror: {
    monsterId: 'void_horror', name: 'Void Horror', emoji: '👾',
    level: 10, xpReward: 95, goldReward: [32, 65],
    hp: 125, atk: 38, def: 10, spd: 12, mag: 22,
    hpMax: 125,
    desc: 'สัตว์ประหลาดจาก The Void รูปร่างเปลี่ยนแปลงตลอดเวลา ดูตาไม่ออก',
    attackMsg: ['พ่น Void Energy', 'เรียกหนามจาก Void', 'บิดเบี้ยวความจริง', 'ดูดพลังงาน'],
    drops: [
      { itemId: 'void_crystal', chance: 0.45 },
      { itemId: 'crystal_shard', chance: 0.55 },
    ],
    flee_chance: 0.5,
  },

  void_shade: {
    monsterId: 'void_shade', name: 'Void Shade', emoji: '🌑',
    level: 11, xpReward: 78, goldReward: [26, 52],
    hp: 88, atk: 42, def: 3, spd: 20, mag: 26,
    hpMax: 88,
    desc: 'เงาจาก The Void เร็วที่สุดใน Dungeon โจมตีรุนแรง แต่บางเบาสุดๆ',
    attackMsg: ['โจมตีฟ้าแลบ', 'ทะลุผ่านเกราะ', 'เปล่งคลื่น Void', 'แยกเป็นสามตัวหลอก'],
    drops: [{ itemId: 'void_crystal', chance: 0.5 }],
    flee_chance: 0.4,
  },

};

function getDungeon(dungeonId) {
  return DUNGEONS[dungeonId] || null;
}

function listAllDungeons() {
  return Object.values(DUNGEONS);
}

function getDungeonMonster(monsterId) {
  return DUNGEON_MONSTERS[monsterId] || null;
}

function getDungeonRoom(dungeonId, roomIndex) {
  const dungeon = DUNGEONS[dungeonId];
  if (!dungeon) return null;
  return dungeon.rooms[roomIndex] || null;
}

module.exports = { DUNGEONS, DUNGEON_MONSTERS, getDungeon, listAllDungeons, getDungeonMonster, getDungeonRoom };
