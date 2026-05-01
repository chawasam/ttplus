// handlers/filehost.js — Proxy อัปโหลดไฟล์ไปยัง file hosting services
// รองรับ: catbox.moe, litterbox, uguu.se
// ใช้ Node 18+ built-in fetch + FormData + Blob — ไม่ต้องติดตั้ง package เพิ่ม
const fs  = require('fs');
const { Blob } = require('buffer');

const SERVICES = {
  catbox: {
    label:    'catbox.moe',
    maxBytes: 200 * 1024 * 1024,
  },
  litterbox: {
    label:      'Litterbox',
    maxBytes:   200 * 1024 * 1024,
    validTimes: ['1h', '12h', '24h', '72h'],
    defaultTime: '24h',
  },
  uguu: {
    label:    'uguu.se',
    maxBytes: 100 * 1024 * 1024,
  },
};

// ── service-specific upload functions ────────────────────────────────────────

async function _uploadCatbox(blob, filename) {
  const form = new FormData();
  form.append('reqtype',      'fileupload');
  form.append('fileToUpload', blob, filename);
  const r    = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
  const body = await r.text();
  if (!r.ok || !body.startsWith('https://')) throw new Error(`catbox.moe: ${body}`);
  return body.trim();
}

async function _uploadLitterbox(blob, filename, time = '24h') {
  const form = new FormData();
  form.append('reqtype',      'fileupload');
  form.append('time',         time);
  form.append('fileToUpload', blob, filename);
  const r    = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', { method: 'POST', body: form });
  const body = await r.text();
  if (!r.ok || !body.startsWith('https://')) throw new Error(`Litterbox: ${body}`);
  return body.trim();
}

async function _uploadUguu(blob, filename) {
  const form = new FormData();
  form.append('files[]', blob, filename);
  const r    = await fetch('https://uguu.se/upload', { method: 'POST', body: form });
  const json = await r.json().catch(() => null);
  const url  = json?.files?.[0]?.url;
  if (!r.ok || !url) throw new Error(`uguu.se: ${json?.description || r.status}`);
  return url;
}

// ── main handler ─────────────────────────────────────────────────────────────

async function uploadFile(req, res) {
  const serviceKey = req.query.service || 'catbox';
  const service    = SERVICES[serviceKey];

  console.log('[Filehost] service:', serviceKey, '| file:', req.file?.originalname, '| size:', req.file?.size);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ไม่พบไฟล์' });
    }

    const { path: tmpPath, originalname, size, mimetype } = req.file;

    if (!service) {
      fs.unlink(tmpPath, () => {});
      return res.status(400).json({ error: `service ไม่รองรับ: ${serviceKey}` });
    }

    if (size > service.maxBytes) {
      fs.unlink(tmpPath, () => {});
      const mb = Math.round(service.maxBytes / 1024 / 1024);
      return res.status(400).json({ error: `ไฟล์ใหญ่เกิน ${mb}MB (${service.label})` });
    }

    // ตรวจ MIME ตาม mediaType query (video / image / audio)
    const MT_MAP    = { image: 'image/', audio: 'audio/', video: 'video/' };
    const MT_TH     = { image: 'รูปภาพ', audio: 'เสียง', video: 'วิดีโอ' };
    const mediaType = MT_MAP[req.query.mediaType] ? req.query.mediaType : 'video';
    if (!mimetype.startsWith(MT_MAP[mediaType])) {
      fs.unlink(tmpPath, () => {});
      return res.status(400).json({ error: `รองรับเฉพาะไฟล์${MT_TH[mediaType]}` });
    }

    const fileBuffer = fs.readFileSync(tmpPath);
    const blob       = new Blob([fileBuffer], { type: mimetype });
    fs.unlink(tmpPath, () => {});

    let url;
    if (serviceKey === 'catbox') {
      url = await _uploadCatbox(blob, originalname);
    } else if (serviceKey === 'litterbox') {
      const time = SERVICES.litterbox.validTimes.includes(req.query.time)
        ? req.query.time
        : SERVICES.litterbox.defaultTime;
      url = await _uploadLitterbox(blob, originalname, time);
    } else if (serviceKey === 'uguu') {
      url = await _uploadUguu(blob, originalname);
    }

    return res.json({ url });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error('[Filehost] error:', err.message, '|', err.cause?.code ?? '', err.cause?.message ?? '');
    const label = service?.label || serviceKey;
    // ถ้า response เป็น HTML (server down) หรือ network error → แสดง message ที่อ่านได้
    const raw = err.message || '';
    let friendly;
    if (raw.includes('<html') || raw.includes('502') || raw.includes('503') || raw.includes('Bad Gateway')) {
      friendly = `${label} ไม่พร้อมใช้งานขณะนี้ — ลองใช้ Litterbox หรือ uguu.se แทน`;
    } else if (raw.includes('ECONNREFUSED') || raw.includes('ENOTFOUND') || raw.includes('fetch failed') || raw.includes('UND_ERR')) {
      friendly = `เชื่อมต่อ ${label} ไม่ได้ — ลองใช้ Litterbox หรือ uguu.se แทน`;
    } else {
      friendly = raw.startsWith(label) ? raw : `[${label}] ${raw}`;
    }
    return res.status(502).json({ error: friendly });
  }
}

module.exports = { uploadFile };
