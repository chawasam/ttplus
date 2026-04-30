---
name: ttplus-actions
description: >
  ความรู้เชิงลึกเกี่ยวกับระบบ Actions & Events ของ TTplus รวมถึงสถาปัตยกรรม,
  bugs ที่เคยเจอและวิธีแก้, patterns ที่ถูกต้อง, และจุด pitfall สำคัญ
  ให้ trigger เมื่อ: พูดถึงระบบ actions/events, OBS ยิงผิด/ซ้ำ, obs_action socket,
  eventProcessor, queueAction, cooldown, cache, simulate event, tt_action_queue,
  myactions widget, obsSceneReturn, fillTemplate, หรือเพิ่ม event trigger ใหม่
---

# TTplus — Actions & Events System

## ภาพรวมสถาปัตยกรรม

```
TikTok event → tiktok.js → processEvent(vjUid, eventType, data)
                                    ↓
                          eventProcessor.js
                          1. getVjEvents()    ← Firestore cache 60s
                          2. filter matching events (trigger type)
                          3. prioritize (specific_gift vs gift_min_coins)
                          4. checkCooldown() per action
                          5. firedActionIds dedup
                          6. queueAction() → emit OBS + write Firestore

   ┌─ OBS path (Socket.IO) ──────────────────────────────────────────┐
   │  emitToUser(vjUid, 'obs_action', ...) → actions.js handleObsAction
   │  → obsQueue → fireObsCommands → OBS WebSocket ws://localhost:4455
   └─────────────────────────────────────────────────────────────────┘

   ┌─ Visual/Audio path (Firestore queue) ────────────────────────────┐
   │  tt_action_queue doc (played:false) ← queueAction() เขียนลง
   │  widget/myactions.js poll ทุก 1.5s → ดึง → แสดง gif/video/alert
   │  → ลบ doc ทันทีเมื่อ play (ไม่ mark played:true)
   └─────────────────────────────────────────────────────────────────┘
```

**obsHandledBySocket flag** — เมื่อ dashboard เปิดอยู่ socket ส่ง OBS ทันที → flag=true → overlay ข้าม OBS commands ป้องกันยิงซ้ำ 2 ครั้ง

---

## ไฟล์หลักและหน้าที่

| ไฟล์ | หน้าที่ |
|------|---------|
| `backend/handlers/actions/eventProcessor.js` | Core: match → cooldown → dedup → queue |
| `backend/handlers/actions/actionsHandler.js` | REST CRUD actions/events + fireAction endpoint |
| `backend/routes/actions.js` | Express mount + simulate endpoint |
| `frontend/pages/actions.js` | Dashboard: OBS handler, simulate, action CRUD (~2500+ บรรทัด) |
| `frontend/pages/widget/myactions.js` | Screen 1/2 overlay — visual/audio เท่านั้น |

---

## Bugs ที่เคยเจอและแก้แล้ว (สำคัญมาก — อย่าทำซ้ำ)

### Bug 1 — obsSceneReturn/obsSourceReturn หายจาก queue

**อาการ:** OBS switch scene แล้วไม่สลับกลับ

**สาเหตุ:** `eventProcessor.js` บันทึก field ชื่อ `obsSceneDuration`/`obsSourceDuration` ลง Firestore queue แต่ `myactions.js` ไปอ่าน `item.obsSceneReturn`/`item.obsSourceReturn` → ค่าเป็น `undefined` ตลอด

**แก้:** ใช้ field ที่ถูกต้องตามที่ `myactions.js` คาดหวัง:
```js
// ✅ ถูก — ใน queueAction และ emitToUser
obsSceneReturn:  action.obsSceneReturn  ?? false,
obsSourceReturn: action.obsSourceReturn ?? false,

// ❌ ผิด — field ชื่อผิด
obsSceneDuration:  ...,
obsSourceDuration: ...,
```

---

### Bug 2 — updateAction ไม่บันทึก obsReturn fields

**อาการ:** แก้ค่า OBS Return ใน UI แล้ว save → ค่าไม่เปลี่ยน (reload กลับค่าเดิม)

