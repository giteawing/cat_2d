// Catalogue of physics props: crates, boxes, barrels and lots of household clutter
// that exists purely for fun. Each entry defines size, mass, material and a drawing routine.
import { TAU, seededRandom } from '../core/util.js';
import { Body, BodyType } from './body.js';

const rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

export const PROPS = {
  // ---- puzzle objects ----
  crate:   { w: 32, h: 32, mass: 3, friction: 0.7, bounce: 0.05, material: 'wood', portalable: true, colors: ['#B07A3E'] },
  bigCrate:{ w: 48, h: 48, mass: 7, friction: 0.8, bounce: 0.02, material: 'wood', portalable: true, colors: ['#9C6A32'] },
  cube:    { w: 30, h: 30, mass: 3, friction: 0.7, bounce: 0.05, material: 'metal', portalable: true, colors: ['#8FA3B8'] },
  barrel:  { w: 30, h: 40, mass: 5, friction: 0.55, bounce: 0.08, material: 'metal', portalable: true, colors: ['#5D7CA6', '#A65D5D'] },
  metalBox:{ w: 28, h: 28, mass: 4, friction: 0.65, bounce: 0.05, material: 'metal', portalable: true, colors: ['#6B7A8C'] },
  mirror:  { w: 32, h: 32, mass: 3, friction: 0.8, bounce: 0.02, material: 'metal', portalable: true, colors: ['#DDE8F2'] },   // reflects lasers 90° (facing = mirror diagonal)
  // ---- fun clutter ----
  box:     { w: 26, h: 22, mass: 1.2, friction: 0.7, bounce: 0.05, material: 'wood', colors: ['#C9A46A', '#D7B37A', '#B8935A'] },
  smallBox:{ w: 18, h: 16, mass: 0.6, friction: 0.7, bounce: 0.08, material: 'wood', colors: ['#D7B37A', '#E0C08C'] },
  book:    { w: 22, h: 8, mass: 0.5, friction: 0.8, bounce: 0.02, material: 'soft', colors: ['#C94B4B', '#4B6FC9', '#4BA36A', '#8B5CB8', '#E0A040'] },
  bookUp:  { w: 8, h: 22, mass: 0.5, friction: 0.8, bounce: 0.02, material: 'soft', colors: ['#C94B4B', '#4B6FC9', '#4BA36A', '#8B5CB8'] },
  cup:     { w: 12, h: 12, mass: 0.25, friction: 0.5, bounce: 0.15, material: 'ceramic', breakable: true, colors: ['#FFFFFF', '#F7D6E0', '#CFE8F5', '#FFE9A8'] },
  plate:   { w: 18, h: 5, mass: 0.3, friction: 0.5, bounce: 0.1, material: 'ceramic', breakable: true, colors: ['#FFFFFF', '#EAF4FF'] },
  pot:     { w: 22, h: 14, mass: 1.2, friction: 0.5, bounce: 0.15, material: 'metal', colors: ['#8C949C', '#B03A3A'] },
  bottle:  { w: 8, h: 22, mass: 0.35, friction: 0.4, bounce: 0.1, material: 'glass', breakable: true, colors: ['#5AA86A', '#4A7BC9', '#C9A24A'] },
  can:     { w: 10, h: 14, mass: 0.3, friction: 0.4, bounce: 0.25, material: 'metal', colors: ['#D94F4F', '#4F8ED9', '#E0C24A'] },
  ball:    { w: 18, h: 18, mass: 0.5, friction: 0.2, bounce: 0.75, material: 'soft', rolls: true, colors: ['#F25C5C', '#F2B84B', '#5CB8F2'] },
  bigBall: { w: 30, h: 30, mass: 0.9, friction: 0.2, bounce: 0.7, material: 'soft', rolls: true, colors: ['#5C8CF2', '#F25CA2'] },
  toyCube: { w: 14, h: 14, mass: 0.4, friction: 0.7, bounce: 0.15, material: 'wood', colors: ['#F25C5C', '#5CB85C', '#5C8CF2', '#F2C14B'] },
  pillow:  { w: 26, h: 14, mass: 0.4, friction: 0.9, bounce: 0.3, material: 'soft', colors: ['#F2A0B8', '#A0C8F2', '#F2E0A0'] },
  plant:   { w: 20, h: 28, mass: 1.5, friction: 0.7, bounce: 0.05, material: 'ceramic', breakable: true, colors: ['#C96A3A'] },
  lamp:    { w: 16, h: 30, mass: 1.0, friction: 0.6, bounce: 0.05, material: 'metal', colors: ['#F2D06B'] },
  stool:   { w: 22, h: 20, mass: 1.6, friction: 0.7, bounce: 0.05, material: 'wood', colors: ['#A8763E'] },
  figurine:{ w: 10, h: 18, mass: 0.35, friction: 0.6, bounce: 0.05, material: 'ceramic', breakable: true, colors: ['#E8D9C0'] },
  wrench:  { w: 20, h: 6, mass: 0.6, friction: 0.6, bounce: 0.1, material: 'metal', colors: ['#9AA5B1'] },
  jar:     { w: 12, h: 14, mass: 0.4, friction: 0.5, bounce: 0.1, material: 'glass', breakable: true, colors: ['#CFE8F5', '#F5E1CF'] },
  teddy:   { w: 18, h: 22, mass: 0.5, friction: 0.9, bounce: 0.2, material: 'soft', colors: ['#B98A5A', '#D9B3A0'] },
  yarn:    { w: 14, h: 14, mass: 0.25, friction: 0.5, bounce: 0.4, material: 'soft', rolls: true, colors: ['#F26B9A', '#6BC9F2', '#F2D06B'] },
  giftBox: { w: 20, h: 18, mass: 0.7, friction: 0.7, bounce: 0.1, material: 'wood', colors: ['#5BC0DE', '#F06A8A', '#9B6BE0', '#FFD34D'] },
  tire:    { w: 26, h: 26, mass: 2.0, friction: 0.5, bounce: 0.5, material: 'soft', rolls: true, colors: ['#333940'] },
};

