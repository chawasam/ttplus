// handlers/game/combat.js — Server-side battle logic
const admin  = require('firebase-admin');
const { getMonster, getRandomMonster, calcDamage } = require('../../data/monsters');
const { getDungeonMonster }  = require('../../data/dungeons');
const { getItem, rollItem }  = require('../../data/items');
const { addGold }            = require('./currency');

// Active battles in memory (battleId → state)
const activeBattles = new Map();

// ===== Start battle =====
async function startBattle(req, res) {
  // dungeonRunId: ถ้าอยู่ใน Dungeon ให้ส่ง runId มาด้วย
  // bossData: ข้อมูล boss inline จาก dungeon room (สำหรับ boss rooms)
  const { zone, monsterId, dungeonRunId, bossData } = req.body;
  const uid = req.user.uid;

  let monster;
  if (bossData) {
    // Inline boss (dungeon boss rooms)
    monster = {
      ...bossData,
      goldReward:  bossData.goldReward || [0, 0],
      flee_chance: bossData.flee_chance ?? 0.1,
      drops:       bossData.drops || [],
      attackMsg:   bossData.attackMsg || ['โจมตี'],
    };
  } else if (monsterId) {
    monster = getMonster(monsterId) || getDungeonMonster(monsterId);
  } else {
    monster = getRandomMonster(zone || 'town_outskirts');
  }
  if (!monster) return res.status(400).json({ error: 'ไม่พบมอนสเตอร์' });

  const db = admin.firestore();
  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const charId  = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });

    const char = charDoc.data();
    if (char.hp <= 0) return res.status(400).json({ error: 'Character หมดพลัง ต้อง Rest ก่อน' });

    const battleId = `battle_${uid}_${Date.now()}`;
    const state = {
      battleId,
      uid,
      charId,
      dungeonRunId: dungeonRunId || null, // track dungeon context
      turn: 1,
      result: null,
      player: {
        hp:    char.hp,
        hpMax: char.hpMax,
        mp:    char.mp,
        mpMax: char.mpMax,
        atk:   char.atk,
        def:   char.def,
        spd:   char.spd,
        mag:   char.mag,
        status: [],
      },
      enemy: {
        monsterId: monster.monsterId,
        name:      monster.name,
        emoji:     monster.emoji,
        desc:      monster.desc,
        hp:        monster.hp,
        hpMax:     monster.hp,
        atk:       monster.atk,
        def:       monster.def,
        spd:       monster.spd,
        regen:     monster.regen || 0,
        status:    [],
        drops:     monster.drops || [],
        xpReward:  monster.xpReward,
        goldReward: monster.goldReward,
        attackMsg: monster.attackMsg,
        statusAttack: monster.statusAttack || null,
        flee_chance: monster.flee_chance || 0.7,
      },
      log: [`${monster.emoji} ${monster.name} ปรากฏตัว!`, monster.desc],
      createdAt: Date.now(),
    };

    activeBattles.set(battleId, state);
    // ล้าง battle เก่า (เกิน 1 ชั่วโมง)
    for (const [k, v] of activeBattles.entries()) {
      if (Date.now() - v.createdAt > 3600_000) activeBattles.delete(k);
    }

    return res.json({ battleId, state: sanitizeState(state) });
  } catch (err) {
    console.error('[Combat] startBattle:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Process action =====
async function processAction(req, res) {
  const { battleId, action, skillId, itemInstanceId } = req.body;
  const uid = req.user.uid;

  const state = activeBattles.get(battleId);
  if (!state || state.uid !== uid) {
    return res.status(404).json({ error: 'ไม่พบ Battle หรือหมดเวลา' });
  }
  if (state.result) {
    return res.status(400).json({ error: 'Battle จบแล้ว', result: state.result });
  }

  const log = [];
  let result = null;

  // ===== Player action =====
  if (action === 'attack') {
    const isCrit = Math.random() < 0.1; // 10% base crit
    let dmg = calcDamage(state.player.atk, state.enemy.def);
    if (isCrit) { dmg = Math.floor(dmg * 2); log.push('💥 CRITICAL HIT!'); }
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    log.push(`⚔️ คุณโจมตี ${state.enemy.name}! ${dmg} damage${isCrit ? ' (Critical!)' : ''}`);

  } else if (action === 'flee') {
    const fleeRoll = Math.random();
    if (fleeRoll < state.enemy.flee_chance) {
      log.push('🏃 คุณหนีออกมาได้!');
      state.result = 'fled';
      activeBattles.delete(battleId);
      return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'fled' } });
    } else {
      log.push('❌ หนีไม่ได้! ' + state.enemy.name + ' ขวางทางอยู่');
    }

  } else if (action === 'item') {
    // ใช้ item consumable
    const itemResult = await useItem(uid, itemInstanceId, state, log);
    if (!itemResult.success) return res.status(400).json({ error: itemResult.error });

  } else {
    return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  }

  // ===== Check enemy dead =====
  if (state.enemy.hp <= 0) {
    log.push(`💀 ${state.enemy.name} พ่ายแพ้!`);
    const rewards = await grantRewards(uid, state);
    log.push(...rewards.log);
    state.result = 'victory';
    activeBattles.delete(battleId);

    // Advance dungeon room if in a dungeon run
    let dungeonResult = null;
    if (state.dungeonRunId) {
      const { onDungeonBattleWin } = require('./dungeon');
      dungeonResult = await onDungeonBattleWin(uid, state.dungeonRunId).catch(e => {
        console.error('[Combat] dungeon advance failed:', e.message);
        return null;
      });
    }

    return res.json({
      battleId,
      state:          { ...sanitizeState(state), log, result: 'victory', rewards },
      dungeonRunId:   state.dungeonRunId,
      dungeonCleared: dungeonResult?.cleared ?? false,
      dungeonClearRewards: dungeonResult?.clearRewards ?? null,
      dungeonNewLevel:     dungeonResult?.newLevel    ?? null,
    });
  }

  // ===== Enemy turn =====
  // Process player status effects first
  processStatusEffects(state.player, log, 'player');

  // Enemy regen
  if (state.enemy.regen > 0) {
    state.enemy.hp = Math.min(state.enemy.hpMax, state.enemy.hp + state.enemy.regen);
    log.push(`💚 ${state.enemy.name} ฟื้นฟู ${state.enemy.regen} HP`);
  }

  // Enemy attack
  const attackMsgs = state.enemy.attackMsg;
  const attackMsg  = attackMsgs[Math.floor(Math.random() * attackMsgs.length)];
  const enemyDmg   = calcDamage(state.enemy.atk, state.player.def);
  state.player.hp = Math.max(0, state.player.hp - enemyDmg);
  log.push(`👹 ${state.enemy.name} ${attackMsg}! ${enemyDmg} damage`);

  // Enemy status attack
  if (state.enemy.statusAttack) {
    const sa = state.enemy.statusAttack;
    if (Math.random() < sa.chance && !state.player.status.find(s => s.type === sa.type)) {
      state.player.status.push({ type: sa.type, duration: sa.duration, dmgPerTurn: sa.dmgPerTurn || 0 });
      log.push(`⚠️ คุณถูก ${sa.type}!`);
    }
  }

  // ===== Check player dead =====
  if (state.player.hp <= 0) {
    log.push('💀 คุณพ่ายแพ้... Respawn ที่ Town Square');
    await handlePlayerDeath(uid, state);

    // Fail dungeon run if in a dungeon
    if (state.dungeonRunId) {
      const db = admin.firestore();
      await db.collection('game_dungeons').doc(state.dungeonRunId).update({
        status:   'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      log.push('🏚️ Dungeon run ล้มเหลว...');
    }

    state.result = 'defeat';
    activeBattles.delete(battleId);
    return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'defeat' }, dungeonRunId: state.dungeonRunId });
  }

  state.turn++;
  return res.json({ battleId, state: { ...sanitizeState(state), log, result: null } });
}

