// soundSynth.js — เสียงสังเคราะห์ 27 เสียง ด้วย Web Audio API
// ไม่มีไฟล์ภายนอก — สร้างเสียงจาก oscillator + noise + filter ล้วนๆ
// signature: (AudioContext, startTime, volume 0-1) => void

// ===== helpers =====
function mkNoise(ctx, dur) {
  const sr  = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.ceil(sr * dur), sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function mkOsc(ctx, type, freq) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

function envGain(ctx, v, t, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(ctx.destination);
  return g;
}

function flatGain(ctx, v, t, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(ctx.destination);
  return g;
}

function lpf(ctx, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function bpf(ctx, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

// ===== เสียงทั้งหมด =====
export const SYNTHS = {

  // ── Row 1 ──────────────────────────────────────────
  Q(ctx, t, v) { // 👏 ปรบมือ
    const n = mkNoise(ctx, 2);
    const f = bpf(ctx, 2200, 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(v * 0.65, t + 0.15);
    g.gain.setValueAtTime(v * 0.65, t + 1.2);
    g.gain.linearRampToValueAtTime(0.001, t + 2);
    g.connect(ctx.destination);
    const lfo = mkOsc(ctx, 'sine', 7);
    const lg  = ctx.createGain(); lg.gain.value = 0.28;
    lfo.connect(lg); lg.connect(g.gain);
    n.connect(f); f.connect(g);
    n.start(t); lfo.start(t); n.stop(t + 2); lfo.stop(t + 2);
  },

  W(ctx, t, v) { // 😂 หัวเราะ
    for (let i = 0; i < 5; i++) {
      const st = t + i * 0.17;
      const n = mkNoise(ctx, 0.14);
      const f = bpf(ctx, 800 + i * 80, 1.4);
      const g = flatGain(ctx, v * 0.48, st, 0.14);
      n.connect(f); f.connect(g); n.start(st); n.stop(st + 0.14);
    }
  },

  E(ctx, t, v) { // 🥁 กลอง kick
    const o = mkOsc(ctx, 'sine', 180);
    const g = flatGain(ctx, v * 0.9, t, 0.45);
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    o.connect(g); o.start(t); o.stop(t + 0.45);
    const n = mkNoise(ctx, 0.07);
    const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 900;
    const ng = flatGain(ctx, v * 0.35, t, 0.07);
    n.connect(hf); hf.connect(ng); n.start(t); n.stop(t + 0.07);
  },

  R(ctx, t, v) { // 📯 แตรเฮ (air horn)
    const o = mkOsc(ctx, 'sawtooth', 195);
    const f = lpf(ctx, 2200);
    const g = flatGain(ctx, v * 0.48, t, 1.3);
    o.frequency.setValueAtTime(195, t);
    o.frequency.linearRampToValueAtTime(385, t + 0.18);
    const lfo = mkOsc(ctx, 'sine', 5.5);
    const lg  = ctx.createGain(); lg.gain.value = 8;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(f); f.connect(g); o.start(t); lfo.start(t); o.stop(t + 1.3); lfo.stop(t + 1.3);
  },

  T(ctx, t, v) { // 😢 แตรเศร้า (sad trombone)
    [466, 415, 370, 311].forEach((freq, i) => {
      const st = t + i * 0.3;
      const o = mkOsc(ctx, 'sawtooth', freq);
      const f = lpf(ctx, 1400);
      const g = flatGain(ctx, v * 0.42, st, 0.35);
      o.connect(f); f.connect(g); o.start(st); o.stop(st + 0.35);
    });
  },

  Y(ctx, t, v) { // 💥 ระเบิด
    const n = mkNoise(ctx, 1.6);
    const f = lpf(ctx, 320, 0.5);
    const g = flatGain(ctx, v * 0.88, t, 1.6);
    const sub = mkOsc(ctx, 'sine', 60);
    const sg  = flatGain(ctx, v * 0.5, t, 0.5);
    sub.connect(sg); n.connect(f); f.connect(g);
    n.start(t); sub.start(t); n.stop(t + 1.6); sub.stop(t + 0.5);
  },

  U(ctx, t, v) { // 🌪 วูช
    const n = mkNoise(ctx, 0.9);
    const f = bpf(ctx, 3000, 2.5);
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(280, t + 0.9);
    const g = envGain(ctx, v * 0.58, t, 0.08, 0.82);
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.9);
  },

  I(ctx, t, v) { // 🔔 กระดิ่ง
    [880, 1760, 2640].forEach((freq, i) => {
      const o = mkOsc(ctx, 'sine', freq);
      const g = flatGain(ctx, v * (i === 0 ? 0.58 : 0.22 - i * 0.06), t, 1.6);
      o.connect(g); o.start(t); o.stop(t + 1.6);
    });
  },

  O(ctx, t, v) { // 🏆 ชนะ
    [523, 659, 784, 1047].forEach((freq, i) => {
      const st = t + i * 0.11;
      const o  = mkOsc(ctx, 'square', freq);
      const f  = lpf(ctx, 1600);
      const g  = flatGain(ctx, v * 0.32, st, 0.4);
      o.connect(f); f.connect(g); o.start(st); o.stop(st + 0.4);
    });
  },

  P(ctx, t, v) { // 🎮 Game over
    [392, 349, 330, 261].forEach((freq, i) => {
      const st = t + i * 0.24;
      const o  = mkOsc(ctx, 'square', freq);
      const g  = flatGain(ctx, v * 0.32, st, 0.5);
      o.connect(g); o.start(st); o.stop(st + 0.5);
    });
  },

  // ── Row 2 ──────────────────────────────────────────
  A(ctx, t, v) { // 🥁 ริมช็อต
    const n = mkNoise(ctx, 0.07);
    const f = bpf(ctx, 3800, 1.8);
    const g = flatGain(ctx, v * 0.82, t, 0.07);
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.07);
    const o  = mkOsc(ctx, 'sine', 175);
    const og = flatGain(ctx, v * 0.55, t, 0.13);
    o.connect(og); o.start(t); o.stop(t + 0.13);
  },

  S(ctx, t, v) { // 🎵 โน้ต La (440 Hz)
    const o = mkOsc(ctx, 'sine', 440);
    const g = envGain(ctx, v * 0.5, t, 0.01, 0.9);
    o.connect(g); o.start(t); o.stop(t + 0.95);
  },

  D(ctx, t, v) { // 🔫 เลเซอร์
    const o = mkOsc(ctx, 'sawtooth', 1300);
    const f = lpf(ctx, 2200);
    const g = flatGain(ctx, v * 0.38, t, 0.55);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.55);
    o.connect(f); f.connect(g); o.start(t); o.stop(t + 0.55);
  },

  F(ctx, t, v) { // 🪙 เหรียญ
    [1568, 1568, 2093].forEach((freq, i) => {
      const st = t + i * 0.09;
      const o  = mkOsc(ctx, 'sine', freq);
      const g  = flatGain(ctx, v * 0.38, st, 0.22);
      o.connect(g); o.start(st); o.stop(st + 0.22);
    });
  },

  G(ctx, t, v) { // ⚡ เลเวลอัป
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const st = t + i * 0.08;
      const o  = mkOsc(ctx, 'square', freq);
      const f  = lpf(ctx, 2200);
      const g  = flatGain(ctx, v * 0.28, st, 0.28);
      o.connect(f); f.connect(g); o.start(st); o.stop(st + 0.28);
    });
  },

  H(ctx, t, v) { // 📱 แจ้งเตือน
    [880, 1109].forEach((freq, i) => {
      const st = t + i * 0.2;
      const o  = mkOsc(ctx, 'sine', freq);
      const g  = envGain(ctx, v * 0.4, st, 0.01, 0.38);
      o.connect(g); o.start(st); o.stop(st + 0.42);
    });
  },

  J(ctx, t, v) { // 🎠 บอยอิ้ง
    const o = mkOsc(ctx, 'sine', 820);
    const g = flatGain(ctx, v * 0.5, t, 0.75);
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.75);
    o.connect(g); o.start(t); o.stop(t + 0.75);
  },

  K(ctx, t, v) { // 🚨 ไซเรน
    const o   = mkOsc(ctx, 'sawtooth', 620);
    const lfo = mkOsc(ctx, 'sine', 3.2);
    const lg  = ctx.createGain(); lg.gain.value = 155;
    lfo.connect(lg); lg.connect(o.frequency);
    const f = lpf(ctx, 1600);
    const g = flatGain(ctx, v * 0.28, t, 1.4);
    o.connect(f); f.connect(g); o.start(t); lfo.start(t); o.stop(t + 1.4); lfo.stop(t + 1.4);
  },

  L(ctx, t, v) { // 🎤 ดรัมโรล
    for (let i = 0; i < 14; i++) {
      const st = t + i * 0.055;
      const n  = mkNoise(ctx, 0.05);
      const f  = bpf(ctx, 4200, 2.2);
      const g  = flatGain(ctx, v * 0.45 * (1 + i * 0.045), st, 0.05);
      n.connect(f); f.connect(g); n.start(st); n.stop(st + 0.05);
    }
  },

  // ── Row 3 ──────────────────────────────────────────
  Z(ctx, t, v) { // 🔊 ช็อตสั้น
    const n = mkNoise(ctx, 0.1);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 700;
    const g = flatGain(ctx, v * 0.72, t, 0.1);
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.1);
  },

  X(ctx, t, v) { // 🎯 ปืน
    const n = mkNoise(ctx, 0.28);
    const f = bpf(ctx, 1600, 0.9);
    const g = flatGain(ctx, v * 0.75, t, 0.28);
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 0.28);
  },

  C(ctx, t, v) { // 🪄 เวทมนตร์
    [1047, 1319, 1568, 2093].forEach((freq, i) => {
      const st = t + i * 0.07;
      const o  = mkOsc(ctx, 'sine', freq);
      const g  = flatGain(ctx, v * 0.28, st, 0.35);
      o.connect(g); o.start(st); o.stop(st + 0.35);
    });
  },

  V(ctx, t, v) { // 🌊 คลื่น
    const n = mkNoise(ctx, 1.1);
    const f = lpf(ctx, 550, 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(v * 0.48, t + 0.4);
    g.gain.linearRampToValueAtTime(0.001, t + 1.1);
    g.connect(ctx.destination);
    n.connect(f); f.connect(g); n.start(t); n.stop(t + 1.1);
  },

  B(ctx, t, v) { // 🎺 ทรัมเป็ต fanfare
    [523, 659, 784].forEach((freq, i) => {
      const st = t + i * 0.16;
      const o  = mkOsc(ctx, 'sawtooth', freq);
      const f  = lpf(ctx, 1900);
      const g  = flatGain(ctx, v * 0.32, st, 0.55);
      o.connect(f); f.connect(g); o.start(st); o.stop(st + 0.55);
    });
  },

  N(ctx, t, v) { // 🎹 เปียโน C major chord
    [261, 329, 392].forEach((freq, i) => {
      const st = t + i * 0.04;
      const o  = mkOsc(ctx, 'sine', freq);
      const g  = flatGain(ctx, v * 0.38, st, 1.3);
      o.connect(g); o.start(st); o.stop(st + 1.3);
    });
  },

  M(ctx, t, v) { // 🌟 สปาร์ก
    for (let i = 0; i < 7; i++) {
      const freq = 900 + Math.random() * 2200;
      const st   = t + Math.random() * 0.32;
      const o    = mkOsc(ctx, 'sine', freq);
      const g    = flatGain(ctx, v * 0.22, st, 0.22);
      o.connect(g); o.start(st); o.stop(st + 0.22);
    }
  },
};

