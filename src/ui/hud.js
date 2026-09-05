// HUD: gift counter, weapon indicator (with gun icon), portal status, crosshair, hints & messages.
import { drawGunIcon } from '../weapons/gunSprites.js';
import { PORTAL_COLORS } from '../portals/portalRenderer.js';
import { drawGiftBox, GIFT_TYPES } from '../gifts/gift.js';

export class HUD {
  constructor() {
    this.message = null;      // { text, life, sub }
    this.msgQueue = [];
    this.fade = 0;
  }
  show(text, sub = '', dur = 3.5) { this.message = { text, sub, life: dur, max: dur }; }

  update(dt) {
    if (this.message) { this.message.life -= dt; if (this.message.life <= 0) this.message = null; }
  }

  draw(ctx, game, w, h) {
    const p = game.player;
    const ws = game.weapons;
    ctx.save();
    ctx.textBaseline = 'middle';
    // ---- top-left panel: gifts ----
    panel(ctx, 12, 12, 168, 40);
    drawGiftBox(ctx, 24, 22, 20, 18, GIFT_TYPES.normal, game.time);
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`${game.giftsCollected} / ${game.giftsTotal}`, 56, 32);
    ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('подарки', 118, 32);

    // ---- weapon indicator (below gifts) ----
    if (ws.current) {
      const isP = ws.current === 'portal';
      panel(ctx, 12, 60, 168, isP ? 76 : 50);
      drawGunIcon(ctx, ws.current, 34, 88, 1.15, game.time);
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(isP ? 'Portal Gun' : 'Gravity Gun', 82, 78);
      ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(isP ? '[2]' : '[1]', 82, 94);
      if (ws.available.gravity && ws.available.portal) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(isP ? '1 — Gravity Gun' : '2 — Portal Gun', 104, 94); }
      if (isP) {
        const b = game.portals.blue, o = game.portals.orange;
        ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
        ctx.fillStyle = PORTAL_COLORS.blue.main; ctx.beginPath(); ctx.arc(30, 116, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(`Blue: ${b.active ? 'OPEN' : 'READY'}`, 42, 116);
        ctx.fillStyle = PORTAL_COLORS.orange.main; ctx.beginPath(); ctx.arc(112, 116, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(`Orange: ${o.active ? 'OPEN' : 'READY'}`, 124, 116);
      } else if (ws.held) {
        ctx.fillStyle = '#FFD08A'; ctx.font = 'bold 11px "Trebuchet MS", sans-serif'; ctx.fillText('● удерживает', 104, 78);
      }
    }

    // ---- top-right: level name ----
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif'; ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(game.level.name, w - 15, 23);
    ctx.fillStyle = '#fff'; ctx.fillText(game.level.name, w - 16, 22);
    ctx.font = '11px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`Мир ${game.level.world} · Уровень ${game.level.index + 1}   ·   Esc — меню   R — рестарт`, w - 16, 40);

    // ---- crosshair ----
    const mx = game.input.mouseX, my = game.input.mouseY;
    if (ws.current) {
      ctx.lineWidth = 2;
      const hover = ws.hoverBody && ws.current === 'gravity';
      ctx.strokeStyle = hover ? '#FFD08A' : ws.current === 'portal' ? '#ffffff' : 'rgba(255,255,255,0.9)';
      const r = hover ? 9 : 6;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - r - 4, my); ctx.lineTo(mx - r + 1, my); ctx.moveTo(mx + r - 1, my); ctx.lineTo(mx + r + 4, my);
      ctx.moveTo(mx, my - r - 4); ctx.lineTo(mx, my - r + 1); ctx.moveTo(mx, my + r - 1); ctx.lineTo(mx, my + r + 4); ctx.stroke();
      if (ws.current === 'portal') {
        ctx.fillStyle = PORTAL_COLORS.blue.main; ctx.beginPath(); ctx.arc(mx - 4, my + 14, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PORTAL_COLORS.orange.main; ctx.beginPath(); ctx.arc(mx + 4, my + 14, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (hover) { ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFD08A'; ctx.fillText(game.btn('lmb'), mx, my - 16); }
    }

    // ---- bottom hint ----
    const hint = game.hintText || ws.hint;
    if (hint) {
      ctx.font = '13px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(hint).width + 24;
      panel(ctx, w / 2 - tw / 2, h - 40, tw, 28);
      ctx.fillStyle = '#fff'; ctx.fillText(hint, w / 2, h - 26);
    }

    // ---- centre message ----
    if (this.message) {
      const m = this.message;
      const a = Math.min(1, m.life * 2, (m.max - m.life) * 3);
      ctx.globalAlpha = a;
      ctx.font = 'bold 26px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,20,10,0.7)';
      ctx.strokeText(m.text, w / 2, h * 0.24); ctx.fillStyle = '#FFE9B8'; ctx.fillText(m.text, w / 2, h * 0.24);
      if (m.sub) { ctx.font = '15px "Trebuchet MS", sans-serif'; ctx.lineWidth = 4; ctx.strokeText(m.sub, w / 2, h * 0.24 + 30); ctx.fillStyle = '#fff'; ctx.fillText(m.sub, w / 2, h * 0.24 + 30); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

export function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(30,22,40,0.62)';
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
}
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
