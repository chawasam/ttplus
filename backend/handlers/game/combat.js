// handlers/game/combat.js — Server-side battle logic
const admin  = require('firebase-admin');
const { MONSTERS, getMonster, getRandomMonster, calcDamage } = require('../../data/monsters');
const { getDungeonMonster }  = require('../../data/dungeons');
const { getItem, rollItem }  = require('../../data/items');
const { addGold }            = require('./currency');
const { trackQuestProgress }    = require('./quests');
const { trackStoryStep }        = require('./quest_engine');
const { trackWeeklyProgress }   = require('./weeklyQuests');
const { getSkill }              = require('../../data/skills');
const { checkAchievements, pushGameEvent } = require('./achievements');
const { logReward } = require('../../utils/anticheat');

// Active battles — persisted in Firestore (game_battles collection)
// Each document: { battleId, uid, state: <JSON>, createdAt, updatedAt }
// We keep a local 1-minute write-through cache to avoid redundant reads inside a single request.
const _battleCache = new Map();  // battleId → state (in-request cache only)

// ── In-memory cooldown per uid สำหรับ battle action (1 วินาที) ──────────────
const _actionCooldown = new Map(); // uid → lastActionMs
const ACTION_COOLDOWN_MS = 1000;
setInterval(() => {
  const cutoff = Date.now() - ACTION_COOLDOWN_MS * 10;
  for (const [k, v] of _actionCooldown.entries()) {
    if (v < cutoff) _actionCooldown.delete(k);
  }
}, 60 * 1000);

