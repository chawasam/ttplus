// handlers/game/crafting.js — Crafting system
const admin = require('firebase-admin');
const { RECIPES, getRecipe, getAvailableRecipes } = require('../../data/crafting');
const { getItem, rollItem } = require('../../data/items');

// ===== GET available recipes =====
async function getCraftingRecipes(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });

    const char  = charDoc.data();
    const level = char.level || 1;
    const gold  = accountDoc.data().gold || 0;

    // Load player inventory (summarized as map: itemId -> qty)
    const invSnap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .get();

    const inventory = {};
    for (const doc of invSnap.docs) {
      const d = doc.data();
      inventory[d.itemId] = (inventory[d.itemId] || 0) + 1;
    }

    const recipes = getAvailableRecipes(level).map(recipe => {
      const canCraft = recipe.ingredients.every(ing => (inventory[ing.itemId] || 0) >= ing.qty)
        && gold >= recipe.goldCost;
      const missing = recipe.ingredients
        .filter(ing => (inventory[ing.itemId] || 0) < ing.qty)
        .map(ing => ({
          itemId: ing.itemId,
          need:   ing.qty,
          have:   inventory[ing.itemId] || 0,
          name:   getItem(ing.itemId)?.name || ing.itemId,
          emoji:  getItem(ing.itemId)?.emoji || '📦',
        }));
      return {
        recipeId:    recipe.recipeId,
        name:        recipe.name,
        desc:        recipe.desc,
        category:    recipe.category,
        levelReq:    recipe.levelReq,
        goldCost:    recipe.goldCost,
        emoji:       recipe.emoji,
        resultGrade: recipe.resultGrade,
        ingredients: recipe.ingredients.map(ing => ({
          itemId: ing.itemId,
          qty:    ing.qty,
          have:   inventory[ing.itemId] || 0,
          name:   getItem(ing.itemId)?.name || ing.itemId,
          emoji:  getItem(ing.itemId)?.emoji || '📦',
        })),
        canCraft,
        missing,
      };
    });

    return res.json({ recipes, gold, playerLevel: level });
  } catch (err) {
    console.error('[Crafting] getCraftingRecipes:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== CRAFT an item =====
async function craftItem(req, res) {
  const { recipeId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  const recipe = getRecipe(recipeId);
  if (!recipe) return res.status(404).json({ error: 'ไม่พบ Recipe' });

  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const accountData = accountDoc.data();
    const charId = accountData.characterId;
    if (!charId) return res.status(400).json({ error: 'ยังไม่มี Character' });

    const charDoc = await db.collection('game_characters').doc(charId).get();
    if (!charDoc.exists) return res.status(404).json({ error: 'Character ไม่พบ' });
    const char = charDoc.data();

    // Level check
    if ((char.level || 1) < recipe.levelReq) {
      return res.status(400).json({ error: `ต้องการ Level ${recipe.levelReq} ก่อน Craft` });
    }

    // Gold check
    const gold = accountData.gold || 0;
    if (gold < recipe.goldCost) {
      return res.status(400).json({ error: `Gold ไม่พอ (มี ${gold}, ต้องการ ${recipe.goldCost})` });
    }

    // Inventory check — build map of matching docs
    const invSnap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .get();

    const inventory = {}; // itemId -> [docRef, ...]
    for (const doc of invSnap.docs) {
      const d = doc.data();
      if (!inventory[d.itemId]) inventory[d.itemId] = [];
      inventory[d.itemId].push(doc.ref);
    }

    for (const ing of recipe.ingredients) {
      const have = (inventory[ing.itemId] || []).length;
      if (have < ing.qty) {
        const def = getItem(ing.itemId);
        return res.status(400).json({
          error: `${def?.emoji || '📦'} ${def?.name || ing.itemId} ไม่พอ (มี ${have}/${ing.qty})`,
        });
      }
    }

    // === ALL CHECKS PASSED — execute craft ===
    const batch = db.batch();

    // Deduct gold
    batch.update(accountRef, { gold: admin.firestore.FieldValue.increment(-recipe.goldCost) });

    // Consume ingredients (FIFO — take oldest docs first)
    for (const ing of recipe.ingredients) {
      const docs = inventory[ing.itemId].slice(0, ing.qty);
      for (const ref of docs) batch.delete(ref);
    }

    await batch.commit();

    // Grant result item(s)
    const qty = recipe.resultQty || 1;
    const grantedItems = [];
    for (let i = 0; i < qty; i++) {
      const instance = rollItem(recipe.resultItemId);
      if (instance) {
        // Override grade if recipe specifies
        if (recipe.resultGrade) instance.grade = recipe.resultGrade;
        const docId = `${uid}_${instance.instanceId}_craft${i}`;
        await db.collection('game_inventory').doc(docId).set({ uid, ...instance, craftedFrom: recipeId });
        grantedItems.push(instance.instanceId);
      }
    }

    const resultDef = getItem(recipe.resultItemId);
    console.log(`[Crafting] ✅ uid=${uid} crafted ${recipeId} ×${qty}`);
    return res.json({
      success: true,
      recipeId,
      resultName:  recipe.name,
      resultEmoji: recipe.emoji,
      resultGrade: recipe.resultGrade,
      qty,
      goldSpent:   recipe.goldCost,
      msg: `✨ Craft ${recipe.name} สำเร็จ!`,
    });
  } catch (err) {
    console.error('[Crafting] craftItem:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getCraftingRecipes, craftItem };
