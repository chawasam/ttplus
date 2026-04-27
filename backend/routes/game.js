// routes/game.js — Express router for Ashenveil game endpoints (v2)
const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');

const { verifyToken } = require('../middleware/auth');

const account   = require('../handlers/game/account');
const currency  = require('../handlers/game/currency');
const combat    = require('../handlers/game/combat');
const inventory = require('../handlers/game/inventory');
const explore   = require('../handlers/game/explore');
const npc       = require('../handlers/game/npc');
const dungeon   = require('../handlers/game/dungeon');
const quests       = require('../handlers/game/quests');
const questEngine  = require('../handlers/game/quest_engine');
const rpShop       = require('../handlers/game/rpShop');
const skills       = require('../handlers/game/skills');
const character    = require('../handlers/game/character');
const enhance      = require('../handlers/game/enhance');
const weeklyQ      = require('../handlers/game/weeklyQuests');
const ach          = require('../handlers/game/achievements');
const loginBonus   = require('../handlers/game/loginBonus');
const leaderboard  = require('../handlers/game/leaderboard');
const worldBoss    = require('../handlers/game/worldBoss');
const crafting     = require('../handlers/game/crafting');
const audit           = require('../handlers/game/audit');
const roadmapConfig   = require('../handlers/game/roadmapConfig');
const dailyShop       = require('../handlers/game/dailyShop');
const featuredDungeon = require('../handlers/game/featuredDungeon');

// ===== Game-specific rate limiters (per UID, ไม่ใช่ per IP) =====
// keyGenerator ใช้ uid หลัง verifyToken รันแล้ว
const uidKey = (req) => req.user?.uid || req.ip;

const gameLimiter = rateLimit({
  windowMs: 10 * 1000,   // 10 วินาที
  max: 20,               // 20 req / 10s per uid (~2/s burst OK)
  keyGenerator: uidKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many game requests. Slow down!' },
});

const battleLimiter = rateLimit({
  windowMs: 5 * 1000,    // 5 วินาที
  max: 6,                // 6 req / 5s per uid (~1/s)
  keyGenerator: uidKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Battle actions too fast — wait a moment.' },
});

const exploreLimiter = rateLimit({
  windowMs: 5 * 1000,    // 5 วินาที
  max: 3,                // max 3 explores / 5s per uid (server cooldown ดักด้านใน explore.js ด้วย)
  keyGenerator: uidKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Exploring too fast — slow down.' },
});

const shopLimiter = rateLimit({
  windowMs: 30 * 1000,   // 30 วินาที
  max: 15,               // 15 req / 30s per uid
  keyGenerator: uidKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many shop requests' },
});

// ===== All game routes require auth =====
router.use(verifyToken);
router.use(gameLimiter);

// ----- Account -----
router.post('/account/sync',             account.syncAccount);
router.post('/account/verify-request',   account.requestVerifyCode);
router.get ('/account/verify-status',    account.getVerifyStatus);
router.post('/account/character/create', account.createCharacter);
router.get ('/account/character',        account.loadCharacter);
router.post('/account/character/delete', account.deleteCharacter);
router.get ('/account/unlocked-races',   account.getUnlockedRaces);

// ----- Currency -----
router.get ('/currency/balance',     currency.getBalance);
router.post('/currency/redeem-rp',   currency.redeemRealmPoints);

// ----- Explore -----
router.post('/explore',  exploreLimiter, explore.explore);
router.post('/travel',   explore.travel);
router.get ('/zone-info/:zoneId', explore.getZoneInfo);

// ----- Combat -----
router.post('/battle/start',  battleLimiter, combat.startBattle);
router.post('/battle/action', battleLimiter, combat.processAction);
router.post('/battle/rest',   combat.rest);

// ----- Inventory -----
router.get ('/inventory',        inventory.getInventory);
router.post('/inventory/equip',  inventory.equipItem);
router.post('/inventory/unequip',inventory.unequipItem);
router.post('/inventory/sell',   shopLimiter, inventory.sellItem);

// ----- NPC Shop -----
router.get ('/shop',      shopLimiter, inventory.getShopItems);
router.post('/shop/buy',  shopLimiter, inventory.buyItem);

// ----- NPC Affection -----
router.get ('/npcs',              npc.getNPCList);
router.get ('/npc/:npcId',        npc.talkToNPC);
router.post('/npc/gift',          npc.giveGift);

// ----- Daily Quests -----
router.get ('/quests',       quests.getQuests);
router.post('/quests/claim', quests.claimReward);

// ----- Quest Log (Story + Side) -----
router.get ('/quest-log',          questEngine.getQuestLog);
router.post('/quest-log/accept',   questEngine.acceptSideQuest);

