// handlers/game/account.js — Game account management + TikTok verify
const admin = require('firebase-admin');

// ─────────────────────────────────────────────
//  Verify constants
// ─────────────────────────────────────────────
const VERIFY_TTL_MS         = 10 * 60 * 1000;   // 10 นาที
const VJ_CHANGE_COOLDOWN_MS = 7 * 24 * 3600_000; // 7 วัน cooldown เปลี่ยน VJ
const RATE_WINDOW_MS        = 60 * 60 * 1000;    // หน้าต่าง rate limit = 1 ชั่วโมง
const RATE_MAX_REQ          = 3;                  // สูงสุด 3 ครั้ง/ชั่วโมง

// คำสุ่ม 4 คำ + ตัวเลข 2 หลัก → ~2.8M combos (ปลอดภัยกว่า 3 คำ 36k)
const WORD_POOL = [
  'ดาบ','โล่','หอก','ธนู','ไฟ','น้ำ','ดิน','ลม','แสง','เงา',
  'เสือ','มังกร','หมาป่า','อินทรี','งู','สิงห์','หมี','กา',
  'ทอง','เงิน','เหล็ก','คริสตัล','น้ำแข็ง','ฟ้า','พายุ','เปลวไฟ',
  'ป่า','ถ้ำ','ภูเขา','ทะเล','ทะเลทราย','หิมะ','หมอก','พระจันทร์',
  'พิษ','เลือด','วิญญาณ','เวทย์','เงาดำ','แสงทอง','ฟ้าแลบ','พลังงาน',
];
const RACES = ['HUMAN', 'ELVEN', 'DWARF', 'SHADE', 'REVENANT', 'VOIDBORN', 'BEASTKIN'];
const LOCKED_RACES = new Set(['REVENANT', 'VOIDBORN', 'BEASTKIN']);

// เงื่อนไข unlock ของแต่ละเผ่า
const RACE_UNLOCK = {
  REVENANT: { stat: 'deathCount',       required: 50,  label: 'ตาย 50 ครั้ง' },
  VOIDBORN: { stat: 'explorationCount', required: 100, label: 'สำรวจ 100 ครั้ง' },
  BEASTKIN: { stat: 'monstersKilled',   required: 200, label: 'สังหาร 200 มอนสเตอร์' },
};

const CLASSES_BY_RACE = {
  HUMAN:    ['WARRIOR', 'ROGUE', 'CLERIC'],
  ELVEN:    ['RANGER', 'MAGE', 'BARD'],
  DWARF:    ['BERSERKER', 'ENGINEER', 'RUNESMITH'],
  SHADE:    ['ASSASSIN', 'HEXBLADE', 'PHANTOM'],
  REVENANT: ['DEATHKNIGHT', 'NECROMANCER', 'GRAVECALLER'],
  VOIDBORN: ['VOIDWALKER', 'RIFTER', 'SOULSEER'],
  BEASTKIN: ['WILDGUARD', 'TRACKER', 'SHAMAN'],
};

