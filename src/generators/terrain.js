import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export const ARCHETYPES = [
  { name: 'continental', desc: 'broad rolling land' },
  { name: 'islands', desc: 'scattered isles' },
  { name: 'canyonlands', desc: 'deep carved ravines' },
  { name: 'mesa', desc: 'flat-topped plateaus' },
  { name: 'highlands', desc: 'towering peaks' },
  { name: 'volcano', desc: 'colossal eruption cones' },
  { name: 'rift', desc: 'earth split by chasms' },
  { name: 'archipelago', desc: 'chains of islets' },
  { name: 'basin', desc: 'sunken lowlands' },
  { name: 'dunes', desc: 'wandering sand hills' },
  { name: 'karst', desc: 'sinkhole riddled ground' },
  { name: 'fjord', desc: 'narrow steep valleys' },
  { name: 'shattered', desc: 'jagged broken ground' },
  { name: 'terraced', desc: 'stepped plateaus' },
  { name: 'cratered', desc: 'impact-blasted pits' },
  { name: 'spires', desc: 'needle rock towers' },
  { name: 'uplift', desc: 'folded mountain belts' },
  { name: 'badlands', desc: 'eroded clay hoodoos' },
  { name: 'atolls', desc: 'ring-shaped reef rims' },
  { name: 'chaos', desc: 'unpredictable ruin' }
];

export const BIOME_LIST = [
  'desert', 'steppe', 'plains', 'temperate', 'tundra',
  'savanna', 'jungle', 'swamp', 'badlands', 'glacier',
  'volcanic', 'crystalline', 'mushroom', 'coral', 'ashfield', 'neon'
];

const BIOMES = {
  desert:     { low: [0.76, 0.66, 0.42], high: [0.88, 0.75, 0.52], snow: [0.90, 0.88, 0.80], veg: [0.36, 0.5, 0.18], density: 0.06, flora: 'cactus' },
  steppe:     { low: [0.55, 0.62, 0.35], high: [0.62, 0.7, 0.42], snow: [0.85, 0.82, 0.75], veg: [0.42, 0.58, 0.28], density: 0.1, flora: 'brush' },
  plains:     { low: [0.34, 0.62, 0.3], high: [0.4, 0.7, 0.36], snow: [0.92, 0.94, 0.95], veg: [0.2, 0.42, 0.2], density: 0.16, flora: 'tree' },
  temperate:  { low: [0.24, 0.5, 0.24], high: [0.3, 0.58, 0.3], snow: [0.92, 0.94, 0.95], veg: [0.16, 0.34, 0.16], density: 0.28, flora: 'tree' },
  tundra:     { low: [0.7, 0.75, 0.72], high: [0.78, 0.82, 0.8], snow: [0.95, 0.96, 0.98], veg: [0.3, 0.42, 0.3], density: 0.08, flora: 'brush' },
  savanna:    { low: [0.58, 0.66, 0.3], high: [0.66, 0.72, 0.34], snow: [0.9, 0.88, 0.8], veg: [0.34, 0.46, 0.2], density: 0.14, flora: 'acacia' },
  jungle:     { low: [0.18, 0.42, 0.18], high: [0.24, 0.5, 0.24], snow: [0.88, 0.92, 0.9], veg: [0.12, 0.26, 0.12], density: 0.42, flora: 'jungle' },
  swamp:      { low: [0.3, 0.44, 0.3], high: [0.36, 0.5, 0.34], snow: [0.85, 0.88, 0.9], veg: [0.24, 0.36, 0.2], density: 0.12, flora: 'swamp' },
  badlands:   { low: [0.62, 0.44, 0.34], high: [0.72, 0.5, 0.4], snow: [0.88, 0.86, 0.82], veg: [0.5, 0.38, 0.3], density: 0.05, flora: 'hoodoo' },
  glacier:    { low: [0.82, 0.88, 0.94], high: [0.9, 0.94, 0.98], snow: [0.98, 0.99, 1.0], veg: [0.74, 0.84, 0.9], density: 0.03, flora: 'ice' },
  volcanic:   { low: [0.4, 0.3, 0.28], high: [0.5, 0.36, 0.32], snow: [0.8, 0.78, 0.76], veg: [0.2, 0.16, 0.14], density: 0.02, flora: 'volcano' },
  crystalline:{ low: [0.5, 0.42, 0.62], high: [0.62, 0.52, 0.74], snow: [0.9, 0.92, 0.96], veg: [0.34, 0.28, 0.46], density: 0.1, flora: 'crystal' },
  mushroom:   { low: [0.56, 0.4, 0.56], high: [0.64, 0.46, 0.64], snow: [0.9, 0.9, 0.94], veg: [0.44, 0.3, 0.44], density: 0.2, flora: 'shroom' },
  coral:      { low: [0.5, 0.6, 0.74], high: [0.6, 0.7, 0.84], snow: [0.9, 0.94, 0.98], veg: [0.4, 0.52, 0.66], density: 0.12, flora: 'coral' },
  ashfield:   { low: [0.52, 0.5, 0.5], high: [0.6, 0.58, 0.58], snow: [0.8, 0.8, 0.8], veg: [0.4, 0.38, 0.38], density: 0.1, flora: 'ash' },
  neon:       { low: [0.2, 0.42, 0.42], high: [0.3, 0.54, 0.54], snow: [0.9, 0.9, 0.94], veg: [0.16, 0.3, 0.3], density: 0.18, flora: 'neon' }
};

