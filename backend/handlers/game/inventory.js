// handlers/game/inventory.js — Inventory + Equipment + NPC Market
const admin = require('firebase-admin');
const { getItem, SLOT_NAMES, GRADE_COLOR } = require('../../data/items');
const { deductGold, addGold } = require('./currency');
const { SHOP_INVENTORY } = require('../../data/maps');

const EQUIP_SLOTS = ['HEAD','FACE','CHEST','GLOVES','LEGS','FEET','CAPE',
                     'MAIN_HAND','OFF_HAND','RING_L','RING_R','AMULET','BELT','RELIC'];

// ===== Get Inventory =====
async function getInventory(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .orderBy('obtainedAt', 'desc')
      .limit(200).get();

    const items = snap.docs.map(doc => {
      const d   = doc.data();
      const def = getItem(d.itemId);
      return {
        docId:       doc.id,
        instanceId:  d.instanceId,
        itemId:      d.itemId,
        name:        def?.name || d.itemId,
        emoji:       def?.emoji || '📦',
        grade:       d.grade,
        gradeColor:  GRADE_COLOR[d.grade] || '#9ca3af',
        enhancement: d.enhancement || 0,
        durability:  d.durability,
        equipped:    d.equipped || null,
        type:        def?.type || 'UNKNOWN',
        desc:        def?.desc || '',
        sellPrice:   def?.sellPrice || 0,
        obtainedAt:  d.obtainedAt,
        rolls:       d.rolls || {},
        sockets:     d.sockets || 0,
        gem_slots:   d.gem_slots || [],
      };
    });

    const equipDoc = await db.collection('game_equipment').doc(uid).get();
    const equipment = equipDoc.exists ? equipDoc.data() : {};

    return res.json({ items, equipment });
  } catch (err) {
    console.error('[Inventory] getInventory:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Equip Item =====
async function equipItem(req, res) {
  const { instanceId, slot } = req.body;
  const uid = req.user.uid;

  if (!EQUIP_SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot ไม่ถูกต้อง' });

  const db = admin.firestore();
  try {
    // หา item ใน inventory
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (snap.empty) return res.status(404).json({ error: 'ไม่พบ item ใน inventory' });

    const invDoc  = snap.docs[0];
    const invData = invDoc.data();
    const def     = getItem(invData.itemId);

    if (!def) return res.status(400).json({ error: 'ข้อมูล item ไม่พบ' });
    if (def.type !== slot && !isValidSlot(def.type, slot)) {
      return res.status(400).json({ error: `ไม่สามารถใส่ ${def.name} ใน slot ${SLOT_NAMES[slot] || slot}` });
    }

    // ตรวจ class requirement
    const charDoc = await getCharDoc(uid, db);
    if (!charDoc) return res.status(400).json({ error: 'ไม่พบ Character' });
    const charData = charDoc.data();

    if (def.classReq?.length > 0 && !def.classReq.includes(charData.class)) {
      return res.status(400).json({ error: `${def.name} ใช้ได้เฉพาะ ${def.classReq.join(', ')}` });
    }
    if (def.levelReq && charData.level < def.levelReq) {
      return res.status(400).json({ error: `ต้องการ Level ${def.levelReq} ขึ้นไป` });
    }

    const equipRef = db.collection('game_equipment').doc(uid);
    const equipDoc = await equipRef.get();
    const equipment = equipDoc.exists ? equipDoc.data() : {};

    const batch = db.batch();

    // ถอด item เดิมออกจาก slot (ถ้ามี)
    if (equipment[slot]) {
      const prevSnap = await db.collection('game_inventory')
        .where('uid', '==', uid)
        .where('instanceId', '==', equipment[slot])
        .limit(1).get();
      if (!prevSnap.empty) {
        batch.update(prevSnap.docs[0].ref, { equipped: null });
      }
    }

    // ใส่ item ใหม่
    batch.update(invDoc.ref, { equipped: slot });
    batch.set(equipRef, { ...equipment, [slot]: instanceId }, { merge: true });

    await batch.commit();
    return res.json({ success: true, slot, instanceId, msg: `ใส่ ${def.name} ใน ${SLOT_NAMES[slot]} แล้ว` });
  } catch (err) {
    console.error('[Inventory] equipItem:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Unequip Item =====
async function unequipItem(req, res) {
  const { slot } = req.body;
  const uid = req.user.uid;

  if (!EQUIP_SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot ไม่ถูกต้อง' });

  const db = admin.firestore();
  try {
    const equipRef = db.collection('game_equipment').doc(uid);
    const equipDoc = await equipRef.get();
    if (!equipDoc.exists) return res.status(400).json({ error: 'ไม่มีอุปกรณ์' });

    const equipment  = equipDoc.data();
    const instanceId = equipment[slot];
    if (!instanceId) return res.status(400).json({ error: `${SLOT_NAMES[slot] || slot} ว่างอยู่แล้ว` });

    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    const batch = db.batch();
    if (!snap.empty) batch.update(snap.docs[0].ref, { equipped: null });
    batch.update(equipRef, { [slot]: null });
    await batch.commit();

    return res.json({ success: true, slot, msg: `ถอด item จาก ${SLOT_NAMES[slot] || slot} แล้ว` });
  } catch (err) {
    console.error('[Inventory] unequipItem:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Sell item to NPC =====
async function sellItem(req, res) {
  const { instanceId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const snap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (snap.empty) return res.status(404).json({ error: 'ไม่พบ item' });

    const invDoc  = snap.docs[0];
    const invData = invDoc.data();

    if (invData.equipped) return res.status(400).json({ error: 'ถอดอุปกรณ์ออกก่อนขาย' });

    const def = getItem(invData.itemId);
    if (!def) return res.status(400).json({ error: 'ข้อมูล item ไม่พบ' });
    if (!def.sellPrice || def.sellPrice <= 0) return res.status(400).json({ error: 'ขาย item นี้ไม่ได้' });

    // ราคาขาย = sellPrice (fixed)
    const price = def.sellPrice;

    const batch = db.batch();
    batch.delete(invDoc.ref);
    await batch.commit();

    await addGold(uid, price, 'sell_item');
    return res.json({ success: true, gold: price, msg: `ขาย ${def.name} ได้ ${price} Gold` });
  } catch (err) {
    console.error('[Inventory] sellItem:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== NPC Shop: Get items =====
async function getShopItems(req, res) {
  const { shopId = 'starter' } = req.query;
  const items = (SHOP_INVENTORY[shopId] || []).map(entry => {
    const def = getItem(entry.itemId);
    if (!def) return null;
    return {
      itemId:    entry.itemId,
      name:      def.name,
      emoji:     def.emoji,
      grade:     def.grade,
      gradeColor: GRADE_COLOR[def.grade] || '#9ca3af',
      buyPrice:  def.buyPrice,
      desc:      def.desc,
      type:      def.type,
      levelReq:  def.levelReq || 1,
    };
  }).filter(Boolean);

  return res.json({ items });
}

// ===== NPC Shop: Buy item =====
async function buyItem(req, res) {
  const { itemId } = req.body;
  const uid = req.user.uid;

  const def = getItem(itemId);
  if (!def) return res.status(400).json({ error: 'ไม่พบ item' });
  if (!def.buyPrice) return res.status(400).json({ error: 'ซื้อ item นี้ไม่ได้' });

  // ตรวจว่ามีใน shop
  const allShopItems = Object.values(SHOP_INVENTORY).flat().map(e => e.itemId);
  if (!allShopItems.includes(itemId)) return res.status(400).json({ error: 'item ไม่มีในร้าน' });

  const deductResult = await deductGold(uid, def.buyPrice, 'buy_item');
  if (!deductResult.success) {
    return res.status(400).json({ error: deductResult.error || 'Gold ไม่เพียงพอ' });
  }

  const db       = admin.firestore();
  const instance = require('../../data/items').rollItem(itemId);
  if (!instance) return res.status(500).json({ error: 'สร้าง item ไม่สำเร็จ' });

  await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
  return res.json({ success: true, item: instance, goldSpent: def.buyPrice, msg: `ซื้อ ${def.name} แล้ว` });
}

// ===== Helpers =====
function isValidSlot(itemType, slot) {
  // RING สามารถใส่ RING_L หรือ RING_R
  if (itemType === 'RING_L' || itemType === 'RING_R') {
    return slot === 'RING_L' || slot === 'RING_R';
  }
  return itemType === slot;
}

async function getCharDoc(uid, db) {
  const accountDoc = await db.collection('game_accounts').doc(uid).get();
  if (!accountDoc.exists) return null;
  const charId = accountDoc.data().characterId;
  if (!charId) return null;
  return db.collection('game_characters').doc(charId).get();
}

module.exports = { getInventory, equipItem, unequipItem, sellItem, getShopItems, buyItem };
