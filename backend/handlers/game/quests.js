// handlers/game/quests.js — Daily Quest logic
const admin = require('firebase-admin');
const { DAILY_QUESTS, DAILY_BONUS, getTodayKey, buildFreshQuests } = require('../../data/quests');
const { addGold } = require('./currency');
const { getItem, rollItem } = require('../../data/items');

// ─────────────────────────────────────────────
//  Helper: โหลด (หรือสร้างใหม่) quest doc วันนี้
// ─────────────────────────────────────────────
async function loadOrInitQuestDoc(uid, db) {
  const ref     = db.collection('game_quests').doc(uid);
  const doc     = await ref.get();
  const today   = getTodayKey();

  if (!doc.exists || doc.data().date !== today) {
    // วันใหม่ — reset ทั้งหมด
    const fresh = {
      date:         today,
      quests:       buildFreshQuests(),
      bonusClaimed: false,
      updatedAt:    admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(fresh);
    return { ref, data: fresh };
  }
  return { ref, data: doc.data() };
}

// ─────────────────────────────────────────────
//  GET /api/game/quests  — โหลด quest วันนี้
// ─────────────────────────────────────────────
async function getQuests(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const { data } = await loadOrInitQuestDoc(uid, db);

    // Merge definition กับ progress
    const quests = DAILY_QUESTS.map(def => {
      const state = data.quests.find(q => q.id === def.id) || { progress: 0, completed: false, claimed: false };
      return { ...def, ...state };
    });

    const allCompleted = quests.every(q => q.completed);

    return res.json({
      date:         data.date,
      quests,
      bonusClaimed: data.bonusClaimed || false,
      allCompleted,
      bonus:        DAILY_BONUS,
    });
  } catch (err) {
    console.error('[Quests] getQuests:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─────────────────────────────────────────────
//  POST /api/game/quests/claim  { questId }
//  questId = quest id ปกติ หรือ 'bonus'
// ─────────────────────────────────────────────
async function claimReward(req, res) {
  const { questId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const { ref, data } = await loadOrInitQuestDoc(uid, db);

    // ── Bonus reward ──
    if (questId === 'bonus') {
      const allDone = data.quests.every(q => q.completed);
      if (!allDone)    return res.status(400).json({ error: 'ยังทำไม่ครบทุกภารกิจ' });
      if (data.bonusClaimed) return res.status(400).json({ error: 'รับรางวัล Bonus ไปแล้ว' });

      await addGold(uid, DAILY_BONUS.gold);

      // XP
      const accountDoc = await db.collection('game_accounts').doc(uid).get();
      const charId = accountDoc.data()?.characterId;
      if (charId) {
        await db.collection('game_characters').doc(charId).update({
          xp: admin.firestore.FieldValue.increment(DAILY_BONUS.xp),
        });
      }

      // Item
      let item = null;
      if (DAILY_BONUS.itemId) {
        const instance = rollItem(DAILY_BONUS.itemId);
        if (instance) {
          await db.collection('game_inventory').add({ uid, ...instance });
          const def = getItem(DAILY_BONUS.itemId);
          item = { name: def?.name, emoji: def?.emoji };
        }
      }

      await ref.update({ bonusClaimed: true });
      return res.json({ success: true, rewards: { gold: DAILY_BONUS.gold, xp: DAILY_BONUS.xp, item } });
    }

    // ── Regular quest reward ──
    const idx = data.quests.findIndex(q => q.id === questId);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบเควส' });

    const questState = data.quests[idx];
    if (!questState.completed) return res.status(400).json({ error: 'ยังทำเควสไม่เสร็จ' });
    if (questState.claimed)    return res.status(400).json({ error: 'รับรางวัลไปแล้ว' });

    const def = DAILY_QUESTS.find(q => q.id === questId);
    if (!def) return res.status(404).json({ error: 'ไม่พบนิยามเควส' });

    // Grant rewards
    if (def.reward.gold) await addGold(uid, def.reward.gold);
    if (def.reward.xp) {
      const accountDoc = await db.collection('game_accounts').doc(uid).get();
      const charId = accountDoc.data()?.characterId;
      if (charId) {
        await db.collection('game_characters').doc(charId).update({
          xp: admin.firestore.FieldValue.increment(def.reward.xp),
        });
      }
    }

    // Mark claimed
    const updatedQuests = [...data.quests];
    updatedQuests[idx] = { ...questState, claimed: true };
    await ref.update({ quests: updatedQuests });

    return res.json({ success: true, rewards: def.reward });
  } catch (err) {
    console.error('[Quests] claimReward:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ─────────────────────────────────────────────
//  trackQuestProgress — internal helper
//  เรียกจาก handler อื่น (fire-and-forget)
//  eventType: 'kill' | 'explore' | 'dungeon_clear' | 'npc_gift' | 'rest'
// ─────────────────────────────────────────────
async function trackQuestProgress(uid, eventType, increment = 1) {
  const db = admin.firestore();
  try {
    const { ref, data } = await loadOrInitQuestDoc(uid, db);

    // หา quest ที่ match eventType และยังไม่ complete
    const updatedQuests = data.quests.map(qState => {
      const def = DAILY_QUESTS.find(d => d.id === qState.id);
      if (!def || def.type !== eventType || qState.completed) return qState;

      const newProgress = Math.min((qState.progress || 0) + increment, def.target);
      const completed   = newProgress >= def.target;
      return { ...qState, progress: newProgress, completed };
    });

    await ref.update({ quests: updatedQuests, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    // ไม่ให้ quest bug ทำลาย main flow
    console.error('[Quests] trackQuestProgress error:', err.message);
  }
}

module.exports = { getQuests, claimReward, trackQuestProgress };