const RIDGE_TYPES = [
  { name: 'sharp', power: 1.3, boost: 3.6 },
  { name: 'smooth', power: 0.9, boost: 2.2 },
  { name: 'razor', power: 1.8, boost: 4.4 },
  { name: 'lobed', power: 1.1, boost: 2.8 },
  { name: 'gentle', power: 0.6, boost: 1.4 }
];

export class TerrainGenerator {
  constructor(seed, size = 200) {
    this.seed = seed;
    this.size = size;
    this.half = size / 2;
    this.seg = Math.floor(size / 2);

    const rng = new SeededRandom(seed);
    this.rng = rng;
    this.noise = new SimplexNoise(rng);

    const biome = this._deriveBiome(rng);
    this.params = {
      continentalness: rng.range(0.3, 4.0),
      erosion: rng.pick([0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.95]),
      temperature: rng.range(0, 1),
      humidity: rng.range(0, 1),
      peakHeight: rng.range(4, 38),
      mountainScale: rng.range(0.005, 0.05),
      hillScale: rng.range(0.02, 0.12),
      detail: rng.intRange(1, 18),
      archetype: this.rng.pick(ARCHETYPES).name,
      biome,
      ridge: this.rng.pick(RIDGE_TYPES),
      warp: rng.range(0, 14),
      warpFreq: rng.range(0.005, 0.02),
      waterLevel: rng.range(-1.5, 1.0),
      dome: rng.range(0, 1),
      seedOffsetX: rng.range(0, 10000),
      seedOffsetZ: rng.range(0, 10000)
    };
  }

  _deriveBiome(rng) {
    const t = rng.range(0, 1);
    const h = rng.range(0, 1);
    const roll = rng.next();
    const arc = this.rng.pick(ARCHETYPES).name;
    if (arc === 'volcano' || roll < 0.05) return 'volcanic';
    if (arc === 'glacier' || arc === 'fjord') return 'glacier';
    if (arc === 'canyonlands' || arc === 'badlands') return 'badlands';
    if (arc === 'atolls' || arc === 'archipelago') return 'coral';
    if (arc === 'islands') return rng.pick(['coral', 'savanna', 'jungle']);
    if (h > 0.85 && roll < 0.3) return 'mushroom';
    if (h > 0.8) return 'jungle';
    if (t < 0.2 && h > 0.75) return 'swamp';
    if (t < 0.2) return 'steppe';
    if (t < 0.45) return 'savanna';
    if (t < 0.7) {
      if (roll < 0.2) return 'neon';
      if (roll < 0.35) return 'crystalline';
      return h > 0.6 ? 'temperate' : 'plains';
    }
    if (roll < 0.15) return 'ashfield';
    return 'tundra';
  }

  _warpCoords(x, z) {
    const p = this.params;
    if (p.warp <= 0.1) return [x, z];
    const w = p.warp;
    const wx = x + this.noise.noise2D(x * p.warpFreq, z * p.warpFreq) * w;
    const wz = z + this.noise.noise2D(z * p.warpFreq + 1000, x * p.warpFreq + 1000) * w;
    return [wx, wz];
  }

  height(x, z) {
    const p = this.params;
    const n = this.noise;
    const [wx, wz] = this._warpCoords(x, z);
    let h = 0;

    const continent = n.fbm(wx * 0.004 + p.seedOffsetX * 0.001, wz * 0.004 + p.seedOffsetZ * 0.001, 4, 2.0, 0.5);
    h += continent * 10 * p.continentalness;

    const mountains = Math.max(0, n.fbm(wx * p.mountainScale + 50, wz * p.mountainScale + 50, 5, 2.2, 0.55));
    h += Math.pow(mountains, 2.2) * p.peakHeight;

    h += n.fbm(wx * p.hillScale + 200, wz * p.hillScale + 200, 3) * 2.5;

    for (let i = 0; i < p.detail; i++) {
      const f = 0.12 + i * 0.13;
      h += n.noise2D(wx * f + i * 31, wz * f + i * 57) * (p.erosion * 0.45);
    }

    const ridge = Math.abs(n.noise2D(wx * 0.01, wz * 0.01));
    h += Math.pow(ridge, p.ridge.power) * p.ridge.boost;

    h = this._applyArchetype(h, wx, wz);

    return h;
  }

