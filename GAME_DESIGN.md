# Ashenveil: The Shattered Age — Game Design Document
> Text-based MMO ระดับตำนาน / ฝังในเว็บ TTplus ใต้แถบ FAQ
> ไม่มีคู่มือ — เรียนรู้จากการเล่น (สไตล์เกมเก่า)
> เป้าหมาย: Stardew Valley depth × Path of Exile systems × Ragnarok community × MUD storytelling

---

## 0. World Lore — Ashenveil: The Shattered Age

### โลกและยุคสมัย

**ก่อนสงคราม — ยุค The Whole**
โลกเคยเป็นหนึ่งเดียวชื่อ **Aethermoor** อารยธรรมรุ่งเรืองใต้การดูแลของ 7 เทพ แต่ละองค์ถือครองธาตุหนึ่ง เทพสร้าง Ancient Gate เชื่อมทุกเมืองในโลก ยุคนั้นเรียกว่า "ยุคทอง" — ไม่มีสงคราม ไม่มีความหิวโหย

**สงครามเทพเจ้า — The Sundering**
เทพ 3 องค์ต้องการครองโลกทั้งหมด ทำสงครามกับอีก 4 องค์ พลังที่ปะทะกันมากเกินไป โลก Aethermoor **แตกสลาย** กลายเป็น Shard หลายร้อยชิ้นลอยอยู่ใน The Void เทพทุกองค์หมดพลัง — จมอยู่ในความหลับลึกหรือตายไปแล้ว ไม่มีใครรู้แน่

**ปัจจุบัน — 500 ปีหลัง The Sundering**
ผู้คนที่รอดสร้างอารยธรรมขึ้นใหม่บน Shard ของตัวเอง Ancient Gate ส่วนมากพัง ส่วนน้อยยังใช้งานได้ ไม่มีใครรู้ว่า Shard ทั้งหมดมีกี่ชิ้น และลึกใน The Void... มีบางอย่างตื่นขึ้น

---

### Shard System — ผูกกับ VJ

```
แต่ละ VJ ที่ connect TikTok = Shard Lord แห่ง Shard หนึ่ง
```

**Shard มีของตัวเอง:**

| สิ่ง | รายละเอียด |
|---|---|
| ชื่อ Shard | VJ ตั้งเอง |
| Landscape | VJ เลือก: Forest / Desert / Ice / Volcanic / Ancient Ruins / Ocean |
| NPC ประจำ | ชุดตาม Landscape |
| Resources | เฉพาะของ Landscape นั้น |
| Dungeon tier | ขึ้นกับ VJ active time สะสม |
| Shard Level | ขึ้นตาม total diamond ที่ viewer ส่งในไลฟ์ |

**Viewer = Citizen**
- ได้ bonus เล็กน้อยเมื่อเล่นใน Shard บ้านเกิด
- ไม่ถูกบังคับ — gate ไป Shard อื่นได้เสมอ
- ถ้า VJ ไม่ไลฟ์ = Shard หลับ Gate ปิด → สร้าง FOMO ให้ดูไลฟ์สม่ำเสมอ

---

### Ancient Gate & The Void

**Ancient Gate:**
- ทุก Shard มี Gate 1 จุด (บางอันพัง — ต้องซ่อม เป็น quest)
- เดินทางข้าม Shard ใช้ **Void Crystal** (หายากพอสมควร)
- Gate เปิดได้เฉพาะตอน VJ กำลังไลฟ์
- สร้าง social mechanic: อยาก explore Shard อื่น → ต้องรอ VJ นั้นออนไลน์

**The Void:**
- พื้นที่ระหว่าง Shard — ไม่มีอากาศ มีแต่ความมืดและ Void Creature
- Void Storm = cross-server event ทุก Shard โดนพร้อมกัน
- ยิ่งลึกใน Void ยิ่งอันตราย ยิ่ง reward ดี
- ลึกที่สุด: **The Core** — ที่เทพนอนหลับ (endgame content ไม่มี patch วันนี้)

