// Draws the tile map and parallax background. Tiles are cached to an offscreen canvas per level.
import { TILE } from '../core/util.js';
import { T } from '../physics/tilemap.js';

export const THEMES = {
  house:   { bg1: '#F6E4C8', bg2: '#EFD2A6', wall: '#F0C98B', wallDark: '#D9A868', brick: '#C98C57', brickDark: '#A66D3E', mortar: '#E9C596', metal: '#5A6472', metalDark: '#3D444E', oneway: '#9A6B3E', ladder: '#8A5A2E', glass: 'rgba(170,215,240,0.55)', sky: ['#8EC5FC', '#E0C3FC'], accent: '#F28C4B' },
  lab:     { bg1: '#E4EBF2', bg2: '#CFD9E4', wall: '#E9EEF3', wallDark: '#C9D2DB', brick: '#9FB0C2', brickDark: '#7A8B9E', mortar: '#C7D3DF', metal: '#4B5563', metalDark: '#2F3742', oneway: '#7C8794', ladder: '#6E7A88', glass: 'rgba(170,215,240,0.55)', sky: ['#9BB8D4', '#DDE6EE'], accent: '#3D8BFF' },
  observatory: { bg1: '#2B2F4A', bg2: '#3A3F60', wall: '#4A4F70', wallDark: '#33375A', brick: '#6A5A8A', brickDark: '#4C3F66', mortar: '#7C6E9C', metal: '#4B5563', metalDark: '#2F3742', oneway: '#8A7AAA', ladder: '#9A8AB8', glass: 'rgba(170,215,240,0.45)', sky: ['#0E1330', '#2A2050'], accent: '#FFD27A' },
  aquarium: { bg1: '#1E4F66', bg2: '#2A6580', wall: '#2F6E86', wallDark: '#1F4E60', brick: '#6FA3B4', brickDark: '#4E7D8C', mortar: '#8DBBC9', metal: '#4B5F6B', metalDark: '#2F3D45', oneway: '#8FB6A0', ladder: '#A6C4A0', glass: 'rgba(170,225,240,0.45)', sky: ['#0B2A3A', '#1F6F86'], accent: '#5FD3C4' },
  garden:  { bg1: '#DFF0D0', bg2: '#C8E2B4', wall: '#D9C7A3', wallDark: '#B8A47E', brick: '#B0885A', brickDark: '#8C6A40', mortar: '#D6BB92', metal: '#5A6472', metalDark: '#3D444E', oneway: '#8C6A40', ladder: '#7A5A2E', glass: 'rgba(170,215,240,0.55)', sky: ['#7EC8E3', '#FFF1C1'], accent: '#7ED37E' },
};

export class TileRenderer {
  constructor(map, theme = 'house') {
    this.map = map;
    this.theme = THEMES[theme] || THEMES.house;
    this.themeName = theme;
    this.canvas = null;
    this.bgCanvas = null;
    this.wallpaper = null;      // cached CanvasPattern for the parallax wallpaper
    this.build();
  }

  build() {
    const map = this.map;
    const c = document.createElement('canvas');
    c.width = map.width; c.height = map.height;
    this.canvas = c;
    this.drawRegion(c.getContext('2d'), 0, 0, map.cols - 1, map.rows - 1);
  }

