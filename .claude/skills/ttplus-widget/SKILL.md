---
name: ttplus-widget
description: >
  เพิ่ม OBS Widget ใหม่ให้โปรเจกต์ TTplus ตั้งแต่ต้นจนใช้งานได้จริง
  ครอบคลุมทุกจุดที่ต้องแตะ: widgets.js (registry), หน้า widget page,
  next.config.js (CSP), server.js (CORS/route)
  ให้ trigger เมื่อ: พูดถึงการสร้าง widget ใหม่ใน TTplus, เพิ่ม overlay ให้ OBS,
  เพิ่ม browser source ใหม่, สร้างหน้า widget page ใหม่, หรือต้องการให้ผู้ใช้เลือก
  widget ได้จากหน้า Widgets
---

# TTplus — เพิ่ม OBS Widget ใหม่

## ภาพรวม

Widget หนึ่งตัวประกอบด้วย **4 จุดที่ต้องแตะ** (บางข้อข้าม ได้ ถ้าไม่จำเป็น):

| จุด | ไฟล์ | เมื่อไหร่ |
|-----|------|----------|
| 1 | `frontend/pages/widgets.js` | ทุกครั้ง — เพิ่ม entry ใน `WIDGETS` + group |
| 2 | `frontend/pages/widget/<name>.js` | ทุกครั้ง — หน้า widget จริง |
| 3 | `frontend/next.config.js` | ถ้า widget โหลดรูปหรือ fetch จาก domain ใหม่ |
| 4 | `backend/server.js` | ถ้า widget ต้องการ backend endpoint แบบ public (เรียกจาก OBS) |

---

## จุดที่ 1 — widgets.js: เพิ่ม entry ใน WIDGETS array

```js
// ตัวอย่าง widget แบบ simple (ไม่มี configFields)
{ id: 'mywidget', icon: '🎯', name: 'My Widget',
  desc: 'คำอธิบายสั้นๆ — OBS Size ที่แนะนำ', size: '400 × 300' },

// ตัวอย่าง widget แบบมี configFields
{
  id: 'mywidget', icon: '🎯', name: 'My Widget',
  desc: 'คำอธิบาย', size: '400 × 300', noStyle: true,
  configFields: [
    { key: '_g1',      label: '⚙️ ตั้งค่า',       type: 'group' },
    { key: 'maxItems', label: 'จำนวนสูงสุด',       type: 'number',  default: 10, min: 1, max: 50, step: 1 },
    { key: 'theme',    label: 'ธีม',               type: 'select',  default: 'dark',
      options: [{ value: 'dark', label: '🌑 Dark' }, { value: 'light', label: '☀️ Light' }] },
    { key: 'showX',    label: 'แสดง X',            type: 'toggle',  default: 1, onLabel: 'เปิด', offLabel: 'ปิด' },
    { key: 'color',    label: 'สี Accent',          type: 'colorhex', default: 'ffffff' },
    { key: 'vol',      label: '🔊 ระดับเสียง',      type: 'volume',  default: 80 },
  ],
},
```

### flags ของ WIDGETS entry

| key | ความหมาย |
|-----|---------|
| `noStyle` | ซ่อนปุ่ม Style Editor (widget นี้ไม่ใช้ global widget styles) |
| `liveConfig` | URL update แบบ live เมื่อ config เปลี่ยน (ไม่ต้อง refresh) |

### configField types

| type | ใช้เมื่อ |
|------|---------|
| `group` | หัวข้อกั้นกลุ่ม (ไม่มี value) |
| `number` | ตัวเลข — ต้องมี `min`, `max`, `step` |
| `text` | text input — ใส่ `maxLen` ถ้าจำเป็น |
| `toggle` | on/off — ใส่ `onLabel`, `offLabel` |
| `select` | dropdown — ใส่ `options: [{value, label}]` |
| `colorhex` | color picker — default เป็น hex ไม่มี `#` |
| `volume` | slider 0–100 |
| `row` | หลาย fields ในแถวเดียว — ใส่ `fields: [...]` |
| `url` | URL input (ซ่อนใน UI ได้ด้วย `hideInUI: true`) |

### เพิ่มใน WIDGET_GROUPS

