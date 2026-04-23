// widget/pinprofile.js — Pin Profile Card Widget สำหรับ OBS
// รับข้อมูล user จาก Chat Overlay ผ่าน BroadcastChannel('ttplus_pinprofile')
// OBS Size แนะนำ: 400 x 180
import { useEffect, useState } from 'react';
import { safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function PinProfileWidget() {
  const [pinned,  setPinned]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [pinKey,  setPinKey]  = useState(0); // force remount → animation restart
  const [styles,  setStyles]  = useState(null);

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'pinprofile');
    setStyles(s);

    if (isPreview) {
      setPinned({
        uniqueId:          'ttsamfan',
        nickname:          'TTsamFan',
        profilePictureUrl: '',
        bio:               'TikTok streamer 🎮 | ไลฟ์ทุกวัน',
        followRole:        1,
        comment:           'ไลฟ์สนุกมากเลยครับ 🎉',
        color:             '#ff2d62',
      });
      setVisible(true);
      return;
    }

    // BroadcastChannel — รับ profile จาก chat overlay
    let ch;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        ch = new BroadcastChannel('ttplus_pinprofile');
        ch.onmessage = (e) => {
          if (e.data?.type === 'profile' && e.data.message) {
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
        if (widgetId !== 'pinprofile') return;
        setStyles(rawToStyle(style, 'pinprofile'));
      },
    });

    return () => {
      try { ch?.close(); } catch { /* ignore */ }
      socket?.disconnect();
    };
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const acColor    = styles.ac;
  const userColor  = pinned?.color || acColor;
  const avatarUrl  = safeTikTokImageUrl(pinned?.profilePictureUrl || '');

  return (
    <>
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
            key={pinKey}
            style={{
              background:   styles.bgRgba,
              borderRadius: styles.br,
              padding:      '12px 14px',
              display:      'flex',
              alignItems:   'flex-start',
              gap:          12,
              animation:    'profileDrop 0.6s cubic-bezier(0.22,1.2,0.36,1) forwards, profileFloat 3s ease-in-out 0.6s infinite',
              position:     'relative',
              width:        '100%',
              boxSizing:    'border-box',
              borderLeft:   `4px solid ${userColor}`,
              overflow:     'hidden',
            }}
          >
            {/* Glow strip at top */}
            <div style={{
              position:   'absolute',
              top: 0, left: 0, right: 0,
              height:     2,
              background: `linear-gradient(90deg, transparent, ${userColor}88, transparent)`,
              pointerEvents: 'none',
            }} />

            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{
                  width:        52, height:       52,
                  borderRadius: '50%',
                  border:       `2.5px solid ${userColor}`,
                  flexShrink:   0,
                  objectFit:    'cover',
                  boxShadow:    `0 0 12px ${userColor}66`,
                }}
              />
            ) : (
              <div style={{
                width:        52, height:       52,
                borderRadius: '50%',
                background:   `linear-gradient(135deg, ${userColor}66, ${userColor}1a)`,
                border:       `2px solid ${userColor}`,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     22,
                flexShrink:   0,
              }}>
                👤
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Nickname */}
              <div style={{
                color:         userColor,
                fontWeight:    800,
                fontSize:      styles.fs + 2,
                fontFamily:    'sans-serif',
                lineHeight:    1.2,
                whiteSpace:    'nowrap',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
              }}>
                {pinned.nickname || pinned.uniqueId}
              </div>

              {/* @username + follow badge */}
              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        6,
                marginTop:  2,
                flexWrap:   'wrap',
              }}>
                <span style={{
                  color:      'rgba(255,255,255,0.45)',
                  fontSize:   styles.fs - 2,
                  fontFamily: 'sans-serif',
                }}>
                  @{pinned.uniqueId}
                </span>
                {pinned.followRole >= 1 && (
                  <span style={{
                    background:    `${userColor}28`,
                    color:         userColor,
                    border:        `1px solid ${userColor}55`,
                    borderRadius:  5,
                    padding:       '1px 6px',
                    fontSize:      9,
                    fontWeight:    700,
                    fontFamily:    'sans-serif',
                    letterSpacing: 0.5,
                  }}>
                    {pinned.followRole >= 2 ? 'FRIEND' : 'FOLLOWER'}
                  </span>
                )}
              </div>

              {/* Bio */}
              {pinned.bio ? (
                <div style={{
                  color:      styles.tc,
                  fontSize:   styles.fs - 1,
                  fontFamily: 'sans-serif',
                  marginTop:  5,
                  lineHeight: 1.4,
                  wordBreak:  'break-word',
                  opacity:    0.85,
                }}>
                  {pinned.bio}
                </div>
              ) : null}

              {/* ข้อความที่คลิก */}
              <div style={{
                marginTop:    6,
                padding:      '4px 8px',
                background:   `${userColor}14`,
                borderLeft:   `2px solid ${userColor}55`,
                borderRadius: '0 6px 6px 0',
                color:        'rgba(255,255,255,0.55)',
                fontSize:     styles.fs - 1,
                fontFamily:   'sans-serif',
                lineHeight:   1.4,
                fontStyle:    'italic',
                wordBreak:    'break-word',
              }}>
                "{pinned.comment}"
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setVisible(false)}
              style={{
                position:   'absolute',
                top:        6, right: 8,
                background: 'none',
                border:     'none',
                color:      'rgba(255,255,255,0.3)',
                cursor:     'pointer',
                fontSize:   13,
                lineHeight: 1,
                padding:    '2px 4px',
              }}
              title="ปิด"
            >✕</button>
          </div>
        )}

        <style>{`
          @keyframes profileDrop {
            0%   { opacity:0; transform: translateY(-40px) scale(0.92); }
            55%  { opacity:1; transform: translateY(6px)   scale(1.02); }
            75%  { transform: translateY(-3px) scale(0.99); }
            100% { transform: translateY(0)    scale(1); }
          }
          @keyframes profileFloat {
            0%,100% { transform: translateY(0px); }
            50%     { transform: translateY(-4px); }
          }
        `}</style>
      </div>
    </>
  );
}

export function getServerSideProps() { return { props: {} }; }
