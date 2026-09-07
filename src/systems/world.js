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

const WEAPONS = [
  { name: 'Bolt', count: 1, spread: 0.0, speed: 30, dmg: 1, cd: 0.35, size: 0.12, color: 0xffdd66 },
  { name: 'Scatter', count: 3, spread: 0.09, speed: 24, dmg: 1, cd: 0.5, size: 0.09, color: 0xffcc55 },
  { name: 'Burst-V', count: 3, spread: 0.035, speed: 32, dmg: 1, cd: 0.28, size: 0.10, color: 0x88ffcc },
  { name: 'Cannon', count: 1, spread: 0.0, speed: 16, dmg: 3, cd: 1.2, size: 0.30, color: 0xff5533 },
  { name: 'Rail', count: 1, spread: 0.0, speed: 60, dmg: 2, cd: 0.9, size: 0.05, color: 0xccddff },
  { name: 'Shotgun', count: 5, spread: 0.16, speed: 22, dmg: 1, cd: 0.9, size: 0.08, color: 0xffaacc },
  { name: 'Homing', count: 1, spread: 0.0, speed: 18, dmg: 2, cd: 0.8, size: 0.10, color: 0xcc88ff, homing: true },
  { name: 'Needle', count: 1, spread: 0.0, speed: 44, dmg: 1, cd: 0.18, size: 0.05, color: 0xffe0a0 },
  { name: 'Fork', count: 2, spread: 0.12, speed: 26, dmg: 1, cd: 0.42, size: 0.09, color: 0x99ddff },
  { name: 'Thumper', count: 6, spread: 0.2, speed: 18, dmg: 1, cd: 1.1, size: 0.07, color: 0xff9955 }
];

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
    const biome = this.terrain.params.biome;
    const biomeDef = this._getBiomeDef(biome);
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

  _getBiomeDef(biome) {
    const defs = {
      desert: { veg: [0.36, 0.5, 0.18], density: 0.06, flora: 'cactus' },
      steppe: { veg: [0.42, 0.58, 0.28], density: 0.1, flora: 'bush' },
      plains: { veg: [0.2, 0.42, 0.2], density: 0.16, flora: 'tree' },
      temperate: { veg: [0.16, 0.34, 0.16], density: 0.3, flora: 'tree' },
      tundra: { veg: [0.3, 0.42, 0.3], density: 0.07, flora: 'bush' },
      savanna: { veg: [0.34, 0.46, 0.2], density: 0.14, flora: 'acacia' },
      jungle: { veg: [0.12, 0.26, 0.12], density: 0.42, flora: 'jungle' },
      swamp: { veg: [0.24, 0.36, 0.2], density: 0.14, flora: 'swampy' },
      badlands: { veg: [0.5, 0.38, 0.3], density: 0.05, flora: 'bush' },
      glacier: { veg: [0.74, 0.84, 0.9], density: 0.02, flora: 'ice' },
      volcanic: { veg: [0.2, 0.16, 0.14], density: 0.03, flora: 'volcano' },
      crystalline: { veg: [0.34, 0.28, 0.46], density: 0.24, flora: 'crystal' },
      mushroom: { veg: [0.44, 0.3, 0.44], density: 0.24, flora: 'shroom' },
      coral: { veg: [0.4, 0.52, 0.66], density: 0.2, flora: 'coral' },
      ashfield: { veg: [0.4, 0.38, 0.38], density: 0.1, flora: 'ash' },
      neon: { veg: [0.16, 0.3, 0.3], density: 0.22, flora: 'crystal' }
    };
    return defs[biome] || defs.plains;
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
      case 'bush': {
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
    const w = this.weapon;
    this.shotCd = w.cd;
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

    this.entities.update(dt, this.player.body, elapsed, this.env.orbit);
    this.env.update(dt, elapsed, camPos);

    if (this.ui) this.ui.updateHud(this.player, this);
  }

  startAudio() {
    if (this.audio) this.audio.ensure().start();
  }

  dispose() {
    this.engine.scene.clear();
  }
}