import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export class TextureFactory {
  constructor(seed) {
    this.rng = new SeededRandom(seed ^ 0x9e3779b9);
    this.noise = new SimplexNoise(this.rng);
    this.cache = new Map();
    this._lattice = null;
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

  texture(key, gen, colorSpace = THREE.SRGBColorSpace) {
    if (this.cache.has(key)) return this.cache.get(key);
    const tex = gen();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = colorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  _phase(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    return { x: ((h & 0xffff) % 997) / 997, y: ((h >>> 16) % 991) / 991 };
  }

  _latticeData() {
    if (this._lattice) return this._lattice;
    const S = 64;
    const data = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) data[i] = this.rng.next() * 2 - 1;
    this._lattice = { data, S };
    return this._lattice;
  }

  _tileNoise(u, v, octaves = 3, gain = 0.5, lac = 2.3) {
    const L = this._latticeData();
    const S = L.S;
    const inv = 1 / S;
    let sum = 0, amp = 1, max = 0, freq = 1;
    for (let o = 0; o < octaves; o++) {
      const gx = ((u * freq % 1) + 1) % 1 * S;
      const gy = ((v * freq % 1) + 1) % 1 * S;
      const x0 = Math.floor(gx) & (S - 1);
      const y0 = Math.floor(gy) & (S - 1);
      const x1 = (x0 + 1) & (S - 1);
      const y1 = (y0 + 1) & (S - 1);
      const tx = gx - Math.floor(gx);
      const ty = gy - Math.floor(gy);
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = L.data[y0 * S + x0];
      const b = L.data[y0 * S + x1];
      const c = L.data[y1 * S + x0];
      const d = L.data[y1 * S + x1];
      const top = a + (b - a) * sx;
      const bot = c + (d - c) * sx;
      sum += (top + (bot - top) * sy) * amp;
      max += amp;
      amp *= gain;
      freq *= lac;
    }
    return sum / max;
  }

  diffuseFrom(baseColor, ops = {}) {
    const key = 'diff_' + baseColor + '_' + (ops.variation || 1) + '_' + (ops.scale || 12) + '_' + (ops.granularity || 12);
    return this.texture(key, () => {
      const size = 512;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;
      const base = this._rgb(baseColor);
      const variation = ops.variation ?? 18;
      const grain = ops.granularity ?? 12;
      const scale = ops.scale ?? 12;
      const ph = this._phase(key);
      const u0 = (x) => x / size / (48 / scale) + ph.x;
      const v0 = (y) => y / size / (48 / scale) + ph.y;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = u0(x), v = v0(y);
          let n = 0.52 * this._tileNoise(u, v, 3)
            + 0.3 * this._tileNoise(u * 3.1 + 0.7, v * 3.1 + 0.2, 3)
            + 0.18 * this._tileNoise(u * 8.7 + 0.4, v * 8.7 + 0.9, 2);
          const tint = this._tileNoise(u * 2 + 0.3, v * 2 + 0.6, 2);
          const mult = 1 + n * (variation / 26) + grain * 0.02;
          const warm = 1 + tint * 6 / 255;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, base[0] * mult * warm));
          data[i + 1] = Math.max(0, Math.min(255, base[1] * mult * (1 + tint * 0.8 / 255)));
          data[i + 2] = Math.max(0, Math.min(255, base[2] * mult / warm));
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return new THREE.CanvasTexture(c);
    });
  }

  blendFrom(colorA, colorB, ops = {}) {
    const key = 'blend_' + colorA + '_' + colorB + '_' + (ops.blendScale || 1) + '_' + (ops.granularity || 12);
    return this.texture(key, () => {
      const size = 512;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;
      const a = this._rgb(colorA);
      const b = this._rgb(colorB);
      const blendFreq = ops.blendScale ?? 0.02;
      const blendStrength = ops.blendStrength ?? 0.6;
      const grain = ops.granularity ?? 12;
      const scale = ops.scale ?? 16;
      const ph = this._phase(key);
      const u0 = (x) => x / size / (48 / scale) + ph.x;
      const v0 = (y) => y / size / (48 / scale) + ph.y;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = u0(x), v = v0(y);
          const m = (this._tileNoise(u * blendFreq * 64, v * blendFreq * 64, 3) * 0.5 + 0.5) * blendStrength
            + 0.15 * (this._tileNoise(u * 5 + 9, v * 5 + 2, 2) * 0.5 + 0.5);
          const k = Math.max(0, Math.min(1, m));
          const g = this._tileNoise(u * 3 + 1.1, v * 3 + 4.2, 3);
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, a[0] + (b[0] - a[0]) * k + g * grain * 0.02));
          data[i + 1] = Math.max(0, Math.min(255, a[1] + (b[1] - a[1]) * k + g * grain * 0.02));
          data[i + 2] = Math.max(0, Math.min(255, a[2] + (b[2] - a[2]) * k + g * grain * 0.02));
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return new THREE.CanvasTexture(c);
    });
  }

  normalFrom(color, strength = 1.0) {
    const key = 'norm_' + strength + '_' + color;
    return this.texture(key, () => {
      const size = 512;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;
      const scale = 14;
      const ph = { x: 0.15, y: 0.6 };
      const u0 = (x) => x / size / (48 / scale) + ph.x;
      const v0 = (y) => y / size / (48 / scale) + ph.y;
      const eps = 1;

      const hAt = (x, y) => {
        const u = u0(x), v = v0(y);
        return 0.6 * this._tileNoise(u, v, 3)
          + 0.3 * this._tileNoise(u * 3.1 + 0.7, v * 3.1 + 0.2, 3)
          + 0.1 * this._tileNoise(u * 8.7 + 0.4, v * 8.7 + 0.9, 2);
      };

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const hC = hAt(x, y);
          const hL = hAt(x - eps, y);
          const hR = hAt(x + eps, y);
          const hU = hAt(x, y - eps);
          const hD = hAt(x, y + eps);
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

  roughnessFrom(mid = 0.5, spread = 0.3) {
    const key = 'rough_' + mid + '_' + spread;
    return this.texture(key, () => {
      const size = 256;
      const c = this._canvas(size);
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      const data = img.data;
      const ph = { x: 0.22, y: 0.78 };
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = this._tileNoise((x / size * 3 + ph.x), (y / size * 3 + ph.y), 2) * 0.5 + 0.5;
          const r = Math.max(0.02, Math.min(0.98, mid + (v - 0.5) * spread * 2));
          const i = (y * size + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = r * 255;
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