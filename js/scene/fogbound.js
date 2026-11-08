var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fogbound Lake's look (the user's reference, 2026-11-06): the hour between. A scenery module
// (js/scene/scenery.js's contract) for what the shared painters cannot do:
//   fbhills  rounded massifs under a pelt of small conifers, lit on the slopes toward the low
//            sun (the right), going to haze at their foot; features: a lattice radio mast on its
//            knoll (its red light is live: afterLayer)
//   falls    a rounded dome of violet rock with heather and a few trees on it, and a stream that
//            comes down it in steps to the water (the falling water is live: afterLayer)
//   fbcabin  a small cabin among the trees across the lake, its windows lit from dusk to morning
//   cloudMask  long thin bands of cloud, lit underneath (the reference's streaked sky)
// The live parts draw from the clock and the scene's time only, after the layer's grading (so the
// lights keep their warmth at night), and in the mirror too, since the mirror redraws the
// backdrop. Layer px are HI (2) per world px; afterLayer's c is in world px.
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var ROCK = ['rockv_dark', 'rockv', 'rockv_mid', 'rockv_lit'];
  var LARCH = { dark: 'larch_dark', mid: 'larch_mid', lit: 'larch_lit', trunk: 'pinev_dark' };
  var PINEV = { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' };
  // Where the live parts are, in layer px, written as the layers bake (a layer bakes once a
  // session and is cached; these stay with it).
  var live = { masts: [], drops: [], foot: [], windows: [] };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  // A fixed noise in 0..1 per layer pixel (no ordered dither: the reference has none).
  function n01(x, y) { return (S.hash(x * 7 + 3, y * 13 + 5) & 1023) / 1023; }

  // ---- fbhills ------------------------------------------------------------------------------
  // L: base (the foot's y), amp (the tallest dome), domes (how many), keys {mid, lit, dark, haze,
  // tree}, features [{kind: 'mast', x, h}]. Returns the kinds painted.
  function hills(ctx, L, w, wy, rng) {
    var K = L.keys, top = new Int16Array(w + 2), x, y, i, n = L.domes || 3, domes = [];
    for (i = 0; i < n; i++) domes.push({ c: (i + rng.range(0.1, 0.9)) * w / n, r: rng.range(0.55, 0.95) * w / n, h: L.amp * rng.range(0.55, 1) });
    if (L.big) domes.push({ c: L.big[0] * HI, r: L.big[1] * HI, h: L.amp * 1.15 });  // the one that fills the corner
    var tip = 0;
    for (x = 0; x <= w + 1; x++) {
      var H = 0;
      for (i = 0; i < domes.length; i++) { var u = (x - domes[i].c) / domes[i].r; if (u > -1 && u < 1) H = Math.max(H, domes[i].h * Math.pow(1 - u * u, 0.55)); }
      if (x % 3 === 0) tip = rng.int(0, 3);                                         // the trees' tips along the crest
      top[x] = Math.round(L.base - H - (x % 3 === 1 ? tip : tip >> 1));
    }
    // the haze at the foot: a soft, wandering edge (low-frequency wobble), then solid
    var hazeFrom = L.base - L.amp * 0.3, wob = 0;
    for (x = 0; x < w; x++) {
      var t0 = Math.max(0, top[x]), facing = top[x + 1] - top[Math.max(0, x - 1)];   // > 0: the slope falls to the right, toward the sun
      wob = clamp(wob + (n01(x, 1) - 0.5) * 1.6, -5, 5);
      var hz0 = Math.round(hazeFrom + (L.base - hazeFrom) * 0.35 + wob);
      for (y = t0; y < wy; y++) {
        var d = y - t0, key = K.mid;
        if (d < 2) key = facing > 0 ? K.lit : K.mid;
        else if (facing > 1 && d < 7 && n01(x, y) < 0.45) key = K.lit;
        if (y >= hz0 || (y >= hz0 - 3 && n01(x, y) < (y - hz0 + 4) / 5)) key = K.haze;
        A.px(ctx, key, x, y);
      }
    }
    // the pelt: small conifers all over the slopes, denser and darker near the crest
    var count = Math.round(w * (L.trees || 1.4));
    for (i = 0; i < count; i++) {
      x = rng.int(0, w - 1);
      var ty = top[x] + rng.int(3, Math.max(4, Math.round((hazeFrom - top[x]) * 0.9)));
      if (ty >= hazeFrom || ty <= top[x] + 2) continue;
      var th = rng.int(3, 6), k = rng.next() < 0.75 ? K.tree : K.dark;
      for (var r = 0; r < th; r++) { var hw = r >> 1; A.box(ctx, k, x - hw, ty - th + r, hw * 2 + 1, 1); }
      if (rng.next() < 0.3) A.px(ctx, K.lit, x - 1, ty - 1);
    }
    var f = L.features || [];
    for (i = 0; i < f.length; i++) if (f[i].kind === 'mast') mast(ctx, f[i].x, top[clamp(f[i].x, 0, w)], (f[i].h || 34) * HI, L.featureKey || 'ink', L.id);
    return ['hills'].concat(f.length ? ['mast'] : []);
  }

  // A lattice radio mast: two legs closing from a broad foot to a narrow head, braced in X every
  // few px, a short aerial; its red light is recorded for afterLayer.
  function mast(ctx, x, foot, h, key, layerId) {
    var y, w0 = Math.max(2, Math.round(h * 0.11));
    for (y = 0; y < h; y++) {
      var half = Math.max(1, Math.round(w0 * (1 - y / h)));
      A.px(ctx, key, x - half, foot - y); A.px(ctx, key, x + half, foot - y);
      if (y % 8 === 0) A.box(ctx, key, x - half, foot - y, half * 2 + 1, 1);
      if (y % 8 < 8) { var q = (y % 8) / 8, h2 = Math.max(1, Math.round(w0 * (1 - (y - (y % 8)) / h))); A.px(ctx, key, Math.round(x - h2 + q * h2 * 2), foot - y); }
    }
    A.box(ctx, key, x, foot - h - 8, 1, 8);                                            // the aerial
    A.box(ctx, key, x - 2, foot - Math.round(h * 0.55), 5, 2);                         // a dish platform
    live.masts.push({ layer: layerId, x: x, y: foot - h - 9 });
  }

  // ---- falls --------------------------------------------------------------------------------
  // L: features [{x, w, h, steps}] in layer px (scaled): a rock dome x..x+w standing h above the
  // waterline, the stream coming down it in `steps` drops from its upper left to the water.
  function falls(ctx, L, w, wy, rng) {
    var f = L.features || [], i;
    for (i = 0; i < f.length; i++) rockFall(ctx, f[i], wy, rng, L.id);
    return ['rock', 'falls'];
  }
  function rockFall(ctx, F, wy, rng, layerId) {
    var x0 = F.x, W = (F.w || 120) * HI, H = (F.h || 40) * HI, i, x, y;
    // the dome, in overlapping lobes, banded toward the light from the upper left
    // one mass: each pixel takes its light from the lobe it is deepest in, and only the mass's
    // own edge is outlined (no seams between the lobes)
    var lobes = [[0.34, 0.5, 1], [0.66, 0.4, 0.74], [0.12, 0.26, 0.5], [0.88, 0.2, 0.4]];
    function lobeAt(x, y, out) {
      var best = 9, li = -1;
      for (var q = 0; q < lobes.length; q++) {
        var u = (x - (x0 + lobes[q][0] * W)) / (lobes[q][1] * W), v = (wy - y) / (lobes[q][2] * H), e = u * u + v * v;
        if (v >= 0 && e <= 1 && e < best) { best = e; li = q; out[0] = u; out[1] = v; }
      }
      out[2] = best; return li;
    }
    var UV = [0, 0, 0], N = [0, 0, 0];
    for (y = Math.round(wy - H); y < wy; y++) for (x = x0 - Math.round(W * 0.1); x <= x0 + Math.round(W * 1.1); x++) {
      if (lobeAt(x, y, UV) < 0) continue;
      var edge = lobeAt(x - 1, y, N) < 0 || lobeAt(x + 1, y, N) < 0 || lobeAt(x, y - 1, N) < 0;
      var l = -UV[0] * 0.5 + UV[1] * 0.75 - UV[2] * 0.3;
      var key = edge ? ROCK[0] : (l > 0.5 ? ROCK[3] : (l > 0.18 ? ROCK[2] : (l > -0.15 ? ROCK[1] : ROCK[0])));
      if (!edge && n01(x, y) < 0.09 && key !== ROCK[0]) key = ROCK[Math.max(0, ROCK.indexOf(key) - 1)]; // a little grain
      A.px(ctx, key, x, y);
    }
    // the creases between the boulders: a dark seam where one lobe gives way to the next, short
    // of the top (a lumpy mass, not one ball); and lit rims along the tops of the lower lobes
    for (y = Math.round(wy - H); y < wy; y++) for (x = x0; x <= x0 + W; x++) {
      var a0 = lobeAt(x, y, UV), a1 = lobeAt(x + 1, y, N);
      if (a0 >= 0 && a1 >= 0 && a0 !== a1 && n01(x, y) < 0.8) A.px(ctx, ROCK[0], x, y);
      var up = lobeAt(x, y - 1, N);
      if (a0 >= 0 && up >= 0 && up !== a0 && lobes[a0][2] < lobes[up][2]) A.px(ctx, ROCK[3], x, y);
    }
    // heather and the little trees on top
    for (i = 0; i < W / 2; i++) {                                                    // heather and moss in tufts along the top
      x = x0 + rng.int(4, W - 4);
      var ty = topAt(lobes, x0, W, H, wy, x), tk = rng.next();
      if (ty >= wy - 4) continue;
      var tufK = tk < 0.4 ? 'larch_mid' : (tk < 0.7 ? 'moss' : 'larch_dark');
      A.box(ctx, tufK, x - 1, ty - 1, 3, 2); A.px(ctx, tk < 0.4 ? 'larch_lit' : 'moss_hi', x, ty - 2);
    }
    var tn = Math.max(2, Math.round(W / 70));
    for (i = 0; i < tn; i++) {
      x = x0 + rng.int(Math.round(W * 0.15), Math.round(W * 0.95));
      var gy = topAt(lobes, x0, W, H, wy, x) + 2;
      if (gy >= wy - 6) continue;
      (rng.next() < 0.5 ? A.TREES.larch : A.TREES.spruce)(ctx, x, gy, rng.int(18, 34), rng.next() < 0.5 ? LARCH : PINEV, rng);
    }
    // the stream: from the dome's upper left, down in steps, each drop then a short ledge
    // each drop a ribbon that bows out over its ledge and widens as it falls, its edges darker
    var steps = F.steps || 4, sx = x0 + Math.round(W * 0.22), sy = topAt(lobes, x0, W, H, wy, sx) + 3, fw = 7;
    for (i = 0; i < steps; i++) {
      var dh = Math.round((wy - 2 - sy) / (steps - i) * rng.range(0.85, 1.1)), ex = sx + rng.int(8, 16);
      if (i === steps - 1) dh = wy - 1 - sy;
      for (y = 0; y < dh; y++) {
        var u2 = y / Math.max(1, dh), bow = Math.round(Math.sin(u2 * Math.PI * 0.5) * 3), ww = fw + Math.round(u2 * 3);
        for (x = 0; x < ww; x++) {
          var k2 = x === 0 || x === ww - 1 ? 'water_fall_mid' : (((x * 3 + y + (y >> 2)) % 5) ? 'water_fall_hi' : 'water_fall_mid');
          A.px(ctx, k2, sx + bow + x, sy + y);
        }
      }
      live.drops.push({ layer: layerId, x: sx + 2, y: sy, w: fw + 2, h: dh });
      sy += dh;
      if (i < steps - 1) {                                                           // the ledge: a pale pool, then over the next lip
        A.box(ctx, 'water_fall_mid', sx + 1, sy - 2, ex - sx + fw + 3, 2); A.box(ctx, 'water_fall_hi', sx + 3, sy - 2, ex - sx + fw - 1, 1);
        A.box(ctx, 'rockv_dark', sx, sy, ex - sx + fw + 5, 1);
        sx = ex; sy -= 1;
      }
    }
    live.foot.push({ layer: layerId, x: sx + (fw >> 1), y: wy - 1 });
  }
  // The dome's top at layer x (the highest lobe there).
  function topAt(lobes, x0, W, H, wy, x) {
    var best = wy;
    for (var i = 0; i < lobes.length; i++) {
      var cx = x0 + lobes[i][0] * W, rx = lobes[i][1] * W, ry = lobes[i][2] * H, u = (x - cx) / rx;
      if (u > -1 && u < 1) best = Math.min(best, Math.round(wy - ry * Math.sqrt(1 - u * u)));
    }
    return best;
  }

  // ---- fbcabin ------------------------------------------------------------------------------
  // L: features [{x}] (layer px, scaled), base (its ground y): a log cabin on a stone footing,
  // painted in the view's own pixels: log courses with a lit top and dark chinking, the log
  // ends at both corners, a shingled roof with a lit fascia and a ridge cap, a fieldstone
  // chimney with its cap, two framed windows with sills and crossbars (the panes lit live), a
  // plank door on a stone step, a woodpile under the eave, among the trees. The low sun is on
  // the right, so the right-hand edges take the light. Its trees draw from rng as before; the
  // detail draws from a hash, so nothing else moves.
  var CABIN = { w: 40, h: 21, foot: 3, roof: 14, eave: 4 };
  function cabin(ctx, L, w, wy, rng) {
    var f = L.features || [], i;
    for (i = 0; i < f.length; i++) {
      var x = f[i].x, gy = L.base, k;
      logCabin(ctx, L, x, gy);
      for (k = 0; k < 3; k++) A.TREES.spruce(ctx, x - 10 - k * 9, gy + 1, rng.int(26, 40), PINEV, rng);
      A.TREES.larch(ctx, x + CABIN.w + 10, gy + 1, rng.int(28, 38), LARCH, rng);
    }
    return ['cabin'];
  }
  function logCabin(ctx, L, x, gy) {
    var cw = CABIN.w, wall = gy - CABIN.foot, top = wall - CABIN.h, xx, y, k, hs;
    // the stone footing
    A.box(ctx, 'stone_dark', x - 1, wall, cw + 2, CABIN.foot);
    for (xx = x - 1; xx < x + cw + 1; xx += 4) {
      var sw = 3 + (S.hash(xx, 41) & 1);
      A.box(ctx, (S.hash(xx, 42) & 3) ? 'stone' : 'stone_hi', xx, wall, sw - 1, CABIN.foot - 1);
      A.px(ctx, 'stone_lit', xx + sw - 2, wall);
    }
    // the log courses: a lit top, the log, its shadowed belly, the chinking
    for (y = top; y < wall; y++) {
      var r = (y - top) % 3;
      A.box(ctx, r === 0 ? 'wood_mid' : (r === 1 ? 'wood' : 'wood_dark'), x, y, cw, 1);
      if (r === 0) for (xx = x; xx < x + cw; xx++) { hs = S.hash(xx, y); if ((hs & 15) === 0) A.px(ctx, 'wood', xx, y); else if ((hs & 31) === 1) A.px(ctx, 'wood_hi', xx, y); }
      if (r === 1) for (xx = x; xx < x + cw; xx++) if ((S.hash(xx * 3, y) & 31) === 0) A.box(ctx, 'wood_dark', xx, y, 2, 1);   // knots and checks
      A.px(ctx, 'wood_hi', x + cw - 1, y);                                               // the lit corner
    }
    for (y = top; y < wall - 1; y += 3) {                                                // the log ends at the corners
      A.box(ctx, 'wood_mid', x - 2, y, 2, 2); A.px(ctx, 'wood_dark', x - 2, y + 1);
      A.box(ctx, 'wood_hi', x + cw, y, 2, 2); A.px(ctx, 'wood_lit', x + cw + 1, y); A.px(ctx, 'wood', x + cw, y + 1);
    }
    // the windows: frame, sill, crossbars over the dark panes (lit live)
    var wins = [x + 5, x + 27], wy0 = top + 5;
    for (k = 0; k < wins.length; k++) {
      var wx = wins[k];
      A.box(ctx, 'wood_deep', wx - 1, wy0 - 1, 9, 9);
      A.box(ctx, 'night_ink', wx, wy0, 7, 7);
      A.px(ctx, 'fog_dark', wx + 1, wy0 + 1); A.px(ctx, 'fog_dark', wx + 4, wy0 + 1);    // a glint on the glass
      A.box(ctx, 'wood_deep', wx + 3, wy0, 1, 7); A.box(ctx, 'wood_deep', wx, wy0 + 3, 7, 1);
      A.box(ctx, 'wood_hi', wx - 2, wy0 + 8, 11, 1); A.box(ctx, 'wood_dark', wx - 2, wy0 + 9, 11, 1);
      A.box(ctx, 'wood_mid', wx + 8, wy0 - 1, 1, 9);                                     // the frame's lit side
      live.windows.push({ layer: L.id, x: wx, y: wy0, w: 7, h: 7, bars: 1 });
    }
    // the door: planks, a brace, a latch, on its stone step
    var dx = x + 16, dh = 13;
    A.box(ctx, 'wood_deep', dx - 1, wall - dh - 1, 9, dh + 1);
    for (xx = 0; xx < 7; xx++) A.box(ctx, xx % 2 ? 'wood_dark' : 'wood', dx + xx, wall - dh, 1, dh);
    A.line(ctx, 'wood_mid', dx, wall - 2, dx + 6, wall - dh + 2);
    A.box(ctx, 'wood_mid', dx, wall - dh + 2, 7, 1); A.box(ctx, 'wood_mid', dx, wall - 3, 7, 1);
    A.px(ctx, 'stone_lit', dx + 5, wall - 7);
    A.box(ctx, 'stone', dx - 2, wall, 11, 2); A.box(ctx, 'stone_hi', dx - 2, wall, 11, 1);
    // the woodpile by the left corner, under the eave
    for (y = 0; y < 3; y++) for (xx = 0; xx < 4 - y; xx++) {
      var lx = x - 11 + xx * 3 + y, ly = wall - 2 - y * 3;
      A.box(ctx, 'wood_mid', lx, ly, 3, 3); A.px(ctx, 'wood_hi', lx + 2, ly); A.px(ctx, 'wood_dark', lx + 1, ly + 1); A.box(ctx, 'wood_deep', lx, ly + 2, 3, 1);
    }
    // the roof: rows of shingles, each row one in from the last, a lit fascia under the eave
    var e = CABIN.eave, rows = CABIN.roof;
    for (k = 0; k < rows; k++) {
      var ry = top - 1 - k, r0 = x - e + k, r1 = x + cw + e - k;
      if (r1 <= r0) break;
      var band = k % 3;
      A.box(ctx, band === 2 ? 'night_ink' : 'roof_slate', r0, ry, r1 - r0, 1);
      if (band === 0) for (xx = r0 + ((k / 3) & 1) * 2; xx < r1; xx += 4) A.px(ctx, 'night_ink', xx, ry);   // the tabs' seams, staggered
      if (band === 1) for (xx = r0; xx < r1; xx++) if ((S.hash(xx, ry) & 7) < 2) A.px(ctx, 'roof_slate_hi', xx, ry);
      A.px(ctx, 'roof_slate_hi', r1 - 1, ry); A.px(ctx, 'roof_slate_hi', r1 - 2, ry);    // the lit hip
    }
    A.box(ctx, 'hill_dark', x - e + rows - 1, top - rows, cw + 2 * e - 2 * rows + 2, 1);  // the ridge cap
    A.box(ctx, 'wood_mid', x - e, top, cw + 2 * e, 1); A.box(ctx, 'wood_deep', x - e, top + 1, cw + 2 * e, 1); // the fascia and its shadow
    for (xx = x - e + 2; xx < x + cw + e - 1; xx += 6) A.px(ctx, 'wood_hi', xx, top);    // the rafter ends
    // the chimney: fieldstones, mortar, a cap, standing through the roof on the right
    var cx = x + cw - 11, ct = top - rows - 4;
    for (y = ct; y < top - 3; y++) for (xx = 0; xx < 6; xx++) {
      var st = ((y - ct) >> 1) * 3 + ((xx + (((y - ct) >> 1) & 1) * 2) >> 2), sk = S.hash(st, cx) & 3;
      var mortar = (y - ct) % 2 === 1 && ((xx + (((y - ct) >> 1) & 1) * 2) & 3) === 3;
      A.px(ctx, mortar ? 'stone_dark' : (xx === 5 ? 'stone_lit' : (sk === 0 ? 'stone_hi' : 'stone')), cx + xx, y);
    }
    A.box(ctx, 'stone_hi', cx - 1, ct - 2, 8, 2); A.box(ctx, 'stone_lit', cx - 1, ct - 2, 8, 1); A.box(ctx, 'night_ink', cx + 1, ct - 3, 4, 1);
  }

  // ---- The clouds: long thin bands ---------------------------------------------------------
  function bands(w, h, rng, count, s) {
    var m = new Uint8Array(w * h), c, x, n = (count || 9) + 6;
    for (c = 0; c < n; c++) {
      var y0 = rng.int(Math.round(10 * s), Math.round(h * 0.6)), len = rng.int(50, 220) * s, cx = rng.int(0, w - 1), th = rng.range(1, 4.5) * s;
      for (var q = 0; q < len; q++) {
        var u = q / len, thick = Math.max(1, Math.round(th * Math.pow(Math.sin(u * Math.PI), 0.7) * (0.7 + 0.3 * Math.sin(q * 0.07 + c)) + (((q >> 4) * 7 + c) % 4 === 0 ? s : 0)));
        if (((q >> 2) * 13 + c * 5) % 23 === 0) continue;                              // a gap the sky shows through
        x = ((cx + q) % w + w) % w;
        for (var yy = 0; yy < thick + 1; yy++) {
          var Y = y0 - yy;
          if (Y < 0 || Y >= h) continue;
          var lvl = yy === 0 ? 3 : (yy >= thick ? 1 : 2);                             // lit underneath, shadowed on top
          if (lvl > m[Y * w + x]) m[Y * w + x] = lvl;
        }
      }
    }
    return m;
  }

  // ---- The live parts ------------------------------------------------------------------------
  // The night's share of the hour, as the sailing scene grades it (no allocation per frame).
  function smooth(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
  var LT = { night: 0 };
  function lightOf() { var h = G.sim.clock.wrap(G.state.save.clock || 0); LT.night = h < 12 ? 1 - smooth(4.5, 6.75, h) : smooth(18.5, 21, h); return LT; }
  function afterLayer(c, id, ox, oy, run) {
    var t = run.boat ? run.boat.t : 0, i, L = null;
    for (i = 0; i < live.masts.length; i++) {                                        // the mast's red light: a slow beat, brighter at night
      var m = live.masts[i];
      if (m.layer !== id) continue;
      L = L || lightOf();
      var on = 0.5 + 0.5 * Math.sin(t * 2.1), a = (0.45 + 0.55 * L.night) * (0.35 + 0.65 * on), X = m.x / HI - ox, Y = m.y / HI - oy;
      c.globalAlpha = a * 0.22; c.fillStyle = P.neon_red; c.fillRect(X - 2.5, Y - 2.5, 5.5, 5.5);
      c.globalAlpha = a * 0.45; c.fillRect(X - 1.5, Y - 1.5, 3.5, 3.5);
      c.globalAlpha = Math.min(1, a * 1.3); c.fillRect(X - 0.5, Y - 0.5, 1.5, 1.5);
      c.globalAlpha = 1;
    }
    for (i = 0; i < live.drops.length; i++) {                                        // the falling water: pale streaks running down each drop
      var d = live.drops[i];
      if (d.layer !== id) continue;
      L = L || lightOf();
      c.globalAlpha = 0.7 - 0.35 * L.night; c.fillStyle = P.water_fall_hi;
      for (var k = 0; k < d.w; k += 2) {
        var off = (t * 26 + k * 7) % 10;
        for (var yy = off; yy < d.h; yy += 10) c.fillRect((d.x + k) / HI - ox, (d.y + yy) / HI - oy, 0.5, Math.min(2, (d.h - yy) / HI));
      }
      c.globalAlpha = 1;
    }
    for (i = 0; i < live.foot.length; i++) {                                         // the spray where it meets the lake
      var fo = live.foot[i];
      if (fo.layer !== id) continue;
      c.fillStyle = P.water_fall_hi;
      for (k = 0; k < 6; k++) { var ph = (t * 3 + k * 1.7) % 1; c.globalAlpha = 0.5 * (1 - ph); c.fillRect(fo.x / HI - ox + (k - 3) * 1.2, fo.y / HI - oy - ph * 3, 0.5, 0.5); }
      c.globalAlpha = 0.18; c.fillStyle = P.fog_lav; c.fillRect(fo.x / HI - ox - 6, fo.y / HI - oy - 4, 12, 4);
      c.globalAlpha = 1;
    }
    for (i = 0; i < live.windows.length; i++) {                                      // the cabin's windows, lit from dusk to morning
      var wn = live.windows[i];
      if (wn.layer !== id) continue;
      var h = G.sim.clock.wrap(G.state.save.clock || 0), lit = h >= 17.25 || h < 7.25 ? 1 : 0;
      if (!lit) continue;
      window_(c, wn, ox, oy, 0.9 + 0.1 * Math.sin(t * 5.3 + i));
    }
  }

  // A lit window, in world px with half-pixel detail: a round warm glow on the wall, the pane in
  // amber going to lamplight at its top, a soft hot spot, and (wn.bars) its crossbars over it.
  function window_(c, wn, ox, oy, fl) {
    var X = wn.x / HI - ox, Y = wn.y / HI - oy, W = wn.w / HI, H = wn.h / HI;
    halo(c, X + W / 2, Y + H / 2, Math.max(W, H) * 0.5 + 3, 0.5 * fl, 'lamp_glow');
    c.globalAlpha = fl; c.fillStyle = P.signal_amber; c.fillRect(X, Y, W, H);
    c.fillStyle = P.lamp_glow; c.fillRect(X + 0.5, Y + 0.5, W - 1, H * 0.45);
    c.globalAlpha = 0.6 * fl; c.fillStyle = P.cream; c.fillRect(X + W / 2 - 0.5, Y + 0.5, 1, H * 0.3);
    c.globalAlpha = fl; c.fillStyle = P.dusk_amber; c.fillRect(X, Y + H - 0.5, W, 0.5);   // the lower sash in shadow
    if (wn.bars) { c.fillStyle = P.wood_deep; c.fillRect(X + W / 2 - 0.25, Y, 0.5, H); c.fillRect(X, Y + H / 2 - 0.25, W, 0.5); }
    c.globalAlpha = 1;
  }

  // A soft round glow of radius r (world px) at X, Y: three nested discs, each in half-pixel
  // rows, at a rising alpha toward the middle. a: the overall strength. No allocation.
  function halo(c, X, Y, r, a, key) {
    c.fillStyle = P[key];
    for (var ring = 0; ring < 3; ring++) {
      var rr = r * (1 - ring * 0.3), al = a * (ring === 0 ? 0.14 : (ring === 1 ? 0.18 : 0.3));
      if (rr < 0.5) break;
      c.globalAlpha = al;
      for (var dy = -rr; dy < rr; dy += 0.5) {
        var m = dy + 0.25, hw = Math.round(Math.sqrt(Math.max(0, rr * rr - m * m)) * 2) / 2;
        if (hw > 0) c.fillRect(Math.round((X - hw) * 2) / 2, Math.round((Y + dy) * 2) / 2, hw * 2, 0.5);
      }
    }
    c.globalAlpha = 1;
  }

  G.scene.scenery.fogbound = {
    paint: { fbhills: hills, falls: falls, fbcabin: cabin },
    cloudMask: bands,
    afterLayer: afterLayer,
    halo: halo, window_: window_,
    debugLine: function () { return 'fogbound  masts ' + live.masts.length + '  drops ' + live.drops.length + '  windows ' + live.windows.length; },
    live: live
  };
})();
