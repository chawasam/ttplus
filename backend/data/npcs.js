// data/npcs.js — NPC definitions for Ashenveil

const NPCS = {

  mira: {
    npcId: 'mira',
    name: 'Mira',
    emoji: '👩‍🦰',
    title: 'พ่อค้าสาวแห่งตลาด',
    zone: 'town_square',
    isShopkeeper: true,
    shopInventory: 'starter',

    personality: 'ยิ้มเก่ง ชอบดอกไม้ อารมณ์ดี แต่ไม่ชอบของสกปรก',

    // Affection gifts
    likes:   ['wild_flower', 'honey_jar', 'blue_gem_fragment', 'forget_me_not'],
    neutral: ['iron_ore', 'bread', 'crystal_shard'],
    hates:   ['monster_fang', 'rotten_wood', 'goblin_ear'],

    likeBonus:    8,
    neutralBonus: 2,
    hatePenalty:  5,

    bondItem: 'mira_ribbon', // custom item id (defined inline below)
    bondBonus: 'shop_discount_5pct',
    bondDesc: 'ริบบิ้นของ Mira — ลด 5% ราคาสินค้าทุกชิ้นตลอดไป',

    // Daily decay
    decayPerDay: 1,
    decayFloor: 20, // ไม่ลงต่ำกว่านี้

    // Dialog by affection tier
    dialogs: {
      0:  ['สวัสดี... ต้องการซื้อของไหมคะ?', 'ร้านเปิดอยู่นะคะ ดูเลยนะ'],
      20: ['โอ้ คุณ{name} มาอีกแล้ว! ดีใจที่เห็น', 'วันนี้มีของใหม่ๆ มาด้วยนะคะ'],
      40: ['อากาศดีจัง วันนี้เหมาะกับการไปเก็บดอกไม้เลยนะคะ~', 'คุณ{name} ชอบดอกไม้ไหมคะ? ฉันชอบมากเลย'],
      60: ['ขอบคุณที่แวะมาเสมอนะคะ คุณ{name} เป็นลูกค้าที่ดีที่สุด!', 'มีของฝากมาให้นิดหน่อยค่ะ ไม่ได้อะไรมากหรอก...'],
      80: ['คุณ{name}... ฉันรู้สึกว่าเราเป็นเพื่อนที่ดีกันมากเลยนะ', 'ถ้าต้องการความช่วยเหลืออะไร บอกได้เลยนะคะ'],
    },

    // Random special event
    specialEvent: {
      id: 'mira_sad',
      trigger: 'random', probability: 0.05, // 5% ต่อวัน
      desc: 'วันนี้ Mira ดูเศร้าผิดปกติ... ดวงตาแดงเล็กน้อย',
      questItem: 'forget_me_not',
      questMsg: 'ต้องการ Forget-me-not เพื่อปลอบ Mira',
      rewardAffection: 15,
      rewardItem: 'memory_fragment',
      timeLimit: 24 * 60 * 60 * 1000, // 24 ชั่วโมง
      failPenalty: -10,
    },
  },

  erik: {
    npcId: 'erik',
    name: 'Erik',
    emoji: '💂',
    title: 'ยามประตูเมือง',
    zone: 'town_square',
    isShopkeeper: false,

    personality: 'เข้มงวด ซื่อตรง ชอบของที่เกี่ยวกับทหาร ไม่ชอบคนโกหก',

    likes:   ['steel_ingot', 'military_ration', 'old_war_medal'],
    neutral: ['bread', 'iron_ore'],
    hates:   ['rotten_wood', 'rotten_meat', 'goblin_ear'],

    likeBonus:    8,
    neutralBonus: 2,
    hatePenalty:  5,

    bondItem: 'eriks_badge',
    bondBonus: 'unlock_secret_gate',
    bondDesc: "เหรียญของ Erik — เปิด Secret Gate ที่นำไปสู่ Forgotten Vault",

    decayPerDay: 1,
    decayFloor: 20,

    dialogs: {
      0:  ['หยุด ใครมา', 'เอกสารผ่าน? ไม่มี? แล้วจะผ่านได้ยังไง'],
      20: ['คุณ{name} ใช่ไหม คุ้นหน้ามาหน่อย ผ่านไปได้', 'ระวังตัวด้วย ชานเมืองอันตรายขึ้นเรื่อยๆ'],
      40: ['ทหารดีต้องมีอุปกรณ์ดีด้วย เห็นคุณฝึกซ้อมแล้วก็พอใจ', 'ฉันเคยรบมาก่อน ถ้าอยากรู้เรื่องยุทธวิธีถามได้'],
      60: ['คุณ{name} ไว้ใจได้ ไม่เหมือนพวกนักผจญภัยทั่วไป', 'มีรายงานมาว่าพบรอยเท้าแปลกๆ ทางเหนือ ระวังด้วยนะ'],
      80: ['ถ้าต้องการทำความดีให้เมืองนี้ ฉันมีงานให้ทำ', 'เพื่อนที่ไว้ใจได้หายากนัก คุณ{name} คือหนึ่งในนั้น'],
    },

    specialEvent: {
      id: 'erik_patrol',
      trigger: 'random', probability: 0.04,
      desc: 'Erik ดูกังวลผิดปกติ บอกว่ามีรายงานมอนสเตอร์บุกรุกชานเมือง',
      questItem: 'goblin_ear',
      questCount: 5,
      questMsg: 'Erik ขอให้ไปฆ่าโกบลิน 5 ตัว และนำหูมาพิสูจน์',
      rewardAffection: 12,
      rewardGold: 150,
      timeLimit: 48 * 60 * 60 * 1000,
      failPenalty: -8,
    },
  },

  yena: {
    npcId: 'yena',
    name: 'Yena',
    emoji: '👩‍🎓',
    title: 'นักวิชาการแห่ง Ashenveil',
    zone: 'town_square',
    isShopkeeper: false,

    personality: 'ขี้อาย รักหนังสือ ชอบความลึกลับ ไม่ชอบของที่น่ากลัว',

    likes:   ['ancient_scroll', 'crystal_shard', 'star_map_fragment'],
    neutral: ['blue_gem_fragment', 'void_crystal'],
    hates:   ['monster_fang', 'goblin_ear', 'wolf_pelt'],

    likeBonus:    10,
    neutralBonus: 2,
    hatePenalty:  6,

    bondItem: 'yenas_lens',
    bondBonus: 'skill_xp_bonus_15pct',
    bondDesc: "แว่นของ Yena — เพิ่ม Skill XP +15% ตลอดไป",

    decayPerDay: 1,
    decayFloor: 20,

    dialogs: {
      0:  ['อ๊ะ! ทำให้ตกใจเลย... ต้องการอะไรคะ?', 'ขอโทษนะ กำลังอ่านหนังสืออยู่...'],
      20: ['คุณ{name} ใช่ไหม เคยเห็นแว่บๆ นะ', 'ฉันกำลังศึกษาซากของ Ancient Gate อยู่ น่าสนใจมาก'],
      40: ['อยากรู้เรื่องประวัติศาสตร์ของ The Sundering ไหม? ฉันรู้บางส่วน...', 'ถ้าเจอ Scroll เก่าๆ เอามาให้ฉันดูได้นะ ยินดีจ่ายค่าตอบแทน'],
      60: ['คุณ{name} ช่วยได้มากเลย ฉันอยากให้รู้บางอย่าง...', 'มีทฤษฎีว่าเทพยังมีชีวิตอยู่ใน The Core แต่ยังพิสูจน์ไม่ได้'],
      80: ['ฉันไม่เคยบอกใครเรื่องนี้... แต่คุณ{name} ไว้ใจได้', 'เอกสารชิ้นนี้ถ้าแปลได้... อาจเปลี่ยนทุกอย่าง'],
    },

    specialEvent: {
      id: 'yena_research',
      trigger: 'random', probability: 0.04,
      desc: 'Yena ตื่นเต้นมาก บอกว่าพบเบาะแสสำคัญเกี่ยวกับ Ancient Gate',
      questItem: 'star_map_fragment',
      questCount: 3,
      questMsg: 'Yena ต้องการ Star Map Fragment 3 ชิ้นเพื่อถอดรหัส',
      rewardAffection: 15,
      rewardItem: 'ancient_scroll',
      rewardGold: 80,
      timeLimit: 72 * 60 * 60 * 1000,
      failPenalty: -8,
    },
  },

  // ─────────────────────────────────────────────
  //  Elder Maren — ผู้รู้แห่ง Ashenveil
  // ─────────────────────────────────────────────
  elder_maren: {
    npcId:       'elder_maren',
    name:        'Elder Maren',
    emoji:       '🧙',
    title:       'นักวิชาการผู้รอดชีวิต',
    zone:        'town_square',
    isShopkeeper: false,

    personality: 'ผู้รู้ผู้เฒ่าที่แบกความลับของ The Sundering ไว้คนเดียวมา 500 ปี ทั้งเหนื่อย ทั้งหวัง พูดช้าๆ คิดก่อนทุกคำ ไม่พูดมากกว่าที่จำเป็น',

    likes:   ['ancient_scroll', 'star_map_fragment', 'void_crystal', 'crystal_shard'],
    neutral: ['blue_gem_fragment', 'health_potion'],
    hates:   ['monster_fang', 'goblin_ear'],

    likeBonus:    10,
    neutralBonus: 2,
    hatePenalty:  5,

    bondItem: 'marens_journal',
    bondBonus: 'lore_unlock',
    bondDesc: 'บันทึกของ Elder Maren — ปลดล็อก Lore entries ลึกลับของโลก Ashenveil',

    decayPerDay: 0,  // Elder Maren ไม่ decay — เขาอยู่รอคุณเสมอ
    decayFloor:  0,

    // Generic dialog ตาม affection (ใช้ถ้าไม่มี quest ใหม่)
    dialogs: {
      0:  [
        'ยังอยู่กันไหม... ดี',
        'Ashenveil ยังพอมีความหวัง ถ้าคนอย่างคุณยังสู้',
      ],
      20: [
        'คุณ{name} ไม่เหมือนนักผจญภัยทั่วไป ฉันสังเกตเห็น',
        'มีบางอย่างในตัวคุณ... อาจเป็นเรื่องราวของ Fragment ก็ได้',
      ],
      40: [
        'ในชีวิต 200 ปีของฉัน ไม่ค่อยเห็นคนที่เติบโตเร็วแบบนี้',
        'ถ้าอยากรู้เรื่อง The Sundering มากขึ้น ฉันยังมีบันทึกที่ยังไม่ได้เปิด',
      ],
      60: [
        'ฉันเก็บความจริงไว้คนเดียวมานานเกินไปแล้ว ถึงเวลาที่ควรบอกคุณ',
        'คุณ{name}... ถ้าวันหนึ่งฉันไม่อยู่แล้ว หวังว่าคุณจะจำไว้ว่าโลกนี้เคยสวยงาม',
      ],
      80: [
        'ฉันไม่เคยคิดว่าจะมีใครที่ไว้ใจได้อีก หลังจากที่ทุกคนทิ้งไปในคืน The Sundering',
        'คุณ{name}... ดูแลตัวเองด้วยนะ เพราะโลกนี้ต้องการคุณมากกว่าที่คิด',
      ],
    },

    // ── Quest-aware dialogs ───────────────────────────────────────
    // key = stepId ของ quest (จาก story_quests.js)
    questDialogs: {
      // SQ_000 — เสียงจากใต้ดิน
      talk_maren_01: {
        lines: [
          '...คุณได้ยินไหม',
          'เสียงนั้น — ที่สั่นสะเทือนใต้พื้นดิน',
          'ฉันได้ยินมันมา 3 วันแล้ว ไม่มีใครเชื่อ',
          '"The Resonance" — นั่นคือชื่อที่บันทึกโบราณเรียกมัน',
          'มันเกิดขึ้นก่อน The Sundering ด้วย...',
          'ไปดูบริเวณชานเมืองทางตะวันออกให้หน่อยได้ไหม — ระวังด้วย',
        ],
      },
      talk_maren_02: {
        lines: [
          'กลับมาแล้ว...',
          'บอกฉันทุกอย่างที่เห็น อย่าละเว้นแม้แต่รายละเอียดเล็กน้อย',
          '...',
          'รากไม้แตกออก ดินสั่นโดยไม่มีลม ดวงตาสัตว์แปลกไป',
          'เหมือนกันเลย... เหมือนกับที่บันทึกเขียนไว้เลย',
          'นี่ไม่ใช่แค่แผ่นดินไหว ป่าทางเหนือ — ไปดูที่นั่นด้วย',
        ],
      },
      // SQ_001 — เงาในป่า
      talk_maren_03: {
        lines: [
          'หน้าคุณ... เห็นบางอย่างที่น่ากลัวใช่ไหม',
          'พูดมาเลย ฉันไม่ตกใจง่ายๆ หรอก อายุมากพอแล้ว',
          '...',
          'มันบ้า ก้าวร้าว โจมตีทุกอย่างโดยไม่มีเหตุผล',
          'Darkroot Hollow — มันคือสถานที่สุดท้ายที่ Guardian แห่งป่าอาศัยอยู่',
          'ถ้า Guardian แตกสลาย ป่าทั้งหมดจะเป็นอันตราย',
          'ฉันต้องค้นบันทึกเก่า รอก่อน...',
        ],
      },
      // SQ_002 — ห้องเก็บบันทึกที่ถูกลืม
      talk_maren_04: {
        lines: [
          'คุณเจออะไร...',
          '...',
          '...',
          'นี่คือลายมือของ High Archon Sylvara',
          '"Vorath จงใจทำให้โลกแตก เพื่อหยุด The Cycle"',
          'The Cycle คืออะไร... ฉันไม่เคยเห็นคำนี้ในบันทึกไหนเลย',
          '...',
          'Vorath ยังมีชีวิตอยู่ ฉันมั่นใจ และ Darkroot Hollow คือสัญญาณ',
          'คุณต้องเข้าไปในดันเจี้ยนนั้น — ปลดปล่อย Guardian ก่อนที่จะสายเกินไป',
        ],
      },
      // SQ_101 — เศษวิญญาณ
      talk_maren_05: {
        lines: [
          'นี่คือ...',
          '*มือสั่น*',
          'Fragment of Sylvara — ฉันไม่คิดว่าจะได้เห็นของจริงในชีวิตนี้',
          'Sylvara คือ Shard-Anchor เธอคือตัวยึด Ashenveil ไว้กับ The Realm',
          'ถ้าเธอแตกสลาย... เราทุกคนจะจมสู่ The Void พร้อมกัน',
          'มี Fragment อีก 2 ชิ้นที่กระจายอยู่ใน Shard นี้',
          'Sunken Crypts — ไปที่นั่น ก่อนที่ Malachar จะเรียกกองทัพมากกว่านี้',
        ],
      },
      // SQ_201 — คำสารภาพของขุนนาง
      talk_maren_06: {
        lines: [
          'Malachar พูดอะไรก่อนตาย...',
          'บอกมาทั้งหมด',
          '...',
          '500 ปี... Vorath รอมา 500 ปีใน The Void',
          'ความโดดเดี่ยวขนาดนั้น มันเปลี่ยนคนได้ ฉันรู้ดี',
          'แต่นั่นไม่ใช่ข้อแก้ตัว',
          'Voidspire Ruins คือประตูที่เขาใช้ส่งพลังออกมา',
          'ถ้าเราปิดประตูนั้นได้... อาจหยุด Vorath ได้ชั่วคราว',
          'ฉันจะพยายามติดต่อ Sylvara — คุณต้องพร้อมเข้า Voidspire ตลอดเวลา',
        ],
      },
      // SQ_300 — ผ่านประตูความว่างเปล่า
      talk_sylvara: {
        lines: [
          '*ดวงตา Elder Maren เปลี่ยนสีชั่วขณะ*',
          '...',
          '"ผู้กล้า... ฉันคือ Sylvara"',
          '"เวลาของฉันมีน้อยมาก Vorath ดึงพลังฉันทุกวัน"',
          '"เข้าไปใน Voidspire ทำลาย Avatar ของเขา"',
          '"นั่นจะปิดผนึกประตูชั่วคราว และฉันจะมีเวลาซ่อมแซม Shard"',
          '"แต่จำไว้ว่า... นี่ยังไม่จบ Vorath แค่ถูกผลักกลับ"',
          '*ดวงตา Elder Maren กลับมาปกติ — เขาล้มลงชั่วขณะ*',
          'ฉัน... ฉันไม่จำอะไรเลย เธอพูดอะไร...',
        ],
      },
      // SQ_301 — รุ่งอรุณใหม่
      talk_maren_final: {
        lines: [
          '...',
          '*Elder Maren โอบกอดคุณ*',
          'ฉันไม่ทำแบบนี้บ่อยๆ นะ แต่ครั้งนี้สมควร',
          'คุณรักษา Ashenveil ไว้ได้ ฉันอยู่มา 200 ปีและยังไม่เคยเห็นใครทำได้',
          'แต่จำไว้ — Vorath ยังอยู่ใน The Void เขาแค่ถูกผลักกลับ',
          'World Core ยังกระจายอยู่ใน 7 Shard ใครรวมมันได้...',
          '...อาจเป็นคนที่กำหนดชะตากรรมของโลกนี้',
          'ไปเถอะ ยังมีอีกมากที่รอคุณอยู่',
          '*เขายื่น Seal of Ashenveil ให้*',
        ],
      },

      // ── Side Quests ──
      // SSQ_002: ส่งของขวัญจาก Dakan
      deliver_gift: {
        lines: [
          'ของขวัญจาก Dakan...',
          '*หยุดนิ่งชั่วครู่*',
          'เขายังจำวันนั้นอยู่หรือ',
          'ปีที่ Shard แรกพัง ฉันกำลังจะตาย Dakan ลากฉันออกมา',
          'เขาไม่ต้องทำก็ได้ แต่เขาทำ',
          'ขอบคุณที่เป็นสื่อกลาง... บอกเขาด้วยว่าฉันโอเค',
        ],
      },
    },
  },

  // ─────────────────────────────────────────────
  //  Pita — นักทำขนมปัง
  // ─────────────────────────────────────────────
  pita: {
    npcId:       'pita',
    name:        'Pita',
    emoji:       '🧁',
    title:       'นักทำขนมปังแห่ง Town Square',
    zone:        'town_square',
    isShopkeeper: false,

    personality: 'ร่าเริง อบอุ่น ช่างพูด กลัวความมืดและสัตว์ประหลาด แต่แข็งแกร่งมากกว่าที่เห็น เก็บความกลัวไว้ใต้รอยยิ้ม',

    likes:   ['honey_jar', 'wild_flower', 'bread'],
    neutral: ['iron_ore', 'crystal_shard'],
    hates:   ['monster_fang', 'goblin_ear', 'poison_vial'],

    likeBonus:    8,
    neutralBonus: 2,
    hatePenalty:  4,

    bondItem: 'pitas_apron',
    bondBonus: 'stamina_regen_bonus',
    bondDesc: "ผ้ากันเปื้อนของ Pita — ฟื้น Stamina +1 ต่อชั่วโมงโดยอัตโนมัติ",

    decayPerDay: 1,
    decayFloor:  15,

    dialogs: {
      0:  ['สวัสดีคะ! ขนมปังสดออกเตาแล้วนะคะ', 'ยิ้มๆ ไว้ อาหารอร่อยๆ ช่วยได้เยอะเลยนะคะ'],
      20: ['คุณ{name} วันนี้ดูดีมากเลยนะคะ! มาชิมขนมปังใหม่ไหมคะ', 'ร้านฉันไม่ใหญ่ แต่ทำด้วยใจ เชื่อเถอะค่ะ'],
      40: ['คุณ{name} รู้ไหมคะว่าสูตรนี้ยายสอนมา? แม่ก็สอนต่อมา ฉันก็จะสอนต่อ...', 'ถ้าวันหนึ่งฉันมีลูก อยากสอนให้เขาทำขนมปังด้วยค่ะ'],
      60: ['คุณ{name} ฉันกลัวมืดมากนะคะ แต่ถ้าคุณอยู่ด้วย ดูเหมือนน่ากลัวน้อยลงเยอะเลย', 'มีวันหนึ่งฉันต้องกล้าเข้าป่า แต่ยังไม่ใช่วันนี้ค่ะ ฮ่าๆ'],
      80: ['คุณ{name}... ฉันเชื่อใจคุณนะคะ เล่าเรื่องนี้ให้ใครฟังไม่ได้', 'ขนมปังก้อนนี้ทำพิเศษสำหรับคุณโดยเฉพาะค่ะ'],
    },

    questDialogs: {
      // SSQ_001 — สูตรขนมปังหาย (return_pita)
      return_pita: {
        lines: [
          'โอ้! คุณเจอมันแล้วหรอคะ!',
          '*รีบคว้าและกอดแน่น*',
          'นี่คือสูตรของยาย... ฉันร้องไห้ไปทั้งคืนเลยนะคะ',
          'ใครเอาไปซ่อนในถ้ำได้ยังไง',
          'ไม่รู้หรอก แต่ขอบคุณมากๆ ค่ะ คุณ{name}',
          'รับขนมปังนี้ไปเลยนะคะ ทำเสร็จพอดีเลย',
        ],
      },
      // SSQ_007 — (side quest อื่นที่ Pita เป็น giver)
    },
  },

  // ─────────────────────────────────────────────
  //  Dakan — ทหารผ่านศึก
  // ─────────────────────────────────────────────
  dakan: {
    npcId:       'dakan',
    name:        'Dakan',
    emoji:       '⚔️',
    title:       'ทหารผ่านศึกแห่ง The Sundering',
    zone:        'town_square',
    isShopkeeper: false,

    personality: 'เงียบขรึม พูดน้อยแต่ตรงประเด็น เคยเห็นสงครามที่คนอื่นไม่เคยเห็น มีบาดแผลในใจที่ยังไม่หาย ให้ความเคารพคนที่พิสูจน์ตัวเองด้วยการกระทำ ไม่ใช่คำพูด',

    likes:   ['steel_ingot', 'old_war_medal', 'health_potion'],
    neutral: ['iron_ore', 'bread'],
    hates:   ['goblin_ear', 'rotten_wood'],

    likeBonus:    8,
    neutralBonus: 2,
    hatePenalty:  6,

    bondItem: 'dakans_blade',
    bondBonus: 'atk_bonus_flat_10',
    bondDesc: "ใบมีดของ Dakan — เพิ่ม ATK +10 ถาวร (Passive)",

    decayPerDay: 1,
    decayFloor:  10,

    dialogs: {
      0:  ['...', 'ต้องการอะไร'],
      20: ['คุณ{name} ยังอยู่รอดอยู่ ดี', 'ระวังตัวด้วย ฉันเห็นรอยเท้าแปลกๆ นอกเมือง'],
      40: ['ฉันรบมาตั้งแต่ The Sundering ไม่เคยเห็นใครสู้ได้นานเท่านี้', 'ถ้าอยากเรียน บอกมา ฉันสอนได้บางอย่าง'],
      60: ['คืนก่อน The Sundering ฉันยืนเฝ้าประตูเมืองอยู่คนเดียว... แล้วทุกอย่างก็แตก', 'ไม่เคยเล่าให้ใครฟัง แต่คุณ{name} ดูแล้วเข้าใจ'],
      80: ['ฉันเก็บสิ่งนี้มา 500 ปี... ถึงเวลาที่คนที่ไว้ใจได้ควรมีไว้', 'อย่าตาย ฉันหาคนสู้ด้วยกันไม่ได้บ่อยๆ'],
    },

    questDialogs: {
      // SSQ_002 — หนี้เลือดของทหาร (talk_dakan)
      talk_dakan: {
        lines: [
          'คุณสังหารได้ 5 ตัวแล้ว',
          'ดี ฉันไม่ส่งคนอ่อนแอไปพบคนที่ฉันเคารพ',
          '*ยื่นกล่องไม้เก่าๆ ให้*',
          'เอาของนี้ไปให้ Elder Maren',
          'ไม่ต้องบอกว่าจากใคร เขารู้เอง',
          '...',
          'แค่นั้นพอ',
        ],
      },
    },
  },

  // ─────────────────────────────────────────────
  //  Lyra — เด็กสาวแห่ง Town Square
  // ─────────────────────────────────────────────
  lyra: {
    npcId:       'lyra',
    name:        'Lyra',
    emoji:       '👧',
    title:       'เด็กสาวผู้อยากผจญภัย',
    zone:        'town_square',
    isShopkeeper: false,

    personality: 'อายุ 12 ปี อยากเป็นนักผจญภัยแต่พ่อแม่ห้าม ช่างสังเกต จำหน้าคนเก่ง รู้เรื่องข่าวลือในเมืองทุกอย่าง บางครั้งพูดความจริงที่ผู้ใหญ่ไม่กล้าพูด',

    likes:   ['wild_flower', 'honey_jar', 'forget_me_not'],
    neutral: ['bread', 'crystal_shard'],
    hates:   ['monster_fang', 'goblin_ear'],

    likeBonus:    6,
    neutralBonus: 2,
    hatePenalty:  3,

    bondItem: 'lyras_drawing',
    bondBonus: 'hidden_path_unlock',
    bondDesc: "ภาพวาดของ Lyra — แผนที่ทางลับในเมืองที่เธอค้นพบเอง",

    decayPerDay: 1,
    decayFloor:  10,

    dialogs: {
      0:  ['เฮ้! คุณเป็นนักผจญภัยใช่ไหม? เจ๋งมากเลย!', 'เคยฆ่ามอนสเตอร์ไหม? เจ็บไหม? เลือดออกไหม?'],
      20: ['คุณ{name}! ฉันเห็นคุณกลับมาจากป่า หน้าคุณเลือดออกนิดหน่อยนะ — ไม่เป็นไรใช่ไหม?', 'ฉันรู้ว่ามีเส้นทางลับอยู่หลังร้านค้า แต่ยังไม่กล้าเข้าไปคนเดียว'],
      40: ['คุณ{name} รู้ไหมว่า Elder Maren คุยกับตัวเองตอนกลางคืน? ฉันเคยแอบฟัง เขาพูดชื่อ "Sylvara" บ่อยมาก', 'ฉันอยากโตเร็วๆ จะได้ไปผจญภัยด้วยกันได้'],
      60: ['คุณ{name} ฉันฝันว่า The Void มาถึงเมืองนี้ แต่คุณยืนอยู่ตรงกลาง มันเข้ามาไม่ได้', 'ฝันแบบนั้นแปลว่าอะไรนะ?'],
      80: ['นี่คือภาพที่ฉันวาด — เป็นคุณ{name} กำลังยืนหน้าปราสาท ฉันเดาว่าสักวันคุณจะไปถึงที่นั่น', 'ฉันรู้ว่าทางลับหลายเส้น คุณ{name} เป็นคนเดียวที่ฉันไว้ใจมากพอให้บอก'],
    },

    questDialogs: {
      // SSQ_003 — ของหายในป่า (lyra quest return)
      return_lyra: {
        lines: [
          'เจอแล้วหรอ!?',
          '*วิ่งมาคว้า*',
          'สร้อยของแม่... ฉันโล่งใจมากเลย',
          'แม่บอกว่าสร้อยนี้ปกป้องคนที่สวมใส่',
          'แต่ฉันคิดว่ามันไม่จริง เพราะมันหาย',
          'แต่... คุณ{name} ก็ไปหามาคืนได้ งั้นก็เหมือนมันปกป้องอยู่ใช่ไหม?',
          '*ยิ้ม*',
        ],
      },
    },
  },

};

