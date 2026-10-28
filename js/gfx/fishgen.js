var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish wrongness generator (V5). A species' look is a hand-drawn base body plus seeded
// variation, then `wrongness` 0..3 and parts from the catalog:
//   0 ordinary, 1 one wrong part, 2 two parts + asymmetry, 3 impossible anatomy + glitch shimmer.
// Output is ordinary sprite rows (sprites.def), baked lazily like any other sprite:
// frame 0 rest, frame 1 tail flick, frame 2 (wrongness 3 or `static`) glitch shimmer.
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

  // Species palettes fill b, d, l, f (and p, koi patches). Everything else is fixed.
  var PALETTES = {
    olive: { b: 'moss_hi', d: 'moss', l: 'paper', f: 'moss_dark' },
    silver: { b: 'stone_hi', d: 'stone', l: 'bone', f: 'stone_dark' },
    bronze: { b: 'rust_hi', d: 'rust', l: 'paper', f: 'rust_dark' },
    pale: { b: 'flesh', d: 'flesh_dark', l: 'bone', f: 'flesh_dark' },
    koi: { b: 'bone', d: 'crimson', l: 'bone', f: 'blood', p: 'neon_red' },
    ink: { b: 'night_blue', d: 'night_deep', l: 'fog_mid', f: 'night_ink' }
  };
  var FIXED = {
    e: 'ink', k: 'ink', w: 'bone', h: 'flesh', r: 'crimson', m: 'stone_hi', M: 'stone',
    g: 'wood_hi', G: 'wood_dark', t: 'ink', T: 'stone', c: 'wood_dark', s: 'fog_light', a: 'signal_amber', j: 'stone_hi'
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

  function mapFor(palette) {
    var m = {}, k, P = PALETTES[palette];
    for (k in FIXED) m[k] = FIXED[k];
    for (k in P) m[k] = P[k];
    if (!m.p) m.p = P.b;
    return m;
  }

  var SIL_MAP = {};
  'bdlfpekwhrmMgGtTcsaj'.split('').forEach(function (ch) { SIL_MAP[ch] = SIL_KEY; });

  // Defines fish_<id> and fishsil_<id> for every species, and fishsil_base_<base> for
  // background silhouettes. Rows only; canvases bake on first draw.
  var spr = [], sil = [];
  function defineSpecies(list) {
    spr.length = 0; sil.length = 0;
    for (var i = 0; i < list.length; i++) {
      var f = list[i], frames = generate(f.look);
      spr.push('fish_' + f.id); sil.push('fishsil_' + f.id);
      S.def(spr[i], mapFor(f.look.palette), frames);
      S.def(sil[i], SIL_MAP, frames);
    }
  }
  for (var b = 0; b < BASE_NAMES.length; b++) {
    S.def('fishsil_base_' + BASE_NAMES[b], SIL_MAP, generate({ base: BASE_NAMES[b], wrongness: 0, parts: [], palette: 'olive', seed: 1 }));
  }
  if (G.data && G.data.fish) defineSpecies(G.data.fish);

  // ?gallery: every part on every base (8 × 15), defined only when the gallery opens.
  var galleryDone = false;
  function defineGallery() {
    if (galleryDone) return;
    galleryDone = true;
    for (var i = 0; i < BASE_NAMES.length; i++) {
      S.def('base_' + BASE_NAMES[i], mapFor('olive'), generate({ base: BASE_NAMES[i], wrongness: 0, parts: [], palette: 'olive', seed: 7 }));
      for (var j = 0; j < PARTS.length; j++) {
        S.def(BASE_NAMES[i] + '+' + PARTS[j], mapFor('olive'),
          generate({ base: BASE_NAMES[i], wrongness: 1, parts: [PARTS[j]], palette: 'olive', seed: 7 }));
      }
    }
  }

  return {
    BASE_NAMES: BASE_NAMES, PARTS: PARTS, PALETTES: PALETTES,
    generate: generate, defineSpecies: defineSpecies, defineGallery: defineGallery,
    sprite: function (i) { return spr[i]; },
    silhouette: function (i) { return sil[i]; }
  };
})();
