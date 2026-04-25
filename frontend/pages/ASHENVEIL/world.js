// pages/game/world.js — Ashenveil Main Game Hub
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { loadCharacter, getBalance, explore, travel, startBattle, battleAction, rest,
         getInventory, getShopItems, buyItem, sellItem, equipItem, unequipItem,
         getNPCs, talkNPC, giveGift,
         getDungeons, getDungeonRun, enterDungeon, dungeonAction, dungeonFlee,
         requestVerify, getVerifyStatus,
         getQuests, claimQuestReward,
         getQuestLog, acceptSideQuest,
         getRPShop, buyRPItem,
         getSkills, unlockSkill,
         getCharacterProfile, allocateStat,
         getEnhanceInfo, enhanceItem,
         getWeeklyQuests, claimWeeklyReward,
         getAchievements,
         getLoginBonusStatus, claimLoginBonus,
         getLeaderboard,
         getWorldBoss, attackWorldBoss,
         getCraftingRecipes, craftItem } from '../../lib/gameApi';
import toast from 'react-hot-toast';
import Head from 'next/head';
import AshenveilSettings, { useAshenveilSettings, FONT_SIZES } from '../../components/AshenveilSettings';
import { connectSocket, getSocket } from '../../lib/socket';

// Zone boss ID map (mirrors maps.js ZONE_LIST bossId)
const ZONE_BOSSES = {
  town_outskirts:    'outskirts_boss',
  forest_path:       'forest_boss',
  dark_cave:         'cave_boss',
  city_ruins:        'ruins_boss',
  cursed_marshlands: 'marsh_boss',
  void_frontier:     'void_boss',
  shadowfell_depths: 'shadow_boss',
  vorath_citadel:    'vorath_boss',
};

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
  SETTINGS:       'settings',
  QUESTS:         'quests',
  QUEST_LOG:      'quest_log',
  RP_SHOP:        'rp_shop',
  SKILLS:         'skills',
  CHARACTER:      'character',
  ENHANCE:        'enhance',
  WEEKLY_QUESTS:  'weekly_quests',
  ACHIEVEMENTS:   'achievements',
  WORLD_BOSS:     'world_boss',
  LEADERBOARD:    'leaderboard',
  CRAFTING:       'crafting',
};

const DIFFICULTY_COLOR = ['', 'text-green-400', 'text-yellow-400', 'text-red-400'];

// ─────────────────────────────────────────────────────────
//  BGM Config — วาง Suno URL หลังจาก generate แล้ว
//  แนะนำ: 16-bit SNES style (ดู prompt ในไฟล์ BGM_PROMPTS.md)
// ─────────────────────────────────────────────────────────
const BGM = {
  town:    '/bgm/ashenveil-1.mp3',  // Ashenveil BGM 1 (ทุก zone ใช้ track เดียวก่อน)
  field:   '/bgm/ashenveil-1.mp3',
  cave:    '/bgm/ashenveil-1.mp3',
  dungeon: '/bgm/ashenveil-1.mp3',
  battle:  '/bgm/ashenveil-1.mp3',
  boss:    '/bgm/ashenveil-1.mp3',
};

// zone → bgm key
const ZONE_BGM = {
  town_square:       'town',
  town_outskirts:    'field',
  forest_path:       'field',
  dark_cave:         'cave',
  city_ruins:        'cave',
  cursed_marshlands: 'field',
  void_frontier:     'boss',
};

