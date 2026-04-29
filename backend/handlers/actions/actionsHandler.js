// handlers/actions/actionsHandler.js — ลูกเล่น TT: Actions & Events system
// GET    /api/actions              — ดู actions + events ทั้งหมดของ VJ
// POST   /api/actions              — สร้าง action ใหม่
// PUT    /api/actions/:id          — แก้ action
// DELETE /api/actions/:id          — ลบ action
// GET    /api/actions/events       — ดู events ทั้งหมด
// POST   /api/actions/events       — สร้าง event ใหม่
// PUT    /api/actions/events/:id   — แก้ event
// DELETE /api/actions/events/:id   — ลบ event
// GET    /api/actions/overlay/:screen — Overlay widget queue (Screen 1 or 2)
// POST   /api/actions/obs-settings — บันทึก OBS WebSocket settings

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { getUidForCid, registerCid } = require('../../utils/widgetToken');

// ─── Helpers ───────────────────────────────────────────────────────────────

function db() { return admin.firestore(); }

function validateAction(data) {
  if (!data.name || typeof data.name !== 'string') return 'ต้องมีชื่อ action';
  if (!Array.isArray(data.types) || data.types.length === 0) return 'ต้องเลือก action type อย่างน้อย 1 อย่าง';
  const validTypes = ['show_picture','play_video','play_audio','show_alert','read_tts','switch_obs_scene','activate_obs_source'];
  for (const t of data.types) {
    if (!validTypes.includes(t)) return `action type "${t}" ไม่รองรับ`;
  }
  return null;
}

function validateEvent(data) {
  if (!data.trigger) return 'ต้องเลือก trigger';
  const validTriggers = [
    'join','first_activity','share','follow','subscribe',
    'likes','chat','command','gift_min_coins','specific_gift',
    'subscriber_emote','fan_club_sticker','tiktok_shop',
  ];
  if (!validTriggers.includes(data.trigger)) return `trigger "${data.trigger}" ไม่รองรับ`;
  if (!data.actionIds?.length && !data.randomActionIds?.length) return 'ต้องเลือก action อย่างน้อย 1 อย่าง';
  return null;
}

// ─── ACTIONS CRUD ──────────────────────────────────────────────────────────