// ----- Main Quest (Vorath / The Shattered Age) -----
router.get ('/quest-main',            questEngine.getMainQuestLog);
router.post('/quest-main/lore',       questEngine.collectLore);
router.post('/quest-main/choice',     questEngine.makeQuestChoice);

// ----- RP Shop -----
router.get ('/rp-shop',                  shopLimiter, rpShop.getRPShop);
router.post('/rp-shop/buy',              shopLimiter, rpShop.buyRPItem);
router.post('/rp-shop/class-change',     shopLimiter, rpShop.executeClassChange);
router.post('/rp-shop/name-change',      shopLimiter, rpShop.executeNameChange);
router.post('/rp-shop/skill-reset',      shopLimiter, rpShop.executeSkillReset);
router.post('/rp-shop/stat-reset',       shopLimiter, rpShop.executeStatReset);
router.get ('/rp-shop/active-boosts',    rpShop.getActiveBoosts);

// ----- Daily Shop -----
router.get ('/daily-shop',         shopLimiter, dailyShop.getDailyShop);
router.post('/daily-shop/buy',     shopLimiter, dailyShop.buyDailyShopItem);
router.get ('/featured-dungeon',   gameLimiter, featuredDungeon.getFeaturedDungeonStatus);

// ----- Crafting -----
router.get ('/crafting',           crafting.getCraftingRecipes);
router.post('/crafting/craft',     gameLimiter, crafting.craftItem);

// ----- Skills -----
router.get ('/skills',             skills.getSkills);
router.post('/skills/unlock',      skills.unlockSkill);

// ----- Character Profile + Stat Allocation -----
router.get ('/character/profile',  character.getCharacterProfile);
router.post('/character/stat',     character.allocateStat);
router.post('/character/equip-title', character.equipTitle);

// ----- Enhancement -----
router.get ('/enhance/:instanceId', enhance.getEnhanceInfo);
router.post('/enhance',             enhance.enhanceItem);

// ----- Weekly Quests -----
router.get ('/quests/weekly',        weeklyQ.getWeeklyQuests);
router.post('/quests/weekly/claim',  weeklyQ.claimWeeklyReward);

// ----- Achievements -----
router.get ('/achievements',         ach.getAchievements);

// ----- Login Bonus -----
router.get ('/login-bonus/status',  loginBonus.getLoginBonusStatus);
router.post('/login-bonus/claim',   loginBonus.claimLoginBonus);

// ----- Leaderboard -----
router.get ('/leaderboard',         leaderboard.getLeaderboard);

// ----- World Boss -----
router.get ('/world-boss',            worldBoss.getWorldBossStatus);
router.post('/world-boss/attack',     battleLimiter, worldBoss.attackWorldBoss);
router.post('/world-boss/spawn',      worldBoss.spawnWorldBoss);

// ----- Admin Audit (ADMIN_UID only) -----
router.get ('/audit/summary',                  audit.requireAdmin, audit.getSummary);
router.get ('/audit/flags',                    audit.requireAdmin, audit.getFlags);
router.post('/audit/flags/:flagId/resolve',    audit.requireAdmin, audit.resolveFlag);
router.get ('/audit/player/:uid',              audit.requireAdmin, audit.getPlayerHistory);
router.get ('/audit/activity',                 audit.requireAdmin, audit.getActivity);
router.get ('/audit/players',                  audit.requireAdmin, audit.getPlayers);
router.post('/audit/players/:uid/flag',        audit.requireAdmin, audit.manualFlag);
router.get ('/audit/bugs',                     audit.requireAdmin, audit.getBugs);
router.get ('/audit/skill-stats',              audit.requireAdmin, audit.getSkillStats);
router.get ('/audit/item-stats',               audit.requireAdmin, audit.getItemStats);
router.get ('/audit/roadmap',                  audit.requireAdmin, roadmapConfig.getRoadmap);
router.post('/audit/roadmap',                  audit.requireAdmin, roadmapConfig.updateFeature);
router.get ('/audit/gamedata',                 audit.requireAdmin, audit.getGameData);

// ----- Dungeon -----
router.get ('/dungeons',              dungeon.listDungeons);
router.get ('/dungeon/run',           dungeon.getRunState);
router.post('/dungeon/enter',         dungeon.enterDungeon);
router.post('/dungeon/action',        dungeon.roomAction);
router.post('/dungeon/flee',          dungeon.fleeDungeon);
router.get ('/dungeon/active-runs',   dungeon.getActiveDungeonRuns);

module.exports = router;
