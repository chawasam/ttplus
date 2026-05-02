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
const { trackRead } = require('../../utils/readTracker');
const { fillTemplate } = require('./eventProcessor');
const { emitToUser, emitToWidgetRoom } = require('../../lib/emitter');

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
    trackRead('actionsHandler.getActions', snap.size);
    // ใส่ id ไว้ท้ายสุดเพื่อให้ Firestore document ID ชนะ field 'id' ที่อาจติดมาใน data
    const actions = snap.docs.map(d => ({ ...d.data(), id: d.id }));
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
      obsScene:        data.obsScene        || '',   // ชื่อ scene ที่จะสลับไป
      obsSceneReturn:  data.obsSceneReturn  ?? false, // กลับ scene เดิมหลังจบ
      obsSceneDuration: data.obsSceneDuration ?? 0,  // 0 = เปิดตลอด, >0 = กี่วินาทีแล้วกลับ
      obsSource:       data.obsSource       || '',   // ชื่อ source ที่จะ activate
      obsSourceReturn: data.obsSourceReturn ?? false, // ปิด source กลับหลังจบ
      obsSourceDuration: data.obsSourceDuration ?? 0,
      // Display settings
      displayDuration: data.displayDuration ?? 5,   // วินาที
      overlayScreen:   data.overlayScreen   ?? 1,   // 1 หรือ 2
      volume:          data.volume          ?? 100, // ระดับเสียง 0-100
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
      'obsScene','obsSceneReturn','obsSceneDuration','obsSource','obsSourceReturn','obsSourceDuration',
      'displayDuration','overlayScreen','volume','globalCooldown','userCooldown',
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
    trackRead('actionsHandler.getEvents', snap.size);
    // id ไว้ท้ายสุดเพื่อให้ Firestore document ID ชนะ field 'id' ใน data
    const events = snap.docs.map(d => ({ ...d.data(), id: d.id }));
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

  // Validate + sanitize
  const safeHost = String(host || 'localhost').replace(/[^\w.\-]/g, '').slice(0, 255) || 'localhost';
  const safePort = parseInt(port, 10) || 4455;
  if (safePort < 1 || safePort > 65535) return res.status(400).json({ error: 'Invalid port (1-65535)' });
  const safePass = String(password || '').slice(0, 256);

  try {
    await db().collection('tt_obs_settings').doc(uid).set({
      uid,
      host:     safeHost,
      port:     safePort,
      password: safePass,
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
    // Query เฉพาะ vjUid (single-field index — Firestore auto-create ไม่ต้องสร้างเอง)
    // sort + filter screen ใน JS เพื่อหลีกเลี่ยง composite index
    const snap = await db().collection('tt_action_queue')
      .where('vjUid', '==', vjId)
      .limit(20)
      .get();
    trackRead('myactions.overlayQueue', snap.size);

    if (snap.empty) return res.json({ item: null });

    // filter screen แล้ว sort queuedAt asc → เอาอันเก่าสุด
    const matching = snap.docs
      .filter(d => (d.data().screen ?? 1) === screen)
      .sort((a, b) => (a.data().queuedAt || 0) - (b.data().queuedAt || 0));

    if (matching.length === 0) return res.json({ item: null });

    const doc  = matching[0];
    const item = { id: doc.id, ...doc.data() };

    // Delete immediately — keeps Firestore clean (no need for played/cleanup jobs)
    await doc.ref.delete();

    return res.json({ item });
  } catch (err) {
    console.error('[Actions] getOverlayQueue:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── Import Backup ────────────────────────────────────────────────────────────
async function importBackup(req, res) {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const { actions: importedActions = [], events: importedEvents = [] } = req.body || {};
  if (!Array.isArray(importedActions) || !Array.isArray(importedEvents)) {
    return res.status(400).json({ error: 'actions และ events ต้องเป็น array' });
  }

  try {
    const firestore = db();

    // Firestore batch limit = 500 ops — แบ่ง ops ออกเป็น chunks ป้องกัน overflow
    // helper: commit batch แล้วสร้างใหม่
    const BATCH_LIMIT = 490; // safety margin
    let currentBatch = firestore.batch();
    let opCount = 0;

    async function flushIfNeeded() {
      if (opCount >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = firestore.batch();
        opCount = 0;
      }
    }

    // ลบ actions เดิม
    const [oldActions, oldEvents] = await Promise.all([
      firestore.collection('tt_actions').where('uid', '==', uid).get(),
      firestore.collection('tt_events').where('uid', '==', uid).get(),
    ]);
    for (const d of oldActions.docs) { currentBatch.delete(d.ref); opCount++; await flushIfNeeded(); }
    for (const d of oldEvents.docs)  { currentBatch.delete(d.ref); opCount++; await flushIfNeeded(); }

    // เพิ่ม actions ใหม่
    // ลบ field 'id' ออกก่อนบันทึก — 'id' ไม่ใช่ Firestore field แต่เป็น doc ID
    // ถ้าไม่ลบ getActions จะส่ง id เก่าจาก backup ไปให้ frontend แทน Firestore doc ID ใหม่
    for (const a of importedActions.slice(0, 200)) {
      const { id: _id, ...aData } = a; // eslint-disable-line no-unused-vars
      const ref = firestore.collection('tt_actions').doc();
      currentBatch.set(ref, { ...aData, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      opCount++; await flushIfNeeded();
    }

    // เพิ่ม events ใหม่
    for (const e of importedEvents.slice(0, 200)) {
      const { id: _id, ...eData } = e; // eslint-disable-line no-unused-vars
      const ref = firestore.collection('tt_events').doc();
      currentBatch.set(ref, { ...eData, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      opCount++; await flushIfNeeded();
    }

    if (opCount > 0) await currentBatch.commit();
    return res.json({ ok: true, actions: importedActions.length, events: importedEvents.length });
  } catch (err) {
    console.error('[Actions] importBackup:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── Fire Action (preview/test — queues to overlay) ───────────────────────────
async function fireAction(req, res) {
  const { id } = req.params;
  const uid = req.user.uid;
  console.log('[Actions] fireAction id=%s uid=%s', id, uid);

  try {
    const snap = await db().collection('tt_actions').doc(id).get();
    console.log('[Actions] fireAction exists=%s docUid=%s', snap.exists, snap.data()?.uid);
    if (!snap.exists || snap.data().uid !== uid) {
      return res.status(404).json({ error: 'ไม่พบ Action' });
    }
    const action = { id: snap.id, ...snap.data() };
    const context = { username: 'ทดสอบ', giftname: 'Rose', coins: 100, likeCount: 0 };

    // OBS path: ส่งผ่าน socket ไปหา dashboard ก่อน (ถ้า dashboard เปิดอยู่)
    const OBS_TYPES = ['switch_obs_scene', 'activate_obs_source'];
    const hasObs = action.types?.some(t => OBS_TYPES.includes(t));
    let obsHandledBySocket = false;
    if (hasObs) {
      obsHandledBySocket = emitToUser(uid, 'obs_action', {
        types:           action.types,
        obsScene:        action.obsScene        || '',
        obsSceneReturn:  action.obsSceneReturn  ?? false,
        obsSource:       action.obsSource       || '',
        obsSourceReturn: action.obsSourceReturn ?? false,
        displayDuration: action.displayDuration ?? 5,
        name:            action.name || '',
      });
    }

    const item = {
      vjUid:           uid,
      screen:          action.overlayScreen || 1,
      actionId:        action.id,
      types:           action.types,
      pictureUrl:      action.pictureUrl  || '',
      videoUrl:        action.videoUrl    || '',
      audioUrl:        action.audioUrl    || '',
      alertText:       fillTemplate(action.alertText  || '', context),
      ttsText:         fillTemplate(action.ttsText    || '', context),
      obsScene:        action.obsScene        || '',
      obsSceneReturn:  action.obsSceneReturn  ?? false,
      obsSource:       action.obsSource       || '',
      obsSourceReturn: action.obsSourceReturn ?? false,
      obsHandledBySocket,
      displayDuration: action.displayDuration ?? 5,
      fadeInOut:       action.fadeInOut       ?? true,
      volume:          action.volume          ?? 100,
      username:        context.username,
      giftname:        context.giftname,
      queuedAt:        Date.now(),
      // nonce: dedup key ป้องกัน widget เล่น action 2 ครั้งเมื่อรับทั้ง socket push + drainQueue
      nonce:           `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      isPreview:       true,
    };

    await db().collection('tt_action_queue').add(item);

    // Socket push — widget รับ action ทันทีโดยไม่ต้องรอ poll
    emitToWidgetRoom(uid, 'new_action', item);

    return res.json({ success: true, actionName: action.name });
  } catch (err) {
    console.error('[Actions] fireAction:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getActions, createAction, updateAction, deleteAction,
  getEvents,  createEvent,  updateEvent,  deleteEvent,
  saveObsSettings, getObsSettings,
  getOverlayQueue,
  importBackup,
  fireAction,
};
