// Renders a sheet of cat poses at 3x for visual review.
import './harness.mjs';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
const { drawCat } = await import('../src/characters/cat/catSprite.js');
const anims = ['idle','walk','run','jump','fall','land','crouch','climb','push','happy','surprise','confused'];
const S = 2.4, cw = 150*S, ch = 110*S;
const c = createCanvas(cw*6, ch*3); const ctx = c.getContext('2d');
ctx.fillStyle = '#EFD2A6'; ctx.fillRect(0,0,c.width,c.height);
const weapons = [null, {kind:'gravity'}, {kind:'portal'}];
let i=0;
for (const a of anims) {
  const col = i%6, row = Math.floor(i/6);
  const p = { anim:a, animTime:0.35, body:{cx:0,bottom:0,vx:200,vy:0}, facing:1, aimX:1, aimY:-0.2, squash:1, stretch:1, crouching:a==='crouch', blink:0, idleVariant:null, weapon:null };
  ctx.save(); ctx.translate(col*cw+cw/2, row*ch+ch-16); ctx.scale(S,S);
  const wv = weapons[i%3]; 
  drawCat(ctx, p, 0.5, wv ? {kind:wv.kind, swapT:1, recoil:0, charge:0, holding:false, lastColor:'blue', localAngle:-0.2} : null);
  ctx.restore();
  ctx.fillStyle='#000'; ctx.font='14px sans-serif'; ctx.fillText(a+(wv?' +'+wv.kind:''), col*cw+6, row*ch+16);
  i++;
}
// third row: big idle facing both ways with guns
for (const [j,wk] of [['gravity',0],['portal',1]].entries()) {}
const big = createCanvas(700, 420); const b = big.getContext('2d'); b.fillStyle='#EFD2A6'; b.fillRect(0,0,700,420);
for (const [j,wk] of [[0,null],[1,'gravity'],[2,'portal']]) {
  const p = { anim:'idle', animTime:0, body:{cx:0,bottom:0,vx:0,vy:0}, facing:1, aimX:1, aimY:0, squash:1, stretch:1, crouching:false, blink:0, idleVariant:null, weapon:null };
  b.save(); b.translate(120+j*230, 400); b.scale(5,5);
  drawCat(b, p, 0.3, wk ? {kind:wk, swapT:1, recoil:0, charge:0.5, holding:false, lastColor:'orange', localAngle:-0.1} : null);
  b.restore();
}
// idle flourishes sheet (sit, groom, stretch, smoke at several moments)
const fl = [['sit',1.0],['groom',1.0],['stretch',0.8],['smoke',4.2],['smoke',3.2],['smoke',1.8]];
const fc = createCanvas(cw*6, ch); const f = fc.getContext('2d'); f.fillStyle='#EFD2A6'; f.fillRect(0,0,fc.width,fc.height);
fl.forEach(([v, timer], j) => {
  const p = { anim:'idle', animTime:0, body:{cx:0,bottom:0,vx:0,vy:0}, facing:1, aimX:1, aimY:0, squash:1, stretch:1, crouching:false, blink:0, idleVariant:v, idleVariantTimer:timer, weapon:null };
  f.save(); f.translate(j*cw+cw/2, ch-16); f.scale(S,S); drawCat(f, p, 0.9 + j, null); f.restore();
  f.fillStyle='#000'; f.font='14px sans-serif'; f.fillText(`${v} (${timer}s left)`, j*cw+6, 16);
});
fs.mkdirSync('tools/out',{recursive:true});
fs.writeFileSync('tools/out/catidle.png', fc.toBuffer('image/png'));
fs.writeFileSync('tools/out/catsheet.png', c.toBuffer('image/png'));
fs.writeFileSync('tools/out/catbig.png', big.toBuffer('image/png'));
console.log('ok');
