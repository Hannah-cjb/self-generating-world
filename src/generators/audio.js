import { SeededRandom, SimplexNoise } from '../core/seed.js';

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

    this.scale = this.rng.pick([
      [0, 2, 4, 5, 7, 9, 11],
      [0, 2, 3, 5, 7, 8, 10],
      [0, 3, 5, 7, 10],
      [0, 2, 4, 7, 9, 11],
      [0, 1, 5, 7, 8, 12],
      [0, 5, 7, 10]
    ]);
    this.rootFreq = 80 + this.rng.next() * 160;
    this.keyColor = this.rng.pick([0, 0, 0, 90, 180, 45, 210, 330]);
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

  playSND(key) {
    if (!this.ctx) return;
    const s = this.scale;
    const deg = this.rng.pick(s);
    const freq = this._noteToFreq(deg + this.rng.intRange(0, 2) * 12 + 12);
    this._playTone(freq, this.rng.range(0.08, 0.2), this.rng.pick(['triangle', 'sine', 'square']), 0.15);
  }

  playFootstep(running = false) {
    if (!this.ctx) return;
    const freq = this.rng.range(80, 160);
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 400 : 250;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(running ? 0.4 : 0.25, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start();
  }

  playJump() {
    if (!this.ctx) return;
    this._playTone(300, 0.1, 'sine', 0.08, 0, 4);
  }

  playAmbientHit() {
    if (!this.ctx) return;
    const f = this.rng.range(150, 400);
    this._playTone(f, 0.05, 'sine', 0.06, 0, 6);
  }

  startAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const duration = this.rng.range(4, 8);
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
    osc.type = this.rng.chance(0.6) ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = this.rng.range(-5, 5) + (this.rng.chance(0.3) ? this.rng.range(3, 8) : 0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + duration * 0.3);
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
    const deg = this.rng.pick(s);
    let freq = this._noteToFreq(deg + this.rng.intRange(0, 2) * 12);
    if (this.rng.chance(0.4)) freq *= 2;

    const osc = this.ctx.createOscillator();
    osc.type = this.rng.pick(['sine', 'triangle']);
    osc.frequency.setValueAtTime(freq, t0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + this.rng.range(0.4, 1.2));
    osc.connect(g).connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + 1.5);

    if (this.rng.chance(0.3)) {
      const bass = this._noteToFreq(deg - 12);
      this._playTone(bass, 0.5, 'sine', 0.05, when - this.ctx.currentTime, 3);
    }

    const gap = this.rng.range(0.15, 0.5);
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
