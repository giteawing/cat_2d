// Small math / helper utilities shared across the game.

export const TILE = 32;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
export const len = (x, y) => Math.hypot(x, y);
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const TAU = Math.PI * 2;

/** Exponential smoothing factor that is frame-rate independent. */
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Rect helpers use {x,y,w,h} with x,y = top-left. */
export function rectsOverlap(a, b) {
  return aabbOverlap(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h);
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Ray vs AABB (slab method). Returns distance t along ray or null. */
export function rayAABB(ox, oy, dx, dy, x, y, w, h, maxT = Infinity) {
  let tmin = 0;
  let tmax = maxT;
  if (Math.abs(dx) < 1e-9) {
    if (ox < x || ox > x + w) return null;
  } else {
    let t1 = (x - ox) / dx;
    let t2 = (x + w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < y || oy > y + h) return null;
  } else {
    let t1 = (y - oy) / dy;
    let t2 = (y + h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

/** Simple seeded RNG (mulberry32) for deterministic clutter placement. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tiny event emitter. */
export class Emitter {
  constructor() { this.map = new Map(); }
  on(ev, fn) { (this.map.get(ev) || this.map.set(ev, []).get(ev)).push(fn); return () => this.off(ev, fn); }
  off(ev, fn) { const l = this.map.get(ev); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
  emit(ev, ...args) { const l = this.map.get(ev); if (l) for (const fn of [...l]) fn(...args); }
}
