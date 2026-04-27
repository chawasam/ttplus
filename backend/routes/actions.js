// routes/actions.js — ลูกเล่น TT API routes
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const h = require('../handlers/actions/actionsHandler');

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

// Overlay queue — ไม่ต้อง auth (OBS Browser Source เรียกเอง)
router.get('/overlay/:vjId', h.getOverlayQueue);

module.exports = router;
