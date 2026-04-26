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
    // Iron Will (warrior): DEF +10%
    if (className === 'warrior')     passiveDef     = Math.floor(char.def * 1.1);
    // Overclock (engineer): DEF +15%
    if (className === 'engineer')    passiveDef     = Math.floor(char.def * 1.15);
    // Rune Forge (runesmith): ATK +10%
    if (className === 'runesmith')   passiveAtk     = Math.floor(char.atk * 1.1);
    // Mana Flow (mage): +5 MP/turn
    if (className === 'mage')        passiveMpRegen = 5;
    // Inspiring Melody (bard): +5 MP/turn + ATK +5%
    if (className === 'bard')      { passiveMpRegen = 5; passiveAtk = Math.floor(char.atk * 1.05); }
    // Forest Stride (ranger): Crit +5%
    if (className === 'ranger')      passiveCrit    = 0.15;
    // True Sight (soulseer): Crit +8%
    if (className === 'soulseer')    passiveCrit    = 0.18;
    // Lethal Focus (assassin): Crit +10%
    if (className === 'assassin')    passiveCrit    = 0.20;
    // Shadow Veil (rogue): flee 90% — handled at flee action
    // Bloodthirst (berserker): ATK +20% at <50% HP — handled per turn
    // Divine Grace (cleric): +8 HP/turn — handled per turn
    // Undying (deathknight): +15 HP/turn — handled per turn
    // Elemental Harmony (shaman): +5 HP +5 MP/turn — handled per turn
    // Others: handled per turn or at specific events

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
        critMult:   className === 'assassin' ? 1.9 : 1.5, // crit damage multiplier (assassin gets 1.9)
        mpRegen:    passiveMpRegen, // MP regen per turn (mage passive)
        isGuarding: false,          // Guard action flag
        status: [],
        buffs:  [],                 // active self-buffs { type, atkMult, defMult, critBonus, duration }
      },
      enemy: {
        monsterId: monster.monsterId,
        name:      monster.name,
        emoji:     monster.emoji,
        desc:      monster.desc,
        type:      monster.type || 'unknown',  // beast/undead/void/human/construct/demon
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
        moves:     monster.moves || [],
        // Boss phase 2 support
        phase2:        monster.phase2 || null,
        phase2Applied: false,
        counters:      monster.counters || [],  // Phase 2D counter definitions
        shieldPhase:   null,  // { defMult, turnsLeft } when active
        evasionPhase:  null,  // { dodgeRate, turnsLeft } when active
      },
      log: [`${monster.emoji} ${monster.name} ปรากฏตัว!`, monster.desc],
      comboCount:    0,     // consecutive hit streak
      telegraphMove: null,  // move enemy is preparing for NEXT turn
      momentum:      0,     // 0-100 battle momentum, fills on hit/crit → Limit Break at 100
      limitBreakReady: false,
      // ── Phase 3: Class-specific resources ──────────────────────
      // Berserker: Rage stacks (0-10), +5% ATK each, FRENZY at 10
      rageStacks:     className === 'berserker'   ? 0 : undefined,
      frenzying:      className === 'berserker'   ? false : undefined, // double-attack flag
      // Engineer: active turret { dmg, turnsLeft } or null
      turret:         className === 'engineer'    ? null : undefined,
      // Necromancer: soul shards (0-3) + minion army
      soulShards:     className === 'necromancer' ? 0 : undefined,
      minions:        className === 'necromancer' ? [] : undefined, // [{ dmg, turnsLeft }]
      // Rifter: void charges (0-5), release for burst
      voidCharges:    className === 'rifter'      ? 0 : undefined,
      // Enemy counter tracking
      consecutiveAttacks: 0,   // how many consecutive normal attacks player has done
      counterTriggered:   {},  // { 'hpBelow_0.5': true } — prevents re-firing one-time counters
      // Bard: song stacks (0-10), +3% ATK each turn a song buff is active
      songStacks:     className === 'bard'        ? 0 : undefined,
      songActive:     className === 'bard'        ? false : undefined,
      // Phantom: ethereal plane toggle — physical damage -50% while ethereal
      etherealPlane:  className === 'phantom'     ? false : undefined,
      etherealTurns:  className === 'phantom'     ? 0 : undefined,
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

  // ===== Check Player STUN before action =====
  const isPlayerStunned = state.player.status.some(s => s.type === 'STUN');
  if (isPlayerStunned) {
    log.push('😵 คุณถูกสตัน — ไม่สามารถโจมตีได้เทิร์นนี้!');
    // Tick stun duration
    state.player.status = state.player.status.map(s =>
      s.type === 'STUN' ? { ...s, duration: s.duration - 1 } : s
    ).filter(s => s.duration > 0);
  }

  // ===== Player action =====
  if (isPlayerStunned && (action === 'attack' || action === 'skill')) {
    // attack/skill blocked by stun — do nothing (stun already ticked above)

  } else if (action === 'attack') {
    // Apply SLOW debuff on player ATK
    const playerSlow = state.player.status.find(s => s.type === 'SLOW');
    const playerAtk  = playerSlow ? Math.floor(state.player.atk * (playerSlow.atkMult || 0.6)) : state.player.atk;
    // Tick SLOW duration
    if (playerSlow) {
      state.player.status = state.player.status.map(s =>
        s.type === 'SLOW' ? { ...s, duration: s.duration - 1 } : s
      ).filter(s => s.duration > 0);
    }
    // Apply MARKED: ลด DEF ของศัตรูเมื่อ marked
    const markedBuff = state.enemy.status.find(s => s.type === 'MARKED');
    const effectiveDef = markedBuff ? Math.floor(state.enemy.def * (markedBuff.defMult || 1.0)) : state.enemy.def;

    // ── Crit calculation (Super Crit at critChance/3) ──
    const critRoll  = Math.random() * 100;
    const critPct   = (state.player.critChance || 0.1) * 100;
    const critMult  = state.player.critMult || 1.5;
    let isCrit      = false, isSuperCrit = false;
    if (critRoll <= critPct / 3)      { isSuperCrit = true; }
    else if (critRoll <= critPct)     { isCrit = true; }

    let dmg = calcDamage(playerAtk, effectiveDef);
    if (markedBuff?.dmgMultiplier > 1) dmg = Math.floor(dmg * markedBuff.dmgMultiplier);
    if (isSuperCrit) { dmg = Math.floor(dmg * 2.2); log.push('🌟 SUPER CRIT!! ×2.2!'); }
    else if (isCrit) { dmg = Math.floor(dmg * critMult); log.push('💥 CRITICAL HIT!'); }

    // Soulseer passive: +8 MP on any crit
    if ((isCrit || isSuperCrit) && state.charClass === 'soulseer') {
      state.player.mp = Math.min(state.player.mpMax, state.player.mp + 8);
    }

    // ── Combo counter ──
    state.comboCount = (state.comboCount || 0) + 1;
    const combo = state.comboCount;
    if (combo >= 10)     { dmg = Math.floor(dmg * 1.25); }
    else if (combo >= 5) { dmg = Math.floor(dmg * 1.15); }
    else if (combo >= 3) { dmg = Math.floor(dmg * 1.05); }

    // ── Phase 3F: Phantom Ethereal — regular attack damage -30% ──
    if (state.charClass === 'phantom' && state.etherealPlane) {
      dmg = Math.floor(dmg * 0.7);
    }

    // ── Phase 2D: Enemy Evasion Phase — chance to dodge ──
    let attackDodged = false;
    if (state.enemy.evasionPhase?.turnsLeft > 0) {
      if (Math.random() < state.enemy.evasionPhase.dodgeRate) {
        log.push(`💨 ${state.enemy.name} หลบหลีก! MISS! (Evasion Phase ${state.enemy.evasionPhase.turnsLeft} turns left)`);
        state.comboCount = 0;  // Miss breaks combo
        attackDodged = true;
      }
    }

    if (!attackDodged) state.enemy.hp = Math.max(0, state.enemy.hp - dmg);

    if (!attackDodged) {
      let attackLabel = `⚔️ คุณโจมตี ${state.enemy.name}! ${dmg} damage`;
      if (playerSlow)   attackLabel += ' (ช้าลง ⚠️)';
      if (markedBuff)   attackLabel += ' (🎯 Marked!)';
      log.push(attackLabel);
      if (combo === 10)      log.push('🔥🔥 RAMPAGE ×10! +25% damage!');
      else if (combo === 5)  log.push('🔥 COMBO ×5! +15% damage!');
      else if (combo >= 3)   log.push(`🔥 Combo ×${combo}`);

      // ── Momentum build ──
      const momGain = isSuperCrit ? 20 : isCrit ? 15 : 10;
      state.momentum = Math.min(100, (state.momentum || 0) + momGain);
      if (state.momentum >= 100 && !state.limitBreakReady) {
        state.limitBreakReady = true;
        log.push('⚡ LIMIT BREAK พร้อมแล้ว! กด Limit Break เพื่อปล่อยพลังสูงสุด!');
      }
    }

  } else if (action === 'skill') {
    // ─── USE SKILL ───
    const skillResult = applySkill(state, skillId, log);
    if (!skillResult.success) return res.status(400).json({ error: skillResult.error });

    // Track skill usage (fire-and-forget)
    if (skillId) {
      const skillDef = getSkill(skillId);
      db.collection('game_skill_stats').doc(skillId).set({
        skillId,
        name: skillDef?.name || skillId,
        charClass: skillDef?.classReq?.[0] || 'any',
        useCount: admin.firestore.FieldValue.increment(1),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
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

  } else if (action === 'guard') {
    // ── GUARD: ตั้งท่ารับ — ลด damage รอบนี้ + รับ MP เล็กน้อย ──
    state.player.isGuarding = true;
    state.player.mp = Math.min(state.player.mpMax, state.player.mp + 5);
    state.comboCount = 0;  // Guard resets combo
    log.push('🛡️ ตั้งท่ารับ — ลด damage 45% รอบนี้ (+5 MP)');
    if (state.charClass === 'warrior') log.push('🗡️ Iron Will: ลด damage 60%!');

  } else if (action === 'limit_break') {
    // ── LIMIT BREAK: ปล่อยพลังสูงสุดของ class ──
    if (!state.limitBreakReady) {
      return res.status(400).json({ error: 'Limit Break ยังไม่พร้อม — ต้องการ Momentum เต็ม 100' });
    }
    const lbResult = applyLimitBreak(state, log);
    if (!lbResult.success) return res.status(400).json({ error: lbResult.error });
    state.momentum = 0;
    state.limitBreakReady = false;
    state.comboCount = (state.comboCount || 0) + 1;  // Limit break continues combo

  } else if (action === 'item') {
    // ใช้ item consumable (ใช้ได้แม้ถูก stun)
    state.comboCount = 0;  // Using item breaks combo
    const itemResult = await useItem(uid, itemInstanceId, state, log);
    if (!itemResult.success) return res.status(400).json({ error: itemResult.error });

  } else if (!isPlayerStunned) {
    return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  }

  // ===== Phase 2D: Enemy Counter / Reaction checks =====
  if (state.enemy.hp > 0) {
    const counterLog = checkEnemyCounters(state, action);
    log.push(...counterLog);
    // Tick evasion phase after player acts
    if (state.enemy.evasionPhase) {
      state.enemy.evasionPhase.turnsLeft--;
      if (state.enemy.evasionPhase.turnsLeft <= 0) {
        state.enemy.evasionPhase = null;
        log.push(`💨 ${state.enemy.name} หยุด Evasion Phase`);
      }
    }
    // If counter killed player
    if (state.player.hp <= 0) {
      log.push('💀 คุณพ่ายแพ้โดยการโต้กลับของ ' + state.enemy.name);
      await handlePlayerDeath(uid, state);
      state.result = 'defeat';
      await deleteBattle(db, battleId);
      return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'defeat' }, dungeonRunId: state.dungeonRunId });
    }
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
    // Phase 3C: Necromancer gains soul shard on kill
    if (state.charClass === 'necromancer' && state.soulShards !== undefined) {
      if (state.soulShards < 3) {
        state.soulShards++;
        log.push(`🦴 Soul Shard! (${state.soulShards}/3) — ใช้ Bone Explosion ×2 shards เพื่อ Raise Dead`);
      }
    }
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

  // ── Per-turn passive effects ─────────────────────────────────────────────
  const cls = state.charClass;

  // Cleric: Divine Grace — +8 HP/turn
  if (cls === 'cleric' && state.player.hp > 0) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + 8);
    log.push('💚 Divine Grace ฟื้นฟู 8 HP');
  }
  // Deathknight: Undying — +15 HP/turn
  if (cls === 'deathknight' && state.player.hp > 0) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + 15);
    log.push('💀 Undying ฟื้นฟู 15 HP');
  }
  // Shaman: Elemental Harmony — +5 HP +5 MP/turn
  if (cls === 'shaman' && state.player.hp > 0) {
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + 5);
    state.player.mp = Math.min(state.player.mpMax, state.player.mp + 5);
    log.push('🌊 Elemental Harmony ฟื้นฟู 5 HP + 5 MP');
  }
  // Bard: Inspiring Melody — +5 MP/turn (on top of mana_flow handled in mpRegen)
  if (cls === 'bard') {
    state.player.mp = Math.min(state.player.mpMax, state.player.mp + 5);
  }

  // Berserker: Bloodthirst — ATK +20% เมื่อ HP < 50% (เกิดครั้งเดียว)
  if (cls === 'berserker' && !state.berserkerRageActive) {
    if (state.player.hp <= Math.floor(state.player.hpMax * 0.5)) {
      state.berserkerRageActive = true;
      state.player.atk = Math.round(state.player.atk * 1.2);
      log.push('🔥 Bloodthirst ทำงาน! ATK +20% (HP ต่ำกว่า 50%)');
    }
  }

  // ── Phase 2D: Tick down enemy shield phase ──
  if (state.enemy.shieldPhase) {
    state.enemy.shieldPhase.turnsLeft--;
    if (state.enemy.shieldPhase.turnsLeft <= 0) {
      // Restore DEF (reverse the defMult that was applied)
      if (state.enemy.shieldPhase.defMult > 0) {
        state.enemy.def = Math.floor(state.enemy.def / state.enemy.shieldPhase.defMult);
      }
      state.enemy.shieldPhase = null;
      log.push(`🛡️ ${state.enemy.name} Shield Phase สิ้นสุด — DEF กลับสู่ปกติ`);
    } else {
      log.push(`🛡️ Shield Phase active (${state.enemy.shieldPhase.turnsLeft} turns left)`);
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
    // ── Named move: ใช้ telegraphed move ที่ประกาศไว้ หรือ pick ใหม่ ──
    const usedMove = state.telegraphMove || pickMove(state.enemy);
    state.telegraphMove = null;

    const attackMsgs = state.enemy.attackMsg;
    const attackMsg  = attackMsgs[Math.floor(Math.random() * attackMsgs.length)];
    const moveName   = usedMove ? `[${usedMove.emoji || ''}${usedMove.name}] ` : '';

    // Apply SLOW debuff to enemy atk
    const slowBuff = state.enemy.status.find(s => s.type === 'SLOW');
    let enemyAtk   = slowBuff ? Math.floor(state.enemy.atk * (slowBuff.atkMult || 0.75)) : state.enemy.atk;
    // BURN debuff: -5% ATK while burning
    if (state.enemy.status.find(s => s.type === 'BURN')) enemyAtk = Math.floor(enemyAtk * 0.95);
    // Tick SLOW duration
    if (slowBuff) {
      state.enemy.status = state.enemy.status.map(s =>
        s.type === 'SLOW' ? { ...s, duration: s.duration - 1 } : s
      ).filter(s => s.duration > 0);
    }

    // Apply move dmgMult
    let rawEnemyDmg = calcDamage(enemyAtk, state.player.def);
    if (usedMove?.dmgMult) rawEnemyDmg = Math.floor(rawEnemyDmg * usedMove.dmgMult);

    // ── Phase 3F: Phantom Ethereal Plane — physical damage -50% ──
    if (state.charClass === 'phantom' && state.etherealPlane) {
      rawEnemyDmg = Math.floor(rawEnemyDmg * 0.5);
      log.push(`👻 Ethereal Plane! Physical damage halved! (${state.etherealTurns - 1} turns left)`);
      state.etherealTurns = (state.etherealTurns || 1) - 1;
      if (state.etherealTurns <= 0) {
        state.etherealPlane = false;
        state.etherealTurns = 0;
        log.push('👻 กลับสู่ Material Plane');
      }
    }

    // ── Guard damage reduction ──
    let guardMult = 1.0;
    if (state.player.isGuarding) {
      const isTelegraphedHit = !!usedMove?.telegraphed;
      if (state.charClass === 'warrior') {
        guardMult = isTelegraphedHit ? 0.25 : 0.40;  // warrior: 60% / 75% reduction
      } else {
        guardMult = isTelegraphedHit ? 0.30 : 0.55;  // others: 45% / 70% reduction
      }
    }
    state.player.isGuarding = false;
    const enemyDmg = Math.max(1, Math.floor(rawEnemyDmg * guardMult));
    state.player.hp = Math.max(0, state.player.hp - enemyDmg);

    const guardLabel = guardMult < 1.0 ? ` 🛡️ GUARDED! (-${Math.round((1 - guardMult) * 100)}%)` : '';
    log.push(`👹 ${state.enemy.name} ${moveName}${attackMsg}! ${enemyDmg} damage${slowBuff ? ' (ช้าลง)' : ''}${guardLabel}`);

    // ── Phase 3A: Berserker Rage — รับ damage → +1 Rage ──────────
    if (state.charClass === 'berserker' && enemyDmg > 0 && state.rageStacks !== undefined) {
      const prevRage = state.rageStacks;
      state.rageStacks = Math.min(10, state.rageStacks + 1);
      // Each rage stack: +5% ATK (recalculate from base)
      state.player.atk = Math.floor(state.player.atkBase * (1 + state.rageStacks * 0.05));
      log.push(`🔥 Rage! Stack ×${state.rageStacks} — ATK +${state.rageStacks * 5}%`);
      if (state.rageStacks >= 10 && !state.frenzying) {
        state.frenzying = true;
        log.push('💢 FRENZY!! การโจมตีครั้งต่อไปจะฟาด 2 ครั้ง!!');
      }
    }

    // Apply named move special effect
    if (usedMove?.effect && guardMult === 1.0 && !state.player.status.find(s => s.type === usedMove.effect.type)) {
      const ef = usedMove.effect;
      state.player.status.push({ type: ef.type, duration: ef.duration, dmgPerTurn: ef.dmgPerTurn || 0, atkMult: ef.atkMult });
      log.push(`⚠️ คุณถูก ${ef.type} จาก ${usedMove.name}!`);
    }

    // ── Telegraph next move (if it's a telegraphed type) ──
    const nextMove = pickMove(state.enemy);
    if (nextMove?.telegraphed) {
      state.telegraphMove = nextMove;
      log.push(`⚠️ ${state.enemy.name} กำลังเตรียม "${nextMove.name}" — Guard รอบหน้าเพื่อลด damage!`);
    }
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

  // ── Phase 3: Per-turn class mechanics (after enemy turn) ─────────

  // 3A: Berserker FRENZY — bonus attack this turn if frenzying
  if (state.charClass === 'berserker' && state.frenzying && state.enemy.hp > 0 && state.player.hp > 0) {
    state.frenzying = false;
    state.rageStacks = 0;
    // Reset ATK to base (rage buff gone)
    state.player.atk = state.player.atkBase;
    const frenzyDmg = calcDamage(state.player.atk, state.enemy.def);
    state.enemy.hp = Math.max(0, state.enemy.hp - frenzyDmg);
    log.push(`💢 FRENZY 2nd STRIKE! ${frenzyDmg} damage! (Rage reset)`);
    if (state.enemy.hp <= 0) {
      log.push(`💀 ${state.enemy.name} พ่ายแพ้! (FRENZY finish)`);
      const rewards = await grantRewards(uid, state);
      log.push(...rewards.log);
      state.result = 'victory';
      await deleteBattle(db, battleId);
      trackQuestProgress(uid, 'kill', 1).catch(() => {});
      trackWeeklyProgress(uid, 'kill', 1).catch(() => {});
      trackStoryStep(uid, 'kill', { monsterId: state.enemy.monsterId, zone: state.zone }).catch(() => {});
      checkAchievements(uid, 'kill', 1).catch(() => {});
      pushGameEvent(uid, { type: 'kill', msg: `⚔️ สังหาร ${state.enemy.emoji} ${state.enemy.name}! (FRENZY!)`, char: uid }).catch(() => {});
      return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'victory' }, rewards });
    }
  }

  // 3B: Engineer Turret — fires every turn
  if (state.charClass === 'engineer' && state.turret?.active && state.enemy.hp > 0) {
    const tDmg = state.turret.dmg || 12;
    state.enemy.hp = Math.max(0, state.enemy.hp - tDmg);
    state.turret.turnsLeft--;
    log.push(`⚙️ Turret fires! ${tDmg} damage (${state.turret.turnsLeft} turns left)`);
    if (state.turret.turnsLeft <= 0) {
      state.turret = null;
      log.push('⚙️ Turret สิ้นสุดการทำงาน');
    }
    if (state.enemy.hp <= 0) {
      log.push(`💀 ${state.enemy.name} พ่ายแพ้! (Turret finish)`);
      const rewards = await grantRewards(uid, state);
      log.push(...rewards.log);
      state.result = 'victory';
      await deleteBattle(db, battleId);
      trackQuestProgress(uid, 'kill', 1).catch(() => {});
      trackWeeklyProgress(uid, 'kill', 1).catch(() => {});
      trackStoryStep(uid, 'kill', { monsterId: state.enemy.monsterId, zone: state.zone }).catch(() => {});
      checkAchievements(uid, 'kill', 1).catch(() => {});
      return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'victory' } });
    }
  }

  // 3C: Necromancer Minions — process each minion
  if (state.charClass === 'necromancer' && state.minions?.length > 0 && state.enemy.hp > 0) {
    const aliveMinions = [];
    for (const m of state.minions) {
      const mDmg = m.dmg || 8;
      state.enemy.hp = Math.max(0, state.enemy.hp - mDmg);
      log.push(`🦴 Skeleton โจมตี! ${mDmg} damage (${m.turnsLeft - 1} turns left)`);
      if (m.turnsLeft - 1 > 0) aliveMinions.push({ ...m, turnsLeft: m.turnsLeft - 1 });
      else log.push('💀 Skeleton สลายไปแล้ว');
    }
    state.minions = aliveMinions;
    if (state.enemy.hp <= 0) {
      log.push(`💀 ${state.enemy.name} พ่ายแพ้! (Minion finish)`);
      const rewards = await grantRewards(uid, state);
      log.push(...rewards.log);
      state.result = 'victory';
      await deleteBattle(db, battleId);
      trackQuestProgress(uid, 'kill', 1).catch(() => {});
      trackWeeklyProgress(uid, 'kill', 1).catch(() => {});
      trackStoryStep(uid, 'kill', { monsterId: state.enemy.monsterId, zone: state.zone }).catch(() => {});
      checkAchievements(uid, 'kill', 1).catch(() => {});
      return res.json({ battleId, state: { ...sanitizeState(state), log, result: 'victory' } });
    }
  }

  // 3E: Bard Song Stacking — +3% ATK per turn while a song buff is active (max 10 stacks)
  if (state.charClass === 'bard' && state.songActive && state.player.hp > 0) {
    const hasSongBuff = (state.player.buffs || []).some(b => b.isSong);
    if (hasSongBuff) {
      if ((state.songStacks || 0) < 10) {
        state.songStacks = (state.songStacks || 0) + 1;
        // Recalculate ATK with song bonus (+3% per stack, stacked on atkBase)
        const songMult = 1 + state.songStacks * 0.03;
        state.player.atk = Math.floor(state.player.atkBase * songMult);
        log.push(`🎵 Song Stack ×${state.songStacks}! ATK +${state.songStacks * 3}% (${state.player.atk})`);
      }
    } else {
      // Song buff expired — reset ATK and song state
      if (state.songStacks > 0) {
        state.player.atk = state.player.atkBase;
        log.push(`🎵 เพลงสิ้นสุด — ATK กลับสู่ปกติ (Song Stack ×${state.songStacks} หมดอายุ)`);
        state.songStacks = 0;
      }
      state.songActive = false;
    }
  }

  state.turn++;
  await saveBattle(db, battleId, state);
  return res.json({ battleId, state: { ...sanitizeState(state), log, result: null } });
}

