// data/rp_shop.js — Realm Points shop catalog
// RP ได้จาก: gift ใน TikTok Live (10 diamonds = 1 RP) หรือดูสตรีม (1 RP/5 นาที)

const RP_SHOP_ITEMS = [

  // ──── CONSUMABLES ────────────────────────────────────────
  {
    id:       'rp_stamina_elixir',
    name:     '⚡ ยาฟื้นฟู Stamina',
    desc:     'ฟื้นฟู Stamina 100 ทันที — คุ้มมากถ้าอยากเล่นต่อโดยไม่รอ',
    category: 'consumable',
    rpPrice:  50,
    itemId:   'stamina_elixir',    // item ที่จะได้รับ
    qty:      1,
    emoji:    '⚡',
  },
  {
    id:       'rp_health_pack',
    name:     '🧪 ชุดยาพรีเมียม',
    desc:     'Health Potion ×3 + Mana Potion ×2 + Antidote ×1',
    category: 'consumable',
    rpPrice:  80,
    itemId:   null,                // บันเดิล — handle พิเศษใน handler
    bundle:   [
      { itemId: 'health_potion', qty: 3 },
      { itemId: 'mana_potion',   qty: 2 },
      { itemId: 'antidote',      qty: 1 },
    ],
    emoji:    '🧪',
  },
  {
    id:       'rp_rare_box',
    name:     '📦 กล่องอาวุธหายาก',
    desc:     'เปิดกล่องรับอาวุธ RARE ขึ้นไป 1 ชิ้น แบบสุ่มจากทั้งหมด',
    category: 'premium_box',
    rpPrice:  150,
    itemId:   null,
    bundle:   null,
    pool:     ['iron_sword', 'ash_staff', 'leather_armor', 'tower_shield'], // ตัวอย่าง
    poolGrade: 'RARE',
    emoji:    '📦',
  },
  {
    id:       'rp_ancient_scroll',
    name:     '📜 Ancient Scroll',
    desc:     'ใช้ unlock ability หรือเพิ่ม bonus ให้ตัวละคร — หายากมากในเกม',
    category: 'material',
    rpPrice:  100,
    itemId:   'ancient_scroll',
    qty:      1,
    emoji:    '📜',
  },

  // ──── RACE UNLOCKS ────────────────────────────────────────
  {
    id:       'rp_race_elf',
    name:     '🌿 ปลดล็อค Race: Elf',
    desc:     'Elf: +20% Magic damage, +10% Mana regen — ต้องซื้อ 1 ครั้งต่อบัญชี',
    category: 'race_unlock',
    rpPrice:  500,
    itemId:   null,
    raceId:   'elf',
    oneTime:  true,              // ซื้อได้แค่ครั้งเดียว
    emoji:    '🌿',
  },
  {
    id:       'rp_race_demon',
    name:     '😈 ปลดล็อค Race: Demon',
    desc:     'Demon: +25% Attack, -10% Defense, lifesteal 5% — ต้องซื้อ 1 ครั้งต่อบัญชี',
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
    desc:     'Void Born: +30% ทุก stat แต่ HP สูงสุด -20% — race หายากสุดในเกม',
    category: 'race_unlock',
    rpPrice:  1500,
    itemId:   null,
    raceId:   'void_born',
    oneTime:  true,
    emoji:    '🌌',
  },

  // ──── COSMETICS / TITLES ────────────────────────────────
  {
    id:       'rp_title_supporter',
    name:     '🎖️ ตำแหน่ง: Ashenveil Supporter',
    desc:     'Title พิเศษที่แสดงบน leaderboard ว่าคุณเป็น supporter ของเกม',
    category: 'cosmetic',
    rpPrice:  200,
    itemId:   null,
    titleId:  'ashenveil_supporter',
    oneTime:  true,
    emoji:    '🎖️',
  },
  {
    id:       'rp_title_vj_fan',
    name:     '💎 ตำแหน่ง: VJ\'s Champion',
    desc:     'Title แสดงว่าคุณเป็น champion ของ VJ ที่คุณติดตาม',
    category: 'cosmetic',
    rpPrice:  300,
    itemId:   null,
    titleId:  'vj_champion',
    oneTime:  true,
    emoji:    '💎',
  },
];

function getRPShopItem(id) {
  return RP_SHOP_ITEMS.find(i => i.id === id) || null;
}

function getRPShopByCategory(category) {
  return RP_SHOP_ITEMS.filter(i => i.category === category);
}

module.exports = { RP_SHOP_ITEMS, getRPShopItem, getRPShopByCategory };
