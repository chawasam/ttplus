// handlers/game/character.js — Stat allocation + character info
const admin = require('firebase-admin');

// Stat → derived stat mapping
// STR: +2 ATK per point
// INT: +3 MAG + 5 MP per point
// AGI: +1 SPD + 0.5% dodge (ยังไม่ใช้ dodge ใน combat — เก็บ stat ไว้ก่อน)
// VIT: +10 HP + 1 DEF per point
const STAT_EFFECTS = {
  str: { atk: 2 },
  int: { mag: 3, mpMax: 5 },
  agi: { spd: 1 },
  vit: { hpMax: 10, def: 1 },
};

// ===== GET full character profile =====
async function getCharacterProfile(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char = charDoc.data();

    // Stats allocated so far
    const allocatedStats = char.allocatedStats || { str: 0, int: 0, agi: 0, vit: 0 };

    return res.json({
      name:          char.name,
      race:          char.race,
      class:         char.class,
      level:         char.level || 1,
      xp:            char.xp || 0,
      xpToNext:      char.xpToNext || 100,
      hp:            char.hp,
      hpMax:         char.hpMax,
      mp:            char.mp,
      mpMax:         char.mpMax,
      atk:           char.atk,
      def:           char.def,
      mag:           char.mag,
      spd:           char.spd,
      stamina:       char.stamina,
      staminaMax:    char.staminaMax,
      statPoints:    char.statPoints || 0,
      skillPoints:   char.skillPoints || 0,
      unlockedSkills: char.unlockedSkills || [],
      allocatedStats,
      monstersKilled: char.monstersKilled || 0,
      deathCount:    char.deathCount || 0,
      location:      char.location || 'town_square',
      equippedTitle: char.equippedTitle || null,
    });
  } catch (err) {
    console.error('[Character] getCharacterProfile:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== ALLOCATE stat points =====
async function allocateStat(req, res) {
  const { stat, points = 1 } = req.body;
  const uid = req.user.uid;

  if (!['str', 'int', 'agi', 'vit'].includes(stat)) {
    return res.status(400).json({ error: 'stat ต้องเป็น str | int | agi | vit' });
  }
  if (!Number.isInteger(points) || points < 1 || points > 10) {
    return res.status(400).json({ error: 'points ต้องอยู่ระหว่าง 1-10' });
  }

  const db = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char    = charDoc.data();

    const available = char.statPoints || 0;
    if (available < points) {
      return res.status(400).json({ error: `Stat Points ไม่พอ (มี ${available}, ต้องการ ${points})` });
    }

    const effects  = STAT_EFFECTS[stat];
    const updates  = {
      statPoints:    available - points,
      [`allocatedStats.${stat}`]: admin.firestore.FieldValue.increment(points),
    };

    // Apply derived stat changes
    for (const [derivedStat, perPoint] of Object.entries(effects)) {
      updates[derivedStat] = admin.firestore.FieldValue.increment(perPoint * points);
    }

    // For hpMax/mpMax changes, also heal current hp/mp by same amount
    if (effects.hpMax) {
      updates.hp = admin.firestore.FieldValue.increment(effects.hpMax * points);
    }
    if (effects.mpMax) {
      updates.mp = admin.firestore.FieldValue.increment(effects.mpMax * points);
    }

    await charRef.update(updates);

    // Read back updated values
    const updated = (await charRef.get()).data();

    const statLabel = { str: 'STR', int: 'INT', agi: 'AGI', vit: 'VIT' }[stat];
    return res.json({
      success:     true,
      stat,
      points,
      statPoints:  updated.statPoints,
      atk:         updated.atk,
      def:         updated.def,
      mag:         updated.mag,
      spd:         updated.spd,
      hpMax:       updated.hpMax,
      mpMax:       updated.mpMax,
      msg:         `✅ ใส่ ${points} point ใส่ ${statLabel} — ค่าอัปเดตแล้ว!`,
    });
  } catch (err) {
    console.error('[Character] allocateStat:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== EQUIP title =====
async function equipTitle(req, res) {
  const { title } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    // ตรวจว่า title นี้ unlock จริง (อยู่ใน game_achievements.unlockedTitles)
    const achDoc = await db.collection('game_achievements').doc(uid).get();
    const unlockedTitles = achDoc.exists ? (achDoc.data().unlockedTitles || []) : [];

    if (title && !unlockedTitles.includes(title)) {
      return res.status(403).json({ error: `ยังไม่ได้ unlock ตำแหน่ง "${title}"` });
    }

    // บันทึก (null = ถอด title)
    await db.collection('game_characters').doc(charId).update({
      equippedTitle: title || null,
    });

    return res.json({
      success: true,
      equippedTitle: title || null,
      msg: title ? `✅ ใส่ตำแหน่ง "${title}" แล้ว` : '✅ ถอดตำแหน่งแล้ว',
    });
  } catch (err) {
    console.error('[Character] equipTitle:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getCharacterProfile, allocateStat, equipTitle };
