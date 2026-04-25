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

  // ========================================================
  // 4) CITY RUINS — ซากเมืองร้าง (Level 10+, 10 rooms)
  // ========================================================
  city_ruins: {
    id: 'city_ruins',
    name: 'City Ruins',
    nameTH: 'ซากเมืองร้าง',
    emoji: '🏚️',
    region: 'เขตซากปรักหักพัง',
    desc: 'เมืองที่เจริญรุ่งเรืองที่สุดในยุคโบราณ ปัจจุบันเหลือแต่ซากปรักหักพัง ผีดิบของผู้อยู่อาศัยยังคงเดินเตร่ และเจ้าหน้าที่รักษาความปลอดภัยที่ถูกสาปยังคงปฏิบัติหน้าที่',
    difficulty: 3,
    difficultyLabel: 'กลาง-ยาก',
    minLevel: 10,
    totalRooms: 10,
    clearCooldownHours: 8,
    rooms: [
      {
        room: 0, type: 'combat', name: 'ซากประตูเมือง',
        desc: '⚙️ กลไกโบราณยังทำงานอยู่... หุ่นยนต์รักษาการณ์สนิมเกาะโผล่ออกจากซอกกำแพง',
        monsterId: 'abandoned_sentinel',
      },
      {
        room: 1, type: 'trap', name: 'ถนนพังทลาย',
        desc: '🪨 พื้นถนนพังทรุดกะทันหัน! คุณต้องปีนข้ามก่อนพังลงไป',
        trapDmg: 28, dodgeStat: 'spd', dodgeThreshold: 14,
        avoidMsg: '🏃 กระโดดข้ามได้ทัน! รอดตายมาหวุดหวิด',
        hitMsg: '💥 ตกลงไปในหลุม! รับ {dmg} ความเสียหาย',
      },
      {
        room: 2, type: 'combat', name: 'ซากตลาด',
        desc: '🐀 กองขยะขนาดยักษ์สั่นไหว... ฝูงหนูกาฬโรคพุ่งออกมาเป็นจำนวนมหาศาล',
        monsterId: 'plague_rat_swarm',
      },
      {
        room: 3, type: 'treasure', name: 'ห้องนิรภัยธนาคาร',
        desc: '💰 ประตูเหล็กหนาพัง... ภายในมีทองคำและของมีค่าที่ถูกทิ้งไว้นานหลายร้อยปี',
        gold: [200, 420], itemPool: ['steel_ingot', 'mana_potion', 'crystal_shard', 'health_potion'],
        findChance: 0.75,
      },
      {
        room: 4, type: 'combat', name: 'ลานประหาร',
        desc: '⚔️ หุ่นยนต์กล่าวโทษดังก้องซาก... นักล้วงกระเป๋าที่หลบซ่อนอยู่โดดออกมาก่อน',
        monsterId: 'grave_robber',
      },
      {
        room: 5, type: 'rest', name: 'โบสถ์ร้าง',
        desc: '🕊️ ยังมีพลังศักดิ์สิทธิ์หลงเหลืออยู่... แท่นบูชาโบราณส่งแสงอ่อนๆ รักษาบาดแผล',
        healPercent: 0.3,
      },
      {
        room: 6, type: 'combat', name: 'ห้องประชุมรัฐสภา',
        desc: '⚙️ โต๊ะประชุมขนาดใหญ่แตกหัก... หุ่นยนต์รักษาการณ์อาวุโสลุกขึ้นจากบัลลังก์',
        monsterId: 'abandoned_sentinel',
      },
      {
        room: 7, type: 'trap', name: 'อุโมงค์ใต้ดิน',
        desc: '☠️ แก๊สพิษสะสมในอุโมงค์มาหลายร้อยปี! ต้องวิ่งผ่านให้เร็วพอ',
        trapDmg: 35, dodgeStat: 'spd', dodgeThreshold: 18,
        avoidMsg: '💨 วิ่งผ่านแก๊สได้ก่อนหมดสติ!',
        hitMsg: '☠️ หายใจเข้าแก๊สพิษ... รับ {dmg} ความเสียหายและอาการสั่นสะท้าน',
      },
      {
        room: 8, type: 'combat', name: 'หอสังเกตการณ์',
        desc: '🐀 บนหอคอยสูง... ฝูงหนูกลายพันธุ์ขนาดใหญ่ที่กินกัมมันตรังสีมาตลอด',
        monsterId: 'plague_rat_swarm',
      },
      {
        room: 9, type: 'boss', name: 'ห้องว่าการเมือง',
        desc: '👑 บัลลังก์ผุกร่อน... ร่างในชุดเกราะทองคำสนิมลุกขึ้น ดวงตาสีแดงเรืองรอง เสียงก้องดังขึ้น "ข้าคือผู้ว่าราชการ ผู้ละเมิดจะถูกลงโทษ!"',
        boss: {
          monsterId: 'undead_mayor', name: 'Undead Mayor', emoji: '👑',
          hp: 820, atk: 52, def: 32, spd: 7, mag: 30, hpMax: 820,
          xpReward: 980, goldReward: [600, 950],
          desc: 'ผู้ว่าราชการผีดิบ สวมเกราะทองคำโบราณ ควบคุมหุ่นยนต์รักษาการณ์ทั้งเมือง',
          attackMsg: ['ฟันด้วยดาบพิธีกรรม', 'เรียกหุ่นยนต์มาช่วย', 'ปล่อยคลื่นพิษเมือง', 'ออกพระราชกฤษฎีกาแห่งความตาย'],
          drops: [
            { itemId: 'void_crystal', chance: 0.7 },
            { itemId: 'steel_ingot', chance: 0.85 },
            { itemId: 'ancient_scroll', chance: 0.35 },
          ],
          regen: 8, flee_chance: 0.1,
          statusAttack: { type: 'POISON', chance: 0.3, duration: 3, dmgPerTurn: 12 },
          phase2: {
            trigger: 0.5, // activate at 50% HP
            atkMult: 1.4, defMult: 1.2,
            attackMsg: ['เรียกกองทัพผีดิบ!', 'พลังแห่งอำนาจสูงสุด!', 'โจมตีทุกทิศทาง!', 'คำสาปแห่งผู้ว่าฯ!'],
            phaseMsg: '👑 ผู้ว่าฯ ผีดิบเข้าสู่ Phase 2! เรียกกองทัพมาเสริมกำลัง!',
          },
        },
      },
    ],
    clearRewards: {
      gold: [700, 1100], xp: 1300,
      itemPool: ['void_crystal', 'steel_ingot', 'ancient_scroll', 'crystal_shard'],
      itemCount: 3,
    },
  },

  // ========================================================
  // 5) CURSED MARSHLANDS — หนองน้ำสาป (Level 18+, 12 rooms)
  // ========================================================
  cursed_marshlands: {
    id: 'cursed_marshlands',
    name: 'Cursed Marshlands',
    nameTH: 'หนองน้ำสาป',
    emoji: '🌿',
    region: 'หนองน้ำพิษ',
    desc: 'หนองน้ำที่ถูกสาปโดยนักเวทย์ดำเมื่อสามชั่วอายุคน สัตว์ประหลาดที่อาศัยอยู่ที่นี่ถูกกลายพันธุ์โดยพลังแห่งความสาป Hydra แห่งหนองน้ำเป็นราชาที่ไม่มีใครกล้าท้าทาย',
    difficulty: 4,
    difficultyLabel: 'ยากมาก',
    minLevel: 18,
    totalRooms: 12,
    clearCooldownHours: 12,
    rooms: [
      {
        room: 0, type: 'combat', name: 'ปากทางหนอง',
        desc: '🦀 โคลนพุ่งขึ้น... ปูยักษ์กลายพันธุ์พุ่งออกมาจากใต้โคลน',
        monsterId: 'bog_crawler',
      },
      {
        room: 1, type: 'trap', name: 'ทุ่งโคลนพิษ',
        desc: '☠️ โคลนดำดูดดึง... ก๊าซพิษลอยขึ้นจากพื้น ต้องหาทางอ้อม',
        trapDmg: 40, dodgeStat: 'spd', dodgeThreshold: 20,
        avoidMsg: '💨 กระโดดข้ามโคลนพิษได้! รอดหวุดหวิด',
        hitMsg: '☠️ โคลนพิษสัมผัสผิวหนัง... รับ {dmg} ความเสียหาย',
      },
      {
        room: 2, type: 'combat', name: 'ป่าเห็ดพิษ',
        desc: '🍄 เห็ดยักษ์เรืองแสง... Fungal Horror ลุกขึ้นจากใต้พื้นดิน สปอร์พิษฟุ้งกระจาย',
        monsterId: 'fungal_horror',
      },
      {
        room: 3, type: 'treasure', name: 'กระท่อมร้างของนักเวทย์',
        desc: '🧪 ขวดยาพิเศษเรียงรายบนชั้น... ยังใช้ได้อยู่ท่ามกลางความสาปที่แผ่ซ่าน',
        gold: [280, 560], itemPool: ['antidote', 'mana_potion', 'void_crystal', 'health_potion'],
        findChance: 0.7,
      },
      {
        room: 4, type: 'combat', name: 'บ่อน้ำสาป',
        desc: '🧙 แม่มดหนองน้ำออกมาจากหมอกควัน ร่ายคาถาสาปแช่ง สายตาเรืองแสงสีเขียว',
        monsterId: 'marsh_witch',
      },
      {
        room: 5, type: 'rest', name: 'เกาะดินสะอาด',
        desc: '🌸 เกาะเล็กๆ ที่ยังไม่ถูกสาป... น้ำใสสะอาดไหลออกจากหิน ชั่วคราวเท่านั้น',
        healPercent: 0.35,
      },
      {
        room: 6, type: 'combat', name: 'เขาวงกตกก',
        desc: '🦀 โคลนปั่นป่วน... ปูยักษ์หลายตัวรุมกัน',
        monsterId: 'bog_crawler',
      },
      {
        room: 7, type: 'trap', name: 'หนองแม่เหล็ก',
        desc: '🌀 ดินแม่เหล็กดูดกลิ่นเลือด... ดึงร่างกายลงสู่โคลน ต้องต้านด้วยพลังจิต',
        trapDmg: 48, dodgeStat: 'mag', dodgeThreshold: 25,
        avoidMsg: '✨ พลังจิตต้านดินแม่เหล็กได้! ลอยขึ้นมาได้',
        hitMsg: '🌀 ดินดูดดึงร่าง... รับ {dmg} ความเสียหายจากแรงกด',
      },
      {
        room: 8, type: 'combat', name: 'สวนเห็ดพิษใหญ่',
        desc: '🍄 อาณาจักรเห็ดพิษ... Fungal Horror หัวหน้าที่ใหญ่กว่าปกติสองเท่า',
        monsterId: 'fungal_horror',
      },
      {
        room: 9, type: 'combat', name: 'ทางเข้าวัง Hydra',
        desc: '🧙 แม่มดผู้ปกป้อง Hydra ออกมาขวาง พร้อมคาถาพิเศษที่แรงกว่าเดิม',
        monsterId: 'marsh_witch',
      },
      {
        room: 10, type: 'rest', name: 'หินศักดิ์สิทธิ์',
        desc: '⚡ หินโบราณที่ยังต้านทานคำสาป... ฟื้นฟูก่อนเผชิญ Hydra',
        healPercent: 0.4, healMpPercent: 0.4,
      },
      {
        room: 11, type: 'boss', name: 'แอ่งน้ำราชา Hydra',
        desc: '🐉 น้ำสั่นสะเทือน... หัวยักษ์สามหัวโผล่ขึ้นจากน้ำ เสียงคำรามก้องทั้งหนอง Swamp Hydra ตื่นขึ้นแล้ว!',
        boss: {
          monsterId: 'swamp_hydra', name: 'Swamp Hydra', emoji: '🐉',
          hp: 1400, atk: 68, def: 28, spd: 9, mag: 20, hpMax: 1400,
          xpReward: 1850, goldReward: [1100, 1800],
          desc: 'Hydra ราชาแห่งหนองน้ำสาป มีสามหัว ฟื้นตัวเร็ว พิษรุนแรง',
          attackMsg: ['กัดด้วยหัวซ้าย', 'พ่นพิษจากหัวกลาง', 'ตวัดหางทำลาย', 'สามหัวโจมตีพร้อมกัน'],
          drops: [
            { itemId: 'void_crystal', chance: 0.9 },
            { itemId: 'ancient_scroll', chance: 0.5 },
            { itemId: 'blue_gem_fragment', chance: 0.4 },
          ],
          regen: 25, flee_chance: 0.05,
          statusAttack: { type: 'POISON', chance: 0.4, duration: 4, dmgPerTurn: 20 },
          phase2: {
            trigger: 0.5,
            atkMult: 1.35, defMult: 0.9,
            attackMsg: ['หัวที่สี่งอกออกมา!', 'พ่นพิษทุกทิศทาง!', 'ฟื้นคืนชีพ!', 'คำรามสั่นสะเทือนหนอง!'],
            phaseMsg: '🐉 Swamp Hydra Phase 2! หัวใหม่งอก — รีเจนสูงขึ้น!',
          },
        },
      },
    ],
    clearRewards: {
      gold: [1200, 2000], xp: 2400,
      itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
      itemCount: 3,
    },
  },

  // ========================================================
  // 6) VOID FRONTIER — ชายแดนวอยด์ (Level 28+, 12 rooms)
  // ========================================================
  void_frontier: {
    id: 'void_frontier',
    name: 'Void Frontier',
    nameTH: 'ชายแดนวอยด์',
    emoji: '🌌',
    region: 'ชายแดนมิติ',
    desc: 'ดินแดนที่ขอบระหว่างโลกและ The Void บางลงจนเกือบฉีกขาด สิ่งมีชีวิตจาก Void หลั่งไหลเข้ามา ราชาแห่งรอยแยกควบคุมประตูมิติจากศูนย์กลาง',
    difficulty: 5,
    difficultyLabel: 'โหด',
    minLevel: 28,
    totalRooms: 12,
    clearCooldownHours: 16,
    rooms: [
      {
        room: 0, type: 'combat', name: 'รอยแยกมิติแรก',
        desc: '🌀 ความเป็นจริงฉีกขาด... Rift Stalker โผล่ผ่านรอยแยก รูปร่างบิดเบี้ยว',
        monsterId: 'rift_stalker',
      },
      {
        room: 1, type: 'trap', name: 'ทุ่งพลังงานวุ่นวาย',
        desc: '⚡ พลังงาน Void ไม่เสถียร... คลื่นพลังงานสุ่มระเบิดรอบตัว',
        trapDmg: 55, dodgeStat: 'mag', dodgeThreshold: 30,
        avoidMsg: '✨ ตั้งกำแพงพลังงานต้านได้! รอดปาฏิหาริย์',
        hitMsg: '⚡ คลื่น Void ฟาด... รับ {dmg} ความเสียหายจากพลังงานดิบ',
      },
      {
        room: 2, type: 'combat', name: 'ทะเลทรายมิติ',
        desc: '🌪️ ธาตุแห่ง Void รวมตัว... Chaos Elemental ก่อร่างขึ้นจากพลังงานสับสน',
        monsterId: 'chaos_elemental',
      },
      {
        room: 3, type: 'treasure', name: 'ซากเรือมิติ',
        desc: '📦 เรือที่หลงทางในมิติ... สินค้าค้าขายจากโลกอื่นตกค้างอยู่',
        gold: [400, 800], itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'mana_potion'],
        findChance: 0.8,
      },
      {
        room: 4, type: 'combat', name: 'สุสานหิน Void',
        desc: '🪨 หินก้อนใหญ่เคลื่อนไหว... Fragment Golem ที่ประกอบจากเศษหินมิติ',
        monsterId: 'fragment_golem',
      },
      {
        room: 5, type: 'rest', name: 'ฟองอากาศมิติ',
        desc: '💫 ฟองอากาศสีขาวลอยอยู่กลาง Void... ภายในเป็นพื้นที่ปลอดภัยชั่วคราว',
        healPercent: 0.4, healMpPercent: 0.5,
      },
      {
        room: 6, type: 'combat', name: 'ที่ราบรอยแยก',
        desc: '🌀 Rift Stalker ขนาดใหญ่กว่าปกติ... ล่าเหยื่อจากมิติอื่น',
        monsterId: 'rift_stalker',
      },
      {
        room: 7, type: 'trap', name: 'สะพานมิติแตก',
        desc: '🌉 สะพานพลังงานทอดข้ามช่องว่าง Void... รีบข้ามก่อนมันพังสลาย!',
        trapDmg: 65, dodgeStat: 'spd', dodgeThreshold: 25,
        avoidMsg: '🏃 วิ่งข้ามสะพานได้ก่อนพัง! ลมจาก Void พัดแต่ไม่เป็นไร',
        hitMsg: '🌉 สะพานพังขณะข้าม... ตกลงในช่องว่างแล้วดึงตัวขึ้น รับ {dmg} ความเสียหาย',
      },
      {
        room: 8, type: 'combat', name: 'ใจกลางความโกลาหล',
        desc: '🌪️ Chaos Elemental สองตัวรวมพลัง... พลังทำลายล้างสูงสุด',
        monsterId: 'chaos_elemental',
      },
      {
        room: 9, type: 'combat', name: 'ทางเข้าสู่แกนกลาง',
        desc: '🪨 Golem ยักษ์เฝ้าประตู... ใหญ่เป็นสองเท่าของที่พบก่อน',
        monsterId: 'fragment_golem',
      },
      {
        room: 10, type: 'rest', name: 'แกนพลังงานบริสุทธิ์',
        desc: '⚡ แกนพลังงานสีขาวที่ยังไม่ถูก Void ปนเปื้อน... ใช้ฟื้นฟูก่อนการต่อสู้ครั้งสุดท้าย',
        healPercent: 0.5, healMpPercent: 0.6,
      },
      {
        room: 11, type: 'boss', name: 'แกนกลางรอยแยก',
        desc: '👁️ ประตูมิติขนาดใหญ่หมุนอยู่กลางห้อง... ร่างทรงพลังก้าวออกมา "ฉันคือ Rift Sovereign ผู้ควบคุมรอยแยกทุกแห่ง!"',
        boss: {
          monsterId: 'rift_sovereign', name: 'Rift Sovereign', emoji: '👁️',
          hp: 2200, atk: 90, def: 35, spd: 15, mag: 65, hpMax: 2200,
          xpReward: 3200, goldReward: [2000, 3200],
          desc: 'ราชาแห่งรอยแยกมิติ สามารถเปิดและปิดประตูสู่มิติต่างๆ พลังสูงสุดใน Void Frontier',
          attackMsg: ['เปิดรอยแยกโจมตี', 'ดูดพลังจากมิติอื่น', 'ระเบิดพลังงาน Rift', 'ส่งเข้าสู่มิติว่างเปล่า'],
          drops: [
            { itemId: 'void_crystal', chance: 1.0 },
            { itemId: 'ancient_scroll', chance: 0.7 },
            { itemId: 'blue_gem_fragment', chance: 0.6 },
          ],
          regen: 20, flee_chance: 0.03,
          statusAttack: { type: 'VOID_DRAIN', chance: 0.4, duration: 3, dmgPerTurn: 30 },
          phase2: {
            trigger: 0.5,
            atkMult: 1.5, defMult: 1.3,
            attackMsg: ['เปิดประตูมิติสุดท้าย!', 'ดูดพลังชีวิตทั้งหมด!', 'คลื่นพลังงาน Void สูงสุด!', 'ผสานร่างกับ Void!'],
            phaseMsg: '👁️ Rift Sovereign เข้าสู่ Phase 2! รวมพลังกับ The Void!',
          },
        },
      },
    ],
    clearRewards: {
      gold: [2200, 3500], xp: 4000,
      itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
      itemCount: 3,
    },
  },

  // ========================================================
  // 7) SHADOWFELL DEPTHS — ห้วงเงามืด (Level 38+, 14 rooms)
  // ========================================================
  shadowfell_depths: {
    id: 'shadowfell_depths',
    name: 'Shadowfell Depths',
    nameTH: 'ห้วงเงามืด',
    emoji: '🌑',
    region: 'ห้วงเงา',
    desc: 'อาณาจักรเงาที่ซ่อนอยู่ใต้โลก แสงสว่างไม่อาจส่องถึง เจ้าแห่งเงาปกครองด้วยความน้อมใจ Shadow Assassin ล่าในความมืด Nightmare Beast กินฝันร้าย และ Soul Reaper เก็บเกี่ยววิญญาณ',
    difficulty: 6,
    difficultyLabel: 'โหดมาก',
    minLevel: 38,
    totalRooms: 14,
    clearCooldownHours: 20,
    rooms: [
      {
        room: 0, type: 'combat', name: 'ประตูแห่งเงา',
        desc: '🗡️ เงาดำเคลื่อนไหว... Shadow Assassin โผล่จากความมืดโดยไม่มีเสียง',
        monsterId: 'shadow_assassin',
      },
      {
        room: 1, type: 'trap', name: 'ทางเดินความฝัน',
        desc: '😴 จิตใจเริ่มหลงทาง... ความฝันร้ายโจมตีจิตใจโดยตรง ต้านทานด้วยเจตจำนง',
        trapDmg: 70, dodgeStat: 'mag', dodgeThreshold: 35,
        avoidMsg: '✨ เจตจำนงแกร่งพอต้านทานฝันร้ายได้!',
        hitMsg: '😱 ฝันร้ายทะลุจิตใจ... รับ {dmg} ความเสียหาย ความกลัวคืบคลาน',
      },
      {
        room: 2, type: 'combat', name: 'ป่าแห่งฝันร้าย',
        desc: '👹 Nightmare Beast ลงตัวจากความมืด... ร่างใหญ่โต ฟันเขี้ยวเรืองแสงสีม่วง',
        monsterId: 'nightmare_beast',
      },
      {
        room: 3, type: 'treasure', name: 'สมบัติแห่งวิญญาณ',
        desc: '💀 วิญญาณที่ถูกขังไว้ยังถือสมบัติ... ปลดปล่อยพวกเขาเพื่อรับรางวัล',
        gold: [600, 1200], itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
        findChance: 0.8,
      },
      {
        room: 4, type: 'combat', name: 'สุสานวิญญาณ',
        desc: '💀 Soul Reaper ยืนกลางสุสาน... เคียวยักษ์เรืองแสงสีดำ พร้อมเก็บเกี่ยว',
        monsterId: 'soul_reaper',
      },
      {
        room: 5, type: 'rest', name: 'แสงสีขาวในความมืด',
        desc: '🕯️ เปลวเทียนเล็กๆ ยังลุกไหม้ท่ามกลางความมืดสนิท... ชีวิตยังมีอยู่',
        healPercent: 0.4,
      },
      {
        room: 6, type: 'combat', name: 'ห้องเงาสะท้อน',
        desc: '🗡️ Shadow Assassin คู่หนึ่ง... เงาของกันและกัน โจมตีพร้อมกันจากสองทิศ',
        monsterId: 'shadow_assassin',
      },
      {
        room: 7, type: 'trap', name: 'บึงวิญญาณ',
        desc: '👻 วิญญาณนับร้อยดูดพลังชีวิต... ต้องผ่านไปให้เร็วที่สุด',
        trapDmg: 85, dodgeStat: 'spd', dodgeThreshold: 30,
        avoidMsg: '💨 วิ่งผ่านบึงวิญญาณได้ก่อนถูกดูดพลังหมด!',
        hitMsg: '👻 วิญญาณดูดพลังชีวิต... รับ {dmg} ความเสียหาย',
      },
      {
        room: 8, type: 'combat', name: 'สวนฝันร้าย',
        desc: '👹 Nightmare Beast หัวหน้าฝูง... ใหญ่กว่าปกติ รูปร่างเปลี่ยนแปลง',
        monsterId: 'nightmare_beast',
      },
      {
        room: 9, type: 'combat', name: 'ห้องเก็บเกี่ยว',
        desc: '💀 Soul Reaper ผู้เฒ่า... มีประสบการณ์นับร้อยปีในการเก็บวิญญาณ',
        monsterId: 'soul_reaper',
      },
      {
        room: 10, type: 'rest', name: 'แท่นแห่งชีวิต',
        desc: '❤️ แท่นหินที่ยังมีพลังชีวิตหลงเหลือ... ใช้ฟื้นฟูก่อนเผชิญ Shadow King',
        healPercent: 0.45, healMpPercent: 0.5,
      },
      {
        room: 11, type: 'combat', name: 'ห้องยามองค์รักษ์',
        desc: '🗡️ Shadow Assassin ระดับ Elite... ผู้พิทักษ์ส่วนตัวของ Shadow King',
        monsterId: 'shadow_assassin',
      },
      {
        room: 12, type: 'combat', name: 'ห้องรอ Audience',
        desc: '👹 Nightmare Beast ของ Shadow King... เพาะเลี้ยงจากฝันร้ายของเหยื่อนับพัน',
        monsterId: 'nightmare_beast',
      },
      {
        room: 13, type: 'boss', name: 'บัลลังก์แห่งเงา',
        desc: '👑 ความมืดสนิทยิ่งกว่าเดิม... รูปร่างขนาดใหญ่ก่อตัวจากเงาทุกเงา "ข้าคือเงาของทุกสิ่ง ความมืดของทุกความกลัว..."',
        boss: {
          monsterId: 'shadow_king', name: 'Shadow King', emoji: '👑',
          hp: 3800, atk: 135, def: 55, spd: 22, mag: 90, hpMax: 3800,
          xpReward: 5500, goldReward: [3500, 5500],
          desc: 'เจ้าแห่งเงา ผู้ปกครองห้วงเงามืด ร่างประกอบด้วยเงาของสรรพสัตว์ทุกชนิด',
          attackMsg: ['ฟันด้วยเงาดาบ', 'ปล่อยคลื่นความกลัว', 'เรียกเงาคลั่ง', 'กลายร่างเป็นความมืดสนิท'],
          drops: [
            { itemId: 'void_crystal', chance: 1.0 },
            { itemId: 'ancient_scroll', chance: 0.8 },
            { itemId: 'blue_gem_fragment', chance: 0.7 },
          ],
          regen: 30, flee_chance: 0.02,
          statusAttack: { type: 'FEAR', chance: 0.45, duration: 3, dmgPerTurn: 35 },
          phase2: {
            trigger: 0.5,
            atkMult: 1.6, defMult: 1.4,
            attackMsg: ['แตกแยกออกเป็นพัน Shadow!', 'ความมืดสูงสุด!', 'กินฝันร้ายทั้งหมด!', 'พลังแห่งเงาสมบูรณ์!'],
            phaseMsg: '👑 Shadow King Phase 2! แตกออกเป็นเงาพัน — ไม่มีที่ซ่อน!',
          },
        },
      },
    ],
    clearRewards: {
      gold: [4000, 6500], xp: 7000,
      itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
      itemCount: 4,
    },
  },

  // ========================================================
  // 8) VORATH CITADEL — ป้อมปราการวอราธ (Level 50+, 15 rooms)
  // ========================================================
  vorath_citadel: {
    id: 'vorath_citadel',
    name: 'Vorath Citadel',
    nameTH: 'ป้อมปราการวอราธ',
    emoji: '🏰',
    region: 'ป้อมวอราธ',
    desc: 'ป้อมปราการสุดท้ายของ Lord Vorath ผู้ที่พยายามกลืนกินโลกด้วยความมืด ไม่มีใครที่เข้าไปในป้อมนี้กลับออกมาในสภาพเดิม Dungeon สุดท้ายและยากที่สุดในโลก Ashenveil',
    difficulty: 7,
    difficultyLabel: 'นรก',
    minLevel: 50,
    totalRooms: 15,
    clearCooldownHours: 24,
    rooms: [
      {
        room: 0, type: 'combat', name: 'ประตูทางเข้าป้อม',
        desc: '⚔️ อัศวินในชุดเกราะดำยืนรักษาการณ์... Vorath Knight ผู้จงรักภักดี',
        monsterId: 'vorath_knight',
      },
      {
        room: 1, type: 'trap', name: 'ห้องทดสอบความเจ็บปวด',
        desc: '🩸 罠อุปกรณ์ทรมานโบราณยังทำงาน... กับดักเข็มพิษจากทุกทิศทาง',
        trapDmg: 95, dodgeStat: 'spd', dodgeThreshold: 35,
        avoidMsg: '💨 หลบเข็มได้ทุกดอก! ฝีมือสูงสุด',
        hitMsg: '🩸 เข็มพิษทิ่มแทง... รับ {dmg} ความเสียหาย และพิษกัดกร่อน',
      },
      {
        room: 2, type: 'combat', name: 'ห้องประชุมสงคราม',
        desc: '⛪ ผู้ไต่สวนมรณะรักษาหอจดหมายเหตุ... Death Inquisitor กำลังอ่านตำราต้องห้าม',
        monsterId: 'death_inquisitor',
      },
      {
        room: 3, type: 'treasure', name: 'คลังสมบัติจักรวรรดิ',
        desc: '💎 สมบัติที่ปล้นมาจากทั่วโลก... กองทองคำและอัญมณีระยิบระยับ',
        gold: [1000, 2000], itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
        findChance: 0.85,
      },
      {
        room: 4, type: 'combat', name: 'ลานฝึกนรก',
        desc: '⚔️ Vorath Knight ระดับ Elite... ผ่านการฝึกโดย Vorath เองมาหลายร้อยปี',
        monsterId: 'vorath_knight',
      },
      {
        room: 5, type: 'rest', name: 'ห้องพักนักโทษ',
        desc: '🔒 ห้องเล็กๆ ที่ใช้คุมขังนักโทษ... ของแจกจ่ายที่ทิ้งไว้ยังใช้ได้',
        healPercent: 0.45,
      },
      {
        room: 6, type: 'combat', name: 'ห้องพิพากษา',
        desc: '⛪ Death Inquisitor หัวหน้า... ผู้พิพากษาแห่งความตาย',
        monsterId: 'death_inquisitor',
      },
      {
        room: 7, type: 'trap', name: 'อุโมงค์แห่งความสิ้นหวัง',
        desc: '🌀 พลังงานมืดสะสมจนถึงขีดสุด... ระเบิดในทุกทิศทาง ต้องต้านด้วยพลังเวทย์',
        trapDmg: 110, dodgeStat: 'mag', dodgeThreshold: 40,
        avoidMsg: '✨ ปราบพลังงานมืดด้วยพลังเวทย์! รอดมาได้!',
        hitMsg: '🌀 พลังงานมืดระเบิด... รับ {dmg} ความเสียหายอย่างหนัก',
      },
      {
        room: 8, type: 'combat', name: 'ห้องปฏิบัติการต้องห้าม',
        desc: '💀 Chaos Archon ที่ถูกสร้างขึ้นโดย Vorath... ผสมจากวิญญาณพันดวง',
        monsterId: 'chaos_archon',
      },
      {
        room: 9, type: 'combat', name: 'ห้องโถงพิธีกรรม',
        desc: '⚔️ Vorath Knight กองทหารสุดท้าย... สามนายยืนขวางทางสู่ยอดหอคอย',
        monsterId: 'vorath_knight',
      },
      {
        room: 10, type: 'rest', name: 'หอสังเกตการณ์',
        desc: '🌅 วิวจากยอดหอคอย... แม้จะเป็นโลกมืด แต่ยังพบแสงเล็กๆ ของความหวัง',
        healPercent: 0.5, healMpPercent: 0.6,
      },
      {
        room: 11, type: 'combat', name: 'ห้องรับรององค์ลอร์ด',
        desc: '⛪ Death Inquisitor ระดับสูงสุด... ผู้ช่วยเบื้องขวาของ Lord Vorath',
        monsterId: 'death_inquisitor',
      },
      {
        room: 12, type: 'combat', name: 'ยามองค์รักษ์สุดท้าย',
        desc: '💀 Chaos Archon ผู้พิทักษ์บัลลังก์... สร้างจากการรวบรวมวิญญาณนักรบที่เก่งที่สุดในประวัติศาสตร์',
        monsterId: 'chaos_archon',
      },
      {
        room: 13, type: 'rest', name: 'ห้องน้ำพุศักดิ์สิทธิ์',
        desc: '⚡ น้ำพุสีทองที่ถูกซ่อนไว้... อาจเป็นสิ่งเดียวในป้อมนี้ที่ยังดีอยู่',
        healPercent: 0.6, healMpPercent: 0.7,
      },
      {
        room: 14, type: 'boss', name: 'บัลลังก์แห่งความมืด',
        desc: '🏰 ยอดหอคอย... ร่างสูงใหญ่หันมองจากบัลลังก์ ดวงตาสีทองเรืองรองในความมืด "คุณมาถึงได้จริง... น่าทึ่งมาก แต่การเดินทางของคุณจบลงแล้ว!"',
        boss: {
          monsterId: 'lord_vorath', name: 'Lord Vorath', emoji: '🏰',
          hp: 7500, atk: 220, def: 80, spd: 30, mag: 150, hpMax: 7500,
          xpReward: 12000, goldReward: [8000, 14000],
          desc: 'Lord Vorath ราชาอมตะแห่งความมืด ผู้พยายามกลืนโลก Ashenveil ด้วยพลังแห่งความสิ้นหวัง',
          attackMsg: ['ฟาดด้วยดาบราชัน', 'ปล่อยพลังความมืดสูงสุด', 'เรียกกองทัพมารสังหาร', 'ระเบิดพลังงาน Void จากร่าง'],
          drops: [
            { itemId: 'void_crystal', chance: 1.0 },
            { itemId: 'ancient_scroll', chance: 1.0 },
            { itemId: 'blue_gem_fragment', chance: 0.9 },
          ],
          regen: 50, flee_chance: 0.0,
          statusAttack: { type: 'VOID_DRAIN', chance: 0.5, duration: 4, dmgPerTurn: 60 },
          phase2: {
            trigger: 0.5,
            atkMult: 1.8, defMult: 1.5,
            attackMsg: ['พลังสูงสุดที่ไม่เคยเปิดเผย!', 'เป็นหนึ่งกับความมืด!', 'ไม่มีใครรอดจาก Vorath แท้จริง!', 'จงยอมรับความสิ้นหวัง!'],
            phaseMsg: '🏰 LORD VORATH — FINAL FORM! พลังที่ซ่อนไว้ตลอดกาลถูกปลดปล่อย!',
          },
        },
      },
    ],
    clearRewards: {
      gold: [10000, 18000], xp: 15000,
      itemPool: ['void_crystal', 'ancient_scroll', 'blue_gem_fragment', 'crystal_shard'],
      itemCount: 5,
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

  // — City Ruins —
  abandoned_sentinel: {
    monsterId: 'abandoned_sentinel', name: 'Abandoned Sentinel', emoji: '⚙️',
    level: 10, xpReward: 88, goldReward: [28, 55],
    hp: 145, atk: 32, def: 28, spd: 5, mag: 0, hpMax: 145,
    desc: 'หุ่นยนต์รักษาการณ์โบราณที่ยังทำงานอยู่ ชุดเกราะหนักมาก DEF สูง แต่ช้า',
    attackMsg: ['กระแทกด้วยหุ่น', 'โจมตีด้วยอาวุธกล', 'สแกนและยิง', 'บดขยี้ด้วยแรงสูงสุด'],
    drops: [{ itemId: 'steel_ingot', chance: 0.5 }, { itemId: 'iron_ore', chance: 0.7 }],
    flee_chance: 0.95,
  },

  plague_rat_swarm: {
    monsterId: 'plague_rat_swarm', name: 'Plague Rat Swarm', emoji: '🐀',
    level: 11, xpReward: 75, goldReward: [15, 35],
    hp: 110, atk: 28, def: 8, spd: 18, mag: 0, hpMax: 110,
    desc: 'ฝูงหนูกาฬโรคจำนวนมหาศาล รวดเร็วมาก พิษกัดกร่อน',
    attackMsg: ['กัดรุมกัน', 'ติดโรคระบาด', 'รุมล้อม', 'กัดอย่างบ้าคลั่ง'],
    statusAttack: { type: 'POISON', chance: 0.35, duration: 3, dmgPerTurn: 8 },
    drops: [{ itemId: 'antidote', chance: 0.3 }, { itemId: 'monster_fang', chance: 0.4 }],
    flee_chance: 0.7,
  },

  grave_robber: {
    monsterId: 'grave_robber', name: 'Grave Robber', emoji: '🗡️',
    level: 12, xpReward: 105, goldReward: [40, 80],
    hp: 138, atk: 38, def: 14, spd: 16, mag: 0, hpMax: 138,
    desc: 'โจรขุดหลุมฝังศพที่หลบซ่อนในซากเมือง ลักเล็กขโมยน้อยมาตลอด ทักษะสูง',
    attackMsg: ['แทงจากหลัง', 'โยนระเบิดควัน', 'ตีด้วยไม้กายสิทธิ์', 'ฟาดด้วยมีดสั้น'],
    drops: [{ itemId: 'health_potion', chance: 0.45 }, { itemId: 'crystal_shard', chance: 0.3 }],
    flee_chance: 0.75,
  },

  // — Cursed Marshlands —
  bog_crawler: {
    monsterId: 'bog_crawler', name: 'Bog Crawler', emoji: '🦀',
    level: 18, xpReward: 175, goldReward: [55, 110],
    hp: 280, atk: 58, def: 38, spd: 6, mag: 0, hpMax: 280,
    desc: 'ปูยักษ์กลายพันธุ์จากสารพิษในหนอง เกราะแข็งแกร่งมาก เดินช้า แต่หนีบรุนแรง',
    attackMsg: ['หนีบด้วยก้ามยักษ์', 'กัดด้วยปากโต', 'ฉีดพิษหนอง', 'ยกร่างทุบพื้น'],
    statusAttack: { type: 'POISON', chance: 0.3, duration: 3, dmgPerTurn: 15 },
    drops: [{ itemId: 'iron_ore', chance: 0.6 }, { itemId: 'crystal_shard', chance: 0.4 }],
    flee_chance: 0.9,
  },

  fungal_horror: {
    monsterId: 'fungal_horror', name: 'Fungal Horror', emoji: '🍄',
    level: 19, xpReward: 165, goldReward: [45, 90],
    hp: 225, atk: 52, def: 20, spd: 4, mag: 35, hpMax: 225,
    desc: 'เห็ดยักษ์กลายพันธุ์ ปล่อยสปอร์พิษและก๊าซเมาสติต่อเนื่อง',
    attackMsg: ['ฉีดสปอร์พิษ', 'ปล่อยก๊าซเมาสติ', 'ฟาดด้วยกิ่งก้าน', 'ระเบิดสปอร์'],
    statusAttack: { type: 'POISON', chance: 0.45, duration: 4, dmgPerTurn: 18 },
    drops: [{ itemId: 'antidote', chance: 0.5 }, { itemId: 'void_crystal', chance: 0.2 }],
    flee_chance: 0.85,
  },

  marsh_witch: {
    monsterId: 'marsh_witch', name: 'Marsh Witch', emoji: '🧙',
    level: 20, xpReward: 200, goldReward: [70, 130],
    hp: 195, atk: 45, def: 15, spd: 12, mag: 62, hpMax: 195,
    desc: 'แม่มดผู้สาปหนองน้ำ ร่ายคาถาแรงสูง DEF ต่ำแต่ MAG สูงสุดใน Dungeon นี้',
    attackMsg: ['ร่ายคาถาสาป', 'ยิงลูกไฟพิษ', 'เรียกผีหนอง', 'คาถาชราภาพ'],
    statusAttack: { type: 'CURSE', chance: 0.35, duration: 3, dmgPerTurn: 20 },
    drops: [{ itemId: 'ancient_scroll', chance: 0.35 }, { itemId: 'mana_potion', chance: 0.5 }],
    flee_chance: 0.7,
  },

  // — Void Frontier —
  rift_stalker: {
    monsterId: 'rift_stalker', name: 'Rift Stalker', emoji: '🌀',
    level: 28, xpReward: 310, goldReward: [100, 200],
    hp: 380, atk: 85, def: 22, spd: 25, mag: 45, hpMax: 380,
    desc: 'นักล่าจาก Void Frontier เคลื่อนที่ผ่านรอยแยกได้ โจมตีเร็วมาก',
    attackMsg: ['โผล่จากรอยแยกโจมตี', 'ทะลุผ่านร่าง', 'เรียกรอยแยกโจมตีรุม', 'กลับเข้า Void แล้วโจมตีใหม่'],
    statusAttack: { type: 'VOID_DRAIN', chance: 0.3, duration: 2, dmgPerTurn: 25 },
    drops: [{ itemId: 'void_crystal', chance: 0.55 }, { itemId: 'crystal_shard', chance: 0.6 }],
    flee_chance: 0.55,
  },

  chaos_elemental: {
    monsterId: 'chaos_elemental', name: 'Chaos Elemental', emoji: '🌪️',
    level: 29, xpReward: 340, goldReward: [110, 220],
    hp: 350, atk: 92, def: 12, spd: 20, mag: 80, hpMax: 350,
    desc: 'ธาตุแห่งความโกลาหล ร่างประกอบด้วยพลังงานดิบจาก Void ดาเมจสูงสุดแต่ DEF ต่ำ',
    attackMsg: ['ระเบิดพลังงานดิบ', 'ปล่อยคลื่นความโกลาหล', 'ดูดพลังงาน', 'ระเบิดตัวเองชั่วคราว'],
    statusAttack: { type: 'VOID_DRAIN', chance: 0.35, duration: 2, dmgPerTurn: 30 },
    drops: [{ itemId: 'void_crystal', chance: 0.6 }, { itemId: 'blue_gem_fragment', chance: 0.25 }],
    flee_chance: 0.6,
  },

  fragment_golem: {
    monsterId: 'fragment_golem', name: 'Fragment Golem', emoji: '🪨',
    level: 30, xpReward: 380, goldReward: [130, 260],
    hp: 620, atk: 80, def: 58, spd: 3, mag: 20, hpMax: 620,
    desc: 'Golem ประกอบจากเศษหินมิติ ช้ามาก แต่ HP และ DEF สูงมาก ทุบแรงสุดๆ',
    attackMsg: ['กระแทกด้วยหมัดหิน', 'ปล่อยหินกระเด็ด', 'ลอยตัวทุบ', 'บีบด้วยหินมิติ'],
    drops: [{ itemId: 'steel_ingot', chance: 0.5 }, { itemId: 'void_crystal', chance: 0.35 }],
    flee_chance: 0.95,
  },

  // — Shadowfell Depths —
  shadow_assassin: {
    monsterId: 'shadow_assassin', name: 'Shadow Assassin', emoji: '🗡️',
    level: 38, xpReward: 520, goldReward: [180, 360],
    hp: 420, atk: 130, def: 20, spd: 38, mag: 30, hpMax: 420,
    desc: 'นักฆ่าแห่งเงา เร็วที่สุดใน Shadowfell โจมตีวิกฤตบ่อยมาก DEF ต่ำแต่หนีได้ยาก',
    attackMsg: ['โจมตีจากเงา', 'แทงจุดสำคัญ', 'แยกเป็นสองเงา', 'โจมตีวิกฤตซ้ำซาก'],
    statusAttack: { type: 'POISON', chance: 0.3, duration: 3, dmgPerTurn: 28 },
    drops: [{ itemId: 'void_crystal', chance: 0.45 }, { itemId: 'ancient_scroll', chance: 0.2 }],
    flee_chance: 0.45,
  },

  nightmare_beast: {
    monsterId: 'nightmare_beast', name: 'Nightmare Beast', emoji: '👹',
    level: 39, xpReward: 580, goldReward: [200, 400],
    hp: 680, atk: 118, def: 42, spd: 15, mag: 55, hpMax: 680,
    desc: 'สัตว์ประหลาดจากฝันร้าย กินความกลัวของเหยื่อ โจมตีจิตใจ HP และ ATK สูง',
    attackMsg: ['กัดกินความกลัว', 'โจมตีฝันร้าย', 'เรียกสยองแห่งความมืด', 'ทำให้สั่นสะท้านด้วยความกลัว'],
    statusAttack: { type: 'FEAR', chance: 0.4, duration: 3, dmgPerTurn: 32 },
    drops: [{ itemId: 'void_crystal', chance: 0.5 }, { itemId: 'crystal_shard', chance: 0.55 }],
    flee_chance: 0.65,
  },

  soul_reaper: {
    monsterId: 'soul_reaper', name: 'Soul Reaper', emoji: '💀',
    level: 40, xpReward: 650, goldReward: [220, 440],
    hp: 560, atk: 115, def: 35, spd: 18, mag: 72, hpMax: 560,
    desc: 'ผู้เก็บเกี่ยววิญญาณ เคียวยักษ์สีดำ ดูดพลังชีวิตโดยตรง',
    attackMsg: ['ฟันด้วยเคียวมรณะ', 'ดูดวิญญาณ', 'ปล่อยคลื่นมรณะ', 'เรียกวิญญาณมาช่วย'],
    statusAttack: { type: 'VOID_DRAIN', chance: 0.4, duration: 3, dmgPerTurn: 38 },
    drops: [{ itemId: 'void_crystal', chance: 0.6 }, { itemId: 'ancient_scroll', chance: 0.3 }],
    flee_chance: 0.55,
  },

  // — Vorath Citadel —
  vorath_knight: {
    monsterId: 'vorath_knight', name: 'Vorath Knight', emoji: '⚔️',
    level: 50, xpReward: 900, goldReward: [350, 700],
    hp: 1100, atk: 180, def: 85, spd: 20, mag: 40, hpMax: 1100,
    desc: 'อัศวินชั้นนำของ Lord Vorath ฝึกฝนมาหลายร้อยปี เกราะพิเศษต้านทานพลังงาน',
    attackMsg: ['ฟันด้วยดาบศักดิ์สิทธิ์มืด', 'กระแทกโล่ทลาย', 'โจมตีเต็มกำลัง', 'เทคนิคอัศวินชั้นสูง'],
    drops: [{ itemId: 'steel_ingot', chance: 0.6 }, { itemId: 'void_crystal', chance: 0.4 }],
    flee_chance: 0.8,
  },

  death_inquisitor: {
    monsterId: 'death_inquisitor', name: 'Death Inquisitor', emoji: '⛪',
    level: 51, xpReward: 980, goldReward: [380, 760],
    hp: 900, atk: 160, def: 60, spd: 22, mag: 120, hpMax: 900,
    desc: 'ผู้ไต่สวนมรณะ นักเวทย์ชั้นนำของ Vorath MAG สูงสุดใน Dungeon ชาร์จคาถาแรง',
    attackMsg: ['ร่ายคาถาไต่สวน', 'ปล่อยสายฟ้ามรณะ', 'คาถาสาปมืด', 'พิพากษาด้วยไฟนรก'],
    statusAttack: { type: 'CURSE', chance: 0.45, duration: 4, dmgPerTurn: 45 },
    drops: [{ itemId: 'ancient_scroll', chance: 0.55 }, { itemId: 'void_crystal', chance: 0.5 }],
    flee_chance: 0.7,
  },

  chaos_archon: {
    monsterId: 'chaos_archon', name: 'Chaos Archon', emoji: '💀',
    level: 52, xpReward: 1100, goldReward: [450, 900],
    hp: 1350, atk: 200, def: 70, spd: 25, mag: 100, hpMax: 1350,
    desc: 'อาร์คอนแห่งความโกลาหล สร้างจากวิญญาณพันดวง ทั้ง ATK และ MAG สูงมาก',
    attackMsg: ['ระเบิดจากวิญญาณพัน', 'ดูดพลังชีวิตทั้งหมด', 'ปล่อยพลังงาน Void สูงสุด', 'โจมตีด้วยทุกวิญญาณพร้อมกัน'],
    statusAttack: { type: 'VOID_DRAIN', chance: 0.5, duration: 4, dmgPerTurn: 55 },
    drops: [{ itemId: 'void_crystal', chance: 0.7 }, { itemId: 'blue_gem_fragment', chance: 0.5 }],
    flee_chance: 0.6,
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
