// widget/chat.js — Chat Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 600
// คลิกข้อความเพื่อ Pin ไปยัง widget/pinchat ผ่าน BroadcastChannel
import { useEffect, useState, useRef } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
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
let pinChannel      = null;
let pinChannelError = false;
function getPinChannel() {
  if (pinChannelError) return null;
  if (!pinChannel && typeof BroadcastChannel !== 'undefined') {
    try { pinChannel = new BroadcastChannel('ttplus_pinchat'); }
    catch { pinChannelError = true; return null; }
  }
  return pinChannel;
}

let _msgSeq = 0; // counter สำหรับ unique key — ไม่เปลี่ยนเมื่อ slice

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [styles, setStyles]     = useState(null);
  const stylesRef               = useRef(null);
  const bottomRef               = useRef(null); // anchor สำหรับ scroll to bottom
  const topRef                  = useRef(null); // anchor สำหรับ scroll to top (dir=up)

  // scroll ไปหา anchor เมื่อ messages เปลี่ยน
  useEffect(() => {
    const dir = stylesRef.current?.dir ?? 'down';
    if (dir === 'up') {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'chat');
    setStyles(s);
    stylesRef.current = s;

    // addMsg: เพิ่มข้อความใหม่เข้า array (newest always at end)
    const addMsg = (msg, currentMax) => {
      setMessages(prev => [...prev.slice(-(currentMax - 1)), msg]);
    };

    if (isPreview) {
      const preview = [
        { _key: ++_msgSeq, uniqueId: 'u1', nickname: 'น้องแมว',    comment: 'สวัสดีครับ! 🐱',    ts: Date.now() - 5000 },
        { _key: ++_msgSeq, uniqueId: 'u2', nickname: 'TTsamFan',   comment: 'ไลฟ์สนุกมากเลย 🎉', ts: Date.now() - 3000 },
        { _key: ++_msgSeq, uniqueId: 'u3', nickname: 'Hello_World', comment: '555555 ขำมากก',      ts: Date.now() - 1000 },
      ];
      setMessages(preview);
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      chat: (data) => {
        const safe = sanitizeEvent(data);
        const cur = stylesRef.current || s;
        addMsg({ ...safe, _key: ++_msgSeq, ts: Date.now() }, cur.max);
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'chat') return;
        const next = rawToStyle(style, 'chat');
        stylesRef.current = next;
        setStyles(next);
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

  // dir === 'down' (default): column ปกติ → newest อยู่ล่างสุด scroll to bottom
  // dir === 'up': column ปกติ → newest อยู่บนสุด (reverse array) scroll to top
  const isUp        = styles.dir === 'up';
  const displayMsgs = isUp ? [...messages].reverse() : messages;
  const animName    = isUp ? 'slideDown' : 'slideUp';

  return (
    <div
      style={{
        background:      'transparent',
        padding:         10,
        maxWidth:        400,
        height:          '100vh',
        overflowY:       'auto',
        display:         'flex',
        flexDirection:   'column',
        justifyContent:  isUp ? 'flex-start' : 'flex-end',
        gap:             5,
        boxSizing:       'border-box',
        scrollbarWidth:  'none',
        transform:       styles.transform3D,
        transformOrigin: 'center center',
        transformStyle:  'preserve-3d',
      }}
    >
      {/* anchor บนสุด (สำหรับ dir=up) */}
      <div ref={topRef} style={{ flexShrink: 0 }} />

      {displayMsgs.map((msg) => (
        <div
          key={msg._key}
          onClick={() => pinMessage(msg)}
          title="คลิกเพื่อ Pin ข้อความนี้"
          style={{
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
            animation:    `${animName} 0.3s ease-out both`,
            background:   styles.bgRgba,
            borderRadius: styles.br,
            padding:      '6px 10px',
            borderLeft:   `3px solid ${getUserColor(msg.uniqueId)}`,
            cursor:       'pointer',
            flexShrink:   0,
            boxSizing:    'border-box',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <span style={{ color: getUserColor(msg.uniqueId), fontWeight: 700, fontSize: styles.fs, fontFamily: 'sans-serif' }}>
              {msg.nickname || msg.uniqueId}
            </span>
            <span style={{ color: styles.tc, fontSize: styles.fs, fontFamily: 'sans-serif', marginLeft: 6 }}>
              {msg.comment}
            </span>
          </div>
        </div>
      ))}

      {/* anchor ล่างสุด (สำหรับ dir=down) */}
      <div ref={bottomRef} style={{ flexShrink: 0 }} />

      <style>{`
        div::-webkit-scrollbar { display: none; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
