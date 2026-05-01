// handlers/actions/eventProcessor.js — จับ TikTok events แล้ว fire actions
// เรียกจาก tiktok.js ทุกครั้งที่รับ event จาก TikTok Live

const admin = require('firebase-admin');
const { emitToUser, emitToWidgetRoom } = require('../../lib/emitter');
const { trackRead } = require('../../utils/readTracker');

function db() { return admin.firestore(); }

// Cache events ต่อ VJ (refresh ทุก 60 วินาที)
const eventsCache = new Map(); // vjUid → { events, loadedAt }
const CACHE_TTL   = 60_000;


// Cooldown tracking: globalCooldown + userCooldown
const globalCooldowns = new Map(); // `${vjUid}_${actionId}` → lastFiredAt
const userCooldowns   = new Map(); // `${vjUid}_${actionId}_${tiktokId}` → lastFiredAt

// ล้าง cooldowns ของ VJ ที่หยุด stream แล้ว (เรียกจาก tiktok.js เมื่อ manual disconnect)
function clearVjCooldowns(vjUid) {
  const prefix = `${vjUid}_`;
  for (const k of globalCooldowns.keys()) {
    if (k.startsWith(prefix)) globalCooldowns.delete(k);
  }
  for (const k of userCooldowns.keys()) {
    if (k.startsWith(prefix)) userCooldowns.delete(k);
  }
}

// Time-based cleanup: ล้าง cooldown entries ที่หมดอายุแน่ ๆ แล้ว
// max cooldown ที่รองรับคือ 600 วิ → entries เก่ากว่า 600 วิ safe to delete
const MAX_COOLDOWN_SEC = 600;
setInterval(() => {
  const cutoff = Date.now() - MAX_COOLDOWN_SEC * 1000;
  for (const [k, v] of globalCooldowns.entries()) {
    if (v < cutoff) globalCooldowns.delete(k);
  }
  for (const [k, v] of userCooldowns.entries()) {
    if (v < cutoff) userCooldowns.delete(k);
  }
}, 5 * 60 * 1000); // ทำทุก 5 นาที

async function getVjEvents(vjUid) {
  const cached = eventsCache.get(vjUid);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
    return { events: cached.events, actionsEnabled: cached.actionsEnabled };
  }

  // Lazy cleanup: ลบ entry ที่เก่า >10 นาที ป้องกัน Map โตขึ้นเรื่อยๆ สำหรับ VJ ที่หยุด stream แล้ว
  const STALE_TTL = CACHE_TTL * 10; // 10 นาที
  const now = Date.now();
  for (const [key, val] of eventsCache) {
    if (now - val.loadedAt >= STALE_TTL) eventsCache.delete(key);
  }

  const [evSnap, acSnap, settingsDoc] = await Promise.all([
    db().collection('tt_events').where('uid', '==', vjUid).where('enabled', '==', true).get(),
    db().collection('tt_actions').where('uid', '==', vjUid).where('enabled', '==', true).get(),
    db().collection('user_settings').doc(vjUid).get(),
  ]);
  trackRead('eventProcessor.getVjEvents', evSnap.size + acSnap.size + 1);

  const actions = {};
  acSnap.docs.forEach(d => { actions[d.id] = { id: d.id, ...d.data() }; });

  const events = evSnap.docs.map(d => ({ id: d.id, ...d.data(), _actions: actions }));
  const actionsEnabled = settingsDoc.exists ? (settingsDoc.data().actionsEnabled ?? true) : true;

  eventsCache.set(vjUid, { events, actionsEnabled, loadedAt: Date.now() });
  return { events, actionsEnabled };
}

// Invalidate cache เมื่อ VJ แก้ actions/events
function invalidateCache(vjUid) {
  eventsCache.delete(vjUid);
}

// ── Check cooldown ──────────────────────────────────────────────────────────
function checkCooldown(vjUid, actionId, tiktokId, action) {
  const now = Date.now();
  const gKey = `${vjUid}_${actionId}`;
  const uKey = `${vjUid}_${actionId}_${tiktokId}`;

  if (action.globalCooldown > 0) {
    const last = globalCooldowns.get(gKey) || 0;
    if (now - last < action.globalCooldown * 1000) return false;
  }
  if (action.userCooldown > 0) {
    const last = userCooldowns.get(uKey) || 0;
    if (now - last < action.userCooldown * 1000) return false;
  }

  globalCooldowns.set(gKey, now);
  userCooldowns.set(uKey, now);
  return true;
}

