// routes/coinjar.js — CoinJar widget API routes
const express          = require('express');
const router           = express.Router();
const { verifyToken }  = require('../middleware/auth');
const { emitToWidgetRoom }   = require('../lib/emitter');
const { getGiftCatalog }     = require('../handlers/tiktok');
const { processEvent }       = require('../handlers/actions/eventProcessor');

// ── Fallback gift list (ใช้เมื่อ catalog ยังว่างอยู่ — เช่น server เพิ่ง start) ──
const FALLBACK_GIFTS = [
  { name: 'Rose',                diamondCount: 1     },
  { name: 'TikTok',              diamondCount: 1     },
  { name: 'Finger Heart',        diamondCount: 5     },
  { name: 'Ice Cream Cone',      diamondCount: 10    },
  { name: 'Friendship Necklace', diamondCount: 29    },
  { name: 'Hand Heart',          diamondCount: 100   },
  { name: 'Galaxy',              diamondCount: 500   },
  { name: 'Mic',                 diamondCount: 1000  },
  { name: 'Lion',                diamondCount: 29999 },
  { name: 'Universe',            diamondCount: 34999 },
];

const FAKE_SENDERS = ['แฟนคลับ', 'Supporter', 'ผู้ชม', 'นักช้อป', 'สาวกสาม', 'เพื่อนซี้'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── POST /api/coinjar/simulate — ส่ง gift จำลองไปยัง widget จริงของ user ──
// Auth required — emit ไปยัง widget_${uid} room เท่านั้น
// Body: { giftName?: string } — ถ้าไม่ส่ง giftName จะ random
router.post('/simulate', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  // ดึง catalog จริง (โหลดจาก Firestore ถ้ายังไม่ได้โหลด)
  let catalog = [];
  try { catalog = await getGiftCatalog(); } catch { /* ใช้ fallback */ }

  const giftPool = catalog.length > 0 ? catalog : FALLBACK_GIFTS;

  // เลือก gift — ถ้าส่ง giftName มาให้หาจาก catalog ก่อน ไม่เจอค่อย random
  const { giftName } = req.body || {};
  let gift;
  if (giftName) {
    gift = giftPool.find(g => g.name === giftName) || FALLBACK_GIFTS.find(g => g.name === giftName);
  }
  if (!gift) gift = pickRandom(giftPool);

  // random repeat count 1–3
  const repeatCount = Math.floor(Math.random() * 3) + 1;

  const payload = {
    type:              'gift',
    uniqueId:          'simulate',
    nickname:          pickRandom(FAKE_SENDERS),
    profilePictureUrl: '',
    giftName:          gift.name,
    giftPictureUrl:    gift.pictureUrl || '',
    diamondCount:      gift.diamondCount || 0,
    repeatCount,
    isStreakable:      false,  // non-streakable → isRepeatEnd จะเป็น true เสมอ
    isRepeatEnd:       true,
    timestamp:         Date.now(),
    _simulated:        true,   // flag เผื่อ widget ต้องการรู้ว่าเป็น simulation
  };

  // 1. ส่งไป CoinJar / Widget (fireworks, leaderboard ฯลฯ)
  emitToWidgetRoom(uid, 'gift', payload);

  // 2. ส่งเข้า Events → Actions pipeline (เหมือน TikTok gift จริง)
  processEvent(uid, 'gift', payload).catch(err => {
    console.warn('[Simulate] processEvent error:', err.message);
  });

  res.json({
    ok:     true,
    gift:   gift.name,
    diamonds: gift.diamondCount,
    repeat: repeatCount,
    source: catalog.length > 0 ? 'catalog' : 'fallback',
  });
});

module.exports = router;
