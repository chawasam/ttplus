// handlers/game/skills.js — Skill unlock + query handler
const admin = require('firebase-admin');
const { getClassSkills, getSkill, getPassive } = require('../../data/skills');

// ===== GET skills (unlocked + available) =====
async function getSkills(req, res) {
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

    const className    = char.class?.toLowerCase();
    const classSkills  = getClassSkills(className);
    const unlockedIds  = char.unlockedSkills || [];
    const passive      = getPassive(className);
    const skillPts     = char.skillPoints || 0;

    const skills = classSkills.map(s => ({
      ...s,
      unlocked:   unlockedIds.includes(s.id),
      canUnlock:  !unlockedIds.includes(s.id) && char.level >= s.minLevel && skillPts >= s.skillPointCost,
      levelLocked: char.level < s.minLevel,
    }));

    return res.json({
      skills,
      passive,
      skillPoints: skillPts,
      unlockedCount: unlockedIds.length,
    });
  } catch (err) {
    console.error('[Skills] getSkills:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== UNLOCK a skill =====
async function unlockSkill(req, res) {
  const { skillId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  const skillDef = getSkill(skillId);
  if (!skillDef) return res.status(404).json({ error: 'ไม่พบ Skill' });

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();

    // ตรวจ class
    const classSkills = getClassSkills(char.class?.toLowerCase());
    if (!classSkills.find(s => s.id === skillId)) {
      return res.status(400).json({ error: 'Skill นี้ไม่ใช่ของ class คุณ' });
    }

    // ตรวจ level
    if ((char.level || 1) < skillDef.minLevel) {
      return res.status(400).json({ error: `ต้องการ Level ${skillDef.minLevel}` });
    }

    // ตรวจ unlock แล้วหรือยัง
    const unlockedIds = char.unlockedSkills || [];
    if (unlockedIds.includes(skillId)) {
      return res.status(400).json({ error: 'Unlock แล้ว' });
    }

    // ตรวจ skillPoints
    const pts = char.skillPoints || 0;
    if (pts < skillDef.skillPointCost) {
      return res.status(400).json({ error: `Skill Points ไม่พอ (มี ${pts}, ต้องการ ${skillDef.skillPointCost})` });
    }

    await charRef.update({
      skillPoints:    pts - skillDef.skillPointCost,
      unlockedSkills: admin.firestore.FieldValue.arrayUnion(skillId),
    });

    return res.json({
      success: true,
      skillId,
      skillName: skillDef.name,
      skillPoints: pts - skillDef.skillPointCost,
    });
  } catch (err) {
    console.error('[Skills] unlockSkill:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getSkills, unlockSkill };
