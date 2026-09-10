// Reusable puzzle components: PressurePlate, Button, Lever, Door, MovingPlatform, Trigger, Fan, FieldGate.
// Components communicate through named "channels": an activator sets channel[name] = true/false,
// and receivers read the channel each frame. Multiple activators can be AND-ed by a door.
import { TILE, clamp, lerp } from '../core/util.js';
import { Body, BodyType } from '../physics/body.js';
import { T } from '../physics/tilemap.js';

export class Channels {
  constructor() { this.map = new Map(); }
  set(name, v) { this.map.set(name, v); }
  get(name) { return !!this.map.get(name); }
  /** Evaluate a requirement: "a" | "a&b" | "a|b" | "!a" */
  test(expr) {
    if (!expr) return false;
    if (expr.includes('&')) return expr.split('&').every((e) => this.test(e.trim()));
    if (expr.includes('|')) return expr.split('|').some((e) => this.test(e.trim()));
    if (expr.startsWith('!')) return !this.get(expr.slice(1));
    return this.get(expr);
  }
}

/** Floor plate pressed by weight (cat or objects) — stays active while something stands on it. */
export class PressurePlate {
  constructor(x, y, channel, opts = {}) {
    this.x = x; this.y = y;            // tile coords of the plate's floor tile top-left (in px)
    this.w = opts.w || TILE * 1.5; this.h = 8;
    this.channel = channel;
    this.pressed = false;
    this.press = 0;                     // 0..1 animation
    this.color = opts.color || '#E05555';
    this.needMass = opts.needMass || 0.5;
    this.label = opts.label || '';
  }
  update(dt, game) {
    const bodies = game.world.query(this.x, this.y - 6, this.w, this.h + 8, (b) => b.pressesButtons && !b.dead && b.bottom <= this.y + this.h + 4 && b.bottom >= this.y - 8);
    const mass = bodies.reduce((m, b) => m + (b.held ? 0 : b.mass), 0);
    const now = mass >= this.needMass;
    if (now !== this.pressed) { this.pressed = now; game.sfx(now ? 'plateOn' : 'plateOff'); }
    game.channels.set(this.channel, now);
    this.press = lerp(this.press, now ? 1 : 0, Math.min(1, dt * 14));
  }
  draw(ctx) {
    const y = this.y + 2 - 2 + this.press * 5;
    // base
    ctx.fillStyle = '#5B6470'; ctx.fillRect(this.x - 3, this.y + 2, this.w + 6, 6);
    ctx.fillStyle = '#39404A'; ctx.fillRect(this.x - 3, this.y + 6, this.w + 6, 2);
    // plate
    ctx.fillStyle = this.pressed ? '#7ED37E' : this.color;
    ctx.beginPath(); ctx.moveTo(this.x, y + 2); ctx.lineTo(this.x + 4, y - 4); ctx.lineTo(this.x + this.w - 4, y - 4); ctx.lineTo(this.x + this.w, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(this.x + 6, y - 3, this.w - 12, 2);
    if (this.label) { ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.label, this.x + this.w / 2, y + 1); }
  }
}

