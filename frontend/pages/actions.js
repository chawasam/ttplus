// pages/actions.js — ลูกเล่น TT: Actions & Events
import { useEffect, useState, useCallback, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import { speak, speakDirect, configureTTS } from '../lib/tts';
import { getSocket } from '../lib/socket';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://api.ttsam.app';

// ── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = [
  { id: 'show_picture',       icon: '🖼',  label: 'แสดงรูป / GIF' },
  { id: 'play_video',         icon: '🎬',  label: 'เล่นวิดีโอ' },
  { id: 'play_audio',         icon: '🔊',  label: 'เล่นเสียง' },
  // show_alert ปิดไว้ชั่วคราว — ยังไม่พร้อมใช้งาน
  // { id: 'show_alert',      icon: '📢',  label: 'Show Alert' },
  { id: 'read_tts',           icon: '🗣',  label: 'อ่านออกเสียง (TTS)' },
  { id: 'switch_obs_scene',   icon: '🎬',  label: 'สลับ Scene OBS' },
  { id: 'activate_obs_source',icon: '👁',  label: 'เปิด/ปิด OBS Source' },
];

// ── Column definitions for the resizable Action table ────────────────────────
const COL_DEFS = [
  { id: 'toggle', label: '',            defaultW: 52,  minW: 52  },
  { id: 'fire',   label: '',            defaultW: 90,  minW: 90  },
  { id: 'name',   label: 'ชื่อ Action', defaultW: 210, minW: 100 },
  { id: 'scr',    label: 'scr',         defaultW: 58,  minW: 48  },
  { id: 'dur',    label: 'เวลา',        defaultW: 64,  minW: 48  },
  { id: 'types',  label: 'ประเภท',      defaultW: 100, minW: 60  },
  { id: 'desc',   label: 'รายละเอียด', defaultW: 340, minW: 100 },
  { id: 'btns',   label: '',            defaultW: 90,  minW: 90  },
];

