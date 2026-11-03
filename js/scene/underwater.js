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
  var HI = 2; // bakes at HI × the world's resolution, as the sailing scene does (8.3 #89)
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
  // Background silhouettes (V3.4): far, dark, drifting; never interact with anything.
  // Phase 30: the far silhouettes are loose shoals (see shoalStep).
  // Phase 72: each shoal is a real species' silhouette (fishgen.shadow) in a box of SH_LEN view px
  // (the sizes the old perch, trout and carp body plans had).
  var SHN = 3, SHMAX = 7, BN = SHN * SHMAX, SH_SP = ['yellow_perch', 'rainbow_trout', 'common_carp'], SH_LEN = [34, 40, 38];
  var HEAVY_SP = 'channel_catfish', HEAVY_LEN = 88; // the heavy shadow (D4), twice a catfish's old box
  var bx = new Float32Array(BN), by = new Float32Array(BN), bvx = new Float32Array(BN), bvy = new Float32Array(BN);
  var bon = new Uint8Array(BN), bsc = new Float32Array(BN), bfl = new Float32Array(BN), bph = new Float32Array(BN), bface = new Int8Array(BN), bturn = new Float32Array(BN);
  var shDir = new Float32Array(SHN), shY = new Float32Array(SHN), shT = new Float32Array(SHN), shV = new Float32Array(SHN), shL = new Float32Array(SHN), shH = new Float32Array(SHN);
  // Phase 19: streaks the current carries along where a water has one (loc.current, the creek).
  var CN = 22, cx = new Float32Array(CN), cy = new Float32Array(CN), cl = new Float32Array(CN);
  var stats = { ms: 0, fishMs: 0 };
  var FAR_W = 640; // the far underwater layer wraps every FAR_W px (Phase 15)

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
    // Phase 78 (PLAN_WATERS.md 78.1): a water with `shape` ([[x, depth px], ...], in order)
    // has its bed drawn through those points (a shallow flat, a point, a steep drop), roughened
    // by a little of the same walk. Its own stream, so the other waters' beds are unchanged.
    if (u.shape) {
      var sh = u.shape, j = 0, r2 = new G.core.rng.Rng(loc.seed * 31 + 207), wk = 0;
      for (x = 0; x < w; x++) {
        while (j < sh.length - 2 && x > sh[j + 1][0]) j++;
        var a = sh[j], b = sh[Math.min(j + 1, sh.length - 1)], f = b[0] > a[0] ? clamp((x - a[0]) / (b[0] - a[0]), 0, 1) : 0;
        f = f * f * (3 - 2 * f);
        wk = (wk + r2.range(-0.5, 0.5)) * 0.95;
        prof[x] = clamp(Math.round(a[1] + (b[1] - a[1]) * f + wk * 1.5), 4, loc.maxDepth);
      }
    }
    return prof;
  }

  // ---- Phase 48: the bed's things and the new weeds, from the water's table (loc.life.under) -----
  // Their own seeded streams (seed × 31 + 203 and 204), so the older layout is unchanged. All in
  // the layer's HI pixels; top[X] is the bed's top row.
  function bedThings(ctx, loc, set, top, WH, HH) {
    var T = G.scene.life.table(loc.id), u = loc.underwater, A = G.gfx.paint, r = new G.core.rng.Rng(loc.seed * 31 + 203), i, k, X, y;
    var BARK = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'];
    function topAt(X) { return top[clamp(Math.round(X), 0, WH - 1)]; }
    // A shape cut by the bed: only the part above the bed's top is painted (half buried).
    function buried(cx, cy, rx, ry, fn) {
      A.area(ctx, Math.round(cx - rx), Math.round(cy - ry), Math.round(rx * 2) + 1, Math.round(ry * 2) + 1, function (x, y) {
        if (y > topAt(x) + 1) return '';
        var nx = (x - cx) / rx, ny = (y - cy) / ry;
        return nx * nx + ny * ny > 1 ? '' : fn(nx, ny, x, y);
      });
    }
    // Algae on the boulders: a fuzzy coat along their tops in the water's weed keys.
    var rk = set.rocks || [];
    for (i = 0; i < rk.length; i++) {
      if (r.next() >= T.algae) continue;
      var R = rk[i], x0 = Math.round((R.x - R.rw * 0.7) * HI), x1 = Math.round((R.x + R.rw * 0.4) * HI);
      for (X = x0; X <= x1; X++) {
        var uu = clamp((X / HI - R.x) / R.rw, -0.95, 0.95), ty = Math.round((R.cy - R.rh * Math.sqrt(1 - uu * uu)) * HI), hh = 1 + (A.hash2(X, i) < 0.5 ? 1 : 0);
        A.box(ctx, u.weedDark, X, ty, 1, hh);
        if (A.hash2(X, i + 7) < 0.35) A.box(ctx, u.weed, X, ty - 1 - (A.hash2(X, i + 9) < 0.4 ? 1 : 0), 1, 2); // tufts
      }
    }
    // Freshwater mussels, half buried, their lit ridge up.
    for (i = 0; i < T.mussel; i++) {
      X = r.int(10, loc.width - 10) * HI;
      var rx = r.range(3.5, 5), lean = r.range(-0.3, 0.3);
      buried(X, topAt(X) + 1, rx, 3, function (nx, ny) { return ny < -0.55 ? 'stone' : (nx + lean < -0.2 ? 'stone_dark' : 'ink'); });
    }
    // Caddis-fly cases on the snags (the creek): little tubes of grit and twig stuck to the bark.
    if (T.caddis) for (i = 0; i < set.snagAt.length; i++) {
      var sg = set.snagAt[i];
      for (k = 0; k < 5; k++) {
        var h = r.int(6, Math.max(8, (sg.foot - sg.tip) * 0.6) | 0), yy = sg.foot - h, cx = Math.round(sg.X + sg.lean * Math.sin(h * 0.025) * 12) + (k & 1 ? 6 : -2);
        A.box(ctx, 'reed_dark', cx, yy, 2, 5);
        A.px(ctx, 'reed', cx, yy + 1); A.px(ctx, 'reed_hi', cx + 1, yy + 3); A.px(ctx, 'stone', cx, yy + 4);
      }
    }
    // Old roots reaching out of the bed.
    for (i = 0; i < T.roots; i++) {
      X = r.int(20, loc.width - 20) * HI;
      for (k = 0; k < 3; k++) {
        var px = X + r.int(-6, 6), py = topAt(px) + 1, dir = r.next() < 0.5 ? -1 : 1;
        for (var sgm = 0; sgm < 4; sgm++) {
          var qx = px + dir * r.int(3, 8), qy = py - r.int(2, 7);
          A.line(ctx, 'wood_deep', px, py + 1, qx, qy + 1);
          A.line(ctx, sgm < 2 ? 'wood_dark' : 'wood', px, py, qx, qy);
          px = qx; py = qy; if (r.next() < 0.4) dir = -dir;
        }
      }
    }
    // A drowned tree lying on the bed, its branches reaching up.
    for (i = 0; i < T.tree; i++) {
      X = r.int(Math.round(loc.width * 0.3), Math.round(loc.width * 0.7)) * HI;
      var len = r.int(50, 80) * HI, dirT = r.next() < 0.5 ? -1 : 1, xa = X, xb = X + dirT * len;
      var ya = topAt(xa) - 3, yb = topAt(xb) - 8;
      A.limb(ctx, xa, ya, xb, yb, 4, BARK, 0);
      buried(xa, ya, 9, 7, function (nx, ny) { return ny < -0.5 ? 'wood_mid' : (nx < 0 ? 'wood' : 'wood_dark'); }); // the root plate
      for (k = 1; k <= 4; k++) {
        var f = k / 5, bx0 = Math.round(xa + (xb - xa) * f), by0 = Math.round(ya + (yb - ya) * f) - 3, bl2 = r.int(18, 46), bx1 = bx0 + dirT * r.int(4, 16), by1 = by0 - bl2;
        A.line(ctx, 'wood_deep', bx0 + 1, by0, bx1 + 1, by1);
        A.line(ctx, 'wood_dark', bx0, by0, bx1, by1);
        A.line(ctx, 'wood', bx1, by1, bx1 + dirT * r.int(2, 7), by1 - r.int(3, 9)); // a twig
      }
    }
    // Phase 79: sea anemones on the rocks: a short column and a crown of tentacles.
    var ANE = [['pink_dark', 'pink', 'pink_lit'], ['orange_dark', 'orange', 'orange_lit'], ['stone', 'paper_dark', 'cream']];
    for (i = 0; i < (T.anemone || 0) && rk.length; i++) {
      var Ra = rk[r.int(0, rk.length - 1)], au = r.range(-0.6, 0.6), ax = Math.round((Ra.x + au * Ra.rw) * HI), ay = Math.round((Ra.cy - Ra.rh * Math.sqrt(1 - au * au)) * HI) + 1, kc = ANE[i % 3], ah = r.int(2, 4);
      A.box(ctx, kc[0], ax - 1, ay - ah, 3, ah); A.px(ctx, kc[1], ax - 1, ay - ah);
      for (k = -3; k <= 3; k++) A.line(ctx, (k & 1) ? kc[1] : kc[2], ax, ay - ah, ax + k, ay - ah - 2 - (3 - Math.abs(k)) * 0.6);
    }
    // Litter, one of each in the table, spread along the water.
    var Lt = T.litter, snagI = 0;
    for (i = 0; i < Lt.length; i++) {
      X = Math.round(((i + 0.5) / Lt.length * loc.width + r.range(-60, 60))) * HI;
      X = clamp(X, 20 * HI, (loc.width - 20) * HI);
      y = topAt(X);
      if (Lt[i] === 'bottle') { // on its side, half sunk: glass, its lit edge, the neck
        var bd = r.next() < 0.5 ? -1 : 1, bx = X - 6;
        buried(X, y + 1, 7, 3, function (nx, ny) { return ny < -0.6 ? 'teal_lit' : (ny < 0 ? 'teal' : 'teal_dark'); });
        A.box(ctx, 'teal_dark', bd > 0 ? X + 7 : bx - 4, y - 1, 4, 2); A.px(ctx, 'teal_hi', bd > 0 ? X + 8 : bx - 3, y - 1);
      } else if (Lt[i] === 'tyre') { // a tyre half in the silt
        buried(X, y + 3, 11, 8, function (nx, ny, x) { var d = nx * nx + ny * ny; return d < 0.3 ? u.silt : (d < 0.42 ? 'stone_dark' : ((x & 3) === 0 ? 'stone_dark' : 'ink')); });
      } else if (Lt[i] === 'pot') { // Phase 79: a lost crab pot: a wire cage on the bed, its line gone slack
        var pw = 16, ph2 = 10;
        for (k = 0; k <= pw; k += 4) A.box(ctx, 'stone_dark', X - 8 + k, y - ph2, 1, ph2);
        A.box(ctx, 'stone_dark', X - 8, y - ph2, pw + 1, 1); A.box(ctx, 'stone_dark', X - 8, y - (ph2 >> 1), pw + 1, 1); A.box(ctx, 'rust', X - 8, y - 1, pw + 1, 1);
        A.px(ctx, 'stone_hi', X - 4, y - ph2); A.line(ctx, 'paper_dark', X + 8, y - ph2, X + 14, y - ph2 - 14); A.line(ctx, 'paper_dark', X + 14, y - ph2 - 14, X + 24, y - 2);
      } else if (Lt[i] === 'lure') { // a lost lure caught on a snag (or on the bed), its line trailing up
        var lx2 = X, ly2 = y - 2;
        if (set.snagAt.length) { var sa = set.snagAt[snagI++ % set.snagAt.length], hh2 = Math.round((sa.foot - sa.tip) * 0.35); lx2 = Math.round(sa.X + sa.lean * Math.sin(hh2 * 0.025) * 12) + 7; ly2 = sa.foot - hh2; }
        A.line(ctx, 'fog_mid', lx2 + 1, ly2, lx2 + 9, ly2 - 22);
        A.box(ctx, 'rust', lx2 - 3, ly2, 5, 3); A.box(ctx, 'rust_hi', lx2 - 3, ly2, 4, 1); A.px(ctx, 'ink', lx2 - 2, ly2 + 1);
        A.px(ctx, 'stone_hi', lx2 - 1, ly2 + 3); A.px(ctx, 'stone_hi', lx2, ly2 + 4); // the hook
      }
    }
  }

  // The new weeds: ribbon weed (long twisting blades in clumps), a fern-like weed (a stem with
  // paired leaflets) and lily stems from the bed to pads at the surface, near the shores.
  function plantList(loc, topAt, WH) {
    var T = G.scene.life.table(loc.id), r = new G.core.rng.Rng(loc.seed * 31 + 204), out = [], i, k, w = loc.width;
    var nr = Math.round(w * T.ribbon), nf = Math.round(w * T.fern);
    for (i = 0; i < nr; i++) {
      var X = r.int(4, w - 5) * HI, nb = r.int(2, 4);
      for (k = 0; k < nb; k++) { var xb = X + r.int(-4, 4); out.push({ kind: 0, x: xb, base: topAt(xb) + 1, h: r.int(16, 46) * HI, ph: r.range(0, 6.28), dark: r.next() < 0.4 }); }
    }
    for (i = 0; i < nf; i++) { var xf = r.int(4, w - 5) * HI; out.push({ kind: 1, x: xf, base: topAt(xf) + 1, h: r.int(8, 16) * HI, ph: r.range(0, 6.28) }); }
    for (i = 0; i < T.lily; i++) {
      var xl = (i % 2 ? w - r.int(30, 170) : r.int(30, 170)) * HI;
      out.push({ kind: 2, x: xl, base: topAt(xl) + 1, h: topAt(xl) + 1 - 2, ph: r.range(0, 6.28), pad: r.int(5, 8) * HI });
    }
    return out;
  }
  function paintPlants(ctx, u, plants, lean) {
    var A = G.gfx.paint, lit = S.shift(u.weed, 1);
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i], y, q, dx;
      if (p.kind === 0) { // a blade one pixel wide, wider where it twists to face us
        var k0 = p.dark ? u.weedDark : u.weed, k1 = p.dark ? u.weed : lit;
        for (y = 0; y < p.h; y++) {
          q = y / p.h; dx = Math.round(lean * 7 * Math.pow(q, 1.3) + Math.sin(y * 0.09 + p.ph) * 2.5 * q);
          var tw = Math.sin(y * 0.16 + p.ph * 2) > 0.85;
          A.box(ctx, tw ? k1 : k0, p.x + dx, p.base - 1 - y, tw ? 2 : 1, 1);
        }
      } else if (p.kind === 1) { // a stem with leaflets in pairs, shorter toward the tip
        for (y = 0; y < p.h; y++) {
          q = y / p.h; dx = Math.round(lean * 3 * q * q + Math.sin(y * 0.2 + p.ph) * 0.8 * q);
          var yy = p.base - 1 - y;
          A.px(ctx, u.weedDark, p.x + dx, yy);
          if (y > 2 && y % 3 === 0) {
            var ll = Math.max(1, Math.round(5 * (1 - q)) + 1);
            A.line(ctx, u.weed, p.x + dx - 1, yy, p.x + dx - ll, yy - (ll >> 1));
            A.line(ctx, u.weed, p.x + dx + 1, yy, p.x + dx + ll, yy - (ll >> 1));
            A.px(ctx, lit, p.x + dx + ll, yy - (ll >> 1));
          }
        }
      } else { // a lily's stem to the surface and its pad lying on it
        for (y = 0; y < p.h; y++) {
          q = y / p.h; dx = Math.round(lean * 3 * Math.pow(q, 3) + Math.sin(y * 0.03 + p.ph) * 2 * q);
          A.px(ctx, u.weedDark, p.x + dx, p.base - 1 - y);
        }
        var cx = p.x + Math.round(lean * 3 + Math.sin(p.h * 0.03 + p.ph) * 2);
        A.box(ctx, u.weedDark, cx - (p.pad >> 1), 1, p.pad, 2);
        A.box(ctx, u.weed, cx - (p.pad >> 1) + 1, 1, p.pad - 3, 1);
        A.px(ctx, u.weedDark, cx + 2, 1); // the pad's notch
      }
    }
  }

  // Phase 79: kelp, in one lean frame: a stipe swaying more toward its top, blades in olive off
  // alternate sides, a gas float at the top and streamers trailing along the surface.
  function paintKelp(ctx, kelps, lean) {
    var A = G.gfx.paint;
    for (var i = 0; i < kelps.length; i++) {
      var k = kelps[i], y, q, dx = 0, X = 0;
      for (y = 0; y < k.h; y++) {
        q = y / k.h; dx = Math.round(lean * 8 * Math.pow(q, 1.4) + Math.sin(y * 0.045 + k.ph) * 2.5 * q);
        X = k.x + dx;
        A.px(ctx, 'olive_dark', X, k.base - 1 - y);
        if (y > 6 && y % 9 === (i % 9)) {
          var sd = (y / 9 | 0) % 2 ? 1 : -1, bl = 4 + ((y + i) % 4);
          for (var b = 1; b <= bl; b++) A.px(ctx, b > bl - 2 ? 'olive_hi' : 'olive', X + sd * b, k.base - 1 - y + (b >> 1) + (lean * sd > 0 ? 0 : 1));
        }
      }
      var ty = k.base - k.h;
      A.blob(ctx, X, ty, 2, 2, ['olive_dark', 'olive', 'olive_hi'], { rim: 0 });
      for (var st = 0; st < 3; st++) A.line(ctx, st === 1 ? 'olive_hi' : 'olive', X, ty + st - 1, X + (lean >= 0 ? 1 : -1) * (8 + st * 3), ty - 1 + st + (st & 1));
    }
  }

  // Phase 50.1: the gallery's strip of a water's bed things and new weeds (its own table and
  // keys) on a short flat bed 320 world px wide and 40 deep, with two boulders (for the algae
  // and a snail's place) and one snag (the caddis cases and the lost lure). Baked once per water.
  function galleryBed(id) {
    var loc = G.data.locations[id], u = loc.underwater, WH = 320 * HI, HH = 40 * HI;
    return B.cached('gallery:bed:' + id, function () {
      return B.layer(WH, HH, function (ctx) {
        var A = G.gfx.paint, top = new Int16Array(WH), X, fake = { id: id, seed: loc.seed, width: 320, underwater: u };
        for (X = 0; X < WH; X++) top[X] = HH - 14 + Math.round(2 * Math.sin(X * 0.02));
        A.reset();
        ctx.fillStyle = S.PALETTE.water_dark; ctx.fillRect(0, 0, WH, HH);
        A.area(ctx, 0, 0, WH, HH, function (x, y) { var d = y - top[x]; return d < 0 ? '' : (d < 2 ? 'wood_mid' : (d < 5 ? (u.sand || 'wood') : u.silt)); });
        var RK = u.rocks || { dark: u.rock, mid: 'stone', lit: 'stone_hi' }, set = { rocks: [], snagAt: [] };
        for (var i = 0; i < 2; i++) {
          var rx = (60 + i * 170) * HI, rw = 7 * HI, rh = 4 * HI, cy = top[rx] + 2 - Math.round(rh * 0.3);
          A.blob(ctx, rx, cy, rw, rh, [RK.dark, RK.mid, RK.lit], { rim: 0.3 });
          set.rocks.push({ x: rx / HI, cy: cy / HI, rw: rw / HI, rh: rh / HI });
        }
        var sx = 280 * HI, foot = top[sx] + 2;
        A.box(ctx, 'wood_dark', sx, 6, 6, foot - 6); A.box(ctx, 'wood_mid', sx, 6, 1, foot - 6);
        set.snagAt.push({ X: sx, foot: foot, tip: 6, lean: 0 });
        bedThings(ctx, fake, set, top, WH, HH);
        paintPlants(ctx, u, plantList(fake, function (x) { return top[clamp(Math.round(x), 0, WH - 1)]; }, WH), 0);
        A.reset();
      });
    });
  }

  // Bakes (once per location) the gradient strip, bottom, three weed frames, the far layer and
  // a light shaft. Phase 19: like the sailing scene (8.3 #89) everything is baked at HI times
  // the world's resolution and drawn at 1/HI size, under the pixel-art rules of 8.3 #84: flat
  // clusters of a few keys per material, outlines where things need separating, texture as
  // deliberate strokes (strata, grain, bark), never dither or speckle.
  function prepare(loc) {
    var set = sets[loc.id];
    if (set) return set;
    // The user's fixes (2026-11-03): at least down to the view's bottom with the camera at the
    // surface, so a shallow water (the rivers) shows its bed there and not the water behind it.
    var u = loc.underwater, w = loc.width, H = Math.max(loc.maxDepth + 24, VIEW_H - loc.waterY + 8), key = 'loc:' + loc.id + ':uw_';
    var WH = w * HI, HH = H * HI, A = G.gfx.paint;
    var prof = makeProfile(loc), rng = new G.core.rng.Rng(loc.seed * 31 + 201);
    set = sets[loc.id] = { id: loc.id, H: H, prof: prof, camMax: Math.max(0, loc.waterY + loc.maxDepth + UW.bottomPad - VIEW_H) };

    // The bed's top row for every layer column: the world profile, interpolated between world
    // columns, where the lure (3 px tall, centred on its depth) rests.
    var top = new Int16Array(WH), X;
    for (X = 0; X < WH; X++) {
      var x0 = Math.min(w - 1, Math.floor(X / HI)), x1 = Math.min(w - 1, x0 + 1), fr = X / HI - x0;
      top[X] = Math.round((prof[x0] + (prof[x1] - prof[x0]) * fr + 1.5) * HI);
    }
    function topAt(X) { return top[clamp(Math.round(X), 0, WH - 1)]; }

    set.grad = B.cached(key + 'grad', function () {
      return B.layer(1, HH, function (ctx) {
        for (var y = 0; y < HH; y += 4) {
          var f = y / HH;
          // Phase 15: lit teal near the surface, through blue-green, to the deep.
          ctx.fillStyle = f < 0.3 ? lerpRGB('water_lit', 'water_mid', f / 0.3) : (f < 0.65 ? lerpRGB('water_mid', 'water_dark', (f - 0.3) / 0.35) : lerpRGB('water_dark', 'water_deep', (f - 0.65) / 0.35));
          ctx.fillRect(0, y, 1, 4);
        }
      });
    });

    set.bottom = B.cached(key + 'bottom', function () {
      return B.layer(WH, HH, function (ctx) {
        A.reset();
        var sand = u.sand || 'wood', SAND = [S.shift(sand, -1), sand, u.sand ? S.shift(sand, 1) : 'wood_mid'];
        var silt = u.silt, siltDark = S.shift(silt, -1), ph = rng.range(0, 6.28);
        // The strata follow a smoothed bed (a running mean of the top over 41 columns), so they
        // lie in long, calm bands under the bumps instead of copying each one.
        var sum = new Float64Array(WH + 1), sm = new Float32Array(WH), R = 20;
        for (X = 0; X < WH; X++) sum[X + 1] = sum[X] + top[X];
        for (X = 0; X < WH; X++) { var lo = Math.max(0, X - R), hi = Math.min(WH, X + R + 1); sm[X] = (sum[hi] - sum[lo]) / (hi - lo); }
        // The bed: a lit rim, a band of sand, then silt that darkens a step two strata down,
        // with grain strokes along some of the seams between strata.
        // Phase 79: a rock bed (the sea's head and reef, u.rockBed [[from, to], ...] world px): bare
        // rock in its own keys where the others have sand, broken in blocks.
        var RB = u.rockBed, rockCol = null;
        if (RB) { rockCol = new Uint8Array(WH); for (var rb = 0; rb < RB.length; rb++) for (X = Math.max(0, RB[rb][0] * HI); X < Math.min(WH, RB[rb][1] * HI); X++) rockCol[X] = 1; }
        var RKB = u.rocks || { dark: u.rock, mid: 'stone', lit: 'stone_hi' };
        A.area(ctx, 0, 0, WH, HH, function (x, y) {
          var d = y - top[x];
          if (d < 0) return '';
          if (rockCol && rockCol[x] && d < 14) {
            if (d < 1) return RKB.lit;
            if (((x + (y >> 2) * 7) % 19) === 0 || (d === 5 && A.hash2(x >> 3, 3) < 0.5)) return 'ink';
            return A.hash2(x >> 3, y >> 2) < 0.3 ? RKB.dark : RKB.mid;
          }
          if (d < 2) return SAND[2];
          if (d < 6) return SAND[1];
          var s = y - sm[x] + 3 * Math.sin(x * 0.013 + ph) + 2 * Math.sin(x * 0.041), band = Math.floor(s / 10), seam = s - band * 10;
          if (seam < 1 && band > 0 && A.hash2(Math.floor(x / 9), band) < 0.4) return band < 2 ? SAND[0] : silt;
          return band < 2 ? silt : siltDark;
        });
        // Boulders, outlined and shaded in flat clusters, lit from the top left; some carry moss.
        var RK = u.rocks || { dark: u.rock, mid: 'stone', lit: 'stone_hi' }, rim = S.shift(RK.dark, -1);
        var ramp = [RK.dark, RK.mid, RK.lit], i, n;
        set.rocks = []; set.snagAt = []; // Phase 48: where the boulders and snags stand (the snails, the caddis)
        for (i = 0; i < w / 18; i++) {
          var bxw = rng.int(4, w - 12) * HI, rw = rng.int(3, 8) * HI, rh = rng.int(2, 5) * HI, base = 1e9;
          for (var k = -rw; k <= rw; k += 2) base = Math.min(base, topAt(bxw + k) + 2);
          var bcy = Math.round(base - rh * 0.3);
          set.rocks.push({ x: bxw / HI, cy: bcy / HI, rw: rw / HI, rh: rh / HI });
          A.blob(ctx, bxw, bcy, rw + 1, rh + 1, [rim]);
          A.blob(ctx, bxw, bcy, rw, rh, ramp, { rim: 0.3 });
          A.line(ctx, rim, bxw + rng.int(-rw >> 1, 0), bcy - rng.int(0, rh >> 1), bxw + rng.int(1, rw >> 1), bcy + rng.int(1, rh >> 1));
          if (rng.next() < 0.4) {
            var mw = rng.int(3, rw);
            A.box(ctx, u.weedDark, bxw - (mw >> 1) - 1, Math.round(base - rh * 1.3) + 1, mw, 2);
            A.box(ctx, u.weed, bxw - (mw >> 1), Math.round(base - rh * 1.3), mw - 3, 1);
          }
        }
        // Pebbles strewn along the bed's top.
        for (X = rng.int(4, 30); X < WH - 4; X += rng.int(14, 46)) {
          var pr = rng.range(1.5, 3.2), pt = Math.round(top[X] + 1 - pr * 0.4);
          A.blob(ctx, X, pt, pr + 1, pr * 0.7 + 1, [rim]);
          A.blob(ctx, X, pt, pr, pr * 0.7, ramp, { rim: 0 });
        }
        // Phase 79: more and bigger boulders over a rock bed, from their own stream.
        if (RB) {
          var r9 = new G.core.rng.Rng(loc.seed * 31 + 209);
          for (var rr = 0; rr < RB.length; rr++) for (i = 0; i < (RB[rr][1] - RB[rr][0]) / 14; i++) {
            var bxr = r9.int(Math.max(4, RB[rr][0]), Math.min(w - 12, RB[rr][1])) * HI, rwr = r9.int(4, 11) * HI, rhr = r9.int(3, 7) * HI, baser = 1e9;
            for (var kk = -rwr; kk <= rwr; kk += 2) baser = Math.min(baser, topAt(bxr + kk) + 2);
            var bcr = Math.round(baser - rhr * 0.3);
            set.rocks.push({ x: bxr / HI, cy: bcr / HI, rw: rwr / HI, rh: rhr / HI });
            A.blob(ctx, bxr, bcr, rwr + 1, rhr + 1, [rim]);
            A.blob(ctx, bxr, bcr, rwr, rhr, ramp, { rim: 0.3 });
            A.line(ctx, rim, bxr - (rwr >> 2), bcr - (rhr >> 1), bxr + (rwr >> 3), bcr + (rhr >> 1));
          }
        }
        // Phase 79: the schooner's hull under the water (u.hulk {x, half}, world px), from the
        // surface down to the bank she lies on: planking gone grey and green, barnacles and
        // weed, ribs in the dark of a stove-in hole.
        if (u.hulk) {
          var hx0 = (u.hulk.x - u.hulk.half) * HI, hx1 = (u.hulk.x + u.hulk.half) * HI, ha = hx0 + Math.round((hx1 - hx0) * 0.3), hb = hx0 + Math.round((hx1 - hx0) * 0.45);
          A.area(ctx, hx0, 0, hx1 - hx0, HH, function (x, y) {
            var t = (x - hx0) / (hx1 - hx0), uu = Math.abs(2 * t - 1), bot = Math.round((top[clamp(x, 0, WH - 1)] + 2) * Math.sqrt(Math.max(0, 1 - Math.pow(uu, 3))));
            if (y >= bot) return '';
            var e = bot - y, sk = Math.floor((y + Math.round((x - hx0) * 0.02)) / 6), seam = (y + Math.round((x - hx0) * 0.02)) % 6;
            if (e < 2) return 'wood_deep';
            if (x > ha && x < hb && y > 8 && e > 6) return ((x - ha) % 9 < 2) ? 'wood_dark' : 'ink';
            if (seam === 0) return 'wood_deep';
            var hsh = A.hash2(x >> 1, y >> 1);
            if (hsh < 0.04) return 'stone_hi';
            if (hsh < 0.16) return u.weedDark;
            return ['stone_dark', 'wood_dark', 'teal_dark', 'stone_dark'][(A.hash2(x >> 4, sk) * 4) | 0];
          });
        }
        // 11.1: submerged branches standing up from the bottom to depth s.top (0: the surface):
        // a tapering trunk in four bark keys (outline, shadow, bark, lit left edge) with notches,
        // and side branches with twigs.
        var snags = u.snags || [], BARK = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'];
        for (n = 0; n < snags.length; n++) {
          var sn = snags[n], sx = sn.x * HI, foot = topAt(sx) + 2, lean = rng.next() < 0.5 ? -1 : 1, tip = sn.top * HI, len = foot - tip;
          set.snagAt.push({ X: sx, foot: foot, tip: tip, lean: lean });
          for (var y = foot; y >= tip; y--) {
            var h = foot - y, cx = Math.round(sx + lean * Math.sin(h * 0.025) * 12), tw = Math.max(3, Math.round(7 - 4 * h / Math.max(1, len)));
            A.box(ctx, BARK[0], cx - 1, y, tw + 2, 1);
            A.box(ctx, BARK[1], cx, y, tw, 1);
            A.box(ctx, BARK[2], cx, y, tw - 1, 1);
            A.box(ctx, BARK[3], cx, y, 1, 1);
            if (h % 9 === 4 && tw > 3) A.box(ctx, BARK[1], cx + 1, y, 2, 1); // a notch in the bark
            if (h > 12 && h % 22 === 0) {
              var side = (h / 22) % 2 ? lean : -lean, bl = rng.int(8, 18), ex = cx + (side > 0 ? tw : -1) + side * bl, ey = y - (bl >> 1);
              A.line(ctx, BARK[0], cx + (side > 0 ? tw : -1), y + 1, ex, ey + 1);
              A.line(ctx, BARK[2], cx + (side > 0 ? tw : -1), y, ex, ey);
              A.line(ctx, BARK[1], ex - side * (bl >> 1), ey + (bl >> 2), ex - side * (bl >> 1) + side * 3, ey + (bl >> 2) - 5); // a twig
            }
          }
        }
        bedThings(ctx, loc, set, top, WH, HH);
        A.reset();
      });
    });

    // Weed strands, baked in three lean frames (-1, 0, 1) and cycled slowly: a stem two
    // pixels wide, lit on one side, with blades that alternate up it.
    var strands = [], n = Math.round(w * u.weedDensity);
    for (var s = 0; s < n; s++) strands.push({ x: rng.int(2, w - 3) * HI + rng.int(0, 1), h: rng.int(6, 22) * HI, dark: rng.next() < 0.5, ph: rng.range(0, 6.28) });
    // Phase 78: weed beds ([[from, to, density], ...]): thick stands over their range, growing
    // up to within a metre or two of the surface. Their own stream, after the others.
    if (u.weedBeds) {
      var rb = new G.core.rng.Rng(loc.seed * 31 + 208);
      for (var wb = 0; wb < u.weedBeds.length; wb++) {
        var B0 = u.weedBeds[wb], nb = Math.round((B0[1] - B0[0]) * B0[2]);
        for (s = 0; s < nb; s++) {
          var bx = rb.int(B0[0], B0[1] - 1), deep = prof[clamp(bx, 0, w - 1)];
          strands.push({ x: bx * HI + rb.int(0, 1), h: clamp(Math.round(deep * rb.range(0.55, 0.9)), 6, 60) * HI, dark: rb.next() < 0.5, ph: rb.range(0, 6.28) });
        }
      }
    }
    set.strands = [];
    for (s = 0; s < strands.length; s++) set.strands.push({ x: strands[s].x / HI, base: topAt(strands[s].x) / HI, h: strands[s].h / HI });
    // Phase 79: kelp forests (u.kelp [[from, to, density], ...]): stipes from the rock to near
    // the surface where the water is shallow enough (to 25 m), each with its blades, a float
    // and streamers lying along the top. Their own stream.
    var kelps = [];
    if (u.kelp) {
      var rk = new G.core.rng.Rng(loc.seed * 31 + 210);
      for (var kb = 0; kb < u.kelp.length; kb++) {
        var K0 = u.kelp[kb], nk = Math.round((K0[1] - K0[0]) * K0[2]);
        for (s = 0; s < nk; s++) {
          var kx = rk.int(K0[0], K0[1] - 1), kd = prof[clamp(kx, 0, w - 1)];
          if (kd > 100) { rk.next(); rk.next(); continue; }
          kelps.push({ x: kx * HI + rk.int(0, 1), base: topAt(kx * HI) + 1, h: Math.max(8, Math.round((kd - rk.range(1.5, 6)) * HI)), ph: rk.range(0, 6.28) });
        }
      }
    }
    set.kelp = kelps.length;
    var plants = plantList(loc, topAt, WH); // Phase 48: ribbon weed, fern-like weed, lily stems
    set.lilies = []; // Phase 49: where the pads lie on the surface (world x, width), for the frog and the pads seen from above
    for (s = 0; s < plants.length; s++) if (plants[s].kind === 2) set.lilies.push({ x: (plants[s].x + Math.round(Math.sin(plants[s].h * 0.03 + plants[s].ph) * 2)) / HI, w: plants[s].pad / HI });
    set.weeds = [];
    for (var f = 0; f < 3; f++) {
      set.weeds.push(B.cached(key + 'weeds' + f, (function (lean) {
        return function () {
          return B.layer(WH, HH, function (ctx) {
            A.reset();
            for (var i = 0; i < strands.length; i++) {
              var st = strands[i], base = topAt(st.x) + 1, k0 = st.dark ? u.weedDark : u.weed, k1 = st.dark ? u.weed : S.shift(u.weed, 1);
              for (var y = 0; y < st.h; y++) {
                var q = y / st.h, dx = Math.round(lean * 4 * Math.pow(q, 1.5) + Math.sin(y * 0.18 + st.ph) * 1.5 * q), yy = base - 1 - y;
                A.box(ctx, k0, st.x + dx, yy, 2, 1);
                A.box(ctx, k1, st.x + dx, yy, 1, 1);
                if (y > 4 && y % 7 === 0 && y < st.h - 3) {
                  var sd = (y / 7) % 2 ? 1 : -1, bl = 3 + ((y * 3 + st.x) % 3);
                  for (var b = 1; b <= bl; b++) A.px(ctx, b === bl ? k1 : k0, st.x + dx + (sd > 0 ? 1 + b : -b), yy - (b >> 1));
                }
              }
            }
            paintPlants(ctx, u, plants, lean);
            paintKelp(ctx, kelps, lean);
            A.reset();
          });
        };
      })(f - 1)));
    }

    // Phase 15: far rock formations and kelp, a wrapping layer behind everything (parallax
    // 0.6), in the water's own darker blues: a lit rim on their left faces, the body, and a
    // deeper band low down.
    set.far = B.cached(key + 'far', function () {
      var FW = FAR_W * HI;
      return B.layer(FW, HH, function (ctx) {
        A.reset();
        var r2 = new G.core.rng.Rng(loc.seed * 31 + 202), nf = r2.int(6, 9), m, y;
        for (m = 0; m < nf; m++) {
          var cx = r2.int(0, FW - 1), hw = r2.int(40, 110) * HI, peak = Math.round(HH * r2.range(0.4, 0.8)), ph = r2.range(0, 6.28);
          for (var dx = -hw; dx <= hw; dx++) {
            var Xw = ((cx + dx) % FW + FW) % FW, t = peak + Math.round((HH - peak) * Math.pow(Math.abs(dx) / hw, 2.4) + Math.sin(dx * 0.09 + ph) * 2);
            var deep = t + 22 + Math.round(Math.sin(dx * 0.03 + ph) * 6);
            A.box(ctx, 'water_dark', Xw, t, 1, HH - t);
            if (dx < 0) A.box(ctx, 'water_mid', Xw, t, 1, dx < -hw * 0.3 ? 4 : 2);
            if (deep < HH) A.box(ctx, 'water_deep', Xw, deep, 1, HH - deep);
          }
        }
        for (m = 0; m < 10; m++) {
          var kx = r2.int(0, FW - 1), kh = r2.int(Math.round(HH * 0.3), Math.round(HH * 0.8)), kp = r2.range(0, 6.28);
          for (y = 0; y < kh; y++) {
            var kxx = ((kx + Math.round(Math.sin(y * 0.075 + kp) * 4)) % FW + FW) % FW;
            A.box(ctx, 'water_mid', kxx, HH - 1 - y, 2, 1);
            if (y > 6 && y % 12 === 0) { var sd = (y / 12) % 2 ? 1 : -1; A.box(ctx, 'water_mid', kxx + (sd > 0 ? 2 : -4), HH - 1 - y - 1, 4, 1); }
          }
        }
        A.reset();
      });
    });

    // A shaft of light: a slanting wedge in four flat steps of alpha, fading downward.
    set.shaft = B.cached(key + 'shaft', function () {
      return B.layer(28 * HI, 70 * HI, function (ctx) {
        ctx.fillStyle = P.water_hi;
        var SH = 70 * HI;
        for (var y = 0; y < SH; y++) {
          ctx.globalAlpha = [0.22, 0.16, 0.1, 0.05][Math.floor(y * 4 / SH)];
          ctx.fillRect(Math.round(y * 0.3), y, 12 + Math.round(y / 14), 1);
        }
        ctx.globalAlpha = 1;
      });
    });

    // The water's roster as swimmers, every frame both ways in colour and as a silhouette,
    // baked now (at the travel fade's black) rather than the first time each fish shows.
    var FG = G.gfx.fishgen;
    for (var i = 0; i < G.data.fish.length; i++) {
      if (G.data.fish[i].locations.indexOf(loc.id) < 0) continue;
      var frs = FG.SWIM_FRAMES; // Phase 27: the beat and the turn
      for (var q = 0; q < frs.length * 4; q++) FG.swimmer(i, frs[q >> 2], (q & 2) > 0, (q & 1) > 0);
      for (q = 0; q < 4; q++) FG.swimmer(i, q < 2 ? FG.FR.ROLL : FG.FR.SHAKE, false, (q & 1) > 0); // Phase 29: only ever hooked, in colour
    }
    for (q = 0; q < 12; q++) FG.shadow(HEAVY_SP, HEAVY_LEN, FG.BEAT[q % 3 + 1], (q & 1) > 0); // the heavy shadow's beat
    for (q = 0; q < SHN * 4 * 2; q++) FG.shadow(SH_SP[q % SHN], SH_LEN[q % SHN], [0, 1, 3, 5][(q / SHN | 0) % 4], q >= SHN * 4); // the shoals' beat and quick turn (Phase 30)
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
  // A location with a current (11.1, loc.drift) carries it downstream the whole time.
  // The user's fixes (2026-11-03): how well the lure is being worked, 0..1 (cast.work, the fish
  // read it: sim/fish_ai.js W.workMin ...). From the reel (cast.rv against UW.reelIn): m, the
  // share of the time it is moving (smoothed over WK.tau s); go, how often it changes between
  // moving and still (per s, smoothed over WK.tauGo); pop, the popper's pops per s. By style:
  //   steady (a crank's dive, a spinner's or swimbait's 'mid', a glide): reeled along, m
  //   stop-and-go (a jig's or blade's lift, a spoon's flutter): go, and a fall counts
  //   a popper ('top'): its pops, or skittered along
  //   slow (a dropshot, a wacky worm): nearly still is right; reeled fast it is wrong
  //   a float rig (live bait under a float) and live bait: always 1
  var WK = { tau: 1.2, tauGo: 3, still: 2, steadyFull: 0.5, goFull: 0.6, popFull: 0.4, sinkWork: 0.6, sinkLift: 0.9 };
  var STYLE = { dive: 'steady', mid: 'steady', glide: 'steady', lift: 'stopgo', flutter: 'stopgo', top: 'top', dropshot: 'slow', wacky: 'slow' };
  function workStep(run, dt) {
    var c = run.cast, gx = run.gearFx, lure = gx.lure && c.bait === gx.bait, st = lure ? STYLE[gx.swim] : '';
    if (!st) { c.work = 1; return; }
    var moving = (c.rv || 0) > RV.still ? 1 : 0, k = Math.min(1, dt / WK.tau), kg = Math.min(1, dt / WK.tauGo);
    c.wm = (c.wm || 0) + (moving - (c.wm || 0)) * k;
    var flip = moving !== (c.wasMv || 0) ? 1 / dt : 0; c.wasMv = moving;
    c.wgo = (c.wgo || 0) + (flip - (c.wgo || 0)) * kg;
    var popNow = (c.pops || 0) - (c.pops0 || 0); c.pops0 = c.pops || 0;
    c.wpop = (c.wpop || 0) + (popNow / dt - (c.wpop || 0)) * kg;
    var w;
    if (run.fsm === 'sinking') w = st === 'stopgo' ? WK.sinkLift : (st === 'top' ? 0.3 : WK.sinkWork);
    else if (st === 'steady') w = c.wm / WK.steadyFull;
    else if (st === 'stopgo') w = c.wgo / WK.goFull;
    else if (st === 'top') w = Math.max(c.wpop / WK.popFull, 0.6 * c.wm);
    else w = 1 - 0.85 * c.wm;                                                   // slow
    c.work = w < 0 ? 0 : (w > 1 ? 1 : w);
  }

  function lureStep(run, dt, loc) {
    workStep(run, dt);
    var c = run.cast, inp = G.core.input, wy = loc.waterY, bottom = bottomAt(loc, c.x1);
    // Phase 43: a lure fishes its own depth: it sinks at gx.sink of a bait's speed, down to
    // gx.maxDepthM m; a popper ('top') stays on the surface; a plug ('dive') dives as it is reeled.
    // Phase 69: a dropshot's hook hangs gx.dropM m over its weight on the bed.
    var gx = run.gearFx, lure = gx.lure && c.bait === gx.bait, sinkK = lure ? gx.sink : 1, floorPx = lure ? Math.min(bottom - gx.dropM * 4, gx.maxDepthM * 4) : bottom;
    if (run.fsm === 'sinking') {
      if (inp.pressed('action') || (lure && sinkK === 0)) { if (lure && sinkK === 0) c.ly = wy + (gx.swim === 'top' ? 0.5 : FLOAT); c.rv = 0; c.tight = 0; G.core.state.go(run, 'waiting'); return; }
      var depth = c.ly - wy;
      // Phase 77: in fast water (a reach's `sink` under 1, G.data.reachK) the lure barely sinks
      var rk = loc.current && loc.current.reach ? G.data.reachK(loc, c.x1, 'sink', 1) : 1;
      depth += UW.sinkV * sinkK * rk * Math.min(1, 0.15 + (bottom - depth) / 6) * dt;
      if (depth >= floorPx) { depth = floorPx; c.rv = 0; c.tight = 0; G.core.state.go(run, 'waiting'); }
      c.ly = wy + depth;
      drift(c, loc, dt, depth >= bottom);
      c.ly = Math.min(c.ly, wy + bottomAt(loc, c.x1));
      c.lx = c.x1;
      c.bubT = (c.bubT || 0) - dt;
      if (c.bubT <= 0) { c.bubT = 0.4; fx.emit('bubbles', c.lx, c.ly - 2, 1); }
    } else if (run.fsm === 'waiting' || run.fsm === 'interest') {
      if (lure && gx.swim === 'top' && inp.pressed('action') && run.bite.slot < 0) { // the popper pops: a spit and a ring
        fx.ripple(c.x1, wy + 1, 1, 6, 0.6); G.gfx.surface.poke(c.x1, 0.2, 1); body.kick = 0.3; c.pops = (c.pops || 0) + 1;
      }
      // Phase 65: the retrieve. The reel spins up and down (inertia), and the lure is drawn
      // along the line toward the rod tip: deep and close it climbs steeply, far out it runs
      // nearly level. Each lure adds its own action: the spinner's blade lifts it with speed,
      // the plug's lip digs it to a running depth set by speed, the jig hops on each turn and
      // drops, the spoon wobbles low; the popper and the bobber's float come in along the
      // surface (the bobber's bait trailing at its depth). Phase 69: the dropshot is dragged
      // slowly along the bed, its hook held over the weight; the wacky worm comes in level; the
      // glidebait swings in wide slow S-glides at its running depth; a bladebait's lifts are
      // short and sharp (rattle); a swimbait's paddle tail holds it lower than a spinner (kick).
      var reel = inp.held('action') && run.bite.slot < 0, sw = lure ? gx.swim : '';
      c.rv = (c.rv || 0) + ((reel ? UW.reelIn : 0) - (c.rv || 0)) * Math.min(1, (reel ? RV.up : RV.down) * dt);
      G.scene.boat.rodTip(run.boat, run.boat.x, wy, TIPW);
      var b = run.boat, home = b.x + b.facing * UW.reach, far = Math.abs(home - c.x1) > 14;
      var dx = TIPW[0] - c.x1, dy = TIPW[1] - c.ly, L = Math.sqrt(dx * dx + dy * dy) || 1, toward = home > c.x1 ? 1 : -1;
      var v = c.rv, depth0 = c.ly - wy;
      if (v > RV.still) {
        c.tight = RV.tight;                                                       // the line stays tight a moment after the reel stops
        var vx = dx / L * v, vy = dy / L * v;
        if (sw === 'top') { vx = toward * v; vy = 0; c.ly = far ? wy + 0.5 : wy; }
        else if (sw === 'float') { vx = toward * v; vy = far ? 0 : -UW.reelUp; }  // the float skates in; the bait comes up at the boat
        else if (sw === 'dive') { var runD = floorPx * Math.min(1, v / UW.reelIn); vx = toward * v * 0.9; vy = far ? clamp((runD - depth0) * 2.2, -UW.reelUp, UW.reelUp) : -UW.reelUp; }
        else if (sw === 'mid') vy -= RV.lift * v * (gx.vary === 'kick' ? 0.5 : 1); // the blade's lift (a paddle tail lifts it less)
        else if (sw === 'flutter') vy *= 0.7;
        else if (sw === 'lift') {
          var rat = gx.vary === 'rattle';                                         // Phase 69: a bladebait's short sharp lifts
          c.hop = (c.hop || 0) + dt * RV.hops * (rat ? RV.rattle : 1);
          vy = (c.hop % 1) < (rat ? 0.2 : 0.3) ? vy - v * (rat ? 1.7 : 1.3) : UW.sinkV * gx.sink * 0.7; vx *= 0.75;
        }
        else if (sw === 'dropshot') { vx *= 0.45; vy = far ? clamp((floorPx - depth0) * 2, -UW.reelUp, UW.reelUp) : -UW.reelUp; } // Phase 69: along the bed
        else if (sw === 'wacky') vy *= 0.4;                                        // level
        else if (sw === 'glide') {                                                  // wide slow S-glides at its depth
          c.glide = (c.glide || 0) + dt * RV.glide;
          var sg = Math.sin(c.glide * 2 * Math.PI);
          vx = toward * v * (0.7 + 0.3 * Math.abs(sg));
          vy = far ? clamp((floorPx - depth0) * 1.5, -UW.reelUp, UW.reelUp) + sg * v * 0.35 : -UW.reelUp;
        }
        var gap = Math.abs(home - c.x1);
        c.x1 += clamp(vx * dt, -gap, gap);
        c.ly += vy * dt;
        if (!far && c.ly <= wy + 0.5) {
          c.ly = wy; c.rv = 0;
          fx.splash(c.x1, wy, 0.15);
          G.audio.engine.cue('liftout', c.x1); // Phase 25: out of the water, dripping
          G.core.state.go(run, 'sailing');
          return;
        }
        if (c.ly < wy + 0.5) c.ly = wy + 0.5;                                      // at the top it skitters along the surface
      } else {
        c.tight = Math.max(0, (c.tight || 0) - dt);
        if (sw === 'dive') { if (c.ly > wy + FLOAT) c.ly = Math.max(wy + FLOAT, c.ly - UW.reelUp * 0.4 * dt); } // let go, the plug floats back up
        else if (sw === 'float') { if (c.ly < wy + floorPx) c.ly = Math.min(wy + floorPx, c.ly + UW.sinkV * 0.6 * dt); } // the bait sinks back under its float
        else if (sw !== 'top' && (c.tight > 0 || (lure && gx.sink > 0)) && depth0 < floorPx) {
          // Paused: a sinking lure falls back, on a tight line in a pendulum toward the rod
          // (the line's length from the tip held), then straight down on a slack one; a live
          // bait only swings while the line is tight, then hangs where it is.
          var sv = UW.sinkV * (lure ? gx.sink : 0.6) * (sw === 'flutter' ? 0.55 : 0.75), ny = Math.min(wy + floorPx, c.ly + sv * dt);
          if (c.tight > 0) { var R = L, h = ny - TIPW[1]; if (R > h + 1) { var nx = TIPW[0] - (dx >= 0 ? 1 : -1) * Math.sqrt(R * R - h * h); c.x1 += clamp(nx - c.x1, -sv * dt * 2, sv * dt * 2); } }
          c.ly = ny;
        }
      }
      c.swing = c.tight > 0 && !reel ? 1 : 0;
      drift(c, loc, dt, c.ly - wy >= bottom);
      c.lx = c.x1;
      c.ly = Math.min(c.ly, wy + bottomAt(loc, c.x1));
      // Phase 22: a line held in a current lifts the lure off the bottom, the way it swings a
      // real one: up to LIFT px per px/s of flow (the creek's 1–2 m), at 1.5 px/s.
      if (loc.drift && !inp.held('action')) {
        var hold = Math.min(8, LIFT * Math.abs(loc.drift(c.seed, c.tw, c.ly - wy, false, wind(), c.x1))), floor = wy + bottomAt(loc, c.x1) - hold;
        if (c.ly > floor) c.ly = Math.max(floor, c.ly - 1.5 * dt);
      }
    }
  }
  // Phase 65: the retrieve's numbers. up/down: 1/s the reel spins up and runs down; still:
  // px/s under which the lure counts as paused; tight: s the line stays tight after the reel
  // stops (the pendulum); lift: the spinner's rise per px/s; hops: the jig's hops a second.
  // Phase 69: rattle: × the hops of a bladebait; glide: the glidebait's S-glides a second.
  var RV = { up: 7, down: 4, still: 0.6, tight: 1.6, lift: 0.3, hops: 2.2, rattle: 1.6, glide: 0.45 }, TIPW = [0, 0];

  // 11.1: the current moves the lure (and where its line enters) by loc.drift, a pure
  // function of the cast's seed, its time in the water, its depth and (Phase 22, the lakes)
  // the grey hours' wind, at the fixed dt. Phase 77: and where it is (x), for a river's reaches.
  var LIFT = 1.8, FLOAT = 2; // Phase 43: px under the surface a floating plug rests at
  function wind() { return G.scene.sailing.light(G.state.save.clock || 0).grey; }
  function drift(c, loc, dt, onBottom) {
    if (!loc.drift) return;
    c.tw += dt;
    c.x1 = clamp(c.x1 + loc.drift(c.seed, c.tw, c.ly - loc.waterY, onBottom, wind(), c.x1) * dt, 8, loc.width - 8);
  }

  // Phase 22: the water around the lure moves with it. flow(loc, depth) is the current now at
  // depth px, from the same function as the lure's drift (the last cast's seed and time in
  // the water, 20 s on, so it has built up), so the weeds, motes, bubbles, streaks and the line
  // never move against the lure.
  function flow(loc, depth) {
    if (!loc.drift) return 0;
    var c = G.state.run.cast;
    return loc.drift(c.seed || loc.seed, c.tw + 20, depth, false, wind(), c.x1 || loc.start);
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
      shoalSetup(loc);
      for (var c = 0; c < CN; c++) { cx[c] = G.vrng.range(0, VIEW_W + 40); cy[c] = G.vrng.range(0.05, 0.9); cl[c] = G.vrng.range(4, 11); }
      motesReady = true;
    }
    G.scene.life.step(run, dt, loc); // Phase 48: the life under water (it goes on while sailing)
    if (uw.alpha > 0) {
      var f0 = flow(loc, 0), f1 = flow(loc, loc.maxDepth);
      for (var j = 0; j < MN; j++) { mp[j] += dt * 0.8; my[j] += dt * 1.5; mx[j] += (Math.sin(mp[j]) * 2 + f0 + (f1 - f0) * Math.min(1, (my[j] % set.H) / loc.maxDepth)) * dt; }
      shoalStep(run, loc, dt);
      var cur = loc.current;
      // Faster than the lure drifts (the eye needs it), slower with depth, as the drift is (Phase 22: the same flow).
      if (cur && !cur.lake) for (var q = 0; q < CN; q++) cx[q] += (f0 + (f1 - f0) * cy[q]) * 4 * dt;
    }
  }

  // ---- Draw ----------------------------------------------------------------------------
  var WEED_SEQ = [0, 1, 2, 1];
  // Phase 22: the weeds lean the way the water flows (frame 2 leans right, 0 left) and sway
  // back to upright now and then; in still water they sway both ways as before.
  var WEED_FLOW = [2, 2, 1, 2];
  function weedFrame(loc, t) {
    var v = flow(loc, loc.maxDepth * 0.75), k = Math.floor(t * 1.5) % 4;
    if (Math.abs(v) < 0.03) return WEED_SEQ[k];
    return v > 0 ? WEED_FLOW[k] : 2 - WEED_FLOW[k];
  }

  // ---- Swimming bodies (Phase 27) -------------------------------------------------------
  // Each swimmer has a body the scene steps in update() and the draw only reads:
  //   beat: the tail runs REST, AWAY, REST, NEAR (fishgen.BEAT) at a rate set by speed over
  //   body length, from a slow scull to a fast run; while the fish slows it glides, the tail
  //   held straight;
  //   turn: facing changes only past a speed threshold, and always through the turn frames
  //   (the fish seen at an angle), taking longer for a longer fish;
  //   pitch: the body tilts toward the direction of travel, drawn as a column shear.
  // Bodies 0..7 are the school's slots, HOOKB the hooked fish. Visual only: no randomness.
  var SW = {
    beat0: 0.7,    // Hz, sculling in place
    beatK: 1.4,    // Hz per body length per second
    beatMax: 6,    // Hz
    faceV: 1.5,    // px/s of vx before the fish turns to face its way
    turn0: 0.2, turnK: 0.006, turnMax: 0.4, // s: a turn takes turn0 + turnK × body length (world px)
    glideA: -2,    // px/s²: slowing harder than this, the tail stops
    pitchMax: 0.42, pitchK: 4, // slope (about 23°), and how fast it follows (1/s)
    smooth: 0.25   // velocity smoothing per step
  };
  var HOOKB = 8, NB = 9, bodies = [];
  for (var bi0 = 0; bi0 < NB; bi0++) bodies.push({ uid: -1, sp: -1, x: 0, y: 0, vx: 0, vy: 0, spd: 0, acc: 0, face: 1, from: 1, turnT: 0, turnLen: 0, phase: 0, hz: 0, glide: false, pitch: 0, len: 20, mode: 0, shk: 0, jerk: 0 });
  // Phase 29: a body's mode: 0 swimming, 1 shaking its head (the hooked fish, in fight.shake), 2 rolled on its side (tired).
  var HOOK = {
    pullHz0: 2.5, pullHzK: 3.5,  // Hz pulling: pullHz0 + pullHzK × stamina
    tiredHz0: 0.6, tiredHzK: 0.8, // Hz tired: slow
    shakeHz: 8,                   // head turns a second in a shake
    shakePitch: 0.16,             // and its head jerks up and down by this slope
    rollT: 0.35, rollS: 0.5,      // rolled only while tired with T under rollT and stamina under rollS ...
    rollOn: 0.7, rollPeriod: 2.2, // ... for rollOn s of every rollPeriod
    sweep: 0.25, sweepX: 1.5, sweepY: 4, // a run's slow sweeps (rad per thrash unit, px across, px down): it bores up and down more than across
    dive: 10                      // px deeper while pulling, at full stamina
  };
  var lenOf = [];
  function bodyLen(sp) { return lenOf[sp] || (lenOf[sp] = G.gfx.fishgen.swimmer(sp, 0, false, false).width / HI * 0.85); }

  // One body for one step. x, y: where the fish is now; hint: the facing the sim wants when it
  // is barely moving (or always, with useV false); hz: a beat rate to use instead (0: speed's).
  // Phase 28: sim, when not null, is the school fish itself: its swimming speed through the
  // water (not over the bed, which the current adds to), its glide and its pitch.
  function swimOne(bd, uid, sp, x, y, hint, useV, hz, dt, sim) {
    if (bd.uid !== uid) {
      bd.uid = uid; bd.sp = sp; bd.x = x; bd.y = y; bd.vx = bd.vy = bd.spd = bd.acc = 0;
      bd.face = bd.from = hint; bd.turnT = 0; bd.pitch = 0; bd.len = bodyLen(sp);
      bd.phase = (S.hash(uid, 3) & 255) / 256;
    }
    var k = SW.smooth;
    bd.vx += ((x - bd.x) / dt - bd.vx) * k; bd.vy += ((y - bd.y) / dt - bd.vy) * k;
    bd.x = x; bd.y = y;
    var U = Math.sqrt(bd.vx * bd.vx + bd.vy * bd.vy);
    bd.acc += ((U - bd.spd) / dt - bd.acc) * 0.1; bd.spd = U;
    // Facing: through a turn; a turn asked to go back the way it came unwinds.
    var want = useV && Math.abs(bd.vx) > SW.faceV ? (bd.vx > 0 ? 1 : -1) : hint;
    if (bd.turnT > 0) {
      bd.turnT -= dt;
      if (want === bd.from) { var tf = bd.from; bd.from = bd.face; bd.face = tf; bd.turnT = Math.max(0, bd.turnLen - bd.turnT); }
    } else if (want !== bd.face) {
      bd.from = bd.face; bd.face = want;
      bd.turnLen = bd.turnT = Math.min(SW.turnMax, SW.turn0 + SW.turnK * bd.len);
    }
    if (bd.turnT < 0) bd.turnT = 0;
    // The beat: speed over length; gliding, the tail finishes its stroke and rests.
    var Us = sim ? sim.spd : U;
    bd.hz = hz || Math.min(SW.beatMax, SW.beat0 + SW.beatK * Us / bd.len);
    bd.glide = !hz && (sim ? sim.gl === 1 : bd.acc < SW.glideA && U > 1);
    var idx = Math.floor(bd.phase * 4) & 3;
    if (!bd.glide || idx === 1 || idx === 3) { bd.phase += bd.hz * dt; bd.phase -= Math.floor(bd.phase); }
    // Pitch: toward the direction of travel, level while barely moving or turning.
    var tp = bd.turnT > 0 ? 0 : (sim ? clamp(Math.sin(sim.pitch), -SW.pitchMax, SW.pitchMax) * Math.min(1, sim.spd / 3) :
      (U > 1 ? clamp(bd.vy / U, -SW.pitchMax, SW.pitchMax) * Math.min(1, U / 3) : 0));
    bd.pitch += (tp - bd.pitch) * Math.min(1, SW.pitchK * dt);
  }

  // Steps every body: the school's and the hooked fish's.
  function swimStep(run, dt) {
    var school = run.school, i, f;
    if (!school) return;
    for (i = 0; i < school.fish.length && i < HOOKB; i++) {
      f = school.fish[i];
      if (!f.active) { bodies[i].uid = -1; continue; }
      // Phase 28: the sim has a heading now, so the body faces where the fish faces (a fish
      // slipping back tail first in a current, or backing off the lure, keeps its facing).
      swimOne(bodies[i], f.uid, f.sp, f.x, f.y, f.face, false, 0, dt, f);
    }
    var fsm = run.fsm, h = run.hook;
    if (fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing') {
      // The hooked fish faces where the fight sends it (away pulling, home tired); its beat
      // follows the pull. Its thrash is in its position, so its facing ignores its speed.
      // Phase 29: its beat from the fight: fast while pulling (faster the fresher), slow tired.
      var F = run.fight, bh = bodies[HOOKB], pull = fsm !== 'landing' && F.mode === 'pull';
      swimOne(bh, h.uid, h.sp, h.x, h.y, h.face, false, fsm === 'landing' ? 3 : (pull ? HOOK.pullHz0 + HOOK.pullHzK * F.S : HOOK.tiredHz0 + HOOK.tiredHzK * F.S), dt, null);
      // A head shake (fight.shake) turns the head side to side and jerks it; a spent fish lists.
      bh.mode = 0; bh.jerk = 0;
      if (fsm === 'fighting' && F.shake > 0) {
        bh.mode = 1; bh.shk += HOOK.shakeHz * 2 * dt;
        bh.jerk = HOOK.shakePitch * ((Math.floor(bh.shk) & 1) ? 1 : -1);
      } else if (fsm === 'fighting' && F.mode === 'tired' && F.T < HOOK.rollT && F.S < HOOK.rollS && F.t % HOOK.rollPeriod < HOOK.rollOn) bh.mode = 2;
    } else bodies[HOOKB].uid = -1;
  }

  // What a body draws now: the frame and the facing (the turn's own, then the beat's).
  var art = { fr: 0, face: 1 };
  function bodyArt(bd, phaseOff) {
    if (bd.turnT > 0) {
      var u = 1 - bd.turnT / bd.turnLen;
      art.face = u < 0.5 ? bd.from : bd.face;
      art.fr = u < 0.25 || u >= 0.75 ? G.gfx.fishgen.FR.TURN1 : G.gfx.fishgen.FR.TURN2;
    } else if (bd.mode === 1) { // Phase 29: the head turned, then back
      art.face = bd.face; art.fr = (Math.floor(bd.shk) & 1) ? G.gfx.fishgen.FR.SHAKE : G.gfx.fishgen.FR.REST;
    } else if (bd.mode === 2) {
      art.face = bd.face; art.fr = G.gfx.fishgen.FR.ROLL;
    } else {
      art.face = bd.face;
      var p = bd.phase + phaseOff;
      art.fr = G.gfx.fishgen.BEAT[Math.floor((p - Math.floor(p)) * 4) & 3];
    }
    return art;
  }

  // Fish (6.8). Reads the AI state and the bodies only. Phase 72: the wrong movements (the
  // twitch, the uneven beat, the reversed beat, the glitch frames) went with the wrong fish.
  // Phase 19: each fish is a swimmer (fishgen.swimmer), painted at swimming size in the view's
  // pixels with its own ink outline, so the old 1 px silhouette ring is gone.
  function drawFish(ctx, loc, camPx, camPy, t) {
    var school = G.state.run.school, FG = G.gfx.fishgen, night = !G.sim.clock.isGrey(G.state.save.clock || 0);
    if (!school) return;
    for (var i = 0; i < school.fish.length; i++) {
      var f = school.fish[i], bd = bodies[i];
      if (!f.active || bd.uid !== f.uid) continue;
      // Deeper than gearFx.nightDepth at night (no lantern): only a silhouette.
      var dark = night && f.y > G.state.run.gearFx.nightDepth;
      var a = bodyArt(bd, 0);
      drawSwimmer(ctx, FG.swimmer(f.sp, a.fr, dark, a.face < 0), f.x - camPx, loc.waterY - camPy + f.y, bd.pitch, a.face);
    }
  }

  // Draws a swimmer's canvas (view pixels) centred on world point (x, y): its middle across,
  // its body's middle row down. Pitched (slope s, the head up for s < 0 when it swims its
  // way), it is drawn in vertical strips, each dropped by the slope at its middle; a strip is
  // as wide as one view pixel of drop.
  function drawSwimmer(ctx, cv, x, y, s, face) {
    var X0 = Math.round((x - cv.width / (2 * HI)) * HI) / HI, Y0 = Math.round((y - cv.midY / HI) * HI) / HI, W = cv.width, H = cv.height;
    var as = s ? Math.abs(s) : 0;
    if (as * W < 1.5) { ctx.drawImage(cv, X0, Y0, W / HI, H / HI); return; }
    var sw = clamp(Math.round(1 / as), 2, 8);
    for (var sx = 0; sx < W; sx += sw) {
      var n = Math.min(sw, W - sx), d = (sx + n / 2 - W / 2) / HI;
      ctx.drawImage(cv, sx, 0, n, H, X0 + sx / HI, Y0 + Math.round(d * face * s * HI) / HI, n / HI, H / HI);
    }
  }

  // ---- Far shoals (Phase 30) -------------------------------------------------------------
  // The far silhouettes (parallax 0.5, wrapping every FAR px) are SHN loose shoals of 3-7.
  // Each fish steers by its shoal (separation, alignment, cohesion) toward the shoal's own
  // cruise (a heading that sometimes turns round, a depth), and a hard spacing rule keeps any
  // two of a shoal from overlapping. A splash (fx.onSplash) or the boat moving overhead
  // startles the fish within reach: they dart away and down in a burst, then regroup.
  // Visual only: G.vrng, stepped in update(), drawn from the arrays.
  var FAR = 640, SB = {
    cruise0: 2, cruise1: 5,   // px/s a shoal cruises at
    turn0: 10, turn1: 25,     // s between a shoal turning round
    sepX: 0.85, sepY: 0.7,    // spacing: a pair must be this × length apart across, or × height down
    kSep: 3, kAli: 1.2, kCoh: 0.35, kGoal: 0.8, // 1/s steering weights
    cohR: 60,                 // px: a member further than this from its shoal swims harder back
    vmax: 8, scareV: 22,      // px/s at most, and fleeing
    scareR0: 30, scareRK: 60, // px of reach: scareR0 + scareRK × splash power
    scareT: 1.6,              // s a scare lasts (fading)
    scareA: 12,               // 1/s: how fast a startled fish reaches its flight
    boatV: 6, boatR: 40,      // the boat moving faster than boatV px/s scares fish within boatR of it (down counts half)
    turnT: 0.12,              // s of the quick turn frame when a startled fish whips round
    deep: 0.5                 // × the water's deepest: shoals keep above this, so the near bed (drawn over the far layer) rarely hides them
  };
  fx.listen(function (x, power) { startle(x, power, 0); }); // every splash
  function wrapD(d) { return d - FAR * Math.round(d / FAR); } // a far-space difference, shortest way round
  function shoalSetup(loc) {
    for (var i = 0; i < BN; i++) bon[i] = 0;
    for (var k = 0; k < SHN; k++) {
      var cvs = G.gfx.fishgen.shadow(SH_SP[k], SH_LEN[k], 0, false);
      shL[k] = cvs.width / HI * 0.8; shH[k] = cvs.height / HI * 0.55; // the body's length and depth (world px)
      shDir[k] = G.vrng.next() < 0.5 ? -1 : 1; shV[k] = G.vrng.range(SB.cruise0, SB.cruise1);
      shY[k] = G.vrng.range(16, Math.max(20, loc.maxDepth * SB.deep)); shT[k] = G.vrng.range(SB.turn0, SB.turn1);
      var n = SH_SP[k] === 'common_carp' ? 3 + (G.vrng.next() * 2 | 0) : 4 + (G.vrng.next() * 4 | 0), x0 = k * FAR / SHN + G.vrng.range(0, 80);
      for (var j = 0; j < n; j++) {
        var i2 = k * SHMAX + j;
        bon[i2] = 1; bx[i2] = x0 + (j % 3) * shL[k] * 1.1 + G.vrng.range(-3, 3); by[i2] = shY[k] + ((j / 3) | 0) * shH[k] * 1.1 + G.vrng.range(-2, 2);
        bvx[i2] = shDir[k] * shV[k]; bvy[i2] = 0; bsc[i2] = 0; bfl[i2] = 0; bph[i2] = G.vrng.next(); bface[i2] = shDir[k]; bturn[i2] = 0;
      }
    }
  }
  // Startles the far fish around world x (a splash of power 0..1.5 at the surface, or the
  // boat). The far layer's x for it is where it sits on the screen, at parallax 0.5.
  var lastCam = 0;
  function startle(x, power, depth, reach) {
    var fxw = x - lastCam * 0.5 + 160, R = reach /* the far x drawn where world x is drawn */ || SB.scareR0 + SB.scareRK * Math.min(1, power);
    for (var i = 0; i < BN; i++) {
      if (!bon[i]) continue;
      var dx = wrapD(bx[i] - fxw), dy = by[i] - (depth || 0);
      if (dx * dx + dy * dy * 0.5 > R * R) continue;
      var dir = dx >= 0 ? 1 : -1;
      if (bsc[i] < 0.5 && bface[i] !== dir) bturn[i] = SB.turnT; // it whips round
      bsc[i] = SB.scareT; bfl[i] = dir; bface[i] = dir;
    }
  }
  function shoalStep(run, loc, dt) {
    lastCam = run.cam.x;
    var b = run.boat, i, j, k;
    if (Math.abs(b.vx) > SB.boatV) startle(b.x, 0, 0, SB.boatR); // the hull overhead: fish near the top under it
    for (k = 0; k < SHN; k++) { shT[k] -= dt; if (shT[k] <= 0) { shT[k] = G.vrng.range(SB.turn0, SB.turn1); shDir[k] = -shDir[k]; shY[k] = clamp(shY[k] + G.vrng.range(-10, 10), 16, Math.max(20, loc.maxDepth * SB.deep)); } }
    for (i = 0; i < BN; i++) {
      if (!bon[i]) continue;
      k = (i / SHMAX) | 0;
      var cx0 = 0, cy0 = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
      for (j = k * SHMAX; j < k * SHMAX + SHMAX; j++) {
        if (!bon[j] || j === i) continue;
        var dx = wrapD(bx[j] - bx[i]), dy = by[j] - by[i];
        cx0 += dx; cy0 += dy; ax += bvx[j]; ay += bvy[j]; n++;
        var ux = Math.abs(dx) / (shL[k] * 1.3), uy = Math.abs(dy) / (shH[k] * 1.4), u = Math.max(ux, uy);
        if (u < 1) { sx -= (dx >= 0 ? 1 : -1) * (1 - u) * shL[k]; sy -= (dy >= 0 ? 1 : -1) * (1 - u) * shH[k] * 0.5; }
      }
      var gx = shDir[k] * shV[k], gy = (shY[k] - by[i]) * 0.3, tx = bvx[i], ty = bvy[i];
      if (n) {
        cx0 /= n; cy0 /= n; ax /= n; ay /= n;
        var far = Math.sqrt(cx0 * cx0 + cy0 * cy0) > SB.cohR ? 3 : 1;
        tx += (sx * SB.kSep + (ax - bvx[i]) * SB.kAli + cx0 * SB.kCoh * far + (gx - bvx[i]) * SB.kGoal) * dt;
        ty += (sy * SB.kSep + (ay - bvy[i]) * SB.kAli + cy0 * SB.kCoh * far + (gy - bvy[i]) * SB.kGoal) * dt;
      } else { tx += (gx - bvx[i]) * SB.kGoal * dt; ty += (gy - bvy[i]) * SB.kGoal * dt; }
      if (bsc[i] > 0) { // startled: away and a little down, fast, fading out
        var s = Math.min(1, bsc[i] / (SB.scareT * 0.5)), k2 = Math.min(1, SB.scareA * dt);
        tx += (bfl[i] * SB.scareV * s - tx) * k2 * s; ty += (SB.scareV * 0.3 * s - ty) * k2 * s;
        bsc[i] -= dt;
      }
      var sp = Math.sqrt(tx * tx + ty * ty), vm = bsc[i] > 0 ? SB.scareV : SB.vmax;
      if (sp > vm) { tx *= vm / sp; ty *= vm / sp; }
      if (Math.abs(ty) > 0.6 * Math.max(sp, 1) && bsc[i] <= 0) ty = (ty > 0 ? 0.6 : -0.6) * Math.max(sp, 1);
      bvx[i] = tx; bvy[i] = ty;
      bph[i] += (1 + Math.sqrt(tx * tx + ty * ty) / 4) * dt; // the beat: faster as it goes
      bturn[i] = Math.max(0, bturn[i] - dt);
      if (bsc[i] <= 0 && Math.abs(tx) > 1) { var nf = tx > 0 ? 1 : -1; if (nf !== bface[i]) { bface[i] = nf; bturn[i] = SB.turnT * 2; } }
    }
    for (i = 0; i < BN; i++) if (bon[i]) {
      bx[i] += bvx[i] * dt; bx[i] -= FAR * Math.floor(bx[i] / FAR);
      by[i] = clamp(by[i] + bvy[i] * dt, 12, Math.max(14, loc.maxDepth * SB.deep + 16));
    }
    // The spacing rule: no two of a shoal closer than sepX × length across while within
    // sepY × height down; pushed apart along the easier way, three passes.
    for (var it = 0; it < 3; it++) for (k = 0; k < SHN; k++) for (i = k * SHMAX; i < k * SHMAX + SHMAX; i++) {
      if (!bon[i]) continue;
      for (j = i + 1; j < k * SHMAX + SHMAX; j++) {
        if (!bon[j]) continue;
        var ddx = wrapD(bx[j] - bx[i]), ddy = by[j] - by[i], mx2 = SB.sepX * shL[k] - Math.abs(ddx), my2 = SB.sepY * shH[k] - Math.abs(ddy);
        if (mx2 <= 0 || my2 <= 0) continue;
        if (my2 * shL[k] < mx2 * shH[k]) { var py = (ddy >= 0 ? 1 : -1) * my2 * 0.5 + (ddy >= 0 ? 0.01 : -0.01); by[i] -= py; by[j] += py; }
        else { var px = (ddx >= 0 ? 1 : -1) * mx2 * 0.5 + (ddx >= 0 ? 0.01 : -0.01); bx[i] -= px; bx[j] += px; }
      }
    }
  }
  function drawShoals(ctx, camPx, wyS) {
    var FG = G.gfx.fishgen;
    for (var i = 0; i < BN; i++) {
      if (!bon[i]) continue;
      var k = (i / SHMAX) | 0, xs = ((bx[i] - camPx * 0.5) % FAR + FAR) % FAR - 160; // parallax 0.5, wrapping
      var fr = bturn[i] > 0 ? FG.FR.TURN2 : FG.BEAT[Math.floor(bph[i] * 4) & 3];
      drawSwimmer(ctx, FG.shadow(SH_SP[k], SH_LEN[k], fr, bface[i] < 0), xs, wyS + by[i]);
    }
  }

  // A HI-res layer (a location's width) scrolled to camPx, drawn at screen y wyS.
  function drawLayer(ctx, cv, camPx, wyS, H) {
    ctx.drawImage(cv, Math.round(camPx * HI), 0, VIEW_W * HI, H * HI, 0, wyS, VIEW_W, H);
  }

  // Phase 20: caustics. Where the surface curves into a crest it focuses light: faint
  // filaments hang down from those columns through the top CAUSTIC px (6 m), flickering by a
  // hash of time, and where the bed is that shallow a bright dash lies on it. They follow the
  // surface's columns (gfx/surface.js), so ripples throw caustics too.
  var CAUSTIC = 24;
  function drawCaustics(ctx, loc, camPx, wyS, alpha, t) {
    if (wyS + CAUSTIC < 0) return;
    var surf = G.gfx.surface, cols = surf.fill(camPx), thr = 0.35 * surf.swellCurve() + 0.004, tick = Math.floor(t * 3), q = 1 / HI;
    ctx.fillStyle = P.water_foam; // water_hi is too close to the lit water to read
    for (var i = 1; i < 639; i++) {
      var k = cols[i] + cols[i + 2] - 2 * cols[i + 1];
      if (k > -thr) continue;
      if (k > cols[i - 1] + cols[i + 1] - 2 * cols[i] || k > cols[i + 1] + cols[i + 3] - 2 * cols[i + 2]) continue; // the focus only
      var xw = camPx + i * q, hs = S.hash(Math.round(xw * HI), tick), sway = ((hs >> 3) & 3) - 1.5;
      var str = Math.min(1, -k / (thr * 2.5));
      for (var j = 0; j < 5; j++) {
        if ((hs >> j) & 1) continue;
        ctx.globalAlpha = alpha * 0.26 * str * (1 - j / 5);
        ctx.fillRect(Math.round(i + sway * j * 0.5) * q, Math.round((wyS + 2 + j * 4.5) * HI) * q, q, 2.5 * q * (3 - (j >> 1)));
      }
      var bed = bottomAt(loc, xw);
      if (bed < CAUSTIC) {
        ctx.globalAlpha = alpha * 0.4 * str * (1 - bed / CAUSTIC);
        ctx.fillRect(i * q - q, Math.round((wyS + bed - 1) * HI) * q, 3 * q, q);
      }
    }
    ctx.globalAlpha = alpha;
  }

  // camPx, camPy: the rounded camera (half pixels). alpha: how far the fade has got. t: time in seconds.
  function draw(ctx, loc, camPx, camPy, alpha, t) {
    var t0 = performance.now(), set = prepare(loc), H = set.H, HH = H * HI, wyS = loc.waterY - camPy;
    // Phase 15: the cross-section is always drawn (the mirror band covers its top while
    // sailing), so the old opening wipe (audit P2-3) is the band shrinking instead.
    ctx.globalAlpha = alpha;
    ctx.drawImage(set.grad, 0, 0, 1, HH, 0, wyS, VIEW_W, H);

    var every = loc.underwater.shaftEvery, par = camPx * 0.8, k0 = Math.floor(par / every) - 1;
    for (var k = k0; k < k0 + 4; k++) {
      ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * 0.6 + k * 1.7));
      ctx.drawImage(set.shaft, Math.round((k * every + 40 - par) * HI) / HI, wyS, set.shaft.width / HI, set.shaft.height / HI);
    }
    // The far formations (Phase 15), wrapping, behind the silhouettes.
    var FW = FAR_W * HI, VW = VIEW_W * HI, fo = ((Math.round(camPx * 0.6 * HI) % FW) + FW) % FW, fw = Math.min(VW, FW - fo);
    ctx.globalAlpha = alpha * 0.85;
    ctx.drawImage(set.far, fo, 0, fw, HH, 0, wyS, fw / HI, H);
    if (fw < VW) ctx.drawImage(set.far, 0, 0, VW - fw, HH, fw / HI, wyS, (VW - fw) / HI, H);
    ctx.globalAlpha = alpha * 0.3;
    drawShoals(ctx, camPx, wyS);
    ctx.globalAlpha = alpha;
    drawLayer(ctx, set.bottom, camPx, wyS, H);
    drawCaustics(ctx, loc, camPx, wyS, alpha, t);
    G.scene.life.drawBed(ctx, loc, camPx, wyS, alpha); // Phase 48: crayfish, snails, the eel, silt
    drawLayer(ctx, set.weeds[weedFrame(loc, t)], camPx, wyS, H);
    G.scene.life.drawWater(ctx, loc, camPx, wyS, alpha); // Phase 48: fry, tadpoles, the darting perch, the turtle
    drawHeavy(ctx, loc, camPx, camPy, alpha);
    var tf = performance.now();
    drawFish(ctx, loc, camPx, camPy, t);
    stats.fishMs = performance.now() - tf; // Phase 27

    ctx.fillStyle = P.water_hi;
    var cur = loc.current;
    if (cur && !cur.lake) {
      // The current: short streaks, each two dashes, drifting downstream (parallax 1).
      ctx.fillStyle = P.water_foam;
      ctx.globalAlpha = alpha * 0.3;
      var span = VIEW_W + 40;
      for (var c = 0; c < CN; c++) {
        var sx = Math.round((((cx[c] - camPx) % span + span) % span - 20) * HI) / HI, sy = Math.round((wyS + 3 + cy[c] * loc.maxDepth) * HI) / HI, L = Math.round(cl[c]);
        ctx.fillRect(sx, sy, L, 0.5);
        ctx.fillRect(sx + L + 1.5, sy, Math.max(1, L >> 2), 0.5);
      }
      ctx.fillStyle = P.water_hi;
    }
    ctx.globalAlpha = alpha * 0.5;
    for (var i = 0; i < MN; i++) {
      var x = ((mx[i] - camPx * 0.9) % VIEW_W + VIEW_W) % VIEW_W;
      ctx.fillRect(Math.round(x * HI) / HI, Math.round((wyS + 2 + (my[i] % (H - 4))) * HI) / HI, 0.5, 0.5);
    }
    ctx.globalAlpha = 1;
    stats.ms = performance.now() - t0;
  }

  // ---- Bite, hook, fight, landing (7.1-7.5) --------------------------------------------
  var HOOKED_BEAT = 0.3;  // s between the hook-set and the fight
  var LAND_TIME = 0.9;    // s to lift the fish out beside the boat
  var SHALLOW = 16;       // px (4 m): a hooked fish pulling above this churns the surface (Phase 20)
  var biteIn = { reel: false, auto: false }, fightIn = { reel: false };

  function createCatch() {
    return {
      hook: { sp: -1, uid: 0, x: 0, y: 0, x0: 0, y0: 0, dist: 0, depth: 0, t: 0, lift: 0, thrash: 0, face: 1, len: 0, w: 0, q: 0, drip: -1, wet: 0, churn: 0, air: false },
      heavy: { state: 0, t: 0, x: 0, y: 0, dir: 1, hum: 0 } // 7.7: 0 none yet this cast, 1 passing, 2 done
    };
  }

  // The fish on the bite is hooked: roll its size, start the fight, scatter the rest.
  function hook(run) {
    var b = run.bite, f = run.school.fish[b.slot], sp = G.data.fish[f.sp], h = run.hook, boatB = run.boat;
    h.sp = f.sp; h.uid = f.uid; h.x = f.x; h.y = f.y; h.t = 0; h.lift = 0; h.thrash = 0; h.drip = -1; h.wet = 1; h.churn = 0; h.air = false; // wet: 1 until it leaves the water
    fx.splash(run.cast.x1, G.scene.sailing.loc().waterY, 0.25); // audit P1-4: the hook-set shows at the surface
    h.dist = Math.max(8, Math.abs(f.x - (boatB.x + boatB.facing * UW.reach)));
    h.depth = f.y;
    h.q = G.sim.economy.hookQ(sp, run.cast.bait, G.rng.next(), G.data); // Phase 44: the size curve; Phase 68: in the lure's sizes
    G.sim.economy.size(sp, h.q, h);
    // gearFx: lineStrength, reelSpeed; Phase 23: the hook hold from how long the bite had waited
    G.sim.fight.start(run.fight, f.sp, sp, run.gearFx, G.rng, G.data, G.sim.bite.hold(b.t, G.data));
    f.active = false;
    G.sim.fish_ai.scatter(run.school);
    G.sim.bite.reset(b);
    G.core.state.go(run, 'hooked');
    if (G.core.debug) G.core.debug.log('hooked ' + sp.id + ' ' + h.len + ' cm ' + h.w + ' kg');
  }

  // Where the hooked fish is: D sets how far out (0 at the boat), it rises toward the surface
  // as it comes in, and thrashes while pulling. The line and camera follow cast.x1/ly.
  function hookPos(run, dt, loc) {
    var F = run.fight, h = run.hook, b = run.boat, tx, ty;
    if (run.fsm === 'landing') {
      h.lift = Math.min(1, h.lift + dt / LAND_TIME);
      var u = h.lift * h.lift * (3 - 2 * h.lift);
      tx = b.x + b.facing * 18; ty = -12;
      h.x = h.x0 + (tx - h.x0) * u;
      h.y = h.y0 + (ty - h.y0) * u;
      h.face = b.x > h.x ? 1 : -1;
      if (h.wet > 0 && h.y < 0) { h.wet = 0; G.gfx.surface.poke(h.x, 0.6, 3); } // Phase 20: it breaks the surface
      // Audit P1-4: once out of the water the fish sheds droplets along its arc.
      var k = Math.floor(h.lift * 12);
      if (k !== h.drip && h.y < 0) { h.drip = k; fx.emit('splash', h.x, loc.waterY + h.y + 2, 2); }
    } else {
      var frac = F.D / F.D0;
      tx = b.x + b.facing * (UW.reach + Math.min(frac * h.dist, 140)); // 140 px: boat and fish share the screen
      ty = h.depth * Math.min(1, frac);
      if (F.mode === 'pull') {
        // Phase 29: a run bores up and down in slow arcs and dives while the fish is fresh (it
        // used to shake ±3 px at 2 Hz; the head shakes are drawn on the body now).
        h.thrash += dt * 14; tx += Math.sin(h.thrash * HOOK.sweep) * HOOK.sweepX; ty += Math.cos(h.thrash * HOOK.sweep * 0.8) * HOOK.sweepY + HOOK.dive * F.S;
        // Phase 20: a fish pulling near the surface (above 4 m) churns it, harder the shallower.
        if (h.y < SHALLOW) { h.churn += dt * 5; if (h.churn >= 1) { h.churn -= 1; G.gfx.surface.poke(h.x, 0.4 * (1 - h.y / SHALLOW), 2); if (G.vrng.next() < 0.2 * F.speed) G.audio.engine.cue('thrash', h.x, 1 - h.y / SHALLOW); } } // splashes: more often for a fast fish
      }
      // Phase 23: a jump lifts it clear of the water in an arc and drops it back.
      var jl = G.data.gear.fight.jumpLen;
      if (F.jump > 0) ty = -14 * Math.sin(Math.PI * (1 - F.jump / jl));
      h.x += (tx - h.x) * Math.min(1, 5 * dt);
      // Phase 29: a jump cut short (the fight turned tired mid-leap) falls back, not snaps.
      var yb = h.y;
      h.y += (ty - h.y) * Math.min(1, (F.jump > 0 || yb < 0 ? 14 : 4) * dt);
      h.y = clamp(h.y, F.jump > 0 ? -16 : Math.min(2, yb), bottomAt(loc, h.x) - 2);
      var air = h.y < 0;
      if (air !== h.air) { // out of the water, or back in: a splash and a dent in the surface
        h.air = air;
        fx.splash(h.x, loc.waterY, air ? 0.5 : 0.8);
        G.audio.engine.cue('jump', h.x, air ? 0 : 1); // Phase 25: out, and the bigger splash back in
        if (air && Math.abs(h.x - b.x) < DOG_NEAR) G.scene.dog.request(run.dog, 'jump'); // Phase 42
      }
      var away = h.x >= b.x ? 1 : -1;
      h.face = F.mode === 'pull' ? away : -away;
    }
    var c = run.cast;
    c.x1 = c.lx = h.x;
    c.ly = loc.waterY + h.y;
  }

  // Lets a lost fish (snap or escape) swim off as an ordinary fish.
  function release(run) {
    var h = run.hook, f = G.sim.fish_ai.spawn(run.school, h.sp, h.x, h.y, h.face, G.rng, G.data);
    if (f) { f.state = 'leave'; f.t = 0; f.missed = 1; }
  }

  var DOG_NEAR = 60, DOG_BIG = 2; // Phase 42: px from the boat a jump makes the dog bark; kg (or any rarer fish) a landing does

  function catchStep(run, dt, loc) {
    var inp = G.core.input, fsm = run.fsm, F = G.sim.fight;
    if (fsm === 'waiting' || fsm === 'interest') {
      biteIn.reel = inp.held('action');
      var biting = run.bite.slot >= 0;
      if (G.sim.bite.step(run.bite, biteIn, dt, G.rng, G.data, run.school) === G.sim.bite.HOOK) hook(run);
      else if (!biting && run.bite.slot >= 0) { // audit P1-4: a ring where the line goes in, and a dent (Phase 20)
        fx.ripple(run.cast.x1, loc.waterY + 1, 1, 7, 0.6);
        G.gfx.surface.poke(run.cast.x1, 0.3, 1.5);
      }
    } else if (fsm === 'hooked') {
      run.hook.t += dt;
      if (run.hook.t >= HOOKED_BEAT) G.core.state.go(run, 'fighting');
    } else if (fsm === 'fighting') {
      fightIn.reel = inp.held('action');
      var res = F.step(run.fight, fightIn, dt, G.rng, G.data);
      if (run.fight.slipped) { fx.ripple(run.hook.x, loc.waterY + 2, 2, 10, 0.8); G.gfx.surface.poke(run.hook.x, 0.5); } // the soft slip sound: audio/engine.js
      if (res === F.WIN) {
        run.hook.x0 = run.hook.x; run.hook.y0 = run.hook.y;
        G.core.state.go(run, 'landing');
      } else if (res === F.SNAP || res === F.ESCAPE) {
        release(run);
        // Phase 43: a snapped line takes the lure with it (a thrown hook does not).
        if (res === F.SNAP && G.sim.economy.loseLure(G.state.save, run.cast.bait, G.data)) {
          var lb = G.sim.economy.baitById(run.cast.bait, G.data), left = G.state.save.baits[lb.id] || 0;
          G.ui.hud.say('Lost the ' + lb.name + '. ' + (left ? left + ' left.' : 'None left: worms next.'));
          G.core.save.autosave('lure');
        }
        fx.splash(run.hook.x, loc.waterY, 0.3);
        if (G.core.debug) G.core.debug.log(res === F.SNAP ? 'the line snapped' : 'it slipped away');
        G.core.state.go(run, 'sailing');
        return;
      }
    } else if (fsm === 'landing') {
      if (run.hook.lift >= 1) {
        fx.splash(run.hook.x, loc.waterY, 0.4);
        G.ui.card.open(G.ui.card.build(run.hook.sp, run.hook, G.state.save, run.cast.latched));
        if (run.hook.w >= DOG_BIG) G.scene.dog.request(run.dog, 'catch'); // Phase 42: a big one (Phase 68: by weight alone)
        G.core.state.go(run, 'card');
        return;
      }
    }
    if (fsm === 'hooked' || fsm === 'fighting' || fsm === 'landing') hookPos(run, dt, loc);
    heavyStep(run, dt);
  }

  // 7.7: when a species too heavy for the rod would be here (fish_ai sets tooHeavyNear), a
  // large shadow passes once below the lure and the line hums once. No UI, ever.
  function heavyStep(run, dt) {
    var hv = run.heavy, fsm = run.fsm;
    if (hv.state === 0 && run.school.ctx.tooHeavyNear && (fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest')) {
      hv.state = 1; hv.t = 0; hv.dir = G.vrng.next() < 0.5 ? -1 : 1;
      hv.x = run.cast.x1 - hv.dir * 200; hv.y = run.cast.ly - G.scene.sailing.loc().waterY + 14; hv.hum = 0.6;
      if (G.core.debug) G.core.debug.log('something heavier circles here');
      // The single line hum is played by audio/engine.js when hv.state turns 1.
    }
    if (hv.state === 1) {
      hv.t += dt; hv.x += hv.dir * 40 * dt; hv.hum = Math.max(0, hv.hum - dt);
      if (hv.t > 10) hv.state = 2;
    }
  }

  function resetHeavy(run) { run.heavy.state = 0; run.heavy.hum = 0; }

  // The heavy shadow: a channel catfish's silhouette painted at twice the swimming size (never a scaled sprite; Phase 72: was the bare catfish body plan).
  function drawHeavy(ctx, loc, camPx, camPy, alpha) {
    var hv = G.state.run.heavy;
    if (!hv || hv.state !== 1) return;
    var fade = Math.min(1, hv.t / 1.5, (10 - hv.t) / 1.5);
    ctx.globalAlpha = alpha * 0.55 * Math.max(0, fade);
    drawSwimmer(ctx, G.gfx.fishgen.shadow(HEAVY_SP, HEAVY_LEN, G.gfx.fishgen.BEAT[Math.floor(hv.t * 2.4) & 3], hv.dir < 0), hv.x - camPx, loc.waterY - camPy + hv.y); // slow: 0.6 Hz
    ctx.globalAlpha = alpha;
  }

  // The hooked (or lifted) fish. Drawn after the boat so the lift shows above the water.
  function drawHooked(ctx, loc, camPx, camPy, t) {
    var run = G.state.run, fsm = run.fsm;
    if (fsm !== 'hooked' && fsm !== 'fighting' && fsm !== 'landing') return;
    var h = run.hook, FG = G.gfx.fishgen;
    var bd = bodies[HOOKB];
    if (bd.uid !== h.uid) return;
    var a = bodyArt(bd, 0); // Phase 27: its beat, its turns and its pitch
    drawSwimmer(ctx, FG.swimmer(h.sp, a.fr, false, a.face < 0), h.x - camPx, loc.waterY - camPy + h.y, bd.pitch + bd.jerk, a.face);
  }

  // Screen position of the hooked fish's mouth (where the line ties on), written into out:
  // on the frame its body draws now, dropped by the pitch at the mouth's column.
  function mouth(loc, camPx, camPy, out) {
    var h = G.state.run.hook, bd = bodies[HOOKB], on = bd.uid === h.uid, a = on ? bodyArt(bd, 0) : null;
    var cv = G.gfx.fishgen.swimmer(h.sp, a ? a.fr : 0, false, (a ? a.face : h.face) < 0);
    var X0 = Math.round((h.x - camPx - cv.width / (2 * HI)) * HI) / HI, Y0 = Math.round((loc.waterY - camPy + h.y - cv.midY / HI) * HI) / HI;
    out[0] = X0 + (cv.mouthX + 0.5) / HI;
    out[1] = Y0 + (cv.mouthY + 0.5) / HI;
    var pt = a ? bd.pitch + bd.jerk : 0;
    if (a && Math.abs(pt) * cv.width >= 1.5) { // the strip the mouth is in, as drawSwimmer drops it
      var sw = clamp(Math.round(1 / Math.abs(pt)), 2, 8), sx = Math.floor(cv.mouthX / sw) * sw, n = Math.min(sw, cv.width - sx);
      out[1] += Math.round((sx + n / 2 - cv.width / 2) / HI * a.face * pt * HI) / HI;
    }
    return out;
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

  // ---- The lure's body (Phase 22.3) --------------------------------------------------
  // The lure has a heading and a flutter, from how it moves through the water: nose-first
  // when it moves (sinking, reeled, flying), nose into the current when it hangs in one, nose
  // toward the boat in still water. Each bait moves its own way: the worm undulates, the
  // cricket kicks now and then, the minnow wobbles and flashes a pale pixel. The body only
  // reads the cast; it never moves the lure.
  var body = { a: 0, flutter: 0, vx: 0, vy: 0, px: 0, py: 0, flow: 0, sink: 1, t: 0, on: false, kick: 0, frame: 0 };

  function bodyStep(run, dt, loc) {
    var c = run.cast, fsm = run.fsm, inAir = fsm === 'casting', x = inAir ? c.lx : c.x1, y = c.ly;
    var lureOut = inAir || fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest';
    if (!lureOut) { body.on = false; return; }
    if (!body.on) { body.on = true; body.px = x; body.py = y; body.vx = body.vy = 0; body.a = 0; }
    body.t += dt;
    body.vx += ((x - body.px) / dt - body.vx) * 0.25; body.vy += ((y - body.py) / dt - body.vy) * 0.25;
    body.px = x; body.py = y;
    body.flow = inAir ? 0 : (loc.drift ? loc.drift(c.seed, c.tw, c.ly - loc.waterY, false, wind(), c.x1) : 0);
    body.sink = loc.current && loc.current.reach ? G.data.reachK(loc, c.x1, 'sink', 1) : 1; // Phase 77
    var rx = body.vx - body.flow, ry = body.vy, target, home = run.boat.x - x;
    if (rx * rx + ry * ry > 4) target = Math.atan2(ry, rx);                         // moving: nose first
    else if (Math.abs(body.flow) > 0.05) target = Math.atan2(0.15, -Math.sign(body.flow)); // nose into the flow
    else target = Math.atan2(0.2, home >= 0 ? 1 : -1);                               // still: toward the line
    var d = target - body.a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    body.a += d * Math.min(1, 6 * dt);
    if (body.a > Math.PI) body.a -= 2 * Math.PI; else if (body.a < -Math.PI) body.a += 2 * Math.PI;
    var moving = Math.sqrt(rx * rx + ry * ry);
    body.flutter = Math.min(1, (fsm === 'sinking' ? 0.8 : 0.2) + moving / 25 + Math.abs(body.flow) * 0.2);
    body.kick = Math.max(0, body.kick - dt);
    if (body.kick <= 0 && (run.cast.bait || run.gearFx.bait) === 'cricket' && (G.gfx.sprites.hash(Math.floor(body.t * 3), 17) & 7) === 0) body.kick = 0.25; // the cricket's kick (Phase 43: only the cricket; the popper's comes from a pop)
  }

  // The baits' shapes, as a test of a pixel at (u, v) in the lure's own frame (u along the
  // nose, v across it), returning a palette key or ''. ph is the flutter phase (0 or 1).
  var BAITS = {
    worm: function (u, v, ph) {
      if (Math.abs(u) > 3.6 || Math.abs(v - 0.8 * Math.sin(u * 1.4 + ph * 3.14)) > 0.8) return '';
      return Math.abs(u - 1) < 0.5 ? 'flesh_dark' : 'flesh';
    },
    cricket: function (u, v, ph) {
      var e = (u / 2.6) * (u / 2.6) + (v / 1.2) * (v / 1.2);
      if (e < 1) return u > 1.4 ? 'ink' : (v < -0.3 ? 'wood_hi' : 'wood_dark');
      var leg = ph ? -2.6 : -1.6;                                     // kicked back, or tucked
      if (Math.abs(v) > 1 && Math.abs(v) < 2.4 && Math.abs(u - leg - (Math.abs(v) - 1) * (ph ? -0.8 : 0.4)) < 0.6) return 'wood_dark';
      if (u > 2.4 && u < 4 && Math.abs(v + (u - 2.4) * 0.6) < 0.45) return 'wood_dark';  // an antenna
      return '';
    },
    minnow: function (u, v, ph) {
      var e = (u / 3.4) * (u / 3.4) + (v / 1.5) * (v / 1.5);
      if (e < 1) {
        if (u > 1.9 && u < 2.8 && v > -0.7 && v < 0.2) return 'ink';
        if (ph && Math.abs(u) < 0.7 && Math.abs(v) < 0.6) return 'paper';  // the flash
        return v < 0 ? 'stone_hi' : 'bone';
      }
      if (u < -2.8 && u > -4.8 && Math.abs(v) < (-u - 2.6) * 0.9) return 'stone';      // the tail
      return '';
    },
    unlabelled: function (u, v, ph) {
      var e = (u / 2.3) * (u / 2.3) + (v / 1.6) * (v / 1.6);
      if (e >= 1) return '';
      if (u > 0.8 && u < 1.6 && v > -0.7 && v < 0.1) return ph ? 'neon_red' : 'ink'; // it looks back
      return (Math.round(u * 1.7) + Math.round(v * 2.3)) % 3 === 0 ? 'blood' : 'paper';
    }
  };
  var LURE_EDGE = { worm: 'flesh_dark', cricket: 'ink', minnow: 'stone_dark', unlabelled: 'paper_dark' };
  // Phase 69: the hooks by index (the four baits, then data/gear.js lures). Phase 73: a lure is
  // drawn by G.gfx.luregen from its look (data/lurelooks.js): its sprite in DIRS headings and
  // the frames of its action; the baits keep their shapes above.
  var LS = 12, DIRS = 16, BAIT_IDS = null, LURE_OF = {}, lureCv = [], LG = G.gfx.luregen;
  function hookIds() {
    if (BAIT_IDS) return BAIT_IDS;
    BAIT_IDS = ['worm', 'cricket', 'minnow', 'unlabelled'];
    var l = G.data.gear.lures;
    for (var i = 0; i < l.length; i++) { BAIT_IDS.push(l[i].id); LURE_OF[l[i].id] = l[i]; }
    return BAIT_IDS;
  }

  // What kind of hook id is, for the splash it makes: a bait's own id, a lure's type.
  function hookKind(id) { hookIds(); return LURE_OF[id] ? LURE_OF[id].type : id; }

  // A hook's image facing heading slot k (of DIRS) in frame ph: a bait's LS view px square,
  // a lure's sprite (its own box), baked once.
  function lureImg(bait, k, ph) {
    var ids = hookIds();
    if (LURE_OF[bait]) return LG.spriteImg(bait, k, ph);
    var bi = Math.max(0, ids.indexOf(bait)), key = (bi * DIRS + k) * 2 + (ph & 1);
    if (lureCv[key]) return lureCv[key];
    bait = ids[bi];
    var shape = BAITS[bait] || BAITS.worm, edge = LURE_EDGE[bait] || 'ink', a = k / DIRS * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    var grid = [], i, j;
    for (j = 0; j < LS; j++) for (i = 0; i < LS; i++) {
      var dx = i + 0.5 - LS / 2, dy = j + 0.5 - LS / 2;
      grid.push(shape(dx * ca + dy * sa, (-dx * sa + dy * ca) * (ca < -0.01 ? -1 : 1), ph & 1)); // facing left it is mirrored, not upside down
    }
    return (lureCv[key] = B.layer(LS, LS, function (ctx) {
      for (j = 0; j < LS; j++) for (i = 0; i < LS; i++) {
        var kk = grid[j * LS + i];
        if (!kk) continue;
        // Shaded from above: only the lower edge takes the bait's dark key.
        var low = j === LS - 1 || !grid[(j + 1) * LS + i];
        ctx.fillStyle = P[low && kk !== 'paper' && kk !== 'neon_red' && kk !== 'ink' ? edge : kk];
        ctx.fillRect(i, j, 1, 1);
      }
    }));
  }

  // Phase 73: the frame of a lure's sprite for its action now (t: its clock, fl: flutter 0..1,
  // g: the glide's swing -1..1); body.frame for dbg.lureBody().
  function lureFrame(act, t, fl, g) {
    switch (act) {
      case 'mid': return Math.floor(t * (3 + 14 * fl)) & 3;                          // the blades turn faster as it moves
      case 'kick': return Math.floor(t * (4 + 16 * fl) / (Math.PI / 2)) & 3;         // the paddle tail beats with speed
      case 'glide': return g > 0.4 ? 1 : (g < -0.4 ? 3 : (Math.floor(t * 2) & 1) * 2);  // the back half swings out, each way
      case 'wacky': return Math.floor(t * (3 + 5 * fl)) & 3;                          // both ends shimmy
      case 'dropshot': return Math.floor(t * 6) & 3;                                  // the worm's tail quivers
      case 'lift': return Math.floor(t * (2 + 8 * fl)) & 3;                           // the grub's tail curls, the craw's claws flap
      case 'dive': return Math.sin(t * 16) > 0.5 ? 1 : 0;                             // the flank's flash as it wobbles
      case 'flutter': return Math.sin(t * (8 + 10 * fl)) > 0.3 ? 1 : 0;               // the spoon's flash
      case 'rattle': return Math.floor(t * 18) & 1;                                   // the blade shivers
      case 'top': return body.kick > 0 ? 1 : 0;                                       // the popper spits
      case 'float': return Math.floor(t * 0.7) & 1;                                   // its glint moves as it rides
    }
    return 0;
  }

  // Draws the lure centred at screen (x, y) with its bait's body, heading and flutter.
  // Phase 69: a lure moves by its action (and vary); Phase 73: drawn in its own art and frames.
  function drawLure(ctx, bait, x, y) {
    var a = body.a, fl = body.flutter, t = body.t, ph = 0, gs = 0;
    hookIds();
    var L = LURE_OF[bait], act = L ? (L.vary || L.swim) : '';
    var lvl = Math.abs(body.a) > Math.PI / 2 ? Math.PI : 0;                                          // level, facing the way it goes
    if (act === 'dropshot') {                                                                         // the weight on the bed, the hook twitching over it
      var dp = L.dropM * 4, wx = Math.round(x * HI) / HI, wy0 = Math.round((y + dp) * HI) / HI, ws = L.sizes[0] === 'XL' ? 2 : 1.5;
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.35; ctx.fillRect(wx, Math.round(y * HI) / HI, 1 / HI, dp); ctx.globalAlpha = 1;
      ctx.fillStyle = P.stone_dark; ctx.fillRect(wx - 0.5, wy0 - 0.5, ws, ws); ctx.fillStyle = P.stone_hi; ctx.fillRect(wx - 0.5, wy0 - 0.5, 0.5, 0.5);
      a = lvl + Math.sin(t * 9) * 0.3 * (1 - fl * 0.5);
    }
    else if (act === 'wacky') a = lvl + Math.sin(t * 3) * 0.08;                                       // level, both ends shimmying
    else if (act === 'glide') { gs = Math.sin(t * 2.6); a += gs * 0.55 * fl; }                         // the wide swing of a glide
    else if (act === 'rattle') a += (Math.floor(t * 30) & 1 ? 0.14 : -0.14) * fl;                     // the blade shivers
    else if (act === 'kick') a += Math.sin(t * (4 + 16 * fl)) * 0.14 * fl;                            // the body rocks with the tail
    else if (act === 'dive') a += Math.sin(t * 16) * 0.22 * fl;                                       // a tight wobble
    else if (act === 'top') a = body.a > Math.PI / 2 || body.a < -Math.PI / 2 ? Math.PI : 0;          // it lies level on the surface
    else if (act === 'flutter') a += Math.sin(t * (8 + 10 * fl)) * 0.45 * fl;                         // Phase 65: the wobble
    else if (act === 'float') a = -Math.PI / 2 + Math.sin(t * 2.2) * 0.12;                            // the float stands up
    else if (bait === 'minnow') { a += Math.sin(t * 12) * 0.3 * fl; ph = Math.sin(t * 5) > 0.85 ? 1 : 0; }
    else if (bait === 'cricket') ph = body.kick > 0 ? 1 : 0;
    else if (!L) ph = Math.floor(t * (2 + 4 * fl)) & 1;
    if (L) ph = body.frame = lureFrame(act, t, fl, gs);
    var k = ((Math.round(a / (2 * Math.PI) * DIRS) % DIRS) + DIRS) % DIRS, img = lureImg(bait, k, ph), w = img.width / HI, h = img.height / HI;
    ctx.drawImage(img, Math.round(x * HI) / HI - w / 2, Math.round(y * HI) / HI - h / 2, w, h);
  }

  // Phase 65: the float rig in the water: the float on the surface at (fx, fy) (screen px),
  // riding the swell, bobbing on a nibble (nib) and pulled under on a bite (dip 0..1); the
  // leader down to the hook at (hx, hy), where the worm hangs. The float tilts as it is drawn in.
  // Phase 73: the float in its own art (the Bobber's ball, the Deep Bobber's slip float), its
  // lower end on the water line.
  function drawFloat(ctx, fx0, fy0, hx, hy, nib, dip, t, rig) {
    var fy = fy0 + dip * 5 + (nib ? Math.round(Math.sin(t * 30)) : 0), tilt = clamp((hx - fx0) * 0.04, -0.5, 0.5);
    ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.35;
    var n = Math.max(1, Math.round(Math.abs(hy - fy) / 2));
    for (var i = 1; i < n; i += 2) ctx.fillRect(Math.round((fx0 + (hx - fx0) * i / n) * HI) / HI, Math.round((fy + (hy - fy) * i / n) * HI) / HI, 1 / HI, 1);
    ctx.globalAlpha = 1;
    drawLure(ctx, 'worm', hx, hy);
    rig = rig || 'bobber';
    var k = ((Math.round((-Math.PI / 2 + tilt + Math.sin(t * 2.2) * 0.1) / (2 * Math.PI) * DIRS) % DIRS) + DIRS) % DIRS, img = lureImg(rig, k, Math.floor(t * 0.7) & 1);
    body.frame = Math.floor(t * 0.7) & 1;
    var w = img.width / HI, h = img.height / HI, rise = LG.box(rig).S / (4 * HI);                     // a third of it under the water line
    ctx.drawImage(img, Math.round(fx0 * HI) / HI - w / 2, Math.round((fy - rise) * HI) / HI - h / 2, w, h);
    if (dip > 0.6) { ctx.fillStyle = P.water_foam; ctx.globalAlpha = 0.6; ctx.fillRect(Math.round(fx0) - 2, Math.round(fy0) , 5, 1); ctx.globalAlpha = 1; }
  }

  // Phase 32: whether the line is being reeled in the fight this step (the reel's handle turns).
  function fightReel() { return fightIn.reel; }

  function run0() { return G.state.run; }
  // dbg.lureBody(): the name of the reach at world x in this water (Phase 77).
  function reachName(x) {
    var R = G.data.locations[G.state.run.loc].reaches || [];
    for (var i = 0; i < R.length; i++) if (x < R[i].x[1]) return R[i].name;
    return R.length ? R[R.length - 1].name : '';
  }

  return {
    fightReel: fightReel,
    flow: flow, weedFrame: weedFrame, bodyStep: bodyStep, swimStep: swimStep, SW: SW, SB: SB, startle: startle,
    shoals: function () { // dbg.shoals: the far fish (far-layer x, y, velocity, shoal, scare left, facing)
      var out = [];
      for (var i = 0; i < BN; i++) if (bon[i]) out.push({ i: i, shoal: (i / SHMAX) | 0, x: +bx[i].toFixed(2), y: +by[i].toFixed(2), vx: +bvx[i].toFixed(2), vy: +bvy[i].toFixed(2), scared: +Math.max(0, bsc[i]).toFixed(2), face: bface[i], L: +shL[(i / SHMAX) | 0].toFixed(2), H: +shH[(i / SHMAX) | 0].toFixed(2) });
      return out;
    },
    fishBody: function (i) { // dbg.fishBody: slot 0..7, or 'hook'
      var bd = bodies[i === 'hook' ? HOOKB : i];
      if (!bd || bd.uid < 0) return null;
      var a = bodyArt(bd, 0);
  return { uid: bd.uid, face: a.face, turn: bd.turnT > 0 ? +(1 - bd.turnT / bd.turnLen).toFixed(2) : 0, beatHz: +bd.hz.toFixed(2), phase: +bd.phase.toFixed(2),
        glide: bd.glide, pitch: +bd.pitch.toFixed(3), pitchRaw: bd.pitch + bd.jerk, frame: a.fr, mode: ['swim', 'shake', 'roll'][bd.mode], speed: +bd.spd.toFixed(2), vy: +bd.vy.toFixed(2), len: +bd.len.toFixed(1) };
    }, drawLure: drawLure, drawFloat: drawFloat, lureImg: lureImg, lureFrame: lureFrame, hookIds: hookIds, hookKind: hookKind, BAITS: BAITS, DIRS: DIRS,
    body: function () { var c = G.state.run.cast; return { angle: Math.round(body.a * 180 / Math.PI), flutter: +body.flutter.toFixed(2), vx: +body.vx.toFixed(2), vy: +body.vy.toFixed(2), flow: +body.flow.toFixed(3), sink: +body.sink.toFixed(2), reach: reachName(c.x1), // Phase 77
      work: +(c.work === undefined ? 1 : c.work).toFixed(2), style: (run0().gearFx.lure && c.bait === run0().gearFx.bait && STYLE[run0().gearFx.swim]) || 'bait', // the user's fixes
      retrieve: +(c.rv || 0).toFixed(2), swing: !!c.swing, action: (hookIds(), LURE_OF[c.bait || G.state.run.gearFx.bait] ? (LURE_OF[c.bait || G.state.run.gearFx.bait].vary || LURE_OF[c.bait || G.state.run.gearFx.bait].swim) : 'bait'), frame: LURE_OF[c.bait || G.state.run.gearFx.bait] ? body.frame : -1, frames: LURE_OF[c.bait || G.state.run.gearFx.bait] ? LG.frames(c.bait || G.state.run.gearFx.bait) : 0, depthM: +((c.ly - G.data.locations[G.state.run.loc].waterY) * 0.25).toFixed(2) }; },
    UW: UW, UNDER: UNDER, stats: stats, prepare: prepare, galleryBed: galleryBed, bottomAt: bottomAt, deepestX: deepestX,
    lureStep: lureStep, viewStep: viewStep, draw: draw, setLure: setLure,
    createCatch: createCatch, catchStep: catchStep, resetHeavy: resetHeavy, drawHooked: drawHooked, mouth: mouth
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

if (G.core.debug) G.core.debug.addLine(function () {
  var F = G.state.run.fight;
  if (!F || !F.active) return 'fight -';
  return 'fight ' + F.mode + '  T ' + F.T.toFixed(2) + '  D ' + F.D.toFixed(2) + '  S ' + F.S.toFixed(2) + '  H ' + F.H.toFixed(2) +
    (F.shake > 0 ? '  SHAKE' : '') + (F.jump > 0 ? '  JUMP' : '') + '  slips ' + F.slips; // Phase 23
});
if (G.core.debug) G.core.debug.addLine(function () {
  var school = G.state.run.school, s = '', n = 0;
  if (!school) return 'fish: -';
  for (var i = 0; i < school.fish.length; i++) {
    var f = school.fish[i];
    if (!f.active) continue;
    n++;
    s += '  ' + G.data.fish[f.sp].id + ' ' + f.state + (f.state === 'inspect' ? '(' + f.circles + ')' : '') +
      (f.state === 'nibble' ? '(' + f.nibbles + '/' + f.nibbleN + ')' : '') + ' ' + (f.y * 0.25).toFixed(1) + 'm ' +
      f.spd.toFixed(1) + (f.gl ? 'g' : '') + (f.face > 0 ? '>' : '<'); // Phase 28: speed, gliding, facing
  }
  return 'fish ' + n + '/' + G.sim.fish_ai.MAX + s;
});