  /** Redraw only the tiles in [x0..x1]×[y0..y1] (inclusive) into the cache. */
  drawRegion(ctx, x0, y0, x1, y1) {
    const map = this.map, th = this.theme;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(map.cols - 1, x1); y1 = Math.min(map.rows - 1, y1);
    ctx.clearRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const t = map.get(cx, cy);
        const x = cx * TILE, y = cy * TILE;
        if (t === T.SOLID) drawBrick(ctx, x, y, th, cx, cy, map);
        else if (t === T.METAL) drawMetal(ctx, x, y, th, cx, cy, map);
        else if (t === T.ONEWAY) drawOneWay(ctx, x, y, th);
        else if (t === T.LADDER) drawLadder(ctx, x, y, th);
        else if (t === T.GLASS) drawGlass(ctx, x, y, th);
        else if (t === T.GRATE) drawGrate(ctx, x, y, th);
        else if (t === T.BREAKABLE) drawBreakable(ctx, x, y, th, cx, cy, map);
        else if (t === T.EFIELD) drawFieldEmitters(ctx, x, y, th, cx, cy, map);
      }
    }
  }

  /**
   * Incremental update after a few tiles changed (a gate toggled, a wall broke): repaints just those cells plus a
   * one-tile margin (brick edges and field emitter caps depend on their neighbours). Much cheaper than build() on
   * 150×36 maps. `cells` = iterable of [cx, cy].
   */
  updateCells(cells) {
    if (!this.canvas) return this.build();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [cx, cy] of cells) { x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy); }
    if (x0 === Infinity) return;
    this.drawRegion(this.canvas.getContext('2d'), x0 - 1, y0 - 1, x1 + 1, y1 + 1);
  }

  drawBackground(ctx, cam, w, h, time) {
    const th = this.theme;
    // sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // parallax layer 1: distant shapes (hills / shelves)
    ctx.save();
    const px1 = -cam.x * 0.2, py1 = -cam.y * 0.1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = -2; i < w / 180 + 3; i++) {
      const bx = ((i * 180 + px1) % (w + 360) + w + 360) % (w + 360) - 180;
      const r = 70 + (i % 3) * 25;
      ctx.beginPath(); ctx.arc(bx, h * 0.75 + py1 * 0.5 + (i % 2) * 30, r, 0, Math.PI * 2); ctx.fill();
    }
    // parallax layer 2: wallpaper pattern
    const px2 = -cam.x * 0.5, py2 = -cam.y * 0.5;
    ctx.fillStyle = th.bg1;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    // wallpaper motif: one 64×64 cell rendered once into a repeating pattern (a few hundred arcs per frame otherwise)
    const s = 64;
    if (!this.wallpaper) {
      const pc = document.createElement('canvas'); pc.width = s; pc.height = s; const p = pc.getContext('2d');
      p.fillStyle = th.bg2; p.beginPath(); p.arc(s / 2, s / 2, 5, 0, Math.PI * 2); p.fill();
      p.fillRect(8, 8, 3, 3); p.fillRect(s - 11, s - 11, 3, 3);
      this.wallpaper = ctx.createPattern(pc, 'repeat');
    }
    const ox = ((px2 % s) + s) % s, oy = ((py2 % s) + s) % s;
    ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = this.wallpaper; ctx.fillRect(-s, -s, w + 2 * s, h + 2 * s); ctx.restore();
    // stars & a moon for the night observatory
    if (this.themeName === 'observatory') {
      for (let i = 0; i < 70; i++) {
        const sx = ((i * 233 + px1 * 0.6) % (w + 40) + w + 40) % (w + 40) - 20;
        const sy = ((i * 149 + py1 * 0.6) % (h + 40) + h + 40) % (h + 40) - 20;
        const tw = 0.5 + 0.5 * Math.sin(time * (1.5 + (i % 5) * 0.4) + i);
        ctx.fillStyle = `rgba(255,245,220,${0.35 + 0.5 * tw})`;
        const r = 1 + (i % 3) * 0.6; ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
      }
      const mx = w * 0.78 + px1 * 0.3, my = h * 0.22 + py1 * 0.3;
      ctx.fillStyle = '#FFF1C8'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.sky[0]; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(mx - 14, my - 8, 30, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // deep-sea aquarium: slow rising bubbles and light shafts from above
    if (this.themeName === 'aquarium') {
      for (let i = 0; i < 6; i++) {
        const sx = ((i * 211 + px1 * 0.8) % (w + 200) + w + 200) % (w + 200) - 100;
        ctx.fillStyle = 'rgba(200,240,255,0.06)'; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 60, 0); ctx.lineTo(sx + 160 + Math.sin(time * 0.3 + i) * 20, h); ctx.lineTo(sx + 40, h); ctx.closePath(); ctx.fill();
      }
      for (let i = 0; i < 40; i++) {
        const bx = ((i * 173 + px2 * 0.9) % (w + 60) + w + 60) % (w + 60) - 30 + Math.sin(time * 1.2 + i) * 4;
        const by = ((i * 97 - time * (18 + (i % 4) * 8) + py2 * 0.9) % (h + 40) + h + 40) % (h + 40) - 20;
        ctx.strokeStyle = 'rgba(220,245,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 1.5 + (i % 3), 0, Math.PI * 2); ctx.stroke();
      }
    }
    // balloons / confetti accents for the house theme
    if (this.themeName === 'house') {
      for (let i = 0; i < 12; i++) {
        const bx = ((i * 197 + px2 * 1.1) % (w + 200) + w + 200) % (w + 200) - 100;
        const by = ((i * 131 + py2 * 1.1 + time * 6) % (h + 200) + h + 200) % (h + 200) - 100;
        ctx.fillStyle = ['rgba(242,140,75,0.25)', 'rgba(91,192,222,0.25)', 'rgba(240,106,138,0.25)', 'rgba(155,107,224,0.25)'][i % 4];
        ctx.fillRect(bx, by, 6, 10);
      }
    }
    ctx.restore();
  }

  drawTiles(ctx, cam, w, h) {
    ctx.drawImage(this.canvas, cam.x, cam.y, w, h, cam.x, cam.y, w, h);
  }
}

