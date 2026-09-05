# Cat Portal Adventure 2D

2D puzzle-platformer (NES/Mario feel + modern physics) starring an orange tabby cat with two tools:
a **Gravity Gun** (grab / carry / throw physics objects) and a **Portal Gun** (blue + orange linked portals on any
suitable brick surface — walls, floors, ceilings). No timers, no enemies — just puzzles, gifts and lots of stuff to throw.

Pure HTML5 / JavaScript (Canvas 2D, custom physics). No build step, no dependencies for the game itself.

## Run

Подробная инструкция на русском: [HOW_TO_RUN.md](HOW_TO_RUN.md).

```bash
npm start            # static server on http://localhost:8080  (node tools/serve.mjs [port])
```

Open `index.html` through the server (ES modules need http).

## Controls

| Key | Action |
|---|---|
| A / D, ← / → | walk |
| Shift | run |
| Space | jump (variable height, coyote time, jump buffer) |
| W / ↑ | climb ladder / look up |
| S / ↓ | crouch / climb down / look down; S + Space drops through thin platforms |
| 1 | Gravity Gun |
| 2 | Portal Gun |
| Mouse | aim (the cat turns and points the gun) |
| LMB (Gravity) | grab / throw held object |
| RMB (Gravity) | drop held object / punt |
| LMB / RMB (Portal) | blue / orange portal |
| E | interact (levers, buttons) / drop |
| M | music on/off |
| Esc | pause menu (restart, music, volume, level select) |
| R | restart level |

**Gamepad** (standard mapping): left stick / d-pad — move, A — jump, X — run, B/Y — interact, LB / RB — Gravity / Portal Gun,
RT / LT — primary / secondary fire, right stick — aim (a cursor orbits the cat's paws), Start — pause, Back — restart.
Hints switch to gamepad labels automatically; rumble on throws, portals, gifts and smashes where supported.

## World 1 (6 levels)

1. **Уютный дом** — movement, ladders, props, Gravity Gun.
2. **Первый портал** — portal as a door, floor→ceiling travel, crate onto a plate.
3. **Игровая комната** — objects through portals, lever + lift, breakable wall.
4. **Подвал** (lab) — momentum flings, thrown-object button, fan, ceiling delivery.
5. **Оранжерея** (garden) — two-plate AND door, chasm crossing, lift with a mid-ride shot, perch fling.
6. **Чердак** — finale combining everything.

Progress (unlocked/completed levels, gifts, secrets, settings) is saved in `localStorage`.

## Project layout

```
src/
  core/        game.js (state machine, loop, rendering), camera.js, input.js, save.js, util.js
  physics/     tilemap.js (tile types), body.js, world.js (AABB physics, stacking, breakables), props.js (prop catalog)
  portals/     portalManager.js (placement, apertures, teleport transform), portalRenderer.js
  weapons/     weapons.js (Gravity Gun + Portal Gun, held models, switching)
  characters/  cat/player.js (controller + animation state), cat/catSprite.js (procedural cat)
  puzzles/     puzzles.js (PressurePlate, Button, Lever, Door, MovingPlatform, Trigger, Fan, Channels)
  gifts/       gift.js
  levels/      mapBuilder.js, levelKit.js (level DSL), index.js (registry), world01/level0N.js
  render/      tileRenderer.js (themes: house / lab / garden), effects.js
  ui/          hud.js
  audio/       audio.js (procedural WebAudio sfx + music)
tools/
  harness.mjs  headless game (node + @napi-rs/canvas): Driver with key/mouse/aim/click/step/shot
  test.mjs     automated tests (physics, portals, weapons, level 1 playthrough, all-level sanity)
  smoke.mjs    screenshot pass
```

### Tile characters (maps)

`#` brick (portalable) · `X` metal (solid, no portals) · `=` one-way shelf · `H` ladder · `G` glass (solid, blocks shots)
· `|` grate (solid, portal shots pass through) · `B` breakable (smashed by a fast heavy thrown object) · `.` empty

### Adding a level

Create `src/levels/world01/level07.js` (see existing ones: `buildMap()` with `MapBuilder`, then a `setup(k)` using the
level kit: `k.prop`, `k.plate`, `k.door`, `k.lever`, `k.button`, `k.platform`, `k.fan`, `k.gift`, `k.secret`, `k.sign`,
`k.message`, `k.funRoom`, `k.stack`, `k.decor`) and register it in `src/levels/index.js`.
Channels connect activators to receivers: `k.plate(..., 'a')`, `k.door(..., 'a&b')` (also `a|b`, `!a`).

## Tests

```bash
cd tools && npm install     # once: @napi-rs/canvas for the headless harness
cd .. && npm test           # 78 checks
```
