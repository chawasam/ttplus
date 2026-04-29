// lib/errorReporter.js — Global frontend error reporter → POST to backend
// เรียก initErrorReporter() ครั้งเดียวใน _app.js

import api from './api';

let _uid            = '';
let _tiktokUsername = '';
let _initialized    = false;

export function setErrorContext(uid, tiktokUsername) {
  _uid            = uid            || '';
  _tiktokUsername = tiktokUsername || '';
}

async function send(message, stack, source = 'frontend') {
  if (typeof window === 'undefined') return;
  try {
    await api.post('/api/admin/errors/report', {
      message:        String(message).slice(0, 500),
      stack:          String(stack || '').slice(0, 3000),
      source,
      uid:            _uid,
      tiktokUsername: _tiktokUsername,
      url:            window.location.href,
      userAgent:      navigator.userAgent,
      ts:             Date.now(),
    });
  } catch { /* silent — อย่าให้ error reporter throw error อีก */ }
}

export function reportError(message, stack, source) {
  send(message, stack, source).catch(() => {});
}

export function initErrorReporter() {
  if (typeof window === 'undefined' || _initialized) return;
  _initialized = true;

  // ดักจับ JS errors ทั่วทั้งหน้า
  window.onerror = (msg, src, line, col, error) => {
    send(String(msg), error?.stack || `${src}:${line}:${col}`, 'frontend').catch(() => {});
    return false; // ไม่ suppress default browser error
  };

  // ดักจับ Promise rejections ที่ไม่มี .catch()
  window.onunhandledrejection = (event) => {
    const reason = event.reason;
    const msg    = reason?.message || String(reason) || 'Unhandled rejection';
    send(msg, reason?.stack || '', 'unhandled_rejection').catch(() => {});
  };
}