// Class base stats
const CLASS_BASE_STATS = {
  WARRIOR:    { hp: 150, mp: 40,  atk: 22, def: 18, spd: 8,  mag: 5  },
  ROGUE:      { hp: 110, mp: 60,  atk: 20, def: 12, spd: 16, mag: 8  },
  CLERIC:     { hp: 120, mp: 100, atk: 14, def: 14, spd: 8,  mag: 20 },
  RANGER:     { hp: 115, mp: 70,  atk: 18, def: 12, spd: 14, mag: 10 },
  MAGE:       { hp: 90,  mp: 130, atk: 10, def: 8,  spd: 10, mag: 30 },
  BARD:       { hp: 110, mp: 90,  atk: 14, def: 12, spd: 12, mag: 22 },
  BERSERKER:  { hp: 170, mp: 30,  atk: 28, def: 14, spd: 6,  mag: 3  },
  ENGINEER:   { hp: 130, mp: 60,  atk: 18, def: 20, spd: 6,  mag: 12 },
  RUNESMITH:  { hp: 120, mp: 80,  atk: 16, def: 18, spd: 7,  mag: 18 },
  ASSASSIN:    { hp: 100, mp: 70,  atk: 25, def: 10, spd: 18, mag: 8  },
  HEXBLADE:    { hp: 105, mp: 100, atk: 18, def: 12, spd: 12, mag: 22 },
  PHANTOM:     { hp: 115, mp: 110, atk: 15, def: 8,  spd: 15, mag: 28 },
  // Locked races
  DEATHKNIGHT: { hp: 140, mp: 60,  atk: 22, def: 16, spd: 8,  mag: 12 },
  NECROMANCER: { hp: 95,  mp: 130, atk: 10, def: 8,  spd: 8,  mag: 32 },
  GRAVECALLER: { hp: 115, mp: 110, atk: 12, def: 10, spd: 9,  mag: 28 },
  VOIDWALKER:  { hp: 100, mp: 100, atk: 18, def: 10, spd: 16, mag: 20 },
  RIFTER:      { hp: 105, mp: 90,  atk: 24, def: 8,  spd: 14, mag: 15 },
  SOULSEER:    { hp: 90,  mp: 120, atk: 8,  def: 9,  spd: 12, mag: 30 },
  WILDGUARD:   { hp: 145, mp: 50,  atk: 24, def: 16, spd: 10, mag: 5  },
  TRACKER:     { hp: 115, mp: 65,  atk: 20, def: 12, spd: 16, mag: 8  },
  SHAMAN:      { hp: 110, mp: 100, atk: 14, def: 12, spd: 10, mag: 22 },
};

// Race modifiers
const RACE_MOD = {
  HUMAN:  { hp: 0,   atk: 2,  def: 2,  spd: 2,  mag: 2  }, // balanced
  ELVEN:  { hp: -10, atk: 0,  def: -2, spd: 5,  mag: 5  }, // fast + magic
  DWARF:  { hp: 20,  atk: 3,  def: 5,  spd: -3, mag: -2 }, // tank
  SHADE:    { hp: -15, atk: 3,  def: -3, spd: 6,  mag: 3  }, // agile + sneaky
  REVENANT: { hp: 10,  atk: 2,  def: 0,  spd: -2, mag: 5  }, // undead durability
  VOIDBORN: { hp: -20, atk: 0,  def: -4, spd: 8,  mag: 8  }, // glass cannon void
  BEASTKIN: { hp: 20,  atk: 4,  def: 2,  spd: 4,  mag: -3 }, // physical powerhouse
};

// ─────────────────────────────────────────────
//  Code generator: 4 คำไทย + ตัวเลข 2 หลัก
//  ตัวอย่าง: "ดาบไฟมังกรเงา42"  (~2.8M combos)
// ─────────────────────────────────────────────
function generateVerifyCode() {
  const pool  = [...WORD_POOL];
  const words = [];
  while (words.length < 4) {
    const idx = Math.floor(Math.random() * pool.length);
    words.push(pool.splice(idx, 1)[0]);
  }
  const digits = String(Math.floor(Math.random() * 90) + 10); // 10-99
  return words.join('') + digits;
}

