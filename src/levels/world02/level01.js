// World 2 — Level 1: "Обсерватория". New mechanic: LASERS. A beam goes straight until a solid wall, is bounced 90° by
// mirror cubes (E flips the diagonal), passes through portals and powers receivers. Receivers LATCH: once lit they stay
// on, so the cat walking through a beam never locks a door — and one beam can light two receivers one after another.
//  A. intro: a crate stands in the beam; carry it away (a held crate blocks it too — drop it into the pit) → door A
//  B. mirror: a beam from the ceiling must be bent towards a wall receiver; the mirror starts in the wrong orientation
//  C. portals: the beam falls on the floor; a floor portal under it + a floor portal under a ceiling receiver.
//     Secret: an orange portal on the left wall aims the beam at a high receiver → a lid in the floor opens
//  D. finale: one beam, two latched receivers (left and right); drop the mirror under the beam, then flip it
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(114, 30);
  m.rect(0, 0, 113, 14);                         // thick ceiling / stars above are background
  m.rect(0, 26, 113, 29);                        // floor
  m.col(0, 0, 29); m.col(113, 0, 29);
  // A (cols 1-23): shelf with gift 1
  m.rect(7, 23, 9, 23, '=');
  m.rect(4, 26, 5, 26, '.');                     // pit: a parking spot for the crate (out of the beam)
  m.rect(24, 15, 25, 21);                        // wall above door A (door rows 22-25)
  // B (cols 26-51): shelf with a ladder for gift 2
  m.rect(40, 18, 47, 18); m.col(48, 18, 25, 'H');
  m.rect(52, 15, 53, 21);                        // wall above door B
  // C (cols 54-78): ladder + shelf for gift 3, wall with a passage to the receiver room, hidden pit (secret)
  m.col(54, 20, 25, 'H'); m.rect(55, 20, 57, 20);
  m.rect(70, 15, 71, 21);                        // passage below (rows 22-25)
  m.rect(72, 26, 73, 27, '.');                   // secret pit (lid = door 'sec')
  m.rect(79, 15, 80, 21);                        // wall above door C
  // D (cols 81-112): two steps carrying the receivers, shelves for gift 4, wall above door D
  m.rect(83, 24, 83, 25); m.rect(100, 24, 100, 25);
  m.rect(86, 23, 88, 23, '='); m.rect(90, 20, 92, 20, '=');
  m.rect(104, 15, 105, 21);
  return m.lines();
}

export const level01 = {
  id: 'w2l1', world: 2, number: 1,
  name: 'Обсерватория', subtitle: 'Лазеры, зеркала и приёмники',
  theme: 'observatory',
  map: buildMap(),
  start: [3, 26],
  exit: [108, 24],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 16, 8, 10, 'Обсерватория', 'Луч включает приёмник. Ничто не должно мешать');
    k.sign(4, 23, 'Красный луч питает приёмник на стене. Приёмник ЗАПОМИНАЕТ свет — дверь не закроется. Убери ящик гравипушкой — например, в ямку слева.');
    k.laser(1, 25, 'right');                                   // half a tile above the floor: crates/mirrors block it, low clutter (≤14 px) does not
    k.prop('crate', 12, 26);
    k.receiver(23, 25, 'rA', { face: 'left', size: 40 });
    k.door(24, 22, 2, 4, 'rA', { dir: 'up', travel: 4 * 32 });
    k.gift(8, 21, 'normal', 'g1');
    k.clutter(['book', 'cup', 'jar', 'can'], 15, 26, 6, 201);
    k.decor('poster', 17, 18, { w: 72, h: 28, text: 'ЛУЧ → ПРИЁМНИК', color: '#FFE9B8' });
    k.decor('window', 3, 16, { w: 64, h: 64 });
    // B
    k.sign(27, 23, 'Зеркальный куб отражает луч на 90°. Поставь его под луч. E рядом с кубом — перевернуть зеркало.');
    k.laser(34, 15, 'down');
    k.prop('mirror', 28, 26, { dir: 1 });
    k.receiver(51, 25, 'rB', { face: 'left', size: 40 });
    k.door(52, 22, 2, 4, 'rB', { dir: 'up', travel: 4 * 32 });
    k.gift(41, 16, 'normal', 'g2');
    k.clutter(['cup', 'jar', 'can', 'figurine', 'book'], 41, 18, 6, 202);
    k.decor('window', 30, 16, { w: 64, h: 64 }); k.decor('lampHang', 44, 15);
    // C
    k.sign(58, 23, 'Луч проходит СКВОЗЬ порталы и выходит из центра второго. Синий — в пол под луч, оранжевый — в пол под приёмник на потолке.');
    k.laser(60, 15, 'down');
    k.gift(56, 18, 'normal', 'g3');
    k.receiver(77, 15, 'rC', { face: 'down', size: 40 });
    k.door(79, 22, 2, 4, 'rC', { dir: 'up', travel: 4 * 32 });
    // secret: receiver high on the passage wall; the beam can only get there from a portal on the left wall
    k.receiver(69, 18, 'sec', { face: 'left', size: 40 });
    k.door(72, 26, 2, 2, 'sec', { dir: 'down', travel: 2 * 32, color: '#4A4F70' });
    k.gift(72.5, 27, 'rare', 'g5');
    k.secret(72, 26, 2, 2, 's1');
    k.sign(74, 23, 'Приёмник высоко на стене слева… Порталы бывают не только на полу. А когда приёмник загорелся — портал можно убрать.');
    k.clutter(['teddy', 'yarn', 'toyCube', 'ball'], 62, 26, 6, 203);
    k.decor('poster', 64, 17, { w: 80, h: 28, text: 'ТЕЛЕСКОП №2', color: '#DDE6EE' });
    // D
    k.sign(85, 21, 'Один луч — ДВА приёмника. Приёмники помнят свет: сначала один, потом переверни зеркало (E) — второй.');
    k.laser(92, 15, 'down');
    k.receiver(84, 25, 'r1', { face: 'right', size: 40 });
    k.receiver(99, 25, 'r2', { face: 'left', size: 40 });
    k.prop('mirror', 96, 26, { dir: 1 });
    k.door(104, 22, 2, 4, 'r1&r2', { dir: 'up', travel: 4 * 32 });
    k.gift(91, 18, 'big', 'g4');
    k.clutter(['cup', 'can', 'jar'], 106, 26, 4, 204);
    k.decor('window', 94, 16, { w: 96, h: 80 }); k.decor('lampHang', 88, 15);
    k.decor('poster', 108, 18, { w: 60, h: 28, text: 'ВЫХОД ↓', color: '#FFE9B8' });
  },
};
