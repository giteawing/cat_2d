// Portal system: free placement on any portal-able solid surface, aperture handling,
// teleportation of the cat and physics objects with velocity transformation.
//
// A portal lives on the face of solid tiles. It has:
//   pos (x,y)  – centre of the portal on the surface plane
//   n  (nx,ny) – unit normal pointing away from the wall into open space
//   t  (tx,ty) – unit tangent along the surface (n rotated +90°)
//   tiles      – set of tile indices behind the portal ("aperture"); bodies inside the
//                portal zone are allowed to overlap these tiles.
//   extraSolids– leftover pieces of the aperture tiles that lie outside the portal span,
//                so bodies can't slip through the wall beside the portal.
import { TILE, clamp } from '../core/util.js';
import { T } from '../physics/tilemap.js';

export const PORTAL_HALF = 34;     // half-length along the surface (68 px total)
export const PORTAL_DEPTH = 12;    // visual thickness
const ZONE_FRONT = 22;              // how far in front of the plane the zone extends
const MAX_SHIFT = 44;              // max automatic correction toward a valid spot
const COOLDOWN = 0.12;

export class Portal {
  constructor(color) {
    this.color = color;            // 'blue' | 'orange'
    this.active = false;
    this.x = 0; this.y = 0;
    this.nx = 0; this.ny = -1;
    this.tx = 1; this.ty = 0;
    this.tiles = new Set();
    this.extraSolids = [];
    this.openT = 0;                 // open animation 0..1
    this.age = 0;
  }
  get zone() {
    // rect covering the aperture depth behind the plane and ZONE_FRONT in front
    const hx = Math.abs(this.tx) * PORTAL_HALF + Math.abs(this.nx) * (TILE + ZONE_FRONT) / 2;
    const hy = Math.abs(this.ty) * PORTAL_HALF + Math.abs(this.ny) * (TILE + ZONE_FRONT) / 2;
    const cx = this.x + this.nx * (ZONE_FRONT - TILE) / 2;
    const cy = this.y + this.ny * (ZONE_FRONT - TILE) / 2;
    return { x: cx - hx, y: cy - hy, w: hx * 2, h: hy * 2 };
  }
  /** Signed distance of a point from the plane (positive = in front). */
  side(px, py) { return (px - this.x) * this.nx + (py - this.y) * this.ny; }
  along(px, py) { return (px - this.x) * this.tx + (py - this.y) * this.ty; }
}

export class PortalManager {
  constructor(map, world) {
    this.map = map;
    this.world = world;
    this.blue = new Portal('blue');
    this.orange = new Portal('orange');
    this.onTeleport = null;      // (body, from, to) => void
    this.enabled = true;
  }

  get pair() { return [this.blue, this.orange]; }
  get linked() { return this.blue.active && this.orange.active; }

  reset() {
    for (const p of this.pair) { p.active = false; p.tiles.clear(); p.extraSolids = []; p.openT = 0; }
  }

  other(p) { return p === this.blue ? this.orange : this.blue; }

  update(dt) {
    for (const p of this.pair) {
      if (p.active) { p.openT = Math.min(1, p.openT + dt * 5); p.age += dt; }
    }
  }

  /**
   * Shoot a portal. Returns { ok, hit, reason }.
   */
  shoot(color, ox, oy, dx, dy, shooter) {
    const hit = this.shotRay(ox, oy, dx, dy);
    if (!hit) return { ok: false, hit: null, reason: 'nohit' };
    const res = this.tryPlace(color, hit.x, hit.y, hit.nx, hit.ny, hit.cx, hit.cy);
    return { ok: res.ok, hit, reason: res.reason, portal: res.ok ? this[color] : null };
  }

  /** Raycast for portal shots: grates are transparent. */
  shotRay(ox, oy, dx, dy) {
    const map = this.map;
    return map.raycast(ox, oy, dx, dy, 3000, null, (cx, cy) => map.blocksShot(map.get(cx, cy)));
  }

