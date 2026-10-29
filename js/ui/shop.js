var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop (9.4, V9, V10.7): a scene reached from the map. The left of the screen is a
// baked, painted interior (plank walls under a hanging lamp, a pegboard of lure packets,
// mounted trophies, and the shopkeeper leaning on the counter); the right is the shop panel:
// a tab per shelf (gear tiers, equipment, bait), the selected item large with its practical
// effect, and the shelf's items as tiles. The shopkeeper says one line per visit
// (data/dialogue.js). Time passes here and unease drains (V10.1). Esc or M goes back out.
G.ui = G.ui || {};
G.ui.shop = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, E = G.sim.economy;

  // Shelves (the panel's tabs). kind: a gear kind for economy.buy, or 'bait' with an id.
  var SHELVES = [
    [{ kind: 'rod', spr: 'shopi_rod' }, { kind: 'reel', spr: 'shopi_reel' }, { kind: 'line', spr: 'shopi_line' }],
    [{ kind: 'lantern', spr: 'shopi_lantern' }, { kind: 'depthFinder', spr: 'shopi_finder' }],
    [{ kind: 'bait', id: 'worm', spr: 'shopi_worm' }, { kind: 'bait', id: 'cricket', spr: 'shopi_cricket' },
     { kind: 'bait', id: 'minnow', spr: 'shopi_minnow' }, { kind: 'bait', id: 'unlabelled', spr: 'shopi_jar' }]
  ];
  var TABS = [{ name: 'RODS & REELS', spr: 'shop_rod' }, { name: 'EQUIPMENT', spr: 'shop_lantern' }, { name: 'BAIT', spr: 'shop_worm' }];
  var REVEAL = 160; // px of speech shown per second

  // Panel layout (the right of the screen).
  var PX = 202, PY = 19, PW = 113, PH = 156;
  var TAB_X = 218, TAB_STEP = 28, TAB_W = 24, TAB_Y = 5;
  var TILE = 22, TILE_GAP = 4, GRID_Y = 128;
  var DESC_Y = 74, DESC_W = 104, STATUS_Y = 108, NAME_W = 60;
  // The keeper's face, for the blink and the moving mouth drawn over the baked room.
  var EYE_L = 95, EYE_R = 104, EYE_Y = 51, MOUTH_X = 98, MOUTH_Y = 58;
  var BUBBLE_X = 124, BUBBLE_W = 72;

  // ---- Sprites ---------------------------------------------------------------------------
  // Tab icons (small).
  S.def('shop_rod', { w: 'wood_hi', r: 'stone_hi', g: 'rust' }, [
    '..........w', '.........w.', '........w..', '.......w...', '......w....', '.....w.....',
    '....w......', '...rw......', '..rrr......', '..gw.......', '.g.........'
  ]);
  S.def('shop_lantern', { r: 'rust', g: 'lamp_glow', h: 'rust_hi' }, [
    '..h..', '.rrr.', 'r.r.r', 'rgggr', 'rgggr', 'rgggr', '.rrr.', 'rrrrr'
  ]);
  S.def('shop_worm', { f: 'skin_hi', d: 'flesh', k: 'ink', s: 'stone_hi' }, [
    '.ff......', 'fddf...s.', 'd..df..s.', '....dfds.', '.....dd..'
  ]);
  // Item icons, 16×16: shown 1× on the tiles and 2× in the detail box. Lit from the top left.
  S.def('shopi_rod', { h: 'wood_hi', d: 'wood', c: 'paper', k: 'ink', s: 'stone_hi', l: 'fog_light' }, [
    '................', '..............hl', '.............hdl', '............sd.l',
    '...........hd..l', '..........hd...l', '.........sd....l', '........hd.....l',
    '.......hd......l', '......hd.......s', '.....sd......s.s', '....ccss.....sss',
    '...cc.ddk.......', '..cc............', '.dc.............', '.d..............'
  ]);
  S.def('shopi_reel', { s: 'stone_hi', m: 'stone', d: 'stone_dark', k: 'ink', h: 'wood_hi', l: 'fog_light' }, [
    '................', '....mmmmmm......', '......mm........', '.....sss........',
    '...sslllsd......', '..sllllllld.....', '.sllmmmmllld....', '.sllmmkmmlld....',
    '.sllmkhkmlldkkhh', '.sllmmkmmlld..hh', '.dllmmmmllld....', '..dlllllldd.....',
    '...ddllldd......', '.....ddd........', '................', '................'
  ]);
  S.def('shopi_line', { h: 'wood_hi', d: 'wood', L: 'water_foam', W: 'water_hi', k: 'ink', p: 'paper' }, [
    '................', '................', '..hhhhhhhhhhhh..', '..dddddddddddd..',
    '....LWWWWWWk....', '....LLWLWWWk....', '....LWWWWWWk....', '....pppppppk....',
    '....pkkkpppk....', '....pppppppk....', '....LWWWWWWk....', '....LWLWWWWk....',
    '..hhhhhhhhhhhh..', '..dddddddddddd..', '................', '................'
  ]);
  S.def('shopi_lantern', { r: 'rust', R: 'rust_hi', D: 'rust_dark', g: 'lamp_glow', a: 'signal_amber', k: 'ink' }, [
    '.......kk.......', '......k..k......', '.....k....k.....', '......RRRR......',
    '.....RrrrrD.....', '....DrrrrrrD....', '.....raggar.....', '.....rggggr.....',
    '.....rgggar.....', '.....raggar.....', '.....rggggr.....', '....DrrrrrrD....',
    '....RrrrrrrD....', '...DDDDDDDDDD...', '................', '................'
  ]);
  S.def('shopi_finder', { s: 'stone_hi', m: 'stone', d: 'stone_dark', k: 'ink', t: 'neon_teal', a: 'signal_amber' }, [
    '................', '................', '..smmmmmmmmmmd..', '..smkkkkkkkkmd..',
    '..smkttkkkkkmd..', '..smkkkttkkkmd..', '..smkkkkkttkmd..', '..smkakkkkkkmd..',
    '..smttkkkkttmd..', '..smkkttttkkmd..', '..smmmmmmmmmmd..', '..smmammsmsmmd..',
    '..dddddddddddd..', '......dmmd......', '.....dddddd.....', '................'
  ]);
  S.def('shopi_worm', { b: 'bone', p: 'paper', s: 'stone_hi', d: 'wood_dark', D: 'wood', f: 'flesh', F: 'flesh_dark', r: 'rust_hi' }, [
    '................', '................', '.......ff.......', '......f..F...f..',
    '......F..f..fF..', '..bDdDdFdDdfDs..', '..bbbbbbbbbbbs..', '...bpppppppps...',
    '...bprrrrrrps...', '...bpppppppps...', '....bpppppps....', '....bpppppps....',
    '....bpppppps....', '....ssssssss....', '................', '................'
  ]);
  S.def('shopi_cricket', { h: 'wood_hi', d: 'wood', D: 'wood_dark', m: 'stone', k: 'ink', g: 'moss_hi', G: 'moss' }, [
    '................', '................', '................', '..hhhhhhhhhhhh..',
    '..hddddddddddD..', '..hmkmkmkmkmkD..', '..hkmkmGgmkmkD..', '..hmkmGggGkmkD..',
    '..hkmGkmkGmkmD..', '..hmkmkmkmkmkD..', '..hddddddddddD..', '..DDDDDDDDDDDD..',
    '................', '................', '................', '................'
  ]);
  S.def('shopi_minnow', { s: 'stone_hi', m: 'stone', d: 'stone_dark', w: 'water_hi', W: 'water_mid', f: 'fog_light' }, [
    '................', '................', '.....mmmmmm.....', '....m......m....',
    '...m........m...', '..sssssssssssd..', '..swwfffwwWWWd..', '..smmmmmmmmmmd..',
    '...smmmmmmmmd...', '...smddddddmd...', '...smmmmmmmmd...', '...smmmmmmmmd...',
    '....smmmmmmd....', '....dddddddd....', '................', '................'
  ]);
  S.def('shopi_jar', { l: 'stone_hi', L: 'stone', g: 'fog_light', b: 'blood', c: 'crimson', k: 'ink' }, [
    '................', '....LllllllL....', '....LLLLLLLL....', '...g........g...',
    '..gbbbbbbbbbbg..', '..gcbbbbbbbbbg..', '..gcbbbbbbkbbg..', '..gbbbbbbbbbbg..',
    '..gcbbbbbbbbbg..', '..gbbbbbbbbbbg..', '..gbbbbbbbbbbg..', '..gbbbbbbbbbbg..',
    '...gggggggggg...', '................', '................', '................'
  ]);

  // ---- Painting (baked once) ----------------------------------------------------------------
  var D = G.gfx.paint.dither;
  // fillStyle is only set when the key changes: the room is painted a pixel at a time.
  var penCtx = null, penKey = '';
  function pen(ctx, key) { if (ctx !== penCtx || key !== penKey) { ctx.fillStyle = P[key]; penCtx = ctx; penKey = key; } }
  function px(ctx, key, x, y) { pen(ctx, key); ctx.fillRect(x, y, 1, 1); }
  function box(ctx, key, x, y, w, h) { pen(ctx, key); ctx.fillRect(x, y, w, h); }
  // A small integer hash for plank tones and grain (deterministic, no RNG needed).
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // Picks one of keys [dark, mid, lit] from a light value, dithering across the edges.
  function shade(keys, l, x, y) {
    var b = l + (D(x, y, 0.5) ? 0.06 : -0.06);
    return b > 0.32 ? keys[2] : (b > -0.28 ? keys[1] : keys[0]);
  }

  // A shaded ellipse, lit from the top left. bias raises or lowers the light overall.
  function blob(ctx, cx, cy, rx, ry, keys, bias) {
    for (var y = Math.ceil(-ry); y <= ry; y++) for (var x = Math.ceil(-rx); x <= rx; x++) {
      var nx = x / rx, ny = y / ry;
      if (nx * nx + ny * ny > 1) continue;
      px(ctx, shade(keys, -nx * 0.55 - ny * 0.7 + (bias || 0), cx + x, cy + y), cx + x, cy + y);
    }
  }

  // A shaded capsule from (x0, y0) to (x1, y1) of radius r: a sleeve or a forearm.
  function limb(ctx, x0, y0, x1, y1, r, keys, bias) {
    var dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy, x, y;
    for (y = Math.floor(Math.min(y0, y1) - r); y <= Math.max(y0, y1) + r; y++) {
      for (x = Math.floor(Math.min(x0, x1) - r); x <= Math.max(x0, x1) + r; x++) {
        var t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2));
        var ex = x - (x0 + t * dx), ey = y - (y0 + t * dy);
        if (ex * ex + ey * ey > r * r) continue;
        px(ctx, shade(keys, (-ex - ey * 0.6) / r * 0.6 + (bias || 0), x, y), x, y);
      }
    }
  }

  var HAIR = ['stone', 'stone_hi', 'birch'], SKIN = ['flesh_dark', 'flesh', 'skin_hi'];
  var KNIT = ['dusk_violet', 'dusk_plum', 'dusk_rose'], APRON = ['reed_hi', 'paper', 'bone'];

  // Light from the hanging lamp: 1 under the shade, 0 at the corners of the room.
  function lampLight(x, y) {
    var dx = (x - 98) / 105, dy = (y - 16) / 110;
    return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
  }

  // Vertical planks, warm under the lamp and falling into dark at the edges, with grain.
  function paintWall(ctx) {
    for (var y = 0; y < 112; y++) for (var x = 0; x < 200; x++) {
      var p = (x / 11) | 0, lx = x % 11, L = lampLight(x, y);
      var v = 0.12 + 0.62 * L + (hash(p, 7) - 0.5) * 0.12 + (hash(x, (y / 5) | 0) < 0.1 ? -0.1 : 0);
      if (lx === 1) v += 0.08;
      if (lx === 10) v -= 0.08;
      v += D(x, y, 0.5) ? 0.04 : -0.04;
      var k = v > 0.66 ? 'wood_hi' : (v > 0.36 ? 'wood' : 'wood_dark');
      if (lx === 0) k = v > 0.5 ? 'wood_dark' : 'ink';
      px(ctx, k, x, y);
    }
    // The ceiling beam.
    box(ctx, 'wood_dark', 0, 0, 200, 4); box(ctx, 'wood', 0, 1, 200, 1); box(ctx, 'ink', 0, 4, 200, 1);
  }

  // A pegboard with hanging packets of lures, partly hidden behind the keeper.
  var PACK_KEYS = ['rust_hi', 'water_hi', 'moss_hi', 'dusk_rose', 'signal_amber', 'neon_teal', 'leaf_gold', 'crimson'];
  function pegboard(ctx, x0, y0, w, h, cols, rows) {
    var x, y, i, j;
    box(ctx, 'ink', x0 - 1, y0 - 1, w + 2, h + 2);
    for (y = y0; y < y0 + h; y++) for (x = x0; x < x0 + w; x++) {
      var L = lampLight(x, y) + (D(x, y, 0.5) ? 0.04 : -0.04);
      var k = L > 0.62 ? 'wood_hi' : 'wood';
      if ((x - x0) % 4 === 2 && (y - y0) % 4 === 2) k = 'wood_dark';
      px(ctx, k, x, y);
    }
    box(ctx, 'wood_hi', x0, y0, w, 1); box(ctx, 'wood_dark', x0, y0 + h - 1, w, 1);
    var cw = Math.floor((w - 4) / cols), rh = Math.floor((h - 4) / rows);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var n = j * cols + i, cx = x0 + 3 + i * cw, cy = y0 + 5 + j * rh, c = PACK_KEYS[(n * 5 + j) % PACK_KEYS.length];
      var pw = cw - 3, ph = Math.min(rh - 4, 13);
      box(ctx, 'stone_hi', cx + (pw >> 1), cy - 3, 1, 3);            // the peg
      box(ctx, 'ink', cx - 1, cy - 1, pw + 2, ph + 2);
      box(ctx, 'paper', cx, cy, pw, ph);
      box(ctx, c, cx, cy, pw, 3);                                    // the printed header
      box(ctx, 'bone', cx, cy, pw, 1);
      box(ctx, 'fog_mid', cx + 1, cy + 4, pw - 2, ph - 6);           // the clear window
      var lk = PACK_KEYS[(n * 3 + 2) % PACK_KEYS.length], ly = cy + 5 + (n % 3);
      box(ctx, lk, cx + 2, ly, pw - 5, 2);                           // the lure
      px(ctx, 'ink', cx + 2, ly);
      px(ctx, 'stone_hi', cx + pw - 3, ly + 2); px(ctx, 'stone_hi', cx + pw - 3, ly + 3);
      box(ctx, 'reed_hi', cx, cy + ph - 1, pw, 1);
    }
  }

  // A plank shelf with brackets and a shadow under it.
  function shelf(ctx, x, y, w) {
    box(ctx, 'wood_hi', x, y, w, 1); box(ctx, 'wood', x, y + 1, w, 2); box(ctx, 'ink', x, y + 3, w, 1);
    box(ctx, 'wood_dark', x + 3, y + 4, 2, 4); box(ctx, 'wood_dark', x + w - 5, y + 4, 2, 4);
  }

  // A trophy: a species from the roster on a varnished plaque, twice size when it fits.
  function trophy(ctx, id, cx, cy, maxW) {
    var fish = G.data.fish, i, sp = 0;
    for (i = 0; i < fish.length; i++) if (fish[i].id === id) sp = i;
    var name = G.gfx.fishgen.sprite(sp), d = S.get(name), s = d.w * 2 + 10 <= maxW ? 2 : 1;
    var w = Math.min(maxW, d.w * s + 10), h = d.h * s + 8, x = cx - (w >> 1), y = cy - (h >> 1);
    box(ctx, 'ink', x - 1, y + 1, w + 2, h);
    box(ctx, 'ink', x, y - 1, w, h + 2);
    box(ctx, 'wood_hi', x, y, w, h); box(ctx, 'wood', x + 1, y + 1, w - 2, h - 2);
    box(ctx, 'wood_dark', x + 2, y + h - 2, w - 3, 1); box(ctx, 'wood_hi', x + 1, y + 1, w - 3, 1);
    box(ctx, 'leaf_gold', cx - 5, y + h - 4, 10, 2);                 // the brass name plate
    ctx.save(); ctx.translate(cx - ((d.w * s) >> 1), y + 3); ctx.scale(s, s);
    S.draw(ctx, name, 0, 0, 0, false);
    ctx.restore();
  }

  // The window: fog outside, never brighter than the dusk ceiling.
  function window_(ctx, x, y, w, h) {
    var i;
    box(ctx, 'ink', x - 1, y - 1, w + 2, h + 2);
    box(ctx, 'wood_hi', x, y, w, h);
    box(ctx, 'fog_dark', x + 3, y + 3, w - 6, h - 6);
    box(ctx, 'fog_mid', x + 3, y + 3 + ((h - 6) >> 1), w - 6, (h - 6) >> 1);
    pen(ctx, 'fog_light');
    for (i = 0; i < 7; i++) ctx.fillRect(x + 4 + (i * 13) % (w - 14), y + 7 + (i * 5) % (h - 12), 4 + (i % 3) * 2, 1);
    box(ctx, 'night_ink', x + 3, y + h - 7, w - 6, 4);
    box(ctx, 'wood_hi', x + (w >> 1) - 1, y + 3, 2, h - 6); box(ctx, 'wood_hi', x + 3, y + (h >> 1) - 1, w - 6, 2);
    box(ctx, 'wood', x + 3, y + h - 3, w - 6, 1);
  }

  // The keeper (original): an older woman with a grey bun and round glasses, a plum cardigan
  // and a canvas apron, leaning on the counter. Her blink and her mouth are drawn live.
  function keeper(ctx) {
    var x, y, cx = 100;
    // Cardigan body, rounded at the shoulders.
    for (y = 63; y < 112; y++) {
      var hw = Math.min(30, Math.round(14 + Math.sqrt(y - 62) * 6.2));
      for (x = -hw; x <= hw; x++) {
        var l = -x / hw * 0.7 + (y < 72 ? 0.25 : 0) - (y - 63) / 120 + (((y >> 1) & 1) && D(cx + x, y, 0.3) ? -0.2 : 0);
        px(ctx, shade(KNIT, l, cx + x, y), cx + x, y);
      }
    }
    // The blouse in the neck of the cardigan, and its collar.
    for (y = 63; y < 86; y++) { var vw = Math.max(0, Math.round((86 - y) / 3)); for (x = -vw; x <= vw; x++) px(ctx, x < 0 ? 'bone' : 'paper', cx + x, y); }
    for (x = 0; x < 6; x++) { px(ctx, 'bone', cx - 7 + x, 63 + (x >> 1)); px(ctx, 'paper', cx + 7 - x, 63 + (x >> 1)); }
    // The apron: a bib on straps, wider at the waist, a pocket with a pencil, a stitched fish.
    for (y = 76; y < 112; y++) {
      var aw = y < 92 ? 12 : Math.min(20, 12 + (y - 92));
      for (x = -aw; x <= aw; x++) px(ctx, shade(APRON, -x / aw * 0.6 + 0.1, cx + x, y), cx + x, y);
      px(ctx, 'reed', cx - aw, y); px(ctx, 'reed', cx + aw, y);
    }
    for (y = 64; y < 77; y++) { px(ctx, 'paper', cx - 13 - ((76 - y) >> 2), y); px(ctx, 'reed_hi', cx + 13 + ((76 - y) >> 2), y); }
    box(ctx, 'reed_hi', cx - 9, 97, 18, 1); box(ctx, 'paper', cx - 9, 98, 18, 8); box(ctx, 'reed_hi', cx, 98, 1, 8);
    box(ctx, 'rust_hi', cx - 6, 93, 1, 5); px(ctx, 'ink', cx - 6, 92);
    box(ctx, 'water_hi', cx + 4, 94, 1, 4); px(ctx, 'stone_hi', cx + 4, 93);
    pen(ctx, 'water_hi');
    ctx.fillRect(cx - 3, 83, 5, 1); ctx.fillRect(cx - 4, 84, 7, 1); ctx.fillRect(cx - 3, 85, 5, 1); ctx.fillRect(cx + 3, 83, 1, 3);
    // Buttons down the cardigan.
    for (y = 88; y < 108; y += 6) { px(ctx, 'bone', cx - 15, y); px(ctx, 'bone', cx + 15, y); }
    // The neck, the hair behind, the bun, the ears and the face.
    blob(ctx, cx, 61, 4, 4, SKIN, -0.2);
    blob(ctx, cx, 45, 12, 12, HAIR, 0);
    blob(ctx, cx + 1, 31, 6, 5, HAIR, 0.1);
    for (x = -5; x <= 5; x++) px(ctx, 'stone', cx + 1 + x, 35);           // the band round the bun
    blob(ctx, cx - 10, 51, 2, 3, SKIN, 0.1); blob(ctx, cx + 10, 51, 2, 3, SKIN, -0.1);
    blob(ctx, cx, 51, 9, 11, SKIN, 0.45);
    // The fringe, swept to one side.
    for (y = 38; y < 46; y++) for (x = -10; x <= 10; x++) {
      var edge = 43 - Math.round(Math.abs(x + 3) / 3) + (x > 3 ? 1 : 0);
      if (y <= edge && (x * x) / 110 + ((y - 45) * (y - 45)) / 80 <= 1) px(ctx, shade(HAIR, -x / 10 * 0.5 + 0.1 - (y - 38) / 14, cx + x, y), cx + x, y);
    }
    // Brows, glasses (rings with a glint), eyes, nose, cheeks and the smile.
    box(ctx, 'stone', EYE_L - 1, 46, 4, 1); box(ctx, 'stone', EYE_R - 1, 46, 4, 1);
    for (y = -4; y <= 4; y++) for (x = -4; x <= 4; x++) {
      var r = Math.sqrt(x * x + y * y);
      if (r > 2.6 && r < 3.7) { px(ctx, y < 0 && x < 0 ? 'stone_hi' : 'stone_dark', EYE_L + 0.5 + x | 0, EYE_Y + y); px(ctx, y < 0 && x < 0 ? 'stone_hi' : 'stone_dark', EYE_R + 0.5 + x | 0, EYE_Y + y); }
    }
    box(ctx, 'stone_dark', EYE_L + 4, EYE_Y - 1, 2, 1);
    px(ctx, 'fog_light', EYE_L - 1, EYE_Y - 2); px(ctx, 'fog_light', EYE_R - 1, EYE_Y - 2);
    box(ctx, 'ink', EYE_L, EYE_Y, 2, 2); box(ctx, 'ink', EYE_R, EYE_Y, 2, 2);
    px(ctx, 'skin_hi', cx - 1, 53); px(ctx, 'flesh_dark', cx + 1, 54); px(ctx, 'flesh_dark', cx, 55);
    box(ctx, 'dusk_rose', EYE_L - 1, 55, 2, 1); box(ctx, 'dusk_rose', EYE_R + 1, 55, 2, 1);
    box(ctx, 'flesh_dark', MOUTH_X, MOUTH_Y, 4, 1); px(ctx, 'flesh_dark', MOUTH_X - 1, MOUTH_Y - 1); px(ctx, 'flesh_dark', MOUTH_X + 4, MOUTH_Y - 1);
    // Sleeves down to the elbows, forearms coming in to rest on the counter.
    limb(ctx, cx - 26, 70, cx - 30, 94, 6, KNIT, 0.15);
    limb(ctx, cx + 26, 70, cx + 30, 94, 6, KNIT, -0.15);
    limb(ctx, cx - 30, 94, cx - 15, 106, 5, KNIT, 0.15);
    limb(ctx, cx + 30, 94, cx + 15, 106, 5, KNIT, -0.15);
  }

  function counter(ctx) {
    var x, i;
    // The top, its lit front edge, the face of the counter with boards and a trim.
    box(ctx, 'wood', 0, 108, 200, 4); box(ctx, 'wood_hi', 0, 108, 200, 1); box(ctx, 'wood_hi', 0, 112, 200, 1); box(ctx, 'ink', 0, 113, 200, 1);
    box(ctx, 'wood_dark', 0, 114, 200, 66);
    for (x = 0; x < 200; x++) for (var y = 114; y < 180; y++) {
      if (x % 14 === 0) px(ctx, 'ink', x, y);
      else if (x % 14 === 1 || (hash(x, (y / 4) | 0) < 0.06)) px(ctx, 'wood', x, y);
    }
    box(ctx, 'wood', 0, 120, 200, 2); box(ctx, 'wood_hi', 0, 120, 200, 1); box(ctx, 'ink', 0, 122, 200, 1);
    // An open cubby under the counter with a row of jars.
    box(ctx, 'ink', 4, 125, 192, 22);
    box(ctx, 'wood_dark', 4, 145, 192, 2); box(ctx, 'wood', 4, 147, 192, 1); box(ctx, 'ink', 4, 148, 192, 1);
    var LID = ['rust', 'stone', 'rust_hi', 'moss'], FILL = ['moss_dark', 'rust_dark', 'wood_dark', 'blood', 'stone_dark'];
    for (i = 0; i < 11; i++) {
      var jx = 10 + i * 17, jh = 12 + (i % 3) * 2, jy = 145 - jh;
      box(ctx, 'stone_dark', jx, jy + 2, 11, jh - 2);
      box(ctx, FILL[i % FILL.length], jx + 1, jy + 5, 9, jh - 6);
      box(ctx, 'stone', jx, jy + 2, 1, jh - 2);
      box(ctx, LID[i % LID.length], jx + 1, jy, 9, 2);
      box(ctx, 'paper', jx + 2, jy + 6, 7, 4); box(ctx, 'reed_hi', jx + 3, jy + 7, 5, 1);
    }
    // A notice taped to the front.
    box(ctx, 'ink', 9, 154, 40, 22); box(ctx, 'paper', 10, 155, 38, 20); box(ctx, 'bone', 10, 155, 38, 1);
    box(ctx, 'fog_light', 12, 153, 6, 3); box(ctx, 'fog_light', 40, 153, 6, 3);
    S.drawText(ctx, 'OPEN', 29 - (S.measure('OPEN') >> 1), 158, 'rust');
    S.drawText(ctx, 'LATE', 29 - (S.measure('LATE') >> 1), 166, 'rust_dark');
  }

  // What stands on the counter, in front of the keeper: her hands, the register (its clock
  // stopped at 3:33), a jar of worms, a bell and a notepad.
  function onCounter(ctx) {
    var cx = 100;
    blob(ctx, cx - 14, 107, 5, 3, SKIN, 0.2); blob(ctx, cx + 14, 107, 5, 3, SKIN, 0);
    box(ctx, 'bone', cx - 20, 103, 3, 6); box(ctx, 'paper', cx + 17, 103, 3, 6);  // cuffs
    px(ctx, 'flesh_dark', cx - 14, 109); px(ctx, 'flesh_dark', cx - 11, 109); px(ctx, 'flesh_dark', cx + 11, 109); px(ctx, 'flesh_dark', cx + 14, 109);
    // Register.
    box(ctx, 'ink', 7, 85, 40, 25);
    box(ctx, 'stone_dark', 20, 77, 14, 9); box(ctx, 'ink', 21, 78, 12, 7);
    S.drawText(ctx, '3:33', 27 - (S.measure('3:33') >> 1), 79, 'signal_amber');
    for (var y = 86; y < 109; y++) for (var x = 8; x < 46; x++) px(ctx, shade(APRON, (8 - x) / 40 + (y < 92 ? 0.3 : 0.05), x, y), x, y);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 5; c++) box(ctx, (r + c) % 4 ? 'stone_hi' : 'rust_hi', 12 + c * 6, 91 + r * 4, 4, 2);
    box(ctx, 'reed', 8, 103, 38, 1); box(ctx, 'reed_hi', 8, 104, 38, 4); box(ctx, 'stone_dark', 24, 105, 6, 1);
    // A jar of worms.
    box(ctx, 'ink', 133, 94, 14, 16); box(ctx, 'rust', 134, 93, 12, 3); box(ctx, 'rust_hi', 134, 93, 12, 1);
    box(ctx, 'fog_mid', 134, 96, 12, 13); box(ctx, 'wood_dark', 135, 100, 10, 8);
    px(ctx, 'flesh', 137, 99); px(ctx, 'flesh', 138, 98); px(ctx, 'flesh', 139, 99); px(ctx, 'flesh', 142, 101); px(ctx, 'flesh', 143, 100);
    box(ctx, 'fog_light', 135, 97, 1, 10);
    // The bell.
    box(ctx, 'ink', 155, 109, 11, 1); blob(ctx, 160, 108, 4, 3, ['stone', 'stone_hi', 'birch'], 0); px(ctx, 'stone_hi', 160, 104);
    // A notepad and a pencil.
    box(ctx, 'ink', 169, 108, 22, 3); box(ctx, 'paper', 170, 108, 20, 2); box(ctx, 'bone', 170, 108, 20, 1);
    box(ctx, 'rust_hi', 172, 107, 14, 1); px(ctx, 'ink', 171, 107);
  }

  // The shop panel's frame (the live parts are drawn each frame).
  function panelFrame(ctx) {
    box(ctx, 'ink', 200, 0, 120, 180);
    box(ctx, 'rust', PX - 1, PY - 1, PW + 2, PH + 2);
    box(ctx, 'rust_dark', PX, PY, PW, PH);
    box(ctx, 'rust', PX + 3, GRID_Y - 6, PW - 6, 1);
  }

  function paintRoom(ctx) {
    paintWall(ctx);
    // The left wall: a shelf with a radio and books, a trophy, the sign.
    shelf(ctx, 2, 24, 62);
    box(ctx, 'ink', 5, 11, 26, 13); box(ctx, 'stone', 6, 12, 24, 12); box(ctx, 'stone_hi', 6, 12, 24, 1);
    for (var i = 0; i < 5; i++) for (var j = 0; j < 4; j++) px(ctx, 'stone_dark', 8 + i * 2, 15 + j * 2);
    box(ctx, 'ink', 20, 15, 8, 5); box(ctx, 'signal_amber', 21, 17, 6, 1); px(ctx, 'neon_red', 23, 16);
    box(ctx, 'stone_hi', 28, 3, 1, 9);
    var BOOK = ['dusk_plum', 'rust', 'moss', 'fog_mid', 'bone', 'water_mid', 'rust_hi'];
    for (i = 0; i < 9; i++) {
      var bh = 9 + (i * 7) % 4, bx = 35 + i * 3;
      box(ctx, 'ink', bx, 24 - bh - 1, 3, bh + 1); box(ctx, BOOK[i % BOOK.length], bx, 24 - bh, 2, bh);
      px(ctx, 'paper', bx, 24 - bh + 2);
    }
    trophy(ctx, 'gloam_perch', 33, 39, 60);
    // The sign: an oval board hung on two chains.
    pen(ctx, 'stone');
    ctx.fillRect(14, 50, 1, 7); ctx.fillRect(52, 50, 1, 7);
    for (var y = -11; y <= 11; y++) for (var x = -30; x <= 30; x++) {
      var e = (x * x) / 900 + (y * y) / 121;
      if (e > 1) continue;
      px(ctx, e > 0.78 ? (y < 0 ? 'wood_hi' : 'wood') : shade(['paper', 'paper', 'bone'], -x / 60 - y / 22, 33 + x, 68 + y), 33 + x, 68 + y);
    }
    S.drawText(ctx, 'BAIT &', 33 - (S.measure('BAIT &') >> 1), 61, 'rust');
    S.drawText(ctx, 'TACKLE', 33 - (S.measure('TACKLE') >> 1), 69, 'water_mid');
    box(ctx, 'rust_hi', 18, 76, 30, 1);
    // The back: the pegboard and the lamp's pool of light.
    pegboard(ctx, 66, 9, 74, 94, 6, 4);
    // The right wall (its top sits behind the speech): a calendar, a stranger trophy, the
    // window, a shelf of tackle boxes.
    box(ctx, 'ink', 155, 7, 32, 28); box(ctx, 'paper', 156, 8, 30, 26); box(ctx, 'crimson', 156, 8, 30, 7);
    S.drawText(ctx, 'OCT', 171 - (S.measure('OCT') >> 1), 9, 'bone');
    for (i = 0; i < 4; i++) for (j = 0; j < 6; j++) px(ctx, i * 6 + j === 15 ? 'crimson' : 'reed_hi', 158 + j * 5, 18 + i * 4);
    trophy(ctx, 'hollow_pike', 171, 48, 54);
    window_(ctx, 150, 63, 42, 29);
    shelf(ctx, 146, 100, 50);
    box(ctx, 'ink', 150, 88, 22, 12); box(ctx, 'moss', 151, 89, 20, 11); box(ctx, 'moss_hi', 151, 89, 20, 1); box(ctx, 'stone_hi', 159, 92, 4, 2);
    box(ctx, 'ink', 174, 92, 18, 8); box(ctx, 'crimson', 175, 93, 16, 7); box(ctx, 'neon_red', 175, 93, 16, 1); box(ctx, 'stone_hi', 182, 95, 3, 2);
    // The lamp: a cord, a green enamel shade, the bulb.
    box(ctx, 'ink', 98, 0, 1, 6);
    for (y = 0; y < 7; y++) for (x = -4 - y; x <= 4 + y; x++) px(ctx, y === 6 ? 'moss_dark' : (x < -y ? 'moss_hi' : (x > y ? 'moss_dark' : 'moss')), 98 + x, 6 + y);
    box(ctx, 'lamp_glow', 95, 13, 7, 2); box(ctx, 'signal_amber', 96, 15, 5, 1);
    keeper(ctx);
    counter(ctx);
    onCounter(ctx);
    panelFrame(ctx);
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
  var room = null, row = 0, col = 0, t = 0, line = null, speech = [], speechH = 0, speechEnd = 0;
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
    txt.name = S.wrap(name, NAME_W);
    txt.desc = S.wrap(desc, DESC_W);
    txt.status = S.wrap(status, DESC_W);
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

  function say(s, key) { txt.msg = s ? S.wrap(s, DESC_W) : []; txt.msgKey = key || 'fog_light'; }

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
    if (!room) room = G.gfx.bake.cached('shop:room', function () { return G.gfx.bake.layer(320, 180, paintRoom); });
    row = 0; col = 0; t = 0;
    line = pickLine(save, G.data.dialogue, save.clock);
    speech.length = 0;
    var said = spoken(line);
    for (var i = 0; i < said.length; i++) {
      var ls = S.wrap(said[i], BUBBLE_W - 6);
      for (var k = 0; k < ls.length; k++) speech.push({ s: ls[k], w: S.measure(ls[k]), y: speech.length * S.LINE_H + i * 3, at: 0 });
    }
    // Each line starts revealing when the one before it is done; a repeat waits a beat first.
    var at = 0.3;
    for (i = 0; i < speech.length; i++) {
      if (i > 0 && speech[i].y - speech[i - 1].y > S.LINE_H) at += 1.2;
      speech[i].at = at; at += speech[i].w / REVEAL;
    }
    speechEnd = at;
    speechH = speech.length ? speech[speech.length - 1].y + S.LINE_H : 0;
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

  // A bevelled tile: lit on the top and left, shaded on the bottom and right.
  function tile(ctx, x, y, w, h, sel) {
    ctx.fillStyle = P[sel ? 'signal_amber' : 'ink']; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = P.wood; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = P.wood_dark; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  }

  function lines(ctx, ls, x, y, max, key) {
    for (var i = 0; i < ls.length && i < max; i++) S.drawText(ctx, ls[i], x, y + i * S.LINE_H, key);
  }

  function draw(ctx) {
    var save = G.state.save, i, x, d;
    ctx.drawImage(room, 0, 0);

    // The keeper blinks now and then, and her mouth moves while her words come out (fixed
    // rhythms from the scene's time; no RNG in draw).
    if ((t % 4.3) > 4.15) {
      ctx.fillStyle = P.flesh; ctx.fillRect(EYE_L, EYE_Y - 1, 2, 2); ctx.fillRect(EYE_R, EYE_Y - 1, 2, 2);
      ctx.fillStyle = P.flesh_dark; ctx.fillRect(EYE_L, EYE_Y + 1, 2, 1); ctx.fillRect(EYE_R, EYE_Y + 1, 2, 1);
    }
    if (speech.length && t > speech[0].at && t < speechEnd && ((t * 9) | 0) % 2) {
      ctx.fillStyle = P.ink; ctx.fillRect(MOUTH_X, MOUTH_Y, 4, 2);
      ctx.fillStyle = P.flesh_dark; ctx.fillRect(MOUTH_X + 1, MOUTH_Y + 1, 2, 1);
    }

    // Speech, revealed left to right, in a bubble beside her head.
    if (speech.length) {
      var by = 8;
      M.panel(ctx, BUBBLE_X, by, BUBBLE_W, speechH + 6, 'stone', 'ink');
      var ty = by + speechH + 6; // the tail runs from the bubble's lower corner toward her face
      ctx.fillStyle = P.stone; ctx.fillRect(BUBBLE_X - 3, ty, 3, 1); ctx.fillRect(BUBBLE_X - 6, ty + 2, 2, 1); ctx.fillRect(BUBBLE_X - 9, ty + 4, 2, 1);
      ctx.fillStyle = P.ink; ctx.fillRect(BUBBLE_X - 3, ty + 1, 2, 1); ctx.fillRect(BUBBLE_X - 6, ty + 3, 2, 1);
      for (i = 0; i < speech.length; i++) {
        var sp = speech[i], w = Math.min(sp.w + 1, Math.max(0, (t - sp.at) * REVEAL));
        if (w <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(BUBBLE_X + 3, by + 3 + sp.y, w, S.LINE_H); ctx.clip();
        S.drawText(ctx, sp.s, BUBBLE_X + 3, by + 3 + sp.y, line.kind === 'reverse' ? 'dusk_rose' : 'bone');
        ctx.restore();
      }
    }

    // Tabs, one per shelf; the open one joins the panel.
    for (i = 0; i < TABS.length; i++) {
      x = TAB_X + i * TAB_STEP; var on = i === row;
      ctx.fillStyle = P.ink; ctx.fillRect(x - 2, TAB_Y - 2, TAB_W + 4, PY - TAB_Y + 2);
      ctx.fillStyle = P[on ? 'rust_hi' : 'rust']; ctx.fillRect(x - 1, TAB_Y - 1, TAB_W + 2, PY - TAB_Y + 1);
      ctx.fillStyle = P[on ? 'rust_dark' : 'wood_dark']; ctx.fillRect(x, TAB_Y, TAB_W, PY - TAB_Y + (on ? 1 : -1));
      d = S.get(TABS[i].spr);
      if (!on) ctx.globalAlpha = 0.6;
      S.draw(ctx, TABS[i].spr, x + ((TAB_W - d.w) >> 1), TAB_Y + ((PY - TAB_Y - d.h) >> 1), 0, false);
      ctx.globalAlpha = 1;
    }

    // Shelf name and coins.
    S.drawText(ctx, TABS[row].name, PX + 4, PY + 4, 'signal_amber');
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '' + save.coins; }
    x = PX + PW - 4 - S.measure(txt.coins);
    S.drawText(ctx, txt.coins, x, PY + 4, 'bone');
    S.draw(ctx, 'hud_coin', x - 6, PY + 5, 0, false);

    // The selected item, twice size, with its name and price beside it.
    var it = item();
    d = S.get(it.spr);
    tile(ctx, PX + 4, PY + 14, 36, 36, false);
    ctx.save(); ctx.translate(PX + 4 + ((36 - d.w * 2) >> 1), PY + 14 + ((36 - d.h * 2) >> 1)); ctx.scale(2, 2);
    S.draw(ctx, it.spr, 0, 0, 0, false);
    ctx.restore();
    tile(ctx, PX + 44, PY + 14, PW - 48, 36, false);
    lines(ctx, txt.name, PX + 47, PY + 17, 3, 'bone');
    if (txt.price) S.drawText(ctx, txt.price, PX + 47, PY + 40, 'signal_amber');
    lines(ctx, txt.desc, PX + 4, DESC_Y, 4, 'paper');
    if (txt.msg.length) lines(ctx, txt.msg, PX + 4, STATUS_Y, 2, txt.msgKey);
    else lines(ctx, txt.status, PX + 4, STATUS_Y, 2, 'fog_light');

    // The shelf's items as tiles.
    var items = SHELVES[row], n = items.length, gx = PX + ((PW - n * TILE - (n - 1) * TILE_GAP) >> 1);
    for (i = 0; i < n; i++) {
      x = gx + i * (TILE + TILE_GAP);
      tile(ctx, x, GRID_Y, TILE, TILE, i === col);
      d = S.get(items[i].spr);
      var dimmed = (items[i].kind === 'lantern' || items[i].kind === 'depthFinder') && txt.inUse[i];
      if (dimmed) ctx.globalAlpha = 0.45;
      S.draw(ctx, items[i].spr, x + ((TILE - d.w) >> 1), GRID_Y + ((TILE - d.h) >> 1), 0, false);
      ctx.globalAlpha = 1;
      if (txt.inUse[i]) { ctx.fillStyle = P.neon_teal; ctx.fillRect(x + 2, GRID_Y + 2, 2, 2); }
      if (txt.badge[i]) S.drawText(ctx, txt.badge[i], x + TILE - 1 - S.measure(txt.badge[i]), GRID_Y + TILE - 7, 'bone');
    }

    M.centre(ctx, 'W/S shelf  A/D item', PX + (PW >> 1), 158, 'fog_mid');
    M.centre(ctx, 'SPACE buy  ESC leave', PX + (PW >> 1), 166, 'fog_mid');
  }

  return {
    enter: enter, exit: exit, update: update, draw: draw, pickLine: pickLine, spoken: spoken,
    line: function () { return line; },
    select: function (r, c) { row = r; col = c; describe(); return txt.name.join(' '); },
    act: function () { act(); return txt.msg.join(' '); },
    text: function () { return txt; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var f = G.state.save && G.state.save.flags, l = G.ui.shop.line();
  if (!f) return 'shop: -';
  return 'shop visits ' + f.shopVisits + '  special said ' + Object.keys(f.lines).join(',') + (l && G.core.state.sceneName() === 'shop' ? '  now ' + (l.id || 'small') : '');
});
