// pages/widget/myactions.js — Overlay widget สำหรับ OBS Browser Source
// URL: /widget/myactions?cid=12345&screen=1  (format ใหม่)
//      /widget/myactions?vjId=UID&screen=1   (backward compat)
// Poll action queue ทุก 1.5 วิ → แสดง GIF/รูป/วิดีโอ/alert บน stream
// OBS WebSocket: รับ obsScene/obsSource commands แล้ว execute ผ่าน ws://localhost:4455

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 5000; // fallback เท่านั้น — ใช้ตอน socket ไม่ได้ connected

// ── OBS WebSocket v5 helper ───────────────────────────────────────────────
class ObsWs {
  constructor() {
    this.ws       = null;
    this.ready    = false;
    this._retries = 0;
    this._dead    = false; // set true เมื่อ component unmount — หยุด reconnect
    this._msgHandlers = []; // ใช้ array แทน .onmessage เพื่อรองรับหลาย listener พร้อมกัน
  }

  connect(host = 'localhost', port = 4455, password = '') {
    if (this._dead) return;
    try {
      this.ws = new WebSocket(`ws://${host}:${port}`);
      this.ws.onopen = () => { this.ready = true; this._retries = 0; };
      this.ws.onclose = () => {
        this.ready = false;
        if (this._dead) return;
        // Exponential backoff: 5s, 10s, 20s, 40s, 60s (cap)
        const delay = Math.min(60000, 5000 * Math.pow(2, Math.min(this._retries, 4)));
        this._retries++;
        setTimeout(() => this.connect(host, port, password), delay);
      };
      this.ws.onerror = () => {};
      this.ws.addEventListener('message', (evt) => {
        this._msgHandlers.forEach(fn => { try { fn(evt); } catch {} });
      });
    } catch {}
  }

  // เพิ่ม / ลบ message handler — ปลอดภัยจาก race condition
  addMessageHandler(fn) { this._msgHandlers.push(fn); }
  removeMessageHandler(fn) { this._msgHandlers = this._msgHandlers.filter(h => h !== fn); }

  destroy() { this._dead = true; this.ws?.close(); }

  send(requestType, requestData = {}) {
    if (!this.ready || !this.ws) return;
    this.ws.send(JSON.stringify({
      op: 6, // Request
      d: { requestType, requestId: String(Date.now()), requestData },
    }));
  }
  switchScene(sceneName) {
    this.send('SetCurrentProgramScene', { sceneName });
  }
  // OBS WS v5: ต้องแปลง sourceName → sceneItemId ก่อนด้วย GetSceneItemId
  setSourceVisible(sceneName, sourceName, visible, returnAfterMs = 0) {
    if (!this.ready || !this.ws || !sourceName) return;
    const reqId = 'gsi_' + Date.now();

    const handler = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.op === 7 && msg.d.requestId === reqId) {
          this.removeMessageHandler(handler);
          const sceneItemId = msg.d.responseData?.sceneItemId;
          if (sceneItemId == null) return; // source ไม่เจอใน scene นั้น
          this.send('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: visible });
          if (returnAfterMs > 0) {
            setTimeout(() => {
              this.send('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: !visible });
            }, returnAfterMs);
          }
        }
      } catch {}
    };

    this.addMessageHandler(handler);
    this.send('GetSceneItemId', { sceneName, sourceName });
    // safety cleanup ถ้า OBS ไม่ตอบใน 10s
    setTimeout(() => this.removeMessageHandler(handler), 10000);
  }
}

