// lib/aipromptDocs.js — Export prompts to Google Docs + Upload images to Drive
//
// ใช้ Firebase Google sign-in + ขอ scope `documents` + `drive.file` → ได้ OAuth access token
// → เรียก Google Docs REST API (สร้าง doc + populate)
// → เรียก Google Drive REST API (สร้าง folder + upload images)
//
// Token cache อยู่ใน memory ของ tab (~1 ชั่วโมง) ไม่บันทึกที่ไหน

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const SCOPE_DOCUMENTS  = 'https://www.googleapis.com/auth/documents';
const SCOPE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_TTL_MS     = 55 * 60 * 1000;  // 55 นาที (จริง ~1 ชม.)

let cachedToken     = null;
let tokenExpiresAt  = 0;

// ขอ token ที่มีทั้ง scope documents + drive.file (ยิงครั้งเดียว — ใช้ได้ทั้ง Export Docs + Upload Drive)
async function getDocsAccessToken({ forceConsent = false } = {}) {
  if (!forceConsent && cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const provider = new GoogleAuthProvider();
  provider.addScope(SCOPE_DOCUMENTS);
  provider.addScope(SCOPE_DRIVE_FILE);
  // ขอ access_token ทุกครั้ง — ถ้า user เคยให้ consent แล้ว popup จะผ่านไว
  // ถ้ายังไม่เคย → consent screen เด้งขอ scopes
  if (forceConsent) provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) throw new Error('Google ไม่ได้ส่ง access token กลับมา');
  cachedToken    = credential.accessToken;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return cachedToken;
}

export function clearDocsTokenCache() {
  cachedToken    = null;
  tokenExpiresAt = 0;
}

// Build batchUpdate requests จาก paragraphs
// แต่ละ paragraph: { type: 'h1' | 'h2' | 'p' | 'code', text: string }
// Insert text ก่อน → apply paragraph style ตาม range
function buildBatchUpdateRequests(paragraphs) {
  // Doc เริ่มที่ index 1 (index 0 = section break ที่แก้ไม่ได้)
  // แต่ละ paragraph ลงท้ายด้วย "\n" (1 ตัวอักษรในระบบนับของ Docs)
  let pos = 1;
  const styleRequests = [];
  let fullText = '';

  for (const p of paragraphs) {
    const text = (p.text || '') + '\n';
    fullText += text;
    const start = pos;
    const end   = pos + text.length;  // รวม "\n"
    const styleType =
      p.type === 'h1' ? 'HEADING_1' :
      p.type === 'h2' ? 'HEADING_2' :
      p.type === 'h3' ? 'HEADING_3' : 'NORMAL_TEXT';
    if (styleType !== 'NORMAL_TEXT') {
      styleRequests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: { namedStyleType: styleType },
          fields: 'namedStyleType',
        },
      });
    }
    if (p.type === 'code') {
      styleRequests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end - 1 },  // ไม่รวม "\n"
          textStyle: { weightedFontFamily: { fontFamily: 'Roboto Mono' }, fontSize: { magnitude: 10, unit: 'PT' } },
          fields: 'weightedFontFamily,fontSize',
        },
      });
    }
    if (p.type === 'subtle') {
      styleRequests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end - 1 },
          textStyle: { foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } } },
          fields: 'foregroundColor',
        },
      });
    }
    pos = end;
  }

  // Insert text ก่อน — Docs จะคำนวณ range หลัง insert
  return [
    { insertText: { location: { index: 1 }, text: fullText } },
    ...styleRequests,
  ];
}

/**
 * สร้าง Google Doc ใหม่ + เติมเนื้อหา → คืน URL
 *
 * @param {string} title — ชื่อ doc
 * @param {Array<{type, text}>} paragraphs — เนื้อหา (h1/h2/h3/p/code/subtle)
 * @returns {Promise<string>} URL ของ doc
 */
