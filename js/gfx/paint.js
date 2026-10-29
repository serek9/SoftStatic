var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Painters for the baked world layers (Phase 15, visual detail): mountains with lit faces,
// gullies and haze, forests of shaded pines and autumn trees, shores with rocks and reeds,
// and puffy shaded clouds. Each is baked once into a layer (gfx/bake.js), so none of this
// costs anything per frame. Every painter draws from the private seeded stream it is given
// (never G.rng or G.vrng) and names palette keys only.
//
// A painter is fn(ctx, L, w, wy, rng): L is the layer's data (data/loc_*.js), w its width in
// layer pixels, wy the waterline (the layer's height).
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

  // ---- Mountains ------------------------------------------------------------------------
  // L: {base, amp, color, lit, dark, haze, cap?, features?}. The profile is ridged noise in
  // three octaves. Faces that turn toward the light (the left) get a lit band as deep as the
  // slope is steep; gullies run down from the peaks; the lower part fades into haze.
  function mountains(ctx, L, w, wy, rng) {
    var o1 = lattice(rng, Math.ceil(w / 90) + 2), o2 = lattice(rng, Math.ceil(w / 34) + 2), o3 = lattice(rng, Math.ceil(w / 11) + 2);
    var top = new Int16Array(w + 1), x, y;
    for (x = 0; x <= w; x++) {
      var n = 0.6 * (1 - Math.abs(2 * noiseAt(o1, x, 90) - 1)) + 0.3 * noiseAt(o2, x, 34) + 0.1 * noiseAt(o3, x, 11);
      top[x] = Math.round(L.base - L.amp * n);
    }
    // Faces: the slope averaged over 9 columns, so light falls on whole faces, not stripes.
    // A face turned to the left (rising to the right) is lit to a depth that grows with its
    // steepness; its lower edge is dithered. The bottom fades into haze.
    for (x = 0; x < w; x++) {
      var t0 = top[x], depth = wy - t0, slope = (top[Math.max(0, x - 4)] - top[Math.min(w, x + 4)]) / 8;
      var litTo = slope > 0.1 ? Math.min(depth * 0.7, 4 + slope * 26) : (slope > -0.1 ? 1 : 0);
      var runK = '', runY = t0;
      for (y = t0; y < wy; y++) {
        var k = L.color, d = y - t0, f = d / Math.max(1, depth);
        if (d < litTo - 2 || (d < litTo + 1 && dither(x, y, 0.5))) k = L.lit;
        else if (slope < -0.25 && d < 2 && L.dark) k = L.dark;
        if (L.haze && (f > 0.8 || (f > 0.6 && dither(x, y, 0.5)))) k = L.haze;
        if (L.cap && d < 2 && t0 < L.base - L.amp * 0.72) k = L.cap;
        if (k !== runK) { if (runK) { pen(ctx, runK); ctx.fillRect(x, runY, 1, y - runY); } runK = k; runY = y; }
      }
      if (runK) { pen(ctx, runK); ctx.fillRect(x, runY, 1, wy - runY); }
    }
    // Gullies: from some peaks, a few lines running down and out, lit and dark side by side.
    for (x = 2; x < w - 2; x++) {
      if (!(top[x] <= top[x - 1] && top[x] <= top[x + 1]) || rng.next() > 0.2) continue;
      var lines = 1;
      for (var g = 0; g < lines; g++) {
        var gx = x + rng.int(-3, 3), dir = rng.next() < 0.5 ? -1 : 1, len = rng.int(6, 18), ky = top[Math.max(0, Math.min(w, gx))] + 2;
        for (var s = 0; s < len; s++) {
          var yy = ky + s, xx = gx + Math.round(dir * s * rng.range(0.3, 0.6));
          if (xx < 0 || xx >= w || yy <= top[xx] + 1 || yy >= wy - 2) continue;
          if (yy > top[xx] + (wy - top[xx]) * 0.6) break; // gullies fade before the haze
          if (L.dark && dither(xx, yy, 0.6)) px(ctx, L.dark, xx, yy);
        }
      }
    }
    return top;
  }

  // ---- Trees ------------------------------------------------------------------------------
  // A pine: a 1 px trunk and tiers of boughs, jagged at every tier, lit on the left, dark on
  // the right, speckled in between. keys: {dark, mid, lit, trunk}.
  function pine(ctx, x, gy, h, k, rng) {
    var hw = Math.max(2, Math.round(h * rng.range(0.2, 0.27))), tier = rng.int(3, 5), y;
    pen(ctx, k.trunk || k.dark);
    ctx.fillRect(x, gy - Math.round(h * 0.2), 1, Math.round(h * 0.2));
    var foot = gy - Math.round(h * 0.12);
    for (y = gy - h; y < foot; y++) {
      var r = (y - (gy - h)) / (foot - (gy - h)), inTier = (y - (gy - h)) % tier;
      var half = Math.round(hw * r * (0.65 + 0.35 * inTier / tier) + (rng.next() < 0.3 ? rng.int(-1, 1) : 0));
      if (y === gy - h) { px(ctx, k.mid, x, y); continue; }
      for (var dx = -half; dx <= half; dx++) {
        var key = k.mid;
        if (dx <= -half + 1) key = k.lit;
        else if (dx > half * 0.35) key = k.dark;
        else if (rng.next() < 0.14) key = k.lit;
        px(ctx, key, x + dx, y);
      }
    }
  }

  // A round tree (autumn or summer): overlapping leaf clumps dithered across three leaf keys,
  // lighter up and to the left, a darker trunk showing below. keys: {dark, mid, lit, trunk}.
  function round(ctx, x, gy, h, k, rng) {
    var cw = Math.round(h * rng.range(0.35, 0.5)), cy = gy - h + cw, i;
    pen(ctx, k.trunk);
    ctx.fillRect(x, cy, 1 + (h > 22 ? 1 : 0), gy - cy);
    var clumps = rng.int(4, 7);
    for (i = 0; i < clumps; i++) {
      var ccx = x + rng.int(-cw + 2, cw - 2), ccy = cy - rng.int(0, cw) + 2, rr = rng.int(3, Math.max(4, Math.round(cw * 0.7)));
      for (var yy = -rr; yy <= rr; yy++) for (var xx = -rr; xx <= rr; xx++) {
        var d = (xx * xx + yy * yy) / (rr * rr);
        if (d > 1 || (d > 0.75 && rng.next() < 0.5)) continue;
        var light = (-xx - yy) / (2 * rr) + rng.range(-0.35, 0.35);
        px(ctx, light > 0.35 ? k.lit : (light > -0.25 ? k.mid : k.dark), ccx + xx, ccy + yy);
      }
    }
  }

  // A birch: a pale trunk with dark marks and a thin crown.
  function birch(ctx, x, gy, h, k, rng) {
    for (var y = gy - h + 4; y < gy; y++) px(ctx, rng.next() < 0.18 ? 'ink' : k.bark, x, y);
    for (var i = 0; i < 4; i++) {
      var by = gy - h + rng.int(0, Math.round(h * 0.5)), len = rng.int(3, 6), dir = rng.next() < 0.5 ? -1 : 1;
      for (var s = 0; s < len; s++) px(ctx, s > 2 ? k.mid : k.bark, x + dir * s, by - (s >> 1));
    }
    round(ctx, x, gy - Math.round(h * 0.45), Math.round(h * 0.55), k, rng);
  }

  var TREES = { pine: pine, round: round, birch: birch };

  // L: {base (ground y), height, gap [lo, hi], mix {pine, round, birch}, keys {...} per kind,
  // back (optional: a first, smaller, darker row with keys back)}.
  function forest(ctx, L, w, wy, rng) {
    function row(base, height, gap, keys) {
      for (var x = rng.int(0, gap[0]); x < w + 8; x += rng.int(gap[0], gap[1])) {
        var h = Math.round(height * rng.range(0.6, 1.15)), roll = rng.next(), kind = 'pine', acc = 0;
        for (var m in L.mix) { acc += L.mix[m]; if (roll < acc) { kind = m; break; } }
        TREES[kind](ctx, x, base + rng.int(0, 2), h, keys[kind] || keys.pine, rng);
      }
    }
    if (L.back) { pen(ctx, L.back.pine.dark); ctx.fillRect(0, L.base - 3, w, wy - L.base + 3); row(L.base - 2, L.height * 0.7, [2, 5], L.back); }
    pen(ctx, L.keys.pine.dark); ctx.fillRect(0, L.base, w, wy - L.base);
    row(L.base, L.height, L.gap || [3, 9], L.keys);
  }

  // ---- Shore --------------------------------------------------------------------------------
  // L: {height, rock: {dark, mid, lit}, reeds: share 0..1, ground}. Boulders sit on the
  // waterline, lit on the top left; reeds and cattails stand in clumps; grass between.
  function shore(ctx, L, w, wy, rng) {
    var x, i, r = L.rock || { dark: 'rock_dark', mid: 'rock', lit: 'rock_lit' };
    pen(ctx, L.ground || 'rock_dark');
    for (x = 0; x < w; x++) { var t = wy - L.height + (rng.next() < 0.25 ? rng.int(-1, 1) : 0); ctx.fillRect(x, t, 1, wy - t); }
    var n = Math.round(w / (L.rockEvery || 40));
    for (i = 0; i < n; i++) {
      var cx = rng.int(0, w - 1), rw = rng.int(3, 9), rh = rng.int(2, Math.max(3, Math.round(rw * 0.8)));
      for (var yy = -rh; yy <= 0; yy++) for (var xx = -rw; xx <= rw; xx++) {
        if ((xx * xx) / (rw * rw) + (yy * yy) / (rh * rh) > 1) continue;
        var l = (-xx / rw - yy / rh * 0.8) * 0.5 + rng.range(-0.2, 0.2);
        px(ctx, l > 0.35 ? r.lit : (l > -0.1 ? r.mid : r.dark), cx + xx, wy - 1 + yy);
      }
    }
    var clumps = Math.round(w / 14 * (L.reeds === undefined ? 0.6 : L.reeds));
    for (i = 0; i < clumps; i++) {
      var bx = rng.int(0, w - 1), stalks = rng.int(3, 8), lean = rng.range(-0.25, 0.25);
      for (var s = 0; s < stalks; s++) {
        var sx = bx + rng.int(-3, 3), h = rng.int(4, L.reedH || 12), key = rng.next() < 0.35 ? 'reed_hi' : (rng.next() < 0.5 ? 'reed' : 'reed_dark');
        for (var k = 0; k < h; k++) px(ctx, key, sx + Math.round(lean * k), wy - 2 - k);
        if (h > 8 && rng.next() < 0.3) { pen(ctx, 'wood_dark'); ctx.fillRect(sx + Math.round(lean * h), wy - 2 - h - 2, 1, 3); } // a cattail
      }
    }
    for (i = 0; i < w / 4; i++) px(ctx, rng.next() < 0.5 ? 'moss' : 'moss_dark', rng.int(0, w - 1), wy - L.height - rng.int(0, 2));
  }

  // ---- Clouds -------------------------------------------------------------------------------
  // A cloud field as a level mask (0 none, 1 shadow, 2 body, 3 lit) so the same shapes can be
  // baked in several colourings. Each cloud is a row of puffs with a flat underside, lit along
  // the top, shaded below, with a few long streaks through it.
  function cloudMask(w, h, rng, count) {
    var m = new Uint8Array(w * h), c, i;
    for (c = 0; c < count; c++) {
      var cx = rng.int(0, w - 1), base = rng.int(14, Math.round(h * 0.55)), len = rng.int(50, 150), puffs = rng.int(3, 7);
      for (i = 0; i < puffs; i++) {
        var px0 = cx + Math.round((i / Math.max(1, puffs - 1) - 0.5) * len * 0.8) + rng.int(-6, 6);
        var r = rng.int(4, 9) * (i === 0 || i === puffs - 1 ? 0.7 : 1);
        for (var yy = -Math.ceil(r); yy <= 0; yy++) for (var xx = -Math.ceil(r * 1.8); xx <= Math.ceil(r * 1.8); xx++) {
          if ((xx * xx) / (r * r * 3.2) + (yy * yy) / (r * r) > 1) continue;
          var X = ((px0 + xx) % w + w) % w, Y = base + yy;
          if (Y < 0 || Y >= h) continue;
          var lvl = yy > -2 ? 1 : (yy < -r * 0.55 ? 3 : 2);
          if (lvl > m[Y * w + X]) m[Y * w + X] = lvl;
        }
      }
      // Long thin streaks trailing from the cloud (the painted look of the references).
      for (i = 0; i < 3; i++) {
        var sy = base - rng.int(0, 5), sx = cx - rng.int(0, len), sl = rng.int(20, 60);
        for (var q = 0; q < sl; q++) { var SX = ((sx + q) % w + w) % w; if (sy >= 0 && sy < h && !m[sy * w + SX] && rng.next() < 0.8) m[sy * w + SX] = 2; }
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
        if (x < w) {
          var v = m[y * w + x];
          if (v && keys[v - 1]) {
            k = keys[v - 1];
            // Dither the edge between levels, so the shading reads as paint, not bands.
            var up = y > 0 ? m[(y - 1) * w + x] : 0;
            if (up && up !== v && dither(x, y, 0.5) && keys[up - 1]) k = keys[up - 1];
          }
        }
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
    for (var y = Math.ceil(-ry); y <= Math.floor(ry); y++) for (var x = Math.ceil(-rx); x <= Math.floor(rx); x++) {
      var nx = x / rx, ny = y / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      var v = 0.5 + 0.5 * (-nx * lx - ny * ly) + bias - (d > 0.7 ? rim * (d - 0.7) / 0.3 : 0);
      px(ctx, tone(keys, v, cx + x, cy + y), cx + x, cy + y);
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

  return { reset: reset, area: area, pen: pen, px: px, box: box, hash2: hash2, tone: tone, blob: blob, limb: limb, line: line, slab: slab, dither: dither, mountains: mountains, forest: forest, shore: shore, pine: pine, round: round, birch: birch, cloudMask: cloudMask, paintMask: paintMask };
})();
