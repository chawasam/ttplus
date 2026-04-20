// api.js — Axios instance พร้อม security best practices
// - Bearer token auth (Firebase)
// - Auto CSRF token management (prefetch + single-use)
// - Settings cache (TTL 2 นาที)
// - Auto token refresh on 401
import axios from 'axios';
import { auth } from './firebase';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ===================== CSRF Token Management =====================
// ทุก POST request ต้องแนบ X-CSRF-Token (single-use token)
// ใช้ prefetch strategy: เตรียม token ไว้ล่วงหน้า 1 ชุด เพื่อไม่ให้ POST ช้า
// ใช้ axios ธรรมดา (ไม่ใช่ api instance) เพื่อป้องกัน interceptor loop

let _csrfReady = null;    // token ที่เตรียมไว้แล้ว (พร้อมใช้)
let _csrfLoad  = null;    // Promise ที่กำลัง fetch อยู่

async function _fetchCsrfDirect() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const idToken = await user.getIdToken(false);
    const { data } = await axios.get(`${BASE}/api/csrf-token`, {
      headers: { Authorization: `Bearer ${idToken}` },
      timeout: 8000,
    });
    return typeof data.token === 'string' && data.token.length === 64
      ? data.token
      : null;
  } catch {
    return null;
  }
}

// Retry wrapper: ลองอีก 1 ครั้งหลัง 600ms ถ้า fetch แรกล้มเหลว
async function _fetchCsrfWithRetry() {
  const t = await _fetchCsrfDirect();
  if (t) return t;
  // รอแล้วลองอีกครั้ง (network blip หรือ Firebase token refresh)
  await new Promise(r => setTimeout(r, 600));
  return _fetchCsrfDirect();
}

function _prefetchCsrf() {
  if (_csrfLoad) return; // มีการ fetch อยู่แล้ว
  _csrfLoad = _fetchCsrfWithRetry()
    .then(t  => { _csrfReady = t; })
    .catch(() => {})
    .finally(() => { _csrfLoad = null; });
}

/**
 * consumeCsrf — คืน CSRF token พร้อมใช้ แล้ว prefetch อันต่อไป
 * - ถ้ามี cache → ใช้ทันที (fast path)
 * - ถ้ากำลัง fetch → รอ แล้วใช้
 * - ถ้าไม่มีเลย → fetch ตรงๆ (cold call / first POST ของ session)
 */
async function consumeCsrf() {
  // Fast path: token พร้อมแล้ว
  if (_csrfReady) {
    const t = _csrfReady;
    _csrfReady = null;
    _prefetchCsrf(); // เตรียม token สำหรับ request ต่อไป
    return t;
  }

  // Pending path: รอ fetch ที่กำลังทำอยู่
  if (_csrfLoad) {
    await _csrfLoad;
    const t = _csrfReady;
    _csrfReady = null;
    _prefetchCsrf();
    return t;
  }

  // Cold path: fetch พร้อม retry (first POST หลัง login)
  const t = await _fetchCsrfWithRetry();
  _prefetchCsrf(); // เตรียมอันต่อไปทันที
  return t;
}

// ===================== Settings Cache =====================
const SETTINGS_TTL_MS = 2 * 60 * 1000; // 2 นาที
let settingsCache = null; // { data, expiresAt }

export function getCachedSettings() {
  if (settingsCache && Date.now() < settingsCache.expiresAt) {
    return settingsCache.data;
  }
  return null;
}

export function setCachedSettings(data) {
  settingsCache = { data, expiresAt: Date.now() + SETTINGS_TTL_MS };
}

export function clearSettingsCache() {
  settingsCache = null;
}

// ===================== Request Interceptor =====================
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;

  // 1. Attach Firebase Bearer token (ทุก request)
  if (user) {
    const token = await user.getIdToken(false); // auto-refresh ถ้าใกล้หมดอายุ
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Attach CSRF token สำหรับ mutating requests
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    const csrf = await consumeCsrf();
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
    // ถ้าไม่ได้ token — ปล่อยให้ผ่าน (backend จะ reject 403 เอง)
    // ไม่ throw error ที่นี่เพราะอาจเป็น public endpoint ที่ไม่ต้องการ CSRF
  }

  return config;
}, (error) => Promise.reject(error));

// ===================== Response Interceptor =====================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Auto-retry ครั้งเดียวถ้า 401 (Firebase token หมดอายุ)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true); // force refresh
          original.headers.Authorization = `Bearer ${freshToken}`;
          return api(original);
        }
      } catch {
        // refresh ล้มเหลว — ให้ error ผ่านตามปกติ
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error('[API]', error.response?.status, original?.url);
    }

    return Promise.reject(error);
  }
);

export default api;