// ─── Phase 3G: Elemental Damage System ───────────────────────────
// element → modifier per monster TYPE
// >1.0 = weakness (takes more damage), <1.0 = resistance (takes less damage)
const TYPE_ELEMENT_MODIFIERS = {
  beast:     { fire: 1.5, ice: 1.0, lightning: 1.0, void: 0.7, holy: 1.0, shadow: 1.0, arcane: 1.0 },
  undead:    { fire: 1.0, ice: 0.7, lightning: 1.0, void: 1.0, holy: 2.0, shadow: 0.7, arcane: 1.0 },
  void:      { fire: 0.7, ice: 1.0, lightning: 1.0, void: 0.5, holy: 1.5, shadow: 1.0, arcane: 1.2 },
  human:     { fire: 1.0, ice: 1.0, lightning: 1.0, void: 1.5, holy: 1.0, shadow: 1.2, arcane: 1.0 },
  construct: { fire: 1.0, ice: 1.0, lightning: 1.5, void: 1.0, holy: 1.0, shadow: 1.0, arcane: 0.8 },
  demon:     { fire: 0.7, ice: 1.5, lightning: 1.0, void: 1.0, holy: 2.0, shadow: 0.7, arcane: 1.0 },
};

const ELEMENT_ICONS = { fire:'🔥', ice:'❄️', lightning:'⚡', void:'🌌', holy:'✨', shadow:'🌑', arcane:'🔮' };

