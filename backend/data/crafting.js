// data/crafting.js — Crafting recipes for Ashenveil
// วัสดุส่วนใหญ่ได้จาก Zone Boss drops + monster drops

const RECIPES = [

  // ─────────────────────────────────────────────────────────────────
  // TIER 1 — ทำได้จาก Zone 1-2 Boss drops
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_goblin_king_blade',
    name:        '🗡️ Goblin King Blade',
    desc:        'ดาบที่ทำจากตราของ Goblin King — ATK สูงกว่าอาวุธ Uncommon ทั่วไป',
    resultItemId: 'iron_sword',  // reuse existing item, override grade in crafting grant
    resultGrade:  'UNCOMMON',
    category:    'weapon',
    levelReq:    5,
    ingredients: [
      { itemId: 'goblin_king_seal', qty: 1 },
      { itemId: 'iron_ore',         qty: 3 },
      { itemId: 'monster_fang',     qty: 2 },
    ],
    goldCost: 100,
    emoji: '🗡️',
  },
  {
    recipeId:    'craft_treant_staff',
    name:        '🌿 Treant Elder Staff',
    desc:        'Staff ที่สกัดจาก Heartwood ของ Elder Treant — INT+8, MP+30 และ HP Regen เล็กน้อย',
    resultItemId: 'ash_staff',
    resultGrade:  'RARE',
    category:    'weapon',
    levelReq:    10,
    ingredients: [
      { itemId: 'treant_heartwood', qty: 1 },
      { itemId: 'wild_flower',      qty: 5 },
      { itemId: 'ancient_scroll',   qty: 1 },
    ],
    goldCost: 250,
    emoji: '🌿',
  },

  // ─────────────────────────────────────────────────────────────────
  // TIER 2 — Zone 3-4 Boss drops
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_crystal_troll_shield',
    name:        '💎 Crystal Troll Bulwark',
    desc:        'โล่ที่ทำจากหัวใจ Crystal Troll — DEF+20, HP+50 และ 10% chance block',
    resultItemId: 'tower_shield',
    resultGrade:  'RARE',
    category:    'armor',
    levelReq:    14,
    ingredients: [
      { itemId: 'troll_crystal_heart', qty: 1 },
      { itemId: 'crystal_shard',       qty: 5 },
      { itemId: 'steel_ingot',         qty: 3 },
    ],
    goldCost: 350,
    emoji: '💎',
  },
  {
    recipeId:    'craft_prime_golem_chestplate',
    name:        '🤖 Prime Golem Chestplate',
    desc:        'เกราะอกจาก Iron Golem Prime — DEF+35, STR+5 แต่ SPD-3',
    resultItemId: 'chainmail_chest',
    resultGrade:  'EPIC',
    category:    'armor',
    levelReq:    20,
    ingredients: [
      { itemId: 'prime_golem_core', qty: 1 },
      { itemId: 'steel_ingot',      qty: 8 },
      { itemId: 'iron_ore',         qty: 10 },
      { itemId: 'ancient_scroll',   qty: 2 },
    ],
    goldCost: 600,
    emoji: '🤖',
  },

  // ─────────────────────────────────────────────────────────────────
  // TIER 3 — Zone 5 (Marsh) Boss drops
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_hydra_poison_bow',
    name:        '🐍 Hydra Venom Bow',
    desc:        'ธนูที่เคลือบพิษ Hydra — ATK+30, ทุกการโจมตีมี 25% ติด POISON (3t, 20dmg/t)',
    resultItemId: 'hunters_bow',
    resultGrade:  'EPIC',
    category:    'weapon',
    levelReq:    28,
    ingredients: [
      { itemId: 'hydra_venom_sac', qty: 1 },
      { itemId: 'bog_scale',       qty: 4 },
      { itemId: 'void_crystal',    qty: 2 },
      { itemId: 'ancient_scroll',  qty: 2 },
    ],
    goldCost: 800,
    emoji: '🐍',
  },
  {
    recipeId:    'craft_hydra_antidote_vial',
    name:        '🧪 Hydra Antidote Vial ×5',
    desc:        'ยาแก้พิษพลังสูงที่ทำจากพิษ Hydra — ผลิต 5 ขวดต่อครั้ง',
    resultItemId: 'antidote',
    resultQty:    5,
    resultGrade:  'UNCOMMON',
    category:    'consumable',
    levelReq:    20,
    ingredients: [
      { itemId: 'hydra_venom_sac', qty: 1 },
      { itemId: 'wild_flower',     qty: 8 },
      { itemId: 'honey_jar',       qty: 3 },
    ],
    goldCost: 200,
    emoji: '🧪',
  },

  // ─────────────────────────────────────────────────────────────────
  // TIER 4 — Zone 6 (Void) Boss drops
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_void_herald_robe',
    name:        '🌀 Void Herald Robe',
    desc:        'เสื้อคลุม Void — INT+25, MAG+20, HP-10% แต่ Magic Damage +40%',
    resultItemId: 'shadow_robe',
    resultGrade:  'LEGENDARY',
    category:    'armor',
    levelReq:    38,
    ingredients: [
      { itemId: 'void_herald_sigil', qty: 1 },
      { itemId: 'void_essence',      qty: 3 },
      { itemId: 'soul_gem',          qty: 2 },
      { itemId: 'chaos_shard',       qty: 3 },
      { itemId: 'ancient_scroll',    qty: 3 },
    ],
    goldCost: 2000,
    emoji: '🌀',
  },
  {
    recipeId:    'craft_void_annihilator',
    name:        '⚡ Void Annihilator',
    desc:        "Staff ที่สร้างจาก Sigil ของ Herald — MAG+40, ATK+15, ทุกสกิล Magic เพิ่ม Damage 30%",
    resultItemId: 'ash_staff',
    resultGrade:  'LEGENDARY',
    category:    'weapon',
    levelReq:    38,
    ingredients: [
      { itemId: 'void_herald_sigil', qty: 1 },
      { itemId: 'void_crystal',      qty: 5 },
      { itemId: 'soul_gem',          qty: 3 },
      { itemId: 'titan_core',        qty: 1 },
    ],
    goldCost: 3000,
    emoji: '⚡',
  },

  // ─────────────────────────────────────────────────────────────────
  // TIER 5 — Zone 7-8 Boss drops (Shadow/Vorath)
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_shadow_archon_blade',
    name:        '🌑 Shadow Archon Blade',
    desc:        'อาวุธสูงสุดของ Shadow Warriors — ATK+60, AGI+20, 15% Lifesteal',
    resultItemId: 'iron_sword',
    resultGrade:  'LEGENDARY',
    category:    'weapon',
    levelReq:    48,
    ingredients: [
      { itemId: 'shadow_archon_essence', qty: 1 },
      { itemId: 'void_essence',          qty: 5 },
      { itemId: 'chaos_shard',           qty: 5 },
      { itemId: 'soul_gem',              qty: 4 },
      { itemId: 'ancient_scroll',        qty: 5 },
    ],
    goldCost: 5000,
    emoji: '🌑',
  },
  {
    recipeId:    'craft_vorath_relic',
    name:        '👁️ Eye of Vorath (Relic)',
    desc:        'Relic สูงสุดในเกม — All Stats +30%, XP +20%, ทุก Kill มีโอกาส drop วัสดุ Rare เพิ่ม',
    resultItemId: 'void_dagger',
    resultGrade:  'MYTHIC',
    category:    'relic',
    levelReq:    55,
    ingredients: [
      { itemId: 'vorath_tear',           qty: 1 },
      { itemId: 'shadow_archon_essence', qty: 1 },
      { itemId: 'void_herald_sigil',     qty: 1 },
      { itemId: 'titan_core',            qty: 2 },
      { itemId: 'soul_gem',              qty: 5 },
      { itemId: 'void_essence',          qty: 10 },
    ],
    goldCost: 10000,
    emoji: '👁️',
  },

  // ─────────────────────────────────────────────────────────────────
  // BASIC RECIPES — ไม่ต้องการ Boss drops
  // ─────────────────────────────────────────────────────────────────
  {
    recipeId:    'craft_health_potion_large',
    name:        '🧪 Large Health Potion ×3',
    desc:        'ยาฟื้นฟู HP ขนาดใหญ่ — ฟื้นฟู 300 HP ต่อขวด ผลิต 3 ขวด',
    resultItemId: 'health_potion_large',
    resultQty:    3,
    resultGrade:  'UNCOMMON',
    category:    'consumable',
    levelReq:    1,
    ingredients: [
      { itemId: 'wild_flower', qty: 5 },
      { itemId: 'honey_jar',   qty: 2 },
      { itemId: 'monster_fang', qty: 1 },
    ],
    goldCost: 30,
    emoji: '🧪',
  },
  {
    recipeId:    'craft_iron_sword',
    name:        '⚔️ Iron Sword',
    desc:        'ดาบเหล็กพื้นฐาน — ATK+10 เหมาะกับ Warrior มือใหม่',
    resultItemId: 'iron_sword',
    resultGrade:  'COMMON',
    category:    'weapon',
    levelReq:    1,
    ingredients: [
      { itemId: 'iron_ore',    qty: 5 },
      { itemId: 'monster_fang', qty: 2 },
    ],
    goldCost: 50,
    emoji: '⚔️',
  },
  {
    recipeId:    'craft_enhancement_stone',
    name:        '💠 Enhancement Stone',
    desc:        'หินเสริมสำหรับ Enhance อุปกรณ์ — สร้างจากวัสดุทั่วไป',
    resultItemId: 'enhance_stone',
    resultQty:    1,
    resultGrade:  'UNCOMMON',
    category:    'material',
    levelReq:    5,
    ingredients: [
      { itemId: 'crystal_shard', qty: 3 },
      { itemId: 'iron_ore',      qty: 5 },
    ],
    goldCost: 80,
    emoji: '💠',
  },
  {
    recipeId:    'craft_mana_potion_bundle',
    name:        '💧 Mana Potion ×5',
    desc:        'ยาฟื้นฟู MP ×5 — ผลิตถูกกว่าซื้อร้านค้า',
    resultItemId: 'mana_potion',
    resultQty:    5,
    resultGrade:  'COMMON',
    category:    'consumable',
    levelReq:    1,
    ingredients: [
      { itemId: 'wild_flower', qty: 8 },
      { itemId: 'honey_jar',   qty: 1 },
    ],
    goldCost: 20,
    emoji: '💧',
  },
];

function getRecipe(recipeId) {
  return RECIPES.find(r => r.recipeId === recipeId) || null;
}

function getRecipesByCategory(category) {
  return RECIPES.filter(r => r.category === category);
}

function getAvailableRecipes(playerLevel) {
  return RECIPES.filter(r => r.levelReq <= playerLevel);
}

module.exports = { RECIPES, getRecipe, getRecipesByCategory, getAvailableRecipes };
