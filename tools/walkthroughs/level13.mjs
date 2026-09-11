// Level 3-1 "Аквариум": swimming, diving for a gift, an underwater secret, a well that fills, buoyancy sorting (metal
// cube onto an underwater plate), and a raft that lifts a mirror into a beam.
import { begin, T } from './lib.mjs';
const w = await begin(12); const { game, d, p } = w;
const waters = game.puzzles.filter((q) => q.constructor.name === 'Water');
let n;
// ---- A: swim across the pool, dive for gift 1, secret tunnel on the left
w.walkTo(6.5); d.step(60); w.expect(p.swimming, 'cat swims in the pool');
d.key('KeyD'); d.key('KeyS'); n = 0; while (p.body.bottom < 29.8 * T && n++ < 300) d.step(1); d.key('KeyD', false);
n = 0; while (Math.abs(p.body.cx - 10.5 * T) > 6 && n++ < 400) { d.key(p.body.cx < 10.5 * T ? 'KeyD' : 'KeyA'); d.step(1); d.releaseAll(); d.key('KeyS'); }
d.step(20); w.where('pool bottom'); w.expect(game.giftsCollected === 1, 'gift 1 (dive)');
// secret: along the bottom to the left, into the tunnel (cols 2-4, rows 28-29)
d.key('KeyA'); n = 0; while (p.body.cx > 3 * T && n++ < 600) d.step(1); d.releaseAll(); d.step(30); w.where('tunnel');
w.expect(game.giftsCollected === 2, 'gift 5 (rare, secret tunnel)');
// back out: swim right along the bottom, then surface and hop out at the right edge
d.key('KeyS'); d.key('KeyD'); n = 0; while (p.body.cx < 7 * T && n++ < 600) d.step(1); d.key('KeyS', false); d.key('KeyW');
n = 0; while (p.body.cx < 15.3 * T && n++ < 600) d.step(1); d.releaseAll(); d.step(30); w.where('right edge');
d.key('KeyD'); d.hold('Space', 14); d.step(40); d.releaseAll(); d.step(20); w.where('out');
w.expect(!p.swimming && p.body.onGround && p.body.cx > 16 * T, 'hopped out onto the bank');
// ---- B: ladder up, drop into the well, lever → fills → float up to the rim → gift 2
w.walkTo(24.4); d.step(5); w.expect(w.climbTo(14), "climbed ladder B"); w.where("ladder top");
w.walkTo(26.5, 400); d.step(120); w.where('in the well'); w.expect(p.swimming, 'swimming in the well');
w.walkTo(27.6); d.step(10); w.interact(); w.expect(w.channel('fillB'), 'valve B open');
n = 0; while (waters[1].level < 11 / 12 - 0.001 && n++ < 1500) d.step(1); w.where('well full');
w.expect(p.body.y < 16 * T, 'floated up with the water');
w.walkTo(37.3); d.step(10); d.key('KeyD'); d.hold('Space', 14); d.step(30); d.releaseAll(); d.step(20); w.where('rim B');
w.expect(!p.swimming && p.body.cx > 38 * T, 'hopped onto the rim');
w.walkTo(39.3); d.step(20); w.expect(game.giftsCollected === 3, 'gift 2');
w.walkTo(43); d.step(10); w.walk(1, 20, false); d.step(90); w.where('down');
// ---- C: carry the metal cube across the pool and let it sink onto the plate
w.walkTo(48.5); d.step(5); w.selectWeapon('gravity');
// the crate in the way floats — ignore it; swim across first
w.walkTo(59.5, 1200); d.step(10); d.key('KeyD'); d.hold('Space', 14); d.step(40); d.releaseAll(); d.step(10); w.where('C right bank');
w.walkTo(60.5); d.step(10); const cube = w.grab('cube'); w.expect(!!cube, 'grabbed the metal cube');
w.walkTo(54, 900); d.step(20); w.where('over the plate'); w.expect(p.swimming && game.weapons.held === cube, 'swimming with the cube');
d.aimVisible(54 * T, p.body.bottom); d.step(10); d.click(2); d.step(150);
console.log('  cube at', (cube.cx / T).toFixed(2), (cube.bottom / T).toFixed(2));
w.expect(w.channel('plC'), 'cube sank onto the plate → door C open');
w.walkTo(59.5, 900); d.step(10); d.key('KeyD'); d.hold('Space', 14); d.step(40); d.releaseAll(); d.step(10);
w.walkTo(64); d.step(5); d.hold('Space', 16); d.step(50); w.walkTo(64.3); d.step(20); w.expect(game.giftsCollected === 4, 'gift 3');
w.walkTo(66); d.step(5); w.walk(1, 20, false); d.step(40); w.walkTo(72); d.step(10); w.expect(p.body.cx > 70 * T, 'through door C');
// ---- D: ladder, drop into the tank, valve → the raft with the mirror rises into the beam → receiver → door D
w.walkTo(74.4); d.step(5); w.expect(w.climbTo(14), "climbed ladder D"); w.walkTo(76.5, 400); d.step(120); w.expect(p.swimming, 'in the tank');
w.walkTo(78.6); d.step(10); w.interact(); w.expect(w.channel('fillD'), 'valve D open');
n = 0; while (!w.channel('rD') && n++ < 1500) d.step(1); w.where('tank');
w.expect(w.channel('rD'), `raft mirror caught the beam (${n} frames) → door D open`);
n = 0; while (waters[3].level < 0.999 && n++ < 900) d.step(1);
w.walkTo(95.3); d.step(10); d.key('KeyD'); d.hold('Space', 14); d.step(30); d.releaseAll(); d.step(20); w.where('rim D');
w.expect(!p.swimming && p.body.cx > 95.5 * T, 'hopped onto rim D');
w.walkTo(97.3); d.step(20); w.expect(game.giftsCollected === 5, 'gift 4 (big)');
w.walkTo(100); d.step(5); w.walk(1, 20, false); d.step(90); w.walkTo(108); d.step(10); w.walkTo(111.5); d.step(100);
w.expect(game.state === 'complete', 'exit reached');
w.shot('level13');
process.exit(w.done() ? 0 : 1);
