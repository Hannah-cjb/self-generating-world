# SELF-GENERATING WORLD

A 3D game that **creates itself**. Given a seed, the entire world is generated
at runtime — terrain, biomes, weather, physics, weapons, textures, entity
*behaviors*, and a music system are all derived from the seed. Because the
possible worlds number in the millions (every category rolls from huge pools),
no two worlds are alike and no walkthrough can ever be written.

## The self-generating systems

| System | How much randomness |
|---|---|
| **Terrain** | 20 archetypes (volcano, rift, mesa, fjord, canyons, dunes, spires…) × 5 ridge signatures × 1–18 octaves, with domain-warping, water level, and seeded offsets |
| **Biomes** | 16 biomes (jungle, swamp, toxic neon, volcanic, crystalline, coral, glacier…) chosen from seeded temperature/humidity; drive ground palette, snowline, and flora |
| **Physics** | 10 physical models (Low Grav, Moon, Titan, Slurry, Float…) with per-world gravity and drag; per-world player speed and jump tuning |
| **Weapons** | 10 weapon archetypes (Bolt, Shotgun, Rail, Homing, Burst-V, Thumper…) each firing differently — spread, velocity, damage, cooldown, homing |
| **Entities** | 12 behaviors (aggressive, guard, stalker, hunter, herd, phantom, galavanter…) × 10 movement styles × 20 body shapes × 12 color families × 10 abilities (charger, spitter, roarer, detonator, summoner…) × procedurally-generated three-part names (30×20×16 ≈ 9600), plus horns/spikes/tails and 1–12 HP |
| **Music** | 18 scales/modes (Ionian → Prometheus) × random root, tempo, note density, bass, waveform, humanization; SFX waveforms and ambient density all seeded |
| **Textures** | Canvas-generated diffuse & two-tone blend maps from seeded noise (bark, leaves, rock, cactus) |
| **Sky & Weather** | 12 sky presets × 10 rolling weather patterns (rain, storm, snow, blizzard, ash, aurora, emberfall, pollen…) with real particle systems, thunder flashes, and 60–600-second day/night cycles with stars |
| **Environment** | Seeded cloud counts/density/wind, sun color, fog visibility 70–420 |

Every number above is pulled deterministically from the world seed — same seed,
identical world; different seed, entirely different universe.

## Play it live

**https://hannah-cjb.github.io/self-generating-world/**

Deployed from `master` via GitHub Pages. Every push to `master` rebuilds the
site automatically — game, world, and code edits all redeploy on the next push.

## Run it locally

```bash
python -m http.server 8000
# or:
npx serve .

# open http://localhost:8000
```

No build step. Three.js is loaded from a CDN import map.

## Playing

- **Start screen** — roll a random seed or type one. The same seed always
  produces the identical world; unknown seeds produce unknown worlds.
- **Click** to lock the mouse into first-person look.
- **WASD** move · **Space** jump · **Shift** sprint · **LMB** shoot ·
  **R** regenerate a brand new world.
- The HUD shows your seed, biome, terrain archetype, physics model, weapon,
  sky/music/octaves, current weather, and the full creature roster.
  There is also a health bar, kill counter, and a live minimap.

## Why it can't be "solved"

Every mechanic, layout, creature pattern, weapon, and sound is a function of the
seed. A walkthrough would have to be generated per seed — and even then it would
only be valid for that one world out of millions. There is no fixed game to
memorize.

## Project structure

```
index.html                    entry point (import map + canvas)
src/main.js                   bootstraps the game
src/core/seed.js              SeededRandom + SimplexNoise (deterministic)
src/core/engine.js            renderer, camera, input, game loop
src/generators/terrain.js     20 archetypes + 16 biome palettes
src/generators/textures.js    canvas texture factory (diffuse + blend maps)
src/generators/audio.js       18-scale procedural Web Audio engine
src/entities/factory.js       rolled entity types, behaviors, abilities
src/systems/physics.js        10 per-world physics models + custom engine
src/systems/player.js         first-person controller + health
src/systems/environment.js    sky presets, weather, particles, day/night
src/systems/world.js          generation orchestrator + weapon combat
src/ui/ui.js                  HUD (health, weather, roster), minimap, start screen
```

Built with Three.js. MIT.