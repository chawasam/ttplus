// data/weekly_quests.js — Weekly challenge quests (reset ทุกวันจันทร์)

const WEEKLY_QUESTS = [
  {
    id:     'weekly_kill_100',
    name:   '🗡️ นักล่าสัปดาห์',
    desc:   'สังหารมอนสเตอร์ 100 ตัวในสัปดาห์นี้',
    type:   'kill',
    target: 100,
    reward: { gold: 2000, xp: 400, items: ['health_potion', 'health_potion'] },
  },
  {
    id:     'weekly_dungeon_5',
    name:   '🏰 ราชาดันเจี้ยน',
    desc:   'เคลียร์ Dungeon ใดก็ได้ 5 ครั้งในสัปดาห์นี้',
    type:   'dungeon_clear',
    target: 5,
    reward: { gold: 3000, xp: 600, items: ['void_crystal'] },
  },
  {
    id:     'weekly_explore_30',
    name:   '🔍 นักสำรวจมือโปร',
    desc:   'สำรวจ zone ใดก็ได้ 30 ครั้งในสัปดาห์นี้',
    type:   'explore',
    target: 30,
    reward: { gold: 1500, xp: 300, items: ['ancient_scroll'] },
  },
  {
    id:     'weekly_gift_15',
    name:   '💝 ผู้ใจดีแห่งสัปดาห์',
    desc:   'ให้ของ NPC 15 ครั้งในสัปดาห์นี้',
    type:   'npc_gift',
    target: 15,
    reward: { gold: 1200, xp: 250, items: ['mana_potion', 'antidote'] },
  },
  {
    id:     'weekly_rest_10',
    name:   '💤 นักพักผ่อนตัวยง',
    desc:   'กด Rest 10 ครั้งในสัปดาห์นี้',
    type:   'rest',
    target: 10,
    reward: { gold: 800, xp: 150 },
  },
];

const WEEKLY_BONUS = {
  gold:   5000,
  xp:     1000,
  items:  ['ancient_scroll', 'void_crystal'],
  label:  '🏆 ครบทุก Weekly Quest!',
};

// หา Monday ล่าสุด เป็น YYYY-MM-DD key
function getWeekKey() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // ถอยกลับไป Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10); // 'YYYY-MM-DD' ของ Monday
}

function buildFreshWeeklyQuests() {
  return WEEKLY_QUESTS.map(q => ({
    id:       q.id,
    progress: 0,
    completed: false,
    claimed:  false,
  }));
}

module.exports = { WEEKLY_QUESTS, WEEKLY_BONUS, getWeekKey, buildFreshWeeklyQuests };
