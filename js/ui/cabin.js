var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The cabin (9.6, V9, V10.9): a worn lakeside cabin restored with coins, stage by stage
// (data/gear.js cabin), reached from the map. Kept fish are mounted on plaques, heaviest
// first; each stage adds plaques. Some trophies face the door when you come in; how many
// follows the unease of the water you came from (§2). That is decided in enter() and only
// there, so a trophy never turns while it is on screen (draw only reads `turned`).
// Phase 17: drawn at 640×360. A log-walled room: the door and a hat on the left, the
// plaques on the back wall over a fog window and an armchair, a stone fireplace on the
// right. Each stage changes the room: derelict (holes to the night, cobwebs, a cold hearth),
// patched, the fire lit (and animated), a rug and a floor lamp, then curtains, a quilt and a
// painting. Esc or M goes back out on the water. Phase 47: A (or a tap on the door, the left
// edge) opens the fisher-and-dog picker (G.ui.look) over the room.
G.ui = G.ui || {};
G.ui.cabin = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, M = G.ui.menu, B = G.gfx.bake, A = G.gfx.paint;
  var px = A.px, box = A.box, blob = A.blob, limb = A.limb, tone = A.tone, line = A.line, slab = A.slab, hash = A.hash2;
  var PLAQUE_W = 60, PLAQUE_H = 42, COLS = 5, PX0 = 166, PY0 = 68, PDX = 68, PDY = 50;
  var FIRE_X = 555, FIRE_Y = 288;

  // Plaque centre for slot i (two rows of five on the back wall).
  function slotX(i) { return PX0 + (i % COLS) * PDX; }
  function slotY(i) { return PY0 + Math.floor(i / COLS) * PDY; }

  // Ramps, dark to light.
  var WOOD = ['wood_deep', 'wood_dark', 'wood', 'wood_mid', 'wood_hi', 'wood_lit'];
  var STONE = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var CLOTH = ['teal_dark', 'teal', 'teal_hi', 'teal_lit'];
  var CREAM = ['paper_dark', 'paper', 'bone', 'cream'];
  var STRAW = ['reed', 'reed_hi', 'paper_dark', 'paper'];
  var BRASS = ['rust', 'leaf_gold', 'brass_hi'];
  var RUST = ['rust_dark', 'rust', 'rust_hi', 'flame'];
  var RUG = ['blood', 'crimson', 'rug_hi'];
  var PLUM = ['dusk_violet', 'dusk_plum', 'plum_hi', 'dusk_rose'];
  var MOSS = ['moss_dark', 'moss', 'moss_hi', 'moss_lit'];

  // How lit the room is at (x, y): cold blue-grey before the fire is lit, then warm from the
  // hearth (and from the lamp at stage 3). Read at the middle of each board segment, so the
  // light steps board by board instead of fading smoothly.
  function light(lv, x, y) {
    var L = 0.3;
    if (lv >= 2) { var d = Math.hypot((x - FIRE_X) / 260, (y - 250) / 200); L += Math.max(0, 1 - d) * 0.55; }
    if (lv >= 3) { var e = Math.hypot((x - 392) / 150, (y - 200) / 130); L += Math.max(0, 1 - e) * 0.3; }
    var w = Math.hypot((x - 300) / 150, (y - 190) / 110); L += Math.max(0, 1 - w) * 0.12; // the window
    return Math.min(1, L - (lv < 1 ? 0.1 : 0));
  }

  function paintWalls(c, lv) {
    // The back wall: horizontal logs, each with a lit top, a dark seam and grain strokes.
    A.area(c, 0, 14, 640, 278, function (x, y) {
      var row = ((y - 14) / 12) | 0, ly = (y - 14) % 12, seg = ((x + row * 37) / 48) | 0;
      var L = light(lv, seg * 48 + 24 - row * 37, row * 12 + 20);
      if (x < 128) L *= 0.62;                                   // the side wall, in shade
      var v = 0.08 + L * 0.8 + (hash(row, seg) - 0.5) * 0.08;
      if (ly === 0) v += 0.14;
      if (ly >= 10) return ly === 11 ? 'ink' : 'wood_deep';
      if ((ly === 4 || ly === 7) && hash(row * 7 + ly, (x / 19) | 0) < 0.45) v -= 0.12;
      if (((x + row * 37) % 48) === 0) return 'wood_deep';    // the log ends
      return tone(WOOD, v, x, y);
    });
    // The corner where the side wall meets the back, and the beam.
    box(c, 'ink', 127, 14, 2, 278); box(c, 'wood_deep', 129, 14, 2, 278);
    slab(c, 0, 0, 640, 14, WOOD); box(c, 'ink', 0, 14, 640, 1);
    // The floor: boards toward the viewer, darker at the front; a baseboard.
    A.area(c, 0, 292, 640, 68, function (x, y) {
      var r = y - 292, seam = r === 9 || r === 21 || r === 36 || r === 54;
      if (seam) return 'wood_deep';
      var cut = ((x + (r > 36 ? 83 : (r > 21 ? 41 : (r > 9 ? 17 : 0)))) % 120) === 0;
      if (cut) return 'wood_deep';
      return tone(WOOD, 0.15 + light(lv, ((x / 40) | 0) * 40 + 20, 300) * 0.55 - r / 260, x, y);
    });
    slab(c, 0, 286, 640, 6, WOOD); box(c, 'ink', 0, 292, 640, 1);
  }

  function door(c, lv) {
    slab(c, 16, 112, 92, 180, WOOD);
    A.area(c, 22, 118, 80, 174, function (x, y) {
      var bx = (x - 22) % 20;
      if (bx === 0) return 'wood_deep';
      return tone(WOOD, (lv >= 1 ? 0.5 : 0.35) + (bx === 1 ? 0.15 : 0) + (bx === 19 ? -0.15 : 0), x, y);
    });
    for (var y = 0; y < 3; y++) slab(c, 24, 150 + y * 56, 76, 5, WOOD);                 // braces
    box(c, 'ink', 41, 124, 42, 22); box(c, 'fog_dark', 42, 125, 40, 20); box(c, 'fog_mid', 42, 137, 40, 8); box(c, 'night_ink', 42, 141, 40, 4);
    box(c, 'fog_light', 46, 130, 10, 1); box(c, 'fog_light', 62, 134, 14, 1); box(c, 'wood_mid', 61, 125, 2, 20);
    blob(c, 92, 214, 3, 3, BRASS, { bias: 0.2 }); box(c, 'rust', 90, 220, 4, 6);
    // A hat on a peg above the door, rods leaning beside it.
    if (lv >= 1) {
      box(c, 'wood_deep', 58, 88, 3, 4);
      blob(c, 60, 100, 26, 5, STRAW, { bias: 0.05 }); blob(c, 60, 92, 13, 9, STRAW, { bias: 0.1 });
      box(c, 'rust', 48, 96, 25, 3); box(c, 'rust_hi', 48, 96, 25, 1);
    }
    for (var r = 0; r < (lv >= 1 ? 3 : 1); r++) {
      var rx = 108 + r * 6;
      line(c, r === 0 ? 'wood_hi' : 'wood_mid', rx, 290, rx + 5, 120 + r * 10); line(c, 'wood_dark', rx + 1, 290, rx + 6, 120 + r * 10);
      blob(c, rx + 1, 262, 3, 3, STONE, { bias: 0.1 }); box(c, 'paper_dark', rx - 1, 274, 3, 14);
    }
  }

  function windowView(c, lv) {
    var x0 = 236, y0 = 150, w = 128, h = 76, x, y;
    slab(c, x0 - 6, y0 - 6, w + 12, h + 12, WOOD);
    A.area(c, x0, y0, w, h, function (xx, yy) {
      var r = (yy - y0) / h;
      if (r > 0.74) return r > 0.86 ? 'night_ink' : 'water_dark';
      if (r > 0.6) return 'fog_dark';
      return tone(['night_deep', 'fog_dark', 'fog_mid'], 0.2 + r, xx, yy);
    });
    for (var i = 0; i < 7; i++) box(c, 'fog_light', x0 + 6 + (i * 37) % (w - 26), y0 + 10 + (i * 9) % 34, 8 + (i % 3) * 5, 1);   // drifting fog
    for (i = 0; i < 9; i++) box(c, 'pine_dark', x0 + (i * 15) % w, y0 + 44 - (i % 3) * 3, 4, 12 + (i % 3) * 3);                  // far pines
    box(c, 'water_hi', x0 + 40, y0 + 62, 30, 1); box(c, 'water_hi', x0 + 84, y0 + 66, 18, 1);
    slab(c, x0 + (w >> 1) - 2, y0, 4, h, WOOD); slab(c, x0, y0 + (h >> 1) - 2, w, 4, WOOD);
    if (lv < 1) { line(c, 'fog_light', x0 + 12, y0 + 4, x0 + 30, y0 + 26); line(c, 'fog_light', x0 + 30, y0 + 26, x0 + 26, y0 + 34); }  // cracked
    slab(c, x0 - 10, y0 + h + 6, w + 20, 6, WOOD);                                                        // the sill
    if (lv >= 1) { slab(c, x0 + 8, y0 + h - 4, 10, 10, CREAM); box(c, 'paper', x0 + 18, y0 + h, 3, 4); }   // a mug
    if (lv >= 2) { slab(c, x0 + w - 24, y0 + h, 14, 10, RUST); blob(c, x0 + w - 17, y0 + h - 6, 9, 7, MOSS, { bias: 0.05 }); } // a plant
    if (lv >= 4) for (var side = 0; side < 2; side++) {                                                    // curtains
      var cx = side ? x0 + w + 2 : x0 - 22;
      A.area(c, cx, y0 - 14, 20, h + 30, function (xx, yy) { var f = (xx - cx) % 5; return f === 0 ? 'dusk_violet' : (f === 1 ? 'plum_hi' : 'dusk_plum'); });
      box(c, 'brass_hi', cx, y0 - 14, 20, 2);
    }
    if (lv >= 4) slab(c, x0 - 26, y0 - 18, w + 52, 4, BRASS);
  }

  function fireplace(c, lv) {
    // Stones, each a shaded rounded block, mortar between.
    box(c, 'stone_dark', 468, 14, 172, 278);
    var rng = new G.core.rng.Rng(91);
    for (var y = 14; y < 292; y += 0) {
      var rh = rng.int(14, 22);
      for (var x = 468 + (rng.next() < 0.5 ? -10 : 0); x < 640;) {
        var rw = rng.int(22, 38), bx = x + 1, by = y + 1, bw = rw - 2, bh = rh - 2;
        var warm = lv >= 2 ? light(lv, bx + bw / 2, by + bh / 2) : 0.25;
        for (var yy = 0; yy < bh; yy++) for (var xx = 0; xx < bw; xx++) {
          var X = bx + xx, Y = by + yy;
          if (X < 468 || X >= 640 || Y >= 292) continue;
          var corner = (xx < 2 || xx > bw - 3) && (yy < 2 || yy > bh - 3);
          if (corner && (xx === 0 || xx === bw - 1 || yy === 0 || yy === bh - 1)) continue;
          var v = 0.25 + warm * 0.5 + (hash(bx, by) - 0.5) * 0.25 + (yy < 2 ? 0.2 : 0) + (xx < 2 ? 0.1 : 0) - (yy > bh - 3 ? 0.2 : 0);
          px(c, tone(STONE, v, X, Y), X, Y);
        }
        x += rw;
      }
      y += rh;
    }
    // The hearth: a dark arched opening, its floor, the logs.
    A.area(c, 496, 206, 118, 86, function (x, y) {
      var u = (x - 555) / 59, top = 206 + 26 * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
      if (y < top) return '';
      return y < top + 3 ? 'stone_dark' : (y > 284 ? 'wood_deep' : 'ink');
    });
    slab(c, 476, 290, 164, 12, STONE);
    limb(c, 524, 282, 586, 278, 5, ['wood_deep', 'wood_dark', 'wood'], 0.1); limb(c, 530, 286, 590, 286, 5, ['wood_deep', 'wood_dark', 'wood_mid'], 0.1);
    if (lv < 2) { blob(c, 556, 286, 30, 4, ['stone_dark', 'stone', 'fog_mid']); }                    // cold ash
    // The mantel, and what stands on it.
    slab(c, 460, 172, 180, 10, WOOD); box(c, 'ink', 460, 182, 180, 1); box(c, 'wood_deep', 470, 183, 160, 3);
    if (lv >= 2) {
      slab(c, 482, 146, 26, 26, WOOD); blob(c, 495, 158, 9, 9, CREAM, { rim: 0 }); box(c, 'ink', 495, 158, 1, 7); line(c, 'ink', 495, 158, 499, 160); // a clock stopped at 3:33
      for (var k = 0; k < 3; k++) { slab(c, 520 + k * 7, 156 - k * 4, 5, 16 + k * 4, CREAM); box(c, 'flame', 522 + k * 7, 152 - k * 4, 1, 3); }
      slab(c, 600, 148, 22, 24, WOOD); box(c, 'fog_dark', 603, 151, 16, 18); box(c, 'paper_dark', 607, 156, 8, 10);
    }
    if (lv >= 3) for (k = 0; k < 6; k++) slab(c, 566 + k * 5, 152 + (k % 2) * 3, 4, 20 - (k % 2) * 3, [['blood', 'crimson', 'rug_hi'], CLOTH, MOSS, BRASS][k % 4]);
    // Above the mantel: a paddle, later a painting of a lake with a lit cabin window.
    if (lv >= 1 && lv < 4) { limb(c, 492, 70, 612, 130, 2, WOOD, 0.1); blob(c, 600, 124, 18, 7, WOOD, { bias: 0.1 }); }
    if (lv >= 4) {
      slab(c, 500, 82, 110, 72, BRASS);
      A.area(c, 506, 88, 98, 60, function (x, y) {
        var r = (y - 88) / 60, ridge = 112 - Math.abs(((x - 506) % 40) - 20) * 0.9;
        if (y > 132) return y > 140 ? 'water_mid' : 'water_hi';
        if (y > ridge) return y > 124 ? 'pine_mid' : 'mount_mid';
        return r < 0.3 ? 'dusk_violet' : (r < 0.45 ? 'dusk_plum' : 'dusk_rose');
      });
      box(c, 'wood_dark', 574, 120, 10, 10); box(c, 'lamp_glow', 577, 123, 3, 3); box(c, 'wood_deep', 572, 118, 14, 2);
    }
  }

  function furniture(c, lv) {
    var x, y;
    // The armchair, under the window: back, arms, seat cushion; torn while derelict.
    blob(c, 300, 238, 50, 26, CLOTH, { bias: lv < 1 ? -0.15 : 0 });
    A.area(c, 252, 240, 96, 58, function (xx, yy) { return tone(CLOTH, 0.45 - (yy - 240) / 140 + (xx < 262 ? 0.15 : 0), xx, yy); });
    blob(c, 252, 266, 14, 26, CLOTH, { bias: 0.1 }); blob(c, 348, 266, 14, 26, CLOTH, { bias: -0.1 });
    slab(c, 262, 270, 76, 14, CLOTH); box(c, 'teal_lit', 266, 271, 68, 1);
    for (x = 0; x < 3; x++) blob(c, 274 + x * 26, 244, 2, 2, CLOTH, { bias: -0.3 });                 // buttons
    box(c, 'wood_deep', 258, 298, 6, 12); box(c, 'wood_deep', 336, 298, 6, 12);
    if (lv < 1) { blob(c, 284, 250, 8, 5, CREAM, { bias: 0.1 }); blob(c, 322, 276, 6, 3, CREAM); line(c, 'teal_dark', 276, 246, 292, 254); }
    if (lv >= 4) {                                                                                   // a quilt over the back
      A.area(c, 270, 214, 50, 44, function (xx, yy) {
        if (yy - 214 > 30 + Math.sin(xx * 0.4) * 3) return '';
        var q = (((xx - 270) / 10) | 0) + (((yy - 214) / 10) | 0);
        return (xx - 270) % 10 === 0 || (yy - 214) % 10 === 0 ? 'paper_dark' : (q % 2 ? 'rug_hi' : 'cream');
      });
    }
    // A side table with a radio, or crates while derelict.
    if (lv >= 1) {
      slab(c, 160, 262, 54, 6, WOOD); box(c, 'wood_dark', 164, 268, 4, 44); box(c, 'wood_dark', 206, 268, 4, 44); box(c, 'wood_dark', 164, 296, 46, 3);
      slab(c, 168, 240, 36, 22, RUST); box(c, 'paper_dark', 172, 244, 14, 12); for (y = 0; y < 5; y++) box(c, 'rust_dark', 172, 245 + y * 2, 14, 1);
      blob(c, 194, 250, 4, 4, BRASS, { bias: 0.2 }); line(c, 'stone_hi', 200, 240, 210, 222);
    } else {
      slab(c, 150, 270, 48, 36, WOOD); line(c, 'wood_deep', 150, 270, 198, 306); line(c, 'wood_deep', 198, 270, 150, 306);
      slab(c, 158, 244, 34, 26, WOOD); line(c, 'wood_deep', 158, 257, 192, 257);
    }
    // Boots by the door, a bucket by the hearth.
    if (lv >= 1) for (var b = 0; b < 2; b++) {
      var bx = 112 + b * 18;
      slab(c, bx, 284, 12, 26, MOSS); slab(c, bx - 4, 304, 18, 8, MOSS); box(c, 'moss_dark', bx, 296, 12, 2);
    }
    slab(c, 434, 296, 26, 22, STONE); box(c, 'stone_dark', 434, 302, 26, 2); line(c, 'stone_hi', 436, 296, 447, 284); line(c, 'stone_hi', 447, 284, 458, 296);
    // The rug (stage 3) with a zigzag border, and the floor lamp with its pool of light.
    if (lv >= 3) {
      A.area(c, 170, 314, 270, 36, function (xx, yy) {
        var u = (xx - 305) / 135, vv = (yy - 332) / 18;
        if (u * u + vv * vv > 1) return '';
        var edge = u * u + vv * vv > 0.62, z = (xx + Math.abs(((yy - 314) % 6) - 3)) % 8 < 4;
        return edge ? (z ? 'bone' : 'blood') : (((xx >> 3) + (yy >> 2)) % 2 ? 'crimson' : 'rug_hi');
      });
      box(c, 'wood_deep', 390, 206, 3, 114); slab(c, 382, 318, 18, 4, BRASS);
      for (y = 0; y < 22; y++) for (x = -10 - (y >> 1); x <= 10 + (y >> 1); x++) px(c, y > 18 ? 'paper_dark' : (x < -4 - (y >> 1) ? 'cream' : (x > 6 + (y >> 2) ? 'paper' : 'bone')), 391 + x, 186 + y);
      box(c, 'lamp_glow', 386, 208, 11, 2);
    }
    // Derelict: holes to the night, a loose board, cobwebs, debris.
    if (lv < 1) {
      box(c, 'night_ink', 150, 128, 30, 14); box(c, 'night_ink', 156, 142, 16, 8); px(c, 'fog_light', 162, 132); px(c, 'bone', 171, 136);
      box(c, 'night_ink', 430, 222, 22, 10);
      limb(c, 140, 186, 212, 214, 3, WOOD, 0); box(c, 'stone_hi', 141, 185, 2, 2);
      for (var w = 0; w < 2; w++) {
        var cx = w ? 466 : 130, dir = w ? -1 : 1;
        for (var k = 0; k < 5; k++) line(c, 'fog_mid', cx, 15, cx + dir * (40 - k * 6), 15 + k * 8);
        for (k = 1; k < 4; k++) line(c, 'fog_mid', cx + dir * k * 9, 15, cx, 15 + k * 9);
      }
      for (k = 0; k < 9; k++) slab(c, 200 + k * 31, 300 + (k * 7) % 14, 6 + k % 4 * 3, 4, k % 2 ? WOOD : STONE);
    } else if (lv === 1) {
      slab(c, 146, 126, 38, 26, WOOD); slab(c, 428, 220, 26, 14, WOOD);                              // the patches
      for (var n = 0; n < 4; n++) { px(c, 'stone_hi', 148 + (n % 2) * 32, 128 + (n >> 1) * 20); px(c, 'stone_hi', 430 + (n % 2) * 20, 222 + (n >> 1) * 9); }
    }
  }

  function plaques(c, n) {
    for (var i = 0; i < n; i++) {
      var x = slotX(i) - (PLAQUE_W >> 1), y = slotY(i) - (PLAQUE_H >> 1);
      box(c, 'ink', x - 1, y + 2, PLAQUE_W + 2, PLAQUE_H);                                           // shadow
      A.area(c, x, y, PLAQUE_W, PLAQUE_H, function (xx, yy) {
        var ex = Math.min(xx - x, x + PLAQUE_W - 1 - xx), ey = Math.min(yy - y, y + PLAQUE_H - 1 - yy);
        if (ex + ey < 4) return '';
        if (ex < 2 || ey < 2) return (xx - x < 2 || yy - y < 2) ? 'wood_lit' : 'wood_deep';
        return ex < 4 || ey < 4 ? 'wood_hi' : 'wood_mid';
      });
      slab(c, slotX(i) - 15, y + PLAQUE_H - 12, 30, 9, BRASS);
      box(c, 'stone', slotX(i), y - 4, 1, 4);
    }
  }

  function paintCabin(c, lv, n) {
    A.reset();
    paintWalls(c, lv);
    door(c, lv);
    windowView(c, lv);
    fireplace(c, lv);
    plaques(c, n);
    furniture(c, lv);
    // The top board for the title, and a strip for the keys.
    box(c, 'ink', 140, 4, 300, 36); slab(c, 141, 5, 298, 34, ['wood_deep', 'wood_dark', 'wood', 'wood_mid']); box(c, 'wood_dark', 143, 7, 294, 30);
    box(c, 'ink', 430, 340, 210, 20);
  }

  var room = null, level = -1, t = 0;
  var mounted = [];   // {spIdx, img, flipImg, len, lenW}, decided in enter()
  var turned = [];    // per mounted trophy: faces the door; decided in enter() only
  var order = [];
  var stored = 0, msg = '', txt = { title: '', next: '', stored: '', coins: '' }, lastCoins = -1, coin = null;

  function bakeRoom() {
    var lv = G.state.save.cabinLevel, st = G.data.gear.cabin[lv];
    level = lv;
    room = B.cached('cabin640:' + lv, function () { return B.layer(640, 360, function (ctx) { paintCabin(ctx, lv, st.plaques); }); });
    if (!coin) coin = B.layer(8, 8, function (c) { A.reset(); blob(c, 4, 4, 3.6, 3.6, BRASS, { bias: 0.1, rim: 0 }); box(c, 'rust', 3, 3, 2, 2); px(c, 'brass_hi', 2, 2); });
  }

  function texts() {
    var save = G.state.save, stages = G.data.gear.cabin, next = stages[save.cabinLevel + 1];
    txt.title = 'THE CABIN: ' + stages[save.cabinLevel].name.toUpperCase();
    txt.next = next ? 'Restore: ' + next.name + ' ' + next.cost + 'c' : 'Fully restored.';
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
    t = 0;
    order.length = 0;
    for (i = 0; i < kept.length; i++) if (speciesIndex(kept[i].id) >= 0) order.push(i);
    order.sort(function (a, b) { return kept[b].w - kept[a].w || a - b; });
    mounted.length = 0; turned.length = 0;
    for (i = 0; i < order.length && i < cap; i++) {
      var k = kept[order[i]], sp = speciesIndex(k.id), len = Math.round(k.len) + 'cm';
      mounted.push({ spIdx: sp, img: G.gfx.fishgen.portrait(sp, PLAQUE_W - 10, PLAQUE_H - 18, false), flipImg: G.gfx.fishgen.portraitFlipped(sp, PLAQUE_W - 10, PLAQUE_H - 18), len: len, lenW: F.measure(len) });
      turned.push(false);
    }
    stored = order.length - mounted.length;
    // How many face the door follows unease; which ones is a visual choice (G.vrng).
    var u = G.state.run.loc ? G.sim.unease.get(save, G.state.run.loc) : 0, n = Math.round(u * mounted.length);
    for (i = 0; i < n; i++) {
      do { j = G.vrng.int(0, mounted.length - 1); } while (turned[j]);
      turned[j] = true;
    }
    msg = '';
    texts();
  }

  function exit() {}

  function restore() {
    var r = G.sim.economy.restoreCabin(G.state.save, G.data);
    if (r === G.sim.economy.OK) {
      G.core.save.autosave('purchase');
      bakeRoom();
      msg = 'New plaques. The fish go up next time you come in.';
    } else msg = r === G.sim.economy.POOR ? 'Not enough coins.' : 'Nothing left to fix.';
    texts();
    return r;
  }

  function update(dt) {
    var inp = G.core.input;
    t += dt;
    G.sim.clock.step(G.state.save, null, dt, G.rng, G.data);
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    if (inp.pressed('left')) { G.ui.menu.open('look', 'cabin'); return; } // Phase 47: the door (A, or a tap on it) opens the picker
    if (inp.pressed('action')) restore();
  }

  // The fire (stage 2 on): tongues of flame that rise and fall at ten frames a second, a
  // core of light, and embers on the logs. All from the scene's time; no RNG in draw.
  var TONGUES = [-26, -14, -3, 8, 20, 30];
  function drawFire(ctx) {
    var tq = Math.floor(t * 10) / 10, k, r;
    for (k = 0; k < TONGUES.length; k++) {
      var h = 26 + Math.round(10 * Math.sin(tq * 5.3 + k * 1.9) + 6 * Math.sin(tq * 9.1 + k * 0.7)) - Math.abs(TONGUES[k]) * 0.35, hw = 9 - Math.abs(TONGUES[k]) * 0.1;
      var cx = FIRE_X + TONGUES[k] + Math.round(Math.sin(tq * 3 + k) * 1.5);
      for (r = 0; r < h; r++) {
        var f = r / h, w = Math.max(0, Math.round(hw * Math.pow(1 - f, 0.7))), lean = Math.round(Math.sin(f * 2.5 + tq * 4 + k) * f * 3);
        if (w <= 0) continue;
        ctx.fillStyle = P.flame; ctx.fillRect(cx - w + lean, FIRE_Y - 6 - r, w * 2, 1);
        if (w > 2) { ctx.fillStyle = P.signal_amber; ctx.fillRect(cx - w + 2 + lean, FIRE_Y - 6 - r, w * 2 - 4, 1); }
        if (w > 4 && f < 0.5) { ctx.fillStyle = P.lamp_glow; ctx.fillRect(cx - w + 4 + lean, FIRE_Y - 6 - r, w * 2 - 8, 1); }
      }
    }
    for (k = 0; k < 8; k++) {
      var on = Math.sin(tq * 7 + k * 2.3) > 0;
      ctx.fillStyle = P[on ? 'signal_amber' : 'rust_hi']; ctx.fillRect(528 + k * 8, 280 + (k % 3), 2, 1);
    }
  }

  function draw(ctx) {
    var save = G.state.save;
    ctx.drawImage(room, 0, 0);
    if (level >= 2) drawFire(ctx);
    for (var i = 0; i < mounted.length; i++) {
      var m = mounted[i], img = turned[i] ? m.flipImg : m.img, cx = slotX(i), cy = slotY(i), top = cy - (PLAQUE_H >> 1);
      ctx.drawImage(img, cx - (img.width >> 1), top + 4 + ((PLAQUE_H - 18 - img.height) >> 1)); // flipped: facing the door
      F.drawText(ctx, m.len, cx - (m.lenW >> 1), top + PLAQUE_H - 12, 'wood_deep');
    }
    // Phase 54: the cabin's words in a small panel at the top centre, in the shared style: its
    // stage on the tab, the coins beside it, the next restoration (or the last word), the
    // icebox, and the keys.
    var U = G.ui.panel, px = HEAD[0], py = HEAD[1];
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '  ' + save.coins; }
    U.frame(ctx, px, py, HEAD[2], HEAD[3], txt.title, txt.coins, 'bone');
    ctx.drawImage(coin, U.asideX(px, HEAD[2], txt.coins), py + 4);
    var ty = U.top(py);
    F.drawText(ctx, msg || txt.next, U.left(px), ty, msg ? 'fog_light' : 'signal_amber');
    if (txt.stored && !msg) F.drawText(ctx, txt.stored, px + HEAD[2] - U.PAD - F.measure(txt.stored), ty, 'fog_light');
    var hx = U.left(px), hy = py + HEAD[3] - U.PAD - U.KEY_H;
    hx += U.hint(ctx, 'SPACE', 'restore', hx, hy);
    hx += U.hint(ctx, 'A', 'door: fisher & dog', hx, hy);
    U.hint(ctx, 'ESC', 'leave', hx, hy);
  }
  var HEAD = G.ui.panel.place(300, 50, 'top', [0, 0, 300, 50]); HEAD[2] = 300; HEAD[3] = 50;

  return {
    native: true,
    enter: enter, exit: exit, update: update, draw: draw, restore: restore,
    // dbg: what is on the wall now.
    state: function () { return { level: level, mounted: mounted.length, turned: turned.filter(Boolean).length, facing: turned.slice(), stored: stored }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  if (G.core.state.sceneName() !== 'cabin') return 'cabin level ' + (G.state.save ? G.state.save.cabinLevel : '-');
  var s = G.ui.cabin.state();
  return 'cabin level ' + s.level + '  mounted ' + s.mounted + '  facing door ' + s.turned + '  icebox ' + s.stored;
});
