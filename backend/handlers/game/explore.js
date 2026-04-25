// handlers/game/explore.js — Zone exploration
const admin = require('firebase-admin');
const { getZone, getExploreEvent } = require('../../data/maps');
const { getItem, rollItem }        = require('../../data/items');
const { addGold }                  = require('./currency');

const STAMINA_COST = 20; // ต่อ exploration action (ใหม่: max 200, regen ช้า)
const { trackQuestProgress }  = require('./quests');
const { trackStoryStep }      = require('./quest_engine');
const { trackWeeklyProgress } = require('./weeklyQuests');
const { checkAchievements }   = require('./achievements');

// ===== Explore action =====
async function explore(req, res) {
  const { zone = 'town_outskirts' } = req.body;
  const uid = req.user.uid;

  const zoneDef = getZone(zone);
  if (!zoneDef || !zoneDef.canExplore) {
    return res.status(400).json({ error: 'ไม่สามารถ explore zone นี้ได้' });
  }

  const db = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    const char    = charDoc.data();

    // ตรวจ level requirement
    const [minLv, maxLv] = zoneDef.level;
    if (char.level < minLv) {
      return res.status(400).json({ error: `ต้องการ Level ${minLv} ขึ้นไปเพื่อเข้า ${zoneDef.nameTH}` });
    }

    // ตรวจ Stamina
    if (char.stamina < STAMINA_COST) {
      return res.status(400).json({ error: `Stamina ไม่พอ (${char.stamina}/${STAMINA_COST}) รอ regen หรือกด Rest` });
    }

    // สุ่ม event
    const event = getExploreEvent(zone);
    if (!event) return res.status(500).json({ error: 'ไม่พบ event' });

    const { result } = event;
    const response = {
      zone,
      zoneName:   zoneDef.nameTH,
      atmosphere: zoneDef.atmosphere[Math.floor(Math.random() * zoneDef.atmosphere.length)],
      eventType:  result.type,
      msg:        result.msg,
      items:      [],
      gold:       0,
      encounter:  null,
      stamina:    char.stamina - STAMINA_COST,
      staminaMax: char.staminaMax,
    };

    const updates = {
      stamina:          char.stamina - STAMINA_COST,
      lastActiveAt:     admin.firestore.FieldValue.serverTimestamp(),
      explorationCount: admin.firestore.FieldValue.increment(1),
    };

    // Process event
    if (result.type === 'item') {
      const itemIds = result.items || [];
      for (const itemId of itemIds) {
        const instance = rollItem(itemId);
        if (instance) {
          await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
          const def = getItem(itemId);
          response.items.push({ itemId, name: def?.name || itemId, emoji: def?.emoji || '📦' });
        }
      }
    } else if (result.type === 'gold') {
      const [minG, maxG] = result.gold;
      const gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
      if (gold > 0) {
        await addGold(uid, gold, 'explore_drop');
        response.gold = gold;
      }
    } else if (result.type === 'encounter') {
      // บอกแค่ว่าจะเจอมอนสเตอร์ — client ต้อง call /api/game/battle/start
      const monsters = zoneDef.monsters || [];
      const monsterId = monsters[Math.floor(Math.random() * monsters.length)];
      response.encounter = { zone, monsterId };
      response.msg = result.msg;
    }

    await charRef.update(updates);

    // Add small XP for exploring
    await charRef.update({ xp: admin.firestore.FieldValue.increment(2) });

    // Track daily quest
    trackQuestProgress(uid, 'explore', 1).catch(() => {});
    // Track story/side quest step — explore event
    trackStoryStep(uid, 'explore', { zone }).catch(() => {});
    // Track weekly quest progress
    trackWeeklyProgress(uid, 'explore', 1).catch(() => {});
    checkAchievements(uid, 'explore', 1).catch(() => {});

    return res.json(response);
  } catch (err) {
    console.error('[Explore] explore:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Travel to zone =====
async function travel(req, res) {
  const { zone } = req.body;
  const uid = req.user.uid;

  const zoneDef = getZone(zone);
  if (!zoneDef) return res.status(400).json({ error: 'Zone ไม่พบ' });

  const db = admin.firestore();
  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    const charId     = accountDoc.data()?.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    await db.collection('game_characters').doc(charId).update({ location: zone });

    // Track story/side quest step — travel event
    trackStoryStep(uid, 'travel', { zone }).catch(() => {});

    return res.json({
      success:   true,
      zone,
      zoneName:  zoneDef.nameTH,
      atmosphere: zoneDef.atmosphere[Math.floor(Math.random() * zoneDef.atmosphere.length)],
      icon:      zoneDef.icon,
    });
  } catch (err) {
    console.error('[Explore] travel:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { explore, travel };
