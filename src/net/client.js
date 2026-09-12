// Browser side of the multiplayer session. The same Game runs here and on the server; the client sends the local
// player's input every frame and applies the server's authoritative snapshots (see protocol.js). Between snapshots
// the client keeps simulating with the shared fixed timestep so movement stays smooth; the partner cat is driven
// by the held keys the server relays.
import { packInput, blankInput } from '../core/playerSlot.js';
import { applyState } from './protocol.js';

export class NetClient {
  /**
   * @param game the local Game
   * @param url  WebSocket URL (default: same origin, path /ws)
   * @param onStatus optional (text) => void for a small status line in the page
   * The client attaches itself to the game (game.net) once the server has assigned a slot.
   */
  constructor(game, url = defaultUrl(), onStatus = null) {
    this.game = game; this.url = url; this.onStatus = onStatus;
    this.ws = null; this.slot = -1; this.connected = false;
    this.pending = null;            // latest unapplied snapshot
    this.ctx = { seq: undefined };  // applyState bookkeeping
    this.snapshots = 0; this.lastSnapshotAt = 0;
    this.connect();
  }
  status(t) { this.statusText = t; if (this.onStatus) this.onStatus(t); }
  connect() {
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { this.status('офлайн'); return; }
    this.ws = ws;
    this.status('подключение…');
    ws.onopen = () => { ws.send(JSON.stringify({ t: 'hello' })); };
    ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data));
    ws.onclose = () => this.onClose();
    ws.onerror = () => { /* onclose follows */ };
  }
  onMessage(m) {
    const g = this.game;
    if (m.t === 'welcome') {
      this.slot = m.slot; this.connected = true;
      g.net = this; g.localSlot = m.slot;
      g.slots.forEach((s, i) => { s.local = i === m.slot; s.connected = !!m.players[i]; });
      this.status(`онлайн · вы — ${g.slots[m.slot].name} (${m.slot === 0 ? 'рыжий' : 'чёрный'} кот)`);
      g.hud.show(`Онлайн: вы — ${g.slots[m.slot].name}`, m.slot === 0 ? 'Второй игрок может подключиться в любой момент' : 'Вы играете чёрным котом рядом с первым игроком', 4);
    } else if (m.t === 'full') {
      this.status('сервер занят: уже два игрока — играем офлайн');
      g.hud.show('Сервер занят', 'В сессии уже два игрока — играем офлайн', 4);
      if (g.net === this) g.net = null;
      this.ws.onclose = null; this.ws.close(); this.ws = null;
    } else if (m.t === 'state') {
      this.pending = m; this.snapshots++; this.lastSnapshotAt = performance.now();
    }
  }
  onClose() {
    const g = this.game;
    const was = this.connected;
    this.connected = false; this.ws = null;
    if (g.net === this) {
      // keep the current world and continue offline as a single session (partner cat leaves)
      g.net = null;
      g.slots.forEach((s, i) => { if (i !== g.localSlot && s.connected) g.removePlayer(i); });
      if (was) g.hud.show('Связь с сервером потеряна', 'Продолжаем офлайн', 3);
    }
    this.status(was ? 'офлайн (связь потеряна)' : 'офлайн');
  }
  /** Called by Game.frame before the update: apply the newest snapshot; remember this frame's one-shot presses. */
  beforeFrame(inp) {
    if (!this.connected) return;
    this.edges = packInput(inp);   // local puzzles/weapons consume presses during the update — keep them for the wire
    if (this.pending) { const s = this.pending; this.pending = null; try { applyState(this.game, s, this.ctx); } catch (e) { console.error('applyState', e); } }
  }
  /** Called by Game.frame after the update: send this frame's input. */
  afterFrame(inp) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return;
    const g = this.game;
    const src = g.state === 'playing' ? (g.slots[g.localSlot].input || inp) : blankInput();
    const p = packInput(src); p.t = 'input';
    if (this.edges && g.state === 'playing') { for (const k of ['jumpPressed', 'interactPressed', 'tunnelPressed', 'key1', 'key2', 'lmbPressed', 'rmbPressed']) p[k] = p[k] || this.edges[k]; p.wheel = p.wheel || this.edges.wheel; }
    this.edges = null;
    this.ws.send(JSON.stringify(p));
  }
  /** Menu actions go to the server, which changes the level/state for everyone. */
  ui(action, arg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'ui', action, arg })); }
}

export function defaultUrl() {
  const q = new URLSearchParams(location.search);
  if (q.get('ws')) return q.get('ws');
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}
