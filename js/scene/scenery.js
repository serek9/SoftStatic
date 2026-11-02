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

  return { pines: pines }; // Phase 74: the Red Room's module (its moving furniture, curtains and floor) is gone with it
})();
