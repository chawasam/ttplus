// handlers/game/currency.js — Gold management + anti-cheat
const admin = require('firebase-admin');

// ===== Anti-cheat: Rate limiting per user =====
const goldEarnedThisHour = new Map(); // uid → { amount, resetAt }
const GOLD_CAP_PER_HOUR  = 500_000;
const SOFT_CAP_1         = 10_000_000;
const SOFT_CAP_2         = 50_000_000;

// ล้าง expired entries ทุก 5 นาที
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of goldEarnedThisHour.entries()) {
    if (now > v.resetAt) goldEarnedThisHour.delete(k);
  }
}, 5 * 60 * 1000);

function checkHourlyLimit(uid, amount) {
  const now   = Date.now();
  const entry = goldEarnedThisHour.get(uid);
  if (!entry || now > entry.resetAt) {
    goldEarnedThisHour.set(uid, { amount, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.amount + amount > GOLD_CAP_PER_HOUR) return false;
  entry.amount += amount;
  return true;
}

// Soft cap: gold เยอะเกินไป → penalty
function applySoftCap(currentGold, earnedGold) {
  if (currentGold >= SOFT_CAP_2) return Math.floor(earnedGold * 0.1);
  if (currentGold >= SOFT_CAP_1) return Math.floor(earnedGold * 0.5);
  return earnedGold;
}

// ===== Add gold (internal — called from tiktokCurrency.js and quest/combat) =====
async function addGold(uid, amount, reason = 'system') {
  if (!uid || amount <= 0) return { success: false, error: 'Invalid params' };

  const db  = admin.firestore();
  const ref = db.collection('game_accounts').doc(uid);

  try {
    let finalAmount = amount;

    // Rate limit check (only for TikTok gifts)
    if (reason === 'tiktok_gift') {
      if (!checkHourlyLimit(uid, amount)) {
        console.warn(`[Currency] hourly limit hit uid=${uid} amount=${amount}`);
        return { success: false, error: 'hourly_limit' };
      }
    }

    // Read current gold for soft cap
    const doc  = await ref.get();
    if (!doc.exists) return { success: false, error: 'Account not found' };
    const currentGold = doc.data().gold || 0;

    if (reason === 'tiktok_gift') {
      finalAmount = applySoftCap(currentGold, amount);
    }

    await ref.update({
      gold: admin.firestore.FieldValue.increment(finalAmount),
    });

    return { success: true, added: finalAmount, newTotal: currentGold + finalAmount };
  } catch (err) {
    console.error('[Currency] addGold error:', err.message);
    return { success: false, error: err.message };
  }
}

// ===== Deduct gold (internal — called from shop, enhance, etc.) =====
async function deductGold(uid, amount, reason = 'system') {
  if (!uid || amount <= 0) return { success: false, error: 'Invalid params' };

  const db  = admin.firestore();
  const ref = db.collection('game_accounts').doc(uid);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error('Account not found');
      const current = doc.data().gold || 0;
      if (current < amount) throw new Error('ไม่มี Gold เพียงพอ');
      tx.update(ref, { gold: current - amount });
      return { newTotal: current - amount };
    });

    console.log(`[Currency] deductGold uid=${uid} amount=${amount} reason=${reason}`);
    return { success: true, deducted: amount, newTotal: result.newTotal };
  } catch (err) {
    const isInsufficient = err.message.includes('ไม่มี Gold');
    if (!isInsufficient) console.error('[Currency] deductGold error:', err.message);
    return { success: false, error: err.message };
  }
}

// ===== GET gold balance =====
async function getBalance(req, res) {
  const db = admin.firestore();
  try {
    const doc = await db.collection('game_accounts').doc(req.user.uid).get();
    if (!doc.exists) return res.json({ gold: 0, realmPoints: 0 });
    const data = doc.data();
    res.json({ gold: data.gold || 0, realmPoints: data.realmPoints || 0 });
  } catch (err) {
    console.error('[Currency] getBalance:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Realm Points (passive income จากดูสตรีม) =====
// เรียกจาก socket 'realm_tick' event ทุก 5 นาที ต่อ authenticated user
async function addRealmPoints(uid, points = 1) {
  const db = admin.firestore();
  try {
    await db.collection('game_accounts').doc(uid).update({
      realmPoints: admin.firestore.FieldValue.increment(points),
    });
    return { success: true };
  } catch (err) {
    console.error('[Currency] addRealmPoints:', err.message);
    return { success: false };
  }
}

// ===== Redeem Realm Points → Gold =====
// Rate: 100 RP = 10 gold (อัตราต่ำ)
async function redeemRealmPoints(req, res) {
  const { amount } = req.body;
  if (!amount || !Number.isInteger(amount) || amount < 100 || amount > 10000) {
    return res.status(400).json({ error: 'จำนวน RP ต้องอยู่ระหว่าง 100 - 10,000' });
  }

  const uid = req.user.uid;
  const db  = admin.firestore();
  const ref = db.collection('game_accounts').doc(uid);

  try {
    const goldToAdd = Math.floor(amount / 100) * 10;

    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new Error('Account not found');
      const current = doc.data().realmPoints || 0;
      if (current < amount) throw new Error('RP ไม่เพียงพอ');
      const currentGold = doc.data().gold || 0;
      tx.update(ref, {
        realmPoints: current - amount,
        gold: currentGold + goldToAdd,
      });
      return { newRP: current - amount, newGold: currentGold + goldToAdd };
    });

    return res.json({ success: true, rpUsed: amount, goldAdded: goldToAdd, ...result });
  } catch (err) {
    const isInsufficient = err.message.includes('RP ไม่เพียงพอ');
    if (!isInsufficient) console.error('[Currency] redeemRP:', err.message);
    return res.status(400).json({ error: err.message });
  }
}

module.exports = { addGold, deductGold, getBalance, addRealmPoints, redeemRealmPoints };