let propSeed = 1;
export function makeProp(kind, x, y, opts = {}) {
  const d = PROPS[kind];
  if (!d) throw new Error('unknown prop ' + kind);
  const rnd = seededRandom(propSeed++ * 7919 + Math.floor(x) * 31 + Math.floor(y));
  const color = opts.color || d.colors[Math.floor(rnd() * d.colors.length)];
  const b = new Body({
    type: BodyType.DYNAMIC, x, y: y - d.h, w: d.w, h: d.h, mass: d.mass, friction: d.friction, bounce: d.bounce,
    grabbable: opts.grabbable ?? true, portalable: opts.portalable ?? d.portalable ?? true, breakable: opts.breakable ?? !!d.breakable, rolls: !!d.rolls,
    kind, color, maxSpeed: 1500,
  });
  b.material = d.material;
  b.variant = Math.floor(rnd() * 4);
  b.breakSpeed = opts.breakSpeed || 520;
  b.tag = opts.tag || '';
  if (kind === 'mirror') { b.mirrorDir = opts.dir || 1; b.rolls = false; }
  return b;
}

// ------------------------------------------------------------------ drawing
export function drawProp(ctx, b, time) {
  ctx.save();
  ctx.translate(b.cx, b.cy);
  if (b.angle) ctx.rotate(b.angle);
  const x = -b.w / 2, y = -b.h / 2, w = b.w, h = b.h;
  const c = b.color;
  const dark = shade(c, 0.72), light = shade(c, 1.2);
  ctx.lineJoin = 'round';
  switch (b.kind) {
    case 'mirror': {
      // a metal cube with a diagonal mirror; b.mirrorDir = +1 → '/' , -1 → '\\' (flip with E while held / on hit)
      ctx.fillStyle = '#6B7A8C'; rr(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = '#3D4854'; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, 3); ctx.stroke();
      const dir = b.mirrorDir || 1;
      ctx.save(); ctx.beginPath(); rr(ctx, x + 3, y + 3, w - 6, h - 6, 2); ctx.clip();
      ctx.fillStyle = '#2B3540';
      ctx.beginPath(); if (dir > 0) { ctx.moveTo(x, y + h); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); } else { ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); } ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#EAF6FF'; ctx.lineWidth = 3; ctx.beginPath();
      if (dir > 0) { ctx.moveTo(x + 4, y + h - 4); ctx.lineTo(x + w - 4, y + 4); } else { ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + h - 4); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,200,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath();
      if (dir > 0) { ctx.moveTo(x + 6, y + h - 8); ctx.lineTo(x + w - 8, y + 6); } else { ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + w - 8, y + h - 6); }
      ctx.stroke();
      if (b.laserLit) { ctx.shadowColor = '#FF6060'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(255,120,120,0.8)'; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, 3); ctx.stroke(); }
      break;
    }
    case 'crate': case 'bigCrate': case 'box': case 'smallBox': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 3); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, 2); ctx.stroke();
      if (b.kind === 'crate' || b.kind === 'bigCrate') {
        ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3); ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3); ctx.stroke();
        ctx.fillStyle = light; ctx.fillRect(x + 3, y + 3, w - 6, 2);
      } else {
        ctx.fillStyle = dark; ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 3, y + 2, w - 6, 2);
      }
      break;
    }
    case 'cube': {
      // weighted companion-style cube
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 5); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2.5; rr(ctx, x + 2, y + 2, w - 4, h - 4, 4); ctx.stroke();
      ctx.fillStyle = '#F2A0B8'; ctx.beginPath(); ctx.arc(0, 0, w * 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = light; ctx.fillRect(x + 4, y + 4, w - 8, 2);
      break;
    }
    case 'metalBox': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, 1); ctx.stroke();
      ctx.fillStyle = dark; for (const [px, py] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) ctx.fillRect(px, py, 2, 2);
      ctx.fillStyle = light; ctx.fillRect(x + 4, y + h / 2 - 1, w - 8, 2);
      break;
    }
    case 'barrel': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 6); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x, y + 6, w, 3); ctx.fillRect(x, y + h - 9, w, 3);
      ctx.fillStyle = light; ctx.fillRect(x + 4, y + 10, 3, h - 20);
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.stroke();
      break;
    }
    case 'book': case 'bookUp': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 1.5); ctx.fill();
      ctx.fillStyle = '#F5EBD8';
      if (b.kind === 'book') ctx.fillRect(x + 2, y + 1.5, w - 3, h - 3); else ctx.fillRect(x + 1.5, y + 2, w - 3, h - 3);
      ctx.fillStyle = c; if (b.kind === 'book') ctx.fillRect(x, y, 3, h); else ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = dark; if (b.kind === 'book') ctx.fillRect(x + 6, y + 2, 1, h - 4); else ctx.fillRect(x + 2, y + 6, w - 4, 1);
      break;
    }
    case 'cup': {
      ctx.fillStyle = c; rr(ctx, x, y, w - 3, h, 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; rr(ctx, x + 0.5, y + 0.5, w - 4, h - 1, 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w - 3, y + h / 2, 3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = ['#F26B6B', '#6BA8F2', '#6BC96B'][b.variant % 3]; ctx.fillRect(x + 2, y + 4, w - 7, 3);
      break;
    }
    case 'plate': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#B7CBE0'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#6BA8F2'; ctx.fillRect(x + 4, -0.5, w - 8, 1);
      break;
    }
    case 'pot': {
      ctx.fillStyle = c; rr(ctx, x, y + 3, w, h - 3, 3); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x - 3, y + 6, 3, 3); ctx.fillRect(x + w, y + 6, 3, 3);
      ctx.fillStyle = light; ctx.fillRect(x - 1, y, w + 2, 3);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, y + 1, 2, 0, TAU); ctx.fill();
      break;
    }
    case 'bottle': {
      ctx.fillStyle = c; rr(ctx, x, y + 6, w, h - 6, 3); ctx.fill();
      ctx.fillRect(x + 2, y, w - 4, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 1.5, y + 8, 1.5, h - 12);
      ctx.fillStyle = '#EEE'; ctx.fillRect(x + 1.5, y + 10, w - 3, 5);
      break;
    }
    case 'can': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 1.5); ctx.fill();
      ctx.fillStyle = '#C9CED4'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 2, y + 4, 2, h - 8);
      break;
    }
    case 'ball': case 'bigBall': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, TAU); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(-w * 0.15, -w * 0.15, w * 0.15, 0, TAU); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w / 2 - 1, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, 0); ctx.quadraticCurveTo(0, w * 0.35, w / 2 - 2, 0); ctx.stroke();
      break;
    }
    case 'yarn': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, w / 2 - 1, w / 4, i * 1.0, 0, TAU); ctx.stroke(); }
      break;
    }
    case 'tire': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8C949C'; ctx.beginPath(); ctx.arc(0, 0, w * 0.22, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#555c66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w / 2 - 3, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#555c66'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.fillRect(Math.cos(a) * (w / 2 - 2) - 1, Math.sin(a) * (w / 2 - 2) - 1, 2, 2); }
      break;
    }
    case 'toyCube': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 3); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; rr(ctx, x + 1, y + 1, w - 2, h - 2, 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ABCD'[b.variant % 4], 0, 0.5);
      break;
    }
    case 'pillow': {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 6); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; rr(ctx, x + 1, y + 1, w - 2, h - 2, 5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(ctx, x + 5, y + 3, w - 10, 3, 1.5); ctx.fill();
      break;
    }
    case 'plant': {
      // pot at bottom, leaves at top
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 2, y + h - 14); ctx.lineTo(x + w - 2, y + h - 14); ctx.lineTo(x + w - 5, y + h); ctx.lineTo(x + 5, y + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x + 1, y + h - 15, w - 2, 3);
      ctx.fillStyle = '#4BA36A';
      for (const [lx, ly, r] of [[-5, -8, 6], [5, -9, 6], [0, -3, 6], [0, -12, 5]]) { ctx.beginPath(); ctx.ellipse(lx, ly, r, r * 0.7, lx * 0.1, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#6BCF8A'; ctx.beginPath(); ctx.ellipse(-4, -9, 2.5, 1.5, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'lamp': {
      ctx.fillStyle = '#6B7380'; ctx.fillRect(x + w / 2 - 1.5, y + 10, 3, h - 13); ctx.fillRect(x + 2, y + h - 3, w - 4, 3);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 3, y + 12); ctx.lineTo(x + w - 3, y + 12); ctx.lineTo(x + w, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,200,0.35)'; ctx.beginPath(); ctx.moveTo(x + 3, y + 12); ctx.lineTo(x + w - 3, y + 12); ctx.lineTo(x + w + 6, y + 24); ctx.lineTo(x - 6, y + 24); ctx.closePath(); ctx.fill();
      break;
    }
    case 'stool': {
      ctx.fillStyle = c; rr(ctx, x, y, w, 6, 2); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x + 2, y + 6, 3, h - 6); ctx.fillRect(x + w - 5, y + 6, 3, h - 6); ctx.fillRect(x + 3, y + h - 8, w - 6, 2);
      break;
    }
    case 'figurine': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, y + 4, 4, 0, TAU); ctx.fill();
      rr(ctx, x + 1, y + 7, w - 2, h - 9, 3); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillStyle = '#333'; ctx.fillRect(-1.5, y + 3, 1, 1); ctx.fillRect(0.8, y + 3, 1, 1);
      break;
    }
    case 'wrench': {
      ctx.fillStyle = c; rr(ctx, x + 4, y + 1, w - 8, h - 2, 1.5); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, 0, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + w - 4, 0, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5F6B78'; ctx.fillRect(x, -1.5, 3, 3); ctx.fillRect(x + w - 3, -1.5, 3, 3);
      break;
    }
    case 'jar': {
      ctx.fillStyle = 'rgba(200,225,240,0.8)'; rr(ctx, x, y + 2, w, h - 2, 2); ctx.fill();
      ctx.fillStyle = '#A88A5A'; ctx.fillRect(x + 1, y, w - 2, 3);
      ctx.fillStyle = ['#F2B84B', '#D9534F', '#6BC96B'][b.variant % 3]; ctx.fillRect(x + 2, y + 6, w - 4, h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 1.5, y + 4, 1.5, h - 6);
      break;
    }
    case 'teddy': {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, y + 7, 7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, y + h - 7, 8, 7, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, y + 2, 3, 0, TAU); ctx.arc(6, y + 2, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(0, y + 9, 3.5, 2.5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, y + h - 6, 4.5, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(-3, y + 5, 1.5, 1.5); ctx.fillRect(1.5, y + 5, 1.5, 1.5); ctx.fillRect(-1, y + 8, 2, 1.5);
      break;
    }
    case 'giftBox': {
      ctx.fillStyle = c; ctx.fillRect(x, y + 4, w, h - 4); ctx.fillStyle = light; ctx.fillRect(x - 1, y, w + 2, 5);
      ctx.fillStyle = '#FFF'; ctx.fillRect(-1.5, y, 3, h); ctx.fillRect(x - 1, y + 1, w + 2, 2);
      break;
    }
    default: {
      ctx.fillStyle = c; rr(ctx, x, y, w, h, 3); ctx.fill();
    }
  }
  ctx.restore();
}

export function shade(hex, k) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Spawn a cluster of clutter props on a shelf/floor line. `list` = array of kinds; spread along width. */
export function scatter(world, kinds, x, y, width, seed = 1, stack = 1) {
  const rnd = seededRandom(seed);
  const out = [];
  let cx = x;
  const items = [...kinds];
  for (let row = 0; row < stack; row++) {
    cx = x + rnd() * 6;
    for (const k of items) {
      const d = PROPS[k];
      if (cx + d.w > x + width) break;
      const b = makeProp(k, cx, y - row * 26, {});
      out.push(world.add(b));
      cx += d.w + 2 + rnd() * 6;
    }
  }
  return out;
}
