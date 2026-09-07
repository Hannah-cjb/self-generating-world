import { SeededRandom, SimplexNoise } from '../core/seed.js';

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

const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];

export class AudioEngine {
  constructor(seed) {
    this.seed = seed;
    this.rng = new SeededRandom(seed ^ 0x85ebca6b);
    this.noise = new SimplexNoise(this.rng);

    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.started = false;

    this.scaleDef = this.rng.pick(SCALES);
    this.scale = this.scaleDef.notes;
    this.scaleName = this.scaleDef.name;
    this.rootFreq = 55 + this.rng.next() * 190;
    this.keyColor = this.rng.pick([0, 0, 0, 90, 180, 45, 210, 330, 270, 15, 120, 300]);
    this.tempo = this.rng.range(0.09, 0.6);
    this.noteDensity = this.rng.range(0.2, 0.9);
    this.bassChance = this.rng.range(0.1, 0.5);
    this.doubleOctave = this.rng.range(0.15, 0.6);
    this.melodyWave = this.rng.pick(WAVES);
    this.bassWave = this.rng.pick(['sine', 'triangle']);
    this.ambientWave = this.rng.pick(['sine', 'triangle']);
    this.humanize = this.rng.range(0, 12);
    this.ambientDensity = this.rng.range(3, 10);
    this.sfxWave = this.rng.pick(['triangle', 'sine', 'square', 'sawtooth']);
    this.arp = this.rng.chance(0.35);
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);
      this.master.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.4;
      this.ambientGain.connect(this.master);

      this._buildNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this;
  }

  _buildNoiseBuffer() {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
    }
    this.noiseBuffer = buffer;
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

  startAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const duration = this.rng.range(3, this.ambientDensity);
    this._playAmbientNote(duration);
    setTimeout(() => {
      if (this.started) this.startAmbient();
    }, duration * 1000);
  }

  _playAmbientNote(duration) {
    const s = this.scale;
    const deg = this.rng.pick(s);
    const freq = this._noteToFreq(deg + this.rng.intRange(0, 1) * 12);
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = this.ambientWave;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = this.rng.range(-this.humanize, this.humanize) + (this.rng.chance(0.3) ? this.rng.range(3, 10) : 0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(this.rng.range(0.03, 0.07), t0 + duration * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.ambientGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.2);
  }

  startMusic() {
    if (!this.ctx || !this.musicGain) return;
    this._scheduleMusicNote(this.ctx.currentTime + 0.5);
  }

  _scheduleMusicNote(when) {
    if (!this.started) return;
    const s = this.scale;
    const t0 = when;
    const deg = this.rng.chance(this.noteDensity) ? this.rng.pick(s) : -1;
    let freq = this._noteToFreq(deg + this.rng.intRange(0, 2) * 12);
    if (this.rng.chance(this.doubleOctave)) freq *= 2;

    const osc = this.ctx.createOscillator();
    osc.type = this.melodyWave;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = this.rng.range(-this.humanize, this.humanize);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + this.rng.range(0.4, 1.2));
    osc.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + 1.5);

    if (this.rng.chance(this.bassChance)) {
      const bass = this._noteToFreq(deg - 12);
      const bos = this.ctx.createOscillator();
      bos.type = this.bassWave;
      bos.frequency.setValueAtTime(bass, t0);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t0);
      bg.gain.linearRampToValueAtTime(0.05, t0 + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      bos.connect(bg).connect(this.musicGain);
      bos.start(t0);
      bos.stop(t0 + 0.7);
    }

    const gap = this.tempo * this.rng.range(0.75, 1.3) * this.rng.chance(this.noteDensity) ? 1 : 1.6;
    this.musicTimer = setTimeout(() => {
      if (this.started) this._scheduleMusicNote(this.ctx.currentTime + gap);
    }, gap * 1000);
  }

  start() {
    this.ensure();
    if (this.started) return;
    this.started = true;
    this.startAmbient();
    this.startMusic();
  }
}