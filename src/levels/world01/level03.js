// World 1 — Level 3: "Игровая комната". Objects through portals: drop a crate into a floor portal so it
// flies out of a wall portal onto a plate; lever + door; a big toy room for chaos; secret behind a breakable wall.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(120, 28);
  m.border();
  m.rect(0, 24, 119, 27);                       // ground
  // start area: toy room (fun) with shelves
  m.row(19, 4, 10, '='); m.row(15, 6, 12, '='); m.row(19, 14, 20, '=');
  // A: gap you cross with a lever-controlled platform? keep simple: pit with metal floor (non portalable) — cross by jumping on crates
  m.rect(24, 24, 29, 27, '.'); m.rect(24, 27, 29, 27, 'X');
  // B: crate-through-portal puzzle. Plate on top of a tall tower; drop a crate into a floor portal so it falls
  // out of a ceiling portal onto the plate.
  m.rect(46, 11, 50, 23);                       // tall tower, plate on top
  m.rect(46, 11, 50, 11, 'X');                  // metal top: no portals on the plate surface itself
  m.rect(56, 1, 58, 17);                        // wall with a door at the bottom (rows 18-23)
  m.rect(56, 18, 58, 18, 'X');                  // metal lintel
  // C: after the door: lever room + moving platform up to the gift
  m.rect(70, 12, 76, 13);                       // ledge
  m.rect(84, 8, 90, 9);                         // higher ledge
  m.rect(96, 1, 97, 19);                        // wall; pass under? no — rows 20-23 open
  // cracked wall blocks the corridor (cols 100-104, rows 20-23): smash it with the heavy crate.
  m.rect(100, 20, 104, 23, 'B');
  m.rect(98, 14, 112, 19);                      // corridor ceiling
  m.rect(106, 16, 108, 19, '.');                // secret pocket above the corridor (open from below)
  return m.lines();
}

export const level03 = {
  id: 'w1l3', world: 1, number: 3,
  name: 'Игровая комната', subtitle: 'Предметы тоже летают через порталы',
  theme: 'house',
  map: buildMap(),
  start: [3, 24],
  exit: [116, 22],
  weapons: ['gravity', 'portal'],
  giftCount: 3,
  setup(k, g) {
    // toy room
    k.message(2, 16, 8, 8, 'Игровая комната', 'Всё, что видишь, можно схватить и бросить');
    k.funRoom(3, 24, 20, 41, 1.4);
    k.clutter(['teddy', 'toyCube', 'toyCube', 'ball', 'yarn', 'book'], 4, 19, 6, 42);
    k.clutter(['giftBox', 'toyCube', 'teddy', 'ball', 'figurine'], 6, 15, 6, 43);
    k.clutter(['bigBall', 'pillow', 'teddy', 'toyCube', 'yarn'], 14, 19, 6, 44);
    k.decor('window', 8, 6, { w: 96, h: 96 }); k.decor('picture', 16, 8, { w: 48, h: 40, color: '#F2C14B' });
    k.decor('balloon', 20, 4, { color: '#7ED37E' }); k.decor('balloon', 22, 6, { color: '#F25C5C' });
    k.stack('crate', 21, 24, 2);
    k.sign(21, 21, 'Яма с металлическим дном: на металл порталы не ставятся. Сбрось в яму ящики и перепрыгни!');
    // B
    k.sign(31, 21, 'Плита — на вершине башни. Портал в пол здесь, второй — в потолок НАД башней. Брось ящик в пол!');
    k.message(30, 16, 5, 8, 'Предмет сквозь портал', 'Ящик упадёт в портал в полу и вылетит из потолка прямо на плиту');
    k.prop('crate', 32, 24); k.prop('crate', 33, 24, { dx: 4 });
    k.prop('cube', 30, 24);
    k.plate(47, 11, 'doorB', { label: '', dx: 8 });
    k.door(56, 19, 3, 5, 'doorB', { dir: 'up', travel: 5 * 32 });
    k.gift(53, 22, 'normal', 'g1');
    k.decor('lampHang', 42, 1);
    k.clutter(['box', 'smallBox', 'can', 'ball', 'book', 'jar', 'cup', 'plate'], 38, 24, 8, 46);
    k.clutter(['teddy', 'yarn', 'toyCube'], 51, 24, 4, 47);
    // C: lever + platform
    k.sign(61, 21, 'Рычаг (E) включает платформу. Подарок — на верхней полке.');
    k.lever(64, 24, 'lift1');
    k.platform(64, 22, 3, 64, 13, { requires: 'lift1', speed: 60, wait: 1.2, color: '#8B6A44' });
    k.gift(87, 6, 'bonus', 'g2');
    k.clutter(['plant', 'lamp', 'book', 'bookUp', 'cup'], 70, 12, 6, 47);
    k.sign(78, 21, 'Не дотянуться до верхней полки? Порталы решают всё: пол + стена над полкой.');
    k.funRoom(60, 24, 30, 48, 0.8);
    k.stack('crate', 92, 24, 1);
    // secret: breakable wall
    k.sign(95, 21, 'Стена с трещинами. Гравипушка + тяжёлый ящик на большой скорости — и стены нет.');
    k.gift(107, 17, 'secret', 'g3');
    k.secret(106, 16, 3, 3, 's1');
    k.sign(109, 21, 'Дырка в потолке… Сложи ящики (большой — вниз) и запрыгни.');
    k.prop('bigCrate', 93, 24);
    k.decor('poster', 100, 12, { w: 40, h: 24, text: 'BREAK', color: '#E0C0A0' });
  },
};
