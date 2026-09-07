import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export class TerrainGenerator {
  constructor(seed, size = 200) {
    this.seed = seed;
    this.size = size;
    this.half = size / 2;
    this.seg = Math.floor(size / 2);

    const rng = new SeededRandom(seed);
    this.rng = rng;
    this.noise = new SimplexNoise(rng);

    this.params = {
      continentalness: rng.range(0.5, 3.0),
      erosion: rng.pick([0.35, 0.5, 0.7, 0.85]),
      temperature: rng.range(0, 1),
      humidity: rng.range(0, 1),
      peakHeight: rng.range(6, 22),
      mountainScale: rng.range(0.008, 0.03),
      hillScale: rng.range(0.03, 0.08),
      detail: rng.intRange(1, 12),
      biome: this._deriveBiome(rng)
    };
  }

  _deriveBiome(rng) {
    const t = rng.range(0, 1);
    const h = rng.range(0, 1);
    if (t < 0.25 && h < 0.5) return 'desert';
    if (t < 0.25) return 'steppe';
    if (t < 0.6) return 'plains';
    if (t < 0.8) return 'temperate';
    return 'tundra';
  }

  height(x, z) {
    const p = this.params;
    const n = this.noise;
    let h = 0;

    h += n.fbm(x * 0.004, z * 0.004, 4, 2.0, 0.5) * 10 * p.continentalness;

    const mountains = Math.max(0, n.fbm(x * p.mountainScale + 50, z * p.mountainScale + 50, 5, 2.2, 0.55));
    h += Math.pow(mountains, 2.2) * p.peakHeight;

    h += n.fbm(x * p.hillScale + 200, z * p.hillScale + 200, 3) * 2.5;

    for (let i = 0; i < p.detail; i++) {
      const f = 0.2 + i * 0.15;
      h += n.noise2D(x * f + i * 31, z * f + i * 57) * (p.erosion * 0.4);
    }

    const ridgeline = Math.abs(n.noise2D(x * 0.01, z * 0.01));
    h += Math.pow(ridgeline, 1.5) * 3;

    return h;
  }

  buildGeometry() {
    const seg = this.seg;
    const size = this.size;
    const geometry = new THREE.PlaneGeometry(size, size, seg, seg);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = this._computeColors();
    const colorAttr = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this.height(x, z);
      positions.setY(i, h);

      const col = colors(h, x, z);
      colorAttr[i * 3] = col[0];
      colorAttr[i * 3 + 1] = col[1];
      colorAttr[i * 3 + 2] = col[2];
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geometry.computeVertexNormals();

    return geometry;
  }

  _computeColors() {
    const p = this.params;
    const biome = p.biome;

    const palette = {
      desert: { low: [0.76, 0.65, 0.4], high: [0.85, 0.72, 0.5], snow: [0.85, 0.82, 0.75] },
      steppe: { low: [0.55, 0.62, 0.35], high: [0.6, 0.68, 0.4], snow: [0.85, 0.82, 0.75] },
      plains: { low: [0.35, 0.62, 0.3], high: [0.4, 0.7, 0.35], snow: [0.92, 0.94, 0.95] },
      temperate: { low: [0.25, 0.5, 0.25], high: [0.3, 0.58, 0.3], snow: [0.92, 0.94, 0.95] },
      tundra: { low: [0.7, 0.75, 0.72], high: [0.78, 0.82, 0.8], snow: [0.95, 0.96, 0.98] }
    }[biome];

    const n = this.noise;
    return (h, x, z) => {
      let r, g, b;
      const t = (h + 8) / 32;
      if (t < 0.4) {
        const k = t / 0.4;
        r = palette.low[0] + (palette.high[0] - palette.low[0]) * k;
        g = palette.low[1] + (palette.high[1] - palette.low[1]) * k;
        b = palette.low[2] + (palette.high[2] - palette.low[2]) * k;
      } else {
        const k = Math.min(1, (t - 0.4) / 0.6);
        r = palette.high[0] + (palette.snow[0] - palette.high[0]) * k;
        g = palette.high[1] + (palette.snow[1] - palette.high[1]) * k;
        b = palette.high[2] + (palette.snow[2] - palette.high[2]) * k;
      }
      const jitter = n.noise2D(x * 0.05, z * 0.05) * 0.06;
      return [r + jitter, g + jitter, b + jitter];
    };
  }

  spawnPoint() {
    let x = 0, z = 0, h = this.height(x, z);
    for (let i = 0; i < 50; i++) {
      x = this.rng.range(-this.half * 0.8, this.half * 0.8);
      z = this.rng.range(-this.half * 0.8, this.half * 0.8);
      h = this.height(x, z);
      if (h > 0.2) break;
    }
    return new THREE.Vector3(x, h + 2, z);
  }
}
