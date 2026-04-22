// widget/alert.js — Gift Alert Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 150
import { useEffect, useRef, useState } from 'react';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function AlertWidget() {
  const [alert, setAlert]     = useState(null);
  const [visible, setVisible] = useState(false);
  const [styles, setStyles]   = useState(null);
  const timersRef = useRef([]);

  // ล้าง timer ทั้งหมดเมื่อ unmount
  useEffect(() => {
    return () => { timersRef.current.forEach(id => clearTimeout(id)); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const widgetToken = params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'alert');
    setStyles(s);

    if (isPreview) {
      showAlert({ nickname: 'TTsamUser', giftName: 'Rose', repeatCount: 5, diamondCount: 1, profilePictureUrl: '', alertType: 'gift' });
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      gift:   (data) => { if (data) showAlert({ ...sanitizeEvent(data), alertType: 'gift' }); },
      follow: (data) => { if (data) showAlert({ ...sanitizeEvent(data), alertType: 'follow' }); },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  function showAlert(data) {
    setAlert(data);
    setVisible(true);
    const t1 = setTimeout(() => {
      setVisible(false);
      const t2 = setTimeout(() => setAlert(null), 500);
      timersRef.current.push(t2);
    }, data.alertType === 'follow' ? 4000 : 5000);
    timersRef.current.push(t1);
  }

  if (!alert || !styles) return <div style={{ background: 'transparent' }} />;

  const avatarUrl = safeTikTokImageUrl(alert.profilePictureUrl);

  return (
    <div style={{ background: 'transparent', minHeight: 150, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className={visible ? 'alert-enter' : 'alert-exit'}
        style={{
          background:   styles.bgRgba,
          border:       `1px solid ${styles.ac}55`,
          borderRadius: styles.br,
          padding:      '14px 20px',
          display:      'flex',
          alignItems:   'center',
          gap:          14,
          minWidth:     300,
          boxShadow:    `0 0 28px ${styles.ac}44`,
        }}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${styles.ac}`, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: styles.ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {alert.alertType === 'follow' ? '➕' : '🎁'}
          </div>
        )}

        {/* Text */}
        <div>
          <p style={{ color: styles.ac, fontWeight: 700, fontSize: styles.fs, fontFamily: 'sans-serif', margin: 0 }}>
            {alert.nickname || alert.uniqueId}
          </p>
          <p style={{ color: styles.tc, fontSize: styles.fs - 2, fontFamily: 'sans-serif', margin: '3px 0 0' }}>
            {alert.alertType === 'gift'
              ? `ส่ง ${alert.giftName}${alert.repeatCount > 1 ? ` ×${alert.repeatCount}` : ''} 🎁`
              : 'ติดตามแล้ว! 🎉'}
          </p>
          {alert.alertType === 'gift' && (
            <p style={{ color: styles.ac + 'cc', fontSize: styles.fs - 3, fontFamily: 'sans-serif', margin: '2px 0 0' }}>
              💎 {alert.diamondCount * alert.repeatCount} diamonds
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(110%); opacity: 0; } }
        .alert-enter { animation: slideInRight 0.4s cubic-bezier(0.22,1,0.36,1); }
        .alert-exit  { animation: slideOutRight 0.35s ease-in forwards; }
      `}</style>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