function checkElementModifier(skillDef, enemyType, dmg) {
  if (!skillDef.element || !enemyType || enemyType === 'unknown') return null;
  const typeRow = TYPE_ELEMENT_MODIFIERS[enemyType];
  if (!typeRow) return null;
  const mod = typeRow[skillDef.element];
  if (!mod || mod === 1.0) return null;
  const newDmg = Math.floor(dmg * mod);
  const icon = ELEMENT_ICONS[skillDef.element] || '✨';
  if (mod > 1.0) {
    return { dmg: newDmg, msg: `${icon} WEAKNESS! ×${mod.toFixed(1)} — ${newDmg} damage!`, type: 'weakness' };
  } else {
    return { dmg: newDmg, msg: `${icon} RESIST! ×${mod.toFixed(1)} — ${newDmg} damage`, type: 'resist' };
  }
}

// ─── Phase 2D: Enemy Counter / Reaction System ───────────────────
// Called after any player action; applies counter effects to battle state
// Returns array of log strings
function checkEnemyCounters(state, playerAction) {
  const counters = state.enemy.counters;
  if (!counters || !Array.isArray(counters) || state.enemy.hp <= 0) return [];
  const log = [];
  const triggered = state.counterTriggered || {};

  for (const counter of counters) {
    const key = `${counter.trigger}_${counter.count || counter.threshold || 'any'}`;
    const r = counter.response;

    // ── consecutiveAttack: player uses normal attack N times in a row ──
    if (counter.trigger === 'consecutiveAttack') {
      if (playerAction === 'attack') {
        state.consecutiveAttacks = (state.consecutiveAttacks || 0) + 1;
      } else {
        state.consecutiveAttacks = 0;  // reset on skill/guard/other
      }
      if ((state.consecutiveAttacks || 0) >= counter.count) {
        // fire counter (can repeat)
        state.consecutiveAttacks = 0;
        if (r.type === 'counterAttack') {
          const cDmg = Math.max(1, Math.floor(calcDamage(state.enemy.atk, state.player.def) * (r.dmgMult || 1.5)));
          state.player.hp = Math.max(0, state.player.hp - cDmg);
          log.push(r.log || '⚡ Counter Attack!');
          log.push(`💥 Counter Attack: ${cDmg} damage!!`);
        }
      }
    }

    // ── hpBelow: one-time trigger when enemy HP drops below threshold ──
    if (counter.trigger === 'hpBelow' && !triggered[key]) {
      const hpPct = state.enemy.hp / state.enemy.hpMax;
      if (hpPct <= counter.threshold) {
        triggered[key] = true;
        if (r.type === 'enrage') {
          state.enemy.atk = Math.floor(state.enemy.atk * (r.atkMult || 1.3));
          if (r.defMult) state.enemy.def = Math.floor(state.enemy.def * r.defMult);
          log.push(r.log || `💢 ${state.enemy.name} ENRAGE!`);
        } else if (r.type === 'shieldPhase') {
          state.enemy.shieldPhase = { defMult: r.defMult || 0.3, turnsLeft: r.duration || 2 };
          state.enemy.def = Math.floor(state.enemy.def * (r.defMult || 0.3));
          log.push(r.log || `🛡️ ${state.enemy.name} Shield Phase!`);
        } else if (r.type === 'evasionPhase') {
          state.enemy.evasionPhase = { dodgeRate: r.dodgeRate || 0.4, turnsLeft: r.duration || 1 };
          log.push(r.log || `💨 ${state.enemy.name} Evasion Phase!`);
        }
      }
    }

    // ── statusApplied: one-time trigger when a status is applied to enemy ──
    if (counter.trigger === 'statusApplied' && !triggered[key]) {
      if (state.enemy.status.length > 0) {
        triggered[key] = true;
        if (r.type === 'enrage') {
          state.enemy.atk = Math.floor(state.enemy.atk * (r.atkMult || 1.3));
          if (r.defMult) state.enemy.def = Math.floor(state.enemy.def * r.defMult);
          log.push(r.log || `💢 ${state.enemy.name} ENRAGE! (status reaction)`);
        } else if (r.type === 'evasionPhase') {
          state.enemy.evasionPhase = { dodgeRate: r.dodgeRate || 0.35, turnsLeft: r.duration || 1 };
          log.push(r.log || `💨 ${state.enemy.name} หลบภัย!`);
        }
      }
    }
  }
  state.counterTriggered = triggered;
  return log;
}