async function getActions(req, res) {
  const uid = req.user.uid;
  try {
    const snap = await db().collection('tt_actions').where('uid', '==', uid).get();
    const actions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ actions });
  } catch (err) {
    console.error('[Actions] getActions:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createAction(req, res) {
  const uid = req.user.uid;
  const data = req.body;
  const err = validateAction(data);
  if (err) return res.status(400).json({ error: err });

  try {
    const action = {
      uid,
      name:        data.name.trim().slice(0, 60),
      types:       data.types,
      // Media URLs (option A — VJ ใส่ URL เอง)
      pictureUrl:  data.pictureUrl  || '',
      videoUrl:    data.videoUrl    || '',
      audioUrl:    data.audioUrl    || '',
      // Alert
      alertText:   data.alertText   || 'ขอบคุณ {username}! 🎉',
      // TTS
      ttsText:     data.ttsText     || 'ขอบคุณ {username} ที่ส่ง {giftname}!',
      // OBS WebSocket
      obsScene:    data.obsScene    || '',          // ชื่อ scene ที่จะสลับไป
      obsSceneDuration: data.obsSceneDuration ?? 0, // 0 = เปิดตลอด, >0 = กี่วินาทีแล้วกลับ
      obsSource:   data.obsSource   || '',          // ชื่อ source ที่จะ activate
      obsSourceDuration: data.obsSourceDuration ?? 0,
      // Display settings
      displayDuration: data.displayDuration ?? 5,   // วินาที
      overlayScreen:   data.overlayScreen   ?? 1,   // 1 หรือ 2
      globalCooldown:  data.globalCooldown  ?? 0,   // วินาที
      userCooldown:    data.userCooldown    ?? 0,
      fadeInOut:       data.fadeInOut       ?? true,
      repeatWithCombos: data.repeatWithCombos ?? false,
      // Meta
      enabled:   true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ref = await db().collection('tt_actions').add(action);
    return res.json({ success: true, id: ref.id, action: { id: ref.id, ...action } });
  } catch (err) {
    console.error('[Actions] createAction:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAction(req, res) {
  const uid = req.user.uid;
  const { id } = req.params;
  const data = req.body;

  try {
    const ref = db().collection('tt_actions').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().uid !== uid) return res.status(404).json({ error: 'ไม่พบ action' });

    const updates = {};
    const allowed = [
      'name','types','pictureUrl','videoUrl','audioUrl','alertText','ttsText',
      'obsScene','obsSceneDuration','obsSource','obsSourceDuration',
      'displayDuration','overlayScreen','globalCooldown','userCooldown',
      'fadeInOut','repeatWithCombos','enabled',
    ];
    for (const k of allowed) {
      if (data[k] !== undefined) updates[k] = data[k];
    }
    updates.updatedAt = Date.now();

    await ref.update(updates);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Actions] updateAction:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAction(req, res) {
  const uid = req.user.uid;
  const { id } = req.params;
  try {
    const ref = db().collection('tt_actions').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().uid !== uid) return res.status(404).json({ error: 'ไม่พบ action' });
    await ref.delete();
    // ลบ events ที่อ้างถึง action นี้ด้วย
    const evSnap = await db().collection('tt_events')
      .where('uid', '==', uid).get();
    const batch = db().batch();
    evSnap.docs.forEach(d => {
      const ev = d.data();
      const newIds = (ev.actionIds || []).filter(a => a !== id);
      const newRand = (ev.randomActionIds || []).filter(a => a !== id);
      if (newIds.length === 0 && newRand.length === 0) {
        batch.delete(d.ref);
      } else {
        batch.update(d.ref, { actionIds: newIds, randomActionIds: newRand, updatedAt: Date.now() });
      }
    });
    await batch.commit();
    return res.json({ success: true });
  } catch (err) {
    console.error('[Actions] deleteAction:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── EVENTS CRUD ───────────────────────────────────────────────────────────

async function getEvents(req, res) {
  const uid = req.user.uid;
  try {
    const snap = await db().collection('tt_events').where('uid', '==', uid).get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ events });
  } catch (err) {
    console.error('[Actions] getEvents:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createEvent(req, res) {
  const uid = req.user.uid;
  const data = req.body;
  const err = validateEvent(data);
  if (err) return res.status(400).json({ error: err });

  try {
    const event = {
      uid,
      trigger:         data.trigger,
      // Who can trigger
      whoCanTrigger:   data.whoCanTrigger || 'everyone', // everyone/follower/subscriber/moderator/top_gifter/specific_user
      specificUser:    data.specificUser  || '',
      teamMemberLevel: data.teamMemberLevel ?? 0,
      // Trigger params
      keyword:         data.keyword        || '',   // สำหรับ command trigger
      minCoins:        data.minCoins       ?? 0,    // สำหรับ gift_min_coins
      specificGiftName: data.specificGiftName || '', // สำหรับ specific_gift
      likesCount:      data.likesCount     ?? 1,    // สำหรับ likes trigger
      // Actions
      actionIds:       data.actionIds       || [],  // trigger ทั้งหมด
      randomActionIds: data.randomActionIds || [],  // trigger แบบสุ่ม 1 อัน
      enabled:   true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ref = await db().collection('tt_events').add(event);
    return res.json({ success: true, id: ref.id, event: { id: ref.id, ...event } });
  } catch (err) {
    console.error('[Actions] createEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateEvent(req, res) {
  const uid = req.user.uid;
  const { id } = req.params;
  const data = req.body;

  try {
    const ref = db().collection('tt_events').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().uid !== uid) return res.status(404).json({ error: 'ไม่พบ event' });

    const updates = {};
    const allowed = [
      'trigger','whoCanTrigger','specificUser','teamMemberLevel',
      'keyword','minCoins','specificGiftName','likesCount',
      'actionIds','randomActionIds','enabled',
    ];
    for (const k of allowed) {
      if (data[k] !== undefined) updates[k] = data[k];
    }
    updates.updatedAt = Date.now();
    await ref.update(updates);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Actions] updateEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteEvent(req, res) {
  const uid = req.user.uid;
  const { id } = req.params;
  try {
    const ref = db().collection('tt_events').doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().uid !== uid) return res.status(404).json({ error: 'ไม่พบ event' });
    await ref.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error('[Actions] deleteEvent:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── OBS SETTINGS ──────────────────────────────────────────────────────────

async function saveObsSettings(req, res) {
  const uid = req.user.uid;
  const { host, port, password } = req.body;
  try {
    await db().collection('tt_obs_settings').doc(uid).set({
      uid,
      host:     host     || 'localhost',
      port:     port     || 4455,
      password: password || '',
      updatedAt: Date.now(),
    }, { merge: true });
    return res.json({ success: true });
  } catch (err) {
    console.error('[Actions] saveObsSettings:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getObsSettings(req, res) {
  const uid = req.user.uid;
  try {
    const doc = await db().collection('tt_obs_settings').doc(uid).get();
    return res.json({ settings: doc.exists ? doc.data() : { host: 'localhost', port: 4455, password: '' } });
  } catch (err) {
    console.error('[Actions] getObsSettings:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── OVERLAY QUEUE (for OBS Browser Source) ────────────────────────────────
// Widget polls นี้เพื่อดึง action ที่ต้องแสดง

// ── ดึง uid จาก cid (memory → Firestore fallback) ──────────────────────────
async function resolveCidToUid(cid) {
  const uid = getUidForCid(cid);
  if (uid) return uid;
  try {
    const doc = await db().collection('widget_cids').doc(String(cid)).get();
    if (doc.exists && doc.data()?.uid) {
      registerCid(cid, doc.data().uid);
      return doc.data().uid;
    }
  } catch {}
  return null;
}

async function getOverlayQueue(req, res) {
  // รองรับทั้ง format ใหม่ (?cid=) และเก่า (/:vjId param)
  let vjId = req.params.vjId || '';
  const cid = req.query.cid || '';
  const screen = parseInt(req.query.screen) || 1;

  if (!vjId && cid) {
    if (!/^\d{4,8}$/.test(cid)) return res.status(400).json({ error: 'invalid cid' });
    vjId = await resolveCidToUid(cid);
    if (!vjId) return res.json({ item: null }); // ยังไม่มีข้อมูล
  }

  if (!vjId) return res.status(400).json({ error: 'ต้องระบุ cid หรือ vjId' });

  try {
    const snap = await db().collection('tt_action_queue')
      .where('vjUid', '==', vjId)
      .where('screen', '==', screen)
      .where('played', '==', false)
      .orderBy('queuedAt', 'asc')
      .limit(1)
      .get();

    if (snap.empty) return res.json({ item: null });

    const doc = snap.docs[0];
    const item = { id: doc.id, ...doc.data() };

    // Delete immediately — keeps Firestore clean (no need for played/cleanup jobs)
    await doc.ref.delete();

    return res.json({ item });
  } catch (err) {
    console.error('[Actions] getOverlayQueue:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getActions, createAction, updateAction, deleteAction,
  getEvents,  createEvent,  updateEvent,  deleteEvent,
  saveObsSettings, getObsSettings,
  getOverlayQueue,
};
