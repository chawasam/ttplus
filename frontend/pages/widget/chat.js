// widget/chat.js — Chat Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 600
// คลิกข้อความ → broadcast ไป Pin Chat + Pin Profile Card พร้อมกัน
import { useEffect, useState, useRef, useCallback } from 'react';
import { sanitizeEvent } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { SkinParticles } from '../../lib/chatSkins';
import SKINS from '../../lib/chatSkins';

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

let _msgSeq = 0;

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [styles, setStyles]     = useState(null);

  const stylesRef = useRef(null);
  const bottomRef = useRef(null);
  const topRef    = useRef(null);
  const socketRef = useRef(null);

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

    const addMsg = (msg, currentMax) => {
      setMessages(prev => [...prev.slice(-(currentMax - 1)), msg]);
    };

    if (isPreview) {
      const preview = [
        { _key: ++_msgSeq, uniqueId: 'u1', nickname: 'น้องแมว',    comment: 'สวัสดีครับ! 🐱',    bio: 'TikTok streamer 🎮', profilePictureUrl: '', ts: Date.now() - 5000 },
        { _key: ++_msgSeq, uniqueId: 'u2', nickname: 'TTsamFan',   comment: 'ไลฟ์สนุกมากเลย 🎉', bio: '', profilePictureUrl: '', ts: Date.now() - 3000 },
        { _key: ++_msgSeq, uniqueId: 'u3', nickname: 'Hello_World', comment: '555555 ขำมากก',      bio: 'คนดูไลฟ์ประจำ 💫',   profilePictureUrl: '', ts: Date.now() - 1000 },
      ];
      setMessages(preview);
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      chat: (data) => {
        const safe = sanitizeEvent(data);
        const cur = stylesRef.current || s;
        addMsg({ ...safe, _key: ++_msgSeq, ts: Date.now() }, cur.max);
        // ส่ง event ให้ AuroraCanvas สร้าง flash สีของผู้ส่งข้อความ
        if (cur?.skin === 'aurora') {
          window.dispatchEvent(new CustomEvent('aurora-msg', {
            detail: { color: getUserColor(safe.uniqueId) },
          }));
        }
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'chat') return;
        const next = rawToStyle(style, 'chat');
        stylesRef.current = next;
        setStyles(next);
      },
    });
    if (!socket) return;
    socketRef.current = socket;

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, []);

  // ===== คลิก bubble → broadcast ไป Pin Chat + Pin Profile Card =====
  // ใช้ทั้ง BroadcastChannel (same-browser) + Socket (cross-process / OBS)
  const pinMessage = useCallback((msg) => {
    const userColor = getUserColor(msg.uniqueId);
    const payload   = { ...msg, color: userColor };

    // BroadcastChannel — same-browser tabs (fallback / Chrome-only)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const chPin = new BroadcastChannel('ttplus_pinchat');
        chPin.postMessage({ type: 'pin', message: payload });
        chPin.close();
      } catch { /* ignore */ }
      try {
        const chProfile = new BroadcastChannel('ttplus_pinprofile');
        chProfile.postMessage({ type: 'profile', message: payload });
        chProfile.close();
      } catch { /* ignore */ }
    }

    // Socket — cross-process (OBS browser source)
    // ใช้ widget_pin_relay event ที่ backend relay ต่อไปยัง widget room
    // (ไม่ต้องการ authenticate — widget connection ก็ส่งได้)
    const sock = socketRef.current;
    if (sock?.connected) {
      try {
        sock.emit('widget_pin_relay', { widgetId: 'pinchat',    payload });
        sock.emit('widget_pin_relay', { widgetId: 'pinprofile', payload });
      } catch { /* ignore */ }
    }
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const isUp        = styles.dir === 'up';
  const displayMsgs = isUp ? [...messages].reverse() : messages;
  const animName    = isUp ? 'slideDown' : 'slideUp';
  const activeSkin  = styles.skin ? SKINS[styles.skin] : null;

  return (
    <>
      <SkinParticles skinId={styles.skin} />

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
          position:        'relative',
          zIndex:          1,
        }}
      >
        <div ref={topRef} style={{ flexShrink: 0 }} />

        {displayMsgs.map((msg) => {
          const userColor  = getUserColor(msg.uniqueId);
          const bga        = styles.raw?.bga ?? 65;
          const skinBubble = activeSkin ? activeSkin.bubbleStyle(userColor, styles.ac, bga) : {};
          const skinName   = activeSkin ? activeSkin.nameStyle(userColor, styles.ac)        : {};
          const skinText   = activeSkin ? activeSkin.textStyle(styles.ac)                   : {};
          const isStack    = styles.layout === 'stack';

          return (
            <div
              key={msg._key}
              onClick={() => pinMessage(msg)}
              title="คลิกเพื่อ Pin ข้อความ + ดูโปรไฟล์"
              className={activeSkin ? `skin-${activeSkin.id}-bubble` : undefined}
              style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        8,
                animation:  `${animName} 0.3s ease-out both`,
                background: styles.bgRgba,
                padding:    '6px 10px',
                borderLeft: `3px solid ${userColor}`,
                cursor:     'pointer',
                flexShrink: 0,
                alignSelf:  'flex-start',
                width:      `${styles.bw ?? 100}%`,
                boxSizing:  'border-box',
                fontFamily: styles.lang === 'en' ? 'Arial, sans-serif' : '"Noto Sans Thai", "Sarabun", sans-serif',
                lineHeight: styles.lang === 'en' ? 1.4 : 1.6,
                ...skinBubble,
                // br ต้องอยู่หลัง skinBubble เสมอ — ให้ user slider ชนะเสมอ
                borderRadius: styles.br,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {isStack ? (
                  <>
                    <div
                      className={activeSkin ? `skin-${activeSkin.id}-name` : undefined}
                      style={{
                        color: userColor, fontWeight: 700,
                        fontSize: styles.fs,
                        lineHeight: 1.3,
                        ...skinName,
                      }}
                    >
                      {msg.nickname || msg.uniqueId}
                    </div>
                    <div style={{
                      color: styles.tc,
                      fontSize: styles.fs,
                      lineHeight: 1.4, marginTop: 2,
                      ...skinText,
                    }}>
                      {msg.comment}
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      className={activeSkin ? `skin-${activeSkin.id}-name` : undefined}
                      style={{
                        color: userColor, fontWeight: 700,
                        fontSize: styles.fs,
                        ...skinName,
                      }}
                    >
                      {msg.nickname || msg.uniqueId}
                    </span>
                    <span style={{
                      color: styles.tc,
                      fontSize: styles.fs, marginLeft: 6,
                      ...skinText,
                    }}>
                      {msg.comment}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} style={{ flexShrink: 0 }} />

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&family=Sarabun:wght@400;700&display=swap');
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
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