// ─── Phase 2B: Skill Synergy Combos ─────────────────────────────
// Returns { dmg, msg } if synergy fires, null otherwise
const SYNERGY_MAP = {
  // skillId → { requiredStatus, multiplier, name, removeStatus }
  heavy_strike:       { req: 'MARKED',  mult: 2.0, name: '⚔️ MARKED EXECUTION! ×2.0',     remove: false },
  fireball:           { req: 'BURN',    mult: 1.8, name: '🔥 INCINERATE! ×1.8',            remove: false },
  shadow_strike:      { req: 'BLEED',   mult: 1.6, name: '🩸 HEMORRHAGE! ×1.6',            remove: false },
  void_hex:           { req: 'CURSE',   mult: 1.7, name: '🌑 VOID DOOM! ×1.7',             remove: false },
  poison_arrow:       { req: 'POISON',  mult: 1.5, name: '☠️ TOXIC OVERDOSE! ×1.5',        remove: false },
  dimensional_slash:  { req: 'SLOW',    mult: 1.5, name: '🌀 FROZEN SLASH! ×1.5',          remove: false },
  death_bolt:         { req: 'MARKED',  mult: 1.5, name: '💀 DEATH MARK! ×1.5',            remove: false },
  bone_explosion:     { req: 'STUN',    mult: 1.6, name: '💥 SHATTER! ×1.6',               remove: false },
  execute:            { req: 'SLOW',    mult: 1.4, name: '⚰️ REAPER\'S TIMING! ×1.4',      remove: false },
  holy_nova:          { req: 'BURN',    mult: 1.5, name: '✨ HOLY SEAR! ×1.5',             remove: false },
  primal_strike:      { req: 'POISON',  mult: 1.4, name: '🐾 VENOM HUNT! ×1.4',           remove: false },
};

