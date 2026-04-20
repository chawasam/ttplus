// lib/errorHandler.js — Standardized error display (สากล)
// Format: [HTTP-{status} / {backend_code}] {message}
// Example: [HTTP-500 / 5 NOT_FOUND] Failed to save settings

import toast from 'react-hot-toast';

/**
 * แสดง error toast พร้อม error code มาตรฐาน
 * @param {Error}  err         — axios error object
 * @param {string} fallbackMsg — ข้อความ default ถ้า backend ไม่ส่งมา
 */
export function showError(err, fallbackMsg = 'เกิดข้อผิดพลาด') {
  const httpStatus  = err?.response?.status;
  const backendMsg  = err?.response?.data?.error;
  const backendCode = err?.response?.data?.code;

  const parts = [];
  if (httpStatus)  parts.push(`HTTP-${httpStatus}`);
  if (backendCode) parts.push(backendCode);

  const codeStr = parts.length ? `[${parts.join(' / ')}]` : '[ERR-NET]';
  const message = backendMsg || fallbackMsg;

  toast.error(`${codeStr} ${message}`);
}

/**
 * สร้าง error string (ไม่ toast — ใช้สำหรับ inline display)
 */
export function formatError(err, fallbackMsg = 'เกิดข้อผิดพลาด') {
  const httpStatus  = err?.response?.status;
  const backendMsg  = err?.response?.data?.error;
  const backendCode = err?.response?.data?.code;

  const parts = [];
  if (httpStatus)  parts.push(`HTTP-${httpStatus}`);
  if (backendCode) parts.push(backendCode);

  const codeStr = parts.length ? `[${parts.join(' / ')}]` : '[ERR-NET]';
  return `${codeStr} ${backendMsg || fallbackMsg}`;
}
