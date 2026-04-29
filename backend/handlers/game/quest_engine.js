// handlers/game/quest_engine.js — Story & Side Quest progression engine
const admin = require('firebase-admin');
const { STORY_QUESTS, getStoryQuest } = require('../../data/story_quests');
const { SIDE_QUESTS, getSideQuest, getAvailableSideQuests } = require('../../data/side_quests');
const { getItem, rollItem } = require('../../data/items');
const { addGold } = require('./currency');
const { emitToUser } = require('../../lib/emitter');

// ─── Quest Trigger Index (built once at module load) ─────────────
// ทำให้ trackStoryStep loop เฉพาะ quests ที่มี step ตรงกับ eventType
// แทนที่จะวน ALL quests ทุกครั้ง (ประหยัด CPU เมื่อ event เข้าถี่)
function buildTriggerIndex(quests) {
  const idx = {};
  for (const q of quests) {
    for (const step of (q.steps || [])) {
      if (!step.type) continue;
      if (!idx[step.type]) idx[step.type] = [];
      if (!idx[step.type].includes(q)) idx[step.type].push(q);
    }
  }
  return idx;
}

// สร้าง index ทันทีที่ module โหลด (ทำครั้งเดียวต่อ process)
const STORY_BY_TYPE = buildTriggerIndex(STORY_QUESTS);
const SIDE_BY_TYPE  = buildTriggerIndex(SIDE_QUESTS);

// ─── Firestore Collection ─────────────────────────────────────────
// game_quest_state/{uid}  →
// {
//   storyActive:    { 'SQ_000': { stepIndex: 0, stepProgress: 0 } },
//   storyCompleted: ['SQ_000'],
//   sideActive:     { 'SSQ_001': { stepIndex: 0, stepProgress: 0 } },
//   sideCompleted:  ['SSQ_001'],
//   initialized:    true,
// }
// ─────────────────────────────────────────────────────────────────

async function getOrInitState(uid, db) {
  const ref  = db.collection('game_quest_state').doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data();
    // Ensure all auto-start story quests that should be active are started
    return { ref, data: ensureAutoStart(data) };
  }

  // First time — initialize with SQ_000 (always auto-starts)
  const data = {
    storyActive:    { SQ_000: { stepIndex: 0, stepProgress: 0 } },
    storyCompleted: [],
    sideActive:     {},
    sideCompleted:  [],
    initialized:    true,
  };
  await ref.set(data);
  return { ref, data };
}

// Ensure all story quests whose prereqs are met are activated
function ensureAutoStart(data) {
  const updated = { ...data };
  updated.storyActive    = { ...data.storyActive };
  updated.storyCompleted = [...(data.storyCompleted || [])];

  for (const quest of STORY_QUESTS) {
    if (!quest.autoStart) continue;
    if (updated.storyCompleted.includes(quest.id)) continue;
    if (updated.storyActive[quest.id]) continue;
    // Check prereqs
    const prereqsMet = quest.prereqs.every(p => updated.storyCompleted.includes(p));
    if (prereqsMet) {
      updated.storyActive[quest.id] = { stepIndex: 0, stepProgress: 0 };
    }
  }
  return updated;
}

