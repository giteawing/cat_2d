// End-to-end network test: starts the real server on a free port, connects two clients (headless browser games with
// NetClient over Node's WebSocket), and checks that both cats live in one shared world.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, Driver } from './harness.mjs';
import { WebSocketServer } from '../server/wsmini.mjs';
import { Session } from '../server/session.mjs';
import { TILE } from '../src/core/util.js';

let passes = 0, fails = 0;
function check(name, cond, info = '') { if (cond) { passes++; console.log('  ✓', name); } else { fails++; console.log('  ✗', name, info); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b, e = 1) => Math.abs(a - b) <= e;

// ---- server
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); });
const session = new Session({ startLevel: 0, log: () => {} });
const wss = new WebSocketServer(server, '/ws');
wss.on('connection', (ws) => session.join(ws));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `ws://127.0.0.1:${port}/ws`;
console.log('server on', url);

// ---- two browser-like clients driven by the harness; frames run on a timer so WebSocket events interleave
globalThis.location = { search: '', protocol: 'http:', host: `127.0.0.1:${port}` };
const { NetClient } = await import('../src/net/client.js');
async function client() {
  const { game, canvas } = await createGame();
  const d = new Driver(game, canvas);
  const net = new NetClient(game, url, () => {});
  return { game, canvas, d, net };
}
async function run(clients, frames) {   // advance all clients ~frames at 60 Hz wall time (server ticks meanwhile)
  for (let i = 0; i < frames; i++) { for (const c of clients) c.d.step(1); await sleep(16); }
}
const A = await client();
await run([A], 30);
check('client A got slot 0 (player 1, orange)', A.net.slot === 0 && A.game.localSlot === 0, `slot=${A.net.slot}`);
check('A is playing the first level with one cat', A.game.state === 'playing' && A.game.playerCount() === 1, `${A.game.state} ${A.game.playerCount()}`);
check('A snapshots arriving', A.net.snapshots > 3, `${A.net.snapshots}`);
const sg = session.game;
check('server runs one world with one cat', sg && sg.playerCount() === 1 && sg.world.bodies.filter((b) => b.kind === 'cat').length === 1);
const levelSeqBefore = sg.levelSeq;

const B = await client();
await run([A, B], 40);
check('client B got slot 1 (player 2, black cat)', B.net.slot === 1 && B.game.localSlot === 1 && B.game.player && B.game.player.palette === 'black', `slot=${B.net.slot}`);
check('server did NOT reload the level when B joined', sg.levelSeq === levelSeqBefore, `${sg.levelSeq} vs ${levelSeqBefore}`);
check('server world has two cats', sg.playerCount() === 2 && sg.world.bodies.filter((b) => b.kind === 'cat').length === 2);
check('A sees the second cat', A.game.playerCount() === 2 && A.game.slots[1].player && A.game.slots[1].player.palette === 'black');
const inView = (g, p) => p.cx > g.camera.x && p.cx < g.camera.x + g.camera.w && p.cy > g.camera.y && p.cy < g.camera.y + g.camera.h;
check('B sees both cats and its camera shows the black cat', B.game.playerCount() === 2 && B.game.player.palette === 'black' && inView(B.game, B.game.player), `cam=${B.game.camera.x} cat=${B.game.player.cx}`);
const p2s = sg.slots[1].player.body, p1s = sg.slots[0].player.body;
check('P2 spawned next to P1 on the ground', Math.abs(p2s.x - p1s.x) < 5 * TILE && p2s.onGround, `dx=${p2s.x - p1s.x}`);

// B walks right: its input must move the cat on the server and on A's screen
const bx0 = p2s.x;
B.d.key('KeyD'); B.d.key('ShiftLeft');
await run([A, B], 50);
B.d.key('KeyD', false); B.d.key('ShiftLeft', false);
await run([A, B], 15);
check('B input moves P2 on the server', p2s.x > bx0 + 3 * TILE, `moved ${(p2s.x - bx0) / TILE} tiles`);
check('A sees P2 at the server position', near(A.game.slots[1].player.body.x, p2s.x, 40), `A=${A.game.slots[1].player.body.x} S=${p2s.x}`);
check('B sees itself at the server position', near(B.game.player.body.x, p2s.x, 40), `B=${B.game.player.body.x} S=${p2s.x}`);

// A jumps: one-shot press must reach the server
const ay0 = p1s.y;
let minY = ay0;
A.d.key('Space');
for (let i = 0; i < 30; i++) { A.d.step(1); B.d.step(1); await sleep(16); minY = Math.min(minY, p1s.y); }
A.d.key('Space', false);
check('A jump press reaches the server', minY < ay0 - TILE, `rise=${(ay0 - minY) / TILE}`);