const EVT_COL_DEFS = [
  { id: 'toggle',  label: '',           defaultW: 48,  minW: 48  },
  { id: 'cond',    label: 'เงื่อนไข',   defaultW: 220, minW: 120 },
  { id: 'who',     label: 'ใครทำได้',   defaultW: 110, minW: 80  },
  { id: 'linked',  label: 'Actions',    defaultW: 320, minW: 120 },
  { id: 'btns',    label: '',           defaultW: 140, minW: 140 },
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
  { id: 'gift_min_coins',   label: '🪙 ส่งของขวัญ ≥ X coins' },
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
  volume: 100,           // ระดับเสียง 0-100 (apply กับ play_audio และ read_tts)
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
// หมายเหตุ: รายการนี้เป็น fallback — ระหว่าง TikTok Live จริง ระบบจะดึงชื่อ+ราคาจาก
// extendedGiftInfo โดยอัตโนมัติ แล้ว override ค่าที่นี่ (ดูการรวมใน giftList compute ด้านล่าง)
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
  { name: 'Donut',             coins: 1    },
  { name: 'Tree',              coins: 1    },
  { name: 'Heart',             coins: 1    },
  { name: 'Sunflower',         coins: 1    },
  { name: 'Flame',             coins: 1    },
  { name: 'Paper Boat',        coins: 1    },
  // ── 5 coins ──
  { name: 'Finger Heart',      coins: 5    },
  { name: 'Panda',             coins: 5    },
  { name: 'Italian Hand',      coins: 5    },
  { name: 'Sunglasses',        coins: 5    },
  { name: 'GG',                coins: 5    },
  { name: 'Rainbow',           coins: 5    },
  { name: 'Shooting Star',     coins: 5    },
  { name: 'Pinwheel',          coins: 5    },
  { name: 'Perfume',           coins: 5    },
  // ── 10 coins ──
  { name: 'Hand Heart',        coins: 10   },
  { name: 'Star',              coins: 10   },
  { name: 'Birthday Cake',     coins: 10   },
  { name: 'Dolphin',           coins: 10   },
  // ── 15–24 coins ──
  { name: 'Big Love',          coins: 15   },
  { name: 'Valentine Heart',   coins: 15   },
  // ── 25 coins ──
  { name: 'Love Bang',         coins: 25   },
  { name: 'Mini Speaker',      coins: 25   },
  { name: 'Butterfly',         coins: 25   },
  { name: 'Baller',            coins: 25   },
  // ── 49–50 coins ──
  { name: 'Cap',               coins: 49   },
  { name: 'Sun Cream',         coins: 50   },
  { name: 'Sunscreen',         coins: 50   },
  { name: 'Mic',               coins: 50   },
  { name: 'Wishing Bottle',    coins: 50   },
  { name: 'Lucky Cat',         coins: 50   },
  { name: 'HipHop',            coins: 50   },
  // ── 99 coins ──
  { name: 'Microphone',        coins: 99   },
  { name: 'Space Rocket',      coins: 99   },
  // ── 100–199 coins ──
  { name: 'Football',          coins: 100  },
  { name: 'Rainbow Puke',      coins: 100  },
  { name: 'Concert',           coins: 100  },
  { name: 'Carnival',          coins: 100  },
  { name: 'Drum',              coins: 100  },
  { name: 'Gift Box',          coins: 100  },
  { name: 'Chick',             coins: 100  },
  // ── 200–299 coins ──
  { name: 'Corgi',             coins: 200  },
  { name: 'Jolly',             coins: 200  },
  { name: 'Mirror',            coins: 299  },
  { name: 'Rose Bouquet',      coins: 299  },
  { name: 'Flying Beauty',     coins: 299  },
  // ── 300–499 coins ──
  { name: 'Silver Crown',      coins: 399  },
  { name: 'Balloons',          coins: 399  },
  // ── 500–999 coins ──
  { name: 'Galaxy',            coins: 500  },
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
  { name: 'Universe',          coins: 44999 },
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
        className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none w-full"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={clsx('w-9 h-5 rounded-full transition-colors flex items-center px-0.5', checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700')}
      >
        <div className={clsx('w-4 h-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

// ── GiftPicker — inline chip grid with price filter (แบบ C) ─────────────────
const PRICE_FILTERS = [
  { id: 'f1',   label: '1 🪙',          min: 1,    max: 1        },
  { id: 'f2',   label: '2–10 🪙',       min: 2,    max: 10       },
  { id: 'f3',   label: '11–100 🪙',     min: 11,   max: 100      },
  { id: 'f4',   label: '101–1,000 🪙',  min: 101,  max: 1000     },
  { id: 'f5',   label: '1,001–5,000 🪙',min: 1001, max: 5000     },
  { id: 'f6',   label: '5,000+ 🪙',     min: 5001, max: Infinity },
];

function GiftPicker({ value, onChange, giftList }) {
  const [priceFilter, setPriceFilter] = useState('');
  const [search,      setSearch]      = useState('');

  const pf = PRICE_FILTERS.find(f => f.id === priceFilter) || null;

  const visible = giftList.filter(g => {
    const inPrice  = !pf || (g.coins >= pf.min && g.coins <= pf.max);
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
        className="w-full bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none placeholder-gray-400 dark:placeholder-slate-600"
      />

      {/* Price filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PRICE_FILTERS.map(f => (
          <button type="button" key={f.id}
            onClick={() => setPriceFilter(prev => prev === f.id ? '' : f.id)}
            className={clsx(
              'text-[11px] px-2.5 py-0.5 rounded-full border transition-colors',
              priceFilter === f.id
                ? 'bg-brand-700/50 border-brand-600 text-brand-200'
                : 'bg-[#f4f4f3] dark:bg-[#161b28] border-gray-300 dark:border-[#2d3550] text-gray-500 dark:text-slate-400 hover:border-slate-500'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Chip grid */}
      <div className="h-40 overflow-y-auto rounded-lg border border-gray-300 dark:border-[#2d3550] bg-[#f4f4f3] dark:bg-[#161b28] p-1.5">
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
                    : 'bg-[#ededeb] dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-500 hover:bg-gray-750'
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

// ── UsernameCombobox — autocomplete dropdown สำหรับ specific_user ──────────
// ดึง known viewers จาก /api/actions/known-users (cache 60s) — กรองแบบ prefix
let _knownUsersCache = null; // { data: [], expiresAt }
const KNOWN_USERS_TTL_MS = 60_000;

async function fetchKnownUsers(force = false) {
  if (!force && _knownUsersCache && _knownUsersCache.expiresAt > Date.now()) {
    return _knownUsersCache.data;
  }
  try {
    const { data } = await api.get('/api/actions/known-users');
    const users = Array.isArray(data?.users) ? data.users : [];
    _knownUsersCache = { data: users, expiresAt: Date.now() + KNOWN_USERS_TTL_MS };
    return users;
  } catch {
    return _knownUsersCache?.data || [];
  }
}

function UsernameCombobox({ label, value, onChange, placeholder = '@username' }) {
  const [users,       setUsers]       = useState([]);
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetchKnownUsers().then(setUsers);
  }, []);

  // Click outside → close dropdown
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Filter prefix-match (uniqueId หรือ nickname) — ตัด '@' นำออกก่อนเทียบ
  const q = (value || '').replace(/^@/, '').trim().toLowerCase();
  const matches = q
    ? users.filter(u =>
        u.uniqueId.toLowerCase().startsWith(q) ||
        (u.nickname && u.nickname.toLowerCase().startsWith(q))
      ).slice(0, 50)
    : users.slice(0, 50);

  function pick(u) {
    onChange(u.uniqueId);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && matches[highlighted]) {
      e.preventDefault();
      pick(matches[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <input
        type="text"
        value={value || ''}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none w-full"
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-72 overflow-y-auto rounded-lg border border-gray-300 dark:border-[#2d3550] bg-white dark:bg-[#1a1f30] shadow-xl">
          {matches.map((u, i) => (
            <button
              key={u.uniqueId}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => pick(u)}
              className={clsx(
                'w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
                i === highlighted
                  ? 'bg-brand-600/20 text-white'
                  : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#262d44]'
              )}>
              {u.profilePictureUrl ? (
                <img src={u.profilePictureUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {(u.nickname || u.uniqueId)[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{u.nickname}</div>
                <div className="text-[10px] text-gray-500 truncate">@{u.uniqueId}</div>
              </div>
              {u.eventCount > 1 && (
                <span className="text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">{u.eventCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && matches.length === 0 && q && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-gray-300 dark:border-[#2d3550] bg-white dark:bg-[#1a1f30] px-3 py-2 text-xs text-gray-500">
          ไม่มี viewer ขึ้นต้นด้วย "{q}" — บันทึกได้ตามที่พิมพ์
        </div>
      )}
    </div>
  );
}

// ── ActionChipPicker — chip-based multi-select with dropdown ───────────────
// คลิก zone ว่าง → dropdown เปิด → เลือก action → กลายเป็น chip · กดอีกรอบเพื่อเพิ่ม
const PICKER_ACCENT = {
  emerald: {
    border: 'border-emerald-500/30',
    chipBg: 'bg-emerald-500/15',
    chipBorder: 'border-emerald-400/40',
    chipText: 'text-emerald-100',
    chipRemove: 'text-emerald-300 hover:text-white hover:bg-emerald-500/40',
    hint: 'text-emerald-300/70',
    optionHover: 'hover:bg-emerald-500/15',
  },
  purple: {
    border: 'border-purple-500/30',
    chipBg: 'bg-purple-500/15',
    chipBorder: 'border-purple-400/40',
    chipText: 'text-purple-100',
    chipRemove: 'text-purple-300 hover:text-white hover:bg-purple-500/40',
    hint: 'text-purple-300/70',
    optionHover: 'hover:bg-purple-500/15',
  },
};

function ActionChipPicker({ actions, selectedIds, onToggle, accent = 'emerald', extraInfo }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const c = PICKER_ACCENT[accent] || PICKER_ACCENT.emerald;

  const selectedActions = selectedIds
    .map(id => actions.find(a => a.id === id))
    .filter(Boolean);
  const unselected = actions.filter(a => !selectedIds.includes(a.id));
  const filtered = search.trim()
    ? unselected.filter(a => a.name.toLowerCase().includes(search.trim().toLowerCase()))
    : unselected;

  // click outside → close
  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // focus search input เมื่อ dropdown เปิด
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  function handleBoxClick() {
    if (unselected.length === 0) return;
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={handleBoxClick}
        className={clsx(
          'min-h-[60px] rounded-lg border-2 border-dashed bg-[#0f172a]/60 p-2 flex flex-wrap gap-1.5 items-center transition-colors',
          c.border,
          unselected.length > 0 && 'cursor-pointer hover:bg-[#1a1f30]/80'
        )}>
        {selectedActions.map(a => (
          <span
            key={a.id}
            onClick={e => e.stopPropagation()}
            className={clsx(
              'inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md border text-xs font-medium',
              c.chipBg, c.chipBorder, c.chipText
            )}>
            <span className="max-w-[180px] truncate">{a.name}</span>
            {extraInfo && extraInfo(a) && (
              <span className="text-[10px] opacity-70 ml-0.5">{extraInfo(a)}</span>
            )}
            <button
              type="button"
              onClick={() => onToggle(a.id)}
              className={clsx('w-4 h-4 rounded flex items-center justify-center text-xs leading-none transition-colors', c.chipRemove)}
              aria-label="ลบออก">
              ×
            </button>
          </span>
        ))}
        {unselected.length > 0 && (
          <span className={clsx('text-xs italic', c.hint, selectedActions.length > 0 ? 'ml-1' : 'mx-auto')}>
            {selectedActions.length === 0 ? 'คลิกเพื่อเพิ่ม action' : '+ เพิ่ม'}
          </span>
        )}
        {unselected.length === 0 && selectedActions.length > 0 && (
          <span className="text-xs italic text-gray-500 mx-auto">เลือกครบทุก action แล้ว</span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-gray-300 dark:border-[#2d3550] bg-white dark:bg-[#1a1f30] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-[#2d3550]">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`🔍 ค้นหา (เหลือ ${unselected.length} action)`}
              className="w-full bg-[#0f172a] border border-[#2d3550] rounded px-2 py-1.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500 text-center">
                {search ? `ไม่พบ "${search}"` : 'ไม่มี action ให้เพิ่ม'}
              </div>
            ) : (
              filtered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onToggle(a.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition-colors',
                    c.optionHover
                  )}>
                  <span className="text-gray-500 text-base leading-none">+</span>
                  <span className="flex-1 truncate">{a.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
          className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none w-full"
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
          className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none w-full"
        />
      )}
    </div>
  );
}

// ── Action Form Modal ────────────────────────────────────────────────────────
function ActionModal({ initial, onSave, onClose, obsHost, obsPort, audioEnabled }) {
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

  // Audio upload state (play_audio)
  const [audioWarn,        setAudioWarn]        = useState(false);
  const [audioPendingFile, setAudioPendingFile] = useState(null);
  const [audioUploading,   setAudioUploading]   = useState(false);
  const [audioResult,      setAudioResult]      = useState(null);
  const [audioService,     setAudioService]     = useState('catbox');
  const [audioLitterTime,  setAudioLitterTime]  = useState('24h');
  const audioInputRef = useRef(null);

  // Image upload state (show_picture)
  const [imgWarn,        setImgWarn]        = useState(false);
  const [imgPendingFile, setImgPendingFile] = useState(null);
  const [imgUploading,   setImgUploading]   = useState(false);
  const [imgResult,      setImgResult]      = useState(null);
  const [imgService,     setImgService]     = useState('catbox');
  const [imgLitterTime,  setImgLitterTime]  = useState('24h');
  const imgInputRef = useRef(null);

  // Filehost upload state (play_video)
  const [uploadWarn,        setUploadWarn]        = useState(false);   // แสดง warning dialog
  const [uploadPendingFile, setUploadPendingFile] = useState(null);    // ไฟล์ที่รอ confirm
  const [uploading,         setUploading]         = useState(false);   // กำลัง upload
  const [uploadResult,      setUploadResult]      = useState(null);    // URL ที่ได้หลัง upload สำเร็จ
  const [uploadService,     setUploadService]     = useState('catbox'); // service ที่เลือก
  const [litterboxTime,     setLitterboxTime]     = useState('24h');   // อายุไฟล์ของ litterbox
  const uploadInputRef = useRef(null);

  const UPLOAD_SERVICES = [
    { id: 'catbox',    label: 'catbox.moe',  badge: '♾ ถาวร',       badgeColor: 'text-green-400',  maxMB: 200, desc: 'ฟรี ถาวร แต่ลบไม่ได้' },
    { id: 'litterbox', label: 'Litterbox',   badge: '⏱ ชั่วคราว',   badgeColor: 'text-amber-400',  maxMB: 200, desc: 'หมดอายุได้ถึง 72ชม.' },
    { id: 'uguu',      label: 'uguu.se',     badge: '⏱ 48ชม.',      badgeColor: 'text-orange-400', maxMB: 100, desc: 'ไม่ต้องสมัคร · ลบหลัง 48ชม.' },
  ];

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
    const text = (form.ttsText || 'ทดสอบเสียง')
      .replace('{username}', 'ทดสอบ').replace('{giftname}', 'Rose').replace('{coins}', '100');
    // ใช้ speakDirect แทน speak เพื่อไม่ติด _cfg.enabled guard
    // — ปุ่มทดสอบควรทำงานได้เสมอโดยไม่ต้องเปิด TTS หลักก่อน
    speakDirect('web', text).catch(() => {
      toast.error('ไม่สามารถเล่นเสียงได้ — browser อาจบล็อก autoplay');
    });
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
                className="mt-1 w-full bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none">
                <option value={1}>Screen 1</option>
                <option value={2}>Screen 2</option>
              </select>
            </div>
            <Input label="Global Cooldown (วิ)" value={form.globalCooldown}
              onChange={v => set('globalCooldown', v)} type="number" min={0} />
            <Input label="User Cooldown (วิ)" value={form.userCooldown}
              onChange={v => set('userCooldown', v)} type="number" min={0} />
          </div>
          {/* Volume slider */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">🔊 ระดับเสียง</label>
              <span className="text-xs font-mono text-brand-400">{form.volume ?? 100}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={form.volume ?? 100}
              onChange={e => set('volume', Number(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <p className="text-[10px] text-gray-600 mt-0.5">ใช้กับ เล่นเสียง และ อ่านออกเสียง (TTS)</p>
          </div>

          <div className="space-y-2 pt-1">
            <Toggle label="Fade In/Out" checked={form.fadeInOut} onChange={v => set('fadeInOut', v)} />
            <Toggle label="Repeat กับ Gift combos" checked={form.repeatWithCombos} onChange={v => set('repeatWithCombos', v)} />
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'show_picture': {
        // อัปโหลดรูปภาพไปยัง service ที่เลือก
        const doImgUpload = async (file) => {
          setImgUploading(true);
          try {
            const fd = new FormData();
            fd.append('file', file);
            const params = new URLSearchParams({ service: imgService, mediaType: 'image' });
            if (imgService === 'litterbox') params.set('time', imgLitterTime);
            const res = await api.post(`/api/filehost/upload?${params}`, fd, {
              timeout: 60000,
              headers: { 'Content-Type': undefined },
            });
            set('pictureUrl', res.data.url);
            setImgResult(res.data.url);
            toast.success('✅ อัปโหลดสำเร็จ!');
          } catch (e) {
            toast.error(e?.response?.data?.error || 'อัปโหลดล้มเหลว');
          } finally {
            setImgUploading(false);
            setImgPendingFile(null);
          }
        };

        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🖼 รูป / GIF</p>

            {/* URL input */}
            <Input label="URL รูปหรือ GIF" value={form.pictureUrl} onChange={v => set('pictureUrl', v)}
              placeholder="https://media.giphy.com/..." />
            <p className="text-[10px] text-gray-600">รองรับ PNG, JPG, GIF, WebP — ใช้ลิงก์ตรงถึงไฟล์</p>
            <p className="text-[10px] text-amber-600/80">💡 แนะนำ: ไฟล์เล็กกว่า 1MB เพื่อให้โหลดได้ทันทีระหว่าง Live</p>

            {/* Service selector */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500 font-medium">☁ อัปโหลดไฟล์ผ่าน</p>
              <div className="flex gap-1.5 flex-wrap">
                {UPLOAD_SERVICES.map(svc => (
                  <button key={svc.id} type="button" onClick={() => setImgService(svc.id)}
                    className={clsx(
                      'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors text-[11px] min-w-[100px]',
                      imgService === svc.id
                        ? 'border-brand-500 bg-brand-900/50 text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-[#f4f4f3] dark:bg-gray-800/40 text-gray-400 hover:border-gray-500'
                    )}>
                    <span className="font-semibold text-[12px]">{svc.label}</span>
                    <span className={clsx('text-[10px]', imgService === svc.id ? svc.badgeColor : 'text-gray-500')}>
                      {svc.badge} · {svc.maxMB}MB
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{svc.desc}</span>
                  </button>
                ))}
              </div>
              {imgService === 'litterbox' && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-gray-500">ระยะเวลา</span>
                  {['1h', '12h', '24h', '72h'].map(t => (
                    <button key={t} type="button" onClick={() => setImgLitterTime(t)}
                      className={clsx(
                        'text-[11px] px-2.5 py-1 rounded border transition-colors',
                        imgLitterTime === t
                          ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                          : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-500'
                      )}>{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImgPendingFile(f);
                setImgWarn(true);
                e.target.value = '';
              }} />

            {/* Drag & Drop zone */}
            <div
              onClick={() => !imgUploading && imgInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.setAttribute('data-drag', '1'); }}
              onDragLeave={e => e.currentTarget.removeAttribute('data-drag')}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.removeAttribute('data-drag');
                const f = e.dataTransfer.files?.[0];
                if (!f || imgUploading) return;
                setImgPendingFile(f);
                setImgWarn(true);
              }}
              className={clsx(
                'relative border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors select-none',
                imgUploading
                  ? 'border-brand-600/40 bg-brand-950/20 cursor-not-allowed'
                  : 'border-brand-700/40 hover:border-brand-500 hover:bg-brand-950/30 [&[data-drag]]:border-brand-400 [&[data-drag]]:bg-brand-900/40'
              )}>
              {imgUploading ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl animate-spin">⏳</span>
                  <p className="text-xs text-brand-300">กำลังอัปโหลด...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 pointer-events-none">
                  <span className="text-2xl">🖼</span>
                  <p className="text-xs text-gray-400">คลิกหรือลากไฟล์รูปมาวางที่นี่</p>
                  <p className="text-[10px] text-gray-600">PNG, JPG, GIF, WebP · max {UPLOAD_SERVICES.find(s => s.id === imgService)?.maxMB}MB</p>
                </div>
              )}
            </div>

            {/* ผลลัพธ์หลัง upload สำเร็จ */}
            {imgResult && !imgUploading && (
              <div className="rounded-lg border border-green-700/50 bg-green-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-400">✅ อัปโหลดสำเร็จ — ลิงก์รูปภาพของคุณ</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={imgResult}
                    className="flex-1 min-w-0 text-[11px] bg-[#ededeb] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-green-700 dark:text-green-300 font-mono truncate select-all"
                    onFocus={e => e.target.select()} />
                  <button type="button"
                    onClick={() => navigator.clipboard.writeText(imgResult)
                      .then(() => toast.success('คัดลอกแล้ว!'))
                      .catch(() => toast.error('คัดลอกไม่สำเร็จ'))}
                    className="shrink-0 text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors">
                    📋 Copy
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">ลิงก์นี้ถูกเติมใน URL รูปแล้ว สามารถ Copy ไปใช้ที่อื่นได้เลย</p>
              </div>
            )}

            {/* Warning dialog ก่อน upload */}
            {imgWarn && imgPendingFile && (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-300">⚠ ข้อควรรู้ก่อนอัปโหลดไปยัง {UPLOAD_SERVICES.find(s => s.id === imgService)?.label}</p>
                <ul className="text-[11px] text-amber-200/80 space-y-1 list-disc list-inside">
                  <li>ไฟล์จะเป็น <b>สาธารณะ</b> — ใครก็เปิดลิงก์ได้</li>
                  {imgService === 'litterbox'
                    ? <li>ไฟล์จะหมดอายุใน <b>{imgLitterTime}</b></li>
                    : imgService === 'uguu'
                    ? <li>ไฟล์จะ<b>ลบอัตโนมัติหลัง 48 ชั่วโมง</b></li>
                    : <li>ไฟล์ <b>ลบไม่ได้</b> หลังอัปโหลด</li>}
                  <li>ห้ามอัปโหลดเนื้อหาละเมิดลิขสิทธิ์หรือกฎหมาย</li>
                </ul>
                <p className="text-[11px] text-gray-400">ไฟล์: <span className="text-white">{imgPendingFile.name}</span> ({(imgPendingFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    onClick={() => { setImgWarn(false); doImgUpload(imgPendingFile); }}
                    className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
                    ยืนยัน อัปโหลด
                  </button>
                  <button type="button"
                    onClick={() => { setImgWarn(false); setImgPendingFile(null); }}
                    className="text-xs px-3 py-1.5 rounded border border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'play_video': {
        // แปลง Google Drive sharing link → direct download URL
        const convertDriveUrl = (url) => {
          if (!url) return url;
          const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
          const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
          if (openMatch) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
          return url;
        };
        const isDriveFolder = form.videoUrl?.includes('drive.google.com/drive');
        const isDriveDirect = form.videoUrl?.includes('drive.google.com/uc?export=download');

        // อัปโหลดไปยัง filehost หลังยืนยัน
        const doUpload = async (file) => {
          setUploading(true);
          try {
            const fd = new FormData();
            fd.append('file', file);
            // params: service + time (litterbox เท่านั้น)
            const params = new URLSearchParams({ service: uploadService });
            if (uploadService === 'litterbox') params.set('time', litterboxTime);
            const res = await api.post(`/api/filehost/upload?${params}`, fd, {
              timeout: 120000, // 2 นาที (ไฟล์ใหญ่)
              headers: { 'Content-Type': undefined }, // ปล่อยให้ browser set multipart/form-data; boundary=... เอง
            });
            set('videoUrl', res.data.url);
            setUploadResult(res.data.url);
            toast.success('✅ อัปโหลดสำเร็จ!');
          } catch (e) {
            toast.error(e?.response?.data?.error || 'อัปโหลดล้มเหลว');
          } finally {
            setUploading(false);
            setUploadPendingFile(null);
          }
        };

        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🎬 วิดีโอ</p>

            {/* URL input — ใส่เองได้ */}
            <Input label="URL วิดีโอ" value={form.videoUrl}
              onChange={v => set('videoUrl', convertDriveUrl(v))}
              placeholder="https://..." />

            {/* Service selector */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500 font-medium">☁ อัปโหลดไฟล์ผ่าน</p>
              <div className="flex gap-1.5 flex-wrap">
                {UPLOAD_SERVICES.map(svc => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setUploadService(svc.id)}
                    className={clsx(
                      'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors text-[11px] min-w-[100px]',
                      uploadService === svc.id
                        ? 'border-brand-500 bg-brand-900/50 text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-[#f4f4f3] dark:bg-gray-800/40 text-gray-400 hover:border-gray-500'
                    )}>
                    <span className="font-semibold text-[12px]">{svc.label}</span>
                    <span className={clsx('text-[10px]', uploadService === svc.id ? svc.badgeColor : 'text-gray-500')}>
                      {svc.badge} · {svc.maxMB}MB
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{svc.desc}</span>
                  </button>
                ))}
              </div>

              {/* Litterbox time selector */}
              {uploadService === 'litterbox' && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-gray-500">ระยะเวลา</span>
                  {['1h', '12h', '24h', '72h'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLitterboxTime(t)}
                      className={clsx(
                        'text-[11px] px-2.5 py-1 rounded border transition-colors',
                        litterboxTime === t
                          ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                          : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-500'
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drag & Drop + Upload zone */}
            <input
              ref={uploadInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploadPendingFile(f);
                setUploadWarn(true);
                e.target.value = '';
              }}
            />
            <div
              onClick={() => !uploading && uploadInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.setAttribute('data-drag', '1'); }}
              onDragLeave={e => e.currentTarget.removeAttribute('data-drag')}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.removeAttribute('data-drag');
                const f = e.dataTransfer.files?.[0];
                if (!f || uploading) return;
                setUploadPendingFile(f);
                setUploadWarn(true);
              }}
              className={clsx(
                'relative border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors select-none',
                uploading
                  ? 'border-brand-600/40 bg-brand-950/20 cursor-not-allowed'
                  : 'border-brand-700/40 hover:border-brand-500 hover:bg-brand-950/30 [&[data-drag]]:border-brand-400 [&[data-drag]]:bg-brand-900/40'
              )}>
              {uploading ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl animate-spin">⏳</span>
                  <p className="text-xs text-brand-300">กำลังอัปโหลด...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 pointer-events-none">
                  <span className="text-2xl">☁</span>
                  <p className="text-xs text-brand-300 font-medium">วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก</p>
                  <p className="text-[10px] text-gray-600">MP4 / WebM / MOV สูงสุด 200MB</p>
                  <p className="text-[10px] text-amber-600/80">💡 แนะนำ: ไฟล์เล็กกว่า 20MB เพื่อให้เริ่มเล่นได้เร็ว</p>
                </div>
              )}
            </div>

            {/* Warnings */}
            {isDriveFolder && (
              <p className="text-[11px] text-red-400">⚠ ลิงก์นี้เป็น Google Drive Folder — ไม่สามารถเล่นเป็นวิดีโอได้</p>
            )}
            {isDriveDirect && (
              <p className="text-[11px] text-amber-400">⚠ Google Drive: ไฟล์ขนาดใหญ่อาจเล่นไม่ได้ถ้า Google แสดงหน้า virus scan</p>
            )}

            {/* Warning dialog ก่อน upload */}
            {/* ผลลัพธ์หลัง upload สำเร็จ */}
            {uploadResult && !uploading && (
              <div className="rounded-lg border border-green-700/50 bg-green-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-400">✅ อัปโหลดสำเร็จ — ลิงก์วิดีโอของคุณ</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={uploadResult}
                    className="flex-1 min-w-0 text-[11px] bg-[#ededeb] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-green-700 dark:text-green-300 font-mono truncate select-all"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(uploadResult)
                        .then(() => toast.success('คัดลอกแล้ว!'))
                        .catch(() => toast.error('คัดลอกไม่สำเร็จ'));
                    }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors">
                    📋 Copy
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">ลิงก์นี้ถูกเติมใน URL วิดีโอแล้ว สามารถ Copy ไปใช้ที่อื่นได้เลย</p>
              </div>
            )}

            {uploadWarn && uploadPendingFile && (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-300">⚠ ข้อควรรู้ก่อนอัปโหลดไปยัง {UPLOAD_SERVICES.find(s => s.id === uploadService)?.label}</p>
                <ul className="text-[11px] text-amber-200/80 space-y-1 list-disc list-inside">
                  <li>ไฟล์จะเป็น <b>Public</b> — ใครมีลิงก์ก็เข้าถึงได้</li>
                  {uploadService === 'litterbox'
                    ? <li>ไฟล์จะหมดอายุใน <b>{litterboxTime}</b></li>
                    : uploadService === 'uguu'
                    ? <li>ไฟล์จะ<b>ลบอัตโนมัติหลัง 48 ชั่วโมง</b></li>
                    : <li>ไฟล์ <b>ลบไม่ได้</b> หลังอัปโหลด</li>}
                  <li>ขนาดสูงสุด <b>{UPLOAD_SERVICES.find(s => s.id === uploadService)?.maxMB}MB</b></li>
                  <li>ห้ามอัปโหลดเนื้อหาละเมิดลิขสิทธิ์หรือกฎหมาย</li>
                </ul>
                <p className="text-[11px] text-gray-400">ไฟล์: <span className="text-white">{uploadPendingFile.name}</span> ({(uploadPendingFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setUploadWarn(false); doUpload(uploadPendingFile); }}
                    className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
                    ยืนยัน อัปโหลด
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUploadWarn(false); setUploadPendingFile(null); }}
                    className="text-xs px-3 py-1.5 rounded border border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'play_audio': {
        const doAudioUpload = async (file) => {
          setAudioUploading(true);
          try {
            const fd = new FormData();
            fd.append('file', file);
            const params = new URLSearchParams({ service: audioService, mediaType: 'audio' });
            if (audioService === 'litterbox') params.set('time', audioLitterTime);
            const res = await api.post(`/api/filehost/upload?${params}`, fd, {
              timeout: 60000,
              headers: { 'Content-Type': undefined },
            });
            set('audioUrl', res.data.url);
            setAudioResult(res.data.url);
            toast.success('✅ อัปโหลดสำเร็จ!');
          } catch (e) {
            toast.error(e?.response?.data?.error || 'อัปโหลดล้มเหลว');
          } finally {
            setAudioUploading(false);
            setAudioPendingFile(null);
          }
        };

        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🔊 เสียง</p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400/80">🔈 เสียงจะออกจาก OBS Browser Source ของ <b>Screen {form.overlayScreen ?? 1}</b> — ต้องเปิด URL นั้นไว้ใน OBS</p>

            <Input label="URL เสียง" value={form.audioUrl} onChange={v => set('audioUrl', v)}
              placeholder="https://..." />

            {/* Service selector */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500 font-medium">☁ อัปโหลดไฟล์ผ่าน</p>
              <div className="flex gap-1.5 flex-wrap">
                {UPLOAD_SERVICES.map(svc => (
                  <button key={svc.id} type="button" onClick={() => setAudioService(svc.id)}
                    className={clsx(
                      'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors text-[11px] min-w-[100px]',
                      audioService === svc.id
                        ? 'border-brand-500 bg-brand-900/50 text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-[#f4f4f3] dark:bg-gray-800/40 text-gray-400 hover:border-gray-500'
                    )}>
                    <span className="font-semibold text-[12px]">{svc.label}</span>
                    <span className={clsx('text-[10px]', audioService === svc.id ? svc.badgeColor : 'text-gray-500')}>
                      {svc.badge} · {svc.maxMB}MB
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{svc.desc}</span>
                  </button>
                ))}
              </div>
              {audioService === 'litterbox' && (
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-gray-500">ระยะเวลา</span>
                  {['1h', '12h', '24h', '72h'].map(t => (
                    <button key={t} type="button" onClick={() => setAudioLitterTime(t)}
                      className={clsx(
                        'text-[11px] px-2.5 py-1 rounded border transition-colors',
                        audioLitterTime === t
                          ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                          : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-500'
                      )}>{t}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setAudioPendingFile(f);
                setAudioWarn(true);
                e.target.value = '';
              }} />

            {/* Drag & Drop zone */}
            <div
              onClick={() => !audioUploading && audioInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.setAttribute('data-drag', '1'); }}
              onDragLeave={e => e.currentTarget.removeAttribute('data-drag')}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.removeAttribute('data-drag');
                const f = e.dataTransfer.files?.[0];
                if (!f || audioUploading) return;
                setAudioPendingFile(f);
                setAudioWarn(true);
              }}
              className={clsx(
                'relative border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors select-none',
                audioUploading
                  ? 'border-brand-600/40 bg-brand-950/20 cursor-not-allowed'
                  : 'border-brand-700/40 hover:border-brand-500 hover:bg-brand-950/30 [&[data-drag]]:border-brand-400 [&[data-drag]]:bg-brand-900/40'
              )}>
              {audioUploading ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl animate-spin">⏳</span>
                  <p className="text-xs text-brand-300">กำลังอัปโหลด...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 pointer-events-none">
                  <span className="text-2xl">🔊</span>
                  <p className="text-xs text-gray-400">คลิกหรือลากไฟล์เสียงมาวางที่นี่</p>
                  <p className="text-[10px] text-gray-600">MP3, WAV, OGG, AAC · max {UPLOAD_SERVICES.find(s => s.id === audioService)?.maxMB}MB</p>
                  <p className="text-[10px] text-amber-600/80">💡 แนะนำ: ไฟล์เล็กกว่า 5MB เพื่อให้เล่นได้ทันที</p>
                </div>
              )}
            </div>

            {/* ผลลัพธ์หลัง upload สำเร็จ */}
            {audioResult && !audioUploading && (
              <div className="rounded-lg border border-green-700/50 bg-green-950/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-400">✅ อัปโหลดสำเร็จ — ลิงก์ไฟล์เสียงของคุณ</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={audioResult}
                    className="flex-1 min-w-0 text-[11px] bg-[#ededeb] dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-green-700 dark:text-green-300 font-mono truncate select-all"
                    onFocus={e => e.target.select()} />
                  <button type="button"
                    onClick={() => navigator.clipboard.writeText(audioResult)
                      .then(() => toast.success('คัดลอกแล้ว!'))
                      .catch(() => toast.error('คัดลอกไม่สำเร็จ'))}
                    className="shrink-0 text-xs px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors">
                    📋 Copy
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">ลิงก์นี้ถูกเติมใน URL เสียงแล้ว สามารถ Copy ไปใช้ที่อื่นได้เลย</p>
              </div>
            )}

            {/* Warning dialog */}
            {audioWarn && audioPendingFile && (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-300">⚠ ข้อควรรู้ก่อนอัปโหลดไปยัง {UPLOAD_SERVICES.find(s => s.id === audioService)?.label}</p>
                <ul className="text-[11px] text-amber-200/80 space-y-1 list-disc list-inside">
                  <li>ไฟล์จะเป็น <b>สาธารณะ</b> — ใครก็เปิดลิงก์ได้</li>
                  {audioService === 'litterbox'
                    ? <li>ไฟล์จะหมดอายุใน <b>{audioLitterTime}</b></li>
                    : audioService === 'uguu'
                    ? <li>ไฟล์จะ<b>ลบอัตโนมัติหลัง 48 ชั่วโมง</b></li>
                    : <li>ไฟล์ <b>ลบไม่ได้</b> หลังอัปโหลด</li>}
                  <li>ห้ามอัปโหลดเนื้อหาละเมิดลิขสิทธิ์หรือกฎหมาย</li>
                </ul>
                <p className="text-[11px] text-gray-400">ไฟล์: <span className="text-white">{audioPendingFile.name}</span> ({(audioPendingFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    onClick={() => { setAudioWarn(false); doAudioUpload(audioPendingFile); }}
                    className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
                    ยืนยัน อัปโหลด
                  </button>
                  <button type="button"
                    onClick={() => { setAudioWarn(false); setAudioPendingFile(null); }}
                    className="text-xs px-3 py-1.5 rounded border border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'show_alert':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">📢 Alert</p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400/80">🔈 เสียง Alert จะออกจาก OBS Browser Source ของ <b>Screen {form.overlayScreen ?? 1}</b> — ต้องเปิด URL นั้นไว้ใน OBS</p>
            <Input label="ข้อความ Alert" value={form.alertText} onChange={v => set('alertText', v)}
              placeholder="ขอบคุณ {username}! 🎉" />
            <p className="text-[10px] text-gray-600">ใช้ {'{username}'} {'{giftname}'} {'{coins}'} ได้</p>
          </div>
        );
      case 'read_tts':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">🗣 TTS</p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400/80">🔈 เสียงจะออกจาก OBS Browser Source ของ <b>Screen {form.overlayScreen ?? 1}</b> — ต้องเปิด URL นั้นไว้ใน OBS</p>
            <p className="text-[10px] text-purple-600 dark:text-purple-400/70">🔗 ใช้เสียงและ engine เดียวกับแถบ TTS สิริ — ตั้งค่าเสียงได้ที่แถบ TTS หลัก ปิด/เปิด TTS สิริ ไม่มีผลกับ Action นี้</p>
            <Input label="ข้อความที่จะอ่าน" value={form.ttsText} onChange={v => set('ttsText', v)}
              placeholder="พิมพ์ข้อความที่ต้องการที่จะให้ Siri พูด" />
            <p className="text-[10px] text-gray-600">ใช้ {'{username}'} {'{giftname}'} {'{coins}'} ได้</p>
            <button onClick={testTts}
              className="text-xs bg-[#ededeb] dark:bg-gray-800 hover:bg-[#e5e5e3] dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-brand-400 rounded px-3 py-1.5 transition-colors">
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
      <div className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Action' : 'สร้าง Action ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        {/* ชื่อ Action */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Input label="ชื่อ Action *" value={form.name} onChange={v => set('name', v)} placeholder="เช่น Rose Alert" />
        </div>

        {/* Body: sidebar ซ้าย + content ขวา */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar ซ้าย — type list */}
          <div className="w-44 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto">
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
                      : 'border-transparent text-gray-400 hover:bg-[#ededeb] dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200'
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
                      isOn ? 'bg-brand-600 border-brand-500' : 'border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                    )}
                  >
                    {isOn && <span className="text-white text-[9px] leading-none">✓</span>}
                  </span>
                  <span className="leading-tight">{t.icon} {t.label}</span>
                </div>
              );
            })}

            {/* Divider + Settings tab */}
            <div className="mt-auto border-t border-gray-200 dark:border-gray-800">
              <div
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none transition-colors text-sm border-l-2',
                  activeTab === '__settings__'
                    ? 'border-brand-500 bg-brand-900/30 text-white'
                    : 'border-transparent text-gray-400 hover:bg-[#ededeb] dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200'
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
        <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium transition-colors">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-[#ededeb] dark:bg-gray-800 hover:bg-[#e5e5e3] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded py-2 text-sm transition-colors">
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
                      ? 'border-gray-600 text-gray-700 dark:text-gray-300 hover:border-brand-400 bg-[#f4f4f3] dark:bg-gray-800/40'
                      : 'border-gray-300 dark:border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-700 dark:text-gray-300'
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
                      ? 'border-gray-600 text-gray-700 dark:text-gray-300 hover:border-brand-400 bg-[#f4f4f3] dark:bg-gray-800/40'
                      : 'border-gray-300 dark:border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-700 dark:text-gray-300'
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
              <UsernameCombobox label="TikTok username" value={form.specificUser}
                onChange={v => set('specificUser', v)} placeholder="@username — พิมพ์เพื่อกรองรายชื่อ" />
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
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1 h-6 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-base font-bold text-emerald-300 flex-1 leading-tight">
                      ✅ ทำทั้งหมดที่เลือก
                    </p>
                    {allCount > 0 && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full font-semibold">
                        {allCount} รายการ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3 ml-3">เมื่อ trigger — ทำ action เหล่านี้ทุกอันพร้อมกัน</p>
                  <ActionChipPicker
                    actions={actions}
                    selectedIds={form.actionIds}
                    onToggle={id => toggleActionId(id, 'actionIds')}
                    accent="emerald"
                  />
                </div>

                {/* ── สุ่ม 1 จาก pool ── */}
                <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-1 h-6 rounded-full bg-purple-400 shrink-0" />
                    <p className="text-base font-bold text-purple-300 flex-1 leading-tight">
                      🎲 สุ่ม 1 จาก POOL
                    </p>
                    {randomCount > 0 && (
                      <span className="text-xs bg-purple-500/20 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-semibold">
                        pool {randomCount} รายการ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3 ml-3">
                    เพิ่ม action เข้า pool — ระบบจะสุ่มเลือก 1 รายการทุกครั้งที่ trigger
                    {randomCount >= 2 && (
                      <span className="text-purple-300 ml-1 font-medium">
                        (แต่ละรายการมีโอกาส {Math.round(100 / randomCount)}%)
                      </span>
                    )}
                  </p>
                  <ActionChipPicker
                    actions={actions}
                    selectedIds={form.randomActionIds}
                    onToggle={id => toggleActionId(id, 'randomActionIds')}
                    accent="purple"
                    extraInfo={() => randomCount >= 2 ? `~${Math.round(100 / randomCount)}%` : ''}
                  />
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
      <div className="bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-[#2d3550] rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Event' : 'สร้าง Event ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body: sidebar ซ้าย + content ขวา */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar ซ้าย */}
          <div className="w-36 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col pt-2">
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
                      : 'border-transparent text-gray-400 hover:bg-[#ededeb] dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200'
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
              <div className="mt-auto mx-2 mb-3 p-2 rounded-lg bg-[#ededeb] dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 space-y-1">
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
        <div className="flex gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium transition-colors">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-[#ededeb] dark:bg-gray-800 hover:bg-[#e5e5e3] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded py-2 text-sm transition-colors">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OBS command executor (one-shot, keeps socket open until return fires) ────
// onStatus(msg) — callback ส่ง feedback กลับไป UI (optional)
function fireObsCommands(host, port, action, onStatus, sourceMap = {}) {
  const notify = (msg) => { if (onStatus) onStatus(msg); };

  let ws;
  try { ws = new WebSocket(`ws://${host}:${port}`); }
  catch { notify('❌ เชื่อมต่อ OBS ไม่ได้ (WebSocket error)'); return; }

  let closeTimer = null;
  const scheduleClose = (delayMs) => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { try { ws.close(); } catch {} }, delayMs);
  };

  const connectTimeout = setTimeout(() => {
    notify('❌ OBS ไม่ตอบสนอง — ตรวจสอบว่า OBS เปิดอยู่และ WebSocket Server เปิดใช้งาน');
    try { ws.close(); } catch {}
  }, 5000);

  // pending[requestId] = { type, meta } — meta พก context เพิ่มเติมสำหรับ response handler
  const pending = {};

  const send = (requestType, requestData = {}, meta = {}) => {
    if (ws.readyState !== 1) return;
    const requestId = `${requestType}_${Date.now()}_${Math.random()}`;
    pending[requestId] = { type: requestType, meta };
    ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
    return requestId;
  };

  ws.onmessage = (evt) => {
    let msg; try { msg = JSON.parse(evt.data); } catch { return; }

    if (msg.op === 0) {
      clearTimeout(connectTimeout);
      ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1 } }));

    } else if (msg.op === 2) {
      notify('🔌 เชื่อมต่อ OBS สำเร็จ กำลังส่งคำสั่ง...');
      const hasReturn   = !!(action.obsSceneReturn || action.obsSourceReturn);
      const returnDelay = (action.displayDuration || 5) * 1000;

      const obsScene  = action.obsScene?.trim()  || '';
      const obsSource = action.obsSource?.trim() || '';
      const hasScene  = action.types?.includes('switch_obs_scene')    && obsScene;
      const hasSource = action.types?.includes('activate_obs_source') && obsSource;

      // Switch scene
      if (hasScene) {
        if (action.obsSceneReturn) {
          // ต้องรู้ current scene ก่อนเพื่อกลับ
          send('GetCurrentProgramScene', {}, { purpose: 'scene_return' });
        } else {
          send('SetCurrentProgramScene', { sceneName: obsScene });
          notify(`✅ สลับไป Scene "${obsScene}"`);
        }
      }

      // Activate source
      if (hasSource) {
        if (obsScene) {
          // รู้ scene อยู่แล้ว → ดึง item list ได้เลย (ส่ง sceneName ใน meta ด้วย)
          send('GetSceneItemList', { sceneName: obsScene }, { purpose: 'source', sceneName: obsScene });
        } else {
          // ไม่รู้ scene → ดึง current scene ก่อน (แยก purpose จาก scene_return)
          send('GetCurrentProgramScene', {}, { purpose: 'source_scene' });
        }
      }

      scheduleClose(hasReturn ? returnDelay + 3000 : 4000);

    } else if (msg.op === 7) {
      const reqId   = msg.d?.requestId || '';
      const entry   = pending[reqId] || {};
      const reqType = entry.type || '';
      const meta    = entry.meta || {};
      delete pending[reqId];

      const status = msg.d?.requestStatus;
      if (status && !status.result) {
        // GetSceneItemList ล้มเหลว (scene ไม่มีใน OBS หรือชื่อผิด) → ลอง sourceMap fallback ก่อน
        if (reqType === 'GetSceneItemList' && action.obsSource?.trim()) {
          const obsSource  = action.obsSource.trim();
          const srcLower   = obsSource.toLowerCase();
          const mapKey     = Object.keys(sourceMap).find(k => k === obsSource || k.toLowerCase() === srcLower);
          const locations  = mapKey ? sourceMap[mapKey] : [];
          if (locations.length) {
            const loc = locations[0];
            notify(`▶ เปิด Source "${obsSource}" ใน Scene "${loc.sceneName}" (พื้นหลัง)${action.obsSourceReturn ? ` · ปิดใน ${action.displayDuration}s` : ''}`);
            send('SetSceneItemEnabled', { sceneName: loc.sceneName, sceneItemId: loc.sceneItemId, sceneItemEnabled: true });
            if (action.obsSourceReturn) {
              const dur = (action.displayDuration || 5) * 1000;
              setTimeout(() => send('SetSceneItemEnabled', { sceneName: loc.sceneName, sceneItemId: loc.sceneItemId, sceneItemEnabled: false }), dur);
            }
            return;
          }
        }
        notify(`❌ OBS ตอบกลับ error: ${status.comment || 'unknown error'} (code ${status.code})`);
        return;
      }

      if (reqType === 'GetCurrentProgramScene') {
        const current = msg.d.responseData?.currentProgramSceneName;
        if (!current) return;

        if (meta.purpose === 'scene_return') {
          // สลับไป target scene แล้วกลับมา current หลัง displayDuration
          const obsScene = action.obsScene.trim();
          send('SetCurrentProgramScene', { sceneName: obsScene });
          notify(`✅ สลับไป "${obsScene}" · กลับ "${current}" ใน ${action.displayDuration}s`);
          const dur = (action.displayDuration || 5) * 1000;
          setTimeout(() => send('SetCurrentProgramScene', { sceneName: current }), dur);
        }

        if (meta.purpose === 'source_scene') {
          // ได้ current scene แล้ว → ดึง item list โดยส่ง sceneName ไปใน meta
          send('GetSceneItemList', { sceneName: current }, { purpose: 'source', sceneName: current });
        }

      } else if (reqType === 'GetSceneItemList') {
        const items      = msg.d.responseData?.sceneItems || [];
        const obsSource  = action.obsSource.trim();
        const srcLower   = obsSource.toLowerCase();
        const item       = items.find(i =>
          i.sourceName === obsSource || i.sourceName?.toLowerCase() === srcLower
        );
        if (!item) {
          // ไม่พบใน scene นี้ — ดึงจาก sourceMap (สร้างตอน connect OBS)
          const srcLowerFb = obsSource.toLowerCase();
          const mapKey = Object.keys(sourceMap).find(k => k === obsSource || k.toLowerCase() === srcLowerFb);
          const locations = mapKey ? sourceMap[mapKey] : [];
          if (!locations.length) {
            const names = items.map(i => `"${i.sourceName}"`).join(', ');
            notify(`❌ ไม่พบ Source "${obsSource}" ในทุก Scene\nScene นี้มี: ${names || '(ว่าง)'}`);
            return;
          }
          // ใช้ location แรกที่พบจาก Map (เล่นในพื้นหลัง ไม่ต้องอยู่ใน scene ปัจจุบัน)
          const loc = locations[0];
          notify(`▶ เปิด Source "${obsSource}" ใน Scene "${loc.sceneName}" (พื้นหลัง)${action.obsSourceReturn ? ` · ปิดใน ${action.displayDuration}s` : ''}`);
          send('SetSceneItemEnabled', { sceneName: loc.sceneName, sceneItemId: loc.sceneItemId, sceneItemEnabled: true });
          if (action.obsSourceReturn) {
            const dur = (action.displayDuration || 5) * 1000;
            setTimeout(() => send('SetSceneItemEnabled', { sceneName: loc.sceneName, sceneItemId: loc.sceneItemId, sceneItemEnabled: false }), dur);
          }
          return;
        }

        // sceneName มาจาก meta ที่ส่งไปกับ GetSceneItemList — ไม่พึ่ง responseData
        const sceneName   = meta.sceneName || '';
        const sceneItemId = item.sceneItemId;

        if (!sceneName) {
          notify('❌ ไม่ทราบชื่อ Scene สำหรับ SetSceneItemEnabled');
          return;
        }

        send('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: true });
        notify(`✅ เปิด Source "${item.sourceName}"${action.obsSourceReturn ? ` · ปิดใน ${action.displayDuration}s` : ''}`);

        if (action.obsSourceReturn) {
          const dur = (action.displayDuration || 5) * 1000;
          setTimeout(() => {
            send('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: false });
          }, dur);
        }
      }
    }
  };

  ws.onerror = () => {
    clearTimeout(connectTimeout);
    notify('❌ เชื่อมต่อ OBS ไม่ได้ — ตรวจสอบ host/port และ OBS WebSocket Server');
  };
}

// ── Preview / Test Modal ─────────────────────────────────────────────────────
function PreviewModal({ action, onClose, obsHost, obsPort, audioEnabled, obsSourceMap }) {
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
      configureTTS({ enabled: true, volume: Math.min(1, (action.volume ?? 100) / 100) });
      speak(text);
    }

    // OBS commands — fire and show real status via onStatus callback
    const hasObs = action.types?.includes('switch_obs_scene') || action.types?.includes('activate_obs_source');
    if (hasObs) {
      setObsMsg('🔌 กำลังส่งคำสั่ง OBS...');
      fireObsCommands(obsHost || 'localhost', obsPort || 4455, action, (msg) => setObsMsg(msg), obsSourceMap || {});
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
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ededeb] dark:bg-gray-800 overflow-hidden rounded-b-xl">
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
// ── Helper: สร้างคำอธิบายสั้นของ Action ──────────────────────────────────────
// ── actionDescParts — คืน array ของ {prefix, value, bold} สำหรับ render inline ──
// bold=true สำหรับค่าที่เป็น "source" (ไฟล์/ชื่อซอส/วิดีโอ/เสียง)
// bold=false สำหรับซีน/TTS/Alert (ข้อความทั่วไป)
function actionDescParts(a) {
  const parts = [];
  const t = a.types || [];
  if (t.includes('switch_obs_scene')    && a.obsScene)
    parts.push({ prefix: 'สลับซีน:', value: a.obsScene,   bold: false });
  if (t.includes('activate_obs_source') && a.obsSource)
    parts.push({ prefix: 'ซอร์ส:',   value: a.obsSource,  bold: true  });
  if (t.includes('show_picture')        && a.pictureUrl)
    parts.push({ prefix: 'รูป:',     value: a.pictureUrl.split('/').pop() || a.pictureUrl, bold: true });
  if (t.includes('play_video')          && a.videoUrl)
    parts.push({ prefix: 'วิดีโอ:',  value: a.videoUrl.split('/').pop()  || a.videoUrl,   bold: true });
  if (t.includes('play_audio')          && a.audioUrl)
    parts.push({ prefix: 'เสียง:',   value: a.audioUrl.split('/').pop()  || a.audioUrl,   bold: true });
  if (t.includes('read_tts')            && a.ttsText)
    parts.push({ prefix: 'TTS:',     value: a.ttsText.slice(0, 40) + (a.ttsText.length > 40 ? '…' : ''),    bold: false });
  if (t.includes('show_alert')          && a.alertText)
    parts.push({ prefix: 'Alert:',   value: a.alertText.slice(0, 40) + (a.alertText.length > 40 ? '…' : ''), bold: false });
  return parts;
}
// ── renderDesc — JSX inline สำหรับ 1 บรรทัด ──
function renderDesc(parts) {
  if (!parts.length) return null;
  return (
    <span className="text-[13px] text-gray-400 dark:text-slate-500 whitespace-nowrap">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-slate-700">·</span>}
          <span className="text-gray-400 dark:text-slate-500">{p.prefix} </span>
          {p.bold
            ? <strong className="font-semibold text-gray-600 dark:text-slate-300">{p.value}</strong>
            : <span className="text-gray-500 dark:text-slate-400">{p.value}</span>
          }
        </span>
      ))}
    </span>
  );
}

export default function ActionsPage({ theme, setTheme, user, authLoading, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const [actions,  setActions]  = useState([]);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  // Delete confirmation: { id, type:'action'|'event' } — กดครั้งแรก set, กดครั้งสองลบจริง
  const [confirmDelete, setConfirmDelete] = useState(null);
  const confirmTimerRef = useRef(null);
  const [tab,      setTab]      = useState('actions'); // actions | events | overlay | obs

  // ── Pagination ──
  const PAGE_SIZE_OPTIONS = [20, 50, 100, 0]; // 0 = ทั้งหมด
  const [pageSize,    setPageSize]    = useState(20);
  const [actionPage,  setActionPage]  = useState(0); // 0-indexed

  // ── Master enable/disable — master switch ของทั้งระบบ Actions ──
  const [systemEnabled, setSystemEnabled] = useState(true); // server-safe default — อ่าน localStorage ใน useEffect
  const [systemSaving,  setSystemSaving]  = useState(false);
  const toggleSystem = useCallback(() => {
    if (systemSaving) return;
    setSystemSaving(true);
    const next = !systemEnabled;
    try { localStorage.setItem('ttplus_actions_system', next ? '1' : '0'); } catch {}
    // Persist ไป Firestore — backend จะ pick up ใน 5 วิ
    api.post('/api/settings', { settings: { actionsEnabled: next } }).catch(() => {});
    setSystemEnabled(next);
    // dispatch หลัง setState — ไม่ใช่ใน state updater (ป้องกัน "cannot update StatusBar while rendering ActionsPage")
    window.dispatchEvent(new CustomEvent('ttplus-actions', { detail: { enabled: next } }));
    setTimeout(() => setSystemSaving(false), 600); // prevent rapid double-tap
  }, [systemSaving, systemEnabled]);

  // ── Resizable columns (Actions) ──
  const [colWidths, setColWidths] = useState(COL_DEFS.map(c => c.defaultW));

  const startColResize = useCallback((e, colIdx) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colIdx];
    const minW   = COL_DEFS[colIdx].minW;
    const onMove = (ev) => {
      const next = Math.max(minW, startW + ev.clientX - startX);
      setColWidths(prev => prev.map((w, i) => i === colIdx ? next : w));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      setColWidths(prev => {
        try { localStorage.setItem('ttplus_action_cols', JSON.stringify(prev)); } catch {}
        return prev;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, [colWidths]);

  // ── Resizable columns (Events) ──
  const [evtColWidths, setEvtColWidths] = useState(() => {
    try {
      const s = localStorage.getItem('ttplus_evt_cols');
      if (s) { const p = JSON.parse(s); if (p.length === EVT_COL_DEFS.length) return p; }
    } catch {}
    return EVT_COL_DEFS.map(c => c.defaultW);
  });

  const startEvtColResize = useCallback((e, colIdx) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = evtColWidths[colIdx];
    const minW   = EVT_COL_DEFS[colIdx].minW;
    const onMove = (ev) => {
      const next = Math.max(minW, startW + ev.clientX - startX);
      setEvtColWidths(prev => prev.map((w, i) => i === colIdx ? next : w));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      setEvtColWidths(prev => {
        try { localStorage.setItem('ttplus_evt_cols', JSON.stringify(prev)); } catch {}
        return prev;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, [evtColWidths]);

  // Modals
  const [actionModal,   setActionModal]  = useState(null); // null | { data }
  const [eventModal,    setEventModal]   = useState(null);
  const [previewAction, setPreviewAction] = useState(null); // action being previewed

  // OBS settings
  const [obsHost,     setObsHost]     = useState('localhost');
  const [obsPort,     setObsPort]     = useState(4455);
  const [obsPassword, setObsPassword] = useState('');
  const [obsStatus,        setObsStatus]        = useState('ยังไม่เชื่อม'); // ยังไม่เชื่อม / กำลังเชื่อม / เชื่อมแล้ว / error
  const [socketConnected, setSocketConnected]  = useState(false); // Socket.IO connection status
  const obsWsRef      = useRef(null);
  // คิว OBS: identity key (scene__source) → { isPlaying, items[] }
  const obsQueueRef   = useRef({});
  // enqueue function — set โดย obs_action useEffect ให้ firePreview เรียกได้
  const obsEnqueueRef = useRef(null);
  // ── Queue settings (global) ──────────────────────────────────────────────
  const obsGapRef      = useRef(300);  // หน่วง ms ระหว่าง action (global)
  const obsMaxQueueRef = useRef(100);  // จำนวน items สูงสุดใน queue รวมทุก key
  const [obsGap,       setObsGap]       = useState(300);
  const [obsMaxQueue,  setObsMaxQueue]  = useState(100);
  const [queueDisplay, setQueueDisplay] = useState([]); // snapshot สำหรับ UI

  // ── Right panel (OBS Queue Monitor) resize ──────────────────────────────
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const rightPanelWidthRef = useRef(280);
  // ป้องกัน firePreview ยิง API ซ้ำขณะกำลัง fire อยู่ (per action id)
  const firingSetRef  = useRef(new Set());

  // ── OBS Source Map — สร้างตอน connect ครั้งแรก ──────────────────────────
  // { sourceName: [{ sceneName, sceneItemId }, ...], ... }
  const [obsSourceMap,  setObsSourceMap]  = useState({});
  const [obsScanStatus, setObsScanStatus] = useState('');

  // hostArg/portArg — ใช้เมื่อเรียกก่อน state จะอัปเดต (เช่น ทันทีหลัง loadData)
  const scanObsSources = useCallback((hostArg, portArg) => {
    const host = hostArg || obsHost || 'localhost';
    const port = portArg || obsPort || 4455;
    setObsScanStatus('🔍 กำลัง scan...');
    let ws;
    try { ws = new WebSocket(`ws://${host}:${port}`); }
    catch { setObsScanStatus('❌ เชื่อม OBS ไม่ได้'); return; }

    const pending = {};
    const send = (type, data = {}, meta = {}) => {
      if (ws.readyState !== 1) return;
      const id = `${type}_${Date.now()}_${Math.random()}`;
      pending[id] = { type, meta };
      ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: data } }));
    };

    const map = {};          // sourceName → [{ sceneName, sceneItemId }]
    let totalScenes   = 0;
    let doneScenesCount = 0;

    const finish = () => {
      setObsSourceMap(map);
      const srcCount = Object.keys(map).length;
      setObsScanStatus(`✅ ${srcCount} source จาก ${totalScenes} scene`);
      try { localStorage.setItem('ttplus_obs_was_connected', '1'); } catch {}
      try { ws.close(); } catch {}
    };

    const scanTimeout = setTimeout(() => {
      setObsScanStatus('❌ Scan timeout — OBS ไม่ตอบสนอง');
      try { localStorage.removeItem('ttplus_obs_was_connected'); } catch {}
      try { ws.close(); } catch {}
    }, 15000);

    ws.onmessage = (evt) => {
      let msg; try { msg = JSON.parse(evt.data); } catch { return; }

      if (msg.op === 0) {
        ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1 } }));
      } else if (msg.op === 2) {
        send('GetSceneList', {});
      } else if (msg.op === 7) {
        const id    = msg.d?.requestId || '';
        const entry = pending[id] || {};
        delete pending[id];
        if (!msg.d?.requestStatus?.result) return;

        if (entry.type === 'GetSceneList') {
          const scenes = msg.d.responseData?.scenes || [];
          totalScenes = scenes.length;
          if (totalScenes === 0) { clearTimeout(scanTimeout); finish(); return; }
          for (const s of scenes) send('GetSceneItemList', { sceneName: s.sceneName }, { sceneName: s.sceneName });

        } else if (entry.type === 'GetSceneItemList') {
          const sceneName = entry.meta?.sceneName || '';
          const items     = msg.d.responseData?.sceneItems || [];
          for (const item of items) {
            if (!item.sourceName) continue;
            if (!map[item.sourceName]) map[item.sourceName] = [];
            map[item.sourceName].push({ sceneName, sceneItemId: item.sceneItemId });
          }
          doneScenesCount++;
          if (doneScenesCount >= totalScenes) { clearTimeout(scanTimeout); finish(); }
        }
      }
    };
    ws.onerror = () => {
      clearTimeout(scanTimeout);
      setObsScanStatus('❌ Scan ล้มเหลว');
      try { localStorage.removeItem('ttplus_obs_was_connected'); } catch {}
    };
  }, [obsHost, obsPort]);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading,   setLoginLoading]   = useState(false);

  // Dynamic gift catalog (รวบรวมจาก TikTok live session จริง)
  const [dynamicGifts, setDynamicGifts] = useState([]);

  // Gift simulation panel
  const [simGiftName,  setSimGiftName]  = useState('');
  const [simGiftCoins, setSimGiftCoins] = useState(1);   // diamond ของ gift ที่เลือก (row 1)
  const [simulating,   setSimulating]   = useState(false);
  const simulatingRef = useRef(false); // guard แบบ sync — ป้องกัน double-fire ก่อน React re-render

  const importRef = useRef(null);

  // ── ฟังเสียงทดสอบ TTS ใน Browser (default OFF) ──
  const [audioEnabled, setAudioEnabled] = useState(false);
  // ref เพื่อให้ socket handler อ่านค่าล่าสุดได้เสมอ (ไม่ติด stale closure)
  const audioEnabledRef = useRef(false);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  // ── Active action indicator — track ว่า action ไหนกำลัง fire audio/TTS อยู่ ──
  const [activeActionIds, setActiveActionIds] = useState(new Set());
  // ใช้ window CustomEvent เป็น bus เพื่อหลีกเลี่ยง stale closure ใน socket handler
  useEffect(() => {
    const timers = {};
    const handler = (e) => {
      const { actionId, duration } = e.detail || {};
      if (!actionId) return;
      setActiveActionIds(prev => new Set([...prev, actionId]));
      clearTimeout(timers[actionId]);
      timers[actionId] = setTimeout(() => {
        setActiveActionIds(prev => { const s = new Set(prev); s.delete(actionId); return s; });
      }, duration || 7000);
    };
    window.addEventListener('ttplus-action-active', handler);
    return () => {
      window.removeEventListener('ttplus-action-active', handler);
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // ── Widget CID (numeric ID สำหรับ Overlay URLs) ──
  const [widgetCid, setWidgetCid] = useState('');

  // ── Overlay Queue sizes (per screen) ──
  const [maxQueueSizes, setMaxQueueSizes] = useState([10, 10]);

  // ── Inline name editing ──
  const [inlineEdit,    setInlineEdit]    = useState(null); // { id, name } | null
  const [inlineDurId,   setInlineDurId]   = useState(null); // id ของ action ที่กำลังแก้ dur
  const [inlineDurVal,  setInlineDurVal]  = useState('');   // ค่าที่พิมพ์ใน input
  const inlineInputRef = useRef(null);
  const inlineDurRef   = useRef(null);

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [aRes, eRes, obsRes, giftRes, settingsRes] = await Promise.all([
        api.get('/api/actions'),
        api.get('/api/actions/events'),
        api.get('/api/actions/obs-settings'),
        api.get('/api/actions/gift-catalog').catch(() => ({ data: { gifts: [] } })),
        api.get('/api/settings').catch(() => ({ data: { settings: {} } })),
      ]);
      setActions(aRes.data.actions || []);
      setEvents(eRes.data.events   || []);
      const obs = obsRes.data.settings || {};
      const h = obs.host || 'localhost';
      const p = obs.port || 4455;
      setObsHost(h);
      setObsPort(p);
      setObsPassword(obs.password || '');
      setDynamicGifts(giftRes.data.gifts || []);
      // โหลด actionsEnabled — localStorage ชนะ Firestore เสมอ (คือค่าที่ user toggle ไว้ล่าสุด)
      // ใช้ Firestore เป็น fallback เฉพาะเมื่อ localStorage ไม่มีค่า (login ครั้งแรก / เปลี่ยนเบราว์เซอร์)
      const srv = settingsRes.data.settings || {};
      if (typeof srv.actionsEnabled === 'boolean') {
        try {
          const localVal = localStorage.getItem('ttplus_actions_system');
          const finalEnabled = localVal !== null ? (localVal !== '0') : srv.actionsEnabled;
          setSystemEnabled(finalEnabled);
          localStorage.setItem('ttplus_actions_system', finalEnabled ? '1' : '0');
          window.dispatchEvent(new CustomEvent('ttplus-actions', { detail: { enabled: finalEnabled } }));
        } catch {
          setSystemEnabled(srv.actionsEnabled);
          window.dispatchEvent(new CustomEvent('ttplus-actions', { detail: { enabled: srv.actionsEnabled } }));
        }
      }
      // Auto-scan เฉพาะเมื่อเคย connect OBS สำเร็จมาก่อน
      // ถ้า OBS ไม่ได้รันแล้ว flag จะถูกลบใน onerror → ครั้งหน้าไม่ auto-scan อีก
      if (localStorage.getItem('ttplus_obs_was_connected') === '1') {
        scanObsSources(h, p);
      }
    } catch (err) {
      toast.error('โหลดข้อมูลไม่ได้');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // อ่าน systemEnabled จาก localStorage หลัง hydration (ป้องกัน hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ttplus_actions_system');
      if (saved !== null) setSystemEnabled(saved !== '0');
    } catch {}
  }, []);

  // ── Fetch Widget CID (ใช้ cache เหมือน widgets.js) ──
  useEffect(() => {
    if (!user) return;
    const cacheKey = `ttplus_cid_${user.uid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && /^\d{4,8}$/.test(cached)) { setWidgetCid(cached); return; }
    } catch {}
    api.post('/api/widget-token')
      .then(res => {
        const cid = res.data?.cid;
        if (typeof cid === 'string' && /^\d{4,8}$/.test(cid)) {
          setWidgetCid(cid);
          try { localStorage.setItem(cacheKey, cid); } catch {}
        }
      })
      .catch(() => {}); // fail silently — overlay URLs fallback to vjId
  }, [user]);

  // ── อ่าน localStorage หลัง mount → dispatch ทันทีเพื่อ sync StatusBar ──
  // dispatch ทุกกรณี (ไม่ใช่แค่ '0') เพราะ StatusBar เริ่มต้นเป็น false รอค่าจากนี้
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ttplus_actions_system');
      if (saved !== null) {
        const enabled = saved !== '0';
        setSystemEnabled(enabled);
        window.dispatchEvent(new CustomEvent('ttplus-actions', { detail: { enabled } }));
      }
      // null → รอ API call ใน loadData() ที่จะ dispatch และ set localStorage ให้ถูกต้อง
    } catch {}
    try {
      if (localStorage.getItem('ttplus_actions_audio') === '1') setAudioEnabled(true);
    } catch {}
    try {
      const s = localStorage.getItem('ttplus_action_cols');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length === COL_DEFS.length) setColWidths(parsed);
      }
    } catch {}
  }, []);

  // ── Cleanup confirmDelete timer เมื่อ unmount ──
  useEffect(() => () => { clearTimeout(confirmTimerRef.current); }, []);

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

  // ── Fire Action Preview (ไม่เปิด popup — ส่งไป overlay + ยิง audio/TTS/OBS โดยตรง) ──
  const firePreview = useCallback(async (a) => {
    if (firingSetRef.current.has(a.id)) return; // กำลัง fire อยู่ — ไม่ยิงซ้ำ
    firingSetRef.current.add(a.id);
    // ใช้ action id เป็น toast key — กดซ้ำจะทับ toast เดิมแทนที่จะซ้อน
    const tid = `fire_${a.id}`;
    toast.loading(`▶ กำลังยิง "${a.name}"...`, { id: tid });
    try {
      // 1) Queue to overlay widget
      await api.post(`/api/actions/${a.id}/fire`);

      // 2) Audio — เล่นในเบราว์เซอร์ทันที
      if (a.types?.includes('play_audio') && a.audioUrl && audioEnabled) {
        try { new Audio(a.audioUrl).play(); } catch {}
      }

      // 3) TTS — อ่านทันที
      if (audioEnabled && a.types?.includes('read_tts') && a.ttsText) {
        const text = a.ttsText
          .replace(/\{username\}/gi, 'ทดสอบ')
          .replace(/\{giftname\}/gi, 'Rose')
          .replace(/\{coins\}/gi, '100');
        // enabled: true เพราะ audioEnabled คือ gate ของ actions page อยู่แล้ว
        configureTTS({ enabled: true, volume: Math.min(1, (a.volume ?? 100) / 100) });
        speak(text);
      }

      // Audio indicator (manual fire)
      const hasAudioType = a.types?.some(t => ['read_tts','play_audio'].includes(t));
      if (audioEnabled && hasAudioType) {
        const dur = ((a.displayDuration ?? 5) + 2) * 1000;
        window.dispatchEvent(new CustomEvent('ttplus-audio-tab', {
          detail: { tab: 'actions', active: true, duration: dur },
        }));
        // per-action indicator
        window.dispatchEvent(new CustomEvent('ttplus-action-active', {
          detail: { actionId: a.id, duration: dur },
        }));
      }

      // OBS: backend emitToUser → socket 'obs_action' → handleObsAction → enqueue
      // ห้ามเรียก obsEnqueueRef โดยตรงที่นี่ — จะยิง OBS 2 ครั้ง (socket path + direct path)

      // Summary
      const parts = [];
      if (a.types?.includes('show_picture') || a.types?.includes('play_video') || a.types?.includes('show_alert')) parts.push('Overlay');
      if (a.types?.includes('play_audio'))          parts.push('เสียง');
      if (a.types?.includes('read_tts'))            parts.push('TTS');
      if (a.types?.includes('switch_obs_scene'))    parts.push(`Scene: ${a.obsScene}`);
      if (a.types?.includes('activate_obs_source')) parts.push(`Source: ${a.obsSource}`);

      toast.success(`✅ ${a.name} → ${parts.join(' · ') || 'ส่งแล้ว'}`, { id: tid, duration: 3000 });
    } catch (err) {
      toast.error('ยิงไม่สำเร็จ: ' + (err.response?.data?.error || err.message), { id: tid });
    } finally {
      firingSetRef.current.delete(a.id);
    }
  }, [audioEnabled]);

  // ── Duplicate Action — ถามยืนยัน → clone ใส่ใต้ต้นฉบับ ──
  const duplicateAction = useCallback(async (a) => {
    // Toast ยืนยัน (ใช้ 2 toast: question + dismiss)
    const confirmed = await new Promise((resolve) => {
      const toastId = toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Duplicate &ldquo;{a.name}&rdquo;?</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              สร้าง Action ใหม่พร้อมชื่อ (duplicate N) ใต้บรรทัดนี้
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { toast.dismiss(t.id); resolve(true); }}
                style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ✅ ใช่ Duplicate เลย
              </button>
              <button
                onClick={() => { toast.dismiss(t.id); resolve(false); }}
                style={{ flex: 0, background: '#1e2638', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                ยกเลิก
              </button>
            </div>
          </div>
        ),
        { duration: 10000, style: { background: '#1a1f30', border: '1px solid #334155', color: '#e2e8f0', minWidth: 280 } }
      );
    });

    if (!confirmed) return;

    // คำนวณ duplicate number
    const baseName = a.name.replace(/\s*\(duplicate \d+\)$/, '');
    const existing = actions.filter(x => x.name.startsWith(`${baseName} (duplicate `));
    const nextNum  = existing.length + 1;
    const newName  = `${baseName} (duplicate ${nextNum})`;

    try {
      const { id: _id, ...rest } = a;
      const res = await api.post('/api/actions', { ...rest, name: newName });
      const newAction = res.data.action || { ...rest, name: newName, id: res.data.id };

      // แทรกใต้ต้นฉบับใน local state
      setActions(prev => {
        const idx = prev.findIndex(x => x.id === a.id);
        if (idx === -1) return [...prev, newAction];
        const next = [...prev];
        next.splice(idx + 1, 0, newAction);
        return next;
      });
      toast.success(`✅ Duplicate แล้ว: "${newName}"`);
    } catch (err) {
      toast.error('Duplicate ไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
    }
  }, [actions]);

  // ── Inline name save ──
  // patch field เดียว — optimistic update + rollback ถ้า error
  const patchAction = useCallback(async (id, patch) => {
    const prev = actions.find(a => a.id === id);
    if (!prev) return;
    setActions(all => all.map(a => a.id === id ? { ...a, ...patch } : a));
    try {
      await api.put(`/api/actions/${id}`, { ...prev, ...patch });
    } catch (err) {
      setActions(all => all.map(a => a.id === id ? { ...a, ...prev } : a));
      toast.error('บันทึกไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
    }
  }, [actions]);

  const saveInlineName = useCallback(async (id, newName) => {
    const trimmed = newName.trim();
    setInlineEdit(null);
    if (!trimmed) return; // ถ้า blank ไม่ save
    const prev = actions.find(a => a.id === id);
    if (!prev || prev.name === trimmed) return; // ไม่เปลี่ยน
    setActions(all => all.map(a => a.id === id ? { ...a, name: trimmed } : a));
    try {
      await api.put(`/api/actions/${id}`, { ...prev, name: trimmed });
    } catch (err) {
      // rollback
      setActions(all => all.map(a => a.id === id ? { ...a, name: prev.name } : a));
      toast.error('แก้ชื่อไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
    }
  }, [actions]);

  // ── Duplicate Event ──
  const duplicateEvent = useCallback(async (ev) => {
    const confirmed = await new Promise((resolve) => {
      toast(
        (t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Duplicate Event นี้?</p>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>สร้าง Event ใหม่เหมือนกันทุกอย่าง</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { toast.dismiss(t.id); resolve(true); }}
                style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ✅ ใช่ Duplicate เลย
              </button>
              <button
                onClick={() => { toast.dismiss(t.id); resolve(false); }}
                style={{ flex: 0, background: '#1e2638', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                ยกเลิก
              </button>
            </div>
          </div>
        ),
        { duration: 10000, style: { background: '#1a1f30', border: '1px solid #334155', color: '#e2e8f0', minWidth: 280 } }
      );
    });
    if (!confirmed) return;
    try {
      const { id: _id, ...rest } = ev;
      await api.post('/api/actions/events', rest);
      toast.success('✅ Duplicate Event แล้ว');
      loadData();
    } catch (err) {
      toast.error('Duplicate ไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
    }
  }, [loadData]);

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

  // ── Gift Simulation ──
  // ── Simulate event state ──
  const [simType,    setSimType]    = useState('gift');   // gift|coins|follow|like|chat|share|join
  const [simCoins,   setSimCoins]   = useState(100);
  const [simComment, setSimComment] = useState('');
  const [simLikes,   setSimLikes]   = useState(50);
  const [simResult,  setSimResult]  = useState(null); // { matched, type, payload }

  // simulateEvent — 'coins' tab ส่งเป็น type:gift+diamondCount, 'gift' tab ส่งด้วยชื่อ
  const simulateEvent = useCallback(async () => {
    if (simulatingRef.current) return;
    simulatingRef.current = true; // lock ทันที (sync) ก่อน React re-render
    setSimulating(true);
    setSimResult(null);
    try {
      // 'coins' tab → backend รับเป็น type:'gift' พร้อม diamondCount เท่านั้น
      const body = { type: simType === 'coins' ? 'gift' : simType, nickname: 'ทดสอบ' };
      if (simType === 'gift') {
        // เลือกของขวัญชิ้นนั้น — ใช้ diamond จาก catalog
        body.giftName     = simGiftName || '';
        body.diamondCount = simGiftCoins;
      }
      if (simType === 'coins') {
        // ระบุเหรียญโดยตรง — ไม่ผูก giftName
        body.diamondCount = simCoins;
      }
      if (simType === 'like')  body.likeCount = simLikes;
      if (simType === 'chat')  body.comment   = simComment || 'ทดสอบ';

      const res = await api.post('/api/actions/simulate-event', body);
      setSimResult(res.data);
    } catch (err) {
      toast.error('Simulate ไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
    } finally {
      simulatingRef.current = false;
      setSimulating(false);
    }
  }, [simType, simGiftName, simGiftCoins, simCoins, simComment, simLikes]);

  // ── OBS WebSocket ──
  const connectObs = useCallback(() => {
    if (obsWsRef.current) { obsWsRef.current.close(); }
    setObsStatus('กำลังเชื่อม...');
    try {
      const ws = new WebSocket(`ws://${obsHost}:${obsPort}`);
      obsWsRef.current = ws;
      ws.onopen = () => {
        setObsStatus('✅ เชื่อมแล้ว');
        // Scan ทุก Scene/Source หลัง connect สำเร็จ
        scanObsSources();
      };
      ws.onerror = () => setObsStatus('❌ เชื่อมไม่ได้ — เปิด OBS WebSocket Server ก่อน');
      ws.onclose = () => setObsStatus('ยังไม่เชื่อม');
    } catch { setObsStatus('❌ เชื่อมไม่ได้'); }
  }, [obsHost, obsPort, scanObsSources]);

  const saveObsSettings = useCallback(async () => {
    try {
      await api.post('/api/actions/obs-settings', { host: obsHost, port: obsPort, password: obsPassword });
      toast.success('บันทึก OBS settings แล้ว');
    } catch { toast.error('บันทึกไม่ได้'); }
  }, [obsHost, obsPort, obsPassword]);

  // ── OBS Direct Bridge: รับ obs_action จาก server ผ่าน Socket.IO ───────────
  // ทำงานตลอดเวลาไม่ว่าจะเปิดแถบไหน (เพราะ _app.js mount ทุกหน้าพร้อมกัน)
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    const queues = obsQueueRef.current;

    // นับ items รอทั้งหมดใน queue (ไม่นับ isPlaying)
    function totalQueueSize() {
      return Object.values(queues).reduce((sum, q) => sum + q.items.length, 0);
    }

    function processQueue(key) {
      const q = queues[key];
      if (!q || q.items.length === 0) {
        if (q) q.isPlaying = false;
        return;
      }
      q.isPlaying = true;
      const action = q.items.shift();
      const duration = (action.displayDuration ?? 5) * 1000;

      fireObsCommands(
        obsHost || 'localhost',
        obsPort || 4455,
        action,
        (msg) => {
          if (msg.startsWith('✅') || msg.startsWith('❌')) {
            toast(msg, { duration: 2500, icon: msg.startsWith('✅') ? undefined : '⚠️' });
          }
        },
        obsSourceMap,
      );
      setTimeout(() => processQueue(key), duration + obsGapRef.current);
    }

    // enqueue ใช้ได้จากทุกที่ผ่าน obsEnqueueRef
    const enqueue = (action) => {
      // ตรวจ global queue cap (นับเฉพาะ items ที่รอ ไม่นับที่กำลังเล่นอยู่)
      if (totalQueueSize() >= obsMaxQueueRef.current) {
        toast.error(`⛔ คิวเต็ม (สูงสุด ${obsMaxQueueRef.current})`, { id: 'queue-full', duration: 2000 });
        return;
      }
      const key = `${action.obsScene || ''}__${action.obsSource || ''}`;
      if (!queues[key]) queues[key] = { isPlaying: false, items: [] };
      queues[key].items.push(action);
      if (!queues[key].isPlaying) processQueue(key);
    };
    obsEnqueueRef.current = enqueue;

    const handleObsAction = (action) => {
      const hasObsType = action.types?.includes('switch_obs_scene') ||
                         action.types?.includes('activate_obs_source');
      const hasTts     = action.types?.includes('read_tts') && !!action.ttsText;
      const hasAudio   = action.types?.includes('play_audio') && !!action.audioUrl;

      // ── TTS: เล่นใน browser ของ user โดยตรง (ได้ยินผ่านลำโพง) ──
      // ทำงานแม้ tab ไม่ active — browser ยังรัน speechSynthesis/AudioContext ใน background ได้
      if (hasTts && audioEnabledRef.current) {
        const vol = Math.min(1, Math.max(0, (action.volume ?? 100) / 100));
        // enabled: true — audioEnabledRef คือ gate แล้ว ไม่ต้องให้ _cfg.enabled block
        configureTTS({ enabled: true, volume: vol });
        speak(action.ttsText);
      }

      // ── Audio indicator: แจ้ง Sidebar ว่า Actions tab กำลังมีเสียง ──
      if ((hasTts || hasAudio) && audioEnabledRef.current) {
        const dur = ((action.displayDuration ?? 5) + 2) * 1000; // +2s buffer
        window.dispatchEvent(new CustomEvent('ttplus-audio-tab', {
          detail: { tab: 'actions', active: true, duration: dur },
        }));
        // per-action indicator
        if (action.actionId) {
          window.dispatchEvent(new CustomEvent('ttplus-action-active', {
            detail: { actionId: action.actionId, duration: dur },
          }));
        }
      }

      if (!hasObsType) return;
      enqueue(action);
    };

    // ถอด listener เก่าทั้งหมดก่อน (ป้องกัน handler ซ้ำเมื่อ effect re-run
    // หรือ React StrictMode double-invoke) แล้วค่อย register ใหม่
    socket.off('obs_action');
    socket.on('obs_action', handleObsAction);

    // ── ติดตาม Socket.IO connection status ──────────────────────────────────
    setSocketConnected(socket.connected);
    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('obs_action');
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, obsHost, obsPort, obsSourceMap]);

  // ── Queue display: snapshot obsQueueRef ทุก 500ms → setQueueDisplay ──────
  useEffect(() => {
    const id = setInterval(() => {
      const queues = obsQueueRef.current;
      const snapshot = [];
      for (const [key, q] of Object.entries(queues)) {
        if (q.isPlaying) {
          snapshot.push({ key, name: '▶ กำลังเล่น…', playing: true, id: `${key}__playing` });
        }
        q.items.forEach((action, idx) => {
          snapshot.push({
            key,
            name: action.name || action.obsSource || action.obsScene || key,
            idx,
            id: `${key}__${idx}`,
          });
        });
      }
      setQueueDisplay(snapshot);
    }, 500);
    return () => clearInterval(id);
  }, []);

  // ── Queue helpers ────────────────────────────────────────────────────────
  const clearObsQueue = useCallback(() => {
    const queues = obsQueueRef.current;
    for (const key of Object.keys(queues)) {
      queues[key].items = [];
      // isPlaying ที่กำลังทำงานอยู่จะจบเองตาม setTimeout — ไม่บังคับหยุด
    }
    setQueueDisplay([]);
    toast.success('🗑 ล้างคิวแล้ว', { duration: 1500 });
  }, []);

  const skipQueueItem = useCallback((key, idx) => {
    const q = obsQueueRef.current[key];
    if (q) q.items.splice(idx, 1);
  }, []);

  // โหลดความกว้าง right panel จาก localStorage
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('ttplus_queue_w'));
      if (saved >= 180 && saved <= 600) {
        setRightPanelWidth(saved);
        rightPanelWidthRef.current = saved;
      }
    } catch {}
  }, []);

  // Drag handler สำหรับ resize right panel
  const handleRightDragStart = useCallback((e) => {
    e.preventDefault();
    const startX    = e.clientX;
    const startW    = rightPanelWidthRef.current;

    const onMove = (ev) => {
      const newW = Math.max(180, Math.min(600, startW + (startX - ev.clientX)));
      rightPanelWidthRef.current = newW;
      setRightPanelWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem('ttplus_queue_w', String(rightPanelWidthRef.current)); } catch {}
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // ── Import Backup (Actions & Events) ──
  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const toastId = toast.loading('กำลัง Import...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.actions && !data.events) throw new Error('ไฟล์ไม่ถูกต้อง (ไม่พบ actions/events)');
      await api.post('/api/actions/import', {
        actions: data.actions || [],
        events:  data.events  || [],
      });
      // Refetch จาก backend เพื่อให้ได้ Firestore document IDs ใหม่
      // (import สร้าง IDs ใหม่ทั้งหมด — ใช้ IDs จากไฟล์ backup ตรงๆ จะทำให้ edit/delete 404)
      const [aRes, eRes] = await Promise.all([
        api.get('/api/actions'),
        api.get('/api/actions/events'),
      ]);
      setActions(aRes.data.actions || []);
      setEvents(eRes.data.events   || []);
      toast.success(`⬆ Import Actions เรียบร้อย (${(data.actions||[]).length} actions, ${(data.events||[]).length} events)`, { id: toastId });
    } catch (err) { toast.error('Import ไม่สำเร็จ: ' + err.message, { id: toastId }); }
  }, []);

  // ── Export Backup (Actions & Events) ──
  const handleExport = useCallback(() => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tab: 'actions',
      actions,
      events,
    };
    const json     = JSON.stringify(data, null, 2);
    const filename = `ttplus-actions-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const uri      = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    const a        = document.createElement('a');
    a.href = uri; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    toast.success(`⬇ Export Actions เรียบร้อย (${actions.length} actions, ${events.length} events)`);
  }, [actions, events]);

  // ── Overlay URLs — widget อยู่บน frontend domain เดียวกัน ใช้ window.location.origin
  const vjId = user?.uid || '';
  const baseWidgetUrl = typeof window !== 'undefined' ? window.location.origin : `https://ttsam.app`;
  const overlayUrls = [1, 2].map((s, i) => {
    const base = widgetCid
      ? `${baseWidgetUrl}/widget/myactions?cid=${widgetCid}&screen=${s}`
      : `${baseWidgetUrl}/widget/myactions?vjId=${vjId}&screen=${s}`;
    const mq = maxQueueSizes[i] ?? 10;
    return mq !== 10 ? `${base}&maxq=${mq}` : base;
  });

  // ── Render ──
  const requireLogin = !authLoading && !user;

  return (
    <div
      className="flex overflow-hidden bg-[#fdf0f7] dark:bg-[#111520] text-gray-800 dark:text-slate-200"
      style={{ height: 'calc(100vh - 26px)' }}
    >
      <Sidebar
        theme={theme} setTheme={setTheme}
        activePage={activePage} setActivePage={setActivePage}
        collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar}
      />

      {/* ── Content area (main + right panel) ── */}
      <div
        className={clsx('flex flex-1 min-w-0', sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-48')}
      >
      {/* ── Main scrollable area ── */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">⚡ Actions and Events</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">ตั้งค่า Actions &amp; Events สำหรับ TikTok Live · <span className="text-orange-600 dark:text-yellow-500/70">ข้อมูลของขวัญยังไม่ครบในช่วงแรก — ใช้ "ส่งของขวัญ ≥ X coins" แทนการระบุชื่อของขวัญเฉพาะ เพื่อรองรับทุก gift</span></p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export / Import Backup */}
            {user && (<>
              <button
                onClick={() => importRef.current?.click()}
                title="Import Actions & Events จากไฟล์ Backup"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition bg-[#ededeb] dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-[#e5e5e3] dark:hover:bg-slate-700/80"
              >
                ⬆ Import
              </button>
              <button
                onClick={handleExport}
                title="Export Actions & Events เป็นไฟล์ Backup"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition bg-[#ededeb] dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-[#e5e5e3] dark:hover:bg-slate-700/80"
              >
                ⬇ Export
              </button>
            </>)}
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
                  : 'bg-[#ededeb] dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:text-slate-400'
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

        {/* ── MASTER SYSTEM TOGGLE — เหนือ tab bar ── */}
        {user && (
          <div className={clsx(
            'flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-colors mb-3',
            systemEnabled
              ? 'bg-green-950/25 border-green-800/40'
              : 'bg-red-950/25 border-red-900/40'
          )}>
            {/* LED + status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={clsx(
                'w-2 h-2 rounded-full shrink-0 transition-colors',
                systemEnabled ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-red-500'
              )} />
              <p className={clsx('text-sm font-semibold', systemEnabled ? 'text-green-700 dark:text-green-300' : 'text-red-400')}>
                {systemEnabled ? 'ระบบ Actions — เปิดอยู่' : 'ระบบ Actions — ปิดอยู่'}
              </p>
              <span className="hidden sm:inline text-gray-400 dark:text-slate-500 text-xs">·</span>
              <span className="hidden sm:inline text-gray-500 dark:text-slate-400 text-xs">
                {systemEnabled ? 'Events trigger Actions ตามปกติ' : 'หยุด fire ทุก Action แล้ว — กด "เปิด" เพื่อเริ่มใหม่'}
              </span>
            </div>
            {/* Toggle button */}
            <button
              onClick={toggleSystem}
              disabled={systemSaving}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0',
                systemSaving ? 'opacity-50 cursor-not-allowed' :
                systemEnabled
                  ? 'bg-green-900/30 border-green-700/60 text-green-300 hover:bg-red-950/40 hover:border-red-800 hover:text-red-400'
                  : 'bg-red-900/30 border-red-800/60 text-red-300 hover:bg-green-950/40 hover:border-green-700 hover:text-green-400'
              )}>
              <div className={clsx(
                'w-7 h-3.5 rounded-full flex items-center transition-colors px-0.5',
                systemEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
              )}>
                <div className={clsx(
                  'w-2.5 h-2.5 rounded-full bg-white transition-transform',
                  systemEnabled ? 'translate-x-3.5' : 'translate-x-0'
                )} />
              </div>
              {systemEnabled ? 'ปิด' : 'เปิด'}
            </button>
          </div>
        )}

        {/* Tabs — scroll แนวนอนบนมือถือ */}
        <div className="flex gap-1 mb-5 bg-[#efefed] dark:bg-[#1a1f30] p-1 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'actions', label: '⚡ Actions', connected: socketConnected,             showGreen: false },
            { id: 'events',  label: '🔗 Events',  connected: socketConnected,             showGreen: false },
            { id: 'overlay', label: '📺 Overlay', connected: socketConnected,             showGreen: false },
            { id: 'obs',     label: '🎬 เชื่อมต่อ OBS', connected: obsStatus.includes('✅'),    showGreen: true  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0',
                tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100',
                // กรอบบอกสถานะการเชื่อมต่อ
                t.connected && t.showGreen  ? 'ring-2 ring-green-500' :
                !t.connected                ? 'ring-2 ring-red-500 animate-pulse' :
                                              ''
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-400 dark:text-slate-500 text-sm">
            <span className="animate-spin">⏳</span> กำลังโหลด...
          </div>
        )}

        {/* ── Tab: Actions ── */}
        {tab === 'actions' && (
          <div className="space-y-3">

            {/* ── Create Action button ── */}
            <div className="flex justify-end">
              <button
                onClick={() => systemEnabled && setActionModal({ data: null })}
                disabled={!systemEnabled}
                className={clsx(
                  'flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors',
                  systemEnabled
                    ? 'bg-brand-600 hover:bg-brand-500 text-white'
                    : 'bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                )}>
                + สร้าง Action
              </button>
            </div>

            {actions.length === 0 && !loading && (
              <div className="text-center py-14 text-gray-400 dark:text-slate-600 border border-dashed border-gray-300 dark:border-slate-700/40 rounded-xl">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-sm font-medium text-gray-400 dark:text-slate-500">ยังไม่มี Actions</p>
                <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">กดปุ่ม "+ สร้าง" เพื่อเริ่ม</p>
              </div>
            )}

            {/* Action cards + pagination bottom */}
            {(() => {
              const totalPages  = pageSize === 0 ? 1 : Math.ceil(actions.length / pageSize);
              const safePage    = Math.min(actionPage, Math.max(0, totalPages - 1));
              // เรียงตาม createdAt ล่าสุดก่อน แล้วค่อย slice หน้า
              const sorted      = [...actions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              const sliced      = pageSize === 0 ? sorted : sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);
              const disabled    = !systemEnabled;
              return (
                <>
                  {/* ── Column table with resizable headers ── */}
                  {(() => {
                    const gridTemplate = colWidths.map(w => `${w}px`).join(' ');
                    const cellBase = 'flex items-center overflow-hidden px-2';
                    return (
                    <div className="overflow-x-auto">
                    <div className="rounded-xl border border-gray-200 dark:border-[#252d42]" style={{ minWidth: colWidths.reduce((s,w) => s+w, 0) + 'px' }}>

                      {/* ── Header row ── */}
                      <div
                        className="grid border-b border-gray-200 dark:border-[#2a3347] bg-[#ededeb] dark:bg-[#131825] sticky top-0 z-10"
                        style={{ gridTemplateColumns: gridTemplate }}>
                        {COL_DEFS.map((col, ci) => (
                          <div key={col.id} className="relative flex items-center select-none">
                            <span className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate flex-1">
                              {col.label}
                            </span>
                            {/* drag handle — ไม่แสดงที่คอลัมน์สุดท้าย */}
                            {ci < COL_DEFS.length - 1 && (
                              <div
                                onMouseDown={(e) => startColResize(e, ci)}
                                className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize group z-20"
                                title="ลากเพื่อปรับความกว้าง">
                                <div className="w-px h-4 bg-gray-300 dark:bg-[#2a3347] group-hover:bg-brand-500 transition-colors" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* ── Data rows ── */}
                      {sliced.map((a, idx) => {
                        const typeIcons    = ACTION_TYPES.filter(def => (a.types || []).includes(def.id));
                        const isConfirmDel = confirmDelete?.id === a.id && confirmDelete?.type === 'action';
                        const descParts    = actionDescParts(a);
                        const isOdd        = idx % 2 === 1;
                        const isAudioActive = activeActionIds.has(a.id);
                        return (
                          <div
                            key={a.id}
                            className={clsx(
                              'grid border-b border-gray-200/70 dark:border-[#1e2638]/70 last:border-b-0 transition-all duration-300',
                              isOdd ? 'bg-white dark:bg-[#1a1f30]' : 'bg-[#f4f4f3] dark:bg-[#161b28]',
                              !a.enabled && 'opacity-50',
                              isAudioActive && 'bg-amber-50/60 dark:bg-amber-950/20'
                            )}
                            style={{
                              gridTemplateColumns: gridTemplate,
                              borderLeft: isAudioActive ? '3px solid #f59e0b' : '3px solid transparent',
                            }}>

                            {/* col: toggle */}
                            <div className={clsx(cellBase, 'justify-center')}>
                              <button
                                onClick={() => !disabled && toggleAction(a)}
                                disabled={disabled}
                                title={a.enabled ? 'ปิด Action นี้' : 'เปิด Action นี้'}
                                className={clsx(
                                  'shrink-0 w-9 h-5 rounded-full transition-colors flex items-center px-0.5',
                                  disabled ? 'cursor-not-allowed opacity-30 bg-gray-200 dark:bg-slate-700' :
                                  a.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
                                )}>
                                <div className={clsx('w-4 h-4 rounded-full bg-white transition-transform shadow-sm', a.enabled ? 'translate-x-4' : 'translate-x-0')} />
                              </button>
                            </div>

                            {/* col: fire + edit buttons */}
                            <div className={clsx(cellBase, 'justify-center gap-1')}>
                              <button
                                onClick={() => !disabled && firePreview(a)}
                                disabled={disabled}
                                title="ยิง Action ทันที (Overlay + เสียง + OBS)"
                                className={clsx(
                                  'text-xs px-2.5 py-1.5 rounded border font-bold transition-colors whitespace-nowrap',
                                  disabled ? 'opacity-25 cursor-not-allowed border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-600' :
                                  'border-brand-700/60 text-brand-400 hover:bg-brand-900/40 hover:border-brand-600'
                                )}>▶</button>
                              <button
                                onClick={() => !disabled && setActionModal({ data: { ...a } })}
                                disabled={disabled}
                                title="แก้ไข Action"
                                className={clsx(
                                  'text-xs px-2.5 py-1.5 rounded border transition-colors whitespace-nowrap',
                                  disabled ? 'opacity-25 cursor-not-allowed border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-600' :
                                  'border-gray-400 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-600 dark:hover:border-slate-400'
                                )}>✎</button>
                            </div>

                            {/* col: name — คลิกเพื่อแก้ไขชื่อ inline */}
                            <div className={clsx(cellBase, 'py-2 gap-2')}>
                              {/* pulsing dot เมื่อ action กำลัง fire audio/TTS */}
                              {isAudioActive && (
                                <span
                                  title="กำลังเล่นเสียง/TTS"
                                  style={{
                                    flexShrink: 0,
                                    display: 'inline-block',
                                    width: 8, height: 8,
                                    borderRadius: '50%',
                                    background: '#f59e0b',
                                    boxShadow: '0 0 6px #f59e0b',
                                    animation: 'ttplus-pulse 1s ease-in-out infinite',
                                  }}
                                />
                              )}
                              {inlineEdit?.id === a.id ? (
                                <input
                                  ref={inlineInputRef}
                                  autoFocus
                                  value={inlineEdit.name}
                                  onChange={e => setInlineEdit(prev => ({ ...prev, name: e.target.value }))}
                                  onBlur={() => saveInlineName(a.id, inlineEdit.name)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.target.blur(); }
                                    if (e.key === 'Escape') { setInlineEdit(null); }
                                  }}
                                  className="w-full bg-gray-200 dark:bg-[#0d1120] border border-brand-600 rounded px-2 py-0.5 text-[15px] font-semibold text-gray-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-500"
                                />
                              ) : (
                                <span
                                  onClick={() => !disabled && setInlineEdit({ id: a.id, name: a.name })}
                                  title="คลิกเพื่อแก้ไขชื่อ"
                                  className={clsx(
                                    'text-[15px] font-semibold text-gray-800 dark:text-slate-100 leading-snug truncate',
                                    !disabled && 'cursor-text hover:text-gray-800 dark:hover:text-white hover:underline decoration-dotted decoration-slate-500 underline-offset-2'
                                  )}
                                >{a.name}</span>
                              )}
                            </div>

                            {/* col: scr — คลิกสลับ 1↔2 */}
                            <div className={clsx(cellBase, 'justify-center')}>
                              <button
                                type="button"
                                disabled={disabled}
                                title="คลิกเพื่อสลับ Screen 1/2"
                                onClick={() => !disabled && patchAction(a.id, { overlayScreen: (a.overlayScreen ?? 1) === 1 ? 2 : 1 })}
                                className={clsx(
                                  'text-[12px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none whitespace-nowrap transition-colors',
                                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-125 active:scale-95',
                                  (a.overlayScreen ?? 1) === 1
                                    ? 'bg-brand-900/60 border-brand-700/60 text-brand-300'
                                    : 'bg-purple-900/60 border-purple-700/60 text-purple-300'
                                )}>
                                scr{a.overlayScreen ?? 1}
                              </button>
                            </div>

                            {/* col: dur — คลิกเพื่อพิมพ์วินาที */}
                            <div className={clsx(cellBase, 'justify-center')}>
                              {inlineDurId === a.id ? (
                                <input
                                  ref={inlineDurRef}
                                  autoFocus
                                  type="number"
                                  min="1"
                                  max="3600"
                                  value={inlineDurVal}
                                  onChange={e => setInlineDurVal(e.target.value)}
                                  onBlur={() => {
                                    const n = parseInt(inlineDurVal, 10);
                                    setInlineDurId(null);
                                    if (!isNaN(n) && n >= 1 && n !== (a.displayDuration ?? 5)) {
                                      patchAction(a.id, { displayDuration: n });
                                    }
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') e.target.blur();
                                    if (e.key === 'Escape') { setInlineDurId(null); }
                                  }}
                                  className="w-12 text-center text-[12px] font-mono bg-gray-200 dark:bg-[#0d1120] border border-amber-500 rounded px-1 py-0.5 text-amber-300 outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              ) : (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  title="คลิกเพื่อแก้ไขระยะเวลา"
                                  onClick={() => { if (!disabled) { setInlineDurId(a.id); setInlineDurVal(String(a.displayDuration ?? 5)); } }}
                                  className={clsx(
                                    'text-[12px] font-mono px-1.5 py-0.5 rounded border leading-none whitespace-nowrap transition-colors',
                                    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-125 active:scale-95',
                                    'bg-amber-950/50 border-amber-800/50 text-amber-400'
                                  )}>
                                  {a.displayDuration ?? 5}s
                                </button>
                              )}
                            </div>

                            {/* col: types */}
                            <div className={clsx(cellBase, 'gap-0.5 flex-wrap py-1')}>
                              {typeIcons.map(t => (
                                <span key={t.id} className="text-[15px] text-gray-500 dark:text-slate-400 leading-none" title={t.label}>{t.icon}</span>
                              ))}
                            </div>

                            {/* col: desc */}
                            <div className={clsx(cellBase, 'py-2')}>
                              {renderDesc(descParts)}
                            </div>

                            {/* col: buttons */}
                            <div className={clsx(cellBase, 'justify-end gap-1.5 pr-3 py-1.5')}>
                              {/* ⧉ Duplicate */}
                              <button
                                onClick={() => duplicateAction(a)}
                                title="Duplicate — สร้าง Action ใหม่จากอันนี้"
                                className="text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:border-slate-400 transition-colors whitespace-nowrap">
                                ⧉
                              </button>
                              {/* ✕ Delete */}
                              <button
                                onClick={() => !disabled && deleteAction(a.id)}
                                disabled={disabled}
                                title="ลบ"
                                className={clsx(
                                  'text-xs px-2.5 py-1.5 rounded border transition-colors whitespace-nowrap',
                                  disabled ? 'opacity-25 cursor-not-allowed border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-600' :
                                  isConfirmDel ? 'bg-red-600 border-red-600 text-white animate-pulse' :
                                  'border-gray-300 dark:border-slate-700 text-red-500 hover:border-red-700 hover:bg-red-950/30'
                                )}>
                                {isConfirmDel ? '?' : '✕'}
                              </button>
                            </div>

                          </div>
                        );
                      })}

                    </div>
                    </div>
                    );
                  })()}

                  {/* ── Pagination — bottom ── */}
                  {actions.length > 0 && (
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-400 dark:text-slate-500 pt-1">
                      {/* Page size selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 dark:text-slate-600">แสดง:</span>
                        {PAGE_SIZE_OPTIONS.map(s => (
                          <button key={s}
                            onClick={() => { setPageSize(s); setActionPage(0); }}
                            className={clsx(
                              'px-2 py-0.5 rounded border transition-colors',
                              pageSize === s
                                ? 'border-brand-600 bg-brand-900/40 text-brand-300'
                                : 'border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 hover:border-slate-500'
                            )}>
                            {s === 0 ? `ทั้งหมด${actions.length > 500 ? ' ⚠️' : ''}` : s}
                          </button>
                        ))}
                      </div>
                      {/* Page nav */}
                      {pageSize > 0 && (() => {
                        // สร้าง window ของหมายเลขหน้า: first, ...ellipsis, current±2, ...ellipsis, last
                        const pages = [];
                        const delta = 2; // หน้าซ้าย/ขวาของหน้าปัจจุบัน
                        for (let i = 0; i < totalPages; i++) {
                          if (
                            i === 0 ||
                            i === totalPages - 1 ||
                            (i >= safePage - delta && i <= safePage + delta)
                          ) {
                            pages.push(i);
                          }
                        }
                        // แทรก null เป็น ellipsis
                        const withEllipsis = [];
                        let prev = -1;
                        for (const p of pages) {
                          if (prev !== -1 && p - prev > 1) withEllipsis.push(null);
                          withEllipsis.push(p);
                          prev = p;
                        }
                        return (
                          <div className="flex items-center gap-1">
                            {/* ‹ */}
                            <button onClick={() => setActionPage(p => Math.max(0, p - 1))}
                              disabled={safePage === 0}
                              className="px-2 py-0.5 rounded border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30 hover:text-gray-800 dark:hover:text-white hover:border-gray-500 dark:hover:border-slate-500 transition-colors">
                              ‹
                            </button>
                            {/* Page numbers */}
                            {withEllipsis.map((p, i) =>
                              p === null ? (
                                <span key={`e${i}`} className="px-1 text-gray-400 dark:text-slate-600 select-none">…</span>
                              ) : (
                                <button key={p}
                                  onClick={() => setActionPage(p)}
                                  className={clsx(
                                    'min-w-[28px] px-1.5 py-0.5 rounded border font-medium transition-colors',
                                    p === safePage
                                      ? 'border-brand-600 bg-brand-900/50 text-brand-300'
                                      : 'border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-500 dark:hover:border-slate-500'
                                  )}>
                                  {p + 1}
                                </button>
                              )
                            )}
                            {/* › */}
                            <button onClick={() => setActionPage(p => Math.min(totalPages - 1, p + 1))}
                              disabled={safePage >= totalPages - 1}
                              className="px-2 py-0.5 rounded border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30 hover:text-gray-800 dark:hover:text-white hover:border-gray-500 dark:hover:border-slate-500 transition-colors">
                              ›
                            </button>
                            <span className="ml-1 text-gray-400 dark:text-slate-600">{actions.length} รายการ</span>
                          </div>
                        );
                      })()}
                      {pageSize === 0 && <span>{actions.length} รายการ</span>}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Event Simulation Panel ── */}
            {user && (() => {
              const SIM_TYPES = [
                { id: 'gift',    label: '🎁 Gift' },
                { id: 'coins',   label: '💎 Coins' },
                { id: 'follow',  label: '❤️ Follow' },
                { id: 'like',    label: '👍 Like' },
                { id: 'chat',    label: '💬 Chat/คำสั่ง' },
                { id: 'share',   label: '🔗 Share' },
                { id: 'join',    label: '🚪 Join' },
              ];
              const giftMap = new Map(TIKTOK_GIFTS.map(g => [g.name, { name: g.name, coins: g.coins, pictureUrl: '' }]));
              for (const dg of dynamicGifts) giftMap.set(dg.name, { name: dg.name, coins: dg.diamondCount, pictureUrl: dg.pictureUrl || '' });
              const giftList = Array.from(giftMap.values()).sort((a, b) => a.coins - b.coins);

              return (
                <div className="mt-4 rounded-xl border border-violet-700/40 bg-violet-950/20 p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧪</span>
                      <p className="text-sm font-semibold text-violet-300">จำลอง Event — ทดสอบ Events &amp; Actions</p>
                    </div>
                    <span className="text-[11px] text-violet-500/60">ไม่ต้อง Live จริง</span>
                  </div>

                  {/* Type selector */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {SIM_TYPES.map(t => (
                      <button key={t.id} onClick={() => { setSimType(t.id); setSimResult(null); }}
                        className={clsx(
                          'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                          simType === t.id
                            ? 'bg-violet-700/60 border-violet-500 text-violet-200'
                            : 'bg-white dark:bg-[#1a1f30] border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:text-slate-200 hover:border-slate-500'
                        )}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Inputs */}
                  {simType === 'gift' ? (
                    /* ── Gift: เลือก gift จาก catalog (specific_gift / gift_min_coins) ── */
                    <div className="mb-3 space-y-2">
                      <GiftPicker
                        value={simGiftName}
                        onChange={name => {
                          setSimGiftName(name);
                          const g = giftList.find(x => x.name === name);
                          setSimGiftCoins(g ? g.coins : 1);
                        }}
                        giftList={giftList}
                      />
                      <button onClick={() => simulateEvent()} disabled={simulating}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50">
                        {simulating ? <span className="inline-block animate-spin">⏳</span> : '▶'} ยิง{simGiftName ? ` "${simGiftName}"` : ' (Random)'}
                      </button>
                    </div>
                  ) : simType === 'coins' ? (
                    /* ── Coins: ระบุจำนวนเหรียญโดยตรง (gift_min_coins) ── */
                    <div className="flex gap-2 items-center mb-3">
                      <div className="relative flex-1">
                        <input type="number" min={1} value={simCoins} onChange={e => setSimCoins(Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="จำนวนเหรียญ"
                          className="w-full bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-sm rounded-lg px-3 py-2 pr-9 outline-none focus:border-violet-500 transition" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500">💎</span>
                      </div>
                      <button onClick={() => simulateEvent()} disabled={simulating}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50 shrink-0">
                        {simulating ? <span className="inline-block animate-spin">⏳</span> : '▶'} ยิง
                      </button>
                    </div>
                  ) : (
                    /* ── Non-gift types: แถวเดียว ── */
                    <div className="flex gap-2 mb-3">
                      {simType === 'like' && (
                        <div className="relative w-40">
                          <input type="number" min={1} value={simLikes} onChange={e => setSimLikes(Math.max(1, parseInt(e.target.value) || 1))}
                            placeholder="จำนวน Like"
                            className="w-full bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 transition" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500">likes</span>
                        </div>
                      )}
                      {simType === 'chat' && (
                        <input value={simComment} onChange={e => setSimComment(e.target.value)}
                          placeholder="พิมพ์ข้อความ เช่น !สุ่ม หรือ สวัสดี"
                          className="flex-1 bg-white dark:bg-[#1a1f30] border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 transition" />
                      )}
                      {['follow','share','join'].includes(simType) && (
                        <span className="flex-1 text-sm text-gray-400 dark:text-slate-500 py-2">
                          {simType === 'follow' ? 'ผู้ใช้ "ทดสอบ" กด Follow' : simType === 'share' ? 'ผู้ใช้ "ทดสอบ" กด Share' : 'ผู้ใช้ "ทดสอบ" เข้า Live'}
                        </span>
                      )}
                      <button onClick={() => simulateEvent()} disabled={simulating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50 shrink-0">
                        {simulating ? <span className="inline-block animate-spin">⏳</span> : '▶'} ยิง
                      </button>
                    </div>
                  )}

                  {/* Result log */}
                  {simResult && (
                    <div className={clsx(
                      'rounded-lg border p-3 text-xs',
                      simResult.matched?.length
                        ? 'border-green-700/50 bg-green-950/30'
                        : 'border-gray-300 dark:border-slate-700/50 bg-white dark:bg-[#1a1f30]'
                    )}>
                      {simResult.matched?.length ? (<>
                        <p className="font-semibold text-green-400 mb-2">
                          ✅ {simResult.matched.length} Event match
                        </p>
                        <div className="space-y-2">
                          {simResult.matched.map((m, i) => (
                            <div key={i} className="border-l-2 border-green-700/60 pl-2">
                              <span className="text-gray-500 dark:text-slate-400">Event </span>
                              <span className="text-green-700 dark:text-green-300 font-mono text-[10px]">{m.trigger}</span>
                              <span className="text-gray-400 dark:text-slate-500"> →</span>
                              {m.actions.map(a => (
                                <span key={a.id} className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-700/40 text-brand-300">{a.name}</span>
                              ))}
                              {m.randomPool.length > 0 && (
                                <span className="ml-1.5 text-amber-400">
                                  🎲 random จาก [{m.randomPool.map(a => a.name).join(', ')}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>) : (
                        <p className="text-gray-400 dark:text-slate-500">
                          🔍 ไม่มี Event ที่ match —{' '}
                          {simResult.type === 'gift'
                            ? (simResult.payload?.giftName
                                ? `ลองเพิ่ม Event "specific_gift = ${simResult.payload.giftName}" หรือ "gift_min_coins ≤ ${simResult.payload.diamondCount}"`
                                : `ลองเพิ่ม Event "gift_min_coins ≤ ${simResult.payload?.diamondCount}"`)
                            : `ลองเพิ่ม Event trigger "${simResult.type}"`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Tab: Events ── */}
        {tab === 'events' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-snug">
                Events คือตัว trigger ที่จะเรียก Actions เมื่อเกิดเหตุการณ์ใน Live
              </p>
              <button onClick={() => setEventModal({ data: null })}
                className="hidden md:flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors">
                + สร้าง Event
              </button>
            </div>

            {events.length === 0 && !loading && (
              <div className="text-center py-14 text-gray-400 dark:text-slate-600 border border-dashed border-gray-300 dark:border-slate-700/40 rounded-xl">
                <p className="text-4xl mb-3">🔗</p>
                <p className="text-sm font-medium text-gray-400 dark:text-slate-500">ยังไม่มี Events</p>
                <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">กดปุ่ม "+ สร้าง Event" เพื่อเริ่ม</p>
              </div>
            )}

            {events.length > 0 && (() => {
              // ── gift lookup map ───────────────────────────────────────────
              const giftMap2 = new Map(TIKTOK_GIFTS.map(g => [g.name, { pictureUrl: '' }]));
              for (const dg of dynamicGifts) giftMap2.set(dg.name, { pictureUrl: dg.pictureUrl || '' });

              // ── helpers ──────────────────────────────────────────────────
              const getEventTitle = (ev) => {
                if (ev.trigger === 'specific_gift') {
                  const gInfo = giftMap2.get(ev.specificGiftName || '');
                  return (
                    <span className="flex items-center gap-1.5 min-w-0">
                      {gInfo?.pictureUrl
                        ? <img src={gInfo.pictureUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" onError={e => { e.target.style.display='none'; }} />
                        : <span className="shrink-0 text-base leading-none">🎁</span>
                      }
                      <span className="font-semibold text-gray-800 dark:text-slate-100 truncate">{ev.specificGiftName || '?'}</span>
                    </span>
                  );
                }
                switch (ev.trigger) {
                  case 'gift_min_coins':   return `🪙 ≥${ev.minCoins ?? 0} coins`;
                  case 'command':          return `⌨️ "${ev.keyword || '?'}"`;
                  case 'likes':            return `👍 ${ev.likesCount ?? 0} likes`;
                  case 'join':             return '🚪 คนเข้า Live';
                  case 'follow':           return '❤️ กด Follow';
                  case 'share':            return '🔗 กด Share';
                  case 'subscribe':        return '⭐ Subscribe';
                  case 'chat':             return '💬 ทุก comment';
                  case 'subscriber_emote': return '😄 Subscriber Emote';
                  case 'fan_club_sticker': return '🏅 Fan Club Sticker';
                  case 'tiktok_shop':      return '🛒 TikTok Shop';
                  case 'first_activity':   return '👤 Activity แรก';
                  default:                 return ev.trigger;
                }
              };
              // tag บอก trigger type เฉพาะ trigger ที่มี param พิเศษ
              const getEventTypeTag = (ev) => {
                switch (ev.trigger) {
                  case 'specific_gift':    return 'Gift ชิ้นนั้นๆ';
                  case 'gift_min_coins':   return '🪙 Gift ≥ X coins';
                  case 'command':          return 'Keyword';
                  case 'likes':            return 'Like ครบ X';
                  default:                 return null;
                }
              };

              const gridTemplate = evtColWidths.map(w => `${w}px`).join(' ');
              const minTotalW = evtColWidths.reduce((s, w) => s + w, 0);
              const cellBase = 'flex items-center overflow-hidden px-2';

              return (
                <div className="overflow-x-auto">
                  <div className="rounded-xl border border-gray-200 dark:border-[#252d42]" style={{ minWidth: minTotalW + 'px' }}>

                    {/* ── Header ── */}
                    <div className="grid border-b border-gray-200 dark:border-[#2a3347] bg-[#ededeb] dark:bg-[#131825] sticky top-0 z-10"
                      style={{ gridTemplateColumns: gridTemplate }}>
                      {EVT_COL_DEFS.map((col, ci) => (
                        <div key={col.id} className="relative flex items-center select-none">
                          <span className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 truncate flex-1">
                            {col.label}
                          </span>
                          {ci < EVT_COL_DEFS.length - 1 && (
                            <div
                              onMouseDown={(e) => startEvtColResize(e, ci)}
                              className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize group z-20"
                              title="ลากเพื่อปรับความกว้าง">
                              <div className="w-px h-4 bg-gray-300 dark:bg-[#2a3347] group-hover:bg-brand-500 transition-colors" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* ── Rows ── */}
                    {[...events].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((ev, idx) => {
                      const linkedActions = actions.filter(a => ev.actionIds?.includes(a.id));
                      const randomActions = actions.filter(a => ev.randomActionIds?.includes(a.id));
                      const isConfirmDel  = confirmDelete?.id === ev.id && confirmDelete?.type === 'event';
                      const isOdd         = idx % 2 === 1;
                      const typeTag       = getEventTypeTag(ev);

                      return (
                        <div
                          key={ev.id}
                          className={clsx(
                            'grid border-b border-gray-200/70 dark:border-[#1e2638]/70 last:border-b-0 transition-colors',
                            isOdd ? 'bg-white dark:bg-[#1a1f30]' : 'bg-[#f4f4f3] dark:bg-[#161b28]',
                            !ev.enabled && 'opacity-50'
                          )}
                          style={{ gridTemplateColumns: gridTemplate }}>

                          {/* col: toggle */}
                          <div className={clsx(cellBase, 'justify-center')}>
                            <button
                              onClick={() => toggleEvent(ev)}
                              className={clsx(
                                'shrink-0 w-9 h-5 rounded-full transition-colors flex items-center px-0.5',
                                ev.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
                              )}>
                              <div className={clsx('w-4 h-4 rounded-full bg-white transition-transform shadow-sm', ev.enabled ? 'translate-x-4' : 'translate-x-0')} />
                            </button>
                          </div>

                          {/* col: condition / title */}
                          <div className={clsx(cellBase, 'py-2 gap-2 min-w-0')}>
                            <span className="flex items-center gap-1.5 min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100 leading-snug">
                              {getEventTitle(ev)}
                            </span>
                            {typeTag && (
                              <span className="shrink-0 text-[10px] bg-blue-50 dark:bg-[#1e2638] text-brand-400 px-1.5 py-0.5 rounded border border-brand-800/40 font-mono whitespace-nowrap">
                                {typeTag}
                              </span>
                            )}
                          </div>

                          {/* col: who */}
                          <div className={clsx(cellBase, 'py-1')}>
                            <span className="text-xs text-gray-400 dark:text-slate-500 truncate">
                              {ev.whoCanTrigger === 'specific_user'
                                ? <span className="text-brand-400 font-medium">@{ev.specificUser || '?'}</span>
                                : WHO_LIST.find(w => w.id === ev.whoCanTrigger)?.label || ev.whoCanTrigger
                              }
                            </span>
                          </div>

                          {/* col: linked actions */}
                          <div className={clsx(cellBase, 'py-1.5 gap-1 flex-wrap')}>
                            {linkedActions.map(a => (
                              <span key={a.id} className="text-[11px] bg-brand-900/40 border border-brand-700/50 text-brand-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                ✅ {a.name}
                              </span>
                            ))}
                            {randomActions.map(a => (
                              <span key={a.id} className="text-[11px] bg-purple-900/40 border border-purple-700/50 text-purple-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                🎲 {a.name}
                              </span>
                            ))}
                            {linkedActions.length === 0 && randomActions.length === 0 && (
                              <span className="text-[11px] text-slate-700 italic">ยังไม่ผูก Action</span>
                            )}
                          </div>

                          {/* col: buttons */}
                          <div className={clsx(cellBase, 'justify-end gap-1.5 pr-3 py-1.5')}>
                            {/* edit */}
                            <button
                              onClick={() => setEventModal({ data: { ...ev } })}
                              title="แก้ไข"
                              className="text-xs px-2.5 py-1.5 rounded border border-gray-400 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-600 dark:hover:border-slate-400 transition-colors">
                              ✎
                            </button>
                            {/* duplicate */}
                            <button
                              onClick={() => duplicateEvent(ev)}
                              title="Duplicate"
                              className="text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-violet-300 hover:border-violet-600 transition-colors">
                              ⧉
                            </button>
                            {/* delete */}
                            <button
                              onClick={() => deleteEvent(ev.id)}
                              title="ลบ"
                              className={clsx(
                                'text-xs px-2.5 py-1.5 rounded border transition-colors',
                                isConfirmDel
                                  ? 'bg-red-600 border-red-600 text-white animate-pulse'
                                  : 'border-gray-300 dark:border-slate-700 text-red-500 hover:border-red-700 hover:bg-red-950/30'
                              )}>
                              {isConfirmDel ? '?' : '✕'}
                            </button>
                          </div>

                        </div>
                      );
                    })}

                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Tab: Overlay URL ── */}
        {tab === 'overlay' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Copy URL ด้านล่างไปวางใน OBS Browser Source เพื่อให้ Actions แสดงบน stream
            </p>

            {/* Queue info banner */}
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg px-4 py-3 text-xs text-blue-300 space-y-1">
              <p className="font-medium text-blue-200 text-sm">🗂 ระบบคิว (Queue)</p>
              <p>แต่ละ Screen มีคิวเป็นของตัวเอง — Actions ที่เข้ามาพร้อมกันจะเรียงเล่นทีละตัวตามลำดับ</p>
              <p>ถ้าคิวเต็ม (เกิน Max Queue) Action ใหม่จะถูกข้ามทิ้งโดยอัตโนมัติ</p>
            </div>

            {!user && <p className="text-yellow-500 text-sm">⚠️ Login ก่อนเพื่อดู URL</p>}
            {user && overlayUrls.map((url, i) => (
              <div key={i} className="border border-gray-200 dark:border-[#252d42] rounded-lg p-4 space-y-3 bg-white dark:bg-[#1a1f30]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Screen {i + 1}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">แนะนำ: Width 800, Height 600 ใน OBS</p>
                </div>

                {/* Max Queue size */}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">Max Queue:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxQueueSizes[i]}
                    onChange={e => {
                      const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                      setMaxQueueSizes(prev => { const n = [...prev]; n[i] = val; return n; });
                    }}
                    className="w-20 bg-[#ededeb] dark:bg-[#111520] border border-gray-300 dark:border-[#2d3550] rounded px-2 py-1 text-xs text-gray-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 dark:text-slate-500">items (ถ้าคิวเต็มจะ drop Action ใหม่)</span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-brand-400 bg-[#ededeb] dark:bg-[#111520] rounded px-2 py-1.5 break-all">{url}</code>
                  <button onClick={() => { navigator.clipboard.writeText(url); toast.success('Copy แล้ว!'); }}
                    className="shrink-0 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded">
                    Copy
                  </button>
                </div>
              </div>
            ))}
            <div className="bg-white dark:bg-[#1a1f30] border border-gray-200 dark:border-[#252d42] rounded-lg p-4 text-xs text-gray-400 dark:text-slate-500 space-y-1">
              <p className="font-medium text-gray-500 dark:text-slate-400">วิธีใช้ใน OBS:</p>
              <p>1. Add Source → Browser</p>
              <p>2. วาง URL ด้านบน → ตั้ง Width: 800, Height: 600</p>
              <p>3. Actions จะแสดงอัตโนมัติเมื่อมี Event trigger และเล่นต่อเนื่องตามลำดับคิว</p>
            </div>
          </div>
        )}

        {/* ── Tab: OBS Settings ── */}
        {tab === 'obs' && (
          <div className="space-y-4 max-w-md">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              เชื่อมต่อ OBS WebSocket เพื่อให้ Actions สลับ Scene / เปิดปิด Source ได้
            </p>
            <div className="bg-white dark:bg-[#1a1f30] border border-gray-200 dark:border-[#252d42] rounded-lg p-4 text-xs text-gray-400 dark:text-slate-500 space-y-1">
              <p className="font-medium text-gray-500 dark:text-slate-400 text-sm">วิธีเปิด OBS WebSocket:</p>
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
                'bg-slate-800 text-gray-400 dark:text-slate-500')}>
              สถานะ: {obsStatus}
            </div>

            <div className="flex gap-2">
              <button onClick={connectObs}
                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg py-2 text-sm font-medium">
                🔌 เชื่อมต่อ + Scan
              </button>
              <button onClick={saveObsSettings}
                className="flex-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-white rounded-lg py-2 text-sm">
                💾 บันทึก
              </button>
            </div>

            {/* Source Map status */}
            {(obsScanStatus || Object.keys(obsSourceMap).length > 0) && (
              <div className="flex items-center gap-2">
                <div className={clsx('flex-1 text-xs px-3 py-2 rounded-lg',
                  obsScanStatus.startsWith('✅') ? 'bg-green-900/20 text-green-400' :
                  obsScanStatus.startsWith('❌') ? 'bg-red-900/20 text-red-400' :
                  'bg-slate-800/60 text-gray-500 dark:text-slate-400')}>
                  {obsScanStatus || `✅ ${Object.keys(obsSourceMap).length} source พร้อมใช้`}
                </div>
                <button
                  onClick={scanObsSources}
                  title="Scan Scene/Source ใหม่ (ถ้าเพิ่ม Scene หรือ Source ใน OBS)"
                  className="text-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:border-gray-400 dark:hover:border-slate-400 transition-colors whitespace-nowrap">
                  🔄 Refresh
                </button>
              </div>
            )}
          </div>
        )}

      {/* Modals */}
      {actionModal && (
        <ActionModal
          initial={actionModal.data}
          onSave={saveAction}
          onClose={() => setActionModal(null)}
          obsHost={obsHost}
          obsPort={obsPort}
          audioEnabled={audioEnabled}
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
          obsSourceMap={obsSourceMap}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white dark:bg-[#1a1f30] border border-gray-200 dark:border-[#252d42] rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-gray-800 dark:text-slate-100 font-bold">Login เพื่อใช้งาน</h3>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full bg-white text-gray-800 rounded-lg py-2 text-sm font-medium hover:bg-[#ededeb]">
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

      {/* Hidden import input */}
      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      </main>{/* /main */}

      {/* ── Drag handle ── */}
      <div
        onMouseDown={handleRightDragStart}
        className="hidden md:flex flex-shrink-0 w-1.5 cursor-col-resize items-center justify-center group hover:bg-brand-600/30 transition-colors"
        title="ลากเพื่อปรับขนาด"
      >
        <div className="w-px h-full bg-gray-200 dark:bg-slate-700/60 group-hover:bg-brand-500/70 transition-colors" />
      </div>

      {/* ── Right panel: OBS Queue Monitor ── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden border-l border-gray-200 dark:border-slate-800 bg-[#f4f4f3] dark:bg-[#0d1120]"
        style={{ width: rightPanelWidth }}
      >
        {/* OBS Queue Monitor — เต็ม panel */}
        {user ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-300 dark:border-slate-700/40 bg-white dark:bg-[#1a1f30] flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">🎬 OBS Queue Monitor</span>
                {queueDisplay.length > 0 && (
                  <span className="text-[11px] font-mono bg-brand-900/60 border border-brand-700/50 text-brand-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {queueDisplay.filter(i => !i.playing).length} รอ
                  </span>
                )}
                {queueDisplay.length === 0 && (
                  <span className="text-[11px] text-gray-400 dark:text-slate-600">ว่าง</span>
                )}
              </div>
              {queueDisplay.length > 0 && (
                <button
                  onClick={clearObsQueue}
                  className="shrink-0 text-xs text-red-400 hover:text-red-300 border border-red-800/50 hover:border-red-600/60 px-2 py-1 rounded-lg transition-colors">
                  🗑 Clear
                </button>
              )}
            </div>

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {queueDisplay.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-slate-600">ไม่มี Action ในคิว</div>
              ) : (
                queueDisplay.map((item) => (
                  <div key={item.id} className={clsx(
                    'flex items-center justify-between gap-2 px-3 py-2 text-xs',
                    item.playing ? 'bg-green-950/20 text-green-400' : 'text-gray-500 dark:text-slate-400 hover:bg-slate-800/30'
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      {item.playing
                        ? <span className="shrink-0 animate-pulse">▶</span>
                        : <span className="shrink-0 text-gray-400 dark:text-slate-600">◦</span>
                      }
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    {!item.playing && (
                      <button
                        onClick={() => skipQueueItem(item.key, item.idx)}
                        className="shrink-0 text-gray-400 dark:text-slate-600 hover:text-red-400 transition-colors px-1">
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Settings footer */}
            <div className="flex flex-col gap-2.5 px-3 py-3 border-t border-gray-300 dark:border-slate-700/40 bg-white dark:bg-[#1a1f30] flex-shrink-0">
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                <span className="shrink-0 text-gray-400 dark:text-slate-500">⏱ Gap:</span>
                <input
                  type="number" min={0} max={5000} step={50} value={obsGap}
                  onChange={e => {
                    const v = Math.max(0, Math.min(5000, Number(e.target.value) || 0));
                    setObsGap(v); obsGapRef.current = v;
                  }}
                  className="flex-1 min-w-0 bg-[#ededeb] dark:bg-[#111520] border border-gray-300 dark:border-slate-700 rounded px-2 py-0.5 text-gray-800 dark:text-slate-200 text-xs text-right focus:outline-none focus:border-brand-500"
                />
                <span className="shrink-0 text-gray-400 dark:text-slate-600">ms</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                <span className="shrink-0 text-gray-400 dark:text-slate-500">🔢 Max:</span>
                <input
                  type="number" min={1} max={1000} step={1} value={obsMaxQueue}
                  onChange={e => {
                    const v = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
                    setObsMaxQueue(v); obsMaxQueueRef.current = v;
                  }}
                  className="flex-1 min-w-0 bg-[#ededeb] dark:bg-[#111520] border border-gray-300 dark:border-slate-700 rounded px-2 py-0.5 text-gray-800 dark:text-slate-200 text-xs text-right focus:outline-none focus:border-brand-500"
                />
                <span className="shrink-0 text-gray-400 dark:text-slate-600">items</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-slate-600">
            Login เพื่อใช้งาน
          </div>
        )}
      </div>

      </div>{/* /content area */}
    </div>
  );
}
