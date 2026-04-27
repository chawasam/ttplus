// data/daily_shop.js — Daily Shop rotating items
// Shop หมุนใหม่ทุกวัน 00:00 UTC — seed จาก date string
// แต่ละวันมี 6 slots: 3 gear/consumable + 2 material + 1 "deal of the day" (ลด 30%)

const DAILY_SHOP_POOL = [
  // ─── Weapons ───
  { itemId: 'iron_sword',        price: 350,  category: 'gear' },
  { itemId: 'worn_dagger',       price: 280,  category: 'gear' },
  { itemId: 'apprentice_staff',  price: 380,  category: 'gear' },
  { itemId: 'short_bow',         price: 320,  category: 'gear' },
  { itemId: 'rusted_axe',        price: 260,  category: 'gear' },
  { itemId: 'rune_chisel',       price: 420,  category: 'gear' },
  { itemId: 'shadow_dagger',     price: 800,  category: 'gear' },
  { itemId: 'void_dagger',       price: 1200, category: 'gear' },

  // ─── Armor ───
  { itemId: 'leather_cap',       price: 180,  category: 'gear' },
  { itemId: 'leather_chest',     price: 280,  category: 'gear' },
  { itemId: 'leather_gloves',    price: 160,  category: 'gear' },
  { itemId: 'leather_legs',      price: 200,  category: 'gear' },
  { itemId: 'leather_boots',     price: 170,  category: 'gear' },
  { itemId: 'iron_helmet',       price: 450,  category: 'gear' },
  { itemId: 'iron_chest',        price: 700,  category: 'gear' },
  { itemId: 'wooden_shield',     price: 350,  category: 'gear' },
  { itemId: 'copper_ring',       price: 400,  category: 'gear' },
  { itemId: 'chainmail_fragment',price: 300,  category: 'gear' },

  // ─── Consumables ───
  { itemId: 'health_potion_small',  price: 80,  category: 'consumable' },
  { itemId: 'health_potion_medium', price: 180, category: 'consumable' },
  { itemId: 'health_potion_large',  price: 350, category: 'consumable' },
  { itemId: 'mp_potion_small',      price: 90,  category: 'consumable' },
  { itemId: 'mp_potion_medium',     price: 200, category: 'consumable' },
  { itemId: 'antidote',             price: 120, category: 'consumable' },
  { itemId: 'military_ration',      price: 60,  category: 'consumable' },
  { itemId: 'bread',                price: 40,  category: 'consumable' },

  // ─── Materials ───
  { itemId: 'iron_ore',           price: 150,  category: 'material' },
  { itemId: 'steel_ingot',        price: 280,  category: 'material' },
  { itemId: 'crystal_shard',      price: 200,  category: 'material' },
  { itemId: 'ancient_scroll',     price: 350,  category: 'material' },
  { itemId: 'blue_gem_fragment',  price: 120,  category: 'material' },
  { itemId: 'void_crystal',       price: 500,  category: 'material' },
  { itemId: 'shadow_cloth',       price: 380,  category: 'material' },
  { itemId: 'golem_core',         price: 600,  category: 'material' },
  { itemId: 'soul_gem',           price: 800,  category: 'material' },
  { itemId: 'memory_fragment',    price: 450,  category: 'material' },
  { itemId: 'guardian_stone',     price: 300,  category: 'material' },
  { itemId: 'black_stone_weapon', price: 600,  category: 'material' },
  { itemId: 'black_stone_armor',  price: 600,  category: 'material' },
];

// ─── Seeded pseudo-random (Mulberry32) ───────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function dateSeed(dateStr) {
  // "2026-04-25" → numeric seed
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ─── สุ่ม n รายการแบบไม่ซ้ำ ──────────────────────────────────────────────────
function pickN(pool, n, rand) {
  const arr = [...pool];
  const result = [];
  for (let i = 0; i < n && arr.length > 0; i++) {
    const idx = Math.floor(rand() * arr.length);
    result.push(arr.splice(idx, 1)[0]);
  }
  return result;
}

// ─── Main export ─────────────────────────────────────────────────────────────
function getDailyShopItems(dateStr) {
  const rand   = mulberry32(dateSeed(dateStr));
  const gears  = DAILY_SHOP_POOL.filter(x => x.category === 'gear');
  const cons   = DAILY_SHOP_POOL.filter(x => x.category === 'consumable');
  const mats   = DAILY_SHOP_POOL.filter(x => x.category === 'material');

  const picked = [
    ...pickN(gears, 2, rand),  // 2 gear
    ...pickN(cons,  1, rand),  // 1 consumable
    ...pickN(mats,  2, rand),  // 2 material
    ...pickN(gears, 1, rand),  // 1 deal of the day (from gear)
  ];

  // Slot 6 = deal of the day (30% off)
  const dealIdx = 5;
  return picked.map((item, i) => ({
    slotId:    i,
    itemId:    item.itemId,
    price:     i === dealIdx ? Math.floor(item.price * 0.7) : item.price,
    origPrice: i === dealIdx ? item.price : null,
    isDeal:    i === dealIdx,
    category:  item.category,
  }));
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
}

module.exports = { getDailyShopItems, getTodayStr };
