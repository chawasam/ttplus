---
name: ttplus-context
description: >
  TTplus project full context skill — โหลดเมื่อเริ่ม session ใหม่กับ project TTplus (ttsam.app)
  ครอบคลุม architecture, file structure, patterns, conventions, และ workflows ทั้งหมด
  ใช้ทุกครั้งที่ผู้ใช้พูดถึง TTplus, ttsam, widget, TikTok overlay, coinjar, dashboard,
  admin, TTS, actions, fireworks, nowplaying, หรือ feature ใดๆ ใน project นี้
  เพื่อให้เริ่มทำงานได้ทันทีโดยไม่ต้องอ่านไฟล์ซ้ำ
---

# TTplus Project Context

## Overview

**ttsam.app** — TikTok Live streaming overlay system สำหรับ streamer  
- OBS/TikTok Studio widgets ที่รับ event จาก TikTok Live แบบ real-time  
- เกม RPG (Ashenveil) ที่ใช้ gifts/likes/comments ของ viewers เล่น  
- TTS, Action triggers, Soundboard, Goal tracker  

**Repo:** `https://github.com/chawasam/ttplus`  
**Owner email:** `cksamg@gmail.com` (ใช้สำหรับ admin access)  
**Deploy:** Railway (backend + frontend auto-deploy จาก GitHub main branch)  
**Workflow:** แก้โค้ดใน Cowork sandbox → user รัน git push จาก PowerShell บน Windows  

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 13 (pages router), Tailwind CSS, clsx |
| State | React useState/useRef/useCallback |
| Realtime | Socket.io client |
| Auth | Firebase Auth (Google Sign-In) |
| Backend | Node.js + Express |
| Realtime | Socket.io server |
| Database | Firebase Firestore |
| TikTok | tiktok-live-connector |
| Deploy | Railway |

---

## Directory Structure

```
TTplus/
├── frontend/
│   ├── pages/
│   │   ├── _app.js              ← SPA loader + Firebase auth + StatusBar + single-tab guard
│   │   ├── index.js             ← redirect → /dashboard
│   │   ├── dashboard.js         ← TikTok connect/disconnect + status
│   │   ├── widgets.js           ← Widget management + customize drawer
│   │   ├── tts.js               ← TTS settings
│   │   ├── actions.js           ← Action triggers (GIF/video/alert)
│   │   ├── soundboard.js        ← Soundboard
│   │   ├── settings.js          ← User settings
│   │   ├── donate.js            ← Donate page
│   │   ├── faq.js               ← FAQ
│   │   ├── admin.js             ← Admin dashboard (owner only, 2-tier nav)
│   │   └── widget/              ← OBS widget pages (no auth, public)
│   │       ├── chat.js
│   │       ├── coinjar.js       ← Matter.js physics gift jar
│   │       ├── fireworks.js
│   │       ├── nowplaying.js    ← Spotify now playing (50+ styles)
│   │       ├── bossbattle.js    ← Boss battle game widget
│   │       ├── alert.js
│   │       ├── leaderboard.js
│   │       ├── likes-leaderboard.js
│   │       ├── gift-leaderboard.js
│   │       ├── goal.js
│   │       ├── viewers.js
│   │       ├── pinchat.js
│   │       ├── pinprofile.js
│   │       ├── ttsmonitor.js
│   │       └── myactions.js
│   ├── components/
│   │   ├── Sidebar.js           ← Fixed left nav (main pages only)
│   │   └── WidgetStyleEditor.js ← Color/style editor component
│   └── lib/
│       ├── socket.js            ← Socket.io singleton (connectSocket, getSocket)
│       ├── widgetStyles.js      ← WIDGET_DEFAULTS, styleToParams, parseWidgetStyles, rawToStyle
│       ├── api.js               ← Axios instance (auto-attach token)
│       ├── firebase.js          ← Firebase init (auth, googleProvider)
│       ├── errorHandler.js
│       └── soundboardStore.js
│
├── backend/
│   ├── server.js                ← Express app + Socket.io server (main entry)
│   ├── handlers/
│   │   ├── tiktok.js            ← TikTok connection mgmt (activeConnections Map)
│   │   ├── actions/
│   │   │   └── eventProcessor.js ← Routes TikTok events → actions/TTS/game
│   │   ├── game/
│   │   │   ├── combat.js
│   │   │   ├── account.js       ← TikTok username verify
│   │   │   ├── tiktokCurrency.js ← Gift → gold conversion
│   │   │   └── ...
│   │   └── admin/
│   │       ├── metrics.js       ← Server metrics (CPU, memory, connections)
│   │       ├── gameMetrics.js   ← Game stats (characters, dungeons, leaderboards)
│   │       └── errorLog.js      ← Error log store/read
│   ├── lib/
│   │   └── emitter.js           ← emitToUser(), emitToWidgetRoom(), broadcastAll()
│   ├── middleware/
│   │   ├── auth.js              ← verifyToken (Firebase ID token)
│   │   ├── rateLimiter.js
│   │   └── csrf.js
│   └── utils/
│       ├── widgetToken.js       ← assignCid, registerCid, getUidForCid, getCidForUid
│       ├── validate.js          ← sanitize, validateSettings
│       ├── logger.js            ← logSession, logAudit, flushAll
│       └── envCheck.js
```

