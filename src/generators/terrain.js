import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

const TERRAIN_BASES = [
  { name: 'lowland', fn: (h, x, z, p, n) => h },
  { name: 'highland', fn: (h, x, z, p, n) => h * 1.5 + 3 },
  { name: 'basin', fn: (h, x, z, p, n) => { const d = Math.sqrt(x * x + z * z) / 52; return h - Math.max(0, 1 - d) * 24; } },
  { name: 'isles', fn: (h, x, z, p, n) => { const m = n.fbm(x * 0.006 + 700, z * 0.006 + 700, 3); return Math.min(h, Math.max(0, m) * 18 - 6); } },
  { name: 'plateau', fn: (h, x, z, p, n) => { const m = n.fbm(x * 0.005 + 300, z * 0.005 + 300, 3); return h * 0.35 + Math.round(m * 6) / 6 * 8; } },
  { name: 'cone', fn: (h, x, z, p, n) => { const d = Math.sqrt(x * x + z * z); const c = Math.max(0, 1 - d / 60) * 30; return h * 0.6 + c + Math.pow(Math.max(0, n.noise2D(x * 0.02 + 800, z * 0.02 + 800)), 2) * 8; } }
];

const TERRAIN_CARVES = [
  { name: '', fn: (h) => h },
  { name: 'canyon', fn: (h, x, z, p, n) => h - Math.pow(Math.abs(n.noise2D(x * 0.004 + 500, z * 0.004 + 500)), 2) * 14 },
  { name: 'karst', fn: (h, x, z, p, n) => h - Math.pow(Math.abs(n.noise2D(x * 0.015 + 400, z * 0.015 + 400)), 6) * 10 },
  { name: 'rift', fn: (h, x, z, p, n) => h - Math.pow(Math.max(0, 1 - Math.abs(n.noise2D(x * 0.005 + 900, z * 0.005 + 900))), 3) * 12 },
  { name: 'cratered', fn: (h, x, z, p, n) => h - Math.pow(Math.abs(n.noise2D(x * 0.012 + 700, z * 0.012 + 700)), 1.2) * 9 }
];

const TERRAIN_MODS = [
  { name: '', fn: (h) => h },
  { name: 'terraced', fn: (h, x, z, p, n) => Math.floor(h / 3) * 3 + n.noise2D(x * 0.02 + 100, z * 0.02 + 100) * 0.8 },
  { name: 'spired', fn: (h, x, z, p, n) => h * 0.5 + Math.pow(Math.max(0, n.fbm(x * 0.02 + 300, z * 0.02 + 300, 3)), 3) * 34 },
  { name: 'ridged', fn: (h, x, z, p, n) => h + Math.pow(Math.abs(n.noise2D(x * 0.012 + 211, z * 0.012 + 211)), 2.2) * 5 },
  { name: 'folded', fn: (h, x, z, p, n) => h + Math.sin((x + n.noise2D(x * 0.008, z * 0.008) * 40) * 0.03) * 7 }
];

const RIDGE_NAMES = ['sharp', 'smooth', 'razor', 'lobed', 'gentle', 'jagged', 'keen', 'mellow', 'scalloped', 'crested', 'undulant', 'chiseled', 'feathered', 'stony', 'aeren'];

const RIDGE_POWERS = [0.6, 0.9, 1.2, 1.5, 1.9];
const RIDGE_BOOSTS = [1.2, 2.6, 4.4];

export const ALL_BIOME_BASES = [
  'desert', 'steppe', 'plains', 'temperate', 'tundra',
  'savanna', 'jungle', 'swamp', 'badlands', 'glacier',
  'volcanic', 'crystalline', 'mushroom', 'coral', 'ashfield', 'neon'
];

export const BIOME_VARIANTS = [
  { tag: '', lgt: 0, sat: 0, den: 1 },
  { tag: '-bloom', lgt: 0.07, sat: 0.05, den: 1.25 },
  { tag: '-bleak', lgt: -0.09, sat: -0.07, den: 0.72 }
];

