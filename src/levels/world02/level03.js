// World 2 — Level 3: "Лифтовая шахта". Lasers meet moving parts and the BEAM LOCK:
//  A. a mirror rides a lift: while it crosses the beam the ceiling receiver latches on
//  B. beam lock: the door is open only while the receiver is DARK (`!rB`, non-latching) — block the beam with a crate
//     and leave it there
//  C. plate AND ceiling receiver: the beam runs along the floor; mirror up → ceiling portal → floor portal under the receiver
//  D. finale: the mirror rides a horizontal lift under a ceiling beam; flip it in flight so both wall receivers latch.
//     Secret: an unmarked beam lock — a crate in the low beam opens a lid in the floor
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(121, 30);
  m.rect(0, 0, 120, 12);                         // ceiling
  m.rect(0, 26, 120, 29);                        // floor
  m.col(0, 0, 29); m.col(120, 0, 29);
  // A (cols 1-26): lift shaft at cols 10-12, gift shelf to its right
  m.rect(14, 18, 16, 18, '=');
  m.rect(27, 13, 28, 21);                        // wall above door A (rows 22-25)
  // B (cols 29-56): laser mount block, high gift shelf with a ladder, receiver mount block
  m.set(29, 25, '#');
  m.rect(46, 17, 49, 17); m.col(50, 17, 25, 'H');
  m.set(56, 25, '#');
  m.rect(57, 13, 58, 21);                        // wall above door B
  // C (cols 59-89): gift shelf + ladder, laser mount block at the right
  m.rect(76, 19, 78, 19, '='); m.col(79, 19, 25, 'H');
  m.set(88, 25, '#');
  m.rect(90, 13, 91, 21);                        // wall above door C
  // D (cols 92-119): step (lift boarding + secret laser mount), gift shelf, secret pit, receiver mount block
  m.rect(94, 24, 95, 25);                        // boarding step next to the lift's rest position (the lift runs above head height)
  m.rect(107, 20, 109, 20, '=');                 // gift shelf above the lift's far end
  m.rect(108, 26, 109, 27, '.');                 // secret pit (lid = door 'sec')
  m.rect(114, 13, 115, 21);                      // wall above door D
  return m.lines();
}

export const level03 = {
  id: 'w2l3', world: 2, number: 3,
  name: 'Лифтовая шахта', subtitle: 'Зеркала на лифтах и лучи-замки',
  theme: 'observatory',
  map: buildMap(),
  start: [3, 26],
  exit: [117, 24],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 13, 8, 13, 'Лифтовая шахта', 'Зеркало может ехать на лифте');
    k.sign(5, 23, 'Зеркало стоит на лифте. Рычаг запускает лифт: когда зеркало пересечёт луч, приёмник на потолке запомнит свет.');
    k.laser(1, 19, 'right');
    k.lever(5, 26, 'levA');
    k.platform(10, 25, 3, 10, 17, { requires: 'levA', speed: 60, wait: 1.5, color: '#6A5A8A' });
    k.prop('mirror', 10, 25, { dir: 1 });
    k.receiver(10, 13, 'rA', { face: 'down', size: 40 });
    k.door(27, 22, 2, 4, 'rA', { dir: 'up', travel: 4 * 32 });
    k.gift(15, 16, 'normal', 'g1');
    k.clutter(['book', 'cup', 'jar', 'can'], 19, 26, 5, 221);
    k.decor('window', 20, 14, { w: 64, h: 64 }); k.decor('poster', 3, 15, { w: 72, h: 28, text: 'ЛИФТ №1', color: '#FFE9B8' });
    // B
    k.sign(31, 23, 'ЗАМОК: дверь открыта, только пока приёмник ТЁМНЫЙ (он не запоминает свет). Перекрой луч ящиком (он наверху, на полке) — и оставь ящик там.');
    k.laser(30, 25, 'right');
    k.prop('crate', 48, 17);                                   // on the high shelf: climb, bring it down into the beam
    k.receiver(55, 25, 'rB', { face: 'left', latch: false, size: 30 });
    k.door(57, 22, 2, 4, '!rB', { dir: 'up', travel: 4 * 32, color: '#B05A5A' });
    k.gift(47, 15, 'normal', 'g2');
    k.clutter(['cup', 'can', 'book', 'jar'], 40, 26, 5, 222);   // low clutter only (the beam runs half a tile above the floor)
    k.decor('window', 38, 14, { w: 64, h: 64 }); k.decor('lampHang', 52, 13);
    // C
    k.sign(61, 23, 'Двери нужны плита И приёмник на потолке. Луч идёт вдоль пола: зеркало поднимет его в потолок → портал → портал под приёмником.');
    k.laser(87, 25, 'left');
    k.prop('mirror', 82, 26, { dir: -1 });
    k.prop('crate', 85, 26);
    k.plate(66, 26, 'plC');
    k.receiver(62, 13, 'rC', { face: 'down', size: 40 });
    k.door(90, 22, 2, 4, 'rC&plC', { dir: 'up', travel: 4 * 32 });
    k.gift(77, 17, 'normal', 'g3');
    k.clutter(['toyCube', 'yarn', 'cup', 'can'], 69, 26, 4, 223);
    k.decor('poster', 70, 15, { w: 80, h: 28, text: 'ТЕЛЕСКОП №4', color: '#DDE6EE' }); k.decor('window', 82, 14, { w: 64, h: 64 });
    // D
    k.sign(93, 22, 'Зеркало едет под лучом. Прокатись вместе с ним и переверни (E) на ходу: приёмники слева и справа запомнят свет.');
    k.lever(92, 26, 'levD');
    k.platform(97, 23, 3, 110, 23, { requires: 'levD', speed: 55, wait: 2.5, color: '#6A5A8A' });   // one tile above the step; the cat walks under it
    k.prop('mirror', 99, 23, { dir: 1 });
    k.laser(100, 13, 'down');
    k.receiver(92, 22, 'r1', { face: 'right', size: 40 });
    k.receiver(113, 22, 'r2', { face: 'left', size: 40 });
    k.door(114, 22, 2, 4, 'r1&r2', { dir: 'up', travel: 4 * 32 });
    k.gift(108, 18, 'big', 'g4');
    // secret: an unmarked beam lock along the floor
    k.laser(97, 25, 'right');
    k.prop('crate', 103, 26);
    k.receiver(111, 25, 'sec', { face: 'left', latch: false, size: 30 });
    k.door(108, 26, 2, 2, '!sec', { dir: 'down', travel: 2 * 32, color: '#4A4F70' });
    k.gift(108.5, 27, 'rare', 'g5');
    k.secret(108, 26, 2, 2, 's1');
    k.clutter(['cup', 'can', 'book'], 116, 26, 3, 224);
    k.decor('window', 100, 14, { w: 96, h: 80 }); k.decor('lampHang', 110, 13);
    k.decor('poster', 117, 18, { w: 60, h: 28, text: 'ВЫХОД ↓', color: '#FFE9B8' });
  },
};
