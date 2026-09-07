import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export class EntityFactory {
  constructor(seed, terrainHeight, physics) {
    this.seed = seed;
    this.rng = new SeededRandom(seed ^ 0x4d595df4);
    this.noise = new SimplexNoise(this.rng);
    this.terrainHeight = terrainHeight;
    this.physics = physics;
    this.entities = [];
    this.types = this._rollTypes();
  }

  _rollBehaviorTemplate() {
    const be = this.rng.pick(['aggressive', 'passive', 'curious', 'skittish', 'wanderer']);
    const relax = this.rng.pick(['linear', 'bounce', 'floaty', 'hoppy']);
    const size = this.rng.range(0.4, 1.6);
    const speed = this.rng.range(1.5, 6);
    return { be, relax, size, speed };
  }

  _rollTypes() {
    const count = this.rng.intRange(3, 5);
    const types = [];
    for (let i = 0; i < count; i++) {
      types.push({
        id: i,
        name: this.rng.pick(['Quill', 'Vine', 'Ember', 'Drifter', 'Wisp', 'Gloom', 'Shard', 'Mote', 'Prowler', 'Bloom']),
        ...this._rollBehaviorTemplate(),
        color: new THREE.Color().setHSL(this.rng.next(), this.rng.range(0.4, 0.9), this.rng.range(0.3, 0.7)),
        hue: this.rng.next(),
        aggroRange: this.rng.range(5, 14),
        hp: this.rng.intRange(2, 6)
      });
    }
    return types;
  }

  spawnAround(center, count) {
    for (let i = 0; i < count; i++) {
      const type = this.rng.pick(this.types);
      const a = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(5, 30);
      const x = center.x + Math.cos(a) * d;
      const z = center.z + Math.sin(a) * d;
      const y = this.terrainHeight(x, z);
      const ent = new Entity(type, new THREE.Vector3(x, y + type.size, z), this);
      ent.buildMesh();
      this.physics.registerBody(ent.body);
      this.entities.push(ent);
    }
  }

  update(dt, player, time) {
    for (const ent of [...this.entities]) {
      ent.update(dt, player, time, this.terrainHeight, this.physics);
    }
  }

  removeEntity(ent) {
    this.physics.removeBody(ent.body);
    const i = this.entities.indexOf(ent);
    if (i >= 0) this.entities.splice(i, 1);
    ent.removeFromScene();
  }
}

class Entity {
  constructor(type, pos, factory) {
    this.type = type;
    this.factory = factory;
    this.position = pos;
    this.body = {
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      radius: type.size * 0.5,
      height: type.size,
      mass: type.size,
      kinematic: false,
      onGround: false,
      friction: 0,
      contactOffset: 0.05
    };
    this.hp = type.hp;
    this.thinkTimer = 0;
    this.state = 'idle';
    this.targetDir = new THREE.Vector3();
    this.age = 0;
    this.mesh = null;
    this.group = null;
  }

