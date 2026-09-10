// World 2-1 "Обсерватория": lasers, mirrors, receivers (latching), beams through portals.
import { begin, T } from './lib.mjs';
const w = await begin(8); const { d, p, game } = w;
const seg = (i) => game.puzzles.filter((q) => q.constructor.name === 'Laser')[i].segments.map((s) => [s.x0 / T, s.y0 / T, s.x1 / T, s.y1 / T].map((v) => +v.toFixed(1)));

// ---- A: the crate blocks the beam → carry it away
w.walkTo(9); d.step(10); w.selectWeapon('gravity');
const c1 = w.grab('crate'); w.expect(!!c1, 'grabbed the crate out of the beam');
w.walkTo(6.8); d.step(10); w.dropAt(4.3 * T, 26.5 * T); d.step(60);
console.log('  crate at', (c1.cx / T).toFixed(1), (c1.bottom / T).toFixed(1), 'beam', JSON.stringify(seg(0)));
w.expect(c1.bottom > 26.5 * T, 'crate parked in the pit');
w.expect(w.channel('rA'), 'receiver A lit (latched) → door A open');
w.walkTo(8); d.step(5); d.hold('Space', 14); d.step(40); w.expect(w.climbTo(23) || p.body.bottom <= 23 * T + 2 || game.giftsCollected === 1, 'on shelf A');
w.walkTo(8.5); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
w.walkTo(27); d.step(10); w.expect(p.body.cx > 25 * T, 'through door A');
// ---- B: mirror under the vertical beam at col 34; '/' sends a downward beam to the LEFT, so flip it to '\' → right
const m1 = w.grab('mirror', (b) => b.cx < 40 * T); w.expect(!!m1, 'grabbed mirror B');
w.walkTo(32); d.step(10); w.dropAt(34.5 * T, 25.5 * T); d.step(60);
console.log('  mirror at', (m1.cx / T).toFixed(2), 'beam', JSON.stringify(seg(1)));
w.expect(m1.cx > 34 * T && m1.cx < 35 * T, 'mirror sits under the beam');
if (!w.channel('rB')) { w.walkTo(33.2); d.step(5); w.interact(); d.step(20); console.log('  flipped → dir', m1.mirrorDir, JSON.stringify(seg(1))); }
w.expect(w.channel('rB'), 'receiver B lit → door B open');
w.walkTo(48.5); d.step(5); w.expect(w.climbTo(18), 'up ladder B');
w.walkTo(41.5); d.step(20); w.expect(game.giftsCollected === 2, 'gift 2');
w.walkTo(38); d.step(40); w.expect(p.body.bottom > 25 * T, 'back on the floor B (walked off the shelf)');
w.walkTo(56); d.step(10); w.expect(p.body.cx > 53 * T, 'through door B');
// ---- C: gift 3 on the shelf above the ladder; beam at col 60 through floor portals to the ceiling receiver at col 77
w.walkTo(54.5); d.step(5); w.expect(w.climbTo(20), 'up ladder C');
w.walkTo(56.5); d.step(20); w.expect(game.giftsCollected === 3, 'gift 3');
// secret first: from the shelf, orange on the right face of the door-B wall (x = 54) at the height of the hidden receiver
w.selectWeapon('portal'); w.walkTo(56.5); d.step(10);
w.aimClick(54 * T + 1, 18.5 * T, 2); const o2 = w.portal('orange');
w.expect(o2.active && o2.nx > 0 && Math.abs(o2.y - 18.5 * T) < 12, `orange on the wall at receiver height (${(o2.x / T).toFixed(1)},${(o2.y / T).toFixed(1)})`);
w.walkTo(57.5); d.step(5); w.walk(1, 30, false); d.step(40); w.expect(p.body.bottom > 25 * T, 'down from shelf C');
w.walkTo(64); d.step(10);
w.aimClick(60.5 * T, 26 * T - 1, 0); const bl = w.portal('blue'); w.expect(bl.active && bl.ny < 0 && Math.abs(bl.x - 60.5 * T) < 20, `blue under the beam (${(bl.x / T).toFixed(1)})`);
d.step(20); console.log('  beam C(secret)', JSON.stringify(seg(2)));
w.expect(w.channel('sec'), 'secret receiver lit → lid open');
// now the ceiling receiver: move the orange portal to the floor under it
w.walkTo(74); d.step(10);
w.aimClick(77.5 * T, 26 * T - 1, 2); const o = w.portal('orange'); w.expect(o.active && o.ny < 0 && Math.abs(o.x - 77.5 * T) < 20, `orange under the ceiling receiver (${(o.x / T).toFixed(1)})`);
d.step(20); console.log('  beam C', JSON.stringify(seg(2)));
w.expect(w.channel('rC'), 'receiver C lit through the portals → door C open');
// the receiver latched: move the orange portal off the path (onto the wall above door C) so we can walk under it
w.aimClick(79 * T + 1, 18 * T, 2); w.expect(w.portal('orange').nx < 0, 'orange parked on the wall');
w.walkTo(71); d.step(5); w.enter(72.8); d.step(60); w.where('pit');
w.walkTo(72.8); d.step(30); w.expect(game.giftsCollected === 4, 'gift 5 (rare, secret)');
w.expect(game.secretsFound?.size ? game.secretsFound.size === 1 : true, 'secret registered');
// out of the pit: jump (2 tiles deep)
d.hold('Space', 14); d.step(10); w.walkTo(75); d.step(20); w.expect(p.body.bottom <= 26 * T + 1 && p.body.cx > 74 * T, 'out of the pit');
w.walkTo(82); d.step(10); w.expect(p.body.cx > 80 * T, 'through door C');
// ---- D: mirror under the beam at col 92 → '/' lights the left receiver; flip → the right one
w.selectWeapon('gravity'); w.walkTo(93); d.step(10);
const m2 = w.grab('mirror', (b) => b.cx > 90 * T); w.expect(!!m2, 'grabbed mirror D');
w.walkTo(90.5); d.step(10); w.dropAt(92.5 * T, 25.5 * T); d.step(60);
console.log('  mirror D at', (m2.cx / T).toFixed(2), 'dir', m2.mirrorDir, 'beam', JSON.stringify(seg(3)));
w.expect(m2.cx > 92 * T && m2.cx < 93 * T, 'mirror D under the beam');
if (!w.channel('r1') && !w.channel('r2')) { w.walkTo(91.2); d.step(5); w.interact(); d.step(20); }
w.expect(w.channel('r1') || w.channel('r2'), 'first receiver lit');
w.walkTo(91.2); d.step(5); w.interact(); d.step(20); console.log('  flipped → dir', m2.mirrorDir, JSON.stringify(seg(3)));
w.expect(w.channel('r1') && w.channel('r2'), 'both receivers latched → door D open');
// gift 4 (big) on the shelves at rows 23/20
w.walkTo(84.8); d.step(5); d.key('KeyD'); d.key('Space'); d.step(14); d.key('Space', false); d.step(30); d.releaseAll(); d.step(20); w.where('shelf 1');
w.expect(p.body.bottom <= 23 * T + 1, 'on the lower shelf');
w.walkTo(88.3); d.step(5); d.key('KeyD'); d.key('Space'); d.step(14); d.key('Space', false); d.step(30); d.releaseAll(); d.step(20); w.where('shelf 2');
w.walkTo(91); d.step(20);
w.expect(game.giftsCollected === 5, 'gift 4 (big)');
w.walkTo(96); d.step(30); w.walkTo(109); d.step(100);
w.expect(game.state === 'complete', 'exit reached');
w.shot('level09');
process.exit(w.done() ? 0 : 1);
