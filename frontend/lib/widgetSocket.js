// lib/widgetSocket.js — Widget Socket Helper
// ลด code ซ้ำใน widget pages ทั้ง 5 (alert/chat/goal/leaderboard/viewers)
// ทุก widget ใช้ socket pattern เดียวกัน: connect → join_widget → listen events → cleanup

import { io } from 'socket.io-client';

const BACKEND_URL    = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const WIDGET_TOKEN_RE = /^[a-f0-9]{64}$/i;

/**
 * สร้าง Socket.io connection สำหรับ widget
 *
 * @param {string} widgetToken  — token จาก URL param ?wt=...
 * @param {object} handlers     — { eventName: handlerFn, ... }
 * @returns socket instance หรือ null ถ้า token ไม่ valid
 *
 * @example
 * const socket = createWidgetSocket(wt, {
 *   gift:   (data) => { ... },
 *   follow: (data) => { ... },
 * });
 * if (!socket) return; // token invalid
 * return () => socket.disconnect(); // cleanup
 */
export function createWidgetSocket(widgetToken, handlers = {}) {
  // Validate token ก่อนสร้าง connection
  if (!widgetToken || !WIDGET_TOKEN_RE.test(widgetToken)) return null;

  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  // join_widget room ทันทีที่ connect
  socket.on('connect', () => {
    socket.emit('join_widget', { widgetToken });
  });

  // ถ้า token หมดอายุหรือ invalid → disconnect
  socket.on('widget_error', () => {
    socket.disconnect();
  });

  // socket-level error (network, server crash ฯลฯ)
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

  // Register event handlers ที่ส่งมา
  for (const [event, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      socket.on(event, handler);
    }
  }

  return socket;
}
