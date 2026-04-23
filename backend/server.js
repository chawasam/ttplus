// server.js — TTsam Backend Server
require('dotenv').config();

// ===== Error Handlers ต้อง register ก่อนทุกอย่าง =====
// (ป้องกัน crash ตอน Firebase init หรือ module load)
process.on('unhandledRejection', (r) => console.error('[Server] UnhandledRejection:', r));
process.on('uncaughtException',  (e) => { console.error('[Server] UncaughtException:', e.message); process.exit(1); });

const { checkEnv } = require('./utils/envCheck');
checkEnv();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const admin = require('firebase-admin');

const { generalLimiter, connectLimiter, settingsLimiter, tokenLimiter, socketRateLimit, clearSocketLimit, clearUserLimit } = require('./middleware/rateLimiter');
const { verifyToken } = require('./middleware/auth');
const { generateCsrfToken, csrfProtection } = require('./middleware/csrf');
const { startConnection, stopConnection, hasConnection, getActiveConnectionCount } = require('./handlers/tiktok');
const { validateSettings } = require('./utils/validate');
const { logSession, logAudit, flushAll } = require('./utils/logger');
const {
  assignCid, registerCid, getUidForCid, getCidForUid,
  generateToken, registerToken, verifyTokenFromMemory, getTokenForUid,
} = require('./utils/widgetToken');

// ===== Firebase Admin — wrapped in try-catch =====
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  console.log('[Firebase] initializeApp OK');
} catch (e) {
  console.error('[Firebase] initializeApp FAILED:', e.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy: จำเป็นสำหรับ Railway / Render / Fly.io
app.set('trust proxy', 1);

// ===== Socket.io =====
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, methods: ['GET', 'POST'], credentials: true },
  maxHttpBufferSize: 1e4,
  // ใช้ทั้ง polling + websocket เพื่อ compatibility กับ Railway proxy
  transports: ['polling', 'websocket'],
  pingTimeout: 30000,
  pingInterval: 10000,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: { level: 6 },
    zlibInflateOptions: { chunkSize: 16 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
  },
});

const userSockets = new Map();

// ===== Health check — ต้องมาก่อนทุก middleware =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ===== CORS ต้องมาก่อน middleware อื่นทั้งหมด =====
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',      process.env.FRONTEND_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods',     'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers',     'Content-Type, Authorization, x-csrf-token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== Security Middleware =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
      imgSrc:     ["'self'", 'data:'],
      frameAncestors: ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

app.use(express.json({ limit: '10kb' }));

