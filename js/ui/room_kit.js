var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The parts the walk-in rooms are built from (Phase 56), so the bait shop and the cabin share
// one look: planked floors, panelled and log walls, windows onto the lake at the hour, string
// lights, a night mask with the lamps' stepped pools, rugs, and the things a lofi room is full
// of: guitars, an amp, a synth on its stand, a record player and its crate of records, a CRT,
// a boombox and tapes, plants in pots, lamps, mugs and cans. Painted under 8.3 #84 (flat
// keys, light from the top left that steps, deliberate strokes, outlines where things need
// separating). Props are painted on G.gfx.pix grids and baked once; the glass, the bulbs,
// the screens and the spinning record are drawn live from the scene's time (no RNG in draw).
G.ui = G.ui || {};
G.ui.roomKit = (function () {
  var A = G.gfx.paint, X = G.gfx.pix, P = G.gfx.sprites.PALETTE, S = G.gfx.sprites;
  var box = A.box, area = A.area, tone = X.tone;
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  var FLOOR = ['wood_deep', 'wood_dark', 'panel_deep', 'wood', 'panel', 'panel_mid', 'panel_hi'];
  var PANEL = ['panel_deep', 'panel', 'panel_mid', 'panel_hi', 'panel_lit'];
  var LOG = ['outline', 'wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];

  // ---- Floors and walls -------------------------------------------------------------------
  // Boards running across, bh px each, in lengths staggered row by row; each board its own
  // tone, a grain stroke, now and then a knot, nail heads at the joints. light(x, y) -> 0..1
  // is read at each board's middle, so the light steps board by board. o: {ramp, board, wear}.
  function floor(c, x0, y0, w, h, light, o) {
    o = o || {};
    var ramp = o.ramp || FLOOR, bh = o.board || 8;
    area(c, x0, y0, w, h, function (x, y) {
      var fy = y - y0, row = (fy / bh) | 0, ly = fy % bh;
      if (ly === bh - 1) return ramp[0];
      var off = (hash(row, 7) * 300) | 0, len = 48 + ((hash(row, 11) * 5) | 0) * 12;
      var sx = x - x0 + off, seg = (sx / len) | 0, lx = sx % len;
      if (lx === 0) return ramp[0];
      if ((lx === 3 || lx === len - 3) && (ly === 1 || ly === bh - 3)) return 'stone_dark';         // nail heads
      var v = 0.4 + (hash(row * 31 + seg, 3) - 0.5) * 0.3;
      if (lx === 1) v -= 0.12;
      if (ly === 0) v += 0.1;
      if (ly === bh - 2) v -= 0.1;
      var gr = ((hash(row, seg + 50) * (bh - 3)) | 0) + 1;
      if (ly === gr && ((lx + seg * 7) % 19) < 11) v -= 0.11;                                     // grain
      if (hash(row * 13 + seg, 9) < 0.1 && Math.abs(lx - (len >> 1)) < 2 && ly > 1 && ly < bh - 2) v -= 0.24; // a knot
      var mx = x0 + seg * len + (len >> 1) - off;
      if (light) v += light(mx, y0 + row * bh + (bh >> 1)) * 0.5 - 0.2;
      if (o.wear) v += o.wear(mx, y);
      return tone(ramp, v);
    });
  }

  // The north wall's face in 70s panelling, top px above row 0 and row 0 itself: a beam, tall
  // boards with their grooves, a chair rail, a wainscot of wider boards, a baseboard and the
  // shadow at its foot. Water stains run down a few boards. light(x, y) as for floors.
  function panelWall(c, x0, w, top, light) {
    var H = top + 32, rail = top + 2, base = top + 24;
    area(c, x0, 0, w, H, function (x, y) {
      if (y < 7) return y === 6 ? 'outline' : (y === 0 ? 'wood_mid' : tone(WOOD, 0.5 - y * 0.06 + (((x >> 4) + y) % 7 === 0 ? -0.1 : 0)));
      if (y >= H - 2) return y === H - 1 ? 'outline' : 'wood_deep';
      if (y >= base) return y === base ? 'panel_lit' : (y === base + 1 ? 'panel_mid' : (y === H - 3 ? 'wood_deep' : 'panel_deep'));
      if (y >= rail && y < rail + 3) return y === rail ? 'panel_lit' : (y === rail + 1 ? 'panel_mid' : 'outline');
      var b, bx, v, L;
      if (y > rail) { b = ((x - x0) / 12) | 0; bx = (x - x0) % 12; L = light ? light(x0 + b * 12 + 6, y) : 0.5; if (bx === 0) return 'outline'; v = 0.15 + L * 0.45 + (bx === 1 ? 0.1 : 0) + (hash(b, 4) - 0.5) * 0.12; return tone(PANEL, v); }
      b = ((x - x0) / 7) | 0; bx = (x - x0) % 7; L = light ? light(x0 + b * 7 + 3, y) : 0.5;
      if (bx === 0) return 'panel_deep';
      v = 0.22 + (hash(b, 1) - 0.5) * 0.22 + L * 0.5 + (bx === 1 ? 0.12 : 0) - (bx === 6 ? 0.1 : 0);
      if (((y * 3 + b * 17) % 37) < 2 && bx > 1 && bx < 6) v -= 0.12;                               // grain
      if (hash(b, 2) < 0.1 && y < 12 + hash(b, 3) * 40) v -= 0.18;                                    // a water stain
      return tone(PANEL, v);
    });
  }

  // A log wall's face (the cabin): round logs 10 px high, lit along their tops, chinking
  // between them, their ends cut at a joint now and then; the same beam and floor shadow.
  function logWall(c, x0, w, top, light, worn) {
    var H = top + 32;
    area(c, x0, 0, w, H, function (x, y) {
      if (y < 5) return y === 4 ? 'outline' : tone(WOOD, 0.45 - y * 0.08);
      if (y >= H - 2) return y === H - 1 ? 'outline' : 'wood_deep';
      var row = ((y - 5) / 10) | 0, ly = (y - 5) % 10, seg = ((x - x0 + row * 53) / 88) | 0, lx = (x - x0 + row * 53) % 88;
      if (ly === 9) return worn ? 'outline' : (x % 3 ? 'paper_dark' : 'reed');                       // chinking (gaps when derelict)
      if (ly === 8) return 'outline';
      var L = light ? light(x0 + seg * 88 + 44 - row * 53, y) : 0.5;
      if (lx < 2) return lx === 0 ? 'outline' : 'wood_dark';
      var v = 0.15 + L * 0.55 + (hash(row, seg) - 0.5) * 0.14 + (ly === 0 ? 0.08 : (ly === 1 ? 0.2 : (ly >= 6 ? -0.18 : 0)));
      if ((ly === 4 && ((lx + row * 5) % 23) < 13) || (ly === 3 && ((lx + row * 11) % 31) < 6)) v -= 0.14; // bark grain
      return tone(LOG, v);
    });
  }

  // The tops of the side and south walls: dark, a lit edge toward the room, log ends.
  function wallTops(c, W, RH, top, T, doorC, south) {
    var ys = top + 32;
    for (var s = 0; s < 2; s++) {
      var x = s ? W - T : 0;
      area(c, x, 0, T, RH, function (xx, yy) {
        var e = s ? xx - x : x + T - 1 - xx;                                                         // distance from the room's edge
        if (e === 0) return 'outline';
        if (e < 3) return e === 1 ? 'wood_mid' : 'wood_dark';
        return ((yy + (s ? 5 : 0)) % 12) === 0 ? 'outline' : (((yy / 12) | 0) % 2 ? 'wood_deep' : 'panel_deep');
      });
    }
    var y = RH - T;
    area(c, T, y, W - 2 * T, T, function (xx, yy) {
      var e = yy - y;
      if (e === 0) return 'outline';
      if (e < 3) return e === 1 ? 'wood_mid' : 'wood_dark';
      if (yy >= RH - 4) return 'outline';
      return ((xx % 12) === 0) ? 'outline' : (((xx / 12) | 0) % 2 ? 'wood_deep' : 'panel_deep');
    });
    if (doorC >= 0) {                                                                                // the doorway, the night beyond
      var dx = doorC * T;
      box(c, 'outline', dx + 2, y, T - 4, T);
      area(c, dx + 4, y, T - 8, T, function (xx, yy) { var e = yy - y; return e < 6 ? (e < 2 ? 'wood_mid' : 'wood_dark') : (e < 12 ? 'night_blue' : 'night_deep'); });
      box(c, 'fog_dark', dx + 6, y + 14, T - 12, 1);
      box(c, 'wood_lit', dx + 4, y, T - 8, 1);
    }
  }

  // ---- Windows ------------------------------------------------------------------------------
  // The frame (baked): a casing, the dark behind the glass, a deep sill. The glass is live.
  function windowFrame(c, x, y, w, h) {
    A.slab(c, x - 4, y - 4, w + 8, h + 8, WOOD);
    box(c, 'outline', x - 1, y - 1, w + 2, h + 2);
    box(c, 'night_deep', x, y, w, h);
    A.slab(c, x - 7, y + h + 3, w + 14, 5, WOOD); box(c, 'outline', x - 7, y + h + 8, w + 14, 1);
  }
  // In front of the glass (baked into the overlay): the mullions, a highlight on the casing.
  function windowFront(c, x, y, w, h, cross) {
    box(c, 'wood_mid', x + (w >> 1) - 1, y, 3, h); box(c, 'wood_hi', x + (w >> 1) - 1, y, 1, h);
    if (cross) { box(c, 'wood_mid', x, y + (h >> 1) - 1, w, 3); box(c, 'wood_hi', x, y + (h >> 1) - 1, w, 1); }
    box(c, 'outline', x + (w >> 1) + 1, y, 1, h);
  }
  // What the glass shows, baked once per size: far hills, the far shore's pines, transparent
  // where the sky and water go.
  var views = {};
  function view(w, h) {
    var key = w + 'x' + h;
    if (views[key]) return views[key];
    return (views[key] = G.gfx.bake.layer(w, h, function (c) {
      var shore = Math.round(h * 0.66);
      area(c, 0, 0, w, shore + 1, function (x, y) {
        var hill = h * 0.38 + Math.sin(x * 0.09 + 1.3) * h * 0.08 + Math.sin(x * 0.23) * 2;
        var pine = shore - 3 - Math.abs(((x * 7) % 9) - 4) * 1.4 - (hash(x >> 2, 3) * 4 | 0);
        if (y >= pine) return y >= shore - 1 ? 'pine_dark' : (y < pine + 2 && x % 3 === 0 ? 'pine_mid' : 'pine_dark');
        if (y >= hill) return y < hill + 2 ? 'mount_mid' : 'mount_far';
        return '';
      });
    }));
  }
  // The glass at the hour: the sky in the lake's own keys (sailing.skyColor) in bands, the far
  // hills and pines, the water with the sky in it, the fog, rain on the glass, lightning.
  // env: {hour, fog, rain, flash}. fig: draw a pale figure on the far shore (0..1 alpha).
  var skyKey = -1, skyCss = [], skyOut = [0, 0, 0], NB = 8;
  for (var i0 = 0; i0 < NB; i0++) skyCss.push('');
  function refreshSky(hour) {
    var k = Math.floor(hour * 20);
    if (k === skyKey) return;
    skyKey = k;
    for (var i = 0; i < NB; i++) { G.scene.sailing.skyColor(hour, i / NB * 0.9, skyOut); skyCss[i] = 'rgb(' + skyOut[0] + ',' + skyOut[1] + ',' + skyOut[2] + ')'; }
  }
  function glass(ctx, x, y, w, h, env, t, fig) {
    refreshSky(env.hour);
    var shore = Math.round(h * 0.66), bh = Math.ceil(shore / NB), i;
    for (i = 0; i < NB; i++) { ctx.fillStyle = skyCss[i]; ctx.fillRect(x, y + i * bh, w, Math.min(bh, shore - i * bh)); }
    if (env.night > 0.5) { ctx.fillStyle = P.fog_light; for (i = 0; i < 5; i++) ctx.fillRect(x + (i * 23 + 7) % w, y + (i * 11 + 3) % (shore >> 1), 1, 1); } // stars
    ctx.drawImage(view(w, h), x, y);
    if (fig > 0) {                                                                               // someone on the far shore
      ctx.globalAlpha = fig * 0.9; ctx.fillStyle = P.fog_mid;
      var fx = x + (w * 0.7 | 0), fy = y + shore - 9;
      ctx.fillRect(fx, fy, 2, 2); ctx.fillRect(fx - 1, fy + 2, 4, 6); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = P.water_deep; ctx.fillRect(x, y + shore, w, h - shore);
    ctx.fillStyle = skyCss[NB - 2]; ctx.globalAlpha = 0.4;
    for (i = 0; i < 3; i++) { var u = ((t * 0.08 + i * 0.37) % 1); ctx.fillRect(x + Math.round(u * (w - 12)), y + shore + 2 + i * 3, 10 - i * 2, 1); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.water_mid; ctx.fillRect(x, y + shore, w, 1);
    if (env.fog > 0) { ctx.globalAlpha = Math.min(0.6, env.fog * 0.5); ctx.fillStyle = P.fog_mid; ctx.fillRect(x, y + (h * 0.45 | 0), w, (h * 0.35) | 0); ctx.globalAlpha = 1; }
    if (env.rain > 0.05) {
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.45;
      var n = Math.round(env.rain * w / 6);
      for (i = 0; i < n; i++) { var v = (t * (0.5 + (i % 5) * 0.11) + i * 0.29) % 1; ctx.fillRect(x + (i * 7 + 3) % w, y + Math.floor(v * (h - 3)), 1, 3); }
      ctx.globalAlpha = 1;
    }
    if (env.flash > 0) { ctx.globalAlpha = 0.5 * env.flash; ctx.fillStyle = P.fog_light; ctx.fillRect(x, y, w, shore); ctx.globalAlpha = 1; }
  }

  // ---- String lights ------------------------------------------------------------------------
  // A cable sagging between hooks along the beam (baked), and its bulbs (live), each a warm
  // key that breathes slowly; at night each throws a small two-step glow. Returns the bulbs.
  var BULBS = ['mustard_lit', 'neon_pink_hi', 'crt_glow', 'orange_lit', 'lamp_glow'];
  function lightCable(c, x0, x1, y, span, sag) {
    var pts = [];
    for (var x = x0; x <= x1; x++) {
      var u = ((x - x0) % span) / span, yy = Math.round(y + Math.sin(u * Math.PI) * sag);
      A.px(c, 'outline', x, yy);
      if ((x - x0) % span === 0) { box(c, 'stone_hi', x, y - 1, 1, 2); }
      if ((x - x0) % 9 === 4) pts.push([x, yy + 1]);
    }
    return pts;
  }
  function bulbs(ctx, pts, t, night) {
    for (var i = 0; i < pts.length; i++) {
      var b = pts[i], k = BULBS[i % BULBS.length], on = 0.6 + 0.4 * Math.sin(t * 0.7 + i * 1.7);
      if (night > 0.2) { ctx.globalAlpha = 0.18 * night * on; ctx.fillStyle = P[k]; ctx.fillRect(b[0] - 2, b[1] - 1, 5, 5); ctx.globalAlpha = 1; }
      ctx.fillStyle = P[on > 0.75 || night < 0.2 ? k : S.shift(k, -1)]; ctx.fillRect(b[0], b[1], 1, 2);
    }
  }

  // A lamp's glow at night: three nested rounded steps of one key at falling alpha (never a
  // box), r its radius, a its strength.
  function glow(ctx, x, y, r, key, a) {
    ctx.fillStyle = P[key];
    for (var s = 0; s < 3; s++) {
      var rr = Math.round(r * (1 - s * 0.3)), q = Math.round(rr * 0.55);
      ctx.globalAlpha = a * (0.5 + s * 0.25);
      ctx.fillRect(x - rr, y - q, rr * 2, q * 2); ctx.fillRect(x - q, y - rr, q * 2, rr * 2);
      ctx.fillRect(x - Math.round(rr * 0.85), y - Math.round(rr * 0.85 * 0.6), Math.round(rr * 1.7), Math.round(rr * 1.7 * 0.6));
    }
    ctx.globalAlpha = 1;
  }

  // ---- The night mask -----------------------------------------------------------------------
  // Darkness over the room in four flat steps (2 px cells) but for the lamps' pools; clear(x,
  // y) keeps the glass and the lamps themselves. pools: [{x, y, r, sx}] (sx widens a pool).
  function nightMask(W, H, pools, clear) {
    return G.gfx.bake.layer(W, H, function (c) {
      c.fillStyle = P.ink;
      for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) {
        if (clear && clear(x, y)) continue;
        var best = 9;
        for (var i = 0; i < pools.length; i++) { var p = pools[i], dx = (x - p.x) / (p.sx || 1.2), dy = y - p.y; best = Math.min(best, Math.sqrt(dx * dx + dy * dy) / p.r); }
        var a = best < 0.42 ? 0 : (best < 0.68 ? 0.16 : (best < 1 ? 0.32 : 0.5));
        if (!a) continue;
        c.globalAlpha = a; c.fillRect(x, y, 2, 2);
      }
      c.globalAlpha = 1;
    });
  }

  // ---- Rugs ---------------------------------------------------------------------------------
  // A 70s rug: concentric bands in burnt orange, mustard and brown with a fringe at the ends;
  // or a braided oval (style 'oval'); or a woven runner (style 'runner'). Ramps by keys.
  function rug(c, x, y, w, h, style, keys) {
    keys = keys || ['orange_dark', 'orange', 'mustard', 'panel_deep', 'mustard_hi', 'orange_hi'];
    if (style === 'oval') {
      area(c, x, y, w, h, function (xx, yy) {
        var u = (xx - x - w / 2 + 0.5) / (w / 2), v = (yy - y - h / 2 + 0.5) / (h / 2), d = Math.sqrt(u * u + v * v);
        if (d > 1) return '';
        var ring = Math.floor(d * 7), stitch = ((xx + yy * 2) % 4) === 0;
        return stitch ? S.shift(keys[ring % keys.length], -1) : keys[ring % keys.length];
      });
      return;
    }
    area(c, x - 3, y, w + 6, h, function (xx, yy) {
      if (xx < x || xx >= x + w) return (yy - y) % 2 === 0 ? 'paper_dark' : '';                      // the fringe
      var e = Math.min(xx - x, x + w - 1 - xx, (yy - y) * 1.4, (y + h - 1 - yy) * 1.4), band = Math.floor(e / 4);
      if (style === 'runner') band = ((yy - y) / 3 | 0) % 3;
      var k = keys[band % keys.length];
      if (((xx + yy) % 6) === 0 && band > 2) k = keys[(band + 2) % keys.length];                     // a diamond weave in the middle
      return ((xx * 3 + yy) % 7 === 0) ? S.shift(k, -1) : k;
    });
    box(c, 'outline', x, y + h, w, 1);
  }

  // ---- Props on grids ---------------------------------------------------------------------
  // prop(w, h, fn) paints fn(g) on a grid, outlines it, and bakes it.
  function prop(w, h, fn, noOutline) { var g = X.grid(w, h); fn(g); if (!noOutline) g.outline('outline'); return g.canvas(); }
  var SUN = ['sun_dark', 'sun', 'sun_hi', 'sun_lit'];
  // An acoustic guitar standing up (16×42): a sunburst body, its soundhole and bridge, the neck,
  // the headstock and its pegs. finish: 'sun' (sunburst) or 'natural'.
  function guitar(finish) {
    return prop(17, 42, function (g) {
      var B = finish === 'natural' ? ['wood_mid', 'wood_hi', 'panel_lit', 'mustard_lit'] : SUN;
      g.rect('wood_dark', 7, 5, 3, 18); g.rect('wood', 7, 5, 1, 18);                    // the neck
      for (var f = 8; f < 22; f += 3) g.rect('chrome_hi', 7, f, 3, 1);                   // frets
      g.slab(6, 0, 5, 6, ['outline', 'wood_deep', 'wood_dark', 'wood']);                 // the headstock
      for (var p = 0; p < 3; p++) { g.set('chrome_lit', 5, 1 + p * 2); g.set('chrome_lit', 11, 1 + p * 2); }
      g.ell(8.5, 26, 5.2, 4.6, B, { bias: 0.1 }); g.ell(8.5, 34.5, 7.4, 6.4, B, { bias: 0.05 });
      g.over(0, 20, 17, 22, function (x, y, k) { var d = Math.min(x - 1, 15 - x); return d < 2 && B.indexOf(k) >= 0 ? B[0] : ''; }); // the burst's dark rim
      g.ell(8.5, 27.5, 2, 2, 'outline', {}); g.set('wood_deep', 9, 29);                  // the soundhole
      g.rect('outline', 6, 34, 6, 2); g.rect('chrome_hi', 6, 34, 6, 1);                  // the bridge
      g.line('chrome_lit', 8, 5, 8, 34); g.line('chrome_hi', 9, 5, 9, 34);              // strings
      g.rect('wood_deep', 4, 30, 2, 3);                                                  // the pickguard
    });
  }
  // An electric guitar (a worn offset body, 18×42) in a finish ramp.
  function electric(keys) {
    return prop(19, 42, function (g) {
      g.rect('wood_mid', 8, 4, 3, 22); g.rect('wood_hi', 8, 4, 1, 22);
      for (var f = 7; f < 24; f += 3) g.rect('chrome_hi', 8, f, 3, 1);
      g.poly([[7, 0], [12, 0], [12, 5], [8, 5]], 'wood_hi');
      g.poly([[2, 25], [7, 22], [12, 24], [17, 21], [16, 30], [18, 38], [10, 41], [2, 39], [3, 32]], function (x, y) { return tone(keys, 0.75 - (x - 2) / 16 * 0.5 - (y - 21) / 20 * 0.2); });
      g.poly([[4, 30], [9, 27], [12, 33], [7, 38]], 'ivory');                             // the pickguard
      g.rect('outline', 7, 29, 5, 2); g.rect('outline', 7, 33, 5, 2); g.rect('chrome_lit', 6, 36, 7, 1);
      for (var k = 0; k < 2; k++) g.set('chrome_lit', 14, 33 + k * 3);
      g.line('chrome_lit', 9, 4, 9, 36); g.line('chrome_hi', 10, 4, 10, 36);
    });
  }
  // A guitar amp (24×22): black tolex, a cloth grille, chrome knobs, a mustard logo plate.
  function amp() {
    return prop(26, 22, function (g) {
      g.slab(0, 0, 26, 22, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark']);
      g.fill(2, 7, 22, 13, function (x, y) { return (x + y) % 2 ? 'paper_dark' : 'reed_hi'; });
      g.rect('chrome_dark', 2, 6, 22, 1); g.rect('outline', 2, 20, 22, 1);
      for (var k = 0; k < 5; k++) { g.set('chrome_lit', 4 + k * 4, 2); g.set('chrome', 4 + k * 4, 3); }
      g.rect('mustard_hi', 18, 9, 5, 2); g.rect('outline', 12, 0, 6, 1); g.rect('vinyl_hi', 13, -1, 4, 1); // the logo, the handle
      g.set('neon_red', 23, 3);                                                          // the jewel light
    });
  }
  // A synth on an X stand (44×28): wood cheeks, knobs and sliders, ivory and black keys.
  function keyboard() {
    return prop(44, 30, function (g) {
      g.line('chrome', 8, 29, 34, 15); g.line('chrome', 34, 29, 8, 15); g.line('chrome_hi', 9, 29, 35, 15); // the stand
      g.slab(1, 6, 42, 12, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark']);
      g.slab(0, 5, 3, 13, ['wood_deep', 'wood_dark', 'wood_mid', 'wood_hi']); g.slab(41, 5, 3, 13, ['wood_deep', 'wood_dark', 'wood_mid', 'wood_hi']);
      for (var k = 0; k < 8; k++) { g.set(k % 3 ? 'chrome_lit' : 'orange_hi', 5 + k * 3, 8); g.set('chrome', 5 + k * 3, 9); }
      for (k = 0; k < 4; k++) { g.rect('outline', 30 + k * 2, 7, 1, 3); g.set('ivory', 30 + k * 2, 8 - (k % 2)); }
      g.fill(3, 12, 38, 6, function (x, y) { return (x - 3) % 3 === 2 ? 'ivory_dark_line' : (y === 17 ? 'paper_dark' : 'ivory'); });
      g.recolor({ ivory_dark_line: 'stone_hi' });
      for (k = 0; k < 13; k++) { var kx = 4 + k * 3; if (k % 7 === 2 || k % 7 === 6) continue; g.rect('outline', kx + 1, 12, 2, 3); }
    });
  }
  // A record player on a low crate of records (30×26): the platter and tone arm drawn live.
  function recordCrate() {
    return prop(30, 26, function (g) {
      g.slab(0, 10, 30, 16, WOOD);                                                        // the crate
      for (var r = 0; r < 12; r++) g.rect([ 'mustard', 'orange', 'lav', 'crt_hi', 'pink', 'olive_hi', 'ivory', 'brick_hi'][r % 8], 2 + r * 2, 12, 2, 11); // record spines
      g.rect('outline', 1, 23, 28, 1);
      g.slab(1, 0, 28, 10, ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit']); // the player's plinth
      g.rect('vinyl', 3, 1, 18, 8);                                                       // the platter's well
      g.set('chrome_lit', 25, 2); g.set('chrome', 25, 6); g.set('neon_red', 27, 7);
    });
  }
  // The record turning: grooves that shimmer round, the label, the arm resting on it.
  function record(ctx, x, y, t, on) {
    ctx.fillStyle = P.vinyl; ctx.fillRect(x, y, 18, 8);
    ctx.fillStyle = P.vinyl_hi;
    var a = on ? t * 3.5 : 0;
    for (var i = 0; i < 3; i++) { var u = Math.cos(a + i * 2.1), v = Math.sin(a + i * 2.1); ctx.fillRect(x + 9 + Math.round(u * 7), y + 4 + Math.round(v * 3), 2, 1); }
    ctx.fillStyle = P.orange_hi; ctx.fillRect(x + 8, y + 3, 3, 2);
    ctx.fillStyle = P.chrome_lit; ctx.fillRect(x + 15, y + 1, 1, 1); ctx.fillRect(x + 14, y + 2, 1, 1); ctx.fillRect(x + 13, y + 3, 1, 1);
  }
  // A CRT on a low stand (34×32): walnut sides, the screen dark (drawn live), dials, a
  // console and its controller below, VHS tapes. Returns {img, sx, sy, sw, sh} (the screen).
  function crt(withConsole) {
    var img = prop(34, 34, function (g) {
      g.slab(0, 20, 34, 14, WOOD); g.rect('outline', 2, 33, 30, 1);                       // the stand
      g.rect('wood_deep', 3, 23, 28, 9);
      if (withConsole) {
        g.slab(4, 25, 13, 4, ['chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']);      // a grey console
        g.ell(9, 26.5, 1.5, 1, 'chrome_dark', {}); g.set('neon_red', 15, 27);
        g.rect('chrome', 4, 30, 6, 2); g.set('outline', 7, 31);                           // its pad on a wire
        g.line('outline', 10, 29, 14, 30);
      }
      for (var v = 0; v < 4; v++) g.rect(['outline', 'vinyl_hi', 'outline', 'brick'][v], 20 + v * 2, 24, 2, 7); // tapes
      g.slab(2, 0, 30, 21, ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit']); // the set
      g.slab(4, 2, 20, 16, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']);            // the bezel
      for (var k = 0; k < 2; k++) { g.ell(28, 5 + k * 5, 1.6, 1.6, ['outline', 'chrome', 'chrome_hi', 'chrome_lit'], {}); }
      g.fill(26, 13, 4, 5, function (x, y) { return (y % 2) ? 'outline' : 'wood_dark'; }); // the speaker
      g.line('chrome_hi', 12, -1, 8, -6); g.line('chrome_hi', 16, -1, 20, -6);             // rabbit ears
    });
    return { img: img, sx: 6, sy: 4, sw: 16, sh: 12 };
  }
  // The screen: night blue static and a slow scanning band, or a fishing show's blue water
  // with a fish crossing (mode 1). Glow at night is the room mask's business.
  function screen(ctx, x, y, w, h, t, mode) {
    ctx.fillStyle = P.crt_dark; ctx.fillRect(x, y, w, h);
    if (mode === 1) {
      ctx.fillStyle = P.crt; ctx.fillRect(x, y + (h >> 1), w, h - (h >> 1));
      ctx.fillStyle = P.crt_hi; ctx.fillRect(x, y + (h >> 1), w, 1);
      var fx = x + Math.round(((t * 0.15) % 1) * (w + 6)) - 4;
      ctx.fillStyle = P.crt_glow; if (fx >= x && fx + 4 <= x + w) { ctx.fillRect(fx, y + h - 4, 4, 2); ctx.fillRect(fx - 1, y + h - 3, 1, 1); }
    } else {
      for (var i = 0; i < 10; i++) { var u = Math.floor(t * 12 + i * 7.3); ctx.fillStyle = P[i % 3 ? 'crt' : 'crt_hi']; ctx.fillRect(x + (u * 5 + i * 3) % w, y + (u * 3 + i) % h, 2, 1); }
    }
    ctx.fillStyle = P.crt_glow; ctx.globalAlpha = 0.25; ctx.fillRect(x, y + Math.floor((t * 6) % h), w, 1); ctx.globalAlpha = 1;
    ctx.fillStyle = P.crt_glow; ctx.fillRect(x + 1, y + 1, 2, 1);                       // the glass's glint
  }
  // A boombox (28×14) with two speakers and the cassette door; tapes beside it.
  function boombox() {
    return prop(30, 16, function (g) {
      g.rect('chrome', 6, 0, 16, 1); g.set('chrome', 6, 1); g.set('chrome', 21, 1);       // the handle
      g.slab(0, 2, 28, 13, ['outline', 'chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']);
      for (var s = 0; s < 2; s++) { var cx = s ? 22 : 6; g.ell(cx, 9, 4, 4, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark'], {}); g.set('chrome_hi', cx - 1, 8); }
      g.slab(11, 6, 7, 6, ['outline', 'vinyl', 'vinyl_hi', 'lav_hi']); g.rect('ivory', 12, 8, 5, 2); g.set('outline', 13, 9); g.set('outline', 15, 9);
      for (var k = 0; k < 4; k++) g.set(k === 1 ? 'orange_hi' : 'chrome_lit', 11 + k * 2, 4);
      g.rect('neon_red', 24, 4, 2, 1);
    });
  }
  // A potted plant: 'monstera' (big split leaves), 'fern' (fronds), 'snake' (upright blades),
  // 'trail' (a pothos spilling down). Pot: terracotta or mustard ceramic.
  function plant(kind, potKeys) {
    var w = kind === 'snake' ? 16 : 28, h = kind === 'monstera' ? 40 : (kind === 'trail' ? 30 : 30);
    var POT = potKeys || ['brick_dark', 'brick', 'brick_hi', 'orange_hi'], L = ['leaf_deep', 'leaf_dark', 'leaf', 'leaf_hi', 'leaf_lit'];
    return prop(w, h, function (g) {
      var cx = w >> 1, py = h - 10, i;
      if (kind === 'monstera') {
        for (i = 0; i < 7; i++) {
          var a = -2.6 + i * 0.85, lx = cx + Math.cos(a) * 9, ly = py - 14 + Math.sin(a) * 9 - (i % 2) * 4;
          g.line('leaf_dark', cx, py, lx, ly + 3);
          g.ell(lx, ly, 5, 3.6, L, { bias: 0.1 - (i % 3) * 0.1 });
          g.line('leaf_deep', lx - 3, ly + (i % 2 ? 1 : -1), lx + 1, ly);                 // the splits
          g.line(L[4], lx - 2, ly - 1, lx + 2, ly - 2);
        }
      } else if (kind === 'fern') {
        for (i = 0; i < 9; i++) {
          var b = -2.9 + i * 0.36, ex = cx + Math.cos(b) * 13, ey = py - 4 + Math.sin(b) * 13 + 6;
          g.line('leaf_dark', cx, py, ex, ey);
          for (var s = 0.25; s < 1; s += 0.15) { var mx = cx + (ex - cx) * s, my = py + (ey - py) * s; g.set(L[2 + (i % 2)], mx, my - 1); g.set(L[1], mx + 1, my + 1); }
        }
      } else if (kind === 'snake') {
        for (i = 0; i < 5; i++) { var bx = 3 + i * 2.5, top = 2 + (i % 3) * 4; g.cap(bx, top, bx + (i - 2) * 0.6, py, 1.2, L, 0.1); g.line('olive_hi', bx, top + 2, bx, py - 3); }
      } else {
        g.ell(cx, py - 4, 9, 5, L, { bias: 0.1 });
        for (i = 0; i < 6; i++) { var tx = cx - 10 + i * 4, tl = 6 + (i * 5) % 9; g.line('leaf_dark', tx, py - 2, tx + (i % 2 ? 1 : -1), py + tl); for (var q = 2; q < tl; q += 3) g.ell(tx + (i % 2 ? 1 : -1) * q / tl, py + q, 1.6, 1.1, L, { bias: 0.2 }); }
      }
      g.poly([[cx - 6, py], [cx + 6, py], [cx + 5, h - 1], [cx - 5, h - 1]], function (x, y) { return tone(POT, 0.75 - (x - cx + 6) / 12 * 0.6 - (y === py ? -0.2 : 0)); });
      g.rect(POT[0], cx - 6, py + 2, 12, 1); g.rect('wood_deep', cx - 4, py, 8, 1);
    });
  }
  // A floor lamp (12×52) with a pleated shade; a table lamp (green enamel banker's, 16×14).
  function floorLamp() {
    return prop(14, 54, function (g) {
      g.rect('chrome_dark', 6, 14, 2, 36); g.rect('brass_hi', 6, 14, 1, 36);
      g.ell(7, 51, 5, 2, ['rust', 'leaf_gold', 'brass_hi'], {});
      g.poly([[3, 0], [11, 0], [13.5, 14], [0.5, 14]], function (x, y) { return x % 3 === 0 ? 'paper' : (x < 7 ? 'cream' : 'bone'); });
      g.rect('lamp_glow', 2, 14, 10, 1);
    });
  }
  function bankerLamp() {
    return prop(18, 15, function (g) {
      g.ell(9, 13, 6, 1.6, ['rust', 'leaf_gold', 'brass_hi'], {}); g.rect('brass_hi', 9, 6, 1, 7);
      g.ell(9, 5, 8, 3.4, ['moss_dark', 'moss', 'moss_hi', 'moss_lit'], { bias: 0.2 });
      g.rect('lamp_glow', 3, 7, 12, 1); g.set('cream', 8, 7);
    });
  }
  // Small things: a mug, a can, an ashtray, a stack of books, a pile of tapes.
  function mug(g, x, y, k) { g.slab(x, y, 4, 4, [S.shift(k, -1), S.shift(k, -1), k, S.shift(k, 1)]); g.set('outline', x + 4, y + 1); g.set(S.shift(k, -1), x + 4, y + 2); }
  function can(g, x, y, k) { g.rect(k, x, y, 3, 5); g.rect('chrome_lit', x, y, 3, 1); g.rect(S.shift(k, -1), x + 2, y + 1, 1, 4); g.rect('ivory', x, y + 2, 2, 1); }
  function books(g, x, y, n, h) {
    var K = ['orange', 'olive', 'lav', 'brick_hi', 'mustard', 'crt_hi', 'pink', 'panel_hi'];
    for (var i = 0; i < n; i++) { var bh = h - (i * 7 % 4); g.rect(K[(i * 3 + x) % K.length], x + i * 3, y + h - bh, 3, bh); g.rect(S.shift(K[(i * 3 + x) % K.length], -1), x + i * 3 + 2, y + h - bh, 1, bh); g.set('ivory', x + i * 3 + 1, y + h - bh + 2); }
  }

  // ---- Phase 64: things that make a room lived in ---------------------------------------------
  // A lava lamp, drawn live (its wax moves with the scene's time): a chrome cone foot, a
  // tapered glass of violet liquid with three blobs of orange wax that rise, swell, meet and
  // sink, each at its own slow period; a cap. (x, y): the foot's bottom centre. on: lit (the
  // wax moves only while warm). 9 px wide, 24 tall.
  var LAVA_W = [1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2];                 // the glass's half widths, top down
  function lavaLamp(ctx, x, y, t, on, night) {
    var gy = y - 22, r, i;
    ctx.fillStyle = P.outline; ctx.fillRect(x - 2, gy - 3, 5, 1);
    ctx.fillStyle = P.chrome; ctx.fillRect(x - 2, gy - 2, 5, 2); ctx.fillStyle = P.chrome_lit; ctx.fillRect(x - 2, gy - 2, 1, 1);    // the cap
    for (r = 0; r < 16; r++) {
      var hw = LAVA_W[r];
      ctx.fillStyle = P.outline; ctx.fillRect(x - hw - 1, gy + r, 1, 1); ctx.fillRect(x + hw + 1, gy + r, 1, 1);
      ctx.fillStyle = P[on ? (r > 12 ? 'pink_dark' : 'lav_dark') : 'umber_dark']; ctx.fillRect(x - hw, gy + r, hw * 2 + 1, 1);
    }
    // The wax: three blobs on slow loops; a pool on the bottom that a blob leaves and returns to.
    ctx.fillStyle = P[on ? 'orange_hi' : 'orange_dark'];
    ctx.fillRect(x - 2, gy + 14, 5, 2);
    for (i = 0; i < 3; i++) {
      var ph = on ? (t / (19 + i * 7) + i * 0.37) % 1 : 0.02 + i * 0.01, u = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI);
      var by = Math.round(gy + 14 - u * 12), rr = u > 0.15 && u < 0.85 ? 2 : 1, bx = x + Math.round(Math.sin(t * 0.3 + i * 2.1) * (on ? 1.2 : 0));
      var lim = LAVA_W[Math.max(0, Math.min(15, by - gy))];
      ctx.fillRect(Math.max(x - lim, bx - rr + 1), by - rr + 1, Math.min(rr * 2 - 1, lim * 2 + 1), rr * 2 - 1);
      if (rr === 2) { ctx.fillRect(bx - 1, by - 2, 3, 1); ctx.fillRect(bx - 1, by + 2, 3, 1); }
      if (on) { ctx.fillStyle = P.orange_lit; ctx.fillRect(bx - (rr === 2 ? 1 : 0), by - (rr === 2 ? 1 : 0), 1, 1); ctx.fillStyle = P.orange_hi; }
    }
    ctx.fillStyle = P.lav_hi; if (on) ctx.fillRect(x - 2, gy + 3, 1, 5);                     // the glass's shine
    // The foot: a cone of brushed chrome.
    for (r = 0; r < 6; r++) { var fw = 2 + (r >> 1); ctx.fillStyle = P.outline; ctx.fillRect(x - fw - 1, gy + 16 + r, fw * 2 + 3, 1); ctx.fillStyle = P[r < 2 ? 'chrome_hi' : 'chrome']; ctx.fillRect(x - fw, gy + 16 + r, fw * 2 + 1, 1); ctx.fillStyle = P.chrome_dark; ctx.fillRect(x + fw - 1, gy + 16 + r, 2, 1); }
    if (on && night > 0.15) glow(ctx, x, gy + 8, 13, 'neon_pink', 0.05 * night);
  }

  // A grey games console from the late 90s seen from above at the room's angle (16×10): the
  // disc lid's circle, the open and reset buttons, a power light, two pad ports, a memory card.
  function console90s() {
    return prop(17, 11, function (g) {
      var GR = ['stone', 'stone_hi', 'hair_lit', 'paper_dark', 'paper'];
      g.slab(0, 1, 16, 9, GR); g.rect('stone_hi', 1, 8, 14, 1);
      g.ell(5.5, 4.5, 3.8, 2.8, 'stone', {}); g.ell(5.5, 4.5, 3, 2.1, ['stone_hi', 'hair_lit', 'paper_dark'], { bias: -0.1 });   // the lid in its ring
      g.ell(5.5, 4.5, 1, 0.7, 'stone', {}); g.rect('stone', 1, 1, 14, 1);
      g.ell(11, 3.5, 1, 0.8, 'stone_hi', {}); g.ell(14, 3.5, 1, 0.8, 'stone_hi', {});        // open, reset
      g.set('olive_lit', 12, 6);                                                               // power
      g.rect('stone_dark', 2, 9, 3, 1); g.rect('stone_dark', 10, 9, 3, 1);                     // pad ports
      g.rect('outline', 6, 9, 2, 1); g.set('chrome', 6, 10);                                   // a memory card in its slot
    });
  }
  // Its pad, lying on the floor at the end of its cable (12×7): grips, the cross, four buttons.
  function pad90s() {
    return prop(13, 8, function (g) {
      var GR = ['stone', 'stone_hi', 'hair_lit', 'paper_dark'];
      g.ell(3, 4, 2.6, 3, GR, { bias: 0.05 }); g.ell(9, 4, 2.6, 3, GR, { bias: -0.05 }); g.rect('hair_lit', 3, 2, 7, 3);
      g.rect('stone', 2, 3, 3, 1); g.rect('stone', 3, 2, 1, 3);                                // the cross
      g.set('olive_lit', 9, 2); g.set('neon_red', 10, 3); g.set('crt_glow', 8, 3); g.set('pink_hi', 9, 4); // four buttons
      g.set('stone', 6, 4);
    });
  }
  // The console's screen (the CRT's mode 2): its boot (a dark screen, the four-colour diamond
  // logo growing, the name), then a fishing game in jittering low polygons: a horizon, the
  // water, a boat bobbing, a line, the score. ts: seconds since the set was switched on.
  function console90sScreen(ctx, x, y, w, h, ts) {
    ctx.fillStyle = P.crt_dark; ctx.fillRect(x, y, w, h);
    var cx = x + (w >> 1), cy = y + (h >> 1);
    if (ts < 1) { ctx.fillStyle = P.fog_mid; ctx.fillRect(x, cy, w, 1); return; }           // the tube warming
    if (ts < 5) {
      var g = Math.min(1, (ts - 1) / 1.5), k = Math.max(1, Math.round(3 * g));
      ctx.fillStyle = P.signal_amber; ctx.fillRect(cx - k, cy - k - 1, k, k);
      ctx.fillStyle = P.neon_red; ctx.fillRect(cx, cy - k - 1, k, k);
      ctx.fillStyle = P.olive_lit; ctx.fillRect(cx - k, cy - 1, k, k);
      ctx.fillStyle = P.crt_glow; ctx.fillRect(cx, cy - 1, k, k);
      if (ts > 2.6) { ctx.fillStyle = P.bone; ctx.fillRect(cx - 5, cy + 3, 11, 1); }
      return;
    }
    var j = (Math.floor(ts * 8) & 1);                                                       // the polygons' jitter
    ctx.fillStyle = P.crt; ctx.fillRect(x, y, w, (h >> 1) - 1);
    ctx.fillStyle = P.lav_dark; ctx.fillRect(x, y + (h >> 1) - 2, w, 2);                     // far hills
    ctx.fillStyle = P.water_mid; ctx.fillRect(x, y + (h >> 1), w, h - (h >> 1));
    ctx.fillStyle = P.water_hi; ctx.fillRect(x + ((Math.floor(ts * 3)) % w), y + h - 3, 3, 1);
    var bx = x + 3 + Math.round((Math.sin(ts * 0.4) + 1) * 2), by = y + (h >> 1) - 1 + (Math.floor(ts * 2) & 1);
    ctx.fillStyle = P.rust_hi; ctx.fillRect(bx + j, by, 6, 2); ctx.fillStyle = P.bone; ctx.fillRect(bx + 3, by - 3 + j, 1, 3);
    ctx.fillStyle = P.fog_light; ctx.fillRect(bx + 6, by - 2, 1, 1); ctx.fillRect(bx + 7 + j, by, 1, h - (by - y) - 3);
    ctx.fillStyle = P.mustard_lit; ctx.fillRect(x + w - 5, y + 1, 4, 1);                     // the score
  }

  // A soft reflection on a varnished floor under a light: a stretched, stepped streak that
  // fades down the boards and breaks at their seams. (x, y): where the light meets the floor;
  // w its width; len how far it reaches; board: the boards' height (the seams); a: its alpha.
  function reflect(ctx, x, y, w, len, key, a, board) {
    if (a <= 0.003) return;
    ctx.fillStyle = P[key];
    for (var r = 0; r < len; r += 2) {
      if (board && ((y + r) % board) < 2) continue;
      var u = r / len, ww = Math.max(1, Math.round(w * (1 - u * 0.55)));
      ctx.globalAlpha = a * (1 - u) * (1 - u);
      ctx.fillRect(Math.round(x - ww / 2), y + r, ww, 2);
      if (ww > 4) { ctx.globalAlpha *= 0.6; ctx.fillRect(Math.round(x - ww / 2) - 2, y + r, 2, 2); ctx.fillRect(Math.round(x + ww / 2), y + r, 2, 2); }
    }
    ctx.globalAlpha = 1;
  }
  // The room's lamps caught in a window's glass at night: two warm smudges low on the pane.
  function glassLamps(ctx, x, y, w, h, night, key) {
    if (night < 0.2) return;
    ctx.fillStyle = P[key || 'lamp_glow'];
    ctx.globalAlpha = 0.22 * night; ctx.fillRect(x + Math.round(w * 0.3), y + h - 9, 3, 2); ctx.fillRect(x + Math.round(w * 0.3) + 1, y + h - 10, 1, 4);
    ctx.globalAlpha = 0.12 * night; ctx.fillRect(x + Math.round(w * 0.72), y + h - 7, 2, 2); ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
    ctx.globalAlpha = 1;
  }
  // A curved glare across a CRT's glass (live, so it stays over the picture).
  function glare(ctx, x, y, w, h) {
    ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.28;
    ctx.fillRect(x + 1, y + 2, 1, 3); ctx.fillRect(x + 2, y + 1, 3, 1);
    ctx.globalAlpha = 0.12; ctx.fillRect(x + w - 3, y + h - 3, 2, 1);
    ctx.globalAlpha = 1;
  }

  // A box fan on the floor (22×26), baked without its blades; fanBlades turns them live.
  function boxFan() {
    return prop(22, 26, function (g) {
      g.slab(0, 0, 22, 22, ['outline', 'chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']);
      g.ell(11, 11, 8.5, 8.5, 'outline', {}); g.ell(11, 11, 7.5, 7.5, 'stone_dark', {});
      g.rect('chrome_dark', 4, 22, 3, 3); g.rect('chrome_dark', 15, 22, 3, 3);                 // its feet
      g.slab(16, 17, 4, 3, ['outline', 'stone', 'stone_hi', 'ivory']);                        // the dial
    });
  }
  function fanBlades(ctx, cx, cy, t, on) {
    var a = on ? t * 14 : 0.4, i, k;
    for (i = 0; i < 3; i++) {
      var b = a + i * 2.094;
      for (k = 2; k <= 7; k++) { ctx.fillStyle = P[k > 5 ? 'hair_lit' : 'paper_dark']; ctx.fillRect(Math.round(cx + Math.cos(b) * k - 1), Math.round(cy + Math.sin(b) * k - 1), k > 3 ? 3 : 2, k > 3 ? 2 : 1); }
      if (on) { ctx.globalAlpha = 0.35; ctx.fillStyle = P.stone_hi; for (k = 3; k <= 7; k++) ctx.fillRect(Math.round(cx + Math.cos(b - 0.5) * k), Math.round(cy + Math.sin(b - 0.5) * k), 1, 1); ctx.globalAlpha = 1; } // the blur behind a turning blade
    }
    ctx.fillStyle = P.chrome_hi; ctx.fillRect(cx - 1, cy - 1, 3, 3); ctx.fillStyle = P.outline; ctx.fillRect(cx, cy, 1, 1);
    ctx.fillStyle = P.chrome_dark; for (i = -6; i <= 6; i += 4) ctx.fillRect(cx - 7, cy + i, 15, 1);   // the grille's wires over them
  }
  // A small old fridge (26×38) with magnets, a photo, a list; rusted with its door ajar while derelict.
  function fridge(old) {
    return prop(26, 38, function (g) {
      var B = old ? ['rust_dark', 'rust', 'paper_dark', 'bone'] : ['paper_dark', 'bone', 'ivory', 'cream'];
      g.slab(0, 0, 26, 36, ['outline'].concat(B));
      g.rect(B[0], 1, 12, 24, 1); g.rect('chrome_hi', 21, 4, 2, 6); g.rect('chrome_hi', 21, 15, 2, 9);  // the freezer door, handles
      g.rect('stone_dark', 2, 36, 4, 2); g.rect('stone_dark', 20, 36, 4, 2);
      if (old) { g.fill(1, 20, 12, 14, function (x, y) { return (x * 3 + y * 7) % 11 < 2 ? 'rust_dark' : ''; }); g.rect('outline', 24, 13, 1, 22); return; }
      g.slab(4, 16, 8, 9, ['paper_dark', 'paper', 'bone', 'ivory']); g.rect('water_hi', 5, 18, 6, 3); g.rect('pine_mid', 5, 21, 6, 2); // a photo of the lake
      g.rect('paper', 13, 26, 6, 8); g.rect('stone_hi', 14, 28, 4, 1); g.rect('stone_hi', 14, 30, 3, 1);                                 // a list
      g.set('neon_red', 5, 15); g.set('signal_amber', 15, 25); g.set('olive_lit', 9, 4); g.set('crt_glow', 14, 6); g.set('pink_hi', 4, 7); // magnets
    });
  }
  // A drinks cooler with a glass door (28×52): shelves of cans and bottles behind the glass
  // (lit live), a sign on top.
  function cooler() {
    return prop(28, 52, function (g) {
      g.slab(0, 0, 28, 50, ['outline', 'brick_dark', 'brick', 'brick_hi', 'pink_hi']);
      g.rect('outline', 3, 9, 22, 37);                                                        // the glass door's frame
      g.slab(3, 1, 22, 6, ['outline', 'ivory', 'cream', 'cream']); g.rect('brick', 5, 3, 18, 2); g.rect('ivory', 7, 3, 2, 1); g.rect('ivory', 12, 3, 4, 1); g.rect('ivory', 18, 3, 3, 1);
      g.rect('chrome_hi', 22, 20, 1, 12);                                                     // the handle
      g.rect('stone_dark', 2, 50, 4, 2); g.rect('stone_dark', 22, 50, 4, 2);
    });
  }
  // What is behind the cooler's glass, drawn live: its light, a flicker now and then, the
  // drinks on three shelves.
  var DRINKS = ['brick_hi', 'olive_hi', 'mustard_hi', 'crt_hi', 'orange_hi', 'lav_hi', 'brick_hi', 'teal_hi'];
  function coolerInside(ctx, x, y, t, night) {
    var fl = ((t * 0.5) % 23) < 0.2 && (Math.floor(t * 30) & 1);
    ctx.fillStyle = P[fl ? 'crt_dark' : 'crt']; ctx.fillRect(x, y, 20, 35);
    ctx.fillStyle = P[fl ? 'crt' : 'crt_glow']; ctx.fillRect(x, y, 20, 1);
    for (var s = 0; s < 3; s++) {
      var sy = y + 10 + s * 11;
      ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, sy, 20, 1);
      for (var i = 0; i < 5; i++) { ctx.fillStyle = P[DRINKS[(i + s * 3) % 8]]; ctx.fillRect(x + 1 + i * 4, sy - (s === 1 ? 7 : 5), 3, s === 1 ? 7 : 5); if (s === 1) { ctx.fillRect(x + 2 + i * 4, sy - 9, 1, 2); } }
    }
    ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.3; ctx.fillRect(x + 2, y + 2, 1, 12); ctx.fillRect(x + 3, y + 2, 1, 4); ctx.globalAlpha = 1;
    if (night > 0.2 && !fl) glow(ctx, x + 10, y + 18, 16, 'crt_glow', 0.04 * night);
  }
  // A cat asleep, curled (20×13): an orange tabby nose to tail, its back rising and falling,
  // now and then the tail's tip twitching or an ear flicking. Three frames baked once; the
  // scene's time picks one. (x, y): its bottom left.
  var catArt = [];
  function catFrame(f) {
    if (catArt[f]) return catArt[f];
    return (catArt[f] = prop(20, 13, function (g) {
      var C = ['orange_dark', 'orange', 'orange_hi', 'orange_lit'], up = f === 1 ? 1 : 0;
      g.ell(11, 8 - up * 0.5, 7.5, 4.6 + up * 0.5, C, { bias: 0.1 });                          // the curled body
      g.fill(5, 3, 13, 9, function (x, y, k) { return k && (x + (y >> 1)) % 4 === 0 && y < 10 ? 'orange_dark' : ''; }); // stripes
      g.cap(17, 10, 9, 11.5, 1.3, C, 0.1); g.cap(9, 11.5, 4.5, 10.5, 1.2, C, 0.1);              // the tail round the front
      g.set(f === 2 ? 'orange_lit' : 'orange_dark', f === 2 ? 4 : 5, f === 2 ? 9 : 10);
      g.ell(5, 7.5, 3.4, 3, C, { bias: 0.2 });                                                  // the head, tucked
      g.poly([[2.5, 5.5], [3.2, 2], [5, 4.6]], 'orange'); g.poly([[5.5, 4.6], [7, 2.2 - (f === 2 ? 1 : 0)], [7.8, 5.5]], 'orange_hi'); // the ears
      g.set('pink', 3, 4); g.line('orange_dark', 3, 8, 4, 8); g.line('orange_dark', 6, 8, 7, 8);  // shut eyes
      g.set('pink_hi', 5, 9); g.set('cream', 4, 10); g.set('cream', 6, 10);                    // the nose, the muzzle
    }));
  }
  function cat(ctx, x, y, t, s) {
    var f = (t % 11) < 0.5 || (t % 17) > 16.6 ? 2 : (Math.sin(t * 1.6) > 0 ? 1 : 0);
    s = s || 1;                                                                                 // Phase 117: the shop's cat at 2×
    ctx.drawImage(catFrame(f), x, y - 13 * s, 20 * s, 13 * s);
  }

  return { hash: hash, FLOOR: FLOOR, PANEL: PANEL, WOOD: WOOD, LOG: LOG,
    glow: glow, floor: floor, panelWall: panelWall, logWall: logWall, wallTops: wallTops,
    windowFrame: windowFrame, windowFront: windowFront, glass: glass, lightCable: lightCable, bulbs: bulbs, nightMask: nightMask, rug: rug,
    prop: prop, guitar: guitar, electric: electric, amp: amp, keyboard: keyboard, recordCrate: recordCrate, record: record,
    crt: crt, screen: screen, boombox: boombox, plant: plant, floorLamp: floorLamp, bankerLamp: bankerLamp, mug: mug, can: can, books: books,
    lavaLamp: lavaLamp, console90s: console90s, pad90s: pad90s, console90sScreen: console90sScreen, reflect: reflect, glassLamps: glassLamps, glare: glare,
    boxFan: boxFan, fanBlades: fanBlades, fridge: fridge, cooler: cooler, coolerInside: coolerInside, cat: cat };
})();
