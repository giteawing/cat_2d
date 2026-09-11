// World 1 — Level 7: "Квантовая лаборатория". Introduces ELECTRIC FIELDS (thin floor-to-ceiling walls, plus a field
// floor and a field ceiling) and the cat's QUANTUM TUNNELING MODE (Q): with the mode on, running into a field passes
// through with 25% probability, otherwise the cat bounces back elastically. Objects never tunnel — they bounce.
//  A. pick up the quantum mode, tunnel through the first field (pure intro)
//  B. a crate must reach a plate behind a field: portal shots pass through fields → ceiling portal beyond + floor portal here
//  C. upper floor with a FIELD FLOOR: a trampoline (elastic bounce) to a big gift; with the mode on you may fall
//     through it into a secret room below
//  D. a fan shaft capped by a FIELD CEILING: the fan keeps throwing you at it until you tunnel up into the lever room
//  E. finale: a physics playground (balls bounce off the field), last field, rare gift, exit
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(130, 34);
  m.border();
  m.rect(0, 30, 129, 33);                       // ground
  m.rect(1, 1, 45, 11);                         // low lab ceiling over rooms A/B (portal target for B; its underside must be visible when peeking up)
  // A: first field wall. Everything on the near side is metal (no portal shortcut): tunneling is the only way.
  m.col(16, 12, 29, '~');
  m.rect(1, 11, 16, 11, 'X'); m.rect(1, 30, 15, 30, 'X'); m.col(0, 12, 29, 'X');
  // B: crate → plate behind the field; door B at the end
  m.col(34, 12, 29, '~');
  m.rect(44, 12, 45, 25);                       // wall above door B (door rows 26-29)
  // C: upper floor (rows 18-19) with a field floor at cols 60-65; secret room underneath
  m.rect(50, 18, 80, 19);
  m.col(50, 18, 29, 'H');                       // ladder up to the upper floor
  m.rect(60, 18, 65, 19, '~');                  // field floor (trampoline)
  m.col(58, 20, 29); m.col(67, 20, 29);         // secret room walls (cols 59-66 inside)
  m.col(66, 18, 29, 'H');                       // ladder out of the secret room (top replaces the slab)
  m.rect(55, 10, 59, 10);                       // high ledge to drop from
  m.col(54, 10, 17, 'H');                       // ladder from the upper floor to the ledge
  // D: fan shaft capped by a field ceiling; lever room above
  m.col(83, 15, 27, 'X'); m.col(87, 15, 27, 'X');   // shaft walls (walk in under them, rows 28-29)
  m.rect(84, 14, 86, 14, '~');                  // field ceiling over the shaft
  m.rect(83, 7, 93, 7, 'X');                    // lever room ceiling (metal: no portal shortcut through the field)
  m.col(83, 8, 14, 'X');                        // lever room left wall
  m.rect(87, 14, 92, 14, 'X');                  // lever room floor
  m.col(93, 8, 10);                             // right wall with an opening (rows 11-13) → ledge outside
  m.rect(93, 14, 96, 14);                       // ledge out of the lever room
  m.rect(100, 1, 101, 25);                      // wall above door D (door rows 26-29)
  // E: finale
  m.rect(102, 1, 128, 13);                      // ceiling slab of the last hall
  m.col(112, 14, 29, '~');                      // last field
  m.rect(113, 13, 128, 13, 'X'); m.rect(113, 30, 128, 30, 'X'); m.col(129, 14, 29, 'X');   // beyond it: metal only → tunneling is the only way
  return m.lines();
}

