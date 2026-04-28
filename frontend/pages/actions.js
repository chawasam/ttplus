// pages/actions.js — ลูกเล่น TT: Actions & Events
import { useEffect, useState, useCallback, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import { speak } from '../lib/tts';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';

// ── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = [
  { id: 'show_picture',       icon: '🖼',  label: 'แสดงรูป / GIF' },
  { id: 'play_video',         icon: '🎬',  label: 'เล่นวิดีโอ' },
  { id: 'play_audio',         icon: '🔊',  label: 'เล่นเสียง' },
  { id: 'show_alert',         icon: '📢',  label: 'Show Alert' },
  { id: 'read_tts',           icon: '🗣',  label: 'อ่านออกเสียง (TTS)' },
  { id: 'switch_obs_scene',   icon: '🎬',  label: 'สลับ Scene OBS' },
  { id: 'activate_obs_source',icon: '👁',  label: 'เปิด/ปิด OBS Source' },
];

const TRIGGER_LIST = [
  { id: 'join',             label: '🚪 คนเข้า Live' },
  { id: 'first_activity',   label: '👤 Activity แรกของ session' },
  { id: 'follow',           label: '❤️ กด Follow' },
  { id: 'share',            label: '🔗 กด Share' },
  { id: 'subscribe',        label: '⭐ Subscribe' },
  { id: 'likes',            label: '👍 Like ครบ X ครั้ง' },
  { id: 'chat',             label: '💬 พิมพ์ในแชท (ทุก comment)' },
  { id: 'command',          label: '⌨️ พิมพ์ keyword ในแชท' },
  { id: 'gift_min_coins',   label: '🎁 ส่ง Gift ≥ X coins' },
  { id: 'specific_gift',    label: '🎀 ส่ง Gift ชิ้นนั้นๆ', popular: true },
  { id: 'subscriber_emote', label: '😄 ส่ง Subscriber Emote' },
  { id: 'fan_club_sticker', label: '🏅 ส่ง Fan Club Sticker' },
  { id: 'tiktok_shop',      label: '🛒 ซื้อของจาก TikTok Shop' },
];

const WHO_LIST = [
  { id: 'everyone',       label: 'ทุกคน',        popular: true  },
  { id: 'follower',       label: 'Follower' },
  { id: 'subscriber',     label: 'Subscriber' },
  { id: 'moderator',      label: 'Moderator' },
  { id: 'top_gifter',     label: 'Top Gifter' },
  { id: 'specific_user',  label: 'ผู้ใช้ที่ระบุ' },
];

const DEFAULT_ACTION = {
  name: '',
  types: [],
  pictureUrl: '',
  videoUrl: '',
  audioUrl: '',
  alertText: 'ขอบคุณ {username}! 🎉',
  ttsText: 'ขอบคุณ {username} ที่ส่ง {giftname}!',
  obsScene: '',
  obsSceneReturn: false,   // กลับ scene เดิมหลังจบ (ใช้ displayDuration เป็น timing)
  obsSource: '',
  obsSourceReturn: false,  // ปิด source กลับหลังจบ (ใช้ displayDuration เป็น timing)
  displayDuration: 5,
  overlayScreen: 1,
  globalCooldown: 0,
  userCooldown: 0,
  fadeInOut: true,
  repeatWithCombos: false,
  enabled: true,
};

const DEFAULT_EVENT = {
  trigger: 'specific_gift',
  whoCanTrigger: 'everyone',
  specificUser: '',
  teamMemberLevel: 0,
  keyword: '',
  minCoins: 10,
  specificGiftName: '',
  likesCount: 50,
  actionIds: [],
  randomActionIds: [],
  enabled: true,
};

// ── TikTok Gift list (ชื่อจริงตาม TikTok + coins) ────────────────────────────
// หมายเหตุ: รายชื่อนี้เป็นค่า default — ระบบจะ merge กับรายชื่อจริง
// ที่รวบรวมจาก extendedGiftInfo ระหว่าง live session โดยอัตโนมัติ
const TIKTOK_GIFTS = [
  // ── 1 coin ──
  { name: 'Rose',              coins: 1    },
  { name: 'TikTok',            coins: 1    },
  { name: 'Ice Cream Cone',    coins: 1    },
  { name: 'Heart Me',          coins: 1    },
  { name: 'Confetti',          coins: 1    },
  { name: 'Cheer',             coins: 1    },
  { name: 'Hat',               coins: 1    },
  { name: 'Love You',          coins: 1    },
  { name: 'Like',              coins: 1    },
  { name: 'Thumbs Up',         coins: 1    },
  { name: 'Doughnut',          coins: 1    },
  { name: 'Tree',              coins: 1    },
  // ── 5 coins ──
  { name: 'Finger Heart',      coins: 5    },
  { name: 'Panda',             coins: 5    },
  { name: 'Italian Hand',      coins: 5    },
  { name: 'Sunglasses',        coins: 5    },
  { name: 'GG',                coins: 5    },
  { name: 'Rainbow',           coins: 5    },
  { name: 'Shooting Star',     coins: 5    },
  // ── 10 coins ──
  { name: 'Hand Heart',        coins: 10   },
  { name: 'Star',              coins: 10   },
  { name: 'Birthday Cake',     coins: 10   },
  // ── 25 coins ──
  { name: 'Love Bang',         coins: 25   },
  { name: 'Mini Speaker',      coins: 25   },
  { name: 'Butterfly',         coins: 25   },
  // ── 50 coins ──
  { name: 'Sun Cream',         coins: 50   },
  { name: 'Mic',               coins: 50   },
  { name: 'Wishing Bottle',    coins: 50   },
  { name: 'Lucky Cat',         coins: 50   },
  // ── 99 coins ──
  { name: 'Cap',               coins: 99   },
  { name: 'Microphone',        coins: 99   },
  // ── 100–199 coins ──
  { name: 'Football',          coins: 100  },
  { name: 'Rainbow Puke',      coins: 100  },
  { name: 'Concert',           coins: 100  },
  { name: 'Carnival',          coins: 100  },
  { name: 'Drum',              coins: 100  },
  { name: 'Gift Box',          coins: 100  },
  // ── 200–299 coins ──
  { name: 'Corgi',             coins: 200  },
  { name: 'Mirror',            coins: 299  },
  { name: 'Rose Bouquet',      coins: 299  },
  { name: 'Flying Beauty',     coins: 299  },
  // ── 300–499 coins ──
  { name: 'Silver Crown',      coins: 399  },
  { name: 'Balloons',          coins: 399  },
  // ── 500–999 coins ──
  { name: 'Galaxy',            coins: 500  },
  { name: 'Perfume',           coins: 500  },
  { name: 'Drama Queen',       coins: 500  },
  { name: 'Money Gun',         coins: 500  },
  { name: 'Gem',               coins: 500  },
  { name: 'Duck Duck',         coins: 699  },
  { name: 'Sports Car',        coins: 699  },
  { name: 'Ferris Wheel',      coins: 899  },
  // ── 1,000–1,999 coins ──
  { name: "I'm Very Rich",     coins: 1000 },
  { name: 'Garland',           coins: 1000 },
  { name: 'Rocket',            coins: 1000 },
  { name: 'Train',             coins: 1000 },
  { name: 'Paper Crane',       coins: 1000 },
  { name: 'Gaming Chair',      coins: 1000 },
  { name: 'Airplane',          coins: 1000 },
  { name: 'Dragon',            coins: 1000 },
  { name: 'Lollipop',          coins: 1999 },
  { name: 'Luxury Car',        coins: 1999 },
  // ── 2,000–4,999 coins ──
  { name: 'Crown',             coins: 2999 },
  { name: 'Dino Land',         coins: 2999 },
  { name: 'Planet',            coins: 2999 },
  { name: 'Ship',              coins: 3999 },
  { name: 'Money Rain',        coins: 3999 },
  // ── 5,000–9,999 coins ──
  { name: 'Interstellar',      coins: 6999 },
  { name: 'Fantasy',           coins: 6999 },
  { name: 'Fireworks',         coins: 6999 },
  { name: 'Private Jet',       coins: 9999 },
  // ── 10,000+ coins ──
  { name: 'TikTok Universe',   coins: 10000 },
  { name: 'Gamer Girl',        coins: 10000 },
  { name: 'Diamond Flight',    coins: 19999 },
  { name: 'Lion',              coins: 29999 },
  { name: 'Universe',          coins: 34999 },
  { name: 'Falcon',            coins: 44999 },
  { name: 'Power Punch',       coins: 49999 },
];

