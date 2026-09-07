import * as THREE from 'three';
import { SeededRandom, SimplexNoise } from '../core/seed.js';

export class WorldEnvironment {
  constructor(engine, heightFn, worldSize, seed) {
    this.engine = engine;
    this.heightFn = heightFn;
    this.worldSize = worldSize;
    this.rng = new SeededRandom(seed);
    this.noise = new SimplexNoise(this.rng);

    const hue = this.rng.range(0.52, 0.65);
    this.skyColor = new THREE.Color().setHSL(hue, this.rng.range(0.3, 0.6), this.rng.range(0.5, 0.7));
    this.sunColor = new THREE.Color().setHSL(this.rng.next() * 0.1, 0.5, 0.9);
    this.fogColor = this.skyColor.clone().multiplyScalar(1.1).clampScalar(0, 1);

    this.clouds = [];
    this.windSpeed = this.rng.range(0.5, 2);
    this.cloudLayer = this.rng.range(30, 55);
  }

  build(engine) {
    const scene = engine.scene;

    scene.background = this.skyColor;
    scene.fog = new THREE.Fog(this.fogColor, 60, 320);

    const hemi = new THREE.HemisphereLight(this.skyColor, 0x556b2f, this.rng.range(0.5, 0.9));
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 2.2);
    const sunAngle = this.rng.range(-0.5, 0.5);
    sun.position.set(Math.cos(sunAngle) * 80, 80, Math.sin(sunAngle) * 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 220;
    scene.add(sun);
    this.sun = sun;

    this._buildClouds(scene);
  }

  _buildClouds(scene) {
    const count = this.rng.intRange(8, 16);
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Group();
      const mats = new THREE.MeshBasicMaterial({ color: this.rng.next() < 0.5 ? 0xffffff : 0xdcdcdc, transparent: true, opacity: 0.85 });
      const puffs = this.rng.intRange(3, 7);
      for (let p = 0; p < puffs; p++) {
        const s = this.rng.range(3, 7);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mats);
        puff.position.set(p * this.rng.range(2, 4.5) - puffs * 2, this.rng.range(-1, 1.5), this.rng.range(-2, 2));
        puff.scale.y = 0.4;
        cloud.add(puff);
      }
      const x = this.rng.range(-this.worldSize * 0.8, this.worldSize * 0.8);
      const z = this.rng.range(-this.worldSize * 0.8, this.worldSize * 0.8);
      cloud.position.set(x, this.cloudLayer + this.rng.range(-3, 3), z);
      cloud.userData.vel = this.rng.range(0.3, 1.2);
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(dt, elapsed, playerPos) {
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.vel * this.windSpeed * dt;
      if (cloud.position.x > this.worldSize) {
        cloud.position.x = -this.worldSize;
        cloud.position.z = this.rng.range(-this.worldSize * 0.8, this.worldSize * 0.8);
      }
    }

    if (this.sun) {
      const t = (elapsed / 60) % 1;
      const sunX = Math.cos(t * Math.PI * 2) * 80;
      const sunZ = Math.sin(t * Math.PI * 2) * 80;
      this.sun.position.set(sunX, 50 + Math.sin(t * Math.PI) * 40, sunZ);
    }
  }
}