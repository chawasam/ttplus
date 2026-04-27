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
  { id: 'specific_gift',    label: '🎀 ส่ง Gift ชิ้นนั้นๆ' },
  { id: 'subscriber_emote', label: '😄 ส่ง Subscriber Emote' },
  { id: 'fan_club_sticker', label: '🏅 ส่ง Fan Club Sticker' },
  { id: 'tiktok_shop',      label: '🛒 ซื้อของจาก TikTok Shop' },
];

const WHO_LIST = [
  { id: 'everyone',       label: 'ทุกคน' },
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
  obsSceneDuration: 0,
  obsSource: '',
  obsSourceDuration: 0,
  displayDuration: 5,
  overlayScreen: 1,
  globalCooldown: 0,
  userCooldown: 0,
  fadeInOut: true,
  repeatWithCombos: false,
  enabled: true,
};

const DEFAULT_EVENT = {
  trigger: 'gift_min_coins',
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
  const [form, setForm] = useState(initial || DEFAULT_ACTION);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
      if (error) {
        setObsError(error);
        return;
      }
      setObsScenes(scenes);
      setObsInputs(inputs);
    });
  };

  const toggleType = (t) => {
    setForm(p => ({
      ...p,
      types: p.types.includes(t) ? p.types.filter(x => x !== t) : [...p.types, t],
    }));
  };

  const testTts = () => {
    const text = (form.ttsText || 'ทดสอบเสียง')
      .replace('{username}', 'ทดสอบ').replace('{giftname}', 'Rose');
    speak(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-5 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Action' : 'สร้าง Action ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <Input label="ชื่อ Action *" value={form.name} onChange={v => set('name', v)} placeholder="เช่น Rose Alert" />

        {/* Action types */}
        <div>
          <p className="text-xs text-gray-400 mb-2">เลือกสิ่งที่เกิดขึ้น (เลือกได้หลายอย่าง)</p>
          <div className="space-y-2">
            {ACTION_TYPES.map(t => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.types.includes(t.id)} onChange={() => toggleType(t.id)}
                  className="accent-brand-500" />
                <span className="text-sm text-gray-300">{t.icon} {t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Media URLs */}
        {form.types.includes('show_picture') && (
          <Input label="🖼 URL รูป / GIF" value={form.pictureUrl} onChange={v => set('pictureUrl', v)}
            placeholder="https://media.giphy.com/..." />
        )}
        {form.types.includes('play_video') && (
          <Input label="🎬 URL วิดีโอ (YouTube / MP4)" value={form.videoUrl} onChange={v => set('videoUrl', v)}
            placeholder="https://youtube.com/... หรือ https://..." />
        )}
        {form.types.includes('play_audio') && (
          <Input label="🔊 URL เสียง (MP3/WAV)" value={form.audioUrl} onChange={v => set('audioUrl', v)}
            placeholder="https://..." />
        )}

        {/* Alert text */}
        {form.types.includes('show_alert') && (
          <div>
            <Input label="📢 ข้อความ Alert" value={form.alertText} onChange={v => set('alertText', v)}
              placeholder="ขอบคุณ {username}! 🎉" />
            <p className="text-[10px] text-gray-600 mt-1">ใช้ {'{'} username {'}'} {'{'} giftname {'}'} {'{'} coins {'}'} ได้</p>
          </div>
        )}

        {/* TTS text */}
        {form.types.includes('read_tts') && (
          <div className="space-y-1">
            <Input label="🗣 ข้อความ TTS" value={form.ttsText} onChange={v => set('ttsText', v)}
              placeholder="ขอบคุณ {username} ที่ส่ง {giftname}!" />
            <p className="text-[10px] text-gray-600">ใช้ engine เดียวกับแถบ TTS (สิริ)</p>
            <button onClick={testTts} className="text-xs text-brand-400 hover:text-brand-300 underline">▶ ทดสอบเสียง</button>
          </div>
        )}

        {/* OBS Scene */}
        {form.types.includes('switch_obs_scene') && (
          <div className="space-y-2 border border-gray-800 rounded p-3">
            <p className="text-xs text-gray-400 font-medium">🎬 OBS Scene</p>
            {obsError && <p className="text-[10px] text-red-400">{obsError}</p>}
            <ObsSelect
              label="ชื่อ Scene ที่จะสลับไป"
              value={form.obsScene}
              onChange={v => set('obsScene', v)}
              items={obsScenes}
              loading={obsLoading}
              onFetch={loadObsLists}
              placeholder="เช่น Scene ของขวัญ"
            />
            <div className="flex items-center gap-3">
              <Input label="กี่วินาทีแล้วกลับ (0 = เปิดตลอด)" value={form.obsSceneDuration}
                onChange={v => set('obsSceneDuration', v)} type="number" min={0} className="flex-1" />
            </div>
            {form.obsSceneDuration > 0 && (
              <p className="text-[10px] text-gray-500">สลับไป {form.obsScene || '...'} → รอ {form.obsSceneDuration} วิ → กลับ Scene เดิม</p>
            )}
          </div>
        )}

        {/* OBS Source */}
        {form.types.includes('activate_obs_source') && (
          <div className="space-y-2 border border-gray-800 rounded p-3">
            <p className="text-xs text-gray-400 font-medium">👁 OBS Source</p>
            {obsError && <p className="text-[10px] text-red-400">{obsError}</p>}
            <ObsSelect
              label="ชื่อ Source ที่จะเปิด"
              value={form.obsSource}
              onChange={v => set('obsSource', v)}
              items={obsInputs}
              loading={obsLoading}
              onFetch={loadObsLists}
              placeholder="เช่น ภาพ Rose Animation"
            />
            <Input label="กี่วินาทีแล้วปิด (0 = เปิดตลอด)" value={form.obsSourceDuration}
              onChange={v => set('obsSourceDuration', v)} type="number" min={0} />
          </div>
        )}

        {/* Display settings */}
        <div className="border border-gray-800 rounded p-3 space-y-3">
          <p className="text-xs text-gray-400 font-medium">⚙️ ตั้งค่าการแสดงผล</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="แสดงกี่วินาที" value={form.displayDuration} onChange={v => set('displayDuration', v)} type="number" min={1} />
            <div>
              <label className="text-xs text-gray-400">Overlay Screen</label>
              <select value={form.overlayScreen} onChange={e => set('overlayScreen', Number(e.target.value))}
                className="mt-1 w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
                <option value={1}>Screen 1</option>
                <option value={2}>Screen 2</option>
              </select>
            </div>
            <Input label="Global Cooldown (วิ)" value={form.globalCooldown} onChange={v => set('globalCooldown', v)} type="number" min={0} />
            <Input label="User Cooldown (วิ)" value={form.userCooldown} onChange={v => set('userCooldown', v)} type="number" min={0} />
          </div>
          <Toggle label="Fade In/Out" checked={form.fadeInOut} onChange={v => set('fadeInOut', v)} />
          <Toggle label="Repeat กับ Gift combos" checked={form.repeatWithCombos} onChange={v => set('repeatWithCombos', v)} />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded py-2 text-sm">
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Form Modal ─────────────────────────────────────────────────────────
function EventModal({ initial, actions, onSave, onClose }) {
  const [form, setForm] = useState(initial || DEFAULT_EVENT);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleActionId = (id, field) => {
    setForm(p => ({
      ...p,
      [field]: p[field].includes(id) ? p[field].filter(x => x !== id) : [...p[field], id],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-5 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-base">{initial?.id ? 'แก้ไข Event' : 'สร้าง Event ใหม่'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Who */}
        <div>
          <p className="text-xs text-gray-400 mb-2">ใครสามารถ trigger ได้?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {WHO_LIST.map(w => (
              <label key={w.id} className={clsx(
                'flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-sm transition-colors',
                form.whoCanTrigger === w.id ? 'border-brand-500 bg-brand-900/30 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
              )}>
                <input type="radio" name="who" value={w.id} checked={form.whoCanTrigger === w.id}
                  onChange={() => set('whoCanTrigger', w.id)} className="accent-brand-500" />
                {w.label}
              </label>
            ))}
          </div>
          {form.whoCanTrigger === 'specific_user' && (
            <Input className="mt-2" label="TikTok username" value={form.specificUser}
              onChange={v => set('specificUser', v)} placeholder="@username" />
          )}
        </div>

        {/* Trigger */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Trigger จากอะไร?</p>
          <div className="space-y-1.5">
            {TRIGGER_LIST.map(t => (
              <label key={t.id} className={clsx(
                'flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-sm transition-colors',
                form.trigger === t.id ? 'border-brand-500 bg-brand-900/30 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
              )}>
                <input type="radio" name="trigger" value={t.id} checked={form.trigger === t.id}
                  onChange={() => set('trigger', t.id)} className="accent-brand-500" />
                {t.label}
              </label>
            ))}
          </div>

          {/* Trigger params */}
          {form.trigger === 'command' && (
            <Input className="mt-2" label="Keyword (เช่น !สุ่ม)" value={form.keyword}
              onChange={v => set('keyword', v)} placeholder="!สุ่ม" />
          )}
          {form.trigger === 'gift_min_coins' && (
            <Input className="mt-2" label="จำนวน coins ขั้นต่ำ" value={form.minCoins}
              onChange={v => set('minCoins', v)} type="number" min={1} />
          )}
          {form.trigger === 'specific_gift' && (
            <Input className="mt-2" label="ชื่อ Gift (เช่น Rose, Galaxy)" value={form.specificGiftName}
              onChange={v => set('specificGiftName', v)} placeholder="Rose" />
          )}
          {form.trigger === 'likes' && (
            <Input className="mt-2" label="Like ครบกี่ครั้ง" value={form.likesCount}
              onChange={v => set('likesCount', v)} type="number" min={1} />
          )}
        </div>

        {/* Actions to trigger */}
        {actions.length === 0 ? (
          <p className="text-xs text-yellow-500">⚠️ ยังไม่มี Actions — สร้าง Action ก่อน</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-2">Trigger ทั้งหมดนี้ (เลือกได้หลายอย่าง)</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {actions.map(a => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.actionIds.includes(a.id)}
                      onChange={() => toggleActionId(a.id, 'actionIds')} className="accent-brand-500" />
                    <span className="text-sm text-gray-300">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Trigger แบบสุ่ม 1 อัน (เลือกได้หลายอย่าง)</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {actions.map(a => (
                  <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.randomActionIds.includes(a.id)}
                      onChange={() => toggleActionId(a.id, 'randomActionIds')} className="accent-brand-500" />
                    <span className="text-sm text-gray-300">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => onSave(form)}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded py-2 text-sm font-medium">
            ✓ บันทึก
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded py-2 text-sm">
            ยกเลิก
          </button>
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
  const [tab,      setTab]      = useState('actions'); // actions | events | overlay | obs

  // Modals
  const [actionModal,  setActionModal]  = useState(null); // null | { data }
  const [eventModal,   setEventModal]   = useState(null);

  // OBS settings
  const [obsHost,     setObsHost]     = useState('localhost');
  const [obsPort,     setObsPort]     = useState(4455);
  const [obsPassword, setObsPassword] = useState('');
  const [obsStatus,   setObsStatus]   = useState('ยังไม่เชื่อม'); // ยังไม่เชื่อม / กำลังเชื่อม / เชื่อมแล้ว / error
  const obsWsRef = useRef(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading,   setLoginLoading]   = useState(false);

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [aRes, eRes, obsRes] = await Promise.all([
        api.get('/api/actions'),
        api.get('/api/actions/events'),
        api.get('/api/actions/obs-settings'),
      ]);
      setActions(aRes.data.actions || []);
      setEvents(eRes.data.events   || []);
      const obs = obsRes.data.settings || {};
      setObsHost(obs.host || 'localhost');
      setObsPort(obs.port || 4455);
      setObsPassword(obs.password || '');
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

  const deleteAction = useCallback(async (id) => {
    if (!confirm('ลบ Action นี้?')) return;
    try {
      await api.delete(`/api/actions/${id}`);
      toast.success('ลบแล้ว');
      loadData();
    } catch { toast.error('ลบไม่ได้'); }
  }, [loadData]);

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

  const deleteEvent = useCallback(async (id) => {
    if (!confirm('ลบ Event นี้?')) return;
    try {
      await api.delete(`/api/actions/events/${id}`);
      toast.success('ลบแล้ว');
      loadData();
    } catch { toast.error('ลบไม่ได้'); }
  }, [loadData]);

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

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">🎭 ลูกเล่น TT</h1>
            <p className="text-xs text-gray-500 mt-0.5">ตั้งค่า Actions &amp; Events สำหรับ TikTok Live</p>
          </div>
          {requireLogin && (
            <button onClick={() => setShowLoginModal(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg">
              Login
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-900 p-1 rounded-lg w-fit">
          {[
            { id: 'actions', label: '⚡ Actions' },
            { id: 'events',  label: '🔗 Events' },
            { id: 'overlay', label: '📺 Overlay URL' },
            { id: 'obs',     label: '🎬 OBS' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('px-3 py-1.5 rounded text-sm font-medium transition-colors',
                tab === t.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white')}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm">กำลังโหลด...</p>}

        {/* ── Tab: Actions ── */}
        {tab === 'actions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Actions คือสิ่งที่เกิดขึ้นบน stream เมื่อมี event</p>
              <button onClick={() => setActionModal({ data: null })}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1">
                + สร้าง Action
              </button>
            </div>

            {actions.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-600">
                <p className="text-3xl mb-2">⚡</p>
                <p className="text-sm">ยังไม่มี Actions — กด "+ สร้าง Action" เพื่อเริ่ม</p>
              </div>
            )}

            {actions.map(a => (
              <div key={a.id} className={clsx(
                'border rounded-lg p-3 flex items-center gap-3 transition-colors',
                a.enabled ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-60'
              )}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.types.map(t => ACTION_TYPES.find(x => x.id === t)?.icon).join(' ')} ·
                    Screen {a.overlayScreen} · {a.displayDuration}s
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleAction(a)}
                    className={clsx('text-xs px-2 py-0.5 rounded', a.enabled ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500')}>
                    {a.enabled ? 'เปิด' : 'ปิด'}
                  </button>
                  <button onClick={() => setActionModal({ data: { ...a } })}
                    className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-gray-800">
                    แก้ไข
                  </button>
                  <button onClick={() => deleteAction(a.id)}
                    className="text-xs text-red-500 hover:text-red-400 px-2 py-0.5 rounded bg-gray-800">
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Events ── */}
        {tab === 'events' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Events คือตัว trigger ที่จะเรียก Actions</p>
              <button onClick={() => setEventModal({ data: null })}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg">
                + สร้าง Event
              </button>
            </div>

            {events.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-600">
                <p className="text-3xl mb-2">🔗</p>
                <p className="text-sm">ยังไม่มี Events — กด "+ สร้าง Event" เพื่อเริ่ม</p>
              </div>
            )}

            {events.map(ev => {
              const trigger = TRIGGER_LIST.find(t => t.id === ev.trigger);
              const linkedActions = actions.filter(a => ev.actionIds?.includes(a.id));
              const randomActions = actions.filter(a => ev.randomActionIds?.includes(a.id));
              return (
                <div key={ev.id} className={clsx(
                  'border rounded-lg p-3 flex items-center gap-3 transition-colors',
                  ev.enabled ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-60'
                )}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{trigger?.label || ev.trigger}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {WHO_LIST.find(w => w.id === ev.whoCanTrigger)?.label}
                      {ev.trigger === 'command' && ` · "${ev.keyword}"`}
                      {ev.trigger === 'gift_min_coins' && ` · ≥${ev.minCoins} coins`}
                      {ev.trigger === 'specific_gift' && ` · ${ev.specificGiftName}`}
                      {ev.trigger === 'likes' && ` · ${ev.likesCount} likes`}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {linkedActions.length > 0 && `▶ ${linkedActions.map(a => a.name).join(', ')}`}
                      {randomActions.length > 0 && ` 🎲 ${randomActions.map(a => a.name).join(', ')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleEvent(ev)}
                      className={clsx('text-xs px-2 py-0.5 rounded', ev.enabled ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500')}>
                      {ev.enabled ? 'เปิด' : 'ปิด'}
                    </button>
                    <button onClick={() => setEventModal({ data: { ...ev } })}
                      className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-gray-800">
                      แก้ไข
                    </button>
                    <button onClick={() => deleteEvent(ev.id)}
                      className="text-xs text-red-500 hover:text-red-400 px-2 py-0.5 rounded bg-gray-800">
                      ลบ
                    </button>
                  </div>
                </div>
              );
            })}
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
          onSave={saveEvent}
          onClose={() => setEventModal(null)}
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
    </div>
  );
}
