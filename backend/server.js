// server.js — TTsam Backend Server
require('dotenv').config();

// ===== Error Handlers ต้อง register ก่อนทุกอย่าง =====
// (ป้องกัน crash ตอน Firebase init หรือ module load)
process.on('unhandledRejection', (r) => {
  console.error('[Server] UnhandledRejection:', r);
  // storeBackendError ยังไม่ ready ตอน module load — guard ด้วย try
  try { require('./handlers/admin/errorLog').storeBackendError(String(r?.message || r), r?.stack || ''); } catch {}
});
process.on('uncaughtException',  (e) => {
  console.error('[Server] UncaughtException:', e.message);
  try { require('./handlers/admin/errorLog').storeBackendError(e.message, e.stack || ''); } catch {}
  process.exit(1);
});

const { checkEnv } = require('./utils/envCheck');
checkEnv();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const admin = require('firebase-admin');

const { generalLimiter, unauthLimiter, connectLimiter, settingsLimiter, tokenLimiter, socketRateLimit, clearSocketLimit, clearUserLimit } = require('./middleware/rateLimiter');
const { verifyToken } = require('./middleware/auth');
const { generateCsrfToken, csrfProtection } = require('./middleware/csrf');
const { startConnection, stopConnection, hasConnection, getActiveConnectionCount, getLeaderboard, loadLeaderboardFromFirestore, getRecentMembers, getConnectionByUsername, getConnectionInfo } = require('./handlers/tiktok');
const { setOnlineGetter, recordHeartbeat } = require('./handlers/admin/metrics');
const { storeBackendError }                = require('./handlers/admin/errorLog');
const { cleanupStaleBattles } = require('./handlers/game/combat');
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

// ===== Server-level timeouts (ป้องกัน Slowloris / connection exhaustion) =====
// keepAliveTimeout > Railway load-balancer idle timeout (60s) เพื่อป้องกัน ECONNRESET
server.keepAliveTimeout = 65000;   // 65s
server.headersTimeout   = 66000;   // ต้อง > keepAliveTimeout
server.setTimeout(120000);         // ปิด connection ที่ไม่ส่ง request มานาน 2 นาที

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

const userSockets      = new Map();
const disconnectTimers = new Map(); // userId -> timer — ตัดการเชื่อมต่อ TikTok หลังปิด browser 1 นาที

// ── Shared socket emitter (ให้ handlers emit ถึง user โดยไม่ต้องรับ io ตรงๆ) ──
const { setIO } = require('./lib/emitter');
setIO(io, userSockets);

// ── Admin metrics: ส่ง getter สำหรับ online user count ──
setOnlineGetter(() => userSockets.size);

// ── Admin heartbeat: บันทึกทุก 5 นาที เพื่อแสดง uptime history ──
setInterval(recordHeartbeat, 5 * 60 * 1000);

// ===== Health check — ต้องมาก่อนทุก middleware =====
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ===== CORS ต้องมาก่อน middleware อื่นทั้งหมด =====
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',      process.env.FRONTEND_URL);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods',     'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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

