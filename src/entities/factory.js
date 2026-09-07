import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export const NATURES = [
  'aggressive', 'passive', 'curious', 'skittish', 'wanderer',
  'guard', 'stalker', 'hunter', 'herd', 'galavanter', 'gatherer', 'phantom'
];

export const TEMPERAMENTS = [
  { tag: '', bold: 1, fear: 1, chill: 1 },
  { tag: 'cautious-', bold: 0.7, fear: 1.4, chill: 0.75 },
  { tag: 'fierce-', bold: 1.35, fear: 0.55, chill: 1.2 }
];

export function buildBehaviors() {
  const list = [];
  for (const t of TEMPERAMENTS) {
    for (const n of NATURES) {
      list.push(t.tag + n);
    }
  }
  return list;
}

export const BEHAVIORS = buildBehaviors();

export const RELAX_STYLES = [
  'linear', 'bounce', 'floaty', 'hoppy', 'glide', 'jitter', 'wave', 'blink', 'sine', 'skitter'
];

export const GAITS = [
  { tag: '', hop: 1, speed: 1, shake: 0, weight: 3 },
  { tag: '-loping', hop: 1.55, speed: 1.05, shake: 0, weight: 2 },
  { tag: '-creep', hop: 0.6, speed: 0.6, shake: 0, weight: 2 },
  { tag: '-erratic', hop: 1.1, speed: 0.9, shake: 1, weight: 2 }
];

const SHAPE_LIBS = [
  { name: 'sphere', make: (s) => new THREE.SphereGeometry(s * 0.5, 12, 10) },
  { name: 'box', make: (s) => new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8) },
  { name: 'cone', make: (s) => new THREE.ConeGeometry(s * 0.6, s, 8) },
  { name: 'capsule', make: (s) => new THREE.CapsuleGeometry(s * 0.35, s * 0.5, 6, 8) },
  { name: 'torch', make: (s) => new THREE.BoxGeometry(s, s * 0.3, s * 0.3) },
  { name: 'icosa', make: (s) => new THREE.IcosahedronGeometry(s * 0.6, 0) },
  { name: 'octa', make: (s) => new THREE.OctahedronGeometry(s * 0.6, 0) },
  { name: 'tetra', make: (s) => new THREE.TetrahedronGeometry(s * 0.7, 0) },
  { name: 'torus', make: (s) => new THREE.TorusGeometry(s * 0.35, s * 0.18, 8, 12) },
  { name: 'crystal', make: (s) => { const g = new THREE.OctahedronGeometry(s * 0.5, 0); g.scale(0.7, 2, 0.7); return g; } },
  { name: 'ring', make: (s) => new THREE.TorusGeometry(s * 0.5, s * 0.08, 8, 20) },
  { name: 'spike', make: (s) => new THREE.ConeGeometry(s * 0.2, s, 6) },
  { name: 'bloom', make: (s) => { const g = new THREE.IcosahedronGeometry(s * 0.6, 0); g.scale(1, 0.35, 1); return g; } },
  { name: 'shard', make: (s) => new THREE.ConeGeometry(s * 0.35, s, 4) },
  { name: 'lens', make: (s) => new THREE.CylinderGeometry(s * 0.45, s * 0.45, s * 0.18, 16) },
  { name: 'wheel', make: (s) => new THREE.TorusGeometry(s * 0.4, s * 0.14, 8, 14) },
  { name: 'star', make: (s) => { const g = new THREE.OctahedronGeometry(s * 0.5, 0); g.scale(0.5, 1.6, 0.5); return g; } },
  { name: 'loaf', make: (s) => { const g = new THREE.SphereGeometry(s * 0.6, 10, 8); g.scale(1, 0.6, 1.4); return g; } },
  { name: 'needle', make: (s) => new THREE.CylinderGeometry(0.05 * s, 0.12 * s, s * 1.4, 6) },
  { name: 'pill', make: (s) => new THREE.CapsuleGeometry(s * 0.22, s * 0.6, 6, 8) },
  { name: 'knot', make: (s) => new THREE.TorusKnotGeometry(s * 0.4, s * 0.12, 40, 10) },
  { name: 'pyramid', make: (s) => new THREE.ConeGeometry(s * 0.6, s, 4) },
  { name: 'disc', make: (s) => new THREE.CylinderGeometry(s * 0.55, s * 0.55, s * 0.14, 6) },
  { name: 'prong', make: (s) => new THREE.ConeGeometry(s * 0.3, s * 1.2, 4) },
  { name: 'claw', make: (s) => { const g = new THREE.ConeGeometry(s * 0.4, s * 1.1, 4); g.rotateZ(Math.PI / 2); return g; } }
];

const SHAPE_VARIANTS = [
  { tag: '', s: [1, 1, 1] },
  { tag: 'wide-', s: [1.35, 0.7, 1.35] },
  { tag: 'tall-', s: [0.8, 1.6, 0.8] },
  { tag: 'long-', s: [0.7, 0.8, 1.5] }
];

function buildShapes() {
  const list = [];
  for (const lib of SHAPE_LIBS) {
    for (const v of SHAPE_VARIANTS) {
      list.push({ name: v.tag + lib.name, lib, sx: v.s[0], sy: v.s[1], sz: v.s[2] });
    }
  }
  return list;
}

export const SHAPE_POOL = buildShapes();

