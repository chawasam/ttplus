# CLAUDE.md — TTplus / TTsam Project

## Overview
TTplus (TTsam) คือระบบ TikTok Live overlay + game platform สำหรับ VJ/streamer
- **Backend**: Express.js + Socket.IO + Firebase Admin SDK (Node.js) — รันที่ `localhost:4000`
- **Frontend**: Next.js (React) — รันที่ `localhost:3000`
- **Database**: Firestore (Firebase) — Blaze plan (Pay-as-you-go)
- **Deploy**: Railway (backend) + Vercel หรือ Railway (frontend)

---

## Architecture ที่สำคัญมาก

### 1. All-Pages-Always-Mounted Pattern (Frontend)
`_app.js` import และ render **ทุกหน้าพร้อมกัน** — ซ่อนหน้าที่ไม่ได้ใช้ด้วย `display:none`
```js
// _app.js — ทุกหน้า mount อยู่ตลอดเวลา ไม่ unmount เมื่อสลับแถบ
import Dashboard  from './dashboard';
import ActionsPage from './actions';
// ... ทุกหน้าพร้อมกัน
```
**ผลกระทบ:** useEffect ใน actions.js, dashboard.js ฯลฯ ทำงานทั้งหมดตลอดเวลา ไม่ว่าจะเปิดแถบไหนอยู่

### 2. Socket.IO Architecture
- **Frontend singleton**: `lib/socket.js` — `getSocket()` คืน instance เดียวตลอด per browser tab
- **Backend user map**: `userSockets = Map<uid, socketId>` — เก็บ socket ล่าสุดของแต่ละ user (last-connect wins)
- `emitToUser(uid, event, data)` → ส่งถึง socket คนเดียว คืน `boolean` (true = ส่งสำเร็จ)

### 3. OBS Command Path (สำคัญมาก — ห้ามสับสน)
OBS commands ไปทาง **Socket.IO เท่านั้น** ผ่าน dashboard (`actions.js`):
```
TikTok event → eventProcessor.js → emitToUser(vjUid, 'obs_action', ...) → actions.js handleObsAction → obsQueue → fireObsCommands → OBS WebSocket ws://localhost:4455
```
**widget/myactions.js** (Screen 1/2 overlay) ทำหน้าที่แสดง **visual/audio เท่านั้น** (รูป, วิดีโอ, alert, TTS) — ไม่ยิง OBS commands เลย

### 4. Actions/Events Pipeline
```
TikTok Live event → handlers/tiktok.js → processEvent(vjUid, eventType, data)
                                              ↓
                                    eventProcessor.js
                                    - ดึง events+actions จาก Firestore (cache 60s)
                                    - match triggers
                                    - queueAction() → emit obs_action + เก็บ Firestore queue
```
**Firestore queue** (`tt_action_queue`) → `widget/myactions.js` poll ทุก 1.5s → แสดง visual

---

## ไฟล์หลักและหน้าที่

### Backend
| ไฟล์ | หน้าที่ |
|------|--------|
| `server.js` | Express + Socket.IO setup, userSockets map, middleware mount |
| `handlers/tiktok.js` | TikTok Live connection (tiktok-live-connector), fire processEvent ทุก event |
| `handlers/actions/eventProcessor.js` | Core: match events → queue actions → emit OBS |
| `lib/emitter.js` | `emitToUser()`, `emitToWidgetRoom()`, `broadcastAll()` |
| `routes/actions.js` | REST API สำหรับ CRUD actions/events + simulate endpoint |
| `routes/coinjar.js` | CoinJar widget — **ระวัง: มี processEvent call อยู่ด้วย** |
| `middleware/auth.js` | Firebase JWT verification |
| `middleware/csrf.js` | Single-use CSRF token (64-char hex) |

### Frontend
| ไฟล์ | หน้าที่ |
|------|--------|
| `pages/_app.js` | Mount ทุกหน้า, StatusBar, auth listener |
| `pages/actions.js` | Dashboard Actions & Events (~2500+ บรรทัด) — OBS handler, simulate, action CRUD |
| `pages/widgets.js` | หน้า Widget URLs + style editor |
| `pages/widget/myactions.js` | Screen 1/2 overlay — visual only (ไม่มี OBS) |
| `pages/dashboard.js` | หน้าหลัก: TikTok status, stats, live feed |
| `lib/api.js` | Axios instance + CSRF management + auto-retry (401/403) |
| `lib/socket.js` | Socket.IO client singleton + token refresh |

---

## Firestore Collections หลัก
| Collection | ข้อมูล |
|-----------|--------|
| `tt_events` | Event triggers ของแต่ละ VJ (uid, trigger type, actionIds) |
| `tt_actions` | Action definitions (types, obsScene, obsSource, pictureUrl ฯลฯ) |
| `tt_action_queue` | Queue สำหรับ visual overlay — widget poll ดึงไป, field `played` |
| `user_settings` | Settings ของ VJ รวม `actionsEnabled` |
| `users` | ข้อมูล user/character |

---

## Critical Patterns & Pitfalls

