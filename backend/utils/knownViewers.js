// utils/knownViewers.js — Track viewers ที่เคย interact (chat/gift/like/follow/share)
// ใช้สำหรับ autocomplete TikTok username ใน Actions builder
//
// Schema: known_viewers/{vjUid}/list/{uniqueId}
//   { uniqueId, nickname, profilePictureUrl, lastSeenAt, eventCount, lastEventType }
//
// กลยุทธ์ลด Firestore writes:
// 1. Per-viewer debounce 30s — เห็น 5 events ใน 30 วิ → 1 write
// 2. In-memory pending map — รอ flush รวมก่อน
// 3. Fire-and-forget — ไม่ block event handlers

const admin = require('firebase-admin');
const { trackRead } = require('./readTracker');

const COLLECTION       = 'known_viewers';
const DEBOUNCE_MS      = 30_000;       // รอ 30 วิ ค่อยเขียน Firestore
const READ_CACHE_TTL   = 60_000;       // cache รายชื่อ 60 วิ ต่อ vjUid
const MAX_LIST_RESULTS = 500;

function db() { return admin.firestore(); }
function vjListCol(vjUid) { return db().collection(COLLECTION).doc(vjUid).collection('list'); }

// ─── Pending state per (vjUid, uniqueId) ────────────────────────────────────
// Map<`${vjUid}_${uniqueId}`, { vjUid, viewer, timer, eventCounts: { type: count }, firstAt }>
const _pending = new Map();

// In-memory list cache per vjUid: Map<vjUid, { data: [], expiresAt }>
const _listCache = new Map();

function cacheKey(vjUid, uniqueId) { return `${vjUid}_${uniqueId}`; }

// บันทึกครั้งเดียวเมื่อ debounce timer หมด — รวม event counts ทั้งหมดในช่วงนั้น
async function _flush(key) {
  const entry = _pending.get(key);
  if (!entry) return;
  _pending.delete(key);

  const { vjUid, viewer, eventCounts, firstAt } = entry;
  const totalNew = Object.values(eventCounts).reduce((s, n) => s + n, 0);
  if (totalNew === 0) return;

  try {
    const ref = vjListCol(vjUid).doc(viewer.uniqueId);
    // Use set with merge — atomic upsert; eventCount accumulates with FieldValue.increment
    await ref.set({
      uniqueId:          viewer.uniqueId,
      nickname:          viewer.nickname || viewer.uniqueId,
      profilePictureUrl: viewer.profilePictureUrl || '',
      lastSeenAt:        Date.now(),
      lastEventType:     entry.lastType || 'chat',
      eventCount:        admin.firestore.FieldValue.increment(totalNew),
      firstSeenAt:       admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Invalidate read cache สำหรับ vjUid นี้ — list ใหม่จะมี viewer คนนี้
    _listCache.delete(vjUid);
  } catch (err) {
    // silent — ไม่ break event flow
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[knownViewers] flush failed:', err.message);
    }
  }
}

// recordKnownViewer — เรียกจาก event handlers
// fire-and-forget; debounced; safe ที่จะเรียก hi-frequency
function recordKnownViewer(vjUid, viewer, eventType = 'chat') {
  if (!vjUid || !viewer || !viewer.uniqueId) return;
  if (typeof viewer.uniqueId !== 'string' || viewer.uniqueId.length > 100) return;

  const key = cacheKey(vjUid, viewer.uniqueId);
  const now = Date.now();
  let entry = _pending.get(key);

  if (!entry) {
    entry = {
      vjUid,
      viewer: {
        uniqueId:          viewer.uniqueId,
        nickname:          viewer.nickname || viewer.uniqueId,
        profilePictureUrl: viewer.profilePictureUrl || '',
      },
      eventCounts: {},
      firstAt:    now,
      lastType:   eventType,
      timer:      null,
    };
    _pending.set(key, entry);
  } else {
    // Update viewer info ถ้า nickname/avatar เปลี่ยน
    if (viewer.nickname)          entry.viewer.nickname = viewer.nickname;
    if (viewer.profilePictureUrl) entry.viewer.profilePictureUrl = viewer.profilePictureUrl;
    entry.lastType = eventType;
  }

  entry.eventCounts[eventType] = (entry.eventCounts[eventType] || 0) + 1;

  // Reset debounce timer
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => _flush(key), DEBOUNCE_MS);
}

// listKnownViewers — สำหรับ endpoint /api/actions/known-users
// Returns sorted by lastSeenAt desc, max MAX_LIST_RESULTS
async function listKnownViewers(vjUid) {
  if (!vjUid) return [];

  const cached = _listCache.get(vjUid);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const snap = await vjListCol(vjUid)
      .orderBy('lastSeenAt', 'desc')
      .limit(MAX_LIST_RESULTS)
      .get();
    trackRead('knownViewers.list', snap.size);

    const data = snap.docs.map(d => {
      const v = d.data();
      return {
        uniqueId:          v.uniqueId,
        nickname:          v.nickname || v.uniqueId,
        profilePictureUrl: v.profilePictureUrl || '',
        lastSeenAt:        v.lastSeenAt || 0,
        eventCount:        v.eventCount || 0,
        lastEventType:     v.lastEventType || '',
      };
    });

    _listCache.set(vjUid, { data, expiresAt: Date.now() + READ_CACHE_TTL });
    return data;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[knownViewers] list failed:', err.message);
    }
    return [];
  }
}

// Force flush ทุก pending entries — ใช้ตอน VJ disconnect เพื่อให้ data ไม่หายถ้า server crash ก่อน timer ยิง
async function flushAllPending() {
  const keys = Array.from(_pending.keys());
  await Promise.all(keys.map(_flush));
}

// invalidateListCache — เรียกเมื่อมี changes ที่อยากให้ list refresh ทันที
function invalidateListCache(vjUid) {
  if (vjUid) _listCache.delete(vjUid);
  else _listCache.clear();
}

module.exports = {
  recordKnownViewer,
  listKnownViewers,
  flushAllPending,
  invalidateListCache,
};
