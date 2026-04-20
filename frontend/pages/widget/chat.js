// widget/chat.js — Chat Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 600
import { useEffect, useState } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

// สีสำหรับแต่ละ user (กำหนดแบบ deterministic จาก uniqueId)
// ใช้ Map + จำกัดขนาดไว้ที่ MAX_COLOR_MAP เพื่อป้องกัน memory leak บน live stream ยาวๆ
const PALETTE = ['#ff2d62','#ff6b35','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
const MAX_COLOR_MAP = 150;
const colorMap = new Map();
let colorIdx = 0;
function getUserColor(id) {
  if (!id) return PALETTE[0];
  if (!colorMap.has(id)) {
    if (colorMap.size >= MAX_COLOR_MAP) {
      // LRU approximation: ลบ entry แรกสุดออกเมื่อ map เต็ม
      colorMap.delete(colorMap.keys().next().value);
    }
    colorMap.set(id, PALETTE[colorIdx++ % PALETTE.length]);
  }
  return colorMap.get(id);
}

const MAX_MESSAGES = 12;

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [styles, setStyles]     = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const widgetToken = params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'chat');
    setStyles(s);

    if (isPreview) {
      setMessages([
        { uniqueId: 'u1', nickname: 'น้องแมว',    comment: 'สวัสดีครับ! 🐱',       ts: Date.now() - 5000 },
        { uniqueId: 'u2', nickname: 'TTplusFan',   comment: 'ไลฟ์สนุกมากเลย 🎉',    ts: Date.now() - 3000 },
        { uniqueId: 'u3', nickname: 'Hello_World', comment: '555555 ขำมากก',         ts: Date.now() - 1000 },
      ]);
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      chat: (data) => {
        const safe = sanitizeEvent(data);
        setMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), { ...safe, ts: Date.now() }]);
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{ background: 'transparent', padding: 10, display: 'flex', flexDirection: 'column', gap: 5, minHeight: 200 }}>
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            display:     'flex',
            alignItems:  'flex-start',
            gap:         8,
            animation:   'fadeUp 0.3s ease-out',
            background:  styles.bgRgba,
            borderRadius: styles.br,
            padding:     '6px 10px',
            borderLeft:  `3px solid ${getUserColor(msg.uniqueId)}`,
          }}
        >
          <div style={{ flex: 1, wordBreak: 'break-word' }}>
            <span style={{ color: getUserColor(msg.uniqueId), fontWeight: 700, fontSize: styles.fs, fontFamily: 'sans-serif' }}>
              {msg.nickname || msg.uniqueId}
            </span>
            <span style={{ color: styles.tc, fontSize: styles.fs, fontFamily: 'sans-serif', marginLeft: 6 }}>
              {msg.comment}
            </span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
