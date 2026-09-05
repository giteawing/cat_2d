// Weapon system: switching between the Gravity Gun and the Portal Gun,
// aim handling and the gameplay logic of both tools.
import { clamp, len, lerp } from '../core/util.js';
import { BodyType } from '../physics/body.js';

export const WEAPON = { GRAVITY: 'gravity', PORTAL: 'portal' };

const GRAB_RANGE = 240;        // how far the gravity gun can reach
const PULL_FORCE = 1400;       // acceleration while pulling an object in
const HOLD_DIST = 56;          // distance from the hand to the held object's center
const HOLD_STIFF = 16;         // spring constant for the held object
const HOLD_MAX_SPEED = 1100;
const HOLD_BREAK_DIST = 90;    // drop the object if it lags too far behind
const THROW_SPEED = 820;
const PUNT_SPEED = 720;
const PUNT_RANGE = 120;

export class WeaponSystem {
  constructor(player, world, portals, game) {
    this.player = player;
    this.world = world;
    this.portals = portals;
    this.game = game;
    this.available = { gravity: false, portal: false };
    this.current = null;         // 'gravity' | 'portal' | null
    this.swapT = 1;              // 0..1 swap-in animation
    this.recoil = 0;
    this.charge = 0;             // gravity gun charge visual
    this.held = null;            // held body
    this.holdStrain = 0;
    this.pulling = null;         // body being pulled toward us
    this.pullTime = 0;
    this.hoverBody = null;       // grabbable body under the crosshair
    this.lastPortalColor = 'blue';
    this.hint = '';              // HUD hint text
    this.aimLock = 0;
    this.holdOffsetY = 0;
    this.gunAngle = 0;           // smoothed world angle of the gun
  }

  unlock(kind) {
    this.available[kind] = true;
    if (!this.current) this.select(kind);
  }

  select(kind) {
    if (!this.available[kind] || kind === this.current) return false;
    if (this.held) this.drop(false);
    this.pulling = null;
    this.current = kind;
    this.swapT = 0;
    this.game.sfx('swap', kind);
    return true;
  }

  isAiming() { return !!this.current; }

  /** Info for the sprite drawing. */
  view() {
    if (!this.current) return null;
    const facing = this.player.facing;
    // gun angle in world space follows the aim; convert to the cat's local (mirrored) frame
    let a = this.visualAngle ?? this.gunAngle;
    const local = facing === 1 ? a : Math.PI - a;
    return { kind: this.current, swapT: this.swapT, recoil: this.recoil, charge: this.charge, holding: !!this.held || !!this.pulling, lastColor: this.lastPortalColor, localAngle: normAngle(local) };
  }

  /** World-space muzzle position (where beams start). */
  muzzle() {
    const h = this.player.handPos();
    const a = this.gunAngle;
    return { x: h.x + Math.cos(a) * 30, y: h.y - 2 + Math.sin(a) * 30 };
  }

  update(dt, input) {
    const p = this.player;
    if (this.swapT < 1) this.swapT = Math.min(1, this.swapT + dt * 4);
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);

    // aim direction from mouse (world coords)
    const hand = p.handPos();
    let dx = input.mouseWorldX - hand.x, dy = input.mouseWorldY - hand.y;
    const l = len(dx, dy);
    if (l > 1) { p.aimX = dx / l; p.aimY = dy / l; }
    const targetAngle = Math.atan2(p.aimY, p.aimX);
    // the cat turns toward the aim (unless walking the other way); the gun can point anywhere in the front half
    if (p.moveInput === 0 && this.current) p.facing = p.aimX >= 0 ? 1 : -1;
    let ang = targetAngle;
    if (p.facing === 1) ang = clamp(normAngle(ang), -1.5, 1.5);
    else { const m = normAngle(Math.PI - ang); ang = Math.PI - clamp(m, -1.5, 1.5); }
    this.gunAngle = ang;                                  // exact aim for gameplay
    this.visualAngle = lerpAngle(this.visualAngle ?? ang, ang, Math.min(1, dt * 25));  // smoothed for the sprite

    this.hint = '';
    if (!this.current) return;

    if (input.key1 && this.available.gravity) this.select(WEAPON.GRAVITY);
    if (input.key2 && this.available.portal) this.select(WEAPON.PORTAL);
    if (input.wheel) this.cycle(input.wheel);

