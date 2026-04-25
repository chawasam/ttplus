// handlers/game/account.js — Game account management + TikTok verify
const admin = require('firebase-admin');

// ===== TikTok Verify Code Storage =====
// Map: uid → { code, tiktokUniqueId, expiresAt }
const pendingVerifications = new Map();

// คำภาษาไทยสำหรับสร้าง verify code
const WORD_POOL = [
  'ดาบ','โล่','หอก','ธนู','ไฟ','น้ำ','ดิน','ลม','แสง','เงา',
  'เสือ','มังกร','หมาป่า','อินทรี','งู','สิงห์','หมี','กา',
  'ทอง','เงิน','เหล็ก','คริสตัล','น้ำแข็ง','ฟ้า','พายุ','เปลวไฟ',
  'ป่า','ถ้ำ','ภูเขา','ทะเล','ทะเลทราย','หิมะ','หมอก','พระจันทร์',
];

const VERIFY_TTL_MS          = 10 * 60 * 1000;  // 10 นาที
const VJ_CHANGE_COOLDOWN_MS  = 7 * 24 * 3600_000; // 7 วัน
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
  BARD:       { hp: 105, mp: 90,  atk: 14, def: 10, spd: 12, mag: 18 },
  BERSERKER:  { hp: 170, mp: 30,  atk: 28, def: 14, spd: 6,  mag: 3  },
  ENGINEER:   { hp: 130, mp: 60,  atk: 18, def: 20, spd: 6,  mag: 12 },
  RUNESMITH:  { hp: 120, mp: 80,  atk: 16, def: 18, spd: 7,  mag: 18 },
  ASSASSIN:    { hp: 100, mp: 70,  atk: 25, def: 10, spd: 18, mag: 8  },
  HEXBLADE:    { hp: 105, mp: 100, atk: 18, def: 12, spd: 12, mag: 22 },
  PHANTOM:     { hp: 95,  mp: 110, atk: 15, def: 8,  spd: 15, mag: 25 },
  // Locked races
  DEATHKNIGHT: { hp: 140, mp: 60,  atk: 22, def: 16, spd: 8,  mag: 12 },
  NECROMANCER: { hp: 95,  mp: 130, atk: 10, def: 8,  spd: 8,  mag: 32 },
  GRAVECALLER: { hp: 110, mp: 110, atk: 12, def: 10, spd: 9,  mag: 25 },
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

