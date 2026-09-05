// Draws the tile map and parallax background. Tiles are cached to an offscreen canvas per level.
import { TILE } from '../core/util.js';
import { T } from '../physics/tilemap.js';

export const THEMES = {
  house:   { bg1: '#F6E4C8', bg2: '#EFD2A6', wall: '#F0C98B', wallDark: '#D9A868', brick: '#C98C57', brickDark: '#A66D3E', mortar: '#E9C596', metal: '#5A6472', metalDark: '#3D444E', oneway: '#9A6B3E', ladder: '#8A5A2E', glass: 'rgba(170,215,240,0.55)', sky: ['#8EC5FC', '#E0C3FC'], accent: '#F28C4B' },
  lab:     { bg1: '#E4EBF2', bg2: '#CFD9E4', wall: '#E9EEF3', wallDark: '#C9D2DB', brick: '#9FB0C2', brickDark: '#7A8B9E', mortar: '#C7D3DF', metal: '#4B5563', metalDark: '#2F3742', oneway: '#7C8794', ladder: '#6E7A88', glass: 'rgba(170,215,240,0.55)', sky: ['#9BB8D4', '#DDE6EE'], accent: '#3D8BFF' },
  garden:  { bg1: '#DFF0D0', bg2: '#C8E2B4', wall: '#D9C7A3', wallDark: '#B8A47E', brick: '#B0885A', brickDark: '#8C6A40', mortar: '#D6BB92', metal: '#5A6472', metalDark: '#3D444E', oneway: '#8C6A40', ladder: '#7A5A2E', glass: 'rgba(170,215,240,0.55)', sky: ['#7EC8E3', '#FFF1C1'], accent: '#7ED37E' },
};

export class TileRenderer {
  constructor(map, theme = 'house') {
    this.map = map;
    this.theme = THEMES[theme] || THEMES.house;
    this.themeName = theme;
    this.canvas = null;
    this.bgCanvas = null;
    this.build();
  }

  build() {
    const map = this.map, th = this.theme;
    const c = document.createElement('canvas');
    c.width = map.width; c.height = map.height;
    const ctx = c.getContext('2d');
    // background wall pattern (behind everything, inside the level)
    for (let cy = 0; cy < map.rows; cy++) {
      for (let cx = 0; cx < map.cols; cx++) {
        const t = map.get(cx, cy);
        const x = cx * TILE, y = cy * TILE;
        if (t === T.SOLID) drawBrick(ctx, x, y, th, cx, cy, map);
        else if (t === T.METAL) drawMetal(ctx, x, y, th, cx, cy, map);
        else if (t === T.ONEWAY) drawOneWay(ctx, x, y, th);
        else if (t === T.LADDER) drawLadder(ctx, x, y, th);
        else if (t === T.GLASS) drawGlass(ctx, x, y, th);
        else if (t === T.GRATE) drawGrate(ctx, x, y, th);
        else if (t === T.BREAKABLE) drawBreakable(ctx, x, y, th, cx, cy, map);
      }
    }
    this.canvas = c;
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
    ctx.fillStyle = th.bg2;
    const s = 64;
    const ox = ((px2 % s) + s) % s, oy = ((py2 % s) + s) % s;
    for (let y = -s; y < h + s; y += s) for (let x = -s; x < w + s; x += s) {
      ctx.beginPath(); ctx.arc(x + ox + s / 2, y + oy + s / 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x + ox + 8, y + oy + 8, 3, 3); ctx.fillRect(x + ox + s - 11, y + oy + s - 11, 3, 3);
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
