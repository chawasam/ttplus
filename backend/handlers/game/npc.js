// handlers/game/npc.js — NPC affection + dialog + gifts
const admin  = require('firebase-admin');
const { getNPC, getAllNPCs, getGiftReaction, getAffectionTier, BOND_ITEMS, TIER_GIFT_BACK } = require('../../data/npcs');
const { getItem, rollItem } = require('../../data/items');

const GIFT_DAILY_LIMIT = 3; // ครั้งต่อ NPC ต่อวัน
const DECAY_PER_DAY    = 1; // affection ลดต่อวันที่ไม่ได้คุย
const DECAY_FLOOR      = 20;

// ===== Get all NPCs + affection =====
async function getNPCList(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const npcs     = getAllNPCs();
    const affSnap  = await db.collection('game_npc_affection').doc(uid).get();
    const affData  = affSnap.exists ? affSnap.data() : {};

    const result = npcs.map(npc => {
      const aff    = affData[npc.npcId] || { affection: 0, giftCount: 0, lastGiftDate: null };
      const tier   = getAffectionTier(aff.affection || 0);
      const dialog = getDialog(npc, aff.affection || 0);
      return {
        npcId:         npc.npcId,
        name:          npc.name,
        emoji:         npc.emoji,
        title:         npc.title,
        zone:          npc.zone,
        isShopkeeper:  npc.isShopkeeper,
        affection:     aff.affection || 0,
        tier,
        dialog,
        giftUsedToday: getGiftUsedToday(aff),
        giftLimit:     GIFT_DAILY_LIMIT,
        bondUnlocked:  (aff.affection || 0) >= 100,
        bondDesc:      npc.bondDesc,
      };
    });

    return res.json({ npcs: result });
  } catch (err) {
    console.error('[NPC] getNPCList:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Give gift to NPC =====
async function giveGift(req, res) {
  const { npcId, instanceId } = req.body;
  const uid = req.user.uid;

  const npc = getNPC(npcId);
  if (!npc) return res.status(400).json({ error: 'NPC ไม่พบ' });

  const db = admin.firestore();

  try {
    // หา item ใน inventory
    const itemSnap = await db.collection('game_inventory')
      .where('uid', '==', uid)
      .where('instanceId', '==', instanceId)
      .limit(1).get();

    if (itemSnap.empty) return res.status(404).json({ error: 'ไม่พบ item ใน inventory' });
    const itemDoc  = itemSnap.docs[0];
    const itemData = itemDoc.data();
    const def      = getItem(itemData.itemId);
    if (!def) return res.status(400).json({ error: 'ข้อมูล item ไม่พบ' });

    // อ่าน affection
    const affRef  = db.collection('game_npc_affection').doc(uid);
    const affDoc  = await affRef.get();
    const affData = affDoc.exists ? affDoc.data() : {};
    const npcAff  = affData[npcId] || { affection: 0, giftCount: 0, lastGiftDate: null };

    // ตรวจ daily limit
    const usedToday = getGiftUsedToday(npcAff);
    if (usedToday >= GIFT_DAILY_LIMIT) {
      return res.status(400).json({ error: `ให้ของ ${npc.name} ครบ ${GIFT_DAILY_LIMIT} ครั้งแล้ววันนี้ มาใหม่พรุ่งนี้` });
    }

    // คำนวณ affection delta
    const reaction = getGiftReaction(npcId, itemData.itemId);
    const prevTier = getAffectionTier(npcAff.affection);
    const newAff   = Math.max(0, Math.min(100, (npcAff.affection || 0) + reaction.delta));
    const newTier  = getAffectionTier(newAff);
    const tierUp   = newTier > prevTier;

    // Update affection
    const today = getDateStr();
    const newNpcAff = {
      affection:     newAff,
      giftCount:     (npcAff.giftCount || 0) + 1,
      lastGiftDate:  today,
      giftCountToday: usedToday + 1,
    };

    const batch = db.batch();

    // บันทึก affection
    batch.set(affRef, { [npcId]: newNpcAff }, { merge: true });

    // ลบ item ที่ให้ออก
    batch.delete(itemDoc.ref);

    // Grant bond item ถ้า affection ถึง 100
    let bondGranted = null;
    if (newAff >= 100 && !npcAff.bondReceived) {
      const bondItem = BOND_ITEMS[npc.bondItem];
      if (bondItem) {
        const instance = {
          ...rollItem('wild_flower'), // ใช้เป็น template
          itemId:      bondItem.itemId,
          instanceId:  `bond_${uid}_${npcId}_${Date.now()}`,
          grade:       bondItem.grade,
          enhancement: 0,
          durability:  100,
          rolls:       {},
          sockets:     0,
          gem_slots:   [],
          equipped:    null,
          obtainedAt:  Date.now(),
        };
        const bondRef = db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`);
        batch.set(bondRef, { uid, ...instance });
        batch.set(affRef, { [npcId]: { ...newNpcAff, bondReceived: true } }, { merge: true });
        bondGranted = bondItem;
      }
    }

    await batch.commit();

    // Reaction message
    const reactionMsg = {
      like:    [`${npc.name} ดีใจมาก! "ขอบคุณนะ ชอบมากเลย~"`, `${npc.name} ยิ้มกว้างมาก "นี่... ชอบที่สุดเลย!"` ],
      neutral: [`${npc.name} รับมาด้วยรอยยิ้มสุภาพ "ขอบคุณนะ"`, `${npc.name} うなずきながら "อ้อ... ขอบคุณนะ"` ],
      hate:    [`${npc.name} ขยับถอยหลัง "อ...ขอบคุณ" แต่ดูไม่สบายใจ`, `${npc.name} ทำหน้าตา "อ๊ะ... ไม่เป็นไรนะ"` ],
      unknown: [`${npc.name} รับไว้ "ขอบคุณ"` ],
    };
    const msgPool = reactionMsg[reaction.type] || reactionMsg.unknown;
    const msg     = msgPool[Math.floor(Math.random() * msgPool.length)];

    // Gift back ถ้า tier ขึ้น
    let giftBack = null;
    if (tierUp && TIER_GIFT_BACK[npcId]?.[newTier]) {
      const giftItemId = TIER_GIFT_BACK[npcId][newTier];
      const giftInst   = rollItem(giftItemId);
      if (giftInst) {
        await db.collection('game_inventory').doc(`${uid}_${giftInst.instanceId}`).set({ uid, ...giftInst });
        giftBack = getItem(giftItemId);
      }
    }

    return res.json({
      success:      true,
      npcId,
      reaction:     reaction.type,
      delta:        reaction.delta,
      newAffection: newAff,
      tierUp,
      newTier,
      msg,
      giftBack,
      bondGranted,
      giftUsedToday: usedToday + 1,
    });
  } catch (err) {
    console.error('[NPC] giveGift:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Get NPC dialog =====
async function talkToNPC(req, res) {
  const { npcId } = req.params;
  const uid = req.user.uid;

  const npc = getNPC(npcId);
  if (!npc) return res.status(404).json({ error: 'NPC ไม่พบ' });

  const db = admin.firestore();
  try {
    const affDoc  = await db.collection('game_npc_affection').doc(uid).get();
    const affData = affDoc.exists ? affDoc.data() : {};
    const npcAff  = affData[npcId] || { affection: 0 };

    // Apply daily decay
    await applyDecay(uid, npcId, npcAff, db);

    const dialog     = getDialog(npc, npcAff.affection || 0);
    const tier       = getAffectionTier(npcAff.affection || 0);
    const giftUsed   = getGiftUsedToday(npcAff);

    return res.json({
      npcId,
      name:          npc.name,
      emoji:         npc.emoji,
      title:         npc.title,
      personality:   npc.personality,
      dialog,
      affection:     npcAff.affection || 0,
      tier,
      giftUsedToday: giftUsed,
      giftLimit:     GIFT_DAILY_LIMIT,
      isShopkeeper:  npc.isShopkeeper,
      bondUnlocked:  (npcAff.affection || 0) >= 100,
    });
  } catch (err) {
    console.error('[NPC] talkToNPC:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Helpers =====

function getDialog(npc, affection) {
  const tiers  = Object.keys(npc.dialogs).map(Number).sort((a, b) => b - a);
  const tier   = tiers.find(t => affection >= t) ?? 0;
  const pool   = npc.dialogs[tier] || npc.dialogs[0] || ['...'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function getGiftUsedToday(npcAff) {
  if (!npcAff.lastGiftDate) return 0;
  if (npcAff.lastGiftDate !== getDateStr()) return 0;
  return npcAff.giftCountToday || 0;
}

async function applyDecay(uid, npcId, npcAff, db) {
  if (!npcAff.lastGiftDate) return;
  const today    = getDateStr();
  const lastDate = npcAff.lastGiftDate;
  if (lastDate >= today) return;

  // คำนวณ days ผ่าน
  const days = Math.floor((new Date(today) - new Date(lastDate)) / 86400000);
  if (days < 1) return;

  const npc      = getNPC(npcId);
  const decay    = days * DECAY_PER_DAY;
  const newAff   = Math.max(DECAY_FLOOR, (npcAff.affection || 0) - decay);
  if (newAff === npcAff.affection) return;

  try {
    await db.collection('game_npc_affection').doc(uid).set(
      { [npcId]: { affection: newAff } }, { merge: true }
    );
  } catch (err) {
    console.error('[NPC] applyDecay:', err.message);
  }
}

module.exports = { getNPCList, giveGift, talkToNPC };
