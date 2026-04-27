// pages/widget/ttsmonitor.js — TTS Status Monitor Widget (สำหรับ OBS)
// แสดง engine + voice + persona ที่กำลังพูดอยู่ตอนนี้
// ใช้งาน: ใส่เป็น Browser Source ใน OBS, พื้นหลังโปร่งใส

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { createWidgetSocket } from '../../lib/widgetSocket';

const ENGINE_META = {
  gemini31: { icon: '✨', label: 'Gemini 3.1', color: '#a855f7', bg: 'rgba(88,28,135,0.85)' },
  gemini25: { icon: '🌟', label: 'Gemini 2.5', color: '#8b5cf6', bg: 'rgba(76,29,149,0.85)' },
  google:   { icon: '🔑', label: 'Google Cloud', color: '#22c55e', bg: 'rgba(20,83,45,0.85)' },
  web:      { icon: '🔈', label: 'Web Speech',   color: '#3b82f6', bg: 'rgba(30,58,138,0.85)' },
};

let _toastId = 0;

export default function TtsMonitorWidget() {
  const router  = useRouter();
  const { cid, wt } = router.query;
  const cidOrToken  = cid ?? wt; // cid ใหม่ หรือ wt เก่า
  const [toasts, setToasts] = useState([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // transparent bg for OBS
    document.documentElement.style.background = 'transparent';
    document.body.style.background            = 'transparent';
    return () => { mountedRef.current = false; };
  }, []);

  const addToast = (status) => {
    if (!mountedRef.current) return;
    const id  = ++_toastId;
    const meta = ENGINE_META[status.engine] || ENGINE_META.web;
    const item = { id, meta, ...status, entering: true };

    setToasts(prev => [...prev.slice(-4), item]); // max 5 toasts

    // เปลี่ยนเป็น normal (หยุด entering animation)
    setTimeout(() => {
      if (!mountedRef.current) return;
      setToasts(prev => prev.map(t => t.id === id ? { ...t, entering: false } : t));
    }, 50);

    // เริ่ม fade out หลัง 6.5 วิ (เพิ่มจาก 4.2 — อ่านข้อความทัน)
    setTimeout(() => {
      if (!mountedRef.current) return;
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    }, 6500);

    // ลบออกหลัง animation เสร็จ
    setTimeout(() => {
      if (!mountedRef.current) return;
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7200);
  };

  // เชื่อม socket
  useEffect(() => {
    if (!cidOrToken) return;
    const socket = createWidgetSocket(cidOrToken, {
      tts_status: (data) => addToast(data),
    });
    if (!socket) return;
    return () => socket.disconnect();
  }, [cidOrToken]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: transparent !important; width: 100%; height: 100%; overflow: hidden; }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }

        .toast-item {
          animation: slideIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
          border-radius: 14px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          width: fit-content;
          max-width: 320px;
          margin-bottom: 8px;
        }
        .toast-item.leaving {
          animation: fadeOut 0.5s ease forwards;
        }

        .toast-icon {
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
        }
        .toast-body {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .toast-engine {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          opacity: 0.75;
          font-family: system-ui, sans-serif;
        }
        .toast-voice {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          font-family: system-ui, sans-serif;
          line-height: 1.2;
        }
        .toast-persona {
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          font-family: system-ui, sans-serif;
          margin-top: 1px;
        }
        .toast-text {
          font-size: 13px;
          color: rgba(255,255,255,0.90);
          font-family: system-ui, sans-serif;
          margin-top: 5px;
          line-height: 1.4;
          max-width: 260px;
          word-break: break-word;
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 5px;
        }

        .container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column-reverse;
          align-items: center;
          pointer-events: none;
        }
      `}</style>

      <div className="container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-item${t.leaving ? ' leaving' : ''}`}
            style={{ background: t.meta.bg }}
          >
            <span className="toast-icon">{t.meta.icon}</span>
            <div className="toast-body">
              <span className="toast-engine" style={{ color: t.meta.color }}>
                {t.meta.label}
              </span>
              <span className="toast-voice">
                {t.engine === 'web'
                  ? (t.voice || 'เสียงระบบ')
                  : t.engine === 'google'
                    ? (t.voice || 'Neural Thai')
                    : (t.voice || 'Aoede')
                }
                {t.voiceDesc ? ` · ${t.voiceDesc}` : ''}
              </span>
              {t.personaLabel && (
                <span className="toast-persona">{t.personaLabel}</span>
              )}
              {t.text && (
                <span className="toast-text">💬 {t.text}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
