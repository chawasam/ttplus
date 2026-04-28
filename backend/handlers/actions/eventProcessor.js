// handlers/actions/eventProcessor.js — จับ TikTok events แล้ว fire actions
// เรียกจาก tiktok.js ทุกครั้งที่รับ event จาก TikTok Live

const admin = require('firebase-admin');

function db() { return admin.firestore(); }

// Cache events ต่อ VJ (refresh ทุก 60 วินาที)
const eventsCache = new Map(); // vjUid → { events, loadedAt }
const CACHE_TTL   = 60_000;

// Cooldown tracking: globalCooldown + userCooldown
const globalCooldowns = new Map(); // `${vjUid}_${actionId}` → lastFiredAt
const userCooldowns   = new Map(); // `${vjUid}_${actionId}_${tiktokId}` → lastFiredAt

async function getVjEvents(vjUid) {
  const cached = eventsCache.get(vjUid);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) return cached.events;

  // Lazy cleanup: ลบ entry ที่เก่า >10 นาที ป้องกัน Map โตขึ้นเรื่อยๆ สำหรับ VJ ที่หยุด stream แล้ว
  const STALE_TTL = CACHE_TTL * 10; // 10 นาที
  const now = Date.now();
  for (const [key, val] of eventsCache) {
    if (now - val.loadedAt >= STALE_TTL) eventsCache.delete(key);
  }

  const [evSnap, acSnap] = await Promise.all([
    db().collection('tt_events').where('uid', '==', vjUid).where('enabled', '==', true).get(),
    db().collection('tt_actions').where('uid', '==', vjUid).where('enabled', '==', true).get(),
  ]);

  const actions = {};
  acSnap.docs.forEach(d => { actions[d.id] = { id: d.id, ...d.data() }; });

  const events = evSnap.docs.map(d => ({ id: d.id, ...d.data(), _actions: actions }));
  eventsCache.set(vjUid, { events, loadedAt: Date.now() });
  return events;
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
  try {
    await db().collection('tt_action_queue').add({
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
      obsScene:         action.obsScene         || '',
      obsSceneDuration: action.obsSceneDuration ?? 0,
      obsSource:        action.obsSource        || '',
      obsSourceDuration: action.obsSourceDuration ?? 0,
      // Display
      displayDuration: action.displayDuration ?? 5,
      fadeInOut:       action.fadeInOut        ?? true,
      // Context
      username:   context.username  || '',
      giftname:   context.giftname  || '',
      // Queue state
      played:    false,
      queuedAt:  Date.now(),
    });
  } catch (err) {
    console.error('[EventProcessor] queueAction:', err.message);
  }
}

function fillTemplate(text, ctx) {
  return text
    .replace(/\{username\}/gi,  ctx.username  || '')
    .replace(/\{giftname\}/gi,  ctx.giftname  || '')
    .replace(/\{coins\}/gi,     String(ctx.coins    || ''))
    .replace(/\{likecount\}/gi, String(ctx.likeCount || ''));
}

// ── Main: process TikTok event → fire matching actions ─────────────────────
async function processEvent(vjUid, eventType, data) {
  if (!vjUid) return;

  try {
    const events = await getVjEvents(vjUid);
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

    // ── gift_min_coins priority: ยิงเฉพาะ threshold สูงสุดที่ match ──
    // ถ้ามีหลาย event เช่น ≥1, ≥10, ≥100 และ gift=150 → ยิงแค่ ≥100
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
      username:  data.uniqueId || data.nickname || '',
      giftname:  data.giftName || '',
      coins:     data.diamondCount || 0,
      likeCount: data.likeCount || 0,
    };

    for (const ev of prioritized) {
      const actionsMap = ev._actions || {};

      // Trigger all actions
      for (const actionId of (ev.actionIds || [])) {
        const action = actionsMap[actionId];
        if (!action) continue;
        if (!checkCooldown(vjUid, actionId, data.uniqueId, action)) continue;
        await queueAction(vjUid, action, context);
      }

      // Trigger one random action
      if (ev.randomActionIds?.length) {
        const pool   = ev.randomActionIds.filter(id => actionsMap[id]);
        if (pool.length) {
          const pick   = pool[Math.floor(Math.random() * pool.length)];
          const action = actionsMap[pick];
          if (action && checkCooldown(vjUid, pick, data.uniqueId, action)) {
            await queueAction(vjUid, action, context);
          }
        }
      }
    }
  } catch (err) {
    console.error('[EventProcessor] processEvent:', err.message);
  }
}

module.exports = { processEvent, invalidateCache };
