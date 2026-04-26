// handlers/game/explore.js — Zone exploration
const admin = require('firebase-admin');
const { getZone, getExploreEvent } = require('../../data/maps');
const { getItem, rollItem }        = require('../../data/items');
const { addGold }                  = require('./currency');
const { logReward }                = require('../../utils/anticheat');

const STAMINA_COST        = 20;
const EXPLORE_COOLDOWN_MS = 3000; // 3 วินาที

const { trackQuestProgress }              = require("./quests");
const { trackStoryStep, trackMainQuestStep } = require("./quest_engine");
const { trackWeeklyProgress } = require('./weeklyQuests');
const { checkAchievements }   = require('./achievements');

// ── In-memory cooldown (set ก่อน await ใดๆ — ป้องกัน race condition) ─────────
const _exploreCooldown = new Map(); // uid → lastMs
setInterval(() => {
  const cutoff = Date.now() - EXPLORE_COOLDOWN_MS * 5;
  for (const [k, v] of _exploreCooldown.entries()) {
    if (v < cutoff) _exploreCooldown.delete(k);
  }
}, 60_000);

// ===== Explore action =====
async function explore(req, res) {
  const { zone = 'town_outskirts' } = req.body;
  const uid = req.user.uid;

  // ── 1. In-memory cooldown SEBELUM await apapun ────────────────────────────
  // Node.js single-threaded: เซ็ตก่อน await → request ถัดไปเห็น lock ทันที
  const lastExplore = _exploreCooldown.get(uid) || 0;
  const elapsed     = Date.now() - lastExplore;
  if (elapsed < EXPLORE_COOLDOWN_MS) {
    const wait = Math.ceil((EXPLORE_COOLDOWN_MS - elapsed) / 1000);
    return res.status(429).json({ error: `รอ ${wait} วินาทีก่อน explore ใหม่` });
  }
  _exploreCooldown.set(uid, Date.now()); // ← lock ก่อน await

  // ── 2. Validate zone ───────────────────────────────────────────────────────
  const zoneDef = getZone(zone);
  if (!zoneDef || !zoneDef.canExplore) {
    _exploreCooldown.delete(uid); // คืน cooldown ถ้า input ผิด
    return res.status(400).json({ error: 'ไม่สามารถ explore zone นี้ได้' });
  }

  const db = admin.firestore();

  try {
    // ── 3. โหลด account → charId ──────────────────────────────────────────
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);

    // ── 4. Transaction: ตรวจ + หัก stamina แบบ atomic ────────────────────
    let charSnapshot;
    await db.runTransaction(async (t) => {
      const charDoc = await t.get(charRef);
      if (!charDoc.exists) throw new Error('Character ไม่พบ');
      const char = charDoc.data();

      // ตรวจ level requirement
      const [minLv] = zoneDef.level;
      if (char.level < minLv) {
        throw Object.assign(new Error(`ต้องการ Level ${minLv} ขึ้นไป`), { status: 400 });
      }

      // ตรวจ stamina
      if ((char.stamina || 0) < STAMINA_COST) {
        throw Object.assign(
          new Error(`Stamina ไม่พอ (${char.stamina}/${STAMINA_COST}) รอ regen หรือกด Rest`),
          { status: 400 }
        );
      }

      // หัก stamina + stamp timestamp แบบ atomic
      t.update(charRef, {
        stamina:          char.stamina - STAMINA_COST,
        lastActiveAt:     admin.firestore.FieldValue.serverTimestamp(),
        lastExploreAt:    admin.firestore.FieldValue.serverTimestamp(),
        explorationCount: admin.firestore.FieldValue.increment(1),
      });

      charSnapshot = char; // ส่งออกมาใช้นอก transaction
    });

    const char = charSnapshot;

    // ── 5. สุ่ม event ─────────────────────────────────────────────────────
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

    // ── 6. Process event ──────────────────────────────────────────────────
    if (result.type === 'item') {
      for (const itemId of (result.items || [])) {
        // Exploration drops: mostly normal quality, rare fine/superior
        const instance = rollItem(itemId, { normal: 74, fine: 20, superior: 5, masterwork: 1 });
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
      const monsters  = zoneDef.monsters || [];
      const monsterId = monsters[Math.floor(Math.random() * monsters.length)];
      response.encounter = { zone, monsterId };
      response.msg = result.msg;
    }

    // Add small XP
    await charRef.update({ xp: admin.firestore.FieldValue.increment(2) });

    // ── 7. Quest + achievement tracking ──────────────────────────────────
    trackQuestProgress(uid, 'explore', 1).catch(() => {});
    trackStoryStep(uid, 'explore', { zone }).catch(() => {});
    trackMainQuestStep(uid, 'explore', { zone }).catch(() => {});
    trackWeeklyProgress(uid, 'explore', 1).catch(() => {});
    checkAchievements(uid, 'explore', 1).catch(() => {});

    // ── 8. Anti-cheat log ─────────────────────────────────────────────────
    logReward(uid, 'explore', {
      xp:    2,
      gold:  response.gold,
      items: response.items.map(i => i.itemId),
    }).catch(() => {});

    return res.json(response);

  } catch (err) {
    // ถ้า transaction throw ด้วย status ที่กำหนด ส่ง error นั้นกลับไป
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
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
    trackStoryStep(uid, 'travel', { zone }).catch(() => {});
    trackMainQuestStep(uid, 'travel', { zone }).catch(() => {});

    return res.json({
      success:    true,
      zone,
      zoneName:   zoneDef.nameTH,
      atmosphere: zoneDef.atmosphere[Math.floor(Math.random() * zoneDef.atmosphere.length)],
      icon:       zoneDef.icon,
    });
  } catch (err) {
    console.error('[Explore] travel:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { explore, travel };
