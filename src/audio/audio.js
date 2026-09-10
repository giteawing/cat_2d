// Procedural audio: all sound effects and music are synthesised with WebAudio,
// so the game needs no external audio files. Audio starts after the first user gesture.
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.enabled = true;
    this.musicOn = true;
    this.musicTimer = null;
    this.musicTheme = null;
    this.step = 0;
    this.lastPlay = new Map();
    this.volume = 0.8;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
    } catch (e) { this.enabled = false; }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  toggleMusic() { this.musicOn = !this.musicOn; if (this.musicGain) this.musicGain.gain.value = this.musicOn ? 0.32 : 0; return this.musicOn; }

  // ---- primitive synth helpers ----
  tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.3, attack = 0.005, decay = null, slide = 0, delay = 0, dest = null }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay ?? dur));
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, freq = 1000, q = 1, type = 'lowpass', delay = 0, slide = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  /** Rate-limit identical sounds. */
  gate(name, ms) {
    const now = performance.now();
    const last = this.lastPlay.get(name) || 0;
    if (now - last < ms) return false;
    this.lastPlay.set(name, now);
    return true;
  }

  // ---- game sound effects ----
  play(name, arg) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'step': if (this.gate('step', 90)) this.noise({ dur: 0.06, vol: arg?.run ? 0.12 : 0.08, freq: 500, type: 'bandpass', q: 0.8 }); break;
      case 'jump': this.tone({ freq: 330, type: 'square', dur: 0.18, vol: 0.12, slide: 300 }); break;
      case 'land': if (this.gate('land', 80)) { this.noise({ dur: 0.1, vol: Math.min(0.25, 0.08 + (arg?.speed || 0) / 4000), freq: 400 }); } break;
      case 'meow': { const f = 500 + Math.random() * 200; this.tone({ freq: f, type: 'triangle', dur: 0.32, vol: 0.14, slide: 220 }); this.tone({ freq: f * 1.5, type: 'sine', dur: 0.32, vol: 0.05, slide: 260 }); break; }
      case 'happy': this.tone({ freq: 660, type: 'triangle', dur: 0.12, vol: 0.12 }); this.tone({ freq: 880, type: 'triangle', dur: 0.14, vol: 0.12, delay: 0.1 }); this.tone({ freq: 1100, type: 'triangle', dur: 0.2, vol: 0.12, delay: 0.2 }); break;
      case 'surprise': this.tone({ freq: 700, type: 'triangle', dur: 0.2, vol: 0.12, slide: 500 }); break;
      case 'gift': {
        const notes = [523, 659, 784, 1046, 1318];
        notes.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.14, delay: i * 0.07 }));
        this.tone({ freq: 1568, type: 'sine', dur: 0.5, vol: 0.1, delay: 0.38 });
        break;
      }
      case 'gravPull': this.tone({ freq: 180, type: 'sawtooth', dur: 0.35, vol: 0.08, slide: 240 }); this.noise({ dur: 0.3, vol: 0.06, freq: 800, type: 'bandpass', q: 2, slide: 1600 }); break;
      case 'gravGrab': this.tone({ freq: 420, type: 'square', dur: 0.08, vol: 0.08 }); this.tone({ freq: 640, type: 'sine', dur: 0.15, vol: 0.1, delay: 0.05 }); break;
      case 'gravDrop': this.tone({ freq: 380, type: 'sine', dur: 0.12, vol: 0.08, slide: -200 }); break;
      case 'gravThrow': this.noise({ dur: 0.25, vol: 0.2, freq: 1800, type: 'lowpass', slide: -1500 }); this.tone({ freq: 220, type: 'sawtooth', dur: 0.22, vol: 0.12, slide: -160 }); break;
      case 'gravPunt': this.noise({ dur: 0.2, vol: 0.22, freq: 1200, slide: -900 }); this.tone({ freq: 140, type: 'square', dur: 0.18, vol: 0.12, slide: -80 }); break;
      case 'gravEmpty': this.tone({ freq: 240, type: 'square', dur: 0.08, vol: 0.05, slide: -60 }); break;
      case 'swap': this.noise({ dur: 0.12, vol: 0.1, freq: 2500, type: 'highpass' }); this.tone({ freq: arg === 'portal' ? 880 : 520, type: 'triangle', dur: 0.14, vol: 0.1, delay: 0.06, slide: arg === 'portal' ? 300 : -120 }); break;
      case 'portalOpen': { const base = arg === 'orange' ? 300 : 420; this.tone({ freq: base, type: 'sine', dur: 0.35, vol: 0.14, slide: base * 1.5 }); this.tone({ freq: base * 2, type: 'triangle', dur: 0.3, vol: 0.07, slide: base, delay: 0.05 }); this.noise({ dur: 0.25, vol: 0.08, freq: 3000, type: 'highpass' }); break; }
      case 'portalFail': this.tone({ freq: 200, type: 'square', dur: 0.15, vol: 0.07, slide: -90 }); this.tone({ freq: 150, type: 'square', dur: 0.15, vol: 0.07, delay: 0.12, slide: -60 }); break;
      case 'mirrorFlip': this.tone({ freq: 520, type: 'square', dur: 0.06, vol: 0.06 }); this.tone({ freq: 780, type: 'square', dur: 0.08, vol: 0.06, delay: 0.06 }); break;
      case 'laserOn': this.tone({ freq: 660, type: 'sine', dur: 0.18, vol: 0.1, slide: 440 }); this.tone({ freq: 1320, type: 'triangle', dur: 0.25, vol: 0.06, delay: 0.1 }); break;
      case 'laserOff': this.tone({ freq: 880, type: 'sine', dur: 0.2, vol: 0.08, slide: -400 }); break;
      case 'fieldOff': this.tone({ freq: 900, type: 'sawtooth', dur: 0.5, vol: 0.06, slide: -800 }); this.noise({ dur: 0.45, vol: 0.1, freq: 3000, type: 'bandpass', q: 3, slide: -2500 }); break;
      case 'fieldOn': this.tone({ freq: 120, type: 'sawtooth', dur: 0.4, vol: 0.06, slide: 800 }); this.noise({ dur: 0.35, vol: 0.12, freq: 600, type: 'bandpass', q: 3, slide: 3000 }); this.tone({ freq: 2400, type: 'square', dur: 0.06, vol: 0.05, delay: 0.3 }); break;
      case 'tunnelOn': this.tone({ freq: 520, type: 'sine', dur: 0.25, vol: 0.12, slide: 780 }); this.tone({ freq: 1040, type: 'triangle', dur: 0.35, vol: 0.06, slide: 1560, delay: 0.08 }); this.noise({ dur: 0.3, vol: 0.05, freq: 5000, type: 'highpass' }); break;
      case 'tunnelOff': this.tone({ freq: 1100, type: 'sine', dur: 0.22, vol: 0.1, slide: -700 }); this.tone({ freq: 560, type: 'triangle', dur: 0.2, vol: 0.05, slide: -300, delay: 0.06 }); break;
      case 'tunnelPass': if (this.gate('tunnelPass', 100)) { this.tone({ freq: 400, type: 'sine', dur: 0.4, vol: 0.14, slide: 1600 }); this.tone({ freq: 1200, type: 'triangle', dur: 0.35, vol: 0.08, slide: 2400, delay: 0.05 }); this.noise({ dur: 0.35, vol: 0.12, freq: 2500, type: 'bandpass', q: 3, slide: 5000 }); this.tone({ freq: 1568, type: 'sine', dur: 0.3, vol: 0.08, delay: 0.25 }); } break;
      case 'zap': if (this.gate('zap', 70)) { const v = Math.min(0.28, 0.08 + (arg?.speed || 0) / 2500); this.noise({ dur: 0.16, vol: v, freq: 3200, type: 'bandpass', q: 4, slide: -1800 }); this.tone({ freq: 180 + Math.random() * 60, type: 'sawtooth', dur: 0.14, vol: v * 0.5, slide: -120 }); this.tone({ freq: 2600 + Math.random() * 800, type: 'square', dur: 0.05, vol: v * 0.35 }); } break;
      case 'teleport': if (this.gate('teleport', 60)) { this.tone({ freq: 600, type: 'sine', dur: 0.25, vol: 0.14, slide: -350 }); this.tone({ freq: 900, type: 'triangle', dur: 0.2, vol: 0.06, slide: 500, delay: 0.05 }); this.noise({ dur: 0.18, vol: 0.08, freq: 2000, type: 'bandpass', q: 1.5 }); } break;
      case 'impact': {
        const { material = 'wood', speed = 200 } = arg || {};
        const v = Math.min(0.32, speed / 1600);
        if (!this.gate('impact_' + material, 40)) return;
        if (material === 'metal') { this.tone({ freq: 900 + Math.random() * 300, type: 'triangle', dur: 0.25, vol: v * 0.7, slide: -300 }); this.noise({ dur: 0.08, vol: v, freq: 3000, type: 'highpass' }); }
        else if (material === 'ceramic' || material === 'glass') { this.tone({ freq: 1800 + Math.random() * 600, type: 'sine', dur: 0.12, vol: v * 0.6 }); this.noise({ dur: 0.06, vol: v * 0.8, freq: 4000, type: 'highpass' }); }
        else if (material === 'soft') { this.noise({ dur: 0.08, vol: v * 0.6, freq: 300 }); }
        else { this.noise({ dur: 0.1, vol: v, freq: 700, slide: -400 }); this.tone({ freq: 120, type: 'triangle', dur: 0.08, vol: v * 0.5 }); }
        break;
      }
      case 'break': this.noise({ dur: 0.3, vol: 0.25, freq: 5000, type: 'highpass' }); for (let i = 0; i < 4; i++) this.tone({ freq: 1500 + Math.random() * 1500, type: 'sine', dur: 0.12, vol: 0.08, delay: i * 0.03 }); break;
      case 'plateOn': this.tone({ freq: 320, type: 'square', dur: 0.08, vol: 0.1 }); this.tone({ freq: 480, type: 'square', dur: 0.12, vol: 0.1, delay: 0.07 }); break;
      case 'plateOff': this.tone({ freq: 480, type: 'square', dur: 0.08, vol: 0.08 }); this.tone({ freq: 320, type: 'square', dur: 0.12, vol: 0.08, delay: 0.07 }); break;
      case 'button': this.tone({ freq: 700, type: 'square', dur: 0.07, vol: 0.1 }); this.noise({ dur: 0.05, vol: 0.08, freq: 1500 }); break;
      case 'lever': this.noise({ dur: 0.1, vol: 0.12, freq: 900 }); this.tone({ freq: 260, type: 'square', dur: 0.1, vol: 0.08, delay: 0.08 }); break;
      case 'doorOpen': this.noise({ dur: 0.5, vol: 0.12, freq: 400, slide: 500 }); this.tone({ freq: 90, type: 'sawtooth', dur: 0.5, vol: 0.07, slide: 40 }); break;
      case 'doorClose': this.noise({ dur: 0.4, vol: 0.12, freq: 900, slide: -600 }); this.tone({ freq: 120, type: 'sawtooth', dur: 0.4, vol: 0.07, slide: -60 }); break;
      case 'unlock': [440, 554, 659, 880].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.18, vol: 0.09, delay: i * 0.09 })); break;
      case 'levelDone': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.14, delay: i * 0.12 })); break;
      case 'ui': this.tone({ freq: 800, type: 'sine', dur: 0.06, vol: 0.08 }); break;
      case 'checkpoint': this.tone({ freq: 660, type: 'sine', dur: 0.15, vol: 0.1 }); this.tone({ freq: 990, type: 'sine', dur: 0.25, vol: 0.1, delay: 0.1 }); break;
    }
  }

  // ---- music: a small step sequencer playing cosy chiptune loops ----
  startMusic(theme = 'house') {
    if (!this.ctx) return;
    if (this.musicTheme === theme && this.musicTimer) return;
    this.stopMusic();
    this.musicTheme = theme;
    this.step = 0;
    const bpm = theme === 'lab' ? 104 : theme === 'observatory' ? 96 : 112;
    const stepDur = 60 / bpm / 2; // 8th notes
    this.nextTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        this.playStep(this.step, this.nextTime, stepDur, theme);
        this.step++;
        this.nextTime += stepDur;
      }
      this.musicTimer = setTimeout(tick, 80);
    };
    tick();
  }

  stopMusic() { if (this.musicTimer) clearTimeout(this.musicTimer); this.musicTimer = null; this.musicTheme = null; }

  playStep(step, t, dur, theme) {
    const S = MUSIC[theme] || MUSIC.house;
    const bar = Math.floor(step / 16) % S.chords.length;
    const chord = S.chords[bar];
    const s16 = step % 16;
    const now = this.ctx.currentTime;
    const delay = Math.max(0, t - now);
    // bass: root on beats, fifth on off-beats
    if (s16 % 4 === 0) this.tone({ freq: chord[0] / 2, type: 'triangle', dur: dur * 1.8, vol: 0.16, delay, dest: this.musicGain });
    else if (s16 % 4 === 2) this.tone({ freq: chord[2] / 2, type: 'triangle', dur: dur * 1.2, vol: 0.1, delay, dest: this.musicGain });
    // arpeggio pluck
    const arp = chord[(step + Math.floor(step / 3)) % chord.length] * (s16 % 8 === 6 ? 2 : 1);
    this.tone({ freq: arp, type: 'square', dur: dur * 0.6, vol: 0.035, delay, dest: this.musicGain });
    // melody
    const m = S.melody[step % S.melody.length];
    if (m) this.tone({ freq: m, type: theme === 'lab' ? 'sine' : 'triangle', dur: dur * 1.6, vol: 0.09, delay, dest: this.musicGain, attack: 0.01 });
    // soft percussion
    if (s16 % 8 === 4) this.noise({ dur: 0.05, vol: 0.05, freq: 5000, type: 'highpass', delay });
    if (s16 % 4 === 0) this.tone({ freq: 90, type: 'sine', dur: 0.08, vol: 0.12, slide: -60, delay, dest: this.musicGain });
  }
}

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MUSIC = {
  house: {
    chords: [[N(60), N(64), N(67)], [N(57), N(60), N(64)], [N(65), N(69), N(72)], [N(67), N(71), N(74)]],
    melody: [N(72), 0, N(76), 0, N(79), 0, N(76), 0, N(74), 0, N(72), 0, N(69), 0, 0, 0,
      N(69), 0, N(72), 0, N(76), 0, N(72), 0, N(71), 0, N(69), 0, N(67), 0, 0, 0,
      N(77), 0, N(76), 0, N(74), 0, N(72), 0, N(74), 0, N(76), 0, N(77), 0, 0, 0,
      N(79), 0, N(76), 0, N(74), 0, N(72), 0, N(71), 0, N(74), 0, N(72), 0, 0, 0],
  },
  lab: {
    chords: [[N(57), N(60), N(64)], [N(55), N(59), N(62)], [N(53), N(57), N(60)], [N(52), N(55), N(59)]],
    melody: [N(69), 0, 0, N(72), 0, 0, N(76), 0, N(74), 0, 0, 0, N(72), 0, 0, 0,
      N(67), 0, 0, N(71), 0, 0, N(74), 0, N(72), 0, 0, 0, N(71), 0, 0, 0,
      N(65), 0, 0, N(69), 0, 0, N(72), 0, N(74), 0, 0, 0, N(72), 0, 0, 0,
      N(64), 0, 0, N(67), 0, 0, N(71), 0, N(74), 0, 0, 0, N(76), 0, 0, 0],
  },
  observatory: {   // dreamy minor waltz-ish loop
    chords: [[N(57), N(60), N(64)], [N(53), N(57), N(60)], [N(55), N(59), N(62)], [N(52), N(56), N(59)]],
    melody: [N(76), 0, 0, N(79), 0, 0, N(81), 0, 0, 0, N(79), 0, N(76), 0, 0, 0,
      N(72), 0, 0, N(76), 0, 0, N(77), 0, 0, 0, N(76), 0, N(72), 0, 0, 0,
      N(74), 0, 0, N(78), 0, 0, N(79), 0, 0, 0, N(78), 0, N(74), 0, 0, 0,
      N(71), 0, 0, N(74), 0, 0, N(76), 0, 0, 0, N(80), 0, N(83), 0, 0, 0],
  },
  garden: {
    chords: [[N(62), N(66), N(69)], [N(59), N(62), N(66)], [N(67), N(71), N(74)], [N(69), N(73), N(76)]],
    melody: [N(74), 0, N(78), 0, N(81), 0, 0, 0, N(78), 0, N(74), 0, 0, 0, 0, 0,
      N(71), 0, N(74), 0, N(78), 0, 0, 0, N(76), 0, N(74), 0, 0, 0, 0, 0,
      N(79), 0, N(78), 0, N(76), 0, 0, 0, N(74), 0, N(76), 0, 0, 0, 0, 0,
      N(81), 0, N(78), 0, N(76), 0, 0, 0, N(73), 0, N(74), 0, 0, 0, 0, 0],
  },
};
