// widget/pinprofile.js — Pin Profile Card Widget สำหรับ OBS
// รับข้อมูล user จาก Chat Overlay ผ่าน BroadcastChannel('ttplus_pinprofile')
// OBS Size แนะนำ: แนวนอน 400 x 170 | แนวตั้ง 240 x 280
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
        bio:               'TikTok streamer 🎮 | ไลฟ์ทุกวัน',
        followRole:        1,
        comment:           'ไลฟ์สนุกมากเลยครับ 🎉',
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

  const userColor = pinned?.color || styles.ac;
  const avatarUrl = safeTikTokImageUrl(pinned?.profilePictureUrl || '');
  const isVertical = styles.orient === 'v';

  // ===== Shared sub-components (render ใช้ทั้ง 2 layout) =====
  const Avatar = (size = 60) => avatarUrl ? (
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
        boxShadow:    `0 0 14px ${userColor}66`,
      }}
    />
  ) : (
    <div style={{
      width: size, height: size,
      borderRadius:   '50%',
      background:     `linear-gradient(135deg, ${userColor}66, ${userColor}1a)`,
      border:         `2px solid ${userColor}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       size * 0.42,
      flexShrink:     0,
    }}>👤</div>
  );

  const FollowBadge = pinned?.followRole >= 1 ? (
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
  ) : null;

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
              // แนวตั้ง: border-top | แนวนอน: border-left
              ...(isVertical
                ? { borderTop: `4px solid ${userColor}`, padding: '14px 14px 12px' }
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {Avatar(68)}

                {/* Name + badge */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    color:        userColor,
                    fontWeight:   800,
                    fontSize:     styles.fs + 2,
                    fontFamily:   'sans-serif',
                    lineHeight:   1.2,
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth:     200,
                  }}>
                    {pinned.nickname || pinned.uniqueId}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 3 }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: styles.fs - 2, fontFamily: 'sans-serif' }}>
                      @{pinned.uniqueId}
                    </span>
                    {FollowBadge}
                  </div>
                </div>

                {/* Bio */}
                {pinned.bio ? (
                  <div style={{
                    color:      styles.tc,
                    fontSize:   styles.fs - 1,
                    fontFamily: 'sans-serif',
                    lineHeight: 1.4,
                    textAlign:  'center',
                    opacity:    0.85,
                    wordBreak:  'break-word',
                    width:      '100%',
                  }}>
                    {pinned.bio}
                  </div>
                ) : null}

                {/* ข้อความ */}
                <div style={{
                  padding:      '5px 10px',
                  background:   `${userColor}14`,
                  borderRadius: styles.br > 4 ? styles.br - 2 : 4,
                  color:        'rgba(255,255,255,0.55)',
                  fontSize:     styles.fs - 1,
                  fontFamily:   'sans-serif',
                  lineHeight:   1.4,
                  fontStyle:    'italic',
                  wordBreak:    'break-word',
                  textAlign:    'center',
                  width:        '100%',
                  boxSizing:    'border-box',
                }}>
                  "{pinned.comment}"
                </div>
              </div>
            ) : (
              /* ===== แนวนอน ===== */
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {Avatar(52)}

                <div style={{ flex: 1, minWidth: 0 }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: styles.fs - 2, fontFamily: 'sans-serif' }}>
                      @{pinned.uniqueId}
                    </span>
                    {FollowBadge}
                  </div>

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
