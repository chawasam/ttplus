// logger.js — Audit logging พร้อม security monitoring + write queue
// ป้องกัน Firestore quota exhaustion ด้วย in-memory queue + batch flush
const admin = require('firebase-admin');
const crypto = require('crypto');

const FLUSH_INTERVAL_MS = 5000;   // flush ทุก 5 วินาที
const MAX_QUEUE_SIZE    = 500;    // ถ้า queue เต็มก่อน flush ก็ flush เลย
const AUTH_FAIL_WINDOW_MS = 5 * 60 * 1000; // 5 นาที
const AUTH_FAIL_THRESHOLD = 10;

// In-memory queues (แยกตาม collection)
const queues = { session_logs: [], error_logs: [], audit_logs: [] };

// In-memory auth-fail counter (แทน Firestore query เพื่อลด reads)
// ipHash -> { count, resetAt }
const authFailCounts = new Map();

function hashIp(ip) {
  if (!ip) return 'unknown';
  const salt = process.env.IP_HASH_SALT || 'ttplus-default';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}

// Enqueue แทน write ตรง
function enqueue(collection, doc) {
  queues[collection].push(doc);
  if (queues[collection].length >= MAX_QUEUE_SIZE) flushQueue(collection);
}

// Flush หนึ่ง collection ด้วย Firestore batch (split ทุก 500 ตาม Firestore limit)
async function flushQueue(collection) {
  const items = queues[collection].splice(0); // ดึงออกทั้งหมด
  if (items.length === 0) return;
  try {
    const db  = admin.firestore();
    const col = db.collection(collection);
    // Firestore batch limit = 500 operations
    for (let i = 0; i < items.length; i += 500) {
      const chunk = items.slice(i, i + 500);
      const batch = db.batch();
      chunk.forEach(item => batch.set(col.doc(), item));
      await batch.commit();
    }
  } catch (err) {
    console.error(`[Logger] flush ${collection} failed:`, err.code || err.message);
    // ไม่ re-enqueue เพื่อป้องกัน infinite loop; log หายบางส่วนได้ในกรณีนี้
  }
}

// Flush ทุก collection ทุก FLUSH_INTERVAL_MS
setInterval(async () => {
  for (const col of Object.keys(queues)) await flushQueue(col);
}, FLUSH_INTERVAL_MS);

// Graceful flush เมื่อ process ปิด
process.on('beforeExit', async () => {
  for (const col of Object.keys(queues)) await flushQueue(col);
});

// ===== Public API =====

function logSession(data) {
  enqueue('session_logs', {
    userId:         data.userId        || null,
    tiktokUsername: data.tiktokUsername || null,
    action:         data.action        || 'unknown',
    roomId:         data.roomId        || null,
    ipHash:         hashIp(data.ip),
    timestamp:      admin.firestore.FieldValue.serverTimestamp(),
  });
}

function logError(userId, tiktokUsername, errorMessage) {
  const safeMsg = String(errorMessage)
    .replace(/token|key|secret|password/gi, '[REDACTED]')
    .slice(0, 200);
  enqueue('error_logs', {
    userId,
    tiktokUsername,
    error:     safeMsg,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function logAudit(data) {
  enqueue('audit_logs', {
    userId:    data.userId   || null,
    action:    data.action   || 'unknown',
    ipHash:    hashIp(data.ip),
    userAgent: data.userAgent ? String(data.userAgent).slice(0, 200) : null,
    severity:  data.severity || 'info',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Detect suspicious auth failures — ใช้ in-memory counter แทน Firestore query
  if (data.action === 'auth_failed') {
    const key = hashIp(data.ip);
    const now = Date.now();
    const entry = authFailCounts.get(key);

    if (!entry || now > entry.resetAt) {
      authFailCounts.set(key, { count: 1, resetAt: now + AUTH_FAIL_WINDOW_MS });
    } else {
      entry.count++;
      if (entry.count >= AUTH_FAIL_THRESHOLD) {
        console.warn(`[Security] Suspicious: IP ${key} failed auth ${entry.count}x in 5min`);
        entry.count = 0; // reset เพื่อไม่ spam log
      }
    }
  }
}

// ล้าง authFailCounts ทุก 10 นาที
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authFailCounts.entries()) {
    if (now > v.resetAt) authFailCounts.delete(k);
  }
}, 10 * 60 * 1000);

/**
 * flushAll — flush ทุก queue ทันที (ใช้ตอน graceful shutdown)
 */
async function flushAll() {
  await Promise.allSettled(Object.keys(queues).map(col => flushQueue(col)));
}

module.exports = { logSession, logError, logAudit, flushAll };