async function saveBattle(db, battleId, state) {
  await db.collection('game_battles').doc(battleId).set({
    battleId,
    uid:       state.uid,
    state:     JSON.stringify(state),  // Firestore can't store complex nested Maps
    createdAt: state.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
  _battleCache.set(battleId, state);
}

async function loadBattle(db, battleId) {
  if (_battleCache.has(battleId)) return _battleCache.get(battleId);
  const doc = await db.collection('game_battles').doc(battleId).get();
  if (!doc.exists) return null;
  const parsed = JSON.parse(doc.data().state);
  _battleCache.set(battleId, parsed);
  return parsed;
}

async function deleteBattle(db, battleId) {
  _battleCache.delete(battleId);
  await db.collection('game_battles').doc(battleId).delete().catch(() => {});
}

// ===== Start battle =====
async function startBattle(req, res) {
  // bossData จาก client ถูกยกเลิกทั้งหมด — monster ทุกตัวโหลดจาก server data เท่านั้น
  const { zone, monsterId, dungeonRunId } = req.body;
  const uid = req.user.uid;

  const db = admin.firestore();
  let monster;

  if (dungeonRunId) {
    // ── Dungeon battle: load room + monster from Firestore (server-side) ─────
    const runDoc = await db.collection('game_dungeons').doc(dungeonRunId).get();
    if (!runDoc.exists)           return res.status(400).json({ error: 'ไม่พบ Dungeon run' });
    const run = runDoc.data();
    if (run.uid !== uid)          return res.status(403).json({ error: 'ไม่ใช่ Dungeon run ของคุณ' });
    if (run.status !== 'active')  return res.status(400).json({ error: 'Dungeon run นี้ไม่ active แล้ว' });

    const { getDungeon } = require('../../data/dungeons');
    const dungeon = getDungeon(run.dungeonId);
    const room    = dungeon?.rooms[run.currentRoom];
    if (!room || (room.type !== 'combat' && room.type !== 'boss')) {
      return res.status(400).json({ error: 'ห้องปัจจุบันไม่ใช่ห้องต่อสู้' });
    }
    // boss rooms ใช้ room.boss โดยตรง (room.monsterId ไม่มีสำหรับ boss type)
    if (room.type === 'boss') {
      monster = room.boss;
    } else {
      monster = getMonster(room.monsterId) || getDungeonMonster(room.monsterId);
    }
    if (!monster) return res.status(400).json({ error: `ไม่พบมอนสเตอร์ในห้องนี้: ${room.monsterId || 'boss'}` });

  } else if (monsterId) {
    // ── Validate monsterId อยู่ใน zone ที่ถูกต้อง ────────────────────────────
    // ใช้ zone จาก request body ก่อน (ส่งมาจาก explore encounter)
    // ถ้าไม่มี zone ใน request → โหลด character location จาก Firestore
    const { getZone } = require('../../data/maps');

    let validationZone = zone || null;     // zone จาก explore result
    let charLevelForZone = 1;

    const acctForZone = await db.collection('game_accounts').doc(uid).get();
    const charIdForZone = acctForZone.data()?.characterId;
    if (charIdForZone) {
      const charForZone = await db.collection('game_characters').doc(charIdForZone).get();
      charLevelForZone = charForZone.data()?.level || 1;
      if (!validationZone) {
        // ไม่มี zone ใน request — fallback to stored location
        validationZone = charForZone.data()?.location || 'town_outskirts';
      }
    }

    if (validationZone) {
      const zoneDef = getZone(validationZone);
      if (!zoneDef) return res.status(400).json({ error: 'Zone ไม่ถูกต้อง' });

      // ตรวจ level requirement ของ zone (ป้องกันส่ง zone สูงเกินมาตรง ๆ)
      const [minLv] = zoneDef.level || [1];
      if (charLevelForZone < minLv) {
        return res.status(403).json({ error: `Level ไม่ถึง — Zone นี้ต้องการ Level ${minLv}` });
      }

      const allowedMonsters = zoneDef.monsters || [];
      if (allowedMonsters.length > 0 && !allowedMonsters.includes(monsterId)) {
        return res.status(403).json({ error: `มอนสเตอร์นี้ไม่ได้อยู่ใน zone ${zoneDef.nameTH}` });
      }
    }
    monster = getMonster(monsterId) || getDungeonMonster(monsterId);
  } else {
    monster = getRandomMonster(zone || 'town_outskirts');
  }
  if (!monster) return res.status(400).json({ error: 'ไม่พบมอนสเตอร์' });

  // ── Zone Boss cooldown check ────────────────────────────────────────────
  if (monster.special === 'zone_boss') {
    const acct2 = await db.collection('game_accounts').doc(uid).get();
    const kills = acct2.data()?.zoneBossKills || {};
    const lastKill = kills[monster.monsterId] || 0;
    const cooldownMs = (monster.cooldownHours || 24) * 3600 * 1000;
    const elapsed = Date.now() - lastKill;
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 3600000);
      return res.status(400).json({
        error: `⏳ ${monster.name} กำลังฟื้นร่าง — อีก ${remaining} ชั่วโมงจะกลับมา`,
        cooldownRemaining: cooldownMs - elapsed,
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

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
    if (className === 'warrior')   passiveDef    = Math.floor(char.def * 1.1);  // Iron Will: DEF +10%
    if (className === 'mage')      passiveMpRegen = 5;                           // Mana Flow: +5 MP/turn
    if (className === 'archer')    passiveCrit   = 0.15;                         // Keen Senses: Crit +5%
    if (className === 'paladin')   passiveMpRegen = 0;                           // Holy Blessing: HP regen handled in turn
    if (className === 'berserker') passiveAtk    = char.atk;                     // Bloodthirst: checked per turn
    if (className === 'rogue')     passiveCrit   = 0.15;                         // Shadow Veil: flee handled separately

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
        // Boss phase 2 support
        phase2:        monster.phase2 || null,
        phase2Applied: false,
      },
      log: [`${monster.emoji} ${monster.name} ปรากฏตัว!`, monster.desc],
      createdAt: Date.now(),
    };

    await saveBattle(db, battleId, state);

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
  const db  = admin.firestore();

  // ── Per-uid action cooldown (1 วินาที) ──
  const lastAction = _actionCooldown.get(uid) || 0;
  if (Date.now() - lastAction < ACTION_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Action เร็วเกินไป กรุณารอสักครู่' });
  }
  _actionCooldown.set(uid, Date.now());

  const state = await loadBattle(db, battleId);
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
    // Rogue Shadow Veil passive: flee chance = 90%
    const fleeThreshold = state.charClass === 'rogue' ? 0.9 : state.enemy.flee_chance;
    const fleeRoll = Math.random();
    if (fleeRoll < fleeThreshold) {
      log.push('🏃 คุณหนีออกมาได้!');
      state.result = 'fled';
      await deleteBattle(db, battleId);
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

  // ===== Boss Phase 2 transition =====
  if (
    !state.enemy.phase2Applied &&
    state.enemy.phase2 &&
    state.enemy.hp > 0 &&
    state.enemy.hp <= Math.floor(state.enemy.hpMax * (state.enemy.phase2.trigger || 0.5))
  ) {
    const p2 = state.enemy.phase2;
    state.enemy.phase2Applied = true;
    if (p2.atkMult)   state.enemy.atk = Math.round(state.enemy.atk * p2.atkMult);
    if (p2.defMult)   state.enemy.def = Math.round(state.enemy.def * p2.defMult);
    if (p2.attackMsg) state.enemy.attackMsg = p2.attackMsg;
    if (p2.regen !== undefined) state.enemy.regen = p2.regen;
    log.push(p2.phaseMsg || `🔥 ${state.enemy.name} เข้าสู่ Phase 2!`);
  }

  // ===== Check enemy dead =====
  if (state.enemy.hp <= 0) {
    log.push(`💀 ${state.enemy.name} พ่ายแพ้!`);
    const rewards = await grantRewards(uid, state);
    log.push(...rewards.log);
    state.result = 'victory';
    await deleteBattle(db, battleId);

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

  // Paladin passive: Holy Blessing — ฟื้นฟู 8 HP ทุกเทิร์น
  if (state.charClass === 'paladin' && state.player.hp > 0) {
    const regenAmt = 8;
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + regenAmt);
    log.push(`💚 Holy Blessing ฟื้นฟู ${regenAmt} HP`);
  }

  // Berserker passive: Bloodthirst — ATK +20% เมื่อ HP < 50%
  if (state.charClass === 'berserker' && !state.berserkerRageActive) {
    const halfHp = Math.floor(state.player.hpMax * 0.5);
    if (state.player.hp <= halfHp) {
      state.berserkerRageActive = true;
      state.player.atk = Math.round(state.player.atk * 1.2);
      log.push('🔥 Bloodthirst ทำงาน! ATK +20% (HP ต่ำกว่า 50%)');
    }
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
      await db.collection('game_dungeons').doc(state.dungeonRunId).update({
        status:   'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      log.push('🏚️ Dungeon run ล้มเหลว...');
    }

    state.result = 'defeat';
    await deleteBattle(db, battleId);
    // Achievement check for death
    checkAchievements(uid, 'death', 1).catch(() => {});
    return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'defeat' }, dungeonRunId: state.dungeonRunId });
  }

  state.turn++;
  await saveBattle(db, battleId, state);
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

  // Load account (needed for active boosts + charId)
  const accountDoc    = await db.collection('game_accounts').doc(uid).get();
  const accountData   = accountDoc.data() || {};
  const activeBoosts  = accountData.activeBoosts || {};
  const now           = Date.now();

  // Gold reward (with optional boost)
  const [minG, maxG] = state.enemy.goldReward || [0, 0];
  let gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
  const goldBoost = activeBoosts.gold_boost;
  if (goldBoost && goldBoost.expiresAt > now && gold > 0) {
    gold = Math.floor(gold * (goldBoost.multiplier || 2));
    log.push(`💰 Gold Boost ×${goldBoost.multiplier || 2} ใช้งานอยู่!`);
  }
  if (gold > 0) {
    await addGold(uid, gold, 'combat_drop');
    rewards.gold = gold;
    log.push(`💰 ได้รับ ${gold} Gold`);
  }

  // XP (with optional boost)
  const charId = accountData.characterId;
  if (charId) {
    let xpGained = state.enemy.xpReward;
    const xpBoost = activeBoosts.xp_boost;
    if (xpBoost && xpBoost.expiresAt > now) {
      xpGained = Math.floor(xpGained * (xpBoost.multiplier || 2));
      log.push(`⭐ XP Boost ×${xpBoost.multiplier || 2} ใช้งานอยู่!`);
    }
    rewards.xp = xpGained;

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();
    const newXp   = (char.xp || 0) + xpGained;
    log.push(`⭐ ได้รับ ${xpGained} XP`);

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

  // Zone Boss kill record
  if (state.enemy.monsterId && MONSTERS[state.enemy.monsterId]?.special === 'zone_boss') {
    try {
      await db.collection('game_accounts').doc(uid).set(
        { zoneBossKills: { [state.enemy.monsterId]: Date.now() } },
        { merge: true }
      );
    } catch {}
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

  // ── Anti-cheat: log reward event ─────────────────────────────────────────
  logReward(uid, 'combat_drop', {
    xp:      rewards.xp || 0,
    gold:    rewards.gold || 0,
    items:   rewards.items || [],
    levelUp: rewards.levelUp || null,
  }).catch(() => {});

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

// ===== Cleanup stale battles (> 2 hours old) =====
// Call periodically from server.js or on startup
async function cleanupStaleBattles() {
  try {
    const db  = admin.firestore();
    const cutoff = Date.now() - 2 * 3600 * 1000; // 2 hours ago
    const snap = await db.collection('game_battles')
      .where('updatedAt', '<', cutoff)
      .limit(50)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`[Combat] 🧹 Cleaned up ${snap.size} stale battles`);
    // Also clear local cache entries that are gone
    for (const doc of snap.docs) _battleCache.delete(doc.id);
  } catch (err) {
    console.error('[Combat] cleanupStaleBattles:', err.message);
  }
}

module.exports = { startBattle, processAction, rest, cleanupStaleBattles };
