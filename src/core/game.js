// Main game: state machine (title / level select / playing / paused / complete), level loading,
// update & render loop.
import { TILE, clamp } from './util.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { SaveSystem } from './save.js';
import { TileMap } from '../physics/tilemap.js';
import { World } from '../physics/world.js';
import { Player } from '../characters/cat/player.js';
import { drawCat } from '../characters/cat/catSprite.js';
import { drawProp } from '../physics/props.js';
import { WeaponSystem } from '../weapons/weapons.js';
import { drawGun } from '../weapons/gunSprites.js';
import { PortalManager } from '../portals/portalManager.js';
import { drawPortal, drawPortalPreview } from '../portals/portalRenderer.js';
import { Channels } from '../puzzles/puzzles.js';
import { TileRenderer, drawFields } from '../render/tileRenderer.js';
import { Effects } from '../render/effects.js';
import { AudioSystem } from '../audio/audio.js';
import { HUD, panel, roundRect } from '../ui/hud.js';
import { LevelKit } from '../levels/levelKit.js';
import { LEVELS } from '../levels/index.js';
import { drawGiftBox, GIFT_TYPES } from '../gifts/gift.js';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const ZOOM = 1.25;   // world pixels are scaled up for a cosier, more readable picture
const FIXED_DT = 1 / 120;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = VIEW_W; canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = new Camera(VIEW_W / ZOOM, VIEW_H / ZOOM); this.camera.zoom = ZOOM;
    this.save = new SaveSystem();
    this.audio = new AudioSystem();
    this.hud = new HUD();
    this.effects = new Effects();
    this.state = 'title';       // title | select | playing | paused | complete
    this.time = 0;
    this.accumulator = 0;
    this.levelIndex = 0;
    this.level = null;
    this.menuIndex = 0;
    this.debug = false;
    this.lastFrame = performance.now();
    this.stats = { fps: 0, frames: 0, t: 0 };
    this.hintText = '';
    this.audio.volume = this.save.data.settings.volume ?? 0.8;
    this.testHooks = {};
    this.frameInput = { interactPressed: false };
  }

  // ------------------------------------------------------------------ level lifecycle
  loadLevel(index, { keepMessage = false } = {}) {
    const def = LEVELS[index];
    this.levelIndex = index;
    this.level = { ...def, index: index, world: def.world || 1 };
    this.map = TileMap.fromStrings(def.map);
    this.world = new World(this.map);
    this.portals = new PortalManager(this.map, this.world);
    this.world.portals = this.portals;
    this.channels = new Channels();
    this.puzzles = [];
    this.gifts = [];
    this.signs = [];
    this.decor = [];
    this.pickups = [];
    this.interactables = [];
    this.exit = null;
    this.giftsCollected = 0;
    this.time = 0;
    this.levelDoneTimer = -1;
    this.player = new Player(def.start[0] * TILE + (TILE - 30) / 2, def.start[1] * TILE - 54);
    this.player.events = (n, d) => this.onPlayerEvent(n, d);
    this.world.add(this.player.body);
    this.weapons = new WeaponSystem(this.player, this.world, this.portals, this);
    this.player.weapon = this.weapons;
    this.tiles = new TileRenderer(this.map, def.theme || 'house');
    this.camera.setBounds(this.map.width, this.map.height);
    this.effects = new Effects();
    const kit = new LevelKit(this);
    def.setup(kit, this);
    if (def.weapons) for (const w of def.weapons) this.weapons.unlock(w);
    if (def.abilities && def.abilities.includes('tunnel')) this.player.tunnelUnlocked = true;
    if (def.exit) this.exit = { x: def.exit[0] * TILE, y: def.exit[1] * TILE, w: TILE * (def.exitW || 2), h: TILE * 2 };
    this.giftsTotal = this.gifts.length;
    // already-collected gifts stay collected (progress is persistent) — but show them for replay value
    const saved = this.save.level(def.id);
    for (const g of this.gifts) if (saved.gifts.includes(g.id)) g.alreadyHad = true;
    this.world.onImpact = (b, speed, other) => this.onImpact(b, speed, other);
    this.world.onBreak = (b) => this.onBreak(b);
    this.world.onTileBreak = (tiles, b) => this.onTileBreak(tiles, b);
    this.world.onField = (b, kind, x, y, nx, ny, speed) => this.onField(b, kind, x, y, nx, ny, speed);
    this.portals.onTeleport = (b, from, to) => this.onTeleport(b, from, to);
    this.camera.snapTo(this.player.cx, this.player.cy);
    this.hud.message = null;
    if (!keepMessage) this.hud.show(def.name, def.subtitle || '', 3);
    this.state = 'playing';
    this.audio.startMusic(def.theme || 'house');
  }

  restartLevel() { this.loadLevel(this.levelIndex, { keepMessage: true }); }

  nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
    else { this.state = 'worldDone'; this.worldDoneTimer = 0; this.audio.play('gift'); }
  }
  updateWorldDone(dt, inp) {
    this.time += dt; this.worldDoneTimer += dt;
    if (this.worldDoneTimer > 1 && (inp.enter || inp.lmbPressed || inp.pause)) { this.audio.play('ui'); this.state = 'select'; this.menuIndex = 0; }
  }
  /** World summary: per-level gifts & secrets, totals. */
  renderWorldDone(ctx) {
    const a = Math.min(1, this.worldDoneTimer * 1.5);
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H); g.addColorStop(0, '#2B1B4A'); g.addColorStop(1, '#6B3B7A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // confetti
    for (let i = 0; i < 60; i++) {
      const t = this.time * (0.6 + (i % 5) * 0.12) + i * 7.3;
      const x = ((i * 137 + Math.sin(t) * 40) % VIEW_W + VIEW_W) % VIEW_W, y = ((t * 60 + i * 91) % (VIEW_H + 40)) - 20;
      ctx.fillStyle = ['#F25C5C', '#F2C14B', '#7ED37E', '#5BC0DE', '#F28CC8'][i % 5]; ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(40,10,40,0.6)';
    ctx.strokeText('Мир 1 пройден!', VIEW_W / 2, 50); ctx.fillStyle = '#FFE9B8'; ctx.fillText('Мир 1 пройден!', VIEW_W / 2, 50);
    // the cat, happy
    const cat = this.worldCat || (this.worldCat = makeTitleCat()); cat.animTime += 1 / 60; cat.emote = 'happy'; cat.emoteTimer = 1; cat.facing = 1; cat.aimX = 1; cat.body.cx = 110; cat.body.bottom = 300;
    ctx.save(); ctx.translate(110, 300); ctx.scale(1.6, 1.6); ctx.translate(-110, -300);
    drawCat(ctx, cat, this.time, { kind: 'portal', swapT: 1, recoil: 0, charge: 0, holding: false, lastColor: 'orange', localAngle: -0.4 });
    ctx.restore();
    // table
    const world = LEVELS.filter((L) => (L.world || 1) === 1);
    const rowH = 26, x0 = VIEW_W / 2 - 240, y0 = 100;
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left';
    ctx.fillText('Уровень', x0, y0); ctx.textAlign = 'center'; ctx.fillText('Подарки', x0 + 420, y0); ctx.fillText('Секреты', x0 + 540, y0);
    let tg = 0, tgMax = 0, ts = 0;
    world.forEach((L, i) => {
      const s = this.save.level(L.id); const y = y0 + rowH * (i + 1);
      const secretsTotal = L.secretCount ?? 0;
      tg += s.gifts.length; tgMax += L.giftCount; ts += s.secrets.length;
      const full = s.gifts.length >= L.giftCount;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'; ctx.fillRect(x0 - 10, y - rowH / 2, 600, rowH);
      ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${L.world}-${L.number}  ${L.name}`, x0, y);
      ctx.textAlign = 'center';
      for (let k = 0; k < L.giftCount; k++) { ctx.globalAlpha = a * (k < s.gifts.length ? 1 : 0.18); drawGiftBox(ctx, x0 + 420 - (L.giftCount - 1) * 9 + k * 18 - 7, y - 7, 14, 13, GIFT_TYPES.normal, this.time); ctx.globalAlpha = a; }
      ctx.fillStyle = full ? '#B8F0C0' : '#fff'; ctx.font = 'bold 12px "Trebuchet MS", sans-serif'; ctx.fillText(`${s.gifts.length}/${L.giftCount}`, x0 + 480, y);
      ctx.fillStyle = s.secrets.length ? '#FFD08A' : 'rgba(255,255,255,0.4)'; ctx.fillText(s.secrets.length ? '★'.repeat(s.secrets.length) : '—', x0 + 540, y);
    });
    const y = y0 + rowH * (world.length + 1) + 10;
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#FFE9B8'; ctx.textAlign = 'center';
    ctx.fillText(`Всего: ${tg} / ${tgMax} подарков  ·  ${ts} секретов`, VIEW_W / 2, y);
    if (tg >= tgMax) { ctx.fillStyle = '#B8F0C0'; ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.fillText('Все подарки мира собраны — ты идеальный кот!', VIEW_W / 2, y + 24); }
    if (this.worldDoneTimer > 1 && Math.sin(this.time * 6) > -0.3) { ctx.font = 'bold 16px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#FFD08A'; ctx.fillText('Enter — к выбору уровня', VIEW_W / 2, VIEW_H - 30); }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ events
  onPlayerEvent(name, data) {
    switch (name) {
      case 'jump': this.audio.play('jump'); break;
      case 'land': this.audio.play('land', data); if (data.speed > 250) this.effects.dust(this.player.cx, this.player.feetY, 6); break;
      case 'step': this.audio.play('step', data); break;
      case 'teleport': this.audio.play('teleport'); break;
      case 'tunnelOn': this.audio.play('tunnelOn'); this.effects.burst({ x: this.player.cx, y: this.player.body.cy }, '#7FD3FF', 14, 160); this.hud.show('Квантовое туннелирование: ВКЛ', 'Разбегись (Shift) и беги в электрополе — шанс пройти 25%', 2.5); break;
      case 'tunnelOff': this.audio.play('tunnelOff'); this.hud.show('Квантовое туннелирование: ВЫКЛ', '', 1.5); break;
    }
  }
  /** Electric-field contact: sparks, sound, cat reaction. */
  onField(b, kind, x, y, nx, ny, speed = 0) {
    const isCat = b.kind === 'cat';
    if (kind === 'pass') {
      this.audio.play('tunnelPass');
      this.effects.burst({ x, y }, '#9FE7FF', 22, 240);
      this.effects.burst({ x, y }, '#FFFFFF', 8, 120);
      if (isCat) { this.player.fieldFlash = 0.5; this.player.playEmote('happy', 0.9); this.effects.text(b.cx, b.y - 14, 'туннель!', '#BFF0FF'); }
      this.input.rumble(0.2, 0.6, 120);
    } else {
      this.audio.play('zap', { speed });
      const n = speed > 250 ? 14 : 5;
      for (let i = 0; i < n; i++) this.effects.spawnParticle(x, y + (Math.random() - 0.5) * 40, nx * (120 + Math.random() * 260) + (Math.random() - 0.5) * 120, ny * (120 + Math.random() * 260) + (Math.random() - 0.5) * 220, 0.3 + Math.random() * 0.3, i % 3 ? '#8FE3FF' : '#FFFFFF', 2 + Math.random() * 2, 300);
      if (isCat && speed > 250) { this.player.fieldFlash = 0.3; this.player.playEmote('surprise', 0.7); this.effects.shake(3); this.input.rumble(0.5, 0.3, 90); }
      // contextual hints (only when no other message is showing)
      if (isCat && speed >= 100 && !this.hud.message) {
        if (!this.player.tunnelUnlocked) this.hud.show('Электрополе', 'Сквозь него не пройти… пока', 2);
        else if (!this.player.tunneling) this.hud.show('Электрополе', `Включи квантовый режим: ${this.btn('q')}`, 2.5);
        else if (speed < 260) this.hud.show('Нужен разбег!', 'Беги в поле с зажатым Shift', 2.5);
        else this.player.playEmote('confused', 0.8);
      }
    }
  }
  onImpact(b, speed, other) {
    if (b.kind === 'cat') return;
    this.audio.play('impact', { material: b.material || 'wood', speed });
    if (speed > 350) this.effects.burst({ x: b.cx, y: b.cy }, 'rgba(255,255,255,0.6)', 4, 120);
  }
  onBreak(b) {
    this.audio.play('break');
    this.effects.debris(b, b.color || '#fff');
    if (this.weapons.held === b) this.weapons.held = null;
    if (this.weapons.pulling === b) this.weapons.pulling = null;
    this.brokenCount = (this.brokenCount || 0) + 1;
  }
  onTileBreak(tiles, b) {
    this.audio.play('break'); this.audio.play('impact', { material: 'wood', speed: 900 }); this.input.rumble(0.8, 0.5, 200);
    this.effects.shake(6);
    for (const [cx, cy] of tiles) for (let i = 0; i < 4; i++) this.effects.spawnParticle(cx * TILE + Math.random() * TILE, cy * TILE + Math.random() * TILE, (Math.random() - 0.5) * 300 + b.vx * 0.2, -Math.random() * 250, 0.8, ['#B9A08A', '#8A705A', '#D8C4AE'][i % 3], 3 + Math.random() * 3, 900);
    this.tiles.build();
    this.hud.show('Стена разрушена!', '', 2);
  }
  onTeleport(b, from, to) {
    this.effects.burst({ x: b.cx, y: b.cy }, to.color === 'blue' ? '#9CC7FF' : '#FFC48A', 10, 200);
    if (b.kind !== 'cat') this.audio.play('teleport');
  }
  onGiftCollected(g) {
    this.giftsCollected++;
    this.audio.play('gift'); this.input.rumble(0.3, 0.6, 150);
    this.player.playEmote('collect', 1.1);
    this.effects.burst({ x: g.x + g.w / 2, y: g.y + g.h / 2 }, g.def.ribbon, 18, 260);
    this.effects.text(g.x + g.w / 2, g.y - 10, g.def.label + '!', '#FFE9B8');
    const isNew = this.save.collectGift(this.level.id, g.id);
    if (isNew) this.effects.text(g.x + g.w / 2, g.y - 28, 'сохранено ✓', '#B8F0C0');
    if (this.giftsCollected === this.giftsTotal) this.hud.show('Все подарки собраны!', 'Иди к выходу →', 3);
  }
  onSecret(id) {
    this.save.findSecret(this.level.id, id);
    this.hud.show('Секрет найден!', '', 2.5);
    this.audio.play('checkpoint');
    this.player.playEmote('surprise', 0.8);
  }
  sfx(name, arg) {
    this.audio.play(name, arg);
    const r = { gravThrow: [0.6, 0.3, 90], gravPunt: [0.4, 0.2, 70], portalOpen: [0.2, 0.5, 80], portalFail: [0.3, 0, 40], gravGrab: [0, 0.3, 50] }[name];
    if (r) this.input.rumble(...r);
  }
  /** Button label for hints: mouse or gamepad wording depending on the last device used. */
  btn(which) {
    const pad = this.input.padActive;
    return { lmb: pad ? 'RT' : 'ЛКМ', rmb: pad ? 'LT' : 'ПКМ', e: pad ? 'B' : 'E', k1: pad ? 'LB' : '1', k2: pad ? 'RB' : '2', q: pad ? 'L3' : 'Q' }[which];
  }

  // ------------------------------------------------------------------ loop
  frame(now) {
    let dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (dt > 0.1) dt = 0.1;
    this.stats.frames++; this.stats.t += dt; if (this.stats.t >= 0.5) { this.stats.fps = Math.round(this.stats.frames / this.stats.t); this.stats.frames = 0; this.stats.t = 0; }
    this.input.padMenuBack = this.state !== 'playing';
    this.input.poll();
    const inp = this.input.frame();
    if (inp.any && !this.audio.ctx) { this.audio.init(); if (this.state === 'playing') this.audio.startMusic(this.level.theme || 'house'); }
    this.audio.resume();
    if (inp.mute) { const on = this.audio.toggleMusic(); this.save.data.settings.music = on; this.save.save(); }
    if (this.input.wasPressed('F3')) this.debug = !this.debug;

    switch (this.state) {
      case 'title': this.updateTitle(inp); break;
      case 'select': this.updateSelect(inp); break;
      case 'playing': this.updatePlaying(dt, inp); break;
      case 'paused': this.updatePaused(inp); break;
      case 'complete': this.updateComplete(dt, inp); break;
      case 'worldDone': this.updateWorldDone(dt, inp); break;
    }
    this.render();
    this.input.endFrame();
  }

  updateTitle(inp) {
    if (inp.enter || inp.lmbPressed) { this.audio.play('ui'); this.state = 'select'; this.menuIndex = this.lastPlayableIndex(); }
  }
  lastPlayableIndex() {
    let i = 0;
    while (i + 1 < LEVELS.length && this.save.isUnlocked(LEVELS, i + 1)) i++;
    return i;
  }
  updateSelect(inp) {
    const n = LEVELS.length;
    const cols = 5;
    if (inp.right && !this._selHold) this.menuIndex = (this.menuIndex + 1) % n;
    if (inp.left && !this._selHold) this.menuIndex = (this.menuIndex - 1 + n) % n;
    if (inp.down && !this._selHold) this.menuIndex = Math.min(n - 1, this.menuIndex + cols);
    if (inp.up && !this._selHold) this.menuIndex = Math.max(0, this.menuIndex - cols);
    this._selHold = inp.left || inp.right || inp.up || inp.down;
    // mouse hover / click
    const cells = this.selectCells();
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (inp.mouseX >= c.x && inp.mouseX <= c.x + c.w && inp.mouseY >= c.y && inp.mouseY <= c.y + c.h) {
        this.menuIndex = i;
        if (inp.lmbPressed && this.save.isUnlocked(LEVELS, i)) { this.audio.play('ui'); this.loadLevel(i); return; }
      }
    }
    if (inp.enter && this.save.isUnlocked(LEVELS, this.menuIndex)) { this.audio.play('ui'); this.loadLevel(this.menuIndex); }
    if (inp.pause) this.state = 'title';
    if (this.input.wasPressed('Delete') && this.input.down('ShiftLeft')) { this.save.reset(); }
  }
  selectCells() {
    const cols = 5, cw = 150, ch = 84, gap = 14;
    const x0 = (VIEW_W - (cols * cw + (cols - 1) * gap)) / 2, y0 = 150;
    return LEVELS.map((_, i) => ({ x: x0 + (i % cols) * (cw + gap), y: y0 + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
  }
  updatePaused(inp) {
    if (inp.pause) { this.state = 'playing'; return; }
    const items = this.pauseItems();
    if (inp.down && !this._selHold) this.menuIndex = (this.menuIndex + 1) % items.length;
    if (inp.up && !this._selHold) this.menuIndex = (this.menuIndex - 1 + items.length) % items.length;
    if ((inp.left || inp.right) && !this._selHold && items[this.menuIndex].adjust) items[this.menuIndex].adjust(inp.right ? 1 : -1);
    this._selHold = inp.up || inp.down || inp.left || inp.right;
    for (let i = 0; i < items.length; i++) {
      const y = VIEW_H / 2 - 30 + i * 40;
      if (Math.abs(inp.mouseY - y) < 18 && Math.abs(inp.mouseX - VIEW_W / 2) < 160) { this.menuIndex = i; if (inp.lmbPressed) items[i].fn(); }
    }
    if (inp.enter) items[this.menuIndex].fn();
  }
  adjustVolume(d) {
    let v = Math.round((this.audio.volume + d) * 5) / 5;
    if (v > 1.0001) v = 0; if (v < 0) v = 1;
    this.audio.setVolume(v); this.save.data.settings.volume = v; this.save.save(); this.audio.play('ui');
  }
  pauseItems() {
    return [
      { label: 'Продолжить', fn: () => { this.state = 'playing'; } },
      { label: 'Перезапустить уровень', fn: () => this.restartLevel() },
      { label: `Музыка: ${this.audio.musicOn ? 'вкл' : 'выкл'}  (M)`, fn: () => { const on = this.audio.toggleMusic(); this.save.data.settings.music = on; this.save.save(); } },
      { label: `Громкость: ${'■'.repeat(Math.round(this.audio.volume * 5))}${'□'.repeat(5 - Math.round(this.audio.volume * 5))}  (←/→)`, fn: () => this.adjustVolume(0.2), adjust: (d) => this.adjustVolume(d * 0.2) },
      { label: 'Выбор уровня', fn: () => { this.state = 'select'; this.menuIndex = this.levelIndex; this.audio.stopMusic(); } },
    ];
  }
  updateComplete(dt, inp) {
    this.time += dt;
    this.effects.update(dt);
    this.completeTimer += dt;
    if (this.completeTimer > 0.8 && (inp.enter || inp.lmbPressed)) { this.audio.play('ui'); this.nextLevel(); }
    if (inp.pause) { this.state = 'select'; this.menuIndex = this.levelIndex; }
  }

  updatePlaying(dt, inp) {
    if (inp.pause) { this.state = 'paused'; this.menuIndex = 0; return; }
    if (inp.restart) { this.restartLevel(); return; }
    this.time += dt;
    this.hintText = '';
    this.interactables = [];
    if (inp.padAiming) { // gamepad: virtual cursor on a ring around the cat's paws
      const h = this.player.handPos();
      const s = this.camera.worldToScreen(h.x + inp.padAimX * 170, h.y + inp.padAimY * 170);
      inp.mouseX = this.input.mouseX = s.x; inp.mouseY = this.input.mouseY = s.y;
      this.input._lastMouse.x = s.x; this.input._lastMouse.y = s.y;
    }
    const mw = this.camera.screenToWorld(inp.mouseX, inp.mouseY);
    this.input.mouseWorldX = mw.x; this.input.mouseWorldY = mw.y;
    inp.mouseWorldX = mw.x; inp.mouseWorldY = mw.y;
    // puzzles read one-shot presses from here (and consume them). A frame may run zero physics steps, so latch the
    // press until a step has actually seen it — otherwise E presses could be silently dropped.
    if (this.frameInput && this.frameInput.interactPressed && this.frameInput.pendingSteps) inp.interactPressed = true;
    this.frameInput = inp; inp.pendingSteps = true;
    this.player.setInput({ left: inp.left, right: inp.right, up: inp.up, down: inp.down, jump: inp.jump, run: inp.run });
    if (inp.jumpPressed) this.player.input.jumpPressed = true;
    if (inp.tunnelPressed && this.player.tunnelUnlocked) this.player.toggleTunneling();

    // fixed-step physics
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 8) {
      for (const p of this.puzzles) p.update(FIXED_DT, this);
      this.world.step(FIXED_DT);
      this.accumulator -= FIXED_DT; steps++;
      inp.pendingSteps = false; inp.interactPressed = false;   // one-shots consumed by this step
    }
    if (steps === 8) this.accumulator = 0;
    this.player.update(dt, this.world);
    this.weapons.update(dt, inp);
    this.portals.update(dt);
    for (const g of this.gifts) g.update(dt, this);
    for (const p of this.pickups) {
      if (p.taken) continue;
      const b = this.player.body;
      if (b.x < p.x + 40 && b.right > p.x - 12 && b.y < p.y + 40 && b.bottom > p.y - 12) {
        p.taken = true;
        this.audio.play('unlock'); this.player.playEmote('happy', 1.2);
        if (p.kind === 'tunnel') {
          this.player.tunnelUnlocked = true;
          this.hud.show('Режим квантового туннелирования!', `${this.btn('q')} — включить/выключить. С разбега (Shift) беги в электрополе: шанс пройти 25%, иначе отскок`, 6);
          this.effects.burst({ x: p.x + 14, y: p.y + 14 }, '#8FE3FF', 26, 300);
        } else {
          this.weapons.unlock(p.kind); this.weapons.select(p.kind);
          this.hud.show(p.kind === 'gravity' ? 'Gravity Gun получена!' : 'Portal Gun получена!', p.kind === 'gravity' ? `${this.btn('lmb')} — схватить / бросить, ${this.btn('rmb')} — толкнуть. Клавиша ${this.btn('k1')}` : `${this.btn('lmb')} — синий портал, ${this.btn('rmb')} — оранжевый. Клавиша ${this.btn('k2')}`, 4.5);
          this.effects.burst({ x: p.x + 14, y: p.y + 14 }, '#FFE9B8', 20, 280);
        }
      }
    }
    // signs
    for (const s of this.signs) {
      const b = this.player.body;
      if (b.right > s.x - 20 && b.x < s.x + s.w * TILE + 20 && Math.abs(b.bottom - (s.y + TILE)) < 90) this.hintText = s.text;
    }
    // exit
    if (this.exit && this.levelDoneTimer < 0) {
      const b = this.player.body, e = this.exit;
      if (b.x < e.x + e.w && b.right > e.x && b.y < e.y + e.h && b.bottom > e.y && this.player.onGround) this.finishLevel();
    }
    if (this.levelDoneTimer >= 0) { this.levelDoneTimer += dt; if (this.levelDoneTimer > 1.4) { this.state = 'complete'; this.completeTimer = 0; } }
    // fell out of the world → respawn at start (no death, just a gentle reset of the cat)
    if (this.player.body.y > this.map.height + 200) this.respawn();
    for (const b of this.world.bodies) if (b.y > this.map.height + 400 && b !== this.player.body) b.dead = true;

    this.effects.update(dt);
    if (this.effects.shakeAmt > 0) this.camera.applyShake(this.effects.shakeAmt); else { this.camera.shakeX = 0; this.camera.shakeY = 0; }
    this.camera.follow(this.player, dt);
    this.hud.update(dt);
    // random meows for personality
    if (Math.random() < dt * 0.02 && this.player.anim === 'idle') this.audio.play('meow');
  }

  respawn() {
    const b = this.player.body;
    if (this.weapons.held) this.weapons.drop(false);
    b.x = this.level.start[0] * TILE + 1; b.y = this.level.start[1] * TILE - 54; b.vx = 0; b.vy = 0;
    this.player.playEmote('confused', 1.2);
    this.hud.show('Ой! Назад на старт', '', 2);
  }

  finishLevel() {
    this.levelDoneTimer = 0;
    this.save.complete(this.level.id);
    this.audio.play('levelDone');
    this.player.playEmote('happy', 1.5);
    this.effects.burst({ x: this.player.cx, y: this.player.cy - 30 }, '#FFE9B8', 30, 320);
  }

  // ------------------------------------------------------------------ rendering
  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    switch (this.state) {
      case 'title': this.renderTitle(ctx); break;
      case 'select': this.renderSelect(ctx); break;
      case 'worldDone': this.renderWorldDone(ctx); break;
      default: this.renderWorld(ctx); this.hud.draw(ctx, this, VIEW_W, VIEW_H);
        if (this.state === 'paused') this.renderPause(ctx);
        if (this.state === 'complete') this.renderComplete(ctx);
    }
    if (this.debug) this.renderDebug(ctx);
  }

  renderWorld(ctx) {
    const cam = this.camera;
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    this.tiles.drawBackground(ctx, cam, cam.w, cam.h, this.time);
    ctx.translate(-Math.round(cam.x + cam.shakeX), -Math.round(cam.y + cam.shakeY));
    // decor behind tiles
    for (const d of this.decor) drawDecor(ctx, d, this.time);
    // doors are drawn before tiles so they slide "into" walls
    for (const p of this.puzzles) if (p.body && p.body.kind === 'door') p.draw(ctx, this.time);
    this.tiles.drawTiles(ctx, cam, cam.w + 2, cam.h + 2);
    drawFields(ctx, this.map, cam, this.time);
    // exit door
    if (this.exit) drawExit(ctx, this.exit, this.time, this.giftsCollected === this.giftsTotal);
    // puzzle elements (behind bodies)
    for (const p of this.puzzles) if (p.draw && !(p.body && p.body.kind === 'door')) p.draw(ctx, this.time);
    // portals (on walls, behind bodies)
    for (const p of this.portals.pair) drawPortal(ctx, p, this.time, this.portals.linked);
    // portal preview while holding portal gun
    if (this.state === 'playing' && this.weapons.current === 'portal') this.drawPortalPreview(ctx);
    // pickups
    for (const p of this.pickups) if (!p.taken) drawPickup(ctx, p, this.time);
    // gifts
    for (const g of this.gifts) g.draw(ctx, this.time);
    // physics bodies (props)
    for (const b of this.world.bodies) {
      if (b.dead || b.kind === 'cat' || b.type === 'kinematic') continue;
      drawProp(ctx, b, this.time);
    }
    // gravity beam
    if (this.weapons.current === 'gravity') this.effects.drawGravityBeam(ctx, this.weapons, this.time);
    // cat
    drawCat(ctx, this.player, this.time, this.weapons.view());
    // portal front rings again lightly to give depth when passing through
    for (const p of this.portals.pair) if (p.active) { ctx.globalAlpha = 0.35; drawPortal(ctx, p, this.time, this.portals.linked); ctx.globalAlpha = 1; }
    // interact prompts
    for (const it of this.interactables) if (it.near) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; const y = it.y - 12 + Math.sin(this.time * 5) * 2; const lbl = `[${this.btn('e')}]`; ctx.strokeText(lbl, it.x, y); ctx.fillText(lbl, it.x, y); }
    // signs
    for (const s of this.signs) drawSign(ctx, s);
    this.effects.draw(ctx, this.time);
    ctx.restore();
  }

  drawPortalPreview(ctx) {
    const hand = this.player.handPos();
    const a = this.weapons.gunAngle;
    const hit = this.map.raycast(hand.x, hand.y, Math.cos(a), Math.sin(a), 3000, null, (cx, cy) => this.map.blocksShot(this.map.get(cx, cy)));
    if (!hit) return;
    const ok = this.map.isPortalable(hit.tile);
    // exact placement check without committing
    let px = hit.x, py = hit.y;
    if (hit.nx !== 0) px = hit.nx > 0 ? (hit.cx + 1) * TILE : hit.cx * TILE; else py = hit.ny > 0 ? (hit.cy + 1) * TILE : hit.cy * TILE;
    const color = this.weapons.lastPortalColor === 'blue' ? 'orange' : 'blue';
    let fits = ok;
    if (ok) {
      const other = this.portals.other(this.portals[color]);
      fits = !!this.portals.fitsAt(px, py, hit.nx, hit.ny, -hit.ny, hit.nx, other);
      if (!fits) { for (let s = 2; s <= 44 && !fits; s += 2) { if (this.portals.fitsAt(px + -hit.ny * s, py + hit.nx * s, hit.nx, hit.ny, -hit.ny, hit.nx, other) || this.portals.fitsAt(px - -hit.ny * s, py - hit.nx * s, hit.nx, hit.ny, -hit.ny, hit.nx, other)) fits = true; } }
    }
    drawPortalPreview(ctx, px, py, hit.nx, hit.ny, color, fits);
    // aim line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hit.x, hit.y); ctx.stroke(); ctx.setLineDash([]);
  }

  renderTitle(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#FFB86B'); g.addColorStop(1, '#F06A8A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // confetti
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + this.stats.t * 0) % VIEW_W, y = ((i * 61 + performance.now() * 0.03 * (1 + (i % 3))) % (VIEW_H + 40)) - 20;
      ctx.fillStyle = ['#5BC0DE', '#FFE56B', '#9B6BE0', '#7ED37E', '#fff'][i % 5];
      ctx.save(); ctx.translate(x, y); ctx.rotate(i + performance.now() * 0.002); ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    // big cat
    const fakePlayer = this.titleCat || (this.titleCat = makeTitleCat());
    fakePlayer.animTime += 1 / 60; fakePlayer.blinkTimer -= 1 / 60; if (fakePlayer.blinkTimer <= 0) { fakePlayer.blink = 0.12; fakePlayer.blinkTimer = 3 + Math.random() * 3; } if (fakePlayer.blink > 0) fakePlayer.blink -= 1 / 60;
    fakePlayer.idleTime += 1 / 60;
    if (!fakePlayer.idleVariant && fakePlayer.idleTime > 4) { fakePlayer.idleVariant = ['lookAround', 'tailFlick', 'stretch'][Math.floor(Math.random() * 3)]; fakePlayer.idleVariantTimer = 1.5; }
    if (fakePlayer.idleVariant) { fakePlayer.idleVariantTimer -= 1 / 60; if (fakePlayer.idleVariantTimer <= 0) { fakePlayer.idleVariant = null; fakePlayer.idleTime = 0; } }
    ctx.save(); ctx.translate(VIEW_W - 150, VIEW_H - 40); ctx.scale(2.9, 2.9);
    drawCat(ctx, fakePlayer, performance.now() / 1000, { kind: Math.floor(performance.now() / 4000) % 2 ? 'portal' : 'gravity', swapT: 1, recoil: 0, charge: 0, holding: false, lastColor: 'blue', localAngle: -0.15 });
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(90,30,40,0.6)'; ctx.strokeText('Cat Portal Adventure', VIEW_W / 2 - 100, 150);
    ctx.fillStyle = '#FFF4D6'; ctx.fillText('Cat Portal Adventure', VIEW_W / 2 - 100, 150);
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#FFE9B8'; ctx.lineWidth = 5; ctx.strokeText('2D puzzle-platformer · Gravity Gun · Portal Gun', VIEW_W / 2 - 100, 200); ctx.fillText('2D puzzle-platformer · Gravity Gun · Portal Gun', VIEW_W / 2 - 100, 200);
    const blink = Math.sin(performance.now() / 300) > -0.2;
    if (blink) { ctx.font = 'bold 20px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText('Нажми Enter или кликни, чтобы начать', VIEW_W / 2 - 100, 300); ctx.fillText('Нажми Enter или кликни, чтобы начать', VIEW_W / 2 - 100, 300); }
    ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const lines = ['A/D или ←/→ — ходьба   Shift — бег   Space — прыжок   W/S — лестница / присесть', '1 — Gravity Gun   2 — Portal Gun   ЛКМ / ПКМ — действия пушки   E — взаимодействие   Q — квантовый режим', 'Геймпад: A — прыжок   X — бег   B — действие   LB/RB — пушки   RT/LT — огонь   ПС — прицел', 'Никаких таймеров. Исследуй, бросай предметы и экспериментируй с порталами!'];
    ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, 40, 380 + i * 24));
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(`Собрано подарков всего: ${this.save.totalGifts()}`, VIEW_W / 2 - 100, 505);
  }

  renderSelect(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#6FB6E8'); g.addColorStop(1, '#C9A0E8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(40,20,60,0.5)';
    ctx.strokeText('Выбор уровня', VIEW_W / 2, 60); ctx.fillStyle = '#fff'; ctx.fillText('Выбор уровня', VIEW_W / 2, 60);
    ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Стрелки / мышь — выбрать, Enter или клик — играть, Esc — назад', VIEW_W / 2, 95);
    const cells = this.selectCells();
    cells.forEach((c, i) => {
      const L = LEVELS[i];
      const unlocked = this.save.isUnlocked(LEVELS, i);
      const s = this.save.level(L.id);
      const sel = i === this.menuIndex;
      ctx.fillStyle = unlocked ? (sel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.3)';
      roundRect(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
      if (sel) { ctx.strokeStyle = '#F28C4B'; ctx.lineWidth = 3; roundRect(ctx, c.x, c.y, c.w, c.h, 10); ctx.stroke(); }
      ctx.fillStyle = unlocked ? '#3A2A4A' : 'rgba(60,40,80,0.5)'; ctx.textAlign = 'left';
      { // title: shrink the font to fit the card (long level names)
        const title = `${L.world}-${L.number}  ${L.name}`;
        let fs = 13; ctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
        while (fs > 10 && ctx.measureText(title).width > c.w - 20) { fs--; ctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`; }
        ctx.fillText(title, c.x + 10, c.y + 18);
      }
      ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = unlocked ? '#5A4A6A' : 'rgba(60,40,80,0.5)';
      { // subtitle, clipped to the card
        let sub = unlocked ? (L.subtitle || '') : 'Заблокировано';
        const maxW = c.w - 20;
        if (ctx.measureText(sub).width > maxW) { while (sub.length > 3 && ctx.measureText(sub + '…').width > maxW) sub = sub.slice(0, -1); sub += '…'; }
        ctx.fillText(sub, c.x + 10, c.y + 36);
      }
      if (unlocked) {
        const total = L.giftCount || 0;
        for (let k = 0; k < total; k++) {
          const had = k < s.gifts.length;
          ctx.globalAlpha = had ? 1 : 0.25;
          drawGiftBox(ctx, c.x + 10 + k * 20, c.y + 54, 14, 12, GIFT_TYPES.normal, 0);
          ctx.globalAlpha = 1;
        }
        if (s.completed) { ctx.fillStyle = '#3FBF8C'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('✓ пройден', c.x + c.w - 10, c.y + 62); }
      } else { // padlock drawn by hand (emoji fonts are not guaranteed)
        const lx = c.x + c.w - 24, ly = c.y + 52;
        ctx.strokeStyle = 'rgba(60,70,90,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx + 7, ly, 5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(60,70,90,0.7)'; ctx.fillRect(lx, ly, 14, 11);
      }
    });
    ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Всего подарков: ${this.save.totalGifts()}   ·   Shift+Delete — сбросить прогресс`, VIEW_W / 2, VIEW_H - 20);
  }

  renderPause(ctx) {
    ctx.fillStyle = 'rgba(20,10,30,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('Пауза', VIEW_W / 2, VIEW_H / 2 - 90);
    this.pauseItems().forEach((it, i) => {
      const y = VIEW_H / 2 - 30 + i * 40;
      ctx.font = (i === this.menuIndex ? 'bold ' : '') + '20px "Trebuchet MS", sans-serif';
      ctx.fillStyle = i === this.menuIndex ? '#FFD08A' : '#fff';
      ctx.fillText((i === this.menuIndex ? '▶ ' : '') + it.label, VIEW_W / 2, y);
    });
  }

  renderComplete(ctx) {
    const a = Math.min(1, this.completeTimer * 2);
    ctx.fillStyle = `rgba(20,10,30,${0.55 * a})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(90,30,40,0.6)';
    ctx.strokeText('Уровень пройден!', VIEW_W / 2, VIEW_H / 2 - 70); ctx.fillStyle = '#FFE9B8'; ctx.fillText('Уровень пройден!', VIEW_W / 2, VIEW_H / 2 - 70);
    ctx.font = '20px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`Подарки: ${this.giftsCollected} / ${this.giftsTotal}`, VIEW_W / 2, VIEW_H / 2 - 20);
    const s = this.save.level(this.level.id);
    if (s.secrets.length) ctx.fillText(`Секреты: ${s.secrets.length}`, VIEW_W / 2, VIEW_H / 2 + 10);
    if (this.brokenCount) { ctx.font = '14px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillText(`Разбито предметов: ${this.brokenCount}`, VIEW_W / 2, VIEW_H / 2 + 40); }
    if (this.completeTimer > 0.8 && Math.sin(this.completeTimer * 6) > -0.3) { ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#FFD08A'; ctx.fillText(this.levelIndex + 1 < LEVELS.length ? 'Enter — следующий уровень' : 'Enter — к выбору уровня', VIEW_W / 2, VIEW_H / 2 + 90); }
    ctx.globalAlpha = 1;
  }

  renderDebug(ctx) {
    ctx.save();
    ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#0f0';
    const p = this.player;
    const lines = [`fps ${this.stats.fps}  state ${this.state}`, p ? `pos ${p.x.toFixed(1)},${p.y.toFixed(1)} v ${p.body.vx.toFixed(0)},${p.body.vy.toFixed(0)} ground ${p.onGround} anim ${p.anim}` : '', this.world ? `bodies ${this.world.bodies.length}` : ''];
    lines.forEach((l, i) => ctx.fillText(l, 200, 10 + i * 12));
    if (this.state !== 'title' && this.state !== 'select') {
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
      ctx.strokeStyle = 'rgba(0,255,0,0.6)'; ctx.lineWidth = 1;
      for (const b of this.world.bodies) if (!b.dead) ctx.strokeRect(b.x, b.y, b.w, b.h);
      for (const pt of this.portals.pair) if (pt.active) { const z = pt.zone; ctx.strokeStyle = 'rgba(255,0,255,0.7)'; ctx.strokeRect(z.x, z.y, z.w, z.h); }
    }
    ctx.restore();
  }
}

