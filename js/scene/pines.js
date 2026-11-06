var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Pines' look (the user's second reference, 2026-11-06): a crimson dusk over plum ranges. More
// painters for the Pines' scenery module (js/scene/scenery.js), added to it here:
//   butte     a flat-topped massif under a pelt of small trees, a rose cliff band across its face
//             and a forested skirt going to haze at its foot
//   stiltcabin  a plank cabin on stilts at the water's edge with its deck, a lamp post and its
//             lantern, a life ring on the wall, spruces and a gold birch behind it; the windows
//             and the lantern are live (afterLayer), lit from dusk to morning
// It borrows Fogbound's rounded forested hills (fbhills) and its banded clouds (cloudMask).
// The diner, the traffic light, the drowned road and the owl stay as they were. Layer px are HI
// (2) per world px; afterLayer's c is in world px.
G.scene = G.scene || {};
G.scene.scenery = G.scene.scenery || {};
(function () {
  var S = G.gfx.sprites, P = S.PALETTE, A = G.gfx.paint, HI = 2;
  var M = G.scene.scenery.pines, FB = G.scene.scenery.fogbound;
  var SPRUCE = { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' };
  var GOLD = { dark: 'gold_dk', mid: 'gold', lit: 'gold_lit', trunk: 'wood_dark' };
  var CLIFF = ['butte_cliff_dk', 'butte_cliff', 'butte_cliff_lit'];
  var live = { windows: [], lamps: [] };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function n01(x, y) { return (S.hash(x * 7 + 3, y * 13 + 5) & 1023) / 1023; }

  // ---- butte -----------------------------------------------------------------------------------
  // The crest's height (0..1 of H) across the massif (u 0..1): a forested shoulder on the left, a
  // plateau rising to its rim, then the scarp falling away to the right.
  function crest(u) {
    if (u < 0.3) { var a = u / 0.3; return 0.8 * (1 - (1 - a) * (1 - a)); }
    if (u < 0.72) return 0.8 + 0.2 * (u - 0.3) / 0.42;
    if (u < 0.76) return 1 - 0.05 * (u - 0.72) / 0.04;
    return 0.95 * Math.pow(Math.max(0, 1 - (u - 0.76) / 0.24), 1.5);
  }
  // L: base (the foot's y), haze (key), features [{x, w, h}] (x in layer px, w and h in world px).
  function butte(ctx, L, w, wy, rng) {
    var f = L.features || [], i;
    for (i = 0; i < f.length; i++) massif(ctx, L, f[i], wy, rng);
    return ['butte'];
  }
  function massif(ctx, L, F, wy, rng) {
    var x0 = F.x, W = F.w * HI, H = F.h * HI, foot = L.base, x, y, tip = 0;
    var top = new Int16Array(W + 2), cl0 = 0.28, cl1 = 0.8;
    for (x = 0; x <= W + 1; x++) {
      if (x % 3 === 0) tip = rng.int(0, 3);                                          // tree tips along the crest
      top[x] = Math.round(foot - H * crest(x / W) - (x % 3 === 1 ? tip : tip >> 1));
    }
    var hz = foot - Math.round(H * 0.16), wob = 0;
    for (x = 0; x < W; x++) {
      var u = x / W, X = x0 + x, facing = top[x + 1] - top[Math.max(0, x - 1)], cap = 5 + ((S.hash(X, 3) & 3));
      // the cliff band: deepest mid-face, its foot ragged (scree runs down in places)
      var cu = (u - cl0) / (cl1 - cl0), cliffH = cu > 0 && cu < 1 ? Math.round(H * 0.42 * Math.pow(Math.sin(Math.PI * cu), 0.6) + (S.hash(X >> 1, 9) & 7) - 3) : 0;
      wob = clamp(wob + (n01(X, 1) - 0.5) * 1.6, -5, 5);
      for (y = Math.max(0, top[x]); y < wy; y++) {
        var d = y - top[x], key;
        if (d < cap) key = (facing < 0 && d < 3) || (d < 2 && n01(X, y) < 0.5) ? 'butte_wood_lit' : 'butte_wood';
        else if (d < cap + cliffH) {
          // the face: vertical striations, lit toward its left, a dark seam now and then
          var col = S.hash(X >> 1, 5) & 15, l = (1 - cu) * 0.9 + (col / 15) * 0.5 - (d - cap) / (cliffH + 1) * 0.25;
          key = col === 0 ? CLIFF[0] : (l > 0.75 ? CLIFF[2] : (l > 0.35 ? CLIFF[1] : CLIFF[0]));
          if (d === cap && n01(X, y) < 0.6) key = 'butte_wood_dk';                    // the rim's shadow
        } else key = n01(X, y) < 0.12 ? 'butte_wood' : 'butte_wood_dk';
        if (y >= hz + wob || (y >= hz + wob - 3 && n01(X, y) < (y - hz - wob + 4) / 5)) key = L.haze || 'mtnp_haze';
        A.px(ctx, key, X, y);
      }
    }
    // the pelt: small conifers over the cap and the skirt, a few gold crowns among them
    var count = Math.round(W * 1.3);
    for (i = 0; i < count; i++) {
      x = rng.int(0, W - 1);
      var X2 = x0 + x, u2 = x / W, cu2 = (u2 - cl0) / (cl1 - cl0), ch = cu2 > 0 && cu2 < 1 ? H * 0.42 * Math.pow(Math.sin(Math.PI * cu2), 0.6) : 0;
      var lo = top[x] + (ch > 6 ? Math.round(ch) + 8 : 3), ty = rng.int(lo, Math.max(lo + 1, hz - 2));
      if (rng.next() < 0.3) ty = top[x] + rng.int(3, 7);                              // on the cap
      if (ty >= hz || ty <= top[x] + 2) continue;
      if (ch > 6 && ty > top[x] + 6 && ty < top[x] + ch + 8) continue;                 // not on the cliff
      var gold = rng.next() < 0.14, th = rng.int(3, 6);
      if (gold) { A.box(ctx, 'gold_dk', X2 - 1, ty - 3, 3, 3); A.px(ctx, 'gold', X2 - 1, ty - 3); continue; }
      for (var r = 0; r < th; r++) { var hw = r >> 1; A.box(ctx, r === 0 ? 'butte_wood' : 'butte_wood_dk', X2 - hw, ty - th + r, hw * 2 + 1, 1); }
    }
  }

  // ---- stiltcabin ------------------------------------------------------------------------------
  var CAB = { w: 62, h: 40, deck: 12, left: 74 };
  function stiltcabin(ctx, L, w, wy, rng) {
    var f = L.features || [], i;
    for (i = 0; i < f.length; i++) cabin(ctx, L, f[i].x, wy, rng);
    return ['cabin', 'deck', 'lamp'];
  }
  function cabin(ctx, L, x, wy, rng) {
    var dy = wy - CAB.deck, top = dy - CAB.h, k, xx, y;
    // behind it: spruces and a gold birch on a dark bank
    A.TREES.round(ctx, x + 30, wy - 6, rng.int(70, 82), GOLD, rng);
    for (k = 0; k < 3; k++) A.TREES.spruce(ctx, x + CAB.w + 8 + k * 11, wy - 5, rng.int(70, 96), SPRUCE, rng);
    A.TREES.spruce(ctx, x - 4, wy - 5, rng.int(60, 74), SPRUCE, rng);
    A.TREES.round(ctx, x + CAB.w + 44, wy - 5, rng.int(44, 56), GOLD, rng);
    for (xx = x - 12; xx < x + CAB.w + 60; xx++) { var bh = 5 + ((S.hash(xx >> 2, 4) & 3)); A.box(ctx, 'rockv_dark', xx, wy - bh, 1, bh); }
    // the deck on its stilts, out to the left over the water
    var d0 = x - CAB.left, d1 = x + CAB.w + 4;
    for (xx = d0 + 2; xx < d1; xx += 12) { A.box(ctx, 'wood_deep', xx, dy + 3, 2, wy - dy - 3); A.px(ctx, 'wood_dark', xx, dy + 3); }
    A.box(ctx, 'wood_dark', d0, dy, d1 - d0, 3); A.box(ctx, 'wood_mid', d0, dy, d1 - d0, 1);
    for (xx = d0; xx < d1; xx += 5) A.px(ctx, 'wood_deep', xx, dy + 1);              // the planks' ends
    for (xx = d0 + 2; xx < x - 18; xx += 16) { A.box(ctx, 'wood_dark', xx, dy - 12, 2, 12); A.box(ctx, 'wood_mid', xx, dy - 12, 1, 12); A.box(ctx, 'wood', xx - 1, dy - 13, 4, 1); } // the mooring posts
    // the walls: upright boards, lit along the left
    for (xx = 0; xx < CAB.w; xx++) {
      var seam = xx % 5 === 4, kk = xx < 2 ? 'cabin_red_hi' : (seam ? 'cabin_red_dk' : 'cabin_red');
      A.box(ctx, kk, x + xx, top, 1, CAB.h);
      if (!seam && (S.hash(x + xx, 11) & 7) === 0) A.box(ctx, 'cabin_red_dk', x + xx, top + (S.hash(x + xx, 12) & 31), 1, 3);
    }
    A.box(ctx, 'cabin_red_dk', x, dy - 2, CAB.w, 2);
    // the roof: a gable end, its rafters overhanging, the slate edge lit
    var peak = x + Math.round(CAB.w * 0.55), rise = 18;
    for (xx = x - 8; xx <= x + CAB.w + 8; xx++) {
      var ry = xx <= peak ? top + 2 - Math.round((xx - (x - 8)) / (peak - (x - 8)) * rise) : top + 2 - Math.round((x + CAB.w + 8 - xx) / (x + CAB.w + 8 - peak) * rise);
      if (xx >= x && xx < x + CAB.w) A.box(ctx, 'cabin_red_dk', xx, ry + 4, 1, Math.max(0, top - ry - 4));   // the gable end
      A.box(ctx, 'roof_slate', xx, ry, 1, 4); A.px(ctx, 'roof_slate_hi', xx, ry);
    }
    A.box(ctx, 'stone_dark', peak + 12, top - 16, 4, 9);                               // the stovepipe
    // the windows (lit live), the door, the life ring
    var wins = [[x + 6, top + 12], [x + 40, top + 12], [peak - 3, top - 8]];
    for (k = 0; k < wins.length; k++) {
      var ww = k === 2 ? 6 : 9, wh = k === 2 ? 6 : 11;
      A.box(ctx, 'wood_deep', wins[k][0] - 1, wins[k][1] - 1, ww + 2, wh + 2);
      A.box(ctx, 'night_ink', wins[k][0], wins[k][1], ww, wh);
      live.windows.push({ layer: L.id, x: wins[k][0], y: wins[k][1], w: ww, h: wh });
    }
    A.box(ctx, 'wood_deep', x + 21, dy - 24, 12, 24); A.box(ctx, 'cabin_red_dk', x + 22, dy - 23, 10, 23); A.px(ctx, 'stone_hi', x + 30, dy - 12);
    var rx = x + 56, ry2 = top + 22;
    for (y = -6; y <= 6; y++) for (xx = -6; xx <= 6; xx++) {
      var rr = Math.sqrt(xx * xx + y * y);
      if (rr > 5.6 || rr < 3) continue;
      var band = Math.abs(xx) < 2 || Math.abs(y) < 2;
      A.px(ctx, band ? 'bone' : (xx + y < 0 ? 'crimson' : 'blood'), rx + xx, ry2 + y);
    }
    // the lamp post on the deck, its arm and lantern
    var lx = x - 16;
    A.box(ctx, 'wood_deep', lx, dy - 40, 2, 40); A.box(ctx, 'wood_dark', lx, dy - 40, 1, 40);
    A.box(ctx, 'wood_deep', lx, dy - 40, 9, 2); A.box(ctx, 'ink', lx + 7, dy - 38, 1, 2);
    A.box(ctx, 'ink', lx + 5, dy - 36, 5, 1); A.box(ctx, 'stone_dark', lx + 6, dy - 35, 3, 4); A.box(ctx, 'ink', lx + 5, dy - 31, 5, 1);
    live.lamps.push({ layer: L.id, x: lx + 7, y: dy - 33 });
  }

  // ---- The live parts --------------------------------------------------------------------------
  function hourNow() { return G.sim.clock.wrap(G.state.save.clock || 0); }
  function cabinLights(c, id, ox, oy, run) {
    var t = run.boat ? run.boat.t : 0, h = -1, i;
    for (i = 0; i < live.windows.length; i++) {                                       // the windows, from dusk to morning
      var wn = live.windows[i];
      if (wn.layer !== id) continue;
      if (h < 0) h = hourNow();
      if (!(h >= 17.25 || h < 7.25)) break;
      var fl = 0.9 + 0.1 * Math.sin(t * 4.7 + i * 2), X = wn.x / HI - ox, Y = wn.y / HI - oy, W = wn.w / HI, H = wn.h / HI;
      c.globalAlpha = 0.2 * fl; c.fillStyle = P.lamp_glow; c.fillRect(X - 2, Y - 2, W + 4, H + 4);
      c.globalAlpha = fl; c.fillStyle = P.signal_amber; c.fillRect(X, Y, W, H);
      c.fillStyle = P.lamp_glow; c.fillRect(X + 0.5, Y + 0.5, W - 1, H * 0.45);
      c.fillStyle = P.dusk_amber; c.fillRect(X + W / 2 - 0.25, Y, 0.5, H);             // the mullion
      c.globalAlpha = 1;
    }
    for (i = 0; i < live.lamps.length; i++) {                                         // the lantern, a soft warm halo
      var lm = live.lamps[i];
      if (lm.layer !== id) continue;
      if (h < 0) h = hourNow();
      if (!(h >= 17 || h < 7.5)) continue;
      var a = 0.92 + 0.08 * Math.sin(t * 6.1), LX = lm.x / HI - ox, LY = lm.y / HI - oy;
      c.fillStyle = P.signal_amber;
      c.globalAlpha = 0.07 * a; c.fillRect(LX - 9, LY - 8, 18, 18);
      c.globalAlpha = 0.12 * a; c.fillRect(LX - 5, LY - 4, 10, 10);
      c.globalAlpha = 0.25 * a; c.fillRect(LX - 2.5, LY - 2, 5, 5);
      c.globalAlpha = a; c.fillStyle = P.lamp_glow; c.fillRect(LX - 0.5, LY - 1, 1.5, 2);
      c.globalAlpha = 1;
    }
  }

  M.paint.butte = butte;
  M.paint.stiltcabin = stiltcabin;
  M.paint.fbhills = FB.paint.fbhills;
  M.cloudMask = FB.cloudMask;
  var afterBase = M.afterLayer, lineBase = M.debugLine;
  M.afterLayer = function (c, id, ox, oy, run, loc) { afterBase(c, id, ox, oy, run, loc); cabinLights(c, id, ox, oy, run); };
  M.debugLine = function (run) { return lineBase(run) + '  cabin windows ' + live.windows.length + ' lamps ' + live.lamps.length; };
  M.live = live;
})();
