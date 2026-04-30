---
name: ttplus-widget-pitfalls
description: >
  ปัญหาที่เจอบ่อยและวิธีแก้ในการพัฒนา OBS widget ของ TTplus
  ครอบคลุม 4 หมวดหลัก: (1) React StrictMode double-invoke ทำให้ animation/ref พัง,
  (2) AudioContext autoplay policy ใน browser, (3) WebSocket connect ก่อน handshake
  เสร็จ, (4) Preview URL ไม่มี cid ทำให้ simulate ไม่ถึง widget

  ให้ trigger เมื่อ: widget ไม่แสดงผล, animation หยุด, socket ไม่ connect, simulate กดแล้วไม่มีอะไรเกิดขึ้น,
  AudioContext warning ใน console, "WebSocket closed before connection" error,
  พลุไม่ยิง, ของขวัญไม่ตก, ปุ่มจำลองไม่ทำงาน, widget preview ไม่รับ event —
  แม้จะไม่รู้สาเหตุก็ให้ trigger เพื่อ checklist ก่อนเสมอ
---

# TTplus Widget Pitfalls

ปัญหาที่เจอซ้ำๆ ในการพัฒนา widget ทั้งหมดมาจาก 4 root cause
อ่าน checklist ก่อนเสมอเมื่อ widget "ทำงานแปลกๆ" ใน dev mode

---

## 1. React StrictMode — `useRef` ไม่ reset ตอน re-mount

### อาการ
- Animation loop เริ่มแล้วหยุดทันที
- Event handler รันถึง guard `if (!ref.current) return` แล้วออกเงียบๆ
- Widget ดูเหมือนทำงานปกติแต่ไม่มีอะไรเกิดขึ้น

### สาเหตุ
React StrictMode (dev) รัน `useEffect` สองรอบ:
```
mount → cleanup → mount (real)
```
`useRef(initialValue)` ตั้งค่าแค่ตอน **สร้าง component ครั้งแรก** เท่านั้น
ไม่ใช่ทุกครั้งที่ mount ใหม่ — ดังนั้น cleanup ที่ตั้ง `ref.current = false`
จะยังค้างค่านั้นอยู่ตอน mount ครั้งที่สอง

```js
// ❌ ปัญหา
const runningRef = useRef(true);  // true ตอนสร้าง

useEffect(() => {
  const loop = () => {
    if (!runningRef.current) return;  // mount รอบ 2: false! → loop ตาย
    // ...
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    runningRef.current = false;  // cleanup ตั้ง false
    cancelAnimationFrame(raf);
  };
}, []);
```

### แก้
เพิ่ม reset เป็นบรรทัดแรกใน `useEffect`:

```js
// ✅ แก้แล้ว
useEffect(() => {
  runningRef.current = true;  // reset ทุกครั้งที่ mount — StrictMode safe

  const loop = () => {
    if (!runningRef.current) return;
    // ...
  };
  // ...
}, []);
```

**กฎ**: ref ที่ cleanup ตั้งเป็น false → ต้อง reset กลับใน useEffect ทุกครั้ง

---

## 2. AudioContext — "not allowed to start" warning ×N

### อาการ
```
The AudioContext was not allowed to start. It must be resumed (or created)
after a user gesture on the page.
```
warning ขึ้นซ้ำหลายครั้ง (×N ตามจำนวน event)

### สาเหตุ
- `new AudioContext()` ถูกเรียกตอน mount หรือจาก timer/socket event (ไม่ใช่ user gesture)
- browser บล็อก แต่ไม่ throw error → code วนลอง init ซ้ำทุก event

### แก้: สามชั้น

```js
let _audioCtx      = null;
let _fireworkBuf   = null;
let _rawMp3        = null;
let _initAttempted = false;  // ← ป้องกัน retry loop

// ชั้น 1: fetch bytes ล่วงหน้า (ไม่ต้องมี AudioContext)
async function prefetchBytes() {
  const res = await fetch('/sfx/sound.mp3');
  _rawMp3 = await res.arrayBuffer();
}

// ชั้น 2: init audio — ลองแค่ครั้งเดียว
async function _initAudio() {
  if (_fireworkBuf)   return;  // ready แล้ว
  if (!_rawMp3)       return;  // ยังไม่ได้ fetch
  if (_initAttempted) return;  // ลองแล้ว ไม่ retry
  _initAttempted = true;
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') await _audioCtx.resume();
    _audioBuffer = await _audioCtx.decodeAudioData(_rawMp3.slice(0));
  } catch (_) {}
}

// ชั้น 3: unlock เมื่อ user คลิก (browser preview)
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => {
    _initAttempted = false;  // reset flag → ลองใหม่ได้
    _initAudio();
  }, { once: true });
}
```

**สาเหตุที่ต้อง `.slice(0)`**: `decodeAudioData` โอน ownership ของ ArrayBuffer
ถ้าเรียกซ้ำจะ error — slice สร้าง copy ใหม่ทุกครั้ง

