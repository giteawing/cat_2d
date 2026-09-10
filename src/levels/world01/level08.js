// World 1 — Level 8: "Генераторная". Switchable electric fields (FieldGate): a plate / button / lever powers a field
// down. Combines gates with portals and the gravity gun:
//  A. intro: a crate on a plate switches the first gate off
//  B. a permanent field, but a portal-able wall is visible beyond it: portal shots pass through fields → travel by portal
//  C. two floors: a gate is the FLOOR of the upper level; a button opens it, a crate dropped through lands on a plate
//     in the room below (door C); the cat follows it for a gift and climbs out
//  D. finale: a gate needs BOTH a plate and a lever (lever on a high shelf: ceiling portal). Secret behind a permanent
//     field with metal all around — only quantum tunneling gets there.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(140, 34);
  m.border();
  m.rect(0, 30, 139, 33);                       // ground
  // A: low corridor (rows 20-29) with the first gate at col 14 (tiles written by the FieldGate itself)
  m.rect(1, 1, 30, 19);
  // B: taller hall; permanent field at col 36; far wall (cols 46-47) with door B at the bottom (rows 26-29)
  m.rect(31, 1, 55, 13);
  m.col(36, 14, 29, '~');
  m.rect(46, 14, 47, 25);
  // C: upper floor (rows 18-19) from col 56 to 92; hole at cols 70-73 (gate = row 18); room below with a plate
  m.rect(56, 18, 92, 19);
  m.col(56, 18, 29, 'H');                       // ladder up
  m.rect(70, 18, 73, 19, '.');                  // hole (the gate fills row 18 while powered)
  m.col(68, 20, 29); m.col(75, 20, 29);         // lower room walls (inside: cols 69-74)
  m.col(74, 18, 29, 'H');                       // ladder out of the lower room (through its own hole in the floor)
  m.rect(94, 1, 95, 25);                        // wall above door C (door rows 26-29)
  // D: finale hall
  m.rect(96, 1, 139, 11);                       // ceiling (brick: portal target above the shelf)
  m.rect(100, 14, 104, 14, '=');                // high thin shelf with the lever: portal shots pass through it into the ceiling above
  // secret: permanent field at col 131, metal all around → tunneling only
  m.col(131, 12, 29, '~');
  m.rect(131, 11, 138, 11, 'X'); m.rect(131, 30, 138, 30, 'X');
  return m.lines();
}

export const level08 = {
  id: 'w1l8', world: 1, number: 8,
  name: 'Генераторная', subtitle: 'Отключаемые поля, порталы и гравипушка',
  theme: 'lab',
  map: buildMap(),
  start: [3, 30],
  exit: [120, 28],
  weapons: ['gravity', 'portal'],
  abilities: ['tunnel'],
  giftCount: 5,
  setup(k, g) {
    // A
    k.message(1, 20, 10, 10, 'Генераторная', 'Некоторые поля можно выключить');
    k.sign(5, 27, 'Поле с лампочками на концах — ОТКЛЮЧАЕМОЕ. Его питание рвёт плита. Поставь на неё ящик.');
    k.prop('crate', 4, 30);
    k.plate(9, 30, 'plA');
    k.fieldGate(14, 20, 1, 10, 'plA');
    k.gift(18, 28, 'normal', 'g1');
    k.clutter(['jar', 'can', 'cup', 'book'], 20, 30, 6, 91);
    k.decor('poster', 22, 22, { w: 64, h: 28, text: 'ГЕНЕРАТОР №1', color: '#DDE6EE' });
    // B
    k.sign(31, 27, 'Это поле не выключить. Но выстрел портальной пушки проходит сквозь него — а за ним кирпичная стена!');
    k.sign(33, 27, 'Оранжевый — в стену за полем, синий — в пол здесь. И шагай в синий.');
    k.gift(41, 28, 'normal', 'g2');
    k.lever(43, 30, 'levB');
    k.door(46, 26, 2, 4, 'levB', { dir: 'up', travel: 4 * 32 });
    k.clutter(['box', 'lamp', 'bottle', 'toyCube', 'ball'], 38, 30, 6, 92);
    k.decor('pipe', 31, 13, { w: 25 * 32, h: 6 }); k.decor('pipe', 47, 14, { w: 6, h: 12 * 32 });
    // C
    k.sign(53, 27, 'Наверху пол из поля. Кнопка его выключает. Ящик вниз — на плиту, дверь откроется.');
    k.button(63, 17, 'btnC', { dy: 6, label: '' });
    k.fieldGate(70, 18, 4, 1, 'btnC');
    k.prop('crate', 66, 18);
    k.plate(70, 30, 'plC', { w: 3 * 32 });
    k.gift(71, 28, 'normal', 'g3');
    k.sign(76, 15, 'Урони ящик в проём. Сам тоже можешь спрыгнуть — лестница выведет обратно.');
    k.door(94, 26, 2, 4, 'plC', { dir: 'up', travel: 4 * 32 });
    k.clutter(['book', 'cup', 'plant', 'lamp', 'jar'], 80, 18, 10, 93);
    k.funRoom(78, 30, 12, 94, 0.7);
    k.decor('window', 60, 6, { w: 96, h: 80 }); k.decor('lampHang', 84, 1);
    // D
    k.sign(97, 27, 'Последнее поле питают ДВА источника: плита и рычаг на полке. Портал — в потолок ПРЯМО над полкой (встань под неё), второй — в пол.');
    k.gift(101, 12, 'big', 'g4');
    k.lever(102, 14, 'levD');
    k.prop('crate', 112, 30);
    k.plate(109, 30, 'plD');
    k.fieldGate(116, 12, 1, 18, 'plD&levD');
    k.clutter(['can', 'jar', 'bottle', 'box', 'cup'], 123, 30, 4, 95);
    k.decor('poster', 119, 20, { w: 60, h: 28, text: 'ВЫХОД ↓', color: '#FFE9B8' });
    k.sign(125, 27, 'Дальше — металл и поле без выключателя. Только квантовый режим (Q) и разбег!');
    k.gift(135, 28, 'rare', 'g5');
    k.secret(132, 20, 6, 10, 's1');
    k.clutter(['giftBox', 'teddy', 'yarn'], 136.5, 30, 2, 96);   // keep the run-up back to the field clear
    k.decor('pipe', 96, 11, { w: 35 * 32, h: 6 });
  },
};
