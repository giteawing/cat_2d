import { begin, T } from './lib.mjs';
const w = await begin(2); const { d, p, game } = w;

// playroom → pit at cols 24-29 (6 wide, metal bottom, 3 deep): jump in, jump out on the far side
w.walkTo(22.5); d.step(30); w.runJump(1, 20, 55); w.where('pit jump');
if (p.body.cx < 30 * T) { w.walkTo(29.2); w.jump(30); d.step(10); d.key('KeyD'); d.step(30); d.releaseAll(); d.step(30); w.where('pit climb'); }
if (p.body.cx < 30 * T) { w.selectWeapon('portal'); w.walkTo(28); d.step(60); w.peekAimClick('KeyW', 33 * T, 1 * T + 1, 2); w.aimClick(27 * T, 27 * T - 1, 0); w.walkTo(27); d.step(150); w.where('pit portal'); }
w.expect(p.body.cx > 30 * T && p.body.bottom <= 24 * T + 2, 'crossed the pit');
// tower (46-50, plate on the metal top row 11): ceiling portal above the tower + floor portal, drop a crate in
w.selectWeapon('portal'); w.walkTo(40); d.step(60);
w.peekAimClick('KeyW', 48 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && Math.abs(w.portal('orange').x - 48 * T) < 2.5 * T, `orange in the ceiling above the tower (${(w.portal('orange').x / T).toFixed(1)})`);
w.aimClick(38 * T, 24 * T - 1, 0);
w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor');
w.selectWeapon('gravity'); w.walkTo(34.5); d.step(30);
const crate = w.grab('crate', (b) => b.cx > 30 * T && b.cx < 36 * T); w.expect(!!crate, 'grabbed a crate');
const bp = w.portal('blue'); w.walkTo(bp.x / T - 2.2); d.step(20); w.dropAt(bp.x, bp.y - 30); d.step(200);
const plate = w.puzzle((q) => q.channel === 'doorB'); w.expect(plate.pressed, `plate pressed (crate at ${(crate.cx / T).toFixed(1)},${(crate.bottom / T).toFixed(1)})`);
const door = w.puzzle((q) => q.requires === 'doorB'); w.expect(door.open > 0.9, 'door open');
w.walkTo(53.5); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1 collected');
// lever + lift to the ledge at 70-76 (row 12), then the high ledge 84-90 (row 8) via ceiling portal
w.walkTo(62.5); d.step(20); w.interact();
w.expect(w.channel('lift1'), 'lever switched the lift on');
const lift = w.puzzle((q) => q.constructor.name === 'MovingPlatform'); w.expect(lift && lift.body, 'lift exists');
// board the lift when it is down (rests 2 tiles above the floor): stand beside it, jump on as it waits at the bottom
w.walkTo(63.3); d.step(10);
let boarded = false;
for (let i = 0; i < 1500 && !boarded; i++) {
  d.step(1);
  if (lift.t <= 0.01 && lift.pause > 0.8) { d.key('KeyD'); w.jump(16); d.step(20); d.releaseAll(); d.step(10); boarded = p.body.groundBody === lift.body; if (!boarded) w.walkTo(63.3); }
}
w.expect(boarded, 'boarded the lift');
for (let i = 0; i < 900 && !(lift.t >= 1 && lift.pause > 0.5); i++) d.step(1);
w.where('lift top');
w.expect(p.body.bottom <= 14 * T, 'rode the lift up');
w.runJump(1, 8, 45); w.where('ledge 70-76');
w.expect(p.body.cx > 69 * T && p.body.bottom <= 12 * T + 2, 'reached the ledge');
w.selectWeapon('portal'); d.step(30);
w.peekAimClick('KeyW', 87 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && Math.abs(w.portal('orange').x - 87 * T) < 2 * T, 'orange in the ceiling above the high ledge');
w.aimClick(74 * T, 12 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the ledge floor');
w.walkTo(74); d.step(180); w.where('high ledge'); w.walkTo(87.5); w.jump(20); d.step(40);
w.expect(game.giftsCollected === 2, 'bonus gift collected');
// drop back to the floor, smash the cracked wall with the big crate
w.walkTo(90); w.walk(1, 20, false); d.step(90); w.where('floor right');
w.selectWeapon('gravity'); w.walkTo(91); d.step(30);
const big = w.grab('bigCrate'); w.expect(!!big, 'grabbed the big crate');
w.walkTo(96.5); d.step(20); w.throwAt(101 * T, 22 * T); d.step(120);
const broken = [20, 21, 22, 23].every((r) => game.map.get(101, r) === 0);
w.expect(broken, 'cracked wall smashed');
// secret pocket (106-108, rows 16-19) above the corridor: portal in the pocket's ceiling, floor portal under the cat
w.selectWeapon('portal'); w.walkTo(107); d.step(60);
w.aimClick(106.6 * T, 16 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').x > 105.5 * T && w.portal('orange').x < 109 * T && w.portal('orange').y < 19.5 * T, `orange inside the secret pocket (${(w.portal('orange').x / T).toFixed(1)},${(w.portal('orange').y / T).toFixed(1)})`);
w.aimClick(105 * T, 24 * T - 1, 0); w.walkTo(105); d.step(150); w.where('after pocket');
w.expect(game.giftsCollected === 3, 'secret gift collected');
w.walkTo(116.5); d.step(120); w.where('exit');
w.done();
