// validate.js — Schema validation สำหรับ request body
// ป้องกัน injection และ unexpected data เข้า Firestore

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

  // widgetStyles — ค่า appearance ของแต่ละ widget
  if (raw.widgetStyles !== undefined) {
    if (typeof raw.widgetStyles !== 'object' || Array.isArray(raw.widgetStyles)) {
      throw new Error('widgetStyles must be object');
    }
    const widgetKeys = ['alert', 'chat', 'leaderboard', 'goal', 'viewers', 'coinjar'];
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
