var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop (9.4, V9, V10.7), drawn at 640×360 (Phase 17). A scene reached from the map.
// The left of the screen is a baked, painted interior: plank walls under a hanging lamp, a
// pegboard of lure packets, mounted trophies, a fog window, and the shopkeeper leaning on the
// counter. The right is the shop panel: a tab per shelf (gear tiers, equipment, bait), the
// selected item large with its practical effect, and the shelf's items as tiles. The
// shopkeeper says one line per visit (data/dialogue.js). Time passes here and unease drains
// (V10.1). Esc or M goes back out on the water.
G.ui = G.ui || {};
G.ui.shop = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, M = G.ui.menu, E = G.sim.economy, A = G.gfx.paint;
  var px = A.px, box = A.box, blob = A.blob, limb = A.limb, tone = A.tone, line = A.line, slab = A.slab, hash = A.hash2, D = A.dither;

  // Shelves (the panel's tabs). kind: a gear kind for economy.buy, or 'bait' with an id.
  var SHELVES = [
    [{ kind: 'rod', icon: 'rod' }, { kind: 'reel', icon: 'reel' }, { kind: 'line', icon: 'line' }],
    [{ kind: 'lantern', icon: 'lantern' }, { kind: 'depthFinder', icon: 'finder' }],
    [{ kind: 'bait', id: 'worm', icon: 'worm' }, { kind: 'bait', id: 'cricket', icon: 'cricket' },
     { kind: 'bait', id: 'minnow', icon: 'minnow' }, { kind: 'bait', id: 'unlabelled', icon: 'jar' }]
  ];
  var TABS = [{ name: 'RODS & REELS', icon: 'rod' }, { name: 'EQUIPMENT', icon: 'lantern' }, { name: 'BAIT', icon: 'worm' }];
  var REVEAL = 260; // px of speech shown per second

  // Panel layout (the right of the screen).
  var PX = 408, PY = 44, PW = 224, PH = 308;
  var TAB_X = 428, TAB_STEP = 64, TAB_W = 56, TAB_Y = 6;
  var TILE = 46, TILE_GAP = 8, GRID_Y = PY + 226;
  var DESC_Y = PY + 116, DESC_W = 208, STATUS_Y = PY + 184, NAME_W = 118;
  // The keeper's face, for the blink and the moving mouth drawn over the baked room.
  var CX = 200, EYE_L = 190, EYE_R = 210, EYE_Y = 102, MOUTH_X = 200, MOUTH_Y = 117;
  var BUBBLE_X = 252, BUBBLE_Y = 14, BUBBLE_W = 140;

  // Ramps, dark to light.
  var WALL = ['ink', 'wood_deep', 'wood_dark', 'wood', 'wood_mid'];
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
  var KNIT = ['ink', 'dusk_violet', 'dusk_plum', 'plum_hi', 'dusk_rose'];
  var SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi', 'skin_lit'];
  var HAIR = ['stone_dark', 'stone', 'stone_hi', 'birch', 'hair_lit'];
  var CANVAS = ['reed', 'reed_hi', 'paper_dark', 'paper', 'bone'];
  var STONE = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var ENAMEL = ['moss_dark', 'moss', 'moss_hi', 'moss_lit'];
  var CUP = ['paper_dark', 'paper', 'bone', 'cream'];
  var RUST = ['rust_dark', 'rust', 'rust_hi', 'flame'];
  var GLOW = ['signal_amber', 'lamp_glow', 'cream'];
  var LINE = ['water_mid', 'water_hi', 'water_foam', 'fog_light'];
  var WORM = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'];
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'];

  // ---- Item icons ---------------------------------------------------------------------------
  // Each is painted for a 32×32 cell scaled by s (1 on the tiles and tabs, 2 in the detail
  // box), so both sizes are painted at their own resolution. Lit from the top left.
  var ICONS = {
    rod: function (c, s) {
      limb(c, 7 * s, 26 * s, 28 * s, 4 * s, 0.7 * s, WOOD, 0.1);
      limb(c, 3 * s, 30 * s, 9 * s, 24 * s, 1.9 * s, CANVAS, 0.1);                 // the cork grip
      box(c, 'stone_hi', 10 * s, 22 * s, 2 * s, 2 * s);                             // reel seat
      blob(c, 13 * s, 25.5 * s, 2.4 * s, 2.4 * s, STONE);
      line(c, 'ink', 13 * s, 25 * s, 16 * s, 26 * s);
      for (var g = 0; g < 3; g++) px(c, 'stone_lit', ((12 + g * 5) * s) | 0, ((20 - g * 4.3) * s) | 0);
      line(c, 'fog_light', 28 * s, 4 * s, 29 * s, 5 * s); line(c, 'fog_light', 29 * s, 5 * s, 29 * s, 19 * s);
      line(c, 'stone_lit', 29 * s, 19 * s, 29 * s, 23 * s); line(c, 'stone_lit', 29 * s, 23 * s, 27 * s, 23 * s); line(c, 'stone_lit', 27 * s, 23 * s, 26 * s, 21 * s);
    },
    reel: function (c, s) {
      box(c, 'stone', 8 * s, 3 * s, 11 * s, 2 * s); box(c, 'stone_lit', 8 * s, 3 * s, 11 * s, 1);
      limb(c, 13 * s, 5 * s, 13 * s, 9 * s, 1.3 * s, STONE);
      blob(c, 13 * s, 17 * s, 9 * s, 8.5 * s, STONE, { rim: 0.3 });
      blob(c, 13 * s, 17 * s, 6.5 * s, 6 * s, LINE, { rim: 0.2 });
      for (var r = 0; r < 4; r++) line(c, 'water_hi', 8 * s, (13 + r * 2.5) * s, 18 * s, (13 + r * 2.5) * s);
      blob(c, 13 * s, 17 * s, 2.4 * s, 2.4 * s, STONE, { bias: 0.1 });
      limb(c, 15 * s, 17 * s, 26 * s, 17 * s, 0.9 * s, STONE, 0.1);
      blob(c, 27 * s, 17 * s, 2.6 * s, 2.6 * s, WOOD, { bias: 0.15 });
    },
    line: function (c, s) {
      blob(c, 16 * s, 25 * s, 12 * s, 3.5 * s, WOOD);
      for (var y = 7 * s; y < 25 * s; y++) for (var x = 7 * s; x < 25 * s; x++) {
        var v = 0.75 - (x - 7 * s) / (18 * s) * 0.6 + (((y / s) | 0) % 2 ? 0.08 : -0.08);
        px(c, tone(LINE, v, x, y), x, y);
      }
      A.box(c, 'paper', 9 * s, 13 * s, 14 * s, 6 * s); box(c, 'cream', 9 * s, 13 * s, 14 * s, 1); box(c, 'paper_dark', 9 * s, 19 * s - 1, 14 * s, 1);
      box(c, 'crimson', 10 * s, 14 * s + 1, 4 * s, 3 * s); box(c, 'wood_dark', 15 * s, 15 * s, 7 * s, 1); box(c, 'wood_dark', 15 * s, 17 * s, 5 * s, 1);
      blob(c, 16 * s, 7 * s, 12 * s, 3.5 * s, WOOD, { bias: 0.15 });
      blob(c, 16 * s, 7 * s, 3 * s, 1.2 * s, STONE);
    },
    lantern: function (c, s) {
      for (var a = 0; a <= 12; a++) { var t = a / 12 * Math.PI; px(c, 'rust_dark', (16 * s + Math.cos(t) * 6 * s) | 0, (5 * s - Math.sin(t) * 4 * s) | 0); }
      blob(c, 16 * s, 7 * s, 6 * s, 2.6 * s, RUST, { bias: 0.1 });
      blob(c, 16 * s, 16 * s, 6.5 * s, 7.5 * s, GLOW, { bias: 0.15, rim: 0.5 });
      blob(c, 15 * s, 15 * s, 2 * s, 3.5 * s, ['lamp_glow', 'cream'], { bias: 0.4 });
      for (var g = -1; g <= 1; g++) line(c, 'rust_dark', (16 + g * 5) * s, 9 * s, (16 + g * 5) * s, 23 * s);
      box(c, 'flame', 15 * s, 17 * s, 2 * s, 3 * s);
      blob(c, 16 * s, 25 * s, 9 * s, 3.8 * s, RUST);
      box(c, 'rust_dark', 8 * s, 28 * s, 16 * s, 1 * s);
    },
    finder: function (c, s) {
      slab(c, 3 * s, 5 * s, 26 * s, 20 * s, STONE);
      box(c, 'ink', 6 * s, 8 * s, 20 * s, 12 * s);
      for (var x = 6 * s; x < 26 * s; x++) {
        var by = (8 + 9 + Math.sin(x / s * 0.45) * 1.6) * s | 0;
        px(c, 'neon_teal', x, by); if (s > 1) px(c, 'teal_hi', x, by + 1);
        if ((x / s | 0) % 4 === 0) px(c, 'teal_dark', x, 8 * s + 2);
      }
      box(c, 'signal_amber', 11 * s, 12 * s, 2 * s, 1 * s); box(c, 'signal_amber', 19 * s, 14 * s, 2 * s, 1 * s);
      box(c, 'teal', 6 * s, 8 * s, 20 * s, 1);
      for (var b = 0; b < 3; b++) blob(c, (9 + b * 5) * s, 22 * s, 1.3 * s, 1.3 * s, b === 0 ? RUST : STONE, { bias: 0.2 });
      box(c, 'stone_dark', 13 * s, 25 * s, 6 * s, 2 * s); slab(c, 9 * s, 27 * s, 14 * s, 3 * s, STONE);
    },
    worm: function (c, s) {
      for (var y = 13 * s; y < 29 * s; y++) {
        var hw = (11 - (y / s - 13) * 0.22) * s;
        for (var x = -hw; x <= hw; x++) px(c, tone(CUP, 0.85 - (x / hw + 1) * 0.4 + (y / s > 27 ? -0.3 : 0), 16 * s + x, y), (16 * s + x) | 0, y);
      }
      box(c, 'crimson', 8 * s, 19 * s, 16 * s, 3 * s); box(c, 'rust_hi', 8 * s, 19 * s, 16 * s, 1);
      blob(c, 16 * s, 13 * s, 11 * s, 2.6 * s, ['wood_deep', 'wood_dark', 'wood'], { bias: -0.1 });
      limb(c, 9 * s, 12 * s, 12 * s, 6 * s, 1.2 * s, WORM, 0.1); limb(c, 12 * s, 6 * s, 15 * s, 9 * s, 1.2 * s, WORM, 0.1);
      limb(c, 19 * s, 13 * s, 21 * s, 5 * s, 1.2 * s, WORM, 0.1); limb(c, 21 * s, 5 * s, 24 * s, 7 * s, 1.2 * s, WORM, 0.1);
    },
    cricket: function (c, s) {
      box(c, 'ink', 6 * s, 9 * s, 20 * s, 16 * s);
      blob(c, 15 * s, 18 * s, 5 * s, 2.6 * s, ENAMEL, { bias: 0.1 }); blob(c, 20 * s, 17 * s, 2 * s, 2 * s, ENAMEL);
      line(c, 'moss_hi', 11 * s, 18 * s, 8 * s, 22 * s); line(c, 'moss_hi', 14 * s, 19 * s, 12 * s, 23 * s); line(c, 'moss_hi', 21 * s, 16 * s, 25 * s, 12 * s);
      for (var y = 9 * s; y < 25 * s; y++) for (var x = 6 * s; x < 26 * s; x++) if ((x + y) % (2 * s) === 0 || (x - y + 64) % (2 * s) === 0) px(c, (x + y) % (4 * s) ? 'stone' : 'stone_hi', x, y);
      slab(c, 4 * s, 7 * s, 24 * s, 3 * s, WOOD); slab(c, 4 * s, 24 * s, 24 * s, 3 * s, WOOD);
    },
    minnow: function (c, s) {
      for (var a = 0; a <= 16; a++) { var t = a / 16 * Math.PI; px(c, 'stone_hi', (16 * s + Math.cos(t) * 11 * s) | 0, (10 * s - Math.sin(t) * 7 * s) | 0); }
      for (var y = 10 * s; y < 28 * s; y++) {
        var hw = (12 - (y / s - 10) * 0.18) * s;
        for (var x = -hw; x <= hw; x++) px(c, tone(STONE, 0.9 - (x / hw + 1) * 0.42 + ((((y / s) | 0) === 15 || ((y / s) | 0) === 23) ? -0.2 : 0), 16 * s + x, y), (16 * s + x) | 0, y);
      }
      blob(c, 16 * s, 10 * s, 12 * s, 2.6 * s, LINE, { bias: 0.1, rim: 0 });
      blob(c, 13 * s, 10 * s, 3.5 * s, 1.2 * s, ['stone_hi', 'fog_light', 'cream'], { bias: 0.2 }); px(c, 'ink', (11 * s) | 0, (10 * s) | 0);
      line(c, 'fog_light', 16 * s, 10 * s, 18 * s, 9 * s); line(c, 'fog_light', 16 * s, 10 * s, 18 * s, 11 * s);
    },
    jar: function (c, s) {
      for (var y = 9 * s; y < 29 * s; y++) for (var x = 6 * s; x < 26 * s; x++) {
        var nx = (x - 16 * s) / (10 * s), edge = Math.abs(nx) > 0.86 || y > 28 * s - 2;
        if ((y < 10 * s || y > 28 * s - 1) && Math.abs(nx) > 0.8) continue;
        px(c, edge ? 'fog_mid' : tone(['blood', 'crimson'], 0.55 - nx * 0.4 - (y - 9 * s) / (40 * s), x, y), x, y);
      }
      box(c, 'fog_light', 9 * s, 12 * s, 1 * s, 13 * s); box(c, 'cream', 9 * s, 13 * s, 1, 4 * s);
      slab(c, 7 * s, 4 * s, 18 * s, 5 * s, STONE);
      for (var r = 0; r < 3; r++) box(c, 'stone_dark', 8 * s, (5.5 + r * 1.3) * s, 16 * s, 1);
      blob(c, 19 * s, 18 * s, 1.8 * s, 1.6 * s, ['paper_dark', 'bone', 'cream'], { bias: 0.2 }); px(c, 'ink', (19 * s) | 0, (18 * s) | 0);
    }
  };
  var iconCache = {}, coin = null;
  // The coin beside the balance: brass, a lit edge, a stamped centre (8×8).
  function paintCoin(c) { A.reset(); blob(c, 4, 4, 3.6, 3.6, BRASS, { bias: 0.1, rim: 0 }); box(c, 'rust', 3, 3, 2, 2); px(c, 'brass_hi', 2, 2); }
  function icon(name, s) {
    var key = name + s;
    if (!iconCache[key]) iconCache[key] = G.gfx.bake.layer(32 * s, 32 * s, function (c) { A.reset(); ICONS[name](c, s); });
    return iconCache[key];
  }

  // ---- The room (baked once) --------------------------------------------------------------

  // Light from the hanging lamp: 1 under the shade, 0 at the corners of the room.
  function lampLight(x, y) {
    var dx = (x - 196) / 215, dy = (y - 30) / 235;
    return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
  }

  // Vertical planks, warm under the lamp, falling into dark at the edges: grain, knots, nails.
  function paintWall(c) {
    A.area(c, 0, 10, 640, 206, function (x, y) {
      // The lamp's light is read at the plank's middle, so the pool steps plank by plank.
      var p = (x / 22) | 0, lx = x % 22, L = lampLight(p * 22 + 11, y);
      var v = 0.12 + 0.72 * L + (hash(p, 7) - 0.5) * 0.1;
      if ((lx === 6 || lx === 15) && hash(p * 31 + lx, (y / 17) | 0) < 0.6) v -= 0.13;   // grain
      var kx = 4 + hash(p, 11) * 14, ky = 30 + hash(p, 13) * 170, kd = ((lx - kx) * (lx - kx)) / 6 + ((y - ky) * (y - ky)) / 3;
      if (kd < 1) v -= 0.16; else if (kd < 2.2) v -= 0.06;                               // a knot
      if (lx === 1) v += 0.07; if (lx === 20) v -= 0.07;
      return lx === 0 ? (L > 0.55 ? 'wood_dark' : (L > 0.25 ? 'wood_deep' : 'ink')) : tone(WALL, v, x, y);
    });
    for (var n = 0; n < 640; n += 22) { px(c, 'stone', n + 11, 14); px(c, 'stone_hi', n + 10, 13); px(c, 'stone', n + 11, 208); }
    slab(c, 0, 0, 640, 10, WOOD); box(c, 'ink', 0, 10, 640, 1); box(c, 'wood_deep', 0, 11, 640, 1);
  }

  // A shelf: lit top, front board, brackets and a soft shadow on the wall below.
  function shelf(c, x, y, w) {
    box(c, 'wood_lit', x, y, w, 1); box(c, 'wood_hi', x, y + 1, w, 2); box(c, 'wood_mid', x, y + 3, w, 4); box(c, 'wood_dark', x, y + 7, w, 1);
    box(c, 'ink', x, y + 8, w, 1);
    box(c, 'wood_deep', x, y + 9, w, 2);
    for (var b = 0; b < 2; b++) { var bx = b ? x + w - 10 : x + 6; for (var k = 0; k < 8; k++) box(c, k < 7 ? 'wood_dark' : 'ink', bx, y + 8 + k, 4 - (k >> 1), 1); }
  }

  // Lure packets on a pegboard: printed card, a blister with the lure, the peg.
  var INKS = ['rust_hi', 'water_hi', 'moss_hi', 'dusk_rose', 'signal_amber', 'teal_hi', 'leaf_gold', 'crimson'];
  function packet(c, x, y, n) {
    var w = 18, h = 28, head = INKS[(n * 5 + 1) % INKS.length], lure = INKS[(n * 3 + 2) % INKS.length];
    box(c, 'stone', x + 8, y - 6, 2, 6); px(c, 'stone_lit', x + 8, y - 6);
    box(c, 'ink', x - 1, y - 1, w + 2, h + 2);
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) px(c, tone(CUP, 0.7 - xx / w * 0.35, x + xx, y + yy), x + xx, y + yy);
    box(c, head, x, y, w, 6); box(c, 'cream', x + 2, y + 2, 9, 1); box(c, 'ink', x + 7, y + 1, 4, 2);  // brand and the hang hole
    box(c, 'fog_dark', x + 2, y + 8, w - 4, h - 13); box(c, 'fog_mid', x + 3, y + 9, w - 6, h - 15); px(c, 'fog_light', x + 3, y + 9); box(c, 'fog_light', x + 3, y + 10, 1, 4);
    var ly = y + 12 + (n % 3);
    blob(c, x + 9, ly, 4.5, 2, [lure === 'signal_amber' ? 'rust' : 'ink', lure, 'cream'], { bias: 0.05 });
    px(c, 'ink', x + 6, ly - 1); px(c, 'cream', x + 6, ly);
    line(c, 'stone_lit', x + 13, ly, x + 15, ly + 2); line(c, 'stone_lit', x + 9, ly + 2, x + 9, ly + 4);
    box(c, 'paper_dark', x + 2, y + h - 4, w - 4, 1); box(c, 'paper_dark', x + 2, y + h - 2, w - 8, 1);
  }
  function pegboard(c, x0, y0, w, h) {
    box(c, 'ink', x0 - 2, y0 - 2, w + 4, h + 4);
    for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) {
      var v = 0.25 + lampLight(x, y) * 0.75;
      var k = ((x - x0) % 6 === 3 && (y - y0) % 6 === 3) ? 'wood_deep' : tone(['wood_dark', 'wood', 'wood_mid', 'wood_hi'], v, x, y);
      if ((x - x0) % 6 === 4 && (y - y0) % 6 === 4 && v > 0.5) k = 'wood_mid';
      px(c, k, x, y);
    }
    slab(c, x0 - 2, y0 - 2, w + 4, 3, WOOD); box(c, 'wood_deep', x0, y0 + h - 1, w, 1);
    for (var j = 0; j < 4; j++) for (var i = 0; i < 6; i++) packet(c, x0 + 4 + i * 24, y0 + 12 + j * 46, j * 6 + i);
  }

  // A trophy from the roster (painted at its size by fishgen.portrait), on a varnished plaque.
  function trophy(c, id, cx, cy, maxW) {
    var fish = G.data.fish, i, sp = 0;
    for (i = 0; i < fish.length; i++) if (fish[i].id === id) sp = i;
    var img = G.gfx.fishgen.portrait(sp, maxW - 16, 44, false);
    var w = Math.min(maxW, img.width + 16), h = img.height + 16, x = cx - (w >> 1), y = cy - (h >> 1);
    box(c, 'ink', x - 1, y + 3, w + 2, h); // shadow on the wall
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var cut = Math.min(xx, w - 1 - xx) + Math.min(yy, h - 1 - yy) < 4;     // bevelled corners
      if (cut) continue;
      var edge = xx < 2 || yy < 2 || xx > w - 3 || yy > h - 3;
      px(c, edge ? (xx < 2 || yy < 2 ? 'wood_lit' : 'wood_deep') : tone(WOOD, 0.62 - xx / w * 0.25 - yy / h * 0.2, x + xx, y + yy), x + xx, y + yy);
    }
    slab(c, cx - 12, y + h - 7, 24, 4, BRASS);
    c.drawImage(img, cx - (img.width >> 1), y + 6);
  }

  // The window: fog outside, never brighter than the dusk ceiling.
  function window_(c, x, y, w, h) {
    slab(c, x - 4, y - 4, w + 8, h + 8, WOOD);
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var v = 0.2 + yy / h * 0.5;
      px(c, tone(['night_ink', 'fog_dark', 'fog_mid', 'fog_light'], yy > h * 0.72 ? 0.05 : v, x + xx, y + yy), x + xx, y + yy);
    }
    for (var i = 0; i < 9; i++) box(c, 'fog_light', x + 4 + (i * 23) % (w - 16), y + 6 + (i * 7) % (h - 22), 6 + (i % 3) * 4, 1); // drifting fog
    for (i = 0; i < 6; i++) box(c, 'fog_dark', x + (i * 17) % w, y + (h * 0.72 | 0) - 2 - (i % 3), 3, 2 + (i % 3)); // the far shore's posts
    slab(c, x + (w >> 1) - 2, y, 4, h, WOOD); slab(c, x, y + (h >> 1) - 2, w, 4, WOOD);
    slab(c, x - 6, y + h + 4, w + 12, 4, WOOD);
  }

  // The keeper (original): an older woman with a grey bun and round glasses, a plum cardigan
  // and a canvas apron, leaning on the counter. Her blink and her mouth are drawn live.
  function keeper(c) {
    var x, y, cx = CX;
    // Cardigan body, rounded at the shoulders, knitted in ribs.
    for (y = 126; y < 216; y++) {
      var hw = Math.min(60, Math.round(28 + Math.sqrt(y - 124) * 12.5));
      for (x = -hw; x <= hw; x++) {
        var v = 0.6 - x / hw * 0.32 + (y < 146 ? 0.08 : 0) - (y - 126) / 420 + ((x + 300) % 4 === 0 ? -0.1 : 0) + (Math.abs(x) > hw - 3 ? -0.15 : 0);
        px(c, tone(KNIT, v, cx + x, y), cx + x, y);
      }
    }
    // The blouse in the cardigan's neck, its collar points, the apron and its straps.
    for (y = 126; y < 172; y++) { var vw = Math.max(0, Math.round((172 - y) / 3.2)); for (x = -vw; x <= vw; x++) px(c, tone(['paper_dark', 'paper', 'bone', 'cream'], 0.7 - x / 30, cx + x, y), cx + x, y); }
    for (x = 0; x < 12; x++) for (y = 0; y <= (x >> 1); y++) { px(c, 'cream', cx - 15 + x, 126 + y + (x >> 1)); px(c, 'paper', cx + 15 - x, 126 + y + (x >> 1)); }
    for (y = 152; y < 216; y++) {
      var aw = y < 184 ? 24 : Math.min(42, 24 + (y - 184) * 1.1);
      for (x = -aw; x <= aw; x++) {
        var av = 0.68 - x / aw * 0.3 + (Math.abs(x) > aw - 2 ? -0.25 : 0);
        px(c, tone(CANVAS, av, cx + x, y), cx + x, y);
      }
      if (y % 4 < 2) { px(c, 'paper_dark', cx - aw + 3, y); px(c, 'paper_dark', cx + aw - 3, y); } // stitching
    }
    for (y = 128; y < 153; y++) { var sx = Math.round((152 - y) / 4); box(c, 'paper', cx - 27 - sx, y, 3, 1); box(c, 'paper_dark', cx + 25 + sx, y, 3, 1); px(c, 'reed_hi', cx - 27 - sx, y); }
    for (x = -24; x <= 24; x += 2) px(c, 'paper_dark', cx + x, 155);
    // A pocket with a pencil and a pen, a stitched fish on the bib.
    slab(c, cx - 19, 194, 38, 18, CANVAS); box(c, 'reed_hi', cx, 194, 1, 18);
    for (x = -18; x < 18; x += 2) px(c, 'paper_dark', cx + x, 196);
    limb(c, cx - 11, 185, cx - 11, 196, 1.2, RUST, 0.1); box(c, 'skin_shadow', cx - 12, 183, 2, 2); px(c, 'ink', cx - 11, 182);
    limb(c, cx + 9, 187, cx + 9, 196, 1.1, ['ink', 'water_mid', 'water_hi'], 0.1); box(c, 'stone_lit', cx + 8, 186, 2, 2);
    blob(c, cx - 2, 170, 7, 3, ['water_mid', 'water_hi', 'water_foam'], { rim: 0 });
    for (y = -3; y <= 3; y++) px(c, 'water_hi', cx + 6 + Math.abs(y), 170 + y);
    px(c, 'ink', cx - 6, 169);
    for (y = 176; y < 212; y += 10) { blob(c, cx - 31, y, 1.8, 1.8, ['stone', 'birch', 'cream']); blob(c, cx + 31, y, 1.8, 1.8, ['stone', 'birch', 'cream']); }
    // The neck, the hair behind, the bun with a pencil through it.
    limb(c, cx, 112, cx, 128, 8, SKIN, -0.15);
    blob(c, cx, 92, 25, 25, HAIR, { bias: -0.05 });
    limb(c, cx + 6, 48, cx - 14, 70, 1.3, RUST, 0.1); px(c, 'ink', cx - 15, 71);
    blob(c, cx + 3, 62, 13, 11, HAIR, { bias: 0.05 });
    for (var a = 0; a < 3; a++) for (var t = 0; t < 22; t++) { var ang = t / 22 * Math.PI * 1.4 + a * 2.1; px(c, a % 2 ? 'stone' : 'hair_lit', (cx + 3 + Math.cos(ang) * (4 + a * 3)) | 0, (62 + Math.sin(ang) * (3 + a * 2.6)) | 0); }
    box(c, 'stone_dark', cx - 8, 71, 22, 1); box(c, 'dusk_plum', cx - 7, 72, 20, 2);
    // Ears, the face, the fringe swept to one side.
    blob(c, cx - 20, 103, 4, 6, SKIN, { bias: 0.1 }); blob(c, cx + 20, 103, 4, 6, SKIN, { bias: -0.1 });
    px(c, 'cream', cx - 21, 110); px(c, 'leaf_gold', cx - 21, 111); px(c, 'leaf_gold', cx + 21, 111); // earrings
    blob(c, cx, 103, 18, 22, SKIN, { bias: 0.18, rim: 0.25 });
    for (y = 76; y < 92; y++) for (x = -21; x <= 21; x++) {
      var edge = 86 - Math.round(Math.abs(x + 6) / 2.8) + (x > 6 ? 2 : 0);
      if (y <= edge && (x * x) / 470 + ((y - 92) * (y - 92)) / 300 <= 1) px(c, tone(HAIR, 0.62 - x / 40 - (y - 76) / 60 + (((x + y) % 5) === 0 ? 0.15 : 0), cx + x, y), cx + x, y);
    }
    // Brows, eyes, round glasses with a glint, crow's feet.
    for (x = -3; x <= 4; x++) { px(c, 'stone', EYE_L + x, 93 - (x > 0 ? 1 : 0)); px(c, 'stone', EYE_R + x - 1, 93 - (x < 1 ? 1 : 0)); }
    for (var e = 0; e < 2; e++) {
      var ex = e ? EYE_R : EYE_L;
      box(c, 'cream', ex - 2, EYE_Y - 1, 5, 3); box(c, 'ink', ex - 1, EYE_Y - 1, 3, 3); px(c, 'cream', ex, EYE_Y - 1);
      box(c, 'skin_shadow', ex - 3, EYE_Y - 2, 7, 1);
      for (y = -8; y <= 8; y++) for (x = -8; x <= 8; x++) {
        var r = Math.sqrt(x * x + y * y);
        if (r > 6.3 && r < 7.8) px(c, y < 0 && x < 0 ? 'stone_lit' : (y > 3 ? 'ink' : 'stone_dark'), ex + x, EYE_Y + y);
      }
      line(c, 'fog_light', ex - 4, EYE_Y - 3, ex - 2, EYE_Y - 5);
      line(c, 'skin_shadow', ex + (e ? 9 : -9), EYE_Y + 1, ex + (e ? 11 : -11), EYE_Y + 3);
    }
    box(c, 'stone_dark', EYE_L + 7, EYE_Y - 2, EYE_R - EYE_L - 14, 2);
    line(c, 'stone_dark', EYE_L - 8, EYE_Y - 1, cx - 19, EYE_Y - 2); line(c, 'stone_dark', EYE_R + 8, EYE_Y - 1, cx + 19, EYE_Y - 2);
    // Nose, cheeks, smile lines and the smile.
    line(c, 'skin_shadow', cx + 2, 104, cx + 3, 110); px(c, 'skin_lit', cx - 1, 108); px(c, 'skin_lit', cx - 1, 109);
    box(c, 'skin_shadow', cx - 2, 111, 2, 1); box(c, 'skin_shadow', cx + 2, 111, 2, 1);
    box(c, 'dusk_rose', EYE_L - 4, 110, 5, 2); box(c, 'dusk_rose', EYE_L - 3, 109, 3, 1); box(c, 'dusk_rose', EYE_R, 110, 5, 2); box(c, 'dusk_rose', EYE_R + 1, 109, 3, 1);
    line(c, 'skin_shadow', cx - 11, 112, cx - 9, 118); line(c, 'skin_shadow', cx + 11, 112, cx + 9, 118);
    line(c, 'flesh_dark', MOUTH_X - 5, MOUTH_Y - 1, MOUTH_X - 3, MOUTH_Y); box(c, 'flesh_dark', MOUTH_X - 3, MOUTH_Y, 7, 1); line(c, 'flesh_dark', MOUTH_X + 4, MOUTH_Y, MOUTH_X + 6, MOUTH_Y - 1);
    box(c, 'dusk_rose', MOUTH_X - 2, MOUTH_Y + 1, 5, 1); line(c, 'skin_shadow', cx - 3, 123, cx + 3, 123);
    // Sleeves to the elbows, then forearms in to the counter, with ribbed cuffs.
    limb(c, cx - 50, 140, cx - 60, 186, 12, KNIT, 0.12); limb(c, cx + 50, 140, cx + 60, 186, 12, KNIT, -0.12);
    limb(c, cx - 60, 186, cx - 34, 208, 10, KNIT, 0.12); limb(c, cx + 60, 186, cx + 34, 208, 10, KNIT, -0.12);
    for (y = 0; y < 6; y++) for (x = -9; x <= 9; x++) { px(c, (x + 20) % 3 ? 'dusk_violet' : 'dusk_plum', cx - 34 + x + y, 200 + y + (x >> 1)); px(c, (x + 20) % 3 ? 'dusk_violet' : 'dusk_plum', cx + 34 + x - y, 200 + y - (x >> 1)); }
  }

  function counter(c) {
    var x, y, i;
    for (y = 214; y < 227; y++) for (x = 0; x < 400; x++) {
      var v = y === 214 ? 0.9 : (y < 222 ? 0.55 + (lampLight(x, y) > 0.45 ? 0.2 : 0) + (hash(x >> 4, y) < 0.18 ? -0.2 : 0) : (y === 222 ? 1 : 0.35));
      px(c, tone(WOOD, v, x, y), x, y);
    }
    box(c, 'ink', 0, 227, 400, 1);
    A.area(c, 0, 228, 400, 132, function (x, y) {
      var bx = x % 28, bv = 0.35 + (hash((x / 28) | 0, 5) - 0.5) * 0.1 + (bx === 1 ? 0.16 : 0) + (bx === 27 ? -0.16 : 0) + ((bx === 9 || bx === 19) && hash(x, (y / 21) | 0) < 0.5 ? -0.16 : 0);
      return bx === 0 ? 'ink' : tone(WOOD, bv, x, y);
    });
    slab(c, 0, 236, 400, 7, WOOD); box(c, 'ink', 0, 243, 400, 1);
    // An open cubby under the counter with a row of jars.
    box(c, 'ink', 8, 250, 384, 46);
    box(c, 'wood_deep', 9, 251, 382, 39); for (x = 9; x < 391; x += 32) box(c, 'ink', x, 251, 1, 39); box(c, 'ink', 9, 251, 382, 3);
    slab(c, 8, 290, 384, 6, WOOD); box(c, 'ink', 8, 296, 384, 1);
    var LID = [RUST, STONE, BRASS, ENAMEL], FILL = [['moss_dark', 'moss'], ['rust_dark', 'rust'], ['wood_deep', 'wood_dark'], ['blood', 'crimson'], ['stone_dark', 'stone'], ['teal_dark', 'teal']];
    for (i = 0; i < 11; i++) {
      var jx = 18 + i * 34, jh = 26 + (i % 3) * 4, jy = 290 - jh, f = FILL[(i * 5) % FILL.length];
      for (y = jy + 4; y < 290; y++) for (x = 0; x < 22; x++) {
        var nx = (x - 11) / 11, k = Math.abs(nx) > 0.88 ? 'fog_dark' : tone(f, 0.6 - nx * 0.5 + (y < jy + 9 ? 0.4 : 0), jx + x, y);
        if (y < jy + 8 && Math.abs(nx) < 0.88) k = 'fog_dark';
        px(c, k, jx + x, y);
      }
      box(c, 'fog_mid', jx + 3, jy + 6, 1, jh - 10);
      slab(c, jx + 1, jy, 20, 5, LID[i % LID.length]);
      slab(c, jx + 4, jy + 12, 14, 9, CUP); box(c, 'wood_dark', jx + 6, jy + 15, 10, 1); box(c, 'wood_dark', jx + 6, jy + 17, 7, 1);
    }
    // A notice taped to the front.
    box(c, 'ink', 19, 307, 82, 46);
    for (y = 308; y < 352; y++) for (x = 20; x < 100; x++) px(c, tone(CUP, 0.75 - (x - 20) / 300 - (y - 308) / 200, x, y), x, y);
    box(c, 'fog_light', 24, 304, 14, 7); box(c, 'fog_light', 82, 304, 14, 7); box(c, 'fog_mid', 24, 310, 14, 1);
    F.bold(c, 'OPEN', 60 - (F.measureBold('OPEN') >> 1), 314, 'rust');
    F.bold(c, 'LATE', 60 - (F.measureBold('LATE') >> 1), 328, 'rust_dark');
    F.drawText(c, 'ask inside', 60 - (F.measure('ask inside') >> 1), 340, 'wood', 0.3, 5);
  }

  // What stands on the counter, in front of the keeper: her hands, the register (its clock
  // stopped at 3:33), a jar of worms, a bell and a notepad.
  function onCounter(c) {
    var cx = CX, x, y, h;
    for (h = -1; h <= 1; h += 2) {
      var hx = cx + h * 30;
      blob(c, hx, 214, 11, 6, SKIN, { bias: h < 0 ? 0.2 : 0.05 });
      for (var f = 0; f < 4; f++) limb(c, hx - h * 6 + h * f * 4, 216, hx - h * 7 + h * f * 4, 221, 1.8, SKIN, 0.1);
      line(c, 'skin_shadow', hx - 6, 219, hx + 6, 219);
    }
    // Register.
    slab(c, 40, 150, 28, 18, STONE); box(c, 'ink', 43, 153, 22, 12);
    F.drawText(c, '3:33', 54 - (F.measure('3:33') >> 1), 154, 'signal_amber');
    box(c, 'stone', 50, 168, 8, 6);
    for (y = 172; y < 214; y++) {
      var top = y < 186 ? 172 + (186 - y) : 0;
      for (x = 14; x < 96; x++) {
        if (y < 186 && x < 14 + (186 - y) * 0.6) continue;
        px(c, tone(CUP, 0.82 - (x - 14) / 120 + (y < 186 ? 0.1 : -0.05) + (x === 14 || y === 213 ? -0.4 : 0), x, y), x, y);
      }
    }
    for (var r = 0; r < 3; r++) for (var k = 0; k < 6; k++) slab(c, 26 + k * 11 - r * 3, 175 + r * 4, 8, 3, (r + k) % 5 ? STONE : RUST);
    slab(c, 16, 196, 78, 16, CUP); box(c, 'paper_dark', 16, 196, 78, 1); slab(c, 46, 202, 18, 3, BRASS);
    box(c, 'ink', 14, 213, 82, 1);
    // A jar of worms.
    box(c, 'ink', 264, 186, 30, 30);
    for (y = 192; y < 215; y++) for (x = 265; x < 293; x++) px(c, y < 197 ? 'fog_mid' : tone(['wood_deep', 'wood_dark', 'wood'], 0.55 - (x - 265) / 50 - (y - 197) / 60, x, y), x, y);
    blob(c, 271, 207, 2.5, 1.5, ['wood_dark', 'wood', 'wood_mid']); blob(c, 285, 210, 3, 1.5, ['wood_dark', 'wood', 'wood_mid']);
    limb(c, 270, 200, 276, 197, 1.2, WORM, 0.1); limb(c, 276, 197, 280, 203, 1.2, WORM, 0.1); limb(c, 284, 206, 289, 202, 1.2, WORM, 0.1);
    box(c, 'fog_light', 267, 193, 2, 20); box(c, 'fog_mid', 290, 193, 1, 20);
    slab(c, 263, 184, 32, 7, RUST);
    F.drawText(c, 'LIVE', 279 - (F.measure('LIVE') >> 1), 205, 'paper', 0.5, 9);
    // The bell, the notepad and pencil.
    box(c, 'ink', 308, 216, 26, 2);
    blob(c, 321, 214, 10, 7, STONE, { bias: 0.1, rim: 0.3 }); box(c, 'ink', 310, 214, 22, 2); box(c, 'stone', 311, 213, 20, 1);
    blob(c, 321, 206, 2, 2, STONE, { bias: 0.3 });
    box(c, 'ink', 342, 215, 46, 5); box(c, 'cream', 343, 215, 44, 3); box(c, 'paper_dark', 343, 218, 44, 1);
    limb(c, 348, 213, 378, 210, 1.2, RUST, 0.1); box(c, 'skin_shadow', 346, 213, 2, 2);
  }

  // The panel's frame (the live parts are drawn each frame).
  function panelFrame(c) {
    box(c, 'wood_deep', 400, 216, 240, 144);
    box(c, 'ink', PX - 4, PY - 4, PW + 8, PH + 8); box(c, 'ink', PX - 2, PY + PH + 4, PW + 6, 2); // and its shadow
    slab(c, PX - 3, PY - 3, PW + 6, PH + 6, ['rust_dark', 'rust', 'rust_hi']);
    box(c, 'rust_dark', PX, PY, PW, PH);
    box(c, 'rust', PX + 8, GRID_Y - 12, PW - 16, 1); box(c, 'rust_dark', PX + 8, GRID_Y - 11, PW - 16, 1);
    var R = [[PX - 1, PY - 1], [PX + PW - 2, PY - 1], [PX - 1, PY + PH - 2], [PX + PW - 2, PY + PH - 2]];
    for (var i = 0; i < 4; i++) blob(c, R[i][0] + 1, R[i][1] + 1, 2, 2, BRASS, { bias: 0.2 });
  }

  function paintRoom(c) {
    A.reset();
    paintWall(c);
    // The left wall: a shelf with a radio and books, a trophy, the sign.
    shelf(c, 4, 60, 122);
    slab(c, 10, 22, 52, 38, WOOD);
    for (var y = 26; y < 52; y++) for (var x = 14; x < 38; x++) px(c, ((x + y) % 2 && (x - y + 99) % 3) ? 'paper_dark' : 'reed_hi', x, y);
    box(c, 'ink', 41, 26, 17, 10); box(c, 'signal_amber', 42, 29, 15, 2); box(c, 'lamp_glow', 44, 29, 3, 1); box(c, 'crimson', 49, 27, 1, 8);
    blob(c, 45, 46, 3.5, 3.5, STONE, { bias: 0.15 }); blob(c, 54, 46, 3.5, 3.5, STONE, { bias: 0.15 });
    line(c, 'stone_hi', 56, 22, 70, 0); line(c, 'stone', 57, 22, 71, 0);
    var BOOK = [KNIT, RUST, ENAMEL, STONE, CUP, ['teal_dark', 'teal', 'teal_hi'], ['blood', 'crimson', 'rug_hi']];
    for (var i = 0, bx = 70; i < 12; i++) {
      var bw = 3 + (i * 5) % 3, bh = 22 + (i * 7) % 9, b = BOOK[(i * 3) % BOOK.length];
      if (i === 11) { for (var k = 0; k < bh; k++) box(c, k % 6 ? b[1] : b[b.length - 1], bx + 2 + (k >> 2), 60 - k, bw, 1); break; } // leaning
      box(c, 'ink', bx - 1, 59 - bh, bw + 2, bh + 1);
      for (var yy = 0; yy < bh; yy++) for (var xx = 0; xx < bw; xx++) px(c, tone(b, 0.8 - xx / bw * 0.6, bx + xx, 60 - bh + yy), bx + xx, 60 - bh + yy);
      box(c, 'leaf_gold', bx, 60 - bh + 4, bw, 1); box(c, 'leaf_gold', bx, 60 - 6, bw, 1);
      bx += bw + 1;
    }
    trophy(c, 'gloam_perch', 66, 82, 116);
    // The sign: an oval board on two chains.
    for (var ch = 0; ch < 9; ch++) { px(c, 'stone', 26, 106 + ch); px(c, 'stone', 106, 106 + ch); }
    for (y = -20; y <= 20; y++) for (x = -58; x <= 58; x++) {
      var e = (x * x) / 3364 + (y * y) / 400;
      if (e > 1) continue;
      px(c, e > 0.82 ? tone(WOOD, y < 0 ? 0.85 : 0.35, 66 + x, 132 + y) : tone(CUP, 0.65 - x / 160 - y / 60, 66 + x, 132 + y), 66 + x, 132 + y);
    }
    F.bold(c, 'BAIT &', 66 - (F.measureBold('BAIT &') >> 1), 116, 'rust');
    F.bold(c, 'TACKLE', 66 - (F.measureBold('TACKLE') >> 1), 129, 'water_mid');
    for (x = -30; x <= 30; x++) px(c, 'rust_hi', 66 + x, 144 + Math.round(Math.cos(x / 6) * 1.2));
    // The back: the pegboard and the lamp's pool of light.
    pegboard(c, 134, 26, 146, 186);
    // The right wall: a calendar (behind the speech), a stranger trophy, the window, boxes.
    box(c, 'ink', 309, 21, 66, 56); for (y = 22; y < 76; y++) for (x = 310; x < 374; x++) px(c, tone(CUP, 0.7 - (y - 22) / 200, x, y), x, y);
    box(c, 'crimson', 310, 22, 64, 14); F.bold(c, 'OCT', 342 - (F.measureBold('OCT') >> 1), 25, 'bone');
    for (var row = 0; row < 5; row++) for (var col = 0; col < 7; col++) {
      var day = row * 7 + col;
      box(c, day === 28 ? 'crimson' : 'paper_dark', 314 + col * 8, 40 + row * 7, 5, 4);
      if (day === 28) { box(c, 'cream', 315 + col * 8, 41 + row * 7, 3, 2); }
    }
    trophy(c, 'hollow_pike', 342, 102, 108);
    window_(c, 304, 132, 80, 46);
    shelf(c, 292, 204, 104);
    slab(c, 300, 182, 42, 22, ENAMEL); slab(c, 316, 188, 10, 4, STONE); box(c, 'moss_dark', 300, 192, 42, 1);
    slab(c, 346, 188, 40, 16, ['blood', 'crimson', 'rug_hi']); slab(c, 361, 193, 8, 3, STONE);
    // The lamp: a cord, a green enamel shade with a lit rim, the bulb and a little halo.
    line(c, 'ink', 196, 11, 196, 18);
    for (y = 0; y < 14; y++) for (x = -8 - y; x <= 8 + y; x++) px(c, y === 13 ? 'moss_dark' : tone(ENAMEL, 0.75 - x / (16 + y * 2) * 0.8 - y / 40, 196 + x, 18 + y), 196 + x, 18 + y);
    box(c, 'moss_lit', 188, 18, 10, 1);
    blob(c, 196, 33, 7, 3, GLOW, { bias: 0.4, rim: 0 });
    keeper(c);
    counter(c);
    onCounter(c);
    panelFrame(c);
  }

  // ---- Dialogue (pure: no DOM) ------------------------------------------------------------

  // One line for this visit. Counts the visit and marks a special line as said. Returns a
  // line from D.special, or {id: '', kind: 'small', text} for small talk.
  function pickLine(save, D, hour) {
    var f = save.flags, v = ++f.shopVisits, last = 0, id, i;
    for (id in f.lines) if (f.lines[id] > last) last = f.lines[id];
    if (v - last >= D.gap) {
      for (i = 0; i < D.special.length; i++) {
        var s = D.special[i];
        if (f.lines[s.id] || v < s.after || (s.night && G.sim.clock.isGrey(hour))) continue;
        f.lines[s.id] = v; // the visit it was said on
        return s;
      }
    }
    return { id: '', kind: 'small', text: D.small[(v * 4) % D.small.length] };
  }

  // What the keeper actually says: reversed lines run backwards, repeated lines twice.
  function spoken(line) {
    if (line.kind === 'reverse') return [line.text.split('').reverse().join('')];
    if (line.kind === 'repeat') return [line.text, line.text];
    return [line.text];
  }

  // ---- Scene ----------------------------------------------------------------------------
  var room = null, row = 0, col = 0, t = 0, line_ = null, speech = [], speechH = 0, speechEnd = 0;
  var txt = { name: [], price: '', desc: [], status: [], msg: [], msgKey: 'fog_light', coins: '', badge: [], inUse: [] }, lastCoins = -1;
  var uneaseIn = { loc: 'fog', still: true, atShop: true };

  function item() { return SHELVES[row][col]; }

  function pct(r) { return Math.round((r - 1) * 100); }

  // Fills txt for the selected item: what it is, what it costs, what it does; and for the
  // tiles of its shelf, the count in stock and which one is in use.
  function describe() {
    var it = item(), save = G.state.save, g = G.data.gear, desc = '', next, cur, name = '', status = '', i;
    txt.price = '';
    if (it.kind === 'rod' || it.kind === 'reel' || it.kind === 'line') {
      var tiers = g[E.TIERED[it.kind]];
      cur = tiers[save.gear[it.kind]]; next = E.nextItem(save, it.kind, G.data);
      if (!next) { name = cur.name; status = 'In use. Nothing finer on the shelf.'; }
      else {
        name = next.name; txt.price = next.cost + 'c';
        if (it.kind === 'rod') desc = 'Casts ' + pct(next.castMax / cur.castMax) + '% farther and holds fish up to ' + next.maxMass + ' kg (yours: ' + cur.maxMass + ' kg).';
        if (it.kind === 'reel') desc = 'Reels a tired fish in ' + pct(next.speed / cur.speed) + '% faster.';
        if (it.kind === 'line') desc = 'Tension builds ' + Math.round((1 - cur.strength / next.strength) * 100) + '% slower while a fish pulls.';
        status = 'In use: ' + cur.name + '.';
      }
    } else if (it.kind === 'lantern' || it.kind === 'depthFinder') {
      cur = g[it.kind]; name = cur.name;
      desc = it.kind === 'lantern' ? 'Deep fish show in colour at night, not just as shapes.' : 'Marks the depth every ' + cur.bands + ' m while the lure is down.';
      if (save.gear[it.kind]) status = 'Yours already.'; else txt.price = cur.cost + 'c';
    } else {
      var b = E.baitById(it.id, G.data), have = save.baits[b.id] || 0, on = E.baitInUse(save, G.data).id === b.id;
      name = b.label === false ? '(no label)' : b.name;
      if (b.unlimited) desc = 'Free, and they never run out. Most fish take them.';
      else {
        txt.price = b.pack + ' for ' + b.pack * b.cost + 'c';
        if (b.label === false) desc = 'No label. The jar is warm.';
        else desc = 'Fish turn up ' + pct(b.attract) + '% sooner' + (b.rareBoost > 1 ? ', and rare ones are ' + pct(b.rareBoost) + '% likelier.' : '.');
      }
      status = (b.unlimited ? '' : 'You have ' + have + '. ') + (on ? 'On the hook.' : '');
    }
    txt.name = F.wrap(name, NAME_W);
    txt.desc = F.wrap(desc, DESC_W);
    txt.status = F.wrap(status, DESC_W);
    var shelfItems = SHELVES[row];
    txt.badge.length = 0; txt.inUse.length = 0;
    for (i = 0; i < shelfItems.length; i++) {
      var s = shelfItems[i], badge = '', use = false;
      if (s.kind === 'bait') {
        var bb = E.baitById(s.id, G.data);
        if (!bb.unlimited && save.baits[bb.id] > 0) badge = '' + save.baits[bb.id];
        use = E.baitInUse(save, G.data).id === bb.id;
      } else if (s.kind === 'lantern' || s.kind === 'depthFinder') use = !!save.gear[s.kind];
      txt.badge.push(badge); txt.inUse.push(use);
    }
  }

  function say(s, key) { txt.msg = s ? F.wrap(s, DESC_W) : []; txt.msgKey = key || 'fog_light'; }

  function act() {
    var it = item(), save = G.state.save, r;
    if (it.kind === 'bait') {
      var b = E.baitById(it.id, G.data);
      if (b.unlimited || (save.gear.bait !== b.id && save.baits[b.id] > 0)) { save.gear.bait = b.id; describe(); say('On the hook next cast.'); return; }
      r = E.buyBait(save, b.id, b.pack, G.data);
      if (r === E.OK) save.gear.bait = b.id;
    } else r = E.buy(save, it.kind, G.data);
    describe();
    if (r === E.OK) { G.core.save.autosave('purchase'); say('Thank you kindly.', 'neon_teal'); }
    else if (r === E.POOR) say('Not enough coins.', 'signal_amber');
    else if (r === E.MAXED) say('Nothing finer on the shelf.');
  }

  function enter() {
    var save = G.state.save;
    if (!room) room = G.gfx.bake.cached('shop:room640', function () { return G.gfx.bake.layer(640, 360, paintRoom); });
    if (!coin) coin = G.gfx.bake.layer(8, 8, paintCoin);
    row = 0; col = 0; t = 0;
    line_ = pickLine(save, G.data.dialogue, save.clock);
    speech.length = 0;
    var said = spoken(line_);
    for (var i = 0; i < said.length; i++) {
      var ls = F.wrap(said[i], BUBBLE_W - 14);
      for (var k = 0; k < ls.length; k++) speech.push({ s: ls[k], w: F.measure(ls[k]), y: speech.length * F.LINE_H + i * 6, at: 0 });
    }
    // Each line starts revealing when the one before it is done; a repeat waits a beat first.
    var at = 0.3;
    for (i = 0; i < speech.length; i++) {
      if (i > 0 && speech[i].y - speech[i - 1].y > F.LINE_H) at += 1.2;
      speech[i].at = at; at += speech[i].w / REVEAL;
    }
    speechEnd = at;
    speechH = speech.length ? speech[speech.length - 1].y + F.LINE_H : 0;
    describe();
    say('');
  }

  function exit() {}

  function update(dt) {
    var save = G.state.save, inp = G.core.input;
    t += dt;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    uneaseIn.loc = G.state.run.loc;
    G.sim.unease.step(save, uneaseIn, dt, G.rng, G.data);
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    var ud = M.axis('up', 'down'), lr = M.axis('left', 'right');
    if (ud || lr) {
      if (ud) { row = (row + ud + SHELVES.length) % SHELVES.length; col = Math.min(col, SHELVES[row].length - 1); }
      col = Math.max(0, Math.min(SHELVES[row].length - 1, col + lr));
      describe();
      say('');
    }
    if (inp.pressed('action')) act();
  }

  // A bevelled tile: lit on the top and left, shaded on the bottom and right; amber when chosen.
  function tile(ctx, x, y, w, h, sel, fill) {
    ctx.fillStyle = P.ink; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    if (sel) { ctx.fillStyle = P.signal_amber; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
    ctx.fillStyle = P[fill || 'wood']; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = P.wood_mid; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = P.wood_dark; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  }

  function lines(ctx, ls, x, y, max, key) {
    for (var i = 0; i < ls.length && i < max; i++) F.drawText(ctx, ls[i], x, y + i * F.LINE_H, key);
  }

  function draw(ctx) {
    var save = G.state.save, i, x, img;
    ctx.drawImage(room, 0, 0);

    // The keeper blinks now and then, and her mouth moves while her words come out (fixed
    // rhythms from the scene's time; no RNG in draw).
    if ((t % 4.3) > 4.15) {
      ctx.fillStyle = P.flesh; ctx.fillRect(EYE_L - 2, EYE_Y - 2, 5, 4); ctx.fillRect(EYE_R - 2, EYE_Y - 2, 5, 4);
      ctx.fillStyle = P.skin_shadow; ctx.fillRect(EYE_L - 3, EYE_Y + 1, 7, 1); ctx.fillRect(EYE_R - 3, EYE_Y + 1, 7, 1);
    }
    if (speech.length && t > speech[0].at && t < speechEnd && ((t * 9) | 0) % 2) {
      ctx.fillStyle = P.flesh_dark; ctx.fillRect(MOUTH_X - 4, MOUTH_Y - 1, 9, 4);
      ctx.fillStyle = P.ink; ctx.fillRect(MOUTH_X - 3, MOUTH_Y, 7, 2);
      ctx.fillStyle = P.crimson; ctx.fillRect(MOUTH_X - 1, MOUTH_Y + 1, 3, 1);
    }

    // Speech, revealed left to right, on a card beside her head.
    if (speech.length) {
      var bx = BUBBLE_X, by = BUBBLE_Y, bw = BUBBLE_W, bh = speechH + 12;
      ctx.fillStyle = P.wood_deep; ctx.fillRect(bx - 1, by + 1, bw + 2, bh); ctx.fillRect(bx + 1, by - 1, bw - 2, bh + 2);
      ctx.fillStyle = P.cream; ctx.fillRect(bx, by + 1, bw, bh - 2); ctx.fillRect(bx + 1, by, bw - 2, bh);
      ctx.fillStyle = P.paper; ctx.fillRect(bx + 1, by + bh - 3, bw - 2, 2); ctx.fillRect(bx + bw - 3, by + 2, 2, bh - 3);
      var ty = by + bh - 10; // the tail points back toward her face
      for (i = 0; i < 9; i++) { ctx.fillStyle = P.wood_deep; ctx.fillRect(bx - 1 - i, ty + i, 1, 1); ctx.fillRect(bx - i, ty + i - 1 - (i >> 1), 1, 1); ctx.fillStyle = P.cream; ctx.fillRect(bx - i, ty + i - (i >> 1), 1, (i >> 1) + 1); }
      for (i = 0; i < speech.length; i++) {
        var sp = speech[i], w = Math.min(sp.w + 1, Math.max(0, (t - sp.at) * REVEAL));
        if (w <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(bx + 7, by + 6 + sp.y, w, F.LINE_H); ctx.clip();
        F.drawText(ctx, sp.s, bx + 7, by + 6 + sp.y, line_.kind === 'reverse' ? 'crimson' : 'wood_deep');
        ctx.restore();
      }
    }

    // Tabs, one per shelf; the open one joins the panel.
    for (i = 0; i < TABS.length; i++) {
      x = TAB_X + i * TAB_STEP; var on = i === row, th = PY - TAB_Y;
      ctx.fillStyle = P.ink; ctx.fillRect(x - 4, TAB_Y - 4, TAB_W + 8, th + 1);
      ctx.fillStyle = P[on ? 'rust_hi' : 'rust']; ctx.fillRect(x - 3, TAB_Y - 3, TAB_W + 6, th);
      ctx.fillStyle = P[on ? 'rust_dark' : 'wood_deep']; ctx.fillRect(x, TAB_Y, TAB_W, th + (on ? 3 : -3));
      if (on) { ctx.fillStyle = P.rust_dark; ctx.fillRect(x - 3, PY - 3, TAB_W + 6, 3); }
      img = icon(TABS[i].icon, 1);
      if (!on) ctx.globalAlpha = 0.55;
      ctx.drawImage(img, x + ((TAB_W - 32) >> 1), TAB_Y + ((th - 32) >> 1) + (on ? 1 : -1));
      ctx.globalAlpha = 1;
    }

    // Shelf name and coins.
    F.bold(ctx, TABS[row].name, PX + 10, PY + 10, 'signal_amber');
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '' + save.coins; }
    x = PX + PW - 10 - F.measureBold(txt.coins);
    F.bold(ctx, txt.coins, x, PY + 10, 'bone');
    ctx.drawImage(coin, x - 12, PY + 10);

    // The selected item, painted large, with its name and price beside it.
    var it = item();
    tile(ctx, PX + 8, PY + 28, 76, 76, false, 'wood_mid');
    ctx.drawImage(icon(it.icon, 2), PX + 14, PY + 34);
    tile(ctx, PX + 92, PY + 28, PW - 100, 76, false, 'wood');
    for (i = 0; i < txt.name.length && i < 3; i++) F.bold(ctx, txt.name[i], PX + 99, PY + 35 + i * F.LINE_H, 'bone');
    if (txt.price) F.bold(ctx, txt.price, PX + 99, PY + 88, 'signal_amber');
    lines(ctx, txt.desc, PX + 8, DESC_Y, 5, 'paper');
    if (txt.msg.length) lines(ctx, txt.msg, PX + 8, STATUS_Y, 2, txt.msgKey);
    else lines(ctx, txt.status, PX + 8, STATUS_Y, 2, 'fog_light');

    // The shelf's items as tiles.
    var items = SHELVES[row], n = items.length, gx = PX + ((PW - n * TILE - (n - 1) * TILE_GAP) >> 1);
    for (i = 0; i < n; i++) {
      x = gx + i * (TILE + TILE_GAP);
      tile(ctx, x, GRID_Y, TILE, TILE, i === col, 'wood_mid');
      var dimmed = (items[i].kind === 'lantern' || items[i].kind === 'depthFinder') && txt.inUse[i];
      if (dimmed) ctx.globalAlpha = 0.45;
      ctx.drawImage(icon(items[i].icon, 1), x + 7, GRID_Y + 7);
      ctx.globalAlpha = 1;
      if (txt.inUse[i]) { ctx.fillStyle = P.ink; ctx.fillRect(x + 3, GRID_Y + 3, 6, 6); ctx.fillStyle = P.neon_teal; ctx.fillRect(x + 4, GRID_Y + 4, 4, 4); }
      if (txt.badge[i]) {
        var bw2 = F.measureBold(txt.badge[i]);
        ctx.fillStyle = P.ink; ctx.fillRect(x + TILE - bw2 - 6, GRID_Y + TILE - 13, bw2 + 5, 11);
        F.bold(ctx, txt.badge[i], x + TILE - bw2 - 3, GRID_Y + TILE - 12, 'bone');
      }
    }

    F.drawText(ctx, FOOT1, PX + ((PW - FOOT1_W) >> 1), PY + PH - 30, 'fog_light');
    F.drawText(ctx, FOOT2, PX + ((PW - FOOT2_W) >> 1), PY + PH - 17, 'fog_light');
  }
  var FOOT1 = 'W/S shelf   A/D item', FOOT2 = 'SPACE buy   ESC leave', FOOT1_W = F.measure(FOOT1), FOOT2_W = F.measure(FOOT2);

  return {
    native: true,
    enter: enter, exit: exit, update: update, draw: draw, pickLine: pickLine, spoken: spoken,
    line: function () { return line_; },
    select: function (r, c) { row = r; col = c; describe(); return txt.name.join(' '); },
    act: function () { act(); return txt.msg.join(' '); },
    text: function () { return txt; },
    icon: icon
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var f = G.state.save && G.state.save.flags, l = G.ui.shop.line();
  if (!f) return 'shop: -';
  return 'shop visits ' + f.shopVisits + '  special said ' + Object.keys(f.lines).join(',') + (l && G.core.state.sceneName() === 'shop' ? '  now ' + (l.id || 'small') : '');
});
