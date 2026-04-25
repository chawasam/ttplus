// pages/game/world.js — Ashenveil Main Game Hub
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { loadCharacter, getBalance, explore, travel, startBattle, battleAction, rest,
         getInventory, getShopItems, buyItem, sellItem, equipItem, unequipItem,
         getNPCs, talkNPC, giveGift,
         getDungeons, getDungeonRun, enterDungeon, dungeonAction, dungeonFlee } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';

const SCREENS = {
  WORLD:          'world',
  EXPLORE:        'explore',
  BATTLE:         'battle',
  INVENTORY:      'inventory',
  SHOP:           'shop',
  NPC:            'npc',
  NPC_TALK:       'npc_talk',
  DUNGEON_LIST:   'dungeon_list',
  DUNGEON_ROOM:   'dungeon_room',
  DUNGEON_CLEAR:  'dungeon_clear',
};

const DIFFICULTY_COLOR = ['', 'text-green-400', 'text-yellow-400', 'text-red-400'];

// ─────────────────────────────────────────────────────────
//  BGM Config — วาง Suno URL หลังจาก generate แล้ว
//  แนะนำ: 16-bit SNES style (ดู prompt ในไฟล์ BGM_PROMPTS.md)
// ─────────────────────────────────────────────────────────
const BGM = {
  town:    '',  // Town Square — peaceful, warm
  field:   '',  // Outskirts / Forest — mysterious, adventurous
  cave:    '',  // Dark Cave — dark, tense
  dungeon: '',  // Dungeon run — gothic, intense
  battle:  '',  // Normal battle — fast, driving
  boss:    '',  // Boss battle — epic, sinister
};

// zone → bgm key
const ZONE_BGM = {
  town_square:    'town',
  town_outskirts: 'field',
  forest_path:    'field',
  dark_cave:      'cave',
};

const GRADE_COLOR = {
  COMMON:    'text-gray-400',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-orange-400',
  MYTHIC:    'text-red-400',
};

