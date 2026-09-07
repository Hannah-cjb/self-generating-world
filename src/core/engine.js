import * as THREE from 'three';
import { SeededRandom } from './seed.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.running = false;
    this.systems = [];
    this.onUpdate = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.inputState = {
      keys: {},
      mouse: { x: 0, y: 0, dx: 0, dy: 0, locked: false },
      jump: false,
      sprint: false
    };

    this._setupInput();
    this._setupResize();
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      this.inputState.keys[e.code] = true;
      if (e.code === 'Space') this.inputState.jump = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.inputState.sprint = true;
    });
    window.addEventListener('keyup', (e) => {
      this.inputState.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.inputState.sprint = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.inputState.mouse.locked) {
        this.inputState.mouse.dx += e.movementX;
        this.inputState.mouse.dy += e.movementY;
      }
    });
    this.canvas.addEventListener('click', () => {
      if (!this.inputState.mouse.locked) {
        this.canvas.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.inputState.mouse.locked = document.pointerLockElement === this.canvas;
    });
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  addSystem(system) {
    this.systems.push(system);
  }

  start() {
    this.running = true;
    this._loop();
  }

  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.onUpdate) this.onUpdate(dt, elapsed);

    for (const sys of this.systems) {
      if (sys.update) sys.update(dt, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this.inputState.mouse.dx = 0;
    this.inputState.mouse.dy = 0;
    this.inputState.jump = false;
  }

  stop() {
    this.running = false;
  }
}
