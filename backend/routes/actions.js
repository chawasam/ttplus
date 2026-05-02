// routes/actions.js — ลูกเล่น TT API routes
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const { widgetLimiter } = require('../middleware/rateLimiter');
const h = require('../handlers/actions/actionsHandler');
const { getGiftCatalog } = require('../handlers/tiktok');
const { simulateEventWithResult } = require('../handlers/actions/eventProcessor');
const { listKnownViewers } = require('../utils/knownViewers');

// Actions CRUD
router.get   ('/',          verifyToken, h.getActions);
router.post  ('/',          verifyToken, h.createAction);
router.put   ('/:id',       verifyToken, h.updateAction);
router.delete('/:id',       verifyToken, h.deleteAction);

// Events CRUD
router.get   ('/events',     verifyToken, h.getEvents);
router.post  ('/events',     verifyToken, h.createEvent);
router.put   ('/events/:id', verifyToken, h.updateEvent);
router.delete('/events/:id', verifyToken, h.deleteEvent);

// Bulk import (Export/Import feature)
router.post('/import', verifyToken, h.importBackup);

// OBS Settings
router.get ('/obs-settings', verifyToken, h.getObsSettings);
router.post('/obs-settings', verifyToken, h.saveObsSettings);

// Gift Catalog — รายชื่อ gift จริงที่รวบรวมจาก TikTok live session + Firestore
router.get('/gift-catalog', verifyToken, async (req, res) => {
  try {
    const catalog = await getGiftCatalog();
    return res.json({ gifts: catalog });
  } catch (e) {
    return res.status(500).json({ error: 'ดึง gift catalog ไม่ได้' });
  }
});

// Fire action immediately (preview/test — queues to overlay widget)
router.post('/:id/fire', verifyToken, h.fireAction);

// Simulate TikTok event → trigger matching Events → fire Actions (returns result)
// Body: { type, giftName?, diamondCount?, comment?, likeCount?, nickname? }
router.post('/simulate-event', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  const { type, giftName, diamondCount, comment, likeCount, nickname } = req.body || {};

  const VALID_TYPES = ['gift', 'follow', 'subscribe', 'like', 'chat', 'share', 'join'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type ต้องเป็นหนึ่งใน: ${VALID_TYPES.join(', ')}` });
  }

  const fake = nickname || 'ทดสอบ';

  // สร้าง payload ให้ตรงกับ TikTok event จริงในแต่ละ type
  const payload = {
    uniqueId:   fake,
    nickname:   fake,
    _simulated: true,
    ...(type === 'gift' && {
      giftName:     giftName  || 'Rose',
      diamondCount: Math.max(0, parseInt(diamondCount, 10) || 1),
      repeatCount:  1,
      isRepeatEnd:  true,
    }),
    ...(type === 'like' && {
      likeCount:      Math.max(1, parseInt(likeCount, 10) || 1),
      totalLikeCount: Math.max(1, parseInt(likeCount, 10) || 1),
    }),
    ...((type === 'chat') && {
      comment: String(comment || 'ทดสอบ'),
    }),
  };

  const { matched, warnings, error } = await simulateEventWithResult(uid, type === 'chat' ? 'chat' : type, payload);

  if (error) return res.status(500).json({ error });
  res.json({
    ok: true,
    type,
    payload: { giftName: payload.giftName, diamondCount: payload.diamondCount, comment: payload.comment, nickname: fake },
    matched,
    warnings: warnings || {},
  });
});

// Known viewers — autocomplete suggestions สำหรับช่อง specific_user ใน Event builder
// คนที่เคย chat/gift/like/follow/share ระหว่าง stream → upsert ลง known_viewers/{vjUid}/list
router.get('/known-users', verifyToken, async (req, res) => {
  try {
    const users = await listKnownViewers(req.user.uid);
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: 'ดึงรายชื่อผู้ชมไม่ได้' });
  }
});

// Overlay queue — ไม่ต้อง auth (OBS Browser Source เรียกเอง)
// format ใหม่: /overlay?cid=12345&screen=1
// format เก่า: /overlay/:vjId?screen=1   (backward compat)
// ไม่ใส่ rate limiter — Socket.IO push ทำงานแล้ว endpoint นี้ถูกเรียกแค่ครั้งเดียวตอน connect/reconnect
// cid token check ใน handler เป็น protection เพียงพอ
router.get('/overlay',       h.getOverlayQueue);   // ?cid=
router.get('/overlay/:vjId', h.getOverlayQueue);   // legacy

module.exports = router;
