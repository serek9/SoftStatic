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
    minD: 20,        // px beyond the rod reach at zero charge (full charge: the rod's castMax)
    reach: 12,       // px from the boat centre to where the cast distance starts
    flick: 0.12,     // s the rod takes to whip forward before the lure leaves
    flickAngle: 20, restAngle: 50, waitAngle: 40, backAngle: 70
  };
  var tip = [0, 0], pose = [0, 0];

  S.def('lure', { r: 'rust_hi', b: 'bone' }, ['.r.', 'rbr', '.r.']);
  S.def('float', { r: 'neon_red', b: 'bone' }, ['r', 'r', 'b']); // the passive line's float (12.2)
  // 10.4: the owl that calls at a clock window's cue. Its eyes are open in frame 1.
  S.def('owl', { o: 'stone', d: 'stone_dark', e: 'signal_amber', k: 'ink' }, [
    ['o...o', 'ooooo', 'okook', 'ooooo', 'odddo', '.ddd.', '.k.k.'],
    ['o...o', 'ooooo', 'oeooe', 'ooooo', 'odddo', '.ddd.', '.k.k.']
  ]);
  var OWL = { show: 7, cry: 1.5, ring: 2.5, fade: 1 }; // s on screen, cry at, rings last, fade in/out
  var ANOM_FADE = 2;                                   // s an anomaly takes to fade in or out

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
    },
    // 11.1: a decaying cabin on stilts at the water's edge; its roof sags by lm.sag px.
    cabin: function (ctx, x, wy, rng, lm) {
      var x0 = x - 16, x1 = x + 16, floor = wy - 6, top = floor - 16, sag = lm.sag || 1, i, r;
      ctx.fillStyle = P.wood_dark;
      for (i = x0 + 1; i <= x1 - 2; i += 6) ctx.fillRect(i, floor, 2, wy - floor); // stilts
      ctx.fillRect(x0, top, x1 - x0 + 1, floor - top);
      ctx.fillStyle = P.wood;
      for (i = top + 1; i < floor; i += 3) {                                       // boards, some missing
        for (var bx = x0; bx <= x1; bx += 4) if (rng.next() > 0.15) ctx.fillRect(bx, i, 4, 1);
      }
      ctx.fillStyle = P.night_ink;
      ctx.fillRect(x0 + 5, top + 4, 6, 5);                                         // dark window
      ctx.fillRect(x1 - 10, top + 5, 6, floor - top - 5);                          // the door, ajar
      ctx.fillStyle = P.wood_dark; ctx.fillRect(x1 - 10, top + 5, 2, floor - top - 5);
      ctx.fillStyle = P.stone_dark; ctx.fillRect(x0 + 8, top + 4, 1, 5); ctx.fillRect(x0 + 5, top + 6, 6, 1);
      // Gable roof whose ridge has sunk.
      var peak = top - 10 + sag;
      ctx.fillStyle = P.rust_dark;
      for (r = peak; r < top; r++) {
        var hw = Math.round(19 * (r - peak + 1) / (top - peak));
        ctx.fillRect(x - hw, r, hw * 2 + 1, 1);
      }
      ctx.fillStyle = P.night_ink;
      for (i = 0; i < 4; i++) ctx.fillRect(x + rng.int(-10, 10), rng.int(peak + 3, top - 1), 1, 1); // holes
      ctx.fillStyle = P.rust; ctx.fillRect(x + 8, peak - 1, 2, 6);                 // a leaning stovepipe
      return [x - 19, x + 19];
    },
    // 11.1: dead branches standing out of the water. They carry on down to the bottom in the
    // cross-section (underwater.snags).
    snag: function (ctx, x, wy, rng) {
      var lean = rng.next() < 0.5 ? -1 : 1, h = rng.int(14, 22), lo = x, hi = x + 1, px, i, k;
      ctx.fillStyle = P.wood_dark;
      for (i = 0; i < h; i++) {
        px = x + Math.round(lean * i * 0.45);
        ctx.fillRect(px, wy - 1 - i, i < h * 0.6 ? 2 : 1, 1);
        if (px < lo) lo = px;
        if (px + 1 > hi) hi = px + 1;
        if (i === Math.floor(h / 3) || i === Math.floor(h * 2 / 3)) {
          var len = rng.int(4, 7);
          for (k = 1; k <= len; k++) ctx.fillRect(px - lean * k, wy - 1 - i - k, 1, 1);
          lo = Math.min(lo, px - len); hi = Math.max(hi, px + len);
        }
      }
      ctx.fillStyle = P.stone_dark; ctx.fillRect(x - 3, wy - 1, 7, 1);
      return [lo, hi];
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
    // 11.1: the creek's near forest: straight trunks from above the view to the bank, a few
    // broken branches, and a ragged crown where the top shows.
    trunks: function (ctx, L, w, wy, rng) {
      for (var x = rng.int(0, 20); x < w; x += rng.int(L.gap[0], L.gap[1])) {
        var tw = rng.int(2, 4), top = rng.int(-12, L.top), b, k;
        ctx.fillStyle = P[L.color];
        ctx.fillRect(x, top, tw, wy - top);
        for (b = 0; b < 3; b++) {
          var by = rng.int(Math.max(4, top + 8), wy - 22), len = rng.int(3, 8), dir = rng.next() < 0.5 ? -1 : 1;
          for (k = 0; k < len; k++) ctx.fillRect(dir < 0 ? x - 1 - k : x + tw + k, by - (k >> 1), 1, 1);
        }
        if (top < 0) continue;
        ctx.fillStyle = P[L.crown];
        for (k = -9; k <= 5; k++) {
          var cw = Math.round((6 - Math.abs(k + 2) * 0.5) + rng.range(-1.5, 1.5));
          if (cw > 0) ctx.fillRect(x + (tw >> 1) - cw, top + k, cw * 2, 1);
        }
      }
    },
    // A landmark with its own seed paints the same wherever it stands (the same pier in two lakes, 11.4).
    landmarks: function (ctx, L, w, wy, rng) {
      var b = boundsByLoc[loc.id] = {};
      for (var i = 0; i < loc.landmarks.length; i++) {
        var lm = loc.landmarks[i], paint = (scen.landmarks && scen.landmarks[lm.kind]) || LANDMARKS[lm.kind];
        b[lm.id] = paint(ctx, lm.x, wy, lm.seed ? new G.core.rng.Rng(lm.seed) : rng, lm);
      }
    }
  };

  // ---- Scenery modules (11.4) ---------------------------------------------------
  // loc.scenery names a module in G.scene.scenery (js/scene/scenery.js) for what baked
  // layers cannot do alone. Every part is optional; a location without a module (Fogbound,
  // the creek) skips them all:
  //   paint {kind: fn}, landmarks {kind: fn}: more layer and landmark painters (baked once)
  //   load(run, loc): after the run is built; may set run.scen and replace run.spots
  //   update(run, dt, loc): every step, after the fish (state only)
  //   landed(run, loc): when a cast's lure lands, after its boost is worked out
  //   afterLayer(c, id, ox, oy, run, loc): draws over the layer just drawn; ox and oy are
  //     that layer's scroll, so layer pixel (x, y) is at screen (x - ox, y - oy)
  //   reflect(c, run, loc): inside the mirror pass only, after the anomaly deltas
  //   debugLine(run): the module's overlay line
  var NO_SCENERY = {}, scen = NO_SCENERY;

  function bakeLayer(L, i) {
    var w = VIEW_W + Math.ceil((loc.width - VIEW_W) * L.parallax), wy = loc.waterY;
    var rng = new G.core.rng.Rng(loc.seed * 31 + i), paint = (scen.paint && scen.paint[L.kind]) || PAINT[L.kind];
    return {
      id: L.id,
      p: L.parallax,
      cv: B.cached('loc:' + loc.id + ':' + L.id, function () {
        return B.layer(w, wy, function (ctx) { paint(ctx, L, w, wy, rng); });
      })
    };
  }

  // Loads a location from G.data.locations and bakes everything it draws (cached per
  // location): layers, glints and the underwater cross-section, so travel (9.5) does all
  // its baking at once, behind the map's fade, and nothing bakes later on the first cast.
  // The save remembers it as the place to resume (save.loc).
  function load(id) {
    loc = G.data.locations[id];
    if (!loc) throw new Error('unknown location: ' + id);
    G.state.save.loc = id;
    scen = (loc.scenery && G.scene.scenery && G.scene.scenery[loc.scenery]) || NO_SCENERY;
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

    var run = G.state.run, pv = run.passive;
    run.loc = id;
    run.boat = boat.create(loc.start);
    run.dog = dog.create();
    run.cam = { x: 0, y: 0 };
    run.cam.x = camTarget(run);
    run.uw = { alpha: 0 }; // how far the underwater cross-section has faded in
    // One cast at a time. seed is drawn from G.rng on release and is the cast's own seed (§3).
    // latched: clock windows open when the lure landed (D1), cleared when it is reeled in.
    // boost: what the landing spot is worth for this cast (anomaly and spots, 10.1/10.3).
    // tw: seconds the lure has been in the water (the creek's current, 11.1).
    run.cast = { charge: 0, t: 0, x1: 0, dist: 0, seed: 0, n: 0, flying: false, x0: 0, y0: 0, T: 0, h: 0, lx: 0, ly: 0, tw: 0, latched: {},
      boost: { attract: 1, rare: 1, legend: 1 } };
    run.school = G.sim.fish_ai.createSchool(G.data);
    run.school.ctx.floorAt = function (x) { return G.scene.underwater.bottomAt(loc, x); };
    G.scene.underwater.bottomAt(loc, 0); // bakes the cross-section now
    run.lureIn = { active: false, x: 0, y: 0, bait: '' };
    run.uneaseIn = { loc: id, still: true, atShop: false };
    run.bite = G.sim.bite.create();
    run.fight = G.sim.fight.create();
    var cc = G.scene.underwater.createCatch();
    run.hook = cc.hook;
    run.heavy = cc.heavy;
    run.dogIn = { interest: 0, tooHeavyNear: false };
    run.gearFx = G.sim.economy.effects(G.state.save, G.data, {});
    run.anom = G.sim.unease.createAnomalies(); // the one active anomaly (10.1); never saved
    run.anomIn = { loc: id, hour: 0, unease: 0, boatX: 0, reach: 0, width: loc.width };
    run.owl = { on: false, t: 0, x: 0, win: -1 };
    run.spots = loc.spots || []; // where casts are worth more; a scenery module may move them
    run.scen = null;             // the scenery module's own run state
    if (scen.load) scen.load(run, loc);
    // Passive mode (12.2) carries on across travel, with its tape; the next cycle starts here.
    run.passive = pv || { on: false, ps: null, pl: false, t: 0, x: 0, tape: null, cycles: 0, note: '', noteT: 0 };
    run.passive.ps = null; run.passive.pl = false;
    G.gfx.water.setDeltas(drawDeltas);
    fx.clear();
  }

  // The lure is fishing (fish can spawn, notice and bite) only in these states.
  var FISHING = { sinking: 1, waiting: 1, interest: 1 };

  var rodMaxOverride = 0; // debug only (dbg.rod): 0 uses the rod's own limit

  function fishStep(run, dt) {
    var save = G.state.save, c = run.cast, li = run.lureIn, ctx = run.school.ctx, gx = run.gearFx;
    li.active = FISHING[run.fsm] === 1;
    li.x = c.x1;
    li.y = c.ly - loc.waterY;
    li.bait = c.bait || gx.bait;
    ctx.loc = loc.id;
    ctx.depthM = li.y * 0.25;
    ctx.hour = save.clock;
    ctx.unease = G.sim.unease.get(save, loc.id);
    ctx.bait = li.bait;
    ctx.latched = c.latched;
    ctx.rodMaxMass = rodMaxOverride || gx.maxMass;
    ctx.attract = gx.attract * c.boost.attract;
    ctx.rareBoost = gx.rareBoost * c.boost.rare;
    ctx.legendBoost = c.boost.legend;
    ctx.maxDepthPx = loc.maxDepth;
    G.sim.fish_ai.stepSchool(run.school, li, dt, G.rng, G.data);
    var n = G.sim.fish_ai.interested(run.school);
    if (run.fsm === 'waiting' && n > 0) G.core.state.go(run, 'interest');
    else if (run.fsm === 'interest' && n === 0) G.core.state.go(run, 'waiting');
  }

  // ---- Cast ------------------------------------------------------------------------

  // World x where a cast at this charge lands. The marker and the release both use this.
  function landingX(b, charge) {
    var maxD = G.state.run.gearFx.castMax; // the rod sets how far a full cast reaches
    var dist = CAST.minD + (maxD - CAST.minD) * Math.sqrt(charge);
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
      c.tw = 0;
      G.sim.clock.latch(c.latched, G.state.save.clock, G.data.windows);
      G.sim.unease.castBoost(run.anom, run.spots, c.x1, G.data, c.boost); // casting at a delta or a spot counts now
      c.bait = G.sim.economy.useBait(G.state.save, G.data); // one bait goes on per cast
      if (scen.landed) scen.landed(run, loc);
      G.core.state.go(run, 'sinking');
    }
  }

  // Debug: casts straight away at the given charge. Returns the landing x, or false if not sailing.
  function forceCast(charge) {
    var run = G.state.run;
    if (run.fsm !== 'sailing') return false;
    startCharge(run);
    run.cast.charge = clamp(charge, 0, 1);
    release(run);
    return run.cast.x1;
  }

  // A new cast begins: the last one is out of the water, so nothing of it carries over.
  function startCharge(run) {
    var c = run.cast;
    c.charge = 0;
    c.bait = '';
    G.sim.clock.clearLatch(c.latched);
    c.boost.attract = 1; c.boost.rare = 1; c.boost.legend = 1;
    G.scene.underwater.resetHeavy(run);
    G.core.state.go(run, 'charging');
  }

  function castStep(run, dt) {
    var c = run.cast, inp = G.core.input;
    switch (run.fsm) {
      case 'sailing':
        if (inp.pressed('action') && run.boat.stopped) startCharge(run);
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
        if (run.passive.on && run.passive.pl) { // 12.2: fishing by itself; bent while a fish is on
          var on = passiveFighting(run);
          out[0] = CAST.waitAngle + (on ? 4 : 0); out[1] = on ? 4 + 2 * Math.sin(run.passive.t * 9) : 1;
        } else { out[0] = CAST.restAngle; out[1] = 0; }
        break;
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
    if (fsm === 'sailing' && run.passive.on && run.passive.pl) { drawPassiveLine(ctx, run, wy); return; }
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

  // 12.2: the passive line runs to a float; while a fish is on, the float pulls under and shakes.
  function drawPassiveLine(ctx, run, wy) {
    var pv = run.passive, b = run.boat, on = passiveFighting(run);
    rodPose(run, pose);
    boat.rodTip(b, Math.round(b.x - run.cam.x), wy, pose[0], tip);
    var fxs = pv.x - camPx + (on ? Math.round(Math.sin(pv.t * 31)) : 0), fy = wy - 2 + (on ? 2 : Math.round(Math.sin(b.t * 2)));
    ctx.globalAlpha = 0.6; ctx.fillStyle = P.fog_light;
    line(ctx, tip[0], tip[1], fxs, fy, false);
    ctx.globalAlpha = 1;
    S.draw(ctx, 'float', fxs, fy, 0, false);
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

  // ---- Anomalies and the owl (10.1, 10.2, 10.4) ------------------------------

  function anomalyStep(run, save, dt) {
    var A = run.anom, ai = run.anomIn, U = G.sim.unease;
    ai.loc = loc.id; ai.hour = save.clock; ai.unease = U.get(save, loc.id);
    ai.boatX = run.boat.x; ai.reach = run.gearFx.castMax;
    var r = U.anomalyStep(A, ai, dt, G.rng, G.data);
    if (r === U.STARTED) anomalyStarted(run, save);
    else if (r === U.ENDED) {
      var a = G.data.anomalies.list[A.idx];
      if (a.effect === 'revealHint') {
        var h = U.lateHint(save, loc.id, G.data, true);
        if (G.core.debug) G.core.debug.log('revealHint: ' + (h ? h.id + ' ' + h.ref : 'nothing left to write'));
      }
    }
  }

  function anomalyStarted(run, save) {
    var A = run.anom;
    save.flags.anomalies[A.id] = (save.flags.anomalies[A.id] || 0) + 1;
    if (G.core.debug) G.core.debug.log('anomaly ' + A.id + ' at x ' + Math.round(A.x) + ' for ' + A.dur.toFixed(1) + ' s');
  }

  // Debug: starts anomaly id now (refused while one is active: at most one at a time).
  function forceAnomaly(id) {
    var run = G.state.run, list = G.data.anomalies.list, U = G.sim.unease;
    if (run.anom.on) return false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      run.anomIn.boatX = run.boat.x; run.anomIn.reach = run.gearFx.castMax;
      U.startAnomaly(run.anom, i, run.anomIn, G.rng, G.data);
      anomalyStarted(run, G.state.save);
      return true;
    }
    return false;
  }

  function anomalyAlpha(A) { return A.on ? Math.max(0, Math.min(1, A.t / ANOM_FADE, (A.dur - A.t) / ANOM_FADE)) : 0; }

  // The water's delta slot (P10.2): runs only inside the mirror pass.
  function drawDeltas(c) {
    var run = G.state.run, A = run.anom;
    if (A && A.on) G.gfx.water.drawDelta(c, A.what, Math.round(A.x - camPx), loc.waterY - camPy, anomalyAlpha(A));
    if (scen.reflect) scen.reflect(c, run, loc);
  }

  // The boat in the reflection has no fisher while the empty_boat anomaly is mostly shown.
  function mirrorFisher() { var A = G.state.run.anom; return !(A.on && A.what === 'empty_boat' && anomalyAlpha(A) > 0.5); }

  // 10.4: when the clock passes a window's cue, an owl calls from a snag on the shore in
  // view, and the dog looks up. TODO(P13.3): the owl cry sound.
  function owlStep(run, save, hour0, dt) {
    var o = run.owl, k = G.sim.clock.cueCrossed(hour0, save.clock, G.data.windows);
    if (k >= 0) {
      o.on = true; o.t = 0; o.win = k;
      o.x = clamp(run.cam.x + 250, 20, loc.width - 20);
      if (G.core.debug) G.core.debug.log('the owl calls (' + G.data.windows[k].id + ')');
    }
    if (!o.on) return;
    var before = o.t;
    o.t += dt;
    if (before < OWL.cry && o.t >= OWL.cry) dog.setPose(run.dog, 'alert', 2);
    if (o.t >= OWL.show) o.on = false;
  }

  function drawOwl(c) {
    var o = G.state.run.owl;
    if (!o || !o.on) return;
    var sx = Math.round(o.x - camPx), wy = loc.waterY - camPy, a = Math.max(0, Math.min(1, o.t / OWL.fade, (OWL.show - o.t) / OWL.fade));
    c.globalAlpha = a;
    c.fillStyle = P.wood_dark;
    c.fillRect(sx, wy - 22, 1, 22); c.fillRect(sx - 4, wy - 15, 4, 1); c.fillRect(sx + 1, wy - 19, 3, 1);
    S.draw(c, 'owl', sx - 2, wy - 29, o.t >= OWL.cry ? 1 : 0, false);
    var u = (o.t - OWL.cry) / OWL.ring;
    if (u > 0 && u < 1) {
      // The call, as two soft rings spreading from the owl.
      c.fillStyle = P.fog_light;
      for (var ring = 0; ring < 2; ring++) {
        var rr = (u - ring * 0.25) * 30;
        if (rr <= 2) continue;
        c.globalAlpha = a * (1 - u) * 0.6;
        for (var q = 0; q < 16; q++) {
          var ang = q / 16 * 6.283;
          c.fillRect(Math.round(sx + Math.cos(ang) * rr), Math.round(wy - 26 + Math.sin(ang) * rr * 0.6), 1, 1);
        }
      }
    }
    c.globalAlpha = 1;
  }

  // ---- Passive mode (12.2, V7) --------------------------------------------------
  // TAB turns it on from any state. A lure in the water is reeled in; a fish already on the
  // line is fought by the auto-player and sold, then the cycles start. Each cycle is
  // sim/passive.js plan (decided as it starts, from the boat's spot), run in real time while
  // the scene's own clock and unease go on, then apply: the same cycles time away uses.
  // TAB, a move or the action key turns it off (never blocking input), and the tape of
  // what it caught opens.
  var PASSIVE = { reach: 60, card: 1.2 }; // px from the boat where the float sits; s the card shows

  function passiveOn(run) {
    var pv = run.passive, fsm = run.fsm, c = run.cast;
    pv.on = true; pv.pl = false; pv.t = 0; pv.cycles = 0; pv.note = ''; pv.noteT = 0;
    if (fsm === 'charging') G.core.state.go(run, 'sailing');
    else if (fsm === 'casting' || fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest') {
      if (fsm === 'casting') G.core.state.go(run, 'sinking');
      fx.splash(c.x1, loc.waterY, 0.15);
      G.core.state.go(run, 'sailing'); // reeled in: the fish drift off, the next cast starts clean
    }
    if (G.core.debug) G.core.debug.log('passive on (from ' + fsm + ')');
  }

  // show: open the tape of this stretch (when it fished at least once).
  function passiveOff(run, show) {
    var pv = run.passive, tape = pv.tape;
    pv.on = false; pv.pl = false; pv.tape = null;
    if (tape && tape.secs > 0) {
      G.sim.passive.finish(tape, G.state.save, G.rng, G.data);
      G.core.save.autosave('passive');
      if (show) { G.ui.tape.show(tape); G.ui.menu.open('tape'); }
    }
    if (G.core.debug) G.core.debug.log('passive off');
  }

  function setPassive(on) {
    var run = G.state.run;
    if (!!on === run.passive.on) return run.passive.on;
    if (on) passiveOn(run); else passiveOff(run, true);
    return run.passive.on;
  }

  // Cycles run only while the boat is between casts; a fight it took over finishes first.
  function passiveStep(run, dt) {
    var pv = run.passive, PS = G.sim.passive, save = G.state.save;
    if (pv.noteT > 0) pv.noteT -= dt;
    if (!pv.on || run.fsm !== 'sailing') return;
    if (!pv.ps) pv.ps = PS.create(save, loc.id, G.data);
    if (!pv.tape) pv.tape = PS.newTape(save, loc.id, 'live');
    if (!pv.pl) {
      pv.x = clamp(Math.round(run.boat.x + run.boat.facing * PASSIVE.reach), 8, loc.width - 8);
      G.sim.unease.castBoost(run.anom, run.spots, pv.x, G.data, pv.ps.boost); // where it fishes counts
      PS.plan(pv.ps, G.rng, G.data);
      pv.pl = true; pv.t = 0;
      fx.splash(pv.x, loc.waterY, 0.2);
      return;
    }
    pv.t += dt;
    var pl = pv.ps.plan;
    if (pv.t < pl.total) return;
    var r = PS.apply(pv.ps, G.data);
    PS.record(pv.tape, pv.ps, G.rng, G.data);
    pv.cycles++; pv.pl = false; pv.noteT = 4;
    if (r === PS.CAUGHT) {
      pv.note = '+' + pl.coins + 'c ' + G.data.fish[pl.sp].name;
      fx.splash(pv.x, loc.waterY, 0.5);
      G.core.save.autosave('catch');
    } else pv.note = r === PS.LOST ? 'It got away.' : 'Nothing bit.';
  }

  // True while a passive cycle's fish is on (the float pulls under, the rod bends).
  function passiveFighting(run) {
    var pv = run.passive;
    return pv.on && pv.pl && pv.ps.plan.result !== G.sim.passive.EMPTY && pv.t >= pv.ps.plan.wait;
  }

  // ---- Scene -------------------------------------------------------------------

  // Resumes at the saved location; coming back from the shop or cabin keeps the run as it was.
  function enter() {
    var at = G.state.save.loc;
    if (!G.state.run.boat) load(G.data.locations[at] ? at : 'fog');
  }

  function exit() {}

  function update(dt) {
    var run = G.state.run, b = run.boat, save = G.state.save, inp = G.core.input, pv = run.passive;
    // 12.2: TAB toggles passive in every state; moving or the action key also ends it, and
    // that key does nothing else this step.
    var toggled = inp.pressed('passive') || (pv.on && (inp.move() !== 0 || inp.pressed('action')));
    if (toggled) { if (pv.on) passiveOff(run, true); else passiveOn(run); }
    G.sim.economy.effects(save, G.data, run.gearFx);
    var hour0 = save.clock;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    run.uneaseIn.loc = loc.id;
    run.uneaseIn.still = b.stopped;
    G.sim.unease.step(save, run.uneaseIn, dt, G.rng, G.data);
    anomalyStep(run, save, dt);
    owlStep(run, save, hour0, dt);
    if (!toggled && !pv.on) castStep(run, dt); // a fight passive took over goes on in catchStep
    fishStep(run, dt);
    passiveStep(run, dt);
    if (scen.update) scen.update(run, dt, loc);
    G.scene.underwater.catchStep(run, dt, loc);
    if (run.fsm === 'card') {
      var choice = pv.on ? (run.fsmT >= PASSIVE.card ? 'sell' : null) : G.ui.card.update(dt); // passive sells
      if (choice) { G.ui.card.commit(choice, save); G.core.state.go(run, 'sailing'); }
    }
    var move = run.fsm === 'sailing' && !pv.on && !toggled ? inp.move() : 0;
    boat.step(b, move, dt, loc.width);
    // 7.6: the dog reads interest and the heavy-fish flag only while the lure is fishing.
    var fishing = FISHING[run.fsm] === 1;
    run.dogIn.interest = fishing ? G.sim.fish_ai.interestLevel(run.school) : (run.fsm === 'fighting' || passiveFighting(run) ? 0.5 : 0);
    run.dogIn.tooHeavyNear = fishing && run.school.ctx.tooHeavyNear;
    if (run.dogIn.tooHeavyNear) save.flags.heavy[loc.id] = true; // the journal's margin note (D4)
    var cue = dog.cues(run.dog, save, loc, b.x, G.data);
    if (cue && G.core.debug) G.core.debug.log('the dog ' + (run.dog.pose === 'stare' ? 'stares at' : 'barks toward') + ' ' + cue);
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
    var wy = loc.waterY, run = G.state.run;
    c.drawImage(skyCv, 0, 0, 1, wy, 0, -camPy, VIEW_W, wy);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], ox = Math.round(camPx * L.p);
      c.drawImage(L.cv, ox, 0, VIEW_W, wy, 0, -camPy, VIEW_W, wy);
      if (scen.afterLayer) scen.afterLayer(c, L.id, ox, camPy, run, loc);
    }
    drawOwl(c);
  }

  function drawDog(c, x, y, flip) { dog.draw(c, G.state.run.dog, x, y, flip); }

  function drawBoat(c, fisher) {
    var run = G.state.run;
    rodPose(run, pose);
    boat.draw(c, run.boat, Math.round(run.boat.x - run.cam.x), loc.waterY - camPy, fisher !== false, drawDog, pose[0], pose[1]);
  }

  // The mirror pass (gfx/water.js): the scene above the waterline, mirrored.
  function drawAbove(c) { drawBackdrop(c); drawBoat(c, mirrorFisher()); }

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
    load: load, tp: tp, enter: enter, exit: exit, setPassive: setPassive, update: update, draw: draw, forceAnomaly: forceAnomaly, anomalyAlpha: anomalyAlpha,
    CAST: CAST, landingX: landingX, forceCast: forceCast,
    setRodMax: function (kg) { rodMaxOverride = kg || 0; return kg; }, // debug: 0 restores the rod's own limit
    skyColor: skyColor, hourNow: hourNow,
    loc: function () { return loc; },
    scenery: function () { return scen === NO_SCENERY ? null : scen; },
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
  var s = G.state.save, g = s.gear, fx = G.state.run.gearFx;
  if (!fx) return 'gear: -';
  return 'coins ' + s.coins + '  rod ' + g.rod + ' reel ' + g.reel + ' line ' + g.line + '  bait ' + fx.bait +
    (fx.bait !== 'worm' ? ' x' + (s.baits[fx.bait] || 0) : '') + (g.lantern ? '  lantern' : '') + (g.depthFinder ? '  finder' : '') +
    '  open ' + Object.keys(s.unlocks).join(',') + '  caught ' + Object.keys(s.journal).length;
});

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, A = run.anom, b = run.cast && run.cast.boost;
  if (!A) return 'anomaly: -';
  return 'anomaly ' + (A.on ? A.id + ' x ' + Math.round(A.x) + ' ' + A.t.toFixed(1) + '/' + A.dur.toFixed(1) + 's' : 'none' + (A.gap > 0 ? ' (gap ' + A.gap.toFixed(0) + 's)' : '')) +
    '  cast boost a' + b.attract.toFixed(2) + ' r' + b.rare.toFixed(2) + ' l' + b.legend.toFixed(2) +
    (run.owl.on ? '  owl ' + run.owl.t.toFixed(1) + 's' : '') + '  dog cue ' + (run.dog.cue || '-');
});

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, loc = G.scene.sailing.loc(), m = G.scene.sailing.scenery(), c = run.cast;
  if (!loc) return 'scenery: -';
  var drift = loc.drift && G.scene.underwater.UNDER[run.fsm] ? '  current ' + loc.drift(c.seed, c.tw, c.ly - loc.waterY, false).toFixed(2) + ' px/s at ' + c.tw.toFixed(1) + ' s' : '';
  return 'scenery ' + (loc.scenery || 'none') + (m && m.debugLine ? '  ' + m.debugLine(run) : '') + drift;
});

