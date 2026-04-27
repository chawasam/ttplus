// handlers/game/tiktokCurrency.js — TikTok gift → Gold + RP pipeline
// hook เข้า tiktok.js gift event (เรียกจาก tiktok.js)
const admin  = require('firebase-admin');
const { addGold, addRealmPoints } = require('./currency');
const { triggerBossFromGift }     = require('./worldBoss');

// World Boss spawn threshold: ทุก 500 diamonds สะสม (ต่อ VJ session) จะ spawn boss
const BOSS_SPAWN_THRESHOLD = 500;

// RP conversion rate: 10 diamonds = 1 RP (1 TikTok coin = 1 diamond → เปย์ 10 coin = 1 RP)
const DIAMONDS_PER_RP = 10;

// Idempotency cache (in-memory, ครอบ reconnect window)
// txId → true (เก็บ 1 ชั่วโมง)
const processedTx = new Map();
setInterval(() => {
  const cutoff = Date.now() - 3600_000;
  for (const [k, v] of processedTx.entries()) {
    if (v < cutoff) processedTx.delete(k);
  }
}, 10 * 60 * 1000);

// ===== Main handler: เรียกจาก tiktok.js ทุกครั้งที่รับ gift event =====
async function processGift({ vjUid, tiktokUniqueId, giftName, diamondCount, repeatCount, serverTime, ipHash }) {
  if (!vjUid || !tiktokUniqueId || !giftName || diamondCount <= 0) return;

  const db         = admin.firestore();
  const totalDiamonds = diamondCount * repeatCount;
  const goldAmount    = totalDiamonds;                              // 1 diamond = 1 gold
  const rpAmount      = Math.floor(totalDiamonds / DIAMONDS_PER_RP); // 10 diamonds = 1 RP

  // Idempotency key
  const txId = `tx_${tiktokUniqueId}_${Math.floor(serverTime / 1000)}_${giftName}_${repeatCount}_${diamondCount}`;

  if (processedTx.has(txId)) {
    console.log(`[TikTokCurrency] Duplicate tx skipped: ${txId}`);
    return;
  }
  processedTx.set(txId, Date.now());

  // หา viewer's game account จาก tiktokUniqueId
  let viewerUid = null;
  try {
    const snap = await db.collection('game_accounts')
      .where('tiktokUniqueId', '==', tiktokUniqueId.toLowerCase())
      .where('tiktokVerified', '==', true)
      .limit(1).get();

    if (snap.empty) {
      // ผู้ส่งยังไม่ได้ verify → ไม่ให้ gold แต่ record ไว้
      console.log(`[TikTokCurrency] @${tiktokUniqueId} not verified, gift skipped`);
      return;
    }
    viewerUid = snap.docs[0].id;
  } catch (err) {
    console.error('[TikTokCurrency] Firestore lookup error:', err.message);
    return;
  }

  // บันทึก transaction ก่อนให้ gold (audit log)
  const txRef = db.collection('game_transactions').doc(txId);
  try {
    await txRef.set({
      txId,
      uid:            viewerUid,
      vjId:           vjUid,
      tiktokUniqueId: tiktokUniqueId.toLowerCase(),
      giftName,
      diamondCount,
      repeatCount,
      goldEarned:     goldAmount,
      serverTime,
      ipHash:         ipHash || null,
      processed:      false,
      createdAt:      admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[TikTokCurrency] txRef.set error:', err.message);
    // ถ้า txId ซ้ำจะ error → double protection
    return;
  }

  // Add gold
  const result = await addGold(viewerUid, goldAmount, 'tiktok_gift');

  // Add RP (if earned)
  let rpResult = { success: false, added: 0 };
  if (rpAmount > 0) {
    rpResult = await addRealmPoints(viewerUid, rpAmount);
    if (rpResult.success) {
      console.log(`[TikTokCurrency] 💎 @${tiktokUniqueId} → uid=${viewerUid} +${rpAmount} RP (${totalDiamonds} diamonds)`);
    }
  }

  // อัปเดต transaction เป็น processed
  try {
    await txRef.update({
      processed:    result.success,
      goldActual:   result.added || 0,
      rpEarned:     rpAmount,
      rpGranted:    rpResult.success ? rpAmount : 0,
      processedAt:  admin.firestore.FieldValue.serverTimestamp(),
      error:        result.error || null,
    });
  } catch (err) {
    console.error('[TikTokCurrency] txRef.update error:', err.message);
  }

  if (result.success) {
    console.log(`[TikTokCurrency] ✅ @${tiktokUniqueId} → uid=${viewerUid} +${result.added} gold${rpAmount > 0 ? ` +${rpAmount} RP` : ''} (${giftName} ×${repeatCount})`);
  } else {
    console.warn(`[TikTokCurrency] ⚠️ addGold failed uid=${viewerUid}: ${result.error}`);
  }

  // ── World Boss auto-spawn: สะสม diamonds ต่อ VJ ──────────────────────────
  // ทุก BOSS_SPAWN_THRESHOLD diamonds จาก viewers จะ spawn World Boss ใหม่
  try {
    const trackerRef = db.collection('game_boss_tracker').doc(vjUid);
    await db.runTransaction(async tx => {
      const trackerDoc = await tx.get(trackerRef);
      const prev = trackerDoc.exists ? (trackerDoc.data().diamonds || 0) : 0;
      const next = prev + totalDiamonds;
      tx.set(trackerRef, {
        diamonds:  next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // เช็คว่าข้ามเกณฑ์ threshold หรือเปล่า
      if (Math.floor(next / BOSS_SPAWN_THRESHOLD) > Math.floor(prev / BOSS_SPAWN_THRESHOLD)) {
        console.log(`[TikTokCurrency] 🐉 Boss threshold crossed! Total: ${next} diamonds`);
        // trigger หลัง transaction เพื่อไม่ block
        setImmediate(() => {
          triggerBossFromGift(next).catch(e =>
            console.error('[TikTokCurrency] boss trigger failed:', e.message)
          );
        });
      }
    });
  } catch (bossErr) {
    console.error('[TikTokCurrency] boss tracker error:', bossErr.message);
  }

  return { ...result, rpAdded: rpAmount };
}

module.exports = { processGift };
