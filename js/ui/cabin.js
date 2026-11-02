var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The cabin (9.6, V9, V10.9): a worn lakeside cabin restored with coins, stage by stage
// (data/gear.js cabin), reached from the map. Kept fish are mounted on plaques, heaviest
// first; each stage adds plaques. Some trophies face the door when you come in; how many
// follows the unease of the water you came from (§2). That is decided in enter() and only
// there, so a trophy never turns while it is on screen (draw only reads `turned`).
// Phase 56: a room you walk into, like the bait shop (js/ui/room.js, js/ui/room_kit.js), cozy
// and lofi: log walls under a beam, a window onto the lake at the hour, the trophy wall, a
// wood stove with its pipe, a workbench (Space there restores the next stage), a mirror by the
// door (the fisher-and-dog picker), and the things he plays and watches: an old guitar and its
// amp, a synth on its stand, a record player on a crate of records, a CRT with a grey console
// facing an armchair. Each stage changes the room: derelict (holes in the floor to the night,
// gaps in the chinking, a cracked and boarded window, cobwebs, a sleeping bag, a bucket under
// a drip, crates where the furniture will be), patched (new boards, a cot, a lantern on the
// bench), the stove lit (fire, firewood, the armchair, the amp, a plant), a rug and lamp (the
// rug, the floor lamp, the CRT, the synth, the record player, string lights), restored
// (curtains, a quilt, a painting, more plants). Esc or M, or the door, goes back out.
G.ui = G.ui || {};
G.ui.cabin = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, A = G.gfx.paint, X = G.gfx.pix, K = G.ui.roomKit, R = G.ui.room, tone = X.tone;
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, OX = (640 - W) >> 1, OY = ((360 - H) >> 1) - 8, TOP = 44, RH = H + TOP;
  var MAP = [
    'wwwWWwwwwwww',
    's..........s',
    's..........s',
    's..........s',
    's..........s',
    's..........s',
    's...m......s',
    'ssssdsssssss'
  ];
  // Talk: what Space does facing it (the scene's, below). Every stage has something on each
  // of these tiles (the furniture, or junk where it will be), so the walk never changes.
  var OBJECTS = [
    { id: 'bench', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'bench' },
    { id: 'records', c: 3, r: 1, w: 2, h: 1, block: true, talk: 'records' },
    { id: 'stove', c: 10, r: 1, w: 1, h: 1, block: true, talk: 'stove' },
    { id: 'wood', c: 10, r: 2, w: 1, h: 1, block: true, talk: 'stove' },
    { id: 'tv', c: 7, r: 2, w: 1, h: 1, block: true, talk: 'tv' },
    { id: 'guitar', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'amp', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'guitar' },
    { id: 'keys', c: 1, r: 5, w: 1, h: 1, block: true, talk: 'keys' },
    { id: 'mirror', c: 1, r: 6, w: 1, h: 1, block: true, talk: 'mirror' },
    { id: 'chair', c: 7, r: 4, w: 1, h: 1, block: true, talk: 'chair' },
    { id: 'lamp', c: 8, r: 4, w: 1, h: 1, block: true, talk: '' },
    { id: 'bed', c: 9, r: 4, w: 2, h: 2, block: true, talk: 'bed' },
    { id: 'plant', c: 10, r: 6, w: 1, h: 1, block: true, talk: '' },
    { id: 'plaques', c: 5, r: 0, w: 5, h: 1, block: true, talk: 'plaques' },
    // Phase 64: a box fan, an old fridge, a side table by the chair (its lava lamp), the console
    // on the floor before the TV (Space there is the TV's).
    { id: 'fan', c: 5, r: 1, w: 1, h: 1, block: true, talk: 'fan' },
    { id: 'fridge', c: 9, r: 1, w: 1, h: 1, block: true, talk: 'fridge' },
    { id: 'side', c: 6, r: 4, w: 1, h: 1, block: true, talk: 'lava' },
    { id: 'console', c: 7, r: 3, w: 1, h: 1, block: true, talk: 'tv' }
  ];
  var DOOR = [4, 7], MAT = [4, 6], PLQ0 = 5, PCOLS = 5;
  var WK = R.walker(MAP, OBJECTS, MAT);
  function tx(c) { return c * T; }
  function ty(r) { return TOP + r * T; }
  var GL = [tx(3) + 5, 11, 2 * T - 10, TOP - 4];            // the window's glass
  var STOVE = [tx(10) + 16, ty(1) + 10];                    // the stove's firebox window
  var LAMPP = [tx(8) + 16, ty(4) + 4];

  // ---- Light ----------------------------------------------------------------------------------
  // Cold before the stove is lit; then warm from it, and from the lamp at stage 3.
  function lightFor(lv) {
    return function (x, y) {
      var L = lv < 1 ? 0.22 : 0.32;
      if (lv >= 2) { var d = Math.hypot((x - STOVE[0]) / 170, (y - STOVE[1]) / 130); L += Math.max(0, 1 - d) * 0.5; }
      if (lv >= 3) { var e = Math.hypot((x - LAMPP[0]) / 140, (y - LAMPP[1]) / 100); L += Math.max(0, 1 - e) * 0.32; }
      if (lv === 1) { var b = Math.hypot((x - tx(2)) / 90, (y - ty(1)) / 70); L += Math.max(0, 1 - b) * 0.2; }
      var w = Math.hypot((x - GL[0] - GL[2] / 2) / 90, (y - 50) / 80); L += Math.max(0, 1 - w) * 0.16;
      return Math.min(1, L);
    };
  }

  // ---- Painting ---------------------------------------------------------------------------
  var box = A.box, px = A.px, WOOD = K.WOOD, BRASS = ['rust', 'leaf_gold', 'brass_hi'];
  var PLQ_W = 28, PLQ_H = 19;
  function plaqueX(i) { return tx(PLQ0 + (i % PCOLS)) + 2; }
  function plaqueY(i) { return 10 + Math.floor(i / PCOLS) * 24; }
  function img(c, im, x, y) { c.drawImage(im, Math.round(x), Math.round(y)); A.reset(); }
  function crate(c, x, y, w, h) {
    A.slab(c, x, y, w, h, ['outline', 'wood_dark', 'wood', 'wood_mid', 'wood_hi']);
    for (var i = 1; i < 3; i++) box(c, 'wood_dark', x + 1, y + Math.round(h * i / 3), w - 2, 1);
    A.line(c, 'wood_dark', x + 2, y + 2, x + w - 3, y + h - 3);
  }

  function paintBase(c, lv, nPlaques) {
    A.reset();
    var L = lightFor(lv);
    K.logWall(c, T, W - 2 * T, TOP, L, lv < 1);
    K.floor(c, T, ty(1), W - 2 * T, H - 2 * T, L, { board: 10, ramp: ['wood_deep', 'wood_dark', 'wood', 'panel', 'wood_mid', 'panel_mid', 'wood_hi'] });
    K.wallTops(c, W, RH, TOP, T, DOOR[0]);
    var i, k;
    // The floor by stage: holes to the night, then patches.
    var HOLES = [[tx(5) + 4, ty(3) + 12, 22, 8], [tx(8) + 10, ty(6) + 4, 16, 6], [tx(3) + 2, ty(5) + 8, 12, 6]];
    for (i = 0; i < HOLES.length; i++) {
      var hx = HOLES[i][0], hy = HOLES[i][1], hw = HOLES[i][2], hh = HOLES[i][3];
      if (lv < 1) {
        A.area(c, hx, hy, hw, hh, function (x, y) { var e = Math.min(x - hx, hx + hw - 1 - x); return e < ((y * 7 + x) % 3) ? '' : (y - hy < 2 ? 'outline' : 'night_deep'); });
        box(c, 'wood_mid', hx, hy - 1, hw, 1); px(c, 'fog_dark', hx + (hw >> 1), hy + hh - 2);
      } else { A.slab(c, hx - 2, hy - 1, hw + 4, hh + 1, ['wood_dark', 'wood_mid', 'panel_hi', 'panel_lit']); px(c, 'chrome_hi', hx, hy + 1); px(c, 'chrome_hi', hx + hw - 1, hy + 1); }
    }
    // Rugs: a braided oval under the chair from stage 3, a runner by the bed at 4.
    if (lv >= 3) K.rug(c, tx(5) + 10, ty(2) + 20, 3 * T + 8, 2 * T + 6, 'oval', ['orange_dark', 'mustard', 'orange', 'olive', 'mustard_hi', 'brick', 'orange_hi']);
    if (lv >= 4) K.rug(c, tx(8) + 4, ty(6) + 4, 2 * T, T - 10, 'runner', ['lav_dark', 'lav', 'pink', 'lav_hi']);
    // The mat at the door.
    A.area(c, tx(4) + 3, ty(6) + 8, T - 6, T - 11, function (x, y) { return lv < 1 ? ((x + y) % 5 ? 'wood_deep' : 'wood_dark') : ((y - ty(6)) % 3 === 0 ? 'olive_dark' : ((x + y) % 4 ? 'olive' : 'olive_hi')); });
    // Phase 64: the console's pad on its cable, left on the rug before the chair.
    if (lv >= 3) {
      A.line(c, 'outline', tx(7) + 11, ty(3) + 14, tx(7) + 8, ty(3) + 19); A.line(c, 'outline', tx(7) + 8, ty(3) + 19, tx(7) + 3, ty(3) + 20);
      img(c, K.pad90s(), tx(6) + 25, ty(3) + 18);
    }
    // Cobwebs while derelict.
    if (lv < 2) for (var w = 0; w < 2; w++) { var cx = w ? W - T - 1 : T, dir = w ? -1 : 1; for (k = 0; k < 5; k++) A.line(c, 'fog_mid', cx, 5, cx + dir * (30 - k * 6), 5 + k * 6); for (k = 1; k < 4; k++) A.line(c, 'fog_dark', cx + dir * k * 8, 5, cx, 5 + k * 8); }
    // String lights from stage 3.
    cable = lv >= 3 ? K.lightCable(c, T + 4, W - T - 4, 6, 44, 5) : [];
    paintWall(c, lv, nPlaques);
    paintFurniture(c, lv);
    A.reset();
  }
  var cable = [];

  function paintWall(c, lv, n) {
    var i;
    K.windowFrame(c, GL[0], GL[1], GL[2], GL[3]);
    // The plaques: the boards for this stage's count (the fish go on live).
    for (i = 0; i < n; i++) {
      var x = plaqueX(i), y = plaqueY(i);
      box(c, 'outline', x - 1, y + 2, PLQ_W + 2, PLQ_H);                                    // shadow
      A.area(c, x, y, PLQ_W, PLQ_H, function (xx, yy) {
        var ex = Math.min(xx - x, x + PLQ_W - 1 - xx), ey = Math.min(yy - y, y + PLQ_H - 1 - yy);
        if (ex + ey < 3) return '';
        if (ex < 1 || ey < 1) return 'outline';
        if (ex < 2 || ey < 2) return (xx - x < 3 || yy - y < 3) ? 'wood_lit' : 'wood_dark';
        return ((yy - y) % 4 === 0 && ex > 3) ? 'wood_mid' : 'wood_hi';
      });
      A.slab(c, x + 9, y + PLQ_H - 5, 10, 3, BRASS);
      px(c, 'stone', x + (PLQ_W >> 1), y - 2); px(c, 'stone_hi', x + (PLQ_W >> 1), y - 1);
    }
    // Over the bench: a shelf of tapes, books, a candle and the clock stopped at 3:33; above
    // it a calendar (derelict), a band poster (patched to rug), a painting of the lake (restored).
    var sx = tx(1) + 2;
    if (lv >= 4) {
      A.slab(c, sx + 6, 7, 48, 30, ['rust', 'leaf_gold', 'brass_hi', 'brass_hi']);
      A.area(c, sx + 9, 10, 42, 24, function (x, y) {
        var r = (y - 10) / 24, ridge = 22 - Math.abs(((x - sx) % 20) - 10) * 0.6;
        if (y > 28) return y > 31 ? 'water_mid' : 'water_hi';
        if (y > ridge) return y > 25 ? 'pine_mid' : 'mount_mid';
        return r < 0.25 ? 'lav' : (r < 0.45 ? 'pink' : 'pink_hi');
      });
      box(c, 'wood_dark', sx + 36, 23, 5, 4); px(c, 'lamp_glow', sx + 38, 24);              // a lit cabin window across the lake
    } else if (lv >= 1) {
      A.slab(c, sx + 12, 6, 34, 30, ['lav_dark', 'lav_dark', 'lav', 'lav_hi', 'lav_lit']);
      A.blob(c, sx + 29, 19, 8, 8, ['orange', 'orange_hi', 'mustard_hi', 'mustard_lit'], { rim: 0 });
      for (i = 0; i < 4; i++) box(c, 'pink', sx + 14, 25 + i * 2, 30, 1);
      S.drawText(c, 'SOFT', sx + 18, 9, 'ivory'); A.reset();
      A.area(c, sx + 40, 30, 6, 6, function (x, y) { return x - (sx + 40) > 35 - y ? 'lav_dark' : ''; });
    } else {
      A.slab(c, sx + 16, 10, 18, 22, ['paper_dark', 'paper_dark', 'paper', 'bone']); box(c, 'brick', sx + 17, 11, 16, 5);
      for (i = 0; i < 12; i++) px(c, 'stone_hi', sx + 18 + (i % 4) * 4, 19 + ((i / 4) | 0) * 4);
      A.line(c, 'fog_dark', sx + 34, 24, sx + 30, 32);
    }
    A.slab(c, sx - 1, 40, 60, 4, WOOD); box(c, 'outline', sx - 1, 44, 60, 1);              // the shelf
    if (lv >= 1) {
      var g = X.grid(60, 14);
      K.books(g, 1, 0, 6, 13);
      for (i = 0; i < 5; i++) g.slab(21 + i * 3, 6, 3, 7, ['outline', ['orange_dark', 'lav_dark', 'olive_dark', 'brick_dark', 'crt'][i], ['orange', 'lav', 'olive', 'brick', 'crt_hi'][i], 'ivory']); // tapes
      g.slab(38, 4, 9, 9, ['outline', 'wood_dark', 'wood_mid', 'wood_hi']); g.ell(42.5, 8, 3, 3, ['paper_dark', 'paper', 'bone', 'cream'], {}); g.set('outline', 42, 6); g.set('outline', 42, 7); g.set('outline', 43, 8); // the clock at 3:33
      g.rect('ivory', 51, 6, 3, 7); g.set('flame', 52, 4); g.set('signal_amber', 52, 5);   // a candle
      K.mug(g, 55, 9, 'orange_hi');
      g.outline('outline'); g.paint(c, sx - 1, 26);
    } else { box(c, 'wood_dark', sx + 20, 36, 12, 4); A.line(c, 'wood_mid', sx + 6, 39, sx + 14, 34); }
    // The stove pipe up the wall from the stove, through the beam.
    var pxs = tx(10) + 12;
    A.area(c, pxs, 0, 8, ty(1) - 4, function (x, y) { var u = x - pxs; return (y % 14 === 0) ? 'outline' : tone(['outline', 'stone_dark', 'chrome_dark', 'chrome'], u < 2 ? 0.8 : (u > 5 ? 0.1 : 0.5) - (lv < 2 ? 0.2 : 0)); });
    if (lv < 2) { box(c, 'rust', pxs + 2, 30, 3, 2); box(c, 'rust_dark', pxs + 4, 52, 2, 3); }
    // A hat on a peg by the pipe.
    box(c, 'wood_deep', tx(9) + 26, 22, 2, 3);
    if (lv >= 1) { A.blob(c, tx(9) + 27, 32, 9, 2.4, ['outline', 'reed', 'reed_hi', 'paper_dark'], { bias: 0.1 }); A.blob(c, tx(9) + 27, 28, 5, 4, ['outline', 'reed', 'reed_hi', 'paper_dark'], { bias: 0.15 }); box(c, 'brick', tx(9) + 22, 30, 10, 1); }
  }

  function paintFurniture(c, lv) {
    var i, x, y, g;
    // The workbench: derelict, crates and a toolbox; then a bench with a vise, a pegboard of
    // tools, the ledger of what is left to fix, a coffee can of nails, a lantern.
    x = tx(1); y = ty(1);
    if (lv < 1) { crate(c, x + 4, y - 2, 24, 22); crate(c, x + 30, y + 4, 22, 18); A.slab(c, x + 32, y - 4, 18, 8, ['outline', 'brick_dark', 'brick', 'brick_hi']); box(c, 'chrome', x + 38, y - 6, 6, 2); }
    else {
      A.area(c, x + 4, 46, 2 * T - 8, ty(1) - 50, function (xx, yy) { return (xx % 4 === 2 && yy % 4 === 0) ? 'panel_deep' : 'panel_mid'; });  // the pegboard
      A.line(c, 'chrome_hi', x + 10, 50, x + 10, 64); A.line(c, 'chrome', x + 8, 50, x + 12, 50);                                       // a saw's back, a square
      A.limb(c, x + 20, 52, x + 20, 64, 1, ['wood_dark', 'wood_mid', 'wood_hi'], 0); box(c, 'chrome_dark', x + 17, 50, 7, 3);           // a hammer
      A.line(c, 'chrome_hi', x + 30, 50, x + 36, 62); A.line(c, 'chrome_hi', x + 36, 50, x + 30, 62);                                   // pliers
      A.blob(c, x + 48, 56, 5, 5, ['outline', 'rust_dark', 'rust'], { rim: 0 }); A.blob(c, x + 48, 56, 2, 2, 'outline', {});             // a coil of wire
      A.slab(c, x + 2, y - 2, 2 * T - 4, 8, ['outline', 'wood_mid', 'wood_hi', 'wood_lit']);                                           // the top
      box(c, 'wood_dark', x + 4, y + 6, 4, 18); box(c, 'wood_dark', x + 2 * T - 10, y + 6, 4, 18); box(c, 'wood_dark', x + 4, y + 18, 2 * T - 10, 3);
      A.slab(c, x + 6, y - 9, 9, 8, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); box(c, 'chrome_dark', x + 8, y - 12, 5, 3); // the vise
      A.slab(c, x + 20, y - 4, 14, 5, ['paper_dark', 'paper_dark', 'paper', 'ivory']); box(c, 'stone_hi', x + 22, y - 3, 9, 1); box(c, 'brick', x + 27, y - 4, 1, 5); // the ledger
      A.slab(c, x + 38, y - 8, 7, 8, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); for (i = 0; i < 3; i++) px(c, 'stone_hi', x + 39 + i * 2, y - 9); // nails
      A.slab(c, x + 48, y - 12, 9, 12, ['outline', 'rust_dark', 'rust', 'rust_hi']); box(c, 'outline', x + 49, y - 9, 7, 6); // the lantern (its light is live)
      box(c, 'wood_deep', x + 10, y + 12, 16, 6); box(c, 'olive', x + 30, y + 10, 12, 8); box(c, 'olive_hi', x + 30, y + 10, 12, 1); // a box underneath
    }
    // Under the window: a crate of records with the player on it (stage 3), and a speaker.
    x = tx(3); y = ty(1);
    if (lv >= 3) {
      img(c, K.recordCrate(), x + 1, y - 4);
      A.slab(c, x + T + 6, y - 6, 20, 28, ['outline', 'wood_dark', 'wood_mid', 'wood_hi']);
      A.area(c, x + T + 8, y - 3, 16, 16, function (xx, yy) { return (xx + yy) % 2 ? 'paper_dark' : 'reed_hi'; });
      A.blob(c, x + T + 16, y + 17, 3, 3, ['outline', 'vinyl', 'vinyl_hi'], {});
      img(c, K.plant('snake', ['olive_dark', 'olive', 'olive_hi', 'olive_lit']), x + T + 8, y - 34);
    } else if (lv >= 1) { crate(c, x + 4, y + 2, 26, 20); crate(c, x + T + 2, y + 4, 24, 18); for (i = 0; i < 6; i++) box(c, ['mustard', 'orange', 'lav', 'olive_hi', 'brick_hi', 'crt_hi'][i], x + 6 + i * 3, y - 2, 2, 5); }
    else { crate(c, x + 6, y + 4, 24, 18); A.blob(c, x + T + 12, y + 16, 12, 6, ['outline', 'stone_dark', 'stone', 'fog_mid'], {}); }      // a heap of junk
    // The wood stove: a cast-iron box on legs, its firebox window (fire live), the kettle, the firewood.
    x = tx(10); y = ty(1);
    var IRON = lv < 2 ? ['outline', 'rust_dark', 'rust', 'rust_hi'] : ['outline', 'vinyl', 'vinyl_hi', 'chrome_dark', 'chrome'];
    A.slab(c, x + 3, y - 10, 26, 26, IRON); box(c, 'outline', x + 3, y + 16, 26, 1);
    box(c, IRON[1], x + 5, y + 17, 3, 6); box(c, IRON[1], x + 24, y + 17, 3, 6);
    box(c, 'outline', x + 8, y + 2, 16, 10); box(c, lv < 2 ? 'stone_dark' : 'outline', x + 9, y + 3, 14, 8);
    A.slab(c, x + 2, y - 12, 28, 3, IRON);
    if (lv >= 2) { A.blob(c, x + 22, y - 15, 5, 3.5, ['outline', 'teal_dark', 'teal', 'teal_hi'], { bias: 0.1 }); box(c, 'teal_dark', x + 26, y - 18, 3, 2); } // a kettle
    else A.blob(c, x + 16, y + 8, 6, 2, ['stone_dark', 'stone', 'fog_mid'], {});                                           // cold ash
    y = ty(2);
    if (lv >= 2) {                                                                                                          // split logs stacked in a rack
      A.slab(c, x + 3, y + 24, 26, 3, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); box(c, 'chrome_dark', x + 4, y + 4, 1, 21); box(c, 'chrome_dark', x + 27, y + 4, 1, 21);
      for (i = 0; i < 6; i++) { var ly0 = y + 20 - ((i / 2) | 0) * 6, lx0 = x + 6 + (i % 2) * 11 + (((i / 2) | 0) % 2) * 2;
        A.limb(c, lx0, ly0, lx0 + 9, ly0, 2.6, ['outline', 'wood_dark', 'wood', 'wood_mid', 'leaf_rust'], 0.05);
        A.blob(c, lx0 + 9, ly0, 2, 2.4, ['wood_mid', 'panel_hi', 'panel_lit'], { rim: 0 }); A.px(c, 'wood_mid', lx0 + 9, ly0); }
    }
    else { A.line(c, 'wood_mid', x + 4, y + 20, x + 22, y + 14); A.line(c, 'wood_dark', x + 8, y + 24, x + 26, y + 22); A.line(c, 'wood_mid', x + 10, y + 12, x + 16, y + 22); }
    // The west wall: the guitar, the amp, the synth, all sat by stage.
    x = tx(1);
    img(c, K.guitar(lv < 2 ? 'natural' : 'sun'), x + 8, ty(3) - 18);
    if (lv < 2) { crate(c, x + 22, ty(3) + 8, 8, 14); }
    if (lv >= 2) img(c, K.amp(), x + 3, ty(4) + 4);
    else crate(c, x + 4, ty(4) + 4, 24, 20);
    if (lv >= 3) img(c, K.keyboard(), x - 2, ty(5) - 2);
    else if (lv >= 1) { A.blob(c, x + 16, ty(5) + 14, 14, 10, ['outline', 'olive_dark', 'olive', 'olive_hi'], { bias: 0 }); A.line(c, 'olive_dark', x + 6, ty(5) + 12, x + 26, ty(5) + 16); } // a tarp over something
    else { A.blob(c, x + 16, ty(5) + 18, 12, 6, ['outline', 'stone_dark', 'stone', 'fog_mid'], {}); }
  }

  // Props drawn with the people in order of their feet: the mirror, the CRT, the chair, the
  // lamp, the bed, the plant (or what stands in their place before the stage that brings them).
  function makeProps(lv) {
    var list = [], g;
    function add(key, w, h, fn, x, y, foot) { list.push({ img: G.gfx.bake.cached('cabin56:' + key + ':' + lv, function () { return G.gfx.bake.layer(w, h, fn); }), x: x, y: y, foot: foot }); }
    // The mirror on a coat stand: the glass catches the window (cracked while derelict).
    add('mirror', 28, 52, function (c) {
      var g2 = X.grid(28, 52);
      g2.rect('wood_dark', 13, 6, 3, 44); g2.rect('wood_mid', 13, 6, 1, 44);
      g2.ell(14.5, 49.5, 8, 2, WOOD, {});
      g2.cap(14, 6, 5, 12, 1, WOOD, 0); g2.cap(15, 6, 24, 12, 1, WOOD, 0);
      g2.ell(5, 14, 4, 5, lv >= 1 ? ['brick_dark', 'brick', 'brick_hi'] : ['stone_dark', 'stone', 'stone_hi'], { bias: 0.1 }); // a scarf or a rag
      g2.slab(7, 18, 15, 22, WOOD);
      g2.fill(9, 20, 11, 18, function (x, y) { return (x + y * 2) % 13 < 2 ? 'fog_light' : (y < 27 ? 'fog_mid' : 'fog_dark'); });
      if (lv < 1) { g2.line('ivory', 10, 22, 18, 34); g2.line('ivory', 18, 34, 14, 37); }
      if (lv >= 1) { g2.ell(22, 12, 4.4, 3, ['olive_dark', 'olive', 'olive_hi'], { bias: 0.1 }); g2.rect('olive_dark', 18, 13, 9, 1); } // a cap on the peg
      g2.outline('outline'); g2.paint(c, 0, 0);
    }, tx(1) + 2, ty(7) - 54, ty(7) - 1);
    // The CRT and its console (stage 3), or a stack of boxes.
    if (lv >= 3) { var tv = K.crt(false); list.push({ img: tv.img, x: tx(7) - 1, y: ty(3) - 36, foot: ty(3) - 1, screen: [tx(7) - 1 + tv.sx, ty(3) - 36 + tv.sy, tv.sw, tv.sh] }); }
    else add('boxes', 30, 32, function (c) { crate(c, 1, 12, 28, 19); crate(c, 5, 0, 20, 13); }, tx(7) + 1, ty(3) - 33, ty(3) - 1);
    // Phase 64: before the TV, the grey console on the floor (stage 3), or a box of cables.
    if (lv >= 3) list.push({ img: K.console90s(), x: tx(7) + 8, y: ty(3) + 4, foot: ty(3) + 14 });
    else add('cables', 22, 16, function (c) { crate(c, 1, 2, 20, 13); A.line(c, 'outline', 4, 2, 9, 0); A.line(c, 'outline', 9, 0, 15, 3); }, tx(7) + 5, ty(3) + 2, ty(3) + 16);
    // The box fan (stage 2) turning, or a crate; the fridge (dead and rusted while derelict).
    if (lv >= 2) list.push({ img: K.boxFan(), x: tx(5) + 5, y: ty(2) - 27, foot: ty(2) - 1, live: function (ctx, x, y) { K.fanBlades(ctx, x + 11, y + 11, t, fanOn); } });
    else add('crate5', 26, 22, function (c) { crate(c, 1, 1, 24, 20); }, tx(5) + 3, ty(2) - 23, ty(2) - 1);
    list.push({ img: G.gfx.bake.cached('cabin64:fridge' + (lv < 1 ? 'old' : ''), function () { return K.fridge(lv < 1); }), x: tx(9) + 3, y: ty(2) - 40, foot: ty(2) - 1 });
    // The side table by the chair: the lava lamp on it (stage 3), a candle in a jar (1-2), or a crate.
    add('side', 22, 26, function (c) {
      if (lv < 1) { crate(c, 2, 6, 18, 18); return; }
      var g2 = X.grid(22, 26);
      g2.ell(11, 6, 10, 4, ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit'], { bias: 0.1 });
      g2.rect('wood_dark', 10, 10, 3, 13); g2.rect('wood_mid', 10, 10, 1, 13); g2.ell(11, 23.5, 6, 1.6, WOOD, {});
      if (lv >= 3) { g2.slab(14, 3, 5, 3, ['paper_dark', 'paper', 'bone', 'cream']); g2.rect('stone_hi', 15, 4, 3, 1); } // a coaster and a note
      g2.outline('outline'); g2.paint(c, 0, 0);
    }, tx(6) + 5, ty(5) - 27, ty(5) - 1);
    var side = list[list.length - 1];
    if (lv >= 3) side.live = function (ctx, x, y) { K.lavaLamp(ctx, x + 8, y + 7, t, lavaOn, env.night); };
    else if (lv >= 1) side.live = function (ctx, x, y) {
      ctx.fillStyle = P.outline; ctx.fillRect(x + 6, y - 1, 6, 7); ctx.fillStyle = P.teal_dark; ctx.fillRect(x + 7, y, 4, 5); ctx.fillStyle = P.cream; ctx.fillRect(x + 8, y + 1, 2, 3);
      var fl = (Math.floor(t * 9) * 7) % 3; ctx.fillStyle = P.lamp_glow; ctx.fillRect(x + 8 + (fl === 2 ? 1 : 0), y - 2 - (fl ? 1 : 0), 1, 2); ctx.fillStyle = P.flame; ctx.fillRect(x + 8, y - 1, 1, 1);
    };
    // The armchair from behind (stage 2), facing the CRT; before it an upturned bucket as a seat.
    if (lv >= 2) add('chair', 32, 34, function (c) {
      var g2 = X.grid(32, 34), CH = lv >= 4 ? ['teal_dark', 'teal', 'teal_hi', 'teal_lit'] : ['orange_dark', 'orange', 'orange_hi', 'orange_lit'];
      g2.ell(5, 21, 4.4, 9, CH, { bias: 0.1 }); g2.ell(27, 21, 4.4, 9, CH, { bias: -0.1 });                  // the arms
      g2.poly([[5, 4], [27, 4], [28, 30], [4, 30]], function (x, y) { return tone(CH, 0.6 - (x - 4) / 24 * 0.35 - (y - 4) / 26 * 0.2 + (((x - 4) % 6) === 0 ? -0.15 : 0)); }); // corduroy
      g2.ell(16, 5, 11, 3, CH, { bias: 0.2 });
      g2.rect('wood_deep', 5, 31, 3, 3); g2.rect('wood_deep', 24, 31, 3, 3);
      if (lv >= 4) g2.fill(6, 2, 14, 12, function (x, y) { return y - 2 > 9 + Math.sin(x * 0.7) * 2 ? '' : (((x >> 2) + (y >> 2)) % 2 ? 'rug_hi' : 'cream'); }); // the quilt over its back
      g2.outline('outline'); g2.paint(c, 0, 0);
    }, tx(7), ty(5) - 36, ty(5) - 1);
    else add('bucket', 20, 18, function (c) { var g2 = X.grid(20, 18); g2.poly([[2, 2], [18, 2], [16, 17], [4, 17]], function (x) { return tone(['stone_dark', 'stone', 'stone_hi', 'stone_lit'], 0.8 - (x - 2) / 16 * 0.7); }); g2.rect('stone_lit', 2, 2, 16, 1); g2.outline('outline'); g2.paint(c, 0, 0); }, tx(7) + 6, ty(5) - 20, ty(5) - 1);
    // The floor lamp (stage 3), or a stack of paint tins.
    if (lv >= 3) add('lamp', 14, 54, function (c) { c.drawImage(K.floorLamp(), 0, 0); }, tx(8) + 9, ty(5) - 56, ty(5) - 2);
    else add('tins', 22, 20, function (c) { var g2 = X.grid(22, 20); g2.slab(1, 8, 10, 11, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); g2.slab(11, 10, 10, 9, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); g2.slab(5, 0, 10, 9, ['outline', 'chrome_dark', 'chrome', 'chrome_hi']); g2.rect('mustard', 1, 12, 10, 2); g2.rect('olive', 11, 13, 10, 2); g2.paint(c, 0, 0); }, tx(8) + 5, ty(5) - 22, ty(5) - 2);
    // The bed: a sleeping bag on a pallet, a cot, then a bed with a headboard and a quilt.
    add('bed', 64, 72, function (c) {
      var g2 = X.grid(64, 72), i;
      if (lv < 1) {
        g2.slab(2, 22, 60, 46, WOOD); for (i = 0; i < 5; i++) g2.rect('outline', 3, 30 + i * 8, 58, 1);
        g2.ell(32, 44, 22, 16, ['olive_dark', 'olive', 'olive_hi', 'olive_lit'], { bias: 0.05 }); g2.line('olive_dark', 18, 38, 46, 52); g2.ell(30, 30, 6, 3, ['stone_dark', 'stone', 'stone_hi'], {});
      } else {
        var HB = lv >= 4 ? ['outline', 'wood_dark', 'wood_mid', 'wood_hi', 'wood_lit'] : ['outline', 'chrome_dark', 'chrome', 'chrome_hi'];
        g2.slab(2, 0, 60, lv >= 4 ? 20 : 12, HB); if (lv >= 4) for (i = 0; i < 6; i++) g2.rect('wood_dark', 8 + i * 9, 4, 2, 13);
        g2.slab(3, 12, 58, 52, ['outline', 'paper_dark', 'paper', 'bone', 'ivory']);                        // the mattress
        g2.ell(18, 19, 11, 5, ['paper_dark', 'bone', 'ivory', 'cream'], { bias: 0.15 }); g2.ell(46, 19, 11, 5, ['paper_dark', 'bone', 'ivory', 'cream'], { bias: 0.05 }); // pillows
        var QK = lv >= 4 ? null : ['lav_dark', 'lav', 'lav_hi'];
        g2.fill(3, 28, 58, 38, function (x, y) {
          if (QK) return tone(QK, 0.7 - (x - 3) / 58 * 0.4 - (y === 28 ? -0.3 : 0) + ((x + y) % 9 === 0 ? -0.2 : 0));
          var q = (((x - 3) / 8) | 0) + (((y - 28) / 8) | 0), e = (x - 3) % 8 === 0 || (y - 28) % 8 === 0;
          return e ? 'paper_dark' : ['rug_hi', 'cream', 'mustard_hi', 'teal_hi', 'pink_hi', 'cream'][q % 6];
        });
        g2.rect('outline', 3, 65, 58, 1); g2.slab(3, 64, 58, 6, ['outline', 'wood_dark', 'wood', 'wood_mid']);
        if (lv >= 2) { g2.slab(40, 40, 14, 9, ['paper_dark', 'paper_dark', 'paper', 'ivory']); g2.rect('stone_hi', 42, 43, 9, 1); } // a book left open
      }
      g2.outline('outline'); g2.paint(c, 0, 0);
    }, tx(9), ty(4) - 6, ty(6) - 1);
    // A plant (stage 2) or a bucket under the drip (before the roof is fixed... still dripping at 1).
    if (lv >= 2) add('plant', 28, 42, function (c) { c.drawImage(K.plant('monstera', lv >= 4 ? ['mustard_dark', 'mustard', 'mustard_hi', 'mustard_lit'] : ['brick_dark', 'brick', 'brick_hi', 'orange_hi']), 0, 2); }, tx(10) + 2, ty(7) - 44, ty(7) - 1);
    else add('drip', 22, 20, function (c) { var g2 = X.grid(22, 20); g2.poly([[2, 4], [20, 4], [18, 19], [4, 19]], function (x) { return tone(['rust_dark', 'rust', 'rust_hi'], 0.9 - (x - 2) / 18 * 0.8); }); g2.ell(11, 4.5, 8.5, 1.6, ['water_deep', 'water_dark', 'water_mid'], {}); g2.outline('outline'); g2.paint(c, 0, 0); }, tx(10) + 5, ty(7) - 22, ty(7) - 1);
    return list;
  }

  // ---- The overlay (in front of the glass): mullions, the board across a broken pane,
  // curtains, a plant on the sill.
  function paintFront(c, lv) {
    K.windowFront(c, GL[0], GL[1], GL[2], GL[3], true);
    if (lv < 1) { A.slab(c, GL[0] - 6, GL[1] + 14, GL[2] + 12, 6, ['outline', 'wood_dark', 'wood', 'wood_mid']); A.px(c, 'chrome_hi', GL[0] - 3, GL[1] + 16); A.px(c, 'chrome_hi', GL[0] + GL[2] + 2, GL[1] + 16); A.line(c, 'fog_light', GL[0] + 4, GL[1] + 2, GL[0] + 14, GL[1] + 12); A.line(c, 'fog_light', GL[0] + 14, GL[1] + 12, GL[0] + 11, GL[1] + 22); }
    if (lv >= 2) c.drawImage(K.plant('trail', ['orange_dark', 'orange', 'orange_hi', 'orange_lit']), GL[0] + 2, TOP - 22);
    if (lv >= 4) for (var side = 0; side < 2; side++) {
      var cx = side ? GL[0] + GL[2] - 4 : GL[0] - 10;
      A.area(c, cx, GL[1] - 6, 14, GL[3] + 16, function (x, y) { var f = (x - cx + ((y >> 3) & 1)) % 4; return f === 0 ? 'pink_dark' : (f === 1 ? 'pink_hi' : 'pink'); });
      A.slab(c, cx - 2, GL[1] - 8, 18, 3, BRASS);
    }
    A.reset();
  }

  // ---- State ----------------------------------------------------------------------------------
  var level = -1, t = 0, base = null, front = null, props = null, mask = null, screenR = null;
  var mounted = [];   // {spIdx, img, flipImg, name, len}, decided in enter()
  var turned = [];    // per mounted trophy: faces the door; decided in enter() only
  var order = [];
  var stored = 0, walk = null, faced = '', held = [], txt = { title: '', next: '', stored: '', coins: '' }, lastCoins = -1, coin = null;
  var open = '', lines = [], tvOn = false, recordT = -1, chordN = 0, tvT = 0, fanOn = true, lavaOn = true;
  var env = { hour: 0, night: 0, grey: 0, rain: 0, fog: 0, strange: '', st: 0, flash: 0 };
  var BOX = { x: 24, y: 296, w: 592, h: 56 }, HEAD = { x: 120, y: 316, w: 400, h: 40 };
  var R_BOX = [[BOX.x, BOX.y - 13, BOX.w, BOX.h + 13]], R_HEAD = [[HEAD.x, HEAD.y - 13, HEAD.w, HEAD.h]]; // 8.4 #38

  function bakeRoom() {
    var lv = G.state.save.cabinLevel, st = G.data.gear.cabin[lv];
    level = lv;
    base = G.gfx.bake.cached('cabin56:' + lv, function () { return G.gfx.bake.layer(W, RH, function (c) { paintBase(c, lv, st.plaques); }); });
    front = G.gfx.bake.cached('cabin56f:' + lv, function () { return G.gfx.bake.layer(W, RH, function (c) { paintFront(c, lv); }); });
    props = makeProps(lv); screenR = null;
    for (var i = 0; i < props.length; i++) if (props[i].screen) screenR = props[i].screen;
    var pools = [];
    if (lv >= 2) pools.push({ x: STOVE[0], y: STOVE[1] + 30, r: 120 });
    if (lv >= 3) pools.push({ x: LAMPP[0], y: LAMPP[1], r: 110 });
    if (lv === 1) pools.push({ x: tx(2) + 20, y: ty(1) + 10, r: 70 });
    if (lv >= 3 && screenR) pools.push({ x: screenR[0] + 8, y: screenR[1] + 30, r: 40 });
    if (!pools.length) pools.push({ x: GL[0] + GL[2] / 2, y: ty(2), r: 60, sx: 1 });
    mask = K.nightMask(W, RH, pools, function (x, y) { return x >= GL[0] && x < GL[0] + GL[2] && y >= GL[1] && y < GL[1] + GL[3]; });
    if (!coin) coin = G.gfx.bake.layer(8, 8, function (c) { A.reset(); A.blob(c, 4, 4, 3.6, 3.6, BRASS, { bias: 0.1, rim: 0 }); box(c, 'rust', 3, 3, 2, 2); px(c, 'brass_hi', 2, 2); });
  }

  function texts() {
    var save = G.state.save, stages = G.data.gear.cabin, next = stages[save.cabinLevel + 1];
    txt.title = 'THE CABIN: ' + stages[save.cabinLevel].name.toUpperCase();
    txt.next = next ? 'Next: ' + next.name + ' ' + next.cost + 'c' : 'Fully restored.';
    txt.stored = stored > 0 ? '+' + stored + ' in the icebox' : '';
  }

  function speciesIndex(id) {
    for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) return i;
    return -1;
  }

  // Everything that must not change while the trophies are visible is decided here.
  function enter() {
    var save = G.state.save, kept = save.kept, cap = G.data.gear.cabin[save.cabinLevel].plaques, i, j;
    bakeRoom();
    t = 0; open = ''; faced = ''; held.length = 0; tvOn = false; recordT = -1; fanOn = true; lavaOn = true;
    walk = WK.create();
    R.prebake('fisher'); R.prebake('dog');                                          // so no step bakes a frame
    order.length = 0;
    var ord = [];
    for (i = 0; i < kept.length; i++) if (speciesIndex(kept[i].id) >= 0) ord.push(i);
    ord.sort(function (a, b) { return kept[b].w - kept[a].w || a - b; });
    mounted.length = 0; turned.length = 0;
    for (i = 0; i < ord.length && i < cap; i++) {
      var k = kept[ord[i]], sp = speciesIndex(k.id);
      mounted.push({ spIdx: sp, img: G.gfx.fishgen.portrait(sp, PLQ_W - 6, PLQ_H - 8, false), flipImg: G.gfx.fishgen.portraitFlipped(sp, PLQ_W - 6, PLQ_H - 8), name: G.data.fish[sp].name, len: Math.round(k.len) + ' cm' });
      turned.push(false);
    }
    stored = ord.length - mounted.length;
    // How many face the door follows unease; which ones is a visual choice (G.vrng).
    var u = G.state.run.loc ? G.sim.unease.get(save, G.state.run.loc) : 0, n = Math.round(u * mounted.length);
    for (i = 0; i < n; i++) {
      do { j = G.vrng.int(0, mounted.length - 1); } while (turned[j]);
      turned[j] = true;
    }
    texts();
  }

  function exit() {}

  function restore() {
    var r = G.sim.economy.restoreCabin(G.state.save, G.data), msg;
    if (r === G.sim.economy.OK) {
      G.core.save.autosave('purchase');
      bakeRoom();
      msg = 'Done: ' + G.data.gear.cabin[G.state.save.cabinLevel].name + '. New plaques; the fish go up next time you come in.';
    } else msg = r === G.sim.economy.POOR ? 'Not enough coins.' : 'Nothing left to fix.';
    texts();
    say(msg);
    return r;
  }

  function say(s) { lines = F.wrap(s, BOX.w - 32); open = 'box'; }

  // What Space does facing each thing.
  function use(what) {
    var lv = level, next = G.data.gear.cabin[lv + 1], i;
    if (what === 'bench') {
      if (!next) { say('The ledger is all ticked off. Nothing left to fix.'); return; }
      lines = F.wrap('The ledger: ' + next.name + ', ' + next.cost + ' coins. You have ' + G.state.save.coins + '.', BOX.w - 32);
      open = 'restore'; return;
    }
    if (what === 'mirror') { G.ui.menu.open('look', 'cabin'); return; }
    if (what === 'plaques') {
      var c = walk.c - PLQ0, a = mounted[c], b = mounted[c + PCOLS], cap = G.data.gear.cabin[lv].plaques, s;
      if (c < 0 || c >= PCOLS) return;
      if (!a && !b) s = c < cap ? 'Empty plaques. Keep a fish to hang one.' : 'Bare logs. More plaques come with the next repair.';
      else s = (a ? a.name + ', ' + a.len + '.' : '') + (b ? '  ' + b.name + ', ' + b.len + '.' : '') + (stored > 0 ? '  ' + stored + ' more in the icebox.' : '');
      say(s); return;
    }
    if (what === 'guitar') { G.audio.engine.cue('strum', 0, chordN++ % 4); if (lv < 2) say('A chord. Two strings are dead and the rest are flat.'); return; }
    if (what === 'keys') { if (lv < 3) { say(lv < 1 ? 'Junk. Someday.' : 'Something under a tarp. Not yet.'); return; } G.audio.engine.cue('keys', 0, chordN++ % 4); return; }
    if (what === 'records') { if (lv < 3) { say(lv < 1 ? 'A heap of junk.' : 'Crates of old records. Nothing to play them on yet.'); return; } if (recordT < 0) { recordT = t; G.audio.engine.cue('record'); } else recordT = -1; return; }
    if (what === 'tv') { if (lv < 3) { say('Boxes.'); return; } tvOn = !tvOn; tvT = t; return; }
    // Phase 64.
    if (what === 'fan') { if (lv < 2) { say('A crate of something heavy.'); return; } fanOn = !fanOn; return; }
    if (what === 'lava') { if (lv < 1) { say('An upturned crate.'); return; } if (lv < 3) { say('A candle in a jam jar. It gutters when you breathe.'); return; } lavaOn = !lavaOn; return; }
    if (what === 'fridge') { say(lv < 1 ? 'The fridge is dead. Something in it was food once.' : ['Cold beer, eggs, a jar of something pickled. The motor shudders and holds.', 'A note on the door in your handwriting: CHECK THE PIER. You do not remember writing it.'][chordN++ % 2]); return; }
    if (what === 'stove') { say(lv < 2 ? 'Cold, and rusted through at the pipe.' : 'The fire ticks and settles. Warm.'); return; }
    if (what === 'chair') { say(lv < 2 ? 'An upturned bucket. It holds.' : 'The chair still keeps the shape of whoever sat in it.'); return; }
    if (what === 'bed') { say(['A sleeping bag on a pallet. The floor breathes cold.', 'A cot. You lie down a minute.', 'You lie down a minute. The stove ticks.', 'You lie down a minute. The lamp hums.', 'You lie down a minute under the quilt. Outside, the lake.'][lv]); return; }
  }

  function envStep(dt) {
    var save = G.state.save, sc = G.scene.sailing, Lt = sc.light(G.sim.clock.wrap(save.clock));
    env.hour = save.clock; env.night = Lt.night; env.grey = Lt.grey;
    sc.stormTick(dt);
    env.rain = sc.rain(); env.fog = sc.fogAlpha(); env.flash = sc.flash();
  }

  function update(dt) {
    var inp = G.core.input;
    t += dt;
    G.sim.clock.step(G.state.save, null, dt, G.rng, G.data);
    envStep(dt);
    if (recordT >= 0 && t - recordT > 9) recordT = -1;                               // the side ends
    if (open) {
      if (inp.pressed('map')) { open = ''; return; }
      if (inp.pressed('back')) { open = ''; return; }
      if (inp.pressed('action')) { if (open === 'restore') restore(); else open = ''; }
      return;
    }
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    var steps0 = walk.steps;
    WK.step(walk, dt, R.heldDir(inp, held));
    if (walk.exit) { G.core.state.change('sailing'); return; }
    if (walk.steps !== steps0) G.audio.engine.cue('step');
    faced = WK.facing(walk);
    if (inp.pressed('action') && faced) use(faced);
  }

  // ---- Drawing --------------------------------------------------------------------------------
  // The fire in the stove's window (stage 2 on): tongues that rise and fall ten times a second,
  // embers below. All from the scene's time.
  function drawFire(ctx, x, y) {
    var tq = Math.floor(t * 10) / 10, k, r;
    ctx.fillStyle = P.rust_dark; ctx.fillRect(x, y + 6, 14, 2);
    for (k = 0; k < 4; k++) {
      var h = 5 + Math.round(2 * Math.sin(tq * 5.3 + k * 1.9) + Math.sin(tq * 9.1 + k)), cx = x + 2 + k * 3;
      for (r = 0; r < h; r++) {
        var w = Math.max(1, Math.round(2 * (1 - r / h)));
        ctx.fillStyle = P[r < 2 ? 'lamp_glow' : (r < 4 ? 'signal_amber' : 'flame')]; ctx.fillRect(cx - (w >> 1), y + 6 - r, w, 1);
      }
    }
    for (k = 0; k < 4; k++) { ctx.fillStyle = P[Math.sin(tq * 7 + k * 2.3) > 0 ? 'signal_amber' : 'rust_hi']; ctx.fillRect(x + 1 + k * 4, y + 7, 2, 1); }
  }

  function draw(ctx) {
    var save = G.state.save, ox = OX, oy = OY - TOP, i;
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(base, ox, oy);
    K.glass(ctx, ox + GL[0], oy + GL[1], GL[2], GL[3], env, t, 0);
    ctx.drawImage(front, ox, oy);
    if (level >= 2) drawFire(ctx, ox + tx(10) + 9, oy + ty(1) + 3);
    // The trophies on their plaques; turned ones face the door.
    for (i = 0; i < mounted.length; i++) {
      var m = mounted[i], im = turned[i] ? m.flipImg : m.img, cx = ox + plaqueX(i) + (PLQ_W >> 1), cy = oy + plaqueY(i) + 7;
      ctx.drawImage(im, cx - (im.width >> 1), cy - (im.height >> 1));
    }
    // The record turning, the CRT's screen.
    if (level >= 3) K.record(ctx, ox + tx(3) + 4, oy + ty(1) - 3, t, recordT >= 0);
    reflections(ctx, ox, oy);
    // Everything that stands, in order of its feet.
    var f = R.walkers(walk, T, ox, oy + TOP), fr = R.frames(walk);
    order.length = 0;
    for (i = 0; i < props.length; i++) order.push(props[i].foot, i);
    order.push(f[3] - oy, 101, f[1] - oy + 0.5, 102);
    for (var pass = 0; pass < order.length / 2; pass++) {
      var bi = -1, by = 1e9;
      for (i = 0; i < order.length; i += 2) if (order[i] < by) { by = order[i]; bi = i; }
      var id = order[bi + 1]; order[bi] = 1e9 + 1;
      if (id < 100) {
        ctx.drawImage(props[id].img, ox + props[id].x, oy + props[id].y);
        if (props[id].live) props[id].live(ctx, ox + props[id].x, oy + props[id].y);
        if (props[id].screen) {
          var s = props[id].screen;
          if (tvOn) K.console90sScreen(ctx, ox + s[0], oy + s[1], s[2], s[3], t - tvT);    // Phase 64: the console's boot, then its game
          else { ctx.fillStyle = P.crt_dark; ctx.fillRect(ox + s[0], oy + s[1], s[2], s[3]); }
          K.glare(ctx, ox + s[0], oy + s[1], s[2], s[3]);
        }
      }
      else if (id === 101) R.drawFigure(ctx, 'dog', walk.dog.face, fr[1], f[2], f[3]);
      else R.drawFigure(ctx, 'fisher', walk.face, fr[0], f[0], f[1]);
    }
    // A drip into the bucket while the roof leaks.
    if (level < 2) { var dp = (t * 0.55) % 1; ctx.fillStyle = P.water_foam; if (dp < 0.85) ctx.fillRect(ox + tx(10) + 16, oy + 8 + Math.floor(dp * dp * (ty(7) - 30)), 1, 2); else { ctx.fillRect(ox + tx(10) + 13, oy + ty(7) - 20, 1, 1); ctx.fillRect(ox + tx(10) + 19, oy + ty(7) - 20, 1, 1); } }
    // The dark, the lamps, the lights.
    if (env.night > 0.02) { ctx.globalAlpha = Math.min(1, env.night * (level < 1 ? 1.15 : 1)); ctx.drawImage(mask, ox, oy); ctx.globalAlpha = 1; }
    else if (env.grey > 0.02) { ctx.globalAlpha = 0.07 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(ox + T, oy + TOP + 2, W - 2 * T, RH - TOP - 2); ctx.globalAlpha = 1; }
    if (level >= 2 && env.night > 0.2) K.glow(ctx, ox + STOVE[0], oy + STOVE[1] + 4, 16, 'flame', (0.05 + 0.015 * Math.sin(Math.floor(t * 10) * 1.3)) * env.night);
    if (level >= 1 && env.night > 0.2) K.glow(ctx, ox + tx(2) + 20, oy + ty(1) - 6, 12, 'lamp_glow', 0.06 * env.night);
    if (level >= 1) { ctx.fillStyle = P[env.night > 0.3 ? 'lamp_glow' : 'rust_hi']; ctx.fillRect(ox + tx(2) + 18, oy + ty(1) - 8, 5, 4); }  // the lantern's flame
    if (level >= 3 && env.night > 0.3) K.glow(ctx, ox + LAMPP[0], oy + LAMPP[1] - 24, 15, 'lamp_glow', 0.06 * env.night);
    if (cable.length) { for (i = 0; i < cable.length; i++) { bp[i] = bp[i] || [0, 0]; bp[i][0] = ox + cable[i][0]; bp[i][1] = oy + cable[i][1]; } bp.length = cable.length; K.bulbs(ctx, bp, t, env.night); }
    if (env.flash > 0) { ctx.globalAlpha = 0.1 * env.flash; ctx.fillStyle = P.fog_light; ctx.fillRect(0, 0, 640, 360); ctx.globalAlpha = 1; }
    // The words: the cabin's stage, coins and next repair along the bottom; or a message.
    var U = G.ui.panel;
    if (open) {
      U.frame(ctx, BOX.x, BOX.y - U.TAB, BOX.w, BOX.h + U.TAB, open === 'restore' ? 'THE LEDGER' : 'CABIN');
      for (i = 0; i < lines.length && i < 2; i++) F.drawText(ctx, lines[i], BOX.x + 14, BOX.y + 10 + i * (F.LINE_H + 6), 'bone');
      var hx = BOX.x + 14, hy = BOX.y + BOX.h - U.PAD - U.KEY_H;
      if (open === 'restore') { hx += U.hint(ctx, 'SPACE', 'pay', hx, hy); U.hint(ctx, 'ESC', 'not now', hx, hy); }
      else U.hint(ctx, 'SPACE', 'ok', hx, hy);
      return;
    }
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '  ' + save.coins; }
    U.frame(ctx, HEAD.x, HEAD.y - U.TAB, HEAD.w, HEAD.h, txt.title, txt.coins, 'bone');
    ctx.drawImage(coin, U.asideX(HEAD.x, HEAD.w, txt.coins), HEAD.y - U.TAB + 4);
    var ty0 = HEAD.y + 2;
    F.drawText(ctx, txt.next, U.left(HEAD.x), ty0, 'signal_amber');
    if (txt.stored) F.drawText(ctx, txt.stored, HEAD.x + HEAD.w - U.PAD - F.measure(txt.stored), ty0, 'fog_light');
    var kx = U.left(HEAD.x), ky = HEAD.y + HEAD.h - U.TAB - U.KEY_H - 2;
    kx += U.hint(ctx, 'SPACE', !faced ? 'use' : ((level < 3 && (faced === 'tv' || faced === 'keys' || faced === 'records' || faced === 'lava')) || (level < 2 && (faced === 'chair' || faced === 'fan')) ? 'look' : HINT[faced] || 'use'), kx, ky);
    U.hint(ctx, 'ESC', 'leave', kx, ky);
  }
  // Phase 64: the varnished boards give back what is lit (the bench's lantern, the floor lamp,
  // the lava lamp, the TV on the rug), and the window's glass gives back the lamps at night.
  function reflections(ctx, ox, oy) {
    var n = env.night, lv = level;
    if (lv >= 1) K.reflect(ctx, ox + tx(2) + 20, oy + ty(2) + 2, 8, 22, 'lamp_glow', 0.16 * n, 0);
    if (lv >= 3) K.reflect(ctx, ox + LAMPP[0], oy + ty(5) - 1, 10, 26, 'lamp_glow', 0.2 * n, 0);
    if (lv >= 3 && lavaOn) K.reflect(ctx, ox + tx(6) + 13, oy + ty(5), 6, 14, 'neon_pink', 0.08 + 0.12 * n, 0);
    if (lv >= 3 && tvOn) K.reflect(ctx, ox + tx(7) + 15, oy + ty(3) + 15, 12, 18, 'crt_glow', 0.05 + 0.1 * n, 0);
    if (lv >= 2) K.reflect(ctx, ox + STOVE[0], oy + ty(1) + 24, 10, 8, 'flame', 0.18 * n, 0);
    K.glassLamps(ctx, ox + GL[0], oy + GL[1], GL[2], GL[3], lv >= 2 ? n : 0);
    // Moths at the floor lamp's shade.
    if (lv >= 3 && n > 0.4) { ctx.fillStyle = P.paper; for (var i = 0; i < 2; i++) { var a = t * (2.3 + i * 0.8) + i * 3; ctx.fillRect(Math.round(ox + LAMPP[0] + Math.cos(a) * (7 + i * 3)), Math.round(oy + LAMPP[1] - 24 + Math.sin(a * 1.6) * 4), 1 + (Math.floor(t * 12 + i) & 1), 1); } }
  }
  var bp = [];
  var WORD = { bench: 'FIX', mirror: 'LOOK', plaques: 'READ', guitar: 'PLAY', keys: 'PLAY', records: 'PLAY', tv: 'TV', stove: 'WARM', chair: 'SIT', bed: 'REST', fan: 'FAN', fridge: 'OPEN', lava: 'LAMP' }; // Phase 58
  var HINT = { bench: 'restore', mirror: 'fisher & dog', plaques: 'look', guitar: 'play', keys: 'play', records: 'play', tv: 'switch', stove: 'warm up', chair: 'sit', bed: 'rest', fan: 'switch', fridge: 'open', lava: 'switch' };

  return {
    native: true,
    enter: enter, exit: exit, update: update, draw: draw, restore: restore, use: use,
    // Phase 58: a panel is open over the room (the touch pad hides), and the touch action
    // button's word for what he faces (the hint's 'look' where it would say look).
    busy: function () { return open !== ''; },
    rects: function () { return open ? R_BOX : R_HEAD; }, // 8.4 #38: what the ESC key keeps off
    // Phase 59.2: a touch with the box open. A message: a tap on the box is Space (ok). The
    // ledger: only its SPACE hint pays and its ESC hint is not now, so a stray tap spends nothing.
    tap: function (gx, gy) {
      var U = G.ui.panel, onBox = gx >= BOX.x && gx < BOX.x + BOX.w && gy >= BOX.y - U.TAB && gy < BOX.y + BOX.h;
      if (!open) return '';
      if (open !== 'restore') return onBox ? 'action' : 'none';
      var hx = BOX.x + 14, hy = BOX.y + BOX.h - U.PAD - U.KEY_H, w = U.hintW('SPACE', 'pay');
      if (gy < hy - 2 || gy >= hy + U.KEY_H + 2) return 'none';
      if (gx >= hx && gx < hx + w) return 'action';
      if (gx >= hx + w && gx < hx + w + U.hintW('ESC', 'not now')) return 'back';
      return 'none';
    },
    word: function () {
      if (open !== '' || !walk || !faced) return '';
      if ((level < 3 && (faced === 'tv' || faced === 'keys' || faced === 'records' || faced === 'lava')) || (level < 2 && (faced === 'chair' || faced === 'fan'))) return 'LOOK';
      return WORD[faced] || 'USE';
    },
    // dbg: what is on the wall now; where he is and what he faces.
    state: function () { return { level: level, mounted: mounted.length, turned: turned.filter(Boolean).length, facing: turned.slice(), stored: stored, at: walk ? [walk.c, walk.r, walk.face] : null, faced: faced, open: open, tv: tvOn, record: recordT >= 0, blocked: WK.blocked().length }; },
    // Phase 64 (dbg.roomLife): the live things and their state.
    life: function () { var n = 0; for (var i = 0; i < (props || []).length; i++) if (props[i].live) n++; return { room: 'cabin', level: level, live: n, tv: tvOn ? (t - tvT < 5 ? 'booting' : 'game') : 'off', fan: level >= 2 ? (fanOn ? 'on' : 'off') : 'none', lava: level >= 3 ? (lavaOn ? 'on' : 'off') : 'none' }; },
    walkPath: function (path) { if (!walk) return 'not in the cabin'; var nb = WK.walkPath(walk, path || ''); faced = WK.facing(walk); return { c: walk.c, r: walk.r, face: walk.face, faced: faced, blocked: nb }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  if (G.core.state.sceneName() !== 'cabin') return 'cabin level ' + (G.state.save ? G.state.save.cabinLevel : '-');
  var s = G.ui.cabin.state();
  return 'cabin level ' + s.level + '  mounted ' + s.mounted + '  facing door ' + s.turned + '  icebox ' + s.stored + '  at ' + s.at + '  faces ' + (s.faced || '-');
});