```js
const WIDGET_GROUPS = [
  { id: 'chat',  label: '💬 Chat',                    ids: ['chat', 'pinchat', 'pinprofile'] },
  { id: 'gifts', label: '🎁 ของขวัญ & Leaderboard',  ids: ['coinjar', 'fireworks', ...] },
  { id: 'obs',   label: '🎛️ OBS / Stream',            ids: ['bossbattle', 'myactions', ...] },
  { id: 'music', label: '🎵 Music',                   ids: ['nowplaying', 'spotifyqueue'] },
  // เพิ่ม group ใหม่ หรือใส่ id ของ widget เข้าไปใน group ที่เหมาะสม
];
```

---

## จุดที่ 2 — widget page: `frontend/pages/widget/<name>.js`

### โครงสร้างหลัก (skeleton)

```js
// widget/<name>.js — <Description> สำหรับ OBS
// URL params: ?cid=xxx &param1=val1 ...

import { useEffect, useState, useRef } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';

export default function MyWidget() {
  const [data, setData]     = useState(null);
  const [config, setConfig] = useState({});
  const timerRef            = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid    = params.get('cid') || '';

    // parse params → config object
    const cfg = {
      maxItems: num(params.get('maxItems'), 10, 1, 50),
      theme:    params.get('theme') || 'dark',
      showX:    flag(params.get('showX'), true),
    };
    setConfig(cfg);

    // ─── เลือก pattern ตามประเภท widget ───
    // A) Socket.IO realtime  → ดู "Pattern A" ด้านล่าง
    // B) API polling         → ดู "Pattern B" ด้านล่าง
    // C) Firestore queue     → ดู "Pattern C" ด้านล่าง
  }, []);

  if (!data) return <div style={{ color: '#fff' }}>Loading...</div>;

  return (
    <div style={{ background: 'transparent', ... }}>
      {/* widget content */}
    </div>
  );
}
```

### Helper functions (copy-paste)

```js
function num(v, def, min, max) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function flag(v, def) {
  if (v === undefined || v === null || v === '') return def;
  return v === '1' || v === 'true' || v === true;
}
function parseColor(raw, def) {
  if (!raw) return def;
  if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw)) return `#${raw}`;
  return def;
}
```

---

### Pattern A — Socket.IO realtime (เหมาะกับ: chat, alerts, live events)

```js
import { createWidgetSocket } from '../../lib/widgetSocket';

// ใน useEffect:
const socket = createWidgetSocket(cid, {
  my_event: (data) => {
    setData(prev => [...prev, data]);
  },
  style_update: ({ widgetId, style }) => {
    if (widgetId !== 'mywidget') return;
    // update styles
  },
});
if (!socket) return;

return () => socket.disconnect();
```

**หมายเหตุ:** `createWidgetSocket` (จาก `lib/widgetSocket.js`) จัดการ
auth token, reconnect, และ join room ให้อัตโนมัติ

---

### Pattern B — API Polling (เหมาะกับ: Spotify now-playing, queue, leaderboard)

```js
const POLL_MS = 10_000;

// ใน useEffect:
async function fetchData() {
  try {
    const res  = await fetch(`${BACKEND}/api/my-endpoint?cid=${cid}`);
    const json = await res.json();
    if (json.data) setData(json.data);
  } catch (e) {
    console.warn('[widget] fetch error:', e);
  }
}

