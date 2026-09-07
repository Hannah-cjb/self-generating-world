import { SeededRandom } from '../core/seed.js';

const BASE_SCALES = [
  { name: 'Ionian', notes: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'Dorian', notes: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Phrygian', notes: [0, 1, 3, 5, 7, 8, 10] },
  { name: 'Lydian', notes: [0, 2, 4, 6, 7, 9, 11] },
  { name: 'Mixolydian', notes: [0, 2, 4, 5, 7, 9, 10] },
  { name: 'Aeolian', notes: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Locrian', notes: [0, 1, 3, 5, 6, 8, 10] },
  { name: 'Whole Tone', notes: [0, 2, 4, 6, 8, 10] },
  { name: 'Major Pent', notes: [0, 2, 4, 7, 9] },
  { name: 'Minor Pent', notes: [0, 3, 5, 7, 10] },
  { name: 'Blues', notes: [0, 3, 5, 6, 7, 10] },
  { name: 'Hungarian', notes: [0, 2, 3, 6, 7, 8, 11] },
  { name: 'Harmonic Minor', notes: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Enigmatic', notes: [0, 1, 6, 7, 10, 11] },
  { name: 'Spanish', notes: [0, 1, 4, 5, 7, 10] },
  { name: 'Dorian B2', notes: [0, 1, 3, 5, 7, 9, 10] },
  { name: 'Aeolian B5', notes: [0, 2, 3, 5, 6, 8, 10] },
  { name: 'Prometheus', notes: [0, 1, 4, 6, 10] }
];

function buildScales() {
  const out = [];
  const variants = [
    { tag: '', fn: (s) => s },
    { tag: '-dropped', fn: (s) => (s.length > 5 ? s.slice(0, -2) : s) },
    { tag: '-taut', fn: (s) => (s.length > 5 ? s.slice(1) : s) }
  ];
  for (const base of BASE_SCALES) {
    for (const v of variants) {
      out.push({ name: base.name + v.tag, notes: v.fn(base.notes) });
    }
  }
  return out;
}

const SCALES = buildScales();

export class AudioEngine {
  constructor(seed) {
    this.seed = seed;
    this.rng = new SeededRandom(seed ^ 0x85ebca6b);

    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.started = false;

    this.scaleDef = this.rng.pick(SCALES);
    this.scale = this.scaleDef.notes;
    this.rootFreq = 55 + this.rng.next() * 190;
    this.sfxWave = this.rng.pick(['triangle', 'sine', 'square', 'sawtooth']);
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);
      this.master.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this;
  }

  _noteToFreq(n) {
    return this.rootFreq * Math.pow(2, n / 12);
  }

  _playTone(freq, duration, type, gain, when = 0, decay = 2) {
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.1);
    return { osc, g };
  }

  playSND() {
    if (!this.ctx) return;
    const s = this.scale;
    const deg = this.rng.pick(s);
    const oct = this.rng.intRange(0, 3);
    const freq = this._noteToFreq(deg + oct * 12 + 12 + (this.rng.chance(0.5) ? 0 : this.rng.intRange(0, 2)));
    this._playTone(freq, this.rng.range(0.07, 0.28), this.rng.chance(0.75) ? this.sfxWave : 'sine', this.rng.range(0.1, 0.22));
  }

  playFootstep(running = false) {
    if (!this.ctx) return;
    const freq = this.rng.range(70, 200);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 420 : 240;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(running ? 0.4 : 0.25, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start();
  }

  playJump() {
    if (!this.ctx) return;
    const f = this._noteToFreq(12);
    this._playTone(f, 0.1, 'sine', 0.08, 0, 4);
  }

  playAmbientHit() {
    if (!this.ctx) return;
    const f = this.rng.range(120, 500);
    this._playTone(f, 0.05, this.sfxWave, this.rng.range(0.05, 0.1), 0, 6);
  }

  playThunder() {
    if (!this.ctx) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * (Math.sin(t * 18) * 0.4 + 0.6);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start();
  }

  playHeartbeat() {
    if (!this.ctx) return;
    const thump = (when) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const t0 = this.ctx.currentTime + when;
      osc.frequency.setValueAtTime(55, t0);
      osc.frequency.exponentialRampToValueAtTime(30, t0 + 0.15);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    };
    thump(0);
    thump(0.18);
  }

  playPortalOpen() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t0);
    osc.frequency.exponentialRampToValueAtTime(900, t0 + 1.2);
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t0);
    filter.frequency.exponentialRampToValueAtTime(1600, t0 + 1.2);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
    osc.connect(filter).connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + 1.4);
  }

  start() {
    this.ensure();
    if (this.started) return;
    this.started = true;
  }
}