---

### Shard Atmosphere ตัวอย่าง (text บรรยายตาม Landscape)

```
Forest Shard:
"Shard นี้ปกคลุมด้วยป่าเก่าแก่ ต้นไม้สูงจนมองไม่เห็นขอบฟ้า
 ชาวบ้านเล่าว่าในคืนพระจันทร์เต็มดวง ต้นไม้จะกระซิบชื่อคน
 ที่กำลังจะตาย..."

Desert Shard:
"ทรายที่นี่สีแดงเข้ม — ไม่ใช่ดิน แต่เป็นเลือดของเทพที่ตกลงมา
 เมื่อ 500 ปีก่อน ลมทรายพัดพาเสียงกรีดร้องที่ไม่มีวันหายไป"

Ice Shard:
"อุณหภูมิต่ำกว่าจุดเยือกแข็งตลอด 24 ชั่วโมง แต่ผู้คนที่นี่
 ไม่รู้สึกหนาว พวกเขาลืมไปนานแล้วว่าความอบอุ่นเป็นอย่างไร"

Volcanic Shard:
"ลาวาไม่เคยเย็นลง ชาวเมืองสร้างบ้านบนสะพานเหล็กเหนือแม่น้ำไฟ
 เด็กที่เกิดที่นี่ไม่มีใครกลัวความร้อน — กลัวแต่ความเย็น"

Ancient Ruins Shard:
"ซากปรักหักพังปกคลุมทุกตารางนิ้ว ไม่มีใครรู้ว่าคนกลุ่มไหน
 สร้างสิ่งเหล่านี้ขึ้นมา และทำไมพวกเขาถึงหายไปชั่วคืนเดียว"

Ocean Shard:
"Shard นี้มีพื้นดินน้อยมาก ผู้คนอาศัยอยู่บนเรือและแพลอยน้ำ
 ข้างใต้นั้น... ลึกแค่ไหนก็ยังมองไม่เห็นก้น"
```

---

### Mystery ที่ยังไม่มีคำตอบ (ค้นพบเอง)

```
1. เทพทั้ง 7 ตายจริงหรือแค่หลับ?
2. ใครสร้าง Ancient Gate — เทพ หรืออารยธรรมที่เก่ากว่าเทพ?
3. The Sundering ตั้งใจหรือไม่ตั้งใจ?
4. Shard ที่ไม่มี VJ เป็นเจ้าของ — มีคนอยู่ไหม? มันลอยไปไหน?
5. ที่ The Core มีอะไร — เทพ? หรือสิ่งที่ฆ่าเทพ?
6. ก่อน Aethermoor มีโลกอีกใบไหม?
```

ทุกข้อเป็น endgame quest ที่ไขได้จากการ explore เท่านั้น ไม่มีคำตอบใน NPC ธรรมดา

---

## 1. ภาพรวม

| หัวข้อ | รายละเอียด |
|---|---|
| Platform | Web (Next.js page `/game`) |
| ตำแหน่ง | ใต้แถบ FAQ ในเมนูหลัก |
| UI Style | Text-based, dark theme, mono font, ไม่มีกราฟิก 3D |
| Auth | Google Login (Firebase) + TikTok username verify |
| Currency | Gold (จาก TikTok gift: 1 diamond = 1 gold) |
| Real-time | Socket.io (ต่อจาก infra เดิม) |
| DB | Firestore (ต่อจาก infra เดิม) |

---

## 2. Tech Stack (ใช้ของเดิมทั้งหมด)

```
Frontend : Next.js  → pages/game/*.js
Backend  : Express + Socket.io  → handlers/game/*.js
Auth     : Firebase Auth + Google Provider (เพิ่ม)
DB       : Firestore (collections ใหม่ prefix "game_")
Deploy   : Vercel (frontend) + Railway (backend) — ไม่เพิ่ม infra
```

---

## 3. File Structure (ใหม่ที่ต้องสร้าง)

