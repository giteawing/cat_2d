// Vector sprites for the two guns. Drawn in "gun local" space: origin at the grip,
// +x = barrel direction. Both guns have distinct silhouettes and colours so it is
// always obvious which one the cat holds.
import { TAU } from '../core/util.js';

export const GUN_COLORS = {
  gravity: { body: '#4D5866', dark: '#2E3540', accent: '#FF8A1F', glow: '#FFB35A', claw: '#B8C2CC' },
  portal: { body: '#F2F2F5', dark: '#9AA0AE', accent: '#3D8BFF', accent2: '#FF8A2B', glow: '#8FC1FF', grip: '#3A3F4A' },
};

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/**
 * kind: 'gravity' | 'portal'
 * view: { charge (0..1), holding(bool), recoil(0..1), swapT (0..1 appear anim), lastColor }
 */
export function drawGun(ctx, kind, view, time) {
  const swap = view.swapT ?? 1;
  ctx.save();
  // appear animation: scale in & slight rotation
  const s = 0.5 + 0.5 * swap;
  ctx.scale(s, s);
  ctx.rotate((1 - swap) * 0.8);
  ctx.translate(-(view.recoil || 0) * 5, 0);
  if (kind === 'gravity') drawGravityGun(ctx, view, time);
  else drawPortalGun(ctx, view, time);
  ctx.restore();
}

function drawGravityGun(ctx, view, time) {
  const c = GUN_COLORS.gravity;
  const charge = view.charge || 0;
  const hold = view.holding ? 1 : 0;
  ctx.lineJoin = 'round';
  // grip
  ctx.fillStyle = c.dark; rr(ctx, -3, 0, 7, 11, 2.5); ctx.fill();
  // main body: chunky, angular, orange-accented
  ctx.fillStyle = c.body; rr(ctx, -6, -8, 24, 12, 3); ctx.fill();
  ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5; rr(ctx, -6, -8, 24, 12, 3); ctx.stroke();
  // orange stripe
  ctx.fillStyle = c.accent; rr(ctx, -4, -6.5, 20, 3, 1.5); ctx.fill();
  // rear canister
  ctx.fillStyle = c.dark; rr(ctx, -10, -6, 6, 9, 2); ctx.fill();
  // barrel with three claws
  ctx.fillStyle = c.body; rr(ctx, 16, -5, 8, 7, 2); ctx.fill(); ctx.strokeStyle = c.dark; ctx.stroke();
  const open = 0.35 + 0.5 * (1 - hold) + Math.sin(time * 10) * 0.05 * charge;
  ctx.strokeStyle = c.claw; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const side of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(22, -1.5 + side * 2.5);
    ctx.quadraticCurveTo(28, -1.5 + side * (5 + open * 5), 33, -1.5 + side * (3 + open * 3));
    ctx.stroke();
  }
  // energy core glow
  const g = 0.35 + 0.65 * Math.max(charge, hold) + Math.sin(time * 6) * 0.1;
  ctx.fillStyle = `rgba(255,150,40,${0.25 * g})`;
  ctx.beginPath(); ctx.arc(27, -1.5, 6 + g * 3, 0, TAU); ctx.fill();
  ctx.fillStyle = c.glow; ctx.globalAlpha = 0.5 + 0.5 * g;
  ctx.beginPath(); ctx.arc(27, -1.5, 2.5 + g * 1.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  // small light on body
  ctx.fillStyle = hold ? '#FFD36B' : '#7A8794'; ctx.beginPath(); ctx.arc(10, -1, 1.6, 0, TAU); ctx.fill();
}

function drawPortalGun(ctx, view, time) {
  const c = GUN_COLORS.portal;
  const col = view.lastColor === 'orange' ? c.accent2 : c.accent;
  ctx.lineJoin = 'round';
  // grip (dark, angled)
  ctx.fillStyle = c.grip; rr(ctx, -2, 0, 6, 11, 2.5); ctx.fill();
  // sleek white body: rounded, longer, thinner than the gravity gun
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-9, -9, -2, -9); ctx.lineTo(14, -9); ctx.quadraticCurveTo(22, -9, 26, -4);
  ctx.lineTo(26, 0); ctx.quadraticCurveTo(22, 4, 14, 4); ctx.lineTo(-2, 4); ctx.quadraticCurveTo(-9, 3, -8, -3); ctx.closePath();
  ctx.fill(); ctx.strokeStyle = c.dark; ctx.lineWidth = 1.4; ctx.stroke();
  // glowing tube along the top
  ctx.fillStyle = col; rr(ctx, 0, -7.5, 16, 2.5, 1.2); ctx.fill();
  // three prongs at the front
  ctx.strokeStyle = c.dark; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(31, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(25, -2); ctx.lineTo(32, -2.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 2); ctx.lineTo(31, 4); ctx.stroke();
  // muzzle glow (blue/orange depending on last shot); pulses
  const pulse = 0.6 + 0.4 * Math.sin(time * 5);
  const grad = ctx.createRadialGradient(28, -2, 0, 28, -2, 8);
  grad.addColorStop(0, col); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.45 * pulse; ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(28, -2, 8, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(28, -2, 2.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(27.3, -2.8, 0.9, 0, TAU); ctx.fill();
  // two indicator dots (blue / orange) on the body
  ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(6, -1, 1.7, 0, TAU); ctx.fill();
  ctx.fillStyle = c.accent2; ctx.beginPath(); ctx.arc(11, -1, 1.7, 0, TAU); ctx.fill();
}

/** HUD icon versions (bigger, unrotated). */
export function drawGunIcon(ctx, kind, x, y, scale, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawGun(ctx, kind, { swapT: 1, charge: 0, holding: false, lastColor: 'blue' }, time);
  ctx.restore();
}
