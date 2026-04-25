// handlers/game/combat.js — Server-side battle logic
const admin  = require('firebase-admin');
const { getMonster, getRandomMonster, calcDamage } = require('../../data/monsters');
const { getDungeonMonster }  = require('../../data/dungeons');
const { getItem, rollItem }  = require('../../data/items');
const { addGold }            = require('./currency');
const { trackQuestProgress }    = require('./quests');
const { trackStoryStep }        = require('./quest_engine');
const { trackWeeklyProgress }   = require('./weeklyQuests');
const { getSkill }              = require('../../data/skills');
const { checkAchievements, pushGameEvent } = require('./achievements');

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

    // Passive skill bonuses applied at battle start
    const className = (char.class || '').toLowerCase();
    let passiveAtk = char.atk, passiveDef = char.def, passiveCrit = 0.1, passiveMpRegen = 0;
    if (className === 'warrior') passiveDef = Math.floor(char.def * 1.1);   // Iron Will: DEF +10%
    if (className === 'mage')    passiveMpRegen = 5;                         // Mana Flow: +5 MP/turn
    if (className === 'archer')  passiveCrit = 0.15;                         // Keen Senses: Crit +5%

    const battleId = `battle_${uid}_${Date.now()}`;
    const state = {
      battleId,
      uid,
      charId,
      charClass:    className,
      unlockedSkills: char.unlockedSkills || [],
      dungeonRunId: dungeonRunId || null,
      zone:         dungeonRunId ? null : (zone || null),
      turn: 1,
      result: null,
      player: {
        hp:         char.hp,
        hpMax:      char.hpMax,
        mp:         char.mp,
        mpMax:      char.mpMax,
        atk:        passiveAtk,
        atkBase:    passiveAtk,     // base before buffs
        def:        passiveDef,
        defBase:    passiveDef,
        spd:        char.spd,
        mag:        char.mag,
        critChance: passiveCrit,    // base crit (with passive)
        mpRegen:    passiveMpRegen, // MP regen per turn (mage passive)
        status: [],
        buffs:  [],                 // active self-buffs { type, atkMult, defMult, critBonus, duration }
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
    for (const [k, v] of activeBattles.entries()) {
      if (Date.now() - v.createdAt > 3600_000) activeBattles.delete(k);
    }

    // Build skill info for frontend
    const { getClassSkills } = require('../../data/skills');
    const classSkills = getClassSkills(className).filter(s => (char.unlockedSkills || []).includes(s.id));

    return res.json({ battleId, state: sanitizeState(state), availableSkills: classSkills });
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
    const isCrit = Math.random() < (state.player.critChance || 0.1);
    let dmg = calcDamage(state.player.atk, state.enemy.def);
    if (isCrit) { dmg = Math.floor(dmg * 2); log.push('💥 CRITICAL HIT!'); }
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    log.push(`⚔️ คุณโจมตี ${state.enemy.name}! ${dmg} damage${isCrit ? ' (Critical!)' : ''}`);

  } else if (action === 'skill') {
    // ─── USE SKILL ───
    const skillResult = applySkill(state, skillId, log);
    if (!skillResult.success) return res.status(400).json({ error: skillResult.error });
    // If skill has goFirst (Archer's Quick Shot), skip enemy turn this round
    if (skillResult.goFirst && state.enemy.hp > 0) {
      // Enemy turn is skipped — handled after this block
    }

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

    // Track daily + weekly + story/side quest step
    trackQuestProgress(uid, 'kill', 1).catch(() => {});
    trackWeeklyProgress(uid, 'kill', 1).catch(() => {});
    trackStoryStep(uid, 'kill', {
      monsterId: state.enemy.monsterId,
      zone:      state.zone, // null inside dungeons, zone string in world
    }).catch(() => {});
    // Achievements + overlay event
    checkAchievements(uid, 'kill', 1).catch(() => {});
    if (rewards.levelUp) {
      checkAchievements(uid, 'level_up', rewards.levelUp).catch(() => {});
      pushGameEvent(uid, { type: 'level_up', msg: `🎉 Level Up! → Lv.${rewards.levelUp}`, char: uid }).catch(() => {});
    }
    pushGameEvent(uid, { type: 'kill', msg: `⚔️ สังหาร ${state.enemy.emoji} ${state.enemy.name}!`, char: uid }).catch(() => {});

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
  // Mage passive: MP regen per turn
  if (state.player.mpRegen > 0) {
    state.player.mp = Math.min(state.player.mpMax, state.player.mp + state.player.mpRegen);
  }

  // Process player buffs (atkMult/defMult/critBonus) — apply/tick
  processBuff(state.player, log);

  // Process player status effects (POISON, STUN, etc.)
  processStatusEffects(state.player, log, 'player');

  // Check STUN on enemy — skip enemy attack this turn
  const isEnemyStunned = state.enemy.status.some(s => s.type === 'STUN');
  if (isEnemyStunned) {
    log.push(`😵 ${state.enemy.name} ถูกสตันไม่สามารถโจมตีได้!`);
    // Tick stun duration
    state.enemy.status = state.enemy.status.map(s =>
      s.type === 'STUN' ? { ...s, duration: s.duration - 1 } : s
    ).filter(s => s.duration > 0);
  }

  // Enemy regen
  if (!isEnemyStunned && state.enemy.regen > 0) {
    state.enemy.hp = Math.min(state.enemy.hpMax, state.enemy.hp + state.enemy.regen);
    log.push(`💚 ${state.enemy.name} ฟื้นฟู ${state.enemy.regen} HP`);
  }

  // Enemy attack (skip if stunned)
  if (!isEnemyStunned) {
    const attackMsgs = state.enemy.attackMsg;
    const attackMsg  = attackMsgs[Math.floor(Math.random() * attackMsgs.length)];
    // Apply SLOW debuff to enemy atk
    const slowBuff = state.enemy.status.find(s => s.type === 'SLOW');
    const enemyAtk = slowBuff ? Math.floor(state.enemy.atk * slowBuff.atkMult) : state.enemy.atk;
    // Tick SLOW duration
    if (slowBuff) {
      state.enemy.status = state.enemy.status.map(s =>
        s.type === 'SLOW' ? { ...s, duration: s.duration - 1 } : s
      ).filter(s => s.duration > 0);
    }
    const enemyDmg = calcDamage(enemyAtk, state.player.def);
    state.player.hp = Math.max(0, state.player.hp - enemyDmg);
    log.push(`👹 ${state.enemy.name} ${attackMsg}! ${enemyDmg} damage${slowBuff ? ' (ช้าลง)' : ''}`);
  }

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
    // Achievement check for death
    checkAchievements(uid, 'death', 1).catch(() => {});
    return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'defeat' }, dungeonRunId: state.dungeonRunId });
  }

  state.turn++;
  return res.json({ battleId, state: { ...sanitizeState(state), log, result: null } });
}

