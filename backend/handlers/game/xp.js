// handlers/game/xp.js — Shared XP + Level-up utility
// ใช้ทุกที่ที่ต้องให้ XP เพื่อให้ level-up ทำงานถูกต้องเสมอ
const admin = require('firebase-admin');
const gameCache = require('../../utils/gameCache');
const { pushGameEvent, checkAchievements } = require('./achievements');

/**
 * giveXP — ให้ XP แก่ตัวละคร พร้อม level-up check ครบถ้วน
 *
 * @param {string} uid           — Firebase UID ของผู้เล่น
 * @param {number} xpAmount      — จำนวน XP ที่จะให้
 * @param {FirebaseFirestore.Firestore} [db] — optional db instance
 * @returns {{ levelUp: number|null, newLevel: number, newXp: number, newXpToNext: number }}
 */
async function giveXP(uid, xpAmount, db) {
  if (!xpAmount || xpAmount <= 0) return { levelUp: null };
  if (!db) db = admin.firestore();

  // หา characterId จาก game_accounts
  const acctData = await gameCache.getAccount(uid, db);
  if (!acctData) return { levelUp: null };
  const charId = acctData.characterId;
  if (!charId) return { levelUp: null };

  const char = await gameCache.getCharacter(charId, db);
  if (!char) return { levelUp: null };
  const charRef = db.collection('game_characters').doc(charId);

  const currentXp  = char.xp       || 0;
  const currentLv  = char.level     || 1;
  const xpToNext   = char.xpToNext  || 100;
  const newXpTotal = currentXp + xpAmount;

  const updates = { xp: newXpTotal };
  let levelUp = null;

  if (newXpTotal >= xpToNext) {
    const newLevel   = currentLv + 1;
    const newXpToNext = Math.floor(200 * Math.pow(newLevel, 1.9));

    updates.level       = newLevel;
    updates.xp          = newXpTotal - xpToNext;   // carry-over XP
    updates.xpToNext    = newXpToNext;
    updates.hpMax       = (char.hpMax  || 100) + 10;
    updates.hp          = (char.hpMax  || 100) + 10; // เต็ม HP ตอน level up
    updates.mpMax       = (char.mpMax  || 50)  + 5;
    updates.mp          = (char.mpMax  || 50)  + 5;
    updates.statPoints  = (char.statPoints  || 0) + 3;
    updates.skillPoints = (char.skillPoints || 0) + 1;
    levelUp = newLevel;

    // Push game event ให้ frontend แสดง celebration
    pushGameEvent(uid, {
      type: 'level_up',
      newLevel,
      msg: `🎉 LEVEL UP! คุณขึ้นเป็น Level ${newLevel}!`,
    }).catch(() => {});

    // Check achievements
    checkAchievements(uid, 'level_up', newLevel).catch(() => {});

    console.log(`[XP] ✅ ${uid} LEVEL UP → Lv.${newLevel} (xp carry-over: ${updates.xp})`);
  }

  await charRef.update(updates);
  gameCache.invalidateChar(charId);

  return {
    levelUp,
    newLevel:   updates.level    || currentLv,
    newXp:      updates.xp,
    newXpToNext: updates.xpToNext || xpToNext,
  };
}

module.exports = { giveXP };
