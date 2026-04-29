// handlers/game/overlay.js — Public stream overlay data endpoint
// GET /api/overlay/:tiktokId — no auth required, used by OBS browser source

const admin = require('firebase-admin');

// ===== GET overlay state by TikTok username =====
async function getOverlayState(req, res) {
  // Allow CORS for overlay (loaded from OBS browser source on any origin)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cache-Control', 'no-cache');

  const { tiktokId } = req.params;
  if (!tiktokId || !/^[a-zA-Z0-9._]{1,50}$/.test(tiktokId)) {
    return res.status(400).json({ error: 'Invalid tiktokId' });
  }

  const db = admin.firestore();

  try {
    // Find game account by tiktokUniqueId
    const acctSnap = await db.collection('game_accounts')
      .where('tiktokUniqueId', '==', tiktokId.toLowerCase())
      .limit(1)
      .get();

    if (acctSnap.empty) {
      return res.json({ found: false, tiktokId });
    }

    const acct  = acctSnap.docs[0].data();
    const uid   = acctSnap.docs[0].id;
    const charId = acct.characterId;

    if (!charId) {
      return res.json({ found: true, hasChar: false, tiktokId });
    }

    // Get character
    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) {
      return res.json({ found: true, hasChar: false, tiktokId });
    }
    const char = charDoc.data();

    // Get recent events (last 10)
    const recentEvents = (acct.recentEvents || []).slice(0, 10);

    // Get active dungeon run (if any)
    const dungeonSnap = await db.collection('game_dungeons')
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    const inDungeon = !dungeonSnap.empty ? {
      dungeonId: dungeonSnap.docs[0].data().dungeonId,
      room:      dungeonSnap.docs[0].data().currentRoom,
      total:     dungeonSnap.docs[0].data().totalRooms,
    } : null;

    // Get achievement count
    const achDoc = await db.collection('game_achievements').doc(uid).get();
    const achCount = achDoc.exists ? (achDoc.data().unlockedIds || []).length : 0;

    return res.json({
      found:    true,
      hasChar:  true,
      tiktokId,
      character: {
        name:     char.name,
        race:     char.race,
        class:    char.class,
        level:    char.level || 1,
        hp:       char.hp,
        hpMax:    char.hpMax,
        mp:       char.mp,
        mpMax:    char.mpMax,
        xp:       char.xp || 0,
        xpToNext: char.xpToNext || 100,
        location: char.location || 'town_square',
        monstersKilled: char.monstersKilled || 0,
        stamina:  char.stamina || 0,
        staminaMax: char.staminaMax || 200,
      },
      gold:         acct.gold || 0,
      rp:           acct.realmPoints || 0,
      achievements: achCount,
      recentEvents,
      inDungeon,
      ts: Date.now(),
    });
  } catch (err) {
    console.error('[Overlay] getOverlayState:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getOverlayState };
