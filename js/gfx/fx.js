var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Pooled particles (§0.11): fixed typed arrays, live particles packed at the front,
// a dead one is replaced by the last live one. Emitting into a full pool drops the
// extra particles, so nothing is ever allocated after load. Visual only: uses G.vrng.
G.gfx = G.gfx || {};
G.gfx.fx = (function () {
  var MAX = 256;
  var SPLASH = 0, WAKE = 1, BUBBLE = 2, DUST = 3;
  var KINDS = { splash: SPLASH, wake: WAKE, bubbles: BUBBLE, dust: DUST };
  // Per kind: colour key, life range (s), speed range (px/s), gravity (px/s²).
  var SPEC = [
    { color: 'fog_light', life0: 0.35, life1: 0.7, sp0: 20, sp1: 55, grav: 140 },  // splash: up and out, falls back
    { color: 'water_hi', life0: 0.6, life1: 1.2, sp0: 3, sp1: 10, grav: 0 },       // wake: slow sideways spread
    { color: 'fog_mid', life0: 1.0, life1: 2.2, sp0: 6, sp1: 14, grav: -6 },       // bubbles: rise and wobble
    { color: 'paper', life0: 2.0, life1: 4.0, sp0: 1, sp1: 4, grav: 0 }            // dust: drifts in the air
  ];

  var x = new Float32Array(MAX), y = new Float32Array(MAX);
  var vx = new Float32Array(MAX), vy = new Float32Array(MAX);
  var life = new Float32Array(MAX), max = new Float32Array(MAX), phase = new Float32Array(MAX);
  var kind = new Uint8Array(MAX);
  var n = 0, dropped = 0;

  // Ripples: flat ellipses that grow and fade on the water surface, in their own small pool.
  var RMAX = 32;
  var rxw = new Float32Array(RMAX), ryw = new Float32Array(RMAX);
  var rr0 = new Float32Array(RMAX), rr1 = new Float32Array(RMAX);
  var rlife = new Float32Array(RMAX), rmax = new Float32Array(RMAX);
  var rn = 0;

  // Emits up to count particles of kindName at (px, py) in world pixels. Returns how many fit.
  function emit(kindName, px, py, count) {
    var k = KINDS[kindName], s = SPEC[k], r = G.vrng, made = 0;
    for (var i = 0; i < count; i++) {
      if (n >= MAX) { dropped += count - i; break; }
      var sp = r.range(s.sp0, s.sp1), a;
      if (k === SPLASH) a = -Math.PI * r.range(0.15, 0.85);       // upward fan
      else if (k === WAKE) a = r.next() < 0.5 ? 0 : Math.PI;      // left or right
      else if (k === BUBBLE) a = -Math.PI / 2;
      else a = r.range(0, Math.PI * 2);
      x[n] = px + r.range(-1, 1); y[n] = py;
      vx[n] = Math.cos(a) * sp; vy[n] = Math.sin(a) * sp;
      life[n] = max[n] = r.range(s.life0, s.life1);
      phase[n] = r.range(0, 6.283);
      kind[n] = k;
      n++; made++;
    }
    return made;
  }

  function kill(i) {
    n--;
    x[i] = x[n]; y[i] = y[n]; vx[i] = vx[n]; vy[i] = vy[n];
    life[i] = life[n]; max[i] = max[n]; phase[i] = phase[n]; kind[i] = kind[n];
  }

  // A ripple centred at (px, py) growing from radius r0 to r1 over lifeS seconds. False if the pool is full.
  function ripple(px, py, r0, r1, lifeS) {
    if (rn >= RMAX) { dropped++; return false; }
    rxw[rn] = px; ryw[rn] = py; rr0[rn] = r0; rr1[rn] = r1;
    rlife[rn] = rmax[rn] = lifeS;
    rn++;
    return true;
  }

  function update(dt) {
    for (var j = rn - 1; j >= 0; j--) {
      rlife[j] -= dt;
      if (rlife[j] > 0) continue;
      rn--;
      rxw[j] = rxw[rn]; ryw[j] = ryw[rn]; rr0[j] = rr0[rn]; rr1[j] = rr1[rn];
      rlife[j] = rlife[rn]; rmax[j] = rmax[rn];
    }
    for (var i = n - 1; i >= 0; i--) {
      life[i] -= dt;
      if (life[i] <= 0) { kill(i); continue; }
      var k = kind[i];
      vy[i] += SPEC[k].grav * dt;
      if (k === BUBBLE) { phase[i] += dt * 6; x[i] += Math.sin(phase[i]) * 6 * dt; }
      else if (k === WAKE) { vx[i] *= 1 - 1.5 * dt; }
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }
  }

  // Draws every live particle as one pixel, fading with life, offset by the camera.
  function draw(ctx, camX, camY) {
    var P = G.gfx.sprites.PALETTE;
    ctx.fillStyle = P.water_hi;
    for (var j = 0; j < rn; j++) {
      var a = rlife[j] / rmax[j], rad = rr1[j] - (rr1[j] - rr0[j]) * a, ry = Math.max(1, rad * 0.22);
      var steps = Math.min(48, Math.ceil(rad * 2) + 4), cx = rxw[j] - camX, cy = ryw[j] - camY;
      ctx.globalAlpha = a;
      for (var s = 0; s < steps; s++) {
        var ang = s * 6.2832 / steps;
        ctx.fillRect(Math.round(cx + Math.cos(ang) * rad), Math.round(cy + Math.sin(ang) * ry), 1, 1);
      }
    }
    for (var k = 0; k < SPEC.length; k++) {
      ctx.fillStyle = P[SPEC[k].color];
      for (var i = 0; i < n; i++) {
        if (kind[i] !== k) continue;
        ctx.globalAlpha = life[i] / max[i];
        ctx.fillRect((x[i] - camX) | 0, (y[i] - camY) | 0, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // A lure landing (V3.2): droplets thrown up and out, then two flat elliptical rings,
  // a quick small one and a slow wide one. y is the waterline; power 0..1 scales it.
  function splash(px, y, power) {
    emit('splash', px, y - 1, 8 + Math.round(10 * power));
    ripple(px, y + 2, 1, 7, 0.7);
    ripple(px, y + 3, 3, 12 + 8 * power, 1.6);
  }

  function clear() { n = 0; rn = 0; }

  return {
    MAX: MAX, RMAX: RMAX, emit: emit, ripple: ripple, splash: splash, update: update, draw: draw, clear: clear,
    count: function () { return n; },
    ripples: function () { return rn; },
    dropped: function () { return dropped; }
  };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var fx = G.gfx.fx;
  return 'fx ' + fx.count() + '/' + fx.MAX + '  ripples ' + fx.ripples() + '/' + fx.RMAX + '  dropped ' + fx.dropped();
});
