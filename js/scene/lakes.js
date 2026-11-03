var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The lakes' scenery (Phase 78, PLAN_WATERS.md 2 and 4.5): Hartsmere Lake and Russetwood Lake
// as scenery modules beside the rivers' (js/scene/rivers.js, whose `surface` and `things`
// parts these extend). Landmark painters bake once in layer px (HI per world px); the live
// parts draw from the clock and hashes only. What each reach has comes from the data:
//   Hartsmere: birches, Birch Point (the picnic table and fire ring), the old bench and its
//     rowboat; loc.lake.weed: the weed beds seen through the clear water from above
//   Russetwood: the reed beds and drowned stumps of Reed Flats, the deadfall of Mink Cove, the
//     dam far off (a layer of kind 'dam', its crest lamps lit at night)
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'], STONES = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var GRANITE = ['ink', 'stone_dark', 'stone', 'stone_hi'], GRASS = ['moss_dark', 'moss', 'moss_hi'];
  var BIRCHLEAF = ['moss_dark', 'moss', 'moss_hi', 'moss_lit'], GOLD = ['moss_dark', 'moss', 'leaf_gold', 'leaf_gold'];
  var GREY = ['wood_deep', 'stone_dark', 'stone', 'stone_hi'];
  var R = G.scene.scenery.copper; // the rivers' surface and things, reused

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function h01(a, b) { return (S.hash(a, b) & 1023) / 1023; }

  // ---- Painters (layer px) ---------------------------------------------------------------------

  // A white birch near the water: a pale trunk with black marks and lenticels, leaning a
  // little, thin branches, a light open crown (some leaves gone gold).
  function birchAt(ctx, x, gy, h, rng, lean) {
    var top = gy - h, y, i;
    for (y = top + 10; y < gy; y++) {
      var X = x + Math.round(lean * (gy - y) / h * 6);
      A.box(ctx, 'birch', X, y, 3, 1); A.px(ctx, 'stone_hi', X + 2, y);
      if ((y * 7 + x) % 9 < 2) A.box(ctx, 'ink', X + ((y & 1) ? 0 : 1), y, 2, 1);
    }
    for (i = 0; i < 6; i++) {
      var by = top + rng.int(12, Math.round(h * 0.6)), bx = x + Math.round(lean * (gy - by) / h * 6), len = rng.int(6, 14), d = rng.next() < 0.5 ? -1 : 1;
      A.line(ctx, 'stone', bx + 1, by, bx + 1 + d * len, by - (len >> 1));
    }
    // the crown: an open, drooping oval of small clumps over the upper half, trunk showing through
    var ccx = x + Math.round(lean * 5), ccy = top + Math.round(h * 0.24), rx = 13 + (h >> 4), ry = Math.round(h * 0.26);
    for (i = 0; i < 26; i++) {
      var a = rng.range(0, 6.2832), d = Math.sqrt(rng.next()), cx = Math.round(ccx + Math.cos(a) * d * rx), cy = Math.round(ccy + Math.sin(a) * d * ry), r = rng.int(3, 6);
      A.blob(ctx, cx, cy, r, Math.round(r * 0.85), rng.next() < 0.12 ? GOLD : BIRCHLEAF, { rim: 0.3, bias: i < 9 ? -0.3 : (cy < ccy ? 0.1 : -0.1) });
    }
    for (i = 0; i < 10; i++) { var dx = ccx + rng.int(-rx, rx); A.box(ctx, 'moss_dark', dx, ccy + rng.int(ry - 6, ry + 2), 1, rng.int(2, 6)); } // drooping catkin twigs
  }
  // A stand of birches along the shore (lm.n of them over lm.half world px either side).
  function birches(ctx, x, wy, rng, lm) {
    var half = (lm.half || 30) * HI, n = lm.n || 4;
    for (var i = 0; i < n; i++) birchAt(ctx, Math.round(x - half + (i + 0.5) * 2 * half / n + rng.int(-6, 6)), wy - 2, rng.int(70, 110), rng, rng.range(-0.6, 0.6));
    return [x - half - 24, x + half + 24];
  }

  // A low hump of land at the waterline: grass on top, rocks at its foot. Returns its top.
  function mound(ctx, x, wy, half, h, rng) {
    var X, t, top = [];
    for (X = x - half; X <= x + half; X++) {
      t = (X - x) / half; var yy = Math.round(wy - h * Math.sqrt(Math.max(0, 1 - t * t)) - (S.hash(X, 5) & 1));
      A.box(ctx, 'umber_dark', X, yy + 2, 1, wy - yy); A.box(ctx, GRASS[S.hash(X, 9) % 3], X, yy, 1, 2);
      top.push(yy);
    }
    for (var i = 0; i < half / 6; i++) { var rx = rng.int(x - half, x + half), rr = rng.int(3, 7); A.blob(ctx, rx, wy - 2, rr, Math.round(rr * 0.6), GRANITE, { rim: 0.3 }); }
    for (i = 0; i < half; i++) { var gx = rng.int(x - half + 2, x + half - 2), gt = top[gx - x + half]; A.line(ctx, i & 1 ? 'moss_hi' : 'reed', gx, gt, gx + rng.int(-1, 1), gt - rng.int(2, 5)); }
    return top;
  }

  // Birch Point: the point of land, birches on it, a picnic table and a ring of stones with a
  // charred log in it.
  function point(ctx, x, wy, rng, lm) {
    var half = (lm.half || 40) * HI, h = (lm.h || 6) * HI, top = mound(ctx, x, wy, half, h, rng);
    function topAt(X) { return top[clamp(X - x + half, 0, top.length - 1)]; }
    birchAt(ctx, x - Math.round(half * 0.6), topAt(x - Math.round(half * 0.6)), 100, rng, -0.4);
    birchAt(ctx, x + Math.round(half * 0.55), topAt(x + Math.round(half * 0.55)), 84, rng, 0.5);
    // the table: two benches, the top, A-frame legs
    var tx = x - 6, ty = topAt(tx) - 12;
    A.slab(ctx, tx - 16, ty, 32, 3, WOOD); A.box(ctx, 'wood_lit', tx - 16, ty, 31, 1);
    A.line(ctx, 'wood_dark', tx - 10, ty + 3, tx - 15, ty + 12); A.line(ctx, 'wood_dark', tx - 9, ty + 3, tx - 4, ty + 12);
    A.line(ctx, 'wood_dark', tx + 9, ty + 3, tx + 4, ty + 12); A.line(ctx, 'wood_dark', tx + 10, ty + 3, tx + 15, ty + 12);
    A.slab(ctx, tx - 22, ty + 6, 44, 2, WOOD);
    // the fire ring
    var fx = x + 18, fy = topAt(fx);
    for (var i = 0; i < 6; i++) A.blob(ctx, fx - 8 + i * 3, fy - 1, 2, 2, GRANITE, { rim: 0.2 });
    A.box(ctx, 'ink', fx - 4, fy - 3, 8, 1); A.line(ctx, 'wood_deep', fx - 4, fy - 4, fx + 3, fy - 5);
    return [x - half - 30, x + half + 30];
  }

  // The old bench at the far end: weathered grey boards on a bit of bank, and a rowboat drawn
  // up beside it, its painter round a stake.
  function bench(ctx, x, wy, rng, lm) {
    var half = (lm.half || 26) * HI, top = mound(ctx, x, wy, half, (lm.h || 4) * HI, rng);
    var by = top[half] - 10;
    A.slab(ctx, x - 14, by, 28, 2, GREY); A.slab(ctx, x - 14, by - 7, 28, 2, GREY); A.slab(ctx, x - 14, by - 4, 28, 2, GREY);
    A.box(ctx, 'wood_deep', x - 12, by + 2, 2, 9); A.box(ctx, 'wood_deep', x + 10, by + 2, 2, 9); A.box(ctx, 'wood_deep', x - 12, by - 8, 2, 10); A.box(ctx, 'wood_deep', x + 10, by - 8, 2, 10);
    A.px(ctx, 'moss', x - 13, by - 8); A.px(ctx, 'moss_hi', x + 4, by);
    if (lm.boat) {
      var b0 = x + half - 6, i;
      for (i = 0; i < 40; i++) {
        var lift = i < 6 ? 6 - i : (i > 33 ? i - 33 : 0), y = wy - 9 + Math.round(lift * 0.6) + Math.round(i * 0.08);
        A.box(ctx, 'teal_dark', b0 + i, y, 1, wy - y + 1); A.px(ctx, 'teal', b0 + i, y); A.px(ctx, 'wood_deep', b0 + i, y + 3);
      }
      A.box(ctx, 'wood', b0 + 16, wy - 10, 7, 2); A.line(ctx, 'wood_mid', b0 + 8, wy - 12, b0 + 30, wy - 9);
      A.slab(ctx, b0 - 8, wy - 12, 2, 12, WOOD); A.line(ctx, 'stone', b0 - 6, wy - 10, b0 + 1, wy - 7);
    }
    return [x - half - 4, lm.boat ? x + half + 40 : x + half + 4];
  }

  // Reeds standing in the water: a dense bed of stems and cattails, lm.half world px either side.
  function reeds(ctx, x, wy, rng, lm) {
    var half = (lm.half || 40) * HI, i, k;
    for (i = 0; i < half * 1.6; i++) {
      var sx = rng.int(x - half, x + half), t = Math.abs(sx - x) / half, h = Math.round(rng.int(14, 34) * (1 - 0.5 * t * t)), lean = rng.range(-0.2, 0.2), key = i % 3 === 0 ? 'reed_hi' : (i % 3 === 1 ? 'reed' : 'reed_dark');
      for (k = 0; k < h; k++) A.px(ctx, key, sx + Math.round(lean * k * k / h), wy - k);
      if (h > 24 && i % 5 === 0) { var hx = sx + Math.round(lean * h); A.box(ctx, 'wood_dark', hx - 1, wy - h - 6, 2, 6); A.px(ctx, 'wood', hx - 1, wy - h - 6); }
    }
    return [x - half - 6, x + half + 6];
  }

  // Drowned stumps of the flooded woods: grey, broken-topped, a few with a stub of branch.
  function stumps(ctx, x, wy, rng, lm) {
    var half = (lm.half || 60) * HI, n = lm.n || 7, i;
    for (i = 0; i < n; i++) {
      var sx = Math.round(x - half + (i + 0.5) * 2 * half / n + rng.int(-10, 10)), w = rng.int(6, 12), h = rng.int(10, 44);
      A.slab(ctx, sx, wy - h, w, h + 1, ['wood_deep', 'stone', 'stone_hi', 'stone_lit']);
      for (var g = 0; g < h; g += 5) A.px(ctx, 'stone_dark', sx + 1 + (S.hash(g, sx) % Math.max(1, w - 2)), wy - g); // the grain
      for (var k = 0; k < w; k++) A.px(ctx, 'wood_deep', sx + k, wy - h - (S.hash(sx + k, i) & 3));   // the broken top
      if (h > 16 && rng.next() < 0.6) { var d = rng.next() < 0.5 ? -1 : 1; A.line(ctx, 'stone', sx + (d > 0 ? w : -1), wy - h + 6, sx + (d > 0 ? w + 6 : -7), wy - h - 2); }
      A.box(ctx, 'wood_deep', sx, wy - 3, w, 2);                                                         // the wet line
    }
    return [x - half - 12, x + half + 12];
  }

  // Deadfall: a big tree fallen from the bank into the cove, its crown of bare branches in the
  // water, where the otters haul out (lm.dir: which way it lies).
  function deadfall(ctx, x, wy, rng, lm) {
    var dir = lm.dir || -1, len = (lm.len || 50) * HI, i, ex = x + dir * len;
    A.limb(ctx, x, wy - 16, ex, wy - 3, 4, ['wood_deep', 'wood_dark', 'wood', 'wood_mid'], 0);
    A.blob(ctx, x - dir * 4, wy - 18, 7, 9, ['ink', 'wood_deep', 'wood_dark'], { rim: 0 });                // the root plate
    for (i = 0; i < 7; i++) A.line(ctx, 'wood_deep', x - dir * 4, wy - 18, x - dir * rng.int(6, 14), wy - rng.int(6, 30));
    for (i = 0; i < 10; i++) {
      var t = rng.range(0.3, 1), bx = Math.round(x + dir * len * t), by = Math.round(wy - 16 + 13 * t), bl = rng.int(8, 22);
      A.line(ctx, i & 1 ? 'stone' : 'wood_dark', bx, by, bx + dir * rng.int(2, 10), by - bl);
      if (i % 3 === 0) A.line(ctx, 'stone_dark', bx + dir * 4, by - (bl >> 1), bx + dir * 10, by - bl + 2);
    }
    return [Math.min(x, ex) - 14, Math.max(x, ex) + 14];
  }

  // The dam far off (a layer, kind 'dam'): a concrete wall between the hills, its spillway's
  // gates, piers, the road along the crest with its rail and lamp posts. L.x, L.w: world px
  // in the layer; L.h: the wall's height over the water.
  function damLayer(ctx, L, w, wy, rng) {
    var x0 = L.x * HI, x1 = x0 + L.w * HI, top = wy - L.h, X, i; // L.h comes scaled (sailing's scaleL), L.x and L.w do not
    A.area(ctx, x0, top, x1 - x0, wy - top, function (X, y) {
      var f = (X - x0) / (x1 - x0), k = f < 0.08 ? 'stone_dark' : 'stone';
      if ((y - top) < 3) return 'stone_hi';
      if (((X - x0) % 22) < 2) return 'stone_dark';                          // the piers' joints
      if (A.dither(X, y, ((y - top) / (wy - top)) * 0.5)) return 'stone_dark'; // streaked lower down
      return k;
    });
    for (i = 0; i < 4; i++) { var gx = Math.round(x0 + (x1 - x0) * (0.3 + i * 0.1)); A.box(ctx, 'ink', gx, top + 6, 12, 10); A.box(ctx, 'stone_hi', gx, top + 6, 12, 1); }
    A.box(ctx, 'stone_dark', x0 - 2, top - 3, x1 - x0 + 4, 1);                // the rail
    for (X = x0; X < x1; X += 26) A.box(ctx, 'stone_dark', X, top - 10, 1, 10); // lamp posts
    A.slab(ctx, Math.round(x0 + (x1 - x0) * 0.62), top - 16, 10, 16, STONES);   // the gatehouse
    return ['dam'];
  }

  // ---- Live parts ------------------------------------------------------------------------------

  // Through Hartsmere's clear water the weed beds show from above: dark strands swaying just
  // under the surface, faint, in the mirror's band.
  function weedSeen(c, run, loc) {
    var Wd = loc.lake && loc.lake.weed, t = run.boat.t, camPx = Math.round(run.cam.x * HI) / HI, wyS = loc.waterY - Math.round(run.cam.y * HI) / HI;
    if (!Wd || run.uw.alpha > 0.5) return;
    var night = G.scene.sailing.light(G.state.save.clock || 0).night, k = (Wd.a || 0.3) * (1 - 0.7 * night);
    for (var b = 0; b < Wd.x.length; b++) {
      var lo = Math.max(Wd.x[b][0], camPx - 4), hi = Math.min(Wd.x[b][1], camPx + 324);
      for (var x = Math.floor(lo / 3) * 3; x < hi; x += 3) {
        var hh = h01(x, 21), sway = Math.sin(t * 0.9 + x * 0.11) * 0.8;
        if (hh < 0.35) continue;
        c.globalAlpha = k * (0.5 + 0.5 * hh); c.fillStyle = P[hh > 0.7 ? 'moss_dark' : 'leaf_deep'];
        c.fillRect(Math.round((x - camPx + sway) * HI) / HI, Math.round((wyS + 2 + (S.hash(x, 3) & 3)) * HI) / HI, 1, 2 + (S.hash(x, 4) & 3));
      }
    }
    c.globalAlpha = 1;
  }

  function surface(c, run, loc) { weedSeen(c, run, loc); R.surface(c, run, loc); }

  function things(loc) {
    var o = R.things(loc), Wd = loc.lake && loc.lake.weed;
    if (Wd) for (var i = 0; i < Wd.x.length; i++) o.push({ kind: 'weed beds', x: [Wd.x[i][0], Wd.x[i][1]] });
    for (i = 0; i < loc.layers.length; i++) if (loc.layers[i].kind === 'dam') o.push({ kind: 'dam far off', x: [650, loc.width] }); // seen from Mink Cove
    return o;
  }

  // The dam's crest lamps at night, over its layer (they are not graded with it).
  function afterLayer(c, id, ox, oy, run, loc) {
    var L = null, i;
    for (i = 0; i < loc.layers.length; i++) if (loc.layers[i].id === id && loc.layers[i].kind === 'dam') L = loc.layers[i];
    if (!L) return;
    var n = G.scene.sailing.light(G.state.save.clock || 0).night;
    if (n < 0.1) return;
    var top = loc.waterY - L.h - oy;
    for (var X = L.x * HI; X < (L.x + L.w) * HI; X += 26) {
      var sx = X / HI - ox;
      if (sx < -4 || sx > 324) continue;
      c.globalAlpha = 0.18 * n; c.fillStyle = P.lamp_glow; c.fillRect(sx - 1.5, top - 6.5, 4, 3);
      c.globalAlpha = 0.9 * n; c.fillRect(sx, top - 5.5, 1, 0.5);
    }
    c.globalAlpha = 1;
  }

  function debugLine(run) {
    var loc = G.data.locations[run.loc], x = run.boat.x, Rr = loc.reaches, name = '';
    for (var i = 0; i < Rr.length; i++) if (x >= Rr[i].x[0] && x < Rr[i].x[1]) name = Rr[i].name;
    return name + '  bed ' + (G.scene.underwater.bottomAt(loc, x) / 4).toFixed(1) + ' m';
  }

  G.scene.scenery.harts = { landmarks: { birches: birches, point: point, bench: bench }, surface: surface, things: things, debugLine: debugLine };
  G.scene.scenery.russet = { landmarks: { reeds: reeds, stumps: stumps, deadfall: deadfall }, paint: { dam: damLayer }, surface: surface, things: things, afterLayer: afterLayer, debugLine: debugLine };
})();
