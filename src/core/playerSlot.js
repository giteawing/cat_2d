// A player slot of the session: slot 0 = player 1 (orange cat), slot 1 = player 2 (black cat).
// A slot owns everything that is per-player: the cat (Player), its WeaponSystem, its input for the current frame
// (a snapshot in the shape produced by Input.frame(), wherever it came from — local devices or the network),
// aim/crosshair state and the connection flag. Everything else (World, portals, puzzles, items) is shared.
export const PALETTE_OF_SLOT = ['orange', 'black'];
export const MAX_PLAYERS = 2;

/** Neutral input snapshot (nothing pressed). */
export function blankInput() {
  return {
    left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, run: false,
    interactPressed: false, tunnelPressed: false, key1: false, key2: false,
    lmbPressed: false, rmbPressed: false, lmb: false, rmb: false, wheel: 0,
    pause: false, restart: false, mute: false, enter: false, any: false, upPressed: false,
    mouseX: 0, mouseY: 0, mouseWorldX: 0, mouseWorldY: 0,
    padAiming: false, padAimX: 1, padAimY: 0, padActive: false,
  };
}

/** Fields of an input snapshot that travel over the network (client → server). */
export const NET_INPUT_KEYS = ['left', 'right', 'up', 'down', 'jump', 'jumpPressed', 'run', 'interactPressed', 'tunnelPressed',
  'key1', 'key2', 'lmbPressed', 'rmbPressed', 'lmb', 'rmb', 'wheel', 'mouseWorldX', 'mouseWorldY'];
const EDGE_KEYS = new Set(['jumpPressed', 'interactPressed', 'tunnelPressed', 'key1', 'key2', 'lmbPressed', 'rmbPressed']);

/** Pack an input snapshot for the wire (only the gameplay-relevant keys). */
export function packInput(inp) {
  const o = {};
  for (const k of NET_INPUT_KEYS) o[k] = typeof inp[k] === 'number' ? Math.round(inp[k] * 10) / 10 : !!inp[k];
  return o;
}

/**
 * Merge a received input into the accumulator for the next server tick. Held keys and the aim take the latest
 * value; one-shot presses are OR-ed so a press that arrives between two ticks is never lost; wheel deltas add up.
 */
export function mergeInput(acc, inp) {
  for (const k of NET_INPUT_KEYS) {
    if (!(k in inp)) continue;
    if (EDGE_KEYS.has(k)) acc[k] = acc[k] || !!inp[k];
    else if (k === 'wheel') acc[k] = (acc[k] || 0) + (inp[k] || 0);
    else acc[k] = inp[k];
  }
  return acc;
}

export class PlayerSlot {
  constructor(index) {
    this.index = index;
    this.palette = PALETTE_OF_SLOT[index] || 'black';
    this.connected = false;      // a client (or the local device) is driving this slot
    this.local = false;          // this slot is driven by the local input devices (camera/HUD follow it)
    this.player = null;          // Player (cat) — null while the slot is empty or no level is loaded
    this.weapons = null;         // WeaponSystem of this cat
    this.input = blankInput();   // input snapshot for the current frame
    this.frameInput = { interactPressed: false, pendingSteps: false };   // last input seen by the physics loop (one-shot latch)
    this.name = `Игрок ${index + 1}`;
  }
  get active() { return this.connected && !!this.player; }
  /** Net id reserved for this slot's cat body (props use small sequential ids). */
  get bodyNetId() { return 1000000 + this.index; }
}
