// data/featured_dungeon.js — Weekly Featured Dungeon rotation
// Rotates every Monday (ISO week). Same dungeon for all players within a week.
// Bonus: 1.5x XP, 1.5x Gold, +1 guaranteed bonus item (once per week per player)

'use strict';

// All eligible dungeons for Featured rotation (not Vorath Citadel — that's endgame)
const FEATURED_POOL = [
  'darkroot_hollow',
  'sunken_crypts',
  'voidspire_ruins',
  'city_ruins',
  'cursed_marshlands',
  'void_frontier',
  'shadowfell_depths',
];

// Bonus item pool awarded on featured clear
const FEATURED_BONUS_ITEMS = [
  'chaos_shard',
  'void_crystal',
  'memory_fragment',
  'ancient_scroll',
  'guardian_stone',
  'enhancement_stone',
];

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────
function mulberry32(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t |= 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a hash of a string → 32-bit unsigned int
function hashStr(s) {
  let h = 0x811C9DC5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h;
}

// ISO week string: e.g. "2026-W17"
function getISOWeekStr(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;  // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Return { dungeonId, weekStr, bonusItems, xpMultiplier, goldMultiplier }
function getFeaturedDungeon(weekStr) {
  const ws = weekStr || getISOWeekStr();
  const seed = hashStr(ws);
  const rng  = mulberry32(seed);
  const idx  = Math.floor(rng() * FEATURED_POOL.length);
  const dungeonId = FEATURED_POOL[idx];

  // Pick 1 guaranteed bonus item deterministically
  const bonusIdx  = Math.floor(rng() * FEATURED_BONUS_ITEMS.length);
  const bonusItem = FEATURED_BONUS_ITEMS[bonusIdx];

  return {
    dungeonId,
    weekStr: ws,
    bonusItem,
    xpMultiplier:   1.5,
    goldMultiplier: 1.5,
    label: '⭐ Featured',
  };
}

function getCurrentWeekStr() {
  return getISOWeekStr();
}

module.exports = { getFeaturedDungeon, getCurrentWeekStr, FEATURED_POOL, FEATURED_BONUS_ITEMS };
