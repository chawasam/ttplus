// routes/leaderboard.js — public leaderboard API (no auth required)
// รองรับทั้ง format ใหม่ (?cid=) และเก่า (/:vjId) เพื่อ backward compat
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');
const { getLeaderboard, loadLeaderboardFromFirestore } = require('../handlers/tiktok');
const { getUidForCid, registerCid } = require('../utils/widgetToken');
const { trackRead } = require('../utils/readTracker');

// ── ดึง uid จาก cid (memory cache → Firestore fallback) ─────────────────────
async function resolveCid(cid) {
  const uid = getUidForCid(cid);
  if (uid) return uid;
  try {
    const doc = await admin.firestore().collection('widget_cids').doc(String(cid)).get();
    if (doc.exists && doc.data()?.uid) {
      trackRead('leaderboard.resolveCid', 1);
      registerCid(cid, doc.data().uid);
      return doc.data().uid;
    }
  } catch {}
  return null;
}

// GET /api/leaderboard?cid=12345&type=likes|gifts   ← format ใหม่ (มาตรฐาน)
// GET /api/leaderboard/:vjId?type=likes|gifts        ← format เก่า (backward compat)
router.get('/:vjId?', async (req, res) => {
  const type = req.query.type === 'likes' ? 'likes' : 'gifts';

  let vjId = req.params.vjId || '';  // format เก่า: /api/leaderboard/UID
  const cid = req.query.cid || '';   // format ใหม่: ?cid=12345

  // ถ้าส่ง ?cid= มา → resolve เป็น uid ก่อน
  if (!vjId && cid) {
    if (!/^\d{4,8}$/.test(cid)) return res.status(400).json({ error: 'invalid cid' });
    vjId = await resolveCid(cid);
    if (!vjId) return res.json({ type, data: [], updatedAt: Date.now() }); // ยังไม่มีข้อมูล
  }

  if (!vjId || vjId.length > 128) return res.status(400).json({ error: 'ต้องระบุ cid หรือ vjId' });

  // ดึงจาก in-memory ก่อน (fast path)
  const data = getLeaderboard(vjId, type);
  if (data.length > 0) return res.json({ type, data, updatedAt: Date.now() });

  // Fallback: โหลดจาก Firestore และ populate in-memory Maps ด้วย
  // ทำให้ request ถัดๆ ไปใช้ in-memory (fast path) ไม่ต้องอ่าน Firestore ซ้ำ
  trackRead('leaderboard.firestoreFallback', 1);
  try {
    await loadLeaderboardFromFirestore(vjId);
    const freshData = getLeaderboard(vjId, type);
    if (freshData.length > 0) return res.json({ type, data: freshData, updatedAt: Date.now() });
  } catch {}

  res.json({ type, data: [], updatedAt: Date.now() });
});

module.exports = router;
