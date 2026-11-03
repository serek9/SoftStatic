var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// On the ice (Phase 81, PLAN_WINTER.md 2.3). One path with an ice mode, not a copy: the
// sailing scene, the cast, the lure, the fight and the camera are the open water's, and where
// a water has `ice` they ask this module instead:
//   - the vehicle: the boat is drawn as the Snow Machine with the dog in a box sled behind
//     (js/scene/boat.js, b.ice), faster and without the drift, the wake or the ripples;
//   - drilling: stopped with no hole under the rod tip, the action key drills one (a hand
//     auger, DRILL s: the bit turning, ice chips, then slush welling up); moving stops it.
//     With a hole under the tip the action key drops the lure straight down it (no cast);
//   - the hole: it stays open while he fishes it (he sits on a bucket by it, the sled parked
//     behind). Ridden away from, it skins over in loc.ice.freeze game hours (3 game minutes),
//     drawn as a frosted ring fading; ride back in time and it is open again. Each hole counts
//     its catches (released ones count); at most loc.ice.holes are open (a new one lets the
//     oldest freeze over at once);
//   - under the ice: the cross-section's top is the ice's underside, loc.ice.thick px of pale
//     ice with the light coming down only through the holes (draw); the fish keep under it
//     (fish_ai ctx.ceilPx).
// State lives in run.ice (never saved: the holes are not saved, 2.6). G.vrng only for chips.
G.scene = G.scene || {};
G.scene.ice = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, fx = G.gfx.fx, HI = 2;
  var K = {
    drill: 2,        // s the auger takes
    holeDX: 16,      // px ahead of the boat's centre (along its facing) where the hole is cut
    near: 6,         // px: a hole this close to the drill point is the one he fishes
    leave: 12,       // px: farther than this from the drill point he has left it (it starts to freeze)
    r: 3,            // px: a hole's radius on the ice
    chipEvery: 0.08  // s between ice chips while drilling
  };

  function create(loc) {
    return { on: !!loc.ice, holes: [], fishing: -1, drill: -1, drillX: 0, chipT: 0, at: -1, drilled: 0, frozen: 0, catches: 0, slush: 0 };
  }
  function on(run) { return !!(run && run.ice && run.ice.on); }
  function loc() { return G.scene.sailing.loc(); }
  function drillX(b) { return Math.round(b.x + b.facing * K.holeDX); }

  // The open hole at x (within K.near), or -1.
  function holeAt(run, x) {
    var H = run.ice.holes, best = -1, bd = K.near + 0.01;
    for (var i = 0; i < H.length; i++) { var d = Math.abs(H[i].x - x); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  // Opens a hole at x: the oldest goes if there are already loc.ice.holes.
  function cut(run, x) {
    var I = run.ice, max = loc().ice.holes;
    while (I.holes.length >= max) {
      var old = 0;
      for (var i = 1; i < I.holes.length; i++) if (I.holes[i].n < I.holes[old].n) old = i;
      I.holes.splice(old, 1); I.frozen++;
      if (I.at === old) I.at = -1; else if (I.at > old) I.at--;
    }
    I.drilled++;
    I.holes.push({ x: x, n: I.drilled, catches: 0, left: 0 });
    I.slush = 1.2;
    return I.holes.length - 1;
  }

  // One step before the cast's step. Returns true when it took the action key (drilling or
  // starting one), so the sailing scene does not cast. move: the steering input.
  function step(run, dt, move, canAct) {
    var I = run.ice, b = run.boat, L = loc(), dx = drillX(b), inp = G.core.input;
    if (!I.on) return false;
    // Freezing: every hole he is not at skins over in L.ice.freeze game hours.
    var gh = dt / 60;                                                  // a real second is a game minute
    I.at = -1;
    for (var i = I.holes.length - 1; i >= 0; i--) {
      var h = I.holes[i], here = Math.abs(h.x - dx) <= K.leave && b.stopped;
      if (here || (G.scene.underwater.UNDER[run.fsm] && i === I.fishing)) { h.left = 0; if (Math.abs(h.x - dx) <= K.near) I.at = i; continue; }
      h.left += gh;
      if (h.left >= L.ice.freeze) { I.holes.splice(i, 1); I.frozen++; if (I.fishing === i) I.fishing = -1; else if (I.fishing > i) I.fishing--; }
    }
    if (I.slush > 0) I.slush -= dt;
    // Drilling: moving stops it (never blocking input, §0.14).
    if (I.drill >= 0) {
      if (move !== 0 || !b.stopped) { I.drill = -1; return false; }
      I.drill += dt; I.chipT -= dt;
      if (I.chipT <= 0) { I.chipT = K.chipEvery; fx.emit('snow', I.drillX, L.waterY - 0.5, 2); }
      if (I.drill >= K.drill) {
        I.drill = -1;
        I.at = cut(run, I.drillX);
        fx.emit('snow', I.drillX, L.waterY - 0.5, 8);
        G.audio.engine.cue('slush', I.drillX);
        if (G.core.debug) G.core.debug.log('a hole drilled at x ' + I.drillX);
      }
      return true;
    }
    if (!canAct || run.fsm !== 'sailing' || !b.stopped || !inp.pressed('action')) return false;
    if (holeAt(run, dx) >= 0) return false;                             // a hole: the cast's step drops the lure
    I.drill = 0; I.drillX = dx; I.chipT = 0;
    G.audio.engine.cue('drill', dx);
    return true;
  }

  // Where a drop lands: the hole under the rod tip (the cast's landing x on the ice).
  function dropX(run) {
    var i = holeAt(run, drillX(run.boat));
    return i >= 0 ? run.ice.holes[i].x : drillX(run.boat);
  }
  // The lure went down hole i (the cast released): he fishes it.
  function dropped(run) { run.ice.fishing = holeAt(run, run.cast.x1); }
  // A fish landed through the hole he fishes: it counts (released ones too, as Hole Dozen).
  function landed(run) {
    var I = run.ice, i = holeAt(run, run.cast.x1);
    if (i < 0) i = I.fishing;
    if (i >= 0 && I.holes[i]) I.holes[i].catches++;
    I.catches++;
  }
  // The boat is parked at a hole: he sits on his bucket by it (the sled behind him).
  function parked(run) { return on(run) && (run.ice.at >= 0 || G.scene.underwater.UNDER[run.fsm] === 1 || run.fsm === 'card' || run.ice.drill >= 0); }

  // ---- Drawing -------------------------------------------------------------------------
  // The ice from above, in the band where open water shows its mirror: snow lying on it in
  // drifts, wind-scoured blue patches, and each hole a dark ellipse with a slush rim (a freezing
  // one a frosted ring fading). y: the ice's surface on screen, band: the band's height.
  // The sheet is baked once a water (SHEET_H world px deep, the mirror band's 34 and more):
  // packed snow in two dithered tones, long wind drifts with a lit crest and a shadowed lee,
  // and wind-scoured patches of bare blue ice; with a night grade baked beside it.
  var SHEET_H = 40, sheetCv = {}, sheetNight = {};
  function paintSheet(c, L) {
    var A = G.gfx.paint, w = L.width * HI, h = SHEET_H * HI, rng = new G.core.rng.Rng(L.seed * 31 + 301), x, y, k;
    A.reset();
    A.area(c, 0, 0, w, h, function (xx, yy) {
      var d = Math.sin(xx * 0.011 + Math.sin(xx * 0.003) * 2) * 3 + Math.sin(xx * 0.037) * 1.5, band = (yy + d) % 22;
      if (band < 1.2) return 'snow_lit';                                           // a drift's crest
      if (band < 4) return 'snow_dark';                                            // its lee
      return A.hash2(xx, yy) < 0.13 ? 'snow' : 'snow_hi';
    });
    for (k = 0; k < w / 90; k++) {                                                 // the scoured patches
      var px = rng.int(0, w), py = rng.int(6, h - 6), rx = rng.int(10, 34), ry = rng.int(2, 5);
      for (y = -ry; y <= ry; y++) for (x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
        A.px(c, (y === -ry + 1 || A.hash2(px + x, py + y) < 0.06) ? 'ice_lit' : (y < 0 ? 'ice_hi' : 'ice'), px + x, py + y);
      }
    }
    for (k = 0; k < w / 6; k++) A.px(c, 'snow_lit', rng.int(0, w), rng.int(0, h));   // glints
    A.box(c, 'snow_lit', 0, 0, w, 1);
  }
  function sheet(L) {
    if (!sheetCv[L.id]) {
      sheetCv[L.id] = G.gfx.bake.cached('ice:sheet:' + L.id, function () { return G.gfx.bake.layer(L.width * HI, SHEET_H * HI, function (c) { paintSheet(c, L); }); });
      sheetNight[L.id] = G.gfx.bake.cached('ice:sheet:' + L.id + ':night', function () {
        return G.gfx.bake.layer(L.width * HI, SHEET_H * HI, function (c) {
          c.drawImage(sheetCv[L.id], 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.6; c.fillStyle = P.night_deep; c.fillRect(0, 0, L.width * HI, SHEET_H * HI);
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        });
      });
    }
    return sheetCv[L.id];
  }
  function drawSheet(ctx, run, camPx, y, band, night) {
    var L = loc(), i, sh = run.ice.holes, cv = sheet(L), sx0 = Math.round(camPx * HI), hh = Math.min(band, SHEET_H);
    ctx.drawImage(cv, sx0, 0, 320 * HI, hh * HI, 0, y, 320, hh);
    if (night > 0.02) { ctx.globalAlpha = night * 0.9; ctx.drawImage(sheetNight[L.id], sx0, 0, 320 * HI, hh * HI, 0, y, 320, hh); ctx.globalAlpha = 1; }
    var sc = G.scene.sailing.scenery();
    if (sc && sc.sheet) sc.sheet(ctx, run, camPx, y, band, night);                // Phase 82: the scenery's own marks on the ice
    for (i = 0; i < sh.length; i++) {
      var h = sh[i], sx = h.x - camPx;
      if (sx < -8 || sx > 328) continue;
      var f = h.left / L.ice.freeze;
      ellipse(ctx, sx, y + 1.5, K.r + 1.5, 1.5, f > 0 ? 'snow_lit' : 'snow_hi', 1 - 0.6 * f); // the rim of chips
      ellipse(ctx, sx, y + 1.5, K.r, 1, f > 0 ? 'ice_hi' : 'water_deep', f > 0 ? 1 - f : 1);     // the water (frosting over)
    }
    ctx.globalAlpha = 1;
  }
  function ellipse(ctx, cx, cy, rx, ry, key, a) {
    ctx.fillStyle = P[key]; ctx.globalAlpha = a;
    for (var yy = -ry; yy <= ry; yy += 0.5) { var w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))); ctx.fillRect(Math.round((cx - w) * HI) / HI, cy + yy, Math.round(w * 2 * HI) / HI, 0.5); }
    ctx.globalAlpha = 1;
  }

  // Under the ice: its underside across the cross-section's top (wy: the surface on screen),
  // pale with a darker lower face, cut through at each hole, and the light coming down only
  // through the holes (day: a soft shaft fading with depth; never brighter than the ceiling).
  function drawUnder(ctx, run, camPx, wy, day) {
    var L = loc(), T = L.ice.thick, sh = run.ice.holes, i, x0 = 0;
    var cuts = [];
    for (i = 0; i < sh.length; i++) if (sh[i].left < L.ice.freeze * 0.9) cuts.push(sh[i].x - camPx);
    cuts.sort(function (a, b) { return a - b; });
    function slab(a, b) {
      if (b <= a) return;
      ctx.fillStyle = P.ice; ctx.fillRect(a, wy, b - a, T);
      ctx.fillStyle = P.ice_hi; ctx.fillRect(a, wy, b - a, 1);
      ctx.fillStyle = P.ice_dark; ctx.fillRect(a, wy + T - 1.5, b - a, 1);
      ctx.fillStyle = P.ice_deep; ctx.fillRect(a, wy + T - 0.5, b - a, 0.5);
    }
    for (i = 0; i < cuts.length; i++) { slab(x0, cuts[i] - K.r + 1); x0 = cuts[i] + K.r - 1; }
    slab(x0, 320);
    if (day > 0.05) for (i = 0; i < cuts.length; i++) {
      var reach = Math.min(26, (G.scene.underwater.bottomAt(L, cuts[i] + camPx) - T) / 2);   // down to the bed, not through it
      for (var d = 0; d < reach; d++) {
        ctx.globalAlpha = 0.16 * day * (1 - d / Math.max(1, reach));
        ctx.fillStyle = P.fog_mid;
        var w = 2 + d * 0.35;
        ctx.fillRect(cuts[i] - w, wy + T + d * 2, w * 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  // The auger while drilling: its shaft from his hands down to the ice, the handle turning,
  // and the bit's shavings piling round it. sx, y: the boat's centre and the ice on screen.
  function drawAuger(ctx, run, camPx, y) {
    var I = run.ice;
    if (I.drill < 0) return;
    var x = I.drillX - camPx, top = y - 13, sink = Math.min(4, I.drill / K.drill * 4), ph = Math.floor(I.drill * 8) & 3;
    ctx.fillStyle = P.stone_lit; ctx.fillRect(x - 0.25, top, 0.5, 13 + sink);
    ctx.fillStyle = P.stone_hi; ctx.fillRect(x - 1, y - 1 + sink, 2, 1);                      // the bit's flights
    var hw = [3, 1.5, 0.5, 1.5][ph];
    ctx.fillStyle = P.stone; ctx.fillRect(x - hw, top, hw * 2, 0.5);                        // the handle, turning
    ctx.fillStyle = P.rust_hi; ctx.fillRect(x + (ph < 2 ? hw : -hw) - 0.5, top - 0.5, 1, 1);
    ellipse(ctx, x, y - 0.5, 2 + I.drill, 0.75, 'snow_lit', 0.9);                            // the pile of chips
  }

  // The tip-up's flag by the hole a float rig fishes: a cross of sticks over the hole and a
  // flag on a spring, lying down while it waits and standing up on a bite.
  function drawTipUp(ctx, run, camPx, y, up) {
    var x = run.cast.x1 - camPx, k = up ? 1 : 0;
    ctx.fillStyle = P.wood_mid; ctx.fillRect(x - 4, y - 0.5, 8, 0.5);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x + 2.5, y - 1, 0.5, 1);
    if (k) { ctx.fillStyle = P.stone_hi; ctx.fillRect(x + 2.5, y - 9, 0.5, 8); ctx.fillStyle = P.rust_hi; ctx.fillRect(x + 3, y - 9, 3, 2); ctx.fillStyle = P.crimson; ctx.fillRect(x + 3, y - 8, 3, 1); }
    else { ctx.fillStyle = P.stone_hi; ctx.fillRect(x + 2.5, y - 1.5, 6, 0.5); ctx.fillStyle = P.rust; ctx.fillRect(x + 7, y - 2.5, 2, 1); }
  }

  // dbg.ice(): the holes (x, catches, freezing 0..1 of the way to skinning over), the one he is
  // at and the one he fishes, the drill, and the totals.
  function info(run) {
    if (!on(run)) return null;
    var I = run.ice, L = loc();
    return {
      holes: I.holes.map(function (h) { return { x: h.x, catches: h.catches, freezing: +(h.left / L.ice.freeze).toFixed(3), n: h.n }; }),
      at: I.at, fishing: I.fishing === undefined ? -1 : I.fishing, drill: I.drill >= 0 ? +(I.drill / K.drill).toFixed(2) : -1,
      drillX: drillX(run.boat), drilled: I.drilled, frozen: I.frozen, catches: I.catches, max: L.ice.holes, freezeGameMin: L.ice.freeze * 60
    };
  }
  function debugLine(run) {
    if (!on(run)) return '';
    var I = run.ice;
    return 'ice holes ' + I.holes.length + '/' + loc().ice.holes + '  at ' + I.at + '  drill ' + (I.drill >= 0 ? (I.drill / K.drill).toFixed(2) : '-') + '  drilled ' + I.drilled + '  frozen ' + I.frozen + '  catches ' + I.catches +
      (I.holes.length ? '  [' + I.holes.map(function (h) { return h.x + ':' + h.catches + (h.left > 0 ? '~' + (h.left / loc().ice.freeze).toFixed(1) : ''); }).join(' ') + ']' : '');
  }

  return { K: K, sheet: sheet, create: create, on: on, step: step, holeAt: holeAt, dropX: dropX, dropped: dropped, landed: landed, parked: parked, drillX: drillX, cut: cut,
    drawSheet: drawSheet, drawUnder: drawUnder, drawAuger: drawAuger, drawTipUp: drawTipUp, info: info, debugLine: debugLine };
})();

if (G.core.debug) G.core.debug.addLine(function () { var r = G.state.run; return r && r.ice && r.ice.on ? G.scene.ice.debugLine(r) : ''; });
