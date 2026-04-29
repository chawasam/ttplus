// handlers/admin/errorLog.js — Error tracking: รับ, เก็บ, query, resolve errors

const admin = require('firebase-admin');

// รับ error จาก frontend (และ backend ผ่าน storeBackendError)
async function reportError(req, res) {
  const { message, stack, source, uid, tiktokUsername, url, userAgent, ts } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }
  try {
    await admin.firestore().collection('admin_errors').add({
      message:        String(message).slice(0, 500),
      stack:          String(stack           || '').slice(0, 3000),
      source:         String(source          || 'frontend').slice(0, 30),
      uid:            String(req.user?.uid   || uid || '').slice(0, 128),
      tiktokUsername: String(tiktokUsername  || '').slice(0, 50),
      url:            String(url             || '').slice(0, 300),
      userAgent:      String(userAgent       || '').slice(0, 300),
      ts:             Number(ts)             || Date.now(),
      resolved:       false,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ErrorLog] reportError:', err.message);
    res.status(500).json({ error: 'Failed to store error' });
  }
}

// ดึง error log (owner only)
async function getErrors(req, res) {
  const limit  = Math.min(200, parseInt(req.query.limit) || 50);
  const source = req.query.source || null; // 'frontend' | 'backend' | null = all

  try {
    let q = admin.firestore().collection('admin_errors')
      .where('resolved', '==', false)
      .orderBy('ts', 'desc')
      .limit(limit);
    if (source) q = q.where('source', '==', source);

    const snap   = await q.get();
    const errors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ errors, total: errors.length });
  } catch (err) {
    // composite index ยังไม่ถูกสร้าง → fallback query ไม่ filter resolved
    if (err.code === 9 || err.message?.includes('index')) {
      try {
        const snap2 = await admin.firestore().collection('admin_errors')
          .orderBy('ts', 'desc').limit(limit).get();
        const errors = snap2.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => !e.resolved);
        return res.json({ errors, total: errors.length });
      } catch {}
    }
    console.error('[ErrorLog] getErrors:', err.message);
    res.status(500).json({ error: 'Failed to get errors' });
  }
}

// Mark error as resolved
async function resolveError(req, res) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.length > 60) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    await admin.firestore().collection('admin_errors').doc(id).update({
      resolved:   true,
      resolvedAt: Date.now(),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ErrorLog] resolveError:', err.message);
    res.status(500).json({ error: 'Failed to resolve' });
  }
}

// เรียกจาก backend โดยตรง (ไม่ผ่าน HTTP) เมื่อเกิด uncaughtException
async function storeBackendError(message, stack) {
  try {
    await admin.firestore().collection('admin_errors').add({
      message:        String(message || '').slice(0, 500),
      stack:          String(stack   || '').slice(0, 3000),
      source:         'backend',
      uid:            '',
      tiktokUsername: '',
      url:            '',
      userAgent:      `Node.js ${process.version}`,
      ts:             Date.now(),
      resolved:       false,
    });
  } catch { /* silent — อย่า throw ใน error handler */ }
}

module.exports = { reportError, getErrors, resolveError, storeBackendError };
