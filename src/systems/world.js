import * as THREE from 'three';
import { SeededRandom } from '../core/seed.js';
import { TerrainGenerator } from '../generators/terrain.js';
import { TextureFactory } from '../generators/textures.js';
import { AudioEngine } from '../generators/audio.js';
import { EntityFactory } from '../entities/factory.js';
import { PlayerController } from './player.js';
import { PhysicsEngine, RigidBody } from './physics.js';
import { PHYSICS_MODELS } from './physics.js';
import { WorldEnvironment } from './environment.js';

const WEAPON_BASES = [
  { name: 'Bolt', count: 1, spread: 0.0, speed: 30, dmg: 1, cd: 0.35, size: 0.12 },
  { name: 'Scatter', count: 4, spread: 0.09, speed: 24, dmg: 1, cd: 0.5, size: 0.09 },
  { name: 'Cannon', count: 1, spread: 0.0, speed: 16, dmg: 3, cd: 1.2, size: 0.30 },
  { name: 'Rail', count: 1, spread: 0.0, speed: 60, dmg: 2, cd: 0.9, size: 0.05 },
  { name: 'Burst', count: 3, spread: 0.035, speed: 32, dmg: 1, cd: 0.28, size: 0.10 },
  { name: 'Homing', count: 1, spread: 0.0, speed: 18, dmg: 2, cd: 0.8, size: 0.10 }
];

const WEAPON_TIERS = [
  { tag: '', dmg: 1, cd: 1.0, size: 1.0, speed: 1.0 },
  { tag: '-Rapid', dmg: 0.6, cd: 0.55, size: 0.75, speed: 1.15 },
  { tag: '-Heavy', dmg: 2.0, cd: 1.5, size: 1.4, speed: 0.8 },
  { tag: '-Swift', dmg: 0.8, cd: 0.7, size: 0.7, speed: 1.3 },
  { tag: '-Master', dmg: 1.5, cd: 0.8, size: 1.1, speed: 1.05 }
];

const WEAPON_COLORS = [0xffdd66, 0xffcc55, 0x88ffcc, 0xff5533, 0xccddff, 0xffaacc, 0xcc88ff, 0xffe0a0, 0x99ddff, 0xff9955];

function buildWeapons() {
  const out = [];
  for (let b = 0; b < WEAPON_BASES.length; b++) {
    for (let t = 0; t < WEAPON_TIERS.length; t++) {
      const base = WEAPON_BASES[b];
      const tier = WEAPON_TIERS[t];
      out.push({
        name: base.name + tier.tag,
        count: base.count,
        spread: base.spread,
        speed: base.speed * tier.speed,
        dmg: Math.max(0.5, Math.round(base.dmg * tier.dmg * 10) / 10),
        cd: base.cd * tier.cd,
        size: base.size * tier.size,
        color: WEAPON_COLORS[(b * 7 + t * 3) % WEAPON_COLORS.length],
        homing: base.name === 'Homing'
      });
    }
  }
  return out;
}

export const WEAPONS = buildWeapons();