// ─── GET Quest Log (HTTP handler) ───────────────────────────────
async function getQuestLog(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();

  try {
    const { data } = await getOrInitState(uid, db);

    // Character level for side quest availability
    let charLevel = 1;
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (accountDoc.exists) {
      const charId = accountDoc.data().characterId;
      if (charId) {
        const charDoc = await db.collection('game_characters').doc(charId).get();
        if (charDoc.exists) charLevel = charDoc.data().level || 1;
      }
    }

    const completedSideIds = data.sideCompleted || [];
    const activeSideIds    = Object.keys(data.sideActive || {});

    // Load NPC affection scores for side quest gating
    let affectionMap = {};
    try {
      const affSnap = await db.collection('game_npc_affection').doc(uid).get();
      if (affSnap.exists) affectionMap = affSnap.data() || {};
    } catch (_) {}

    // Build story quest list
    const storyQuests = STORY_QUESTS.map(q => {
      const isCompleted = (data.storyCompleted || []).includes(q.id);
      const activeState = data.storyActive?.[q.id];
      const isActive    = !!activeState;
      const isLocked    = !isCompleted && !isActive;
      const currentStep = activeState ? q.steps[activeState.stepIndex] : null;
      const progress    = activeState?.stepProgress || 0;

      return {
        id:          q.id,
        act:         q.act,
        chapter:     q.chapter,
        name:        q.name,
        desc:        q.desc,
        status:      isCompleted ? 'completed' : isActive ? 'active' : 'locked',
        currentStep: isActive ? {
          ...currentStep,
          progress,
          stepIndex: activeState.stepIndex,
          totalSteps: q.steps.length,
        } : null,
        completionText: isCompleted ? q.completionText : null,
        rewards:     q.rewards,
      };
    });

    // Build active side quests
    const activeSideQuests = SIDE_QUESTS
      .filter(q => data.sideActive?.[q.id])
      .map(q => {
        const state    = data.sideActive[q.id];
        const step     = q.steps[state.stepIndex];
        return {
          id:          q.id,
          category:    q.category,
          name:        q.name,
          desc:        q.desc,
          status:      'active',
          giverNpc:    q.giverNpc,
          currentStep: {
            ...step,
            progress:   state.stepProgress,
            stepIndex:  state.stepIndex,
            totalSteps: q.steps.length,
          },
          rewards: q.rewards,
        };
      });

    // Build completed side quests (include completionText for journal feel)
    const completedSideQuests = SIDE_QUESTS
      .filter(q => completedSideIds.includes(q.id))
      .map(q => ({
        id:             q.id,
        category:       q.category,
        name:           q.name,
        status:         'completed',
        rewards:        q.rewards,
        completionText: q.completionText || null,
      }));

    // Build available (not yet accepted) side quests — pass affectionMap for personal quest gating
    const availableSideQuests = getAvailableSideQuests(completedSideIds, activeSideIds, charLevel, affectionMap)
      .map(q => ({
        id:           q.id,
        category:     q.category,
        name:         q.name,
        desc:         q.desc,
        status:       'available',
        giverNpc:     q.giverNpc,
        minAffection: q.minAffection || null,
        minLevel:     q.minLevel || 1,
        rewards:      q.rewards,
      }));

    // Build locked personal quests (affection not met yet) — show progress to encourage
    const lockedPersonal = SIDE_QUESTS.filter(q => {
      if (!q.minAffection) return false;
      if (completedSideIds.includes(q.id)) return false;
      if (activeSideIds.includes(q.id)) return false;
      // prereqs met but affection not yet enough
      if (q.prereqs.some(p => !completedSideIds.includes(p))) return false;
      if ((q.minLevel || 1) > charLevel) return false;
      const current = affectionMap[q.minAffection.npcId] || 0;
      return current < q.minAffection.amount; // locked only due to affection
    }).map(q => ({
      id:           q.id,
      category:     q.category,
      name:         q.name,
      desc:         q.desc,
      giverNpc:     q.giverNpc,
      minAffection: q.minAffection,
      currentAffection: affectionMap[q.minAffection.npcId] || 0,
      status:       'locked',
      rewards:      q.rewards,
    }));

    return res.json({
      story:           storyQuests,
      sideActive:      activeSideQuests,
      sideCompleted:   completedSideQuests,
      sideAvailable:   availableSideQuests,
      lockedPersonal,
    });
  } catch (err) {
    console.error('[QuestEngine] getQuestLog:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── ACCEPT Side Quest (HTTP handler) ───────────────────────────
async function acceptSideQuest(req, res) {
  const { questId } = req.body;
  const uid = req.user.uid;
  const db  = admin.firestore();

  const quest = getSideQuest(questId);
  if (!quest) return res.status(404).json({ error: 'ไม่พบ Quest' });

  try {
    const { ref, data } = await getOrInitState(uid, db);

    if ((data.sideCompleted || []).includes(questId)) {
      return res.status(400).json({ error: 'Quest นี้เสร็จแล้ว' });
    }
    if (data.sideActive?.[questId]) {
      return res.status(400).json({ error: 'Quest นี้รับแล้ว' });
    }

    // Check prereqs
    const completedSide = data.sideCompleted || [];
    const prereqsMet    = quest.prereqs.every(p => completedSide.includes(p));
    if (!prereqsMet) return res.status(400).json({ error: 'ยังไม่ผ่านเงื่อนไขเบื้องต้น' });

    // Check level
    let charLevel = 1;
    const accountDoc = await db.collection('game_accounts').doc(uid).get();
    if (accountDoc.exists) {
      const charId = accountDoc.data().characterId;
      if (charId) {
        const charDoc = await db.collection('game_characters').doc(charId).get();
        if (charDoc.exists) charLevel = charDoc.data().level || 1;
      }
    }
    if ((quest.minLevel || 1) > charLevel) {
      return res.status(400).json({ error: `ต้องการ Level ${quest.minLevel}` });
    }

    await ref.update({
      [`sideActive.${questId}`]: { stepIndex: 0, stepProgress: 0 },
    });

    return res.json({ success: true, questId, quest: { id: quest.id, name: quest.name } });
  } catch (err) {
    console.error('[QuestEngine] acceptSideQuest:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── TRACK STORY/SIDE QUEST STEP (internal — fire-and-forget) ───
// eventType: 'talk' | 'kill' | 'explore' | 'travel' | 'dungeon_enter' | 'dungeon_clear'
// data: { npcId?, monsterId?, zone?, dungeonId? }
async function trackStoryStep(uid, eventType, eventData = {}) {
  const db = admin.firestore();
  try {
    const { ref, data } = await getOrInitState(uid, db);

    let changed = false;
    const newState = {
      storyActive:    { ...(data.storyActive || {}) },
      storyCompleted: [...(data.storyCompleted || [])],
      sideActive:     { ...(data.sideActive || {}) },
      sideCompleted:  [...(data.sideCompleted || [])],
    };

    // Process story quests — ใช้ trigger index วนเฉพาะ quests ที่มี step ตรง eventType
    const storyToCheck = STORY_BY_TYPE[eventType] || [];
    for (const quest of storyToCheck) {
      const active = newState.storyActive[quest.id];
      if (!active) continue;
      if (newState.storyCompleted.includes(quest.id)) continue;

      const step = quest.steps[active.stepIndex];
      if (!step) continue;
      if (step.type !== eventType) continue;
      if (!stepMatches(step, eventType, eventData)) continue;

      // Increment progress
      active.stepProgress = (active.stepProgress || 0) + 1;
      changed = true;

      if (active.stepProgress >= step.count) {
        // Advance to next step
        const nextStepIdx = active.stepIndex + 1;
        if (nextStepIdx >= quest.steps.length) {
          // Quest complete! — emit ก่อน completeQuestInternal (เพื่อให้ reward แสดงหลัง)
          emitToUser(uid, 'quest_complete', {
            questId:   quest.id,
            questName: quest.name,
            type:      'story',
            rewards:   quest.rewards || {},
            nextQuest: STORY_QUESTS.find(q => q.prereqs?.includes(quest.id) && q.autoStart)?.name || null,
          });
          await completeQuestInternal(uid, quest, 'story', db);
          // Update in-memory state so auto-start sees it
          newState.storyCompleted.push(quest.id);
          delete newState.storyActive[quest.id];
          // Auto-start follow-up quests
          for (const next of STORY_QUESTS) {
            if (!next.autoStart) continue;
            if (newState.storyCompleted.includes(next.id)) continue;
            if (newState.storyActive[next.id]) continue;
            const prereqsMet = next.prereqs.every(p => newState.storyCompleted.includes(p));
            if (prereqsMet) {
              newState.storyActive[next.id] = { stepIndex: 0, stepProgress: 0 };
              // แจ้ง quest ใหม่เริ่ม
              emitToUser(uid, 'quest_started', {
                questId:   next.id,
                questName: next.name,
                type:      'story',
                firstStep: next.steps[0]?.hint || '',
              });
            }
          }
        } else {
          active.stepIndex    = nextStepIdx;
          active.stepProgress = 0;
          // แจ้ง step ถัดไป
          const nextStep = quest.steps[nextStepIdx];
          emitToUser(uid, 'quest_step', {
            questId:   quest.id,
            questName: quest.name,
            type:      'story',
            hint:      nextStep?.hint || '',
            stepIndex: nextStepIdx,
            stepTotal: quest.steps.length,
          });
        }
      } else {
        // Progress update (ยังไม่ครบ count)
        emitToUser(uid, 'quest_progress', {
          questId:   quest.id,
          questName: quest.name,
          type:      'story',
          hint:      step.hint || '',
          progress:  active.stepProgress,
          total:     step.count,
        });
      }
    }

    // Process side quests — ใช้ trigger index เช่นกัน
    const sideToCheck = SIDE_BY_TYPE[eventType] || [];
    for (const quest of sideToCheck) {
      const active = newState.sideActive[quest.id];
      if (!active) continue;
      if (newState.sideCompleted.includes(quest.id)) continue;

      const step = quest.steps[active.stepIndex];
      if (!step) continue;
      if (step.type !== eventType) continue;
      if (!stepMatches(step, eventType, eventData)) continue;

      active.stepProgress = (active.stepProgress || 0) + 1;
      changed = true;

      if (active.stepProgress >= step.count) {
        const nextStepIdx = active.stepIndex + 1;
        if (nextStepIdx >= quest.steps.length) {
          emitToUser(uid, 'quest_complete', {
            questId:   quest.id,
            questName: quest.name,
            type:      'side',
            rewards:   quest.rewards || {},
            nextQuest: null,
          });
          await completeQuestInternal(uid, quest, 'side', db);
          newState.sideCompleted.push(quest.id);
          delete newState.sideActive[quest.id];
        } else {
          active.stepIndex    = nextStepIdx;
          active.stepProgress = 0;
          const nextStep = quest.steps[nextStepIdx];
          emitToUser(uid, 'quest_step', {
            questId:   quest.id,
            questName: quest.name,
            type:      'side',
            hint:      nextStep?.hint || '',
            stepIndex: nextStepIdx,
            stepTotal: quest.steps.length,
          });
        }
      } else {
        emitToUser(uid, 'quest_progress', {
          questId:   quest.id,
          questName: quest.name,
          type:      'side',
          hint:      step.hint || '',
          progress:  active.stepProgress,
          total:     step.count,
        });
      }
    }

    if (changed) {
      await ref.set({
        storyActive:    newState.storyActive,
        storyCompleted: newState.storyCompleted,
        sideActive:     newState.sideActive,
        sideCompleted:  newState.sideCompleted,
        initialized:    true,
      }, { merge: false });
    }
  } catch (err) {
    console.error('[QuestEngine] trackStoryStep error:', err.message);
  }
}

// ─── Step Matching Logic ─────────────────────────────────────────
function stepMatches(step, eventType, eventData) {
  switch (eventType) {
    case 'talk':
      return step.target === eventData.npcId;

    case 'kill':
      // monsterId null = any monster, zone null = any zone
      const mOk = !step.monsterId || step.monsterId === eventData.monsterId;
      const zOk = !step.zone      || step.zone      === eventData.zone;
      return mOk && zOk;

    case 'explore':
      return !step.zone || step.zone === eventData.zone;

    case 'travel':
      return step.zone === eventData.zone;

    case 'dungeon_enter':
      return step.dungeonId === eventData.dungeonId;

    case 'dungeon_clear':
      return step.dungeonId === eventData.dungeonId;

    default:
      return false;
  }
}

// ─── Complete Quest (grant rewards, mark done) ───────────────────
async function completeQuestInternal(uid, quest, type, db) {
  try {
    const { xp = 0, gold = 0, items = [] } = quest.rewards || {};

    // Gold
    if (gold > 0) await addGold(uid, gold, `quest_${quest.id}`);

    // XP
    if (xp > 0) {
      const accountDoc = await db.collection('game_accounts').doc(uid).get();
      if (accountDoc.exists) {
        const charId = accountDoc.data().characterId;
        if (charId) {
          const charRef = db.collection('game_characters').doc(charId);
          const charDoc = await charRef.get();
          const char    = charDoc.data();
          const newXp   = (char.xp || 0) + xp;
          const updates = { xp: newXp };
          if (newXp >= (char.xpToNext || 100)) {
            updates.level      = (char.level || 1) + 1;
            updates.xp         = newXp - (char.xpToNext || 100);
            updates.xpToNext   = Math.floor(200 * Math.pow(updates.level, 1.9)); // lv50≈9เดือน, lv99≈2ปี
            updates.hpMax      = char.hpMax + 10;
            updates.hp         = char.hpMax + 10;
            updates.mpMax      = char.mpMax + 5;
            updates.mp         = char.mpMax + 5;
            updates.statPoints  = (char.statPoints  || 0) + 3;
            updates.skillPoints = (char.skillPoints || 0) + 1;
          }
          await charRef.update(updates);
        }
      }
    }

    // Items
    for (const itemId of items) {
      const instance = rollItem(itemId);
      if (instance) {
        await db.collection('game_inventory').doc(`${uid}_${instance.instanceId}`).set({ uid, ...instance });
      }
    }

    // Log completion
    console.log(`[QuestEngine] ✅ ${type} quest "${quest.id}" completed for ${uid}`);
  } catch (err) {
    console.error('[QuestEngine] completeQuestInternal:', err.message);
  }
}


// ═══════════════════════════════════════════════════════════════════
// MAIN QUEST ENGINE (Vorath / The Shattered Age)
// Firestore: game_main_quests/{uid}
// ═══════════════════════════════════════════════════════════════════
const { MAIN_QUESTS, getMainQuest, getAutoStartableQuests } = require('../../data/quests_main');
const { getLoreFragment } = require('../../data/lore');

// ─── Get or init main quest state ────────────────────────────────
async function getOrInitMainState(uid, db) {
  const ref  = db.collection('game_main_quests').doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data();
    return { ref, data: ensureMainAutoStart(data) };
  }

  // First time — initialize, auto-start MQ_101
  const data = {
    completedQuests: [],
    activeQuests:    { MQ_101: { stepIndex: 0, stepProgress: 0 } },
    choiceFlags:     { vorath_ending: null },
    loreFragments:   [],
    npcAffectionUnlocks: { lyra: false, sythara: false, corvin: false },
    currentAct:      1,
    initialized:     true,
  };
  await ref.set(data);
  return { ref, data };
}

function ensureMainAutoStart(data) {
  const updated = {
    ...data,
    activeQuests:    { ...(data.activeQuests || {}) },
    completedQuests: [...(data.completedQuests || [])],
    choiceFlags:     { vorath_ending: null, ...(data.choiceFlags || {}) },
    loreFragments:   [...(data.loreFragments || [])],
  };
  // Auto-start any quest whose prereqs are met
  const autoStartable = getAutoStartableQuests(updated.completedQuests);
  for (const q of autoStartable) {
    if (!updated.activeQuests[q.id]) {
      updated.activeQuests[q.id] = { stepIndex: 0, stepProgress: 0 };
    }
  }
  // Update currentAct
  const allActive = Object.keys(updated.activeQuests);
  if (allActive.length > 0) {
    const maxAct = Math.max(...allActive.map(id => getMainQuest(id)?.act || 1));
    updated.currentAct = maxAct;
  }
  return updated;
}

// ─── GET /api/game/quest-main ─────────────────────────────────────
async function getMainQuestLog(req, res) {
  const uid = req.user.uid;
  const db  = admin.firestore();
  try {
    const { data } = await getOrInitMainState(uid, db);

    // Build quest list with status
    const quests = MAIN_QUESTS.map(q => {
      let status = 'locked';
      if (data.completedQuests.includes(q.id)) status = 'completed';
      else if (data.activeQuests[q.id])         status = 'active';

      const activeState = data.activeQuests[q.id];
      let currentStep = null;
      if (status === 'active' && activeState) {
        const step = q.steps[activeState.stepIndex];
        if (step) {
          currentStep = {
            ...step,
            stepIndex:   activeState.stepIndex,
            totalSteps:  q.steps.length,
            progress:    activeState.stepProgress || 0,
          };
        }
      }

      return {
        id:            q.id,
        act:           q.act,
        actTitle:      q.actTitle,
        name:          q.name,
        nameEN:        q.nameEN,
        zone:          q.zone,
        desc:          q.desc,
        narrative:     q.narrative,
        rewards:       q.rewards,
        status,
        currentStep,
        completionText: status === 'completed' ? q.completionText : null,
      };
    });

    // Lore fragments collected
    const loreIds  = data.loreFragments || [];
    const loreList = loreIds.map(id => getLoreFragment(id)).filter(Boolean);

    return res.json({
      quests,
      currentAct:    data.currentAct || 1,
      choiceFlags:   data.choiceFlags || {},
      loreFragments: loreList,
    });
  } catch (err) {
    console.error('[MainQuest] getMainQuestLog:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── POST /api/game/quest-main/lore  { loreId } ──────────────────
async function collectLore(req, res) {
  const uid    = req.user.uid;
  const { loreId } = req.body;
  if (!loreId) return res.status(400).json({ error: 'loreId required' });

  const frag = getLoreFragment(Number(loreId));
  if (!frag) return res.status(404).json({ error: 'Lore fragment not found' });

  const db = admin.firestore();
  try {
    const { ref, data } = await getOrInitMainState(uid, db);
    if (data.loreFragments.includes(Number(loreId))) {
      return res.json({ success: true, alreadyCollected: true, fragment: frag });
    }

    const newFrags = [...data.loreFragments, Number(loreId)];
    const updates  = { loreFragments: newFrags };

    // ─── Completionist reward: collect all 10 base fragments ────────
    const LORE_COMPLETIONIST_COUNT = 10;
    const COMPLETIONIST_TITLE      = 'ผู้รู้ความจริง';
    const COMPLETIONIST_SECRET_ID  = 11;
    const COMPLETIONIST_XP         = 2000;

    let completionistBonus = null;
    const baseFragsCollected = newFrags.filter(id => id <= LORE_COMPLETIONIST_COUNT).length;
    const alreadyRewarded    = data.loreCompletionistRewarded || false;

    if (baseFragsCollected >= LORE_COMPLETIONIST_COUNT && !alreadyRewarded) {
      updates.loreCompletionistRewarded = true;
      // Auto-collect secret fragment #11
      if (!newFrags.includes(COMPLETIONIST_SECRET_ID)) {
        updates.loreFragments = [...newFrags, COMPLETIONIST_SECRET_ID];
      }

      // Grant XP + title on character
      try {
        const accountDoc = await db.collection('game_accounts').doc(uid).get();
        if (accountDoc.exists) {
          const charId = accountDoc.data().characterId;
          if (charId) {
            const charRef = db.collection('game_characters').doc(charId);
            const charDoc = await charRef.get();
            const char    = charDoc.data();
            const newXp   = (char.xp || 0) + COMPLETIONIST_XP;
            const charUpdates = {
              xp: newXp,
              unlockedTitles: admin.firestore.FieldValue.arrayUnion(COMPLETIONIST_TITLE),
            };
            if (newXp >= (char.xpToNext || 100)) {
              charUpdates.level    = (char.level || 1) + 1;
              charUpdates.xp       = newXp - (char.xpToNext || 100);
              charUpdates.xpToNext = Math.floor(200 * Math.pow(charUpdates.level, 1.9));
              charUpdates.hpMax    = char.hpMax + 10;
              charUpdates.hp       = char.hpMax + 10;
              charUpdates.mpMax    = char.mpMax + 5;
              charUpdates.mp       = char.mpMax + 5;
              charUpdates.statPoints  = (char.statPoints  || 0) + 3;
              charUpdates.skillPoints = (char.skillPoints || 0) + 1;
            }
            await charRef.update(charUpdates);
          }
        }
      } catch (e) {
        console.error('[Lore] completionist XP grant error:', e.message);
      }

      const secretFrag = getLoreFragment(COMPLETIONIST_SECRET_ID);
      completionistBonus = {
        xp: COMPLETIONIST_XP,
        title: COMPLETIONIST_TITLE,
        secretFragment: secretFrag,
      };
      emitToUser(uid, 'lore_completionist', completionistBonus);
      console.log(`[Lore] 🏆 Completionist reward granted to ${uid}`);
    }
    // ────────────────────────────────────────────────────────────────

    await ref.update(updates);

    // Try to advance any active main quest step that requires this lore
    await trackMainQuestStep_internal(uid, db, 'lore_collect', { loreId: Number(loreId) });

    emitToUser(uid, 'lore_found', { fragment: frag });
    return res.json({ success: true, fragment: frag, completionistBonus });
  } catch (err) {
    console.error('[MainQuest] collectLore:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── POST /api/game/quest-main/choice  { choiceKey, choice } ─────
async function makeQuestChoice(req, res) {
  const uid = req.user.uid;
  const { choiceKey, choice } = req.body;
  if (!choiceKey || !choice) return res.status(400).json({ error: 'choiceKey and choice required' });

  const db = admin.firestore();
  try {
    const { ref, data } = await getOrInitMainState(uid, db);
    const newFlags = { ...(data.choiceFlags || {}), [choiceKey]: choice };
    await ref.update({ choiceFlags: newFlags });

    // Advance any choice step
    await trackMainQuestStep_internal(uid, db, 'choice', { choiceKey });

    return res.json({ success: true, choiceKey, choice });
  } catch (err) {
    console.error('[MainQuest] makeQuestChoice:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── Internal: track a step progress in active main quests ───────
async function trackMainQuestStep_internal(uid, db, type, params = {}) {
  try {
    const { ref, data } = await getOrInitMainState(uid, db);
    const updates = { activeQuests: { ...data.activeQuests }, completedQuests: [...data.completedQuests] };
    let changed = false;

    for (const questId of Object.keys(updates.activeQuests)) {
      const quest     = getMainQuest(questId);
      if (!quest) continue;
      const state     = updates.activeQuests[questId];
      const stepDef   = quest.steps[state.stepIndex];
      if (!stepDef) continue;

      // Check if this event matches the current step
      let matches = false;
      if (type === 'talk'        && stepDef.type === 'talk'        && stepDef.npcId === params.npcId) matches = true;
      if (type === 'kill'        && stepDef.type === 'kill') {
        const zoneMatch   = !stepDef.zone   || stepDef.zone   === params.zone;
        const monsterMatch= !stepDef.monsterId || stepDef.monsterId === params.monsterId;
        if (zoneMatch && monsterMatch) matches = true;
      }
      if (type === 'explore'     && stepDef.type === 'explore'   && (!stepDef.zone || stepDef.zone === params.zone)) matches = true;
      if (type === 'travel'      && stepDef.type === 'travel'    && (!stepDef.zone || stepDef.zone === params.zone)) matches = true;
      if (type === 'dungeon_clear' && stepDef.type === 'dungeon_clear' && stepDef.dungeonId === params.dungeonId) matches = true;
      if (type === 'lore_collect'&& stepDef.type === 'lore_collect' && stepDef.loreId === params.loreId) matches = true;
      if (type === 'choice'      && stepDef.type === 'choice'    && stepDef.choiceKey === params.choiceKey) matches = true;

      if (!matches) continue;

      // Increment progress
      state.stepProgress = (state.stepProgress || 0) + 1;
      const required = stepDef.count || 1;

      if (state.stepProgress >= required) {
        // Move to next step
        state.stepIndex    = (state.stepIndex || 0) + 1;
        state.stepProgress = 0;

        if (state.stepIndex >= quest.steps.length) {
          // Quest complete
          delete updates.activeQuests[questId];
          updates.completedQuests.push(questId);
          changed = true;

          // Give rewards
          await completeMainQuestReward(uid, db, quest);

          // Auto-start next quest
          const newAutoStart = getAutoStartableQuests(updates.completedQuests);
          for (const nq of newAutoStart) {
            if (!updates.activeQuests[nq.id] && !updates.completedQuests.includes(nq.id)) {
              updates.activeQuests[nq.id] = { stepIndex: 0, stepProgress: 0 };
            }
          }

          emitToUser(uid, 'main_quest_complete', { questId, questName: quest.name });
        }
        changed = true;
      } else {
        changed = true;
      }
    }

    if (changed) {
      // Update currentAct
      const allActive = Object.keys(updates.activeQuests);
      if (allActive.length > 0) {
        updates.currentAct = Math.max(...allActive.map(id => getMainQuest(id)?.act || 1));
      }
      await ref.update(updates);
    }
  } catch (err) {
    console.error('[MainQuest] trackMainQuestStep_internal:', err.message);
  }
}

// ─── Public: called from other handlers (combat, explore, npc) ────
async function trackMainQuestStep(uid, type, params = {}) {
  const db = admin.firestore();
  await trackMainQuestStep_internal(uid, db, type, params);
}

// ─── Give main quest completion reward ────────────────────────────
async function completeMainQuestReward(uid, db, quest) {
  try {
    const { xp = 0, gold = 0 } = quest.rewards || {};
    if (gold > 0) await addGold(uid, gold, 'main_quest');
    if (xp > 0) {
      const accountDoc = await db.collection('game_accounts').doc(uid).get();
      if (accountDoc.exists) {
        const charId = accountDoc.data().characterId;
        if (charId) {
          const charRef = db.collection('game_characters').doc(charId);
          const charDoc = await charRef.get();
          if (charDoc.exists) {
            const char    = charDoc.data();
            const newXp   = (char.xp || 0) + xp;
            const updates = { xp: newXp };
            if (newXp >= (char.xpToNext || 100)) {
              updates.level      = (char.level || 1) + 1;
              updates.xp         = newXp - (char.xpToNext || 100);
              updates.xpToNext   = Math.floor(200 * Math.pow(updates.level, 1.9));
              updates.hpMax      = char.hpMax + 10;
              updates.hp         = char.hpMax + 10;
              updates.mpMax      = char.mpMax + 5;
              updates.mp         = char.mpMax + 5;
              updates.statPoints  = (char.statPoints  || 0) + 3;
              updates.skillPoints = (char.skillPoints || 0) + 1;
            }
            await charRef.update(updates);
          }
        }
      }
    }
    console.log(`[MainQuest] ✅ Quest "${quest.id}" completed for ${uid} (+${xp} XP, +${gold} gold)`);
  } catch (err) {
    console.error('[MainQuest] completeMainQuestReward:', err.message);
  }
}


module.exports = { getQuestLog, acceptSideQuest, trackStoryStep, getMainQuestLog, trackMainQuestStep, collectLore, makeQuestChoice };
