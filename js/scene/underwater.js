var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The underwater cross-section (V3.3, D6). Once the lure is in the water the view fades
// from the mirror surface to a cut-away of the lake, then a vertical camera follows the
// lure down, clamped so the deepest bottom (maxDepth) still fits on screen. The boat stays
// above the surface line the whole time.
//
// No pop: the fade happens with the camera at the surface, and on the way back the camera
// returns to the surface before the fade out, so the mirror is only drawn when cam.y is 0.
G.scene = G.scene || {};
G.scene.underwater = (function () {
  var VIEW_W = 320, VIEW_H = 180;
  var S = G.gfx.sprites, B = G.gfx.bake, P = S.PALETTE, fx = G.gfx.fx;

  var UW = {
    fade: 0.35,       // s to fade the cross-section in or out
    camK: 3,          // 1/s vertical camera smoothing
    lureScreenY: 120, // where the camera tries to keep the lure
    bottomPad: 12,    // px of bottom shown below maxDepth when fully down
    sinkV: 12,        // px/s sinking speed (3 m/s), easing off just above the bottom
    reelUp: 22,       // px/s while reeling, up toward the surface
    reelIn: 30,       // px/s while reeling, in toward the boat
    reach: 12         // px from boat centre where reeling stops pulling sideways
  };
  // Fishing states that happen underwater.
  var UNDER = { sinking: 1, waiting: 1, interest: 1, hooked: 1, fighting: 1, landing: 1 };

  var sets = {};   // loc id -> baked set
  var MN = 36;     // drifting motes
  var mx = new Float32Array(MN), my = new Float32Array(MN), mp = new Float32Array(MN);
  var motesReady = false;
  var stats = { ms: 0 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function lerpRGB(a, b, t) {
    var A = S.RGB[a], Z = S.RGB[b];
    return 'rgb(' + Math.round(A[0] + (Z[0] - A[0]) * t) + ',' + Math.round(A[1] + (Z[1] - A[1]) * t) + ',' +
      Math.round(A[2] + (Z[2] - A[2]) * t) + ')';
  }

  // Bottom depth (px below the surface) for every world x. Deterministic per location, and
  // its deepest point is exactly maxDepth.
  function makeProfile(loc) {
    var u = loc.underwater, w = loc.width, rng = new G.core.rng.Rng(loc.seed * 31 + 200);
    var raw = new Float32Array(w), prof = new Int16Array(w), p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28);
    var walk = 0, min = 1e9, x;
    for (x = 0; x < w; x++) {
      walk = (walk + rng.range(-0.5, 0.5)) * 0.97;
      raw[x] = u.bottomAmp * (0.5 + 0.3 * Math.sin(x * 0.009 + p1) + 0.2 * Math.sin(x * 0.031 + p2)) + walk * 2;
      if (raw[x] < min) min = raw[x];
    }
    for (x = 0; x < w; x++) prof[x] = Math.round(loc.maxDepth - Math.min(u.bottomAmp, raw[x] - min));
    return prof;
  }

  // Bakes (once per location) the gradient strip, bottom, three weed frames and a light shaft.
  function prepare(loc) {
    var set = sets[loc.id];
    if (set) return set;
    var u = loc.underwater, w = loc.width, H = loc.maxDepth + 24, key = 'loc:' + loc.id + ':uw_';
    var prof = makeProfile(loc), rng = new G.core.rng.Rng(loc.seed * 31 + 201);
    set = sets[loc.id] = { id: loc.id, H: H, prof: prof, camMax: Math.max(0, loc.waterY + loc.maxDepth + UW.bottomPad - VIEW_H) };

    set.grad = B.cached(key + 'grad', function () {
      return B.layer(1, H, function (ctx) {
        for (var y = 0; y < H; y += 3) {
          var f = y / H;
          ctx.fillStyle = f < 0.5 ? lerpRGB('water_mid', 'water_dark', f / 0.5) : lerpRGB('water_dark', 'water_deep', (f - 0.5) / 0.5);
          ctx.fillRect(0, y, 1, 3);
        }
      });
    });

    set.bottom = B.cached(key + 'bottom', function () {
      return B.layer(w, H, function (ctx) {
        var x, top;
        for (x = 0; x < w; x++) {
          top = prof[x] + 2; // the lure (3 px tall, centred on its depth) rests on this row
          ctx.fillStyle = P[u.silt]; ctx.fillRect(x, top, 1, H - top);
          ctx.fillStyle = P[u.rock]; ctx.fillRect(x, top, 1, 1);
        }
        for (var i = 0; i < w / 14; i++) {
          x = rng.int(0, w - 8);
          var rw = rng.int(3, 7), rh = rng.int(2, 4), base = 1e9;
          for (var k = 0; k < rw; k++) base = Math.min(base, prof[x + k] + 2);
          ctx.fillStyle = P[u.rock];
          ctx.fillRect(x + 1, base - rh, rw - 2, 1);
          ctx.fillRect(x, base - rh + 1, rw, rh);
          ctx.fillStyle = P.stone; ctx.fillRect(x + 1, base - rh, 1, 1);
        }
      });
    });

    // Weed strands, baked in three lean frames (-1, 0, 1) and cycled slowly.
    var strands = [], n = Math.round(w * u.weedDensity);
    for (var s = 0; s < n; s++) strands.push({ x: rng.int(2, w - 3), h: rng.int(6, 22), dark: rng.next() < 0.5 });
    set.weeds = [];
    for (var f = 0; f < 3; f++) {
      set.weeds.push(B.cached(key + 'weeds' + f, (function (lean) {
        return function () {
          return B.layer(w, H, function (ctx) {
            for (var i = 0; i < strands.length; i++) {
              var st = strands[i], base = prof[st.x] + 2;
              ctx.fillStyle = P[st.dark ? u.weedDark : u.weed];
              for (var y = 0; y < st.h; y++) {
                var dx = Math.round(lean * 2 * Math.pow(y / st.h, 1.5));
                ctx.fillRect(st.x + dx, base - 1 - y, 1, 1);
                if (y > 2 && y % 4 === 0) ctx.fillRect(st.x + dx + (y % 8 === 0 ? 1 : -1), base - 1 - y, 1, 1);
              }
            }
          });
        };
      })(f - 1)));
    }

    set.shaft = B.cached(key + 'shaft', function () {
      return B.layer(28, 70, function (ctx) {
        ctx.fillStyle = P.water_hi;
        for (var y = 0; y < 70; y++) {
          ctx.globalAlpha = 0.22 * (1 - y / 70);
          ctx.fillRect(Math.round(y * 0.3), y, 6 + Math.round(y / 14), 1);
        }
        ctx.globalAlpha = 1;
      });
    });
    return set;
  }

  function bottomAt(loc, x) {
    var set = prepare(loc);
    return set.prof[clamp(Math.round(x), 0, loc.width - 1)];
  }

  // ---- Lure (sinking and waiting) --------------------------------------------------
  // The lure hangs below where it entered the water (cast.x1); cast.ly is its world y.
  // Sinking: it falls to the bottom; tapping action stops it at its depth (-> waiting).
  // Waiting: holding action reels it up and in; at the surface it is out (-> sailing).
  function lureStep(run, dt, loc) {
    var c = run.cast, inp = G.core.input, wy = loc.waterY, bottom = bottomAt(loc, c.x1);
    if (run.fsm === 'sinking') {
      if (inp.pressed('action')) { G.core.state.go(run, 'waiting'); return; }
      var depth = c.ly - wy;
      depth += UW.sinkV * Math.min(1, 0.15 + (bottom - depth) / 6) * dt;
      if (depth >= bottom) { depth = bottom; G.core.state.go(run, 'waiting'); }
      c.ly = wy + depth;
      c.lx = c.x1;
      c.bubT = (c.bubT || 0) - dt;
      if (c.bubT <= 0) { c.bubT = 0.4; fx.emit('bubbles', c.lx, c.ly - 2, 1); }
    } else if (run.fsm === 'waiting') {
      if (inp.held('action')) {
        var b = run.boat, home = b.x + b.facing * UW.reach;
        c.x1 += clamp(home - c.x1, -UW.reelIn * dt, UW.reelIn * dt);
        c.lx = c.x1;
        c.ly -= UW.reelUp * dt;
        if (c.ly <= wy) {
          c.ly = wy;
          fx.splash(c.x1, wy, 0.15);
          G.core.state.go(run, 'sailing');
          return;
        }
      }
      // TODO(P6.7): fish notice the lure here (waiting -> interest).
      c.ly = Math.min(c.ly, wy + bottomAt(loc, c.x1));
    }
  }

  // ---- View: fade, vertical camera, motes -------------------------------------------
  function viewStep(run, dt, loc) {
    var set = prepare(loc), uw = run.uw, cam = run.cam, active = UNDER[run.fsm] === 1, target = 0;
    if (active) {
      if (uw.alpha < 1) uw.alpha = Math.min(1, uw.alpha + dt / UW.fade);
      else target = clamp(run.cast.ly - UW.lureScreenY, 0, set.camMax);
    }
    cam.y += (target - cam.y) * (1 - Math.exp(-UW.camK * dt));
    if (active && uw.alpha >= 1 && run.cast.ly - cam.y > VIEW_H - 8) cam.y = run.cast.ly - (VIEW_H - 8);
    cam.y = clamp(cam.y, 0, set.camMax);
    if (!active && cam.y < 0.25) {
      cam.y = 0;
      uw.alpha = Math.max(0, uw.alpha - dt / UW.fade);
    }

    if (!motesReady) {
      for (var i = 0; i < MN; i++) { mx[i] = G.vrng.range(0, 1200); my[i] = G.vrng.range(0, set.H); mp[i] = G.vrng.range(0, 6.28); }
      motesReady = true;
    }
    if (uw.alpha > 0) {
      for (var j = 0; j < MN; j++) { mp[j] += dt * 0.8; my[j] += dt * 1.5; mx[j] += Math.sin(mp[j]) * 2 * dt; }
    }
  }

  // ---- Draw ----------------------------------------------------------------------------
  var WEED_SEQ = [0, 1, 2, 1];

  // camPx, camPy: the rounded camera. alpha: how far the fade has got. t: time in seconds.
  function draw(ctx, loc, camPx, camPy, alpha, t) {
    var t0 = performance.now(), set = prepare(loc), H = set.H, wyS = loc.waterY - camPy;
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.grad, 0, 0, 1, H, 0, wyS, VIEW_W, H);

    var every = loc.underwater.shaftEvery, par = camPx * 0.8, k0 = Math.floor(par / every) - 1;
    for (var k = k0; k < k0 + 4; k++) {
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * 0.6 + k * 1.7));
      ctx.drawImage(set.shaft, Math.round(k * every + 40 - par), wyS);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.bottom, camPx, 0, VIEW_W, H, 0, wyS, VIEW_W, H);
    ctx.drawImage(set.weeds[WEED_SEQ[Math.floor(t * 1.5) % 4]], camPx, 0, VIEW_W, H, 0, wyS, VIEW_W, H);

    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = P.water_hi;
    for (var i = 0; i < MN; i++) {
      var x = ((mx[i] - camPx * 0.9) % VIEW_W + VIEW_W) % VIEW_W;
      ctx.fillRect(Math.round(x), Math.round(wyS + 2 + (my[i] % (H - 4))), 1, 1);
    }
    ctx.globalAlpha = 1;
    stats.ms = performance.now() - t0;
  }

  // Debug: puts the lure at depthM metres (clamped to the bottom), optionally at world x.
  function setLure(run, loc, depthM, x) {
    var c = run.cast;
    if (!UNDER[run.fsm]) return false;
    if (x !== undefined) c.x1 = c.lx = clamp(Math.round(x), 0, loc.width - 1);
    c.ly = loc.waterY + clamp(depthM / 0.25, 0, bottomAt(loc, c.x1));
    return (c.ly - loc.waterY) * 0.25;
  }

  // World x of the deepest bottom (where it equals maxDepth).
  function deepestX(loc) {
    var p = prepare(loc).prof, best = 0;
    for (var x = 1; x < p.length; x++) if (p[x] > p[best]) best = x;
    return best;
  }

  return {
    UW: UW, UNDER: UNDER, stats: stats, prepare: prepare, bottomAt: bottomAt, deepestX: deepestX,
    lureStep: lureStep, viewStep: viewStep, draw: draw, setLure: setLure
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, sc = G.scene.sailing, loc = sc.loc();
  if (!run.uw || !loc) return 'underwater: -';
  var depth = Math.max(0, run.cast.ly - loc.waterY);
  return 'underwater alpha ' + run.uw.alpha.toFixed(2) + '  camY ' + run.cam.y.toFixed(1) + '  lure ' + depth.toFixed(1) + ' px = ' +
    (depth * 0.25).toFixed(2) + ' m  bottom ' + (G.scene.underwater.bottomAt(loc, run.cast.x1) * 0.25).toFixed(2) + ' m  draw ' +
    G.scene.underwater.stats.ms.toFixed(2) + ' ms';
});