// Bond items (special items from NPC affection 100)
const BOND_ITEMS = {
  mira_ribbon: {
    itemId: 'mira_ribbon', name: "Mira's Ribbon", emoji: '🎀',
    grade: 'EPIC', type: 'ACCESSORY',
    desc: 'ริบบิ้นสีชมพูที่ Mira ผูกให้ด้วยมือตัวเอง ลด 5% ราคาสินค้า NPC',
    passiveBonus: { shop_discount: 0.05 },
    obtainFrom: 'mira affection 100',
  },
  eriks_badge: {
    itemId: 'eriks_badge', name: "Erik's Badge", emoji: '🎖️',
    grade: 'EPIC', type: 'ACCESSORY',
    desc: 'เหรียญของ Erik เปิดทาง Secret Gate สู่ Forgotten Vault',
    passiveBonus: { unlock: 'forgotten_vault' },
    obtainFrom: 'erik affection 100',
  },
  yenas_lens: {
    itemId: 'yenas_lens', name: "Yena's Lens", emoji: '🔍',
    grade: 'EPIC', type: 'ACCESSORY',
    desc: 'แว่นขยายของ Yena เพิ่ม Skill XP +15% ตลอดไป',
    passiveBonus: { skill_xp_bonus: 0.15 },
    obtainFrom: 'yena affection 100',
  },
};

