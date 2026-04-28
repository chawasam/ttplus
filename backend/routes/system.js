// routes/system.js — Server resource stats (CPU + RAM ของ process นี้เท่านั้น)
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');

// ── CPU tracking ─────────────────────────────────────────────────────────────
// วัด CPU% ด้วย sliding window 1 วินาที อัพเดททุก 1s
let _cpuPercent = 0;
let _prevCpu    = process.cpuUsage();
let _prevTime   = Date.now();

setInterval(() => {
  const now     = Date.now();
  const cur     = process.cpuUsage();
  const elapsedUs  = (now - _prevTime) * 1000;            // ms → µs
  const usedUs     = (cur.user - _prevCpu.user) + (cur.system - _prevCpu.system);
  _cpuPercent  = Math.min(100, Math.round((usedUs / elapsedUs) * 100 * 10) / 10);
  _prevCpu     = cur;
  _prevTime    = now;
}, 1000);

// ── GET /api/system/stats ─────────────────────────────────────────────────────
router.get('/stats', verifyToken, (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    cpu: _cpuPercent,                                  // % ของ process นี้
    ram: {
      rss:       Math.round(mem.rss       / 1024 / 1024), // MB — total allocated
      heapUsed:  Math.round(mem.heapUsed  / 1024 / 1024), // MB — JS heap ที่ใช้จริง
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB — JS heap ทั้งหมด
    },
    uptime: Math.floor(process.uptime()),               // วินาที
  });
});

module.exports = router;
