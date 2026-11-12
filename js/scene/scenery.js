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
  // Phase 114: the diner's sign reads GREAT / NORTHERN in neon channel letters on a slim rail
  // held high over the roof on two poles, above the woods in front (it was EAT in a black box on
  // the roof, behind those trees). lift: px from the roof's top to the rail; lineH:
  // px between the two rows' tops. x[i] is each row's left edge from the diner's x, off[i][k] each
  // letter's from its row's (filled once, from the fine font, by signLayout).
  var SIGN = { words: ['GREAT', 'NORTHERN'], lift: 54, lineH: 9, x: [0, 0], w: [0, 0], off: [[], []], ready: false, left: 0, right: 0 };
  function signLayout() {
    if (SIGN.ready) return SIGN;
    SIGN.left = DINER.w; SIGN.right = 0;
    for (var i = 0; i < 2; i++) {
      var wd = SIGN.words[i];
      SIGN.w[i] = F.measure(wd); SIGN.x[i] = (DINER.w - SIGN.w[i]) >> 1;
      for (var k = 0; k < wd.length; k++) SIGN.off[i][k] = k ? F.measure(wd.substring(0, k)) + 1 : 0;
      SIGN.left = Math.min(SIGN.left, SIGN.x[i]); SIGN.right = Math.max(SIGN.right, SIGN.x[i] + SIGN.w[i]);
    }
    SIGN.ready = true;
    return SIGN;
  }
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
        var tk = L.tree || 'night_blue';                                                  // 2026-11-06: the far trees' key (the Pines' violet)
        for (x = rng.int(0, 20); x < w; x += rng.int(10, 30)) A.pine(ctx, x, L.base + 1, rng.int(8, 16), { dark: L.color, mid: tk, lit: tk, trunk: L.color }, rng);
        for (i = 0; i < L.features.length; i++) {
          f = L.features[i];
          if (f.kind === 'diner') {
            var dx = f.x, dy = L.base - DINER.h;
            A.box(ctx, L.color, dx - 6, dy - 4, DINER.w + 12, DINER.h + 4);                 // clear the trees behind it
            A.slab(ctx, dx, dy, DINER.w, DINER.h, ['ink', 'stone_dark', 'stone', 'stone_hi']);
            A.box(ctx, 'stone_hi', dx - 2, dy - 2, DINER.w + 4, 2); A.box(ctx, 'stone_lit', dx - 2, dy - 2, DINER.w + 4, 1);
            for (x = dx + 4; x < dx + DINER.w - 8; x += 7) { A.box(ctx, 'dusk_amber', x, dy + 5, 6, 5); A.box(ctx, 'dusk_high', x, dy + 5, 6, 1); }   // the long window
            A.box(ctx, 'rust_dark', dx + DINER.w - 7, dy + 6, 5, DINER.h - 6);               // the door
            A.box(ctx, 'stone_lit', dx, dy + 13, DINER.w, 1);                              // the chrome strip
            // Phase 114: the sign's slim rail on two thin posts; its letters are lit live (afterLayer).
            var sg = signLayout(), ry = dy - 2 - SIGN.lift;
            A.box(ctx, 'stone_dark', dx + sg.left - 3, ry, sg.right - sg.left + 6, 1);
            A.box(ctx, 'ink', dx + sg.left - 3, ry + 1, sg.right - sg.left + 6, 1);
            A.box(ctx, 'stone_dark', dx + sg.left, ry + 2, 1, SIGN.lift - 2);
            A.box(ctx, 'stone_dark', dx + sg.right - 1, ry + 2, 1, SIGN.lift - 2);
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
        // Phase 114: GREAT / NORTHERN in pale neon over the diner, airy: a wide lilac haze that
        // breathes, warm light spilling under each letter, mist drifting through, and letters that
        // each falter on their own now and then (one tired letter more often); once in a while the
        // whole sign sags to a glimmer for a beat, never quite off.
        var sg = signLayout(), x0 = s.diner.x * HI - oxN, ry = s.far.base * HI - DINER.h - 2 - SIGN.lift - oyN;
        var top = ry - 8 - SIGN.lineH, sw = sg.right - sg.left, sh = ry - top;
        var br = 0.82 + 0.18 * Math.sin(s.t * 0.9), sag = (S.hash(17, Math.floor(s.t * 8)) & 63) === 0 ? 0.25 : 1;
        s.signCx = x0 + ((sg.left + sg.right) >> 1); s.signCy = top + (sh >> 1); s.signW = sw; s.signH = sh; s.signA = br * sag; // for afterMist
        for (var li = 0; li < 2; li++) {
          var wd = SIGN.words[li], wx = x0 + SIGN.x[li], wy2 = top + li * SIGN.lineH;
          for (var ki = 0; ki < wd.length; ki++) {
            var hz = S.hash(31 + li * 16 + ki, Math.floor(s.t * 6)) & 63, tired = li === 1 && ki === 4 && (S.hash(29, Math.floor(s.t * 3)) & 7) < 2;
            var la = (hz === 0 ? 0.3 : 1) * (tired ? 0.45 : 1) * sag;
            c.globalAlpha = 0.3 * la; F.drawText(c, wd[ki], wx + SIGN.off[li][ki], wy2 + 1, 'signal_amber');
            c.globalAlpha = la * (0.75 + 0.25 * br); F.drawText(c, wd[ki], wx + SIGN.off[li][ki], wy2, 'lamp_glow');
          }
        }
        c.globalAlpha = 1;
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

    // Phase 114: the sign's halo, drawn over the mist (sailing.js, after drawMist): its light
    // scattered in the fog, stronger the thicker the fog (fogA), with mist drifting through it.
    afterMist: function (c, run, loc, fogA) {
      var s = run.scen, k;
      if (s.signA === undefined) return;
      native(c);
      var hcx = s.signCx, hcy = s.signCy, sw = s.signW, sh = s.signH, top = hcy - (sh >> 1), sg = SIGN, x0 = hcx - (sw >> 1) - sg.left;
      var f = 0.6 + 0.8 * Math.min(1, fogA || 0), br = s.signA;
      for (k = 0; k < 6; k++) {
        var rx = (sw >> 1) + 4 + k * 6, ryy = (sh >> 1) + 3 + k * 4;
        c.globalAlpha = (k < 2 ? 0.07 : 0.04) * br * f; c.fillStyle = k < 2 ? P.lamp_glow : P.fog_lav_hi;
        for (var yy = -ryy; yy < ryy; yy += 2) {
          var e = (yy + 1) / ryy, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - e * e)));
          if (hw > 0) c.fillRect(hcx - hw, hcy + yy, hw * 2, 2);
        }
      }
      c.fillStyle = P.fog_light;                                         // mist drifting through the letters
      for (k = 0; k < 3; k++) {
        c.globalAlpha = 0.09;
        c.fillRect(x0 + sg.left - 24 + ((s.t * (3 + k) + k * 37) % (sw + 48)), top + 2 + k * 6, 16 - k * 3, 1);
      }
      c.globalAlpha = 1;
      c.restore();
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