```
frontend/
  pages/
    game/
      index.js          ← landing / login / character select
      world.js          ← main game UI (town hub)
      dungeon.js        ← combat screen
      inventory.js      ← bag + equipment slots
      npc/[id].js       ← NPC interaction screen
      guild.js          ← guild management
      market.js         ← NPC shop
      profile.js        ← character sheet + stats
  lib/
    gameApi.js          ← axios wrappers สำหรับ game endpoints
    gameSocket.js       ← socket events ของเกม

backend/
  handlers/
    game/
      account.js        ← Google login sync, TikTok verify
      character.js      ← create, load, save character
      combat.js         ← battle logic
      inventory.js      ← item operations
      npc.js            ← affection, dialog, gift
      market.js         ← buy/sell NPC shop
      guild.js          ← guild CRUD
      currency.js       ← gold operations + anti-cheat
      tiktokCurrency.js ← gift → gold pipeline
  routes/
    game.js             ← Express router รวม game endpoints
  data/
    items.js            ← item definitions (static)
    npcs.js             ← NPC definitions (static)
    monsters.js         ← monster definitions (static)
    skills.js           ← skill definitions (static)
    maps.js             ← area/zone definitions (static)
```

---

## 4. Firestore Collections

```
game_accounts/{uid}
  uid, email, displayName, photoURL
  tiktokUniqueId, tiktokVerified, tiktokLinkedAt
  characterId, gold, realmPoints
  dailyStreak, lastLoginAt, createdAt

game_characters/{charId}
  uid (owner), name, race, class, level, xp
  hp, hpMax, mp, mpMax, atk, def, spd, mag
  statPoints (unspent), skillPoints (unspent)
  location (area, zone), questLog[], completedQuests[]
  createdAt, lastActiveAt

game_inventory/{uid}/items/{itemId}
  itemId (def ref), instanceId (unique per item)
  grade, enhancement (+0-20), durability
  rolls {}, sockets [], equipped (slot | null)
  obtainedAt

game_characters/{charId}/equipment (subcollection หรือ embedded)
  HEAD, FACE, CHEST, GLOVES, LEGS, FEET, CAPE
  MAIN_HAND, OFF_HAND
  RING_L, RING_R, AMULET, BELT, RELIC

game_npc_affection/{uid}/npcs/{npcId}
  affection (0-100), giftCount, lastGiftAt
  unlockedDialogs [], companionBond (item | null)

game_transactions/{txId}
  uid, vjId, tiktokUniqueId
  giftName, diamondCount, goldEarned, repeatCount
  serverTime, ipHash, processed

game_guilds/{guildId}
  name, tag, leaderId, members []
  level, treasury, description
  createdAt

game_world/global (single doc)
  seasonName, seasonEndAt
  worldEvents [], activeWorldBoss (null | {})
  totalPlayers, totalGoldCirculating

game_enhance_log/{uid}
  itemInstanceId, fromLevel, toLevel, success, failstackUsed, timestamp
```

---

## 5. Game Systems

### 5.1 Google Login + TikTok Verify

```
Flow:
1. /game → "เข้าสู่ระบบด้วย Google"
2. Firebase signInWithPopup(GoogleAuthProvider)
3. Backend sync → สร้าง game_accounts doc ถ้ายังไม่มี
4. ถ้า tiktokVerified = false → แสดงหน้า link TikTok
5. Verify: พิมพ์ username → ได้ code 6 หลัก (หมดอายุ 10 นาที)
6. พิมพ์ code ใน TikTok Live comment ใดก็ได้
7. Backend จับ chat event → ตรวจ uniqueId + code match
8. tiktokVerified = true → เข้าเกมได้
```

### 5.2 Character Creation