function checkSynergy(skillId, enemyStatus, currentDmg, enemyName) {
  const syn = SYNERGY_MAP[skillId];
  if (!syn) return null;
  const hasStatus = enemyStatus.some(s => s.type === syn.req);
  if (!hasStatus) return null;
  const newDmg = Math.floor(currentDmg * syn.mult);
  return {
    dmg: newDmg,
    msg: `✨ SYNERGY! ${syn.name} — ${enemyName} เสียหาย ${newDmg}!`,
  };
}

// ─── Phase 2C: Limit Break per class ─────────────────────────────
const LIMIT_BREAK_DEFS = {
  warrior:     { name: '⚔️ Titan Slam',      dmgMult: 5.0, magicDamage: false, armorPierce: false, selfHeal: 0,    effect: { type: 'STUN', duration: 2 } },
  rogue:       { name: '🌑 Shadowstorm',      dmgMult: 6.0, magicDamage: false, armorPierce: false, selfHeal: 0,    forceCrit: true },
  cleric:      { name: '⚡ Holy Judgment',    dmgMult: 4.0, magicDamage: true,  armorPierce: false, selfHeal: 0.30, effect: { type: 'STUN', duration: 1 } },
  ranger:      { name: '🏹 Arrow Storm',      dmgMult: 4.0, magicDamage: false, armorPierce: false, selfHeal: 0,    multiHit: 3 },
  mage:        { name: '🔥 Arcane Explosion', dmgMult: 8.0, magicDamage: true,  armorPierce: true,  selfHeal: 0 },
  bard:        { name: '🎵 Grand Finale',     dmgMult: 3.0, magicDamage: true,  armorPierce: false, selfHeal: 0,    selfBuff: { atkMult: 1.8, duration: 2 } },
  berserker:   { name: '💢 Berserk OMEGA',   dmgMult: 7.0, magicDamage: false, armorPierce: false, selfHeal: 0,    multiHit: 3, selfDmgPct: 0.15 },
  engineer:    { name: '💣 Mega Bomb',        dmgMult: 5.0, magicDamage: false, armorPierce: false, selfHeal: 0,    effect: { type: 'BURN', duration: 3, dmgPerTurn: 20 } },
  runesmith:   { name: '🔮 Master Rune',      dmgMult: 6.0, magicDamage: false, armorPierce: true,  selfHeal: 0 },
  assassin:    { name: '⚰️ Death Blossom',    dmgMult: 4.0, magicDamage: false, armorPierce: true,  selfHeal: 0,    multiHit: 3, forceCrit: true },
  hexblade:    { name: '🌑 Soul Shatter',     dmgMult: 6.0, magicDamage: true,  armorPierce: true,  selfHeal: 0,    effect: { type: 'CURSE', duration: 3, dmgPerTurn: 20 } },
  phantom:     { name: '👻 Phase Collapse',   dmgMult: 5.0, magicDamage: true,  armorPierce: true,  selfHeal: 0 },
  deathknight: { name: '💀 Death\'s Embrace', dmgMult: 4.0, magicDamage: false, armorPierce: false, selfHeal: 0.5 },
  necromancer: { name: '💀 Lich Burst',       dmgMult: 5.5, magicDamage: true,  armorPierce: true,  selfHeal: 0,    selfDmgPct: 0.1 },
  gravecaller: { name: '🪦 Grave Explosion',  dmgMult: 5.0, magicDamage: true,  armorPierce: false, selfHeal: 0,    multiHit: 2, effect: { type: 'STUN', duration: 1 } },
  voidwalker:  { name: '🌀 Void Rupture',     dmgMult: 6.0, magicDamage: false, armorPierce: true,  selfHeal: 0 },
  rifter:      { name: '💥 Rift Collapse',    dmgMult: 3.0, magicDamage: false, armorPierce: false, selfHeal: 0,    multiHit: 4, forceCrit: true },
  soulseer:    { name: '⭐ Fate Seal',        dmgMult: 5.0, magicDamage: true,  armorPierce: false, selfHeal: 0,    effect: { type: 'MARKED', dmgMultiplier: 2.0, duration: 3 } },
  wildguard:   { name: '🦁 Wild Surge',       dmgMult: 4.0, magicDamage: false, armorPierce: false, selfHeal: 0.20, selfBuff: { defMult: 2.0, duration: 2 } },
  tracker:     { name: '🦊 Death Hunt',       dmgMult: 6.0, magicDamage: false, armorPierce: false, selfHeal: 0 },
  shaman:      { name: '🌊 Spirit Wave',      dmgMult: 5.0, magicDamage: true,  armorPierce: true,  selfHeal: 0.20, multiHit: 2 },
};

