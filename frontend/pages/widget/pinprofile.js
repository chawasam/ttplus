// widget/pinprofile.js — Pin Profile Card Widget สำหรับ OBS
// รับข้อมูล user จาก Chat Overlay ผ่าน BroadcastChannel('ttplus_pinprofile')
// OBS Size แนะนำ: แนวนอน 400×150 | แนวตั้ง 240×240
import { useEffect, useState, useRef } from 'react';
import { safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle, tcCssProps } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function PinProfileWidget() {
  const [pinned,  setPinned]  = useState(null);
  const [visible, setVisible] = useState(false);
  const [hiding,  setHiding]  = useState(false);
  const [pinKey,  setPinKey]  = useState(0);
  const [styles,  setStyles]  = useState(null);
  const hideTimerRef   = useRef(null);
  const fadeTimerRef   = useRef(null);
  const pinDurationRef = useRef(0);

  useEffect(() => {
    if (styles) pinDurationRef.current = styles.pinDuration ?? 0;
  }, [styles]);

  const scheduleHide = () => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(fadeTimerRef.current);
    setHiding(false);
    const dur = pinDurationRef.current;
    if (dur > 0) {
      hideTimerRef.current = setTimeout(() => {
        setHiding(true);
        fadeTimerRef.current = setTimeout(() => {
          setVisible(false);
          setHiding(false);
        }, 400);
      }, dur * 1000);
    }
  };

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'pinprofile');
    pinDurationRef.current = s.pinDuration ?? 0;
    setStyles(s);

    if (isPreview) {
      setPinned({
        uniqueId:          'ttsamfan',
        nickname:          'TTsamFan',
        profilePictureUrl: '',
        comment:           'โห เยี่ยมเลยครับ! 🔥🎉',
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
            scheduleHide();
          }
        };
      } catch { /* ไม่รองรับ BroadcastChannel */ }
    }

    const socket = createWidgetSocket(widgetToken, {
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'pinprofile') return;
        // _profile → pin profile event ส่งมาจาก chat overlay ผ่าน socket (รองรับ OBS)
        if (style?._profile) {
          setPinned(style._profile);
          setVisible(true);
          setPinKey(k => k + 1);
          scheduleHide();
          return;
        }
        setStyles(rawToStyle(style, 'pinprofile'));
      },
    });

    return () => {
      try { ch?.close(); } catch { /* ignore */ }
      socket?.disconnect();
      clearTimeout(hideTimerRef.current);
      clearTimeout(fadeTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const userColor  = pinned?.color || styles.ac;
  const avatarUrl  = safeTikTokImageUrl(pinned?.profilePictureUrl || '');
  const isVertical = styles.orient === 'v';
  const showChat   = styles.showChat === 1;

  // ── Enter animation string ──────────────────────────────────────────────────
  const ENTER_ANIMS = {
    default:   'profileDrop 0.6s cubic-bezier(0.22,1.2,0.36,1) forwards, profileFloat 3s ease-in-out 0.6s infinite',
    warpslam:  'warpSlam 0.9s linear forwards, profileFloat 3s ease-in-out 0.9s infinite',
    spinslam:  'spinSlam 0.85s cubic-bezier(0.22,1.2,0.36,1) forwards, profileFloat 3s ease-in-out 0.85s infinite',
    warpslam2: 'warpSlam2 1.0s linear forwards, profileFloat 3s ease-in-out 1.0s infinite',
  };
  const enterAnimation = ENTER_ANIMS[styles.enterAnim] ?? ENTER_ANIMS.default;

  const AvatarEl = ({ size }) => avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      style={{
        width: size, height: size,
        borderRadius:  '50%',
        border:        `2.5px solid ${userColor}`,
        flexShrink:    0,
        objectFit:     'cover',
        boxShadow:     `0 0 16px ${userColor}66`,
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

  // ── Chat bubble (แสดงเมื่อ showChat=1 และมี comment) ──
  const ChatBubble = () => {
    if (!showChat || !pinned?.comment) return null;
    return (
      <div style={{
        marginTop:    8,
        padding:      '7px 10px',
        background:   `${userColor}14`,
        borderLeft:   `3px solid ${userColor}`,
        borderRadius: styles.br > 6 ? styles.br - 4 : 4,
        ...tcCssProps(styles),
        fontSize:     styles.fs - 1,
        fontWeight:   styles.fw ? 700 : 'normal',
        fontFamily:   'sans-serif',
        lineHeight:   1.5,
        wordBreak:    'break-word',
        fontStyle:    'italic',
        boxSizing:    'border-box',
        width:        '100%',
      }}>
        <span style={{
          color:      `${userColor}aa`,
          fontSize:   styles.fs - 3,
          fontStyle:  'normal',
          display:    'block',
          marginBottom: 2,
        }}>
          💬
        </span>
        {pinned.comment}
      </div>
    );
  };

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
        // perspective บน parent ทำให้ warpSlam2 มีความลึก 3D จริง
        perspective:     styles.enterAnim === 'warpslam2' ? '600px' : undefined,
        position:        'relative',
        zIndex:          1,
      }}>
        {visible && pinned && (
          <div
            key={pinKey}
            style={{
              background:   styles.bgRgba,
              borderRadius: styles.br,
              animation:          enterAnimation,
              animationPlayState: hiding ? 'paused' : 'running',
              opacity:            hiding ? 0 : 1,
              transition:         hiding ? 'opacity 0.4s ease' : 'none',
              position:     'relative',
              width:        '100%',
              boxSizing:    'border-box',
              overflow:     'hidden',
              ...(isVertical
                ? { borderTop:  `4px solid ${userColor}`, padding: '14px 14px 14px' }
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

                <AvatarEl size={72} />

                {/* Name */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{
                    color:      userColor,
                    fontWeight: 800,
                    fontSize:   styles.fs + 3,
                    fontFamily: 'sans-serif',
                    lineHeight: 1.2,
                    wordBreak:  'break-word',
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

                <ChatBubble />
              </div>

            ) : (
              /* ===== แนวนอน ===== */
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

                <AvatarEl size={52} />

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

                  <ChatBubble />
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