const HUE_SECTS = [
  [0.0, 0.05], [0.06, 0.12], [0.2, 0.38], [0.42, 0.52], [0.55, 0.65], [0.68, 0.78],
  [0.82, 0.92], [0.13, 0.2], [0.6, 0.72], [0.03, 0.08], [0.5, 0.6], [0.3, 0.45]
];
const SECT_NAMES = ['ember', 'amber', 'verdant', 'teal', 'azure', 'violet', 'magenta', 'toxic', 'abyss', 'bone', 'frost', 'price'];
const FAM_TONES = [
  { tag: '', lgt: 0, sat: 0 },
  { tag: '-pale', lgt: 0.18, sat: -0.16 },
  { tag: '-deep', lgt: -0.15, sat: 0.1 }
];

function buildFamilies() {
  const fams = [];
  for (let i = 0; i < HUE_SECTS.length; i++) {
    for (const tone of FAM_TONES) {
      fams.push({
        name: SECT_NAMES[i] + tone.tag,
        hue: HUE_SECTS[i],
        sat: [0.35 + tone.sat, 0.95 + tone.sat],
        lgt: [0.05 + tone.lgt, 0.85 + tone.lgt]
      });
    }
  }
  return fams;
}

export const COLOR_FAMILIES = buildFamilies();

const ABILITY_KINDS = ['none', 'charge', 'spit', 'burst', 'roar', 'detonate', 'summon', 'haste', 'poison', 'leech', 'slowaura', 'screech'];
const ABILITY_STRENGTHS = [
  { tag: '', tier: 2 },
  { tag: '-II', tier: 3 },
  { tag: '-III', tier: 4 }
];

function buildAbilities() {
  const list = [];
  for (const k of ABILITY_KINDS) {
    for (const s of ABILITY_STRENGTHS) {
      list.push({ name: k + s.tag, kind: k, tier: k === 'none' ? 0 : s.tier });
    }
  }
  return list;
}

export const ABILITIES = buildAbilities();