export default function MyActionsOverlay() {
  const router   = useRouter();
  // รองรับทั้ง ?cid= (format ใหม่) และ ?vjId= (backward compat)
  const cid      = router.query.cid    || '';
  const vjIdLeg  = router.query.vjId   || '';
  const vid      = cid || vjIdLeg;       // ใช้ cid ก่อน ถ้าไม่มีใช้ vjId เก่า
  const screen   = parseInt(router.query.screen) || 1;
  const maxQ     = Math.max(1, parseInt(router.query.maxq) || 10); // URL param ?maxq=N (default 10)

  const [item,        setItem]       = useState(null);  // current action to display
  const [visible,     setVisible]    = useState(false); // fade in/out
  const [audioLocked, setAudioLocked] = useState(false); // true = ยังไม่ผ่าน autoplay policy
  const obsRef         = useRef(new ObsWs());
  const timerRef       = useRef(null);
  const pollRef        = useRef(null);
  const audioRef       = useRef(null);       // HTMLAudioElement ที่กำลังเล่น
  const audioCtxRef    = useRef(null);       // AudioContext — ใช้เฉพาะสำหรับ unlock trick
  const pendingAudioRef = useRef(null);      // {url, volume} ที่รอ retry หลัง unlock
  const socketRef      = useRef(null);       // Socket.IO instance
  const socketReady    = useRef(false);      // true หลัง widget_joined สำเร็จ
  const seenNonces     = useRef(new Set()); // nonces ที่ส่งไปแล้ว (ทั้ง socket + drainQueue) — dedup 2 ทิศ
  const isDrainingRef  = useRef(false);     // ป้องกัน concurrent drainQueue (mount + widget_joined race)
  const localQueueRef  = useRef([]);         // คิว item ที่รอแสดง (per screen)
  const isPlayingRef   = useRef(false);      // true ขณะมี item แสดงอยู่บนหน้าจอ
  const playNextRef    = useRef(null);       // forward ref ป้องกัน circular dep
  // Video pool — เก็บ <video> element ที่เคยเล่นแล้วไว้ใน cache (max 10 ตัว)
  // ป้องกันการ download ซ้ำเมื่อ fire action เดิมซ้ำๆ
  const videoPoolRef = useRef(new Map()); // url → <video> element

  // ── AudioContext unlock ──────────────────────────────────────────────────────
  // Chrome/CEF บังคับ user gesture ก่อน resume AudioContext
  // OBS Browser Source ยิง obsSceneActivated เมื่อ scene เปิด — ใช้ event นี้ unlock
  // Regular browser → unlock ตอน click/keydown/touchstart ครั้งแรก
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    const tryUnlock = () => {
      try {
        const ctx = getAudioCtx();
        if (ctx.state !== 'suspended') {
          setAudioLocked(false);
          return;
        }
        ctx.resume().then(() => {
          setAudioLocked(false);
          // เล่น 1 frame เงียบเพื่อยืนยัน context running
          try {
            const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
          } catch {}
          // ถ้ามีเสียงค้างรอ → retry ทันที (ตอนนี้อยู่ใน event handler = user gesture)
          if (pendingAudioRef.current) {
            const { url, volume } = pendingAudioRef.current;
            pendingAudioRef.current = null;
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
            const a = new Audio(url);
            a.volume = Math.min(1, Math.max(0, (volume ?? 100) / 100));
            a.play().catch(() => {});
            audioRef.current = a;
          }
        }).catch(() => {
          setAudioLocked(true);
        });
      } catch {}
    };

    // ไม่เรียก tryUnlock() ทันที — จะ fail เสมอโดยไม่มี user gesture และ warning ดูน่ากวนใจ
    // unlock จะเกิดขึ้นตอน OBS fires obsSceneActivated หรือ user interact เท่านั้น

    // OBS fires obsSceneActivated เมื่อ scene ที่มี browser source นี้ active
    window.addEventListener('obsSceneActivated',   tryUnlock);
    window.addEventListener('obsSceneDeactivated', tryUnlock);
    // visibilitychange: OBS show/hide browser source
    document.addEventListener('visibilitychange', tryUnlock);
    // regular browser / OBS Interact: unlock ตอน interact ครั้งแรก
    const EVENTS = ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'];
    EVENTS.forEach(e => document.addEventListener(e, tryUnlock, { once: true }));

    return () => {
      window.removeEventListener('obsSceneActivated',   tryUnlock);
      window.removeEventListener('obsSceneDeactivated', tryUnlock);
      document.removeEventListener('visibilitychange',  tryUnlock);
      EVENTS.forEach(e => document.removeEventListener(e, tryUnlock));
    };
  }, [getAudioCtx]);

  // ── Connect OBS WebSocket เฉพาะเมื่อ URL มี ?obs=1 หรือ ?obsHost= ──
  // ถ้าเปิดในเว็บ browser ทั่วไปโดยไม่มี param เหล่านี้ → ไม่ connect ไม่มี error
  useEffect(() => {
    const obsEnabled = router.query.obs === '1' || !!router.query.obsHost;
    if (!obsEnabled) return;
    const obs  = obsRef.current;
    const host = router.query.obsHost || 'localhost';
    const port = parseInt(router.query.obsPort) || 4455;
    obs.connect(host, port);
    return () => obs.destroy();
  }, [router.query.obs, router.query.obsHost, router.query.obsPort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute OBS commands ──
  const executeObs = useCallback((item) => {
    const obs = obsRef.current;
    const dur = (item.displayDuration || 5) * 1000;

    // Switch scene
    if (item.types?.includes('switch_obs_scene') && item.obsScene) {
      if (item.obsSceneReturn && obs.ws && obs.ready) {
        // Get current scene first → switch → return after duration
        // ใช้ addMessageHandler แทน .onmessage เพื่อรองรับ concurrent requests
        const reqId = 'gcp_' + Date.now();
        const handler = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.op === 7 && msg.d.requestId === reqId) {
              obs.removeMessageHandler(handler); // cleanup ทันทีหลังรับ response
              const prevScene = msg.d.responseData?.currentProgramSceneName;
              obs.switchScene(item.obsScene);
              if (prevScene) setTimeout(() => obs.switchScene(prevScene), dur);
            }
          } catch {}
        };
        obs.addMessageHandler(handler);
        obs.ws.send(JSON.stringify({
          op: 6, d: { requestType: 'GetCurrentProgramScene', requestId: reqId, requestData: {} },
        }));
        // Safety cleanup ถ้า OBS ไม่ตอบใน 10s
        setTimeout(() => obs.removeMessageHandler(handler), 10000);
      } else {
        obs.switchScene(item.obsScene);
      }
    }

    // Activate / deactivate source
    // setSourceVisible ใหม่จะ: GetSceneItemId → SetSceneItemEnabled (ถูกต้องกับ OBS WS v5)
    // ถ้า obsScene ว่าง → ต้อง query current scene ก่อน
    if (item.types?.includes('activate_obs_source') && item.obsSource) {
      const returnMs = item.obsSourceReturn ? dur : 0;
      if (item.obsScene) {
        // ทราบ scene แน่ชัด — ใช้โดยตรง
        obs.setSourceVisible(item.obsScene, item.obsSource, true, returnMs);
      } else if (obs.ready && obs.ws) {
        // ไม่รู้ scene → query current program scene ก่อน
        const reqId = 'gcp_src_' + Date.now();
        const handler = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.op === 7 && msg.d.requestId === reqId) {
              obs.removeMessageHandler(handler);
              const currentScene = msg.d.responseData?.currentProgramSceneName;
              if (currentScene) obs.setSourceVisible(currentScene, item.obsSource, true, returnMs);
            }
          } catch {}
        };
        obs.addMessageHandler(handler);
        obs.ws.send(JSON.stringify({
          op: 6, d: { requestType: 'GetCurrentProgramScene', requestId: reqId, requestData: {} },
        }));
        setTimeout(() => obs.removeMessageHandler(handler), 10000);
      }
    }
  }, []);

  // ── Audio URL → ผ่าน backend proxy เพื่อหลีกเลี่ยง CORS + CORP ของ file hosts ──
  // litter.catbox.moe ส่ง Cross-Origin-Resource-Policy: same-site → บล็อก <audio> cross-origin
  // proxy ของเราเพิ่ม CORP: cross-origin ให้ก่อนส่งต่อ
  const PROXY_HOSTS = ['files.catbox.moe', 'litter.catbox.moe', 'uguu.se', 'h.uguu.se', 'a.uguu.se'];
  const toProxiedUrl = (url) => {
    if (!url) return url;
    try {
      const { hostname } = new URL(url);
      if (PROXY_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) {
        return `${BACKEND_URL}/api/filehost/audio-proxy?url=${encodeURIComponent(url)}`;
      }
    } catch {}
    return url;
  };

  // ── Play audio via HTMLAudioElement ─────────────────────────────────────────
  // volume: 0-100 (จาก action.volume) → แปลงเป็น 0.0-1.0 ก่อนใส่ audio.volume
  const playAudio = useCallback((url, volume = 100) => {
    if (!url) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const src   = toProxiedUrl(url);
    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0, (volume ?? 100) / 100));
    audio.play()
      .then(() => { setAudioLocked(false); pendingAudioRef.current = null; })
      .catch(() => {
        // บล็อกโดย autoplay policy → เก็บรอ unlock
        pendingAudioRef.current = { url, volume }; // url เดิม (ไม่ใช่ proxied) + volume
        setAudioLocked(true);
      });
    audioRef.current = audio;
  }, []);

  // ── Show item (internal) — รับ onDone callback เรียกเมื่อ item จบ ──
  // หมายเหตุ: TTS ถูกย้ายไปเล่นใน Actions & Events page โดยตรงแล้ว
  //           widget นี้รับผิดชอบเฉพาะ visual (GIF/รูป/วิดีโอ) + เสียงจากไฟล์ (play_audio)
  const showItem = useCallback((item, onDone) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isPlayingRef.current = true;
    setItem(item);

    // Fade in
    requestAnimationFrame(() => setVisible(true));

    // Play audio (ไฟล์ MP3/WAV — ยังเล่นใน OBS browser source ตามเดิม)
    if (item.types?.includes('play_audio') && item.audioUrl) playAudio(item.audioUrl, item.volume);

    // TTS → ย้ายไปเล่นที่ Actions & Events page แล้ว (ผ่าน socket obs_action)
    // ไม่ต้องเล่นที่นี่อีก

    // OBS commands: ไม่ execute จาก overlay — ใช้ dashboard Socket.IO เท่านั้น

    // Auto-hide after displayDuration → เรียก onDone เพื่อ trigger รายการถัดไป
    const dur = (item.displayDuration || 5) * 1000;
    timerRef.current = setTimeout(() => {
      const done = () => { isPlayingRef.current = false; onDone?.(); };
      if (item.fadeInOut) {
        setVisible(false);
        setTimeout(() => { setItem(null); done(); }, 600);
      } else {
        setItem(null);
        done();
      }
    }, dur);
  }, [playAudio, executeObs]);

  // ── playNextRef: เรียกรายการถัดไปจาก localQueue ────────────────────────────
  // ใช้ ref แทน useCallback เพื่อหลีกเลี่ยง circular dep (showItem → onDone → playNext → showItem)
  useEffect(() => {
    playNextRef.current = () => {
      const next = localQueueRef.current.shift();
      if (next) showItem(next, () => playNextRef.current?.());
    };
  }, [showItem]);

  // ── enqueueItem — public entry point สำหรับ Socket.IO / HTTP ──────────────
  // - ถ้าไม่มีอะไรเล่นอยู่: เล่นทันที
  // - ถ้ามีอยู่แล้ว: ต่อคิว (ถ้าไม่เกิน maxQ)
  // - ถ้าคิวเต็ม: drop ทิ้ง (ไม่รับ)
  const enqueueItem = useCallback((item) => {
    if (!isPlayingRef.current) {
      showItem(item, () => playNextRef.current?.());
    } else {
      if (localQueueRef.current.length >= maxQ) return; // คิวเต็ม → drop
      localQueueRef.current.push(item);
    }
  }, [showItem, maxQ]);

  // ── Drain queue (HTTP) — ใช้ตอน connect/reconnect เพื่อ flush items ที่อาจค้างอยู่ ──
  const drainQueue = useCallback(async () => {
    // ป้องกัน concurrent calls — drainQueue ถูกเรียกทั้งตอน mount (line ล่าง) และใน widget_joined
    // ถ้าทั้ง 2 request วิ่งพร้อมกัน Firestore อาจ return item เดียวกันให้ทั้งคู่ก่อนที่ใครจะลบ
    if (isDrainingRef.current) return;
    isDrainingRef.current = true;
    try {
      const isCid     = /^\d{4,8}$/.test(vid);
      const overlayUrl = isCid
        ? `${BACKEND_URL}/api/actions/overlay?cid=${vid}&screen=${screen}`
        : `${BACKEND_URL}/api/actions/overlay/${vid}?screen=${screen}`;
      const res  = await fetch(overlayUrl);
      const data = await res.json();
      if (data.item) {
        // dedup 2 ทิศ — ไม่ว่า socket หรือ drainQueue มาก่อน ฝั่งที่มาทีหลังจะเห็น nonce แล้วข้าม
        if (data.item.nonce) {
          if (seenNonces.current.has(data.item.nonce)) {
            seenNonces.current.delete(data.item.nonce); // cleanup
          } else {
            seenNonces.current.add(data.item.nonce); // mark ก่อน enqueue
            enqueueItem(data.item);
          }
        } else {
          enqueueItem(data.item); // ไม่มี nonce → เล่นตามปกติ
        }
      }
    } catch {}
    finally {
      isDrainingRef.current = false;
    }
  }, [vid, screen, enqueueItem]);

  // ── Socket.IO push (primary) + HTTP fallback polling ──
  useEffect(() => {
    if (!vid) return;

    // ── Socket.IO: รับ action ทันทีแทน polling ──
    // StrictMode fix: autoConnect:false + setTimeout(0) ป้องกัน WS error ตอน dev
    const socket = io(BACKEND_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join widget room ด้วย cid (format ใหม่) หรือ token (backward compat)
      const isCid = /^\d{4,8}$/.test(vid);
      socket.emit('join_widget', isCid ? { cid: vid } : { widgetToken: vid });
    });

    socket.on('widget_joined', () => {
      socketReady.current = true;
      // Drain queue ทันทีหลัง join เพื่อ flush items ที่ค้างระหว่าง socket ไม่ได้ connected
      drainQueue();
      // หยุด fallback polling เพราะ socket พร้อมแล้ว
      clearInterval(pollRef.current);
      pollRef.current = null;
    });

    socket.on('new_action', (item) => {
      // filter screen — backend ส่งมาทุก screen ใน room เดียวกัน
      if ((item.screen ?? 1) !== screen) return;
      // dedup 2 ทิศ — ถ้า drainQueue เล่นไปก่อนแล้ว (seenNonces มี nonce นี้) → ข้าม
      if (item.nonce) {
        if (seenNonces.current.has(item.nonce)) {
          seenNonces.current.delete(item.nonce); // cleanup
          return;
        }
        seenNonces.current.add(item.nonce); // mark ก่อน enqueue
      }
      enqueueItem(item);
    });

    // Preload media ล่วงหน้า — เพื่อให้เล่นได้ทันทีโดยไม่รอ download
    socket.on('preload_media', ({ urls = [] }) => {
      urls.forEach(({ url, type }) => {
        if (!url || typeof url !== 'string') return;
        try {
          if (type === 'video') {
            const v = document.createElement('video');
            v.preload = 'auto';
            v.muted   = true;
            v.src     = url;
            v.load();
          } else if (type === 'audio') {
            // Preload ด้วย <audio> element — ไม่ต้องการ CORS, ใช้ media-src CSP
            const a = document.createElement('audio');
            a.preload = 'auto';
            a.src     = url;
            a.load();
          } else if (type === 'image') {
            const img = new Image();
            img.src   = url;
          }
        } catch {}
      });
    });

    socket.on('disconnect', () => {
      socketReady.current = false;
      // Socket หลุด → เปิด fallback polling จนกว่าจะ reconnect สำเร็จ
      if (!pollRef.current) {
        pollRef.current = setInterval(drainQueue, POLL_MS);
      }
    });

    socket.on('widget_error', () => {
      // join ล้มเหลว (cid ผิด ฯลฯ) → fall back ไป polling เต็มๆ
      if (!pollRef.current) {
        pollRef.current = setInterval(drainQueue, POLL_MS);
      }
    });

    // Drain queue ทันทีที่เปิด widget (ก่อน socket join สำเร็จ)
    drainQueue();

    // StrictMode: connect ผ่าน setTimeout(0) ป้องกัน cleanup ก่อน handshake
    const _timer = setTimeout(() => socket.connect(), 0);

    return () => {
      clearTimeout(_timer);
      clearInterval(pollRef.current);
      pollRef.current = null;
      socketReady.current = false;
      socket.disconnect();
    };
  }, [vid, screen, enqueueItem, drainQueue]);

  // ── YouTube embed URL ──
  const getYtEmbed = (url) => {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=0&controls=0` : url;
  };

  if (!item) return (
    <div style={{ background: 'transparent', width: '100vw', height: '100vh' }} />
  );

  const isYt = item.videoUrl?.includes('youtube') || item.videoUrl?.includes('youtu.be');

  return (
    <>
      <Head>
        <title>Actions Overlay</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: transparent !important; overflow: hidden; }
          .fade { transition: opacity 0.5s ease, transform 0.5s ease; }
          .fade-in  { opacity: 1; transform: scale(1); }
          .fade-out { opacity: 0; transform: scale(0.95); }
        `}</style>
      </Head>

      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', position: 'relative' }}>

        {/* Picture / GIF */}
        {item.types?.includes('show_picture') && item.pictureUrl && (
          <img
            src={item.pictureUrl} alt=""
            className={`fade ${visible ? 'fade-in' : 'fade-out'}`}
            style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain', position: 'absolute', borderRadius: 12 }}
          />
        )}

        {/* Video */}
        {item.types?.includes('play_video') && item.videoUrl && (
          isYt ? (
            <iframe
              src={getYtEmbed(item.videoUrl)}
              className={`fade ${visible ? 'fade-in' : 'fade-out'}`}
              style={{ width: '80%', maxWidth: 640, aspectRatio: '16/9', border: 'none', borderRadius: 12, position: 'absolute' }}
              allow="autoplay"
            />
          ) : (
            <video
              src={item.videoUrl} autoPlay muted={false} controls={false}
              className={`fade ${visible ? 'fade-in' : 'fade-out'}`}
              style={{ maxWidth: '80%', maxHeight: '80%', borderRadius: 12, position: 'absolute' }}
            />
          )
        )}

        {/* Alert */}
        {item.types?.includes('show_alert') && item.alertText && (
          <div
            className={`fade ${visible ? 'fade-in' : 'fade-out'}`}
            style={{
              position: 'absolute', bottom: 60, left: '50%', transform: visible ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.95)',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(79,70,229,0.95))',
              color: '#fff', padding: '14px 28px', borderRadius: 999,
              fontSize: 22, fontWeight: 700, textAlign: 'center',
              boxShadow: '0 8px 32px rgba(124,58,237,0.6)',
              maxWidth: '85%', backdropFilter: 'blur(8px)',
              fontFamily: 'system-ui, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              whiteSpace: 'pre-wrap',
            }}>
            {item.alertText}
          </div>
        )}
      </div>
    </>
  );
}