/** Static part of a potential-barrier (field) tile: emitter caps where the field meets a solid wall/floor/ceiling. */
function drawFieldEmitters(ctx, x, y, th, cx, cy, map) {
  const cap = (nx, ny) => {
    ctx.fillStyle = th.metalDark;
    if (ny < 0) ctx.fillRect(x + 2, y, TILE - 4, 6); else if (ny > 0) ctx.fillRect(x + 2, y + TILE - 6, TILE - 4, 6);
    else if (nx < 0) ctx.fillRect(x, y + 2, 6, TILE - 4); else ctx.fillRect(x + TILE - 6, y + 2, 6, TILE - 4);
    ctx.fillStyle = '#7FD3FF';
    if (ny < 0) ctx.fillRect(x + 8, y + 2, TILE - 16, 2); else if (ny > 0) ctx.fillRect(x + 8, y + TILE - 4, TILE - 16, 2);
    else if (nx < 0) ctx.fillRect(x + 2, y + 8, 2, TILE - 16); else ctx.fillRect(x + TILE - 4, y + 8, 2, TILE - 16);
  };
  const solidNotField = (a, b) => { const t = map.get(a, b); return map.isSolid(t) && t !== T.EFIELD; };
  if (solidNotField(cx, cy - 1)) cap(0, -1);
  if (solidNotField(cx, cy + 1)) cap(0, 1);
  if (solidNotField(cx - 1, cy)) cap(-1, 0);
  if (solidNotField(cx + 1, cy)) cap(1, 0);
}

/** Animated electric-field glow and arcs. Drawn every frame over the tile cache for field tiles in view. */
export function drawFields(ctx, map, cam, time) {
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(map.cols - 1, Math.floor((cam.x + cam.w) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1), y1 = Math.min(map.rows - 1, Math.floor((cam.y + cam.h) / TILE) + 1);
  let any = false;
  for (let cy = y0; cy <= y1 && !any; cy++) for (let cx = x0; cx <= x1; cx++) if (map.get(cx, cy) === T.EFIELD) { any = true; break; }
  if (!any) return;
  ctx.save();
  const pulse = 0.75 + 0.25 * Math.sin(time * 9);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (map.get(cx, cy) !== T.EFIELD) continue;
      const x = cx * TILE, y = cy * TILE;
      const f = (a, b) => (map.get(a, b) === T.EFIELD ? 1 : 0);
      const vertical = f(cx, cy - 1) + f(cx, cy + 1) >= f(cx - 1, cy) + f(cx + 1, cy);   // arcs run along the field's long axis
      // translucent glow body
      ctx.fillStyle = `rgba(110,200,255,${0.16 + 0.08 * pulse})`;
      if (vertical) ctx.fillRect(x + 6, y, TILE - 12, TILE); else ctx.fillRect(x, y + 6, TILE, TILE - 12);
      ctx.fillStyle = `rgba(200,240,255,${0.10 + 0.08 * pulse})`;
      if (vertical) ctx.fillRect(x + 12, y, TILE - 24, TILE); else ctx.fillRect(x, y + 12, TILE, TILE - 24);
      // crackling arcs (pseudo-random per tile & time slice)
      const seed = (cx * 73 + cy * 151) % 97;
      const tslice = Math.floor(time * 14);
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 2; k++) {
        const r = hash(seed + k * 31 + tslice * 7);
        ctx.strokeStyle = k ? 'rgba(255,255,255,0.85)' : 'rgba(120,215,255,0.9)';
        ctx.beginPath();
        if (vertical) {
          const bx = x + TILE / 2;
          ctx.moveTo(bx + (r - 0.5) * 10, y);
          for (let i = 1; i <= 4; i++) { const rr = hash(seed + k * 13 + tslice * 3 + i * 17); ctx.lineTo(bx + (rr - 0.5) * 16, y + i * TILE / 4); }
        } else {
          const by = y + TILE / 2;
          ctx.moveTo(x, by + (r - 0.5) * 10);
          for (let i = 1; i <= 4; i++) { const rr = hash(seed + k * 13 + tslice * 3 + i * 17); ctx.lineTo(x + i * TILE / 4, by + (rr - 0.5) * 16); }
        }
        ctx.stroke();
      }
      // drifting sparks
      const sp = hash(seed + tslice * 5);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      if (vertical) ctx.fillRect(x + TILE / 2 - 1 + (sp - 0.5) * 12, y + ((time * 60 + seed * 3) % TILE), 2, 2);
      else ctx.fillRect(x + ((time * 60 + seed * 3) % TILE), y + TILE / 2 - 1 + (sp - 0.5) * 12, 2, 2);
    }
  }
  ctx.restore();
}
function hash(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

function drawBrick(ctx, x, y, th, cx, cy, map) {
  ctx.fillStyle = th.brick; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = th.mortar;
  // brick pattern: two rows per tile, offset on odd rows
  const rowH = TILE / 2;
  for (let r = 0; r < 2; r++) {
    const yy = y + r * rowH;
    ctx.fillRect(x, yy, TILE, 2);
    const off = ((cy * 2 + r) % 2) * (TILE / 2);
    ctx.fillRect(x + ((off + 0) % TILE), yy, 2, rowH);
  }
  ctx.fillStyle = th.brickDark;
  ctx.fillRect(x + 4, y + 6, 8, 2); ctx.fillRect(x + 20, y + 22, 7, 2);
  // top edge highlight if open above
  if (!map.solidAt(cx, cy - 1)) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, TILE, 3); }
  if (!map.solidAt(cx, cy + 1)) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x, y + TILE - 3, TILE, 3); }
  if (!map.solidAt(cx - 1, cy)) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, 2, TILE); }
  if (!map.solidAt(cx + 1, cy)) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + TILE - 2, y, 2, TILE); }
}

