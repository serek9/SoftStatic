var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Scenery modules (V6, 11.4): the parts of a location that baked layers cannot do alone.
// A location names its module with loc.scenery; sailing.js calls it through its scenery
// hook (the parts are listed there). update() and landed() change only run.scen and
// run.spots; the draw parts only read them. Painters run once, when the location bakes.
// Phase 18: painters work in layer pixels (HI = 2 per world pixel, the data's lengths
// already scaled), and the live parts draw in the 640×360 view's pixels (native()).
G.scene = G.scene || {};
G.scene.scenery = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, C = G.sim.clock, A = G.gfx.paint, F = S.fine, HI = 2;
  var STONES = ['stone_dark', 'stone', 'stone_hi', 'stone_lit'], WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'];
  var RUSTY = ['rust_dark', 'rust', 'rust_hi'];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function layerOf(loc, kind) {
    for (var i = 0; i < loc.layers.length; i++) if (loc.layers[i].kind === kind) return loc.layers[i];
    return null;
  }

  function landmarkOf(loc, kind) {
    for (var i = 0; i < loc.landmarks.length; i++) if (loc.landmarks[i].kind === kind) return loc.landmarks[i];
    return null;
  }

  // Live drawing in the view's pixels: the scene draws in world pixels through the view's ×2.
  function native(c) { c.save(); c.scale(1 / HI, 1 / HI); }

  // ---- The Pines (11.2) ------------------------------------------------------------
  // Geometry shared by the painters and the live parts, in layer pixels, relative to each
  // feature's x (the data's x times HI).
  var DINER = { w: 56, h: 18, signX: 36, signW: 24, signH: 11 };
  var LOT = { w: 88, lampGap: 28, lampH: 22 };
  var SIGNAL = { pole: 24, top: 60, boxH: 18 }; // pole offset, its height, the housing's height

  // How often (s per blink) the traffic light blinks at this hour: sig.period most of the
  // night, sig.fast inside a clock window, and closing in on fast through the `lead` game
  // hours before a window opens. Pure.
  // The lot's middle lamp has a bad starter: in some 2.5 s stretches it stutters (a hash of
  // time, no RNG). The audio engine reads the same function for the hum.
  function lampLit(t) { return !(S.hash(29, Math.floor(t / 2.5)) & 1) || (S.hash(31, Math.floor(t * 14)) & 7) > 2; }

  function blinkPeriod(sig, hour, windows) {
    var near = 24;
    for (var i = 0; i < windows.length; i++) {
      if (C.inWindow(hour, windows[i])) return sig.fast;
      near = Math.min(near, C.wrap(windows[i].from - hour));
    }
    if (near >= sig.lead) return sig.period;
    return sig.fast + (sig.period - sig.fast) * near / sig.lead;
  }

  var pines = {
    paint: {
      // The far shore: a low dark bank with a few far trees, the diner with its long lit
      // window and its sign, the parking lot with painted bays and lamp posts.
      farshore: function (ctx, L, w, wy, rng) {
        var x, i, f, t = 0;
        for (x = 0; x < w; x++) { t = clamp(t + rng.int(-1, 1), -2, 1); A.box(ctx, L.color, x, L.base + t, 1, wy - L.base - t); }
        for (x = rng.int(0, 20); x < w; x += rng.int(10, 30)) A.pine(ctx, x, L.base + 1, rng.int(8, 16), { dark: L.color, mid: 'night_blue', lit: 'night_blue', trunk: L.color }, rng);
        for (i = 0; i < L.features.length; i++) {
          f = L.features[i];
          if (f.kind === 'diner') {
            var dx = f.x, dy = L.base - DINER.h;
            A.box(ctx, 'night_deep', dx - 6, dy - 4, DINER.w + 12, DINER.h + 4);            // clear the trees behind it
            A.slab(ctx, dx, dy, DINER.w, DINER.h, ['ink', 'stone_dark', 'stone', 'stone_hi']);
            A.box(ctx, 'stone_hi', dx - 2, dy - 2, DINER.w + 4, 2); A.box(ctx, 'stone_lit', dx - 2, dy - 2, DINER.w + 4, 1);
            for (x = dx + 4; x < dx + DINER.w - 8; x += 7) { A.box(ctx, 'dusk_amber', x, dy + 5, 6, 5); A.box(ctx, 'dusk_high', x, dy + 5, 6, 1); }   // the long window
            A.box(ctx, 'rust_dark', dx + DINER.w - 7, dy + 6, 5, DINER.h - 6);               // the door
            A.box(ctx, 'stone_lit', dx, dy + 13, DINER.w, 1);                              // the chrome strip
            A.box(ctx, 'stone_dark', dx + DINER.signX + 10, dy - 14, 2, 12);                // sign post
            A.box(ctx, 'ink', dx + DINER.signX, dy - 14 - DINER.signH, DINER.signW, DINER.signH);
          } else if (f.kind === 'lot') {
            A.box(ctx, 'stone_dark', f.x, L.base - 2, LOT.w, 4); A.box(ctx, 'stone', f.x, L.base - 2, LOT.w, 1);
            for (x = f.x + 4; x < f.x + LOT.w; x += 10) A.box(ctx, 'stone_hi', x, L.base - 1, 1, 2);   // painted bays
            for (var k = 0; k < f.lamps; k++) {
              var lx = f.x + 8 + k * LOT.lampGap;
              A.box(ctx, 'stone', lx, L.base - LOT.lampH, 2, LOT.lampH - 1);
              A.box(ctx, 'stone', lx - 3, L.base - LOT.lampH, 8, 2); A.box(ctx, 'stone_hi', lx - 3, L.base - LOT.lampH, 8, 1);
            }
          }
        }
      }
    },

    landmarks: {
      // A blinking traffic light over the water: a pole in the lake, an arm, the housing.
      signal: function (ctx, x, wy) {
        var px = x + SIGNAL.pole, top = wy - SIGNAL.top;
        A.slab(ctx, px, top, 4, SIGNAL.top, STONES);
        A.box(ctx, 'stone_dark', x, top, px - x + 2, 2); A.box(ctx, 'stone', x, top, px - x + 2, 1);
        A.box(ctx, 'stone_dark', x, top + 2, 2, 4);
        A.slab(ctx, x - 5, top + 6, 11, SIGNAL.boxH, ['ink', 'ink', 'stone_dark', 'stone']);
        A.blob(ctx, x, top + 10, 2.5, 2.5, ['ink', 'rust_dark']); A.blob(ctx, x, top + 18, 2.5, 2.5, ['ink', 'rust_dark']); // lamp holes
        A.box(ctx, 'ink', x - 4, top + 7, 9, 1);                                                   // visors
        return [x - 5, px + 4];
      },
      // An abandoned road running down into the lake, with its guardrail and a rusted sign.
      road: function (ctx, x, wy) {
        var x0 = x - 88, i;
        for (i = 0; i <= 108; i++) {
          var y = wy - 18 + Math.round(i * 18 / 108);
          A.box(ctx, 'stone_dark', x0 + i, y, 1, 6); A.px(ctx, 'stone', x0 + i, y);
          if (i % 12 < 6) A.box(ctx, 'dusk_amber', x0 + i, y + 3, 1, 1);                         // the faded centre line
          if (i % 14 === 0 && i < 80) A.slab(ctx, x0 + i, y - 7, 2, 7, STONES);
          if (i < 80) { A.box(ctx, 'stone_hi', x0 + i, y - 6, 1, 2); A.px(ctx, 'stone', x0 + i, y - 4); }
        }
        A.slab(ctx, x0 + 12, wy - 44, 2, 26, STONES);
        for (i = 0; i < 8; i++) A.box(ctx, i < 2 ? 'rust_dark' : 'rust_hi', x0 + 13 - i, wy - 52 + i, i * 2 + 1, 1);
        A.box(ctx, 'ink', x0 + 12, wy - 49, 2, 4); A.px(ctx, 'ink', x0 + 12, wy - 47);
        return [x0, x + 20];
      },
      // A dead tree at the water's edge with a bare branch for the owl.
      owl_branch: function (ctx, x, wy, rng) {
        A.area(ctx, x, wy - 76, 4, 76, function (xx, yy) { return xx === x ? 'wood' : ((yy + xx * 5) % 13 === 0 ? 'wood' : 'wood_dark'); });
        A.box(ctx, 'wood_dark', x + 4, wy - 54, 24, 2); A.box(ctx, 'wood', x + 4, wy - 54, 24, 1);
        A.box(ctx, 'wood_dark', x - 12, wy - 66, 12, 2);
        A.line(ctx, 'wood_dark', x - 12, wy - 66, x - 18, wy - 72); A.line(ctx, 'wood_dark', x + 26, wy - 54, x + 32, wy - 60);
        for (var i = 0; i < 6; i++) A.box(ctx, 'wood_deep', x + rng.int(0, 3), wy - rng.int(16, 72), 1, 3);
        return [x - 18, x + 32];
      }
    },

    load: function (run, loc) {
      var far = layerOf(loc, 'farshore'), diner = null, lot = null;
      for (var i = 0; i < far.features.length; i++) {
        if (far.features[i].kind === 'diner') diner = far.features[i];
        if (far.features[i].kind === 'lot') lot = far.features[i];
      }
      run.scen = { t: 0, sig: landmarkOf(loc, 'signal'), owl: landmarkOf(loc, 'owl_branch'), far: far, diner: diner, lot: lot,
        period: 1, ph: 0, on: true, eyes: false };
    },

    // The light's phase runs at the period for the current hour, so it follows dbg.hour at once.
    update: function (run, dt) {
      var s = run.scen, hour = G.state.save.clock || 0;
      s.t += dt;
      s.period = blinkPeriod(s.sig, hour, G.data.windows);
      s.ph = (s.ph + dt / s.period) % 1;
      s.on = s.ph < 0.5;
      s.eyes = false;
      for (var i = 0; i < G.data.windows.length; i++) if (C.inWindow(hour, G.data.windows[i])) s.eyes = true;
      // The lot's hum, the relay's click and the chords are played by js/audio/engine.js from this state.
    },

    afterLayer: function (c, id, ox, oy, run, loc) {
      var s = run.scen, k, x, y, oxN = Math.round(ox * HI), oyN = Math.round(oy * HI);
      if (id === 'farshore') {
        native(c);
        // Neon: EAT in red on the sign, mostly lit, dropping out for a beat now and then.
        var dx = s.diner.x * HI - oxN + DINER.signX, dy = s.far.base * HI - DINER.h - 14 - DINER.signH - oyN;
        if ((S.hash(17, Math.floor(s.t * 8)) & 31) > 1) {
          c.globalAlpha = 0.22; c.fillStyle = P.neon_red; c.fillRect(dx - 3, dy - 3, DINER.signW + 6, DINER.signH + 6);
          c.globalAlpha = 1;
          c.fillRect(dx, dy, DINER.signW, 1); c.fillRect(dx, dy + DINER.signH - 1, DINER.signW, 1);
          c.fillRect(dx, dy, 1, DINER.signH); c.fillRect(dx + DINER.signW - 1, dy, 1, DINER.signH);
          F.drawText(c, 'EAT', dx + ((DINER.signW - F.measure('EAT')) >> 1), dy + 2, 'neon_teal');
        }
        // The lot's fluorescent lamps; the middle one has a bad starter and stutters in bursts.
        for (k = 0; k < s.lot.lamps; k++) {
          if (k === 1 && !lampLit(s.t)) continue;
          x = s.lot.x * HI + 8 + k * LOT.lampGap - oxN; y = s.far.base * HI - LOT.lampH - oyN;
          c.fillStyle = P.lamp_glow; c.fillRect(x - 2, y + 2, 6, 1);
          c.globalAlpha = 0.1; c.fillStyle = P.fog_light;
          for (var r = 3; r < LOT.lampH; r++) c.fillRect(x + 1 - (r >> 1), y + r, (r >> 1) * 2, 1);
          // Audit P2-1: two moths circling each lit lamp, never quite in step.
          c.globalAlpha = 0.85; c.fillStyle = P.paper;
          for (var mth = 0; mth < 2; mth++) {
            var ang = s.t * (2.3 + mth * 0.7) + k * 2 + mth * 3;
            c.fillRect(Math.round(x + 1 + Math.cos(ang) * (6 + mth * 2)), Math.round(y + 3 + Math.sin(ang * 1.3) * 4), 1, 1);
          }
          c.globalAlpha = 1;
        }
        c.restore();
      } else if (id === 'marks') {
        native(c);
        x = s.sig.x * HI - oxN; y = loc.waterY * HI - SIGNAL.top + 6 - oyN;
        if (s.on) {
          c.globalAlpha = 0.18; c.fillStyle = P.signal_amber; c.fillRect(x - 9, y - 3, 19, 15); c.fillRect(x - 6, y - 6, 13, 21);
          c.globalAlpha = 1; c.fillRect(x - 2, y + 2, 5, 4); c.fillStyle = P.lamp_glow; c.fillRect(x - 1, y + 2, 2, 1);
        }
        c.restore();
        // The owl on its branch opens its eyes while a clock window is open (sailing.js paints it).
        var owl = G.scene.sailing.owl(s.eyes);
        c.drawImage(owl, s.owl.x + 6 - ox - owl.width / HI / 2, loc.waterY - 27 - owl.height / HI - oy + 1, owl.width / HI, owl.height / HI);
      }
    },

    debugLine: function (run) {
      var s = run.scen;
      return 'signal ' + s.period.toFixed(2) + ' s/blink ' + (s.on ? 'on' : 'off') + (s.eyes ? '  owl eyes open' : '');
    },

    lampLit: lampLit,
    blinkPeriod: function (hour) { return blinkPeriod(landmarkOf(G.data.locations.pines, 'signal'), hour, G.data.windows); }
  };

  // ---- Red Room Reservoir (11.3) ------------------------------------------------------
  var MOVE_FADE = 2; // s a structure takes to fade out where it was and in where it is now

  // The structures, standing in the water with their feet at wy, painted once each in the
  // view's pixels and drawn at their place (the caller sets the alpha).
  var MOVERS = {
    floor_lamp: { w: 24, h: 60, paint: function (c) {
      A.slab(c, 11, 14, 2, 44, STONES); A.slab(c, 6, 56, 12, 3, STONES);
      for (var r = 0; r < 12; r++) for (var x = -5 - (r >> 1); x <= 5 + (r >> 1); x++) A.px(c, r === 11 ? 'blood' : (x < -2 - (r >> 1) ? 'rug_hi' : (x > 3 + (r >> 2) ? 'blood' : 'dusk_rose')), 12 + x, 2 + r);
      A.box(c, 'lamp_glow', 6, 14, 13, 2);
    } },
    armchair: { w: 26, h: 28, paint: function (c) {
      A.slab(c, 2, 2, 8, 22, ['ink', 'blood', 'crimson', 'rug_hi']); A.slab(c, 2, 13, 22, 9, ['ink', 'blood', 'crimson', 'rug_hi']);
      A.slab(c, 18, 8, 6, 8, ['ink', 'blood', 'crimson', 'rug_hi']); A.box(c, 'rug_hi', 10, 14, 8, 1);
      A.box(c, 'wood_dark', 3, 22, 2, 5); A.box(c, 'wood_dark', 21, 22, 2, 5);
    } },
    statue: { w: 20, h: 40, paint: function (c) {
      A.slab(c, 1, 30, 18, 10, STONES);
      A.blob(c, 10, 5, 3.5, 3.5, STONES, { bias: 0.15 });
      A.slab(c, 6, 9, 9, 13, STONES); A.slab(c, 6, 22, 4, 8, STONES); A.slab(c, 11, 22, 4, 8, STONES); A.slab(c, 15, 10, 2, 10, STONES);
      A.px(c, 'bone', 9, 4);
    } }
  };
  var moverCv = {};
  function moverImg(kind) {
    var m = MOVERS[kind];
    return moverCv[kind] || (moverCv[kind] = G.gfx.bake.layer(m.w, m.h, function (c) { A.reset(); m.paint(c); A.reset(); }));
  }

  // Phase 49: the floor's things, standing on the floor's top at fy (layer px).
  var ROOM_THINGS = {
    pot: function (c, x, fy) {
      for (var r = 0; r < 8; r++) A.box(c, r < 1 ? 'rust_hi' : (r < 5 ? 'rust' : 'rust_dark'), x - 5 + (r >> 2), fy - 8 + r, 10 - (r >> 2) * 2, 1);
      for (var k = 0; k < 7; k++) {
        var d = k - 3, len = 8 + (3 - Math.abs(d)) * 3;
        for (var s = 0; s < len; s++) A.px(c, s > len * 0.6 ? 'moss' : 'moss_dark', x + Math.round(d * s * 0.45), fy - 9 - Math.round(s * (1 - Math.abs(d) * 0.12)) + Math.round(s * s * Math.abs(d) * 0.012));
      }
    },
    chair: function (c, x, fy) {
      A.slab(c, x - 5, fy - 22, 2, 22, WOOD); A.slab(c, x + 4, fy - 10, 2, 10, WOOD);
      A.slab(c, x - 5, fy - 11, 11, 2, WOOD);
      for (var y = 0; y < 3; y++) A.box(c, 'wood_dark', x - 4, fy - 20 + y * 3, 1, 1);
      A.box(c, 'wood_mid', x - 5, fy - 22, 2, 1);
    },
    table: function (c, x, fy) {
      A.slab(c, x - 7, fy - 13, 14, 2, WOOD); A.slab(c, x - 6, fy - 11, 2, 11, WOOD); A.slab(c, x + 4, fy - 11, 2, 11, WOOD);
      A.box(c, 'stone_dark', x - 1, fy - 20, 2, 7); A.box(c, 'stone_dark', x - 3, fy - 14, 6, 1);
      for (var r = 0; r < 6; r++) A.box(c, r < 1 ? 'dusk_rose' : 'blood', x - 3 - (r >> 1), fy - 26 + r, 6 + (r >> 1) * 2, 1);
    },
    door: function (c, x, fy) {
      A.box(c, 'ink', x - 8, fy - 40, 16, 40);
      A.box(c, 'bone', x - 10, fy - 42, 2, 42); A.box(c, 'bone', x + 8, fy - 42, 2, 42); A.box(c, 'bone', x - 10, fy - 42, 20, 2);
      A.box(c, 'stone', x + 9, fy - 41, 1, 41); A.box(c, 'stone', x - 9, fy - 41, 18, 1);
    }
  };

  var red = {
    paint: {
      // Heavy curtains where the mist would be: deep folds to a wavy hem, with gaps.
      curtain: function (ctx, L, w, wy, rng) {
        for (var x0 = rng.int(-40, 0); x0 < w;) {
          var pw = rng.int(L.panel[0], L.panel[1]), ph = rng.range(0, 6.28), fold = rng.range(9, 13);
          for (var x = Math.max(0, x0); x < Math.min(w, x0 + pw); x++) {
            var u = (x - x0) / fold * 6.283 + ph, f = Math.sin(u) + 0.35 * Math.sin(u * 0.27);
            var hem = L.hem + Math.round(Math.abs(Math.sin((x - x0) * 0.035)) * 6);
            var k = f > 0.8 ? L.hi : (f > -0.1 ? L.color : (f > -0.8 ? L.dark : 'ink'));
            A.box(ctx, k, x, 0, 1, Math.min(hem, wy));
            A.px(ctx, f > 0 ? L.dark : 'ink', x, Math.min(hem, wy) - 1);
          }
          x0 += pw + rng.int(L.gap[0], L.gap[1]);
        }
      },
      // The zigzag floor for a shore: black and bone chevrons. Phase 49: things stand on it at
      // the water's edge (L.features, layer px): a potted fern, a straight chair, a side table
      // with an unlit lamp, a door frame standing alone and opening on nothing. Returns the
      // kinds it painted.
      zigzag: function (ctx, L, w, wy) {
        A.area(ctx, 0, wy - L.height, w, L.height, function (x, y) {
          var r = y - (wy - L.height), shift = Math.abs((r % 12) - 6);
          return (((x + shift) / 6) | 0) & 1 ? L.color : L.alt;
        });
        var kinds = ['floor'], f = L.features || [], fy = wy - L.height;
        for (var i = 0; i < f.length; i++) if (ROOM_THINGS[f[i].kind]) { ROOM_THINGS[f[i].kind](ctx, f[i].x, fy); if (kinds.indexOf(f[i].kind) < 0) kinds.push(f[i].kind); }
        return kinds;
      }
    },

    // The first layout comes from the location's seed; its spots join the fixed ones.
    load: function (run, loc) {
      var n = loc.movers.length, s = run.scen = { xs: new Float64Array(n), from: new Float64Array(n), t: MOVE_FADE, spots: [] };
      loc.place(loc.seed, s.xs);
      s.from.set(s.xs);
      run.spots = loc.spots.slice();
      for (var i = 0; i < n; i++) {
        var m = loc.movers[i], sp = { id: m.id, kind: 'open', x: s.xs[i], r: m.r };
        if (m.attract) sp.attract = m.attract;
        s.spots.push(sp);
        run.spots.push(sp);
      }
    },

    // 11.3: once this cast's boost is decided (where things stood when it landed), every
    // structure and its spot moves to a layout seeded by this cast's seed, fading across.
    landed: function (run, loc) {
      var s = run.scen;
      s.from.set(s.xs);
      loc.place(run.cast.seed, s.xs);
      for (var i = 0; i < s.spots.length; i++) s.spots[i].x = s.xs[i];
      s.t = 0;
    },

    update: function (run, dt) { if (run.scen.t < MOVE_FADE) run.scen.t += dt; },

    afterLayer: function (c, id, ox, oy, run, loc) {
      if (id !== 'marks') return;
      var s = run.scen, u = clamp(s.t / MOVE_FADE, 0, 1), wy = loc.waterY - oy;
      for (var i = 0; i < loc.movers.length; i++) {
        var img = moverImg(loc.movers[i].kind), w = img.width / HI, h = img.height / HI;
        if (u < 1) { c.globalAlpha = 1 - u; c.drawImage(img, Math.round((s.from[i] - ox) * HI) / HI - w / 2, wy - h, w, h); }
        c.globalAlpha = u; c.drawImage(img, Math.round((s.xs[i] - ox) * HI) / HI - w / 2, wy - h, w, h);
      }
      c.globalAlpha = 1;
    },

    // The crimson reflection: a wash over the whole mirror buffer (§0.9: crimson is far
    // below the dusk ceiling).
    reflect: function (c, run, loc) {
      c.globalAlpha = loc.reflect.alpha;
      c.fillStyle = P[loc.reflect.tint];
      c.fillRect(-4, 0, 330, loc.waterY);
      c.globalAlpha = 1;
    },

    debugLine: function (run) {
      var s = run.scen, out = '';
      for (var i = 0; i < s.spots.length; i++) out += s.spots[i].id + ' ' + Math.round(s.xs[i]) + '  ';
      return out + (s.t < MOVE_FADE ? 'moving' : 'still');
    }
  };

  return { pines: pines, red: red, ROOM_THINGS: ROOM_THINGS }; // ROOM_THINGS: Phase 50.1's gallery
})();
