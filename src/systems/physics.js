import * as THREE from 'three';

const GRAVITY_LEVELS = [
  { g: 6, base: 'Asteroid' },
  { g: 9.5, base: 'Moon' },
  { g: 13, base: 'Light' },
  { g: 16.5, base: 'Soft' },
  { g: 20, base: 'Standard' },
  { g: 24, base: 'Firm' },
  { g: 29, base: 'Heavy' },
  { g: 35, base: 'Titan' },
  { g: 42, base: 'Colossus' },
  { g: 50, base: 'Singularity' }
];

const DRAG_TIERS = [
  { d: 0, tag: 'Clean' },
  { d: 2, tag: 'Aery' },
  { d: 7, tag: 'Slurry' }
];

export function buildPhysicsModels() {
  const models = [];
  const maxG = Math.max(...GRAVITY_LEVELS.map(l => l.g));
  for (const lv of GRAVITY_LEVELS) {
    for (const tier of DRAG_TIERS) {
      const jump = Math.max(0.55, Math.min(2.7, (26 / lv.g) * (tier.d === 0 ? 1 : 1.15)));
      models.push({
        name: tier.d === 0 ? lv.base : tier.tag + ' ' + lv.base,
        gravity: lv.g,
        drag: tier.d,
        jump,
        desc: `${(jump / Math.max(1, lv.g / 20)).toFixed(2)}× hop / ${lv.g.toFixed(0)}g`
      });
    }
  }
  return models;
}

export const PHYSICS_MODELS = buildPhysicsModels();

export class PhysicsEngine {
  constructor(terrainGetter, worldSize, config = {}) {
    this.terrainGetter = terrainGetter;
    this.worldSize = worldSize;
    this.bodies = [];
    this.gravity = config.gravity !== undefined ? config.gravity : 20;
    this.drag = config.drag !== undefined ? config.drag : 0;
    this.bounds = worldSize / 2 - 2;
  }

  registerBody(body) {
    this.bodies.push(body);
  }

  removeBody(body) {
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  getTerrainHeight(x, z, radius = 0.5) {
    let maxH = -Infinity;
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const sx = x + Math.cos(a) * radius;
      const sz = z + Math.sin(a) * radius;
      const h = this.terrainGetter(sx, sz);
      if (h > maxH) maxH = h;
    }
    return maxH;
  }

  update(dt) {
    for (const body of this.bodies) {
      this._integrateBody(body, dt);
    }
  }

  _integrateBody(body, dt) {
    if (body.kinematic) {
      body.position.add(body.velocity.clone().multiplyScalar(dt));
      return;
    }

    body.velocity.y -= this.gravity * dt;

    const newPos = body.position.clone().add(body.velocity.clone().multiplyScalar(dt));

    const ground = this.getTerrainHeight(newPos.x, newPos.z, body.radius);
    const floorLimit = ground + body.contactOffset;

    if (newPos.y <= floorLimit && body.velocity.y <= 0) {
      newPos.y = floorLimit;
      body.velocity.y = 0;
      body.onGround = true;
    } else {
      body.onGround = false;
    }

    const maxX = this.bounds, maxZ = this.bounds;
    newPos.x = Math.max(-maxX, Math.min(maxX, newPos.x));
    newPos.z = Math.max(-maxZ, Math.min(maxZ, newPos.z));

    body.position.copy(newPos);
    body.position.y = Math.max(body.position.y, floorLimit);

    if (body.mass > 0) {
      const friction = body.friction || 0.0;
      body.velocity.x *= (1 - friction * dt);
      body.velocity.z *= (1 - friction * dt);
    }

    if (this.drag > 0) {
      const k = Math.max(0, 1 - this.drag * dt);
      body.velocity.x *= k;
      body.velocity.z *= k;
      body.velocity.y *= Math.max(0, 1 - this.drag * 0.4 * dt);
    }
  }

  raycastTerrain(origin, direction, maxDist) {
    const step = 0.5;
    let t = 0;
    while (t < maxDist) {
      const x = origin.x + direction.x * t;
      const z = origin.z + direction.z * t;
      const h = this.terrainGetter(x, z);
      const y = origin.y + direction.y * t;
      if (y <= h) return { hit: true, point: new THREE.Vector3(x, h, z), t };
      t += step;
    }
    return { hit: false, point: null, t: maxDist };
  }
}

export class RigidBody {
  constructor(position, radius = 0.4, height = 1.7, mass = 1) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.radius = radius;
    this.height = height;
    this.mass = mass;
    this.onGround = false;
    this.kinematic = false;
    this.friction = 0;
    this.contactOffset = 0.05;
  }
}