// lib/gameApi.js — Game API wrappers (ใช้ api instance เดิม)
import api from './api';

// ===== Account =====
export const syncAccount      = ()               => api.post('/api/game/account/sync');
export const requestVerify    = (tiktokUniqueId) => api.post('/api/game/account/verify-request', { tiktokUniqueId });
export const getVerifyStatus  = ()               => api.get('/api/game/account/verify-status');
export const createCharacter  = (data)           => api.post('/api/game/account/character/create', data);
export const loadCharacter    = ()               => api.get('/api/game/account/character');
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

// ===== Dungeon =====
export const getDungeons      = ()               => api.get('/api/game/dungeons');
export const getDungeonRun    = ()               => api.get('/api/game/dungeon/run');
export const enterDungeon     = (dungeonId)      => api.post('/api/game/dungeon/enter', { dungeonId });
export const dungeonAction    = (action)         => api.post('/api/game/dungeon/action', { action });
export const dungeonFlee      = ()               => api.post('/api/game/dungeon/flee');