```
ขั้นตอน (ไม่มีคำอธิบาย stat — ให้เดาเอง):

Step 1 — เลือก Race (4 race):
  Human   "คนธรรมดาจากดินแดนกลาง"
  Elven   "เผ่าพันธุ์โบราณ อายุยืน ปัญญาสูง"
  Dwarf   "แห่งขุนเขา ร่างกายแกร่ง มือทอง"
  Shade   "ลูกหลานเงา ปริศนา ไม่มีใครรู้ต้นกำเนิด"

Step 2 — เลือก Class (3 class ต่อ race = 12 class รวม):
  Human   → Warrior / Rogue / Cleric
  Elven   → Ranger / Mage / Bard
  Dwarf   → Berserker / Engineer / Runesmith
  Shade   → Assassin / Hexblade / Phantom

Step 3 — ตั้งชื่อ (กรอง slur + unique check)

Step 4 — เริ่มที่ "Tavern of Beginnings"
  ไม่มี tutorial — มีแค่ข้อความ:
  "คุณตื่นขึ้นมาในโรงเตี๊ยมเก่า กลิ่นเบียร์ฟุ้ง..."
```

### 5.3 Main Hub — Town

```
UI: text menu พร้อม ASCII border

┌─────────────────────────────────┐
│  ⚔ REALM ONLINE                │
│  [Sam / Warrior Lv.7]  Gold: 240│
├─────────────────────────────────┤
│  📍 Town of Asmere              │
│  "ตลาดคึกคัก เสียงดาบเหล็กดัง" │
├─────────────────────────────────┤
│  [1] Explore       [2] Dungeon  │
│  [3] Talk to NPC   [4] Market   │
│  [5] Inventory     [6] Guild    │
│  [7] Character     [8] Rest     │
└─────────────────────────────────┘

แต่ละ zone มีข้อความบรรยายต่างกัน — reward การสำรวจ
```

### 5.4 Exploration

```
Zone types: Town / Forest / Cave / Ruins / Mountain / Sea

แต่ละ zone มี:
- Random events (25 outcomes per zone)
- Hidden item spots (respawn 1 ชั่วโมง)
- Rare events (trigger ด้วย item ที่มีใน inventory)
- Secret areas (unlock ด้วย quest / affection / level)

Discovery feel:
- ไม่บอกว่า drop อะไร — สุ่มแล้วบอก "คุณพบ..."
- บางครั้ง event "พบรอยเท้าแปลก..." ที่นำไปสู่ quest
- "มีบางอย่างซ่อนอยู่ที่นี่" — ต้องกลับมาตอนมี item ถูก
- Stamina 100/100 ลดทีละ 10 ต่อ action, regen 10/นาที
```

### 5.5 Combat (Turn-based Text)

```
┌─────────────────────────────────┐
│ ⚔ BATTLE                       │
│ Goblin Scout          HP 45/45  │
│ "ส่งเสียงหัวเราะอย่างชั่วร้าย"  │
├─────────────────────────────────┤
│ Sam (Warrior)         HP 88/120 │
│ MP 30/50   ⚔ATK 34  🛡DEF 18  │
├─────────────────────────────────┤
│ [1] โจมตี  [2] สกิล  [3] ไอเทม │
│ [4] หนี                        │
└─────────────────────────────────┘

เลือก 1:
"คุณฟาด Iron Sword... โกบลินสะดุ้ง! 23 damage!"
"โกบลินตะปบ! คุณเบี่ยงได้บางส่วน... 8 damage."

Combat mechanics:
- ATK สุ่ม ±15%
- Crit = x2 damage (แสดง "CRITICAL!" ใหญ่)
- Speed สูงกว่า → attack ก่อน
- Status effects: poison, burn, stun, bleed
- Flee: 60% success + lose small gold
- Death: drop XP 10%, ไม่ drop item, respawn town
```

### 5.6 NPC Affection System

