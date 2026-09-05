// Portal visuals: an oval ring on the surface, swirling inner glow, particles.
import { TAU } from '../core/util.js';
import { PORTAL_HALF, PORTAL_DEPTH } from './portalManager.js';

export const PORTAL_COLORS = {
  blue: { main: '#3D8BFF', light: '#9CC7FF', dark: '#1B4FA8' },
  orange: { main: '#FF8A2B', light: '#FFC48A', dark: '#B0521A' },
};

export function drawPortal(ctx, p, time, linked) {
  if (!p.active) return;
  const c = PORTAL_COLORS[p.color];
  const open = p.openT;
  const ang = Math.atan2(p.ny, p.nx);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);   // now +x = normal (out of the wall), +y = tangent
  const rl = PORTAL_HALF * open;   // half length along tangent (y)
  const rd = PORTAL_DEPTH * 0.5 * open + 2;
  // outer glow
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, rl + 18);
  g.addColorStop(0, hexA(c.light, 0.35)); g.addColorStop(1, hexA(c.main, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(2, 0, rd + 16, rl + 16, 0, 0, TAU); ctx.fill();
  // dark inner (void)
  ctx.fillStyle = linked ? '#0B0E1A' : '#2A2E44';
  ctx.beginPath(); ctx.ellipse(-3, 0, rd + 3, rl - 2, 0, 0, TAU); ctx.fill();
  // swirl
  if (linked) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(-3, 0, rd + 3, rl - 2, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 4; i++) {
      const t = (time * 0.8 + i / 4) % 1;
      ctx.strokeStyle = hexA(c.light, 0.35 * (1 - t));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-3, 0, (rd + 3) * t, (rl - 2) * t, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // ring
  ctx.lineWidth = 4; ctx.strokeStyle = c.main;
  ctx.beginPath(); ctx.ellipse(0, 0, rd + 2, rl, 0, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = c.light;
  ctx.beginPath(); ctx.ellipse(1, 0, rd + 1, rl - 3, 0, 0, TAU); ctx.stroke();
  // orbiting sparkles
  for (let i = 0; i < 3; i++) {
    const a = time * 3 + i * (TAU / 3);
    const sx = Math.cos(a) * (rd + 3), sy = Math.sin(a) * rl;
    ctx.fillStyle = c.light; ctx.beginPath(); ctx.arc(sx + 1, sy, 1.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/** Ghost preview drawn where the portal would land (helps aiming). */
export function drawPortalPreview(ctx, x, y, nx, ny, color, ok) {
  const c = PORTAL_COLORS[color];
  ctx.save();
  ctx.translate(x, y); ctx.rotate(Math.atan2(ny, nx));
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 2; ctx.strokeStyle = ok ? c.main : '#E05555';
  ctx.beginPath(); ctx.ellipse(0, 0, PORTAL_DEPTH * 0.5 + 2, PORTAL_HALF, 0, 0, TAU); ctx.stroke();
  if (!ok) { ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, 8); ctx.moveTo(8, -8); ctx.lineTo(-8, 8); ctx.stroke(); }
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
