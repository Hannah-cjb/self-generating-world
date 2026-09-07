export class UI {
  constructor() {
    this.worldInfo = null;
    this._createHud();
  }

  _createHud() {
    const style = document.createElement('style');
    style.textContent = `
      #hud { position: fixed; inset: 0; pointer-events: none; font-family: monospace; color: #eee; z-index: 10; }
      #crosshair { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 24px; color: rgba(255,255,255,0.8); text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
      #minimap { position: absolute; right: 16px; bottom: 16px; width: 160px; height: 160px; border: 2px solid rgba(255,255,255,0.4); border-radius: 8px; background: rgba(0,0,0,0.35); overflow: hidden; }
      #minimap canvas { width: 100%; height: 100%; image-rendering: pixelated; }
      #hudTop { position: absolute; top: 12px; left: 12px; font-size: 12px; line-height: 1.6; text-shadow: 0 1px 3px rgba(0,0,0,0.9); background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; }
      #hudTop .seed { color: #ffd966; }
      #hudTop .biome { color: #9be3a0; }
      #hudTop .kills { color: #ff9a9a; }
      #controls { position: absolute; bottom: 12px; left: 12px; font-size: 11px; color: rgba(255,255,255,0.6); line-height: 1.5; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
      #entityCount { position: absolute; top: 12px; right: 12px; font-size: 12px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; }
    `;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div id="crosshair">+</div>
      <div id="hudTop">
        WORLD SEED: <span class="seed" id="seedVal">-</span><br>
        BIOME: <span class="biome" id="biomeVal">-</span><br>
        SCALE: <span id="scaleVal">-</span><br>
        POS: <span id="posVal">0, 0, 0</span><br>
        FP: <span id="fpVal">-</span><br>
        KILLS: <span class="kills" id="killsVal">0</span>
      </div>
      <div id="entityCount">ENTITIES: <span id="entVal">0</span></div>
      <div id="minimap"><canvas id="mm" width="80" height="80"></canvas></div>
      <div id="controls">
        Click to lock mouse &nbsp;·&nbsp; WASD move &nbsp;·&nbsp; Space jump &nbsp;·&nbsp; Shift sprint<br>
        Hold LMB to shoot &nbsp;·&nbsp; R regenerate world
      </div>
    `;
    document.body.appendChild(this.root);
  }

  setWorldInfo(world) {
    this.worldInfo = world;
    document.getElementById('seedVal').textContent = world.seedString;
    document.getElementById('biomeVal').textContent = world.terrain.params.biome;
    document.getElementById('scaleVal').textContent = world.terrain.params.detail + ' octaves';
    this._drawMinimap();
  }

  onKill(kills) {
    document.getElementById('killsVal').textContent = kills;
    this._drawMinimap();
  }

  updateHud(player, world) {
    const p = player.body.position;
    document.getElementById('posVal').textContent = `${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}`;
    document.getElementById('fpVal').textContent = player.engine.renderer.info.render.fps;
    document.getElementById('entVal').textContent = world.entities.entities.length;
    if (this.worldInfo && world.entities.entities.length !== this._lastEntCount) {
      this._lastEntCount = world.entities.entities.length;
      document.getElementById('entVal').textContent = world.entities.entities.length;
    }
    this._updateMinimap(player);
  }

  _drawMinimap() {
    if (!this.worldInfo) return;
    const size = this.worldInfo.terrain.size;
    const canvas = document.getElementById('mm');
    const ctx = canvas.getContext('2d');
    const res = 80;
    const img = ctx.createImageData(res, res);
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const wx = (x / res - 0.5) * size;
        const wz = (y / res - 0.5) * size;
        const h = this.worldInfo.heightFn(wx, wz);
        const t = (h + 8) / 32;
        const i = (y * res + x) * 4;
        let r, g, bl;
        if (t < 0.25) { r = 60; g = 90; bl = 50; }
        else if (t < 0.5) { r = 90; g = 140; bl = 70; }
        else if (t < 0.75) { r = 130; g = 160; bl = 90; }
        else { r = 220; g = 225; bl = 230; }
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = bl;
        img.data[i + 3] = 255;
      }
    }
    this._mmCtx = ctx;
    this._mmImg = img;
  }

  _updateMinimap(player) {
    if (!this._mmCtx) return;
    const ctx = this._mmCtx;
    const canvas = document.getElementById('mm');
    ctx.putImageData(this._mmImg, 0, 0);
    const size = this.worldInfo.terrain.size;
    const res = 80;
    const px = ((player.body.position.x / size) + 0.5) * res;
    const pz = ((player.body.position.z / size) + 0.5) * res;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(px, pz, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffff66';
    for (const ent of this.worldInfo.entities.entities) {
      const ex = ((ent.body.position.x / size) + 0.5) * res;
      const ez = ((ent.body.position.z / size) + 0.5) * res;
      if (Math.abs(ex - px) < 12 && Math.abs(ez - pz) < 12) {
        ctx.strokeRect(ex - 1, ez - 1, 2, 2);
      }
    }
  }
}

export function createStartScreen(onStart) {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; background: radial-gradient(circle at 50% 40%, #1b2735, #090a0f);
    color: #e8e8e8; font-family: monospace; text-align: center; z-index: 100;
  `;
  const generateSeed = () => Math.floor(Math.random() * 0x7fffffff).toString(36);
  el.innerHTML = `
    <h1 style="font-size: 42px; letter-spacing: 4px; margin-bottom: 4px; color: #ffd966; text-shadow: 0 0 24px rgba(255,217,102,0.4);">SELF-GENERATING WORLD</h1>
    <p style="color: #9fb4c7; font-size: 13px; max-width: 520px; line-height: 1.7; margin-bottom: 28px;">
      A 3D world that builds itself from a seed: terrain, biomes, textures, weather,
      creature behaviors and even the soundtrack are generated at runtime — no two
      worlds are alike, so no walkthrough can ever exist.
    </p>
    <div style="display: flex; gap: 10px;">
      <input id="seedInput" type="text" placeholder="Enter a world seed…" spellcheck="false"
        style="background: rgba(255,255,255,0.08); border: 1px solid #3a4a5a; color: #fff; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 15px; outline: none; width: 260px;">
      <button id="randomizeBtn" style="background: #2a3a4a; border: 1px solid #3a4a5a; color: #ffd966; padding: 12px 16px; border-radius: 6px; font-family: monospace; cursor: pointer; font-size: 15px;">&#8635; Roll</button>
    </div>
    <button id="startBtn"
      style="margin-top: 22px; background: linear-gradient(180deg, #e6b84a, #c9932e); border: none; color: #1a1a1a; font-weight: bold; padding: 14px 48px; border-radius: 8px; font-family: monospace; font-size: 16px; cursor: pointer; letter-spacing: 1px;">
      GENERATE WORLD
    </button>
  `;
  document.body.appendChild(el);

  const seedInput = el.querySelector('#seedInput');
  seedInput.value = generateSeed();

  el.querySelector('#randomizeBtn').addEventListener('click', () => {
    seedInput.value = generateSeed();
  });

  const grab = () => {
    const val = seedInput.value.trim() || 'default';
    document.body.removeChild(el);
    onStart(val);
  };
  el.querySelector('#startBtn').addEventListener('click', grab);
  seedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') grab();
  });
}