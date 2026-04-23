// lib/widgetSocket.js — Widget Socket Helper
// รองรับ 2 format:
//   cid  — ตัวเลขสั้น 4-8 หลัก เช่น "10001" (format ใหม่)
//   wt   — base64url/hex token (format เก่า backward compat)

import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * ตรวจว่าเป็น cid format ใหม่ (ตัวเลข) หรือ token เก่า
 */
function parseCidOrToken(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^\d{4,8}$/.test(value))              return { type: 'cid',   value };
  if (/^[a-zA-Z0-9_-]{20,66}$/.test(value)) return { type: 'token', value };
  return null;
}

/**
 * สร้าง Socket.io connection สำหรับ widget
 *
 * @param {string} cidOrToken — cid ตัวเลข (ใหม่) หรือ wt token (เก่า) จาก URL param
 * @param {object} handlers   — { eventName: handlerFn, ... }
 * @returns socket instance หรือ null ถ้า invalid
 *
 * @example
 * const cid = params.get('cid') ?? params.get('wt');
 * const socket = createWidgetSocket(cid, {
 *   gift:   (data) => { ... },
 *   follow: (data) => { ... },
 * });
 */
export function createWidgetSocket(cidOrToken, handlers = {}) {
  const parsed = parseCidOrToken(cidOrToken);
  if (!parsed) return null;

  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  // join_widget room ทันทีที่ connect — ส่ง cid หรือ widgetToken ตาม format
  socket.on('connect', () => {
    if (parsed.type === 'cid') {
      socket.emit('join_widget', { cid: parsed.value });
    } else {
      socket.emit('join_widget', { widgetToken: parsed.value });
    }
  });

  // ถ้า auth ไม่ผ่าน → disconnect
  socket.on('widget_error', () => {
    socket.disconnect();
  });

  // socket-level error
  socket.on('error', (err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[widgetSocket] socket error:', err?.message || err);
    }
    socket.disconnect();
  });

  // connect_error (ติดต่อ backend ไม่ได้)
  socket.on('connect_error', (err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[widgetSocket] connect_error:', err?.message);
    }
  });

  // Register event handlers
  for (const [event, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      socket.on(event, handler);
    }
  }

  return socket;
}