// ===== ข้อมูล metadata ของแต่ละปุ่ม =====
export const SOUND_DEFS = {
  Q:{ emoji:'👏', name:'ปรบมือ'    }, W:{ emoji:'😂', name:'หัวเราะ'   },
  E:{ emoji:'🥁', name:'กลอง'      }, R:{ emoji:'📯', name:'แตรเฮ'     },
  T:{ emoji:'😢', name:'แตรเศร้า'  }, Y:{ emoji:'💥', name:'ระเบิด'    },
  U:{ emoji:'🌪', name:'วูช'       }, I:{ emoji:'🔔', name:'กระดิ่ง'   },
  O:{ emoji:'🏆', name:'ชนะ'       }, P:{ emoji:'🎮', name:'Game Over' },
  A:{ emoji:'🥁', name:'ริมช็อต'   }, S:{ emoji:'🎵', name:'โน้ต La'   },
  D:{ emoji:'🔫', name:'เลเซอร์'   }, F:{ emoji:'🪙', name:'เหรียญ'    },
  G:{ emoji:'⚡', name:'เลเวลอัป'  }, H:{ emoji:'📱', name:'แจ้งเตือน' },
  J:{ emoji:'🎠', name:'บอยอิ้ง'   }, K:{ emoji:'🚨', name:'ไซเรน'     },
  L:{ emoji:'🎤', name:'ดรัมโรล'   }, Z:{ emoji:'🔊', name:'ช็อตสั้น'  },
  X:{ emoji:'🎯', name:'ปืน'       }, C:{ emoji:'🪄', name:'เวทมนตร์'  },
  V:{ emoji:'🌊', name:'คลื่น'     }, B:{ emoji:'🎺', name:'ทรัมเป็ต'  },
  N:{ emoji:'🎹', name:'เปียโน'    }, M:{ emoji:'🌟', name:'สปาร์ก'    },
};

export const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];
