// handlers/game/dungeon.js — Dungeon run logic for Ashenveil
const admin = require('firebase-admin');
const gameCache = require('../../utils/gameCache');
const { getDungeon, listAllDungeons, getDungeonMonster, getDungeonRoom } = require('../../data/dungeons');
const { getMonster, calcDamage } = require('../../data/monsters');
const { getItem, rollItem } = require('../../data/items');
const { addGold } = require('./currency');
const { trackQuestProgress }  = require('./quests');
const { trackStoryStep }      = require('./quest_engine');
const { trackWeeklyProgress } = require('./weeklyQuests');
const { checkAchievements, pushGameEvent } = require('./achievements');
const { broadcastAll } = require('../../lib/emitter');
const { getFeaturedDungeon, getCurrentWeekStr } = require('../../data/featured_dungeon');

// ===== Helper: get monster def (dungeon or regular) =====
function resolveMonster(monsterId) {
  return getMonster(monsterId) || getDungeonMonster(monsterId) || null;
}

// ===== Helper: get current dungeon run =====
// single-field query + limit(100) — ไม่ต้องสร้าง composite index
// user ปกติมี completed run ไม่เกิน 100 docs; active run เป็น doc ล่าสุดที่สร้างได้เสมอ
// (enforcement ใน enterDungeon ไม่ให้มี active run พร้อมกัน >1)
async function getCurrentRun(uid) {
  const db = admin.firestore();
  const snap = await db.collection('game_dungeons')
    .where('uid', '==', uid)
    .limit(100)
    .get();
  const active = snap.docs.find(d => d.data().status === 'active');
  if (!active) return null;
  return { id: active.id, ...active.data() };
}