const BIOME_BASE_DEFS = {
  desert:     { low: [0.76, 0.66, 0.42], high: [0.88, 0.75, 0.52], snow: [0.90, 0.88, 0.80], veg: [0.36, 0.5, 0.18], density: 0.06, flora: 'cactus' },
  steppe:     { low: [0.55, 0.62, 0.35], high: [0.62, 0.7, 0.42], snow: [0.85, 0.82, 0.75], veg: [0.42, 0.58, 0.28], density: 0.1, flora: 'brush' },
  plains:     { low: [0.34, 0.62, 0.3], high: [0.4, 0.7, 0.36], snow: [0.92, 0.94, 0.95], veg: [0.2, 0.42, 0.2], density: 0.16, flora: 'tree' },
  temperate:  { low: [0.24, 0.5, 0.24], high: [0.3, 0.58, 0.3], snow: [0.92, 0.94, 0.95], veg: [0.16, 0.34, 0.16], density: 0.3, flora: 'tree' },
  tundra:     { low: [0.7, 0.75, 0.72], high: [0.78, 0.82, 0.8], snow: [0.95, 0.96, 0.98], veg: [0.3, 0.42, 0.3], density: 0.07, flora: 'brush' },
  savanna:    { low: [0.58, 0.66, 0.3], high: [0.66, 0.72, 0.34], snow: [0.9, 0.88, 0.8], veg: [0.34, 0.46, 0.2], density: 0.14, flora: 'acacia' },
  jungle:     { low: [0.18, 0.42, 0.18], high: [0.24, 0.5, 0.24], snow: [0.88, 0.92, 0.9], veg: [0.12, 0.26, 0.12], density: 0.42, flora: 'jungle' },
  swamp:      { low: [0.3, 0.44, 0.3], high: [0.36, 0.5, 0.34], snow: [0.85, 0.88, 0.9], veg: [0.24, 0.36, 0.2], density: 0.14, flora: 'swampy' },
  badlands:   { low: [0.62, 0.44, 0.34], high: [0.72, 0.5, 0.4], snow: [0.88, 0.86, 0.82], veg: [0.5, 0.38, 0.3], density: 0.05, flora: 'brush' },
  glacier:    { low: [0.82, 0.88, 0.94], high: [0.9, 0.94, 0.98], snow: [0.98, 0.99, 1.0], veg: [0.74, 0.84, 0.9], density: 0.02, flora: 'ice' },
  volcanic:   { low: [0.4, 0.3, 0.28], high: [0.5, 0.36, 0.32], snow: [0.8, 0.78, 0.76], veg: [0.2, 0.16, 0.14], density: 0.03, flora: 'volcano' },
  crystalline:{ low: [0.5, 0.42, 0.62], high: [0.62, 0.52, 0.74], snow: [0.9, 0.92, 0.96], veg: [0.34, 0.28, 0.46], density: 0.24, flora: 'crystal' },
  mushroom:   { low: [0.56, 0.4, 0.56], high: [0.64, 0.46, 0.64], snow: [0.9, 0.9, 0.94], veg: [0.44, 0.3, 0.44], density: 0.24, flora: 'shroom' },
  coral:      { low: [0.5, 0.6, 0.74], high: [0.6, 0.7, 0.84], snow: [0.9, 0.94, 0.98], veg: [0.4, 0.52, 0.66], density: 0.2, flora: 'coral' },
  ashfield:   { low: [0.52, 0.5, 0.5], high: [0.6, 0.58, 0.58], snow: [0.8, 0.8, 0.8], veg: [0.4, 0.38, 0.38], density: 0.1, flora: 'ash' },
  neon:       { low: [0.2, 0.42, 0.42], high: [0.3, 0.54, 0.54], snow: [0.9, 0.9, 0.94], veg: [0.16, 0.3, 0.3], density: 0.22, flora: 'crystal' }
};

