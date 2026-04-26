// handlers/game/leaderboard.js — Global leaderboard
// GET /api/game/leaderboard  — top 10 ต่อ category

const admin = require('firebase-admin');

async function getLeaderboard(req, res) {
  const db = admin.firestore();

  try {
    // Run level + kill boards in parallel; fetch all ach docs for sort in memory
    const [levelSnap, killSnap, achAllSnap] = await Promise.all([
      db.collection('game_characters')
        .orderBy('level', 'desc').orderBy('xp', 'desc').limit(10).get(),
      db.collection('game_characters')
        .orderBy('monstersKilled', 'desc').limit(10).get(),
      // Fetch all achievement docs (no index needed) and sort by count in memory
      db.collection('game_achievements').get(),
    ]);

    const levelBoard = levelSnap.docs.map((d, i) => {
      const c = d.data();
      return { rank: i+1, name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1, value: c.level||1, title: c.equippedTitle||'' };
    });

    const killBoard = killSnap.docs.map((d, i) => {
      const c = d.data();
      return { rank: i+1, name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1, value: c.monstersKilled||0, title: c.equippedTitle||'' };
    });

    // Sort achievement docs by unlockedIds.length desc, take top 10, then join characters
    const sortedAch = achAllSnap.docs
      .map(d => ({ uid: d.id, count: (d.data().unlockedIds || []).length }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const achBoard = [];
    for (const { uid, count } of sortedAch) {
      const acct = await db.collection('game_accounts').doc(uid).get();
      const charId = acct.data()?.characterId;
      if (!charId) continue;
      const charDoc = await db.collection('game_characters').doc(charId).get();
      if (!charDoc.exists) continue;
      const c = charDoc.data();
      achBoard.push({
        rank: achBoard.length + 1,
        name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1,
        value: count, title: c.equippedTitle||'',
      });
      if (achBoard.length >= 10) break;
    }

    return res.json({
      level:        levelBoard,
      kills:        killBoard,
      achievements: achBoard,
      updatedAt:    Date.now(),
    });
  } catch (err) {
    console.error('[Leaderboard]', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getLeaderboard };
