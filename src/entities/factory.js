import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export const BEHAVIORS = [
  'aggressive', 'passive', 'curious', 'skittish', 'wanderer',
  'guard', 'stalker', 'hunter', 'herd', 'phantom', 'galavanter', 'gatherer'
];

export const RELAX_STYLES = [
  'linear', 'bounce', 'floaty', 'hoppy', 'glide', 'jitter', 'wave', 'blink', 'sine', 'skitter'
];

export const SHAPE_POOL = [
  'sphere', 'box', 'cone', 'capsule', 'torch', 'icosa', 'octa', 'tetra',
  'torus', 'crystal', 'ring', 'spike', 'bloom', 'shard', 'lens', 'wheel',
  'star', 'loaf', 'needle', 'pill'
];

const NAME_PREFIX = ['Qui', 'Ve', 'Em', 'Drif', 'Wi', 'Glo', 'Sha', 'Mo', 'Prow', 'Blo', 'Skyl', 'Thra', 'Oss', 'Kel', 'Zor', 'Nyx', 'Vel', 'Grim', 'Pyre', 'Ish', 'Ur', 'Thal', 'Vor', 'Ylm', 'Shek', 'Oblo', 'Mur', 'Fe', 'Brum', 'Hael'];
const NAME_CORE = ['ll', 'm', 'r', 'sh', 'zz', 'mm', 'tt', 'ng', 'rr', 'bb', 'ss', 'th', 'ck', 'ff', 'nn', 'pp', 'kk', 'vv', 'dd', 'gg'];
const NAME_TAIL = ['o', 'ia', 'ix', 'on', 'e', 'a', 'us', 'yx', 'it', 'um', 'ara', 'ada', 'in', 'os', 'eth', 'ora'];

const COLOR_FAMILIES = [
  { name: 'ember', hue: [0.0, 0.05], sat: [0.7, 1], lgt: [0.3, 0.6] },
  { name: 'amber', hue: [0.06, 0.12], sat: [0.6, 0.95], lgt: [0.35, 0.65] },
  { name: 'verdant', hue: [0.2, 0.38], sat: [0.5, 0.9], lgt: [0.25, 0.6] },
  { name: 'teal', hue: [0.42, 0.52], sat: [0.6, 0.95], lgt: [0.3, 0.6] },
  { name: 'azure', hue: [0.55, 0.65], sat: [0.6, 0.95], lgt: [0.25, 0.6] },
  { name: 'violet', hue: [0.68, 0.78], sat: [0.5, 0.9], lgt: [0.3, 0.6] },
  { name: 'magenta', hue: [0.82, 0.92], sat: [0.6, 1], lgt: [0.3, 0.6] },
  { name: 'toxic', hue: [0.13, 0.2], sat: [0.7, 1], lgt: [0.4, 0.7] },
  { name: 'abyss', hue: [0.6, 0.72], sat: [0.3, 0.6], lgt: [0.05, 0.3] },
  { name: 'bone', hue: [0.03, 0.08], sat: [0, 0.2], lgt: [0.6, 0.85] },
  { name: 'frost', hue: [0.5, 0.6], sat: [0.2, 0.5], lgt: [0.7, 0.9] },
  { name: 'price', hue: [0.3, 0.45], sat: [0, 0.3], lgt: [0.2, 0.5] }
];

const ABILITIES = ['none', 'charger', 'spitter', 'burst', 'roarer', 'detonator', 'summoner', 'hastener', 'poisoner', 'leechey'];

export class EntityFactory {
  constructor(seed, terrainHeight, physics) {
    this.seed = seed;
    this.rng = new SeededRandom(seed ^ 0x4d595df4);
    this.noise = new SimplexNoise(this.rng);
    this.terrainHeight = terrainHeight;
    this.physics = physics;
    this.entities = [];
    this.projectiles = [];
    this.scene = null;
    this.player = null;
    this.audio = null;
    this.types = this._rollTypes();
  }

  rollName() {
    return this.rng.pick(NAME_PREFIX) + this.rng.pick(NAME_CORE) + this.rng.pick(NAME_TAIL);
  }

