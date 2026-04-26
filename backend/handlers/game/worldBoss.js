// handlers/game/worldBoss.js — Community World Boss event system
// GET  /api/game/world-boss          — ดูสถานะ Boss ปัจจุบัน
// POST /api/game/world-boss/attack   — โจมตี Boss (1 ครั้ง / 5 นาที)
// POST /api/game/world-boss/spawn    — spawn Boss (VJ trigger ด้วยมือ, auth required)

const admin = require('firebase-admin');
const { getRandomBoss, getBoss } = require('../../data/world_bosses');
const { pushGameEvent } = require('./achievements');
const { broadcastAll } = require('../../lib/emitter');

const BOSS_DOC = 'current'; // game_world_boss/current

// ===== GET Boss status =====
async function getWorldBossStatus(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const bossDoc = await db.collection('game_world_boss').doc(BOSS_DOC).get();
    if (!bossDoc.exists || bossDoc.data().status !== 'active') {
      return res.json({ active: false, boss: null });
    }

    const boss = bossDoc.data();
    const now  = Date.now();

    // เช็ค timeout
    if (now > boss.expiresAt) {
      await db.collection('game_world_boss').doc(BOSS_DOC).update({ status: 'expired' });
      return res.json({ active: false, boss: null, expired: true });
    }

    // ตรวจว่า player นี้ attack ล่าสุดเมื่อไหร่
    const lastAttack = boss.attackLog?.[uid]?.lastAttack || 0;
    const cooldown   = Math.max(0, Math.ceil((lastAttack + 5 * 60 * 1000 - now) / 1000)); // 5 นาที

    // Top damage players
    const attackLog = boss.attackLog || {};
    const topPlayers = Object.entries(attackLog)
      .map(([id, v]) => ({ uid: id, name: v.name || '???', damage: v.totalDamage || 0 }))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 5);

    return res.json({
      active: true,
      boss: {
        bossId:    boss.bossId,
        name:      boss.name,
        nameTH:    boss.nameTH,
        emoji:     boss.emoji,
        desc:      boss.desc,
        hp:        boss.currentHp,
        hpMax:     boss.maxHp,
        hpPct:     Math.round((boss.currentHp / boss.maxHp) * 100),
        expiresAt: boss.expiresAt,
        timeLeft:  Math.max(0, Math.round((boss.expiresAt - now) / 1000)),
        spawnedAt: boss.spawnedAt,
      },
      myDamage:   attackLog[uid]?.totalDamage || 0,
      myAttacks:  attackLog[uid]?.attacks     || 0,
      cooldown,               // วินาทีที่เหลือก่อน attack ได้อีก
      topPlayers,
    });
  } catch (err) {
    console.error('[WorldBoss] getStatus:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== POST Attack Boss =====
async function attackWorldBoss(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  const now = Date.now();

  try {
    const bossRef = db.collection('game_world_boss').doc(BOSS_DOC);
    const bossDoc = await bossRef.get();

    if (!bossDoc.exists || bossDoc.data().status !== 'active') {
      return res.status(400).json({ error: 'ไม่มี World Boss ตอนนี้' });
    }

    const boss = bossDoc.data();
    if (now > boss.expiresAt) {
      await bossRef.update({ status: 'expired' });
      return res.status(400).json({ error: 'World Boss หมดเวลาแล้ว' });
    }

    // Cooldown check (5 min)
    const lastAttack = boss.attackLog?.[uid]?.lastAttack || 0;
    const cooldownMs = 5 * 60 * 1000;
    if (now - lastAttack < cooldownMs) {
      const secsLeft = Math.ceil((lastAttack + cooldownMs - now) / 1000);
      return res.status(429).json({ error: `รอ ${secsLeft} วินาทีก่อน attack ได้อีก` });
    }

    // Get player's character for damage calc
    const acctDoc = await db.collection('game_accounts').doc(uid).get();
    const charId  = acctDoc.data()?.characterId;
    const charDoc = charId ? await db.collection('game_characters').doc(charId).get() : null;
    const char    = charDoc?.data() || {};

    // Damage = player ATK + MAG + level bonus, ±30% variance
    const base   = (char.atk || 20) + (char.mag || 0) + (char.level || 1) * 5;
    const dmg    = Math.round(base * (0.7 + Math.random() * 0.6));
    const actualDmg = Math.min(dmg, boss.currentHp);

    const prevDmg   = boss.attackLog?.[uid]?.totalDamage || 0;
    const prevAtks  = boss.attackLog?.[uid]?.attacks     || 0;
    const charName  = char.name || 'Unknown';

    const newHp = boss.currentHp - actualDmg;
    const killed = newHp <= 0;

    if (!killed) {
      // Update HP + attack log
      await bossRef.update({
        currentHp: newHp,
        [`attackLog.${uid}.lastAttack`]:  now,
        [`attackLog.${uid}.totalDamage`]: prevDmg + actualDmg,
        [`attackLog.${uid}.attacks`]:     prevAtks + 1,
        [`attackLog.${uid}.name`]:        charName,
      });

      // Real-time broadcast: push damage event so frontend can poll/listen
      const updatedLog = { ...(boss.attackLog || {}), [uid]: { name: charName, totalDamage: prevDmg + actualDmg, attacks: prevAtks + 1 } };
      const liveTopPlayers = Object.entries(updatedLog)
        .map(([id, v]) => ({ uid: id, name: v.name || '???', damage: v.totalDamage || 0 }))
        .sort((a, b) => b.damage - a.damage)
        .slice(0, 5);
      db.collection('game_global_events').add({
        type:       'world_boss_damage',
        bossId:     boss.bossId,
        bossHp:     newHp,
        bossHpMax:  boss.maxHp,
        attacker:   charName,
        attackerUid: uid,
        damage:     actualDmg,
        topPlayers: liveTopPlayers,
        ts:         now,
      }).catch(() => {});

      // Real-time socket broadcast → all connected clients update HP live
      broadcastAll('world_boss_update', {
        bossId:     boss.bossId,
        bossHp:     newHp,
        bossHpMax:  boss.maxHp,
        attacker:   charName,
        damage:     actualDmg,
        topPlayers: liveTopPlayers,
      });

      // Random boss counter-attack message
      const bossData = getBoss(boss.bossId);
      const counterMsg = bossData?.attackMsgs[Math.floor(Math.random() * bossData.attackMsgs.length)] || '';

      return res.json({
        success:  true,
        killed:   false,
        damage:   actualDmg,
        bossHp:   newHp,
        bossHpMax: boss.maxHp,
        counterMsg,
        topPlayers: liveTopPlayers,
        msg: `⚔️ คุณโจมตี ${boss.nameTH} เสียหาย ${actualDmg} HP! (HP เหลือ ${newHp.toLocaleString()}/${boss.maxHp.toLocaleString()})`,
      });
    }

    // ===== BOSS KILLED =====
    const attackLog = { ...boss.attackLog };
    attackLog[uid] = {
      ...attackLog[uid],
      lastAttack:  now,
      totalDamage: prevDmg + actualDmg,
      attacks:     prevAtks + 1,
      name:        charName,
    };

    // Sort by damage for rewards
    const sorted = Object.entries(attackLog)
      .map(([id, v]) => ({ uid: id, name: v.name, damage: v.totalDamage || 0 }))
      .sort((a, b) => b.damage - a.damage);

    await bossRef.update({ currentHp: 0, status: 'dead', killedAt: now, attackLog });

    // Real-time broadcast: boss death event
    db.collection('game_global_events').add({
      type:        'world_boss_killed',
      bossId:      boss.bossId,
      bossName:    boss.nameTH,
      emoji:       boss.emoji,
      killedBy:    charName,
      killedByUid: uid,
      topPlayers:  sorted.slice(0, 5),
      ts:          now,
    }).catch(() => {});

    broadcastAll('world_boss_killed', {
      bossId:   boss.bossId,
      bossName: boss.nameTH,
      emoji:    boss.emoji,
      killedBy: charName,
      topPlayers: sorted.slice(0, 5),
    });

    // Grant rewards
    const bossData = getBoss(boss.bossId);
    const rewards  = bossData?.rewards || {};
    const batch    = db.batch();

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      let reward = rewards.participation || { gold: 500, xp: 300, items: [] };
      if (i === 0) reward = rewards.first || reward;
      else if (i < 3) reward = rewards.top3 || reward;

      const pAcctRef = db.collection('game_accounts').doc(p.uid);
      batch.update(pAcctRef, { gold: admin.firestore.FieldValue.increment(reward.gold) });

      // Push event to each participant
      pushGameEvent(p.uid, {
        type: 'achievement',
        msg: `🏆 World Boss ${boss.nameTH} ถูกสังหาร! คุณได้รับ +${reward.gold}G, +${reward.xp} XP!`,
        ts: now,
      }).catch(() => {});

      // Grant items (just for top 3 + first)
      for (const itemId of (reward.items || [])) {
        const invRef = db.collection('game_inventory').doc();
        batch.set(invRef, {
          uid: p.uid, itemId,
          instanceId: `boss_${now}_${p.uid}_${Math.random().toString(36).slice(2)}`,
          enhancement: 0, equipped: false,
          obtainedAt: now, source: 'world_boss',
        });
      }

      // Grant title if first place and there's a title reward
      if (i === 0 && reward.title) {
        const pCharSnap = await db.collection('game_accounts').doc(p.uid).get();
        const pCharId   = pCharSnap.data()?.characterId;
        if (pCharId) {
          batch.update(db.collection('game_characters').doc(pCharId), { title: reward.title });
        }
      }
    }

    await batch.commit();

    // Find my reward
    const myRank = sorted.findIndex(p => p.uid === uid);
    let myReward = rewards.participation || { gold: 500, xp: 300 };
    if (myRank === 0) myReward = rewards.first || myReward;
    else if (myRank < 3) myReward = rewards.top3 || myReward;

    return res.json({
      success:     true,
      killed:      true,
      damage:      actualDmg,
      totalPlayers: sorted.length,
      myRank:      myRank + 1,
      myReward,
      topPlayers:  sorted.slice(0, 3),
      msg: `💀 ${boss.nameTH} ถูกสังหารแล้ว! คุณได้รับ ${myReward.gold}G! (อันดับ ${myRank + 1}/${sorted.length})`,
    });
  } catch (err) {
    console.error('[WorldBoss] attack:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== POST Spawn Boss (VJ trigger) =====
async function spawnWorldBoss(req, res) {
  const db  = admin.firestore();
  const now = Date.now();

  try {
    // Check if boss already active
    const existing = await db.collection('game_world_boss').doc(BOSS_DOC).get();
    if (existing.exists && existing.data().status === 'active' && now < existing.data().expiresAt) {
      return res.status(400).json({ error: 'มี World Boss อยู่แล้ว' });
    }

    const bossTemplate = req.body.bossId ? getBoss(req.body.bossId) : getRandomBoss();
    if (!bossTemplate) return res.status(400).json({ error: 'Boss ไม่พบ' });

    const bossData = {
      ...bossTemplate,
      currentHp: bossTemplate.hp,
      maxHp:     bossTemplate.hp,
      status:    'active',
      spawnedAt: now,
      expiresAt: now + bossTemplate.timeLimit * 60 * 1000,
      attackLog: {},
      spawnReason: req.body.reason || 'manual',
    };

    await db.collection('game_world_boss').doc(BOSS_DOC).set(bossData);

    // Broadcast spawn event to all online players (via game_events collection)
    await db.collection('game_global_events').add({
      type:      'world_boss_spawn',
      bossId:    bossTemplate.bossId,
      bossName:  bossTemplate.nameTH,
      emoji:     bossTemplate.emoji,
      msg:       bossTemplate.spawnMsg,
      hp:        bossTemplate.hp,
      expiresAt: bossData.expiresAt,
      ts:        now,
    });

    console.log(`[WorldBoss] Spawned: ${bossTemplate.bossId}`);
    return res.json({
      success:  true,
      boss:     bossTemplate,
      expiresAt: bossData.expiresAt,
      msg: bossTemplate.spawnMsg,
    });
  } catch (err) {
    console.error('[WorldBoss] spawn:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Export for TikTok gift trigger =====
async function triggerBossFromGift(giftCount) {
  // Called from tiktokCurrency.js when cumulative gifts hit threshold
  const db  = admin.firestore();
  const now = Date.now();

  const existing = await db.collection('game_world_boss').doc(BOSS_DOC).get();
  if (existing.exists && existing.data().status === 'active' && now < existing.data().expiresAt) {
    return; // Boss already active
  }

  const bossTemplate = getRandomBoss();
  const bossData = {
    ...bossTemplate,
    currentHp:   bossTemplate.hp,
    maxHp:       bossTemplate.hp,
    status:      'active',
    spawnedAt:   now,
    expiresAt:   now + bossTemplate.timeLimit * 60 * 1000,
    attackLog:   {},
    spawnReason: `gifts:${giftCount}`,
  };

  await db.collection('game_world_boss').doc(BOSS_DOC).set(bossData);
  await db.collection('game_global_events').add({
    type: 'world_boss_spawn', bossId: bossTemplate.bossId,
    bossName: bossTemplate.nameTH, emoji: bossTemplate.emoji,
    msg: bossTemplate.spawnMsg, hp: bossTemplate.hp,
    expiresAt: bossData.expiresAt, ts: now,
  });

  console.log(`[WorldBoss] Gift-triggered spawn: ${bossTemplate.bossId} (gifts: ${giftCount})`);
}

module.exports = { getWorldBossStatus, attackWorldBoss, spawnWorldBoss, triggerBossFromGift };
