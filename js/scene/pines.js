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
    // behind it: spruces and a gold birch on a dark bank (the same draws from rng as ever)
    A.TREES.round(ctx, x + 30, wy - 6, rng.int(70, 82), GOLD, rng);
    for (k = 0; k < 3; k++) A.TREES.spruce(ctx, x + CAB.w + 8 + k * 11, wy - 5, rng.int(70, 96), SPRUCE, rng);
    A.TREES.spruce(ctx, x - 4, wy - 5, rng.int(60, 74), SPRUCE, rng);
    A.TREES.round(ctx, x + CAB.w + 44, wy - 5, rng.int(44, 56), GOLD, rng);
    for (xx = x - 12; xx < x + CAB.w + 60; xx++) {
      var bh = 5 + ((S.hash(xx >> 2, 4) & 3));
      A.box(ctx, 'rockv_dark', xx, wy - bh, 1, bh);
      if ((S.hash(xx >> 1, 5) & 7) === 0) A.px(ctx, 'rockv', xx, wy - bh);           // a stone catching the light
    }
    // the deck on its stilts, out to the left over the water: braced stilts, a beam, planks
    var d0 = x - CAB.left, d1 = x + CAB.w + 4, prev = -1;
    for (xx = d0 + 2; xx < d1; xx += 12) {
      A.box(ctx, 'wood_deep', xx, dy + 3, 2, wy - dy - 3); A.box(ctx, 'wood_dark', xx, dy + 3, 1, wy - dy - 3);
      A.box(ctx, 'wood_dark', xx - 1, dy + 3, 4, 1);                                     // the stilt's cap under the beam
      if (prev >= 0) { A.line(ctx, 'wood_deep', prev + 2, dy + 4, xx - 1, wy - 2); A.line(ctx, 'wood_deep', prev + 2, wy - 2, xx - 1, dy + 4); } // cross bracing
      prev = xx;
    }
    A.box(ctx, 'wood_dark', d0, dy, d1 - d0, 3); A.box(ctx, 'wood_mid', d0, dy, d1 - d0, 1); A.box(ctx, 'wood_deep', d0, dy + 3, d1 - d0, 1);
    for (xx = d0; xx < d1; xx += 5) { A.px(ctx, 'wood_deep', xx, dy + 1); A.px(ctx, (S.hash(xx, 9) & 1) ? 'wood_hi' : 'wood_mid', xx + 2, dy); } // the planks' ends, some lit
    for (xx = d0 + 3; xx < d1; xx += 10) A.px(ctx, 'stone_hi', xx, dy + 2);            // bolt heads on the beam
    for (xx = d0 + 2; xx < x - 18; xx += 16) {                                          // the mooring posts, a rope round one
      A.box(ctx, 'wood_dark', xx, dy - 12, 2, 12); A.box(ctx, 'wood_mid', xx, dy - 12, 1, 12); A.box(ctx, 'wood', xx - 1, dy - 13, 4, 1); A.box(ctx, 'wood_hi', xx - 1, dy - 13, 2, 1);
      if (xx === d0 + 18) { A.box(ctx, 'paper_dark', xx - 1, dy - 7, 4, 1); A.box(ctx, 'paper', xx - 1, dy - 6, 4, 1); A.px(ctx, 'paper_dark', xx + 3, dy - 5); }
    }
    // the deck's rail between the posts and the wall
    var rr0 = x - 18, rr1 = x;
    for (xx = rr0; xx <= rr1; xx += 6) { A.box(ctx, 'wood_dark', xx, dy - 9, 1, 9); A.px(ctx, 'wood_mid', xx, dy - 9); }
    A.box(ctx, 'wood_mid', rr0, dy - 10, rr1 - rr0 + 1, 1); A.box(ctx, 'wood_dark', rr0, dy - 9, rr1 - rr0 + 1, 1);
    // the walls: upright boards, lit along the left, grain and nail rows
    for (xx = 0; xx < CAB.w; xx++) {
      var seam = xx % 5 === 4, kk = xx < 2 ? 'cabin_red_hi' : (seam ? 'cabin_red_dk' : 'cabin_red');
      A.box(ctx, kk, x + xx, top, 1, CAB.h);
      if (!seam && (S.hash(x + xx, 11) & 7) === 0) A.box(ctx, 'cabin_red_dk', x + xx, top + (S.hash(x + xx, 12) & 31), 1, 3);
      if (!seam && (S.hash(x + xx, 13) & 7) === 1) A.box(ctx, 'cabin_red_hi', x + xx, top + 4 + (S.hash(x + xx, 14) & 15), 1, 2);
      if (xx % 5 === 1) { A.px(ctx, 'cabin_red_dk', x + xx, top + 3); A.px(ctx, 'cabin_red_dk', x + xx, dy - 5); } // nail heads at the girts
    }
    A.box(ctx, 'cabin_red_dk', x, dy - 2, CAB.w, 2);
    A.box(ctx, 'wood_mid', x, top + 25, CAB.w, 1); A.box(ctx, 'cabin_red_dk', x, top + 26, CAB.w, 1); // the belt board
    A.box(ctx, 'wood_mid', x, top, 2, CAB.h - 2); A.box(ctx, 'wood_dark', x + CAB.w - 2, top, 2, CAB.h - 2); // corner boards
    // the roof: a gable end, its rafters overhanging, two courses of slate, a lit edge, a fascia
    var peak = x + Math.round(CAB.w * 0.55), rise = 18;
    for (xx = x - 8; xx <= x + CAB.w + 8; xx++) {
      var ry = xx <= peak ? top + 2 - Math.round((xx - (x - 8)) / (peak - (x - 8)) * rise) : top + 2 - Math.round((x + CAB.w + 8 - xx) / (x + CAB.w + 8 - peak) * rise);
      if (xx >= x && xx < x + CAB.w) {
        A.box(ctx, 'cabin_red_dk', xx, ry + 6, 1, Math.max(0, top - ry - 6));           // the gable end
        if ((xx - x) % 3 === 0) A.box(ctx, 'cabin_red', xx, ry + 7, 1, Math.max(0, top - ry - 7)); // its board and batten
      }
      A.box(ctx, 'wood_dark', xx, ry + 4, 1, 2);                                         // the fascia under the slates
      A.box(ctx, 'roof_slate', xx, ry, 1, 4); A.px(ctx, 'roof_slate_hi', xx, ry);
      if (((xx - x) & 3) === 0) A.px(ctx, 'night_ink', xx, ry + 2);                      // the slates' joints
      if (((xx - x + 2) & 3) === 0) A.px(ctx, 'night_ink', xx, ry + 1);
      if ((S.hash(xx, 17) & 15) === 0) A.px(ctx, 'roof_slate_hi', xx, ry + 2);           // a slate catching the light
    }
    A.px(ctx, 'wood_hi', x - 8, top + 3); A.px(ctx, 'wood_hi', x + CAB.w + 8, top + 3);    // the rafter tails
    // the stovepipe: a pipe with a band, a rain cap, and the flashing where it meets the roof
    var sp = peak + 12;
    A.box(ctx, 'stone_dark', sp, top - 17, 3, 11); A.box(ctx, 'stone', sp, top - 17, 1, 11);
    A.box(ctx, 'stone_hi', sp - 1, top - 12, 5, 1);
    A.box(ctx, 'stone_dark', sp - 2, top - 19, 7, 1); A.box(ctx, 'stone_hi', sp - 1, top - 20, 5, 1); A.box(ctx, 'stone_dark', sp, top - 18, 3, 1);
    A.box(ctx, 'stone_hi', sp - 1, top - 7, 5, 1);
    // the windows (lit live): trim, a sill, crossbars; shutters by the two below
    var wins = [[x + 6, top + 12], [x + 40, top + 12], [peak - 3, top - 8]];
    for (k = 0; k < wins.length; k++) {
      var ww = k === 2 ? 6 : 9, wh = k === 2 ? 6 : 11, wx = wins[k][0], wy2 = wins[k][1];
      A.box(ctx, 'stone_hi', wx - 1, wy2 - 1, ww + 2, wh + 2); A.box(ctx, 'stone', wx + ww, wy2, 1, wh + 1);
      A.box(ctx, 'night_ink', wx, wy2, ww, wh);
      A.px(ctx, 'roof_slate', wx + 1, wy2 + 1); A.px(ctx, 'roof_slate', wx + 2, wy2 + 1); A.px(ctx, 'roof_slate', wx + 1, wy2 + 2); // the glass's glint
      A.box(ctx, 'wood_deep', wx + (ww >> 1), wy2, 1, wh); A.box(ctx, 'wood_deep', wx, wy2 + (wh >> 1), ww, 1);
      if (k < 2) {
        A.box(ctx, 'stone_lit', wx - 2, wy2 + wh + 1, ww + 4, 1); A.box(ctx, 'stone_dark', wx - 1, wy2 + wh + 2, ww + 2, 1); // the sill
        for (var sh = -1; sh <= 1; sh += 2) {                                                  // the shutters, slatted
          var sx = sh < 0 ? wx - 5 : wx + ww + 1;
          A.box(ctx, 'cabin_red_dk', sx, wy2 - 1, 4, wh + 2);
          for (y = wy2; y < wy2 + wh; y += 2) A.box(ctx, 'cabin_red_hi', sx + 1, y, 2, 1);
        }
      }
      live.windows.push({ layer: L.id, x: wx, y: wy2, w: ww, h: wh, bars: 1 });
    }
    // the door: trim, planks, a Z brace, a knob, a lamp-lit step
    var dx = x + 21, dt = dy - 24;
    A.box(ctx, 'stone_hi', dx - 1, dt - 1, 14, 25);
    A.box(ctx, 'wood_deep', dx, dt, 12, 24);
    for (xx = 1; xx < 11; xx++) A.box(ctx, xx % 3 === 0 ? 'cabin_red_dk' : 'cabin_red', dx + xx, dt + 1, 1, 23);
    A.box(ctx, 'cabin_red_hi', dx + 1, dt + 3, 10, 1); A.box(ctx, 'cabin_red_hi', dx + 1, dt + 19, 10, 1);
    A.line(ctx, 'cabin_red_hi', dx + 2, dt + 18, dx + 9, dt + 4);
    A.px(ctx, 'brass_hi', dx + 9, dt + 12); A.px(ctx, 'wood_deep', dx + 9, dt + 13);
    A.box(ctx, 'wood_mid', dx - 2, dy - 1, 16, 1);
    // the life ring on the wall, on its peg, with its rope
    var rx = x + 56, ry2 = top + 22;
    for (y = -6; y <= 6; y++) for (xx = -6; xx <= 6; xx++) {
      var rr = Math.sqrt(xx * xx + y * y);
      if (rr > 5.6 || rr < 3) continue;
      var band = Math.abs(xx) < 2 || Math.abs(y) < 2;
      A.px(ctx, band ? (xx + y < 0 ? 'cream' : 'bone') : (xx + y < -2 ? 'crimson' : (rr > 4.8 && xx + y > 2 ? 'cabin_red_dk' : 'blood')), rx + xx, ry2 + y);
    }
    A.px(ctx, 'wood_deep', rx, ry2 - 7); A.px(ctx, 'paper_dark', rx - 4, ry2 + 6); A.px(ctx, 'paper_dark', rx - 3, ry2 + 7); A.px(ctx, 'paper_dark', rx + 3, ry2 + 7);
    // the lamp post on the deck: a footed post, a braced arm, a lantern with cap, cage and glass
    var lx = x - 16;
    A.box(ctx, 'wood_deep', lx, dy - 40, 2, 40); A.box(ctx, 'wood_dark', lx, dy - 40, 1, 40);
    A.box(ctx, 'wood_dark', lx - 1, dy - 3, 4, 3); A.box(ctx, 'wood_mid', lx - 1, dy - 3, 4, 1);
    A.box(ctx, 'wood_deep', lx, dy - 40, 9, 2); A.box(ctx, 'wood_mid', lx, dy - 40, 9, 1);
    A.line(ctx, 'wood_deep', lx + 1, dy - 34, lx + 5, dy - 38);                          // the brace
    A.box(ctx, 'ink', lx + 7, dy - 38, 1, 2);                                              // the hook
    A.box(ctx, 'ink', lx + 5, dy - 36, 5, 1); A.px(ctx, 'stone', lx + 7, dy - 37);         // the cap
    A.box(ctx, 'ink', lx + 5, dy - 35, 1, 4); A.box(ctx, 'ink', lx + 9, dy - 35, 1, 4);    // the cage
    A.box(ctx, 'stone_dark', lx + 6, dy - 35, 3, 4); A.px(ctx, 'fog_mauve', lx + 6, dy - 35); // the glass
    A.box(ctx, 'ink', lx + 5, dy - 31, 5, 1); A.px(ctx, 'ink', lx + 7, dy - 30);
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
      FB.window_(c, wn, ox, oy, 0.9 + 0.1 * Math.sin(t * 4.7 + i * 2));
    }
    for (i = 0; i < live.lamps.length; i++) {                                         // the lantern, a soft round warm halo
      var lm = live.lamps[i];
      if (lm.layer !== id) continue;
      if (h < 0) h = hourNow();
      if (!(h >= 17 || h < 7.5)) continue;
      var a = 0.92 + 0.08 * Math.sin(t * 6.1), LX = lm.x / HI - ox, LY = lm.y / HI - oy;
      FB.halo(c, LX + 0.25, LY + 0.5, 10, 0.8 * a, 'signal_amber');
      c.globalAlpha = a; c.fillStyle = P.signal_amber; c.fillRect(LX - 0.5, LY - 1, 1.5, 2);  // the glass, lit
      c.fillStyle = P.lamp_glow; c.fillRect(LX, LY - 0.5, 0.5, 1.5);
      c.fillStyle = P.cream; c.fillRect(LX, LY, 0.5, 0.5);                  // the flame
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
