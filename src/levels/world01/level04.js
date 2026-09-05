// World 1 — Level 4: "Подвал". Momentum: fall into a floor portal, fly out of a wall portal across a gap.
// Buttons hit by thrown objects, a fan column, a door that needs a button AND a plate.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(130, 30);
  m.border();
  m.rect(0, 26, 129, 29);                       // ground
  // A: fling gap. Floor portal before the gap, wall portal on the left face of a tall block on the far side?
  // No — the classic: portal on the floor here, portal high on the wall BEHIND you, facing the gap. Falling from
  // height into the floor portal shoots you out of the wall portal horizontally across the pit.
  m.rect(12, 1, 13, 25);                        // tall wall behind the start: the "cannon" wall (rows 1-25)
  m.rect(12, 20, 13, 25, '.');                  // ... with a passage at the bottom (rows 20-25)
  m.rect(24, 26, 30, 28, '.');                  // wide pit (7 tiles — too far to jump)
  m.rect(24, 29, 30, 29, 'X');                  // metal bottom (no portals down there)
  m.col(24, 26, 28, 'H');                       // ladder back out of the pit
  m.rect(16, 10, 18, 10, '=');                  // high shelf to fall from: step off its right edge into the floor portal
  m.col(16, 10, 25, 'H');                       // ladder to the shelf
  // B: fan shaft. A door blocks the corridor; behind it a fan lifts you up to a ledge.
  m.rect(48, 1, 50, 19);                        // wall, door below (rows 20-25)
  m.rect(48, 19, 50, 19, 'X');
  m.rect(58, 14, 70, 15);                       // ledge you reach with the fan (fan column is at 55-57, beside it)
  m.rect(58, 16, 58, 25, 'X');                  // metal column marking the fan shaft (right side)
  m.rect(54, 16, 54, 25, 'X');                  // metal column (left side)
  m.rect(71, 1, 73, 13);                        // upper wall: passage over the ledge blocked → go under? no: rows 14-15 ledge,
  m.rect(71, 14, 73, 15, '.');                  // gap in the wall at ledge height (walk through on the ledge)
  m.rect(71, 16, 73, 25);                       // wall below the ledge
  // C: crate through a grate. Button behind a grate window: hit it with a thrown ball via a portal? Simpler:
  // a plate on a high shelf reachable only by objects; a wall portal + floor portal deliver a crate.
  m.rect(88, 10, 91, 11);                       // high shelf (plate on top). Ceiling above it is brick → portal target
  m.rect(88, 10, 91, 10, 'X');                  // metal top
  m.rect(96, 1, 98, 18);                        // final wall with the door at the bottom
  m.rect(96, 18, 98, 18, 'X');
  // after the door: a flat corridor, then a cracked wall (cols 116-120) sealing the exit alcove
  m.rect(116, 22, 120, 25, 'B');
  m.rect(114, 19, 128, 21);                     // low ceiling over the wall and the alcove
  return m.lines();
}

export const level04 = {
  id: 'w1l4', world: 1, number: 4,
  name: 'Подвал', subtitle: 'Скорость сохраняется: падай в пол — вылетай из стены',
  theme: 'lab',
  map: buildMap(),
  start: [3, 26],
  exit: [125, 24],
  weapons: ['gravity', 'portal'],
  giftCount: 3,
  setup(k, g) {
    // A: fling
    k.message(2, 18, 8, 8, 'Подвал', 'Что влетает в портал быстро — вылетает так же быстро');
    k.sign(7, 23, 'Яма слишком широкая. Синий портал — в пол под полкой. Оранжевый — в стену слева, повыше. Прыгни с полки в синий!');
    k.sign(18, 23, 'Чем выше падение — тем дальше полёт.');
    k.decor('poster', 15, 12, { w: 44, h: 26, text: 'SPEED', color: '#B9D3EE' });
    k.decor('pipe', 14, 2, { w: 12, h: 200 }); k.decor('pipe', 40, 3, { w: 300, h: 10 });
    k.clutter(['can', 'jar', 'bottle', 'wrench', 'box', 'tire'], 15, 26, 8, 51);
    k.prop('tire', 20, 26); k.prop('ball', 8, 8);
    k.gift(28, 22, 'normal', 'g1');               // floats above the pit: grab it mid-flight
    // B: fan + button
    k.sign(40, 23, 'Дверь открывается кнопкой на стене. Не дотянуться — кинь в неё что-нибудь!');
    k.button(44, 18, 'btnB', { dy: 0 });          // high on the wall: hit with a thrown object
    k.door(48, 20, 3, 6, 'btnB', { dir: 'up', travel: 6 * 32 });
    k.clutter(['ball', 'ball', 'can', 'toyCube', 'box'], 38, 26, 5, 52);
    k.sign(53, 23, 'Вентилятор поднимет тебя и всё лёгкое. Включается рычагом.');
    k.lever(52, 26, 'fan1');
    k.fan(55, 14, 3, 12, { requires: 'fan1' });
    k.decor('pipe', 62, 1, { w: 10, h: 60 });
    k.clutter(['pillow', 'yarn', 'teddy', 'ball'], 55, 26, 3, 53);
    k.gift(68, 12, 'normal', 'g2');
    k.clutter(['jar', 'book', 'bookUp', 'cup'], 63, 14, 5, 54);
    // C: crate onto the high plate (portal from the floor into the wall above the shelf, or via fan?)
    k.sign(74, 23, 'Плита — на металлической полке. Портал в потолок НАД полкой (стреляй издалека, под углом) + портал в пол. Урони ящик!');
    k.prop('crate', 80, 26); k.prop('crate', 92, 26, { dx: 6 });
    k.plate(88, 10, 'plateC', { dx: 6, w: 3.6 * 32 });
    k.door(96, 19, 3, 7, 'plateC', { dir: 'up', travel: 7 * 32 });
    k.decor('poster', 88, 20, { w: 48, h: 26, text: 'LIFT', color: '#B9D3EE' });
    k.funRoom(86, 26, 8, 55, 0.6);
    // after the door: lower room with a secret behind a cracked wall
    k.sign(102, 23, 'Стена с трещинами перекрыла выход. Тяжёлое и быстрое ломает трещины: разгони большой ящик гравипушкой!');
    k.prop('bigCrate', 106, 26);
    k.clutter(['can', 'bottle', 'jar'], 100, 26, 3, 56);
    k.gift(123, 24, 'rare', 'g3');
    k.decor('lampHang', 108, 1); k.decor('lampHang', 30, 1);
  },
};
