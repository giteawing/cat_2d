// Procedural vector cat sprite, modelled on the reference image:
// big round head, huge teal eyes, pink nose, cream muzzle/chest/belly, orange tabby
// stripes, short legs with white socks, a big striped fluffy tail, pink inner ears.
// Everything is drawn with canvas paths so all parts can be animated smoothly.
import { TAU, clamp } from '../../core/util.js';
import { drawGun } from '../../weapons/gunSprites.js';

export const CAT = {
  fur: '#F4A24E',
  furLight: '#F8B96E',
  furDark: '#D9772C',
  stripe: '#D2702A',
  cream: '#FCF0DF',
  creamShade: '#EFD9BF',
  earInner: '#F5A6AC',
  nose: '#F08AA0',
  mouth: '#B9524F',
  tongue: '#F27A93',
  iris: '#3FA79A',
  irisDark: '#276F6A',
  pupil: '#141A1E',
  outline: '#8A4A1E',
  pad: '#F5A9B8',
  white: '#FFFFFF',
};

const smoothstep = (t) => t * t * (3 - 2 * t);
const wave = (t, f, p = 0) => Math.sin(t * f * TAU + p);

/**
 * Compute a pose from the player's state. All coordinates are in cat-local
 * space: origin at the bottom-center (feet), +x forward (facing), +y down.
 */