---

## Architecture: How Everything Connects

### SPA Pattern (_app.js)
Main app โหลดทุกหน้าพร้อมกันตอน mount — ไม่ unmount เมื่อสลับ tab:
```js
const PAGES = [dashboard, tts, actions, widgets, soundboard, settings, donate, faq]
// render ทั้งหมด แต่ซ่อนด้วย display: 'none' | 'block'
// สลับโดย setActivePage(id) + router.replace(href, ..., { shallow: true })
```
Widget pages (`/widget/*`) render แยกโดย `!isMainPage` → ไม่มี SPA wrapper, ไม่มี auth

### Socket.io Rooms
```
userSockets Map:    userId → socket.id  (dashboard tab)
widget_${userId}:   room ที่ widget ทุกตัวของ user join อยู่
```

### Widget URL System
```
/widget/coinjar?cid=12345&bg=000000&bga=0&ct=jar
           ↑ widgetCid  ↑ style params        ↑ config params

widgetCid → backend: getUidForCid(cid) → userId → join widget_${userId} room
```

### Real-time Style Update Flow
```
widgets.js: saveStyleForWidget(widgetId, style)
  → socket.emit('push_style_update', { widgetId, style })
  → server.js: io.to('widget_${userId}').emit('style_update', { widgetId, style })
  → widget page: socket.on('style_update', ...) → อัปเดต CSS ทันที
```
ผู้ใช้ไม่ต้อง copy URL ใหม่ กด Save แล้ว widget เปลี่ยนทันที

### TikTok Event Flow
```
TikTok Live → tiktok.js (connection handler)
  → emitAll(event, payload) → socket + widget_${userId} room
  → widget ทุกตัว: socket.on('gift' | 'chat' | 'like' | 'follow', ...)
  → eventProcessor.js → actions/TTS/game logic
```

---

## Key Files Deep Dive

### widgetStyles.js (frontend/lib/)
ไฟล์สำคัญที่สุดสำหรับ widget URL params:

```js
WIDGET_DEFAULTS = {
  chat:     { bg, bga, tc, ac, fs, br, dir, max, rx, ry, rz, skin, bw, layout, fullBubble, lang, pagebg },
  coinjar:  { bg:'000000', bga:0, tc:'ffffff', ac:'ff8fa3', fs:13, br:20, jx:0, mi:150, gs:100, showSender:1, showGiftName:1, showGiftImage:1 },
  fireworks:{ bg, bga:0, tc, ac, fs, br, vol:80, patterns:'ring,willow,scatter,star,fan', pcount:10 },
  // ...ทุก widget มี defaults
}

// URL encode: styleToParams(style, widgetId) → query string (เฉพาะค่าที่ต่างจาก default)
// URL decode: parseWidgetStyles(params, widgetId) → style object
// socket: rawToStyle(raw, widgetId) → style object
```

### widgets.js (frontend/pages/)
WIDGETS array กำหนดทุกอย่างของ widget:
```js
{
  id: 'coinjar',
  icon: '🫙',
  name: 'Gift Jar',
  desc: '...',
  size: '1200 × 1200',
  noStyle: false,          // false = มี style drawer (bg/tc/ac/fs/br)
  configFields: [          // array นี้ drive ทั้ง customize UI และ URL params
    {
      key: 'ct',
      label: '🫙 รูปแบบภาชนะ',
      type: 'select',      // 'toggle' | 'number' | 'text' | 'select' | 'volume' | 'group' | 'row' | 'element' | 'nowplaying_style' | 'bosstype'
      default: 'jar',
      options: [{ value: 'jar', label: '🫙 โถแก้ว' }, ...]
    }
  ]
}
```
**type: 'group'** = section header เท่านั้น ไม่ถูกใส่ใน URL  
**buildCustomParams(w)** = รวม configFields ทั้งหมด → query string  
**getWidgetUrl(widgetId)** = style params + configFields params รวมกัน

