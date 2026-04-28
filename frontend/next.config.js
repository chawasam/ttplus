/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// ===== Content Security Policies =====

// หน้าหลัก (dashboard, settings, widgets, index)
// unsafe-eval จำเป็นใน dev (Next.js HMR) แต่ไม่จำเป็นใน production
const mainCSP = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com"
    : "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${BACKEND} wss: ws: https://*.googleapis.com https://accounts.google.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com`,
  "img-src 'self' data: https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktok.com https://lh3.googleusercontent.com",
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Widget pages — ใช้ใน OBS / TikTok Studio browser source
// - อนุญาต cdnjs.cloudflare.com สำหรับ Matter.js (Coin Jar physics)
// - อนุญาต TikTok CDN สำหรับรูป gift/avatar
// - frame-ancestors * เพราะ OBS ต้องการ embed
const widgetCSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  // ต้องใส่ทั้ง BACKEND (Railway URL) และ api.ttsam.app (custom domain)
  // เพราะ widget เรียก now-playing / socket ผ่าน api.ttsam.app โดยตรง
  `connect-src 'self' ${BACKEND} https://api.ttsam.app wss://api.ttsam.app wss: ws:`,
  // img-src: เพิ่ม Spotify CDN (i.scdn.co) สำหรับ album art
  "img-src 'self' data: https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktok.com https://i.scdn.co https://*.scdn.co https://mosaic.scdn.co",
  "frame-ancestors *",   // OBS / TikTok Studio ต้องการ embed
  "font-src 'self' data:",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  compress: true,           // gzip/brotli responses (default true, explicit for clarity)
  poweredByHeader: false,   // ซ่อน X-Powered-By

  // อนุญาตเฉพาะ TikTok CDN สำหรับ next/image
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
      { protocol: 'https', hostname: '*.tiktokcdn-us.com' },
      { protocol: 'https', hostname: '*.tiktok.com' },
    ],
    // Cache รูปนาน 1 ชั่วโมง
    minimumCacheTTL: 3600,
  },

  async headers() {
    return [
      // ===== หน้าหลัก (ทุกหน้ายกเว้น /widget/*) =====
      {
        source: '/((?!widget).*)',
        headers: [
          { key: 'X-Frame-Options',              value: 'DENY' },
          { key: 'X-Content-Type-Options',        value: 'nosniff' },
          { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy',       value: mainCSP },
          // same-origin-allow-popups: Firebase signInWithPopup ต้องการ
          // (same-origin จะบล็อก popup ไม่ให้ส่งข้อมูลกลับมา)
          { key: 'Cross-Origin-Opener-Policy',    value: 'same-origin-allow-popups' },
          ...(isDev ? [] : [
            // HSTS เฉพาะ production (บังคับ HTTPS)
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          ]),
        ],
      },

      // ===== Widget pages (/widget/*) =====
      // OBS Browser Source ต้องการ embed ได้ ไม่มี X-Frame-Options DENY
      {
        source: '/widget/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',          value: 'no-referrer' },
          { key: 'Content-Security-Policy',  value: widgetCSP },
          // ไม่ใส่ X-Frame-Options — CSP frame-ancestors * ทำงานแทน
          // (X-Frame-Options: ALLOWALL เป็น deprecated และ browser ตีความต่างกัน)
        ],
      },
    ];
  },

  // ===== Legacy /game routes → /ashenveil =====
  // หมายเหตุ: ลบ /ASHENVEIL redirect ออกแล้ว!
  // Next.js ใช้ path-to-regexp แบบ case-insensitive (sensitive: false)
  // ทำให้ source: '/ASHENVEIL' match '/ashenveil' ด้วย → redirect loop 307
  async redirects() {
    return [
      // Legacy /game routes → /ashenveil (ยังคงไว้เพราะ /game ≠ /ashenveil)
      { source: '/game',              destination: '/ashenveil',         permanent: false },
      { source: '/game/:path*',       destination: '/ashenveil/:path*',  permanent: false },
    ];
  },
};

module.exports = nextConfig;
