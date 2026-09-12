// Network protocol shared by the server (authoritative, headless Game) and the browser client (same Game class).
//
// Messages (JSON text frames over one WebSocket):
//   client → server   { t: 'hello' }                       join the session (server assigns the first free slot)
//                     { t: 'input', ...packInput(inp) }    this player's input for the frame (held keys, one-shot presses, aim)
//                     { t: 'ui', action, arg }             menu actions: 'restart' | 'next' | 'menu' | 'level' (arg = index)
//   server → client   { t: 'welcome', slot, players }       your slot index (0 = player 1 / orange, 1 = player 2 / black)
//                     { t: 'full' }                        session already has 2 players
//                     { t: 'state', ...snapshot }          authoritative world snapshot (every server tick)
//
// The snapshot is a full state description (not a delta) so a client can join or lag at any time. Everything that
// is not derivable by the client's own simulation is in it: level id/sequence, session state, cats (position,
// velocity, animation, weapon + held object, tunneling), all dynamic bodies (by netId), portals, puzzle state,
// channels, gifts/pickups, broken tiles, dead bodies, and each player's held input (so the partner cat moves
// smoothly between ticks).
import { blankInput } from '../core/playerSlot.js';

const R = (v) => Math.round(v * 10) / 10;
// plain-value fields of puzzle objects that the server pushes to the clients (whatever exists on the object)
const PUZZLE_KEYS = ['on', 'pressed', 'press', 'open', 't', 'level', 'fired', 'inside', 'anim', 'timer', 'dir', 'pause', 'hit', 'flow', 'wasOpen', 'n'];
const PLAYER_KEYS = ['facing', 'anim', 'animTime', 'crouching', 'climbing', 'swimming', 'running', 'tunneling', 'tunnelUnlocked', 'onGround', 'emote', 'emoteTimer', 'aimX', 'aimY', 'wet', 'tunnelFx'];
const HELD_INPUT = ['left', 'right', 'up', 'down', 'jump', 'run', 'mouseWorldX', 'mouseWorldY'];

/**
 * Build the authoritative snapshot of a running game. `full` includes sleeping bodies too (sent periodically and to
 * newcomers); otherwise only bodies that are awake or held travel, which keeps the 30 Hz stream small.
 */
export function encodeState(game, full = true) {
  const snap = { t: 'state', seq: game.levelSeq, level: game.level ? game.levelIndex : -1, state: game.state, time: R(game.time),
    ldt: game.levelDoneTimer ?? -1, ct: game.completeTimer ?? 0, broken: game.brokenCount || 0, wd: game.worldDoneWorld || 0 };
  snap.slots = game.slots.map((s) => {
    if (!s.connected) return { c: 0 };
    const p = s.player; if (!p) return { c: 1 };
    const w = s.weapons, b = p.body;
    const o = { c: 1, x: R(b.x), y: R(b.y), vx: R(b.vx), vy: R(b.vy), h: b.h };
    for (const k of PLAYER_KEYS) o[k] = typeof p[k] === 'number' ? R(p[k]) : p[k];
    o.w = { cur: w.current, g: w.available.gravity, p: w.available.portal, held: w.held ? w.held.netId : 0, pull: w.pulling ? w.pulling.netId : 0, lpc: w.lastPortalColor, ang: R(w.gunAngle), ax: R(w.aim.x), ay: R(w.aim.y) };
    const inp = s.input || {}; o.i = {}; for (const k of HELD_INPUT) o.i[k] = typeof inp[k] === 'number' ? R(inp[k]) : !!inp[k];
    return o;
  });
  if (!game.level) return snap;
  snap.bodies = [];
  for (const b of game.world.bodies) {
    if (b.dead || b.kind === 'cat' || b.type === 'kinematic' || !b.netId) continue;
    if (!full && b.asleep && !b.held) continue;
    snap.bodies.push([b.netId, R(b.x), R(b.y), R(b.vx), R(b.vy), R(b.angle), R(b.spin), b.mirrorDir || 0, b.asleep ? 1 : 0]);
  }
  snap.dead = game.deadNetIds || [];
  snap.portals = game.portals.pair.map((p) => (p.active ? { a: 1, x: p.x, y: p.y, nx: p.nx, ny: p.ny, tx: p.tx, ty: p.ty, tiles: [...p.tiles], extra: p.extraSolids, o: R(p.openT) } : { a: 0 }));
  snap.puzzles = game.puzzles.map((q) => {
    const o = {};
    for (const k of PUZZLE_KEYS) if (k in q && (typeof q[k] !== 'object' || q[k] === null)) o[k] = typeof q[k] === 'number' ? R(q[k]) : q[k];
    if (q.body) { o.bx = R(q.body.x); o.by = R(q.body.y); o.bvx = R(q.body.vx); o.bvy = R(q.body.vy); }
    return o;
  });
  snap.ch = [...game.channels.map.entries()].filter((e) => e[1]).map((e) => e[0]);
  snap.gifts = game.gifts.map((g) => (g.collected ? 1 : 0));
  snap.picks = game.pickups.map((p) => (p.taken ? (p.takenBy ?? 0) + 1 : 0));
  snap.gc = game.giftsCollected;
  snap.tiles = game.tileChanges || [];
  return snap;
}

