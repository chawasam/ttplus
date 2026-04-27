// data/planned_content.js — Planned item sources (coming soon)
// ไอเทมเหล่านี้มีอยู่ใน items.js แต่ยังไม่ได้ implement source จริง
// ใช้เพื่อแสดงใน Admin Drop Lookup ว่า "🔒 Coming Soon"
// game code ไม่ได้ใช้ไฟล์นี้ — ไม่มีผลต่อ drop จริง

const PLANNED_SOURCES = [

  // ─────────────────────────────────────────────────────────────
  //  VOID TIER WEAPONS → World Boss: Void Leviathan (first kill)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'void_greatsword',   source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'voidforged_blade',  source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_fang_blade',   source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_rift_blade',   source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_staff',        source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_touched_orb',  source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_circuit_arm',  source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },
  { itemId: 'void_chord',        source: 'World Boss: Void Leviathan', sourceEmoji: '🌊', type: 'planned', note: 'First kill reward' },

  // ─────────────────────────────────────────────────────────────
  //  LEGENDARY WEAPONS → World Boss: Malachar the Reborn (first kill)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'ashenfury',         source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'blade_of_ashenveil',source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'eclipse_blade',     source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'reality_render',    source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'world_core_staff',  source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'death_scythe',      source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'harbinger',         source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'whisperwind_bow',   source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'shard_bow',         source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'harmony_of_ash',    source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'worldcore_orb',     source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },
  { itemId: 'aetheric_engine',   source: 'World Boss: Malachar the Reborn', sourceEmoji: '💀', type: 'planned', note: 'First kill reward' },

  // ─────────────────────────────────────────────────────────────
  //  TITAN SET → Dungeon Boss: Vorath's Citadel (final room)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'titan_head',   source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },
  { itemId: 'titan_chest',  source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },
  { itemId: 'titan_gloves', source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },
  { itemId: 'titan_legs',   source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },
  { itemId: 'titan_feet',   source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },
  { itemId: 'titan_shield', source: 'Dungeon: Vorath\'s Citadel (Final Boss)', sourceEmoji: '🏰', type: 'planned', note: 'Endgame dungeon boss drop' },

  // ─────────────────────────────────────────────────────────────
  //  ASHVEIL SET → Dungeon: The Ashen Spire (coming soon)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'ashveil_head',   source: 'Dungeon: The Ashen Spire', sourceEmoji: '🔥', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'ashveil_chest',  source: 'Dungeon: The Ashen Spire', sourceEmoji: '🔥', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'ashveil_gloves', source: 'Dungeon: The Ashen Spire', sourceEmoji: '🔥', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'ashveil_legs',   source: 'Dungeon: The Ashen Spire', sourceEmoji: '🔥', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'ashveil_feet',   source: 'Dungeon: The Ashen Spire', sourceEmoji: '🔥', type: 'planned', note: 'Dungeon not yet released' },

  // ─────────────────────────────────────────────────────────────
  //  WORLDCORE SET → Dungeon: World Core Depths (coming soon)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'worldcore_robe_head',   source: 'Dungeon: World Core Depths', sourceEmoji: '🌍', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'worldcore_robe_chest',  source: 'Dungeon: World Core Depths', sourceEmoji: '🌍', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'worldcore_robe_gloves', source: 'Dungeon: World Core Depths', sourceEmoji: '🌍', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'worldcore_robe_legs',   source: 'Dungeon: World Core Depths', sourceEmoji: '🌍', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'worldcore_robe_feet',   source: 'Dungeon: World Core Depths', sourceEmoji: '🌍', type: 'planned', note: 'Dungeon not yet released' },

  // ─────────────────────────────────────────────────────────────
  //  AETHERIC SET → Dungeon: The Iron Sanctum (coming soon)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'aetheric_mech_head',   source: 'Dungeon: The Iron Sanctum', sourceEmoji: '⚙️', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'aetheric_mech_chest',  source: 'Dungeon: The Iron Sanctum', sourceEmoji: '⚙️', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'aetheric_mech_gloves', source: 'Dungeon: The Iron Sanctum', sourceEmoji: '⚙️', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'aetheric_mech_legs',   source: 'Dungeon: The Iron Sanctum', sourceEmoji: '⚙️', type: 'planned', note: 'Dungeon not yet released' },
  { itemId: 'aetheric_mech_feet',   source: 'Dungeon: The Iron Sanctum', sourceEmoji: '⚙️', type: 'planned', note: 'Dungeon not yet released' },

  // ─────────────────────────────────────────────────────────────
  //  MATERIAL ITEMS → Quest rewards (coming soon)
  // ─────────────────────────────────────────────────────────────
  { itemId: 'star_map_fragment', source: 'Quest: Stargazer\'s Path',   sourceEmoji: '⭐', type: 'planned', note: 'Quest chain not yet released' },
  { itemId: 'military_ration',   source: 'Quest: Soldier\'s Legacy',   sourceEmoji: '📜', type: 'planned', note: 'Quest chain not yet released' },
  { itemId: 'old_war_medal',     source: 'Quest: Veteran\'s Honor',    sourceEmoji: '🏅', type: 'planned', note: 'Quest chain not yet released' },
  { itemId: 'forget_me_not',     source: 'NPC Affection: Lyra',        sourceEmoji: '💙', type: 'planned', note: 'NPC affection reward (phase 2)' },
];

module.exports = { PLANNED_SOURCES };
