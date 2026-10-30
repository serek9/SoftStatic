var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Sailing (V3.1, V6): location loading and baking, parallax with a smoothed camera,
// the clock-driven dusk sky, mirror water, wake and the boat with the dog.
G.scene = G.scene || {};
G.scene.sailing = (function () {
  var VIEW_W = 320, VIEW_H = 180;
  // Phase 18: the scene still works in world pixels (the sim's units, 320×180 on screen),
  // drawn through the view's ×2 transform; but everything it draws is baked at HI times that
  // resolution and drawn at 1/HI size, and anything drawn live is drawn in half pixels, so
  // the picture is in the 640×360 view's own pixels. The camera moves in half pixels too.
  var HI = 2;
  var S = G.gfx.sprites, B = G.gfx.bake, P = S.PALETTE;
  var boat = G.scene.boat, dog = G.scene.dog, fx = G.gfx.fx;

  var CAM = { k: 4, look: 0.5, lookMax: 40 }; // smoothing 1/s, look-ahead s, max look-ahead px
  var SKY_BANDS = 40; // Phase 18: flat bands, 5–6 px each at 640×360 (Phase 15 had 28, dithered)

  var loc = null, layers = [], glint = null;
  var boundsByLoc = {};          // loc id -> landmark id -> [x0, x1] as painted
  var skyCv = null, skyKey = -1, skyLum = 0;
  var skyOut = [0, 0, 0];
  var camPx = 0, camPy = 0;      // rounded camera for this frame's drawing
  var wakeDist = 0, rippleT = 0, churnT = 0;

  // Casting (V3.2). Distance follows sqrt(charge), so a short hold still reaches mid-range.
  var CAST = {
    chargeTime: 1.0, // s from empty to full; a full charge simply holds
    minD: 20,        // px beyond the rod reach at zero charge (full charge: the rod's castMax)
    reach: 12,       // px from the boat centre to where the cast distance starts
    flick: 0.12,     // s the rod takes to whip forward before the lure leaves
    flickAngle: 20, restAngle: 50, waitAngle: 40, backAngle: 70
  };
  var tip = [0, 0], pose = [0, 0, 0];

  // ---- Life (audit P2-1, P2-2) --------------------------------------------------------
  // Fish rising: every few seconds a ring above a fish swimming shallower than 4 m, so the
  // surface hints where fish are. Bats cross the night sky; fireflies blink along the creek's
  // bank. Passive mode lifts its catch out of the water. Timing is G.vrng or a hash of time.
  var riseT = 3, RISE_DEPTH = 16;

  // Audit P3-1: a drizzle that comes with unease. From unease 0.45 (full at 0.8), in about
  // one game hour in four (a hash of the hour and the place), fading in and out at the
  // hour's edges. Streaks fall, rings open on the water and the reflection softens. Never in
  // the Red Room. Presentation only: it reads unease and the clock.
  var rainAcc = 0;
  function rainK() {
    if (sky.opt && sky.opt.clouds === false) return 0;
    var save = G.state.save, c = save.clock || 0, hr = Math.floor(c), f = c - hr;
    var k = clamp((G.sim.unease.get(save, loc.id) - 0.45) / 0.35, 0, 1);
    if (k <= 0 || (S.hash(loc.seed, hr) & 3) !== 0) return 0;
    return k * Math.min(1, f * 4, (1 - f) * 4);
  }
  var RAIN_N = 60;
  function drawRain(c) {
    var k = rainK();
    if (k <= 0) return;
    var t = G.state.run.boat.t, wy = loc.waterY - camPy, n = Math.round(RAIN_N * k);
    c.fillStyle = P.fog_mid; c.globalAlpha = 0.4;
    for (var i = 0; i < n; i++) {
      var y = ((S.hash(i, 22) % 200) + t * 110) % (wy + 12) - 6;
      var x = (S.hash(i, 21) % 340) - 10 - Math.round(y * 0.15);
      c.fillRect(x, Math.round(y * HI) / HI, 0.5, 2);
    }
    c.globalAlpha = 1;
  }
  var plift = { t: -1, sp: -1, x0: 0 }, PLIFT = 0.9;
  // Small things painted in the view's pixels (Phase 18): the lure, the passive line's float
  // (12.2), the bat's two wing beats.
  var TINY = {
    lure: [6, 6, function (c) { A.blob(c, 3, 3, 2.5, 1.6, ['rust_dark', 'rust_hi', 'flame'], { bias: 0.1 }); A.px(c, 'bone', 4, 2); A.px(c, 'ink', 5, 3); A.px(c, 'stone_hi', 1, 5); A.px(c, 'stone_hi', 2, 5); }],
    float: [4, 8, function (c) { A.box(c, 'stone_hi', 1, 0, 1, 1); A.blob(c, 2, 3, 1.6, 2, ['blood', 'neon_red'], { bias: 0.2 }); A.blob(c, 2, 5.5, 1.6, 1.5, ['paper', 'bone'], { bias: 0.1 }); A.box(c, 'ink', 1, 7, 2, 1); }],
    bat0: [12, 6, function (c) { A.box(c, 'night_ink', 5, 2, 2, 3); A.line(c, 'night_ink', 5, 2, 0, 0); A.line(c, 'night_ink', 6, 2, 11, 0); A.line(c, 'night_ink', 4, 3, 1, 1); A.line(c, 'night_ink', 7, 3, 10, 1); }],
    bat1: [12, 6, function (c) { A.box(c, 'night_ink', 5, 1, 2, 3); A.line(c, 'night_ink', 5, 2, 0, 4); A.line(c, 'night_ink', 6, 2, 11, 4); A.line(c, 'night_ink', 4, 2, 1, 3); A.line(c, 'night_ink', 7, 2, 10, 3); }]
  };
  var tinyCv = {};
  function tinyArt(k) { return tinyCv[k] || (tinyCv[k] = B.layer(TINY[k][0], TINY[k][1], function (c) { A.reset(); TINY[k][2](c); A.reset(); })); }
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
  // Phase 18: layers are baked at HI (2) times the world's resolution, and every painter
  // below works in those layer pixels (the data's lengths are scaled by scaleL).

  var A = G.gfx.paint, WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi'], RUSTY = ['rust_dark', 'rust', 'rust_hi'];
  var STONES = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'];

  // Features on a ridge, in its colour (key) with a lit side (lit): the fire tower and a mast.
  var FEATURES = {
    tower: function (ctx, x, top, key, lit) {
      var legH = 26, y0 = top - legH, i;
      for (i = 0; i < legH; i++) { A.px(ctx, key, x - 9 + (i >> 3), top - i); A.px(ctx, key, x + 9 - (i >> 3), top - i); }
      for (i = 0; i < 3; i++) { var yy = top - 8 - i * 8; A.line(ctx, key, x - 8 + i, yy, x + 8 - i, yy - 7); A.line(ctx, key, x + 8 - i, yy, x - 8 + i, yy - 7); A.box(ctx, key, x - 8 + i, yy, 17 - i * 2, 1); }
      A.box(ctx, key, x - 12, y0 - 14, 25, 14);
      A.box(ctx, lit, x - 12, y0 - 14, 4, 14);
      A.box(ctx, 'night_ink', x - 6, y0 - 11, 14, 6); A.box(ctx, key, x + 1, y0 - 11, 1, 6);
      for (i = 0; i < 6; i++) A.box(ctx, key, x - 13 + i, y0 - 15 - i, 27 - i * 2, 1);
      A.box(ctx, key, x, y0 - 22, 1, 2);
    },
    mast: function (ctx, x, top, key, lit) {
      A.box(ctx, key, x, top - 68, 2, 68); A.box(ctx, lit, x, top - 68, 1, 68);
      for (var i = 0; i < 9; i++) { A.box(ctx, key, x - 3, top - 64 + i * 7, 8, 1); }
      for (i = 1; i < 22; i++) { A.px(ctx, key, x - i, top - 60 + i * 3); A.px(ctx, key, x + 1 + i, top - 60 + i * 3); }
      A.box(ctx, 'blood', x, top - 70, 2, 2);
    }
  };

  // Landmarks stand on the water at the boat's distance; each paints in layer pixels around
  // x and returns its extent [x0, x1] in layer pixels.
  var LANDMARKS = {
    // The pier: posts braced in X, a deck of planks with gaps and missing boards, a rail,
    // and a lamp post at the end with a rusted head.
    pier: function (ctx, x, wy, rng) {
      var x0 = x - 68, x1 = x + 68, deck = wy - 14, px, q;
      for (px = x0 + 4; px <= x1 - 6; px += 16) {
        A.slab(ctx, px, deck + 4, 5, wy - deck - 3, WOOD);
        if (px + 16 <= x1 - 6) for (q = 0; q < 9; q++) { A.px(ctx, 'wood_dark', px + 5 + q, deck + 5 + q * 0.5 | 0); A.px(ctx, 'wood_dark', px + 15 - q, deck + 5 + q * 0.5 | 0); }
      }
      A.box(ctx, 'wood_deep', x0, deck + 3, x1 - x0 + 1, 2);
      for (px = x0; px <= x1; px += 7) {
        if (rng.next() < 0.1) continue;                                 // a missing plank
        var k = rng.next() < 0.3 ? 'wood_hi' : 'wood_mid';
        A.box(ctx, k, px, deck, 6, 3); A.box(ctx, 'wood_lit', px, deck, 6, 1); A.box(ctx, 'wood', px + 5, deck + 1, 1, 2);
      }
      for (px = x0 + 8; px <= x1 - 16; px += 24) if (rng.next() > 0.25) { A.slab(ctx, px, deck - 12, 3, 12, WOOD); }
      A.box(ctx, 'wood_mid', x0 + 8, deck - 11, 48, 2); A.box(ctx, 'wood_hi', x0 + 8, deck - 11, 48, 1);
      A.slab(ctx, x1 - 7, deck - 38, 3, 38, STONES);
      A.box(ctx, 'stone', x1 - 15, deck - 38, 10, 2);
      A.slab(ctx, x1 - 18, deck - 37, 7, 5, RUSTY); A.box(ctx, 'fog_dark', x1 - 17, deck - 33, 5, 2);
      return [x0, x1];
    },
    // A rusted channel buoy: a float at the waterline, a lattice cage, a dead lamp, a bell.
    marker: function (ctx, x, wy, rng) {
      var y, i;
      A.blob(ctx, x, wy - 4, 12, 6, RUSTY, { bias: 0.05 });
      for (y = 0; y < 30; y++) {
        var hw = Math.round(9 - y * 0.18);
        A.px(ctx, 'rust', x - hw, wy - 9 - y); A.px(ctx, 'rust_hi', x - hw + 1, wy - 9 - y); A.px(ctx, 'rust_dark', x + hw, wy - 9 - y);
        if (y % 8 === 0) A.box(ctx, 'rust_dark', x - hw, wy - 9 - y, hw * 2 + 1, 1);
        if (y % 8 === 4) { A.line(ctx, 'rust_dark', x - hw, wy - 9 - y + 4, x + hw, wy - 9 - y - 4); }
      }
      A.slab(ctx, x - 5, wy - 42, 11, 4, RUSTY);
      A.slab(ctx, x - 3, wy - 49, 7, 7, STONES); A.box(ctx, 'fog_dark', x - 2, wy - 47, 5, 3);
      A.blob(ctx, x, wy - 22, 3, 3, ['rust_dark', 'rust'], { bias: -0.1 });
      for (i = 0; i < 6; i++) A.box(ctx, 'rust_dark', x - 6 + rng.int(0, 12), wy - rng.int(12, 34), 1, rng.int(2, 5)); // rust streaks
      return [x - 12, x + 12];
    },
    // A sunk boat: the bow up out of the water, ribs showing, planks lit along the top.
    wreck: function (ctx, x, wy) {
      var x0 = x - 28, i, top;
      for (i = 0; i < 56; i++) {
        top = wy - 2 - Math.round(Math.max(0, i - 10) * 0.55);
        for (var y = top; y < wy; y++) {
          var d = y - top, k = d < 2 ? 'wood_hi' : (d < 4 ? 'wood_mid' : ((d >> 2) % 2 ? 'wood_dark' : 'wood'));
          A.px(ctx, k, x0 + i, y);
        }
        if (i >= 14 && i % 8 === 6) { A.slab(ctx, x0 + i, top - 9, 2, 9, WOOD); A.px(ctx, 'wood_deep', x0 + i, top - 10); }
      }
      A.slab(ctx, x0 + 44, wy - 28, 4, 4, RUSTY);
      return [x0, x0 + 55];
    },
    // 11.1: a decaying cabin on stilts at the water's edge; its roof sags by lm.sag (world px).
    cabin: function (ctx, x, wy, rng, lm) {
      var x0 = x - 32, x1 = x + 32, floor = wy - 12, top = floor - 32, sag = (lm.sag || 1) * 2, i, r;
      for (i = x0 + 2; i <= x1 - 4; i += 12) A.slab(ctx, i, floor, 4, wy - floor, WOOD);
      A.box(ctx, 'wood_deep', x0, top, x1 - x0 + 1, floor - top);
      for (i = top + 1; i < floor; i += 5) for (var bx = x0; bx <= x1; bx += 9) if (rng.next() > 0.14) { A.box(ctx, 'wood', bx, i, 8, 4); A.box(ctx, 'wood_mid', bx, i, 8, 1); A.box(ctx, 'wood_dark', bx + 7, i, 1, 4); }
      A.box(ctx, 'night_ink', x0 + 9, top + 8, 12, 10); A.box(ctx, 'wood_dark', x0 + 14, top + 8, 2, 10); A.box(ctx, 'wood_dark', x0 + 9, top + 12, 12, 2);
      A.box(ctx, 'night_ink', x1 - 20, top + 9, 12, floor - top - 9); A.slab(ctx, x1 - 20, top + 9, 4, floor - top - 9, WOOD);
      var peak = top - 20 + sag;
      for (r = peak; r < top + 2; r++) {
        var hw = Math.round(38 * (r - peak + 1) / (top + 2 - peak));
        for (var xx = -hw; xx <= hw; xx++) A.px(ctx, (r - peak) % 4 === 3 ? 'rust_dark' : (xx < 0 ? 'rust' : 'rust_dark'), x + xx, r);
      }
      for (i = 0; i < 6; i++) A.box(ctx, 'night_ink', x + rng.int(-20, 20), rng.int(peak + 6, top - 2), 2, 2); // holes
      A.slab(ctx, x + 16, peak - 4, 4, 14, RUSTY);
      return [x - 38, x + 38];
    },
    // 11.1: dead branches standing out of the water. They carry on down to the bottom in the
    // cross-section (underwater.snags).
    snag: function (ctx, x, wy, rng) {
      var lean = rng.next() < 0.5 ? -1 : 1, h = rng.int(28, 44), lo = x, hi = x + 3, px, i, k;
      for (i = 0; i < h; i++) {
        px = x + Math.round(lean * i * 0.45);
        var wdt = i < h * 0.4 ? 4 : (i < h * 0.75 ? 3 : 2);
        A.box(ctx, 'wood_dark', px, wy - 1 - i, wdt, 1); A.px(ctx, 'wood', px, wy - 1 - i);
        lo = Math.min(lo, px); hi = Math.max(hi, px + wdt);
        if (i === Math.floor(h / 3) || i === Math.floor(h * 2 / 3)) {
          var len = rng.int(8, 14);
          for (k = 1; k <= len; k++) { A.px(ctx, 'wood_dark', px - lean * k, wy - 1 - i - k); A.px(ctx, 'wood_dark', px - lean * k, wy - i - k); }
          lo = Math.min(lo, px - len); hi = Math.max(hi, px + len);
        }
      }
      A.blob(ctx, x + 1, wy - 1, 7, 2, ['ink', 'stone_dark', 'stone'], { rim: 0 });
      return [lo, hi];
    }
  };

  var PAINT = {
    // Phase 15: the painted layers (js/gfx/paint.js). Mountains carry the ridge's features.
    mountains: function (ctx, L, w, wy, rng) {
      var tops = A.mountains(ctx, L, w, wy, rng);
      for (var i = 0; i < (L.features || []).length; i++) { var f = L.features[i]; FEATURES[f.kind](ctx, f.x, tops[f.x], L.featureKey || L.color, L.lit); }
    },
    forest: function (ctx, L, w, wy, rng) { return A.forest(ctx, L, w, wy, rng); },
    bank: function (ctx, L, w, wy, rng) { return A.shore(ctx, L, w, wy, rng); },
    // Fog (Phase 18): three soft bands, one inside the other, each with a slowly wandering top
    // and bottom edge, filled flat at its own alpha, so the fog reads as banks of mist.
    fog: function (ctx, L, w, wy, rng) {
      var a = Math.min(1, L.alpha * FOG_HEAD), mid = L.y + L.h / 2;
      ctx.fillStyle = P[L.color];
      for (var b = 0; b < 3; b++) {
        var half = L.h / 2 * (1 - b * 0.3), p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28), f1 = rng.range(0.004, 0.009), f2 = rng.range(0.013, 0.025);
        ctx.globalAlpha = a * 0.4;
        for (var x = 0; x < w; x += 2) {
          var wob = Math.sin(x * f1 + p1) * half * 0.35 + Math.sin(x * f2 + p2) * half * 0.15, gap = Math.sin(x * f1 * 0.7 + p2) > 0.75 - b * 0.2;
          if (gap && b > 0) continue;
          var t0 = Math.round(mid - half + wob), t1 = Math.round(mid + half * 0.8 + wob * 0.5);
          ctx.fillRect(x, t0, 2, Math.max(1, t1 - t0));
        }
      }
      ctx.globalAlpha = 1;
      A.reset();
    },
    // 11.1: the creek's near forest: straight trunks with lit edges and bark, broken
    // branches, and (audit P2-5) the canopy as a ragged edge of leaf clumps along the top of
    // the view, so no crown floats loose in the sky.
    trunks: function (ctx, L, w, wy, rng) {
      var cx, edge = 4, leaf = [L.crownDark || 'night_ink', L.crown, L.crownLit || 'moss'];
      for (cx = 0; cx < w; cx++) {
        edge = clamp(edge + rng.int(-1, 1), 4, L.top);
        A.box(ctx, leaf[0], cx, 0, 1, edge);
      }
      for (var c = 0; c < w / 9; c++) A.blob(ctx, rng.int(0, w), rng.int(2, L.top), rng.int(5, 12), rng.int(4, 8), leaf, { rim: 0 });
      for (var x = rng.int(0, 40); x < w; x += rng.int(L.gap[0], L.gap[1])) {
        var tw = rng.int(5, 9), b, k;
        A.area(ctx, x, 0, tw, wy, function (xx, yy) {
          var u = xx - x;
          if (u === 0) return L.color === 'night_ink' ? 'pine_dark' : L.color;
          return (yy + u * 7) % 23 === 0 ? 'pine_mid' : L.color;
        });
        for (b = 0; b < 3; b++) {
          var by = rng.int(L.top + 10, wy - 40), len = rng.int(6, 16), dir = rng.next() < 0.5 ? -1 : 1;
          for (k = 0; k < len; k++) { A.px(ctx, L.color, dir < 0 ? x - 1 - k : x + tw + k, by - (k >> 1)); A.px(ctx, L.color, dir < 0 ? x - 1 - k : x + tw + k, by - (k >> 1) + 1); }
        }
      }
    },
    // A landmark with its own seed paints the same wherever it stands (the same pier in two
    // lakes, 11.4). Its extent is kept in world pixels (underwater.js and the debug use it).
    landmarks: function (ctx, L, w, wy, rng) {
      var b = boundsByLoc[loc.id] = {};
      for (var i = 0; i < loc.landmarks.length; i++) {
        var lm = loc.landmarks[i], paint = (scen.landmarks && scen.landmarks[lm.kind]) || LANDMARKS[lm.kind];
        var e = paint(ctx, lm.x * HI, wy, lm.seed ? new G.core.rng.Rng(lm.seed) : rng, lm);
        b[lm.id] = [Math.floor(e[0] / HI), Math.ceil(e[1] / HI)];
      }
    }
  };

  // The data's lengths in layer pixels (Phase 18): a copy of L with them scaled by HI.
  var LENGTHS = ['base', 'amp', 'height', 'y', 'h', 'top', 'reedH', 'rockEvery', 'hem'];
  function scaleL(L) {
    var o = {}, k, i;
    for (k in L) o[k] = L[k];
    for (i = 0; i < LENGTHS.length; i++) if (typeof L[LENGTHS[i]] === 'number') o[LENGTHS[i]] = L[LENGTHS[i]] * HI;
    if (L.gap) o.gap = [L.gap[0] * HI, L.gap[1] * HI];
    if (L.panel) o.panel = [L.panel[0] * HI, L.panel[1] * HI];
    if (L.features) o.features = L.features.map(function (f) { var g = {}; for (var q in f) g[q] = f[q]; g.x = f.x * HI; return g; });
    return o;
  }

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
  // Phase 49: what each layer's painter says it painted (kinds of tree, the shore's things),
  // by the layer's cache key; kept like boundsByLoc, since a cached layer is not painted again.
  var paintedKinds = {}, bakeMs = {};

  function bakeLayer(L, i) {
    var w = (VIEW_W + Math.ceil((loc.width - VIEW_W) * L.parallax)) * HI, wy = loc.waterY * HI;
    // Phase 49: a layer with its own placement seed (L.place) scatters its things from it.
    var rng = new G.core.rng.Rng(L.place || loc.seed * 31 + i), paint = (scen.paint && scen.paint[L.kind]) || PAINT[L.kind];
    var key = 'loc:' + loc.id + ':' + L.id, fog = L.kind === 'fog', cv = B.cached(key, function () {
      var t0 = performance.now();
      var c = B.layer(w, wy, function (ctx) { A.reset(); var k = paint(ctx, scaleL(L), w, wy, rng); if (k && k.length) paintedKinds[key] = k; A.reset(); });
      bakeMs[key] = performance.now() - t0;
      return c;
    });
    // Phase 15: the light of the hour. Each painted layer is also baked graded for night
    // (cooler and darker) and for the grey hours (flatter), and drawn over itself by the
    // night and grey shares; lights drawn after a layer (neon, lamps) are not graded.
    function graded(tag, k, a) {
      return B.cached(key + ':' + tag, function () {
        return B.layer(w, wy, function (ctx) {
          ctx.drawImage(cv, 0, 0);
          ctx.globalCompositeOperation = 'source-atop';
          ctx.globalAlpha = a; ctx.fillStyle = P[k]; ctx.fillRect(0, 0, w, wy);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        });
      });
    }
    var grade = !fog && loc.grade !== false;
    return {
      id: L.id,
      p: L.parallax,
      fog: fog, w: w, drift: L.drift || 0,
      cv: cv,
      night: grade ? graded('night', 'night_deep', 0.55) : null,
      grey: grade ? graded('grey', 'fog_dark', 0.35) : null
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
      return B.layer(loc.width * HI, 1, function (ctx, w) {
        ctx.fillStyle = P.water_hi;
        for (var x = rng.int(0, 20); x < w; x += rng.int(10, 36)) ctx.fillRect(x, 0, rng.int(2, 8), 1);
      });
    });
    if (!skyCv) skyCv = B.canvas(VIEW_W * HI, VIEW_H * HI);
    skyKey = -1;
    bakeSky();
    bakeMist();

    var run = G.state.run, pv = run.passive;
    run.loc = id;
    run.boat = boat.create(loc.start);
    run.dog = dog.create();
    run.fisher = G.scene.fisher.create(); // Phase 33: his hands, the holder, the idle director
    run.cam = { x: 0, y: 0 };
    run.cam.x = camTarget(run);
    run.uw = { alpha: 0 }; // how far the underwater cross-section has faded in
    // One cast at a time. seed is drawn from G.rng on release and is the cast's own seed (§3).
    // latched: clock windows open when the lure landed (D1), cleared when it is reeled in.
    // boost: what the landing spot is worth for this cast (anomaly and spots, 10.1/10.3).
    // tw: seconds the lure has been in the water (the creek's current, 11.1).
    run.cast = { charge: 0, t: 0, x1: 0, dist: 0, seed: 0, n: 0, flying: false, x0: 0, y0: 0, T: 0, h: 0, lx: 0, ly: 0, tw: 0, latched: {}, spotsIn: 0,
      boost: { attract: 1, rare: 1, legend: 1 } };
    run.school = G.sim.fish_ai.createSchool(G.data);
    run.school.ctx.floorAt = function (x) { return G.scene.underwater.bottomAt(loc, x); };
    // Phase 28: the current carries the fish as it carries the lure (the same pure function).
    run.school.ctx.flowAt = loc.drift ? function (x, depth) { return G.scene.underwater.flow(loc, depth); } : null;
    G.scene.underwater.bottomAt(loc, 0); // bakes the cross-section now
    run.lureIn = { active: false, x: 0, y: 0, bait: '', lure: false };
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
    run.owl = { on: false, t: 0, x: 0, win: -1, perched: false };
    run.spots = loc.spots || []; // where casts are worth more; a scenery module may move them
    run.scen = null;             // the scenery module's own run state
    if (scen.load) scen.load(run, loc);
    // Passive mode (12.2) carries on across travel, with its tape; the next cycle starts here.
    run.passive = pv || { on: false, ps: null, pl: false, t: 0, x: 0, tape: null, cycles: 0, note: '', noteT: 0 };
    run.passive.ps = null; run.passive.pl = false;
    G.gfx.water.setDeltas(drawDeltas);
    G.gfx.surface.setup(loc); // Phase 20: a calm surface with this water's swell
    fx.clear();
  }

  // The lure is fishing (fish can spawn, notice and bite) only in these states.
  var FISHING = { sinking: 1, waiting: 1, interest: 1 };

  var rodMaxOverride = 0; // debug only (dbg.rod): 0 uses the rod's own limit
  var lastRodMax = -1;

  function fishStep(run, dt) {
    var save = G.state.save, c = run.cast, li = run.lureIn, ctx = run.school.ctx, gx = run.gearFx;
    li.active = FISHING[run.fsm] === 1;
    li.x = c.x1;
    li.y = c.ly - loc.waterY;
    li.bait = c.bait || gx.bait;
    li.lure = G.sim.economy.isLure(li.bait, G.data); // Phase 43
    ctx.loc = loc.id;
    ctx.depthM = li.y * 0.25;
    if (li.lure && gx.swim === 'top') ctx.depthM = Math.max(ctx.depthM, gx.topDepthM); // Phase 43: fish rise to a surface lure
    ctx.hour = save.clock;
    ctx.unease = G.sim.unease.get(save, loc.id);
    ctx.bait = li.bait; ctx.lure = li.lure;
    ctx.smallBoost = gx.smallBoost; ctx.smallMass = gx.smallMass; // Phase 43: the ultralight rod
    ctx.latched = c.latched;
    ctx.rodMaxMass = rodMaxOverride || gx.maxMass;
    // 8.4 #5: after a rod change the too-heavy flag is worked out again at once (it used to
    // wait for the next spawn). speciesWeights is pure and draws nothing from the RNG.
    if (ctx.rodMaxMass !== lastRodMax) { lastRodMax = ctx.rodMaxMass; G.sim.fish_ai.speciesWeights(ctx); }
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
      boat.rodTip(run.boat, run.boat.x, wy, tip); // the bent tip as the flick ends (Phase 31)
      c.x0 = tip[0]; c.y0 = tip[1];
      if (dg.on) { c.x0 = tip[0] + dg.ox; c.y0 = tip[1] + dg.oy; } // Phase 34: from where the lure hangs
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
      c.spotsIn = 0;
      for (var si = 0; si < run.spots.length && si < 31; si++) if (Math.abs(c.x1 - run.spots[si].x) <= run.spots[si].r) c.spotsIn |= 1 << si;
      c.bait = G.sim.economy.useBait(G.state.save, G.data); // one bait goes on per cast
      if (scen.landed) scen.landed(run, loc);
      G.core.state.go(run, 'sinking');
    }
  }

  // Phase 22 (22.5): a lure the current carries into a spot gains that spot's boost, as if it
  // had landed there (10.3), once per spot per cast; what it had where it landed stays until
  // it is reeled in. c.spotsIn has a bit for each spot already counted.
  function driftIntoSpots(run) {
    var c = run.cast, sp = run.spots;
    for (var i = 0; i < sp.length && i < 31; i++) {
      var s = sp[i];
      if ((c.spotsIn & (1 << i)) || Math.abs(c.x1 - s.x) > s.r) continue;
      c.spotsIn |= 1 << i;
      if (s.attract) c.boost.attract *= s.attract;
      if (s.rare) c.boost.rare *= s.rare;
      if (s.legend) c.boost.legend *= s.legend;
      if (G.core.debug) G.core.debug.log('the lure drifted into ' + s.id);
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
        driftIntoSpots(run);
        break;
    }
  }

  // Phase 31: the rod's pose for the current state, written into out: [0] the angle the hands
  // hold (degrees up from the facing), [1] the load on the tip (0..1 of the rod's rating) and
  // [2] where it pulls: ROD_LINE along the line, ROD_DOWN straight down (the lure hanging from
  // the tip). G.gfx.rod bends the blank from these (rodStep); Phase 32: the cast's load is the
  // swing itself, the inertia of the blank and the lure, so its stroke is eased: it gathers
  // speed and stops short, the stop firing the rod.
  var ROD_LINE = 0, ROD_DOWN = 1;
  function rodPose(run, out) {
    var c = run.cast, back = CAST.restAngle + CAST.backAngle * Math.sqrt(c.charge), u;
    out[2] = ROD_LINE;
    switch (run.fsm) {
      case 'charging':
        out[0] = back; out[1] = 0.04 + 0.12 * Math.sqrt(c.charge); out[2] = ROD_DOWN;
        break;
      case 'casting':
        if (c.t < CAST.flick) { // the stroke: the lure still hangs at the tip
          u = c.t / CAST.flick;
          out[0] = back + (CAST.flickAngle - back) * u * u * (2 - u); out[1] = 0.05; out[2] = ROD_DOWN;
        } else {                // the lure flies, the line peels off toward it; the rod comes up to wait
          u = Math.min(1, (c.t - CAST.flick) / 0.3);
          out[0] = CAST.flickAngle + (CAST.waitAngle - CAST.flickAngle) * (1 - Math.cos(Math.PI * u)) / 2; out[1] = 0.06;
        }
        break;
      case 'sailing':
        if (run.passive.on && run.passive.pl) { // 12.2: fishing by itself; bent while a fish is on
          var on = passiveFighting(run);
          out[0] = CAST.waitAngle + (on ? 4 : 0); out[1] = on ? 0.45 + 0.15 * Math.sin(run.passive.t * 9) : 0.03;
        } else { out[0] = CAST.restAngle; out[1] = 0.02; out[2] = ROD_DOWN; }
        break;
      case 'card':
        out[0] = CAST.restAngle; out[1] = 0.02; out[2] = ROD_DOWN;
        break;
      case 'hooked':
      case 'fighting':
        // The rod held high and the blank taking the fish: the load is the line's tension, a
        // little more while the fish runs (rodStep scales it by how straight the line is).
        var F = run.fight;
        out[0] = CAST.waitAngle + 18 - 8 * F.T;
        out[1] = 0.12 + 0.85 * F.T + (F.mode === 'pull' ? 0.08 : 0);
        if (run.fsm === 'hooked') { // the hook-set: a sweep of the rod up and back, and a surge of load (P1-4)
          u = Math.min(1, run.hook.t / 0.3);
          out[0] += 10 * Math.sin(Math.PI * u); out[1] += 0.5 * (1 - u);
        }
        out[1] *= G.gfx.rod.fishLoad(run.hook.w, run.gearFx.maxMass); // Phase 44: a small fish on a stiff rod
        // Phase 23's head shakes knock the tip: impulses on the rod (ropeStep, 32.1).
        break;
      case 'landing':
        out[0] = 70; out[1] = 0.55 * G.gfx.rod.fishLoad(run.hook.w, run.gearFx.maxMass); // the fish's weight hangs from the tip as it is lifted
        break;
      default:
        out[0] = CAST.waitAngle; out[1] = 0.02 + 0.07 * Math.max(0, tickT) / TICK; // the line's own weight; a nibble ticks the tip
        // Bite cue (7.1, P1-4): the fish mouths the bait in tugs, sharp in and slower out, 2.6 a
        // second, and pulls harder as it takes it. The hands keep still: the tip does the nodding.
        if (run.bite.slot >= 0) {
          u = (run.bite.t * 2.6) % 1;
          out[1] = 0.1 + Math.min(0.15, run.bite.t * 0.2) + 0.3 * (u < 0.08 ? u / 0.08 : Math.exp(-(u - 0.08) * 7));
        }
    }
    if (run.fisher && run.fisher.angle !== null) out[0] = run.fisher.angle; // Phase 33: in the holder, or raised in an act
    return out;
  }

  // Phase 31: bends the rod for this step, before the rope reads its tip. The line pulls the
  // tip toward its third point (last step's), or straight down while the lure hangs from it.
  // A pull reaches the rod only through a tight line: the load from the state is scaled by
  // how straight the line hangs, its sag against the line out (SAG_K px plus SAG_R of the span
  // for half the load), never under the line's weight.
  var ROD_K = 3, SAG_K = 1, SAG_R = 0.05, TICK = 0.12, tickT = 0;
  var REEL_TURNS = 10, SHAKE_KICK = 5; // handle turns a second per unit of reel speed; a head shake's kick (rad/s at the tip)
  function rodStep(run, dt) {
    var b = run.boat, st = rope.st, dx = 0, dy = 1, load;
    tickT -= dt;
    rodPose(run, pose);
    load = pose[1];
    if (pose[2] === ROD_LINE && st.mode !== rope.OFF) {
      dx = rope.x[ROD_K] - rope.x[0]; dy = rope.y[ROD_K] - rope.y[0];
      if (dx * dx + dy * dy < 0.25) { dx = 0; dy = 1; }
      if (load > 0.05) { var q = st.sagMax / (SAG_K + SAG_R * st.span); load = Math.max(0.02, load / (1 + q * q)); }
    } else if (pose[2] === ROD_DOWN && dg.on) {
      // Phase 34: the hanging lure pulls the tip its way; held, the line runs to his hand, and
      // tugging the knot pulls the tip down.
      dx = dg.ox; dy = dg.oy;
      if (dx * dx + dy * dy < 0.25) { dx = 0; dy = 1; }
      if (run.fisher.tug) load += 0.18; // a nod: a stronger pull along the upright rod buckles it
    }
    var fsm = run.fsm, R = G.gfx.rod;
    R.solve(pose[0] + b.show, load, dx, dy, b.facing, run.gearFx.rodAction || 0, dt, fsm === 'charging' || fsm === 'casting',
      fsm === 'charging' || (fsm === 'casting' && run.cast.t < CAST.flick) || pose[2] === ROD_DOWN);
    // The reel (32.4): the handle turns while line comes in, faster on a faster reel and slower
    // against tension; not while the drag gives line. The bail is open from the charge until
    // the lure stops sinking (or reeling closes it).
    var held = G.core.input.held('action'), turns = 0, F = run.fight;
    if (fsm === 'fighting') { if (G.scene.underwater.fightReel() && !F.slipped) turns = REEL_TURNS * run.gearFx.reelSpeed * (1 - 0.5 * F.T); }
    else if ((fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest') && held && run.bite.slot < 0) turns = REEL_TURNS * run.gearFx.reelSpeed;
    else if (passiveFighting(run)) turns = 0.5 * REEL_TURNS * run.gearFx.reelSpeed;
    else if (run.fisher.reel > 0) turns = run.fisher.reel;                         // Phase 34: reeling the lure up
    R.reel(dt, turns, (fsm === 'charging' || fsm === 'casting' || fsm === 'sinking' || run.fisher.bail) && turns === 0);
  }

  // ---- The lure between casts (Phase 34) ----------------------------------------
  // With no line out the lure hangs from the rod tip on DG.len px of line: a pendulum whose
  // pivot is the tip, swung by the tip's own acceleration (the rod's swing, the boat's starts
  // and stops), damped. An act can pay line out or reel it in (fisher.line) and take the lure
  // in hand (fisher.held): then it is where his near hand is, and when he lets go it swings
  // from there. ox, oy: the lure's offset from the tip (world px), what the draw and the cast read.
  var DG = { len: 3, g: 40, damp: 1.4, out: 14, reelIn: 10, aMax: 3000, aK: 0.4 }; // aK: the share of the tip's acceleration the lure feels (the boat's arcade starts would flip it)
  var dg = { on: false, th: 0, om: 0, len: 3, ox: 0, oy: 3, tx: 0, ty: 0, vx: 0, vy: 0, init: false };
  var dgTip = [0, 0];
  function dangleStep(run, dt) {
    var fsm = run.fsm, fs = run.fisher, b = run.boat;
    var on = !run.passive.on && rope.st.mode === rope.OFF && (fsm === 'sailing' || fsm === 'charging' || fsm === 'card');
    if (fsm === 'casting' && !run.cast.flying) on = true;
    boat.rodTip(b, b.x, loc.waterY, dgTip);
    if (!on) { dg.on = false; dg.init = false; return; }
    if (!dg.init) { dg.th = 0; dg.om = 0; dg.len = DG.len; dg.tx = dgTip[0]; dg.ty = dgTip[1]; dg.vx = 0; dg.vy = 0; dg.init = true; }
    var vx = (dgTip[0] - dg.tx) / dt, vy = (dgTip[1] - dg.ty) / dt;
    var ax = DG.aK * Math.max(-DG.aMax, Math.min(DG.aMax, (vx - dg.vx) / dt)), ay = DG.aK * Math.max(-DG.aMax, Math.min(DG.aMax, (vy - dg.vy) / dt));
    dg.tx = dgTip[0]; dg.ty = dgTip[1]; dg.vx = vx; dg.vy = vy;
    dg.on = true;
    if (fs.held) {
      // In his hand: the line runs straight from the tip to it.
      var f = b.facing;
      var hx = b.x + f * fs.nx - f * b.lean, hy = loc.waterY + boat.bob(b) + fs.ny + boat.shear(b, -1);
      dg.ox = hx - dgTip[0]; dg.oy = hy - dgTip[1];
      dg.len = Math.max(1, Math.sqrt(dg.ox * dg.ox + dg.oy * dg.oy));
      dg.th = Math.atan2(dg.ox, dg.oy); dg.om = 0;
      return;
    }
    var want = fs.line !== null ? fs.line : (fs.act ? dg.len : DG.len), l0 = dg.len;
    if (dg.len < want) dg.len = Math.min(want, dg.len + DG.out * dt);
    else if (dg.len > want) dg.len = Math.max(want, dg.len - DG.reelIn * dt);
    var dl = (dg.len - l0) / dt;
    // θ from straight down, toward +x; y is down. The pivot's acceleration swings it.
    dg.om += dt * ((-(DG.g + ay) * Math.sin(dg.th) - ax * Math.cos(dg.th)) / dg.len - 2 * dl * dg.om / dg.len - DG.damp * dg.om);
    dg.th += dt * dg.om;
    dg.ox = Math.sin(dg.th) * dg.len; dg.oy = Math.cos(dg.th) * dg.len;
  }

  function drawDangle(ctx) {
    var run = G.state.run, b = run.boat;
    if (!dg.on || run.fsm === 'casting') return; // the stroke's line and lure are drawCast's
    boat.rodTip(b, Math.round(b.x - run.cam.x), loc.waterY - camPy, dgTip);
    var lx = dgTip[0] + dg.ox, ly = dgTip[1] + dg.oy;
    ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.6;
    lineN = 0; line(ctx, dgTip[0], dgTip[1], lx, ly, false);
    ctx.globalAlpha = 1;
    G.scene.underwater.drawLure(ctx, run.gearFx.bait, lx, ly + 0.5);
  }

  // A line in the view's pixels between world points (dotted: every other pixel pair). The
  // dotting runs on across calls (lineN), so a polyline of short segments dots evenly.
  var lineN = 0;
  function line(ctx, x0, y0, x1, y1, dotted) {
    x0 = Math.round(x0 * HI); y0 = Math.round(y0 * HI); x1 = Math.round(x1 * HI); y1 = Math.round(y1 * HI);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, q = 1 / HI;
    for (;;) {
      if (!dotted || (lineN++ & 3) < 2) ctx.fillRect(x0 * q, y0 * q, q, q);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // ---- The line as a rope (Phase 21) ---------------------------------------------------
  // gfx/rope.js simulates it; this drives it. Point 0 is held at the rod tip and the last at
  // the lure, the float or the fish's mouth, where they are drawn. The rest length is how
  // much line is out: paid out behind the flying lure and as it sinks (slack), taken up when
  // reeling, pulled in tight by a bite, and set by tension in the fight. After a snap or a
  // thrown fish the far end is let go and the line is reeled in loose.
  var rope = G.gfx.rope, ROPE = { reel: 90, loose: 35, looseMax: 4, belly: 1.03, takeUp: 0.9 };
  var lurePt = [0, 0], tipW = [0, 0];
  var ropeFsm = '', ropeLure = false, ropeT = 0, nibT = 0, slipT = 0;

  function surfY(x) { return floatY(x); }
  // Phase 22: the current on the line, the same as on the lure and the weeds (underwater.flow).
  function ropeFlow(x, depth) { return G.scene.underwater.flow(loc, depth); }

  // Where the lure is drawn (world px), the same in update and draw.
  function lurePos(run, out) {
    var c = run.cast, b = run.boat, fsm = run.fsm;
    if (fsm === 'casting') {
      if (c.flying) { out[0] = c.lx; out[1] = c.ly; } else { boat.rodTip(b, b.x, loc.waterY, out); if (dg.on) { out[0] += dg.ox; out[1] += dg.oy; } }
      return out;
    }
    if (fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing') return G.scene.underwater.mouth(loc, 0, 0, out);
    var lx = c.x1, ly = c.ly;
    if (c.ly - loc.waterY < 1.5) ly = Math.min(ly, Math.round(floatY(c.x1) * HI) / HI);  // just in, the lure rides the surface
    if (fsm !== 'sinking') lx += Math.round(Math.sin(b.t * 1.3) * 1.5);                   // the lure sways once it stops
    if (run.bite.slot >= 0) ly += 2 + Math.round(Math.sin(run.bite.t * 18));             // bite cue: the line dips
    else if (G.sim.fish_ai.interestLevel(run.school) >= 0.85) lx += Math.round(Math.sin(b.t * 40)); // nibbles
    out[0] = lx; out[1] = ly;
    return out;
  }

  // The float's place (world px) in passive mode; it rides the surface and a fish pulls it under.
  function floatPos(run, out) {
    var pv = run.passive, on = passiveFighting(run);
    out[0] = pv.x + (on ? Math.round(Math.sin(pv.t * 31)) : 0);
    out[1] = Math.round((floatY(pv.x) - 2 + (on ? 2 : 0)) * HI) / HI + 2; // the float's foot, where the line ties on
    return out;
  }

  function ropeStep(run, dt) {
    var fsm = run.fsm, st = rope.st, b = run.boat, F = run.fight, pv = run.passive;
    var was = ropeFsm;
    ropeFsm = fsm;
    boat.rodTip(b, b.x, loc.waterY, tipW);
    // A snap or a thrown fish: the far end goes, and the line is reeled in loose.
    if (fsm === 'sailing' && was === 'fighting' && st.mode === rope.PINNED) {
      var snap = F.result === G.sim.fight.SNAP;
      rope.loosen(snap ? 120 : 20);
      ropeLure = !snap; ropeT = 0;
    }
    if (st.mode === rope.LOOSE) {
      ropeT += dt;
      rope.anchors(tipW[0], tipW[1], 0, 0);
      rope.setRest(st.rest - ROPE.loose * dt);
      rope.step(dt, surfY);
      if (st.rest <= 2 || ropeT > ROPE.looseMax || fsm === 'charging') rope.off();
      return;
    }
    var passive = fsm === 'sailing' && pv.on && pv.pl;
    if (fsm !== 'casting' && !G.scene.underwater.UNDER[fsm] && !passive) { rope.off(); return; }
    // Until the lure flies it rides the tip, so the line is held there (Phase 32: the tip whips
    // too fast for 48 links to follow, and they trailed in a loop longer than the line out).
    if (st.mode === rope.OFF || (fsm === 'casting' && !run.cast.flying)) rope.reset(tipW[0], tipW[1]);
    if (passive) floatPos(run, lurePt); else lurePos(run, lurePt);
    rope.anchors(tipW[0], tipW[1], lurePt[0], lurePt[1]);
    var dx = lurePt[0] - tipW[0], dy = lurePt[1] - tipW[1], span = Math.sqrt(dx * dx + dy * dy), r = st.rest, k, pull = 0;
    if (passive) r = span * 1.06 + 2;
    else if (fsm === 'casting') r = Math.max(r, span * 1.12 + 1);                    // paying out behind the lure
    else if (fsm === 'sinking') r = Math.max(r, span * 1.06 + 4);                    // the bail is open as it sinks
    else if (fsm === 'waiting' || fsm === 'interest') {
      // A bite takes the slack out over about a third of a second, then holds the line straight.
      if (run.bite.slot >= 0) { r = span + (r - span) * Math.exp(-7 * dt); pull = Math.min(0.3, run.bite.t); }
      else if (G.core.input.held('action')) r = Math.max(span, r - ROPE.reel * dt);  // reeling takes up the slack first
      else {
        // Waiting, the angler takes in the slack the sink left until a light belly remains;
        // a lure that drifts away draws line out.
        var belly = span * ROPE.belly + 1.5;
        r = r > belly ? r - (r - belly) * Math.min(1, ROPE.takeUp * dt) : Math.max(r, span * 1.01);
      }
      nibT -= dt;
      if (run.bite.slot < 0 && G.sim.fish_ai.interestLevel(run.school) >= 0.85 && nibT <= 0) {
        nibT = 0.25 + 0.3 * G.vrng.next();
        rope.twitch(6, (G.vrng.next() - 0.5) * 1.2, 0.8);                             // a nibble twitches the end
        tickT = TICK;                                                                    // and ticks the rod tip
        G.audio.engine.cue('nibble');                                                    // and ticks up the rod (Phase 25)
      }
    } else if (fsm === 'hooked' || fsm === 'landing') { r = span * 0.98; pull = 0.3; }
    else if (fsm === 'fighting') {
      // Tension straightens the line whatever the fish is doing: from T 0.45 it is straight;
      // under it, it sags as tension falls (a tired fish a little more), and a slip slackens it.
      if (F.slipped) slipT = 0.35;
      slipT = Math.max(0, slipT - dt);
      var taut = F.T > 0.45 && slipT <= 0, low = Math.max(0, 0.5 - F.T);
      k = low * 0.14 + (F.mode === 'tired' ? 0.01 : 0);
      if (slipT > 0) k += 0.15;
      // Slack in proportion to the line out, and a little more near the boat, where it is short.
      var target = taut ? span * 0.97 : span * (1 + k) + (F.mode === 'tired' ? 4 * low : 0);
      r += (target - r) * Math.min(1, (target < r ? 10 : 20) * dt);
      if (taut) pull = 0.5 + 0.4 * F.T;
      // Phase 23: a head shake jerks the line near the fish.
      nibT -= dt;
      if (F.shake > 0 && nibT <= 0) {
        nibT = 0.12; k = taut ? 0.3 : 1;
        rope.twitch(10, (G.vrng.next() - 0.5) * 3 * k, (G.vrng.next() - 0.5) * 2 * k); // less on a taut line
        G.gfx.rod.kick(SHAKE_KICK * (0.6 + 0.4 * G.vrng.next()) * G.gfx.rod.fishLoad(run.hook.w, run.gearFx.maxMass)); // and it knocks the rod tip (32.1); a fry's barely (Phase 44)
      }
    }
    rope.setRest(r);
    rope.st.pull = pull;
    rope.st.flow = ropeFlow;
    rope.step(dt, surfY);
  }

  // Marker, line and lure, in screen space.
  function drawCast(ctx) {
    var run = G.state.run, c = run.cast, b = run.boat, wy = loc.waterY - camPy, fsm = run.fsm;
    if (fsm === 'charging') {
      var mx = landingX(b, c.charge) - camPx;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = P.fog_light;
      for (var q = 0; q < 24; q++) { var an = q / 24 * 6.283; ctx.fillRect(Math.round((mx + Math.cos(an) * 4) * HI) / HI, Math.round((wy + 2 + Math.sin(an) * 1.2) * HI) / HI, 0.5, 0.5); }
      ctx.globalAlpha = 1;
      return;
    }
    var st = rope.st;
    if (st.mode === rope.OFF) return;
    boat.rodTip(b, Math.round(b.x - run.cam.x), wy, tip);
    var passive = fsm === 'sailing' && run.passive.on && run.passive.pl, fight = fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing';
    var end = null;
    if (st.mode === rope.PINNED) {
      end = passive ? floatPos(run, lurePt) : lurePos(run, lurePt);
      end[0] -= camPx; end[1] -= camPy;
    }
    var F = run.fight, key = fight ? G.ui.hud.tensionKey(fsm === 'landing' ? 0 : F.T) : 'fog_light';
    var vib = fsm === 'fighting' && F.mode === 'pull' ? (0.4 + 0.9 * F.T) * Math.sin(b.t * 47) : 0; // the taut line hums
    var hum = run.heavy.hum > 0 ? Math.round(Math.sin(b.t * 90)) : 0;
    drawRope(ctx, end, key, fight ? 0.85 : 0.6, vib, hum);
    if (passive) { ctx.drawImage(tinyArt('float'), Math.round(end[0] * HI) / HI - 1, end[1] - 3, 2, 4); return; }
    if (fight) return;
    var lx, ly;
    if (end) { lx = end[0]; ly = end[1]; }
    else if (ropeLure) { lx = rope.x[rope.N - 1] - camPx; ly = rope.y[rope.N - 1] - camPy; }
    else return;
    G.scene.underwater.drawLure(ctx, c.bait || run.gearFx.bait, lx, ly); // Phase 22: the bait's own body
  }

  // The rope as a polyline: solid in the air, dotted and fainter under the surface (R3), a
  // standing wave of vib px when it is pulled taut, and a lit pixel on segments turned to the
  // light. The ends are drawn where the rod tip and the lure are drawn.
  var ropeLight = { x: -1, a: 0 };
  function drawRope(ctx, end, key, alpha, vib, hum) {
    var X = rope.x, Y = rope.y, n = rope.N, px = tip[0], py = tip[1], lit = ropeLight.a > 0.05;
    ctx.fillStyle = P[key];
    lineN = 0;
    for (var i = 1; i < n; i++) {
      var qx = X[i] - camPx, qy = Y[i] - camPy;
      if (i === n - 1 && end) { qx = end[0]; qy = end[1]; }
      var u = i / (n - 1), wave = vib * Math.sin(u * 6.2832);
      if (wave) { var ddx = X[i] - X[i - 1], ddy = Y[i] - Y[i - 1], dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1; qx += -ddy / dl * wave; qy += ddx / dl * wave; }
      var below = (Y[i - 1] + Y[i]) / 2 > floatY((X[i - 1] + X[i]) / 2) + 0.5;
      ctx.globalAlpha = below ? alpha * 0.75 : alpha;
      if (below && hum) { line(ctx, px + hum, py, qx + hum, qy, true); }
      else line(ctx, px, py, qx, qy, below);
      if (lit && !below && (i & 1) && (qx - px) * (ropeLight.x - (px + qx) / 2) * (py - qy) < 0) {
        ctx.globalAlpha = Math.min(1, ropeLight.a * 1.6); ctx.fillStyle = P.bone;
        ctx.fillRect(Math.round((px + qx) * HI / 2) / HI, Math.round((py + qy) * HI / 2) / HI, 1 / HI, 1 / HI);
        ctx.fillStyle = P[key];
      }
      px = qx; py = qy;
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
  // dbg.sail(dir, s) (Phase 41): steer as if A (-1) or D (1) were held for s seconds.
  var sail = { dir: 0, t: 0 };
  function sailMove(dt) {
    if (sail.t <= 0) return 0;
    sail.t -= dt;
    return sail.dir;
  }

  function tp(x) {
    var run = G.state.run, m = boat.P.margin;
    run.boat.x = clamp(x, m, loc.width - m);
    run.boat.vx = 0;
    run.cam.x = camTarget(run);
    return run.boat.x;
  }

  // ---- Sky (§0.8, §0.9; audit P1-1, §8.3 #49) --------------------------------------
  // Permanent dusk, never brighter than dusk_high (S.skySafe throws otherwise). Keyframes give
  // four palette keys from the top of the sky to the horizon (at f = 0, 0.4, 0.75, 1); the
  // hours between blend smoothly. Night is ink and blue with a faint violet horizon, dawn and
  // dusk run through violet, plum and rose, and the grey hours are a flat overcast.
  var SKY_F = [0, 0.4, 0.75, 1];
  var SKY_KEYS = [
    [0, ['night_ink', 'night_deep', 'night_blue', 'dusk_violet']],
    [3, ['night_ink', 'night_ink', 'night_deep', 'night_blue']],
    [5, ['night_ink', 'night_deep', 'night_blue', 'dusk_violet']],
    [6.25, ['night_deep', 'dusk_violet', 'dusk_plum', 'dusk_rose']],
    [7.5, ['night_blue', 'fog_dark', 'fog_mid', 'dusk_rose']],
    [9, ['fog_dark', 'fog_dark', 'fog_mid', 'fog_mid']],
    [12.5, ['fog_dark', 'fog_mid', 'fog_mid', 'fog_light']],
    [16, ['fog_dark', 'fog_dark', 'fog_mid', 'fog_mid']],
    [17.5, ['night_blue', 'dusk_violet', 'dusk_plum', 'dusk_rose']],
    [19, ['night_blue', 'dusk_violet', 'dusk_rose', 'dusk_amber']],
    [20.5, ['night_deep', 'night_blue', 'dusk_violet', 'dusk_plum']],
    [22, ['night_ink', 'night_deep', 'night_blue', 'dusk_violet']],
    [24, ['night_ink', 'night_deep', 'night_blue', 'dusk_violet']]
  ];
  var skyStops = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];

  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mix(c0, c1, t, out) {
    out[0] = c0[0] + (c1[0] - c0[0]) * t; out[1] = c0[1] + (c1[1] - c0[1]) * t; out[2] = c0[2] + (c1[2] - c0[2]) * t;
    return out;
  }

  // How much of each light the hour has, each 0..1 (presentation only).
  function nightF(h) { return h < 12 ? 1 - smooth(4.5, 6.75, h) : smooth(18.5, 21, h); }
  function greyF(h) { return h < 12 ? smooth(6.75, 8.75, h) : 1 - smooth(15.75, 17.5, h); }
  function duskF(h) { return Math.max(0, 1 - Math.abs(h - 6.1) / 1.3, 1 - Math.abs(h - 18.6) / 1.7); }

  // Kept for the debug line and older callers: 0 at 03:00, 1 in the grey hours.
  function skyBrightness(hour) { return 1 - nightF(G.sim.clock.wrap(hour)); }

  // f is 0 at the top of the sky and 1 at the horizon. Writes [r, g, b] into out.
  function skyColor(hour, f, out) {
    var h = G.sim.clock.wrap(hour), k = 0;
    while (k < SKY_KEYS.length - 2 && h >= SKY_KEYS[k + 1][0]) k++;
    var A = SKY_KEYS[k], Z = SKY_KEYS[k + 1], u = smooth(A[0], Z[0], h), i;
    for (i = 0; i < 4; i++) mix(S.RGB[A[1][i]], S.RGB[Z[1][i]], u, skyStops[i]);
    i = 0;
    while (i < 2 && f > SKY_F[i + 1]) i++;
    mix(skyStops[i], skyStops[i + 1], clamp((f - SKY_F[i]) / (SKY_F[i + 1] - SKY_F[i]), 0, 1), out);
    out[0] = Math.round(out[0]); out[1] = Math.round(out[1]); out[2] = Math.round(out[2]);
    return out;
  }

  function hourNow() { return G.sim.clock.wrap(G.state.save.clock || 0); }

  // Rebakes the sky when the hour moves by 0.05 (3 real seconds): SKY_BANDS flat bands
  // (Phase 18: no dithered edges, the bands are fine enough at 640×360).
  var skyRGB = [];
  for (var sb = 0; sb < SKY_BANDS; sb++) skyRGB.push('');
  function refreshSky(hour) {
    var key = Math.floor(hour * 20);
    if (key === skyKey) return;
    skyKey = key;
    var ctx = skyCv.getContext('2d'), wy = loc.waterY * HI, i;
    skyLum = 0;
    for (i = 0; i < SKY_BANDS; i++) {
      skyColor(hour, i / (SKY_BANDS - 1), skyOut);
      var lum = 0.2126 * skyOut[0] + 0.7152 * skyOut[1] + 0.0722 * skyOut[2];
      if (lum > skyLum) skyLum = lum;
      if (!S.skySafe(skyOut[0], skyOut[1], skyOut[2])) throw new Error('sky brighter than ' + S.CEILING_KEY + ' at hour ' + hour);
      skyRGB[i] = 'rgb(' + skyOut[0] + ',' + skyOut[1] + ',' + skyOut[2] + ')';
    }
    for (i = 0; i < SKY_BANDS; i++) {
      var y0 = Math.floor(i * wy / SKY_BANDS), y1 = Math.floor((i + 1) * wy / SKY_BANDS);
      ctx.fillStyle = skyRGB[i];
      ctx.fillRect(0, y0, VIEW_W * HI, y1 - y0);
    }
  }

  // Stars, the moon, a glow where the sun went down and slow cloud bands, baked once per
  // location (each from its own seeded stream) and drawn with the sky. loc.sky can switch
  // parts off (the Red Room is indoors) and place the moon and the glow (sky pixels).
  var SKYP = 0.03, CLOUD_P = 0.08, CLOUD_W = 640, CLOUD_DRIFT = 1.6;
  var sky = { stars: null, twinkle: null, glow: null, clouds: null, halo: null, opt: null };
  S.def('moon', { m: 'fog_light', c: 'fog_mid' }, [
    '..mmm..', '.mmmmm.', 'mmcmmmm', 'mmmmcmm', 'mcmmmmm', '.mmmcm.', '..mmm..'
  ]);

  function bakeSky() {
    var o = sky.opt = loc.sky || {}, wy = loc.waterY * HI, id = loc.id;
    var sw = (VIEW_W + Math.ceil((loc.width - VIEW_W) * SKYP)) * HI;
    // Stars: single pixels, denser high up; a few brighter ones with a small cross.
    function starField(seed, n, crosses) {
      return B.layer(sw, wy, function (ctx) {
        var rng = new G.core.rng.Rng(seed);
        for (var i = 0; i < n; i++) {
          var y = Math.floor(wy * 0.8 * rng.next() * rng.next()), x = rng.int(2, sw - 3), hi = rng.next() < 0.25;
          ctx.fillStyle = P[hi ? 'fog_light' : 'fog_mid'];
          ctx.fillRect(x, y, 1, 1);
          if (i < crosses) { ctx.fillStyle = P.fog_mid; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); ctx.fillStyle = P.fog_light; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
        }
      });
    }
    sky.stars = o.stars === false ? null : B.cached('loc:' + id + ':stars', function () { return starField(loc.seed * 7 + 1, 160, 6); });
    sky.twinkle = o.stars === false ? null : B.cached('loc:' + id + ':twinkle', function () { return starField(loc.seed * 7 + 2, 36, 3); });
    // The glow where the sun went down: stepped rings of dusk_amber (alpha, never brighter).
    sky.glow = o.glow === false ? null : B.cached('sky:glow2', function () {
      return B.layer(400, 92, function (ctx) {
        ctx.fillStyle = P.dusk_amber;
        for (var y = 0; y < 92; y++) for (var x = 0; x < 400; x++) {
          var dx = (x - 200) / 200, dy = (91 - y) / 91, d = Math.sqrt(dx * dx + dy * dy);
          if (d >= 1) continue;
          ctx.globalAlpha = Math.round((1 - d) * 5) / 8;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });
    // The moon's halo: two soft stepped rings.
    sky.halo = B.cached('sky:halo2', function () {
      return B.layer(49, 49, function (ctx) {
        ctx.fillStyle = P.fog_mid;
        for (var y = 0; y < 49; y++) for (var x = 0; x < 49; x++) {
          var d = Math.sqrt((x - 24) * (x - 24) + (y - 24) * (y - 24)) / 24.5;
          if (d < 1) { ctx.globalAlpha = d < 0.55 ? 0.28 : 0.14; ctx.fillRect(x, y, 1, 1); }
        }
      });
    });
    // The moon: a disk lit from the side, with maria and a darker limb.
    sky.moon = B.cached('sky:moon2', function () {
      return B.layer(17, 17, function (ctx) {
        A.reset();
        A.blob(ctx, 8, 8, 7.5, 7.5, ['fog_mid', 'fog_light'], { bias: 0.15, rim: 0.3 });
        A.blob(ctx, 6, 6, 2, 1.5, ['fog_mid'], { rim: 0 }); A.blob(ctx, 10, 10, 1.6, 1.3, ['fog_mid'], { rim: 0 }); A.px(ctx, 'fog_mid', 11, 5);
        A.reset();
      });
    });
    if (o.clouds === false) { sky.clouds = null; return; }
    // Phase 15: one field of clouds (gfx/paint.js cloudMask) baked in four colourings
    // (shadow, body, lit): night, grey, dusk, and the dusk rim light alone.
    var mask = null, CW = CLOUD_W * HI;
    function maskOnce() { return mask || (mask = A.cloudMask(CW, wy, new G.core.rng.Rng(loc.seed * 13 + 5), 9, HI)); }
    var KEYS = [['night_deep', 'night_blue', 'dusk_violet'], ['fog_dark', 'fog_mid', 'fog_light'], ['dusk_violet', 'dusk_plum', 'dusk_rose'], [null, null, 'dusk_amber']];
    sky.clouds = KEYS.map(function (k, ki) {
      return B.cached('loc:' + id + ':cloud' + ki, function () {
        return B.layer(CW, wy, function (ctx) { A.reset(); A.paintMask(ctx, maskOnce(), CW, wy, k); A.reset(); });
      });
    });
  }

  // Draws a HI-res cv (wrapping every w of its px) scrolled by ox world px, at screen y oy
  // (world px), h world px tall.
  function drawWrapped(c, cv, w, ox, oy, h) {
    var vw = VIEW_W * HI, hh = h * HI;
    ox = ((Math.round(ox * HI) % w) + w) % w;
    var first = Math.min(vw, w - ox);
    c.drawImage(cv, ox, 0, first, hh, 0, oy, first / HI, h);
    if (first < vw) c.drawImage(cv, 0, 0, vw - first, hh, first / HI, oy, (vw - first) / HI, h);
  }

  // Where the moon is on screen for this hour (x, y, alpha), written into out. It rises
  // after the dusk, crosses high at about 01:00 and sets before the grey hours.
  var moonPt = [0, 0, 0];
  function moonAt(h, out) {
    var o = sky.opt, up = h >= 19.5 ? h - 19.5 : h + 4.5;  // hours since it rose
    var u = up / 11;                                       // 0 rising .. 1 set (06:30)
    out[2] = o.moon === false || u <= 0 || u >= 1 ? 0 : Math.min(1, u * 8, (1 - u) * 8) * nightF(h);
    out[0] = Math.round(((o.moonX || 92) - camPx * SKYP) * HI) / HI;
    out[1] = Math.round((loc.waterY - 14 - Math.sin(u * Math.PI) * (loc.waterY - 34)) * HI) / HI - camPy;
    return out;
  }

  function drawSky(c) {
    var wy = loc.waterY, h = hourNow(), t = G.state.run.boat.t, n = nightF(h), d = duskF(h), g = greyF(h);
    var sx = Math.round(camPx * SKYP * HI);
    c.drawImage(skyCv, 0, 0, VIEW_W * HI, wy * HI, 0, -camPy, VIEW_W, wy);
    if (sky.glow && d > 0) {
      c.globalAlpha = d * 0.55;
      c.drawImage(sky.glow, Math.round(((sky.opt.glowX || 230) - camPx * SKYP) * HI) / HI - 100, wy - 46 - camPy, 200, 46);
    }
    if (sky.stars && n > 0) {
      c.globalAlpha = n * (1 - 0.6 * g);
      c.drawImage(sky.stars, sx, 0, VIEW_W * HI, wy * HI, 0, -camPy, VIEW_W, wy);
      c.globalAlpha = n * (0.35 + 0.35 * Math.sin(t * 1.3));
      c.drawImage(sky.twinkle, sx, 0, VIEW_W * HI, wy * HI, 0, -camPy, VIEW_W, wy);
    }
    moonAt(h, moonPt);
    if (moonPt[2] > 0) {
      c.globalAlpha = moonPt[2];                           // a faint halo, then the disk
      c.drawImage(sky.halo, moonPt[0] - 12, moonPt[1] - 12, 24.5, 24.5);
      c.drawImage(sky.moon, moonPt[0] - 4, moonPt[1] - 4, 8.5, 8.5);
    }
    if (sky.clouds) {
      var ox = camPx * CLOUD_P + t * CLOUD_DRIFT, cw = [n * 0.8, g * 0.6, d * 0.85, d * 0.55];
      for (var i = 0; i < 4; i++) {
        if (cw[i] <= 0.01) continue;
        c.globalAlpha = Math.min(1, cw[i]);
        drawWrapped(c, sky.clouds[i], CLOUD_W * HI, ox, -camPy, wy);
      }
    }
    c.globalAlpha = 1;
  }

  // ---- Fog and mist (§0.8 "fog thickens in grey hours"; audit P1-2) ----------------------
  // Fog layers are baked FOG_HEAD times as dense as their data alpha and drawn at a share of
  // that: 1.4 / FOG_HEAD at night with no unease, up to 1 in the grey hours at high unease.
  // They drift by their layer's `drift` (px/s), wrapping. loc.mist is a low band on the water
  // drawn over the boat, in the mirror too.
  var FOG_HEAD = 3;
  var mistCv = null;

  function fogMul() {
    var h = hourNow();
    return Math.min(FOG_HEAD, 1.4 + 1.1 * greyF(h) + 0.6 * G.sim.unease.get(G.state.save, loc.id));
  }

  function bakeMist() {
    var m = loc.mist;
    mistCv = !m ? null : B.cached('loc:' + loc.id + ':mist', function () {
      return B.layer(loc.width * HI, loc.waterY * HI, function (ctx) {
        PAINT.fog(ctx, { y: (loc.waterY - m.h + 1) * HI, h: m.h * HI, color: m.color || 'fog_light', alpha: m.alpha }, loc.width * HI, loc.waterY * HI, new G.core.rng.Rng(loc.seed * 31 + 77));
      });
    });
  }

  function drawMist(c) {
    if (!mistCv) return;
    c.globalAlpha = fogMul() / FOG_HEAD;
    drawWrapped(c, mistCv, loc.width * HI, camPx + G.state.run.boat.t * (loc.mist.drift || 0), -camPy, loc.waterY);
    c.globalAlpha = 1;
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
  // view, and the dog looks up. audio/engine.js plays the cry at OWL.cry.
  function owlStep(run, save, hour0, dt) {
    var o = run.owl, k = G.sim.clock.cueCrossed(hour0, save.clock, G.data.windows);
    if (k >= 0) {
      o.on = true; o.t = 0; o.win = k;
      // 8.4 #17: where an owl already sits (the Pines), that owl calls; elsewhere one comes.
      o.perched = !!(run.scen && run.scen.owl);
      o.x = o.perched ? run.scen.owl.x + 6 : clamp(run.cam.x + 250, 20, loc.width - 20);
      if (G.core.debug) G.core.debug.log('the owl calls (' + G.data.windows[k].id + ')');
    }
    if (!o.on) return;
    var before = o.t;
    o.t += dt;
    if (before < OWL.cry && o.t >= OWL.cry) dog.setPose(run.dog, 'alert', 2);
    if (o.t >= OWL.show) o.on = false;
  }

  // 10.4: the owl, painted in the view's pixels: a round grey body, ear tufts, a pale face,
  // the eyes shut or open (amber), a beak, feet on the branch. owl(open) gives its image.
  var owlCv = [null, null];
  function owl(open) {
    var k = open ? 1 : 0;
    return owlCv[k] || (owlCv[k] = B.layer(14, 18, function (c) {
      A.reset();
      A.blob(c, 7, 11, 6, 6.5, ['stone_dark', 'stone', 'stone_hi'], { bias: 0.05 });
      A.blob(c, 7, 6, 5.5, 4.5, ['stone_dark', 'stone', 'stone_hi'], { bias: 0.1 });
      A.px(c, 'stone', 2, 1); A.px(c, 'stone', 3, 2); A.px(c, 'stone', 11, 1); A.px(c, 'stone', 10, 2);
      A.blob(c, 7, 6, 4, 3, ['stone', 'birch'], { rim: 0, bias: 0.2 });
      if (open) { A.box(c, 'signal_amber', 4, 5, 2, 2); A.box(c, 'signal_amber', 8, 5, 2, 2); A.px(c, 'ink', 5, 6); A.px(c, 'ink', 9, 6); }
      else { A.box(c, 'ink', 4, 6, 2, 1); A.box(c, 'ink', 8, 6, 2, 1); }
      A.px(c, 'rust', 7, 8); A.px(c, 'rust_dark', 7, 9);
      for (var y = 11; y < 16; y += 2) { A.px(c, 'stone_dark', 5, y); A.px(c, 'stone_dark', 8, y + 1); }
      A.box(c, 'ink', 4, 17, 2, 1); A.box(c, 'ink', 8, 17, 2, 1);
      A.reset();
    }));
  }

  function drawOwl(c) {
    var o = G.state.run.owl;
    if (!o || !o.on) return;
    var sx = Math.round(o.x - camPx), wy = loc.waterY - camPy, a = Math.max(0, Math.min(1, o.t / OWL.fade, (OWL.show - o.t) / OWL.fade));
    var oy = o.perched ? wy - 31 : wy - 26;
    c.globalAlpha = a;
    if (!o.perched) {
      c.fillStyle = P.wood_dark;
      c.fillRect(sx, wy - 22, 1, 22); c.fillRect(sx - 4, wy - 15, 4, 0.5); c.fillRect(sx + 1, wy - 19, 3, 0.5);
      c.fillStyle = P.wood; c.fillRect(sx, wy - 22, 0.5, 22);
      c.drawImage(owl(o.t >= OWL.cry), sx - 3, wy - 30.5, 7, 9);
    }
    var u = (o.t - OWL.cry) / OWL.ring;
    if (u > 0 && u < 1) {
      // The call, as two soft rings spreading from the owl.
      c.fillStyle = P.fog_light;
      for (var ring = 0; ring < 2; ring++) {
        var rr = (u - ring * 0.25) * 30;
        if (rr <= 2) continue;
        c.globalAlpha = a * (1 - u) * 0.6;
        for (var q = 0; q < 40; q++) {
          var ang = q / 40 * 6.283;
          c.fillRect(Math.round((sx + Math.cos(ang) * rr) * HI) / HI, Math.round((oy + Math.sin(ang) * rr * 0.6) * HI) / HI, 0.5, 0.5);
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
    if (plift.t >= 0) {
      var k0 = Math.floor(plift.t * 12);
      plift.t += dt;
      if (Math.floor(plift.t * 12) !== k0) fx.emit('splash', plift.x0 + (run.boat.x - plift.x0) * plift.t / PLIFT, loc.waterY - Math.sin(plift.t / PLIFT * Math.PI) * 22, 1);
      if (plift.t >= PLIFT) plift.t = -1;
    }
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
      plift.t = 0; plift.sp = pl.sp; plift.x0 = pv.x;
      G.core.save.autosave('catch');
    } else pv.note = r === PS.LOST ? 'It got away.' : 'Nothing bit.';
  }

  function riseStep(run, dt) {
    riseT -= dt;
    if (riseT > 0) return;
    riseT = 2 + G.vrng.next() * 4;
    var fish = run.school.fish, n = fish.length, k0 = Math.floor(G.vrng.next() * Math.max(1, n));
    for (var i = 0; i < n; i++) {
      var f = fish[(k0 + i) % n];
      if (!f.active || f.y > RISE_DEPTH) continue;
      fx.ripple(f.x, loc.waterY + 1, 1, 6, 1.0);
      G.gfx.surface.poke(f.x, 0.3, 1.5);
      if (G.vrng.next() < 0.5) fx.emit('splash', f.x, loc.waterY - 1, 1);
      G.audio.engine.cue('rise', f.x); // Phase 25: a slurp
      return;
    }
  }

  function bats(c, n) {
    if (n < 0.5 || sky.opt.stars === false) return;
    var t = G.state.run.boat.t;
    for (var i = 0; i < 2; i++) {
      var per = 26 + i * 9, k = Math.floor((t + i * 11) / per), u = ((t + i * 11) % per) / per;
      if (u > 0.35 || (S.hash(i + 40, k) & 1)) continue;
      var dir = (k & 1) ? 1 : -1, x = dir > 0 ? -20 + u / 0.35 * 360 : 340 - u / 0.35 * 360;
      var y = 58 + i * 12 + Math.sin(t * 5 + i) * 3 + Math.sin(t * 1.3 + k) * 5; // low, against the paler horizon
      c.globalAlpha = n;
      c.drawImage(tinyArt((Math.floor(t * 10 + i) & 1) ? 'bat1' : 'bat0'), Math.round(x * HI) / HI, Math.round((y - camPy) * HI) / HI, 6, 3);
    }
    c.globalAlpha = 1;
  }

  function fireflies(c, n) {
    var cnt = loc.life && loc.life.fireflies;
    if (!cnt || n < 0.3) return;
    var t = G.state.run.boat.t, wy = loc.waterY - camPy, span = VIEW_W + Math.ceil((loc.width - VIEW_W) * 0.7);
    c.fillStyle = P.lamp_glow;
    for (var i = 0; i < cnt; i++) {
      var a = Math.sin(t * (1.1 + (i & 3) * 0.2) + i * 1.7);
      if (a <= 0.2) continue;
      var x = (S.hash(i, 11) % span) - Math.round(camPx * 0.7) + Math.sin(t * 0.5 + i) * 4;
      if (x < -2 || x > VIEW_W + 2) continue;
      c.globalAlpha = n * a * 0.8;
      c.fillRect(Math.round(x * HI) / HI, Math.round((wy - 4 - (S.hash(i, 12) % 12) + Math.sin(t * 0.8 + i * 2) * 2) * HI) / HI, 0.5, 0.5);
    }
    c.globalAlpha = 1;
  }

  // The passive catch rises from the float to the boat (P2-2).
  function drawLift(c, run) {
    if (plift.t < 0) return;
    var u = plift.t / PLIFT, b = run.boat, tx = b.x + b.facing * 8;
    var x = plift.x0 + (tx - plift.x0) * u, y = loc.waterY - 2 - Math.sin(u * Math.PI) * 22;
    var pic = tx < plift.x0 ? G.gfx.fishgen.portraitFlipped(plift.sp, 30, 14) : G.gfx.fishgen.portrait(plift.sp, 30, 14, false), w = pic.width / HI, h = pic.height / HI;
    c.drawImage(pic, Math.round((x - camPx - w / 2) * HI) / HI, Math.round((y - camPy - h / 2) * HI) / HI, w, h);
  }

  // True while a passive cycle's fish is on (the float pulls under, the rod bends).
  function passiveFighting(run) {
    var pv = run.passive;
    return pv.on && pv.pl && pv.ps.plan.result !== G.sim.passive.EMPTY && pv.t >= pv.ps.plan.wait;
  }

  // ---- The fisher (Phase 33) ---------------------------------------------------
  // The idle director's context: between casts (stopped, no line, not passive, no anomaly) or
  // waiting for a bite with nothing interested; any key held or pressed ends an act. The keys
  // still do what they always do on this step: the director only reads them.
  var KEYS_ANY = ['left', 'right', 'action', 'pause', 'journal', 'map', 'passive', 'up', 'down', 'back', 'still', 'setup'];
  var voiceIn = { on: true, block: false }; // Phase 42
  var fisherIn = { mode: null, input: false, night: false, helm: false, cord: -1, steer: 0 };
  function fisherStep(run, dt) {
    var inp = G.core.input, any = false;
    for (var i = 0; i < KEYS_ANY.length; i++) if (inp.held(KEYS_ANY[i]) || inp.pressed(KEYS_ANY[i])) { any = true; break; }
    var quiet = !run.passive.on && !run.anom.on;
    fisherIn.mode = quiet && run.fsm === 'sailing' && run.boat.stopped ? 'casts' : (quiet && run.fsm === 'waiting' && run.bite.slot < 0 ? 'wait' : null);
    if (G.ui.setup.isOpen()) fisherIn.mode = null; // Phase 45: he waits while you choose
    fisherIn.input = any;
    fisherIn.night = greyF(hourNow()) < 0.5; // Phase 35: a beer at dusk and at night, the thermos in the grey hours
    // Phase 41: under way (or the cord pulled) he stows the rod and takes the tiller; the tiller
    // swings with the turn (the boat's acceleration) and the throttle.
    var b = run.boat;
    fisherIn.helm = run.fsm === 'sailing' && !run.passive.on && (!b.stopped || b.startT >= 0 || (run.move !== 0 && b.motor));
    fisherIn.cord = b.startT >= 0 ? b.startT / boat.M.start : -1;
    fisherIn.steer = Math.max(-1, Math.min(1, b.ax * 0.01 + 0.4 * b.throttle));
    tackleStep(run, any);
    G.scene.fisher.step(run.fisher, dt, fisherIn, G.vrng);
  }

  // ---- The setup panel (Phase 45) ----------------------------------------------
  // S opens it on the boat with the line out of the water (sailing, stopped or under way, not
  // passive). While it is open it has the keys: the boat does not sail and nothing is cast,
  // but the world goes on. When it closes, a new rod or a new hook queues the fisher's short
  // act for it (fisher.js swap, tie, swaptie), played on the first quiet step with the boat
  // stopped; any key, a cast above all, cuts it short as it does every act. Under way the rod
  // lies in the clips and he takes it up when the boat stops, so a rod change needs no act.
  var tackleAct = '';
  function setupStep(run, toggled) {
    var su = G.ui.setup, inp = G.core.input;
    if (su.isOpen()) {
      if (run.fsm !== 'sailing' || run.passive.on) su.close();
      else if (!su.update()) tackleAfter();
      return true;
    }
    if (toggled || !inp.pressed('setup') || run.fsm !== 'sailing' || run.passive.on) return false;
    su.open();
    return true;
  }
  function tackleAfter() {
    var c = G.ui.setup.changes();
    if (c.rod || c.hook) tackleAct = c.rod && c.hook ? 'swaptie' : (c.rod ? 'swap' : 'tie');
  }
  function tackleStep(run, any) {
    if (!tackleAct) return;
    var fs = run.fisher;
    if (run.fsm !== 'sailing' || run.passive.on) tackleAct = '';
    else if (fisherIn.helm || fs.helm) tackleAct = tackleAct === 'swap' ? '' : 'tie';
    else if (fisherIn.mode === 'casts' && !any && !fs.act && !fs.ret) { G.scene.fisher.start(fs, tackleAct); tackleAct = ''; }
  }

  // Phase 45: true when a tap at view pixel (gx, gy) is on the dog and he can be petted now
  // (the boat sitting still between casts, not passive, no panel open). Reads state only.
  function dogTap(gx, gy) {
    var run = G.state.run, b = run && run.boat;
    if (!b || !loc || G.core.state.sceneName() !== 'sailing' || run.fsm !== 'sailing' || run.passive.on || !b.stopped || G.ui.setup.isOpen()) return false;
    if (G.ui.menu.current()) return false;
    var sx = Math.round(b.x - run.cam.x), y = loc.waterY - camPy + boat.bob(b);
    var dx = b.facing < 0 ? sx - 16 : sx + 4, dy = y - 14 + boat.shear(b, 10);
    var wx = gx / HI, wy = gy / HI;
    return wx >= dx - 2 && wx < dx + 14 && wy >= dy - 2 && wy < dy + 12;
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
    var setupOn = setupStep(run, toggled); // Phase 45: before the gear's effects, so a pick counts this step
    G.sim.economy.effects(save, G.data, run.gearFx);
    var hour0 = save.clock;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    run.uneaseIn.loc = loc.id;
    run.uneaseIn.still = b.stopped;
    G.sim.unease.step(save, run.uneaseIn, dt, G.rng, G.data);
    anomalyStep(run, save, dt);
    owlStep(run, save, hour0, dt);
    if (!toggled && !pv.on && !setupOn) castStep(run, dt); // a fight passive took over goes on in catchStep
    // Audit P1-6: the down arrow pets the dog while the boat sits still between casts. Phase 45:
    // ↓ alone or a tap on him; S (down and setup together) opens the setup panel instead.
    if (run.fsm === 'sailing' && !pv.on && b.stopped && !setupOn && inp.pressed('down') && !inp.pressed('setup')) dog.pet(run.dog);
    fishStep(run, dt);
    riseStep(run, dt);
    rainAcc += rainK() * 6 * dt; // rings where the drizzle meets the water
    while (rainAcc >= 1) {
      rainAcc -= 1;
      var rx = run.cam.x + G.vrng.next() * VIEW_W;
      fx.ripple(rx, loc.waterY + 1 + G.vrng.next() * 24, 0, 3, 0.5);
      G.gfx.surface.poke(rx, 0.12, 1); // the same drop dents the waterline (Phase 20)
    }
    passiveStep(run, dt);
    if (scen.update) scen.update(run, dt, loc);
    G.scene.underwater.catchStep(run, dt, loc);
    if (run.fsm === 'card') {
      G.ui.card.tick(dt);
      var choice = pv.on ? (run.fsmT >= PASSIVE.card ? 'sell' : null) : G.ui.card.update(dt); // passive sells
      if (choice) { G.ui.card.commit(choice, save); G.core.state.go(run, 'sailing'); }
    }
    var move = run.fsm === 'sailing' && !pv.on && !toggled && !setupOn ? (inp.move() || sailMove(dt)) : 0;
    run.move = move;
    boat.outboard(b, move, dt); // Phase 26: the motor first; only a running motor pushes the boat
    boat.step(b, move, dt, loc.width);
    var surf = G.gfx.surface; // Phase 24: pitch, heave and the outboard, on the surface under the hull
    boat.motion(b, move, dt, surf.at(boat.bow(b)) / HI, surf.at(boat.stern(b)) / HI);
    if (b.wakeHit) fx.ripple(b.x, loc.waterY + 2, 8, 22, 1.6); // the water lifts the hull: a ring
    G.scene.underwater.swimStep(run, dt); // Phase 27: the swimmers' beat, turns and pitch (the mouth reads them)
    fisherStep(run, dt); // Phase 33: the idle director and the hands, before the rod reads them
    rodStep(run, dt); // Phase 31: the rod bends under the line before the rope reads its tip
    dangleStep(run, dt); // Phase 34: the lure hanging from the tip between casts
    if (run.fisher.cue) {
      var fs = run.fisher;
      if (fs.cue === 'crack') { // Phase 35: a puff of foam from the can in his hand
        var hx = b.x + b.facing * fs.nx - b.facing * b.lean, hy = loc.waterY + boat.bob(b) + fs.ny - 2;
        fx.emit('splash', hx, hy, 3);
      }
      G.audio.engine.cue(fs.cue, b.x); fs.cue = '';
    }
    ropeStep(run, dt); // Phase 21: after everything that moves the rod tip, the lure or the fish
    G.scene.underwater.bodyStep(run, dt, loc); // Phase 22: the lure's heading and flutter
    fx.setFlow(G.scene.underwater.flow(loc, 8)); // bubbles drift with the water
    // 7.6: the dog reads interest and the heavy-fish flag only while the lure is fishing.
    var fishing = FISHING[run.fsm] === 1;
    run.dogIn.interest = fishing ? G.sim.fish_ai.interestLevel(run.school) : (run.fsm === 'fighting' || passiveFighting(run) ? 0.5 : 0);
    run.dogIn.tooHeavyNear = fishing && run.school.ctx.tooHeavyNear;
    run.dogIn.sleep = pv.on && run.fsm === 'sailing' && !passiveFighting(run); // P2-2: the dog naps while it fishes by itself
    if (run.dogIn.tooHeavyNear) save.flags.heavy[loc.id] = true; // the journal's margin note (D4)
    var cue = dog.cues(run.dog, save, loc, b.x, G.data);
    if (cue && G.core.debug) G.core.debug.log('the dog ' + (run.dog.pose === 'stare' ? 'stares at' : 'barks toward') + ' ' + cue);
    dog.step(run.dog, dt, run.dogIn);
    // Phase 42: the dog's voice; quiet while a fish bites or is hooked.
    voiceIn.on = save.settings.dogBark !== false;
    voiceIn.block = run.bite.slot >= 0 || run.fsm === 'hooked';
    if (dog.voice(run.dog, dt, voiceIn, G.vrng)) G.audio.engine.cue('bark', b.x, dog.barkPitch()); // Phase 47: the breed's pitch
    G.ui.hud.update(dt, run);
    camStep(run, dt);
    G.scene.underwater.viewStep(run, dt, loc);

    // Wake: a puff and a small ripple every 6 px travelled; a slow ring while idling.
    var wy = loc.waterY;
    wakeDist += Math.abs(b.vx) * dt;
    var sp = Math.min(1, Math.abs(b.vx) / boat.P.maxV);
    while (wakeDist >= 6) {
      wakeDist -= 6;
      fx.emit('wake', boat.stern(b), wy, 2);
      fx.ripple(boat.stern(b), wy + 2, 2, 9, 1.1);
      // Phase 20: the stern's wash and the bow's push dent the surface, harder with speed.
      G.gfx.surface.poke(boat.stern(b), 0.1 + 0.3 * sp, 3);
      G.gfx.surface.poke(b.x + b.facing * 16, 0.05 + 0.2 * sp, 2);
    }
    // Phase 24: under throttle the propeller churns foam and bubbles under the stern, the bow
    // pushes a little wave, and a hard start puffs exhaust from the motor.
    churnT -= dt;
    if (churnT <= 0 && b.throttle > 0.15) {
      churnT = 0.12 / b.throttle;
      fx.emit('bubbles', boat.stern(b) + b.facing * 2, wy + 3 + G.vrng.next() * 3, 1);
      fx.emit('splash', boat.stern(b), wy, sp > 0.5 ? 1 : 0);
      if (sp > 0.4) fx.emit('wake', boat.bow(b), wy, 1);
    }
    if (b.puff > 0.45) fx.emit('dust', boat.stern(b) + b.facing * 2, wy - 8, 1);
    rippleT += dt;
    if (b.stopped && rippleT >= 1.8) {
      rippleT = 0;
      fx.ripple(b.x, wy + 2, 13, 24, 2.2);
      G.gfx.surface.poke(b.x - b.facing * 12, 0.06, 4); // the idle hull rocking
    }
    // Phase 26: the moving boat makes its wake (the surface's wake layer), every step.
    G.gfx.surface.wake(boat.stern(b), sp * sp, b.vx, dt);
    // The surface's swell roughens in drizzle and in the grey hours' wind.
    G.gfx.surface.step(dt, 1 + 0.6 * rainK() + 0.35 * greyF(hourNow()));
    fx.update(dt);
    G.core.state.tick(run, dt);
  }

  function drawBackdrop(c) {
    var wy = loc.waterY, run = G.state.run, fa = fogMul() / FOG_HEAD, hh = hourNow();
    var lightN = nightF(hh) * 0.9, lightG = greyF(hh) * 0.7;
    drawSky(c);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], oxN = Math.round(camPx * L.p * HI), vw = VIEW_W * HI, wh = wy * HI;
      if (L.p === 1) G.scene.life.drawFar(c, camPx, wy - camPy); // Phase 49: the birds further out than the boat, before the landmarks
      if (L.fog) {
        c.globalAlpha = fa;
        drawWrapped(c, L.cv, L.w, camPx * L.p + run.boat.t * L.drift, -camPy, wy);
        c.globalAlpha = 1;
      } else {
        c.drawImage(L.cv, oxN, 0, vw, wh, 0, -camPy, VIEW_W, wy);
        if (L.night && lightN > 0.02) { c.globalAlpha = lightN; c.drawImage(L.night, oxN, 0, vw, wh, 0, -camPy, VIEW_W, wy); }
        if (L.grey && lightG > 0.02) { c.globalAlpha = lightG; c.drawImage(L.grey, oxN, 0, vw, wh, 0, -camPy, VIEW_W, wy); }
        c.globalAlpha = 1;
      }
      if (scen.afterLayer) scen.afterLayer(c, L.id, oxN / HI, camPy, run, loc);
      G.scene.life.afterLayer(c, L.id, oxN / HI, wy - camPy); // Phase 49: what lives on this layer
    }
    var nf = nightF(hourNow());
    bats(c, nf);
    fireflies(c, nf);
    drawOwl(c);
  }

  function drawDog(c, x, y, flip, wind) { dog.draw(c, G.state.run.dog, x, y, flip, wind); }

  var gearLook = { rod: 0, lantern: false, finder: false, night: 0, fisher: null, lineKey: 'fog_light', lineA: 0.6 };
  function drawBoat(c, fisher) {
    var run = G.state.run, g = G.state.save.gear, fsm = run.fsm;
    gearLook.rod = g.rod || 0; gearLook.lantern = !!g.lantern; gearLook.finder = !!g.depthFinder;
    gearLook.night = 1 - greyF(hourNow());
    gearLook.fisher = run.fisher; // Phase 33: P2-2's thermos is one of his idle acts now
    // Phase 31: the line along the rod in the same colour as the line out (drawCast).
    var fight = fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing';
    gearLook.lineKey = fight ? G.ui.hud.tensionKey(fsm === 'landing' ? 0 : run.fight.T) : 'fog_light';
    gearLook.lineA = fight ? 0.85 : 0.6;
    boat.draw(c, run.boat, Math.round(run.boat.x - run.cam.x), loc.waterY - camPy, fisher !== false, drawDog, gearLook);
  }

  // The mirror pass (gfx/water.js): the scene above the waterline, mirrored.
  function drawAbove(c) { G.scene.life.mirror(true); drawBackdrop(c); G.scene.life.mirror(false); drawBoat(c, mirrorFisher()); drawMist(c); }

  // The waterline between the mirror and the cross-section (Phase 20), one column per view
  // pixel from the surface's heights (gfx/surface.js). The surface sits `lift` px above the
  // line (the swell's height plus a little), so its troughs reach the line and never open a
  // gap; the water between the surface and the line is filled. Per column: a 1 px surface row,
  // foam on crests, on steep slopes and on faces turned to the light, water_hi on faces turned
  // away; a foam cap on crests and a darker meniscus under it; a lit band below that thickens
  // under crests. Under water (under > 0) a fainter second line below the band wavers the
  // other way: the surface's underside reflecting the cross-section back down.
  // i0, i1 (optional) limit it to view columns i0..i1-1, with alpha k: the hull's wash.
  var MIRROR = 34;
  var wlTop = new Int16Array(640), wlCls = new Uint8Array(640), wlBand = new Int16Array(640);
  var LINE_FOAM = 1, LINE_HI = 2, CREST = 4;

  // Draws a vertical span [top, bot) in view rows for each column in i0..i1-1 where pick(i)
  // is true, merging neighbours with the same span into one rect.
  function spans(c, i0, i1, topOf, botOf, pick) {
    var run = -1, rt = 0, rb = 0, q = 1 / HI;
    for (var i = i0; i <= i1; i++) {
      var on = i < i1 && pick(i), tp = on ? topOf(i) : 0, bt = on ? botOf(i) : 0;
      if (run >= 0 && (!on || tp !== rt || bt !== rb)) { c.fillRect(run * q, rt * q, (i - run) * q, (rb - rt) * q); run = -1; }
      if (on && bt > tp && run < 0) { run = i; rt = tp; rb = bt; }
    }
  }

  var wlY0 = 0;
  function topRow(i) { return wlTop[i]; }
  function rowBelowTop(i) { return wlTop[i] + 1; }
  function capTop(i) { return wlTop[i] - 1; }
  function lineY0(i) { return wlY0; }
  function bandTop(i) { return Math.max(wlTop[i] + 1, wlY0); }
  function bandBot(i) { return wlBand[i]; }
  function raised(i) { return wlTop[i] + 1 < wlY0; }
  function isFoam(i) { return (wlCls[i] & LINE_FOAM) !== 0; }
  function isHi(i) { return (wlCls[i] & LINE_HI) !== 0; }
  function isCrest(i) { return (wlCls[i] & CREST) !== 0; }
  function all() { return true; }
  function menBot(i) { return wlTop[i] + 2; }
  function tirTop(i) { return wlBand[i] + 1 + Math.round((wlTop[i] - wlY0) * -0.7); }
  function tirBot(i) { return tirTop(i) + 1; }

  function drawWaterline(c, y, cols, light, under, i0, i1, k) {
    if (y < -4 || y >= VIEW_H) return;
    i0 = i0 || 0; i1 = i1 === undefined ? 640 : i1; k = k === undefined ? 1 : k;
    var surf = G.gfx.surface, L = surf.amp() + 0.6, Y0 = Math.round(y * HI), lx = light.a > 0.05 ? light.x * HI : -1;
    wlY0 = Y0;
    for (var i = i0; i < i1; i++) {
      var d = cols[i + 1], s = cols[i + 2] - cols[i], disp = Math.round(d + L), cls = 0;
      if (disp < 0) disp = 0;
      wlTop[i] = Y0 - disp;
      var crest = d >= cols[i] && d >= cols[i + 2] && d > 0.4 * L;
      var lit = lx >= 0 && (lx - i) * -s > 0 && Math.abs(s) > 0.08;
      if (crest) cls |= CREST;
      cls |= crest || lit || Math.abs(s) > 0.6 || Math.abs(s) < 0.05 ? LINE_FOAM : LINE_HI;
      wlCls[i] = cls;
      wlBand[i] = Y0 + 3 + Math.round(Math.max(0, d) * 0.6);
    }
    c.globalAlpha = k; c.fillStyle = P.water_lit;
    spans(c, i0, i1, rowBelowTop, lineY0, raised);                   // the water raised above the line
    c.globalAlpha = 0.6 * k;
    spans(c, i0, i1, bandTop, bandBot, all);                        // the lit band
    if (under > 0 && k === 1) {
      c.globalAlpha = 0.3 * under; c.fillStyle = P.water_hi;
      spans(c, i0, i1, tirTop, tirBot, all);                        // the underside's reflection
    }
    c.globalAlpha = 0.35 * k; c.fillStyle = P.water_dark;
    spans(c, i0, i1, rowBelowTop, menBot, isCrest);                 // the meniscus
    c.globalAlpha = k; c.fillStyle = P.water_foam;
    spans(c, i0, i1, topRow, rowBelowTop, isFoam);                  // the surface row
    c.globalAlpha = 0.5 * k;
    spans(c, i0, i1, capTop, topRow, isCrest);                      // foam caps on crests
    c.globalAlpha = k; c.fillStyle = P.water_hi;
    spans(c, i0, i1, topRow, rowBelowTop, isHi);
    c.globalAlpha = 1;
  }

  // Phase 20: the pier's posts stand in the water. Each gets a foam collar where the surface
  // meets it and a dark wet band just above, both riding the surface's height there. The
  // posts are where LANDMARKS.pier paints them: every 16 layer px from x - 64, 5 px wide.
  function drawPosts(c, wy) {
    var lms = loc.landmarks, surf = G.gfx.surface;
    for (var j = 0; j < lms.length; j++) {
      if (lms[j].kind !== 'pier' || (scen.landmarks && scen.landmarks.pier)) continue;
      for (var k = 0; k < 8; k++) {
        var px = lms[j].x + (-64 + 16 * k) / HI, sx = px - camPx;
        if (sx < -4 || sx > VIEW_W + 4) continue;
        var sy = Math.round((wy - surf.at(px + 1.25) / HI) * HI) / HI;
        c.globalAlpha = 0.45; c.fillStyle = P.wood_deep; c.fillRect(sx, sy - 1, 2.5, 1);
        c.globalAlpha = 0.7; c.fillStyle = P.water_foam; c.fillRect(sx - 0.5, sy, 3.5, 0.5);
      }
    }
    c.globalAlpha = 1;
  }

  // Phase 20: where something floating sits: the waterline at world x, raised by the surface there.
  function floatY(x) { return loc.waterY - G.gfx.surface.at(x) / HI; }

  var waterLight = { x: 0, a: 0, key: 'fog_mid', w: 4, mirror: 1 };
  function lightOnWater(h) {
    var d = duskF(h) * (sky.glow ? 1 : 0), m = moonPt[2];
    waterLight.mirror = 1 - 0.35 * rainK(); // drizzle softens the reflection
    if (m * 0.55 >= d * 0.45) {
      waterLight.x = moonPt[0]; waterLight.a = m * 0.55; waterLight.key = 'fog_mid'; waterLight.w = 3;
    } else {
      waterLight.x = Math.round((sky.opt.glowX || 230) - camPx * SKYP); waterLight.a = d * 0.45; waterLight.key = 'dusk_rose'; waterLight.w = 7;
    }
    return waterLight;
  }

  function draw(ctx) {
    var run = G.state.run, wy = loc.waterY;
    refreshSky(hourNow());
    camPx = Math.round(run.cam.x * HI) / HI;
    camPy = Math.round(run.cam.y * HI) / HI;
    var a = run.uw.alpha, band = Math.round((loc.mirror || MIRROR) * (1 - a));
    var cols = G.gfx.surface.fill(camPx), wl = lightOnWater(hourNow());
    ropeLight.x = wl.x; ropeLight.a = wl.a;
    drawBackdrop(ctx);
    // Phase 15: the split view. The cross-section is always there; at the surface a band of
    // mirror water covers its top, and shrinks to nothing as the view goes under (uw.alpha).
    // The mirror is only ever drawn with the camera at the surface (see underwater.js).
    G.scene.underwater.draw(ctx, loc, camPx, camPy, 1, run.boat.t);
    if (band > 0) G.gfx.water.draw(ctx, wy, VIEW_H, run.boat.t, drawAbove, wl, band, camPx);
    drawWaterline(ctx, wy - camPy + band, cols, wl, band === 0 ? a : 0);
    ctx.drawImage(glint, camPx * HI, 0, VIEW_W * HI, 1, 0, wy - camPy, VIEW_W, 1 / HI);
    drawPosts(ctx, wy - camPy);
    G.scene.life.drawSurface(ctx, camPx, camPy); // Phase 49: lily pads, the frog, the striders
    fx.draw(ctx, camPx, camPy);
    drawBoat(ctx);
    if (band === 0) { // Phase 20: the hull sits in the water; the surface washes over its bottom
      var hx = Math.round((run.boat.x - run.cam.x) * HI);
      drawWaterline(ctx, wy - camPy, cols, wl, 0, Math.max(0, hx - 36), Math.min(640, hx + 36), 0.55);
    }
    drawLift(ctx, run);
    drawMist(ctx);
    drawRain(ctx);
    G.scene.underwater.drawHooked(ctx, loc, camPx, camPy, run.boat.t);
    drawCast(ctx);
    drawDangle(ctx); // Phase 34
    G.ui.hud.draw(ctx, run, wy);
    G.ui.setup.draw(ctx); // Phase 45
    G.ui.card.draw(ctx);
  }

  return {
    HI: HI, owl: owl, dogTap: dogTap, tackleAct: function () { return tackleAct; },
    load: load, tp: tp, enter: enter, exit: exit, setPassive: setPassive, update: update, draw: draw, forceAnomaly: forceAnomaly, anomalyAlpha: anomalyAlpha,
    CAST: CAST, landingX: landingX, forceCast: forceCast,
    setRodMax: function (kg) { rodMaxOverride = kg || 0; return kg; }, // debug: 0 restores the rod's own limit
    skyColor: skyColor, hourNow: hourNow, skyBrightness: skyBrightness,
    rodPose: function () { return rodPose(G.state.run, [0, 0, 0]); }, // debug: [angle, load, pull] now
    lift: function () { return plift.t; },
    floatY: function (x) { return floatY(x); },
    lureAt: function () { var r = G.state.run, o = [0, 0]; return r.passive.on && r.passive.pl ? floatPos(r, o) : lurePos(r, o); }, // debug: where the rope's far end is held // Phase 20: the surface's height at world x, as floats sit on it
    rain: function () { return loc ? rainK() : 0; },
    light: function (h) { return { night: nightF(h), grey: greyF(h), dusk: duskF(h) }; },
    fogAlpha: function () { return fogMul() / FOG_HEAD; },
    moon: function () { return { x: moonPt[0], y: moonPt[1], a: moonPt[2] }; },
    waterLight: function () { return waterLight; },
    loc: function () { return loc; },
    night: function () { return fisherIn.night; }, // Phase 35: what the idle director takes as dusk or night
    sail: function (dir, secs) { sail.dir = dir < 0 ? -1 : 1; sail.t = secs === undefined ? 1 : +secs; return sail; },
    dangle: function () { return { on: dg.on, th: +dg.th.toFixed(3), om: +dg.om.toFixed(3), len: +dg.len.toFixed(2), off: [+dg.ox.toFixed(2), +dg.oy.toFixed(2)] }; }, // dbg.dangle (Phase 34)
    scenery: function () { return scen === NO_SCENERY ? null : scen; },
    landmarkBounds: function (id) { return boundsByLoc[loc.id] && boundsByLoc[loc.id][id]; },
    // dbg.shore() (Phase 49): for each layer of this water, the kinds its painter painted and its bake's ms (on its first bake).
    painted: function () {
      var o = {};
      for (var i = 0; i < loc.layers.length; i++) { var k = 'loc:' + loc.id + ':' + loc.layers[i].id; o[loc.layers[i].id] = { kinds: paintedKinds[k] || [], ms: bakeMs[k] === undefined ? null : +bakeMs[k].toFixed(1) }; }
      return o;
    },
    skyLum: function () { return skyLum; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, sc = G.scene.sailing;
  if (!run.boat || !sc.loc()) return 'sailing: not loaded';
  var b = run.boat;
  return 'loc ' + run.loc + '  cam ' + run.cam.x.toFixed(1) + '  hour ' + sc.hourNow().toFixed(2) +
    '  sky lum ' + sc.skyLum().toFixed(0) + '/' + G.gfx.sprites.CEILING.toFixed(0) + '  fog ' + sc.fogAlpha().toFixed(2) +
    '  moon ' + (sc.moon().a > 0 ? sc.moon().a.toFixed(2) : '-') + '\n' +
    'boat x ' + b.x.toFixed(1) + '  vx ' + b.vx.toFixed(2) + '  stopped ' + (b.stopped ? 'Y' : 'n') +
    '  facing ' + (b.facing > 0 ? 'R' : 'L') + '  dog ' + run.dog.pose +
    '  pitch ' + b.show.toFixed(2) + '°  heave ' + b.heave.toFixed(2) + '  throttle ' + b.throttle.toFixed(2) + '  rpm ' + Math.round(b.rpm) + (b.motor ? '' : ' (off)');
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
  var bd = G.scene.underwater.body();
  var drift = loc.drift && G.scene.underwater.UNDER[run.fsm] ? '  current ' + bd.flow.toFixed(2) + ' px/s at ' + c.tw.toFixed(1) + ' s  flow x/y ' + G.scene.underwater.flow(loc, 0).toFixed(2) + '/0  lure angle ' + bd.angle + '  flutter ' + bd.flutter : '';
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
