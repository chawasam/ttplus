// routes/actions.js — ลูกเล่น TT API routes
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const h = require('../handlers/actions/actionsHandler');
const { getGiftCatalog } = require('../handlers/tiktok');

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

// Overlay queue — ไม่ต้อง auth (OBS Browser Source เรียกเอง)
// format ใหม่: /overlay?cid=12345&screen=1
// format เก่า: /overlay/:vjId?screen=1   (backward compat)
router.get('/overlay',      h.getOverlayQueue);   // ?cid=
router.get('/overlay/:vjId', h.getOverlayQueue);  // legacy

module.exports = router;