```
NPC ในเกม: 8 ตัว (Phase 1) → เพิ่มตาม season

ตัวอย่าง NPC:

MIRA (พ่อค้าสาว)
  บุคลิก: ยิ้มเก่ง ชอบดอกไม้ ไม่ชอบของสกปรก
  ชอบ:    Wild Flower, Honey Jar, Blue Gem Fragment
  กลาง:   Iron Ore, Bread
  เกลียด: Monster Fang, Rotten Wood
  Bond item: Mira's Ribbon → +5% shop discount ตลอดไป
  
ERIK (ยามประตูเมือง)
  บุคลิก: เข้มงวด ซื่อตรง ชอบของทหาร
  ชอบ:    Steel Ingot, Military Ration, Old War Medal
  กลาง:   Ale, Common Stone
  เกลียด: Stolen Goods tag, Rotten Meat
  Bond item: Erik's Badge → unlock secret gate → hidden dungeon
  
YENA (นักวิชาการ)
  บุคลิก: ขี้อาย รักหนังสือ ชอบความลึกลับ
  ชอบ:    Ancient Scroll, Crystal Shard, Star Map Fragment
  กลาง:   Empty Bottle, Candle
  เกลียด: Loud items (Firecracker), Blood-stained items
  Bond item: Yena's Lens → +15% Skill XP ตลอดไป

Dialog hint system:
  Affection 0-20:   "สวัสดี... ต้องการอะไรหรือเปล่า?"
  Affection 21-40:  "โอ้ [ชื่อ] มาอีกแล้ว ดีใจที่เห็น"
  Affection 41-60:  ให้ hint เรื่องของที่ชอบใน dialog
  Affection 61-80:  dialog พิเศษ + ให้ของกลับเล็กน้อย
  Affection 81-100: Companion unlock + bond item

Gift rules:
  - วันละ 3 ครั้งต่อ NPC
  - Affection -1 ต่อวันที่ไม่ได้คุย (ไม่ drop ต่ำกว่า 20)
  - ให้ของที่เกลียด: -5 ทันที

Random NPC events (เกิด random ไม่บอกล่วงหน้า):
  "วันนี้ Mira ดูเศร้าผิดปกติ..."
  → ต้องหา Forget-me-not Flower ภายใน 24 ชั่วโมง
  → สำเร็จ: +15 affection + rare reward
  → ล้มเหลว: -10 affection + event หายไป
```

### 5.7 TikTok Gift → Gold Pipeline

```
Flow:
gift event (tiktok.js) → tiktokCurrency.js → anti-cheat → Firestore

Anti-cheat layers:
1. Source trust    — gift ต้องมาจาก backend เท่านั้น ไม่มี API ให้ client call
2. Idempotency     — txId = uid_timestamp_giftName_repeat → reject ซ้ำ
3. Rate limit      — max 500,000 gold/hour per user
4. VJ active check — ต้องมี active TikTok connection
5. Soft cap        — >10M gold: +50% penalty, >50M gold: +90% penalty
6. TikTok verified — ต้อง verify username ก่อนรับ gold ใด ๆ

อัตรา: 1 diamond = 1 gold (fixed, ห้าม VJ ปรับ)
```

### 5.8 Item & Enhancement System

```
Item Grades:   ⚪Common 🟢Uncommon 🔵Rare 🟣Epic 🟠Legendary 🔴Mythic
Equipment Slots: 14 slots (HEAD/FACE/CHEST/GLOVES/LEGS/FEET/CAPE/
                           MAIN_HAND/OFF_HAND/RING×2/AMULET/BELT/RELIC)

Enhancement:
  +0→+7   ล้มเหลว = เสีย material เท่านั้น
  +8→+12  ล้มเหลว = -1 level + -10 durability
  +12→+15 ล้มเหลว = -2 level + -20 durability + 10% break
  +16→+20 ล้มเหลว = -3 level + 30% break (ต้องใช้ Guardian Stone)

Failstack: ล้มเหลว → +1 failstack → โอกาสสำเร็จครั้งต่อไปสูงขึ้น

Gem Sockets (0-4 slots per item):
  🔴Ruby / 🔵Sapphire / 🟢Emerald / 🟡Topaz / ⚪Diamond (universal)
  Tier 1-5 (fusion 3x same tier → tier+1, 50% success)

Skill System:
  Active skill slots: 2 (lv1) → 6 (lv80)
  Ancient Rune: modifier ติดกับ skill (max 2 rune/skill)
  Set Bonus: ใส่ครบชุด → unlock passive/active พิเศษ
```

