// 2D physics world: tile collisions, body-body collisions, kinematic platforms, portal hooks.
import { TILE, clamp, approach } from '../core/util.js';
import { Body, BodyType } from './body.js';
import { T } from './tilemap.js';

export const GRAVITY = 1700;
const SUBSTEPS = 3;
const EPS = 0.01;
const SKIN = 0.001;
export const BREAK_MOMENTUM = 3000;

export class World {
  constructor(map) {
    this.map = map;
    this.bodies = [];
    this.portals = null;          // PortalManager, assigned by game
    this.onImpact = null;         // (body, speed, other|null) callback
    this.onBreak = null;          // (body) callback
    this.time = 0;
    this.gravity = GRAVITY;
    this.frameIgnore = new Map(); // body.id -> Set of tile indices (portal apertures)
  }

  add(body) { this.bodies.push(body); return body; }
  remove(body) { body.dead = true; }

  purge() { this.bodies = this.bodies.filter((b) => !b.dead); }

  /** All bodies overlapping a rect (optionally filtered). */
  query(x, y, w, h, filter = null) {
    const out = [];
    for (const b of this.bodies) {
      if (b.dead) continue;
      if (b.x < x + w && b.right > x && b.y < y + h && b.bottom > y && (!filter || filter(b))) out.push(b);
    }
    return out;
  }

