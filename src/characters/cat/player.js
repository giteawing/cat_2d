// The cat: platformer character controller. Precise, low-inertia movement with
// coyote time, jump buffering, variable jump height, crouching, ladders and pushing.
import { TILE, clamp, approach, sign } from '../../core/util.js';
import { Body, BodyType } from '../../physics/body.js';

export const CAT_W = 30;
export const CAT_H = 54;
export const CAT_CROUCH_H = 36;

const WALK_SPEED = 190;
const RUN_SPEED = 300;
const ACCEL_GROUND = 2600;
const DECEL_GROUND = 3200;
const ACCEL_AIR = 1500;
const DECEL_AIR = 700;
const JUMP_SPEED = 600;
const JUMP_CUT = 0.45;          // multiplier applied to vy when jump released early
const COYOTE = 0.10;
const JUMP_BUFFER = 0.12;
const CLIMB_SPEED = 130;
const MAX_FALL = 900;
const APEX_GRAVITY = 0.6;       // lighter gravity near the apex for a floaty-but-precise feel

export const Anim = {
  IDLE: 'idle', WALK: 'walk', RUN: 'run', JUMP_START: 'jumpStart', JUMP: 'jump', FALL: 'fall', LAND: 'land',
  CROUCH: 'crouch', CLIMB: 'climb', PUSH: 'push', HURT: 'hurt', HAPPY: 'happy', SURPRISE: 'surprise', CONFUSED: 'confused',
  COLLECT: 'collect', PORTAL_ENTER: 'portalEnter', PORTAL_EXIT: 'portalExit',
};

