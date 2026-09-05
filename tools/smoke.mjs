import { createGame, Driver } from './harness.mjs';
const { game, canvas } = await createGame();
const d = new Driver(game, canvas);
d.step(3); d.shot('title');
d.tap('Enter'); d.step(2); d.shot('select');
d.startLevel(0);
d.step(30); d.shot('l1_start');
console.log('player', d.p.x.toFixed(1), d.p.y.toFixed(1), 'ground', d.p.onGround, 'bodies', game.world.bodies.length);
// walk right and jump
d.key('KeyD'); d.step(60); d.tap('Space'); d.step(40); d.shot('l1_jump');
console.log('after walk', d.p.x.toFixed(1), d.p.y.toFixed(1), d.p.anim);
d.releaseAll();
