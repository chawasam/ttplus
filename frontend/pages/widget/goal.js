// widget/goal.js — Goal Bar Overlay สำหรับ OBS
// OBS Size แนะนำ: 500 x 80
import { useEffect, useState } from 'react';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { sanitizeEvent } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function GoalWidget() {
  const [current, setCurrent] = useState(0);
  const [target, setTarget]   = useState(100);
  const [label, setLabel]     = useState('Diamond Goal');
  const [styles, setStyles]   = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'goal');
    setStyles(s);

    if (params.get('target')) setTarget(Math.max(1, +params.get('target')));
    if (params.get('label'))  {
      try { setLabel(decodeURIComponent(params.get('label')).slice(0, 80)); }
      catch { setLabel('Goal'); }
    }

    if (isPreview) { setCurrent(65); return; }

    const socket = createWidgetSocket(wt, {
      gift: (data) => {
        const safe = sanitizeEvent(data);
        setCurrent(c => Math.min(c + safe.diamondCount * safe.repeatCount, target));
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const pct = Math.min((current / Math.max(target, 1)) * 100, 100);

  return (
    <div style={{
      background:   styles.bgRgba,
      borderRadius: styles.br,
      padding:      '10px 16px',
      fontFamily:   'sans-serif',
      minWidth:     360,
    }}>
      {/* Label + numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ color: styles.tc, fontSize: styles.fs, fontWeight: 600 }}>
          🎯 {label}
        </span>
        <span style={{ color: styles.ac, fontSize: styles.fs - 2, fontWeight: 700 }}>
          💎 {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>

      {/* Progress bar track */}
      <div style={{ background: styles.tc + '22', borderRadius: styles.br, height: 14, overflow: 'hidden' }}>
        <div style={{
          background:    `linear-gradient(90deg, ${styles.ac}, ${styles.ac}bb)`,
          width:         `${pct}%`,
          height:        '100%',
          borderRadius:  styles.br,
          transition:    'width 0.5s ease',
        }} />
      </div>

      {/* Percentage */}
      <div style={{ textAlign: 'right', color: styles.tc + '88', fontSize: styles.fs - 3, marginTop: 3 }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
