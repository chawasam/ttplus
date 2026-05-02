// lib/keepAlive.js — ป้องกัน Chrome/Safari throttle background tabs
//
// ปัญหา: browser throttle tab ที่อยู่ background หลัง 5 นาที
//   - setTimeout/setInterval ถูกจำกัดเหลือ 1 tick/วินาที
//   - speechSynthesis อาจถูก cancel
//   - Socket.IO heartbeat ช้าลง → อาจ disconnect
//
// แก้ด้วย 2 เทคนิคพร้อมกัน:
//   1. Web Locks API  — บอก browser ว่า tab นี้ active อยู่ ไม่ควร throttle
//   2. Blob Web Worker heartbeat — Worker timer ไม่ถูก throttle แม้ tab background
//
// เรียก startKeepAlive() ครั้งเดียวจาก _app.js

let started = false;

export function startKeepAlive() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // ── 1. Web Locks API ─────────────────────────────────────────────────────────
  // Chrome 69+, Edge 79+, Firefox 96+, Safari 15.4+
  // acquire lock แบบ shared ค้างไว้ตลอด → browser รู้ว่า tab ยังต้องการ resources
  if (typeof navigator !== 'undefined' && navigator.locks) {
    (async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          await navigator.locks.acquire(
            'ttplus_keepalive',
            { mode: 'shared' },
            // resolve หลัง 25 วินาที แล้ว loop กลับมา re-acquire
            () => new Promise(r => setTimeout(r, 25_000))
          );
        } catch {
          // Web Locks ไม่รองรับ หรือ tab กำลังจะปิด — หยุด loop
          break;
        }
      }
    })();
  }

  // ── 2. Web Worker heartbeat ──────────────────────────────────────────────────
  // Worker thread ทำงานนอก main thread → timer ของมันไม่ถูก browser throttle
  // ส่ง 'ping' กลับมา main thread ทุก 1 วินาที เพื่อ "ปลุก" ให้ main thread ยังทำงาน
  try {
    const code = `
      var _tid;
      function beat() { postMessage('ping'); _tid = setTimeout(beat, 1000); }
      beat();
      self.onmessage = function(e) {
        if (e.data === 'stop') { clearTimeout(_tid); self.close(); }
      };
    `;
    const blob    = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const worker  = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl); // revoke ทันที — worker ยังถือ reference ไว้ได้

    worker.onmessage = () => {
      // heartbeat tick จาก worker — dispatch event ให้ pages subscribe ได้
      // เพียงแค่ dispatch ก็ช่วยให้ browser รู้ว่า main thread ยัง active
      window.dispatchEvent(new Event('ttplus-heartbeat'));
    };

    // cleanup เมื่อปิด tab
    window.addEventListener('beforeunload', () => {
      try { worker.postMessage('stop'); } catch { /* ignore */ }
    }, { once: true });
  } catch {
    // Worker API ไม่รองรับ (e.g. ปิด CSP) — ไม่ต้องทำอะไร
  }
}