// ─────────────────────────────────────────────
//  Audit log helper
// ─────────────────────────────────────────────
async function writeVerifyLog(db, { uid, tiktokUniqueId, action, note = '' }) {
  try {
    await db.collection('game_verify_log').add({
      uid,
      tiktokUniqueId,
      action,   // 'request' | 'verify_success' | 'verify_fail' | 'expired' | 'rate_limited'
      note,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch { /* log ไม่ควรทำให้ main flow พัง */ }
}

// ===== Sync account after Google login =====
async function syncAccount(req, res) {
  const { uid, email, name } = req.user;
  const db = admin.firestore();

  try {
    const ref = db.collection('game_accounts').doc(uid);
    const doc = await ref.get();

    if (!doc.exists) {
      // สร้าง account ใหม่
      await ref.set({
        uid,
        email:           email || '',
        displayName:     name || 'Adventurer',
        photoURL:        '',
        tiktokUniqueId:  null,
        tiktokVerified:  false,
        tiktokLinkedAt:  null,
        characterId:     null,
        gold:            0,
        realmPoints:     0,
        dailyStreak:     0,
        lastLoginAt:     admin.firestore.FieldValue.serverTimestamp(),
        createdAt:       admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ account: { uid, email, displayName: name, tiktokVerified: false, characterId: null, gold: 0 }, isNew: true });
    }

    // อัปเดต lastLoginAt + streak
    const data          = doc.data();
    const lastLogin     = data.lastLoginAt?.toMillis?.() || 0;
    const now           = Date.now();
    const daysSinceLast = Math.floor((now - lastLogin) / 86400000);
    const newStreak     = daysSinceLast === 1 ? (data.dailyStreak || 0) + 1 : daysSinceLast > 1 ? 0 : data.dailyStreak || 0;

    await ref.update({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), dailyStreak: newStreak });

    // ── Fetch character preview (name, race, class, level) for Lobby screen ──
    let charPreview = {};
    let characterId = data.characterId;
    if (characterId) {
      try {
        const charDoc = await db.collection('game_characters').doc(characterId).get();
        if (charDoc.exists) {
          const c = charDoc.data();
          charPreview = {
            charName:  c.name  || 'ตัวละคร',
            charRace:  c.race  || '',
            charClass: c.class || '',
            charLevel: c.level || 1,
          };
        } else {
          // character doc หาย — reset characterId ใน account เพื่อให้สร้างใหม่ได้
          console.warn(`[Account] characterId=${characterId} not found in Firestore, resetting uid=${uid}`);
          await ref.update({ characterId: null });
          characterId = null;
        }
      } catch (e) {
        console.error('[Account] charPreview fetch error:', e.message);
      }
    }

    return res.json({
      account: {
        uid,
        email:          data.email,
        displayName:    data.displayName,
        tiktokUniqueId: data.tiktokUniqueId,
        tiktokVerified: data.tiktokVerified,
        characterId,                   // อาจถูก reset เป็น null ถ้า doc หาย
        gold:           data.gold || 0,
        realmPoints:    data.realmPoints || 0,
        dailyStreak:    newStreak,
        ...charPreview,  // charName, charRace, charClass, charLevel
      },
      isNew: false,
    });
  } catch (err) {
    console.error('[Game/Account] syncAccount:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Step 1: Request TikTok verify code =====
// ─ เก็บ pending ใน Firestore (ทุก instance เห็น)
// ─ Rate limit 3 req/hr ต่อ uid (ป้องกัน spam)
// ─ VJ change cooldown 7 วัน
async function requestVerifyCode(req, res) {
  const { tiktokUniqueId } = req.body;
  if (!tiktokUniqueId || typeof tiktokUniqueId !== 'string') {
    return res.status(400).json({ error: 'กรุณาใส่ TikTok username' });
  }

  const clean = tiktokUniqueId.replace(/[^a-zA-Z0-9._]/g, '').replace(/^@/, '').toLowerCase().slice(0, 50);
  if (!clean) return res.status(400).json({ error: 'Username ไม่ถูกต้อง' });

  const uid = req.user.uid;
  const db  = admin.firestore();
  const now = Date.now();

  try {
    // ── 1. อ่าน account ──
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });
    const acct = accountDoc.data();

    // ── 2. Rate limit: 3 req/hr per uid ──
    const windowStart = acct.verifyWindowStart?.toMillis?.() || 0;
    const withinWindow = (now - windowStart) < RATE_WINDOW_MS;
    const attempts    = withinWindow ? (acct.verifyAttempts || 0) : 0;

    if (withinWindow && attempts >= RATE_MAX_REQ) {
      const resetInMin = Math.ceil((RATE_WINDOW_MS - (now - windowStart)) / 60_000);
      await writeVerifyLog(db, { uid, tiktokUniqueId: clean, action: 'rate_limited' });
      return res.status(429).json({
        error: `ขอ verify code บ่อยเกินไป — รออีก ${resetInMin} นาที`,
        resetInMinutes: resetInMin,
      });
    }

    // ── 3. VJ change cooldown (ถ้ามีการเปลี่ยน VJ) ──
    if (acct.tiktokVerified && acct.tiktokUniqueId && acct.tiktokUniqueId !== clean) {
      const vjChangedAt = acct.vjChangedAt?.toMillis?.() || acct.tiktokLinkedAt?.toMillis?.() || 0;
      const elapsed     = now - vjChangedAt;
      if (elapsed < VJ_CHANGE_COOLDOWN_MS) {
        const daysLeft = Math.ceil((VJ_CHANGE_COOLDOWN_MS - elapsed) / 86400_000);
        return res.status(429).json({
          error: `การเปลี่ยน VJ มี Cooldown 7 วัน — รออีก ${daysLeft} วัน`,
          cooldownDaysLeft: daysLeft,
        });
      }
    }

    // ── 4. ตรวจ username ถูกใช้โดย account อื่นแล้วหรือยัง ──
    // query single field เท่านั้น (ไม่ต้องการ composite index) แล้ว filter in memory
    const existingSnap = await db.collection('game_accounts')
      .where('tiktokUniqueId', '==', clean)
      .limit(5).get();
    const takenByOther = existingSnap.docs.some(d => d.id !== uid && d.data().tiktokVerified === true);
    if (takenByOther) {
      return res.status(400).json({ error: `@${clean} ถูกใช้งานโดย account อื่นแล้ว` });
    }

    // ── 5. สร้าง code + เขียน Firestore (overwrite ทุกครั้ง) ──
    const code      = generateVerifyCode();
    const expiresAt = new Date(now + VERIFY_TTL_MS);

    // doc key = uid → 1 pending per uid, overwrite ถ้าขอซ้ำ
    await db.collection('game_verify_pending').doc(uid).set({
      uid,
      code,
      tiktokUniqueId: clean,
      expiresAt:      admin.firestore.Timestamp.fromDate(expiresAt),
      used:           false,
      createdAt:      admin.firestore.FieldValue.serverTimestamp(),
    });

    // อัปเดต rate limit counter ใน game_accounts
    await db.collection('game_accounts').doc(uid).update({
      verifyAttempts:  withinWindow ? admin.firestore.FieldValue.increment(1) : 1,
      verifyWindowStart: withinWindow
        ? (acct.verifyWindowStart || admin.firestore.FieldValue.serverTimestamp())
        : admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeVerifyLog(db, { uid, tiktokUniqueId: clean, action: 'request', note: `attempt ${attempts + 1}/${RATE_MAX_REQ}` });
    console.log(`[Game/Verify] uid=${uid} tiktok=@${clean} code=${code} attempt=${attempts + 1}`);

    return res.json({ code, tiktokUniqueId: clean, expiresIn: VERIFY_TTL_MS });

  } catch (err) {
    console.error('[Game/Account] requestVerifyCode:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ===== Called from tiktok.js chat handler =====
// ─ Query Firestore แทน Map scan → O(1) per uniqueId
// ─ ใช้ runTransaction → atomic: verify ได้ครั้งเดียวเท่านั้น แม้ chat flood
async function checkChatVerify(uniqueId, comment) {
  if (!uniqueId || !comment) return null;

  const db        = admin.firestore();
  const lowerUId  = uniqueId.toLowerCase();
  const now       = Date.now();

  // ── 1. หา pending doc ของ tiktokUniqueId นี้ ──
  // doc key = uid, query by tiktokUniqueId field
  // query single field เท่านั้น (ไม่ต้องการ composite index) แล้ว filter used in memory
  let pendingSnap;
  try {
    pendingSnap = await db.collection('game_verify_pending')
      .where('tiktokUniqueId', '==', lowerUId)
      .limit(5)
      .get();
  } catch (err) {
    console.error('[Game/Verify] query error:', err.message);
    return null;
  }

  if (pendingSnap.empty) return null;
  // กรอง used ใน memory
  const activeDocs = pendingSnap.docs.filter(d => !d.data().used);
  if (activeDocs.length === 0) return null;
  // inject back ให้ loop ด้านล่างใช้
  pendingSnap = { docs: activeDocs };

  // ── 2. ลอง match code จาก comment ──
  for (const pendingDoc of pendingSnap.docs) {
    const pending = pendingDoc.data();

    // ตรวจ expired (non-transaction check ก่อนเพื่อ skip เร็ว)
    const expiresMs = pending.expiresAt?.toMillis?.() || 0;
    if (now > expiresMs) {
      // ล้าง expired doc
      pendingDoc.ref.delete().catch(() => {});
      await writeVerifyLog(db, { uid: pending.uid, tiktokUniqueId: lowerUId, action: 'expired' });
      continue;
    }

    // ตรวจ code ใน comment
    if (!comment.includes(pending.code)) continue;

    // ── 3. runTransaction: atomic check + mark used + update account ──
    let result = null;
    try {
      await db.runTransaction(async (tx) => {
        // Re-read ใน transaction เพื่อป้องกัน race condition
        const freshPending = await tx.get(pendingDoc.ref);
        if (!freshPending.exists) throw Object.assign(new Error('not_found'), { code: 'not_found' });

        const fp = freshPending.data();
        if (fp.used) throw Object.assign(new Error('already_used'), { code: 'already_used' });
        if ((fp.expiresAt?.toMillis?.() || 0) < Date.now()) throw Object.assign(new Error('expired'), { code: 'expired' });

        // ── อ่าน account ──
        const accountRef = db.collection('game_accounts').doc(fp.uid);
        const accountDoc = await tx.get(accountRef);
        if (!accountDoc.exists) throw Object.assign(new Error('account_not_found'), { code: 'account_not_found' });

        const acct = accountDoc.data();
        const isVJChange = acct.tiktokVerified && acct.tiktokUniqueId && acct.tiktokUniqueId !== fp.tiktokUniqueId;

        // ── Atomic writes ──
        tx.update(pendingDoc.ref, { used: true });

        const accountUpdate = {
          tiktokUniqueId: fp.tiktokUniqueId,
          tiktokVerified: true,
          tiktokLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (isVJChange) {
          accountUpdate.vjChangedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        tx.update(accountRef, accountUpdate);

        result = { uid: fp.uid, tiktokUniqueId: fp.tiktokUniqueId, isVJChange };
      });
    } catch (txErr) {
      const code = txErr.code || '';
      if (code === 'already_used') {
        console.log(`[Game/Verify] dup attempt @${uniqueId} — already verified`);
      } else if (code === 'expired') {
        pendingDoc.ref.delete().catch(() => {});
      } else {
        console.error('[Game/Verify] transaction error:', txErr.message);
      }
      continue;
    }

    if (result) {
      console.log(`[Game/Verify] ✅ uid=${result.uid} @${uniqueId} verified! isVJChange=${result.isVJChange}`);
      await writeVerifyLog(db, {
        uid:             result.uid,
        tiktokUniqueId:  lowerUId,
        action:          'verify_success',
        note:            result.isVJChange ? 'vj_change' : 'first_verify',
      });
      return result;
    }
  }

  return null;
}

// ===== Check verify status (polling) =====
async function getVerifyStatus(req, res) {
  const db  = admin.firestore();
  try {
    const doc = await db.collection('game_accounts').doc(req.user.uid).get();
    if (!doc.exists) return res.json({ verified: false });
    const data = doc.data();
    const vjChangedAt    = data.vjChangedAt?.toMillis?.() || data.tiktokLinkedAt?.toMillis?.() || 0;
    const vjCooldownLeft = Math.max(0, vjChangedAt + VJ_CHANGE_COOLDOWN_MS - Date.now());
    return res.json({
      verified:          data.tiktokVerified || false,
      tiktokUniqueId:    data.tiktokUniqueId || null,
      vjCooldownDaysLeft: vjCooldownLeft > 0 ? Math.ceil(vjCooldownLeft / 86400_000) : 0,
      canChangeVJ:       vjCooldownLeft === 0,
    });
  } catch (err) {
    console.error('[Game/Account] getVerifyStatus:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Create Character =====
async function createCharacter(req, res) {
  const { name, race, characterClass } = req.body;
  const uid = req.user.uid;

  if (!name || !race || !characterClass) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อ เผ่า และอาชีพ' });
  }

  // Validate
  if (!RACES.includes(race)) return res.status(400).json({ error: 'เผ่าไม่ถูกต้อง' });
  if (!CLASSES_BY_RACE[race]?.includes(characterClass)) {
    return res.status(400).json({ error: 'อาชีพไม่ถูกต้องสำหรับเผ่านี้' });
  }

  const cleanName = name.replace(/[<>'"]/g, '').trim().slice(0, 20);
  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' });
  }

  const db = admin.firestore();

  try {
    // ตรวจ account ไม่มี character แล้ว
    const accountRef = db.collection('game_accounts').doc(uid);

    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(400).json({ error: 'Account ไม่พบ' });
    if (accountDoc.data().characterId) {
      return res.status(400).json({ error: 'มี Character อยู่แล้ว' });
    }

    // ตรวจ locked race — ต้อง unlock ก่อนถึงเลือกได้
    if (LOCKED_RACES.has(race)) {
      const cond = RACE_UNLOCK[race];
      // ดึง character เดิมเพื่อเช็ค (ถ้าไม่มี character เลยยังเลือก locked race ไม่ได้)
      const existingChar = accountDoc.data().characterId
        ? (await db.collection('game_characters').doc(accountDoc.data().characterId).get()).data()
        : null;
      const statVal = existingChar?.[cond.stat] || 0;
      if (statVal < cond.required) {
        return res.status(403).json({
          error: `🔒 เผ่านี้ยังล็อคอยู่ — ${cond.label} (ปัจจุบัน: ${statVal}/${cond.required})`,
        });
      }
    }

    // ตรวจชื่อซ้ำ
    const nameCheck = await db.collection('game_characters')
      .where('name', '==', cleanName).limit(1).get();
    if (!nameCheck.empty) return res.status(400).json({ error: 'ชื่อนี้ถูกใช้แล้ว' });

    // คำนวณ base stats
    const base = CLASS_BASE_STATS[characterClass];
    const mod  = RACE_MOD[race];
    const stats = {
      hp:    base.hp    + (mod.hp  || 0),
      mp:    base.mp,
      atk:   base.atk   + (mod.atk || 0),
      def:   base.def   + (mod.def || 0),
      spd:   base.spd   + (mod.spd || 0),
      mag:   base.mag   + (mod.mag || 0),
    };
    stats.hpMax = stats.hp;
    stats.mpMax = stats.mp;

    // Starting item by class
    const startingItems = getStartingItems(characterClass);

    const charId  = `char_${uid}_${Date.now()}`;
    const charData = {
      charId,
      uid,
      name:          cleanName,
      race,
      class:         characterClass,
      level:         1,
      xp:            0,
      xpToNext:      100,
      statPoints:    0,
      skillPoints:   0,
      ...stats,
      location:      'town_square',
      questLog:      [],
      completedQuests: [],
      stamina:       200,
      staminaMax:    200,
      failstack:     0,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt:  admin.firestore.FieldValue.serverTimestamp(),
    };

    // Equipment slots (all empty)
    const equipment = {
      HEAD: null, FACE: null, CHEST: null, GLOVES: null,
      LEGS: null, FEET: null, CAPE: null,
      MAIN_HAND: null, OFF_HAND: null,
      RING_L: null, RING_R: null, AMULET: null, BELT: null, RELIC: null,
    };

    const batch = db.batch();
    batch.set(db.collection('game_characters').doc(charId), charData);
    batch.set(db.collection('game_equipment').doc(uid), equipment);
    batch.update(accountRef, { characterId: charId });

    // Starting inventory
    for (const item of startingItems) {
      const invRef = db.collection('game_inventory').doc(`${uid}_${item.instanceId}`);
      batch.set(invRef, { uid, ...item });
    }

    await batch.commit();

    console.log(`[Game/Account] Character created: ${cleanName} (${race} ${characterClass}) uid=${uid}`);
    return res.json({ success: true, charId, name: cleanName, race, class: characterClass, stats });

  } catch (err) {
    console.error('[Game/Account] createCharacter:', err.message);
    res.status(500).json({ error: 'สร้าง Character ไม่สำเร็จ' });
  }
}

function getStartingItems(characterClass) {
  const { rollItem } = require('../../data/items');
  const weaponMap = {
    WARRIOR: 'iron_sword',   PALADIN: 'iron_sword',
    ROGUE: 'worn_dagger',    ASSASSIN: 'worn_dagger', PHANTOM: 'worn_dagger',
    MAGE: 'apprentice_staff', HEXBLADE: 'apprentice_staff',
    RANGER: 'short_bow',     BARD: 'short_bow',
    BERSERKER: 'rusted_axe',
    ENGINEER: 'rune_chisel', RUNESMITH: 'rune_chisel',
    CLERIC: 'apprentice_staff',
  };

  const weapon = weaponMap[characterClass] || 'iron_sword';
  return [
    rollItem(weapon),
    rollItem('leather_chest'),
    rollItem('leather_boots'),
    rollItem('health_potion_small'),
    rollItem('health_potion_small'),
  ].filter(Boolean);
}

// ===== Load Character =====
async function loadCharacter(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const { characterId, gold, realmPoints } = accountDoc.data();
    if (!characterId) return res.json({ hasCharacter: false });

    const [charDoc, equipDoc] = await Promise.all([
      db.collection('game_characters').doc(characterId).get(),
      db.collection('game_equipment').doc(uid).get(),
    ]);

    if (!charDoc.exists) return res.json({ hasCharacter: false });

    const char = charDoc.data();
    // Regen stamina: 1 ต่อ 5 นาที (12/ชม) — เต็มจาก 0 ใช้เวลา ~16 ชั่วโมง
    const lastActive = char.lastActiveAt?.toMillis?.() || Date.now();
    const minutesPassed = Math.floor((Date.now() - lastActive) / 60000);
    const staminaRegen = Math.min(Math.floor(minutesPassed / 5), char.staminaMax - char.stamina);
    if (staminaRegen > 0) {
      await db.collection('game_characters').doc(characterId).update({
        stamina: char.stamina + staminaRegen,
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      char.stamina += staminaRegen;
    }

    return res.json({
      hasCharacter: true,
      character: {
        ...char,
        gold:         gold || 0,
        realmPoints:  realmPoints || 0,
      },
      equipment: equipDoc.exists ? equipDoc.data() : {},
    });
  } catch (err) {
    console.error('[Game/Account] loadCharacter:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Delete Character =====
// ลบ character + inventory + equipment + quest_state + npc_affection
// account.characterId จะถูก reset เป็น null
async function deleteCharacter(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const accountRef = db.collection('game_accounts').doc(uid);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) return res.status(404).json({ error: 'Account ไม่พบ' });

    const charId = accountDoc.data().characterId;
    if (!charId) return res.status(400).json({ error: 'ไม่มี Character ให้ลบ' });

    // ── ลบทุก sub-collections ที่เกี่ยวข้อง — แยก try/catch ต่อ collection ──
    const collectionsToClean = [
      { name: 'game_inventory',    query: db.collection('game_inventory').where('uid', '==', uid) },
      { name: 'game_quest_state',  query: db.collection('game_quest_state').where('uid', '==', uid) },
      { name: 'game_npc_affection',query: db.collection('game_npc_affection').where('uid', '==', uid) },
    ];

    for (const { name, query } of collectionsToClean) {
      try {
        let snap = await query.get();
        while (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          if (snap.docs.length < 500) break;
          snap = await query.get();
        }
      } catch (e) {
        // ไม่หยุด — collection อาจไม่มี หรือยังไม่มี index
        console.warn(`[Account] deleteCharacter: cleanup ${name} skip:`, e.message);
      }
    }

    // ลบ character document
    await db.collection('game_characters').doc(charId).delete();

    // ลบ equipment document (key = uid)
    await db.collection('game_equipment').doc(uid).delete().catch(() => {});

    // ลบ active battles (ถ้ามี) — catch แยกเพราะ collection อาจไม่มี
    try {
      const battleSnap = await db.collection('game_battles').where('uid', '==', uid).get();
      if (!battleSnap.empty) {
        const b = db.batch();
        battleSnap.docs.forEach(d => b.delete(d.ref));
        await b.commit();
      }
    } catch (e) {
      console.warn('[Account] deleteCharacter: cleanup game_battles skip:', e.message);
    }

    // Reset account — เก็บ gold, realmPoints, tiktokVerified, unlockedRaces, etc.
    await accountRef.update({
      characterId:        null,
      zoneBossKills:      {},
      activeBoosts:       {},
      pendingClassChange: admin.firestore.FieldValue.delete(),
      pendingNameChange:  admin.firestore.FieldValue.delete(),
    });

    console.log(`[Account] 🗑️ uid=${uid} deleted character ${charId}`);
    return res.json({ success: true, msg: '🗑️ ลบตัวละครสำเร็จ — สร้างตัวใหม่ได้เลย' });
  } catch (err) {
    console.error('[Game/Account] deleteCharacter error:', err.message, err.code);
    res.status(500).json({ error: `ลบไม่สำเร็จ: ${err.message}` });
  }
}

// ===== Get Unlocked Races + Progress =====
async function getUnlockedRaces(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (!accountDoc.exists) return res.json({ unlockedRaces: [], progress: {} });
    const charId = accountDoc.data().characterId;

    // ถ้ายังไม่มี character ก็ยังปลดล็อคไม่ได้ทั้งหมด
    const progress = {};
    const unlockedRaces = [];

    if (charId) {
      const charDoc = await db.collection('game_characters').doc(charId).get();
      const char    = charDoc.exists ? charDoc.data() : {};
      for (const [race, cond] of Object.entries(RACE_UNLOCK)) {
        const current  = Math.min(char[cond.stat] || 0, cond.required);
        const unlocked = current >= cond.required;
        progress[race] = { current, required: cond.required, label: cond.label, unlocked };
        if (unlocked) unlockedRaces.push(race);
      }
    } else {
      for (const [race, cond] of Object.entries(RACE_UNLOCK)) {
        progress[race] = { current: 0, required: cond.required, label: cond.label, unlocked: false };
      }
    }

    return res.json({ unlockedRaces, progress });
  } catch (err) {
    console.error('[Game/Account] getUnlockedRaces:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  syncAccount, requestVerifyCode, getVerifyStatus,
  createCharacter, loadCharacter, deleteCharacter,
  getUnlockedRaces,
  checkChatVerify,
  CLASS_BASE_STATS,   // exported for admin balance sim
  CLASSES_BY_RACE,    // exported for admin balance sim
  // pendingVerifications ถูกย้ายไป Firestore แล้ว — ไม่ export อีกต่อไป
};
