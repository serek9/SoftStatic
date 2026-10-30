var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop as a room (Phase 36, PLAN_SHOP.md): a little log room seen from above at a
// three-quarter angle, floating in black in the middle of the 640×360 view, as a building is
// in a retro Pokémon game, painted natively in the lake's keys under the pixel-art rules
// (8.3 #84: flat keys, no dithering, light that steps). The fisher walks it tile by tile
// (a tap turns, a hold walks), the dog follows a tile behind, and what he faces is what Space
// talks to. This file is the room, its sprites and the walk; js/ui/shop.js is the scene.
// Visual and input only: no randomness, nothing saved.
G.ui = G.ui || {};
G.ui.shopRoom = (function () {
  var A = G.gfx.paint, P = G.gfx.sprites.PALETTE;
  var T = 32, COLS = 12, ROWS = 8, W = COLS * T, H = ROWS * T, OX = (640 - W) >> 1, OY = (360 - H) >> 1;
  var STEP = 0.2, TURN = 0.09; // s a step takes; s a direction must be held after a turn before he walks

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
  // `talk` is the scene's: 'rusty' (the counter), or a shelf (Phase 38).
  var OBJECTS = [
    { id: 'rack', c: 1, r: 1, w: 2, h: 1, block: true, talk: 'rack' },        // rods, reels and lines
    { id: 'jar', c: 3, r: 1, w: 1, h: 1, block: true, talk: 'jar' },          // the low shelf and the unlabelled jar
    { id: 'gear', c: 6, r: 1, w: 1, h: 1, block: true, talk: 'gear' },        // lantern and depth finder
    { id: 'counter', c: 8, r: 2, w: 1, h: 2, block: true, talk: 'rusty' },
    { id: 'counter2', c: 9, r: 3, w: 2, h: 1, block: true, talk: 'rusty' },
    { id: 'behind', c: 8, r: 1, w: 3, h: 1, block: true, talk: '' },         // Rusty's side of the counter
    { id: 'behind2', c: 9, r: 2, w: 2, h: 1, block: true, talk: '' },
    { id: 'worms', c: 1, r: 3, w: 1, h: 1, block: true, talk: 'worms' },
    { id: 'crickets', c: 1, r: 4, w: 1, h: 1, block: true, talk: 'crickets' },
    { id: 'tank', c: 1, r: 5, w: 1, h: 1, block: true, talk: 'tank' }
  ];
  var DOOR = [6, 7], MAT = [6, 6], RUSTY = [9, 2], CLOCK = 7;
  var DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

  var blocked = [], talkAt = [];
  (function () {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = MAP[r][c];
      blocked[r * COLS + c] = !(ch === '.' || ch === 'r' || ch === 'm');
      talkAt[r * COLS + c] = '';
    }
    for (var i = 0; i < OBJECTS.length; i++) {
      var o = OBJECTS[i];
      for (var y = o.r; y < o.r + o.h; y++) for (var x = o.c; x < o.c + o.w; x++) {
        if (o.block) blocked[y * COLS + x] = true;
        talkAt[y * COLS + x] = o.talk;
      }
    }
  })();
  function isBlocked(c, r) { return c < 0 || r < 0 || c >= COLS || r >= ROWS || blocked[r * COLS + c]; }

  // ---- Painting ---------------------------------------------------------------------------
  var px = A.px, box = A.box;
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // Floor: planks running across, 8 px wide, a dark seam under each; now and then a lighter
  // board; a joint per board, staggered, with one nail beside it. Quiet, as a floor should be.
  function floorTile(c, x0, y0, tc, tr) {
    for (var row = 0; row < 4; row++) {
      var y = y0 + row * 8, light = hash(tr * 4 + row, (tc / 3) | 0) < 0.22;
      box(c, light ? 'wood_mid' : 'wood', x0, y, T, 7);
      box(c, 'wood_dark', x0, y + 7, T, 1);
      if (hash(tc * 4 + row, tr) < 0.45) {
        var j = Math.floor(hash(tc * 4 + row, tr + 9) * 24) + 4;
        box(c, 'wood_dark', x0 + j, y, 1, 7); px(c, 'wood_deep', x0 + j + 2, y + 3);
      }
    }
  }

  // The north wall's face: a dark top (the wall's thickness), then logs, 8 px each.
  function wallFace(c, x0, y0) {
    box(c, 'ink', x0, y0, T, 3); box(c, 'wood_deep', x0, y0 + 3, T, 3);
    for (var i = 0; i < 3; i++) {
      var y = y0 + 6 + i * 8 + (i === 2 ? 2 : 0), h = i === 2 ? 6 : 8;
      box(c, 'wood_dark', x0, y, T, h); box(c, 'wood', x0, y + 1, T, h - 3); box(c, 'wood_mid', x0, y + 1, T, 1); box(c, 'wood_deep', x0, y + h - 1, T, 1);
    }
    box(c, 'ink', x0, y0 + T - 2, T, 2);                                            // the shadow at its foot
  }

  // A window in the wall face: its frame and sill; the glass is painted live (the hour).
  function windowTile(c, x0, y0, left) {
    wallFace(c, x0, y0);
    var gx = x0 + (left ? 6 : 0), gw = T - 6;
    box(c, 'wood_deep', gx - 1, y0 + 6, gw + 1, 22);
    box(c, 'wood_hi', gx, y0 + 7, gw, 1);
    box(c, 'wood_mid', gx, y0 + 26, gw, 2);                                         // the sill
  }

  // Side and south walls: their tops, dark, lit along the edge toward the room.
  function wallTop(c, x0, y0, tc, tr) {
    box(c, 'wood_deep', x0, y0, T, T);
    box(c, 'ink', x0 + (tc === 0 ? 0 : T - 4), y0, 4, T);
    if (tc === 0) box(c, 'wood_dark', x0 + T - 3, y0, 3, T);
    else if (tc === COLS - 1) box(c, 'wood_dark', x0, y0, 3, T);
    if (tr === ROWS - 1) { box(c, 'wood_dark', x0, y0, T, 3); box(c, 'ink', x0, y0 + T - 4, T, 4); }
  }

  function doorTile(c, x0, y0) {
    box(c, 'wood_deep', x0, y0, T, T);
    box(c, 'wood_dark', x0 + 3, y0, T - 6, T - 6);                                  // the threshold
    box(c, 'night_deep', x0 + 3, y0 + T - 8, T - 6, 8);                              // the night outside
    box(c, 'fog_dark', x0 + 5, y0 + T - 6, T - 10, 2);
  }

  function matTile(c, x0, y0, tc, tr) {
    floorTile(c, x0, y0, tc, tr);
    box(c, 'rust_dark', x0 + 3, y0 + 6, T - 6, T - 10);
    for (var y = 0; y < T - 14; y += 3) box(c, 'rust', x0 + 5, y0 + 8 + y, T - 10, 1);
  }

  function rugTile(c, x0, y0, tc, tr) {
    floorTile(c, x0, y0, tc, tr);
    var l = MAP[tr][tc - 1] !== 'r', rr = MAP[tr][tc + 1] !== 'r', t = MAP[tr - 1][tc] !== 'r', b = MAP[tr + 1][tc] !== 'r';
    var ax = x0 + (l ? 4 : 0), ay = y0 + (t ? 4 : 0), aw = T - (l ? 4 : 0) - (rr ? 4 : 0), ah = T - (t ? 4 : 0) - (b ? 4 : 0);
    box(c, 'moss_dark', ax, ay, aw, ah);
    box(c, 'moss', ax + (l ? 3 : 0), ay + (t ? 3 : 0), aw - (l ? 3 : 0) - (rr ? 3 : 0), ah - (t ? 3 : 0) - (b ? 3 : 0));
    for (var y = ay + (t ? 6 : 2); y < ay + ah - 2; y += 6) box(c, 'reed', ax + (l ? 6 : 0), y, aw - (l ? 6 : 0) - (rr ? 6 : 0), 1);
  }

  // Objects, painted over the floor and up into the wall where they stand against it.
  function paintRack(c, x0, y0) {                                                    // a rod rack against the wall
    box(c, 'wood_deep', x0 + 2, y0 - 18, 60, 26); box(c, 'wood_dark', x0 + 3, y0 - 17, 58, 24);
    box(c, 'wood_mid', x0 + 2, y0 + 8, 60, 3); box(c, 'wood_dark', x0 + 2, y0 + 11, 60, 14); box(c, 'wood_deep', x0 + 2, y0 + 25, 60, 2);
    for (var i = 0; i < 4; i++) box(c, 'wood_deep', x0 + 10 + i * 13, y0 + 10, 4, 2);   // the slots the rods stand in (drawn live, 38.2)
    box(c, 'stone_dark', x0 + 8, y0 - 15, 48, 2);                                    // the bar they lean on
  }
  function paintJarShelf(c, x0, y0) {                                                // a low shelf under the window
    box(c, 'wood_deep', x0 + 2, y0 + 6, 28, 20); box(c, 'wood_mid', x0 + 2, y0 + 6, 28, 3); box(c, 'wood_dark', x0 + 3, y0 + 9, 26, 15);
    box(c, 'ink', x0 + 6, y0 - 2, 10, 10); box(c, 'teal_dark', x0 + 7, y0 - 1, 8, 8); box(c, 'teal', x0 + 8, y0, 4, 6); box(c, 'stone', x0 + 7, y0 - 2, 8, 2); // the jar
    box(c, 'ink', x0 + 19, y0 + 1, 8, 7); box(c, 'paper_dark', x0 + 20, y0 + 2, 6, 5);                                // a tin
  }
  function paintGearShelf(c, x0, y0) {                                               // a tall shelf between the windows
    box(c, 'wood_deep', x0 + 1, y0 - 22, 30, 48); box(c, 'wood_dark', x0 + 3, y0 - 20, 26, 44);
    for (var i = 0; i < 3; i++) box(c, 'wood_mid', x0 + 3, y0 - 8 + i * 12, 26, 2);
    // The lantern and the finder are drawn live (38.2: they leave the shelf when bought).
  }
  function paintCounter(c) {                                                         // an L: down by Rusty's left, then along
    var x0 = 8 * T, y0 = 2 * T;
    box(c, 'wood_deep', x0 + 4, y0 - 4, 24, 2 * T); box(c, 'wood_mid', x0 + 6, y0 - 2, 20, 2 * T - 14); box(c, 'wood_hi', x0 + 6, y0 - 2, 20, 2);
    var x1 = x0, y1 = 3 * T;
    box(c, 'wood_deep', x1 + 4, y1 - 4, 3 * T - 6, 26); box(c, 'wood_mid', x1 + 6, y1 - 2, 3 * T - 10, 12); box(c, 'wood_hi', x1 + 6, y1 - 2, 3 * T - 10, 2);
    box(c, 'wood_dark', x1 + 4, y1 + 10, 3 * T - 6, 14);                                                              // its front
    for (var i = 1; i < 6; i++) box(c, 'wood_deep', x1 + 4 + i * 15, y1 + 11, 1, 12);
    box(c, 'ink', x1 + 4, y1 + 22, 3 * T - 6, 3);
    box(c, 'stone_dark', x0 + 2 * T + 6, y1 - 1, 12, 8); box(c, 'stone', x0 + 2 * T + 7, y1, 10, 3);                  // the till
  }
  function paintBox(c, x0, y0, kind) {                                               // the bait by the west wall
    if (kind === 'worms') { box(c, 'wood_deep', x0 + 4, y0 + 4, 24, 22); box(c, 'wood', x0 + 6, y0 + 6, 20, 16); box(c, 'rock_dark', x0 + 8, y0 + 8, 16, 12); box(c, 'flesh', x0 + 11, y0 + 11, 5, 1); box(c, 'flesh', x0 + 15, y0 + 15, 6, 1); }
    if (kind === 'crickets') { box(c, 'wood_deep', x0 + 4, y0 + 4, 24, 22); box(c, 'reed', x0 + 6, y0 + 6, 20, 16); } // its mesh and crickets are live
    if (kind === 'tank') { box(c, 'ink', x0 + 3, y0 + 2, 26, 26); box(c, 'water_dark', x0 + 5, y0 + 4, 22, 20); box(c, 'water_mid', x0 + 5, y0 + 4, 22, 3); box(c, 'stone_hi', x0 + 5, y0 + 24, 22, 2); }
  }

  function paintRoom(c) {
    A.reset();
    for (var r = 0; r < ROWS; r++) for (var cc = 0; cc < COLS; cc++) {
      var ch = MAP[r][cc], x = cc * T, y = r * T;
      if (ch === 'w') wallFace(c, x, y);
      else if (ch === 'W') windowTile(c, x, y, MAP[r][cc - 1] !== 'W');
      else if (ch === 's') wallTop(c, x, y, cc, r);
      else if (ch === 'd') doorTile(c, x, y);
      else if (ch === 'm') matTile(c, x, y, cc, r);
      else if (ch === 'r') rugTile(c, x, y, cc, r);
      else floorTile(c, x, y, cc, r);
    }
    box(c, 'ink', CLOCK * T + 10, 8, 12, 12); box(c, 'paper', CLOCK * T + 11, 9, 10, 10); box(c, 'paper_dark', CLOCK * T + 11, 17, 10, 2); // the clock (its hands are live)
    paintRack(c, T, T); paintJarShelf(c, 3 * T, T); paintGearShelf(c, 6 * T, T); paintCounter(c);
    paintBox(c, T, 3 * T, 'worms'); paintBox(c, T, 4 * T, 'crickets'); paintBox(c, T, 5 * T, 'tank');
    A.reset();
  }

  // ---- Sprites ------------------------------------------------------------------------------
  // The fisher from above: the red cap, the green jacket, dark trousers; four facings, a
  // standing frame and two walking frames (the legs and arms swing). 32×32, feet at the bottom.
  var COAT = ['ink', 'coat_dark', 'coat', 'coat_hi'], SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'];
  function paintFisher(c, dir, fr) {
    var sw = fr === 1 ? 1 : (fr === 2 ? -1 : 0), side = dir === 'side';
    // Legs and boots.
    if (side) { box(c, 'stone_dark', 13 + sw * 2, 24, 3, 6); box(c, 'stone_dark', 17 - sw * 2, 24, 3, 6); box(c, 'ink', 13 + sw * 2, 29, 4, 2); box(c, 'ink', 17 - sw * 2, 29, 4, 2); }
    else { box(c, 'stone_dark', 12, 24 - Math.max(0, sw), 3, 6); box(c, 'stone_dark', 17, 24 - Math.max(0, -sw), 3, 6); box(c, 'ink', 12, 29 - Math.max(0, sw), 3, 2); box(c, 'ink', 17, 29 - Math.max(0, -sw), 3, 2); }
    // The jacket and arms.
    A.blob(c, 16, 19, side ? 5.5 : 7, 6.5, COAT, { bias: 0.05 });
    if (side) { A.limb(c, 16, 15, 16 + sw * 3, 23, 1.6, COAT, 0.1); A.blob(c, 16 + sw * 3, 23.5, 1.3, 1.3, SKIN); }
    else { box(c, 'coat_dark', 8, 16 + sw, 3, 8); box(c, 'coat_dark', 21, 16 - sw, 3, 8); A.blob(c, 9.5, 24.5 + sw, 1.4, 1.3, SKIN); A.blob(c, 22.5, 24.5 - sw, 1.4, 1.3, SKIN); }
    if (dir === 'down') box(c, 'coat_hi', 12, 14, 8, 1);
    // The head and the cap.
    A.blob(c, 16, 10, 5, 5, SKIN, { bias: 0.1 });
    if (dir === 'down') {
      A.blob(c, 16, 6.5, 5.5, 3.5, ['rust_dark', 'cap', 'rust_hi'], { bias: 0.1 });
      box(c, 'rust_dark', 10, 8, 12, 2);                                                  // the brim over his eyes
      px(c, 'ink', 14, 11); px(c, 'ink', 18, 11); box(c, 'skin_shadow', 14, 14, 4, 1);
    } else if (dir === 'up') {
      A.blob(c, 16, 8.5, 5.5, 5, ['rust_dark', 'cap', 'rust_hi'], { bias: 0.1 });
      box(c, 'stone_dark', 12, 13, 8, 2);                                                 // hair under the cap
    } else {
      A.blob(c, 15, 7, 5, 4, ['rust_dark', 'cap', 'rust_hi'], { bias: 0.1 });
      box(c, 'rust_dark', 17, 9, 6, 2);                                                   // the brim, forward
      px(c, 'ink', 19, 11); box(c, 'stone_dark', 11, 9, 2, 4); px(c, 'skin_shadow', 20, 13);
    }
  }

  // The dog from above, a yellow lab nearly a tile long: four facings, standing, a walking
  // frame and sitting.
  var DOGK = ['dog_dark', 'dog', 'dog_hi'];
  function paintDog(c, dir, fr) {
    var sit = fr === 3, sw = fr === 1 ? 1 : 0;
    if (dir === 'side') {
      if (!sit) {
        box(c, 'dog_dark', 6 + sw * 2, 22, 3, 8); box(c, 'dog_dark', 19 - sw * 2, 22, 3, 8);   // the far legs
        A.blob(c, 13, 19, 10, 5.5, DOGK, { bias: 0.1 });
        box(c, 'dog', 8 - sw, 23, 3, 7); box(c, 'dog', 17 + sw, 23, 3, 7);                     // the near legs
        box(c, 'dog_dark', 1, 16 - sw, 4, 3);                                                   // the tail
        A.blob(c, 25, 14, 5, 4.5, DOGK, { bias: 0.15 }); box(c, 'dog_hi', 27, 16, 4, 3); px(c, 'ink', 31, 16); px(c, 'ink', 26, 12);
        box(c, 'dog_dark', 22, 12, 3, 6);                                                       // the ear
      } else {
        A.blob(c, 13, 22, 7, 6.5, DOGK, { bias: 0.1 }); box(c, 'dog', 17, 23, 3, 7); box(c, 'dog_dark', 6, 27, 6, 3);
        A.blob(c, 20, 12, 5, 4.5, DOGK, { bias: 0.15 }); box(c, 'dog_hi', 22, 14, 4, 3); px(c, 'ink', 26, 14); px(c, 'ink', 21, 10);
        box(c, 'dog_dark', 17, 10, 3, 6);
      }
    } else {
      var down = dir === 'down';
      if (!sit) { box(c, 'dog_dark', 9, 11 + sw * 2, 3, 6); box(c, 'dog_dark', 20, 11 - sw * 2, 3, 6); box(c, 'dog_dark', 9, 23 - sw * 2, 3, 6); box(c, 'dog_dark', 20, 23 + sw * 2, 3, 6); }
      A.blob(c, 16, sit ? 21 : 18, 6.5, sit ? 7 : 10, DOGK, { bias: 0.1 });
      var hy = down ? (sit ? 15 : 27) : (sit ? 13 : 7);
      A.blob(c, 16, hy, 5, 4.5, DOGK, { bias: 0.15 });
      box(c, 'dog_dark', 10, hy - 2, 3, 5); box(c, 'dog_dark', 19, hy - 2, 3, 5);                // the ears
      if (down) { px(c, 'ink', 14, hy); px(c, 'ink', 18, hy); box(c, 'ink', 15, hy + 3, 2, 1); }
      else if (!sit) box(c, 'dog_dark', 15, 28, 2, 4);                                            // the tail
    }
  }

  // Rusty from above (Phase 37), old, worn down to the game's mood: a pale canvas jacket, a
  // white beard, a paper-coloured cap. Facing down or left (toward whoever is at his counter);
  // frames 0 standing, 1 blinking, 2 a sip from his cup, 3 reading the paper.
  var CANV = ['reed', 'reed_hi', 'paper_dark', 'paper'], RSKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], BEARD = ['stone_hi', 'birch', 'bone'];
  var RCAP = ['reed', 'paper_dark', 'paper', 'bone'];
  function paintRusty(c, dir, fr) {
    var side = dir === 'side';
    if (dir === 'up') {                                                                // his back (39.3: facing the wall)
      A.blob(c, 16, 22, 8.5, 7, CANV, { bias: 0.05 });
      A.blob(c, 16, 11, 5, 5, RSKIN, { bias: 0.1 }); box(c, 'stone_hi', 12, 13, 8, 3);
      A.blob(c, 16, 9, 5.5, 4.5, RCAP, { bias: 0.1 });
      return;
    }
    A.blob(c, 16, 22, side ? 6.5 : 8.5, 7, CANV, { bias: 0.05 });
    box(c, 'reed', 15, 17, 2, 10);                                                     // the jacket's opening
    if (fr === 3) { box(c, 'ink', 7, 22, 18, 9); box(c, 'paper', 8, 23, 16, 7); box(c, 'paper_dark', 8, 25, 16, 1); box(c, 'paper_dark', 8, 27, 10, 1); } // the paper
    else if (fr === 2) { A.limb(c, side ? 18 : 21, 20, side ? 20 : 19, 14, 1.8, CANV, 0.1); box(c, 'ink', side ? 19 : 17, 10, 5, 5); box(c, 'cream', side ? 20 : 18, 11, 3, 3); } // the cup up
    else { A.blob(c, side ? 20 : 9, 27, 1.6, 1.4, RSKIN); if (!side) A.blob(c, 23, 27, 1.6, 1.4, RSKIN); }
    var hy = fr === 3 ? 12 : 11;
    A.blob(c, side ? 15 : 16, hy, 5, 5, RSKIN, { bias: 0.1 });
    if (side) {
      A.blob(c, 19, hy + 3, 3, 3, BEARD, { bias: 0.2 });
      A.blob(c, 14, hy - 4, 5, 3.5, RCAP, { bias: 0.1 }); box(c, 'reed', 17, hy - 2, 5, 2);
      if (fr !== 1 && fr !== 3) px(c, 'ink', 18, hy);
      box(c, 'stone_hi', 10, hy - 2, 2, 4);
    } else {
      A.blob(c, 16, hy + 3.5, 4, 3, BEARD, { bias: 0.2 });
      A.blob(c, 16, hy - 4, 5.5, 3.5, RCAP, { bias: 0.1 }); box(c, 'reed', 10, hy - 2, 12, 2);
      if (fr === 3) { /* reading: the cap's brim hides his eyes */ }
      else if (fr === 1) { box(c, 'skin_shadow', 13, hy, 2, 1); box(c, 'skin_shadow', 17, hy, 2, 1); }
      else { px(c, 'ink', 14, hy); px(c, 'ink', 18, hy); }
    }
  }

  var art = {};
  function sprite(kind, dir, fr) {
    var flip = dir === 'left', d = dir === 'left' || dir === 'right' ? 'side' : dir, key = kind + d + fr + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr), 'x'));
    return (art[key] = G.gfx.bake.layer(32, 32, function (c) { A.reset(); (kind === 'dog' ? paintDog : (kind === 'rusty' ? paintRusty : paintFisher))(c, d, fr); A.reset(); }));
  }

  // ---- The walk ---------------------------------------------------------------------------
  // st: {c, r (the tile he stands on or leaves), tc, tr (the tile he steps to), t (0..1 of
  // the step), face, turnT (s held since a turn), moving, dog: {c, r, tc, tr, face, sit}}.
  function create() {
    return { c: MAT[0], r: MAT[1], tc: MAT[0], tr: MAT[1], t: 1, face: 'up', turnT: 0, turned: false, moving: false, steps: 0,
      dog: { c: MAT[0] - 1, r: MAT[1], tc: MAT[0] - 1, tr: MAT[1], face: 'up', sit: true }, exit: false };
  }

  // dir: the direction held this step ('' none), tapped: a direction pressed this step (unused:
  // a press of a new direction turns him, and he walks once it has been held for TURN s).
  // Returns nothing; sets st.exit when he walks down off the mat through the door.
  function step(st, dt, dir, tapped) {
    var dg = st.dog;
    if (st.moving) {
      st.t += dt / STEP;
      if (st.t >= 1) { st.t = 1; st.moving = false; st.c = st.tc; st.r = st.tr; dg.c = dg.tc; dg.r = dg.tr; }
    }
    if (st.moving) return;
    if (!dir) { st.turnT = 0; st.turned = false; dg.sit = true; dg.face = faceTo(dg, st.c, st.r) || dg.face; return; }
    if (dir !== st.face) { st.face = dir; st.turnT = 0; st.turned = true; return; }     // a new direction turns him on the spot
    st.turnT += dt;
    if (st.turned && st.turnT < TURN) return;                                            // held a moment more, he walks
    st.turned = false;
    var nc = st.c + DIRS[dir][0], nr = st.r + DIRS[dir][1];
    if (st.c === MAT[0] && st.r === MAT[1] && dir === 'down') { st.exit = true; return; } // out through the door
    if (isBlocked(nc, nr)) return;
    // The dog takes the tile he leaves (unless it is already beside him and he walks onto it).
    var dc = st.c, dr = st.r;
    if (dg.c === nc && dg.r === nr) { dc = st.c; dr = st.r; }
    dg.tc = dc; dg.tr = dr; dg.face = faceTo(dg, dc, dr) || dg.face; dg.sit = false;
    st.tc = nc; st.tr = nr; st.t = 0; st.moving = true; st.steps++;
  }
  function faceTo(o, c, r) {
    var dx = c - o.c, dy = r - o.r;
    if (!dx && !dy) return '';
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  // What Space talks to: the object on the tile he faces ('' nothing).
  function facing(st) {
    if (st.moving) return '';
    var c = st.c + DIRS[st.face][0], r = st.r + DIRS[st.face][1];
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '';
    return talkAt[r * COLS + c];
  }

  // ---- Drawing ----------------------------------------------------------------------------
  var room = null, bakeMs = 0;
  function bake() {
    if (!room) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      room = G.gfx.bake.cached('shop:room38', function () { return G.gfx.bake.layer(W, H, paintRoom); });
      if (t0) bakeMs = performance.now() - t0;
    }
    return room;
  }
  function blockedList() { var o = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (isBlocked(c, r)) o.push([c, r]); return o; }

  // What the shelves hold (Phase 38): the rods not yet his on the rack (tiers above his own),
  // the lantern and the finder unless bought, and the minnows and crickets left this visit.
  var ROD_KEYS = ['stone_hi', 'wood_hi', 'rust_hi', 'moss_hi', 'bone'], shown = { rods: 0, lantern: false, finder: false, minnows: 0, crickets: 0 };
  function drawStock(ctx, stock, t) {
    var x0 = OX + T, y0 = OY + T, i, n = 0;
    for (i = 1; i < ROD_KEYS.length; i++) {
      if (i <= stock.rod) continue;
      var x = x0 + 11 + (i - 1) * 13;
      ctx.fillStyle = P.ink; ctx.fillRect(x, y0 - 16, 2, 28);
      ctx.fillStyle = P[ROD_KEYS[i]]; ctx.fillRect(x, y0 - 16, 1, 28);
      ctx.fillStyle = P.wood_lit; ctx.fillRect(x - 1, y0 + 4, 3, 6);
      ctx.fillStyle = P.stone_dark; ctx.fillRect(x + 2, y0 + 1, 1, 2);
      n++;
    }
    shown.rods = n;
    var gx = OX + 6 * T, gy = OY + T;
    shown.lantern = !stock.lantern; shown.finder = !stock.finder;
    if (shown.lantern) { ctx.fillStyle = P.stone_dark; ctx.fillRect(gx + 8, gy - 18, 8, 10); ctx.fillStyle = P.lamp_glow; ctx.fillRect(gx + 10, gy - 16, 4, 5); }
    if (shown.finder) { ctx.fillStyle = P.ink; ctx.fillRect(gx + 18, gy - 4, 9, 8); ctx.fillStyle = P.teal_dark; ctx.fillRect(gx + 19, gy - 3, 7, 5); ctx.fillStyle = P.neon_teal; ctx.fillRect(gx + 21, gy - 1, 1, 1); }
    // Minnows in the tank, swimming to and fro; crickets in the crate, now and then a hop.
    var tx = OX + T + 6, ty = OY + 5 * T + 8;
    shown.minnows = stock.minnows;
    ctx.fillStyle = P.water_hi;
    for (i = 0; i < stock.minnows; i++) {
      var ph = t * (0.35 + i * 0.07) + i * 1.7, u = (Math.sin(ph) + 1) / 2;
      ctx.fillRect(tx + Math.round(u * 15), ty + (i * 5) % 14, 3, 1);
    }
    var cx = OX + T + 6, cy = OY + 4 * T + 6;
    shown.crickets = stock.crickets;
    for (i = 0; i < stock.crickets; i++) {
      var hop = (t * 0.6 + i * 0.37) % 1 < 0.06 ? 1 : 0;
      ctx.fillStyle = P.ink; ctx.fillRect(cx + 2 + (i * 7) % 16, cy + 3 + ((i * 5) % 11) - hop, 2, 1);
    }
    ctx.fillStyle = P.reed_dark;
    for (i = 0; i < 4; i++) ctx.fillRect(cx + 1 + i * 5, cy + 1, 1, 14);                // the crate's slats over them
  }

  // ---- Light, life and the strange (Phase 39) -------------------------------------------
  // The windows show the lake at the hour: the sky in the lake's own keys (sailing.skyColor,
  // five bands, rebaked when the hour moves by 0.05), the far shore, the water, the fog over it
  // and drizzle on the glass. The room's light: at night the room darkens but for the lamp's
  // stepped pools (a mask baked once), by day a flat grey. Dust in the lamplight, bubbles in
  // the tank, steam from Rusty's cup. env: {hour, night, grey, rain, fog, strange, st} where
  // strange is '' or 'clock' | 'figure' and st its time 0..1.
  var FIGURE_WIN = 10, LAMP = [5.5 * T + 16, 3.4 * T], skyKey = -1, skyCss = ['', '', '', '', ''], skyOut = [0, 0, 0], mask = null;
  function refreshSky(hour) {
    var k = Math.floor(hour * 20);
    if (k === skyKey) return;
    skyKey = k;
    for (var i = 0; i < 5; i++) { G.scene.sailing.skyColor(hour, i / 5 * 0.9, skyOut); skyCss[i] = 'rgb(' + skyOut[0] + ',' + skyOut[1] + ',' + skyOut[2] + ')'; }
  }
  function bakeMask() {
    return G.gfx.bake.layer(W, H, function (c) {
      c.fillStyle = P.ink;
      for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) {
        if (y >= 8 && y < 26 && MAP[0][(x / T) | 0] === 'W') continue;                 // the glass keeps the dusk outside
        var dx = (x - LAMP[0]) / 1.15, dy = y - LAMP[1], d = Math.sqrt(dx * dx + dy * dy);
        var a = d < 46 ? 0 : (d < 78 ? 0.18 : (d < 118 ? 0.34 : 0.5));                // four steps, 2 px cells
        if (!a) continue;
        c.globalAlpha = a; c.fillRect(x, y, 2, 2);
      }
      c.globalAlpha = 1;
    });
  }
  function drawWindows(ctx, env, t) {
    refreshSky(env.hour);
    for (var c = 0; c < COLS; c++) {
      if (MAP[0][c] !== 'W') continue;
      var left = MAP[0][c - 1] !== 'W', gx = OX + c * T + (left ? 6 : 0), gw = T - 6, y0 = OY + 8;
      for (var i = 0; i < 5; i++) { ctx.fillStyle = skyCss[i]; ctx.fillRect(gx, y0 + i * 2, gw, 2); }
      ctx.fillStyle = P.mount_far; ctx.fillRect(gx, y0 + 10, gw, 2);                     // the far shore
      ctx.fillStyle = P.pine_dark; ctx.fillRect(gx, y0 + 11, gw, 1);
      ctx.fillStyle = P.water_deep; ctx.fillRect(gx, y0 + 12, gw, 6);                     // the water
      ctx.fillStyle = skyCss[4]; ctx.globalAlpha = 0.35; ctx.fillRect(gx, y0 + 13, gw, 1); ctx.globalAlpha = 1;
      if (env.strange === 'figure' && c === FIGURE_WIN) {                                 // 39.3: someone on the far shore, in one window
        ctx.globalAlpha = Math.min(1, Math.min(env.st, 1 - env.st) * 4) * 0.9; ctx.fillStyle = P.fog_mid; // pale: a dark one is lost against the night
        ctx.fillRect(gx + 12, y0 + 4, 2, 2); ctx.fillRect(gx + 11, y0 + 6, 4, 6); ctx.fillRect(gx + 11, y0 + 12, 1, 1); ctx.fillRect(gx + 14, y0 + 12, 1, 1);
        ctx.globalAlpha = 1;
      }
      if (env.fog > 0) { ctx.globalAlpha = Math.min(0.6, env.fog * 0.5); ctx.fillStyle = P.fog_mid; ctx.fillRect(gx, y0 + 8, gw, 8); ctx.globalAlpha = 1; }
      if (env.rain > 0.05) {                                                             // drizzle on the glass
        ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.5;
        var n = Math.round(env.rain * 6);
        for (i = 0; i < n; i++) { var u = (t * (0.7 + i * 0.13) + i * 0.29) % 1; ctx.fillRect(gx + (i * 7 + 3) % gw, y0 + Math.floor(u * 16), 1, 2); }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = P.wood_deep; ctx.fillRect(left ? gx + gw - 1 : gx, y0, 1, 18); ctx.fillRect(gx, y0 + 8, gw, 1); // the mullions
    }
  }
  // The clock at the game hour (the minute hand to the quarter and finer); 39.3 runs it back.
  function drawClock(ctx, env) {
    var cx = OX + CLOCK * T + 16, cy = OY + 14, back = env.strange === 'clock' ? env.st * 4 * Math.PI : 0;
    var ha = (((env.hour % 12) + 12) % 12) / 12 * 2 * Math.PI, ma = (env.hour % 1) * 2 * Math.PI - back, i;
    ctx.fillStyle = P.ink;
    for (i = 1; i <= 4; i++) ctx.fillRect(Math.round(cx + Math.sin(ma) * i), Math.round(cy - Math.cos(ma) * i), 1, 1);
    for (i = 1; i <= 2; i++) ctx.fillRect(Math.round(cx + Math.sin(ha) * i), Math.round(cy - Math.cos(ha) * i), 1, 1);
  }
  function drawLight(ctx, env, t, rusty) {
    if (env.night > 0.02) {
      if (!mask) mask = bakeMask();
      ctx.globalAlpha = env.night; ctx.drawImage(mask, OX, OY); ctx.globalAlpha = 1;
      // Dust drifting in the lamplight.
      ctx.fillStyle = P.fog_light; ctx.globalAlpha = 0.45 * env.night;
      for (var i = 0; i < 9; i++) {
        var a = t * (0.05 + i * 0.011) + i * 2.1, r = 10 + (i * 7) % 30;
        ctx.fillRect(Math.round(OX + LAMP[0] + Math.cos(a) * r * 1.1), Math.round(OY + LAMP[1] + Math.sin(a * 1.3) * r * 0.8), 1, 1);
      }
      ctx.globalAlpha = 1;
    } else if (env.grey > 0.02) { ctx.globalAlpha = 0.07 * env.grey; ctx.fillStyle = P.fog_mid; ctx.fillRect(OX, OY + 28, W, H - 28); ctx.globalAlpha = 1; } // below the glass and the clock
    // The lamp, hung over the rug: its shade and the bulb's glow (lit at night).
    var lx = OX + LAMP[0], ly = OY + LAMP[1] - 30;
    ctx.fillStyle = P.stone_dark; ctx.fillRect(lx, OY, 1, ly - OY); ctx.fillRect(lx - 5, ly, 11, 3);
    ctx.fillStyle = env.night > 0.3 ? P.lamp_glow : P.stone; ctx.fillRect(lx - 2, ly + 3, 5, 2);
    // The tank's bubbles; steam from Rusty's cup on the counter.
    ctx.fillStyle = P.water_foam;
    for (i = 0; i < 3; i++) { var u = (t * 0.5 + i / 3) % 1; ctx.fillRect(OX + T + 22 - i * 4, OY + 5 * T + 22 - Math.floor(u * 16), 1, 1); }
    var cx = OX + 9 * T + 22, cy = OY + 3 * T - 2;
    if (!rusty || rusty.fr !== 2) {
      ctx.fillStyle = P.ink; ctx.fillRect(cx - 1, cy - 1, 5, 4); ctx.fillStyle = P.cream; ctx.fillRect(cx, cy, 3, 2);
      ctx.fillStyle = P.fog_light;
      for (i = 0; i < 3; i++) { var v = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - v); ctx.fillRect(cx + 1 + Math.round(Math.sin(v * 6 + i)), cy - 2 - Math.floor(v * 9), 1, 1); }
      ctx.globalAlpha = 1;
    }
  }

  // Draws the room, the glass, Rusty behind his counter, the dog and the fisher, the one
  // further down the room in front. rusty: {face, fr} (Phase 37); stock: what the shelves hold
  // (38); env: the hour, the light and the strange (39).
  function draw(ctx, st, t, hour, rusty, stock, env) {
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, 640, 360);
    ctx.drawImage(bake(), OX, OY);
    if (env) { drawWindows(ctx, env, t); drawClock(ctx, env); }
    if (stock) drawStock(ctx, stock, t);
    if (rusty) ctx.drawImage(sprite('rusty', rusty.face, rusty.fr), OX + RUSTY[0] * T, OY + RUSTY[1] * T - 6);
    // The dog and the fisher, the one further down the room in front.
    var dg = st.dog, u = st.moving ? st.t : 1;
    var fx = OX + (st.c + (st.tc - st.c) * u) * T, fy = OY + (st.r + (st.tr - st.r) * u) * T - 6;
    var dx = OX + (dg.c + (dg.tc - dg.c) * u) * T, dy = OY + (dg.r + (dg.tr - dg.r) * u) * T - 2;
    var ffr = st.moving ? (st.steps & 1 ? 1 : 2) * (u > 0.25 && u < 0.75 ? 1 : 0) : 0;
    var dfr = dg.sit ? 3 : (st.moving && u > 0.25 && u < 0.75 ? 1 : 0);
    var fimg = sprite('fisher', st.face, ffr), dimg = sprite('dog', dg.face, dfr);
    if (dy > fy + 6) { ctx.drawImage(fimg, Math.round(fx), Math.round(fy)); ctx.drawImage(dimg, Math.round(dx), Math.round(dy)); }
    else { ctx.drawImage(dimg, Math.round(dx), Math.round(dy)); ctx.drawImage(fimg, Math.round(fx), Math.round(fy)); }
    if (env) drawLight(ctx, env, t, rusty);
  }

  return { T: T, COLS: COLS, ROWS: ROWS, OX: OX, OY: OY, STEP: STEP, MAP: MAP, OBJECTS: OBJECTS, DOOR: DOOR, MAT: MAT, RUSTY: RUSTY,
    create: create, step: step, facing: facing, isBlocked: isBlocked, draw: draw, bake: bake, sprite: sprite,
    bakeMs: function () { return bakeMs; }, blocked: blockedList, shown: function () { return shown; } };
})();