function generateVerifyCode() {
  const words = [];
  const pool  = [...WORD_POOL];
  while (words.length < 3) {
    const idx = Math.floor(Math.random() * pool.length);
    words.push(pool.splice(idx, 1)[0]);
  }
  return words.join('');
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

    return res.json({
      account: {
        uid,
        email:          data.email,
        displayName:    data.displayName,
        tiktokUniqueId: data.tiktokUniqueId,
        tiktokVerified: data.tiktokVerified,
        characterId:    data.characterId,
        gold:           data.gold || 0,
        realmPoints:    data.realmPoints || 0,
        dailyStreak:    newStreak,
      },
      isNew: false,
    });
  } catch (err) {
    console.error('[Game/Account] syncAccount:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
}

// ===== Step 1: Request TikTok verify code =====
async function requestVerifyCode(req, res) {
  const { tiktokUniqueId } = req.body;
  if (!tiktokUniqueId || typeof tiktokUniqueId !== 'string') {
    return res.status(400).json({ error: 'กรุณาใส่ TikTok username' });
  }

  const clean = tiktokUniqueId.replace(/[^a-zA-Z0-9._]/g, '').replace(/^@/, '').slice(0, 50);
  if (!clean) return res.status(400).json({ error: 'Username ไม่ถูกต้อง' });

  const db = admin.firestore();
  try {
    // ตรวจ cooldown การเปลี่ยน VJ
    const myDoc = await db.collection('game_accounts').doc(req.user.uid).get();
    if (myDoc.exists) {
      const myData = myDoc.data();
      if (myData.tiktokVerified && myData.tiktokUniqueId && myData.tiktokUniqueId !== clean) {
        // ผู้เล่นต้องการเปลี่ยน VJ — ตรวจ cooldown
        const vjChangedAt = myData.vjChangedAt?.toMillis?.() || myData.tiktokLinkedAt?.toMillis?.() || 0;
        const elapsed     = Date.now() - vjChangedAt;
        if (elapsed < VJ_CHANGE_COOLDOWN_MS) {
          const daysLeft = Math.ceil((VJ_CHANGE_COOLDOWN_MS - elapsed) / 86400_000);
          return res.status(429).json({
            error: `การเปลี่ยน VJ มี Cooldown 7 วัน — รออีก ${daysLeft} วัน`,
            cooldownDaysLeft: daysLeft,
          });
        }
      }
    }

    // ตรวจว่า username นี้มีคนใช้แล้วหรือยัง
    const existing = await db.collection('game_accounts')
      .where('tiktokUniqueId', '==', clean)
      .where('tiktokVerified', '==', true)
      .limit(1).get();

    if (!existing.empty && existing.docs[0].id !== req.user.uid) {
      return res.status(400).json({ error: `@${clean} ถูกใช้งานโดย account อื่นแล้ว` });
    }
  } catch (err) {
    console.error('[Game/Account] requestVerifyCode check:', err.message);
  }

  const code      = generateVerifyCode();
  const expiresAt = Date.now() + VERIFY_TTL_MS;

  pendingVerifications.set(req.user.uid, { code, tiktokUniqueId: clean, expiresAt });

  // ล้าง expired entries
  for (const [k, v] of pendingVerifications.entries()) {
    if (Date.now() > v.expiresAt) pendingVerifications.delete(k);
  }

  console.log(`[Game/Verify] uid=${req.user.uid} tiktok=@${clean} code=${code}`);
  return res.json({ code, tiktokUniqueId: clean, expiresIn: VERIFY_TTL_MS });
}

// ===== Called from tiktok.js chat handler =====
// ตรวจว่า chat message มี verify code ตรงกับ pending verification ของใครไหม
async function checkChatVerify(uniqueId, comment) {
  const db = admin.firestore();

  for (const [uid, pending] of pendingVerifications.entries()) {
    if (Date.now() > pending.expiresAt) {
      pendingVerifications.delete(uid);
      continue;
    }
    if (pending.tiktokUniqueId.toLowerCase() !== uniqueId.toLowerCase()) continue;
    if (!comment.includes(pending.code)) continue;

    // Match! ยืนยันสำเร็จ
    pendingVerifications.delete(uid);
    console.log(`[Game/Verify] ✅ uid=${uid} @${uniqueId} verified!`);

    try {
      const existingDoc = await db.collection('game_accounts').doc(uid).get();
      const isVJChange  = existingDoc.exists && existingDoc.data().tiktokVerified &&
                          existingDoc.data().tiktokUniqueId !== pending.tiktokUniqueId;

      const updatePayload = {
        tiktokUniqueId: pending.tiktokUniqueId,
        tiktokVerified: true,
        tiktokLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (isVJChange) {
        // บันทึกเวลาเปลี่ยน VJ สำหรับ cooldown
        updatePayload.vjChangedAt = admin.firestore.FieldValue.serverTimestamp();
        console.log(`[Game/Verify] VJ changed: uid=${uid} old=@${existingDoc.data().tiktokUniqueId} new=@${pending.tiktokUniqueId}`);
      }

      await db.collection('game_accounts').doc(uid).update(updatePayload);
    } catch (err) {
      console.error('[Game/Verify] Firestore update error:', err.message);
    }

    return { uid, tiktokUniqueId: pending.tiktokUniqueId };
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
      stamina:       100,
      staminaMax:    100,
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
    // Regen stamina (10/minute)
    const lastActive = char.lastActiveAt?.toMillis?.() || Date.now();
    const minutesPassed = Math.floor((Date.now() - lastActive) / 60000);
    const staminaRegen = Math.min(minutesPassed * 10, char.staminaMax - char.stamina);
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
  createCharacter, loadCharacter,
  getUnlockedRaces,
  checkChatVerify, pendingVerifications,
};
