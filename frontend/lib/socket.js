// socket.js — Socket.io client singleton
// - Singleton pattern ป้องกัน connection ซ้ำ
// - ใช้ s.on('connect') แทน once() เพื่อ re-authenticate ทุกครั้งที่ reconnect
import { io } from 'socket.io-client';

let socket = null;
let _authToken = null; // เก็บ token ล่าสุด — ใช้ตอน auto-reconnect

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      autoConnect:  false,
      transports:   ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });
    // ส่ง authenticate ทุกครั้ง connect/reconnect — ป้องกัน userSockets หาย
    socket.on('connect', () => {
      if (_authToken) socket.emit('authenticate', { token: _authToken });
    });
  }
  return socket;
}

export function connectSocket(token) {
  _authToken = token; // อัปเดต token ล่าสุดเสมอ
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
  }
}
