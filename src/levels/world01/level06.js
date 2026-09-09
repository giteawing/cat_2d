// World 1 — Level 6: "Чердак" (finale of World 1). Combines everything:
//  A. carry a crate through a portal onto a plate behind a grate (door 1)
//  B. lever → fan lifts a ball into a wall button through a portal... simpler: fan lifts the CAT to a ceiling
//     portal that drops it on a high balcony (door 2 lever is up there)
//  C. momentum: floor portal in a deep well, wall portal → fly over a wall onto the roof, big gift
//  D. breakable wall + secret; final exit
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(150, 36);
  m.border();
  m.rect(0, 30, 149, 35);                       // ground
  // A: plate behind a grate window. You can see it and shoot through, but not walk there.
  m.rect(14, 1, 15, 29, '|');                   // full-height grate: see and shoot through, can't pass
  m.rect(14, 28, 15, 29);                       // brick base
  m.rect(16, 26, 22, 29);                       // pedestal in the sealed room: plate on top
  m.rect(24, 1, 26, 23);                        // wall 2 with door 1 at the bottom (rows 24-29)
  m.rect(24, 23, 26, 23, 'X');
  // B: fan shaft up to a balcony; lever for door 2 is on the balcony
  m.rect(34, 12, 44, 13);                       // balcony (starts right beside the fan shaft)
  m.rect(34, 12, 44, 12, 'X');
  m.rect(30, 14, 30, 27, 'X'); m.rect(34, 14, 34, 27, 'X');  // fan shaft walls (metal, cols 30 & 34; fan in 31-33); walk in under them (rows 28-29)
  m.rect(48, 1, 50, 21);                        // wall with door 2 (rows 22-29)
  m.rect(48, 21, 50, 21, 'X');
  // C: well + fling over a tall wall onto the roof
  m.rect(58, 30, 60, 34, '.');                  // deep narrow well (brick floor at row 35 = portal target)
  m.col(58, 30, 34, 'H');                       // ladder out
  m.rect(70, 1, 71, 9);                         // ceiling pillar: portal on its RIGHT face → fling right
  m.rect(80, 14, 84, 29);                       // tall wall block (top at row 14: roof)
  m.rect(85, 14, 100, 15);                      // roof continues (walkable)
  m.rect(101, 1, 103, 10);                      // upper wall: from the roof you drop down to the right (rows 11-29 open)
  m.rect(108, 16, 114, 17);                     // shelf after the roof (bonus gift; reach it with a ceiling portal)
  // D: breakable wall hides a secret room; the exit is beyond a last door opened by a plate under a chandelier
  m.rect(120, 22, 124, 29, 'B');                // cracked wall
  m.rect(125, 1, 127, 21, '|');                 // grate wall above the last door (door rows 22-29): shoot through it
  m.rect(125, 21, 127, 21, 'X');
  m.rect(132, 24, 136, 24, '=');                // shelf in the final room
  return m.lines();
}

export const level06 = {
  id: 'w1l6', world: 1, number: 6,
  name: 'Чердак', subtitle: 'Финал первого мира: всё вместе',
  theme: 'house',
  map: buildMap(),
  start: [3, 30],
  exit: [144, 28],
  weapons: ['gravity', 'portal'],
  giftCount: 4,
  setup(k, g) {
    // A
    k.message(2, 22, 8, 8, 'Чердак', 'Последний уровень мира: порталы, гравипушка, плиты, вентилятор и хлам');
    k.sign(5, 27, 'Плита за решёткой. Ящик туда: портал в потолок НАД плитой (стреляй сквозь решётку) + портал в пол здесь. Урони ящик в пол!');
    k.plate(18, 26, 'door1', { dx: 12, w: 3 * 32 });
    k.door(24, 24, 3, 6, 'door1', { dir: 'up', travel: 6 * 32 });
    k.prop('crate', 8, 30); k.prop('crate', 10, 30, { dx: 6 });
    k.clutter(['box', 'book', 'bookUp', 'lamp', 'jar', 'cup'], 3, 30, 5, 71);
    k.decor('window', 6, 8, { w: 96, h: 96 }); k.decor('picture', 18, 10, { w: 48, h: 40, color: '#9B6BE0' });
    // B
    k.sign(28, 27, 'Вентилятор поднимет тебя на балкон. Рычаг — рядом. Наверху — второй рычаг, он открывает дверь.');
    k.lever(28, 30, 'fanB');
    k.fan(31, 9, 3, 21, { requires: 'fanB' });
    k.lever(42, 12, 'door2');
    k.door(48, 22, 3, 8, 'door2', { dir: 'up', travel: 8 * 32 });
    k.gift(38, 10, 'normal', 'g1');
    k.clutter(['pillow', 'teddy', 'yarn', 'ball', 'toyCube'], 36, 30, 10, 72);
    k.clutter(['book', 'cup', 'plant'], 37, 12, 6, 73);
    k.decor('lampHang', 40, 1);
    // C
    k.sign(54, 27, 'Крыша слишком высоко. Портал — в дно колодца. Второй — в ПРАВЫЙ бок столба под потолком (обойди столб). Прыгни в колодец!');
    k.message(56, 20, 6, 10, 'Разгон', 'Чем глубже падение — тем дальше полёт');
    k.gift(90, 12, 'big', 'g2');
    k.clutter(['can', 'jar', 'bottle', 'box'], 64, 30, 6, 74);
    k.clutter(['plant', 'pot', 'book', 'lamp', 'cup', 'jar'], 86, 14, 12, 75);
    k.sign(76, 27, 'Обратно вниз всегда можно спрыгнуть.');
    k.funRoom(64, 30, 14, 76, 0.6);
    k.decor('balloon', 74, 4, { color: '#F25C5C' }); k.decor('balloon', 78, 6, { color: '#7ED37E' });
    // between C and D: a small physics playground
    k.funRoom(104, 30, 7, 77, 0.8);
    k.gift(111, 14, 'bonus', 'g3');
    k.sign(106, 27, 'Полка над головой. Портал в потолок над ней (стреляй сбоку, чтобы полка не мешала) + портал в пол.');
    // D
    k.sign(115, 27, 'Стена с трещинами. За ней — что-то сияет. Тяжёлое и быстрое!');
    k.prop('bigCrate', 114, 30);
    k.gift(134, 22, 'rare', 'g4');                 // above the shelf (cols 132-136): needs a jump
    k.plate(129, 30, 'door3', { label: '' });
    k.door(125, 22, 3, 8, 'door3', { dir: 'up', travel: 8 * 32 });
    k.sign(121, 27, 'Последняя дверь. Плита — за ней. Портал в потолок за решёткой (прямо над плитой) + портал в пол — и ящик сам нажмёт её.');
    k.secret(128, 20, 8, 4, 's1');
    k.clutter(['giftBox', 'giftBox', 'teddy', 'toyCube'], 132, 24, 4, 78);
    k.decor('lampHang', 134, 1); k.decor('balloon', 140, 6, { color: '#5BC0DE' }); k.decor('balloon', 143, 4, { color: '#F2C14B' });
    k.decor('poster', 138, 18, { w: 60, h: 28, text: 'ВЫХОД →', color: '#FFE9B8' });
  },
};
