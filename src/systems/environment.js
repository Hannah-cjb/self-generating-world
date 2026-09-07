import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

const HUE_SECTORS = [
  [0.55, 0.62], [0.52, 0.58], [0.42, 0.5], [0.3, 0.4], [0.68, 0.78], [0.85, 0.95],
  [0.05, 0.12], [0.6, 0.66], [0.15, 0.25], [0.02, 0.06], [0.5, 0.56], [0.7, 0.85]
];

const SECTOR_NAMES = ['cobalt', 'azurite', 'teal', 'viridian', 'amethyst', 'rose', 'dusk', 'ash', 'poison', 'bleak', 'cerulean', 'nebula'];
const TONE_NAMES = ['', '-pale', '-gloom'];
const TONE_SAT = [0, 0.08, -0.1];
const TONE_LGT = [0, 0.16, -0.14];

function buildSkies() {
  const skies = [];
  for (let i = 0; i < HUE_SECTORS.length; i++) {
    for (let t = 0; t < TONE_NAMES.length; t++) {
      skies.push({
        name: SECTOR_NAMES[i] + TONE_NAMES[t],
        hue: HUE_SECTORS[i],
        sat: [0.45 + TONE_SAT[t], 0.7 + TONE_SAT[t]],
        lgt: [0.42 + TONE_LGT[t], 0.6 + TONE_LGT[t]]
      });
    }
  }
  return skies;
}

const SKY_PRESETS = buildSkies();

const WEATHER_KINDS = [
  { id: 'clear', count: 0, fog: 1.0, dim: 1.0, vel: [0, -6, 0], lam: 'Clear Sky' },
  { id: 'cloudy', count: 0, fog: 1.2, dim: 0.85, vel: [0, -6, 0], lam: 'Overcast' },
  { id: 'rain', count: 900, fog: 1.6, dim: 0.7, vel: [0, -26, 0], lam: 'Rainfall' },
  { id: 'storm', count: 1300, fog: 2.0, dim: 0.5, vel: [0, -36, 0], lam: 'Tempest' },
  { id: 'snow', count: 800, fog: 1.4, dim: 0.75, vel: [0, -3.5, 0], lam: 'Snowfall' },
  { id: 'blizzard', count: 1400, fog: 2.4, dim: 0.4, vel: [0, -6, 0], lam: 'Blizzard' },
  { id: 'ash', count: 1000, fog: 2.2, dim: 0.55, vel: [0, -2.5, 0], lam: 'Ashfall' },
  { id: 'emberfall', count: 700, fog: 1.2, dim: 0.7, vel: [0, 3.5, 0], lam: 'Emberfall' },
  { id: 'aurora', count: 500, fog: 1.0, dim: 0.6, vel: [0, -1, 0], lam: 'Aurora' },
  { id: 'pollen', count: 600, fog: 1.5, dim: 0.75, vel: [0, -1.5, 0], lam: 'Pollen Haze' }
];

const INTENSITY_TIERS = [
  { tag: '-mild', count: 0.5, fog: 0.85, dim: 1.05, vel: 0.8, w: 1 },
  { tag: '', count: 1.0, fog: 1.0, dim: 1.0, vel: 1.0, w: 2 },
  { tag: '-severe', count: 1.7, fog: 1.3, dim: 0.8, vel: 1.35, w: 1 }
];

function buildWeathers() {
  const list = [];
  for (const kind of WEATHER_KINDS) {
    for (const tier of INTENSITY_TIERS) {
      list.push({
        id: kind.id + tier.tag,
        kind: kind.id,
        name: kind.lam + tier.tag,
        pcount: Math.round(kind.count * tier.count),
        fog: kind.fog * tier.fog,
        skyDim: kind.dim * tier.dim,
        pVel: kind.vel.map(v => v * tier.vel),
        weight: tier.w
      });
    }
  }
  return list;
}

const WEATHERS = buildWeathers();

