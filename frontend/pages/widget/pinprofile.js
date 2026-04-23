// widget/pinprofile.js — Pin Profile Card Widget สำหรับ OBS
// รับข้อมูล user จาก Chat Overlay ผ่าน BroadcastChannel('ttplus_pinprofile')
// OBS Size แนะนำ: แนวนอน 400 x 150 | แนวตั้ง 240 x 320
import { useEffect, useState } from 'react';
import { safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function PinProfileWidget() {
  const [pinned,  setPinned]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [pinKey,  setPinKey]  = useState(0);
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
        bio:               'TikTok streamer 🎮 ไลฟ์ทุกวัน | สอนเล่นเกม | ฝากติดตามด้วยนะครับ 🙏',
        color:             '#ff2d62',
      });
      setVisible(true);
      return;
    }

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

  const userColor  = pinned?.color || styles.ac;
  const avatarUrl  = safeTikTokImageUrl(pinned?.profilePictureUrl || '');
  const isVertical = styles.orient === 'v';

  const AvatarEl = ({ size }) => avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border:       `2.5px solid ${userColor}`,
        flexShrink:   0,
        objectFit:    'cover',
        boxShadow:    `0 0 16px ${userColor}66`,
      }}
    />
  ) : (
    <div style={{
      width: size, height: size,
      borderRadius:   '50%',
      background:     `linear-gradient(135deg, ${userColor}66, ${userColor}1a)`,
      border:         `2.5px solid ${userColor}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       Math.round(size * 0.42),
      flexShrink:     0,
    }}>👤</div>
  );

  return (
    <>
      <div style={{
        background:      'transparent',
        padding:         '8px 10px',
        maxWidth:        isVertical ? 260 : 420,
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
              animation:    'profileDrop 0.6s cubic-bezier(0.22,1.2,0.36,1) forwards, profileFloat 3s ease-in-out 0.6s infinite',
              position:     'relative',
              width:        '100%',
              boxSizing:    'border-box',
              overflow:     'hidden',
              ...(isVertical
                ? { borderTop: `4px solid ${userColor}`, padding: '16px 14px 14px' }
                : { borderLeft: `4px solid ${userColor}`, padding: '12px 14px' }
              ),
            }}
          >
            {/* Glow strip */}
            <div style={{
              position:      'absolute',
              top: 0, left: 0, right: 0,
              height:        2,
              background:    `linear-gradient(90deg, transparent, ${userColor}88, transparent)`,
              pointerEvents: 'none',
            }} />

            {isVertical ? (
              /* ===== แนวตั้ง ===== */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

                <AvatarEl size={76} />

                {/* Name */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    color:        userColor,
                    fontWeight:   800,
                    fontSize:     styles.fs + 3,
                    fontFamily:   'sans-serif',
                    lineHeight:   1.2,
                    wordBreak:    'break-word',
                  }}>
                    {pinned.nickname || pinned.uniqueId}
                  </div>
                  <div style={{
                    color:      'rgba(255,255,255,0.4)',
                    fontSize:   styles.fs - 2,
                    fontFamily: 'sans-serif',
                    marginTop:  2,
                  }}>
                    @{pinned.uniqueId}
                  </div>
                </div>

                {/* Bio */}
                {pinned.bio ? (
                  <div style={{
                    color:        styles.tc,
                    fontSize:     styles.fs,
                    fontFamily:   'sans-serif',
                    lineHeight:   1.55,
                    textAlign:    'center',
                    wordBreak:    'break-word',
                    width:        '100%',
                    padding:      '8px 10px',
                    background:   `${userColor}0d`,
                    borderRadius: styles.br > 6 ? styles.br - 4 : 4,
                    borderTop:    `1px solid ${userColor}22`,
                    boxSizing:    'border-box',
                  }}>
                    {pinned.bio}
                  </div>
                ) : (
                  <div style={{
                    color:      'rgba(255,255,255,0.2)',
                    fontSize:   styles.fs - 1,
                    fontFamily: 'sans-serif',
                    fontStyle:  'italic',
                  }}>
                    ไม่มี bio
                  </div>
                )}
              </div>

            ) : (
              /* ===== แนวนอน ===== */
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                <AvatarEl size={54} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + @username */}
                  <div style={{
                    color:        userColor,
                    fontWeight:   800,
                    fontSize:     styles.fs + 2,
                    fontFamily:   'sans-serif',
                    lineHeight:   1.2,
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {pinned.nickname || pinned.uniqueId}
                  </div>
                  <div style={{
                    color:      'rgba(255,255,255,0.4)',
                    fontSize:   styles.fs - 2,
                    fontFamily: 'sans-serif',
                    marginTop:  2,
                  }}>
                    @{pinned.uniqueId}
                  </div>

                  {/* Bio */}
                  {pinned.bio ? (
                    <div style={{
                      color:      styles.tc,
                      fontSize:   styles.fs - 1,
                      fontFamily: 'sans-serif',
                      marginTop:  6,
                      lineHeight: 1.5,
                      wordBreak:  'break-word',
                    }}>
                      {pinned.bio}
                    </div>
                  ) : (
                    <div style={{
                      color:      'rgba(255,255,255,0.2)',
                      fontSize:   styles.fs - 2,
                      fontFamily: 'sans-serif',
                      marginTop:  5,
                      fontStyle:  'italic',
                    }}>
                      ไม่มี bio
                    </div>
                  )}
                </div>
              </div>
            )}

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
