// utils/readTracker.js — In-memory Firestore read profiler
// ใช้ trackRead(label, count) ใน hotspot ต่างๆ แล้วดูใน Admin → ระบบ
// ข้อมูลเก็บใน memory เท่านั้น (reset เมื่อ server restart)

const _counters = new Map();
// Map<label, { total, recent: [{ts, n}] }>

const WINDOW_MS = 10 * 60 * 1000; // เก็บ 10 นาทีย้อนหลัง

/**
 * เรียกในจุดที่ query Firestore
 * @param {string} label  ชื่อ source เช่น 'eventProcessor.getVjEvents'
 * @param {number} count  จำนวน document ที่อ่าน (default 1)
 */
function trackRead(label, count = 1) {
  if (!label || count <= 0) return;
  const now = Date.now();
  if (!_counters.has(label)) {
    _counters.set(label, { total: 0, recent: [] });
  }
  const c = _counters.get(label);
  c.total += count;
  c.recent.push({ ts: now, n: count });

  // lazy cleanup: ลบ entries เก่าเกิน window
  if (c.recent.length > 500) {
    const cutoff = now - WINDOW_MS;
    c.recent = c.recent.filter(e => e.ts > cutoff);
  }
}

/**
 * ดึงสถิติทั้งหมด เรียงจากมากไปน้อย
 */
function getReadStats() {
  const now    = Date.now();
  const cut1m  = now - 60_000;
  const cut5m  = now - 5 * 60_000;
  const cut10m = now - WINDOW_MS;

  const rows = [];
  for (const [label, c] of _counters.entries()) {
    const last1m  = c.recent.filter(e => e.ts > cut1m ).reduce((s, e) => s + e.n, 0);
    const last5m  = c.recent.filter(e => e.ts > cut5m ).reduce((s, e) => s + e.n, 0);
    const last10m = c.recent.filter(e => e.ts > cut10m).reduce((s, e) => s + e.n, 0);
    rows.push({ label, total: c.total, last1m, last5m, last10m });
  }

  rows.sort((a, b) => b.total - a.total);
  return {
    rows,
    totalAll:   rows.reduce((s, r) => s + r.total,  0),
    total1m:    rows.reduce((s, r) => s + r.last1m,  0),
    total5m:    rows.reduce((s, r) => s + r.last5m,  0),
    resetAt:    _resetAt,
    ts:         now,
  };
}

/**
 * Reset counters (ใช้จาก admin endpoint)
 */
let _resetAt = Date.now();
function resetReadStats() {
  _counters.clear();
  _resetAt = Date.now();
}

module.exports = { trackRead, getReadStats, resetReadStats };