function makeTitleCat() {
  return { anim: 'idle', animTime: 0, body: { cx: 0, bottom: 0, vx: 0, vy: 0 }, facing: -1, aimX: -1, aimY: 0, squash: 1, stretch: 1, crouching: false, blink: 0, blinkTimer: 3, idleTime: 0, idleVariant: null, idleVariantTimer: 0, weapon: { current: 'gravity' } };
}

function drawExit(ctx, e, time, allGifts) {
  // exit: a cosy door frame with a glowing arch and a flag
  ctx.fillStyle = '#7A4E2A'; roundRect(ctx, e.x + 6, e.y - 6, e.w - 12, e.h + 6, 14); ctx.fill();
  ctx.fillStyle = '#A8703E'; roundRect(ctx, e.x + 12, e.y, e.w - 24, e.h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,0.35)'; roundRect(ctx, e.x + 16, e.y + 4, e.w - 32, e.h - 4, 10); ctx.fill();
  ctx.fillStyle = '#FFD34D'; ctx.beginPath(); ctx.arc(e.x + e.w - 22, e.y + e.h / 2 + 4, 3, 0, Math.PI * 2); ctx.fill();
  // "EXIT" sign
  ctx.fillStyle = allGifts ? '#3FBF8C' : '#5BC0DE'; roundRect(ctx, e.x + e.w / 2 - 22, e.y - 24, 44, 16, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ВЫХОД', e.x + e.w / 2, e.y - 16);
  // sparkle arrows
  const k = (time * 2) % 1;
  ctx.fillStyle = `rgba(255,255,255,${0.6 - k * 0.6})`; ctx.fillRect(e.x + e.w / 2 - 2, e.y - 34 - k * 12, 4, 4);
}

function drawPickup(ctx, p, time) {
  const bob = Math.sin(time * 3) * 3;
  if (p.kind === 'tunnel') { drawTunnelPickup(ctx, p, time, bob); return; }
  ctx.save();
  ctx.translate(p.x + 14, p.y + 14 + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 24 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-0.3 + Math.sin(time * 2) * 0.1);
  ctx.translate(-12, 2);
  drawGun(ctx, p.kind, { swapT: 1, charge: 0.5, holding: false, lastColor: 'blue' }, time);
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  const label = p.kind === 'gravity' ? 'Gravity Gun' : 'Portal Gun';
  ctx.strokeText(label, p.x + 14, p.y - 12 + bob); ctx.fillText(label, p.x + 14, p.y - 12 + bob);
}

/** Quantum tunneling ability pickup: a glowing blue "quantum collar" orb. */
function drawTunnelPickup(ctx, p, time, bob) {
  const x = p.x + 14, y = p.y + 14 + bob;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 2, x, y, 26);
  g.addColorStop(0, 'rgba(200,240,255,0.9)'); g.addColorStop(0.5, 'rgba(90,190,255,0.45)'); g.addColorStop(1, 'rgba(90,190,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.fill();
  // orbiting electrons
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(i * Math.PI / 3 + time * 0.7);
    ctx.strokeStyle = 'rgba(120,210,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
    const a = time * (3 + i); ctx.fillStyle = '#E8FAFF'; ctx.beginPath(); ctx.arc(Math.cos(a) * 16, Math.sin(a) * 6, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#5BC8FF'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  const label = 'Квантовый режим';
  ctx.strokeText(label, x, p.y - 16 + bob); ctx.fillText(label, x, p.y - 16 + bob);
}

function drawSign(ctx, s) {
  ctx.fillStyle = '#7A4E2A'; ctx.fillRect(s.x + 13, s.y + 14, 6, 18);
  ctx.fillStyle = '#C9A46A'; roundRect(ctx, s.x, s.y, 32, 18, 3); ctx.fill();
  ctx.strokeStyle = '#7A4E2A'; ctx.lineWidth = 1.5; roundRect(ctx, s.x, s.y, 32, 18, 3); ctx.stroke();
  ctx.fillStyle = '#5A3A1A'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', s.x + 16, s.y + 9);
}

function drawDecor(ctx, d, time) {
  switch (d.kind) {
    case 'window': {
      ctx.fillStyle = '#8A5A2E'; roundRect(ctx, d.x, d.y, d.w, d.h, 10); ctx.fill();
      const g = ctx.createLinearGradient(d.x, d.y, d.x, d.y + d.h); g.addColorStop(0, '#9ED6F5'); g.addColorStop(1, '#E7F6FF');
      ctx.fillStyle = g; roundRect(ctx, d.x + 5, d.y + 5, d.w - 10, d.h - 10, 7); ctx.fill();
      ctx.fillStyle = '#8A5A2E'; ctx.fillRect(d.x + d.w / 2 - 2, d.y + 5, 4, d.h - 10); ctx.fillRect(d.x + 5, d.y + d.h / 2 - 2, d.w - 10, 4);
      break;
    }
    case 'shelf': ctx.fillStyle = '#8A5A2E'; ctx.fillRect(d.x, d.y, d.w, 6); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(d.x, d.y + 6, d.w, 3); break;
    case 'picture': ctx.fillStyle = '#5A3A1A'; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.fillStyle = d.color || '#F6C'; ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(d.x + d.w * 0.6, d.y + d.h * 0.4, d.w * 0.15, 0, Math.PI * 2); ctx.fill(); break;
    case 'balloon': {
      const bob = Math.sin(time * 1.5 + d.x) * 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d.x + 12, d.y + 30 + bob); ctx.lineTo(d.x + 10, d.y + 70); ctx.stroke();
      ctx.fillStyle = d.color || '#F25C5C'; ctx.beginPath(); ctx.ellipse(d.x + 12, d.y + 14 + bob, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(d.x + 8, d.y + 9 + bob, 3, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'poster': ctx.fillStyle = d.color || '#DDE6EE'; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.text || 'LAB', d.x + d.w / 2, d.y + d.h / 2); break;
    case 'pipe': ctx.fillStyle = '#6B7380'; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(d.x + 2, d.y + 2, d.w > d.h ? d.w - 4 : 3, d.w > d.h ? 3 : d.h - 4); break;
    case 'lampHang': {
      ctx.fillStyle = '#4A525E'; ctx.fillRect(d.x + 14, d.y, 4, 20);
      ctx.fillStyle = '#F2D06B'; ctx.beginPath(); ctx.moveTo(d.x + 2, d.y + 34); ctx.lineTo(d.x + 30, d.y + 34); ctx.lineTo(d.x + 22, d.y + 20); ctx.lineTo(d.x + 10, d.y + 20); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(d.x + 16, d.y + 36, 2, d.x + 16, d.y + 36, 90);
      g.addColorStop(0, 'rgba(255,240,180,0.35)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(d.x + 2, d.y + 34); ctx.lineTo(d.x - 60, d.y + 130); ctx.lineTo(d.x + 92, d.y + 130); ctx.lineTo(d.x + 30, d.y + 34); ctx.closePath(); ctx.fill();
      break;
    }
  }
}
