// routes/leaderboard.js — public leaderboard API (no auth required)
const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../handlers/tiktok');

// GET /api/leaderboard/:vjId?type=likes|gifts
router.get('/:vjId', (req, res) => {
  const { vjId } = req.params;
  const type = req.query.type === 'likes' ? 'likes' : 'gifts';
  if (!vjId || vjId.length > 128) return res.status(400).json({ error: 'invalid vjId' });
  const data = getLeaderboard(vjId, type);
  res.json({ type, data, updatedAt: Date.now() });
});

module.exports = router;