fetchData();
timerRef.current = setInterval(fetchData, POLL_MS);
return () => clearInterval(timerRef.current);
```

**เมื่อไหร่ต้องอัพเดท CORS:** endpoint นี้ถูกเรียกจาก OBS (origin ต่างกัน)
→ ดูจุดที่ 4

---

### Pattern C — Firestore Queue Polling (เหมาะกับ: action queue, visual effects)

```js
import admin from '../../lib/firebase';   // client SDK
import { getFirestore, collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';

const POLL_MS = 1500;

// ใน useEffect:
// ดู widget/myactions.js เป็น reference — ซับซ้อนมาก แนะนำ copy จากนั้น
```

---

## จุดที่ 3 — next.config.js: CSP สำหรับ Widget

**ไม่ต้องแก้** ถ้า widget โหลดเฉพาะจาก:
- `api.ttsam.app` / BACKEND → อยู่ใน `connect-src` แล้ว
- TikTok CDN (avatars, gifts) → อยู่ใน `img-src` แล้ว
- `cdnjs.cloudflare.com` (Matter.js ฯลฯ) → อยู่ใน `script-src` แล้ว

**ต้องแก้ `widgetCSP`** เมื่อ widget โหลดจาก domain ใหม่:

```js
// frontend/next.config.js — widgetCSP object (บรรทัด ~28)
const widgetCSP = [
  ...
  // เพิ่ม domain ใน directive ที่เหมาะสม:
  "img-src 'self' data: ... https://new-image-cdn.com",    // รูปภาพ
  `connect-src 'self' ${BACKEND} ... https://new-api.com`, // fetch/WebSocket
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://new-cdn.com", // script
].join('; ');
```

**ตัวอย่างที่ทำไปแล้ว:**
- Spotify album art → เพิ่ม `https://i.scdn.co https://*.scdn.co https://mosaic.scdn.co` ใน `img-src`

---

## จุดที่ 4 — server.js: CORS สำหรับ Backend Endpoint

### เมื่อไหร่ต้องแก้

Widget ที่เรียก backend API โดยตรง (Pattern B) จาก OBS Browser Source
ต้องการ `origin: *` เพราะ OBS ไม่ส่ง origin เดียวกับ FRONTEND_URL

### เพิ่มใน PUBLIC_CORS_PATHS

```js
// backend/server.js — บรรทัด ~110
const PUBLIC_CORS_PATHS = [
  '/api/spotify/now-playing',
  '/api/spotify/queue',
  '/api/widget/',        // prefix match — ครอบคลุม /api/widget/* ทุกเส้นทาง
  '/api/leaderboard',
  '/api/my-new-endpoint',  // ← เพิ่มตรงนี้
];
```

**แนะนำ:** ถ้าสร้าง endpoint ใหม่สำหรับ widget โดยเฉพาะ ใช้ prefix `/api/widget/`
เพราะ `PUBLIC_CORS_PATHS` มี `/api/widget/` ครอบคลุมอยู่แล้ว

### Template route สำหรับ widget endpoint

```js
// backend/routes/mywidget.js
const express  = require('express');
const admin    = require('firebase-admin');
const { getUidForCid } = require('../utils/widgetToken');

const router = express.Router();

// GET /api/widget/mywidget?cid=12345
router.get('/', async (req, res) => {
  const { cid } = req.query;
  if (!cid) return res.status(400).json({ error: 'missing cid' });

  const uid = getUidForCid(cid);
  if (!uid) return res.status(404).json({ error: 'invalid cid' });

  try {
    // ดึงข้อมูลจาก Firestore หรือ external API
    const data = await getDataForUser(uid);
    res.json({ data });
  } catch (err) {
    console.error('[API] mywidget:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
```

Mount ใน server.js:

```js
// backend/server.js — ส่วน Routes (บรรทัด ~164)
app.use('/api/widget/mywidget', require('./routes/mywidget'));
// หรือถ้า endpoint ไม่ต้องการ auth → ไม่ต้องใส่ verifyToken middleware
```

---

## Checklist สรุป

- [ ] เพิ่ม entry ใน `WIDGETS` array (widgets.js)
- [ ] เพิ่ม widget id ใน `WIDGET_GROUPS` (widgets.js)
- [ ] สร้าง `pages/widget/<name>.js`
- [ ] (ถ้าโหลด domain ใหม่) อัพเดท `widgetCSP` ใน next.config.js
- [ ] (ถ้ามี backend endpoint) เพิ่มใน `PUBLIC_CORS_PATHS` และ mount route ใน server.js
- [ ] ทดสอบด้วย `?cid=xxx&preview=1` หรือ demo mode ถ้ามี

---

## อ้างอิง — Widget ที่ทำแล้ว

| Widget | Pattern | Backend endpoint | CSP ใหม่ |
|--------|---------|-----------------|---------|
| `spotifyqueue` | API Polling (10s) | `/api/spotify/queue` | `i.scdn.co`, `*.scdn.co` |
| `nowplaying` | API Polling (5s) | `/api/spotify/now-playing` | — (ใช้ CDN เดิม) |
| `coinjar` | Firestore Queue (1.5s) | ไม่มี | `cdnjs.cloudflare.com` (Matter.js) |
| `chat` | Socket.IO realtime | ไม่มี | TikTok CDN (avatar) |
| `bossbattle` | Socket.IO realtime | `/api/widget/bossbattle` (POST dmg) | — |
