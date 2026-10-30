var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fisher (Phase 33, PLAN_ROD.md): a posable figure and the idle director.
// The body, the head (three tilts: ahead, down, back) and two arms are painted separately in
// the view's pixels (HI per world px), never rotated (8.3 #84). Each arm runs from its shoulder
// through an elbow found by two-bone IK to the hand, painted with paint.limb for that hand's
// place and cached per half view pixel, so no arm is painted twice. A pose is where the hands
// are; they ease between poses as springs, and the rod's base is the near hand, or the holder
// on the gunwale. The director plays acts (short scripts of poses) when nothing happens:
// between casts, or waiting for a bite with no fish about; any key, any change of state ends an
// act at once and the hands go back to the rod. It never blocks input: the scene reads keys as
// before, on the same step.
// Local frame: world px, x forward from the boat's centre along its facing, y down from the
// seat line (the waterline plus the boat's heave). Image px: ix = (lx + 6) × HI, iy = (ly + 15) × HI.
G.scene = G.scene || {};
G.scene.fisher = (function () {
  var A = G.gfx.paint, HI = 2;
  var COAT = ['ink', 'coat_dark', 'coat', 'coat_hi'], FAR = ['ink', 'ink', 'coat_dark', 'coat'];
  var SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], SKIN_FAR = ['flesh_dark', 'flesh_dark', 'skin_shadow', 'flesh'];
  var CAP = ['rust_dark', 'cap', 'rust_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var SH_N = [12, 15], SH_F = [8, 15];        // shoulders, image px
  var UPPER = 5, FORE = 4.6;                  // the arm's two bones, image px
  var REST = [18.5, 18, 16, 19, 15, 19];      // the rod pose keeps Phase 18's painted arm: hand, upper arm's end, forearm's start
  var HOLDER = [-1, -4.5], HOLDER_ANGLE = 38; // the rod holder on the gunwale, local; the rod's angle in it
  var K = { ease: 12, fast: 32, grab: 0.8 };  // the hands' springs (rad/s): moving, and going back to the rod; px to take the rod

  // Poses: the near hand (n) and the far hand (f), local world px.
  var POSES = {
    rod:    { n: [3.25, -6], f: [2.6, -6.4] },   // both hands on the rod
    knees:  { n: [2.2, -4.2], f: [1.2, -4.4] },  // resting on his knees
    holder: { n: [-1, -4.5], f: [1.2, -4.4] },   // the near hand at the holder
    cup:    { n: [3.2, -7.2], f: [1.2, -4.4] },  // holding a cup before him
    mouth:  { n: [1.6, -9.4], f: [1.2, -4.4] }   // the cup at his mouth
  };

  // Acts: steps of {d: s, pose, rod: 'hand' | 'holder', head: 0 ahead, 1 down, 2 back, item, angle}.
  // The near hand carries the rod to the holder before it lets go, and comes back for it.
  var PLACE = [{ d: 0.5, pose: 'holder', rod: 'hand', angle: HOLDER_ANGLE }, { d: 0.35, pose: 'knees', rod: 'holder' }];
  var TAKE = [{ d: 0.45, pose: 'holder', rod: 'holder' }, { d: 0.4, pose: 'rod', rod: 'hand' }];
  var ACTS = {
    // P2-2's thermos, between casts.
    thermos: { mode: 'casts', steps: PLACE.concat([
      { d: 0.5, pose: 'cup', rod: 'holder', item: 'cup' },
      { d: 1.8, pose: 'mouth', rod: 'holder', item: 'cup', head: 2 },
      { d: 1.2, pose: 'cup', rod: 'holder', item: 'cup' },
      { d: 1.5, pose: 'mouth', rod: 'holder', item: 'cup', head: 2 },
      { d: 0.6, pose: 'knees', rod: 'holder' }
    ], TAKE) },
    // Waiting for a bite: the rod in the holder, his hands on his knees.
    rest: { mode: 'wait', steps: PLACE.concat([{ d: 7, pose: 'knees', rod: 'holder' }], TAKE) }
  };
  var BY_MODE = { casts: ['thermos'], wait: ['rest'] };
  var WAIT = { casts: [6, 6], wait: [8, 7] }; // s of nothing happening before an act: least, plus up to

  var cur = null; // the fisher state the boat draws (one fisher)

  function create() {
    var p = POSES.rod;
    return cur = { nx: p.n[0], ny: p.n[1], nvx: 0, nvy: 0, fx: p.f[0], fy: p.f[1], fvx: 0, fvy: 0,
      pose: 'rod', head: 0, item: '', rodAt: 'hand', angle: null,
      act: '', step: 0, t: 0, idleT: 0, wait: 0, ret: false, fast: false, acts: 0 };
  }

  function spring(x, v, target, w, dt) {
    var nv = (v + dt * w * w * (target - x)) / (1 + 2 * w * dt + w * w * dt * dt);
    return nv;
  }

  function setStep(fs, st) {
    fs.pose = st.pose; fs.rodAt = st.rod; fs.head = st.head || 0; fs.item = st.item || '';
    fs.angle = st.rod === 'holder' ? HOLDER_ANGLE : (st.angle === undefined ? null : st.angle);
  }

  function start(fs, name) {
    if (!ACTS[name]) return false;
    fs.act = name; fs.step = 0; fs.t = 0; fs.ret = false; fs.fast = false; fs.acts++;
    setStep(fs, ACTS[name].steps[0]);
    return true;
  }

  // Ends the act at once: the item goes, the head comes up, the near hand fetches the rod from
  // the holder if it is there, quickly, and takes it back to its place.
  function abort(fs) {
    if (!fs.act && !fs.ret) return;
    fs.act = ''; fs.item = ''; fs.head = 0; fs.fast = true; fs.ret = true;
    if (fs.rodAt === 'holder') { fs.pose = 'holder'; fs.angle = HOLDER_ANGLE; }
    else { fs.pose = 'rod'; fs.angle = null; }
  }

  // ctx: {mode: 'casts' | 'wait' | null (nothing to do but fish), input: a key held or pressed}.
  function step(fs, dt, ctx, rng) {
    if (fs.act) {
      var a = ACTS[fs.act];
      if (ctx.input || ctx.mode !== a.mode) abort(fs);
      else {
        fs.t += dt;
        while (fs.act && fs.t >= a.steps[fs.step].d) {
          fs.t -= a.steps[fs.step].d;
          if (++fs.step >= a.steps.length) { fs.act = ''; fs.pose = 'rod'; fs.rodAt = 'hand'; fs.angle = null; fs.item = ''; fs.head = 0; }
          else setStep(fs, a.steps[fs.step]);
        }
      }
    }
    if (!fs.act) {
      if (ctx.mode && !ctx.input && !fs.ret) {
        if (fs.wait <= 0) fs.wait = WAIT[ctx.mode][0] + WAIT[ctx.mode][1] * rng.next();
        fs.idleT += dt;
        if (fs.idleT >= fs.wait) {
          var list = BY_MODE[ctx.mode];
          start(fs, list[Math.min(list.length - 1, Math.floor(rng.next() * list.length))]);
          fs.idleT = 0; fs.wait = 0;
        }
      } else { fs.idleT = 0; fs.wait = 0; }
    }
    // The hands.
    var p = POSES[fs.pose], w = fs.fast ? K.fast : K.ease;
    fs.nvx = spring(fs.nx, fs.nvx, p.n[0], w, dt); fs.nx += dt * fs.nvx;
    fs.nvy = spring(fs.ny, fs.nvy, p.n[1], w, dt); fs.ny += dt * fs.nvy;
    fs.fvx = spring(fs.fx, fs.fvx, p.f[0], w, dt); fs.fx += dt * fs.fvx;
    fs.fvy = spring(fs.fy, fs.fvy, p.f[1], w, dt); fs.fy += dt * fs.fvy;
    // Going back: the hand reaches the holder, takes the rod, and brings it to its place.
    if (fs.ret) {
      if (fs.rodAt === 'holder' && Math.abs(fs.nx - HOLDER[0]) + Math.abs(fs.ny - HOLDER[1]) < K.grab) { fs.rodAt = 'hand'; fs.pose = 'rod'; fs.angle = null; }
      else if (fs.rodAt === 'hand') {
        var r = POSES.rod.n;
        fs.angle = null;
        if (Math.abs(fs.nx - r[0]) + Math.abs(fs.ny - r[1]) < 0.1) { fs.ret = false; fs.fast = false; }
      }
    }
  }

  // The rod's base, local: the near hand, or the holder.
  function rodLocal(out) {
    if (!cur) { out[0] = 3; out[1] = -6; return out; }
    if (cur.rodAt === 'holder') { out[0] = HOLDER[0]; out[1] = HOLDER[1]; }
    else { out[0] = cur.nx; out[1] = cur.ny; }
    return out;
  }

  // ---- Drawing --------------------------------------------------------------------------

  function paintBody(c) {
    A.blob(c, 9, 19, 8, 8, COAT, { bias: 0.05 });
    A.box(c, 'coat_dark', 3, 20, 2, 6);
  }
  // The collar and the shoulder's light, over the near arm's shoulder (as painted before 33).
  function paintCollar(c) {
    A.box(c, 'coat_hi', 5, 14, 6, 1);
    A.box(c, 'coat_dark', 6, 13, 8, 2);
  }

  // tilt 0 ahead, 1 down (the face lower, the brim over it), 2 back (chin up, the brim raised).
  function paintHead(c, tilt) {
    var dy = tilt === 1 ? 1 : (tilt === 2 ? -1 : 0);
    A.blob(c, 10, 9, 4.5, 4.8, SKIN, { bias: 0.1 });
    if (tilt === 2) { A.box(c, 'skin_shadow', 11, 12, 3, 1); A.px(c, 'skin_hi', 14, 10); }
    else { A.box(c, 'skin_shadow', 10, 12 + Math.max(0, dy), 4, 1); A.px(c, 'skin_shadow', 13, 11 + dy); }
    A.px(c, 'ink', 12, 8 + dy); A.px(c, 'skin_hi', 13, 9 + dy); A.px(c, 'flesh_dark', 7, 9);
    A.blob(c, 9, 4.5, 5, 3.5, CAP, { bias: 0.1 }); A.box(c, 'rust_dark', 4, 6, 10, 1);
    A.box(c, 'cap', 12, 5 + dy, 5, 2); A.box(c, 'rust_dark', 12, 6 + dy, 5, 1);       // the brim
    A.box(c, 'stone_dark', 5, 7, 2, 4);                                              // hair at the back
  }

  // An arm from shoulder (sx, sy) to hand (hx, hy), image px, in a 40×40 canvas offset by 10.
  function paintArm(c, sx, sy, hx, hy, far) {
    var dx = hx - sx, dy = hy - sy, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    var dc = Math.max(Math.abs(UPPER - FORE) + 0.5, Math.min(UPPER + FORE - 0.05, d));
    var a = Math.atan2(dy, dx), b = Math.acos(Math.max(-1, Math.min(1, (UPPER * UPPER + dc * dc - FORE * FORE) / (2 * UPPER * dc))));
    var e1x = sx + Math.cos(a + b) * UPPER, e1y = sy + Math.sin(a + b) * UPPER;
    var e2x = sx + Math.cos(a - b) * UPPER, e2y = sy + Math.sin(a - b) * UPPER;
    var ex = e1y > e2y ? e1x : e2x, ey = e1y > e2y ? e1y : e2y;                    // the elbow hangs low
    var o = 10, keys = far ? FAR : COAT, fx0 = ex, fy0 = ey;
    if (!far && hx === REST[0] && hy === REST[1]) { ex = REST[2]; ey = REST[3]; fx0 = REST[4]; fy0 = REST[5]; }
    A.limb(c, sx + o, sy + o, ex + o, ey + o, 2.6, keys, 0.1);
    A.limb(c, fx0 + o, fy0 + o, hx + o, hy + o, 2.2, keys, 0.1);
    A.blob(c, hx + o, hy + o, 1.8, 1.6, far ? SKIN_FAR : SKIN, { bias: 0.1 });
  }

  var art = {};
  function img(key, flip, paint) {
    var k = key + (flip ? '<' : '');
    if (art[k]) return art[k];
    if (flip) return (art[k] = G.gfx.bake.flipped(img(key, false, paint), 'x'));
    return (art[k] = paint());
  }
  function layer(w, h, fn) { return G.gfx.bake.layer(w, h, function (c) { A.reset(); fn(c); A.reset(); }); }
  function bodyImg(flip) { return img('body', flip, function () { return layer(20, 26, paintBody); }); }
  function collarImg(flip) { return img('collar', flip, function () { return layer(20, 26, paintCollar); }); }
  function headImg(tilt, flip) { return img('head' + tilt, flip, function () { return layer(20, 26, function (c) { paintHead(c, tilt); }); }); }
  function armImg(far, ix, iy, flip) {
    var s = far ? SH_F : SH_N;
    return img((far ? 'af' : 'an') + ix + ',' + iy, flip, function () { return layer(40, 40, function (c) { paintArm(c, s[0], s[1], ix, iy, far); }); });
  }
  // Items held in the near hand, painted small: the thermos cup.
  // Each is drawn centred on the hand, standing on it.
  var ITEMS = { cup: { w: 3, h: 4, paint: function (c) { A.slab(c, 0, 0, 3, 4, STONES); } } };
  function itemImg(name, flip) { var it = ITEMS[name]; return img('item' + name, flip, function () { return layer(it.w, it.h, it.paint); }); }

  function put(ctx, cv, x, y) { ctx.drawImage(cv, x, y, cv.width / HI, cv.height / HI); }

  // Draws the fisher for a boat at screen x sx, seat line y (with heave), facing f, leaning
  // back by lean, at shear dy (the hull's pitch at his seat). t: the boat's time, for the steam.
  function draw(ctx, fs, sx, y, f, lean, dy, t) {
    var flip = f < 0, L = sx - (flip ? 4 : 6) - f * lean, top = y - 15 + dy, P = G.gfx.sprites.PALETTE;
    var nix = Math.round((fs.nx + 6) * HI * 2) / 2, niy = Math.round((fs.ny + 15) * HI * 2) / 2; // half view px: the rod hand sits at 18.5
    var fix = Math.round((fs.fx + 6) * HI * 2) / 2, fiy = Math.round((fs.fy + 15) * HI * 2) / 2;
    var up = fs.ny < -8.5, near = armImg(false, nix, niy, flip);                  // a hand at his mouth goes over his face
    put(ctx, armImg(true, fix, fiy, flip), L - 5, top - 5);
    put(ctx, bodyImg(flip), L, top);
    if (!up) put(ctx, near, L - 5, top - 5);
    put(ctx, collarImg(flip), L, top);
    put(ctx, headImg(fs.head, flip), L, top);
    if (up) put(ctx, near, L - 5, top - 5);
    if (fs.item) {
      var it = ITEMS[fs.item], hx = sx + f * fs.nx - f * lean, hy = y + fs.ny + dy;
      put(ctx, itemImg(fs.item, flip), Math.round((hx - it.w / HI / 2) * HI) / HI, Math.round((hy - it.h / HI + 0.5) * HI) / HI);
      if (fs.item === 'cup') { // steam from the cup, rising and thinning
        ctx.fillStyle = P.fog_light;
        for (var k = 0; k < 4; k++) {
          var u = (t * 0.8 + k / 4) % 1;
          ctx.globalAlpha = 0.5 * (1 - u);
          ctx.fillRect(Math.round((hx + Math.sin(u * 6 + k)) * HI) / HI, Math.round((hy - 3 - u * 6) * HI) / HI, 1 / HI, 1 / HI);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // The rod holder: a short tube on the gunwale at the holder, drawn over the hull.
  function drawHolder(ctx, sx, y, f, lean, dy) {
    var P = G.gfx.sprites.PALETTE, x = Math.round((sx + f * HOLDER[0] - f * lean) * HI) / HI, yy = Math.round((y + HOLDER[1] + dy) * HI) / HI;
    ctx.fillStyle = P.stone_dark; ctx.fillRect(x - 0.5, yy, 1, 2);
    ctx.fillStyle = P.stone_hi; ctx.fillRect(f > 0 ? x : x - 0.5, yy, 1 / HI, 2);
  }

  // dbg.fisher(): the pose, the hands (local px), where the rod is, the act and its time.
  function info(fs) {
    return { pose: fs.pose, hands: [+fs.nx.toFixed(2), +fs.ny.toFixed(2), +fs.fx.toFixed(2), +fs.fy.toFixed(2)], holder: fs.rodAt === 'holder',
      act: fs.act, step: fs.step, actT: +fs.t.toFixed(2), idleT: +fs.idleT.toFixed(2), wait: +fs.wait.toFixed(2), returning: fs.ret, head: fs.head, item: fs.item };
  }

  return { K: K, POSES: POSES, ACTS: ACTS, HOLDER: HOLDER, HOLDER_ANGLE: HOLDER_ANGLE, create: create, step: step, start: start, abort: abort,
    rodLocal: rodLocal, draw: draw, drawHolder: drawHolder, info: info, armCount: function () { var n = 0; for (var k in art) if (k[0] === 'a' && k[k.length - 1] !== '<') n++; return n; } };
})();