const NAME_PREFIX = ['Qui', 'Ve', 'Em', 'Drif', 'Wi', 'Glo', 'Sha', 'Mo', 'Prow', 'Blo', 'Skyl', 'Thra', 'Oss', 'Kel', 'Zor', 'Nyx', 'Vel', 'Grim', 'Pyre', 'Ish', 'Ur', 'Thal', 'Vor', 'Ylm', 'Shek', 'Oblo', 'Mur', 'Fe', 'Brum', 'Hael', 'Quaz', 'Zeph', 'Irk', 'Olv', 'Xer', 'Cyd', 'Blau', 'Fer', 'Vek', 'Tarn', 'Rux', 'Nod', 'Mael', 'Gir', 'Skal', 'Eyl', 'Dorr', 'Pell', 'Ond', 'Vryn', 'Shim', 'Aer', 'Krin', 'Ulm', 'Bel', 'Thorm', 'Wyrm', 'Kal', 'Syr', 'Glom', 'Pyt', 'Chor', 'Vix', 'Erm', 'Toz', 'Nym', 'Rad', 'Ask', 'Brek', 'Ux', 'Tel', 'Mord', 'Sarn', 'Owl', 'Jinx', 'Kelb', 'Frath', 'Ion', 'Dre', 'Yff', 'Loc', 'Ske', 'Wur', 'Nef', 'Ost', 'Pry', 'Gref', 'Uth', 'Bral', 'Maz', 'Korr', 'Velm', 'Soth', 'Aeg'];
const NAME_CORE = ['ll', 'm', 'r', 'sh', 'zz', 'mm', 'tt', 'ng', 'rr', 'bb', 'ss', 'th', 'ck', 'ff', 'nn', 'pp', 'kk', 'vv', 'dd', 'gg', 'q', 'ln', 'st', 'x', 'tl', 'gh', 'rz', 'nd', 'rsh', 'mp', 'wn', 'tz', 'sk', 'fr', 'bl', 'dr', 'gl', 'tr', 'sn', 'vr', 'fl', 'kl', 'gn', 'rh', 'sp', 'kr', 'nt', 'rn', 'ls', 'mb', 'lt', 'lp', 'rd', 'rg', 'rm', 'hn', 'hs', 'ps', 'rk', 'nq'];
const NAME_TAIL = ['o', 'ia', 'ix', 'on', 'e', 'a', 'us', 'yx', 'it', 'um', 'ara', 'ada', 'in', 'os', 'eth', 'ora', 'el', 'un', 'ix', 'od', 'ar', 'is', 'or', 'ul', 'ay', 'ow', 'ek', 'am', 'yth', 'roz', 'ile', 'uss', 'oft', 'een', 'aal', 'ine', 'owe', 'ok', 'eb', 'ur', 'im', 'ex', 'ul', 'asp', 'orn', 'uth', 'idl', 'oel'];

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
    const nature = this.rng.pick(NATURES);
    const temper = this.rng.pick(TEMPERAMENTS);
    const relax = this.rng.pick(RELAX_STYLES);
    const gait = this.rng.pick(GAITS);
    const size = this.rng.range(0.3, 2.4);
    const speed = this.rng.range(0.9, 9.5) * gait.speed;
    return { nature, temper, relax, gait, size, speed };
  }

  _rollType() {
    const family = this.rng.pick(COLOR_FAMILIES);
    const hue = this.rng.range(family.hue[0], family.hue[1]);
    const shape = this.rng.pick(SHAPE_POOL);
    const ability = this.rng.pick(ABILITIES);
    const temper = this.rng.pick(TEMPERAMENTS);
    const aggroBase = this.rng.range(3, 21) * temper.bold;
    return {
      id: this.rng.next(),
      name: this.rollName(),
      family: family.name,
      ...this._rollBehaviorTemplate(),
      shape: shape.name,
      shapeS: [shape.sx, shape.sy, shape.sz],
      shapeLib: shape.lib,
      color: new THREE.Color().setHSL(hue, this.rng.range(family.sat[0], family.sat[1]), this.rng.range(family.lgt[0], family.lgt[1])),
      accent: new THREE.Color().setHSL(this.rng.next(), this.rng.range(0.5, 1), this.rng.range(0.4, 0.8)),
      eyeCount: this.rng.intRange(0, 4),
      horns: this.rng.chance(0.3),
      spikes: this.rng.chance(0.25),
      tail: this.rng.chance(0.35),
      hue,
      aggroRange: aggroBase,
      hp: this.rng.intRange(1, 12),
      dmg: this.rng.intRange(1, 3),
      ability: ability.name,
      abilityKind: ability.kind,
      abilityTier: ability.tier,
      nocturnal: this.rng.chance(0.2)
    };
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

  update(dt, player, time, dayFrac) {
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
    const typeLike = { ...mk, nature: 'aggressive', abilityKind: 'none', abilityTier: 0, gait: GAITS[3] };
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
    this._stuckTimer = 0;
    this._lastStuckPos = pos.clone();
    this._unstuckCooldown = 0;
    this._pathAttempt = 0;
    this._hopRequest = 0;
    this._moveBlend = 0;
    this._facing = 0;
    this.anim = null;
    this._escFlurry = 0;
    this._escFlurryT = 0;
    this._escFrom = new THREE.Vector3();
    this._escTo = new THREE.Vector3();
    this._escT = 0;
    this._escDur = 0.2;
  }

  buildMesh() {
    const type = this.type;
    this.group = new THREE.Group();
    const rngC = this.factory.rng;

    const s = type.size;
    let geo = type.shapeLib.make(s);
    geo.scale(type.shapeS[0], type.shapeS[1], type.shapeS[2]);

    const mat = new THREE.MeshStandardMaterial({
      color: type.color,
      roughness: rngC.range(0.25, 0.95),
      metalness: rngC.range(0, 0.55),
      emissive: type.accent,
      emissiveIntensity: rngC.range(0.0, 0.3)
    });
    this.mainMesh = new THREE.Mesh(geo, mat);
    this.mainMesh.castShadow = true;

    this.bodyPivot = new THREE.Group();
    this.group.add(this.bodyPivot);
    this.bodyPivot.add(this.mainMesh);

    this.eyes = [];
    for (let i = 0; i < type.eyeCount; i++) {
      const pivot = new THREE.Group();
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: type.accent })
      );
      eye.castShadow = true;
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(s * 0.055, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      pivot.position.set(rngC.range(-s * 0.3, s * 0.3), s * (rngC.range(0.1, 0.35)), s * 0.45);
      pivot.add(eye);
      pupil.position.z = s * 0.09;
      pivot.add(pupil);
      this.bodyPivot.add(pivot);
      this.eyes.push(pivot);
    }

    if (type.horns) {
      for (let hx = -1; hx <= 1; hx += 2) {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(s * 0.08, s * 0.45, 5),
          new THREE.MeshStandardMaterial({ color: type.accent, emissive: type.accent, emissiveIntensity: 0.3 })
        );
        horn.castShadow = true;
        horn.position.set(hx * s * 0.35, s * 0.55, 0);
        horn.rotation.z = -hx * 0.5;
        this.bodyPivot.add(horn);
      }
    }
    if (type.spikes) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(s * 0.06, s * 0.4, 5),
        new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.6 })
      );
      spike.castShadow = true;
      spike.position.y = s * 0.6;
      this.bodyPivot.add(spike);
    }

    this.tailPivot = null;
    if (type.tail) {
      this.tailPivot = new THREE.Group();
      this.tailPivot.position.set(0, s * 0.1, -s * 0.5);
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 * s, 0.1 * s, s * 0.7, 5),
        new THREE.MeshStandardMaterial({ color: type.accent })
      );
      tail.castShadow = true;
      tail.rotation.x = 0.9;
      this.tailPivot.add(tail);
      this.bodyPivot.add(this.tailPivot);
    }

    this._buildAnimRig(s, rngC);
  }

  _buildAnimRig(s, rngC) {
    const type = this.type;
    const phase = rngC.range(0, Math.PI * 2);
    const bobF = rngC.range(1.7, 3.4);
    const bobA = rngC.range(0.015, 0.05);
    const brF = rngC.range(0.8, 1.6);
    const brA = rngC.range(0.02, 0.08);
    const swF = rngC.range(1.2, 3.0);
    const swA = rngC.range(0.1, 0.3);
    const turn = rngC.range(3.0, 9.0);
    const stride = rngC.range(1.4, 2.6);
    const glow = rngC.range(0.8, 1.3);
    const eyeF = rngC.range(0.5, 1.4);
    const tilt = rngC.range(0.4, 1.0);
    const wingF = rngC.range(6, 12);

    const air = type.relax === 'floaty' || type.relax === 'glide';
    const shimmer = type.relax === 'blink';

    this.anim = {
      phase, bobF, bobA, brF, brA, swF, swA, turn, stride, glow, eyeF, tilt, wingF,
      air, shimmer, legs: [], wings: [], legCount: 0, legBaseY: 0
    };

    const legMat = new THREE.MeshStandardMaterial({
      color: type.color.clone().multiplyScalar(0.58),
      roughness: 0.75
    });

    if (air) {
      this.anim.air = true;
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        const wing = new THREE.Mesh(new THREE.BoxGeometry(s * 0.75, s * 0.03, s * 0.5), legMat);
        wing.castShadow = true;
        pivot.position.set(side * s * 0.22, s * 0.08, -s * 0.08);
        wing.position.set(side * s * 0.52, 0, 0);
        pivot.add(wing);
        this.bodyPivot.add(pivot);
        this.anim.wings.push({ pivot, flip: side });
      }
      this.anim.legCount = 0;
    } else if (!shimmer) {
      let count = 4;
      if (type.relax === 'skitter' || type.relax === 'jitter') count = 6;
      else if (type.relax === 'hoppy' || type.relax === 'bounce') count = 2;
      this.anim.legCount = count;
      const legLen = s * 0.24;
      const hipY = -s * 0.34;
      this.anim.legBaseY = hipY;
      const baseSpots = [];
      if (count === 2) {
        baseSpots.push([-s * 0.28, hipY, s * 0.1], [s * 0.28, hipY, s * 0.1]);
      } else if (count === 6) {
        for (let row = -1; row <= 1; row++) {
          baseSpots.push([-s * 0.34, hipY, row * s * 0.36], [s * 0.34, hipY, row * s * 0.36]);
        }
      } else {
        baseSpots.push(
          [-s * 0.3, hipY, -s * 0.28], [s * 0.3, hipY, -s * 0.28],
          [-s * 0.3, hipY, s * 0.28], [s * 0.3, hipY, s * 0.28]
        );
      }
      baseSpots.forEach((spot, i) => {
        const pivot = new THREE.Group();
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.045, s * 0.055, legLen, 5), legMat);
        leg.castShadow = true;
        leg.position.y = -legLen * 0.5;
        pivot.position.set(spot[0], spot[1], spot[2]);
        pivot.add(leg);
        this.bodyPivot.add(pivot);
        this.anim.legs.push({ pivot, phase: phase + ((i + Math.floor(i / 2)) % 2) * Math.PI });
      });
    }

    this.anim.baseGlow = this.mainMesh.material.emissiveIntensity;
    this.anim.eyeRange = type.aggroRange * 1.4;
  }

  _animate(dt, time, player) {
    const type = this.type;
    const an = this.anim;
    if (!an) return;

    let yawTarget = this._facing;
    if (this._moveBlend > 0.05) yawTarget = Math.atan2(this.targetDir.x, this.targetDir.z);
    let dYaw = yawTarget - this._facing;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    this._facing += dYaw * Math.min(1, dt * an.turn);
    if (!(this._facing === this._facing)) this._facing = 0;

    const p = this.body.position;
    const th = this.factory.terrainHeight;
    let pitch = 0, roll = 0;
    if (th) {
      const dxTer = (th(p.x + 1.2, p.z) - th(p.x - 1.2, p.z)) / 2.4;
      const dzTer = (th(p.x, p.z + 1.2) - th(p.x, p.z - 1.2)) / 2.4;
      const fwdX = Math.sin(this._facing), fwdZ = Math.cos(this._facing);
      pitch = THREE.MathUtils.clamp((dxTer * fwdX + dzTer * fwdZ) * an.tilt, -0.45, 0.45);
      roll = THREE.MathUtils.clamp((dxTer * fwdZ - dzTer * fwdX) * -an.tilt, -0.4, 0.4);
    }

    this.group.rotation.order = 'YXZ';
    this.group.rotation.set(pitch, this._facing, roll);

    const breathe = 1 + Math.sin(time * an.brF + an.phase) * an.brA;
    const bob = Math.sin(time * an.bobF + an.phase * 2) * an.bobA * type.size
      + (an.air ? Math.sin(time * 2.1 + an.phase) * type.size * 0.14 : 0)
      + (type.relax === 'sine' ? Math.sin(time * 3.2 + this.age * 2.4) * type.size * 0.12 : 0);
    const stretch = this._moveBlend * Math.min(0.09, 0.05 + type.size * 0.01);
    const pose = (this.state === 'attack' || this.state === 'crouch') ? -type.size * 0.12 : 0;
    this.bodyPivot.scale.set(breathe * (1 + stretch), breathe * (1 - stretch), breathe * (1 + stretch));
    this.bodyPivot.position.y = bob + pose;

    if (an.legs.length) {
      const fw = an.stride + this._moveBlend * 2.4;
      for (const leg of an.legs) {
        const swing = Math.sin(time * fw * 3 + leg.phase);
        leg.pivot.rotation.x = swing * 0.55 * this._moveBlend;
        leg.pivot.rotation.z = Math.sin(time * fw * 1.5 + leg.phase * 0.7) * 0.12 * this._moveBlend;
        leg.pivot.position.y = an.legBaseY + Math.abs(swing) * 0.05 * this._moveBlend;
      }
    }

    if (this.tailPivot) {
      const sway = Math.sin(time * an.swF + an.phase) * an.swA * (0.35 + this._moveBlend);
      this.tailPivot.rotation.y = sway;
      this.tailPivot.rotation.x = Math.sin(time * an.swF * 1.3 + an.phase) * an.swA * 0.4;
    }

    if (an.wings.length) {
      const flap = Math.max(0.12, this._moveBlend > 0.05 ? 0.95 : 0.35) * Math.sin(time * an.wingF + an.phase);
      for (const w of an.wings) {
        w.pivot.rotation.z = 0.25 + flap * w.flip;
      }
    }

    if (this.eyes.length) {
      const watched = player && player.position.distanceTo(p) < an.eyeRange;
      const tx = watched ? player.position.x : p.x + Math.sin(time * an.eyeF + an.phase) * 2.2;
      const tz = watched ? player.position.z : p.z + Math.cos(time * an.eyeF + an.phase) * 2.2;
      const ty = watched ? player.position.y : p.y;
      const dx = tx - p.x, dz = tz - p.z;
      const hor = Math.sqrt(dx * dx + dz * dz) || 1;
      const localYaw = Math.atan2(dx, dz) - this._facing;
      const pitchE = Math.atan2(ty - p.y, hor);
      for (const eye of this.eyes) {
        eye.rotation.y = THREE.MathUtils.clamp(localYaw * 0.85, -0.6, 0.6);
        eye.rotation.x = THREE.MathUtils.clamp(-pitchE * 0.6, -0.35, 0.35);
      }
    }

    if (an.shimmer) {
      this.mainMesh.material.emissiveIntensity = an.baseGlow * (0.4 + 0.6 * Math.abs(Math.sin(time * 9 + an.phase)));
    } else {
      this.mainMesh.material.emissiveIntensity = an.baseGlow * (0.9 + 0.1 * Math.sin(time * 1.6 + an.phase));
    }
  }

  addToScene(scene) {
    this.scene = scene;
    scene.add(this.group);
  }

  removeFromScene() {
    if (this.scene) this.scene.remove(this.group);
  }

  _effDist() {
    const type = this.type;
    return type.aggroRange;
  }

  update(dt, player, time, terrainHeight, physics, dayFrac) {
    this.age += dt;
    if (this._tickEscape(dt, terrainHeight)) {
      return;
    }
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

    switch (type.nature) {
      case 'aggressive': {
        if (distToPlayer < type.aggroRange && active) {
          if (distToPlayer < attackDist) {
            this.state = 'attack';
            targetSpeed = 0;
            this._attack(player);
          } else {
            targetSpeed = type.speed * type.temper.bold;
            this.targetDir.copy(player.position).sub(this.body.position).normalize();
            this.state = 'chase';
            this._abilityChase(player);
          }
        } else {
          this.state = 'idle';
        }
        break;
      }
      case 'skittish': {
        if (distToPlayer < type.aggroRange && active) {
          targetSpeed = type.speed * 1.35 * type.temper.fear;
          this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
          this.state = 'flee';
          this._abilityFlee(player);
        }
        break;
      }
      case 'curious': {
        if (distToPlayer < type.aggroRange * 1.5) {
          targetSpeed = type.speed * 0.6 * type.temper.chill;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'curious';
        }
        break;
      }
      case 'guard': {
        const homeDist = this.body.position.distanceTo(this.wanderHome);
        if (distToPlayer < type.aggroRange && active) {
          targetSpeed = type.speed * type.temper.bold;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'chase';
        } else if (homeDist > 6 + type.size) {
          targetSpeed = type.speed * 0.7;
          this.targetDir.copy(this.wanderHome).sub(this.body.position).normalize();
          this.state = 'return';
        }
        break;
      }
      case 'stalker': {
        if (distToPlayer < type.aggroRange * 2 && active && player) {
          targetSpeed = type.speed * 0.75;
          this.targetDir.copy(player.position).sub(this.body.position).normalize();
          this.state = 'stalk';
          if (distToPlayer < 10) {
            this.targetDir.multiplyScalar(-1);
          }
        }
        break;
      }
      case 'hunter': {
        if (distToPlayer < type.aggroRange * 2.2 && active) {
          if (distToPlayer < 6) {
            targetSpeed = 0;
            this.state = 'crouch';
          } else {
            targetSpeed = type.speed * type.temper.chill;
            this.targetDir.copy(player.position).sub(this.body.position).normalize();
            this.state = 'stalkb';
          }
        }
        break;
      }
      case 'herd': {
        let nearest = null, nd = Infinity;
        for (const other of this.factory.entities) {
          if (other !== this && other.type.nature === 'herd') {
            const d = other.body.position.distanceTo(this.body.position);
            if (d < nd) { nd = d; nearest = other; }
          }
        }
        if (nd > 3) {
          targetSpeed = type.speed * 0.5;
          if (nearest) {
            this.targetDir.copy(nearest.body.position).sub(this.body.position).normalize();
            this.state = 'herding';
          }
        }
        if (distToPlayer < type.aggroRange && active) {
          targetSpeed = type.speed * 1.3 * type.temper.fear;
          this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
          this.state = 'fleeing-herd';
        }
        break;
      }
      case 'galavanter': {
        if (this.state !== 'wander') this.state = 'wander';
        targetSpeed = type.speed * 0.85 * type.temper.chill;
        break;
      }
      case 'gatherer': {
        if (this.thinkTimer > 0.8) {
          this.state = 'gather';
          const angle = time * 0.4 + this.age;
          this.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
          targetSpeed = type.speed * 0.4;
        }
        break;
      }
      case 'phantom': {
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
        break;
      }
      case 'wanderer': {
        if (this.state !== 'wander') this.state = 'wander';
        targetSpeed = type.speed * 0.45 * type.temper.chill;
        break;
      }
      default: {
        if (this.state === 'wander') targetSpeed = type.speed * 0.4;
      }
    }

    if (type.nature === 'passive' && distToPlayer < 4 && rng.chance(0.3)) {
      targetSpeed = type.speed * 0.55 * type.temper.fear;
      this.targetDir.copy(player.position).sub(this.body.position).normalize().multiplyScalar(-1);
      this.state = 'avoid';
    }

    if (this.state === 'wander' && targetSpeed === 0 && rng.chance(0.5)) {
      targetSpeed = type.speed * 0.4;
    }

    this._applyMovement(dt, time, terrainHeight, targetSpeed);

    this._updateStuck(dt, terrainHeight, targetSpeed);

    this.group.position.copy(this.body.position);

    const hSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    const speedCap = Math.max(0.6, type.speed);
    const wantFrac = type.speed > 0 ? Math.min(1.2, Math.abs(targetSpeed) / speedCap) : 0;
    const frac = Math.max(wantFrac, Math.min(1.2, hSpeed / speedCap));
    this._moveBlend += (frac - this._moveBlend) * Math.min(1, dt * 5);

    this._animate(dt, time, player);

    if (this.age % 2 < 0.05 && this.factory.audio && rng.chance(0.3)) {
      this.factory.audio.playSND();
    }
  }

  _tickEscape(dt, terrainHeight) {
    if (this._escT <= 0) return false;
    this._escT -= dt;
    const k = 1 - Math.max(0, this._escT) / this._escDur;
    const e = THREE.MathUtils.smoothstep(k, 0, 1);
    this.body.position.lerpVectors(this._escFrom, this._escTo, e);
    if (this._escT <= 0) {
      const g = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = g + this.type.size;
      this.body.velocity.y = 2.5;
      this._lastStuckPos.copy(this.body.position);
    }
    return true;
  }

  _updateStuck(dt, terrainHeight, targetSpeed) {
    this._unstuckCooldown = Math.max(0, this._unstuckCooldown - dt);
    if (this._unstuckCooldown > 0) return;
    if (this.body.position.y < terrainHeight(this.body.position.x, this.body.position.z) - this.type.size * 2) {
      this.body.position.y = terrainHeight(this.body.position.x, this.body.position.z) + this.type.size;
      this._lastStuckPos.copy(this.body.position);
      this._unstuckCooldown = 1.0;
      return;
    }

    const moved = this.body.position.distanceTo(this._lastStuckPos);
    this._stuckTimer += dt;

    if (this._stuckTimer > 0.6 && moved > 1.4) {
      this._stuckTimer = 0;
      this._pathAttempt = 0;
      this._lastStuckPos.copy(this.body.position);
      return;
    }
    if (this._stuckTimer > 0.6 && moved <= 1.4) {
      this._lastStuckPos.copy(this.body.position);
    }

    if (this._stuckTimer > 2.8 && moved < 1.0) {
      this._pathAttempt++;
      this._escFlurryT += this._stuckTimer;
      if (this._escFlurryT > 8) { this._escFlurry = 0; this._escFlurryT = 0; }
      this._escFlurry++;
      const escalate = this._pathAttempt >= 5 || this._escFlurry >= 3;
      const here = terrainHeight(this.body.position.x, this.body.position.z);
      const esc = this._findEscapePoint(terrainHeight, escalate ? 14 : 4, escalate);
      this._escFrom.copy(this.body.position);
      if (esc) {
        this._escTo.set(
          esc.x,
          Math.max(terrainHeight(esc.x, esc.z) + this.type.size, here + this.type.size),
          esc.z
        );
      } else {
        const a = this.factory.rng.range(0, Math.PI * 2);
        this._escTo.set(
          this.body.position.x + Math.cos(a) * 3,
          Math.max(here + this.type.size, this.body.position.y),
          this.body.position.z + Math.sin(a) * 3
        );
      }
      this._escDur = escalate ? 0.32 : 0.22;
      this._escT = this._escDur;
      this.body.velocity.set(0, 2, 0);
      this._pathAttempt = Math.min(this._pathAttempt, 10);
      this._stuckTimer = 0;
      this._lastStuckPos.copy(this._escTo);
      this._unstuckCooldown = escalate ? 3.0 : 1.6;
      return;
    }
  }

  _findEscapePoint(terrainHeight, radius, pickHighest) {
    const here = terrainHeight(this.body.position.x, this.body.position.z);
    const wantAbove = pickHighest ? here + 1.0 : here;
    let best = null, bestScore = -Infinity;
    const ang = this.factory.rng.range(0, Math.PI * 2);
    for (let k = 0; k < 12; k++) {
      const a = ang + (k / 12) * Math.PI * 2;
      const x = this.body.position.x + Math.cos(a) * radius;
      const z = this.body.position.z + Math.sin(a) * radius;
      const g = terrainHeight(x, z);
      if (g < -1.0) continue;
      const slope = this._terrainSlope(x, z, terrainHeight);
      const above = g - here;
      const score = (g > wantAbove ? 2 : 0) - slope * 1.5 - Math.abs(above) * 0.3;
      if (score > bestScore) { bestScore = score; best = { x, z }; }
    }
    if (best) return best;
    for (let k = 0; k < 8; k++) {
      const a = ang + (k / 8) * Math.PI * 2;
      const x = this.body.position.x + Math.cos(a) * (radius * 0.6);
      const z = this.body.position.z + Math.sin(a) * (radius * 0.6);
      const g = terrainHeight(x, z);
      if (g < -1.0) continue;
      best = best || { x, z };
    }
    return best;
  }

  _applyMovement(dt, time, terrainHeight, targetSpeed) {
    const type = this.type;
    const rng = this.factory.rng;
    const gait = type.gait;

    const aheadX = this.body.position.x + this.targetDir.x * 2;
    const aheadZ = this.body.position.z + this.targetDir.z * 2;
    const slopeAhead = this._terrainSlope(aheadX, aheadZ, terrainHeight);
    const atWaterEdge = terrainHeight(this.body.position.x, this.body.position.z) < 0.3;

    let moveDir = this.targetDir.clone();
    const hereGround = terrainHeight(this.body.position.x, this.body.position.z);
    const climbDesired = terrainHeight(aheadX, aheadZ) - hereGround;

    if (hereGround < -1.0) {
      const uhl = terrainHeight(this.body.position.x - 3, this.body.position.z);
      const uhr = terrainHeight(this.body.position.x + 3, this.body.position.z);
      const uhu = terrainHeight(this.body.position.x, this.body.position.z - 3);
      const uhd = terrainHeight(this.body.position.x, this.body.position.z + 3);
      const uphill = new THREE.Vector3(uhl - uhr, 0, uhu - uhd);
      if (uphill.lengthSq() > 0.5) {
        uphill.normalize().multiplyScalar(0.65).add(moveDir.clone().multiplyScalar(0.5)).normalize();
        moveDir.copy(uphill);
      }
    }

    if (climbDesired > this.type.size * 1.5 && targetSpeed > 0) {
      const leftX = this.body.position.x + (-this.targetDir.z) * 2;
      const leftZ = this.body.position.z + (this.targetDir.x) * 2;
      const rightX = this.body.position.x + (this.targetDir.z) * 2;
      const rightZ = this.body.position.z + (-this.targetDir.x) * 2;
      const lc = terrainHeight(leftX, leftZ) - hereGround;
      const rc = terrainHeight(rightX, rightZ) - hereGround;
      if (lc < rc && lc < this.type.size * 1.5) moveDir.set(-this.targetDir.z, 0, this.targetDir.x);
      else if (rc < this.type.size * 1.5) moveDir.set(this.targetDir.z, 0, -this.targetDir.x);
      else if (this.body.onGround) {
        this._hopRequest = Math.max(this._hopRequest || 0, 6);
      }
    }

    if (atWaterEdge && targetSpeed > 0) {
      const inWater = terrainHeight(aheadX, aheadZ) < 0.3;
      if (inWater) {
        moveDir.set(-this.targetDir.x, 0, -this.targetDir.z);
      }
    }

    if (type.relax === 'floaty') {
      this.body.velocity.set(0, 0, 0);
      this.body.position.x += moveDir.x * targetSpeed * 0.4 * dt;
      this.body.position.z += moveDir.z * targetSpeed * 0.4 * dt;
      this.body.position.y += Math.sin(time * 1.8 + this.age) * dt * 0.8;
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 0.5);
    } else if (type.relax === 'glide') {
      this.body.velocity.set(0, 0, 0);
      this.body.position.x += moveDir.x * targetSpeed * 0.45 * dt;
      this.body.position.z += moveDir.z * targetSpeed * 0.45 * dt;
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 1.1);
      this.body.position.y += Math.sin(time + this.age) * dt * 0.4;
    } else if (type.relax === 'blink') {
      this.body.velocity.set(0, 0, 0);
      if (rng.chance(0.6 * dt)) {
        this.body.position.x += moveDir.x * targetSpeed * 4;
        this.body.position.z += moveDir.z * targetSpeed * 4;
      }
      const ground = terrainHeight(this.body.position.x, this.body.position.z);
      this.body.position.y = Math.max(this.body.position.y, ground + type.size * 0.6);
    } else {
      let vx = moveDir.x * targetSpeed;
      let vz = moveDir.z * targetSpeed;

      if (type.relax === 'wave') {
        vz += Math.sin(time * 2 + this.age) * 1.2;
      } else if (type.relax === 'jitter' || type.relax === 'skitter') {
        vx += Math.sin(time * 18 + this.age * 9) * 1.5 * type.size;
        vz += Math.cos(time * 14 + this.age * 7) * 1.5 * type.size;
      }

      if (gait.shake > 0) {
        vx += (rng.next() - 0.5) * gait.shake * type.size * 6;
        vz += (rng.next() - 0.5) * gait.shake * type.size * 6;
      }

      this.body.velocity.x = vx;
      this.body.velocity.z = vz;
    }

    let extraV = 0;
    if (this._hopRequest > 0 && this.body.onGround) {
      extraV = this._hopRequest;
      this._hopRequest = 0;
    } else if ((type.relax === 'hoppy' || type.relax === 'skitter') && this.body.onGround) {
      if (rng.chance(Math.min(1, 0.1 * dt * 60 * (type.size < 1 ? 1.6 : 1)))) {
        extraV = rng.range(2.5, 6) * gait.hop;
      }
    }
    if (type.relax === 'linear' && this.state === 'chase' && type.abilityKind === 'charge' && this.body.onGround && rng.chance(0.15 * dt * 60)) {
      extraV = 3 * gait.hop;
    }
    this.body.velocity.y = extraV;

    if (this.body.onGround && type.relax === 'bounce') {
      if (this.body.position.y <= terrainHeight(this.body.position.x, this.body.position.z) + 0.2) {
        this.body.velocity.y = rng.range(2, 4) * gait.hop;
      }
    }

    const groundHere = terrainHeight(this.body.position.x, this.body.position.z);
    if (this.body.position.y < groundHere + type.size * 0.3) {
      this.body.position.y = groundHere + type.size * 0.6;
      this.body.velocity.y = Math.max(this.body.velocity.y, 3);
      this.body.onGround = true;
    }
  }

  _terrainSlope(x, z, terrainHeight) {
    const d = 1.5;
    const h = terrainHeight(x, z);
    const hL = terrainHeight(x - d, z);
    const hR = terrainHeight(x + d, z);
    const hU = terrainHeight(x, z - d);
    const hD = terrainHeight(x, z + d);
    const dx = (hR - hL) / (2 * d);
    const dz = (hD - hU) / (2 * d);
    return Math.sqrt(dx * dx + dz * dz);
  }

  _abilityWeapons() {
    const type = this.type;
    const tier = type.abilityTier || 1;
    if (type.abilityKind === 'spit') return type.dmg;
    if (type.abilityKind === 'burst') return type.dmg;
    if (type.abilityKind === 'poison') return type.dmg * tier;
    return type.dmg;
  }

  _attack(player) {
    const type = this.type;
    const rng = this.factory.rng;
    const tier = type.abilityTier || 1;
    if (this.attackTimer > 0 || !player) return;
    this.attackTimer = 1.0;
    if (this.factory.onEntityAttack) this.factory.onEntityAttack(this, type.dmg);

    const kind = type.abilityKind;

    if (kind === 'spitter-ng') {
    } else if (kind === 'spit') {
      this.factory.fireAt(this, player.position, this._abilityWeapons());
    } else if (kind === 'burst') {
      for (let i = 0; i < tier - 1; i++) {
        this.factory.fireAt(this, player.position.clone().add(new THREE.Vector3((rng.next() - 0.5) * 2, (rng.next() - 0.5) * 2, (rng.next() - 0.5) * 2)), this._abilityWeapons());
      }
    } else if (kind === 'charge') {
      this.body.velocity.x = this.targetDir.x * type.speed * (1 + 0.8 * tier);
      this.body.velocity.z = this.targetDir.z * type.speed * (1 + 0.8 * tier);
      this.body.velocity.y = 2;
    } else if (kind === 'roar') {
      const radius = 5 * tier;
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < radius) {
          other.state = 'flee';
          other.targetDir.copy(other.body.position).sub(this.body.position).normalize();
        }
      }
    } else if (kind === 'screech') {
      const radius = 4 * tier;
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < radius) {
          other.state = 'flee';
        }
      }
      if (this.factory.audio) this.factory.audio.playAmbientHit();
    } else if (kind === 'summon') {
      this.factory.spawnMinion(this, tier - 1);
    } else if (kind === 'haste') {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 8) {
          other.type.speed *= (1 + 0.25 * tier);
        }
      }
    } else if (kind === 'slowaura') {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 7 * tier) {
          other.type.speed *= 0.5;
        }
      }
    } else if (kind === 'leech') {
      this.hp = Math.min(type.hp, this.hp + (tier - 1));
    }
  }

  _abilityChase(player) {
    const type = this.type;
    const rng = this.factory.rng;
    const tier = type.abilityTier || 1;
    if (type.abilityKind === 'roar' && rng.chance(0.02)) {
      for (const other of this.factory.entities) {
        if (other !== this && other.body.position.distanceTo(this.body.position) < 5 * tier) {
          other.state = 'flee';
        }
      }
    }
  }

  _abilityFlee(player) {
    const type = this.type;
    const rng = this.factory.rng;
    const tier = type.abilityTier || 1;
    if (type.abilityKind === 'summon' && rng.chance(0.15 * (player ? 1 : 0))) {
      this.factory.spawnMinion(this, tier - 1);
    }
  }

  _decide(dist, rng, active) {
    const type = this.type;
    if (!active && type.nature !== 'passive') { this.state = 'idle'; return; }
    if (dist < type.aggroRange) {
      switch (type.nature) {
        case 'aggressive': this.state = 'chase'; break;
        case 'skittish': this.state = 'flee'; break;
        case 'curious': this.state = 'curious'; break;
        case 'hunter':
        case 'stalker':
        case 'phantom': this.state = dist < 6 ? 'crouch' : 'chase'; break;
        case 'herd':
        case 'passive': this.state = 'wander'; break;
        default: this.state = 'idle';
      }
    } else {
      this.state = rng.chance(0.35) ? 'wander' : 'idle';
    }
    if (type.nature !== 'guard') {
      const a = rng.range(0, Math.PI * 2);
      this.targetDir.set(Math.cos(a), 0, Math.sin(a));
    }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      const type = this.type;
      if (type.abilityKind === 'detonate' && this.type.size > 0.7) {
        if (this.factory.onDetonate) this.factory.onDetonate(this);
      }
      this.factory.removeEntity(this);
      return true;
    }
    return false;
  }
}