app.get('/api/csrf-token', unauthLimiter, verifyToken, (_req, res) => {
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

  // ตรวจว่า user คนเดียวกันมี TikTok connection อยู่แล้วจาก tab อื่น
  // (same Google account, หลาย browser tab — ต้อง takeover เพื่อไม่ให้ connection ทับซ้อน)
  const myConn = getConnectionInfo(req.user.uid);
  if (myConn) {
    return res.json({ alreadyInUse: true, tiktokUsername: myConn.tiktokUsername });
  }

  // ตรวจว่า username นี้มีคนอื่น (คนละ account) ใช้อยู่ไหม
  const existing = getConnectionByUsername(clean);
  if (existing && existing.userId !== req.user.uid) {
    return res.json({ alreadyInUse: true, tiktokUsername: clean });
  }

  // ถ้าหา socketId ไม่เจอ ให้รอ 1.5 วิ แล้วลองใหม่ครั้งเดียว
  // ป้องกัน race condition: socket reconnect → firebase verifyIdToken ยังไม่เสร็จ
  let socketId = userSockets.get(req.user.uid);
  if (!socketId) {
    await new Promise(r => setTimeout(r, 1500));
    socketId = userSockets.get(req.user.uid);
  }
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

// ===== TikTok status (ใช้ restore UI state หลัง refresh) =====
app.get('/api/tiktok/status', verifyToken, async (req, res) => {
  const info = getConnectionInfo(req.user.uid);
  if (!info) return res.json({ connected: false });
  return res.json({ connected: true, tiktokUsername: info.tiktokUsername, connectedAt: info.connectedAt });
});

// ===== Takeover: เด้ง Person 1 ออก แล้วเชื่อมต่อ Person 2 =====
app.post('/api/takeover', verifyToken, connectLimiter, async (req, res) => {
  const { tiktokUsername } = req.body;
  if (!tiktokUsername || typeof tiktokUsername !== 'string') return res.status(400).json({ error: 'Invalid username' });

  const clean = tiktokUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 50);
  if (!clean) return res.status(400).json({ error: 'Invalid username format' });

  let socketId = userSockets.get(req.user.uid);
  if (!socketId) {
    await new Promise(r => setTimeout(r, 1500));
    socketId = userSockets.get(req.user.uid);
  }
  if (!socketId) return res.status(400).json({ error: 'No active connection. Please refresh.' });

  // หาว่าใครถือ connection อยู่ — ดูทั้ง same-user (tab อื่น) และ different user
  // ใช้ socketId ที่เก็บไว้ใน activeConnections (ไม่ใช่ userSockets ซึ่งถูก overwrite แล้ว)
  const myConn     = getConnectionInfo(req.user.uid);          // same uid, tab อื่น
  const otherConn  = getConnectionByUsername(clean);            // different uid, same username
  const kickTarget = myConn
    ? { userId: req.user.uid, socketId: myConn.socketId }      // กรณี same user หลาย tab
    : (otherConn && otherConn.userId !== req.user.uid)
      ? { userId: otherConn.userId, socketId: getConnectionInfo(otherConn.userId)?.socketId }
      : null;

  if (kickTarget) {
    if (kickTarget.socketId) {
      io.to(kickTarget.socketId).emit('kicked', { tiktokUsername: clean, reason: 'taken_over' });
    }
    await stopConnection(kickTarget.userId);
  }

  try {
    await startConnection(req.user.uid, clean, io, socketId);
    res.json({ success: true, tiktokUsername: clean });
  } catch (err) {
    const msg = err?.message || 'Could not connect. Please try again.';
    console.error('[API] /api/takeover failed:', msg);
    res.status(400).json({ error: msg });
  }
});

app.post('/api/disconnect', verifyToken, async (req, res) => {
  await stopConnection(req.user.uid);
  res.json({ success: true });
});

// ===== Widget styles — public endpoint (widget โหลด style จาก cid หรือ token เก่า) =====
app.get('/api/widget-styles', unauthLimiter, async (req, res) => {
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
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'cksamg@gmail.com';
app.get('/api/stats', verifyToken, async (req, res) => {
  if (!OWNER_EMAIL || req.user.email !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' });
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

// ===== PK Panel static files (วิดีโอที่ user อัพโหลด) =====
// NOTE: Railway มี ephemeral filesystem — ถ้า deploy บน Railway ให้ใช้ Firebase Storage หรือ persistent volume แทน
const _path = require('path');
app.use('/uploads/pk', express.static(_path.join(__dirname, 'uploads', 'pk'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// ===== PK Panel Routes =====
const pkRouter = require('./routes/pk');
app.use('/api/pk', pkRouter);

// ===== Game Routes =====
const gameRouter = require('./routes/game');
app.use('/api/game', gameRouter);

// ===== ลูกเล่น TT — Actions & Events =====
const actionsRouter = require('./routes/actions');
app.use('/api/actions', actionsRouter);

// ===== Leaderboard Route (public, no auth) =====
const leaderboardRouter = require('./routes/leaderboard');
app.use('/api/leaderboard', leaderboardRouter);

// ===== Spotify Now Playing =====
const spotifyRouter = require('./routes/spotify');
app.use('/api/spotify', spotifyRouter);

// ===== CoinJar (simulate gift) =====
const coinjarRouter = require('./routes/coinjar');
app.use('/api/coinjar', coinjarRouter);

// ===== Gift Catalog =====
const giftsRouter = require('./routes/gifts');
app.use('/api/gifts', giftsRouter);


// ===== Overlay Route (public, no auth) =====
const { getOverlayState } = require('./handlers/game/overlay');
app.get('/api/overlay/:tiktokId', getOverlayState);

// ===== Admin Routes =====
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// ===== Error Handlers =====
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled:', err.message);
  storeBackendError(err.message, err.stack).catch(() => {});
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
      // ยกเลิก pending auto-disconnect timer (กรณี reconnect ภายใน 1 นาที)
      if (disconnectTimers.has(decoded.uid)) {
        clearTimeout(disconnectTimers.get(decoded.uid));
        disconnectTimers.delete(decoded.uid);
      }
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
      text:         String(data?.text         || '').slice(0, 300),
    };
    io.to(`widget_${socket.userId}`).emit('tts_status', safe);
  });

  // ===== PK Panel trigger (authenticated user → widget pk overlay) =====
  socket.on('pk_trigger', (data) => {
    if (!socket.userId) return;
    if (!socketRateLimit(socket.id, 30, 5000)) return;
    const { videoUrl, videoType, category } = data || {};
    if (typeof videoUrl !== 'string' || videoUrl.length > 600) return;
    if (!['webm', 'mp4'].includes(String(videoType || ''))) return;
    const safeCategory = typeof category === 'string' ? category.slice(0, 30) : '';
    io.to(`widget_${socket.userId}`).emit('pk_play', { videoUrl, videoType, category: safeCategory });
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
      // disconnect หลังจาก join_widget ล้มเหลว เพื่อป้องกัน brute-force cid
      socket.disconnect(true);
      return;
    }

    socket.join(`widget_${userId}`);
    // widget_audio_${userId} — เฉพาะ OBS browser source (widget URL) เท่านั้นที่อยู่ใน room นี้
    // dashboard socket ไม่ได้ call join_widget → ไม่เข้า room นี้
    // ใช้สำหรับส่ง events ที่มีเสียง (TTS, alert, fireworks) เฉพาะ widget URL ในอนาคต
    socket.join(`widget_audio_${userId}`);
    socket.emit('widget_joined', { success: true });

    // ── Emit leaderboard state ทันทีที่ widget join ──
    // ถ้ามีข้อมูลใน memory → ส่งเลย (ไม่ต้องรอ gift ถัดไป)
    // ถ้า memory ว่าง (backend restart) → โหลดจาก Firestore แล้วส่ง
    (async () => {
      try {
        let giftsData = getLeaderboard(userId, 'gifts');
        let likesData = getLeaderboard(userId, 'likes');
        if (giftsData.length === 0 && likesData.length === 0) {
          await loadLeaderboardFromFirestore(userId);
          giftsData = getLeaderboard(userId, 'gifts');
          likesData = getLeaderboard(userId, 'likes');
        }
        if (giftsData.length > 0) socket.emit('leaderboard_update', { type: 'gifts', data: giftsData });
        if (likesData.length > 0) socket.emit('leaderboard_update', { type: 'likes', data: likesData });
        // ส่ง recent members ด้วย
        const members = getRecentMembers(userId);
        if (members.length > 0) socket.emit('recent_members', { data: members });
      } catch {}
    })();

    // Auto-connect TikTok live ถ้ายังไม่มี connection อยู่
    // ทำให้ widget ดึงแชทสดได้โดยไม่ต้องมี dashboard เปิดค้างไว้
    if (!hasConnection(userId)) {
      try {
        const settingsDoc = await admin.firestore().collection('user_settings').doc(userId).get();
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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    // หา widget room ที่ socket นี้อยู่
    const widgetRoom = [...socket.rooms].find(r => r.startsWith('widget_'));
    if (!widgetRoom) return; // ต้องเคย join_widget ก่อน
    // Broadcast เฉพาะ pinnable widgetId
    if (!['pinchat', 'pinprofile'].includes(widgetId)) return;

    // Validate payload schema — อนุญาตเฉพาะ fields ที่ปลอดภัย
    const str = (v, maxLen = 100) => (typeof v === 'string' ? v.slice(0, maxLen) : undefined);
    const safePayload = {
      uniqueId:          str(payload.uniqueId, 64),
      nickname:          str(payload.nickname, 100),
      profilePictureUrl: str(payload.profilePictureUrl, 512),
      comment:           str(payload.comment, 300),
      color:             str(payload.color, 20),
    };
    // ลบ key ที่เป็น undefined ออก
    Object.keys(safePayload).forEach(k => safePayload[k] === undefined && delete safePayload[k]);

    // ส่ง style_update ด้วย payload พิเศษ _pin / _profile
    const styleKey = widgetId === 'pinchat' ? '_pin' : '_profile';
    io.to(widgetRoom).emit('style_update', { widgetId, style: { [styleKey]: safePayload } });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      clearUserLimit(socket.userId);

      // เริ่ม 1-minute timer — ถ้าไม่ reconnect ใน 60 วินาที ให้ตัด TikTok connection ด้วย
      // (ป้องกัน connection ค้างเมื่อปิด browser tab)
      if (!disconnectTimers.has(socket.userId)) {
        const uid = socket.userId;
        const timer = setTimeout(async () => {
          disconnectTimers.delete(uid);
          // ตรวจว่ายังไม่มีใคร reconnect มา
          if (!userSockets.has(uid)) {
            await stopConnection(uid);
            console.log(`[Server] Auto-disconnected TikTok for uid=${uid} (browser closed 60s)`);
          }
        }, 60_000);
        disconnectTimers.set(socket.userId, timer);
      }
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

  // ===== Cleanup stale battles every 30 minutes =====
  cleanupStaleBattles().catch(() => {});
  setInterval(() => cleanupStaleBattles().catch(() => {}), 30 * 60 * 1000);
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
