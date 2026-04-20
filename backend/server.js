// server.js — TTplus Backend Server
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

const { generalLimiter, connectLimiter, settingsLimiter, socketRateLimit, clearSocketLimit, clearUserLimit } = require('./middleware/rateLimiter');
const { verifyToken } = require('./middleware/auth');
const { generateCsrfToken, csrfProtection } = require('./middleware/csrf');
const { startConnection, stopConnection } = require('./handlers/tiktok');
const { validateSettings } = require('./utils/validate');
const { logSession, logAudit, flushAll } = require('./utils/logger');
const { generateWidgetToken, verifyWidgetToken } = require('./utils/widgetToken');

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
    threshold: 256,
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

app.post('/api/widget-token', verifyToken, (req, res) => {
  try {
    const token = generateWidgetToken(req.user.uid);
    res.json({ token, expiresIn: 600 });
  } catch {
    res.status(503).json({ error: 'Server is busy. Please try again.' });
  }
});

app.get('/api/settings', verifyToken, settingsLimiter, async (req, res) => {
  try {
    const doc = await admin.firestore().collection('user_settings').doc(req.user.uid).get();
    res.json({ settings: doc.exists ? doc.data() : defaultSettings() });
  } catch (err) {
    console.error('[API] settings GET:', err.code);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.post('/api/settings', verifyToken, settingsLimiter, async (req, res) => {
  try {
    const clean = validateSettings(req.body.settings);
    await admin.firestore().collection('user_settings').doc(req.user.uid).set(clean, { merge: true });
    res.json({ success: true });
  } catch (err) {
    if (err.message?.match(/^(Invalid|Settings)/)) return res.status(400).json({ error: err.message });
    console.error('[API] settings POST:', err.code);
    res.status(500).json({ error: 'Failed to save settings' });
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
  } catch {
    res.status(400).json({ error: 'Could not connect. Please try again.' });
  }
});

app.post('/api/disconnect', verifyToken, async (req, res) => {
  await stopConnection(req.user.uid);
  res.json({ success: true });
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

  socket.on('join_widget', async (data) => {
    if (!socketRateLimit(socket.id, 5, 10000)) {
      socket.emit('widget_error', { error: 'Too many requests' });
      socket.disconnect(true);
      return;
    }

    const { widgetToken } = data || {};
    if (!widgetToken || !/^[a-f0-9]{64}$/.test(widgetToken)) {
      socket.emit('widget_error', { error: 'Invalid token' });
      return;
    }

    const widgetRooms = [...socket.rooms].filter(r => r.startsWith('widget_'));
    if (widgetRooms.length > 0) {
      socket.emit('widget_error', { error: 'Already joined a widget room' });
      return;
    }

    const userId = verifyWidgetToken(widgetToken);
    if (!userId) {
      socket.emit('widget_error', { error: 'Token expired. Please refresh widget URL.' });
      return;
    }

    socket.join(`widget_${userId}`);
    socket.emit('widget_joined', { success: true });
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
  console.log(`\n🚀 TTplus Backend running on 0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
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
    widgets: {
      alert:       { enabled: true, position: 'bottom-right', duration: 5 },
      chat:        { enabled: true, maxItems: 10, showAvatar: true },
      leaderboard: { enabled: true, maxItems: 5 },
      goal:        { enabled: true, showPercentage: true },
      viewers:     { enabled: true },
    },
  };
}
