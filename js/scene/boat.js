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
  // Phase 81 (PLAN_WINTER.md 2.3): on the ice the boat is the Snow Machine: the same steering
  // and speed curve, faster (a fast vehicle across the ice) and without the idle drift.
  var SLED = { speed: 1.5, accel: 1.3 };
  // Phase 86: where he sits on the ice (presentation only). ride: px his seat line stands over
  // the ice on the machine's seat; sit: on his bucket by the hole; back: px the machine stands
  // behind him while he sits (its nose clear of his back); rate: how fast he gets off and sits
  // down, or gets back on (1/s). The ankles (local to the seat line): on the running board, and
  // out before the bucket on the ice. The bucket's middle (local x): on the rear rack, and under him.
  var ICE = { ride: 7, sit: 4, back: 31, rate: 2.2, ankRide: [1.5, 1.5], ankSit: [6, 2], rack: -14.5, under: -1.5 };

  function rep(ch, n) { var s = ''; while (n-- > 0) s += ch; return s; }

  // Phase 18: the boat, the fisher and the gear are painted in the 640×360 view's pixels
  // (HI per world pixel) and drawn at 1/HI size, in the same world boxes as before: a wooden
  // rowboat with lapped planks, a lit gunwale, a rust stripe and an outboard motor (Phase 79b: the
  // lantern on its pole is gone). The fisher is js/scene/fisher.js since Phase 33.
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
    // Phase 81, repainted in Phase 86: the Snow Machine (84×32 view px, 42×16 world, facing
    // right; its nose at x 83, the ice at y 32). From the back: the snow flap and the tail
    // light, the rear rack where his bucket rides, the long black seat, the tunnel over the
    // track (its rear idler raised, three bogie wheels, the drive sprocket, lugs on its tread),
    // the running board his boots stand on, the red hood with a lit crown, a cream stripe, a
    // vent and the headlight, the smoked windscreen swept back, the handlebar on its riser,
    // and the ski out in front on its A-arm and shock, its tip turned up.
    sled: { w: 84, h: 32, paint: function (c) {
      var x, TRK = ['ink', 'stone_dark', 'stone'], WHEEL = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'];
      // The track: rear idler raised, so the tread climbs to the back.
      A.area(c, 3, 20, 51, 12, function (u, v) {
        var bot = u < 15 ? Math.round(31 - (15 - u) * 0.45) : 31, top = 21;
        if (v < top || v > bot) return '';
        if (v === bot) return u % 3 === 0 ? 'stone' : 'ink';                               // the lugs on the tread
        if (v === top || u === 3 || u === 53) return 'ink';
        return v > bot - 2 ? 'ink' : 'stone_dark';
      });
      A.line(c, 'stone', 10, 29, 50, 29);                                                 // the slide rail
      A.blob(c, 9, 26, 3.2, 3.2, WHEEL, { bias: 0.1 });                                     // the rear idler
      for (x = 19; x < 46; x += 9) A.blob(c, x, 27, 2.6, 2.6, WHEEL, { bias: 0.1 });         // the bogie wheels
      A.blob(c, 50, 24, 2.4, 2.4, WHEEL, { bias: 0.1 });                                    // the drive sprocket
      for (x = 9; x < 50; x += 9) A.px(c, 'ink', x, 27);                                    // their hubs
      // The tunnel over it, riveted, and the snow flap and tail light at its back.
      A.box(c, 'ink', 1, 17, 52, 4); A.box(c, 'stone_dark', 1, 17, 52, 1);
      for (x = 5; x < 50; x += 6) A.px(c, 'stone', x, 19);
      A.box(c, 'ink', 0, 18, 2, 11); A.box(c, 'stone_dark', 1, 19, 1, 9);                   // the flap
      A.box(c, 'crimson', 1, 15, 3, 2); A.px(c, 'rust_hi', 1, 15);                        // the tail light
      // The rear rack: a tube rail behind the seat.
      A.line(c, 'stone_hi', 3, 13, 16, 13); A.box(c, 'stone_dark', 3, 14, 1, 3); A.box(c, 'stone_dark', 15, 14, 1, 3);
      // The seat: long, grey vinyl, its back end raised a little, lit along its top, stitched.
      A.area(c, 15, 10, 34, 8, function (u, v) {
        var top = u < 20 ? 12 : 13, bot = 17;
        if (u > 45) top = 13 + (u - 45);
        if (v < top || v > bot) return '';
        if (v === top) return 'stone_lit';
        if (v === bot) return 'ink';
        if (v === top + 2 && u % 4 === 0) return 'stone_dark';
        return v === top + 1 ? 'stone_hi' : 'stone';
      });
      // The running board, where his boots stand (its top 3.5 world px off the ice).
      A.box(c, 'stone_lit', 24, 25, 26, 1); A.box(c, 'stone', 24, 26, 26, 1); A.box(c, 'ink', 24, 27, 26, 1);
      // The front suspension: the A-arm and its shock to the ski's spindle.
      A.line(c, 'ink', 52, 26, 67, 28); A.line(c, 'stone_dark', 52, 25, 67, 27);
      A.line(c, 'stone_hi', 61, 20, 65, 27); A.box(c, 'ink', 66, 26, 2, 4);
      // The ski: its tip turned up, a grab loop on it.
      A.box(c, 'stone_lit', 56, 30, 25, 1); A.box(c, 'stone', 56, 31, 25, 1);
      A.px(c, 'stone_lit', 81, 29); A.px(c, 'stone_lit', 82, 28); A.px(c, 'stone_lit', 82, 27); A.px(c, 'stone', 81, 30); A.px(c, 'stone', 83, 28);
      A.line(c, 'stone_hi', 80, 26, 82, 26); A.px(c, 'stone_hi', 79, 27);
      // The windscreen, smoked, swept back from the hood (drawn before it, the hood over its foot).
      for (var v = 1; v <= 11; v++) {
        var x0 = Math.round(49 + (v - 1) * 0.55), w = v < 3 ? 2 : 4;
        A.box(c, 'ice', x0, v, w, 1); A.px(c, 'ice_lit', x0 + w, v); A.px(c, 'ice_dark', x0, v);
        if (v >= 3 && v <= 7) A.px(c, 'fog_light', x0 + 1 + ((v - 3) >> 1), v);            // a glint
      }
      A.box(c, 'ice_lit', 49, 0, 3, 1);
      // The hood: red, its crown lit, a cream stripe along its flank, a vent, the headlight.
      A.area(c, 44, 9, 40, 19, function (u, v) {
        var top = u < 52 ? 17 - (u - 44) * 0.85 : (u < 58 ? 10 + (u - 52) * 0.2 : 11.2 + (u - 58) * 0.3);
        if (u > 80) top += (u - 80) * 1.5;
        var bot = u < 72 ? 27 : 27 - (u - 72) * 0.55;
        top = Math.round(top); bot = Math.round(bot);
        if (v < top || v > bot || u > 83) return '';
        if (v === bot) return 'ink';
        if (v >= bot - 2 && u > 47) return 'stone_dark';                                  // the black belly pan
        if (v === top) return u > 52 && u < 70 ? 'cream' : 'rust_hi';                      // the crown, catching the light
        if (v === top + 1) return 'rust_hi';
        if (v === top + 4 && u > 50 && u < 80) return 'bone';                               // the stripe
        if (v === top + 5 && u > 52 && u < 78) return 'rust_dark';
        if (u > 57 && u < 65 && (v === top + 8 || v === top + 10) && u % 2 === 0) return 'ink'; // the vent
        if (u > 75 && u < 80 && (v === top + 1 || v === top + 2)) return v === top + 1 ? 'cream' : 'lamp_glow'; // the headlight
        return v > bot - 5 ? 'rust_dark' : 'rust';
      });
      A.box(c, 'stone_dark', 75, 16, 6, 1);                                                 // the headlight's brow
      A.line(c, 'stone_hi', 80, 24, 83, 22); A.px(c, 'stone_dark', 81, 25);                // the bumper
      // The handlebar on its riser, the grip where his near hand goes (world local 4, -12).
      A.line(c, 'ink', 51, 14, 47, 9); A.line(c, 'stone_dark', 52, 14, 48, 9);
      A.box(c, 'ink', 44, 7, 4, 2); A.px(c, 'stone_hi', 48, 7); A.px(c, 'stone_lit', 50, 6);
      TRK.length = 0;
    } },
    // Phase 81, rebuilt in Phase 86: the box sled the dog rides in (36×16 view px, its tow end at
    // the right): plank sides on stanchions with a rope rail over their tops, a lit rail, and
    // runners that curl up at the front. The dog is drawn before it, so it sits inside.
    box: { w: 36, h: 16, paint: function (c) {
      A.slab(c, 1, 4, 33, 8, WOOD); A.box(c, 'wood_lit', 1, 4, 33, 1);
      A.box(c, 'wood_deep', 1, 8, 33, 1);                                                   // the gap between the planks
      for (var x = 2; x < 34; x += 10) { A.box(c, 'wood_dark', x, 2, 2, 11); A.px(c, 'wood_hi', x, 2); }
      A.line(c, 'cream', 3, 2, 12, 3); A.line(c, 'cream', 12, 3, 22, 2); A.line(c, 'paper_dark', 22, 2, 32, 3);
      for (x = 6; x < 32; x += 11) A.box(c, 'ink', x, 12, 1, 2);                             // the struts
      A.box(c, 'stone_lit', 0, 14, 34, 1); A.box(c, 'stone', 0, 15, 34, 1);                  // the runners
      A.px(c, 'stone_lit', 34, 13); A.px(c, 'stone_lit', 35, 12); A.px(c, 'stone_lit', 35, 11);
    } },
    // Phase 81, repainted in Phase 86: his bucket (12×12 view px): a white pail, ribbed, its
    // bail handle, under a padded lid he sits on.
    bucket: { w: 12, h: 12, paint: function (c) {
      A.area(c, 0, 2, 12, 10, function (x, y) {
        var inset = Math.round((y - 2) * 0.12);
        if (x < 1 + inset || x > 10 - inset) return '';
        if (y === 11) return 'stone';
        if (y === 4 || y === 8) return 'stone_hi';                                          // the ribs
        if (x === 1 + inset) return 'stone_hi';
        if (x === 10 - inset) return 'stone';
        return 'fog_light';
      });
      A.box(c, 'stone_dark', 0, 0, 12, 2); A.box(c, 'stone', 1, 0, 10, 1);                 // the padded lid
      A.px(c, 'stone_dark', 2, 5); A.px(c, 'stone_dark', 9, 5); A.line(c, 'stone', 3, 6, 8, 6); // the bail
    } },
    motor: { w: 10, h: 16, paint: function (c) {
      A.blob(c, 5, 4, 4.5, 3.8, STONES, { bias: 0.15 }); A.box(c, 'stone_dark', 1, 6, 8, 2);
      A.box(c, 'rust_hi', 2, 3, 5, 1);
      A.slab(c, 4, 8, 3, 6, STONES); A.slab(c, 2, 13, 7, 3, STONES);
    } },
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

  var P_SPEED = 42; // px/s, the speed at which the dog's ears stream fully (P.maxV)

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

  function create(x, ice) {
    return { x: x, vx: 0, t: 0, facing: 1, stopped: true, ice: !!ice, parked: false, // Phase 81: ice, the Snow Machine; parked, at a hole (he sits on his bucket)
      pitch: 0, pv: 0, wave: 0, show: 0, heave: 0, hv: 0, ax: 0, prevVx: 0, lean: 0, wakeA: 0, wakeHit: false,
      throttle: 0, rpm: 0, motor: false, startT: -1, restT: 0, puff: 0, starts: 0, sit: 0 }; // Phase 86: sit, 0 on the machine .. 1 on the bucket
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
    if (b.ice) b.sit += Math.max(-ICE.rate * dt, Math.min(ICE.rate * dt, (b.parked ? 1 : 0) - b.sit)); // Phase 86: off the machine and down on the bucket
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
    var mv = b.ice ? P.maxV * SLED.speed : P.maxV, ak = b.ice ? SLED.accel : 1; // Phase 81
    if (move !== 0 && b.motor) {
      b.vx += move * (b.vx * move < 0 ? P.reverse : P.accel) * ak * dt;
      b.facing = move;
    } else {
      if (move !== 0) b.facing = move;
      var drift = b.ice ? 0 : P.driftV * Math.sin(b.t * P.driftRate);
      b.vx += (drift - b.vx) * Math.min(1, P.drag * (b.ice ? 1.6 : 1) * dt);
    }
    if (b.vx > mv) b.vx = mv;
    else if (b.vx < -mv) b.vx = -mv;
    b.x += b.vx * dt;
    if (b.x < P.margin) { b.x = P.margin; if (b.vx < 0) b.vx = 0; }
    else if (b.x > worldW - P.margin) { b.x = worldW - P.margin; if (b.vx > 0) b.vx = 0; }
    b.stopped = Math.abs(b.vx) < P.stopV;
  }

  // Phase 24: the heave on the surface (it was a 1 px sine), in view pixels; down positive.
  // Phase 86: on the ice there is no heave; his seat line stands over the ice (seatUp).
  function bob(b) { return b.ice ? -seatUp(b) : -Math.round(b.heave * HI) / HI; }
  function sitE(b) { var e = Math.max(0, Math.min(1, b.sit)); return e * e * (3 - 2 * e); }
  function seatUp(b) { return Math.round((ICE.ride + (ICE.sit - ICE.ride) * sitE(b)) * HI) / HI; }

  // Phase 86: where the dog is drawn (the top left of its 12×10 painting) for a boat at screen x
  // sx over the waterline wy, into out: in the bow, or in the box sled behind the Snow Machine.
  function dogAt(b, sx, wy, out) {
    if (b.ice) {
      var mx = sx - b.facing * Math.round(ICE.back * sitE(b) * HI) / HI;
      out[0] = b.facing < 0 ? mx + 26.5 : mx - 38.5; out[1] = wy - 13.5;
      return out;
    }
    var y = wy + bob(b);
    out[0] = b.facing < 0 ? sx - 16 : sx + 4; out[1] = y - 14 + shear(b, 10);
    return out;
  }

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
    var look = (G.data.gear.rods[tier | 0] || G.data.gear.rods[0]).look; // Phase 43: the blank's keys from the rod's data
    rodF = f;
    rodBase(b, sx, wy, rp);
    var bx = rp[0], by = rp[1], key = look[0], shade = look[1];
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
  // gear (optional): {rod: tier, night: 0..1, fisher: his state
  // (Phase 33), lineKey, lineA: the line's colour and alpha along the rod}.
  // Draws a painted image sheared by the pitch: in 2-view-px columns, each at its own height.
  function putSheared(ctx, b, cv, x, y, sx) {
    var cols = cv.width / 2;
    for (var i = 0; i < cols; i++) {
      var cxw = x + (i * 2 + 1) / HI;
      ctx.drawImage(cv, i * 2, 0, 2, cv.height, x + i * 2 / HI, y + shear(b, (cxw - sx) * b.facing), 2 / HI, cv.height / HI);
    }
  }

  // Phase 81, redrawn in Phase 86: the Snow Machine on the ice, the dog in the box sled behind
  // it. Riding, he sits astride the seat, his boots on the running board and his hands on the
  // handlebar; stopped at a hole (b.parked), he gets off and sits on his bucket by it (b.sit
  // eases 0..1), the machine standing ICE.back px behind him and the bucket brought from its
  // rack; his legs bend down to the ice. No hull, motor or wash: shadows on the snow.
  var dp = [0, 0];
  function shadow(ctx, x0, x1, y, a) {
    ctx.globalAlpha = a; ctx.fillRect(Math.round(x0 * HI) / HI, y - 0.5, Math.round((x1 - x0) * HI) / HI, 1); ctx.globalAlpha = 1;
  }
  function drawSled(ctx, b, sx, wy, withFisher, drawDog, gear) {
    var flip = b.facing < 0, f = b.facing, P = S.PALETTE, e = sitE(b), back = Math.round(ICE.back * e * HI) / HI;
    var mx = sx - f * back, scv = img('sled', flip), bcv = img('box', flip), Y = wy + bob(b);
    ctx.fillStyle = P.snow_deep;
    shadow(ctx, flip ? mx - 23 : mx - 19, flip ? mx + 19 : mx + 23, wy + 0.5, 0.45);            // under the machine
    shadow(ctx, flip ? mx + 22 : mx - 40, flip ? mx + 40 : mx - 22, wy + 0.5, 0.35);           // under the box sled
    // The dog in the box sled, and the box's side over its legs; the tow bar to the machine.
    if (drawDog) { dogAt(b, sx, wy, dp); drawDog(ctx, dp[0], dp[1], flip, Math.abs(b.vx) / P_SPEED); }
    put(ctx, bcv, flip ? mx + 22 : mx - 40, wy - 8);
    ctx.fillStyle = P.ink; ctx.fillRect(flip ? mx + 18.5 : mx - 22.5, wy - 2.5, 4, 0.5);
    put(ctx, scv, flip ? mx - 23 : mx - 19, wy - 16);
    if (!withFisher) return;
    // His bucket: on the rack behind the seat, carried to under him as he sits down.
    var bkx = (mx + f * ICE.rack) * (1 - e) + (sx + f * ICE.under) * e, bky = (wy - 7.5) * (1 - e) + wy * e;
    if (e > 0) shadow(ctx, bkx - 3 * e, bkx + 3 * e, wy + 0.5, 0.4 * e);
    put(ctx, img('bucket', flip), Math.round((bkx - 3) * HI) / HI, Math.round((bky - 6) * HI) / HI);
    var fs = gear && gear.fisher;
    // A rod set down while he waits stands in a holder stuck in the snow by the hole.
    if (fs && fs.rodAt === 'holder' && e > 0.5) {
      var hx = Math.round((sx + f * G.scene.fisher.HOLDER[0]) * HI) / HI, hy = Y + G.scene.fisher.HOLDER[1];
      ctx.fillStyle = P.wood_dark; ctx.fillRect(hx - 0.5, hy, 1, wy - hy);
      ctx.fillStyle = P.wood_hi; ctx.fillRect(flip ? hx : hx - 0.5, hy, 0.5, wy - hy);
    }
    if (fs) {
      var ax = ICE.ankRide[0] + (ICE.ankSit[0] - ICE.ankRide[0]) * e, ay = (wy - 5.5) * (1 - e) + (wy - 2) * e - Y;
      G.scene.fisher.drawLegs(ctx, sx, Y, f, ax, ay);
      G.scene.fisher.draw(ctx, fs, sx, Y, f, b.lean, 0, b.t, 0);
    }
    drawRod(ctx, b, sx, wy, gear ? gear.rod : 0, gear && gear.lineKey, gear ? gear.lineA : 0.6);
    drawReel(ctx, b, sx, wy);
  }

  function draw(ctx, b, sx, wy, withFisher, drawDog, gear) {
    if (b.ice) { drawSled(ctx, b, sx, wy, withFisher, drawDog, gear); return; }
    var flip = b.facing < 0, y = wy + bob(b), f = b.facing, P = S.PALETTE;
    if (withFisher) {
      // Phase 33: the posable fisher (js/scene/fisher.js) and what he holds; Phase 35: the cooler behind him.
      G.scene.fisher.drawCooler(ctx, sx, y, f, shear(b, -5));
      if (gear && gear.fisher) G.scene.fisher.draw(ctx, gear.fisher, sx, y, f, b.lean, shear(b, -1), b.t, shear(b, -12));
    }
    if (drawDog) drawDog(ctx, flip ? sx - 16 : sx + 4, y - 14 + shear(b, 10), flip, Math.abs(b.vx) / P_SPEED);
    // The rod reaches out over the dog in the bow, so it is drawn after him: its bend shows whole.
    if (withFisher) drawRod(ctx, b, sx, wy, gear ? gear.rod : 0, gear && gear.lineKey, gear ? gear.lineA : 0.6);
    // The motor, tilted by its thrust: its leg and propeller swing back under throttle.
    var mcv = img('motor', flip), mx = flip ? sx + 16 : sx - 21, my = y - 7 + shear(b, -18), tilt = Math.round(b.throttle * 1.5 * HI) / HI;
    ctx.drawImage(mcv, 0, 0, mcv.width, 16, mx, my, mcv.width / HI, 8);
    ctx.drawImage(mcv, 0, 16, mcv.width, mcv.height - 16, mx - f * tilt, my + 8, mcv.width / HI, (mcv.height - 16) / HI);
    putSheared(ctx, b, img('hull', flip), sx - 17, y - 6, sx);
    if (withFisher) {
      G.scene.fisher.drawHolder(ctx, sx, y, f, b.lean, shear(b, -1));
      if (gear && gear.fisher) G.scene.fisher.drawHelm(ctx, gear.fisher, sx, y, f, b.lean, shear(b, -1), shear(b, -12), b.throttle); // Phase 41
      if (gear && gear.fisher) G.scene.fisher.drawCan(ctx, gear.fisher, sx, y, f, b.lean, shear(b, -2)); // Phase 35: a can on the gunwale
      drawReel(ctx, b, sx, wy);
    }
    // Contact shadow on the water under the hull (below the waterline, so the mirror pass,
    // which only keeps rows above it, never shows it).
    ctx.globalAlpha = 0.5; ctx.fillStyle = P.water_deep;
    ctx.fillRect(sx - 15, wy + 2, 30, 1 / HI); ctx.fillRect(sx - 13, wy + 2.5, 26, 1 / HI); ctx.fillRect(sx - 11, wy + 3, 22, 1 / HI);
    ctx.globalAlpha = 1;
  }

  // World x of the stern, where the wake starts.
  function stern(b) { return b.x - b.facing * 19 - (b.ice ? b.facing * ICE.back * sitE(b) : 0); }

  // World x of the bow.
  function bow(b) { return b.x + b.facing * 17; }

  return { P: P, M: M, ROD: ROD, create: create, step: step, outboard: outboard, motion: motion, shear: shear, draw: draw, bob: bob, dogAt: dogAt, ICE: ICE, stern: stern, bow: bow, rodBase: rodBase, rodTip: rodTip };
})();
