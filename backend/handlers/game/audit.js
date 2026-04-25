// handlers/game/audit.js — Admin audit dashboard
// เข้าถึงได้เฉพาะ ADMIN_UID ที่ตั้งใน Railway env
const admin = require('firebase-admin');

const ADMIN_UID = process.env.ADMIN_UID || null;

// ── Middleware: ตรวจว่าเป็น admin ──────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (!ADMIN_UID) {
    return res.status(503).json({ error: 'ADMIN_UID ยังไม่ได้ตั้งค่าใน env' });
  }
  if (req.user?.uid !== ADMIN_UID) {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
}

// ── GET /api/game/audit/flags — รายการ flag ทั้งหมด ──────────────────────────
async function getFlags(req, res) {
  const db = admin.firestore();
  const { resolved = 'false', limit: lim = '50' } = req.query;
  const showResolved = resolved === 'true';

  try {
    let query = db.collection('game_flags')
      .where('resolved', '==', showResolved)
      .orderBy('ts', 'desc')
      .limit(parseInt(lim, 10));

    const snap  = await query.get();
    const flags = snap.docs.map(doc => ({
      id:       doc.id,
      uid:      doc.data().uid,
      reason:   doc.data().reason,
      data:     doc.data().data,
      resolved: doc.data().resolved,
      ts:       doc.data().ts?.toDate?.()?.toISOString() || null,
    }));

    // แนบ TikTok username ถ้ามี (สะดวกอ่าน)
    const accounts = await Promise.all(
      [...new Set(flags.map(f => f.uid))].map(async uid => {
        const doc = await db.collection('game_accounts').doc(uid).get();
        return { uid, tiktokId: doc.data()?.tiktokUniqueId || '—', charName: doc.data()?.characterName || '—' };
      })
    );
    const accountMap = Object.fromEntries(accounts.map(a => [a.uid, a]));

    return res.json({
      total: flags.length,
      flags: flags.map(f => ({
        ...f,
        tiktokId:  accountMap[f.uid]?.tiktokId  || '—',
        charName:  accountMap[f.uid]?.charName   || '—',
      })),
    });
  } catch (err) {
    console.error('[Audit] getFlags:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── GET /api/game/audit/player/:uid — ประวัติรางวัลของ player คนนั้น ──────────
async function getPlayerHistory(req, res) {
  const { uid: targetUid } = req.params;
  const db  = admin.firestore();
  const lim = parseInt(req.query.limit || '100', 10);

  try {
    const snap = await db.collection('game_audit_rewards')
      .where('uid', '==', targetUid)
      .orderBy('ts', 'desc')
      .limit(lim)
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:      doc.id,
        source:  d.source,
        xp:      d.xp,
        gold:    d.gold,
        items:   d.items,
        levelUp: d.levelUp,
        ts:      d.ts?.toDate?.()?.toISOString() || null,
      };
    });

    // Summary
    const totalXp   = rows.reduce((s, r) => s + (r.xp   || 0), 0);
    const totalGold = rows.reduce((s, r) => s + (r.gold || 0), 0);
    const levelUps  = rows.filter(r => r.levelUp).length;

    return res.json({ uid: targetUid, total: rows.length, totalXp, totalGold, levelUps, history: rows });
  } catch (err) {
    console.error('[Audit] getPlayerHistory:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── POST /api/game/audit/flags/:flagId/resolve — mark flag as resolved ────────
async function resolveFlag(req, res) {
  const { flagId } = req.params;
  const { note = '' } = req.body;
  const db = admin.firestore();

  try {
    await db.collection('game_flags').doc(flagId).update({
      resolved:   true,
      resolvedBy: req.user.uid,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      note,
    });
    return res.json({ success: true, flagId });
  } catch (err) {
    console.error('[Audit] resolveFlag:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── GET /api/game/audit/summary — snapshot ภาพรวม ────────────────────────────
async function getSummary(req, res) {
  const db = admin.firestore();
  try {
    const [unresolvedSnap, oneDaySnap] = await Promise.all([
      db.collection('game_flags').where('resolved', '==', false).get(),
      db.collection('game_audit_rewards')
        .where('ts', '>=', new Date(Date.now() - 86400_000))
        .get(),
    ]);

    // Top active players in last 24h
    const byUid = {};
    for (const doc of oneDaySnap.docs) {
      const d = doc.data();
      if (!byUid[d.uid]) byUid[d.uid] = { uid: d.uid, xp: 0, gold: 0, combats: 0, levelUps: 0 };
      byUid[d.uid].xp      += d.xp   || 0;
      byUid[d.uid].gold    += d.gold  || 0;
      byUid[d.uid].combats += 1;
      if (d.levelUp) byUid[d.uid].levelUps++;
    }

    const topPlayers = Object.values(byUid)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 20);

    return res.json({
      unresolvedFlags:  unresolvedSnap.size,
      rewardsLast24h:   oneDaySnap.size,
      topPlayersByXp:   topPlayers,
    });
  } catch (err) {
    console.error('[Audit] getSummary:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── GET /api/game/audit/activity — recent reward feed across all players ──────
async function getActivity(req, res) {
  const db  = admin.firestore();
  const lim = Math.min(parseInt(req.query.limit || '100', 10), 500);
  const THRESHOLDS = { xp: 8000, gold: 60000 };

  try {
    const snap = await db.collection('game_audit_rewards')
      .orderBy('ts', 'desc')
      .limit(lim)
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:         doc.id,
        uid:        d.uid,
        source:     d.source,
        xp:         d.xp    || 0,
        gold:       d.gold  || 0,
        items:      d.items || [],
        levelUp:    d.levelUp || null,
        ts:         d.ts?.toDate?.()?.toISOString() || null,
        suspicious: (d.xp > THRESHOLDS.xp) || (d.gold > THRESHOLDS.gold),
      };
    });

    return res.json({ total: rows.length, activity: rows });
  } catch (err) {
    console.error('[Audit] getActivity:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── GET /api/game/audit/players — all players with character stats ─────────────
async function getPlayers(req, res) {
  const db   = admin.firestore();
  const sort = req.query.sort || 'level'; // level | gold | monstersKilled | deathCount
  const lim  = Math.min(parseInt(req.query.limit || '100', 10), 500);

  try {
    const accountsSnap = await db.collection('game_accounts').limit(lim).get();

    const players = await Promise.all(accountsSnap.docs.map(async doc => {
      const acct = doc.data();
      let char = null;
      if (acct.characterId) {
        const charDoc = await db.collection('game_characters').doc(acct.characterId).get();
        if (charDoc.exists) char = charDoc.data();
      }
      return {
        uid:            doc.id,
        tiktokId:       acct.tiktokUniqueId || '—',
        gold:           acct.gold || 0,
        name:           char?.name           || '—',
        race:           char?.race           || '—',
        charClass:      char?.class          || '—',
        level:          char?.level          || 0,
        xp:             char?.xp             || 0,
        xpToNext:       char?.xpToNext       || 100,
        hp:             char?.hp             || 0,
        hpMax:          char?.hpMax          || 0,
        monstersKilled: char?.monstersKilled || 0,
        deathCount:     char?.deathCount     || 0,
        location:       char?.location       || '—',
        explorationCount: char?.explorationCount || 0,
      };
    }));

    const sortable = ['level', 'gold', 'monstersKilled', 'deathCount', 'xp', 'explorationCount'];
    const sortKey  = sortable.includes(sort) ? sort : 'level';
    players.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

    return res.json({ total: players.length, players });
  } catch (err) {
    console.error('[Audit] getPlayers:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ── POST /api/game/audit/players/:uid/flag — admin manual flag ────────────────
async function manualFlag(req, res) {
  const { uid: targetUid } = req.params;
  const { reason = 'Manual flag by admin' } = req.body;
  const db = admin.firestore();

  try {
    const { flagPlayer } = require('../../utils/anticheat');
    await flagPlayer(targetUid, `[MANUAL] ${reason}`, { flaggedBy: req.user.uid });
    return res.json({ success: true, uid: targetUid });
  } catch (err) {
    console.error('[Audit] manualFlag:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  requireAdmin,
  getFlags, getPlayerHistory, resolveFlag, getSummary,
  getActivity, getPlayers, manualFlag,
};
