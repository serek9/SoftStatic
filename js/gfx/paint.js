var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Painters for the baked world layers (Phase 15; repainted at 640×360 in Phase 18): mountain
// ranges with lit and shadowed faces, snow, gullies and haze, forests of tiered conifers and
// autumn trees, shores with rocks and reeds, and long cloud banks, all in flat clusters. Each is baked once into a layer (gfx/bake.js), so none of this
// costs anything per frame. Every painter draws from the private seeded stream it is given
// (never G.rng or G.vrng) and names palette keys only.
//
// A painter is fn(ctx, L, w, wy, rng): L is the layer's data (data/loc_*.js) with its lengths
// scaled to the layer's pixels, w its width, wy the waterline (the layer's height). Since
// Phase 18 layers are baked at twice the world's resolution (sailing.js).
G.gfx = G.gfx || {};
G.gfx.paint = (function () {
  var P = G.gfx.sprites.PALETTE;

  // 4×4 ordered dither: dither(x, y, t) is true for a share t (0..1) of pixels, evenly spread.
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dither(x, y, t) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t; }

  // Setting fillStyle parses a colour string, so it is only set when the key changes (these
  // painters fill one pixel at a time, tens of thousands per layer).
  var penCtx = null, penKey = '';
  function pen(ctx, key) { if (ctx !== penCtx || key !== penKey) { ctx.fillStyle = P[key]; penCtx = ctx; penKey = key; } }
  function px(ctx, key, x, y) { pen(ctx, key); ctx.fillRect(x, y, 1, 1); }

  // Smooth value noise over a seeded lattice; ridged() turns it into sharp peaks.
  function lattice(rng, n) { var a = new Float32Array(n + 2); for (var i = 0; i < a.length; i++) a[i] = rng.next(); return a; }
  function noiseAt(lat, x, step) {
    var u = x / step, i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f);
    return lat[i % (lat.length - 1)] * (1 - s) + lat[(i + 1) % (lat.length - 1)] * s;
  }

  // ---- Mountains (Phase 18: 640×360) ---------------------------------------------------
  // L: {base, amp, color, lit, dark, haze, cap?} in layer pixels (the caller scales the data).
  // A range of peaks, the tallest at the back: each a jagged triangle whose left face takes
  // the light (L.lit) and whose right face is in shadow (L.dark, or L.color), split along a
  // wandering ridge line; snow on the high peaks (lit and shadowed), gullies down the lit
  // faces, and a haze at the foot. Flat clusters only. Returns the silhouette's top per column.
  function mountains(ctx, L, w, wy, rng) {
    var top = new Int16Array(w + 1), x, y, i;
    for (x = 0; x <= w; x++) top[x] = wy;
    var peaks = [], n = Math.max(3, Math.round(w / (L.amp * 1.5)));
    for (i = 0; i < n; i++) {
      var hgt = L.amp * rng.range(0.45, 1), px0 = (i + rng.range(-0.3, 0.3)) * w / n;
      peaks.push({ x: px0, y: L.base - hgt, h: hgt, sl: rng.range(0.9, 1.7), sr: rng.range(1, 1.9), rs: rng.range(0.1, 0.6), seed: rng.int(1, 9999) });
    }
    peaks.sort(function (a, b) { return a.h - b.h; }).reverse();
    var shadow = L.dark || L.color, snowLit = L.snow || 'fog_light', snowDark = L.snowDark || L.lit;
    for (i = 0; i < peaks.length; i++) {
      var p = peaks[i], jag = new G.core.rng.Rng(p.seed), capH = p.h > L.amp * 0.68 ? p.h * jag.range(0.16, 0.28) : 0;
      var jl = 0, jr = 0, jc = 0, wig = 0;
      for (y = Math.ceil(p.y); y < wy; y++) {
        var d = y - p.y;
        jl = Math.max(-3, Math.min(3, jl + jag.int(-1, 1))); jr = Math.max(-3, Math.min(3, jr + jag.int(-1, 1)));
        wig = Math.max(-2, Math.min(2, wig + jag.int(-1, 1))); jc = Math.max(-3, Math.min(3, jc + jag.int(-1, 1)));
        var xl = Math.round(p.x - d * p.sl + jl), xr = Math.round(p.x + d * p.sr + jr), ridge = Math.round(p.x + d * p.rs + wig);
        // At most three runs a row: the lit face, the ridge's edge, the shadowed face.
        var a0 = Math.max(0, xl), a1 = Math.min(w - 1, xr);
        if (a1 < a0) continue;
        var snow = capH && d < capH + jc && d < capH * 1.4, haze = L.haze && y > wy - (wy - L.base) * 0.55 - 6;
        var r0 = Math.max(a0, Math.min(a1 + 1, ridge)), e0 = d > 4 && !snow ? Math.max(a0, r0 - 3) : r0;
        if (haze) { pen(ctx, L.haze); ctx.fillRect(a0, y, a1 - a0 + 1, 1); }
        else {
          if (e0 > a0) { pen(ctx, snow ? snowLit : L.lit); ctx.fillRect(a0, y, e0 - a0, 1); }
          if (r0 > e0) { pen(ctx, L.color); ctx.fillRect(e0, y, r0 - e0, 1); }
          if (a1 >= r0) { pen(ctx, snow ? snowDark : shadow); ctx.fillRect(r0, y, a1 - r0 + 1, 1); }
        }
        for (x = a0; x <= a1; x++) if (y < top[x]) top[x] = y;
      }
      // Gullies: a few dark streaks running down the lit face from the snow or the crest.
      var gn = Math.round(p.h / 22);
      for (var g = 0; g < gn; g++) {
        var gx = p.x - jag.range(4, p.h * p.sl * 0.5), gy = p.y + Math.abs(gx - p.x) / p.sl + 2, len = jag.int(8, Math.round(p.h * 0.6));
        for (var s = 0; s < len; s++) {
          var yy = Math.round(gy + s), xx = Math.round(gx - s * 0.35 + Math.sin(s * 0.3) * 1.5);
          if (xx < 0 || xx >= w || yy >= wy - (wy - L.base) * 0.55 - 6 || yy <= top[xx] + 1) continue;
          if (s % 9 < 6) { pen(ctx, L.color); ctx.fillRect(xx, yy, 1, 1); }
        }
      }
    }
    if (L.haze) { pen(ctx, L.haze); for (x = 0; x < w; x++) if (top[x] < wy) { var hy = Math.max(top[x], Math.round(wy - (wy - L.base) * 0.55 - 6)); ctx.fillRect(x, hy, 1, wy - hy); } }
    return top;
  }

  // ---- Trees ------------------------------------------------------------------------------
  // A conifer: tiers of boughs that droop at their tips, lit along the left edge of each
  // tier, dark on the right, with a few lit tufts. keys: {dark, mid, lit, trunk}.
  function pine(ctx, x, gy, h, k, rng) {
    var hw = Math.max(3, Math.round(h * rng.range(0.17, 0.22))), tiers = Math.max(3, Math.round(h / rng.range(7, 10))), y;
    var top = gy - h, foot = gy - Math.round(h * 0.08), th = (foot - top) / tiers;
    pen(ctx, k.trunk || k.dark); ctx.fillRect(x, foot - 2, 1, gy - foot + 2);
    for (y = top; y < foot; y++) {
      var r = (y - top) / (foot - top), ti = Math.floor((y - top) / th), inT = ((y - top) - ti * th) / th;
      var half = Math.round(hw * (0.15 + 0.85 * r) * (0.45 + 0.55 * inT));
      if (y === top) { px(ctx, k.mid, x, y); continue; }
      var litTo = -half + Math.max(1, half * 0.3), darkFrom = half * 0.25;
      if (inT > 0.82) { pen(ctx, k.dark); ctx.fillRect(x - half, y, half * 2 + 1, 1); pen(ctx, k.lit); ctx.fillRect(x - half, y, 1, 1); } // the shadow under a tier
      else {
        var l1 = Math.floor(litTo) + 1, d0 = Math.floor(darkFrom) + 1;
        pen(ctx, k.lit); ctx.fillRect(x - half, y, l1 + half, 1);
        if (d0 > l1) { pen(ctx, k.mid); ctx.fillRect(x + l1, y, d0 - l1, 1); }
        pen(ctx, k.dark); ctx.fillRect(x + Math.max(l1, d0), y, half - Math.max(l1, d0) + 1, 1);
      }
      if (inT > 0.75 && half > 2) { px(ctx, k.dark, x - half - 1, y + 1); px(ctx, k.dark, x + half + 1, y + 1); } // drooping tips
    }
  }

  // A deciduous tree (autumn or summer): a crown of overlapping round clumps, each shaded in
  // flat bands toward the light, over a dark trunk. keys: {dark, mid, lit, trunk}.
  function round(ctx, x, gy, h, k, rng) {
    var cw = Math.round(h * rng.range(0.32, 0.42)), cy = gy - h + cw, i;
    pen(ctx, k.trunk); ctx.fillRect(x, cy, 2, gy - cy);
    pen(ctx, k.trunk); ctx.fillRect(x - 2, cy + Math.round(cw * 0.6), 2, 1); ctx.fillRect(x + 2, cy + Math.round(cw * 0.4), 2, 1);
    var clumps = rng.int(5, 8);
    for (i = 0; i < clumps; i++) {
      var ccx = x + rng.int(-cw + 3, cw - 3), ccy = cy - rng.int(0, cw) + 3, rr = rng.int(4, Math.max(5, Math.round(cw * 0.65)));
      for (var yy = -rr; yy <= rr; yy++) {
        var hw = Math.floor(Math.sqrt(rr * rr - yy * yy)), run = '', rx0 = 0;
        for (var xx = -hw; xx <= hw + 1; xx++) {
          var key = '';
          if (xx <= hw) { var light = (-xx * 0.6 - yy * 0.8) / rr; key = light > 0.3 ? k.lit : (light > -0.35 ? k.mid : k.dark); }
          if (key !== run) { if (run) { pen(ctx, run); ctx.fillRect(ccx + rx0, ccy + yy, xx - rx0, 1); } run = key; rx0 = xx; }
        }
      }
    }
  }

  // A birch: a pale trunk with dark marks, a few thin branches, a light crown.
  function birch(ctx, x, gy, h, k, rng) {
    for (var y = gy - h + 6; y < gy; y++) { px(ctx, k.bark, x, y); px(ctx, (y % 7) < 2 ? 'ink' : 'stone_hi', x + 1, y); if ((y % 11) === 3) px(ctx, 'ink', x, y); }
    for (var i = 0; i < 5; i++) {
      var by = gy - h + rng.int(4, Math.round(h * 0.55)), len = rng.int(4, 9), dir = rng.next() < 0.5 ? -1 : 1;
      for (var s = 0; s < len; s++) px(ctx, s > 3 ? k.mid : k.bark, x + dir * s, by - (s >> 1));
    }
    round(ctx, x, gy - Math.round(h * 0.42), Math.round(h * 0.58), k, rng);
  }

  // Phase 49: three more silhouettes for the far woods. A spruce: a narrow spire of short
  // drooping tiers. keys as pine.
  function spruce(ctx, x, gy, h, k, rng) {
    var hw = Math.max(2, Math.round(h * rng.range(0.1, 0.13))), top = gy - h, y;
    pen(ctx, k.trunk || k.dark); ctx.fillRect(x, gy - 3, 1, 3);
    for (y = top; y < gy - 2; y++) {
      var r = (y - top) / (gy - 2 - top), half = Math.round(hw * r * (0.55 + 0.45 * (((y - top) % 4) / 3)));
      pen(ctx, k.lit); ctx.fillRect(x - half, y, 1, 1);
      if (half > 0) { pen(ctx, k.mid); ctx.fillRect(x - half + 1, y, half, 1); pen(ctx, k.dark); ctx.fillRect(x + 1, y, half, 1); }
    }
    px(ctx, k.mid, x, top - 1);
  }
  // A dead tree: a bare grey trunk, a broken top, and a few crooked limbs. keys as pine (the
  // trunk key, lit along its left side by k.mid).
  function dead(ctx, x, gy, h, k, rng) {
    var top = gy - Math.round(h * 0.9), y, i;
    pen(ctx, k.trunk || k.dark); ctx.fillRect(x, top, 2, gy - top);
    pen(ctx, k.mid); ctx.fillRect(x, top + 2, 1, gy - top - 2);
    for (i = 0; i < 4; i++) {
      var by = top + rng.int(2, Math.round(h * 0.5)), len = rng.int(4, 10), dir = i % 2 ? 1 : -1;
      for (var s = 0; s < len; s++) px(ctx, k.trunk || k.dark, x + (dir > 0 ? 2 : -1) + dir * s, by - Math.round(s * 0.7));
      px(ctx, k.trunk || k.dark, x + (dir > 0 ? 2 : -1) + dir * (len - 1), by - Math.round(len * 0.7) - 1);
    }
    for (y = 0; y < 3; y++) px(ctx, k.trunk || k.dark, x + (y & 1), top - 1 - y);   // the broken top
  }
  // A poplar: a tall narrow column of foliage on a short trunk. keys as round.
  function poplar(ctx, x, gy, h, k, rng) {
    var hw = Math.max(3, Math.round(h * rng.range(0.13, 0.17))), top = gy - h, foot = gy - Math.round(h * 0.15), y;
    pen(ctx, k.trunk); ctx.fillRect(x, foot - 1, 2, gy - foot + 1);
    for (y = top; y < foot; y++) {
      var u = (y - top) / (foot - top), half = Math.max(1, Math.round(hw * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (0.85 + 0.15 * (((y >> 2) & 1)))));
      var l = Math.max(1, Math.round(half * 0.6));
      pen(ctx, k.lit); ctx.fillRect(x - half + 1, y, l, 1);
      pen(ctx, k.mid); ctx.fillRect(x - half + 1 + l, y, Math.max(0, half - l + 1), 1);
      pen(ctx, k.dark); ctx.fillRect(x + 2, y, half - 1, 1);
    }
  }

  var TREES = { pine: pine, round: round, birch: birch, spruce: spruce, dead: dead, poplar: poplar };
  var TREE_KEYS = { spruce: 'pine', dead: 'pine', poplar: 'round' }; // a kind without its own keys borrows these

  // L: {base (ground y), height, gap [lo, hi], mix {pine, round, birch}, keys {...} per kind,
  // back (optional: a first, smaller, darker row with keys back)}. A dense back row in the
  // dark key fills the gaps, then the trees themselves.
  // Returns the kinds of tree it painted (Phase 49: sailing records them for dbg.shore()).
  function forest(ctx, L, w, wy, rng) {
    var kinds = [];
    function row(base, height, gap, keys, kindOnly) {
      for (var x = rng.int(0, gap[0]); x < w + 10; x += rng.int(gap[0], gap[1])) {
        var h = Math.round(height * rng.range(0.6, 1.15)), roll = rng.next(), kind = 'pine', acc = 0;
        for (var m in L.mix) { acc += L.mix[m]; if (roll < acc) { kind = m; break; } }
        if (kindOnly) kind = kindOnly;
        if (kinds.indexOf(kind) < 0) kinds.push(kind);
        TREES[kind](ctx, x, base + rng.int(0, 3), h, keys[kind] || keys[TREE_KEYS[kind]] || keys.pine, rng);
      }
    }
    var dark = L.keys.pine ? L.keys.pine.dark : L.keys.round.dark;
    pen(ctx, dark); ctx.fillRect(0, L.base - 2, w, wy - L.base + 2);
    var backKeys = { pine: { dark: dark, mid: dark, lit: L.keys.pine ? L.keys.pine.mid : L.keys.round.mid, trunk: dark } };
    row(L.base - 3, L.height * 0.55, [3, 6], backKeys, 'pine');
    kinds.length = 0; // the back row is a dark fill, not a kind of tree you see
    row(L.base, L.height, L.gap || [4, 12], L.keys);
    return kinds;
  }

  // ---- Shore --------------------------------------------------------------------------------
  // L: {height, rock {dark, mid, lit}, reeds 0..1, reedH, rockEvery, ground}. Boulders sit on
  // the waterline, outlined and lit on the top left; reeds stand in clumps with cattails;
  // tufts of grass along the top of the bank. Phase 49: L.features (each {kind, x} in layer
  // px: 'posts' (an old dock's, n of them), 'moored' (a rowboat tied up, its lantern lit at
  // night by life.js), 'lodge' (a beaver's), 'duckbox' (on a pole)) stand behind the rocks;
  // L.trunks fallen trunks reach into the water, L.cattails more clumps, L.pads lily pads lie
  // on the water. Returns the kinds of thing it painted.
  function shore(ctx, L, w, wy, rng) {
    var x, i, r = L.rock || { dark: 'rock_dark', mid: 'rock', lit: 'rock_lit' }, t = 0, kinds = ['rocks', 'reeds', 'grass'];
    pen(ctx, L.ground || 'rock_dark');
    for (x = 0; x < w; x++) { t = Math.max(-2, Math.min(2, t + rng.int(-1, 1))); ctx.fillRect(x, wy - L.height + t, 1, L.height - t); }
    var f = L.features || [];
    for (i = 0; i < f.length; i++) if (SHORE_THINGS[f[i].kind]) { SHORE_THINGS[f[i].kind](ctx, f[i], wy, L, rng); if (kinds.indexOf(f[i].kind) < 0) kinds.push(f[i].kind); }
    var n = Math.round(w / (L.rockEvery || 80));
    for (i = 0; i < n; i++) {
      var cx = rng.int(0, w - 1), rw = rng.int(6, 18), rh = rng.int(4, Math.max(5, Math.round(rw * 0.7)));
      for (var yy = -rh - 1; yy <= 0; yy++) for (var xx = -rw - 1; xx <= rw + 1; xx++) {
        var e = (xx * xx) / (rw * rw) + (yy * yy) / (rh * rh);
        if (e > 1.25) continue;
        if (e > 1) { px(ctx, 'ink', cx + xx, wy - 1 + yy); continue; }
        var l = -xx / rw * 0.55 - yy / rh * 0.6;
        px(ctx, l > 0.3 ? r.lit : (l > -0.15 ? r.mid : r.dark), cx + xx, wy - 1 + yy);
      }
      px(ctx, r.lit, cx - (rw >> 1), wy - rh);
    }
    var clumps = Math.round(w / 26 * (L.reeds === undefined ? 0.6 : L.reeds));
    for (i = 0; i < clumps; i++) {
      var bx = rng.int(0, w - 1), stalks = rng.int(4, 10), lean = rng.range(-0.25, 0.25);
      for (var s = 0; s < stalks; s++) {
        var sx = bx + rng.int(-5, 5), h = rng.int(6, L.reedH || 24), key = s % 3 === 0 ? 'reed_hi' : (s % 3 === 1 ? 'reed' : 'reed_dark');
        for (var k = 0; k < h; k++) px(ctx, key, sx + Math.round(lean * k * (k / h)), wy - 2 - k);
        if (h > 14 && s % 4 === 0) { pen(ctx, 'wood_dark'); ctx.fillRect(sx + Math.round(lean * h) - 1, wy - 3 - h - 4, 2, 5); px(ctx, 'reed_dark', sx + Math.round(lean * h), wy - 3 - h - 6); }
      }
    }
    for (i = 0; i < w / 6; i++) {
      var gx = rng.int(0, w - 1), gy = wy - L.height - rng.int(-1, 1);
      px(ctx, 'moss', gx, gy); px(ctx, 'moss_dark', gx + 1, gy + 1); if (i % 3 === 0) px(ctx, 'moss_hi', gx, gy - 1);
    }
    // Phase 49: the scattered things, from the layer's own stream after everything above.
    for (i = 0; i < (L.trunks || 0); i++) trunk(ctx, rng.int(20, w - 20), wy, L, rng);
    for (i = 0; i < (L.cattails || 0); i++) cattails(ctx, rng.int(6, w - 6), wy, rng);
    for (i = 0; i < (L.pads || 0); i++) pad(ctx, rng.int(4, w - 4), wy, rng);
    if (L.trunks) kinds.push('trunks');
    if (L.cattails) kinds.push('cattails');
    if (L.pads) kinds.push('pads');
    return kinds;
  }

  // ---- The shore's things (Phase 49), in layer px; wy is the waterline ------------------
  var WOODS = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'];
  // A fallen trunk: its root plate on the bank, the trunk sloping down into the water, a few
  // broken limbs standing up from it.
  function trunk(ctx, x, wy, L, rng) {
    var dir = rng.next() < 0.5 ? -1 : 1, len = rng.int(26, 48), th = rng.int(3, 5), y0 = wy - L.height - th - 2, s;
    for (s = 0; s <= len; s++) {
      var X = x + dir * s, Y = Math.round(y0 + (wy - 1 - y0 + 1) * s / len);
      box(ctx, 'wood_dark', X, Y, 1, th); px(ctx, 'wood_mid', X, Y); if (th > 3) px(ctx, 'wood', X, Y + 1);
      if (s % 9 === 5) px(ctx, 'wood_deep', X, Y + 2);
    }
    for (s = 0; s < 3; s++) {
      var bs = rng.int(6, len - 6), bx = x + dir * bs, by = Math.round(y0 + (wy - y0) * bs / len), bl = rng.int(4, 9);
      line(ctx, 'wood_dark', bx, by, bx + dir * (bl >> 1), by - bl);
    }
    blob(ctx, x - dir * 2, y0 + 1, 3, th + 1, ['ink', 'wood_deep', 'wood_dark'], { rim: 0 });          // the root plate
    for (s = 0; s < 4; s++) line(ctx, 'wood_deep', x - dir * 2, y0 + 1, x - dir * rng.int(3, 7), y0 + rng.int(-5, 6));
  }
  // A clump of cattails: tall blades and stalks with their brown heads.
  function cattails(ctx, x, wy, rng) {
    var n = rng.int(3, 6), k;
    for (var s = 0; s < n; s++) {
      var sx = x + rng.int(-4, 4), h = rng.int(16, 28), lean = rng.range(-0.15, 0.15);
      for (k = 0; k < h; k++) px(ctx, s % 2 ? 'reed' : 'reed_dark', sx + Math.round(lean * k), wy - 2 - k);
      var hx = sx + Math.round(lean * h);
      box(ctx, 'wood_dark', hx - 1, wy - 2 - h - 6, 2, 6); px(ctx, 'wood', hx - 1, wy - 2 - h - 6); px(ctx, 'reed_dark', hx, wy - 2 - h - 8); px(ctx, 'reed_dark', hx, wy - 2 - h - 7);
      if (s % 2 === 0) { var bl = rng.int(8, 16), bd = rng.next() < 0.5 ? -1 : 1; for (k = 0; k < bl; k++) px(ctx, 'reed_hi', sx + bd * Math.round(k * k / (bl * 2)), wy - 2 - k); } // a curving blade
    }
  }
  // A lily pad lying on the water (now and then a flower), its notch toward us.
  function pad(ctx, x, wy, rng) {
    var hw = rng.int(4, 7);
    box(ctx, 'moss_dark', x - hw, wy - 1, hw * 2, 2); box(ctx, 'moss', x - hw + 1, wy - 1, hw * 2 - 3, 1);
    px(ctx, 'moss_dark', x + rng.int(-2, 2), wy - 1);
    if (rng.next() < 0.3) { px(ctx, 'paper', x - 1, wy - 3); px(ctx, 'paper', x, wy - 2); px(ctx, 'dusk_rose', x, wy - 3); px(ctx, 'paper', x + 1, wy - 3); }
  }
  var SHORE_THINGS = {
    // An old dock's posts standing in a row out of the water, weathered to different heights;
    // a stringer still nailed across the first two.
    posts: function (ctx, f, wy, L, rng) {
      for (var i = 0; i < (f.n || 4); i++) {
        var X = f.x + i * 10 + rng.int(-1, 1), h = Math.max(6, 22 - i * 3 + rng.int(-3, 3));
        slab(ctx, X, wy - h, 3, h, WOODS);
        px(ctx, 'wood_deep', X + 1, wy - h);
      }
      box(ctx, 'wood_dark', f.x, wy - 16, 13, 2); box(ctx, 'wood_mid', f.x, wy - 16, 13, 1);
    },
    // A rowboat tied up at the shore: the hull on the water, a seat, oars shipped, the painter
    // to a stake, and a lantern on a short pole at the stern (life.js lights it at night).
    moored: function (ctx, f, wy) {
      var x0 = f.x - 14, i;
      for (i = 0; i < 28; i++) {
        var lift = i < 4 ? 4 - i : (i > 23 ? i - 23 : 0), y = wy - 6 + Math.round(lift * 0.5);
        box(ctx, 'wood_dark', x0 + i, y, 1, wy - y); px(ctx, 'wood_mid', x0 + i, y); px(ctx, 'wood_deep', x0 + i, wy - 2);
      }
      box(ctx, 'wood', x0 + 12, wy - 8, 5, 2);                                  // the seat
      line(ctx, 'wood_mid', x0 + 6, wy - 9, x0 + 22, wy - 7);                     // an oar
      slab(ctx, x0 - 10, wy - 9, 2, 9, WOODS); line(ctx, 'stone', x0 - 8, wy - 8, x0 + 1, wy - 6); // the stake and painter
      box(ctx, 'stone_dark', x0 + 25, wy - 18, 1, 12);                             // the lantern's pole
      box(ctx, 'stone_dark', x0 + 23, wy - 22, 5, 4); box(ctx, 'ink', x0 + 24, wy - 21, 3, 2);
    },
    // A beaver's lodge: a low dome of sticks and mud at the water's edge.
    lodge: function (ctx, f, wy, L, rng) {
      blob(ctx, f.x, wy - 1, 18, 12, ['ink', 'wood_deep', 'wood_dark', 'wood'], { rim: 0.3, bias: -0.15 });
      box(ctx, 'wood_deep', f.x - 19, wy - 2, 38, 2);
      for (var i = 0; i < 26; i++) {
        var a = rng.range(0.15, 2.99), rr = rng.range(4, 15), sx = Math.round(f.x + Math.cos(a) * rr), sy = Math.round(wy - 1 - Math.sin(a) * rr * 0.7), l = rng.int(3, 7), d = rng.next() < 0.5 ? -1 : 1;
        line(ctx, i % 3 ? 'wood_mid' : 'wood_hi', sx, sy, sx + d * l, sy - rng.int(-1, 2));
      }
    },
    // A nesting box for ducks on a pole standing in the water.
    duckbox: function (ctx, f, wy) {
      slab(ctx, f.x, wy - 26, 2, 26, WOODS);
      slab(ctx, f.x - 4, wy - 35, 10, 9, WOODS);
      box(ctx, 'wood_deep', f.x - 5, wy - 36, 12, 2); box(ctx, 'wood_mid', f.x - 5, wy - 36, 12, 1);
      box(ctx, 'ink', f.x - 1, wy - 32, 3, 3);
    }
  };

  // ---- Clouds -------------------------------------------------------------------------------
  // A cloud field as a level mask (0 none, 1 shadow, 2 body, 3 lit) so the same shapes can be
  // baked in several colourings: long low banks of puffs with flat undersides, lit along the
  // top, shaded below, trailing thin streaks (s scales the sizes).
  function cloudMask(w, h, rng, count, s) {
    s = s || 1;
    var m = new Uint8Array(w * h), c, i;
    for (c = 0; c < count; c++) {
      var cx = rng.int(0, w - 1), base = rng.int(Math.round(14 * s), Math.round(h * 0.55)), len = rng.int(50, 150) * s, puffs = rng.int(4, 8);
      for (i = 0; i < puffs; i++) {
        var px0 = cx + Math.round((i / Math.max(1, puffs - 1) - 0.5) * len * 0.8) + rng.int(-6, 6) * s;
        var r = rng.int(4, 9) * s * (i === 0 || i === puffs - 1 ? 0.7 : 1);
        for (var yy = -Math.ceil(r); yy <= 0; yy++) for (var xx = -Math.ceil(r * 1.9); xx <= Math.ceil(r * 1.9); xx++) {
          if ((xx * xx) / (r * r * 3.6) + (yy * yy) / (r * r) > 1) continue;
          var X = ((px0 + xx) % w + w) % w, Y = base + yy;
          if (Y < 0 || Y >= h) continue;
          var lvl = yy > -2 * s ? 1 : (yy < -r * 0.5 ? 3 : 2);
          if (lvl > m[Y * w + X]) m[Y * w + X] = lvl;
        }
      }
      for (i = 0; i < 4; i++) {
        var sy = base - rng.int(0, 5 * s), sx = cx - rng.int(0, len), sl = rng.int(30, 90) * s;
        for (var q = 0; q < sl; q++) { var SX = ((sx + q) % w + w) % w; if (sy >= 0 && sy < h && !m[sy * w + SX] && (q % 17) < 14) m[sy * w + SX] = 2; }
      }
    }
    return m;
  }

  // Bakes mask m with keys [shadow, body, lit] (null skips a level), in runs of one key.
  function paintMask(ctx, m, w, h, keys) {
    for (var y = 0; y < h; y++) {
      var run = '', x0 = 0;
      for (var x = 0; x <= w; x++) {
        var k = '';
        if (x < w) { var v = m[y * w + x]; if (v && keys[v - 1]) k = keys[v - 1]; }
        if (k !== run) {
          if (run) { pen(ctx, run); ctx.fillRect(x0, y, x - x0, 1); }
          run = k; x0 = x;
        }
      }
    }
  }

  // ---- Shading helpers for the 640×360 interiors (Phase 17) ------------------------------

  function box(ctx, key, x, y, w, h) { pen(ctx, key); ctx.fillRect(x, y, w, h); }

  // A small integer hash in 0..1 (tones and grain that need no RNG stream).
  function hash2(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // One key of a ramp (dark to light) for a value v in 0..1, in clean steps: the 640×360
  // art (Phase 17) is shaded in flat clusters, never dithered (x, y are kept for callers).
  function tone(keys, v, x, y) {
    var n = keys.length - 1, i = Math.round(Math.max(0, Math.min(1, v)) * n);
    return keys[i];
  }

  // A shaded ellipse, lit from the top left; o: {bias, rim (edge darkening), lx, ly}.
  function blob(ctx, cx, cy, rx, ry, keys, o) {
    o = o || {};
    var bias = o.bias || 0, rim = o.rim === undefined ? 0.18 : o.rim, lx = o.lx === undefined ? 0.6 : o.lx, ly = o.ly === undefined ? 0.75 : o.ly;
    for (var y = Math.ceil(-ry); y <= Math.floor(ry); y++) {
      var run = '', x0 = 0, X0 = Math.ceil(-rx), X1 = Math.floor(rx);
      for (var x = X0; x <= X1 + 1; x++) {
        var k = '';
        if (x <= X1) {
          var nx = x / rx, ny = y / ry, d = nx * nx + ny * ny;
          if (d <= 1) k = tone(keys, 0.5 + 0.5 * (-nx * lx - ny * ly) + bias - (d > 0.7 ? rim * (d - 0.7) / 0.3 : 0), cx + x, cy + y);
        }
        if (k !== run) { if (run) { pen(ctx, run); ctx.fillRect(cx + x0, cy + y, x - x0, 1); } run = k; x0 = x; }
      }
    }
  }

  // A shaded capsule from (x0, y0) to (x1, y1) of radius r (a sleeve, a rod, a pipe).
  function limb(ctx, x0, y0, x1, y1, r, keys, bias) {
    var dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, x, y;
    for (y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
      for (x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
        var t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2));
        var ex = x - (x0 + t * dx), ey = y - (y0 + t * dy);
        if (ex * ex + ey * ey > r * r) continue;
        px(ctx, tone(keys, 0.5 + (-ex * 0.6 - ey * 0.7) / Math.max(1, r) * 0.5 + (bias || 0), x, y), x, y);
      }
    }
  }

  // A 1 px line (Bresenham) in one key.
  function line(ctx, key, x0, y0, x1, y1) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    pen(ctx, key);
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  // Fills a w×h area from fn(x, y) -> palette key ('' leaves a pixel alone), in runs of one
  // key per row, so big painted surfaces cost one fillRect per run instead of per pixel.
  function area(ctx, x0, y0, w, h, fn) {
    for (var y = y0; y < y0 + h; y++) {
      var run = '', rx = x0;
      for (var x = x0; x <= x0 + w; x++) {
        var k = x < x0 + w ? fn(x, y) : '';
        if (k !== run) { if (run) { pen(ctx, run); ctx.fillRect(rx, y, x - rx, 1); } run = k; rx = x; }
      }
    }
  }

  // A box shaded as a solid: lit top edge and left side, dark right side and bottom.
  function slab(ctx, x, y, w, h, keys) {
    var n = keys.length - 1;
    box(ctx, keys[Math.max(0, n - 2)], x, y, w, h);
    box(ctx, keys[n], x, y, w, 1); box(ctx, keys[n - 1], x, y + 1, 1, h - 1);
    box(ctx, keys[0], x + w - 1, y + 1, 1, h - 1); box(ctx, keys[0], x, y + h - 1, w, 1);
  }

  // Forget the cached pen colour (a painter that also sets ctx.fillStyle itself calls this).
  function reset() { penCtx = null; penKey = ''; }

  return { reset: reset, area: area, pen: pen, px: px, box: box, hash2: hash2, tone: tone, blob: blob, limb: limb, line: line, slab: slab, dither: dither, mountains: mountains, forest: forest, shore: shore, pine: pine, round: round, birch: birch, spruce: spruce, dead: dead, poplar: poplar, TREES: TREES, SHORE_THINGS: SHORE_THINGS, cloudMask: cloudMask, paintMask: paintMask };
})();