  _rollBehaviorTemplate() {
    const be = this.rng.pick(BEHAVIORS);
    const relax = this.rng.pick(RELAX_STYLES);
    const size = this.rng.range(0.35, 2.2);
    const speed = this.rng.range(1.0, 9.0);
    return { be, relax, size, speed };
  }

  _rollType() {
    const family = this.rng.pick(COLOR_FAMILIES);
    const hue = this.rng.range(family.hue[0], family.hue[1]);
    const color = new THREE.Color().setHSL(hue, this.rng.range(family.sat[0], family.sat[1]), this.rng.range(family.lgt[0], family.lgt[1]));
    const type = {
      id: this.rng.next(),
      name: this.rollName(),
      family: family.name,
      ...this._rollBehaviorTemplate(),
      shape: this.rng.pick(SHAPE_POOL),
      color,
      accent: new THREE.Color().setHSL(this.rng.next(), this.rng.range(0.5, 1), this.rng.range(0.4, 0.8)),
      eyeCount: this.rng.intRange(0, 4),
      horns: this.rng.chance(0.3),
      spikes: this.rng.chance(0.25),
      tail: this.rng.chance(0.35),
      hue: hue,
      aggroRange: this.rng.range(3, 25),
      hp: this.rng.intRange(1, 12),
      dmg: this.rng.intRange(1, 3),
      ability: this.rng.pick(ABILITIES),
      aggression: this.rng.range(0, 1),
      nocturnal: this.rng.chance(0.2)
    };
    return type;
  }

  _rollTypes() {
    const count = this.rng.intRange(3, 8);
    const types = [];
    for (let i = 0; i < count; i++) {
      types.push(this._rollType());
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
      if (this.scene) ent.addToScene(this.scene);
      this.physics.registerBody(ent.body);
      this.entities.push(ent);
    }
  }

  spawnOne(type, pos) {
    const ent = new Entity(type, pos, this);
    ent.buildMesh();
    if (this.scene) ent.addToScene(this.scene);
    this.physics.registerBody(ent.body);
    this.entities.push(ent);
    return ent;
  }

  update(dt, player, time, orbit) {
    const dayFrac = orbit ? orbit.dayFrac : 0.5;
    for (const ent of [...this.entities]) {
      ent.update(dt, player, time, this.terrainHeight, this.physics, dayFrac);
    }
    for (const proj of [...this.projectiles]) {
      proj.life -= dt;
      proj.mesh.position.add(proj.vel.clone().multiplyScalar(dt));
      const ground = this.terrainHeight(proj.mesh.position.x, proj.mesh.position.z);
      if (proj.life <= 0 || proj.mesh.position.y <= ground) {
        if (this.scene) this.scene.remove(proj.mesh);
        const i = this.projectiles.indexOf(proj);
        if (i >= 0) this.projectiles.splice(i, 1);
        continue;
      }
      if (this.player) {
        const d = this.player.position.distanceTo(proj.mesh.position);
        if (d < 1.0) {
          if (this.scene) this.scene.remove(proj.mesh);
          const i = this.projectiles.indexOf(proj);
          if (i >= 0) this.projectiles.splice(i, 1);
          if (this.onProjectileHit) this.onProjectileHit(proj.dmg, proj.mesh.position);
        }
      }
    }
  }

