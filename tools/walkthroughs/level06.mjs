import { begin, T } from './lib.mjs';
const w = await begin(5); const { d, p, game } = w;

// ---- A: crate onto the plate behind the grate (cols 14-15): ceiling portal above the plate (shot through the grate), floor portal here
w.walkTo(11); d.step(30); w.selectWeapon('portal');
w.peekAimClick('KeyW', 19 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').x > 16 * T && w.portal('orange').x < 22 * T, `orange in the ceiling above the plate (${(w.portal('orange').x / T).toFixed(1)})`);
w.aimClick(9.5 * T, 30 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor');
w.selectWeapon('gravity'); w.walkTo(12); d.step(20);
const c1 = w.grab('crate', (b) => b.cx < 12 * T); w.expect(!!c1, 'grabbed a crate');
w.walkTo(w.portal('blue').x / T + 2.2); d.step(10); w.dropAt(w.portal('blue').x, 29 * T); d.step(200);
console.log('  crate at', (c1.cx / T).toFixed(1), (c1.bottom / T).toFixed(1));
w.expect(w.channel('door1'), 'crate landed on the plate → door 1 open');
// the grate can't be passed on foot: follow the crate through the floor portal, land on the pedestal, walk out through door 1
w.enter(w.portal('blue').x / T); d.step(200); w.where('sealed room'); w.expect(p.body.cx > 16 * T, 'dropped into the sealed room');
w.walkTo(28.5); d.step(30); w.where('past door 1'); w.expect(p.body.cx > 27 * T, 'through door 1');
// ---- B: lever → fan shaft (cols 31-33) lifts the cat to the balcony (row 12, cols 34-44)
w.walkTo(28.4); d.step(10); w.interact(); w.expect(w.channel('fanB'), 'fan switched on');
w.walkTo(32); d.step(10); for (let i = 0; i < 400; i++) { d.step(1); if (p.body.bottom < 11.5 * T) break; }
w.where('fan top'); d.key('KeyD'); d.step(50); d.releaseAll(); d.step(30); w.where('balcony');
w.expect(p.body.onGround && p.body.bottom <= 12 * T + 2 && p.body.cx > 34 * T, 'on the balcony');
w.walkTo(38); w.jump(20); d.step(40); w.expect(game.giftsCollected === 1, 'gift 1 collected');
w.walkTo(42.4); d.step(10); w.interact(); w.expect(w.channel('door2'), 'door 2 lever switched');
w.walkTo(44); w.walk(1, 20, false); d.step(120); w.where('floor after balcony');
w.walkTo(54); d.step(20); w.expect(p.body.cx > 51 * T, 'through door 2');
// ---- C: fling. Orange on the RIGHT face of the ceiling pillar (cols 70-71, rows 1-9), blue at the bottom of the well (cols 58-60, floor row 35)
w.selectWeapon('portal'); w.walkTo(56.5); d.step(10); w.runJump(1, 8, 40); w.where('over the well'); w.expect(p.body.cx > 61 * T && p.body.bottom <= 30 * T + 2, 'jumped over the well');
w.walkTo(75); d.step(20);
w.peekAimClick('KeyW', 72 * T + 1, 5 * T, 2);
w.expect(w.portal('orange').active && w.portal('orange').nx > 0, 'orange on the pillar\'s right face');
w.walkTo(63); d.step(20); w.runJump(-1, 8, 40); w.walkTo(57.3); d.step(20); w.aimClick(60.6 * T, 35 * T - 1, 0);   // stand right at the well's edge, aim at the far half of its floor (the near half is hidden by the lip)
w.expect(w.portal('blue').active && w.portal('blue').ny < 0 && w.portal('blue').y > 34 * T, 'blue on the well floor');
d.key('KeyD'); for (let i = 0; i < 60 && p.body.onGround; i++) d.step(1); d.step(4); d.releaseAll();   // walk off the edge into the well
for (let i = 0; i < 500; i++) { d.step(1); if (p.body.onGround && p.body.cx > 78 * T) break; }
w.where('after fling'); w.expect(p.body.cx > 79 * T && p.body.bottom <= 14 * T + 2, 'flung onto the roof');
w.walkTo(90); d.step(30); w.expect(game.giftsCollected === 2, 'big gift collected');
// down from the roof (right of col 103)
w.walkTo(100); w.walk(1, 25, false); d.step(30); w.walkTo(105); d.step(150); w.where('floor after roof');
w.expect(p.body.bottom >= 29 * T, 'back on the floor');
// ---- bonus shelf (cols 108-114, row 16): ceiling portal above it, floor portal
w.selectWeapon('portal'); w.walkTo(105); d.step(30);
w.peekAimClick('KeyW', 110 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').x > 108 * T && w.portal('orange').x < 114 * T, 'orange in the ceiling above the shelf');
w.aimClick(103 * T, 30 * T - 1, 0); w.enter(w.portal('blue').x / T); d.step(200); w.where('shelf?'); console.log('  orange', (w.portal('orange').x / T).toFixed(1));
w.expect(p.body.bottom <= 16 * T + 2, 'landed on the bonus shelf'); w.walkTo(111); w.jump(20); d.step(40); w.expect(game.giftsCollected === 3, 'bonus gift collected');
w.walkTo(114); w.walk(1, 20, false); d.step(120); w.where('floor after shelf');
// ---- D: smash the cracked wall (cols 120-124) with the big crate
w.selectWeapon('gravity'); w.walkTo(112); d.step(20);
const big = w.grab('bigCrate'); w.expect(!!big, 'grabbed the big crate');
w.walkTo(115.5); d.step(20); w.where('throw spot'); w.throwAt(120 * T, 29 * T); d.step(150); console.log('  big crate at', (big.cx / T).toFixed(1), (big.bottom / T).toFixed(1), 'tiles', [26, 27, 28, 29].map((r) => game.map.get(120, r)).join(''));
w.expect([26, 27, 28, 29].every((r) => game.map.get(120, r) === 0), 'cracked wall smashed');
// door 3: plate at (129,30) behind the door; ceiling portal through the grate wall (cols 125-127) above the plate + floor portal, drop a crate
w.walkTo(122); d.step(30); w.selectWeapon('portal');
w.peekAimClick('KeyW', 129.7 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').x > 127.5 * T, `orange in the ceiling above the plate (${(w.portal('orange').x / T).toFixed(1)})`);
w.aimClick(118.5 * T, 30 * T - 1, 0); w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor (behind the cat)');
// the big crate that smashed the wall is the weight for the plate
w.selectWeapon('gravity'); w.walkTo(123); d.step(20);
const c2 = w.grab('bigCrate'); w.expect(!!c2, 'grabbed the big crate again');
w.walkTo(w.portal('blue').x / T + 2.4); d.step(10); w.dropAt(w.portal('blue').x, 29 * T); d.step(220);
console.log('  crate at', (c2.cx / T).toFixed(1), (c2.bottom / T).toFixed(1));
w.expect(w.channel('door3'), 'crate on the plate → door 3 open');
w.walkTo(131); d.step(30); w.expect(p.body.cx > 128 * T, 'through door 3');
// secret: shelf row 24 (cols 132-136) with the rare gift above it at (130,22)
w.walkTo(140); d.step(30); w.selectWeapon('portal');
w.peekAimClick('KeyW', 133 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0, 'orange in the ceiling above the final shelf');
w.aimClick(138 * T, 30 * T - 1, 0); w.enter(w.portal('blue').x / T); d.step(200); w.where('final shelf?');
w.expect(p.body.bottom <= 24 * T + 2, 'on the final shelf');
w.walkTo(134); w.jump(20); d.step(40); w.expect(game.giftsCollected === 4, 'rare gift collected');
w.walkTo(136); w.walk(1, 20, false); d.step(60); w.walkTo(144); d.step(120); w.where('exit');
w.done();