// Full zone list for travel screen (minLevel gating)
const ZONE_LIST = [
  { id: 'town_square',       name: '🏘️ Town Square',        lv: 'Safe',    minLevel: 1  },
  { id: 'town_outskirts',    name: '🌾 ชานเมือง',           lv: 'Lv.1+',   minLevel: 1  },
  { id: 'forest_path',       name: '🌲 ทางป่า',             lv: 'Lv.3+',   minLevel: 3  },
  { id: 'dark_cave',         name: '🕳️ ถ้ำมืด',            lv: 'Lv.5+',   minLevel: 5  },
  { id: 'city_ruins',        name: '🏚️ ซากเมือง',          lv: 'Lv.10+',  minLevel: 10 },
  { id: 'cursed_marshlands', name: '🌿 หนองสาปแช่ง',       lv: 'Lv.18+',  minLevel: 18 },
  { id: 'void_frontier',     name: '🌀 ชายขอบ Void',        lv: 'Lv.28+',  minLevel: 28 },
  { id: 'shadowfell_depths', name: '🌑 ห้วงลึกแห่งเงา',    lv: 'Lv.38+',  minLevel: 38 },
  { id: 'vorath_citadel',    name: '🏰 ป้อมปราการ Vorath',  lv: 'Lv.50+',  minLevel: 50 },
];

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
  const [battleSkills, setBattleSkills] = useState([]);  // available skills in current battle
  const [inventory,  setInventory]  = useState([]);
  const [equipment,  setEquipment]  = useState({});
  const [shopItems,  setShopItems]  = useState([]);
  const [npcs,       setNPCs]       = useState([]);
  const [activeNPC,  setActiveNPC]  = useState(null);
  const [npcLineIdx,  setNpcLineIdx]  = useState(0);   // typewriter: which line we're on
  const [npcTyped,    setNpcTyped]    = useState('');   // typewriter: chars revealed so far
  const [npcTyping,   setNpcTyping]   = useState(false); // typewriter: animation running
  const [busy,          setBusy]         = useState(false);
  const [atmosphere,    setAtmosphere]   = useState('');
  const [dungeonList,   setDungeonList]  = useState([]);
  const [dungeonRun,    setDungeonRun]   = useState(null);  // current run state
  const [dungeonRoom,   setDungeonRoom]  = useState(null);  // current room data
  const [dungeonInfo,   setDungeonInfo]  = useState(null);  // dungeon meta
  const [dungeonLog,    setDungeonLog]   = useState([]);    // room-specific log
  const [dungeonReward, setDungeonReward]= useState(null);  // clear rewards
  const [dungeonRunId,  setDungeonRunId] = useState(null);  // active dungeon run ID (for battle)

  // ── Daily Quests ──
  const [questData,      setQuestData]      = useState(null);   // { quests, bonusClaimed, allCompleted, bonus }
  const [questBadge,     setQuestBadge]     = useState(false);  // มีเควสที่รับรางวัลได้

  // ── Quest Log (Story + Side) ──
  const [questLog,       setQuestLog]       = useState(null);   // { story, sideActive, sideCompleted, sideAvailable }
  const [questLogTab,    setQuestLogTab]    = useState('story');  // 'story' | 'side'

  // ── RP Shop ──
  const [rpShopItems,    setRPShopItems]    = useState([]);
  const [rpShopLoading,  setRPShopLoading]  = useState(false);

  // ── Skills ──
  const [skillsData,     setSkillsData]     = useState(null);   // { charClass, classSkills, passiveSkill, unlockedSkills, skillPoints }
  const [skillsLoading,  setSkillsLoading]  = useState(false);

  // ── Character Profile / Stat Allocation ──
  const [charProfile,    setCharProfile]    = useState(null);   // full character stats
  const [charLoading,    setCharLoading]    = useState(false);

  // ── Enhancement ──
  const [enhanceInfo,    setEnhanceInfo]    = useState(null);   // { item, recipe, canEnhance, currentGold }
  const [enhanceTarget,  setEnhanceTarget]  = useState(null);   // { instanceId, name }
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  // ── Weekly Quests ──
  const [weeklyData,     setWeeklyData]     = useState(null);   // { weekKey, quests, allCompleted, bonusClaimed, bonus }
  const [weeklyBadge,    setWeeklyBadge]    = useState(false);

  // ── Achievements ──
  const [achData,        setAchData]        = useState(null);   // { achievements, unlockedCount, totalCount }
  const [achLoading,     setAchLoading]     = useState(false);

  // ── Login Bonus ──
  const [loginBonusData,   setLoginBonusData]   = useState(null);  // { streak, reward, alreadyClaimed }
  const [showLoginBonus,   setShowLoginBonus]   = useState(false); // popup visible

  // ── World Boss ──
  const [worldBossData,    setWorldBossData]    = useState(null);  // { active, boss, myDamage, cooldown, topPlayers }
  const [worldBossBusy,    setWorldBossBusy]    = useState(false);

  // ── Leaderboard ──
  const [leaderboardData,  setLeaderboardData]  = useState(null);  // { level, kills, achievements }
  const [leaderboardTab,   setLeaderboardTab]   = useState('level'); // 'level' | 'kills' | 'achievements'
  const [leaderboardLoad,  setLeaderboardLoad]  = useState(false);

  // ── Crafting ──
  const [craftingRecipes,  setCraftingRecipes]  = useState([]);
  const [craftingLoad,     setCraftingLoad]     = useState(false);
  const [craftingTab,      setCraftingTab]      = useState('all'); // 'all' | category filter
  const [craftingBusy,     setCraftingBusy]     = useState(false);

  // ── Quest Popup (real-time progress via socket) ──
  const [questPopup,      setQuestPopup]       = useState(null);  // { type, questName, hint, progress, total, rewards, ... }
  const questPopupTimer   = useRef(null);

  // ── Settings / Verify ──
  const [verifyStatus,   setVerifyStatus]   = useState(null);   // { verified, tiktokUniqueId, vjCooldownDaysLeft, canChangeVJ }
  const [settingsTiktok, setSettingsTiktok] = useState('');     // input username
  const [settingsCode,   setSettingsCode]   = useState('');     // code ที่ได้จาก server
  const [settingsStep,   setSettingsStep]   = useState('status');// 'status' | 'input' | 'wait'
  const [settingsPolling,setSettingsPolling]= useState(false);
  const settingsPollRef  = useRef(null);
  // ── Display settings (theme / font / brightness) shared across all Ashenveil pages ──
  const ashSettings = useAshenveilSettings();
  const { fontSize, setFontSize, cssFilter: ashFilter, fontPx } = ashSettings;

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
      if (!u) { router.replace('/ashenveil'); return; }

      // ── Ensure socket is connected + authenticated ──────────────────────────
      // กรณีผู้เล่นเปิด /ASHENVEIL/world ตรงๆ โดยไม่ผ่าน dashboard
      // socket จะยังไม่ได้ auth → ต้อง connect ก่อน quest popup ถึงจะ work
      try {
        const sock = getSocket();
        if (!sock.connected) {
          const token = await u.getIdToken();
          connectSocket(token);
        } else if (!sock._authenticated) {
          // socket connected แต่อาจ auth หาย (เช่น หลัง server restart)
          const token = await u.getIdToken();
          sock.emit('authenticate', { token });
        }
      } catch {}
      // ───────────────────────────────────────────────────────────────────────

      try {
        const { data } = await loadCharacter();
        if (!data.hasCharacter) { router.replace('/ashenveil'); return; }
        setChar(data.character);
        setGold(data.character.gold || 0);
        setRP(data.character.realmPoints || 0);
        setZone(data.character.location || 'town_square');
        addLog(`👤 ${data.character.name} (${data.character.race} ${data.character.class} Lv.${data.character.level})`);
        addLog(`📍 ${getZoneName(data.character.location || 'town_square')}`);
        // Auto-load daily quests + quest log (for progression visibility + badge)
        loadQuests().catch(() => {});
        loadQuestLog().catch(() => {});

        // Auto-check login bonus — backend returns canClaim not alreadyClaimed
        try {
          const { data: lb } = await getLoginBonusStatus();
          if (lb.canClaim) {
            setLoginBonusData(lb);
            setShowLoginBonus(true);
          }
        } catch {}
      } catch {
        router.replace('/ashenveil');
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

  // ===== Daily Quests =====
  const loadQuests = useCallback(async () => {
    try {
      const { data } = await getQuests();
      setQuestData(data);
      // badge = มีเควสที่ complete แต่ยังไม่ claim
      const hasUnclaimed = data.quests.some(q => q.completed && !q.claimed)
        || (data.allCompleted && !data.bonusClaimed);
      setQuestBadge(hasUnclaimed);
    } catch {}
  }, []);

  const openQuests = useCallback(async () => {
    setScreen(SCREENS.QUESTS);
    await loadQuests();
  }, [loadQuests]);

  const handleClaimQuest = useCallback(async (questId) => {
    try {
      const { data } = await claimQuestReward(questId);
      if (data.rewards?.gold) setGold(g => g + data.rewards.gold);
      if (data.rewards?.xp)   setChar(c => c ? { ...c, xp: (c.xp || 0) + data.rewards.xp } : c);
      const label = questId === 'bonus' ? '🎁 Bonus reward' : questId;
      toast.success(`✅ รับรางวัล ${label} แล้ว! (+${data.rewards?.gold || 0}G)`);
      addLog(`🎖️ รับรางวัล Quest: +${data.rewards?.gold || 0} Gold, +${data.rewards?.xp || 0} XP`);
      await loadQuests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'รับรางวัลไม่ได้');
    }
  }, [loadQuests]);

  // ===== Quest Log (Story + Side) =====
  const loadQuestLog = useCallback(async () => {
    try {
      const { data } = await getQuestLog();
      setQuestLog(data);
    } catch {}
  }, []);

  const openQuestLog = useCallback(async () => {
    setQuestLogTab('story');
    setScreen(SCREENS.QUEST_LOG);
    await loadQuestLog();
  }, [loadQuestLog]);

  const handleAcceptSideQuest = useCallback(async (questId, questName) => {
    try {
      await acceptSideQuest(questId);
      toast.success(`✅ รับภารกิจ: ${questName}`);
      addLog(`📜 รับภารกิจพิเศษ: ${questName}`);
      await loadQuestLog();
    } catch (err) {
      toast.error(err.response?.data?.error || 'รับภารกิจไม่ได้');
    }
  }, [loadQuestLog]);

  // ===== RP Shop =====
  const loadRPShop = useCallback(async () => {
    setRPShopLoading(true);
    try {
      const { data } = await getRPShop();
      setRPShopItems(data.items || []);
      setRP(data.rp || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด RP Shop ไม่ได้');
    } finally {
      setRPShopLoading(false);
    }
  }, []);

  const openRPShop = useCallback(async () => {
    setScreen(SCREENS.RP_SHOP);
    await loadRPShop();
  }, [loadRPShop]);

  const handleBuyRPItem = useCallback(async (itemId, itemName, rpPrice) => {
    if (!confirm(`ซื้อ ${itemName} ราคา ${rpPrice} RP?`)) return;
    try {
      const { data } = await buyRPItem(itemId);
      toast.success(data.msg || 'ซื้อสำเร็จ!');
      setRP(data.newRP || 0);
      // Log granted items
      (data.granted || []).forEach(g => {
        if (g.type === 'item') addLog(`📦 ได้รับ ${g.emoji || ''} ${g.name}`);
        if (g.type === 'race') addLog(`🧬 ปลดล็อค Race: ${g.name}`);
        if (g.type === 'title') addLog(`🎖️ ปลดล็อค Title: ${g.name}`);
      });
      // Refresh list
      await loadRPShop();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ซื้อไม่ได้');
    }
  }, [loadRPShop, addLog]);

  // ===== Skills =====
  const loadSkills = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const { data } = await getSkills();
      setSkillsData(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด Skills ไม่ได้');
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const openSkills = useCallback(async () => {
    setScreen(SCREENS.SKILLS);
    await loadSkills();
  }, [loadSkills]);

  const handleUnlockSkill = useCallback(async (skillId, skillName, cost) => {
    if (!confirm(`ปลดล็อค ${skillName} (${cost} Skill Point)?`)) return;
    try {
      const { data } = await unlockSkill(skillId);
      toast.success(`✅ ปลดล็อค ${data.skillName || skillName} แล้ว!`);
      addLog(`✨ ปลดล็อค Skill: ${skillName}`);
      setChar(c => c ? { ...c, skillPoints: data.skillPoints } : c);
      await loadSkills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ปลดล็อคไม่ได้');
    }
  }, [loadSkills, addLog]);

  // ===== Character Profile + Stat Allocation =====
  const loadCharProfile = useCallback(async () => {
    setCharLoading(true);
    try {
      const { data } = await getCharacterProfile();
      setCharProfile(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด Character ไม่ได้');
    } finally {
      setCharLoading(false);
    }
  }, []);

  const openCharacter = useCallback(async () => {
    setScreen(SCREENS.CHARACTER);
    await loadCharProfile();
  }, [loadCharProfile]);

  const handleAllocateStat = useCallback(async (stat, statLabel) => {
    if (!charProfile || (charProfile.statPoints || 0) < 1) {
      return toast.error('Stat Points ไม่พอ');
    }
    try {
      const { data } = await allocateStat(stat, 1);
      toast.success(data.msg);
      addLog(`📊 เพิ่ม ${statLabel} 1 point`);
      setChar(c => c ? { ...c, statPoints: data.statPoints, hpMax: data.hpMax, mpMax: data.mpMax } : c);
      await loadCharProfile();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ใส่ Stat ไม่ได้');
    }
  }, [charProfile, loadCharProfile, addLog]);

  // ===== Enhancement =====
  const openEnhance = useCallback(async (instanceId, itemName) => {
    setEnhanceTarget({ instanceId, name: itemName });
    setEnhanceInfo(null);
    setEnhanceLoading(true);
    setScreen(SCREENS.ENHANCE);
    try {
      const { data } = await getEnhanceInfo(instanceId);
      setEnhanceInfo(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลดข้อมูล Enhance ไม่ได้');
    } finally {
      setEnhanceLoading(false);
    }
  }, []);

  const handleEnhanceItem = useCallback(async () => {
    if (!enhanceTarget || !enhanceInfo?.canEnhance) return;
    if (!confirm(`Enhance ${enhanceTarget.name} +${(enhanceInfo.currentEnhance || 0) + 1}?`)) return;
    try {
      const { data } = await enhanceItem(enhanceTarget.instanceId);
      if (data.result === 'success') {
        toast.success(data.msg, { duration: 4000 });
        addLog(`✨ ${data.msg}`);
      } else {
        toast.error(data.msg, { duration: 4000 });
        addLog(`💔 ${data.msg}`);
      }
      setGold(g => g - data.goldSpent);
      // Reload enhance info
      setEnhanceLoading(true);
      try {
        const { data: fresh } = await getEnhanceInfo(enhanceTarget.instanceId);
        setEnhanceInfo(fresh);
      } catch {
        setEnhanceInfo(null);
      } finally {
        setEnhanceLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enhance ไม่สำเร็จ');
    }
  }, [enhanceTarget, enhanceInfo, addLog]);

  // ===== Weekly Quests =====
  const loadWeeklyQuests = useCallback(async () => {
    try {
      const { data } = await getWeeklyQuests();
      setWeeklyData(data);
      const hasUnclaimed = data.quests.some(q => q.completed && !q.claimed)
        || (data.allCompleted && !data.bonusClaimed);
      setWeeklyBadge(hasUnclaimed);
    } catch {}
  }, []);

  const openWeeklyQuests = useCallback(async () => {
    setScreen(SCREENS.WEEKLY_QUESTS);
    await loadWeeklyQuests();
  }, [loadWeeklyQuests]);

  const handleClaimWeekly = useCallback(async (questId) => {
    try {
      const { data } = await claimWeeklyReward(questId);
      if (data.rewards?.gold) setGold(g => g + data.rewards.gold);
      if (data.rewards?.xp)   setChar(c => c ? { ...c, xp: (c.xp || 0) + data.rewards.xp } : c);
      const label = questId === 'bonus' ? '🏆 Weekly Bonus' : questId;
      toast.success(`✅ รับรางวัล ${label}! (+${data.rewards?.gold || 0}G)`);
      addLog(`🎖️ รับ Weekly Quest: +${data.rewards?.gold || 0} Gold, +${data.rewards?.xp || 0} XP`);
      await loadWeeklyQuests();
    } catch (err) {
      toast.error(err.response?.data?.error || 'รับรางวัลไม่ได้');
    }
  }, [loadWeeklyQuests, addLog]);

  // ===== Achievements =====
  const loadAchievements = useCallback(async () => {
    setAchLoading(true);
    try {
      const { data } = await getAchievements();
      setAchData(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด Achievements ไม่ได้');
    } finally {
      setAchLoading(false);
    }
  }, []);

  const openAchievements = useCallback(async () => {
    setScreen(SCREENS.ACHIEVEMENTS);
    await loadAchievements();
  }, [loadAchievements]);

  // ===== Login Bonus =====
  const handleClaimLoginBonus = useCallback(async () => {
    try {
      const { data } = await claimLoginBonus();
      setGold(g => g + (data.reward?.gold || 0));
      setChar(c => c ? { ...c, xp: (c.xp || 0) + (data.reward?.xp || 0) } : c);
      addLog(`🎁 Login Bonus Day ${data.streak}! +${data.reward?.gold || 0} Gold, +${data.reward?.xp || 0} XP${data.reward?.items?.length ? ', +ของพิเศษ' : ''}`);
      toast.success(`🎁 รับ Login Bonus Day ${data.streak}!`, { duration: 4000 });
      setShowLoginBonus(false);
      setLoginBonusData(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'รับ Login Bonus ไม่ได้');
    }
  }, [addLog]);

  // ===== World Boss =====
  const openWorldBoss = useCallback(async () => {
    setScreen(SCREENS.WORLD_BOSS);
    setWorldBossData(null);
    try {
      const { data } = await getWorldBoss();
      setWorldBossData(data);
    } catch { setWorldBossData({ active: false, boss: null }); }
  }, []);

  const handleAttackWorldBoss = useCallback(async () => {
    if (worldBossBusy) return;
    setWorldBossBusy(true);
    try {
      const { data } = await attackWorldBoss();
      toast.success(data.msg, { duration: 4000 });
      if (data.killed) {
        addLog(`💀 World Boss ถูกสังหาร! คุณได้อันดับ ${data.myRank}/${data.totalPlayers}`);
        addLog(`🏆 รางวัล: +${data.myReward?.gold || 0} Gold`);
        setGold(g => g + (data.myReward?.gold || 0));
      } else {
        addLog(`⚔️ โจมตี World Boss เสียหาย ${data.damage} HP!`);
      }
      // Refresh boss state
      const { data: fresh } = await getWorldBoss();
      setWorldBossData(fresh);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โจมตีไม่ได้');
    } finally {
      setWorldBossBusy(false);
    }
  }, [worldBossBusy, addLog]);

  // ===== Leaderboard =====
  const openLeaderboard = useCallback(async () => {
    setScreen(SCREENS.LEADERBOARD);
    setLeaderboardLoad(true);
    try {
      const { data } = await getLeaderboard();
      setLeaderboardData(data);
    } catch { toast.error('โหลด Leaderboard ไม่ได้'); }
    finally { setLeaderboardLoad(false); }
  }, []);

  // ===== Crafting =====
  const openCrafting = useCallback(async () => {
    setScreen(SCREENS.CRAFTING);
    setCraftingLoad(true);
    try {
      const { data } = await getCraftingRecipes();
      setCraftingRecipes(data.recipes || []);
    } catch { toast.error('โหลด Crafting ไม่ได้'); }
    finally { setCraftingLoad(false); }
  }, []);

  const handleCraft = useCallback(async (recipeId) => {
    if (craftingBusy) return;
    setCraftingBusy(true);
    try {
      const { data } = await craftItem(recipeId);
      toast.success(data.msg || 'Craft สำเร็จ!');
      // Refresh recipes (inventory changed)
      const { data: fresh } = await getCraftingRecipes();
      setCraftingRecipes(fresh.recipes || []);
      // Refresh gold
      const { data: bal } = await getBalance();
      setGold(bal.gold); setRP(bal.rp);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Craft ล้มเหลว');
    } finally { setCraftingBusy(false); }
  }, [craftingBusy]);

  // ===== Settings =====
  const openSettings = useCallback(async () => {
    setSettingsStep('status');
    setSettingsCode('');
    setSettingsTiktok('');
    setScreen(SCREENS.SETTINGS);
    try {
      const { data } = await getVerifyStatus();
      setVerifyStatus(data);
    } catch {
      setVerifyStatus(null);
    }
  }, []);

  const handleRequestVerifyCode = useCallback(async () => {
    const clean = settingsTiktok.replace(/^@/, '').trim();
    if (!clean) return toast.error('กรุณาใส่ TikTok username');
    try {
      const { data } = await requestVerify(clean);
      setSettingsCode(data.code);
      setSettingsStep('wait');
      setSettingsPolling(true);
      toast.success('ได้ code แล้ว! พิมพ์ใน TikTok Live ภายใน 10 นาที');
    } catch (err) {
      toast.error(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  }, [settingsTiktok]);

  // polling verify status ใน settings
  useEffect(() => {
    if (!settingsPolling) return;
    settingsPollRef.current = setInterval(async () => {
      try {
        const { data } = await getVerifyStatus();
        if (data.verified) {
          clearInterval(settingsPollRef.current);
          setSettingsPolling(false);
          setVerifyStatus(data);
          setSettingsStep('status');
          setSettingsCode('');
          toast.success('✅ ยืนยัน TikTok สำเร็จ! ตอนนี้คุณรับ Gold จาก Gift ได้แล้ว');
          addLog('✅ Verify TikTok สำเร็จ — รับ Gold จาก Gift ได้แล้ว!');
        }
      } catch {}
    }, 3000);
    // หยุดหลัง 12 นาที
    const t = setTimeout(() => {
      clearInterval(settingsPollRef.current);
      setSettingsPolling(false);
      toast.error('หมดเวลา — ลอง verify ใหม่อีกครั้ง');
      setSettingsStep('input');
    }, 12 * 60 * 1000);
    return () => { clearInterval(settingsPollRef.current); clearTimeout(t); };
  }, [settingsPolling]);

  // ── BGM: เล่น track ตาม key พร้อม crossfade ──
  const fadeIntervalRef = useRef(null);
  const playBgm = useCallback((key) => {
    const url = BGM[key] || '';
    if (!url) return;

    // สร้าง audio element ครั้งแรก
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop   = true;
      audioRef.current.volume = bgmVolume;
    }

    // ถ้า track เดิม ไม่ต้องทำอะไร
    if (bgmKeyRef.current === key) {
      if (bgmEnabled && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    // เปลี่ยน track — crossfade (ถ้า track ต่างกัน จริงๆ)
    const prevUrl = BGM[bgmKeyRef.current] || '';
    bgmKeyRef.current = key;

    if (!bgmEnabled || !prevUrl || prevUrl === url) {
      // ไม่มีเสียงเดิม หรือเป็น url เดียวกัน — switch ตรงๆ
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      if (bgmEnabled) audioRef.current.play().catch(() => {});
      return;
    }

    // Crossfade: fade out → swap → fade in
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const targetVol = bgmVolume;
    let vol = audioRef.current.volume;
    const step = targetVol / 15; // ~300ms fade at 20ms interval

    fadeIntervalRef.current = setInterval(() => {
      vol = Math.max(0, vol - step);
      if (audioRef.current) audioRef.current.volume = vol;
      if (vol <= 0) {
        clearInterval(fadeIntervalRef.current);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = url;
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0;
          audioRef.current.play().catch(() => {});
          // Fade in
          let inVol = 0;
          const inInterval = setInterval(() => {
            inVol = Math.min(targetVol, inVol + step);
            if (audioRef.current) audioRef.current.volume = inVol;
            if (inVol >= targetVol) clearInterval(inInterval);
          }, 20);
        }
      }
    }, 20);
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

  // ── Quest real-time notifications (socket events from quest_engine) ──
  const showQuestPopup = useCallback((data) => {
    if (questPopupTimer.current) clearTimeout(questPopupTimer.current);
    setQuestPopup(data);
    const dur = data.popupType === 'complete' ? 6000 : 3500;
    questPopupTimer.current = setTimeout(() => setQuestPopup(null), dur);
  }, []);

  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;

    // Debounce reload — กัน flood ถ้า event ยิงถี่
    let reloadTimer = null;
    const scheduleReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { loadQuestLog().catch(() => {}); }, 800);
    };

    const onProgress = (d) => { showQuestPopup({ popupType: 'progress', ...d }); scheduleReload(); };
    const onStep     = (d) => { showQuestPopup({ popupType: 'step',     ...d }); scheduleReload(); };
    const onComplete = (d) => { showQuestPopup({ popupType: 'complete', ...d }); scheduleReload(); };
    const onStarted  = (d) => { showQuestPopup({ popupType: 'started',  ...d }); scheduleReload(); };

    sock.on('quest_progress', onProgress);
    sock.on('quest_step',     onStep);
    sock.on('quest_complete', onComplete);
    sock.on('quest_started',  onStarted);

    return () => {
      clearTimeout(reloadTimer);
      sock.off('quest_progress', onProgress);
      sock.off('quest_step',     onStep);
      sock.off('quest_complete', onComplete);
      sock.off('quest_started',  onStarted);
      if (questPopupTimer.current) clearTimeout(questPopupTimer.current);
    };
  }, [showQuestPopup, loadQuestLog]);

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
      setBattleSkills(data.availableSkills || []);
      setScreen(SCREENS.BATTLE);
    } catch (err) {
      const msg = err.response?.data?.error || 'เริ่ม Battle ไม่ได้';
      addLog(`⛔ ${msg}`);
      toast.error(msg);
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
      setBattleLog(prev => [...prev, '─────', ...(data.log || [])]);

      if (data.result === 'victory') {
        const rewards = data.rewards || {};
        if (rewards.gold) setGold(g => g + rewards.gold);
        if (rewards.levelUp) setChar(c => c ? { ...c, level: rewards.levelUp } : c);

        // Was this a dungeon battle?
        if (data.dungeonRunId) {
          setTimeout(async () => {
            setBattle(null);

            // Backend told us dungeon was cleared (boss killed)
            if (data.dungeonCleared) {
              const cr = data.dungeonClearRewards || {};
              // Add clear gold to balance (boss gold already counted in rewards)
              if (cr.gold) setGold(g => g + cr.gold);
              if (data.dungeonNewLevel) setChar(c => c ? { ...c, level: data.dungeonNewLevel } : c);
              setDungeonReward({
                gold:  (rewards.gold || 0) + (cr.gold || 0),
                xp:    (rewards.xp   || 0) + (cr.xp   || 0),
                items: [...(rewards.items || []), ...(cr.items || [])],
              });
              setDungeonRun(null);
              setDungeonRunId(null);
              setScreen(SCREENS.DUNGEON_CLEAR);
              return;
            }

            // Regular combat room — fetch next room state
            try {
              const runRes = await getDungeonRun();
              if (runRes.data.run) {
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
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await getInventory();
      setInventory(data.items || []);
      setEquipment(data.equipment || {});
      setScreen(SCREENS.INVENTORY);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด Inventory ไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
      setInventory(inv.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ขายไม่ได้');
    }
  }, []);

  // ===== Shop =====
  const loadShop = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await getShopItems();
      setShopItems(data.items || []);
      setScreen(SCREENS.SHOP);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลดร้านค้าไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await getNPCs();
      setNPCs(data.npcs || []);
      setScreen(SCREENS.NPC);
    } catch (err) {
      toast.error(err.response?.data?.error || 'โหลด NPC ไม่ได้');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleTalkNPC = useCallback(async (npcId) => {
    try {
      const { data } = await talkNPC(npcId);
      setActiveNPC(data);
      setNpcLineIdx(0);
      setNpcTyped('');
      setNpcTyping(true);
      setScreen(SCREENS.NPC_TALK);
    } catch (err) {
      toast.error(err.response?.data?.error || 'คุยกับ NPC ไม่ได้');
    }
  }, []);

  // ── Typewriter effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!npcTyping || !activeNPC) return;
    const lines = activeNPC.lines || [activeNPC.dialog || ''];
    const currentLine = lines[npcLineIdx] || '';
    if (npcTyped.length >= currentLine.length) {
      setNpcTyping(false);
      return;
    }
    const timer = setTimeout(() => {
      setNpcTyped(currentLine.slice(0, npcTyped.length + 1));
    }, 28); // ~35 chars/sec
    return () => clearTimeout(timer);
  }, [npcTyping, npcTyped, npcLineIdx, activeNPC]);

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
      setInventory(inv.data.items || []);
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
      setBattleSkills(data.availableSkills || []);
      setScreen(SCREENS.BATTLE);
    } catch (err) {
      const msg = err.response?.data?.error || 'เริ่ม Battle ไม่ได้';
      addLog(`⛔ ${msg}`);
      toast.error(msg);
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

      {/* ── QUEST NOTIFICATION POPUP ── */}
      {questPopup && (
        <div className="fixed top-4 right-4 z-[60] max-w-xs w-full pointer-events-none"
          style={{ fontFamily: 'system-ui, sans-serif', animation: 'slideInRight 0.3s ease' }}>
          <style>{`
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(24px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes shimmer {
              0%   { background-position: -200% center; }
              100% { background-position:  200% center; }
            }
          `}</style>

          {questPopup.popupType === 'complete' ? (
            /* ── Quest Complete ── */
            <div className="rounded-xl border border-amber-500 bg-gray-950 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-900/60 to-yellow-900/40 px-4 py-3">
                <p className="text-amber-300 text-xs font-bold tracking-widest uppercase mb-0.5">
                  {questPopup.type === 'story' ? '📖 เนื้อเรื่อง' : '📋 ภารกิจ'}
                </p>
                <p className="text-amber-100 text-sm font-bold">✅ สำเร็จ! {questPopup.questName}</p>
              </div>
              <div className="px-4 py-2 space-y-0.5">
                {questPopup.rewards?.xp  > 0 && <p className="text-purple-400 text-xs">⭐ +{questPopup.rewards.xp} XP</p>}
                {questPopup.rewards?.gold > 0 && <p className="text-yellow-400 text-xs">💰 +{questPopup.rewards.gold} Gold</p>}
                {questPopup.nextQuest && (
                  <p className="text-sky-400 text-xs mt-1">▶ ต่อไป: {questPopup.nextQuest}</p>
                )}
              </div>
            </div>

          ) : questPopup.popupType === 'started' ? (
            /* ── Quest Started ── */
            <div className="rounded-xl border border-sky-700 bg-gray-950 shadow-xl overflow-hidden">
              <div className="bg-sky-900/40 px-4 py-2">
                <p className="text-sky-400 text-xs font-bold tracking-widest uppercase mb-0.5">
                  {questPopup.type === 'story' ? '📖 เนื้อเรื่อง' : '📋 ภารกิจ'} — ใหม่!
                </p>
                <p className="text-sky-100 text-sm font-bold">🆕 {questPopup.questName}</p>
              </div>
              {questPopup.hint && (
                <p className="px-4 py-2 text-gray-400 text-xs">{questPopup.hint}</p>
              )}
            </div>

          ) : questPopup.popupType === 'step' ? (
            /* ── Next Step Unlocked ── */
            <div className="rounded-xl border border-green-800 bg-gray-950 shadow-xl overflow-hidden">
              <div className="bg-green-900/30 px-4 py-2">
                <p className="text-green-400 text-xs font-bold tracking-widest uppercase mb-0.5">
                  {questPopup.type === 'story' ? '📖 เนื้อเรื่อง' : '📋 ภารกิจ'} — ขั้นตอนถัดไป
                </p>
                <p className="text-green-200 text-sm font-bold">
                  {questPopup.questName}
                  <span className="text-green-500 font-normal text-xs ml-2">
                    ({questPopup.stepIndex + 1}/{questPopup.stepTotal})
                  </span>
                </p>
              </div>
              {questPopup.hint && (
                <p className="px-4 py-2 text-gray-300 text-xs">{questPopup.hint}</p>
              )}
            </div>

          ) : (
            /* ── Progress Update ── */
            <div className="rounded-xl border border-gray-700 bg-gray-950/95 shadow-lg overflow-hidden">
              <div className="px-4 py-2">
                <p className="text-gray-500 text-xs mb-0.5">
                  {questPopup.type === 'story' ? '📖 เนื้อเรื่อง' : '📋 ภารกิจ'}
                </p>
                <p className="text-gray-200 text-xs font-semibold truncate">{questPopup.questName}</p>
                {questPopup.hint && (
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{questPopup.hint}</p>
                )}
                {questPopup.total > 1 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>ความคืบหน้า</span>
                      <span className="text-amber-400 font-bold">{questPopup.progress}/{questPopup.total}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(questPopup.progress / questPopup.total) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LOGIN BONUS POPUP ── */}
      {showLoginBonus && loginBonusData && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(2px)' }}>
          <div className="bg-gray-950 border border-amber-700/60 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              boxShadow: '0 0 40px #92400e40',
              animation: 'ash-slide-up 0.3s ease',
            }}>
            <style>{`@keyframes ash-slide-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Header */}
            <div className="mb-1">
              <p className="text-2xl mb-1">🌅</p>
              <p className="text-amber-400 text-base font-bold">Login Bonus</p>
              <p className="text-gray-500 text-xs">{loginBonusData.reward?.label || 'ยินดีต้อนรับกลับมา!'}</p>
            </div>

            {/* Streak dots — แสดง 7 วันล่าสุด */}
            <div className="flex justify-center gap-1.5 my-3">
              {[...Array(7)].map((_, i) => {
                const s = loginBonusData.streak || 1;
                const filled = i < Math.min(s, 7);
                const isToday = i === Math.min(s - 1, 6);
                return (
                  <div key={i}
                    className="flex flex-col items-center gap-0.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                      style={{
                        background: filled ? (isToday ? '#f59e0b' : '#92400e80') : '#1f2937',
                        border: isToday ? '2px solid #f59e0b' : '1px solid #374151',
                        boxShadow: isToday ? '0 0 8px #f59e0b60' : 'none',
                      }}>
                      {filled ? (isToday ? '★' : '✓') : ''}
                    </div>
                    <span className="text-[8px] text-gray-700">วัน{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-amber-500 text-xs mb-3 font-bold">
              Streak: {loginBonusData.streak} วัน
              {loginBonusData.nextRewardAt &&
                <span className="text-gray-500 font-normal"> · อีก {loginBonusData.nextRewardAt - loginBonusData.streak} วัน = Milestone!</span>}
            </p>

            {/* Rewards */}
            <div className="bg-gray-900/80 border border-amber-900/40 rounded-xl p-3 mb-4 space-y-1">
              {loginBonusData.reward?.gold > 0 && (
                <p className="text-yellow-400 text-sm">💰 +{loginBonusData.reward.gold} Gold</p>
              )}
              {loginBonusData.reward?.xp > 0 && (
                <p className="text-purple-400 text-sm">⭐ +{loginBonusData.reward.xp} XP</p>
              )}
              {(loginBonusData.reward?.items || []).map((it, i) => (
                <p key={i} className="text-blue-400 text-xs">📦 {it}</p>
              ))}
              {loginBonusData.reward?.title && (
                <p className="text-amber-300 text-xs">🎖️ ตำแหน่ง: "{loginBonusData.reward.title}"</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleClaimLoginBonus}
                className="px-4 py-2.5 border border-amber-600 text-amber-300 hover:bg-amber-900/30 rounded-xl text-sm font-bold transition">
                🎁 รับเลย!
              </button>
              <button onClick={() => setShowLoginBonus(false)}
                className="px-4 py-2.5 border border-gray-800 text-gray-600 hover:text-gray-400 rounded-xl text-sm transition">
                ทีหลัง
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-[#0a0a0a] text-amber-100 flex flex-col"
        style={{
          fontFamily:      "'Courier New', Courier, monospace",
          fontSize:        fontPx,
          filter:          ashFilter,
          transform:       ashSettings.scale !== 1.0 ? `scale(${ashSettings.scale})` : undefined,
          transformOrigin: 'top center',
        }}>

        {/* ── STATUS BAR ── */}
        {(() => {
          // XP progress
          const xp       = char?.xp       || 0;
          const xpToNext = char?.xpToNext || 100;
          const xpPct    = Math.min(100, Math.round((xp / xpToNext) * 100));

          // Daily quest count
          const dqTotal  = questData?.quests?.length || 0;
          const dqDone   = questData?.quests?.filter(q => q.completed).length || 0;
          const dqBadge  = dqDone > 0;

          // Active story quest hint (first active)
          const activeStory = questLog?.story?.find(q => q.status === 'active');
          const storyHint   = activeStory?.currentStep?.hint;
          const storyName   = activeStory?.name;

          return (
            <div className="border-b border-gray-800 bg-gray-950">
              {/* Row 1 — vitals + economy */}
              <div className="px-4 pt-2 pb-1 flex flex-wrap gap-4 text-xs">
                <span className="text-amber-400 font-bold">{char?.name}</span>
                <span className="text-gray-500">{char?.race} {char?.class} Lv.{char?.level}</span>
                <span className="text-red-400">❤️ {char?.hp}/{char?.hpMax}</span>
                <span className="text-blue-400">💧 {char?.mp}/{char?.mpMax}</span>
                <span className="text-yellow-400">💰 {gold.toLocaleString()} G</span>
                <span className="text-green-400">⚡ {char?.stamina}/{char?.staminaMax}</span>
                <span className="text-purple-400">🌀 {rp} RP</span>
                <span className="text-gray-400 ml-auto">📍 {getZoneName(zone)}</span>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={toggleBgm}
                    title={bgmEnabled ? 'ปิดเพลง BGM' : 'เปิดเพลง BGM'}
                    className={`px-1.5 py-0.5 border rounded transition select-none text-xs ${
                      bgmEnabled ? 'border-amber-800 text-amber-500 hover:text-amber-300 hover:border-amber-600'
                                 : 'border-gray-800 text-gray-700 hover:text-gray-500'}`}
                    style={{ lineHeight: 1 }}>
                    {bgmEnabled ? '🎵' : '🔇'}
                  </button>
                  {bgmEnabled && (
                    <input type="range" min="0" max="1" step="0.05"
                      value={bgmVolume} onChange={handleVolumeChange}
                      title={`Volume: ${Math.round(bgmVolume * 100)}%`}
                      className="w-14 h-1 accent-amber-600 cursor-pointer"
                      style={{ verticalAlign: 'middle' }} />
                  )}
                </div>
              </div>

              {/* Row 2 — XP bar + quest progress + story hint */}
              <div className="px-4 pb-1.5 flex items-center gap-3 text-[10px]">
                {/* XP bar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-purple-500">⭐</span>
                  <div className="w-20 h-1 bg-gray-800 rounded overflow-hidden">
                    <div className="h-full bg-purple-700 rounded transition-all duration-500"
                      style={{ width: `${xpPct}%` }} />
                  </div>
                  <span className="text-gray-600">{xp}/{xpToNext}</span>
                  {xpPct >= 90 && <span className="text-purple-400 animate-pulse">↑ ใกล้ Level Up!</span>}
                </div>

                {/* Daily quest count */}
                {dqTotal > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={dqDone === dqTotal ? 'text-green-500' : 'text-gray-500'}>📋</span>
                    <span className={dqDone === dqTotal ? 'text-green-400' : 'text-gray-500'}>
                      {dqDone}/{dqTotal}
                    </span>
                    {questBadge && <span className="text-green-400 animate-pulse">✦ รับรางวัล</span>}
                  </div>
                )}

                {/* Active story quest hint */}
                {storyHint && (
                  <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                    <span className="text-amber-700 shrink-0">📖</span>
                    <span className="text-gray-600 truncate" title={`${storyName}: ${storyHint}`}>
                      {storyHint}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
            <div className="border-t border-gray-800 p-4" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", "Noto Sans Thai", sans-serif' }}>

              {/* WORLD HUB */}
              {screen === SCREENS.WORLD && (
                <div>
                  <p className="text-gray-400 text-xs mb-3">[ เลือกการกระทำ ]</p>
                  <div className="grid grid-cols-2 gap-2">
                    {zone !== 'town_square' && (
                      <Btn onClick={handleExplore}  disabled={busy}>🔍 สำรวจ</Btn>
                    )}
                    {zone !== 'town_square' && ZONE_BOSSES[zone] && (
                      <Btn
                        onClick={() => handleStartBattle(zone, ZONE_BOSSES[zone])}
                        disabled={busy}
                        title="สู้ Zone Boss (24h cooldown)"
                      >💀 Zone Boss</Btn>
                    )}
                    <Btn onClick={handleRest}     disabled={busy}>💤 พักผ่อน</Btn>
                    <Btn onClick={loadInventory}  disabled={busy}>🎒 Inventory</Btn>
                    <Btn onClick={loadShop}       disabled={busy}>🏪 ร้านค้า</Btn>
                    <Btn onClick={loadNPCs}       disabled={busy}>💬 NPC</Btn>
                    <Btn onClick={loadDungeons}   disabled={busy}>🏰 ดันเจี้ยน</Btn>
                    <Btn onClick={() => setScreen('travel')} disabled={busy}>🗺️ เดินทาง</Btn>
                    <button onClick={openQuests} disabled={busy}
                      className="relative px-3 py-2 border border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 transition text-xs disabled:opacity-40 rounded">
                      📋 ภารกิจ
                      {questBadge && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
                    </button>
                    <Btn onClick={openQuestLog}     disabled={busy}>📖 เนื้อเรื่อง</Btn>
                    <Btn onClick={openRPShop}       disabled={busy}>💎 RP Shop</Btn>
                    <Btn onClick={openSkills}       disabled={busy}>✨ Skills</Btn>
                    <Btn onClick={openCharacter}    disabled={busy}>📊 ตัวละคร</Btn>
                    <button onClick={openWeeklyQuests} disabled={busy}
                      className="relative px-3 py-2 border border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 transition text-xs disabled:opacity-40 rounded">
                      📅 Weekly
                      {weeklyBadge && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />}
                    </button>
                    <Btn onClick={openAchievements} disabled={busy}>🏆 Achievement</Btn>
                    <Btn onClick={openLeaderboard}  disabled={busy}>🥇 Leaderboard</Btn>
                    <Btn onClick={openWorldBoss}    disabled={busy}>💀 World Boss</Btn>
                    <Btn onClick={openCrafting}     disabled={busy}>⚒️ Crafting</Btn>
                    <button onClick={() => { setLoginBonusData(null); getLoginBonusStatus().then(r => { setLoginBonusData(r.data); setShowLoginBonus(true); }).catch(() => {}); }} disabled={busy}
                      className="px-3 py-2 border border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 transition text-xs disabled:opacity-40 rounded">
                      🎁 Login Bonus
                    </button>
                    <Btn onClick={openSettings}     disabled={busy}>⚙️ ตั้งค่า</Btn>
                  </div>
                </div>
              )}

              {/* TRAVEL */}
              {screen === 'travel' && (
                <div>
                  <p className="text-gray-400 text-xs mb-3">[ เลือก Zone — Lv.{char?.level || 1} ]</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONE_LIST.map(z => {
                      const locked   = (char?.level || 1) < z.minLevel;
                      const isCurrent = z.id === zone;
                      return (
                        <button key={z.id}
                          onClick={() => !locked && !isCurrent && !busy && handleTravel(z.id)}
                          disabled={busy || isCurrent || locked}
                          className={`px-3 py-2 border text-xs rounded transition text-left ${
                            isCurrent  ? 'border-amber-700 bg-amber-900/20 text-amber-300 cursor-default' :
                            locked     ? 'border-gray-900 text-gray-700 opacity-50 cursor-not-allowed' :
                                         'border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 disabled:opacity-40'
                          }`}>
                          <div>{z.name}</div>
                          <div className={`text-xs mt-0.5 ${locked ? 'text-red-600' : 'text-gray-400'}`}>
                            {locked ? `🔒 ต้อง Lv.${z.minLevel}` : isCurrent ? '📍 อยู่ที่นี่' : z.lv}
                          </div>
                        </button>
                      );
                    })}
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
                        <span className="text-blue-400 ml-2">💧 {battle.player?.mp}/{battle.player?.mpMax} MP</span>
                        <span className="ml-auto">Turn {battle.turn}</span>
                      </div>
                      {/* Active buffs */}
                      {battle.player?.buffs?.length > 0 && (
                        <div className="flex gap-1 mb-1 flex-wrap">
                          {battle.player.buffs.map((b, i) => (
                            <span key={i} className="text-xs px-1 border border-amber-800 text-amber-500 rounded">
                              {b.name || b.type} ({b.duration}t)
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <Btn onClick={() => handleBattleAction('attack')} disabled={busy}>⚔️ โจมตี</Btn>
                        <Btn onClick={() => handleBattleAction('flee')}   disabled={busy}>🏃 หนี</Btn>
                      </div>
                      {/* Skill buttons */}
                      {battleSkills.length > 0 && (
                        <div className="grid grid-cols-2 gap-1">
                          {battleSkills.map(sk => (
                            <button key={sk.id}
                              onClick={() => handleBattleAction('skill', { skillId: sk.id })}
                              disabled={busy || (battle.player?.mp || 0) < sk.mpCost}
                              className="px-2 py-1.5 border border-blue-900 text-blue-300 hover:border-blue-600 hover:bg-blue-900/20 transition text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded">
                              {sk.name} <span className="text-blue-600">({sk.mpCost}MP)</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                  <p className="text-gray-400 text-xs mb-2">[ Inventory — คลิกเพื่อจัดการ ]</p>
                  {inventory.length === 0 && <p className="text-gray-500 text-xs">ว่างเปล่า...</p>}
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
                      {['HEAD','CHEST','MAIN_HAND','OFF_HAND','GLOVES','LEGS','FEET'].includes(item.type) && (item.enhancement || 0) < 10 && (
                        <button onClick={() => openEnhance(item.instanceId, item.name)}
                          className="text-amber-600 hover:text-amber-400 text-xs">+{(item.enhancement||0)+1}↑</button>
                      )}
                      {!item.equipped && (
                        <button onClick={() => handleSell(item.instanceId, item.name)}
                          className="text-gray-400 hover:text-gray-200 text-xs">{item.sellPrice}G ขาย</button>
                      )}
                    </div>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-2">← กลับ</Btn>
                </div>
              )}

              {/* SHOP */}
              {screen === SCREENS.SHOP && (
                <div className="max-h-60 overflow-y-auto">
                  <p className="text-gray-400 text-xs mb-2">[ ร้านค้า — Gold: {gold.toLocaleString()} ]</p>
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
                  <p className="text-gray-400 text-xs mb-2">[ NPC ในเมือง ]</p>
                  {npcs.map(n => (
                    <button key={n.npcId} onClick={() => handleTalkNPC(n.npcId)}
                      className="w-full flex items-center gap-2 py-1 border-b border-gray-900 text-xs text-left hover:text-amber-300">
                      <span>{n.emoji}</span>
                      <span className="flex-1">{n.name} <span className="text-gray-400">— {n.title}</span></span>
                      <span className="text-pink-600">❤️ {n.affection}</span>
                    </button>
                  ))}
                  <Btn onClick={() => setScreen(SCREENS.WORLD)} className="mt-2">← กลับ</Btn>
                </div>
              )}

              {/* DUNGEON LIST */}
              {screen === SCREENS.DUNGEON_LIST && (
                <div className="max-h-72 overflow-y-auto">
                  <p className="text-gray-400 text-xs mb-3">[ 🏰 เลือก Dungeon ]</p>
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
                        <span className="text-gray-400">Lv.{d.minLevel}+ · {d.totalRooms} ห้อง</span>
                        {d.levelLocked && <span className="text-red-600 ml-auto">🔒 ต้อง Lv.{d.minLevel}</span>}
                        {d.onCooldown && <span className="text-orange-600 ml-auto">⏳ {d.cooldownHoursLeft} ชั่วโมง</span>}
                        {d.blockedByOtherRun && <span className="text-gray-400 ml-auto">⛔ มี run อื่นค้างอยู่</span>}
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
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
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

              {/* DAILY QUESTS */}
              {screen === SCREENS.QUESTS && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-400 text-xs">[ 📋 ภารกิจประจำวัน ]</p>
                    {questData?.date && <p className="text-gray-500 text-xs">{questData.date}</p>}
                  </div>

                  {!questData ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : (
                    <>
                      {questData.quests.map(q => (
                        <div key={q.id} className={`border rounded p-2 text-xs ${
                          q.claimed   ? 'border-gray-900 opacity-40' :
                          q.completed ? 'border-green-800' :
                                        'border-gray-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-amber-200">{q.name}</span>
                            {q.claimed ? (
                              <span className="text-gray-400">✓ รับแล้ว</span>
                            ) : q.completed ? (
                              <button onClick={() => handleClaimQuest(q.id)}
                                className="px-2 py-0.5 border border-green-700 text-green-400 hover:bg-green-900/20 rounded text-xs">
                                รับรางวัล
                              </button>
                            ) : (
                              <span className="text-gray-400">{q.progress}/{q.target}</span>
                            )}
                          </div>
                          <p className="text-gray-400 mt-0.5">{q.desc}</p>
                          {/* Progress bar */}
                          {!q.claimed && (
                            <div className="w-full h-0.5 bg-gray-800 rounded mt-1">
                              <div className="h-0.5 bg-amber-700 rounded transition-all"
                                style={{ width: `${Math.min(100, ((q.progress || 0) / q.target) * 100)}%` }} />
                            </div>
                          )}
                          {!q.claimed && (
                            <p className="text-yellow-500 mt-0.5">💰 {q.reward.gold}G · ⭐ {q.reward.xp} XP</p>
                          )}
                        </div>
                      ))}

                      {/* Bonus reward */}
                      <div className={`border rounded p-2 text-xs ${
                        questData.bonusClaimed ? 'border-gray-900 opacity-40' :
                        questData.allCompleted ? 'border-amber-700 bg-amber-900/10' :
                                                 'border-gray-800 opacity-60'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-amber-300">{questData.bonus?.label || '🎁 ครบทุกภารกิจ'}</span>
                          {questData.bonusClaimed ? (
                            <span className="text-gray-400">✓ รับแล้ว</span>
                          ) : questData.allCompleted ? (
                            <button onClick={() => handleClaimQuest('bonus')}
                              className="px-2 py-0.5 border border-amber-600 text-amber-300 hover:bg-amber-900/30 rounded text-xs animate-pulse">
                              🎁 รับ!
                            </button>
                          ) : (
                            <span className="text-gray-500">ยังไม่ครบ</span>
                          )}
                        </div>
                        <p className="text-yellow-500 mt-0.5">
                          💰 {questData.bonus?.gold}G · ⭐ {questData.bonus?.xp} XP · 🧪 Potion
                        </p>
                      </div>
                    </>
                  )}

                  <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                </div>
              )}

              {/* RP SHOP */}
              {screen === SCREENS.RP_SHOP && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ 💎 RP Shop — Realm Points: <span className="text-purple-400">{rp}</span> ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {rpShopLoading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : (
                    <>
                      {/* Group by category */}
                      {[
                        { key: 'consumable',  label: '🧪 Boost & ของใช้' },
                        { key: 'premium_box', label: '📦 กล่องพรีเมียม' },
                        { key: 'upgrade',     label: '⬆️ Permanent Upgrade' },
                        { key: 'service',     label: '⚗️ Character Service' },
                        { key: 'race_unlock', label: '🧬 Race Unlock' },
                        { key: 'cosmetic',    label: '🎖️ Title / Cosmetic' },
                      ].map(cat => {
                        const catItems = rpShopItems.filter(i => i.category === cat.key);
                        if (!catItems.length) return null;
                        return (
                          <div key={cat.key}>
                            <p className="text-gray-500 text-xs mb-1">{cat.label}</p>
                            {catItems.map(item => (
                              <div key={item.id} className={`border rounded p-2 mb-1 text-xs ${
                                item.alreadyBought ? 'border-gray-900 opacity-40' :
                                !item.canAfford   ? 'border-gray-800 opacity-60' :
                                                    'border-purple-900 bg-purple-900/10'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-amber-200 font-bold">{item.name}</p>
                                    <p className="text-gray-300 leading-relaxed mt-0.5">{item.desc}</p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-purple-400 font-bold">{item.rpPrice} RP</p>
                                    {item.alreadyBought ? (
                                      <span className="text-gray-400 text-xs">✓ ซื้อแล้ว</span>
                                    ) : (
                                      <button
                                        onClick={() => handleBuyRPItem(item.id, item.name, item.rpPrice)}
                                        disabled={!item.canAfford}
                                        className="mt-1 px-2 py-0.5 border border-purple-700 text-purple-400 hover:bg-purple-900/20 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                                        ซื้อ
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}

                      <div className="border border-gray-800 rounded p-2 text-xs text-gray-600 text-center">
                        💎 RP ได้จาก: Gift ใน TikTok Live (10 💎 = 1 RP) · ดูสตรีม (1 RP/5 นาที)
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* QUEST LOG */}
              {screen === SCREENS.QUEST_LOG && (
                <div className="max-h-screen overflow-y-auto space-y-2">
                  {/* Tab switcher */}
                  <div className="flex gap-1 mb-3 sticky top-0 bg-black/80 backdrop-blur py-1 z-10">
                    {['story', 'side'].map(tab => (
                      <button key={tab} onClick={() => setQuestLogTab(tab)}
                        className={`px-3 py-1 text-xs rounded border transition ${
                          questLogTab === tab
                            ? 'border-amber-600 text-amber-300 bg-amber-900/20'
                            : 'border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}>
                        {tab === 'story' ? '📖 เนื้อเรื่อง' : '⚔️ ภารกิจพิเศษ'}
                      </button>
                    ))}
                    <Btn onClick={() => setScreen(SCREENS.WORLD)} className="ml-auto text-xs">← กลับ</Btn>
                  </div>

                  {!questLog ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : questLogTab === 'story' ? (
                    /* ── STORY TAB — จัดกลุ่มตาม Act ── */
                    (() => {
                      // Group by act number
                      const ACT_LABELS = { 0: 'Act 0 — Prologue', 1: 'Act 1', 2: 'Act 2', 3: 'Act 3', 4: 'Act 4' };
                      const byAct = questLog.story.reduce((acc, q) => {
                        const a = q.act ?? 0;
                        if (!acc[a]) acc[a] = [];
                        acc[a].push(q);
                        return acc;
                      }, {});
                      return (
                        <div className="space-y-4">
                          {Object.keys(byAct).sort((a,b) => +a - +b).map(act => {
                            const quests = byAct[act];
                            const doneCount = quests.filter(q => q.status === 'completed').length;
                            const hasActive = quests.some(q => q.status === 'active');
                            return (
                              <div key={act}>
                                {/* Act header */}
                                <div className={`flex items-center gap-2 mb-2 border-b pb-1 ${
                                  hasActive ? 'border-amber-900' : 'border-gray-900'
                                }`}>
                                  <span className={`text-xs font-bold ${hasActive ? 'text-amber-500' : 'text-gray-600'}`}>
                                    {ACT_LABELS[act] || `Act ${act}`}
                                  </span>
                                  <span className="text-gray-700 text-xs ml-auto">{doneCount}/{quests.length}</span>
                                </div>
                                <div className="space-y-1.5">
                                  {quests.map(q => (
                                    <div key={q.id} className={`border rounded p-2 text-xs transition ${
                                      q.status === 'completed' ? 'border-gray-800 opacity-40' :
                                      q.status === 'active'    ? 'border-amber-700 bg-amber-900/10 shadow-sm shadow-amber-900/30' :
                                                                 'border-gray-900 opacity-25'
                                    }`}>
                                      <div className="flex items-start gap-2">
                                        <span className={`text-xs font-bold shrink-0 mt-0.5 ${
                                          q.status === 'completed' ? 'text-green-600' :
                                          q.status === 'active'    ? 'text-amber-400' :
                                                                     'text-gray-600'
                                        }`}>
                                          {q.status === 'completed' ? '✅' : q.status === 'active' ? '▶' : '🔒'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-bold leading-snug ${q.status === 'active' ? 'text-amber-300' : 'text-gray-500'}`}>
                                            {q.name}
                                            {q.chapter && <span className="text-gray-600 font-normal ml-1">[{q.chapter}]</span>}
                                          </p>
                                          {q.status === 'active' && q.currentStep && (
                                            <div className="mt-1.5 space-y-1">
                                              <p className="text-gray-300 leading-relaxed">{q.currentStep.hint}</p>
                                              <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 bg-gray-800 rounded-full">
                                                  <div className="h-1 bg-amber-600 rounded-full transition-all"
                                                    style={{ width: `${Math.min(100, ((q.currentStep.progress||0) / (q.currentStep.count||1)) * 100)}%` }} />
                                                </div>
                                                <span className="text-gray-400 shrink-0 text-xs">
                                                  {q.currentStep.progress||0}/{q.currentStep.count}
                                                </span>
                                              </div>
                                              <p className="text-gray-600 text-xs">
                                                ขั้น {(q.currentStep.stepIndex||0) + 1} / {q.currentStep.totalSteps}
                                              </p>
                                            </div>
                                          )}
                                          {q.status === 'completed' && q.completionText && (
                                            <p className="text-gray-600 italic leading-relaxed mt-1 text-xs">
                                              "{q.completionText.substring(0, 120)}{q.completionText.length > 120 ? '…' : ''}"
                                            </p>
                                          )}
                                          {q.status === 'locked' && q.desc && (
                                            <p className="text-gray-600 leading-relaxed mt-0.5">{q.desc}</p>
                                          )}
                                          <p className="text-yellow-700 mt-1 text-xs">
                                            🎁 {q.rewards?.xp} XP · {q.rewards?.gold}G{q.rewards?.items?.length ? ` · ${q.rewards.items.length} ชิ้น` : ''}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    /* ── SIDE QUESTS TAB ── */
                    (() => {
                      const CAT = {
                        town:        { emoji: '🏘️', label: 'เมือง',     color: 'text-green-400',  border: 'border-green-900',  bg: 'bg-green-900/10'  },
                        bounty:      { emoji: '⚔️', label: 'ล่ารางวัล', color: 'text-red-400',    border: 'border-red-900',    bg: 'bg-red-900/10'    },
                        exploration: { emoji: '🗺️', label: 'สำรวจ',     color: 'text-blue-400',   border: 'border-blue-900',   bg: 'bg-blue-900/10'   },
                        personal:    { emoji: '❤️', label: 'NPC story', color: 'text-pink-400',   border: 'border-pink-900',   bg: 'bg-pink-900/10'   },
                      };
                      const catBadge = (cat) => {
                        const c = CAT[cat] || { emoji: '📜', label: cat, color: 'text-gray-400', border: '', bg: '' };
                        return <span className={`${c.color} text-xs`}>{c.emoji} {c.label}</span>;
                      };
                      return (
                      <div className="space-y-3">

                        {/* Active side quests */}
                        {questLog.sideActive.length > 0 && (
                          <div>
                            <p className="text-amber-500 text-xs font-bold mb-1">▶ กำลังดำเนินการ</p>
                            {questLog.sideActive.map(q => (
                              <div key={q.id} className={`border rounded p-2 mb-1 text-xs ${(CAT[q.category]||{}).border||'border-amber-800'} ${(CAT[q.category]||{}).bg||'bg-amber-900/10'}`}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  {catBadge(q.category)}
                                  <span className="text-amber-300 font-bold ml-1">{q.name}</span>
                                </div>
                                <p className="text-gray-400 leading-relaxed">{q.currentStep.hint}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 bg-gray-800 rounded-full">
                                    <div className="h-1 bg-amber-500 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (q.currentStep.progress / (q.currentStep.count||1)) * 100)}%` }} />
                                  </div>
                                  <span className="text-gray-400 shrink-0 text-xs">{q.currentStep.progress}/{q.currentStep.count}</span>
                                </div>
                                <p className="text-gray-500 text-xs mt-0.5">ขั้น {q.currentStep.stepIndex + 1}/{q.currentStep.totalSteps}</p>
                                <p className="text-yellow-600 mt-0.5">🎁 {q.rewards.xp} XP · {q.rewards.gold}G{q.rewards.items?.length ? ` · ${q.rewards.items.length} ชิ้น` : ''}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Available side quests */}
                        {questLog.sideAvailable.length > 0 && (
                          <div>
                            <p className="text-gray-400 text-xs font-bold mb-1">📋 รับได้เลย</p>
                            {questLog.sideAvailable.map(q => (
                              <div key={q.id} className={`border rounded p-2 mb-1 text-xs ${(CAT[q.category]||{}).border||'border-gray-700'}`}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                      {catBadge(q.category)}
                                      <span className="text-amber-200 font-bold">{q.name}</span>
                                      {q.giverNpc && <span className="text-gray-500">· {q.giverNpc}</span>}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed">{q.desc}</p>
                                    <p className="text-yellow-600 mt-0.5">🎁 {q.rewards.xp} XP · {q.rewards.gold}G{q.rewards.items?.length ? ` · ${q.rewards.items.length} ชิ้น` : ''}</p>
                                  </div>
                                  <button onClick={() => handleAcceptSideQuest(q.id, q.name)}
                                    className="shrink-0 px-2 py-1 border border-amber-700 text-amber-400 hover:bg-amber-900/20 rounded text-xs">
                                    รับ
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Locked personal quests — show affection progress to hint */}
                        {(questLog.lockedPersonal||[]).length > 0 && (
                          <div>
                            <p className="text-pink-800 text-xs font-bold mb-1">🔒 ต้องสร้างความสัมพันธ์ก่อน</p>
                            {(questLog.lockedPersonal||[]).map(q => (
                              <div key={q.id} className="border border-pink-950 rounded p-2 mb-1 text-xs opacity-70">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-pink-600">❤️ NPC story</span>
                                  <span className="text-gray-500 font-bold ml-1">{q.name}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 bg-gray-900 rounded-full">
                                    <div className="h-1 bg-pink-800 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (q.currentAffection / q.minAffection.amount) * 100)}%` }} />
                                  </div>
                                  <span className="text-pink-700 shrink-0">{q.currentAffection}/{q.minAffection.amount} ❤️ กับ {q.giverNpc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Completed side quests */}
                        {questLog.sideCompleted.length > 0 && (
                          <div>
                            <p className="text-gray-600 text-xs font-bold mb-1">✅ เสร็จแล้ว</p>
                            {questLog.sideCompleted.map(q => (
                              <div key={q.id} className="border border-gray-900 rounded p-2 mb-1 text-xs opacity-50">
                                <div className="flex items-center gap-1">
                                  {catBadge(q.category)}
                                  <span className="text-gray-500 ml-1">✅ {q.name}</span>
                                </div>
                                {q.completionText && (
                                  <p className="text-gray-600 italic leading-relaxed mt-0.5">
                                    "{q.completionText.substring(0, 80)}{q.completionText.length > 80 ? '...' : ''}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {questLog.sideActive.length === 0 && questLog.sideAvailable.length === 0 &&
                         questLog.sideCompleted.length === 0 && (questLog.lockedPersonal||[]).length === 0 && (
                          <p className="text-gray-500 text-xs text-center py-4">ยังไม่มีภารกิจพิเศษในขณะนี้<br/>
                            <span className="text-gray-600">คุยกับ NPC และสำรวจโลก Ashenveil เพื่อ unlock ภารกิจ</span>
                          </p>
                        )}
                      </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* SKILLS */}
              {screen === SCREENS.SKILLS && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ ✨ Skills — Skill Points: <span className="text-amber-400">{char?.skillPoints || 0}</span> ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {skillsLoading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : !skillsData ? null : (
                    <>
                      {/* Passive skill */}
                      {skillsData.passive && (
                        <div className="border border-green-900 rounded p-2 text-xs bg-green-900/10">
                          <p className="text-green-400 font-bold">🌿 {skillsData.passive.name}: {skillsData.passive.desc}</p>
                          <p className="text-gray-400 mt-0.5">ทำงานอัตโนมัติทุก Battle (ไม่ต้องปลดล็อค)</p>
                        </div>
                      )}

                      {/* Active skills */}
                      <p className="text-gray-500 text-xs">[ Active Skills ]</p>
                      {(skillsData.skills || []).map(sk => (
                        <div key={sk.id} className={`border rounded p-2 text-xs ${
                          sk.unlocked    ? 'border-blue-800 bg-blue-900/10' :
                          sk.canUnlock   ? 'border-gray-700' :
                                           'border-gray-900 opacity-50'
                        }`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold ${sk.unlocked ? 'text-blue-300' : 'text-amber-200'}`}>
                                {sk.name}
                                {sk.unlocked && <span className="text-blue-600 font-normal ml-1 text-xs">✓ ปลดแล้ว</span>}
                                {sk.levelLocked && !sk.unlocked && <span className="text-red-700 font-normal ml-1 text-xs">🔒 Lv.{sk.minLevel}</span>}
                              </p>
                              <p className="text-gray-300 mt-0.5 leading-relaxed">{sk.desc}</p>
                              <div className="flex gap-3 mt-1 text-gray-400">
                                <span>💧 {sk.mpCost} MP</span>
                                <span>Lv.{sk.minLevel}+</span>
                                <span>⚡ {sk.skillPointCost} SP</span>
                              </div>
                            </div>
                            {!sk.unlocked && (
                              <button
                                onClick={() => handleUnlockSkill(sk.id, sk.name, sk.skillPointCost)}
                                disabled={!sk.canUnlock}
                                className="shrink-0 px-2 py-1 border border-amber-700 text-amber-400 hover:bg-amber-900/20 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                                ปลดล็อค
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* CHARACTER PROFILE */}
              {screen === SCREENS.CHARACTER && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ 📊 ตัวละคร — Stat Points: <span className="text-amber-400">{charProfile?.statPoints ?? char?.statPoints ?? 0}</span> ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {charLoading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : !charProfile ? null : (
                    <>
                      {/* Level / XP */}
                      <div className="border border-gray-800 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-amber-300 font-bold">{charProfile.name}</span>
                          <span className="text-gray-500">{charProfile.race} {charProfile.class}</span>
                        </div>
                        <div className="flex gap-3 text-gray-400">
                          <span>Lv.{charProfile.level}</span>
                          <span>XP: {charProfile.xp}/{charProfile.xpToNext}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded">
                          <div className="h-1 bg-purple-700 rounded" style={{ width: `${Math.min(100, (charProfile.xp / charProfile.xpToNext) * 100)}%` }} />
                        </div>
                        <div className="flex gap-3 text-gray-500">
                          <span>⚔️ {charProfile.monstersKilled} kills</span>
                          <span>💀 {charProfile.deathCount} deaths</span>
                        </div>
                      </div>

                      {/* Combat stats */}
                      <div className="border border-gray-800 rounded p-2 text-xs">
                        <p className="text-gray-400 mb-1">[ Combat Stats ]</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-400">
                          <span>❤️ HP {charProfile.hp}/{charProfile.hpMax}</span>
                          <span>💧 MP {charProfile.mp}/{charProfile.mpMax}</span>
                          <span>⚔️ ATK {charProfile.atk}</span>
                          <span>🛡️ DEF {charProfile.def}</span>
                          <span>✨ MAG {charProfile.mag}</span>
                          <span>💨 SPD {charProfile.spd}</span>
                          <span>⚡ Stamina {charProfile.stamina}/{charProfile.staminaMax}</span>
                        </div>
                      </div>

                      {/* Stat allocation */}
                      <div className="border border-gray-800 rounded p-2 text-xs">
                        <p className="text-gray-400 mb-1">[ Allocate Stat Points — มี {charProfile.statPoints} points ]</p>
                        {[
                          { key: 'str', label: 'STR ⚔️', desc: '+2 ATK/point', val: charProfile.allocatedStats?.str || 0 },
                          { key: 'int', label: 'INT ✨', desc: '+3 MAG, +5 MP/point', val: charProfile.allocatedStats?.int || 0 },
                          { key: 'agi', label: 'AGI 💨', desc: '+1 SPD/point', val: charProfile.allocatedStats?.agi || 0 },
                          { key: 'vit', label: 'VIT ❤️', desc: '+10 HP, +1 DEF/point', val: charProfile.allocatedStats?.vit || 0 },
                        ].map(s => (
                          <div key={s.key} className="flex items-center gap-2 py-0.5 border-b border-gray-900 last:border-0">
                            <span className="w-16 text-amber-200 font-bold">{s.label}</span>
                            <span className="flex-1 text-gray-400">{s.desc}</span>
                            <span className="text-gray-500 w-6 text-right">{s.val}</span>
                            <button
                              onClick={() => handleAllocateStat(s.key, s.label)}
                              disabled={(charProfile.statPoints || 0) < 1}
                              className="px-2 py-0.5 border border-amber-700 text-amber-400 hover:bg-amber-900/20 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                              +1
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Skill points */}
                      <div className="border border-gray-800 rounded p-2 text-xs text-gray-500">
                        <span>Skill Points: <span className="text-amber-400">{charProfile.skillPoints || 0}</span></span>
                        <span className="ml-3">Unlocked Skills: {(charProfile.unlockedSkills || []).join(', ') || 'ยังไม่มี'}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ENHANCEMENT */}
              {screen === SCREENS.ENHANCE && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ 🔨 Enhance: {enhanceTarget?.name} ]</p>
                    <Btn onClick={() => { setScreen(SCREENS.INVENTORY); }}>← กลับ</Btn>
                  </div>

                  {enhanceLoading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : !enhanceInfo ? null : enhanceInfo.maxEnhanced ? (
                    <div className="text-center py-4">
                      <p className="text-amber-400 text-sm">🌟 Enhance MAX (+10)</p>
                      <p className="text-gray-400 text-xs mt-1">อุปกรณ์นี้ Enhance สูงสุดแล้ว</p>
                    </div>
                  ) : (
                    <>
                      <div className="border border-gray-800 rounded p-2 text-xs">
                        <p className="text-amber-300 font-bold">{enhanceInfo.itemName} +{enhanceInfo.currentEnhance} → +{enhanceInfo.nextLevel}</p>
                        <div className="mt-1 space-y-0.5 text-gray-400">
                          <p>💰 Gold: <span className={enhanceInfo.currentGold >= enhanceInfo.recipe?.gold ? 'text-yellow-400' : 'text-red-400'}>
                            {(enhanceInfo.currentGold || 0).toLocaleString()} / {(enhanceInfo.recipe?.gold || 0).toLocaleString()}
                          </span></p>
                          {(enhanceInfo.recipe?.materials || []).map((m, i) => (
                            <p key={i}>📦 {m.name}: <span className={m.enough ? 'text-green-400' : 'text-red-400'}>{m.have}/{m.required}</span></p>
                          ))}
                          <p>🎯 อัตราสำเร็จ: <span className={
                            enhanceInfo.recipe?.successRate >= 0.8 ? 'text-green-400' :
                            enhanceInfo.recipe?.successRate >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                          }>{Math.round((enhanceInfo.recipe?.successRate || 0) * 100)}%</span></p>
                          {enhanceInfo.recipe?.successRate < 1 && (
                            <p className="text-gray-500">⚠️ ล้มเหลว → item ยังอยู่ที่ +{enhanceInfo.currentEnhance} (ไม่หาย)</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleEnhanceItem}
                        disabled={!enhanceInfo.canEnhance}
                        className="w-full px-3 py-2 border border-amber-700 text-amber-300 hover:border-amber-500 hover:bg-amber-900/20 transition text-xs disabled:opacity-30 disabled:cursor-not-allowed rounded font-bold">
                        🔨 Enhance +{enhanceInfo.nextLevel}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* WEEKLY QUESTS */}
              {screen === SCREENS.WEEKLY_QUESTS && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-400 text-xs">[ 📅 Weekly Quests ]</p>
                    {weeklyData?.weekKey && <p className="text-gray-500 text-xs">สัปดาห์ {weeklyData.weekKey}</p>}
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {!weeklyData ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : (
                    <>
                      {weeklyData.quests.map(q => (
                        <div key={q.id} className={`border rounded p-2 text-xs ${
                          q.claimed   ? 'border-gray-900 opacity-40' :
                          q.completed ? 'border-green-800' :
                                        'border-gray-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-amber-200">{q.name}</span>
                            {q.claimed ? (
                              <span className="text-gray-400">✓ รับแล้ว</span>
                            ) : q.completed ? (
                              <button onClick={() => handleClaimWeekly(q.id)}
                                className="px-2 py-0.5 border border-green-700 text-green-400 hover:bg-green-900/20 rounded text-xs">
                                รับรางวัล
                              </button>
                            ) : (
                              <span className="text-gray-400">{q.progress}/{q.target}</span>
                            )}
                          </div>
                          <p className="text-gray-400 mt-0.5">{q.desc}</p>
                          {!q.claimed && (
                            <div className="w-full h-0.5 bg-gray-800 rounded mt-1">
                              <div className="h-0.5 bg-purple-700 rounded transition-all"
                                style={{ width: `${Math.min(100, ((q.progress || 0) / q.target) * 100)}%` }} />
                            </div>
                          )}
                          {!q.claimed && (
                            <p className="text-purple-500 mt-0.5">
                              💰 {q.reward.gold}G · ⭐ {q.reward.xp} XP{q.reward.items?.length ? ` · 📦 x${q.reward.items.length}` : ''}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Weekly bonus */}
                      <div className={`border rounded p-2 text-xs ${
                        weeklyData.bonusClaimed ? 'border-gray-900 opacity-40' :
                        weeklyData.allCompleted ? 'border-amber-700 bg-amber-900/10' :
                                                   'border-gray-800 opacity-60'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-amber-300">{weeklyData.bonus?.label || '🏆 ครบทุก Weekly Quest!'}</span>
                          {weeklyData.bonusClaimed ? (
                            <span className="text-gray-400">✓ รับแล้ว</span>
                          ) : weeklyData.allCompleted ? (
                            <button onClick={() => handleClaimWeekly('bonus')}
                              className="px-2 py-0.5 border border-amber-600 text-amber-300 hover:bg-amber-900/30 rounded text-xs animate-pulse">
                              🏆 รับ!
                            </button>
                          ) : (
                            <span className="text-gray-500">ยังไม่ครบ</span>
                          )}
                        </div>
                        <p className="text-purple-500 mt-0.5">
                          💰 {weeklyData.bonus?.gold}G · ⭐ {weeklyData.bonus?.xp} XP · 📦 ของพิเศษ
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ACHIEVEMENTS */}
              {screen === SCREENS.ACHIEVEMENTS && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">
                      [ 🏆 Achievements — ปลดล็อคแล้ว{' '}
                      <span className="text-amber-400">{achData?.unlockedCount ?? 0}</span>
                      /{achData?.totalCount ?? 0} ]
                    </p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {achLoading ? (
                    <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                  ) : !achData ? null : (
                    <>
                      {/* Group by category */}
                      {[
                        { key: 'Combat',      label: '⚔️ การต่อสู้' },
                        { key: 'Exploration', label: '🌿 การสำรวจ' },
                        { key: 'Dungeon',     label: '🏰 Dungeon' },
                        { key: 'Progression', label: '📈 ความก้าวหน้า' },
                        { key: 'Enhancement', label: '🔨 Enhancement' },
                        { key: 'Social',      label: '💝 สังคม' },
                        { key: 'Death',       label: '💀 ความตาย' },
                        { key: 'Quests',      label: '📋 ภารกิจ' },
                      ].map(cat => {
                        const catAchs = (achData.achievements || []).filter(a => a.category === cat.key);
                        if (!catAchs.length) return null;
                        const catUnlocked = catAchs.filter(a => a.unlocked).length;
                        return (
                          <div key={cat.key}>
                            <p className="text-gray-500 text-xs mb-1">
                              {cat.label}{' '}
                              <span className="text-gray-800">({catUnlocked}/{catAchs.length})</span>
                            </p>
                            {catAchs.map(ach => (
                              <div key={ach.id} className={`border rounded p-2 mb-1 text-xs ${
                                ach.unlocked
                                  ? 'border-amber-800 bg-amber-900/10'
                                  : 'border-gray-900 opacity-50'
                              }`}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-bold ${ach.unlocked ? 'text-amber-300' : 'text-gray-500'}`}>
                                      {ach.unlocked ? '✅ ' : '🔒 '}
                                      {ach.name}
                                    </p>
                                    <p className="text-gray-400 mt-0.5 leading-relaxed">{ach.desc}</p>
                                    {/* Progress bar (show if not unlocked) */}
                                    {!ach.unlocked && ach.target > 0 && (
                                      <>
                                        <div className="w-full h-0.5 bg-gray-800 rounded mt-1">
                                          <div className="h-0.5 bg-amber-800 rounded transition-all"
                                            style={{ width: `${Math.min(100, ((ach.progress || 0) / ach.target) * 100)}%` }} />
                                        </div>
                                        <p className="text-gray-500 mt-0.5">{ach.progress || 0}/{ach.target}</p>
                                      </>
                                    )}
                                    {/* Reward info */}
                                    <div className="flex gap-2 mt-0.5 text-yellow-900 text-xs">
                                      {ach.reward?.gold > 0 && <span>💰 {ach.reward.gold}G</span>}
                                      {ach.reward?.xp   > 0 && <span>⭐ {ach.reward.xp} XP</span>}
                                      {ach.reward?.title && <span className="text-amber-600">🎖️ "{ach.reward.title}"</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {screen === SCREENS.SETTINGS && (
                <div className="max-h-80 overflow-y-auto space-y-3">
                  <p className="text-gray-400 text-xs">[ ⚙️ ตั้งค่า ]</p>

                  {/* ── STATUS STEP ── */}
                  {settingsStep === 'status' && (
                    <div className="space-y-2">
                      {/* Verify badge */}
                      {verifyStatus === null ? (
                        <p className="text-gray-400 text-xs">กำลังโหลด...</p>
                      ) : verifyStatus.verified ? (
                        <div className="border border-green-800 rounded p-2 text-xs space-y-0.5">
                          <p className="text-green-400 font-bold">✅ ยืนยัน TikTok แล้ว</p>
                          <p className="text-gray-400">
                            @{verifyStatus.tiktokUniqueId}
                          </p>
                          {!verifyStatus.canChangeVJ ? (
                            <p className="text-orange-400">
                              ⏳ เปลี่ยน VJ ได้ในอีก {verifyStatus.vjCooldownDaysLeft} วัน
                            </p>
                          ) : (
                            <button
                              onClick={() => setSettingsStep('input')}
                              className="mt-1 text-amber-500 hover:text-amber-300 underline text-xs">
                              🔄 เปลี่ยน TikTok VJ
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="border border-gray-800 rounded p-2 text-xs space-y-1">
                          <p className="text-gray-500">❌ ยังไม่ได้ยืนยัน TikTok</p>
                          <p className="text-gray-400 leading-relaxed">
                            ยืนยัน TikTok เพื่อรับ Gold จาก Gift ใน Live ได้
                          </p>
                          <button
                            onClick={() => setSettingsStep('input')}
                            className="mt-1 px-3 py-1 border border-amber-700 text-amber-400 hover:bg-amber-900/20 rounded text-xs">
                            🔗 ยืนยัน TikTok ตอนนี้
                          </button>
                        </div>
                      )}
                      <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                    </div>
                  )}

                  {/* ── INPUT STEP ── */}
                  {settingsStep === 'input' && (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs leading-relaxed">
                        ใส่ TikTok username ของ VJ ที่เชื่อมต่อกับ{' '}
                        <span className="text-amber-400">ttsam.app</span> และกำลัง Live อยู่
                      </p>
                      <div className="flex gap-2">
                        <span className="text-gray-400 text-xs self-center">@</span>
                        <input
                          type="text"
                          value={settingsTiktok}
                          onChange={e => setSettingsTiktok(e.target.value.replace(/^@/, ''))}
                          placeholder="tiktok_username"
                          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-amber-100 placeholder-gray-700 focus:outline-none focus:border-amber-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Btn onClick={handleRequestVerifyCode} disabled={busy || !settingsTiktok.trim()}>
                          ✅ ขอ Code
                        </Btn>
                        <Btn onClick={() => setSettingsStep('status')}>← กลับ</Btn>
                      </div>
                    </div>
                  )}

                  {/* ── WAIT STEP ── */}
                  {settingsStep === 'wait' && (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-xs leading-relaxed">
                        พิมพ์ข้อความนี้ใน <span className="text-pink-400">TikTok Live</span>{' '}
                        ของ @{settingsTiktok} ภายใน <span className="text-amber-400">10 นาที</span>:
                      </p>
                      {/* Code box */}
                      <div className="bg-gray-900 border border-amber-700 rounded p-3 text-center">
                        <p className="text-amber-300 text-sm font-mono tracking-wider break-all select-all">
                          {settingsCode}
                        </p>
                      </div>
                      {/* Polling indicator */}
                      {settingsPolling && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="animate-spin">⏳</span>
                          <span>รอการยืนยัน... (ตรวจสอบทุก 3 วินาที)</span>
                        </div>
                      )}
                      <p className="text-gray-400 text-xs">
                        💡 tip: กด copy ข้อความในกล่องแล้วไป paste ใน comment TikTok Live
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Btn onClick={() => {
                          navigator.clipboard?.writeText(settingsCode).catch(() => {});
                          toast.success('คัดลอก code แล้ว!');
                        }}>📋 Copy Code</Btn>
                        <Btn onClick={() => {
                          setSettingsStep('status');
                          setSettingsPolling(false);
                        }}>← ยกเลิก</Btn>
                      </div>
                    </div>
                  )}

                  {/* ── ACCESSIBILITY hint ── */}
                  {settingsStep === 'status' && (
                    <div className="border border-gray-800 rounded p-3 mt-1">
                      <p className="text-gray-500 text-xs">
                        ⚙ ปรับธีม / ขนาดตัวอักษร / ความสว่าง / BGM
                        ได้ที่ปุ่ม <span className="text-amber-500 font-bold">⚙</span> มุมขวาล่าง
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* WORLD BOSS */}
              {screen === SCREENS.WORLD_BOSS && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ 💀 World Boss — Community Event ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {!worldBossData ? (
                    <p className="text-gray-400 text-xs animate-pulse">กำลังโหลด...</p>
                  ) : !worldBossData.active ? (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-gray-400 text-sm">ไม่มี World Boss ในขณะนี้</p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Boss จะถูก spawn เมื่อ VJ เริ่ม Event<br />
                        หรือเมื่อมีการส่ง Gift มากพอ
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Boss header */}
                      <div className="border border-red-900 rounded p-3 bg-red-900/10 text-center">
                        <p className="text-3xl mb-1">{worldBossData.boss?.emoji}</p>
                        <p className="text-red-300 font-bold text-sm">{worldBossData.boss?.nameTH}</p>
                        <p className="text-gray-500 text-xs leading-relaxed mt-1">{worldBossData.boss?.desc}</p>
                      </div>

                      {/* HP Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>HP Boss</span>
                          <span>{(worldBossData.boss?.hp || 0).toLocaleString()} / {(worldBossData.boss?.hpMax || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 bg-gray-800 rounded overflow-hidden">
                          <div className="h-3 bg-red-700 rounded transition-all duration-500"
                            style={{ width: `${worldBossData.boss?.hpPct || 0}%` }} />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600">{worldBossData.boss?.hpPct}% HP เหลือ</span>
                          <span className="text-gray-600">
                            ⏰ {Math.floor((worldBossData.boss?.timeLeft || 0) / 60)}m {(worldBossData.boss?.timeLeft || 0) % 60}s
                          </span>
                        </div>
                      </div>

                      {/* My stats */}
                      <div className="border border-gray-800 rounded p-2 text-xs flex gap-4">
                        <span className="text-gray-500">ดาเมจของคุณ: <span className="text-amber-400">{(worldBossData.myDamage || 0).toLocaleString()}</span></span>
                        <span className="text-gray-500">โจมตีแล้ว: <span className="text-amber-400">{worldBossData.myAttacks || 0} ครั้ง</span></span>
                      </div>

                      {/* Attack button */}
                      {worldBossData.cooldown > 0 ? (
                        <div className="text-center border border-gray-800 rounded p-2 text-xs text-gray-600">
                          ⏳ รอ {Math.floor(worldBossData.cooldown / 60)}m {worldBossData.cooldown % 60}s ก่อนโจมตีได้อีก
                        </div>
                      ) : (
                        <button onClick={handleAttackWorldBoss} disabled={worldBossBusy}
                          className="w-full py-2 border border-red-700 text-red-400 hover:bg-red-900/20 rounded text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed">
                          {worldBossBusy ? '⚡ กำลังโจมตี...' : '⚔️ โจมตี World Boss!'}
                        </button>
                      )}

                      {/* Top 5 damage */}
                      {worldBossData.topPlayers?.length > 0 && (
                        <div className="border border-gray-800 rounded p-2 text-xs">
                          <p className="text-gray-400 mb-1">[ Top Damage ]</p>
                          {worldBossData.topPlayers.map((p, i) => (
                            <div key={p.uid} className="flex items-center gap-2 py-0.5">
                              <span className={`w-5 text-right font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                                {i + 1}.
                              </span>
                              <span className="flex-1 text-amber-200">{p.name}</span>
                              <span className="text-red-400">{p.damage.toLocaleString()} dmg</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* LEADERBOARD */}
              {screen === SCREENS.LEADERBOARD && (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ 🥇 Leaderboard ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {/* Tab switcher */}
                  <div className="flex gap-1 mb-2">
                    {[
                      { key: 'level',        label: '⭐ Level' },
                      { key: 'kills',        label: '⚔️ Kills' },
                      { key: 'achievements', label: '🏆 Ach' },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setLeaderboardTab(tab.key)}
                        className={`flex-1 px-2 py-1 text-xs rounded border transition ${
                          leaderboardTab === tab.key
                            ? 'border-amber-600 text-amber-300 bg-amber-900/20'
                            : 'border-gray-700 text-gray-400 hover:text-gray-200'
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {leaderboardLoad ? (
                    <p className="text-gray-400 text-xs animate-pulse">กำลังโหลด...</p>
                  ) : !leaderboardData ? null : (
                    <div className="space-y-1">
                      {(leaderboardData[leaderboardTab] || []).map((p, i) => (
                        <div key={i} className={`border rounded p-2 text-xs flex items-center gap-2 ${
                          i === 0 ? 'border-yellow-700 bg-yellow-900/10' :
                          i === 1 ? 'border-gray-600 bg-gray-900/50' :
                          i === 2 ? 'border-amber-800 bg-amber-900/10' :
                                    'border-gray-900'
                        }`}>
                          <span className={`w-6 text-center font-bold text-sm ${
                            i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-500'
                          }`}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-amber-200 font-bold truncate">{p.name}</span>
                            {p.title && <span className="text-amber-700 text-xs ml-1">"{p.title}"</span>}
                            <div className="text-gray-400 text-xs">{p.race} {p.class} Lv.{p.level}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold ${
                              leaderboardTab === 'level'  ? 'text-purple-400' :
                              leaderboardTab === 'kills'  ? 'text-red-400' : 'text-amber-400'
                            }`}>
                              {leaderboardTab === 'level'  ? `Lv.${p.value}` :
                               leaderboardTab === 'kills'  ? `${p.value} kills` :
                               `${p.value} ach`}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(leaderboardData[leaderboardTab] || []).length === 0 && (
                        <p className="text-gray-500 text-xs text-center py-4">ยังไม่มีข้อมูล</p>
                      )}
                      <p className="text-gray-800 text-xs text-center pt-1">
                        อัปเดตล่าสุด: {leaderboardData.updatedAt ? new Date(leaderboardData.updatedAt).toLocaleTimeString('th-TH') : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CRAFTING */}
              {screen === SCREENS.CRAFTING && (
                <div className="max-h-[500px] overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-xs">[ ⚒️ Crafting Workshop ]</p>
                    <Btn onClick={() => setScreen(SCREENS.WORLD)}>← กลับ</Btn>
                  </div>

                  {/* Category filter */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {['all', 'weapon', 'armor', 'consumable', 'material', 'relic'].map(cat => (
                      <button key={cat} onClick={() => setCraftingTab(cat)}
                        className={`px-2 py-1 text-xs rounded border transition ${
                          craftingTab === cat
                            ? 'border-amber-600 text-amber-300 bg-amber-900/20'
                            : 'border-gray-700 text-gray-500 hover:text-gray-300'
                        }`}>
                        {cat === 'all' ? '📋 ทั้งหมด' :
                         cat === 'weapon' ? '⚔️ อาวุธ' :
                         cat === 'armor' ? '🛡️ เกราะ' :
                         cat === 'consumable' ? '🧪 ยา' :
                         cat === 'material' ? '💠 วัสดุ' : '🔮 Relic'}
                      </button>
                    ))}
                  </div>

                  {craftingLoad ? (
                    <p className="text-gray-400 text-xs animate-pulse">กำลังโหลด...</p>
                  ) : craftingRecipes.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-4">ยังไม่มี Recipe ที่ใช้ได้</p>
                  ) : (
                    <div className="space-y-2">
                      {craftingRecipes
                        .filter(r => craftingTab === 'all' || r.category === craftingTab)
                        .map(recipe => {
                          const gradeColor = {
                            COMMON: 'text-gray-400', UNCOMMON: 'text-green-400',
                            RARE: 'text-blue-400', EPIC: 'text-purple-400',
                            LEGENDARY: 'text-orange-400', MYTHIC: 'text-red-400',
                          }[recipe.resultGrade] || 'text-gray-400';

                          return (
                            <div key={recipe.recipeId}
                              className={`border rounded p-3 space-y-2 ${
                                recipe.canCraft
                                  ? 'border-amber-800/50 bg-amber-900/5'
                                  : 'border-gray-800 opacity-60'
                              }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-sm">{recipe.emoji}</span>
                                    <span className={`font-bold text-xs ${gradeColor}`}>{recipe.name}</span>
                                    <span className={`text-xs ${gradeColor} opacity-70`}>[{recipe.resultGrade}]</span>
                                  </div>
                                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{recipe.desc}</p>
                                </div>
                                <button
                                  onClick={() => handleCraft(recipe.recipeId)}
                                  disabled={!recipe.canCraft || craftingBusy}
                                  className={`shrink-0 px-3 py-1.5 text-xs rounded border transition ${
                                    recipe.canCraft
                                      ? 'border-amber-600 text-amber-300 hover:bg-amber-900/20'
                                      : 'border-gray-800 text-gray-600 cursor-not-allowed'
                                  } disabled:opacity-40`}>
                                  {craftingBusy ? '⏳' : '⚒️ Craft'}
                                </button>
                              </div>

                              {/* Ingredients */}
                              <div className="flex flex-wrap gap-1">
                                {recipe.ingredients.map(ing => (
                                  <span key={ing.itemId}
                                    className={`text-xs px-1.5 py-0.5 rounded border ${
                                      ing.have >= ing.qty
                                        ? 'border-green-900 text-green-400 bg-green-900/10'
                                        : 'border-red-900 text-red-400 bg-red-900/10'
                                    }`}>
                                    {ing.emoji} {ing.name} {ing.have}/{ing.qty}
                                  </span>
                                ))}
                                {recipe.goldCost > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded border border-yellow-900 text-yellow-400 bg-yellow-900/10">
                                    💰 {recipe.goldCost.toLocaleString()} Gold
                                  </span>
                                )}
                              </div>

                              {!recipe.canCraft && recipe.missing.length > 0 && (
                                <p className="text-red-600 text-xs">
                                  ขาด: {recipe.missing.map(m => `${m.emoji} ${m.name} ×${m.need - m.have}`).join(', ')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* NPC TALK */}
              {screen === SCREENS.NPC_TALK && activeNPC && (() => {
                const npcLines = activeNPC.lines || [activeNPC.dialog || ''];
                const totalLines = npcLines.length;
                const isLast = npcLineIdx >= totalLines - 1;
                const currentLineFull = npcLines[npcLineIdx] || '';
                const isDoneTyping = !npcTyping && npcTyped.length >= currentLineFull.length;

                // Advance to next line or skip typewriter
                const handleAdvance = () => {
                  if (npcTyping) {
                    // Skip — show full line instantly
                    setNpcTyped(currentLineFull);
                    setNpcTyping(false);
                  } else if (!isLast) {
                    const next = npcLineIdx + 1;
                    setNpcLineIdx(next);
                    setNpcTyped('');
                    setNpcTyping(true);
                  }
                };

                return (
                  <div>
                    {/* NPC header */}
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>
                        {activeNPC.emoji} <span className="text-amber-400 font-semibold">{activeNPC.name}</span>
                        {activeNPC.title && <span className="text-gray-600 ml-1">— {activeNPC.title}</span>}
                      </span>
                      <span>❤️ {activeNPC.affection}/100</span>
                    </div>

                    {/* Quest badge */}
                    {activeNPC.isQuestDialog && activeNPC.questContext && (
                      <div className="mb-2 px-2 py-0.5 rounded text-[10px] inline-block"
                        style={{ background: '#92400e22', border: '1px solid #92400e', color: '#fbbf24' }}>
                        📜 {activeNPC.questContext.questName}
                      </div>
                    )}

                    {/* Dialog box — typewriter */}
                    <div
                      className="relative rounded-lg border p-3 mb-3 cursor-pointer select-none"
                      style={{ borderColor: activeNPC.isQuestDialog ? '#92400e' : '#374151',
                               background: activeNPC.isQuestDialog ? '#0f0a0022' : '#0a0a0a',
                               minHeight: '72px' }}
                      onClick={handleAdvance}
                    >
                      {/* Past lines (dimmed) */}
                      {npcLineIdx > 0 && npcLines.slice(0, npcLineIdx).map((l, i) => (
                        <p key={i} className="text-gray-600 text-xs italic mb-1">"{l}"</p>
                      ))}
                      {/* Current line */}
                      <p className="text-gray-200 text-sm italic leading-relaxed">
                        "{npcTyped}<span className="opacity-60 animate-pulse">{npcTyping ? '▌' : ''}</span>"
                      </p>
                      {/* Line counter + advance hint */}
                      <div className="flex justify-between items-center mt-2">
                        {totalLines > 1 && (
                          <span className="text-gray-700 text-[10px]">{npcLineIdx + 1}/{totalLines}</span>
                        )}
                        {isDoneTyping && !isLast && (
                          <span className="text-amber-700 text-[10px] animate-pulse ml-auto">แตะเพื่ออ่านต่อ ▶</span>
                        )}
                        {isDoneTyping && isLast && (
                          <span className="text-gray-700 text-[10px] ml-auto">— จบบทสนทนา —</span>
                        )}
                      </div>
                    </div>

                    {/* Gift section — แสดงเมื่ออ่านจบ หรือ NPC ไม่ใช่ quest dialog */}
                    {(isDoneTyping && isLast) || !activeNPC.isQuestDialog ? (
                      <>
                        <p className="text-gray-400 text-xs mb-2">
                          ให้ของขวัญได้ {activeNPC.giftLimit - activeNPC.giftUsedToday}/{activeNPC.giftLimit} ครั้ง
                        </p>
                        <div className="max-h-28 overflow-y-auto mb-2">
                          {inventory.filter(i => ['MATERIAL','JUNK','CONSUMABLE'].includes(i.type)).map(item => (
                            <button key={item.instanceId}
                              onClick={() => handleGiveGift(activeNPC.npcId, item.instanceId, item.name)}
                              className="w-full flex items-center gap-2 py-1 text-xs border-b border-gray-900 hover:text-amber-300 text-left">
                              <span>{item.emoji}</span>
                              <span className={GRADE_COLOR[item.grade]}>{item.name}</span>
                            </button>
                          ))}
                          {inventory.filter(i => ['MATERIAL','JUNK','CONSUMABLE'].includes(i.type)).length === 0 && (
                            <p className="text-gray-500 text-xs">ไม่มี item ที่จะให้ได้</p>
                          )}
                        </div>
                      </>
                    ) : null}

                    <Btn onClick={() => setScreen(SCREENS.NPC)}>← กลับ</Btn>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      </div>

      {/* ── Display Settings Panel (theme/font/brightness/BGM) ── */}
      <AshenveilSettings
        {...ashSettings}
        bgm={{
          enabled:  bgmEnabled,
          volume:   bgmVolume,
          onToggle: toggleBgm,
          onVolume: (v) => { setBgmVolume(v); localStorage.setItem('game_bgm_vol', String(v)); },
        }}
      />
    </>
  );
}

function Btn({ onClick, disabled, children, className = '' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-2.5 border border-gray-700 text-amber-300 hover:border-amber-600 hover:bg-amber-900/10 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed rounded ${className}`}>
      {children}
    </button>
  );
}

function getZoneName(zone) {
  const names = {
    town_square:       'Town Square',
    town_outskirts:    'ชานเมือง',
    forest_path:       'ทางป่า',
    dark_cave:         'ถ้ำมืด',
    city_ruins:        'ซากเมือง',
    cursed_marshlands: 'หนองสาปแช่ง',
    void_frontier:     'ชายขอบ Void',
  };
  return names[zone] || zone;
}