export class Player {
  constructor(x, y) {
    this.body = new Body({ type: BodyType.CHARACTER, x, y: y, w: CAT_W, h: CAT_H, mass: 4, friction: 0, bounce: 0, airDrag: 0, grabbable: false, portalable: true, kind: 'cat', maxSpeed: 1600 });
    this.body.controller = this;
    this.body.tag = 'player';
    this.facing = 1;
    this.aimX = 1; this.aimY = 0;      // world-space aim direction (unit)
    this.aimAngle = 0;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;
    this.crouching = false;
    this.climbing = false;
    this.running = false;
    this.anim = Anim.IDLE;
    this.animTime = 0;
    this.landTimer = 0;
    this.jumpStartTimer = 0;
    this.emoteTimer = 0;
    this.emote = null;               // temporary emotional animation override
    this.idleTime = 0;
    this.idleVariant = null;         // special idle animation name
    this.idleVariantTimer = 0;
    this.pushingTimer = 0;
    this.weapon = null;              // WeaponSystem sets this
    this.stepTimer = 0;
    this.moveInput = 0;
    this.blink = 0;
    this.blinkTimer = 2 + Math.random() * 3;
    this.lastVy = 0;
    this.headTilt = 0;
    this.squash = 1;                  // visual squash/stretch
    this.stretch = 1;
    this.portalFlash = 0;
    this.input = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, run: false };
    this.events = null;              // set by game: (name, data) => void
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }
  get cx() { return this.body.cx; }
  get cy() { return this.body.cy; }
  get feetY() { return this.body.bottom; }

  /** Position of the gun's hand anchor in world space. */
  handPos() {
    const b = this.body;
    const h = this.crouching ? CAT_CROUCH_H : CAT_H;
    return { x: b.cx + this.facing * 9, y: b.bottom - h * 0.52 };
  }

  setInput(i) { Object.assign(this.input, i); }

  emit(name, data) { if (this.events) this.events(name, data); }

  playEmote(name, dur = 0.8) { this.emote = name; this.emoteTimer = dur; }

  /** Called by the physics world before moving the body each substep. */
  prePhysics(dt, world) {
    const b = this.body;
    const inp = this.input;
    const map = world.map;

    // ---- ladders ----
    const onLadder = map.rectOnLadder(b.x + 6, b.y + 4, b.w - 12, b.h - 8);
    const ladderBelow = map.rectOnLadder(b.x + 6, b.bottom + 2, b.w - 12, 4);
    if (!this.climbing && onLadder && (inp.up || (inp.down && !this.onGround)) && !this.jumping) this.climbing = true;
    if (!this.climbing && this.onGround && inp.down && ladderBelow && !onLadder) { this.climbing = true; b.y += 2; }
    if (this.climbing && (!onLadder && !ladderBelow)) this.climbing = false;
    if (this.climbing && this.onGround && inp.down && !ladderBelow) this.climbing = false;
    b.climbing = this.climbing;
    // pressing down while standing on a floor portal drops the cat into it
    b.dropThrough = inp.down && this.onGround;

    // crouch (only on ground, not on ladders)
    const wantCrouch = inp.down && this.onGround && !this.climbing;
    this.setCrouch(wantCrouch, world);

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.moveInput = dir;
    this.running = inp.run && !this.crouching;
    let maxSpeed = this.running ? RUN_SPEED : WALK_SPEED;
    if (this.crouching) maxSpeed = 80;

    if (this.climbing) {
      b.gravityScale = 0;
      const vdir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      b.vy = vdir * CLIMB_SPEED;
      b.vx = approach(b.vx, dir * 110, 2000 * dt);
      // center on the ladder gently (so the cat fits through 1-tile holes in floors above/below the ladder)
      if (dir === 0) {
        const lc = Math.floor((b.cx) / TILE);
        const ladderCol = map.isLadder(map.get(lc, Math.floor(b.cy / TILE))) ? lc : map.isLadder(map.get(lc - 1, Math.floor(b.cy / TILE))) ? lc - 1 : map.isLadder(map.get(lc + 1, Math.floor(b.cy / TILE))) ? lc + 1 : null;
        if (ladderCol !== null) { const target = ladderCol * TILE + TILE / 2 - b.w / 2; b.x = approach(b.x, target, 120 * dt); }
      }
      if (inp.jumpPressed) { this.climbing = false; b.gravityScale = 1; b.vy = -JUMP_SPEED * 0.85; this.jumping = true; this.emit('jump'); inp.jumpPressed = false; }
      if (dir !== 0) this.facing = dir;
      return;
    }
    b.gravityScale = 1;

    // ---- horizontal movement ----
    const groundVx = b.groundBody ? b.groundBody.vx : 0;
    const rel = b.vx - groundVx;
    if (dir !== 0) {
      const accel = this.onGround ? ACCEL_GROUND : ACCEL_AIR;
      // turning around: brake faster
      const a = (sign(rel) !== 0 && sign(rel) !== dir) ? accel * 1.6 : accel;
      if (Math.abs(rel) < maxSpeed || sign(rel) !== dir) b.vx = groundVx + approach(rel, dir * maxSpeed, a * dt);
      else b.vx = groundVx + approach(rel, dir * maxSpeed, (this.onGround ? DECEL_GROUND * 0.5 : 120) * dt); // above max (flung by a portal): keep momentum in the air, brake on the ground
      if (!(this.weapon && this.weapon.isAiming())) this.facing = dir;
    } else {
      // in the air above run speed (portal fling): barely slow down, so momentum puzzles work hands-off
      const decel = this.onGround ? DECEL_GROUND : (Math.abs(rel) > RUN_SPEED ? 120 : DECEL_AIR);
      b.vx = groundVx + approach(rel, 0, decel * dt);
    }

    // ---- jump ----
    if (inp.jumpPressed) { this.jumpBuffer = JUMP_BUFFER; inp.jumpPressed = false; }
    else this.jumpBuffer -= dt;
    if (this.onGround) this.coyote = COYOTE; else this.coyote -= dt;

    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.crouching) {
      this.jumpBuffer = 0; this.coyote = 0;
      b.vy = -JUMP_SPEED + Math.min(0, b.groundBody ? b.groundBody.vy : 0);
      this.jumping = true;
      this.onGround = false;
      b.onGround = false; b.groundBody = null;
      this.jumpStartTimer = 0.08;
      this.stretch = 1.18; this.squash = 0.86;
      this.emit('jump');
    }
    // drop through one-way platforms
    if (this.onGround && inp.down && inp.jumpPressed === false && this.jumpBuffer > 0 && this.crouching) {
      // (down+jump) → fall through thin platforms
      b.ignoreOneWay = 0.25; this.jumpBuffer = 0; this.setCrouch(false, world);
    }
    if (this.jumping && !inp.jump && b.vy < 0) { b.vy *= JUMP_CUT; this.jumping = false; }
    if (b.vy >= 0) this.jumping = false;

    // apex gravity: gentle around the top of the jump
    if (!this.onGround && Math.abs(b.vy) < 90 && this.jumping) b.gravityScale = APEX_GRAVITY;
    if (b.vy > MAX_FALL) b.vy = MAX_FALL;
  }

  setCrouch(on, world) {
    const b = this.body;
    if (on === this.crouching) return;
    if (on) { b.y += CAT_H - CAT_CROUCH_H; b.h = CAT_CROUCH_H; this.crouching = true; }
    else {
      const ny = b.y - (CAT_H - CAT_CROUCH_H);
      if (world.map.rectHitsSolid(b.x + 1, ny + 1, b.w - 2, CAT_H - 2, world.ignoreFor(b))) return; // no room to stand
      const blocked = world.query(b.x + 1, ny, b.w - 2, CAT_H - CAT_CROUCH_H, (o) => o !== b && !o.dead && o.type !== 'character' && !(o.held && o.holder === b));
      if (blocked.length) return;
      b.y = ny; b.h = CAT_H; this.crouching = false;
    }
  }

  /** Per-frame update (after physics). Handles animation state & timers. */
  update(dt, world) {
    const b = this.body;
    const wasGround = this.onGround;
    this.onGround = b.onGround;
    if (!wasGround && this.onGround) {
      this.landTimer = Math.min(0.22, 0.08 + this.lastVy / 4000);
      this.squash = 1.22; this.stretch = 0.8;
      this.emit('land', { speed: this.lastVy });
      this.jumping = false;
    }
    this.lastVy = b.vy;
    if (this.landTimer > 0) this.landTimer -= dt;
    if (this.jumpStartTimer > 0) this.jumpStartTimer -= dt;
    if (this.emoteTimer > 0) { this.emoteTimer -= dt; if (this.emoteTimer <= 0) this.emote = null; }
    if (this.portalFlash > 0) this.portalFlash -= dt;
    if (b.pushing && world.time - b.pushing < 0.1 && this.moveInput !== 0) this.pushingTimer = 0.15; else this.pushingTimer -= dt;
    this.squash += (1 - this.squash) * Math.min(1, dt * 12);
    this.stretch += (1 - this.stretch) * Math.min(1, dt * 12);

    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.blink = 0.12; this.blinkTimer = 2 + Math.random() * 4; }
    if (this.blink > 0) this.blink -= dt;

    // aim facing when holding a gun and idle
    const aiming = this.weapon && this.weapon.isAiming();
    if (aiming && this.moveInput === 0 && Math.abs(this.aimX) > 0.25) this.facing = this.aimX >= 0 ? 1 : -1;

    // footsteps
    const speed = Math.abs(b.vx - (b.groundBody ? b.groundBody.vx : 0));
    if (this.onGround && speed > 30 && !this.crouching) {
      this.stepTimer -= dt * (speed / 150);
      if (this.stepTimer <= 0) { this.stepTimer = 0.32; this.emit('step', { run: this.running }); }
    } else this.stepTimer = 0.1;

    // choose animation
    let anim;
    if (this.emote) anim = this.emote;
    else if (this.climbing) anim = Anim.CLIMB;
    else if (!this.onGround) anim = this.jumpStartTimer > 0 ? Anim.JUMP_START : b.vy < -60 ? Anim.JUMP : b.vy > 60 ? Anim.FALL : Anim.JUMP;
    else if (this.landTimer > 0 && speed < 40) anim = Anim.LAND;
    else if (this.crouching) anim = Anim.CROUCH;
    else if (this.pushingTimer > 0 && speed < 80) anim = Anim.PUSH;
    else if (speed > 40) anim = this.running && speed > WALK_SPEED + 20 ? Anim.RUN : Anim.WALK;
    else anim = Anim.IDLE;

    if (anim !== this.anim) { this.anim = anim; this.animTime = 0; }
    else this.animTime += dt;

    // idle variants (tail flick, look around, stretch, sniff, look at gun)
    if (anim === Anim.IDLE) {
      this.idleTime += dt;
      if (this.idleVariant) { this.idleVariantTimer -= dt; if (this.idleVariantTimer <= 0) { this.idleVariant = null; this.idleTime = 0; } }
      else if (this.idleTime > 3.5 + Math.random() * 2) {
        const opts = ['lookAround', 'stretch', 'sniff', 'tailFlick', 'groom'];
        if (this.weapon && this.weapon.current) opts.push('lookGun');
        this.idleFlourishes = (this.idleFlourishes || 0) + 1;
        // after a few flourishes the cat sits down for a while
        this.idleVariant = this.idleFlourishes % 4 === 0 ? 'sit' : opts[Math.floor(Math.random() * opts.length)];
        this.idleVariantTimer = { stretch: 1.6, groom: 2.2, sit: 2.6 }[this.idleVariant] || 1.2;
      }
    } else { this.idleTime = 0; this.idleVariant = null; this.idleFlourishes = 0; }
  }

  /** Called by PortalManager when the cat is teleported. */
  onTeleport(from, to) {
    this.portalFlash = 0.35;
    this.playEmote(Anim.PORTAL_EXIT, 0.3);
    if (Math.abs(this.body.vx) > 30) this.facing = this.body.vx > 0 ? 1 : -1;
    this.emit('teleport', { from, to });
  }
}
