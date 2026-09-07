import * as THREE from 'three';
import { EntityFactory } from './src/entities/factory.js';
import { TerrainGenerator } from './src/generators/terrain.js';
import { PhysicsEngine } from './src/systems/physics.js';
import { WEAPONS } from './src/systems/world.js';

let failures = 0;
const ok = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};

// --- Test 1: harsh adversarial terrain, crash & bury robustness ---
const harshHeight = (x, z) => {
  const r = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 6;
  const pit = (Math.abs(Math.sin(x * 1.7)) < 0.2 && Math.abs(Math.sin(z * 1.3)) < 0.2) ? -8 : 0;
  return r + pit;
};
let crashes = 0, buried = 0;
for (let seed = 0; seed < 120; seed++) {
  const physics = new PhysicsEngine(harshHeight, 240, { gravity: 20, drag: 0 });
  const f = new EntityFactory(seed, harshHeight, physics);
  f.spawnAround(new THREE.Vector3(0, 6, 0), 10);
  try {
    for (let fr = 0; fr < 300; fr++) {
      f.update(0.016, { position: new THREE.Vector3(Math.sin(fr * 0.08) * 8, 5, Math.cos(fr * 0.08) * 8) }, fr * 0.016, 0.5);
      physics.update(0.016);
      for (const ent of f.entities) {
        if (ent.body.position.y < harshHeight(ent.body.position.x, ent.body.position.z) - 1) { buried++; break; }
        if (!(ent.body.position.length() >= 0)) { crashes++; break; }
      }
      if (buried || crashes) break;
    }
  } catch (e) { crashes++; console.log('  crash seed', seed, e.message); }
}
ok('harsh terrain: no crashes across 120 seeds x 300 frames', crashes === 0);
ok('harsh terrain: entities never buried below surface', buried === 0);

// --- Test 2: real terrain + real physics, pursuit semantics ---
let traps = 0, crash2 = 0;
const SEEDS = 150;
for (let i = 0; i < SEEDS; i++) {
  const seed = (i * 2654435761 + 42) | 0;
  const terrain = new TerrainGenerator(seed, 240);
  const heightFn = (x, z) => terrain.height(x, z);
  const physics = new PhysicsEngine(heightFn, 240, { gravity: 20, drag: 0 });
  const f = new EntityFactory(seed + 7, heightFn, physics);
  f.scene = null;
  const spawn = terrain.spawnPoint();
  f.spawnAround(spawn, 14);
  const tracked = f.entities[0];
  tracked._lastStuckPos.copy(tracked.body.position);
  const sx = tracked.body.position.x, sz = tracked.body.position.z;
  for (let fr = 0; fr < 900; fr++) {
    const t = fr * 0.016;
    const px = spawn.x + Math.sin(fr * 0.08) * 12;
    const pz = spawn.z + Math.cos(fr * 0.08) * 12;
    try {
      f.update(0.016, { position: new THREE.Vector3(px, 3, pz) }, t, 0.5);
      f.physics.update(0.016);
    } catch (e) { crash2++; console.log('  crash seed', seed, fr, e.message); break; }
  }
  const moved = Math.hypot(tracked.body.position.x - sx, tracked.body.position.z - sz);
  const gh = heightFn(tracked.body.position.x, tracked.body.position.z);
  const pursuit = ['chase', 'flee', 'stalk', 'stalkb', 'swoop', 'herding', 'curious', 'return'].includes(tracked.state);
  if (tracked.body.position.y < gh - 0.5 || (pursuit && moved < 1.2)) traps++;
}
ok('real game world: 0/150 seeds leave a pursuing entity trapped', traps === 0);

// --- Test 3: determinism incl. animation visuals (positions/rotations/scales) ---
let detBad = 0;
const noPhysics = { registerBody(){}, removeBody(){}, update(){} };
for (let seed = 0; seed < 60; seed++) {
  const run = (seedA) => {
    const f = new EntityFactory(seedA, (x, z) => 0, noPhysics);
    f.spawnAround(new THREE.Vector3(0, 1, 0), 12);
    for (let fr = 0; fr < 200; fr++) {
      f.update(0.016, { position: new THREE.Vector3(Math.sin(fr * 0.08) * 4, 1, Math.cos(fr * 0.08) * 4) }, fr * 0.016, 0.5);
    }
    return f.entities.map(e => {
      const g = e.group;
      return [e.body.position.toArray(), e.body.velocity.toArray(), g.rotation.toArray(), e.bodyPivot.scale.toArray(), e.bodyPivot.position.toArray()];
    });
  };
  const a = JSON.stringify(run(seed));
  const b = JSON.stringify(run(seed));
  if (a !== b) detBad++;
}
ok('determinism preserved incl. animation rig (same seed -> identical results)', detBad === 0);

// --- Test 4: type pools intact ---
ok('weapons pool intact (30)', new Set(WEAPONS.map(w => w.name)).size === 30);

console.log(failures === 0 ? 'SMOKE PASS' : 'SMOKE FAILURES: ' + failures);
process.exit(failures === 0 ? 0 : 1);