// exit rule with two players: only when both stand on it
await run([A, B], 40);
const e = sg.exit;
const put = (b) => { b.x = e.x + 4; b.y = e.y + e.h - 54 - 2; b.vx = 0; b.vy = 0; };
put(p1s);
await run([A, B], 60);
check('one cat at the exit does not finish (two players)', sg.levelDoneTimer < 0 && sg.state === 'playing');
p2s.x = e.x + 30; p2s.y = e.y + e.h - 54 - 2; p2s.vx = 0; p2s.vy = 0;
await run([A, B], 40);
check('both cats at the exit → level completes on the server', sg.levelDoneTimer >= 0);
await run([A, B], 100);
check('clients follow to the complete screen', A.game.state === 'complete' && B.game.state === 'complete', `${A.game.state}/${B.game.state}`);

// B disconnects: A continues, no restart
const seq2 = sg.levelSeq;
B.net.ws.close();
await run([A], 40);
check('server removed P2, P1 keeps playing (no level reload)', sg.playerCount() === 1 && sg.slots[0].player && sg.levelSeq === seq2, `n=${sg.playerCount()} seq=${sg.levelSeq}/${seq2}`);
check('A sees the partner gone', A.game.playerCount() === 1 && !A.game.slots[1].connected);

// reconnect: B gets slot 1 again in the same world
const C = await client();
await run([A, C], 40);
check('reconnected player gets slot 1 again in the existing world', C.net.slot === 1 && sg.playerCount() === 2 && sg.levelSeq === seq2, `slot=${C.net.slot} n=${sg.playerCount()}`);

// third client is refused
const D = await client();
await run([A, C, D], 20);
check('a third client is refused (full)', D.net.slot === -1 && !D.game.net && D.net.statusText.includes('занят'), D.net.statusText);

// restart from A → both reload
const seq3 = sg.levelSeq;
A.net.ui('restart');
await run([A, C], 30);
check('restart requested online reloads for everyone', sg.levelSeq === seq3 + 1 && C.game.state === 'playing' && sg.playerCount() === 2, `seq=${sg.levelSeq}`);

await run([A, C], 20);
// gravity gun over the network: A grabs the nearest prop; the server holds it and both clients see it held
{
  const me = sg.slots[0].player;
  const prop = sg.world.bodies.filter((b) => b.grabbable && !b.dead).sort((a, b) => Math.hypot(a.cx - me.cx, a.cy - me.cy) - Math.hypot(b.cx - me.cx, b.cy - me.cy))[0];
  sg.slots[0].weapons.unlock('gravity'); sg.slots[0].weapons.select('gravity');
  prop.x = me.cx + 2 * TILE; prop.y = me.body.y; prop.vx = 0; prop.vy = 0; prop.wake();
  await run([A, C], 20);
  A.d.aimWorld(prop.cx, prop.cy); await run([A, C], 3); A.d.click(0); await run([A, C], 60);
  check('gravity grab over the network: server holds it, both clients see it held', sg.slots[0].weapons.held === prop && A.game.weapons.held && A.game.weapons.held.netId === prop.netId && C.game.slots[0].weapons.held && C.game.slots[0].weapons.held.netId === prop.netId, `server=${sg.slots[0].weapons.held === prop} A=${!!A.game.weapons.held} C=${!!C.game.slots[0].weapons.held}`);
  A.d.aimWorld(me.cx + 200, me.cy - 100); await run([A, C], 3); A.d.click(0); await run([A, C], 20);
  check('throw over the network: released on the server, client prop follows', !sg.slots[0].weapons.held && Math.hypot(A.game.netBodies.get(prop.netId).x - prop.x, A.game.netBodies.get(prop.netId).y - prop.y) < 60);
}
// tunneling toggle by player 2 is visible everywhere
sg.slots[1].player.tunnelUnlocked = true; await run([A, C], 5); C.d.tap('KeyQ'); await run([A, C], 10);
check('player 2 quantum toggle (Q) syncs to server and partner', sg.slots[1].player.tunneling && C.game.player.tunneling && A.game.slots[1].player.tunneling);
// local pause does not stop the shared world
C.d.tap('Escape'); await run([A, C], 8);
check('Esc pauses only locally; the server keeps playing', C.game.state === 'paused' && sg.state === 'playing');
C.d.tap('Escape'); await run([A, C], 5);
// menu → level change by one player applies to everyone
A.net.ui('menu'); await run([A, C], 10);
check('menu action → all clients on level select', sg.state === 'select' && A.game.state === 'select' && C.game.state === 'select');
A.net.ui('level', 1); await run([A, C], 30);
check('level chosen by one player loads for both (two cats)', sg.levelIndex === 1 && A.game.levelIndex === 1 && C.game.levelIndex === 1 && C.game.state === 'playing' && sg.playerCount() === 2 && C.game.player.palette === 'black');

console.log(`\n${passes} passed, ${fails} failed`);
session.stop(); server.close();
process.exit(fails ? 1 : 0);
