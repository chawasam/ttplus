// handlers/game/featuredDungeon.js — Featured Dungeon weekly bonus endpoint

'use strict';

const admin = require('firebase-admin');
const { getFeaturedDungeon, getCurrentWeekStr } = require('../../data/featured_dungeon');
const { DUNGEONS } = require('../../data/dungeons');

// ── GET /api/game/featured-dungeon ──────────────────────────────────
// Returns: { featured: { dungeonId, dungeonName, weekStr, bonusItem, xpMultiplier, goldMultiplier, label }, claimed }
async function getFeaturedDungeonStatus(req, res) {
  const uid = req.user.uid;
  try {
    const featured = getFeaturedDungeon();
    const dungeon  = DUNGEONS[featured.dungeonId];
    const db = admin.firestore();
    const doc = await db.collection('game_featured_dungeon').doc(uid).get();
    const claimed = doc.exists && doc.data().claimedWeek === featured.weekStr;

    return res.json({
      featured: {
        ...featured,
        dungeonName:   dungeon?.nameTH  || featured.dungeonId,
        dungeonEmoji:  dungeon?.emoji   || '⚔️',
        dungeonMinLevel: dungeon?.minLevel || 1,
        dungeonDifficulty: dungeon?.difficultyLabel || '-',
        dungeonDesc:   dungeon?.desc    || '',
      },
      claimed,
    });
  } catch (err) {
    console.error('[FeaturedDungeon] getStatus:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getFeaturedDungeonStatus };
