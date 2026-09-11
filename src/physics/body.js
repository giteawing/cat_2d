// A physics body is an axis-aligned box with velocity and material properties.
import { TILE } from '../core/util.js';

let nextId = 1;

export const BodyType = {
  DYNAMIC: 'dynamic',      // moved by forces, collides with everything
  KINEMATIC: 'kinematic',  // moved by script (platforms), pushes dynamics
  CHARACTER: 'character',  // the cat: dynamic but with controlled movement
};

export class Body {
  constructor(opts = {}) {
    this.id = nextId++;
    this.type = opts.type || BodyType.DYNAMIC;
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.w = opts.w || TILE;
    this.h = opts.h || TILE;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.mass = opts.mass ?? 1;
    this.invMass = this.type === BodyType.KINEMATIC ? 0 : 1 / this.mass;
    this.friction = opts.friction ?? 0.6;      // ground friction coefficient (0..1)
    this.bounce = opts.bounce ?? 0.1;          // restitution (0..1)
    this.airDrag = opts.airDrag ?? 0.002;
    this.maxSpeed = opts.maxSpeed ?? 1400;
    this.gravityScale = opts.gravityScale ?? 1;
    this.grabbable = opts.grabbable ?? (this.type === BodyType.DYNAMIC);
    this.portalable = opts.portalable ?? true;
    this.pressesButtons = opts.pressesButtons ?? (this.type !== BodyType.KINEMATIC);
    this.breakable = opts.breakable ?? false;
    this.breakSpeed = opts.breakSpeed ?? 520;
    this.angle = 0;               // visual spin for round/small objects
    this.spin = 0;
    this.rolls = opts.rolls ?? false;
    this.onGround = false;
    this.groundBody = null;
    this.hitWall = false;
    this.hitCeiling = false;
    this.held = false;            // held by the gravity gun
    this.portalCooldown = 0;
    this.sleepTimer = 0;
    this.asleep = false;
    this.px = this.x; this.py = this.y;   // previous position
    this.kind = opts.kind || 'box';        // visual kind
    this.color = opts.color || null;
    this.userData = opts.userData || {};
    this.dead = false;
    this.impactSpeed = 0;         // largest impact speed in the last step (for sfx/breaking)
    this.ignoreOneWay = 0;        // timer to drop through one-way platforms
    this.tag = opts.tag || '';
    this.noCollideBodies = opts.noCollideBodies ?? false;
    this.releaseFrom = null; this.releaseUntil = 0;   // holder to ignore briefly after a throw/drop
    this.tunneling = false;       // quantum tunneling mode (cat): may pass through potential barriers (field tiles)
    this.fieldPass = null;        // Set of field tile indices the body is currently passing through
    this.fieldCooldown = 0;       // seconds until the next tunneling attempt
    this.knockback = 0;           // seconds of "flung back by a field" (controller ignores input)
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  set cx(v) { this.x = v - this.w / 2; }
  set cy(v) { this.y = v - this.h / 2; }
  get bottom() { return this.y + this.h; }
  get right() { return this.x + this.w; }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  wake() { this.asleep = false; this.sleepTimer = 0; }

  applyImpulse(ix, iy) {
    this.vx += ix * this.invMass;
    this.vy += iy * this.invMass;
    this.wake();
  }
}
