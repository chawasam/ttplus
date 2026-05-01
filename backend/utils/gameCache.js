// utils/gameCache.js — In-memory cache สำหรับ game_accounts + game_characters
//
// ปัญหาเดิม: ทุก handler (combat, dungeon, rpShop, quest_engine, achievements, ...)
// อ่าน game_accounts.doc(uid) และ game_characters.doc(charId) ซ้ำซ้อนกัน
// บางครั้งใน function เดียวกันก็อ่าน 3 ครั้ง → Firestore reads เพิ่มขึ้นเร็วมาก
//
// แนวทาง: TTL in-memory cache คล้าย eventsCache ใน eventProcessor.js
// - getAccount(uid, db)    → TTL 30 วิ
// - getCharacter(id, db)   → TTL 60 วิ
// - invalidateAccount(uid) → เรียกทุกครั้งที่ write ลง game_accounts
// - invalidateChar(id)     → เรียกทุกครั้งที่ write ลง game_characters
// - getInventoryCount(uid, db) → อ่านจาก accounts.inventoryCount หรือ fallback count query
// - adjustInventoryCount(uid, delta, db) → FieldValue.increment atomic

const admin = require('firebase-admin');

const ACCOUNT_TTL = 30_000;  // 30 วิ — gold/hp เปลี่ยนบ่อย
const CHAR_TTL    = 60_000;  // 60 วิ — stat เปลี่ยนหลัง combat/level up

// Map: uid → { data, cachedAt }
const _accountCache = new Map();
// Map: charId → { data, cachedAt }
const _charCache    = new Map();

// ── Auto-cleanup expired entries ทุก 2 นาที ────────────────────────────────
setInterval(() => {
  const nowA = Date.now() - ACCOUNT_TTL;
  const nowC = Date.now() - CHAR_TTL;
  for (const [k, v] of _accountCache.entries()) {
    if (v.cachedAt < nowA) _accountCache.delete(k);
  }
  for (const [k, v] of _charCache.entries()) {
    if (v.cachedAt < nowC) _charCache.delete(k);
  }
}, 2 * 60_000);

// ─────────────────────────────────────────────────────────────────────────────
//  getAccount(uid, db) → object | null
//  ดึง account data จาก cache หรือ Firestore
// ─────────────────────────────────────────────────────────────────────────────
async function getAccount(uid, db) {
  const cached = _accountCache.get(uid);
  if (cached && Date.now() - cached.cachedAt < ACCOUNT_TTL) {
    return cached.data;   // null หมายความว่า account ไม่มีอยู่จริง (cached non-existence)
  }
  const snap = await db.collection('game_accounts').doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  _accountCache.set(uid, { data, cachedAt: Date.now() });
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
//  getCharacter(charId, db) → object | null
// ─────────────────────────────────────────────────────────────────────────────
async function getCharacter(charId, db) {
  if (!charId) return null;
  const cached = _charCache.get(charId);
  if (cached && Date.now() - cached.cachedAt < CHAR_TTL) {
    return cached.data;
  }
  const snap = await db.collection('game_characters').doc(charId).get();
  const data = snap.exists ? snap.data() : null;
  _charCache.set(charId, { data, cachedAt: Date.now() });
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
//  invalidateAccount / invalidateChar
//  เรียกหลัง write เสมอ — ป้องกัน stale cache
// ─────────────────────────────────────────────────────────────────────────────
function invalidateAccount(uid) {
  _accountCache.delete(uid);
}

function invalidateChar(charId) {
  if (charId) _charCache.delete(charId);
}

// invalidate ทั้งคู่พร้อมกัน (ใช้ใน combat เป็นหลัก)
function invalidateUser(uid, charId) {
  invalidateAccount(uid);
  invalidateChar(charId);
}

// ─────────────────────────────────────────────────────────────────────────────
//  getInventoryCount(uid, db) → number
//
//  อ่านจาก accounts.inventoryCount (เร็ว, 0 Firestore reads ถ้า account cached)
//  fallback: count จาก game_inventory collection query (เดิม) เมื่อ field ไม่มี
//  เขียน inventoryCount กลับลง account เพื่อ migrate doc เก่าแบบ lazy
// ─────────────────────────────────────────────────────────────────────────────
async function getInventoryCount(uid, db) {
  const acct = await getAccount(uid, db);
  if (acct && typeof acct.inventoryCount === 'number') {
    return acct.inventoryCount;
  }
  // Fallback: query (migration path สำหรับ account เก่าที่ยังไม่มี field)
  const snap  = await db.collection('game_inventory').where('uid', '==', uid).get();
  const count = snap.size;
  // บันทึก field เพื่อ migrate — fire-and-forget
  db.collection('game_accounts').doc(uid)
    .update({ inventoryCount: count })
    .catch(() => {});
  // อัปเดต cache
  if (acct) {
    acct.inventoryCount = count;
    _accountCache.set(uid, { data: acct, cachedAt: Date.now() });
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
//  adjustInventoryCount(uid, delta, db)
//  เรียกทุกครั้งที่เพิ่ม/ลบ item จาก game_inventory
//  delta: +1 เมื่อเพิ่ม, -1 เมื่อลบ
// ─────────────────────────────────────────────────────────────────────────────
function adjustInventoryCount(uid, delta, db) {
  // Fire-and-forget — non-critical, ไม่ต้อง await
  db.collection('game_accounts').doc(uid)
    .update({ inventoryCount: admin.firestore.FieldValue.increment(delta) })
    .catch(() => {});
  // อัปเดต in-memory ด้วยถ้า cache ยังอยู่
  const cached = _accountCache.get(uid);
  if (cached?.data && typeof cached.data.inventoryCount === 'number') {
    cached.data.inventoryCount = Math.max(0, cached.data.inventoryCount + delta);
  }
}

module.exports = {
  getAccount,
  getCharacter,
  invalidateAccount,
  invalidateChar,
  invalidateUser,
  getInventoryCount,
  adjustInventoryCount,
};
