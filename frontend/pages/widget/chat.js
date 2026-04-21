// widget/chat.js — Chat Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 600
// คลิกข้อความเพื่อ Pin ไปยัง widget/pinchat ผ่าน BroadcastChannel
import { useEffect, useState } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

const PALETTE = ['#ff2d62','#ff6b35','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
const MAX_COLOR_MAP = 150;
const colorMap = new Map();
let colorIdx = 0;
function getUserColor(id) {
  if (!id) return PALETTE[0];
  if (!colorMap.has(id)) {
    if (colorMap.size >= MAX_COLOR_MAP) {
      colorMap.delete(colorMap.keys().next().value);
    }
    colorMap.set(id, PALETTE[colorIdx++ % PALETTE.length]);
  }
  return colorMap.get(id);
}

// BroadcastChannel สำหรับส่งข้อความ pin ไปยัง pinchat widget
let pinChannel = null;
function getPinChannel() {
  if (!pinChannel && typeof BroadcastChannel !== 'undefined') {
    try { pinChannel = new BroadcastChannel('ttplus_pinchat'); } catch { /* ไม่รองรับ */ }
  }
  return pinChannel;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [styles, setStyles]     = useState(null);

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'chat');
    setStyles(s);

    const addMsg = (msg, currentDir, currentMax) => {
      if (currentDir === 'up') {
        setMessages(prev => [msg, ...prev.slice(0, currentMax - 1)]);
      } else {
        setMessages(prev => [...prev.slice(-(currentMax - 1)), msg]);
      }
    };

    if (isPreview) {
      const preview = [
        { uniqueId: 'u1', nickname: 'น้องแมว',    comment: 'สวัสดีครับ! 🐱',    ts: Date.now() - 5000 },
        { uniqueId: 'u2', nickname: 'TTplusFan',   comment: 'ไลฟ์สนุกมากเลย 🎉', ts: Date.now() - 3000 },
        { uniqueId: 'u3', nickname: 'Hello_World', comment: '555555 ขำมากก',      ts: Date.now() - 1000 },
      ];
      setMessages(s.dir === 'up' ? [...preview].reverse() : preview);
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      chat: (data) => {
        const safe = sanitizeEvent(data);
        addMsg({ ...safe, ts: Date.now() }, s.dir, s.max);
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  const pinMessage = (msg) => {
    const ch = getPinChannel();
    if (ch) {
      ch.postMessage({
        type: 'pin',
        message: {
          uniqueId: msg.uniqueId,
          nickname: msg.nickname,
          comment:  msg.comment,
          color:    getUserColor(msg.uniqueId),
        },
      });
    }
  };

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const animName = styles.dir === 'up' ? 'fadeDown' : 'fadeUp';

  return (
    <div style={{ background: 'transparent', padding: 10, display: 'flex', flexDirection: 'column', gap: 5, minHeight: 200 }}>
      {messages.map((msg, i) => (
        <div
          key={`${msg.ts}-${i}`}
          onClick={() => pinMessage(msg)}
          title="คลิกเพื่อ Pin ข้อความนี้"
          style={{
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
            animation:    `${animName} 0.3s ease-out`,
            background:   styles.bgRgba,
            borderRadius: styles.br,
            padding:      '6px 10px',
            borderLeft:   `3px solid ${getUserColor(msg.uniqueId)}`,
            cursor:       'pointer',
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
        @keyframes fadeUp   { from { opacity:0; transform:translateY(6px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
