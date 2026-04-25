// routes/game.js — Express router for Ashenveil game endpoints
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

// ===== Game-specific rate limiters =====
const gameLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: { error: 'Too many game requests. Slow down!' },
});

const battleLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: 'Too many battle actions' },
});

const shopLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
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
router.get ('/account/unlocked-races',   account.getUnlockedRaces);

// ----- Currency -----
router.get ('/currency/balance',     currency.getBalance);
router.post('/currency/redeem-rp',   currency.redeemRealmPoints);

// ----- Explore -----
router.post('/explore',  explore.explore);
router.post('/travel',   explore.travel);

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

// ----- RP Shop -----
router.get ('/rp-shop',            shopLimiter, rpShop.getRPShop);
router.post('/rp-shop/buy',        shopLimiter, rpShop.buyRPItem);

// ----- Skills -----
router.get ('/skills',             skills.getSkills);
router.post('/skills/unlock',      skills.unlockSkill);

// ----- Character Profile + Stat Allocation -----
router.get ('/character/profile',  character.getCharacterProfile);
router.post('/character/stat',     character.allocateStat);

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

// ----- Dungeon -----
router.get ('/dungeons',          dungeon.listDungeons);
router.get ('/dungeon/run',       dungeon.getRunState);
router.post('/dungeon/enter',     dungeon.enterDungeon);
router.post('/dungeon/action',    dungeon.roomAction);
router.post('/dungeon/flee',      dungeon.fleeDungeon);

module.exports = router;
