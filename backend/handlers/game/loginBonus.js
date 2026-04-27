// handlers/game/loginBonus.js — Daily login bonus + streak system
// GET  /api/game/login-bonus/status  — ตรวจว่า claim ได้ไหมวันนี้
// POST /api/game/login-bonus/claim   — รับรางวัล

const admin = require('firebase-admin');
const { pushGameEvent } = require('./achievements');

// UTC+7 วันนี้ในรูป YYYY-MM-DD
function todayTH() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

// รางวัลตาม streak
function getBonusForStreak(streak) {
  if (streak >= 30) return { gold: 5000, xp: 2000, items: ['void_crystal'],     label: '🌟 30 วัน ตำนาน!' };
  if (streak >= 14) return { gold: 2000, xp: 1000, items: ['ancient_scroll'],   label: '💎 14 วัน สุดยอด!' };
  if (streak >= 7)  return { gold: 1000, xp: 500,  items: ['health_potion_large'], label: '🏆 7 วัน ต่อเนื่อง!' };
  if (streak >= 5)  return { gold: 600,  xp: 300,  items: ['iron_ore'],         label: '⭐ 5 วัน เก่งมาก!' };
  if (streak >= 3)  return { gold: 350,  xp: 180,  items: [],                   label: '✨ 3 วัน ดีเลย!' };
  if (streak >= 2)  return { gold: 200,  xp: 100,  items: [],                   label: '🔥 2 วัน!' };
  return             { gold: 100,  xp: 50,   items: [],                   label: '👋 เข้าสู่เกมวันแรก!' };
}

// ===== GET status =====
async function getLoginBonusStatus(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  const today = todayTH();

  try {
    const doc = await db.collection('game_accounts').doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Account not found' });
    const acct = doc.data();

    const lastClaim = acct.lastLoginBonus || '';
    const streak    = acct.loginStreak    || 0;
    const canClaim  = lastClaim !== today;

    // คำนวณ streak ถ้า claim วันนี้
    const yesterday = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    const newStreak = (lastClaim === yesterday) ? streak + 1 : 1;
    const reward    = getBonusForStreak(canClaim ? newStreak : streak);

    return res.json({
      canClaim,
      today,
      streak:      canClaim ? newStreak : streak,
      lastClaim,
      reward,
      nextRewardAt: newStreak < 30 ? [2, 3, 5, 7, 14, 30].find(n => n > (canClaim ? newStreak : streak)) : null,
    });
  } catch (err) {
    console.error('[LoginBonus] status:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== POST claim =====
async function claimLoginBonus(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  const today = todayTH();

  try {
    const acctRef = db.collection('game_accounts').doc(uid);
    const acctDoc = await acctRef.get();
    if (!acctDoc.exists) return res.status(404).json({ error: 'Account not found' });
    const acct = acctDoc.data();

    // ตรวจซ้ำ
    if (acct.lastLoginBonus === today) {
      return res.status(400).json({ error: 'รับ Login Bonus ไปแล้ววันนี้' });
    }

    // คำนวณ streak
    const yesterday = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    const prevStreak = acct.loginStreak || 0;
    const newStreak  = (acct.lastLoginBonus === yesterday) ? prevStreak + 1 : 1;
    const reward     = getBonusForStreak(newStreak);

    // Batch: gold + streak update
    const batch = db.batch();
    batch.update(acctRef, {
      gold:           admin.firestore.FieldValue.increment(reward.gold),
      lastLoginBonus: today,
      loginStreak:    newStreak,
      totalLoginDays: admin.firestore.FieldValue.increment(1),
    });

    // XP → char
    const charId = acct.characterId;
    if (charId && reward.xp > 0) {
      const charRef = db.collection('game_characters').doc(charId);
      batch.update(charRef, { xp: admin.firestore.FieldValue.increment(reward.xp) });
    }

    await batch.commit();

    // Grant items
    const grantedItems = [];
    for (const itemId of reward.items) {
      await db.collection('game_inventory').add({
        uid, itemId,
        instanceId: `bonus_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        enhancement: 0, equipped: false,
        obtainedAt: Date.now(),
        source: 'login_bonus',
      });
      grantedItems.push(itemId);
    }

    // Push event
    pushGameEvent(uid, {
      type: 'achievement',
      msg: `🌅 Login Bonus Day ${newStreak}: +${reward.gold}G, +${reward.xp} XP ${reward.label}`,
      ts: Date.now(),
    }).catch(() => {});

    return res.json({
      success:  true,
      newStreak,
      reward,
      items:    grantedItems,
      msg: `✅ ${reward.label} +${reward.gold} Gold, +${reward.xp} XP`,
    });
  } catch (err) {
    console.error('[LoginBonus] claim:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getLoginBonusStatus, claimLoginBonus };