  /** Try to place a portal of `color` at surface point with given normal. */
  tryPlace(color, hx, hy, nx, ny, cx, cy) {
    const map = this.map;
    if (!map.isPortalable(map.get(cx, cy))) return { ok: false, reason: 'surface' };
    if (nx === 0 && ny === 0) return { ok: false, reason: 'surface' };
    const tx = -ny, ty = nx;
    // plane position: the face of the tile
    let px, py;
    if (nx !== 0) { px = nx > 0 ? (cx + 1) * TILE : cx * TILE; py = hy; }
    else { py = ny > 0 ? (cy + 1) * TILE : cy * TILE; px = hx; }

    const other = this.other(this[color]);
    // snap to a tile edge when the span almost reaches one (avoids tiny wall slivers that catch objects)
    {
      const axis = nx !== 0 ? py : px;
      const lo = axis - PORTAL_HALF, hi = axis + PORTAL_HALF;
      const loSnap = Math.round(lo / TILE) * TILE, hiSnap = Math.round(hi / TILE) * TILE;
      const dLo = loSnap - lo, dHi = hiSnap - hi;
      let d = 0;
      if (Math.abs(dLo) <= 6 && Math.abs(dHi) <= 6) d = Math.abs(dLo) < Math.abs(dHi) ? dLo : dHi;
      else if (Math.abs(dLo) <= 6) d = dLo; else if (Math.abs(dHi) <= 6) d = dHi;
      if (nx !== 0) py += d; else px += d;
    }
    // find the best centre along the tangent: exact hit first, then small shifts
    const shifts = [0];
    for (let s = 2; s <= MAX_SHIFT; s += 2) shifts.push(s, -s);
    for (const s of shifts) {
      const qx = px + tx * s, qy = py + ty * s;
      const fit = this.fitsAt(qx, qy, nx, ny, tx, ty, other);
      if (fit) {
        const p = this[color];
        p.active = true; p.x = qx; p.y = qy; p.nx = nx; p.ny = ny; p.tx = tx; p.ty = ty;
        p.tiles = fit.tiles; p.extraSolids = fit.extra; p.openT = 0; p.age = 0;
        return { ok: true, reason: s === 0 ? 'exact' : 'shifted' };
      }
    }
    return { ok: false, reason: 'nofit' };
  }

  /** Check whether a portal centred at (qx,qy) fits: aperture tiles solid+portalable, front tiles open. */
  fitsAt(qx, qy, nx, ny, tx, ty, other) {
    const map = this.map;
    const tiles = new Set();
    const extra = [];
    const vertical = nx !== 0;                       // wall (tangent along y) vs floor/ceiling (tangent along x)
    const axis = vertical ? qy : qx;                 // absolute coordinate along the surface
    const spanMin = axis - PORTAL_HALF, spanMax = axis + PORTAL_HALF;
    // rows/cols of the aperture (behind the plane) and of the space in front
    const behind = vertical ? Math.floor((qx - nx * TILE / 2) / TILE) : Math.floor((qy - ny * TILE / 2) / TILE);
    const front = vertical ? Math.floor((qx + nx * TILE / 2) / TILE) : Math.floor((qy + ny * TILE / 2) / TILE);
    const c0 = Math.floor(spanMin / TILE), c1 = Math.floor((spanMax - 0.001) / TILE);
    for (let a = c0; a <= c1; a++) {
      const cx = vertical ? behind : a, cy = vertical ? a : behind;
      const fcx = vertical ? front : a, fcy = vertical ? a : front;
      if (cx < 0 || cy < 0 || cx >= map.cols || cy >= map.rows) return null;
      if (!map.isPortalable(map.get(cx, cy))) return null;
      if (map.isSolid(map.get(fcx, fcy))) return null;
      tiles.add(cy * map.cols + cx);
      const cellMin = a * TILE, cellMax = (a + 1) * TILE;
      if (cellMin < spanMin - 1) extra.push(cellRect(vertical, cx, cy, cellMin, spanMin));
      if (cellMax > spanMax + 1) extra.push(cellRect(vertical, cx, cy, spanMax, cellMax));
    }
    if (other.active) {
      const sameNormal = other.nx === nx && other.ny === ny;
      const samePlane = Math.abs(other.side(qx, qy)) < 1;
      if (sameNormal && samePlane && Math.abs(other.along(qx, qy)) < PORTAL_HALF * 2 + 2) return null;
      if (sameNormal) for (const t of tiles) if (other.tiles.has(t)) return null;
    }
    return { tiles, extra };
  }

  // ---------------------------------------------------------------- physics hooks
  /** Which tiles may this body ignore (portal apertures it is entering)? */
  ignoreTilesFor(body) {
    if (!this.linked || !body.portalable) return null;
    let set = null;
    const m = 6; // swept margin so fast bodies register before touching the wall
    // a body that came out of a floor portal slowly may rest on top of it until it leaves, jumps or ducks
    if (body.restPortal) {
      const rp = body.restPortal, z = rp.zone;
      const over = body.x < z.x + z.w && body.x + body.w > z.x && body.y < z.y + z.h + 4 && body.y + body.h > z.y;
      if (!rp.active || !over || body.vy < -1 || body.dropThrough) body.restPortal = null;
    }
    for (const p of this.pair) {
      const z = p.zone;
      if (body.x - m < z.x + z.w && body.x + body.w + m > z.x && body.y - m < z.y + z.h && body.y + body.h + m > z.y) {
        if (body.restPortal === p) continue;
        if (!set) set = new Set();
        for (const t of p.tiles) set.add(t);
      }
    }
    return set;
  }

