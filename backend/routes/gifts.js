// routes/gifts.js — Gift Catalog API
const express         = require('express');
const router          = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getGiftCatalog } = require('../handlers/tiktok');

// ── GET /api/gifts — รายการของขวัญทั้งหมดที่รู้จัก (sorted by diamondCount) ──
// Auth required (ใช้ภายใน dashboard + simulation)
router.get('/', verifyToken, async (req, res) => {
  try {
    const gifts = await getGiftCatalog();
    res.json({ gifts, total: gifts.length });
  } catch (e) {
    res.status(500).json({ error: 'failed to load gift catalog' });
  }
});

// ── GET /api/gifts/public — public endpoint สำหรับ Actions tab (no auth) ──
// ส่งเฉพาะ name + diamondCount (ไม่ส่ง pictureUrl เพื่อลด payload)
router.get('/public', async (req, res) => {
  try {
    const gifts = await getGiftCatalog();
    res.json({ gifts: gifts.map(g => ({ name: g.name, diamondCount: g.diamondCount, pictureUrl: g.pictureUrl || '' })) });
  } catch (e) {
    res.status(500).json({ gifts: [] });
  }
});

module.exports = router;