export class WorldEnvironment {
  constructor(engine, heightFn, worldSize, seed) {
    this.engine = engine;
    this.heightFn = heightFn;
    this.worldSize = worldSize;
    this.rng = new SeededRandom(seed);
    this.noise = new SimplexNoise(this.rng);

    this.skyPreset = this.rng.pick(SKY_PRESETS);
    this.skyBase = new THREE.Color().setHSL(
      this.rng.range(this.skyPreset.hue[0], this.skyPreset.hue[1]),
      this.rng.range(this.skyPreset.sat[0], this.skyPreset.sat[1]),
      this.rng.range(this.skyPreset.lgt[0], this.skyPreset.lgt[1])
    );
    this.sunColor = new THREE.Color().setHSL(this.rng.range(0.02, 0.12), this.rng.range(0.4, 0.7), 0.9);

    this.dayLength = this.rng.range(60, 600);
    this.visibility = this.rng.range(70, 420);
    this.cloudCount = this.rng.intRange(3, 26);
    this.windSpeed = this.rng.range(0.3, 4);
    this.cloudLayer = this.rng.range(25, 70);
    this.orbitPhase = this.rng.range(0, Math.PI * 2);

    this.weather = this._rollWeather();
    this.weatherSchedule = this._rollWeatherSchedule();
    this.weatherT = 0;
    this.scheduleIdx = 0;

    this.clouds = [];
    this.particles = null;
    this.partGeom = null;
    this.flashTimer = 0;
    this.flash = 0;
    this.starMesh = null;
    this.auroraMesh = null;
  }

  _rollWeather() {
    const bottle = [];
    for (const w of WEATHERS) {
      const seedRoll = this.rng.chance(0.18) ? 2 : 1;
      for (let i = 0; i < w.weight * seedRoll; i++) bottle.push(w);
    }
    return this.rng.pick(bottle);
  }

  _rollWeatherSchedule() {
    const n = this.rng.intRange(2, 5);
    const sched = [];
    for (let i = 0; i < n; i++) {
      sched.push({ type: this._rollWeather(), dur: this.rng.range(60, 400) });
    }
    return sched;
  }

