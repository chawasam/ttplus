// pages/widgets.js — OBS Widgets + per-widget style editor
import { useEffect, useState, useRef, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import api, { getCachedSettings, setCachedSettings } from '../lib/api';
import { showError } from '../lib/errorHandler';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Sidebar from '../components/Sidebar';
import WidgetStyleEditor from '../components/WidgetStyleEditor';
import { WIDGET_DEFAULTS, styleToParams } from '../lib/widgetStyles';

const BOSS_EMOJIS    = ['🐉','👾','💀','🦁','🤖','🐙','👹','🦂','🐺','🦊','🐲','🦅'];

const NP_STYLE_CATEGORIES = [
  {
    id: 'classic', label: '⭐ Classic', styles: [
      { id: 'glass',     icon: '🔲', name: 'Glass',     desc: 'Frosted glass card' },
      { id: 'eq',        icon: '📊', name: 'EQ Bars',   desc: 'Animated equalizer BG' },
      { id: 'notes',     icon: '🎵', name: 'Notes',     desc: 'Falling music notes' },
      { id: 'vinyl',     icon: '💿', name: 'Vinyl',     desc: 'Spinning vinyl record' },
      { id: 'aurora',    icon: '🌌', name: 'Aurora',    desc: 'Northern lights BG' },
      { id: 'neon',      icon: '💡', name: 'Neon',      desc: 'Neon club glow' },
      { id: 'cassette',  icon: '📼', name: 'Cassette',  desc: 'Retro cassette tape' },
      { id: 'pulse',     icon: '🔴', name: 'Pulse',     desc: 'Sonar pulse rings' },
      { id: 'particles', icon: '✨', name: 'Particles', desc: 'Floating sparkles' },
      { id: 'spectrum',  icon: '🌈', name: 'Spectrum',  desc: 'Spectrum + progress' },
      { id: 'simple',    icon: '🎧', name: 'Simple',    desc: 'Clean card + progress bar' },
    ],
  },
  {
    id: 'minimal', label: '🪶 Minimal', styles: [
      { id: 'pill',         icon: '💊', name: 'Pill',         desc: 'Compact pill badge' },
      { id: 'banner',       icon: '📰', name: 'Banner',       desc: 'Bottom banner strip' },
      { id: 'ghost',        icon: '👻', name: 'Ghost',        desc: 'Semi-transparent float' },
      { id: 'ticker',       icon: '📡', name: 'Ticker',       desc: 'Scrolling ticker tape' },
      { id: 'badge',        icon: '🏷️', name: 'Badge',        desc: 'Small corner badge' },
      { id: 'corner',       icon: '📐', name: 'Corner',       desc: 'Slim corner tag' },
      { id: 'minimal_dark', icon: '⬛', name: 'Dark Minimal', desc: 'Dark flat minimal' },
      { id: 'outline',      icon: '🔳', name: 'Outline',      desc: 'Outlined border card' },
      { id: 'frosted',      icon: '🧊', name: 'Frosted',      desc: 'Deep frosted blur card' },
      { id: 'card_white',   icon: '🃏', name: 'White Card',   desc: 'Clean white card' },
    ],
  },
  {
    id: 'animated', label: '🎬 Animated', styles: [
      { id: 'wave',       icon: '🌊', name: 'Wave',       desc: 'Animated wave BG' },
      { id: 'fire',       icon: '🔥', name: 'Fire',       desc: 'Rising fire particles' },
      { id: 'rain',       icon: '🌧️', name: 'Rain',       desc: 'Falling rain drops' },
      { id: 'plasma',     icon: '🔮', name: 'Plasma',     desc: 'Hue-shifting plasma' },
      { id: 'starfield',  icon: '🌠', name: 'Starfield',  desc: 'Flying through stars' },
      { id: 'fireflies',  icon: '🫧', name: 'Fireflies',  desc: 'Floating firefly dots' },
      { id: 'glitch',     icon: '📺', name: 'Glitch',     desc: 'Cyberpunk glitch fx' },
      { id: 'matrix',     icon: '🟩', name: 'Matrix',     desc: 'Green falling chars' },
      { id: 'ripple',     icon: '💧', name: 'Ripple',     desc: 'Water ripple rings' },
      { id: 'smoke',      icon: '🌫️', name: 'Smoke',      desc: 'Drifting smoke wisps' },
    ],
  },
  {
    id: 'musical', label: '🎵 Musical', styles: [
      { id: 'turntable',    icon: '🎚️', name: 'Turntable',    desc: 'DJ turntable spinner' },
      { id: 'piano',        icon: '🎹', name: 'Piano',        desc: 'Glowing piano keys' },
      { id: 'waveform',     icon: '〰️', name: 'Waveform',     desc: 'Audio waveform bars' },
      { id: 'oscilloscope', icon: '📈', name: 'Oscilloscope', desc: 'SVG sine wave line' },
      { id: 'vinyl_color',  icon: '🌀', name: 'Vinyl Color',  desc: 'Colorful spinning vinyl' },
      { id: 'spectrum_ring',icon: '⭕', name: 'Spectrum Ring',desc: 'Circular EQ ring' },
      { id: 'metronome',    icon: '🕐', name: 'Metronome',    desc: 'Swinging pendulum' },
      { id: 'cassette_mini',icon: '📼', name: 'Cassette Mini',desc: 'Tiny cassette player' },
      { id: 'boom_box',     icon: '📻', name: 'Boom Box',     desc: 'Retro boom box' },
      { id: 'headphones',   icon: '🎧', name: 'Headphones',   desc: 'Headphone silhouette' },
    ],
  },
  {
    id: 'themed', label: '🎭 Themed', styles: [
      { id: 'retro_80s',  icon: '🕹️', name: 'Retro 80s',   desc: 'Synthwave neon grid' },
      { id: 'vhs',        icon: '📼', name: 'VHS',         desc: 'VHS scanline flicker' },
      { id: 'terminal',   icon: '💻', name: 'Terminal',    desc: 'Green terminal code' },
      { id: 'hologram',   icon: '🔷', name: 'Hologram',   desc: 'Sci-fi hologram blue' },
      { id: 'newspaper',  icon: '🗞️', name: 'Newspaper',  desc: 'Black & white newsprint' },
      { id: 'polaroid',   icon: '📷', name: 'Polaroid',   desc: 'Polaroid photo border' },
      { id: 'cyberpunk',  icon: '⚡', name: 'Cyberpunk',  desc: 'Neon yellow + dark' },
      { id: 'lofi',       icon: '🍵', name: 'Lo-Fi',      desc: 'Cozy lo-fi aesthetic' },
      { id: 'anime',      icon: '🌸', name: 'Anime',      desc: 'Sakura pink soft style' },
      { id: 'nature',     icon: '🌿', name: 'Nature',     desc: 'Earthy green forest' },
    ],
  },
  {
    id: 'color', label: '🎨 Color', styles: [
      { id: 'sunset',   icon: '🌅', name: 'Sunset',   desc: 'Warm orange-pink gradient' },
      { id: 'midnight', icon: '🌙', name: 'Midnight', desc: 'Deep blue-purple night' },
      { id: 'cherry',   icon: '🍒', name: 'Cherry',   desc: 'Deep red-rose gradient' },
      { id: 'ocean',    icon: '🌊', name: 'Ocean',    desc: 'Teal-cyan ocean depths' },
      { id: 'forest',   icon: '🌲', name: 'Forest',   desc: 'Green woodland gradient' },
      { id: 'gold',     icon: '✨', name: 'Gold',     desc: 'Shimmering gold shimmer' },
      { id: 'cosmic',   icon: '🌌', name: 'Cosmic',   desc: 'Star-field dark purple' },
      { id: 'candy',    icon: '🍬', name: 'Candy',    desc: 'Pastel candy rainbow' },
      { id: 'lava',     icon: '🌋', name: 'Lava',     desc: 'Morphing lava blob' },
      { id: 'ice',      icon: '❄️', name: 'Ice',      desc: 'Icy cool blue-white' },
    ],
  },
];
// Flat list for backwards compat / default lookup
const NP_STYLES = NP_STYLE_CATEGORIES.flatMap(c => c.styles);

// Boss presets — เพิ่ม boss ใหม่ที่นี่ (images host ใน /public/boss/)
// frames: relative path 6 ไฟล์ คั่นด้วย comma (idle1,idle2,idle3,enrage1,enrage2,death)
const BOSS_PRESETS = [
  {
    id:         'golem',
    name:       'Stone Golem',
    desc:       'ลุงหินพิกเซลอาร์ต • 6 frame animation',
    emoji:      '🗿',
    preview:    '/boss/golem1.png',
    frames:     '/boss/golem1.png,/boss/golem2.png,/boss/golem3.png,/boss/golem4.png,/boss/golem5.png,/boss/golem6.png',
  },
  // เพิ่ม preset ใหม่ได้ที่นี่ เช่น:
  // { id: 'dragon', name: 'Fire Dragon', emoji: '🐉', preview: '/boss/dragon1.png', frames: '/boss/dragon1.png,...' },
];
const BOSS_ELEMENTS  = [
  { val: 'neutral', label: '⚪ กลาง (ไม่มีธาตุ)', desc: 'ดาเมจปกติทุกของขวัญ' },
  { val: 'fire',    label: '🔥 ไฟ',               desc: 'แพ้น้ำ | ทน: ดิน' },
  { val: 'water',   label: '💧 น้ำ',              desc: 'แพ้ลม | ทน: ไฟ' },
  { val: 'earth',   label: '🌍 ดิน',              desc: 'แพ้ไฟ | ทน: ลม' },
  { val: 'wind',    label: '🌪️ ลม',               desc: 'แพ้ดิน | ทน: น้ำ' },
];
const CREATURE_EMOJIS = ['🐉','🦋','🦄','🐣','🔥','🌟','👑','🐺'];

const WIDGETS = [
  {
    id: 'coinjar', icon: '🫙', name: 'Gift Jar',
    desc: 'ขวดโหลของขวัญ — jar อยู่ด้านล่าง gifts ร่วงจากด้านบน', size: '1200 × 1200',
    configFields: [
      { key: 'ct', label: '🫙 รูปแบบภาชนะ', type: 'select', default: 'jar',
        options: [
          { value: 'jar',       label: '🫙 โถแก้ว' },
          { value: 'fatjar',    label: '🏺 ขวดโหล' },
          { value: 'fishbowl',  label: '🐠 โถปลา' },
          { value: 'beermug',   label: '🍺 แก้วเบียร์' },
          { value: 'trophy',    label: '🏆 ถ้วยรางวัล' },
          { value: 'cauldron',  label: '🪄 หม้อเวทย์' },
          { value: 'chest',     label: '📦 หีบสมบัติ' },
          { value: 'bucket',    label: '🪣 ถัง' },
          { value: 'popcorn',   label: '🍿 ป๊อปคอร์น' },
          { value: 'skull',     label: '💀 กะโหลก' },
          { value: 'wineglass', label: '🍷 แก้วไวน์' },
          { value: 'flowerpot', label: '🌸 กระถาง' },
          { value: 'pandajar',  label: '🐼 Panda Jar' },
        ],
      },
    ],
  },
  {
    id: 'bossbattle', icon: '👾', name: 'Boss Battle',
    desc: 'มอนสเตอร์บน OBS — gift ทำดาเมจ ระบบธาตุ 5 ธาตุ ส่งผิดธาตุ = heal boss',
    size: '380 × 675', noStyle: true,
    configFields: [
      { key: '_g1',        label: '🐉 Boss Setup',                    type: 'group' },
      { key: 'hp',         label: 'Boss HP (รอบแรก)',                 type: 'number',  default: 1000,         min: 10,  max: 100000, step: 100 },
      { key: 'bossname',   label: 'ชื่อ Boss',                        type: 'text',    default: 'Dark Dragon', maxLen: 30 },
      { key: 'bosstype',   label: '🎨 Boss Sprite',                   type: 'bosstype', default: 'emoji' },
      // bossimg + bossframes: hidden from UI — ถูก set อัตโนมัติโดย bosstype selector
      { key: 'bossimg',    type: 'url',  default: '', hideInUI: true },
      { key: 'bossframes', type: 'text', default: '', hideInUI: true, maxLen: 2000 },
      { key: 'element',    label: 'ธาตุ Boss',                        type: 'element', default: 'neutral' },
      { key: 'hideelement', label: 'ซ่อนธาตุ Boss',                  type: 'toggle',  default: 0, onLabel: 'ซ่อน — เปิดเผยที่ HP ≤75%', offLabel: 'แสดงธาตุตั้งแต่ต้น' },
      { key: '_g2',       label: '⚔️ Gameplay',                      type: 'group' },
      { key: 'dmgmult',   label: 'ตัวคูณดาเมจ (1 coin = X dmg)',     type: 'number',  default: 1,            min: 0.1, max: 20,     step: 0.1 },
      { key: '_tap',      label: 'Like → Damage',                    type: 'row',
        fields: [
          { key: 'taprate', label: 'ทุกกี่ like (0=ปิด)', type: 'number', default: 0,  min: 0, max: 1000,  step: 1 },
          { key: 'tapdmg',  label: 'dmg ต่อครั้ง',        type: 'number', default: 1,  min: 1, max: 10000, step: 1 },
        ]
      },
      { key: 'wrongheal', label: 'ผิดธาตุ = Heal Boss',              type: 'toggle',  default: 1, onLabel: 'เปิด — ผิดธาตุ heal boss', offLabel: 'ปิด — ผิดธาตุ = 0 dmg' },
      { key: 'respawn',   label: 'Respawn Mode',                     type: 'toggle',  default: 0, onLabel: 'เปิด — HP ×1.5 ต่อรอบ', offLabel: 'ปิด — จบแล้วจบเลย' },
      { key: '_g3',       label: '🖼️ Display',                       type: 'group' },
      { key: 'side',      label: 'ตำแหน่ง',   type: 'select',  default: 'center', options: [{ value:'center', label:'■ กลาง' }, { value:'left', label:'◀ ซ้าย' }, { value:'right', label:'ขวา ▶' }] },
      { key: 'ww',        label: 'ความกว้าง Widget (px) — ตรงกับ OBS Source Width', type: 'number', default: 380, min: 280, max: 800, step: 10 },
      { key: 'carda',     label: 'ความทึบแผง (0=โปร่งใส → 100=ทึบ)', type: 'number', default: 58,  min: 0,   max: 100, step: 5  },
      { key: '_g4',       label: '🔊 เสียง',                           type: 'group' },
      { key: 'vol',       label: '🔊 ระดับเสียง',                      type: 'volume', default: 80 },
    ],
  },
  { id: 'chat',        icon: '💬', name: 'Chat Overlay',    desc: 'แสดงแผงคอมเม้น',                                  size: '400 × 600' },
  { id: 'pinchat',     icon: '📌', name: 'Pin Chat',        desc: 'แสดงข้อความที่ Pin จาก Chat Overlay',             size: '500 × 100' },
  { id: 'pinprofile',  icon: '👤', name: 'Pin Profile Card', desc: 'แสดงโปรไฟล์ TikTok ของข้อความที่ Pin',           size: '400×150 / 240×320' },
  { id: 'ttsmonitor',  icon: '🔊', name: 'TTS Monitor',     desc: 'แสดง engine/เสียง/persona ที่กำลังพูด — เห็นแค่ผู้ใช้ · ฟังก์ชันเฉพาะทาง', size: '400 × 200', noStyle: true },
  {
    id: 'likes-leaderboard', icon: '👍', name: 'Likes Leaderboard',
    desc: 'Top 10 ผู้ที่ Like มากที่สุด ตอนไลฟ์', size: '300 × 520',
    configFields: [
      { key: 'showMedal',    label: '🥇 เหรียญ Top 3',        type: 'toggle', default: 1, onLabel: 'เปิด — แสดงเหรียญ 🥇🥈🥉', offLabel: 'ปิด — แสดงเบอร์อันดับ #' },
      { key: 'showBg',       label: '🟦 Background แต่ละแถว', type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — โปร่งใส' },
      { key: 'showAvatar',   label: '👤 รูปโปรไฟล์',           type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showProgress', label: '📊 Progress Bar',          type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showLikes',    label: '👍 จำนวนไลค์',            type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'maxRows',      label: '📋 จำนวนแถวสูงสุด',        type: 'number', default: 10, min: 1, max: 20, step: 1 },
    ],
  },
  {
    id: 'gift-leaderboard',  icon: '🎁', name: 'Gift Leaderboard',
    desc: 'Top 10 ผู้ส่งของขวัญมากที่สุด ตอนไลฟ์', size: '300 × 520',
    configFields: [
      { key: 'showMedal',    label: '🥇 เหรียญ Top 3',        type: 'toggle', default: 1, onLabel: 'เปิด — แสดงเหรียญ 🥇🥈🥉', offLabel: 'ปิด — แสดงเบอร์อันดับ #' },
      { key: 'showBg',       label: '🟦 Background แต่ละแถว', type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — โปร่งใส' },
      { key: 'showAvatar',   label: '👤 รูปโปรไฟล์',           type: 'toggle', default: 0, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showProgress', label: '📊 Progress Bar',          type: 'toggle', default: 0, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showCoins',    label: '💎 จำนวน Diamond',        type: 'toggle', default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'maxRows',      label: '📋 จำนวนแถวสูงสุด',        type: 'number', default: 10, min: 1, max: 20, step: 1 },
    ],
  },
  {
    id: 'fireworks', icon: '🎆', name: 'Gift Fireworks',
    desc: 'พลุของขวัญ — Rocket = avatar ผู้ส่ง, ระเบิด = รูปของขวัญ',
    size: '800 × 800',
    configFields: [
      { key: 'vol', label: '🔊 ระดับเสียง', type: 'volume', default: 80 },
    ],
  },
  { id: 'myactions',         icon: '🎬', name: 'Actions Overlay',   desc: 'แสดง GIF/วิดีโอ/Alert จากระบบ ลูกเล่น TT บน OBS', size: '1920 × 1080', noStyle: true },
  {
    id: 'nowplaying', icon: '🎶', name: 'Now Playing',
    desc: 'แสดงเพลงที่กำลังฟังจาก Spotify — 10 สไตล์ให้เลือก เชื่อมต่อ Spotify ได้ที่ Settings',
    size: 'ขึ้นอยู่กับ Style', noStyle: true, liveConfig: true,
    configFields: [
      { key: 'style',        label: '🎨 เลือก Style',                     type: 'nowplaying_style', default: 'glass' },
      { key: 'fade',         label: '🌫️ Fade รอบขอบ Widget',              type: 'toggle', default: 1,
        onLabel: 'เปิด — ขอบ Widget จะ Fade โปร่งใส (แนะนำสำหรับ OBS)', offLabel: 'ปิด — ขอบทึบ' },
      { key: '_g1',          label: '✏️ ข้อความ & สี',                    type: 'group' },
      { key: 'fontSize',     label: '📏 ขนาดตัวอักษร Title (px)',         type: 'number', default: 13, min: 8, max: 36, step: 1 },
      { key: 'titleColor',   label: '🎨 สี Title',                         type: 'colorhex', default: 'ffffff' },
      { key: 'artistColor',  label: '🎨 สี Artist',                        type: 'colorhex', default: 'ffffff99' },
      { key: '_g2',          label: '📜 การเลื่อนข้อความ (Marquee)',       type: 'group' },
      { key: 'marquee',      label: '📜 เลื่อนข้อความ',                    type: 'toggle', default: 0,
        onLabel: 'เปิด — ข้อความเลื่อนแบบ Marquee', offLabel: 'ปิด — ตัดข้อความเมื่อยาวเกิน' },
      { key: 'marqueeDir',   label: '↔️ ทิศทางเลื่อน',                    type: 'select', default: 'left',
        options: [{ value: 'left', label: '← เลื่อนซ้าย' }, { value: 'right', label: '→ เลื่อนขวา' }] },
      { key: 'marqueeSpeed', label: '⚡ ความเร็ว (วินาที/รอบ — น้อย=เร็ว)', type: 'number', default: 8, min: 2, max: 30, step: 1 },
    ],
  },
  {
    id: 'spotifyqueue', icon: '🎵', name: 'Spotify Queue',
    desc: 'แสดงคิวเพลง Spotify สูงสุด 20 เพลง — เชื่อมต่อ Spotify ได้ที่ Settings',
    size: '340 × ปรับอัตโนมัติ', noStyle: true,
    configFields: [
      { key: '_g0',         label: '📋 คิวเพลง',                            type: 'group' },
      { key: 'maxItems',    label: '📋 จำนวนเพลงสูงสุด',                    type: 'number',   default: 10, min: 1, max: 20, step: 1 },
      { key: 'showCurrent', label: '▶ แสดงเพลงที่กำลังเล่น',               type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showDivider', label: '〰 เส้นคั่น "คิวถัดไป"',               type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: '_g1',         label: '🎨 ธีม & สี',                           type: 'group' },
      { key: 'theme',       label: '🎨 ธีม',                                type: 'select',   default: 'dark',
        options: [
          { value: 'dark',    label: '🌑 Dark' },
          { value: 'light',   label: '☀️ Light' },
          { value: 'glass',   label: '🔲 Glass' },
          { value: 'minimal', label: '🪶 Minimal' },
        ],
      },
      { key: 'bgColor',     label: '🟦 สี Background (ทับค่าธีม)',          type: 'colorhex', default: '' },
      { key: 'bgOpacity',   label: '💧 ความโปร่งแสง Background (0–100)',    type: 'number',   default: 90, min: 0, max: 100, step: 5 },
      { key: 'accentColor', label: '✅ สี Accent (เพลงปัจจุบัน)',            type: 'colorhex', default: '1DB954' },
      { key: '_g2',         label: '✏️ ข้อความ',                            type: 'group' },
      { key: 'fontSize',    label: '📏 ขนาดตัวอักษร Title (px)',            type: 'number',   default: 13, min: 8, max: 28, step: 1 },
      { key: 'titleColor',  label: '🎨 สี Title (ว่าง = ตามธีม)',           type: 'colorhex', default: '' },
      { key: 'artistColor', label: '🎨 สี Artist (ว่าง = ตามธีม)',          type: 'colorhex', default: '' },
      { key: 'marquee',     label: '📜 เลื่อนข้อความเมื่อยาว',              type: 'toggle',   default: 0, onLabel: 'เปิด — Marquee', offLabel: 'ปิด — ตัดข้อความ' },
      { key: 'scrollSpeed', label: '⚡ ความเร็ว Marquee (วินาที/รอบ)',       type: 'number',   default: 20, min: 4, max: 60, step: 2 },
      { key: '_g3',         label: '🖼️ Layout',                             type: 'group' },
      { key: 'rowHeight',   label: '↕ ความสูงแต่ละแถว (px)',                type: 'number',   default: 56, min: 36, max: 100, step: 4 },
      { key: 'showArt',     label: '🖼 Album Art',                           type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'roundArt',    label: '⬜ Album Art มน/เหลี่ยม',               type: 'toggle',   default: 1, onLabel: 'มน (rounded)', offLabel: 'เหลี่ยม (square)' },
      { key: 'showArtist',  label: '🎤 ชื่อศิลปิน',                         type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showDuration',label: '⏱ ความยาวเพลง',                         type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
      { key: 'showNumber',  label: '🔢 เลขลำดับ',                            type: 'toggle',   default: 1, onLabel: 'เปิด', offLabel: 'ปิด — ซ่อน' },
    ],
  },
  // ── ซ่อนชั่วคราว — ยังไม่พร้อมใช้งาน ──
  // { id: 'dungeon', icon: '🏚️', name: 'Dungeon Activity', desc: 'แสดงผู้เล่นที่กำลัง run dungeon อยู่ + feed เหตุการณ์ live', size: '360 × 480', noStyle: true },
  // { id: 'leaderboard', ... }
  // { id: 'egghatch', ... }
];

// ── Widget groups — ลำดับและสมาชิกในแต่ละหมวด ──────────────────────────────
const WIDGET_GROUPS = [
  { id: 'chat',  label: '💬 Chat',                    ids: ['chat', 'pinchat', 'pinprofile'] },
  { id: 'gifts', label: '🎁 ของขวัญ & Leaderboard',  ids: ['coinjar', 'fireworks', 'likes-leaderboard', 'gift-leaderboard'] },
  { id: 'obs',   label: '🎛️ OBS / Stream',            ids: ['bossbattle', 'myactions', 'ttsmonitor'] },
  { id: 'music', label: '🎵 Music',                   ids: ['nowplaying', 'spotifyqueue'] },
];

// user, authLoading มาจาก _app.js
export default function WidgetsPage({ theme, setTheme, user, authLoading, activePage, setActivePage, sidebarCollapsed, toggleSidebar }) {
  const [widgetCid, setWidgetCid]     = useState(''); // channel ID สั้น เช่น "10001"
  const [tokenLoading, setTokenLoading] = useState(false);
  const [baseUrl, setBaseUrl]         = useState('');
  const [styles, setStyles]           = useState(() =>
    Object.fromEntries(
      Object.entries(WIDGET_DEFAULTS).map(([k, v]) => [k, { ...v }])
    )
  );
  // drawer: widgetId ที่กำลัง customize | null = ปิด
  const [drawerWidget, setDrawerWidget] = useState(null);
  // howto: collapsed/expanded — default true (SSR safe), sync จาก localStorage ใน useEffect
  const [howtoOpen, setHowtoOpen] = useState(true);
  // group collapse state — default เปิดทั้งหมด
  const [groupOpen, setGroupOpen] = useState({ chat: true, gifts: true, obs: true, music: true });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginLoading, setLoginLoading]     = useState(false);
  // config สำหรับ widget ที่มี configFields (bossbattle, egghatch ฯลฯ)
  const [customConfigs, setCustomConfigs] = useState(() =>
    Object.fromEntries(
      WIDGETS.filter(w => w.configFields).map(w => [
        w.id,
        Object.fromEntries(w.configFields.map(f => [f.key, f.default])),
      ])
    )
  );

  const socketRef    = useRef(null);
  const importRef    = useRef(null);
  const [spotifyConnected, setSpotifyConnected] = useState(null); // null=unknown, true, false
  const [coinjarSimulating, setCoinjarSimulating] = useState(false);


  // ── ฟังเสียง Alert ใน Browser (default OFF) ──
  // เริ่มต้น false เสมอ (SSR ไม่มี localStorage) แล้ว sync จาก localStorage ใน useEffect
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => {
    try {
      if (localStorage.getItem('ttplus_widgets_audio') === '1') setAudioEnabled(true);
    } catch {}
    try {
      if (localStorage.getItem('ttplus_howto') === '0') setHowtoOpen(false);
    } catch {}
  }, []);

  // Web Audio API — ใช้ AudioContext ตัวเดียว (ต้อง resume หลัง user gesture)
  const audioCtxRef = useRef(null);
  const unlockAudio = useCallback(() => {
    // เรียกจาก click event เพื่อ unlock AudioContext
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  const playDing = useCallback((type = 'gift') => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return; // AudioContext ยังไม่ถูก unlock
    try {
      // gift → C5-E5-G5 (สดใส), follow → A4-C5 (อบอุ่น), like → E5 สั้นๆ
      const freqs = type === 'gift'   ? [523, 659, 784]
                  : type === 'follow' ? [440, 523]
                  : [659];
      const t = ctx.currentTime;
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0, t + i * 0.13);
        gain.gain.linearRampToValueAtTime(0.22, t + i * 0.13 + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + i * 0.13 + 0.38);
        osc.start(t + i * 0.13); osc.stop(t + i * 0.13 + 0.42);
      });
    } catch {}
  }, []);

  // ===== React to user prop =====
  useEffect(() => {
    setBaseUrl(window.location.origin);
    if (authLoading) return;

    let mounted = true;

    let cleanupListeners = () => {};

    if (user) {
      // Connect socket for real-time style push + audio alerts
      user.getIdToken().then(token => {
        if (!mounted) return;
        const socket = connectSocket(token);
        socketRef.current = socket;

        // ── Audio alert listeners (ใช้เมื่อ audioEnabled ON) ──
        const onGift   = () => { if (audioEnabledRef.current) playDing('gift');   };
        const onFollow = () => { if (audioEnabledRef.current) playDing('follow'); };
        const onLike   = () => { if (audioEnabledRef.current) playDing('like');   };
        socket.on('gift',   onGift);
        socket.on('follow', onFollow);
        socket.on('like',   onLike);
        // เก็บ cleanup ไว้ใช้ตอน unmount
        cleanupListeners = () => {
          socket.off('gift',   onGift);
          socket.off('follow', onFollow);
          socket.off('like',   onLike);
        };
      });

      // Load settings + fetch widget token
      (async () => {
        try {
          let s = getCachedSettings();
          if (!s) {
            const res = await api.get('/api/settings');
            s = res.data.settings;
            setCachedSettings(s);
          }
          if (!mounted) return;
          if (s?.widgetStyles) {
            setStyles(prev => {
              const merged = { ...prev };
              for (const id of Object.keys(prev)) {
                merged[id] = { ...WIDGET_DEFAULTS[id], ...(s.widgetStyles[id] || {}) };
              }
              return merged;
            });
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') console.error('[Widgets] settings load failed:', err?.message);
        }
        if (mounted) await fetchWidgetToken(user);

        // ── ตรวจสอบ Spotify connection status ──
        try {
          const spRes = await api.get('/api/spotify/status');
          if (mounted) setSpotifyConnected(!!spRes.data?.connected);
        } catch { if (mounted) setSpotifyConnected(false); }
      })();
    } else {
      // Not logged in — no socket needed on widgets page
      setWidgetCid('');
    }

    return () => {
      mounted = false;
      cleanupListeners(); // ลบ audio alert listeners เพื่อป้องกัน duplicate events
      // ไม่ disconnect socket ที่นี่ เพราะ dashboard อาจยังใช้อยู่
    };
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      toast.success('เข้าสู่ระบบสำเร็จ!');
    } catch {
      toast.error('Login ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const fetchWidgetToken = useCallback(async (forceUser) => {
    const u = forceUser ?? user;
    if (!u) { setShowLoginModal(true); return; }

    // ── Cache CID ใน localStorage ต่อ uid — ไม่ต้อง request ทุก refresh ──
    const cacheKey = `ttplus_cid_${u.uid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && /^\d{4,8}$/.test(cached)) {
        setWidgetCid(cached);
        return; // ใช้ cache — ไม่ hit API
      }
    } catch {}

    setTokenLoading(true);
    try {
      const res = await api.post('/api/widget-token');
      const cid = res.data?.cid;
      if (typeof cid === 'string' && /^\d{4,8}$/.test(cid)) {
        setWidgetCid(cid);
        try { localStorage.setItem(cacheKey, cid); } catch {} // เก็บ cache
      } else {
        toast.error('Widget ID ไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch (err) {
      showError(err, 'ไม่สามารถสร้าง Widget ID ได้');
    } finally {
      setTokenLoading(false);
    }
  }, [user]);

  const buildCustomParams = useCallback((w, overrides = {}) => {
    const cfg = customConfigs[w.id] || {};
    const params = [];
    for (const f of w.configFields) {
      if (f.type === 'group' || f.type === 'bosstype') continue; // UI-only, ไม่ใส่ใน URL
      if (f.type === 'row') {
        for (const sf of f.fields) {
          const val = overrides[sf.key] ?? cfg[sf.key] ?? sf.default;
          params.push(`${sf.key}=${encodeURIComponent(val)}`);
        }
        continue;
      }
      const val = overrides[f.key] ?? cfg[f.key] ?? f.default;
      // ข้าม url/text/colorhex fields ที่ว่าง (colorhex ว่าง = ใช้ค่า default ของ widget)
      if ((f.type === 'url' || f.type === 'text' || f.type === 'colorhex') && !val) continue;
      params.push(`${f.key}=${encodeURIComponent(val)}`);
    }
    return params.join('&');
  }, [customConfigs]);

  const getWidgetUrl = useCallback((widgetId) => {
    // nowplaying ใช้ ?cid= เหมือน widget อื่น (ต้องการ widgetCid)
    if (widgetId === 'nowplaying') {
      if (!baseUrl || !widgetCid) return '';
      const w       = WIDGETS.find(ww => ww.id === 'nowplaying');
      const configQ = buildCustomParams(w);
      const base    = `${baseUrl}/widget/nowplaying?cid=${widgetCid}`;
      return configQ ? `${base}&${configQ}` : base;
    }
    if (!baseUrl || !widgetCid) return '';
    const w = WIDGETS.find(ww => ww.id === widgetId);
    // ทุก widget ใช้ ?cid= เหมือนกันหมด (leaderboard, myactions, fireworks, ฯลฯ)
    const base = `${baseUrl}/widget/${widgetId}?cid=${widgetCid}`;
    if (w?.configFields) {
      const configQ = buildCustomParams(w);
      // widget ที่มีทั้ง style + configFields (เช่น leaderboard) → รวม params ทั้งคู่
      if (!w.noStyle) {
        const style  = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
        const styleQ = styleToParams(style, widgetId);
        const combined = [styleQ, configQ].filter(Boolean).join('&');
        return combined ? `${base}&${combined}` : base;
      }
      return configQ ? `${base}&${configQ}` : base;
    }
    const style = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    if (!style) return base;
    const styleQ = styleToParams(style, widgetId);
    return styleQ ? `${base}&${styleQ}` : base;
  }, [widgetCid, baseUrl, styles, buildCustomParams, user, customConfigs]);

  const copyUrl = useCallback((widgetId) => {
    if (!user) { setShowLoginModal(true); return; }
    const url = getWidgetUrl(widgetId);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('✅ Copy URL แล้ว! วางใน TikTok Studio ได้เลย');
    });
  }, [user, getWidgetUrl]);

  // Copy Boss Battle URL with specific side override
  const copyBossBattleSide = useCallback((side) => {
    if (!user) { setShowLoginModal(true); return; }
    if (!widgetCid || !baseUrl) return;
    const w      = WIDGETS.find(ww => ww.id === 'bossbattle');
    const params = buildCustomParams(w, { side });
    const url    = `${baseUrl}/widget/bossbattle?cid=${widgetCid}&${params}`;
    navigator.clipboard.writeText(url).then(() => {
      const label = side === 'left' ? 'ซ้าย ◀' : side === 'right' ? 'ขวา ▶' : 'กลาง ■';
      toast.success(`✅ Copy URL ${label} แล้ว!`);
    });
  }, [user, widgetCid, baseUrl, buildCustomParams]);

  // ── จำลองของขวัญ random → emit ไปยัง widget จริงของ user ──
  const simulateCoinjar = useCallback(async () => {
    if (!user) { setShowLoginModal(true); return; }
    if (coinjarSimulating) return;
    setCoinjarSimulating(true);
    try {
      const res = await api.post('/api/coinjar/simulate');
      const { gift, diamonds, repeat } = res.data;
      const plural = repeat > 1 ? ` ×${repeat}` : '';
      toast.success(`🎁 ${gift}${plural} (${diamonds} 💎) ตกลงในขวดแล้ว!`);
    } catch {
      toast.error('ส่ง simulate ไม่ได้ — ตรวจสอบว่า widget เปิดอยู่');
    } finally {
      setCoinjarSimulating(false);
    }
  }, [user, coinjarSimulating]);

  const getPreviewUrl = useCallback((widgetId) => {
    if (!baseUrl) return '#';
    // nowplaying preview — รวม configFields params ทั้งหมด
    if (widgetId === 'nowplaying') {
      const w       = WIDGETS.find(ww => ww.id === 'nowplaying');
      const configQ = buildCustomParams(w);
      const base    = `${baseUrl}/widget/nowplaying?preview=1`;
      return configQ ? `${base}&${configQ}` : base;
    }
    const w = WIDGETS.find(ww => ww.id === widgetId);
    // preview ใช้ ?preview=1 เสมอ — ไม่ต้องการ cid/vjId
    const base = `${baseUrl}/widget/${widgetId}?preview=1`;

    if (w?.configFields) {
      const configQ = buildCustomParams(w);
      if (!w.noStyle) {
        const style  = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
        const styleQ = styleToParams(style, widgetId);
        const combined = [styleQ, configQ].filter(Boolean).join('&');
        return combined ? `${base}&${combined}` : base;
      }
      return configQ ? `${base}&${configQ}` : base;
    }
    const style = styles[widgetId] || WIDGET_DEFAULTS[widgetId];
    if (!style) return base;
    const styleQ = styleToParams(style, widgetId);
    return styleQ ? `${base}&${styleQ}` : base;
  }, [baseUrl, styles, buildCustomParams, customConfigs]);

  const saveStyleForWidget = useCallback(async (widgetId, style) => {
    if (!user) { setShowLoginModal(true); return; }
    const newStyles = { ...styles, [widgetId]: style };
    setStyles(newStyles);

    // ===== Real-time push ไปยัง widget ที่เปิดอยู่ใน OBS =====
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit('push_style_update', { widgetId, style });
    }

    try {
      await api.post('/api/settings', { settings: { widgetStyles: newStyles } });
      toast.success(`✅ บันทึก ${WIDGETS.find(w => w.id === widgetId)?.name} แล้ว`);
    } catch (err) {
      showError(err, 'บันทึก Widget ไม่สำเร็จ');
    }
  }, [user, styles]);

  // Push configFields ไปยัง widget แบบ Real-time (สำหรับ widget ที่มี liveConfig: true)
  const applyLiveConfig = useCallback((widgetId) => {
    const socket = socketRef.current || getSocket();
    if (!socket?.connected) { toast.error('ต้อง Connect Socket ก่อน'); return; }
    const config = customConfigs[widgetId] || {};
    socket.emit('push_style_update', { widgetId, style: config });
    toast.success(`✅ Apply ${WIDGETS.find(w => w.id === widgetId)?.name} แล้ว`);
  }, [customConfigs]);

  // Inline volume slider — update config + push real-time ทันที (ไม่ต้องกด Save)
  const setWidgetVol = useCallback((widgetId, vol) => {
    const v = Math.max(0, Math.min(100, Number(vol)));
    setCustomConfigs(prev => ({ ...prev, [widgetId]: { ...prev[widgetId], vol: v } }));
    // Push real-time ถ้า socket connected — URL ก็อัปเดตอัตโนมัติ (copy URL ใหม่ได้เสมอ)
    const socket = socketRef.current || getSocket();
    if (socket?.connected) {
      socket.emit('push_style_update', { widgetId, style: { vol: v } });
    }
    // ไม่ toast ทุก slide — เพราะ URL บน card อัปเดต real-time แล้ว ผู้ใช้ copy URL ใหม่ได้เลย
  }, []);

  const toggleHowto = () => setHowtoOpen(prev => {
    const next = !prev;
    try { localStorage.setItem('ttplus_howto', next ? '1' : '0'); } catch {}
    return next;
  });
  const toggleGroup = (id) => setGroupOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const tokenReady = !!widgetCid && !tokenLoading;

  // ── Import Backup ──────────────────────────────────────────────────────────
  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const toastId = toast.loading('กำลัง Import...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.widgetStyles) throw new Error('ไฟล์ไม่ถูกต้อง (ไม่พบ widgetStyles)');
      // restore styles
      setStyles(data.widgetStyles);
      if (data.customConfigs) setCustomConfigs(data.customConfigs);
      // save to backend
      if (user) {
        await api.post('/api/settings', { settings: { widgetStyles: data.widgetStyles } });
      }
      toast.success('⬆ Import Widgets เรียบร้อย', { id: toastId });
    } catch (err) { toast.error('Import ไม่สำเร็จ: ' + err.message, { id: toastId }); }
  }, [user]);

  const isDark  = theme === 'dark';
  const bg      = isDark ? 'bg-gray-950 text-white'       : 'bg-gray-100 text-gray-900';
  const card    = isDark ? 'bg-gray-900 border-gray-800'  : 'bg-white border-gray-200 shadow-sm';
  const divider = isDark ? 'border-gray-800'              : 'border-gray-100';
  const urlBox  = isDark ? 'bg-gray-800 text-gray-400'    : 'bg-gray-100 text-gray-500';
  const btn2nd  = isDark
    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
    : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600';

  return (
    <div className={clsx('min-h-screen', bg)}>
      <Sidebar theme={theme} user={user} activePage={activePage} setActivePage={setActivePage} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

      <main className={clsx('p-4 md:p-6', sidebarCollapsed ? 'ml-16' : 'ml-16 md:ml-56')}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
              OBS / TikTok Studio Widgets
            </h1>
            <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
              Copy URL แล้ววางใน TikTok Studio หรือ OBS — ปรับแต่งสีแล้วบันทึก
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export / Import Backup */}
            {user && (<>
              <button
                onClick={() => importRef.current?.click()}
                title="Import Widget Settings จากไฟล์ Backup"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80"
              >
                ⬆ Import
              </button>
              <button
                onClick={() => {
                  const data = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    tab: 'widgets',
                    widgetStyles:  styles,
                    customConfigs,
                  };
                  const json     = JSON.stringify(data, null, 2);
                  const filename = `ttplus-widgets-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  const uri      = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
                  const a        = document.createElement('a');
                  a.href = uri; a.download = filename;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a);
                  toast.success('⬇ Export Widgets เรียบร้อย');
                }}
                title="Export Widget Settings เป็นไฟล์ Backup"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition bg-gray-800/80 text-gray-400 hover:text-gray-200 hover:bg-gray-700/80"
              >
                ⬇ Export
              </button>
            </>)}
            {/* audio toggle — removed */}
            {!user && (
              <button onClick={() => setShowLoginModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
                เข้าสู่ระบบ
              </button>
            )}
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 text-lg" aria-label="Toggle theme">
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Token status */}
        {!user ? (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-brand-500/10 border-brand-500/25 text-brand-300' : 'bg-brand-50 border-brand-200 text-brand-700')}>
            🔒{' '}
            <button onClick={() => setShowLoginModal(true)} className="underline hover:no-underline transition">
              เข้าสู่ระบบ
            </button>
            {' '}เพื่อรับ Widget URL สำหรับใช้งานจริงใน OBS / TikTok Studio
          </div>
        ) : tokenReady ? (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-green-500/10 border-green-500/25 text-green-400' : 'bg-green-50 border-green-200 text-green-700')}>
            ✅ Widget URL พร้อมให้ copy แล้ว 🔗
          </div>
        ) : (
          <div className={clsx('rounded-xl p-3 mb-4 text-sm flex items-center gap-2 border',
            isDark ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700')}>
            ⏳ {tokenLoading ? 'กำลังโหลด Widget URL... (Railway cold start อาจใช้เวลา 30-60 วินาที)' : 'กำลังเตรียม Widget URL...'}
          </div>
        )}

        {/* วิธีใช้ — collapsible */}
        <div className={clsx('rounded-xl mb-5 border overflow-hidden',
          isDark ? 'bg-blue-500/10 border-blue-500/25' : 'bg-blue-50 border-blue-200')}>
          <button
            onClick={toggleHowto}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-blue-400 font-semibold text-sm">📌 วิธีใช้กับ TikTok Studio / OBS</span>
            <span className={clsx('text-blue-400 text-sm transition-transform', howtoOpen ? 'rotate-180' : '')}>▾</span>
          </button>
          {howtoOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-blue-500/20 pt-3">
              {[
                { n: '1', t: 'Login ด้วย Google',    d: 'กดปุ่ม Login มุมขวาบน — URL ของคุณจะถูกสร้างอัตโนมัติและไม่เปลี่ยนแปลง' },
                { n: '2', t: 'Copy URL ของ Widget',   d: 'กด 📋 Copy URL → วางใน OBS หรือ TikTok Studio ครั้งเดียวพอ' },
                { n: '3', t: 'Customize ได้ตลอด',    d: 'กด ⚙️ Customize → ปรับสี → กด บันทึก — URL เดิมใช้ได้ตลอด ไม่ต้อง copy ใหม่' },
                { n: '4', t: 'TikTok Studio',          d: 'Copy Link ในเว็บ → Add Sources → Link → วาง URL (Ctrl+V)' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 bg-blue-500 text-white">{s.n}</span>
                  <div>
                    <p className={clsx('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{s.t}</p>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget Groups */}
        <div className="space-y-6">
          {WIDGET_GROUPS.map(group => {
            const groupWidgets = WIDGET_GROUPS
              ? group.ids.map(id => WIDGETS.find(w => w.id === id)).filter(Boolean)
              : [];
            const isGroupOpen = groupOpen[group.id] !== false;
            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 mb-3 text-left group"
                >
                  <span className={clsx('text-sm font-bold', isDark ? 'text-gray-200' : 'text-gray-700')}>{group.label}</span>
                  <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
                  <span className={clsx(
                    'text-xs transition-transform',
                    isDark ? 'text-gray-500' : 'text-gray-400',
                    isGroupOpen ? 'rotate-180' : ''
                  )}>▾</span>
                </button>

                {/* Widget cards in group */}
                {isGroupOpen && (
                  <div className="space-y-3">
                    {groupWidgets.map((w) => {
                      const url          = getWidgetUrl(w.id);
                      const isDrawerOpen = drawerWidget === w.id;
                      const widgetReady  = w.noToken ? !!user?.uid : tokenReady;
                      return (
                        <div key={w.id} className={clsx('rounded-xl border overflow-hidden', card)}>
                          <div className="p-4">
                            {/* Top: icon + name + size */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{w.icon}</span>
                                <div>
                                  <h3 className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{w.name}</h3>
                                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>{w.desc}</p>
                                </div>
                              </div>
                              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ml-2', isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400')}>
                                {w.size}
                              </span>
                            </div>

                            {/* URL row */}
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className={clsx('flex-1 rounded-lg px-3 py-2 font-mono text-xs truncate cursor-pointer', urlBox)}
                                title={widgetReady ? url : ''}
                                onClick={() => widgetReady && copyUrl(w.id)}
                              >
                                {widgetReady ? url : (w.noToken ? '🔒 Login ก่อนเพื่อรับ URL' : tokenLoading ? '⏳ กำลังโหลด...' : '— รอสักครู่ —')}
                              </div>
                              <button
                                onClick={() => copyUrl(w.id)}
                                disabled={!widgetReady}
                                className="shrink-0 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50"
                              >
                                📋 Copy
                              </button>
                            </div>

                            {/* Boss Battle quick-side copy */}
                            {w.id === 'bossbattle' && (
                              <div className="flex gap-1.5 mb-3">
                                {[
                                  { side: 'left',   label: '◀ ซ้าย' },
                                  { side: 'center', label: '■ กลาง' },
                                  { side: 'right',  label: 'ขวา ▶' },
                                ].map(({ side, label }) => (
                                  <button
                                    key={side}
                                    onClick={() => copyBossBattleSide(side)}
                                    disabled={!tokenReady}
                                    className={clsx(
                                      'flex-1 py-1.5 rounded-lg text-xs font-semibold transition border disabled:opacity-40',
                                      isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-brand-500/50 hover:text-brand-300'
                                             : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700'
                                    )}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Now Playing — Spotify banner */}
                            {w.id === 'nowplaying' && user && spotifyConnected === false && (
                              <div className={clsx(
                                'flex items-center gap-3 mb-3 px-3 py-2.5 rounded-lg border',
                                isDark
                                  ? 'bg-green-950/40 border-green-800/50 text-green-300'
                                  : 'bg-green-50 border-green-200 text-green-800'
                              )}>
                                <span className="text-2xl flex-shrink-0">🎵</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold">ยังไม่ได้เชื่อมต่อ Spotify</p>
                                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-green-400/70' : 'text-green-600/80')}>
                                    ต้องเชื่อมต่อก่อน widget จึงจะแสดงเพลงได้
                                  </p>
                                </div>
                                <button
                                  onClick={() => setActivePage?.('settings')}
                                  className="shrink-0 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition"
                                >
                                  ⚙️ Settings
                                </button>
                              </div>
                            )}
                            {w.id === 'nowplaying' && user && spotifyConnected === true && (
                              <div className={clsx(
                                'flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs',
                                isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'
                              )}>
                                <span>✅</span>
                                <span>เชื่อมต่อ Spotify แล้ว — Widget พร้อมใช้งาน</span>
                              </div>
                            )}
                            {w.id === 'nowplaying' && !user && (
                              <div className={clsx(
                                'flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs border',
                                isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                              )}>
                                <span>🔒</span>
                                <span>Login ก่อน แล้วเชื่อมต่อ Spotify ใน Settings</span>
                              </div>
                            )}

                            {/* CoinJar — ปุ่มจำลองของขวัญ */}
                            {w.id === 'coinjar' && (
                              <button
                                onClick={simulateCoinjar}
                                disabled={coinjarSimulating || !tokenReady}
                                className={clsx(
                                  'w-full mb-2 py-2 rounded-lg text-sm font-semibold transition border',
                                  coinjarSimulating || !tokenReady
                                    ? 'opacity-50 cursor-not-allowed'
                                    : isDark
                                      ? 'bg-violet-900/30 border-violet-700/50 text-violet-300 hover:bg-violet-800/40 hover:border-violet-500/70'
                                      : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300',
                                )}
                              >
                                {coinjarSimulating ? '⏳ กำลังส่ง...' : '🎲 จำลองของขวัญ (random)'}
                              </button>
                            )}

                            {/* Inline volume slider — แสดงเฉพาะ widget ที่มีเสียง */}
                            {w.configFields?.some(f => f.key === 'vol') && (
                              <div className={clsx(
                                'flex items-center gap-3 mb-3 px-3 py-2 rounded-lg',
                                isDark ? 'bg-gray-800/60' : 'bg-gray-100/80'
                              )}>
                                <span className="text-base flex-shrink-0">
                                  {(customConfigs[w.id]?.vol ?? 80) === 0 ? '🔇' : (customConfigs[w.id]?.vol ?? 80) < 40 ? '🔈' : '🔊'}
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={customConfigs[w.id]?.vol ?? 80}
                                  onChange={e => setWidgetVol(w.id, e.target.value)}
                                  className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
                                />
                                <span className={clsx(
                                  'text-xs font-mono w-8 text-right flex-shrink-0',
                                  isDark ? 'text-gray-400' : 'text-gray-500'
                                )}>
                                  {customConfigs[w.id]?.vol ?? 80}%
                                </span>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <a
                                href={getPreviewUrl(w.id)}
                                target="_blank"
                                rel="noreferrer"
                                className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold text-center transition border', btn2nd)}
                              >
                                ▶ ดูตัวอย่าง
                              </a>
                              {(!w.noStyle || w.configFields) && (
                                <button
                                  onClick={() => setDrawerWidget(isDrawerOpen ? null : w.id)}
                                  className={clsx(
                                    'flex-1 py-2 rounded-lg text-sm font-semibold transition border',
                                    isDrawerOpen
                                      ? 'bg-brand-500/15 border-brand-500/50 text-brand-400'
                                      : btn2nd
                                  )}
                                >
                                  ⚙️ Customize
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>

      {/* ── Customize Drawer ── */}
      {drawerWidget && (() => {
        const dw  = WIDGETS.find(x => x.id === drawerWidget);
        if (!dw) return null;
        const style  = styles[dw.id] || WIDGET_DEFAULTS[dw.id];
        const cfg    = customConfigs[dw.id] || {};
        const setKey = (k, v) => setCustomConfigs(prev => ({ ...prev, [dw.id]: { ...prev[dw.id], [k]: v } }));
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setDrawerWidget(null)}
            />
            {/* Panel */}
            <div
              className={clsx(
                'fixed right-0 bottom-0 z-50 w-full md:w-[440px] flex flex-col shadow-2xl border-l',
                isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              )}
              style={{ top: 26 }}
            >
              {/* Header */}
              <div className={clsx('flex items-center gap-3 px-5 py-4 border-b shrink-0', isDark ? 'border-gray-800' : 'border-gray-100')}>
                <span className="text-2xl">{dw.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={clsx('font-bold text-sm', isDark ? 'text-white' : 'text-gray-900')}>{dw.name}</h3>
                  <p className={clsx('text-[10px] font-mono', isDark ? 'text-gray-500' : 'text-gray-400')}>{dw.size} px</p>
                </div>
                <button
                  onClick={() => setDrawerWidget(null)}
                  className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-lg transition', isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900')}
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Standard style editor */}
                {!dw.noStyle && (
                  <>
                    <WidgetStyleEditor
                      widgetId={dw.id}
                      style={style}
                      onChange={newStyle => setStyles(prev => ({ ...prev, [dw.id]: newStyle }))}
                      theme={theme}
                    />
                  </>
                )}

                {/* Custom config (bossbattle ฯลฯ) */}
                {dw.configFields && (
                  <div className="space-y-4">
                    {/* Spotify hint — แสดงเฉพาะ widget ที่ต้องการ Spotify */}
                    {(dw.id === 'spotifyqueue') && !spotifyConnected && (
                      <div className={clsx('rounded-xl px-4 py-3 text-xs', isDark ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-700')}>
                        🎵 ต้องเชื่อมต่อ Spotify ใน{' '}
                        <button className="underline font-semibold" onClick={() => setActivePage && setActivePage('settings')}>Settings</button>
                        {' '}ก่อนถึงจะเห็นข้อมูลจริง
                      </div>
                    )}
                    {dw.configFields.map(f => {
                      if (f.type === 'group') return (
                        <div key={f.key} className="flex items-center gap-2 pt-1">
                          <span className={clsx('text-xs font-bold tracking-wide', isDark ? 'text-gray-300' : 'text-gray-600')}>{f.label}</span>
                          <div className={clsx('flex-1 h-px', isDark ? 'bg-gray-700' : 'bg-gray-200')} />
                        </div>
                      );
                      if (f.hideInUI) return null;
                      if (f.type === 'nowplaying_style') {
                        const cur = cfg[f.key] ?? f.default;
                        return (
                          <div key={f.key}>
                            <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                              {NP_STYLE_CATEGORIES.map(cat => (
                                <div key={cat.id}>
                                  <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-1.5', isDark ? 'text-gray-500' : 'text-gray-400')}>{cat.label}</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {cat.styles.map(s => (
                                      <button key={s.id} onClick={() => setKey('style', s.id)}
                                        className={clsx(
                                          'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 text-left transition',
                                          cur === s.id
                                            ? 'border-brand-500 bg-brand-500/15'
                                            : isDark ? 'border-gray-700 bg-gray-800/50 hover:border-gray-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                        )}>
                                        <span className="text-base flex-shrink-0">{s.icon}</span>
                                        <div className="min-w-0">
                                          <p className={clsx('text-[11px] font-semibold leading-tight truncate', isDark ? 'text-gray-200' : 'text-gray-800')}>{s.name}</p>
                                          <p className={clsx('text-[9px] leading-tight truncate', isDark ? 'text-gray-500' : 'text-gray-400')}>{s.desc}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Spotify connect hint */}
                            {!user && (
                              <p className={clsx('text-[10px] mt-2', isDark ? 'text-yellow-400/80' : 'text-yellow-600')}>
                                ⚠️ ต้อง Login และเชื่อมต่อ Spotify ใน Settings ก่อนใช้งาน
                              </p>
                            )}
                          </div>
                        );
                      }
                      if (f.type === 'bosstype') {
                        const curType  = cfg['bosstype'] ?? f.default;
                        const curEmoji = cfg['emoji'] ?? '🐉';
                        return (
                          <div key={f.key}>
                            <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => { setKey('bosstype','emoji'); setKey('bossframes',''); setKey('bossimg',''); }}
                                className={clsx('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition', curType==='emoji' ? 'border-brand-500 bg-brand-500/15' : isDark ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')}>
                                <span style={{ fontSize:32, lineHeight:1 }}>{curEmoji}</span>
                                <span className={clsx('text-xs font-medium', isDark ? 'text-gray-300' : 'text-gray-600')}>Emoji</span>
                              </button>
                              {BOSS_PRESETS.map(preset => (
                                <button key={preset.id}
                                  onClick={() => { const abs=preset.frames.split(',').map(p=>`${baseUrl}${p}`).join(','); setKey('bosstype',preset.id); setKey('bossframes',abs); setKey('bossimg',''); }}
                                  className={clsx('p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition', curType===preset.id ? 'border-brand-500 bg-brand-500/15' : isDark ? 'border-gray-700 hover:border-gray-500 bg-gray-800/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50')}>
                                  <img src={preset.preview} alt={preset.name} style={{ width:42, height:42, objectFit:'contain', imageRendering:'pixelated' }} />
                                  <span className={clsx('text-xs font-medium text-center', isDark ? 'text-gray-300' : 'text-gray-600')}>{preset.name}</span>
                                </button>
                              ))}
                            </div>
                            {curType!=='emoji' && BOSS_PRESETS.find(p=>p.id===curType) && (
                              <p className={clsx('text-xs mt-2', isDark ? 'text-gray-500' : 'text-gray-400')}>{BOSS_PRESETS.find(p=>p.id===curType).desc}</p>
                            )}
                          </div>
                        );
                      }
                      if (f.type === 'row') return (
                        <div key={f.key}>
                          <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                          <div className="grid grid-cols-2 gap-3">
                            {f.fields.map(sf => {
                              const sv = cfg[sf.key] ?? sf.default;
                              return (
                                <div key={sf.key}>
                                  <p className={clsx('text-xs mb-1', isDark ? 'text-gray-500' : 'text-gray-400')}>{sf.label}</p>
                                  <input type="number" min={sf.min} max={sf.max} step={sf.step||1} value={sv}
                                    onChange={e => setKey(sf.key, Math.max(sf.min, Math.min(sf.max, Number(e.target.value))))}
                                    className={clsx('w-full px-2 py-1.5 rounded-lg text-sm text-center font-mono border', isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-200 text-gray-900')}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                      const val = cfg[f.key] ?? f.default;
                      return (
                        <div key={f.key}>
                          <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>{f.label}</p>
                          {f.type==='volume' && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <input type="range" min={0} max={100} step={5} value={val} onChange={e => setKey(f.key, Number(e.target.value))} className="flex-1 accent-orange-500" />
                                <span className={clsx('w-16 text-right text-xs font-bold font-mono flex-shrink-0', val===0 ? (isDark?'text-gray-500':'text-gray-400') : 'text-orange-400')}>{val===0?'🔇 เงียบ':`🔊 ${val}%`}</span>
                              </div>
                              <div className={clsx('flex justify-between text-xs', isDark?'text-gray-600':'text-gray-400')}><span>🔇 เงียบ (0)</span><span>🔊 ดังสุด (100)</span></div>
                            </div>
                          )}
                          {f.type==='number' && (
                            <div className="flex items-center gap-3">
                              <input type="range" min={f.min} max={f.max} step={f.step||1} value={val} onChange={e => setKey(f.key, Number(e.target.value))} className="flex-1 accent-brand-500" />
                              <input type="number" min={f.min} max={f.max} step={f.step||1} value={val} onChange={e => setKey(f.key, Math.max(f.min, Math.min(f.max, Number(e.target.value))))}
                                className={clsx('w-24 px-2 py-1 rounded-lg text-sm text-center font-mono border', isDark?'bg-gray-800 border-gray-700 text-white':'bg-gray-100 border-gray-200 text-gray-900')} />
                            </div>
                          )}
                          {f.type==='text' && (
                            <input type="text" value={val} maxLength={f.maxLen||40} onChange={e => setKey(f.key, e.target.value)}
                              className={clsx('w-full px-3 py-2 rounded-lg text-sm border', isDark?'bg-gray-800 border-gray-700 text-white':'bg-gray-100 border-gray-200 text-gray-900')} />
                          )}
                          {f.type==='colorhex' && (() => {
                            // รองรับ hex 6 หลัก (fffff) หรือ hex+alpha 8 หลัก (ffffff99)
                            const hex6 = '#' + (val.slice(0,6) || 'ffffff');
                            const alpha = val.length === 8 ? val.slice(6,8) : '';
                            const alphaNum = alpha ? Math.round(parseInt(alpha,16)/255*100) : 100;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  {/* Color wheel */}
                                  <input
                                    type="color"
                                    value={hex6}
                                    onChange={e => {
                                      const h = e.target.value.slice(1); // ตัด #
                                      setKey(f.key, alpha ? h + alpha : h);
                                    }}
                                    className="w-10 h-10 rounded-lg border-2 cursor-pointer flex-shrink-0 p-0.5"
                                    style={{ borderColor: isDark ? '#374151' : '#d1d5db', background: 'transparent' }}
                                  />
                                  {/* Hex value display */}
                                  <div className={clsx('flex-1 px-3 py-2 rounded-lg text-sm font-mono border', isDark?'bg-gray-800 border-gray-700 text-gray-300':'bg-gray-100 border-gray-200 text-gray-700')}>
                                    #{val || 'ffffff'}
                                  </div>
                                </div>
                                {/* Alpha slider (เฉพาะ field ที่รองรับ alpha) */}
                                {val.length >= 7 || alpha ? (
                                  <div className="flex items-center gap-3">
                                    <span className={clsx('text-xs flex-shrink-0 w-12', isDark?'text-gray-500':'text-gray-400')}>ความทึบ</span>
                                    <input
                                      type="range" min={0} max={100} step={5}
                                      value={alphaNum}
                                      onChange={e => {
                                        const a = Math.round(Number(e.target.value)/100*255);
                                        const hex = a.toString(16).padStart(2,'0');
                                        setKey(f.key, val.slice(0,6) + hex);
                                      }}
                                      className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
                                    />
                                    <span className={clsx('text-xs font-mono w-10 text-right flex-shrink-0', isDark?'text-gray-400':'text-gray-500')}>{alphaNum}%</span>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                          {f.type==='toggle' && (
                            <button onClick={() => setKey(f.key, val ? 0 : 1)}
                              className={clsx('w-full py-2 rounded-lg text-sm font-semibold border transition', val ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : isDark?'bg-gray-800 border-gray-700 text-gray-400':'bg-gray-100 border-gray-200 text-gray-500')}>
                              {val ? `✅ ${f.onLabel}` : `⬜ ${f.offLabel}`}
                            </button>
                          )}
                          {f.type==='select' && (
                            <div className="flex gap-2 flex-wrap">
                              {f.options.map(opt => (
                                <button key={opt.value} onClick={() => setKey(f.key, opt.value)}
                                  className={clsx('flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition', val===opt.value ? 'bg-brand-500/15 border-brand-500/50 text-brand-400' : isDark?'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500':'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200')}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {f.type==='element' && (
                            <div className="space-y-1.5">
                              {BOSS_ELEMENTS.map(el => (
                                <button key={el.val} onClick={() => setKey(f.key, el.val)}
                                  className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border transition text-left', val===el.val ? 'bg-brand-500/15 border-brand-500/50 text-brand-300' : isDark?'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500':'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300')}>
                                  <span className="font-bold">{el.label}</span>
                                  <span className={clsx('text-xs ml-auto', isDark?'text-gray-500':'text-gray-400')}>{el.desc}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className={clsx('rounded-lg p-3 text-xs border', isDark?'bg-blue-500/10 border-blue-500/25 text-blue-300':'bg-blue-50 border-blue-200 text-blue-700')}>
                      💡 หลัง Copy URL แล้วกด ▶ ดูตัวอย่าง — กด <strong>R</strong> ในหน้า preview เพื่อ reset
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={clsx('px-5 py-4 border-t shrink-0 space-y-2', isDark ? 'border-gray-800' : 'border-gray-100')}>
                {/* Standard widget: save button */}
                {!dw.noStyle && (
                  <button onClick={() => saveStyleForWidget(dw.id, style)}
                    className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
                    💾 บันทึกและ Update Widget แบบ Real-time
                  </button>
                )}
                {/* liveConfig widget (เช่น nowplaying): Apply Real-time button */}
                {dw.liveConfig && (
                  <button onClick={() => applyLiveConfig(dw.id)}
                    className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition">
                    💾 Apply Real-time
                  </button>
                )}
                {/* Custom config: reset + copy URL */}
                {dw.configFields && (() => {
                  const dwReady = dw.noToken ? !!user?.uid : tokenReady;
                  return (
                    <div className="flex gap-2">
                      {!dw.noToken && (
                        <button
                          onClick={() => { const s=socketRef.current||getSocket(); if(s?.connected){s.emit('push_style_update',{widgetId:dw.id,style:{_reset:true}});toast.success(`🔄 Reset ${dw.name} แล้ว`);}else{toast.error('ต้อง Login และ Connect Socket ก่อน');} }}
                          className={clsx('flex-1 py-2.5 rounded-xl text-sm font-semibold border transition', isDark?'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20':'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')}>
                          🔄 Reset
                        </button>
                      )}
                      <button onClick={() => copyUrl(dw.id)} disabled={!dwReady}
                        className="flex-1 py-2.5 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-400 text-sm font-semibold transition disabled:opacity-50">
                        📋 Copy URL
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        );
      })()}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowLoginModal(false)}>
          <div className={clsx('w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl', isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200')}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold">เข้าสู่ระบบ</h2>
              <p className={clsx('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>Login เพื่อรับ Widget URL</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={loginLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-60">
              {loginLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }
              {loginLoading ? 'กำลัง Login...' : 'เข้าสู่ระบบด้วย Google'}
            </button>
            <button onClick={() => setShowLoginModal(false)}
              className={clsx('w-full mt-3 py-2 rounded-xl text-sm transition', isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Hidden import input */}
      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
    </div>
  );
}
