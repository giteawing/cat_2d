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

function loop(now) {
  game.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
