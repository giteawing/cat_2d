// World 2 — Level 2: "Зеркальный зал". Deeper laser play:
//  A. two mirrors in a chain: one on the floor, one already on a high shelf (climb up and flip it with E)
//  B. the emitter is powered by a lever; the beam passes a grate the cat cannot — portals do
//  C. two lasers, ONE mirror: bend the first (on a shelf), then carry the mirror to the second. Secret: the second
//     beam through a floor portal → out of a wall portal on the right → a receiver on a hanging pillar
//  D. finale: three receivers, two mirrors: left, up (via the second mirror), right (second mirror removed)
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(121, 30);
  m.rect(0, 0, 120, 12);                         // ceiling
  m.rect(0, 26, 120, 29);                        // floor
  m.col(0, 0, 29); m.col(120, 0, 29);
  // A (cols 1-25)
  m.rect(9, 20, 11, 20, '=');                    // shelf with the second mirror
  m.col(12, 17, 25, 'H');                        // ladder up to the shelf and further to the gift shelf
  m.rect(13, 17, 15, 17, '=');
  m.rect(26, 13, 27, 21);                        // wall above door A (rows 22-25)
  // B (cols 28-55)
  m.col(47, 13, 25, '|');                        // grate: beams and portal shots pass, the cat does not
  m.rect(56, 13, 57, 23);                        // wall above door B (door rows 24-25); laser C1 is mounted on its right face
  // C (cols 58-86)
  m.rect(63, 25, 66, 25);                        // solid 1-tile mirror shelf (a mirror on it sits at row 24, in beam C1); stand on it to place the mirror
  m.rect(67, 23, 69, 23, '=');                   // gift shelf
  m.rect(76, 13, 77, 19);                        // hanging pillar carrying the secret receiver
  m.rect(82, 26, 83, 27, '.');                   // secret pit (lid = door 'sec')
  m.rect(87, 13, 88, 21);                        // wall above door C
  // D (cols 89-119)
  m.rect(90, 24, 90, 25);                        // step with receiver r1 on its right face
  m.rect(92, 21, 94, 21, '='); m.rect(96, 18, 98, 18, '=');
  m.rect(114, 13, 115, 21);                      // wall above door D
  return m.lines();
}

export const level02 = {
  id: 'w2l2', world: 2, number: 2,
  name: 'Зеркальный зал', subtitle: 'Цепочки зеркал и лучи сквозь решётки',
  theme: 'observatory',
  map: buildMap(),
  start: [3, 26],
  exit: [117, 24],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 14, 8, 12, 'Зеркальный зал', 'Луч можно отражать несколько раз');
    k.sign(5, 23, 'Два зеркала: одно поставь под луч на полу, второе уже стоит на полке — поднимись по лестнице и переверни его (E).');
    k.laser(1, 25, 'right');
    k.prop('mirror', 4, 26, { dir: -1 });
    k.prop('mirror', 9, 20, { dir: -1 });
    k.receiver(25, 19, 'rA', { face: 'left', size: 40 });
    k.door(26, 22, 2, 4, 'rA', { dir: 'up', travel: 4 * 32 });
    k.gift(14, 15, 'normal', 'g1');
    k.clutter(['book', 'cup', 'jar', 'can'], 17, 26, 6, 211);   // low clutter only: the beam runs half a tile above the floor
    k.decor('window', 18, 14, { w: 64, h: 64 }); k.decor('poster', 3, 15, { w: 72, h: 28, text: 'ЗЕРКАЛА', color: '#FFE9B8' });
    // B
    k.sign(29, 23, 'Этот излучатель выключен. Рычаг включит его. За решёткой луч пройдёт — а ты нет. Но выстрел портальной пушки — тоже пройдёт.');
    k.lever(34, 26, 'levB');
    k.laser(40, 13, 'down', { requires: 'levB' });
    k.prop('mirror', 29, 26, { dir: 1 });
    k.receiver(55, 25, 'rB', { face: 'left', size: 40 });
    k.door(56, 24, 2, 2, 'rB', { dir: 'up', travel: 2 * 32 });
    k.gift(50, 24, 'normal', 'g2');
    k.clutter(['cup', 'can', 'book', 'jar'], 31, 26, 5, 212);
    k.decor('window', 42, 14, { w: 64, h: 64 }); k.decor('lampHang', 52, 13);
    // C
    k.sign(59, 23, 'Два луча, одно зеркало. Приёмники помнят свет: сначала поставь зеркало на ступеньку под первый луч (встань на неё сам), потом перенеси под второй луч.');
    k.laser(58, 24, 'right');                                  // row 24: only a mirror standing on the shelf catches it (floor mirrors are too low)
    k.laser(72, 13, 'down');
    k.prop('mirror', 61, 26, { dir: 1 });
    k.receiver(63, 13, 'c1', { face: 'down', size: 40 });
    k.receiver(86, 25, 'c2', { face: 'left', size: 30 });
    k.door(87, 22, 2, 4, 'c1&c2', { dir: 'up', travel: 4 * 32 });
    k.gift(68, 21, 'normal', 'g3');
    // secret: receiver on the pillar's RIGHT face — the beam must come from the right wall (portal!)
    k.receiver(78, 18, 'sec', { face: 'right', size: 40 });
    k.door(82, 26, 2, 2, 'sec', { dir: 'down', travel: 2 * 32, color: '#4A4F70' });
    k.gift(82.5, 27, 'rare', 'g5');
    k.secret(82, 26, 2, 2, 's1');
    k.sign(80, 23, 'Приёмник на колонне смотрит ВПРАВО. Луч должен прийти от правой стены… Порталы!');
    k.clutter(['yarn', 'ball', 'toyCube', 'can'], 60, 26, 3, 213);   // low toys only; the floor from the mirror to c2 must stay clear
    k.decor('poster', 66, 15, { w: 80, h: 28, text: 'ТЕЛЕСКОП №3', color: '#DDE6EE' }); k.decor('window', 80, 14, { w: 64, h: 64 });
    // D
    k.sign(91, 22, 'ТРИ приёмника, ДВА зеркала: влево, вверх (через второе зеркало), вправо (второе убрать).');
    k.laser(100, 13, 'down');
    k.receiver(91, 25, 'r1', { face: 'right', size: 40 });
    k.receiver(108, 13, 'r3', { face: 'down', size: 40 });
    k.receiver(113, 25, 'r2', { face: 'left', size: 40 });
    k.prop('mirror', 95, 26, { dir: 1 });
    k.prop('mirror', 110, 26, { dir: -1 });
    k.door(114, 22, 2, 4, 'r1&r2&r3', { dir: 'up', travel: 4 * 32 });
    k.gift(97, 16, 'big', 'g4');
    k.clutter(['cup', 'can', 'jar', 'book'], 116, 26, 3, 214);
    k.decor('window', 102, 14, { w: 96, h: 80 }); k.decor('lampHang', 96, 13);
    k.decor('poster', 117, 18, { w: 60, h: 28, text: 'ВЫХОД ↓', color: '#FFE9B8' });
  },
};
