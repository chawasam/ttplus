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
