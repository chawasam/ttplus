// pages/widget/myactions.js — Overlay widget สำหรับ OBS Browser Source
// URL: /widget/myactions?vjId=UID&screen=1
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
  const { vjId, screen: screenParam } = router.query;
  const screen   = parseInt(screenParam) || 1;

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
    // Switch scene
    if (item.obsScene) {
      obs.switchScene(item.obsScene);
      if (item.obsSceneDuration > 0) {
        setTimeout(() => {
          // กลับ scene เดิม (ไม่รู้ชื่อ scene เดิม — ใช้ GetCurrentProgramScene ก่อน แต่ทำแบบง่ายก่อน)
          obs.send('GetCurrentProgramScene', {});
        }, item.obsSceneDuration * 1000);
      }
    }
    // Activate source
    if (item.obsSource) {
      obs.setSourceVisible(item.obsScene || '', item.obsSource, true);
      if (item.obsSourceDuration > 0) {
        setTimeout(() => obs.setSourceVisible(item.obsScene || '', item.obsSource, false),
          item.obsSourceDuration * 1000);
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
    if (!vjId) return;
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/actions/overlay/${vjId}?screen=${screen}`);
        const data = await res.json();
        if (data.item) showItem(data.item);
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [vjId, screen, showItem]);

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
