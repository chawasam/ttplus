// handlers/game/roadmapConfig.js
// เก็บ roadmap feature status + notes ใน Firestore
// Admin แก้ได้ผ่าน UI โดยตรง — ไม่ต้องแตะ code
const admin = require('firebase-admin');

const DOC_PATH = 'game_config/roadmap_v1';

// ── GET /api/game/audit/roadmap ───────────────────────────────────────────────
async function getRoadmap(req, res) {
  const db = admin.firestore();
  try {
    const doc = await db.doc(DOC_PATH).get();
    const data = doc.exists ? doc.data() : { features: {} };
    res.json({ features: data.features || {}, updatedAt: data.updatedAt?.toDate?.() || null });
  } catch (err) {
    console.error('[Roadmap] getRoadmap:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── POST /api/game/audit/roadmap ─────────────────────────────────────────────
// body: { feature: 'Seasonal Events', status: 'done'|'in_progress'|'planned', note: '...' }
async function updateFeature(req, res) {
  const { feature, status, note, completedAt } = req.body;
  if (!feature || !status) {
    return res.status(400).json({ error: 'feature และ status จำเป็น' });
  }
  const validStatuses = ['done', 'in_progress', 'planned'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status ต้องเป็น done | in_progress | planned' });
  }

  const db = admin.firestore();
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.doc(DOC_PATH).set({
      features: {
        [feature]: {
          status,
          note: note || '',
          completedAt: status === 'done' ? (completedAt || new Date().toISOString()) : null,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: now,
    }, { merge: true });

    res.json({ success: true });
  } catch (err) {
    console.error('[Roadmap] updateFeature:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getRoadmap, updateFeature };
