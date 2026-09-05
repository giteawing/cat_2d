// World 1 — Level 2: "Первый портал". Introduces the Portal Gun: portal as a door through a wall,
// then a floor→wall portal for vertical travel, then a crate through a portal onto a plate.
import { MapBuilder } from '../mapBuilder.js';

function buildMap() {
  const m = new MapBuilder(110, 26);
  m.border();
  m.rect(0, 22, 109, 25);                       // ground
  // A: intro corridor + thick wall you cannot jump over (portal as a door)
  m.rect(18, 16, 19, 21);                       // wall you cannot jump over (to the ceiling)
  m.rect(18, 1, 19, 9);
  m.rect(18, 10, 19, 15, '|');                  // a tall grate window: portal shots pass, the cat doesn't
  // B: tall shaft — need a floor→wall portal to get up
  m.rect(34, 12, 44, 21);                       // big block; top at row 12
  m.rect(45, 12, 54, 13);                       // ledge continues
  m.rect(30, 1, 30, 4, 'X');                    // some metal decoration (non-portalable)
  // C: crate room: a crate behind a grate, a plate & door
  m.rect(60, 14, 62, 21);                       // pillar
  m.col(61, 9, 13, '|');                        // grate above pillar (see-through, shootable)
  m.rect(66, 18, 74, 21);                       // pedestal with the crate (unreachable from the floor? reachable by jump)
  m.rect(78, 1, 80, 15);                        // wall with a door at the bottom (rows 16-21 door area)
  m.rect(78, 16, 80, 17, 'X');                  // metal lintel (non portalable) above the door
  m.rect(84, 22, 86, 22, '.');                  // small pit
  m.row(16, 90, 96, '=');                       // shelf with the bonus gift
  m.row(10, 96, 100);                           // high ledge for a portal puzzle: secret gift
  return m.lines();
}

export const level02 = {
  id: 'w1l2', world: 1, number: 2,
  name: 'Первый портал', subtitle: 'Portal Gun: стреляй в любую кирпичную стену',
  theme: 'house',
  map: buildMap(),
  start: [3, 22],
  exit: [104, 20],
  weapons: ['gravity'],
  giftCount: 3,
  setup(k, g) {
    k.weaponPickup(8, 20, 'portal');
    k.sign(4, 19, 'Впереди стена без прохода. Возьми Portal Gun!');
    k.sign(13, 19, 'ЛКМ — синий портал на этой стене. ПКМ — оранжевый на пол или потолок ЗА стеной: стреляй сквозь решётку!');
    k.message(10, 14, 6, 8, 'Портал = дверь', 'Порталы ставятся в ЛЮБОЙ точке кирпичной поверхности');
    k.prop('ball', 12, 22); k.prop('box', 15, 22);
    k.decor('window', 6, 8, { w: 96, h: 96 }); k.decor('lampHang', 26, 1);
    // after the wall: shaft. Portal on the floor, other on the wall of the big block → walk in, fall out upwards? No:
    // teach: put one portal on the top face of the block (visible from below? no). Teach floor→wall: shoot a portal on the
    // ceiling above the block (row 0 ceiling is brick) and one on the floor: fall in the floor, drop from the ceiling onto the block.
    k.sign(24, 19, 'Высокий выступ. Портал на потолке над ним + портал в полу здесь — и ты упадёшь сверху!');
    k.message(26, 12, 6, 10, 'Потолок тоже поверхность', 'Портал в полу → выход из потолка. Гравитация сделает остальное');
    k.gift(38, 10, 'normal', 'g1');
    k.clutter(['book', 'cup', 'toyCube', 'ball'], 46, 12, 6, 31);
    // metal: show it doesn't take portals
    k.decor('poster', 29, 6, { w: 40, h: 24, text: 'NO PORTAL', color: '#8C949C' });
    // C: plate puzzle with crate on a pedestal, door in the wall
    k.prop('crate', 69, 18);
    k.plate(76, 22, 'door1', { label: '' });
    k.door(78, 18, 3, 4, 'door1', { dir: 'up', travel: 4 * 32 });
    k.sign(64, 19, 'Ящик на плиту — и дверь откроется. Gravity Gun (1) поможет донести. Или сбрось его через портал!');
    k.decor('picture', 56, 15, { w: 40, h: 32, color: '#5BC0DE' });
    k.clutter(['cup', 'jar', 'can', 'bottle', 'plate', 'cup', 'teddy', 'pillow'], 63, 22, 3, 32);
    // after the door: shelf with bonus gift, high ledge secret
    k.gift(93, 14, 'bonus', 'g2');
    k.gift(98, 8, 'secret', 'g3');
    k.secret(96, 6, 4, 4, 's1');
    k.sign(88, 19, 'Подарок на полке высоко? Портал под ногами + портал в стене над полкой.');
    k.clutter(['box', 'smallBox', 'ball', 'toyCube', 'yarn', 'teddy', 'book', 'bookUp', 'giftBox', 'giftBox'], 82, 22, 12, 33);
    k.stack('box', 100, 22, 3); k.stack('toyCube', 102, 22, 4, { dx: 8 });
    k.decor('balloon', 100, 4, { color: '#F25C5C' }); k.decor('balloon', 103, 5, { color: '#9B6BE0' }); k.decor('balloon', 106, 3, { color: '#5BC0DE' });
  },
};