// ── Small helpers ────────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = 'text', min, step, className = '' }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder} min={min} step={step}
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none w-full"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={clsx('w-9 h-5 rounded-full transition-colors flex items-center px-0.5', checked ? 'bg-brand-600' : 'bg-gray-700')}
      >
        <div className={clsx('w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

// ── GiftPicker — inline chip grid with price filter (แบบ C) ─────────────────
const PRICE_FILTERS = [
  { id: 'all',  label: 'ทั้งหมด',   min: 0,    max: Infinity },
  { id: 'f1',   label: '1–9 🪙',    min: 1,    max: 9        },
  { id: 'f2',   label: '10–99 🪙',  min: 10,   max: 99       },
  { id: 'f3',   label: '100–999 🪙',min: 100,  max: 999      },
  { id: 'f4',   label: '1k+ 🪙',    min: 1000, max: Infinity },
];

function GiftPicker({ value, onChange, giftList }) {
  const [priceFilter, setPriceFilter] = useState('all');
  const [search,      setSearch]      = useState('');

  const pf = PRICE_FILTERS.find(f => f.id === priceFilter) || PRICE_FILTERS[0];

  const visible = giftList.filter(g => {
    const inPrice  = g.coins >= pf.min && g.coins <= pf.max;
    const inSearch = !search.trim() || g.name.toLowerCase().includes(search.toLowerCase());
    return inPrice && inSearch;
  });

  const selected = giftList.find(g => g.name === value) || null;

  return (
    <div className="space-y-2">
      {/* Selected preview (แสดงตอนเลือกแล้ว) */}
      {selected && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-brand-900/40 border border-brand-700/50 rounded-lg">
          {selected.pictureUrl
            ? <img src={selected.pictureUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" onError={e => { e.target.style.display = 'none'; }} />
            : <span className="text-lg leading-none shrink-0">🎁</span>
          }
          <span className="text-sm text-brand-200 font-medium flex-1 truncate">{selected.name}</span>
          <span className="text-xs text-brand-400 shrink-0">{selected.coins.toLocaleString()} 🪙</span>
          <button type="button" onClick={() => onChange('')}
            className="text-brand-500 hover:text-brand-300 text-xs px-1 shrink-0">✕</button>
        </div>
      )}

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="ค้นหาของขวัญ..."
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none placeholder-gray-600"
      />

      {/* Price filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PRICE_FILTERS.map(f => (
          <button type="button" key={f.id}
            onClick={() => setPriceFilter(f.id)}
            className={clsx(
              'text-[11px] px-2.5 py-0.5 rounded-full border transition-colors',
              priceFilter === f.id
                ? 'bg-brand-700/50 border-brand-600 text-brand-200'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Chip grid */}
      <div className="h-40 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-1.5">
        {visible.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-xs">
            {search ? `ไม่พบ "${search}"` : 'ไม่มีของขวัญในช่วงราคานี้'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {visible.map(g => (
              <button type="button" key={g.name}
                onClick={() => onChange(g.name === value ? '' : g.name)}
                className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-colors',
                  g.name === value
                    ? 'bg-brand-800/60 border-brand-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
                )}>
                {g.pictureUrl
                  ? <img src={g.pictureUrl} alt="" className="w-7 h-7 rounded object-cover shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                  : <span className="text-xl leading-none w-7 h-7 flex items-center justify-center shrink-0">🎁</span>
                }
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate leading-tight">{g.name}</div>
                  <div className={clsx('text-[10px]', g.name === value ? 'text-brand-400' : 'text-gray-500')}>
                    {g.coins.toLocaleString()} 🪙
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-600">
        {visible.length}/{giftList.length} รายการ · รูปภาพจะเพิ่มอัตโนมัติหลัง live
        {' '}·{' '}
        <button type="button" className="text-brand-500 underline hover:text-brand-400"
          onClick={() => { const c = prompt('ชื่อ Gift (ตรงๆ จาก TikTok):'); if (c?.trim()) onChange(c.trim()); }}>
          พิมพ์เองถ้าไม่มีในลิสต์
        </button>
      </p>
    </div>
  );
}

// ── OBS WebSocket v5 helper — fetch scenes & sources ─────────────────────────
function fetchObsLists(host, port, onResult) {
  // onResult({ scenes: string[], inputs: string[], error?: string })
  let ws;
  const pending = new Map(); // requestId → callback
  const timeout = setTimeout(() => {
    onResult({ scenes: [], inputs: [], error: 'Timeout — OBS ไม่ตอบสนอง' });
    try { ws?.close(); } catch {}
  }, 4000);

  try {
    ws = new WebSocket(`ws://${host}:${port}`);
  } catch {
    clearTimeout(timeout);
    onResult({ scenes: [], inputs: [], error: 'เปิด WebSocket ไม่ได้' });
    return;
  }

  ws.onerror = () => {
    clearTimeout(timeout);
    onResult({ scenes: [], inputs: [], error: 'เชื่อม OBS ไม่ได้ — เปิด WebSocket Server ใน OBS ก่อน' });
  };

  ws.onopen = () => {
    // OBS WS v5: first message is Hello (op:0), we reply with Identify (op:1)
    // But if no password, we can send requests right after the Hello
  };

  let identified = false;
  const results = { scenes: null, inputs: null };

  const checkDone = () => {
    if (results.scenes !== null && results.inputs !== null) {
      clearTimeout(timeout);
      onResult({ scenes: results.scenes, inputs: results.inputs });
      ws.close();
    }
  };

  const sendRequest = (requestType, requestId) => {
    ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData: {} } }));
  };

  ws.onmessage = (evt) => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }
    const { op, d } = msg;

    if (op === 0) {
      // Hello — identify (no auth)
      ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1 } }));
    } else if (op === 2) {
      // Identified — now safe to send requests
      identified = true;
      sendRequest('GetSceneList', 'scenes');
      sendRequest('GetInputList',  'inputs');
    } else if (op === 7) {
      // RequestResponse
      if (d.requestId === 'scenes') {
        results.scenes = (d.responseData?.scenes || [])
          .map(s => s.sceneName)
          .filter(Boolean)
          .reverse(); // OBS returns oldest first
      } else if (d.requestId === 'inputs') {
        results.inputs = (d.responseData?.inputs || [])
          .map(s => s.inputName)
          .filter(Boolean);
      }
      checkDone();
    }
  };
}

// ── OBS Dropdown (Scene or Source) ───────────────────────────────────────────
function ObsSelect({ label, value, onChange, items, loading, onFetch, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">{label}</label>
        <button
          type="button"
          onClick={onFetch}
          disabled={loading}
          className="text-[10px] text-brand-400 hover:text-brand-300 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? '⏳ กำลังโหลด...' : '🔄 โหลดจาก OBS'}
        </button>
      </div>
      {items.length > 0 ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none w-full"
        >
          <option value="">— เลือก {label} —</option>
          {items.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none w-full"
        />
      )}
    </div>
  );
}

