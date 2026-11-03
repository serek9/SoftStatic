var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The rivers' scenery (Phase 77, PLAN_WATERS.md 2 and 4.5): Copperbend River and Stonehorn
// River as scenery modules beside The Pines' (js/scene/scenery.js; the parts are listed in
// sailing.js). Their landmark painters bake once with the landmarks layer, in layer px (HI per
// world px); the live water (riffles, white water, the dam's spill, the bend's mist) draws in
// the `surface` part, in world px through the view's scale, from the clock and hashes only:
// no state, no allocation. What each reach has comes from loc.river (data):
//   riffles [{x: [from, to], n, v}]: glints running downstream over a gravel riffle
//   rapids [{x: [from, to], n, v}]: white water: foam streaks and standing waves
//   spill {x, w}: water tumbling over the beaver dam's notch
//   mist {x: [from, to], h}: a low mist on the water, thickest at dawn
// and foam collars round every landmark with `foam` (the boulders).
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'], STONES = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var GRANITE = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var LEAVES = ['leaf_deep', 'leaf_dark', 'leaf', 'leaf_hi'], TURNING = ['leaf_deep', 'leaf_dark', 'leaf_rust', 'leaf_gold'];
  var SPRUCE = { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function h01(a, b) { return (S.hash(a, b) & 1023) / 1023; }

  // ---- Painters (layer px; x is the landmark's x × HI, wy the waterline) -----------------------

  // A timber road bridge over the side channel at The Split: trestle bents braced in X standing
  // in the water, a stringer, a plank deck with a rail, stone abutments at both ends.
  function bridge(ctx, x, wy, rng, lm) {
    var half = (lm.half || 80) * HI, deck = wy - (lm.h || 23) * HI, x0 = x - half, x1 = x + half, k, px;
    for (k = 0; k < 4; k++) {
      var bx = Math.round(x0 + 30 + k * (2 * half - 60) / 3);
      A.slab(ctx, bx - 8, deck + 8, 5, wy - deck - 7, WOOD); A.slab(ctx, bx + 4, deck + 8, 5, wy - deck - 7, WOOD);
      A.line(ctx, 'wood_dark', bx - 4, deck + 12, bx + 4, wy - 4); A.line(ctx, 'wood_dark', bx + 4, deck + 12, bx - 4, wy - 4);
      A.box(ctx, 'wood_deep', bx - 9, deck + 8, 19, 3);
    }
    A.slab(ctx, x0 - 10, deck + 6, 14, wy - deck - 5, STONES); A.slab(ctx, x1 - 4, deck + 6, 14, wy - deck - 5, STONES); // abutments
    A.slab(ctx, x0 - 10, deck + 2, x1 - x0 + 20, 6, WOOD);                                                                // the stringer
    for (px = x0 - 10; px < x1 + 10; px += 5) { A.box(ctx, rng.next() < 0.25 ? 'wood_hi' : 'wood_mid', px, deck, 5, 2); A.box(ctx, 'wood_lit', px, deck, 4, 1); }
    for (px = x0 - 8; px <= x1 + 8; px += 14) A.slab(ctx, px, deck - 10, 3, 10, WOOD);                                     // the rail's posts
    A.box(ctx, 'wood_mid', x0 - 8, deck - 10, x1 - x0 + 18, 2); A.box(ctx, 'wood_hi', x0 - 8, deck - 10, x1 - x0 + 18, 1);
    A.box(ctx, 'wood_dark', x0 - 8, deck - 5, x1 - x0 + 18, 1);
    return [x0 - 12, x1 + 12];
  }

  // A gravel bar breaking the water: a low hump of pebbles, pale on top, wet and dark at the edge.
  var PEBBLES = ['stone', 'stone_hi', 'stone_lit', 'umber_hi', 'stone_hi', 'stone_dark'];
  function gravel(ctx, x, wy, rng, lm) {
    var half = (lm.half || 24) * HI, x0 = x - half, i;
    for (var X = x0; X <= x + half; X++) {
      var t = (X - x0) / (2 * half), h = Math.round(Math.sin(Math.PI * t) * (lm.h || 3) * HI);
      if (h <= 0) continue;
      A.box(ctx, 'stone', X, wy - h, 1, h + 1); A.px(ctx, 'stone_hi', X, wy - h); A.px(ctx, 'stone_dark', X, wy);
    }
    for (i = 0; i < half * 1.5; i++) {
      var px = rng.int(x0 + 2, x + half - 2), tt = (px - x0) / (2 * half), top = wy - Math.round(Math.sin(Math.PI * tt) * (lm.h || 3) * HI);
      A.box(ctx, PEBBLES[rng.int(0, PEBBLES.length - 1)], px, rng.int(top, wy - 1), rng.int(1, 3), 1);
    }
    return [x0, x + half];
  }

  // The beaver dam: a long low heap of mud and stripped sticks, a notch at its downstream end
  // where the pool spills over (the `spill` in loc.river).
  function dam(ctx, x, wy, rng, lm) {
    var half = (lm.half || 32) * HI, i;
    A.blob(ctx, x, wy, half, (lm.h || 7) * HI, ['ink', 'umber_deep', 'umber_dark', 'umber'], { rim: 0.3, bias: -0.1 });
    for (i = 0; i < half * 1.4; i++) {
      var sx = rng.int(x - half + 4, x + half - 4), t = (sx - x) / half, top = wy - Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * (lm.h || 7) * HI);
      var sy = rng.int(top, wy - 1), l = rng.int(5, 14), d = rng.next() < 0.5 ? -1 : 1;
      A.line(ctx, i % 4 === 0 ? 'wood_hi' : (i % 4 === 1 ? 'wood_dark' : 'wood_mid'), sx, sy, sx + d * l, sy + rng.int(-3, 2));
    }
    for (i = 0; i < 7; i++) { var bx = rng.int(x - half + 10, x + half * 0.5); A.line(ctx, 'wood_mid', bx, wy - 6, bx + rng.int(-6, 6), wy - rng.int(16, 26)); } // sticks standing up
    A.box(ctx, 'umber_deep', x + Math.round(half * 0.55), wy - 5, 10, 5); // the notch
    return [x - half - 2, x + half + 2];
  }

  // A maple leaning out over the water from the bank: a trunk sloping lm.dir-ward, limbs, a
  // round crown of leaves with the first turning copper and gold.
  function maple(ctx, x, wy, rng, lm) {
    var dir = lm.dir || 1, tx = x + dir * 40, ty = wy - (lm.h || 46) * HI, i;
    A.limb(ctx, x, wy, x + dir * 20, wy - 40, 5, WOOD, 0); A.limb(ctx, x + dir * 20, wy - 40, tx, ty + 22, 4, WOOD, 0);
    A.limb(ctx, x - dir * 2, wy + 2, x + dir * 2, wy - 12, 7, WOOD, -0.1);                              // the root flare
    A.limb(ctx, tx - dir * 4, ty + 30, tx - dir * 30, ty + 10, 2, WOOD, 0); A.limb(ctx, tx, ty + 24, tx + dir * 26, ty + 16, 2, WOOD, 0);
    // the crown: many small clumps inside an ellipse, the far (dark) ones first, a few turning
    for (i = 0; i < 34; i++) {
      var a = rng.range(0, 6.2832), d = Math.sqrt(rng.next()), bx = Math.round(tx + Math.cos(a) * d * 36), by = Math.round(ty + 10 + Math.sin(a) * d * 20);
      var r = rng.int(6, 11), back = i < 12;
      A.blob(ctx, bx, by, r, Math.round(r * 0.8), rng.next() < 0.22 ? TURNING : LEAVES, { rim: 0.3, bias: back ? -0.3 : (by < ty + 6 ? 0.1 : -0.05) });
    }
    for (i = 0; i < 30; i++) { var fx = tx + rng.int(-34, 34); A.box(ctx, rng.next() < 0.25 ? 'leaf_gold' : 'leaf_deep', fx, ty + rng.int(22, 34), 1, rng.int(2, 7)); } // the drooping fringe
    return [Math.min(x, tx) - 48, Math.max(x, tx) + 48];
  }

  // A boulder standing in fast water: dark, wet at its foot, lit on its upper left; lichen.
  function boulder(ctx, x, wy, rng, lm) {
    var r = (lm.r || 10) * HI, i;
    A.blob(ctx, x, wy - Math.round(r * 0.45), r, Math.round(r * 0.8), GRANITE, { rim: 0.35, bias: 0.05 });
    A.blob(ctx, x + Math.round(r * 0.45), wy - Math.round(r * 0.2), Math.round(r * 0.6), Math.round(r * 0.45), GRANITE, { rim: 0.35, bias: -0.15 }); // a second, lower lobe
    for (i = 0; i < 4; i++) A.line(ctx, 'stone_dark', x - r + rng.int(6, 2 * r - 6), wy - rng.int(4, r), x - r + rng.int(6, 2 * r - 6), wy - rng.int(2, 6)); // cracks
    A.box(ctx, 'stone_dark', x - r + 2, wy - 5, 2 * r - 4, 2); A.box(ctx, 'ink', x - r + 3, wy - 3, 2 * r - 6, 3);   // wet at its foot
    for (i = 0; i < r; i++) A.px(ctx, i % 3 ? 'moss' : 'leaf_gold', x + rng.int(-r + 4, r - 8), wy - rng.int(Math.round(r * 0.6), Math.round(r * 1.15))); // lichen
    return [x - r, x + Math.round(r * 1.05)];
  }

  // Osprey Bluff: a cliff rising from the pool on its west face and sloping away east, banded
  // rock, ledges, spruce along its brow, and the osprey's nest on a dead snag at lm.nest
  // ({x world, y px above the water}: life.js perches the bird there).
  function bluffTop(lm, X) {
    var x0 = (lm.x - lm.half) * HI, t = (X - x0) / (2 * lm.half * HI);
    if (t < 0 || t > 1) return 0;
    return lm.h * HI * Math.min(1, t * 60) * (1 - 0.55 * Math.max(0, t - 0.45) / 0.55) + Math.sin(X * 0.21) * 2 + Math.sin(X * 0.053) * 3;
  }
  // Smooth value noise 0..1: hashes on an sx × sy grid, blended across each cell.
  var ROCKTONE = ['rock_dark', 'stone_dark', 'rock', 'stone'];
  function vnoise(x, y, sx, sy) {
    var gx = x / sx, gy = y / sy, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = A.hash2(ix, iy), b = A.hash2(ix + 1, iy), c = A.hash2(ix, iy + 1), d = A.hash2(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  function bluff(ctx, x, wy, rng, lm) {
    var x0 = x - lm.half * HI, x1 = x + lm.half * HI, X, y, i;
    // the rock: weathered faces in patches of tone, beds that show and break off, dark water
    // stains running down; the west face lit, the brow mossy
    A.area(ctx, x0, Math.round(wy - lm.h * HI - 8), x1 - x0 + 1, Math.round(lm.h * HI + 8), function (X, y) {
      var top = wy - bluffTop(lm, X);
      if (y < top) return '';
      if (y - top < 2) return y - top < 1 ? 'moss_dark' : 'moss';
      if (X - x0 < 4) return X - x0 < 2 ? 'rock_lit' : 'stone';
      var v = 0.6 * vnoise(X, y + X * 0.15, 26, 11) + 0.4 * vnoise(X, y, 8, 5);
      var bed = (y + (X - x0) * 0.1 + Math.sin(X * 0.031) * 4) / 11, b = Math.floor(bed), f = bed - b;
      if (f < 0.09 && A.hash2(X >> 4, b) > 0.4) return 'ink';                                 // a bedding line, broken
      if (f < 0.18 && A.hash2(X >> 4, b) > 0.4) return 'stone';                                // its lip
      if (A.hash2(X >> 1, 7) > 0.94 && y - top > 6 && A.hash2(X >> 1, y >> 4) > 0.3) return 'rock_dark'; // a stain
      var q = v * 4 - 0.6, n = Math.floor(q);                                   // four tones, dithered between
      if (A.dither(X, y, q - n)) n++;
      return ROCKTONE[clamp(n, 0, 3)];
    });
    for (i = 0; i < 7; i++) { var fx0 = rng.int(x0 + 10, x1 - 40), ftop = Math.round(wy - bluffTop(lm, fx0)) + 6; A.line(ctx, 'ink', fx0, ftop, fx0 + rng.int(-4, 4), Math.min(wy, ftop + rng.int(16, 60))); } // fissures
    for (i = 0; i < 9; i++) { var lx = rng.int(x0 + 20, x1 - 30), ly = Math.round(wy - bluffTop(lm, lx) * rng.range(0.25, 0.8)); A.box(ctx, 'ink', lx, ly, rng.int(6, 18), 1); A.box(ctx, 'rock_lit', lx, ly - 1, rng.int(4, 12), 1); } // ledges
    for (i = 0; i < 10; i++) {
      var sx = Math.round(x0 + 30 + i * (x1 - x0 - 50) / 9 + rng.int(-6, 6));
      if (lm.nest && Math.abs(sx - lm.nest.x * HI) < 14) continue;
      A.spruce(ctx, sx, Math.round(wy - bluffTop(lm, sx)) + 1, rng.int(18, 34), SPRUCE, rng);
    }
    if (lm.nest) {
      var nx = lm.nest.x * HI, ny = wy - lm.nest.y * HI, base = Math.round(wy - bluffTop(lm, nx));
      A.limb(ctx, nx, base + 2, nx + 2, ny + 4, 2, ['wood_deep', 'stone_dark', 'stone'], 0);     // the dead snag, silvered
      A.line(ctx, 'stone', nx + 1, ny + 14, nx - 10, ny + 6); A.line(ctx, 'stone_dark', nx + 2, ny + 22, nx + 12, ny + 16);
      A.blob(ctx, nx + 1, ny + 2, 9, 4, ['ink', 'wood_deep', 'wood_dark', 'wood'], { rim: 0.3 }); // the nest of sticks
      for (i = 0; i < 12; i++) { var qx = nx + rng.int(-9, 9); A.line(ctx, i & 1 ? 'wood_mid' : 'wood_dark', qx, ny + rng.int(0, 4), qx + rng.int(-5, 5), ny + rng.int(-2, 6)); }
    }
    return [x0, x1];
  }

  // ---- The live water (world px; c is the view's ctx at its scale) ---------------------------
  var surf = null;
  function waterAt(x, wyS) { return wyS - surf.at(x) / HI; }

  // Glints running downstream: each lives L s, drawn from a hash of (its index, its life).
  function glints(c, R, t, camPx, wyS, dir, k, key, len) {
    var w = R.x[1] - R.x[0];
    for (var i = 0; i < R.n; i++) {
      var life = 0.9 + h01(i, 7) * 1.4, cyc = t / life + h01(i, 3), n = Math.floor(cyc), fr = cyc - n;
      var x = R.x[0] + h01(i * 31 + n, 11) * w + dir * fr * life * R.v;
      if (x < R.x[0] || x > R.x[1]) continue;
      var sx = x - camPx;
      if (sx < -4 || sx > 324) continue;
      c.globalAlpha = k * Math.sin(Math.PI * fr);
      c.fillStyle = P[key];
      c.fillRect(Math.round(sx * HI) / HI, Math.round((waterAt(x, wyS) + (S.hash(i, n) & 3) * 0.5) * HI) / HI, len * (0.6 + h01(i, n)), (S.hash(n, i) & 3) ? 0.5 : 1);
    }
  }

  function mistDraw(c, M, t, camPx, wyS, night) {
    var h = G.state.save.clock || 0, dawn = Math.max(0, 1 - Math.abs(h - 6.5) / 2.5);
    var k = (M.a || 0.3) * Math.max(dawn, 0.35 * night, 0.12);
    var lo = Math.max(M.x[0], camPx - 4), hi = Math.min(M.x[1], camPx + 324);
    c.fillStyle = P.fog_light;
    for (var x = Math.floor(lo / 4) * 4; x < hi; x += 4) {
      var edge = Math.min(1, (x - M.x[0]) / 60, (M.x[1] - x) / 60);
      if (edge <= 0) continue;
      var wave = 0.55 + 0.45 * Math.sin(x * 0.045 - t * 0.25) * Math.sin(x * 0.013 + t * 0.07), mh = (M.h || 8) * (0.7 + 0.3 * wave);
      c.globalAlpha = k * edge * wave * 0.7; c.fillRect(x - camPx, wyS - mh, 4, mh);
      c.globalAlpha = k * edge * wave; c.fillRect(x - camPx, wyS - mh * 0.45, 4, mh * 0.45);
    }
  }

  function surface(c, run, loc) {
    var R = loc.river, t = run.boat.t, camPx = Math.round(run.cam.x * HI) / HI, wyS = loc.waterY - Math.round(run.cam.y * HI) / HI, i, j;
    var night = G.scene.sailing.light(G.state.save.clock || 0).night, k = 1 - 0.45 * night; // foam dims at night
    var dir = loc.current ? loc.current.dir : 1, storm = G.scene.sailing.stormK();
    surf = G.gfx.surface;
    if (!R) return;
    for (i = 0; R.riffles && i < R.riffles.length; i++) glints(c, R.riffles[i], t, camPx, wyS, dir, 0.75 * k, 'water_foam', 2);
    for (i = 0; R.rapids && i < R.rapids.length; i++) {
      var Q = R.rapids[i];
      glints(c, Q, t, camPx, wyS, dir, 0.9 * k, 'water_foam', 4 + 2 * storm);
      // standing waves: crests that stay put and breathe
      for (var j = 0; j < (Q.waves || 0); j++) {
        var wx = Q.x[0] + h01(j, 41) * (Q.x[1] - Q.x[0]), sx = wx - camPx;
        if (sx < -6 || sx > 326) continue;
        var br = 0.5 + 0.5 * Math.sin(t * (3 + h01(j, 5) * 2) + j);
        c.globalAlpha = k * (0.35 + 0.5 * br); c.fillStyle = P.water_foam;
        c.fillRect(Math.round(sx * HI) / HI, Math.round((waterAt(wx, wyS) - 0.5 - br * 0.5) * HI) / HI, 2.5 + br * 2, 0.5);
        c.globalAlpha = k * 0.4; c.fillStyle = P.water_hi; c.fillRect(Math.round((sx + 1) * HI) / HI, Math.round((waterAt(wx, wyS) + 0.5) * HI) / HI, 3, 0.5);
      }
    }
    if (R.spill) {
      var sx0 = R.spill.x - camPx;
      if (sx0 > -10 && sx0 < 330) for (i = 0; i < 10; i++) {
        var fr = (t * 1.6 + h01(i, 13)) % 1, fx = sx0 + h01(i, 17) * R.spill.w + dir * fr * 6;
        c.globalAlpha = k * 0.8 * (1 - fr); c.fillStyle = P.water_foam;
        c.fillRect(Math.round(fx * HI) / HI, Math.round((wyS - 2 + fr * 2.5) * HI) / HI, 1, 0.5);
      }
    }
    // foam collars where the current breaks on a landmark (the boulders), and their wake
    var lms = loc.landmarks;
    for (i = 0; i < lms.length; i++) {
      if (!lms[i].foam) continue;
      var r = lms[i].r || 8, bx = lms[i].x - camPx;
      if (bx < -r - 20 || bx > 340 + r) continue;
      var bob = 0.5 * Math.sin(t * 5 + i);
      c.globalAlpha = k * 0.9; c.fillStyle = P.water_foam;
      c.fillRect(Math.round((bx - r - 1) * HI) / HI, Math.round((wyS - 1 + bob * 0.5) * HI) / HI, 2 * r + 3, 1);    // the collar
      c.fillRect(Math.round((bx - dir * (r + 2) - 1) * HI) / HI, Math.round((wyS - 1.5 - bob) * HI) / HI, 3, 1);     // the pillow upstream
      for (j = 0; j < 8; j++) {
        var ph = (t * 1.3 + j / 8) % 1, wx2 = bx + dir * (r + ph * 22), wy2 = wyS + (j & 1) * 0.5;
        c.globalAlpha = k * 0.85 * (1 - ph); c.fillRect(Math.round(wx2 * HI) / HI, Math.round(wy2 * HI) / HI, 3 - 2 * ph, 0.5);
      }
    }
    if (R.mist) mistDraw(c, R.mist, t, camPx, wyS, night);
    c.globalAlpha = 1;
  }

  // What each reach has (dbg.shore()): its landmarks' kinds and the live water's parts.
  function things(loc) {
    var o = [], R = loc.river || {}, i, j;
    function add(kind, x0, x1) { o.push({ kind: kind, x: [x0, x1] }); }
    for (i = 0; i < (R.riffles || []).length; i++) add('riffle', R.riffles[i].x[0], R.riffles[i].x[1]);
    for (i = 0; i < (R.rapids || []).length; i++) { add('white water', R.rapids[i].x[0], R.rapids[i].x[1]); if (R.rapids[i].waves) add('standing waves', R.rapids[i].x[0], R.rapids[i].x[1]); }
    if (R.spill) add('spill', R.spill.x, R.spill.x + R.spill.w);
    if (R.mist) add('mist', R.mist.x[0], R.mist.x[1]);
    for (j = 0; j < loc.landmarks.length; j++) if (loc.landmarks[j].foam) add('foam', loc.landmarks[j].x, loc.landmarks[j].x);
    return o;
  }

  function debugLine(run) {
    var loc = G.data.locations[run.loc], R = loc.reaches, x = run.boat.x, name = '';
    for (var i = 0; i < R.length; i++) if (x >= R[i].x[0] && x < R[i].x[1]) name = R[i].name;
    return name + '  current x' + G.data.reachK(loc, x, 'flow', 1).toFixed(2) + '  sink x' + G.data.reachK(loc, x, 'sink', 1).toFixed(2);
  }

  G.scene.scenery.copper = { landmarks: { bridge: bridge, gravel: gravel, dam: dam, maple: maple }, surface: surface, things: things, debugLine: debugLine };
  G.scene.scenery.stone = { landmarks: { boulder: boulder, bluff: bluff }, surface: surface, things: things, debugLine: debugLine, bluffTop: bluffTop };
})();
