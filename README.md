# SELF-GENERATING WORLD

A 3D game that **creates itself**. Given a seed, the entire world is generated
at runtime — terrain, biomes, weather, physics, weapons, textures, entity
*behaviors*, and a music system are all derived from the seed. Because the
possible worlds number in the millions (every category rolls from huge pools),
no two worlds are alike and no walkthrough can ever be written.

## The self-generating systems

| System | How much randomness |
|---|---|
| **Terrain** | 150 archetypes (6 base shapes × 5 carves × 5 modifiers: volcano, rift, canyon, mesa, spires, terraces…) × 15 ridge signatures × 1–20 detail octaves, with domain-warping, water level, and seeded offsets |
| **Biomes** | 48 biomes (16 bases × 3 variance tiers: jungle, swamp, toxic neon, volcanic, crystalline, coral, glacier…) chosen from seeded temperature/humidity; drive ground palette, snowline, flora, and density |
| **Physics** | 30 physical models (10 gravities × 3 drag tiers: Asteroid, Moon, Slurry, Titan, Singularity…) with per-world gravity and drag; per-world player speed and jump tuning |
| **Weapons** | 30 weapons (6 archetypes × 5 grade tiers: Bolt, Burst, Cannon, Rail, Homing, Yellow…) each firing differently — spread, velocity, damage, cooldown, homing |
| **Entities** | 36 behaviors (12 natures × 3 temperaments: aggressive, guard, stalker, hunter, herd, phantom, galavanter…) × 40 movement/gait styles (10 relax styles × 4 gaits) × 100 body shapes (25 bases × 4 variants) × 36 color families × 36 abilities (12 kinds × 3 strengths: charger, spitter, roarer, detonator, summoner…) × procedurally-generated three-part names (90×60×48 ≈ 259,000), plus horns/spikes/tails and 1–12 HP |
| **Music** | 54 scales/modes (18 bases × 3 variants: Ionian → Prometheus) × random root, tempo, note density, bass, waveform, humanization; SFX waveforms and ambient density all seeded |
| **Textures** | Canvas-generated diffuse & two-tone blend maps from seeded noise (bark, leaves, rock, cactus) |
| **Sky & Weather** | 36 sky presets (12 hue sectors × 3 brightness tiers) × 30 rolling weather patterns (10 kinds × 3 intensities: rain, storm, snow, blizzard, ash, aurora, emberfall, pollen…) with real particle systems, thunder flashes, and 60–600-second day/night cycles with stars |
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
  **R** asks for confirmation (press **R** a second time) to create a brand new world.
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
src/generators/terrain.js     150 archetypes + 48 biome palettes
src/generators/textures.js    canvas texture factory (diffuse + blend maps)
src/generators/audio.js       54-scale procedural Web Audio engine
src/entities/factory.js       rolled entity types, behaviors, abilities
src/systems/physics.js        30 per-world physics models + custom engine
src/systems/player.js         first-person controller + health
src/systems/environment.js    sky presets, weather, particles, day/night
src/systems/world.js          generation orchestrator + weapon combat
src/ui/ui.js                  HUD (health, weather, roster), minimap, start screen
```

Built with Three.js. MIT.