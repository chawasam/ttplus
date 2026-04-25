// handlers/game/dungeon.js — Dungeon run logic for Ashenveil
const admin = require('firebase-admin');
const { getDungeon, listAllDungeons, getDungeonMonster, getDungeonRoom } = require('../../data/dungeons');
const { getMonster, calcDamage } = require('../../data/monsters');
const { getItem, rollItem } = require('../../data/items');
const { addGold } = require('./currency');

// ===== Helper: get monster def (dungeon or regular) =====
function resolveMonster(monsterId) {
  return getMonster(monsterId) || getDungeonMonster(monsterId) || null;
}

// ===== Helper: get current dungeon run =====
async function getCurrentRun(uid) {
  const db = admin.firestore();
  const snap = await db.collection('game_dungeons')
    .where('uid', '==', uid)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ===== List Dungeons =====
async function listDungeons(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const dungeons = listAllDungeons();

    // Load account for character level
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const charId = accountDoc.data().characterId;
    let charLevel = 1;
    if (charId) {
      const charDoc = await db.collection('game_characters').doc(charId).get();
      if (charDoc.exists) charLevel = charDoc.data().level || 1;
    }

    // Load recent completions for cooldown info
    const completedSnap = await db.collection('game_dungeons')
      .where('uid', '==', uid)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(10)
      .get();

    const lastClear = {};
    for (const doc of completedSnap.docs) {
      const d = doc.data();
      if (!lastClear[d.dungeonId]) {
        lastClear[d.dungeonId] = d.completedAt?.toMillis?.() || 0;
      }
    }

    const activeRun = await getCurrentRun(uid);

    const result = dungeons.map(d => {
      const cooldownMs   = (d.clearCooldownHours || 4) * 3600_000;
      const lastMs       = lastClear[d.id] || 0;
      const nextAvailMs  = lastMs + cooldownMs;
      const cooldownLeft = Math.max(0, nextAvailMs - Date.now());
      const cooldownHrs  = Math.ceil(cooldownLeft / 3600_000);

      return {
        id:             d.id,
        name:           d.name,
        nameTH:         d.nameTH,
        emoji:          d.emoji,
        region:         d.region,
        desc:           d.desc,
        difficulty:     d.difficulty,
        difficultyLabel: d.difficultyLabel,
        minLevel:       d.minLevel,
        totalRooms:     d.totalRooms,
        charLevel,
        canEnter:       charLevel >= d.minLevel && cooldownLeft === 0,
        levelLocked:    charLevel < d.minLevel,
        onCooldown:     cooldownLeft > 0,
        cooldownHoursLeft: cooldownHrs,
        hasActiveRun:   activeRun?.dungeonId === d.id,
      };
    });

    return res.json({ dungeons: result, activeRun: activeRun || null });
  } catch (err) {
    console.error('[Dungeon] listDungeons:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Get current run state =====
async function getRunState(req, res) {
  const uid = req.user.uid;
  try {
    const run = await getCurrentRun(uid);
    if (!run) return res.json({ run: null });

    const dungeon = getDungeon(run.dungeonId);
    const room    = dungeon?.rooms[run.currentRoom] || null;
    return res.json({ run, dungeon: dungeon ? summarizeDungeon(dungeon) : null, room });
  } catch (err) {
    console.error('[Dungeon] getRunState:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Enter Dungeon =====
async function enterDungeon(req, res) {
  const { dungeonId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const dungeon = getDungeon(dungeonId);
    if (!dungeon) return res.status(404).json({ error: 'ไม่พบ Dungeon' });

    // Check for existing active run
    const existingRun = await getCurrentRun(uid);
    if (existingRun) {
      if (existingRun.dungeonId === dungeonId) {
        // Resume existing run
        const room = dungeon.rooms[existingRun.currentRoom];
        return res.json({ run: existingRun, dungeon: summarizeDungeon(dungeon), room, resumed: true });
      }
      return res.status(400).json({ error: 'คุณมี Dungeon run ที่ค้างอยู่ ต้อง Flee หรือ Clear ก่อน' });
    }

    // Check level requirement
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char = charDoc.data();

    if ((char.level || 1) < dungeon.minLevel) {
      return res.status(403).json({ error: `ต้องการ Level ${dungeon.minLevel} ขึ้นไป` });
    }
    if (char.hp <= 0) {
      return res.status(400).json({ error: 'HP หมด ต้อง Rest ก่อน' });
    }

    // Check cooldown
    const cooldownMs = dungeon.clearCooldownHours * 3600_000;
    const completedSnap = await db.collection('game_dungeons')
      .where('uid', '==', uid)
      .where('dungeonId', '==', dungeonId)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get();

    if (!completedSnap.empty) {
      const lastComplete = completedSnap.docs[0].data().completedAt?.toMillis?.() || 0;
      const remaining = lastComplete + cooldownMs - Date.now();
      if (remaining > 0) {
        const hrs = Math.ceil(remaining / 3600_000);
        return res.status(429).json({ error: `Cooldown: อีก ${hrs} ชั่วโมงจึงเข้าได้อีก` });
      }
    }

    // Create dungeon run
    const runRef = db.collection('game_dungeons').doc();
    const run = {
      uid,
      charId,
      dungeonId,
      currentRoom: 0,
      totalRooms:  dungeon.totalRooms,
      status:      'active',
      loot:        [],
      goldEarned:  0,
      startedAt:   admin.firestore.FieldValue.serverTimestamp(),
      completedAt: null,
    };
    await runRef.set(run);

    const runData = { id: runRef.id, ...run };
    const room    = dungeon.rooms[0];
    return res.json({ run: runData, dungeon: summarizeDungeon(dungeon), room });

  } catch (err) {
    console.error('[Dungeon] enterDungeon:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Room Action (trap / treasure / rest / advance after combat) =====
async function roomAction(req, res) {
  const { action } = req.body; // 'resolve_trap' | 'loot_treasure' | 'rest' | 'advance'
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const run = await getCurrentRun(uid);
    if (!run) return res.status(400).json({ error: 'ไม่มี Dungeon run ที่ active' });

    const dungeon = getDungeon(run.dungeonId);
    const room    = dungeon?.rooms[run.currentRoom];
    if (!room) return res.status(400).json({ error: 'ไม่พบข้อมูลห้อง' });

    const log = [];
    let updateData = {};
    let rewards = null;

    // ── ADVANCE (after combat or boss win) ──
    if (action === 'advance') {
      if (room.type !== 'combat' && room.type !== 'boss') {
        return res.status(400).json({ error: `ห้องนี้ type=${room.type} ต้องใช้ action อื่น` });
      }
      // Will be called after combat victory; just advance room
      return await advanceRoom(uid, run, dungeon, room, db, log, res);
    }

    // ── TRAP ──
    if (action === 'resolve_trap') {
      if (room.type !== 'trap') return res.status(400).json({ error: 'ห้องนี้ไม่ใช่ Trap' });

      const charDoc  = await db.collection('game_characters').doc(run.charId).get();
      const char     = charDoc.data();
      const statVal  = char[room.dodgeStat] || 0;
      const dodged   = statVal >= room.dodgeThreshold;

      if (dodged) {
        log.push(room.avoidMsg);
        rewards = { dodged: true };
      } else {
        const dmg = room.trapDmg || 15;
        const newHp = Math.max(1, char.hp - dmg); // trap ไม่ kill (พา HP ไป 1)
        const hpUpdate = { hp: newHp };

        if (room.trapMpDmg) {
          hpUpdate.mp = Math.max(0, char.mp - room.trapMpDmg);
        }
        await db.collection('game_characters').doc(run.charId).update(hpUpdate);
        log.push(room.hitMsg.replace('{dmg}', dmg));
        rewards = { dodged: false, dmgTaken: dmg };
      }

      return await advanceRoom(uid, run, dungeon, room, db, log, res, rewards);
    }

    // ── TREASURE ──
    if (action === 'loot_treasure') {
      if (room.type !== 'treasure') return res.status(400).json({ error: 'ห้องนี้ไม่ใช่ Treasure' });

      const [minG, maxG] = room.gold || [20, 60];
      const gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
      await addGold(uid, gold);
      log.push(`💰 ได้รับ ${gold} Gold!`);

      let foundItem = null;
      if (room.itemPool?.length && Math.random() < (room.findChance || 0.5)) {
        const itemId = room.itemPool[Math.floor(Math.random() * room.itemPool.length)];
        const itemDef = getItem(itemId);
        if (itemDef) {
          const instanceId = `inv_${uid}_${Date.now()}`;
          await db.collection('game_inventory').add({
            uid,
            itemId,
            instanceId,
            enhancement: 0,
            equipped: false,
            obtainedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          foundItem = { itemId, name: itemDef.name, emoji: itemDef.emoji };
          log.push(`📦 พบ ${itemDef.emoji} ${itemDef.name}!`);
        }
      } else {
        log.push('🔍 ค้นดูแล้ว... ไม่มีอะไรเพิ่มเติม');
      }

      updateData.goldEarned = admin.firestore.FieldValue.increment(gold);
      rewards = { gold, item: foundItem };

      return await advanceRoom(uid, run, dungeon, room, db, log, res, rewards, updateData);
    }

    // ── REST ──
    if (action === 'rest') {
      if (room.type !== 'rest') return res.status(400).json({ error: 'ห้องนี้ไม่ใช่ Rest' });

      const charDoc = await db.collection('game_characters').doc(run.charId).get();
      const char    = charDoc.data();
      const healed  = Math.floor((char.hpMax || char.hp) * (room.healPercent || 0.25));
      const newHp   = Math.min(char.hpMax || 9999, char.hp + healed);
      const charUpdate = { hp: newHp };

      if (room.healMpPercent) {
        const mpHeal = Math.floor((char.mpMax || char.mp) * room.healMpPercent);
        charUpdate.mp = Math.min(char.mpMax || 9999, char.mp + mpHeal);
        log.push(`💧 ฟื้นฟู ${mpHeal} MP`);
      }

      await db.collection('game_characters').doc(run.charId).update(charUpdate);
      log.push(`💚 ฟื้นฟู ${healed} HP`);
      rewards = { healed, newHp };

      return await advanceRoom(uid, run, dungeon, room, db, log, res, rewards);
    }

    return res.status(400).json({ error: `action "${action}" ไม่ถูกต้อง` });

  } catch (err) {
    console.error('[Dungeon] roomAction:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Advance to next room (or complete dungeon) =====
async function advanceRoom(uid, run, dungeon, currentRoom, db, log, res, rewards = null, extraUpdate = {}) {
  const nextRoomIndex = run.currentRoom + 1;

  // — Boss killed → complete dungeon —
  if (currentRoom.type === 'boss' || nextRoomIndex >= dungeon.totalRooms) {
    return await completeDungeon(uid, run, dungeon, db, log, res, rewards);
  }

  // — Advance to next room —
  const nextRoom = dungeon.rooms[nextRoomIndex];
  await db.collection('game_dungeons').doc(run.id).update({
    currentRoom: nextRoomIndex,
    ...extraUpdate,
  });

  return res.json({
    advanced: true,
    nextRoom,
    nextRoomIndex,
    log,
    rewards,
  });
}

// ===== Complete Dungeon =====
async function completeDungeon(uid, run, dungeon, db, log, res, prevRewards = null) {
  try {
    const cr = dungeon.clearRewards;

    // Gold reward
    const [minG, maxG] = cr.gold || [100, 300];
    const goldBonus = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
    await addGold(uid, goldBonus);
    log.push(`🏆 เคลียร์ ${dungeon.nameTH}!`);
    log.push(`💰 รางวัล Gold: ${goldBonus}`);

    // XP reward
    const charDoc = await db.collection('game_characters').doc(run.charId).get();
    const char    = charDoc.data();
    const newXp   = (char.xp || 0) + (cr.xp || 0);
    const charUpdate = { xp: newXp };
    // Simple level-up check (100 xp per level)
    const xpNeeded = (char.level || 1) * 100;
    if (newXp >= xpNeeded) {
      charUpdate.level = (char.level || 1) + 1;
      charUpdate.skillPoints = (char.skillPoints || 0) + 3;
      log.push(`🎉 Level Up! → Level ${charUpdate.level}`);
    }

    // Item rewards
    const lootItems = [];
    const count = cr.itemCount || 1;
    const pool  = [...(cr.itemPool || [])];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx    = Math.floor(Math.random() * pool.length);
      const itemId = pool.splice(idx, 1)[0];
      const itemDef = getItem(itemId);
      if (itemDef) {
        const instanceId = `inv_${uid}_${Date.now()}_${i}`;
        await db.collection('game_inventory').add({
          uid,
          itemId,
          instanceId,
          enhancement: 0,
          equipped: false,
          obtainedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        lootItems.push({ itemId, name: itemDef.name, emoji: itemDef.emoji });
        log.push(`📦 ได้รับ ${itemDef.emoji} ${itemDef.name}`);
      }
    }

    // Update dungeon run
    await db.collection('game_dungeons').doc(run.id).update({
      status:      'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      currentRoom: dungeon.totalRooms,
    });

    // Update char (XP/level)
    await db.collection('game_characters').doc(run.charId).update(charUpdate);

    return res.json({
      cleared: true,
      log,
      clearRewards: { gold: goldBonus, xp: cr.xp, items: lootItems },
      newLevel: charUpdate.level || null,
    });

  } catch (err) {
    console.error('[Dungeon] completeDungeon:', err.message);
    throw err;
  }
}

// ===== Flee Dungeon (abandon run) =====
async function fleeDungeon(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const run = await getCurrentRun(uid);
    if (!run) return res.status(400).json({ error: 'ไม่มี run ที่ active' });

    await db.collection('game_dungeons').doc(run.id).update({
      status:    'failed',
      failedAt:  admin.firestore.FieldValue.serverTimestamp(),
      fleeRoom:  run.currentRoom,
    });

    return res.json({
      fled: true,
      message: '🏃 คุณถอยออกจาก Dungeon... ทิ้งทุกอย่างไว้ข้างหลัง',
      roomsCleared: run.currentRoom,
    });
  } catch (err) {
    console.error('[Dungeon] fleeDungeon:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Called by combat handler when a dungeon battle is won =====
async function onDungeonBattleWin(uid, runId) {
  const db  = admin.firestore();
  try {
    const runDoc = await db.collection('game_dungeons').doc(runId).get();
    if (!runDoc.exists || runDoc.data().uid !== uid) return;

    const run     = { id: runDoc.id, ...runDoc.data() };
    const dungeon = getDungeon(run.dungeonId);
    if (!dungeon) return;

    const nextRoom = run.currentRoom + 1;

    if (nextRoom >= dungeon.totalRooms) {
      // Boss was the last room — mark complete
      const cr = dungeon.clearRewards;
      const [minG, maxG] = cr.gold || [100, 300];
      const goldBonus = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
      await addGold(uid, goldBonus);

      const charDoc = await db.collection('game_characters').doc(run.charId).get();
      const char = charDoc.data();
      const newXp = (char.xp || 0) + (cr.xp || 0);
      const charUpdate = { xp: newXp };
      const xpNeeded = (char.level || 1) * 100;
      if (newXp >= xpNeeded) {
        charUpdate.level = (char.level || 1) + 1;
        charUpdate.skillPoints = (char.skillPoints || 0) + 3;
      }
      await db.collection('game_characters').doc(run.charId).update(charUpdate);
      await runDoc.ref.update({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp(), currentRoom: dungeon.totalRooms });
    } else {
      await runDoc.ref.update({ currentRoom: nextRoom });
    }
  } catch (err) {
    console.error('[Dungeon] onDungeonBattleWin:', err.message);
  }
}

// ===== Summarize dungeon (strip full room data for list view) =====
function summarizeDungeon(d) {
  return {
    id: d.id, name: d.name, nameTH: d.nameTH, emoji: d.emoji,
    region: d.region, desc: d.desc, difficulty: d.difficulty,
    difficultyLabel: d.difficultyLabel, totalRooms: d.totalRooms,
  };
}

module.exports = { listDungeons, getRunState, enterDungeon, roomAction, fleeDungeon, onDungeonBattleWin };