export function computePose(p, time) {
  const t = p.animTime;
  const anim = p.anim;
  const pose = {
    bodyY: 0, bodyTilt: 0, headY: 0, headTilt: 0, headX: 0,
    legFront: 0, legBack: 0, legLift: 0, legSpread: 0, // leg swing angles (rad) & lifts
    tailAngle: -0.9, tailCurl: 1.0, tailWag: 0,
    earFlick: 0, eyeOpen: 1, browRaise: 0, mouth: 'smile', pupilX: 0, pupilY: 0,
    armFront: 0, armBack: 0, armsUp: 0, // 0..1 arms raised (jump/fall)
    squashX: p.squash, squashY: p.stretch, crouch: p.crouching ? 1 : 0, climb: 0,
    blush: 0, sweat: 0, sparkle: 0, question: 0, exclaim: 0, groom: 0, smoke: 0,
  };
  const vx = Math.abs(p.body.vx);
  switch (anim) {
    case 'idle': {
      const b = wave(time, 0.7);
      pose.bodyY = b * 1.0;
      pose.headY = b * 1.2;
      pose.tailWag = wave(time, 0.5) * 0.25;
      pose.pupilX = p.aimX * 1.5;
      pose.pupilY = p.aimY * 1.2;
      if (p.idleVariant === 'lookAround') { const s = wave(time, 0.6); pose.headTilt = s * 0.12; pose.pupilX = s * 3; pose.headX = s * 2; }
      if (p.idleVariant === 'stretch') { const s = smoothstep(clamp(Math.sin(Math.min(1, (1.6 - p.idleVariantTimer) / 1.6) * Math.PI), 0, 1)); pose.bodyTilt = -0.25 * s; pose.headY = 4 * s; pose.armFront = -1.4 * s; pose.armBack = -1.4 * s; pose.eyeOpen = 1 - 0.8 * s; pose.mouth = s > 0.5 ? 'yawn' : 'smile'; }
      if (p.idleVariant === 'sniff') { pose.headTilt = 0.18; pose.headY = 3; pose.mouth = 'small'; const s = wave(time, 5); pose.earFlick = s * 0.05; }
      if (p.idleVariant === 'tailFlick') { pose.tailWag = wave(time, 2.2) * 0.6; pose.earFlick = wave(time, 1.1) * 0.15; }
      if (p.idleVariant === 'lookGun') { pose.headTilt = 0.3; pose.pupilY = 3; pose.pupilX = 2; pose.mouth = 'o'; pose.question = 1; }
      if (p.idleVariant === 'groom') {   // washes its face with the front paw
        const s = wave(time, 3.2);
        pose.armFront = -1.9 + s * 0.25; pose.groom = 1 + s; pose.headTilt = 0.22 + s * 0.05; pose.headY = 3 + s * 0.8; pose.headX = 1;
        pose.eyeOpen = 0.15; pose.mouth = 'small'; pose.pupilY = 2; pose.blush = 0.4;
      }
      if (p.idleVariant === 'smoke') {   // sits back with a "cigarette" and blows smoke rings shaped like little cat faces
        const total = 5.0, el = total - p.idleVariantTimer;           // elapsed seconds
        const s = smoothstep(clamp(el * 2, 0, 1)) * smoothstep(clamp((p.idleVariantTimer) * 2, 0, 1));   // ease in / out
        pose.crouch = Math.max(pose.crouch, s * 0.5); pose.bodyTilt = -0.1 * s; pose.headY = 2 * s; pose.headTilt = -0.1 * s;
        pose.tailAngle = -0.9 + 1.5 * s; pose.tailCurl = 1.0 + 0.7 * s; pose.tailWag = wave(time, 0.35) * 0.12;
        const cyc = (el - 0.6) % 1.4;                                   // one puff every 1.4 s
        const puffing = el > 0.6 && cyc < 0.45;
        pose.eyeOpen = 1 - 0.55 * s; pose.mouth = puffing ? 'o' : 'small'; pose.pupilY = 1; pose.pupilX = -1;
        pose.smoke = s > 0.05 ? { el, s, puffing } : 0;
      }
      if (p.idleVariant === 'sit') {     // settles down: lower body, tail wrapped around the paws, slow blink
        const s = smoothstep(clamp((2.6 - p.idleVariantTimer) * 1.5, 0, 1));
        pose.crouch = Math.max(pose.crouch, s * 0.55); pose.bodyTilt = -0.08 * s; pose.headY = 2 * s;
        pose.tailAngle = -0.9 + 1.6 * s; pose.tailCurl = 1.0 + 0.8 * s; pose.tailWag = wave(time, 0.4) * 0.15;
        pose.eyeOpen = 1 - 0.45 * s * (0.5 + 0.5 * Math.sin(time * 0.9)); pose.mouth = 'smile';
      }
      break;
    }
    case 'walk': {
      const f = 1.6 + vx / 200;
      const s = wave(t, f);
      pose.legFront = s * 0.55; pose.legBack = -s * 0.55;
      pose.legLift = 1;
      pose.bodyY = -Math.abs(wave(t, f * 2)) * 1.6;
      pose.headY = -Math.abs(wave(t, f * 2, 0.5)) * 1.4;
      pose.armFront = -s * 0.25; pose.armBack = s * 0.25;
      pose.tailWag = wave(t, f) * 0.35; pose.tailAngle = -0.7;
      pose.bodyTilt = 0.05;
      break;
    }
    case 'run': {
      const f = 2.4 + vx / 300;
      const s = wave(t, f);
      pose.legFront = s * 0.95; pose.legBack = -s * 0.95;
      pose.legLift = 1.4;
      pose.bodyY = -Math.abs(wave(t, f * 2)) * 2.5;
      pose.headY = -Math.abs(wave(t, f * 2, 0.6)) * 2;
      pose.armFront = -s * 0.5; pose.armBack = s * 0.5;
      pose.tailWag = wave(t, f) * 0.3; pose.tailAngle = -0.35; pose.tailCurl = 0.6;
      pose.bodyTilt = 0.16; pose.headTilt = 0.08; pose.earFlick = -0.2;
      pose.mouth = 'open';
      break;
    }
    case 'jumpStart': pose.crouch = 0.4; pose.armsUp = 0.3; pose.mouth = 'o'; break;
    case 'jump': {
      pose.legFront = -0.5; pose.legBack = 0.8; pose.legLift = 1; pose.armsUp = 0.9;
      pose.tailAngle = -1.3; pose.tailCurl = 0.9; pose.earFlick = 0.25; pose.mouth = 'open'; pose.eyeOpen = 1.05;
      pose.bodyTilt = -0.05; pose.squashY *= 1.05;
      break;
    }
    case 'fall': {
      pose.legFront = 0.5; pose.legBack = -0.3; pose.legSpread = 1; pose.armsUp = 0.7;
      pose.tailAngle = -1.8; pose.tailCurl = 0.7; pose.earFlick = 0.5; pose.mouth = 'o'; pose.eyeOpen = 1.15;
      pose.bodyTilt = 0.08;
      break;
    }
    case 'land': pose.crouch = 0.45; pose.mouth = 'smile'; pose.eyeOpen = 0.75; pose.armFront = 0.4; pose.armBack = 0.4; break;
    case 'crouch': pose.crouch = 1; pose.tailAngle = -0.4; pose.tailWag = wave(time, 0.6) * 0.3; pose.pupilX = p.aimX * 1.5; pose.pupilY = p.aimY * 1.2; break;
    case 'climb': {
      pose.climb = 1;
      const s = wave(t, 1.8);
      pose.armFront = -2.2 + s * 0.5; pose.armBack = -2.2 - s * 0.5;
      pose.legFront = s * 0.4; pose.legBack = -s * 0.4; pose.legLift = 1;
      pose.tailAngle = -0.6; pose.tailWag = s * 0.2;
      break;
    }
    case 'push': {
      const s = wave(t, 1.6);
      pose.bodyTilt = 0.32; pose.headTilt = -0.1; pose.legFront = s * 0.3 + 0.2; pose.legBack = -s * 0.3 - 0.2;
      pose.armFront = 1.0; pose.armBack = 1.0; pose.mouth = 'grit'; pose.eyeOpen = 0.8; pose.sweat = 1;
      break;
    }
    case 'happy': case 'collect': {
      const s = Math.max(0, wave(t, 2.5));
      pose.bodyY = -s * 6; pose.headY = -s * 2; pose.armsUp = 1; pose.armFront = -2.6; pose.armBack = -2.6;
      pose.mouth = 'open'; pose.eyeOpen = 0.6; pose.blush = 1; pose.sparkle = 1; pose.tailWag = wave(t, 3) * 0.6;
      pose.tailAngle = -1.2; pose.legLift = 1;
      break;
    }
    case 'surprise': pose.eyeOpen = 1.3; pose.mouth = 'o'; pose.earFlick = 0.4; pose.exclaim = 1; pose.headY = -2; pose.tailAngle = -1.6; pose.tailCurl = 0.3; break;
    case 'confused': pose.headTilt = 0.28; pose.eyeOpen = 0.9; pose.mouth = 'small'; pose.question = 1; pose.pupilX = 2; pose.tailWag = wave(time, 1.5) * 0.4; break;
    case 'hurt': pose.eyeOpen = 0.2; pose.mouth = 'grit'; pose.headTilt = -0.2; pose.bodyTilt = -0.2; pose.earFlick = -0.4; break;
    case 'portalExit': pose.eyeOpen = 1.2; pose.mouth = 'o'; pose.earFlick = 0.3; pose.sparkle = 1; break;
    case 'swim': {   // doggy-paddle: body tilted forward, alternating front paws, kicking legs, ears back, chin up
      const f = 2.6, s = wave(t, f), k = p.swimStroke || 0;
      pose.bodyTilt = 0.55 + s * 0.04; pose.headTilt = -0.35; pose.headY = -3; pose.headX = 2;
      pose.armFront = -1.2 + s * 0.9 - k * 0.6; pose.armBack = -1.2 - s * 0.9 - k * 0.6;
      pose.legFront = s * 0.5; pose.legBack = -s * 0.5; pose.legLift = 0.8;
      pose.tailAngle = 0.2; pose.tailCurl = 0.5; pose.tailWag = s * 0.25;
      pose.earFlick = -0.35; pose.eyeOpen = 0.85; pose.mouth = 'grit'; pose.bodyY = Math.abs(s) * 1.5;
      break;
    }
    case 'float': {  // treading water: gentle bob, relaxed paws paddling slowly, content face
      const s = wave(time, 0.9);
      pose.bodyTilt = 0.3 + s * 0.03; pose.headTilt = -0.22; pose.headY = -2 + s * 0.8; pose.bodyY = s * 1.5;
      pose.armFront = -1.0 + s * 0.3; pose.armBack = -1.0 - s * 0.3;
      pose.legFront = s * 0.2; pose.legBack = -s * 0.2; pose.legLift = 0.6;
      pose.tailAngle = 0.1; pose.tailCurl = 0.6; pose.tailWag = wave(time, 0.6) * 0.2;
      pose.earFlick = -0.2; pose.eyeOpen = 0.9; pose.mouth = 'small'; pose.pupilX = p.aimX * 1.5; pose.pupilY = p.aimY * 1.2;
      break;
    }
    case 'portalEnter': pose.eyeOpen = 1.1; pose.mouth = 'open'; break;
  }
  // ---- weapon reactions layered on top (Shoot GG / Shoot PG / Hold object / Pull) ----
  const wv = p.weapon && p.weapon.view ? p.weapon.view() : null;
  if (wv && !p.emote) {
    const grounded = anim === 'idle' || anim === 'walk' || anim === 'run' || anim === 'crouch' || anim === 'land';
    if (wv.recoil > 0) {                       // shot kick: lean back, ears back, squint, tail snaps up
      const k = wv.recoil;
      pose.bodyTilt -= 0.14 * k; pose.headTilt -= 0.1 * k; pose.headX -= 2 * k; pose.earFlick -= 0.35 * k;
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - 0.35 * k); pose.tailAngle -= 0.5 * k; pose.tailCurl -= 0.3 * k;
      if (wv.kind === 'portal' && k > 0.6) pose.mouth = 'o';
      if (wv.kind === 'gravity' && k > 0.6) pose.mouth = 'grit';
    } else if (wv.holding && wv.charge < 0.75) {   // pulling an object in: braced stance, focused squint
      pose.eyeOpen = Math.min(pose.eyeOpen, 0.7); pose.mouth = 'small'; pose.browRaise = -0.5;
      pose.bodyTilt += 0.06; pose.headTilt += 0.04; pose.pupilX = p.aimX * 2; pose.pupilY = p.aimY * 1.6;
      if (grounded) { pose.legSpread = 1; pose.crouch = Math.max(pose.crouch, 0.15); }
    } else if (wv.holding) {                   // holding an object: wide stance, satisfied look, tail swaying with the load
      pose.mouth = anim === 'run' ? 'open' : 'smile'; pose.browRaise = 0.3;
      pose.bodyTilt -= 0.05; pose.pupilX = p.aimX * 1.5; pose.pupilY = p.aimY * 1.2;
      pose.tailWag += wave(time, 0.9) * 0.2;
      if (grounded) pose.legSpread = 1;
    }
  }
  if (p.blink > 0) pose.eyeOpen = 0.05;
  if (p.crouching) pose.crouch = Math.max(pose.crouch, 1);
  return pose;
}

