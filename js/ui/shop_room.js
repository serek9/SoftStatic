var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view. The fisher walks it
// tile by tile (a tap turns, a hold walks), the dog follows a tile behind, and what he faces is
// what Space talks to. This file is the room; js/ui/room.js has the walk and the people,
// js/ui/room_kit.js the parts, js/ui/shop.js the scene.
// Phase 121 (the user, 2026-11-17: "everything in that style, cozy, with our mood, every object
// defined"): the room is composed at half size (192×170 art px, tiles of 16) and shown at 2×,
// so the walls, the furniture, the lamps, the cat and the people share one pixel, an overworld
// room as a Pokémon game draws its houses: every object on its own grid with a dark outline,
// flat ramps lit from the top left, warm cedar under a dusk at the windows. The layout is the
// user's reference (Phase 117): a log beam with its cut ends, string lights and two hanging
// lamps; a back wall of upright boards with a net, a trout on a plaque, two windows onto the
// lake, a fish chart, a clock, a spice rack; built into its lower half the rod rack, a cabinet
// of tins, a chalkboard, a plant on a stool, a cubby under the lava lamp, the guitar on its amp,
// a shelf with a jar, a plant and bottles, Rusty's back shelf with a radio. Down the west wall a
// cooler of worms, the cricket crate, the minnow tank, the freezer with the cat on it. A floor
// lamp, a knotted rug, the counter (a banker's lamp, the lure drawers, an ashtray, a honey pot,
// the till) with Rusty behind it, a drinks fridge, a monstera. The strange stays: the BAIT neon
// falters, the clock can run back, someone can stand on the far shore. Visual and input only.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, S = G.gfx.sprites, K = G.ui.roomKit, R = G.ui.room, X = G.gfx.pix, tone = X.tone;
  // On screen (as before): tiles of 32, the back wall TOP 84 over row 0, the room from y 10 to 350.
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, TOP = 84, RH = H + TOP, OX = (640 - W) >> 1, OY = ((360 - RH) >> 1) + TOP;
  // The art: half of that. Everything below is in art px.
  var t = 16, AW = W >> 1, AH = RH >> 1, AT = TOP >> 1, SW = 8, STEP = R.STEP;

  // The map: w the back wall and what is built into it (rows 0 and 1), s side or south wall, d the
  // door, m the mat (the way out), r the rug, . the floor.
  var MAP = [
    'wwwwwwwwwwww',
    'swwwwwwwwwws',
    's..........s',
    's...rrr....s',
    's...rrr....s',
    's...rrr....s',
    's.....m....s',
    'ssssssdsssss'
  ];
  var OBJECTS = [
    { id: 'rack', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'rack' },        // rods, reels and lines
    { id: 'jar', c: 3, r: 1, w: 1, h: 1, block: true, talk: 'jar' },          // the cabinet of tins and the unlabelled jar
    { id: 'case', c: 4, r: 1, w: 1, h: 1, block: true, talk: 'lures' },       // the chalkboard of lures (Phase 43)
    { id: 'fern', c: 5, r: 1, w: 1, h: 1, block: true, talk: '' },
    { id: 'gear', c: 6, r: 1, w: 1, h: 1, block: true, talk: 'gear' },        // the cubby under the lava lamp
    { id: 'guitar', c: 7, r: 1, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'behind', c: 8, r: 1, w: 3, h: 1, block: true, talk: '' },         // Rusty's side of the counter
    { id: 'counter', c: 8, r: 2, w: 3, h: 2, block: true, talk: 'rusty' },
    { id: 'worms', c: 1, r: 2, w: 1, h: 1, block: true, talk: 'worms' },
    { id: 'crickets', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'crickets' },
    { id: 'tank', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'tank' },
    { id: 'freezer', c: 1, r: 5, w: 1, h: 2, block: true, talk: 'cat' },
    { id: 'lamp', c: 3, r: 4, w: 1, h: 1, block: true, talk: '' },
    { id: 'cooler', c: 10, r: 4, w: 1, h: 2, block: true, talk: 'cooler' },   // the drinks fridge
    { id: 'palm', c: 10, r: 6, w: 1, h: 1, block: true, talk: '' }
  ];
  var DOOR = [6, 7], MAT = [6, 6], RUSTY = [9, 1];
  var WK = R.walker(MAP, OBJECTS, MAT);

  function ty(r) { return AT + r * t; }
  var FY = ty(2);                                             // where the floor starts (74)
  var LAMP = [51, 83];                                        // the floor lamp's shade
  var DESK = [132, 80];                                       // the banker's lamp on the counter
  var CLK = [113, 22];
  var WINS = [[43, 15, 32, 26], [139, 15, 32, 26]];          // the windows' glass: x, y, w, h
  var HANG = [62, 155];                                       // the little lamps under the beam
  var RADIO = [132, 48];
  var STACK = 9;                                              // the west stack's left edge
  var BULBS = [];
  for (var bi = 0; bi < 16; bi++) BULBS.push([20 + bi * 10, 11 + Math.round(Math.sin((bi % 4) / 4 * Math.PI) * 2)]);

  // The light on the boards: the floor lamp, the banker's lamp, the bulbs; dimmer toward the corners.
  function light(x, y) {
    var d = Math.hypot((x - LAMP[0]) / 60, (y - LAMP[1] - 20) / 45), e = Math.hypot((x - DESK[0]) / 40, (y - DESK[1]) / 30);
    var L = 0.5 + Math.max(0, 1 - d) * 0.4 + Math.max(0, 1 - e) * 0.22 + Math.max(0, 1 - y / 30) * 0.15;
    var vx = Math.abs(x - AW / 2) / (AW / 2), vy = Math.max(0, (y - 120) / 50);
    return Math.max(0, Math.min(1, L - vx * vx * 0.25 - vy * 0.2));
  }

  // ---- Painting ---------------------------------------------------------------------------
  var box = A.box;
  var WARM = ['cedar_deep', 'cedar_dark', 'cedar', 'cedar_mid', 'cedar_hi', 'cedar_lit', 'cedar_glow'];
  var WOOD = ['cedar_dark', 'cedar', 'cedar_mid', 'cedar_hi'];               // furniture, a step darker than the wall
  var LIT = ['cedar', 'cedar_mid', 'cedar_hi', 'cedar_lit'];
  function sh(k, n) { return S.shift(k, n); }
  function r3(k) { return [sh(k, -1), k, sh(k, 1)]; }
  function r4(k) { return [sh(k, -1), k, sh(k, 1), sh(k, 2)]; }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // An object: painted on its own grid, outlined, set into c at (x, y).
  function obj(c, x, y, w, h, fn) { var g = X.grid(w, h); fn(g); g.outline('outline'); g.paint(c, x, y); A.reset(); }
  function objImg(w, h, fn) { var g = X.grid(w, h); fn(g); g.outline('outline'); return g.canvas(); }

  // The shell: the beam, the back wall of upright boards, the floor, the side walls, the south wall.
  function shell(c) {
    A.area(c, SW, 0, AW - 2 * SW, FY, function (x, y) {
      if (y < 7) return y === 6 ? 'outline' : tone(WARM, 0.2 + Math.sin(y / 6 * Math.PI) * 0.5 + (((x * 3 + y * 5) % 23) < 2 ? -0.15 : 0));
      if (y === 7) return 'cedar_deep';
      var b = ((x - SW) / 6) | 0, bx = (x - SW) % 6;
      if (bx === 0) return 'cedar_deep';
      var v = 0.2 + (hash(b, 3) - 0.5) * 0.14 + light(x, y) * 0.36 + (bx === 1 ? 0.18 : 0) - (bx === 5 ? 0.08 : 0);
      if (hash(b, 7) < 0.15 && Math.abs(y - 15 - hash(b, 8) * 45) < 1 && bx > 1 && bx < 5) v -= 0.25;   // a knot
      return tone(WARM, v);
    });
    A.area(c, SW, FY, AW - 2 * SW, ty(7) - FY, function (x, y) {
      var fy = y - FY, row = (fy / 6) | 0, ly = fy % 6, off = (hash(row, 7) * 150) | 0, len = 30 + ((hash(row, 11) * 4) | 0) * 8;
      var sx = x - SW + off, seg = (sx / len) | 0, lx = sx % len;
      if (ly === 5) return 'outline';
      if (lx === 0) return 'cedar_deep';
      var v = 0.32 + (hash(row * 31 + seg, 3) - 0.5) * 0.2 + light(x, y) * 0.55 - 0.12;
      if (ly === 0) v += 0.18; if (ly === 4) v -= 0.12; if (lx === 1) v -= 0.1;
      if (ly === 2 && ((lx + seg * 7) % 13) < 6) v -= 0.08;                                     // grain
      return tone(WARM, v);
    });
    A.area(c, SW, FY, AW - 2 * SW, 3, function (x, y) { return y === FY || (x + y) % 2 === 0 ? 'cedar_dark' : ''; });   // the built-ins' shadow
    for (var s = 0; s < 2; s++) {                                                                  // the side walls
      var x0 = s ? AW - SW : 0;
      A.area(c, x0, 0, SW, AH, function (xx, yy) {
        var e = s ? xx - x0 : x0 + SW - 1 - xx;
        if (e === 0) return 'cedar_hi';
        if (e === SW - 1) return 'outline';
        if ((xx - x0) % 3 === 0) return 'cedar_deep';
        return tone(WARM, 0.14 + hash(((xx - x0) / 3) | 0, 3 + s) * 0.1 + (e < 2 ? 0.1 : 0));
      });
    }
    var y = ty(7);                                                                                // the south wall's face
    A.area(c, SW, y, AW - 2 * SW, AH - y, function (xx, yy) {
      var e = yy - y;
      if (e === 0 || yy === AH - 1) return 'outline';
      if (e < 3) return e === 1 ? 'cedar_lit' : 'cedar_mid';
      if (e === 3) return 'outline';
      if (((xx - SW) % 6) === 0) return 'cedar_deep';
      return tone(WARM, 0.24 + hash(((xx - SW) / 6) | 0, 6) * 0.1);
    });
    var dx = DOOR[0] * t;
    box(c, 'outline', dx, y, t, AH - y);
    A.area(c, dx + 1, y + 1, t - 2, AH - y - 1, function (xx, yy) { var e = yy - y; return e < 2 ? 'cedar_hi' : (e < 7 ? 'night_blue' : 'night_deep'); });
    box(c, 'fog_dark', dx + 3, y + 8, t - 6, 1);
    for (var q = 0; q < 2; q++) {                                                                  // the frame's rounded bottom corners
      var qx = q ? AW - 10 : 0, qy = AH - 10;
      A.area(c, qx, qy, 10, 10, function (xx, yy) { var dd = Math.hypot(q ? xx - (AW - 10) : 9 - xx, yy - qy); return dd > 9.5 ? 'black' : (dd > 8.5 ? 'outline' : ''); });
    }
    obj(c, 0, 0, 11, 10, function (g) { logEnd(g, 5, 4.5); }); obj(c, AW - 11, 0, 11, 10, function (g) { logEnd(g, 5, 4.5); });
  }
  function logEnd(g, x, y) {
    g.ell(x, y, 5, 4.2, ['cedar_dark', 'cedar', 'cedar_mid'], { bias: 0.15 });
    g.ell(x + 0.5, y, 3.2, 2.6, ['cedar_hi', 'cedar_lit', 'cedar_glow'], { rim: 0, bias: 0.2 });
    g.set('cedar_mid', x + 0.5, y);
  }

  // The upper wall: the net, the trout, the windows, the chart, the clock, the spice rack, the
  // little lamps under the beam.
  function wallThings(c) {
    var i;
    A.area(c, SW + 1, 8, 18, 26, function (x, y) {                                               // a landing net hung in the corner
      var u = x - SW - 1, v = y - 8; if (u > 17 - v * 0.65) return ''; if (Math.abs(u - (17 - v * 0.65)) < 0.7) return 'reed_dark';
      return ((u + v) % 4 === 0 || ((u - v + 40) % 4) === 0) ? 'reed_hi' : '';
    });
    obj(c, SW + 4, 13, 4, 4, function (g) { g.ell(1.5, 1.5, 1.6, 1.6, ['orange_dark', 'orange', 'orange_hi'], {}); });
    // The trout on an oval plaque.
    obj(c, 15, 15, 30, 16, function (g) {
      g.ell(14.5, 7.5, 14, 7, WOOD, { bias: 0.1 }); g.ell(14.5, 7.5, 11.5, 5.2, LIT, { rim: 0, bias: 0.2 });
      g.rect('brass_hi', 12, 13, 5, 1);
    });
    var fi = 0; for (i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === 'rainbow_trout') fi = i;
    var fp = G.gfx.fishgen.portrait(fi, 21, 8, false); c.drawImage(fp, 30 - (fp.width >> 1), 22 - (fp.height >> 1)); A.reset();
    // The windows: a deep casing and a sill (the glass is live).
    for (i = 0; i < WINS.length; i++) {
      var w = WINS[i];
      obj(c, w[0] - 3, w[1] - 3, w[2] + 6, w[3] + 6, function (g) { g.slab(0, 0, w[2] + 6, w[3] + 6, WOOD.concat(['cedar_lit'])); g.rect('night_deep', 3, 3, w[2], w[3]); });
      obj(c, w[0] - 5, w[1] + w[3] + 2, w[2] + 10, 4, function (g) { g.slab(0, 0, w[2] + 10, 4, LIT); });
    }
    // The fish chart, its corner curling.
    obj(c, 79, 18, 16, 20, function (g) {
      g.slab(0, 0, 16, 20, ['paper_dark', 'paper', 'bone', 'cream']); g.rect('brick', 2, 1, 12, 2);
      for (var j = 0; j < 4; j++) { g.ell(7, 5.5 + j * 3.5, 4, 1.1, ['moss_dark', 'moss', 'moss_hi'], {}); g.set('moss_dark', 2, 5 + j * 3.5); g.rect('stone', 12, 5 + j * 3.5, 2, 1); }
      g.poly([[12, 20], [16, 16], [16, 20]], 'paper_dark');
    });
    // The clock (its hands are live) over a beige thermostat.
    obj(c, CLK[0] - 7, CLK[1] - 7, 15, 15, function (g) { g.ell(7, 7, 7, 7, WOOD.concat(['cedar_lit']), { bias: 0.15 }); g.ell(7, 7, 5.4, 5.4, ['paper', 'bone', 'cream', 'ivory'], { rim: 0, bias: 0.2 }); for (var j = 0; j < 4; j++) g.set('outline', 7 + Math.round(Math.sin(j * Math.PI / 2) * 4), 7 - Math.round(Math.cos(j * Math.PI / 2) * 4)); });
    obj(c, 109, 32, 9, 7, function (g) { g.slab(0, 0, 9, 7, ['paper_dark', 'paper', 'bone', 'cream']); g.rect('crt', 1, 1, 7, 2); g.set('crt_glow', 2, 1); g.rect('stone_hi', 2, 4, 1, 1); g.rect('stone_hi', 4, 4, 1, 1); g.rect('brick_hi', 6, 4, 1, 1); });
    // The spice rack: two shelves of jars.
    obj(c, 123, 16, 16, 22, function (g) {
      g.slab(0, 0, 16, 22, WOOD); g.rect('cedar_deep', 1, 1, 14, 20);
      var JK = ['orange', 'teal', 'brick_hi', 'paper', 'lav', 'mustard', 'olive_hi'];
      for (var j = 0; j < 2; j++) { g.rect('cedar_hi', 1, 9 + j * 10, 14, 2); for (var k = 0; k < 4; k++) { var jk = JK[(k + j * 3) % 7]; g.slab(1 + k * 3.5, 4 + j * 10, 3, 5, r3(jk)); g.rect('chrome', 1 + k * 3.5, 3 + j * 10, 3, 1); } }
    });
    // The little lamps under the beam: a cord, a dark dome.
    for (i = 0; i < HANG.length; i++) { box(c, 'outline', HANG[i], 7, 1, 3); obj(c, HANG[i] - 4, 9, 9, 4, function (g) { g.ell(4, 2.5, 4, 2.2, ['vinyl', 'vinyl_hi', 'chrome_dark'], { bias: 0.2 }); g.rect('lamp_glow', 2, 3, 5, 1); }); }
    // The string lights' cable.
    for (i = 0; i < BULBS.length - 1; i++) A.line(c, 'outline', BULBS[i][0], BULBS[i][1] - 1, BULBS[i + 1][0], BULBS[i + 1][1] - 1);
  }

  // The built-ins, the wall's lower half down to the ledge at FY.
  function builtIns(c) {
    var i;
    box(c, 'cedar_dark', SW, FY - 4, AW - 2 * SW, 4);
    obj(c, SW, FY - 6, 118, 3, function (g) { g.slab(0, 0, 118, 3, LIT); });
    // The rod rack: two rails (the rods are live); a shelf of tackle boxes under it.
    obj(c, 11, 34, 33, 3, function (g) { g.slab(0, 0, 33, 3, WOOD); }); obj(c, 11, 49, 33, 3, function (g) { g.slab(0, 0, 33, 3, WOOD); });
    obj(c, 10, 61, 35, 3, function (g) { g.slab(0, 0, 35, 3, LIT); });
    obj(c, 12, 63, 14, 6, function (g) { tackle(g, 0, 0, 14, 6, 'olive'); }); obj(c, 28, 63, 14, 6, function (g) { tackle(g, 0, 0, 14, 6, 'chrome'); });
    // A cabinet: tins on its top, a tackle box behind its open front.
    obj(c, 45, 55, 18, 17, function (g) { g.slab(0, 0, 18, 17, WOOD); g.rect('cedar_deep', 2, 8, 14, 8); g.rect('cedar_lit', 0, 6, 18, 1); g.slab(2, 1, 14, 5, r4('mustard')); tackle(g, 3, 10, 12, 5, 'mustard'); });
    obj(c, 46, 49, 5, 6, function (g) { tin(g, 0, 0, 'teal'); }); obj(c, 52, 50, 5, 5, function (g) { tin(g, 0, 0, 'paper'); }); obj(c, 57, 49, 5, 6, function (g) { tin(g, 0, 0, 'teal'); });
    // The chalkboard on its easel.
    obj(c, 64, 56, 15, 18, function (g) {
      g.rect('cedar_dark', 1, 10, 1, 8); g.rect('cedar_dark', 13, 10, 1, 8);
      g.slab(0, 0, 15, 12, WOOD); g.rect('leaf_deep', 1, 1, 13, 10);
      for (var j = 0; j < 3; j++) { g.line(j === 1 ? 'mustard_lit' : 'stone_hi', 2, 3 + j * 3, 6 + j, 3 + j * 3); g.line('crt_glow', 8 + j, 3 + j * 3, 12, 3 + j * 3); }
    });
    // The plant on its stool.
    obj(c, 79, 64, 13, 10, function (g) { g.slab(0, 0, 13, 3, WOOD); g.rect('cedar_dark', 1, 3, 2, 7); g.rect('cedar_dark', 10, 3, 2, 7); });
    c.drawImage(bushImg(15, 16), 78, 50); A.reset();
    // The cubby under the lava lamp.
    obj(c, 92, 37, 19, 36, function (g) {
      g.slab(0, 0, 19, 36, WOOD); g.rect('cedar_deep', 1, 1, 17, 34);
      for (var j = 0; j < 4; j++) g.rect('cedar_hi', 1, 8 + j * 8, 17, 1);
      tackle(g, 2, 3, 8, 5, 'teal'); g.slab(11, 4, 5, 4, r3('brick'));
      g.slab(2, 12, 6, 4, r3('mustard')); g.slab(9, 12, 7, 4, r3('olive'));
      tackle(g, 2, 19, 13, 5, 'brick');
      g.ell(5, 30, 3, 1.6, ['reed', 'reed_hi', 'paper_dark'], {}); g.set('outline', 5, 30); g.slab(11, 27, 5, 5, r3('brick'));
    });
    // The guitar on its amp; the shelf over them with the jar, a plant and bottles.
    obj(c, 111, 43, 66, 3, function (g) { g.slab(0, 0, 66, 3, LIT); });
    obj(c, 109, 60, 14, 12, function (g) { g.slab(0, 0, 14, 12, ['vinyl', 'vinyl_hi', 'chrome_dark']); g.fill(1, 4, 12, 7, function (x, y) { return (x + y) % 2 ? 'paper_dark' : 'reed_hi'; }); g.set('chrome_lit', 2, 1); g.set('chrome_lit', 5, 1); g.set('chrome_lit', 8, 1); g.set('neon_red', 12, 1); });
    obj(c, 114, 48, 9, 23, function (g) {
      g.rect('cedar_dark', 4, 2, 2, 10); for (var j = 4; j < 11; j += 2) g.set('chrome_hi', 4, j); g.slab(3, 0, 4, 3, ['cedar_deep', 'cedar_dark', 'cedar']);
      g.ell(4.5, 13.5, 3, 2.6, ['sun_dark', 'sun', 'sun_hi', 'sun_lit'], { bias: 0.1 }); g.ell(4.5, 18, 4.2, 3.6, ['sun_dark', 'sun', 'sun_hi', 'sun_lit'], { bias: 0.05 });
      g.set('outline', 4, 14); g.set('outline', 5, 14); g.rect('chrome_hi', 3, 19, 3, 1);
    });
    obj(c, 125, 35, 8, 9, function (g) { g.slab(0, 1, 8, 8, ['lav_dark', 'lav', 'lav_hi', 'lav_lit']); g.rect('chrome', 1, 0, 6, 1); g.set('neon_pink_hi', 2, 4); g.set('neon_pink_hi', 5, 6); });
    c.drawImage(bushImg(16, 14), 158, 29); A.reset();
    obj(c, 159, 37, 11, 6, function (g) { g.slab(0, 0, 11, 6, r4('teal')); g.rect('ivory', 2, 2, 6, 1); });
    for (i = 0; i < 3; i++) obj(c, 170 + i * 2, 36, 2, 7, function (g) { g.rect(['brick', 'olive', 'brick_hi'][i], 0, 1, 2, 6); g.rect('chrome', 0, 0, 2, 1); });
    // Rusty's back shelf: the radio (its dial is live) and a stack of tins; a cabinet under it.
    obj(c, 125, 57, 52, 3, function (g) { g.slab(0, 0, 52, 3, LIT); });
    A.area(c, 126, 60, 50, FY - 60, function (x, y) { return (x - 126) % 5 === 0 ? 'cedar_dark' : (y < 61 ? 'cedar_dark' : 'cedar'); });
    obj(c, RADIO[0], RADIO[1], 19, 9, function (g) {
      g.slab(0, 0, 19, 9, ['chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']); g.fill(1, 2, 6, 6, function (x, y) { return (x + y) % 2 ? 'vinyl' : 'chrome_dark'; });
      g.rect('outline', 8, 2, 10, 4); g.set('vinyl', 10, 7); g.set('vinyl', 15, 7);
    });
    box(c, 'outline', RADIO[0] + 15, RADIO[1] - 4, 1, 4);
    obj(c, 155, 51, 5, 6, function (g) { tin(g, 0, 0, 'brick_hi'); }); obj(c, 160, 51, 5, 6, function (g) { tin(g, 0, 0, 'olive_hi'); }); obj(c, 157, 46, 5, 5, function (g) { tin(g, 0, 0, 'mustard_hi'); });
  }
  function tackle(g, x, y, w, h, k) {
    g.slab(x, y, w, h, r4(k)); g.rect('outline', x + 1, y + 2, w - 2, 1); g.rect('chrome_hi', x + (w >> 1) - 1, y + 3, 2, 1);
  }
  function tin(g, x, y, k) { g.slab(x, y, 5, 6, r4(k)); g.rect('chrome_hi', x, y, 5, 1); g.rect('ivory', x + 1, y + 3, 3, 1); }
  // A leafy plant in a terracotta pot (w×h).
  var bushes = {};
  function bushImg(w, h) {
    var key = w + 'x' + h; if (bushes[key]) return bushes[key];
    var L = ['leaf_dark', 'leaf', 'leaf_hi', 'leaf_lit'], POT = ['orange_dark', 'orange', 'orange_hi', 'orange_lit'];
    return (bushes[key] = objImg(w, h, function (g) {
      var cx = w / 2, py = h - 5, i;
      for (i = 0; i < 7; i++) { var a = -Math.PI + 0.25 + i * (Math.PI - 0.5) / 6, r = w * 0.32; g.ell(cx + Math.cos(a) * r, py - 4 + Math.sin(a) * r * 0.75, w * 0.17, w * 0.13, L, { bias: 0.2 - (i % 3) * 0.12 }); }
      g.ell(cx, py - 4, w * 0.2, w * 0.16, L, { bias: 0.25 });
      g.poly([[cx - 4, py], [cx + 4, py], [cx + 3, h - 1], [cx - 3, h - 1]], function (x) { return tone(POT, 0.8 - (x - cx + 4) / 8 * 0.6); });
      g.rect(POT[2], Math.round(cx - 4.5), py, 9, 1);
    }));
  }

  // Down the west wall: the cooler of worms, the cricket crate, the minnow tank, the freezer.
  function westStack(c) {
    var x = STACK;
    obj(c, x, ty(2) - 2, 22, 16, function (g) {                                                  // the cooler: a red-diamond lid
      g.slab(0, 5, 22, 11, ['paper_dark', 'paper', 'bone', 'ivory']); g.rect('teal_hi', 0, 12, 22, 1);
      g.slab(0, 0, 22, 6, ['paper_dark', 'bone', 'ivory', 'cream']);
      for (var i = 0; i < 4; i++) { var dx = 3 + i * 5; g.set('crimson', dx, 2); g.set('rug_hi', dx - 1, 3); g.set('rug_hi', dx + 1, 3); g.set('crimson', dx, 4); g.set('rug_hi', dx, 3); }
      g.rect('brick', 3, 8, 7, 3); g.rect('ivory', 4, 9, 5, 1);
    });
    obj(c, x, ty(3) - 1, 22, 14, function (g) { g.slab(0, 0, 22, 14, WOOD); g.rect('reed_dark', 2, 2, 18, 9); g.rect('cedar_lit', 0, 12, 22, 1); });   // the cricket crate
    obj(c, x, ty(4) - 2, 22, 17, function (g) {                                                  // the minnow tank
      g.rect('vinyl', 0, 0, 22, 2); g.rect('chrome_dark', 0, 14, 22, 3); g.rect('chrome_hi', 0, 14, 22, 1);
      g.fill(0, 2, 22, 12, function (xx, yy) { return yy < 3 ? 'crt_glow' : (yy > 11 ? ((xx + yy) % 2 ? 'stone_hi' : 'paper_dark') : (yy < 7 ? 'crt_hi' : 'teal_lit')); });
      for (var i = 0; i < 3; i++) { g.line('leaf_hi', 3 + i * 7, 11, 2 + i * 7, 5 + i % 2 * 2); g.line('leaf', 4 + i * 7, 11, 5 + i * 7, 6); }
      g.set('chrome_lit', 1, 3); g.set('chrome_lit', 1, 4);
    });
    obj(c, x, ty(5) + 12, 22, 19, function (g) {                                                 // the freezer
      g.slab(0, 3, 22, 16, ['paper_dark', 'paper', 'bone', 'ivory']); g.slab(0, 0, 22, 4, ['paper_dark', 'bone', 'ivory', 'cream']);
      g.rect('chrome_hi', 8, 4, 6, 1); g.slab(3, 9, 10, 4, r3('brick')); g.rect('ivory', 4, 10, 8, 1);
    });
  }

  // The rug: a knotted rag rug, 2×2 knots, in bands of orange, red, mustard and olive round a
  // honey heart, tassels on its short sides.
  function rug(c, x, y, w, h) {
    var B = ['orange_hi', 'rug_hi', 'orange', 'mustard_hi', 'olive', 'olive_hi', 'orange_hi', 'mustard', 'cedar_glow', 'cedar_lit'];
    A.area(c, x - 3, y, w + 6, h, function (xx, yy) {
      var ix = xx - x, iy = yy - y;
      if (ix < 0 || ix >= w) { var d = ix < 0 ? -ix : ix - w + 1; return iy % 3 === 2 || d > 3 ? '' : (d === 3 ? 'mustard' : 'mustard_hi'); }
      if (ix === 0 || iy === 0 || ix === w - 1 || iy === h - 1) return 'orange_dark';
      var e = Math.min(ix, w - 1 - ix, iy, h - 1 - iy), band = Math.min(B.length - 1, Math.floor(e / 2.5)), k = B[band];
      if (band === B.length - 1 && Math.abs(ix - w / 2) < 5 && Math.abs(iy - h / 2) < 2) k = 'mustard';
      return (ix & 1) && (iy & 1) ? sh(k, -1) : k;
    });
    box(c, 'cedar_deep', x, y + h, w, 1);
  }

  function paintBase(c) {
    A.reset();
    shell(c); wallThings(c); builtIns(c); westStack(c);
    rug(c, 65, ty(3) + 2, 48, 34);
    A.reset();
  }

  // Props drawn in order of their feet with the people.
  function counterImg() {
    return objImg(54, 33, function (g) {
      var w = 54, top = 23;
      g.fill(0, 0, w, top, function (x, y) { return y === top - 1 ? 'cedar_lit' : tone(WARM, 0.62 - y / top * 0.15 + ((y % 5) === 0 ? -0.1 : 0)); });
      g.fill(0, top, w, 33 - top, function (x, y) { return y === top ? 'outline' : ((x % 5) === 0 ? 'cedar_deep' : tone(WARM, 0.32 + ((x % 5) === 1 ? 0.08 : 0))); });
      g.slab(25, top + 3, 7, 4, r4('teal')); g.rect('ivory', 26, top + 4, 5, 1);
      g.ell(8, 12, 2, 1, ['rust', 'leaf_gold', 'brass_hi']); g.rect('brass_hi', 7, 6, 2, 6); g.ell(8, 4, 6.5, 3.4, ['moss_dark', 'moss', 'moss_hi', 'moss_lit'], { bias: 0.25 }); g.rect('lamp_glow', 3, 6, 11, 1);   // the banker's lamp
      g.slab(2, 10, 16, 11, ['blood', 'crimson', 'rug_hi', 'pink_hi']);                          // the lure drawers
      for (var i = 0; i < 6; i++) { var dx = 3 + (i % 3) * 5, dy = 11 + ((i / 3) | 0) * 5; g.rect('blood', dx, dy, 4, 4); g.rect('rug_hi', dx, dy, 4, 1); g.set(['brass_hi', 'mustard_lit', 'orange_lit'][i % 3], dx + 2, dy + 2); }
      g.ell(23, 13, 2.6, 1.3, ['stone_dark', 'stone', 'stone_hi'], {}); g.set('ivory', 22, 12);  // the ashtray
      g.ell(29, 11.5, 2, 2, ['orange_dark', 'orange', 'mustard_hi'], { bias: 0.2 }); g.rect('cedar', 28, 9, 2, 1); // the honey pot
      g.slab(40, 2, 12, 9, ['chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']); g.rect('outline', 41, 3, 10, 3); g.set('signal_amber', 43, 4); g.set('signal_amber', 46, 4); g.set('signal_amber', 49, 4);
      g.set('chrome_lit', 42, 8); g.set('chrome_lit', 45, 8); g.set('chrome_lit', 48, 8);
    });
  }
  function lampImg() {
    return objImg(17, 41, function (g) {
      g.rect('brass_hi', 8, 14, 1, 25); g.rect('leaf_gold', 9, 14, 1, 25);
      g.ell(8.5, 39, 4, 1.4, ['rust', 'leaf_gold', 'brass_hi'], { bias: 0.2 });
      g.poly([[4, 1], [13, 1], [16, 14], [1, 14]], function (x, y) { var d = Math.abs(x - 8.5); return x % 3 === 0 ? (y > 9 ? 'orange_lit' : 'mustard_lit') : (y > 11 ? 'orange_lit' : (d < 3 ? 'cream' : (d < 5 ? 'lamp_glow' : 'mustard_lit'))); });
      g.rect('signal_amber', 1, 14, 15, 1);
    });
  }
  function fridgeImg() {
    return objImg(21, 34, function (g) {
      g.slab(0, 0, 21, 33, ['blood', 'crimson', 'rug_hi', 'pink_hi']);
      g.slab(2, 1, 17, 4, ['ivory', 'cream', 'cream']); g.rect('crimson', 3, 2, 15, 2); g.rect('ivory', 5, 2, 3, 1); g.rect('ivory', 10, 2, 5, 1);
      g.rect('outline', 2, 6, 17, 25); g.rect('crt', 3, 7, 15, 23); g.rect('chrome_hi', 17, 13, 1, 8);
      g.rect('stone_dark', 1, 33, 3, 1); g.rect('stone_dark', 17, 33, 3, 1);
    });
  }
  function palmImg() {
    return objImg(30, 32, function (g) {
      var L = ['leaf_dark', 'leaf', 'leaf_hi', 'leaf_lit', 'olive_lit'], POT = ['orange_dark', 'orange', 'orange_hi', 'orange_lit'], cx = 15, py = 24, i;
      var LV = [[-2.75, 10, 5], [-2.2, 11, 5.5], [-1.7, 11, 5.5], [-1.25, 11, 5.5], [-0.75, 11, 5.5], [-0.35, 9, 5], [-1.5, 5, 4.5]];
      for (i = 0; i < LV.length; i++) {
        var a = LV[i][0], r = LV[i][1], z = LV[i][2], lx = cx + Math.cos(a) * r, ly = py - 6 + Math.sin(a) * r * 0.85;
        g.line('leaf_dark', cx, py - 1, lx, ly + 1);
        g.ell(lx, ly, z, z * 0.72, L, { bias: 0.2 - (i % 3) * 0.12 });
        g.line('leaf_dark', lx - Math.cos(a) * z * 0.7, ly - Math.sin(a) * z * 0.5, lx + Math.cos(a) * z * 0.7, ly + Math.sin(a) * z * 0.5);
        g.set('outline', Math.round(lx - Math.sin(a) * z * 0.7), Math.round(ly + Math.cos(a) * z * 0.5));     // a split
      }
      g.poly([[cx - 5, py], [cx + 5, py], [cx + 4, 31], [cx - 4, 31]], function (x) { return tone(POT, 0.85 - (x - cx + 5) / 10 * 0.6); });
      g.rect(POT[2], cx - 6, py, 12, 2); g.rect(POT[3], cx - 5, py, 4, 1);
    });
  }

  // ---- Baking ------------------------------------------------------------------------------
  var base = null, front = null, props = null, bakeMs = 0, view = null, vctx = null;
  function bake() {
    if (!base) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      base = G.gfx.bake.cached('shop:room121', function () { return G.gfx.bake.layer(AW, AH, paintBase); });
      front = G.gfx.bake.cached('shop:front121', function () {
        return G.gfx.bake.layer(AW, AH, function (c) {
          for (var i = 0; i < WINS.length; i++) { var w = WINS[i]; obj(c, w[0] + (w[2] >> 1) - 1, w[1], 2, w[3], function (g) { g.rect('cedar_mid', 0, 0, 2, w[3]); }); obj(c, w[0], w[1] + 17, w[2], 1, function (g) { g.rect('cedar_mid', 0, 0, w[2], 1); }); }
          obj(c, 46, WINS[0][1] + WINS[0][3] - 8, 9, 12, function (g) {                            // a snake plant on the first sill
            for (var j = 0; j < 4; j++) g.cap(2 + j * 1.6, 1 + (j % 2) * 2, 2.5 + j * 1.4, 7, 0.8, ['leaf_dark', 'leaf', 'leaf_hi', 'mustard_lit'], 0.1);
            g.poly([[1, 7], [8, 7], [7, 11], [2, 11]], function (x) { return tone(['mustard_dark', 'mustard', 'mustard_hi'], 0.8 - x / 9 * 0.6); });
          });
          A.reset();
        });
      });
      props = [
        { img: G.gfx.bake.cached('shop:counter121', counterImg), x: 124, y: FY + 3, foot: ty(4) },
        { img: G.gfx.bake.cached('shop:lamp121', lampImg), x: LAMP[0] - 8, y: 78, foot: ty(5) - 1 },
        { img: G.gfx.bake.cached('shop:fridge121', fridgeImg), x: 157, y: ty(4) - 1, foot: ty(6) - 1 },
        { img: G.gfx.bake.cached('shop:palm121', palmImg), x: 148, y: ty(7) - 31, foot: ty(7) }
      ];
      props[2].live = function (ctx, x, y, tt, env) { fridgeInside(ctx, x + 3, y + 7, tt, env ? env.night : 0); };
      view = G.gfx.bake.canvas(AW, AH); vctx = view.getContext('2d'); vctx.imageSmoothingEnabled = false;
      if (t0) bakeMs = performance.now() - t0;
    }
    return base;
  }
  function fridgeInside(ctx, x, y, tt, night) {
    var fl = ((tt * 0.5) % 23) < 0.2 && (Math.floor(tt * 30) & 1), i, s;
    ctx.fillStyle = P[fl ? 'crt_dark' : 'crt']; ctx.fillRect(x, y, 15, 23);
    ctx.fillStyle = P[fl ? 'crt' : 'crt_glow']; ctx.fillRect(x, y, 15, 1);
    var DR = ['olive_hi', 'brick_hi', 'mustard_hi', 'teal_hi', 'orange_hi'];
    for (s = 0; s < 3; s++) {
      var sy = y + 7 + s * 7; ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, sy, 15, 1);
      for (i = 0; i < 5; i++) { ctx.fillStyle = P[DR[(i + s * 2) % 5]]; ctx.fillRect(x + 1 + i * 3, sy - 4, 2, 4); ctx.fillStyle = P.ivory; ctx.fillRect(x + 1 + i * 3, sy - 3, 2, 1); }
    }
    if (!fl) K.glow(ctx, x + 7, y + 12, 11, 'crt_glow', 0.03 + 0.04 * night);
  }

  // What the shelves hold (Phase 38): every rod not yet his on the rack (Phase 43), the minnows
  // and crickets left this visit (Phase 79b). The cat on the freezer.
  var shown = { rods: 0, minnows: 0, crickets: 0 };
  function drawStock(ctx, stock, tt) {
    var i, n = 0, rods = G.data.gear.rods;
    for (i = 1; i < rods.length; i++) {
      if ((stock.rods && stock.rods.indexOf(i) >= 0) || rods[i].ice) continue; // Phase 80: the ice rods are kept behind the counter
      var x = 14 + (n % 5) * 6, y0 = 31;
      ctx.fillStyle = P.outline; ctx.fillRect(x - 1, y0, 3, 31);
      ctx.fillStyle = P[rods[i].look[0]]; ctx.fillRect(x, y0, 1, 20);
      ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, y0 + 4, 1, 1); ctx.fillRect(x, y0 + 10, 1, 1);
      ctx.fillStyle = P.cedar_glow; ctx.fillRect(x, y0 + 20, 1, 8);                              // the cork grip
      ctx.fillStyle = P.chrome; ctx.fillRect(x + 1, y0 + 17, 2, 2);                              // the reel
      n++;
    }
    shown.rods = n;
    var mx = STACK + 2, my = ty(4) + 2;                                                          // minnows in the tank
    shown.minnows = stock.minnows;
    for (i = 0; i < stock.minnows; i++) {
      var ph = tt * (0.35 + i * 0.07) + i * 1.7, u = (Math.sin(ph) + 1) / 2;
      ctx.fillStyle = P.chrome_lit; ctx.fillRect(mx + Math.round(u * 16), my + (i * 3) % 8, 2, 1);
    }
    var cx = STACK + 3, cy = ty(3) + 2;                                                          // crickets in the crate, now and then hopping
    shown.crickets = stock.crickets;
    for (i = 0; i < stock.crickets; i++) { var hop = (tt * 0.6 + i * 0.37) % 1 < 0.06 ? 1 : 0; ctx.fillStyle = P.outline; ctx.fillRect(cx + (i * 5) % 15, cy + 2 + ((i * 3) % 5) - hop, 2, 1); }
    ctx.fillStyle = P.reed_hi;                                                                   // the crate's mesh over them
    for (i = 0; i < 6; i++) ctx.fillRect(cx - 1 + i * 3, cy - 1, 1, 9);
    for (i = 0; i < 3; i++) ctx.fillRect(cx - 1, cy - 1 + i * 4, 16, 1);
    K.cat(ctx, STACK + 1, ty(5) + 12, tt);
  }

  // ---- Light, life and the strange (Phase 39) -------------------------------------------
  var mask = null;
  function clearAt(x, y) {
    for (var i = 0; i < WINS.length; i++) { var g = WINS[i]; if (x >= g[0] && x < g[0] + g[2] && y >= g[1] && y < g[1] + g[3]) return true; }
    return false;
  }
  function softMask(w, h, pools) {
    return G.gfx.bake.layer(w, h, function (c) {
      c.fillStyle = P.cedar_deep;                                                                // a warm dark, never a cold one
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        if (clearAt(x, y)) continue;
        var best = 9;
        for (var i = 0; i < pools.length; i++) { var p = pools[i], dx = (x - p.x) / (p.sx || 1.2), dy = y - p.y; best = Math.min(best, Math.sqrt(dx * dx + dy * dy) / p.r); }
        var a = Math.round(Math.max(0, Math.min(1, (best - 0.3) / 0.9)) * 6) / 6 * 0.55;
        if (!a) continue;
        c.globalAlpha = a; c.fillRect(x, y, 1, 1);
      }
      c.globalAlpha = 1;
    });
  }
  function drawLive(ctx, env, tt) {
    var i;
    for (i = 0; i < WINS.length; i++) {
      var g = WINS[i], fig = env.strange === 'figure' && i === 1 ? Math.min(1, Math.min(env.st, 1 - env.st) * 4) : 0;
      K.glass(ctx, g[0], g[1], g[2], g[3], env, tt, fig);
    }
    ctx.drawImage(front, 0, 0);
    // The BAIT neon in the first window: pink tubes, a flicker every 17 s.
    var on = (tt % 17) > 0.35 || ((tt * 20) | 0) % 2, F = G.gfx.sprites, nx = WINS[0][0] + 2, ny = WINS[0][1] + 2;
    if (on) { ctx.globalAlpha = 0.12 + 0.12 * env.night; ctx.fillStyle = P.neon_pink; ctx.fillRect(nx - 2, ny - 2, F.measure('BAIT') + 4, 10); ctx.globalAlpha = 1; }
    F.drawText(ctx, 'BAIT', nx, ny, on ? 'neon_pink_hi' : 'pink_dark');
    // The clock's hands at the game hour (39.3 runs them back).
    var cx = CLK[0], cy = CLK[1], back = env.strange === 'clock' ? env.st * 4 * Math.PI : 0;
    var ha = (((env.hour % 12) + 12) % 12) / 12 * 2 * Math.PI, ma = (env.hour % 1) * 2 * Math.PI - back;
    ctx.fillStyle = P.outline;
    for (i = 1; i <= 4; i++) ctx.fillRect(Math.round(cx + Math.sin(ma) * i), Math.round(cy - Math.cos(ma) * i), 1, 1);
    for (i = 1; i <= 2; i++) ctx.fillRect(Math.round(cx + Math.sin(ha) * i), Math.round(cy - Math.cos(ha) * i), 1, 1);
    ctx.fillStyle = P.neon_red; ctx.fillRect(cx, cy, 1, 1);
    // The radio's dial: an amber band, its needle drifting.
    var rx = RADIO[0] + 9, ry = RADIO[1] + 3;
    ctx.fillStyle = P.signal_amber; ctx.fillRect(rx, ry, 8, 2); ctx.fillStyle = P.blood; ctx.fillRect(rx + 1 + Math.round((Math.sin(tt * 0.05) + 1) * 3), ry, 1, 2);
  }
  function lavaLamp(ctx, x, y, tt) {                                                             // a small lava lamp, (x, y) its foot's middle
    ctx.fillStyle = P.outline; ctx.fillRect(x - 3, y - 13, 7, 14);
    ctx.fillStyle = P.chrome; ctx.fillRect(x - 1, y - 12, 3, 1); ctx.fillRect(x - 2, y - 2, 5, 2);
    ctx.fillStyle = P.lav_dark; ctx.fillRect(x - 2, y - 11, 5, 9);
    ctx.fillStyle = P.orange_hi; ctx.fillRect(x - 1, y - 4, 3, 2);
    var u = 0.5 - 0.5 * Math.cos((tt / 19 % 1) * 2 * Math.PI), by = Math.round(y - 4 - u * 6);
    ctx.fillRect(x - 1, by - 1, 3, 2); ctx.fillStyle = P.orange_lit; ctx.fillRect(x, by - 1, 1, 1);
    ctx.fillStyle = P.lav_hi; ctx.fillRect(x - 2, y - 10, 1, 3);
  }
  function drawLight(ctx, env, tt, rusty) {
    var i, n = env.night;
    if (!mask) mask = softMask(AW, AH, [{ x: LAMP[0], y: LAMP[1] + 15, r: 70, sx: 1.4 }, { x: DESK[0], y: DESK[1], r: 40 }, { x: AW >> 1, y: 20, r: 35, sx: 3.6 },
      { x: 167, y: ty(5), r: 25 }, { x: 20, y: ty(4) + 8, r: 20 }, { x: AW >> 1, y: ty(5), r: 45, sx: 1.6 }]);
    ctx.globalAlpha = 0.3 + 0.25 * n; ctx.drawImage(mask, 0, 0);
    ctx.globalAlpha = 0.04 + 0.06 * n; ctx.fillStyle = P.flame; ctx.fillRect(SW, 0, AW - 2 * SW, ty(7));
    ctx.globalAlpha = 1;
    if (env.grey > 0.02) { ctx.globalAlpha = 0.06 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(SW, 8, AW - 2 * SW, ty(7) - 8); ctx.globalAlpha = 1; }
    // The string lights: warm globes with a halo even by day.
    var WB = ['lamp_glow', 'mustard_lit', 'signal_amber', 'orange_lit'];
    for (i = 0; i < BULBS.length; i++) {
      var b = BULBS[i], k = WB[i % 4], o = 0.75 + 0.25 * Math.sin(tt * 0.6 + i * 1.7);
      ctx.fillStyle = P[k]; ctx.globalAlpha = (0.14 + 0.18 * n) * o; ctx.fillRect(b[0] - 2, b[1] - 1, 5, 5); ctx.fillRect(b[0] - 1, b[1] - 2, 3, 7);
      ctx.globalAlpha = 1; ctx.fillRect(b[0], b[1], 1, 2); ctx.fillStyle = P.cream; ctx.fillRect(b[0], b[1], 1, 1);
    }
    for (i = 0; i < HANG.length; i++) K.glow(ctx, HANG[i], 16, 8, 'lamp_glow', 0.05 + 0.06 * n);
    lavaLamp(ctx, 101, 37, tt);
    K.glow(ctx, 101, 31, 7, 'orange_lit', 0.05 + 0.05 * n);
    K.glow(ctx, LAMP[0], LAMP[1] - 1, 15, 'lamp_glow', 0.08 + 0.08 * n);
    K.glow(ctx, LAMP[0], LAMP[1] + 32, 24, 'signal_amber', 0.04 + 0.05 * n);
    K.glow(ctx, DESK[0], DESK[1] + 4, 11, 'lamp_glow', 0.06 + 0.06 * n);
    K.glow(ctx, STACK + 11, ty(4) + 6, 12, 'crt_glow', 0.03 + 0.04 * n);
    if (n > 0.4) {                                                                                // moths at the lamps
      ctx.fillStyle = P.paper;
      for (i = 0; i < 3; i++) { var a = tt * (2.1 + i * 0.7) + i * 2, L = i < 2 ? LAMP : DESK, r = i < 2 ? 5 + i * 2 : 3; ctx.fillRect(Math.round(L[0] + Math.cos(a) * r), Math.round(L[1] - 5 + Math.sin(a * 1.7) * r * 0.6), 1, 1); }
    }
    ctx.fillStyle = P.water_foam;                                                                 // the tank's bubbles
    for (i = 0; i < 3; i++) { var u = (tt * 0.5 + i / 3) % 1; ctx.fillRect(STACK + 19, ty(4) + 10 - Math.floor(u * 9), 1, 1); }
    var cupX = 155, cupY = FY + 12;                                                               // Rusty's mug and its steam
    if (!rusty || rusty.fr !== 2) {
      ctx.fillStyle = P.outline; ctx.fillRect(cupX - 1, cupY - 1, 6, 6); ctx.fillStyle = P.cream; ctx.fillRect(cupX, cupY, 4, 4); ctx.fillStyle = P.cedar_dark; ctx.fillRect(cupX, cupY, 3, 1);
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 2; i++) { var v = (tt * 0.6 + i / 2) % 1; ctx.globalAlpha = 0.5 * (1 - v); ctx.fillRect(cupX + 1 + Math.round(Math.sin(v * 6 + i)), cupY - 2 - Math.floor(v * 6), 1, 1); }
      ctx.globalAlpha = 1;
    }
  }

  // Draws the room at half size into its own canvas, then that at 2× into the view: the glass,
  // Rusty behind his counter, the props, the dog and the fisher in order of their feet.
  // rusty: {face, fr} (Phase 37); stock: what the shelves hold (38); env: the hour, the light
  // and the strange (39).
  var order = [];
  function draw(ctx, st, tt, hour, rusty, stock, env) {
    bake();
    var c = vctx, i;
    c.clearRect(0, 0, AW, AH);
    c.drawImage(base, 0, 0);
    if (env) drawLive(c, env, tt); else c.drawImage(front, 0, 0);
    if (stock) drawStock(c, stock, tt);
    if (env) { K.reflect(c, LAMP[0], ty(5) - 1, 6, 13, 'lamp_glow', 0.12 + 0.15 * env.night, 0); for (i = 0; i < WINS.length; i++) K.glassLamps(c, WINS[i][0], WINS[i][1], WINS[i][2], WINS[i][3], env.night); }
    var f = R.walkers(st, t, 0, AT), fr = R.frames(st);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    if (rusty) order.push(FY, 100);
    order.push(f[3] + 1, 101, f[1] + 1.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                                          // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) { c.drawImage(props[id].img, props[id].x, props[id].y); if (props[id].live) props[id].live(c, props[id].x, props[id].y, tt, env); }
      else if (id === 100) c.drawImage(R.small('rusty', rusty.face, rusty.fr), 144, FY - 15);       // his head and shoulders over the counter
      else if (id === 101) R.drawSmall(c, 'dog', st.dog.face, fr[1], f[2], f[3] + 1);
      else R.drawSmall(c, 'fisher', st.face, fr[0], f[0], f[1] + 1);
    }
    if (env) drawLight(c, env, tt, rusty);
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    var sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(view, OX, OY - TOP, W, RH);
    ctx.imageSmoothingEnabled = sm;
  }

  function sprite(kind, dir, fr, lk) { return R.sprite(kind, dir, fr, lk); }

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, TOP: TOP, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: WK.create, step: WK.step, facing: WK.facing, isBlocked: WK.isBlocked, draw: draw, bake: bake, sprite: sprite, prebake: R.prebake,
    bakeMs: function () { return bakeMs; }, blocked: WK.blocked, shown: function () { return shown; },
    // Phase 64 (dbg.roomLife): the live things in the room.
    life: function () { var n = 0; for (var i = 0; i < (props || []).length; i++) if (props[i].live) n++; return { room: 'shop', live: n, things: ['lava lamp on the cubby', 'cat on the freezer', 'drinks fridge', 'radio dial', 'moths', 'reflections'] }; } };
})();