// ── Who can trigger check ───────────────────────────────────────────────────
function canTrigger(event, data) {
  const who = event.whoCanTrigger || 'everyone';
  if (who === 'everyone') return true;
  if (who === 'follower'    && data.followRole >= 1) return true;
  if (who === 'subscriber'  && data.isSubscriber)   return true;
  if (who === 'moderator'   && data.isModerator)    return true;
  if (who === 'top_gifter'  && data.isTopGifter)    return true;
  if (who === 'specific_user' && data.uniqueId === event.specificUser) return true;
  return false;
}

// ── Queue action to Firestore (overlay widget จะ poll ดึงไป) ───────────────
async function queueAction(vjUid, action, context) {
  const OBS_TYPES = ['switch_obs_scene', 'activate_obs_source'];
  const hasObs = action.types?.some(t => OBS_TYPES.includes(t));
  const hasTts = action.types?.includes('read_tts') && !!action.ttsText;

  // ── Direct dashboard path: ส่งผ่าน Socket.IO ตรงไปยัง dashboard ของ user ──
  // dashboard/actions page รับแล้ว:
  //   - ยิง OBS WebSocket (ถ้ามี OBS types)
  //   - เล่น TTS ผ่าน browser ของ user โดยตรง (ได้ยินผ่านลำโพง ไม่ต้องผ่าน OBS widget)
  // emit เมื่อ hasObs หรือ hasTts — คืนค่า true ถ้า dashboard connected
  let obsHandledBySocket = false;
  if (hasObs || hasTts) {
    obsHandledBySocket = emitToUser(vjUid, 'obs_action', {
      actionId:        action.id            || '',
      types:           action.types,
      obsScene:        action.obsScene        || '',
      obsSceneReturn:  action.obsSceneReturn  ?? false,
      obsSource:       action.obsSource       || '',
      obsSourceReturn: action.obsSourceReturn ?? false,
      displayDuration: action.displayDuration ?? 5,
      name:            action.name || '',
      // TTS — เล่นใน browser ของ user โดยตรง (actions page)
      ttsText:  fillTemplate(action.ttsText || '', context),
      volume:   action.volume ?? 100,
    });
  }

  // ── Firestore queue: overlay widget ใช้สำหรับ visual/audio เสมอ
  // obsHandledBySocket = true  → overlay จะข้าม OBS commands (dashboard ยิงแล้วผ่าน socket)
  // obsHandledBySocket = false → overlay เป็น fallback ยิง OBS แทน (กรณี dashboard ไม่ได้เปิด)
  try {
    const item = {
      vjUid,
      screen:    action.overlayScreen || 1,
      actionId:  action.id,
      types:     action.types,
      // Media
      pictureUrl:  action.pictureUrl  || '',
      videoUrl:    action.videoUrl    || '',
      audioUrl:    action.audioUrl    || '',
      // Alert: แทนที่ template variables
      alertText:  fillTemplate(action.alertText || '', context),
      // TTS
      ttsText:    fillTemplate(action.ttsText   || '', context),
      // OBS
      obsScene:          action.obsScene        || '',
      obsSceneReturn:    action.obsSceneReturn  ?? false,
      obsSource:         action.obsSource       || '',
      obsSourceReturn:   action.obsSourceReturn ?? false,
      obsHandledBySocket,   // overlay เช็คค่านี้ก่อนยิง OBS
      // Display
      displayDuration: action.displayDuration ?? 5,
      fadeInOut:       action.fadeInOut        ?? true,
      volume:          action.volume           ?? 100,
      // Context
      username:   context.username  || '',
      giftname:   context.giftname  || '',
      // Queue state — ไม่ต้องเก็บ played เพราะ doc ถูกลบทันทีหลัง overlay อ่าน
      queuedAt:  Date.now(),
    };

    await db().collection('tt_action_queue').add(item);

    // ── Socket.IO push: ส่ง action ตรงไปหา widget ทันที (~50ms) ──
    // widget รับแล้วแสดงเลยโดยไม่ต้องรอ poll รอบถัดไป
    // ถ้า socket ไม่ได้ connected (OBS ปิด / หลุด) → Firestore เป็น fallback
    emitToWidgetRoom(vjUid, 'new_action', item);

  } catch (err) {
    console.error('[EventProcessor] queueAction:', err.message);
  }
}

