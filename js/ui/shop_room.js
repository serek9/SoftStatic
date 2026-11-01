var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view, as a building is
// in a retro Pokémon game. The fisher walks it tile by tile (a tap turns, a hold walks), the
// dog follows a tile behind, and what he faces is what Space talks to. This file is the room;
// js/ui/room.js has the walk and the people, js/ui/room_kit.js the parts, js/ui/shop.js the scene.
// Phase 56: repainted at the lakes' density, lofi and worn: a tall back wall of 70s panelling
// under a beam strung with bulbs, two windows onto the lake (a dim BAIT neon in one), a wall
// trophy, a fish chart, a pegboard of lure packets, a clock and a calendar; the rack, the jar
// shelf, the lure case and the gear shelf; a guitar on its amp; behind Rusty a back counter
// with a coffee maker, a boombox and a small CRT showing a fishing show; the counter a prop
// he stands behind, with the till stuck at 3:33, a banker's lamp, a bell and an ashtray; a
// bait station of cooler, cricket cage and aerated tank; a chest freezer, a tall plant, a 70s
// rug, a worn path to the counter. Visual and input only: no randomness, nothing saved.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, K = G.ui.roomKit, R = G.ui.room, X = G.gfx.pix, tone = X.tone;
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, OX = (640 - W) >> 1, OY = (360 - H) >> 1, TOP = 44, RH = H + TOP;
  var STEP = R.STEP;

  // The map: w wall face (the north wall, seen), W a window in it, s side or south wall (its
  // top seen), d the door, m the mat, r the rug, . the floor.
  var MAP = [
    'wwwWWwwwwWWw',
    's..........s',
    's..........s',
    's..........s',
    's...rrr....s',
    's...rrr....s',
    's.....m....s',
    'ssssssdsssss'
  ];
  // Objects: their tiles (c, r, w, h), whether they block, and what Space does facing them.
  // `talk` is the scene's: 'rusty' (the counter), a shelf (Phase 38), 'guitar' (Phase 56).
  var OBJECTS = [
    { id: 'rack', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'rack' },        // rods, reels and lines
    { id: 'jar', c: 3, r: 1, w: 1, h: 1, block: true, talk: 'jar' },          // the low shelf and the unlabelled jar
    { id: 'case', c: 4, r: 1, w: 1, h: 1, block: true, talk: 'lures' },       // Phase 43: the lure case under the window
    { id: 'gear', c: 6, r: 1, w: 1, h: 1, block: true, talk: 'gear' },        // lantern and depth finder
    { id: 'counter', c: 8, r: 2, w: 1, h: 2, block: true, talk: 'rusty' },
    { id: 'counter2', c: 9, r: 3, w: 2, h: 1, block: true, talk: 'rusty' },
    { id: 'behind', c: 8, r: 1, w: 3, h: 1, block: true, talk: '' },         // Rusty's side of the counter
    { id: 'behind2', c: 9, r: 2, w: 2, h: 1, block: true, talk: '' },
    { id: 'worms', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'worms' },
    { id: 'crickets', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'crickets' },
    { id: 'tank', c: 1, r: 5, w: 1, h: 1, block: true, talk: 'tank' },
    // Phase 56: the room's things in its corners and between the shelves.
    { id: 'fern', c: 5, r: 1, w: 1, h: 1, block: true, talk: '' },
    { id: 'guitar', c: 7, r: 1, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'freezer', c: 1, r: 6, w: 1, h: 1, block: true, talk: '' },
    { id: 'palm', c: 10, r: 6, w: 1, h: 1, block: true, talk: '' },
    { id: 'lamp', c: 3, r: 4, w: 1, h: 1, block: true, talk: '' }
  ];
  var DOOR = [6, 7], MAT = [6, 6], RUSTY = [9, 2], CLOCK = 7;
  var WK = R.walker(MAP, OBJECTS, MAT);

  // Room pixels: tile (c, r) has its top left at (c*T, TOP + r*T); the room is drawn at
  // (OX, OY - TOP), so the back wall rises above row 0 into the dark.
  function tx(c) { return c * T; }
  function ty(r) { return TOP + r * T; }
  var LAMP = [3 * T + 16, ty(4) + 4];                       // the floor lamp by the rug
  var DESK = [8 * T + 16, ty(2.3)];                         // the banker's lamp on the counter
  var WINS = [[3, 2], [9, 2]];                              // the windows: first column, width in tiles
  function glassRect(i) { var c = WINS[i][0]; return [tx(c) + 5, 11, WINS[i][1] * T - 10, TOP - 4]; }

  // The baked light: the lamp's warmth, the desk lamp, a little from the windows.
  function light(x, y) {
    var d = Math.hypot((x - LAMP[0]) / 150, (y - LAMP[1]) / 105), e = Math.hypot((x - DESK[0]) / 70, (y - DESK[1]) / 55);
    var L = 0.38 + Math.max(0, 1 - d) * 0.45 + Math.max(0, 1 - e) * 0.25;
    for (var i = 0; i < WINS.length; i++) { var g = glassRect(i), w = Math.hypot((x - g[0] - g[2] / 2) / 60, (y - 40) / 50); L += Math.max(0, 1 - w) * 0.12; }
    return Math.min(1, L);
  }
  // The worn path from the door to the counter, lighter boards.
  function wear(x, y) {
    var px = x - (6 * T + 16), py = y - ty(5);
    var a = Math.abs(px - py * -0.3) < 20 && y > ty(3) ? 0.08 : 0;
    var b = Math.abs(y - ty(4.5)) < 14 && x > 6 * T && x < 10 * T ? 0.06 : 0;
    return a + b;
  }

  // ---- Painting ---------------------------------------------------------------------------
  var box = A.box, px = A.px;
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'], WOODK = K.WOOD;
  function img(c, im, x, y) { c.drawImage(im, Math.round(x), Math.round(y)); A.reset(); }

  function paintBase(c) {
    A.reset();
    K.panelWall(c, T, W - 2 * T, TOP, light);
    K.floor(c, T, ty(1), W - 2 * T, H - 2 * T, light, { wear: wear });
    K.wallTops(c, W, RH, TOP, T, DOOR[0]);
    // The rug and the mat.
    K.rug(c, 4 * T + 2, ty(4) + 4, 3 * T - 4, 2 * T - 10, 'bands');
    A.area(c, tx(6) + 3, ty(6) + 6, T - 6, T - 9, function (x, y) { return (y - ty(6)) % 3 === 0 ? 'reed' : ((x + y) % 4 ? 'rust' : 'rust_dark'); });
    box(c, 'outline', tx(6) + 3, ty(6) + T - 3, T - 6, 1);
    // Cobwebs in the top corners; a loose board.
    for (var w = 0; w < 2; w++) { var cx = w ? W - T - 1 : T, dir = w ? -1 : 1; for (var k = 0; k < 4; k++) A.line(c, 'fog_mid', cx, 7, cx + dir * (22 - k * 5), 7 + k * 5); for (k = 1; k < 3; k++) A.line(c, 'fog_dark', cx + dir * k * 7, 7, cx, 7 + k * 7); }
    box(c, 'panel_deep', tx(3) + 4, ty(6) + 15, 30, 1); box(c, 'panel_hi', tx(3) + 4, ty(6) + 8, 30, 1);
    // The string lights' cable along the beam.
    cable = K.lightCable(c, T + 4, W - T - 4, 7, 46, 5);
    wallThings(c);
    shelves(c);
    behindCounter(c);
    baitStation(c);
    A.reset();
  }
  var cable = [];

  // The back wall: windows, the trophy, the chart, the clock and calendar, the pegboard.
  function wallThings(c) {
    var i;
    for (i = 0; i < WINS.length; i++) { var g = glassRect(i); K.windowFrame(c, g[0], g[1], g[2], g[3]); }
    // The trophy over the rack: a perch on an oval plaque, a brass plate.
    A.blob(c, tx(2), 26, 26, 11, ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit'], { bias: 0.1 });
    var fi = 0; for (i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === 'gloam_perch') fi = i;
    var fp = G.gfx.fishgen.portrait(fi, 40, 14, false); img(c, fp, tx(2) - (fp.width >> 1), 26 - (fp.height >> 1));
    A.slab(c, tx(2) - 7, 33, 14, 3, BRASS);
    // A fish chart beside the window, its corner torn and curling.
    A.slab(c, tx(5) + 4, 12, 24, 30, ['paper_dark', 'paper_dark', 'paper', 'bone', 'cream']);
    for (i = 0; i < 4; i++) { var fy = 17 + i * 6; A.blob(c, tx(5) + 13, fy, 6, 1.6, ['moss_dark', 'moss', 'moss_hi'], {}); box(c, 'stone', tx(5) + 21, fy, 4, 1); px(c, 'moss_dark', tx(5) + 7, fy); }
    box(c, 'brick', tx(5) + 6, 13, 16, 2);
    A.area(c, tx(5) + 22, 36, 6, 6, function (x, y) { return x - (tx(5) + 22) > 41 - y ? 'paper_dark' : ''; });
    px(c, 'stone_hi', tx(5) + 15, 12);
    // The clock (its hands are live) and a calendar on the wrong month.
    A.blob(c, tx(CLOCK) + 16, 20, 8, 8, ['outline', 'wood_dark', 'wood_mid', 'wood_hi'], { bias: 0.1 });
    A.blob(c, tx(CLOCK) + 16, 20, 6, 6, ['paper_dark', 'paper', 'bone', 'cream'], { rim: 0 });
    for (i = 0; i < 12; i++) px(c, i % 3 ? 'stone_hi' : 'outline', Math.round(tx(CLOCK) + 16 + Math.sin(i / 6 * Math.PI) * 5), Math.round(20 - Math.cos(i / 6 * Math.PI) * 5));
    A.slab(c, tx(CLOCK) + 8, 31, 16, 14, ['paper_dark', 'paper_dark', 'paper', 'bone', 'ivory']);
    A.area(c, tx(CLOCK) + 9, 32, 14, 6, function (x, y) { return y < 37 ? (x > tx(CLOCK) + 14 && y < 35 ? 'crt_hi' : 'crt') : 'pink'; });
    for (i = 0; i < 9; i++) px(c, i === 6 ? 'neon_red' : 'stone_hi', tx(CLOCK) + 10 + (i % 5) * 3, 39 + ((i / 5) | 0) * 3);
    // The pegboard behind the counter: holes, and hanging packets in faded colours.
    A.area(c, tx(8) + 2, 10, T - 4, 34, function (x, y) { return (x % 4 === 1 && y % 4 === 1) ? 'panel_deep' : ((x + y) % 7 ? 'panel_mid' : 'panel_hi'); });
    A.slab(c, tx(8) + 1, 9, T - 2, 36, ['outline', 'panel_deep', 'panel_mid', 'panel_hi']);
    A.area(c, tx(8) + 3, 11, T - 6, 32, function (x, y) { return (x % 4 === 1 && y % 4 === 1) ? 'panel_deep' : 'panel_mid'; });
    var PK = ['orange', 'mustard', 'lav', 'crt_hi', 'pink', 'olive_hi', 'brick_hi', 'paper'];
    for (i = 0; i < 8; i++) {
      var kx = tx(8) + 4 + (i % 4) * 6, ky = 13 + ((i / 4) | 0) * 15, k = PK[i];
      if (i === 5) { px(c, 'stone_hi', kx + 2, ky); continue; }                         // an empty hook
      px(c, 'stone_hi', kx + 2, ky); A.slab(c, kx, ky + 1, 5, 11, ['outline', G.gfx.sprites.shift(k, -1), k, G.gfx.sprites.shift(k, 1)]);
      box(c, 'ivory', kx + 1, ky + 3, 3, 3); px(c, i % 2 ? 'rust_hi' : 'brass_hi', kx + 2, ky + 4);
    }
  }

  // The rack, the jar shelf, the lure case, the fern, the gear shelf, the guitar on its amp.
  function shelves(c) {
    var x0 = tx(1), y0 = ty(1), i;
    // The rack: a rail on the wall the rods lean on, a slotted base (the rods are live).
    A.slab(c, x0 + 4, y0 - 26, 56, 4, WOODK); for (i = 0; i < 5; i++) box(c, 'outline', x0 + 9 + i * 10, y0 - 25, 3, 2);
    A.slab(c, x0 + 2, y0 + 6, 60, 18, ['outline', 'wood_dark', 'wood', 'wood_mid', 'wood_hi']);
    box(c, 'wood_deep', x0 + 3, y0 + 12, 58, 11);
    for (i = 0; i < 5; i++) { box(c, 'outline', x0 + 8 + i * 10, y0 + 8, 4, 3); }
    A.slab(c, x0 + 44, y0 + 14, 14, 8, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); A.blob(c, x0 + 51, y0 + 18, 3, 3, ['outline', 'water_mid', 'water_hi', 'water_foam'], {}); // a line spool
    A.slab(c, x0 + 6, y0 + 14, 12, 8, ['outline', 'olive_dark', 'olive', 'olive_hi']); box(c, 'ivory', x0 + 9, y0 + 16, 6, 2);   // a box of hooks
    // The jar shelf under the window: jars with peeled labels, the unlabelled one, a tin.
    var jx = tx(3), jy = ty(1);
    A.slab(c, jx + 2, jy + 4, 28, 20, ['outline', 'wood_dark', 'wood', 'wood_mid', 'wood_hi']); box(c, 'wood_deep', jx + 4, jy + 14, 24, 8); box(c, 'wood_dark', jx + 15, jy + 14, 1, 8);
    for (i = 0; i < 3; i++) {
      var gx = jx + 4 + i * 8, unl = i === 1, k = unl ? ['outline', 'teal_dark', 'teal', 'teal_lit'] : ['outline', 'mustard_dark', 'mustard', 'mustard_hi'];
      A.slab(c, gx, jy - 6, 7, 10, k); box(c, 'chrome', gx, jy - 7, 7, 2);
      if (!unl) { box(c, 'paper', gx + 1, jy - 2, 5, 3); box(c, 'outline', gx + 2, jy - 1, 1, 1); px(c, 'outline', gx + 4, jy - 1); }
      else px(c, 'neon_teal', gx + 3, jy - 3);
    }
    // The lure case: glass over trays of little lures on short legs.
    var lx = tx(4), ly = ty(1);
    A.slab(c, lx + 2, ly + 2, 28, 18, ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit']);
    box(c, 'outline', lx + 4, ly + 4, 24, 12); box(c, 'water_dark', lx + 5, ly + 5, 22, 10);
    var LK = ['brass_hi', 'orange_hi', 'olive_lit', 'signal_amber', 'pink_hi', 'crt_glow', 'flame', 'ivory'];
    for (i = 0; i < 12; i++) { var ux = lx + 6 + (i % 6) * 4, uy = ly + 6 + ((i / 6) | 0) * 5; box(c, LK[i % 8], ux, uy, 2, 1); px(c, 'chrome_hi', ux + 2, uy + 1); }
    A.line(c, 'fog_light', lx + 6, ly + 5, lx + 11, ly + 5); A.line(c, 'fog_mid', lx + 20, ly + 14, lx + 26, ly + 9);
    box(c, 'wood_deep', lx + 4, ly + 20, 3, 6); box(c, 'wood_deep', lx + 25, ly + 20, 3, 6);
    // The fern on a stool, and a landing net leaning by it.
    A.slab(c, tx(5) + 8, ty(1) + 14, 16, 5, WOODK); box(c, 'wood_dark', tx(5) + 10, ty(1) + 19, 2, 9); box(c, 'wood_dark', tx(5) + 20, ty(1) + 19, 2, 9);
    img(c, K.plant('fern', ['brick_dark', 'brick', 'brick_hi', 'orange_hi']), tx(5) + 2, ty(1) - 16);
    A.line(c, 'wood_mid', tx(5) + 28, ty(1) + 26, tx(5) + 30, ty(1) - 14);
    A.blob(c, tx(5) + 30, ty(1) - 20, 5, 6, ['outline', 'stone_dark', 'stone'], { rim: 0 });
    for (i = 0; i < 4; i++) A.line(c, 'stone_hi', tx(5) + 26 + i * 3, ty(1) - 25, tx(5) + 26 + i * 2, ty(1) - 15);
    // The gear shelf: a tall unit against the wall, three shelves; boxes and a coil of rope.
    var sx = tx(6), sy = ty(1);
    A.slab(c, sx + 1, sy - 30, 30, 56, ['outline', 'wood_dark', 'wood', 'wood_mid', 'wood_hi']); box(c, 'wood_deep', sx + 3, sy - 28, 26, 52);
    for (i = 0; i < 3; i++) A.slab(c, sx + 3, sy - 14 + i * 14, 26, 3, ['outline', 'wood_mid', 'wood_hi', 'wood_lit']);
    A.slab(c, sx + 4, sy - 8, 9, 6, ['outline', 'orange_dark', 'orange', 'orange_hi']); A.slab(c, sx + 14, sy - 6, 7, 4, ['outline', 'olive_dark', 'olive', 'olive_hi']);
    A.blob(c, sx + 9, sy + 20, 6, 3, ['outline', 'reed', 'reed_hi', 'paper_dark'], {}); A.blob(c, sx + 9, sy + 20, 2, 1, 'outline', {});
    A.slab(c, sx + 18, sy + 16, 9, 8, ['outline', 'brick_dark', 'brick', 'brick_hi']); box(c, 'ivory', sx + 20, sy + 18, 5, 2);
    // A guitar leaning on its amp, under the clock.
    img(c, K.amp(), tx(7) + 3, ty(1) + 4);
    img(c, K.guitar('sun'), tx(7) + 15, ty(1) - 18);
  }

  // Behind the counter: a back counter with the coffee maker, the boombox and its tapes, the
  // CRT (its screen live), a stack of cans.
  var tvRect = null;
  function behindCounter(c) {
    var bx = tx(8), by = ty(1), i;
    A.slab(c, bx + 1, by - 4, 3 * T - 3, 24, ['outline', 'wood_dark', 'wood', 'wood_mid', 'wood_hi']);
    box(c, 'wood_deep', bx + 3, by + 6, 3 * T - 7, 12); for (i = 1; i < 6; i++) box(c, 'outline', bx + 3 + i * 15, by + 6, 1, 12);
    box(c, 'panel_lit', bx + 1, by - 4, 3 * T - 3, 1);
    // The coffee maker and its pot.
    A.slab(c, bx + 4, by - 20, 12, 16, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark']); box(c, 'outline', bx + 6, by - 12, 8, 7);
    A.blob(c, bx + 10, by - 8, 4, 3, ['outline', 'rust_dark', 'rust', 'rust_hi'], {}); px(c, 'neon_red', bx + 13, by - 18);
    // The boombox and the tapes.
    img(c, K.boombox(), bx + 18, by - 16);
    for (i = 0; i < 4; i++) { A.slab(c, bx + 18 + i * 6, by - 1, 5, 3, ['outline', ['lav_dark', 'orange_dark', 'olive_dark', 'brick_dark'][i], ['lav', 'orange', 'olive', 'brick'][i], 'ivory']); }
    // The CRT and a stack of empty cans beside it.
    var tv = K.crt(false);
    img(c, tv.img, tx(10) - 2, by - 32);
    tvRect = [tx(10) - 2 + tv.sx, by - 32 + tv.sy, tv.sw, tv.sh];
    var g = X.grid(14, 16); for (i = 0; i < 3; i++) K.can(g, 1 + i * 4, 10, ['brick_hi', 'olive_hi', 'crt_hi'][i]); K.can(g, 3, 4, 'mustard_hi'); K.can(g, 7, 4, 'brick_hi'); K.can(g, 5, -1, 'olive_hi'); g.outline('outline'); g.paint(c, tx(10) + 18, by - 18);
  }

  // The bait station against the west wall: the worm cooler, the cricket cage, the tank.
  function baitStation(c) {
    var x0 = tx(1), y = ty(3);
    // The cooler, lid ajar, cups of worms in dark earth.
    A.slab(c, x0 + 3, y + 6, 26, 20, ['outline', 'paper_dark', 'paper', 'bone', 'ivory']); box(c, 'crt_hi', x0 + 3, y + 18, 26, 3);
    A.slab(c, x0 + 2, y - 2, 28, 9, ['outline', 'paper_dark', 'bone', 'ivory', 'cream']);
    for (var i = 0; i < 3; i++) { A.blob(c, x0 + 8 + i * 8, y + 2, 3, 2, ['outline', 'wood_deep', 'wood_dark'], {}); A.line(c, 'flesh', x0 + 6 + i * 8, y + 2, x0 + 10 + i * 8, y + 1); }
    box(c, 'brick', x0 + 6, y + 10, 10, 4); box(c, 'ivory', x0 + 7, y + 11, 8, 1);
    // The cricket cage: a mesh box on a crate (its crickets are live).
    y = ty(4);
    A.slab(c, x0 + 4, y + 16, 24, 12, WOODK);
    A.slab(c, x0 + 3, y - 2, 26, 19, ['outline', 'reed_dark', 'reed', 'reed_hi']);
    box(c, 'reed_dark', x0 + 5, y, 22, 15);
    // The minnow tank on its stand: water, gravel, a weed, the pump (bubbles are live).
    y = ty(5);
    A.slab(c, x0 + 3, y + 18, 26, 10, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']);
    box(c, 'outline', x0 + 3, y - 4, 26, 23); box(c, 'water_dark', x0 + 4, y - 3, 24, 21); box(c, 'water_mid', x0 + 4, y - 3, 24, 3);
    A.area(c, x0 + 4, y + 14, 24, 4, function (x, yy) { return (x + yy) % 3 ? 'stone' : 'stone_hi'; });
    A.line(c, 'leaf_hi', x0 + 7, y + 14, x0 + 6, y + 4); A.line(c, 'leaf', x0 + 8, y + 14, x0 + 10, y + 6);
    box(c, 'vinyl', x0 + 24, y - 6, 4, 4); A.line(c, 'outline', x0 + 26, y - 2, x0 + 26, y + 12);
    box(c, 'fog_light', x0 + 5, y - 2, 6, 1);
  }

  // Props drawn in order of their feet with the people: the counter, the freezer, the palm.
  function paintCounter(c) {
    // An L: the leg down Rusty's left (col 8, rows 2-3), then along row 3 to the wall. Top
    // surface first, then the front face. In the prop's own pixels: x from tx(8), y from ty(2) - 14.
    var x0 = 2, y0 = 0, legW = T - 4, longW = 3 * T - 4, topY = T - 2, frontY = 2 * T - 2;
    var TOPK = ['wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
    A.area(c, x0, y0, legW, frontY, function (x, y) { return x === x0 || y === y0 ? 'outline' : tone(TOPK, 0.62 - (x - x0) / legW * 0.2 + (((y + 1) % 6) === 0 ? -0.18 : 0)); });
    A.area(c, x0, topY, longW, frontY - topY, function (x, y) { return y === topY && x > x0 + legW - 1 ? 'outline' : tone(TOPK, 0.55 + (((y - topY) % 6) === 0 ? 0.12 : 0) - (x - x0) / longW * 0.1); });
    box(c, 'outline', x0 + longW - 1, topY, 1, frontY - topY);
    // The leg's top is a glass display: velvet trays of lures and spoons, the glass's glints.
    var gx = x0 + 3, gy = 34, gw = legW - 6, gh = 22;
    box(c, 'outline', gx - 1, gy - 1, gw + 2, gh + 2);
    A.area(c, gx, gy, gw, gh, function (x, y) { return ((y - gy) % 9 === 8) ? 'chrome_dark' : ((x + y) % 5 ? 'blood' : 'rust_dark'); });
    var DK = ['brass_hi', 'chrome_lit', 'orange_hi', 'olive_lit', 'pink_hi', 'signal_amber', 'crt_glow'];
    for (var j = 0; j < 12; j++) { var dx = gx + 2 + (j % 3) * 7, dy = gy + 2 + ((j / 3) | 0) * 9; if (dy + 4 > gy + gh) break; box(c, DK[j % DK.length], dx, dy, 3, 2); A.px(c, 'chrome', dx + 3, dy + 2); A.px(c, 'outline', dx + 1, dy + 3); }
    A.line(c, 'fog_light', gx + 1, gy + 1, gx + 6, gy + 1); A.line(c, 'fog_mid', gx + gw - 8, gy + gh - 2, gx + gw - 2, gy + gh - 7);
    // The front face: tongue-and-groove, a kick plate, a sticker.
    A.area(c, x0, frontY, longW, 16, function (x, y) { var e = y - frontY; return e === 0 ? 'panel_lit' : (e > 12 ? (e === 15 ? 'outline' : 'chrome_dark') : ((x - x0) % 6 === 0 ? 'panel_deep' : tone(K.PANEL, 0.5 - e * 0.02))); });
    box(c, 'outline', x0, frontY, 1, 16); box(c, 'outline', x0 + longW - 1, frontY, 1, 16);
    A.slab(c, x0 + 40, frontY + 3, 10, 7, ['outline', 'teal', 'teal_hi', 'teal_lit']); box(c, 'ivory', x0 + 42, frontY + 5, 6, 1);
    // What stands on it: the till (its display stuck), a bell, an ashtray, a newspaper, a jar.
    var g = X.grid(longW + 4, frontY + 4);
    g.slab(66, topY - 10, 22, 14, ['outline', 'chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']);
    g.rect('outline', 69, topY - 8, 13, 4); for (var i = 0; i < 3; i++) g.set('signal_amber', 71 + i * 3 + (i > 0 ? 1 : 0), topY - 7);
    for (i = 0; i < 8; i++) g.set(i % 3 ? 'chrome_lit' : 'ivory', 69 + (i % 4) * 3, topY - 2 + ((i / 4) | 0) * 2);
    g.ell(48, topY + 6, 3, 2, ['rust', 'leaf_gold', 'brass_hi'], {}); g.set('brass_hi', 48, topY + 3);
    g.ell(36, topY + 8, 4, 2, ['outline', 'stone_dark', 'stone', 'stone_hi'], {}); g.rect('ivory', 37, topY + 7, 3, 1); g.set('orange_hi', 40, topY + 7);
    g.slab(52, topY + 8, 12, 7, ['paper_dark', 'paper_dark', 'paper', 'bone']); g.rect('stone_hi', 54, topY + 10, 8, 1); g.rect('stone_hi', 54, topY + 12, 6, 1);
    g.slab(8, T - 10, 9, 10, ['outline', 'pink_dark', 'pink', 'pink_hi']); g.rect('chrome', 8, T - 12, 9, 2);    // a jar of sweets on the leg
    for (i = 0; i < 4; i++) g.set(['mustard_lit', 'crt_glow', 'orange_lit', 'olive_lit'][i], 10 + (i % 2) * 3, T - 8 + ((i / 2) | 0) * 3);
    g.outline('outline'); g.paint(c, 0, 0);
    img(c, K.bankerLamp(), 7, 12);
  }
  function paintFreezer(c) {
    A.slab(c, 1, 8, 30, 22, ['outline', 'paper_dark', 'paper', 'bone', 'ivory']);
    A.slab(c, 0, 0, 32, 10, ['outline', 'paper_dark', 'bone', 'ivory', 'cream']);
    box(c, 'chrome_hi', 12, 9, 8, 2); box(c, 'outline', 12, 11, 8, 1);
    box(c, 'brick', 4, 15, 14, 6); A.area(c, 5, 16, 12, 4, function (x, y) { return y === 17 && x % 2 ? 'ivory' : ''; });
    box(c, 'reed', 22, 24, 6, 4); px(c, 'neon_red', 28, 13);
  }

  // ---- Baking ------------------------------------------------------------------------------
  var base = null, front = null, props = null, bakeMs = 0;
  function bake() {
    if (!base) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      base = G.gfx.bake.cached('shop:room56', function () { return G.gfx.bake.layer(W, RH, paintBase); });
      front = G.gfx.bake.cached('shop:front56', function () {
        return G.gfx.bake.layer(W, RH, function (c) {
          for (var i = 0; i < WINS.length; i++) { var g = glassRect(i); K.windowFront(c, g[0], g[1], g[2], g[3], true); }
          // A plant on each sill, a trailing pothos over the first.
          c.drawImage(K.plant('snake', ['mustard_dark', 'mustard', 'mustard_hi', 'mustard_lit']), glassRect(0)[0] + 2, TOP - 22);
          c.drawImage(K.plant('trail'), glassRect(1)[0] + glassRect(1)[2] - 26, TOP - 22);
          A.reset();
        });
      });
      props = [
        { img: G.gfx.bake.cached('shop:counter56', function () { return G.gfx.bake.layer(3 * T, 2 * T + 18, paintCounter); }), x: tx(8), y: ty(2) - 14, foot: ty(4) },
        { img: G.gfx.bake.cached('shop:freezer56', function () { return G.gfx.bake.layer(32, 31, paintFreezer); }), x: tx(1), y: ty(6) - 2, foot: ty(7) - 1 },
        { img: G.gfx.bake.cached('shop:lamp56', function () { return K.floorLamp(); }), x: tx(3) + 9, y: ty(5) - 56, foot: ty(5) - 2 },
        { img: G.gfx.bake.cached('shop:palm56', function () { return K.plant('monstera', ['orange_dark', 'orange', 'orange_hi', 'orange_lit']); }), x: tx(10) + 2, y: ty(7) - 42, foot: ty(7) - 1 }
      ];
      if (t0) bakeMs = performance.now() - t0;
    }
    return base;
  }

  // What the shelves hold (Phase 38): every rod not yet his on the rack (Phase 43), the
  // lantern and the finder unless bought, the minnows and crickets left this visit.
  var shown = { rods: 0, lantern: false, finder: false, minnows: 0, crickets: 0 };
  function drawStock(ctx, stock, t, ox, oy) {
    var x0 = ox + tx(1), y0 = oy + ty(1), i, n = 0, rods = G.data.gear.rods;
    for (i = 1; i < rods.length; i++) {
      if (stock.rods && stock.rods.indexOf(i) >= 0) continue;
      var x = x0 + 9 + (i - 1) * 10;
      ctx.fillStyle = P.outline; ctx.fillRect(x, y0 - 30, 3, 41);
      ctx.fillStyle = P[rods[i].look[0]]; ctx.fillRect(x + 1, y0 - 30, 1, 41);
      for (var gi = 0; gi < 3; gi++) { ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, y0 - 26 + gi * 9, 1, 1); }
      ctx.fillStyle = P.wood_lit; ctx.fillRect(x, y0 + 2, 3, 8); ctx.fillStyle = P.wood_mid; ctx.fillRect(x + 2, y0 + 2, 1, 8);
      ctx.fillStyle = P.chrome; ctx.fillRect(x + 2, y0 - 2, 3, 3); ctx.fillStyle = P.chrome_lit; ctx.fillRect(x + 2, y0 - 2, 1, 1);
      n++;
    }
    shown.rods = n;
    var gx = ox + tx(6), gy = oy + ty(1);
    shown.lantern = !stock.lantern; shown.finder = !stock.finder;
    if (shown.lantern) {
      ctx.fillStyle = P.outline; ctx.fillRect(gx + 7, gy - 27, 10, 13); ctx.fillStyle = P.rust; ctx.fillRect(gx + 8, gy - 26, 8, 2); ctx.fillRect(gx + 8, gy - 17, 8, 2);
      ctx.fillStyle = P.lamp_glow; ctx.fillRect(gx + 9, gy - 24, 6, 7); ctx.fillStyle = P.flame; ctx.fillRect(gx + 11, gy - 21, 2, 3);
    }
    if (shown.finder) { ctx.fillStyle = P.outline; ctx.fillRect(gx + 17, gy - 11, 11, 9); ctx.fillStyle = P.chrome_dark; ctx.fillRect(gx + 18, gy - 10, 9, 7); ctx.fillStyle = P.teal_dark; ctx.fillRect(gx + 19, gy - 9, 7, 4); ctx.fillStyle = P.neon_teal; ctx.fillRect(gx + 20, gy - 7, 1, 1); ctx.fillRect(gx + 23, gy - 6, 1, 1); }
    // Minnows in the tank, crickets in the cage now and then hopping.
    var mx = ox + tx(1) + 5, my = oy + ty(5) - 1;
    shown.minnows = stock.minnows;
    for (i = 0; i < stock.minnows; i++) {
      var ph = t * (0.35 + i * 0.07) + i * 1.7, u = (Math.sin(ph) + 1) / 2, dir = Math.cos(ph) > 0;
      ctx.fillStyle = P.water_foam; ctx.fillRect(mx + Math.round(u * 18), my + (i * 5) % 13, 3, 1);
      ctx.fillStyle = P.chrome_lit; ctx.fillRect(mx + Math.round(u * 18) + (dir ? 2 : 0), my + (i * 5) % 13, 1, 1);
    }
    var cx = ox + tx(1) + 6, cy = oy + ty(4) + 1;
    shown.crickets = stock.crickets;
    for (i = 0; i < stock.crickets; i++) {
      var hop = (t * 0.6 + i * 0.37) % 1 < 0.06 ? 2 : 0;
      ctx.fillStyle = P.outline; ctx.fillRect(cx + 1 + (i * 7) % 18, cy + 4 + ((i * 5) % 9) - hop, 2, 1); ctx.fillStyle = P.wood; ctx.fillRect(cx + 3 + (i * 7) % 18, cy + 3 + ((i * 5) % 9) - hop, 1, 1);
    }
    ctx.fillStyle = P.reed_hi;                                                          // the cage's mesh over them
    for (i = 0; i < 6; i++) ctx.fillRect(cx - 1 + i * 4, cy - 1, 1, 15);
    for (i = 0; i < 4; i++) ctx.fillRect(cx - 1, cy - 1 + i * 4, 22, 1);
  }

  // ---- Light, life and the strange (Phase 39) -------------------------------------------
  // env: {hour, night, grey, rain, fog, flash, strange, st}: the windows show the lake at the
  // hour; at night the room darkens but for the lamps' stepped pools.
  var FIGURE_WIN = 10, mask = null;
  function clearAt(x, y) {
    for (var i = 0; i < WINS.length; i++) { var g = glassRect(i); if (x >= g[0] && x < g[0] + g[2] && y >= g[1] && y < g[1] + g[3]) return true; }
    return tvRect && x >= tvRect[0] && x < tvRect[0] + tvRect[2] && y >= tvRect[1] && y < tvRect[1] + tvRect[3];
  }
  function drawLive(ctx, env, t, rusty, ox, oy) {
    var i;
    for (i = 0; i < WINS.length; i++) {
      var g = glassRect(i), fig = env.strange === 'figure' && WINS[i][0] + WINS[i][1] - 1 === FIGURE_WIN ? Math.min(1, Math.min(env.st, 1 - env.st) * 4) : 0;
      K.glass(ctx, ox + g[0], oy + g[1], g[2], g[3], env, t, fig);
    }
    ctx.drawImage(front, ox, oy);
    // The BAIT neon in the first window: pink tubes, a flicker every 17 s.
    var g0 = glassRect(0), nx = ox + g0[0] + 8, ny = oy + g0[1] + 6, on = (t % 17) > 0.35 || ((t * 20) | 0) % 2;
    neon(ctx, 'BAIT', nx, ny, on, env.night);
    // The clock's hands at the game hour (39.3 runs them back).
    var cx = ox + tx(CLOCK) + 16, cy = oy + 20, back = env.strange === 'clock' ? env.st * 4 * Math.PI : 0;
    var ha = (((env.hour % 12) + 12) % 12) / 12 * 2 * Math.PI, ma = (env.hour % 1) * 2 * Math.PI - back;
    ctx.fillStyle = P.outline;
    for (i = 1; i <= 4; i++) ctx.fillRect(Math.round(cx + Math.sin(ma) * i), Math.round(cy - Math.cos(ma) * i), 1, 1);
    for (i = 1; i <= 3; i++) ctx.fillRect(Math.round(cx + Math.sin(ha) * i * 0.8), Math.round(cy - Math.cos(ha) * i * 0.8), 1, 1);
    ctx.fillStyle = P.neon_red; ctx.fillRect(cx, cy, 1, 1);
    // The CRT behind the counter, a fishing show on it.
    if (tvRect) K.screen(ctx, ox + tvRect[0], oy + tvRect[1], tvRect[2], tvRect[3], t, 1);
  }
  // A word in neon tubes (the font's own pixels, doubled, outlined): lit or dark.
  function neon(ctx, s, x, y, on, night) {
    var F = G.gfx.sprites;
    if (on && night > 0.2) { ctx.globalAlpha = 0.18 * night; ctx.fillStyle = P.neon_pink; ctx.fillRect(x - 3, y - 3, F.measure(s) + 6, 11); ctx.globalAlpha = 1; }
    F.drawText(ctx, s, x, y, on ? 'neon_pink_hi' : 'pink_dark');
    F.drawText(ctx, s, x + 1, y, on ? 'neon_pink' : 'pink_dark');
  }
  function drawLight(ctx, env, t, rusty, ox, oy) {
    var i;
    if (env.night > 0.02) {
      if (!mask) mask = K.nightMask(W, RH, [{ x: LAMP[0], y: LAMP[1], r: 118 }, { x: DESK[0], y: DESK[1] - 6, r: 52 }, { x: tvRect ? tvRect[0] + 8 : 0, y: tvRect ? tvRect[1] + 18 : 0, r: 34 }], clearAt);
      ctx.globalAlpha = env.night; ctx.drawImage(mask, ox, oy); ctx.globalAlpha = 1;
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.45 * env.night;                 // dust in the lamplight
      for (i = 0; i < 11; i++) {
        var a = t * (0.05 + i * 0.011) + i * 2.1, r = 10 + (i * 7) % 34;
        ctx.fillRect(Math.round(ox + LAMP[0] + 24 + Math.cos(a) * r * 1.1), Math.round(oy + LAMP[1] - 20 + Math.sin(a * 1.3) * r * 0.8), 1, 1);
      }
      ctx.globalAlpha = 1;
    } else if (env.grey > 0.02) { ctx.globalAlpha = 0.07 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + T, oy + TOP + 2, W - 2 * T, RH - TOP - 2); ctx.globalAlpha = 1; }
    K.bulbs(ctx, bulbPts(ox, oy), t, env.night);
    // The floor lamp's shade, lit at night.
    if (env.night > 0.3) K.glow(ctx, ox + LAMP[0], oy + LAMP[1] - 22, 15, 'lamp_glow', 0.06 * env.night);
    // The tank's bubbles; steam from Rusty's cup; smoke from the ashtray.
    ctx.fillStyle = P.water_foam;
    for (i = 0; i < 4; i++) { var u = (t * 0.5 + i / 4) % 1; ctx.fillRect(ox + tx(1) + 26 - (i % 2), oy + ty(5) + 11 - Math.floor(u * 15), 1, 1); }
    var cupX = ox + tx(9) + 22, cupY = oy + ty(3) - 4;
    if (!rusty || rusty.fr !== 2) {
      ctx.fillStyle = P.outline; ctx.fillRect(cupX - 1, cupY - 1, 6, 6); ctx.fillStyle = P.cream; ctx.fillRect(cupX, cupY, 4, 4); ctx.fillStyle = P.paper_dark; ctx.fillRect(cupX + 3, cupY + 1, 1, 3);
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - v); ctx.fillRect(cupX + 2 + Math.round(Math.sin(v * 6 + i)), cupY - 2 - Math.floor(v * 10), 1, 1); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = P.stone_hi;
    for (i = 0; i < 3; i++) { var s = (t * 0.25 + i / 3) % 1; ctx.globalAlpha = 0.4 * (1 - s); ctx.fillRect(ox + tx(8) + 42 + Math.round(Math.sin(s * 5 + i * 2) * 2), oy + ty(3) + 2 - Math.floor(s * 18), 1, 1); }
    ctx.globalAlpha = 1;
  }
  var bp = [];
  function bulbPts(ox, oy) { if (bp.length !== cable.length) { bp.length = 0; for (var i = 0; i < cable.length; i++) bp.push([0, 0]); } for (i = 0; i < cable.length; i++) { bp[i][0] = ox + cable[i][0]; bp[i][1] = oy + cable[i][1]; } return bp; }

  // Draws the room, the glass, Rusty behind his counter, the props, the dog and the fisher in
  // order of their feet. rusty: {face, fr} (Phase 37); stock: what the shelves hold (38); env:
  // the hour, the light and the strange (39).
  var order = [];
  function draw(ctx, st, t, hour, rusty, stock, env) {
    var ox = OX, oy = OY - TOP, i;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(bake(), ox, oy);
    if (env) drawLive(ctx, env, t, rusty, ox, oy);
    else ctx.drawImage(front, ox, oy);
    if (stock) drawStock(ctx, stock, t, ox, oy);
    // Everything that stands, in order of its feet.
    var f = R.walkers(st, T, ox, oy - 0 + TOP), fr = R.frames(st);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    if (rusty) order.push(ty(3) - 2, 100);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                              // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) ctx.drawImage(props[id].img, ox + props[id].x, oy + props[id].y);
      else if (id === 100) R.drawFigure(ctx, 'rusty', rusty.face, rusty.fr, ox + tx(RUSTY[0]) + 16, oy + ty(3) - 2);
      else if (id === 101) R.drawFigure(ctx, 'dog', st.dog.face, fr[1], f[2], f[3]);
      else R.drawFigure(ctx, 'fisher', st.face, fr[0], f[0], f[1]);
    }
    if (env) drawLight(ctx, env, t, rusty, ox, oy);
  }

  function sprite(kind, dir, fr, lk) { return R.sprite(kind, dir, fr, lk); }

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, TOP: TOP, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: WK.create, step: WK.step, facing: WK.facing, isBlocked: WK.isBlocked, draw: draw, bake: bake, sprite: sprite, prebake: R.prebake,
    bakeMs: function () { return bakeMs; }, blocked: WK.blocked, shown: function () { return shown; } };
})();
