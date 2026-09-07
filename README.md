# SELF-GENERATING WORLD

A 3D game that **creates itself**. Given a seed, the entire world is generated
at runtime — terrain, biomes, entity *behaviors*, textures, weather, a music
system, and a physics model. Because every world is procedurally derived from
its seed, no walkthrough can ever be written for this game.

## The self-generating systems

| System | What is procedurally generated |
|---|---|
| **Terrain** | Heightfield from layered simplex noise — continental shape, ridge/mountain topology, erosion detail, and octave count are all seed-derived |
| **Biome** | Desert / steppe / plains / temperate / tundra chosen from seed-derived temperature & humidity; drives terrain palette and snowline |
| **Physics** | Custom heightfield-collision physics engine (gravity, ground contact, raycast) tuned per world |
| **Entities** | Creature *types* are rolled from templates (aggressive, skittish, curious, passive, wanderer) with generated appearance (shape, eyes, color, scale), behavior, stats, and movement style (linear / bounce / floaty / hoppy) |
| **Textures** | Canvas-generated diffuse & normal maps from seeded noise |
| **Audio** | Web Audio API: the musical scale, root frequency, key color, wind/ambient notes, footsteps and creature calls are all composed from the seed |
| **Environment** | Sky color, sun color, fog, cloud count/animation — all seeded |

## Run it

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
- The HUD shows your seed, biome, octave count, position, FPS, and kills.
  The minimap reveals only what remains unexplored around you.

## Why it can't be "solved"

Every mechanic, layout, creature pattern, and sound is a function of the seed.
Reproducing the game to make a walkthrough requires the exact seed *and*
matching engine versions/parameters — effectively the walkthrough itseise
would have to be generated per seed. There is no fixed world to memorize.

## Project structure

```
index.html           entry point (import map + canvas)
src/main.js          bootstraps the game
src/core/seed.js     SeededRandom + SimplexNoise (deterministic)
src/core/engine.js   renderer, camera, input, game loop
src/generators/terrain.js   procedural heightfield + biome palettes
src/generators/textures.js  canvas texture factory
src/generators/audio.js     procedural Web Audio engine
src/entities/factory.js     rolled entity types + behavior state machine
src/systems/physics.js      custom heightfield physics engine
src/systems/player.js       first-person controller
src/systems/environment.js  sky/clouds/lights
src/systems/world.js        generation orchestrator + combat
src/ui/ui.js                HUD, minimap, start screen
```

Built with Three.js. MIT.