  /** Extra solid rects for a body in a portal zone (leftover tile pieces). */
  extraSolidsFor(body) {
    if (!this.linked || !body.portalable) return null;
    let list = null;
    for (const p of this.pair) {
      const z = p.zone;
      if (body.x < z.x + z.w && body.x + body.w > z.x && body.y < z.y + z.h && body.y + body.h > z.y) {
        if (p.extraSolids.length) { if (!list) list = []; list.push(...p.extraSolids); }
      }
    }
    return list;
  }

  /** Transform for a point/vector from portal a to portal b (pure rotation mapping -n_a onto n_b). */
  transform(a, b) {
    const angA = Math.atan2(-a.ny, -a.nx), angB = Math.atan2(b.ny, b.nx);
    const th = angB - angA;
    const c = Math.cos(th), s = Math.sin(th);
    return {
      point: (x, y) => { const rx = x - a.x, ry = y - a.y; return { x: b.x + rx * c - ry * s, y: b.y + rx * s + ry * c }; },
      vec: (x, y) => ({ x: x * c - y * s, y: x * s + y * c }),
      angle: th,
    };
  }

  /** For the gravity gun: the hold target might be better expressed through a portal. */
  closestTargetFor(tx, ty, bx, by) {
    if (!this.linked) return { x: tx, y: ty };
    let best = { x: tx, y: ty }, bestD = (tx - bx) ** 2 + (ty - by) ** 2;
    for (const a of this.pair) {
      const b = this.other(a);
      const tr = this.transform(a, b);
      const p = tr.point(tx, ty);
      const d = (p.x - bx) ** 2 + (p.y - by) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /** Called each physics substep with the dynamic bodies. */
  processTeleports(bodies, dt) {
    if (!this.linked) return;
    for (const body of bodies) {
      if (body.dead || !body.portalable) continue;
      for (const p of this.pair) {
        const z = p.zone;
        if (!(body.x < z.x + z.w && body.x + body.w > z.x && body.y < z.y + z.h && body.y + body.h > z.y)) continue;
        const cx = body.x + body.w / 2, cy = body.y + body.h / 2;
        const side = p.side(cx, cy);
        // funnel: while penetrating the plane keep the body inside the portal span
        const halfN = (Math.abs(p.nx) * body.w + Math.abs(p.ny) * body.h) / 2;
        const intoSpeed = -(body.vx * p.nx + body.vy * p.ny);   // speed toward the wall
        let penetrating = side < halfN - 0.5 && (intoSpeed > 0 || side < halfN * 0.5);
        // objects resting on a floor portal with most of their footprint over it slide in instead of
        // balancing on the leftover sliver (the cat is handled by the rest-portal rule)
        // (centre of mass over the hole → it tips in; the cat too, unless it is crouching on top of the portal)
        if (!penetrating && p.ny < 0 && side < halfN + 2 && intoSpeed >= 0 && !body.dropThroughBlock) {
          const along = p.along(cx, cy);
          const halfT0 = (Math.abs(p.tx) * body.w + Math.abs(p.ty) * body.h) / 2;
          // footprint overlap with the span: more than half of the body over the hole → it tips in
          const over = Math.min(along + halfT0, PORTAL_HALF) - Math.max(along - halfT0, -PORTAL_HALF);
          if (over > halfT0 * (body.type === 'character' ? 1.1 : 1.0)) penetrating = true;
        }
        // fast arrivals from above: anything falling onto a floor portal with at least a third of its footprint over the
        // hole is funnelled in (a cat dropping from a height should never balance on the rim of the portal)
        if (!penetrating && p.ny < 0 && intoSpeed > 350 && side < halfN + 12 && !body.dropThroughBlock) {
          const along = p.along(cx, cy);
          const halfT0 = (Math.abs(p.tx) * body.w + Math.abs(p.ty) * body.h) / 2;
          const over = Math.min(along + halfT0, PORTAL_HALF) - Math.max(along - halfT0, -PORTAL_HALF);
          if (over > halfT0 * 0.66) penetrating = true;
        }
        if (penetrating && !(p.ny < 0 && body.restPortal === p)) {
          const halfT = (Math.abs(p.tx) * body.w + Math.abs(p.ty) * body.h) / 2;
          const along = p.along(cx, cy);
          const lim = Math.max(0, PORTAL_HALF - halfT - 0.5);   // fully inside the span so leftover slivers can't catch it
          if (Math.abs(along) > lim && Math.abs(along) < PORTAL_HALF + halfT * 0.25) {
            const corr = clamp(along, -lim, lim) - along;
            body.x += p.tx * corr; body.y += p.ty * corr;
            const vt = body.vx * p.tx + body.vy * p.ty;
            body.vx -= p.tx * vt * 0.5; body.vy -= p.ty * vt * 0.5;
          }
        }
        if (side < 0 && body.portalCooldown <= 0) {
          this.teleport(body, p, this.other(p));
          break;
        }
      }
    }
  }

  teleport(body, a, b) {
    const tr = this.transform(a, b);
    const cx = body.x + body.w / 2, cy = body.y + body.h / 2;
    // tangential offset relative to a, mapped through the rotation
    const alongA = a.along(cx, cy);
    const sideA = a.side(cx, cy);
    // map: point behind plane a at (alongA, sideA) → in front of plane b
    const halfTB = (Math.abs(b.tx) * body.w + Math.abs(b.ty) * body.h) / 2;
    const halfNB = (Math.abs(b.nx) * body.w + Math.abs(b.ny) * body.h) / 2;
    // rotation applied to the tangent offset: since -n_a → n_b, t_a → ±t_b
    const tv = tr.vec(a.tx, a.ty);
    const sgn = tv.x * b.tx + tv.y * b.ty > 0 ? 1 : -1;
    let alongB = clamp(alongA * sgn, -(PORTAL_HALF - halfTB), PORTAL_HALF - halfTB);
    if (halfTB > PORTAL_HALF) alongB = 0;
    // depth: how far we went behind the plane is how far we are in front on exit
    const depth = Math.max(-sideA, 0);
    let ncx = b.x + b.tx * alongB + b.nx * (halfNB + 1 + depth);
    let ncy = b.y + b.ty * alongB + b.ny * (halfNB + 1 + depth);
    const nv = tr.vec(body.vx, body.vy);
    body.x = ncx - body.w / 2; body.y = ncy - body.h / 2;
    body.vx = nv.x; body.vy = nv.y;
    // a little energy loss for objects, so floor<->floor loops calm down eventually
    // energy loss so floor<->floor bouncing calms down (the cat settles quicker than objects)
    const loss = body.type === 'character' ? 0.85 : 0.96;
    body.vx *= loss; body.vy *= loss;
    // guarantee a minimum outward speed so we clear the plane
    let outSpeed = body.vx * b.nx + body.vy * b.ny;
    const minOut = 40;
    if (outSpeed < minOut) { body.vx += b.nx * (minOut - outSpeed); body.vy += b.ny * (minOut - outSpeed); outSpeed = minOut; }
    body.portalCooldown = COOLDOWN;
    body.onGround = false; body.groundBody = null;
    // exiting a floor portal slowly: arrive standing on top of it instead of bobbing forever
    if (b.ny < 0 && outSpeed < (body.type === 'character' ? 330 : 250)) {
      body.y = b.y - body.h - 0.01;
      // keep the body fully within the portal span so it can drop back in later
      const lim = Math.max(0, PORTAL_HALF - body.w / 2 - 2);
      body.x = clamp(body.x + body.w / 2, b.x - lim, b.x + lim) - body.w / 2;
      body.vy = 0; body.onGround = true; body.portalCooldown = 0;
      body.restPortal = b;
    }
    body.px = body.x; body.py = body.y;
    if (!body.rolls) body.spin += (Math.random() - 0.5) * 2;
    // make sure the exit is clear (except b's aperture): nudge along tangent / normal
    const ig = new Set(b.tiles);
    if (this.map.rectHitsSolid(body.x + 0.5, body.y + 0.5, body.w - 1, body.h - 1, ig)) {
      let fixed = false;
      for (let d = 2; d <= 40 && !fixed; d += 2) {
        for (const [ox, oy] of [[b.nx * d, b.ny * d], [b.tx * d, b.ty * d], [-b.tx * d, -b.ty * d]]) {
          if (!this.map.rectHitsSolid(body.x + ox + 0.5, body.y + oy + 0.5, body.w - 1, body.h - 1, ig)) { body.x += ox; body.y += oy; fixed = true; break; }
        }
      }
    }
    if (body.controller && body.controller.onTeleport) body.controller.onTeleport(a, b);
    if (this.onTeleport) this.onTeleport(body, a, b);
  }
}

function cellRect(vertical, cx, cy, aMin, aMax) {
  // a rect in world space covering tangent range [aMin,aMax] of the tile (cx,cy)
  if (vertical) return { x: cx * TILE, y: aMin, w: TILE, h: aMax - aMin };
  return { x: aMin, y: cy * TILE, w: aMax - aMin, h: TILE };
}
