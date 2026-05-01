// handlers/game/achievements.js — Achievement check + grant system

const admin = require('firebase-admin');
const gameCache = require('../../utils/gameCache');
const { ACHIEVEMENTS, getAchievement } = require('../../data/achievements');
const { addGold } = require('./currency');
const { emitOverlayRefresh } = require('../../lib/emitter');
// giveXP is loaded lazily (below) to avoid circular dep with xp.js

// ===== GET achievements with progress =====
async function getAchievements(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const [acctData, achDoc] = await Promise.all([
      gameCache.getAccount(uid, db),
      db.collection('game_achievements').doc(uid).get(),
    ]);

    if (!acctData) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = acctData.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const char = await gameCache.getCharacter(charId, db);
    if (!char) return res.status(404).json({ error: 'Character ไม่พบ' });

    const achDocData    = achDoc.exists ? achDoc.data() : {};
    const unlockedIds   = achDocData.unlockedIds   || [];
    const unlockedTitles= achDocData.unlockedTitles|| [];
    const equippedTitle = char.equippedTitle || null;
    const stats         = await buildStats(uid, char, db);

    const achievements = ACHIEVEMENTS.map(def => {
      const progress = Math.min(stats[def.type] || 0, def.target);
      const unlocked = unlockedIds.includes(def.id);
      return {
        id:        def.id,
        name:      def.name,
        desc:      def.desc,
        type:      def.type,
        target:    def.target,
        progress,
        unlocked,
        reward:    def.reward,
        category:  def.category,
      };
    });

    const totalCount    = achievements.length;
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return res.json({ achievements, unlockedCount, totalCount, unlockedTitles, equippedTitle });
  } catch (err) {
    console.error('[Achievements] getAchievements:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Fire-and-forget: check + unlock achievements after an event =====
// eventType: 'kill' | 'explore' | 'dungeon_clear' | 'level_up' | 'enhance' | 'npc_gift' | 'npc_bond' | 'death' | 'weekly_claim'
async function checkAchievements(uid, eventType, value = 1) {
  const db = admin.firestore();
  try {
    const acctData = await gameCache.getAccount(uid, db);
    if (!acctData) return;
    const charId = acctData.characterId;
    if (!charId) return;

    const [char, achDoc] = await Promise.all([
      gameCache.getCharacter(charId, db),
      db.collection('game_achievements').doc(uid).get(),
    ]);
    if (!char) return;

    const unlockedIds = achDoc.exists ? (achDoc.data().unlockedIds || []) : [];
    // Only build the stat relevant to this eventType — avoid running all 3 DB queries every call
    const stats = await buildStats(uid, char, db, eventType);

    // Map event types to achievement types
    const typeMap = {
      kill:         'kill_total',
      explore:      'explore_total',
      dungeon_clear:'dungeon_clears',
      level_up:     'level',
      enhance:      'enhance_max',
      npc_gift:     'npc_gift_total',
      npc_bond:     'npc_bonds',
      death:        'death_count',
      weekly_claim: 'weekly_total',
    };

    const achType = typeMap[eventType];
    if (!achType) return;

    // Find eligible achievements of this type not yet unlocked
    const toCheck = ACHIEVEMENTS.filter(a =>
      a.type === achType &&
      !unlockedIds.includes(a.id) &&
      (stats[a.type] || 0) >= a.target
    );

    if (toCheck.length === 0) return;

    const newIds = toCheck.map(a => a.id);
    const newUnlocked = [...unlockedIds, ...newIds];

    // Save unlocked
    await db.collection('game_achievements').doc(uid).set(
      { unlockedIds: newUnlocked },
      { merge: true }
    );

    // Grant rewards
    for (const def of toCheck) {
      if (def.reward.gold > 0) {
        await addGold(uid, def.reward.gold, 'achievement');
      }
      if (def.reward.xp > 0) {
        const { giveXP } = require('./xp');
        await giveXP(uid, def.reward.xp, db);
      }
      // Title reward — save to game_achievements.unlockedTitles
      if (def.reward.title) {
        await db.collection('game_achievements').doc(uid).set(
          { unlockedTitles: admin.firestore.FieldValue.arrayUnion(def.reward.title) },
          { merge: true }
        );
      }
      // Push game event for overlay
      await pushGameEvent(uid, {
        type: 'achievement',
        msg:  `🏆 Achievement: ${def.name}${def.reward.title ? ` · ได้ตำแหน่ง "${def.reward.title}"` : ''}`,
        char: char.name,
      });
      console.log(`[Achievements] uid=${uid} unlocked: ${def.id} (${def.name})`);
    }
  } catch (err) {
    console.error('[Achievements] checkAchievements error:', err.message);
  }
}

// ===== Build stats object from character + db =====
// eventType — optional: pass when calling from checkAchievements to run only the relevant query.
//             omit (null) when calling from getAchievements to build all stats for display.
async function buildStats(uid, char, db, eventType = null) {
  // Map eventType → achType (same as typeMap in checkAchievements)
  const typeMap = {
    kill:         'kill_total',
    explore:      'explore_total',
    dungeon_clear:'dungeon_clears',
    level_up:     'level',
    enhance:      'enhance_max',
    npc_gift:     'npc_gift_total',
    npc_bond:     'npc_bonds',
    death:        'death_count',
    weekly_claim: 'weekly_total',
  };
  const achType = eventType ? typeMap[eventType] : null;

  // Stats that come directly from character fields (no DB query needed)
  const base = {
    kill_total:    char.monstersKilled   || 0,
    explore_total: char.explorationCount || 0,
    level:         char.level            || 1,
    npc_gift_total:char.npcGiftTotal     || 0,
    death_count:   char.deathCount       || 0,
  };

  // If we only need a stat that's already in 'base', return immediately
  if (achType && base[achType] !== undefined) {
    return { ...base, dungeon_clears: 0, enhance_max: 0, npc_bonds: 0, weekly_total: 0 };
  }

  // Queries — run only what's needed
  const needDungeon = !achType || achType === 'dungeon_clears';
  const needAff     = !achType || achType === 'npc_bonds';
  const needInv     = !achType || achType === 'enhance_max';
  const needAch     = !achType || achType === 'weekly_total';

  const [dungeonSnap, affSnap, invSnap, achDoc] = await Promise.all([
    needDungeon ? db.collection('game_dungeons').where('uid', '==', uid).where('status', '==', 'completed').get() : Promise.resolve(null),
    needAff     ? db.collection('game_npc_affection').doc(uid).get() : Promise.resolve(null),
    needInv     ? db.collection('game_inventory').where('uid', '==', uid).get() : Promise.resolve(null),
    needAch     ? db.collection('game_achievements').doc(uid).get() : Promise.resolve(null),
  ]);

  const affData    = (affSnap?.exists) ? affSnap.data() : {};
  const bonds      = Object.values(affData).filter(a => (a.affection || 0) >= 100).length;
  const enhMax     = (!invSnap || invSnap.empty) ? 0 : Math.max(0, ...invSnap.docs.map(d => d.data().enhancement || 0));
  const weeklyTotal= achDoc?.exists ? (achDoc.data().weeklyTotal || 0) : 0;

  return {
    ...base,
    dungeon_clears: dungeonSnap ? dungeonSnap.size : 0,
    enhance_max:   enhMax,
    npc_bonds:     bonds,
    weekly_total:  weeklyTotal,
  };
}

// ===== Push a game event (for stream overlay feed) =====
// Keeps last 20 events in game_accounts doc as recentEvents array
async function pushGameEvent(uid, event) {
  const db = admin.firestore();
  try {
    const newEvent = { ...event, ts: Date.now() };
    const acctData = await gameCache.getAccount(uid, db);
    const current  = acctData?.recentEvents || [];
    const updated  = [newEvent, ...current].slice(0, 20); // keep latest 20
    await db.collection('game_accounts').doc(uid).update({ recentEvents: updated });
    gameCache.invalidateAccount(uid);
    // ส่ง lightweight ping ให้ overlay re-fetch ทันที (แทน 5s poll)
    emitOverlayRefresh(uid);
  } catch (err) {
    // fire-and-forget — don't throw
    console.error('[Achievements] pushGameEvent error:', err.message);
  }
}

module.exports = { getAchievements, checkAchievements, pushGameEvent };