function applyLimitBreak(state, log) {
  const lbDef = LIMIT_BREAK_DEFS[state.charClass];
  if (!lbDef) return { success: false, error: `ไม่มี Limit Break สำหรับ class ${state.charClass}` };

  log.push(`⚡💥 LIMIT BREAK — ${lbDef.name}!!`);

  const hits = lbDef.multiHit || 1;
  let totalDmg = 0;

  for (let h = 0; h < hits; h++) {
    let dmg;
    if (lbDef.magicDamage) {
      dmg = Math.floor(state.player.mag * lbDef.dmgMult);
    } else {
      if (lbDef.armorPierce) {
        dmg = Math.floor(state.player.atk * lbDef.dmgMult);
      } else {
        dmg = Math.floor(calcDamage(state.player.atk, state.enemy.def) * lbDef.dmgMult);
      }
    }
    // Limit break always super-crits if forceCrit
    if (lbDef.forceCrit) {
      const cm = state.player.critMult || 1.5;
      dmg = Math.floor(dmg * cm);
    }
    state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
    totalDmg += dmg;
    if (hits > 1) log.push(`  💥 Hit ${h + 1}: ${dmg} damage`);
  }
  if (hits === 1) log.push(`💥 ${lbDef.name}: ${totalDmg} damage${lbDef.magicDamage ? ' (magic)' : ''}!`);
  else log.push(`💥 Total: ${totalDmg} damage!`);

  // Self heal
  if (lbDef.selfHeal > 0) {
    const healed = Math.floor(state.player.hpMax * lbDef.selfHeal);
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + healed);
    log.push(`💚 ฟื้นฟู ${healed} HP จาก ${lbDef.name}`);
  }

  // Self damage
  if (lbDef.selfDmgPct > 0) {
    const selfDmg = Math.floor(state.player.hpMax * lbDef.selfDmgPct);
    state.player.hp = Math.max(1, state.player.hp - selfDmg);
    log.push(`🩸 เสีย ${selfDmg} HP จากพลังที่ปลดปล่อย`);
  }

  // Apply effect to enemy
  if (lbDef.effect) {
    const ef = lbDef.effect;
    state.enemy.status = state.enemy.status.filter(s => s.type !== ef.type);
    if (ef.type === 'STUN')   state.enemy.status.push({ type: 'STUN',  duration: ef.duration });
    if (ef.type === 'BURN')   state.enemy.status.push({ type: 'BURN',  duration: ef.duration, dmgPerTurn: ef.dmgPerTurn || 15 });
    if (ef.type === 'CURSE')  state.enemy.status.push({ type: 'CURSE', duration: ef.duration, dmgPerTurn: ef.dmgPerTurn || 15 });
    if (ef.type === 'MARKED') state.enemy.status.push({ type: 'MARKED',duration: ef.duration, dmgMultiplier: ef.dmgMultiplier || 1.5, defMult: 1.0 });
    log.push(`⚠️ ${state.enemy.name} ถูก ${ef.type} จาก ${lbDef.name}!`);
  }

  // Self buff
  if (lbDef.selfBuff) {
    const buff = { ...lbDef.selfBuff, appliedAt: state.turn };
    state.player.buffs = state.player.buffs || [];
    if (buff.atkMult) state.player.atk = Math.floor(state.player.atkBase * buff.atkMult);
    if (buff.defMult) state.player.def = Math.floor(state.player.defBase * buff.defMult);
    state.player.buffs.push(buff);
    log.push(`🔥 ATK พุ่งสูงสุด! +${Math.round((buff.atkMult - 1) * 100)}% (${buff.duration} เทิร์น)`);
  }

  return { success: true };
}