**สาเหตุ:** `actionsHandler.js` มี allowlist field ที่รับ PUT แต่ไม่มี `obsSceneReturn` และ `obsSourceReturn` อยู่ในนั้น → ถูก strip ออกก่อน write Firestore

**แก้:** เพิ่ม field เหล่านี้เข้าใน allowlist ของ `updateAction`:
```js
// เช็ค actionsHandler.js — ต้องมี field เหล่านี้ใน allowed set:
const ALLOWED_FIELDS = new Set([
  'name', 'types', 'enabled',
  'obsScene', 'obsSceneReturn',   // ← ต้องมีทั้งคู่
  'obsSource', 'obsSourceReturn', // ← ต้องมีทั้งคู่
  'displayDuration', ...
]);
```

---

### Bug 3 — fireAction field mismatch (vjUid vs uid)

**อาการ:** กด Fire Action แล้ว 403 / "action not found for this user"

**สาเหตุ:** `createAction` บันทึก field ชื่อ `uid` แต่ `fireAction` เช็ค `snap.data().vjUid !== uid` → หาเจ้าของไม่เจอทุกครั้ง

**แก้:** ให้ consistent — ใช้ `uid` ทั้ง read และ write:
```js
// ✅ ถูก
if (snap.data().uid !== uid) return res.status(403).json({ error: 'forbidden' });

// ❌ ผิด — field ชื่อไม่ตรงกัน
if (snap.data().vjUid !== uid) ...
```

---

### Bug 4 — getOverlayQueue สะสม garbage ใน Firestore

**อาการ:** `tt_action_queue` มี document เป็นพัน ไม่เคยถูกลบ

**สาเหตุ:** เดิม mark `played: true` แล้วไม่ลบ → document สะสมตลอด

**แก้:** ลบ document ทันทีเมื่อ widget poll ดึงไป:
```js
// ✅ ถูก — ใน myactions.js หรือ getOverlayQueue
await db.collection('tt_action_queue').doc(docId).delete();

// ❌ ผิด — mark แล้วไม่ลบ → สะสม
await db.collection('tt_action_queue').doc(docId).update({ played: true });
```

---

### Bug 5 — fillTemplate coins=0 แสดงว่าง

**อาการ:** ข้อความ `{coins} diamonds` แสดงเป็น " diamonds" เมื่อ coins=0

**สาเหตุ:** `|| ''` ถือว่า 0 เป็น falsy

**แก้:** ใช้ `?? ''` (nullish coalescing):
```js
// ✅ ถูก
.replace(/\{coins\}/gi, String(ctx.coins ?? ''))

// ❌ ผิด — 0 ถูกแทนด้วยช่องว่าง
.replace(/\{coins\}/gi, ctx.coins || '')
```

---

### Bug 6 — cooldown Map memory leak

**อาการ:** Server RAM โตเรื่อยๆ เมื่อ VJ stream นานหลายชั่วโมง

**สาเหตุ:** `globalCooldowns`/`userCooldowns` Map ไม่เคยถูกล้าง

**แก้ 2 จุด:**

1. `clearVjCooldowns(vjUid)` — เรียกเมื่อ VJ หยุด stream (tiktok.js disconnect):
```js
function clearVjCooldowns(vjUid) {
  const prefix = `${vjUid}_`;
  for (const k of globalCooldowns.keys()) {
    if (k.startsWith(prefix)) globalCooldowns.delete(k);
  }
  for (const k of userCooldowns.keys()) {
    if (k.startsWith(prefix)) userCooldowns.delete(k);
  }
}
```

2. `setInterval` cleanup ทุก 5 นาที สำหรับ entries หมดอายุแน่ๆ:
```js
setInterval(() => {
  const cutoff = Date.now() - MAX_COOLDOWN_SEC * 1000;
  for (const [k, v] of globalCooldowns.entries()) {
    if (v < cutoff) globalCooldowns.delete(k);
  }
}, 5 * 60 * 1000);
```

---

## Patterns ที่ถูกต้อง