// ─── Apply Skill ─────────────────────────────────────────────────
function applySkill(state, skillId, log) {
  const skillDef = getSkill(skillId);
  if (!skillDef) return { success: false, error: 'ไม่พบ Skill' };

  // Check unlocked
  if (!state.unlockedSkills.includes(skillId)) {
    return { success: false, error: 'ยังไม่ได้ unlock Skill นี้' };
  }

  // Check MP
  if (state.player.mp < skillDef.mpCost) {
    return { success: false, error: `MP ไม่พอ (มี ${state.player.mp}, ต้องการ ${skillDef.mpCost})` };
  }

  // Deduct MP
  state.player.mp -= skillDef.mpCost;
  log.push(`✨ ใช้ ${skillDef.name}! (-${skillDef.mpCost} MP)`);

  // Self-buff (no damage)
  if (skillDef.selfBuff && skillDef.damage === 0) {
    const buff = { ...skillDef.selfBuff };
    state.player.buffs = state.player.buffs || [];
    // Remove old buff of same type
    state.player.buffs = state.player.buffs.filter(b => !(b.atkMult || b.critBonus));

    if (buff.atkMult) {
      state.player.atk = Math.floor(state.player.atkBase * buff.atkMult);
      log.push(`🔥 ATK เพิ่มเป็น ${state.player.atk} (${Math.round((buff.atkMult - 1) * 100)}% buff, ${buff.duration} เทิร์น)`);
    }
    if (buff.defMult) {
      state.player.def = Math.floor(state.player.defBase * buff.defMult);
      log.push(`🛡️ DEF เปลี่ยนเป็น ${state.player.def}`);
    }
    if (buff.critBonus) {
      state.player.critChance = (state.player.critChance || 0.1) + buff.critBonus;
      log.push(`👁️ Crit +${Math.round(buff.critBonus * 100)}% (${buff.duration} เทิร์น)`);
    }
    state.player.buffs.push({ ...buff, appliedAt: state.turn });
    return { success: true };
  }

  // Damage skill
  if (skillDef.damage > 0) {
    const isCrit = Math.random() < (state.player.critChance || 0.1);
    let dmg;
    if (skillDef.magicDamage) {
      // Magic: ใช้ MAG, ไม่ถูก DEF ลด
      dmg = Math.floor(state.player.mag * skillDef.damage);
    } else {
      dmg = Math.floor(calcDamage(state.player.atk, state.enemy.def) * skillDef.damage);
    }
    if (isCrit) { dmg = Math.floor(dmg * 2); log.push('💥 CRITICAL!'); }
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    log.push(`💥 ${skillDef.name}: ${dmg} damage${skillDef.magicDamage ? ' (magic)' : ''}!`);
  }

  // Apply effect to enemy
  if (skillDef.effect) {
    const ef = skillDef.effect;
    const alreadyHas = state.enemy.status.find(s => s.type === ef.type);
    if (!alreadyHas) {
      if (ef.type === 'STUN') {
        state.enemy.status.push({ type: 'STUN', duration: ef.duration });
        log.push(`😵 ${state.enemy.name} ถูกสตัน ${ef.duration} เทิร์น!`);
      } else if (ef.type === 'SLOW') {
        state.enemy.status.push({ type: 'SLOW', atkMult: ef.atkMult, duration: ef.duration });
        log.push(`❄️ ${state.enemy.name} ถูกชะลอ ATK -${Math.round((1 - ef.atkMult) * 100)}% ${ef.duration} เทิร์น!`);
      } else if (ef.type === 'POISON') {
        state.enemy.status.push({ type: 'POISON', dmgPerTurn: ef.dmgPerTurn, duration: ef.duration });
        log.push(`☠️ ${state.enemy.name} ถูกพิษ! ${ef.dmgPerTurn}/เทิร์น เป็นเวลา ${ef.duration} เทิร์น`);
      }
    } else {
      log.push(`⚠️ ${state.enemy.name} มีสถานะนี้อยู่แล้ว`);
    }
  }

  return { success: true, goFirst: skillDef.goFirst || false };
}

