// widget/pk.js — PK Battle Video Overlay
// OBS Size: 720 × 1280 (portrait 9:16, 720p) — transparent background
// รับ pk_play event จาก socket → เล่นวิดีโอทับ scene พร้อมระบบ Queue (สูงสุด 10)
// WebM: โปร่งใสจริง (alpha channel) / MP4: ต้อง chroma key ใน OBS

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { createWidgetSocket } from '../../lib/widgetSocket';

const W             = 720;
const H             = 1280;
const MAX_QUEUE     = 10;    // จำนวนคิวสูงสุด
const GAP_MS        = 30;    // ms รอหลังวิดีโอจบก่อนเล่นชิ้นต่อไป

export default function PKWidget() {
  const [videoUrl,  setVideoUrl]  = useState(null);
  const [videoType, setVideoType] = useState('mp4');
  const [visible,   setVisible]   = useState(false);

  const videoRef    = useRef(null);
  const hideTimer   = useRef(null);
  const gapTimer    = useRef(null);

  // Queue state — ใช้ ref เพื่อไม่ให้ closure stale ใน event handler
  const queueRef    = useRef([]);   // [{ url, type }]
  const playingRef  = useRef(false);

  // ── เล่น item ต่อไปในคิว ───────────────────────────────────────────────
  function playNext() {
    if (queueRef.current.length === 0) {
      playingRef.current = false;
      return;
    }
    playingRef.current = true;
    const { url, type } = queueRef.current.shift();

    if (hideTimer.current) clearTimeout(hideTimer.current);

    setVideoUrl(url);
    setVideoType(type || 'mp4');
    setVisible(true);
  }

  // ── วิดีโอจบ → รอ GAP_MS แล้วเล่นต่อ ─────────────────────────────────
  function onEnded() {
    setVisible(false);
    hideTimer.current = setTimeout(() => {
      setVideoUrl(null);
      // รอ fade-out เสร็จ (600ms) แล้ว + GAP ก่อนเล่นต่อ
    }, 600);
    gapTimer.current = setTimeout(() => {
      playNext();
    }, 600 + GAP_MS);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid    = params.get('cid') ?? params.get('wt');

    // ── รับ event pk_play → เข้าคิว ──────────────────────────────────────
    function onPkPlay({ videoUrl: url, videoType: type }) {
      if (!url) return;

      // คิวเต็ม → ทิ้ง
      if (queueRef.current.length >= MAX_QUEUE) return;

      queueRef.current.push({ url, type: type || 'mp4' });

      // ถ้ายังไม่มีอะไรเล่นอยู่ → เริ่มเลย
      if (!playingRef.current) {
        playNext();
      }
    }

    // Preview mode — เล่น demo loop ไม่ต้อง socket
    if (params.get('preview') === '1') {
      const demoUrl  = params.get('demo') || '';
      const demoType = params.get('type') || 'mp4';
      if (demoUrl) setTimeout(() => onPkPlay({ videoUrl: demoUrl, videoType: demoType }), 500);
      return;
    }

    let socket = null;
    if (cid) {
      socket = createWidgetSocket(cid, { pk_play: onPkPlay });
    }

    return () => {
      if (socket) socket.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (gapTimer.current)  clearTimeout(gapTimer.current);
    };
  }, []);

  // เมื่อ videoUrl เปลี่ยน → สั่ง play
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;
    video.load();
    video.play().catch(() => {});
  }, [videoUrl]);

  return (
    <>
      <Head>
        <title>PK Overlay</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            background: transparent !important;
            overflow: hidden;
            width: ${W}px; height: ${H}px;
          }
          @keyframes pkFadeIn  { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          @keyframes pkFadeOut { from { opacity: 1; transform: scale(1); }   to { opacity: 0; transform: scale(1.03); } }
        `}</style>
      </Head>

      <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: 'transparent' }}>
        {videoUrl && (
          <video
            ref={videoRef}
            key={videoUrl}
            onEnded={onEnded}
            playsInline
            preload="auto"
            style={{
              position:   'absolute',
              inset:      0,
              width:      '100%',
              height:     '100%',
              objectFit:  'contain',
              background: 'transparent',
              animation:  visible
                ? 'pkFadeIn 0.25s ease-out forwards'
                : 'pkFadeOut 0.5s ease-in forwards',
            }}
          >
            <source src={videoUrl} type={videoType === 'webm' ? 'video/webm' : 'video/mp4'} />
          </video>
        )}
      </div>
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
