// handlers/admin/firebaseUsage.js
// Firebase / Firestore usage monitor สำหรับ Admin Dashboard
// แสดงขนาด collection, Auth users, queue health, และ daily activity stats

const admin = require('firebase-admin');

// ── Firestore Spark (free) limits ─────────────────────────────────────────────
const SPARK_LIMITS = {
  reads:   50_000,  // per day
  writes:  20_000,  // per day
  deletes: 20_000,  // per day
  storage: 1024,    // MB (1 GB)
};

// ── Collections ที่ต้องการนับ — จัดกลุ่มตาม category ──────────────────────────
const COLLECTIONS = {
  actions: [
    { key: 'tt_actions',      label: 'Actions',         icon: '⚡' },
    { key: 'tt_events',       label: 'Events',          icon: '🎯' },
    { key: 'tt_action_queue', label: 'Action Queue',    icon: '📬' },
    { key: 'tt_obs_settings', label: 'OBS Settings',    icon: '🎬' },
  ],
  game: [
    { key: 'game_accounts',   label: 'Accounts',        icon: '👤' },
    { key: 'game_characters', label: 'Characters',      icon: '⚔️' },
    { key: 'game_inventory',  label: 'Inventory',       icon: '🎒' },
    { key: 'game_equipment',  label: 'Equipment',       icon: '🛡️' },
    { key: 'game_battles',    label: 'Battle History',  icon: '⚔️' },
    { key: 'game_dungeons',   label: 'Dungeon Runs',    icon: '🏰' },
    { key: 'game_transactions', label: 'Transactions',  icon: '💰' },
    { key: 'game_flags',      label: 'Flags',           icon: '🚩' },
    { key: 'game_world_boss', label: 'World Boss',      icon: '👹' },
  ],
  system: [
    { key: 'user_settings',     label: 'User Settings',   icon: '⚙️' },
    { key: 'widget_cids',       label: 'Widget CIDs',     icon: '🔑' },
    { key: 'admin_errors',      label: 'Error Log',       icon: '🐛' },
    { key: 'admin_heartbeats',  label: 'Heartbeats',      icon: '💓' },
    { key: 'admin_season_events', label: 'Season Events', icon: '🗓️' },
    { key: 'leaderboard_state', label: 'Leaderboard',     icon: '🏆' },
  ],
};

// ── นับ documents ทุก collection พร้อมกัน ──────────────────────────────────────
async function countCollection(key) {
  try {
    const snap = await admin.firestore().collection(key).count().get();
    return snap.data().count || 0;
  } catch {
    return null; // collection ไม่มีหรือ error
  }
}

// ── Queue health: items ที่ค้างนานเกิน threshold ───────────────────────────────
async function getQueueHealth() {
  try {
    const db = admin.firestore();
    const now = Date.now();

    // นับ items ที่ยังไม่ถูก play
    const pendingSnap = await db.collection('tt_action_queue')
      .where('played', '==', false)
      .get();

    const pending = pendingSnap.docs.map(d => ({
      ...d.data(),
      id: d.id,
    }));

    const stuckOver5m  = pending.filter(d => now - (d.createdAt || 0) > 5  * 60 * 1000).length;
    const stuckOver30m = pending.filter(d => now - (d.createdAt || 0) > 30 * 60 * 1000).length;

    // หา item เก่าสุด
    const oldest = pending.length
      ? Math.min(...pending.map(d => d.createdAt || now))
      : null;

    return {
      pending: pending.length,
      stuckOver5m,
      stuckOver30m,
      oldestMs: oldest ? now - oldest : null,
    };
  } catch {
    return { pending: 0, stuckOver5m: 0, stuckOver30m: 0, oldestMs: null };
  }
}

// ── Firebase Auth user count (pageToken loop ครบทุก user) ────────────────────
async function getAuthUserCount() {
  try {
    let count = 0;
    let pageToken;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      count += result.users.length;
      pageToken = result.pageToken;
    } while (pageToken);
    return count;
  } catch {
    return null;
  }
}

