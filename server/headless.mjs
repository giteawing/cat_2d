// Minimal browser shims so the real Game class runs under Node without rendering (server side).
// Nothing here draws: Game.headless skips render() and the tile cache; the canvas only has to exist.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
const noop = () => {};
if (typeof globalThis.addEventListener !== 'function') { globalThis.addEventListener = noop; globalThis.removeEventListener = noop; }
if (!globalThis.document) globalThis.document = { createElement: () => fakeCanvas(), getElementById: () => null };
const store = new Map();
// Node's built-in localStorage needs a flag; always use an in-memory one on the server (progress is per client anyway)
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } });
if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = () => 0;

const ctxProxy = new Proxy({}, { get: (t, k) => (k === 'canvas' ? null : (...a) => (k === 'measureText' ? { width: 0 } : k === 'createLinearGradient' || k === 'createRadialGradient' ? { addColorStop: noop } : null)), set: () => true });
export function fakeCanvas(w = 960, h = 540) {
  return { width: w, height: h, style: {}, getContext: () => ctxProxy, addEventListener: noop, removeEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }) };
}

/** Create a headless, server-side Game (no players connected yet). */
export async function createHeadlessGame() {
  const { Game } = await import('../src/core/game.js');
  const game = new Game(fakeCanvas());
  game.setupHeadless();
  return game;
}
