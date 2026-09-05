import { Game, VIEW_W, VIEW_H } from './core/game.js';

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
