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
  constructor() { this.ws = null; this.ready = false; }
  connect(host = 'localhost', port = 4455, password = '') {
    try {
      this.ws = new WebSocket(`ws://${host}:${port}`);
      this.ws.onopen = () => { this.ready = true; };
      this.ws.onclose = () => { this.ready = false; setTimeout(() => this.connect(host, port, password), 5000); };
      this.ws.onerror = () => {};
    } catch {}
  }
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
  setSourceVisible(sceneName, sourceName, visible) {
    this.send('SetSceneItemEnabled', { sceneName, sceneItemName: sourceName, sceneItemEnabled: visible });
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
    // Overlay อ่าน OBS host จาก query param ถ้ามี (เพิ่ม ?obsHost=localhost&obsPort=4455)
    const host = router.query.obsHost || 'localhost';
    const port = parseInt(router.query.obsPort) || 4455;
    obsRef.current.connect(host, port);
  }, [router.query.obsHost, router.query.obsPort]);

  // ── Execute OBS commands ──
  const executeObs = useCallback((item) => {
    const obs = obsRef.current;
    const dur = (item.displayDuration || 5) * 1000;

    // Switch scene
    if (item.types?.includes('switch_obs_scene') && item.obsScene) {
      if (item.obsSceneReturn && obs.ws && obs.ready) {
        // Get current scene first, then switch, then return after duration
        const reqId = 'gcp_' + Date.now();
        const origHandler = obs.ws.onmessage;
        obs.ws.onmessage = (evt) => {
          if (origHandler) origHandler(evt);
          try {
            const msg = JSON.parse(evt.data);
            if (msg.op === 7 && msg.d.requestId === reqId) {
              const prevScene = msg.d.responseData?.currentProgramSceneName;
              obs.switchScene(item.obsScene);
              if (prevScene) setTimeout(() => obs.switchScene(prevScene), dur);
              obs.ws.onmessage = origHandler; // restore
            }
          } catch {}
        };
        obs.ws.send(JSON.stringify({
          op: 6, d: { requestType: 'GetCurrentProgramScene', requestId: reqId, requestData: {} },
        }));
      } else {
        obs.switchScene(item.obsScene);
      }
    }

    // Activate / deactivate source
    if (item.types?.includes('activate_obs_source') && item.obsSource) {
      obs.setSourceVisible(item.obsScene || '', item.obsSource, true);
      if (item.obsSourceReturn) {
        setTimeout(() => obs.setSourceVisible(item.obsScene || '', item.obsSource, false), dur);
      }
    }
  }, []);

  // ── Play audio ──
  const playAudio = useCallback((url) => {
    if (!url) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(url);
    audio.volume = 0.9;
    audio.play().catch(() => {});
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

    // OBS commands
    executeObs(item);

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
