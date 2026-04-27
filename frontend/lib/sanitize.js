// sanitize.js — Client-side sanitization helpers
// ใช้ในทุก component ที่ render ข้อมูลจาก TikTok / socket events
// แม้ว่า backend sanitize แล้ว แต่ defense in depth = sanitize ทั้ง 2 ฝั่ง

/**
 * Escape HTML special characters ป้องกัน XSS
 * ใช้กับ text ที่จะ render ใน JSX เมื่อ dangerouslySetInnerHTML
 * (ปกติ React escape ให้อัตโนมัติ แต่ใส่ไว้สำหรับกรณีที่ต้องใช้ inline style/script)
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#096;');
}

/**
 * Sanitize text สำหรับแสดงผล — ลบ control characters + จำกัดความยาว
 */
export function sanitizeDisplay(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // ลบ control characters
    .replace(/<[^>]*>/g, '')           // ลบ HTML tags
    .trim()
    .slice(0, maxLen);
}

/**
 * ตรวจสอบว่า URL เป็น TikTok CDN จริงๆ ก่อน render รูป
 */
export function safeTikTokImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    const allowed = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktok.com'];
    if (u.protocol !== 'https:') return '';
    if (!allowed.some(d => u.hostname.endsWith(d))) return '';
    return url;
  } catch {
    return '';
  }
}

/**
 * Sanitize ข้อมูล TikTok event ทั้ง object ก่อน render
 */
export function sanitizeEvent(event) {
  if (!event || typeof event !== 'object') return {};
  return {
    ...event,
    uniqueId:          sanitizeDisplay(event.uniqueId, 100),
    nickname:          sanitizeDisplay(event.nickname, 100),
    comment:           sanitizeDisplay(event.comment, 500),
    giftName:          sanitizeDisplay(event.giftName, 100),
    profilePictureUrl: safeTikTokImageUrl(event.profilePictureUrl),
    giftPictureUrl:    safeTikTokImageUrl(event.giftPictureUrl),
    diamondCount:      Math.max(0, Math.min(Number(event.diamondCount) || 0, 9_999_999)),
    repeatCount:       Math.max(1, Math.min(Number(event.repeatCount)  || 1, 9999)),
  };
}
