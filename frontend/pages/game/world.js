// pages/game/world.js — Ashenveil Main Game Hub
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { loadCharacter, getBalance, explore, travel, startBattle, battleAction, rest,
         getInventory, getShopItems, buyItem, sellItem, equipItem, unequipItem,
         getNPCs, talkNPC, giveGift } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';

const SCREENS = {
  WORLD:     'world',
  EXPLORE:   'explore',
  BATTLE:    'battle',
  INVENTORY: 'inventory',
  SHOP:      'shop',
  NPC:       'npc',
  NPC_TALK:  'npc_talk',
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
  const [busy,       setBusy]       = useState(false);
  const [atmosphere, setAtmosphere] = useState('');
  const [fontSize,   setFontSize]   = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('game_fontSize') || 'sm';
    return 'sm';
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
        setTimeout(() => { setBattle(null); setScreen(SCREENS.WORLD); }, 1200);
      } else if (data.result === 'defeat' || data.result === 'fled') {
        setTimeout(() => { setBattle(null); setScreen(SCREENS.WORLD); }, 1200);
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
