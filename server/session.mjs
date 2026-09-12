// One co-op session: an authoritative headless Game, 1–2 connected players, fixed-timestep loop, state broadcast.
import { createHeadlessGame } from './headless.mjs';
import { encodeState } from '../src/net/protocol.js';
import { blankInput, mergeInput, MAX_PLAYERS } from '../src/core/playerSlot.js';

const TICK_MS = 1000 / 60;        // simulation frames (each frame runs FIXED_DT physics steps like the browser)
const SEND_EVERY = 2;             // snapshots at 30 Hz
const EMPTY_RESET_MS = 60000;     // an empty session is discarded after a minute (next player starts fresh)

export class Session {
  constructor({ startLevel = 0, log = console.log } = {}) {
    this.startLevel = startLevel; this.log = log;
    this.game = null; this.conns = new Array(MAX_PLAYERS).fill(null); this.pending = new Array(MAX_PLAYERS).fill(null);
    this.timer = null; this.frame = 0; this.emptySince = 0; this.last = 0;
  }
  async ensureGame() {
    if (this.game) return this.game;
    this.game = await createHeadlessGame();
    this.log('session: created');
    return this.game;
  }
  /** A client connected: give it the first free slot (0 = orange, 1 = black) or refuse. */
  async join(ws) {
    const game = await this.ensureGame();
    const idx = this.conns.findIndex((c) => c === null);
    if (idx < 0) { ws.send(JSON.stringify({ t: 'full' })); ws.close(); return; }
    this.conns[idx] = ws; this.pending[idx] = blankInput(); this.emptySince = 0;
    if (!game.level) { game.slots[idx].connected = true; game.loadLevel(this.startLevel); this.log(`session: level ${this.startLevel} started by player ${idx + 1}`); }
    else game.addPlayer(idx);
    ws.send(JSON.stringify({ t: 'welcome', slot: idx, players: this.conns.map((c) => !!c) }));
    this.fullNext = true;
    this.log(`player ${idx + 1} joined (${this.conns.filter(Boolean).length} online)`);
    ws.on('message', (txt) => this.onMessage(idx, ws, txt));
    ws.on('close', () => this.leave(idx, ws));
    this.start();
  }
  leave(idx, ws) {
    if (this.conns[idx] !== ws) return;
    this.conns[idx] = null; this.pending[idx] = null;
    if (this.game) this.game.removePlayer(idx);
    this.log(`player ${idx + 1} left (${this.conns.filter(Boolean).length} online)`);
    if (!this.conns.some(Boolean)) this.emptySince = Date.now();
  }
  onMessage(idx, ws, txt) {
    let m; try { m = JSON.parse(txt); } catch (_) { return; }
    if (m.t === 'input') { if (this.pending[idx]) mergeInput(this.pending[idx], m); }
    else if (m.t === 'ui') this.onUi(idx, m);
  }
  onUi(idx, m) {
    const g = this.game; if (!g) return;
    switch (m.action) {
      case 'restart': if (g.level) { g.loadLevel(g.levelIndex, { keepMessage: true }); this.log(`player ${idx + 1}: restart`); } break;
      case 'next': if (g.state === 'complete') g.nextLevel(); break;
      case 'menu': g.state = 'select'; break;
      case 'level': { const i = Number(m.arg); if (Number.isInteger(i) && i >= 0) { g.loadLevel(i); this.log(`player ${idx + 1}: level ${i}`); } break; }
    }
  }
  start() {
    if (this.timer) return;
    this.last = performance.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  tick() {
    const g = this.game; if (!g) return;
    // feed the inputs collected since the last frame; one-shots are consumed by this frame only
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slot = g.slots[i]; if (!slot.connected) continue;
      const p = this.pending[i] || blankInput();
      slot.input = { ...blankInput(), ...p };
      if (this.pending[i]) { for (const k of ['jumpPressed', 'interactPressed', 'tunnelPressed', 'key1', 'key2', 'lmbPressed', 'rmbPressed']) p[k] = false; p.wheel = 0; }
    }
    const now = performance.now();
    try { g.frame(now); } catch (e) { this.log('frame error', e); }
    this.frame++;
    if (this.frame % SEND_EVERY === 0 && this.conns.some(Boolean)) {
      const full = this.frame % 60 === 0 || this.fullNext;   // sleeping props: once a second (and right after a join)
      this.fullNext = false;
      const msg = JSON.stringify(encodeState(g, full));
      for (const c of this.conns) if (c && c.readyState === 1) c.send(msg);
    }
    if (this.emptySince && Date.now() - this.emptySince > EMPTY_RESET_MS) { this.log('session: empty for a minute — reset'); this.stop(); this.game = null; this.emptySince = 0; }
  }
}
