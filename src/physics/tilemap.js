// Tile map: static level geometry. Tiles are TILE x TILE squares.
// Tile types are small integers so lookups are cheap.
import { TILE } from '../core/util.js';

export const T = {
  EMPTY: 0,
  SOLID: 1,        // solid, portal-able (bricks / concrete)
  METAL: 2,        // solid, NOT portal-able (dark metal)
  ONEWAY: 3,       // thin platform, solid from above only
  LADDER: 4,       // climbable, non-solid
  GLASS: 5,        // solid, non-portalable, see-through
  DECOR_BG: 6,     // background decoration (non-solid)
  GRATE: 7,        // solid metal grate: blocks bodies, but portal shots pass through
  BREAKABLE: 8,    // cracked bricks: shatter when hit by a heavy/fast object
  EFIELD: 9,       // electric field: blocks bodies (elastic bounce), portal shots pass through; a cat in quantum
                   // tunneling mode running into it passes through with 25% probability
};

export const TILE_CHARS = {
  '#': T.SOLID,
  'X': T.METAL,
  '=': T.ONEWAY,
  'H': T.LADDER,
  'G': T.GLASS,
  '|': T.GRATE,
  'B': T.BREAKABLE,
  '~': T.EFIELD,
  '.': T.EMPTY,
  ' ': T.EMPTY,
};

export class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.data = new Uint8Array(cols * rows);
    this.width = cols * TILE;
    this.height = rows * TILE;
  }

  static fromStrings(lines) {
    const rows = lines.length;
    const cols = Math.max(...lines.map((l) => l.length));
    const map = new TileMap(cols, rows);
    for (let y = 0; y < rows; y++) {
      const line = lines[y];
      for (let x = 0; x < cols; x++) {
        const ch = line[x] ?? ' ';
        const t = TILE_CHARS[ch];
        map.data[y * cols + x] = t === undefined ? T.EMPTY : t;
      }
    }
    return map;
  }

  get(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return T.SOLID; // outside = solid walls
    return this.data[cy * this.cols + cx];
  }

  set(cx, cy, t) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.data[cy * this.cols + cx] = t;
  }

  isSolid(t) { return t === T.SOLID || t === T.METAL || t === T.GLASS || t === T.GRATE || t === T.BREAKABLE || t === T.EFIELD; }
  isField(t) { return t === T.EFIELD; }
  /** Does this tile stop a portal shot? (grates let shots through) */
  blocksShot(t) { return t === T.SOLID || t === T.METAL || t === T.GLASS || t === T.BREAKABLE; }
  isBreakable(t) { return t === T.BREAKABLE; }
  /** Flood-fill all breakable tiles connected to (cx,cy); returns list of [cx,cy]. */
  connectedBreakables(cx, cy, limit = 96) {
    const out = [], seen = new Set(), stack = [[cx, cy]];
    while (stack.length && out.length < limit) {
      const [x, y] = stack.pop();
      const k = y * this.cols + x;
      if (seen.has(k)) continue; seen.add(k);
      if (!this.isBreakable(this.get(x, y))) continue;
      out.push([x, y]);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }
  /** Flood-fill all connected electric-field tiles (one "field wall"); returns a Set of tile indices. */
  connectedField(cx, cy, limit = 160) {
    const out = new Set(), stack = [[cx, cy]];
    while (stack.length && out.size < limit) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
      const k = y * this.cols + x;
      if (out.has(k) || !this.isField(this.data[k])) continue;
      out.add(k);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }
  isPortalable(t) { return t === T.SOLID; }
  isOneWay(t) { return t === T.ONEWAY; }
  isLadder(t) { return t === T.LADDER; }
  /** Top tile of a ladder acts as a one-way platform so you can stand on it. */
  isLadderTop(cx, cy) { return this.get(cx, cy) === T.LADDER && this.get(cx, cy - 1) !== T.LADDER; }

  solidAt(cx, cy) { return this.isSolid(this.get(cx, cy)); }

  /** World-space rect of a tile. */
  tileRect(cx, cy) { return { x: cx * TILE, y: cy * TILE, w: TILE, h: TILE }; }

  /** Is any solid tile overlapping the rect (ignoring tiles in the ignore set)? */
  rectHitsSolid(x, y, w, h, ignore = null) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (this.solidAt(cx, cy) && !(ignore && ignore.has(cy * this.cols + cx))) return true;
      }
    }
    return false;
  }

  /** Does the rect overlap a ladder tile? */
  rectOnLadder(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (this.isLadder(this.get(cx, cy))) return true;
    return false;
  }

  /**
   * DDA raycast against solid tiles. Returns { x, y, nx, ny, cx, cy, dist, tile } or null.
   * ignore: Set of tile indices to skip.
   */
  raycast(ox, oy, dx, dy, maxDist = 2000, ignore = null, solidFn = null) {
    const isSolid = solidFn || ((cx, cy) => this.solidAt(cx, cy));
    const l = Math.hypot(dx, dy);
    if (l < 1e-9) return null;
    dx /= l; dy /= l;
    let cx = Math.floor(ox / TILE), cy = Math.floor(oy / TILE);
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const tDeltaX = stepX !== 0 ? Math.abs(TILE / dx) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(TILE / dy) : Infinity;
    let tMaxX = stepX > 0 ? ((cx + 1) * TILE - ox) / dx : stepX < 0 ? (cx * TILE - ox) / dx : Infinity;
    let tMaxY = stepY > 0 ? ((cy + 1) * TILE - oy) / dy : stepY < 0 ? (cy * TILE - oy) / dy : Infinity;
    // if we start inside a solid tile, report immediately
    if (isSolid(cx, cy) && !(ignore && ignore.has(cy * this.cols + cx))) {
      return { x: ox, y: oy, nx: -dx, ny: -dy, cx, cy, dist: 0, tile: this.get(cx, cy), inside: true };
    }
    let t = 0;
    let nx = 0, ny = 0;
    for (let i = 0; i < 400; i++) {
      if (tMaxX < tMaxY) { t = tMaxX; tMaxX += tDeltaX; cx += stepX; nx = -stepX; ny = 0; }
      else { t = tMaxY; tMaxY += tDeltaY; cy += stepY; nx = 0; ny = -stepY; }
      if (t > maxDist) return null;
      if (isSolid(cx, cy) && !(ignore && ignore.has(cy * this.cols + cx))) {
        return { x: ox + dx * t, y: oy + dy * t, nx, ny, cx, cy, dist: t, tile: this.get(cx, cy) };
      }
    }
    return null;
  }
}
