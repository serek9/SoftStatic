var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish wrongness generator (V5). A species' look is a hand-drawn base body plus seeded
// variation, then `wrongness` 0..3 and parts from the catalog:
//   0 ordinary, 1 one wrong part, 2 two parts + asymmetry, 3 impossible anatomy + glitch shimmer.
// generate() turns a look into the small sprite rows of the early phases; it now only checks
// that a look is valid (tools/balance.js --validate runs it in Node). What is drawn is
// painted natively by paintLook (Phase 17 portraits, Phase 19 swimmers): frame 0 rest,
// frame 1 tail flick, frame 2 (wrongness 3 or `static`) glitch shimmer.
// Generation is pure and deterministic per look.seed; nothing here touches the DOM at load.
G.gfx = G.gfx || {};
G.gfx.fishgen = (function () {
  var S = G.gfx.sprites;
  var PAD = 4;

  // Side views facing right. b body, d back/dark, l belly, f fins, e eye, k mouth/barbels (ink).
  var BASES = {
    perch: [
      '......f.f.f....',
      '.....fdfdfd....',
      'f...ddbdbdbd...',
      'ff.bbdbbdbbbe..',
      'fffbbdbbdbbbbbk',
      'ff.lldlldlllb..',
      'f...lllllll....',
      '.....f...f.....'
    ],
    pike: [
      '....ff..................',
      'f..fddddddddddddddd.....',
      'ff.dbbbbbbbbbbbbbbbbbb..',
      'fffbbbbbbbbbbbbbbbbbbebb',
      'ff.lllllllllllllllllllkk',
      'f...lllllllllllllllll...',
      '.....f......f...........'
    ],
    carp: [
      '.......ddd.......',
      '.....dddddd......',
      'f..ddbbbbbbbd....',
      'ff.dbbbbbbbbbbd..',
      'fffbbbbbbbbbbbebd',
      'fffbbbbbbbbbbbbbk',
      'ff.lbbbbbbbbbbbl.',
      'f...lllllllllll.k',
      '.....ff....f.....'
    ],
    trout: [
      '........ff........',
      'f...ddddddddddd...',
      'ff.dbbbbbbbbbbbd..',
      'fffbbbbbbbbbbbbebd',
      'ff.lbbbbbbbbbbbbbk',
      'f...lllllllllllll.',
      '......f.....f.....'
    ],
    eel: [
      '.ffffffffffffffffffff.......',
      'fdddddddddddddddddddddddd...',
      'fbbbbbbbbbbbbbbbbbbbbbbbbebk',
      'flllllllllllllllllllllllllb.',
      '.ffffffffffffffff...........'
    ],
    catfish: [
      '..........f.........',
      '.........fdd........',
      'f...dddddddddddd....',
      'ff.dbbbbbbbbbbbbbbd.',
      'fffbbbbbbbbbbbbbbebb',
      'ff.lbbbbbbbbbbbbbbbk',
      'f...llllllllllllllk.',
      '.....ff......ff..k..',
      '................k...'
    ],
    gar: [
      'ff..............f.........',
      'fdddddddddddddddddd.......',
      'fbbbbbbbbbbbbbbbbbbebkkkkk',
      'flllllllllllllllllllkkkkk.',
      'ff........f...............'
    ],
    koi: [
      '......ddd........',
      '....ddbbbbd......',
      'f..dbbbbbbbbd....',
      'ff.bbbbbbbbbbbd..',
      'fffbbbbbbbbbbbbeb',
      'fffbbbbbbbbbbbbbk',
      'ff.lbbbbbbbbbbbl.',
      'f...llllllllll..k',
      '....ff.....f.....'
    ]
  };
  var BASE_NAMES = ['perch', 'pike', 'carp', 'trout', 'eel', 'catfish', 'gar', 'koi'];

  // Species palettes: body b, back d, belly l, fins f (and p, koi patches).
  var PALETTES = {
    olive: { b: 'moss_hi', d: 'moss', l: 'paper', f: 'moss_dark' },
    silver: { b: 'stone_hi', d: 'stone', l: 'bone', f: 'stone_dark' },
    bronze: { b: 'rust_hi', d: 'rust', l: 'paper', f: 'rust_dark' },
    pale: { b: 'flesh', d: 'flesh_dark', l: 'bone', f: 'flesh_dark' },
    koi: { b: 'bone', d: 'crimson', l: 'bone', f: 'blood', p: 'neon_red' },
    ink: { b: 'night_blue', d: 'night_deep', l: 'fog_mid', f: 'night_ink' }
  };
  var SIL_KEY = 'water_deep';

  var PARTS = ['human_eyes', 'owl_eyes', 'human_mouth', 'zipper', 'muscle', 'vertebrae', 'wood_grain',
    'vhs_ribbon', 'mannequin', 'second_tail', 'tail_face', 'coffee_drip', 'static', 'fused_twins', 'growths'];

  // ---- Grid helpers ---------------------------------------------------------------------

  function toGrid(rows) {
    var w = rows[0].length, g = [];
    for (var y = 0; y < rows.length + PAD * 2; y++) {
      var row = [];
      for (var x = 0; x < w + PAD * 2; x++) {
        var sy = y - PAD, sx = x - PAD;
        row.push(sy >= 0 && sy < rows.length && sx >= 0 && sx < w ? rows[sy].charAt(sx) : '.');
      }
      g.push(row);
    }
    return g;
  }
  function get(g, x, y) { return y >= 0 && y < g.length && x >= 0 && x < g[0].length ? g[y][x] : '.'; }
  function set(g, x, y, ch) { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch; }
  function isBody(ch) { return ch === 'b' || ch === 'd' || ch === 'l' || ch === 'p'; }

  // Eye, mouth, tail, centre and the top/bottom body line, found from the drawing itself.
  function anchors(g) {
    var A = { ex: 0, ey: 0, mx: 0, my: 0, tailX: 1e9, cx: 0, mid: 0, top: [], bot: [] }, x, y;
    for (y = 0; y < g.length; y++) {
      for (x = 0; x < g[0].length; x++) {
        var ch = g[y][x];
        if (ch === 'e') { A.ex = x; A.ey = y; }
        if (ch !== '.' && x < A.tailX) A.tailX = x;
      }
    }
    for (x = 0; x < g[0].length; x++) {
      A.top[x] = -1; A.bot[x] = -1;
      for (y = 0; y < g.length; y++) if (isBody(g[y][x]) || g[y][x] === 'e') { if (A.top[x] < 0) A.top[x] = y; A.bot[x] = y; }
    }
    A.mx = A.ex; A.my = A.ey;
    for (y = A.ey; y <= A.ey + 1; y++) for (x = g[0].length - 1; x > A.ex; x--) if (g[y][x] !== '.') { if (x > A.mx) { A.mx = x; A.my = y; } break; }
    A.cx = Math.round((A.tailX + A.ex) / 2);
    A.mid = Math.round((A.top[A.cx] + A.bot[A.cx]) / 2);
    return A;
  }

  function bodyPixel(g, A, rng, x0, x1) {
    for (var tries = 0; tries < 40; tries++) {
      var x = rng.int(x0, x1), y = rng.int(A.top[x] < 0 ? 0 : A.top[x], A.bot[x] < 0 ? 0 : A.bot[x]);
      if (g[y][x] === 'b') return [x, y];
    }
    return null;
  }

  // ---- Seeded variation (6.5) ------------------------------------------------------------
  function vary(g, A, rng, look) {
    var n = rng.int(0, 5), p;
    for (var i = 0; i < n; i++) if ((p = bodyPixel(g, A, rng, A.tailX + 3, A.ex - 2))) set(g, p[0], p[1], 'd');
    if (PALETTES[look.palette].p) { // koi patches
      for (var k = 0; k < 3; k++) {
        if (!(p = bodyPixel(g, A, rng, A.tailX + 3, A.ex - 2))) continue;
        for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < rng.int(2, 3); dx++) if (get(g, p[0] + dx, p[1] + dy) === 'b') set(g, p[0] + dx, p[1] + dy, 'p');
      }
    }
    for (var y = 0; y < g.length; y++) for (var x = 0; x < g[0].length; x++) {
      if (g[y][x] === 'f' && x > A.tailX + 2 && rng.next() < 0.12) g[y][x] = '.'; // ragged fins, never the tail
    }
  }

  // ---- Part catalog (6.6) -----------------------------------------------------------------
  // Each paints onto the grid using the anchors. pulse is true on the tail-flick frame.
  var PAINT = {
    human_eyes: function (g, A, rng) {
      var n = rng.int(1, 2);
      for (var i = 0; i < n; i++) {
        var x = A.ex - 4 - i * 5, y = A.mid - 1 + rng.int(-1, 0);
        set(g, x - 1, y, 'w'); set(g, x, y, 'k'); set(g, x + 1, y, 'w');
      }
    },
    owl_eyes: function (g, A) {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) set(g, A.ex + dx, A.ey + dy, 'a');
      set(g, A.ex, A.ey, 'k');
    },
    human_mouth: function (g, A) {
      set(g, A.mx, A.my, 'h'); set(g, A.mx - 1, A.my, 'w'); set(g, A.mx - 2, A.my, 'w'); set(g, A.mx - 3, A.my, 'h');
      set(g, A.mx - 1, A.my + 1, 'h'); set(g, A.mx - 2, A.my + 1, 'h');
    },
    zipper: function (g, A) {
      for (var x = A.tailX + 3; x < A.ex - 2; x++) if (isBody(get(g, x, A.mid))) set(g, x, A.mid, (x & 1) ? 'j' : 'k');
      set(g, A.ex - 2, A.mid + 1, 'M');
    },
    muscle: function (g, A) {
      for (var y = A.mid - 1; y <= A.mid + 1; y++) for (var x = A.cx - 2; x <= A.cx + 2; x++) if (isBody(get(g, x, y))) set(g, x, y, y === A.mid ? 'h' : 'r');
    },
    vertebrae: function (g, A) {
      for (var x = A.tailX + 3; x < A.ex - 1; x += 3) {
        var y = A.top[x];
        if (y < 0) continue;
        set(g, x, y, 'M'); set(g, x, y - 1, 'm'); set(g, x + 1, y - 1, 'k');
      }
    },
    wood_grain: function (g, A) {
      for (var y = 0; y < g.length; y++) for (var x = A.tailX + 2; x < A.ex - 2; x++) {
        if (g[y][x] === 'b' || g[y][x] === 'd') g[y][x] = ((x + (y % 2) * 2) % 5 === 0) ? 'G' : 'g';
      }
    },
    vhs_ribbon: function (g, A) {
      for (var i = 0; i < 8; i++) set(g, A.mx + 1 + (i >> 1), A.my + 1 + i + Math.round(Math.sin(i * 1.3)), (i & 1) ? 'T' : 't');
    },
    mannequin: function (g, A) {
      [A.cx - 3, A.cx + 3].forEach(function (x) {
        for (var y = A.top[x]; y >= 0 && y <= A.bot[x]; y++) set(g, x, y, 'M');
        set(g, x, A.mid, 'j');
      });
    },
    second_tail: function (g, A) {
      var t = A.top[A.cx] - 1;
      set(g, A.cx, t, 'f'); set(g, A.cx - 1, t - 1, 'f'); set(g, A.cx + 1, t - 1, 'f');
      set(g, A.cx - 2, t - 2, 'f'); set(g, A.cx + 2, t - 2, 'f'); set(g, A.cx - 2, t - 3, 'f'); set(g, A.cx + 2, t - 3, 'f');
    },
    tail_face: function (g, A) {
      set(g, A.tailX + 1, A.mid - 1, 'w'); set(g, A.tailX + 1, A.mid + 1, 'w');
      set(g, A.tailX, A.mid, 'h'); set(g, A.tailX + 2, A.mid, 'k');
    },
    coffee_drip: function (g, A, rng) {
      for (var i = 0; i < 3; i++) {
        var x = rng.int(A.tailX + 4, A.ex - 2), y = A.bot[x], len = rng.int(1, 3);
        if (y < 0) continue;
        for (var k = 1; k <= len; k++) set(g, x, y + k, 'c');
        set(g, x, y + len + 1, 'k');
      }
    },
    static: function (g, A, rng) {
      for (var y = 0; y < g.length; y++) for (var x = 0; x < g[0].length; x++) if (isBody(g[y][x]) && rng.next() < 0.12) g[y][x] = 's';
    },
    fused_twins: function (g, A) {
      var h = A.bot[A.ex] - A.top[A.ex] + 1, x0 = A.ex - 5, copy = [];
      for (var y = A.top[A.ex] - 1; y <= A.bot[A.ex] + 1; y++) for (var x = x0; x < g[0].length; x++) if (get(g, x, y) !== '.') copy.push([x, y, g[y][x]]);
      copy.forEach(function (c) { if (get(g, c[0] - 1, c[1] + h) === '.') set(g, c[0] - 1, c[1] + h, c[2]); });
    },
    growths: function (g, A, rng, pulse) {
      for (var i = 0; i < 3; i++) {
        var x = rng.int(A.tailX + 4, A.ex - 2), up = i !== 1, y = up ? A.top[x] - 1 : A.bot[x] + 1;
        if (A.top[x] < 0) continue;
        set(g, x, y, 'r'); set(g, x - 1, y, 'h'); set(g, x + 1, y, 'h');
        if (pulse) set(g, x, y + (up ? -1 : 1), 'r');
      }
    }
  };

  // Wrongness 2+: the body stops matching itself (eye off by a pixel, fins uneven).
  function asymmetry(g, A, rng) {
    if (get(g, A.ex, A.ey) === 'e' && get(g, A.ex, A.ey - 1) === 'b') { set(g, A.ex, A.ey, 'b'); set(g, A.ex, A.ey - 1, 'e'); }
    for (var y = A.mid + 1; y < g.length; y++) for (var x = A.cx; x < g[0].length; x++) if (g[y][x] === 'f') g[y][x] = '.';
    var t = A.top[A.tailX + 4];
    if (t >= 0) { set(g, A.tailX + 4, t - 1, 'f'); set(g, A.tailX + 5, t - 2, 'f'); }
  }

  // Frame 1: the tail columns drop a pixel.
  function flickTail(g, A) {
    for (var x = A.tailX; x <= A.tailX + 2; x++) for (var y = g.length - 1; y > 0; y--) g[y][x] = g[y - 1][x];
  }

  // Frame 2: two rows slip sideways and static breaks out on the body.
  function shimmer(g, A, rng) {
    for (var i = 0; i < 2; i++) {
      var y = rng.int(A.top[A.cx], A.bot[A.cx]), s = rng.next() < 0.5 ? -1 : 1, row = g[y].slice();
      for (var x = 0; x < row.length; x++) g[y][x] = row[x - s] || '.';
    }
    for (var k = 0; k < 8; k++) { var p = bodyPixel(g, A, rng, A.tailX + 2, A.ex); if (p) set(g, p[0], p[1], 's'); }
  }

  function frameCount(look) { return (look.wrongness >= 3 || look.parts.indexOf('static') >= 0) ? 3 : 2; }
  // Phase 27: the swimmers' frames (paintLook): the beat runs REST, AWAY, REST, NEAR; a turn
  // runs TURN1, TURN2, then the same flipped. GLITCH only for looks with frameCount 3.
  var FR = { REST: 0, AWAY: 1, GLITCH: 2, NEAR: 3, TURN1: 4, TURN2: 5, ROLL: 6, SHAKE: 7 }, BEAT = [0, 1, 0, 3]; // ROLL, SHAKE: the hooked fish (Phase 29)
  var SWIM_FRAMES = [0, 1, 3, 4, 5], SWIM_FRAMES_G = [0, 1, 2, 3, 4, 5];
  function swimFrames(look) { return frameCount(look) > 2 ? SWIM_FRAMES_G : SWIM_FRAMES; }

  // Returns the frames (arrays of row strings) for a look, cropped to a shared bounding box.
  function generate(look) {
    var src = BASES[look.base];
    if (!src) throw new Error('fishgen: unknown base ' + look.base);
    if (!PALETTES[look.palette]) throw new Error('fishgen: unknown palette ' + look.palette);
    var grids = [], n = frameCount(look);
    for (var f = 0; f < n; f++) {
      var g = toGrid(src), A = anchors(g), rng = new G.core.rng.Rng(look.seed);
      vary(g, A, rng, look);
      for (var i = 0; i < look.parts.length; i++) {
        if (!PAINT[look.parts[i]]) throw new Error('fishgen: unknown part ' + look.parts[i]);
        PAINT[look.parts[i]](g, A, rng, f === 1);
      }
      if (look.wrongness >= 2) asymmetry(g, A, rng);
      if (f === 1) flickTail(g, A);
      if (f === 2) shimmer(g, A, new G.core.rng.Rng(look.seed + 77));
      grids.push(g);
    }
    var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    grids.forEach(function (g) {
      for (var y = 0; y < g.length; y++) for (var x = 0; x < g[0].length; x++) if (g[y][x] !== '.') {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    });
    return grids.map(function (g) {
      var rows = [];
      for (var y = y0; y <= y1; y++) rows.push(g[y].slice(x0, x1 + 1).join(''));
      return rows;
    });
  }

  // ---- Portraits (Phase 17) ----------------------------------------------------------------
  // A species painted natively at any size for the 640×360 screens (journal, trophies), in the
  // one-pixel look of the rest of the art: never a scaled-up sprite. Each base has a real
  // shape (a profile from tail to snout, shaped fins with rays, the eye and mouth) and a
  // pattern; the palette names its keys; the seed places spots and patches; the look's parts
  // are painted at full size too. Shading is flat bands that follow the body, and the whole
  // fish gets a dark outline. portrait(i, maxW, maxH, sil) returns a cached canvas; sil paints
  // the silhouette only (unknown journal entries).
  // Shapes: body [x, top, bottom] from the tail root (x 0) to the snout (x 1), in body lengths;
  // tail {len, spread, fork (0 straight .. 1 deep), round}; fins {k: dorsal|anal|pelvic|
  // adipose|pectoral, a, b, h, spiny}; eye [x, y, r]; mouth [x, y, len]; barbels; pattern.
  var SHAPES = {
    perch: { body: [[0, -0.06, 0.05], [0.14, -0.13, 0.11], [0.36, -0.2, 0.16], [0.6, -0.19, 0.15], [0.82, -0.13, 0.1], [1, -0.02, 0.025]],
      tail: { len: 0.2, spread: 0.16, fork: 0.45 }, eye: [0.85, -0.055, 0.04], mouth: [1, 0.012, 0.11], pattern: 'bars',
      fins: [{ k: 'dorsal', a: 0.32, b: 0.56, h: 0.14, spiny: true }, { k: 'dorsal', a: 0.58, b: 0.76, h: 0.09 }, { k: 'anal', a: 0.2, b: 0.36, h: 0.08 },
        { k: 'pelvic', a: 0.56, b: 0.66, h: 0.09 }, { k: 'pectoral', a: 0.7, b: 0.58, h: 0.09 }] },
    pike: { body: [[0, -0.05, 0.04], [0.15, -0.085, 0.075], [0.5, -0.1, 0.09], [0.76, -0.085, 0.075], [0.92, -0.04, 0.035], [1, -0.012, 0.012]],
      tail: { len: 0.14, spread: 0.1, fork: 0.35 }, eye: [0.84, -0.04, 0.024], mouth: [1, 0.004, 0.17], pattern: 'beans',
      fins: [{ k: 'dorsal', a: 0.13, b: 0.27, h: 0.08 }, { k: 'anal', a: 0.14, b: 0.26, h: 0.07 }, { k: 'pelvic', a: 0.46, b: 0.54, h: 0.06 }, { k: 'pectoral', a: 0.76, b: 0.68, h: 0.05 }] },
    carp: { body: [[0, -0.07, 0.06], [0.2, -0.18, 0.14], [0.45, -0.25, 0.17], [0.7, -0.22, 0.15], [0.88, -0.13, 0.1], [1, -0.04, 0.035]],
      tail: { len: 0.22, spread: 0.19, fork: 0.35 }, eye: [0.86, -0.06, 0.032], mouth: [0.99, 0.02, 0.05], barbels: 1, pattern: 'scales',
      fins: [{ k: 'dorsal', a: 0.3, b: 0.68, h: 0.1 }, { k: 'anal', a: 0.2, b: 0.3, h: 0.09 }, { k: 'pelvic', a: 0.5, b: 0.58, h: 0.08 }, { k: 'pectoral', a: 0.76, b: 0.66, h: 0.08 }] },
    trout: { body: [[0, -0.06, 0.05], [0.2, -0.13, 0.11], [0.5, -0.16, 0.14], [0.75, -0.14, 0.12], [0.9, -0.08, 0.07], [1, -0.02, 0.025]],
      tail: { len: 0.18, spread: 0.15, fork: 0.18 }, eye: [0.88, -0.045, 0.032], mouth: [1, 0.014, 0.13], pattern: 'dots', band: true,
      fins: [{ k: 'dorsal', a: 0.45, b: 0.6, h: 0.1 }, { k: 'adipose', a: 0.18, b: 0.24, h: 0.04 }, { k: 'anal', a: 0.2, b: 0.32, h: 0.08 },
        { k: 'pelvic', a: 0.46, b: 0.54, h: 0.07 }, { k: 'pectoral', a: 0.77, b: 0.67, h: 0.07 }] },
    eel: { body: [[0, -0.03, 0.03], [0.3, -0.05, 0.05], [0.7, -0.055, 0.055], [0.94, -0.035, 0.03], [1, -0.012, 0.012]],
      tail: { len: 0.05, spread: 0.035, round: true }, eye: [0.93, -0.017, 0.013], mouth: [1, 0.004, 0.05], pattern: 'none',
      fins: [{ k: 'dorsal', a: 0.02, b: 0.66, h: 0.03 }, { k: 'anal', a: 0.02, b: 0.5, h: 0.028 }, { k: 'pectoral', a: 0.88, b: 0.84, h: 0.025 }] },
    catfish: { body: [[0, -0.05, 0.05], [0.25, -0.12, 0.1], [0.6, -0.15, 0.12], [0.86, -0.12, 0.1], [1, -0.06, 0.05]],
      tail: { len: 0.16, spread: 0.13, fork: 0.25 }, eye: [0.88, -0.055, 0.018], mouth: [1, 0.012, 0.1], barbels: 4, pattern: 'mottle',
      fins: [{ k: 'dorsal', a: 0.6, b: 0.7, h: 0.13, spiny: true }, { k: 'adipose', a: 0.24, b: 0.34, h: 0.04 }, { k: 'anal', a: 0.13, b: 0.42, h: 0.07 },
        { k: 'pelvic', a: 0.46, b: 0.53, h: 0.06 }, { k: 'pectoral', a: 0.8, b: 0.68, h: 0.07 }] },
    gar: { body: [[0, -0.04, 0.035], [0.2, -0.065, 0.06], [0.5, -0.07, 0.065], [0.7, -0.06, 0.055], [0.76, -0.04, 0.035], [0.8, -0.018, 0.018], [1, -0.006, 0.006]],
      tail: { len: 0.12, spread: 0.07, round: true }, eye: [0.735, -0.026, 0.02], mouth: [1, 0.002, 0.23], pattern: 'dots',
      fins: [{ k: 'dorsal', a: 0.12, b: 0.21, h: 0.06 }, { k: 'anal', a: 0.12, b: 0.21, h: 0.055 }, { k: 'pelvic', a: 0.4, b: 0.46, h: 0.045 }, { k: 'pectoral', a: 0.72, b: 0.65, h: 0.04 }] },
    koi: { body: [[0, -0.06, 0.05], [0.2, -0.16, 0.12], [0.45, -0.21, 0.15], [0.72, -0.18, 0.13], [0.9, -0.1, 0.08], [1, -0.03, 0.03]],
      tail: { len: 0.24, spread: 0.2, fork: 0.22 }, eye: [0.88, -0.045, 0.026], mouth: [1, 0.015, 0.05], barbels: 1, pattern: 'patches',
      fins: [{ k: 'dorsal', a: 0.3, b: 0.68, h: 0.08 }, { k: 'anal', a: 0.2, b: 0.3, h: 0.08 }, { k: 'pelvic', a: 0.5, b: 0.58, h: 0.09 }, { k: 'pectoral', a: 0.78, b: 0.64, h: 0.1 }] }
  };

  // Catmull-Rom through the control points: the body's top (col 1) or bottom (col 2) at x.
  function profile(pts, col, x) {
    if (x <= pts[0][0]) return pts[0][col];
    for (var i = 0; i < pts.length - 1; i++) {
      if (x > pts[i + 1][0]) continue;
      var p0 = pts[Math.max(0, i - 1)][col], p1 = pts[i][col], p2 = pts[i + 1][col], p3 = pts[Math.min(pts.length - 1, i + 2)][col];
      var t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), t2 = t * t, t3 = t2 * t;
      return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
    }
    return pts[pts.length - 1][col];
  }

  var portraits = {};
  function portrait(i, maxW, maxH, sil) {
    var key = i + ':' + maxW + ':' + maxH + ':' + (sil ? 1 : 0);
    return portraits[key] || (portraits[key] = paintLook(G.data.fish[i].look, maxW, maxH, sil, 0, false));
  }

  // Paints a look (a species' or a bare base's). frame (FR): 0 rest, 1 the tail swept away
  // from the viewer, 2 the glitch shimmer (two bands slip sideways, static breaks out in short
  // dashes), 3 the tail swept toward the viewer, 4 and 5 the fish turning (seen at an angle,
  // narrowed across to 0.6 and 0.3 of its length, painted so, never scaled). Phase 27: seen
  // from the side a beating tail foreshortens; it does not drop. swim leaves room under the
  // tail so every frame of a swimmer has the same size. The canvas carries where the mouth is
  // (mouthX, mouthY) and the body's middle row (midY), in its pixels.
  // Phase 29: 6 the fish rolled onto its side (a tired fish: its belly turned to the viewer,
  // a pale flash, the back fins foreshortened), 7 its head turned in a shake (the head, from
  // the gill forward, foreshortened to 0.7).
  var TAIL_C = [1, 0.55, 1, 0.75, 1, 1, 0.85, 1], TAIL_S = [1, 0.92, 1, 1.12, 1, 1, 1, 1], SQUASH = [1, 1, 1, 1, 0.6, 0.3, 1, 1];
  var HEAD_X = 0.62, HEAD_SQ = [1, 1, 1, 1, 1, 1, 1, 0.7];
  function paintLook(look, maxW, maxH, sil, frame, swim) {
    var SH = SHAPES[look.base], pal = PALETTES[look.palette], parts = look.parts, rng = new G.core.rng.Rng(look.seed * 7 + 3);
    var has = function (p) { return parts.indexOf(p) >= 0; };
    var T = SH.tail, x, y, k, f;
    // Extent in body lengths: the tail behind, fins above and below, barbels and ribbons ahead.
    var minY = 0, maxY = 0;
    for (x = 0; x <= 1; x += 0.02) { minY = Math.min(minY, profile(SH.body, 1, x)); maxY = Math.max(maxY, profile(SH.body, 2, x)); }
    var finUp = 0, finDn = 0;
    for (k = 0; k < SH.fins.length; k++) { f = SH.fins[k]; if (f.k === 'dorsal' || f.k === 'adipose') finUp = Math.max(finUp, f.h); if (f.k === 'anal' || f.k === 'pelvic') finDn = Math.max(finDn, f.h); }
    var top = Math.min(minY - finUp, -T.spread) - (has('vertebrae') || has('second_tail') || has('growths') ? 0.07 : 0.01);
    var bot = Math.max(maxY + finDn, T.spread) + (SH.barbels > 1 ? 0.1 : 0) + (has('coffee_drip') ? 0.12 : 0) + (has('vhs_ribbon') ? 0.15 : 0) + 0.01;
    if (has('fused_twins')) bot += (maxY - minY) * 0.8;
    if (swim) bot = Math.max(bot, T.spread * 1.5 + 0.01);
    var left = -T.len - 0.01, right = 1 + (has('vhs_ribbon') ? 0.12 : 0.02);
    var Lp = Math.min((maxW - 2) / (right - left), (maxH - 2) / (bot - top));
    var W = Math.max(4, Math.ceil((right - left) * Lp) + 2), H = Math.max(4, Math.ceil((bot - top) * Lp) + 2);
    var g = new Array(W * H);
    for (k = 0; k < g.length; k++) g[k] = '';
    // Across, the fish is narrowed about the canvas's middle while it turns (27.2).
    // Phase 29: in a shake only the head is narrowed, about the gill (HEAD_X).
    var sq = SQUASH[frame] || 1, Xc = (left + right) / 2, hs = HEAD_SQ[frame] || 1;
    function toDisp(X) { return X > HEAD_X ? HEAD_X + (X - HEAD_X) * hs : X; }
    function fromDisp(X) { return X > HEAD_X ? HEAD_X + (X - HEAD_X) / hs : X; }
    function wx(px) { return fromDisp(Xc + ((px + 0.5 - 1) / Lp + left - Xc) / sq); }
    function wy(py) { return (py + 0.5 - 1) / Lp + top; }
    function PX(v) { return Math.round(((toDisp(v) - Xc) * sq + Xc - left) * Lp + 1 - 0.5); }
    function PY(v) { return Math.round((v - top) * Lp + 1 - 0.5); }
    function put(px, py, key) { if (px >= 0 && py >= 0 && px < W && py < H) g[py * W + px] = key; }
    function get(px, py) { return px >= 0 && py >= 0 && px < W && py < H ? g[py * W + px] : ''; }
    function disc(cx, cy, r, key) { for (var yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) for (var xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r * r + r * 0.6) put(xx, yy, key); }
    function seg(x0, y0, x1, y1, key) { var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (var q = 0; q <= n; q++) put(Math.round(x0 + (x1 - x0) * q / n), Math.round(y0 + (y1 - y0) * q / n), key); }
    var B = pal.b, Dk = pal.d, Lb = pal.l, Fn = pal.f;
    if (has('wood_grain')) { B = 'wood_mid'; Dk = 'wood'; }
    if (has('mannequin')) Lb = 'bone';
    var dark = S.shift(Dk, -1), finDark = S.shift(Fn, -1), finLit = S.shift(Fn, 1);
    var MX = 0, MY = 0;
    // The tail's foreshortening and apparent size in this frame (27.1), and its keys: swept
    // away, its far side is in shadow.
    var tc = TAIL_C[frame] || 1, ts = TAIL_S[frame] || 1, away = frame === 1, roll = frame === 6;
    var tailFill = away ? finDark : Fn, tailRay = away ? S.shift(finDark, -1) : finDark, tailRim = away ? Fn : finLit;

    // The body as a function, for every layer to ask "is this on the fish, and how far down?"
    function bodyAt(X, Y) {
      if (X < 0 || X > 1) return -1;
      var t0 = profile(SH.body, 1, X), b0 = profile(SH.body, 2, X);
      return Y >= t0 && Y <= b0 ? (Y - t0) / (b0 - t0) : -1;
    }

    function paintFish(dy, headOnly) {
      var px, py;
      // Fins behind the body: tail, dorsal, anal, pelvic; rays drawn as darker lines.
      for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
        var X = wx(px), Y = wy(py) - dy, key = '';
        if (headOnly && X < 0.66) continue;
        var Xt = X < 0 ? X / tc : X; // along the tail, undoing its foreshortening
        if (X < 0.02 && Xt >= -T.len) {
          var tt = Math.max(0, -Xt / T.len), root = profile(SH.body, 2, 0), half = root + (T.spread * ts - root) * Math.pow(tt, 0.8), ay = Math.abs(Y - (profile(SH.body, 1, 0) + root) / 2);
          var inTail = ay <= half;
          if (T.round) inTail = ((Xt + T.len * 0.45) * (Xt + T.len * 0.45)) / (T.len * T.len * 0.3) + (ay * ay) / (T.spread * ts * T.spread * ts) <= 1 || (tt < 0.5 && ay <= half);
          else if (T.fork && tt > 1 - T.fork * (1 - ay / Math.max(0.001, half))) inTail = false;
          if (inTail) key = ((Math.round(ay * Lp) % 3 === 0) && tt > 0.15) ? tailRay : (ay > half - 1.5 / Lp ? tailRim : tailFill);
        }
        for (k = 0; k < SH.fins.length && !key; k++) {
          f = SH.fins[k];
          if (f.k === 'pectoral' || X < f.a || X > f.b) continue;
          var u = (X - f.a) / (f.b - f.a), edgeT = profile(SH.body, 1, X), edgeB = profile(SH.body, 2, X);
          var hgt = f.h * (roll ? (f.k === 'dorsal' || f.k === 'adipose' ? 0.55 : 1.3) : 1) * (f.k === 'adipose' ? Math.sin(u * Math.PI) : (f.k === 'dorsal' && !f.spiny ? Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.85) : Math.pow(1 - Math.abs(u - 0.3) / 1.3, 1.5)));
          if (f.spiny) { var ph = (u * (f.b - f.a) * Lp / 4) % 1; hgt *= 0.75 + 0.25 * (ph < 0.25 ? 1 : 0); }
          var up = f.k === 'dorsal' || f.k === 'adipose';
          var inFin = up ? (Y < edgeT + 0.01 && Y > edgeT - hgt) : (Y > edgeB - 0.01 && Y < edgeB + hgt);
          if (has('second_tail') && f.k === 'dorsal' && k > 0) inFin = false;
          if (inFin) key = (f.k !== 'adipose' && Math.round(u * (f.b - f.a) * Lp) % 3 === 0) ? finDark : Fn;
        }
        if (key) put(px, py + Math.round(dy * Lp), key);
      }
      // The body: bands down the flank (lit back rim, back, flank, belly, belly shadow).
      for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
        var X2 = wx(px), Y2 = wy(py) - dy;
        if (headOnly && X2 < 0.68) continue;
        var v = bodyAt(X2, Y2);
        if (v < 0) continue;
        var t0 = profile(SH.body, 1, X2), b0 = profile(SH.body, 2, X2), mid = (t0 + b0) / 2, edge = 1.5 / Lp / Math.max(0.001, b0 - t0);
        var key2 = roll ? (v < edge ? Dk : (v < 0.18 ? Dk : (v < 0.4 ? B : (v < 0.56 ? S.shift(Lb, 1) : (v < 1 - edge * 1.2 ? Lb : S.shift(Lb, -1)))))) // rolled: the belly and its flash
          : (v < edge ? S.shift(Dk, 1) : (v < 0.36 ? Dk : (v < 0.7 ? B : (v < 1 - edge * 1.2 ? Lb : S.shift(Lb, -1)))));
        // Pattern.
        if (SH.pattern === 'bars' && v < 0.72) {
          for (var bI = 0; bI < 5; bI++) { var bc = 0.24 + bI * 0.12, bw = 0.035 * (1 - v * 0.9); if (Math.abs(X2 - bc - (v - 0.3) * 0.04) < bw) key2 = dark; }
        }
        if (SH.band && Math.abs(Y2 - mid) < 0.012 && X2 > 0.08 && X2 < 0.8) key2 = 'dusk_rose';
        if (SH.pattern === 'scales' && v > 0.12 && v < 0.85 && X2 < 0.8) {
          var cs = 0.055, gx = X2 / cs, gy = (Y2 - t0) / (cs * 0.8), row = Math.floor(gy), cx2 = gx - (row % 2) * 0.5, fx = cx2 - Math.floor(cx2), fy = gy - row;
          if (fy > 0.78 && Math.abs(fx - 0.5) < 0.42) key2 = S.shift(key2, -1);
          else if (fy < 0.25 && Math.abs(fx - 0.5) < 0.15) key2 = S.shift(key2, 1);
        }
        if (X2 > 0.76 && X2 < 0.8 && Math.abs(X2 - 0.78 + Math.pow((Y2 - mid) / (b0 - t0), 2) * 0.05) < 0.6 / Lp && v > 0.1 && v < 0.92) key2 = S.shift(key2, -1); // the gill cover
        put(px, py + Math.round(dy * Lp), key2);
      }
      // Spots and patches, placed by the seed.
      var srng = new G.core.rng.Rng(look.seed * 13 + 5), n = SH.pattern === 'dots' ? 14 : (SH.pattern === 'beans' ? 16 : (SH.pattern === 'patches' ? 4 : (SH.pattern === 'mottle' ? 9 : 0)));
      for (k = 0; k < n; k++) {
        var sx = srng.range(0.08, 0.76), t1 = profile(SH.body, 1, sx), b1 = profile(SH.body, 2, sx), sy = t1 + (b1 - t1) * srng.range(0.12, SH.pattern === 'dots' ? 0.62 : 0.55);
        if (headOnly && sx < 0.68) continue;
        var r = SH.pattern === 'patches' ? srng.range(0.05, 0.09) : (SH.pattern === 'mottle' ? srng.range(0.025, 0.045) : srng.range(0.011, 0.018));
        var col = SH.pattern === 'beans' ? S.shift(B, 1) : (SH.pattern === 'patches' ? (pal.p || Dk) : dark);
        for (var yy = -r * 1.2; yy <= r * 1.2; yy += 1 / Lp) for (var xx = -r * 1.8; xx <= r * 1.8; xx += 1 / Lp) {
          var e = (xx * xx) / (r * r * (SH.pattern === 'beans' ? 3 : 1.6)) + (yy * yy) / (r * r * 0.9);
          if (e <= 1 && bodyAt(sx + xx, sy + yy) > 0.05) put(PX(sx + xx), PY(sy + yy + dy), col);
        }
      }
      // The pectoral fin over the flank.
      for (k = 0; k < SH.fins.length; k++) {
        f = SH.fins[k];
        if (f.k !== 'pectoral') continue;
        var fx0 = f.a, fy0 = (profile(SH.body, 1, f.a) + profile(SH.body, 2, f.a)) / 2 + 0.02, len = f.a - f.b;
        for (var q = 0; q <= 1; q += 0.5 / (len * Lp)) for (var sp = -1; sp <= 1; sp += 0.5 / (f.h * Lp)) {
          var ax = fx0 - len * q, ay2 = fy0 + q * len * 0.45 + sp * f.h * q * 0.7;
          if (headOnly && ax < 0.66) continue;
          put(PX(ax), PY(ay2 + dy), Math.abs(sp) > 0.85 ? finDark : (Math.round(sp * f.h * q * Lp * 0.7) % 3 === 0 && q > 0.25 ? Fn : finLit));
        }
      }
      // Eye, mouth, barbels.
      var EX = PX(SH.eye[0]), EY = PY(SH.eye[1] + dy), ER = Math.max(1.3, SH.eye[2] * Lp);
      if (has('owl_eyes')) ER *= 2.1;
      if (look.wrongness >= 2) EY -= Math.max(1, Math.round(ER * 0.5));
      disc(EX, EY, ER + 1, 'ink');
      disc(EX, EY, ER, has('owl_eyes') ? 'signal_amber' : (look.palette === 'ink' ? 'stone_hi' : 'leaf_gold'));
      if (ER >= 2) disc(EX + 0.3, EY + 0.3, ER * (has('owl_eyes') ? 0.5 : 0.6), 'ink'); else put(EX, EY, 'ink');
      if (ER > 1.6) put(Math.round(EX - ER * 0.3), Math.round(EY - ER * 0.3), 'bone');
      MX = PX(SH.mouth[0]); MY = PY(SH.mouth[1] + dy);
      var ML = SH.mouth[2] * Lp;
      seg(MX, MY, MX - ML, MY + Math.max(1, ML * 0.12), dark);
      if (SH.barbels) for (k = 0; k < SH.barbels; k++) {
        var bl = (SH.barbels > 1 ? 0.12 + k * 0.03 : 0.05) * Lp, bx = MX - 1 - k * 2;
        for (q = 0; q <= bl; q++) put(Math.round(bx - q * 0.45), Math.round(MY + 1 + q * 0.85 + Math.sin(q / bl * 3) * 1.2), dark);
      }
    }

    if (has('fused_twins')) paintFish((maxY - minY) * 0.8, true);
    paintFish(0, false);

    // The look's parts, at full size.
    var midX = 0.45, midT = profile(SH.body, 1, midX), midB = profile(SH.body, 2, midX), midY = (midT + midB) / 2, bh = (midB - midT) * Lp;
    if (has('wood_grain')) for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var X3 = wx(x), Y3 = wy(y), v3 = bodyAt(X3, Y3);
      if (v3 > 0.05 && v3 < 0.7 && X3 < 0.76 && Math.abs(Math.sin(Y3 * Lp * 0.5 + Math.sin(X3 * 9) * 2)) < 0.18) put(x, y, 'wood_dark');
    }
    if (has('mannequin')) for (k = 0; k < 2; k++) {
      var mx = PX(0.3 + k * 0.28);
      for (y = 0; y < H; y++) if (bodyAt(wx(mx), wy(y)) >= 0) { put(mx, y, 'stone'); put(mx + 1, y, 'stone_lit'); }
      disc(mx, PY(midY), Math.max(1.5, bh * 0.08), 'stone_hi');
    }
    if (has('zipper')) {
      for (x = PX(0.1); x < PX(0.74); x++) { var zy = PY((profile(SH.body, 1, wx(x)) + profile(SH.body, 2, wx(x))) / 2); put(x, zy, x % 2 ? 'stone_hi' : 'ink'); put(x, zy + (x % 2 ? 1 : -1), 'stone'); }
      var zx = PX(0.74), zy2 = PY(midY); for (y = 0; y < Math.max(3, bh * 0.25); y++) { put(zx, zy2 + y, 'stone_lit'); put(zx + 1, zy2 + y, 'stone'); }
    }
    if (has('muscle')) {
      var mcx = PX(0.5), mcy = PY(midY), rx = bh * 0.45, ry = bh * 0.28;
      for (y = -ry - 1; y <= ry + 1; y++) for (x = -rx - 1; x <= rx + 1; x++) {
        var e2 = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (e2 <= 1.25 && e2 > 1) put(Math.round(mcx + x), Math.round(mcy + y), 'flesh');
        else if (e2 <= 1) put(Math.round(mcx + x), Math.round(mcy + y), (Math.round(x + y * 1.5) % 3 === 0) ? 'blood' : 'crimson');
      }
    }
    if (has('vertebrae')) for (var vx = 0.1; vx < 0.74; vx += 0.065) {
      var vpx = PX(vx), vty = PY(profile(SH.body, 1, vx)), vh = Math.max(2, Math.round(Lp * 0.035));
      for (y = 0; y < vh; y++) for (x = -1; x <= 1; x++) put(vpx + x, vty - y - 1, y === vh - 1 ? 'bone' : (x < 1 ? 'paper' : 'paper_dark'));
      put(vpx, vty - vh - 1, 'ink');
    }
    if (has('second_tail')) {
      var stx = PX(0.5), sty = PY(profile(SH.body, 1, 0.5)), sh = Math.max(4, Lp * 0.12);
      for (y = 0; y < sh; y++) { var sw = Math.round(1 + y * 0.6); for (x = -sw; x <= sw; x++) if (!(y > sh * 0.6 && Math.abs(x) < sw * 0.4)) put(stx + x, sty - 1 - y, Math.abs(x) % 3 === 0 ? finDark : Fn); }
    }
    if (has('tail_face')) {
      var tfx = PX(-T.len * 0.55 * tc), tfy = PY((profile(SH.body, 1, 0) + profile(SH.body, 2, 0)) / 2), tr = Math.max(1, T.spread * Lp * 0.14);
      disc(tfx - tr * 1.6, tfy - tr * 1.6, tr, 'bone'); disc(tfx + tr * 1.6, tfy - tr * 1.6, tr, 'bone');
      put(Math.round(tfx - tr * 1.6), Math.round(tfy - tr * 1.6), 'ink'); put(Math.round(tfx + tr * 1.6), Math.round(tfy - tr * 1.6), 'ink');
      seg(tfx - tr * 1.5, tfy + tr * 1.8, tfx + tr * 1.5, tfy + tr * 1.8, 'flesh_dark');
    }
    if (has('human_eyes')) for (k = 0; k < (look.seed % 2 ? 2 : 1); k++) {
      var hx = PX(0.62 - k * 0.2), hy = PY(midY - (midB - midT) * 0.1), hr = Math.max(2, bh * 0.13);
      for (y = -hr; y <= hr; y++) for (x = -hr * 1.8; x <= hr * 1.8; x++) if ((x * x) / (hr * hr * 3.2) + (y * y) / (hr * hr * 0.55) <= 1) put(Math.round(hx + x), Math.round(hy + y), 'bone');
      disc(hx, hy, hr * 0.62, 'water_hi'); disc(hx, hy, hr * 0.32, 'ink'); put(Math.round(hx - hr * 0.3), Math.round(hy - hr * 0.3), 'cream');
      seg(hx - hr * 1.8, hy - hr * 0.5, hx + hr * 1.8, hy - hr * 0.5, 'flesh_dark');
    }
    if (has('human_mouth')) {
      var hmx = PX(0.96), hmy = PY(SH.mouth[1] + 0.01), hw = Math.max(3, Lp * 0.07);
      for (y = -2; y <= 2; y++) for (x = -hw; x <= 1; x++) put(Math.round(hmx + x), hmy + y, Math.abs(y) === 2 ? 'flesh_dark' : (Math.abs(y) === 1 ? 'flesh' : 'ink'));
      for (x = -hw + 1; x < 0; x += 2) { put(Math.round(hmx + x), hmy - 1, 'bone'); put(Math.round(hmx + x), hmy + 1, 'bone'); }
    }
    if (has('coffee_drip')) {
      var crng = new G.core.rng.Rng(look.seed + 9);
      for (k = 0; k < 3; k++) {
        var cxw = crng.range(0.2, 0.7), cpx = PX(cxw), cpy = PY(profile(SH.body, 2, cxw)), clen = Math.round(Lp * crng.range(0.04, 0.09));
        for (y = 0; y < clen; y++) { put(cpx, cpy + y, 'wood_dark'); if (y < clen - 2) put(cpx + 1, cpy + y, 'wood'); }
        disc(cpx + 0.5, cpy + clen + 1, 1.2, 'wood_dark');
      }
    }
    if (has('growths')) {
      var grng = new G.core.rng.Rng(look.seed + 11);
      for (k = 0; k < 4; k++) {
        var gxw = grng.range(0.15, 0.7), upg = k % 2 === 0, gpx = PX(gxw), gpy = PY(profile(SH.body, upg ? 1 : 2, gxw)), gr = Math.max(1.5, Lp * grng.range(0.018, 0.03));
        disc(gpx, gpy + (upg ? -gr * 0.6 : gr * 0.6), gr, 'flesh'); disc(gpx - gr * 0.3, gpy + (upg ? -gr * 0.9 : gr * 0.3), gr * 0.45, 'skin_hi');
        put(gpx + 1, gpy + (upg ? -1 : 1), 'crimson');
      }
    }
    if (has('vhs_ribbon')) {
      var rx0 = PX(SH.mouth[0]), ry0 = PY(SH.mouth[1]);
      for (k = 0; k < 2; k++) for (q = 0; q < Lp * 0.22; q++) {
        var rxp = rx0 + q * 0.35 + k * 2, ryp = ry0 + q + Math.sin(q * 0.25 + k) * 3;
        put(Math.round(rxp), Math.round(ryp), 'ink'); put(Math.round(rxp) + 1, Math.round(ryp), k ? 'stone' : 'stone_dark');
      }
    }
    if (has('static')) for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var v4 = bodyAt(wx(x), wy(y));
      if (v4 < 0.15 || v4 > 0.8) continue;
      var band = Math.floor(y / 2) % 5;
      if (band < 2 && ((x * 7 + y * 13 + look.seed) % 11) < 4) put(x, y, band ? 'fog_light' : 'stone_hi');
    }

    if (frame === 2) {
      // Two bands of rows slip sideways, then short dashes of static on the body.
      var grng = new G.core.rng.Rng(look.seed + 77), y0 = PY(midT), y1 = PY(midB), row = new Array(W);
      for (k = 0; k < 2; k++) {
        var ys = grng.int(y0, Math.max(y0, y1 - 2)), sh = (grng.next() < 0.5 ? -1 : 1) * (2 + grng.int(0, 1));
        for (y = ys; y < Math.min(H, ys + 2); y++) {
          for (x = 0; x < W; x++) row[x] = g[y * W + x];
          for (x = 0; x < W; x++) g[y * W + x] = row[x - sh] || '';
        }
      }
      for (k = 0; k < 7; k++) {
        var dx0 = PX(grng.range(0.1, 0.8)), dy0 = grng.int(y0 + 1, Math.max(y0 + 1, y1 - 1)), dl = grng.int(2, 4);
        for (x = dx0; x < dx0 + dl; x++) if (get(x, dy0)) put(x, dy0, k % 3 ? 'fog_light' : 'stone_hi');
      }
    }

    // Outline, or the silhouette.
    var out = new Array(W * H);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var c0 = g[y * W + x];
      if (c0) out[y * W + x] = sil ? SIL_KEY : c0;
      else out[y * W + x] = (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) ? (sil ? SIL_KEY : 'ink') : '';
    }
    var cv = G.gfx.bake.layer(W, H, function (c) {
      G.gfx.paint.reset();
      G.gfx.paint.area(c, 0, 0, W, H, function (xx, yy) { return out[yy * W + xx]; });
    });
    cv.mouthX = MX; cv.mouthY = MY; cv.midY = PY(midY);
    return cv;
  }
  var mirrored = {};
  function portraitFlipped(i, maxW, maxH) {
    var key = i + ':' + maxW + ':' + maxH;
    return mirrored[key] || (mirrored[key] = G.gfx.bake.flipped(portrait(i, maxW, maxH, false), 'x'));
  }

  // ---- Swimmers (Phase 19) ------------------------------------------------------------------
  // The underwater fish: a look painted at swimming size in the view's pixels (about twice
  // the old sprites), in its frames (FR: the beat, the turn, and the shimmer for wrongness 3
  // or static), facing right or flipped, in colour or as a silhouette. Baked on first use.
  // SWIM: the box per base, in view pixels.
  var SWIM = { perch: [34, 30], pike: [50, 30], carp: [38, 34], trout: [40, 30], eel: [58, 26], catfish: [44, 34], gar: [54, 26], koi: [38, 34] };
  var swimmers = {};
  function swimArt(id, look, scale, frame, sil, flip) {
    var key = id + ':' + scale + ':' + frame + (sil ? 's' : 'c') + (flip ? 'f' : 'r'), cv = swimmers[key];
    if (cv) return cv;
    if (flip) {
      var src = swimArt(id, look, scale, frame, sil, false);
      cv = G.gfx.bake.flipped(src, 'x');
      cv.mouthX = src.width - 1 - src.mouthX; cv.mouthY = src.mouthY; cv.midY = src.midY;
    } else if (sil) {
      // Phase 27: the silhouette is the colour frame's shape filled flat (the same pixels
      // paintLook would give it), so the bake paints each frame once.
      var col = swimArt(id, look, scale, frame, false, false);
      cv = G.gfx.bake.layer(col.width, col.height, function (c) {
        c.drawImage(col, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = S.PALETTE[SIL_KEY];
        c.fillRect(0, 0, col.width, col.height);
      });
      cv.mouthX = col.mouthX; cv.mouthY = col.mouthY; cv.midY = col.midY;
    } else {
      var box = SWIM[look.base];
      cv = paintLook(look, box[0] * scale, box[1] * scale, false, frame, true);
    }
    return (swimmers[key] = cv);
  }
  // Drawn every frame, so these look up arrays (no string keys) once baked.
  var swimTab = [], baseTab = {};
  function slot(fr, sil, flip) { return fr * 4 + (sil ? 2 : 0) + (flip ? 1 : 0); }
  function swimmer(i, frame, sil, flip) {
    var t = swimTab[i] || (swimTab[i] = []), k = slot(frame, sil, flip);
    return t[k] || (t[k] = swimArt(i, G.data.fish[i].look, 1, frame, sil, flip));
  }
  // A bare base (no parts, wrongness 0) for the far silhouettes and the heavy shadow.
  var BARE = {};
  function bareLook(base) { return BARE[base] || (BARE[base] = { base: base, wrongness: 0, parts: [], palette: 'olive', seed: 1 }); }
  function baseSwimmer(base, scale, frame, sil, flip) {
    var bs = baseTab[scale] || (baseTab[scale] = {}), t = bs[base] || (bs[base] = []), k = slot(frame, sil, flip);
    return t[k] || (t[k] = swimArt('base_' + base, bareLook(base), scale, frame, sil, flip));
  }
  // A look with one part on a base ('' for none), for the gallery's pages.
  function partSwimmer(base, part, frame, sil, flip) {
    var id = base + '+' + part, look = BARE[id] || (BARE[id] = { base: base, wrongness: part ? 1 : 0, parts: part ? [part] : [], palette: 'olive', seed: 7 });
    return swimArt(id, look, 1, frame, sil, flip);
  }

  return {
    portrait: portrait, portraitFlipped: portraitFlipped, frameCount: frameCount, FR: FR, BEAT: BEAT, swimFrames: swimFrames,
    swimmer: swimmer, baseSwimmer: baseSwimmer, partSwimmer: partSwimmer, SWIM: SWIM,
    BASE_NAMES: BASE_NAMES, PARTS: PARTS, PALETTES: PALETTES,
    generate: generate
  };
})();