if (G.core.debug) G.core.debug.addLine(function () {
  var pv = G.state.run.passive;
  if (!pv) return 'passive: -';
  var pl = pv.ps && pv.ps.plan;
  return 'passive ' + (pv.on ? 'on' : 'off') + (pv.on && pv.pl ? '  cycle ' + pv.t.toFixed(1) + '/' + pl.total.toFixed(1) + 's (wait ' + pl.wait.toFixed(1) + ') ' +
    (pl.sp >= 0 ? G.data.fish[pl.sp].id + ' ' + ['empty', 'caught', 'lost'][pl.result] : 'nothing') : '') +
    '  cycles ' + pv.cycles + (pv.tape ? '  tape ' + pv.tape.entries.length + ' lines +' + pv.tape.coins + 'c' : '') + '  tapes saved ' + G.state.save.tapes.length;
});

if (G.core.debug) G.core.debug.addLine(function () {
  var c = G.state.run.cast;
  if (!c) return 'cast: none';
  return 'cast #' + c.n + '  charge ' + c.charge.toFixed(2) + '  -> x ' + c.x1 + ' (dist ' + c.dist + ')  seed ' + c.seed +
    (c.flying ? '  lure ' + c.lx.toFixed(1) + ',' + c.ly.toFixed(1) : '');
});
