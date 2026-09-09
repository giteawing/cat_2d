import { begin, T } from './lib.mjs';
const w = await begin(4); const { d, p, game } = w;

// ---- A: two plates, one door. Crate 1 → plate 1 (floor), crate 2 → plate 2 (pedestal), cat runs through while both are held
w.walkTo(8.5); d.step(20); w.selectWeapon('gravity');
const c1 = w.grab('crate', (b) => b.cx < 8 * T); w.expect(!!c1, 'grabbed crate 1');
w.walkTo(9.5); d.step(10); w.dropAt(9.75 * T, 27 * T); d.step(60); w.expect(w.channel('plA1'), 'plate 1 pressed by crate 1');
w.walkTo(17.5); d.step(20); const c2 = w.grab('crate', (b) => b.cx > 16 * T); w.expect(!!c2, 'grabbed crate 2');
w.walkTo(17.2); d.step(10); w.dropAt(15 * T, 25 * T); d.step(80); w.expect(w.channel('plA2'), 'plate 2 pressed by crate 2');
d.step(120); w.expect(w.puzzle((q) => q.requires === 'plA1&plA2').open > 0.95, 'door A open');
w.walkTo(28); d.step(30); w.where('past door A'); w.expect(p.body.cx > 25 * T, 'through door A');
// ---- B: canyon (cols 32-41): floor portal on the near edge, ceiling portal under the hanging block on the far side
w.selectWeapon('portal'); w.walkTo(31); d.key('KeyD'); d.step(3); d.releaseAll(); d.step(40);
w.peekAimClick('KeyW', 43.5 * T, 15 * T + 1, 2, 40);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').x > 42 * T, `orange under the hanging block (${(w.portal('orange').x / T).toFixed(1)},${(w.portal('orange').y / T).toFixed(1)})`);
w.aimClick(30 * T, 28 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor at the edge');
w.walkTo(30); for (let i = 0; i < 300; i++) { d.step(1); if (p.body.onGround && p.body.cx > 42 * T) break; }
w.where('far side'); w.expect(p.body.cx > 42 * T && p.body.bottom <= 28 * T + 2, 'crossed the canyon');
w.expect(game.giftsCollected === 1, 'gift 1 collected on the way down');
// ---- C: lever → lift. Carry a crate up, portal it (and yourself) onto the top ledge; the crate holds the plate → door C
w.walkTo(66.5); d.step(20); w.selectWeapon('gravity');
const c3 = w.grab('crate', (b) => b.cx > 60 * T && b.cx < 70 * T); w.expect(!!c3, 'grabbed crate 3');
w.walkTo(59.5); d.step(20); w.interact(); w.expect(w.channel('liftC'), 'lever switched the lift on');
const lift = w.puzzle((q) => q.constructor.name === 'MovingPlatform');
// board the lift while it waits at the bottom (rides 27 → 13)
w.walkTo(55); d.step(10); let boarded = false;
for (let i = 0; i < 2000 && !boarded; i++) { d.step(1); if (lift.t <= 0.01 && lift.pause > 1) { w.walkTo(57.5); d.step(10); boarded = p.body.groundBody === lift.body; } }
w.expect(boarded, 'boarded the lift'); w.expect(game.weapons.held === c3, 'still carrying the crate');
w.face(0);   // hold the crate on the left so it does not catch on the ledge's underside on the way up
for (let i = 0; i < 1200 && !(lift.t >= 1 && lift.pause > 0.5); i++) d.step(1);
w.where('lift top'); w.walkTo(62); d.step(20); w.where('greenhouse ledge');
w.expect(p.body.bottom <= 13 * T + 2 && p.body.cx > 59 * T, 'on the greenhouse ledge (row 13)');
// from the ledge: orange in the ceiling above the top ledge, blue in this ledge's floor; drop the crate in, then jump in
w.walkTo(64); d.step(10); w.dropAt(62 * T, 12 * T); d.step(40);   // set the crate down (switching weapons drops it anyway)
w.expect(c3.bottom <= 13 * T + 2 && c3.cx > 59 * T && c3.cx < 67 * T, `crate 3 parked on the ledge (${(c3.cx / T).toFixed(1)})`);
w.selectWeapon('portal'); w.walkTo(65.5); d.step(20); w.peekAimClick('KeyW', 80 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').y < 2 * T, `orange in the ceiling above the top ledge (${(w.portal('orange').x / T).toFixed(1)})`);
w.aimClick(63.5 * T, 13 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the ledge floor');
w.expect(!w.channel('doorC'), 'door C still closed before the crate is delivered');
w.selectWeapon('gravity'); w.walkTo(65.5); d.step(10); w.expect(w.grab('crate', (b) => b === c3), 'picked crate 3 up again'); w.dropAt(63.5 * T, 12 * T); d.step(200);
console.log('  crate 3 at', (c3.cx / T).toFixed(1), (c3.bottom / T).toFixed(1));
w.expect(w.channel('doorC'), 'crate 3 holds the plate on the top ledge → door C open');
w.walkTo(63.5); for (let i = 0; i < 300; i++) { d.step(1); if (p.body.onGround && p.body.bottom <= 8 * T + 2) break; }
w.where('top ledge'); w.expect(p.body.bottom <= 8 * T + 2 && p.body.cx > 76 * T, 'on the top ledge');
w.walkTo(79); w.jump(20); d.step(40); w.expect(game.giftsCollected === 2, 'bonus gift collected');
// down to the floor and through door C
w.walkTo(84); w.walk(1, 25, false); d.step(120); w.where('floor before door C');
w.walkTo(90); d.step(20); w.expect(p.body.cx > 88 * T, 'through door C');
// ---- D: the fling. Blue in the floor right of the pole, orange on the right face of the ceiling pillar; step off the perch
w.selectWeapon('portal'); w.walkTo(101); d.step(20);
w.peekAimClick('KeyW', 98 * T + 1, 4 * T, 2);
w.expect(w.portal('orange').active && w.portal('orange').nx > 0 && w.portal('orange').y < 5 * T, 'orange on the pillar face');
w.walkTo(99.5); d.step(20); w.aimClick(97.2 * T, 28 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor under the pillar');
w.walkTo(92.5); d.step(10); w.expect(w.climbTo(8), 'climbed the pole');
d.key('KeyD'); d.step(25); d.releaseAll(); d.step(20); w.where('perch');
d.key('KeyD'); d.step(30); d.releaseAll(); for (let i = 0; i < 400; i++) { d.step(1); if (p.body.onGround && i > 60) break; }
w.where('after fling'); w.expect(p.body.cx > 108 * T && p.body.bottom <= 10 * T + 2, 'flung onto the high shelf');
w.walkTo(113); w.jump(20); d.step(40); w.expect(game.giftsCollected === 3, 'rare gift collected');
// ---- secret: shelf (row 20, cols 128-138) above the exit. Ceiling portal above it + floor portal before the exit
w.walkTo(118); w.walk(1, 25, false); d.step(150); w.where('floor after shelf');
w.walkTo(128); d.step(30); w.selectWeapon('portal');
w.peekAimClick('KeyW', 134 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').x > 131 * T, 'orange in the ceiling above the secret shelf');
w.aimClick(129 * T, 28 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor');
w.walkTo(129); for (let i = 0; i < 400; i++) { d.step(1); if (p.body.onGround && p.body.bottom <= 20 * T + 2) break; }
w.where('secret shelf'); w.expect(p.body.bottom <= 20 * T + 2, 'landed on the secret shelf');
w.walkTo(134); d.step(30); w.expect(game.giftsCollected === 4, 'secret gift collected');
// drop to the exit
w.walkTo(134); d.key('KeyS'); d.step(15); d.tap('Space'); d.step(20); d.releaseAll(); d.step(90);   // the shelf is a one-way platform: crouch + jump drops through it
w.walkTo(134); d.step(120); w.where('exit');
w.done();