/**
 * Apply a snapshot to a client game. Loads the level when the server's level/sequence differs, adds/removes cats
 * as players join/leave, then overwrites the authoritative parts of the world. The client keeps simulating between
 * snapshots (same code as the server), so only corrections are visible.
 */
export function applyState(game, snap, ctx) {
  // ---- level / session
  if (snap.level < 0) { game.state = snap.state === 'select' ? 'select' : game.state; return; }
  if (game.levelIndex !== snap.level || ctx.seq !== snap.seq || !game.level) {
    for (const s of game.slots) s.connected = !!(snap.slots[s.index] && snap.slots[s.index].c);
    game.loadLevel(snap.level, { keepMessage: ctx.seq !== undefined && game.levelIndex === snap.level });
    ctx.seq = snap.seq; ctx.tilesApplied = 0;
    indexBodies(game);
  }
  // ---- players join / leave
  snap.slots.forEach((ss, i) => {
    const slot = game.slots[i];
    if (ss.c && !slot.connected) game.addPlayer(i);
    else if (!ss.c && slot.connected) game.removePlayer(i);
    if (ss.c && !slot.player) game.addPlayer(i);
  });
  if (!game.netBodies) indexBodies(game);
  // ---- state machine (a local pause is kept; the world underneath keeps syncing)
  const wasDone = game.levelDoneTimer >= 0;
  if (!(game.state === 'paused' && snap.state === 'playing')) {
    if (snap.state === 'select' && game.state !== 'select') { game.menuIndex = game.levelIndex; game.audio.stopMusic(); }
    if (snap.state === 'worldDone' && game.state !== 'worldDone') { game.worldDoneWorld = snap.wd; game.worldDoneTimer = 0; game.audio.play('gift'); }
    if (snap.state !== 'select' || game.state !== 'title') game.state = snap.state;
  }
  if (snap.ldt >= 0 && !wasDone) game.finishLevel();       // local celebration + progress save
  game.levelDoneTimer = snap.ldt; game.completeTimer = snap.ct; game.brokenCount = snap.broken;
  // ---- tiles broken since level load (cumulative list)
  if (snap.tiles.length > (ctx.tilesApplied || 0)) {
    const cells = [];
    for (let i = ctx.tilesApplied || 0; i < snap.tiles.length; i++) { const [cx, cy, t] = snap.tiles[i]; game.map.set(cx, cy, t); cells.push([cx, cy]); }
    game.tiles.updateCells(cells); ctx.tilesApplied = snap.tiles.length;
    game.audio.play('break'); game.effects.shake(6);
  }
  // ---- channels & puzzles
  game.channels.map.clear(); for (const c of snap.ch) game.channels.map.set(c, true);
  snap.puzzles.forEach((o, i) => {
    const q = game.puzzles[i]; if (!q) return;
    if (q.setOn && 'on' in o && o.on !== q.on) q.setOn(game, o.on);                 // FieldGate rewrites tiles
    for (const k of PUZZLE_KEYS) if (k in o && k !== 'inside') q[k] = o[k];
    if (q.body && 'bx' in o) { q.body.x = o.bx; q.body.y = o.by; q.body.vx = o.bvx; q.body.vy = o.bvy; }
  });
  // ---- portals
  snap.portals.forEach((o, i) => {
    const p = game.portals.pair[i];
    if (!o.a) { if (p.active) { p.active = false; p.tiles.clear(); p.extraSolids = []; } return; }
    const fresh = !p.active || p.x !== o.x || p.y !== o.y || p.nx !== o.nx || p.ny !== o.ny;
    p.active = true; p.x = o.x; p.y = o.y; p.nx = o.nx; p.ny = o.ny; p.tx = o.tx; p.ty = o.ty; p.tiles = new Set(o.tiles); p.extraSolids = o.extra;
    if (fresh) { p.openT = Math.min(p.openT, o.o); p.age = 0; }
  });
  // ---- dynamic bodies
  const nb = game.netBodies;
  for (const a of snap.bodies) {
    const b = nb.get(a[0]); if (!b) continue;
    b.x = a[1]; b.y = a[2]; b.vx = a[3]; b.vy = a[4]; b.angle = a[5]; b.spin = a[6]; if (a[7]) b.mirrorDir = a[7]; b.asleep = !!a[8]; b.px = b.x; b.py = b.y;
  }
  for (const id of snap.dead) { const b = nb.get(id); if (b && !b.dead) { b.dead = true; game.onBreak(b); } }
  // ---- cats
  snap.slots.forEach((ss, i) => {
    const slot = game.slots[i]; if (!ss.c || !slot.player || ss.x === undefined) return;
    const p = slot.player, b = p.body, w = slot.weapons;
    // reconciliation: the client predicted this cat with the same code, so the usual difference is a frame or two of
    // movement — blend softly; snap only when clearly off (teleport, respawn, push by the partner)
    const dx = ss.x - b.x, dy = ss.y - b.y, far = Math.hypot(dx, dy) > 40;
    if (far) { b.x = ss.x; b.y = ss.y; } else { b.x += dx * 0.35; b.y += dy * 0.35; }
    b.vx = ss.vx; b.vy = ss.vy; b.px = b.x; b.py = b.y;
    if (b.h !== ss.h) { b.h = ss.h; }
    for (const k of PLAYER_KEYS) if (k in ss) p[k] = ss[k];
    b.tunneling = p.tunneling;
    if (ss.w) {
      const ws = ss.w;
      w.available.gravity = !!ws.g; w.available.portal = !!ws.p;
      if (ws.cur !== w.current) { if (ws.cur && w.available[ws.cur]) w.select(ws.cur); else if (!ws.cur) w.current = null; }
      w.lastPortalColor = ws.lpc; w.gunAngle = ws.ang; if (slot.index !== game.localSlot) { w.aim.x = ws.ax; w.aim.y = ws.ay; }
      const held = ws.held ? nb.get(ws.held) : null;
      if (w.held !== held) {
        if (w.held) { w.held.held = false; w.held.holder = null; }
        w.held = held; w.pulling = null;
        if (held) { held.held = true; held.holder = b; held.wake(); }
      }
      const pull = ws.pull ? nb.get(ws.pull) : null;
      if (!held && w.pulling !== pull) w.pulling = pull;
    }
    if (ss.i && slot.index !== game.localSlot) slot.input = { ...blankInput(), ...slot.input, ...ss.i };   // partner's held keys
  });
  // ---- gifts / pickups
  snap.gifts.forEach((c, i) => { const g = game.gifts[i]; if (c && g && !g.collected) { g.collected = true; game.onGiftCollected(g, game.player); } });
  snap.picks.forEach((c, i) => { const p = game.pickups[i]; if (c && p && !p.taken) game.takePickup(p, game.slots[c - 1] || game.localPlayerSlot); });
  game.giftsCollected = snap.gc;
  game.time = snap.time;
}

/** netId → body lookup for the current level. */
export function indexBodies(game) {
  game.netBodies = new Map();
  for (const b of game.world.bodies) if (b.netId) game.netBodies.set(b.netId, b);
}