### tiktok.js (backend/handlers/)
```js
activeConnections Map: userId → { connection, tiktokUsername, connectedAt, manualDisconnect, socketId }
reconnectTimers Map:   userId → timerId
reconnectAttempts Map: userId → count

// สำคัญมาก: stopConnection() ต้องไม่ delete จาก activeConnections
// ก่อนที่ 'disconnected' event จะ fire เพราะ handler ต้องอ่าน manualDisconnect
async function stopConnection(userId) {
  conn.manualDisconnect = true;
  conn.connection.disconnect(); // trigger 'disconnected' event async
  // handler จัดการ: delete map + log + emit
}
```

### server.js (backend/)
Socket authentication flow:
```js
userSockets Map: userId → socket.id
disconnectTimers Map: userId → timer (60s auto-disconnect)

// Socket auth
socket.on('authenticate', async ({ token }) => {
  decoded = await admin.auth().verifyIdToken(token)
  // cancel pending auto-disconnect timer ถ้า reconnect
  if (disconnectTimers.has(decoded.uid)) clearTimeout(...)
  userSockets.set(decoded.uid, socket.id)
  socket.userId = decoded.uid
})

// 1-minute auto-disconnect เมื่อปิด browser
socket.on('disconnect', () => {
  userSockets.delete(socket.userId)
  // timer 60s → stopConnection(userId)
})
```

### emitter.js (backend/lib/)
```js
emitToUser(uid, event, data)        // ส่งไปยัง user's dashboard socket
emitToWidgetRoom(uid, event, data)  // ส่งไปยัง widget_${uid} room
broadcastAll(event, data)           // ส่งทุก socket
```

### admin.js (frontend/pages/)
- Guard: `user.email !== NEXT_PUBLIC_OWNER_EMAIL` → redirect '/'
- 2-tier navigation: **🖥️ ระบบ** | **⚔️ เกม**
  - ระบบ: SystemTab (metrics, connections, error log, game totals)
  - เกม: 15 sub-tabs (overview, flags, players, activity, economy, rp, bugs, churn, roadmap, insights, items, skills, database, balance, gifts)
- API calls: `/api/admin/metrics`, `/api/admin/errors`, `/api/admin/game-metrics`
- Admin middleware: `ownerOnly` ใน backend (ตรวจ `req.user.email === OWNER_EMAIL`)

---

## Coinjar Widget (widget/coinjar.js)

Matter.js physics engine — coins/gifts ตกลงในภาชนะ:

```js
// 11 container types
const CONTAINERS = {
  jar, fishbowl, beermug, trophy, cauldron,
  chest, bucket, popcorn, skull, wineglass, flowerpot
}
// เลือกผ่าน ?ct=CONTAINER_NAME (default: jar)

// URL params ที่รับ
?ct=jar          // container type
?jx=0            // x offset (-200 to 200)
?mi=150          // minimum item size (10–600)
?gs=100          // global scale (50–300)
?showSender=1    // แสดงชื่อผู้ส่ง
?showGiftName=1  // แสดงชื่อของขวัญ
?showGiftImage=1 // แสดงรูปของขวัญ

// Physics walls สร้างด้วย
makeSeg(x1,y1,x2,y2,opts)  // segment wall
cFloor(x,y,w,h,opts)       // floor/ceiling block
vW(x,y1,y2,opts)            // vertical wall

// SVG glass effect
glassGrad(id, color)        // radial gradient สำหรับ glass
glassShell(path, gradId)    // glass shell SVG element
```

---

## Now Playing Widget (widget/nowplaying.js)

50+ styles ใน 6 categories (classic, minimal, animated, musical, themed, color):

```js
// URL params ที่รับ
?style=glass       // style id (glass, eq, vinyl, aurora, neon, ...)
?fade=1            // fade ขอบ (0/1)
?fontSize=13       // ขนาด title (8–36px)
?titleColor=ffffff // สี title (hex ไม่มี #)
?artistColor=ffffff99  // สี artist (hex หรือ hex+alpha)
?marquee=0         // เลื่อนข้อความ (0/1)
?marqueeDir=left   // ทิศทาง (left/right)
?marqueeSpeed=8    // วินาที/รอบ (2–30)

// parseColor() รับทั้ง '#rrggbb', 'rrggbb', 'rgba(...)', '#rrggbbaa'
```

---

## Adding New Features — Patterns