export async function exportToGoogleDoc(title, paragraphs) {
  let token = await getDocsAccessToken();

  // 1. Create empty doc
  let createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  // ถ้า 401 → token หมดอายุ → ขอใหม่ครั้งเดียว
  if (createRes.status === 401) {
    clearDocsTokenCache();
    token = await getDocsAccessToken({ forceConsent: false });
    createRes = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    // 403 + "has not been used in project" → Google Docs API ปิดอยู่
    // แกะ activation URL จาก message แล้วโยน error ที่มี property `enableUrl` ให้ caller จัดการ
    if (createRes.status === 403 && /has not been used in project|disabled/i.test(errText)) {
      // ลองหา project number จาก error message → สร้าง Console URL
      const projMatch = /project[s]?\/?\s*(\d{5,})/i.exec(errText) || /project (\d{5,})/i.exec(errText);
      const projectNum = projMatch ? projMatch[1] : null;
      const enableUrl = projectNum
        ? `https://console.developers.google.com/apis/api/docs.googleapis.com/overview?project=${projectNum}`
        : 'https://console.developers.google.com/apis/library/docs.googleapis.com';
      const e = new Error('Google Docs API ยังไม่ได้เปิดใน Google Cloud Console — กดเปิด API ก่อนแล้วลองใหม่');
      e.enableUrl = enableUrl;
      e.code = 'docs-api-disabled';
      throw e;
    }
    throw new Error(`สร้าง Google Doc ไม่สำเร็จ (${createRes.status}): ${errText.slice(0, 200)}`);
  }
  const { documentId } = await createRes.json();
  if (!documentId) throw new Error('Docs API ไม่ได้คืน documentId');

  // 2. Populate content
  const requests = buildBatchUpdateRequests(paragraphs);
  if (requests.length > 0) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      // Doc สร้างแล้ว — ส่ง URL กลับพร้อม warning
      console.warn('batchUpdate failed:', errText);
    }
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

// ── Builders เพื่อแปลง project → paragraphs ────────────────────────────────

export function buildImagePromptsDoc(project) {
  const paragraphs = [];
  paragraphs.push({ type: 'h1', text: `${project.name} — Image Prompts` });
  paragraphs.push({ type: 'subtle', text: `Category: ${project.category === 'mvp' ? 'Video MVP' : 'Video Ad'} · ${project.imagePrompts?.shots?.length || 0} shots · ${project.totalDuration}s total / ${project.perShotDuration}s per shot` });
  paragraphs.push({ type: 'p', text: '' });

  if (project.category === 'mvp') {
    if (project.transformationTheme) {
      paragraphs.push({ type: 'h3', text: 'Transformation theme' });
      paragraphs.push({ type: 'p', text: project.transformationTheme });
    }
  } else {
    if (project.brief) {
      paragraphs.push({ type: 'h3', text: 'Brief' });
      paragraphs.push({ type: 'p', text: project.brief });
    }
  }

  if (project.styleBlock) {
    paragraphs.push({ type: 'h3', text: 'Style block (appended to every prompt)' });
    paragraphs.push({ type: 'subtle', text: project.styleBlock });
  }

  paragraphs.push({ type: 'p', text: '' });
  paragraphs.push({ type: 'h2', text: 'Image Prompts' });

  const shots = project.imagePrompts?.shots || [];
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    paragraphs.push({ type: 'h3', text: `Shot ${i + 1} / ${shots.length}` });
    paragraphs.push({ type: 'code', text: sh.prompt });
    paragraphs.push({ type: 'p', text: '' });
  }

  return paragraphs;
}

// ── Google Drive — upload images to folder ──────────────────────────────────

