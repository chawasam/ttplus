// handlers/game/quest_engine.js — Story & Side Quest progression engine
const admin = require('firebase-admin');
const { STORY_QUESTS, getStoryQuest } = require('../../data/story_quests');
const { SIDE_QUESTS, getSideQuest, getAvailableSideQuests } = require('../../data/side_quests');
const { getItem, rollItem } = require('../../data/items');
const { addGold } = require('./currency');
const { emitToUser } = require('../../lib/emitter');

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

    // Build completed side quests
    const completedSideQuests = SIDE_QUESTS
      .filter(q => completedSideIds.includes(q.id))
      .map(q => ({ id: q.id, category: q.category, name: q.name, status: 'completed', rewards: q.rewards }));

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
        rewards:      q.rewards,
      }));

    return res.json({
      story:     storyQuests,
      sideActive:      activeSideQuests,
      sideCompleted:   completedSideQuests,
      sideAvailable:   availableSideQuests,
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

    // Process story quests
    for (const quest of STORY_QUESTS) {
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

    // Process side quests
    for (const quest of SIDE_QUESTS) {
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
            updates.xpToNext   = Math.floor((char.xpToNext || 100) * 1.5);
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

module.exports = { getQuestLog, acceptSideQuest, trackStoryStep };