### 5.9 Pet System (Mendelian Genetics)

```
Pet มี Gene slots 6 ตัว (A/B คู่ × 3 traits):
  [Str_A][Str_B] [Agi_A][Agi_B] [Int_A][Int_B]

Dominant (uppercase) > Recessive (lowercase)
  SS = Strong (high bonus)
  Ss = Strong (medium bonus)
  ss = Weak (minimal bonus)

Breeding: เลือก 2 ตัว → offspring ได้ gene สุ่มจาก Punnett Square
ไม่บอก gene ตรงๆ — ต้อง breed แล้วสังเกตเอง (discovery!)

Pet abilities:
  Combat pet: ช่วยโจมตีใน battle
  Gather pet: เก็บ item ใน explore อัตโนมัติ
  Luck pet: เพิ่ม drop rate
  Bond pet: เพิ่ม NPC affection speed

Feed: ต้องให้อาหารทุก 24 ชั่วโมง (ไม่ให้ → -stats ชั่วคราว)
```

### 5.10 Economy & Money Sinks

```
Gold Income:
  TikTok gift     — หลัก (1 diamond = 1 gold)
  Realm Points    — ดูสตรีม 5 นาที = 1 RP → แลก gold ได้ (อัตราต่ำมาก)
  Quest reward    — จำกัด
  Mob drop        — น้อยมาก
  Dungeon loot    — moderate

Gold Sinks (BDO-style):
  Enhancement materials (Black Stone, Guardian Stone, Memory Fragment)
  Gem Fusion Catalyst
  Skill reroll / rune slot
  House / Guild building
  NPC shop repair durability
  Pet food
  Fast travel
  Inventory expansion
  Seasonal event entry
  Name change (one-time)

ห้าม player trade กันโดยตรง → ทุกอย่างผ่าน NPC Market เท่านั้น
NPC Market ซื้อของกลับ 40% ราคา (money sink)
```

### 5.11 Guild System

```
สร้าง Guild: เสีย 500 gold + ตั้งชื่อ + tag 3 ตัวอักษร
Max members: 20 (ขยายได้ด้วย Guild Building)

Guild Activities:
  Guild Quest     — ทำร่วมกัน ได้ Guild Token
  Guild Dungeon   — เฉพาะสมาชิก, ยากกว่าปกติ, reward ดีกว่า
  Guild War       — challenge guild อื่น (ยังไม่ทำ Phase 1)
  Guild Building  — ใช้ Treasury สร้าง bonuses (max 5 buildings)

Guild Rank: Iron → Bronze → Silver → Gold → Diamond → Realm Master
```

### 5.12 Progression Systems

```
Daily Loop:
  เช้า  → Login (daily reward + streak bonus)
  กลาง  → ให้ของ NPC (3 slot/วัน) + Farm material
  บ่าย  → Dungeon + Enhancement (failstack management)
  เย็น  → ดูไลฟ์ VJ → ส่ง gift → Gold → ซื้อ material

Anti-bore mechanics:
  Daily Quest (3 แบบสุ่มใหม่ทุกวัน)
  Weekly Challenge
  Random NPC event (ไม่รู้ล่วงหน้า)
  Seasonal World Event (เปลี่ยนทุก 3 เดือน)
  Hidden Achievement (ไม่บอก condition — ค้นพบเอง)
  Legacy System (ตายถาวร → legacy bonus ให้ character ใหม่)
  Nemesis System (monster ที่ kill เราบ่อย → ชื่อเฉพาะ + stat ขึ้น)
```

---

## 6. UI/UX Design Principles

