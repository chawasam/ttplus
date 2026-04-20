// socket.js — Socket.io client singleton
// - Singleton pattern ป้องกัน connection ซ้ำ
// - ใช้ socket.once('connect') ป้องกัน listener สะสมเมื่อ reconnect
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      autoConnect:  false,
      transports:   ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();

  if (!s.connected) {
    // ใช้ once() ไม่ใช่ on() — ป้องกัน listener สะสมเมื่อ reconnect หลายครั้ง
    s.once('connect', () => {
      s.emit('authenticate', { token });
    });
    s.connect();
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
