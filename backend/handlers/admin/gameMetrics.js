// handlers/admin/gameMetrics.js — Game-specific metrics for admin dashboard

const admin = require('firebase-admin');

async function getGameMetrics(req, res) {
  const db = admin.firestore();

  try {
    // Count queries แบบ parallel — ไม่ดึง documents ทั้งหมด
    const [charC, acctC, dungC, activeDungC, achC] = await Promise.all([
      db.collection('game_characters').count().get(),
      db.collection('game_accounts').count().get(),
      db.collection('game_dungeons').count().get(),
      db.collection('game_dungeons').where('status', '==', 'active').count().get(),
      db.collection('game_achievements').count().get(),
    ]);

    // Recent dungeon runs (last 15) + Top gold + Top RP แบบ parallel
    const [recentDungSnap, topGoldSnap, topRpSnap] = await Promise.all([
      db.collection('game_dungeons').orderBy('startedAt', 'desc').limit(15).get(),
      db.collection('game_accounts').orderBy('gold', 'desc').limit(10).get(),
      db.collection('game_accounts').orderBy('realmPoints', 'desc').limit(10).get(),
    ]);

    const recentDungeons = recentDungSnap.docs.map(d => {
      const data = d.data();
      return {
        id:          d.id,
        uid:         data.uid         || '',
        dungeonId:   data.dungeonId   || '',
        status:      data.status      || '',
        currentRoom: data.currentRoom || 0,
        totalRooms:  data.totalRooms  || 0,
        startedAt:   data.startedAt   || 0,
        completedAt: data.completedAt || null,
      };
    });

    const topGold = topGoldSnap.docs.map(d => ({
      uid:            d.id,
      tiktokUniqueId: d.data().tiktokUniqueId || '',
      gold:           d.data().gold           || 0,
      realmPoints:    d.data().realmPoints    || 0,
    }));

    const topRp = topRpSnap.docs.map(d => ({
      uid:            d.id,
      tiktokUniqueId: d.data().tiktokUniqueId || '',
      realmPoints:    d.data().realmPoints    || 0,
      gold:           d.data().gold           || 0,
    }));

    res.json({
      totals: {
        characters:     charC.data().count,
        accounts:       acctC.data().count,
        dungeons:       dungC.data().count,
        activeDungeons: activeDungC.data().count,
        achievements:   achC.data().count,
      },
      recentDungeons,
      topGold,
      topRp,
      ts: Date.now(),
    });
  } catch (err) {
    console.error('[GameMetrics] getGameMetrics:', err.message);
    res.status(500).json({ error: 'Failed to get game metrics' });
  }
}

module.exports = { getGameMetrics };
