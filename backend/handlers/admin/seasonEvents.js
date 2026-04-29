// handlers/admin/seasonEvents.js — Season & Event Management
// GET    /api/admin/season-events          — list all events
// POST   /api/admin/season-events          — create event
// PUT    /api/admin/season-events/:id      — update event
// DELETE /api/admin/season-events/:id      — delete event

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

function db() { return admin.firestore(); }

const VALID_TYPES = ['double_xp', 'double_gold', 'bonus_drop', 'limited_dungeon', 'custom'];

function validate(data) {
  if (!data.name || typeof data.name !== 'string') return 'ต้องมีชื่อ event';
  if (!VALID_TYPES.includes(data.type)) return `type "${data.type}" ไม่รองรับ`;
  if (!data.startAt || !data.endAt) return 'ต้องระบุ startAt และ endAt';
  if (Number(data.startAt) >= Number(data.endAt)) return 'startAt ต้องน้อยกว่า endAt';
  return null;
}

async function listEvents(req, res) {
  try {
    const snap = await db().collection('admin_season_events')
      .orderBy('startAt', 'desc')
      .limit(100)
      .get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ events });
  } catch (err) {
    console.error('[SeasonEvents] listEvents:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createEvent(req, res) {
  const data = req.body;
  const err = validate(data);
  if (err) return res.status(400).json({ error: err });

  try {
    const doc = {
      name:        data.name.trim().slice(0, 80),
      type:        data.type,
      description: (data.description || '').slice(0, 300),
      startAt:     Number(data.startAt),
      endAt:       Number(data.endAt),
      multiplier:  data.multiplier ? Number(data.multiplier) : 2,  // x2 default
      dungeonId:   data.dungeonId   || '',
      banner:      data.banner      || '',  // emoji หรือ URL
      active:      true,
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
      createdBy:   req.user.email,
    };
    const ref = await db().collection('admin_season_events').add(doc);
    return res.json({ success: true, id: ref.id, event: { id: ref.id, ...doc } });
  } catch (err) {
    console.error('[SeasonEvents] createEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateEvent(req, res) {
  const { id } = req.params;
  const data = req.body;
  try {
    const ref = db().collection('admin_season_events').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'ไม่พบ event' });

    const updates = {};
    const allowed = ['name','type','description','startAt','endAt','multiplier','dungeonId','banner','active'];
    for (const k of allowed) {
      if (data[k] !== undefined) updates[k] = data[k];
    }
    if (updates.startAt) updates.startAt = Number(updates.startAt);
    if (updates.endAt)   updates.endAt   = Number(updates.endAt);
    updates.updatedAt = Date.now();
    await ref.update(updates);
    return res.json({ success: true });
  } catch (err) {
    console.error('[SeasonEvents] updateEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteEvent(req, res) {
  const { id } = req.params;
  try {
    await db().collection('admin_season_events').doc(id).delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[SeasonEvents] deleteEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/game/active-events — public endpoint สำหรับ game logic ดึง active events
async function getActiveEvents(req, res) {
  try {
    const now = Date.now();
    const snap = await db().collection('admin_season_events')
      .where('active', '==', true)
      .get();
    const events = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.startAt <= now && e.endAt >= now);
    return res.json({ events });
  } catch (err) {
    console.error('[SeasonEvents] getActiveEvents:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { listEvents, createEvent, updateEvent, deleteEvent, getActiveEvents };
