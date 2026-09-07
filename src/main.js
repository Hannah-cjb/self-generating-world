import { Engine } from './core/engine.js';
import { World } from './systems/world.js';
import { UI, createStartScreen } from './ui/ui.js';

let engine = null;
let world = null;
let ui = null;
let startedWorld = false;

function buildWorld(seedString) {
  if (world) {
    disposeWorld();
  }
  if (!engine) {
    engine = new Engine(document.getElementById('game'));
    engine.start();
  }
  if (!ui) {
    ui = new UI();
  }
  world = new World(engine, seedString, ui);
  engine.onUpdate = (dt, elapsed) => world.update(dt, elapsed);

  engine.systems.length = 0;

  const onMouseDown = (e) => {
    if (e.button === 0 && world) world.shootProjectile();
  };
  engine.canvas.addEventListener('mousedown', onMouseDown);
  if (!startedWorld) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        const seed = Math.floor(Math.random() * 0x7fffffff).toString(36);
        buildWorld(seed);
      }
    });
  }
  startedWorld = true;

  engine.canvas.addEventListener('click', () => {
    world.startAudio();
  }, { once: true });
}

function disposeWorld() {
  if (world) {
    world.dispose();
    if (engine) {
      const scene = engine.scene;
      while (scene.children.length > 0) {
        const c = scene.children[0];
        scene.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      }
    }
    world = null;
  }
}

createStartScreen((seed) => {
  buildWorld(seed);
  document.getElementById('game').requestPointerLock();
  setTimeout(() => {
    if (document.pointerLockElement !== document.getElementById('game')) {
      document.getElementById('game').click();
    }
  }, 50);
});