app.use((req, _res, next) => {
  if (!isProd) console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

app.use(generalLimiter);

// ===== CSRF =====
app.use((req, res, next) => {
  const exempt = ['/health', '/api/csrf-token'];
  if (exempt.includes(req.path)) return next();
  csrfProtection(req, res, next);
});

// ===== Routes =====

app.get('/api/csrf-token', verifyToken, (_req, res) => {
  res.json({ token: generateCsrfToken() });
});

app.post('/api/widget-token', verifyToken, tokenLimiter, async (req, res) => {
  const uid = req.user.uid;
  const db  = admin.firestore();

  // Fast path: cid อยู่ใน memory cache แล้ว
  const cachedCid = getCidForUid(uid);
  if (cachedCid) return res.json({ cid: cachedCid });

  try {
    const cid = await assignCid(uid, db);
    return res.json({ cid });
  } catch (err) {
    console.error('[API] widget-token (cid) Firestore error:', err.message);
    // Fallback: session-only cid — ไม่ persist แต่ยังใช้งานได้จนกว่า server restart
    const fallbackCid = String(90000 + Math.floor(Math.random() * 9999));
    registerCid(fallbackCid, uid);
    console.warn('[API] widget-token: session-only cid for uid:', uid);
    return res.json({ cid: fallbackCid });
  }
});

app.get('/api/settings', verifyToken, settingsLimiter, async (req, res) => {
  try {
    const doc = await admin.firestore().collection('user_settings').doc(req.user.uid).get();
    res.json({ settings: doc.exists ? doc.data() : defaultSettings() });
  } catch (err) {
    const code = err.code || 'UNKNOWN';
    console.error('[API] settings GET:', code, err.message);
    res.status(500).json({ error: 'Failed to get settings', code });
  }
});

app.post('/api/settings', verifyToken, settingsLimiter, async (req, res) => {
  try {
    const clean = validateSettings(req.body.settings);
    await admin.firestore().collection('user_settings').doc(req.user.uid).set(clean, { merge: true });
    res.json({ success: true });
  } catch (err) {
    if (err.message?.match(/^(Invalid|Settings|Must|tts|alert|chat|goal|widget)/i)) {
      return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
    }
    const code = err.code || 'UNKNOWN';
    console.error('[API] settings POST:', code, err.message);
    res.status(500).json({ error: 'Failed to save settings', code });
  }
});

app.post('/api/connect', verifyToken, connectLimiter, async (req, res) => {
  const { tiktokUsername } = req.body;
  if (!tiktokUsername || typeof tiktokUsername !== 'string') return res.status(400).json({ error: 'Invalid username' });

  const clean = tiktokUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 50);
  if (!clean) return res.status(400).json({ error: 'Invalid username format' });

  const socketId = userSockets.get(req.user.uid);
  if (!socketId) return res.status(400).json({ error: 'No active connection. Please refresh.' });

  try {
    await startConnection(req.user.uid, clean, io, socketId);
    res.json({ success: true, tiktokUsername: clean });
  } catch (err) {
    const msg = err?.message || 'Could not connect. Please try again.';
    console.error('[API] /api/connect failed:', msg);
    res.status(400).json({ error: msg });
  }
});

app.post('/api/disconnect', verifyToken, async (req, res) => {
  await stopConnection(req.user.uid);
  res.json({ success: true });
});

// ===== Widget styles — public endpoint (widget โหลด style จาก cid หรือ token เก่า) =====
app.get('/api/widget-styles', async (req, res) => {
  const { cid, wt } = req.query;
  const db = admin.firestore();

  try {
    let uid = null;

    if (cid && /^\d{4,8}$/.test(cid)) {
      // Format ใหม่: cid ตัวเลข
      uid = getUidForCid(cid);
      if (!uid) {
        const cidDoc = await db.collection('widget_cids').doc(cid).get();
        if (cidDoc.exists) {
          uid = cidDoc.data().uid;
          registerCid(cid, uid);
        }
      }
    } else if (wt && /^[a-zA-Z0-9_-]{20,66}$/.test(wt)) {
      // Format เก่า: wt token (backward compat)
      uid = verifyTokenFromMemory(wt);
      if (!uid) {
        const tokenDoc = await db.collection('widget_tokens').doc(wt).get();
        if (tokenDoc.exists) {
          uid = tokenDoc.data().uid;
          registerToken(wt, uid);
        }
      }
    }

    if (!uid) return res.status(400).json({ error: 'invalid cid or token' });

    const userDoc = await db.collection('user_settings').doc(uid).get();
    const styles = userDoc.exists ? (userDoc.data()?.widgetStyles || {}) : {};
    res.json({ styles });
  } catch (err) {
    console.error('[API] widget-styles GET:', err.message);
    res.status(500).json({ error: 'Failed to load styles' });
  }
});

// ===== Stats (owner only) =====
const OWNER_EMAIL = 'cksamg@gmail.com';
app.get('/api/stats', verifyToken, async (req, res) => {
  if (req.user.email !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' });
  try {
    // registered users — count Firestore docs
    const snap = await admin.firestore().collection('user_settings').count().get();
    const registered = snap.data().count;
    res.json({
      online:     userSockets.size,
      liveSessions: getActiveConnectionCount(),
      registered,
    });
  } catch (err) {
    console.error('[API] stats:', err.message);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ===== Error Handlers =====
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ===== Socket.io =====
io.on('connection', (socket) => {

  const socketIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address;

  socket.on('authenticate', async (data) => {
    if (!socketRateLimit(socket.id, 5, 10000)) {
      socket.emit('authenticated', { success: false, error: 'Too many requests' });
      socket.disconnect(true);
      return;
    }
    if (!data?.token || typeof data.token !== 'string' || data.token.length > 4096) {
      await logAudit({ action: 'auth_failed', ip: socketIp, userAgent: socket.handshake.headers['user-agent'] });
      socket.emit('authenticated', { success: false, error: 'Unauthorized' });
      return;
    }
    try {
      const decoded = await admin.auth().verifyIdToken(data.token, true);
      userSockets.set(decoded.uid, socket.id);
      socket.userId = decoded.uid;
      socket.emit('authenticated', { success: true });
    } catch {
      await logAudit({ action: 'auth_failed', ip: socketIp, userAgent: socket.handshake.headers['user-agent'] });
      socket.emit('authenticated', { success: false, error: 'Unauthorized' });
    }
  });

  // ===== TTS status relay (authenticated user → widget ttsmonitor) =====
  socket.on('tts_status', (data) => {
    if (!socket.userId) return;
    if (!socketRateLimit(socket.id, 30, 5000)) return; // max 30 per 5s (1 per chat message)
    const engine = String(data?.engine || 'web').slice(0, 20);
    const safe = {
      engine,
      voice:        String(data?.voice        || '').slice(0, 60),
      voiceDesc:    String(data?.voiceDesc    || '').slice(0, 60),
      personaLabel: String(data?.personaLabel || '').slice(0, 40),
    };
    io.to(`widget_${socket.userId}`).emit('tts_status', safe);
  });

  // ===== Real-time style update (authenticated user → widget room) =====
  socket.on('push_style_update', (data) => {
    if (!socket.userId) return; // ต้อง authenticate ก่อน
    if (!socketRateLimit(socket.id, 20, 5000)) return; // max 20 updates per 5s
    const { widgetId, style } = data || {};
    if (!widgetId || typeof widgetId !== 'string' || widgetId.length > 50) return;
    if (!style || typeof style !== 'object') return;
    // Broadcast ไปยัง widget room ของ user คนนี้
    io.to(`widget_${socket.userId}`).emit('style_update', { widgetId, style });
  });

  socket.on('join_widget', async (data) => {
    if (!socketRateLimit(socket.id, 5, 10000)) {
      socket.emit('widget_error', { error: 'Too many requests' });
      socket.disconnect(true);
      return;
    }

    const { cid, widgetToken } = data || {};

    const widgetRooms = [...socket.rooms].filter(r => r.startsWith('widget_'));
    if (widgetRooms.length > 0) {
      socket.emit('widget_error', { error: 'Already joined a widget room' });
      return;
    }

    let userId = null;

    if (cid && /^\d{4,8}$/.test(String(cid))) {
      // Format ใหม่: cid ตัวเลข
      userId = getUidForCid(String(cid));
      if (!userId) {
        try {
          const doc = await admin.firestore().collection('widget_cids').doc(String(cid)).get();
          if (doc.exists) {
            userId = doc.data().uid;
            registerCid(String(cid), userId);
          }
        } catch (e) {
          console.error('[Socket] cid lookup:', e.message);
        }
      }
    } else if (widgetToken && /^[a-zA-Z0-9_-]{20,66}$/.test(widgetToken)) {
      // Format เก่า: token (backward compat)
      userId = verifyTokenFromMemory(widgetToken);
      if (!userId) {
        try {
          const doc = await admin.firestore().collection('widget_tokens').doc(widgetToken).get();
          if (doc.exists) {
            userId = doc.data().uid;
            registerToken(widgetToken, userId);
          }
        } catch (e) {
          console.error('[Socket] widget token lookup:', e.message);
        }
      }
    }

    if (!userId) {
      socket.emit('widget_error', { error: 'Invalid cid or token.' });
      return;
    }

    socket.join(`widget_${userId}`);
    socket.emit('widget_joined', { success: true });

    // Auto-connect TikTok live ถ้ายังไม่มี connection อยู่
    // ทำให้ widget ดึงแชทสดได้โดยไม่ต้องมี dashboard เปิดค้างไว้
    if (!hasConnection(userId)) {
      try {
        const settingsDoc = await admin.firestore().collection('settings').doc(userId).get();
        const savedUsername = settingsDoc.exists ? settingsDoc.data()?.tiktokUsername : null;
        if (savedUsername && typeof savedUsername === 'string' && savedUsername.trim()) {
          const clean = savedUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 50);
          if (clean) {
            // socketId = null → events จะ broadcast เฉพาะ widget room
            startConnection(userId, clean, io, null).catch((e) => {
              console.warn('[Widget] auto-connect failed for', clean, e?.message);
            });
          }
        }
      } catch (e) {
        console.warn('[Widget] auto-connect settings read failed:', e?.message);
      }
    }
  });

  // ===== Widget Pin Relay (widget → widget room, no auth needed) =====
  // ใช้โดย chat overlay widget เพื่อ relay pin events ไปยัง pinchat / pinprofile
  // ใน OBS ที่ BroadcastChannel ทำงานข้าม process ไม่ได้
  socket.on('widget_pin_relay', (data) => {
    if (!socketRateLimit(socket.id, 30, 5000)) return; // max 30 per 5s
    const { widgetId, payload } = data || {};
    if (!widgetId || typeof widgetId !== 'string' || widgetId.length > 50) return;
    if (!payload || typeof payload !== 'object') return;
    // หา widget room ที่ socket นี้อยู่
    const widgetRoom = [...socket.rooms].find(r => r.startsWith('widget_'));
    if (!widgetRoom) return; // ต้องเคย join_widget ก่อน
    // Broadcast เฉพาะ pinnable widgetId
    if (!['pinchat', 'pinprofile'].includes(widgetId)) return;
    // ส่ง style_update ด้วย payload พิเศษ _pin / _profile
    const styleKey = widgetId === 'pinchat' ? '_pin' : '_profile';
    io.to(widgetRoom).emit('style_update', { widgetId, style: { [styleKey]: payload } });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      clearUserLimit(socket.userId);
    }
    clearSocketLimit(socket.id);
  });
});

// ===== Graceful Shutdown =====
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} — shutting down...`);
  server.close(async () => {
    try {
      await flushAll();
      await admin.app().delete();
    } catch { /* ignore */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ===== Start =====
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TTsam Backend running on 0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`[Server] PORT=${PORT} NODE_ENV=${process.env.NODE_ENV}`);

  // ===== ทดสอบ Firebase key จริงๆ ทันทีหลัง start =====
  admin.auth().listUsers(1)
    .then(() => console.log('[Firebase] Auth connection OK ✅'))
    .catch(e  => console.error('[Firebase] Auth connection FAILED ❌:', e.code, e.message));
});

function defaultSettings() {
  return {
    theme: 'dark', tiktokUsername: '', alertSound: true, alertVolume: 80,
    chatMaxItems: 50, goalTarget: 100, goalCurrent: 0, goalType: 'gift',
    ttsEnabled: false, ttsReadChat: true, ttsReadGift: true, ttsReadFollow: true,
    ttsRate: 1.0, ttsPitch: 1.0, ttsVolume: 1.0, ttsVoice: '',
    widgets: {
      alert:       { enabled: true, position: 'bottom-right', duration: 5 },
      chat:        { enabled: true, maxItems: 10, showAvatar: true },
      leaderboard: { enabled: true, maxItems: 5 },
      goal:        { enabled: true, showPercentage: true },
      viewers:     { enabled: true },
    },
  };
}
