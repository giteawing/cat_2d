// World 2-4 "Купол": fan-bobbing mirror, beam lock behind a field (crate through a portal), fan-lifted mirror for two
// receivers, lift mirror + floor mirror finale, third-mirror secret.
import { begin, T } from './lib.mjs';
const w = await begin(11); const { d, p, game } = w;
const lasers = game.puzzles.filter((q) => q.constructor.name === 'Laser');
const seg = (i) => lasers[i].segments.map((s) => [s.x0 / T, s.y0 / T, s.x1 / T, s.y1 / T].map((v) => +v.toFixed(1)));
const flipNear = (tx) => { w.walkTo(tx); d.step(5); w.interact(); d.step(20); };
const platforms = game.puzzles.filter((q) => q.constructor.name === 'MovingPlatform');
let n;

// ---- A: fan → the mirror bobs through the beam → rA latches; ride the fan to the gift shelf
w.walkTo(5.4); d.step(5); w.interact(); w.expect(w.channel('fanA'), 'lever A → fan on');
n = 0; while (!w.channel('rA') && n++ < 900) d.step(1);
w.expect(w.channel('rA'), `receiver A latched (${n} frames)`);
w.walkTo(8.4); d.step(10); w.walkTo(9.2); n = 0; while (p.body.bottom > 17.5 * T && n++ < 400) d.step(1); w.where('fan A top');
d.key('KeyD'); d.step(30); d.releaseAll(); d.step(30); w.where('shelf A');
w.expect(p.body.bottom <= 18 * T + 1, 'landed on shelf A'); w.walkTo(12.5); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
w.walkTo(15); d.step(5); w.walk(1, 20, false); d.step(60); w.walkTo(30); d.step(10); w.expect(p.body.cx > 28 * T, 'through door A');
// ---- B: orange on the wall beyond the field, blue in the floor here, crate into the blue portal
d.step(10); w.expect(w.channel('rB'), 'receiver B lit → door B locked');
w.selectWeapon('portal'); w.walkTo(36); d.step(20);
w.peekAimClick('KeyW', 44 * T, 13 * T + 1, 2); const oB = w.portal('orange'); w.expect(oB.active && oB.ny > 0 && oB.x > 42 * T, `orange on the ceiling beyond the field (${(oB.x / T).toFixed(1)},${(oB.y / T).toFixed(1)})`);
w.aimClick(37.5 * T, 26 * T - 1, 0); const bB = w.portal('blue'); w.expect(bB.active && bB.ny < 0, 'blue in the floor');
w.selectWeapon('gravity'); w.walkTo(34); d.step(10); const cB = w.grab('crate'); w.expect(!!cB, 'grabbed crate B from the ledge');
w.walkTo(35.5); d.step(10); w.dropAt(37.5 * T, 25 * T); d.step(150);
console.log('  crate B at', (cB.cx / T).toFixed(1), (cB.bottom / T).toFixed(1), JSON.stringify(seg(1)));
w.expect(cB.cx > 40 * T && !w.channel('rB'), 'crate beyond the field blocks the beam → door B open');
w.selectWeapon('portal'); w.enter(bB.x / T); d.step(120); w.where('beyond field'); w.expect(p.body.cx > 40 * T, 'teleported beyond the field');
w.walkTo(50.5); d.step(5); w.expect(w.climbTo(20), 'up ladder B');
w.walkTo(48.5); d.step(20); w.expect(game.giftsCollected === 2, 'gift 2');
w.walkTo(45); d.step(60); w.walkTo(53); d.step(10); w.walkTo(61); d.step(10); w.expect(p.body.cx > 59 * T, 'through door B');
// ---- C: mirror under the ceiling beam → floor beam left → c1; fan → mirror rises → c2
w.selectWeapon('gravity'); w.walkTo(68); d.step(10); const mC = w.grab('mirror', (b) => b.cx > 60 * T && b.cx < 80 * T); w.expect(!!mC, 'grabbed mirror C');
w.walkTo(69); d.step(10); w.dropAt(71.5 * T, 25.5 * T); d.step(60);
w.expect(mC.cx > 71 * T && mC.cx < 72 * T, `mirror C under the beam (${(mC.cx / T).toFixed(2)})`);
if (mC.mirrorDir !== 1) flipNear(70);
d.step(5); console.log('  C low', JSON.stringify(seg(2))); w.expect(w.channel('c1'), 'c1 (low) lit');
w.walkTo(64.4); d.step(5); w.interact(); w.expect(w.channel('fanC'), 'lever C → fan on');
n = 0; while (!w.channel('c2') && n++ < 900) d.step(1); console.log('  C high', JSON.stringify(seg(2)), 'mirror y', (mC.cy / T).toFixed(1));
w.expect(w.channel('c2'), `c2 (high) lit (${n} frames) → door C open`);
w.interact(); d.step(5); w.expect(!w.channel('fanC'), 'fan C off again (the mirror settles back)');
d.step(120);
w.walkTo(64.4); d.step(5); w.interact(); d.step(5); w.expect(w.channel('fanC'), 'fan C on again');
w.walkTo(69.5); d.step(5); w.walkTo(70.6); n = 0; while (p.body.bottom > 19.7 * T && n++ < 400) d.step(1); w.where('fan C top');
d.key('KeyD'); d.step(30); d.releaseAll(); d.step(30); w.where('shelf C');
w.walkTo(75.5); d.step(20); w.expect(game.giftsCollected === 3, 'gift 3');
w.walkTo(77); d.step(5); w.walk(1, 20, false); d.step(60); w.walkTo(91.5); d.step(10); w.expect(p.body.cx > 89.5 * T, 'through door C');
// ---- D: floor mirror '\' under the lift path, lift on → high beam caught → down → right → rD
w.walkTo(99.5); d.step(10); const m2 = w.grab('mirror', (b) => b.cx > 100 * T && b.cx < 103 * T); w.expect(!!m2, 'grabbed floor mirror D');
w.walkTo(96.7); d.step(10); w.dropAt(94.5 * T, 25.5 * T); d.step(60);
w.expect(m2.cx > 94 * T && m2.cx < 95 * T, `floor mirror under the shaft (${(m2.cx / T).toFixed(2)})`);
if (m2.mirrorDir !== -1) flipNear(96.5);
w.walkTo(98.4); d.step(5); w.interact(); w.expect(w.channel('liftD'), 'lever D → lift running');
n = 0; while (!w.channel('rD') && n++ < 1500) d.step(1); console.log('  D', JSON.stringify(seg(3)));
w.expect(w.channel('rD'), `rD latched (${n} frames) → door D open`);
// secret: third mirror '/' into the floor beam under the ceiling receiver (col 101) — the floor beam exists only while the
// lift mirror is aligned, so wait for the alignment
w.walkTo(107.5); d.step(10); const m3 = w.grab('mirror', (b) => b.cx > 106 * T); w.expect(!!m3, 'grabbed the third mirror from the ledge');
w.walkTo(103.3); d.step(10); w.dropAt(101.5 * T, 25.5 * T); d.step(60);
w.expect(m3.cx > 101 * T && m3.cx < 102 * T, `third mirror at ${(m3.cx / T).toFixed(2)}`);
if (m3.mirrorDir !== 1) flipNear(103);
n = 0; while (!w.channel('sec') && n++ < 1500) d.step(1); console.log('  D secret', JSON.stringify(seg(3)));
w.expect(w.channel('sec'), `secret receiver latched (${n} frames) → lid open`);
w.walkTo(103); d.step(5); w.enter(104.8); d.step(60); w.walkTo(104.8); d.step(30); w.expect(game.giftsCollected === 4, 'gift 5 (rare, secret)');
d.hold('Space', 14); d.step(10); w.walkTo(107); d.step(20); w.expect(p.body.bottom <= 26 * T + 1, 'out of the pit');
// gift 4: ride the lift up (board when it rests low), step off onto the shelf at row 15
w.walkTo(97); d.step(5); w.walkTo(91.5); d.step(10); w.expect(p.body.bottom <= 24 * T + 1, 'on the boarding step');
n = 0; while (!(platforms[0].t < 0.02 && platforms[0].pause > 1.0) && n++ < 3000) d.step(1);
d.key('KeyD'); d.key('Space'); d.step(10); d.key('Space', false); d.step(25); d.releaseAll(); d.step(5); w.where('lift D');
w.expect(p.body.groundBody === platforms[0].body, 'on the lift');
n = 0; while (platforms[0].t < 0.99 && n++ < 1500) d.step(1); w.where('lift top');
d.key('KeyD'); d.key('Space'); d.step(12); d.key('Space', false); d.step(30); d.releaseAll(); d.step(30); w.where('shelf D');
w.walkTo(98.5); d.step(20); w.expect(game.giftsCollected === 5, 'gift 4 (big)');
w.walkTo(100); d.step(5); w.walk(1, 20, false); d.step(80); w.walkTo(110); d.step(10); w.walkTo(118); d.step(100);
w.expect(game.state === 'complete', 'exit reached');
w.shot('level12');
process.exit(w.done() ? 0 : 1);