// ─── Pick Named Enemy Move (weighted random) ──────────────────────
function pickMove(enemy) {
  if (!enemy?.moves?.length) return null;
  const total = enemy.moves.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of enemy.moves) {
    r -= (m.weight || 1);
    if (r <= 0) return m;
  }
  return enemy.moves[0];
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
    const critRoll2   = Math.random() * 100;
    const critPct2    = (state.player.critChance || 0.1) * 100;
    const critMult2   = state.player.critMult || 1.5;
    let isCrit2 = false, isSuperCrit2 = false;
    if (critRoll2 <= critPct2 / 3)  { isSuperCrit2 = true; }
    else if (critRoll2 <= critPct2) { isCrit2 = true; }

    let dmg;
    if (skillDef.magicDamage) {
      dmg = Math.floor(state.player.mag * skillDef.damage);
    } else {
      dmg = Math.floor(calcDamage(state.player.atk, state.enemy.def) * skillDef.damage);
    }
    if (isSuperCrit2) { dmg = Math.floor(dmg * 2.2); log.push('🌟 SUPER CRIT!! ×2.2!'); }
    else if (isCrit2) { dmg = Math.floor(dmg * critMult2); log.push('💥 CRITICAL!'); }

    // Soulseer passive: +8 MP on any crit
    if ((isCrit2 || isSuperCrit2) && state.charClass === 'soulseer') {
      state.player.mp = Math.min(state.player.mpMax, state.player.mp + 8);
    }

    // ── bonusVsCC: Rogue Backstab ×4 vs stunned/slowed (existing mechanic) ──
    if (skillDef.bonusVsCC) {
      const isCC = state.enemy.status.some(s => s.type === 'STUN' || s.type === 'SLOW');
      if (isCC) { dmg = Math.floor(dmg * 4); log.push('🥷 Backstab! ×4 damage (CC target)!'); }
    }

    // ── Phase 2A: bonusVsType — Type Advantage ──
    if (skillDef.bonusVsType?.length && state.enemy.type) {
      if (skillDef.bonusVsType.includes(state.enemy.type)) {
        const typeMult = skillDef.bonusMult || 1.5;
        dmg = Math.floor(dmg * typeMult);
        const typeLabel = state.enemy.type.charAt(0).toUpperCase() + state.enemy.type.slice(1);
        log.push(`⚡ Type Advantage! vs ${typeLabel} — ×${typeMult} damage!`);
      }
    }

    // ── Phase 3G: Elemental Weakness / Resistance ──
    const elemResult = checkElementModifier(skillDef, state.enemy.type, dmg);
    if (elemResult) {
      dmg = elemResult.dmg;
      log.push(elemResult.msg);
    }

    // ── Phase 2B: Skill Synergy Combos ──
    const synergyResult = checkSynergy(skillDef.id, state.enemy.status, dmg, state.enemy.name);
    if (synergyResult) {
      dmg = synergyResult.dmg;
      log.push(synergyResult.msg);
    }

    // ── Phase 3F: Phantom Ethereal — physical skill damage -30% ──
    if (state.charClass === 'phantom' && state.etherealPlane && !skillDef.magicDamage) {
      dmg = Math.floor(dmg * 0.7);
      log.push('👻 Ethereal Plane: Physical attack power -30%');
    }

    // ── Momentum build from skills ──
    const skillMomGain = (isSuperCrit2 ? 20 : isCrit2 ? 15 : 12);
    state.momentum = Math.min(100, (state.momentum || 0) + skillMomGain);
    if (state.momentum >= 100 && !state.limitBreakReady) {
      state.limitBreakReady = true;
      log.push('⚡ LIMIT BREAK พร้อมแล้ว! กด Limit Break เพื่อปล่อยพลังสูงสุด!');
    }

    // Skills count as combo hits
    state.comboCount = (state.comboCount || 0) + 1;
    const sCombo = state.comboCount;
    if (sCombo >= 10)     { dmg = Math.floor(dmg * 1.25); }
    else if (sCombo >= 5) { dmg = Math.floor(dmg * 1.15); }
    else if (sCombo >= 3) { dmg = Math.floor(dmg * 1.05); }
    if (sCombo >= 5) log.push(`🔥 Combo ×${sCombo}!`);

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
        log.push(`❄️ ${state.enemy.name} ถูกชะลอ ATK -${Math.round((1 - ef.atkMult) * 100)}% เป็นเวลา ${ef.duration} เทิร์น!`);
      } else if (ef.type === 'POISON') {
        state.enemy.status.push({ type: 'POISON', dmgPerTurn: ef.dmgPerTurn, duration: ef.duration });
        log.push(`☠️ ${state.enemy.name} ถูกพิษ! ${ef.dmgPerTurn}/เทิร์น เป็นเวลา ${ef.duration} เทิร์น`);
      } else if (ef.type === 'BURN') {
        state.enemy.status.push({ type: 'BURN', dmgPerTurn: ef.dmgPerTurn, duration: ef.duration });
        log.push(`🔥 ${state.enemy.name} ถูกเผา! ${ef.dmgPerTurn}/เทิร์น เป็นเวลา ${ef.duration} เทิร์น`);
      } else if (ef.type === 'BLEED') {
        state.enemy.status.push({ type: 'BLEED', dmgPerTurn: ef.dmgPerTurn, duration: ef.duration });
        log.push(`🩸 ${state.enemy.name} เลือดออก! ${ef.dmgPerTurn}/เทิร์น เป็นเวลา ${ef.duration} เทิร์น`);
      } else if (ef.type === 'CURSE') {
        // Curse: deals dmgPerTurn like poison (dark/magic damage)
        state.enemy.status.push({ type: 'CURSE', dmgPerTurn: ef.dmgPerTurn || 0, duration: ef.duration });
        log.push(`💜 ${state.enemy.name} ถูกสาป! ${ef.dmgPerTurn || 0}/เทิร์น เป็นเวลา ${ef.duration} เทิร์น`);
      } else if (ef.type === 'MARKED') {
        // Marked: เพิ่ม incoming damage multiplier หรือลด DEF เมื่อถูกโจมตี
        state.enemy.status.push({
          type:          'MARKED',
          duration:      ef.duration,
          dmgMultiplier: ef.dmgMultiplier || 1.0,
          defMult:       ef.defMult       || 1.0,
        });
        log.push(`🎯 ${state.enemy.name} ถูก Mark! รับ Damage เพิ่ม ${ef.dmgMultiplier ? Math.round((ef.dmgMultiplier - 1) * 100) : 0}% เป็นเวลา ${ef.duration} เทิร์น`);
      }
    } else if (ef.type !== 'MARKED') {
      // MARKED สามารถรีเฟรชได้ แต่ status อื่นไม่ stack
      log.push(`⚠️ ${state.enemy.name} มีสถานะ ${ef.type} อยู่แล้ว`);
    } else {
      // Refresh MARKED
      state.enemy.status = state.enemy.status.filter(s => s.type !== 'MARKED');
      state.enemy.status.push({ type: 'MARKED', duration: ef.duration, dmgMultiplier: ef.dmgMultiplier || 1.0, defMult: ef.defMult || 1.0 });
      log.push(`🎯 รีเฟรช Mark บน ${state.enemy.name}!`);
    }
  }

  // ── Phase 3B: Engineer — deploy_turret skill ─────────────────────
  if (skillDef.id === 'deploy_turret' && state.charClass === 'engineer') {
    state.turret = { active: true, dmg: Math.floor(10 + (state.player.atk || 20) * 0.3), turnsLeft: 4 };
    log.push(`⚙️ Turret ติดตั้งแล้ว! ยิง ${state.turret.dmg} damage ทุก turn เป็นเวลา 4 turns`);
  }

  // ── Phase 3C: Necromancer — bone_explosion spends soul shards ─────
  if (skillDef.id === 'bone_explosion' && state.charClass === 'necromancer') {
    if ((state.soulShards || 0) >= 2) {
      state.soulShards -= 2;
      const minionDmg = Math.floor(6 + (state.player.mag || 30) * 0.15);
      state.minions = state.minions || [];
      state.minions.push({ dmg: minionDmg, turnsLeft: 5 });
      log.push(`🦴 Raise Dead! Skeleton (${minionDmg} dmg/turn, 5 turns) ถูกปลุก! (-2 Soul Shards)`);
    }
  }

  // ── Phase 3D: Rifter — rift_punch builds void charges ────────────
  if (skillDef.id === 'rift_punch' && state.charClass === 'rifter') {
    state.voidCharges = Math.min(5, (state.voidCharges || 0) + 1);
    log.push(`⚡ Void Charge! ×${state.voidCharges}`);
    if (state.voidCharges >= 5) {
      log.push('⚡ VOID CHARGED MAX! phase_assault จะระเบิดพลัง!');
    }
  }

  // ── Phase 3D: Rifter — phase_assault releases all charges ─────────
  if (skillDef.id === 'phase_assault' && state.charClass === 'rifter' && (state.voidCharges || 0) > 0) {
    const chargeDmg = state.voidCharges * 25;
    state.enemy.hp = Math.max(0, state.enemy.hp - chargeDmg);
    log.push(`💥 VOID RELEASE! ${state.voidCharges} charges × 25 = ${chargeDmg} bonus damage!!`);
    state.voidCharges = 0;
  }

  // ── Phase 3E: Bard — battle_hymn triggers song stacking ──────────
  if (skillDef.id === 'battle_hymn' && state.charClass === 'bard') {
    state.songActive = true;
    // Mark the buff so per-turn logic can detect it
    const lastBuff = (state.player.buffs || []).slice(-1)[0];
    if (lastBuff) lastBuff.isSong = true;
    log.push(`🎵 Battle Hymn! Song Stacking เริ่มต้น — ATK จะเพิ่ม +3% ต่อ turn สูงสุด ×10!`);
  }

  // ── Phase 3F: Phantom — phase_shift enters ethereal plane ────────
  if (skillDef.id === 'phase_shift' && state.charClass === 'phantom') {
    state.etherealPlane = true;
    state.etherealTurns = 2;
    log.push('👻 เข้าสู่ Ethereal Plane! รับ Physical Damage -50% เป็นเวลา 2 turns!');
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
  const label    = who === 'player' ? 'คุณ' : entity.name;
  const remaining = [];

  for (let s of entity.status) {
    // ── POISON: DoT คงที่ + ลด healing (flag healPenalty บน entity) ──
    if (s.type === 'POISON' && s.dmgPerTurn > 0) {
      entity.hp = Math.max(0, entity.hp - s.dmgPerTurn);
      entity.healPenalty = 0.7;   // healing items จะได้แค่ 70% (ต่อเทิร์น)
      log.push(`☠️ ${label} ได้รับพิษ ${s.dmgPerTurn} damage (healing -30%)`);
    }

    // ── BURN: DoT + ลด DEF -10% (บน enemy via entity.burnDefPenalty) ──
    if (s.type === 'BURN' && s.dmgPerTurn > 0) {
      entity.hp = Math.max(0, entity.hp - s.dmgPerTurn);
      entity.burnDefPenalty = true;  // ตรวจสอบใน enemy attack calc
      log.push(`🔥 ${label} ถูกเผาไหม้ ${s.dmgPerTurn} damage`);
    }

    // ── BLEED: DoT ที่เพิ่มขึ้นทุกเทิร์น (bleedStack++) ──
    if (s.type === 'BLEED') {
      s = { ...s, bleedStack: (s.bleedStack || 0) + 1 };  // stack ทุกเทิร์น
      const bleedDmg = s.dmgPerTurn + s.bleedStack - 1;   // เพิ่มขึ้นทุกเทิร์น
      entity.hp = Math.max(0, entity.hp - bleedDmg);
      log.push(`🩸 ${label} เลือดออก ${bleedDmg} damage${s.bleedStack > 1 ? ` (stack ×${s.bleedStack})` : ''}`);
    }

    // ── CURSE: DoT + random stat debuff (ใช้ครั้งแรกเท่านั้น) ──
    if (s.type === 'CURSE') {
      if (s.dmgPerTurn > 0) {
        entity.hp = Math.max(0, entity.hp - s.dmgPerTurn);
        log.push(`💜 ${label} ถูกสาป ${s.dmgPerTurn} damage`);
      }
      // Apply random stat debuff on first tick
      if (!s.curseApplied) {
        s = { ...s, curseApplied: true };
        const statRoll = Math.random();
        if (statRoll < 0.33 && entity.atk) {
          entity.atk = Math.floor(entity.atk * 0.8);
          log.push(`💜 คำสาป: ${label} ATK -20%!`);
        } else if (statRoll < 0.66 && entity.def !== undefined) {
          entity.def = Math.floor(entity.def * 0.8);
          log.push(`💜 คำสาป: ${label} DEF -20%!`);
        } else if (entity.spd !== undefined) {
          entity.spd = Math.floor((entity.spd || 10) * 0.8);
          log.push(`💜 คำสาป: ${label} SPD -20%!`);
        }
      }
    }

    // ── STUN/SLOW/MARKED: ไม่มีผล per-turn damage — จัดการใน caller ──

    if (s.duration > 1) remaining.push({ ...s, duration: s.duration - 1 });
    else if (s.duration === 1) {
      // Clear penalty flags on expiry
      if (s.type === 'POISON')  entity.healPenalty    = 1.0;
      if (s.type === 'BURN')    entity.burnDefPenalty = false;
      log.push(`✨ ${label} หาย ${s.type}`);
    }
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
      updates.xpToNext = Math.floor(200 * Math.pow(newLevel, 1.9)); // lv50≈9เดือน, lv99≈2ปี
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
    comboCount:       state.comboCount || 0,
    momentum:         Math.min(100, state.momentum || 0),
    limitBreakReady:  state.limitBreakReady || false,
    // Phase 3: class resources
    rageStacks:       state.rageStacks,
    frenzying:        state.frenzying,
    turret:           state.turret ? { dmg: state.turret.dmg, turnsLeft: state.turret.turnsLeft } : null,
    soulShards:       state.soulShards,
    minions:          state.minions ? state.minions.map(m => ({ dmg: m.dmg, turnsLeft: m.turnsLeft })) : null,
    voidCharges:      state.voidCharges,
    // Phase 3E: Bard song stacking
    songStacks:       state.songStacks,
    songActive:       state.songActive,
    // Phase 3F: Phantom ethereal plane
    etherealPlane:    state.etherealPlane,
    etherealTurns:    state.etherealTurns,
    telegraphMove:  state.telegraphMove ? {
      name:        state.telegraphMove.name,
      emoji:       state.telegraphMove.emoji || '⚠️',
      telegraphed: true,
    } : null,
    player: {
      hp:         state.player.hp,
      hpMax:      state.player.hpMax,
      mp:         state.player.mp,
      mpMax:      state.player.mpMax,
      atk:        state.player.atk,
      def:        state.player.def,
      critChance: state.player.critChance,
      critMult:   state.player.critMult || 1.5,
      isGuarding: state.player.isGuarding || false,
      status:     state.player.status,
      buffs:      (state.player.buffs || []).map(b => ({
        type:     b.atkMult ? 'ATK_BUFF' : b.critBonus ? 'CRIT_BUFF' : 'BUFF',
        duration: b.duration,
      })),
    },
    enemy: {
      monsterId:    state.enemy.monsterId,
      name:         state.enemy.name,
      emoji:        state.enemy.emoji,
      desc:         state.enemy.desc,
      type:         state.enemy.type || 'unknown',
      hp:           state.enemy.hp,
      hpMax:        state.enemy.hpMax,
      status:       state.enemy.status,
      // Phase 2D: counter state indicators for frontend
      shieldPhase:  state.enemy.shieldPhase ? { turnsLeft: state.enemy.shieldPhase.turnsLeft } : null,
      evasionPhase: state.enemy.evasionPhase ? { turnsLeft: state.enemy.evasionPhase.turnsLeft, dodgeRate: state.enemy.evasionPhase.dodgeRate } : null,
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