// ── Action Form Modal ────────────────────────────────────────────────────────
function ActionModal({ initial, onSave, onClose, obsHost, obsPort }) {
  const [form, setForm] = useState({
    ...DEFAULT_ACTION,
    ...(initial || {}),
    types: Array.isArray(initial?.types) ? initial.types : [],
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Tab ที่ active ในฝั่งขวา: null = settings, หรือ action type id
  const [activeTab, setActiveTab] = useState(() => {
    const t = Array.isArray(initial?.types) ? initial.types : [];
    return t.length > 0 ? t[0] : '__settings__';
  });

  // OBS dropdown state
  const [obsScenes,  setObsScenes]  = useState([]);
  const [obsInputs,  setObsInputs]  = useState([]);
  const [obsLoading, setObsLoading] = useState(false);
  const [obsError,   setObsError]   = useState('');

  const loadObsLists = () => {
    setObsLoading(true);
    setObsError('');
    fetchObsLists(obsHost || 'localhost', obsPort || 4455, ({ scenes, inputs, error }) => {
      setObsLoading(false);
      if (error) { setObsError(error); return; }
      setObsScenes(scenes);
      setObsInputs(inputs);
    });
  };

  const toggleType = (t) => {
    setForm(p => {
      const next = p.types.includes(t) ? p.types.filter(x => x !== t) : [...p.types, t];
      return { ...p, types: next };
    });
    // ถ้าเปิด type ใหม่ → ย้ายไปแท็บนั้นทันที; ถ้าปิด type ที่ active → ย้ายไป settings
    setActiveTab(prev => {
      const isOn = !form.types.includes(t);
      if (isOn) return t;
      if (prev === t) return '__settings__';
      return prev;
    });
  };

  const testTts = () => {
    if (!audioEnabled) { toast('🔇 เปิดเสียงก่อนนะครับ — กดปุ่ม 🔊 มุมขวาบน', { duration: 2500 }); return; }
    const text = (form.ttsText || 'ทดสอบเสียง')
      .replace('{username}', 'ทดสอบ').replace('{giftname}', 'Rose');
    speak(text);
  };

  // content ด้านขวาตาม activeTab
  const renderRightPanel = () => {
    if (activeTab === '__settings__') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">⚙️ ตั้งค่าการแสดงผล</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="แสดงกี่วินาที" value={form.displayDuration}
              onChange={v => set('displayDuration', v)} type="number" min={1} />
            <div>
              <label className="text-xs text-gray-400">Overlay Screen</label>
              <select value={form.overlayScreen} onChange={e => set('overlayScreen', Number(e.target.value))}
                className="mt-1 w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:outline-none">
                <option value={1}>Screen 1</option>
                <option value={2}>Screen 2</option>
              </select>
            </div>
            <Input label="Global Cooldown (วิ)" value={form.globalCooldown}
              onChange={v => set('globalCooldown', v)} type="number" min={0} />
            <Input label="User Cooldown (วิ)" value={form.userCooldown}
              onChange={v => set('userCooldown', v)} type="number" min={0} />
          </div>
          <div className="space-y-2 pt-1">
            <Toggle label="Fade In/Out" checked={form.fadeInOut} onChange={v => set('fadeInOut', v)} />
            <Toggle label="Repeat กับ Gift combos" checked={form.repeatWithCombos} onChange={v => set('repeatWithCombos', v)} />
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'show_picture':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🖼 รูป / GIF</p>
            <Input label="URL รูปหรือ GIF" value={form.pictureUrl} onChange={v => set('pictureUrl', v)}
              placeholder="https://media.giphy.com/..." />
            <p className="text-[10px] text-gray-600">รองรับ PNG, JPG, GIF, WebP — ใช้ลิงก์ตรงถึงไฟล์</p>
          </div>
        );
      case 'play_video':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🎬 วิดีโอ</p>
            <Input label="URL วิดีโอ (YouTube / MP4)" value={form.videoUrl} onChange={v => set('videoUrl', v)}
              placeholder="https://youtube.com/... หรือ https://..." />
          </div>
        );
      case 'play_audio':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🔊 เสียง</p>
            <Input label="URL เสียง (MP3/WAV)" value={form.audioUrl} onChange={v => set('audioUrl', v)}
              placeholder="https://..." />
          </div>
        );
      case 'show_alert':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">📢 Alert</p>
            <Input label="ข้อความ Alert" value={form.alertText} onChange={v => set('alertText', v)}
              placeholder="ขอบคุณ {username}! 🎉" />
            <p className="text-[10px] text-gray-600">ใช้ {'{username}'} {'{giftname}'} {'{coins}'} ได้</p>
          </div>
        );
      case 'read_tts':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🗣 TTS</p>
            <p className="text-[10px] text-purple-400/70">🔗 ใช้เสียงและ engine เดียวกับแถบ TTS สิริ — ตั้งค่าเสียงได้ที่แถบ TTS หลัก ปิด/เปิด TTS สิริ ไม่มีผลกับ Action นี้</p>
            <Input label="ข้อความที่จะอ่าน" value={form.ttsText} onChange={v => set('ttsText', v)}
              placeholder="ขอบคุณ {username} ที่ส่ง {giftname}!" />
            <p className="text-[10px] text-gray-600">ใช้ {'{username}'} {'{giftname}'} {'{coins}'} ได้</p>
            <button onClick={testTts}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-brand-400 rounded px-3 py-1.5 transition-colors">
              ▶ ทดสอบเสียง
            </button>
          </div>
        );
      case 'switch_obs_scene':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🎬 OBS Scene</p>
            {obsError && <p className="text-[10px] text-red-400">{obsError}</p>}
            <ObsSelect
              label="Scene ที่จะสลับไป"
              value={form.obsScene}
              onChange={v => set('obsScene', v)}
              items={obsScenes}
              loading={obsLoading}
              onFetch={loadObsLists}
              placeholder="เช่น Scene ของขวัญ"
            />
            <Toggle
              label={`↩ กลับ Scene เดิมหลังจบ (${form.displayDuration}s)`}
              checked={!!form.obsSceneReturn}
              onChange={v => set('obsSceneReturn', v)}
            />
            {form.obsSceneReturn && (
              <p className="text-[10px] text-gray-500">
                สลับไป "{form.obsScene || '...'}" → รอ {form.displayDuration}s → กลับ Scene เดิม
              </p>
            )}
          </div>
        );
      case 'activate_obs_source':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">👁 OBS Source</p>
            {obsError && <p className="text-[10px] text-red-400">{obsError}</p>}
            <ObsSelect
              label="Source ที่จะเปิด"
              value={form.obsSource}
              onChange={v => set('obsSource', v)}
              items={obsInputs}
              loading={obsLoading}
              onFetch={loadObsLists}
              placeholder="เช่น ภาพ Rose Animation"
            />
            <Toggle
              label={`↩ ปิด Source กลับหลังจบ (${form.displayDuration}s)`}
              checked={!!form.obsSourceReturn}
              onChange={v => set('obsSourceReturn', v)}
            />
            {form.obsSourceReturn && (
              <p className="text-[10px] text-gray-500">
                เปิด "{form.obsSource || '...'}" → รอ {form.displayDuration}s → ปิดกลับ
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Action' : 'สร้าง Action ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* ชื่อ Action */}
        <div className="px-5 py-3 border-b border-gray-800 shrink-0">
          <Input label="ชื่อ Action *" value={form.name} onChange={v => set('name', v)} placeholder="เช่น Rose Alert" />
        </div>

        {/* Body: sidebar ซ้าย + content ขวา */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar ซ้าย — type list */}
          <div className="w-44 shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">
            <p className="text-[10px] text-gray-600 font-medium uppercase tracking-wide px-3 pt-3 pb-1.5">
              เลือกสิ่งที่เกิดขึ้น
            </p>
            {ACTION_TYPES.map(t => {
              const isOn = form.types.includes(t.id);
              const isActive = activeTab === t.id;
              return (
                <div key={t.id}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors text-sm border-l-2',
                    isActive
                      ? 'border-brand-500 bg-brand-900/30 text-white'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  )}
                  onClick={() => {
                    if (!isOn) {
                      // เปิด type + ย้ายไปแท็บนั้น
                      setForm(p => ({ ...p, types: [...p.types, t.id] }));
                    }
                    setActiveTab(t.id);
                  }}
                >
                  {/* checkbox mini */}
                  <span
                    onClick={e => { e.stopPropagation(); toggleType(t.id); }}
                    className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      isOn ? 'bg-brand-600 border-brand-500' : 'border-gray-600 hover:border-gray-400'
                    )}
                  >
                    {isOn && <span className="text-white text-[9px] leading-none">✓</span>}
                  </span>
                  <span className="leading-tight">{t.icon} {t.label}</span>
                </div>
              );
            })}

            {/* Divider + Settings tab */}
            <div className="mt-auto border-t border-gray-800">
              <div
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors text-sm border-l-2',
                  activeTab === '__settings__'
                    ? 'border-brand-500 bg-brand-900/30 text-white'
                    : 'border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                )}
                onClick={() => setActiveTab('__settings__')}
              >
                <span className="text-gray-500">⚙️</span>
                <span>ตั้งค่า</span>
              </div>
            </div>
          </div>

          {/* Content panel ขวา */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {form.types.length === 0 && activeTab !== '__settings__' ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                <p className="text-3xl">👈</p>
                <p className="text-sm text-gray-500">เลือก type ด้านซ้ายเพื่อเริ่มตั้งค่า</p>
              </div>
            ) : (
              renderRightPanel()
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-800 shrink-0">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium transition-colors">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded py-2 text-sm transition-colors">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Form Modal ─────────────────────────────────────────────────────────
const EVENT_TABS = [
  { id: 'trigger', icon: '⚡', label: 'Trigger' },
  { id: 'who',     icon: '👤', label: 'ผู้ส่ง' },
  { id: 'actions', icon: '🎬', label: 'Actions' },
];

function EventModal({ initial, actions, giftList, onSave, onClose }) {
  const [form, setForm] = useState({
    ...DEFAULT_EVENT,
    ...(initial || {}),
    actionIds:       Array.isArray(initial?.actionIds)       ? initial.actionIds       : [],
    randomActionIds: Array.isArray(initial?.randomActionIds) ? initial.randomActionIds : [],
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [activeTab, setActiveTab] = useState('trigger');

  const toggleActionId = (id, field) => {
    setForm(p => ({
      ...p,
      [field]: p[field].includes(id) ? p[field].filter(x => x !== id) : [...p[field], id],
    }));
  };

  // badge counts สำหรับแสดงบน tab
  const allCount    = form.actionIds.length;
  const randomCount = form.randomActionIds.length;

  const renderPanel = () => {
    switch (activeTab) {

      // ── Trigger tab ────────────────────────────────────────────────────────
      case 'trigger':
        return (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Trigger จากอะไร?</p>
            <div className="space-y-1">
              {TRIGGER_LIST.map(t => (
                <label key={t.id} className={clsx(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  form.trigger === t.id
                    ? 'border-brand-500 bg-brand-900/30 text-white'
                    : t.popular
                      ? 'border-gray-600 text-gray-300 hover:border-brand-400 bg-gray-800/40'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                )}>
                  <input type="radio" name="trigger" value={t.id} checked={form.trigger === t.id}
                    onChange={() => set('trigger', t.id)} className="accent-brand-500" />
                  <span className="flex-1">{t.label}</span>
                  {t.popular && form.trigger !== t.id && (
                    <span className="text-[9px] bg-brand-700/60 text-brand-300 px-1.5 py-0.5 rounded font-medium shrink-0">ใช้บ่อย</span>
                  )}
                </label>
              ))}
            </div>

            {/* Trigger params */}
            {form.trigger === 'command' && (
              <Input label="Keyword (เช่น !สุ่ม)" value={form.keyword}
                onChange={v => set('keyword', v)} placeholder="!สุ่ม" />
            )}
            {form.trigger === 'gift_min_coins' && (
              <Input label="จำนวน coins ขั้นต่ำ" value={form.minCoins}
                onChange={v => set('minCoins', v)} type="number" min={1} />
            )}
            {form.trigger === 'specific_gift' && (
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">เลือก Gift</label>
                <GiftPicker
                  value={form.specificGiftName}
                  onChange={v => set('specificGiftName', v)}
                  giftList={giftList}
                />
              </div>
            )}
            {form.trigger === 'likes' && (
              <Input label="Like ครบกี่ครั้ง" value={form.likesCount}
                onChange={v => set('likesCount', v)} type="number" min={1} />
            )}
          </div>
        );

      // ── Who tab ────────────────────────────────────────────────────────────
      case 'who':
        return (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">ใครสามารถ trigger ได้?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {WHO_LIST.map(w => (
                <label key={w.id} className={clsx(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                  form.whoCanTrigger === w.id
                    ? 'border-brand-500 bg-brand-900/30 text-white'
                    : w.popular
                      ? 'border-gray-600 text-gray-300 hover:border-brand-400 bg-gray-800/40'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                )}>
                  <input type="radio" name="who" value={w.id} checked={form.whoCanTrigger === w.id}
                    onChange={() => set('whoCanTrigger', w.id)} className="accent-brand-500" />
                  <span className="flex-1">{w.label}</span>
                  {w.popular && form.whoCanTrigger !== w.id && (
                    <span className="text-[9px] bg-brand-700/60 text-brand-300 px-1.5 py-0.5 rounded font-medium shrink-0">ใช้บ่อย</span>
                  )}
                </label>
              ))}
            </div>
            {form.whoCanTrigger === 'specific_user' && (
              <Input label="TikTok username" value={form.specificUser}
                onChange={v => set('specificUser', v)} placeholder="@username" />
            )}
          </div>
        );

      // ── Actions tab ────────────────────────────────────────────────────────
      case 'actions':
        return (
          <div className="space-y-4">
            {actions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-2xl">⚠️</p>
                <p className="text-sm text-yellow-500">ยังไม่มี Actions — กลับไปสร้าง Action ก่อน</p>
              </div>
            ) : (
              <>
                {/* ── ทำทั้งหมด ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide flex-1">
                      ✅ ทำทั้งหมดที่เลือก
                    </p>
                    {allCount > 0 && (
                      <span className="text-[10px] bg-brand-700/60 text-brand-300 px-1.5 py-0.5 rounded font-medium">
                        {allCount} รายการ
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">เมื่อ trigger — ทำ action เหล่านี้ทุกอันพร้อมกัน</p>
                  <div className="space-y-1">
                    {actions.map(a => {
                      const on = form.actionIds.includes(a.id);
                      return (
                        <label key={a.id} className={clsx(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                          on ? 'border-brand-500 bg-brand-900/20 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        )}>
                          <span className={clsx(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            on ? 'bg-brand-600 border-brand-500' : 'border-gray-600'
                          )}>
                            {on && <span className="text-white text-[9px] leading-none">✓</span>}
                          </span>
                          <input type="checkbox" className="hidden" checked={on}
                            onChange={() => toggleActionId(a.id, 'actionIds')} />
                          <span className="flex-1 truncate">{a.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ── สุ่ม 1 จาก pool ── */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide flex-1">
                      🎲 สุ่ม 1 จาก pool
                    </p>
                    {randomCount > 0 && (
                      <span className="text-[10px] bg-purple-700/60 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                        pool {randomCount} รายการ
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mb-2">
                    เพิ่ม action เข้า pool — ระบบจะสุ่มเลือก 1 รายการทุกครั้งที่ trigger
                    {randomCount >= 2 && (
                      <span className="text-purple-400 ml-1">
                        (แต่ละรายการมีโอกาส {Math.round(100 / randomCount)}%)
                      </span>
                    )}
                  </p>
                  <div className="space-y-1">
                    {actions.map(a => {
                      const on = form.randomActionIds.includes(a.id);
                      return (
                        <label key={a.id} className={clsx(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-pointer text-sm transition-colors',
                          on ? 'border-purple-500 bg-purple-900/20 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        )}>
                          <span className={clsx(
                            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            on ? 'bg-purple-600 border-purple-500' : 'border-gray-600'
                          )}>
                            {on && <span className="text-white text-[9px] leading-none">✓</span>}
                          </span>
                          <input type="checkbox" className="hidden" checked={on}
                            onChange={() => toggleActionId(a.id, 'randomActionIds')} />
                          <span className="flex-1 truncate">{a.name}</span>
                          {on && randomCount >= 2 && (
                            <span className="text-[10px] text-purple-400 shrink-0">
                              ~{Math.round(100 / randomCount)}%
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Event' : 'สร้าง Event ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body: sidebar ซ้าย + content ขวา */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar ซ้าย */}
          <div className="w-36 shrink-0 border-r border-gray-800 flex flex-col pt-2">
            {EVENT_TABS.map(tab => {
              const badge = tab.id === 'actions'
                ? (allCount + randomCount) || null
                : null;
              return (
                <div key={tab.id}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-3 cursor-pointer select-none transition-colors text-sm border-l-2',
                    activeTab === tab.id
                      ? 'border-brand-500 bg-brand-900/30 text-white'
                      : 'border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.icon}</span>
                  <span className="flex-1">{tab.label}</span>
                  {badge && (
                    <span className="text-[10px] bg-brand-700/70 text-brand-200 px-1.5 py-0.5 rounded-full font-medium">
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Summary ด้านล่าง sidebar */}
            {(allCount > 0 || randomCount > 0) && (
              <div className="mt-auto mx-2 mb-3 p-2 rounded-lg bg-gray-800/60 border border-gray-700 space-y-1">
                {allCount > 0 && (
                  <p className="text-[10px] text-gray-400">✅ ทำ {allCount} รายการ</p>
                )}
                {randomCount > 0 && (
                  <p className="text-[10px] text-gray-400">🎲 สุ่มจาก {randomCount} รายการ</p>
                )}
              </div>
            )}
          </div>

          {/* Content ขวา */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {renderPanel()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-800 shrink-0">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium transition-colors">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded py-2 text-sm transition-colors">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OBS command executor (one-shot, no persistent connection) ────────────────
function fireObsCommands(host, port, action) {
  // Connect → identify → send commands → disconnect
  let ws;
  try { ws = new WebSocket(`ws://${host}:${port}`); } catch { return; }

  const send = (requestType, requestData = {}) => {
    if (ws.readyState !== 1) return;
    ws.send(JSON.stringify({
      op: 6,
      d: { requestType, requestId: String(Date.now()), requestData },
    }));
  };

  ws.onmessage = (evt) => {
    let msg; try { msg = JSON.parse(evt.data); } catch { return; }
    if (msg.op === 0) {
      // Hello → Identify
      ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1 } }));
    } else if (msg.op === 2) {
      // Identified — fire commands

      // Switch scene
      if (action.types?.includes('switch_obs_scene') && action.obsScene) {
        // Save current scene name before switching (for return)
        let prevScene = null;
        if (action.obsSceneReturn) {
          // We'll capture the current scene from GetCurrentProgramScene response
          // For now send the switch immediately and handle return in onmessage
          send('GetCurrentProgramScene', {});
          // Switch will happen after we get the response
        } else {
          send('SetCurrentProgramScene', { sceneName: action.obsScene });
        }
      }

      // Toggle source visible
      if (action.types?.includes('activate_obs_source') && action.obsSource) {
        send('SetSceneItemEnabled', {
          sceneName: action.obsScene || '',
          sceneItemName: action.obsSource,
          sceneItemEnabled: true,
        });

        if (action.obsSourceReturn) {
          const dur = (action.displayDuration || 5) * 1000;
          setTimeout(() => {
            send('SetSceneItemEnabled', {
              sceneName: action.obsScene || '',
              sceneItemName: action.obsSource,
              sceneItemEnabled: false,
            });
          }, dur);
        }
      }

      // Close after commands sent (small delay to ensure delivery)
      setTimeout(() => { try { ws.close(); } catch {} }, 1000);
    } else if (msg.op === 7) {
      // Response to GetCurrentProgramScene — switch scene then schedule return
      const current = msg.d.responseData?.currentProgramSceneName;
      if (current && action.types?.includes('switch_obs_scene') && action.obsScene && action.obsSceneReturn) {
        send('SetCurrentProgramScene', { sceneName: action.obsScene });
        const dur = (action.displayDuration || 5) * 1000;
        setTimeout(() => {
          send('SetCurrentProgramScene', { sceneName: current });
        }, dur);
      }
    }
  };

  ws.onerror = () => {};
}

// ── Preview / Test Modal ─────────────────────────────────────────────────────
function PreviewModal({ action, onClose, obsHost, obsPort, audioEnabled }) {
  const [visible, setVisible] = useState(false);
  const [obsMsg,  setObsMsg]  = useState('');
  const audioRef = useRef(null);

  const getYtEmbed = (url) => {
    const m = url?.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&controls=0&mute=0` : url;
  };

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    // Play audio
    if (action.types?.includes('play_audio') && action.audioUrl) {
      const audio = new Audio(action.audioUrl);
      audio.volume = 0.9;
      audio.play().catch(() => {});
      audioRef.current = audio;
    }

    // TTS — เล่นเฉพาะเมื่อ audioEnabled
    if (audioEnabled && action.types?.includes('read_tts') && action.ttsText) {
      const text = action.ttsText
        .replace('{username}', 'ทดสอบ')
        .replace('{giftname}', 'Rose')
        .replace('{coins}', '100');
      speak(text);
    }

    // OBS commands — fire and show status
    const hasObs = action.types?.includes('switch_obs_scene') || action.types?.includes('activate_obs_source');
    if (hasObs) {
      setObsMsg('🔌 กำลังส่งคำสั่ง OBS...');
      fireObsCommands(obsHost || 'localhost', obsPort || 4455, action);
      // Brief feedback messages
      setTimeout(() => setObsMsg(
        action.types?.includes('switch_obs_scene')
          ? `✅ สลับไป "${action.obsScene}"${action.obsSceneReturn ? ` · กลับใน ${action.displayDuration}s` : ''}`
          : `✅ เปิด Source "${action.obsSource}"${action.obsSourceReturn ? ` · ปิดใน ${action.displayDuration}s` : ''}`
      ), 600);
    }

    // Auto-close after displayDuration
    const dur = (action.displayDuration || 5) * 1000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500);
    }, dur);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isYt = action.videoUrl?.includes('youtube') || action.videoUrl?.includes('youtu.be');
  const hasVisual = action.types?.some(t => ['show_picture','play_video','show_alert'].includes(t));
  const dur = action.displayDuration || 5;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl"
        style={{ aspectRatio: '16/9' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-base hover:bg-black/80 transition-colors"
        >
          ×
        </button>

        {/* Label */}
        <div className="absolute top-3 left-3 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
          ▶ ทดสอบ: {action.name}
        </div>

        {/* Picture / GIF */}
        {action.types?.includes('show_picture') && action.pictureUrl && (
          <img
            src={action.pictureUrl}
            alt=""
            style={{
              transition: 'opacity 0.5s, transform 0.5s',
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.95)',
              position: 'absolute',
              maxWidth: '90%', maxHeight: '80%',
              objectFit: 'contain',
              top: '50%', left: '50%',
              transform: visible
                ? 'translate(-50%,-50%) scale(1)'
                : 'translate(-50%,-50%) scale(0.95)',
              borderRadius: 12,
            }}
          />
        )}

        {/* Video */}
        {action.types?.includes('play_video') && action.videoUrl && (
          isYt ? (
            <iframe
              src={getYtEmbed(action.videoUrl)}
              style={{
                transition: 'opacity 0.5s',
                opacity: visible ? 1 : 0,
                position: 'absolute',
                width: '80%', left: '10%',
                aspectRatio: '16/9',
                top: '50%', transform: 'translateY(-50%)',
                border: 'none', borderRadius: 12,
              }}
              allow="autoplay"
            />
          ) : (
            <video
              src={action.videoUrl}
              autoPlay
              controls={false}
              style={{
                transition: 'opacity 0.5s',
                opacity: visible ? 1 : 0,
                position: 'absolute',
                maxWidth: '80%', maxHeight: '80%',
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                borderRadius: 12,
              }}
            />
          )
        )}

        {/* Alert */}
        {action.types?.includes('show_alert') && action.alertText && (
          <div style={{
            transition: 'opacity 0.5s, transform 0.5s',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.9)',
            position: 'absolute',
            bottom: 48, left: '50%',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(79,70,229,0.95))',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 700,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(124,58,237,0.6)',
            maxWidth: '85%',
            backdropFilter: 'blur(8px)',
            fontFamily: 'system-ui, sans-serif',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            whiteSpace: 'pre-wrap',
          }}>
            {action.alertText
              .replace('{username}', 'ทดสอบ')
              .replace('{giftname}', 'Rose')
              .replace('{coins}', '100')}
          </div>
        )}

        {/* OBS status message */}
        {obsMsg && (
          <div style={{
            position: 'absolute',
            top: 40, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)',
            color: obsMsg.startsWith('✅') ? '#86efac' : '#fcd34d',
            fontSize: 12,
            padding: '5px 14px',
            borderRadius: 999,
            fontFamily: 'system-ui',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
          }}>
            {obsMsg}
          </div>
        )}

        {/* Audio-only / TTS-only indicator */}
        {!hasVisual && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div style={{
              fontSize: 56,
              transition: 'opacity 0.5s',
              opacity: visible ? 1 : 0,
              filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.6))',
            }}>
              {action.types?.includes('play_audio') ? '🔊' :
               action.types?.includes('read_tts')   ? '🗣️' : '⚡'}
            </div>
            <p style={{
              transition: 'opacity 0.5s',
              opacity: visible ? 1 : 0,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontFamily: 'system-ui',
            }}>
              {action.types?.includes('play_audio') ? 'กำลังเล่นเสียง...' :
               action.types?.includes('read_tts')   ? 'กำลังอ่านออกเสียง...' : 'Action กำลังทำงาน'}
            </p>
          </div>
        )}

        {/* Progress bar countdown */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 overflow-hidden rounded-b-xl">
          <div
            className="h-full bg-brand-500"
            style={{
              width: visible ? '0%' : '100%',
              transition: `width ${dur}s linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ActionsPage({ theme, setTheme, user, authLoading, activePage, setActivePage }) {
  const [actions,  setActions]  = useState([]);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  // Delete confirmation: { id, type:'action'|'event' } — กดครั้งแรก set, กดครั้งสองลบจริง
  const [confirmDelete, setConfirmDelete] = useState(null);
  const confirmTimerRef = useRef(null);
  const [tab,      setTab]      = useState('actions'); // actions | events | overlay | obs

  // Modals
  const [actionModal,   setActionModal]  = useState(null); // null | { data }
  const [eventModal,    setEventModal]   = useState(null);
  const [previewAction, setPreviewAction] = useState(null); // action being previewed

  // OBS settings
  const [obsHost,     setObsHost]     = useState('localhost');
  const [obsPort,     setObsPort]     = useState(4455);
  const [obsPassword, setObsPassword] = useState('');
  const [obsStatus,   setObsStatus]   = useState('ยังไม่เชื่อม'); // ยังไม่เชื่อม / กำลังเชื่อม / เชื่อมแล้ว / error
  const obsWsRef = useRef(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading,   setLoginLoading]   = useState(false);

  // Dynamic gift catalog (รวบรวมจาก TikTok live session จริง)
  const [dynamicGifts, setDynamicGifts] = useState([]);

  // ── ฟังเสียงทดสอบ TTS ใน Browser (default OFF) ──
  const [audioEnabled, setAudioEnabled] = useState(() => {
    try { return localStorage.getItem('ttplus_actions_audio') === '1'; } catch { return false; }
  });

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [aRes, eRes, obsRes, giftRes] = await Promise.all([
        api.get('/api/actions'),
        api.get('/api/actions/events'),
        api.get('/api/actions/obs-settings'),
        api.get('/api/actions/gift-catalog').catch(() => ({ data: { gifts: [] } })),
      ]);
      setActions(aRes.data.actions || []);
      setEvents(eRes.data.events   || []);
      const obs = obsRes.data.settings || {};
      setObsHost(obs.host || 'localhost');
      setObsPort(obs.port || 4455);
      setObsPassword(obs.password || '');
      setDynamicGifts(giftRes.data.gifts || []);
    } catch (err) {
      toast.error('โหลดข้อมูลไม่ได้');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Login ──
  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
    } catch { toast.error('Login ไม่สำเร็จ'); }
    finally { setLoginLoading(false); }
  }, []);

  // ── Actions CRUD ──
  const saveAction = useCallback(async (form) => {
    if (!form.name.trim()) return toast.error('ต้องมีชื่อ Action');
    if (!form.types.length) return toast.error('ต้องเลือกอย่างน้อย 1 ประเภท');
    try {
      if (form.id) {
        await api.put(`/api/actions/${form.id}`, form);
        toast.success('แก้ไข Action แล้ว');
      } else {
        await api.post('/api/actions', form);
        toast.success('สร้าง Action แล้ว');
      }
      setActionModal(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  }, [loadData]);

  // ── Double-confirm delete (กดครั้งแรก = รอยืนยัน, กดครั้งสอง = ลบจริง) ──
  const requestDelete = useCallback((id, type = 'action') => {
    if (confirmDelete?.id === id && confirmDelete?.type === type) {
      // กดครั้งที่สอง — ลบจริง
      clearTimeout(confirmTimerRef.current);
      setConfirmDelete(null);
      const del = async () => {
        try {
          if (type === 'action') {
            await api.delete(`/api/actions/${id}`);
          } else {
            await api.delete(`/api/actions/events/${id}`);
          }
          toast.success('ลบแล้ว');
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'ลบไม่สำเร็จ');
        }
      };
      del();
    } else {
      // กดครั้งแรก — รอ 3 วิ
      clearTimeout(confirmTimerRef.current);
      setConfirmDelete({ id, type });
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(null), 3000);
    }
  }, [confirmDelete, loadData]);

  const deleteAction = useCallback((id) => requestDelete(id, 'action'), [requestDelete]);

  const toggleAction = useCallback(async (a) => {
    try {
      await api.put(`/api/actions/${a.id}`, { enabled: !a.enabled });
      setActions(prev => prev.map(x => x.id === a.id ? { ...x, enabled: !x.enabled } : x));
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  }, []);

  // ── Events CRUD ──
  const saveEvent = useCallback(async (form) => {
    if (!form.actionIds.length && !form.randomActionIds.length) return toast.error('ต้องเลือก Action อย่างน้อย 1 อัน');
    try {
      if (form.id) {
        await api.put(`/api/actions/events/${form.id}`, form);
        toast.success('แก้ไข Event แล้ว');
      } else {
        await api.post('/api/actions/events', form);
        toast.success('สร้าง Event แล้ว');
      }
      setEventModal(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  }, [loadData]);

  const deleteEvent = useCallback((id) => requestDelete(id, 'event'), [requestDelete]);

  const toggleEvent = useCallback(async (e) => {
    try {
      await api.put(`/api/actions/events/${e.id}`, { enabled: !e.enabled });
      setEvents(prev => prev.map(x => x.id === e.id ? { ...x, enabled: !x.enabled } : x));
    } catch { toast.error('เกิดข้อผิดพลาด'); }
  }, []);

  // ── OBS WebSocket ──
  const connectObs = useCallback(() => {
    if (obsWsRef.current) { obsWsRef.current.close(); }
    setObsStatus('กำลังเชื่อม...');
    try {
      const ws = new WebSocket(`ws://${obsHost}:${obsPort}`);
      obsWsRef.current = ws;
      ws.onopen = () => setObsStatus('✅ เชื่อมแล้ว');
      ws.onerror = () => setObsStatus('❌ เชื่อมไม่ได้ — เปิด OBS WebSocket Server ก่อน');
      ws.onclose = () => setObsStatus('ยังไม่เชื่อม');
    } catch { setObsStatus('❌ เชื่อมไม่ได้'); }
  }, [obsHost, obsPort]);

  const saveObsSettings = useCallback(async () => {
    try {
      await api.post('/api/actions/obs-settings', { host: obsHost, port: obsPort, password: obsPassword });
      toast.success('บันทึก OBS settings แล้ว');
    } catch { toast.error('บันทึกไม่ได้'); }
  }, [obsHost, obsPort, obsPassword]);

  // ── Overlay URLs ──
  const vjId = user?.uid || '';
  const overlayUrls = [1, 2].map(s => `${BACKEND.replace('api.', '')}/widget/myactions?vjId=${vjId}&screen=${s}`);

  // ── Render ──
  const requireLogin = !authLoading && !user;

  return (
    <div className={clsx('min-h-screen flex', theme === 'dark' ? 'bg-gray-950 text-gray-200' : 'bg-white text-gray-900')}>
      <Sidebar theme={theme} setTheme={setTheme} activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 ml-16 md:ml-56 p-4 md:p-6 max-w-4xl mx-auto pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">🎭 ลูกเล่น TT</h1>
            <p className="text-xs text-gray-500 mt-0.5">ตั้งค่า Actions &amp; Events สำหรับ TikTok Live</p>
          </div>
          <div className="flex items-center gap-2">
            {/* ฟังเสียง TTS ทดสอบ ใน Browser */}
            <button
              onClick={() => {
                const next = !audioEnabled;
                setAudioEnabled(next);
                try { localStorage.setItem('ttplus_actions_audio', next ? '1' : '0'); } catch {}
              }}
              title={audioEnabled ? 'ปิดเสียงทดสอบ TTS' : 'เปิดเสียงทดสอบ TTS'}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition',
                audioEnabled
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-gray-800/80 text-gray-500 hover:text-gray-400'
              )}
            >
              {audioEnabled ? '🔊' : '🔇'}
              <span className="hidden sm:inline">{audioEnabled ? 'เสียงเปิด' : 'เสียงปิด'}</span>
            </button>
            {requireLogin && (
              <button onClick={() => setShowLoginModal(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg">
                Login
              </button>
            )}
          </div>
        </div>

        {/* Tabs — scroll แนวนอนบนมือถือ */}
        <div className="flex gap-1 mb-5 bg-gray-900 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'actions', label: '⚡ Actions' },
            { id: 'events',  label: '🔗 Events' },
            { id: 'overlay', label: '📺 Overlay' },
            { id: 'obs',     label: '🎬 OBS' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-500 text-sm">
            <span className="animate-spin">⏳</span> กำลังโหลด...
          </div>
        )}

        {/* ── Tab: Actions ── */}
        {tab === 'actions' && (
          <div className="space-y-3">
            {/* Description + desktop create button */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-400 leading-snug">
                Actions คือสิ่งที่เกิดขึ้นบน stream เมื่อมี event trigger
              </p>
              <button onClick={() => setActionModal({ data: null })}
                className="hidden md:flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg font-medium shrink-0 transition-colors">
                + สร้าง Action
              </button>
            </div>

            {actions.length === 0 && !loading && (
              <div className="text-center py-14 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-sm font-medium text-gray-500">ยังไม่มี Actions</p>
                <p className="text-xs text-gray-600 mt-1">กดปุ่ม "+ สร้าง Action" เพื่อเริ่ม</p>
              </div>
            )}

            {/* Action cards */}
            <div className="space-y-2">
              {actions.map((a) => {
                const typeIcons = (a.types || [])
                  .map(t => ACTION_TYPES.find(x => x.id === t))
                  .filter(Boolean);
                const isConfirmDel = confirmDelete?.id === a.id && confirmDelete?.type === 'action';
                return (
                  <div key={a.id} className={clsx(
                    'border rounded-xl transition-colors',
                    a.enabled ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-55'
                  )}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Toggle pill */}
                      <button
                        onClick={() => toggleAction(a)}
                        className={clsx(
                          'shrink-0 w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
                          a.enabled ? 'bg-green-600' : 'bg-gray-700'
                        )}
                      >
                        <div className={clsx(
                          'w-5 h-5 rounded-full bg-white transition-transform',
                          a.enabled ? 'translate-x-4' : 'translate-x-0'
                        )} />
                      </button>

                      {/* Name + type icons */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-100 truncate">{a.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {typeIcons.map(t => (
                            <span key={t.id} className="text-[11px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                              {t.icon} {t.label}
                            </span>
                          ))}
                          <span className="text-[11px] text-gray-600">{a.displayDuration}s · S{a.overlayScreen}</span>
                        </div>
                      </div>

                      {/* Desktop buttons — hidden on mobile */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setPreviewAction(a)}
                          className="text-xs text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-lg bg-brand-900/30 hover:bg-brand-900/60 border border-brand-800/50 transition-colors font-medium">
                          ▶ ทดสอบ
                        </button>
                        <button onClick={() => setActionModal({ data: { ...a } })}
                          className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                          แก้ไข
                        </button>
                        <button onClick={() => deleteAction(a.id)}
                          className={clsx(
                            'text-xs px-3 py-1.5 rounded-lg transition-colors',
                            isConfirmDel
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'text-red-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700'
                          )}>
                          {isConfirmDel ? 'ยืนยันลบ?' : 'ลบ'}
                        </button>
                      </div>
                    </div>

                    {/* Mobile buttons row */}
                    <div className="flex md:hidden border-t border-gray-800">
                      <button onClick={() => setPreviewAction(a)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-sm text-brand-400 hover:bg-brand-900/20 transition-colors border-r border-gray-800">
                        ▶ ทดสอบ
                      </button>
                      <button onClick={() => setActionModal({ data: { ...a } })}
                        className="flex-1 flex items-center justify-center py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-r border-gray-800">
                        แก้ไข
                      </button>
                      <button onClick={() => deleteAction(a.id)}
                        className={clsx(
                          'flex-1 flex items-center justify-center py-2.5 text-sm transition-colors',
                          isConfirmDel
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'text-red-500 hover:bg-gray-800'
                        )}>
                        {isConfirmDel ? 'ยืนยัน?' : 'ลบ'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Events ── */}
        {tab === 'events' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-400 leading-snug">
                Events คือตัว trigger ที่จะเรียก Actions เมื่อเกิดเหตุการณ์ใน Live
              </p>
              <button onClick={() => setEventModal({ data: null })}
                className="hidden md:flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg font-medium shrink-0 transition-colors">
                + สร้าง Event
              </button>
            </div>

            {events.length === 0 && !loading && (
              <div className="text-center py-14 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                <p className="text-4xl mb-3">🔗</p>
                <p className="text-sm font-medium text-gray-500">ยังไม่มี Events</p>
                <p className="text-xs text-gray-600 mt-1">กดปุ่ม "+ สร้าง Event" เพื่อเริ่ม</p>
              </div>
            )}

            <div className="space-y-2">
              {events.map(ev => {
                const trigger      = TRIGGER_LIST.find(t => t.id === ev.trigger);
                const linkedActions = actions.filter(a => ev.actionIds?.includes(a.id));
                const randomActions = actions.filter(a => ev.randomActionIds?.includes(a.id));
                const isConfirmDel  = confirmDelete?.id === ev.id && confirmDelete?.type === 'event';

                // param string
                let param = '';
                if (ev.trigger === 'command')        param = `"${ev.keyword}"`;
                if (ev.trigger === 'gift_min_coins') param = `≥${ev.minCoins} coins`;
                if (ev.trigger === 'specific_gift')  param = ev.specificGiftName;
                if (ev.trigger === 'likes')          param = `${ev.likesCount} likes`;

                return (
                  <div key={ev.id} className={clsx(
                    'border rounded-xl transition-colors',
                    ev.enabled ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-55'
                  )}>
                    {/* Main row */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleEvent(ev)}
                        className={clsx(
                          'shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
                          ev.enabled ? 'bg-green-600' : 'bg-gray-700'
                        )}
                      >
                        <div className={clsx(
                          'w-5 h-5 rounded-full bg-white transition-transform',
                          ev.enabled ? 'translate-x-4' : 'translate-x-0'
                        )} />
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {/* Trigger label */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-100">{trigger?.label || ev.trigger}</p>
                          {param && (
                            <span className="text-xs bg-gray-800 text-brand-400 px-2 py-0.5 rounded font-mono">
                              {param}
                            </span>
                          )}
                        </div>
                        {/* Who */}
                        <p className="text-xs text-gray-500 mt-0.5">
                          👤 {WHO_LIST.find(w => w.id === ev.whoCanTrigger)?.label || ev.whoCanTrigger}
                        </p>
                        {/* Linked actions */}
                        {(linkedActions.length > 0 || randomActions.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {linkedActions.map(a => (
                              <span key={a.id} className="text-[11px] bg-brand-900/40 border border-brand-800/50 text-brand-300 px-2 py-0.5 rounded-full">
                                ✅ {a.name}
                              </span>
                            ))}
                            {randomActions.map(a => (
                              <span key={a.id} className="text-[11px] bg-purple-900/40 border border-purple-800/50 text-purple-300 px-2 py-0.5 rounded-full">
                                🎲 {a.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Desktop buttons */}
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEventModal({ data: { ...ev } })}
                          className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                          แก้ไข
                        </button>
                        <button onClick={() => deleteEvent(ev.id)}
                          className={clsx(
                            'text-xs px-3 py-1.5 rounded-lg transition-colors',
                            isConfirmDel
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'text-red-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700'
                          )}>
                          {isConfirmDel ? 'ยืนยันลบ?' : 'ลบ'}
                        </button>
                      </div>
                    </div>

                    {/* Mobile buttons */}
                    <div className="flex md:hidden border-t border-gray-800">
                      <button onClick={() => setEventModal({ data: { ...ev } })}
                        className="flex-1 flex items-center justify-center py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-r border-gray-800">
                        แก้ไข
                      </button>
                      <button onClick={() => deleteEvent(ev.id)}
                        className={clsx(
                          'flex-1 flex items-center justify-center py-2.5 text-sm transition-colors',
                          isConfirmDel ? 'bg-red-600 text-white animate-pulse' : 'text-red-500 hover:bg-gray-800'
                        )}>
                        {isConfirmDel ? 'ยืนยัน?' : 'ลบ'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Overlay URL ── */}
        {tab === 'overlay' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Copy URL ด้านล่างไปวางใน OBS Browser Source เพื่อให้ Actions แสดงบน stream
            </p>
            {!user && <p className="text-yellow-500 text-sm">⚠️ Login ก่อนเพื่อดู URL</p>}
            {user && overlayUrls.map((url, i) => (
              <div key={i} className="border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-white">Screen {i + 1}</p>
                <p className="text-xs text-gray-500">แนะนำ: Width 800, Height 600 ใน OBS</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-brand-400 bg-gray-950 rounded px-2 py-1.5 break-all">{url}</code>
                  <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Copy แล้ว!'); }}
                    className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded">
                    Copy
                  </button>
                </div>
              </div>
            ))}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400">วิธีใช้ใน OBS:</p>
              <p>1. Add Source → Browser</p>
              <p>2. วาง URL ด้านบน → ตั้ง Width: 800, Height: 600</p>
              <p>3. Actions จะแสดงอัตโนมัติเมื่อมี Event trigger</p>
            </div>
          </div>
        )}

        {/* ── Tab: OBS Settings ── */}
        {tab === 'obs' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm text-gray-400">
              เชื่อมต่อ OBS WebSocket เพื่อให้ Actions สลับ Scene / เปิดปิด Source ได้
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400 text-sm">วิธีเปิด OBS WebSocket:</p>
              <p>1. OBS → Tools → WebSocket Server Settings</p>
              <p>2. ✅ Enable WebSocket server</p>
              <p>3. ปิด Authentication ได้ (ไม่ต้องใส่ password)</p>
              <p>4. Port ปกติคือ <strong>4455</strong></p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input label="Host" value={obsHost} onChange={setObsHost} placeholder="localhost" className="flex-1" />
                <Input label="Port" value={obsPort} onChange={setObsPort} type="number" placeholder="4455" className="w-28" />
              </div>
              <Input label="Password (ถ้ามี)" value={obsPassword} onChange={setObsPassword} placeholder="ไม่บังคับ" />
            </div>

            <div
              className={clsx('text-sm px-3 py-2 rounded-lg',
                obsStatus.includes('✅') ? 'bg-green-900/30 text-green-400' :
                obsStatus.includes('❌') ? 'bg-red-900/30 text-red-400' :
                obsStatus.includes('กำลัง') ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-gray-800 text-gray-500')}>
              สถานะ: {obsStatus}
            </div>

            <div className="flex gap-2">
              <button onClick={connectObs}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium">
                🔌 ทดสอบเชื่อมต่อ
              </button>
              <button onClick={saveObsSettings}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm">
                💾 บันทึก
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {actionModal && (
        <ActionModal
          initial={actionModal.data}
          onSave={saveAction}
          onClose={() => setActionModal(null)}
          obsHost={obsHost}
          obsPort={obsPort}
        />
      )}
      {eventModal && (
        <EventModal
          initial={eventModal.data}
          actions={actions}
          giftList={(() => {
            // รวม static + dynamic (dynamic override static ถ้าชื่อซ้ำ — ได้ข้อมูลจาก TikTok จริง)
            const map = new Map(TIKTOK_GIFTS.map(g => [g.name, { ...g, pictureUrl: '' }]));
            for (const dg of dynamicGifts) {
              map.set(dg.name, {
                name:       dg.name,
                coins:      dg.diamondCount,
                pictureUrl: dg.pictureUrl || '',
              });
            }
            return Array.from(map.values()).sort((a, b) => a.coins - b.coins);
          })()}
          onSave={saveEvent}
          onClose={() => setEventModal(null)}
        />
      )}

      {/* Preview / Test Modal */}
      {previewAction && (
        <PreviewModal
          action={previewAction}
          onClose={() => setPreviewAction(null)}
          obsHost={obsHost}
          obsPort={obsPort}
          audioEnabled={audioEnabled}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-white font-bold">Login เพื่อใช้งาน</h3>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full bg-white text-gray-900 rounded-lg py-2 text-sm font-medium hover:bg-gray-100">
              {loginLoading ? 'กำลัง Login...' : '🔑 Login ด้วย Google'}
            </button>
            <button onClick={() => setShowLoginModal(false)} className="w-full text-gray-500 text-sm">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* FAB — Floating Action Button สำหรับมือถือ (hidden บน desktop) */}
      {(tab === 'actions' || tab === 'events') && user && (
        <button
          onClick={() => tab === 'actions' ? setActionModal({ data: null }) : setEventModal({ data: null })}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-2xl flex items-center justify-center shadow-lg shadow-brand-900/50 transition-colors active:scale-95"
          style={{ touchAction: 'manipulation' }}
        >
          +
        </button>
      )}
    </div>
  );
}
