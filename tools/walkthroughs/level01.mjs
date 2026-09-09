import { begin, T } from './lib.mjs';
const w = await begin(0); const { d, p, game } = w;

// secret gift above the start: thin shelves at row 17 (cols 6-8) and row 14 (cols 2-4)
w.walkTo(7); w.jump(25); d.step(45); w.where('shelf 1');
w.expect(p.body.bottom <= 17 * T + 2, 'reached shelf 1');
d.key('KeyA'); d.step(6); w.jump(25); d.step(10); d.releaseAll(); d.step(45); w.where('shelf 2');
w.expect(game.giftsCollected === 1, 'secret gift collected');
// drop down and go right; jump the pit (cols 24-25)
w.walkTo(10); d.step(60); w.where('down');
w.walkTo(21.5); w.runJump(1, 15, 50); w.where('after pit');
if (p.body.cx < 27 * T) { w.walkTo(26.5); w.climbTo(19); w.walk(1, 30); }
w.expect(p.body.cx > 26 * T && p.body.bottom <= 20 * T + 2, 'crossed the pit');
// living room: ladder at col 36 to the upper floor
w.walkTo(36.5); w.where('ladder foot'); w.expect(w.climbTo(12), 'climbed the ladder'); w.walk(1, 25); w.where('upper floor');
w.walkTo(40.5); d.step(30);
w.expect(game.weapons.available.gravity, 'picked up the gravity gun');
w.walkTo(42); d.step(30);
const crate = w.grab('crate'); w.expect(!!crate, 'grabbed the crate');
w.walkTo(45.5); const plate = w.puzzle((q) => q.channel === 'd1');
w.dropAt(plate.x + plate.w / 2, plate.y - 20); d.step(90);
w.expect(plate.pressed, 'plate pressed by the crate');
const door = w.puzzle((q) => q.requires === 'd1'); w.expect(door.open > 0.9, 'door open');
w.walkTo(56); w.where('past door'); w.expect(game.giftsCollected === 2, 'gift 1 collected');
// upper floor ends at col 60: step off to the kitchen
w.walkTo(60); w.walk(1, 40, false); d.step(60); w.where('kitchen');
w.expect(p.body.bottom >= 20 * T - 2, 'dropped into the kitchen');
// counter (row 17) at cols 80-88, then the high shelf (row 14) at 84-88
w.walkTo(82); w.jump(25); d.step(45); w.where('counter');
w.expect(p.body.bottom <= 17 * T + 2, 'on the counter');
w.walkTo(86); w.jump(25); d.step(45); w.where('high shelf');
w.expect(game.giftsCollected === 3, 'bonus gift collected');
// drop through the thin shelves and reach the exit at col 90
w.walkTo(89.5); d.step(60); w.walkTo(90.5); d.step(120); w.where('exit');
w.done();
