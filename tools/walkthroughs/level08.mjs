import { begin, T } from './lib.mjs';
const w = await begin(7); const { d, p, game } = w;
const gate = (tx) => game.puzzles.find((q) => q.constructor.name === 'FieldGate' && q.tx === tx);

function tunnel(dir, pastX, max = 900) {
  d.key('ShiftLeft'); d.key(dir > 0 ? 'KeyD' : 'KeyA');
  let i = 0; for (; i < max; i++) { d.step(1); if (dir > 0 ? p.body.cx > pastX * T : p.body.cx < pastX * T) break; }
  d.releaseAll(); d.step(10);
  const ok = dir > 0 ? p.body.cx > pastX * T : p.body.cx < pastX * T;
  console.log(`  tunnel ${ok ? 'OK' : 'FAILED'} (${i} frames)`); if (!ok) w.where('  stuck');
  return ok;
}

// ---- A: crate on the plate → gate A off
w.walkTo(6); d.step(10); w.selectWeapon('gravity');
const c1 = w.grab('crate'); w.expect(!!c1, 'grabbed crate 1');
w.walkTo(7.5); d.step(10); w.dropAt(9.75 * T, 29 * T); d.step(90);
w.expect(w.channel('plA'), 'plate A pressed'); w.expect(gate(14).on === false && game.map.get(14, 25) === 0, 'gate A powered down');
w.walkTo(18); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
// ---- B: permanent field; orange on the brick wall beyond it (col 46, rows 14-25), blue in the floor here
w.selectWeapon('portal'); w.walkTo(32); d.step(20);
w.aimClick(46 * T + 1, 22 * T, 2); const o = w.portal('orange');
w.expect(o.active && o.nx < 0 && o.x > 45 * T, `orange on the wall beyond the field (${(o.x / T).toFixed(1)},${(o.y / T).toFixed(1)})`);
w.aimClick(30 * T, 30 * T - 1, 0); const bl = w.portal('blue'); w.expect(bl.active && bl.ny < 0, 'blue in the floor');
w.enter(bl.x / T); d.step(120); w.where('past field B'); w.expect(p.body.cx > 36 * T, 'teleported past the permanent field');
w.walkTo(41); d.step(20); w.expect(game.giftsCollected === 2, 'gift 2');
w.walkTo(43.4); d.step(5); w.interact(); w.expect(w.channel('levB'), 'lever B');
w.walkTo(52); d.step(20); w.expect(p.body.cx > 48 * T, 'through door B');
// ---- C: up the ladder; button powers the field floor down; crate into the hole → plate C
w.walkTo(56.5); d.step(5); w.expect(w.climbTo(18), 'up to the upper floor');
w.walkTo(63.5); d.step(5); w.interact(); w.expect(w.channel('btnC'), 'button C pressed');
d.step(20); w.expect(gate(70).on === false, 'field floor powered down');
w.selectWeapon('gravity'); w.walkTo(65); d.step(10); const c2 = w.grab('crate', (b) => b.cx > 60 * T); w.expect(!!c2, 'grabbed crate 2');
w.walkTo(69.2); d.step(10); w.dropAt(73 * T, 18.5 * T); d.step(150);
console.log('  crate at', (c2.cx / T).toFixed(1), (c2.bottom / T).toFixed(1));
w.expect(w.channel('plC'), 'crate landed on plate C → door C open');
// follow it for the gift, climb out via the ladder at col 74
w.enter(71.5); d.step(120); w.where('lower room'); w.expect(p.body.bottom >= 29 * T && p.body.cx > 68 * T && p.body.cx < 75 * T, 'dropped into the lower room');
w.walkTo(71.5); d.step(20); w.expect(game.giftsCollected === 3, 'gift 3');
w.walkTo(74.5); d.step(5); w.expect(w.climbTo(18), 'climbed out');
w.walkTo(92); w.walk(1, 25, false); d.step(150); w.where('down'); w.expect(p.body.bottom >= 29 * T, 'down to the ground');
w.walkTo(98); d.step(10); w.expect(p.body.cx > 96 * T, 'through door C');
// ---- D: lever on the shelf (cols 100-104, row 16) via ceiling portal + floor portal; crate on plate D
w.selectWeapon('portal'); w.walkTo(102); d.step(20);
w.peekAimClick('KeyW', 102 * T, 11 * T + 1, 2);   // straight up from under the shelf: the ray passes beside/through nothing but the ceiling
const o2 = w.portal('orange'); w.expect(o2.active && o2.ny > 0 && o2.y <= 12 * T + 1 && o2.x > 100 * T && o2.x < 105 * T, `orange in the ceiling above the shelf (${(o2.x / T).toFixed(1)},${(o2.y / T).toFixed(1)})`);
w.aimClick(97 * T, 30 * T - 1, 0); const b2 = w.portal('blue'); w.expect(b2.active && b2.ny < 0, 'blue in the floor (left of the shelf, off the way to the crate)');
w.enter(b2.x / T); d.step(150); w.where('shelf'); w.expect(p.body.onGround && p.body.bottom <= 14 * T + 2, 'landed on the shelf');
w.walkTo(101); d.step(10); w.expect(game.giftsCollected === 4, 'big gift');
w.walkTo(102.4); d.step(5); w.interact(); w.expect(w.channel('levD'), 'lever D');
w.walkTo(104); w.walk(1, 20, false); d.step(120); w.where('off the shelf');
w.selectWeapon('gravity'); w.walkTo(110); d.step(10); const c3 = w.grab('crate', (b) => b.cx > 100 * T); w.expect(!!c3, 'grabbed crate 3');
w.walkTo(111.5); d.step(10); w.dropAt(109.75 * T, 29 * T); d.step(90); w.expect(w.channel('plD'), 'plate D pressed');
d.step(20); w.expect(gate(116).on === false, 'gate D powered down (plate & lever)');
// secret: tunnel through the permanent field at col 131 (the exit at cols 120-121 is passed on the way — jump over it)
w.walkTo(117.5); d.step(10); d.tap('KeyQ'); d.step(5); w.expect(p.tunneling, 'quantum mode on');
w.runJump(1, 10, 45); d.step(10); w.where('past the exit'); w.expect(game.state === 'playing' && p.body.cx > 122 * T, 'jumped over the exit door');
w.walkTo(127); d.step(10); w.expect(tunnel(1, 132.5), 'tunneled into the secret');
w.walkTo(135); d.step(20); w.expect(game.gifts.find((g) => g.id === 'g5').collected, 'rare gift');
w.walkTo(134.5); d.step(10); w.expect(tunnel(-1, 129.5), 'tunneled back out');
w.walkTo(121); d.step(120); w.shot('walk08_end');
w.expect(game.state === 'complete', 'level complete');
w.done();
