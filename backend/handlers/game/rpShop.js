// handlers/game/rpShop.js — Realm Points shop handler
const admin = require('firebase-admin');
const { RP_SHOP_ITEMS, getRPShopItem } = require('../../data/rp_shop');
const { getItem, rollItem } = require('../../data/items');
const { getClassSkills } = require('../../data/skills');

// ===== GET shop catalog =====
async function getRPShop(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    // Load player's purchased one-time items
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const data    = accountDoc.data();
    const rp      = data.realmPoints || 0;
    const bought  = data.rpOneTimePurchases || [];
    const unlocked = data.unlockedRaces || ['human'];

    const resurrectionStones  = data.resurrectionStones || 0;
    const inventoryExpansions = data.rpInventoryExpands || 0;

    const items = RP_SHOP_ITEMS.map(item => {
      let capped = false;
      // Resurrection Stone ไม่จำกัด — เฉพาะ inventory_expand เท่านั้นที่มี cap
      if (item.effect?.type === 'inventory_expand') capped = inventoryExpansions >= (item.maxOwn || 3);
      return {
        id:          item.id,
        name:        item.name,
        desc:        item.desc,
        category:    item.category,
        rpPrice:     item.rpPrice,
        emoji:       item.emoji,
        oneTime:     item.oneTime || false,
        alreadyBought: item.oneTime ? bought.includes(item.id) : false,
        capped,
        maxOwn:      item.maxOwn || null,
        canAfford:   rp >= item.rpPrice,
        // extra info for client
        ...(item.effect?.type === 'resurrection_stone' ? { currentOwned: resurrectionStones } : {}),
        ...(item.effect?.type === 'inventory_expand'   ? { currentOwned: inventoryExpansions } : {}),
      };
    });

    return res.json({
      items,
      rp,
      pendingSkillReset: data.pendingSkillReset || false,
      pendingStatReset:  data.pendingStatReset  || false,
      resurrectionStones: data.resurrectionStones || 0,
    });
  } catch (err) {
    console.error('[RPShop] getRPShop:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== BUY RP shop item =====
async function buyRPItem(req, res) {
  const { itemId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  const shopItem = getRPShopItem(itemId);
  if (!shopItem) return res.status(404).json({ error: 'ไม่พบสินค้า' });

  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const data    = accountDoc.data();
    const rp      = data.realmPoints || 0;
    const bought  = data.rpOneTimePurchases || [];

    // Check one-time
    if (shopItem.oneTime && bought.includes(itemId)) {
      return res.status(400).json({ error: 'คุณซื้อสินค้านี้ไปแล้ว' });
    }

    // Check balance
    if (rp < shopItem.rpPrice) {
      return res.status(400).json({ error: `RP ไม่พอ (มี ${rp}, ต้องการ ${shopItem.rpPrice})` });
    }

    // Deduct RP
    const updates = {
      realmPoints: admin.firestore.FieldValue.increment(-shopItem.rpPrice),
    };

    // Mark one-time purchase
    if (shopItem.oneTime) {
      updates.rpOneTimePurchases = admin.firestore.FieldValue.arrayUnion(itemId);
    }

    const granted = [];

    // ── Race unlock ──
    if (shopItem.category === 'race_unlock' && shopItem.raceId) {
      updates.unlockedRaces = admin.firestore.FieldValue.arrayUnion(shopItem.raceId);
      granted.push({ type: 'race', raceId: shopItem.raceId, name: shopItem.name });
    }

    // ── Title unlock ──
    if (shopItem.category === 'cosmetic' && shopItem.titleId) {
      updates.unlockedTitles = admin.firestore.FieldValue.arrayUnion(shopItem.titleId);
      granted.push({ type: 'title', titleId: shopItem.titleId, name: shopItem.name });
    }

    // Apply account-level updates first
    await accountRef.update(updates);

    // ── Bundle items ──
    if (shopItem.bundle) {
      for (const entry of shopItem.bundle) {
        for (let i = 0; i < (entry.qty || 1); i++) {
          const instance = rollItem(entry.itemId);
          if (instance) {
            await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
            const def = getItem(entry.itemId);
            granted.push({ type: 'item', itemId: entry.itemId, name: def?.name || entry.itemId, emoji: def?.emoji || '📦' });
          }
        }
      }
    }

    // ── Single item ──
    if (shopItem.itemId && !shopItem.bundle) {
      const qty = shopItem.qty || 1;
      for (let i = 0; i < qty; i++) {
        const instance = rollItem(shopItem.itemId);
        if (instance) {
          await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}_${i}`).set({ uid, ...instance });
          const def = getItem(shopItem.itemId);
          granted.push({ type: 'item', itemId: shopItem.itemId, name: def?.name || shopItem.itemId, emoji: def?.emoji || '📦' });
        }
      }
    }

    // ── Random pool box ──
    if (shopItem.pool && shopItem.pool.length > 0) {
      const poolItemId = shopItem.pool[Math.floor(Math.random() * shopItem.pool.length)];
      const instance = rollItem(poolItemId);
      if (instance) {
        await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
        const def = getItem(poolItemId);
        granted.push({ type: 'item', itemId: poolItemId, name: def?.name || poolItemId, emoji: def?.emoji || '📦', fromBox: true });
      }
    }

    // ── Effect items ──
    if (shopItem.effect) {
      const ef = shopItem.effect;

      if (ef.type === 'xp_boost') {
        // Write timed boost to game_accounts
        await accountRef.set({
          activeBoosts: {
            xp_boost: {
              multiplier: ef.multiplier || 2,
              expiresAt:  Date.now() + (ef.durationMs || 3600000),
            },
          },
        }, { merge: true });
        granted.push({ type: 'boost', boostType: 'xp_boost', multiplier: ef.multiplier || 2, durationMs: ef.durationMs, name: shopItem.name });

      } else if (ef.type === 'gold_boost') {
        await accountRef.set({
          activeBoosts: {
            gold_boost: {
              multiplier: ef.multiplier || 2,
              expiresAt:  Date.now() + (ef.durationMs || 1800000),
            },
          },
        }, { merge: true });
        granted.push({ type: 'boost', boostType: 'gold_boost', multiplier: ef.multiplier || 2, durationMs: ef.durationMs, name: shopItem.name });

      } else if (ef.type === 'inventory_expand') {
        // Check maxOwn: count how many times already bought
        const timesOwned = (data.rpInventoryExpands || 0);
        if (shopItem.maxOwn && timesOwned >= shopItem.maxOwn) {
          return res.status(400).json({ error: `ซื้อได้สูงสุด ${shopItem.maxOwn} ครั้ง` });
        }
        const charId = data.characterId;
        if (charId) {
          await db.collection('game_characters').doc(charId).update({
            inventorySlots: admin.firestore.FieldValue.increment(ef.amount || 10),
          });
        }
        await accountRef.set({ rpInventoryExpands: admin.firestore.FieldValue.increment(1) }, { merge: true });
        granted.push({ type: 'upgrade', upgradeType: 'inventory_expand', amount: ef.amount || 10, name: shopItem.name });

      } else if (ef.type === 'resurrection_stone') {
        // ไม่จำกัดจำนวน — ซื้อกี่ก้อนก็ได้
        const currentStones = data.resurrectionStones || 0;
        await accountRef.set({ resurrectionStones: admin.firestore.FieldValue.increment(1) }, { merge: true });
        granted.push({ type: 'consumable', consumableType: 'resurrection_stone', newCount: currentStones + 1, name: shopItem.name });

      } else if (ef.type === 'stamina_refill') {
        // เติม stamina เต็ม
        const charId = data.characterId;
        if (charId) {
          const charDoc = await db.collection('game_characters').doc(charId).get();
          if (charDoc.exists) {
            const staminaMax = charDoc.data().staminaMax || 100;
            await db.collection('game_characters').doc(charId).update({ stamina: staminaMax });
          }
        }
        granted.push({ type: 'consumable', consumableType: 'stamina_refill', name: shopItem.name });

      } else if (ef.type === 'dungeon_key') {
        // เพิ่ม extra dungeon attempt 1 ครั้ง
        await accountRef.set({ extraDungeonKeys: admin.firestore.FieldValue.increment(1) }, { merge: true });
        granted.push({ type: 'consumable', consumableType: 'dungeon_key', name: shopItem.name });

      } else if (ef.type === 'vip_7days') {
        const expiresAt = Date.now() + (ef.durationMs || 7 * 24 * 3600000);
        await accountRef.set({
          activeBoosts: {
            vip: {
              expBonus:     0.10,
              goldBonus:    0.10,
              staminaRegen: 2,
              expiresAt,
            },
          },
        }, { merge: true });
        granted.push({ type: 'boost', boostType: 'vip', durationMs: ef.durationMs, name: shopItem.name });

      } else if (ef.type === 'skill_reset') {
        // คืน SP ทั้งหมดที่ใช้ไป (pending token — ทำใน executeSkillReset endpoint)
        await accountRef.set({ pendingSkillReset: true }, { merge: true });
        granted.push({ type: 'service', serviceType: 'skill_reset', name: shopItem.name });

      } else if (ef.type === 'stat_reset') {
        // คืน stat points ทั้งหมด (pending token — ทำใน executeStatReset endpoint)
        await accountRef.set({ pendingStatReset: true }, { merge: true });
        granted.push({ type: 'service', serviceType: 'stat_reset', name: shopItem.name });

      } else if (ef.type === 'profile_frame') {
        await accountRef.set({ profileFrame: ef.frameId || 'ashenveil_flame' }, { merge: true });
        granted.push({ type: 'cosmetic', cosmeticType: 'profile_frame', frameId: ef.frameId, name: shopItem.name });

      } else if (ef.type === 'class_change') {
        // Grant a token — frontend will trigger actual class change flow
        await accountRef.set({ pendingClassChange: true }, { merge: true });
        granted.push({ type: 'service', serviceType: 'class_change', name: shopItem.name });

      } else if (ef.type === 'name_change') {
        await accountRef.set({ pendingNameChange: true }, { merge: true });
        granted.push({ type: 'service', serviceType: 'name_change', name: shopItem.name });
      }
    }

    console.log(`[RPShop] ✅ uid=${uid} bought ${itemId} for ${shopItem.rpPrice} RP`);
    return res.json({
      success: true,
      rpSpent: shopItem.rpPrice,
      newRP:   rp - shopItem.rpPrice,
      granted,
      msg: `ซื้อ ${shopItem.name} สำเร็จ!`,
    });
  } catch (err) {
    console.error('[RPShop] buyRPItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Execute Class Change (use pendingClassChange token) =====
async function executeClassChange(req, res) {
  const { newClass } = req.body;
  const uid = req.user.uid;
  // All 21 valid classes (must match CLASSES_BY_RACE in account.js, lowercase)
  const VALID_CLASSES = [
    'warrior','rogue','cleric',           // HUMAN
    'ranger','mage','bard',               // ELVEN
    'berserker','engineer','runesmith',   // DWARF
    'assassin','hexblade','phantom',      // SHADE
    'deathknight','necromancer','gravecaller', // REVENANT
    'voidwalker','rifter','soulseer',     // VOIDBORN
    'wildguard','tracker','shaman',       // BEASTKIN
  ];
  if (!VALID_CLASSES.includes(newClass?.toLowerCase())) {
    return res.status(400).json({ error: `Class "${newClass}" ไม่ถูกต้อง` });
  }
  const newClass_normalized = newClass.toLowerCase();

  const db = admin.firestore();
  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const data = accountDoc.data();

    if (!data.pendingClassChange) {
      return res.status(400).json({ error: 'คุณไม่มี Class Change token — ซื้อจาก RP Shop ก่อน' });
    }

    const charId = data.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    // Change class — reset skills (keep stat points)
    await db.collection('game_characters').doc(charId).update({
      class:          newClass_normalized.toUpperCase(), // เก็บ uppercase ให้ตรงกับ account.js
      unlockedSkills: [],   // Skills ต้อง unlock ใหม่
    });
    await accountRef.update({ pendingClassChange: admin.firestore.FieldValue.delete() });

    console.log(`[RPShop] 🔄 uid=${uid} changed class to ${newClass_normalized}`);
    return res.json({ success: true, newClass: newClass_normalized, msg: `เปลี่ยน Class เป็น ${newClass_normalized} สำเร็จ! Skills ต้อง unlock ใหม่` });
  } catch (err) {
    console.error('[RPShop] executeClassChange:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Execute Name Change (use pendingNameChange token) =====
const BAD_WORDS = ['admin', 'system', 'null', 'undefined'];
async function executeNameChange(req, res) {
  const { newName } = req.body;
  const uid = req.user.uid;

  if (!newName || typeof newName !== 'string') return res.status(400).json({ error: 'ระบุชื่อใหม่ด้วย' });
  const name = newName.trim();
  if (name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: 'ชื่อต้องยาว 2-20 ตัวอักษร' });
  }
  if (!/^[\u0E00-\u0E7Fa-zA-Z0-9 _\-\.]+$/.test(name)) {
    return res.status(400).json({ error: 'ชื่อมีตัวอักษรที่ไม่รองรับ' });
  }
  if (BAD_WORDS.some(w => name.toLowerCase().includes(w))) {
    return res.status(400).json({ error: 'ชื่อไม่เหมาะสม' });
  }

  const db = admin.firestore();
  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const data = accountDoc.data();

    if (!data.pendingNameChange) {
      return res.status(400).json({ error: 'คุณไม่มี Name Change token — ซื้อจาก RP Shop ก่อน' });
    }

    const charId = data.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    // Check name uniqueness
    const taken = await db.collection('game_characters').where('name', '==', name).limit(1).get();
    if (!taken.empty) return res.status(400).json({ error: 'ชื่อนี้ถูกใช้ไปแล้ว' });

    await db.collection('game_characters').doc(charId).update({ name });
    await accountRef.update({ pendingNameChange: admin.firestore.FieldValue.delete() });

    console.log(`[RPShop] ✏️ uid=${uid} renamed to "${name}"`);
    return res.json({ success: true, newName: name, msg: `เปลี่ยนชื่อเป็น "${name}" สำเร็จ!` });
  } catch (err) {
    console.error('[RPShop] executeNameChange:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Execute Skill Reset (use pendingSkillReset token) =====
async function executeSkillReset(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const data = accountDoc.data();

    if (!data.pendingSkillReset) {
      return res.status(400).json({ error: 'ไม่มี Skill Reset token — ซื้อจาก RP Shop ก่อน' });
    }

    const charId = data.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char = charDoc.data();

    // คำนวณ SP ที่ใช้ไปทั้งหมดจาก unlockedSkills
    const className   = char.class?.toLowerCase() || 'warrior';
    const classSkills = getClassSkills(className);
    const unlockedIds = char.unlockedSkills || [];
    let spRefund = 0;
    for (const skillId of unlockedIds) {
      const def = classSkills.find(s => s.id === skillId);
      if (def) spRefund += (def.skillPointCost || 0);
    }

    const currentSP = char.skillPoints || 0;
    await charRef.update({
      skillPoints:    currentSP + spRefund,
      unlockedSkills: [],
    });
    await accountRef.update({ pendingSkillReset: admin.firestore.FieldValue.delete() });

    console.log(`[RPShop] 🔄 uid=${uid} skill reset — refunded ${spRefund} SP, cleared ${unlockedIds.length} skills`);
    return res.json({
      success:     true,
      spRefunded:  spRefund,
      newSP:       currentSP + spRefund,
      msg:         `✅ Skill Reset สำเร็จ — ได้รับ ${spRefund} Skill Point คืน`,
    });
  } catch (err) {
    console.error('[RPShop] executeSkillReset:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Stat → derived stat mapping (ต้องตรงกับ character.js)
const STAT_EFFECTS_RESET = {
  str: { atk: 2 },
  int: { mag: 3, mpMax: 5 },
  agi: { spd: 1 },
  vit: { hpMax: 10, def: 1 },
};

// ===== Execute Stat Reset (use pendingStatReset token) =====
async function executeStatReset(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const data = accountDoc.data();

    if (!data.pendingStatReset) {
      return res.status(400).json({ error: 'ไม่มี Stat Reset token — ซื้อจาก RP Shop ก่อน' });
    }

    const charId = data.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charRef = db.collection('game_characters').doc(charId);
    const charDoc = await charRef.get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char = charDoc.data();

    const allocated = char.allocatedStats || { str: 0, int: 0, agi: 0, vit: 0 };
    const totalPointsSpent = (allocated.str || 0) + (allocated.int || 0) + (allocated.agi || 0) + (allocated.vit || 0);
    const currentStat = char.statPoints || 0;

    // คำนวณ derived stats ที่ต้องหัก
    const updates = {
      statPoints:    currentStat + totalPointsSpent,
      allocatedStats: { str: 0, int: 0, agi: 0, vit: 0 },
    };

    for (const [stat, pts] of Object.entries(allocated)) {
      if (!pts || pts <= 0) continue;
      const effects = STAT_EFFECTS_RESET[stat] || {};
      for (const [derivedStat, perPoint] of Object.entries(effects)) {
        const change = -(perPoint * pts);
        updates[derivedStat] = admin.firestore.FieldValue.increment(change);
        // สำหรับ hpMax/mpMax ลด hp/mp ด้วย แต่ไม่ให้ต่ำกว่า 1
        if (derivedStat === 'hpMax') updates.hp = admin.firestore.FieldValue.increment(change);
        if (derivedStat === 'mpMax') updates.mp = admin.firestore.FieldValue.increment(change);
      }
    }

    await charRef.update(updates);

    // หลัง update ต้อง clamp hp/mp ไม่ให้ต่ำกว่า 1
    const updated = (await charRef.get()).data();
    const clampUpdates = {};
    if ((updated.hp || 0) < 1)  clampUpdates.hp = 1;
    if ((updated.mp || 0) < 1)  clampUpdates.mp = 1;
    if (Object.keys(clampUpdates).length > 0) await charRef.update(clampUpdates);

    await accountRef.update({ pendingStatReset: admin.firestore.FieldValue.delete() });

    const final = (await charRef.get()).data();
    console.log(`[RPShop] ↩️ uid=${uid} stat reset — refunded ${totalPointsSpent} stat points`);
    return res.json({
      success:          true,
      pointsRefunded:   totalPointsSpent,
      newStatPoints:    currentStat + totalPointsSpent,
      stats: {
        atk: final.atk, def: final.def, mag: final.mag, spd: final.spd,
        hpMax: final.hpMax, mpMax: final.mpMax, hp: final.hp, mp: final.mp,
      },
      msg: `✅ Stat Reset สำเร็จ — ได้รับ ${totalPointsSpent} Stat Point คืน`,
    });
  } catch (err) {
    console.error('[RPShop] executeStatReset:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Get active boosts status =====
async function getActiveBoosts(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const data = accountDoc.data();
    const boosts = data.activeBoosts || {};
    const now = Date.now();
    // Filter expired
    const active = {};
    for (const [key, val] of Object.entries(boosts)) {
      if (val.expiresAt > now) active[key] = { ...val, remainingMs: val.expiresAt - now };
    }
    return res.json({ boosts: active, pendingClassChange: data.pendingClassChange || false, pendingNameChange: data.pendingNameChange || false });
  } catch (err) {
    console.error('[RPShop] getActiveBoosts:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getRPShop, buyRPItem, executeClassChange, executeNameChange, getActiveBoosts, executeSkillReset, executeStatReset };