/** Wall/floor button toggled by pressing E near it, or by being hit by a thrown object. */
export class Button {
  constructor(x, y, channel, opts = {}) {
    this.x = x; this.y = y; this.w = 20; this.h = 20;
    this.channel = channel;
    this.on = false;
    this.toggle = opts.toggle ?? true;
    this.timer = 0;
    this.holdTime = opts.holdTime || 0;   // 0 = permanent toggle; >0 = stays on for N seconds (no timer failure, just resets)
    this.anim = 0;
    this.label = opts.label || 'E';
    this.latch = !!opts.latch;           // latch: once on, stays on (thrown objects can't switch it back off)
    this.lastHitter = null; this.hitterClear = 0;
  }
  update(dt, game) {
    const p = game.player.body;
    const near = p.x < this.x + this.w + 28 && p.right > this.x - 28 && p.y < this.y + this.h + 40 && p.bottom > this.y - 64;
    game.interactables.push({ x: this.x + this.w / 2, y: this.y, near, label: 'E' });
    let hit = false;
    if (near && game.frameInput.interactPressed) { hit = true; game.frameInput.interactPressed = false; }
    // thrown objects
    // generous hit zone (the button is small and thrown things are fast): the box grown by 10 px, plus a swept check
    // against where the body was one step ago so a ball cannot tunnel past between two physics steps
    const pad = 10;
    const bodies = game.world.query(this.x - pad - 40, this.y - pad - 40, this.w + pad * 2 + 80, this.h + pad * 2 + 80, (b) => {
      if (!b.grabbable || b.held || Math.hypot(b.vx, b.vy) < 120) return false;
      const bx0 = this.x - pad, by0 = this.y - pad, bx1 = this.x + this.w + pad, by1 = this.y + this.h + pad;
      const over = (x, y, w, h) => x < bx1 && x + w > bx0 && y < by1 && y + h > by0;
      if (over(b.x, b.y, b.w, b.h)) return true;
      const px = b.x - b.vx / 60, py = b.y - b.vy / 60;   // previous position (approx. one frame back)
      return over(Math.min(px, b.x), Math.min(py, b.y), Math.abs(b.vx / 60) + b.w, Math.abs(b.vy / 60) + b.h);
    });
    // the same object bouncing around the button counts as one hit until it has been away for a moment
    if (this.hitterClear > 0) { this.hitterClear -= dt; if (this.hitterClear <= 0) this.lastHitter = null; }
    const fresh = bodies.find((b) => b !== this.lastHitter);
    if (fresh) { hit = true; this.lastHitter = fresh; this.hitterClear = 1.0; }
    else if (bodies.length) this.hitterClear = 1.0;
    if (hit && this.anim <= 0) {
      this.on = (this.toggle && !(this.latch && this.on)) ? !this.on : true;
      this.anim = 0.25;
      game.sfx('button');
      if (this.holdTime) this.timer = this.holdTime;
    }
    if (this.anim > 0) this.anim -= dt;
    if (this.holdTime && this.on) { this.timer -= dt; if (this.timer <= 0) { this.on = false; game.sfx('plateOff'); } }
    game.channels.set(this.channel, this.on);
  }
  draw(ctx) {
    const push = this.anim > 0 ? 3 : 0;
    ctx.fillStyle = '#4A525E'; ctx.fillRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
    ctx.fillStyle = '#2F353D'; ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    ctx.fillStyle = this.on ? '#7ED37E' : '#E05555';
    ctx.beginPath(); ctx.arc(this.x + this.w / 2, this.y + this.h / 2 + push, this.w / 2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(this.x + this.w / 2 - 3, this.y + this.h / 2 - 3 + push, 3, 0, Math.PI * 2); ctx.fill();
  }
}

/** Lever: toggled with E. */
export class Lever {
  constructor(x, y, channel, opts = {}) {
    this.x = x; this.y = y; this.w = 24; this.h = 24; this.channel = channel; this.on = !!opts.on; this.t = this.on ? 1 : 0;
  }
  update(dt, game) {
    const p = game.player.body;
    const near = p.x < this.x + this.w + 28 && p.right > this.x - 28 && p.y < this.y + this.h + 40 && p.bottom > this.y - 64;
    game.interactables.push({ x: this.x + this.w / 2, y: this.y, near, label: 'E' });
    if (near && game.frameInput.interactPressed) { game.frameInput.interactPressed = false; this.on = !this.on; game.sfx('lever'); game.player.playEmote('surprise', 0.3); }
    this.t = lerp(this.t, this.on ? 1 : 0, Math.min(1, dt * 12));
    game.channels.set(this.channel, this.on);
  }
  draw(ctx) {
    const cx = this.x + this.w / 2, cy = this.y + this.h - 4;
    ctx.fillStyle = '#4A525E'; ctx.fillRect(this.x, this.y + this.h - 8, this.w, 8);
    ctx.fillStyle = '#2F353D'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    const ang = lerp(-0.9, 0.9, this.t);
    ctx.strokeStyle = '#9AA3AE'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * 18, cy - Math.cos(ang) * 18); ctx.stroke();
    ctx.fillStyle = this.on ? '#7ED37E' : '#E05555'; ctx.beginPath(); ctx.arc(cx + Math.sin(ang) * 18, cy - Math.cos(ang) * 18, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}

/** Door: a kinematic solid block that slides open when its requirement is met. */
export class Door {
  constructor(x, y, w, h, requires, opts = {}) {
    this.body = new Body({ type: BodyType.KINEMATIC, x, y, w, h, grabbable: false, portalable: false, pressesButtons: false, kind: 'door' });
    this.body.tag = 'door';
    this.closedX = x; this.closedY = y;
    this.dir = opts.dir || 'up';   // slide direction
    this.requires = requires;
    this.open = 0;                  // 0..1
    this.speed = opts.speed || 2.2;
    this.color = opts.color || '#6C7BB0';
    this.inverted = !!opts.inverted;
    this.wasOpen = false;
    this.travel = opts.travel || (this.dir === 'up' || this.dir === 'down' ? h : w);
  }
  update(dt, game) {
    let want = game.channels.test(this.requires);
    if (this.inverted) want = !want;
    const prev = this.open;
    this.open = clamp(this.open + (want ? 1 : -1) * this.speed * dt, 0, 1);
    if (want !== this.wasOpen) { this.wasOpen = want; game.sfx(want ? 'doorOpen' : 'doorClose'); }
    const tx = this.closedX + (this.dir === 'left' ? -1 : this.dir === 'right' ? 1 : 0) * this.travel * this.open;
    const ty = this.closedY + (this.dir === 'up' ? -1 : this.dir === 'down' ? 1 : 0) * this.travel * this.open;
    this.body.vx = (tx - this.body.x) / dt; this.body.vy = (ty - this.body.y) / dt;
    if (this.open === prev) { this.body.vx = 0; this.body.vy = 0; }
  }
  draw(ctx) {
    const b = this.body;
    ctx.fillStyle = this.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // stripes
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    if (b.h > b.w) for (let y = b.y + 8; y < b.bottom - 6; y += 14) ctx.fillRect(b.x + 3, y, b.w - 6, 4);
    else for (let x = b.x + 8; x < b.right - 6; x += 14) ctx.fillRect(x, b.y + 3, 4, b.h - 6);
    // indicator light
    ctx.fillStyle = this.open > 0.5 ? '#7ED37E' : '#E05555';
    ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 4, 0, Math.PI * 2); ctx.fill();
  }
}

/** Moving platform: kinematic body that patrols between two points; optional channel gate. */
export class MovingPlatform {
  constructor(x, y, w, h, x2, y2, opts = {}) {
    this.body = new Body({ type: BodyType.KINEMATIC, x, y, w, h, grabbable: false, portalable: false, pressesButtons: false, kind: 'platform' });
    this.body.tag = 'platform';
    this.body.oneWay = opts.oneWay ?? false;
    this.a = { x, y }; this.b = { x: x2, y: y2 };
    this.speed = opts.speed || 70;
    this.t = 0; this.dir = 1;
    this.requires = opts.requires || null;  // moves only while channel active
    this.returnWhenOff = opts.returnWhenOff ?? true;
    this.pause = 0;
    this.wait = opts.wait ?? 0.6;
    this.color = opts.color || '#8B6A44';
    this.len = Math.hypot(x2 - x, y2 - y) || 1;
  }
  update(dt, game) {
    const enabled = !this.requires || game.channels.test(this.requires);
    let px = this.body.x, py = this.body.y;
    if (enabled) {
      if (this.pause > 0) this.pause -= dt;
      else {
        this.t += (this.dir * this.speed * dt) / this.len;
        if (this.t >= 1) { this.t = 1; this.dir = -1; this.pause = this.wait; }
        if (this.t <= 0) { this.t = 0; this.dir = 1; this.pause = this.wait; }
      }
    } else if (this.returnWhenOff && this.t > 0) {
      this.t = Math.max(0, this.t - (this.speed * dt) / this.len); this.dir = 1;
    }
    const nx = lerp(this.a.x, this.b.x, this.t), ny = lerp(this.a.y, this.b.y, this.t);
    this.body.vx = (nx - px) / dt; this.body.vy = (ny - py) / dt;
    if (Math.abs(nx - px) < 1e-6 && Math.abs(ny - py) < 1e-6) { this.body.vx = 0; this.body.vy = 0; }
  }
  draw(ctx) {
    const b = this.body;
    ctx.fillStyle = this.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(b.x, b.y, b.w, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = '#F2C14E';
    for (let x = b.x + 6; x < b.right - 4; x += 12) ctx.fillRect(x, b.y + b.h - 5, 5, 2);
  }
}

/** Trigger: rectangular zone that fires a callback when the player enters. */
export class Trigger {
  constructor(x, y, w, h, onEnter, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.onEnter = onEnter; this.once = opts.once ?? true; this.fired = false; this.inside = false; this.onExit = opts.onExit;
  }
  update(dt, game) {
    const p = game.player.body;
    const inside = p.x < this.x + this.w && p.right > this.x && p.y < this.y + this.h && p.bottom > this.y;
    if (inside && !this.inside && !(this.once && this.fired)) { this.fired = true; this.onEnter(game); }
    if (!inside && this.inside && this.onExit) this.onExit(game);
    this.inside = inside;
  }
  draw() {}
}

/** Fan: pushes bodies (and the cat) upward in a column when active. */
export class Fan {
  constructor(x, y, w, h, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.requires = opts.requires || null; this.force = opts.force || 4200; this.t = 0; this.on = false;
  }
  update(dt, game) {
    this.on = !this.requires || game.channels.test(this.requires);
    if (!this.on) return;
    this.t += dt;
    const bodies = game.world.query(this.x, this.y, this.w, this.h, (b) => !b.dead && b.type !== BodyType.KINEMATIC);
    for (const b of bodies) {
      const depth = 1 - clamp((b.bottom - this.y) / this.h, 0, 1); // stronger near the fan
      const f = this.force * (0.6 + 0.4 * depth) / Math.max(1, b.mass * 0.25);   // must beat gravity (1700) for the cat (mass 4)
      b.vy -= f * dt;
      if (b.vy < -420) b.vy = -420;
      b.wake();
    }
    if (Math.random() < 0.5) game.effects.spawnParticle(this.x + Math.random() * this.w, this.y + this.h - 4, (Math.random() - 0.5) * 20, -180 - Math.random() * 120, 0.7, 'rgba(200,230,255,0.5)', 2);
  }
  draw(ctx) {
    // fan base at the bottom of the column
    const by = this.y + this.h;
    ctx.fillStyle = '#4A525E'; ctx.fillRect(this.x, by - 10, this.w, 10);
    ctx.fillStyle = '#2F353D';
    const blades = 4;
    for (let x = this.x + 10; x < this.x + this.w - 6; x += 20) {
      ctx.save(); ctx.translate(x, by - 5); ctx.rotate(this.on ? this.t * 25 : 0);
      for (let i = 0; i < blades; i++) { ctx.rotate(Math.PI * 2 / blades); ctx.fillRect(0, -1.2, 7, 2.4); }
      ctx.restore();
    }
    if (this.on) { ctx.fillStyle = 'rgba(180,220,255,0.10)'; ctx.fillRect(this.x, this.y, this.w, this.h); }
  }
}

/**
 * FieldGate: an electric field that can be switched off. The field is ON while its requirement is NOT met
 * (a plate/lever/button powers it down); `inverted` flips that. Implemented by writing EFIELD/EMPTY tiles into the
 * map, so the physics (bounce / tunneling / portal shots pass) is exactly that of a built-in field.
 * Safety: the field never re-forms while something is standing inside it.
 */
export class FieldGate {
  constructor(tx, ty, wTiles, hTiles, requires, opts = {}) {
    this.tx = tx; this.ty = ty; this.wT = wTiles; this.hT = hTiles;
    this.x = tx * TILE; this.y = ty * TILE; this.w = wTiles * TILE; this.h = hTiles * TILE;
    this.requires = requires; this.inverted = !!opts.inverted;
    this.on = null;           // unknown until the first update (forces the initial tile write)
    this.t = 1;               // visual 0..1 (fade)
  }
  wantOn(game) { const powered = game.channels.test(this.requires); return this.inverted ? powered : !powered; }
  update(dt, game) {
    let want = this.wantOn(game);
    if (want && this.on === false) {
      const blocked = game.world.query(this.x - 2, this.y - 2, this.w + 4, this.h + 4, (b) => !b.dead && b.type !== BodyType.KINEMATIC);
      if (blocked.length) want = false;      // wait until the passage is clear
    }
    if (want !== this.on) {
      const first = this.on === null;
      this.on = want;
      for (let cy = this.ty; cy < this.ty + this.hT; cy++) for (let cx = this.tx; cx < this.tx + this.wT; cx++) game.map.set(cx, cy, want ? T.EFIELD : T.EMPTY);
      game.tiles.build();
      if (!first) game.sfx(want ? 'fieldOn' : 'fieldOff');
    }
    this.t = lerp(this.t, this.on ? 1 : 0, Math.min(1, dt * 10));
  }
  draw(ctx, time) {
    // emitter caps stay visible when the field is down (so the player knows where the gate is) + a status lamp
    const vertical = this.hT >= this.wT;
    ctx.save();
    ctx.fillStyle = '#2F3742';
    if (vertical) { ctx.fillRect(this.x + 2, this.y - 6, this.w - 4, 8); ctx.fillRect(this.x + 2, this.y + this.h - 2, this.w - 4, 8); }
    else { ctx.fillRect(this.x - 6, this.y + 2, 8, this.h - 4); ctx.fillRect(this.x + this.w - 2, this.y + 2, 8, this.h - 4); }
    const lamp = this.on ? `rgba(120,215,255,${0.7 + 0.3 * Math.sin(time * 9)})` : 'rgba(90,110,120,0.8)';
    ctx.fillStyle = lamp;
    if (vertical) { ctx.fillRect(this.x + this.w / 2 - 3, this.y - 5, 6, 3); ctx.fillRect(this.x + this.w / 2 - 3, this.y + this.h + 2, 6, 3); }
    else { ctx.fillRect(this.x - 5, this.y + this.h / 2 - 3, 3, 6); ctx.fillRect(this.x + this.w + 2, this.y + this.h / 2 - 3, 3, 6); }
    if (!this.on && this.t > 0.02) { ctx.globalAlpha = this.t * 0.35; ctx.fillStyle = '#8FE3FF'; ctx.fillRect(this.x + 8, this.y, this.w - 16, this.h); }   // fading afterglow
    ctx.restore();
  }
}
