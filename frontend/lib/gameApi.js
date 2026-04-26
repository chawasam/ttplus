// lib/gameApi.js — Game API wrappers (ใช้ api instance เดิม)
import api from './api';

// ===== Account =====
export const syncAccount      = ()               => api.post('/api/game/account/sync');
export const requestVerify    = (tiktokUniqueId) => api.post('/api/game/account/verify-request', { tiktokUniqueId });
export const getVerifyStatus  = ()               => api.get('/api/game/account/verify-status');
export const createCharacter  = (data)           => api.post('/api/game/account/character/create', data);
export const loadCharacter    = ()               => api.get('/api/game/account/character');
export const deleteCharacter  = ()               => api.post('/api/game/account/character/delete');
export const getUnlockedRaces = ()               => api.get('/api/game/account/unlocked-races');

// ===== Currency =====
export const getBalance       = ()               => api.get('/api/game/currency/balance');
export const redeemRP         = (amount)         => api.post('/api/game/currency/redeem-rp', { amount });

// ===== Explore =====
export const explore          = (zone)           => api.post('/api/game/explore', { zone });
export const travel           = (zone)           => api.post('/api/game/travel', { zone });

// ===== Combat =====
export const startBattle      = (zone, monsterId, dungeonRunId, bossData) =>
  api.post('/api/game/battle/start', { zone, monsterId, dungeonRunId, bossData });
export const battleAction     = (battleId, action, opts = {}) =>
  api.post('/api/game/battle/action', { battleId, action, ...opts });
export const rest             = ()               => api.post('/api/game/battle/rest');

// ===== Inventory =====
export const getInventory     = ()               => api.get('/api/game/inventory');
export const equipItem        = (instanceId, slot) => api.post('/api/game/inventory/equip', { instanceId, slot });
export const unequipItem      = (slot)           => api.post('/api/game/inventory/unequip', { slot });
export const sellItem         = (instanceId)     => api.post('/api/game/inventory/sell', { instanceId });

// ===== Shop =====
export const getShopItems     = (shopId = 'starter') => api.get(`/api/game/shop?shopId=${shopId}`);
export const buyItem          = (itemId)         => api.post('/api/game/shop/buy', { itemId });

// ===== NPC =====
export const getNPCs          = ()               => api.get('/api/game/npcs');
export const talkNPC          = (npcId)          => api.get(`/api/game/npc/${npcId}`);
export const giveGift         = (npcId, instanceId) => api.post('/api/game/npc/gift', { npcId, instanceId });

// ===== Daily Quests =====
export const getQuests        = ()               => api.get('/api/game/quests');
export const claimQuestReward = (questId)        => api.post('/api/game/quests/claim', { questId });

// ===== Quest Log (Story + Side) =====
export const getQuestLog      = ()               => api.get('/api/game/quest-log');
export const acceptSideQuest  = (questId)        => api.post('/api/game/quest-log/accept', { questId });

// ===== RP Shop =====
export const getRPShop        = ()               => api.get('/api/game/rp-shop');
export const buyRPItem        = (itemId)         => api.post('/api/game/rp-shop/buy', { itemId });

// ===== Skills =====
export const getSkills        = ()               => api.get('/api/game/skills');
export const unlockSkill      = (skillId)        => api.post('/api/game/skills/unlock', { skillId });

// ===== Character Profile + Stat Allocation =====
export const getCharacterProfile = ()            => api.get('/api/game/character/profile');
export const allocateStat     = (stat, points)   => api.post('/api/game/character/stat', { stat, points });
export const equipTitle       = (title)          => api.post('/api/game/character/equip-title', { title });

// ===== Enhancement =====
export const getEnhanceInfo   = (instanceId)     => api.get(`/api/game/enhance/${instanceId}`);
export const enhanceItem      = (instanceId)     => api.post('/api/game/enhance', { instanceId });

// ===== Weekly Quests =====
export const getWeeklyQuests  = ()               => api.get('/api/game/quests/weekly');
export const claimWeeklyReward = (questId)       => api.post('/api/game/quests/weekly/claim', { questId });

// ===== Achievements =====
export const getAchievements  = ()               => api.get('/api/game/achievements');

// ===== Login Bonus =====
export const getLoginBonusStatus = ()            => api.get('/api/game/login-bonus/status');
export const claimLoginBonus     = ()            => api.post('/api/game/login-bonus/claim');

// ===== Leaderboard =====
export const getLeaderboard   = ()               => api.get('/api/game/leaderboard');

// ===== World Boss =====
export const getWorldBoss     = ()               => api.get('/api/game/world-boss');
export const attackWorldBoss  = ()               => api.post('/api/game/world-boss/attack');
export const spawnWorldBoss   = (bossId, reason) => api.post('/api/game/world-boss/spawn', { bossId, reason });

// ===== Crafting =====
export const getCraftingRecipes = ()            => api.get('/api/game/crafting');
export const craftItem          = (recipeId)    => api.post('/api/game/crafting/craft', { recipeId });

// ===== Dungeon =====
export const getDungeons      = ()               => api.get('/api/game/dungeons');
export const getDungeonRun    = ()               => api.get('/api/game/dungeon/run');
export const enterDungeon     = (dungeonId)      => api.post('/api/game/dungeon/enter', { dungeonId });
export const dungeonAction    = (action)         => api.post('/api/game/dungeon/action', { action });
export const dungeonFlee      = ()               => api.post('/api/game/dungeon/flee');


// ===== Main Quest (Vorath / The Shattered Age) =====
export const getMainQuestLog  = ()                        => api.get('/api/game/quest-main');
export const collectLore      = (loreId)                  => api.post('/api/game/quest-main/lore', { loreId });
export const makeQuestChoice  = (choiceKey, choice)       => api.post('/api/game/quest-main/choice', { choiceKey, choice });

// ===== Daily Shop =====
export const getDailyShop        = ()         => api.get('/api/game/daily-shop');
export const buyDailyShopItem    = (slotId)   => api.post('/api/game/daily-shop/buy', { slotId });

// ===== Featured Dungeon =====
export const getFeaturedDungeonStatus = ()    => api.get('/api/game/featured-dungeon');
