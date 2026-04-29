// widget/pk.js — PK Battle Video Overlay
// OBS Size: 720 × 1280 (portrait 9:16, 720p) — transparent background
// รับ pk_play event จาก socket → เล่นวิดีโอทับ scene
// WebM: โปร่งใสจริง (alpha channel) / MP4: ต้อง chroma key ใน OBS

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { createWidgetSocket } from '../../lib/widgetSocket';

const W = 720;
const H = 1280;

export default function PKWidget() {
  const [videoUrl,  setVideoUrl]  = useState(null);
  const [videoType, setVideoType] = useState('mp4');
  const [visible,   setVisible]   = useState(false);
  const videoRef   = useRef(null);
  const hideTimer  = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid    = params.get('cid') ?? params.get('wt');

    function play({ videoUrl: url, videoType: type }) {
      if (!url) return;
      // ยกเลิก hide timer เก่า (กรณีเล่นวิดีโอใหม่ก่อนวิดีโอเก่าจบ)
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setVideoUrl(url);
      setVideoType(type || 'mp4');
      setVisible(true);
    }

    let socket = null;

    // Preview mode — เล่น demo loop ไม่ต้อง socket
    if (params.get('preview') === '1') {
      const demoUrl  = params.get('demo') || '';
      const demoType = params.get('type') || 'mp4';
      if (demoUrl) setTimeout(() => play({ videoUrl: demoUrl, videoType: demoType }), 500);
      return;
    }

    if (cid) {
      socket = createWidgetSocket(cid, {
        pk_play: play,
      });
    }

    return () => {
      if (socket) socket.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // เมื่อ videoUrl เปลี่ยน → เล่นใหม่
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;
    video.load();
    video.play().catch(() => {});
  }, [videoUrl]);

  function onEnded() {
    // Fade out หลังวิดีโอจบ
    setVisible(false);
    hideTimer.current = setTimeout(() => {
      setVideoUrl(null);
    }, 600); // รอ fade-out animation เสร็จ
  }

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
            key={videoUrl}              /* key เปลี่ยน → React สร้าง element ใหม่ → load + play อัตโนมัติ */
            onEnded={onEnded}
            playsInline
            preload="auto"
            style={{
              position:        'absolute',
              inset:           0,
              width:           '100%',
              height:          '100%',
              objectFit:       'contain',
              background:      'transparent',
              animation:       visible
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
