// widget/leaderboard.js — Gift Leaderboard Overlay สำหรับ OBS
// OBS Size แนะนำ: 300 x 400
import { useEffect, useState } from 'react';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { createWidgetSocket } from '../../lib/widgetSocket';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardWidget() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [styles, setStyles]           = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wt        = params.get('wt');
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

    const socket = createWidgetSocket(wt, {
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

        setLeaderboard(
          Array.from(board.values())
            .sort((a, b) => b.diamonds - a.diamonds)
            .slice(0, 5)
        );
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  return (
    <div style={{ background: styles.bgRgba, borderRadius: styles.br, padding: 14, minWidth: 240, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <h3 style={{ color: styles.ac, fontWeight: 700, fontSize: styles.fs, margin: '0 0 10px', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' }}>
        🏆 Top Gifters
      </h3>

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
              background:   styles.tc + '0d', // 5% white/black
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
              <p style={{ color: styles.tc, fontSize: styles.fs, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
