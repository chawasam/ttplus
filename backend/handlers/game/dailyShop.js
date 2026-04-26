// handlers/game/dailyShop.js — Daily rotating shop
const admin  = require('firebase-admin');
const { getDailyShopItems, getTodayStr } = require('../../data/daily_shop');
const { getItem, rollItem }              = require('../../data/items');
const { addGold, getGold }               = require('./currency');
const { logReward }                      = require('../../utils/anticheat');

// ===== GET /api/game/daily-shop =====
async function getDailyShop(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const today    = getTodayStr();
    const slots    = getDailyShopItems(today);
    const { getItem: gi } = require('../../data/items');

    // ดู purchase history วันนี้
    const purchaseDoc = await db.collection('game_daily_shop_purchases')
      .doc(`${uid}_${today}`).get();
    const purchased = purchaseDoc.exists ? (purchaseDoc.data().slots || []) : [];

    const balance  = await getGold(uid);

    const result = slots.map(slot => {
      const def = gi(slot.itemId) || {};
      return {
        slotId:    slot.slotId,
        itemId:    slot.itemId,
        name:      def.name      || slot.itemId,
        emoji:     def.emoji     || '📦',
        type:      def.type      || 'UNKNOWN',
        rarity:    def.rarity    || 'COMMON',
        price:     slot.price,
        origPrice: slot.origPrice,
        isDeal:    slot.isDeal,
        category:  slot.category,
        purchased: purchased.includes(slot.slotId),
      };
    });

    return res.json({
      date:      today,
      items:     result,
      balance,
      refreshAt: getNextRefreshMs(),
    });
  } catch (err) {
    console.error('[DailyShop] getDailyShop:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== POST /api/game/daily-shop/buy  { slotId } =====
async function buyDailyShopItem(req, res) {
  const { slotId } = req.body;
  const uid  = req.user.uid;
  const db   = admin.firestore();

  if (typeof slotId !== 'number') return res.status(400).json({ error: 'slotId required' });

  try {
    const today = getTodayStr();
    const slots = getDailyShopItems(today);
    const slot  = slots.find(s => s.slotId === slotId);
    if (!slot) return res.status(400).json({ error: 'Slot ไม่พบ' });

    const def = getItem(slot.itemId);
    if (!def) return res.status(400).json({ error: 'Item ไม่พบ' });

    // ตรวจ purchased แล้วหรือยัง
    const purchaseRef = db.collection('game_daily_shop_purchases').doc(`${uid}_${today}`);
    const purchaseDoc = await purchaseRef.get();
    const purchased   = purchaseDoc.exists ? (purchaseDoc.data().slots || []) : [];

    if (purchased.includes(slotId)) {
      return res.status(400).json({ error: 'ซื้อ slot นี้ไปแล้ววันนี้' });
    }

    // ตรวจ gold
    const balance = await getGold(uid);
    if (balance < slot.price) {
      return res.status(400).json({ error: `Gold ไม่พอ (มี ${balance}, ต้องการ ${slot.price})` });
    }

    // หัก gold + เพิ่ม item
    await addGold(uid, -slot.price, 'daily_shop_buy');

    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    const charId     = accountDoc.data()?.characterId;

    // ตรวจ inventory limit
    if (charId) {
      const invSnap = await db.collection('game_inventory').where('uid', '==', uid).get();
      const charDoc = await db.collection('game_characters').doc(charId).get();
      const invLimit = charDoc.exists ? (charDoc.data().inventoryLimit || 30) : 30;
      if (invSnap.size >= invLimit) {
        // คืน gold แล้ว reject
        await addGold(uid, slot.price, 'daily_shop_refund');
        return res.status(400).json({ error: `Inventory เต็ม (${invSnap.size}/${invLimit})` });
      }
    }

    const instance = rollItem(slot.itemId);
    if (!instance) return res.status(500).json({ error: 'สร้าง item ไม่ได้' });

    await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });

    // บันทึก purchase
    await purchaseRef.set({
      uid,
      date:  today,
      slots: [...purchased, slotId],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Anti-cheat log
    logReward(uid, 'daily_shop_buy', {
      itemId: slot.itemId,
      price:  slot.price,
      gold:   -slot.price,
    }).catch(() => {});

    return res.json({
      success:    true,
      item:       { itemId: instance.itemId, name: def.name, emoji: def.emoji || '📦' },
      instanceId: instance.instanceId,
      goldSpent:  slot.price,
      balance:    balance - slot.price,
    });
  } catch (err) {
    console.error('[DailyShop] buyDailyShopItem:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ms จนถึง midnight UTC
function getNextRefreshMs() {
  const now   = new Date();
  const next  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime() - now.getTime();
}

module.exports = { getDailyShop, buyDailyShopItem };
