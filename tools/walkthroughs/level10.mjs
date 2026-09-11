// World 2-2 "Зеркальный зал": mirror chains, lever-powered laser through a grate, two lasers / one mirror, 3 receivers.
import { begin, T } from './lib.mjs';
const w = await begin(9); const { d, p, game } = w;
const lasers = game.puzzles.filter((q) => q.constructor.name === 'Laser');
const seg = (i) => lasers[i].segments.map((s) => [s.x0 / T, s.y0 / T, s.x1 / T, s.y1 / T].map((v) => +v.toFixed(1)));
const flipNear = (tx) => { w.walkTo(tx); d.step(5); w.interact(); d.step(20); };

// ---- A: mirror 1 under the beam, flip; climb to the shelf, flip mirror 2
w.selectWeapon('gravity'); w.walkTo(6); d.step(10);
const mA = w.grab('mirror', (b) => b.cx < 8 * T); w.expect(!!mA, 'grabbed mirror A1');
w.walkTo(7.8); d.step(10); w.dropAt(9.5 * T, 25.5 * T); d.step(60);
w.expect(mA.cx > 9 * T && mA.cx < 10 * T, `mirror A1 under the beam (${(mA.cx / T).toFixed(2)})`);
flipNear(8); console.log('  A1 dir', mA.mirrorDir, JSON.stringify(seg(0)));
w.expect(mA.mirrorDir === 1 && seg(0).length >= 2 && seg(0)[1][3] < 21, 'beam A bent upwards to the shelf mirror');
w.walkTo(12.5); d.step(5); w.expect(w.climbTo(20), 'up the ladder to the shelf');
w.walkTo(10.8); d.step(10); w.interact(); d.step(20); console.log('  A2', JSON.stringify(seg(0)));
w.expect(w.channel('rA'), 'receiver A lit → door A open');
w.walkTo(12.5); d.step(5); w.expect(w.climbTo(17), 'up to the gift shelf');
w.walkTo(14.5); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
w.walkTo(19); d.step(40); w.walkTo(29); d.step(10); w.expect(p.body.cx > 27 * T, 'through door A');
// ---- B: lever powers the laser; mirror under it; portal through the grate
w.walkTo(34.4); d.step(5); w.interact(); w.expect(w.channel('levB') && lasers[1].on, 'lever B → laser on');
const mB = w.grab('mirror', (b) => b.cx > 28 * T && b.cx < 32 * T); w.expect(!!mB, 'grabbed mirror B');
w.walkTo(38.3); d.step(10); w.dropAt(40.5 * T, 25.5 * T); d.step(60);
w.expect(mB.cx > 40 * T && mB.cx < 41 * T, `mirror B under the beam (${(mB.cx / T).toFixed(2)})`);
if (!w.channel('rB')) flipNear(39); console.log('  B', mB.mirrorDir, JSON.stringify(seg(1)));
w.expect(w.channel('rB'), 'receiver B lit through the grate → door B open');
w.selectWeapon('portal'); w.walkTo(44); d.step(10);
w.aimClick(56 * T + 1, 20 * T, 2); const oB = w.portal('orange'); w.expect(oB.active && oB.nx < 0 && oB.x > 55 * T, 'orange on the wall beyond the grate');
w.aimClick(42 * T, 26 * T - 1, 0); const bB = w.portal('blue'); w.expect(bB.active && bB.ny < 0, 'blue in the floor');
w.enter(bB.x / T); d.step(120); w.where('past grate'); w.expect(p.body.cx > 47 * T, 'teleported past the grate');
w.walkTo(50.5); d.step(20); w.expect(game.giftsCollected === 2, 'gift 2');
w.walkTo(60); d.step(10); w.expect(p.body.cx > 57 * T, 'through door B');
// ---- C: mirror onto the shelf (beam 1 → up → c1); secret via portals; mirror under beam 2 (→ right → c2)
w.selectWeapon('gravity'); w.walkTo(63); d.step(10);
const mC = w.grab('mirror', (b) => b.cx > 58 * T && b.cx < 66 * T); w.expect(!!mC, 'grabbed mirror C');
w.walkTo(66.3); d.step(10); w.expect(p.body.bottom <= 25 * T + 1, 'on the step with the mirror'); w.dropAt(63.5 * T, 24.5 * T); d.step(60);
console.log('  C shelf mirror at', (mC.cx / T).toFixed(2), (mC.bottom / T).toFixed(2), 'dir', mC.mirrorDir, JSON.stringify(seg(2)));
w.expect(mC.bottom <= 25 * T + 1 && mC.cx > 63 * T && mC.cx < 65 * T, 'mirror sits on the shelf under beam 1');
if (!w.channel('c1')) flipNear(65); console.log('  C1', mC.mirrorDir, JSON.stringify(seg(2)));
w.expect(w.channel('c1'), 'ceiling receiver c1 lit');
// gift 3: onto the mirror shelf (auto-jump at its edge), then a jump right+up to the gift shelf
w.walkTo(65.5); d.step(5); d.key('KeyD'); d.key('Space'); d.step(14); d.key('Space', false); d.step(30); d.releaseAll(); d.step(20); w.where('gift shelf C');
w.walkTo(68.5); d.step(20); w.expect(game.giftsCollected === 3, 'gift 3');
w.walkTo(71); d.step(40);
// secret: blue in the floor under beam 2 (col 72), orange on the right wall at the pillar receiver's height (row 15.5)
w.selectWeapon('portal'); w.walkTo(80); d.step(10);
w.aimClick(87 * T - 1, 18.5 * T, 2); const oC = w.portal('orange'); w.expect(oC.active && oC.nx < 0 && Math.abs(oC.y - 18.5 * T) < 12, `orange on the right wall (${(oC.y / T).toFixed(1)})`);
w.walkTo(76); d.step(10); w.aimClick(72.5 * T, 26 * T - 1, 0); const bC = w.portal('blue'); w.expect(bC.active && bC.ny < 0 && Math.abs(bC.x - 72.5 * T) < 20, 'blue under beam 2');
d.step(20); console.log('  C secret', JSON.stringify(seg(3)));
w.expect(w.channel('sec'), 'secret receiver lit → lid open');
w.walkTo(81); d.step(5); w.enter(82.8); d.step(60); w.walkTo(82.8); d.step(30); w.expect(game.giftsCollected === 4, 'gift 5 (rare, secret)');
d.hold('Space', 14); d.step(10); w.walkTo(79); d.step(20); w.expect(p.body.bottom <= 26 * T + 1 && p.body.cx < 81 * T, 'out of the pit');
// mirror under beam 2 (no floor portals on the way back: park the blue one on the right wall)
w.walkTo(79.5); d.step(10); w.aimClick(78 * T + 1, 17 * T, 0); d.step(5); w.expect(w.portal('blue').nx > 0 && w.portal('blue').x > 77 * T, 'blue parked on the pillar');
w.selectWeapon('gravity'); w.walkTo(66); d.step(10);
const mC2 = w.grab('mirror', (b) => b === mC); w.expect(!!mC2, 'grabbed the shelf mirror again');
w.walkTo(70.3); d.step(10); w.dropAt(72.5 * T, 25.5 * T); d.step(60);
w.expect(mC.cx > 72 * T && mC.cx < 73 * T, `mirror under beam 2 (${(mC.cx / T).toFixed(2)})`);
if (!w.channel('c2')) flipNear(71); console.log('  C2', mC.mirrorDir, JSON.stringify(seg(3)));
w.expect(w.channel('c2'), 'wall receiver c2 lit → door C open');
w.walkTo(90.5); d.step(10); w.expect(p.body.cx > 88 * T, 'through door C');
// ---- D: mirror 1 under the beam → left (r1); flip → right → mirror 2 '/' → up (r3); remove mirror 2 → right (r2)
w.walkTo(97); d.step(10); const m1 = w.grab('mirror', (b) => b.cx > 93 * T && b.cx < 98 * T); w.expect(!!m1, 'grabbed mirror D1');
w.walkTo(98.3); d.step(10); w.dropAt(100.5 * T, 25.5 * T); d.step(60);
w.expect(m1.cx > 100 * T && m1.cx < 101 * T, `mirror D1 under the beam (${(m1.cx / T).toFixed(2)})`);
if (!w.channel('r1')) flipNear(99); console.log('  D r1', m1.mirrorDir, JSON.stringify(seg(4)));
w.expect(w.channel('r1'), 'r1 (left) lit');
flipNear(99); console.log('  D flipped', m1.mirrorDir, JSON.stringify(seg(4)));
w.walkTo(107); d.step(10); const m2 = w.grab('mirror', (b) => b.cx > 105 * T); w.expect(!!m2, 'grabbed mirror D2');
w.walkTo(106.3); d.step(10); w.dropAt(108.5 * T, 25.5 * T); d.step(60);
w.expect(m2.cx > 108 * T && m2.cx < 109 * T, `mirror D2 in the beam (${(m2.cx / T).toFixed(2)})`);
if (!w.channel('r3')) flipNear(107); console.log('  D r3', m2.mirrorDir, JSON.stringify(seg(4)));
w.expect(w.channel('r3'), 'r3 (ceiling) lit');
const m2b = w.grab('mirror', (b) => b === m2); w.expect(!!m2b, 'picked mirror D2 up again');
w.walkTo(103.5); d.step(10); w.dropAt(102 * T, 22 * T); d.step(60);   // carry it out of the beam and drop it on the near side
console.log('  D r2', JSON.stringify(seg(4)));
w.expect(w.channel('r2'), 'r2 (right) lit → door D open');
// gift 4: step (90) → shelf 92-94 (row 21) → shelf 96-98 (row 18)
w.walkTo(91.5); d.step(5); d.key('KeyA'); d.key('Space'); d.step(14); d.key('Space', false); d.step(20); d.releaseAll(); d.step(20); w.where('step');
w.walkTo(90.5); d.step(5); d.key('KeyD'); d.key('Space'); d.step(14); d.key('Space', false); d.step(30); d.releaseAll(); d.step(20); w.where('shelf 1');
w.walkTo(94.3); d.step(5); d.key('KeyD'); d.key('Space'); d.step(14); d.key('Space', false); d.step(30); d.releaseAll(); d.step(20); w.where('shelf 2');
w.walkTo(97); d.step(20); w.expect(game.giftsCollected === 5, 'gift 4 (big)');
w.walkTo(101); d.step(40); w.walkTo(110); d.step(10); w.walkTo(118); d.step(100);
w.expect(game.state === 'complete', 'exit reached');
w.shot('level10');
process.exit(w.done() ? 0 : 1);
