// socket.js — Socket.io client singleton
// - Singleton pattern ป้องกัน connection ซ้ำ
// - ใช้ s.on('connect') แทน once() เพื่อ re-authenticate ทุกครั้งที่ reconnect
// - setTokenRefresher(fn) — ให้ socket ขอ fresh token ก่อน re-authenticate
//   ป้องกัน "No active connection" เมื่อ Firebase ID token หมดอายุ (> 1 ชั่วโมง)
import { io } from 'socket.io-client';

let socket = null;
let _authToken = null;    // fallback token (อาจหมดอายุ)
let _getTokenFn = null;   // async fn ที่คืน fresh token — set จาก dashboard

/**
 * ลงทะเบียน fn สำหรับขอ Firebase ID token ล่าสุด
 * เรียกทุกครั้งที่ socket reconnect เพื่อไม่ให้ส่ง expired token
 * @param {() => Promise<string>} fn  — มักจะเป็น () => user.getIdToken()
 */
export function setTokenRefresher(fn) {
  _getTokenFn = fn;
}

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      autoConnect:          false,
      transports:           ['polling', 'websocket'],
      reconnection:         true,
      reconnectionAttempts: 20,      // พยายาม 20 ครั้ง (~2 นาที ครอบคลุม Railway restart)
      reconnectionDelay:    2000,    // เริ่มที่ 2 วิ
      reconnectionDelayMax: 8000,    // cap ที่ 8 วิ ไม่รอนานเกิน
      randomizationFactor:  0.3,     // jitter เล็กน้อย ป้องกัน thundering herd
    });

    // ส่ง authenticate ทุกครั้ง connect/reconnect — ใช้ fresh token เสมอ
    socket.on('connect', async () => {
      let token = _authToken; // fallback
      if (_getTokenFn) {
        try { token = await _getTokenFn(); } catch {}
      }
      if (token) socket.emit('authenticate', { token });
    });
  }
  return socket;
}

export function connectSocket(token) {
  _authToken = token; // เก็บเป็น fallback ก่อน setTokenRefresher ถูกเรียก
  const s = getSocket();

  if (!s.connected) {
    s.connect();
  } else {
    // already connected — re-authenticate ด้วย token ใหม่ทันที
    s.emit('authenticate', { token });
  }

  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners(); // ล้าง listeners ก่อน disconnect
    socket.disconnect();
    socket = null; // reset singleton เพื่อ fresh connection ครั้งต่อไป
    _getTokenFn = null;
  }
}
