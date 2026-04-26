// envCheck.js — ตรวจสอบ environment variables ที่จำเป็นก่อน server start
const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FRONTEND_URL',
];

function checkEnv() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nกรุณาตั้งค่าในไฟล์ .env แล้วรัน server ใหม่\n');
    process.exit(1);
  }

  // ตรวจ FRONTEND_URL
  try {
    const url = new URL(process.env.FRONTEND_URL);
    // Production ต้องใช้ HTTPS เท่านั้น
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      console.error('❌ FRONTEND_URL must use https:// in production');
      process.exit(1);
    }
  } catch {
    console.error('❌ FRONTEND_URL is not a valid URL:', process.env.FRONTEND_URL);
    process.exit(1);
  }

  // แนะนำ optional vars
  if (!process.env.IP_HASH_SALT) {
    console.warn('⚠️  IP_HASH_SALT not set — using default (set this in production!)');
  }

  console.log('✅ Environment variables OK');
}

module.exports = { checkEnv };
