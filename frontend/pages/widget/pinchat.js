// widget/pinchat.js — Pin Chat Widget สำหรับ OBS
// รับข้อความ pin มาจาก Chat Overlay ผ่าน BroadcastChannel
// OBS Size แนะนำ: 500 x 100
import { useEffect, useState } from 'react';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { SkinParticles } from '../../lib/chatSkins';
import SKINS from '../../lib/chatSkins';

export default function PinChatWidget() {
  const [pinned,  setPinned]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [pinKey,  setPinKey]  = useState(0); // เปลี่ยนทุกครั้งที่ pin → force remount → animation เล่นใหม่
  const [styles,  setStyles]  = useState(null);

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'pinchat');
    setStyles(s);

    if (isPreview) {
      setPinned({ nickname: 'TTsamFan', comment: 'ข้อความที่ถูก Pin จะแสดงตรงนี้ 📌', color: '#ff2d62' });
      setVisible(true);
      return;
    }

    // BroadcastChannel — รับ pin จาก chat overlay
    let ch;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        ch = new BroadcastChannel('ttplus_pinchat');
        ch.onmessage = (e) => {
          if (e.data?.type === 'pin' && e.data.message) {
            setPinned(e.data.message);
            setVisible(true);
            setPinKey(k => k + 1);
          }
        };
      } catch { /* ไม่รองรับ BroadcastChannel */ }
    }

    // Socket — รับ style_update แบบ real-time
    const socket = createWidgetSocket(widgetToken, {
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'pinchat') return;
        setStyles(rawToStyle(style, 'pinchat'));
      },
    });

    return () => {
      try { ch?.close(); } catch { /* ignore */ }
      socket?.disconnect();
    };
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const activeSkin   = styles.skin ? SKINS[styles.skin] : null;
  const pinColor     = pinned?.color || styles.ac;
  const bga          = styles.raw?.bga ?? 85;
  const skinBubble   = activeSkin ? activeSkin.bubbleStyle(pinColor, styles.ac, bga) : {};
  const skinNameSt   = activeSkin ? activeSkin.nameStyle(pinColor, styles.ac)        : {};
  const skinTextSt   = activeSkin ? activeSkin.textStyle(styles.ac)                  : {};

  return (
    <>
      {/* Particles (position:fixed — นอก transform container) */}
      <SkinParticles skinId={styles.skin} />

      <div style={{
        background:      'transparent',
        padding:         '8px 10px',
        maxWidth:        400,
        boxSizing:       'border-box',
        transform:       styles.transform3D,
        transformOrigin: 'center center',
        transformStyle:  'preserve-3d',
        position:        'relative',
        zIndex:          1,
      }}>
        {visible && pinned && (
          <div
            key={pinKey}  /* key เปลี่ยน → React unmount+remount → animation restart */
            style={{
              background:   styles.bgRgba,
              borderRadius: styles.br,
              padding:      '10px 14px',
              borderLeft:   `4px solid ${pinColor}`,
              display:      'flex',
              alignItems:   'flex-start',
              gap:          8,
              animation:    'pinDrop 0.7s cubic-bezier(0.22,1.2,0.36,1) forwards, pinFloat 3s ease-in-out 0.7s infinite',
              position:     'relative',
              width:        '100%',
              boxSizing:    'border-box',
              ...skinBubble,
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.75, flexShrink: 0, marginTop: 2, color: styles.ac, fontFamily: 'sans-serif' }}>
              📌
            </span>

            <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div style={{
                color: pinColor, fontWeight: 700,
                fontSize: styles.fs, fontFamily: 'sans-serif', marginBottom: 2,
                ...skinNameSt,
              }}>
                {pinned.nickname}
              </div>
              <div style={{
                color: styles.tc, fontSize: styles.fs,
                fontFamily: 'sans-serif', lineHeight: 1.4,
                ...skinTextSt,
              }}>
                {pinned.comment}
              </div>
            </div>

            <button
              onClick={() => setVisible(false)}
              style={{
                position: 'absolute', top: 6, right: 8,
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                fontSize: 13, lineHeight: 1, padding: 0,
              }}
              title="ล้างข้อความ pin"
            >✕</button>
          </div>
        )}
        <style>{`
          @keyframes pinDrop {
            0%   { opacity:0; transform: translateY(-48px) scale(0.9); }
            55%  { opacity:1; transform: translateY(8px)   scale(1.02); }
            72%  { transform: translateY(-4px) scale(0.99); }
            86%  { transform: translateY(3px)  scale(1.005); }
            100% { transform: translateY(0)    scale(1); }
          }
          @keyframes pinFloat {
            0%,100% { transform: translateY(0px); }
            50%     { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
