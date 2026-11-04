var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Tamarack Lake's scenery (Phase 82, PLAN_WINTER.md 2.2 and 2.3): a scenery module beside the
// rivers', the lakes' and the seas'. Landmark painters bake once in layer px (HI per world px);
// the live parts draw from the clock and hashes only (G.vrng for the snow's flakes).
//   paint.snowwoods: spruce with snow on every tier and bare winter tamaracks, on snowy ground
//   paint.shanties: other people's fishing shanties far off on the ice (lit windows at night,
//     afterLayer, not graded)
//   landmarks: pier (the landing: a plank ramp down the snowbank onto the ice, a fuel drum, a
//     woodpile; the dock is here as at every water), ridge (the pressure ridge: tilted slabs
//     of ice heaved up across the lake, snow drifted in their lee), falls (the frozen
//     waterfall: icicle columns over a granite step, snow on its top)
//   sheet: on the ice from above, old holes skinned over (frosted rings) and the ridge's
//     blocks where it crosses the near ice
// Weather (sailing.js reads `winter`): snowfall in place of rain and a blizzard in place of the
// thunderstorm: horizontal snow, the far shore lost in white, wind and no thunder.
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var GRANITE = ['ink', 'stone_dark', 'stone', 'stone_hi'], ICE = ['ice_deep', 'ice_dark', 'ice', 'ice_hi', 'ice_lit'];
  var SNOW = ['snow_deep', 'snow_dark', 'snow', 'snow_hi', 'snow_lit'], WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid'];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function h01(a, b) { return (S.hash(a, b) & 1023) / 1023; }

  // ---- Painters (layer px) ---------------------------------------------------------------------

  // A spruce in snow: a narrow spire of drooping tiers, dark under, each tier's top loaded white.
  function snowSpruce(ctx, x, gy, h, rng) {
    var tiers = Math.max(4, Math.round(h / 7)), top = gy - h;
    A.box(ctx, 'pine_dark', x, gy - 6, 1, 6);
    for (var t = 0; t < tiers; t++) {
      var ty = top + Math.round(t * (h - 6) / tiers), w = 1 + Math.round((t + 1) * (h * 0.22) / tiers), th = Math.max(2, Math.round((h - 6) / tiers) + 1);
      for (var r = 0; r < th; r++) {
        var ww = Math.max(1, Math.round(w * (0.55 + 0.45 * r / th)));
        A.box(ctx, 'pine_dark', x - ww, ty + r, ww * 2 + 1, 1);
        if (r === 0 || (r === 1 && ww > 2)) A.box(ctx, r === 0 ? 'snow_hi' : 'snow', x - ww + 1, ty + r, ww * 2 - 1, 1);
      }
      if (rng.next() < 0.5) A.px(ctx, 'snow_lit', x - w, ty + th - 1);
    }
    A.px(ctx, 'snow_lit', x, top);
  }
  // A tamarack in winter: it drops its needles, so a thin grey-brown trunk and short level
  // branches in fine twig clusters, a little snow along them.
  function tamarack(ctx, x, gy, h, rng) {
    var top = gy - h, y;
    for (y = top; y < gy; y++) A.px(ctx, y < top + h * 0.3 ? 'wood_dark' : 'wood', x, y);
    for (y = top + 3; y < gy - 6; y += rng.int(2, 4)) {
      var len = Math.round(2 + (y - top) * 0.22 * rng.range(0.6, 1)), d;
      for (d = -1; d <= 1; d += 2) {
        A.line(ctx, 'wood_dark', x, y, x + d * len, y + 1);
        if ((y + d) % 3 === 0) A.px(ctx, 'snow', x + d * (len - 1), y);
        if (rng.next() < 0.4) A.px(ctx, 'stone', x + d * len, y + 2);
      }
    }
  }
  // The woods on the shore: spruce and tamarack over a snowy floor (L.mix: {spruce, tamarack}),
  // a dark back row, and the snow on the ground sloping to the bank.
  function snowWoods(ctx, L, w, wy, rng) {
    var base = L.base, x, kinds = [];
    A.box(ctx, 'pine_dark', 0, base - 4, w, wy - base + 4);
    for (x = rng.int(0, 4); x < w; x += rng.int(3, 6)) snowSpruce(ctx, x, base, Math.round(L.height * rng.range(0.35, 0.55)), rng);
    for (x = rng.int(0, L.gap[0]); x < w + 10; x += rng.int(L.gap[0], L.gap[1])) {
      var tam = rng.next() < (L.mix.tamarack || 0), hh = Math.round(L.height * rng.range(0.6, 1.15));
      if (tam) tamarack(ctx, x, base + rng.int(0, 3), hh, rng); else snowSpruce(ctx, x, base + rng.int(0, 3), hh, rng);
      var k = tam ? 'tamarack' : 'spruce';
      if (kinds.indexOf(k) < 0) kinds.push(k);
    }
    A.area(ctx, 0, base - 1, w, wy - base + 1, function (X, y) {                     // the snow on the ground
      var g = base - 1 + Math.round(Math.sin(X * 0.02) * 1.5 + Math.sin(X * 0.07) * 0.8);
      if (y < g) return '';
      return y === g ? 'snow_lit' : (A.dither(X, y, (y - base) / (wy - base) * 0.4) ? 'snow' : 'snow_hi');
    });
    return kinds;
  }
  // The shanties far off on the ice (L.at: [x, w world px] each, at the layer's own x): little
  // plywood huts, a stovepipe, a dark window, snow on the roof.
  var SHANTY = ['rust', 'teal', 'wood_mid', 'olive'];
  function shanties(ctx, L, w, wy, rng) {
    for (var i = 0; i < L.at.length; i++) {
      var x = L.at[i][0] * HI, sw = L.at[i][1] * HI, sh = Math.round(sw * 0.8), y0 = wy - L.lift * HI - sh, key = SHANTY[i % SHANTY.length];
      wy -= L.lift * HI;                                                               // they stand out on the far ice, over the near bank
      A.box(ctx, key, x, y0, sw, sh); A.box(ctx, 'ink', x + sw - 1, y0, 1, sh);
      A.box(ctx, 'snow_hi', x - 1, y0 - 2, sw + 2, 2); A.box(ctx, 'snow_lit', x - 1, y0 - 2, sw + 2, 1);
      A.box(ctx, 'ink', x + Math.round(sw * 0.3), y0 + Math.round(sh * 0.3), 3, 3);    // the window (lit at night)
      A.box(ctx, 'stone_dark', x + sw - 4, y0 - 7, 2, 5);                               // the stovepipe
      A.box(ctx, 'snow_dark', x - 3, wy - 1, sw + 6, 1);
      wy += L.lift * HI;
    }
    return ['shanties'];
  }

  // The landing (the dock: lm.x, from lm.from's shore): a plank ramp down the snowbank onto the
  // ice, a red fuel drum, a woodpile under snow, the old tyres along its edge.
  function landing(ctx, x, wy, rng, lm) {
    var right = lm.from === 'right', x0 = right ? x - 40 * HI : 0, x1 = right ? (G.scene.sailing.loc().width) * HI : x + 40 * HI, X;
    if (!right) x0 = Math.max(0, x - 70 * HI);
    for (X = x0; X < x1; X++) {                                                         // the ramp, sloping down to the ice
      var f = right ? (X - x0) / (x1 - x0) : 1 - (X - x0) / (x1 - x0), top = wy - 2 - Math.round(f * 14);
      A.box(ctx, ((X >> 3) & 1) ? 'wood_mid' : 'wood', X, top, 1, 3); A.px(ctx, 'wood_dark', X, top + 3);
      if (((X >> 3) & 7) === 0) A.box(ctx, 'wood_dark', X, top, 1, 3);
      A.box(ctx, 'snow_hi', X, top + 4, 1, wy - top - 4);
      if (S.hash(X, 7) % 5 === 0) A.px(ctx, 'snow_lit', X, top - 1);
    }
    var dx = right ? x + 20 * HI : x - 30 * HI;
    A.slab(ctx, dx, wy - 22, 10, 14, ['rust_dark', 'rust', 'rust_hi']); A.box(ctx, 'snow_lit', dx, wy - 23, 10, 1); A.box(ctx, 'ink', dx, wy - 16, 10, 1); // the fuel drum
    var px = right ? x + 34 * HI : x - 56 * HI;
    for (var i = 0; i < 4; i++) A.blob(ctx, px + i * 7, wy - 9, 4, 3, WOOD, { rim: 0.2 });                              // the woodpile
    A.box(ctx, 'snow_hi', px - 4, wy - 13, 30, 2); A.box(ctx, 'snow_lit', px - 3, wy - 14, 28, 1);
    return [Math.min(x0, px - 6), Math.max(x1, dx + 12)];
  }

  // The pressure ridge: slabs of ice heaved up and tilted across the lake, in a band lm.half
  // world px either side, highest in the middle (lm.h), snow drifted in their lee.
  function ridge(ctx, x, wy, rng, lm) {
    var half = (lm.half || 60) * HI, h = (lm.h || 8) * HI, X = x - half;
    while (X < x + half) {
      var f = 1 - Math.abs(X - x) / half, bw = rng.int(6, 14), bh = Math.max(3, Math.round(h * f * rng.range(0.4, 1))), tilt = rng.range(-0.7, 0.7);
      for (var c = 0; c < bw; c++) {
        var top = Math.round(wy - bh - tilt * (c - bw / 2)), u = c / bw;
        A.box(ctx, ICE[u < 0.2 ? 4 : (u < 0.6 ? 3 : 2)], X + c, top, 1, wy - top);
        A.px(ctx, 'ice_lit', X + c, top);
        if (u > 0.8) A.box(ctx, 'ice_dark', X + c, top + 1, 1, wy - top - 1);
      }
      A.box(ctx, 'snow_hi', X + bw - 1, wy - Math.round(bh * 0.4), rng.int(3, 6), Math.round(bh * 0.4));    // the drift in its lee
      X += bw - rng.int(1, 3);
    }
    return [x - half, x + half];
  }

  // The frozen waterfall: a granite step (lm.h world px over the ice, lm.half either side) with
  // the falls frozen down its face in icicle columns, snow on the rock's top and ledges.
  function falls(ctx, x, wy, rng, lm) {
    var half = (lm.half || 40) * HI, h = (lm.h || 30) * HI, top = [], X, y;
    for (X = x - half; X <= x + half; X++) {
      var t = (X - x) / half, tt = Math.round(wy - h * (1 - 0.35 * t * t) - (S.hash(X, 3) % 3));
      top.push(tt);
      for (y = tt; y < wy; y++) {
        var k = A.dither(X, y, 0.3 + 0.3 * ((y - tt) / (wy - tt))) ? 'stone_dark' : (t > 0.3 ? 'stone_dark' : 'stone');
        if (((y + (X >> 2)) % 13) === 0) k = 'ink';                                    // the bedding
        A.px(ctx, k, X, y);
      }
      A.box(ctx, 'snow_hi', X, tt - 1, 1, 3); A.px(ctx, 'snow_lit', X, tt - 1);
    }
    var fx0 = x - Math.round(half * 0.45), fx1 = x + Math.round(half * 0.3);          // the falls, frozen
    for (X = fx0; X < fx1; X += 1) {
      var col = h01(X, 11), tt2 = top[X - (x - half)], bot = wy - Math.round(col * 4);
      var key = col > 0.75 ? 'ice_lit' : (col > 0.45 ? 'ice_hi' : (col > 0.2 ? 'ice' : 'ice_dark'));
      A.box(ctx, key, X, tt2 + 1, 1, bot - tt2 - 1);
      if (col > 0.85) A.box(ctx, 'fog_light', X, tt2 + 3, 1, Math.round((bot - tt2) * 0.6));
    }
    for (X = fx0 - 6; X < fx1 + 6; X += 2) { var ic = 2 + (S.hash(X, 19) % 6); A.box(ctx, 'ice_hi', X, top[clamp(X - (x - half), 0, top.length - 1)] + 2, 1, ic); } // icicles off the lip
    A.box(ctx, 'snow_hi', fx0 - 8, wy - 3, fx1 - fx0 + 16, 3); A.box(ctx, 'snow_lit', fx0 - 6, wy - 4, fx1 - fx0 + 12, 1); // snow piled at its foot
    return [x - half, x + half];
  }

  // ---- Live parts ------------------------------------------------------------------------------

  // On the ice from above: old holes, skinned over (a frosted ring, by hashes along the reaches),
  // and where the ridge crosses, its blocks' snow in the near band.
  function sheet(c, run, camPx, y, band, night) {
    var loc = G.scene.sailing.loc();
    for (var x = Math.floor(camPx / 37) * 37; x < camPx + 330; x += 37) {
      if (h01(x, 61) > 0.32) continue;
      var sx = x + (S.hash(x, 62) % 20) - camPx, sy = y + 3 + (S.hash(x, 63) % Math.max(1, Math.min(band, 30) - 6));
      c.globalAlpha = 0.55; c.fillStyle = P.snow_lit; c.fillRect(sx - 3, sy, 6, 0.5); c.fillRect(sx - 2, sy + 1.5, 4, 0.5);
      c.fillStyle = P.ice_hi; c.globalAlpha = 0.4; c.fillRect(sx - 2, sy + 0.5, 4, 1);
    }
    for (var i = 0; i < loc.landmarks.length; i++) {
      var m = loc.landmarks[i];
      if (m.kind !== 'ridge') continue;
      for (var X = m.x - m.half; X < m.x + m.half; X += 3) {
        var s = X - camPx; if (s < -4 || s > 324) continue;
        var f = 1 - Math.abs(X - m.x) / m.half, hh = 1 + Math.round(f * 3 * h01(X, 71));
        c.globalAlpha = 0.8; c.fillStyle = P[h01(X, 72) > 0.5 ? 'ice_hi' : 'ice']; c.fillRect(s, y + 1, 2.5, hh);
        c.fillStyle = P.snow_lit; c.fillRect(s, y + 0.5, 2.5, 0.5);
      }
    }
    c.globalAlpha = 1;
  }

  // The shanties' windows at night (over their layer, not graded).
  function afterLayer(c, id, ox, oy, run, loc) {
    var L = null, i;
    for (i = 0; i < loc.layers.length; i++) if (loc.layers[i].id === id && loc.layers[i].kind === 'shanties') L = loc.layers[i];
    if (!L) return;
    var n = G.scene.sailing.light(G.state.save.clock || 0).night;
    if (n < 0.08) return;
    for (i = 0; i < L.at.length; i++) {
      var sw = L.at[i][1], sh = Math.round(sw * HI * 0.8) / HI, sx = L.at[i][0] - ox + Math.round(sw * HI * 0.3) / HI, sy = loc.waterY - L.lift - oy - sh + Math.round(sh * HI * 0.3) / HI;
      if (sx < -6 || sx > 326 || (S.hash(i, 5) & 3) === 0) continue;                  // one in four sits dark
      var fl = 0.85 + 0.15 * ((S.hash(i, Math.floor(G.state.run.boat.t * 3)) & 3) / 3);
      c.globalAlpha = 0.2 * n; c.fillStyle = P.lamp_glow; c.fillRect(sx - 1, sy - 1, 3.5, 3.5);
      c.globalAlpha = 0.85 * n * fl; c.fillRect(sx, sy, 1.5, 1.5);
    }
    c.globalAlpha = 1;
  }

  function things(loc) {
    var o = [{ kind: 'ice', x: [0, loc.width] }, { kind: 'snow drifts', x: [0, loc.width] }, { kind: 'old holes', x: [0, loc.width] }];
    for (var i = 0; i < loc.layers.length; i++) {
      var L = loc.layers[i];
      if (L.kind === 'shanties') for (var j = 0; j < L.at.length; j++) { var wx = L.at[j][0] / L.parallax; o.push({ kind: 'shanty far off', x: [wx - 60, wx + 60] }); }
    }
    return o;
  }

  function debugLine(run) {
    var loc = G.data.locations[run.loc], x = run.boat.x, Rr = loc.reaches, name = '', w = G.scene.sailing.winter ? G.scene.sailing.winter() : null;
    for (var i = 0; i < Rr.length; i++) if (x >= Rr[i].x[0] && x < Rr[i].x[1]) name = Rr[i].name;
    return name + '  bed ' + (G.scene.underwater.bottomAt(loc, x) / 4).toFixed(1) + ' m' + (w ? '  snow ' + w.snow.toFixed(2) + '  blizzard ' + w.blizzard.toFixed(2) + '  flakes ' + w.flakes : '');
  }

  G.scene.scenery.tamarack = {
    winter: true,
    paint: { snowwoods: snowWoods, shanties: shanties },
    landmarks: { pier: landing, ridge: ridge, falls: falls },
    sheet: sheet, afterLayer: afterLayer, things: things, debugLine: debugLine
  };
})();
