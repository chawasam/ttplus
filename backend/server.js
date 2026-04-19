// server.js — TTplus Backend Server
require('dotenv').config();

const { checkEnv } = require('./utils/envCheck');
checkEnv();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

const { generalLimiter, connectLimiter, settingsLimiter, socketRateLimit, socketRateLimitByUser, clearSocketLimit, clearUserLimit } = require('./middleware/rateLimiter');
const { verifyToken } = require('./middleware/auth');
const { generateCsrfToken, csrfProtection } = require('./middleware/csrf');
const { startConnection, stopConnection, getActiveConnectionCount } = require('./handlers/tiktok');
const { validateSettings } = require('./utils/validate');
const { logSession, logAudit, flushAll } = require('./utils/logger');
const { generateWidgetToken, verifyWidgetToken } = require('./utils/widgetToken');

// ===== Firebase Admin =====
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy: จำเป็นสำหรับ Railway / Render / Fly.io
// ให้ express-rate-limit อ่าน X-Forwarded-For ได้ถูกต้อง (ไม่เช่นนั้น req.ip = proxy IP ทุก request)
app.set('trust proxy', 1);

// ===== Socket.io =====
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL, methods: ['GET', 'POST'], credentials: true },
  maxHttpBufferSize: 1e4,        // 10KB max socket payload
  transports: ['websocket'],     // WebSocket only, no long-polling
  pingTimeout: 30000,
  pingInterval: 10000,
  // เปิด perMessageDeflate compression ลด bandwidth สำหรับ chat/gift payloads
  perMessageDeflate: {
    threshold: 256,              // compress payloads > 256 bytes
    zlibDeflateOptions: { level: 6 }, // balanced speed/ratio
    zlibInflateOptions: { chunkSize: 16 * 1024 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
  },
});

const userSockets = new Map();

// ===== Security Middleware =====
// HTTPS redirect ใน production
if (isProd) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}

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

app.use(cors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,
  methods:     ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));

// Log เฉพาะ method + path
app.use((req, _res, next) => {
  if (!isProd) console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

app.use(generalLimiter);

// ===== CSRF =====
// Exempt: health, csrf-token endpoint, Socket.io
app.use((req, res, next) => {
  const exempt = ['/health', '/api/csrf-token'];
  if (exempt.includes(req.path)) return next();
  csrfProtection(req, res, next);
});

// ===== Routes =====

// /health — ไม่เปิดเผยข้อมูล internal (connections count = info leak)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CSRF token endpoint
app.get('/api/csrf-token', verifyToken, (_req, res) => {
  res.json({ token: generateCsrfToken() });
});

// Widget token endpoint (สร้าง short-lived token สำหรับ OBS)
app.post('/api/widget-token', verifyToken, (req, res) => {
  try {
    const token = generateWidgetToken(req.user.uid);
    res.json({ token, expiresIn: 600 }); // 10 นาที
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

  // ดึง IP จริง (รองรับ proxy/load balancer)
  const socketIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address;

  socket.on('authenticate', async (data) => {
    // Rate limit per socketId (ก่อน authenticate ยังไม่รู้ userId)
    if (!socketRateLimit(socket.id, 5, 10000)) {
      socket.emit('authenticated', { success: false, error: 'Too many requests' });
      socket.disconnect(true); // disconnect หลัง rate limit เกิน
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
    // Rate limit per socketId
    if (!socketRateLimit(socket.id, 5, 10000)) {
      socket.emit('widget_error', { error: 'Too many requests' });
      socket.disconnect(true); // disconnect หลัง rate limit เกิน
      return;
    }

    const { widgetToken } = data || {};
    if (!widgetToken || !/^[a-f0-9]{64}$/.test(widgetToken)) {
      socket.emit('widget_error', { error: 'Invalid token' });
      return;
    }

    // One widget room per socket — ป้องกัน room-hopping attack
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
      await flushAll();          // flush audit/session logs ก่อนปิด
      await admin.app().delete();
    } catch { /* ignore */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (r) => console.error('[Server] UnhandledRejection:', r));
process.on('uncaughtException',  (e) => { console.error('[Server] UncaughtException:', e.message); process.exit(1); });

// ===== Start =====
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 TTplus Backend on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}\n`);
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