export class World {
  constructor(engine, seedString, ui) {
    this.engine = engine;
    this.ui = ui;
    this.seedString = seedString;
    const seed = this._hash(seedString);
    this.seed = seed;
    this.audio = new AudioEngine(seed);

    const tuningRng = new SeededRandom(seed ^ 0x6a09e667);
    this.physicsModel = tuningRng.pick(PHYSICS_MODELS);
    this.weapon = tuningRng.pick(WEAPONS);
    this.tuning = {
      speed: 4 + tuningRng.range(0, 7),
      sprint: 1.3 + tuningRng.range(0.2, 0.8),
      jumpMult: 0.85 + tuningRng.range(0, 0.4)
    };
    this.shotCd = 0;

    this.terrain = new TerrainGenerator(seed, 240);
    const meshMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    this.terrainMesh = new THREE.Mesh(this.terrain.buildGeometry(), meshMat);
    this.terrainMesh.receiveShadow = true;
    engine.scene.add(this.terrainMesh);

    this.heightFn = (x, z) => this.terrain.height(x, z);
    this.physics = new PhysicsEngine(this.heightFn, this.terrain.size, {
      gravity: this.physicsModel.gravity,
      drag: this.physicsModel.drag
    });

    this.spawn = this.terrain.spawnPoint();
    this.player = new PlayerController(engine, this.physics, this.spawn.clone(), this.audio, this.tuning);

    this.env = new WorldEnvironment(engine, this.terrain.height, this.terrain.size, this._hash(seedString + '_env'));
    this.env.orbit = { dayFrac: 0.5 };
    this.env.audio = this.audio;
    this.env.build(engine);

    this.textures = new TextureFactory(seed ^ 0x2f6e2b1);
    this._placeFlora();
    this._placeRocks();

    this.entities = new EntityFactory(seed + 71, this.heightFn, this.physics);
    this.entities.scene = engine.scene;
    this.entities.player = this.player.body;
    this.entities.audio = this.audio;
    this.entities.onEntityAttack = (ent, dmg) => this.player.takeDamage(dmg);
    this.entities.onProjectileHit = (dmg) => this.player.takeDamage(dmg);
    this.entities.onDetonate = (ent) => this._detonate(ent);
    this.entities.spawnAround(this.spawn, 10 + Math.floor(tuningRng.range(0, 22)));
    for (const ent of this.entities.entities) ent.addToScene(engine.scene);

    this.projectiles = [];
    this.time = 0;
    this.kills = 0;
    this.huntTarget = null;
    this.huntKills = 0;
    this.huntGoal = 5 + Math.floor(tuningRng.range(0, 4));
    this.portal = null;
    this.portalActive = false;
    this.won = false;
    this.lootCaches = [];
    this._spawnLoot(tuningRng);
    this._spawnHuntTarget();

    if (this.ui) this.ui.setWorldInfo(this);
  }