// ===== List Dungeons =====
async function listDungeons(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const dungeons = listAllDungeons();

    // Load account for character level
    const accountData = await gameCache.getAccount(uid, db);
    if (!accountData) return res.status(404).json({ error: 'Account ไม่พบ' });

    const charId = accountData.characterId;
    let charLevel = 1;
    if (charId) {
      const charData = await gameCache.getCharacter(charId, db);
      if (charData) charLevel = charData.level || 1;
    }

    // Load all user's dungeon docs — filter/sort in-memory (no composite index needed)
    const allDungeonSnap = await db.collection('game_dungeons')
      .where('uid', '==', uid)
      .get();

    const lastClear = {};
    // Filter to completed only, sort desc by completedAt
    const sortedDocs = allDungeonSnap.docs
      .filter(d => d.data().status === 'completed')
      .sort((a, b) =>
        (b.data().completedAt?.toMillis?.() || 0) - (a.data().completedAt?.toMillis?.() || 0)
      );
    for (const doc of sortedDocs) {
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

      const hasThisActiveRun  = activeRun?.dungeonId === d.id;
      const hasOtherActiveRun = !!activeRun && activeRun.dungeonId !== d.id;

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
        // canEnter: ระดับ OK + ไม่มี cooldown + ไม่มี active run อื่นค้างอยู่
        canEnter:       charLevel >= d.minLevel && cooldownLeft === 0 && !activeRun,
        levelLocked:    charLevel < d.minLevel,
        onCooldown:     cooldownLeft > 0 && !hasThisActiveRun,
        cooldownHoursLeft: cooldownHrs,
        hasActiveRun:   hasThisActiveRun,
        blockedByOtherRun: hasOtherActiveRun,
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
    const accountData = await gameCache.getAccount(uid, db);
    if (!accountData) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountData.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const char = await gameCache.getCharacter(charId, db);
    if (!char) return res.status(404).json({ error: 'Character ไม่พบ' });

    if ((char.level || 1) < dungeon.minLevel) {
      return res.status(403).json({ error: `ต้องการ Level ${dungeon.minLevel} ขึ้นไป` });
    }
    if (char.hp <= 0) {
      return res.status(400).json({ error: 'HP หมด ต้อง Rest ก่อน' });
    }

    // Check cooldown — single-field query then filter in-memory (no composite index needed)
    const cooldownMs = dungeon.clearCooldownHours * 3600_000;
    const allRunsSnap = await db.collection('game_dungeons')
      .where('uid', '==', uid)
      .get();
    const completedDocs = allRunsSnap.docs.filter(d => {
      const dd = d.data();
      return dd.status === 'completed' && dd.dungeonId === dungeonId;
    });

    if (completedDocs.length > 0) {
      const lastComplete = completedDocs.reduce((best, doc) => {
        const ms = doc.data().completedAt?.toMillis?.() || 0;
        return ms > best ? ms : best;
      }, 0);
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

    // Track story/side quest step — dungeon_enter event
    trackStoryStep(uid, 'dungeon_enter', { dungeonId }).catch(() => {});

    // Broadcast live dungeon event for OBS widget
    broadcastAll('dungeon_event', {
      type:      'enter',
      charName:  char.name || '???',
      charClass: char.class || '',
      dungeonId,
      dungeonName: dungeon.nameTH,
      ts: Date.now(),
    });

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

      const char = await gameCache.getCharacter(run.charId, db);
      if (!char) return res.status(404).json({ error: 'Character ไม่พบ' });
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
        gameCache.invalidateChar(run.charId);
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
          const instanceId = `inv_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await db.collection('game_inventory').add({
            uid,
            itemId,
            instanceId,
            enhancement: 0,
            equipped: false,
            obtainedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          gameCache.adjustInventoryCount(uid, 1, db);
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

      const char = await gameCache.getCharacter(run.charId, db);
      if (!char) return res.status(404).json({ error: 'Character ไม่พบ' });
      const healed  = Math.floor((char.hpMax || char.hp) * (room.healPercent || 0.25));
      const newHp   = Math.min(char.hpMax || 9999, char.hp + healed);
      const charUpdate = { hp: newHp };

      if (room.healMpPercent) {
        const mpHeal = Math.floor((char.mpMax || char.mp) * room.healMpPercent);
        charUpdate.mp = Math.min(char.mpMax || 9999, char.mp + mpHeal);
        log.push(`💧 ฟื้นฟู ${mpHeal} MP`);
      }

      await db.collection('game_characters').doc(run.charId).update(charUpdate);
      gameCache.invalidateChar(run.charId);
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
    const char = await gameCache.getCharacter(run.charId, db);
    if (!char) throw new Error('Character ไม่พบ');
    const newXp   = (char.xp || 0) + (cr.xp || 0);
    const charUpdate = { xp: newXp };
    // Level-up check — ใช้ xpToNext เดียวกับ combat.js
    if (newXp >= (char.xpToNext || 100)) {
      const hpMax = char.hpMax || 100;
      const mpMax = char.mpMax || 50;
      charUpdate.level    = (char.level || 1) + 1;
      charUpdate.xp       = newXp - (char.xpToNext || 100);
      charUpdate.xpToNext = Math.floor(200 * Math.pow(charUpdate.level, 1.9)); // lv50≈9เดือน, lv99≈2ปี
      charUpdate.hpMax    = hpMax + 10;
      charUpdate.hp       = hpMax + 10;
      charUpdate.mpMax    = mpMax + 5;
      charUpdate.mp       = mpMax + 5;
      charUpdate.statPoints  = (char.statPoints  || 0) + 3;
      charUpdate.skillPoints = (char.skillPoints || 0) + 1;
      log.push(`🎉 Level Up! → Level ${charUpdate.level}`);
    }

    // Item rewards (dungeon clear — better quality chances than explore)
    const lootItems = [];
    const count = cr.itemCount || 1;
    const pool  = [...(cr.itemPool || [])];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx    = Math.floor(Math.random() * pool.length);
      const itemId = pool.splice(idx, 1)[0];
      const itemDef = getItem(itemId);
      if (itemDef) {
        const instance = rollItem(itemId, { normal: 50, fine: 30, superior: 16, masterwork: 4 });
        if (instance) {
          await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
          gameCache.adjustInventoryCount(uid, 1, db);
          lootItems.push({ itemId, name: itemDef.name, emoji: itemDef.emoji, quality: instance.quality });
          log.push(`📦 ได้รับ ${itemDef.emoji} ${itemDef.name}`);
        }
      }
    }

    // ─── Featured Dungeon weekly bonus ───────────────────────────
    let featuredBonus = null;
    try {
      const featured = getFeaturedDungeon();
      const weekStr  = getCurrentWeekStr();
      if (run.dungeonId === featured.dungeonId) {
        const featRef  = db.collection('game_featured_dungeon').doc(uid);
        const featDoc  = await featRef.get();
        const alreadyClaimed = featDoc.exists && featDoc.data().claimedWeek === weekStr;
        if (!alreadyClaimed) {
          const bonusXp   = Math.floor((cr.xp || 0) * (featured.xpMultiplier - 1));
          const bonusGold = Math.floor(goldBonus * (featured.goldMultiplier - 1));
          if (bonusGold > 0) await addGold(uid, bonusGold, 'featured_dungeon_bonus');
          if (bonusXp  > 0) charUpdate.xp = (charUpdate.xp !== undefined ? charUpdate.xp : newXp) + bonusXp;
          const bonusItemId  = featured.bonusItem;
          const bonusItemDef = getItem(bonusItemId);
          if (bonusItemDef) {
            const instanceId = `inv_${uid}_fd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await db.collection('game_inventory').add({
              uid, itemId: bonusItemId, instanceId, enhancement: 0,
              equipped: false, obtainedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            gameCache.adjustInventoryCount(uid, 1, db);
            lootItems.push({ itemId: bonusItemId, name: bonusItemDef.name, emoji: bonusItemDef.emoji });
            log.push(`⭐ Featured Bonus: ${bonusItemDef.emoji} ${bonusItemDef.name}`);
          }
          log.push(`⭐ Featured Dungeon! รับโบนัส XP +${bonusXp}, Gold +${bonusGold}`);
          await featRef.set({ uid, claimedWeek: weekStr, claimedAt: admin.firestore.FieldValue.serverTimestamp() });
          featuredBonus = { xp: bonusXp, gold: bonusGold, item: bonusItemDef ? { itemId: bonusItemId, name: bonusItemDef.name, emoji: bonusItemDef.emoji } : null };
        }
      }
    } catch (fe) {
      console.error('[Dungeon] featuredBonus error:', fe.message);
    }
    // ─────────────────────────────────────────────────────────────

    // Update dungeon run
    await db.collection('game_dungeons').doc(run.id).update({
      status:      'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      currentRoom: dungeon.totalRooms,
    });

    // Update char (XP/level)
    await db.collection('game_characters').doc(run.charId).update(charUpdate);
    gameCache.invalidateChar(run.charId);

    // Track daily + weekly + story/side + achievements
    trackQuestProgress(uid, 'dungeon_clear', 1).catch(() => {});
    trackWeeklyProgress(uid, 'dungeon_clear', 1).catch(() => {});
    trackStoryStep(uid, 'dungeon_clear', { dungeonId: run.dungeonId }).catch(() => {});
    checkAchievements(uid, 'dungeon_clear', 1).catch(() => {});
    if (charUpdate.level) {
      checkAchievements(uid, 'level_up', charUpdate.level).catch(() => {});
      pushGameEvent(uid, { type: 'level_up', msg: `🎉 Level Up! → Lv.${charUpdate.level}`, char: uid }).catch(() => {});
    }
    pushGameEvent(uid, { type: 'dungeon_clear', msg: `🏆 เคลียร์ ${dungeon.nameTH}!`, char: uid }).catch(() => {});

    // Broadcast dungeon clear for OBS widget
    broadcastAll('dungeon_event', {
      type:       'clear',
      charName:   char.name || '???',
      charClass:  char.class || '',
      dungeonId:  run.dungeonId,
      dungeonName: dungeon.nameTH,
      gold:       goldBonus,
      xp:         cr.xp || 0,
      ts: Date.now(),
    });

    return res.json({
      cleared: true,
      log,
      clearRewards: { gold: goldBonus, xp: cr.xp, items: lootItems },
      newLevel: charUpdate.level || null,
      featuredBonus,
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
// Returns { cleared, clearRewards, newLevel } or null
async function onDungeonBattleWin(uid, runId) {
  const db  = admin.firestore();
  try {
    const runDoc = await db.collection('game_dungeons').doc(runId).get();
    if (!runDoc.exists || runDoc.data().uid !== uid) return null;

    const run     = { id: runDoc.id, ...runDoc.data() };
    const dungeon = getDungeon(run.dungeonId);
    if (!dungeon) return null;

    const nextRoom = run.currentRoom + 1;

    if (nextRoom >= dungeon.totalRooms) {
      // Boss was the last room — mark complete + grant clear rewards
      const cr = dungeon.clearRewards;
      const [minG, maxG] = cr.gold || [100, 300];
      const goldBonus = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
      await addGold(uid, goldBonus);

      const char = await gameCache.getCharacter(run.charId, db);
      if (!char) return null;
      const newXp = (char.xp || 0) + (cr.xp || 0);
      const charUpdate = { xp: newXp };
      let newLevel = null;
      if (newXp >= (char.xpToNext || 100)) {
        const hpMax = char.hpMax || 100;
        const mpMax = char.mpMax || 50;
        newLevel = (char.level || 1) + 1;
        charUpdate.level    = newLevel;
        charUpdate.xp       = newXp - (char.xpToNext || 100);
        charUpdate.xpToNext = Math.floor(200 * Math.pow(newLevel, 1.9)); // lv50≈9เดือน, lv99≈2ปี
        charUpdate.hpMax    = hpMax + 10;
        charUpdate.hp       = hpMax + 10;
        charUpdate.mpMax    = mpMax + 5;
        charUpdate.mp       = mpMax + 5;
        charUpdate.statPoints  = (char.statPoints  || 0) + 3;
        charUpdate.skillPoints = (char.skillPoints || 0) + 1;
      }

      // Grant loot items
      const lootItems = [];
      const pool  = [...(cr.itemPool || [])];
      // Final boss loot — highest quality chances
      for (let i = 0; i < (cr.itemCount || 1) && pool.length > 0; i++) {
        const idx    = Math.floor(Math.random() * pool.length);
        const itemId = pool.splice(idx, 1)[0];
        const itemDef = getItem(itemId);
        if (itemDef) {
          const instance = rollItem(itemId, { normal: 30, fine: 35, superior: 25, masterwork: 10 });
          if (instance) {
            await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
            gameCache.adjustInventoryCount(uid, 1, db);
            lootItems.push({ itemId, name: itemDef.name, emoji: itemDef.emoji, quality: instance.quality });
          }
        }
      }

      await db.collection('game_characters').doc(run.charId).update(charUpdate);
      gameCache.invalidateChar(run.charId);
      await runDoc.ref.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        currentRoom: dungeon.totalRooms,
      });

      // Track daily + weekly + story/side + achievements
      trackQuestProgress(uid, 'dungeon_clear', 1).catch(() => {});
      trackWeeklyProgress(uid, 'dungeon_clear', 1).catch(() => {});
      trackStoryStep(uid, 'dungeon_clear', { dungeonId: run.dungeonId }).catch(() => {});
      checkAchievements(uid, 'dungeon_clear', 1).catch(() => {});
      if (newLevel) {
        checkAchievements(uid, 'level_up', newLevel).catch(() => {});
        pushGameEvent(uid, { type: 'level_up', msg: `🎉 Level Up! → Lv.${newLevel}`, char: uid }).catch(() => {});
      }
      pushGameEvent(uid, { type: 'dungeon_clear', msg: `🏆 เคลียร์ ${getDungeon(run.dungeonId)?.nameTH || 'Dungeon'}!`, char: uid }).catch(() => {});

      return {
        cleared: true,
        clearRewards: { gold: goldBonus, xp: cr.xp || 0, items: lootItems },
        newLevel,
      };
    } else {
      // Regular combat room — just advance
      await runDoc.ref.update({ currentRoom: nextRoom });
      return { cleared: false };
    }
  } catch (err) {
    console.error('[Dungeon] onDungeonBattleWin:', err.message);
    return null;
  }
}

// ===== Summarize dungeon (strip full room data for list view) =====
function summarizeDungeon(d) {
  return {
    id: d.id, name: d.name, nameTH: d.nameTH, emoji: d.emoji,
    region: d.region, desc: d.desc, difficulty: d.difficulty,
    difficultyLabel: d.difficultyLabel, totalRooms: d.totalRooms,
    // room map data สำหรับ frontend แสดง minimap
    roomMap: (d.rooms || []).map(r => ({
      index: r.room,
      type:  r.type,   // 'combat' | 'trap' | 'treasure' | 'rest' | 'boss'
      name:  r.name,
    })),
  };
}

// ===== Active Dungeon Runs (for OBS widget / admin) =====
async function getActiveDungeonRuns(req, res) {
  const db = admin.firestore();
  try {
    const snap = await db.collection('game_dungeon_runs')
      .where('status', '==', 'active')
      .limit(20)
      .get();

    const runs = [];
    for (const doc of snap.docs) {
      const run = doc.data();
      const dungeon = getDungeon(run.dungeonId);
      // get char name
      let charName = '???'; let charClass = '';
      try {
        const cData = await gameCache.getCharacter(run.charId, db);
        if (cData) { charName = cData.name || '???'; charClass = cData.class || ''; }
      } catch (_) {}
      const roomDef = dungeon?.rooms?.[run.currentRoom];
      runs.push({
        runId:       doc.id,
        charName,
        charClass,
        dungeonId:   run.dungeonId,
        dungeonName: dungeon?.nameTH || run.dungeonId,
        dungeonEmoji: dungeon?.emoji || '🏚️',
        currentRoom: run.currentRoom,
        totalRooms:  run.totalRooms,
        roomType:    roomDef?.type || '?',
        roomName:    roomDef?.name || '?',
        startedAt:   run.startedAt?.toMillis?.() || null,
      });
    }

    return res.json({ runs, count: runs.length, ts: Date.now() });
  } catch (err) {
    console.error('[Dungeon] getActiveDungeonRuns:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { listDungeons, getRunState, enterDungeon, roomAction, fleeDungeon, onDungeonBattleWin, getActiveDungeonRuns };