function fillTemplate(text, ctx) {
  return text
    .replace(/\{username\}/gi,  ctx.username  ?? '')
    .replace(/\{giftname\}/gi,  ctx.giftname  ?? '')
    .replace(/\{coins\}/gi,     String(ctx.coins    ?? ''))
    .replace(/\{likecount\}/gi, String(ctx.likeCount ?? ''));
}

// ── Main: process TikTok event → fire matching actions ─────────────────────
async function processEvent(vjUid, eventType, data) {
  if (!vjUid) return;



  try {
    const { events, actionsEnabled } = await getVjEvents(vjUid);
    // ── Master switch: ถ้า VJ ปิดระบบ Actions → ไม่ทำอะไรเลย ──
    if (!actionsEnabled) return;
    if (!events.length) return;

    // หา events ที่ตรงกับ trigger
    const matching = events.filter(ev => {
      if (!canTrigger(ev, data)) return false;

      switch (ev.trigger) {
        case 'join':           return eventType === 'join';
        case 'first_activity': return eventType === 'first_activity';
        case 'share':          return eventType === 'share';
        case 'follow':         return eventType === 'follow';
        case 'subscribe':      return eventType === 'subscribe';
        case 'chat':           return eventType === 'chat';
        case 'command':
          return eventType === 'chat' &&
            data.comment?.trim().toLowerCase().startsWith((ev.keyword || '').toLowerCase());
        case 'likes':
          return eventType === 'like' && (data.likeCount || 0) >= (ev.likesCount || 1);
        case 'gift_min_coins':
          return eventType === 'gift' && (data.diamondCount || 0) >= (ev.minCoins || 1);
        case 'specific_gift':
          return eventType === 'gift' &&
            data.giftName?.toLowerCase() === (ev.specificGiftName || '').toLowerCase();
        case 'subscriber_emote':
          return eventType === 'chat' && data.isSubscriberEmote;
        case 'fan_club_sticker':
          return eventType === 'chat' && data.isFanClubSticker;
        case 'tiktok_shop':
          return eventType === 'shop_purchase';
        default: return false;
      }
    });

    if (!matching.length) return;

    // ── gift_min_coins priority ──────────────────────────────────────────────
    // 1. ถ้ามี specific_gift match → specific_gift ชนะ, ข้าม gift_min_coins ทั้งหมด
    // 2. ถ้าไม่มี specific_gift → ยิงเฉพาะ gift_min_coins threshold สูงสุดที่ match อันเดียว
    //    เช่น ≥1, ≥10, ≥100 และ gift=150 → ยิงแค่ ≥100
    const giftCoinEvents    = matching.filter(ev => ev.trigger === 'gift_min_coins');
    const otherEvents       = matching.filter(ev => ev.trigger !== 'gift_min_coins');
    const specificGiftHit   = otherEvents.some(ev => ev.trigger === 'specific_gift');
    const prioritized = [
      ...otherEvents,
      // ถ้า specific_gift match อยู่แล้ว → ไม่ยิง gift_min_coins เลย
      ...(!specificGiftHit && giftCoinEvents.length > 0
        ? [giftCoinEvents.reduce((best, ev) =>
            (ev.minCoins || 0) > (best.minCoins || 0) ? ev : best
          )]
        : []),
    ];

    const context = {
      username:  data.uniqueId || data.nickname || '',
      giftname:  data.giftName || '',
      coins:     data.diamondCount || 0,
      likeCount: data.likeCount || 0,
    };

    // firedActionIds: dedup ข้าม events ทั้งหมด
    // ป้องกันกรณีที่ action เดียวกันอยู่ใน 2 events ที่ match พร้อมกัน
    // เช่น specific_gift + gift_min_coins ชน → ยิง action เดิม 2 ครั้ง
    const firedActionIds = new Set();
    const queues = []; // รวม promises ของ queueAction ทั้งหมด — fire พร้อมกันใน Promise.all

    for (const ev of prioritized) {
      const actionsMap = ev._actions || {};

      // Trigger all actions
      for (const actionId of [...new Set(ev.actionIds || [])]) {
        if (firedActionIds.has(actionId)) continue;
        const action = actionsMap[actionId];
        if (!action) continue;
        if (!checkCooldown(vjUid, actionId, data.uniqueId, action)) continue;
        firedActionIds.add(actionId);
        queues.push(queueAction(vjUid, action, context));
      }

      // Trigger one random action
      if (ev.randomActionIds?.length) {
        const pool = ev.randomActionIds.filter(id => actionsMap[id] && !firedActionIds.has(id));
        if (pool.length) {
          const pick   = pool[Math.floor(Math.random() * pool.length)];
          const action = actionsMap[pick];
          if (action && checkCooldown(vjUid, pick, data.uniqueId, action)) {
            firedActionIds.add(pick);
            queues.push(queueAction(vjUid, action, context));
          }
        }
      }
    }

    // Fire ทุก action พร้อมกัน แทนที่จะรอทีละอัน
    await Promise.all(queues);
  } catch (err) {
    console.error('[EventProcessor] processEvent:', err.message);
  }
}

