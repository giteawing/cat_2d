// Helpers used by level definitions to build content in tile units.
import { TILE } from '../core/util.js';
import { makeProp, scatter, PROPS } from '../physics/props.js';
import { PressurePlate, Button, Lever, Door, MovingPlatform, Trigger, Fan, FieldGate, Laser, LaserReceiver, Medium } from '../puzzles/puzzles.js';
import { Gift } from '../gifts/gift.js';

export const px = (t) => t * TILE;
const DIRS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };

/** Build-context passed to level.setup(k). All coordinates are tile units unless noted. */
export class LevelKit {
  constructor(game) { this.game = game; this.giftCount = 0; }

  /** Place a prop standing on the floor of tile row `ty` (its bottom sits at the top of that tile). */
  prop(kind, tx, ty, opts = {}) {
    const d = PROPS[kind];
    const x = px(tx) + (opts.dx || 0) + (opts.center ? (TILE - d.w) / 2 : 0);
    const b = makeProp(kind, x, px(ty) - (opts.dy || 0), opts);
    return this.game.world.add(b);
  }
  /** Stack N props of `kind` on top of each other. */
  stack(kind, tx, ty, n, opts = {}) {
    const d = PROPS[kind];
    const out = [];
    for (let i = 0; i < n; i++) out.push(this.prop(kind, tx, ty, { ...opts, dy: i * (d.h + 0.5) + (opts.dy || 0) }));
    return out;
  }
  /** Clutter: spread a list of prop kinds along the floor between tx and tx+width tiles. */
  clutter(kinds, tx, ty, width, seed = 1, rows = 1) { return scatter(this.game.world, kinds, px(tx), px(ty), px(width), seed, rows); }
  /** A "fun room" filled with lots of random household clutter. */
  funRoom(tx, ty, width, seed, density = 1) {
    const all = ['cup', 'book', 'plate', 'can', 'ball', 'toyCube', 'bottle', 'pillow', 'smallBox', 'jar', 'teddy', 'yarn', 'figurine', 'pot', 'box', 'giftBox', 'bookUp', 'wrench'];
    const rnd = mulberry(seed);
    const kinds = [];
    const n = Math.floor(width * 1.6 * density);
    for (let i = 0; i < n; i++) kinds.push(all[Math.floor(rnd() * all.length)]);
    const out = this.clutter(kinds, tx, ty, width, seed, 1);
    // a couple of stacks
    const stacks = Math.max(1, Math.floor(width / 5));
    for (let i = 0; i < stacks; i++) {
      const sx = tx + 1 + Math.floor(rnd() * (width - 2));
      const kind = ['box', 'book', 'toyCube', 'smallBox', 'cup'][Math.floor(rnd() * 5)];
      out.push(...this.stack(kind, sx, ty, 2 + Math.floor(rnd() * 3), { dx: rnd() * 8 }));
    }
    return out;
  }

  plate(tx, ty, channel, opts = {}) { const p = new PressurePlate(px(tx) + (opts.dx || 0), px(ty), channel, opts); this.game.puzzles.push(p); return p; }
  button(tx, ty, channel, opts = {}) { const b = new Button(px(tx) + 6 + (opts.dx || 0), px(ty) + 6 + (opts.dy || 0), channel, opts); this.game.puzzles.push(b); return b; }
  lever(tx, ty, channel, opts = {}) { const l = new Lever(px(tx) + 4, px(ty) - 24, channel, opts); this.game.puzzles.push(l); return l; }
  door(tx, ty, wTiles, hTiles, requires, opts = {}) { const d = new Door(px(tx), px(ty), px(wTiles), px(hTiles), requires, opts); this.game.puzzles.push(d); this.game.world.add(d.body); return d; }
  platform(tx, ty, wTiles, tx2, ty2, opts = {}) { const p = new MovingPlatform(px(tx), px(ty), px(wTiles), opts.h || 12, px(tx2), px(ty2), opts); this.game.puzzles.push(p); this.game.world.add(p.body); return p; }
  trigger(tx, ty, w, h, fn, opts = {}) { const t = new Trigger(px(tx), px(ty), px(w), px(h), fn, opts); this.game.puzzles.push(t); return t; }
  /** Switchable potential barrier ('~' field tiles): ON while `requires` is not met (default) — a plate/lever/button switches it off. */
  fieldGate(tx, ty, w, h, requires, opts = {}) { const f = new FieldGate(tx, ty, w, h, requires, opts); this.game.puzzles.push(f); return f; }
  /** Laser emitter mounted on the wall behind the EMPTY tile (tx,ty), firing `dir` ('right'|'left'|'up'|'down'). */
  laser(tx, ty, dir, opts = {}) {
    // dir: 'right'|'left'|'up'|'down' or an angle in degrees (clockwise from +x, i.e. 40 = down-right by 40°)
    const v = typeof dir === 'number' ? [Math.cos(dir * Math.PI / 180), Math.sin(dir * Math.PI / 180)] : DIRS[dir];
    if (!v) throw new Error('laser dir ' + dir);
    const l = new Laser(px(tx) + TILE / 2 - v[0] * (TILE / 2 - 1), px(ty) + TILE / 2 - v[1] * (TILE / 2 - 1), v[0], v[1], opts);
    this.game.puzzles.push(l); return l;
  }
  /** Laser receiver in the EMPTY tile (tx,ty) mounted on the wall opposite to `face` (the side the beam comes from). */
  receiver(tx, ty, channel, opts = {}) {
    const v = DIRS[opts.face || 'up'];
    const r = new LaserReceiver(px(tx) + TILE / 2 - v[0] * 6, px(ty) + TILE / 2 - v[1] * 6, channel, { nx: v[0], ny: v[1], ...opts });
    this.game.puzzles.push(r); return r;
  }
  /** Optical medium (refraction zone) covering tiles (tx,ty)-(tx+w-1,ty+h-1); opts: n (index, 1.5), requires (channel → dense only while on). */
  medium(tx, ty, w, h, opts = {}) { const m = new Medium(px(tx), px(ty), px(w), px(h), opts); this.game.puzzles.push(m); return m; }
  fan(tx, ty, w, h, opts = {}) { const f = new Fan(px(tx), px(ty), px(w), px(h), opts); this.game.puzzles.push(f); return f; }

  gift(tx, ty, type = 'normal', id = null) {
    const g = new Gift(px(tx) + 4, px(ty) + 4, type, id || `g${this.giftCount++}`);
    this.game.gifts.push(g);
    return g;
  }
  /** Sign with text (world-space hint shown when near). */
  sign(tx, ty, text, opts = {}) { this.game.signs.push({ x: px(tx), y: px(ty), text, w: opts.w || 2, seen: false }); }
  /** Decorative (non-physical) props */
  decor(kind, tx, ty, opts = {}) { this.game.decor.push({ kind, x: px(tx) + (opts.dx || 0), y: px(ty) + (opts.dy || 0), w: opts.w || TILE, h: opts.h || TILE, color: opts.color, text: opts.text }); }
  /** One-shot message when entering an area */
  message(tx, ty, w, h, text, sub = '') { return this.trigger(tx, ty, w, h, (g) => g.hud.show(text, sub)); }
  /** Give a weapon when entering an area */
  weaponPickup(tx, ty, kind) { this.game.pickups.push({ x: px(tx) + 4, y: px(ty) + 2, kind, taken: false }); }
  /** Secret area marker: awards "secret found" when entered */
  secret(tx, ty, w, h, id) { return this.trigger(tx, ty, w, h, (g) => g.onSecret(id)); }
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
