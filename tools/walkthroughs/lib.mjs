// Shared helpers for level walkthroughs. RULES: only real inputs — walking, jumping, climbing, aiming at things that are
// actually on screen — never teleport the cat. If a script needs to cheat to progress, the level is broken.
import { createGame, Driver } from '../harness.mjs';

export const T = 32;

export async function begin(levelIndex) {
  const { game, canvas } = await createGame();
  const d = new Driver(game, canvas);
  d.startLevel(levelIndex); d.step(60);
  const p = d.p;
  const log = [];
  const t0 = Date.now();
  const w = {
    game, d, p, log,
    fails: 0,
    where(label) { const s = `${label}: x ${(p.body.cx / T).toFixed(1)} y ${(p.body.bottom / T).toFixed(1)} ground ${p.body.onGround} gifts ${game.giftsCollected}`; console.log(s); return s; },
    expect(cond, msg) { const t = ((Date.now() - t0) / 1000).toFixed(0) + 's'; if (!cond) { w.fails++; console.log(`  ✗ ${msg}  [${t}]`); } else console.log(`  ✓ ${msg}  [${t}]`); return cond; },
    /** walk (and auto-jump at walls) until the cat's centre is within 6 px of tile x */
    walkTo(tx, max = 900, run = false) {
      let n = 0, dir = null;
      if (run) d.key('ShiftLeft');
      while (Math.abs(p.body.cx - tx * T) > 6 && n < max) {
        const want = tx * T > p.body.cx ? 'KeyD' : 'KeyA';
        if (want !== dir) { if (dir) d.key(dir, false); d.key(want); dir = want; }
        d.step(1); n++;
        if (p.body.hitWall && p.body.onGround) d.hold('Space', 25);
      }
      d.releaseAll(); d.step(5);
      return Math.abs(p.body.cx - tx * T) <= 8;
    },
    /** walk toward a floor portal (or an edge) and let go of the key the moment the cat leaves the ground */
    enter(tx, max = 400) {
      const dir = tx * T > p.body.cx ? 'KeyD' : 'KeyA'; d.key(dir);
      const y0 = p.body.bottom;
      for (let i = 0; i < max && !(p.body.bottom > y0 + 12 || p.body.bottom < y0 - 3 * T); i++) d.step(1);   // fell (or was teleported)
      d.step(2); d.releaseAll();
    },
    /** walk in a direction for n frames, jumping when a wall is hit */
    walk(dir, frames, jump = true) { d.key(dir > 0 ? 'KeyD' : 'KeyA'); for (let i = 0; i < frames; i++) { d.step(1); if (jump && p.body.hitWall && p.body.onGround) d.hold('Space', 12); } d.releaseAll(); d.step(3); },
    /** a running jump: hold run+dir, jump after `lead` frames, keep holding for `air` frames */
    runJump(dir, lead = 20, air = 40) { d.key('ShiftLeft'); d.key(dir > 0 ? 'KeyD' : 'KeyA'); d.step(lead); d.key('Space'); d.step(14); d.key('Space', false); d.step(air); d.releaseAll(); d.step(3); },
    jump(frames = 14) { d.key('Space'); d.step(frames); d.key('Space', false); },
    /** climb (W) until the cat's feet are at or above tile row */
    climbTo(row, max = 800) { d.key('KeyW'); let n = 0; while (p.body.bottom > row * T - 0.5 && n < max) { d.step(1); n++; } d.releaseAll(); d.step(12); return p.body.bottom <= row * T + 2; },
    /** aim at a world point that must be visible, wait for the cat to turn, click */
    aimClick(wx, wy, btn) { for (let i = 0; i < 20; i++) { d.aimVisible(wx, wy); d.step(1); } d.click(btn); d.step(30); },   // re-aim every frame: the camera may still be scrolling
    /** peek up/down (S/W while standing) then aim+click; releases the key afterwards */
    /** move the mouse to the screen edge on the side of the target so the cat (and the camera look-ahead) face it */
    face(wx) { d.mouse(wx > p.body.cx ? d.canvas.width - 8 : 8, d.canvas.height / 2); d.step(45); },
    peekAimClick(dirKey, wx, wy, btn, wait = 130) { w.face(wx); d.key(dirKey); d.step(wait); try { w.aimClick(wx, wy, btn); } finally { d.releaseAll(); d.step(30); } },
    selectWeapon(kind) { game.weapons.select(kind); d.step(5); },
    /** grab the nearest body of a kind (must be on screen); returns the body or null */
    grab(kind, filter = () => true) {
      const cands = game.world.bodies.filter((b) => b.kind === kind && !b.dead && filter(b)).sort((a, b) => Math.abs(a.cx - p.body.cx) - Math.abs(b.cx - p.body.cx));
      for (const b of cands.slice(0, 3)) {
        try { d.aimVisible(b.cx, b.cy); } catch (e) { continue; }
        d.step(10); d.click(0); d.step(70);
        if (game.weapons.held === b) return b;
        if (game.weapons.held) { d.click(2); d.step(20); }
      }
      return null;
    },
    dropAt(wx, wy) { d.aimVisible(wx, wy); d.step(20); d.click(2); d.step(30); },
    throwAt(wx, wy) { d.aimVisible(wx, wy); d.step(20); d.click(0); d.step(30); },
    interact() { d.tap('KeyE'); d.step(10); },
    portal(color) { return game.portals[color]; },
    puzzle(pred) { return game.puzzles.find(pred); },
    channel(name) { return game.channels.get(name); },
    wait(frames) { d.step(frames); },
    shot(name) { return d.shot(name); },
    done() {
      const ok = game.state === 'complete' && game.giftsCollected === game.giftsTotal && w.fails === 0;
      console.log(`RESULT level ${levelIndex + 1}: state=${game.state} gifts=${game.giftsCollected}/${game.giftsTotal} fails=${w.fails} → ${ok ? 'PASS' : 'FAIL'}`);
      return ok;
    },
  };
  game.portals.onTeleport = ((o) => (b, f, t) => { o(b, f, t); if (b.kind === 'cat') console.log(`  (teleport ${f.color}→${t.color} v=${b.vx.toFixed(0)},${b.vy.toFixed(0)})`); })(game.portals.onTeleport);
  return w;
}
