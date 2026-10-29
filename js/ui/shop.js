var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop (9.4, V9, V10.7), drawn at 640×360. A scene reached from the map. The left
// of the screen is a baked, painted interior after the user's Cast n Chill reference, worn
// down: dim plank walls under a hanging lamp, pegboards of lure packets, mounted trophies,
// the RUSTY'S sign, cobwebs, and Rusty himself leaning on the counter. The right is the shop
// panel: a tab per shelf (gear tiers, equipment, bait), the selected item large with its
// practical effect, and the shelf as a grid of pegs. Rusty says one line per visit
// (data/dialogue.js). Time passes here and unease drains (V10.1). Esc or M goes back out.
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

  // Panel layout (the right of the screen), after the reference: tabs, the shelf's name and
  // the coins, the selected item beside its name and effect, then a grid of five columns
  // (a shelf with fewer items shows its other pegs empty).
  var PX = 406, PY = 44, PW = 228, PH = 310;
  var TAB_X = 424, TAB_STEP = 64, TAB_W = 56, TAB_Y = 6;
  var TILE = 40, TILE_GAP = 5, GRID_COLS = 5, GRID_ROWS = 3, GRID_Y = PY + 150;
  var NAME_W = 112, DESC_W = 112, STATUS_Y = PY + 114, STATUS_W = 212;
  // Rusty's face, for the blink and the mouth drawn over the baked room.
  var CX = 212, EYE_L = 197, EYE_R = 227, EYE_Y = 95, MOUTH_X = 212, MOUTH_Y = 128;
  var BUBBLE_X = 272, BUBBLE_Y = 8, BUBBLE_W = 122;
  var ASH_X = 313, ASH_Y = 256;

  // Ramps, dark to light.
  var WALL = ['ink', 'wood_deep', 'wood_dark', 'wood', 'wood_mid'];
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
  var SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi', 'skin_lit'];
  var BEARD = ['stone', 'stone_hi', 'birch', 'hair_lit', 'bone'];
  var CAP = ['reed', 'reed_hi', 'paper_dark', 'paper', 'bone'];
  var DENIM = ['wood_dark', 'reed', 'reed_hi', 'paper_dark', 'paper'];
  var CANVAS = ['reed', 'reed_hi', 'paper_dark', 'paper', 'bone'];
  var STONE = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var ENAMEL = ['moss_dark', 'moss', 'moss_hi', 'moss_lit'];
  var CUP = ['paper_dark', 'paper', 'bone', 'cream'];
  var RUST = ['rust_dark', 'rust', 'rust_hi', 'flame'];
  var GLOW = ['signal_amber', 'lamp_glow', 'cream'];
  var LINE = ['water_mid', 'water_hi', 'water_foam', 'fog_light'];
  var WORM = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'];
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'];
  var TEAL = ['teal_dark', 'teal', 'teal_hi', 'teal_lit'];

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

  // Light from the hanging lamp: 1 under the shade, 0 at the corners. The shop is kept dim.
  function lampLight(x, y) {
    var dx = (x - 194) / 230, dy = (y - 30) / 250;
    return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * 0.9;
  }

  // A capsule from (x0, y0) to (x1, y1) of radius r, coloured by fn(x, y, v) with v the light
  // across it (lit on the upper left): sleeves and forearms that keep their cloth pattern.
  function capsule(c, x0, y0, x1, y1, r, fn) {
    var dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, x, y;
    for (y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
      for (x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
        var t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2)), ex = x - (x0 + t * dx), ey = y - (y0 + t * dy);
        if (ex * ex + ey * ey > r * r) continue;
        var k = fn(x, y, 0.55 + (-ex * 0.6 - ey * 0.7) / r * 0.45);
        if (k) px(c, k, x, y);
      }
    }
  }

  // Flannel: a faded red check, darker in shadow and lighter where the lamp reaches.
  var DARKER = { flame: 'rust_hi', rust_hi: 'rust', rust: 'rust_dark', rust_dark: 'wood_deep', wood_deep: 'ink', ink: 'ink' };
  var LIGHTER = { ink: 'wood_deep', wood_deep: 'rust_dark', rust_dark: 'rust', rust: 'rust_hi', rust_hi: 'rust_hi' };
  function flannel(x, y, v) {
    var cx = (x + 300) % 14, cy = (y + 300) % 14, a = cx < 3, b = cy < 3;
    var k = a && b ? 'wood_deep' : (a || b ? 'rust_dark' : ((cx === 8 || cy === 8) ? 'rust_hi' : 'rust'));
    if (v < 0.32) k = DARKER[k]; else if (v > 0.8) k = LIGHTER[k];
    return k;
  }

  // Vertical planks, dim, the lamp's pool stepping plank by plank; grain, knots and nails.
  function paintWall(c) {
    A.area(c, 0, 10, 640, 256, function (x, y) {
      var p = (x / 22) | 0, lx = x % 22, L = lampLight(p * 22 + 11, y);
      var v = 0.1 + 0.72 * L + (hash(p, 7) - 0.5) * 0.1;
      if ((lx === 6 || lx === 15) && hash(p * 31 + lx, (y / 17) | 0) < 0.6) v -= 0.13;   // grain
      var kx = 4 + hash(p, 11) * 14, ky = 30 + hash(p, 13) * 200, kd = ((lx - kx) * (lx - kx)) / 6 + ((y - ky) * (y - ky)) / 3;
      if (kd < 1) v -= 0.16; else if (kd < 2.2) v -= 0.06;                               // a knot
      if (lx === 1) v += 0.07; if (lx === 20) v -= 0.07;
      return lx === 0 ? (L > 0.55 ? 'wood_dark' : (L > 0.25 ? 'wood_deep' : 'ink')) : tone(WALL, v, x, y);
    });
    for (var n = 0; n < 640; n += 22) { px(c, 'stone', n + 11, 14); px(c, 'stone_hi', n + 10, 13); }
    slab(c, 0, 0, 640, 10, WOOD); box(c, 'ink', 0, 10, 640, 1); box(c, 'wood_deep', 0, 11, 640, 1);
  }

  // Cobwebs: a few spokes from a corner and threads across them.
  function cobweb(c, x0, y0, dir, size) {
    for (var k = 0; k < 5; k++) line(c, 'fog_mid', x0, y0, x0 + dir * Math.round(size * (1 - k * 0.2)), y0 + Math.round(size * k * 0.25));
    for (var r = 1; r < 4; r++) { var s = size * r / 4; line(c, 'fog_dark', x0 + dir * Math.round(s), y0, x0 + dir * Math.round(s * 0.55), y0 + Math.round(s * 0.55)); line(c, 'fog_dark', x0 + dir * Math.round(s * 0.55), y0 + Math.round(s * 0.55), x0, y0 + Math.round(s * 0.9)); }
  }

  // A shelf: lit top, front board, brackets and a shadow on the wall below.
  function shelf(c, x, y, w) {
    box(c, 'wood_lit', x, y, w, 1); box(c, 'wood_hi', x, y + 1, w, 2); box(c, 'wood_mid', x, y + 3, w, 4); box(c, 'wood_dark', x, y + 7, w, 1);
    box(c, 'ink', x, y + 8, w, 1); box(c, 'wood_deep', x, y + 9, w, 2);
    for (var b = 0; b < 2; b++) { var bx = b ? x + w - 10 : x + 6; for (var k = 0; k < 8; k++) box(c, k < 7 ? 'wood_dark' : 'ink', bx, y + 8 + k, 4 - (k >> 1), 1); }
  }

  // Lure packets on a pegboard: printed card, a blister with the lure, the peg.
  var INKS = ['rust_hi', 'water_hi', 'moss_hi', 'dusk_rose', 'signal_amber', 'teal_hi', 'leaf_gold', 'crimson'];
  function packet(c, x, y, n) {
    var w = 18, h = 28, head = INKS[(n * 5 + 1) % INKS.length], lure = INKS[(n * 3 + 2) % INKS.length], faded = n % 5 === 3;
    box(c, 'stone', x + 8, y - 6, 2, 6); px(c, 'stone_lit', x + 8, y - 6);
    box(c, 'ink', x - 1, y - 1, w + 2, h + 2);
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) px(c, tone(faded ? ['reed_hi', 'paper_dark'] : CUP, 0.7 - xx / w * 0.35, x + xx, y + yy), x + xx, y + yy);
    box(c, faded ? 'paper_dark' : head, x, y, w, 6); box(c, 'cream', x + 2, y + 2, 9, 1); box(c, 'ink', x + 7, y + 1, 4, 2);
    box(c, 'fog_dark', x + 2, y + 8, w - 4, h - 13); box(c, 'fog_mid', x + 3, y + 9, w - 6, h - 15); box(c, 'fog_light', x + 3, y + 10, 1, 4);
    var ly = y + 12 + (n % 3);
    if (n % 7 !== 4) {                       // one blister is empty: sold, or never stocked
      blob(c, x + 9, ly, 4.5, 2, [lure === 'signal_amber' ? 'rust' : 'ink', lure, 'cream'], { bias: 0.05 });
      px(c, 'ink', x + 6, ly - 1); px(c, 'cream', x + 6, ly);
      line(c, 'stone_lit', x + 13, ly, x + 15, ly + 2); line(c, 'stone_lit', x + 9, ly + 2, x + 9, ly + 4);
    }
    box(c, 'paper_dark', x + 2, y + h - 4, w - 4, 1); box(c, 'paper_dark', x + 2, y + h - 2, w - 8, 1);
  }
  function pegboard(c, x0, y0, w, h, cols, rows, n0) {
    box(c, 'ink', x0 - 2, y0 - 2, w + 4, h + 4);
    A.area(c, x0, y0, w, h, function (x, y) {
      if ((x - x0) % 6 === 3 && (y - y0) % 6 === 3) return 'wood_deep';
      return tone(['wood_dark', 'wood', 'wood_mid', 'wood_hi'], 0.2 + lampLight(x, y) * 0.8, x, y);
    });
    slab(c, x0 - 2, y0 - 2, w + 4, 3, WOOD); box(c, 'wood_deep', x0, y0 + h - 1, w, 1);
    var cw = Math.floor((w - 6) / cols), rh = Math.floor((h - 10) / rows);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) packet(c, x0 + 4 + i * cw + ((cw - 20) >> 1), y0 + 12 + j * rh, n0 + j * cols + i);
  }

  // A trophy from the roster (painted at its size by fishgen.portrait), on a varnished plaque.
  function trophy(c, id, cx, cy, maxW, maxH) {
    var fish = G.data.fish, i, sp = 0;
    for (i = 0; i < fish.length; i++) if (fish[i].id === id) sp = i;
    var img = G.gfx.fishgen.portrait(sp, maxW - 16, maxH, false);
    var w = img.width + 18, h = img.height + 18, x = cx - (w >> 1), y = cy - (h >> 1);
    box(c, 'ink', x - 1, y + 3, w + 2, h);
    A.area(c, x, y, w, h, function (xx, yy) {
      var ex = Math.min(xx - x, x + w - 1 - xx), ey = Math.min(yy - y, y + h - 1 - yy);
      if (ex + ey < 5) return '';
      if (ex < 2 || ey < 2) return (xx - x < 2 || yy - y < 2) ? 'wood_lit' : 'wood_deep';
      return ex < 5 || ey < 5 ? 'wood_hi' : 'wood_mid';
    });
    slab(c, cx - 14, y + h - 8, 28, 5, BRASS);
    c.drawImage(img, cx - (img.width >> 1), y + 6);
  }

  // Rusty (an original take on the old tackle-shop owner): a big, tired old man in a faded
  // cap, glasses and a yellowed beard, a red flannel shirt and patched overalls, one hand on
  // his hip and the other flat on the counter. Sloping shoulders, a belly, a drinker's nose.
  function rusty(c) {
    var cx = CX, x, y;
    // The shirt: sloping shoulders down to a belly.
    A.area(c, cx - 76, 140, 152, 126, function (xx, yy) {
      var hw = yy < 176 ? 26 + (yy - 146) * 1.45 : 69 + 6 * Math.sin(Math.min(1, (yy - 176) / 90) * Math.PI);
      var dx = xx - cx;
      if (yy < 146 || Math.abs(dx) > hw) return '';
      return flannel(xx, yy, 0.62 - dx / hw * 0.35 - (yy - 146) / 420 - (Math.abs(dx) > hw - 4 ? 0.2 : 0));
    });
    // The overalls: a bib on straps with brass buckles, a pocket, a sewn patch, an oil stain.
    A.area(c, cx - 46, 180, 92, 86, function (xx, yy) {
      var hw = 29 + Math.max(0, yy - 214) * 0.33, dx = xx - cx;
      if (Math.abs(dx) > hw) return '';
      var v = 0.66 - dx / hw * 0.28 + (Math.abs(dx) > hw - 2 ? -0.3 : 0) + (yy < 183 ? 0.12 : 0);
      return tone(DENIM, v, xx, yy);
    });
    for (y = 186; y < 266; y += 3) { px(c, 'reed', cx - 26 - Math.max(0, y - 214) * 0.33 | 0, y); px(c, 'reed', cx + 26 + Math.max(0, y - 214) * 0.33 | 0, y); } // stitching
    for (y = 146; y < 184; y++) { var sx = Math.round((184 - y) * 0.3); box(c, 'paper_dark', cx - 31 - sx, y, 6, 1); box(c, 'reed', cx - 31 - sx, y, 1, 1); box(c, 'reed_hi', cx + 25 + sx, y, 6, 1); box(c, 'reed', cx + 30 + sx, y, 1, 1); }
    slab(c, cx - 31, 182, 8, 7, BRASS); slab(c, cx + 23, 182, 8, 7, BRASS);
    slab(c, cx - 18, 198, 36, 22, DENIM); for (x = -16; x < 16; x += 3) px(c, 'reed', cx + x, 200);
    limb(c, cx - 9, 190, cx - 9, 200, 1.2, RUST, 0.1); px(c, 'ink', cx - 9, 189);
    limb(c, cx + 6, 192, cx + 10, 200, 1, STONE, 0.2);
    slab(c, cx + 12, 232, 16, 14, ['reed', 'reed_hi', 'paper_dark']); for (x = 0; x < 16; x += 2) { px(c, 'wood_dark', cx + 12 + x, 233); px(c, 'wood_dark', cx + 12 + x, 244); }
    blob(c, cx - 18, 250, 7, 4, ['wood_dark', 'reed', 'reed_hi'], { rim: 0, bias: -0.2 });
    // Arms: sleeves rolled to the elbow, forearms; the left hand on his hip.
    capsule(c, cx - 60, 182, cx - 80, 220, 14, flannel);
    capsule(c, cx + 62, 182, cx + 90, 224, 15, function (xx, yy, v) { return flannel(xx, yy, v - 0.25); });
    capsule(c, cx - 80, 220, cx - 56, 246, 10, function (xx, yy, v) { return tone(SKIN, v, xx, yy); });
    capsule(c, cx + 90, 224, cx + 66, 258, 11, function (xx, yy, v) { return tone(SKIN, v - 0.12, xx, yy); });
    for (var k = 0; k < 7; k++) { px(c, 'skin_shadow', cx - 74 + k * 3, 226 + k * 3); px(c, 'skin_shadow', cx + 82 - k * 3, 232 + k * 3); } // arm hair
    capsule(c, cx - 84, 216, cx - 74, 226, 12, function (xx, yy, v) { return flannel(xx, yy, v + 0.3); });   // the rolled cuffs
    capsule(c, cx + 94, 220, cx + 82, 230, 13, function (xx, yy, v) { return flannel(xx, yy, v + 0.1); });
    blob(c, cx - 53, 248, 10, 9, SKIN, { bias: 0.05 });
    for (k = 0; k < 3; k++) line(c, 'skin_shadow', cx - 59 + k * 5, 242, cx - 57 + k * 5, 254);
    // The head: hair tufts and ears under the cap, the face, the beard and moustache.
    blob(c, cx - 45, 92, 8, 13, BEARD, { bias: -0.05 }); blob(c, cx + 45, 92, 8, 13, BEARD, { bias: -0.2 });
    blob(c, cx - 43, 101, 6, 9, SKIN, { bias: 0.1 }); blob(c, cx + 43, 101, 6, 9, SKIN, { bias: -0.1 });
    blob(c, cx, 98, 40, 28, SKIN, { bias: 0.12, rim: 0.2 });
    A.area(c, cx - 50, 86, 100, 82, function (xx, yy) {
      var dx = xx - cx, ry = 44 + 4 * Math.sin(dx / 5.5) - Math.abs(dx) * 0.05, e = (dx * dx) / (49 * 49) + ((yy - 118) * (yy - 118)) / (ry * ry);
      if (e > 1) return '';
      if (yy < 108 && Math.abs(dx) < 33) return '';
      if (yy < 112 && Math.abs(dx) < 33 - (112 - yy) * 2) return '';
      var v = 0.62 - dx / 120 - (yy - 108) / 160 + (((xx + ((yy / 6) | 0) * 2) % 6 === 0) ? -0.22 : 0) + (((xx * 3 + yy) % 13 === 0) ? 0.15 : 0);
      var k2 = tone(BEARD, v, xx, yy);
      return (yy > 150 && (xx + yy) % 9 === 0) ? 'paper' : k2;      // yellowed at the ends
    });
    blob(c, cx - 13, 121, 16, 7, BEARD, { bias: 0.15 }); blob(c, cx + 13, 121, 16, 7, BEARD, { bias: 0 });
    limb(c, cx - 26, 123, cx - 31, 134, 3.5, BEARD, 0); limb(c, cx + 26, 123, cx + 31, 134, 3.5, BEARD, -0.15);
    for (x = -24; x <= 24; x += 3) line(c, 'stone_hi', cx + x, 117, cx + x + (x < 0 ? -1 : 1), 126);
    box(c, 'flesh_dark', MOUTH_X - 5, MOUTH_Y, 10, 2);
    // A big red nose, rosy cheeks, the eyes tired and bagged, the brows drooping.
    blob(c, cx, 108, 10, 9, SKIN, { bias: 0.05 });
    blob(c, cx + 1, 111, 6, 4, ['skin_shadow', 'dusk_rose', 'rug_hi'], { bias: 0.05, rim: 0 });
    px(c, 'skin_lit', cx - 4, 104); px(c, 'skin_lit', cx - 3, 104); px(c, 'skin_lit', cx - 4, 105);
    box(c, 'flesh_dark', cx - 5, 115, 3, 1); box(c, 'flesh_dark', cx + 3, 115, 3, 1);
    box(c, 'dusk_rose', cx - 30, 106, 8, 3); box(c, 'dusk_rose', cx + 22, 106, 8, 3);
    for (var e = 0; e < 2; e++) {
      var ex = e ? EYE_R : EYE_L;
      box(c, 'skin_shadow', ex - 4, EYE_Y - 2, 9, 1);
      box(c, 'cream', ex - 3, EYE_Y - 1, 7, 2); box(c, 'ink', ex - 1, EYE_Y - 1, 3, 2);
      box(c, 'skin_shadow', ex - 3, EYE_Y + 2, 7, 1); box(c, 'skin_shadow', ex - 2, EYE_Y + 3, 5, 1);   // bags
      for (x = -9; x <= 9; x++) { var by = EYE_Y - 9 + Math.round(Math.abs(x) * (e ? (x > 0 ? 0.35 : 0.1) : (x < 0 ? 0.35 : 0.1))); px(c, 'birch', ex + x, by); px(c, 'stone_hi', ex + x, by + 1); if (x % 2) px(c, 'hair_lit', ex + x, by - 1); }
    }
    // Glasses: two rounded frames, a bridge, the arms to the ears, a glint.
    for (e = 0; e < 2; e++) {
      ex = e ? EYE_R : EYE_L;
      for (y = -7; y <= 7; y++) for (x = -11; x <= 11; x++) {
        var q = Math.pow(Math.abs(x) / 11, 4) + Math.pow(Math.abs(y) / 7, 4);
        if (q <= 1 && q > 0.62) px(c, y < -2 && x < 0 ? 'stone_lit' : (y > 3 ? 'ink' : 'stone_dark'), ex + x, EYE_Y + y);
      }
      line(c, 'fog_light', ex - 7, EYE_Y - 3, ex - 4, EYE_Y - 6);
    }
    box(c, 'stone_dark', EYE_L + 11, EYE_Y - 2, EYE_R - EYE_L - 22, 2);
    line(c, 'stone_dark', EYE_L - 11, EYE_Y - 2, cx - 39, EYE_Y - 1); line(c, 'stone_dark', EYE_R + 11, EYE_Y - 2, cx + 39, EYE_Y - 1);
    // The cap: faded canvas crown with seams and a peeling patch, a sweat stain, the brim.
    A.area(c, cx - 46, 50, 92, 32, function (xx, yy) {
      var dx = (xx - cx + 1) / 44, dy = (80 - yy) / 29;
      if (Math.pow(Math.abs(dx), 3) + Math.pow(dy, 2.4) > 1 || yy > 80) return '';
      var v = 0.64 - dx * 0.25 - dy * 0.3 + (Math.pow(Math.abs(dx), 3) + Math.pow(dy, 2.4) > 0.86 ? -0.25 : 0);
      if (Math.abs(xx - cx - 16) < 1 || Math.abs(xx - cx + 17) < 1) v -= 0.18;
      return tone(CAP, v, xx, yy);
    });
    blob(c, cx + 27, 66, 7, 6, ['reed', 'reed_hi'], { rim: 0, bias: -0.2 });                            // a sweat stain
    box(c, 'reed_hi', cx - 2, 51, 4, 2);                                                               // the button
    blob(c, cx - 1, 68, 13, 8, ['rust_dark', 'rust', 'rust_hi'], { rim: 0.4 });
    blob(c, cx - 2, 68, 9, 5, CUP, { rim: 0 });
    blob(c, cx - 2, 68, 5, 2, ['water_mid', 'water_hi'], { rim: 0 }); px(c, 'water_mid', cx + 4, 67); px(c, 'water_mid', cx + 4, 69); px(c, 'ink', cx - 5, 67);
    for (x = 0; x < 4; x++) px(c, 'paper_dark', cx + 8 + x, 62 + x);                              // the patch's corner lifting
    // The brim: a curved bill toward us, lit on top, its underside dark.
    for (x = -56; x <= 58; x++) {
      var u = x / 57, top = Math.round(78 + 3 * (1 - u * u)), th = Math.round(3 + 5 * (1 - u * u));
      for (y = 0; y < th; y++) px(c, y < 2 ? (x < -20 ? 'bone' : 'paper') : (y < th - 1 ? 'paper_dark' : 'reed'), cx + x, top + y);
    }
    box(c, 'skin_shadow', cx - 36, 88, 72, 1);                                                       // the brim's shadow
  }

  function counter(c) {
    var x, y, i;
    A.area(c, 0, 264, 400, 13, function (xx, yy) {
      var r = yy - 264;
      return r === 0 ? 'wood_lit' : (r < 9 ? tone(WOOD, 0.5 + (lampLight(xx, yy) > 0.4 ? 0.2 : 0) + (hash(xx >> 4, yy) < 0.18 ? -0.2 : 0), xx, yy) : (r === 9 ? 'wood_hi' : 'wood_dark'));
    });
    box(c, 'ink', 0, 277, 400, 1);
    A.area(c, 0, 278, 400, 82, function (xx, yy) {
      var bx = xx % 28, bv = 0.3 + (hash((xx / 28) | 0, 5) - 0.5) * 0.1 + (bx === 1 ? 0.16 : 0) + (bx === 27 ? -0.16 : 0) + ((bx === 9 || bx === 19) && hash(xx, (yy / 21) | 0) < 0.5 ? -0.16 : 0);
      return bx === 0 ? 'ink' : tone(WOOD, bv, xx, yy);
    });
    slab(c, 0, 282, 400, 5, WOOD); box(c, 'ink', 0, 287, 400, 1);
    // An open cubby with a row of bait jars, labels half peeled.
    box(c, 'ink', 116, 292, 280, 46);
    box(c, 'wood_deep', 117, 295, 278, 37); for (x = 117; x < 395; x += 32) box(c, 'ink', x, 295, 1, 37);
    slab(c, 116, 332, 280, 6, WOOD); box(c, 'ink', 116, 338, 280, 1);
    var LID = [RUST, STONE, BRASS, ENAMEL], FILL = [['moss_dark', 'moss'], ['rust_dark', 'rust'], ['wood_deep', 'wood_dark'], ['blood', 'crimson'], ['stone_dark', 'stone'], ['teal_dark', 'teal']];
    for (i = 0; i < 8; i++) {
      var jx = 124 + i * 34, jh = 26 + (i % 3) * 3, jy = 332 - jh, f = FILL[(i * 5) % FILL.length];
      for (y = jy + 4; y < 332; y++) for (x = 0; x < 24; x++) {
        var nx = (x - 12) / 12, k = Math.abs(nx) > 0.88 ? 'fog_dark' : tone(f, 0.6 - nx * 0.5, jx + x, y);
        if (y < jy + 8 && Math.abs(nx) < 0.88) k = 'fog_dark';
        px(c, k, jx + x, y);
      }
      box(c, 'fog_mid', jx + 3, jy + 6, 1, jh - 10);
      slab(c, jx + 1, jy, 22, 5, LID[i % LID.length]);
      if (i % 4 !== 2) { slab(c, jx + 4, jy + 12, 16, 10, CUP); F.drawText(c, i % 3 ? 'XL' : '??', jx + 6, jy + 13, 'wood_dark'); }
      else { slab(c, jx + 4, jy + 16, 9, 6, CUP); line(c, 'paper', jx + 13, jy + 16, jx + 17, jy + 13); }   // peeled
    }
    // The first-aid poster, faded and torn at a corner, taped to the front.
    box(c, 'ink', 9, 294, 98, 58);
    A.area(c, 10, 295, 96, 56, function (xx, yy) {
      if (xx > 92 - (yy - 295) && yy < 300) return '';                                      // the torn corner
      return tone(CUP, 0.82 - (xx - 10) / 300 - (yy - 295) / 220, xx, yy);
    });
    box(c, 'fog_light', 12, 291, 14, 7); box(c, 'fog_mid', 12, 297, 14, 1);
    slab(c, 18, 304, 22, 22, ['blood', 'crimson', 'rug_hi']); box(c, 'cream', 26, 307, 6, 16); box(c, 'cream', 21, 312, 16, 6);
    F.bold(c, 'FIRST', 46, 304, 'crimson'); F.bold(c, 'AID', 46, 316, 'crimson');
    F.drawText(c, 'kit is empty', 18, 334, 'wood', 0.4, 3);
    blob(c, 84, 340, 8, 4, ['paper_dark', 'paper'], { rim: 0, bias: -0.2 });
  }

  // What stands on the counter, in front of him: his hand, the register (its display stuck
  // at 3:33), a jar of worms, an ashtray (its smoke is drawn live), a ledger and a pencil.
  function onCounter(c) {
    var x, y, k;
    blob(c, CX + 62, 262, 16, 6, SKIN, { bias: 0 });
    for (k = 0; k < 4; k++) capsule(c, CX + 52 + k * 7, 264, CX + 50 + k * 7, 273, 2.8, function (xx, yy, v) { return tone(SKIN, v - 0.05, xx, yy); });
    line(c, 'skin_shadow', CX + 50, 262, CX + 76, 262); box(c, 'leaf_gold', CX + 64, 266, 3, 2);         // a ring
    // Register: a cream body with keys and a drawer, its display stuck at 3:33.
    A.area(c, 30, 200, 100, 64, function (xx, yy) {
      if (yy < 218 && xx < 30 + (218 - yy) * 0.9) return '';
      return tone(CUP, 0.82 - (xx - 30) / 160 + (yy < 218 ? 0.1 : -0.06) + (xx === 30 || yy === 263 ? -0.5 : 0), xx, yy);
    });
    box(c, 'ink', 70, 202, 52, 14); box(c, 'wood_deep', 71, 203, 50, 12);
    F.drawText(c, '3:33', 96 - (F.measure('3:33') >> 1), 204, 'signal_amber');
    for (var r = 0; r < 2; r++) for (k = 0; k < 7; k++) slab(c, 46 + k * 11 - r * 3, 220 + r * 5, 8, 3, (r + k) % 5 ? STONE : RUST);
    slab(c, 34, 236, 94, 20, CUP); box(c, 'paper_dark', 34, 236, 94, 1); slab(c, 70, 243, 20, 4, BRASS);
    box(c, 'ink', 30, 263, 100, 1);
    // A jar of worms with a handwritten label.
    box(c, 'ink', 334, 228, 32, 36);
    for (y = 234; y < 263; y++) for (x = 335; x < 365; x++) px(c, y < 240 ? 'fog_mid' : tone(['wood_deep', 'wood_dark', 'wood'], 0.55 - (x - 335) / 50 - (y - 240) / 60, x, y), x, y);
    limb(c, 340, 246, 346, 242, 1.2, WORM, 0.1); limb(c, 346, 242, 351, 249, 1.2, WORM, 0.1); limb(c, 355, 252, 360, 247, 1.2, WORM, 0.1);
    box(c, 'fog_light', 337, 236, 2, 25);
    slab(c, 333, 226, 34, 7, RUST);
    slab(c, 338, 250, 22, 9, CUP); F.drawText(c, 'live', 341, 250, 'wood_dark', 0.5, 9);
    // An ashtray, a ledger and a pencil.
    blob(c, ASH_X, 262, 11, 3, STONE, { bias: 0.1 }); box(c, 'stone_dark', ASH_X - 6, 261, 12, 2);
    limb(c, ASH_X - 2, 259, ASH_X + 8, 257, 1.2, CUP, 0.2); box(c, 'flame', ASH_X + 8, 256, 2, 2);
    slab(c, 370, 254, 28, 10, ['ink', 'wood_deep', 'rust_dark', 'rust']); box(c, 'cream', 372, 255, 24, 2);
    limb(c, 372, 251, 396, 248, 1.2, RUST, 0.1); box(c, 'skin_shadow', 370, 251, 2, 2);
  }

  // The panel's frame (the live parts are drawn each frame).
  function panelFrame(c) {
    box(c, 'wood_deep', 400, 266, 240, 94);
    box(c, 'ink', PX - 4, PY - 4, PW + 8, PH + 8); box(c, 'ink', PX - 2, PY + PH + 4, PW + 6, 2);
    slab(c, PX - 3, PY - 3, PW + 6, PH + 6, ['rust_dark', 'rust', 'rust_hi']);
    box(c, 'wood_deep', PX, PY, PW, PH);
    var R = [[PX - 1, PY - 1], [PX + PW - 2, PY - 1], [PX - 1, PY + PH - 2], [PX + PW - 2, PY + PH - 2]];
    for (var i = 0; i < 4; i++) blob(c, R[i][0] + 1, R[i][1] + 1, 2, 2, BRASS, { bias: 0.2 });
  }

  function paintRoom(c) {
    var x, y, i, k;
    A.reset();
    paintWall(c);
    // A bait fridge at the edge, humming, with a sticker.
    slab(c, 0, 40, 22, 224, CUP); box(c, 'paper_dark', 18, 40, 4, 224); box(c, 'stone', 14, 120, 3, 40); box(c, 'stone_lit', 14, 120, 1, 40);
    box(c, 'teal', 3, 70, 10, 14); box(c, 'cream', 5, 74, 6, 1); box(c, 'cream', 5, 78, 4, 1);
    // The left wall: a shelf with books, a coffee can and the radio; a trophy; the sign.
    shelf(c, 24, 72, 112);
    var BOOK = [['dusk_violet', 'dusk_plum', 'plum_hi'], RUST, ENAMEL, STONE, CUP, TEAL, ['blood', 'crimson', 'rug_hi']];
    for (i = 0, x = 28; i < 9; i++) {
      var bw = 3 + (i * 5) % 3, bh = 18 + (i * 7) % 9, b = BOOK[(i * 3) % BOOK.length];
      if (i === 8) { for (k = 0; k < bh; k++) box(c, k % 6 ? b[1] : b[b.length - 1], x + 2 + (k >> 2), 72 - k, bw, 1); break; }
      box(c, 'ink', x - 1, 71 - bh, bw + 2, bh + 1);
      for (y = 0; y < bh; y++) for (k = 0; k < bw; k++) px(c, tone(b, 0.8 - k / bw * 0.6, x + k, 72 - bh + y), x + k, 72 - bh + y);
      box(c, 'leaf_gold', x, 72 - bh + 3, bw, 1);
      x += bw + 1;
    }
    slab(c, 66, 56, 12, 16, ['rust_dark', 'rust', 'rust_hi']); box(c, 'cream', 67, 61, 10, 4);
    slab(c, 82, 38, 50, 34, WOOD);
    for (y = 42; y < 66; y++) for (x = 86; x < 108; x++) px(c, ((x + y) % 2 && (x - y + 99) % 3) ? 'paper_dark' : 'reed_hi', x, y);
    box(c, 'ink', 111, 42, 17, 10); box(c, 'signal_amber', 112, 45, 15, 2); box(c, 'crimson', 117, 43, 1, 8);
    blob(c, 115, 62, 3.5, 3.5, STONE, { bias: 0.15 }); blob(c, 124, 62, 3.5, 3.5, STONE, { bias: 0.15 });
    line(c, 'stone_hi', 128, 38, 146, 12); line(c, 'stone', 129, 38, 147, 12);
    cobweb(c, 0, 11, 1, 34); cobweb(c, 399, 11, -1, 22);
    trophy(c, 'gloam_perch', 80, 116, 122, 46);
    // The sign: RUSTY'S on a cream oval, cracked, hung on two chains.
    for (k = 0; k < 8; k++) { px(c, 'stone', 46, 148 + k); px(c, 'stone', 116, 148 + k); }
    A.area(c, 22, 154, 124, 44, function (xx, yy) {
      var dx = (xx - 84) / 61, dy = (yy - 176) / 21, e = dx * dx + dy * dy;
      if (e > 1) return '';
      if (e > 0.8) return yy < 176 ? 'wood_hi' : 'wood_dark';
      return tone(CUP, 0.72 - dx * 0.2 - dy * 0.25, xx, yy);
    });
    var name = "RUSTY'S", nw = F.measureBold(name);
    F.bold(c, name, 84 - (nw >> 1) + 1, 163, 'teal_dark'); F.bold(c, name, 84 - (nw >> 1), 162, 'teal_hi');
    F.drawText(c, "bait n' tackle", 84 - (F.measure("bait n' tackle") >> 1), 177, 'rust');
    line(c, 'paper_dark', 118, 160, 110, 172); line(c, 'paper_dark', 110, 172, 114, 186);                 // the crack
    blob(c, 50, 186, 6, 3, ['paper_dark', 'paper'], { rim: 0, bias: -0.3 });                             // a water stain
    // Behind him: the pegboard of packets; the lamp, dim.
    pegboard(c, 146, 24, 152, 240, 6, 5, 0);
    line(c, 'ink', 194, 11, 194, 16);
    for (y = 0; y < 14; y++) for (x = -8 - y; x <= 8 + y; x++) px(c, y === 13 ? 'moss_dark' : tone(ENAMEL, 0.7 - x / (16 + y * 2) * 0.8 - y / 40, 194 + x, 16 + y), 194 + x, 16 + y);
    box(c, 'moss_lit', 186, 16, 10, 1);
    blob(c, 194, 31, 7, 3, GLOW, { bias: 0.25, rim: 0 });
    cobweb(c, 174, 30, -1, 10);
    // The right wall: a trophy (above it the speech card), packets on a second board, a calendar.
    trophy(c, 'snag_trout', 346, 108, 100, 38);
    pegboard(c, 306, 148, 88, 112, 3, 2, 11);
    rusty(c);
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
    txt.status = F.wrap(status, STATUS_W);
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

  function say(s, key) { txt.msg = s ? F.wrap(s, STATUS_W) : []; txt.msgKey = key || 'fog_light'; }

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
    if (sel) { ctx.fillStyle = P.signal_amber; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = P.wood_deep; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); }
    ctx.fillStyle = P[fill || 'wood_mid']; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x + 1, y, w - 2, 1);
    ctx.fillStyle = P.wood; ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  }

  function lines(ctx, ls, x, y, max, key) {
    for (var i = 0; i < ls.length && i < max; i++) F.drawText(ctx, ls[i], x, y + i * F.LINE_H, key);
  }

  function draw(ctx) {
    var save = G.state.save, i, x, img;
    ctx.drawImage(room, 0, 0);

    // He blinks now and then, and his mouth moves under the moustache while he talks; the
    // ashtray smokes; the lamp gives a short flicker every so often (fixed rhythms from the
    // scene's time; no RNG in draw).
    if ((t % 4.3) > 4.12) {
      ctx.fillStyle = P.flesh; ctx.fillRect(EYE_L - 3, EYE_Y - 1, 7, 2); ctx.fillRect(EYE_R - 3, EYE_Y - 1, 7, 2);
      ctx.fillStyle = P.skin_shadow; ctx.fillRect(EYE_L - 3, EYE_Y + 1, 7, 1); ctx.fillRect(EYE_R - 3, EYE_Y + 1, 7, 1);
    }
    if (speech.length && t > speech[0].at && t < speechEnd && ((t * 9) | 0) % 2) {
      ctx.fillStyle = P.ink; ctx.fillRect(MOUTH_X - 5, MOUTH_Y, 10, 3);
      ctx.fillStyle = P.flesh_dark; ctx.fillRect(MOUTH_X - 3, MOUTH_Y + 2, 6, 1);
    }
    var tq = Math.floor(t * 8) / 8;
    for (i = 0; i < 26; i++) {
      var sy = ASH_Y - 2 - i * 2, sx = ASH_X + 9 + Math.round(Math.sin(i * 0.35 - tq * 1.6) * (1 + i * 0.12));
      if ((i + (tq * 8 | 0)) % 7 === 0) continue;
      ctx.fillStyle = P[i < 12 ? 'fog_mid' : 'fog_dark']; ctx.fillRect(sx, sy, 1, 2);
    }
    if ((t % 23) > 22.6 && ((t * 14) | 0) % 2) { ctx.globalAlpha = 0.22; ctx.fillStyle = P.ink; ctx.fillRect(0, 0, 400, 360); ctx.globalAlpha = 1; }

    // Speech, revealed left to right, on a card beside his head.
    if (speech.length) {
      var bx = BUBBLE_X, by = BUBBLE_Y, bw = BUBBLE_W, bh = speechH + 12;
      ctx.fillStyle = P.wood_deep; ctx.fillRect(bx - 1, by + 1, bw + 2, bh); ctx.fillRect(bx + 1, by - 1, bw - 2, bh + 2);
      ctx.fillStyle = P.cream; ctx.fillRect(bx, by + 1, bw, bh - 2); ctx.fillRect(bx + 1, by, bw - 2, bh);
      ctx.fillStyle = P.paper; ctx.fillRect(bx + 1, by + bh - 3, bw - 2, 2); ctx.fillRect(bx + bw - 3, by + 2, 2, bh - 3);
      var ty = by + bh - 10; // the tail points back toward his face
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
      ctx.fillStyle = P[on ? 'wood_deep' : 'wood_dark']; ctx.fillRect(x, TAB_Y, TAB_W, th + (on ? 3 : -3));
      if (on) { ctx.fillStyle = P.wood_deep; ctx.fillRect(x - 3, PY - 3, TAB_W + 6, 3); }
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

    // The selected item, painted large, with its price on a tag; beside it the name and effect.
    var it = item();
    tile(ctx, PX + 8, PY + 28, 84, 78, false, 'wood_mid');
    ctx.drawImage(icon(it.icon, 2), PX + 18, PY + 30);
    if (txt.price) {
      var pw = F.measure(txt.price) + 8;
      ctx.fillStyle = P.ink; ctx.fillRect(PX + 12, PY + 92, pw + 2, 12);
      ctx.fillStyle = P.rust_dark; ctx.fillRect(PX + 13, PY + 93, pw, 10);
      F.drawText(ctx, txt.price, PX + 17, PY + 93, 'signal_amber');
    }
    tile(ctx, PX + 98, PY + 28, PW - 106, 78, false, 'wood');
    var nl = Math.min(2, txt.name.length);
    for (i = 0; i < nl; i++) F.bold(ctx, txt.name[i], PX + 104, PY + 33 + i * F.LINE_H, 'bone');
    lines(ctx, txt.desc, PX + 104, PY + 35 + nl * F.LINE_H, 5 - nl, 'paper');
    if (txt.msg.length) lines(ctx, txt.msg, PX + 8, STATUS_Y, 2, txt.msgKey);
    else lines(ctx, txt.status, PX + 8, STATUS_Y, 2, 'fog_light');

    // The shelf as a grid of pegs: its items first, the other pegs empty.
    var items = SHELVES[row], gx = PX + ((PW - GRID_COLS * TILE - (GRID_COLS - 1) * TILE_GAP) >> 1);
    for (i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      var tx = gx + (i % GRID_COLS) * (TILE + TILE_GAP), ty2 = GRID_Y + Math.floor(i / GRID_COLS) * (TILE + TILE_GAP);
      if (i >= items.length) {
        tile(ctx, tx, ty2, TILE, TILE, false, 'wood_dark');
        ctx.fillStyle = P.wood_deep; ctx.fillRect(tx + 18, ty2 + 8, 4, 4); ctx.fillStyle = P.stone; ctx.fillRect(tx + 19, ty2 + 9, 2, 8); ctx.fillStyle = P.stone_hi; ctx.fillRect(tx + 19, ty2 + 9, 1, 1);
        continue;
      }
      tile(ctx, tx, ty2, TILE, TILE, i === col, 'wood_mid');
      var dimmed = (items[i].kind === 'lantern' || items[i].kind === 'depthFinder') && txt.inUse[i];
      if (dimmed) ctx.globalAlpha = 0.45;
      ctx.drawImage(icon(items[i].icon, 1), tx + 4, ty2 + 4);
      ctx.globalAlpha = 1;
      if (txt.inUse[i]) { ctx.fillStyle = P.ink; ctx.fillRect(tx + 2, ty2 + 2, 6, 6); ctx.fillStyle = P.neon_teal; ctx.fillRect(tx + 3, ty2 + 3, 4, 4); }
      if (txt.badge[i]) {
        var bw2 = F.measureBold(txt.badge[i]);
        ctx.fillStyle = P.ink; ctx.fillRect(tx + TILE - bw2 - 5, ty2 + TILE - 12, bw2 + 5, 11);
        F.bold(ctx, txt.badge[i], tx + TILE - bw2 - 2, ty2 + TILE - 11, 'bone');
      }
    }

    F.drawText(ctx, FOOT1, PX + ((PW - FOOT1_W) >> 1), PY + PH - 26, 'fog_light');
    F.drawText(ctx, FOOT2, PX + ((PW - FOOT2_W) >> 1), PY + PH - 14, 'fog_light');
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
