import * as THREE from 'three';
import { SeededRandom } from '../core/seed.js';
import { TerrainGenerator } from '../generators/terrain.js';
import { TextureFactory } from '../generators/textures.js';
import { AudioEngine } from '../generators/audio.js';
import { EntityFactory } from '../entities/factory.js';
import { PlayerController } from './player.js';
import { PhysicsEngine, RigidBody } from './physics.js';
import { WorldEnvironment } from './environment.js';

export class World {
  constructor(engine, seedString, ui) {
    this.engine = engine;
    this.ui = ui;
    this.seedString = seedString;
    const seed = this._hash(seedString);
    this.seed = seed;
    this.audio = new AudioEngine(seed);

    this.terrain = new TerrainGenerator(seed, 240);
    const meshMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    this.terrainMesh = new THREE.Mesh(this.terrain.buildGeometry(), meshMat);
    this.terrainMesh.receiveShadow = true;
    engine.scene.add(this.terrainMesh);

    this.heightFn = (x, z) => this.terrain.height(x, z);
    this.physics = new PhysicsEngine(this.heightFn, this.terrain.size);

    this.spawn = this.terrain.spawnPoint();
    this.player = new PlayerController(engine, this.physics, this.spawn.clone(), this.audio);

    this.env = new WorldEnvironment(engine, this.terrain.height, this.terrain.size, this._hash(seedString + '_env'));
    this.env.build(engine);

    this.entities = new EntityFactory(seed + 71, this.heightFn, this.physics);
    this.entities.audio = this.audio;
    this.entities.spawnAround(this.spawn, 14);
    for (const ent of this.entities.entities) ent.addToScene(engine.scene);

    this.textures = new TextureFactory(seed ^ 0x2f6e2b1);
    this._placeTrees();

    this.projectiles = [];
    this.time = 0;
    this.kills = 0;
    this.lastHitFlash = 0;

    if (this.ui) this.ui.setWorldInfo(this);
  }

  _hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h || 1;
  }

  _placeTrees() {
    const rng = new SeededRandom(this.seed ^ 0xabcdef);
    const count = 180;
    const barkSpecs = [
      { c: 0x4a3a2a, v: 26 },
      { c: 0x5a4a2a, v: 20 },
      { c: 0x3a3020, v: 30 }
    ];
    const leafSpecs = [
      { c: 0x2d6b2d, v: 22 },
      { c: 0x3a7a3a, v: 18 },
      { c: 0x1e5e1e, v: 26 }
    ];
    const barkMats = barkSpecs.map(s => new THREE.MeshStandardMaterial({
      map: this.textures.diffuseFrom(s.c, { variation: s.v, granularity: 24, scale: 10 }),
      side: THREE.DoubleSide,
      roughness: 0.9
    }));
    const leafMats = leafSpecs.map(s => new THREE.MeshStandardMaterial({
      map: this.textures.diffuseFrom(s.c, { variation: s.v, granularity: 30, scale: 14 }),
      roughness: 0.8
    }));
    for (let i = 0; i < count; i++) {
      const x = rng.range(-this.terrain.half + 4, this.terrain.half - 4);
      const z = rng.range(-this.terrain.half + 4, this.terrain.half - 4);
      const h = this.terrain.height(x, z);
      if (h > 9) continue;
      if (h < -2) continue;

      const tree = new THREE.Group();
      const hgt = rng.range(2, 5);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, hgt, 6),
        rng.pick(barkMats)
      );
      trunk.position.y = hgt / 2;
      tree.add(trunk);

      const leafShape = rng.pick(['cone', 'sphere', 'double']);
      let leaves;
      if (leafShape === 'cone') {
        leaves = new THREE.Mesh(new THREE.ConeGeometry(rng.range(1.2, 1.8), rng.range(2, 3.5), 8), rng.pick(leafMats));
        leaves.position.y = hgt + rng.range(0.8, 1.4);
      } else if (leafShape === 'sphere') {
        leaves = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1, 1.6), 8, 8), rng.pick(leafMats));
        leaves.position.y = hgt + rng.range(0.6, 1.2);
      } else {
        const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 8), rng.pick(leafMats));
        l1.position.y = hgt + 0.8;
        const l2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.6, 8), rng.pick(leafMats));
        l2.position.y = hgt + 2.2;
        tree.add(l1, l2);
      }
      if (leaves) tree.add(leaves);

      tree.position.set(x, h, z);
      tree.rotation.y = rng.range(0, Math.PI * 2);
      for (const m of tree.children) {
        m.castShadow = true;
      }

      const body = new RigidBody(new THREE.Vector3(x, h + 1, z), 0.9, 1, 0);
      body.kinematic = true;
      body.radius = 0.8;
      this.physics.registerBody(body);
      // store tree body on mesh for collision feedback
      tree.userData.body = body;

      this.engine.scene.add(tree);
    }
  }

  shootProjectile() {
    const origin = this.player.camera.position.clone();
    const dir = this.player.getForwardRay();
    const speed = 30;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd66 })
    );
    mesh.position.copy(origin);
    this.engine.scene.add(mesh);
    this.projectiles.push({ mesh, vel: dir.clone().multiplyScalar(speed), life: 2 });
    if (this.audio) this.audio.playSND();
  }

  update(dt, elapsed) {
    this.time += dt;
    this.player.update(dt);

    for (const proj of [...this.projectiles]) {
      proj.mesh.position.add(proj.vel.clone().multiplyScalar(dt));
      proj.life -= dt;

      const ground = this.heightFn(proj.mesh.position.x, proj.mesh.position.z);
      if (proj.mesh.position.y <= ground) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        continue;
      }

      let hitEntity = null;
      for (const ent of this.entities.entities) {
        if (ent.body.position.distanceTo(proj.mesh.position) < ent.body.radius + 0.3) {
          hitEntity = ent;
          break;
        }
      }
      if (hitEntity) {
        this.engine.scene.remove(proj.mesh);
        this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        if (hitEntity.takeDamage(1)) {
          this.kills++;
          if (this.ui) this.ui.onKill(this.kills);
        }
      }
    }

    this.entities.update(dt, this.player.body, elapsed);
    if (this.env) this.env.update(dt, elapsed, this.player.camera.position);

    if (this.ui) this.ui.updateHud(this.player, this);
  }

  startAudio() {
    if (this.audio) {
      this.audio.ensure().start();
    }
  }

  dispose() {
    this.engine.scene.clear();
  }
}
