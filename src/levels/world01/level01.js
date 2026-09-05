// World 1 — Level 1: "Уютный дом". Movement, jumping, ladders, first props, Gravity Gun,
// first pressure-plate puzzle, kitchen fun room.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(96, 24);
  m.border();
  m.rect(0, 20, 95, 23);                 // ground
  // --- section A: steps ---
  m.rect(10, 19, 11, 19); m.rect(14, 18, 15, 19); m.rect(18, 17, 19, 19);
  m.row(16, 6, 8, '='); m.row(13, 2, 4, '=');      // secret ledge above the start
  // --- pit with a ladder out ---
  m.rect(24, 20, 26, 22, '.'); m.col(26, 19, 22, 'H');
  // --- platforms up to the upper floor ---
  m.row(17, 29, 31, '='); m.row(14, 32, 34, '=');
  m.row(12, 34, 60);                       // upper floor
  m.col(36, 12, 19, 'H');                  // ladder from the living room to the upper floor
  m.col(52, 1, 8);                         // wall above the door
  m.col(60, 13, 19);                       // wall between the living room and the kitchen
  m.col(63, 12, 19, 'H');                  // ladder back up from the kitchen
  // --- kitchen shelves ---
  m.row(16, 66, 72, '='); m.row(16, 80, 88, '=');
  m.row(13, 84, 88, '=');
  return m.lines();
}

export const level01 = {
  id: 'w1l1', world: 1, number: 1,
  name: 'Уютный дом', subtitle: 'Учимся бегать, прыгать и хватать',
  theme: 'house',
  map: buildMap(),
  start: [3, 20],
  exit: [90, 18],
  giftCount: 3,
  setup(k, g) {
    k.sign(3, 17, 'A/D — идти, Space — прыжок, Shift — бег. Наверху есть секрет!');
    k.prop('ball', 7, 20); k.prop('box', 12, 20); k.prop('toyCube', 13, 20, { dx: 6 }); k.prop('toyCube', 13, 20, { dx: 6, dy: 15 });
    k.prop('yarn', 21, 20);
    k.decor('window', 5, 8, { w: 96, h: 96 }); k.decor('picture', 28, 9, { w: 40, h: 32, color: '#F2A0B8' });
    k.decor('balloon', 20, 6, { color: '#5BC0DE' }); k.decor('balloon', 22, 7, { color: '#F25C5C' });
    k.gift(3, 11, 'secret', 'secret1');
    k.secret(2, 10, 3, 3, 's1');
    k.sign(23, 17, 'Упал в яму? Не беда — лестница поможет. Таймеров тут нет.');
    k.message(29, 13, 6, 7, 'Тонкие полки', 'Прыгай на них снизу, спускайся через S + Space');
    // upper floor: gravity gun & plate puzzle
    k.weaponPickup(40, 10, 'gravity');
    k.sign(43, 9, 'Gravity Gun: наведись на ящик, ЛКМ — схватить, ещё раз ЛКМ — бросить. ПКМ — отпустить.');
    k.prop('crate', 44, 12);
    k.plate(47, 12, 'd1', { label: '' });
    k.door(52, 9, 1, 3, 'd1');
    k.sign(49, 9, 'Положи ящик на красную плиту — дверь откроется.');
    k.gift(55, 10, 'normal', 'g1');
    k.decor('picture', 56, 6, { w: 48, h: 40, color: '#9B6BE0' });
    k.decor('lampHang', 45, 1);
    // living room below (optional fun)
    k.decor('shelf', 40, 15, { w: 128 });
    k.clutter(['book', 'book', 'bookUp', 'figurine', 'plant', 'cup'], 40, 15, 4, 11);
    k.clutter(['pillow', 'pillow', 'teddy', 'ball', 'box', 'toyCube', 'yarn', 'stool', 'lamp'], 38, 20, 20, 12);
    k.stack('box', 54, 20, 3); k.stack('book', 50, 20, 4, { dx: 4 });
    k.message(37, 13, 4, 7, 'Гостиная', 'Тут можно просто раскидать вещи ради веселья');
    // kitchen fun room
    k.message(61, 12, 3, 8, 'Кухня!', 'Десятки предметов — устрой хаос с Gravity Gun');
    k.clutter(['cup', 'cup', 'plate', 'plate', 'jar', 'bottle', 'cup', 'can', 'jar', 'pot'], 66, 16, 7, 21);
    k.clutter(['pot', 'pot', 'cup', 'plate', 'plate', 'bottle', 'bottle', 'jar', 'can', 'can', 'cup'], 80, 16, 9, 22);
    k.clutter(['cup', 'bottle', 'jar', 'figurine', 'can'], 84, 13, 5, 23);
    k.gift(86, 11, 'bonus', 'g2');
    k.clutter(['box', 'smallBox', 'stool', 'can', 'ball', 'box', 'pot', 'plate', 'cup', 'bottle', 'smallBox', 'jar', 'teddy', 'toyCube', 'can', 'bigBall', 'cup', 'pot', 'jar', 'can', 'bottle', 'plate', 'cup', 'box'], 65, 20, 24, 24);
    k.stack('plate', 70, 20, 5); k.stack('cup', 75, 20, 3); k.stack('box', 78, 20, 3); k.stack('can', 82, 20, 4); k.stack('smallBox', 86, 20, 3); k.stack('cup', 68, 20, 2, { dx: 10 });
    k.clutter(['cup', 'jar', 'can', 'cup', 'bottle', 'plate'], 61, 20, 4, 25);
    k.decor('window', 70, 4, { w: 128, h: 96 }); k.decor('lampHang', 75, 1);
    k.sign(89, 17, 'Выход. Собрал все подарки? Можно вернуться по лестнице.');
  },
};
