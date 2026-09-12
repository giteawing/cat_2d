// Cat Portal Adventure 2D — game server: serves the client files and runs ONE authoritative co-op session
// (1–2 players) over a WebSocket on /ws. Usage: node server/index.mjs [port] [startLevelIndex]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from './wsmini.mjs';
import { Session } from './session.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8080);
const startLevel = Number(process.argv[3] || process.env.LEVEL || 0);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, players: session.conns.filter(Boolean).length, level: session.game && session.game.level ? session.game.level.id : null })); return; }
  const file = path.join(root, url);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
const session = new Session({ startLevel, log: (...a) => console.log(new Date().toISOString().slice(11, 19), ...a) });
const wss = new WebSocketServer(server, '/ws');
wss.on('connection', (ws) => { session.join(ws).catch((e) => { console.error(e); ws.close(); }); });
server.listen(port, '0.0.0.0', () => console.log(`Cat Portal Adventure 2D server → http://0.0.0.0:${port}  (WebSocket: ws://0.0.0.0:${port}/ws, start level ${startLevel})`));
