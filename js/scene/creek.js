var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Blackwater Creek's look (the user's third reference, 2026-11-06): a blush dusk over snowy ranges.
// A scenery module (js/scene/scenery.js's contract) for what the shared painters cannot do:
//   oldpines  tall old pines with flat, ragged pads of needles on bare trunks, tall spruces among
//             them; feature 'nest': the tallest pine with an eagle's nest and the eagle on it
//   granite   a bank of big rounded violet boulders with lichen on their tops, rust brush between
//             them and gold larches and spruces standing on them
// It borrows Fogbound's rounded forested slopes (fbhills) and banded clouds (cloudMask). The creek's
// cabins and snags are the shared landmarks, as before. Layer px are HI (2) per world px.
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, A = G.gfx.paint, HI = 2, FB = G.scene.scenery.fogbound;
  var PINE = { dark: 'pinec_dark', mid: 'pinec_mid', lit: 'pinec_lit', trunk: 'pinec_trunk' };
  var LARCH = { dark: 'larch_dark', mid: 'larch_mid', lit: 'larch_lit', trunk: 'pinec_trunk' };
  var ROCK = ['grn_dark', 'grn', 'grn_mid', 'grn_lit'];
  var SHRUB = ['shrub_dk', 'shrub', 'shrub_lit'];

  function n01(x, y) { return (S.hash(x * 7 + 3, y * 13 + 5) & 1023) / 1023; }

  // ---- oldpines ---------------------------------------------------------------------------------
  // An old pine: a bare, slightly leaning trunk with a few crooked limbs, and from about a third of
  // the way up, flat pads of needles staggered side to side, smaller toward the top; each pad is a
  // few overlapping lumps, lit along its upper left, ragged at its edge.
  function pad(ctx, cx, cy, rw, rh, K, rng) {
    var lumps = Math.max(3, Math.round(rw / 4)), i, x, y;
    for (i = 0; i < lumps; i++) {
      var lx = cx + Math.round((i / (lumps - 1 || 1) - 0.5) * rw * 1.4), ly = cy + rng.int(-1, 1), r = rng.range(rw * 0.35, rw * 0.6), q = rh * rng.range(0.8, 1.2);
      for (y = -Math.ceil(q); y <= Math.ceil(q * 0.6); y++) for (x = -Math.ceil(r); x <= Math.ceil(r); x++) {
        var e = (x * x) / (r * r) + (y * y) / (q * q);
        if (e > 1 || (e > 0.7 && n01(lx + x, ly + y) < 0.35)) continue;
        var l = -y / q * 0.8 - x / r * 0.35;
        A.px(ctx, l > 0.45 ? K.lit : (l > -0.2 ? K.mid : K.dark), lx + x, ly + y);
      }
    }
  }
  function oldPine(ctx, x, gy, h, K, rng) {
    var lean = rng.range(-0.05, 0.05), y, i;
    for (y = 0; y < h; y++) {
      var tx = x + Math.round(lean * y), tw = y < h * 0.5 ? 4 : (y < h * 0.8 ? 3 : 2);
      A.box(ctx, K.trunk, tx, gy - y, tw, 1);
      if (n01(tx, gy - y) < 0.3) A.px(ctx, K.mid, tx, gy - y);
    }
    for (i = 0; i < 3; i++) {                                                      // dead limbs low on the trunk
      var by = gy - Math.round(h * rng.range(0.25, 0.45)), dir = rng.next() < 0.5 ? -1 : 1, len = rng.int(4, 9);
      for (var s = 0; s < len; s++) A.px(ctx, K.trunk, x + Math.round(lean * (gy - by)) + dir * (s + 1), by - (s >> 1));
    }
    var n = rng.int(7, 10), side = rng.next() < 0.5 ? -1 : 1, top = { x: x, y: gy - h };
    for (i = 0; i < n; i++) {
      var f = i / (n - 1), py = gy - Math.round(h * (0.42 + 0.58 * f)), tx2 = x + Math.round(lean * (gy - py));
      var rw = Math.max(5, Math.round(rng.range(13, 24) * (1 - f * 0.6))), off = side * Math.round(rng.range(4, 14) * (1 - f * 0.7));
      A.line(ctx, K.trunk, tx2, py + 2, tx2 + off, py);
      pad(ctx, tx2 + off, py, rw, rng.range(3.5, 6), K, rng);
      if (rng.next() < 0.75) side = -side;
      top.x = tx2; top.y = py;
    }
    return top;
  }
  // L: base, height, gap [lo, hi] (scaled), mix {old, spruce, pine}, features [{kind: 'nest', x}].
  function oldpines(ctx, L, w, wy, rng) {
    var x, kinds = ['old'];
    for (x = rng.int(0, L.gap[0]); x < w + 10; x += rng.int(L.gap[0], L.gap[1])) {
      var roll = rng.next(), h = Math.round(L.height * rng.range(0.7, 1.1)), gy = L.base + rng.int(0, 3);
      if (roll < L.mix.old) oldPine(ctx, x, gy, h, PINE, rng);
      else if (roll < L.mix.old + L.mix.spruce) { A.TREES.spruce(ctx, x, gy, Math.round(h * 0.9), PINE, rng); if (kinds.indexOf('spruce') < 0) kinds.push('spruce'); }
      else { A.TREES.pine(ctx, x, gy, Math.round(h * 0.7), PINE, rng); if (kinds.indexOf('pine') < 0) kinds.push('pine'); }
    }
    var f = L.features || [];
    for (var i = 0; i < f.length; i++) if (f[i].kind === 'nest') {
      var t = oldPine(ctx, f[i].x, L.base + 2, Math.round(L.height * 1.05), PINE, rng);
      nest(ctx, t.x, t.y - 3);
      kinds.push('nest');
    }
    return kinds;
  }
  // The eagle's nest, a wide bowl of sticks on the top pad, and the eagle on it, looking out.
  function nest(ctx, x, y) {
    var i;
    A.box(ctx, 'wood_deep', x - 7, y, 15, 3); A.box(ctx, 'wood_dark', x - 6, y, 13, 1);
    for (i = -7; i <= 7; i += 2) A.px(ctx, (i & 2) ? 'wood' : 'wood_dark', x + i, y + 1 + (i & 1));
    A.line(ctx, 'wood_dark', x - 9, y + 1, x - 6, y + 2); A.line(ctx, 'wood_dark', x + 8, y + 2, x + 10, y);
    A.box(ctx, 'ink', x - 2, y - 7, 4, 7); A.box(ctx, 'wood_deep', x - 1, y - 6, 2, 5);   // the body, folded wings
    A.box(ctx, 'ink', x - 3, y - 3, 1, 4); A.box(ctx, 'stone_hi', x + 2, y - 2, 2, 2);   // the wing's edge, the tail
    A.box(ctx, 'bone', x - 1, y - 10, 3, 3); A.px(ctx, 'signal_amber', x + 2, y - 9); A.px(ctx, 'ink', x + 1, y - 9); // the white head, the beak
  }

  // ---- granite ----------------------------------------------------------------------------------
  // L: size [lo, hi] (world px wide), gap [lo, hi] (scaled), base (the boulders' foot, scaled),
  // trees (0..1 share of boulders with a tree on them), brush (clumps per boulder).
  function boulder(ctx, cx, foot, rw, rh, rng) {
    var x, y, ph = rng.range(0, 6), top = [];
    for (x = -rw; x <= rw; x++) {
      var u = x / rw, t = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.2)), 0.55);
      top.push(Math.round(foot - rh * t * (0.92 + 0.08 * Math.sin(u * 5 + ph))));
    }
    for (x = -rw; x <= rw; x++) {
      var ty = top[x + rw], X = cx + x;
      for (y = ty; y <= foot; y++) {
        var v = (foot - y) / rh, u2 = x / rw, edge = y === ty || x === -rw || x === rw;
        var l = v * 0.9 - u2 * 0.5 + (n01(X, y) - 0.5) * 0.25 - (y - ty) / (rh + 1) * 0.3;
        var key = edge ? ROCK[0] : (l > 0.62 ? ROCK[3] : (l > 0.32 ? ROCK[2] : (l > 0.02 ? ROCK[1] : ROCK[0])));
        if (!edge && y - ty < 3 && n01(X, y + 7) < 0.4) key = n01(X, y) < 0.3 ? 'lichen_hi' : 'lichen';  // lichen and moss along the top
        A.px(ctx, key, X, y);
      }
    }
    var cracks = rng.int(1, 3);                                                     // a few cracks down the face
    for (var c = 0; c < cracks; c++) {
      var sx = cx + rng.int(-rw + 4, rw - 4), sy = top[sx - cx + rw] + rng.int(3, 6), len = rng.int(4, Math.max(5, rh >> 1)), dx = rng.next() < 0.5 ? -1 : 1;
      for (var k = 0; k < len; k++) A.px(ctx, ROCK[0], sx + ((k >> 1) * dx >> 1), sy + k);
    }
    return top;
  }
  function brush(ctx, x, foot, wdt, h, rng) {
    var n = Math.round(wdt * h * 0.9);
    for (var i = 0; i < n; i++) {
      var dy = Math.floor(Math.pow(rng.next(), 1.6) * h), dx = rng.int(-wdt, wdt) * (1 - dy / (h + 1) * 0.5);
      var key = dy > h * 0.6 && rng.next() < 0.5 ? SHRUB[2] : (rng.next() < 0.45 ? SHRUB[0] : SHRUB[1]);
      A.px(ctx, key, Math.round(x + dx), foot - dy);
    }
  }
  function granite(ctx, L, w, wy, rng) {
    var x, foot = L.base, kinds = ['boulders', 'brush'];
    A.box(ctx, ROCK[0], 0, foot - 3, w, wy - foot + 3);
    for (x = rng.int(0, L.gap[0]); x < w + 20; x += rng.int(L.gap[0], L.gap[1])) {
      var rw = Math.round(rng.range(L.size[0], L.size[1]) * HI / 2), rh = Math.round(rw * rng.range(0.32, 0.5));
      brush(ctx, x - rw - 4, foot, rng.int(8, 18), rng.int(12, 28), rng);
      var top = boulder(ctx, x, foot, rw, rh, rng);
      if (rng.next() < L.trees) {
        var tx = rng.int(-rw >> 1, rw >> 1), gy = top[tx + rw] + 2, larch = rng.next() < 0.6;
        A.TREES[larch ? 'larch' : 'spruce'](ctx, x + tx, gy, rng.int(24, 56), larch ? LARCH : PINE, rng);
        if (kinds.indexOf(larch ? 'larch' : 'spruce') < 0) kinds.push(larch ? 'larch' : 'spruce');
      }
      for (var b = 0; b < (L.brush || 2); b++) brush(ctx, x + rng.int(-rw, rw), foot - (rng.int(0, rh >> 2)), rng.int(6, 14), rng.int(8, 18), rng);
    }
    return kinds;
  }

  G.scene.scenery.creek = {
    paint: { oldpines: oldpines, granite: granite, fbhills: FB.paint.fbhills },
    cloudMask: FB.cloudMask
  };
})();
