// widget/likes-leaderboard.js — Like/TapTap Leaderboard (top 10, per session, resets on new Live)
// OBS Size: 300 x 520
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import SKINS, { SkinParticles } from '../../lib/chatSkins';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 10000; // fallback REST poll ทุก 10s (socket เป็น primary)
const MEDALS = ['🥇', '🥈', '🥉'];

// Default config values (ตรงกับ configFields ใน widgets.js)
const DEFAULT_CONFIG = {
  showMedal:    1,
  showBg:       1,
  showAvatar:   1,
  showProgress: 1,
  showLikes:    1,
  maxRows:      10,
};

export default function LikesLeaderboardWidget() {
  const [board, setBoard] = useState([]);
  const [styles, setStyles] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const stylesRef = useRef(null);

  // Resolve skin CSS from SKINS map
  const skinId = styles?.raw?.skin || '';
  const skinDef = skinId && SKINS[skinId] ? SKINS[skinId] : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('cid') || params.get('vjId') || '';
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'likesLeaderboard');
    setStyles(s);
    stylesRef.current = s;

    // Read config toggles from URL params
    const cfg = {
      showMedal:    params.get('showMedal')    !== '0',
      showBg:       params.get('showBg')        !== '0',
      showAvatar:   params.get('showAvatar')    !== '0',
      showProgress: params.get('showProgress')  !== '0',
      showLikes:    params.get('showLikes')     !== '0',
      maxRows:      Math.min(20, Math.max(1, parseInt(params.get('maxRows') || '10', 10))),
    };
    setConfig(cfg);

    if (isPreview) {
      setBoard([
        { uniqueId: 'u1', nickname: 'TopFan',     profilePictureUrl: '', likeCount: 850 },
        { uniqueId: 'u2', nickname: 'LoveTikTok', profilePictureUrl: '', likeCount: 620 },
        { uniqueId: 'u3', nickname: 'Fan_TH',     profilePictureUrl: '', likeCount: 410 },
        { uniqueId: 'u4', nickname: 'Viewer99',   profilePictureUrl: '', likeCount: 280 },
        { uniqueId: 'u5', nickname: 'TapTap123',  profilePictureUrl: '', likeCount: 150 },
        { uniqueId: 'u6', nickname: 'StreamFan',  profilePictureUrl: '', likeCount: 120 },
        { uniqueId: 'u7', nickname: 'LiveChat',   profilePictureUrl: '', likeCount: 95 },
      ]);
      return;
    }

    if (!vid) return;

    // ── Socket (primary — real-time update ทุกครั้งที่มี like) ──
    const socket = createWidgetSocket(vid, {
      leaderboard_update: ({ type, data }) => {
        if (type === 'likes' && Array.isArray(data)) setBoard(data);
      },
      // ── Real-time style update จาก Customize Drawer ──
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'likes-leaderboard') return;
        if (style?._reset) return;
        const next = rawToStyle(style, 'likes-leaderboard');
        stylesRef.current = next;
        setStyles(next);
      },
    });

    // ── REST poll (fallback — ดึงข้อมูลเริ่มต้น + กรณี socket หลุด) ──
    const poll = async () => {
      try {
        const isCid = /^\d{4,8}$/.test(vid);
        const url = isCid
          ? `${BACKEND}/api/leaderboard?cid=${vid}&type=likes`
          : `${BACKEND}/api/leaderboard/${vid}?type=likes`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) setBoard(data.data);
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const displayBoard = board.slice(0, config.maxRows);
  const maxLikes = displayBoard.length > 0 ? displayBoard[0].likeCount : 1;

  return (
    <>
      <Head>
        <title>Likes Leaderboard</title>
      </Head>
      <div
        style={{
          background: skinDef?.canvasStyle?.background || styles.bgRgba,
          backgroundImage: skinDef?.canvasStyle?.backgroundImage,
          borderRadius: styles.br,
          padding: 14,
          minWidth: 280,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {skinDef && <SkinParticles skinId={skinId} />}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {displayBoard.length === 0 ? (
            <p
              style={{
                color: styles.tc + '66',
                textAlign: 'center',
                fontSize: styles.fs - 2,
                padding: 20,
              }}
            >
              รอข้อมูล...
            </p>
          ) : (
            displayBoard.map((user, i) => {
              const isTop3 = i < 3;
              const accentColor = styles.ac;
              const progressPercent = maxLikes > 0 ? (user.likeCount / maxLikes) * 100 : 0;

              return (
                <div
                  key={user.uniqueId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                    background: config.showBg
                      ? (isTop3 ? accentColor + '15' : styles.tc + '08')
                      : 'transparent',
                    border: config.showBg && isTop3 ? `1px solid ${accentColor}40` : 'none',
                    borderRadius: Math.max(styles.br - 4, 4),
                    padding: '8px 12px',
                    animation: 'slideInUp 0.3s ease-out',
                    animationDelay: `${i * 50}ms`,
                    backdropFilter: config.showBg ? 'blur(8px)' : 'none',
                  }}
                >
                  {/* อันดับ / เหรียญ */}
                  <span
                    style={{
                      fontSize: styles.fs + 4,
                      width: 28,
                      textAlign: 'center',
                      flexShrink: 0,
                      filter: isTop3 ? 'drop-shadow(0 0 6px rgba(255,215,0,0.4))' : 'none',
                    }}
                  >
                    {config.showMedal && MEDALS[i] ? MEDALS[i] : `#${i + 1}`}
                  </span>

                  {/* รูปโปรไฟล์ */}
                  {config.showAvatar && user.profilePictureUrl && (
                    <img
                      src={user.profilePictureUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: `2px solid ${isTop3 ? accentColor : accentColor + '60'}`,
                        flexShrink: 0,
                        boxShadow: isTop3 ? `0 0 8px ${accentColor}40` : 'none',
                      }}
                    />
                  )}

                  {/* ชื่อ + progress bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: styles.tc,
                        fontSize: styles.fs,
                        fontWeight: 600,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.nickname || user.uniqueId}
                    </p>
                    {config.showProgress && (
                      <div
                        style={{
                          height: 4,
                          background: styles.tc + '20',
                          borderRadius: 2,
                          marginTop: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: accentColor,
                            width: `${progressPercent}%`,
                            transition: 'width 0.4s ease',
                            boxShadow: `0 0 6px ${accentColor}60`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* จำนวน like */}
                  {config.showLikes && (
                    <span
                      style={{
                        color: accentColor,
                        fontSize: styles.fs - 1,
                        fontWeight: 700,
                        flexShrink: 0,
                        textShadow: '0 0 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      👍 {user.likeCount?.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <style>{`
          @keyframes slideInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
