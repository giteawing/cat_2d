// World 2 — Level 4: "Купол" — the World 2 finale. Lasers combined with everything else:
//  A. a mirror bobbing in a fan column crosses a beam → ceiling receiver latches
//  B. beam lock behind a permanent field: portal shots (and beams) pass fields — drop the crate through a portal so
//     it lands in the beam on the far side, then follow it
//  C. one '/' mirror, one ceiling beam, two wall receivers at different heights: on the floor the beam goes left along
//     the floor; lifted by the fan it goes left higher up
//  D. finale: a mirror on a vertical lift catches a high beam and sends it down onto a floor mirror → right → receiver.
//     Secret: a third mirror in the resulting floor beam lights a ceiling receiver → lid in the floor
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(121, 30);
  m.rect(0, 0, 120, 12);                         // ceiling
  m.rect(0, 26, 120, 29);                        // floor
  m.col(0, 0, 29); m.col(120, 0, 29);
  // A (cols 1-27): fan column 8-10, gift shelf to its right
  m.rect(11, 18, 13, 18, '=');                   // landing shelf beside the fan column
  m.rect(27, 13, 28, 21);                        // wall above door A (rows 22-25)
  // B (cols 29-56): permanent field at col 40, gift shelf + ladder beyond it
  m.col(40, 13, 25, '~');
  m.rect(31, 23, 32, 23, '=');                   // the crate waits on a ledge above the beam
  m.rect(46, 20, 49, 20); m.col(50, 20, 25, 'H');
  m.rect(57, 13, 58, 21);                        // wall above door B
  // C (cols 59-87): fan column 70-72, gift shelf to its right
  m.rect(74, 20, 76, 20, '=');
  m.rect(88, 13, 89, 21);                        // wall above door C
  // D (cols 90-119): lift shaft 93-95, gift shelf at the top right of the shaft, secret pit
  m.rect(91, 24, 92, 25);                        // boarding step left of the shaft
  m.rect(97, 18, 99, 18, '=');                   // gift shelf reached from the lift's top stop
  m.rect(104, 26, 105, 27, '.');                 // secret pit (lid = door 'sec')
  m.rect(109, 23, 110, 23, '=');                 // ledge: the third mirror waits here, out of the floor beam
  m.rect(114, 13, 115, 21);                      // wall above door D
  return m.lines();
}

export const level04 = {
  id: 'w2l4', world: 2, number: 4,
  name: 'Купол', subtitle: 'Лазеры + вентиляторы, поля и лифты',
  theme: 'observatory',
  map: buildMap(),
  start: [3, 26],
  exit: [117, 24],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 13, 8, 13, 'Купол', 'Финал обсерватории: всё вместе');
    k.sign(4, 23, 'Зеркало в потоке вентилятора подпрыгивает. Пролетая сквозь луч, оно на миг отразит его в приёмник на потолке — и тот запомнит свет.');
    k.lever(5, 26, 'fanA');
    k.fan(8, 17, 3, 9, { requires: 'fanA' });
    k.laser(1, 19, 'right');
    k.prop('mirror', 9, 26, { dir: 1 });
    k.receiver(9, 13, 'rA', { face: 'down', size: 40 });
    k.door(27, 22, 2, 4, 'rA', { dir: 'up', travel: 4 * 32 });
    k.gift(12, 16, 'normal', 'g1');
    k.clutter(['book', 'cup', 'jar', 'can'], 17, 26, 6, 231);
    k.decor('window', 18, 14, { w: 64, h: 64 }); k.decor('poster', 3, 15, { w: 72, h: 28, text: 'КУПОЛ', color: '#FFE9B8' });
    // B
    k.sign(31, 23, 'Замок: дверь открыта, пока приёмник тёмный. Луч и выстрел портала проходят сквозь поле, а ящик — нет. Оранжевый — в потолок за полем, синий — в пол здесь, ящик — в синий.');
    k.laser(29, 25, 'right');
    k.prop('crate', 31, 23);
    k.receiver(56, 25, 'rB', { face: 'left', latch: false, size: 30 });
    k.door(57, 22, 2, 4, '!rB', { dir: 'up', travel: 4 * 32, color: '#B05A5A' });
    k.gift(48, 18, 'normal', 'g2');
    k.clutter(['cup', 'can', 'book', 'jar'], 42, 26, 4, 232);   // low clutter only: the beam runs half a tile above the floor
    k.decor('window', 32, 14, { w: 64, h: 64 }); k.decor('lampHang', 52, 13);
    // C
    k.sign(61, 23, 'Одно зеркало, луч с потолка и два приёмника на стене слева. На полу луч пойдёт понизу; подними зеркало вентилятором — пойдёт поверху.');
    k.lever(64, 26, 'fanC');
    k.fan(70, 20, 3, 6, { requires: 'fanC' });
    k.laser(71, 13, 'down');
    k.prop('mirror', 66, 26, { dir: 1 });
    k.receiver(59, 25, 'c1', { face: 'right', size: 40 });
    k.receiver(59, 19, 'c2', { face: 'right', size: 40 });
    k.door(88, 22, 2, 4, 'c1&c2', { dir: 'up', travel: 4 * 32 });
    k.gift(75, 18, 'normal', 'g3');
    k.clutter(['toyCube', 'yarn', 'cup', 'can'], 78, 26, 5, 233);
    k.decor('poster', 76, 15, { w: 80, h: 28, text: 'ГЛАВНЫЙ ТЕЛЕСКОП', color: '#DDE6EE' }); k.decor('window', 82, 14, { w: 64, h: 64 });
    // D
    k.sign(96, 23, 'Луч идёт высоко. Зеркало на лифте поймает его и отправит вниз — туда поставь второе зеркало, чтобы луч ушёл вправо к приёмнику.');
    k.laser(90, 15, 'right');
    k.lever(98, 26, 'liftD');
    k.platform(93, 23, 3, 93, 16, { requires: 'liftD', speed: 50, wait: 4, color: '#6A5A8A' });   // top stop: the mirror sits exactly in the beam
    k.prop('mirror', 94, 23, { dir: -1 });
    k.prop('mirror', 101, 26, { dir: -1 });
    k.prop('mirror', 109, 23, { dir: 1 });
    k.receiver(113, 25, 'rD', { face: 'left', size: 40 });
    k.door(114, 22, 2, 4, 'rD', { dir: 'up', travel: 4 * 32 });
    k.gift(98, 16, 'big', 'g4');
    // secret: a third mirror in the floor beam → ceiling receiver → lid
    k.receiver(101, 13, 'sec', { face: 'down', size: 40 });
    k.door(104, 26, 2, 2, 'sec', { dir: 'down', travel: 2 * 32, color: '#4A4F70' });
    k.gift(104.5, 27, 'rare', 'g5');
    k.secret(104, 26, 2, 2, 's1');
    k.sign(106, 23, 'Третье зеркало? Когда луч пойдёт по полу, ему найдётся применение… посмотри на потолок.');
    k.clutter(['cup', 'can', 'book'], 116, 26, 3, 234);
    k.decor('window', 104, 14, { w: 96, h: 80 }); k.decor('lampHang', 110, 13);
    k.decor('poster', 117, 18, { w: 60, h: 28, text: 'ВЫХОД ↓', color: '#FFE9B8' });
  },
};
