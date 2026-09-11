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
| Q (or F) | toggle Quantum Tunneling mode (once picked up, level 7+): run into a potential barrier → 25% chance to pass through, otherwise an elastic bounce. The cat gets a glowing blue outline while the mode is on |
| Space | jump (variable height, coyote time, jump buffer) |
| W / ↑ | climb ladder / look up |
| S / ↓ | crouch / climb down / look down; S + Space drops through thin platforms; in water: dive (W surfaces, Space at the surface hops out) |
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

## World 1 (8 levels)

1. **Уютный дом** — movement, ladders, props, Gravity Gun.
2. **Первый портал** — portal as a door, floor→ceiling travel, crate onto a plate.
3. **Игровая комната** — objects through portals, lever + lift, breakable wall.
4. **Подвал** (lab) — momentum flings, thrown-object button, fan, ceiling delivery.
5. **Оранжерея** (garden) — two-plate AND door, chasm crossing, lift with a mid-ride shot, perch fling.
6. **Чердак** — finale combining everything.
7. **Квантовая лаборатория** — potential barriers (`~` tiles: thin floor-to-ceiling walls, a barrier floor and a barrier ceiling) and the Quantum Tunneling mode (Q): 25% chance to run through a barrier, elastic bounce otherwise. Objects always bounce; portal shots pass through barriers.
8. **Генераторная** — switchable fields (`FieldGate`: a plate / button / lever powers a field down; `plD&levD` style AND-requirements), a field as an upper floor, portals through permanent fields, and a tunneling-only secret.

After the last level of a world a **world summary** screen lists every level with its gifts and secrets.

## World 2 — Обсерватория (4 levels)

New mechanic: **lasers**. `Laser` emitters shoot a red beam that stops at solid tiles (grates and fields let it pass),
is bounced 90° by **mirror cubes** (a grabbable prop; `E` next to a cube flips its diagonal `/` ↔ `\`), travels through
linked portals (in anywhere within the aperture, out of the other portal's centre) and powers `LaserReceiver`s.
Receivers **latch** by default — once lit they stay on — so crossing a beam never locks a door behind the cat, and a
single beam can light several receivers one after another. Crates and other props block beams; the cat never does.

1. **Обсерватория** — crate out of the beam, mirror under a ceiling beam (wrong way round: flip it), beam through floor
   portals to a ceiling receiver, a wall-portal secret, and a one-beam/two-receivers finale.
2. **Зеркальный зал** — two-mirror chain (one on a shelf), a lever-powered emitter whose beam crosses a grate (portal
   through), two lasers / one mirror (latching lets you reuse it), a pillar-receiver secret and a 3-receivers/2-mirrors finale.
3. **Лифтовая шахта** — a mirror riding a lift through a beam, **beam locks** (`!rB` with a non-latching receiver: the door
   is open only while the beam is blocked — park a crate in it), a beam routed mirror → ceiling portal → floor portal, and a
   flip-in-flight finale on a horizontal lift.
4. **Купол** — the World 2 finale: a mirror bobbing in a fan column, a beam lock behind a permanent field (crate through a
   ceiling portal), one fan-lifted mirror for two receivers at different heights, and a lift mirror → floor mirror →
   receiver chain with a third-mirror secret. Finale: **refraction** — a tilted beam falls into a chamber; a valve fills it
   with an optically dense gas (`Medium`, n = 1.5) and the beam bends at the surface by Snell's law onto a floor receiver
   (a dashed ghost shows the un-bent path; the haze and an `n = …` readout show the medium).

## World 3 — Аквариум (in progress, 1 level)

New mechanic: **water** (`Water` zones). The cat swims (A/D paddle, S dive, W surface, Space at the surface hops out
~2 tiles); every prop has a density — wood, soft toys, the rubber duck and hollow barrels float, metal/ceramic/glass
sink; a valve (channel) fills or drains a tank and whatever floats rises with it. Water is also an optical medium
(n = 1.33), so tilted beams refract at the surface.

1. **Аквариум** — swim across a pool and dive for a gift (underwater secret tunnel), a well that fills to lift the cat to
   the rim, a pressure plate on a pool floor that only a sinking metal cube can hold, and a raft carrying a mirror that a
   rising tank lifts into a ceiling beam.

Progress (unlocked/completed levels, gifts, secrets, settings) is saved in `localStorage`.

## Project layout

```
src/
  core/        game.js (state machine, loop, rendering), camera.js, input.js, save.js, util.js
  physics/     tilemap.js (tile types), body.js, world.js (AABB physics, stacking, breakables), props.js (prop catalog)
  portals/     portalManager.js (placement, apertures, teleport transform), portalRenderer.js
  weapons/     weapons.js (Gravity Gun + Portal Gun, held models, switching)
  characters/  cat/player.js (controller + animation state), cat/catSprite.js (procedural cat)
  puzzles/     puzzles.js (PressurePlate, Button, Lever, Door, MovingPlatform, Trigger, Fan, FieldGate, Laser, LaserReceiver, Channels)
  gifts/       gift.js
  levels/      mapBuilder.js, levelKit.js (level DSL), index.js (registry), world01/level0N.js, world02/level0N.js
  render/      tileRenderer.js (themes: house / lab / garden / observatory), effects.js
  ui/          hud.js
  audio/       audio.js (procedural WebAudio sfx + music)
tools/
  harness.mjs  headless game (node + @napi-rs/canvas): Driver with key/mouse/aim/click/step/shot
  test.mjs     automated tests (physics, portals, weapons, level 1 playthrough, all-level sanity)
  smoke.mjs    screenshot pass
  catsheet.mjs cat pose sheets → tools/out/catsheet.png, catbig.png, catidle.png
  walkthroughs/ real-input playthroughs of every level (npm run walk)
```

Cat idle flourishes (after a few seconds standing still): look around, stretch/yawn, sniff, tail flick, groom, look at the gun, sit down — and, every second sit-down, a 5-second "smoke break" where the cat blows little smoke rings shaped like cat faces.

### Tile characters (maps)

`#` brick (portalable) · `X` metal (solid, no portals) · `=` one-way shelf · `H` ladder · `G` glass (solid, blocks shots)
· `|` grate (solid, portal shots pass through) · `B` breakable (smashed by a fast heavy thrown object) · `.` empty

### Adding a level

Create `src/levels/world02/level02.js` (see existing ones: `buildMap()` with `MapBuilder`, then a `setup(k)` using the
level kit: `k.prop`, `k.plate`, `k.door`, `k.lever`, `k.button`, `k.platform`, `k.fan`, `k.fieldGate`, `k.laser(tx,ty,dir)`,
`k.receiver(tx,ty,channel,{face})`, `k.gift`, `k.secret`, `k.sign`, `k.message`, `k.funRoom`, `k.stack`, `k.decor`) and register it
in `src/levels/index.js` (`world: 2, number: N` — the world summary appears after the last level of each world).
Channels connect activators to receivers: `k.plate(..., 'a')`, `k.door(..., 'a&b')` (also `a|b`, `!a`).

## Tests

```bash
cd tools && npm install     # once: @napi-rs/canvas for the headless harness
cd .. && npm test           # 171 checks
npm run walk                # plays all 13 levels start-to-finish with real inputs only (keys + visible aim targets), every gift collected
```

`tools/walkthroughs/levelNN.mjs` are the per-level scripts (each prints ✓/✗ per step and a final RESULT line); `lib.mjs` holds the shared helpers (walkTo, runJump, climbTo, peekAimClick, grab/dropAt/throwAt, enter…).