export const level07 = {
  id: 'w1l7', world: 1, number: 7,
  name: 'Квантовая лаборатория', subtitle: 'Потенциальные барьеры и квантовое туннелирование',
  theme: 'lab',
  map: buildMap(),
  start: [3, 30],
  exit: [124, 28],
  weapons: ['gravity', 'portal'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 20, 12, 10, 'Квантовая лаборатория', 'Потенциальные барьеры непроходимы… почти');
    k.sign(4, 27, 'Впереди ЭЛЕКТРОПОЛЕ: сквозь него не пройти и ничего не пронести. Но выстрелы портальной пушки проходят.');
    k.weaponPickup(9, 29, 'tunnel');
    k.sign(12, 27, 'Режим квантового туннелирования: Q. Разбегись (Shift) и беги в барьер — шанс 25%. Не вышло? Отскочишь. Пробуй ещё!');
    k.clutter(['jar', 'bottle', 'can', 'book'], 2, 30, 6, 81);
    k.decor('poster', 6, 22, { w: 64, h: 28, text: 'ОСТОРОЖНО: ПОЛЕ', color: '#FFE9B8' });
    k.decor('pipe', 1, 12, { w: 15 * 32, h: 6 }); k.decor('pipe', 17, 12, { w: 27 * 32, h: 6 });
    k.gift(20, 28, 'normal', 'g1');
    // B
    k.sign(24, 27, 'Ящик барьер не пропустит — отскочит. Плита за барьером. Портал в потолок НАД плитой (стреляй сквозь барьер) + портал в пол здесь. Урони ящик в пол!');
    k.prop('crate', 22, 30); k.prop('crate', 26, 30, { dx: 8 });
    k.clutter(['box', 'cup', 'lamp', 'toyCube'], 28, 30, 5, 82);
    k.plate(41, 30, 'doorB', { w: 3 * 32 });
    k.door(44, 26, 2, 4, 'doorB', { dir: 'up', travel: 4 * 32 });
    k.decor('poster', 38, 20, { w: 60, h: 28, text: 'ПЛИТА →', color: '#DDE6EE' });
    // C
    k.sign(47, 27, 'Наверху — пол из потенциального барьера. Падать на него безопасно: он пружинит! Но… в квантовом режиме можно и провалиться.');
    k.gift(62, 12, 'big', 'g2');
    k.sign(56, 15, 'Лестница ведёт на карниз. Спрыгни с него на барьер — и взлетишь к подарку.');
    k.gift(61, 28, 'secret', 'g3');
    k.secret(59, 24, 7, 6, 's1');
    k.sign(62, 27, 'Тайная комната под барьером! Лестница справа выведет наверх.');
    k.clutter(['ball', 'yarn', 'teddy', 'toyCube'], 60, 30, 5, 83);
    k.clutter(['book', 'cup', 'plant', 'lamp'], 68, 18, 10, 84);
    k.funRoom(70, 30, 10, 85, 0.7);
    // D
    k.sign(78, 27, 'Шахта с вентилятором. Сверху — потолок из барьера. Включи квантовый режим: вентилятор будет бросать тебя в барьер, пока не пройдёшь.');
    k.lever(81, 30, 'fanD');
    k.fan(84, 15, 3, 15, { requires: 'fanD' });
    k.gift(85, 12, 'normal', 'g4');
    k.lever(90, 14, 'doorD');
    k.sign(88, 11, 'Рычаг открывает дверь внизу. Выход из комнаты — справа.');
    k.door(100, 26, 2, 4, 'doorD', { dir: 'up', travel: 4 * 32 });
    k.decor('pipe', 94, 8, { w: 6, h: 6 * 32 });
    // E
    k.sign(103, 27, 'Физическая площадка: брось мяч в барьер — он отскочит. А тебе — последний барьер и выход.');
    k.prop('ball', 104, 30); k.prop('ball', 105, 30, { dx: 10 }); k.prop('ball', 106, 30, { dx: 4 });
    k.clutter(['box', 'can', 'jar', 'bottle', 'cup'], 102, 30, 4, 86);
    k.funRoom(114, 30, 6, 87, 0.6);
    k.gift(118, 28, 'rare', 'g5');
    k.decor('poster', 116, 20, { w: 60, h: 28, text: 'ВЫХОД →', color: '#FFE9B8' });
    k.decor('pipe', 102, 14, { w: 27 * 32, h: 6 });
  },
};