  _applyArchetype(h, x, z) {
    const p = this.params;
    const n = this.noise;
    switch (p.archetype) {
      case 'islands':
      case 'archipelago': {
        const shelf = n.fbm(x * 0.006 + 700, z * 0.006 + 700, 3);
        const mask = Math.max(0, shelf);
        return Math.min(h, mask * 18 - 6);
      }
      case 'canyonlands': {
        const carve = Math.abs(n.noise2D(x * 0.004 + 500, z * 0.004 + 500));
        return h - Math.pow(carve, 2) * 14;
      }
      case 'mesa': {
        const m = n.fbm(x * 0.005 + 300, z * 0.005 + 300, 3);
        const flat = Math.round(m * 6) / 6 * 8;
        return h * 0.35 + flat;
      }
      case 'highlands': return h * 1.5 + 4;
      case 'volcano': {
        const d = Math.sqrt(x * x + z * z);
        const cone = Math.max(0, 1 - d / 60) * 30;
        return h * 0.6 + cone + Math.pow(Math.max(0, n.noise2D(x * 0.02 + 800, z * 0.02 + 800)), 2) * 8;
      }
      case 'rift': {
        const band = Math.abs(n.noise2D(x * 0.005 + 900, z * 0.005 + 900));
        return h - Math.pow(Math.max(0, 1 - band), 2) * 12;
      }
      case 'basin': {
        const d = Math.sqrt(x * x + z * z) / 60;
        return h - Math.max(0, 1 - d) * 16;
      }
      case 'dunes': {
        const ripple = Math.sin(x * 0.03 + n.noise2D(x * 0.01, z * 0.01) * 6) * 3;
        return h * 0.25 + ripple;
      }
      case 'karst': {
        const holes = Math.abs(n.noise2D(x * 0.015 + 400, z * 0.015 + 400));
        return h - Math.pow(holes, 6) * 10;
      }
      case 'fjord': {
        const band = Math.abs(n.noise2D(x * 0.004 + 600, z * 0.004 + 600));
        return Math.min(h, (1 - band) * 30 - 4);
      }
      case 'shattered': return h + n.fbm(x * 0.05, z * 0.05, 4) * 6;
      case 'terraced': {
        const q = Math.floor(h / 3) * 3;
        return q + n.noise2D(x * 0.02 + 100, z * 0.02 + 100) * 0.8;
      }
      case 'cratered': {
        const k = Math.abs(n.noise2D(x * 0.012 + 700, z * 0.012 + 700));
        return h - Math.pow(k, 1.2) * 9;
      }
      case 'spires': {
        const needle = Math.max(0, n.fbm(x * 0.02 + 300, z * 0.02 + 300, 3));
        return h * 0.5 + Math.pow(needle, 3) * 34;
      }
      case 'uplift': {
        const fold = Math.sin((x + n.noise2D(x * 0.008, z * 0.008) * 40) * 0.03) * 7;
        return h + fold;
      }
      case 'badlands': {
        return h + Math.pow(Math.abs(n.noise2D(x * 0.01 + 500, z * 0.01 + 500)), 2.5) * 10;
      }
      case 'atolls': {
        const d = Math.sqrt(x * x + z * z);
        const rim = Math.max(0, 1 - Math.abs(d - 30) / 8) * 6;
        return Math.min(h, rim + (1 - Math.max(0, 1 - d / 30)) * -10);
      }
      case 'chaos': return h * 1.4 + n.fbm(x * 0.02, z * 0.02, 5) * 9;
      default: return h;
    }
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
    const biome = this.params.biome;
    const palette = BIOMES[biome] || BIOMES.plains;
    const n = this.noise;
    const hueJitter = this.rng.range(0, 0.04);
    const snowLine = this.rng.range(8, 18);

    return (h, x, z) => {
      let r, g, b;
      const t = (h + 8) / (snowLine + 12);
      const j = n.noise2D(x * 0.05, z * 0.05) * 0.06;
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
      return [r + j + hueJitter, g + j, b + j - hueJitter];
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