export class TerrainGenerator {
  constructor(seed, size = 200) {
    this.seed = seed;
    this.size = size;
    this.half = size / 2;
    this.seg = Math.floor(size / 2);

    const rng = new SeededRandom(seed);
    this.rng = rng;
    this.noise = new SimplexNoise(rng);

    const base = this.rng.pick(TERRAIN_BASES);
    const carve = this.rng.pick(TERRAIN_CARVES);
    const mod = this.rng.pick(TERRAIN_MODS);
    const pi = this.rng.intRange(0, RIDGE_POWERS.length - 1);
    const pj = this.rng.intRange(0, RIDGE_BOOSTS.length - 1);
    const archetype = [mod.name, carve.name, base.name].filter(Boolean).join('-');

    this.params = {
      continentalness: rng.range(0.3, 4.5),
      erosion: rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]),
      temperature: rng.range(0, 1),
      humidity: rng.range(0, 1),
      peakHeight: rng.range(4, 42),
      mountainScale: rng.range(0.005, 0.055),
      hillScale: rng.range(0.015, 0.13),
      detail: rng.intRange(1, 20),
      base,
      carve,
      mod,
      archetype,
      ridge: {
        power: RIDGE_POWERS[pi],
        boost: RIDGE_BOOSTS[pj],
        name: RIDGE_NAMES[pi * 3 + pj]
      },
      biome: this._deriveBiome(rng, archetype),
      warp: rng.range(0, 15),
      warpFreq: rng.range(0.005, 0.022),
      waterLevel: rng.range(-1.5, 1.0),
      seedOffsetX: rng.range(0, 10000),
      seedOffsetZ: rng.range(0, 10000)
    };
    this.params.biomeDef = this._makeBiomeDef();
  }

  _pickBiomeBase(rng, archetype) {
    const t = rng.range(0, 1);
    const h = rng.range(0, 1);
    const roll = rng.next();
    const arc = archetype;

    if (arc.includes('cone') && roll < 0.6) return 'volcanic';
    if (arc.includes('highland') && roll < 0.5) return 'glacier';
    if (roll < 0.06) {
      return rng.pick(['volcanic', 'glacier', 'ashfield', 'neon', 'mushroom', 'coral', 'crystalline']);
    }
    if (arc.includes('canyon') || arc.includes('cratered')) {
      if (roll < 0.5) return 'badlands';
      return rng.pick(['desert', 'steppe']);
    }
    if (arc.includes('isles')) return rng.pick(['coral', 'savanna', 'jungle', 'swamp']);

    if (h > 0.8) return h * t > 0.5 ? 'mushroom' : 'jungle';
    if (t < 0.2) return rng.pick(['desert', 'badlands']);
    if (t < 0.4) return h > 0.6 ? 'savanna' : 'steppe';
    if (t < 0.7) {
      if (roll < 0.2) return 'neon';
      if (roll < 0.4) return 'crystalline';
      return h > 0.6 ? 'temperate' : 'plains';
    }
    if (t < 0.85) return h > 0.5 ? 'swamp' : 'tundra';
    return rng.pick(['ashfield', 'glacier']);
  }

  _deriveBiome(rng, archetype) {
    const base = this._pickBiomeBase(rng, archetype);
    const v = rng.pick(BIOME_VARIANTS);
    return base + v.tag;
  }

  _shiftPalette(pal, lgt, sat) {
    const out = pal.map(ch => {
      let c = ch + lgt;
      c = c + (0.5 - c) * -sat;
      return Math.max(0, Math.min(1, c));
    });
    return out;
  }

  _makeBiomeDef() {
    const name = this.params.biome;
    const dash = name.indexOf('-');
    const baseKey = dash >= 0 ? name.slice(0, dash) : name;
    const tag = dash >= 0 ? name.slice(dash) : '';
    const base = BIOME_BASE_DEFS[baseKey] || BIOME_BASE_DEFS.plains;
    const variant = BIOME_VARIANTS.find(v => v.tag === tag) || BIOME_VARIANTS[0];
    return {
      name,
      baseKey,
      veg: this._shiftPalette(base.veg, variant.lgt, variant.sat),
      density: base.density * variant.den,
      flora: base.flora,
      low: this._shiftPalette(base.low, variant.lgt, variant.sat),
      high: this._shiftPalette(base.high, variant.lgt, variant.sat),
      snow: this._shiftPalette(base.snow, variant.lgt, variant.sat * 0.3)
    };
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

    h = p.base.fn(h, wx, wz, p, n);
    h = p.carve.fn(h, wx, wz, p, n);
    h = p.mod.fn(h, wx, wz, p, n);

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
    const palette = p.biomeDef;
    const n = this.noise;
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
      return [r + j, g + j, b + j];
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