function drawMetal(ctx, x, y, th, cx, cy, map) {
  ctx.fillStyle = th.metal; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = th.metalDark;
  ctx.fillRect(x, y, TILE, 1); ctx.fillRect(x, y, 1, TILE);
  ctx.fillRect(x + 3, y + 3, 2, 2); ctx.fillRect(x + TILE - 5, y + 3, 2, 2); ctx.fillRect(x + 3, y + TILE - 5, 2, 2); ctx.fillRect(x + TILE - 5, y + TILE - 5, 2, 2);
  // hazard-ish diagonal to signal "no portals here"
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 8, y + TILE - 6); ctx.lineTo(x + TILE - 6, y + 8); ctx.stroke();
  if (!map.solidAt(cx, cy - 1)) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, TILE, 2); }
}

function drawOneWay(ctx, x, y, th) {
  ctx.fillStyle = th.oneway; ctx.fillRect(x, y, TILE, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, TILE, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 6, TILE, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 4, y + 8, 3, 5); ctx.fillRect(x + TILE - 7, y + 8, 3, 5);
}

function drawLadder(ctx, x, y, th) {
  ctx.fillStyle = th.ladder;
  ctx.fillRect(x + 6, y, 4, TILE); ctx.fillRect(x + TILE - 10, y, 4, TILE);
  ctx.fillRect(x + 6, y + 6, TILE - 12, 3); ctx.fillRect(x + 6, y + 20, TILE - 12, 3);
}

function drawGlass(ctx, x, y, th) {
  ctx.fillStyle = th.glass; ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 4, y + 4, 4, TILE - 12);
}

function drawGrate(ctx, x, y, th) {
  ctx.fillStyle = 'rgba(60,66,76,0.25)'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = th.metalDark;
  ctx.fillRect(x, y, TILE, 3); ctx.fillRect(x, y + TILE - 3, TILE, 3);
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 8, y, 3, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 8, y, 1, TILE);
}

function drawBreakable(ctx, x, y, th, cx, cy, map) {
  ctx.fillStyle = '#B9A08A'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#D8C4AE';
  ctx.fillRect(x, y, TILE, 2); ctx.fillRect(x, y + 16, TILE, 2); ctx.fillRect(x + ((cy % 2) * 16), y, 2, 16); ctx.fillRect(x + (((cy + 1) % 2) * 16), y + 16, 2, 16);
  // cracks
  ctx.strokeStyle = '#6E5A48'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 14, y + 13); ctx.lineTo(x + 10, y + 20); ctx.lineTo(x + 19, y + 29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 22, y + 6); ctx.lineTo(x + 26, y + 14); ctx.lineTo(x + 20, y + 18); ctx.stroke();
  if (!map.solidAt(cx, cy - 1)) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, TILE, 3); }
}