function processStatusEffects(entity, log, who) {
  const remaining = [];
  for (const s of entity.status) {
    if (s.type === 'POISON' && s.dmgPerTurn > 0) {
      entity.hp = Math.max(0, entity.hp - s.dmgPerTurn);
      log.push(`☠️ ${who === 'player' ? 'คุณ' : entity.name} ได้รับพิษ ${s.dmgPerTurn} damage`);
    }
    if (s.duration > 1) remaining.push({ ...s, duration: s.duration - 1 });
  }
  entity.status = remaining;
}

async function useItem(uid, instanceId, state, log) {
  if (!instanceId) return { success: false, error: 'ต้องระบุ item' };
  const db = admin.firestore();

  try {
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (snap.empty) return { success: false, error: 'ไม่พบ item ใน inventory' };
    const invDoc = snap.docs[0];
    const invData = invDoc.data();
    const itemDef = getItem(invData.itemId);
    if (!itemDef || itemDef.type !== 'CONSUMABLE') return { success: false, error: 'ใช้ item นี้ไม่ได้ในการต่อสู้' };

    const effect = itemDef.effect || {};
    if (effect.heal) {
      const healed = Math.min(effect.heal, state.player.hpMax - state.player.hp);
      state.player.hp += healed;
      log.push(`🧪 ใช้ ${itemDef.name} ฟื้นฟู ${healed} HP`);
    }
    if (effect.restoreMP) {
      const restored = Math.min(effect.restoreMP, state.player.mpMax - state.player.mp);
      state.player.mp += restored;
      log.push(`💧 ใช้ ${itemDef.name} ฟื้นฟู ${restored} MP`);
    }
    if (effect.cureStatus) {
      state.player.status = state.player.status.filter(s => s.type !== effect.cureStatus);
      log.push(`💊 ใช้ ${itemDef.name} หาย ${effect.cureStatus}`);
    }

    // ลบ item จาก inventory
    await invDoc.ref.delete();
    return { success: true };
  } catch (err) {
    console.error('[Combat] useItem:', err.message);
    return { success: false, error: 'Server error' };
  }
}

