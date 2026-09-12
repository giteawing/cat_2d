import { Game, VIEW_W, VIEW_H } from './core/game.js';
import { NetClient } from './net/client.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.game = game;   // handy for debugging / automated tests

function resize() {
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * s) + 'px';
  canvas.style.height = Math.floor(VIEW_H * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

// Multiplayer: when the page is served by the game server (npm run server) or ?ws=<url> is given, join the shared
// session. Offline (npm start / file://) the game runs exactly the same way with one local player.
const params = new URLSearchParams(location.search);
const hintEl = document.getElementById('hint');
const setStatus = (t) => { if (hintEl) hintEl.textContent = `Cat Portal Adventure 2D · F3 — debug · ${t}`; };
if (params.get('offline') === null) {
  fetch('/health', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((h) => {
    if (h || params.get('ws')) window.net = new NetClient(game, undefined, setStatus);
    else setStatus('офлайн (для кооператива запустите npm run server)');
  });
} else setStatus('офлайн');

let errCount = 0;
function loop(now) {
  try {
    game.frame(now);
  } catch (err) {
    // never let a single bad frame kill the game: reset canvas state, log, keep looping
    errCount++;
    if (errCount <= 5) console.error('frame error', err);
    try { game.ctx.setTransform(1, 0, 0, 1, 0, 0); game.ctx.globalAlpha = 1; } catch (_) { /* ignore */ }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
