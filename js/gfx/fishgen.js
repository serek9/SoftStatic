var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fish painter (PLAN_SPECIES.md 3.5). Every species is painted from its anatomy spec in
// data/fishlooks.js (paintSpec): its portraits (card, journal, cabin, shop) and its swimmers
// under water, in the frames FR gives. Phase 72 deleted the placeholder painter: the old body
// plans (perch, pike, carp, trout, eel, catfish, gar, koi), their palettes and the wrong parts.
// Painting is pure and deterministic; nothing here touches the DOM at load.
G.gfx = G.gfx || {};
G.gfx.fishgen = (function () {
  var S = G.gfx.sprites;
  var SIL_KEY = 'water_deep';

  // The swimmers' frames (Phase 27): the beat runs REST, AWAY, REST, NEAR; a turn runs TURN1,
  // TURN2, then the same flipped. ROLL and SHAKE: the hooked fish (Phase 29). Frame 2 was the
  // wrong fish's glitch shimmer; it went with the wrong parts in Phase 72 and stays unused.
  var FR = { REST: 0, AWAY: 1, NEAR: 3, TURN1: 4, TURN2: 5, ROLL: 6, SHAKE: 7 }, BEAT = [0, 1, 0, 3];
  var SWIM_FRAMES = [0, 1, 3, 4, 5];

  // Catmull-Rom through the control points: the body's top (col 1) or bottom (col 2) at x.
  function profile(pts, col, x) {
    if (x <= pts[0][0]) return pts[0][col];
    for (var i = 0; i < pts.length - 1; i++) {
      if (x > pts[i + 1][0]) continue;
      var p0 = pts[Math.max(0, i - 1)][col], p1 = pts[i][col], p2 = pts[i + 1][col], p3 = pts[Math.min(pts.length - 1, i + 2)][col];
      var t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
    }
    return pts[pts.length - 1][col];
  }

  // A species' portrait (card, journal, cabin, shop), cached; sil paints the silhouette only
  // (unknown journal entries).
  var portraits = {};
  function portrait(i, maxW, maxH, sil) {
    var key = i + ':' + maxW + ':' + maxH + ':' + (sil ? 1 : 0);
    return portraits[key] || (portraits[key] = paintSpecies(i, maxW, maxH, sil, 0, false));
  }

  // How each frame (FR) foreshortens: the tail swept away from the viewer (1) or toward it (3)
  // (seen from the side a beating tail foreshortens; it does not drop); 4 and 5 the fish turning,
  // narrowed across to 0.6 and 0.3 of its length (painted so, never scaled); 6 rolled onto its
  // side (a tired fish: the belly to the viewer, the back fins foreshortened); 7 the head turned
  // in a shake (from the gill forward, foreshortened to 0.7). A swimmer's every frame has the same
  // size; its canvas carries the mouth (mouthX, mouthY) and the body's middle row (midY).
  var TAIL_C = [1, 0.55, 1, 0.75, 1, 1, 0.85, 1], TAIL_S = [1, 0.92, 1, 1.12, 1, 1, 1, 1], SQUASH = [1, 1, 1, 1, 0.6, 0.3, 1, 1];
  var HEAD_X = 0.62, HEAD_SQ = [1, 1, 1, 1, 1, 1, 1, 0.7];

  var mirrored = {};
  function portraitFlipped(i, maxW, maxH) {
    var key = i + ':' + maxW + ':' + maxH;
    return mirrored[key] || (mirrored[key] = G.gfx.bake.flipped(portrait(i, maxW, maxH, false), 'x'));
  }

  // ---- Swimmers (Phase 19; Phase 72: every one painted from its spec) -------------------------
  // The underwater fish, in its frames (FR), facing right or flipped, in colour or as a
  // silhouette; baked on first use. make(frame) paints the colour frame facing right.
  var swimmers = {};
  function swimArt(id, frame, sil, flip, make) {
    var key = id + ':' + frame + (sil ? 's' : 'c') + (flip ? 'f' : 'r'), cv = swimmers[key];
    if (cv) return cv;
    if (flip) {
      var src = swimArt(id, frame, sil, false, make);
      cv = G.gfx.bake.flipped(src, 'x');
      cv.mouthX = src.width - 1 - src.mouthX; cv.mouthY = src.mouthY; cv.midY = src.midY;
    } else if (sil) {
      // Phase 27: the silhouette is the colour frame's shape filled flat.
      var col = swimArt(id, frame, false, false, make);
      cv = G.gfx.bake.layer(col.width, col.height, function (c) {
        c.drawImage(col, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = S.PALETTE[SIL_KEY];
        c.fillRect(0, 0, col.width, col.height);
      });
      cv.mouthX = col.mouthX; cv.mouthY = col.mouthY; cv.midY = col.midY;
    } else cv = make(frame);
    return (swimmers[key] = cv);
  }
  // Drawn every frame, so these look up arrays (no string keys) once baked.
  var swimTab = [], shadowTab = {};
  function slot(fr, sil, flip) { return fr * 4 + (sil ? 2 : 0) + (flip ? 1 : 0); }
  function swimmer(i, frame, sil, flip) {
    var t = swimTab[i] || (swimTab[i] = []), k = slot(frame, sil, flip);
    if (t[k]) return t[k];
    var sm = small(i);
    return (t[k] = swimArt(i, frame, sil, flip, sm ? function (fr) { return paintTiny(specFor(i), sm, fr); } : function (fr) {
      // Phase 70: a species swims as painted from its spec, at its swimLen.
      var sl = swimLen(G.data.fish[i]);
      return paintSpecies(i, sl, sl, false, fr, true);
    }));
  }
  // Phase 72 (replacing the bare body plans): a species painted in a len px box as a silhouette,
  // for the far shoals, the heavy shadow and the dart in the shallows. id: a species id.
  function shadow(id, len, frame, flip) {
    var t = shadowTab[id + len] || (shadowTab[id + len] = []), k = slot(frame, true, flip);
    return t[k] || (t[k] = swimArt(id + '@' + len, frame, true, flip, function (fr) {
      return bakeSpec(paintSpec(id, looksData()[id], len, len, fr, true), false, true);
    }));
  }
  // Phase 44: a small fish (G.data.isSmall) swims at its size, SMALL_PX view px a cm of its
  // mean length with the tail (a 3-6 cm fry is 7 px long), from paintTiny: a spec's parts need
  // room it does not have (the portrait keeps them). Returns its length in px, or 0.
  var SMALL_PX = 1.5, smallOf = [];
  function small(i) {
    if (smallOf[i] !== undefined) return smallOf[i];
    var sp = G.data.fish[i];
    if (!G.data.isSmall || !G.data.isSmall(sp)) return (smallOf[i] = 0);
    return (smallOf[i] = Math.max(6, Math.round((sp.lengthCm[0] + sp.lengthCm[1]) / 2 * SMALL_PX)));
  }

  // Phase 44: the plain painter for a fish a few view pixels long, in the frames FR gives: a
  // spindle body (back, flank and belly rows; deeper for a deep-bodied spec), a dark eye near
  // the snout, a forked tail that flicks up and down with the beat, narrowed through a turn,
  // the belly flashing in a roll, the head nodding in a shake. No outline: at this size it would
  // be all outline. Phase 72: its keys come from the spec (the ramp's back, flank and belly, the
  // fin ramp's root). len: view px from the tail's tip to the snout.
  function paintTiny(L, len, frame) {
    var R = L.ramp, pal = { d: R[1], b: R[Math.min(R.length - 1, 3)], l: R[R.length - 1], f: L.fin[1] };
    var depth = 0;
    for (var q = 0; q <= 10; q++) depth = Math.max(depth, profile(L.body, 2, q / 10) - profile(L.body, 1, q / 10));
    var T = Math.max(2, Math.round(len * 0.24)), Lb = len - T, deep = depth > 0.3;
    var Hb = Math.max(3, Math.round(Lb * (deep ? 0.42 : 0.3))), sq = SQUASH[frame] || 1;
    var Lx = Math.max(2, Math.round(Lb * sq)), Tx = Math.max(1, Math.round(T * sq));
    var W = len + 2, H = Hb + 4, mid = (H - 1) / 2, x0 = 1 + Math.round((len - Lx - Tx) / 2) + Tx;
    var g = new Array(W * H), x, y, u, hh, key;
    for (x = 0; x < g.length; x++) g[x] = '';
    function put(px, py, k) { if (px >= 0 && py >= 0 && px < W && py < H) g[py * W + px] = k; }
    var roll = frame === FR.ROLL, nod = frame === FR.SHAKE ? -1 : 0;
    for (x = 0; x < Lx; x++) {
      u = (x + 0.5) / Lx; // 0 at the tail's root, 1 at the snout
      hh = Hb / 2 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.45) / 0.55, 2))); // fullest behind the head
      var top = Math.round(mid - hh + 0.2), bot = Math.round(mid + hh - 0.2), dy = u > HEAD_X ? nod : 0;
      if (bot < top) bot = top;
      for (y = top; y <= bot; y++) {
        key = y === top ? (roll ? pal.l : pal.d) : (y === bot && bot > top ? pal.l : (roll ? pal.l : pal.b));
        put(x0 + x, y + dy, key);
      }
    }
    if (Lx >= 4) put(x0 + Lx - 2, Math.round(mid - Hb * 0.15) + nod, 'ink');                        // the eye
    if (deep && Lx >= 5 && !roll) put(x0 + Math.round(Lx * 0.45), Math.round(mid - Hb / 2) - 1, pal.f); // the dorsal
    var flick = frame === FR.AWAY ? -1 : (frame === FR.NEAR ? 1 : 0);
    for (x = 1; x <= Tx; x++) {                                                                   // the tail, forking
      var spread = Math.round((x / Tx) * Math.max(1, Hb / 2 - 0.5)), cy = Math.round(mid) + (x === Tx ? flick : 0);
      put(x0 - x, cy - spread, pal.f); put(x0 - x, cy + spread, pal.f);
      if (spread === 0 || x === 1) put(x0 - x, cy, pal.f);
    }
    var cv = G.gfx.bake.layer(W, H, function (c) {
      G.gfx.paint.reset();
      G.gfx.paint.area(c, 0, 0, W, H, function (xx, yy) { return g[yy * W + xx]; });
    });
    cv.mouthX = x0 + Lx - 1; cv.mouthY = Math.round(mid); cv.midY = Math.round(mid);
    return cv;
  }

  // ---- The real-fish painter (Phase 70, PLAN_SPECIES.md 3.5) ---------------------------------
  // A species with an anatomy spec in data/fishlooks.js (G.data.fishLooks[id]) is painted here;
  // since Phase 72 every species has one. A spec is in body lengths
  // from the tail's root (x 0) to the snout (x 1), y down from the body's middle line:
  //   px            its native length in view pixels, tail tip to snout (the portrait's width)
  //   body          [x, top, bottom] control points of the profile (Catmull-Rom, profile() above)
  //   ramp, stops   the body's keys from the back (dark) to the belly (pale), and the depths
  //                 (0 back .. 1 belly) where each next key starts; shading is these flat bands,
  //                 which follow the body
  //   sheen         [v0, v1]: a band one key lighter along the upper flank (the lit back)
  //   zones         [{x0, x1, v0, v1, ramp}]: another ramp there (a bluegill's orange breast)
  //   scales        {size, v0, v1, x0, d}: scale rows drawn as deliberate strokes, d keys darker
  //   lateral       {v, arch, d}: the lateral line, from the gill to the tail's root
  //   head          {gill, bulge, pre, eye [x, y, r], iris, rim, mouth [y, len, droop, gape], lip}
  //   tail          {len, spread, fork, rays, ramp?, tip}: fork 0 square .. 1 deep
  //   fin           the default fin ramp: [ray, root, membrane, edge]
  //   fins          edge fins {k: dorsal|anal|adipose, a (rear), b (front), h, prof, rays, spiny,
  //                 lean, ramp?, spot?, mottle?} and fan fins {k: pectoral|pelvic, x, v, ang (deg:
  //                 90 down, 180 back), len, spread (deg), prof (lower edge to upper), rays, front}
  //                 Phase 71, any fin and the tail: lead [key, key2, side] a leading edge (a char's
  //                 white then dark: the first px, the next; side 1 for a fan fin's upper edge),
  //                 speck {key, cell, n, seed} spots on the fin, one at most per cell px square
  //   head.teeth    Phase 71: a key for the teeth along an open mouth's upper jaw (a spawning salmon)
  //   Phase 72:     head.eye2 a second eye (a flatfish's); mouth[4] sets the mouth back from the
  //                 snout (underneath: suckers, the sturgeon); head.barbels [{x, y, len, ang (deg, 0
  //                 forward, 90 down), curl (deg over its length), key, tip?}]; tail.up, down (the
  //                 lobes' reach, × spread), tilt (the axis rising back, a heterocercal tail), low
  //                 (the lower lobe's length), round (a rounded tail)
  //   marks         bars, saddles, stripes, band, spots (halo?, sx), blotch, worms, mottle, scutes (markAt below)
  // paintSpec returns the key grid (pure: no canvas, so tools/balance.js --validate runs it);
  // bakeSpec turns it into a canvas. The frames (FR) foreshorten as described above.
  function looksData() { return G.data.fishLooks || {}; }
  function specFor(i) { var sp = G.data.fish[i]; return sp ? (looksData()[sp.id] || null) : null; }
  function h2(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function lerpProf(prof, t) {
    if (!prof) return 1;
    var n = prof.length - 1, q = Math.max(0, Math.min(1, t)) * n, i = Math.min(n - 1, Math.floor(q));
    return prof[i] + (prof[i + 1] - prof[i]) * (q - i);
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  var D2R = Math.PI / 180;
  function isEdgeFin(f) { return f.k === 'dorsal' || f.k === 'anal' || f.k === 'adipose'; }

  // The spec's extent in body lengths at rest: {left, right, top, bot}.
  var boxes = {};
  function specBox(id, L) {
    if (boxes[id]) return boxes[id];
    var T = L.tail, top = tailTop(T, 1), bot = tailBot(T, 1), x, k, f, j;
    for (x = 0; x <= 1.0001; x += 0.01) { top = Math.min(top, profile(L.body, 1, x)); bot = Math.max(bot, profile(L.body, 2, x)); }
    for (k = 0; k < L.fins.length; k++) {
      f = L.fins[k];
      if (isEdgeFin(f)) {
        for (j = 0; j <= 20; j++) {
          var xb = f.b - (f.b - f.a) * j / 20, hh = f.h * lerpProf(f.prof, j / 20);
          if (f.k === 'anal') bot = Math.max(bot, profile(L.body, 2, xb) + hh); else top = Math.min(top, profile(L.body, 1, xb) - hh);
        }
      } else {
        var oy = profile(L.body, 1, f.x) + f.v * (profile(L.body, 2, f.x) - profile(L.body, 1, f.x));
        for (j = 0; j <= 20; j++) {
          var a = (f.ang - f.spread / 2 + f.spread * j / 20) * D2R, r = f.len * lerpProf(f.prof, j / 20);
          top = Math.min(top, oy + Math.sin(a) * r); bot = Math.max(bot, oy + Math.sin(a) * r);
        }
      }
    }
    var right = 1.01, bb = L.head.barbels || [];
    for (k = 0; k < bb.length; k++) barbelWalk(bb[k], 1, function (bxx, byy) { top = Math.min(top, byy); bot = Math.max(bot, byy); right = Math.max(right, bxx + 0.01); });
    return (boxes[id] = { left: -T.len - 0.01, right: right, top: top - 0.01, bot: bot + 0.01 });
  }

  // Phase 72: a tail's reach above and below the middle line (k: the spread's scale): a
  // heterocercal tail (the sturgeon's) rises along its axis (tilt) with a longer upper lobe (up)
  // and a short lower one (down).
  function tailTop(T, k) { return -T.spread * k * (T.up || 1) - (T.tilt || 0) * T.len; }
  function tailBot(T, k) { return T.spread * k * (T.down || 1); }
  // Phase 72: a barbel's path, in body lengths from (x, y), leaving at ang (deg: 0 forward, 90
  // down) and bending by curl (deg) over its length; fn(x, y) at each step of `step` lengths.
  function barbelWalk(b, sq, fn) {
    var n = Math.max(2, Math.ceil(b.len / 0.004)), st = b.len / n, a = b.ang * D2R, cu = (b.curl || 0) * D2R / n, x = b.x, y = b.y;
    for (var i = 0; i <= n; i++) { fn(x, y, i / n); x += Math.cos(a) * st * sq; y += Math.sin(a) * st; a += cu; }
  }

  // Native length for a swimmer (view px): a little longer for a bigger species, capped (5. Risks).
  function swimLen(sp) { return Math.round(Math.max(30, Math.min(60, 26 + 0.4 * (sp.lengthCm[0] + sp.lengthCm[1]) / 2))); }

  function paintSpec(id, L, maxW, maxH, frame, swim, lpForce) {
    var bx = specBox(id, L), T = L.tail, fins = L.fins, H0 = L.head;
    var left = bx.left, right = bx.right, top = bx.top, bot = bx.bot;
    if (swim) { top = Math.min(top, tailTop(T, 1.15) - 0.01); bot = Math.max(bot, tailBot(T, 1.15) + 0.01); }
    var nat = (L.px - 2) / (right - left);
    var Lp = lpForce || Math.min(nat, (maxW - 2) / (right - left), (maxH - 2) / (bot - top));
    var W = Math.max(4, Math.ceil((right - left) * Lp - 1e-9) + 2), H = Math.max(4, Math.ceil((bot - top) * Lp - 1e-9) + 2), N = W * H;
    var g = new Array(N), kind = new Uint8Array(N), idx = new Int8Array(N), rmp = new Array(N), px, py, k, f, i;
    for (i = 0; i < N; i++) { g[i] = ''; idx[i] = -1; }
    var sq = SQUASH[frame] || 1, Xc = (left + right) / 2, hs = HEAD_SQ[frame] || 1;
    var tc = TAIL_C[frame] || 1, ts = TAIL_S[frame] || 1, away = frame === FR.AWAY, roll = frame === FR.ROLL;
    function toDisp(X) { return X > HEAD_X ? HEAD_X + (X - HEAD_X) * hs : X; }
    function fromDisp(X) { return X > HEAD_X ? HEAD_X + (X - HEAD_X) / hs : X; }
    function PX(v) { return Math.round(((toDisp(v) - Xc) * sq + Xc - left) * Lp + 0.5); }
    function PY(v) { return Math.round((v - top) * Lp + 0.5); }
    var Xs = new Float64Array(W), Ys = new Float64Array(H), tp = new Float64Array(W), bt = new Float64Array(W);
    for (px = 0; px < W; px++) { Xs[px] = fromDisp(Xc + ((px - 0.5) / Lp + left - Xc) / sq); tp[px] = profile(L.body, 1, Xs[px]); bt[px] = profile(L.body, 2, Xs[px]); }
    for (py = 0; py < H; py++) Ys[py] = (py - 0.5) / Lp + top;
    var finR = L.fin, tailR = T.ramp || finR;
    function fk(r, n) { return r[Math.max(0, Math.min(r.length - 1, n))]; }
    function put(p, key, kd) { g[p] = key; kind[p] = kd; }

    // 1. The fins behind the body: the tail, the edge fins, the fan fins not in front.
    var r0 = (profile(L.body, 2, 0) - profile(L.body, 1, 0)) / 2, c0 = (profile(L.body, 2, 0) + profile(L.body, 1, 0)) / 2;
    var sp = T.spread * ts, thMax = Math.atan2(sp, 0.06 + T.len), tRays = Math.max(2, Math.min(T.rays || 12, Math.floor(2 * sp * Lp / 2.6) + 1)); // rays 2-3 px apart at the edge
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var X = Xs[px], Y = Ys[py], p = py * W + px;
      if (X < 0.03) {
        var Xt = X < 0 ? X / tc : X, s = -Xt / T.len, dy = Y - c0 + (T.tilt || 0) * Math.max(0, s) * T.len;
        var spL = dy < 0 ? sp * (T.up || 1) : sp * (T.down || 1), u = Math.abs(dy) / spL; // Phase 72: lobes of their own reach
        if (s <= 1 && u <= 1) {
          var hh = r0 + (spL - r0) * Math.pow(Math.max(0, s), 0.7);
          var smax = 1 - (T.fork || 0) * Math.max(0, 1 - u / 0.9);
          if (u > 0.8) smax -= (u - 0.8) * 0.9;
          if (T.round) smax -= T.round * u * u;           // Phase 72: a rounded tail (the burbot's)
          if (dy > 0 && T.low) smax *= T.low;             // Phase 72: a short lower lobe
          if (Math.abs(dy) <= hh && s <= smax) {
            var ang = Math.atan2(dy, 0.06 - Xt), q = (ang / thMax + 1) / 2 * (tRays - 1), fr = Math.abs(q - Math.round(q));
            var spacing = 2 * thMax / (tRays - 1) * Math.sqrt(dy * dy + (0.06 - Xt) * (0.06 - Xt)) * Lp * tc;
            var n = s < 0.05 ? 1 : (fr * spacing < 0.6 ? 0 : ((smax - s) * T.len * Lp * tc < 1.2 ? 3 : 2));
            if (away) n -= 1;
            var key = fk(tailR, n);
            if (T.tip && dy > 0 && u > 0.55 && (smax - s) * T.len * Lp < 3.2) key = T.tip;
            if (T.speck && s > 0.12 && n >= 1 && speckAt(T.speck, px, py)) key = T.speck.key;
            if (T.lead && (smax - s) * T.len * Lp * tc < 1.2) key = T.lead[0];
            put(p, key, 1);
          }
        }
      }
    }
    for (k = 0; k < fins.length; k++) {
      f = fins[k];
      var fr2 = f.ramp || finR;
      if (isEdgeFin(f)) {
        var up = f.k !== 'anal', lean = f.lean || 0, span = f.b - f.a, nR = Math.min(f.rays || 0, Math.floor(span * Lp * sq / 3) + 1);
        var pa = Math.max(0, PX(f.a - 0.08) - 2), pb = Math.min(W - 1, PX(f.b + 0.02) + 2);
        for (px = pa; px <= pb; px++) for (py = 0; py < H; py++) {
          var p2 = py * W + px; if (kind[p2] === 2) continue;
          var X2 = Xs[px], Y2 = Ys[py], d0 = up ? tp[px] - Y2 : Y2 - bt[px];
          if (d0 < -2 / Lp) continue;
          var Xb = X2 + lean * Math.max(0, d0), base = up ? profile(L.body, 1, Xb) : profile(L.body, 2, Xb), d = up ? base - Y2 : Y2 - base;
          var t = (f.b - Xb) / span;
          if (t < 0 || t > 1 || d < -2 / Lp) continue;
          var hm = f.h * lerpProf(f.prof, t) * (roll && up ? 0.5 : 1), isRay = false, frR = 0.5;
          if (nR > 1) { var qq = t * (nR - 1); frR = Math.abs(qq - Math.round(qq)); isRay = frR * span * Lp * sq / (nR - 1) < 0.65; }
          var lim = f.spiny && !isRay ? hm * (1 - 0.45 * Math.min(1, frR * 2)) : hm;
          if (d > lim) continue;
          var nn = f.k === 'adipose' ? 1 : (d < 1.2 / Lp ? 1 : (isRay ? 0 : (lim - d < 1.2 / Lp ? 3 : 2)));
          var key2 = fk(fr2, away ? nn - 1 : nn);
          if (f.spot && t >= f.spot[0] && t <= f.spot[1] && d / Math.max(1e-6, hm) >= f.spot[2] && d / Math.max(1e-6, hm) <= f.spot[3]) key2 = f.spot[4];
          if (f.mottle && nn === 2 && h2(px >> 1, py >> 1) < 0.3) key2 = f.mottle;
          if (f.speck && nn >= 0 && d > 1.2 / Lp && speckAt(f.speck, px, py)) key2 = f.speck.key;
          if (f.lead && d > 1 / Lp) { var dl = t * span * Lp * sq; if (dl < 1.3) key2 = f.lead[0]; else if (f.lead[1] && dl < 2.6) key2 = f.lead[1]; }
          put(p2, key2, 1);
        }
      } else if (!f.front) fanFin(f, fr2, false);
    }

    // 2. The body: bands that follow it, the sheen, zones, scales, the lateral line, markings,
    // the gill plate, then an inner rim one key darker, then the mouth and the eye.
    var gill = H0.gill, ll = L.lateral, sc = L.scales;
    var llY = new Int16Array(W);
    for (px = 0; px < W; px++) {
      var Xl = Xs[px];
      llY[px] = ll && Xl > 0.01 && Xl < gill ? PY(tp[px] + (ll.v - ll.arch * Math.sin(Math.PI * clamp01(Xl / gill))) * (bt[px] - tp[px])) : -1;
    }
    var maxBody = 0;
    for (px = 0; px < W; px++) maxBody = Math.max(maxBody, bt[px] - tp[px]);
    var nRows = sc ? Math.max(3, Math.round(maxBody * Lp / sc.size)) : 0;
    for (px = 0; px < W; px++) {
      var X3 = Xs[px];
      if (X3 < 0 || X3 > 1) continue;
      for (py = 0; py < H; py++) {
        var Y3 = Ys[py];
        if (Y3 < tp[px] || Y3 > bt[px]) continue;
        var p3 = py * W + px, v = (Y3 - tp[px]) / (bt[px] - tp[px]);
        if (roll) v = 0.3 + 0.7 * v;
        var ramp = L.ramp, zs = L.zones, z;
        if (zs) for (z = 0; z < zs.length; z++) {
          var Z = zs[z], wob = (h2(px, 7) - 0.5) * 0.06;
          if (X3 >= Z.x0 && X3 <= Z.x1 && v + wob >= Z.v0 && v <= Z.v1) ramp = Z.ramp;
        }
        var id0 = 0;
        while (id0 < L.stops.length && v >= L.stops[id0]) id0++;
        if (L.sheen && v >= L.sheen[0] && v <= L.sheen[1] && X3 > 0.08 && X3 < gill) id0++;
        if (sc && X3 > (sc.x0 || 0.03) && X3 < gill - 0.02 && v >= sc.v0 && v <= sc.v1) {
          var rowf = v * nRows, row = Math.floor(rowf), colf = (px + ((row & 1) ? sc.size / 2 : 0)) / sc.size;
          var cu = Math.floor((colf - Math.floor(colf)) * sc.size), cv = Math.floor((rowf - row) * sc.size);
          if (STAMP[sc.size] && STAMP[sc.size][cv] && STAMP[sc.size][cv].charAt(cu) === 'x' && h2(Math.floor(colf), row + 17) < (sc.n || 0.6)) id0 += sc.d;
        }
        if (py === llY[px]) id0 += ll.d;
        if (X3 > gill - H0.bulge - 0.02) {
          var vv = clamp01((v - 0.06) / 0.9), xop = gill - H0.bulge * Math.sin(Math.PI * vv), dpx = (X3 - xop) * Lp * sq;
          if (v > 0.06 && v < 0.97 && dpx > -0.5 && dpx < 0.6) id0 -= 2;
          else if (v > 0.08 && v < 0.95 && dpx >= 0.6 && dpx < 1.7) id0 += 1;
          if (v < 0.22 && X3 > xop + 1.5 / Lp) id0 -= 1;
          if (H0.cheek && X3 > (H0.pre || gill) + 0.01 && X3 < H0.eye[0] && v > 0.42 && v < 0.88) id0 += H0.cheek;
          if (H0.pre) {
            var xpre = H0.pre + 0.07 * Math.pow(clamp01((v - 0.35) / 0.55), 2), dp = (X3 - xpre) * Lp * sq;
            if (v > 0.2 && v < 0.9 && dp > -0.5 && dp < 0.5) id0 -= 1;
          }
        }
        var mk = L.marks ? markAt(L.marks, X3, v, px, py, (bt[px] - tp[px]) * Lp, Lp) : 0;
        if (typeof mk === 'string') { put(p3, mk, 2); idx[p3] = -2; continue; }
        id0 += mk;
        idx[p3] = Math.max(0, Math.min(ramp.length - 1, id0)); rmp[p3] = ramp; kind[p3] = 2;
      }
    }
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var p4 = py * W + px;
      if (kind[p4] !== 2) continue;
      // The rim: against the empty around it, and against a fin above or below, never where the tail joins.
      var edge = px === 0 || py === 0 || px === W - 1 || py === H - 1 || kind[p4 - 1] === 0 || kind[p4 + 1] === 0 || kind[p4 - W] !== 2 || kind[p4 + W] !== 2;
      if (idx[p4] >= 0) g[p4] = rmp[p4][Math.max(0, idx[p4] - (edge ? 1 : 0))];
      else if (edge) g[p4] = L.ramp[0];
    }
    // The mouth: a dark line from the snout back to its corner, the jaw's gape below it, the
    // upper jaw's bone lit above its rear half.
    // Phase 72: mouth[4] sets it back from the snout (a sucker's or the sturgeon's, underneath).
    var M = H0.mouth, mb = M[4] || 0, mx0 = PX(1 - mb) - 1, my0 = PY(M[0]), mx1 = PX(1 - mb - M[1]), my1 = PY(M[0] + (M[2] || 0)), mn = Math.max(1, Math.abs(mx0 - mx1));
    for (i = 0; i <= mn; i++) {
      var mxx = Math.round(mx0 + (mx1 - mx0) * i / mn), myy = Math.round(my0 + (my1 - my0) * i / mn);
      // An open mouth (gape px at the snout) closes to nothing at its corner.
      for (var gp = 0, gn = Math.round((M[3] || 0) * (1 - i / mn) * Lp / 70); gp <= gn; gp++) if (kind[(myy + gp) * W + mxx] === 2) g[(myy + gp) * W + mxx] = H0.teeth && gn >= 2 && gp === 1 && (i & 1) === 0 ? H0.teeth : L.ramp[0];
      if (H0.lip && i > mn * 0.45 && kind[(myy - 1) * W + mxx] === 2) g[(myy - 1) * W + mxx] = fk(L.ramp, L.ramp.length - 2);
    }
    // The eye: a dark rim, the iris, the pupil a little forward, a highlight.
    eye(H0.eye);
    if (H0.eye2) eye(H0.eye2); // Phase 72: a flatfish's second eye, over the top of its head
    function eye(E) {
      var ex = PX(E[0]), ey = PY(E[1]), R = Math.max(1, E[2] * Lp), Ri = Math.ceil(R + 1);
      for (var yy = -Ri; yy <= Ri; yy++) for (var xx = -Ri; xx <= Ri; xx++) {
        var qx = ex + xx, qy = ey + yy, dd = Math.sqrt((xx / sq) * (xx / sq) + yy * yy);
        if (qx < 0 || qy < 0 || qx >= W || qy >= H || dd > R + 0.3) continue;
        var pd = Math.sqrt(((xx - R * 0.12) / sq) * ((xx - R * 0.12) / sq) + yy * yy);
        g[qy * W + qx] = dd > R - 0.8 && R >= 2 ? (H0.rim || 'ink') : (pd < R * 0.55 ? 'ink' : H0.iris);
      }
      if (R >= 2) { var hx = ex + Math.round(R * 0.15 * sq), hy = ey - Math.round(R * 0.35); if (hx >= 0 && hy >= 0 && hx < W && hy < H) g[hy * W + hx] = 'cream'; }
      else if (ex + 1 < W) g[ey * W + ex] = 'ink';
    }

    // 3. The fins in front: the pectoral over the flank, its membrane letting the body show.
    for (k = 0; k < fins.length; k++) if (!isEdgeFin(fins[k]) && fins[k].front) fanFin(fins[k], fins[k].ramp || finR, true);

    // 4. Phase 72: the barbels, one pixel wide, over everything (a catfish's whiskers, the
    // sturgeon's four under its snout, the carp's and the burbot's chin barbel). In a turn they
    // foreshorten with the head; their tips are one key lighter when the barbel has a tip key.
    var BB = H0.barbels || [];
    for (k = 0; k < BB.length; k++) barbelWalk(BB[k], 1, function (bx0, by0, t) {
      var qx = PX(bx0), qy = PY(by0);
      if (qx >= 0 && qy >= 0 && qx < W && qy < H) put(qy * W + qx, t > 0.7 && BB[k].tip ? BB[k].tip : (BB[k].key || L.ramp[0]), 3);
    });

    function fanFin(f, fr3, front) {
      var ox = f.x, oy = profile(L.body, 1, f.x) + f.v * (profile(L.body, 2, f.x) - profile(L.body, 1, f.x));
      var OX = PX(ox), OY = (oy - top) * Lp + 0.5, Rm = f.len * Lp, nR = Math.max(2, Math.min(f.rays || 6, Math.floor(f.spread * D2R * Rm / 2) + 1));
      for (var yy2 = Math.floor(OY - Rm - 1); yy2 <= Math.ceil(OY + Rm + 1); yy2++) for (var xx2 = Math.floor(OX - Rm * sq - 1); xx2 <= Math.ceil(OX + Rm * sq + 1); xx2++) {
        if (xx2 < 0 || yy2 < 0 || xx2 >= W || yy2 >= H) continue;
        var p5 = yy2 * W + xx2, ddx = (xx2 - OX) / sq, ddy = yy2 - OY, r = Math.sqrt(ddx * ddx + ddy * ddy);
        var th = Math.atan2(ddy, ddx) / D2R, phi = th - f.ang;
        while (phi > 180) phi -= 360; while (phi < -180) phi += 360;
        if (Math.abs(phi) > f.spread / 2) continue;
        var uu = (phi + f.spread / 2) / f.spread, Rr = Rm * lerpProf(f.prof, uu);
        if (r > Rr) continue;
        if (!front && kind[p5] === 2) continue;
        var q3 = uu * (nR - 1), fr4 = Math.abs(q3 - Math.round(q3)), ray = r > 1.5 && fr4 * (f.spread * D2R / (nR - 1)) * r < 0.55;
        var nn2 = r < 1.6 ? 1 : (ray ? 0 : (Rr - r < 1.1 ? 3 : 2));
        // In front of the flank a fin needs its own edge to read: a dark rim, pale webbing, rays between.
        if (front) nn2 = Rr - r < 1.1 || Math.abs(phi) > f.spread / 2 - 0.9 / Math.max(1, r) / D2R ? 0 : (ray ? 1 : 3);
        if (roll && front) nn2 = Math.min(3, nn2 + 1);
        var key3 = fk(fr3, away && !front ? nn2 - 1 : nn2);
        if (front && nn2 === 3 && kind[p5] === 2 && idx[p5] >= 0 && f.clear) key3 = rmp[p5][Math.min(rmp[p5].length - 1, idx[p5] + 1)];
        if (f.speck && r > 2 && speckAt(f.speck, xx2, yy2)) key3 = f.speck.key;
        if (f.lead && r > 1.5) { var dl2 = (f.lead[2] ? f.spread / 2 - phi : phi + f.spread / 2) * D2R * r; if (dl2 < 1.2) key3 = f.lead[0]; else if (f.lead[1] && dl2 < 2.4) key3 = f.lead[1]; }
        put(p5, key3, front ? 3 : 1);
      }
    }

    var midY = PY((profile(L.body, 1, 0.5) + profile(L.body, 2, 0.5)) / 2);
    return { W: W, H: H, g: g, mouthX: mx0, mouthY: my0, midY: midY };
  }

  // Scale strokes per scale size: one cell of the staggered net, a chevron opening to the head.
  var STAMP = {
    2: ['x.', '..'],
    3: ['...', 'x..', '...'],
    4: ['....', '.x..', 'x...', '.x..'],
    5: ['.....', '.x...', 'x....', 'x....', '.x...']
  };

  // Markings: how many keys darker (negative) or lighter this body point is, or a key to paint.
  // bars {xs, w, v0, v1, taper, slant, d}; saddles (the same, ragged); stripes {vs, w (px), x0,
  // x1, broken, dots, d}; band {v0, v1, x0, x1, jag, d}; spots {n, x0, x1, v0, v1, r (px), seed,
  // d|key, halo? a key ringing each spot}; blotch {x, v, rx, ry (body lengths, depths), d|key};
  // worms {x0, x1, v0, v1, sc (px), w, ph, d|key} (Phase 71); mottle {x0, x1, v0, v1, sc, t, ph,
  // d|key} and scutes {vs, x0, x1, n, r (px), key, rim} (Phase 72); spots' sx stretches them along the body.
  var spotCache = {};
  function markAt(marks, X, v, px, py, bodyPx, Lp) {
    var out = 0;
    for (var m = 0; m < marks.length; m++) {
      var mk = marks[m], hit = false;
      if (mk.k === 'bars' || mk.k === 'saddles') {
        if (v < mk.v0 || v > mk.v1) continue;
        var vt = (v - mk.v0) / (mk.v1 - mk.v0), wj = mk.k === 'saddles' ? 1 + 0.5 * (h2(py >> 1, m) - 0.5) : 1 + 0.25 * (h2(py, m + 11) - 0.5);
        var half = mk.w / 2 * (1 - (mk.taper || 0) * vt) * wj;
        for (var b = 0; b < mk.xs.length && !hit; b++) if (Math.abs(X - (mk.xs[b] + (mk.slant || 0) * vt)) < half) hit = true;
      } else if (mk.k === 'stripes') {
        if (X < mk.x0 || X > mk.x1) continue;
        for (var s = 0; s < mk.vs.length && !hit; s++) {
          if (Math.abs(v - mk.vs[s]) * bodyPx >= (mk.w || 1) / 2) continue;
          if (mk.broken && h2((px / 5) | 0, s * 31 + m) < mk.broken) continue;
          if (mk.dots && (px % mk.dots) !== 0) continue;
          hit = true;
        }
      } else if (mk.k === 'band') {
        if (X < mk.x0 || X > mk.x1) continue;
        var jg = (mk.jag || 0) * (h2((px / 2) | 0, m) - 0.5), jg2 = (mk.jag || 0) * (h2((px / 2) | 0, m + 5) - 0.5);
        hit = v >= mk.v0 + jg && v <= mk.v1 + jg2;
      } else if (mk.k === 'spots') {
        var ck = mk.seed + ':' + mk.n + ':' + mk.x0 + ':' + mk.x1 + ':' + mk.v0 + ':' + mk.v1 + ':' + mk.r;
        var pts = spotCache[ck] || (spotCache[ck] = spotList(mk)), ring = false;
        for (var q = 0; q < pts.length && !hit; q++) {
          var dx = (X - pts[q][0]) * Lp / (mk.sx || 1), dv = (v - pts[q][1]) * bodyPx, d2 = dx * dx + dv * dv; // sx: stretched along the body (a pike's beans)
          if (d2 <= pts[q][2] * pts[q][2]) hit = true;
          else if (mk.halo && d2 <= (pts[q][2] + 1.1) * (pts[q][2] + 1.1)) ring = true;
        }
        if (!hit && ring) return mk.halo;
      } else if (mk.k === 'worms') {
        // Vermiculation: wavy worm-tracks, the zero lines of two crossed warped waves (a brook
        // trout's back, a tiger trout all over). sc is the tracks' spacing in px, w their width.
        if (X < mk.x0 || X > mk.x1 || v < mk.v0 || v > mk.v1) continue;
        var sc = mk.sc || 4, wv = Math.sin(px / sc * 1.3 + 1.6 * Math.sin(py / sc * 0.9 + (mk.ph || 0))) + Math.sin(py / sc * 1.1 + 1.6 * Math.sin(px / sc * 0.8 + 1.3));
        hit = Math.abs(wv) < (mk.w || 0.35);
      } else if (mk.k === 'mottle') {
        // Phase 72: blotches, where the same two crossed warped waves as worms rise above t
        // (a burbot's, a lingcod's, a halibut's marbling): continuous, never noise.
        if (X < mk.x0 || X > mk.x1 || v < mk.v0 || v > mk.v1) continue;
        var sm = mk.sc || 4, wm = Math.sin(px / sm * 1.3 + 1.6 * Math.sin(py / sm * 0.9 + (mk.ph || 0))) + Math.sin(py / sm * 1.1 + 1.6 * Math.sin(px / sm * 0.8 + 1.3 + (mk.ph || 0)));
        hit = wm > (mk.t === undefined ? 0.8 : mk.t);
      } else if (mk.k === 'scutes') {
        // Phase 72: the sturgeon's bony plates, rows of diamonds r px across along depths vs,
        // n to a row from x0 to x1, each `key` with a `rim` key round it.
        if (X < mk.x0 - 0.05 || X > mk.x1 + 0.05) continue;
        for (var rr = 0; rr < mk.vs.length && !hit; rr++) {
          var sv = Math.abs(v - mk.vs[rr]) * bodyPx;
          if (sv > mk.r) continue;
          var stp = (mk.x1 - mk.x0) / Math.max(1, mk.n - 1), jn = Math.round((X - mk.x0) / stp);
          if (jn < 0 || jn >= mk.n) continue;
          var sd = Math.abs(X - (mk.x0 + jn * stp)) * Lp + sv;
          if (sd <= mk.r - 1) hit = true;
          else if (sd <= mk.r && mk.rim) return mk.rim;
        }
      } else if (mk.k === 'blotch') {
        var bx = (X - mk.x) / mk.rx, bv = (v - mk.v) / mk.ry;
        hit = bx * bx + bv * bv <= 1;
      }
      if (hit) { if (mk.key) return mk.key; out += mk.d; }
    }
    return out;
  }
  // Phase 71: spots on a fin, one at most per cell (px), at a hashed place in it (deliberate dots, never noise).
  function speckAt(sk, px, py) {
    var c = sk.cell || 4, cx = Math.floor(px / c), cy = Math.floor(py / c), sd = sk.seed || 0;
    if (h2(cx + sd, cy * 3 + 1) >= (sk.n || 0.5)) return false;
    return px - cx * c === Math.floor(h2(cx * 7 + sd, cy) * c) && py - cy * c === Math.floor(h2(cy * 5, cx + sd + 2) * c);
  }
  // Spots: seeded positions (x in body lengths, v in depth) and a radius in px.
  function spotList(mk) {
    var r = new G.core.rng.Rng(mk.seed), out = [];
    for (var i = 0; i < mk.n; i++) out.push([r.range(mk.x0, mk.x1), r.range(mk.v0, mk.v1), mk.r * r.range(0.6, 1.2)]);
    return out;
  }

  // Keys a grid uses (the validator checks each is in the palette).
  function specKeys(grid) { var seen = {}, out = []; for (var i = 0; i < grid.g.length; i++) if (grid.g[i] && !seen[grid.g[i]]) { seen[grid.g[i]] = 1; out.push(grid.g[i]); } return out; }

  // The grid to a canvas: a portrait is cropped to the fish; a swimmer keeps its box (every
  // frame the same size) and gets the dark outline the old swimmers have against the water.
  function bakeSpec(grid, sil, swim) {
    var W = grid.W, H = grid.H, g = grid.g, x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1, x, y;
    var out = new Array(W * H);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var c0 = g[y * W + x], key = c0;
      if (!c0 && swim) key = ((x > 0 && g[y * W + x - 1]) || (x < W - 1 && g[y * W + x + 1]) || (y > 0 && g[(y - 1) * W + x]) || (y < H - 1 && g[(y + 1) * W + x])) ? 'ink' : '';
      out[y * W + x] = key && sil ? SIL_KEY : key;
    }
    if (!swim) {
      x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (out[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
    }
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    var cv = G.gfx.bake.layer(cw, ch, function (c) {
      G.gfx.paint.reset();
      G.gfx.paint.area(c, 0, 0, cw, ch, function (xx, yy) { return out[(yy + y0) * W + xx + x0]; });
    });
    cv.mouthX = grid.mouthX - x0; cv.mouthY = grid.mouthY - y0; cv.midY = grid.midY - y0;
    return cv;
  }
  // A portrait at its native size when the fish itself (not its padded box) fits maxW × maxH;
  // otherwise painted smaller from the same spec, the scale found from the native fish's size.
  var natOf = {};
  function cropSize(gr) {
    var x0 = gr.W, y0 = gr.H, x1 = -1, y1 = -1;
    for (var p = 0; p < gr.g.length; p++) if (gr.g[p]) { var x = p % gr.W, y = (p / gr.W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x1 - x0 + 1, y1 - y0 + 1];
  }
  function paintFit(id, L, maxW, maxH) {
    var n = natOf[id], gr;
    if (!n) {
      var bx = specBox(id, L), lp0 = (L.px - 2) / (bx.right - bx.left);
      gr = paintSpec(id, L, 1e4, 1e4, 0, false, lp0);
      n = natOf[id] = { lp: lp0, wh: cropSize(gr) };
      if (n.wh[0] <= maxW && n.wh[1] <= maxH) return gr;
    }
    if (n.wh[0] <= maxW && n.wh[1] <= maxH) return paintSpec(id, L, 1e4, 1e4, 0, false, n.lp);
    var k = Math.min(maxW / n.wh[0], maxH / n.wh[1]);
    for (var tries = 0; tries < 4; tries++, k *= 0.96) {
      gr = paintSpec(id, L, 1e4, 1e4, 0, false, n.lp * k);
      var wh = cropSize(gr);
      if (wh[0] <= maxW && wh[1] <= maxH) break;
    }
    return gr;
  }
  function paintSpecies(i, maxW, maxH, sil, frame, swim) {
    var sp = G.data.fish[i];
    return bakeSpec(swim ? paintSpec(sp.id, specFor(i), maxW, maxH, frame, true) : paintFit(sp.id, specFor(i), maxW, maxH), sil, swim);
  }
  // dbg.fishLooks(): which species the new painter paints and which are placeholders still.
  function fishLooks() {
    var out = { painted: [], placeholder: [] };
    for (var i = 0; i < G.data.fish.length; i++) (specFor(i) ? out.painted : out.placeholder).push(G.data.fish[i].id);
    return out;
  }

  return {
    portrait: portrait, portraitFlipped: portraitFlipped, FR: FR, BEAT: BEAT, SWIM_FRAMES: SWIM_FRAMES,
    swimmer: swimmer, small: small, shadow: shadow, // shadow: Phase 72
    paintSpec: paintSpec, paintFit: paintFit, cropSize: cropSize, specKeys: specKeys, specFor: specFor, fishLooks: fishLooks, swimLen: swimLen // Phase 70
  };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var r = G.gfx.fishgen.fishLooks();
  return 'fish looks ' + r.painted.length + ' painted, ' + r.placeholder.length + ' placeholder'; // Phase 70
});
