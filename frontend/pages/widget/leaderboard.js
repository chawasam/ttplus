// widget/leaderboard.js — Gift Leaderboard Overlay สำหรับ OBS
// OBS Size แนะนำ: 300 x 400
import { useEffect, useState } from 'react';
import { parseWidgetStyles, tcCssProps } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardWidget() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [styles, setStyles]           = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wt        = params.get('cid') ?? params.get('wt');
    const isPreview = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'leaderboard');
    setStyles(s);

    if (isPreview) {
      setLeaderboard([
        { uniqueId: 'u1', nickname: 'BigGifter',   diamonds: 5400 },
        { uniqueId: 'u2', nickname: 'LoveStream',  diamonds: 3200 },
        { uniqueId: 'u3', nickname: 'Fan_TH',      diamonds: 1800 },
        { uniqueId: 'u4', nickname: 'Viewer99',    diamonds: 900  },
        { uniqueId: 'u5', nickname: 'TikUser',     diamonds: 500  },
      ]);
      return;
    }

    const MAX_BOARD = 300;
    const board = new Map();

    // helper: sort board และ update state
    function flushBoard() {
      setLeaderboard(
        Array.from(board.values())
          .sort((a, b) => b.diamonds - a.diamonds)
          .slice(0, 5)
      );
    }

    const socket = createWidgetSocket(wt, {
      // รับ gift event แบบ real-time → สะสม local
      gift: (data) => {
        const safe     = sanitizeEvent(data);
        const diamonds = safe.diamondCount * safe.repeatCount;
        const existing = board.get(safe.uniqueId);
        board.set(safe.uniqueId, {
          uniqueId:          safe.uniqueId,
          nickname:          safe.nickname,
          profilePictureUrl: safeTikTokImageUrl(safe.profilePictureUrl),
          diamonds:          (existing?.diamonds || 0) + diamonds,
        });

        // trim board ถ้าเกิน MAX เก็บแค่ top 150
        if (board.size > MAX_BOARD) {
          const top = [...board.entries()]
            .sort((a, b) => b[1].diamonds - a[1].diamonds)
            .slice(0, MAX_BOARD / 2);
          board.clear();
          top.forEach(([k, v]) => board.set(k, v));
        }

        flushBoard();
      },

      // restore state เมื่อ widget join (backend ส่ง leaderboard ปัจจุบันทันที)
      // ป้องกัน widget เริ่มนับจากศูนย์เมื่อ OBS reload กลางเซสชัน
      leaderboard_update: ({ type, data }) => {
        if (type !== 'gifts' || !Array.isArray(data) || data.length === 0) return;
        // merge server state → local board (server มี totalCoins, local ใช้ diamonds)
        data.forEach(item => {
          if (!item.uniqueId) return;
          const existing = board.get(item.uniqueId);
          // ใช้ค่าสูงกว่าระหว่าง local กับ server (กรณี gift มาระหว่าง join)
          const serverDiamonds = item.totalCoins || item.diamonds || 0;
          board.set(item.uniqueId, {
            uniqueId:          item.uniqueId,
            nickname:          item.nickname || item.uniqueId,
            profilePictureUrl: safeTikTokImageUrl(item.profilePictureUrl || ''),
            diamonds:          Math.max(existing?.diamonds || 0, serverDiamonds),
          });
        });
        flushBoard();
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{ background: styles.bgRgba, borderRadius: styles.br, padding: 14, minWidth: 240, fontFamily: 'sans-serif' }}>
      {leaderboard.length === 0 ? (
        <p style={{ color: styles.tc + '66', textAlign: 'center', fontSize: styles.fs - 2 }}>รอข้อมูล...</p>
      ) : (
        leaderboard.map((user, i) => (
          <div
            key={user.uniqueId}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          9,
              marginBottom: 7,
              background:   styles.rowBgRgba,
              borderRadius: Math.max(styles.br - 4, 4),
              padding:      '7px 10px',
            }}
          >
            <span style={{ fontSize: styles.fs + 2, width: 24, textAlign: 'center', flexShrink: 0 }}>
              {MEDALS[i] || `${i + 1}`}
            </span>
            {user.profilePictureUrl && (
              <img
                src={user.profilePictureUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${styles.ac}`, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ ...tcCssProps(styles), fontSize: styles.fs, fontWeight: styles.fw ? 700 : 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.nickname || user.uniqueId}
              </p>
            </div>
            <span style={{ color: styles.ac, fontSize: styles.fs - 2, fontWeight: 700, flexShrink: 0 }}>
              💎 {user.diamonds?.toLocaleString()}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
