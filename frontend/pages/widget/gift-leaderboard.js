// widget/gift-leaderboard.js — Gift/Coin Leaderboard (top 10, per session, resets on new Live)
// OBS Size: 300 x 520
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { useChatSkin } from '../../lib/chatSkins';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 5000;
const MEDALS = ['🥇', '🥈', '🥉'];

export default function GiftLeaderboardWidget() {
  const router = useRouter();
  const [board, setBoard] = useState([]);
  const [styles, setStyles] = useState(null);
  const [vjId, setVjId] = useState('');
  const skinRender = useChatSkin(styles?.raw?.skin || '');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('vjId');
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'giftLeaderboard');
    setStyles(s);
    setVjId(vid || '');

    if (isPreview) {
      setBoard([
        { uniqueId: 'u1', nickname: 'BigGifter',   profilePictureUrl: '', totalCoins: 5400 },
        { uniqueId: 'u2', nickname: 'LoveStream',  profilePictureUrl: '', totalCoins: 3200 },
        { uniqueId: 'u3', nickname: 'Fan_TH',      profilePictureUrl: '', totalCoins: 1800 },
        { uniqueId: 'u4', nickname: 'Viewer99',    profilePictureUrl: '', totalCoins: 900 },
        { uniqueId: 'u5', nickname: 'GiftGiver',   profilePictureUrl: '', totalCoins: 650 },
        { uniqueId: 'u6', nickname: 'Supporter',   profilePictureUrl: '', totalCoins: 420 },
        { uniqueId: 'u7', nickname: 'Hearts',      profilePictureUrl: '', totalCoins: 280 },
      ]);
      return;
    }

    if (!vid) return;

    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/leaderboard/${vid}?type=gifts`);
        const data = await res.json();
        if (Array.isArray(data.data)) setBoard(data.data);
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <>
      <Head>
        <title>Gift Leaderboard</title>
      </Head>
      <div
        style={{
          background: skinRender?.canvasStyle?.background || styles.bgRgba,
          backgroundImage: skinRender?.canvasStyle?.backgroundImage,
          borderRadius: styles.br,
          padding: 14,
          minWidth: 280,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {skinRender?.canvas && (
          <canvas
            ref={skinRender.canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: styles.br,
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3
            style={{
              color: styles.ac,
              fontWeight: 700,
              fontSize: styles.fs + 2,
              margin: '0 0 12px',
              textAlign: 'center',
              letterSpacing: 1,
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            🎁 Top Gifters
          </h3>

          {board.length === 0 ? (
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
            board.map((user, i) => {
              const isTop3 = i < 3;
              const accentColor = styles.ac;
              const progressPercent = board.length > 0 ? (user.totalCoins / board[0].totalCoins) * 100 : 0;

              return (
                <div
                  key={user.uniqueId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                    background: isTop3
                      ? accentColor + '15'
                      : styles.tc + '08',
                    border: isTop3 ? `1px solid ${accentColor}40` : 'none',
                    borderRadius: Math.max(styles.br - 4, 4),
                    padding: '8px 12px',
                    animation: 'slideInUp 0.3s ease-out',
                    animationDelay: `${i * 50}ms`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    style={{
                      fontSize: styles.fs + 4,
                      width: 28,
                      textAlign: 'center',
                      flexShrink: 0,
                      filter: isTop3 ? 'drop-shadow(0 0 6px rgba(255,215,0,0.4))' : 'none',
                    }}
                  >
                    {MEDALS[i] || `#${i + 1}`}
                  </span>

                  {user.profilePictureUrl && (
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
                  </div>

                  <span
                    style={{
                      color: accentColor,
                      fontSize: styles.fs - 1,
                      fontWeight: 700,
                      flexShrink: 0,
                      textShadow: '0 0 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    💎 {user.totalCoins?.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <style>{`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
