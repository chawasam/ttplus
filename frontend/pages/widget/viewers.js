// widget/viewers.js — Viewer Count Overlay สำหรับ OBS
// OBS Size แนะนำ: 200 x 80
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { parseWidgetStyles } from '../../lib/widgetStyles';

export default function ViewersWidget() {
  const [count, setCount]   = useState(0);
  const [styles, setStyles] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'viewers');
    setStyles(s);

    if (isPreview) { setCount(1234); return; }

    if (!wt || !/^[a-f0-9]{64}$/.test(wt)) return;

    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });

    socket.on('connect', () => socket.emit('join_widget', { widgetToken: wt }));
    socket.on('roomUser', (data) => setCount(Math.max(0, Number(data.viewerCount) || 0)));
    socket.on('widget_error', () => socket.disconnect());

    return () => socket.disconnect();
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{
      background:   styles.bgRgba,
      borderRadius: styles.br,
      padding:      '10px 18px',
      display:      'inline-flex',
      alignItems:   'center',
      gap:          10,
      fontFamily:   'sans-serif',
    }}>
      <span style={{ fontSize: styles.fs + 6 }}>👥</span>
      <div>
        <p style={{ color: styles.tc + '99', fontSize: styles.fs - 3, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
          Viewers
        </p>
        <p style={{ color: styles.tc, fontSize: styles.fs + 4, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
          {count.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
