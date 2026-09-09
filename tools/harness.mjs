// Headless harness: runs the real game code under Node with @napi-rs/canvas
// and a minimal fake DOM, so we can simulate input, step frames and save screenshots.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

const listeners = new Map();
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.addEventListener = (ev, fn) => { (listeners.get(ev) || listeners.set(ev, []).get(ev)).push(fn); };
globalThis.removeEventListener = () => {};
globalThis.innerWidth = 960; globalThis.innerHeight = 540;
globalThis.requestAnimationFrame = () => 0;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
globalThis.document = {
  createElement: (tag) => { if (tag === 'canvas') return wrapCanvas(createCanvas(10, 10)); return {}; },
  getElementById: () => null,
};
function strictCtx(ctx) {
  // browsers throw IndexSizeError for negative radii; @napi-rs/canvas silently accepts them — emulate the browser.
  const wrap = (name, idx) => {
    const orig = ctx[name].bind(ctx);
    ctx[name] = (...a) => { for (const i of idx) if (a[i] < 0 || Number.isNaN(a[i])) throw new RangeError(`${name}: negative/NaN radius ${a[i]}`); return orig(...a); };
  };
  wrap('arc', [2]); wrap('ellipse', [2, 3]); wrap('createRadialGradient', [2, 5]);
  return ctx;
}
function wrapCanvas(c) {
  const cl = new Map();
  const gc = c.getContext.bind(c);
  let cached = null;
  c.getContext = (t, o) => { const x = gc(t, o); if (x && x !== cached) { cached = x; strictCtx(x); } return x; };
  c.addEventListener = (ev, fn) => { (cl.get(ev) || cl.set(ev, []).get(ev)).push(fn); };
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height });
  c.style = {};
  c._listeners = cl;
  return c;
}
export function dispatch(target, ev, e) {
  const l = (target === globalThis ? listeners : target._listeners).get(ev) || [];
  for (const fn of l) fn({ preventDefault() {}, ...e });
}

export async function createGame() {
  const { Game } = await import('../src/core/game.js');
  const canvas = wrapCanvas(createCanvas(960, 540));
  const game = new Game(canvas);
  return { game, canvas };
}

/** Utility controller to drive the game deterministically. */
export class Driver {
  constructor(game, canvas) {
    this.game = game; this.canvas = canvas; this.now = 1000; this.held = new Set();
    game.lastFrame = this.now;
  }
  key(code, down = true) {
    if (down) { if (!this.held.has(code)) { this.held.add(code); dispatch(globalThis, 'keydown', { code, repeat: false }); } }
    else { this.held.delete(code); dispatch(globalThis, 'keyup', { code }); }
  }
  tap(code) { this.key(code, true); this.step(1); this.key(code, false); }
  releaseAll() { for (const k of [...this.held]) this.key(k, false); }
  mouse(x, y) { dispatch(this.canvas, 'mousemove', { clientX: x, clientY: y }); }
  /** Point the mouse at a world position */
  aimWorld(wx, wy) { const s = this.game.camera.worldToScreen(wx, wy); this.mouse(s.x, s.y); }
  /** Like aimWorld but refuses targets a real player could not see (outside the canvas). */
  aimVisible(wx, wy) {
    const s = this.game.camera.worldToScreen(wx, wy);
    if (s.x < 0 || s.y < 0 || s.x > this.canvas.width || s.y > this.canvas.height) throw new Error(`aim target off-screen: world ${(wx / 32).toFixed(1)},${(wy / 32).toFixed(1)} → screen ${s.x | 0},${s.y | 0}`);
    this.mouse(s.x, s.y);
  }
  click(button = 0) { dispatch(this.canvas, 'mousedown', { button, clientX: this.game.input.mouseX, clientY: this.game.input.mouseY }); this.step(1); dispatch(globalThis, 'mouseup', { button }); }
  /** advance n frames at 60 fps */
  step(n = 1, dt = 1000 / 60) { for (let i = 0; i < n; i++) { this.now += dt; this.game.frame(this.now); } }
  /** hold a key for n frames */
  hold(code, n) { this.key(code, true); this.step(n); this.key(code, false); }
  shot(name) {
    const dir = path.resolve('tools/out'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.png'), this.canvas.toBuffer('image/png'));
    return path.join(dir, name + '.png');
  }
  get p() { return this.game.player; }
  startLevel(i) { this.game.loadLevel(i); this.step(2); }
}
