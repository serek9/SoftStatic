var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Back Pond's scenery (Phase 83, PLAN_WINTER.md 2.4): the module 'pond'. Landmark painters
// bake once in layer px (HI per world px); the live parts draw from the clock, the save and
// hashes only, and change nothing.
//   backwall: the cabin's back wall over the dock, log courses under the eave, two windows
//     (lit at night, live) and the back door at the top of the dock's steps
//   stream: the rock lip at the west end the stream comes in over; while it is jammed (a
//     tangle of branches round an old tyre, live) no water comes over it; cleared, it runs
//   surface: the murk over the water, from the pond's state (G.scene.pond.murk(): 1 brown and
//     still, 0 the clear teal of a spring-fed pond), and the stream's foam where it falls in
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var LOG = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi'];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function h01(a, b) { return (S.hash(a, b) & 1023) / 1023; }

  // Where the cabin's windows are (layer px from the wall's x): [dx, w, h] over the deck.
  var WIN = [[-30, 12, 10], [6, 12, 10]], WALL_H = 46, DOOR_DX = -10;

  // ---- Painters (layer px) ---------------------------------------------------------------------

  // The cabin's back wall: horizontal log courses with chinking between them and log ends at
  // the corner, a shingled eave along the top, two windows with their frames and sills, and the
  // back door (planks, a latch) at the top of three steps down to the dock.
  function backwall(ctx, x, wy, rng, lm) {
    var half = (lm.half || 24) * HI, x0 = x - half, x1 = x + half, base = wy - 14, top = base - WALL_H, X, y, i;
    for (y = top; y < base; y++) {
      var c = (y - top) % 7, k = c === 0 ? 'outline' : (c === 1 ? 'wood_mid' : (c < 5 ? 'wood' : 'wood_dark'));
      for (X = x0; X < x1; X++) A.px(ctx, (c > 1 && c < 5 && S.hash(X >> 3, y) % 9 === 0) ? 'wood_dark' : k, X, y);
    }
    for (y = top; y < base; y += 7) { A.blob(ctx, x0 + 1, y + 3, 3, 3, LOG, { rim: 0.3 }); A.px(ctx, 'wood_deep', x0 + 1, y + 3); } // the log ends
    for (X = x0 - 6; X < x1 + 4; X++) {                                                       // the eave
      var e = (X - x0 + 6) % 5;
      A.box(ctx, e === 0 ? 'outline' : (e < 3 ? 'stone_dark' : 'stone'), X, top - 7, 1, 7);
      A.px(ctx, 'stone_hi', X, top - 7);
    }
    A.box(ctx, 'outline', x0 - 6, top, x1 - x0 + 10, 1);
    for (i = 0; i < WIN.length; i++) {
      var wx = x + WIN[i][0], ww = WIN[i][1], wh = WIN[i][2], wt = top + 10;
      A.slab(ctx, wx - 2, wt - 2, ww + 4, wh + 4, ['wood_deep', 'wood_dark', 'wood_mid', 'wood_hi']);
      A.box(ctx, 'night_deep', wx, wt, ww, wh);
      A.box(ctx, 'wood_mid', wx + (ww >> 1), wt, 1, wh); A.box(ctx, 'wood_mid', wx, wt + (wh >> 1), ww, 1);
      A.box(ctx, 'wood_hi', wx - 3, wt + wh + 2, ww + 6, 2);                                // the sill
    }
    var dx = x + DOOR_DX, dh = 26;                                                            // the back door
    A.slab(ctx, dx - 2, base - dh - 2, 14, dh + 2, ['wood_deep', 'wood_dark', 'wood', 'wood_mid']);
    for (X = dx; X < dx + 10; X++) A.box(ctx, (X - dx) % 3 === 0 ? 'wood_deep' : ((X - dx) % 3 === 1 ? 'umber' : 'umber_hi'), X, base - dh, 1, dh);
    A.px(ctx, 'brass_hi', dx + 8, base - 13);
    for (i = 0; i < 3; i++) A.slab(ctx, dx - 4 - i * 4, base + i * 4 - 2, 18 + i * 4, 3, ['wood_dark', 'wood', 'wood_mid']); // the steps
    return [x0 - 6, x1 + 4];
  }

  // The stream's lip: a low wall of rounded stones at the west end with a notch in the middle
  // where the water comes over (lm.half world px either side, lm.h high), moss on the stones and
  // a wet dark band down the notch's face.
  function stream(ctx, x, wy, rng, lm) {
    var half = (lm.half || 18) * HI, h = (lm.h || 9) * HI, i;
    for (i = 0; i < 26; i++) {
      var sx = x - half + rng.int(0, half * 2), f = 1 - Math.abs(sx - x) / half, notch = Math.abs(sx - x) < 7;
      var sh = Math.max(3, Math.round((notch ? h * 0.45 : h) * (0.5 + 0.5 * f) * rng.range(0.6, 1))), rr = rng.int(4, 8);
      A.blob(ctx, sx, wy - sh + rr * 0.5, rr, Math.max(2, sh * 0.6), STONES, { rim: 0.25, bias: -0.2 });
      if (rng.next() < 0.6) A.box(ctx, 'moss', sx - (rr >> 1), wy - sh - 1, rr, 1);
    }
    A.box(ctx, 'stone_dark', x - 6, wy - Math.round(h * 0.45), 12, Math.round(h * 0.45));
    A.box(ctx, 'ink', x - 5, wy - Math.round(h * 0.45) + 2, 10, 1);
    return [x - half, x + half];
  }

  // ---- The pond's state --------------------------------------------------------------------------

  // The stream runs once cleared (Phase 84: save.pond.stream); the murk, 1 brown to 0 clear.
  function pondSave() { return (G.state.save && G.state.save.pond) || null; }
  function streamOpen() { var p = pondSave(); return !!(p && p.stream); }
  function murk() {
    var p = pondSave();
    if (!p || !G.sim.pond) return 1;
    return G.sim.pond.murk(p, G.state.save.clock);
  }

  // ---- Live parts ------------------------------------------------------------------------------

  // Over the landmarks: the windows lit at night (the cabin's lamps; only from the stove's stage
  // up), the jam in the stream's notch, or the water coming over it.
  function afterLayer(c, id, ox, oy, run, loc) {
    var L = null, i, m;
    for (i = 0; i < loc.layers.length; i++) if (loc.layers[i].id === id && loc.layers[i].kind === 'landmarks') L = loc.layers[i];
    if (!L) return;
    var n = G.scene.sailing.light(G.state.save.clock || 0).night, wy = loc.waterY - oy, t = run.boat ? run.boat.t : 0;
    for (i = 0; i < loc.landmarks.length; i++) {
      m = loc.landmarks[i];
      if (m.kind === 'backwall' && n > 0.08 && (G.state.save.cabinLevel || 0) >= 1) {
        var top = wy - (14 + WALL_H) / HI;
        for (var w = 0; w < WIN.length; w++) {
          var sx = m.x + WIN[w][0] / HI - ox, sy = top + 10 / HI, ww = WIN[w][1] / HI, wh = WIN[w][2] / HI;
          if (sx < -10 || sx > 330) continue;
          var fl = 0.88 + 0.12 * ((S.hash(w, Math.floor(t * 2)) & 3) / 3);
          c.globalAlpha = 0.16 * n; c.fillStyle = P.lamp_glow; c.fillRect(sx - 2, sy - 2, ww + 4, wh + 4);
          c.globalAlpha = 0.75 * n * fl; c.fillRect(sx, sy, ww, wh);
          c.globalAlpha = 0.9 * n; c.fillStyle = P.wood_dark; c.fillRect(sx + ww / 2 - 0.25, sy, 0.5, wh); c.fillRect(sx, sy + wh / 2 - 0.25, ww, 0.5);
        }
        c.globalAlpha = 1;
      }
      if (m.kind === 'stream') {
        var nx = m.x - ox, ny = wy - (m.h || 9) * 0.45;
        if (nx < -30 || nx > 350) continue;
        if (!streamOpen()) drawJam(c, nx, ny);
        else {
          c.fillStyle = P.water_hi;
          for (var k = 0; k < 6; k++) {
            var ph = (t * 1.6 + k * 0.37) % 1, kx = nx - 2.5 + k;
            c.globalAlpha = 0.55; c.fillRect(kx, ny - 0.5, 0.5, wy - ny + 0.5);
            c.globalAlpha = 0.8; c.fillStyle = P.water_foam; c.fillRect(kx, ny + (wy - ny) * ph, 0.5, 1); c.fillStyle = P.water_hi;
          }
          c.globalAlpha = 1;
        }
      }
    }
  }
  // The jam: branches crossed over the notch, an old tyre wedged among them, leaves caught in it.
  function drawJam(c, x, y) {
    c.fillStyle = P.wood_dark;
    c.fillRect(x - 6, y - 1, 12, 1); c.fillRect(x - 5, y - 2.5, 4, 0.5); c.fillRect(x + 1, y - 3, 6, 0.5);
    c.fillStyle = P.wood_deep;
    for (var i = 0; i < 5; i++) c.fillRect(x - 6 + i * 3, y - 3 + (i & 1), 0.5, 3);
    c.fillStyle = P.ink; c.fillRect(x - 3, y - 4, 5, 4);                                       // the tyre
    c.fillStyle = P.stone_dark; c.fillRect(x - 2.5, y - 3.5, 4, 0.5); c.fillRect(x - 3, y - 2.5, 0.5, 1.5);
    c.fillStyle = P.night_deep; c.fillRect(x - 1.5, y - 2.5, 2, 1.5);
    c.fillStyle = P.leaf_gold; c.fillRect(x + 3, y - 1.5, 1, 0.5); c.fillRect(x - 5, y - 1.5, 0.5, 0.5);
    c.fillStyle = P.moss_dark; c.fillRect(x + 1.5, y - 0.5, 2, 0.5);
  }

  // The murk over the water (the mirror band and the cross-section alike): brown and still at
  // first, gone once the pond has cleared; and the stream's foam spreading where it falls in.
  function surface(c, run, loc) {
    var camPx = run.cam.x, wyS = loc.waterY - Math.round(run.cam.y * HI) / HI, k = murk();
    if (k > 0.01) { c.globalAlpha = 0.5 * k; c.fillStyle = P.umber_dark; c.fillRect(0, wyS + 0.5, 320, 200); c.globalAlpha = 0.18 * k; c.fillStyle = P.moss_dark; c.fillRect(0, wyS + 0.5, 320, 6); }
    else { c.globalAlpha = 0.08; c.fillStyle = P.teal; c.fillRect(0, wyS + 0.5, 320, 200); }
    if (streamOpen()) {
      var sx = loc.pond.stream - camPx, t = run.boat ? run.boat.t : 0;
      if (sx > -30 && sx < 350) {
        c.fillStyle = P.water_foam;
        for (var i = 0; i < 9; i++) { var u = (t * 0.5 + h01(i, 3)) % 1; c.globalAlpha = 0.6 * (1 - u); c.fillRect(sx - 3 + u * (6 + i * 2), wyS + 0.5 + (i % 3) * 0.5, 1.5, 0.5); }
      }
    }
    c.globalAlpha = 1;
  }

  function things(loc) {
    var o = [{ kind: 'reeds and lilies', x: [0, loc.width] }];
    for (var i = 0; i < loc.landmarks.length; i++) {
      var m = loc.landmarks[i];
      if (m.kind === 'backwall') o.push({ kind: 'the cabin\'s back wall', x: [m.x - m.half, loc.width] });
      if (m.kind === 'stream') o.push({ kind: streamOpen() ? 'the stream running' : 'the stream jammed', x: [0, m.x + m.half] });
    }
    return o;
  }

  function debugLine(run) {
    var loc = G.data.locations[run.loc], x = run.boat.x;
    return 'The Back Pond  bed ' + (G.scene.underwater.bottomAt(loc, x) / 4).toFixed(1) + ' m  murk ' + murk().toFixed(2) + '  stream ' + (streamOpen() ? 'running' : 'jammed');
  }

  G.scene.scenery.pond = { landmarks: { backwall: backwall, stream: stream }, afterLayer: afterLayer, surface: surface, things: things, debugLine: debugLine };
  G.scene.pondLook = { murk: murk, streamOpen: streamOpen };
})();
