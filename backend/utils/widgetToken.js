// widgetToken.js — Widget channel IDs + legacy token support
// Format ใหม่: cid (channel ID) — ตัวเลขสั้น 5-6 หลัก เช่น 10001, 10002
// Format เก่า: widgetToken — hex/base64url ยาว (backward compat ยังรองรับ)
// - cid เก็บใน Firestore: widget_cids/{cid} → { uid }
// - In-memory cache ลด Firestore reads หลัง server restart
// - ไม่มี expiry — URL ไม่เปลี่ยนแม้ปิดเปิด browser

const crypto = require('crypto');

// ===== CID cache (new format) =====
const cidToUidCache = new Map(); // cid (string) → uid
const uidToCidCache = new Map(); // uid → cid (string)

// ===== Legacy token cache (old format) =====
const tokenCache = new Map(); // token → uid
const uidCache   = new Map(); // uid   → token

// ── CID helpers ───────────────────────────────────────────────────────────────

/**
 * ลงทะเบียน cid ↔ uid เข้า memory cache
 */
function registerCid(cid, uid) {
  cidToUidCache.set(String(cid), uid);
  uidToCidCache.set(uid, String(cid));
}

/**
 * ดึง uid จาก cid (memory only)
 */
function getUidForCid(cid) {
  return cidToUidCache.get(String(cid)) || null;
}

/**
 * ดึง cid จาก uid (memory only)
 */
function getCidForUid(uid) {
  return uidToCidCache.get(uid) || null;
}

/**
 * สร้าง/ดึง cid ให้ uid (async — ใช้ Firestore transaction)
 * @param {string} uid
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<string>} cid เป็น string ตัวเลข เช่น "10001"
 */
async function assignCid(uid, db) {
  // Fast path: มีใน cache แล้ว
  const cached = getCidForUid(uid);
  if (cached) return cached;

  // ตรวจ user_settings ก่อน — อาจมี cid เก่าอยู่แล้ว
  const userDoc = await db.collection('user_settings').doc(uid).get();
  if (userDoc.exists) {
    const existing = userDoc.data()?.widgetCid;
    if (existing && /^\d{4,8}$/.test(String(existing))) {
      const cid = String(existing);
      registerCid(cid, uid);
      return cid;
    }
  }

  // สร้าง cid ใหม่ — auto-increment counter ใน Firestore
  const counterRef = db.collection('global_counters').doc('widget_cid');
  const cid = await db.runTransaction(async (tx) => {
    const doc  = await tx.get(counterRef);
    const next = doc.exists ? (doc.data().next || 10001) : 10001;
    tx.set(counterRef, { next: next + 1 });
    return String(next);
  });

  // บันทึก cid ลง user_settings + widget_cids
  const batch = db.batch();
  batch.set(db.collection('user_settings').doc(uid), { widgetCid: cid }, { merge: true });
  batch.set(db.collection('widget_cids').doc(cid),   { uid, createdAt: Date.now() });
  await batch.commit();

  registerCid(cid, uid);
  return cid;
}

// ── Legacy token helpers (backward compat) ───────────────────────────────────

/**
 * สร้าง token ใหม่ (legacy — ไม่ใช้แล้วสำหรับ user ใหม่)
 */
function generateToken() {
  return crypto.randomBytes(16).toString('base64url');
}

function registerToken(token, uid) {
  tokenCache.set(token, uid);
  uidCache.set(uid, token);
}

function verifyTokenFromMemory(token) {
  if (!token || typeof token !== 'string') return null;
  if (token.length < 20 || token.length > 66) return null;
  return tokenCache.get(token) || null;
}

function getTokenForUid(uid) {
  return uidCache.get(uid) || null;
}

module.exports = {
  // CID (new)
  assignCid, registerCid, getUidForCid, getCidForUid,
  // Legacy token (old)
  generateToken, registerToken, verifyTokenFromMemory, getTokenForUid,
};
