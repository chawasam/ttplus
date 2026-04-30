// pages/widget/myactions.js — Overlay widget สำหรับ OBS Browser Source
// URL: /widget/myactions?cid=12345&screen=1  (format ใหม่)
//      /widget/myactions?vjId=UID&screen=1   (backward compat)
// Poll action queue ทุก 1.5 วิ → แสดง GIF/รูป/วิดีโอ/alert บน stream
// OBS WebSocket: รับ obsScene/obsSource commands แล้ว execute ผ่าน ws://localhost:4455

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 1500;

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

  const [item,     setItem]     = useState(null); // current action to display
  const [visible,  setVisible]  = useState(false); // fade in/out
  const obsRef    = useRef(new ObsWs());
  const timerRef  = useRef(null);
  const pollRef   = useRef(null);
  const audioRef  = useRef(null);

  // ── Connect OBS WebSocket (ถ้ามี obsScene/obsSource ใน action) ──
  useEffect(() => {
    const obs  = obsRef.current;
    const host = router.query.obsHost || 'localhost';
    const port = parseInt(router.query.obsPort) || 4455;
    obs.connect(host, port);
    // cleanup: ปิด socket + หยุด reconnect loop เมื่อ unmount
    return () => obs.destroy();
  }, [router.query.obsHost, router.query.obsPort]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Play audio ──
  const playAudio = useCallback((url) => {
    if (!url) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(url);
    audio.volume = 0.9;
    audio.play().catch((e) => { console.warn('[MyActions] audio play failed:', e?.message); });
    audioRef.current = audio;
  }, []);

  // ── TTS ──
  const readTts = useCallback((text) => {
    if (!text || typeof window === 'undefined') return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'th-TH';
    utt.rate = 1.0;
    window.speechSynthesis.speak(utt);
  }, []);

  // ── Show item ──
  const showItem = useCallback((item) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setItem(item);

    // Fade in
    requestAnimationFrame(() => setVisible(true));

    // Play audio
    if (item.types?.includes('play_audio') && item.audioUrl) playAudio(item.audioUrl);

    // TTS
    if (item.types?.includes('read_tts') && item.ttsText) readTts(item.ttsText);

    // OBS commands: ไม่ execute จาก overlay — ใช้ dashboard Socket.IO เท่านั้น

    // Auto-hide after displayDuration
    const dur = (item.displayDuration || 5) * 1000;
    timerRef.current = setTimeout(() => {
      if (item.fadeInOut) {
        setVisible(false);
        setTimeout(() => setItem(null), 600);
      } else {
        setItem(null);
      }
    }, dur);
  }, [playAudio, readTts, executeObs]);

  // ── Poll queue ──
  useEffect(() => {
    if (!vid) return;
    const poll = async () => {
      try {
        // format ใหม่: ?cid=  / format เก่า: /:vjId
        const isCid = /^\d{4,8}$/.test(vid);
        const overlayUrl = isCid
          ? `${BACKEND_URL}/api/actions/overlay?cid=${vid}&screen=${screen}`
          : `${BACKEND_URL}/api/actions/overlay/${vid}?screen=${screen}`;
        const res = await fetch(overlayUrl);
        const data = await res.json();
        if (data.item) showItem(data.item);
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [vid, screen, showItem]);

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
