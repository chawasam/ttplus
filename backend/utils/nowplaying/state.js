// state.js — Firestore helpers สำหรับ Now Playing (Universal)
// อ่าน/เขียน user_settings.nowplayingSource และ nowplayingConfig
const admin = require('firebase-admin');

function db() { return admin.firestore(); }

const VALID_SOURCES = new Set(['lastfm', 'manual', 'extension', 'companion']);

async function getUserNP(uid) {
  const doc = await db().collection('user_settings').doc(uid).get();
  if (!doc.exists) return { source: null, config: {} };
  const data = doc.data() || {};
  return {
    source: VALID_SOURCES.has(data.nowplayingSource) ? data.nowplayingSource : null,
    config: data.nowplayingConfig || {},
  };
}

// ตั้งค่า top-level fields ของ nowplaying ใน user_settings (merge)
// patch shape: { source?: string|null, config?: object (merged ระดับ kind ภายใน) }
async function setUserNP(uid, patch) {
  const update = {};
  if ('source' in patch) {
    if (patch.source !== null && !VALID_SOURCES.has(patch.source)) {
      throw new Error(`Invalid source: ${patch.source}`);
    }
    update.nowplayingSource = patch.source;
  }
  if (patch.config) {
    // merge config keys ระดับ field (เช่น lastfm, manual, extension, companion)
    const cur = await getUserNP(uid);
    update.nowplayingConfig = { ...cur.config, ...patch.config };
  }
  await db().collection('user_settings').doc(uid).set(update, { merge: true });
}

module.exports = { getUserNP, setUserNP, VALID_SOURCES };