// Gift rewards (ของที่ NPC ให้กลับ ตอน affection tier ขึ้น)
const TIER_GIFT_BACK = {
  mira:  { 40: null, 60: 'bread', 80: 'wild_flower' },
  erik:  { 40: null, 60: 'military_ration', 80: 'health_potion_small' },
  yena:  { 40: null, 60: 'antidote', 80: 'blue_gem_fragment' },
};

function getNPC(npcId) {
  return NPCS[npcId] || null;
}

function getAllNPCs() {
  return Object.values(NPCS);
}

function getGiftReaction(npcId, itemId) {
  const npc = NPCS[npcId];
  if (!npc) return null;
  if (npc.likes.includes(itemId))   return { type: 'like',    delta: npc.likeBonus };
  if (npc.hates.includes(itemId))   return { type: 'hate',    delta: -npc.hatePenalty };
  if (npc.neutral.includes(itemId)) return { type: 'neutral', delta: npc.neutralBonus };
  return { type: 'unknown', delta: 0 };
}

// Affection tier: 0, 20, 40, 60, 80
function getAffectionTier(affection) {
  if (affection >= 80) return 80;
  if (affection >= 60) return 60;
  if (affection >= 40) return 40;
  if (affection >= 20) return 20;
  return 0;
}

module.exports = { NPCS, BOND_ITEMS, TIER_GIFT_BACK, getNPC, getAllNPCs, getGiftReaction, getAffectionTier };
