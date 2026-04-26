// data/quests.js — Daily Quest definitions for Ashenveil

const DAILY_QUESTS = [
  {
    id:     'kill_20',
    name:   '🗡️ นักล่า',
    desc:   'สังหารมอนสเตอร์ 20 ตัว',
    type:   'kill',
    target: 20,
    reward: { gold: 300, xp: 50 },
  },
  {
    id:     'dungeon_clear',
    name:   '🏰 นักผจญภัย',
    desc:   'เคลียร์ Dungeon 1 ครั้ง',
    type:   'dungeon_clear',
    target: 1,
    reward: { gold: 500, xp: 80 },
  },
  {
    id:     'explore_8',
    name:   '🔍 นักสำรวจ',
    desc:   'Explore 8 ครั้ง',
    type:   'explore',
    target: 8,
    reward: { gold: 200, xp: 30 },
  },
  {
    id:     'npc_gift_3',
    name:   '💝 ผู้มีน้ำใจ',
    desc:   'ให้ของขวัญ NPC 3 ชิ้น',
    type:   'npc_gift',
    target: 3,
    reward: { gold: 150, xp: 20 },
  },
  {
    id:     'rest_2',
    name:   '💤 พักผ่อนให้พอ',
    desc:   'Rest 2 ครั้ง',
    type:   'rest',
    target: 2,
    reward: { gold: 100, xp: 15 },
  },
];

// รางวัลพิเศษเมื่อทำครบทุกเควส
const DAILY_BONUS = {
  gold:   400,
  xp:     100,
  itemId: 'health_potion',
  label:  '🎁 ทำครบทุกภารกิจ',
};

// key วันนี้ (UTC date string)
function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-04-25"
}

// สร้าง quest state ใหม่เอี่ยมสำหรับวันนี้
function buildFreshQuests() {
  return DAILY_QUESTS.map(q => ({
    id:        q.id,
    progress:  0,
    completed: false,
    claimed:   false,
  }));
}

module.exports = { DAILY_QUESTS, DAILY_BONUS, getTodayKey, buildFreshQuests };
