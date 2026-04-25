// utils/anticheat.js — Anti-cheat audit logging + anomaly detection
// เรียกใช้หลัง grantRewards ทุกครั้ง
const admin = require('firebase-admin');

// ─── Thresholds ───────────────────────────────────────────────────────────────
// ปรับได้ตามบาลานซ์เกม
const LIMITS = {
  xp_per_combat:    8000,    // XP สูงสุดจาก 1 combat (zone boss ≈ 3000–5000)
  gold_per_combat:  60000,   // Gold สูงสุดจาก 1 combat
  xp_per_hour:      80000,   // XP รวมต่อชั่วโมง
  gold_per_hour:    300000,  // Gold รวมต่อชั่วโมง
  levels_per_hour:  10,      // level up ต่อชั่วโมง (หากข้ามเยอะเกินไปน่าสงสัย)
};

// ─── Log one reward event ──────────────────────────────────────────────────────
async function logReward(uid, source, { xp = 0, gold = 0, items = [], levelUp = null } = {}) {
  if (!uid) return;
  const db = admin.firestore();

  try {
    const entry = {
      uid,
      source,          // 'combat_drop' | 'explore' | 'dungeon_clear' | ...
      xp,
      gold,
      items,           // array of itemId strings
      levelUp,         // new level number หรือ null
      ts:              admin.firestore.FieldValue.serverTimestamp(),
    };

    // บันทึก log (เก็บ 7 วัน — ลบอัตโนมัติไม่ได้ใน Firestore ต้อง manual หรือ TTL)
    await db.collection('game_audit_rewards').add(entry);

    // ── Anomaly check ──────────────────────────────────────────────────────
    const flags = [];

    if (xp   > LIMITS.xp_per_combat)   flags.push(`XP สูงผิดปกติ (${xp} > ${LIMITS.xp_per_combat}) จาก ${source}`);
    if (gold > LIMITS.gold_per_combat)  flags.push(`Gold สูงผิดปกติ (${gold} > ${LIMITS.gold_per_combat}) จาก ${source}`);

    if (flags.length > 0) {
      await flagPlayer(uid, flags.join(' | '), { xp, gold, items, source });
    }

    // ── Hourly accumulation check (async — ไม่ block response) ───────────
    checkHourlyLimits(uid, xp, gold).catch(() => {});

  } catch (err) {
    // ไม่ให้ anti-cheat crash game flow
    console.warn('[AntiCheat] logReward error:', err.message);
  }
}

// ─── Check rolling 1-hour totals ──────────────────────────────────────────────
async function checkHourlyLimits(uid, newXp, newGold) {
  const db  = admin.firestore();
  const oneHourAgo = new Date(Date.now() - 3600_000);

  const snap = await db.collection('game_audit_rewards')
    .where('uid', '==', uid)
    .where('ts', '>=', oneHourAgo)
    .get();

  let totalXp   = newXp;
  let totalGold = newGold;
  let levels    = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    totalXp   += d.xp   || 0;
    totalGold += d.gold || 0;
    if (d.levelUp) levels++;
  }

  const flags = [];
  if (totalXp   > LIMITS.xp_per_hour)    flags.push(`XP สะสม 1h สูงผิดปกติ (${totalXp})`);
  if (totalGold > LIMITS.gold_per_hour)   flags.push(`Gold สะสม 1h สูงผิดปกติ (${totalGold})`);
  if (levels    > LIMITS.levels_per_hour) flags.push(`Level up ${levels} ครั้งใน 1h`);

  if (flags.length > 0) {
    await flagPlayer(uid, '[HOURLY] ' + flags.join(' | '), { totalXp, totalGold, levels });
  }
}

// ─── Flag a player as suspicious ──────────────────────────────────────────────
async function flagPlayer(uid, reason, data = {}) {
  const db = admin.firestore();
  console.warn(`[AntiCheat] FLAG uid=${uid} — ${reason}`);

  try {
    await db.collection('game_flags').add({
      uid,
      reason,
      data,
      resolved:   false,
      ts:         admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('[AntiCheat] flagPlayer error:', err.message);
  }
}

module.exports = { logReward, flagPlayer };
