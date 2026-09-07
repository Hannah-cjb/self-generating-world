import * as THREE from 'three';
import { RigidBody } from '../systems/physics.js';

export class PlayerController {
  constructor(engine, physics, spawnPoint, audio, tuning = {}) {
    this.engine = engine;
    this.physics = physics;
    this.audio = audio;
    this.tuning = tuning;
    this.camera = engine.camera;
    this.body = new RigidBody(spawnPoint.clone(), 0.4, 1.7, 1);
    physics.registerBody(this.body);
    this.spawnPoint = spawnPoint.clone();

    this.speed = tuning.speed !== undefined ? tuning.speed : 6.0;
    this.sprintMult = tuning.sprint !== undefined ? tuning.sprint : 1.7;
    this.jumpFactor = this.physics.gravity !== undefined ? this.physics.gravity : 20;
    this.jumpForce = this.jumpFactor * 0.5 * (tuning.jumpMult || 1.0);
    this.sensitivity = tuning.sensitivity !== undefined ? tuning.sensitivity : 0.0022;
    this.pitch = 0;
    this.yaw = 0;
    this.stepAccum = 0;
    this.attackCooldown = 0;
    this.input = engine.inputState;

    this.maxHp = 100;
    this.hp = this.maxHp;
    this.hitFlash = 0;
    this.invuln = 0;

    this.maxAmmo = 60;
    this.ammo = 40;
  }

  hasAmmo() {
    return this.ammo > 0;
  }

  useAmmo(amount = 1) {
    if (this.ammo <= 0) return false;
    this.ammo = Math.max(0, this.ammo - amount);
    return true;
  }

  collectAmmo(amount) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  collectHealth(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  takeDamage(dmg) {
    if (this.invuln > 0) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 1;
    this.invuln = 0.5;
    if (this.audio) this.audio.playAmbientHit();
    if (this.hp <= 0) this.respawn();
  }

  respawn() {
    this.body.position.copy(this.spawnPoint);
    this.body.velocity.set(0, 0, 0);
    this.hp = this.maxHp;
    this.ammo = Math.max(15, Math.floor(this.ammo * 0.5));
  }

  update(dt) {
    const input = this.input;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    if (input.mouse.locked) {
      this.yaw -= input.mouse.dx * this.sensitivity;
      this.pitch -= input.mouse.dy * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    }

    let move = new THREE.Vector3();
    if (input.keys['KeyW']) move.add(forward);
    if (input.keys['KeyS']) move.sub(forward);
    if (input.keys['KeyA']) move.sub(right);
    if (input.keys['KeyD']) move.add(right);

    move.y = 0;
    if (move.lengthSq() > 0) move.normalize();

    const sprinting = input.sprint && move.lengthSq() > 0;
    const spd = this.speed * (sprinting ? this.sprintMult : 1);

    this.body.velocity.x = move.x * spd;
    this.body.velocity.z = move.z * spd;

    if (input.jump && this.body.onGround) {
      this.body.velocity.y = this.jumpForce;
      this.body.onGround = false;
      if (this.audio) this.audio.playJump();
    }

    this.physics.update(dt);

    this.camera.position.copy(this.body.position);
    this.camera.position.y += 1.6;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    if (this.audio && this.body.onGround && move.lengthSq() > 0) {
      this.stepAccum += dt * (sprinting ? 3.0 : 2.0);
      if (this.stepAccum > 1) {
        this.stepAccum = 0;
        this.audio.playFootstep(sprinting);
      }
    }

    this.attackCooldown -= dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
    this.invuln = Math.max(0, this.invuln - dt);
  }

  attack() {
    if (this.attackCooldown > 0) return null;
    this.attackCooldown = 0.4;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const hit = this.physics.raycastTerrain(this.camera.position, dir, 4);
    return { dir, origin: this.camera.position.clone(), hit };
  }

  getForwardRay() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  }
}