### Priority Logic: specific_gift vs gift_min_coins

ต้องระวังเมื่อ gift event เข้ามา — อาจ match ทั้ง `specific_gift` และ `gift_min_coins` พร้อมกัน:

```
ถ้า specific_gift match → ยิงเฉพาะ specific_gift, ข้าม gift_min_coins ทั้งหมด
ถ้าไม่มี specific_gift → ยิงเฉพาะ gift_min_coins threshold สูงสุดอันเดียว
  เช่น threshold ≥1, ≥10, ≥100 และ gift=150 → ยิงแค่ ≥100
```

```js
const specificGiftHit = otherEvents.some(ev => ev.trigger === 'specific_gift');
const prioritized = [
  ...otherEvents,
  ...(!specificGiftHit && giftCoinEvents.length > 0
    ? [giftCoinEvents.reduce((best, ev) =>
        (ev.minCoins || 0) > (best.minCoins || 0) ? ev : best
      )]
    : []),
];
```

### firedActionIds — dedup ข้าม events

action เดียวกันอาจอยู่ใน 2 events พร้อมกัน → ต้อง dedup ด้วย Set:

```js
const firedActionIds = new Set();
for (const ev of prioritized) {
  for (const actionId of [...new Set(ev.actionIds || [])]) {
    if (firedActionIds.has(actionId)) continue; // ข้ามถ้ายิงแล้ว
    ...
    firedActionIds.add(actionId);
  }
}
```

### Cache invalidation — เรียกทุกครั้งที่แก้ actions/events

```js
// หลัง create/update/delete action หรือ event:
invalidateCache(vjUid);

// Cache TTL = 60 วินาที per vjUid
// ถ้าไม่ invalidate → VJ จะยังเห็น config เก่านานถึง 60 วินาที
```

### Simulate — อย่า call coinjar simulate ซ้อน

`/api/coinjar/simulate` เรียก `processEvent` เองแล้ว → ถ้า frontend เรียก coinjar simulate **พร้อมกับ** `/api/actions/simulate-event` จะยิง OBS 2 ครั้ง

ใน actions.js simulate → ไม่ต้องเรียก coinjar simulate เป็น side effect

---

## เพิ่ม Event Trigger ใหม่

ถ้าต้องการเพิ่ม trigger type ใหม่ (เช่น `vip_enter`):

**1. eventProcessor.js** — เพิ่มใน switch case ของ `matching` filter:
```js
case 'vip_enter':
  return eventType === 'vip_enter';
```

**2. tiktok.js** — เพิ่ม handler ที่เรียก processEvent:
```js
connection.on('vipEnter', data => {
  processEvent(vjUid, 'vip_enter', {
    uniqueId: data.uniqueId,
    nickname: data.nickname,
    ...
  });
});
```

**3. Frontend actions.js** — เพิ่ม option ใน EVENT_TRIGGERS array และ UI form

---

## Debug Checklist

**OBS ยิงซ้ำ:**
1. เช็ค `obsHandledBySocket` flag ใน Firestore doc — ถ้า true แล้ว overlay ยังยิง → bug ใน myactions.js
2. เช็คว่า `processEvent` ถูกเรียกกี่ครั้งต่อ TikTok event — เพิ่ม log ใน queueAction
3. เช็ค coinjar simulate double-fire (ดู Simulate section ด้านบน)

**Action ไม่ยิง:**
1. เช็ค `actionsEnabled` ใน user_settings (master switch)
2. เช็ค cache — อาจต้อง wait 60s หรือเรียก `invalidateCache(vjUid)`
3. เช็ค cooldown — `globalCooldowns.get('vjUid_actionId')`
4. เช็ค `whoCanTrigger` ของ event — อาจ block ผู้ส่ง

**OBS ไม่สลับกลับ:**
→ Bug 1 (obsSceneReturn field ผิด) — ตรวจสอบ field name ใน queueAction และ emitToUser

**Actions save แล้วค่าไม่เปลี่ยน:**
→ Bug 2 (allowlist ใน actionsHandler) — เช็คว่า field อยู่ใน allowed set
