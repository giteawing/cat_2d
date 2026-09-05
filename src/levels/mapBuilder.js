// Small helper to author tile maps procedurally instead of hand-typing strings.
export class MapBuilder {
  constructor(cols, rows, fill = '.') {
    this.cols = cols; this.rows = rows;
    this.g = Array.from({ length: rows }, () => Array(cols).fill(fill));
  }
  set(x, y, ch) { if (x >= 0 && y >= 0 && x < this.cols && y < this.rows) this.g[y][x] = ch; return this; }
  get(x, y) { return this.g[y]?.[x]; }
  rect(x0, y0, x1, y1, ch = '#') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch); return this; }
  row(y, x0, x1, ch = '#') { return this.rect(x0, y, x1, y, ch); }
  col(x, y0, y1, ch = '#') { return this.rect(x, y0, x, y1, ch); }
  border(ch = '#') { this.row(0, 0, this.cols - 1, ch); this.row(this.rows - 1, 0, this.cols - 1, ch); this.col(0, 0, this.rows - 1, ch); this.col(this.cols - 1, 0, this.rows - 1, ch); return this; }
  /** Hollow room: walls of thickness 1 around the inside rect. */
  room(x0, y0, x1, y1, ch = '#') { this.row(y0, x0, x1, ch); this.row(y1, x0, x1, ch); this.col(x0, y0, y1, ch); this.col(x1, y0, y1, ch); return this; }
  /** Staircase going up-right (or up-left if dir=-1), each step `stepW` wide and 1 high. */
  stairs(x, floorY, steps, dir = 1, stepW = 2, ch = '#') {
    for (let i = 0; i < steps; i++) {
      const sx = x + dir * i * stepW;
      const x0 = dir > 0 ? sx : sx - stepW + 1;
      this.rect(x0, floorY - 1 - i, x0 + stepW - 1, floorY - 1, ch);
    }
    return this;
  }
  lines() { return this.g.map((r) => r.join('')); }
}