### เพิ่ม Widget ใหม่
1. สร้าง `frontend/pages/widget/NEWWIDGET.js`
2. เพิ่มใน `WIDGETS` array ใน `widgets.js`
3. เพิ่มใน `WIDGET_GROUPS` ใน `widgets.js`
4. เพิ่ม `WIDGET_DEFAULTS.NEWWIDGET` ใน `widgetStyles.js` (ถ้ามี style)
5. เพิ่มใน `parseWidgetStyles`, `styleToParams`, `rawToStyle` ใน `widgetStyles.js` (ถ้ามี custom params)
6. Widget รับข้อมูลจาก socket: `const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL`

### เพิ่ม configFields ใหม่ให้ Widget
```js
// widgets.js — WIDGETS array
configFields: [
  { key: 'myParam', label: '🎛️ My Setting', type: 'select', default: 'a',
    options: [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }] }
]
// ระบบจะ auto: build URL param, render UI ใน customize drawer
// type group (section header) ไม่ถูกใส่ใน URL อัตโนมัติ
```

### เพิ่ม API Route ใหม่ (backend)
```js
// server.js
app.get('/api/newroute', verifyToken, async (req, res) => {
  // req.user.uid, req.user.email พร้อมใช้
  try {
    const db = admin.firestore()
    // ...
    res.json({ data })
  } catch (err) {
    console.error('[NewRoute]', err.message)
    res.status(500).json({ error: 'Failed' })
  }
})
```

### เพิ่ม Socket Event ใหม่ (backend → widget)
```js
// จาก handler/eventProcessor/tiktok.js:
emitToWidgetRoom(userId, 'myevent', { payload })

// จาก widget page:
socket.on('myevent', (data) => { /* handle */ })
```

### เพิ่ม Admin-only Route
```js
// server.js
const { ownerOnly } = require('./middleware/auth')
app.get('/api/admin/newroute', verifyToken, ownerOnly, async (req, res) => { ... })
```

---

## Frontend Conventions

### Styling
- **Main pages** (dashboard, widgets ฯลฯ): Tailwind CSS + `clsx()`
- **Admin page**: Inline styles เท่านั้น — dark theme (`#0a0a0a` bg, `#111827` card, `#1f2937` border)
- **Widget pages**: ผสมกัน + CSS-in-JS สำหรับ animated styles

### Colors (Admin)
```js
const card  = { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '20px 24px' }
const badge = (col) => ({ background: col + '22', color: col, border: `1px solid ${col}44`, ... })
// accent colors: #f59e0b (gold/primary), #34d399 (green), #818cf8 (purple), #f87171 (red)
```

### Theme
```js
// Main pages มี theme toggle (dark/light)
// isDark = theme === 'dark'
// เก็บใน localStorage key 'theme'
```

### Comments
```js
// business logic → ภาษาไทย
// technical code → English หรือผสม
// section headers → ─── Section Name ─── (แบบนี้)
```

---

## Backend Conventions

### Firestore Collections
```
users/              ← user profiles
game_accounts/      ← game accounts (uid → { gold, realmPoints, tiktokUniqueId, ... })
game_characters/    ← characters
game_dungeons/      ← active dungeon runs
game_achievements/  ← achievements definitions
sessions/           ← connection logs
errors/             ← error logs
```

### Firebase Queries Pattern
```js
// Count queries — ไม่ดึง documents ทั้งหมด
const [a, b, c] = await Promise.all([
  db.collection('game_accounts').count().get(),
  db.collection('game_dungeons').where('status', '==', 'active').count().get(),
  db.collection('game_characters').orderBy('gold', 'desc').limit(10).get(),
])
// a.data().count, c.docs.map(d => d.data())
```

### Rate Limiting
```js
// API routes
generalLimiter    // ทั่วไป
connectLimiter    // /api/connect
settingsLimiter   // /api/settings

// Socket events
socketRateLimit(socket.id, maxPerWindow, windowMs)
clearSocketLimit(socket.id)   // ใน disconnect handler
clearUserLimit(socket.userId) // ใน disconnect handler
```

### Error Pattern
```js
try {
  // ...
  res.json({ success: true, data })
} catch (err) {
  console.error('[HandlerName] methodName:', err.message)
  res.status(500).json({ error: 'User-friendly message' })
}
```

---

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_OWNER_EMAIL=cksamg@gmail.com
```

### Backend (.env)
```
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
OWNER_EMAIL=cksamg@gmail.com
FRONTEND_URL=http://localhost:3000
IP_HASH_SALT=
NODE_ENV=development
PORT=4000
```

---

## Local Development

```powershell
# Terminal 1 — Backend
cd "C:\Users\ck_sa\Desktop\งาน claw\TTplus\backend"
npm install
npm run dev   # starts on :4000

