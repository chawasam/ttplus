// handlers/game/weeklyQuests.js — Weekly Quest system (reset ทุกวันจันทร์)
const admin = require('firebase-admin');
const { WEEKLY_QUESTS, WEEKLY_BONUS, getWeekKey, buildFreshWeeklyQuests } = require('../../data/weekly_quests');
const { getItem, rollItem } = require('../../data/items');
const { addGold } = require('./currency');
const { checkAchievements } = require('./achievements');
const { giveXP } = require('./xp');

async function loadOrInitWeeklyDoc(uid, db) {
  const ref  = db.collection('game_weekly_quests').doc(uid);
  const snap = await ref.get();
  const week = getWeekKey();

  if (!snap.exists || snap.data().weekKey !== week) {
    const fresh = {
      weekKey:     week,
      quests:      buildFreshWeeklyQuests(),
      bonusClaimed: false,
    };
    await ref.set(fresh);
    return { ref, data: fresh };
  }
  return { ref, data: snap.data() };
}

// ===== GET weekly quests =====
async function getWeeklyQuests(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const { data } = await loadOrInitWeeklyDoc(uid, db);

    const merged = WEEKLY_QUESTS.map(def => {
      const state = data.quests.find(q => q.id === def.id) || { progress: 0, completed: false, claimed: false };
      return {
        id:         def.id,
        name:       def.name,
        desc:       def.desc,
        type:       def.type,
        target:     def.target,
        progress:   Math.min(state.progress, def.target),
        completed:  state.completed,
        claimed:    state.claimed,
        reward:     def.reward,
      };
    });

    const allCompleted = merged.every(q => q.completed);

    return res.json({
      weekKey:      data.weekKey,
      quests:       merged,
      allCompleted,
      bonusClaimed: data.bonusClaimed,
      bonus:        WEEKLY_BONUS,
    });
  } catch (err) {
    console.error('[WeeklyQuests] getWeeklyQuests:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== CLAIM weekly quest reward =====
async function claimWeeklyReward(req, res) {
  const { questId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const { ref, data } = await loadOrInitWeeklyDoc(uid, db);

    // Bonus reward
    if (questId === 'bonus') {
      if (data.bonusClaimed) return res.status(400).json({ error: 'รับแล้ว' });
      const allCompleted = WEEKLY_QUESTS.every(def => {
        const state = data.quests.find(q => q.id === def.id);
        return state?.completed;
      });
      if (!allCompleted) return res.status(400).json({ error: 'ยังไม่ครบทุก Quest' });

      const rewards = await grantRewards(uid, WEEKLY_BONUS, db);
      await ref.update({ bonusClaimed: true });
      return res.json({ success: true, rewards });
    }

    // Regular quest reward
    const def   = WEEKLY_QUESTS.find(q => q.id === questId);
    if (!def) return res.status(404).json({ error: 'ไม่พบ Quest' });

    const state = data.quests.find(q => q.id === questId);
    if (!state?.completed) return res.status(400).json({ error: 'Quest ยังไม่สำเร็จ' });
    if (state?.claimed)    return res.status(400).json({ error: 'รับแล้ว' });

    const rewards = await grantRewards(uid, def.reward, db);

    // Mark claimed
    const updatedQuests = data.quests.map(q =>
      q.id === questId ? { ...q, claimed: true } : q
    );
    await ref.update({ quests: updatedQuests });

    // Track weekly achievement counter
    const db2 = admin.firestore();
    await db2.collection('game_achievements').doc(uid).set(
      { weeklyTotal: admin.firestore.FieldValue.increment(1) }, { merge: true }
    );
    checkAchievements(uid, 'weekly_claim', 1).catch(() => {});

    return res.json({ success: true, rewards });
  } catch (err) {
    console.error('[WeeklyQuests] claimWeeklyReward:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Track weekly quest progress (fire-and-forget) =====
async function trackWeeklyProgress(uid, eventType, increment = 1) {
  const db = admin.firestore();
  try {
    const { ref, data } = await loadOrInitWeeklyDoc(uid, db);

    let changed = false;
    const updatedQuests = data.quests.map(q => {
      const def = WEEKLY_QUESTS.find(d => d.id === q.id);
      if (!def || def.type !== eventType || q.completed) return q;
      const newProgress = Math.min((q.progress || 0) + increment, def.target);
      changed = true;
      return {
        ...q,
        progress:  newProgress,
        completed: newProgress >= def.target,
      };
    });

    if (changed) await ref.update({ quests: updatedQuests });
  } catch (err) {
    console.error('[WeeklyQuests] trackWeeklyProgress error:', err.message);
  }
}

async function grantRewards(uid, reward, db) {
  const result = { gold: 0, xp: 0, items: [] };

  if (reward.gold > 0) {
    await addGold(uid, reward.gold, 'weekly_quest');
    result.gold = reward.gold;
  }

  if (reward.xp > 0) {
    const xpResult = await giveXP(uid, reward.xp, db);
    result.xp      = reward.xp;
    result.levelUp = xpResult.levelUp || null;
  }

  for (const itemId of (reward.items || [])) {
    const instance = rollItem(itemId);
    if (instance) {
      await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
      const def = getItem(itemId);
      result.items.push({ itemId, name: def?.name || itemId, emoji: def?.emoji || '📦' });
    }
  }

  return result;
}

module.exports = { getWeeklyQuests, claimWeeklyReward, trackWeeklyProgress };
