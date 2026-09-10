// Keyboard + mouse input with per-frame "pressed" edges.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0; this.mouseY = 0;         // in canvas (logical) pixels
    this.mouseWorldX = 0; this.mouseWorldY = 0;
    this.lmb = false; this.rmb = false;
    this.lmbPressed = false; this.rmbPressed = false;
    this.wheel = 0;
    this.anyInput = false;
    this.scale = 1;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = norm(e.code);
      this.keys.add(k); this.pressed.add(k); this.anyInput = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(norm(e.code)); });
    window.addEventListener('blur', () => { this.keys.clear(); this.lmb = this.rmb = false; });
    canvas.addEventListener('mousemove', (e) => this.updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.updateMouse(e); this.anyInput = true;
      if (e.button === 0) { this.lmb = true; this.lmbPressed = true; }
      if (e.button === 2) { this.rmb = true; this.rmbPressed = true; }
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.wheel = Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    // gamepad (standard mapping): polled each frame in poll()
    this.pad = null;                 // last polled Gamepad snapshot
    this.padButtons = [];            // held state from previous poll (for edges)
    this.padPressed = new Set();     // button indices pressed this frame
    this.padAimX = 1; this.padAimY = 0; // last aim direction from the right stick (unit vector)
    this.padAiming = false;          // true while the right stick is deflected (or pad was last aim device)
    this.padActive = false;          // pad was the last device used (for hint text)
    this.padMenuBack = false;        // set by the game while in a menu: B acts as "back"/pause toggle
    this._lastMouse = { x: 0, y: 0 };
    window.addEventListener('gamepadconnected', () => { this.padActive = true; });
  }

  /** Poll the first connected standard gamepad and turn button changes into press edges. Call once per frame. */
  poll() {
    const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : null;
    let gp = null;
    if (pads) for (const g of pads) { if (g && g.connected) { gp = g; break; } }
    this.pad = gp;
    this.padPressed.clear();
    if (!gp) { this.padAiming = false; return; }
    const held = gp.buttons.map((b) => b.pressed || b.value > 0.5);
    for (let i = 0; i < held.length; i++) if (held[i] && !this.padButtons[i]) { this.padPressed.add(i); this.padActive = true; this.anyInput = true; }
    this.padButtons = held;
    // right stick aiming
    const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
    const rm = Math.hypot(rx, ry);
    if (rm > 0.3) { this.padAimX = rx / rm; this.padAimY = ry / rm; this.padAiming = true; this.padActive = true; }
    const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0;
    if (Math.hypot(lx, ly) > 0.5) this.padActive = true;
    // if the pad is used for movement but the stick is centered, keep aiming along the movement direction
    if (!this.padAiming && Math.abs(lx) > 0.5 && this.padActive) { this.padAimX = Math.sign(lx); this.padAimY = 0; this.padAiming = true; }
    // mouse movement takes aiming back
    if (this.mouseX !== this._lastMouse.x || this.mouseY !== this._lastMouse.y) { this.padAiming = false; this.padActive = false; }
    this._lastMouse.x = this.mouseX; this._lastMouse.y = this.mouseY;
  }
  padDown(i) { return !!(this.padButtons[i]); }
  padWasPressed(i) { return this.padPressed.has(i); }
  padAxis(i) { const v = this.pad ? (this.pad.axes[i] || 0) : 0; return Math.abs(v) > 0.35 ? v : 0; }
  /** Gamepad rumble (if supported). */
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    const a = this.pad && this.pad.vibrationActuator;
    if (a && a.playEffect) { try { a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (_) { /* ignore */ } }
  }

  updateMouse(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - r.left) * (this.canvas.width / r.width);
    this.mouseY = (e.clientY - r.top) * (this.canvas.height / r.height);
  }

  down(k) { return this.keys.has(k); }
  wasPressed(k) { return this.pressed.has(k); }

  /** Snapshot of the game-relevant state for this frame. */
  frame() {
    // gamepad standard mapping: 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=Back 9=Start 12-15=dpad
    const lx = this.padAxis(0), ly = this.padAxis(1);
    const pd = (i) => this.padDown(i), pp = (i) => this.padWasPressed(i);
    const f = {
      left: this.down('KeyA') || this.down('ArrowLeft') || lx < 0 || pd(14),
      right: this.down('KeyD') || this.down('ArrowRight') || lx > 0 || pd(15),
      up: this.down('KeyW') || this.down('ArrowUp') || ly < 0 || pd(12),
      down: this.down('KeyS') || this.down('ArrowDown') || ly > 0 || pd(13),
      jump: this.down('Space') || pd(0),
      jumpPressed: this.wasPressed('Space') || pp(0),
      run: this.down('ShiftLeft') || this.down('ShiftRight') || pd(2),
      interactPressed: this.wasPressed('KeyE') || pp(1) || pp(3),
      tunnelPressed: this.wasPressed('KeyQ') || this.wasPressed('KeyF') || pp(2 + 8),   // Q / F / gamepad L3
      key1: this.wasPressed('Digit1') || pp(4), key2: this.wasPressed('Digit2') || pp(5),
      lmbPressed: this.lmbPressed || pp(7), rmbPressed: this.rmbPressed || pp(6), lmb: this.lmb || pd(7), rmb: this.rmb || pd(6),
      wheel: this.wheel,
      pause: this.wasPressed('Escape') || pp(9) || (pp(1) && this.padMenuBack),
      restart: this.wasPressed('KeyR') || pp(8),
      mute: this.wasPressed('KeyM'),
      mouseX: this.mouseX, mouseY: this.mouseY, mouseWorldX: this.mouseWorldX, mouseWorldY: this.mouseWorldY,
      upPressed: this.wasPressed('KeyW') || this.wasPressed('ArrowUp') || pp(12),
      enter: this.wasPressed('Enter') || this.wasPressed('Space') || pp(0) || pp(9),
      any: this.pressed.size > 0 || this.lmbPressed || this.padPressed.size > 0,
      padAiming: this.padAiming, padAimX: this.padAimX, padAimY: this.padAimY, padActive: this.padActive,
    };
    return f;
  }

  endFrame() { this.pressed.clear(); this.lmbPressed = false; this.rmbPressed = false; this.wheel = 0; }
}

function norm(code) { return code; }
