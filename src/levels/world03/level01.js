// World 3 — Level 1: "Аквариум". New mechanic: WATER. The cat swims (A/D paddle, S dive, W surface, Space at the
// surface = hop out); things float or sink by their density (wood/soft float, metal/ceramic/glass sink); a valve can
// fill a tank, and whatever floats rises with the water.
//  A. intro pool: swim across; gift on the bottom (dive). Secret: an underwater side tunnel on the left
//  B. the well: drop into a tall tank, open the valve, float up to the rim
//  C. buoyancy sorting: a plate on the pool floor needs something that SINKS (the crate floats, the metal cube sinks)
//  D. finale: a raft with a mirror; raise the water so the mirror meets the beam under the ceiling → ceiling receiver
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(120, 32);
  m.rect(0, 0, 119, 11);                         // ceiling
  m.rect(0, 26, 119, 31);                        // floor (thick: pools are dug into it)
  m.col(0, 0, 31); m.col(119, 0, 31);
  // A (cols 1-23): pool pit + secret tunnel to the left of it
  m.rect(5, 26, 15, 29, '.');                    // pool (4 deep)
  m.rect(2, 28, 4, 29, '.');                     // secret tunnel (underwater)
  m.rect(19, 22, 21, 22, '=');                   // shelf with the sign about the well
  // B (cols 24-44): ladder up to the rim, the well (cols 26-37, rows 14-25), glass wall, rim shelf, drop on the right
  m.col(24, 14, 25, 'H');
  m.col(25, 14, 25);                             // left wall of the well
  m.col(38, 16, 25, 'G');                        // glass: you can see the water, not walk through it
  m.rect(38, 15, 40, 15);                        // rim shelf
  // C (cols 45-70): pool with a plate on the bottom, shelf for gift 3, door C
  m.rect(50, 26, 58, 29, '.');
  m.rect(63, 23, 65, 23, '=');
  m.rect(68, 12, 69, 21);                        // wall above door C (rows 22-25)
  // D (cols 71-118): ladder + wall, the big tank (cols 76-95, rows 15-25) with pillars keeping the raft in place,
  //    glass wall + rim shelf on the right, door D, exit
  m.col(74, 14, 25, 'H');
  m.col(75, 14, 25);
  m.col(84, 22, 25); m.col(88, 22, 25);          // raft slot (cols 85-87)
  m.col(96, 16, 25, 'G');
  m.rect(96, 15, 98, 15);
  m.rect(104, 12, 105, 21);                      // wall above door D
  return m.lines();
}

export const level01 = {
  id: 'w3l1', world: 3, number: 1,
  name: 'Аквариум', subtitle: 'Вода: плавание, плавучесть, вентили',
  theme: 'aquarium',
  map: buildMap(),
  start: [2, 26],
  exit: [110, 24],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 13, 8, 13, 'Аквариум', 'Кот умеет плавать. Правда!');
    k.sign(3, 23, 'Вода! A/D — грести, S — нырнуть, W — всплыть. У поверхности Space — выпрыгнуть на берег. Подарок на дне — ныряй.');
    k.water(2, 26, 14, 4);                                         // the pool (and the secret tunnel) — full
    k.gift(10, 29, 'normal', 'g1');
    k.gift(2, 28, 'rare', 'g5'); k.secret(2, 28, 3, 2, 's1');
    k.sign(17, 23, 'Слева, под водой, за краем бассейна что-то блестит…', { w: 2 });
    k.clutter(['duck', 'ball', 'cup'], 6, 26, 8, 301);            // ducks and balls float, the cup sinks
    k.decor('poster', 8, 15, { w: 84, h: 28, text: 'АКВАРИУМ', color: '#BFEFF5' });
    k.sign(20, 20, 'Дальше — колодец. Спускаться придётся с разбегу… точнее, с обрыва. Внизу вентиль: вода поднимет тебя обратно.');
    // B
    k.water(26, 14, 12, 12, { level: 11 / 12, levelEmpty: 0.25, requires: 'fillB', speed: 0.07 });   // full = surface at the rim (row 15)
    k.lever(27, 26, 'fillB');
    k.gift(39, 13, 'normal', 'g2');
    k.decor('poster', 30, 12, { w: 60, h: 24, text: 'КОЛОДЕЦ', color: '#BFEFF5' });
    // C
    k.sign(46, 23, 'Плита на дне бассейна. Деревянный ящик ВСПЛЫВАЕТ — плиту удержит только то, что тонет. Металлический куб! Доплыви с ним до плиты и отпусти (ПКМ).');
    k.water(50, 26, 9, 4);
    k.plate(53, 30, 'plC', { needMass: 2.5, w: 2 * 32 });
    k.prop('crate', 47, 26);
    k.prop('cube', 61, 26);
    k.door(68, 22, 2, 4, 'plC', { dir: 'up', travel: 4 * 32 });
    k.gift(64, 21, 'normal', 'g3');
    k.clutter(['book', 'can', 'jar'], 59, 26, 4, 302);
    k.decor('poster', 54, 15, { w: 96, h: 28, text: 'ЧТО ТОНЕТ, А ЧТО ПЛЫВЁТ?', color: '#BFEFF5' });
    // D
    k.sign(71, 23, 'Финал: плот с зеркалом. Луч идёт под потолком. Спустись в бак, открой вентиль — вода поднимет плот, и зеркало поймает луч.');
    k.water(76, 15, 20, 11, { level: 1, levelEmpty: 0.25, requires: 'fillD', speed: 0.07 });
    k.lever(78, 26, 'fillD');
    k.laser(76, 14, 'right');
    k.prop('bigCrate', 86, 26, { center: true });
    k.prop('mirror', 86, 26, { center: true, dy: 48.5, dir: 1 });
    k.receiver(86, 12, 'rD', { face: 'down', size: 56 });
    k.door(104, 22, 2, 4, 'rD', { dir: 'up', travel: 4 * 32 });
    k.gift(97, 13, 'big', 'g4');
    k.sign(100, 23, 'Вода поднимает всё, что легче её. Даже плот с зеркалом. Даже кота.');
    k.clutter(['cup', 'can', 'duck'], 107, 26, 4, 303);
    k.decor('poster', 108, 16, { w: 60, h: 28, text: 'ВЫХОД →', color: '#FFE9B8' });
  },
};
