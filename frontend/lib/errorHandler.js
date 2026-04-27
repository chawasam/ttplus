// lib/errorHandler.js — Standardized error display
// Error popup แสดงรายละเอียดครบ: HTTP status, backend code, message, และ stack ถ้ามี

import toast from 'react-hot-toast';

/**
 * แสดง error toast พร้อมรายละเอียดครบ
 * @param {Error|unknown} err         — axios error หรือ Error object ทั่วไป
 * @param {string}        fallbackMsg — ข้อความ default ถ้า backend ไม่ส่งมา
 */
export function showError(err, fallbackMsg = 'เกิดข้อผิดพลาด') {
  const httpStatus  = err?.response?.status;
  const backendMsg  = err?.response?.data?.error || err?.response?.data?.message;
  const backendCode = err?.response?.data?.code;
  const networkMsg  = err?.message; // "Network Error", "timeout", etc.

  // สร้าง code tag
  const parts = [];
  if (httpStatus)  parts.push(`HTTP-${httpStatus}`);
  if (backendCode) parts.push(String(backendCode));
  const codeTag = parts.length ? `[${parts.join('/')}]` : '[ERR]';

  // เลือก message ที่ละเอียดที่สุด
  const message = backendMsg || networkMsg || fallbackMsg;

  // รายละเอียดเพิ่มเติม (request URL ถ้ามี)
  const url = err?.config?.url || err?.request?.responseURL || '';
  const extra = url ? `\n↳ ${url}` : '';

  const fullMsg = `${codeTag} ${message}${extra}`;

  toast.error(fullMsg, {
    duration: 8000,           // อยู่นาน 8 วิ เพื่อให้อ่านทัน
    style: {
      maxWidth: '420px',
      whiteSpace: 'pre-line', // รองรับ \n
      fontSize: '12px',
      lineHeight: '1.5',
    },
  });

  // log ใน console ด้วยเสมอ (ละเอียดกว่า toast)
  console.error('[TTsam Error]', {
    codeTag,
    message,
    httpStatus,
    backendCode,
    url,
    raw: err,
  });
}

/**
 * สร้าง error string (ไม่ toast — ใช้สำหรับ inline display)
 */
export function formatError(err, fallbackMsg = 'เกิดข้อผิดพลาด') {
  const httpStatus  = err?.response?.status;
  const backendMsg  = err?.response?.data?.error || err?.response?.data?.message;
  const backendCode = err?.response?.data?.code;
  const networkMsg  = err?.message;

  const parts = [];
  if (httpStatus)  parts.push(`HTTP-${httpStatus}`);
  if (backendCode) parts.push(String(backendCode));
  const codeTag = parts.length ? `[${parts.join('/')}]` : '[ERR]';

  return `${codeTag} ${backendMsg || networkMsg || fallbackMsg}`;
}