    if (this.current === WEAPON.GRAVITY) this.updateGravity(dt, input);
    else this.updatePortal(dt, input);
  }

  cycle(dir) {
    const list = ['gravity', 'portal'].filter((k) => this.available[k]);
    if (list.length < 2) return;
    const i = list.indexOf(this.current);
    this.select(list[(i + (dir > 0 ? 1 : -1) + list.length) % list.length]);
  }

  // ------------------------------------------------------------ gravity gun
  updateGravity(dt, input) {
    const p = this.player, world = this.world;
    const hand = p.handPos();
    const aim = { x: Math.cos(this.gunAngle), y: Math.sin(this.gunAngle) };

    // hover detection
    this.hoverBody = null;
    if (!this.held) {
      const hit = world.raycast(hand.x, hand.y, aim.x, aim.y, GRAB_RANGE, { ignoreBody: p.body, filterBody: (b) => b.grabbable && !b.dead });
      if (hit && hit.body && hit.body.grabbable) this.hoverBody = hit.body;
      else {
        // forgiving: also check a small box around the aim point up to range
        const near = world.query(input.mouseWorldX - 14, input.mouseWorldY - 14, 28, 28, (b) => b.grabbable && !b.dead && b !== p.body);
        if (near.length) {
          near.sort((a, c) => len(a.cx - input.mouseWorldX, a.cy - input.mouseWorldY) - len(c.cx - input.mouseWorldX, c.cy - input.mouseWorldY));
          const b = near[0];
          if (len(b.cx - hand.x, b.cy - hand.y) <= GRAB_RANGE) {
            // must have line of sight
            const los = world.map.raycast(hand.x, hand.y, b.cx - hand.x, b.cy - hand.y, len(b.cx - hand.x, b.cy - hand.y), this.portals.ignoreTilesFor(b));
            if (!los) this.hoverBody = b;
          }
        }
      }
      if (this.hoverBody) this.hint = `${this.game.btn('lmb')} — схватить   ${this.game.btn('rmb')} — толкнуть`;
    } else this.hint = `${this.game.btn('lmb')} — бросить   ${this.game.btn('rmb')} / ${this.game.btn('e')} — отпустить`;

    // pulling: the object flies toward the hand (no gravity/friction while in the beam)
    if (this.pulling) {
      const b = this.pulling;
      this.pullTime += dt;
      const tx = hand.x + aim.x * HOLD_DIST, ty = hand.y + aim.y * HOLD_DIST;
      const dx = tx - b.cx, dy = ty - b.cy;
      const d = len(dx, dy);
      if (b.dead || d > GRAB_RANGE + 60 || this.pullTime > 2.0) { this.pulling = null; if (!b.dead) { b.held = false; b.holder = null; } }
      else if (d < 26) { this.pulling = null; this.beginHold(b); }
      else {
        b.held = true; b.holder = p.body;           // disables gravity & friction, passes through the cat
        if (ty > b.cy + 4) b.ignoreOneWay = 0.05;    // may be pulled down through thin shelves
        const speed = Math.min(760, 260 + this.pullTime * 1400);
        // ease the object upward first so it clears whatever it is sitting among
        const liftY = this.pullTime < 0.18 ? -140 : 0;
        b.vx = (dx / d) * speed; b.vy = (dy / d) * speed + liftY;
        b.wake();
        this.charge = 0.6 + Math.sin(this.pullTime * 30) * 0.2;
      }
    }

    // holding
    if (this.held) {
      const b = this.held;
      if (b.dead) { this.held = null; }
      else {
        b.held = true; b.holder = p.body;
        let tx = hand.x + aim.x * HOLD_DIST, ty = hand.y + aim.y * HOLD_DIST + this.holdOffsetY;
        // keep the held target out of walls: cast from hand toward the target
        const cast = world.map.raycast(hand.x, hand.y, aim.x, aim.y, HOLD_DIST + 6, this.portals.ignoreTilesFor(b));
        if (cast) { const d = Math.max(10, cast.dist - Math.max(b.w, b.h) * 0.5); tx = hand.x + aim.x * d; ty = hand.y + aim.y * d + this.holdOffsetY; }
        // object may be on the other side of a portal: use the closest transformed target
        const tp = this.portals.closestTargetFor(tx, ty, b.cx, b.cy);
        tx = tp.x; ty = tp.y;
        const dx = tx - b.cx, dy = ty - b.cy;
        const d = len(dx, dy);
        if (dy > 6) b.ignoreOneWay = 0.05;
        // the object may lag behind briefly (e.g. the aim flips to the other side); only drop it
        // when it stays far from its target for a while (stuck behind a wall / the cat)
        if (d > HOLD_BREAK_DIST + Math.max(b.w, b.h) * 0.5) this.holdStrain += dt; else this.holdStrain = Math.max(0, this.holdStrain - dt * 2);
        if (this.holdStrain > 0.45) { this.holdStrain = 0; this.drop(false); }
        else {
          b.vx = dx * HOLD_STIFF; b.vy = dy * HOLD_STIFF;
          const sp = len(b.vx, b.vy);
          if (sp > HOLD_MAX_SPEED) { b.vx *= HOLD_MAX_SPEED / sp; b.vy *= HOLD_MAX_SPEED / sp; }
          b.wake();
          b.spin *= 0.9; b.angle *= 0.9;
        }
        this.charge = 0.85 + Math.sin(world.time * 8) * 0.1;
      }
    } else if (!this.pulling) this.charge = Math.max(0, this.charge - dt * 3);

    // actions
    if (input.lmbPressed) {
      if (this.held) this.throw(aim);
      else if (this.hoverBody && !this.pulling) this.beginPull(this.hoverBody);
      else { this.recoil = 0.5; this.game.sfx('gravEmpty'); }
    }
    if (input.rmbPressed || input.interactPressed) {
      if (this.held) this.drop(true);
      else if (input.rmbPressed) this.punt(hand, aim);
    }
  }

  beginPull(b) {
    this.pulling = b; this.pullTime = 0;
    b.wake();
    this.game.sfx('gravPull');
    this.game.effects.beam(this, b, 'pull');
  }

  beginHold(b) {
    this.held = b; b.held = true; b.holder = this.player.body; b.wake();
    b.spin = 0;
    this.holdOffsetY = 0; this.holdStrain = 0;
    this.game.sfx('gravGrab');
    this.player.playEmote('happy', 0.35);
  }

  drop(gentle) {
    const b = this.held;
    if (!b) return;
    this.held = null; b.held = false; b.holder = null;
    b.releaseFrom = this.player.body; b.releaseUntil = this.game.world.time + 0.35;
    if (gentle) { b.vx = this.player.body.vx * 0.6; b.vy = Math.min(b.vy, 0); }
    this.game.sfx('gravDrop');
  }

  throw(aim) {
    const b = this.held;
    this.held = null; b.held = false; b.holder = null;
    b.releaseFrom = this.player.body; b.releaseUntil = this.game.world.time + 0.35;
    const sp = THROW_SPEED * (1 / Math.sqrt(Math.max(0.35, b.mass * 0.35)));
    const s = clamp(sp, 380, 1000);
    b.vx = aim.x * s + this.player.body.vx * 0.3;
    b.vy = aim.y * s;
    b.spin = (Math.random() - 0.5) * 14;
    b.wake();
    this.recoil = 1;
    this.game.sfx('gravThrow');
    this.game.effects.burst(this.muzzle(), '#FFB35A', 10);
  }

  punt(hand, aim) {
    const world = this.world;
    const hit = world.raycast(hand.x, hand.y, aim.x, aim.y, PUNT_RANGE, { ignoreBody: this.player.body, filterBody: (b) => b.type !== BodyType.KINEMATIC && b.grabbable });
    this.recoil = 1;
    if (hit && hit.body) {
      const b = hit.body;
      const s = PUNT_SPEED / Math.sqrt(Math.max(0.5, b.mass * 0.5));
      b.vx = aim.x * s; b.vy = aim.y * s - 80; b.spin = (Math.random() - 0.5) * 16; b.wake();
      this.game.sfx('gravPunt');
      this.game.effects.burst({ x: hit.x, y: hit.y }, '#FFB35A', 14);
      this.game.effects.shake(3);
    } else {
      // small area push in front
      const px = hand.x + aim.x * 50, py = hand.y + aim.y * 50;
      const near = world.query(px - 45, py - 45, 90, 90, (b) => b.grabbable && b !== this.player.body);
      for (const b of near) {
        const dx = b.cx - hand.x, dy = b.cy - hand.y; const d = len(dx, dy) || 1;
        const s = (PUNT_SPEED * 0.6) / Math.sqrt(Math.max(0.5, b.mass * 0.5)) * (1 - d / 140);
        if (s > 0) { b.vx += (dx / d) * s; b.vy += (dy / d) * s - 60; b.wake(); }
      }
      this.game.sfx(near.length ? 'gravPunt' : 'gravEmpty');
      this.game.effects.burst(this.muzzle(), '#FFB35A', 6);
    }
  }

  // ------------------------------------------------------------ portal gun
  updatePortal(dt, input) {
    this.hoverBody = null;
    this.hint = `${this.game.btn('lmb')} — синий портал   ${this.game.btn('rmb')} — оранжевый портал`;
    if (input.lmbPressed) this.firePortal('blue');
    if (input.rmbPressed) this.firePortal('orange');
  }

  firePortal(color) {
    const hand = this.player.handPos();
    const aim = { x: Math.cos(this.gunAngle), y: Math.sin(this.gunAngle) };
    this.lastPortalColor = color;
    this.recoil = 0.8;
    const m = this.muzzle();
    const res = this.portals.shoot(color, hand.x, hand.y, aim.x, aim.y, this.player.body);
    this.game.effects.portalShot(m, res.hit, color, res.ok);
    if (res.ok) this.game.sfx('portalOpen', color);
    else this.game.sfx('portalFail');
  }
}

export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function lerpAngle(a, b, t) {
  return a + normAngle(b - a) * t;
}