  build(engine) {
    const scene = engine.scene;
    scene.background = this.skyBase.clone();
    scene.fog = new THREE.Fog(this.skyBase.clone().lerp(new THREE.Color(0.6, 0.6, 0.6), 0.2), this.visibility * 0.25, this.visibility);

    const hemi = new THREE.HemisphereLight(this.skyBase.clone(), 0x556b2f, this.rng.range(0.45, 0.95));
    scene.add(hemi);
    this.hemi = hemi;

    const sun = new THREE.DirectionalLight(this.sunColor, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 240;
    scene.add(sun);
    this.sun = sun;

    this._buildClouds(scene);
    this._buildParticles(scene);
    this._buildStars(scene);
    this.flashLamp = new THREE.PointLight(0xaaccff, 0, 200);
    scene.add(this.flashLamp);
    if (this.weather.kind === 'aurora') this._buildAurora(scene);
  }

  _buildClouds(scene) {
    for (let i = 0; i < this.cloudCount; i++) {
      const cloud = new THREE.Group();
      const storm = this.weather.kind === 'storm' || this.weather.kind === 'blizzard';
      const mat = new THREE.MeshBasicMaterial({
        color: storm ? this.rng.pick([0x4a4a55, 0x55555f, 0x3a3a44]) : (this.rng.next() < 0.55 ? 0xffffff : 0xdcdcdc),
        transparent: true,
        opacity: this.rng.range(0.65, 0.95)
      });
      const puffs = this.rng.intRange(3, 8);
      for (let p = 0; p < puffs; p++) {
        const s = this.rng.range(3, 8);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat);
        puff.position.set(p * this.rng.range(2, 4.5) - puffs * 2, this.rng.range(-1, 1.8), this.rng.range(-2, 2));
        puff.scale.y = 0.4;
        cloud.add(puff);
      }
      cloud.position.set(
        this.rng.range(-this.worldSize * 0.85, this.worldSize * 0.85),
        this.cloudLayer + this.rng.range(-4, 4),
        this.rng.range(-this.worldSize * 0.85, this.worldSize * 0.85)
      );
      cloud.userData.vel = this.rng.range(0.2, 1.5);
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  _buildParticles(scene) {
    const count = this.weather.pcount || 0;
    if (!count) return;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = this.rng.range(-60, 60);
      pos[i * 3 + 1] = this.rng.range(-5, 120);
      pos[i * 3 + 2] = this.rng.range(-60, 60);
    }
    this.partGeom = new THREE.BufferGeometry();
    this.partGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let color;
    const k = this.weather.kind;
    if (k === 'snow' || k === 'blizzard') color = 0xffffff;
    else if (k === 'ash') color = 0x8a8a83;
    else if (k === 'emberfall') color = 0xff6a30;
    else if (k === 'rain' || k === 'storm') color = 0x9fc4dd;
    else if (k === 'aurora') color = 0x7dffb0;
    else color = 0xffe07a;
    this.parts = new THREE.Points(this.partGeom, new THREE.PointsMaterial({
      color, size: this.rng.range(0.08, 0.35), transparent: true, opacity: k === 'rain' || k === 'storm' ? 0.5 : 0.85
    }));
    this.parts.frustumCulled = false;
    scene.add(this.parts);
  }

  _buildStars(scene) {
    const count = 500;
    const pos = new Float32Array(count * 3);
    const rng = new SeededRandom(this.rng.next() * 0x7fffffff | 0);
    for (let i = 0; i < count; i++) {
      const theta = rng.range(0, Math.PI * 2);
      const phi = rng.range(0, Math.PI * 0.45);
      const r = 480;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMesh = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0 }));
    this.starMesh.frustumCulled = false;
    scene.add(this.starMesh);
  }

  _buildAurora(scene) {
    const geom = new THREE.PlaneGeometry(this.worldSize * 1.4, 90, 2, 60);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4dffb0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.auroraMat = mat;
    this.auroraMesh = new THREE.Mesh(geom, mat);
    this.auroraMesh.rotation.x = -Math.PI / 2;
    this.auroraMesh.position.y = 70;
    this.auroraMesh.userData.baseHue = this.rng.range(0.3, 0.85);
    scene.add(this.auroraMesh);
  }

  update(dt, elapsed, playerPos) {
    const scene = this.engine.scene;
    const period = this.dayLength;
    const dayFrac = ((elapsed + this.orbitPhase * period / (Math.PI * 2)) % period) / period;
    const sunPhase = dayFrac * Math.PI * 2;
    const sunY = Math.sin(sunPhase);
    const dayFactor = Math.max(0, Math.sin(sunPhase));
    const nightFactor = Math.max(0, 1 - dayFactor * 1.4);

    if (this.sun) {
      this.sun.position.set(Math.cos(sunPhase) * 90, -18 + (sunY + 1) * 55, Math.sin(sunPhase) * 25);
      this.sun.intensity = 0.15 + 2.1 * dayFactor * this.weather.skyDim;
    }
    if (this.hemi) {
      this.hemi.intensity = (0.25 + 0.6 * dayFactor) * this.weatherOpacity();
    }

    this.flashTimer -= dt;
    if (this.weather.kind === 'storm') {
      this.flash -= dt * 3;
      if (this.flashTimer <= 0) {
        this.flashTimer = this.rng.range(2, 7);
        this.flash = 1;
        if (this.audio && this.rng.chance(0.6)) this.audio.playThunder();
      }
    }
    if (this.flashLamp) {
      this.flashLamp.intensity = this.flash * 4;
      this.flashLamp.position.copy(playerPos).y += 60;
    }

    const effSky = this._effectiveSkyColor();
    if (scene.fog) {
      scene.fog.color.lerp(effSky, 0.08);
      const midF = this.visibility * (0.2 + 0.08 * this.weather.fog);
      scene.fog.near = midF * 0.2;
      scene.fog.far = midF * (1.6 + this.weather.fog * 0.4);
    }
    scene.background.lerp(effSky, 0.1);

    if (this.starMesh) this.starMesh.material.opacity = nightFactor * (1 - this.weather.skyDim * 0.6);

    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.vel * this.windSpeed * dt;
      if (cloud.position.x > this.worldSize) {
        cloud.position.x = -this.worldSize;
        cloud.position.z = this.rng.range(-this.worldSize * 0.8, this.worldSize * 0.8);
      }
    }

    this._updateParticles(dt, playerPos);

    if (this.auroraMat) {
      this.auroraMat.opacity = (0.12 + 0.4 * nightFactor) * (this.weather.kind === 'aurora' ? 1 : 0.3);
      const p = this.auroraMesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        p.setZ(i, Math.sin(elapsed * 0.3 + i * 1.3) * 8);
      }
      p.needsUpdate = true;
      const hue = this.auroraMesh.userData.baseHue + Math.sin(elapsed * 0.1) * 0.08;
      this.auroraMat.color.setHSL(hue, 0.8, 0.6);
    }

    this.weatherT = (this.weatherT + dt);
    const cur = this.weatherSchedule[this.scheduleIdx];
    if (cur && this.weatherT > cur.dur) {
      this.weatherT = 0;
      this.scheduleIdx = (this.scheduleIdx + 1) % this.weatherSchedule.length;
      this._shiftWeather(this.weatherSchedule[this.scheduleIdx].type);
    }

    if (this.orbit) this.orbit.dayFrac = dayFrac;
  }

  weatherOpacity() {
    return Math.min(1, 0.45 + this.weather.fog * 0.15);
  }

  _shiftWeather(w) {
    this.weather = w;
    const scene = this.engine.scene;
    if (this.parts) {
      scene.remove(this.parts);
      this.partGeom.dispose();
      this.parts = null;
    }
    this._buildParticles(scene);
    if (this.weather.kind === 'aurora') {
      if (!this.auroraMesh) this._buildAurora(scene);
    } else if (this.auroraMesh) {
      this.auroraMat.opacity = 0.05;
    }
    for (const cloud of this.clouds) {
      const storm = this.weather.kind === 'storm' || this.weather.kind === 'blizzard';
      const mat = cloud.children[0].material;
      mat.color.setHex(storm ? 0x4a4a55 : 0xffffff).lerp(this.engine.scene.background, 0.4);
    }
  }

  _effectiveSkyColor() {
    const w = this.weather;
    const c = this.skyBase.clone();
    const k = w.kind;
    if (k === 'rain' || k === 'storm') {
      c.lerp(new THREE.Color(0.45, 0.48, 0.52), k === 'storm' ? 0.55 : 0.4);
    } else if (k === 'snow' || k === 'blizzard') {
      c.lerp(new THREE.Color(0.8, 0.82, 0.86), 0.45);
    } else if (k === 'ash') {
      c.lerp(new THREE.Color(0.55, 0.56, 0.58), 0.5);
    } else if (k === 'aurora') {
      c.lerp(new THREE.Color(0.1, 0.28, 0.24), 0.3);
    } else if (k === 'emberfall') {
      c.lerp(new THREE.Color(0.25, 0.12, 0.08), 0.3);
    } else if (k === 'pollen') {
      c.lerp(new THREE.Color(0.55, 0.6, 0.4), 0.3);
    } else if (k === 'cloudy') {
      c.lerp(new THREE.Color(0.6, 0.62, 0.66), 0.25);
    }
    return c;
  }

  _updateParticles(dt, playerPos) {
    if (!this.parts || !this.partGeom) return;
    const pos = this.partGeom.attributes.position.array;
    const n = pos.length / 3;
    const [vx, vy, vz] = this.weather.pVel;
    const sway = this.windSpeed * 0.6;
    for (let i = 0; i < n; i++) {
      pos[i * 3] += vx * dt + Math.sin(this.weatherT + i) * sway * dt;
      pos[i * 3 + 1] += vy * dt + (this.weather.kind === 'emberfall' ? 1.5 : 0) * dt;
      pos[i * 3 + 2] += vz * dt + Math.cos(this.weatherT + i * 1.3) * sway * 0.6 * dt;
      if (this.weather.kind === 'emberfall') {
        if (pos[i * 3 + 1] > 80) pos[i * 3 + 1] = -2;
      } else {
        if (pos[i * 3 + 1] < -2) {
          pos[i * 3 + 1] = 80;
          pos[i * 3] = playerPos.x + this.rng.range(-50, 50);
          pos[i * 3 + 2] = playerPos.z + this.rng.range(-50, 50);
        }
      }
      const dx = pos[i * 3] - playerPos.x;
      const dz = pos[i * 3 + 2] - playerPos.z;
      if (dx * dx + dz * dz > 3600) {
        pos[i * 3] = playerPos.x + dx * 0.98;
        pos[i * 3 + 2] = playerPos.z + dz * 0.98;
      }
    }
    this.partGeom.attributes.position.needsUpdate = true;
  }
}

function skyHue0(p) { return p.hue[0]; }
function skyHue1(p) { return p.hue[1]; }