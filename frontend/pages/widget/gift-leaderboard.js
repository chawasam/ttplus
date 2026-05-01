// widget/gift-leaderboard.js — Gift/Coin Leaderboard (top 10, per session, resets on new Live)
// OBS Size: 300 x 520
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { parseWidgetStyles, rawToStyle, tcCssProps } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import SKINS, { SkinParticles } from '../../lib/chatSkins';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const POLL_MS = 10000; // fallback REST poll ทุก 10s (socket เป็น primary)
const MEDALS = ['🥇', '🥈', '🥉'];

// Default config values (ตรงกับ configFields ใน widgets.js)
const DEFAULT_CONFIG = {
  showMedal:    1,
  showBg:       1,
  showAvatar:   0,
  showProgress: 0,
  showCoins:    1,
  maxRows:      10,
};

export default function GiftLeaderboardWidget() {
  const [board, setBoard] = useState([]);
  const [styles, setStyles] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  // popKeys[userId] = incrementing int — เปลี่ยนทุกครั้งที่ count เพิ่ม → force remount animated element → animation restart
  const [popKeys, setPopKeys] = useState({});
  const stylesRef = useRef(null);
  const prevCountsRef = useRef(new Map()); // userId → prev totalCoins

  const skinId = styles?.raw?.skin || '';
  const skinDef = skinId && SKINS[skinId] ? SKINS[skinId] : null;

  // ── Detect count increases → increment popKey → trigger animation ────────
  useEffect(() => {
    if (board.length === 0) return;
    const toInc = [];
    board.forEach(user => {
      const prev = prevCountsRef.current.get(user.uniqueId);
      // prev === undefined = first load → ไม่ trigger animation
      if (prev !== undefined && user.totalCoins > prev) toInc.push(user.uniqueId);
      prevCountsRef.current.set(user.uniqueId, user.totalCoins);
    });
    if (toInc.length > 0) {
      setPopKeys(p => {
        const n = { ...p };
        toInc.forEach(id => { n[id] = (n[id] || 0) + 1; });
        return n;
      });
    }
  }, [board]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('cid') || params.get('vjId') || '';
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'giftLeaderboard');
    setStyles(s);
    stylesRef.current = s;

    const cfg = {
      showMedal:    params.get('showMedal')    !== '0',
      showBg:       params.get('showBg')        !== '0',
      showAvatar:   params.get('showAvatar')    === '1',
      showProgress: params.get('showProgress')  === '1',
      showCoins:    params.get('showCoins')     !== '0',
      maxRows:      Math.min(20, Math.max(1, parseInt(params.get('maxRows') || '10', 10))),
    };
    setConfig(cfg);

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
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'gift-leaderboard') return;
        if (style?._reset) return;
        const next = rawToStyle(style, 'gift-leaderboard');
        stylesRef.current = next;
        setStyles(next);
        setConfig(prev => {
          const u = {};
          if (style.showMedal    !== undefined) u.showMedal    = Number(style.showMedal)    !== 0;
          if (style.showBg       !== undefined) u.showBg       = Number(style.showBg)        !== 0;
          if (style.showAvatar   !== undefined) u.showAvatar   = Number(style.showAvatar)    !== 0;
          if (style.showProgress !== undefined) u.showProgress = Number(style.showProgress)  !== 0;
          if (style.showCoins    !== undefined) u.showCoins    = Number(style.showCoins)     !== 0;
          if (style.maxRows      !== undefined) u.maxRows      = Math.min(20, Math.max(1, Number(style.maxRows) || 10));
          return Object.keys(u).length ? { ...prev, ...u } : prev;
        });
      },
    });

    // ── REST poll (fallback) ──
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

  const displayBoard = board.slice(0, config.maxRows);
  const maxCoins = displayBoard.length > 0 ? displayBoard[0].totalCoins : 1;

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
          {displayBoard.length === 0 ? (
            <p style={{ color: styles.tc + '66', textAlign: 'center', fontSize: styles.fs - 2, padding: 20 }}>
              รอข้อมูล...
            </p>
          ) : (
            displayBoard.map((user, i) => {
              const isTop3 = i < 3;
              const accentColor = styles.ac;
              const progressPercent = maxCoins > 0 ? (user.totalCoins / maxCoins) * 100 : 0;
              const popKey = popKeys[user.uniqueId] || 0;
              const isPopping = popKey > 0;

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
                    background: config.showBg
                      ? (isTop3 ? accentColor + '15' : styles.tc + '08')
                      : 'transparent',
                    border: config.showBg && isTop3 ? `1px solid ${accentColor}30` : 'none',
                  }}
                >
                  {/* อันดับ / เหรียญ */}
                  <span style={{ fontSize: styles.fs + 2, width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {config.showMedal && MEDALS[i] ? MEDALS[i] : `#${i + 1}`}
                  </span>

                  {/* รูปโปรไฟล์ + มงกุฎสำหรับอันดับ 1 */}
                  {config.showAvatar && (
                    <div style={{ position: 'relative', flexShrink: 0, paddingTop: i === 0 ? 8 : 0 }}>
                      {i === 0 && (
                        <span style={{
                          position:   'absolute',
                          top:        0,
                          left:       '50%',
                          transform:  'translateX(-50%)',
                          fontSize:   14,
                          lineHeight: 1,
                          zIndex:     2,
                          pointerEvents: 'none',
                          filter:     'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
                        }}>👑</span>
                      )}
                      {user.profilePictureUrl ? (
                        <img
                          src={user.profilePictureUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          style={{
                            width: 32, height: 32,
                            borderRadius: '50%',
                            border: `2px solid ${isTop3 ? accentColor : accentColor + '60'}`,
                            display: 'block',
                            boxShadow: isTop3 ? `0 0 6px ${accentColor}40` : 'none',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 32, height: 32,
                          borderRadius: '50%',
                          background: accentColor + '33',
                          border: `2px solid ${isTop3 ? accentColor : accentColor + '60'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: styles.fs - 3,
                          fontWeight: 700,
                          color: accentColor,
                          boxShadow: isTop3 ? `0 0 6px ${accentColor}40` : 'none',
                        }}>
                          {(user.nickname || user.uniqueId || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ชื่อ + coin count ใต้ชื่อ + progress bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        ...tcCssProps(styles),
                        fontSize: styles.fs,
                        fontWeight: styles.fw ? 700 : (isTop3 ? 700 : 500),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.nickname || user.uniqueId}
                    </span>

                    {/* จำนวน coin — ใต้ชื่อ, 💎 กับตัวเลขแยก column */}
                    {config.showCoins && (
                      <div
                        key={popKey}
                        style={{
                          display:     'inline-flex',
                          alignItems:  'center',
                          gap:         3,
                          marginTop:   2,
                        }}
                      >
                        {/* 💎 column — fixed width, คืน opacity หลัง anim (ไม่ใช้ forwards) */}
                        <span style={{
                          display:         'inline-flex',
                          alignItems:      'center',
                          justifyContent:  'center',
                          width:           styles.fs,
                          flexShrink:      0,
                          fontSize:        styles.fs - 1,
                          animation:       isPopping ? 'heartFlash 1.5s ease' : 'none',
                        }}>💎</span>
                        {/* ตัวเลข column — scale จากจุดกึ่งกลาง */}
                        <span style={{
                          display:         'inline-block',
                          fontSize:        styles.fs - 1,
                          color:           accentColor,
                          fontWeight:      700,
                          whiteSpace:      'nowrap',
                          transformOrigin: 'left center',
                          animation:       isPopping
                            ? 'countPop 1.5s cubic-bezier(0.22,1.4,0.36,1)'
                            : 'none',
                        }}>
                          {user.totalCoins?.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {config.showProgress && (
                      <div
                        style={{
                          height: 3,
                          background: styles.tc + '20',
                          borderRadius: 2,
                          marginTop: config.showCoins ? 3 : 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: accentColor,
                            width: `${progressPercent}%`,
                            transition: 'width 0.4s ease',
                            boxShadow: `0 0 4px ${accentColor}60`,
                          }}
                        />
                      </div>
                    )}
                  </div>
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
          @keyframes countPop {
            0%   { transform: scale(1);    }
            8%   { transform: scale(1.5);  }
            22%  { transform: scale(1.2);  }
            48%  { transform: scale(1.35); }
            68%  { transform: scale(1.08); }
            85%  { transform: scale(1.02); }
            100% { transform: scale(1);    }
          }
          /* 💎 กระพริบ 2 ครั้ง แล้วคืน opacity 1 (ไม่ใช้ forwards) */
          @keyframes heartFlash {
            0%   { opacity: 1; }
            22%  { opacity: 1; }
            30%  { opacity: 0; }
            48%  { opacity: 1; }
            72%  { opacity: 1; }
            80%  { opacity: 0; }
            90%  { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
