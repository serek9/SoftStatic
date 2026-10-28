var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Sailing (V3.1, V6): location loading and baking, parallax with a smoothed camera,
// the clock-driven dusk sky, mirror water, wake and the boat with the dog.
G.scene = G.scene || {};
G.scene.sailing = (function () {
  var VIEW_W = 320, VIEW_H = 180;
  var S = G.gfx.sprites, B = G.gfx.bake, P = S.PALETTE;
  var boat = G.scene.boat, dog = G.scene.dog, fx = G.gfx.fx;

  var CAM = { k: 4, look: 0.5, lookMax: 40 }; // smoothing 1/s, look-ahead s, max look-ahead px
  var SKY_BANDS = 14;

  var loc = null, layers = [], glint = null;
  var boundsByLoc = {};          // loc id -> landmark id -> [x0, x1] as painted
  var skyCv = null, skyKey = -1, skyLum = 0;
  var skyOut = [0, 0, 0];
  var camPx = 0;                 // rounded camera x for this frame's drawing
  var wakeDist = 0, rippleT = 0;

  // ---- Layer painters ------------------------------------------------------
  // Each paints one baked layer of height waterY; rng is a private, seeded stream, so a
  // location always bakes the same picture without touching G.rng or G.vrng.

  var FEATURES = {
    tower: function (ctx, x, top) {
      ctx.fillRect(x - 4, top - 12, 1, 12); ctx.fillRect(x + 4, top - 12, 1, 12);
      ctx.fillRect(x - 4, top - 7, 9, 1);
      ctx.fillRect(x - 6, top - 20, 13, 8);
      ctx.fillRect(x - 5, top - 21, 11, 1); ctx.fillRect(x - 3, top - 22, 7, 1);
    },
    mast: function (ctx, x, top) {
      ctx.fillRect(x, top - 34, 1, 34);
      ctx.fillRect(x - 2, top - 28, 5, 1); ctx.fillRect(x - 1, top - 18, 3, 1);
      for (var i = 1; i < 10; i++) { ctx.fillRect(x - i, top - 30 + i * 3, 1, 1); ctx.fillRect(x + i, top - 30 + i * 3, 1, 1); }
    }
  };

  var LANDMARKS = {
    pier: function (ctx, x, wy, rng) {
      var x0 = x - 34, x1 = x + 34, deck = wy - 7, px;
      ctx.fillStyle = P.wood_dark;
      for (px = x0 + 2; px <= x1 - 3; px += 8) ctx.fillRect(px, deck + 2, 2, wy - deck - 2);
      ctx.fillRect(x0, deck + 2, x1 - x0 + 1, 1);
      ctx.fillStyle = P.wood;
      for (px = x0; px <= x1; px += 2) if (rng.next() > 0.12) ctx.fillRect(px, deck, 2, 2);
      for (px = x0 + 4; px <= x1 - 8; px += 12) if (rng.next() > 0.3) ctx.fillRect(px, deck - 4, 1, 4);
      ctx.fillRect(x0 + 4, deck - 4, 22, 1);
      ctx.fillStyle = P.stone;
      ctx.fillRect(x1 - 3, deck - 16, 1, 16); ctx.fillRect(x1 - 6, deck - 16, 4, 1);
      ctx.fillStyle = P.rust;
      ctx.fillRect(x1 - 7, deck - 15, 2, 2);
      return [x0, x1];
    },
    marker: function (ctx, x, wy, rng) {
      ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 1, wy - 18, 2, 18);
      ctx.fillStyle = P.rust; ctx.fillRect(x, wy - 18, 1, 14);
      ctx.fillStyle = P.rust_hi; ctx.fillRect(x - 2, wy - 23, 5, 5);
      ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 2, wy - 21, 5, 1);
      for (var i = 0; i < 4; i++) ctx.fillRect(x - 1 + rng.int(0, 1), wy - rng.int(4, 16), 1, rng.int(1, 3));
      return [x - 2, x + 2];
    },
    wreck: function (ctx, x, wy) {
      var x0 = x - 12, i, top;
      for (i = 0; i < 24; i++) {
        top = wy - 1 - Math.round(Math.max(0, i - 4) * 0.55);
        ctx.fillStyle = P.wood_dark; ctx.fillRect(x0 + i, top, 1, wy - top);
        ctx.fillStyle = P.wood; ctx.fillRect(x0 + i, top, 1, 1);
        if (i >= 6 && i % 4 === 2) ctx.fillRect(x0 + i, top - 3, 1, 3);
      }
      return [x0, x0 + 23];
    }
  };

  var PAINT = {
    ridge: function (ctx, L, w, wy, rng) {
      var p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28), walk = 0, tops = new Int16Array(w);
      ctx.fillStyle = P[L.color];
      for (var x = 0; x < w; x++) {
        walk = (walk + rng.range(-0.6, 0.6)) * 0.96;
        var top = Math.round(L.base - L.amp * (0.5 + 0.3 * Math.sin(x * 0.011 + p1) + 0.2 * Math.sin(x * 0.037 + p2)) + walk);
        ctx.fillRect(x, top, 1, wy - top);
        tops[x] = top;
      }
      for (var i = 0; i < (L.features || []).length; i++) {
        var f = L.features[i];
        FEATURES[f.kind](ctx, f.x, tops[f.x]);
      }
    },
    fog: function (ctx, L, w, wy, rng) {
      ctx.fillStyle = P[L.color];
      for (var y = 0; y < L.h; y++) {
        var prof = 1 - Math.abs(2 * y / (L.h - 1) - 1);
        for (var x = 0; x < w;) {
          var len = rng.int(6, 40);
          ctx.globalAlpha = L.alpha * prof * rng.range(0.4, 1);
          ctx.fillRect(x, L.y + y, len, 1);
          x += len;
        }
      }
      ctx.globalAlpha = 1;
    },
    treeline: function (ctx, L, w, wy, rng) {
      ctx.fillStyle = P[L.color];
      ctx.fillRect(0, L.base, w, wy - L.base);
      for (var x = 0; x < w + 4;) {
        var hgt = rng.int(Math.round(L.height * 0.5), Math.round(L.height * 1.2)), half = rng.int(2, 4);
        for (var r = 0; r <= hgt; r++) {
          var rh = Math.round(half * r / hgt);
          ctx.fillRect(x - rh, L.base - hgt + r, rh * 2 + 1, 1);
        }
        x += rng.int(3, 8);
        if (rng.next() < 0.08) x += rng.int(8, 20);
      }
    },
    shore: function (ctx, L, w, wy, rng) {
      var x, h;
      ctx.fillStyle = P[L.color];
      for (x = 0; x < w; x++) {
        var top = wy - L.height + (rng.next() < 0.25 ? rng.int(-1, 1) : 0);
        ctx.fillRect(x, top, 1, wy - top);
      }
      ctx.fillStyle = P[L.detail];
      for (var i = 0; i < w / 5; i++) {
        x = rng.int(0, w - 1); h = rng.int(2, 6);
        ctx.fillRect(x, wy - L.height - h + 1, 1, h);
      }
      ctx.fillStyle = P.stone_dark;
      for (i = 0; i < w / 60; i++) ctx.fillRect(rng.int(0, w - 4), wy - 2, rng.int(2, 4), 2);
    },
    landmarks: function (ctx, L, w, wy, rng) {
      var b = boundsByLoc[loc.id] = {};
      for (var i = 0; i < loc.landmarks.length; i++) {
        var lm = loc.landmarks[i];
        b[lm.id] = LANDMARKS[lm.kind](ctx, lm.x, wy, rng);
      }
    }
  };

  function bakeLayer(L, i) {
    var w = VIEW_W + Math.ceil((loc.width - VIEW_W) * L.parallax), wy = loc.waterY;
    var rng = new G.core.rng.Rng(loc.seed * 31 + i);
    return {
      p: L.parallax,
      cv: B.cached('loc:' + loc.id + ':' + L.id, function () {
        return B.layer(w, wy, function (ctx) { PAINT[L.kind](ctx, L, w, wy, rng); });
      })
    };
  }

  // Loads a location from G.data.locations and bakes its layers (cached per location).
  function load(id) {
    loc = G.data.locations[id];
    if (!loc) throw new Error('unknown location: ' + id);
    layers.length = 0;
    for (var i = 0; i < loc.layers.length; i++) layers.push(bakeLayer(loc.layers[i], i));
    var rng = new G.core.rng.Rng(loc.seed * 31 + 99);
    glint = B.cached('loc:' + id + ':glint', function () {
      return B.layer(loc.width, 1, function (ctx, w) {
        ctx.fillStyle = P.water_hi;
        for (var x = rng.int(0, 10); x < w; x += rng.int(5, 18)) ctx.fillRect(x, 0, rng.int(1, 4), 1);
      });
    });
    if (!skyCv) skyCv = B.canvas(1, VIEW_H);
    skyKey = -1;

    var run = G.state.run;
    run.loc = id;
    run.boat = boat.create(loc.start);
    run.dog = dog.create();
    run.cam = { x: 0 };
    run.cam.x = camTarget(run);
    fx.clear();
  }

  // ---- Camera ----------------------------------------------------------------
  // The target is clamped before smoothing, so the camera eases into the world edge and
  // never overshoots or bounces against it.

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function camTarget(run) {
    var look = clamp(run.boat.vx * CAM.look, -CAM.lookMax, CAM.lookMax);
    return clamp(run.boat.x - VIEW_W / 2 + look, 0, loc.width - VIEW_W);
  }

  function camStep(run, dt) {
    var c = run.cam;
    c.x += (camTarget(run) - c.x) * (1 - Math.exp(-CAM.k * dt));
    c.x = clamp(c.x, 0, loc.width - VIEW_W);
  }

  // Moves the boat to world x (clamped), stops it and snaps the camera.
  function tp(x) {
    var run = G.state.run, m = boat.P.margin;
    run.boat.x = clamp(x, m, loc.width - m);
    run.boat.vx = 0;
    run.cam.x = camTarget(run);
    return run.boat.x;
  }

  // ---- Sky (§0.8, §0.9) ------------------------------------------------------
  // Permanent dusk: only a blend of night_ink and dusk_amber, darkest at 03:00 and
  // brightest at 15:00, always darker toward the top.

  function skyBrightness(hour) { return 0.5 - 0.5 * Math.cos((hour - 3) / 24 * 2 * Math.PI); }

  // f is 0 at the top of the sky and 1 at the horizon. Writes [r, g, b] into out.
  function skyColor(hour, f, out) {
    var b = skyBrightness(hour);
    var t = Math.min(1, b * (0.2 + 0.8 * f) + 0.06 * f * (1 - b));
    var a = S.RGB.night_ink, z = S.RGB.dusk_amber;
    out[0] = Math.round(a[0] + (z[0] - a[0]) * t);
    out[1] = Math.round(a[1] + (z[1] - a[1]) * t);
    out[2] = Math.round(a[2] + (z[2] - a[2]) * t);
    return out;
  }

  function hourNow() {
    var h = G.state.save.clock || 0; // TODO(P6.1): the clock advances here
    return ((h % 24) + 24) % 24;
  }

  // Rebakes the 1 px wide sky strip when the hour moves by 0.05 (3 real seconds).
  function refreshSky(hour) {
    var key = Math.floor(hour * 20);
    if (key === skyKey) return;
    skyKey = key;
    var ctx = skyCv.getContext('2d'), wy = loc.waterY;
    skyLum = 0;
    for (var i = 0; i < SKY_BANDS; i++) {
      skyColor(hour, i / (SKY_BANDS - 1), skyOut);
      var lum = 0.2126 * skyOut[0] + 0.7152 * skyOut[1] + 0.0722 * skyOut[2];
      if (lum > skyLum) skyLum = lum;
      if (!S.skySafe(skyOut[0], skyOut[1], skyOut[2])) throw new Error('sky brighter than ' + S.CEILING_KEY + ' at hour ' + hour);
      ctx.fillStyle = 'rgb(' + skyOut[0] + ',' + skyOut[1] + ',' + skyOut[2] + ')';
      var y0 = Math.floor(i * wy / SKY_BANDS), y1 = Math.floor((i + 1) * wy / SKY_BANDS);
      ctx.fillRect(0, y0, 1, y1 - y0);
    }
  }

  // ---- Scene -------------------------------------------------------------------

  function enter() {
    if (!G.state.run.boat) load('fog'); // TODO(P9.5): start at the saved location
  }

  function exit() {}

  function update(dt) {
    var run = G.state.run, b = run.boat;
    var move = run.fsm === 'sailing' ? G.core.input.move() : 0;
    boat.step(b, move, dt, loc.width);
    dog.step(run.dog, dt);
    camStep(run, dt);

    // Wake: a puff and a small ripple every 6 px travelled; a slow ring while idling.
    var wy = loc.waterY;
    wakeDist += Math.abs(b.vx) * dt;
    while (wakeDist >= 6) {
      wakeDist -= 6;
      fx.emit('wake', boat.stern(b), wy, 2);
      fx.ripple(boat.stern(b), wy + 2, 2, 9, 1.1);
    }
    rippleT += dt;
    if (b.stopped && rippleT >= 1.8) {
      rippleT = 0;
      fx.ripple(b.x, wy + 2, 13, 24, 2.2);
    }
    fx.update(dt);
    G.core.state.tick(run, dt);
  }

  function drawBackdrop(c) {
    var wy = loc.waterY;
    c.drawImage(skyCv, 0, 0, 1, wy, 0, 0, VIEW_W, wy);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      c.drawImage(L.cv, Math.round(camPx * L.p), 0, VIEW_W, wy, 0, 0, VIEW_W, wy);
    }
  }

  function drawDog(c, x, y, flip) { dog.draw(c, G.state.run.dog, x, y, flip); }

  function drawBoat(c) {
    var run = G.state.run;
    boat.draw(c, run.boat, Math.round(run.boat.x - run.cam.x), loc.waterY, true, drawDog);
  }

  function drawAbove(c) { drawBackdrop(c); drawBoat(c); }

  function draw(ctx) {
    var run = G.state.run, wy = loc.waterY;
    refreshSky(hourNow());
    camPx = Math.round(run.cam.x);
    drawBackdrop(ctx);
    G.gfx.water.draw(ctx, wy, VIEW_H, run.boat.t, drawAbove);
    ctx.drawImage(glint, camPx, 0, VIEW_W, 1, 0, wy, VIEW_W, 1);
    fx.draw(ctx, camPx, 0);
    drawBoat(ctx);
  }

  return {
    load: load, tp: tp, enter: enter, exit: exit, update: update, draw: draw,
    skyColor: skyColor, hourNow: hourNow,
    loc: function () { return loc; },
    landmarkBounds: function (id) { return boundsByLoc[loc.id] && boundsByLoc[loc.id][id]; },
    skyLum: function () { return skyLum; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var run = G.state.run, sc = G.scene.sailing;
  if (!run.boat || !sc.loc()) return 'sailing: not loaded';
  var b = run.boat;
  return 'loc ' + run.loc + '  cam ' + run.cam.x.toFixed(1) + '  hour ' + sc.hourNow().toFixed(2) +
    '  sky lum ' + sc.skyLum().toFixed(0) + '/' + G.gfx.sprites.CEILING.toFixed(0) + '\n' +
    'boat x ' + b.x.toFixed(1) + '  vx ' + b.vx.toFixed(2) + '  stopped ' + (b.stopped ? 'Y' : 'n') +
    '  facing ' + (b.facing > 0 ? 'R' : 'L') + '  dog ' + run.dog.pose;
});