**OBS CEF**: ไม่มี autoplay restriction → init สำเร็จตั้งแต่ event แรก ไม่ต้องกังวล

---

## 3. Socket.io — "WebSocket closed before connection established"

### อาการ
```
WebSocket connection to 'ws://localhost:4000/...' failed:
WebSocket is closed before the connection is established.
```

### สาเหตุ
React StrictMode mount→cleanup→mount:
1. socket เริ่ม connect (WebSocket state: CONNECTING)
2. cleanup เรียก `socket.disconnect()` ก่อน handshake เสร็จ
3. browser log error

### แก้: `autoConnect: false` + `setTimeout`

แก้ที่ `createWidgetSocket` (ใน `lib/widgetSocket.js`) ครั้งเดียว ทุก widget ได้ประโยชน์:

```js
const socket = io(BACKEND_URL, {
  // ...options...
  autoConnect: false,  // ← ไม่ connect ทันที
});

// Register handlers ก่อน (จะได้ไม่พลาด event แรก)
socket.on('connect', () => { /* join_widget */ });
// ...

// Defer connect 1 tick — ถ้า StrictMode cleanup เรียก disconnect() ก่อน
// timer นี้ยิง → clearTimeout → socket ไม่เปิด WS เลย
const _timer = setTimeout(() => socket.connect(), 0);

// Wrap disconnect ให้ยกเลิก timer ด้วยเสมอ
const _orig = socket.disconnect.bind(socket);
socket.disconnect = (...args) => {
  clearTimeout(_timer);
  return _orig(...args);
};
```

**ทำไม setTimeout(0) ได้ผล**: cleanup ใน StrictMode รัน synchronous ก่อน macrotask
ดังนั้น disconnect() เรียกก่อน timer ยิงเสมอ → timer ถูก clear → WS ไม่เปิด

---

## 4. Preview URL ไม่มี `cid` — simulate ไม่ถึง widget

### อาการ
- กดปุ่ม "จำลองของขวัญ" → toast ขึ้น แต่ widget ไม่มีอะไรเกิดขึ้น
- widget อื่น (เช่น coinjar ใน OBS) รับ event ได้ แต่ tab ที่เปิดจาก "▶ ดูตัวอย่าง" ไม่รับ

### สาเหตุ
`getPreviewUrl()` ใน `widgets.js` เดิมสร้าง URL เป็น `?preview=1` โดยไม่มี `&cid=`
→ widget ใน tab นั้นมี `wt = null` → ไม่สร้าง socket → ไม่ join room → ไม่รับ event

```js
// ❌ เดิม
const base = `${baseUrl}/widget/${widgetId}?preview=1`;

// ✅ แก้แล้ว
const cidSuffix = widgetCid ? `&cid=${widgetCid}` : '';
const base = `${baseUrl}/widget/${widgetId}?preview=1${cidSuffix}`;
```

**อย่าลืมเพิ่ม `widgetCid` ใน deps array** ของ `useCallback`:
```js
}, [baseUrl, widgetCid, styles, buildCustomParams, customConfigs]);
```

**หลังแก้**: tab preview ที่เปิดอยู่เดิมยังใช้ URL เก่า → ต้อง **ปิดแล้วเปิด tab ใหม่**

---

## Checklist เมื่อ widget ทำงานแปลกๆ ใน dev

```
□ Animation หยุด / event handler ไม่ทำงาน?
  → ตรวจ useRef ที่ cleanup ตั้ง false — เพิ่ม reset ใน useEffect บรรทัดแรก

□ "AudioContext not allowed" warning ขึ้นซ้ำ?
  → ใช้ _initAttempted flag + fetch bytes ก่อน (ไม่สร้าง AudioContext ใน prefetch)

□ "WebSocket closed before connection established"?
  → ตรวจ createWidgetSocket — ต้องมี autoConnect:false + setTimeout + wrapped disconnect

□ Simulate กดแล้ว toast ขึ้น แต่ widget ไม่รับ event?
  → ปิด tab preview แล้วเปิดใหม่ — URL เดิมอาจไม่มี &cid=

□ ทุกอย่างดูถูกแต่ยังไม่ทำงาน?
  → production build ไม่มี StrictMode → ลอง build แล้วทดสอบใน OBS จริง
```

---

## บันทึก: ปัญหาที่เจอจริง (2026-04-30)

| ปัญหา | สาเหตุ | ไฟล์ที่แก้ |
|------|--------|----------|
| fireworks ไม่ยิงพลุ | `runningRef` ไม่ reset → `spawnOne` return ทันที | `fireworks.js` |
| AudioContext warning ×14 | retry ทุก demo event | `fireworks.js` |
| WebSocket error | StrictMode cleanup disconnect ก่อน handshake | `widgetSocket.js` |
| simulate ไม่ถึง preview tab | preview URL ไม่มี cid | `widgets.js` |