  /** Raycast against tiles and bodies. Returns closest hit. */
  raycast(ox, oy, dx, dy, maxDist, { ignoreBody = null, bodies = true, ignoreTiles = null, filterBody = null } = {}) {
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    let best = this.map.raycast(ox, oy, dx, dy, maxDist, ignoreTiles);
    if (best) best = { ...best, body: null };
    if (bodies) {
      for (const b of this.bodies) {
        if (b.dead || b === ignoreBody) continue;
        if (filterBody && !filterBody(b)) continue;
        const t = rayBox(ox, oy, dx, dy, b.x, b.y, b.w, b.h, best ? best.dist : maxDist);
        if (t !== null && t >= 0 && (!best || t < best.dist)) {
          // normal from which face we hit
          const hx = ox + dx * t, hy = oy + dy * t;
          let nx = 0, ny = 0;
          const dl = Math.abs(hx - b.x), dr = Math.abs(hx - b.right), dt = Math.abs(hy - b.y), db = Math.abs(hy - b.bottom);
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) nx = -1; else if (m === dr) nx = 1; else if (m === dt) ny = -1; else ny = 1;
          best = { x: hx, y: hy, nx, ny, dist: t, body: b, tile: null, cx: -1, cy: -1 };
        }
      }
    }
    return best;
  }

  step(dt) {
    this.time += dt;
    const sdt = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) this.substep(sdt);
    this.purge();
  }

  substep(dt) {
    const bodies = this.bodies;
    // portal apertures: which tiles each body may ignore this substep
    this.frameIgnore.clear();
    if (this.portals) {
      for (const b of bodies) {
        if (b.dead) continue;
        const ig = this.portals.ignoreTilesFor(b);
        if (ig) this.frameIgnore.set(b.id, ig);
      }
    }

    // 1. kinematic bodies move and carry riders
    for (const b of bodies) {
      if (b.dead || b.type !== BodyType.KINEMATIC) continue;
      const dx = b.vx * dt, dy = b.vy * dt;
      if (dx === 0 && dy === 0) continue;
      b.px = b.x; b.py = b.y;
      // riders: bodies standing on this platform
      const riders = [];
      for (const o of bodies) if (!o.dead && o !== b && o.groundBody === b) riders.push(o);
      b.x += dx; b.y += dy;
      for (const r of riders) {
        this.moveX(r, dx, true);
        this.moveY(r, dy, true);
      }
      // push bodies we overlap (e.g. platform rising into a box)
      for (const o of bodies) {
        if (o.dead || o === b || o.type === BodyType.KINEMATIC) continue;
        if (!overlap(o, b)) continue;
        const ox = Math.min(o.right, b.right) - Math.max(o.x, b.x);
        const oy = Math.min(o.bottom, b.bottom) - Math.max(o.y, b.y);
        if (oy <= ox) {
          const dir = o.cy < b.cy ? -1 : 1;
          this.moveY(o, dir * (oy + EPS), true);
          if (dir < 0) { o.onGround = true; o.groundBody = b; if (o.vy > b.vy) o.vy = b.vy; }
          else if (o.vy < b.vy) o.vy = b.vy;
        } else {
          const dir = o.cx < b.cx ? -1 : 1;
          this.moveX(o, dir * (ox + EPS), true);
          if (dir > 0 ? o.vx < b.vx : o.vx > b.vx) o.vx = b.vx;
        }
      }
    }

    // 2. integrate dynamic bodies
    for (const b of bodies) {
      if (b.dead || b.type === BodyType.KINEMATIC) continue;
      b.px = b.x; b.py = b.y;
      b.impactSpeed = 0;
      const wasGround = b.onGround;
      const prevGround = b.groundBody;
      b.onGround = false; b.groundBody = null; b.hitWall = false; b.hitCeiling = false;
      if (b.portalCooldown > 0) b.portalCooldown -= dt;
      if (b.ignoreOneWay > 0) b.ignoreOneWay -= dt;
      if (!b.held && b.gravityScale !== 0) b.vy += this.gravity * b.gravityScale * dt;
      // drag
      const drag = 1 / (1 + b.airDrag * dt * 60);
      b.vx *= drag; b.vy *= drag;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > b.maxSpeed) { b.vx *= b.maxSpeed / sp; b.vy *= b.maxSpeed / sp; }
      if (b.type === BodyType.CHARACTER && b.controller) b.controller.prePhysics(dt, this);
      // portal apertures depend on the current velocity (floor portals only swallow falling bodies)
      if (this.portals) { const ig = this.portals.ignoreTilesFor(b); if (ig) this.frameIgnore.set(b.id, ig); else this.frameIgnore.delete(b.id); }

      // move
      this.moveX(b, b.vx * dt);
      this.moveY(b, b.vy * dt);

      // ground friction for free dynamic bodies
      if (b.type === BodyType.DYNAMIC && b.onGround && !b.held) {
        const gvx = b.groundBody ? b.groundBody.vx : 0;
        const f = b.rolls ? 0.4 : 12 * b.friction;
        b.vx = approach(b.vx, gvx, f * Math.abs(this.gravity) * dt * 0.1 + Math.abs(b.vx - gvx) * Math.min(1, f * dt));
        if (Math.abs(b.vx - gvx) < 2) b.vx = gvx;
      }
      if (b.rolls) { b.spin = b.vx / (b.w / 2); b.angle += b.spin * dt; }
      else if (!b.onGround && !b.held && b.type === BodyType.DYNAMIC) { b.angle += b.spin * dt; b.spin *= 0.995; }
      else if (b.type === BodyType.DYNAMIC && b.onGround) { b.angle = settleAngle(b.angle, dt); b.spin = 0; }
      if (!wasGround && b.onGround && prevGround !== b.groundBody) { /* landed */ }
    }

    // 3. body-body collisions (a few iterations for stacking)
    const dyn = bodies.filter((b) => !b.dead && b.type !== BodyType.KINEMATIC);
    dyn.sort((a, b) => a.x - b.x);
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < dyn.length; i++) {
        const a = dyn[i];
        for (let j = i + 1; j < dyn.length; j++) {
          const b = dyn[j];
          if (b.x > a.right) break;
          if (a.noCollideBodies || b.noCollideBodies) continue;
          if (!overlap(a, b)) continue;
          // held objects pass through the holder
          if ((a.held && a.holder === b) || (b.held && b.holder === a)) continue;
          // a just-thrown/dropped object still overlapping its holder keeps passing through it
          if ((a.releaseFrom === b || b.releaseFrom === a)) { if (this.time < (a.releaseFrom === b ? a.releaseUntil : b.releaseUntil)) continue; }
          this.resolvePair(a, b, iter === 0);
        }
      }
      // kinematic (platforms/doors) vs dynamics after pair pushes
      for (const k of bodies) {
        if (k.dead || k.type !== BodyType.KINEMATIC) continue;
        for (const o of dyn) {
          if (!overlap(o, k)) continue;
          if (k.oneWay && !(o.py + o.h <= k.py + 2 || o.bottom - k.y < 10 && o.vy >= k.vy)) continue;
          const ox = Math.min(o.right, k.right) - Math.max(o.x, k.x);
          const oy = Math.min(o.bottom, k.bottom) - Math.max(o.y, k.y);
          if (oy <= ox || k.oneWay) {
            const dir = o.cy < k.cy || k.oneWay ? -1 : 1;
            if (dir < 0) { o.y = k.y - o.h - SKIN; o.onGround = true; o.groundBody = k; if (o.vy > k.vy) { this.impact(o, o.vy - k.vy, k); o.vy = k.vy; } }
            else { o.y = k.bottom + SKIN; if (o.vy < k.vy) o.vy = k.vy; o.hitCeiling = true; }
          } else {
            const dir = o.cx < k.cx ? -1 : 1;
            if (dir < 0) o.x = k.x - o.w - SKIN; else o.x = k.right + SKIN;
            if (dir > 0 ? o.vx < k.vx : o.vx > k.vx) { this.impact(o, Math.abs(o.vx - k.vx), k); o.vx = k.vx; }
            o.hitWall = true;
          }
          this.depenetrateTiles(o);
        }
      }
    }

    // 4. portals
    if (this.portals) this.portals.processTeleports(dyn, dt);

    // 5. breakables
    for (const b of dyn) {
      if (b.breakable && b.impactSpeed > b.breakSpeed && !b.dead) {
        b.dead = true;
        if (this.onBreak) this.onBreak(b);
      }
    }
  }

  impact(b, speed, other) {
    speed = Math.abs(speed);
    if (speed > b.impactSpeed) b.impactSpeed = speed;
    if (speed > 60 && this.onImpact) this.onImpact(b, speed, other);
  }

  ignoreFor(b) { return this.frameIgnore.get(b.id) || null; }

  /** Try to smash a breakable tile with body b moving at `speed`. Returns true if it broke. */
  trySmash(b, cx, cy, speed) {
    if (b.type !== BodyType.DYNAMIC || b.held || !this.map.isBreakable(this.map.get(cx, cy))) return false;   // must be thrown/dropped, not pushed while held
    if (b.mass * Math.abs(speed) < BREAK_MOMENTUM) return false;
    const tiles = this.map.connectedBreakables(cx, cy);
    for (const [x, y] of tiles) this.map.set(x, y, T.EMPTY);
    if (this.onTileBreak) this.onTileBreak(tiles, b);
    return true;
  }

  /** Move body horizontally, resolving tile collisions. */
  moveX(b, dx, silent = false) {
    if (dx === 0) return;
    const ig = this.ignoreFor(b);
    b.x += dx;
    const map = this.map;
    const y0 = Math.floor((b.y + SKIN) / TILE), y1 = Math.floor((b.bottom - SKIN) / TILE);
    if (dx > 0) {
      const cx = Math.floor((b.right - SKIN) / TILE);
      for (let cy = y0; cy <= y1; cy++) {
        if (this.solidTile(cx, cy, ig)) {
          if (this.trySmash(b, cx, cy, b.vx)) { b.vx *= 0.75; continue; }
          const nx = cx * TILE - b.w - SKIN;
          if (nx < b.x) { b.x = nx; }
          if (b.vx > 0) { if (!silent) this.impact(b, b.vx, null); b.vx = b.bounce > 0.25 ? -b.vx * b.bounce : 0; }
          b.hitWall = true;
          break;
        }
      }
    } else {
      const cx = Math.floor((b.x + SKIN) / TILE);
      for (let cy = y0; cy <= y1; cy++) {
        if (this.solidTile(cx, cy, ig)) {
          if (this.trySmash(b, cx, cy, b.vx)) { b.vx *= 0.75; continue; }
          const nx = (cx + 1) * TILE + SKIN;
          if (nx > b.x) b.x = nx;
          if (b.vx < 0) { if (!silent) this.impact(b, b.vx, null); b.vx = b.bounce > 0.25 ? -b.vx * b.bounce : 0; }
          b.hitWall = true;
          break;
        }
      }
    }
    this.collideExtrasX(b, dx, silent);
  }

  /** Extra solid rects (leftover tile pieces beside portals). */
  collideExtrasX(b, dx, silent) {
    if (!this.portals) return;
    const extras = this.portals.extraSolidsFor(b);
    if (!extras) return;
    for (const r of extras) {
      if (!(b.x < r.x + r.w && b.right > r.x && b.y + 0.5 < r.y + r.h && b.bottom - 0.5 > r.y)) continue;
      if (dx > 0) { b.x = r.x - b.w - SKIN; if (b.vx > 0) { if (!silent) this.impact(b, b.vx, null); b.vx = 0; } }
      else { b.x = r.x + r.w + SKIN; if (b.vx < 0) { if (!silent) this.impact(b, b.vx, null); b.vx = 0; } }
      b.hitWall = true;
    }
  }

  collideExtrasY(b, dy, silent) {
    if (!this.portals) return;
    const extras = this.portals.extraSolidsFor(b);
    if (!extras) return;
    for (const r of extras) {
      if (!(b.x + 0.5 < r.x + r.w && b.right - 0.5 > r.x && b.y < r.y + r.h && b.bottom > r.y)) continue;
      if (dy > 0) { b.y = r.y - b.h - SKIN; if (b.vy > 0) { if (!silent) this.impact(b, b.vy, null); b.vy = 0; } b.onGround = true; b.groundBody = null; }
      else { b.y = r.y + r.h + SKIN; if (b.vy < 0) { if (!silent) this.impact(b, b.vy, null); b.vy = 0; } b.hitCeiling = true; }
    }
  }

  /** Move body vertically, resolving tile and one-way collisions. */
  moveY(b, dy, silent = false) {
    if (dy === 0) {
      // still need ground detection when resting
      this.checkGround(b);
      return;
    }
    const ig = this.ignoreFor(b);
    const prevBottom = b.bottom;
    b.y += dy;
    const map = this.map;
    const x0 = Math.floor((b.x + SKIN) / TILE), x1 = Math.floor((b.right - SKIN) / TILE);
    if (dy > 0) {
      const cy = Math.floor((b.bottom - SKIN) / TILE);
      for (let cx = x0; cx <= x1; cx++) {
        const t = map.get(cx, cy);
        const solid = this.solidTile(cx, cy, ig);
        const oneway = (t === T.ONEWAY || (!b.climbing && map.isLadderTop(cx, cy))) && b.ignoreOneWay <= 0 && prevBottom <= cy * TILE + 0.5 && !(ig && ig.has(cy * map.cols + cx));
        if (solid && this.trySmash(b, cx, cy, b.vy)) { b.vy *= 0.75; continue; }
        if (solid || oneway) {
          b.y = cy * TILE - b.h - SKIN;
          if (b.vy > 0) {
            if (!silent) this.impact(b, b.vy, null);
            b.vy = b.bounce > 0.2 && b.vy > 120 ? -b.vy * b.bounce : 0;
          }
          b.onGround = true; b.groundBody = null;
          break;
        }
      }
    } else {
      const cy = Math.floor((b.y + SKIN) / TILE);
      for (let cx = x0; cx <= x1; cx++) {
        if (this.solidTile(cx, cy, ig)) {
          if (this.trySmash(b, cx, cy, b.vy)) { b.vy *= 0.75; continue; }
          b.y = (cy + 1) * TILE + SKIN;
          if (b.vy < 0) { if (!silent) this.impact(b, b.vy, null); b.vy = b.bounce > 0.25 ? -b.vy * b.bounce : 0; }
          b.hitCeiling = true;
          break;
        }
      }
    }
    this.collideExtrasY(b, dy, silent);
    if (!b.onGround) this.checkGround(b);
  }

  /** Detect ground directly under a body without moving it (for resting bodies). */
  checkGround(b) {
    const ig = this.ignoreFor(b);
    const map = this.map;
    const probeY = b.bottom + 0.5;
    const cy = Math.floor(probeY / TILE);
    if (Math.abs(cy * TILE - b.bottom) > 1.0) return;
    const x0 = Math.floor((b.x + SKIN) / TILE), x1 = Math.floor((b.right - SKIN) / TILE);
    for (let cx = x0; cx <= x1; cx++) {
      const t = map.get(cx, cy);
      if (this.solidTile(cx, cy, ig) || ((t === T.ONEWAY || (!b.climbing && map.isLadderTop(cx, cy))) && b.ignoreOneWay <= 0 && !(ig && ig.has(cy * map.cols + cx)))) {
        if (b.vy >= 0) { b.onGround = true; if (b.vy > 0) b.vy = 0; }
        return;
      }
    }
  }

  solidTile(cx, cy, ig) {
    if (!this.map.solidAt(cx, cy)) return false;
    if (ig && ig.has(cy * this.map.cols + cx)) return false;
    return true;
  }

  /** Push a body out of solid tiles if it somehow ended up inside (after body pushes). */
  depenetrateTiles(b) {
    const ig = this.ignoreFor(b);
    if (!this.map.rectHitsSolid(b.x + SKIN, b.y + SKIN, b.w - 2 * SKIN, b.h - 2 * SKIN, ig)) return false;
    // try small pushes in 4 directions, pick the smallest that frees the body
    const tries = [];
    for (let d = 1; d <= TILE; d += 1) {
      for (const [ox, oy] of [[0, -d], [0, d], [-d, 0], [d, 0]]) {
        if (!this.map.rectHitsSolid(b.x + ox + SKIN, b.y + oy + SKIN, b.w - 2 * SKIN, b.h - 2 * SKIN, ig)) {
          b.x += ox; b.y += oy;
          if (oy < 0) { b.onGround = true; if (b.vy > 0) b.vy = 0; }
          if (ox !== 0) { b.vx = 0; }
          return true;
        }
      }
    }
    return false;
  }

  resolvePair(a, b, first) {
    const total = a.invMass + b.invMass;
    if (total === 0) return;
    const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) return;
    // prefer vertical resolution when it's a clear "on top" case
    const verticalBias = 1.0;
    // characters are heavier for pushing but shouldn't be shoved by boxes vertically
    if (oy * verticalBias <= ox) {
      const top = a.cy < b.cy ? a : b;   // upper body
      const bot = top === a ? b : a;
      // held bodies don't press down on the cat; treat like normal
      let wTop = top.invMass / total, wBot = bot.invMass / total;
      // when resting, the top body takes all the correction (stable stacks)
      if (bot.onGround || bot.type === BodyType.CHARACTER) { wTop = 1; wBot = 0; }
      const push = oy + SKIN;
      const oldTopY = top.y;
      top.y -= push * wTop;
      if (wTop > 0 && this.map.rectHitsSolid(top.x + SKIN, top.y + SKIN, top.w - 2 * SKIN, top.h - 2 * SKIN, this.ignoreFor(top))) {
        // blocked by ceiling: push bottom instead
        top.y = oldTopY;
        bot.y += push;
        this.depenetrateTiles(bot);
      } else {
        bot.y += push * wBot;
        if (wBot > 0) this.depenetrateTiles(bot);
      }
      const rel = top.vy - bot.vy;
      const botResting = bot.onGround || bot.invMass === 0 || bot.type === BodyType.CHARACTER;
      if (rel > 0) {
        this.impact(top, rel, bot); this.impact(bot, rel, top);
        const e = rel > 140 ? Math.max(top.bounce, bot.bounce) : 0;
        if (botResting) {
          // resting support: the top body simply stops (or bounces) — no velocity creeps into the stack
          top.vy = bot.vy - rel * e;
        } else {
          const j = (1 + e) * rel / total;
          top.vy -= j * top.invMass; bot.vy += j * bot.invMass;
        }
      }
      top.onGround = true; top.groundBody = bot;
      // friction: top body follows the bottom's horizontal motion
      if (!top.held && top.type === BodyType.DYNAMIC) {
        const f = Math.min(1, 10 * Math.max(top.friction, 0.05) * (1 / 60));
        top.vx += (bot.vx - top.vx) * f;
      }
    } else {
      const left = a.cx < b.cx ? a : b;
      const right = left === a ? b : a;
      const push = ox + SKIN;
      let wl = left.invMass / total, wr = right.invMass / total;
      // characters push objects firmly
      if (left.type === BodyType.CHARACTER && right.type !== BodyType.CHARACTER) { wl = 0.15; wr = 0.85; }
      if (right.type === BodyType.CHARACTER && left.type !== BodyType.CHARACTER) { wr = 0.15; wl = 0.85; }
      const ol = left.x, orr = right.x;
      left.x -= push * wl; right.x += push * wr;
      const igL = this.ignoreFor(left), igR = this.ignoreFor(right);
      const lBlocked = this.map.rectHitsSolid(left.x + SKIN, left.y + SKIN, left.w - 2 * SKIN, left.h - 2 * SKIN, igL);
      const rBlocked = this.map.rectHitsSolid(right.x + SKIN, right.y + SKIN, right.w - 2 * SKIN, right.h - 2 * SKIN, igR);
      if (lBlocked && !rBlocked) { left.x = ol; right.x = orr + push; if (this.map.rectHitsSolid(right.x + SKIN, right.y + SKIN, right.w - 2 * SKIN, right.h - 2 * SKIN, igR)) this.depenetrateTiles(right); }
      else if (rBlocked && !lBlocked) { right.x = orr; left.x = ol - push; if (this.map.rectHitsSolid(left.x + SKIN, left.y + SKIN, left.w - 2 * SKIN, left.h - 2 * SKIN, igL)) this.depenetrateTiles(left); }
      else if (lBlocked && rBlocked) { this.depenetrateTiles(left); this.depenetrateTiles(right); }
      const rel = left.vx - right.vx; // >0 approaching
      if (rel > 0) {
        this.impact(left, rel, right); this.impact(right, rel, left);
        const e = rel > 140 ? Math.max(left.bounce, right.bounce) : 0;
        const j = (1 + e) * rel / total;
        left.vx -= j * left.invMass; right.vx += j * right.invMass;
      }
      left.hitWall = right.hitWall = true;
      // the pushing character keeps a gentle walking speed into the object
      const pusher = left.type === BodyType.CHARACTER ? left : right.type === BodyType.CHARACTER ? right : null;
      if (pusher) pusher.pushing = this.time;
    }
  }
}

function overlap(a, b) {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

function settleAngle(angle, dt) {
  // settle the visual angle to the nearest quarter turn when resting
  const q = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
  return angle + (q - angle) * Math.min(1, dt * 14);
}

export function rayBox(ox, oy, dx, dy, x, y, w, h, maxT) {
  let tmin = -Infinity, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) { if (ox < x || ox > x + w) return null; }
  else {
    let t1 = (x - ox) / dx, t2 = (x + w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  if (Math.abs(dy) < 1e-9) { if (oy < y || oy > y + h) return null; }
  else {
    let t1 = (y - oy) / dy, t2 = (y + h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
  }
  if (tmax < 0 || tmin > tmax || tmin > maxT) return null;
  return tmin < 0 ? 0 : tmin;
}

export { Body, BodyType };
