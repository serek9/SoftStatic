var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Scenery modules (V6, 11.4): the parts of a location that baked layers cannot do alone.
// A location names its module with loc.scenery; sailing.js calls it through its scenery
// hook (the parts are listed there). update() and landed() change only run.scen and
// run.spots; the draw parts only read them. Painters run once, when the location bakes.
G.scene = G.scene || {};
G.scene.scenery = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, C = G.sim.clock;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function layerOf(loc, kind) {
    for (var i = 0; i < loc.layers.length; i++) if (loc.layers[i].kind === kind) return loc.layers[i];
    return null;
  }

  function landmarkOf(loc, kind) {
    for (var i = 0; i < loc.landmarks.length; i++) if (loc.landmarks[i].kind === kind) return loc.landmarks[i];
    return null;
  }

  // ---- The Pines (11.2) ------------------------------------------------------------
  // Geometry shared by the painters and the live parts, relative to each feature's x.
  var DINER = { w: 26, h: 9, signX: 18, signW: 11, signH: 5 };
  var LOT = { w: 44, lampGap: 14, lampH: 10 };
  var SIGNAL = { pole: 12, top: 30, boxH: 8 }; // pole offset, its height, the housing's height

  // How often (s per blink) the traffic light blinks at this hour: sig.period most of the
  // night, sig.fast inside a clock window, and closing in on fast through the `lead` game
  // hours before a window opens. Pure.
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
      // The far shore: a low dark bank, the diner with its sign, the lot with its lamps.
      farshore: function (ctx, L, w, wy, rng) {
        var x, i, f;
        ctx.fillStyle = P[L.color];
        for (x = 0; x < w; x++) {
          var top = L.base + (rng.next() < 0.3 ? rng.int(-1, 0) : 0);
          ctx.fillRect(x, top, 1, wy - top);
        }
        for (i = 0; i < L.features.length; i++) {
          f = L.features[i];
          if (f.kind === 'diner') {
            var dx = f.x, dy = L.base - DINER.h;
            ctx.fillStyle = P.stone_dark; ctx.fillRect(dx, dy, DINER.w, DINER.h);
            ctx.fillStyle = P.stone; ctx.fillRect(dx - 1, dy - 1, DINER.w + 2, 1);
            ctx.fillStyle = P.dusk_amber;
            for (x = dx + 2; x < dx + DINER.w - 3; x += 4) ctx.fillRect(x, dy + 3, 3, 2); // the long window
            ctx.fillStyle = P.stone_dark;
            ctx.fillRect(dx + DINER.signX + 5, dy - 7, 1, 6);                                 // sign post
            ctx.fillStyle = P.ink; ctx.fillRect(dx + DINER.signX, dy - 7 - DINER.signH, DINER.signW, DINER.signH);
          } else if (f.kind === 'lot') {
            ctx.fillStyle = P.stone_dark; ctx.fillRect(f.x, L.base - 1, LOT.w, 2);
            ctx.fillStyle = P.stone;
            for (x = f.x + 2; x < f.x + LOT.w; x += 5) ctx.fillRect(x, L.base - 1, 1, 1);    // painted bays
            for (var k = 0; k < f.lamps; k++) {
              var lx = f.x + 4 + k * LOT.lampGap;
              ctx.fillRect(lx, L.base - LOT.lampH, 1, LOT.lampH - 1);
              ctx.fillRect(lx - 1, L.base - LOT.lampH, 3, 1);
            }
          }
        }
      }
    },

    landmarks: {
      // A blinking traffic light over the water: a pole in the lake, an arm, the housing.
      signal: function (ctx, x, wy) {
        var px = x + SIGNAL.pole, top = wy - SIGNAL.top;
        ctx.fillStyle = P.stone_dark;
        ctx.fillRect(px, top, 2, SIGNAL.top);
        ctx.fillRect(x, top, px - x + 1, 1);
        ctx.fillRect(x, top + 1, 1, 2);                                   // the hanger
        ctx.fillStyle = P.ink; ctx.fillRect(x - 2, top + 3, 5, SIGNAL.boxH);
        ctx.fillStyle = P.stone_dark;
        ctx.fillRect(x - 1, top + 4, 3, 2); ctx.fillRect(x - 1, top + 7, 3, 2); // lamp holes
        return [x - 2, px + 1];
      },
      // An abandoned road running down into the lake, with its guardrail and a rusted sign.
      road: function (ctx, x, wy) {
        var x0 = x - 44, i;
        for (i = 0; i <= 54; i++) {
          var y = wy - 9 + Math.round(i * 9 / 54);
          ctx.fillStyle = P.stone_dark; ctx.fillRect(x0 + i, y, 1, 3);
          if (i % 6 < 3) { ctx.fillStyle = P.dusk_amber; ctx.fillRect(x0 + i, y + 1, 1, 1); } // the faded centre line
          if (i % 7 === 0 && i < 40) { ctx.fillStyle = P.stone; ctx.fillRect(x0 + i, y - 3, 1, 3); }
          if (i < 40) { ctx.fillStyle = P.stone_hi; ctx.fillRect(x0 + i, y - 3, 1, 1); }
        }
        ctx.fillStyle = P.stone; ctx.fillRect(x0 + 6, wy - 22, 1, 13);
        ctx.fillStyle = P.rust_hi;
        for (i = 0; i < 3; i++) ctx.fillRect(x0 + 6 - i, wy - 25 + i, i * 2 + 1, 1);
        for (i = 0; i < 2; i++) ctx.fillRect(x0 + 5 + i, wy - 22 + i, 3 - i * 2, 1);
        return [x0, x + 10];
      },
      // A dead tree at the water's edge with a bare branch for the owl.
      owl_branch: function (ctx, x, wy, rng) {
        ctx.fillStyle = P.wood_dark;
        ctx.fillRect(x, wy - 38, 2, 38);
        ctx.fillRect(x + 2, wy - 27, 12, 1);
        ctx.fillRect(x - 6, wy - 33, 6, 1);
        for (var i = 0; i < 4; i++) ctx.fillRect(x + rng.int(-1, 2), wy - rng.int(10, 36), 1, 2);
        return [x - 6, x + 14];
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
      // TODO(P13.2): the lot's fluorescent hum (and P13.4: the Pines jazz chords).
    },

    afterLayer: function (c, id, ox, oy, run, loc) {
      var s = run.scen, k, x, y;
      if (id === 'farshore') {
        // Neon: mostly lit, dropping out for a beat now and then (a hash of time, no RNG).
        var dx = s.diner.x - ox + DINER.signX, dy = s.far.base - DINER.h - 7 - DINER.signH - oy;
        if ((S.hash(17, Math.floor(s.t * 8)) & 31) > 1) {
          c.globalAlpha = 0.25; c.fillStyle = P.neon_red; c.fillRect(dx - 1, dy - 1, DINER.signW + 2, DINER.signH + 2);
          c.globalAlpha = 1;
          c.fillRect(dx, dy, DINER.signW, 1); c.fillRect(dx, dy + DINER.signH - 1, DINER.signW, 1);
          c.fillRect(dx, dy, 1, DINER.signH); c.fillRect(dx + DINER.signW - 1, dy, 1, DINER.signH);
          c.fillStyle = P.neon_teal; c.fillRect(dx + 3, dy + 2, 4, 1); c.fillRect(dx + 7, dy + 2, 1, 1);
        }
        // The lot's fluorescent lamps; the middle one has a bad starter and stutters in bursts.
        for (k = 0; k < s.lot.lamps; k++) {
          var lit = true;
          if (k === 1 && (S.hash(29, Math.floor(s.t / 2.5)) & 1)) lit = (S.hash(31, Math.floor(s.t * 14)) & 7) > 2;
          if (!lit) continue;
          x = s.lot.x + 4 + k * LOT.lampGap - ox; y = s.far.base - LOT.lampH - oy;
          c.fillStyle = P.lamp_glow; c.fillRect(x - 1, y + 1, 3, 1);
          c.globalAlpha = 0.12; c.fillStyle = P.fog_light;
          for (var r = 2; r < LOT.lampH; r++) c.fillRect(x - (r >> 1), y + r, (r >> 1) * 2 + 1, 1);
          c.globalAlpha = 1;
        }
      } else if (id === 'marks') {
        x = s.sig.x - ox; y = loc.waterY - SIGNAL.top + 3 - oy;
        if (s.on) {
          c.globalAlpha = 0.2; c.fillStyle = P.signal_amber; c.fillRect(x - 3, y - 1, 7, 7);
          c.globalAlpha = 1; c.fillRect(x - 1, y + 1, 3, 2);
        }
        // The owl on its branch opens its eyes while a clock window is open (the sprite is sailing.js's).
        S.draw(c, 'owl', s.owl.x + 4 - ox, loc.waterY - 34 - oy, s.eyes ? 1 : 0, false);
      }
    },

    debugLine: function (run) {
      var s = run.scen;
      return 'signal ' + s.period.toFixed(2) + ' s/blink ' + (s.on ? 'on' : 'off') + (s.eyes ? '  owl eyes open' : '');
    },

    blinkPeriod: function (hour) { return blinkPeriod(landmarkOf(G.data.locations.pines, 'signal'), hour, G.data.windows); }
  };

  // ---- Red Room Reservoir (11.3) ------------------------------------------------------
  var MOVE_FADE = 2; // s a structure takes to fade out where it was and in where it is now

  // The structures, standing in the water with their feet at wy (the caller sets the alpha).
  var MOVERS = {
    floor_lamp: function (c, x, wy) {
      c.fillStyle = P.stone; c.fillRect(x, wy - 22, 1, 21); c.fillRect(x - 2, wy - 1, 5, 1);
      c.fillStyle = P.dusk_rose;
      for (var r = 0; r < 5; r++) c.fillRect(x - 2 - (r >> 1), wy - 28 + r, 5 + (r >> 1) * 2, 1);
      c.fillStyle = P.lamp_glow; c.fillRect(x - 3, wy - 23, 7, 1);
    },
    armchair: function (c, x, wy) {
      c.fillStyle = P.blood; c.fillRect(x - 5, wy - 13, 3, 12); c.fillRect(x - 5, wy - 6, 11, 4);
      c.fillStyle = P.crimson; c.fillRect(x - 4, wy - 12, 1, 6); c.fillRect(x - 2, wy - 7, 8, 1); c.fillRect(x + 4, wy - 9, 2, 3);
      c.fillStyle = P.wood_dark; c.fillRect(x - 5, wy - 2, 1, 2); c.fillRect(x + 5, wy - 2, 1, 2);
    },
    statue: function (c, x, wy) {
      c.fillStyle = P.stone; c.fillRect(x - 4, wy - 5, 9, 5);
      c.fillStyle = P.stone_hi;
      c.fillRect(x - 1, wy - 19, 3, 3); c.fillRect(x - 2, wy - 16, 5, 7); c.fillRect(x - 2, wy - 9, 2, 4); c.fillRect(x + 1, wy - 9, 2, 4);
      c.fillRect(x + 3, wy - 15, 1, 5);
      c.fillStyle = P.bone; c.fillRect(x, wy - 18, 1, 1);
    }
  };

  var red = {
    paint: {
      // Heavy curtains where the mist would be: folded panels to a wavy hem, with gaps.
      curtain: function (ctx, L, w, wy, rng) {
        for (var x0 = rng.int(-20, 0); x0 < w;) {
          var pw = rng.int(L.panel[0], L.panel[1]), ph = rng.range(0, 6.28);
          for (var x = Math.max(0, x0); x < Math.min(w, x0 + pw); x++) {
            var f = Math.sin((x - x0) * 0.9 + ph) + 0.4 * Math.sin((x - x0) * 0.23);
            var hem = L.hem + Math.round(Math.abs(Math.sin((x - x0) * 0.07)) * 3);
            ctx.fillStyle = P[f > 0.75 ? L.hi : (f > -0.3 ? L.color : L.dark)];
            ctx.fillRect(x, 0, 1, Math.min(hem, wy));
          }
          x0 += pw + rng.int(L.gap[0], L.gap[1]);
        }
      },
      // The zigzag floor for a shore.
      zigzag: function (ctx, L, w, wy) {
        for (var y = 0; y < L.height; y++) {
          var shift = Math.abs((y % 6) - 3);
          for (var x = 0; x < w; x++) {
            ctx.fillStyle = P[(((x + shift) / 3) | 0) & 1 ? L.color : L.alt];
            ctx.fillRect(x, wy - L.height + y, 1, 1);
          }
        }
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
        if (m.rare) sp.rare = m.rare;
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
        var draw = MOVERS[loc.movers[i].kind];
        if (u < 1) { c.globalAlpha = 1 - u; draw(c, Math.round(s.from[i] - ox), wy); }
        c.globalAlpha = u; draw(c, Math.round(s.xs[i] - ox), wy);
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

  return { pines: pines, red: red };
})();
