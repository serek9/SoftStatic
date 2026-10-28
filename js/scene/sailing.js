var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Sailing (V3.1, V6): location loading and baking, parallax with a smoothed camera,
// the clock-driven dusk sky, mirror water, wake and the boat with the dog.
G.scene = G.scene || {};
G.scene.sailing = (function () {
  var VIEW_W = 320, VIEW_H = 180;
  var S = G.gfx.sprites, B = G.gfx.bake, P = S.PALETTE;
  var boat = G.scene.boat, dog = G.scene.dog, fx = G.gfx.fx;

  var CAM = { k: 4, look: 0.5, lookMax: 40 }; // smoothing 1/s, look-ahead s, max look-ahead px
  var SKY_BANDS = 14;

  var loc = null, layers = [], glint = null;
  var boundsByLoc = {};          // loc id -> landmark id -> [x0, x1] as painted
  var skyCv = null, skyKey = -1, skyLum = 0;
  var skyOut = [0, 0, 0];
  var camPx = 0, camPy = 0;      // rounded camera for this frame's drawing
  var wakeDist = 0, rippleT = 0;

  // Casting (V3.2). Distance follows sqrt(charge), so a short hold still reaches mid-range.
  var CAST = {
    chargeTime: 1.0, // s from empty to full; a full charge simply holds
    minD: 20,        // px beyond the rod reach at zero charge   TODO(P8.1): rod tiers set these
    maxD: 110,       // px beyond the rod reach at full charge
    reach: 12,       // px from the boat centre to where the cast distance starts
    flick: 0.12,     // s the rod takes to whip forward before the lure leaves
    flickAngle: 20, restAngle: 50, waitAngle: 40, backAngle: 70
  };
  var tip = [0, 0], pose = [0, 0];

  S.def('lure', { r: 'rust_hi', b: 'bone' }, ['.r.', 'rbr', '.r.']);

  // ---- Layer painters ------------------------------------------------------
  // Each paints one baked layer of height waterY; rng is a private, seeded stream, so a
  // location always bakes the same picture without touching G.rng or G.vrng.

  var FEATURES = {
    tower: function (ctx, x, top) {
      ctx.fillRect(x - 4, top - 12, 1, 12); ctx.fillRect(x + 4, top - 12, 1, 12);
      ctx.fillRect(x - 4, top - 7, 9, 1);
      ctx.fillRect(x - 6, top - 20, 13, 8);
      ctx.fillRect(x - 5, top - 21, 11, 1); ctx.fillRect(x - 3, top - 22, 7, 1);
    },
    mast: function (ctx, x, top) {
      ctx.fillRect(x, top - 34, 1, 34);
      ctx.fillRect(x - 2, top - 28, 5, 1); ctx.fillRect(x - 1, top - 18, 3, 1);
      for (var i = 1; i < 10; i++) { ctx.fillRect(x - i, top - 30 + i * 3, 1, 1); ctx.fillRect(x + i, top - 30 + i * 3, 1, 1); }
    }
  };

  var LANDMARKS = {
    pier: function (ctx, x, wy, rng) {
      var x0 = x - 34, x1 = x + 34, deck = wy - 7, px;
      ctx.fillStyle = P.wood_dark;
      for (px = x0 + 2; px <= x1 - 3; px += 8) ctx.fillRect(px, deck + 2, 2, wy - deck - 2);
      ctx.fillRect(x0, deck + 2, x1 - x0 + 1, 1);
      ctx.fillStyle = P.wood;
      for (px = x0; px <= x1; px += 2) if (rng.next() > 0.12) ctx.fillRect(px, deck, 2, 2);
      for (px = x0 + 4; px <= x1 - 8; px += 12) if (rng.next() > 0.3) ctx.fillRect(px, deck - 4, 1, 4);
      ctx.fillRect(x0 + 4, deck - 4, 22, 1);
      ctx.fillStyle = P.stone;
      ctx.fillRect(x1 - 3, deck - 16, 1, 16); ctx.fillRect(x1 - 6, deck - 16, 4, 1);
      ctx.fillStyle = P.rust;
      ctx.fillRect(x1 - 7, deck - 15, 2, 2);
      return [x0, x1];
    },
    marker: function (ctx, x, wy, rng) {
      ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 1, wy - 18, 2, 18);
      ctx.fillStyle = P.rust; ctx.fillRect(x, wy - 18, 1, 14);
      ctx.fillStyle = P.rust_hi; ctx.fillRect(x - 2, wy - 23, 5, 5);
      ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 2, wy - 21, 5, 1);
      for (var i = 0; i < 4; i++) ctx.fillRect(x - 1 + rng.int(0, 1), wy - rng.int(4, 16), 1, rng.int(1, 3));
      return [x - 2, x + 2];
    },
    wreck: function (ctx, x, wy) {
      var x0 = x - 12, i, top;
      for (i = 0; i < 24; i++) {
        top = wy - 1 - Math.round(Math.max(0, i - 4) * 0.55);
        ctx.fillStyle = P.wood_dark; ctx.fillRect(x0 + i, top, 1, wy - top);
        ctx.fillStyle = P.wood; ctx.fillRect(x0 + i, top, 1, 1);
        if (i >= 6 && i % 4 === 2) ctx.fillRect(x0 + i, top - 3, 1, 3);
      }
      return [x0, x0 + 23];
    }
  };

  var PAINT = {
    ridge: function (ctx, L, w, wy, rng) {
      var p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28), walk = 0, tops = new Int16Array(w);
      ctx.fillStyle = P[L.color];
      for (var x = 0; x < w; x++) {
        walk = (walk + rng.range(-0.6, 0.6)) * 0.96;
        var top = Math.round(L.base - L.amp * (0.5 + 0.3 * Math.sin(x * 0.011 + p1) + 0.2 * Math.sin(x * 0.037 + p2)) + walk);
        ctx.fillRect(x, top, 1, wy - top);
        tops[x] = top;
      }
      for (var i = 0; i < (L.features || []).length; i++) {
        var f = L.features[i];
        FEATURES[f.kind](ctx, f.x, tops[f.x]);
      }
    },
    fog: function (ctx, L, w, wy, rng) {
      ctx.fillStyle = P[L.color];
      for (var y = 0; y < L.h; y++) {
        var prof = 1 - Math.abs(2 * y / (L.h - 1) - 1);
        for (var x = 0; x < w;) {
          var len = rng.int(6, 40);
          ctx.globalAlpha = L.alpha * prof * rng.range(0.4, 1);
          ctx.fillRect(x, L.y + y, len, 1);
          x += len;
        }
      }
      ctx.globalAlpha = 1;
    },
    treeline: function (ctx, L, w, wy, rng) {
      ctx.fillStyle = P[L.color];
      ctx.fillRect(0, L.base, w, wy - L.base);
      for (var x = 0; x < w + 4;) {
        var hgt = rng.int(Math.round(L.height * 0.5), Math.round(L.height * 1.2)), half = rng.int(2, 4);
        for (var r = 0; r <= hgt; r++) {
          var rh = Math.round(half * r / hgt);
          ctx.fillRect(x - rh, L.base - hgt + r, rh * 2 + 1, 1);
        }
        x += rng.int(3, 8);
        if (rng.next() < 0.08) x += rng.int(8, 20);
      }
    },
    shore: function (ctx, L, w, wy, rng) {
      var x, h;
      ctx.fillStyle = P[L.color];
      for (x = 0; x < w; x++) {
        var top = wy - L.height + (rng.next() < 0.25 ? rng.int(-1, 1) : 0);
        ctx.fillRect(x, top, 1, wy - top);
      }
      ctx.fillStyle = P[L.detail];
      for (var i = 0; i < w / 5; i++) {
        x = rng.int(0, w - 1); h = rng.int(2, 6);
        ctx.fillRect(x, wy - L.height - h + 1, 1, h);
      }
      ctx.fillStyle = P.stone_dark;
      for (i = 0; i < w / 60; i++) ctx.fillRect(rng.int(0, w - 4), wy - 2, rng.int(2, 4), 2);
    },
    landmarks: function (ctx, L, w, wy, rng) {
      var b = boundsByLoc[loc.id] = {};
      for (var i = 0; i < loc.landmarks.length; i++) {
        var lm = loc.landmarks[i];
        b[lm.id] = LANDMARKS[lm.kind](ctx, lm.x, wy, rng);
      }
    }
  };

  function bakeLayer(L, i) {
    var w = VIEW_W + Math.ceil((loc.width - VIEW_W) * L.parallax), wy = loc.waterY;
    var rng = new G.core.rng.Rng(loc.seed * 31 + i);
    return {
      p: L.parallax,
      cv: B.cached('loc:' + loc.id + ':' + L.id, function () {
        return B.layer(w, wy, function (ctx) { PAINT[L.kind](ctx, L, w, wy, rng); });
      })
    };
  }

  // Loads a location from G.data.locations and bakes its layers (cached per location).
  function load(id) {
    loc = G.data.locations[id];
    if (!loc) throw new Error('unknown location: ' + id);
    layers.length = 0;
    for (var i = 0; i < loc.layers.length; i++) layers.push(bakeLayer(loc.layers[i], i));
    var rng = new G.core.rng.Rng(loc.seed * 31 + 99);
    glint = B.cached('loc:' + id + ':glint', function () {
      return B.layer(loc.width, 1, function (ctx, w) {
        ctx.fillStyle = P.water_hi;
        for (var x = rng.int(0, 10); x < w; x += rng.int(5, 18)) ctx.fillRect(x, 0, rng.int(1, 4), 1);
      });
    });
    if (!skyCv) skyCv = B.canvas(1, VIEW_H);
    skyKey = -1;

    var run = G.state.run;
    run.loc = id;
    run.boat = boat.create(loc.start);
    run.dog = dog.create();
    run.cam = { x: 0, y: 0 };
    run.cam.x = camTarget(run);
    run.uw = { alpha: 0 }; // how far the underwater cross-section has faded in
    // One cast at a time. seed is drawn from G.rng on release and is the cast's own seed (§3).
    // latched: clock windows open when the lure landed (D1), cleared when it is reeled in.
    run.cast = { charge: 0, t: 0, x1: 0, dist: 0, seed: 0, n: 0, flying: false, x0: 0, y0: 0, T: 0, h: 0, lx: 0, ly: 0, latched: {} };
    run.school = G.sim.fish_ai.createSchool(G.data);
    run.school.ctx.floorAt = function (x) { return G.scene.underwater.bottomAt(loc, x); };
    run.lureIn = { active: false, x: 0, y: 0, bait: '' };
    run.uneaseIn = { loc: id, still: true, atShop: false };
    run.bite = G.sim.bite.create();
    run.fight = G.sim.fight.create();
    var cc = G.scene.underwater.createCatch();
    run.hook = cc.hook;
    run.heavy = cc.heavy;
    run.dogIn = { interest: 0, tooHeavyNear: false };
    fx.clear();
  }

  // The lure is fishing (fish can spawn, notice and bite) only in these states.
  var FISHING = { sinking: 1, waiting: 1, interest: 1 };

  // Inputs for the sim modules that are not the player's keys.
  var BAIT = 'worm';       // TODO(P8.1): the equipped bait
  var ROD_MAX_MASS = 3;    // kg   TODO(P8.1): the equipped rod's limit

  function fishStep(run, dt) {
    var save = G.state.save, c = run.cast, li = run.lureIn, ctx = run.school.ctx;
    li.active = FISHING[run.fsm] === 1;
    li.x = c.x1;
    li.y = c.ly - loc.waterY;
    li.bait = BAIT;
    ctx.loc = loc.id;
    ctx.depthM = li.y * 0.25;
    ctx.hour = save.clock;
    ctx.unease = G.sim.unease.get(save, loc.id);
    ctx.bait = BAIT;
    ctx.latched = c.latched;
    ctx.rodMaxMass = ROD_MAX_MASS;
    ctx.maxDepthPx = loc.maxDepth;
    G.sim.fish_ai.stepSchool(run.school, li, dt, G.rng, G.data);
    var n = G.sim.fish_ai.interested(run.school);
    if (run.fsm === 'waiting' && n > 0) G.core.state.go(run, 'interest');
    else if (run.fsm === 'interest' && n === 0) G.core.state.go(run, 'waiting');
  }

  // ---- Cast ------------------------------------------------------------------------

  // World x where a cast at this charge lands. The marker and the release both use this.
  function landingX(b, charge) {
    var dist = CAST.minD + (CAST.maxD - CAST.minD) * Math.sqrt(charge);
    return clamp(Math.round(b.x + b.facing * (CAST.reach + dist)), 8, loc.width - 8);
  }

  function release(run) {
    var c = run.cast, b = run.boat;
    c.x1 = landingX(b, c.charge);
    c.dist = Math.abs(c.x1 - b.x);
    c.seed = G.rng.int(1, 0x7fffffff);
    c.n++;
    c.t = 0;
    c.flying = false;
    G.core.state.go(run, 'casting');
    if (G.core.debug) G.core.debug.log('cast #' + c.n + ' charge ' + c.charge.toFixed(2) + ' -> x ' + c.x1 + ' seed ' + c.seed);
  }

  // The lure rides the rod tip during the flick, then flies a parabola from the tip that
  // ends exactly on (x1, waterY): x is linear in u and the arc term is zero at u = 1.
  function flight(run, dt) {
    var c = run.cast, wy = loc.waterY;
    c.t += dt;
    if (c.t < CAST.flick) return;
    if (!c.flying) {
      boat.rodTip(run.boat, run.boat.x, wy, CAST.flickAngle, tip);
      c.x0 = tip[0]; c.y0 = tip[1];
      c.T = 0.45 + Math.abs(c.x1 - c.x0) / 260;
      c.h = 10 + c.dist * 0.18;
      c.flying = true;
    }
    var u = Math.min(1, (c.t - CAST.flick) / c.T);
    c.lx = c.x0 + (c.x1 - c.x0) * u;
    c.ly = c.y0 + (wy - c.y0) * u - 4 * c.h * u * (1 - u);
    if (u >= 1) {
      c.lx = c.x1; c.ly = wy;
      fx.splash(c.x1, wy, Math.min(1, c.dist / 100));
      G.sim.clock.latch(c.latched, G.state.save.clock, G.data.windows);
      G.core.state.go(run, 'sinking');
    }
  }

  // Debug: casts straight away at the given charge. Returns the landing x, or false if not sailing.
  function forceCast(charge) {
    var run = G.state.run;
    if (run.fsm !== 'sailing') return false;
    run.cast.charge = clamp(charge, 0, 1);
    G.core.state.go(run, 'charging');
    release(run);
    return run.cast.x1;
  }

  function castStep(run, dt) {
    var c = run.cast, inp = G.core.input;
    switch (run.fsm) {
      case 'sailing':
        if (inp.pressed('action') && run.boat.stopped) {
          c.charge = 0;
          G.sim.clock.clearLatch(c.latched); // the last cast is out of the water
          G.scene.underwater.resetHeavy(run);
          G.core.state.go(run, 'charging');
        }
        break;
      case 'charging':
        if (inp.move() !== 0) { G.core.state.go(run, 'sailing'); break; } // steering cancels the charge
        // Release before charging further, so the cast uses exactly the charge the marker last showed.
        if (!inp.held('action')) release(run);
        else c.charge = Math.min(1, c.charge + dt / CAST.chargeTime);
        break;
      case 'casting':
        flight(run, dt);
        break;
      case 'sinking':
      case 'waiting':
      case 'interest':
        G.scene.underwater.lureStep(run, dt, loc);
        break;
    }
  }

  // Rod angle and bend for the current state, written into out.
  function rodPose(run, out) {
    var c = run.cast, back = CAST.restAngle + CAST.backAngle * Math.sqrt(c.charge), u;
    switch (run.fsm) {
      case 'charging':
        out[0] = back; out[1] = 3 * Math.sqrt(c.charge);
        break;
      case 'casting':
        if (c.t < CAST.flick) {
          u = c.t / CAST.flick;
          out[0] = back + (CAST.flickAngle - back) * u; out[1] = -3 * u;
        } else {
          u = Math.min(1, (c.t - CAST.flick) / 0.3);
          out[0] = CAST.flickAngle + (CAST.waitAngle - CAST.flickAngle) * u; out[1] = -3 * (1 - u);
        }
        break;
      case 'sailing':
      case 'card':
        out[0] = CAST.restAngle; out[1] = 0;
        break;
      case 'hooked':
      case 'fighting':
        // Pull: bent hard toward the fish. Tired: relaxed. Both deepen with tension.
        var F = run.fight;
        out[0] = CAST.waitAngle + 8 - 10 * F.T;
        out[1] = F.mode === 'pull' ? 4 + 5 * F.T : 1 + 2 * F.T;
        break;
      case 'landing':
        out[0] = 70; out[1] = 2;
        break;
      default:
        out[0] = CAST.waitAngle; out[1] = 1;
        // Bite cue (7.1): the rod tip bobs while a fish is on the bite.
        if (run.bite.slot >= 0) out[0] -= 5 * Math.abs(Math.sin(run.bite.t * 12));
    }
    return out;
  }

  // 1 px line between two screen points (Bresenham). dotted draws every other pixel.
  function line(ctx, x0, y0, x1, y1, dotted) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, n = 0;
    for (;;) {
      if (!dotted || (n++ & 1) === 0) ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Marker, line and lure, in screen space.
  function drawCast(ctx) {
    var run = G.state.run, c = run.cast, b = run.boat, wy = loc.waterY - camPy, fsm = run.fsm;
    if (fsm === 'charging') {
      var mx = landingX(b, c.charge) - camPx;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = P.fog_light;
      ctx.fillRect(mx - 2, wy + 1, 5, 1);
      ctx.fillRect(mx - 3, wy + 2, 1, 1); ctx.fillRect(mx + 3, wy + 2, 1, 1);
      ctx.fillRect(mx - 2, wy + 3, 5, 1);
      ctx.globalAlpha = 1;
      return;
    }
    var under = G.scene.underwater.UNDER[fsm] === 1;
    if (fsm !== 'casting' && !under) return;
    rodPose(run, pose);
    var sx = Math.round(b.x - run.cam.x);
    boat.rodTip(b, sx, wy, pose[0], tip);
    if (fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing') { drawFightLine(ctx, run); return; }
    var lx, ly;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = P.fog_light;
    if (fsm === 'casting') {
      if (c.flying) { lx = c.lx - camPx; ly = c.ly - camPy; } else { lx = tip[0]; ly = tip[1]; }
      line(ctx, tip[0], tip[1], lx, ly, false);
    } else {
      // Above the water the line runs to where the lure went in; below it drops dotted to the lure.
      var ex = c.x1 - camPx, hum = run.heavy.hum > 0 ? Math.round(Math.sin(b.t * 90)) : 0;
      lx = ex; ly = c.ly - camPy;
      if (fsm !== 'sinking') lx += Math.round(Math.sin(b.t * 1.3) * 1.5);      // the lure sways once it stops
      if (run.bite.slot >= 0) ly += 2 + Math.round(Math.sin(run.bite.t * 18)); // bite cue: the line dips
      else if (G.sim.fish_ai.interestLevel(run.school) >= 0.85) lx += Math.round(Math.sin(b.t * 40)); // nibbles
      line(ctx, tip[0], tip[1], ex, wy, false);
      line(ctx, ex + hum, wy, lx + hum, ly, true); // hum: the line shivers once for a heavy fish
    }
    ctx.globalAlpha = 1;
    S.draw(ctx, 'lure', Math.round(lx) - 1, Math.round(ly) - 1, 0, false);
  }

  // 7.4: pulling, the line runs straight and shakes; tired, it sags. The tint warms with
  // tension (amber, then red) but the shape carries the meaning.
  var mouthPt = [0, 0];
  function drawFightLine(ctx, run) {
    var F = run.fight, pull = run.fsm !== 'landing' && F.mode === 'pull';
    G.scene.underwater.mouth(loc, camPx, camPy, mouthPt);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = P[G.ui.hud.tensionKey(run.fsm === 'landing' ? 0 : F.T)];
    var mx = (tip[0] + mouthPt[0]) / 2, my = (tip[1] + mouthPt[1]) / 2;
    if (pull) {
      var shake = Math.round(Math.sin(run.boat.t * 47));
      line(ctx, tip[0], tip[1], mx + shake, my, false);
      line(ctx, mx + shake, my, mouthPt[0], mouthPt[1], false);
    } else {
      var sag = 3 + 12 * (1 - F.T), steps = 24, px = tip[0], py = tip[1];
      for (var i = 1; i <= steps; i++) {
        var u = i / steps, v = 1 - u;
        var qx = v * v * tip[0] + 2 * u * v * mx + u * u * mouthPt[0];
        var qy = v * v * tip[1] + 2 * u * v * (my + sag) + u * u * mouthPt[1];
        line(ctx, px, py, qx, qy, false);
        px = qx; py = qy;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- Camera ----------------------------------------------------------------
  // The target is clamped before smoothing, so the camera eases into the world edge and
  // never overshoots or bounces against it.

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var FRAMED = { hooked: 1, fighting: 1, landing: 1 };

  function camTarget(run) {
    if (FRAMED[run.fsm] && run.hook) {
      // During a fight, centre between boat and fish (they are at most ~152 px apart).
      return clamp((run.boat.x + run.hook.x) / 2 - VIEW_W / 2, 0, loc.width - VIEW_W);
    }
    var look = clamp(run.boat.vx * CAM.look, -CAM.lookMax, CAM.lookMax);
    return clamp(run.boat.x - VIEW_W / 2 + look, 0, loc.width - VIEW_W);
  }

  function camStep(run, dt) {
    var c = run.cam;
    c.x += (camTarget(run) - c.x) * (1 - Math.exp(-CAM.k * dt));
    c.x = clamp(c.x, 0, loc.width - VIEW_W);
  }

  // Moves the boat to world x (clamped), stops it and snaps the camera.
  function tp(x) {
    var run = G.state.run, m = boat.P.margin;
    run.boat.x = clamp(x, m, loc.width - m);
    run.boat.vx = 0;
    run.cam.x = camTarget(run);
    return run.boat.x;
  }

  // ---- Sky (§0.8, §0.9) ------------------------------------------------------
  // Permanent dusk: only a blend of night_ink and dusk_amber, darkest at 03:00 and
  // brightest at 15:00, always darker toward the top.

  function skyBrightness(hour) { return 0.5 - 0.5 * Math.cos((hour - 3) / 24 * 2 * Math.PI); }

  // f is 0 at the top of the sky and 1 at the horizon. Writes [r, g, b] into out.
  function skyColor(hour, f, out) {
    var b = skyBrightness(hour);
    var t = Math.min(1, b * (0.2 + 0.8 * f) + 0.06 * f * (1 - b));
    var a = S.RGB.night_ink, z = S.RGB.dusk_amber;
    out[0] = Math.round(a[0] + (z[0] - a[0]) * t);
    out[1] = Math.round(a[1] + (z[1] - a[1]) * t);
    out[2] = Math.round(a[2] + (z[2] - a[2]) * t);
    return out;
  }

  function hourNow() { return G.sim.clock.wrap(G.state.save.clock || 0); }

  // Rebakes the 1 px wide sky strip when the hour moves by 0.05 (3 real seconds).
  function refreshSky(hour) {
    var key = Math.floor(hour * 20);
    if (key === skyKey) return;
    skyKey = key;
    var ctx = skyCv.getContext('2d'), wy = loc.waterY;
    skyLum = 0;
    for (var i = 0; i < SKY_BANDS; i++) {
      skyColor(hour, i / (SKY_BANDS - 1), skyOut);
      var lum = 0.2126 * skyOut[0] + 0.7152 * skyOut[1] + 0.0722 * skyOut[2];
      if (lum > skyLum) skyLum = lum;
      if (!S.skySafe(skyOut[0], skyOut[1], skyOut[2])) throw new Error('sky brighter than ' + S.CEILING_KEY + ' at hour ' + hour);
      ctx.fillStyle = 'rgb(' + skyOut[0] + ',' + skyOut[1] + ',' + skyOut[2] + ')';
      var y0 = Math.floor(i * wy / SKY_BANDS), y1 = Math.floor((i + 1) * wy / SKY_BANDS);
      ctx.fillRect(0, y0, 1, y1 - y0);
    }
  }

  // ---- Scene -------------------------------------------------------------------

  function enter() {
    if (!G.state.run.boat) load('fog'); // TODO(P9.5): start at the saved location
  }

  function exit() {}

  function update(dt) {
    var run = G.state.run, b = run.boat, save = G.state.save;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    run.uneaseIn.loc = loc.id;
    run.uneaseIn.still = b.stopped;
    G.sim.unease.step(save, run.uneaseIn, dt, G.rng, G.data);
    castStep(run, dt);
    fishStep(run, dt);
    G.scene.underwater.catchStep(run, dt, loc);
    if (run.fsm === 'card') {
      var choice = G.ui.card.update(dt);
      if (choice) { G.ui.card.commit(choice, save); G.core.state.go(run, 'sailing'); }
    }
    var move = run.fsm === 'sailing' ? G.core.input.move() : 0;
    boat.step(b, move, dt, loc.width);
    // 7.6: the dog reads interest and the heavy-fish flag only while the lure is fishing.
    var fishing = FISHING[run.fsm] === 1;
    run.dogIn.interest = fishing ? G.sim.fish_ai.interestLevel(run.school) : (run.fsm === 'fighting' ? 0.5 : 0);
    run.dogIn.tooHeavyNear = fishing && run.school.ctx.tooHeavyNear;
    dog.step(run.dog, dt, run.dogIn);
    camStep(run, dt);
    G.scene.underwater.viewStep(run, dt, loc);

    // Wake: a puff and a small ripple every 6 px travelled; a slow ring while idling.
    var wy = loc.waterY;
    wakeDist += Math.abs(b.vx) * dt;
    while (wakeDist >= 6) {
      wakeDist -= 6;
      fx.emit('wake', boat.stern(b), wy, 2);
      fx.ripple(boat.stern(b), wy + 2, 2, 9, 1.1);
    }
    rippleT += dt;
    if (b.stopped && rippleT >= 1.8) {
      rippleT = 0;
      fx.ripple(b.x, wy + 2, 13, 24, 2.2);
    }
    fx.update(dt);
    G.core.state.tick(run, dt);
  }

  function drawBackdrop(c) {
    var wy = loc.waterY;
    c.drawImage(skyCv, 0, 0, 1, wy, 0, -camPy, VIEW_W, wy);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      c.drawImage(L.cv, Math.round(camPx * L.p), 0, VIEW_W, wy, 0, -camPy, VIEW_W, wy);
    }
  }

  function drawDog(c, x, y, flip) { dog.draw(c, G.state.run.dog, x, y, flip); }

  function drawBoat(c) {
    var run = G.state.run;
    rodPose(run, pose);
    boat.draw(c, run.boat, Math.round(run.boat.x - run.cam.x), loc.waterY - camPy, true, drawDog, pose[0], pose[1]);
  }

  function drawAbove(c) { drawBackdrop(c); drawBoat(c); }

  function draw(ctx) {
    var run = G.state.run, wy = loc.waterY;
    refreshSky(hourNow());
    camPx = Math.round(run.cam.x);
    camPy = Math.round(run.cam.y);
    var a = run.uw.alpha;
    drawBackdrop(ctx);
    // The mirror is only ever drawn with the camera at the surface (see underwater.js).
    if (a < 1) G.gfx.water.draw(ctx, wy, VIEW_H, run.boat.t, drawAbove);
    if (a > 0) G.scene.underwater.draw(ctx, loc, camPx, camPy, a, run.boat.t);
    ctx.drawImage(glint, camPx, 0, VIEW_W, 1, 0, wy - camPy, VIEW_W, 1);
    fx.draw(ctx, camPx, camPy);
    drawBoat(ctx);
    G.scene.underwater.drawHooked(ctx, loc, camPx, camPy, run.boat.t);
    drawCast(ctx);
    G.ui.hud.draw(ctx, run, wy);
    G.ui.card.draw(ctx);
  }

  return {
    load: load, tp: tp, enter: enter, exit: exit, update: update, draw: draw,
    CAST: CAST, landingX: landingX, forceCast: forceCast,
    setRodMax: function (kg) { ROD_MAX_MASS = kg; return kg; }, // debug   TODO(P8.1)
    skyColor: skyColor, hourNow: hourNow,
    loc: function () { return loc; },
    landmarkBounds: function (id) { return boundsByLoc[loc.id] && boundsByLoc[loc.id][id]; },
    skyLum: function () { return skyLum; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, sc = G.scene.sailing;
  if (!run.boat || !sc.loc()) return 'sailing: not loaded';
  var b = run.boat;
  return 'loc ' + run.loc + '  cam ' + run.cam.x.toFixed(1) + '  hour ' + sc.hourNow().toFixed(2) +
    '  sky lum ' + sc.skyLum().toFixed(0) + '/' + G.gfx.sprites.CEILING.toFixed(0) + '\n' +
    'boat x ' + b.x.toFixed(1) + '  vx ' + b.vx.toFixed(2) + '  stopped ' + (b.stopped ? 'Y' : 'n') +
    '  facing ' + (b.facing > 0 ? 'R' : 'L') + '  dog ' + run.dog.pose;
});

if (G.core.debug) G.core.debug.addLine(function () {
  var save = G.state.save, run = G.state.run, C = G.sim.clock, h = C.wrap(save.clock || 0), wins = '';
  G.data.windows.forEach(function (w) {
    var open = C.inWindow(h, w), lat = run.cast && run.cast.latched[w.id];
    if (open || lat) wins += '  ' + w.id + (open ? ' open' : '') + (lat ? ' latched' : '');
  });
  var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return 'clock ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + (C.isGrey(h) ? ' grey' : ' night') + wins +
    '  unease ' + (run.loc || '-') + ' ' + G.sim.unease.get(save, run.loc).toFixed(3) +
    (run.school && run.school.ctx.tooHeavyNear ? '  tooHeavyNear' : '');
});

if (G.core.debug) G.core.debug.addLine(function () {
  var c = G.state.run.cast;
  if (!c) return 'cast: none';
  return 'cast #' + c.n + '  charge ' + c.charge.toFixed(2) + '  -> x ' + c.x1 + ' (dist ' + c.dist + ')  seed ' + c.seed +
    (c.flying ? '  lure ' + c.lx.toFixed(1) + ',' + c.ly.toFixed(1) : '');
});
