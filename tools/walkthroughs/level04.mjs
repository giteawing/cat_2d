import { createGame, Driver } from '../harness.mjs';
const { game, canvas } = await createGame();
const d = new Driver(game, canvas);
const T = 32;
d.startLevel(3); d.step(60); const p = d.p;
const where = (l) => console.log(l, 'x', (p.body.cx/T).toFixed(1), 'y', (p.body.bottom/T).toFixed(1), 'ground', p.body.onGround, 'gifts', game.giftsCollected);
const aimClick = (wx, wy, btn) => { d.aimVisible(wx, wy); d.step(20); d.click(btn); d.step(30); };
game.portals.onTeleport = ((o) => (b, f, t) => { o(b, f, t); if (b.kind === 'cat') console.log('  TELEPORT', f.color, '->', t.color, 'v', b.vx.toFixed(0), b.vy.toFixed(0)); })(game.portals.onTeleport);
const walkTo = (tx, max = 900) => { let n = 0; let dir = null; while (Math.abs(p.body.cx - tx * T) > 6 && n < max) { const want = tx * T > p.body.cx ? 'KeyD' : 'KeyA'; if (want !== dir) { d.releaseAll(); d.key(want); dir = want; } d.step(1); n++; if (p.body.hitWall && p.body.onGround) d.hold('Space', 12); } d.releaseAll(); d.step(5); return Math.abs(p.body.cx - tx * T) <= 8; };
const climbTo = (row) => { d.key('KeyW'); let n = 0; while (p.body.bottom > row * T + 2 && n < 600) { d.step(1); n++; } d.releaseAll(); d.step(5); };
// ---- A
walkTo(20); d.step(30); game.weapons.select('portal'); d.step(5);
aimClick(19.5 * T, 26 * T - 1, 0);                      // blue on the floor below the shelf edge
walkTo(17); climbTo(10); where('shelf');
aimClick(14 * T - 1, 7 * T, 2);                          // orange on the cannon wall, from the shelf (visible)
console.log('portals', game.portals.pair.map(q => `${q.color} ${(q.x/T).toFixed(1)},${(q.y/T).toFixed(1)}`));
d.hold('KeyD', 26); d.step(150); where('after fling');
if (p.body.cx < 29 * T) { console.log('FAILED to clear the pit'); }
// ---- B
walkTo(41); d.step(40); game.weapons.select('gravity'); d.step(5);
const ball = game.world.bodies.filter(b => b.kind === 'ball' && b.cx > 36*T && b.cx < 46*T).sort((a,b)=>Math.abs(a.cx-p.body.cx)-Math.abs(b.cx-p.body.cx))[0];
console.log('ball at', (ball.cx/T).toFixed(1));
d.aimVisible(ball.cx, ball.cy); d.step(10); d.click(0); d.step(60); console.log('held', game.weapons.held && game.weapons.held.kind);
const btn = game.puzzles.find(q => q.channel === 'btnB'); console.log('button at', (btn.x/T).toFixed(1), (btn.y/T).toFixed(1));
aimClick(btn.x + btn.w / 2, btn.y + btn.h / 2, 0); d.step(60); console.log('btnB on?', game.channels ? game.channels.get('btnB') : '?', 'door open', game.puzzles.find(q => q.requires === 'btnB').open.toFixed(2));
d.shot('l4b');
// ---- fan
walkTo(52.5); d.tap('KeyE'); d.step(10);
walkTo(56.5); d.step(200); where('fan top');
d.hold('KeyD', 60); where('on ledge?');
walkTo(72); where('through doorway'); walkTo(78); d.step(120); where('section C floor');
// ---- C: crate onto the high plate. Stand on the floor left of the shelf: the ceiling above the shelf is visible if we peek up.
game.weapons.select('portal'); d.step(5);
walkTo(78); d.step(40);
// the shelf ceiling (row 16) sits just above the top edge of the view: hold W until it has scrolled comfortably into
// view (about 200 px down from the top), aim at it while the gun settles, fire
d.key('KeyW'); for (let i = 0; i < 200 && game.camera.worldToScreen(0, 16 * T).y < 200; i++) d.step(1);
for (let i = 0; i < 12; i++) { d.aimVisible(89.5 * T, 16 * T + 1); d.step(1); } d.click(2); d.step(30);
d.releaseAll(); d.step(30);
console.log('orange', game.portals.pair[1].active, (game.portals.pair[1].x/T).toFixed(1), (game.portals.pair[1].y/T).toFixed(1), game.portals.pair[1].ny);
walkTo(79); d.step(90); where('before blue'); aimClick(76.5 * T, 26 * T - 1, 0); console.log('blue', (game.portals.pair[0].x/T).toFixed(1), (game.portals.pair[0].y/T).toFixed(2));
game.weapons.select('gravity'); d.step(5);
const crate = game.world.bodies.find(b => b.kind === 'crate' && b.cx < 84*T);
console.log('crate at', (crate.cx/T).toFixed(1));
d.aimVisible(crate.cx, crate.cy); d.step(10); d.click(0); d.step(60); console.log('held', game.weapons.held && game.weapons.held.kind);
const bp = game.portals.pair[0];
walkTo(bp.x / T + 2.2); d.step(20); d.aimVisible(bp.x, bp.y - 30); d.step(20); d.click(2); d.step(180);
const plate = game.puzzles.find(q => q.channel === 'plateC'); console.log('plate pressed', plate.pressed, 'crate at', (crate.cx/T).toFixed(1), (crate.bottom/T).toFixed(1), 'door C', game.puzzles.find(q => q.requires === 'plateC').open.toFixed(2));
d.shot('l4c');
// ---- D: through door C, break the cracked wall with the big crate
walkTo(100); where('past door C');
const big = game.world.bodies.find(b => b.kind === 'bigCrate'); console.log('bigCrate at', (big.cx/T).toFixed(1));
walkTo(big.cx / T - 2.5); d.step(30); d.aimVisible(big.cx, big.cy); d.step(10); d.click(0); d.step(70); console.log('held', game.weapons.held?.kind);
walkTo(111); d.step(20); d.aimVisible(116 * T + 4, 24 * T); d.step(20); d.click(0); d.step(120);
console.log('breakables left:', game.map.data ? [22,23,24,25].map(r => game.level.map[r].slice(116,121)).join('|') : '', 'broken tiles now:', [22,23,24,25].map(r => [116,117,118,119,120].map(c => game.map.get(c, r)).join('')).join('|'));
walkTo(125.5); where('exit alcove'); d.step(120); console.log('state', game.state, 'gifts', game.giftsCollected, '/', game.giftsTotal);
d.shot('l4d');
