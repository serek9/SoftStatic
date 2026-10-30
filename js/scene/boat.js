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
  // rowboat with lapped planks, a lit gunwale, a rust stripe and an outboard motor; a lantern
  // on a pole. The fisher is js/scene/fisher.js since Phase 33.
  // Each faces right; mirrored copies are made on first use.
  var A = G.gfx.paint, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
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
    liftHit: 0.6               // px/s: the water lifting the hull faster than this slaps it (Phase 26)
  };
  var D2R = Math.PI / 180;

  function create(x) {
    return { x: x, vx: 0, t: 0, facing: 1, stopped: true,
      pitch: 0, pv: 0, wave: 0, show: 0, heave: 0, hv: 0, ax: 0, prevVx: 0, lean: 0, wakeA: 0, wakeHit: false,
      throttle: 0, rpm: 0, motor: false, startT: -1, restT: 0, puff: 0, starts: 0 };
  }

  // Phase 24 (Phase 26: before step(), so the boat waits for the motor): the outboard. A
  // pull-start on the first move, idling, cut out after a long rest; the throttle and the rpm.
  function outboard(b, move, dt) {
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
  }

  // Phase 24: pitch and heave, after step(). hBow and hStern are the surface's heights (world
  // px, up positive) under the bow and the stern.
  function motion(b, move, dt, hBow, hStern) {
    var a = (b.vx - b.prevVx) / dt;
    b.prevVx = b.vx;
    b.ax += (a * b.facing - b.ax) * Math.min(1, 8 * dt);
    // Pitch: bow up under acceleration and at speed, down on a stop, rocking back to level.
    var pt = M.accelPitch * b.ax + M.speedPitch * Math.min(1, Math.abs(b.vx) / P.maxV) * b.throttle;
    b.pv += (-M.pitchK * (b.pitch - pt) - M.pitchC * b.pv) * dt;
    b.pitch += b.pv * dt;
    // The surface: heave rides its mean under the hull, and its slope tips the boat.
    var w = M.waveTip * Math.atan2(hBow - hStern, 2 * M.halfLen) / D2R;
    b.wave += (w - b.wave) * Math.min(1, 6 * dt);
    b.show = b.pitch + b.wave;
    // Heave: riding the surface under the hull (its own wake included, Phase 26: the surface's
    // wake layer catches it up after a stop), and squatting as it brakes. wakeHit marks the
    // water lifting the hull hard, for the slap.
    var squat = b.ax < 0 ? M.squat * b.ax : 0, hv0 = b.hv;
    b.hv += (-M.heaveK * (b.heave - (hBow + hStern) / 2 - squat) - M.heaveC * b.hv) * dt;
    b.heave += b.hv * dt;
    b.wakeHit = b.hv > M.liftHit && hv0 <= M.liftHit;
    if (b.wakeHit) b.wakeA = Math.min(1, b.hv / 3);
    b.lean = Math.max(-1, Math.min(1, -b.ax * 0.012));   // the fisher leans back on throttle
  }

  // The vertical shift (world px) of a point dx px along the hull from its centre (toward the
  // bow when dx > 0 along the facing): the pitch drawn as a shear, in whole view pixels, so
  // the painted pixels stay crisp (8.3 #84: no rotated art).
  function shear(b, dx) { return Math.round(-Math.tan(b.show * D2R) * dx * HI) / HI; }

  // move is the input axis (-1, 0, 1). worldW clamps the boat inside the location.
  // Phase 26: only a running motor pushes the boat; while the cord is pulled a held direction
  // turns it, and it drifts as when nothing is held.
  function step(b, move, dt, worldW) {
    b.t += dt;
    if (move !== 0 && b.motor) {
      b.vx += move * (b.vx * move < 0 ? P.reverse : P.accel) * dt;
      b.facing = move;
    } else {
      if (move !== 0) b.facing = move;
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

  // The rod (Phase 31): G.gfx.rod bends it in update(); this places and draws it. The hands
  // hold it ROD.baseX px ahead of the boat's centre and ROD.baseY px above the waterline.
  var ROD = { len: 22, baseX: 3, baseY: -6 };

  // Writes the rod's base into out for a boat centred at cx with waterline wy: the fisher's
  // near hand, or the holder (Phase 33, G.scene.fisher.rodLocal; ROD.baseX/baseY before).
  // Phase 24: the base rides the hull's shear and the fisher's lean.
  var rl = [0, 0];
  function rodBase(b, cx, wy, out) {
    G.scene.fisher.rodLocal(rl);
    out[0] = cx + b.facing * rl[0] - b.facing * b.lean;
    out[1] = wy + bob(b) + rl[1] + shear(b, rl[0]);
    return out;
  }

  // Writes the bent rod's tip into out (Phase 31: where G.gfx.rod last put it).
  function rodTip(b, cx, wy, out) { rodBase(b, cx, wy, out); return G.gfx.rod.tip(b.facing, out[0], out[1], out); }

  // The rod's parts, drawn in view pixels along the blank: a cork butt behind the hands, the
  // reel seat, the blank (two pixels across its lower half, lit on top and shaded under, one
  // above), a reel hanging under it, guides on the underside that shrink toward the tip, and
  // the line from the reel through the guides to the tip in straight chords, under the blank.
  var ROD_SHADE = ['stone', 'wood_mid', 'rust', 'moss', 'stone_hi'];
  var GUIDES = [0.22, 3, 0.42, 2, 0.6, 2, 0.75, 1, 0.88, 1]; // share of the length, ring height (view px)
  var rp = [0, 0], gvx = new Int16Array(8), gvy = new Int16Array(8), nx = 0, ny = 1, rodF = 1;

  // The underside's normal (world, unit) at s px along the rod, for the facing rodF, into nx, ny.
  function normAt(R, s) {
    var k = Math.max(0, Math.min(R.N - 1, Math.floor(s / R.SEG)));
    var ux = R.jx[k + 1] - R.jx[k], uy = R.jy[k + 1] - R.jy[k], l = Math.sqrt(ux * ux + uy * uy) || 1;
    nx = rodF * uy / l; ny = ux / l;
  }
  function dot(ctx, vx, vy) { ctx.fillRect(vx / HI, vy / HI, 1 / HI, 1 / HI); }
  // A line of view pixels between view points.
  function vline(ctx, x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      dot(ctx, x0, y0);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // One pixel of blank at view (vx, vy), and with thick its shaded pixel on the underside.
  function blank(ctx, vx, vy, thick, k1, k2) {
    var P = S.PALETTE;
    ctx.fillStyle = P[k1]; dot(ctx, vx, vy);
    if (!thick) return;
    ctx.fillStyle = P[k2];
    if (Math.abs(nx) > Math.abs(ny)) dot(ctx, vx + (nx > 0 ? 1 : -1), vy); else dot(ctx, vx, vy + (ny > 0 ? 1 : -1));
  }

  function drawRod(ctx, b, sx, wy, tier, lineKey, lineA) {
    var R = G.gfx.rod, f = b.facing, P = S.PALETTE, L = R.K.len, i, s, vx, vy, lx = -9999, ly = -9999;
    tier = Math.max(0, Math.min(ROD_KEYS.length - 1, tier | 0));
    rodF = f;
    rodBase(b, sx, wy, rp);
    var bx = rp[0], by = rp[1], key = ROD_KEYS[tier], shade = ROD_SHADE[tier];
    // The line: from the reel's spool through each guide's ring to the tip.
    var n = 0;
    normAt(R, 1.7); R.at(1.7, rp);
    gvx[n] = Math.round((bx + f * rp[0]) * HI + nx * 4 + f * Math.cos(R.st.a)); gvy[n++] = Math.round((by - rp[1]) * HI + ny * 4);
    for (i = 0; i < GUIDES.length; i += 2) {
      s = GUIDES[i] * L; normAt(R, s); R.at(s, rp);
      gvx[n] = Math.round((bx + f * rp[0]) * HI + nx * GUIDES[i + 1]); gvy[n++] = Math.round((by - rp[1]) * HI + ny * GUIDES[i + 1]);
    }
    gvx[n] = Math.round((bx + f * R.jx[R.N]) * HI); gvy[n++] = Math.round((by - R.jy[R.N]) * HI);
    ctx.globalAlpha = lineA; ctx.fillStyle = P[lineKey || 'fog_light'];
    for (i = 1; i < n; i++) vline(ctx, gvx[i - 1], gvy[i - 1], gvx[i], gvy[i]);
    ctx.globalAlpha = 1;
    // The butt and its cork grip, behind the hands along their angle, with a cap.
    var ca = Math.cos(R.st.a), sa = Math.sin(R.st.a);
    normAt(R, 0);
    for (s = -4.5; s < 0; s += 0.35) {
      vx = Math.round((bx + f * ca * s) * HI); vy = Math.round((by - sa * s) * HI);
      if (vx === lx && vy === ly) continue;
      lx = vx; ly = vy;
      blank(ctx, vx, vy, true, s < -4 ? 'ink' : 'wood_lit', s < -4 ? 'ink' : 'wood_mid');
    }
    // The blank, from the fore grip and the reel seat to the tip.
    for (s = 0; s <= L; s += 0.35) {
      R.at(s, rp);
      vx = Math.round((bx + f * rp[0]) * HI); vy = Math.round((by - rp[1]) * HI);
      if (vx === lx && vy === ly) continue;
      lx = vx; ly = vy;
      normAt(R, s);
      if (s < 0.8) blank(ctx, vx, vy, true, 'wood_lit', 'wood_mid');
      else if (s < 2.6) blank(ctx, vx, vy, true, 'stone_hi', 'stone_dark');
      else blank(ctx, vx, vy, s < L * 0.5, key, shade);
    }
    // The guides: a wrap on the blank and a ring under it.
    for (i = 0; i < GUIDES.length; i += 2) {
      s = GUIDES[i] * L; normAt(R, s); R.at(s, rp);
      vx = Math.round((bx + f * rp[0]) * HI); vy = Math.round((by - rp[1]) * HI);
      ctx.fillStyle = P.ink; dot(ctx, vx, vy);
      ctx.fillStyle = P.stone_lit; dot(ctx, gvx[i / 2 + 1], gvy[i / 2 + 1]);
    }
    ctx.fillStyle = P.stone_lit; dot(ctx, gvx[n - 1], gvy[n - 1]);                       // the tip-top
  }

  // The reel: a stem down from the seat, the body, its bail and its handle (Phase 32). The
  // handle turns in the plane we see, in 8 steps, the way the crank goes for the facing; the
  // bail closed is a wire across the spool's face, open it is thrown back toward the blank.
  // The rod is held over the side, so the reel is drawn after the hull's gunwale.
  function drawReel(ctx, b, sx, wy) {
    var R = G.gfx.rod, f = b.facing, P = S.PALETTE, i, vx, vy;
    rodF = f;
    rodBase(b, sx, wy, rp);
    var bx = rp[0], by = rp[1];
    normAt(R, 1.7); R.at(1.7, rp);
    vx = Math.round((bx + f * rp[0]) * HI); vy = Math.round((by - rp[1]) * HI);
    ctx.fillStyle = P.stone_dark;
    dot(ctx, Math.round(vx + nx * 2), Math.round(vy + ny * 2));
    var rx = Math.round(vx + nx * 4), ry = Math.round(vy + ny * 4), ca2 = f * Math.cos(R.st.a), sa2 = -Math.sin(R.st.a);
    ctx.fillRect((rx - 1) / HI, (ry - 1) / HI, 3 / HI, 3 / HI);
    ctx.fillStyle = P.stone_hi; dot(ctx, rx - f, ry - 1);
    ctx.fillStyle = P.stone_lit;
    for (i = -1; i <= 1; i++) {
      if (R.st.bail) dot(ctx, Math.round(rx - nx * 2 + ca2 * i), Math.round(ry - ny * 2 + sa2 * i));
      else dot(ctx, Math.round(rx + ca2 * 2 + nx * i), Math.round(ry + sa2 * 2 + ny * i));
    }
    var ph = Math.floor(R.st.crank * 8) / 8 * 2 * Math.PI, hc = f * Math.cos(ph), hs = Math.sin(ph);
    ctx.fillStyle = P.ink; dot(ctx, rx + Math.round(hc * 1.6), ry + Math.round(hs * 1.6));
    ctx.fillStyle = P.bone; dot(ctx, rx + Math.round(hc * 2.6), ry + Math.round(hs * 2.6));
  }

  // sx is the boat centre on screen, wy the waterline. Passengers sit behind the hull's
  // gunwale, so they are drawn first. withFisher false leaves the boat empty, rod and all (P10.2).
  // gear (optional): {rod: tier, lantern: bool, finder: bool, night: 0..1, fisher: his state
  // (Phase 33), lineKey, lineA: the line's colour and alpha along the rod}.
  // Draws a painted image sheared by the pitch: in 2-view-px columns, each at its own height.
  function putSheared(ctx, b, cv, x, y, sx) {
    var cols = cv.width / 2;
    for (var i = 0; i < cols; i++) {
      var cxw = x + (i * 2 + 1) / HI;
      ctx.drawImage(cv, i * 2, 0, 2, cv.height, x + i * 2 / HI, y + shear(b, (cxw - sx) * b.facing), 2 / HI, cv.height / HI);
    }
  }

  function draw(ctx, b, sx, wy, withFisher, drawDog, gear) {
    var flip = b.facing < 0, y = wy + bob(b), f = b.facing, P = S.PALETTE;
    if (withFisher) {
      // Phase 33: the posable fisher (js/scene/fisher.js) and what he holds.
      if (gear && gear.fisher) G.scene.fisher.draw(ctx, gear.fisher, sx, y, f, b.lean, shear(b, -1), b.t);
    }
    if (drawDog) drawDog(ctx, flip ? sx - 16 : sx + 4, y - 14 + shear(b, 10), flip, Math.abs(b.vx) / P_SPEED);
    // The rod reaches out over the dog in the bow, so it is drawn after him: its bend shows whole.
    if (withFisher) drawRod(ctx, b, sx, wy, gear ? gear.rod : 0, gear && gear.lineKey, gear ? gear.lineA : 0.6);
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
    if (withFisher) { G.scene.fisher.drawHolder(ctx, sx, y, f, b.lean, shear(b, -1)); drawReel(ctx, b, sx, wy); }
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

  return { P: P, M: M, ROD: ROD, create: create, step: step, outboard: outboard, motion: motion, shear: shear, draw: draw, bob: bob, stern: stern, bow: bow, rodBase: rodBase, rodTip: rodTip };
})();
