// widget/nowplaying-universal.js — Now Playing (Universal) Overlay สำหรับ OBS
// รองรับ Last.fm / Manual paste / Chrome Extension / Windows Companion (เลือก source ใน Settings)
// URL params: ?cid=xxx & options เหมือน /widget/nowplaying ทุกตัว
import { useEffect, useState, useRef } from 'react';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { BASE_CSS, DEMO_TRACK, DEFAULT_CFG, parseColor } from '../../components/nowplaying/styles';
import NPStyleSwitch from '../../components/nowplaying/StyleSwitch';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 10_000;

export default function NowPlayingUniversalWidget() {
  const [track,   setTrack]   = useState(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cfg,     setCfg]     = useState(DEFAULT_CFG);
  const prevIdRef = useRef('');
  const timerRef  = useRef(null);

  useEffect(() => {
    setMounted(true);
    const p     = new URLSearchParams(window.location.search);
    const cid   = p.get('cid') || p.get('uid');
    const style = p.get('style') || 'glass';
    const fade  = p.get('fade') !== '0';

    const fontSize     = Math.max(8, Math.min(36, parseInt(p.get('fontSize') || '13', 10)));
    const titleColor   = parseColor(p.get('titleColor'), '#fff');
    const artistColor  = parseColor(p.get('artistColor'), 'rgba(255,255,255,0.6)');
    const marquee      = p.get('marquee') === '1';
    const marqueeSpeed = Math.max(2, parseFloat(p.get('marqueeSpeed') || '8'));
    const marqueeDir   = p.get('marqueeDir') === 'right' ? 'right' : 'left';

    setCfg({ style, fade, fontSize, titleColor, artistColor, marquee, marqueeSpeed, marqueeDir });

    if (p.get('preview') === '1') {
      setTrack(DEMO_TRACK);
      setTimeout(() => setVisible(true), 100);
      return;
    }
    if (!cid) return;

    const poll = async () => {
      try {
        const isCid = /^\d{4,8}$/.test(cid);
        const qs    = isCid ? `cid=${cid}` : `uid=${cid}`;
        const res   = await fetch(`${BACKEND}/api/nowplaying/current?${qs}`);
        const data  = await res.json();
        if (!data.playing) {
          setVisible(false);
          timerRef.current = setTimeout(() => setTrack(null), 600);
          return;
        }
        const trackId = data.title + data.artist;
        if (trackId !== prevIdRef.current) {
          prevIdRef.current = trackId;
          setVisible(false);
          timerRef.current = setTimeout(() => {
            setTrack(data);
            setTimeout(() => setVisible(true), 50);
          }, 400);
        } else {
          setTrack(data);
          setVisible(true);
        }
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_MS);

    let socket = null;
    if (/^\d{4,8}$/.test(cid)) {
      socket = createWidgetSocket(cid, {
        style_update: ({ widgetId, style: newStyle }) => {
          if (widgetId !== 'nowplaying2') return;
          if (!newStyle || newStyle._reset) return;
          setCfg(prev => {
            const next = { ...prev };
            if (newStyle.style       != null) next.style        = newStyle.style       || prev.style;
            if (newStyle.fade        != null) next.fade         = newStyle.fade !== 0 && newStyle.fade !== '0' && newStyle.fade !== false;
            if (newStyle.fontSize    != null) next.fontSize     = Math.max(8, Math.min(36, parseInt(newStyle.fontSize)    || prev.fontSize));
            if (newStyle.titleColor  != null) next.titleColor   = parseColor(String(newStyle.titleColor),  prev.titleColor);
            if (newStyle.artistColor != null) next.artistColor  = parseColor(String(newStyle.artistColor), prev.artistColor);
            if (newStyle.marquee     != null) next.marquee      = newStyle.marquee === 1 || newStyle.marquee === '1' || newStyle.marquee === true;
            if (newStyle.marqueeDir  != null) next.marqueeDir   = newStyle.marqueeDir  || prev.marqueeDir;
            if (newStyle.marqueeSpeed != null) next.marqueeSpeed = Math.max(2, parseFloat(newStyle.marqueeSpeed) || prev.marqueeSpeed);
            return next;
          });
        },
      });
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timerRef.current);
      socket?.disconnect();
    };
  }, []);

  if (!mounted || !track) return <><style>{BASE_CSS}</style><div style={{ background: 'transparent' }} /></>;

  const fadeStyle = cfg.fade ? {
    WebkitMaskImage: [
      'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
    ].join(', '),
    WebkitMaskComposite: 'source-in',
    maskImage: [
      'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
    ].join(', '),
    maskComposite: 'intersect',
  } : {};

  return (
    <>
      <style>{BASE_CSS}</style>
      <div style={{
        display:    'inline-block',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity .4s ease, transform .4s ease',
        ...fadeStyle,
      }}>
        <NPStyleSwitch styleId={cfg.style} track={track} cfg={cfg} />
      </div>
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
