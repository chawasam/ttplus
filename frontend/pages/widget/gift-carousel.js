// widget/gift-carousel.js — Gift Carousel: สไลด์การ์ด Top 10 ผู้ส่งของขวัญ
// เลื่อนต่อเนื่อง (loop) — รองรับ 4 ทิศทาง + 3D perspective
// OBS Size แนะนำ: 900×200 (แนวนอน) / 220×700 (แนวตั้ง)
import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';
const MEDALS = ['🥇', '🥈', '🥉'];
const POLL_MS = 10000;

// ─── สีพื้นหลัง avatar เมื่อไม่มีรูปโปรไฟล์ ───────────────────────────────
const AVATAR_BG = [
  '#14203a', '#231428', '#142a1e', '#2a1e14', '#141e2a',
  '#142828', '#281422', '#1e1e2a', '#2a1e1e', '#141a2a',
];

function num(v, def, minV, maxV) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.min(maxV, Math.max(minV, n));
}

function hexToRgb(hex) {
  const h = (hex || '000000').replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

// ─── card dimensions ─────────────────────────────────────────────────────────
const CARD_W  = 118;
const CARD_H  = 168;
const CARD_GAP = 10;

export default function GiftCarouselWidget() {
  const [board,    setBoard]    = useState([]);
  const [styles,   setStyles]   = useState(null);
  const [config,   setConfig]   = useState({});
  const [lastMsgs, setLastMsgs] = useState({}); // userId → ข้อความล่าสุด
  const stylesRef = useRef(null);

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const vid       = params.get('cid') || params.get('vjId') || '';
    const isPreview = params.get('preview') === '1';
    const s         = parseWidgetStyles(params, 'giftCarousel');
    setStyles(s);
    stylesRef.current = s;

    const cfg = parseConfig(params);
    setConfig(cfg);

    if (isPreview) {
      setBoard(PREVIEW_BOARD);
      setLastMsgs(PREVIEW_MSGS);
      return;
    }

    if (!vid) return;

    // ── Socket (primary) ──────────────────────────────────────────────────────
    const socket = createWidgetSocket(vid, {
      leaderboard_update: ({ type, data }) => {
        if (type === 'gifts' && Array.isArray(data)) setBoard(data);
      },
      // จับ chat event เพื่ออัปเดตข้อความล่าสุดของแต่ละ user
      chat: ({ uniqueId, comment }) => {
        if (uniqueId && comment) {
          setLastMsgs(prev => ({ ...prev, [uniqueId]: comment }));
        }
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'gift-carousel') return;
        if (style?._reset) return;
        const next = rawToStyle(style, 'gift-carousel');
        stylesRef.current = next;
        setStyles(next);
        setConfig(prev => {
          const u = {};
          if (style.scrollDir   !== undefined) {
            const d = ['left','right','up','down'].includes(style.scrollDir) ? style.scrollDir : prev.scrollDir;
            u.scrollDir = d;
          }
          if (style.scrollSpeed !== undefined) u.scrollSpeed = num(style.scrollSpeed, 50, 10, 200);
          if (style.maxRows     !== undefined) u.maxRows     = num(style.maxRows, 10, 3, 20);
          if (style.showCoins   !== undefined) u.showCoins   = Number(style.showCoins) !== 0;
          if (style.showMsg     !== undefined) u.showMsg     = Number(style.showMsg) !== 0;
          if (style.cardBg      !== undefined) u.cardBg      = /^[0-9a-fA-F]{6}$/.test(style.cardBg || '') ? style.cardBg : prev.cardBg;
          if (style.cardBga     !== undefined) u.cardBga     = num(style.cardBga, 30, 0, 100);
          return Object.keys(u).length ? { ...prev, ...u } : prev;
        });
      },
    });

    // ── REST poll (fallback) ─────────────────────────────────────────────────
    const poll = async () => {
      try {
        const isCid = /^\d{4,8}$/.test(vid);
        const url   = isCid
          ? `${BACKEND}/api/leaderboard?cid=${vid}&type=gifts`
          : `${BACKEND}/api/leaderboard/${vid}?type=gifts`;
        const res  = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) setBoard(data.data);
      } catch {}
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { clearInterval(interval); socket?.disconnect(); };
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const { scrollDir, scrollSpeed, maxRows, showCoins, showMsg, cardBg, cardBga } = config;
  const isVert    = scrollDir === 'up' || scrollDir === 'down';
  const isReverse = scrollDir === 'right' || scrollDir === 'down';

  const displayBoard = board.slice(0, maxRows);
  const cards        = displayBoard.length > 0 ? displayBoard : PREVIEW_BOARD.slice(0, 3);

  // คำนวณ trackSize สำหรับ 1 ชุดการ์ด (พร้อม margin trailing)
  const trackSize = cards.length * (isVert ? (CARD_H + CARD_GAP) : (CARD_W + CARD_GAP));
  // duration = distance / speed → ยิ่งไวยิ่งสั้น
  const duration  = Math.max(3, Math.round(trackSize / scrollSpeed));

  const accentColor = styles.ac;

  // key สำหรับ restart animation เมื่อ direction / card count เปลี่ยน
  const animKey = `${scrollDir}_${cards.length}`;

  return (
    <>
      <Head><title>Gift Carousel</title></Head>

      {/* ── outer: perspective + 3D transform ──────────────────────────────── */}
      <div style={{
        background:      'transparent',
        display:         'inline-block',
        transform:       styles.transform3D,
        transformOrigin: 'center center',
        transformStyle:  'preserve-3d',
        perspective:     (styles.rx || styles.ry || styles.rz) ? '800px' : undefined,
      }}>

        {/* ── viewport: clip overflow ─────────────────────────────────────── */}
        <div style={{
          background:   styles.bgRgba,
          borderRadius: styles.br,
          overflow:     'hidden',
          padding:      isVert ? `${CARD_GAP}px 0` : `0 ${CARD_GAP}px`,
          ...(isVert
            ? { width: CARD_W + CARD_GAP * 2, height: Math.min(cards.length, 4) * (CARD_H + CARD_GAP) }
            : { height: CARD_H + CARD_GAP * 2 }
          ),
        }}>

          {/* ── track: cards × 2 เพื่อ seamless loop ───────────────────────── */}
          <div
            key={animKey}
            style={{
              display:   'flex',
              flexDirection: isVert ? 'column' : 'row',
              gap:       CARD_GAP,
              animation: `carouselScroll ${duration}s linear ${isReverse ? 'reverse' : 'normal'} infinite`,
              willChange: 'transform',
            }}
          >
            {[...cards, ...cards].map((user, idx) =>
              renderCard(user, idx, idx % cards.length, accentColor, styles, showCoins, showMsg, lastMsgs, cardBg, cardBga)
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes carouselScroll {
          from { transform: ${isVert ? 'translateY(0)' : 'translateX(0)'}; }
          to   { transform: ${isVert ? `translateY(-${trackSize}px)` : `translateX(-${trackSize}px)`}; }
        }
      `}</style>
    </>
  );
}

// ─── render การ์ดแต่ละใบ ──────────────────────────────────────────────────────
function renderCard(user, idx, rankIdx, accentColor, styles, showCoins, showMsg, lastMsgs, cardBgHex, cardBga) {
  const isTop3      = rankIdx < 3;
  const medal       = MEDALS[rankIdx] || `#${rankIdx + 1}`;
  const initLetter  = ((user.nickname || user.uniqueId || '?')[0] || '?').toUpperCase();
  const avatarBg    = AVATAR_BG[rankIdx % AVATAR_BG.length];
  const borderColor = isTop3 ? accentColor : accentColor + '40';
  // พื้นหลังการ์ด: ใช้ cardBg + cardBga เป็นฐาน, top3 บวก tint accent เล็กน้อย
  const baseAlpha   = (cardBga ?? 30) / 100;
  const accentTint  = isTop3 ? 0.05 : 0;
  const cardBgStyle = `rgba(${hexToRgb(cardBgHex || '0a0a14')}, ${(baseAlpha + accentTint).toFixed(2)})`;
  const chatMsg     = lastMsgs[user.uniqueId] || '';

  return (
    <div
      key={`${user.uniqueId}_${idx}`}
      style={{
        flexShrink:    0,
        width:         CARD_W,
        height:        CARD_H,        // fixed height — ทุกการ์ดสูงเท่ากัน
        boxSizing:     'border-box',
        background:    cardBgStyle,
        borderRadius:  styles.br,     // ใช้ br ตัวเดียวกับ widget
        border:        `1px solid ${borderColor}`,
        padding:       '10px 8px 9px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           5,
        position:      'relative',
        overflow:      'hidden',
        // top 3 มีเส้น accent ขอบบน
        ...(isTop3 ? { borderTop: `2px solid ${accentColor}` } : {}),
      }}
    >
      {/* อันดับ */}
      <span style={{
        position:   'absolute',
        top:        5,
        left:       7,
        fontSize:   9,
        fontWeight: 600,
        color:      isTop3 ? accentColor : 'rgba(255,255,255,0.3)',
        fontFamily: 'sans-serif',
        lineHeight: 1,
      }}>{medal}</span>

      {/* Avatar + มงกุฎ #1 */}
      <div style={{ position: 'relative', marginTop: rankIdx === 0 ? 8 : 2 }}>
        {rankIdx === 0 && (
          <span style={{
            position:   'absolute',
            top:        -12,
            left:       '50%',
            transform:  'translateX(-50%)',
            fontSize:   12,
            lineHeight: 1,
            pointerEvents: 'none',
            filter:     'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
          }}>👑</span>
        )}
        {user.profilePictureUrl ? (
          <img
            src={user.profilePictureUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{
              width:        60,
              height:       60,
              borderRadius: '50%',
              border:       `2px solid ${borderColor}`,
              display:      'block',
              objectFit:    'cover',
            }}
          />
        ) : (
          <div style={{
            width:          60,
            height:         60,
            borderRadius:   '50%',
            background:     avatarBg,
            border:         `2px solid ${borderColor}`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       22,
            fontWeight:     700,
            color:          accentColor,
            fontFamily:     'sans-serif',
          }}>
            {initLetter}
          </div>
        )}
      </div>

      {/* ชื่อ */}
      <div style={{
        fontSize:     styles.fs - 1,
        fontWeight:   styles.fw ? 700 : 600,
        color:        styles.tc,
        textAlign:    'center',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        maxWidth:     CARD_W - 14,
        fontFamily:   'sans-serif',
        letterSpacing: '-0.01em',
      }}>
        {user.nickname || user.uniqueId}
      </div>

      {/* จำนวน Diamond */}
      {showCoins && (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        3,
          fontSize:   styles.fs - 2,
          color:      accentColor,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}>
          <span style={{ fontSize: 10 }}>💎</span>
          {(user.totalCoins || 0).toLocaleString()}
        </div>
      )}

      {/* ข้อความ Chat ล่าสุด */}
      {showMsg && chatMsg && (
        <div style={{
          background:   'rgba(255,255,255,0.055)',
          borderRadius: 5,
          padding:      '3px 6px',
          fontSize:     styles.fs - 3,
          color:        'rgba(255,255,255,0.55)',
          textAlign:    'center',
          width:        '100%',
          boxSizing:    'border-box',
          overflow:     'hidden',
          display:      '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight:   1.35,
          fontFamily:   'sans-serif',
          wordBreak:    'break-word',
        }}>
          {chatMsg}
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseConfig(params) {
  const dirRaw    = params.get('scrollDir') || 'left';
  const cardBgRaw = params.get('cardBg')    || '0a0a14';
  return {
    scrollDir:   ['left','right','up','down'].includes(dirRaw) ? dirRaw : 'left',
    scrollSpeed: num(params.get('scrollSpeed'), 50,  10,  200),
    maxRows:     num(params.get('maxRows'),     10,   3,   20),
    showCoins:   params.get('showCoins') !== '0',
    showMsg:     params.get('showMsg')   !== '0',
    cardBg:      /^[0-9a-fA-F]{6}$/.test(cardBgRaw) ? cardBgRaw : '0a0a14',
    cardBga:     num(params.get('cardBga'), 30, 0, 100),
  };
}

// ─── Preview data ─────────────────────────────────────────────────────────────
const PREVIEW_BOARD = [
  { uniqueId: 'u1',  nickname: 'BigGifter',  profilePictureUrl: '', totalCoins: 5400 },
  { uniqueId: 'u2',  nickname: 'LoveStream', profilePictureUrl: '', totalCoins: 3200 },
  { uniqueId: 'u3',  nickname: 'Fan_TH',     profilePictureUrl: '', totalCoins: 1800 },
  { uniqueId: 'u4',  nickname: 'Viewer99',   profilePictureUrl: '', totalCoins: 900  },
  { uniqueId: 'u5',  nickname: 'GiftGiver',  profilePictureUrl: '', totalCoins: 650  },
  { uniqueId: 'u6',  nickname: 'Supporter',  profilePictureUrl: '', totalCoins: 420  },
  { uniqueId: 'u7',  nickname: 'Hearts',     profilePictureUrl: '', totalCoins: 280  },
  { uniqueId: 'u8',  nickname: 'TapTap99',   profilePictureUrl: '', totalCoins: 190  },
  { uniqueId: 'u9',  nickname: 'NightFan',   profilePictureUrl: '', totalCoins: 130  },
  { uniqueId: 'u10', nickname: 'LiveLover',  profilePictureUrl: '', totalCoins: 80   },
];

const PREVIEW_MSGS = {
  u1: 'สุดยอดมากครับ! 🔥',
  u2: 'ชอบมากเลยค่ะ',
  u3: '응원합니다!',
  u4: 'good stream',
  u5: 'เยี่ยมเลย',
  u6: 'keep it up!',
  u7: '555+',
  u8: 'โหว!',
  u9: 'จุ๊บๆๆ',
  u10: 'ฝากด้วยนะ',
};

export function getServerSideProps() { return { props: {} }; }
