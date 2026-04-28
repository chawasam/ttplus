// widget/gift-leaderboard.js — Gift/Coin Leaderboard (top 10, per session, resets on new Live)
// OBS Size: 300 x 520
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import SKINS, { SkinParticles } from '../../lib/chatSkins';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 10000; // fallback REST poll ทุก 10s (socket เป็น primary)
const MEDALS = ['🥇', '🥈', '🥉'];

export default function GiftLeaderboardWidget() {
  const [board, setBoard] = useState([]);
  const [styles, setStyles] = useState(null);

  // Resolve skin CSS from SKINS map
  const skinId = styles?.raw?.skin || '';
  const skinDef = skinId && SKINS[skinId] ? SKINS[skinId] : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('cid') || params.get('vjId') || '';
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'giftLeaderboard');
    setStyles(s);

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

    // ── Socket (primary — real-time update ทุกครั้งที่มีของขวัญ) ──
    const socket = createWidgetSocket(vid, {
      leaderboard_update: ({ type, data }) => {
        if (type === 'gifts' && Array.isArray(data)) setBoard(data);
      },
    });

    // ── REST poll (fallback — ดึงข้อมูลเริ่มต้น + กรณี socket หลุด) ──
    const poll = async () => {
      try {
        const isCid = /^\d{4,8}$/.test(vid);
        const url = isCid
          ? `${BACKEND}/api/leaderboard?cid=${vid}&type=gifts`
          : `${BACKEND}/api/leaderboard/${vid}?type=gifts`;
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

  return (
    <>
      <Head>
        <title>Gift Leaderboard</title>
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

              return (
                <div
                  key={user.uniqueId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    padding: '6px 10px',
                    borderRadius: Math.max(styles.br - 4, 4),
                    background: isTop3 ? accentColor + '15' : styles.tc + '08',
                  }}
                >
                  {/* ตรา */}
                  <span style={{ fontSize: styles.fs + 2, width: 26, textAlign: 'center', flexShrink: 0 }}>
                    {MEDALS[i] || `#${i + 1}`}
                  </span>

                  {/* ชื่อ */}
                  <span
                    style={{
                      flex: 1,
                      color: styles.tc,
                      fontSize: styles.fs,
                      fontWeight: isTop3 ? 700 : 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.nickname || user.uniqueId}
                  </span>

                  {/* เหรียญ */}
                  <span style={{ color: accentColor, fontSize: styles.fs, fontWeight: 700, flexShrink: 0 }}>
                    💎 {user.totalCoins?.toLocaleString()}
                  </span>
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
