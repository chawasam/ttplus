// widget/alert.js — Gift Alert Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 150
import { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';

export default function AlertWidget() {
  const [alert, setAlert]     = useState(null);
  const [visible, setVisible] = useState(false);
  const [styles, setStyles]   = useState(null);

  const queueRef      = useRef([]);   // รายการ alert ที่รอแสดง
  const isShowingRef  = useRef(false); // กำลังแสดง alert อยู่หรือเปล่า
  const timersRef     = useRef([]);

  // ล้าง timer ทั้งหมดเมื่อ unmount
  useEffect(() => {
    return () => { timersRef.current.forEach(id => clearTimeout(id)); };
  }, []);

  // ===== Queue processor =====
  const processQueue = useCallback(() => {
    if (isShowingRef.current) return;
    if (queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    isShowingRef.current = true;

    setAlert(next);
    setVisible(true);

    const displayMs = next.alertType === 'follow' ? 4000 : 5000;

    const t1 = setTimeout(() => {
      setVisible(false);
      const t2 = setTimeout(() => {
        setAlert(null);
        isShowingRef.current = false;
        // ถ้ามีคิวอยู่ รอ 300ms แล้วแสดงตัวถัดไป
        if (queueRef.current.length > 0) {
          const t3 = setTimeout(processQueue, 300);
          timersRef.current.push(t3);
        }
      }, 500);
      timersRef.current.push(t2);
    }, displayMs);
    timersRef.current.push(t1);
  }, []);

  // ===== Enqueue alert =====
  const enqueueAlert = useCallback((data) => {
    // จำกัดคิวไม่เกิน 10 รายการ — กัน flood
    if (queueRef.current.length >= 10) {
      queueRef.current.shift(); // ทิ้งเก่าสุด
    }
    queueRef.current.push(data);
    processQueue();
  }, [processQueue]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s = parseWidgetStyles(params, 'alert');
    setStyles(s);

    if (isPreview) {
      enqueueAlert({ nickname: 'TTsamUser', giftName: 'Rose', repeatCount: 5, diamondCount: 1, profilePictureUrl: '', alertType: 'gift' });
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      gift:         (data) => { if (data) enqueueAlert({ ...sanitizeEvent(data), alertType: 'gift' }); },
      follow:       (data) => { if (data) enqueueAlert({ ...sanitizeEvent(data), alertType: 'follow' }); },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'alert') return;
        setStyles(rawToStyle(style, 'alert'));
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!alert || !styles) return <div style={{ background: 'transparent' }} />;

  const avatarUrl = safeTikTokImageUrl(alert.profilePictureUrl);

  // === สี tier ตาม diamond count ===
  const totalDiamonds = (alert.diamondCount ?? 0) * (alert.repeatCount ?? 1);
  const tierColor =
    totalDiamonds >= 1000 ? '#ff4b4b' :   // 🔴 ≥1000 สีแดงเลือด
    totalDiamonds >= 200  ? '#ff8c00' :   // 🟠 ≥200 สีทอง-ส้ม
    totalDiamonds >= 50   ? '#a855f7' :   // 🟣 ≥50 ม่วง
    styles.ac;                             // ค่าปกติ

  const glowColor = alert.alertType === 'gift' ? tierColor : styles.ac;

  return (
    <div style={{ background: 'transparent', minHeight: 150, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className={visible ? 'alert-enter' : 'alert-exit'}
        style={{
          background:   styles.bgRgba,
          border:       `1px solid ${glowColor}55`,
          borderRadius: styles.br,
          padding:      '14px 20px',
          display:      'flex',
          alignItems:   'center',
          gap:          14,
          minWidth:     300,
          boxShadow:    `0 0 28px ${glowColor}44`,
        }}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${glowColor}`, flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: glowColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {alert.alertType === 'follow' ? '➕' : '🎁'}
          </div>
        )}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: glowColor, fontWeight: 700, fontSize: styles.fs, fontFamily: 'sans-serif', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {alert.nickname || alert.uniqueId}
          </p>
          <p style={{ color: styles.tc, fontSize: styles.fs - 2, fontFamily: 'sans-serif', margin: '3px 0 0' }}>
            {alert.alertType === 'gift'
              ? `ส่ง ${alert.giftName}${alert.repeatCount > 1 ? ` ×${alert.repeatCount}` : ''} 🎁`
              : 'ติดตามแล้ว! 🎉'}
          </p>
          {alert.alertType === 'gift' && (
            <p style={{ color: glowColor + 'cc', fontSize: styles.fs - 3, fontFamily: 'sans-serif', margin: '2px 0 0' }}>
              💎 {totalDiamonds.toLocaleString()} diamonds
              {/* Badge tier */}
              {totalDiamonds >= 1000 && <span style={{ marginLeft: 6, background: '#ff4b4b22', color: '#ff4b4b', borderRadius: 4, padding: '1px 5px', fontSize: styles.fs - 5, fontWeight: 700 }}>MEGA</span>}
              {totalDiamonds >= 200 && totalDiamonds < 1000 && <span style={{ marginLeft: 6, background: '#ff8c0022', color: '#ff8c00', borderRadius: 4, padding: '1px 5px', fontSize: styles.fs - 5, fontWeight: 700 }}>BIG</span>}
            </p>
          )}
        </div>

        {/* คิวหลังบ้าน — แสดงจำนวนที่รออยู่ */}
        {queueRef.current.length > 0 && (
          <div style={{ flexShrink: 0, fontSize: 10, color: styles.tc + '88', fontFamily: 'sans-serif', textAlign: 'center', lineHeight: 1.3 }}>
            +{queueRef.current.length}<br/>more
          </div>
        )}
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
