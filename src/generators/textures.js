import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export class TextureFactory {
  constructor(seed) {
    this.rng = new SeededRandom(seed ^ 0x9e3779b9);
    this.noise = new SimplexNoise(this.rng);
    this.cache = new Map();
  }

  _canvas(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  withSeed(base) {
    const r = new TextureFactory(base);
    r.copySeeds(this.rng.state, this.noise);
    return r;
  }

  copySeeds(rngState, noise) {
    this.rng.state = rngState;
    this.noise = noise;
  }

  texture(key, gen) {
    if (this.cache.has(key)) return this.cache.get(key);
    const tex = gen();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.cache.set(key, tex);
    return tex;
  }

  diffuseFrom(baseColor, ops = {}) {
    const key = 'diff_' + baseColor + '_' + (ops.variation || 1);
    return this.texture(key, () => {
      const size = 256;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;

      const base = this._rgb(baseColor);
      const variation = ops.variation ?? 18;
      const granularity = ops.granularity ?? 12;
      const scale = ops.scale ?? 12;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const n = this.noise.noise2D(x / scale, y / scale);
          const g = this.noise.noise2D(x / (scale * 0.35) + 100, y / (scale * 0.35) + 100);
          const speckle = (this.rng.next() - 0.5) * granularity;
          const i = (y * size + x) * 4;
          const mult = 1 + n * (variation / 30);
          data[i] = Math.max(0, Math.min(255, base[0] * mult + speckle + g * 6));
          data[i + 1] = Math.max(0, Math.min(255, base[1] * mult + speckle + g * 6));
          data[i + 2] = Math.max(0, Math.min(255, base[2] * mult + speckle + g * 6));
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return new THREE.CanvasTexture(c);
    });
  }

  blendFrom(colorA, colorB, ops = {}) {
    const key = 'blend_' + colorA + '_' + colorB + '_' + (ops.blendScale || 1);
    return this.texture(key, () => {
      const size = 256;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;
      const a = this._rgb(colorA);
      const b = this._rgb(colorB);
      const blendFreq = ops.blendScale ?? 0.02;
      const blendStrength = ops.blendStrength ?? 0.6;
      const grain = ops.granularity ?? 20;
      const scale = ops.scale ?? 16;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const m = this.noise.noise2D(x * blendFreq * 8, y * blendFreq * 8) * 0.5 + 0.5;
          const k = m * blendStrength;
          const g = (this.rng.next() - 0.5) * grain;
          const n = this.noise.noise2D(x / scale, y / scale) * 4;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, a[0] + (b[0] - a[0]) * k + g + n));
          data[i + 1] = Math.max(0, Math.min(255, a[1] + (b[1] - a[1]) * k + g + n));
          data[i + 2] = Math.max(0, Math.min(255, a[2] + (b[2] - a[2]) * k + g + n));
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return new THREE.CanvasTexture(c);
    });
  }

  normalFrom(color, strength = 1.0) {
    const key = 'norm_' + color + '_' + strength;
    return this.texture(key, () => {
      const size = 256;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;

      const scale = 16;
      const eps = 1.0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const hC = this.noise.noise2D(x / scale, y / scale);
          const hL = this.noise.noise2D((x - eps) / scale, y / scale);
          const hR = this.noise.noise2D((x + eps) / scale, y / scale);
          const hU = this.noise.noise2D(x / scale, (y - eps) / scale);
          const hD = this.noise.noise2D(x / scale, (y + eps) / scale);

          let dx = (hR - hL) * strength;
          let dy = (hD - hU) * strength;
          let dz = 1.0;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          dx /= len; dy /= len; dz /= len;

          const i = (y * size + x) * 4;
          data[i] = (dx * 0.5 + 0.5) * 255;
          data[i + 1] = (dy * 0.5 + 0.5) * 255;
          data[i + 2] = (dz * 0.5 + 0.5) * 255;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return new THREE.CanvasTexture(c);
    });
  }

  _rgb(hex) {
    const n = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
}
