// handlers/game/enhance.js — Equipment Enhancement system
// +1 to +10 ใช้ Gold + วัตถุดิบ
// +1-5: สำเร็จ 100%, +6-10: มีโอกาสล้มเหลว (item ไม่หาย แค่ไม่ขึ้น)

const admin = require('firebase-admin');
const { getItem } = require('../../data/items');

// Enhancement recipe per tier
// { gold, materials: [{ itemId, qty }], successRate }
const ENHANCE_RECIPES = {
  1:  { gold: 300,    materials: [],                                         successRate: 1.00 },
  2:  { gold: 600,    materials: [{ itemId: 'iron_ore',     qty: 1 }],       successRate: 1.00 },
  3:  { gold: 1200,   materials: [{ itemId: 'iron_ore',     qty: 2 }],       successRate: 1.00 },
  4:  { gold: 2500,   materials: [{ itemId: 'iron_ore',     qty: 3 }],       successRate: 1.00 },
  5:  { gold: 5000,   materials: [{ itemId: 'iron_ore',     qty: 4 }, { itemId: 'ancient_scroll', qty: 1 }], successRate: 1.00 },
  6:  { gold: 10000,  materials: [{ itemId: 'ancient_scroll', qty: 1 }],     successRate: 0.80 },
  7:  { gold: 20000,  materials: [{ itemId: 'ancient_scroll', qty: 2 }],     successRate: 0.70 },
  8:  { gold: 40000,  materials: [{ itemId: 'ancient_scroll', qty: 2 }, { itemId: 'void_crystal', qty: 1 }], successRate: 0.60 },
  9:  { gold: 80000,  materials: [{ itemId: 'void_crystal', qty: 1 }],       successRate: 0.50 },
  10: { gold: 150000, materials: [{ itemId: 'void_crystal', qty: 2 }, { itemId: 'ancient_scroll', qty: 3 }], successRate: 0.40 },
};

// ===== GET enhancement info for an item =====
async function getEnhanceInfo(req, res) {
  const { instanceId } = req.params;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (snap.empty) return res.status(404).json({ error: 'ไม่พบ item' });
    const item = snap.docs[0].data();
    const def  = getItem(item.itemId);

    const currentEnhance = item.enhancement || 0;
    if (currentEnhance >= 10) {
      return res.json({ item, maxEnhanced: true });
    }

    const nextLevel = currentEnhance + 1;
    const recipe    = ENHANCE_RECIPES[nextLevel];

    // Check materials in inventory
    const materialChecks = await Promise.all(
      recipe.materials.map(async mat => {
        const matSnap = await db.collection('game_inventory')
          .where('uid', '==', uid)
          .where('itemId', '==', mat.itemId)
          .get();
        return { ...mat, haveQty: matSnap.size, enough: matSnap.size >= mat.qty, docs: matSnap.docs };
      })
    );

    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    const currentGold = accountDoc.exists ? (accountDoc.data().gold || 0) : 0;

    return res.json({
      item,
      itemName:       def?.name || item.itemId,
      currentEnhance,
      nextLevel,
      recipe: {
        gold:         recipe.gold,
        materials:    materialChecks.map(m => ({
          itemId:     m.itemId,
          name:       getItem(m.itemId)?.name || m.itemId,
          required:   m.qty,
          have:       m.haveQty,
          enough:     m.enough,
        })),
        successRate:  recipe.successRate,
      },
      canEnhance:     currentGold >= recipe.gold && materialChecks.every(m => m.enough),
      currentGold,
    });
  } catch (err) {
    console.error('[Enhance] getEnhanceInfo:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== ENHANCE item =====
async function enhanceItem(req, res) {
  const { instanceId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    // Get item
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (snap.empty) return res.status(404).json({ error: 'ไม่พบ item' });
    const itemDoc  = snap.docs[0];
    const item     = itemDoc.data();
    const def      = getItem(item.itemId);

    const currentEnhance = item.enhancement || 0;
    if (currentEnhance >= 10) {
      return res.status(400).json({ error: 'item นี้ขึ้นสูงสุดแล้ว (+10)' });
    }

    const nextLevel = currentEnhance + 1;
    const recipe    = ENHANCE_RECIPES[nextLevel];

    // Check gold
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    const currentGold = accountDoc.data()?.gold || 0;

    if (currentGold < recipe.gold) {
      return res.status(400).json({ error: `Gold ไม่พอ (มี ${currentGold}, ต้องการ ${recipe.gold})` });
    }

    // Check + collect materials
    const matDocs = [];
    for (const mat of recipe.materials) {
      const matSnap = await db.collection('game_inventory')
        .where('uid', '==', uid)
        .where('itemId', '==', mat.itemId)
        .limit(mat.qty)
        .get();

      if (matSnap.size < mat.qty) {
        const matDef = getItem(mat.itemId);
        return res.status(400).json({ error: `วัตถุดิบไม่พอ: ${matDef?.name || mat.itemId} (มี ${matSnap.size}/${mat.qty})` });
      }
      matDocs.push(...matSnap.docs.slice(0, mat.qty));
    }

    // Deduct gold
    await accountRef.update({
      gold: admin.firestore.FieldValue.increment(-recipe.gold),
    });

    // Delete material items
    const batch = db.batch();
    for (const doc of matDocs) batch.delete(doc.ref);
    await batch.commit();

    // Roll success
    const success = Math.random() < recipe.successRate;

    if (success) {
      await itemDoc.ref.update({ enhancement: nextLevel });
      const label = `${def?.name || item.itemId} +${nextLevel}`;
      return res.json({
        success: true,
        result:  'success',
        newEnhancement: nextLevel,
        goldSpent: recipe.gold,
        msg: `✅ ${label} สำเร็จ! 🎉`,
      });
    } else {
      // Fail — item stays at current level
      return res.json({
        success: true, // request OK, but enhance failed
        result:  'failed',
        newEnhancement: currentEnhance,
        goldSpent: recipe.gold,
        msg: `❌ Enhance +${nextLevel} ล้มเหลว... item ยังอยู่ที่ +${currentEnhance}`,
      });
    }
  } catch (err) {
    console.error('[Enhance] enhanceItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getEnhanceInfo, enhanceItem };
