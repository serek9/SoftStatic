var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The seas' scenery (Phase 79, PLAN_WATERS.md 2 and 4.5): Coldharbor Sound and Wreckhollow Bay
// as scenery modules beside the rivers' and the lakes' (js/scene/rivers.js, lakes.js). Landmark
// painters bake once with the landmarks layer, in layer px (HI per world px); the live parts
// draw from the clock, the surface and hashes only: no state but a few debug counters, no
// allocation. What each water has comes from its data:
//   landmarks: headland (the cliff, its lighthouse and keeper's cottage; the lamp is lit and its
//     beam turns at night), skerries and haulout (rocks awash; `hs` each rock's height),
//     breakwater (a rubble mound with its harbour light), mooring (a boat riding the swell on
//     its mooring, drawn live), schooner (the wreck on its side, masts out over the water)
//   loc.sea: tide {amp, high} (the water up the rocks over the day), storm (how much a storm
//     lifts the swell), caps (whitecaps on the swell's crests), kelpTop (kelp lying on the water)
// The tide is presentation only: it raises the water where the sea meets the land (the rocks,
// the piers, the breakwater, the moored boats) by up to amp world px; the near waterline, where
// the boat floats and from which the simulation measures depth, stays at waterY.
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, B = G.gfx.bake, HI = 2;
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'], STONES = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var ROCK = ['ink', 'rock_dark', 'rock', 'rock_lit'], WHITE = ['stone', 'paper_dark', 'paper', 'cream'];
  var TIDE_PERIOD = 12.42, BEAM_PERIOD = 12, WET = 8; // h between high waters; s a turn of the lamp; layer px of the wet band
  var stats = { caps: 0, ms: 0 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function h01(a, b) { return (S.hash(a, b) & 1023) / 1023; }
  function clock() { return G.state.save.clock || 0; }
  function nightK() { return G.scene.sailing.light(clock()).night; }

  // ---- The tide and the lamp (shared by the painters, the live parts and dbg.sea) ----------
  // Height of the water over the low-water line, world px: a semi-diurnal tide.
  function tideH(loc, h) {
    var T = loc.sea && loc.sea.tide;
    if (!T) return 0;
    return T.amp * (0.5 + 0.5 * Math.cos(6.2832 * (h - T.high) / TIDE_PERIOD));
  }
  // The headland's height over the water at world x (world px), from its data and hashes only,
  // so the painter, the lighthouse's lamp and the debug agree.
  function headTop(lm, wx) {
    var x0 = lm.x - lm.half, x1 = lm.x + lm.half;
    if (wx < x0 || wx > x1) return 0;
    var t = (wx - x0) / (x1 - x0), e = clamp((1 - t) / 0.1, 0, 1);
    return lm.h * (0.84 + 0.12 * Math.sin(t * 3.1 + 0.4) + 0.04 * Math.sin(t * 17)) * Math.pow(e, 0.4);
  }
  // Where the lighthouse's lamp is: world x, px over the water (null if none).
  var LAMP = [0, 0];
  function lampOf(loc) {
    for (var i = 0; i < loc.landmarks.length; i++) {
      var lm = loc.landmarks[i];
      if (lm.kind === 'headland' && lm.light) { LAMP[0] = lm.light.x; LAMP[1] = headTop(lm, lm.light.x) + lm.light.tower + 2.5; return LAMP; }
    }
    return null;
  }
  // The beam: the lamp turns once every BEAM_PERIOD s; seen from the side its beam swings out
  // to one side, shortens as it turns toward us (a flash), and swings out the other way.
  var BEAM = { ang: 0, side: 0, len: 0, flash: 0 };
  function beamAt(t) {
    var a = (t / BEAM_PERIOD) % 1 * 6.2832, s = Math.sin(a), c = Math.cos(a);
    BEAM.ang = a; BEAM.side = s < 0 ? -1 : 1; BEAM.len = 150 * Math.pow(Math.abs(s), 0.7);
    BEAM.flash = c > 0.9 ? (c - 0.9) / 0.1 : 0;
    return BEAM;
  }

  // ---- Painters (layer px; x is the landmark's x × HI, wy the waterline) -----------------------

  // Smooth value noise 0..1 (as the rivers' bluff): hashes on an sx × sy grid, blended.
  function vnoise(x, y, sx, sy) {
    var gx = x / sx, gy = y / sy, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = A.hash2(ix, iy), b = A.hash2(ix + 1, iy), c = A.hash2(ix, iy + 1), d = A.hash2(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }

  // The wet band at a rock's foot, up to the high-water mark: black-wet rock, wrack and
  // barnacles, so the falling tide shows it.
  function wetBand(ctx, X, top, wy) {
    for (var y = Math.max(top, wy - WET); y < wy; y++) {
      var k = (S.hash(X, y) & 7) === 0 ? 'stone_hi' : ((S.hash(X >> 1, y >> 1) & 3) === 0 ? 'olive' : (y > wy - 4 ? 'olive_dark' : 'ink'));
      A.px(ctx, k, X, y);
    }
  }

  // Lamplight Head: a dark rock cliff from the world's west edge, sheer to the sea on its east
  // face, with bedding, fissures and ledges, a turf cap; the lighthouse and keeper's cottage on
  // top; fallen rocks at its foot.
  function headland(ctx, x, wy, rng, lm) {
    var X0 = Math.max(0, Math.round((lm.x - lm.half) * HI)), X1 = Math.round((lm.x + lm.half) * HI), X, y, i;
    var tops = new Int16Array(X1 - X0 + 1), hi = wy;
    for (X = X0; X <= X1; X++) { var tp = wy - Math.round(headTop(lm, X / HI) * HI) - (S.hash(X >> 1, 5) & 1); tops[X - X0] = tp; if (tp < hi) hi = tp; }
    var east = X1 - Math.round(lm.half * 2 * HI * 0.1);
    A.area(ctx, X0, hi, X1 - X0 + 1, wy - hi, function (X, y) {
      var top = tops[X - X0];
      if (y < top) return '';
      var d = y - top;
      if (d < 2) return (S.hash(X, 3) & 3) ? 'moss' : 'moss_hi';                                          // the turf
      if (d < 4) return (S.hash(X, 4) & 1) ? 'moss_dark' : 'rock_dark';
      var v = 0.6 * vnoise(X, y + X * 0.12, 30, 12) + 0.4 * vnoise(X, y, 9, 5);
      var bed = (y + Math.sin(X * 0.021) * 5 + Math.sin(X * 0.083) * 1.5) / 10, b = Math.floor(bed), f = bed - b;
      if (f < 0.1 && A.hash2(X >> 4, b) > 0.45) return 'ink';                                             // bedding, broken
      if (f < 0.2 && A.hash2(X >> 4, b) > 0.45) return X > east ? 'rock' : 'rock_lit';                    // its lip
      if (A.hash2(X >> 1, 11) > 0.95 && d > 8 && A.hash2(X >> 1, y >> 4) > 0.3) return 'ink';             // a water stain
      var q = v * 4 - (X > east ? 1.2 : 0.5), n = Math.floor(q);                                         // four tones, dithered; the face in shadow
      if (A.dither(X, y, q - n)) n++;
      return ROCK[clamp(n, 0, 3)];
    });
    for (i = 0; i < 16; i++) { var fx0 = rng.int(X0 + 10, X1 - 10), ft = tops[fx0 - X0] + 6; A.line(ctx, 'ink', fx0, ft, fx0 + rng.int(-4, 4), Math.min(wy, ft + rng.int(16, 70))); } // fissures
    for (i = 0; i < 14; i++) { var lx = rng.int(X0 + 10, X1 - 30), ly = Math.round(wy - (wy - tops[lx - X0]) * rng.range(0.25, 0.8)); A.box(ctx, 'ink', lx, ly, rng.int(6, 18), 1); A.box(ctx, 'rock_lit', lx, ly - 1, rng.int(4, 12), 1); } // ledges
    for (X = X0; X <= X1; X++) wetBand(ctx, X, tops[X - X0], wy);
    for (i = 0; i < 40; i++) { X = rng.int(X0, X1); var ty = tops[X - X0]; A.line(ctx, i & 1 ? 'moss_hi' : 'reed', X, ty, X + rng.int(-1, 1), ty - rng.int(1, 4)); } // grass
    for (i = 0; i < 5; i++) { var bx = X1 + rng.int(-6, 30), r = rng.int(5, 11); A.blob(ctx, bx, wy - r * 0.45, r, r * 0.7, ROCK, { rim: 0.3 }); for (X = bx - r; X <= bx + r; X++) wetBand(ctx, X, wy - WET, wy); }
    if (lm.light) lighthouse(ctx, Math.round(lm.light.x * HI), wy - Math.round(headTop(lm, lm.light.x) * HI), lm.light.tower * HI, rng);
    return [X0, X1 + 34];
  }

  // A white tower with two red bands, its door and windows, the gallery and rail, the lantern
  // room's glass and the red dome; the keeper's cottage beside it.
  function lighthouse(ctx, x, base, T, rng) {
    var y, i, top = base - T;
    for (y = top; y < base + 2; y++) {
      var f = (y - top) / T, hw = Math.round(5.5 + 2.5 * f), band = (f > 0.18 && f < 0.32) || (f > 0.56 && f < 0.7);
      for (var dx = -hw; dx <= hw; dx++) {
        var u = dx / hw, k = band ? (u < -0.5 ? 'crimson' : (u < 0.55 ? 'crimson' : 'blood')) : (u < -0.55 ? 'cream' : (u < 0.35 ? 'paper' : (u < 0.75 ? 'paper_dark' : 'stone')));
        if (band && u < -0.55) k = 'rug_hi';
        A.px(ctx, k, x + dx, y);
      }
    }
    A.box(ctx, 'ink', x - 2, base - 9, 4, 8); A.box(ctx, 'wood_dark', x - 1, base - 8, 2, 7);                  // the door
    A.box(ctx, 'ink', x, top + Math.round(T * 0.42), 2, 3); A.box(ctx, 'ink', x - 1, top + Math.round(T * 0.8) - 6, 2, 3);
    A.box(ctx, 'ink', x - 9, top - 1, 19, 2); A.box(ctx, 'stone_dark', x - 9, top - 2, 19, 1);                // the gallery
    for (i = -8; i <= 8; i += 4) A.box(ctx, 'ink', x + i, top - 6, 1, 5);
    A.box(ctx, 'ink', x - 9, top - 6, 19, 1);                                                                   // its rail
    A.box(ctx, 'ink', x - 5, top - 11, 11, 10); A.box(ctx, 'fog_dark', x - 4, top - 10, 9, 8);                  // the lantern room
    A.box(ctx, 'stone', x - 1, top - 10, 1, 8); A.box(ctx, 'stone', x + 2, top - 10, 1, 8); A.box(ctx, 'fog_mid', x - 4, top - 10, 2, 3);
    A.blob(ctx, x, top - 12, 6, 3, ['blood', 'crimson', 'rug_hi'], { rim: 0.2 });                              // the dome
    A.box(ctx, 'ink', x - 6, top - 12, 13, 1); A.box(ctx, 'ink', x, top - 17, 1, 3); A.px(ctx, 'stone_dark', x, top - 18);
    // the keeper's cottage, west of the tower
    var cx = x - 34, cw = 22, ch = 11, cy = base - ch;
    A.slab(ctx, cx, cy, cw, ch, WHITE);
    A.box(ctx, 'ink', cx + 4, cy + 3, 4, 4); A.box(ctx, 'ink', cx + 13, cy + 4, 3, 7);
    for (y = 0; y < 7; y++) A.box(ctx, y < 1 ? 'rust_hi' : (y & 1 ? 'rust' : 'rust_dark'), cx - 2 + y, cy - 7 + y, cw + 4 - y * 2, 1);
    A.box(ctx, 'brick', cx + 15, cy - 9, 3, 4); A.box(ctx, 'ink', cx + 15, cy - 10, 3, 1);
  }

  // One rock awash: a low hump (u from -1 to 1 across rw) to height h, lit on its west side, a
  // wet weedy band at its foot, cracks; guano on a tall one's top (the birds' rock).
  function rockAt(ctx, cx, wy, rw, h, rng, flat) {
    var X, y, top;
    for (X = Math.round(cx - rw); X <= Math.round(cx + rw); X++) {
      var u = (X - cx) / rw, s = 1 - (flat ? u * u * u * u : u * u);
      if (s <= 0) continue;
      top = wy - Math.round(h * Math.pow(s, flat ? 0.5 : 0.7)) - (S.hash(X >> 1, 9) & 1);
      for (y = top; y < wy; y++) {
        var d = y - top, k = d === 0 ? (u < 0.2 ? 'rock_lit' : 'rock') : (u < -0.35 ? 'rock' : (u > 0.45 ? 'ink' : 'rock_dark'));
        if (d > 0 && ((X * 3 + y * 5) % 23) === 0) k = 'ink';
        A.px(ctx, k, X, y);
      }
      if (h >= 10 && Math.abs(u) < 0.4 && (S.hash(X, 2) & 1)) { A.px(ctx, 'paper', X, top); if (S.hash(X, 4) & 1) A.px(ctx, 'paper_dark', X, top + 1 + (S.hash(X, 6) & 3)); }
      wetBand(ctx, X, top, wy);
    }
    for (var i = 0; i < 3; i++) { var wx = Math.round(cx + rng.range(-rw * 0.8, rw * 0.8)); A.line(ctx, 'olive', wx, wy - WET + 1, wx + rng.int(-2, 2), wy - 1); } // wrack hanging
  }
  function rocks(ctx, x, wy, rng, lm, flat) {
    var hs = lm.hs || [4], n = hs.length, half = (lm.half || 20) * HI, sp = 2 * half / n;
    for (var i = 0; i < n; i++) rockAt(ctx, x - half + (i + 0.5) * sp + rng.int(-2, 2), wy, sp * (flat ? 0.68 : 0.6), hs[i] * HI, rng, flat);
    return [x - half - 6, x + half + 6];
  }
  function skerries(ctx, x, wy, rng, lm) { return rocks(ctx, x, wy, rng, lm, false); }
  function haulout(ctx, x, wy, rng, lm) { return rocks(ctx, x, wy, rng, lm, true); }

  // The breakwater: a rubble mound of granite blocks with a concrete cap, sloping at both
  // ends, and its harbour light (a white post, a green lantern) at the seaward (west) end.
  function breakwater(ctx, x, wy, rng, lm) {
    var half = lm.half * HI, h = lm.h * HI, x0 = x - half, x1 = x + half, row, bx, y;
    function topAt(X) { var e = Math.min(X - x0, x1 - X); return wy - Math.round(h * clamp(e / 18, 0, 1)); }
    for (row = 0; row * 7 < h + 7; row++) {
      var yb = wy - row * 7;
      for (bx = x0 - 6 + (row & 1) * 7; bx < x1 + 6; bx += rng.int(11, 17)) {
        var bw = rng.int(9, 15), t = Math.max(topAt(bx), topAt(bx + bw));
        if (yb - 7 < t - 2) continue;
        A.slab(ctx, bx, yb - 7, bw - 1, 7, STONES);
        if (rng.next() < 0.3) A.px(ctx, 'ink', bx + rng.int(2, bw - 3), yb - rng.int(2, 5));
      }
    }
    for (bx = x0 + 18; bx < x1 - 18; bx++) { A.box(ctx, 'stone_hi', bx, wy - h - 3, 1, 1); A.box(ctx, 'stone', bx, wy - h - 2, 1, 2); A.px(ctx, 'stone_dark', bx, wy - h); } // the cap
    for (bx = x0 - 6; bx < x1 + 6; bx++) wetBand(ctx, bx, wy - WET, wy);
    var px = x0 + 8;                                                                       // the harbour light
    A.slab(ctx, px - 2, wy - h - 22, 5, 19, WHITE); A.box(ctx, 'teal', px - 2, wy - h - 16, 5, 3);
    A.box(ctx, 'ink', px - 3, wy - h - 28, 7, 6); A.box(ctx, 'teal_dark', px - 2, wy - h - 27, 5, 4); A.box(ctx, 'ink', px - 3, wy - h - 30, 7, 2);
    A.box(ctx, 'stone_dark', px - 7, wy - h - 4, 15, 1);
    return [x0 - 8, x1 + 8];
  }

  // A boat on a mooring is drawn live (it rides the swell and the tide): its painter only
  // reserves its place. Its art is baked once per landmark (layer px, waterline at MW_Y).
  function mooring(ctx, x) { return [x - 40, x + 40]; }
  var MW = 72, MH = 60, MW_Y = 54, boatCv = {}, boatGr = {};
  // The boat graded as the layers are (sailing's bakeLayer): for night and for the grey hours.
  function boatGraded(lm, tag) {
    var key = lm.id + tag;
    return boatGr[key] || (boatGr[key] = B.layer(MW, MH, function (ctx) {
      ctx.drawImage(boatArt(lm), 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = tag === 'night' ? 0.55 : 0.35; ctx.fillStyle = P[tag === 'night' ? 'night_deep' : 'fog_dark']; ctx.fillRect(0, 0, MW, MH);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }));
  }
  function boatArt(lm) {
    return boatCv[lm.id] || (boatCv[lm.id] = B.layer(MW, MH, function (ctx) {
      var rng = new G.core.rng.Rng(lm.seed || 1), k = lm.hull === 'rust' ? ['rust_dark', 'rust', 'rust_hi'] : ['teal_dark', 'teal', 'teal_hi'], i, y;
      A.reset();
      for (i = 0; i < 60; i++) {                                                          // the hull, bow to the right
        var X = 6 + i, sheer = MW_Y - 9 - Math.round(Math.max(0, i - 40) * 0.25), keel = MW_Y + 3 - Math.round(Math.max(0, i - 44) * 0.3) - (i < 3 ? 3 - i : 0);
        for (y = sheer; y <= keel; y++) A.px(ctx, y === sheer ? k[2] : (y > MW_Y ? 'blood' : (y === MW_Y - 1 ? 'paper' : (i > 52 ? k[0] : k[1]))), X, y);
      }
      A.box(ctx, 'ink', 6, MW_Y - 10, 56, 1); A.box(ctx, 'stone_hi', 8, MW_Y - 11, 50, 1);                       // the rail
      A.slab(ctx, 24, MW_Y - 22, 18, 12, WHITE);                                                                    // the wheelhouse
      A.box(ctx, 'ink', 27, MW_Y - 19, 4, 4); A.box(ctx, 'ink', 33, MW_Y - 19, 4, 4); A.box(ctx, 'ink', 39, MW_Y - 19, 2, 4);
      A.box(ctx, k[0], 23, MW_Y - 23, 20, 2);
      A.box(ctx, 'ink', 31, MW_Y - 46, 1, 24); A.box(ctx, 'ink', 26, MW_Y - 38, 11, 1);                              // the mast and its yard
      A.blob(ctx, 36, MW_Y - 26, 3, 2, ['stone', 'paper_dark', 'paper'], { rim: 0.2 });                              // the radar dome
      A.line(ctx, 'stone_dark', 31, MW_Y - 46, 6, MW_Y - 11); A.line(ctx, 'stone_dark', 31, MW_Y - 44, 60, MW_Y - 12); // stays
      A.box(ctx, 'wood_dark', 10, MW_Y - 14, 9, 4); A.box(ctx, 'wood', 10, MW_Y - 14, 9, 1);                          // a fish box on deck
      if (rng.next() < 0.5) A.box(ctx, 'orange', 50, MW_Y - 14, 3, 4);                                                // a buoy at the bow
      A.reset();
    }));
  }

  // The schooner on its side on the bank: the turn of her bilge out of the water, weathered
  // planking, copper at her waterline, ribs through a stove-in hole, her deck edge with its
  // broken stanchions, two masts slanting out over the water (one broken), rigging hanging.
  function schooner(ctx, x, wy, rng, lm) {
    var half = lm.half * HI, h = lm.h * HI, x0 = x - half, x1 = x + half, X, y, i;
    function topAt(X) { var t = (X - x0) / (x1 - x0), u = Math.abs(2 * t - 1); return wy - Math.round(h * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) + (t > 0.85 ? (t - 0.85) * 60 : 0)); }
    var holeA = x0 + Math.round((x1 - x0) * 0.56), holeB = x0 + Math.round((x1 - x0) * 0.72);
    for (X = x0; X <= x1; X++) {
      var top = topAt(X);
      for (y = top; y < wy; y++) {
        var d = y - top, strake = Math.floor((y - wy + 200 + Math.round((X - x) * 0.03)) / 5), k;
        if (d < 2) k = (S.hash(X >> 2, 1) & 3) === 0 ? 'stone_hi' : 'stone';                       // the bulwark, silvered
        else if (y > wy - 6) k = (S.hash(X >> 1, y) & 3) === 0 ? 'teal_lit' : 'teal';                 // copper gone green
        else if (((y - wy + 200 + Math.round((X - x) * 0.03)) % 5) === 0) k = 'wood_deep';            // the seams
        else k = ['stone_dark', 'wood_dark', 'wood', 'stone_dark'][S.hash(X >> 4, strake) & 3];
        if (X >= holeA && X <= holeB && d > 4 && y < wy - 7) k = ((X - holeA) % 7 < 2) ? 'wood_mid' : 'ink'; // ribs in the dark
        A.px(ctx, k, X, y);
      }
      if (X % 9 === 0 && X > x0 + 6 && X < x1 - 6 && (S.hash(X, 7) & 3)) A.box(ctx, 'stone', X, topAt(X) - 4, 1, 4); // stanchions
    }
    for (X = x0; X <= x1; X++) wetBand(ctx, X, topAt(X), wy);
    for (i = 0; i < (lm.masts || []).length; i++) {                                        // the masts, leaning west
      var m = lm.masts[i], mx = m[0] * HI, my = topAt(mx) + 1, L = m[1] * HI, ex = Math.round(mx - L * 0.77), ey = Math.round(my - L * 0.64);
      A.line(ctx, 'wood_deep', mx + 1, my + 1, ex + 1, ey + 1); A.line(ctx, 'wood_dark', mx, my, ex, ey); A.line(ctx, 'wood_mid', mx, my - 1, ex, ey - 1);
      A.line(ctx, 'stone_dark', ex, ey, ex - 12, wy - 2); A.line(ctx, 'stone_dark', Math.round((mx + ex) / 2), Math.round((my + ey) / 2), x0 - 10, wy - 1); // rigging hanging
      A.line(ctx, 'wood_dark', ex - 6, ey + 6, ex + 8, ey - 4);                            // a yard
    }
    A.line(ctx, 'wood_dark', x1 - 2, topAt(x1 - 2), x1 + 22, topAt(x1 - 2) - 16);           // the bowsprit
    return [x0 - 70, x1 + 26];
  }

  // ---- Live parts ------------------------------------------------------------------------------
  var surf = null;

  // The tide over the water's foot: from x0 to x1 (screen px), between the raised line and
  // the low-water line, at the water's colour, darker by night, with a lit edge.
  function tideStrip(c, x0, x1, wyS, th, n) {
    var y0 = Math.round((wyS - th) * HI) / HI, w = x1 - x0;
    if (w <= 0) return;
    c.fillStyle = P.water_mid; c.globalAlpha = 1; c.fillRect(x0, y0, w, wyS - y0 + 0.5);
    if (n > 0.02) { c.fillStyle = P.night_deep; c.globalAlpha = 0.55 * n; c.fillRect(x0, y0, w, wyS - y0 + 0.5); }
    c.fillStyle = P.water_hi; c.globalAlpha = 0.7 * (1 - 0.5 * n); c.fillRect(x0, y0, w, 0.5);
    c.globalAlpha = 1;
  }
  var TIDAL = { headland: 1, skerries: 1, haulout: 1, breakwater: 1, schooner: 1, pier: 1 };

  // Over the layers (drawn in the mirror pass too, so all of it reflects). Over the shore's
  // bank: the tide all along it (the ducks and the loon, drawn after, swim on it). Over the
  // landmarks: the tide up each rock, the pier and the wreck; the moored boats riding it; and
  // the lights: the lighthouse's lamp and its turning beam, the harbour light's green blink,
  // the boats' mast lights.
  function afterLayer(c, id, ox, oy, run, loc) {
    var L = null, i;
    for (i = 0; i < loc.layers.length; i++) if (loc.layers[i].id === id) L = loc.layers[i];
    if (!L || (L.kind !== 'landmarks' && L.kind !== 'bank')) return;
    surf = G.gfx.surface;
    var wyS = loc.waterY - oy, n = nightK(), th = tideH(loc, clock()), t = run.boat.t;
    if (L.kind === 'bank') { if (th > 0.05) tideStrip(c, 0, 320, wyS, th, n); return; }
    if (th > 0.05) for (i = 0; i < loc.landmarks.length; i++) {
      var tl = loc.landmarks[i], bd = TIDAL[tl.kind] ? G.scene.sailing.landmarkBounds(tl.id) : null;
      if (bd) tideStrip(c, Math.max(0, bd[0] - ox), Math.min(320, bd[1] - ox), wyS, th, n);
    }
    for (i = 0; i < loc.landmarks.length; i++) {                                           // the moored boats
      var lm = loc.landmarks[i];
      if (lm.kind !== 'mooring') continue;
      var bx = lm.x - ox;
      if (bx < -40 || bx > 360) continue;
      var bob = surf.at(lm.x) / HI, by = Math.round((wyS - th - bob + 0.5) * HI) / HI, cv = boatArt(lm);
      var bX = Math.round((bx - MW / (2 * HI)) * HI) / HI, lt = G.scene.sailing.light(clock());
      c.drawImage(cv, bX, by - MW_Y / HI, MW / HI, MH / HI);
      if (lt.night > 0.02) { c.globalAlpha = lt.night * 0.9; c.drawImage(boatGraded(lm, 'night'), bX, by - MW_Y / HI, MW / HI, MH / HI); }
      if (lt.grey > 0.02) { c.globalAlpha = lt.grey * 0.7; c.drawImage(boatGraded(lm, 'grey'), bX, by - MW_Y / HI, MW / HI, MH / HI); }
      c.globalAlpha = 1;
      c.fillStyle = P.orange; c.fillRect(Math.round((bx + 20) * HI) / HI, by - 1.5, 2, 1.5);                       // its mooring buoy
      if (n > 0.1) { c.globalAlpha = n; c.fillStyle = P.lamp_glow; c.fillRect(Math.round((bx - 2.5) * HI) / HI, by - 23.5, 0.5, 0.5); c.globalAlpha = 1; }
    }
    if (n < 0.08) return;
    var lp = lampOf(loc);
    if (lp) {                                                                              // the lighthouse
      var lx = lp[0] - ox, ly = wyS - lp[1], bm = beamAt(t);
      if (lx > -200 && lx < 520) {
        c.fillStyle = P.lamp_glow;
        var len = bm.len, dim = n * (1 - 0.6 * bm.flash);                     // the beam: a cone widening and fading out, a brighter core
        for (var s = 2; s < len; s += 1.5) {
          var f0 = s / len, hh = 1 + f0 * 8, sx = lx + bm.side * s;
          if (sx < -2 || sx > 322) continue;
          c.globalAlpha = dim * 0.16 * Math.pow(1 - f0, 1.3); c.fillRect(sx, Math.round((ly - hh / 2) * HI) / HI, 1.5, hh);
          c.globalAlpha = dim * 0.22 * Math.pow(1 - f0, 2); c.fillRect(sx, Math.round((ly - 0.5 - f0) * HI) / HI, 1.5, 1 + 2 * f0);
        }
        c.globalAlpha = n * (0.18 + 0.32 * bm.flash); c.fillRect(lx - 3 - 4 * bm.flash, ly - 2 - 2 * bm.flash, 6.5 + 8 * bm.flash, 4 + 4 * bm.flash);
        c.globalAlpha = n; c.fillRect(lx - 1.5, ly - 1, 3.5, 2);
      }
    }
    for (i = 0; i < loc.landmarks.length; i++) {                                           // the harbour light: green, two blinks in six seconds
      var bw = loc.landmarks[i];
      if (bw.kind !== 'breakwater') continue;
      var gx = bw.x - bw.half + 4 - ox, ph = t % 6;
      if (gx < -6 || gx > 326 || !(ph < 0.4 || (ph > 1 && ph < 1.4))) continue;
      c.fillStyle = P.neon_teal; c.globalAlpha = 0.25 * n; c.fillRect(gx - 2, wyS - bw.h - 15, 5, 4);
      c.globalAlpha = 0.9 * n; c.fillRect(gx - 0.5, wyS - bw.h - 13.5, 2, 1.5); c.globalAlpha = 1;
    }
    c.globalAlpha = 1;
  }

  // Whitecaps: foam on the swell's crests where a cap is breaking (a pattern that travels with
  // the longest wave, so a cap rides its crest), more in the grey hours' wind and many more in
  // a storm; the surge washing white round the rocks; kelp lying on the water.
  function capsK(loc) {
    var Sx = loc.sea || {}, grey = G.scene.sailing.light(clock()).grey;
    return clamp((Sx.caps || 0.2) * (1 + 0.8 * grey) + 0.75 * G.scene.sailing.stormK(), 0, 0.95);
  }
  function surface(c, run, loc) {
    var t0 = performance.now(), Sx = loc.sea || {}, t = run.boat.t, camPx = Math.round(run.cam.x * HI) / HI, wyS = loc.waterY - Math.round(run.cam.y * HI) / HI, x, i;
    var n = nightK(), k = 1 - 0.5 * n, amp = Math.max(0.3, G.gfx.surface.amp()), capK = capsK(loc), th = tideH(loc, clock());
    var v = loc.swell && loc.swell.waves ? loc.swell.waves[0][1] / HI : 7;
    surf = G.gfx.surface; stats.caps = 0;
    c.fillStyle = P.water_foam;
    for (x = Math.floor(camPx / 2) * 2 - 2; x < camPx + 324; x += 2) {
      var h0 = surf.at(x), hl = surf.at(x - 2), hr = surf.at(x + 2);
      if (!(h0 >= hl && h0 >= hr && h0 > 0.45 * amp)) continue;
      var cell = Math.floor((x - t * v) / 26), q = h01(cell, 77);
      if (q > capK) continue;
      var life = 0.5 + 0.5 * Math.sin(t * 0.9 + cell * 1.7), w = 1.5 + 3 * life * (1 - q / capK);
      if (life < 0.15) continue;
      var sx = x - camPx, sy = wyS - h0 / HI;
      c.globalAlpha = k * (0.55 + 0.4 * life);
      c.fillRect(Math.round((sx - w / 2) * HI) / HI, Math.round((sy - 0.5) * HI) / HI, w, 0.5);
      c.globalAlpha = k * 0.35 * life;
      c.fillRect(Math.round((sx - w / 2 - v / Math.abs(v || 1) * 2) * HI) / HI, Math.round((sy + 0.5) * HI) / HI, w * 0.7, 0.5); // spray trailing
      stats.caps++;
    }
    var lms = loc.landmarks;                                                               // the surge at the rocks
    for (i = 0; i < lms.length; i++) {
      if (!lms[i].foam) continue;
      var r = lms[i].r || 20, cx = lms[i].x;
      if (cx + r < camPx - 6 || cx - r > camPx + 326) continue;
      for (x = Math.round(cx - r - 4); x <= cx + r + 4; x += 1.5) {
        var sw = surf.at(x) / amp, e = Math.abs(x - cx) / (r + 4), wash = 0.5 + 0.5 * Math.sin(t * 1.1 + x * 0.05);
        if (sw < -0.2 || h01(Math.round(x * 2), Math.floor(t * 3 + x)) > 0.55 + 0.35 * wash) continue;
        c.globalAlpha = k * (0.35 + 0.5 * wash) * (e > 0.8 ? 1 : 0.6);
        c.fillRect(Math.round((x - camPx) * HI) / HI, Math.round((wyS - th - 0.5 - Math.max(0, sw) * 0.8) * HI) / HI, 1.5, 0.5);
      }
    }
    var KT = Sx.kelpTop;                                                                   // kelp on the water
    if (KT && run.uw.alpha < 0.5) {
      for (var b = 0; b < KT.length; b++) {
        var lo = Math.max(KT[b][0], camPx - 4), hi = Math.min(KT[b][1], camPx + 324);
        for (x = Math.floor(lo / 3) * 3; x < hi; x += 3) {
          var hh = h01(x, 31);
          if (hh < 0.45) continue;
          c.globalAlpha = 0.85 * (1 - 0.5 * n); c.fillStyle = P[hh > 0.8 ? 'olive' : 'olive_dark'];
          c.fillRect(Math.round((x - camPx + Math.sin(t * 0.7 + x * 0.2)) * HI) / HI, Math.round((wyS - surf.at(x) / HI - 0.5) * HI) / HI, 1.5 + (S.hash(x, 5) & 3) * 0.5, 0.5);
          if (hh > 0.9) { c.fillStyle = P.olive_hi; c.fillRect(Math.round((x - camPx) * HI) / HI, Math.round((wyS - surf.at(x) / HI - 1) * HI) / HI, 1, 1); } // a float
        }
      }
      c.fillStyle = P.water_foam;
    }
    c.globalAlpha = 1;
    stats.ms = performance.now() - t0;
  }

  // What each reach has (dbg.shore()): the sea's live parts by world x.
  function things(loc) {
    var o = [], Sx = loc.sea || {}, i;
    function add(kind, x0, x1) { o.push({ kind: kind, x: [x0, x1] }); }
    add('whitecaps', 0, loc.width);
    if (Sx.tide) add('tide', 0, loc.width);
    for (i = 0; i < (Sx.kelpTop || []).length; i++) add('kelp on the water', Sx.kelpTop[i][0], Sx.kelpTop[i][1]);
    for (i = 0; i < (loc.underwater.kelp || []).length; i++) add('kelp forest', loc.underwater.kelp[i][0], loc.underwater.kelp[i][1]);
    for (i = 0; i < loc.landmarks.length; i++) {
      var lm = loc.landmarks[i];
      if (lm.foam) add('surge', lm.x - (lm.r || 20), lm.x + (lm.r || 20));
      if (lm.kind === 'headland' && lm.light) add('lighthouse beam', lm.light.x, lm.light.x);
      if (lm.kind === 'mooring') add('moored boat', lm.x, lm.x);
    }
    var rb = loc.underwater.rockBed || [];
    for (i = 0; i < rb.length; i++) add('rock bed', rb[i][0], rb[i][1]);
    return o;
  }

  // dbg.sea(): the swell, the tide and the beam now.
  function sea() {
    var loc = G.scene.sailing.loc(), run = G.state.run;
    if (!loc || loc.water !== 'sea') return null;
    var h = clock(), T = loc.sea && loc.sea.tide, th = tideH(loc, h), rising = tideH(loc, h + 0.05) > th, lp = lampOf(loc), n = nightK(), bm = beamAt(run.boat.t);
    var sw = loc.swell, st = G.scene.sailing.stormK(), next = T ? T.high : 0;
    while (T && next <= h) next += TIDE_PERIOD;
    while (T && next - TIDE_PERIOD > h) next -= TIDE_PERIOD;
    return {
      loc: loc.id,
      swell: { amp: +G.gfx.surface.amp().toFixed(2), height: +Math.min(G.gfx.surface.amp(), sw.clamp || 3).toFixed(2), base: sw.amp, clamp: sw.clamp || 3, storm: +st.toFixed(2), stormLift: (loc.sea && loc.sea.storm) || 1 },
      tide: T ? { px: +th.toFixed(2), m: +(th / 4).toFixed(2), of: T.amp, rising: rising, highAt: +(next % 24).toFixed(2) } : null,
      beam: lp ? { lit: n >= 0.08, night: +n.toFixed(2), lamp: [lp[0], +lp[1].toFixed(1)], angle: Math.round(bm.ang * 180 / Math.PI), side: bm.side > 0 ? 'east' : 'west', len: +bm.len.toFixed(1), flash: +bm.flash.toFixed(2), period: BEAM_PERIOD } : null,
      caps: { k: +capsK(loc).toFixed(2), drawn: stats.caps },
      ms: +stats.ms.toFixed(3)
    };
  }

  function debugLine(run) {
    var loc = G.data.locations[run.loc], x = run.boat.x, Rr = loc.reaches, name = '', d = sea();
    for (var i = 0; i < Rr.length; i++) if (x >= Rr[i].x[0] && x < Rr[i].x[1]) name = Rr[i].name;
    return name + '  bed ' + (G.scene.underwater.bottomAt(loc, x) / 4).toFixed(1) + ' m' + (d ? '  swell ' + d.swell.amp + '  tide ' + d.tide.px + ' px ' + (d.tide.rising ? 'rising' : 'falling') + '  caps ' + d.caps.drawn + (d.beam && d.beam.lit ? '  beam ' + d.beam.side + ' ' + d.beam.len : '') : '');
  }

  var LM = { headland: headland, skerries: skerries, haulout: haulout, breakwater: breakwater, mooring: mooring, schooner: schooner };
  var MOD = { landmarks: LM, afterLayer: afterLayer, surface: surface, things: things, debugLine: debugLine, sea: sea, tideH: tideH, headTop: headTop };
  G.scene.scenery.sound = MOD;
  G.scene.scenery.wreck = MOD;
  G.scene.seas = { sea: sea, tideH: tideH, boatArt: boatArt, stats: stats };
})();
