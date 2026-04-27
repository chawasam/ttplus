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

// ── GET /api/game/audit/skill-stats ─────────────────────────────────────────
async function getSkillStats(req, res) {
  const db = admin.firestore();
  try {
    const snap = await db.collection('game_skill_stats').orderBy('useCount', 'desc').limit(100).get();
    const skills = snap.docs.map(doc => {
      const d = doc.data();
      return {
        skillId:   d.skillId || doc.id,
        name:      d.name || doc.id,
        charClass: d.charClass || 'any',
        useCount:  d.useCount || 0,
        lastUsed:  d.lastUsed?.toDate?.()?.toISOString?.() || null,
      };
    });
    return res.json({ skills, scannedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[Audit] getSkillStats:', err.message);
    return res.status(500).json({ error: 'Server error', skills: [] });
  }
}

// ── GET /api/game/audit/item-stats ───────────────────────────────────────────
async function getItemStats(req, res) {
  const db = admin.firestore();
  try {
    const snap = await db.collection('game_item_stats').get();
    const items = snap.docs.map(doc => {
      const d = doc.data();
      return {
        itemId:    d.itemId || doc.id,
        name:      d.name || doc.id,
        emoji:     d.emoji || '📦',
        type:      d.type || 'UNKNOWN',
        buyCount:  d.buyCount || 0,
        sellCount: d.sellCount || 0,
        lastBought: d.lastBought?.toDate?.()?.toISOString?.() || null,
        lastSold:   d.lastSold?.toDate?.()?.toISOString?.() || null,
      };
    });
    // Sort by buyCount desc
    items.sort((a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount));
    return res.json({ items, scannedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[Audit] getItemStats:', err.message);
    return res.status(500).json({ error: 'Server error', items: [] });
  }
}

// ── GET /api/game/audit/gamedata — Game Database (read-only) ─────────────────
async function getGameData(req, res) {
  try {
    const { MONSTERS, ZONE_TIER_DROPS } = require('../../data/monsters');
    const { NPCS }       = require('../../data/npcs');
    const { ZONES }      = require('../../data/maps');
    const { CLASS_SKILLS }  = require('../../data/skills');
    const { RECIPES }       = require('../../data/crafting');
    const { DUNGEONS }      = require('../../data/dungeons');
    const { WORLD_BOSSES }  = require('../../data/world_bosses');
    const { ACHIEVEMENTS }  = require('../../data/achievements');
    const { DAILY_QUESTS, DAILY_BONUS } = require('../../data/quests');
    const { STORY_QUESTS }  = require('../../data/story_quests');
    const { SIDE_QUESTS }   = require('../../data/side_quests');
    const { WEEKLY_QUESTS, WEEKLY_BONUS } = require('../../data/weekly_quests');

    const monsters = Object.values(MONSTERS).map(m => {
      const zonePool = ZONE_TIER_DROPS[m.zone] || null;
      return {
        monsterId:  m.monsterId,
        name:       m.name,
        emoji:      m.emoji,
        zone:       m.zone,
        type:       m.type,
        level:      m.level,
        hp:         m.hp,
        atk:        m.atk,
        def:        m.def,
        spd:        m.spd,
        element:    m.element || null,
        rank:       m.rank || null,
        xpReward:   m.xpReward,
        goldMin:    Array.isArray(m.goldReward) ? m.goldReward[0] : m.goldReward,
        goldMax:    Array.isArray(m.goldReward) ? m.goldReward[1] : m.goldReward,
        flee_chance:m.flee_chance,
        desc:       m.desc,
        attackMsg:  m.attackMsg || [],
        drops:      m.drops || [],
        skills:     m.skills || [],
        counterAttack: m.counterAttack || null,
        isBoss:     m.isBoss || false,
        // Zone pool — ไอเทมที่ดรอปจาก zone pool (ร่วมกับมอนสเตอร์ทุกตัวใน zone)
        zonePool: zonePool ? {
          tier:        zonePool.tier,
          equipChance: zonePool.equipChance,
          equipment:   zonePool.equipment || [],
          materials:   zonePool.materials || [],
        } : null,
      };
    });

    const npcs = Object.values(NPCS).map(n => ({
      npcId:        n.npcId,
      name:         n.name,
      emoji:        n.emoji,
      title:        n.title,
      zone:         n.zone,
      isShopkeeper: n.isShopkeeper || false,
      personality:  n.personality,
      likes:        n.likes || [],
      neutral:      n.neutral || [],
      hates:        n.hates || [],
      likeBonus:    n.likeBonus,
      hatePenalty:  n.hatePenalty,
      decayPerDay:  n.decayPerDay,
      decayFloor:   n.decayFloor,
      bondItem:     n.bondItem,
      bondDesc:     n.bondDesc,
      dialogs:      n.dialogs || {},
      specialEvent: n.specialEvent || null,
    }));

    const zones = Object.values(ZONES).map(z => ({
      zoneId:      z.zoneId,
      name:        z.name,
      nameTH:      z.nameTH,
      icon:        z.icon,
      shard:       z.shard,
      levelMin:    Array.isArray(z.level) ? z.level[0] : 1,
      levelMax:    Array.isArray(z.level) ? z.level[1] : 99,
      minLevel:    z.minLevel,
      canFight:    z.canFight || false,
      canExplore:  z.canExplore || false,
      monsters:    z.monsters || [],
      npcs:        z.npcs || [],
      connections: z.connections || [],
      zoneBossId:  z.zoneBossId || null,
      atmosphere:  z.atmosphere || [],
      events:      (z.events || []).map(e => ({
        id:     e.id,
        weight: e.weight,
        type:   e.result?.type,
        msg:    e.result?.msg,
      })),
    }));

    const { ITEMS } = require('../../data/items');
    const items = Object.values(ITEMS).map(it => ({
      itemId:    it.itemId,
      name:      it.name,
      emoji:     it.emoji,
      grade:     it.grade,
      type:      it.type,
      levelReq:  it.levelReq || 1,
      classReq:  it.classReq || [],
      base:      it.base || {},
      rolls:     it.rolls || {},
      sockets:   it.sockets || 0,
      desc:      it.desc || '',
      sellPrice: it.sellPrice || 0,
      buyPrice:  it.buyPrice || 0,
      effect:    it.effect || null,
    }));

    // ── Skills Encyclopedia ──────────────────────────────────────────────────
    const skills = Object.entries(CLASS_SKILLS).map(([className, skillList]) => ({
      className,
      skills: skillList.map(s => ({
        id:            s.id,
        name:          s.name,
        desc:          s.desc,
        mpCost:        s.mpCost,
        skillPointCost:s.skillPointCost,
        minLevel:      s.minLevel,
        damage:        s.damage || 0,
        magicDamage:   s.magicDamage || false,
        multiHit:      s.multiHit || null,
        armorPierce:   s.armorPierce || false,
        forceCrit:     s.forceCrit || false,
        selfBuff:      s.selfBuff || null,
        effect:        s.effect || null,
        bonusVsCC:     s.bonusVsCC || null,
        bonusVsType:   s.bonusVsType || null,
      })),
    }));

    // ── Crafting Recipes ─────────────────────────────────────────────────────
    const crafting = RECIPES.map(r => ({
      recipeId:    r.recipeId,
      name:        r.name,
      emoji:       r.emoji,
      desc:        r.desc,
      category:    r.category,
      levelReq:    r.levelReq,
      resultItemId:r.resultItemId,
      resultGrade: r.resultGrade,
      ingredients: r.ingredients,
      goldCost:    r.goldCost,
    }));

    // ── Dungeons ─────────────────────────────────────────────────────────────
    const dungeons = Object.values(DUNGEONS).map(d => ({
      id:                d.id,
      name:              d.name,
      nameTH:            d.nameTH,
      emoji:             d.emoji,
      region:            d.region,
      desc:              d.desc,
      difficulty:        d.difficulty,
      difficultyLabel:   d.difficultyLabel,
      minLevel:          d.minLevel,
      totalRooms:        d.totalRooms,
      clearCooldownHours:d.clearCooldownHours,
      rooms: (d.rooms || []).map(room => ({
        room:     room.room,
        type:     room.type,
        name:     room.name,
        desc:     room.desc,
        monsterId:room.monsterId || null,
        trapDmg:  room.trapDmg  || null,
        gold:     room.gold     || null,
        healPercent:room.healPercent || null,
        boss:     room.boss ? {
          name:       room.boss.name,
          emoji:      room.boss.emoji,
          hp:         room.boss.hp,
          atk:        room.boss.atk,
          def:        room.boss.def,
          spd:        room.boss.spd,
          xpReward:   room.boss.xpReward,
          goldReward: room.boss.goldReward,
          drops:      room.boss.drops || [],
        } : null,
      })),
    }));

    // ── World Bosses ─────────────────────────────────────────────────────────
    const worldBosses = WORLD_BOSSES.map(b => ({
      bossId:    b.bossId,
      name:      b.name,
      nameTH:    b.nameTH,
      emoji:     b.emoji,
      desc:      b.desc,
      lore:      b.lore || null,
      hp:        b.hp,
      atk:       b.atk,
      def:       b.def,
      timeLimit: b.timeLimit,
      minPlayers:b.minPlayers,
      rewards:   b.rewards,
      spawnMsg:  b.spawnMsg,
      killMsg:   b.killMsg,
    }));

    // ── Achievements ─────────────────────────────────────────────────────────
    const achievements = ACHIEVEMENTS.map(a => ({
      id:     a.id,
      name:   a.name,
      desc:   a.desc,
      type:   a.type,
      target: a.target,
      reward: a.reward,
    }));

    // ── Quests ───────────────────────────────────────────────────────────────
    const quests = {
      daily:  DAILY_QUESTS,
      dailyBonus: DAILY_BONUS,
      weekly: WEEKLY_QUESTS,
      weeklyBonus: WEEKLY_BONUS,
      story:  (STORY_QUESTS || []).map(q => ({
        id:    q.id,
        name:  q.name,
        desc:  q.desc || '',
        act:   q.act,
        chain: q.chain || null,
        steps: (q.steps || []).map(s => ({
          stepId: s.stepId,
          desc:   s.desc,
          type:   s.type,
          target: s.target,
          reward: s.reward || null,
        })),
        finalReward: q.finalReward || null,
      })),
      side:   (SIDE_QUESTS || []).map(q => ({
        id:       q.id,
        name:     q.name,
        category: q.category,
        desc:     q.desc || '',
        steps: (q.steps || []).map(s => ({
          stepId: s.stepId,
          desc:   s.desc,
          type:   s.type,
          target: s.target,
          reward: s.reward || null,
        })),
        finalReward: q.finalReward || null,
        npcId:    q.npcId || null,
      })),
    };

    return res.json({ monsters, npcs, zones, items, skills, crafting, dungeons, worldBosses, achievements, quests });
  } catch (err) {
    console.error('[Audit] getGameData:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  requireAdmin,
  getFlags, getPlayerHistory, resolveFlag, getSummary,
  getActivity, getPlayers, manualFlag, getBugs,
  getSkillStats, getItemStats, getGameData,
};

// ── GET /api/game/audit/bugs — Bug Radar auto-detection ──────────────────────
async function getBugs(req, res) {
  const db = admin.firestore();
  const now = Date.now();
  const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 min
  const FAILED_TX_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

  try {
    // 1. Stuck battles: active battles with no update > 30 min
    const battlesSnap = await db.collection('game_battles')
      .where('status', '==', 'active')
      .limit(50)
      .get();

    const stuckBattles = [];
    battlesSnap.forEach(doc => {
      const d = doc.data();
      const lastUpdate = d.updatedAt?.toMillis?.() || d.createdAt?.toMillis?.() || 0;
      const age = now - lastUpdate;
      if (age > STUCK_THRESHOLD_MS) {
        stuckBattles.push({
          battleId: doc.id,
          uid: d.uid || '?',
          minutesAgo: Math.floor(age / 60000),
          enemy: d.enemy?.name || '?',
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        });
      }
    });

    // 2. Failed transactions: processed=false older than 5 min
    const txSnap = await db.collection('game_transactions')
      .where('processed', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const failedTx = [];
    txSnap.forEach(doc => {
      const d = doc.data();
      const created = d.createdAt?.toMillis?.() || 0;
      const age = now - created;
      if (age > FAILED_TX_THRESHOLD_MS) {
        failedTx.push({
          txId: doc.id,
          uid: d.uid || '?',
          giftName: d.giftName || '?',
          goldEarned: d.goldEarned || 0,
          error: d.error || null,
          minutesAgo: Math.floor(age / 60000),
        });
      }
    });

    // 3. Recent auto-flags as error patterns
    const flagsSnap = await db.collection('game_flags')
      .where('resolved', '==', false)
      .orderBy('ts', 'desc')
      .limit(20)
      .get();

    const errorPatterns = [];
    const patternMap = {};
    flagsSnap.forEach(doc => {
      const d = doc.data();
      const type = (d.reason || 'unknown').replace(/\[.*?\]/g,'').trim().slice(0,40);
      if (!patternMap[type]) patternMap[type] = { type, count:0, lastSeen: null };
      patternMap[type].count++;
      if (!patternMap[type].lastSeen) patternMap[type].lastSeen = d.ts?.toDate?.()?.toISOString?.() || null;
    });
    Object.values(patternMap).forEach(p => { if (p.count >= 2) errorPatterns.push(p); });

    return res.json({
      stuckBattles,
      failedTx,
      errorPatterns,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Audit] getBugs:', err.message);
    return res.status(500).json({ error: 'Server error', stuckBattles:[], failedTx:[], errorPatterns:[] });
  }
}
