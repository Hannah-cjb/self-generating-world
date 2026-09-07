import * as THREE from 'three';

export class PhysicsEngine {
  constructor(terrainGetter, worldSize) {
    this.terrainGetter = terrainGetter;
    this.worldSize = worldSize;
    this.bodies = [];
    this.gravity = 20.0;
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
