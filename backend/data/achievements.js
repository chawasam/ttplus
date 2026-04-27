// data/achievements.js — Achievement definitions for Ashenveil
// type: field ที่ใช้เช็ค progress จาก character / event data

const ACHIEVEMENTS = [

  // ══════════════ COMBAT ══════════════
  {
    id:     'first_blood',
    name:   '🗡️ First Blood',
    desc:   'สังหารมอนสเตอร์ตัวแรก',
    type:   'kill_total',
    target: 1,
    reward: { gold: 100, xp: 50 },
  },
  {
    id:     'kill_50',
    name:   '⚔️ นักล่า',
    desc:   'สังหารมอนสเตอร์ 50 ตัว',
    type:   'kill_total',
    target: 50,
    reward: { gold: 500, xp: 200 },
  },
  {
    id:     'kill_200',
    name:   '💀 ผู้พิชิต',
    desc:   'สังหารมอนสเตอร์ 200 ตัว',
    type:   'kill_total',
    target: 200,
    reward: { gold: 1500, xp: 600, title: 'ผู้พิชิต' },
  },
  {
    id:     'kill_1000',
    name:   '👑 ราชาสงคราม',
    desc:   'สังหารมอนสเตอร์ 1,000 ตัว',
    type:   'kill_total',
    target: 1000,
    reward: { gold: 8000, xp: 3000, title: 'ราชาสงคราม' },
  },

  // ══════════════ EXPLORATION ══════════════
  {
    id:     'explorer_1',
    name:   '🔍 นักสำรวจ',
    desc:   'สำรวจ 10 ครั้ง',
    type:   'explore_total',
    target: 10,
    reward: { gold: 200, xp: 100 },
  },
  {
    id:     'explorer_2',
    name:   '🗺️ นักสำรวจมือโปร',
    desc:   'สำรวจ 100 ครั้ง',
    type:   'explore_total',
    target: 100,
    reward: { gold: 1000, xp: 500 },
  },
  {
    id:     'explorer_3',
    name:   '🌍 Legend of the World',
    desc:   'สำรวจ 500 ครั้ง',
    type:   'explore_total',
    target: 500,
    reward: { gold: 5000, xp: 2000, title: 'ผู้พิชิตดินแดน' },
  },

  // ══════════════ DUNGEON ══════════════
  {
    id:     'dungeon_1',
    name:   '🏰 ก้าวแรกสู่ Dungeon',
    desc:   'เคลียร์ Dungeon แรก',
    type:   'dungeon_clears',
    target: 1,
    reward: { gold: 500, xp: 200 },
  },
  {
    id:     'dungeon_5',
    name:   '🔥 นักผจญภัย',
    desc:   'เคลียร์ Dungeon 5 ครั้ง',
    type:   'dungeon_clears',
    target: 5,
    reward: { gold: 1500, xp: 600 },
  },
  {
    id:     'dungeon_20',
    name:   '⚡ ราชา Dungeon',
    desc:   'เคลียร์ Dungeon 20 ครั้ง',
    type:   'dungeon_clears',
    target: 20,
    reward: { gold: 6000, xp: 2500, title: 'ราชา Dungeon' },
  },

  // ══════════════ PROGRESSION ══════════════
  {
    id:     'level_5',
    name:   '⭐ Apprentice',
    desc:   'ถึง Level 5',
    type:   'level',
    target: 5,
    reward: { gold: 500, xp: 0 },
  },
  {
    id:     'level_10',
    name:   '🌟 Journeyman',
    desc:   'ถึง Level 10',
    type:   'level',
    target: 10,
    reward: { gold: 1500, xp: 0 },
  },
  {
    id:     'level_20',
    name:   '💫 Master',
    desc:   'ถึง Level 20',
    type:   'level',
    target: 20,
    reward: { gold: 5000, xp: 0, title: 'มาสเตอร์' },
  },
  {
    id:     'level_30',
    name:   '🏆 Legend',
    desc:   'ถึง Level 30',
    type:   'level',
    target: 30,
    reward: { gold: 15000, xp: 0, title: 'ตำนาน' },
  },

  // ══════════════ ENHANCEMENT ══════════════
  {
    id:     'enhance_5',
    name:   '🔨 ช่างฝีมือ',
    desc:   'Enhance อุปกรณ์ไปถึง +5',
    type:   'enhance_max',
    target: 5,
    reward: { gold: 1000, xp: 300 },
  },
  {
    id:     'enhance_10',
    name:   '⚡ Legendary Smith',
    desc:   'Enhance อุปกรณ์ไปถึง +10 (MAX!)',
    type:   'enhance_max',
    target: 10,
    reward: { gold: 10000, xp: 2000, title: 'ช่างตำนาน' },
  },

  // ══════════════ SOCIAL ══════════════
  {
    id:     'gift_npc_10',
    name:   '💝 ใจดี',
    desc:   'ให้ของ NPC รวม 10 ครั้ง',
    type:   'npc_gift_total',
    target: 10,
    reward: { gold: 300, xp: 100 },
  },
  {
    id:     'gift_npc_50',
    name:   '💖 ผู้ใจดีแห่ง Ashenveil',
    desc:   'ให้ของ NPC รวม 50 ครั้ง',
    type:   'npc_gift_total',
    target: 50,
    reward: { gold: 1500, xp: 500, title: 'ผู้ใจดี' },
  },
  {
    id:     'npc_bond',
    name:   '💞 สนิทสนม',
    desc:   'ผูกพัน NPC จน Affection 100 ครั้งแรก',
    type:   'npc_bonds',
    target: 1,
    reward: { gold: 2000, xp: 800 },
  },

  // ══════════════ DEATH / PERSEVERANCE ══════════════
  {
    id:     'die_once',
    name:   '💀 ล้มแล้วลุก',
    desc:   'ตายเป็นครั้งแรก',
    type:   'death_count',
    target: 1,
    reward: { gold: 0, xp: 100 },
  },
  {
    id:     'die_10',
    name:   '🪦 ไม่ยอมแพ้',
    desc:   'ตาย 10 ครั้ง — ยังไม่ถอดใจ',
    type:   'death_count',
    target: 10,
    reward: { gold: 500, xp: 500 },
  },

  // ══════════════ QUESTS ══════════════
  {
    id:     'weekly_first',
    name:   '📅 เอาจริงเอาจัง',
    desc:   'ทำ Weekly Quest สำเร็จครั้งแรก',
    type:   'weekly_total',
    target: 1,
    reward: { gold: 1000, xp: 400 },
  },
  {
    id:     'weekly_10',
    name:   '🗓️ นักสู้ทุกสัปดาห์',
    desc:   'ทำ Weekly Quest สำเร็จรวม 10 ครั้ง',
    type:   'weekly_total',
    target: 10,
    reward: { gold: 5000, xp: 2000, title: 'นักสู้ประจำสัปดาห์' },
  },
];

function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id) || null;
}

module.exports = { ACHIEVEMENTS, getAchievement };
