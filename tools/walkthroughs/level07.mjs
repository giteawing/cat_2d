import { begin, T } from './lib.mjs';
const w = await begin(6); const { d, p, game } = w;

/** Run (Shift) at a potential barrier until the cat tunnels through (25% per attempt; bounces re-run automatically). */
function tunnel(dir, pastX, max = 900) {
  let attempts = 0;
  const onField = game.world.onField; game.world.onField = (b, kind, ...r) => { if (b.kind === 'cat') attempts++; onField(b, kind, ...r); };
  d.key('ShiftLeft'); d.key(dir > 0 ? 'KeyD' : 'KeyA');
  let i = 0;
  for (; i < max; i++) { d.step(1); if (dir > 0 ? p.body.cx > pastX * T : p.body.cx < pastX * T) break; }
  d.releaseAll(); d.step(10);
  game.world.onField = onField;
  const ok = dir > 0 ? p.body.cx > pastX * T : p.body.cx < pastX * T;
  console.log(`  tunnel ${ok ? 'OK' : 'FAILED'} after ${attempts} field contacts (${i} frames)`); if (!ok) w.where('  stuck');
  return ok;
}

// ---- A: pick up the quantum mode, tunnel through field 1 (col 16)
w.walkTo(9); d.step(20); w.expect(p.tunnelUnlocked, 'quantum tunneling picked up');
w.walkTo(12); d.key('ShiftLeft'); d.key('KeyD'); d.step(50); d.releaseAll(); d.step(30);
w.expect(p.body.cx < 16 * T, 'mode off: the field bounced the cat back');
d.tap('KeyQ'); d.step(5); w.expect(p.tunneling, 'mode ON (Q)');
w.walkTo(11); d.step(10); w.expect(tunnel(1, 17.5), 'tunneled through field 1');
w.walkTo(20); d.step(20); w.expect(game.giftsCollected === 1, 'gift 1');
// ---- B: crate onto the plate behind field 2 (col 34): orange in the ceiling above the plate (shot passes through the field), blue in the floor here
w.selectWeapon('portal'); w.walkTo(29); d.step(20);
w.peekAimClick('KeyW', 42 * T, 12 * T + 1, 2);
const o = w.portal('orange'); w.expect(o.active && o.ny > 0 && o.x > 40 * T && o.x < 44.5 * T, `orange in the ceiling above the plate (${(o.x / T).toFixed(1)})`);
w.aimClick(31.5 * T, 30 * T - 1, 0); const bl = w.portal('blue'); w.expect(bl.active && bl.ny < 0, 'blue in the floor');
w.selectWeapon('gravity'); w.walkTo(24); d.step(10);
const c1 = w.grab('crate', (b) => b.cx < 24 * T); w.expect(!!c1, 'grabbed a crate');
w.walkTo(bl.x / T - 2.2); d.step(10); w.dropAt(bl.x, 29 * T); d.step(200);
console.log('  crate at', (c1.cx / T).toFixed(1), (c1.bottom / T).toFixed(1));
w.expect(w.channel('doorB'), 'crate landed on the plate → door B open');
// the cat follows the crate: portals ignore fields, so the floor portal is the way past field 2 (tunneling works too)
w.enter(bl.x / T); d.step(150); w.where('behind field 2');
if (p.body.cx < 34 * T) w.expect(tunnel(1, 35.5), 'tunneled through field 2 instead'); else w.expect(true, 'followed the crate through the portal past field 2');
w.walkTo(47); d.step(20); w.expect(p.body.cx > 46 * T, 'through door B');
// ---- C: field floor. Mode OFF: drop from the ledge → bounce up to the big gift
d.tap('KeyQ'); d.step(5); w.expect(!p.tunneling, 'mode OFF');
w.walkTo(50.5); d.step(5); w.expect(w.climbTo(18), 'climbed to the upper floor');
w.walkTo(54.5); d.step(5); w.expect(w.climbTo(10), 'climbed to the ledge');
w.walk(1, 75, false); for (let i = 0; i < 400; i++) { d.step(1); if (game.giftsCollected === 2) break; }
w.where('bounce'); w.expect(game.giftsCollected === 2, 'big gift caught on the bounce');
for (let i = 0; i < 700 && !(p.body.onGround && p.body.vy === 0); i++) d.step(1); d.step(10); w.where('settled'); w.expect(p.body.onGround && Math.abs(p.body.bottom - 18 * T) < 3, 'standing on the field floor');
// mode ON: bounce until the cat falls through into the secret room
d.tap('KeyQ'); d.step(5);
let fell = false;
for (let tries = 0; tries < 12 && !fell; tries++) {
  w.walkTo(54.5); d.step(5); w.climbTo(10); w.walk(1, 75, false);
  for (let i = 0; i < 400; i++) { d.step(1); if (p.body.bottom > 21 * T) { fell = true; break; } }
  console.log(`  drop ${tries + 1}: ${fell ? 'fell through' : 'bounced'}`);
  if (!fell) d.step(200);
}
d.step(120); w.where('secret room'); w.expect(fell && p.body.bottom > 29 * T, 'fell through the field floor');
w.walkTo(61.5); d.step(20); w.expect(game.giftsCollected === 3, 'secret gift');
w.walkTo(66.5); d.step(5); w.expect(w.climbTo(18), 'climbed out of the secret room');
w.walkTo(79); w.walk(1, 25, false); d.step(60); w.walkTo(82.4); d.step(5); w.walk(-1, 20, false); d.step(150); w.where('after upper floor'); w.expect(p.body.bottom >= 29 * T, 'back on the ground');
// ---- D: fan shaft with a field ceiling. Mode stays ON: the fan throws the cat at the field until it tunnels up
w.walkTo(81.4); d.step(5); w.interact(); w.expect(w.channel('fanD'), 'fan on');
w.walkTo(85.5); d.step(5);
let up = false; for (let i = 0; i < 2500; i++) { d.step(1); if (p.body.bottom < 14 * T) { up = true; break; } }
d.key('KeyD'); d.step(70); d.releaseAll(); d.step(40); w.where('lever room');
w.expect(up && p.body.onGround && p.body.bottom <= 14 * T + 2 && p.body.cx > 87 * T, 'tunneled up into the lever room');
if (!game.gifts.find((g) => g.id === 'g4').collected) { w.walkTo(85.5); d.step(30); w.walkTo(88); } w.expect(game.gifts.find((g) => g.id === 'g4').collected, 'gift 4 (above the field ceiling)');
w.walkTo(90.4); d.step(5); w.interact(); w.expect(w.channel('doorD'), 'door D lever');
w.walkTo(96); w.walk(1, 25, false); d.step(150); w.where('down'); w.expect(p.body.bottom >= 29 * T, 'down from the ledge');
w.walkTo(104); d.step(10); w.expect(p.body.cx > 102 * T, 'through door D');
// ---- E: balls bounce off the field; the cat tunnels through the last field to the rare gift and the exit
w.selectWeapon('gravity'); const ball = w.grab('ball'); w.expect(!!ball, 'grabbed a ball');
w.throwAt(112 * T, 29 * T); d.step(90); console.log('  ball at', (ball.cx / T).toFixed(1), 'vx', ball.vx.toFixed(0));
w.expect(ball.cx < 112 * T, 'ball bounced off the field (did not pass)');
// clear the runway: any ball that rolled near the field goes back behind us
for (let i = 0; i < 4; i++) { const b2 = w.grab('ball', (b) => b.cx > 106.5 * T); if (!b2) break; w.face(100 * T); w.throwAt(100 * T, 29 * T); d.step(30); }
w.walkTo(108); d.step(10); w.expect(tunnel(1, 113.5), 'tunneled through the last field');
w.walkTo(118); d.step(20); if (game.giftsCollected < 5) { w.where('near rare gift'); w.walkTo(117.5); w.jump(10); d.step(40); w.walkTo(118.5); d.step(20); } w.expect(game.gifts.find((g) => g.id === 'g5').collected, 'rare gift');
w.walkTo(125); d.step(120); w.shot('walk07_end');
w.expect(game.state === 'complete', 'level complete');
w.done();