  fireAt(shooter, target, dmg) {
    if (!this.scene) return;
    const origin = shooter.body.position.clone();
    const dir = target.clone().sub(origin).normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      new THREE.MeshBasicMaterial({ color: shooter.type.accent })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, vel: dir.multiplyScalar(15 + this.rng.range(0, 6)), life: 1.5, dmg });
  }

  spawnMinion(parent, count = 1) {
    const mk = { ...parent.type };
    mk.name = 'Mini ' + parent.type.name;
    mk.size = parent.type.size * 0.5;
    mk.hp = Math.max(1, Math.floor(parent.type.hp * 0.5));
    mk.dmg = Math.max(1, parent.type.dmg - 1);
    mk.aggroRange = parent.type.aggroRange * 0.7;
    const typeLike = { ...mk, be: 'aggressive', ability: 'none', relax: 'skitter' };
    for (let i = 0; i < count; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const p = parent.body.position.clone().add(new THREE.Vector3(Math.cos(a) * 2, 0.5, Math.sin(a) * 2));
      p.y = this.terrainHeight(p.x, p.z) + typeLike.size;
      this.spawnOne(typeLike, p);
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
    this.attackTimer = 0;
    this.state = 'idle';
    this.targetDir = new THREE.Vector3();
    this.wanderHome = pos.clone();
    this.age = 0;
    this.group = null;
  }

  buildMesh() {
    const type = this.type;
    this.group = new THREE.Group();
    const rngC = this.factory.rng;

    const s = type.size;
    let geo;
    switch (type.shape) {
      case 'sphere': geo = new THREE.SphereGeometry(s * 0.5, 12, 10); break;
      case 'box': geo = new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8); break;
      case 'cone': geo = new THREE.ConeGeometry(s * 0.6, s, 8); break;
      case 'capsule': geo = new THREE.CapsuleGeometry(s * 0.35, s * 0.5, 6, 8); break;
      case 'torch': geo = new THREE.BoxGeometry(s, s * 0.3, s * 0.3); break;
      case 'icosa': geo = new THREE.IcosahedronGeometry(s * 0.6, 0); break;
      case 'octa': geo = new THREE.OctahedronGeometry(s * 0.6, 0); break;
      case 'tetra': geo = new THREE.TetrahedronGeometry(s * 0.7, 0); break;
      case 'torus': geo = new THREE.TorusGeometry(s * 0.35, s * 0.18, 8, 12); break;
      case 'crystal': { geo = new THREE.OctahedronGeometry(s * 0.5, 0); geo.scale(0.7, 2, 0.7); break; }
      case 'ring': geo = new THREE.TorusGeometry(s * 0.5, s * 0.08, 8, 20); break;
      case 'spike': geo = new THREE.ConeGeometry(s * 0.2, s, 6); break;
      case 'bloom': { geo = new THREE.IcosahedronGeometry(s * 0.6, 0); geo.scale(1, 0.35, 1); break; }
      case 'shard': { geo = new THREE.ConeGeometry(s * 0.35, s, 4); break; }
      case 'lens': { geo = new THREE.CylinderGeometry(s * 0.45, s * 0.45, s * 0.18, 16); break; }
      case 'wheel': { geo = new THREE.TorusGeometry(s * 0.4, s * 0.14, 8, 14); break; }
      case 'star': { geo = new THREE.OctahedronGeometry(s * 0.5, 0); geo.scale(0.5, 1.6, 0.5); break; }
      case 'loaf': { geo = new THREE.SphereGeometry(s * 0.6, 10, 8); geo.scale(1, 0.6, 1.4); break; }
      case 'needle': { geo = new THREE.CylinderGeometry(0.05 * s, 0.12 * s, s * 1.4, 6); break; }
      case 'pill': { geo = new THREE.CapsuleGeometry(s * 0.22, s * 0.6, 6, 8); break; }
      default: geo = new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: type.color,
      roughness: rngC.range(0.25, 0.95),
      metalness: rngC.range(0, 0.55),
      emissive: type.accent,
      emissiveIntensity: rngC.range(0.05, 0.75)
    });
    this.mainMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mainMesh);

    for (let i = 0; i < type.eyeCount; i++) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: type.accent })
      );
      eye.position.set(rngC.range(-s * 0.3, s * 0.3), s * (rngC.range(0.1, 0.35)), s * 0.45);
      this.group.add(eye);
    }

    if (type.horns) {
      for (let hx = -1; hx <= 1; hx += 2) {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(s * 0.08, s * 0.45, 5),
          new THREE.MeshStandardMaterial({ color: type.accent, emissive: type.accent, emissiveIntensity: 0.3 })
        );
        horn.position.set(hx * s * 0.35, s * 0.55, 0);
        horn.rotation.z = -hx * 0.5;
        this.group.add(horn);
      }
    }
    if (type.spikes) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(s * 0.06, s * 0.4, 5),
        new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.6 })
      );
      spike.position.y = s * 0.6;
      this.group.add(spike);
    }
    if (type.tail) {
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * s, 0.1 * s, s * 0.7, 5),
        new THREE.MeshStandardMaterial({ color: type.accent })
      );
      tail.position.set(0, s * 0.1, -s * 0.5);
      tail.rotation.x = 0.9;
      this.group.add(tail);
    }
  }

  addToScene(scene) {
    this.scene = scene;
    scene.add(this.group);
  }

  removeFromScene() {
    if (this.scene) this.scene.remove(this.group);
  }

  update(dt, player, time, terrainHeight, physics, dayFrac) {
    this.age += dt;
    const type = this.type;
    const rng = this.factory.rng;
    this.attackTimer -= dt;

    this.thinkTimer -= dt;
    const distToPlayer = player ? this.body.position.distanceTo(player.position) : Infinity;

    const night = dayFrac < 0.25 || dayFrac > 0.75;
    const active = !type.nocturnal || night;

    if (this.thinkTimer <= 0) {
      this.thinkTimer = rng.range(0.4, 1.6);
      this._decide(distToPlayer, rng, active);
    }

    let targetSpeed = 0;
    this.targetDir.set(0, 0, 0);

    const attackDist = this.body.radius + 2.2;

    if (type.be === 'aggressive') {
      if (distToPlayer < type.aggroRange && active) {
        if (distToPlayer < attackDist) {
          this.state = 'attack';
          targetSpeed = 0;
          this._attack(player);
        } else {
          targetSpeed = type.speed;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'chase';
          this._abilityChase(player);
        }
      } else {
        this.state = 'idle';
      }
    } else if (type.be === 'skittish') {
      if (distToPlayer < type.aggroRange && active) {
        targetSpeed = type.speed * 1.35;
        this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
        this.state = 'flee';
        this._abilityFlee(player);
      }
    } else if (type.be === 'curious') {
      if (distToPlayer < type.aggroRange * 1.5) {
        targetSpeed = type.speed * 0.6;
        this.targetDir.copy(player.position).sub(this.body.position).normalize();
        this.state = 'curious';
      }
    } else if (type.be === 'guard') {
      const homeDist = this.body.position.distanceTo(this.wanderHome);
      if (distToPlayer < type.aggroRange && active) {
        targetSpeed = type.speed;
        this.targetDir.copy(player.position).sub(this.body.position).normalize();
        this.state = 'chase';
      } else if (homeDist > 6 + type.size) {
        targetSpeed = type.speed * 0.7;
        this.targetDir.copy(this.wanderHome).sub(this.body.position).normalize();
        this.state = 'return';
      }
    } else if (type.be === 'stalker') {
      if (distToPlayer < type.aggroRange * 2 && active && player) {
        targetSpeed = type.speed * 0.75;
        this.targetDir.copy(player.position).sub(this.body.position).normalize();
        this.state = 'stalk';
        if (distToPlayer < 10) {
          this.targetDir.multiplyScalar(-1);
        }
      }
    } else if (type.be === 'hunter') {
      if (distToPlayer < type.aggroRange * 2.2 && active) {
        if (distToPlayer < 6) {
          targetSpeed = 0;
          this.state = 'crouch';
        } else {
          targetSpeed = type.speed;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'stalkb';
        }
      }
    } else if (type.be === 'herd') {
      let nearest = null, nd = Infinity;
      for (const other of this.factory.entities) {
        if (other !== this && other.type.be === 'herd') {
          const d = other.body.position.distanceTo(this.body.position);
          if (d < nd) { nd = d; nearest = other; }
        }
      }
      if (nd > 3) {
        targetSpeed = (type.be === 'skittish' ? 1 : 1) * type.speed * 0.5;
        if (nearest) {
          this.targetDir.copy(nearest.body.position).sub(this.body.position).normalize();
          this.state = 'herding';
        }
      }
      if (distToPlayer < type.aggroRange && active) {
        targetSpeed = type.speed * 1.3;
        this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
        this.state = 'fleeing-herd';
      }
    } else if (type.be === 'galavanter') {
      if (this.state !== 'wander') this.state = 'wander';
      targetSpeed = type.speed * 0.85;
    } else if (type.be === 'gatherer') {
      if (this.thinkTimer > 0.8) {
        this.state = 'gather';
        const angle = time * 0.4 + this.age;
        this.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
        targetSpeed = type.speed * 0.4;
      }
    } else if (type.be === 'phantom') {
      if (distToPlayer < type.aggroRange * 1.6 && active) {
        if (distToPlayer > 2) {
          targetSpeed = type.speed;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'swoop';
        } else {
          targetSpeed = 0;
          this.state = 'attack';
          this._attack(player);
        }
      }
    } else {
      switch (this.state) {
        case 'wander': targetSpeed = type.speed * 0.45; break;
        case 'passive': targetSpeed = 0; break;
        default: targetSpeed = 0;
      }
    }

    if (type.be === 'passive' && distToPlayer < 4 && rng.chance(0.3)) {
      targetSpeed = type.speed * 0.55;
      this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
      this.state = 'avoid';
    }

    if (this.state === 'wander' && targetSpeed === 0 && rng.chance(0.5)) {
      targetSpeed = type.speed * 0.4;
    }

    this._applyMovement(dt, time, terrainHeight, targetSpeed, player);

    if (this.body.onGround || type.relax === 'floaty' || type.relax === 'glide') {
      const forward3 = new THREE.Vector3(this.targetDir.x, 0, this.targetDir.z);
      this.group.rotation.y = Math.atan2(forward3.x || 0.0001, forward3.z);

      const bobAmp = type.relax === 'sine' ? 0.5 : 0.08;
      this.group.position.y += Math.sin(time * 3.2 + this.age * 2.4) * bobAmp;
    }

    if (this.age % 2 < 0.05 && this.factory.audio && rng.chance(0.3)) {
      this.factory.audio.playSND();
    }
  }

  _applyMovement(dt, time, terrainHeight, targetSpeed, player) {
    const type = this.type;
    const rng = this.factory.rng;

    if (type.relax === 'floaty') {
      this.body.velocity.set(0, 0, 0);
      this.body.position.x += this.targetDir.x * targetSpeed * 0.4 * dt;
      this.body.position.z += this.targetDir.z * targetSpeed * 0.4 * dt;
      this.body.position.y += Math.sin(time * 1.8 + this.age) * dt * 0.8;
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 0.5);
    } else if (type.relax === 'glide') {
      this.body.velocity.set(0, 0, 0);
      this.body.position.x += this.targetDir.x * targetSpeed * 0.45 * dt;
      this.body.position.z += this.targetDir.z * targetSpeed * 0.45 * dt;
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 1.1);
      this.body.position.y += Math.sin(time + this.age) * dt * 0.4;
    } else if (type.relax === 'blink') {
      this.body.velocity.set(0, 0, 0);
      if (rng.chance(0.6 * dt)) {
        this.body.position.x += this.targetDir.x * targetSpeed * 4;
        this.body.position.z += this.targetDir.z * targetSpeed * 4;
      }
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 0.6);
    } else if (type.relax === 'wave') {
      this.body.velocity.x = this.targetDir.x * targetSpeed;
      this.body.velocity.z = this.targetDir.z * targetSpeed;
      const sw = Math.sin(time * 2 + this.age) * this.targetDir.z ? 1 : 0;
      this.body.velocity.z += Math.sin(time * 2 + this.age) * 1.2;
    } else if (type.relax === 'jitter' || type.relax === 'skitter') {
      this.body.velocity.x = this.targetDir.x * targetSpeed + Math.sin(time * 18 + this.age * 9) * 1.5 * type.size;
      this.body.velocity.z = this.targetDir.z * targetSpeed + Math.cos(time * 14 + this.age * 7) * 1.5 * type.size;
    } else {
      this.body.velocity.x = this.targetDir.x * targetSpeed;
      this.body.velocity.z = this.targetDir.z * targetSpeed;
    }

    let extraV = 0;
    if ((type.relax === 'hoppy' || type.relax === 'skitter') && this.body.onGround) {
      if (rng.chance(Math.min(1, 0.1 * dt * 60 * (type.size < 1 ? 1.6 : 1)))) {
        extraV = rng.range(2.5, 6);
      }
    }
    if (type.relax === 'linear' && this.state === 'chase' && type.ability === 'charger' && this.body.onGround && rng.chance(0.15 * dt * 60)) {
      extraV = 3;
    }
    this.body.velocity.y = extraV;

    if (this.body.onGround && type.relax === 'bounce') {
      if (this.body.position.y <= terrainHeight(this.body.position.x, this.body.position.z) + 0.2) {
        this.body.velocity.y = rng.range(2, 4);
      }
    }
  }

  _attack(player) {
    const type = this.type;
    const rng = this.factory.rng;
    if (this.attackTimer > 0 || !player) return;
    this.attackTimer = 1.0;
    if (this.factory.onEntityAttack && this.factory.audio) this.factory.audio.playAmbientHit();
    if (this.factory.onEntityAttack) this.factory.onEntityAttack(this, type.dmg);

    if (type.ability === 'spitter' || (type.ability === 'burst' && rng.chance(0.4))) {
      this.factory.fireAt(this, player.position, type.dmg);
    } else if (type.ability === 'charger') {
      this.body.velocity.x = this.targetDir.x * type.speed * 3;
      this.body.velocity.z = this.targetDir.z * type.speed * 3;
      this.body.velocity.y = 2;
    } else if (type.ability === 'roarer' && rng.chance(0.5)) {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 8) {
          other.state = 'flee';
          other.targetDir.copy(other.body.position).sub(this.body.position).normalize();
        }
      }
    } else if (type.ability === 'summoner' && rng.chance(0.3)) {
      this.factory.spawnMinion(this, 1);
    } else if (type.ability === 'hastener') {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 8) {
          other.type.speed *= 1.4;
        }
      }
    } else if (type.ability === 'poisoner' && rng.chance(0.6)) {
      this.factory.fireAt(this, player.position, 2);
    } else if (type.ability === 'leechey') {
      this.hp = Math.min(type.hp, this.hp + 1);
    }
  }

  _abilityChase(player) {
    const type = this.type;
    const rng = this.factory.rng;
    if (type.ability === 'roarer' && rng.chance(0.02)) {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 8) {
          other.state = 'flee';
        }
      }
    }
  }

  _abilityFlee(player) {
    const type = this.type;
    const rng = this.factory.rng;
    if (type.ability === 'summoner' && rng.chance(0.15 * player ? 1 : 0)) {
      this.factory.spawnMinion(this, 1);
    }
  }

  _decide(dist, rng, active) {
    const type = this.type;
    if (!active && type.be !== 'passive') { this.state = 'idle'; return; }
    if (dist < type.aggroRange) {
      if (type.be === 'aggressive') this.state = 'chase';
      else if (type.be === 'skittish') this.state = 'flee';
      else if (type.be === 'curious') this.state = 'curious';
      else if (type.be === 'hunter' || type.be === 'stalker' || type.be === 'phantom')
        this.state = dist < 6 ? 'crouch' : 'chase';
      else if (type.be === 'herd' || type.be === 'passive') this.state = 'wander';
      else this.state = 'idle';
    } else {
      if (rng.chance(0.35)) this.state = 'wander';
      else this.state = 'idle';
    }
    if (type.be !== 'guard') {
      const a = rng.range(0, Math.PI * 2);
      this.targetDir.set(Math.cos(a), 0, Math.sin(a));
    }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      const type = this.type;
      if (type.ability === 'detonator' && this.type.size > 0.7) {
        if (this.factory.onDetonate) this.factory.onDetonate(this);
      }
      this.factory.removeEntity(this);
      return true;
    }
    return false;
  }
}