// ── Simulate: fire event + return list of matched events/actions (for test UI) ──
async function simulateEventWithResult(vjUid, eventType, data) {
  if (!vjUid) return { matched: [] };
  // Simulate ยังใช้ได้แม้ระบบจะปิด — ช่วย debug โดยไม่ต้อง toggle กลับมาเปิด
  try {
    const { events } = await getVjEvents(vjUid);
    if (!events.length) return { matched: [] };

    const matching = events.filter(ev => {
      if (!canTrigger(ev, data)) return false;
      switch (ev.trigger) {
        case 'join':           return eventType === 'join';
        case 'first_activity': return eventType === 'first_activity';
        case 'share':          return eventType === 'share';
        case 'follow':         return eventType === 'follow';
        case 'subscribe':      return eventType === 'subscribe';
        case 'chat':           return eventType === 'chat';
        case 'command':
          return eventType === 'chat' &&
            data.comment?.trim().toLowerCase().startsWith((ev.keyword || '').toLowerCase());
        case 'likes':
          return eventType === 'like' && (data.likeCount || 0) >= (ev.likesCount || 1);
        case 'gift_min_coins':
          return eventType === 'gift' && (data.diamondCount || 0) >= (ev.minCoins || 1);
        case 'specific_gift':
          return eventType === 'gift' &&
            data.giftName?.toLowerCase() === (ev.specificGiftName || '').toLowerCase();
        case 'subscriber_emote': return eventType === 'chat' && data.isSubscriberEmote;
        case 'fan_club_sticker': return eventType === 'chat' && data.isFanClubSticker;
        case 'tiktok_shop':      return eventType === 'shop_purchase';
        default: return false;
      }
    });

    // gift_min_coins priority
    const giftCoinEvents = matching.filter(ev => ev.trigger === 'gift_min_coins');
    const otherEvents    = matching.filter(ev => ev.trigger !== 'gift_min_coins');
    const prioritized = [
      ...otherEvents,
      ...(giftCoinEvents.length > 0
        ? [giftCoinEvents.reduce((best, ev) =>
            (ev.minCoins || 0) > (best.minCoins || 0) ? ev : best
          )]
        : []),
    ];

    const context = {
      username:  data.uniqueId || data.nickname || 'ทดสอบ',
      giftname:  data.giftName || '',
      coins:     data.diamondCount || 0,
      likeCount: data.likeCount || 0,
    };

    // สร้าง summary ก่อน fire จริง
    const matched = prioritized.map(ev => {
      const actionsMap = ev._actions || {};
      const firedActions = (ev.actionIds || [])
        .map(id => actionsMap[id])
        .filter(Boolean)
        .map(a => ({ id: a.id, name: a.name }));
      const randomPool = (ev.randomActionIds || [])
        .map(id => actionsMap[id])
        .filter(Boolean)
        .map(a => ({ id: a.id, name: a.name }));
      return {
        eventId:    ev.id,
        trigger:    ev.trigger,
        actions:    firedActions,
        randomPool: randomPool,
      };
    });

    // fire จริง
    await processEvent(vjUid, eventType, data);

    return { matched };
  } catch (err) {
    console.error('[EventProcessor] simulateEventWithResult:', err.message);
    return { matched: [], error: err.message };
  }
}

module.exports = { processEvent, simulateEventWithResult, invalidateCache, clearVjCooldowns, fillTemplate };