async function grantRewards(uid, state) {
  const db      = admin.firestore();
  const log     = [];
  const rewards = { xp: state.enemy.xpReward, gold: 0, items: [] };

  // Gold reward
  const [minG, maxG] = state.enemy.goldReward || [0, 0];
  const gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
  if (gold > 0) {
    await addGold(uid, gold, 'combat_drop');
    rewards.gold = gold;
    log.push(`💰 ได้รับ ${gold} Gold`);
  }

  // XP
  const accountDoc = await db.collection('game_accounts').doc(uid).get();
  const charId     = accountDoc.data()?.characterId;
  if (charId) {
    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();
    const newXp   = (char.xp || 0) + state.enemy.xpReward;
    log.push(`⭐ ได้รับ ${state.enemy.xpReward} XP`);

    // Level up check
    const updates = { xp: newXp, hp: state.player.hp, mp: state.player.mp, monstersKilled: admin.firestore.FieldValue.increment(1) };
    if (newXp >= char.xpToNext) {
      const newLevel = char.level + 1;
      updates.level    = newLevel;
      updates.xp       = newXp - char.xpToNext;
      updates.xpToNext = Math.floor(char.xpToNext * 1.5);
      updates.hpMax    = char.hpMax + 10;
      updates.hp       = updates.hpMax; // เต็มตอน level up
      updates.mpMax    = char.mpMax + 5;
      updates.mp       = updates.mpMax;
      updates.statPoints  = (char.statPoints || 0) + 3;
      updates.skillPoints = (char.skillPoints || 0) + 1;
      log.push(`🎉 LEVEL UP! คุณขึ้นเป็น Level ${newLevel}!`);
      rewards.levelUp = newLevel;
    }
    await charRef.update(updates);
  }

  // Item drops
  for (const drop of state.enemy.drops || []) {
    if (!drop.itemId) continue;
    if (Math.random() < drop.chance) {
      const instance = rollItem(drop.itemId);
      if (instance) {
        await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
        rewards.items.push(drop.itemId);
        const def = getItem(drop.itemId);
        log.push(`📦 ได้รับ ${def?.name || drop.itemId}`);
      }
    }
  }

  return { ...rewards, log };
}

async function handlePlayerDeath(uid, state) {
  const db = admin.firestore();
  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    const charId     = accountDoc.data()?.characterId;
    if (!charId) return;

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();

    // เสีย 10% XP
    const xpLoss = Math.floor((char.xp || 0) * 0.1);
    await charRef.update({
      hp:         char.hpMax,     // respawn full HP
      mp:         char.mpMax,
      xp:         Math.max(0, (char.xp || 0) - xpLoss),
      location:   'town_square',  // respawn ที่ town
      status:     [],
      deathCount: admin.firestore.FieldValue.increment(1),
    });
  } catch (err) {
    console.error('[Combat] handlePlayerDeath:', err.message);
  }
}

// Remove sensitive data before sending to client
function sanitizeState(state) {
  return {
    battleId: state.battleId,
    turn:     state.turn,
    result:   state.result,
    player: {
      hp:     state.player.hp,
      hpMax:  state.player.hpMax,
      mp:     state.player.mp,
      mpMax:  state.player.mpMax,
      status: state.player.status,
    },
    enemy: {
      monsterId: state.enemy.monsterId,
      name:      state.enemy.name,
      emoji:     state.enemy.emoji,
      desc:      state.enemy.desc,
      hp:        state.enemy.hp,
      hpMax:     state.enemy.hpMax,
      status:    state.enemy.status,
    },
  };
}

// REST endpoint (for polling)
async function rest(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    const charId     = accountDoc.data()?.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();

    await charRef.update({ hp: char.hpMax, mp: char.mpMax });
    return res.json({ success: true, hp: char.hpMax, mp: char.mpMax, msg: '💤 พักผ่อนแล้ว — HP และ MP เต็ม' });
  } catch (err) {
    console.error('[Combat] rest:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { startBattle, processAction, rest };