// ─── Process player buffs each turn ──────────────────────────────
function processBuff(player, log) {
  if (!player.buffs || player.buffs.length === 0) return;
  const remaining = [];
  for (const buff of player.buffs) {
    buff.duration--;
    if (buff.duration > 0) {
      remaining.push(buff);
    } else {
      // Buff expired — reset stats
      if (buff.atkMult) {
        player.atk = player.atkBase;
        log.push(`⚪ Berserk สิ้นสุด — ATK กลับสู่ปกติ (${player.atk})`);
      }
      if (buff.defMult) {
        player.def = player.defBase;
      }
      if (buff.critBonus) {
        player.critChance = Math.max(0.05, (player.critChance || 0.1) - buff.critBonus);
        log.push(`⚪ Eagle Eye สิ้นสุด — Crit กลับปกติ`);
      }
    }
  }
  player.buffs = remaining;
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
    battleId:       state.battleId,
    turn:           state.turn,
    result:         state.result,
    charClass:      state.charClass,
    unlockedSkills: state.unlockedSkills,
    player: {
      hp:         state.player.hp,
      hpMax:      state.player.hpMax,
      mp:         state.player.mp,
      mpMax:      state.player.mpMax,
      atk:        state.player.atk,
      def:        state.player.def,
      critChance: state.player.critChance,
      status:     state.player.status,
      buffs:      (state.player.buffs || []).map(b => ({
        type:     b.atkMult ? 'ATK_BUFF' : b.critBonus ? 'CRIT_BUFF' : 'BUFF',
        duration: b.duration,
      })),
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
    trackQuestProgress(uid, 'rest', 1).catch(() => {});
    trackWeeklyProgress(uid, 'rest', 1).catch(() => {});
    return res.json({ success: true, hp: char.hpMax, mp: char.mpMax, msg: '💤 พักผ่อนแล้ว — HP และ MP เต็ม' });
  } catch (err) {
    console.error('[Combat] rest:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { startBattle, processAction, rest };
