// data/rp_shop.js — Realm Points shop catalog
// RP ได้จาก: gift ใน TikTok Live (10 diamonds = 1 RP) หรือดูสตรีม (1 RP/5 นาที)

const RP_SHOP_ITEMS = [

  // ──── BOOSTS (ใช้แล้วหมด แต่เปลี่ยนเกมได้ทันที) ───────────────
  {
    id:       'rp_xp_boost',
    name:     '⭐ XP Boost ×2 (1 ชั่วโมง)',
    desc:     'เพิ่ม XP ที่ได้จากการต่อสู้ทุกครั้ง ×2 เป็นเวลา 1 ชั่วโมง — คุ้มสุดถ้า grind นาน',
    category: 'consumable',
    rpPrice:  80,
    itemId:   null,
    effect:   { type: 'xp_boost', multiplier: 2, durationMs: 3600000 },
    emoji:    '⭐',
  },
  {
    id:       'rp_gold_boost',
    name:     '💰 Gold Boost ×2 (30 นาที)',
    desc:     'Gold ที่ได้จากมอนสเตอร์ทุกตัว ×2 เป็นเวลา 30 นาที',
    category: 'consumable',
    rpPrice:  60,
    itemId:   null,
    effect:   { type: 'gold_boost', multiplier: 2, durationMs: 1800000 },
    emoji:    '💰',
  },
  {
    id:       'rp_stamina_elixir',
    name:     '⚡ ยาฟื้นฟู Stamina เต็ม',
    desc:     'ฟื้นฟู Stamina 100% ทันที — คุ้มมากถ้าอยากเล่นต่อโดยไม่รอ',
    category: 'consumable',
    rpPrice:  50,
    itemId:   'stamina_elixir',
    qty:      1,
    emoji:    '⚡',
  },
  {
    id:       'rp_health_pack',
    name:     '🧪 ชุดยาพรีเมียม',
    desc:     'Health Potion ×5 + Mana Potion ×3 + Antidote ×2 — คุ้มกว่าซื้อแยก',
    category: 'consumable',
    rpPrice:  90,
    itemId:   null,
    bundle:   [
      { itemId: 'health_potion_medium', qty: 5 },
      { itemId: 'mana_potion',          qty: 3 },
      { itemId: 'antidote',             qty: 2 },
    ],
    emoji:    '🧪',
  },

  // ──── PREMIUM BOXES ────────────────────────────────────────────
  {
    id:       'rp_rare_box',
    name:     '📦 กล่องอุปกรณ์ RARE',
    desc:     'สุ่มอาวุธหรือเกราะ RARE 1 ชิ้น — รับประกัน RARE ขึ้นไป',
    category: 'premium_box',
    rpPrice:  200,
    itemId:   null,
    pool:     ['iron_sword', 'ash_staff', 'leather_armor', 'tower_shield', 'chainmail_chest'],
    poolGrade: 'RARE',
    emoji:    '📦',
  },
  {
    id:       'rp_epic_box',
    name:     '💠 กล่องอุปกรณ์ EPIC',
    desc:     'สุ่มอาวุธหรือเกราะ EPIC 1 ชิ้น — หายากมาก ไม่มีขายในร้านค้าปกติ',
    category: 'premium_box',
    rpPrice:  500,
    itemId:   null,
    pool:     ['iron_sword', 'ash_staff', 'tower_shield', 'chainmail_chest'],
    poolGrade: 'EPIC',
    emoji:    '💠',
  },
  {
    id:       'rp_material_bundle',
    name:     '📜 ชุดวัสดุหายาก',
    desc:     'Ancient Scroll ×3 + Void Crystal ×5 + Soul Gem ×1 — วัสดุ endgame รวมกัน',
    category: 'premium_box',
    rpPrice:  350,
    itemId:   null,
    bundle:   [
      { itemId: 'ancient_scroll', qty: 3 },
      { itemId: 'void_crystal',   qty: 5 },
      { itemId: 'soul_gem',       qty: 1 },
    ],
    emoji:    '📜',
  },

  // ──── PERMANENT UPGRADES ────────────────────────────────────────
  {
    id:       'rp_inventory_expansion',
    name:     '🎒 ขยาย Inventory +10',
    desc:     'เพิ่มช่องเก็บไอเทมถาวร +10 ช่อง — ซื้อได้สูงสุด 3 ครั้ง',
    category: 'upgrade',
    rpPrice:  300,
    itemId:   null,
    effect:   { type: 'inventory_expand', amount: 10 },
    maxOwn:   3,
    emoji:    '🎒',
  },
  {
    id:       'rp_stat_reroll',
    name:     '🎲 Stat Reroll Scroll',
    desc:     'รีโรล stat ที่ได้จาก Level Up ครั้งล่าสุด 1 ครั้ง — ให้โอกาสใหม่ถ้า stat ไม่ถูกใจ',
    category: 'upgrade',
    rpPrice:  250,
    itemId:   'ancient_scroll',
    qty:      1,
    emoji:    '🎲',
  },

  // ──── CHARACTER SERVICES ────────────────────────────────────────
  {
    id:       'rp_class_change',
    name:     '⚗️ Class Change Scroll',
    desc:     'เปลี่ยน Class ตัวละครได้ 1 ครั้ง (Warrior/Mage/Archer) — Skills ที่ unlock แล้วจะหายต้อง unlock ใหม่',
    category: 'service',
    rpPrice:  800,
    itemId:   null,
    effect:   { type: 'class_change' },
    oneTime:  false,
    emoji:    '⚗️',
  },
  {
    id:       'rp_name_change',
    name:     '✍️ เปลี่ยนชื่อตัวละคร',
    desc:     'เปลี่ยนชื่อตัวละครได้ 1 ครั้ง — ชื่อใหม่ต้องตรวจ filter ไม่เหมาะสม',
    category: 'service',
    rpPrice:  400,
    itemId:   null,
    effect:   { type: 'name_change' },
    emoji:    '✍️',
  },

  // ──── RACE UNLOCKS ────────────────────────────────────────────
  {
    id:       'rp_race_elf',
    name:     '🌿 ปลดล็อค Race: Elf',
    desc:     'Elf: INT+15, AGI+10, MP+50% — เหมาะกับ Mage สุดๆ สาย Magic damage',
    category: 'race_unlock',
    rpPrice:  500,
    itemId:   null,
    raceId:   'elf',
    oneTime:  true,
    emoji:    '🌿',
  },
  {
    id:       'rp_race_demon',
    name:     '😈 ปลดล็อค Race: Demon',
    desc:     'Demon: STR+20, lifesteal 8%, HP-15% — ก้าวร้าวสูง ถ้าไม่ตายก่อนจะแข็งแกร่งมาก',
    category: 'race_unlock',
    rpPrice:  800,
    itemId:   null,
    raceId:   'demon',
    oneTime:  true,
    emoji:    '😈',
  },
  {
    id:       'rp_race_void',
    name:     '🌌 ปลดล็อค Race: Void Born',
    desc:     'Void Born: All Stats+25%, HP-20%, ภูมิคุ้มกัน POISON — race หายากสุดในเกม สำหรับผู้เล่นระดับสูง',
    category: 'race_unlock',
    rpPrice:  1500,
    itemId:   null,
    raceId:   'void_born',
    oneTime:  true,
    emoji:    '🌌',
  },
  {
    id:       'rp_race_shadowkin',
    name:     '🌑 ปลดล็อค Race: Shadowkin',
    desc:     'Shadowkin: AGI+30, DEF+10, DODGE+15% — สายหลบหลีก เหมาะกับ Archer ที่ไม่อยากโดนตี',
    category: 'race_unlock',
    rpPrice:  1200,
    itemId:   null,
    raceId:   'shadowkin',
    oneTime:  true,
    emoji:    '🌑',
  },

  // ──── TITLES / COSMETICS ────────────────────────────────────────
  {
    id:       'rp_title_supporter',
    name:     '🎖️ [Ashenveil Supporter]',
    desc:     'Title พิเศษบน Leaderboard — แสดงว่าคุณสนับสนุนเกมจากต้น',
    category: 'cosmetic',
    rpPrice:  200,
    itemId:   null,
    titleId:  'ashenveil_supporter',
    oneTime:  true,
    emoji:    '🎖️',
  },
  {
    id:       'rp_title_vj_champion',
    name:     '💎 [VJ\'s Champion]',
    desc:     'Title สำหรับ top supporter ของ VJ — เห็นชัดบน Leaderboard',
    category: 'cosmetic',
    rpPrice:  300,
    itemId:   null,
    titleId:  'vj_champion',
    oneTime:  true,
    emoji:    '💎',
  },
  {
    id:       'rp_title_void_walker',
    name:     '🌀 [Void Walker]',
    desc:     'Title สำหรับผู้ที่เดินทางถึง Void Frontier — แสดงถึงความก้าวหน้า',
    category: 'cosmetic',
    rpPrice:  400,
    itemId:   null,
    titleId:  'void_walker',
    oneTime:  true,
    emoji:    '🌀',
  },
  {
    id:       'rp_title_shadow_lord',
    name:     '🌑 [Shadow Lord]',
    desc:     'Title หายาก — สำหรับผู้ที่พิชิต Shadow Archon แห่ง Shadowfell Depths',
    category: 'cosmetic',
    rpPrice:  600,
    itemId:   null,
    titleId:  'shadow_lord',
    oneTime:  true,
    emoji:    '🌑',
  },
  {
    id:       'rp_title_vorath_slayer',
    name:     '👁️ [Vorath\'s Bane]',
    desc:     'Title สูงสุดในเกม — สำหรับผู้ที่เผชิญกับ Avatar of Vorath',
    category: 'cosmetic',
    rpPrice:  1000,
    itemId:   null,
    titleId:  'vorath_slayer',
    oneTime:  true,
    emoji:    '👁️',
  },
];

function getRPShopItem(id) {
  return RP_SHOP_ITEMS.find(i => i.id === id) || null;
}

function getRPShopByCategory(category) {
  return RP_SHOP_ITEMS.filter(i => i.category === category);
}

module.exports = { RP_SHOP_ITEMS, getRPShopItem, getRPShopByCategory };