# Terminal 2 — Frontend
cd "C:\Users\ck_sa\Desktop\งาน claw\TTplus\frontend"
npm install
npm run dev   # starts on :3000
```

ทดสอบ widgets: `http://localhost:3000/widget/coinjar?preview=1&ct=fishbowl`

---

## Git Workflow

User รัน git commands ใน **PowerShell บน Windows** เสมอ (sandbox ของ Claude ทำ git push/commit ไม่ได้):

```powershell
# ปกติ
git add <files>
git commit -m "feat: ..."
git push

# ถ้าเกิด index.lock error
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue

# ถ้าต้อง force remove tracked file
git rm -f frontend/pages/old-page.js
```

Deploy อัตโนมัติเมื่อ push ถึง main branch บน Railway

---

## Known Issues & Solutions

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| `index.lock` error | Git lock ค้าง | `Remove-Item .git\index.lock -Force` |
| Widget ยังอัปเดตหลัง disconnect | `stopConnection()` ไม่ emit ไปยัง widget room | แก้แล้ว: `emitToWidgetRoom('disconnected')` ใน `disconnected` event handler |
| Disconnect แสดง "กำลังเชื่อมต่อ" | Race condition: delete map ก่อน event fire | แก้แล้ว: ไม่ delete ใน `stopConnection()` ให้ handler จัดการ |
| เสียง alert ไม่ดัง | AudioContext blocked (ไม่ใช่ user gesture) | แก้แล้ว: สร้าง AudioContext ครั้งเดียว + `unlockAudio()` ใน click |
| หน้า admin หายหลัง merge | git overwrite | Restore ด้วย `git checkout <commit> -- <file>` |
| TikTok connection ค้างหลังปิด browser | ไม่มี cleanup | แก้แล้ว: 60-second auto-disconnect timer ใน socket disconnect handler |

---

## Security Notes

- **repo สาธารณะ** — ไม่มี secrets ใน code (ใช้ env vars ทั้งหมด)
- `OWNER_EMAIL` hardcode ใน `.env.example` เป็น public email — ไม่เป็นความลับ
- Admin routes: double-guard ด้วย `verifyToken` + `ownerOnly`
- Frontend admin guard: `user.email !== NEXT_PUBLIC_OWNER_EMAIL` → redirect
- Widget routes: ใช้ `widgetCid` (token) แทน uid โดยตรง
- Single-tab enforcement: BroadcastChannel `'ttplus_main_tab'` (main app เท่านั้น ไม่รวม widget)

---

## Skills เพิ่มเติม (อ่านก่อนทำงานส่วนนั้น)

| งาน | อ่าน |
|-----|------|
| เพิ่ม OBS Widget ใหม่ (widgets.js, widget page, CSP, CORS) | `.claude/skills/ttplus-widget/SKILL.md` |
| แก้/สร้าง Actions & Events, debug OBS ยิงผิด/ซ้ำ | `.claude/skills/ttplus-actions/SKILL.md` |
| เพิ่ม coinjar skin จากรูปภาพ PNG จริง | `.claude/skills/coinjar-skin/SKILL.md` |

path เหล่านี้ relative จาก `TTplus/` root ของ project

---

## Recent Changes (session context)

สิ่งที่ implement ล่าสุดเพื่อให้ทราบสถานะปัจจุบัน:

- **CoinJar**: เพิ่ม 10 container shapes (fishbowl, beermug, trophy, cauldron, chest, bucket, popcorn, skull, wineglass, flowerpot) ทั้งหมด glass/transparent, เลือกผ่าน `?ct=` หรือ customize drawer
- **Now Playing**: เพิ่ม customize controls สำหรับ fontSize, titleColor, artistColor, marquee toggle, marqueeDir, marqueeSpeed
- **Admin nav**: เปลี่ยนจาก single-row (overflow) เป็น 2-tier: 🖥️ ระบบ / ⚔️ เกม + scrollable sub-tabs
- **Auto-disconnect**: ปิด browser → 60s timer → `stopConnection()`
- **Widget disconnect fix**: `stopConnection()` emit `connection_status: disconnected` ไปทุก widget
- **Single-tab**: BroadcastChannel enforce main app tab เดียว (widget เปิดได้ไม่จำกัด)
- **Audio fix**: shared AudioContext + `unlockAudio()` ก่อน play + `socket.off` cleanup
