// Gifts: the main collectible. Types: normal, big, rare, secret, bonus.
import { TAU } from '../core/util.js';

export const GIFT_TYPES = {
  normal: { w: 24, h: 22, box: '#5BC0DE', ribbon: '#F28C4B', points: 1, label: 'Подарок' },
  big:    { w: 34, h: 32, box: '#F06A8A', ribbon: '#F7D64B', points: 1, label: 'Большой подарок' },
  rare:   { w: 26, h: 24, box: '#9B6BE0', ribbon: '#FFE56B', points: 1, label: 'Редкий подарок' },
  secret: { w: 26, h: 24, box: '#3FBF8C', ribbon: '#FFFFFF', points: 1, label: 'Секретный подарок' },
  bonus:  { w: 22, h: 20, box: '#FFD34D', ribbon: '#F0507A', points: 1, label: 'Бонусный подарок' },
};

export class Gift {
  constructor(x, y, type = 'normal', id = null) {
    const t = GIFT_TYPES[type] || GIFT_TYPES.normal;
    this.type = type; this.def = t;
    this.x = x; this.y = y; this.w = t.w; this.h = t.h;
    this.id = id;
    this.collected = false;
    this.anim = 0;
    this.phase = Math.random() * TAU;
    this.pop = 0;
  }
  update(dt, game) {
    if (this.collected) { this.pop += dt; return; }
    const bob = Math.sin(game.time * 2 + this.phase) * 3;
    for (const cat of (game.players || [game.player])) {   // either cat may pick it up (shared collection)
      if (!cat) continue;
      const p = cat.body;
      if (p.x < this.x + this.w && p.right > this.x && p.y < this.y + this.h + bob && p.bottom > this.y + bob) {
        this.collected = true;
        game.onGiftCollected(this, cat);
        return;
      }
    }
  }
  draw(ctx, time) {
    if (this.collected) {
      if (this.pop > 0.6) return;
      const s = 1 + this.pop * 2; ctx.globalAlpha = 1 - this.pop / 0.6;
      ctx.save(); ctx.translate(this.x + this.w / 2, this.y + this.h / 2); ctx.scale(s, s);
      drawGiftBox(ctx, -this.w / 2, -this.h / 2, this.w, this.h, this.def, time);
      ctx.restore(); ctx.globalAlpha = 1;
      return;
    }
    const bob = Math.sin(time * 2 + this.phase) * 3;
    // glow
    ctx.fillStyle = 'rgba(255,240,180,0.18)';
    ctx.beginPath(); ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2 + bob, this.w, this.h * 0.9, 0, 0, TAU); ctx.fill();
    drawGiftBox(ctx, this.x, this.y + bob, this.w, this.h, this.def, time);
    // sparkles
    for (let i = 0; i < 2; i++) {
      const a = time * 2 + i * Math.PI + this.phase;
      const sx = this.x + this.w / 2 + Math.cos(a) * (this.w * 0.8), sy = this.y + this.h / 2 + bob + Math.sin(a * 1.3) * (this.h * 0.7);
      ctx.fillStyle = '#FFF4B0'; ctx.beginPath(); ctx.arc(sx, sy, 1.6 + Math.sin(time * 6 + i) * 0.8, 0, TAU); ctx.fill();
    }
  }
}

export function drawGiftBox(ctx, x, y, w, h, def, time) {
  const lidH = h * 0.3;
  // box
  ctx.fillStyle = def.box; ctx.fillRect(x, y + lidH - 2, w, h - lidH + 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, y + h - 4, w, 4);
  // lid
  ctx.fillStyle = shade(def.box, 1.12); ctx.fillRect(x - 2, y, w + 4, lidH);
  // ribbon
  ctx.fillStyle = def.ribbon;
  ctx.fillRect(x + w / 2 - 3, y, 6, h);
  ctx.fillRect(x - 2, y + lidH / 2 - 2, w + 4, 4);
  // bow
  ctx.beginPath(); ctx.ellipse(x + w / 2 - 5, y - 3, 5, 3.5, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + w / 2 + 5, y - 3, 5, 3.5, 0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(def.ribbon, 0.8); ctx.beginPath(); ctx.arc(x + w / 2, y - 2, 2.2, 0, TAU); ctx.fill();
  // outline
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 2, y, w + 4, lidH); ctx.strokeRect(x, y + lidH, w, h - lidH);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 3, y + lidH + 3, 3, h - lidH - 7);
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
