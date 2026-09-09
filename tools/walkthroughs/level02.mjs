import { begin, T } from './lib.mjs';
const w = await begin(1); const { d, p, game } = w;

// pick up the portal gun, walk to the wall at col 18
w.walkTo(8.5); d.step(30); w.expect(game.weapons.available.portal, 'portal gun picked up');
w.walkTo(15); d.step(60); w.selectWeapon('portal');
// blue on the wall (left face of col 18, low), orange on the floor behind the wall, shot through the grate (rows 10-15)
w.aimClick(18 * T - 1, 20 * T, 0);
w.expect(w.portal('blue').active, 'blue portal on the wall');
w.peekAimClick('KeyW', 26 * T, 1 * T + 1, 2);               // ceiling behind the wall: the shot passes through the grate (rows 10-15)
w.expect(w.portal('orange').active && w.portal('orange').ny > 0, `orange portal in the ceiling behind the wall (${(w.portal('orange').x / T).toFixed(1)})`);
w.walk(1, 90); d.step(60); w.where('behind wall');
w.expect(p.body.cx > 19 * T, 'went through the wall');
// tall block at cols 34-44 (top row 12): portal in the ceiling above it + portal in the floor here
w.walkTo(28); d.step(60);
w.peekAimClick('KeyW', 38 * T, 1 * T + 1, 2);               // ceiling above the block
w.expect(w.portal('orange').active && w.portal('orange').ny > 0, 'orange in the ceiling above the block');
w.aimClick(30 * T, 22 * T - 1, 0);                          // blue in the floor
w.expect(w.portal('blue').active && w.portal('blue').ny < 0, 'blue in the floor');
w.walkTo(30); d.step(150); w.where('dropped onto the block');
w.expect(p.body.bottom <= 12 * T + 2 && p.body.cx > 34 * T && p.body.cx < 45 * T, 'landed on top of the block');
w.expect(game.giftsCollected === 1, 'gift 1 collected');
// walk right along the ledge (row 12/13 up to col 54), drop down to the floor
w.walkTo(54); w.walk(1, 30, false); d.step(90); w.where('floor after ledge');
// pillar at cols 60-62 blocks the floor: portal in the ceiling beyond it (through the grate at col 61) + floor portal here
w.selectWeapon('portal'); w.walkTo(57); d.step(60);
w.peekAimClick('KeyW', 67.5 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').x > 63 * T, `orange in the ceiling beyond the pillar (${(w.portal('orange').x / T).toFixed(1)})`);
w.aimClick(54.5 * T, 22 * T - 1, 0); w.walkTo(w.portal('blue').x / T); d.step(160); w.where('beyond pillar');   // step onto the floor portal
w.expect(p.body.cx > 63 * T, 'crossed the pillar');
// the cat landed on the pedestal (66-74, top row 18) with the crate; grab it
w.selectWeapon('gravity'); d.step(30); w.where('pedestal');
const crate = w.grab('crate'); w.expect(!!crate, 'grabbed the crate');
const plate = w.puzzle((q) => q.channel === 'door1');
w.walkTo(74); w.walk(1, 20, false); d.step(60); w.where('floor by plate');
w.dropAt(plate.x + plate.w / 2, plate.y - 20); d.step(120);
w.expect(plate.pressed, 'plate pressed');
const door = w.puzzle((q) => q.requires === 'door1'); w.expect(door.open > 0.9, 'door open');
w.walkTo(82.5); w.runJump(1, 10, 40); w.where('past pit');
if (p.body.cx < 87 * T) { w.walkTo(82.5); w.runJump(1, 20, 50); }
w.expect(p.body.cx > 87 * T, 'jumped the small pit');
// bonus gift on the thin shelf (row 16, cols 90-96): ceiling portal above the shelf + floor portal
w.selectWeapon('portal'); w.walkTo(92); d.step(60);
w.peekAimClick('KeyW', 93 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0, 'orange in the ceiling above the shelf');
w.aimClick(90 * T, 22 * T - 1, 0); w.walkTo(90); d.step(180); w.where('shelf');
w.walkTo(93.5); w.jump(20); d.step(40);
w.expect(game.giftsCollected >= 2, 'bonus gift collected');
// secret gift on the high ledge (row 10, cols 96-100): the ledge is 1 tile thick, so the ceiling above it (row 0)
// has to be shot at an angle from the right side of the room; then a floor portal under the cat
w.walk(1, 30, false); d.step(80); w.walkTo(103); d.step(60); w.where('right side');
w.peekAimClick('KeyW', 99.5 * T, 1 * T + 1, 2);
w.expect(w.portal('orange').active && w.portal('orange').ny > 0 && w.portal('orange').y < 2 * T && w.portal('orange').x > 96 * T, `orange in the ceiling above the high ledge (${(w.portal('orange').x / T).toFixed(1)},${(w.portal('orange').y / T).toFixed(1)})`);
w.walkTo(95); d.step(60); w.aimClick(94 * T, 22 * T - 1, 0); w.walkTo(94); d.step(180); w.where('high ledge');
w.walkTo(98.5); w.jump(20); d.step(40);
w.expect(game.giftsCollected === 3, 'secret gift collected');
w.walkTo(100); w.walk(1, 30, false); d.step(90); w.walkTo(104.5); d.step(120); w.where('exit');
w.done();