  _hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h || 1;
  }

  _rgbToHex(rgb) {
    return ((Math.round(rgb[0] * 255) << 16) | (Math.round(rgb[1] * 255) << 8) | Math.round(rgb[2] * 255)) >>> 0;
  }

  _placeFlora() {
    const rng = new SeededRandom(this.seed ^ 0xabcdef);
    const biomeDef = this.terrain.params.biomeDef;
    const leafBase = this._rgbToHex(biomeDef.veg);
    const leafMats = [
      { c: leafBase, v: 20 },
      { c: (leafBase & 0xfefefe) >> 1, v: 18 },
      { c: (leafBase | 0x0f0f0f) >>> 0, v: 24 }
    ].map(s => new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(s.c, { variation: s.v, granularity: 22, scale: 14 }), roughness: 0.8, side: THREE.DoubleSide }));

    const barkMats = [
      new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(0x4a3a2a, { variation: 22, granularity: 18, scale: 10 }), side: THREE.DoubleSide, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(0x57452f, { variation: 18, granularity: 20, scale: 12 }), side: THREE.DoubleSide, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(0x33261c, { variation: 30, granularity: 16, scale: 9 }), side: THREE.DoubleSide, roughness: 1.0 })
    ];

    const crystalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(rng.range(0.5, 0.85), 0.7, 0.6),
      emissive: new THREE.Color().setHSL(rng.range(0.5, 0.85), 0.9, 0.4),
      emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3
    });
    const cactusMat = new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(0x2e7a32, { variation: 16, granularity: 10, scale: 16 }), roughness: 0.7 });
    const shroomCapMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rng.range(0.0, 0.22), rng.range(0.4, 0.9), rng.range(0.3, 0.5)), emissiveIntensity: 0.1 });
    const shroomStemMat = new THREE.MeshStandardMaterial({ map: this.textures.diffuseFrom(0xd9c9a3, { variation: 24, granularity: 30, scale: 8 }), roughness: 0.9 });
    const coralMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rng.range(0.4, 0.65), rng.range(0.4, 0.8), rng.range(0.4, 0.6)), roughness: 0.8 });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xdfeaff, emissive: 0x9fc4ff, emissiveIntensity: 0.15, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });

    const flora = biomeDef.flora;
    const target = Math.max(6, Math.floor(biomeDef.density * 1000) + Math.floor(rng.range(-30, 30)));
    let placed = 0, tries = 0;
    while (placed < target && tries < target * 6) {
      tries++;
      const x = rng.range(-this.terrain.half + 5, this.terrain.half - 5);
      const z = rng.range(-this.terrain.half + 5, this.terrain.half - 5);
      const h = this.terrain.height(x, z);
      if (h > 8 || h < -2) continue;
      placed++;
      this._spawnFloraItem(flora, x, z, h, rng, leafMats, barkMats, crystalMat, cactusMat, shroomCapMat, shroomStemMat, coralMat, iceMat);
    }
  }

  _spawnFloraItem(flora, x, z, h, rng, leafMats, barkMats, crystalMat, cactusMat, shroomCapMat, shroomStemMat, coralMat, iceMat) {
    const g = new THREE.Group();
    const add = (mesh, px, py, pz) => {
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      g.add(mesh);
    };
    switch (flora) {
      case 'tree': {
        const hgt = rng.range(2.5, 6);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, hgt, 6), rng.pick(barkMats)), 0, hgt / 2, 0);
        const ls = rng.pick(['cone', 'sphere', 'double']);
        if (ls === 'cone') add(new THREE.Mesh(new THREE.ConeGeometry(rng.range(1.3, 2), rng.range(2, 3.6), 8), rng.pick(leafMats)), 0, hgt + rng.range(0.8, 1.5), 0);
        else if (ls === 'sphere') add(new THREE.Mesh(new THREE.SphereGeometry(rng.range(1, 1.7), 8, 8), rng.pick(leafMats)), 0, hgt + rng.range(0.6, 1.2), 0);
        else {
          add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 8), rng.pick(leafMats)), 0, hgt + 0.8, 0);
          add(new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 8), rng.pick(leafMats)), 0, hgt + 2.2, 0);
        }
        break;
      }
      case 'acacia': {
        const hgt = rng.range(3, 5.5);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, hgt, 5), rng.pick(barkMats)), 0, hgt / 2, 0);
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.6, 2.6), 7, 5), rng.pick(leafMats));
        canopy.scale.set(1, 0.35, 1);
        add(canopy, 0, hgt + rng.range(0.5, 1), 0);
        break;
      }
      case 'cactus': {
        const hgt = rng.range(1.5, 4);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, hgt, 7), cactusMat), 0, hgt / 2, 0);
        if (rng.chance(0.5)) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, hgt * 0.6, 6), cactusMat);
          arm.position.set(rng.range(-1, 1), hgt * 0.7, 0);
          arm.rotation.z = rng.chance(0.5) ? 1.2 : -1.2;
          add(arm, arm.position.x, hgt * 0.7, 0);
        }
        break;
      }
      case 'bush':
      case 'brush': {
        const s = rng.range(0.5, 1.3);
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), rng.pick(leafMats));
        bush.position.y = s * 0.6;
        add(bush, 0, s * 0.6, 0);
        break;
      }
      case 'jungle': {
        const hgt = rng.range(5, 9);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, hgt, 6), rng.pick(barkMats)), 0, hgt / 2, 0);
        const top = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(1.7, 2.4), 1), rng.pick(leafMats));
        top.scale.y = 0.5;
        add(top, 0, hgt + 0.7, 0);
        if (rng.chance(0.4)) {
          const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, rng.range(2, 4), 4), leafMats[0]);
          vine.position.set(rng.range(-0.6, 0.6), hgt - 1, 0);
          add(vine, vine.position.x, vine.position.y, 0);
        }
        break;
      }
      case 'swampy': {
        const hgt = rng.range(1.5, 3.4);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, hgt, 5), rng.pick(barkMats)), 0, hgt / 2, 0);
        const blob = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.1, 1.7), 7, 5), rng.pick(leafMats));
        blob.scale.y = 0.7;
        add(blob, 0, hgt + 0.7, 0);
        break;
      }
      case 'shroom': {
        const hgt = rng.range(0.8, 2.2);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, hgt, 6), shroomStemMat), 0, hgt / 2, 0);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.5, 0.9), 8, 6), shroomCapMat);
        cap.scale.y = 0.75;
        add(cap, 0, hgt + 0.25, 0);
        break;
      }
      case 'crystal': {
        const note = rng.range(1.5, 4);
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(note * 0.4, 0), crystalMat);
        crystal.scale.set(0.7, 1.8, 0.7);
        crystal.position.y = note * 0.45;
        g.add(crystal);
        break;
      }
      case 'coral': {
        const hgt = rng.range(1, 2.5);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, hgt, 5), coralMat);
        trunk.position.y = hgt / 2;
        g.add(trunk);
        for (let b = 0; b < rng.intRange(2, 4); b++) {
          const ball = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.35, 0.7), 6, 5), coralMat);
          ball.position.set(rng.range(-0.8, 0.8), hgt - 0.2, rng.range(-0.6, 0.6));
          g.add(ball);
        }
        break;
      }
      case 'ice': {
        const hgt = rng.range(2, 6);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.4, 1), hgt, 5), iceMat);
        spire.position.y = hgt / 2 - 0.5;
        g.add(spire);
        break;
      }
      case 'volcano': {
        const s = rng.range(0.8, 1.6);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), barkMats[0]);
        rock.position.y = s * 0.4;
        g.add(rock);
        break;
      }
      case 'ash': {
        const s = rng.range(0.4, 1.2);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), barkMats[2]);
        rock.position.y = s * 0.5;
        g.add(rock);
        break;
      }
      default: break;
    }
    g.position.set(x, h, z);
    g.rotation.y = rng.range(0, Math.PI * 2);
    this.engine.scene.add(g);
  }

  _placeRocks() {
    const rng = new SeededRandom(this.seed ^ 0x1234fedc);
    const rockMat = new THREE.MeshStandardMaterial({ map: this.textures.blendFrom(0x7d7a72, 0x3a3a34, { blendStrength: 0.5, granularity: 30, scale: 20 }), roughness: 0.95 });
    const n = rng.intRange(20, 150);
    for (let i = 0; i < n; i++) {
      const x = rng.range(-this.terrain.half + 4, this.terrain.half - 4);
      const z = rng.range(-this.terrain.half + 4, this.terrain.half - 4);
      const h = this.terrain.height(x, z);
      const s = rng.range(0.3, 1.8);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s * rng.range(0.5, 1.2), 0), rockMat);
      rock.position.set(x, h + s * 0.3, z);
      rock.rotation.set(rng.range(0, Math.PI), rng.range(0, Math.PI), rng.range(0, Math.PI));
      rock.castShadow = true;
      this.engine.scene.add(rock);
    }
  }

  _detonate(ent) {
    const p = ent.body.position;
    const dp = this.player.body.position.distanceTo(p);
    if (dp < 4.5) {
      this.player.takeDamage(ent.type.dmg * 2);
    }
    for (const other of [...this.entities.entities]) {
      if (other !== ent && other.body.position.distanceTo(p) < 4) {
        other.takeDamage(4);
      }
    }
  }

  shootProjectile() {
    if (this.shotCd > 0) return;
    if (!this.player.hasAmmo()) return;
    const w = this.weapon;
    this.shotCd = w.cd;
    this.player.useAmmo(Math.max(1, Math.floor(w.dmg * 0.7)));
    const origin = this.player.camera.position.clone();
    const forward = this.player.getForwardRay();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    for (let i = 0; i < w.count; i++) {
      const spread = w.count > 1 ? (i / (w.count - 1) - 0.5) * 2 * w.spread : 0;
      const dir = forward.clone()
        .add(right.clone().multiplyScalar(spread + (Math.random() - 0.5) * w.spread * 0.5))
        .add(up.clone().multiplyScalar((Math.random() - 0.5) * w.spread * 0.5))
        .normalize();
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(w.size, 8, 8),
        new THREE.MeshBasicMaterial({ color: w.color })
      );
      mesh.position.copy(origin);
      this.engine.scene.add(mesh);
      this.projectiles.push({
        mesh,
        vel: dir.clone().multiplyScalar(w.speed * (0.85 + Math.random() * 0.3)),
        life: 2.2,
        dmg: w.dmg,
        homing: !!w.homing,
        size: w.size
      });
    }
    if (this.audio) this.audio.playSND();
  }

  update(dt, elapsed) {
    this.time += dt;
    this.shotCd -= dt;
    this.player.update(dt);

    const camPos = this.player.camera.position;
    for (const proj of [...this.projectiles]) {
      if (proj.homing) {
        let best = null, bd = Infinity;
        for (const ent of this.entities.entities) {
          const d = ent.body.position.distanceTo(proj.mesh.position);
          if (d < bd) { bd = d; best = ent; }
        }
        if (best) {
          const desired = best.body.position.clone().sub(proj.mesh.position).normalize();
          proj.vel.lerp(desired.multiplyScalar(proj.vel.length()), 0.06 * dt * 60);
        }
      }
      proj.mesh.position.add(proj.vel.clone().multiplyScalar(dt));
      proj.life -= dt;

      const ground = this.heightFn(proj.mesh.position.x, proj.mesh.position.z);
      if (proj.life <= 0 || proj.mesh.position.y <= ground) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        continue;
      }

      let hitEntity = null;
      for (const ent of this.entities.entities) {
        if (ent.body.position.distanceTo(proj.mesh.position) < ent.body.radius + proj.size + 0.2) {
          hitEntity = ent;
          break;
        }
      }
      if (hitEntity) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        if (hitEntity.takeDamage(proj.dmg)) {
          this.kills++;
          if (this.ui) this.ui.onKill(this.kills);
        }
      }
    }

    this.entities.update(dt, this.player.body, elapsed, this.env.orbit.dayFrac);
    this.env.update(dt, elapsed, camPos);

    if (this.ui) this.ui.updateHud(this.player, this);
  }

  startAudio() {
    if (this.audio) this.audio.ensure().start();
  }

  _spawnLoot(rng) {
    const n = rng.intRange(12, 25);
    for (let i = 0; i < n; i++) {
      const x = rng.range(-this.terrain.half * 0.8, this.terrain.half * 0.8);
      const z = rng.range(-this.terrain.half * 0.8, this.terrain.half * 0.8);
      const h = this.terrain.height(x, z);
      if (h < 0.5) continue;
      const isAmmo = rng.chance(0.6);
      const color = isAmmo ? 0xffdd44 : 0x44ff66;
      const glow = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
      );
      glow.position.set(x, h + 0.8, z);
      this.engine.scene.add(glow);
      this.lootCaches.push({
        mesh: glow,
        x, z, h,
        type: isAmmo ? 'ammo' : 'health',
        value: isAmmo ? rng.intRange(6, 14) : rng.intRange(15, 30),
        collected: false
      });
    }
  }

  _spawnHuntTarget() {
    const rng = new SeededRandom(this.seed ^ 0xdeadbeef);
    const types = this.entities.types.filter(t => t.hp >= 3);
    const type = types.length > 0 ? rng.pick(types) : rng.pick(this.entities.types);
    const x = rng.range(-this.terrain.half * 0.6, this.terrain.half * 0.6);
    const z = rng.range(-this.terrain.half * 0.6, this.terrain.half * 0.6);
    const h = this.terrain.height(x, z);
    const pos = new THREE.Vector3(x, Math.max(h + 2, 4), z);
    const enhanced = { ...type, name: 'HUNT: ' + type.name, hp: type.hp * 2, dmg: type.dmg + 1, aggroRange: 30 };
    const ent = this.entities.spawnOne(enhanced, pos);
    ent._isHuntTarget = true;
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ent.group.add(aura);
    ent._aura = aura;
    this.huntTarget = ent;
  }

  _spawnPortal() {
    const rng = new SeededRandom(this.seed ^ 0x1337cafe);
    let px = 0, pz = 0, ph = 0;
    for (let i = 0; i < 40; i++) {
      px = rng.range(-this.terrain.half * 0.7, this.terrain.half * 0.7);
      pz = rng.range(-this.terrain.half * 0.7, this.terrain.half * 0.7);
      ph = this.terrain.height(px, pz);
      if (ph > 1 && this.player.body.position.distanceTo(new THREE.Vector3(px, ph, pz)) > 20) break;
    }
    const portal = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.3, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    ring.rotation.x = Math.PI / 2;
    portal.add(ring);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(2, 24),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    glow.rotation.x = -Math.PI / 2;
    portal.add(glow);
    const light = new THREE.PointLight(0x88ccff, 3, 30);
    portal.add(light);
    portal.position.set(px, ph + 1.5, pz);
    this.engine.scene.add(portal);
    this.portal = portal;
    this.portalActive = true;
  }

  update(dt, elapsed) {
    this.time += dt;
    this.shotCd -= dt;
    this.player.update(dt);

    const camPos = this.player.camera.position;
    for (const proj of [...this.projectiles]) {
      if (proj.homing) {
        let best = null, bd = Infinity;
        for (const ent of this.entities.entities) {
          const d = ent.body.position.distanceTo(proj.mesh.position);
          if (d < bd) { bd = d; best = ent; }
        }
        if (best) {
          const desired = best.body.position.clone().sub(proj.mesh.position).normalize();
          proj.vel.lerp(desired.multiplyScalar(proj.vel.length()), 0.06 * dt * 60);
        }
      }
      proj.mesh.position.add(proj.vel.clone().multiplyScalar(dt));
      proj.life -= dt;

      const ground = this.heightFn(proj.mesh.position.x, proj.mesh.position.z);
      if (proj.life <= 0 || proj.mesh.position.y <= ground) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        continue;
      }

      let hitEntity = null;
      for (const ent of this.entities.entities) {
        if (ent.body.position.distanceTo(proj.mesh.position) < ent.body.radius + proj.size + 0.2) {
          hitEntity = ent;
          break;
        }
      }
      if (hitEntity) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        if (hitEntity.takeDamage(proj.dmg)) {
          this.kills++;
          if (this.ui) this.ui.onKill(this.kills);
          if (hitEntity._isHuntTarget) {
            this.huntTarget = null;
            this.huntKills++;
            if (this.huntKills >= this.huntGoal && !this.portalActive) {
              this._spawnPortal();
              if (this.ui) this.ui.showMessage('PORTAL OPEN — ESCAPE!');
              if (this.audio) this.audio.playPortalOpen();
            }
          }
        }
      }
    }

    for (const loot of this.lootCaches) {
      if (loot.collected) continue;
      const dx = this.player.body.position.x - loot.x;
      const dz = this.player.body.position.z - loot.z;
      if (dx * dx + dz * dz < 3.5) {
        loot.collected = true;
        this.engine.scene.remove(loot.mesh);
        if (loot.type === 'ammo') this.player.collectAmmo(loot.value);
        else this.player.collectHealth(loot.value);
        if (this.ui) this.ui.showMessage((loot.type === 'ammo' ? '+' : '+') + loot.value + ' ' + loot.type.toUpperCase());
      }
    }

    if (this.portalActive && this.portal) {
      const pp = this.portal.position;
      const dx = this.player.body.position.x - pp.x;
      const dz = this.player.body.position.z - pp.z;
      if (dx * dx + dz * dz < 4) {
        this.won = true;
        if (this.ui) this.ui.showVictory(this.kills, this.time);
      }
    }

    this.entities.update(dt, this.player.body, elapsed, this.env.orbit.dayFrac);
    this.env.update(dt, elapsed, camPos);

    this._dungeonTimer = (this._dungeonTimer || 0) + dt;
    if (this.audio && this.player.hp > 0 && this.player.hp < 30 && this._dungeonTimer > 0.85) {
      this._dungeonTimer = 0;
      this.audio.playHeartbeat();
    }

    if (this.ui) this.ui.updateHud(this.player, this);
  }

  dispose() {
    this.engine.scene.clear();
  }
}