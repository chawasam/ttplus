// widget/pinchat.js — Pin Chat Widget สำหรับ OBS
// รับข้อความ pin มาจาก Chat Overlay ผ่าน BroadcastChannel
// OBS Size แนะนำ: 500 x 100
import { useEffect, useState } from 'react';
import { parseWidgetStyles } from '../../lib/widgetStyles';

export default function PinChatWidget() {
  const [pinned,  setPinned]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [pinKey,  setPinKey]  = useState(0); // เปลี่ยนทุกครั้งที่ pin → force remount → animation เล่นใหม่
  const [styles,  setStyles]  = useState(null);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === '1';
    const s         = parseWidgetStyles(params, 'pinchat');
    setStyles(s);

    if (isPreview) {
      setPinned({ nickname: 'TTplusFan', comment: 'ข้อความที่ถูก Pin จะแสดงตรงนี้ 📌', color: '#ff2d62' });
      setVisible(true);
      return;
    }

    if (typeof BroadcastChannel === 'undefined') return;
    let ch;
    try {
      ch = new BroadcastChannel('ttplus_pinchat');
      ch.onmessage = (e) => {
        if (e.data?.type === 'pin' && e.data.message) {
          setPinned(e.data.message);
          setVisible(true);
          setPinKey(k => k + 1); // force remount ทุกครั้ง
        }
      };
    } catch { /* ไม่รองรับ BroadcastChannel */ }

    return () => { try { ch?.close(); } catch { /* ignore */ } };
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{ background: 'transparent', padding: '8px 10px', maxWidth: 400, boxSizing: 'border-box' }}>
      {visible && pinned && (
        <div
          key={pinKey}  /* key เปลี่ยน → React unmount+remount → animation restart */
          style={{
            background:   styles.bgRgba,
            borderRadius: styles.br,
            padding:      '10px 14px',
            borderLeft:   `4px solid ${pinned.color || styles.ac}`,
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
            animation:    'pinDrop 0.7s cubic-bezier(0.22,1.2,0.36,1) forwards, pinFloat 3s ease-in-out 0.7s infinite',
            position:     'relative',
            width:        '100%',
            boxSizing:    'border-box',
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.75, flexShrink: 0, marginTop: 2, color: styles.ac, fontFamily: 'sans-serif' }}>
            📌
          </span>

          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <div style={{
              color: pinned.color || styles.ac, fontWeight: 700,
              fontSize: styles.fs, fontFamily: 'sans-serif', marginBottom: 2,
            }}>
              {pinned.nickname}
            </div>
            <div style={{
              color: styles.tc, fontSize: styles.fs,
              fontFamily: 'sans-serif', lineHeight: 1.4,
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
  );
}

export function getServerSideProps() { return { props: {} }; }
