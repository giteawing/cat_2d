// World 1 — Level 5: "Оранжерея". Garden theme. Two plates that must be held at once (crate + cat),
// a wall→wall portal bridge, a moving platform ride with a portal shot mid-ride, and a tall greenhouse
// with a floor-portal loop to build up speed for a high shelf.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(140, 32);
  m.border();
  m.rect(0, 28, 139, 31);                       // ground
  // A: two-plate door. Plate 1 on the floor, plate 2 on a low pedestal. Crate on one, cat on the other.
  m.rect(14, 26, 16, 27);                       // pedestal for plate 2
  m.rect(22, 1, 24, 21);                        // wall with a door at the bottom (rows 22-27)
  m.rect(22, 21, 24, 21, 'X');
  // B: canyon. No way across on foot: drop into a floor portal on this side, fall out of a ceiling portal on
  // the far side. The far side has a low hanging block whose underside is the ceiling target.
  m.rect(32, 28, 47, 31, '.');                  // chasm (16 wide)
  m.rect(32, 31, 47, 31, 'X');                  // metal bottom (no portals down there)
  m.col(32, 28, 30, 'H'); m.col(47, 28, 30, 'H'); // ladders out of the chasm (no dead ends)
  m.rect(48, 1, 54, 14);                        // hanging block over the far side (ceiling at row 14)
  // C: moving platform over a flowerbed to a high greenhouse ledge
  m.rect(59, 13, 66, 14);                       // greenhouse upper ledge (left), level with the lift's top stop
  m.rect(76, 8, 84, 9);                         // greenhouse top ledge (gift)
  m.rect(86, 1, 88, 20);                        // glass-house wall with a door (rows 21-27)
  m.rect(86, 20, 88, 20, 'X');
  m.rect(86, 4, 88, 12, 'G');                   // glass part of the wall (see-through, no portals)
  // D: speed loop. Floor portal pair to fall repeatedly? no — floor → high wall to reach the roof shelf.
  m.rect(91, 8, 93, 8);                         // perch: climb the pole, step off to the right into the floor portal
  m.col(92, 9, 27, 'H');
  m.rect(96, 1, 97, 8);                         // pillar hanging from the ceiling (portal target: its right face)
  m.rect(108, 10, 118, 11);                     // high shelf with the rare gift
  m.rect(108, 10, 118, 10, 'X');
  m.rect(124, 1, 126, 24);                      // final wall, low passage (rows 25-27) under it
  m.rect(124, 24, 126, 24, 'X');
  m.rect(128, 20, 138, 20, '=');                // shelf near the exit (secret pocket above)
  return m.lines();
}

export const level05 = {
  id: 'w1l5', world: 1, number: 5,
  name: 'Оранжерея', subtitle: 'Две плиты, мост из порталов и подъёмник',
  theme: 'garden',
  map: buildMap(),
  start: [3, 28],
  exit: [134, 26],
  weapons: ['gravity', 'portal'],
  giftCount: 4,
  setup(k, g) {
    // A
    k.message(2, 20, 8, 8, 'Оранжерея', 'Дверь с двумя плитами: обе должны быть нажаты одновременно');
    k.sign(6, 25, 'Две плиты — одна дверь. Ящик на одну, сам — на другую. Дверь останется открытой, пока обе нажаты… или пока ты не пробежишь!');
    k.plate(9, 28, 'plA1', { label: '1' });
    k.plate(14, 26, 'plA2', { label: '2', dx: 8 });
    k.door(22, 22, 3, 6, 'plA1&plA2', { dir: 'up', travel: 6 * 32, speed: 0.45 });
    k.prop('crate', 5, 28); k.prop('crate', 18, 28);
    k.clutter(['plant', 'pot', 'jar', 'ball', 'book'], 2, 28, 4, 61);
    k.decor('window', 4, 8, { w: 128, h: 128 });
    k.decor('balloon', 12, 6, { color: '#7ED37E' });
    // B: bridge
    k.sign(27, 25, 'Пропасть. Портал в пол здесь, портал в потолок вон под той плитой — и ты просто упадёшь на ту сторону.');
    k.message(28, 18, 4, 10, 'Через пропасть', 'Пол → потолок: гравитация перенесёт тебя сама');
    k.gift(53, 20, 'normal', 'g1');                 // on the way down from the ceiling portal
    k.clutter(['plant', 'pot', 'ball', 'yarn'], 26, 28, 3, 62);
    k.decor('balloon', 40, 10, { color: '#F25C5C' });
    // C: platform
    k.sign(52, 25, 'Рычаг включает подъёмник. По дороге наверх успей выстрелить порталом в стену!');
    k.lever(59, 28, 'liftC');
    k.platform(56, 27, 3, 56, 13, { requires: 'liftC', speed: 70, wait: 3, color: '#6B8E4E' });
    k.gift(79, 6, 'bonus', 'g2');
    k.sign(61, 10, 'Верхняя полка выше, чем прыжок. Портал в стену над ней + портал в пол здесь.');
    k.clutter(['plant', 'plant', 'pot', 'jar', 'cup'], 61, 13, 5, 63);
    k.plate(78, 8, 'doorC', { dx: 40, label: '' });          // plate beside the gift: press it (or leave a crate) to open the door below
    k.door(86, 21, 3, 7, 'doorC', { dir: 'up', travel: 7 * 32 });
    k.sign(70, 25, 'Дверь открывает плита на верхней полке. Что-то тяжёлое должно остаться на ней… или пробеги, пока стоишь?');
    k.prop('crate', 66, 28); k.prop('barrel', 72, 28);
    k.funRoom(62, 28, 22, 64, 0.5);
    // D: high shelf
    k.sign(94, 25, 'Полка под потолком, далеко. Портал в пол под шестом, второй — в правый бок столба под потолком. Залезь на шест, шагни в портал — и лети!');
    k.gift(113, 8, 'rare', 'g3');
    k.clutter(['plant', 'pot', 'book', 'cup', 'jar'], 109, 10, 8, 65);
    k.funRoom(100, 28, 20, 66, 0.6);
    k.stack('crate', 121, 28, 2);
    k.secret(128, 15, 10, 5, 's1');
    k.gift(134, 18, 'secret', 's1g');
    k.sign(128, 25, 'Полка над выходом. Оттуда что-то блестит.');
    k.decor('lampHang', 70, 1); k.decor('lampHang', 110, 1);
    k.decor('balloon', 130, 8, { color: '#5BC0DE' });
  },
};