function dataUrlToBlob(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid dataUrl');
  const mime = m[1];
  const bytes = atob(m[2]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// แกะ Drive enable URL จาก error ให้ caller จัดการ
function checkDriveApiDisabled(status, errText) {
  if (status === 403 && /has not been used in project|disabled/i.test(errText)) {
    const projMatch = /project[s]?\/?\s*(\d{5,})/i.exec(errText) || /project (\d{5,})/i.exec(errText);
    const projectNum = projMatch ? projMatch[1] : null;
    const enableUrl = projectNum
      ? `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectNum}`
      : 'https://console.developers.google.com/apis/library/drive.googleapis.com';
    const e = new Error('Google Drive API ยังไม่ได้เปิดใน Google Cloud Console — กดเปิด API ก่อนแล้วลองใหม่');
    e.enableUrl = enableUrl;
    e.code = 'drive-api-disabled';
    return e;
  }
  return null;
}

/**
 * อัพโหลดรูปภาพหลายไฟล์เข้า Drive — สร้าง folder ใหม่แล้วใส่ไฟล์ทุกไฟล์ในนั้น
 *
 * @param {string} folderName — ชื่อ folder (มักเป็นชื่อ project + timestamp)
 * @param {Array<{name, dataUrl, mimeType}>} files — ไฟล์ที่จะอัพ (ตั้งชื่อตาม name)
 * @param {(done:number, total:number, currentName:string) => void} [onProgress] — callback per file
 * @returns {Promise<{folderId: string, folderUrl: string}>}
 */
export async function uploadImagesToDrive(folderName, files, onProgress) {
  if (!Array.isArray(files) || files.length === 0) throw new Error('ไม่มีไฟล์');
  let token = await getDocsAccessToken();

  // 1. Create folder
  const createFolder = async (tk) => fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  let folderRes = await createFolder(token);
  if (folderRes.status === 401) {
    clearDocsTokenCache();
    token = await getDocsAccessToken();
    folderRes = await createFolder(token);
  }
  if (!folderRes.ok) {
    const errText = await folderRes.text();
    const apiDisabled = checkDriveApiDisabled(folderRes.status, errText);
    if (apiDisabled) throw apiDisabled;
    throw new Error(`สร้าง folder ไม่สำเร็จ (${folderRes.status}): ${errText.slice(0, 200)}`);
  }
  const { id: folderId } = await folderRes.json();
  if (!folderId) throw new Error('Drive API ไม่ได้คืน folderId');

  // 2. Upload each file
  let done = 0;
  for (const file of files) {
    const blob = dataUrlToBlob(file.dataUrl);
    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.mimeType || blob.type || 'image/png',
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload "${file.name}" ไม่สำเร็จ (${uploadRes.status}): ${errText.slice(0, 200)}`);
    }
    done += 1;
    if (typeof onProgress === 'function') onProgress(done, files.length, file.name);
  }

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

export function buildVideoPromptsDoc(project) {
  const paragraphs = [];
  paragraphs.push({ type: 'h1', text: `${project.name} — Video Prompts` });
  paragraphs.push({ type: 'subtle', text: `Category: ${project.category === 'mvp' ? 'Video MVP' : 'Video Ad'} · ${project.videoPlan?.shots?.length || 0} shots · ${project.perShotDuration}s per clip` });
  paragraphs.push({ type: 'p', text: '' });

  paragraphs.push({ type: 'h2', text: 'Video Prompts (per shot)' });

  const shots = project.videoPlan?.shots || [];
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    const role = sh.frameRole === 'start' ? 'Start frame'
              : sh.frameRole === 'end'   ? 'End frame'
              : sh.frameRole === 'both'  ? 'Start + End frame' : sh.frameRole || '';
    paragraphs.push({ type: 'h3', text: `Shot ${sh.index || i + 1}  ·  ${role}  ·  source image #${(sh.sourceImageIndex ?? 0) + 1}` });
    paragraphs.push({ type: 'code', text: sh.videoPromptEn || '' });
    if (sh.frameNote) paragraphs.push({ type: 'subtle', text: '💡 ' + sh.frameNote });
    paragraphs.push({ type: 'p', text: '' });
  }

  const m = project.videoPlan?.music;
  if (m) {
    paragraphs.push({ type: 'h2', text: 'Music recommendation' });
    if (m.mood)        paragraphs.push({ type: 'p', text: 'Mood: ' + m.mood });
    if (m.tempo)       paragraphs.push({ type: 'p', text: 'Tempo: ' + m.tempo + ' BPM' });
    if (m.instruments?.length) paragraphs.push({ type: 'p', text: 'Instruments: ' + m.instruments.join(', ') });
    if (m.references?.length) {
      paragraphs.push({ type: 'p', text: 'References:' });
      for (const r of m.references) paragraphs.push({ type: 'p', text: '· ' + r });
    }
  }

  return paragraphs;
}
