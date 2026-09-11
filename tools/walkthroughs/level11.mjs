// World 2-3 "Лифтовая шахта": mirror on a lift, beam locks (!channel), routing a beam around a crate, flip in flight.
import { begin, T } from './lib.mjs';
const w = await begin(10); const { d, p, game } = w;
const lasers = game.puzzles.filter((q) => q.constructor.name === 'Laser');
const seg = (i) => lasers[i].segments.map((s) => [s.x0 / T, s.y0 / T, s.x1 / T, s.y1 / T].map((v) => +v.toFixed(1)));
const flipNear = (tx) => { w.walkTo(tx); d.step(5); w.interact(); d.step(20); };
const platforms = game.puzzles.filter((q) => q.constructor.name === 'MovingPlatform');

// ---- A: lever → lift; the mirror crosses the beam → rA latches; ride up for gift 1
w.walkTo(5.4); d.step(5); w.interact(); w.expect(w.channel('levA'), 'lever A → lift running');
let n = 0; while (!w.channel('rA') && n++ < 600) d.step(1);
w.expect(w.channel('rA'), `receiver A latched while the mirror crossed the beam (${n} frames)`);
// board the lift when it is low
n = 0; while (platforms[0].body.y < 24.5 * T && n++ < 900) d.step(1);
w.walkTo(11.8); d.step(5); d.hold('Space', 12); d.step(20); w.walkTo(11.8); d.step(5);
n = 0; while (platforms[0].body.y > 17.2 * T && n++ < 900) d.step(1);
w.where('lift top'); w.expect(p.body.bottom < 18 * T + 2, 'riding the lift up');
w.walkTo(15); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
w.walkTo(17); d.step(5); w.walk(1, 20, false); d.step(60); w.walkTo(30); d.step(10); w.expect(p.body.cx > 28 * T, 'through door A');
// ---- B: beam lock: the door is open only while the receiver is dark → crate into the beam
d.step(10); w.expect(w.channel('rB'), 'receiver B lit, door B locked');
w.walkTo(50.5); d.step(5); w.expect(w.climbTo(17), 'up ladder B');
w.walkTo(47.5); d.step(20); w.expect(game.giftsCollected === 2, 'gift 2');
w.selectWeapon('gravity'); const cB = w.grab('crate', (b) => b.cx < 50 * T); w.expect(!!cB, 'grabbed crate B on the shelf');
w.walkTo(46.3); d.step(10); w.dropAt(44 * T, 19 * T); d.step(120);   // drop it off the shelf edge: it falls into the beam
console.log('  B crate', (cB.cx / T).toFixed(1), (cB.bottom / T).toFixed(1), JSON.stringify(seg(1)));
w.expect(!w.channel('rB'), 'crate dropped into the beam → receiver dark → door B open');
w.walkTo(45.2); d.step(10); w.walk(-1, 25, false); d.step(60); w.expect(p.body.bottom > 25 * T, 'back on the floor');
w.walkTo(52); d.step(10); w.walkTo(61); d.step(10); w.expect(p.body.cx > 59 * T, 'through door B');
// ---- C: mirror '\' at 80 → beam up → ceiling portal above it; orange in the floor under the receiver; crate on the plate
w.walkTo(80); d.step(10); const mC = w.grab('mirror', (b) => b.cx > 81 * T); w.expect(!!mC, 'grabbed mirror C');
w.walkTo(78.3); d.step(10); w.dropAt(80.5 * T, 25.5 * T); d.step(60);
w.expect(mC.cx > 80 * T && mC.cx < 81 * T, `mirror C at ${(mC.cx / T).toFixed(2)}`);
if (mC.mirrorDir !== -1) flipNear(79);
w.walkTo(82.5); d.step(10); const cC = w.grab('crate', (b) => b.cx > 83 * T && b.cx < 88 * T); w.expect(!!cC, 'grabbed crate C');
w.walkTo(68.5); d.step(10); w.dropAt(66.5 * T, 25.5 * T); d.step(60); w.expect(w.channel('plC'), 'crate on plate C');
console.log('  C bent', JSON.stringify(seg(2)));
w.expect(seg(2).length >= 2 && seg(2)[1][3] < 14, 'beam bent up to the ceiling');
w.selectWeapon('portal'); w.walkTo(76); d.step(10);
w.peekAimClick('KeyW', mC.cx, 13 * T + 1, 0); const bC = w.portal('blue'); w.expect(bC.active && bC.ny > 0 && Math.abs(bC.x - mC.cx) < 20, `blue on the ceiling above the mirror (${(bC.x / T).toFixed(1)})`);
w.walkTo(66); d.step(10); w.aimClick(62.5 * T, 26 * T - 1, 2); const oC = w.portal('orange'); w.expect(oC.active && oC.ny < 0 && Math.abs(oC.x - 62.5 * T) < 20, 'orange in the floor under the receiver');
d.step(20); console.log('  C', JSON.stringify(seg(2)));
w.expect(w.channel('rC'), 'receiver C lit through the portals → door C open');
w.walkTo(79.5); d.step(5); w.expect(w.climbTo(19), 'up ladder C');
w.walkTo(77.5); d.step(20); w.expect(game.giftsCollected === 3, 'gift 3');
w.walkTo(75); d.step(40); w.walkTo(84); d.step(10); w.walkTo(93); d.step(10); w.expect(p.body.cx > 91 * T, 'through door C');
// ---- D: secret first: crate into the low beam → lid open
w.selectWeapon('gravity'); w.walkTo(101); d.step(10); const cD = w.grab('crate', (b) => b.cx > 100 * T); w.expect(!!cD, 'grabbed crate D');
w.walkTo(104); d.step(10); w.dropAt(106 * T, 25.5 * T); d.step(60);
w.expect(!w.channel('sec'), 'crate blocks the secret beam → lid open');
w.walkTo(107); d.step(5); w.enter(108.8); d.step(60); w.walkTo(108.8); d.step(30); w.expect(game.giftsCollected === 4, 'gift 5 (rare, secret)');
d.hold('Space', 14); d.step(10); w.walkTo(105); d.step(20); w.expect(p.body.bottom <= 26 * T + 1, 'out of the pit');
// lever → lift; board from the step, flip in flight
w.walkTo(92.4); d.step(5); w.interact(); w.expect(w.channel('levD'), 'lever D → lift running');
n = 0; while (!(platforms[1].t < 0.02 && platforms[1].pause > 1.5) && n++ < 3000) d.step(1);   // wait for the lift to rest at the step
w.walkTo(95.2); d.step(5); d.key('KeyD'); d.key('Space'); d.step(10); d.key('Space', false); d.step(25); d.releaseAll(); d.step(5); w.where('lift D');
w.expect(p.body.groundBody === platforms[1].body, 'standing on lift D');
const mD = game.world.bodies.find((b) => b.kind === 'mirror' && b.cx > 95 * T);
n = 0; while (!(mD.cx > 100.3 * T && platforms[1].dir > 0) && n++ < 1500) d.step(1);   // the mirror enters the beam
d.step(3); w.expect(w.channel('r1'), `r1 latched ${JSON.stringify(seg(3))}`);
d.tap('KeyE'); d.step(5); w.expect(mD.mirrorDir === -1, 'mirror flipped in flight (E)');
n = 0; while (!w.channel('r2') && n++ < 120) d.step(1); w.expect(w.channel('r2'), `r2 latched (${n} frames) → door D open ${JSON.stringify(seg(3))}`);
// gift 4: ride to the far end, jump up-left onto the shelf at row 20
n = 0; while (!(platforms[1].t > 0.99) && n++ < 1500) d.step(1); w.where('lift end');
d.key('KeyA'); d.key('Space'); d.step(14); d.key('Space', false); d.step(20); d.releaseAll(); d.step(20); w.where('shelf D');
w.walkTo(108.5); d.step(20); w.expect(game.giftsCollected === 5, 'gift 4 (big)');
w.walkTo(110); d.step(5); w.walk(1, 20, false); d.step(60); w.walkTo(113); d.step(10); w.walkTo(118); d.step(100);
w.expect(game.state === 'complete', 'exit reached');
w.shot('level11');
process.exit(w.done() ? 0 : 1);
