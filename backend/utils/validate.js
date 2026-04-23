// validate.js — Schema validation สำหรับ request body
// ป้องกัน injection และ unexpected data เข้า Firestore

const VALID_SKIN_IDS = [
  '', 'cyber', 'samurai', 'galaxy', 'matrix', 'volcanic',
  'sakura', 'pastel', 'ocean', 'starfall', 'candy',
  'snowfall', 'autumn', 'witch', 'music',
];

/**
 * Sanitize string — ลบ HTML tags และ trim
 */
function sanitizeStr(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')        // ลบ HTML tags (XSS)
    .replace(/[<>"'`]/g, '')        // ลบ special chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Validate และ sanitize settings object ก่อนบันทึก Firestore
 * คืนค่า object ที่ clean แล้ว หรือ throw error ถ้า invalid
 */
function validateSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Settings must be an object');
  }
  // ป้องกัน settings ขนาดใหญ่เกินไปเข้า Firestore
  if (JSON.stringify(raw).length > 50000) {
    throw new Error('Settings payload too large');
  }

  const allowed = {};

  // theme
  if (raw.theme !== undefined) {
    if (!['dark', 'light'].includes(raw.theme)) throw new Error('Invalid theme');
    allowed.theme = raw.theme;
  }

  // tiktokUsername
  if (raw.tiktokUsername !== undefined) {
    const u = sanitizeStr(raw.tiktokUsername, 50).replace(/[^a-zA-Z0-9._]/g, '');
    allowed.tiktokUsername = u;
  }

  // alertSound
  if (raw.alertSound !== undefined) {
    if (typeof raw.alertSound !== 'boolean') throw new Error('alertSound must be boolean');
    allowed.alertSound = raw.alertSound;
  }

  // alertVolume
  if (raw.alertVolume !== undefined) {
    const v = Number(raw.alertVolume);
    if (isNaN(v) || v < 0 || v > 100) throw new Error('alertVolume must be 0-100');
    allowed.alertVolume = Math.round(v);
  }

  // chatMaxItems
  if (raw.chatMaxItems !== undefined) {
    const v = Number(raw.chatMaxItems);
    if (isNaN(v) || v < 5 || v > 200) throw new Error('chatMaxItems must be 5-200');
    allowed.chatMaxItems = Math.round(v);
  }

  // goalTarget
  if (raw.goalTarget !== undefined) {
    const v = Number(raw.goalTarget);
    if (isNaN(v) || v < 1 || v > 1000000) throw new Error('goalTarget must be 1-1,000,000');
    allowed.goalTarget = Math.round(v);
  }

  // goalType
  if (raw.goalType !== undefined) {
    if (!['gift', 'diamond', 'follower'].includes(raw.goalType)) throw new Error('Invalid goalType');
    allowed.goalType = raw.goalType;
  }

  // ===== TTS settings =====
  if (raw.ttsEnabled !== undefined) {
    if (typeof raw.ttsEnabled !== 'boolean') throw new Error('ttsEnabled must be boolean');
    allowed.ttsEnabled = raw.ttsEnabled;
  }
  if (raw.ttsReadChat !== undefined) {
    if (typeof raw.ttsReadChat !== 'boolean') throw new Error('ttsReadChat must be boolean');
    allowed.ttsReadChat = raw.ttsReadChat;
  }
  if (raw.ttsReadGift !== undefined) {
    if (typeof raw.ttsReadGift !== 'boolean') throw new Error('ttsReadGift must be boolean');
    allowed.ttsReadGift = raw.ttsReadGift;
  }
  if (raw.ttsReadFollow !== undefined) {
    if (typeof raw.ttsReadFollow !== 'boolean') throw new Error('ttsReadFollow must be boolean');
    allowed.ttsReadFollow = raw.ttsReadFollow;
  }
  if (raw.ttsRate !== undefined) {
    const v = Number(raw.ttsRate);
    if (isNaN(v) || v < 0.5 || v > 2.0) throw new Error('ttsRate must be 0.5-2.0');
    allowed.ttsRate = Math.round(v * 10) / 10;
  }
  if (raw.ttsPitch !== undefined) {
    const v = Number(raw.ttsPitch);
    if (isNaN(v) || v < 0.0 || v > 2.0) throw new Error('ttsPitch must be 0.0-2.0');
    allowed.ttsPitch = Math.round(v * 10) / 10;
  }
  if (raw.ttsVolume !== undefined) {
    const v = Number(raw.ttsVolume);
    if (isNaN(v) || v < 0 || v > 1) throw new Error('ttsVolume must be 0.0-1.0');
    allowed.ttsVolume = Math.round(v * 100) / 100;
  }
  if (raw.ttsVoice !== undefined) {
    allowed.ttsVoice = sanitizeStr(String(raw.ttsVoice || ''), 100);
  }

  // ===== TTS Engine / Voice settings (Firestore-synced, API key stays in localStorage) =====
  const VALID_ENGINE_IDS = ['web', 'google', 'gemini31', 'gemini25'];
  if (raw.ttsGoogleVoice !== undefined) {
    allowed.ttsGoogleVoice = sanitizeStr(String(raw.ttsGoogleVoice || ''), 100);
  }
  if (raw.ttsGeminiVoice !== undefined) {
    allowed.ttsGeminiVoice = sanitizeStr(String(raw.ttsGeminiVoice || ''), 50);
  }
  if (raw.ttsGeminiPersona !== undefined) {
    allowed.ttsGeminiPersona = sanitizeStr(String(raw.ttsGeminiPersona || ''), 300);
  }
  if (raw.ttsGeminiShuffle !== undefined) {
    if (typeof raw.ttsGeminiShuffle !== 'boolean') throw new Error('ttsGeminiShuffle must be boolean');
    allowed.ttsGeminiShuffle = raw.ttsGeminiShuffle;
  }
  if (raw.ttsGemini25Linked !== undefined) {
    if (typeof raw.ttsGemini25Linked !== 'boolean') throw new Error('ttsGemini25Linked must be boolean');
    allowed.ttsGemini25Linked = raw.ttsGemini25Linked;
  }
  if (raw.ttsGemini25Voice !== undefined) {
    allowed.ttsGemini25Voice = sanitizeStr(String(raw.ttsGemini25Voice || ''), 50);
  }
  if (raw.ttsGemini25Persona !== undefined) {
    allowed.ttsGemini25Persona = sanitizeStr(String(raw.ttsGemini25Persona || ''), 300);
  }
  if (raw.ttsGemini25Shuffle !== undefined) {
    if (typeof raw.ttsGemini25Shuffle !== 'boolean') throw new Error('ttsGemini25Shuffle must be boolean');
    allowed.ttsGemini25Shuffle = raw.ttsGemini25Shuffle;
  }
  if (raw.ttsEnabledEngines !== undefined) {
    if (!Array.isArray(raw.ttsEnabledEngines)) throw new Error('ttsEnabledEngines must be array');
    const engines = raw.ttsEnabledEngines.filter(e => VALID_ENGINE_IDS.includes(e));
    allowed.ttsEnabledEngines = engines.length > 0 ? engines : ['web'];
  }
  if (raw.ttsEngineOrder !== undefined) {
    if (!Array.isArray(raw.ttsEngineOrder)) throw new Error('ttsEngineOrder must be array');
    allowed.ttsEngineOrder = raw.ttsEngineOrder.filter(e => VALID_ENGINE_IDS.includes(e));
  }

  // widgetStyles — ค่า appearance ของแต่ละ widget
  if (raw.widgetStyles !== undefined) {
    if (typeof raw.widgetStyles !== 'object' || Array.isArray(raw.widgetStyles)) {
      throw new Error('widgetStyles must be object');
    }
    const widgetKeys = ['alert', 'chat', 'pinchat', 'pinprofile', 'leaderboard', 'goal', 'viewers', 'coinjar'];
    const cleanStyles = {};
    const hexRe = /^[0-9a-f]{6}$/i;

    for (const key of widgetKeys) {
      const s = raw.widgetStyles[key];
      if (!s || typeof s !== 'object') continue;
      const clean = {};

      // bg — hex 6 chars (no #)
      if (s.bg !== undefined) {
        if (!hexRe.test(s.bg)) throw new Error(`widgetStyles.${key}.bg must be 6-char hex`);
        clean.bg = s.bg.toLowerCase();
      }
      // bga — alpha 0-100
      if (s.bga !== undefined) {
        const v = Number(s.bga);
        if (isNaN(v) || v < 0 || v > 100) throw new Error(`widgetStyles.${key}.bga must be 0-100`);
        clean.bga = Math.round(v);
      }
      // tc — text color hex
      if (s.tc !== undefined) {
        if (!hexRe.test(s.tc)) throw new Error(`widgetStyles.${key}.tc must be 6-char hex`);
        clean.tc = s.tc.toLowerCase();
      }
      // ac — accent color hex
      if (s.ac !== undefined) {
        if (!hexRe.test(s.ac)) throw new Error(`widgetStyles.${key}.ac must be 6-char hex`);
        clean.ac = s.ac.toLowerCase();
      }
      // fs — font size 10-28
      if (s.fs !== undefined) {
        const v = Number(s.fs);
        if (isNaN(v) || v < 10 || v > 28) throw new Error(`widgetStyles.${key}.fs must be 10-28`);
        clean.fs = Math.round(v);
      }
      // br — border radius 0-48
      if (s.br !== undefined) {
        const v = Number(s.br);
        if (isNaN(v) || v < 0 || v > 48) throw new Error(`widgetStyles.${key}.br must be 0-48`);
        clean.br = Math.round(v);
      }
      // dir — chat direction (chat widget only)
      if (s.dir !== undefined) {
        if (!['up', 'down'].includes(s.dir)) throw new Error(`widgetStyles.${key}.dir must be 'up' or 'down'`);
        clean.dir = s.dir;
      }
      // max — max messages 3-50 (chat widget only)
      if (s.max !== undefined) {
        const v = Number(s.max);
        if (isNaN(v) || v < 3 || v > 50) throw new Error(`widgetStyles.${key}.max must be 3-50`);
        clean.max = Math.round(v);
      }
      // skin — chat + pinchat overlay skin
      if (s.skin !== undefined && (key === 'chat' || key === 'pinchat')) {
        if (!VALID_SKIN_IDS.includes(s.skin)) throw new Error(`widgetStyles.${key}.skin invalid`);
        clean.skin = s.skin;
      }
      // bw — bubble width % 30-100 (chat เท่านั้น)
      if (s.bw !== undefined && key === 'chat') {
        const v = Number(s.bw);
        if (isNaN(v) || v < 30 || v > 100) throw new Error(`widgetStyles.${key}.bw must be 30-100`);
        clean.bw = Math.round(v);
      }
      // layout — bubble layout (chat เท่านั้น)
      if (s.layout !== undefined && key === 'chat') {
        if (!['inline','stack'].includes(s.layout)) throw new Error(`widgetStyles.${key}.layout must be inline or stack`);
        clean.layout = s.layout;
      }

      // ===== coinjar-specific fields =====
      // jx — jar x offset (-200 to 200)
      if (s.jx !== undefined) {
        const v = Number(s.jx);
        if (isNaN(v) || v < -200 || v > 200) throw new Error(`widgetStyles.${key}.jx must be -200 to 200`);
        clean.jx = Math.round(v);
      }
      // gs — gift scale 50-300
      if (s.gs !== undefined) {
        const v = Number(s.gs);
        if (isNaN(v) || v < 50 || v > 300) throw new Error(`widgetStyles.${key}.gs must be 50-300`);
        clean.gs = Math.round(v);
      }
      // mi — max items 10-600
      if (s.mi !== undefined) {
        const v = Number(s.mi);
        if (isNaN(v) || v < 10 || v > 600) throw new Error(`widgetStyles.${key}.mi must be 10-600`);
        clean.mi = Math.round(v);
      }
      cleanStyles[key] = clean;
    }
    allowed.widgetStyles = cleanStyles;
  }

  // widgets — nested object, validate แต่ละ key
  if (raw.widgets !== undefined) {
    if (typeof raw.widgets !== 'object') throw new Error('widgets must be object');
    const widgetKeys = ['alert', 'chat', 'leaderboard', 'goal', 'viewers', 'coinjar'];
    const cleanWidgets = {};
    for (const key of widgetKeys) {
      if (raw.widgets[key]) {
        const w = raw.widgets[key];
        cleanWidgets[key] = {};
        if (typeof w.enabled === 'boolean') cleanWidgets[key].enabled = w.enabled;
        if (w.maxItems) {
          const m = Number(w.maxItems);
          if (!isNaN(m) && m > 0 && m <= 50) cleanWidgets[key].maxItems = Math.round(m);
        }
        if (w.duration) {
          const d = Number(w.duration);
          if (!isNaN(d) && d >= 1 && d <= 30) cleanWidgets[key].duration = Math.round(d);
        }
        if (typeof w.showAvatar === 'boolean') cleanWidgets[key].showAvatar = w.showAvatar;
        if (typeof w.showPercentage === 'boolean') cleanWidgets[key].showPercentage = w.showPercentage;
        if (['bottom-right','bottom-left','top-right','top-left'].includes(w.position)) {
          cleanWidgets[key].position = w.position;
        }
      }
    }
    allowed.widgets = cleanWidgets;
  }

  return allowed;
}

/**
 * Sanitize TikTok event data ก่อนส่งไปยัง client
 * ป้องกัน XSS จาก nickname/comment ที่อาจมี HTML
 */
function sanitizeTikTokEvent(data) {
  return {
    ...data,
    uniqueId:   sanitizeStr(data.uniqueId, 100),
    nickname:   sanitizeStr(data.nickname, 100),
    comment:    data.comment ? sanitizeStr(data.comment, 500) : undefined,
    giftName:   data.giftName ? sanitizeStr(data.giftName, 100) : undefined,
    // URL ของรูป — เช็คว่าเป็น https จาก TikTok CDN เท่านั้น
    profilePictureUrl: isValidTikTokCdnUrl(data.profilePictureUrl) ? data.profilePictureUrl : '',
    giftPictureUrl:    isValidTikTokCdnUrl(data.giftPictureUrl)    ? data.giftPictureUrl    : '',
  };
}

function isValidTikTokCdnUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (
      u.hostname.endsWith('tiktokcdn.com') ||
      u.hostname.endsWith('tiktokcdn-us.com') ||
      u.hostname.endsWith('tiktok.com')
    );
  } catch { return false; }
}

module.exports = { sanitizeStr, validateSettings, sanitizeTikTokEvent };