  buildMesh() {
    const type = this.type;
    this.group = new THREE.Group();
    const rngC = this.factory.rng;

    const shape = rngC.pick(['sphere', 'box', 'cone', 'capsule', 'torch']);
    let geo;
    const s = type.size;
    switch (shape) {
      case 'sphere': geo = new THREE.SphereGeometry(s * 0.5, 12, 10); break;
      case 'box': geo = new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8); break;
      case 'cone': geo = new THREE.ConeGeometry(s * 0.6, s, 8); break;
      case 'capsule': geo = new THREE.CapsuleGeometry(s * 0.35, s * 0.5, 6, 8); break;
      default: geo = new THREE.BoxGeometry(s, s * 0.3, s * 0.3);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: type.color,
      roughness: rngC.range(0.3, 0.9),
      metalness: rngC.range(0, 0.4),
      emissive: new THREE.Color().setHSL(type.hue, 0.8, 0.3),
      emissiveIntensity: rngC.range(0.1, 0.6)
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.group.add(mesh);

    const eyeCount = rngC.intRange(0, 3);
    for (let i = 0; i < eyeCount; i++) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(type.hue, 0.9, 0.5) })
      );
      eye.position.set(rngC.range(-s * 0.3, s * 0.3), s * (rngC.range(0.1, 0.35)), s * 0.45);
      this.group.add(eye);
    }

    this.mesh = mesh;
    this.eyeMat = mat;
  }

  addToScene(scene) {
    this.scene = scene;
    scene.add(this.group);
  }

  removeFromScene() {
    if (this.scene) this.scene.remove(this.group);
  }

  update(dt, player, time, terrainHeight, physics) {
    this.age += dt;
    const type = this.type;
    const rng = this.factory.rng;

    this.thinkTimer -= dt;
    const distToPlayer = player ? this.body.position.distanceTo(player.position) : Infinity;

    if (this.thinkTimer <= 0) {
      this.thinkTimer = rng.range(0.5, 1.5);
      this._decide(distToPlayer, rng);
    }

    let targetSpeed = 0;
    this.targetDir.set(0, 0, 0);

    if (type.be === 'aggressive' && distToPlayer < type.aggroRange + 6) {
      if (distToPlayer < 2.5) {
        targetSpeed = 0;
        this.state = 'attack';
        if (rng.chance(0.02) && this.factory.audio) this.factory.audio.playAmbientHit();
      } else {
        targetSpeed = type.speed;
        this.targetDir.copy(player.position).sub(this.body.position).normalize();
        this.state = 'chase';
      }
    } else if (type.be === 'skittish' && distToPlayer < type.aggroRange) {
      targetSpeed = type.speed * 1.3;
      this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
      this.state = 'flee';
    } else {
      switch (this.state) {
        case 'wander': targetSpeed = type.speed * 0.4; break;
        case 'curious':
          if (distToPlayer < type.aggroRange * 1.5) {
            targetSpeed = type.speed * 0.6;
            this.targetDir.copy(player.position).sub(this.body.position).normalize();
          }
          break;
        default: targetSpeed = 0;
      }
    }

    const bob = Math.sin(time * 4 + this.age * 3) * 0.05;
    this.group.position.copy(this.body.position).y += bob;

    if (type.relax === 'floaty') {
      this.body.position.y += Math.sin(time * 2 + this.age) * dt * 0.5;
      this.body.velocity.set(0, 0, 0);
      this.body.position.x += this.targetDir.x * targetSpeed * 0.3 * dt;
      this.body.position.z += this.targetDir.z * targetSpeed * 0.3 * dt;
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 0.5);
    } else {
      this.body.velocity.x = this.targetDir.x * targetSpeed;
      this.body.velocity.z = this.targetDir.z * targetSpeed;
      let extraV = 0;
      if (type.relax === 'hoppy' && this.body.onGround && rng.chance(0.1 * dt * 60)) {
        extraV = rng.range(3, 6);
      }
      this.body.velocity.y = extraV;
    }

    if (this.body.onGround && type.relax === 'bounce') {
      if (this.body.position.y <= terrainHeight(this.body.position.x, this.body.position.z) + 0.2) {
        this.body.velocity.y = rng.range(2, 4);
      }
    }

    this.group.rotation.y = Math.atan2(this.targetDir.x, this.targetDir.z) + Math.sin(time * 1.5 + this.age) * 0.2;

    if (this.age % 2 < 0.05 && this.factory.audio && rng.chance(0.3)) {
      this.factory.audio.playSND();
    }
  }

  _decide(dist, rng) {
    const type = this.type;
    if (dist < type.aggroRange) {
      if (type.be === 'aggressive') this.state = 'chase';
      else if (type.be === 'skittish') this.state = 'flee';
      else if (type.be === 'curious') this.state = 'curious';
      else if (type.be === 'passive' && rng.chance(0.2)) this.state = 'wander';
      else this.state = 'idle';
    } else {
      if (rng.chance(0.35)) this.state = 'wander';
      else this.state = 'idle';
    }
    const a = rng.range(0, Math.PI * 2);
    this.targetDir.set(Math.cos(a), 0, Math.sin(a));
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.factory.removeEntity(this);
      return true;
    }
    return false;
  }
}
