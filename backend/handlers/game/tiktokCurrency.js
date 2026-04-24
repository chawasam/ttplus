// handlers/game/tiktokCurrency.js — TikTok gift → Gold pipeline
// hook เข้า tiktok.js gift event (เรียกจาก tiktok.js)
const admin  = require('firebase-admin');
const { addGold } = require('./currency');

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
  const goldAmount = diamondCount * repeatCount; // 1 diamond = 1 gold

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

  // อัปเดต transaction เป็น processed
  try {
    await txRef.update({
      processed:    result.success,
      goldActual:   result.added || 0,
      processedAt:  admin.firestore.FieldValue.serverTimestamp(),
      error:        result.error || null,
    });
  } catch (err) {
    console.error('[TikTokCurrency] txRef.update error:', err.message);
  }

  if (result.success) {
    console.log(`[TikTokCurrency] ✅ @${tiktokUniqueId} → uid=${viewerUid} +${result.added} gold (${giftName} ×${repeatCount})`);
  } else {
    console.warn(`[TikTokCurrency] ⚠️ addGold failed uid=${viewerUid}: ${result.error}`);
  }

  return result;
}

module.exports = { processGift };
