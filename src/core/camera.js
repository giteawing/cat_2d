// Smooth-follow camera with look-ahead, vertical dead zone and level bounds.
import { clamp, damp, lerp } from './util.js';

const PEEK_MAX = 720;   // px of world the look-up scroll can travel (≈22 tiles: enough to see the ceiling of a 32-row room)

export class Camera {
  constructor(viewW, viewH) {
    this.x = 0; this.y = 0;           // top-left in world coords
    this.w = viewW; this.h = viewH;
    this.zoom = 1;
    this.bounds = { x: 0, y: 0, w: 4000, h: 2000 };
    this.lookAhead = 0;
    this.targetY = 0;
    this.shakeX = 0; this.shakeY = 0;
  }

  setBounds(w, h) { this.bounds = { x: 0, y: 0, w, h }; }

  snapTo(px, py) {
    this.lookAhead = 0;
    this.targetY = py;
    this.x = px - this.w / 2; this.y = py - this.h / 2;
    this.clampToBounds();
  }

  follow(player, dt) {
    const b = player.body;
    // look-ahead follows facing / velocity
    const desired = player.facing * 90 + clamp(b.vx, -300, 300) * 0.25;
    this.lookAhead = lerp(this.lookAhead, desired, damp(3, dt));
    const tx = b.cx + this.lookAhead;
    // vertical: dead zone so small hops don't move the camera; follow when grounded or falling far
    const cy = this.y + this.h / 2;
    const dy = b.cy - this.targetY;
    if (player.onGround || player.climbing) this.targetY = lerp(this.targetY, b.cy, damp(6, dt));
    else if (Math.abs(dy) > 110) this.targetY = b.cy - Math.sign(dy) * 110;
    // peek: hold down (crouch) or up while standing still to look further down / up
    // Rooms are tall: keep looking and the camera keeps scrolling (up to PEEK_MAX) so ceilings can be seen and aimed at.
    let peekWant = 0;
    if (player.onGround && Math.abs(b.vx) < 10 && !player.climbing) { if (player.input.down) peekWant = PEEK_MAX * 0.7; else if (player.input.up) peekWant = -PEEK_MAX; }
    this.peek = this.peek || 0;
    if (peekWant) { const speed = Math.abs(this.peek) < 150 ? 900 : 520; this.peek = peekWant > 0 ? Math.min(peekWant, this.peek + speed * dt) : Math.max(peekWant, this.peek - speed * dt); }
    else this.peek = lerp(this.peek, 0, damp(6, dt));
    const peeking = Math.abs(this.peek) > 20;
    const ty = this.targetY - 20 + this.peek;
    const nx = lerp(this.x + this.w / 2, tx, damp(5, dt));
    let ny = lerp(cy, ty, damp(peeking ? 8 : 5, dt));
    // hard limit: never let the cat leave the visible frame (portal flings can be very fast) — except while the player
    // deliberately looks up/down standing still
    const margin = 70;
    const top = ny - this.h / 2, bottom = ny + this.h / 2, left = nx - this.w / 2, right = nx + this.w / 2;
    let fx = nx;
    if (!peeking) {
      if (b.cy < top + margin) ny = b.cy - margin + this.h / 2;
      else if (b.cy > bottom - margin) ny = b.cy + margin - this.h / 2;
    }
    if (b.cx < left + margin) fx = b.cx - margin + this.w / 2;
    else if (b.cx > right - margin) fx = b.cx + margin - this.w / 2;
    if (ny !== cy && Math.abs(b.cy - this.targetY) > 110) this.targetY = b.cy;
    this.x = fx - this.w / 2; this.y = ny - this.h / 2;
    this.clampToBounds();
  }

  clampToBounds() {
    const b = this.bounds;
    if (b.w <= this.w) this.x = b.x + (b.w - this.w) / 2; else this.x = clamp(this.x, b.x, b.x + b.w - this.w);
    if (b.h <= this.h) this.y = b.y + (b.h - this.h) / 2; else this.y = clamp(this.y, b.y, b.y + b.h - this.h);
  }

  applyShake(amt) {
    this.shakeX = (Math.random() - 0.5) * 2 * amt;
    this.shakeY = (Math.random() - 0.5) * 2 * amt;
  }

  screenToWorld(sx, sy) { return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y }; }
  worldToScreen(wx, wy) { return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom }; }
}
