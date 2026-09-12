// Reusable puzzle components: PressurePlate, Button, Lever, Door, MovingPlatform, Trigger, Fan, FieldGate, Laser, LaserReceiver, Medium, Water.
// Components communicate through named "channels": an activator sets channel[name] = true/false,
// and receivers read the channel each frame. Multiple activators can be AND-ed by a door.
import { TILE, clamp, lerp } from '../core/util.js';
import { Body, BodyType } from '../physics/body.js';
import { T } from '../physics/tilemap.js';
import { PORTAL_HALF } from '../portals/portalManager.js';

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

/**
 * Players of a game (multiplayer: 1–2 cats). Each entry: { player, frameInput } — puzzles look at every cat and take
 * one-shot presses from the slot that pressed them. Works with plain test games that only have `player`/`frameInput`.
 */
export function playerSlots(game) {
  if (game.activeSlots) return game.activeSlots();
  return game.player ? [{ player: game.player, frameInput: game.frameInput || {} }] : [];
}
/** Is the cat's body near an E-interactable at (x,y,w,h)? */
function nearBox(p, x, y, w, h) { return p.x < x + w + 28 && p.right > x - 28 && p.y < y + h + 40 && p.bottom > y - 64; }

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
    let hit = false;
    for (const s of playerSlots(game)) {
      const near = nearBox(s.player.body, this.x, this.y, this.w, this.h);
      game.interactables.push({ x: this.x + this.w / 2, y: this.y, near, label: 'E', slot: s.index });
      if (near && s.frameInput.interactPressed) { hit = true; s.frameInput.interactPressed = false; }
    }
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
    for (const s of playerSlots(game)) {
      const near = nearBox(s.player.body, this.x, this.y, this.w, this.h);
      game.interactables.push({ x: this.x + this.w / 2, y: this.y, near, label: 'E', slot: s.index });
      if (near && s.frameInput.interactPressed) { s.frameInput.interactPressed = false; this.on = !this.on; game.sfx('lever'); s.player.playEmote('surprise', 0.3); }
    }
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
    const inside = playerSlots(game).some((s) => { const p = s.player.body; return p.x < this.x + this.w && p.right > this.x && p.y < this.y + this.h && p.bottom > this.y; });
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
 * FieldGate: a potential barrier that can be switched off. The field is ON while its requirement is NOT met
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
    if (want !== this.on) this.setOn(game, want);
    this.t = lerp(this.t, this.on ? 1 : 0, Math.min(1, dt * 10));
  }
  /** Write the field tiles for a new state (also used by the network sync so tiles never disagree with `on`). */
  setOn(game, want) {
    const first = this.on === null;
    this.on = want;
    const cells = [];
    for (let cy = this.ty; cy < this.ty + this.hT; cy++) for (let cx = this.tx; cx < this.tx + this.wT; cx++) { game.map.set(cx, cy, want ? T.EFIELD : T.EMPTY); cells.push([cx, cy]); }
    if (game.tiles) game.tiles.updateCells(cells);
    if (!first) game.sfx(want ? 'fieldOn' : 'fieldOff');
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

/**
 * Laser: a wall-mounted emitter that shoots a red beam in direction (dx,dy). The beam
 *  - stops at solid tiles (grates and potential barriers let it pass),
 *  - is reflected 90° by 'mirror' props (mirrorDir +1 = '/', -1 = '\\'),
 *  - travels through linked portals (position & direction transformed),
 *  - is blocked by other bodies (a crate can shield a receiver), the cat included (harmless: no damage in this game),
 *  - powers every LaserReceiver it hits. `requires` (optional) switches the emitter on/off by channel.
 */
export class Laser {
  constructor(x, y, dx, dy, opts = {}) {
    // direction may be any unit vector (axis-aligned emitters or tilted ones — see LevelKit.laser with an angle)
    this.x = x; this.y = y;
    const l = Math.hypot(dx, dy) || 1; this.dx = dx / l; this.dy = dy / l;
    this.requires = opts.requires || null; this.inverted = !!opts.inverted;
    this.on = false; this.segments = []; this.hitBodies = new Set();
    this.color = opts.color || '#FF4A4A';
  }
  update(dt, game) {
    let on = !this.requires || game.channels.test(this.requires); if (this.inverted) on = !on;
    this.on = on; this.segments = []; this._skip = null;
    for (const b of this.hitBodies) b.laserLit = false; this.hitBodies.clear();
    if (!on) return;
    const map = game.map, world = game.world, portals = game.portals;
    let ox = this.x, oy = this.y, dx = this.dx, dy = this.dy;
    const passShot = (cx, cy) => { const t = map.get(cx, cy); return map.blocksShot(t) && !map.isField(t); };
    // per-frame cache shared by all lasers of the level: which puzzles/bodies can interact with a beam
    let oc = game._optics;
    if (!oc || oc.frame !== game.frameId || game.frameId === undefined) {
      oc = game._optics = { frame: game.frameId, media: [], targets: [], bodies: [] };
      for (const q of game.puzzles) {
        if (q instanceof Medium) oc.media.push(q);
        else if (q instanceof LaserReceiver) oc.targets.push({ box: q.box, receiver: q });
        else if (q instanceof Door) oc.targets.push({ box: q.body, receiver: null });
      }
      for (const b of world.bodies) if (!b.dead && b.type !== BodyType.KINEMATIC && b.kind !== 'cat') oc.bodies.push(b);
    }
    const media = oc.media;
    const indexAt = (x, y) => { for (const m of media) if (m.contains(x, y)) return m.n; return 1; };
    for (let bounce = 0; bounce < 16; bounce++) {
      const n1 = indexAt(ox, oy);
      // nearest tile hit (ignoring the tiles of a portal aperture on the beam's way — handled below) and nearest body hit
      const tileHit = map.raycast(ox, oy, dx, dy, 4000, null, passShot);
      const maxD = tileHit ? tileHit.dist : 4000;
      let bodyHit = null;
      for (const b of oc.bodies) {
        if (b === this._skip) continue;   // (the cat is never in the list: it never blocks a beam — no damage, no confusion)
        // mirrors get a forgiving 8 px margin so the cube does not have to sit exactly under the beam
        const t = rayBoxT(ox, oy, dx, dy, b.kind === 'mirror' ? padBox(b, 8) : b, bodyHit ? bodyHit.dist : maxD);
        if (t !== null && t > 0.5) bodyHit = { dist: t, body: b };
      }
      // receivers (not physics bodies) and closed doors
      for (const q of oc.targets) {
        const t = rayBoxT(ox, oy, dx, dy, q.box, bodyHit ? bodyHit.dist : maxD);
        if (t !== null && t > 0.5) bodyHit = { dist: t, body: q.box, receiver: q.receiver };
      }
      // portal on the way? (beam crosses a portal plane inside its span)
      let portalHit = null;
      if (portals && portals.linked) {
        for (const p of portals.pair) {
          const denom = dx * p.nx + dy * p.ny; if (denom >= 0) continue;   // must travel INTO the portal (against its normal)
          const t = ((p.x - ox) * p.nx + (p.y - oy) * p.ny) / denom;
          if (t < 0.5 || t > (bodyHit ? bodyHit.dist : maxD) + 1) continue;
          const hx = ox + dx * t, hy = oy + dy * t;
          if (Math.abs(p.along(hx, hy)) > PORTAL_HALF) continue;
          if (!portalHit || t < portalHit.dist) portalHit = { dist: t, portal: p, hx, hy };
        }
      }
      // boundary of an optical medium on the way? (refraction — Snell's law; total internal reflection when leaving a
      // dense medium at a grazing angle)
      let mediumHit = null;
      { const limit = Math.min(bodyHit ? bodyHit.dist : maxD, portalHit ? portalHit.dist : maxD);
        for (const m of media) {
          const t = m.boundaryT(ox, oy, dx, dy);
          if (t !== null && t > 0.5 && t < limit - 1 && (!mediumHit || t < mediumHit.dist)) mediumHit = { dist: t, medium: m };   // (-1: a boundary flush with a wall is just the wall)
        } }
      if (mediumHit) {
        const hx = ox + dx * mediumHit.dist, hy = oy + dy * mediumHit.dist;
        const m = mediumHit.medium;
        const nrm = m.normalAt(hx, hy);                               // outward normal of the medium's boundary
        const n2 = indexAt(hx + dx * 0.5, hy + dy * 0.5);
        this.segments.push({ x0: ox, y0: oy, x1: hx, y1: hy, n: n1, refract: Math.abs(n1 - n2) > 0.02 });
        // Snell: n1 sin i = n2 sin r, with the normal pointing against the incoming ray
        let nx = nrm.x, ny = nrm.y; if (dx * nx + dy * ny > 0) { nx = -nx; ny = -ny; }
        const cosI = -(dx * nx + dy * ny), eta = n1 / n2;
        const k = 1 - eta * eta * (1 - cosI * cosI);
        if (k < 0) { dx = dx + 2 * cosI * nx; dy = dy + 2 * cosI * ny; }                              // total internal reflection
        else { const f = eta * cosI - Math.sqrt(k); dx = eta * dx + f * nx; dy = eta * dy + f * ny; }
        const l = Math.hypot(dx, dy); dx /= l; dy /= l;
        ox = hx + dx * 0.6; oy = hy + dy * 0.6; this._skip = null;
        continue;
      }
      if (portalHit && (!bodyHit || portalHit.dist <= bodyHit.dist)) {
        // the portal "focuses" the beam: it enters anywhere within the aperture and leaves from the other portal's centre
        // (forgiving for puzzles — no pixel-perfect portal placement needed)
        const a = portalHit.portal, b = portals.other(a), tr = portals.transform(a, b);
        this.segments.push({ x0: ox, y0: oy, x1: a.x, y1: a.y, n: n1 }); this._skip = null;
        const v = tr.vec(dx, dy); const vl = Math.hypot(v.x, v.y) || 1; dx = v.x / vl; dy = v.y / vl;
        ox = b.x + b.nx * 2; oy = b.y + b.ny * 2;
        continue;
      }
      if (bodyHit) {
        const b = bodyHit.body, hx = ox + dx * bodyHit.dist, hy = oy + dy * bodyHit.dist;
        this.segments.push({ x0: ox, y0: oy, x1: hx, y1: hy, n: n1 });
        b.laserLit = true; this.hitBodies.add(b);
        if (bodyHit.receiver) { bodyHit.receiver.hit = true; break; }
        if (b.kind === 'mirror') {
          // '/' : (1,0)→(0,-1), (0,1)→(-1,0), (-1,0)→(0,1), (0,-1)→(1,0);   '\\' : (1,0)→(0,1), (0,-1)→(-1,0), (-1,0)→(0,-1), (0,1)→(1,0)
          const m = b.mirrorDir || 1;
          const ndx = m > 0 ? -dy : dy, ndy = m > 0 ? -dx : dx;
          dx = ndx; dy = ndy;
          // restart the beam from the mirror centre (nicer look) and skip this mirror for the next cast
          this.segments[this.segments.length - 1].x1 = b.cx; this.segments[this.segments.length - 1].y1 = b.cy;
          ox = b.cx; oy = b.cy; this._skip = b;
          continue;
        }
        break;
      }
      const ex = tileHit ? tileHit.x : ox + dx * 4000, ey = tileHit ? tileHit.y : oy + dy * 4000;
      this.segments.push({ x0: ox, y0: oy, x1: ex, y1: ey, n: n1 });
      break;
    }
  }
  draw(ctx, time) {
    // emitter housing
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.dy, this.dx));
    ctx.fillStyle = '#3D4854'; ctx.fillRect(-14, -9, 16, 18);
    ctx.fillStyle = '#2A313A'; ctx.fillRect(-2, -5, 6, 10);
    ctx.fillStyle = this.on ? this.color : '#7A3A3A'; ctx.beginPath(); ctx.arc(2, 0, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!this.on) return;
    const pulse = 0.85 + 0.15 * Math.sin(time * 30);
    ctx.save(); ctx.lineCap = 'round';
    for (const s of this.segments) {
      // inside a dense medium the beam scatters: a wider, softer halo (light travels slower there — hence the bend)
      const dense = (s.n || 1) > 1.02, halo = dense ? 12 : 7, ha = dense ? 0.32 : 0.25;
      ctx.strokeStyle = `rgba(255,70,70,${ha * pulse})`; ctx.lineWidth = halo; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      ctx.strokeStyle = `rgba(255,120,120,${0.9 * pulse})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,240,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke();
      // impact glow at the end
      ctx.fillStyle = `rgba(255,140,140,${0.7 * pulse})`; ctx.beginPath(); ctx.arc(s.x1, s.y1, 4 + Math.sin(time * 40), 0, Math.PI * 2); ctx.fill();
      if (s.refract) {
        // teaching aid: a faint dashed "ghost" of where the beam WOULD have gone without the bend
        const l = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1, ux = (s.x1 - s.x0) / l, uy = (s.y1 - s.y0) / l;
        ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,200,200,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x1 + ux * 140, s.y1 + uy * 140); ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  }
}

/**
 * Medium: a rectangular zone with a refractive index `n` (an "optically dense" room). A laser beam crossing its boundary
 * bends according to Snell's law (n1·sin i = n2·sin r); leaving a dense medium at a grazing angle reflects it back
 * (total internal reflection). Physics bodies are unaffected — this is purely optical.
 * `requires`: when set, the medium is dense only while the channel is on (a valve/pump); the index fades smoothly, so the
 * beam visibly sweeps as the room fills. Draws a tinted haze with drifting particles and a readout of the current n.
 */
export class Medium {
  constructor(x, y, w, h, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.nDense = opts.n || 1.5; this.requires = opts.requires || null; this.inverted = !!opts.inverted;
    this.color = opts.color || '#63C7D9'; this.label = opts.label ?? 'ПЛОТНОСТЬ';
    this.on = !this.requires; this.t = this.on ? 1 : 0; this.n = this.on ? this.nDense : 1;
    this.seed = ((x * 7 + y * 13) | 0) % 97;
  }
  get right() { return this.x + this.w; } get bottom() { return this.y + this.h; }
  get top() { return this.y; }             // Water overrides this with its moving surface
  contains(px, py) { return this.t > 0.001 && px > this.x && px < this.right && py > this.top && py < this.bottom; }
  /** Distance along the ray to the next boundary crossing of this rect (entry when outside, exit when inside). */
  boundaryT(ox, oy, dx, dy) {
    if (this.t <= 0.001) return null;
    let tmin = -Infinity, tmax = Infinity;
    if (Math.abs(dx) < 1e-9) { if (ox <= this.x || ox >= this.right) return null; } else { let a = (this.x - ox) / dx, b = (this.right - ox) / dx; if (a > b) [a, b] = [b, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
    if (Math.abs(dy) < 1e-9) { if (oy <= this.top || oy >= this.bottom) return null; } else { let a = (this.top - oy) / dy, b = (this.bottom - oy) / dy; if (a > b) [a, b] = [b, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
    if (tmax < 0 || tmin > tmax) return null;
    const inside = ox > this.x && ox < this.right && oy > this.top && oy < this.bottom;
    return inside ? tmax : (tmin > 0 ? tmin : null);
  }
  /** Outward normal of the boundary face closest to (px,py). */
  normalAt(px, py) {
    const d = [[px - this.x, -1, 0], [this.right - px, 1, 0], [py - this.top, 0, -1], [this.bottom - py, 0, 1]];
    d.sort((a, b) => a[0] - b[0]);
    return { x: d[0][1], y: d[0][2] };
  }
  update(dt, game) {
    let want = !this.requires || game.channels.test(this.requires); if (this.inverted) want = !want;
    if (want !== this.on) { this.on = want; game.sfx(want ? 'fieldOn' : 'fieldOff'); }
    this.t = lerp(this.t, this.on ? 1 : 0, Math.min(1, dt * 1.6));
    if (Math.abs(this.t - (this.on ? 1 : 0)) < 0.004) this.t = this.on ? 1 : 0;
    this.n = 1 + (this.nDense - 1) * this.t;
  }
  /** Behind bodies: boundary frame + readout. */
  draw(ctx, time) {
    const a = 0.25 + 0.55 * this.t;
    ctx.save();
    ctx.strokeStyle = this.color; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 20;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    ctx.setLineDash([]);
    // readout plaque in the top-left corner
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(20,26,34,0.85)'; ctx.fillRect(this.x + 6, this.y + 6, 92, 30);
    ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.strokeRect(this.x + 6.5, this.y + 6.5, 92, 30);
    ctx.fillStyle = this.color; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(this.label, this.x + 11, this.y + 17);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px monospace'; ctx.fillText(`n = ${this.n.toFixed(2)}`, this.x + 11, this.y + 31);
    ctx.restore();
  }
  /** Over everything (the cat walks INSIDE the haze). */
  drawOverlay(ctx, time) {
    if (this.t <= 0.001) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(this.x, this.y, this.w, this.h); ctx.clip();
    const grad = ctx.createLinearGradient(0, this.y, 0, this.bottom); grad.addColorStop(0, this.color); grad.addColorStop(1, '#2A6F86');
    ctx.fillStyle = grad; ctx.globalAlpha = 0.26 * this.t; ctx.fillRect(this.x, this.y, this.w, this.h);
    // the "surface" of the gas: a wavy bright line along the top edge
    ctx.globalAlpha = 0.8 * this.t; ctx.strokeStyle = '#E6FBFF'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= this.w; x += 6) { const y = this.y + 1.5 + Math.sin(x * 0.11 + time * 2.2) * 1.6; if (x === 0) ctx.moveTo(this.x + x, y); else ctx.lineTo(this.x + x, y); }
    ctx.stroke();
    // slow drifting motes
    ctx.globalAlpha = 0.5 * this.t; ctx.fillStyle = '#E6FBFF';
    const count = Math.min(60, Math.floor(this.w * this.h / 2600));
    for (let i = 0; i < count; i++) {
      const s = (i * 37 + this.seed * 11) % 101 / 101, s2 = (i * 53 + this.seed * 7) % 97 / 97;
      const px = this.x + ((s * this.w + Math.sin(time * 0.5 + i) * 10 + time * 6 * (0.3 + s2)) % this.w + this.w) % this.w;
      const py = this.y + ((s2 * this.h + Math.cos(time * 0.4 + i * 1.7) * 6) % this.h + this.h) % this.h;
      ctx.fillRect(px, py, 2, 2);
    }
    // shimmering boundary curtain
    ctx.globalAlpha = 0.35 * this.t; ctx.strokeStyle = '#C8F4FF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(this.x + 1.5, this.y); ctx.lineTo(this.x + 1.5, this.bottom); ctx.moveTo(this.right - 1.5, this.y); ctx.lineTo(this.right - 1.5, this.bottom); ctx.stroke();
    ctx.restore();
  }
}

/**
 * Water: a tank/pool zone. Bodies inside get buoyancy (by their `density`) and drag (see World.substep); the cat swims.
 * `level` 0..1 is how full the tank is (the surface is at `top`); with `requires` the tank fills while the channel is
 * on (or drains, with `inverted`) at `speed` (fraction per second). It is also an optical Medium (n = 1.33): lasers
 * bend at the surface. Draws a gauge plaque behind bodies and the translucent water over them.
 */
export class Water extends Medium {
  constructor(x, y, w, h, opts = {}) {
    super(x, y, w, h, { n: 1.33, requires: opts.requires, inverted: opts.inverted, color: opts.color || '#3FA7E0', label: opts.label ?? 'ВОДА' });
    this.levelFull = opts.level ?? 1; this.levelEmpty = opts.levelEmpty ?? 0; this.speed = opts.speed || 0.12;
    this.level = this.on ? this.levelFull : this.levelEmpty;
    this.t = this.level > 0.001 ? 1 : 0; this.n = 1.33;
    this.flow = 0;      // -1 draining, 0 still, +1 filling (for sound/visuals)
  }
  get top() { return this.bottom - this.h * this.level; }
  /** 0..1 how much of the body is below the surface (0 when the body is horizontally outside the tank). */
  submersion(b) {
    if (this.level <= 0.001 || b.cx <= this.x || b.cx >= this.right) return 0;
    const over = Math.min(b.bottom, this.bottom) - Math.max(b.y, this.top);
    return over <= 0 ? 0 : Math.min(1, over / b.h);
  }
  update(dt, game) {
    let want = !this.requires || game.channels.test(this.requires); if (this.inverted) want = !want;
    if (want !== this.on) { this.on = want; game.sfx('valve'); }
    const target = this.on ? this.levelFull : this.levelEmpty;
    const prev = this.level;
    this.level = target > this.level ? Math.min(target, this.level + this.speed * dt) : Math.max(target, this.level - this.speed * dt);
    this.flow = this.level > prev ? 1 : this.level < prev ? -1 : 0;
    this.t = this.level > 0.001 ? 1 : 0; this.n = 1.33;
  }
  draw(ctx, time) {
    // tank outline (dashed) + gauge
    ctx.save();
    ctx.strokeStyle = 'rgba(120,200,240,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -time * 10;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2); ctx.setLineDash([]);
    if (this.requires) {
      ctx.fillStyle = 'rgba(20,26,34,0.85)'; ctx.fillRect(this.x + 6, this.y + 6, 78, 30);
      ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.strokeRect(this.x + 6.5, this.y + 6.5, 78, 30);
      ctx.fillStyle = this.color; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(this.label, this.x + 11, this.y + 17);
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 12px monospace';
      ctx.fillText(`${Math.round(this.level * 100)} %${this.flow > 0 ? ' ▲' : this.flow < 0 ? ' ▼' : ''}`, this.x + 11, this.y + 31);
    }
    ctx.restore();
  }
  drawOverlay(ctx, time) {
    if (this.level <= 0.001) return;
    const top = this.top, h = this.bottom - top;
    ctx.save();
    ctx.beginPath(); ctx.rect(this.x, top - 4, this.w, h + 4); ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, this.bottom); g.addColorStop(0, 'rgba(90,190,240,0.40)'); g.addColorStop(1, 'rgba(20,80,150,0.60)');
    ctx.fillStyle = g; ctx.fillRect(this.x, top, this.w, h);
    // caustic streaks
    ctx.globalAlpha = 0.10; ctx.strokeStyle = '#DFF6FF'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.max(2, this.w / 48); i++) {
      const sx = this.x + ((i * 53 + this.seed * 3) % this.w), ph = time * 0.8 + i;
      ctx.beginPath(); ctx.moveTo(sx + Math.sin(ph) * 6, top + 6); ctx.lineTo(sx + Math.cos(ph * 0.7) * 10, this.bottom - 4); ctx.stroke();
    }
    // bubbles
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#EAFBFF';
    const count = Math.min(40, Math.floor(this.w * h / 4000)) + (this.flow ? 12 : 0);
    for (let i = 0; i < count; i++) {
      const s = (i * 37 + this.seed * 11) % 101 / 101, s2 = (i * 53 + this.seed * 7) % 97 / 97;
      const bx = this.x + s * this.w + Math.sin(time * 1.5 + i) * 3;
      const by = this.bottom - (((s2 * h + time * (14 + s * 20)) % h) + h) % h;
      if (by > top + 2) { ctx.beginPath(); ctx.arc(bx, by, 1 + s2 * 1.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // surface: bright wavy line + foam highlight
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#EAFBFF'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= this.w; x += 5) { const y = top + Math.sin(x * 0.09 + time * 2.6) * 1.8 + Math.sin(x * 0.031 - time * 1.7) * 1.2; if (x === 0) ctx.moveTo(this.x + x, y); else ctx.lineTo(this.x + x, y); }
    ctx.stroke();
    ctx.restore();
  }
}

/** LaserReceiver: a wall-mounted sensor; sets its channel while a beam hits it. `latch` keeps it on. */
export class LaserReceiver {
  constructor(x, y, channel, opts = {}) {
    // latch (default): once lit the receiver stays on — the cat crossing a beam must never lock a door behind it
    this.x = x; this.y = y; this.channel = channel; this.on = false; this.latch = opts.latch ?? true; this.t = 0; this.hit = false;
    this.nx = opts.nx ?? 0; this.ny = opts.ny ?? -1;   // which way the sensor faces (for drawing)
    // sensor box used by Laser ray tests (not a physics body); generous: roughly one tile
    const hs = (opts.size || 30) / 2;
    this.size = hs * 2;
    this.box = { x: x - hs, y: y - hs, w: hs * 2, h: hs * 2, get right() { return this.x + this.w; }, get bottom() { return this.y + this.h; }, kind: 'receiver' };
  }
  update(dt, game) {
    const hit = this.hit; this.hit = false;
    const now = this.latch ? (this.on || hit) : hit;
    if (now !== this.on) { this.on = now; game.sfx(now ? 'laserOn' : 'laserOff'); }
    game.channels.set(this.channel, this.on);
    this.t = lerp(this.t, this.on ? 1 : 0, Math.min(1, dt * 10));
  }
  draw(ctx, time) {
    // drawn in a local frame where -y points along the facing normal (towards the incoming beam)
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.ny, this.nx) + Math.PI / 2);
    const hw = this.size / 2;
    ctx.fillStyle = '#3D4854'; ctx.fillRect(-hw, -2, hw * 2, 12);          // base plate on the wall
    ctx.fillStyle = '#2A313A'; ctx.beginPath(); ctx.moveTo(-hw + 2, -2); ctx.lineTo(hw - 2, -2); ctx.lineTo(hw * 0.6, -10); ctx.lineTo(-hw * 0.6, -10); ctx.closePath(); ctx.fill();   // dish
    // target rings so the player sees the sensitive area
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(-hw + 0.5, -hw + 0.5, hw * 2 - 1, hw * 2 - 1);
    const c = this.on ? `rgba(120,255,140,${0.8 + 0.2 * Math.sin(time * 12)})` : `rgba(255,90,90,${0.6 + 0.2 * Math.sin(time * 4)})`;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
    if (this.on) { ctx.shadowColor = '#7EFF9A'; ctx.shadowBlur = 12; ctx.fill(); }
    ctx.restore();
  }
}

function padBox(b, p) { return { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p, right: b.right + p, bottom: b.bottom + p }; }
// ray vs body AABB (slab test); returns distance or null
function rayBoxT(ox, oy, dx, dy, b, maxT) {
  let tmin = -Infinity, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) { if (ox < b.x || ox > b.right) return null; } else { let t1 = (b.x - ox) / dx, t2 = (b.right - ox) / dx; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
  if (Math.abs(dy) < 1e-9) { if (oy < b.y || oy > b.bottom) return null; } else { let t1 = (b.y - oy) / dy, t2 = (b.bottom - oy) / dy; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
  if (tmax < 0 || tmin > tmax || tmin > maxT) return null;
  return Math.max(tmin, 0);
}