export default function GameWorld() {
  const router    = useRouter();
  const logEndRef = useRef(null);
  const audioRef  = useRef(null);   // HTMLAudioElement
  const bgmKeyRef = useRef('');     // track กำลังเล่นอยู่

  const [loading,    setLoading]    = useState(true);
  const [char,       setChar]       = useState(null);
  const [gold,       setGold]       = useState(0);
  const [rp,         setRP]         = useState(0);
  const [screen,     setScreen]     = useState(SCREENS.WORLD);
  const [zone,       setZone]       = useState('town_square');
  const [gameLog,    setGameLog]    = useState(['⚔️ ยินดีต้อนรับสู่ Ashenveil: The Shattered Age', '500 ปีหลัง The Sundering โลกแตกออกเป็น Shard...', '─────────────────────────']);
  const [battle,     setBattle]     = useState(null);
  const [battleLog,  setBattleLog]  = useState([]);
  const [inventory,  setInventory]  = useState([]);
  const [equipment,  setEquipment]  = useState({});
  const [shopItems,  setShopItems]  = useState([]);
  const [npcs,       setNPCs]       = useState([]);
  const [activeNPC,  setActiveNPC]  = useState(null);
  const [busy,          setBusy]         = useState(false);
  const [atmosphere,    setAtmosphere]   = useState('');
  const [dungeonList,   setDungeonList]  = useState([]);
  const [dungeonRun,    setDungeonRun]   = useState(null);  // current run state
  const [dungeonRoom,   setDungeonRoom]  = useState(null);  // current room data
  const [dungeonInfo,   setDungeonInfo]  = useState(null);  // dungeon meta
  const [dungeonLog,    setDungeonLog]   = useState([]);    // room-specific log
  const [dungeonReward, setDungeonReward]= useState(null);  // clear rewards
  const [dungeonRunId,  setDungeonRunId] = useState(null);  // active dungeon run ID (for battle)
  const [fontSize,    setFontSize]    = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('game_fontSize') || 'sm';
    return 'sm';
  });
  const [bgmEnabled,  setBgmEnabled]  = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('game_bgm') !== 'off';
    return true;
  });
  const [bgmVolume,   setBgmVolume]   = useState(() => {
    if (typeof window !== 'undefined') return parseFloat(localStorage.getItem('game_bgm_vol') || '0.4');
    return 0.4;
  });


  // ===== Init =====
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/game'); return; }
      try {
        const { data } = await loadCharacter();
        if (!data.hasCharacter) { router.replace('/game'); return; }
        setChar(data.character);
        setGold(data.character.gold || 0);
        setRP(data.character.realmPoints || 0);
        setZone(data.character.location || 'town_square');
        addLog(`👤 ${data.character.name} (${data.character.race} ${data.character.class} Lv.${data.character.level})`);
        addLog(`📍 ${getZoneName(data.character.location || 'town_square')}`);
      } catch {
        router.replace('/game');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog, battleLog]);

  const addLog = useCallback((...msgs) => {
    setGameLog(prev => [...prev.slice(-100), ...msgs]);
  }, []);

  // ── BGM: เล่น track ตาม key ──
  const playBgm = useCallback((key) => {
    const url = BGM[key] || '';
    if (!url) return; // ยังไม่มี URL — รอใส่ Suno link

    // สร้าง audio element ครั้งแรก
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop   = true;
      audioRef.current.volume = bgmVolume;
    }

    // เปลี่ยน track ถ้าต่างจากที่เล่นอยู่
    if (bgmKeyRef.current !== key) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      bgmKeyRef.current = key;
    }

    if (bgmEnabled) {
      audioRef.current.play().catch(() => {}); // autoplay policy — ignore error
    }
  }, [bgmEnabled, bgmVolume]);

  // ── BGM: pause/resume เมื่อ toggle ──
  useEffect(() => {
    if (!audioRef.current) return;
    if (bgmEnabled) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [bgmEnabled]);

  // ── BGM: sync volume ──
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  // ── BGM: สลับ track ตาม screen/zone ──
  useEffect(() => {
    if (screen === SCREENS.BATTLE) {
      // ตรวจว่าเป็น boss หรือเปล่า
      const isBoss = battle?.enemy?.monsterId?.includes('guardian') ||
                     battle?.enemy?.monsterId?.includes('boss')    ||
                     battle?.enemy?.monsterId?.includes('colossus') ||
                     battle?.enemy?.monsterId?.includes('malachar') ||
                     battle?.enemy?.monsterId?.includes('cryptlord');
      playBgm(isBoss ? 'boss' : 'battle');
    } else if (screen === SCREENS.DUNGEON_ROOM || screen === SCREENS.DUNGEON_LIST) {
      playBgm('dungeon');
    } else {
      playBgm(ZONE_BGM[zone] || 'town');
    }
  }, [screen, zone, battle?.enemy?.monsterId]);

  // ── cleanup audio on unmount ──
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleBgm = useCallback(() => {
    setBgmEnabled(prev => {
      const next = !prev;
      localStorage.setItem('game_bgm', next ? 'on' : 'off');
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const vol = parseFloat(e.target.value);
    setBgmVolume(vol);
    localStorage.setItem('game_bgm_vol', String(vol));
  }, []);

  // ===== Explore =====
  const handleExplore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setScreen(SCREENS.EXPLORE);
    addLog('─────────────────────────');
    addLog(`🔍 สำรวจ ${getZoneName(zone)}...`);
    try {
      const { data } = await explore(zone);
      setAtmosphere(data.atmosphere);
      addLog(`"${data.atmosphere}"`);
      addLog(data.msg);

      if (data.items?.length > 0) {
        data.items.forEach(i => addLog(`  📦 ได้รับ ${i.emoji} ${i.name}`));
      }
      if (data.gold > 0) {
        addLog(`  💰 ได้รับ ${data.gold} Gold`);
        setGold(g => g + data.gold);
      }
      if (data.encounter) {
        addLog('⚠️ พบมอนสเตอร์! เตรียมรับมือ...');
        await handleStartBattle(data.encounter.zone, data.encounter.monsterId);
        return;
      }
      addLog(`Stamina: ${data.stamina}/${data.staminaMax}`);
      setChar(c => c ? { ...c, stamina: data.stamina } : c);
    } catch (err) {
      const msg = err.response?.data?.error || 'Explore ไม่สำเร็จ';
      addLog(`⛔ ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, zone]);

  // ===== Travel =====
  const handleTravel = useCallback(async (targetZone) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await travel(targetZone);
      setZone(targetZone);
      setChar(c => c ? { ...c, location: targetZone } : c);
      addLog('─────────────────────────');
      addLog(`${data.icon} เดินทางไปยัง ${data.zoneName}`);
      addLog(`"${data.atmosphere}"`);
      setScreen(SCREENS.WORLD);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เดินทางไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // ===== Battle =====
  const handleStartBattle = useCallback(async (z, monsterId) => {
    setBusy(true);
    try {
      const { data } = await startBattle(z || zone, monsterId);
      setBattle(data.state);
      setBattleLog(data.state.log || []);
      setScreen(SCREENS.BATTLE);
    } catch (err) {
      addLog(`⛔ ${err.response?.data?.error || 'เริ่ม Battle ไม่ได้'}`);
    } finally {
      setBusy(false);
    }
  }, [zone]);

  const handleBattleAction = useCallback(async (action, opts = {}) => {
    if (!battle || busy) return;
    setBusy(true);
    try {
      const { data } = await battleAction(battle.battleId, action, opts);
      setBattle(data.state);
      setBattleLog(prev => [...prev, '─────', ...data.log]);

      if (data.result === 'victory') {
        const rewards = data.rewards || {};
        if (rewards.gold) setGold(g => g + rewards.gold);
        if (rewards.levelUp) setChar(c => c ? { ...c, level: rewards.levelUp } : c);

        // Was this a dungeon battle?
        if (data.dungeonRunId) {
          setTimeout(async () => {
            setBattle(null);
            try {
              const runRes = await getDungeonRun();
              if (runRes.data.run?.status === 'completed') {
                setDungeonReward({ gold: rewards.gold || 0, xp: rewards.xp || 0, items: rewards.items || [] });
                setDungeonRun(null);
                setDungeonRunId(null);
                setScreen(SCREENS.DUNGEON_CLEAR);
              } else if (runRes.data.run) {
                setDungeonRun(runRes.data.run);
                setDungeonRoom(runRes.data.room);
                const idx = runRes.data.run.currentRoom;
                setDungeonLog(prev => [...prev, '─────────────────────────', `✅ ชนะ! → ห้องที่ ${idx + 1}/${runRes.data.run.totalRooms}: ${runRes.data.room?.name || ''}`, runRes.data.room?.desc || '']);
                setScreen(SCREENS.DUNGEON_ROOM);
              } else {
                setScreen(SCREENS.WORLD);
              }
            } catch {
              setScreen(SCREENS.WORLD);
            }
          }, 1200);
        } else {
          setTimeout(() => { setBattle(null); setScreen(SCREENS.WORLD); }, 1200);
        }
      } else if (data.result === 'defeat') {
        // Was dungeon? Run is already failed by backend
        if (data.dungeonRunId) {
          setDungeonRun(null);
          setDungeonRunId(null);
          setDungeonRoom(null);
        }
        setTimeout(() => { setBattle(null); setScreen(SCREENS.WORLD); }, 1500);
      } else if (data.result === 'fled') {
        setTimeout(() => { setBattle(null); setScreen(dungeonRunId ? SCREENS.DUNGEON_ROOM : SCREENS.WORLD); }, 1000);
      } else {
        setChar(c => c ? { ...c, hp: data.state.player.hp, mp: data.state.player.mp } : c);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [battle, busy]);

  const handleRest = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await rest();
      setChar(c => c ? { ...c, hp: data.hp, mp: data.mp } : c);
      addLog(data.msg);
      toast.success(data.msg);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Rest ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // ===== Inventory =====
  const loadInventory = useCallback(async () => {
    const { data } = await getInventory();
    setInventory(data.items);
    setEquipment(data.equipment);
    setScreen(SCREENS.INVENTORY);
  }, []);

  const handleEquip = useCallback(async (instanceId, slot) => {
    try {
      await equipItem(instanceId, slot);
      toast.success('ใส่อุปกรณ์แล้ว');
      const { data } = await getInventory();
      setInventory(data.items);
      setEquipment(data.equipment);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ใส่ไม่ได้');
    }
  }, []);

  const handleSell = useCallback(async (instanceId, name) => {
    if (!confirm(`ขาย ${name} ?`)) return;
    try {
      const { data } = await sellItem(instanceId);
      toast.success(data.msg);
      setGold(g => g + data.gold);
      const inv = await getInventory();
      setInventory(inv.data.items);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ขายไม่ได้');
    }
  }, []);

  // ===== Shop =====
  const loadShop = useCallback(async () => {
    const { data } = await getShopItems();
    setShopItems(data.items);
    setScreen(SCREENS.SHOP);
  }, []);

  const handleBuy = useCallback(async (itemId, name, price) => {
    if (!confirm(`ซื้อ ${name} ราคา ${price} Gold?`)) return;
    try {
      const { data } = await buyItem(itemId);
      toast.success(data.msg);
      setGold(g => g - price);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ซื้อไม่ได้');
    }
  }, []);

  // ===== NPC =====
  const loadNPCs = useCallback(async () => {
    const { data } = await getNPCs();
    setNPCs(data.npcs);
    setScreen(SCREENS.NPC);
  }, []);

  const handleTalkNPC = useCallback(async (npcId) => {
    const { data } = await talkNPC(npcId);
    setActiveNPC(data);
    setScreen(SCREENS.NPC_TALK);
  }, []);

  const handleGiveGift = useCallback(async (npcId, instanceId, itemName) => {
    try {
      const { data } = await giveGift(npcId, instanceId);
      toast.success(data.msg);
      addLog(`💝 ${data.msg}`);
      if (data.bondGranted) {
        toast.success(`🎁 ปลดล็อค Bond Item: ${data.bondGranted.name}!`, { duration: 5000 });
      }
      // Refresh NPC
      const npc = await talkNPC(npcId);
      setActiveNPC(npc.data);
      // Refresh inventory
      const inv = await getInventory();
      setInventory(inv.data.items);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ให้ของไม่ได้');
    }
  }, []);

  // ===== Dungeon =====
  const loadDungeons = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await getDungeons();
      setDungeonList(data.dungeons || []);
      // If there's an active run, go directly to it
      if (data.activeRun) {
        const runRes = await getDungeonRun();
        if (runRes.data.run) {
          setDungeonRun(runRes.data.run);
          setDungeonRoom(runRes.data.room);
          setDungeonInfo(runRes.data.dungeon);
          setDungeonRunId(runRes.data.run.id);
          setDungeonLog([`🔄 กลับสู่ ${runRes.data.dungeon?.nameTH || 'Dungeon'} (ห้องที่ ${runRes.data.run.currentRoom + 1}/${runRes.data.run.totalRooms})`]);
          setScreen(SCREENS.DUNGEON_ROOM);
          return;
        }
      }
      setScreen(SCREENS.DUNGEON_LIST);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด Dungeon ไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleEnterDungeon = useCallback(async (dungeonId) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await enterDungeon(dungeonId);
      setDungeonRun(data.run);
      setDungeonRoom(data.room);
      setDungeonInfo(data.dungeon);
      setDungeonRunId(data.run.id);
      setDungeonLog([
        `🏰 เข้าสู่ ${data.dungeon.nameTH}`,
        `📍 ห้องที่ 1/${data.run.totalRooms}: ${data.room.name}`,
        `─────────────────────────`,
        data.room.desc,
      ]);
      setScreen(SCREENS.DUNGEON_ROOM);
    } catch (err) {
      toast.error(err.response?.data?.error || 'เข้า Dungeon ไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleDungeonAction = useCallback(async (action) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await dungeonAction(action);
      const newLog = [...dungeonLog, '─────────────────────────', ...(data.log || [])];

      if (data.cleared) {
        setDungeonReward(data.clearRewards);
        setDungeonRun(null);
        setDungeonRunId(null);
        setDungeonLog([...newLog, '🏆 Dungeon Cleared!']);
        setScreen(SCREENS.DUNGEON_CLEAR);
        if (data.newLevel) setChar(c => c ? { ...c, level: data.newLevel } : c);
        return;
      }

      if (data.advanced && data.nextRoom) {
        const nextLog = [
          ...newLog,
          `📍 ห้องที่ ${data.nextRoomIndex + 1}/${dungeonRun?.totalRooms}: ${data.nextRoom.name}`,
          data.nextRoom.desc,
        ];
        setDungeonRoom(data.nextRoom);
        setDungeonRun(r => r ? { ...r, currentRoom: data.nextRoomIndex } : r);
        setDungeonLog(nextLog);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [busy, dungeonLog, dungeonRun]);

  const handleDungeonFlee = useCallback(async () => {
    if (!confirm('ถอยออกจาก Dungeon? (เสีย progress ทั้งหมด)')) return;
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await dungeonFlee();
      toast.success(data.message);
      setDungeonRun(null);
      setDungeonRunId(null);
      setDungeonRoom(null);
      setScreen(SCREENS.WORLD);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Flee ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // Start battle inside a dungeon (combat or boss room)
  const handleDungeonBattle = useCallback(async () => {
    if (!dungeonRoom || busy) return;
    setBusy(true);
    try {
      const isBoss    = dungeonRoom.type === 'boss';
      const payload   = {
        dungeonRunId: dungeonRunId,
        ...(isBoss
          ? { bossData: dungeonRoom.boss }
          : { monsterId: dungeonRoom.monsterId }),
      };
      const { data } = await startBattle(null, payload.monsterId, payload.dungeonRunId, payload.bossData);
      setBattle(data.state);
      setBattleLog([
        `🏰 [Dungeon] ${dungeonInfo?.nameTH} — ห้อง ${(dungeonRun?.currentRoom || 0) + 1}`,
        ...(data.state.log || [])
      ]);
      setScreen(SCREENS.BATTLE);
    } catch (err) {
      addLog(`⛔ ${err.response?.data?.error || 'เริ่ม Battle ไม่ได้'}`);
    } finally {
      setBusy(false);
    }
  }, [dungeonRoom, dungeonRunId, dungeonInfo, dungeonRun, busy]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-amber-600 animate-pulse" style={{ fontFamily: 'monospace' }}>กำลังโหลดโลก Ashenveil...</p>
    </div>
  );

  return (
    <>
      <Head><title>Ashenveil — {char?.name || 'Game'}</title></Head>
      <div className="min-h-screen bg-[#0a0a0a] text-amber-100 flex flex-col"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}>

        {/* ── STATUS BAR ── */}
        <div className="border-b border-gray-800 bg-gray-950 px-4 py-2 flex flex-wrap gap-4 text-xs">
          <span className="text-amber-400 font-bold">{char?.name}</span>
          <span className="text-gray-500">{char?.race} {char?.class} Lv.{char?.level}</span>
          <span className="text-red-400">❤️ {char?.hp}/{char?.hpMax}</span>
          <span className="text-blue-400">💧 {char?.mp}/{char?.mpMax}</span>
          <span className="text-yellow-400">💰 {gold.toLocaleString()} G</span>
          <span className="text-green-400">⚡ {char?.stamina}/{char?.staminaMax}</span>
          <span className="text-purple-400">🌀 {rp} RP</span>
          <span className="text-gray-600 ml-auto">📍 {getZoneName(zone)}</span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setFontSize(prev => { const n = prev === 'base' ? 'sm' : 'xs'; localStorage.setItem('game_fontSize', n); return n; })}
              disabled={fontSize === 'xs'}
              className="px-1.5 py-0.5 border border-gray-700 rounded text-gray-500 hover:text-amber-400 hover:border-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition select-none"
              style={{ fontSize: '11px', lineHeight: 1 }}>A-</button>
            <button
              onClick={() => setFontSize(prev => { const n = prev === 'xs' ? 'sm' : 'base'; localStorage.setItem('game_fontSize', n); return n; })}
              disabled={fontSize === 'base'}
              className="px-1.5 py-0.5 border border-gray-700 rounded text-gray-500 hover:text-amber-400 hover:border-amber-700 disabled:opacity-30 disabled:cursor-not-allowed transition select-none"
              style={{ fontSize: '13px', lineHeight: 1 }}>A+</button>

            {/* BGM toggle */}
            <button
              onClick={toggleBgm}
              title={bgmEnabled ? 'ปิดเพลง BGM' : 'เปิดเพลง BGM'}
              className={`px-1.5 py-0.5 border rounded transition select-none text-xs ${
                bgmEnabled
                  ? 'border-amber-800 text-amber-500 hover:text-amber-300 hover:border-amber-600'
                  : 'border-gray-800 text-gray-700 hover:text-gray-500'
              }`}
              style={{ lineHeight: 1 }}>
              {bgmEnabled ? '🎵' : '🔇'}
            </button>

            {/* Volume slider — แสดงเฉพาะตอน bgm เปิด */}
            {bgmEnabled && (
              <input
                type="range" min="0" max="1" step="0.05"
                value={bgmVolume}
                onChange={handleVolumeChange}
                title={`Volume: ${Math.round(bgmVolume * 100)}%`}
                className="w-14 h-1 accent-amber-600 cursor-pointer"
                style={{ verticalAlign: 'middle' }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── MAIN LOG ── */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {(screen === SCREENS.BATTLE ? battleLog : gameLog).map((line, i) => (
                <p key={i} className={`text-${fontSize} leading-relaxed ${
                  line.startsWith('─') ? 'text-gray-700' :
                  line.startsWith('💀') ? 'text-red-400' :
                  line.startsWith('🎉') || line.startsWith('✅') ? 'text-green-400' :
                  line.startsWith('⚠️') || line.startsWith('⛔') ? 'text-red-400' :
                  line.startsWith('💰') || line.startsWith('⭐') ? 'text-yellow-400' :
                  line.startsWith('"') ? 'text-gray-400 italic' :
                  'text-amber-100'
                }`}>{line}</p>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* ── ACTION PANEL ── */}
            <div className="border-t border-gray-800 p-4">

              {/* WORLD HUB */}
              {screen === SCREENS.WORLD && (
                <div>
                  <p className="text-gray-600 text-xs mb-3">[ เลือกการกระทำ ]</p>
                  <div className="grid grid-cols-2 gap-2">
                    {zone !== 'town_square' && (
                      <Btn onClick={handleExplore}  disabled={busy}>🔍 สำรวจ</Btn>
                    )}
                    {zone !== 'town_square' && (
                      <Btn onClick={() => handleStartBattle(zone)} disabled={busy}>⚔️ ออกหาบอส</Btn>
                    )}
                    <Btn onClick={handleRest}     disabled={busy}>💤 พักผ่อน</Btn>
                    <Btn onClick={loadInventory}  disabled={busy}>🎒 Inventory</Btn>
                    <Btn onClick={loadShop}       disabled={busy}>🏪 ร้านค้า</Btn>
                    <Btn onClick={loadNPCs}       disabled={busy}>💬 NPC</Btn>
                    <Btn onClick={loadDungeons}   disabled={busy}>🏰 ดันเจี้ยน</Btn>
                    <Btn onClick={() => setScreen('travel')} disabled={busy}>🗺️ เดินทาง</Btn>
                  </div>
                </div>
              )}

              {/* TRAVEL */}
              {screen === 'travel' && (
                <div>
                  <p className="text-gray-600 text-xs mb-3">[ เลือก Zone ]</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'town_square',    name: '🏘️ Town Square', lv: 'Lv.1+' },
                      { id: 'town_outskirts', name: '🌾 ชานเมือง',    lv: 'Lv.1+' },
                      { id: 'forest_path',    name: '🌲 ทางป่า',      lv: 'Lv.3+' },
                      { id: 'dark_cave',      name: '🕳️ ถ้ำมืด',     lv: 'Lv.5+' },
                    ].map(z => (
                      <Btn key={z.id} onClick={() => handleTravel(z.id)} disabled={busy || z.id === zone}>
                        {z.name} <span className="text-gray-600 text-xs">{z.lv}</span>
                      </Btn>
                    ))}
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>
                </div>
              )}

              {/* EXPLORE RESULT */}
              {screen === SCREENS.EXPLORE && (
                <div>
                  <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ Town</Btn>
                </div>
              )}

              {/* BATTLE */}
              {screen === SCREENS.BATTLE && battle && (
                <div>
                  {!battle.result ? (
                    <>
                      <div className="flex gap-2 mb-2 text-xs text-gray-500">
                        <span className="text-red-400">👹 {battle.enemy.name}: {battle.enemy.hp}/{battle.enemy.hpMax} HP</span>
                        <span className="ml-auto">Turn {battle.turn}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Btn onClick={() => handleBattleAction('attack')} disabled={busy}>⚔️ โจมตี</Btn>
                        <Btn onClick={() => handleBattleAction('flee')}   disabled={busy}>🏃 หนี</Btn>
                      </div>
                    </>
                  ) : (
                    <p className={`text-center text-sm ${battle.result === 'victory' ? 'text-green-400' : 'text-red-400'}`}>
                      {battle.result === 'victory' ? '🏆 ชนะแล้ว!' : battle.result === 'defeat' ? '💀 พ่ายแพ้...' : '🏃 หนีได้!'}
                    </p>
                  )}
                </div>
              )}

              {/* INVENTORY */}
              {screen === SCREENS.INVENTORY && (
                <div className="max-h-60 overflow-y-auto">
                  <p className="text-gray-600 text-xs mb-2">[ Inventory — คลิกเพื่อจัดการ ]</p>
                  {inventory.length === 0 && <p className="text-gray-700 text-xs">ว่างเปล่า...</p>}
                  {inventory.map(item => (
                    <div key={item.instanceId} className="flex items-center gap-2 py-1 border-b border-gray-900 text-xs">
                      <span>{item.emoji}</span>
                      <span className={`flex-1 ${GRADE_COLOR[item.grade] || 'text-gray-400'}`}>
                        {item.name}{item.enhancement > 0 ? ` +${item.enhancement}` : ''}
                      </span>
                      {item.equipped && <span className="text-amber-600 text-xs">[ใส่อยู่]</span>}
                      {!item.equipped && ['HEAD','CHEST','MAIN_HAND','OFF_HAND','GLOVES','LEGS','FEET'].includes(item.type) && (
                        <button onClick={() => handleEquip(item.instanceId, item.type)}
                          className="text-blue-500 hover:text-blue-300 text-xs">ใส่</button>
                      )}
                      {!item.equipped && (
                        <button onClick={() => handleSell(item.instanceId, item.name)}
                          className="text-gray-600 hover:text-gray-400 text-xs">{item.sellPrice}G ขาย</button>
                      )}
                    </div>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-2">← กลับ</Btn>
                </div>
              )}

              {/* SHOP */}
              {screen === SCREENS.SHOP && (
                <div className="max-h-60 overflow-y-auto">
                  <p className="text-gray-600 text-xs mb-2">[ ร้านค้า — Gold: {gold.toLocaleString()} ]</p>
                  {shopItems.map(item => (
                    <div key={item.itemId} className="flex items-center gap-2 py-1 border-b border-gray-900 text-xs">
                      <span>{item.emoji}</span>
                      <span className={`flex-1 ${GRADE_COLOR[item.grade] || 'text-gray-400'}`}>{item.name}</span>
                      <span className="text-yellow-600">{item.buyPrice}G</span>
                      <button onClick={() => handleBuy(item.itemId, item.name, item.buyPrice)}
                        disabled={gold < item.buyPrice}
                        className="text-green-500 hover:text-green-300 disabled:text-gray-700 text-xs">ซื้อ</button>
                    </div>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-2">← กลับ</Btn>
                </div>
              )}

              {/* NPC LIST */}
              {screen === SCREENS.NPC && (
                <div>
                  <p className="text-gray-600 text-xs mb-2">[ NPC ในเมือง ]</p>
                  {npcs.map(n => (
                    <button key={n.npcId} onClick={() => handleTalkNPC(n.npcId)}
                      className="w-full flex items-center gap-2 py-1 border-b border-gray-900 text-xs text-left hover:text-amber-300">
                      <span>{n.emoji}</span>
                      <span className="flex-1">{n.name} <span className="text-gray-600">— {n.title}</span></span>
                      <span className="text-pink-600">❤️ {n.affection}</span>
                    </button>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-2">← กลับ</Btn>
                </div>
              )}

              {/* DUNGEON LIST */}
              {screen === SCREENS.DUNGEON_LIST && (
                <div className="max-h-72 overflow-y-auto">
                  <p className="text-gray-600 text-xs mb-3">[ 🏰 เลือก Dungeon ]</p>
                  {dungeonList.map(d => (
                    <div key={d.id} className="border border-gray-800 rounded p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{d.emoji}</span>
                        <span className="text-amber-300 text-xs font-bold">{d.nameTH}</span>
                        <span className={`text-xs ml-auto ${DIFFICULTY_COLOR[d.difficulty] || 'text-gray-400'}`}>
                          ★{'★'.repeat(d.difficulty - 1)}{'☆'.repeat(3 - d.difficulty)} {d.difficultyLabel}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mb-1 leading-relaxed">{d.desc.substring(0, 80)}...</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Lv.{d.minLevel}+ · {d.totalRooms} ห้อง</span>
                        {d.levelLocked && <span className="text-red-600 ml-auto">🔒 ต้อง Lv.{d.minLevel}</span>}
                        {d.onCooldown && <span className="text-orange-600 ml-auto">⏳ {d.cooldownHoursLeft} ชั่วโมง</span>}
                        {d.canEnter && (
                          <button onClick={() => handleEnterDungeon(d.id)} disabled={busy}
                            className="ml-auto px-2 py-0.5 border border-amber-700 text-amber-400 hover:bg-amber-900/20 rounded text-xs disabled:opacity-40">
                            เข้า Dungeon →
                          </button>
                        )}
                        {d.hasActiveRun && (
                          <button onClick={() => handleEnterDungeon(d.id)} disabled={busy}
                            className="ml-auto px-2 py-0.5 border border-blue-700 text-blue-400 hover:bg-blue-900/20 rounded text-xs disabled:opacity-40">
                            กลับเข้า →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-1">← กลับ</Btn>
                </div>
              )}

              {/* DUNGEON ROOM */}
              {screen === SCREENS.DUNGEON_ROOM && dungeonRoom && (
                <div>
                  {/* Room log */}
                  <div className="max-h-28 overflow-y-auto mb-2">
                    {dungeonLog.slice(-12).map((line, i) => (
                      <p key={i} className={`text-xs leading-relaxed ${
                        line.startsWith('─') ? 'text-gray-700' :
                        line.startsWith('✅') || line.startsWith('🏆') ? 'text-green-400' :
                        line.startsWith('💀') || line.startsWith('🩸') ? 'text-red-400' :
                        line.startsWith('💰') ? 'text-yellow-400' :
                        line.startsWith('💚') ? 'text-green-400' :
                        line.startsWith('📍') ? 'text-amber-400' :
                        'text-amber-100/80'
                      }`}>{line}</p>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <span>{dungeonInfo?.emoji} {dungeonInfo?.nameTH}</span>
                    <span className="ml-auto">ห้อง {(dungeonRun?.currentRoom || 0) + 1}/{dungeonRun?.totalRooms}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-800 rounded mb-3">
                    <div className="h-1 bg-amber-700 rounded transition-all"
                      style={{ width: `${((dungeonRun?.currentRoom || 0) / (dungeonRun?.totalRooms || 1)) * 100}%` }} />
                  </div>

                  {/* Room type actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* COMBAT / BOSS */}
                    {(dungeonRoom.type === 'combat' || dungeonRoom.type === 'boss') && (
                      <>
                        <Btn onClick={handleDungeonBattle} disabled={busy}
                          className={dungeonRoom.type === 'boss' ? 'border-red-800 text-red-400' : ''}>
                          {dungeonRoom.type === 'boss' ? '💀 สู้ Boss' : '⚔️ เข้าสู้'}
                        </Btn>
                        {dungeonRoom.type !== 'boss' && (
                          <Btn onClick={handleDungeonFlee} disabled={busy}>🏃 Flee</Btn>
                        )}
                      </>
                    )}
                    {/* TRAP */}
                    {dungeonRoom.type === 'trap' && (
                      <>
                        <Btn onClick={() => handleDungeonAction('resolve_trap')} disabled={busy}>
                          ⚡ รับมือกับดัก
                        </Btn>
                        <Btn onClick={handleDungeonFlee} disabled={busy}>🏃 Flee</Btn>
                      </>
                    )}
                    {/* TREASURE */}
                    {dungeonRoom.type === 'treasure' && (
                      <>
                        <Btn onClick={() => handleDungeonAction('loot_treasure')} disabled={busy}>
                          💰 ค้นหาสมบัติ
                        </Btn>
                        <Btn onClick={handleDungeonFlee} disabled={busy}>🏃 Flee</Btn>
                      </>
                    )}
                    {/* REST */}
                    {dungeonRoom.type === 'rest' && (
                      <>
                        <Btn onClick={() => handleDungeonAction('rest')} disabled={busy}>
                          💚 พักฟื้น
                        </Btn>
                        <Btn onClick={handleDungeonFlee} disabled={busy}>🏃 Flee</Btn>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* DUNGEON CLEAR */}
              {screen === SCREENS.DUNGEON_CLEAR && (
                <div className="text-center">
                  <p className="text-green-400 text-sm mb-1">🏆 Dungeon Clear!</p>
                  {dungeonReward && (
                    <div className="text-xs text-gray-400 mb-2 space-y-0.5">
                      {dungeonReward.gold > 0 && <p className="text-yellow-400">💰 +{dungeonReward.gold} Gold</p>}
                      {dungeonReward.xp  > 0 && <p className="text-purple-400">⭐ +{dungeonReward.xp} XP</p>}
                      {dungeonReward.items?.map((it, i) => (
                        <p key={i} className="text-blue-400">📦 {it.emoji || ''} {it.name || it}</p>
                      ))}
                    </div>
                  )}
                  <Btn onClick={() => { setScreen(SCREENS.WORLD); setDungeonReward(null); }}>← กลับ Town</Btn>
                </div>
              )}

              {/* NPC TALK */}
              {screen === SCREENS.NPC_TALK && activeNPC && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">
                    {activeNPC.emoji} <span className="text-amber-400">{activeNPC.name}</span>
                    {' '}❤️ {activeNPC.affection}/100
                    {' '}· ให้ของได้ {activeNPC.giftLimit - activeNPC.giftUsedToday}/{activeNPC.giftLimit} ครั้ง
                  </div>
                  <p className="text-gray-300 text-sm italic mb-3">"{activeNPC.dialog}"</p>
                  <p className="text-gray-600 text-xs mb-2">เลือก item จาก inventory เพื่อให้ของขวัญ:</p>
                  <div className="max-h-28 overflow-y-auto mb-2">
                    {inventory.filter(i => i.type === 'MATERIAL' || i.type === 'JUNK' || i.type === 'CONSUMABLE').map(item => (
                      <button key={item.instanceId}
                        onClick={() => handleGiveGift(activeNPC.npcId, item.instanceId, item.name)}
                        className="w-full flex items-center gap-2 py-1 text-xs border-b border-gray-900 hover:text-amber-300 text-left">
                        <span>{item.emoji}</span>
                        <span className={GRADE_COLOR[item.grade]}>{item.name}</span>
                      </button>
                    ))}
                    {inventory.filter(i => ['MATERIAL','JUNK','CONSUMABLE'].includes(i.type)).length === 0 && (
                      <p className="text-gray-700 text-xs">ไม่มี item ที่จะให้ได้</p>
                    )}
                  </div>
                  <Btn onClick={() => setScreen(SCREENS.NPC)}>← กลับ</Btn>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Btn({ onClick, disabled, children, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-2 border border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 transition text-xs disabled:opacity-40 disabled:cursor-not-allowed rounded ${className}`}>
      {children}
    </button>
  );
}

function getZoneName(zone) {
  const names = {
    town_square:    'Town Square',
    town_outskirts: 'ชานเมือง',
    forest_path:    'ทางป่า',
    dark_cave:      'ถ้ำมืด',
  };
  return names[zone] || zone;
}
