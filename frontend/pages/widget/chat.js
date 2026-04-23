// widget/chat.js — Chat Overlay สำหรับ OBS (พื้นหลังโปร่งใส)
// OBS Size แนะนำ: 400 x 600
// คลิกข้อความเพื่อดู Profile Card ของผู้ส่ง
import { useEffect, useState, useRef, useCallback } from 'react';
import { sanitizeEvent, safeTikTokImageUrl } from '../../lib/sanitize';
import { parseWidgetStyles, rawToStyle } from '../../lib/widgetStyles';
import { createWidgetSocket } from '../../lib/widgetSocket';
import { SkinParticles } from '../../lib/chatSkins';
import SKINS from '../../lib/chatSkins';

const PALETTE = ['#ff2d62','#ff6b35','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
const MAX_COLOR_MAP = 150;
const colorMap = new Map();
let colorIdx = 0;
function getUserColor(id) {
  if (!id) return PALETTE[0];
  if (!colorMap.has(id)) {
    if (colorMap.size >= MAX_COLOR_MAP) {
      colorMap.delete(colorMap.keys().next().value);
    }
    colorMap.set(id, PALETTE[colorIdx++ % PALETTE.length]);
  }
  return colorMap.get(id);
}

let _msgSeq = 0;

export default function ChatWidget() {
  const [messages, setMessages]     = useState([]);
  const [styles, setStyles]         = useState(null);
  const [profileCard, setProfileCard] = useState(null); // ข้อมูล user ที่กำลังแสดง
  const [cardVisible, setCardVisible] = useState(false);

  const stylesRef      = useRef(null);
  const bottomRef      = useRef(null);
  const topRef         = useRef(null);
  const cardTimerRef   = useRef(null);
  const hideTimerRef   = useRef(null);

  useEffect(() => {
    return () => {
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // scroll ไปหา anchor เมื่อ messages เปลี่ยน
  useEffect(() => {
    const dir = stylesRef.current?.dir ?? 'down';
    if (dir === 'up') {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search);
    const widgetToken = params.get('cid') ?? params.get('wt');
    const isPreview   = params.get('preview') === '1';
    const s           = parseWidgetStyles(params, 'chat');
    setStyles(s);
    stylesRef.current = s;

    const addMsg = (msg, currentMax) => {
      setMessages(prev => [...prev.slice(-(currentMax - 1)), msg]);
    };

    if (isPreview) {
      const preview = [
        { _key: ++_msgSeq, uniqueId: 'u1', nickname: 'น้องแมว',    comment: 'สวัสดีครับ! 🐱',    bio: 'TikTok streamer 🎮', profilePictureUrl: '', ts: Date.now() - 5000 },
        { _key: ++_msgSeq, uniqueId: 'u2', nickname: 'TTsamFan',   comment: 'ไลฟ์สนุกมากเลย 🎉', bio: '', profilePictureUrl: '', ts: Date.now() - 3000 },
        { _key: ++_msgSeq, uniqueId: 'u3', nickname: 'Hello_World', comment: '555555 ขำมากก',      bio: 'คนดูไลฟ์ประจำ 💫',   profilePictureUrl: '', ts: Date.now() - 1000 },
      ];
      setMessages(preview);
      return;
    }

    const socket = createWidgetSocket(widgetToken, {
      chat: (data) => {
        const safe = sanitizeEvent(data);
        const cur = stylesRef.current || s;
        addMsg({ ...safe, _key: ++_msgSeq, ts: Date.now() }, cur.max);
      },
      style_update: ({ widgetId, style }) => {
        if (widgetId !== 'chat') return;
        const next = rawToStyle(style, 'chat');
        stylesRef.current = next;
        setStyles(next);
      },
    });
    if (!socket) return;

    return () => socket.disconnect();
  }, []);

  // ===== Profile Card =====
  const showProfile = useCallback((msg) => {
    if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setProfileCard(msg);
    setCardVisible(true);

    // auto-close หลัง 6 วินาที
    cardTimerRef.current = setTimeout(() => {
      setCardVisible(false);
      hideTimerRef.current = setTimeout(() => setProfileCard(null), 400);
    }, 6000);
  }, []);

  const closeProfile = useCallback(() => {
    if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
    setCardVisible(false);
    hideTimerRef.current = setTimeout(() => setProfileCard(null), 400);
  }, []);

  if (!styles) return <div style={{ background: 'transparent' }} />;

  const isUp        = styles.dir === 'up';
  const displayMsgs = isUp ? [...messages].reverse() : messages;
  const animName    = isUp ? 'slideDown' : 'slideUp';
  const activeSkin  = styles.skin ? SKINS[styles.skin] : null;

  return (
    <>
      <SkinParticles skinId={styles.skin} />

      <div
        style={{
          background:      'transparent',
          padding:         10,
          maxWidth:        400,
          height:          '100vh',
          overflowY:       'auto',
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  isUp ? 'flex-start' : 'flex-end',
          gap:             5,
          boxSizing:       'border-box',
          scrollbarWidth:  'none',
          transform:       styles.transform3D,
          transformOrigin: 'center center',
          transformStyle:  'preserve-3d',
          position:        'relative',
          zIndex:          1,
        }}
      >
        <div ref={topRef} style={{ flexShrink: 0 }} />

        {displayMsgs.map((msg) => {
          const userColor  = getUserColor(msg.uniqueId);
          const bga        = styles.raw?.bga ?? 65;
          const skinBubble = activeSkin ? activeSkin.bubbleStyle(userColor, styles.ac, bga) : {};
          const skinName   = activeSkin ? activeSkin.nameStyle(userColor, styles.ac)        : {};
          const skinText   = activeSkin ? activeSkin.textStyle(styles.ac)                   : {};
          const isStack    = styles.layout === 'stack';

          return (
            <div
              key={msg._key}
              onClick={() => showProfile(msg)}
              title="คลิกเพื่อดูโปรไฟล์"
              style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        8,
                animation:  `${animName} 0.3s ease-out both`,
                background: styles.bgRgba,
                padding:    '6px 10px',
                borderLeft: `3px solid ${userColor}`,
                cursor:     'pointer',
                flexShrink: 0,
                alignSelf:  'flex-start',
                maxWidth:   `${styles.bw ?? 100}%`,
                boxSizing:  'border-box',
                ...skinBubble,
                // br ต้องอยู่หลัง skinBubble เสมอ — ให้ user slider ชนะเสมอ
                borderRadius: styles.br,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {isStack ? (
                  <>
                    <div style={{
                      color: userColor, fontWeight: 700,
                      fontSize: styles.fs, fontFamily: 'sans-serif',
                      lineHeight: 1.3,
                      ...skinName,
                    }}>
                      {msg.nickname || msg.uniqueId}
                    </div>
                    <div style={{
                      color: styles.tc,
                      fontSize: styles.fs, fontFamily: 'sans-serif',
                      lineHeight: 1.4, marginTop: 2,
                      ...skinText,
                    }}>
                      {msg.comment}
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{
                      color: userColor, fontWeight: 700,
                      fontSize: styles.fs, fontFamily: 'sans-serif',
                      ...skinName,
                    }}>
                      {msg.nickname || msg.uniqueId}
                    </span>
                    <span style={{
                      color: styles.tc,
                      fontSize: styles.fs, fontFamily: 'sans-serif', marginLeft: 6,
                      ...skinText,
                    }}>
                      {msg.comment}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} style={{ flexShrink: 0 }} />

        <style>{`
          div::-webkit-scrollbar { display: none; }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardPop {
            0%   { opacity: 0; transform: translateX(-50%) scale(0.88) translateY(12px); }
            60%  { transform: translateX(-50%) scale(1.03) translateY(-2px); }
            100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
          }
          @keyframes cardFade {
            from { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
            to   { opacity: 0; transform: translateX(-50%) scale(0.92) translateY(8px); }
          }
        `}</style>
      </div>

      {/* ===== Profile Card Popup (position:fixed — นอก transform container) ===== */}
      {profileCard && (
        <ProfileCard
          msg={profileCard}
          visible={cardVisible}
          onClose={closeProfile}
          userColor={getUserColor(profileCard.uniqueId)}
        />
      )}
    </>
  );
}

// ===== Profile Card Component =====
function ProfileCard({ msg, visible, onClose, userColor }) {
  const avatarUrl = safeTikTokImageUrl(msg.profilePictureUrl);

  return (
    <div
      onClick={onClose}
      style={{
        position:   'fixed',
        bottom:     24,
        left:       '50%',
        transform:  'translateX(-50%)',
        zIndex:     200,
        animation:  visible ? 'cardPop 0.45s cubic-bezier(0.22,1.2,0.36,1) forwards'
                            : 'cardFade 0.35s ease-in forwards',
        cursor:     'pointer',
        width:      '88%',
        maxWidth:   340,
      }}
    >
      {/* Glow layer */}
      <div style={{
        position:     'absolute',
        inset:        -1,
        borderRadius: 22,
        background:   `radial-gradient(ellipse at 30% 0%, ${userColor}55 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Card body */}
      <div style={{
        background:   'rgba(10,10,20,0.92)',
        border:       `1.5px solid ${userColor}88`,
        borderRadius: 20,
        padding:      '16px 18px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          14,
        backdropFilter: 'blur(12px)',
        boxShadow:    `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${userColor}22 inset`,
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* shimmer strip */}
        <div style={{
          position:   'absolute',
          top:        0, left: '-60%',
          width:      '40%', height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{
              width:        52, height:       52,
              borderRadius: '50%',
              border:       `2.5px solid ${userColor}`,
              flexShrink:   0,
              objectFit:    'cover',
              boxShadow:    `0 0 14px ${userColor}66`,
            }}
          />
        ) : (
          <div style={{
            width:        52, height:       52,
            borderRadius: '50%',
            background:   `linear-gradient(135deg, ${userColor}88, ${userColor}22)`,
            border:       `2px solid ${userColor}`,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     22,
            flexShrink:   0,
          }}>
            👤
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Nickname */}
          <div style={{
            color:      userColor,
            fontWeight: 800,
            fontSize:   15,
            fontFamily: 'sans-serif',
            lineHeight: 1.2,
            whiteSpace:     'nowrap',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
          }}>
            {msg.nickname || msg.uniqueId}
          </div>

          {/* @username + follow badge */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            marginTop:  3,
          }}>
            <span style={{
              color:      'rgba(255,255,255,0.45)',
              fontSize:   11,
              fontFamily: 'sans-serif',
            }}>
              @{msg.uniqueId}
            </span>
            {msg.followRole >= 1 && (
              <span style={{
                background:   `${userColor}28`,
                color:        userColor,
                border:       `1px solid ${userColor}55`,
                borderRadius: 6,
                padding:      '1px 6px',
                fontSize:     9,
                fontWeight:   700,
                fontFamily:   'sans-serif',
                letterSpacing: 0.5,
              }}>
                {msg.followRole >= 2 ? 'FRIEND' : 'FOLLOWER'}
              </span>
            )}
          </div>

          {/* Bio */}
          {msg.bio && (
            <div style={{
              color:      'rgba(255,255,255,0.72)',
              fontSize:   12,
              fontFamily: 'sans-serif',
              marginTop:  8,
              lineHeight: 1.45,
              borderTop:  '1px solid rgba(255,255,255,0.08)',
              paddingTop: 7,
              wordBreak:  'break-word',
            }}>
              {msg.bio}
            </div>
          )}

          {/* ข้อความที่กด */}
          <div style={{
            marginTop:    8,
            padding:      '6px 10px',
            background:   `${userColor}14`,
            borderLeft:   `2px solid ${userColor}66`,
            borderRadius: '0 8px 8px 0',
            color:        'rgba(255,255,255,0.6)',
            fontSize:     11,
            fontFamily:   'sans-serif',
            lineHeight:   1.4,
            fontStyle:    'italic',
          }}>
            "{msg.comment}"
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            position:   'absolute',
            top:        8, right: 10,
            background: 'none',
            border:     'none',
            color:      'rgba(255,255,255,0.3)',
            cursor:     'pointer',
            fontSize:   13,
            lineHeight: 1,
            padding:    '2px 4px',
          }}
        >✕</button>
      </div>
    </div>
  );
}

export function getServerSideProps() { return { props: {} }; }
