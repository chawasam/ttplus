// handlers/admin/ideas.js — Product Lab idea management (owner-only)
// GET    /api/admin/ideas        — list all ideas (with optional ?since=ms for delta sync)
// POST   /api/admin/ideas        — create idea
// PATCH  /api/admin/ideas/:id    — update idea (auto-tracks status change in history)
// DELETE /api/admin/ideas/:id    — delete idea
// POST   /api/admin/ideas/bulk   — import ideas in bulk (used for localStorage migration)

const admin = require('firebase-admin');

function db() { return admin.firestore(); }

const COLLECTION = 'product_lab_ideas';
const VALID_STATUS = ['idea', 'plan', 'build', 'done'];
const MAX_TAGS = 10;
const MAX_TAG_LEN = 30;
const MAX_HISTORY = 50;

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function sanitizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(t => typeof t === 'string')
    .map(t => t.trim().slice(0, MAX_TAG_LEN))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

// แปลง raw input เป็น object พร้อม validation — ใช้ทั้งใน create และ update
// ส่ง { partial: true } เพื่อข้าม required fields (สำหรับ PATCH)
function buildDoc(input, { partial = false } = {}) {
  const out = {};
  const errs = [];

  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) errs.push('ชื่อ idea ห้ามว่าง');
    else out.name = name.slice(0, 200);
  } else if (!partial) {
    errs.push('ต้องระบุชื่อ idea');
  }

  if (input.desc !== undefined) {
    out.desc = typeof input.desc === 'string' ? input.desc.slice(0, 5000) : '';
  } else if (!partial) {
    out.desc = '';
  }

  if (input.impact !== undefined) out.impact = clampInt(input.impact, 1, 5, 3);
  else if (!partial) out.impact = 3;

  if (input.effort !== undefined) out.effort = clampInt(input.effort, 1, 5, 3);
  else if (!partial) out.effort = 3;

  if (input.status !== undefined) {
    if (!VALID_STATUS.includes(input.status)) errs.push(`status "${input.status}" ไม่ถูกต้อง`);
    else out.status = input.status;
  } else if (!partial) {
    out.status = 'idea';
  }

  if (input.tags !== undefined) out.tags = sanitizeTags(input.tags);
  else if (!partial) out.tags = [];

  if (input.order !== undefined) out.order = clampInt(input.order, 0, 999999, 0);

  return { doc: out, error: errs[0] || null };
}

// list — ทุก idea ของ owner (กรองด้วย ownerEmail)
async function listIdeas(req, res) {
  try {
    const snap = await db().collection(COLLECTION)
      .where('ownerEmail', '==', req.user.email)
      .limit(500)
      .get();
    const ideas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ ideas });
  } catch (err) {
    console.error('[Ideas] list:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createIdea(req, res) {
  const { doc, error } = buildDoc(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const now = Date.now();
    const data = {
      ...doc,
      tags:       doc.tags || [],
      order:      doc.order ?? now,  // ใหม่สุดอยู่ล่าง (sort by order asc ใน column)
      history:    [],
      ownerEmail: req.user.email,
      createdAt:  now,
      updatedAt:  now,
    };
    const ref = await db().collection(COLLECTION).add(data);
    return res.json({ success: true, idea: { id: ref.id, ...data } });
  } catch (err) {
    console.error('[Ideas] create:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateIdea(req, res) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.length > 64) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { doc: updates, error } = buildDoc(req.body || {}, { partial: true });
  if (error) return res.status(400).json({ error });
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'ไม่มี field ที่จะอัปเดต' });
  }

  try {
    const ref = db().collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'ไม่พบ idea' });

    const cur = snap.data();
    if (cur.ownerEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // status change → push to history
    if (updates.status && updates.status !== cur.status) {
      const history = Array.isArray(cur.history) ? cur.history.slice() : [];
      history.push({ at: Date.now(), from: cur.status, to: updates.status });
      // เก็บแค่ MAX_HISTORY entries ล่าสุด
      updates.history = history.slice(-MAX_HISTORY);
    }
    updates.updatedAt = Date.now();

    await ref.update(updates);
    const after = await ref.get();
    return res.json({ success: true, idea: { id: after.id, ...after.data() } });
  } catch (err) {
    console.error('[Ideas] update:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteIdea(req, res) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.length > 64) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const ref = db().collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.json({ success: true }); // idempotent

    if (snap.data().ownerEmail !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await ref.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[Ideas] delete:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// bulk import — สำหรับ migrate ของจาก localStorage ครั้งเดียวตอนแรก
async function bulkImportIdeas(req, res) {
  const { ideas } = req.body || {};
  if (!Array.isArray(ideas)) return res.status(400).json({ error: 'ideas ต้องเป็น array' });
  if (ideas.length > 200)    return res.status(400).json({ error: 'มากกว่า 200 ideas — ลด batch ลง' });

  try {
    const batch = db().batch();
    const col = db().collection(COLLECTION);
    const now = Date.now();
    const created = [];

    for (const raw of ideas) {
      const { doc, error } = buildDoc(raw);
      if (error) continue; // skip invalid
      const ref = col.doc();
      const data = {
        ...doc,
        tags:       doc.tags || [],
        order:      doc.order ?? (raw.created || now),
        history:    [],
        ownerEmail: req.user.email,
        createdAt:  raw.created || now,
        updatedAt:  now,
      };
      batch.set(ref, data);
      created.push({ id: ref.id, ...data });
    }
    await batch.commit();
    return res.json({ success: true, count: created.length, ideas: created });
  } catch (err) {
    console.error('[Ideas] bulk:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { listIdeas, createIdea, updateIdea, deleteIdea, bulkImportIdeas };
