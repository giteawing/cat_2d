// Particles, beams, screen shake and floating text.
import { TAU, len } from '../core/util.js';
import { PORTAL_COLORS } from '../portals/portalRenderer.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.beams = [];
    this.texts = [];
    this.shakeAmt = 0;
    this.shots = [];
  }

  spawnParticle(x, y, vx, vy, life, color, size = 3, grav = 600) {
    this.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, grav });
  }

  burst(pos, color, n = 8, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
      this.spawnParticle(pos.x, pos.y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.4, color, 2 + Math.random() * 3);
    }
  }

  debris(b, color) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * Math.random(), s = 120 + Math.random() * 220;
      this.spawnParticle(b.cx + (Math.random() - 0.5) * b.w, b.cy, Math.cos(a) * s + b.vx * 0.3, Math.sin(a) * s + b.vy * 0.3, 0.6 + Math.random() * 0.5, color, 2 + Math.random() * 3, 900);
    }
  }

  dust(x, y, n = 5) {
    for (let i = 0; i < n; i++) this.spawnParticle(x + (Math.random() - 0.5) * 20, y, (Math.random() - 0.5) * 90, -30 - Math.random() * 50, 0.35, 'rgba(255,255,255,0.7)', 2 + Math.random() * 2, 100);
  }

  beam(weapon, body, kind) { this.beams.push({ weapon, body, kind, life: 0.4 }); }

  portalShot(from, hit, color, ok) {
    this.shots.push({ x0: from.x, y0: from.y, x1: hit ? hit.x : from.x + 800, y1: hit ? hit.y : from.y, color, ok, life: 0.25, max: 0.25 });
    if (hit) this.burst({ x: hit.x, y: hit.y }, ok ? PORTAL_COLORS[color].light : '#E05555', ok ? 14 : 6, 260);
  }

  text(x, y, str, color = '#fff') { this.texts.push({ x, y, str, color, life: 1.2 }); }

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  update(dt) {
    for (const p of this.particles) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const s of this.shots) s.life -= dt;
    this.shots = this.shots.filter((s) => s.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 30 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shakeAmt *= Math.pow(0.02, dt);
    if (this.shakeAmt < 0.1) this.shakeAmt = 0;
  }

  draw(ctx, time) {
    for (const s of this.shots) {
      const a = s.life / s.max;
      const c = s.ok ? PORTAL_COLORS[s.color].main : '#E05555';
      ctx.strokeStyle = c; ctx.globalAlpha = a; ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.maxLife * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life);
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  /** Gravity-gun beam drawn between muzzle and held/pulled object. */
  drawGravityBeam(ctx, weapon, time) {
    const target = weapon.held || weapon.pulling;
    if (!target) return;
    const m = weapon.muzzle();
    const t = weapon.portals.closestTargetFor(m.x, m.y, target.cx, target.cy);
    // If the object is through a portal, the beam start is transformed too; draw straight to the object.
    const sx = t.x, sy = t.y;
    const dx = target.cx - sx, dy = target.cy - sy;
    const d = len(dx, dy);
    if (d > 400) return;
    ctx.save();
    ctx.lineCap = 'round';
    const pulse = 0.5 + 0.5 * Math.sin(time * 20);
    ctx.strokeStyle = `rgba(255,170,70,${0.25 + pulse * 0.2})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(target.cx, target.cy); ctx.stroke();
    ctx.strokeStyle = '#FFD08A'; ctx.lineWidth = 2;
    ctx.beginPath();
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const k = i / segs;
      const off = Math.sin(k * Math.PI * 3 + time * 30) * 3 * (1 - Math.abs(k - 0.5) * 2);
      const px = sx + dx * k - dy / d * off, py = sy + dy * k + dx / d * off;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // halo on the object
    ctx.strokeStyle = `rgba(255,190,90,${0.5 + pulse * 0.3})`; ctx.lineWidth = 2;
    ctx.strokeRect(target.x - 3, target.y - 3, target.w + 6, target.h + 6);
    ctx.restore();
  }
}
