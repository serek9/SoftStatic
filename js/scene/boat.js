var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The boat (V3.1): smooth acceleration and drag, a slow drift when idle, a 1 px bob,
// and the "nearly stopped" flag that later gates casting.
G.scene = G.scene || {};
G.scene.boat = (function () {
  var S = G.gfx.sprites;
  var P = {
    accel: 70,       // px/s² while a direction is held
    reverse: 110,    // px/s² when holding against the current motion
    maxV: 42,        // px/s
    drag: 1.4,       // 1/s, how fast speed relaxes toward the drift when nothing is held
    driftV: 1.2,     // px/s, peak idle drift
    driftRate: 0.13, // rad/s, how slowly the drift changes direction
    stopV: 2.5,      // px/s, below this the boat counts as nearly stopped
    margin: 16       // px kept from each world edge
  };

  function rep(ch, n) { var s = ''; while (n-- > 0) s += ch; return s; }

  // Phase 18: the boat, the fisher and the gear are painted in the 640×360 view's pixels
  // (HI per world pixel) and drawn at 1/HI size, in the same world boxes as before: a wooden
  // rowboat with lapped planks, a lit gunwale, a rust stripe and an outboard motor; the
  // fisher in a red cap and a green field jacket, hands on the rod; a lantern on a pole.
  // Each faces right; mirrored copies are made on first use.
  var A = G.gfx.paint, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var COAT = ['ink', 'coat_dark', 'coat', 'coat_hi'], SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], CAP = ['rust_dark', 'cap', 'rust_hi'];
  var ART = {
    hull: { w: 68, h: 16, paint: function (c) {
      // Per column: the gunwale rises to the bow; the bottom sweeps up to meet it at the bow
      // and rounds off at the stern. Lapped planks follow the gunwale; a rust stripe.
      A.area(c, 0, 0, 68, 16, function (x, y) {
        var top = Math.max(0, Math.round(4 - Math.max(0, x - 54) * 0.55));
        var bot = Math.round(15 - Math.max(0, 6 - x) * 0.9 - Math.max(0, x - 50) * 0.5 - Math.max(0, x - 60) * 0.4);
        if (y < top || y > bot || x > 66) return '';
        var r = y - top;
        if (y === bot || x === 0 || (x > 60 && y === top + 1 && x === 66)) return 'ink';
        if (r === 0) return 'wood_hi';
        if (r === 1) return 'wood_mid';
        if (r === 5 || r === 6) return r === 5 ? 'rust_hi' : 'rust';
        if (r % 3 === 1) return 'wood_dark';                                        // the lapped planks
        if (y >= bot - 1) return 'wood_deep';
        return r > 8 ? 'wood_dark' : 'wood';
      });
      A.box(c, 'wood_lit', 4, 4, 48, 1);
      for (var x = 12; x < 52; x += 13) A.px(c, 'stone_hi', x, 6);                   // oarlock and rivets
      A.box(c, 'wood_deep', 20, 2, 3, 2); A.box(c, 'wood_dark', 20, 1, 3, 1);          // an oarlock
    } },
    motor: { w: 10, h: 16, paint: function (c) {
      A.blob(c, 5, 4, 4.5, 3.8, STONES, { bias: 0.15 }); A.box(c, 'stone_dark', 1, 6, 8, 2);
      A.box(c, 'rust_hi', 2, 3, 5, 1);
      A.slab(c, 4, 8, 3, 6, STONES); A.slab(c, 2, 13, 7, 3, STONES);
    } },
    fisher: { w: 20, h: 26, paint: function (c, sip) {
      // Jacket: shoulders, a back, the arms reaching forward to the rod (or the cup).
      A.blob(c, 9, 19, 8, 8, COAT, { bias: 0.05 });
      A.box(c, 'coat_dark', 3, 20, 2, 6);
      A.limb(c, 12, 15, 16, 19, 2.6, COAT, 0.1);
      if (!sip) { A.limb(c, 15, 19, 18, 18, 2.2, COAT, 0.1); A.blob(c, 18.5, 18, 1.8, 1.6, SKIN, { bias: 0.1 }); }
      else { A.limb(c, 14, 18, 15, 13, 2.2, COAT, 0.1); A.blob(c, 15, 12, 1.6, 1.6, SKIN); A.slab(c, 15, 9, 3, 4, STONES); }
      A.box(c, 'coat_hi', 5, 14, 6, 1);
      // Head, collar, a stubbled jaw, the cap with its brim forward.
      A.box(c, 'coat_dark', 6, 13, 8, 2);
      A.blob(c, 10, 9, 4.5, 4.8, SKIN, { bias: 0.1 });
      A.box(c, 'skin_shadow', 10, 12, 4, 1); A.px(c, 'skin_shadow', 13, 11);
      A.px(c, 'ink', 12, 8); A.px(c, 'skin_hi', 13, 9); A.px(c, 'flesh_dark', 7, 9);
      A.blob(c, 9, 4.5, 5, 3.5, CAP, { bias: 0.1 }); A.box(c, 'rust_dark', 4, 6, 10, 1);
      A.box(c, 'cap', 12, 5, 5, 2); A.box(c, 'rust_dark', 12, 6, 5, 1);                 // the brim
      A.box(c, 'stone_dark', 5, 7, 2, 4);                                              // hair at the back
    } },
    lantern: { w: 6, h: 8, paint: function (c) {
      A.box(c, 'stone_dark', 2, 0, 2, 1); A.box(c, 'stone_dark', 1, 1, 4, 1);
      A.box(c, 'stone_dark', 0, 2, 6, 5); A.box(c, 'lamp_glow', 1, 2, 4, 4); A.box(c, 'cream', 2, 3, 1, 2);
      A.box(c, 'stone', 1, 7, 4, 1);
    } }
  };
  var art = {};
  function img(name, flip, arg) {
    var key = name + (arg ? '+' : '') + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(img(name, false, arg), 'x'));
    var a = ART[name];
    return (art[key] = G.gfx.bake.layer(a.w, a.h, function (c) { A.reset(); a.paint(c, arg); A.reset(); }));
  }
  // Draws a painted image at world (x, y), at 1/HI size.
  function put(ctx, cv, x, y) { ctx.drawImage(cv, x, y, cv.width / HI, cv.height / HI); }

  var ROD_KEYS = ['stone_hi', 'wood_hi', 'rust_hi', 'moss_hi', 'bone'];
  var P_SPEED = 42; // px/s, the speed at which the dog's ears stream fully (P.maxV)
  var halo = null;

  // A soft round glow in dusk_high (the ceiling), baked once; drawn at low alpha at night.
  function bakeHalo() {
    var R = 30, cv = G.gfx.bake.canvas(R * 2 + 1, R * 2 + 1), ctx = cv.getContext('2d');
    ctx.fillStyle = S.PALETTE.dusk_high;
    for (var y = -R; y <= R; y++) {
      for (var x = -R; x <= R; x++) {
        var d = Math.sqrt(x * x + y * y) / R;
        if (d > 1) continue;
        ctx.globalAlpha = Math.round((1 - d) * (1 - d) * 4) / 10; // 4 stepped rings, 0.4 at most
        ctx.fillRect(x + R, y + R, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  // Phase 24: what the boat does on top of its speed (presentation only; step() is unchanged).
  var M = {
    pitchK: 30, pitchC: 2,     // the pitch spring (1/s², 1/s): underdamped, it rocks a few times
    accelPitch: 2 / 70,        // degrees of bow-up per px/s² of forward acceleration
    waveTip: 0.6,              // share of the surface's slope the hull follows (it spans the waves)
    speedPitch: 1,             // degrees of bow-up at full speed under full throttle
    heaveK: 40, heaveC: 5,     // the boat riding the surface's height
    halfLen: 15,               // px from the hull's centre to the bow and to the stern
    up: 1 / 0.6, down: 1 / 1.2, // throttle per s, spooling up and back down
    idle: 900, full: 4500,     // rpm
    start: 0.4,                // s of pull-start before the motor runs
    rest: 8,                   // s stopped before it cuts out
    squat: 0.006,              // px the hull dips per px/s² of braking
    wakeAfter: 1.3,            // s after the boat drops from speed until its own wake reaches it
    wakeLift: 3, wakeTip: 8    // the wake's kick at full speed: heave px/s up, pitch °/s bow down
  };
  var D2R = Math.PI / 180;

  function create(x) {
    return { x: x, vx: 0, t: 0, facing: 1, stopped: true,
      pitch: 0, pv: 0, wave: 0, show: 0, heave: 0, hv: 0, ax: 0, prevVx: 0, lean: 0, peak: 0, wakeT: -1, wakeA: 0, wakeHit: false,
      throttle: 0, rpm: 0, motor: false, startT: -1, restT: 0, puff: 0, starts: 0 };
  }

  // Phase 24: pitch, heave, throttle and the outboard, after step(). hBow and hStern are the
  // surface's heights (world px, up positive) under the bow and the stern.
  function motion(b, move, dt, hBow, hStern) {
    var a = (b.vx - b.prevVx) / dt;
    b.prevVx = b.vx;
    b.ax += (a * b.facing - b.ax) * Math.min(1, 8 * dt);
    // The outboard: a pull-start on the first move, idling, cut out after a long rest.
    if (move !== 0) {
      b.restT = 0;
      if (!b.motor && b.startT < 0) { b.startT = 0; b.starts++; }
    } else if (b.stopped && b.motor) { b.restT += dt; if (b.restT >= M.rest) b.motor = false; }
    if (b.startT >= 0) { b.startT += dt; if (b.startT >= M.start) { b.startT = -1; b.motor = true; b.puff = 0.5; } }
    var tgt = b.motor ? Math.abs(move) : 0;
    b.throttle += Math.max(-M.down * dt, Math.min(M.up * dt, tgt - b.throttle));
    var rt = b.motor ? M.idle + (M.full - M.idle) * b.throttle : (b.startT >= 0 ? 600 * b.startT / M.start : 0);
    b.rpm += (rt - b.rpm) * Math.min(1, (rt > b.rpm ? 6 : 3) * dt);
    if (b.puff > 0) b.puff -= dt;
    // Pitch: bow up under acceleration and at speed, down on a stop, rocking back to level.
    var pt = M.accelPitch * b.ax + M.speedPitch * Math.min(1, Math.abs(b.vx) / P.maxV) * b.throttle;
    b.pv += (-M.pitchK * (b.pitch - pt) - M.pitchC * b.pv) * dt;
    b.pitch += b.pv * dt;
    // The surface: heave rides its mean under the hull, and its slope tips the boat.
    var w = M.waveTip * Math.atan2(hBow - hStern, 2 * M.halfLen) / D2R;
    b.wave += (w - b.wave) * Math.min(1, 6 * dt);
    b.show = b.pitch + b.wave;
    // The boat's own wake: the waves it pushed out behind travel slower than it sails, so when
    // it drops from speed they catch it up wakeAfter s later, lifting the stern first. (The
    // ripples on the surface are too small and too damped to do this by themselves at the hull.)
    var sp = Math.abs(b.vx) / P.maxV;
    b.wakeHit = false;
    if (sp > b.peak) b.peak = sp;
    if (b.peak > 0.6 && sp < 0.3 && b.wakeT < 0) { b.wakeT = M.wakeAfter; b.wakeA = b.peak; b.peak = 0; }
    if (b.wakeT >= 0) {
      b.wakeT -= dt;
      if (b.wakeT < 0) { b.hv += M.wakeLift * b.wakeA; b.pv -= M.wakeTip * b.wakeA; b.wakeHit = true; }
    }
    if (sp < 0.05) b.peak = Math.min(b.peak, sp);
    // Heave: riding the surface under the hull, and squatting as it brakes.
    var squat = b.ax < 0 ? M.squat * b.ax : 0;
    b.hv += (-M.heaveK * (b.heave - (hBow + hStern) / 2 - squat) - M.heaveC * b.hv) * dt;
    b.heave += b.hv * dt;
    b.lean = Math.max(-1, Math.min(1, -b.ax * 0.012));   // the fisher leans back on throttle
  }

  // The vertical shift (world px) of a point dx px along the hull from its centre (toward the
  // bow when dx > 0 along the facing): the pitch drawn as a shear, in whole view pixels, so
  // the painted pixels stay crisp (8.3 #84: no rotated art).
  function shear(b, dx) { return Math.round(-Math.tan(b.show * D2R) * dx * HI) / HI; }

  // move is the input axis (-1, 0, 1). worldW clamps the boat inside the location.
  function step(b, move, dt, worldW) {
    b.t += dt;
    if (move !== 0) {
      b.vx += move * (b.vx * move < 0 ? P.reverse : P.accel) * dt;
      b.facing = move;
    } else {
      var drift = P.driftV * Math.sin(b.t * P.driftRate);
      b.vx += (drift - b.vx) * Math.min(1, P.drag * dt);
    }
    if (b.vx > P.maxV) b.vx = P.maxV;
    else if (b.vx < -P.maxV) b.vx = -P.maxV;
    b.x += b.vx * dt;
    if (b.x < P.margin) { b.x = P.margin; if (b.vx < 0) b.vx = 0; }
    else if (b.x > worldW - P.margin) { b.x = worldW - P.margin; if (b.vx > 0) b.vx = 0; }
    b.stopped = Math.abs(b.vx) < P.stopV;
  }

  // Phase 24: the heave on the surface (it was a 1 px sine), in view pixels; down positive.
  function bob(b) { return -Math.round(b.heave * HI) / HI; }

  // The rod: a straight 22 px pole from the fisher's hands (Phase 15: the larger fisher's).
  // angle is in degrees up from the facing direction (90 = straight up, above 90 leans back).
  var ROD = { len: 22, baseX: 3, baseY: -6 };

  // Writes the rod tip into out for a boat centred at cx (world or screen) with waterline wy.
  // Phase 24: the base rides the hull's shear and the fisher's lean; the rod tilts with the pitch.
  function rodTip(b, cx, wy, angle, out) {
    var a = (angle + b.show) * D2R, f = b.facing, bx = cx + f * ROD.baseX - f * b.lean, by = wy + bob(b) + ROD.baseY + shear(b, ROD.baseX);
    out[0] = bx + f * Math.cos(a) * ROD.len;
    out[1] = by - Math.sin(a) * ROD.len;
    return out;
  }

  // Draws the rod as a quadratic curve. bend > 0 bows its middle forward and down
  // (loaded), bend < 0 bows it back (the whip of a cast). The tip stays where rodTip says.
  function drawRod(ctx, b, sx, wy, angle, bend, key) {
    var a = (angle + b.show) * D2R, f = b.facing;
    var bx = sx + f * ROD.baseX - f * b.lean, by = wy + bob(b) + ROD.baseY + shear(b, ROD.baseX);
    var tx = bx + f * Math.cos(a) * ROD.len, ty = by - Math.sin(a) * ROD.len;
    var mx = (bx + tx) / 2 + f * Math.sin(a) * bend, my = (by + ty) / 2 + Math.cos(a) * bend;
    var steps = (ROD.len + 4) * HI;
    ctx.fillStyle = S.PALETTE[key || 'stone_hi'];
    for (var i = 0; i <= steps; i++) {
      var u = i / steps, v = 1 - u;
      ctx.fillRect(Math.round((v * v * bx + 2 * u * v * mx + u * u * tx) * HI) / HI, Math.round((v * v * by + 2 * u * v * my + u * u * ty) * HI) / HI, 1 / HI, i < steps * 0.25 ? 2 / HI : 1 / HI);
    }
    ctx.fillStyle = S.PALETTE.ink;                                                     // the reel
    ctx.fillRect(Math.round((bx + f * 2.5) * HI) / HI - 1, Math.round((by + 0.5) * HI) / HI, 2, 1.5);
  }

  // sx is the boat centre on screen, wy the waterline. Passengers sit behind the hull's
  // gunwale, so they are drawn first. withFisher false leaves the boat empty, rod and all (P10.2).
  // gear (optional): {rod: tier, lantern: bool, finder: bool, night: 0..1}.
  // Draws a painted image sheared by the pitch: in 2-view-px columns, each at its own height.
  function putSheared(ctx, b, cv, x, y, sx) {
    var cols = cv.width / 2;
    for (var i = 0; i < cols; i++) {
      var cxw = x + (i * 2 + 1) / HI;
      ctx.drawImage(cv, i * 2, 0, 2, cv.height, x + i * 2 / HI, y + shear(b, (cxw - sx) * b.facing), 2 / HI, cv.height / HI);
    }
  }

  function draw(ctx, b, sx, wy, withFisher, drawDog, rodAngle, rodBend, gear) {
    var flip = b.facing < 0, y = wy + bob(b), f = b.facing, P = S.PALETTE;
    if (withFisher) {
      var sip = gear && gear.sip;
      put(ctx, img('fisher', flip, sip), (flip ? sx - 3 : sx - 6) - f * b.lean, y - 15 + shear(b, -1));
      if (sip) { // steam from the cup, rising and thinning
        ctx.fillStyle = P.fog_light;
        for (var k = 0; k < 4; k++) {
          var u = (b.t * 0.8 + k / 4) % 1, cx = (flip ? sx - 2.5 : sx + 2.5) - f * b.lean;
          ctx.globalAlpha = 0.5 * (1 - u);
          ctx.fillRect(cx + Math.round(Math.sin(u * 6 + k) * 2) / HI, y - 11.5 - Math.round(u * 12) / HI, 1 / HI, 1 / HI);
        }
        ctx.globalAlpha = 1;
      }
      drawRod(ctx, b, sx, wy, rodAngle, rodBend, gear ? ROD_KEYS[Math.min(gear.rod, ROD_KEYS.length - 1)] : null);
    }
    if (drawDog) drawDog(ctx, flip ? sx - 16 : sx + 4, y - 14 + shear(b, 10), flip, Math.abs(b.vx) / P_SPEED);
    if (gear && gear.lantern) {
      var px = sx - f * 13, ly0 = y;                          // a pole at the stern, its arm out back
      y += shear(b, -13);
      ctx.fillStyle = P.wood_dark;
      ctx.fillRect(px, y - 18, 1, 15);
      ctx.fillRect(f > 0 ? px - 2 : px, y - 18, 3, 1 / HI);
      ctx.fillStyle = P.wood; ctx.fillRect(px, y - 18, 1 / HI, 15);
      var lx = px - f * 2;
      if (gear.night > 0) {
        if (!halo) halo = bakeHalo();
        ctx.globalAlpha = gear.night;
        ctx.drawImage(halo, lx - 15, y - 30, 30.5, 30.5);
        ctx.globalAlpha = 1;
      }
      put(ctx, img('lantern', false), lx - 1.5, y - 17.5);
      y = ly0;
    }
    // The motor, tilted by its thrust: its leg and propeller swing back under throttle.
    var mcv = img('motor', flip), mx = flip ? sx + 16 : sx - 21, my = y - 7 + shear(b, -18), tilt = Math.round(b.throttle * 1.5 * HI) / HI;
    ctx.drawImage(mcv, 0, 0, mcv.width, 16, mx, my, mcv.width / HI, 8);
    ctx.drawImage(mcv, 0, 16, mcv.width, mcv.height - 16, mx - f * tilt, my + 8, mcv.width / HI, (mcv.height - 16) / HI);
    putSheared(ctx, b, img('hull', flip), sx - 17, y - 6, sx);
    if (gear && gear.finder && (Math.floor(b.t * 1.25) & 1)) {
      ctx.fillStyle = P.neon_teal; ctx.fillRect(sx - f * 10, y - 3.5, 1, 1 / HI);
    }
    // Contact shadow on the water under the hull (below the waterline, so the mirror pass,
    // which only keeps rows above it, never shows it).
    ctx.globalAlpha = 0.5; ctx.fillStyle = P.water_deep;
    ctx.fillRect(sx - 15, wy + 2, 30, 1 / HI); ctx.fillRect(sx - 13, wy + 2.5, 26, 1 / HI); ctx.fillRect(sx - 11, wy + 3, 22, 1 / HI);
    ctx.globalAlpha = 1;
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 19; }

  // World x of the bow.
  function bow(b) { return b.x + b.facing * 17; }

  return { P: P, M: M, ROD: ROD, create: create, step: step, motion: motion, shear: shear, draw: draw, bob: bob, stern: stern, bow: bow, rodTip: rodTip };
})();
