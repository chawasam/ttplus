// handlers/admin/metrics.js — Server & infrastructure metrics for admin dashboard
const admin = require('firebase-admin');
const { getAllConnections, getEventRates } = require('../tiktok');

// Online user count getter — set from server.js หลัง userSockets ถูกสร้าง
let _onlineGetter = () => 0;
function setOnlineGetter(fn) { _onlineGetter = fn; }

// CPU delta tracking
let _lastCpu  = process.cpuUsage();
let _lastTime = Date.now();

function getCpuPercent() {
  const now  = Date.now();
  const curr = process.cpuUsage();
  const µs   = Math.max(1, (now - _lastTime) * 1000); // microseconds
  const used = (curr.user - _lastCpu.user) + (curr.system - _lastCpu.system);
  _lastCpu  = curr;
  _lastTime = now;
  return Math.min(100, Math.round((used / µs) * 100));
}

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

async function getServerMetrics(req, res) {
  try {
    const mem    = process.memoryUsage();
    const upSec  = Math.round(process.uptime());
    const cpuPct = getCpuPercent();
    const conns  = getAllConnections();
    const rates  = getEventRates();
    const online = _onlineGetter();

    // Action queue backlog (items ยังไม่ถูก play)
    let queueBacklog = 0;
    try {
      const qs = await admin.firestore()
        .collection('tt_action_queue')
        .where('played', '==', false)
        .count().get();
      queueBacklog = qs.data().count;
    } catch {}

    // Uptime heartbeats ย้อนหลัง 24h (max 288 entries × 5min)
    let heartbeats = [];
    try {
      const hs = await admin.firestore()
        .collection('admin_heartbeats')
        .orderBy('ts', 'desc')
        .limit(288)
        .get();
      heartbeats = hs.docs.map(d => ({ ts: d.data().ts })).reverse();
    } catch {}

    res.json({
      server: {
        uptimeSec:   upSec,
        uptimeStr:   fmtUptime(upSec),
        memory: {
          heapUsed:  Math.round(mem.heapUsed  / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          rss:       Math.round(mem.rss       / 1024 / 1024),
        },
        cpu:         cpuPct,
        nodeVersion: process.version,
        env:         process.env.NODE_ENV || 'development',
      },
      connections: {
        tiktok:  conns.length,
        sockets: online,
        list:    conns,
      },
      queue:     { backlog: queueBacklog },
      events:    rates,
      heartbeats,
      ts:        Date.now(),
    });
  } catch (err) {
    console.error('[AdminMetrics] getServerMetrics:', err.message);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
}

// เรียกจาก server.js ทุก 5 นาที เพื่อบันทึก heartbeat
async function recordHeartbeat() {
  try {
    await admin.firestore().collection('admin_heartbeats').add({ ts: Date.now() });
    // ลบ heartbeat เก่ากว่า 48 ชม. (lazy cleanup)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const old = await admin.firestore()
      .collection('admin_heartbeats')
      .where('ts', '<', cutoff)
      .limit(50)
      .get();
    if (!old.empty) {
      const batch = admin.firestore().batch();
      old.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (e) {
    console.warn('[AdminMetrics] heartbeat failed:', e?.message);
  }
}

module.exports = { getServerMetrics, setOnlineGetter, recordHeartbeat };
