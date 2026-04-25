// handlers/game/rpShop.js — Realm Points shop handler
const admin = require('firebase-admin');
const { RP_SHOP_ITEMS, getRPShopItem } = require('../../data/rp_shop');
const { getItem, rollItem } = require('../../data/items');

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

    const items = RP_SHOP_ITEMS.map(item => ({
      id:          item.id,
      name:        item.name,
      desc:        item.desc,
      category:    item.category,
      rpPrice:     item.rpPrice,
      emoji:       item.emoji,
      oneTime:     item.oneTime || false,
      alreadyBought: item.oneTime ? bought.includes(item.id) : false,
      canAfford:   rp >= item.rpPrice,
    }));

    return res.json({ items, rp });
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
      const itemId = shopItem.pool[Math.floor(Math.random() * shopItem.pool.length)];
      const instance = rollItem(itemId);
      if (instance) {
        await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
        const def = getItem(itemId);
        granted.push({ type: 'item', itemId, name: def?.name || itemId, emoji: def?.emoji || '📦', fromBox: true });
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

module.exports = { getRPShop, buyRPItem };
