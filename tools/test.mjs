// Automated gameplay tests run against the real game code (headless).
import { createGame, Driver } from './harness.mjs';
import { TILE } from '../src/core/util.js';
import { TileMap } from '../src/physics/tilemap.js';
import { World } from '../src/physics/world.js';
import { PortalManager } from '../src/portals/portalManager.js';
import { makeProp } from '../src/physics/props.js';
import { Player } from '../src/characters/cat/player.js';
import { Laser, LaserReceiver, Channels } from '../src/puzzles/puzzles.js';

let fails = 0, passes = 0;
function check(name, cond, info = '') { if (cond) { passes++; console.log('  ✓', name); } else { fails++; console.log('  ✗', name, info); } }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------ unit: physics world in a test room
function room(lines) { const map = TileMap.fromStrings(lines); const world = new World(map); const portals = new PortalManager(map, world); world.portals = portals; return { map, world, portals }; }
const R = [
  '####################',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '#..................#',
  '####################',
];
{
  console.log('Physics: falling & resting');
  const { world } = room(R);
  const b = world.add(makeProp('crate', 100, 100));
  for (let i = 0; i < 240; i++) world.step(1 / 120);
  check('crate lands on the floor', near(b.bottom, 11 * TILE, 0.5) && b.onGround, `bottom=${b.bottom}`);
  const c = world.add(makeProp('crate', 100, 100));
  for (let i = 0; i < 300; i++) world.step(1 / 120);
  check('second crate stacks on the first', near(c.bottom, b.y, 1) && c.onGround, `c.bottom=${c.bottom} b.y=${b.y}`);
  const d = world.add(makeProp('ball', 300, 300)); d.vx = -400;
  for (let i = 0; i < 400; i++) world.step(1 / 120);
  check('ball stays inside the room', d.x >= TILE && d.right <= 19 * TILE && d.bottom <= 11 * TILE + 0.5, `x=${d.x}`);
}
{
  console.log('Portals: placement rules');
  const { map, world, portals } = room(R);
  const r1 = portals.shoot('blue', 200, 200, 1, 0, null);
  check('blue portal lands on the right wall', r1.ok && portals.blue.nx === -1 && near(portals.blue.x, 19 * TILE, 0.01), JSON.stringify(r1.reason));
  check('portal y equals the hit y (free placement, ≤6px edge snap)', near(portals.blue.y, 200, 6), `y=${portals.blue.y}`);
  const r2 = portals.shoot('orange', 200, 200, 0, 1, null);
  check('orange portal lands on the floor', r2.ok && portals.orange.ny === -1 && near(portals.orange.y, 11 * TILE, 0.01));
  check('orange x equals the hit x (≤6px edge snap)', near(portals.orange.x, 200, 6), `x=${portals.orange.x}`);
  const r2b = portals.shoot('orange', 213, 200, 0, 1, null);
  check('a shot away from tile edges is placed exactly', r2b.ok && near(portals.orange.x, 213, 0.01), `x=${portals.orange.x}`);
  // near a corner: shoot at the floor 5px from the left wall → must shift right or reject, never hang in the air
  const r3 = portals.shoot('orange', 40, 200, -0.02, 1, null);
  check('corner shot is shifted to a valid spot', r3.ok && portals.orange.x - 34 >= TILE - 0.01, `x=${portals.orange.x} reason=${r3.reason}`);
  // ceiling
  const r4 = portals.shoot('blue', 300, 200, 0, -1, null);
  check('portal on the ceiling', r4.ok && portals.blue.ny === 1 && near(portals.blue.y, TILE, 0.01));
  // metal is not portalable
  const M = R.map((l, i) => (i === 11 ? 'XXXXXXXXXXXXXXXXXXXX' : l));
  const t2 = room(M);
  const r5 = t2.portals.shoot('blue', 200, 200, 0, 1, null);
  check('metal floor rejects portals', !r5.ok && r5.reason === 'surface');
  // a shot through a grate hits the wall behind it
  const G = R.map((l, i) => (i >= 3 && i <= 8 ? l.slice(0, 10) + '|' + l.slice(11) : l));
  const t3 = room(G);
  const r6 = t3.portals.shoot('blue', 100, 200, 1, 0, null);
  check('grate lets the portal shot through', r6.ok && near(t3.portals.blue.x, 19 * TILE, 0.01), `x=${t3.portals.blue.x}`);
}
{
  console.log('Portals: teleporting a crate wall→wall');
  const { world, portals } = room(R);
  portals.shoot('blue', 200, 300, 1, 0, null);                 // right wall at y=300
  portals.shoot('orange', 200, 300, -1, 0, null);              // left wall at y=300
  const b = world.add(makeProp('crate', 400, 316)); b.gravityScale = 0; b.vx = 500; // bottom at 316 → centre y=300
  let teleported = false; portals.onTeleport = () => { teleported = true; };
  for (let i = 0; i < 120 && !teleported; i++) world.step(1 / 120);
  check('crate teleports', teleported);
  check('crate exits at the left wall moving right', b.x < 200 && b.vx > 300, `x=${b.x} vx=${b.vx}`);
  for (let i = 0; i < 20; i++) world.step(1 / 120);
  check('crate keeps moving after exit (no re-teleport, no stuck)', b.x > TILE + 40 && b.vx > 300, `x=${b.x} vx=${b.vx}`);
}
{
  console.log('Portals: floor → wall flings the crate out horizontally (velocity transform)');
  const { world, portals } = room(R);
  portals.shoot('blue', 200, 200, 0, 1, null);                 // floor at x=200
  portals.shoot('orange', 300, 200, 1, 0, null);               // right wall at y=200 (normal -1,0)
  const b = world.add(makeProp('crate', 184, 60));
  let tp = null; portals.onTeleport = (body, from, to) => { tp = { vx: body.vx, vy: body.vy, x: body.x, y: body.y }; };
  for (let i = 0; i < 240 && !tp; i++) world.step(1 / 120);
  check('crate fell into the floor portal', !!tp);
  check('exit velocity points out of the wall portal (-x)', tp && tp.vx < -300 && Math.abs(tp.vy) < 60, JSON.stringify(tp));
  for (let i = 0; i < 20; i++) world.step(1 / 120);
  check('crate travels left after the fling', b.x < 19 * TILE - 120, `x=${b.x}`);
}
{
  console.log('Portals: floor→floor: walking onto a floor portal drops the cat; it lands on top of the other one');
  const { world, portals } = room(R);
  const p = new Player(120, 11 * TILE - 54); world.add(p.body);
  for (let i = 0; i < 60; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  portals.shoot('blue', 260, 200, 0, 1, null);                 // floor portal at x=260
  portals.shoot('orange', 500, 200, 0, 1, null);               // floor portal at x=500
  let tps = 0; portals.onTeleport = () => { tps++; };
  p.setInput({ right: true });
  for (let i = 0; i < 70; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  p.setInput({ right: false });
  for (let i = 0; i < 120; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  check('cat fell into the blue portal exactly once', tps === 1, `tps=${tps}`);
  check('cat stands on top of the orange portal', p.onGround && near(p.body.cx, 500, 40) && near(p.body.bottom, 11 * TILE, 1), `cx=${p.body.cx} bottom=${p.body.bottom} ground=${p.onGround}`);
  p.setInput({ down: true });
  for (let i = 0; i < 120 && tps < 2; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  check('pressing S drops the cat through the portal it stands on', tps === 2, `tps=${tps}`);
  p.setInput({ down: false });
  for (let i = 0; i < 240; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  check('cat ends up standing on the blue portal', p.onGround && near(p.body.cx, 260, 40) && tps === 2, `cx=${p.body.cx} tps=${tps}`);
  // jump in place → falls back in
  p.input.jumpPressed = true; p.setInput({ jump: true });
  for (let i = 0; i < 200; i++) { world.step(1 / 120); p.update(1 / 120, world); if (i === 10) p.setInput({ jump: false }); }
  check('jumping on a floor portal falls back into it', tps >= 3, `tps=${tps}`);
}
{
  console.log('Portals: opening a floor portal under a resting crate drops it through');
  const { world, portals } = room(R);
  const c = world.add(makeProp('crate', 184, 11 * TILE));
  for (let i = 0; i < 60; i++) world.step(1 / 120);
  portals.shoot('blue', 200, 200, 0, 1, null);
  portals.shoot('orange', 300, 200, 0, -1, null);              // ceiling
  let tp = false; portals.onTeleport = () => { tp = true; };
  for (let i = 0; i < 120 && !tp; i++) world.step(1 / 120);
  check('resting crate falls into a portal opened beneath it', tp);
  for (let i = 0; i < 400; i++) world.step(1 / 120);
  check('crate eventually settles (no infinite loop)', c.onGround && Math.abs(c.vy) < 1, `vy=${c.vy} y=${c.y}`);
}
{
  console.log('Portals: cat walks through a wall portal and comes out of a ceiling portal falling');
  const { world, portals } = room(R);
  portals.shoot('blue', 200, 320, 1, 0, null);                 // right wall
  portals.shoot('orange', 300, 200, 0, -1, null);              // ceiling at x=300
  const p = new Player(500, 200); world.add(p.body);
  p.setInput({ right: true, run: true });
  let tp = false; portals.onTeleport = () => { tp = true; };
  for (let i = 0; i < 600 && !tp; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  check('cat teleported through the wall portal', tp);
  p.setInput({ right: false, run: false });
  for (let i = 0; i < 240; i++) { world.step(1 / 120); p.update(1 / 120, world); }
  check('cat lands on the floor below the ceiling portal', p.onGround && near(p.body.bottom, 11 * TILE, 1) && near(p.body.cx, 300, 80), `cx=${p.body.cx} bottom=${p.body.bottom}`);
}

// ------------------------------------------------------------ integration: level 1 through the game
{
  console.log('Level 1: full playthrough of the vertical slice');
  const { game, canvas } = await createGame();
  const d = new Driver(game, canvas);
  d.startLevel(0);
  check('level loaded with gifts', game.giftsTotal === 3);
  check('cat starts on the ground', d.p.onGround);
  // walk right up the steps
  d.key('KeyD'); d.key('ShiftLeft');
  for (let i = 0; i < 16; i++) { d.step(8); if (d.p.body.hitWall) d.hold('Space', 14); }
  d.releaseAll();
  check('cat climbed the steps', d.p.x > 17 * TILE, `x=${d.p.x}`);
  // teleport the cat helper for the rest (we test movement separately)
  const tp = (tx, ty) => { d.p.body.x = tx * TILE; d.p.body.y = ty * TILE - 54; d.p.body.vx = 0; d.p.body.vy = 0; d.step(2); };
  tp(40, 12); d.step(20);
  check('gravity gun picked up', game.weapons.available.gravity && game.weapons.current === 'gravity');
  d.shot('t_l1_gravity');
  // grab the crate at tile 44
  const crate = game.world.bodies.find((b) => b.kind === 'crate');
  tp(42, 12); d.step(5);
  d.aimWorld(crate.cx, crate.cy); d.step(2);
  check('crosshair hovers the crate', game.weapons.hoverBody === crate);
  d.click(0); d.step(70);
  check('crate is held', game.weapons.held === crate, `held=${game.weapons.held && game.weapons.held.kind} pulling=${!!game.weapons.pulling}`);
  d.shot('t_l1_hold');
  // carry it onto the plate and drop
  d.key('KeyD'); d.step(50); d.releaseAll();
  const plate = game.puzzles.find((p) => p.channel === 'd1');
  d.aimWorld(plate.x + plate.w / 2, plate.y - 20); d.step(2);
  d.click(2); d.step(90);
  check('crate presses the plate', plate.pressed, `crate at ${crate.x},${crate.bottom} plate ${plate.x}`);
  const door = game.puzzles.find((p) => p.requires === 'd1');
  check('door opened', door.open > 0.9);
  d.shot('t_l1_door');
  // walk through the door and collect the gift
  tp(51, 12); d.key('KeyD'); d.step(80); d.releaseAll();
  check('gift 1 collected', game.giftsCollected >= 1, `x=${d.p.x} collected=${game.giftsCollected}`);
  // fun room: throw stuff
  tp(66, 20); d.step(5);
  const cups = game.world.bodies.filter((b) => b.kind === 'cup').length;
  check('kitchen has lots of clutter', game.world.bodies.length > 60 && cups >= 8, `bodies=${game.world.bodies.length} cups=${cups}`);
  const pot = game.world.bodies.find((b) => b.kind === 'pot' && b.x > 66 * TILE);
  d.step(90); // let the camera settle
  d.aimWorld(pot.cx, pot.cy); d.step(10); d.aimWorld(pot.cx, pot.cy); d.step(5); d.click(0); d.step(60);
  const target = game.weapons.held;
  check('an object was grabbed in the kitchen', !!target, `held=${game.weapons.held?.kind}`);
  d.aimWorld(d.p.cx + 200, d.p.cy - 60); d.step(2); d.click(0); d.step(5);
  check('pot thrown fast', !target.held && Math.hypot(target.vx, target.vy) > 400, `v=${target.vx},${target.vy}`);
  d.step(90);
  d.shot('t_l1_kitchen');
  // exit
  tp(90, 20); d.step(30);
  check('level completes at the exit', game.state === 'complete' || game.levelDoneTimer >= 0, `state=${game.state}`);
  check('progress saved', game.save.level('w1l1').completed && game.save.level('w1l1').gifts.length >= 1);
}

// ------------------------------------------------------------ all levels: load sanity
{
  console.log('Levels: load sanity');
  const { LEVELS } = await import('../src/levels/index.js');
  const { game, canvas } = await createGame();
  const d = new Driver(game, canvas);
  check('world 1 has 8 levels, world 2 has started', LEVELS.filter((L) => (L.world || 1) === 1).length === 8 && LEVELS.filter((L) => L.world === 2).length >= 1, `n=${LEVELS.length}`);
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    d.startLevel(i); d.step(30);
    const p = d.p.body, map = game.map;
    const startFree = !map.rectHitsSolid(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    check(`${L.id}: cat starts in free space`, startFree, `${p.x},${p.y}`);
    check(`${L.id}: gift count matches`, game.giftsTotal === L.giftCount, `${game.giftsTotal} vs ${L.giftCount}`);
    const e = game.exit; const exitFree = e && !map.rectHitsSolid(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
    check(`${L.id}: exit is reachable space`, !!exitFree);
    let inside = 0;
    for (const b of game.world.bodies) if (!b.dead && b.type === 'dynamic' && map.rectHitsSolid(b.x + 2, b.y + 2, b.w - 4, b.h - 4)) inside++;
    check(`${L.id}: no props stuck in walls`, inside === 0, `${inside} stuck`);
    // physics stays calm: after 3 seconds no grounded body keeps a large velocity
    d.step(150);
    let jitter = 0;
    for (const b of game.world.bodies) if (!b.dead && b.onGround && Math.abs(b.vy) > 30) jitter++;
    check(`${L.id}: no resting jitter`, jitter === 0, `${jitter} bodies`);
    // every gift sits in free space
    let giftIn = 0; for (const g of game.gifts) if (map.rectHitsSolid(g.x, g.y, g.w, g.h)) giftIn++;
    check(`${L.id}: gifts not inside walls`, giftIn === 0, `${giftIn}`);
  }
}

// ------------------------------------------------------------ unit: electric fields & quantum tunneling
{
  console.log('Electric fields & quantum tunneling');
  const F = R.map((l, y) => (y >= 1 && y <= 10 ? l.slice(0, 10) + '~' + l.slice(11) : l));   // field wall at col 10
  // a thrown crate bounces back elastically
  { const { world } = room(F); const b = world.add(makeProp('crate', 8 * TILE, 8 * TILE)); b.vx = 600;
    for (let i = 0; i < 30; i++) world.step(1 / 120);
    check('thrown crate bounces off the field', b.vx < -400 && b.right <= 10 * TILE + 0.01, `vx=${b.vx} right=${b.right}`); }
  // portal shot passes through the field
  { const { portals } = room(F); const r = portals.shoot('blue', 100, 200, 1, 0, null);
    check('portal shot passes through the field', r.ok && near(portals.blue.x, 19 * TILE, 0.01), `x=${portals.blue.x} ${JSON.stringify(r.reason)}`); }
  // the cat: mode off → bounce; mode on + slow → bounce; mode on + fast → 25% via rng
  const { Player } = await import('../src/characters/cat/player.js');
  const runAt = (tunneling, speed, rng) => {
    const { world } = room(F); world.rng = rng;
    const p = new Player(200, 11 * TILE - 54); world.add(p.body); p.tunnelUnlocked = true; p.toggleTunneling(tunneling);
    p.setInput({ left: false, right: true, up: false, down: false, jump: false, run: speed > 200 });
    let events = []; world.onField = (b, kind) => events.push(kind);
    for (let i = 0; i < 90; i++) { world.step(1 / 120); if (i < 5) p.update(1 / 120, world); }
    return { p, events };
  };
  { const { p, events } = runAt(false, 300, () => 0); check('mode off: cat bounces (even with a lucky roll)', events[0] === 'bounce' && p.body.right <= 10 * TILE + 0.01, `${events} x=${p.body.cx}`); }
  { const { p, events } = runAt(true, 190, () => 0); check('mode on, walking (no run-up): cat bounces', events[0] === 'bounce' && p.body.right <= 10 * TILE + 0.01, `${events} x=${p.body.cx}`); }
  { const { p, events } = runAt(true, 300, () => 0.9); check('mode on, running, unlucky roll: elastic bounce', events[0] === 'bounce' && p.body.right <= 10 * TILE + 0.01, `${events} x=${p.body.cx}`); }
  { const { p, events } = runAt(true, 300, () => 0.1); check('mode on, running, lucky roll: tunnels through', events[0] === 'pass' && p.body.x >= 11 * TILE - 0.01, `${events} x=${p.body.cx}`); }
  { const { p, events } = runAt(true, 300, () => 0.24); check('threshold: roll 0.24 passes (25%)', events[0] === 'pass', `${events}`); }
  { const { p, events } = runAt(true, 300, () => 0.26); check('threshold: roll 0.26 bounces', events[0] === 'bounce', `${events}`); }
  // field floor: a fall bounces, a settled body stands
  { const G = R.map((l, y) => (y === 8 ? l.slice(0, 5) + '~~~~~~' + l.slice(11) : l));
    const { world } = room(G); const b = world.add(makeProp('crate', 6 * TILE, 2 * TILE));
    let bounced = false; for (let i = 0; i < 600; i++) { world.step(1 / 120); if (b.vy < -200) bounced = true; }
    check('crate bounces on a field floor, then settles on it', bounced && b.onGround && near(b.bottom, 8 * TILE, 0.5) && Math.abs(b.vy) < 1, `bounced=${bounced} bottom=${b.bottom} vy=${b.vy}`); }
}

// ------------------------------------------------------------ lasers, mirrors, receivers (World 2)
{
  console.log('Lasers: beam, mirror, receiver, portals, blocking');
  const { map, world, portals } = room(R);
  const game = { map, world, portals, channels: new Channels(), puzzles: [], sfx() {} };
  const L = new Laser(1.5 * TILE, 10.5 * TILE, 1, 0); const rc = new LaserReceiver(10.5 * TILE, 6.5 * TILE, 'lz', { nx: 0, ny: 1, latch: false });
  game.puzzles.push(L, rc);
  const step = (n = 1) => { for (let i = 0; i < n; i++) { world.step(1 / 60); for (const q of game.puzzles) q.update(1 / 60, game); } };
  step(5);
  const end = () => L.segments[L.segments.length - 1];
  check('beam runs straight to the far wall', L.segments.length === 1 && near(end().x1, 19 * TILE, 0.5), JSON.stringify(L.segments));
  const m = world.add(makeProp('mirror', 10 * TILE, 11 * TILE, { dir: 1 })); step(10);
  check("'/' mirror bends a rightward beam upwards", L.segments.length === 2 && end().y1 < end().y0, JSON.stringify(L.segments));
  check('receiver above the mirror is lit → channel on', rc.on && game.channels.test('lz'));
  m.mirrorDir = -1; step(2);
  check("'\\' mirror bends it downwards, receiver goes dark (non-latching)", end().y1 > end().y0 && !rc.on && !game.channels.test('lz'));
  m.mirrorDir = 1; step(2);
  const rl = new LaserReceiver(3.5 * TILE, 2.5 * TILE, 'lz2', { nx: 1, ny: 0 }); game.puzzles.push(rl);
  portals.shoot('blue', 10.5 * TILE, 5 * TILE, 0, -1, null); portals.shoot('orange', 5 * TILE, 2.5 * TILE, 1, 0, null);
  rc.box.y = -100; step(2);   // move the first receiver out of the way
  check('beam enters the ceiling portal and leaves the wall portal', L.segments.length === 3 && near(end().y0, portals.orange.y, 3) && end().x1 < end().x0, JSON.stringify(L.segments));
  check('receiver behind the portals is lit', rl.on && game.channels.test('lz2'));
  portals.blue.active = false; step(2);
  check('latching receiver stays on after the beam is gone', rl.on && game.channels.test('lz2'));
  const c = world.add(makeProp('crate', 5 * TILE, 11 * TILE)); step(10);
  check('a crate blocks the beam (and is marked lit)', L.segments.length === 1 && near(end().x1, c.x, 1) && c.laserLit === true, JSON.stringify(L.segments));
  c.dead = true; step(2);
  const cat = new Player(6 * TILE, 9 * TILE); world.add(cat.body); step(10);
  check('the cat never blocks a beam', L.segments.length >= 2 && end().x0 > 9 * TILE, JSON.stringify(L.segments));
}
{
  console.log('Level 2-1: mirror flip with E, receiver latch');
  const { LEVELS } = await import('../src/levels/index.js');
  const idx = LEVELS.findIndex((L) => L.id === 'w2l1');
  const { game, canvas } = await createGame(); const d = new Driver(game, canvas);
  d.startLevel(idx); d.step(30);
  check('level 2-1 loads with 4 lasers and the observatory theme', game.puzzles.filter((q) => q instanceof Laser).length === 4 && game.level.theme === 'observatory');
  const m = game.world.bodies.find((b) => b.kind === 'mirror' && b.cx > 90 * TILE); const p = game.player.body;
  m.x = 92 * TILE; p.x = 90.5 * TILE; p.y = 26 * TILE - p.h; p.vx = 0; d.step(40);
  check("mirror under the beam ('/') lights the LEFT receiver", game.channels.test('r1') && !game.channels.test('r2'));
  d.tap('KeyE'); d.step(20);
  check('E next to the mirror flips it → RIGHT receiver, left stays latched', m.mirrorDir === -1 && game.channels.test('r1') && game.channels.test('r2'));
  const door = game.puzzles.find((q) => q.requires === 'r1&r2'); d.step(60);
  check('door D opens', door && door.open > 0.9, door && door.open);
}

// ------------------------------------------------------------ world summary screen after the last level of a world
{
  console.log('World summary screen');
  const { LEVELS } = await import('../src/levels/index.js');
  const last1 = LEVELS.map((L, i) => [L, i]).filter(([L]) => (L.world || 1) === 1).pop()[1];
  const { game, canvas } = await createGame(); const d = new Driver(game, canvas);
  d.startLevel(last1); d.step(5); game.state = 'complete'; game.completeTimer = 2;
  d.tap('Enter'); d.step(1); check('last level of world 1 → world summary', game.state === 'worldDone' && game.worldDoneWorld === 1, game.state);
  let ok = true; try { d.step(90); } catch (e) { ok = false; console.log(e); } check('summary renders without errors', ok);
  d.tap('Enter'); d.step(2); check('Enter → level select', game.state === 'select', game.state);
  d.startLevel(LEVELS.length - 1); d.step(5); game.state = 'complete'; game.completeTimer = 2; d.tap('Enter'); d.step(1);
  check('last level of the campaign → world 2 summary', game.state === 'worldDone' && game.worldDoneWorld === 2, game.state + ' ' + game.worldDoneWorld);
  ok = true; try { d.step(30); } catch (e) { ok = false; console.log(e); } check('world 2 summary renders', ok);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