### Socket.IO Listener — ต้อง off ก่อน on เสมอ
```js
// ✅ ถูก — ป้องกัน duplicate handler เมื่อ useEffect re-run หรือ React StrictMode
socket.off('obs_action');
socket.on('obs_action', handleObsAction);
return () => socket.off('obs_action');

// ❌ ผิด — ถ้า effect re-run (obsSourceMap เปลี่ยน ฯลฯ) จะมี handler ซ้อน
socket.on('obs_action', handleObsAction);
return () => socket.off('obs_action', handleObsAction); // function reference ไม่ตรง
```

### Guard async function — ต้องใช้ useRef ไม่ใช่ useState
```js
// ✅ ถูก — lock ทันที (sync) ก่อน React re-render
const simulatingRef = useRef(false);
const simulateEvent = useCallback(async () => {
  if (simulatingRef.current) return;
  simulatingRef.current = true;
  try { ... } finally { simulatingRef.current = false; }
}, [...deps]);

// ❌ ผิด — useState เป็น async, double-fire ได้ก่อน re-render
const [simulating, setSimulating] = useState(false);
if (simulating) return; // อาจไม่ทัน
```

### processEvent deduplication ข้าม Events
`eventProcessor.js` มี `firedActionIds` Set ป้องกัน action เดียวกันยิงซ้ำ เมื่อหลาย events match พร้อมกัน (เช่น `specific_gift` + `gift_min_coins` ชนกัน):
```js
const firedActionIds = new Set();
for (const ev of prioritized) {
  for (const actionId of [...new Set(ev.actionIds || [])]) {
    if (firedActionIds.has(actionId)) continue; // ข้ามถ้ายิงไปแล้ว
    ...
    firedActionIds.add(actionId);
  }
}
```

### Simulate Event — Double-fire trap
`/api/coinjar/simulate` เรียก `processEvent` เองด้วย → ถ้า frontend เรียก coinjar simulate **พร้อมกับ** `/api/actions/simulate-event` จะยิง OBS 2 ครั้ง
**ใน actions.js simulate:** ไม่ต้องเรียก coinjar simulate เป็น side effect

### OBS Queue Identity Key
```js
const key = `${action.obsScene || ''}__${action.obsSource || ''}`;
// key เดียวกัน → queue (เล่นต่อกัน + 300ms gap)
// key ต่างกัน → parallel (เล่นพร้อมกัน)
```

### eventProcessor Cache
- TTL 60 วินาที per vjUid
- `invalidateCache(vjUid)` — เรียกเมื่อ user แก้ actions/events
- Cache เก็บทั้ง `events`, `actions` (embedded ใน `_actions`), และ `actionsEnabled`

### CSRF Auto-Retry
`lib/api.js` retry อัตโนมัติ 1 ครั้งเมื่อ 403 CSRF — ทำให้ POST เดียวกัน request ถึง backend 2 ครั้งถ้า CSRF หมดอายุ ระวังเมื่อ endpoint มี side effect

---

## OBS Integration
- Protocol: **OBS WebSocket v5** (`ws://localhost:4455`)
- ใช้ `ObsWs` class ใน `actions.js` (มี `obsSourceMap` สำหรับ map source name → sceneItemId)
- `fireObsCommands(host, port, action, callback, obsSourceMap)` — ฟังก์ชันหลัก
- `obsQueueRef` = Map ของ queue per identity key (ref ไม่ใช่ state)
- `obsEnqueueRef` = ref ที่ชี้ไป enqueue function ปัจจุบัน (ใช้ข้าม useEffect)

---

## Widget URL Pattern
```
/widget/myactions?cid=12345&screen=1   ← Screen 1 (visual overlay)
/widget/myactions?cid=12345&screen=2   ← Screen 2 (visual overlay)
/widget/{name}?cid=12345               ← widget อื่นๆ (chat, leaderboard ฯลฯ)
```
`cid` = 4-8 digit code แทน Firebase UID (จาก `widgetToken.js`)

---

## Dev Workflow
```bash
# Backend
cd backend && npm run dev    # nodemon
# หรือ
node server.js

# Frontend
cd frontend && npm run dev   # Next.js dev server

# Hard refresh browser (ล้าง Next.js cache)
Ctrl+Shift+R
```

## Debug เมื่อมีปัญหา

### OBS ยิงซ้ำ
1. เพิ่ม log ใน `eventProcessor.js` queueAction ก่อน emitToUser
2. ดู stack trace: `new Error().stack.split('\n')[2]`
3. ตรวจว่า processEvent ถูกเรียกกี่ครั้ง และจากไหน

### Socket event ไม่มา / มาซ้ำ
1. ตรวจ `userSockets.get(uid)` ว่า socketId ถูกต้อง
2. ตรวจ listener count ใน browser devtools
3. ตรวจ useEffect deps — `obsSourceMap` เปลี่ยนบ่อยทำให้ effect re-run

### Firestore quota / 500 errors
- ตรวจ Firebase Console → Usage — ถ้า Spark plan ให้ upgrade เป็น Blaze
- Backend จัดการ RESOURCE_EXHAUSTED (code 8) ไม่ให้ crash แล้ว

---

## ข้อมูลเพิ่มเติม
- TikTok Live library: `tiktok-live-connector` (npm)
- Theme: dark/light toggle — default dark (`#111520` background)
- Tailwind CSS + clsx สำหรับ conditional classes
- React Hot Toast สำหรับ notifications
- Firebase Auth: Google OAuth