// ── Daily activity: นับ documents ที่สร้าง/อัปเดต ใน 7 วันย้อนหลัง ───────────
// ใช้ game_battles (มี createdAt timestamp) เป็น proxy ของ daily activity
async function getDailyStats() {
  try {
    const db = admin.firestore();
    const now = Date.now();
    const DAY = 86_400_000;

    // สร้าง 7 slots ย้อนหลัง (เริ่มจาก 6 วันก่อน → วันนี้)
    const slots = Array.from({ length: 7 }, (_, i) => {
      const start = now - (6 - i) * DAY;
      const end   = start + DAY;
      const label = new Date(start).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' });
      return { start, end, label, battles: 0, actions: 0 };
    });

    // ── Battles ──
    const battleSnap = await db.collection('game_battles')
      .where('createdAt', '>=', now - 7 * DAY)
      .get();
    battleSnap.docs.forEach(d => {
      const ts = d.data().createdAt;
      const slot = slots.find(s => ts >= s.start && ts < s.end);
      if (slot) slot.battles++;
    });

    // ── Actions fired (queue entries) ──
    const qSnap = await db.collection('tt_action_queue')
      .where('createdAt', '>=', now - 7 * DAY)
      .get();
    qSnap.docs.forEach(d => {
      const ts = d.data().createdAt;
      const slot = slots.find(s => ts >= s.start && ts < s.end);
      if (slot) slot.actions++;
    });

    // คำนวณ estimated writes วันนี้ (ใช้ slot สุดท้าย)
    const todaySlot = slots[slots.length - 1];
    // โดยประมาณ: battle ≈ 5 writes, action ≈ 2 writes
    const estimatedWritesToday = (todaySlot.battles * 5) + (todaySlot.actions * 2);
    const estimatedReadsToday  = (todaySlot.battles * 8) + (todaySlot.actions * 3);

    return { slots, estimatedWritesToday, estimatedReadsToday };
  } catch {
    return {
      slots: Array.from({ length: 7 }, (_, i) => ({
        label: `D-${6 - i}`, battles: 0, actions: 0,
      })),
      estimatedWritesToday: 0,
      estimatedReadsToday: 0,
    };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function getFirebaseUsage(req, res) {
  try {
    // นับ collections ทั้งหมดพร้อมกัน
    const allKeys = [
      ...COLLECTIONS.actions,
      ...COLLECTIONS.game,
      ...COLLECTIONS.system,
    ];

    const [counts, queueHealth, authCount, dailyStats] = await Promise.all([
      Promise.all(allKeys.map(c => countCollection(c.key))),
      getQueueHealth(),
      getAuthUserCount(),
      getDailyStats(),
    ]);

    // รวม count กลับเข้า collections
    const withCounts = {};
    allKeys.forEach((c, i) => { withCounts[c.key] = counts[i]; });

    // รวม total documents ทั้งหมด (ประมาณ storage)
    const totalDocs = Object.values(withCounts).reduce((s, n) => s + (n || 0), 0);
    // Firestore ≈ 1KB/doc average → estimate storage
    const estimatedStorageMB = Math.round(totalDocs * 1 / 1024); // 1KB/doc estimate

    res.json({
      limits: SPARK_LIMITS,
      collections: {
        actions: COLLECTIONS.actions.map(c => ({ ...c, count: withCounts[c.key] })),
        game:    COLLECTIONS.game.map(c    => ({ ...c, count: withCounts[c.key] })),
        system:  COLLECTIONS.system.map(c  => ({ ...c, count: withCounts[c.key] })),
      },
      totals: {
        documents: totalDocs,
        estimatedStorageMB,
        authUsers: authCount,
      },
      queueHealth,
      daily: dailyStats,
      ts: Date.now(),
    });
  } catch (err) {
    console.error('[FirebaseUsage]', err.message);
    res.status(500).json({ error: 'Failed to get Firebase usage' });
  }
}

module.exports = { getFirebaseUsage };