```
1. NO TUTORIAL — ปล่อยให้ explore เอง เหมือนเกมเก่า
2. Text descriptions เท่านั้น — ไม่มีรูป sprite
3. Dark background (#0d0d0d) + accent สีทอง (#d4af37)
4. Font: monospace (Courier New หรือ Fira Code)
5. Menu เป็นตัวเลขกด — ใช้ keyboard ได้
6. Animation: typing effect สำหรับข้อความสำคัญ
7. Sound: optional ambient sound (ไม่บังคับ)
8. Mobile: ปุ่มตัวเลขเรียงตาราง แทน keyboard
```

---

## 7. Implementation Roadmap

### Phase 0 — Foundation (ทำก่อน)
- [ ] Google Login integration (Firebase Auth)
- [ ] TikTok Username Verify flow
- [ ] Firestore game collections setup
- [ ] game.js Express router skeleton
- [ ] /game/index.js page (login screen)

### Phase 1 — MVP Playable
- [ ] Character creation (race + class + name)
- [ ] Town hub UI + navigation
- [ ] Exploration (2 zones: Town + Forest)
- [ ] Basic combat (no skills, no items)
- [ ] Basic inventory (คลิกดูของ)
- [ ] NPC shop (ซื้อ/ขาย basic items)
- [ ] TikTok gift → Gold pipeline (full anti-cheat)

### Phase 2 — Core Systems
- [ ] Equipment slots + equip/unequip
- [ ] Enhancement +0 → +12 (safe + risky zone)
- [ ] Gem system (basic socket)
- [ ] NPC Affection system (3 NPC)
- [ ] Quest system (daily + story)
- [ ] Pet system (basic, no breeding yet)
- [ ] 4 dungeon zones
- [ ] Skill system (class skills only)

### Phase 3 — Depth
- [ ] Enhancement +13 → +20 (Guardian Stone)
- [ ] Pet breeding (genetics)
- [ ] Guild system
- [ ] Ancient Rune (skill modifier)
- [ ] All 8 NPC + bond items
- [ ] Set bonus system
- [ ] NPC Market (player list items via NPC)
- [ ] World Boss (shared event)

### Phase 4 — Endgame
- [ ] Seasonal World events
- [ ] Legacy system
- [ ] Nemesis system
- [ ] Mythic items (seasonal only)
- [ ] Guild War
- [ ] Realm Master Rank (server-wide leaderboard)

---

## 8. Discovery Hints (ซ่อนไว้ในเกม ไม่บอกตรงๆ)

```
"ดูเหมือนจะต้องการบางอย่างที่อ่อนโยน..."
  → hint ว่า NPC ชอบ flower

"ดาบมีรอยหยัก เหมือนถูกเสริมพลังไม่สมบูรณ์"
  → hint ว่า enhancement ล้มเหลวอยู่

"หินก้อนนี้มีประกายแปลก ๆ เมื่อสัมผัสกับหินอื่น"
  → hint ว่าต้อง combine gem

"โกบลินตัวนี้จำคุณได้ ตาเป็นประกายอันตราย"
  → Nemesis system ทำงาน

"มีเสียงพึมพำในโบสถ์ร้าง... เฉพาะตอนเที่ยงคืน"
  → timed secret content (00:00-00:30)
```

---

## 9. Anti-Cheat Summary

```
Layer 1: Source trust — ไม่มี API ให้ client เพิ่ม gold ตรง
Layer 2: Idempotency key — ป้องกัน duplicate gift
Layer 3: Rate limit — 500,000 gold/hour max
Layer 4: VJ active check — ต้องมี live connection จริง
Layer 5: TikTok verified — ต้อง verify ก่อน
Layer 6: Soft cap — >10M penalty 50%, >50M penalty 90%
Layer 7: IP hash monitoring — alert ถ้า IP ซ้ำ VJ
Layer 8: Failstack server-side only — ไม่ trust client failstack
Layer 9: All combat/drop calc server-side — client แค่ display
```

---

*Document version 1.0 — April 2026*
*อัปเดตทุกครั้งที่มี system เพิ่ม*
