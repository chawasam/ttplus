// handlers/game/leaderboard.js — Global leaderboard
// GET /api/game/leaderboard  — top 10 ต่อ category

const admin = require('firebase-admin');

async function getLeaderboard(req, res) {
  const db = admin.firestore();

  try {
    // Run all queries in parallel
    const [levelSnap, killSnap, achSnap] = await Promise.all([
      // Top by level
      db.collection('game_characters')
        .orderBy('level', 'desc').orderBy('xp', 'desc').limit(10).get(),
      // Top by kills
      db.collection('game_characters')
        .orderBy('monstersKilled', 'desc').limit(10).get(),
      // Top by achievements
      db.collection('game_achievements')
        .orderBy('unlockedCount', 'desc').limit(10).get(),
    ]);

    // Helper: extract character rows
    const charRows = (snap) => snap.docs.map((d, i) => {
      const c = d.data();
      return {
        rank:     i + 1,
        name:     c.name     || '???',
        race:     c.race     || '',
        class:    c.class    || '',
        level:    c.level    || 1,
        value:    null, // filled per category
        title:    c.title    || '',
      };
    });

    const levelBoard = levelSnap.docs.map((d, i) => {
      const c = d.data();
      return { rank: i+1, name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1, value: c.level||1, title: c.title||'' };
    });

    const killBoard = killSnap.docs.map((d, i) => {
      const c = d.data();
      return { rank: i+1, name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1, value: c.monstersKilled||0, title: c.title||'' };
    });

    // Achievements need join with characters
    const achBoard = [];
    for (let i = 0; i < achSnap.docs.length; i++) {
      const ach = achSnap.docs[i].data();
      const uid = achSnap.docs[i].id;
      const acct = await db.collection('game_accounts').doc(uid).get();
      const charId = acct.data()?.characterId;
      if (!charId) continue;
      const char = await db.collection('game_characters').doc(charId).get();
      if (!char.exists) continue;
      const c = char.data();
      achBoard.push({
        rank: achBoard.length + 1,
        name: c.name||'???', race: c.race||'', class: c.class||'', level: c.level||1,
        value: (ach.unlockedIds||[]).length, title: c.title||'',
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