/**
 * Draw the cat at world position (drawn at the body's feet center).
 * ctx must already be translated by the camera.
 */
export function drawCat(ctx, p, time, weaponView) {
  const pose = computePose(p, time);
  const b = p.body;
  const fx = b.cx, fy = b.bottom;
  const facing = p.facing;
  const glow = Math.max(p.tunnelFx || 0, 0) + (p.fieldFlash > 0 ? p.fieldFlash * 2 : 0);
  if (glow > 0.03) drawQuantumOutline(ctx, p, pose, time, weaponView, facing, Math.min(1.6, glow));
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(facing, 1);
  // squash & stretch around the feet
  ctx.scale(pose.squashX, pose.squashY);
  drawCatLocal(ctx, pose, p, time, weaponView, facing);
  ctx.restore();
}

// Quantum tunneling mode: a glowing blue outline around the whole cat. The cat is rendered once into a small
// offscreen canvas, turned into a blue silhouette and stamped around the cat (8 offsets) with a soft glow.
let outlineCanvas = null;
const OUT_W = 200, OUT_H = 200, OUT_OX = 100, OUT_OY = 150;   // feet anchor inside the offscreen canvas
function drawQuantumOutline(ctx, p, pose, time, weaponView, facing, strength) {
  if (!outlineCanvas) { outlineCanvas = document.createElement('canvas'); outlineCanvas.width = OUT_W; outlineCanvas.height = OUT_H; }
  const oc = outlineCanvas.getContext('2d');
  oc.save();
  oc.globalCompositeOperation = 'source-over';
  oc.clearRect(0, 0, OUT_W, OUT_H);
  oc.translate(OUT_OX, OUT_OY);
  oc.scale(facing, 1);
  oc.scale(pose.squashX, pose.squashY);
  drawCatLocal(oc, pose, p, time, weaponView, facing);
  oc.restore();
  const b = p.body;
  const x = b.cx - OUT_OX, y = b.bottom - OUT_OY;
  const flick = 0.8 + 0.2 * Math.sin(time * 18) + (p.fieldFlash > 0 ? 0.4 : 0);
  const a = Math.min(1, strength);
  // tint: keep alpha, replace colour (source-in) — first a deep blue wide ring, then a bright thin one
  const tint = (color) => { oc.save(); oc.globalCompositeOperation = 'source-in'; oc.fillStyle = color; oc.fillRect(0, 0, OUT_W, OUT_H); oc.restore(); };
  const stamp = (r) => { for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4 + time * 2; ctx.drawImage(outlineCanvas, x + Math.cos(ang) * r, y + Math.sin(ang) * r); } };
  ctx.save();
  tint('rgba(40,130,255,1)');
  ctx.globalAlpha = 0.45 * a;
  ctx.shadowColor = 'rgba(60,170,255,1)'; ctx.shadowBlur = 16 + 5 * Math.sin(time * 11);
  ctx.drawImage(outlineCanvas, x, y);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.85 * a;
  stamp(3.5 + 0.5 * Math.sin(time * 13));
  tint(`rgba(${Math.round(150 + 60 * flick)},${Math.round(225 + 30 * flick)},255,1)`);
  ctx.globalAlpha = 0.95 * a;
  stamp(1.6);
  // drifting quantum particles
  ctx.globalAlpha = 0.8 * a;
  ctx.fillStyle = '#DFF6FF';
  for (let i = 0; i < 5; i++) {
    const t = time * (0.8 + i * 0.17) + i * 1.3;
    const px = b.cx + Math.cos(t) * (22 + (i % 2) * 8), py = b.cy + Math.sin(t * 1.7) * 30 - 4;
    ctx.beginPath(); ctx.arc(px, py, 1.6 + (i % 2) * 0.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function drawCatLocal(ctx, pose, p, time, weaponView, facing = 1) {
  const c = pose.crouch;
  const lift = 1 - c * 0.35;
  // key vertical anchors (negative = up)
  const legLen = 16 * lift;
  const bodyCY = -(legLen + 15 * lift) + pose.bodyY;   // body center
  const bodyRX = 16, bodyRY = 15.5 * lift + c * 2;
  const headR = 18.5;
  const headCX = 2 + pose.headX + c * 3;
  const headCY = bodyCY - bodyRY - headR * 0.72 + pose.headY + c * 6;

  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // ---------- tail (behind) ----------
  drawTail(ctx, -bodyRX + 4, bodyCY + 4, pose, time);

  // ---------- far (back) leg & arm ----------
  drawLeg(ctx, -5, bodyCY + bodyRY - 6, legLen, pose.legBack, pose, true);
  const gunHeld = weaponView && weaponView.kind;
  if (!gunHeld) drawArm(ctx, -3, bodyCY - 4, pose.armBack, pose, true, 0);

  // ---------- body ----------
  ctx.save();
  ctx.translate(0, bodyCY);
  ctx.rotate(pose.bodyTilt);
  // fur
  ctx.fillStyle = CAT.fur;
  ctx.beginPath(); ctx.ellipse(0, 0, bodyRX, bodyRY, 0, 0, TAU); ctx.fill();
  // back stripes
  ctx.strokeStyle = CAT.stripe; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    const yy = i * 7;
    ctx.moveTo(-bodyRX + 3, yy - 2);
    ctx.quadraticCurveTo(-bodyRX + 9, yy + 1, -bodyRX + 10, yy + 6);
    ctx.stroke();
  }
  // cream belly / chest (front-facing oval)
  ctx.fillStyle = CAT.cream;
  ctx.beginPath(); ctx.ellipse(5.5, 3, bodyRX * 0.62, bodyRY * 0.82, 0.05, 0, TAU); ctx.fill();
  // soft outline
  ctx.strokeStyle = CAT.outline; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(0, 0, bodyRX, bodyRY, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  // ---------- near (front) leg ----------
  drawLeg(ctx, 5, bodyCY + bodyRY - 6, legLen, pose.legFront, pose, false);

  // ---------- head ----------
  ctx.save();
  ctx.translate(headCX, headCY);
  ctx.rotate(pose.headTilt);
  drawHead(ctx, headR, pose, p, time);
  ctx.restore();
  if (pose.groom) { // paw rubbing the cheek, in front of the head
    const g = pose.groom - 1; // -1..1 oscillation
    drawArmTo(ctx, -3, bodyCY - 4, headCX + 6 + g * 2, headCY + 6 + g * 3, false);
  }
  if (pose.smoke) drawSmokeBreak(ctx, pose, headCX, headCY, headR, bodyCY, time);

  // ---------- arms & gun (in front of body) ----------
  if (gunHeld) {
    // hand anchor in local space
    const hx = 9, hy = bodyCY - 2;
    const ang = weaponView.localAngle; // already mirrored for facing
    // back arm reaches to the grip
    drawArmTo(ctx, -2, bodyCY - 5, hx + Math.cos(ang) * 4, hy + Math.sin(ang) * 4, true);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    drawGun(ctx, weaponView.kind, weaponView, time);
    ctx.restore();
    // front arm/paw over the grip
    drawArmTo(ctx, 6, bodyCY - 3, hx + Math.cos(ang) * 1, hy + Math.sin(ang) * 1 + 2, false);
  } else {
    drawArm(ctx, 6, bodyCY - 3, pose.armFront, pose, false, 1);
  }

  // ---------- emotes ----------
  if (pose.question || pose.exclaim) {
    ctx.save();
    ctx.scale(facing, 1); // keep text unmirrored
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = pose.exclaim ? '#F5554A' : '#5B7BD5';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    const txt = pose.exclaim ? '!' : '?';
    const yy = headCY - headR - 16 + Math.sin(time * 4) * 2;
    ctx.strokeText(txt, facing * (headCX + 14), yy); ctx.fillText(txt, facing * (headCX + 14), yy);
    ctx.restore();
  }
  if (pose.sparkle) {
    for (let i = 0; i < 5; i++) {
      const a = time * 3 + i * 1.3;
      const r = 24 + Math.sin(time * 5 + i) * 4;
      const sx = headCX + Math.cos(a) * r, sy = headCY + Math.sin(a) * r * 0.8;
      drawSparkle(ctx, sx, sy, 3 + Math.sin(time * 7 + i) * 1.2, i % 2 ? '#FFD75E' : '#FFF6C8');
    }
  }
  if (pose.sweat) {
    ctx.fillStyle = '#8CD3F5';
    const sy = headCY - 6 + ((time * 40) % 12);
    ctx.beginPath(); ctx.ellipse(headCX - headR - 2, sy, 2.2, 3.2, 0, 0, TAU); ctx.fill();
  }
}

/** Idle flourish: the paw holds a little "cigarette" up to the mouth; smoke rings shaped like cat faces float away. */
function drawSmokeBreak(ctx, pose, headCX, headCY, headR, bodyCY, time) {
  const { el, s, puffing } = pose.smoke;
  const r = headR;
  // mouth position (head local → body local; the head tilt is small enough to ignore)
  const mouthX = headCX + r * 0.34 + r * 0.05, mouthY = headCY + r * 0.32 - r * 0.16 + 4;
  // paw: raised from the front shoulder to just below / in front of the mouth (so the mouth stays visible);
  // it dips a little between puffs
  const bob = puffing ? 0 : 3;
  const tx = mouthX + 7, ty = mouthY + 9 + bob;
  const px = 6 + (tx - 6) * s, py = bodyCY - 3 + (ty - (bodyCY - 3)) * s;
  drawArmTo(ctx, 6, bodyCY - 3, px, py, false);
  if (s > 0.6) {
    // the cigarette: held between the toes, pointing up-left toward the mouth; glowing tip with a thin wisp
    const ang = Math.atan2(mouthY - py, mouthX - px);
    ctx.save();
    ctx.translate(px + Math.cos(ang) * 3, py + Math.sin(ang) * 3);
    ctx.rotate(ang);
    ctx.fillStyle = '#FFFDF6'; roundRect(ctx, 0, -1.4, 10, 2.8, 1.2); ctx.fill();
    ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#D9A066'; ctx.fillRect(0, -1.4, 2, 2.8);
    const glow = puffing ? 1 : 0.55 + 0.25 * Math.sin(time * 6);
    ctx.fillStyle = `rgba(255,${120 + 80 * glow | 0},50,1)`; ctx.beginPath(); ctx.arc(10, 0, 1.7, 0, TAU); ctx.fill();
    ctx.restore();
    // wisp rising from the tip
    const tipX = px + Math.cos(ang) * 13, tipY = py + Math.sin(ang) * 13;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(tipX + 2 + Math.sin(time * 3) * 2, tipY - 7, tipX - 1 + Math.sin(time * 2.2) * 2, tipY - 14); ctx.stroke();
  }
  // smoke rings: one per puff, drifting up and forward, growing and fading; each is a tiny cat face
  for (let k = 0; k < 4; k++) {
    const born = 0.6 + k * 1.4 + 0.3;
    const age = el - born;
    if (age < 0 || age > 2.4) continue;
    const a = Math.min(1, age * 4) * (1 - age / 2.4) * 0.95;
    const rr = 3 + age * 5;
    const x = mouthX + 5 + age * 9 + Math.sin(age * 3 + k) * 2, y = mouthY - 6 - age * 24;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.8 + age * 0.7; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    // face outline with two ears
    ctx.arc(x, y, rr, Math.PI * 1.15, Math.PI * 1.85, true);                 // bottom & sides (drawn the long way round)
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(Math.PI * 1.85) * rr, y + Math.sin(Math.PI * 1.85) * rr);
    ctx.lineTo(x + rr * 0.95, y - rr * 1.35);                                 // right ear tip
    ctx.lineTo(x + rr * 0.35, y - rr * 0.98);
    ctx.lineTo(x - rr * 0.35, y - rr * 0.98);
    ctx.lineTo(x - rr * 0.95, y - rr * 1.35);                                 // left ear tip
    ctx.lineTo(x + Math.cos(Math.PI * 1.15) * rr, y + Math.sin(Math.PI * 1.15) * rr);
    ctx.stroke();
    // eyes & nose appear as the ring grows
    if (rr > 4.5) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x - rr * 0.35, y - rr * 0.1, 1.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + rr * 0.35, y - rr * 0.1, 1.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 1.2, y + rr * 0.3); ctx.lineTo(x + 1.2, y + rr * 0.3); ctx.lineTo(x, y + rr * 0.3 + 1.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function drawTail(ctx, x, y, pose, time) {
  const base = pose.tailAngle + pose.tailWag;   // -0.9 = raised behind the back
  const curl = pose.tailCurl;
  // tail spine: starts at the rump, goes back & up, curls forward at the tip ("?" shape)
  const segs = 8;
  const pts = [];
  let px = x, py = y, ang = Math.PI - base;      // pointing backward/up (in mirrored local space)
  const segLen = 5.2;
  for (let i = 0; i <= segs; i++) {
    pts.push([px, py]);
    const k = i / segs;
    ang += curl * 0.3 * (0.5 + 0.5 * Math.sin(k * 2.6)) + Math.sin(time * 2.5 + k * 4) * 0.05;
    px += Math.cos(ang) * segLen; py += Math.sin(ang) * segLen;
  }
  const widths = pts.map((_, i) => 5 + 2.5 * Math.sin((i / segs) * Math.PI) + (i / segs) * 1.2);
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.3; ctx.lineCap = 'round';
  for (let i = 0; i < segs; i++) { ctx.lineWidth = widths[i] * 2 + 2.4; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < segs; i++) {
    ctx.strokeStyle = i % 3 === 1 ? CAT.stripe : CAT.fur;
    if (i >= segs - 1) ctx.strokeStyle = CAT.cream;
    ctx.lineWidth = widths[i] * 2;
    ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
  }
  const tip = pts[segs];
  ctx.fillStyle = CAT.cream; ctx.beginPath(); ctx.arc(tip[0], tip[1], widths[segs] * 0.95, 0, TAU); ctx.fill();
}

function drawLeg(ctx, x, y, len, swing, pose, far) {
  // leg: thick orange stub with a white sock foot; swings from hip at (x,y)
  const s = pose.climb ? swing * 0.5 : swing;
  const lift = pose.legLift ? Math.max(0, -Math.cos(s + Math.PI / 2)) * 4 : 0;
  ctx.save();
  ctx.translate(x + (pose.legSpread ? (far ? -3 : 3) : 0), y);   // spread: feet planted wider apart
  ctx.rotate(s * 0.9 + (pose.legSpread ? (far ? 0.12 : -0.12) : 0));
  const l = len - lift + (pose.legSpread ? 1 : 0);
  ctx.fillStyle = far ? CAT.furDark : CAT.fur;
  ctx.strokeStyle = CAT.outline; ctx.lineWidth = 1.4; ctx.globalAlpha = 1;
  roundRect(ctx, -6.5, -3, 13, l + 3, 6); ctx.fill();
  ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;
  // stripe
  ctx.strokeStyle = CAT.stripe; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-4, l * 0.35); ctx.lineTo(4, l * 0.45); ctx.stroke();
  // sock (foot)
  ctx.fillStyle = far ? CAT.creamShade : CAT.white;
  ctx.beginPath(); ctx.ellipse(1.5, l - 1, 8.5, 5.2, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
  // toe lines
  ctx.strokeStyle = CAT.creamShade; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(4, l + 1); ctx.lineTo(4, l + 3.5); ctx.moveTo(7, l + 0.5); ctx.lineTo(7.5, l + 3); ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, x, y, swing, pose, far, side) {
  // arm: from shoulder down/forward to a round white paw. swing: rotation, armsUp lifts them.
  const up = pose.armsUp;
  let ang = 0.35 + swing - up * 2.4;
  if (pose.armsUp === 0 && swing === 0 && !pose.climb) ang = 0.15; // default: paws held in front of the chest (like the reference)
  const len = pose.climb ? 15 : 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = far ? CAT.furDark : CAT.fur;
  roundRect(ctx, -4.5, -2, 9, len, 4.5); ctx.fill();
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = CAT.stripe; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, len * 0.45); ctx.lineTo(3, len * 0.5); ctx.stroke();
  drawPaw(ctx, 0, len - 1, far, side ? 1 : 0.5);
  ctx.restore();
}

function drawArmTo(ctx, sx, sy, tx, ty, far) {
  const dx = tx - sx, dy = ty - sy;
  const len = Math.max(8, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang);
  ctx.fillStyle = far ? CAT.furDark : CAT.fur;
  roundRect(ctx, -4.5, -2, 9, len, 4.5); ctx.fill();
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = CAT.stripe; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, len * 0.45); ctx.lineTo(3, len * 0.5); ctx.stroke();
  drawPaw(ctx, 0, len - 1, far, 0.4);
  ctx.restore();
}

function drawPaw(ctx, x, y, far, padAlpha = 1) {
  ctx.fillStyle = far ? CAT.creamShade : CAT.white;
  ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
  if (padAlpha > 0) {
    ctx.globalAlpha = padAlpha; ctx.fillStyle = CAT.pad;
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 2.8, 2.2, 0, 0, TAU); ctx.fill();
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 2.6, y - 2.2 + Math.abs(i) * 0.6, 1.1, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

function drawHead(ctx, r, pose, p, time) {
  // ears (behind head)
  const earFlick = pose.earFlick;
  drawEar(ctx, -r * 0.62, -r * 0.62, -0.55 + earFlick * 0.5, r);
  drawEar(ctx, r * 0.58, -r * 0.66, 0.45 - earFlick * 0.5, r);

  // head shape: big round, slightly wider than tall, with soft cheeks
  ctx.fillStyle = CAT.fur;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, TAU); ctx.fill();
  // cheeks lighter
  ctx.fillStyle = CAT.furLight;
  ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 0.35, r * 0.42, r * 0.36, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.55, r * 0.35, r * 0.42, r * 0.36, 0, 0, TAU); ctx.fill();
  // forehead "M" stripes
  ctx.strokeStyle = CAT.stripe; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 5.5 + 1, -r * 0.95 + Math.abs(i) * 1.5);
    ctx.lineTo(i * 4.5 + 1, -r * 0.55 + Math.abs(i) * 1.5);
    ctx.stroke();
  }
  // side stripes on cheeks
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.05); ctx.lineTo(-r * 0.7, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.96, r * 0.25); ctx.lineTo(-r * 0.7, r * 0.22); ctx.stroke();
  // soft outline
  ctx.strokeStyle = CAT.outline; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;

  // muzzle (cream) — offset forward for the 3/4 view
  const mx = r * 0.34, my = r * 0.32;
  ctx.fillStyle = CAT.cream;
  ctx.beginPath(); ctx.ellipse(mx, my, r * 0.5, r * 0.4, 0, 0, TAU); ctx.fill();

  // eyes: huge, teal, near eye slightly larger
  const eo = clamp(pose.eyeOpen, 0.05, 1.3);
  drawEye(ctx, -r * 0.2, -r * 0.08, r * 0.24, eo, pose.pupilX, pose.pupilY, false);
  drawEye(ctx, r * 0.5, -r * 0.1, r * 0.27, eo, pose.pupilX, pose.pupilY, true);
  // brows (short dark strokes above the eyes)
  ctx.strokeStyle = CAT.furDark; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const br = pose.browRaise * 2;
  ctx.beginPath(); ctx.moveTo(-r * 0.36, -r * 0.44 - br); ctx.lineTo(-r * 0.12, -r * 0.5 - br); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.35, -r * 0.52 - br); ctx.lineTo(r * 0.62, -r * 0.46 - br); ctx.stroke();

  // nose
  ctx.fillStyle = CAT.nose;
  ctx.beginPath();
  ctx.moveTo(mx + r * 0.05 - 3.4, my - r * 0.16);
  ctx.lineTo(mx + r * 0.05 + 3.4, my - r * 0.16);
  ctx.lineTo(mx + r * 0.05, my - r * 0.16 + 3.6);
  ctx.closePath(); ctx.fill();
  // nose highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(mx + r * 0.05 - 1, my - r * 0.16 + 0.5, 0.9, 0, TAU); ctx.fill();

  // mouth
  const mouthX = mx + r * 0.05, mouthY = my - r * 0.16 + 4;
  ctx.strokeStyle = CAT.mouth; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  switch (pose.mouth) {
    case 'open': case 'yawn': {
      const h = pose.mouth === 'yawn' ? 5 : 4.2;
      ctx.fillStyle = CAT.mouth;
      ctx.beginPath(); ctx.moveTo(mouthX - 4, mouthY + 1); ctx.quadraticCurveTo(mouthX, mouthY + h * 2.2, mouthX + 4.5, mouthY + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = CAT.tongue;
      ctx.beginPath(); ctx.ellipse(mouthX + 0.5, mouthY + h * 1.1, 2.4, 1.8, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'o': ctx.fillStyle = CAT.mouth; ctx.beginPath(); ctx.ellipse(mouthX, mouthY + 3, 2.2, 2.8, 0, 0, TAU); ctx.fill(); break;
    case 'grit': ctx.beginPath(); ctx.moveTo(mouthX - 4, mouthY + 3); ctx.lineTo(mouthX + 4, mouthY + 3); ctx.stroke(); break;
    case 'small': ctx.beginPath(); ctx.moveTo(mouthX, mouthY); ctx.lineTo(mouthX, mouthY + 2); ctx.stroke(); break;
    default: // smile ("w" shape)
      ctx.beginPath(); ctx.moveTo(mouthX, mouthY); ctx.quadraticCurveTo(mouthX - 1.5, mouthY + 4, mouthX - 4.5, mouthY + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mouthX, mouthY); ctx.quadraticCurveTo(mouthX + 1.5, mouthY + 4, mouthX + 4.5, mouthY + 2); ctx.stroke();
  }
  // whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(mx + r * 0.3, my + i * 3); ctx.lineTo(mx + r * 0.3 + 12, my + i * 4.5 - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - r * 0.55, my + i * 3); ctx.lineTo(mx - r * 0.55 - 11, my + i * 4.5 - 1); ctx.stroke();
  }
  // blush
  if (pose.blush) {
    ctx.fillStyle = 'rgba(245,140,150,0.45)';
    ctx.beginPath(); ctx.ellipse(-r * 0.55, r * 0.3, 4.5, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.85, r * 0.3, 4.5, 2.6, 0, 0, TAU); ctx.fill();
  }
}

function drawEar(ctx, x, y, rot, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const w = r * 0.6, h = r * 0.78;
  ctx.fillStyle = CAT.fur;
  ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.35); ctx.quadraticCurveTo(-w * 0.2, -h * 0.9, 0.5, -h); ctx.quadraticCurveTo(w * 0.3, -h * 0.8, w / 2, h * 0.35); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = CAT.earInner;
  ctx.beginPath(); ctx.moveTo(-w * 0.28, h * 0.3); ctx.quadraticCurveTo(-w * 0.1, -h * 0.5, 0.3, -h * 0.62); ctx.quadraticCurveTo(w * 0.2, -h * 0.45, w * 0.28, h * 0.3); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawEye(ctx, x, y, r, open, px, py, near) {
  ctx.save();
  ctx.translate(x, y);
  // eyelid clipping (blink)
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * Math.min(1.1, open), 0, 0, TAU); ctx.clip();
  // white
  ctx.fillStyle = CAT.white;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r, 0, 0, TAU); ctx.fill();
  // iris
  const ix = clamp(px, -r * 0.3, r * 0.3) + (near ? 0.5 : 1.2), iy = clamp(py, -r * 0.3, r * 0.3) + 0.5;
  const g = ctx.createRadialGradient(ix, iy, r * 0.15, ix, iy, r * 0.8);
  g.addColorStop(0, '#5FC5B7'); g.addColorStop(0.7, CAT.iris); g.addColorStop(1, CAT.irisDark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(ix, iy, r * 0.78, 0, TAU); ctx.fill();
  // pupil
  ctx.fillStyle = CAT.pupil;
  ctx.beginPath(); ctx.ellipse(ix, iy, r * 0.42, r * 0.5, 0, 0, TAU); ctx.fill();
  // highlights
  ctx.fillStyle = CAT.white;
  ctx.beginPath(); ctx.arc(ix - r * 0.28, iy - r * 0.32, r * 0.24, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + r * 0.3, iy + r * 0.25, r * 0.11, 0, TAU); ctx.fill();
  ctx.restore();
  // lid line
  ctx.strokeStyle = CAT.outline; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * Math.min(1.1, open), 0, Math.PI, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawSparkle(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
