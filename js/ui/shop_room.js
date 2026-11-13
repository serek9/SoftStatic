var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view. The fisher walks it
// tile by tile (a tap turns, a hold walks), the dog follows a tile behind, and what he faces is
// what Space talks to. This file is the room; js/ui/room.js has the walk and the people,
// js/ui/room_kit.js the parts, js/ui/shop.js the scene.
// Phase 117 (the user's reference picture, 2026-11-13): a cosy cedar bait shop at dusk, laid out
// as the picture is. A log beam with its cut ends at the corners, string lights and two little
// hanging lamps under it; a back wall of upright cedar boards with a landing net in the corner,
// a trout on an oval plaque, two windows onto the lake, a fish chart, a clock over a thermostat,
// a spice rack. Built into the wall's lower half, down to one ledge: the rod rack over its
// tackle boxes, a cabinet of tins, a chalkboard on an easel, a plant on a stool, a cubby with
// the lava lamp on it, a guitar on its amp, a shelf with a jar, a radio and a plant. Down the
// west wall a stack: a cooler of worms, the cricket crate, the minnow tank, the freezer with the
// cat asleep on it. A floor lamp, a fringed rug, the counter with Rusty behind it (a banker's
// lamp, the lure drawers, an ashtray, a honey pot, his mug, the till), a drinks fridge, a big
// monstera. Visual and input only: no randomness, nothing saved.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, S = G.gfx.sprites, K = G.ui.roomKit, R = G.ui.room, X = G.gfx.pix, tone = X.tone;
  // The back wall stands two tiles tall over TOP (84): the room fills the view from y 10 to 350.
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, TOP = 84, RH = H + TOP, OX = (640 - W) >> 1, OY = ((360 - RH) >> 1) + TOP;
  var STEP = R.STEP, SW = 16;                                 // SW: the side walls' painted thickness

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
  // Objects: their tiles (c, r, w, h), whether they block, and what Space does facing them.
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

  // Room pixels: tile (c, r) has its top left at (c*T, TOP + r*T); the room is drawn at
  // (OX, OY - TOP), so the back wall rises above row 0 into the dark.
  function tx(c) { return c * T; }
  function ty(r) { return TOP + r * T; }
  var FY = ty(2);                                             // where the floor starts
  var LAMP = [102, 166];                                      // the floor lamp's shade
  var DESK = [263, 160];                                      // the banker's lamp on the counter
  var CLK = [227, 44];
  var WINS = [[87, 30, 63, 54], [279, 30, 64, 54]];          // the windows' glass: x, y, w, h
  var HANG = [125, 310];                                      // the two little lamps under the beam
  var RADIO = [264, 97];                                      // the radio's top left
  function glassRect(i) { return WINS[i]; }

  // The light on the boards: the floor lamp, the banker's lamp, the bulbs, the windows; dimmer
  // toward the corners.
  function light(x, y) {
    var d = Math.hypot((x - LAMP[0]) / 120, (y - LAMP[1] - 40) / 90), e = Math.hypot((x - DESK[0]) / 80, (y - DESK[1]) / 60);
    var L = 0.5 + Math.max(0, 1 - d) * 0.4 + Math.max(0, 1 - e) * 0.25 + Math.max(0, 1 - y / 60) * 0.15;
    for (var i = 0; i < WINS.length; i++) { var g = WINS[i], w = Math.hypot((x - g[0] - g[2] / 2) / 60, (y - 60) / 50); L += Math.max(0, 1 - w) * 0.1; }
    var vx = Math.abs(x - W / 2) / (W / 2), vy = Math.max(0, (y - 240) / 100);
    return Math.max(0, Math.min(1, L - vx * vx * 0.25 - vy * 0.2));
  }

  // ---- Painting ---------------------------------------------------------------------------
  var box = A.box, px = A.px;
  var WARM = ['cedar_deep', 'cedar_dark', 'cedar', 'cedar_mid', 'cedar_hi', 'cedar_lit', 'cedar_glow'];
  var WOODK = ['outline', 'cedar_dark', 'cedar', 'cedar_mid', 'cedar_hi'];   // furniture: a step darker than the wall
  var LITK = ['outline', 'cedar', 'cedar_mid', 'cedar_hi', 'cedar_lit'];     // a lit shelf's edge
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'];
  function sh(k, n) { return S.shift(k, n); }
  function ramp(k) { return ['outline', sh(k, -1), k, sh(k, 1)]; }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function img(c, im, x, y) { c.drawImage(im, Math.round(x), Math.round(y)); A.reset(); }
  function prop(w, h, fn) { var g = X.grid(w, h); fn(g); g.outline('outline'); return g.canvas(); }

  // The shell: the beam, the back wall of upright boards, the floor, the side walls, the south wall.
  function shell(c) {
    A.area(c, SW, 0, W - 2 * SW, FY, function (x, y) {
      if (y < 16) return y === 15 ? 'outline' : tone(WARM, 0.18 + Math.sin(y / 15 * Math.PI) * 0.5 + (((x * 3 + y * 11) % 31) < 3 ? -0.15 : 0));
      if (y < 18) return y === 16 ? 'cedar_deep' : 'cedar_dark';                               // the beam's shadow
      var b = ((x - SW) / 11) | 0, bx = (x - SW) % 11;
      if (bx === 0) return 'cedar_deep';
      var v = 0.2 + (hash(b, 3) - 0.5) * 0.14 + light(x, y) * 0.38 + (bx === 1 ? 0.2 : (bx === 2 ? 0.08 : 0)) - (bx >= 9 ? 0.1 : 0);
      if (((y * 3 + b * 17) % 41) < 2 && bx > 1) v -= 0.12;                                     // grain
      if (hash(b, 7) < 0.15 && Math.abs(y - 30 - hash(b, 8) * 90) < 2 && bx > 3 && bx < 8) v -= 0.25; // a knot
      return tone(WARM, v);
    });
    // The floor: boards running across, 12 px each, staggered; nail heads at the joints.
    A.area(c, SW, FY, W - 2 * SW, RH - T - FY, function (x, y) {
      var fy = y - FY, row = (fy / 12) | 0, ly = fy % 12, off = (hash(row, 7) * 300) | 0, len = 60 + ((hash(row, 11) * 4) | 0) * 16;
      var sx = x - SW + off, seg = (sx / len) | 0, lx = sx % len;
      if (ly === 11) return 'outline';
      if (lx === 0) return 'cedar_deep';
      if ((lx === 3 || lx === len - 3) && (ly === 2 || ly === 8)) return 'cedar_dark';
      var v = 0.34 + (hash(row * 31 + seg, 3) - 0.5) * 0.2 + light(x, y) * 0.55 - 0.12;
      if (ly === 0) v += 0.2; else if (ly === 1) v += 0.08; if (ly >= 9) v -= 0.14; if (lx < 3) v -= 0.12;
      if (ly === 4 + ((hash(row, seg) * 4) | 0) && ((lx + seg * 7) % 23) < 13) v -= 0.1;      // grain
      return tone(WARM, v);
    });
    // The shadow the built-ins and the side walls throw on the floor.
    A.area(c, SW, FY, W - 2 * SW, 6, function (x, y) { return (x + y) % 2 === 0 || y < FY + 2 ? 'cedar_dark' : ''; });
    // The side walls: dark upright boards, a lit post at the room's edge.
    for (var s = 0; s < 2; s++) {
      var x0 = s ? W - SW : 0;
      A.area(c, x0, 0, SW, RH, function (xx, yy) {
        var e = s ? xx - x0 : x0 + SW - 1 - xx;                                                  // distance from the room's edge
        if (e === 0) return 'cedar_hi';
        if (e === 1) return 'cedar_mid';
        if (e === SW - 1) return 'outline';
        var b = ((xx - x0) / 5) | 0;
        if ((xx - x0) % 5 === 0) return 'cedar_deep';
        return tone(WARM, 0.12 + hash(b + s * 9, 3) * 0.12 + (e < 4 ? 0.1 : 0));
      });
    }
    // The south wall's face: a lit ledge, then upright boards; the doorway.
    var y = RH - T;
    A.area(c, SW, y, W - 2 * SW, T, function (xx, yy) {
      var e = yy - y;
      if (e === 0 || yy === RH - 1) return 'outline';
      if (e < 5) return tone(WARM, 0.78 - e * 0.13);
      if (e === 5) return 'outline';
      if (((xx - SW) % 12) === 0) return 'cedar_deep';
      return tone(WARM, 0.26 - (e - 6) * 0.006 + hash(((xx - SW) / 12) | 0, 6) * 0.1 + ((xx - SW) % 12 === 1 ? 0.06 : 0));
    });
    var dx = DOOR[0] * T;
    box(c, 'outline', dx + 1, y, T - 2, T);
    A.area(c, dx + 3, y + 1, T - 6, T - 1, function (xx, yy) { var e = yy - y; return e < 3 ? 'cedar_hi' : (e < 12 ? 'night_blue' : 'night_deep'); });
    box(c, 'fog_dark', dx + 5, y + 14, T - 10, 1);
    // The beam's cut ends at the corners, over the side walls.
    logEnd(c, 9, 8); logEnd(c, W - 10, 8);
  }
  function logEnd(c, x, y) {
    A.blob(c, x, y, 11, 9, ['outline', 'cedar_dark', 'cedar', 'cedar_mid'], { bias: 0.15 });
    A.blob(c, x + 1, y, 7, 6, ['cedar_mid', 'cedar_hi', 'cedar_lit', 'cedar_glow'], { rim: 0, bias: 0.25 });
    A.blob(c, x + 1, y, 3, 3, ['cedar_hi', 'cedar_mid'], { rim: 0 });
  }

  // The upper wall: the net, the trout, the windows, the chart, the clock, the spice rack, the
  // little lamps under the beam, the string lights' cable.
  function wallThings(c) {
    var i, j;
    // A landing net hung in the corner, its mesh in diamonds, two cork floats.
    A.area(c, SW + 1, 18, 34, 50, function (x, y) {
      var u = x - SW - 1, v = y - 18; if (u > 33 - v * 0.6) return ''; if (Math.abs(u - (33 - v * 0.6)) < 1) return 'reed_dark';
      return ((u + v) % 6 === 0 || ((u - v + 60) % 6) === 0) ? 'reed_hi' : '';
    });
    A.line(c, 'cedar_dark', SW + 1, 18, SW + 34, 18);
    A.blob(c, SW + 12, 30, 2, 2, ['outline', 'orange', 'orange_hi'], {}); A.blob(c, SW + 6, 46, 2, 2, ['outline', 'orange', 'orange_hi'], {});
    // The trout on an oval plaque.
    A.blob(c, 58, 46, 27, 13, ['outline', 'cedar_deep', 'cedar_dark', 'cedar', 'cedar_mid'], { bias: 0.1 });
    A.blob(c, 58, 46, 23, 10, ['cedar_dark', 'cedar', 'cedar_mid', 'cedar_hi'], { rim: 0, bias: 0.2 });
    var fi = 0; for (i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === 'rainbow_trout') fi = i;
    var fp = G.gfx.fishgen.portrait(fi, 42, 14, false); img(c, fp, 58 - (fp.width >> 1), 45 - (fp.height >> 1));
    // The windows: a deep casing, the sill below each (the glass is live).
    for (i = 0; i < WINS.length; i++) {
      var g = WINS[i];
      A.slab(c, g[0] - 6, g[1] - 6, g[2] + 12, g[3] + 12, WOODK);
      box(c, 'outline', g[0] - 1, g[1] - 1, g[2] + 2, g[3] + 2); box(c, 'night_deep', g[0], g[1], g[2], g[3]);
      A.slab(c, g[0] - 9, g[1] + g[3] + 4, g[2] + 18, 6, LITK); box(c, 'cedar_dark', g[0] - 8, g[1] + g[3] + 10, g[2] + 16, 2);
    }
    // The fish chart, its corner curling.
    var cx0 = 158;
    A.slab(c, cx0, 36, 30, 38, ['paper_dark', 'paper_dark', 'paper', 'bone', 'cream']);
    box(c, 'outline', cx0 - 1, 35, 32, 1);
    for (i = 0; i < 4; i++) { var fy = 44 + i * 8; A.blob(c, cx0 + 14, fy, 8, 2, ['moss_dark', 'moss', 'moss_hi'], {}); A.line(c, 'moss_dark', cx0 + 4, fy - 2, cx0 + 6, fy); A.line(c, 'moss_dark', cx0 + 4, fy + 2, cx0 + 6, fy); box(c, 'stone', cx0 + 24, fy, 3, 1); }
    box(c, 'brick', cx0 + 3, 37, 24, 2);
    A.area(c, cx0 + 22, 66, 8, 8, function (x, y) { return x - (cx0 + 22) > 73 - y ? 'paper_dark' : ''; });
    // The clock (its hands are live) over a beige thermostat.
    A.blob(c, CLK[0], CLK[1], 14, 14, ['outline', 'cedar_dark', 'cedar_mid', 'cedar_hi', 'cedar_lit'], { bias: 0.15 });
    A.blob(c, CLK[0], CLK[1], 11, 11, ['paper_dark', 'paper', 'bone', 'cream', 'ivory'], { rim: 0, bias: 0.2 });
    for (i = 0; i < 12; i++) px(c, i % 3 ? 'stone_hi' : 'outline', Math.round(CLK[0] + Math.sin(i / 6 * Math.PI) * 9), Math.round(CLK[1] - Math.cos(i / 6 * Math.PI) * 9));
    A.slab(c, 219, 62, 17, 14, ['outline', 'paper_dark', 'paper', 'bone', 'cream']); box(c, 'crt', 221, 64, 13, 4); box(c, 'crt_glow', 222, 65, 5, 1);
    for (i = 0; i < 6; i++) box(c, i === 5 ? 'brick_hi' : 'stone_hi', 222 + (i % 3) * 4, 70 + ((i / 3) | 0) * 3, 2, 1);
    // The spice rack: two shelves of jars.
    A.slab(c, 247, 32, 30, 44, WOODK); box(c, 'cedar_deep', 249, 34, 26, 40);
    var JK = ['orange', 'teal', 'brick_hi', 'paper', 'lav', 'mustard', 'brick', 'olive_hi'];
    for (j = 0; j < 2; j++) {
      A.slab(c, 248, 53 + j * 20, 28, 3, LITK);
      for (i = 0; i < (j ? 4 : 3); i++) { var jx = 250 + i * (j ? 6 : 8), jk = JK[(i + j * 3) % 8]; A.slab(c, jx, 42 + j * 20, 5, 11, ramp(jk)); box(c, 'chrome', jx, 41 + j * 20, 5, 2); box(c, 'paper', jx + 1, 46 + j * 20, 3, 3); }
    }
    // The little lamps under the beam: a cord, a dark dome.
    for (i = 0; i < HANG.length; i++) {
      var hx = HANG[i]; box(c, 'outline', hx, 16, 1, 5);
      A.blob(c, hx, 24, 7, 4, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark'], { bias: 0.2 }); box(c, 'outline', hx - 7, 26, 15, 1); box(c, 'lamp_glow', hx - 4, 27, 9, 1);
    }
    cable = K.lightCable(c, 40, W - 40, 21, 38, 5);
  }
  var cable = [];

  // The built-ins, the wall's lower half down to the ledge at FY: the rack, the cabinet, the
  // chalkboard, the plant, the cubby, the guitar, the shelf and the radio, Rusty's back shelf.
  function builtIns(c) {
    var i;
    // A plain back panel behind them all, a step darker, and the ledge they stand on.
    box(c, 'cedar_dark', SW, FY - 8, W - 2 * SW, 8);
    A.slab(c, SW, FY - 10, 236, 4, LITK);
    // The rod rack: two rails, the rods are live; a shelf of tackle boxes under it.
    A.slab(c, 22, 70, 64, 5, WOODK); A.slab(c, 22, 100, 64, 5, WOODK);
    for (i = 0; i < 5; i++) { box(c, 'outline', 28 + i * 12, 70, 3, 2); box(c, 'outline', 28 + i * 12, 100, 3, 2); }
    A.slab(c, 20, 124, 68, 5, LITK); box(c, 'cedar_deep', 21, 129, 66, 9);
    tackle(c, 25, 129, 24, 12, 'olive'); tackle(c, 56, 129, 26, 12, 'chrome');
    // A cabinet: tins on its top, a tackle box behind its open front.
    A.slab(c, 89, 109, 36, 34, WOODK); box(c, 'cedar_deep', 92, 125, 30, 16); A.slab(c, 89, 121, 36, 4, LITK);
    tin(c, 92, 99, 'teal'); tin(c, 102, 100, 'paper'); tin(c, 112, 99, 'teal'); A.slab(c, 92, 110, 30, 9, ramp('mustard'));
    tackle(c, 95, 130, 24, 10, 'mustard');
    // The chalkboard on its easel, the lures written up in chalk.
    box(c, 'cedar_dark', 131, 132, 2, 14); box(c, 'cedar_dark', 152, 132, 2, 14);
    A.slab(c, 128, 112, 28, 22, WOODK); box(c, 'outline', 130, 114, 24, 18); box(c, 'leaf_deep', 131, 115, 22, 16);
    for (i = 0; i < 3; i++) { A.line(c, i === 1 ? 'mustard_lit' : 'stone_hi', 133, 118 + i * 5, 140 + i * 3, 118 + i * 5); A.line(c, 'crt_glow', 144 + i, 118 + i * 5, 150, 117 + i * 5); }
    // The plant on its stool.
    A.slab(c, 158, 128, 24, 5, WOODK); box(c, 'cedar_dark', 161, 133, 3, 12); box(c, 'cedar_dark', 176, 133, 3, 12);
    img(c, bush(28, 30), 156, 100);
    // The cubby under the lava lamp: four shelves of boxes, a coil of line.
    A.slab(c, 185, 74, 36, 72, WOODK); box(c, 'cedar_deep', 188, 77, 30, 66);
    for (i = 0; i < 4; i++) A.slab(c, 187, 92 + i * 15, 32, 3, LITK);
    tackle(c, 191, 82, 14, 9, 'teal'); A.slab(c, 207, 84, 9, 7, ramp('brick'));
    A.slab(c, 190, 99, 12, 8, ramp('mustard')); A.slab(c, 204, 100, 12, 7, ramp('olive'));
    tackle(c, 192, 114, 22, 9, 'brick');
    A.blob(c, 196, 140, 6, 3, ['outline', 'reed', 'reed_hi', 'paper_dark'], {}); A.blob(c, 196, 140, 2, 1, 'outline', {}); A.slab(c, 206, 135, 10, 8, ramp('brick'));
    // The guitar on its amp; the shelf over them with the jar, the radio, a plant and bottles.
    A.slab(c, 222, 88, 130, 5, LITK); box(c, 'cedar_dark', 226, 93, 3, 5); box(c, 'cedar_dark', 345, 93, 3, 5);
    img(c, K.amp(), 218, 120);
    img(c, K.guitar('sun'), 230, 98);
    A.slab(c, 250, 71, 14, 17, ['outline', 'lav_dark', 'lav', 'lav_hi', 'lav_lit']); box(c, 'outline', 251, 69, 12, 3); box(c, 'chrome', 252, 69, 10, 2); px(c, 'neon_pink_hi', 253, 74); px(c, 'neon_pink_hi', 259, 80);
    box(c, 'pink_hi', 252, 75, 1, 6);                                                     // the unlabelled jar's shine
    img(c, bush(30, 26), 318, 60);
    A.slab(c, 318, 76, 22, 12, ramp('teal')); box(c, 'ivory', 322, 80, 10, 2);
    for (i = 0; i < 3; i++) { A.slab(c, 341 + i * 4, 76, 3, 12, ramp(['brick', 'olive', 'brick_hi'][i])); box(c, 'chrome', 341 + i * 4, 74, 3, 2); }
    // Rusty's back shelf: the radio (its dial is live) and a stack of tins; a cabinet under it.
    A.slab(c, 250, 114, 102, 5, LITK); A.area(c, 252, 119, 98, FY - 119, function (x, y) { return (x - 252) % 10 === 0 ? 'cedar_dark' : (y < 122 ? 'cedar_dark' : 'cedar'); });
    radio(c, RADIO[0], RADIO[1]);
    tin(c, 312, 103, 'brick_hi'); tin(c, 321, 103, 'olive_hi'); tin(c, 316, 95, 'mustard_hi');
  }
  function tackle(c, x, y, w, h, k) {
    A.slab(c, x, y, w, h, ramp(k)); box(c, 'outline', x + 1, y + 3, w - 2, 1); box(c, sh(k, 1), x + 1, y + 1, w - 2, 1);
    box(c, 'chrome_hi', x + (w >> 1) - 2, y + 5, 4, 2); box(c, 'outline', x + (w >> 1) - 3, y - 2, 7, 1); px(c, 'outline', x + (w >> 1) - 3, y - 1); px(c, 'outline', x + (w >> 1) + 3, y - 1);
  }
  function tin(c, x, y, k) { A.slab(c, x, y, 8, 10, ramp(k)); box(c, 'chrome_hi', x, y, 8, 2); box(c, 'outline', x, y + 2, 8, 1); box(c, 'ivory', x + 2, y + 5, 4, 2); }
  function radio(c, x, y) {
    A.slab(c, x, y, 38, 18, ['outline', 'chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']);
    A.area(c, x + 3, y + 4, 12, 11, function (xx, yy) { return (xx + yy) % 2 ? 'vinyl' : 'chrome_dark'; });       // the speaker grille
    box(c, 'outline', x + 17, y + 4, 18, 7); box(c, 'orange_dark', x + 18, y + 5, 16, 5);
    A.blob(c, x + 21, y + 14, 2, 2, ['outline', 'vinyl', 'chrome_hi'], {}); A.blob(c, x + 30, y + 14, 2, 2, ['outline', 'vinyl', 'chrome_hi'], {});
    box(c, 'outline', x + 30, y - 6, 1, 6); px(c, 'chrome_lit', x + 30, y - 7);              // the aerial
  }
  // A leafy plant in a terracotta pot (w×h): leaves as ovals round a crown.
  function bush(w, h) {
    var L = ['leaf_deep', 'leaf_dark', 'leaf', 'leaf_hi', 'leaf_lit'], POT = ['brick_dark', 'brick', 'brick_hi', 'orange_hi'];
    return prop(w, h, function (g) {
      var cx = w / 2, py = h - 9, i;
      for (i = 0; i < 9; i++) {
        var a = -Math.PI + 0.15 + i * (Math.PI - 0.3) / 8, r = w * 0.32, lx = cx + Math.cos(a) * r, ly = py - 7 + Math.sin(a) * r * 0.75;
        g.line('leaf_dark', cx, py - 2, lx, ly + 2);
        g.ell(lx, ly, w * 0.13, w * 0.1, L, { bias: 0.15 - (i % 3) * 0.1 });
      }
      g.ell(cx, py - 7, w * 0.2, w * 0.15, L, { bias: 0.2 });
      g.poly([[cx - 7, py], [cx + 7, py], [cx + 5.5, h - 1], [cx - 5.5, h - 1]], function (x, y) { return tone(POT, 0.75 - (x - cx + 7) / 14 * 0.6); });
      g.rect(POT[2], cx - 8, py, 16, 2); g.rect(POT[0], cx - 7, py + 2, 14, 1);
    });
  }

  // Down the west wall: the cooler of worms, the cricket crate, the minnow tank, the freezer the
  // cat sleeps on. Nobody stands in their column, so they are baked into the base.
  var STACK = 19;                                              // their left edge
  function westStack(c) {
    var x = STACK, i, y;
    // The cooler: a white lid with a red pattern, cups of worms showing under it.
    y = ty(2) - 2;
    A.slab(c, x, y + 10, 44, 20, ['outline', 'paper_dark', 'paper', 'bone', 'ivory']); box(c, 'teal_hi', x + 1, y + 23, 42, 2);
    A.slab(c, x - 1, y, 46, 11, ['outline', 'paper_dark', 'bone', 'ivory', 'cream']);
    for (i = 0; i < 4; i++) { var dx = x + 6 + i * 10; A.area(c, dx - 3, y + 2, 7, 7, function (xx, yy) { return Math.abs(xx - dx) + Math.abs(yy - y - 5) < 3 ? (Math.abs(xx - dx) + Math.abs(yy - y - 5) < 2 ? 'crimson' : 'rug_hi') : ''; }); }
    box(c, 'brick', x + 6, y + 15, 14, 5); box(c, 'ivory', x + 7, y + 17, 12, 1);
    // The cricket crate: a wooden frame round a mesh front.
    y = ty(3) - 2;
    A.slab(c, x + 1, y, 42, 28, WOODK); box(c, 'outline', x + 5, y + 4, 34, 18); box(c, 'reed_dark', x + 6, y + 5, 32, 16);
    A.slab(c, x + 1, y + 23, 42, 5, LITK);
    // The minnow tank on its stand: glass, water lit from the hood, gravel, weeds.
    y = ty(4) - 4;
    A.slab(c, x, y + 26, 44, 6, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']);
    box(c, 'outline', x, y, 44, 27); A.slab(c, x, y - 3, 44, 4, ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark']);
    A.area(c, x + 1, y + 1, 42, 25, function (xx, yy) { var e = yy - y; return e < 3 ? 'crt_glow' : (e > 20 ? ((xx + yy) % 3 ? 'stone_hi' : 'paper_dark') : (e < 11 ? 'crt_hi' : 'teal_lit')); });
    for (i = 0; i < 4; i++) { A.line(c, 'leaf_hi', x + 6 + i * 10, y + 22, x + 4 + i * 10, y + 10 + (i % 2) * 4); A.line(c, 'leaf', x + 8 + i * 10, y + 22, x + 10 + i * 10, y + 13); }
    box(c, 'crt_glow', x + 2, y + 2, 10, 1); box(c, 'chrome_lit', x + 1, y + 3, 1, 8);
    // The freezer: a long white chest, a red label, the cat's place on its lid.
    y = ty(5) + 18;
    A.slab(c, x, y + 10, 44, 34, ['outline', 'paper_dark', 'paper', 'bone', 'ivory']);
    A.slab(c, x - 1, y, 46, 12, ['outline', 'paper_dark', 'bone', 'ivory', 'cream']);
    box(c, 'chrome_hi', x + 17, y + 11, 10, 2); box(c, 'outline', x + 17, y + 13, 10, 1);
    A.slab(c, x + 6, y + 22, 20, 8, ramp('brick')); box(c, 'ivory', x + 9, y + 25, 14, 1);
    box(c, 'stone_dark', x + 2, y + 44, 5, 2); box(c, 'stone_dark', x + 37, y + 44, 5, 2);
  }

  function paintBase(c) {
    A.reset();
    shell(c);
    wallThings(c);
    builtIns(c);
    westStack(c);
    rug(c, 130, ty(3) + 4, 96, 68);
    // The frame's rounded bottom corners, as the reference's room has them (the beam's log ends
    // stand at the top ones).
    for (var q = 0; q < 2; q++) {
      var qx = q ? W - 20 : 0, qy = RH - 20;
      A.area(c, qx, qy, 20, 20, function (x, y) { var d = Math.hypot(q ? x - (W - 20) : 19 - x, y - qy); return d > 19.5 ? 'black' : (d > 18 ? 'outline' : ''); });
    }
    A.reset();
  }
  // The rug (Phase 118): a knotted rag rug, each knot a 2×2 bump, in bands of orange, red,
  // mustard, olive and orange round a tan heart; fat tassels on its short sides.
  function rug(c, x, y, w, h) {
    var B = ['orange_hi', 'rug_hi', 'orange', 'mustard_hi', 'olive', 'olive_hi', 'orange_hi', 'mustard', 'cedar_glow', 'cedar_lit'];
    A.area(c, x - 6, y, w + 12, h, function (xx, yy) {
      var ix = xx - x, iy = yy - y;
      if (ix < 0 || ix >= w) {                                                                   // the tassels, in bunches
        var d = ix < 0 ? -ix : ix - w + 1, q = iy % 5;
        if (q === 4 || d > 6 - (q === 0 || q === 3 ? 1 : 0)) return '';
        return d === 6 || (d === 5 && (q === 0 || q === 3)) ? 'mustard' : (q === 1 ? 'mustard_lit' : 'mustard_hi');
      }
      var e = Math.min(ix, w - 1 - ix, iy, h - 1 - iy), band = Math.min(B.length - 1, Math.floor(e / 4));
      var k = B[band], kx = ix % 4, ky = iy % 4;
      if (band === B.length - 1 && ((Math.abs(ix - w / 2) < 9 && Math.abs(iy - h / 2) < 3) || ((ix + iy) % 6 === 0))) k = 'mustard';   // the heart's motif
      if (ix === 0 || iy === 0 || ix === w - 1 || iy === h - 1) return 'orange_dark';
      if ((kx === 0 || kx === 3) && (ky === 0 || ky === 3)) return sh(k, -1);                    // round knots: dark corners, a lit crown
      return kx === 1 && ky === 1 ? sh(k, 1) : k;
    });
    box(c, 'cedar_deep', x, y + h, w, 2);
  }

  // Props drawn in order of their feet with the people.
  function paintCounter(c) {
    // In the prop's own pixels: x from 248, y from FY - 4. The top, lit, then the front face.
    var w = 104, top = 46, face = 18;
    A.area(c, 0, 0, w, top + face, function (x, y) {
      if (x === 0 || x === w - 1 || y === 0 || y === top + face - 1) return 'outline';
      if (y < top) return y === top - 1 ? 'cedar_hi' : tone(WARM, 0.62 - y / top * 0.15 + ((y % 9) === 0 ? -0.12 : 0) + (x < 3 ? 0.1 : 0));
      if (y === top) return 'outline';
      return ((x - 1) % 8 === 0) ? 'cedar_deep' : tone(WARM, 0.32 - (y - top) * 0.01 + ((x - 1) % 8 === 1 ? 0.08 : 0));
    });
    A.slab(c, 50, top + 6, 14, 7, ramp('teal')); box(c, 'ivory', 53, top + 9, 8, 1);       // a sticker on the front
    var lg = X.grid(30, 30);                                                              // the banker's lamp: a green dome on a brass stem
    lg.ell(15, 27, 8, 2.4, ['outline', 'rust', 'leaf_gold', 'brass_hi'], { bias: 0.2 }); lg.rect('brass_hi', 14, 12, 2, 15); lg.rect('leaf_gold', 15, 12, 1, 15);
    lg.ell(15, 9, 13, 6.5, ['outline', 'moss_dark', 'moss', 'moss_hi', 'moss_lit'], { bias: 0.25 }); lg.rect('lamp_glow', 4, 13, 22, 2); lg.rect('cream', 12, 13, 6, 1);
    lg.outline('outline'); img(c, lg.canvas(), 4, 0);
    // On top: the lure drawers, the banker's lamp, an ashtray, a honey pot, the till.
    var g = X.grid(w, top + 4);
    g.slab(6, 21, 30, 22, ['outline', 'blood', 'crimson', 'rug_hi']);
    for (var i = 0; i < 6; i++) { var dx = 8 + (i % 3) * 9, dy = 23 + ((i / 3) | 0) * 10; g.rect('blood', dx, dy, 8, 8); g.rect('rug_hi', dx, dy, 8, 1); g.rect(['brass_hi', 'mustard_lit', 'orange_lit'][i % 3], dx + 3, dy + 3, 2, 2); }
    g.ell(46, 26, 5, 2.4, ['outline', 'stone_dark', 'stone', 'stone_hi'], {}); g.rect('ivory', 44, 25, 3, 1); g.set('orange_hi', 48, 25);
    g.ell(58, 23, 4, 4, ['outline', 'orange_dark', 'orange', 'mustard_hi'], { bias: 0.2 }); g.rect('cedar', 56, 18, 4, 2);
    g.slab(76, 4, 24, 18, ['outline', 'chrome_dark', 'chrome', 'chrome_hi', 'chrome_lit']); g.rect('outline', 79, 7, 18, 5); for (i = 0; i < 3; i++) g.set('signal_amber', 82 + i * 4, 9);
    for (i = 0; i < 8; i++) g.set(i % 3 ? 'chrome_lit' : 'ivory', 80 + (i % 4) * 4, 15 + ((i / 4) | 0) * 3);
    g.outline('outline'); g.paint(c, 0, 0);
  }
  // The floor lamp (34×82): a pleated cream shade, a brass pole and foot.
  function paintLamp(g) {
    g.rect('brass_hi', 16, 28, 2, 50); g.rect('leaf_gold', 17, 28, 1, 50);
    g.ell(17, 78, 8, 2.6, ['outline', 'rust', 'leaf_gold', 'brass_hi'], { bias: 0.2 });
    g.poly([[8, 2], [26, 2], [32, 28], [2, 28]], function (x, y) { var d = Math.abs(x - 17); return x % 4 === 0 ? (y > 18 ? 'orange_lit' : 'mustard_lit') : (y > 22 ? 'orange_lit' : (d < 5 ? 'cream' : (d < 10 ? 'lamp_glow' : 'mustard_lit'))); });
    g.rect('signal_amber', 3, 28, 28, 2); g.rect('mustard_hi', 8, 1, 18, 1);
  }
  // The drinks fridge (42×66): a red cabinet, a sign, a glass door (the inside is live).
  function paintFridge(g) {
    g.slab(0, 0, 42, 64, ['outline', 'blood', 'crimson', 'rug_hi', 'pink_hi']);
    g.slab(4, 2, 34, 8, ['outline', 'ivory', 'cream', 'cream']); g.rect('crimson', 6, 4, 30, 3); g.rect('ivory', 9, 5, 4, 1); g.rect('ivory', 16, 5, 9, 1); g.rect('ivory', 28, 5, 5, 1);
    g.rect('outline', 4, 12, 34, 48);
    g.rect('chrome_hi', 35, 26, 1, 16);
    g.rect('stone_dark', 3, 64, 5, 2); g.rect('stone_dark', 34, 64, 5, 2);
  }
  function fridgeInside(ctx, x, y, t, night) {
    var fl = ((t * 0.5) % 23) < 0.2 && (Math.floor(t * 30) & 1), i, s;
    ctx.fillStyle = P[fl ? 'crt_dark' : 'crt']; ctx.fillRect(x, y, 32, 46);
    ctx.fillStyle = P[fl ? 'crt' : 'crt_glow']; ctx.fillRect(x, y, 32, 1);
    var DR = ['olive_hi', 'brick_hi', 'mustard_hi', 'teal_hi', 'orange_hi', 'olive_hi'];
    for (s = 0; s < 3; s++) {
      var sy = y + 14 + s * 14;
      ctx.fillStyle = P.chrome_hi; ctx.fillRect(x, sy, 32, 1);
      for (i = 0; i < 6; i++) { ctx.fillStyle = P[DR[(i + s * 2) % 6]]; ctx.fillRect(x + 2 + i * 5, sy - 8, 4, 8); ctx.fillStyle = P.ivory; ctx.fillRect(x + 2 + i * 5, sy - 5, 4, 1); ctx.fillStyle = P.chrome_lit; ctx.fillRect(x + 3 + i * 5, sy - 9, 2, 1); }
    }
    ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.25; ctx.fillRect(x + 2, y + 2, 1, 18); ctx.fillRect(x + 3, y + 2, 1, 6); ctx.globalAlpha = 1;
    if (!fl) K.glow(ctx, x + 16, y + 24, 22, 'crt_glow', 0.03 + 0.04 * night);
  }
  // The monstera (60×64): big split leaves over a terracotta pot.
  function paintPalm(g) {
    var L = ['leaf_dark', 'leaf', 'leaf_hi', 'leaf_lit', 'olive_lit'], POT = ['orange_dark', 'orange', 'orange_hi', 'orange_lit'], cx = 30, py = 48, i, k;
    // Each leaf: [angle, reach, size]; a broad heart, its midrib, the splits running in from its rim.
    var LV = [[-2.75, 19, 9], [-2.25, 22, 10], [-1.75, 21, 10], [-1.3, 22, 10], [-0.85, 22, 10], [-0.4, 18, 9], [-1.55, 10, 8], [-2.0, 11, 7], [-1.05, 11, 7]];
    for (i = 0; i < LV.length; i++) {
      var a = LV[i][0], r = LV[i][1], z = LV[i][2], lx = cx + Math.cos(a) * r, ly = py - 12 + Math.sin(a) * r * 0.85, ca = Math.cos(a), sa = Math.sin(a);
      g.line('leaf_dark', cx, py - 2, lx - ca * z * 0.6, ly - sa * z * 0.5 + 2);
      g.ell(lx, ly, z, z * 0.72, L, { bias: 0.2 - (i % 3) * 0.12 });
      g.line('leaf_dark', lx - ca * z * 0.8, ly - sa * z * 0.6, lx + ca * z * 0.8, ly + sa * z * 0.6);       // the midrib
      for (k = -1; k <= 1; k += 2) {                                                                    // the splits
        var px0 = lx - sa * z * 0.72 * k, py0 = ly + ca * z * 0.5 * k;
        g.line('outline', px0, py0, px0 + (lx - px0) * 0.45, py0 + (ly - py0) * 0.45);
        g.line('outline', px0 + ca * 3, py0 + sa * 2, px0 + ca * 3 + (lx - px0) * 0.4, py0 + sa * 2 + (ly - py0) * 0.4);
      }
      g.line('olive_lit', lx - 3, ly - z * 0.45, lx + 2, ly - z * 0.55);
    }
    g.poly([[cx - 10, py], [cx + 10, py], [cx + 8, 63], [cx - 8, 63]], function (x) { return tone(POT, 0.85 - (x - cx + 10) / 20 * 0.6); });
    g.rect(POT[2], cx - 11, py, 22, 3); g.rect(POT[3], cx - 9, py, 8, 1); g.rect(POT[0], cx - 10, py + 3, 20, 1);
  }

  // ---- Baking ------------------------------------------------------------------------------
  var base = null, front = null, props = null, bakeMs = 0;
  function bake() {
    if (!base) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      base = G.gfx.bake.cached('shop:room117', function () { return G.gfx.bake.layer(W, RH, paintBase); });
      front = G.gfx.bake.cached('shop:front117', function () {
        return G.gfx.bake.layer(W, RH, function (c) {
          // The mullions, a plant on the first sill.
          for (var i = 0; i < WINS.length; i++) {
            var g = WINS[i], mx = g[0] + (g[2] >> 1) - 1;
            A.slab(c, mx, g[1], 4, g[3], WOODK); A.slab(c, g[0], g[1] + 34, g[2], 3, WOODK);
          }
          var p1 = K.plant('snake', ['mustard_dark', 'mustard', 'mustard_hi', 'mustard_lit']); c.drawImage(p1, 96, WINS[0][1] + WINS[0][3] + 5 - p1.height);
          A.reset();
        });
      });
      props = [
        { img: G.gfx.bake.cached('shop:counter117', function () { return G.gfx.bake.layer(104, 64, paintCounter); }), x: 248, y: FY + 6, foot: ty(4) },
        { img: G.gfx.bake.cached('shop:lamp117', function () { return prop(34, 82, paintLamp); }), x: LAMP[0] - 17, y: 156, foot: ty(5) - 2 },
        { img: G.gfx.bake.cached('shop:fridge117', function () { return prop(42, 67, paintFridge); }), x: 314, y: ty(4) - 2, foot: ty(6) - 2 },
        { img: G.gfx.bake.cached('shop:palm117', function () { return prop(60, 64, paintPalm); }), x: 296, y: ty(7) - 62, foot: ty(7) - 1 }
      ];
      props[2].live = function (ctx, x, y, t, env) { fridgeInside(ctx, x + 5, y + 13, t, env ? env.night : 0); };
      if (t0) bakeMs = performance.now() - t0;
    }
    return base;
  }

  // What the shelves hold (Phase 38): every rod not yet his on the rack (Phase 43), the minnows
  // and crickets left this visit (Phase 79b). The cat on the freezer.
  var shown = { rods: 0, minnows: 0, crickets: 0 };
  function drawStock(ctx, stock, t, ox, oy) {
    var i, n = 0, rods = G.data.gear.rods;
    for (i = 1; i < rods.length; i++) {
      if ((stock.rods && stock.rods.indexOf(i) >= 0) || rods[i].ice) continue; // Phase 80: the ice rods are kept behind the counter
      var x = ox + 28 + (n % 5) * 12, y0 = oy + 64;
      ctx.fillStyle = P.outline; ctx.fillRect(x - 1, y0, 4, 60);
      ctx.fillStyle = P[rods[i].look[0]]; ctx.fillRect(x, y0, 2, 38);
      ctx.fillStyle = P.chrome_hi; for (var gi = 0; gi < 3; gi++) ctx.fillRect(x, y0 + 6 + gi * 10, 2, 1);
      ctx.fillStyle = P.cedar_glow; ctx.fillRect(x, y0 + 38, 2, 16); ctx.fillStyle = P.cedar_hi; ctx.fillRect(x + 1, y0 + 38, 1, 16);   // the cork grip
      ctx.fillStyle = P.chrome; ctx.fillRect(x + 1, y0 + 34, 4, 4); ctx.fillStyle = P.chrome_lit; ctx.fillRect(x + 1, y0 + 34, 1, 1);
      ctx.fillStyle = P.outline; ctx.fillRect(x, y0 + 54, 2, 6);
      n++;
    }
    shown.rods = n;
    // Minnows in the tank, crickets in the crate now and then hopping.
    var mx = ox + STACK + 4, my = oy + ty(4) + 1;
    shown.minnows = stock.minnows;
    for (i = 0; i < stock.minnows; i++) {
      var ph = t * (0.35 + i * 0.07) + i * 1.7, u = (Math.sin(ph) + 1) / 2, dir = Math.cos(ph) > 0;
      ctx.fillStyle = P.water_foam; ctx.fillRect(mx + Math.round(u * 32), my + (i * 5) % 14, 3, 1);
      ctx.fillStyle = P.chrome_lit; ctx.fillRect(mx + Math.round(u * 32) + (dir ? 2 : 0), my + (i * 5) % 14, 1, 1);
    }
    var cx = ox + STACK + 7, cy = oy + ty(3) + 3;
    shown.crickets = stock.crickets;
    for (i = 0; i < stock.crickets; i++) {
      var hop = (t * 0.6 + i * 0.37) % 1 < 0.06 ? 2 : 0;
      ctx.fillStyle = P.outline; ctx.fillRect(cx + 1 + (i * 7) % 28, cy + 4 + ((i * 5) % 9) - hop, 2, 1); ctx.fillStyle = P.cedar_hi; ctx.fillRect(cx + 3 + (i * 7) % 28, cy + 3 + ((i * 5) % 9) - hop, 1, 1);
    }
    ctx.fillStyle = P.reed_hi;                                                          // the crate's mesh over them
    for (i = 0; i < 9; i++) ctx.fillRect(cx - 1 + i * 4, cy - 1, 1, 16);
    for (i = 0; i < 5; i++) ctx.fillRect(cx - 1, cy - 1 + i * 4, 33, 1);
    K.cat(ctx, ox + STACK + 2, oy + ty(5) + 20, t, 2);
  }

  // ---- Light, life and the strange (Phase 39) -------------------------------------------
  // env: {hour, night, grey, rain, fog, flash, strange, st}: the windows show the lake at the
  // hour; at night the room keeps its lamps' warmth, darker toward the corners.
  var mask = null;
  // Phase 118: the dark in fine steps (2 px cells, eleven levels), so no ring shows round a pool.
  function softMask(w, h, pools, clear) {
    return G.gfx.bake.layer(w, h, function (c) {
      c.fillStyle = P.cedar_deep;                                                             // a warm dark, never a cold one
      for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) {
        if (clear(x, y)) continue;
        var best = 9;
        for (var i = 0; i < pools.length; i++) { var p = pools[i], dx = (x - p.x) / (p.sx || 1.2), dy = y - p.y; best = Math.min(best, Math.sqrt(dx * dx + dy * dy) / p.r); }
        var a = Math.round(Math.max(0, Math.min(1, (best - 0.3) / 0.9)) * 10) / 10 * 0.55;
        if (!a) continue;
        c.globalAlpha = a; c.fillRect(x, y, 2, 2);
      }
      c.globalAlpha = 1;
    });
  }
  function clearAt(x, y) {
    for (var i = 0; i < WINS.length; i++) { var g = WINS[i]; if (x >= g[0] && x < g[0] + g[2] && y >= g[1] && y < g[1] + g[3]) return true; }
    return false;
  }
  function drawLive(ctx, env, t, rusty, ox, oy) {
    var i;
    for (i = 0; i < WINS.length; i++) {
      var g = WINS[i], fig = env.strange === 'figure' && i === 1 ? Math.min(1, Math.min(env.st, 1 - env.st) * 4) : 0;
      K.glass(ctx, ox + g[0], oy + g[1], g[2], g[3], env, t, fig);
    }
    ctx.drawImage(front, ox, oy);
    // The BAIT neon in the first window: pink tubes, a flicker every 17 s.
    var on = (t % 17) > 0.35 || ((t * 20) | 0) % 2;
    neon(ctx, 'BAIT', ox + WINS[0][0] + 6, oy + WINS[0][1] + 5, on, env.night);
    // The clock's hands at the game hour (39.3 runs them back).
    var cx = ox + CLK[0], cy = oy + CLK[1], back = env.strange === 'clock' ? env.st * 4 * Math.PI : 0;
    var ha = (((env.hour % 12) + 12) % 12) / 12 * 2 * Math.PI, ma = (env.hour % 1) * 2 * Math.PI - back;
    ctx.fillStyle = P.outline;
    for (i = 1; i <= 7; i++) ctx.fillRect(Math.round(cx + Math.sin(ma) * i), Math.round(cy - Math.cos(ma) * i), 1, 1);
    for (i = 1; i <= 5; i++) ctx.fillRect(Math.round(cx + Math.sin(ha) * i * 0.8), Math.round(cy - Math.cos(ha) * i * 0.8), 1, 1);
    ctx.fillStyle = P.neon_red; ctx.fillRect(cx, cy, 1, 1);
    // The radio's dial: an amber band, its needle drifting.
    var rx = ox + RADIO[0] + 18, ry = oy + RADIO[1] + 5;
    ctx.fillStyle = P.signal_amber; ctx.fillRect(rx, ry, 16, 5); ctx.fillStyle = P.lamp_glow; ctx.fillRect(rx, ry + 2, 16, 1);
    ctx.fillStyle = P.blood; ctx.fillRect(rx + 3 + Math.round((Math.sin(t * 0.05) + 1) * 5), ry, 1, 5);
  }
  // A word in neon tubes (the font's own pixels, doubled, outlined): lit or dark.
  function neon(ctx, s, x, y, on, night) {
    var F = G.gfx.sprites;
    if (on && night > 0.2) { ctx.globalAlpha = 0.18 * night; ctx.fillStyle = P.neon_pink; ctx.fillRect(x - 3, y - 3, F.measure(s) + 6, 11); ctx.globalAlpha = 1; }
    F.drawText(ctx, s, x, y, on ? 'neon_pink_hi' : 'pink_dark');
    F.drawText(ctx, s, x + 1, y, on ? 'neon_pink' : 'pink_dark');
  }
  function drawLight(ctx, env, t, rusty, ox, oy) {
    var i, n = env.night;
    // The dark in the corners, deeper at night; the lamps' pools stay warm.
    if (!mask) mask = softMask(W, RH, [{ x: LAMP[0], y: LAMP[1] + 30, r: 140, sx: 1.4 }, { x: DESK[0], y: DESK[1], r: 80 }, { x: W >> 1, y: 40, r: 70, sx: 3.6 },
      { x: 335, y: ty(5), r: 50 }, { x: 40, y: ty(4) + 16, r: 40 }, { x: W >> 1, y: ty(5), r: 90, sx: 1.6 }], clearAt);
    ctx.globalAlpha = 0.3 + 0.25 * n; ctx.drawImage(mask, ox, oy);
    ctx.globalAlpha = 0.04 + 0.06 * n; ctx.fillStyle = P.flame; ctx.fillRect(ox + SW, oy, W - 2 * SW, RH - T);
    ctx.globalAlpha = 1;
    if (env.grey > 0.02) { ctx.globalAlpha = 0.06 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + SW, oy + 16, W - 2 * SW, RH - 48); ctx.globalAlpha = 1; }
    if (n > 0.3) {                                                                         // dust in the lamplight
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.4 * n;
      for (i = 0; i < 11; i++) { var a = t * (0.05 + i * 0.011) + i * 2.1, r = 10 + (i * 7) % 34; ctx.fillRect(Math.round(ox + LAMP[0] + 20 + Math.cos(a) * r * 1.1), Math.round(oy + LAMP[1] + 10 + Math.sin(a * 1.3) * r * 0.8), 1, 1); }
      ctx.globalAlpha = 1;
    }
    warmBulbs(ctx, bulbPts(ox, oy), t, n);
    for (i = 0; i < HANG.length; i++) K.glow(ctx, ox + HANG[i], oy + 34, 16, 'lamp_glow', 0.05 + 0.06 * n);
    moths(ctx, env, t, ox, oy);
    K.lavaLamp(ctx, ox + 203, oy + 74, t, true, n);
    K.glow(ctx, ox + 203, oy + 62, 14, 'orange_lit', 0.05 + 0.05 * n);
    // The floor lamp's shade glows and throws a warm pool on the boards; the banker's lamp too.
    K.glow(ctx, ox + LAMP[0], oy + LAMP[1] - 2, 30, 'lamp_glow', 0.08 + 0.08 * n);
    K.glow(ctx, ox + LAMP[0], oy + LAMP[1] + 64, 48, 'signal_amber', 0.04 + 0.05 * n);
    K.glow(ctx, ox + DESK[0], oy + DESK[1] + 8, 22, 'lamp_glow', 0.06 + 0.06 * n);
    K.glow(ctx, ox + STACK + 22, oy + ty(4) + 14, 24, 'crt_glow', 0.03 + 0.04 * n);       // the tank
    // The tank's bubbles; steam from Rusty's mug; smoke from the ashtray.
    ctx.fillStyle = P.water_foam;
    for (i = 0; i < 5; i++) { var u = (t * 0.5 + i / 5) % 1; ctx.fillRect(ox + STACK + 38 - (i % 2), oy + ty(4) + 18 - Math.floor(u * 19), 1, 1); }
    var cupX = ox + 312, cupY = oy + FY + 23;
    if (!rusty || rusty.fr !== 2) {
      ctx.fillStyle = P.outline; ctx.fillRect(cupX - 1, cupY - 1, 9, 9); ctx.fillStyle = P.cream; ctx.fillRect(cupX, cupY, 7, 7); ctx.fillStyle = P.paper_dark; ctx.fillRect(cupX + 5, cupY + 1, 2, 6);
      ctx.fillStyle = P.cedar_dark; ctx.fillRect(cupX + 1, cupY + 1, 4, 1); ctx.fillStyle = P.outline; ctx.fillRect(cupX + 8, cupY + 2, 1, 3);
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - v); ctx.fillRect(cupX + 3 + Math.round(Math.sin(v * 6 + i)), cupY - 2 - Math.floor(v * 12), 1, 1); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = P.stone_hi;
    for (i = 0; i < 3; i++) { var s = (t * 0.25 + i / 3) % 1; ctx.globalAlpha = 0.4 * (1 - s); ctx.fillRect(ox + 294 + Math.round(Math.sin(s * 5 + i * 2) * 2), oy + FY + 28 - Math.floor(s * 18), 1, 1); }
    ctx.globalAlpha = 1;
  }
  // Phase 64: the varnished boards give back what is lit; the windows give back the lamps.
  function reflections(ctx, env, t, ox, oy) {
    var n = env.night;
    K.reflect(ctx, ox + LAMP[0], oy + ty(5) - 1, 12, 26, 'lamp_glow', 0.12 + 0.15 * n, 0);
    K.reflect(ctx, ox + 335, oy + ty(6) - 2, 22, 20, 'crt_glow', 0.06 + 0.1 * n, 0);
    for (var i = 0; i < WINS.length; i++) { var g = WINS[i]; K.glassLamps(ctx, ox + g[0], oy + g[1], g[2], g[3], n); }
  }
  // Moths round the floor lamp's shade and the banker's lamp at night.
  function moths(ctx, env, t, ox, oy) {
    if (env.night < 0.4) return;
    ctx.fillStyle = P.paper;
    for (var i = 0; i < 3; i++) {
      var a = t * (2.1 + i * 0.7) + i * 2, L = i < 2 ? LAMP : DESK, r = i < 2 ? 9 + i * 3 : 6;
      ctx.fillRect(Math.round(ox + L[0] + Math.cos(a) * r), Math.round(oy + L[1] - (i < 2 ? 10 : 6) + Math.sin(a * 1.7) * r * 0.6), 1 + (Math.floor(t * 12 + i) & 1), 1);
    }
  }
  // The string lights as warm globes, each with a two-step halo even by day.
  var WB = ['lamp_glow', 'mustard_lit', 'signal_amber', 'orange_lit'];
  function warmBulbs(ctx, pts, t, night) {
    for (var i = 0; i < pts.length; i++) {
      var b = pts[i], k = WB[i % WB.length], on = 0.75 + 0.25 * Math.sin(t * 0.6 + i * 1.7), a = (0.12 + 0.16 * night) * on;
      ctx.fillStyle = P[k];
      ctx.globalAlpha = a; ctx.fillRect(b[0] - 5, b[1] - 2, 11, 9); ctx.fillRect(b[0] - 3, b[1] - 4, 7, 13);
      ctx.globalAlpha = a * 1.6; ctx.fillRect(b[0] - 2, b[1] - 1, 5, 6);
      ctx.globalAlpha = 1; ctx.fillStyle = P.outline; ctx.fillRect(b[0], b[1] - 1, 1, 1);
      ctx.fillStyle = P[k]; ctx.fillRect(b[0] - 1, b[1], 3, 4); ctx.fillStyle = P.cream; ctx.fillRect(b[0], b[1] + 1, 1, 2);
    }
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
    if (env) reflections(ctx, env, t, ox, oy);
    // Everything that stands, in order of its feet.
    var f = R.walkers(st, T, ox, oy + TOP), fr = R.frames(st);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    if (rusty) order.push(FY, 100);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {                              // a small sort, no allocation
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) { ctx.drawImage(props[id].img, ox + props[id].x, oy + props[id].y); if (props[id].live) props[id].live(ctx, ox + props[id].x, oy + props[id].y, t, env); }
      else if (id === 100) ctx.drawImage(R.sprite('rusty', rusty.face, rusty.fr), ox + 291, oy + FY + 17 - 41);   // Phase 119: as the boat paints him, his head and shoulders over the counter
      else if (id === 101) R.drawFigure(ctx, 'dog', st.dog.face, fr[1], f[2], f[3]);
      else R.drawFigure(ctx, 'fisher', st.face, fr[0], f[0], f[1]);
    }
    if (env) drawLight(ctx, env, t, rusty, ox, oy);
  }

  function sprite(kind, dir, fr, lk) { return R.sprite(kind, dir, fr, lk); }

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, TOP: TOP, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: WK.create, step: WK.step, facing: WK.facing, isBlocked: WK.isBlocked, draw: draw, bake: bake, sprite: sprite, prebake: R.prebake,
    bakeMs: function () { return bakeMs; }, blocked: WK.blocked, shown: function () { return shown; },
    // Phase 64 (dbg.roomLife): the live things in the room.
    life: function () { var n = 0; for (var i = 0; i < (props || []).length; i++) if (props[i].live) n++; return { room: 'shop', live: n, things: ['lava lamp on the cubby', 'cat on the freezer', 'drinks fridge', 'radio dial', 'moths', 'reflections'] }; } };
})();
