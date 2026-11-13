var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// What the walk-in rooms share (Phase 56): the bait shop (js/ui/shop_room.js) and the cabin
// (js/ui/cabin_room.js) are both small rooms seen from above at a three-quarter angle, walked
// tile by tile. This file has the walk (lifted from the shop's, Phase 36, unchanged in its
// rules), the people and the dog who walk them, painted in G.gfx.pix with real shapes: a
// figure in proportion with a face, ears, a collar, pockets, sleeves and cuffs, hands, creased
// trousers and boots; a dog with a skull and a muzzle, a chest, legs with joints and paws, its
// breed's ears, tail and coat; and Rusty, old and worn. Every colour a palette key.
// Visual and input only: no randomness, nothing saved.
G.ui = G.ui || {};
G.ui.room = (function () {
  var S = G.gfx.sprites, X = G.gfx.pix;
  var DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  var STEP = 0.2, TURN = 0.09; // s a step takes; s a direction must be held after a turn before he walks

  // ---- The walk -----------------------------------------------------------------------------
  // map: rows of tile characters ('.', 'r' and 'm' are floor; anything else blocks); objects:
  // [{c, r, w, h, block, talk}]; mat: [c, r], the tile inside the door (walking down off it
  // leaves). Phase 83: doors, more ways out: [{c, r, dir, id}] (walking dir off tile c, r
  // leaves by door id; st.exit is 'front' for the mat's door, else the id). Returns the room's
  // walk: create, step, facing, isBlocked, blocked.
  function walker(map, objects, mat, doors) {
    doors = doors || [];
    var COLS = map[0].length, ROWS = map.length, blocked = [], talkAt = [], r, c, i;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var ch = map[r][c];
      blocked[r * COLS + c] = !(ch === '.' || ch === 'r' || ch === 'm');
      talkAt[r * COLS + c] = '';
    }
    for (i = 0; i < objects.length; i++) {
      var o = objects[i];
      for (var y = o.r; y < o.r + o.h; y++) for (var x = o.c; x < o.c + o.w; x++) {
        if (o.block) blocked[y * COLS + x] = true;
        talkAt[y * COLS + x] = o.talk;
      }
    }
    function isBlocked(c, r) { return c < 0 || r < 0 || c >= COLS || r >= ROWS || blocked[r * COLS + c]; }

    // st: {c, r (the tile he stands on or leaves), tc, tr (the tile he steps to), t (0..1 of
    // the step), face, turnT (s held since a turn), moving, dog: {c, r, tc, tr, face, sit}}.
    // at (Phase 83, optional): {c, r, face, dc, dr}: where he and the dog start (a back door).
    function create(at) {
      var c0 = at ? at.c : mat[0], r0 = at ? at.r : mat[1], dc = at ? at.dc : mat[0] - 1, dr = at ? at.dr : mat[1], f = at ? at.face : 'up';
      return { c: c0, r: r0, tc: c0, tr: r0, t: 1, face: f, turnT: 0, turned: false, moving: false, steps: 0,
        dog: { c: dc, r: dr, tc: dc, tr: dr, face: f, sit: true }, exit: false };
    }
    // dir: the direction held this step ('' none). A press of a new direction turns him on the
    // spot, and he walks once it has been held for TURN s. Sets st.exit when he walks down off
    // the mat through the door.
    function step(st, dt, dir) {
      var dg = st.dog;
      if (st.moving) {
        st.t += dt / STEP;
        if (st.t >= 1) { st.t = 1; st.moving = false; st.c = st.tc; st.r = st.tr; dg.c = dg.tc; dg.r = dg.tr; }
      }
      if (st.moving) return;
      if (!dir) { st.turnT = 0; st.turned = false; dg.sit = true; dg.face = faceTo(dg, st.c, st.r) || dg.face; return; }
      if (dir !== st.face) { st.face = dir; st.turnT = 0; st.turned = true; return; }
      st.turnT += dt;
      if (st.turned && st.turnT < TURN) return;
      st.turned = false;
      var nc = st.c + DIRS[dir][0], nr = st.r + DIRS[dir][1];
      if (st.c === mat[0] && st.r === mat[1] && dir === 'down') { st.exit = 'front'; return; }
      for (var di = 0; di < doors.length; di++) if (st.c === doors[di].c && st.r === doors[di].r && dir === doors[di].dir) { st.exit = doors[di].id; return; }
      if (isBlocked(nc, nr)) return;
      // The dog takes the tile he leaves.
      var dc = st.c, dr = st.r;
      dg.tc = dc; dg.tr = dr; dg.face = faceTo(dg, dc, dr) || dg.face; dg.sit = false;
      st.tc = nc; st.tr = nr; st.t = 0; st.moving = true; st.steps++;
    }
    // What Space talks to: the object on the tile he faces ('' nothing).
    function facing(st) {
      if (st.moving) return '';
      var c = st.c + DIRS[st.face][0], r = st.r + DIRS[st.face][1];
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '';
      return talkAt[r * COLS + c];
    }
    function blockedList() { var o = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (isBlocked(c, r)) o.push([c, r]); return o; }
    // Walks by U, D, L and R a tile each, through the walk's own rules (dbg).
    function walkPath(st, path) {
      var DIR = { U: 'up', D: 'down', L: 'left', R: 'right' }, nb = 0;
      for (var i = 0; i < path.length; i++) {
        var d = DIR[path[i].toUpperCase()];
        if (!d) continue;
        var n0 = st.steps;
        for (var k = 0; k < 90; k++) {
          step(st, 1 / 60, st.steps > n0 ? '' : d);
          if (st.steps > n0 && !st.moving) break;
        }
        if (st.steps === n0) nb++;
      }
      step(st, 1 / 60, '');
      return nb;
    }
    return { COLS: COLS, ROWS: ROWS, MAT: mat, create: create, step: step, facing: facing, isBlocked: isBlocked, blocked: blockedList, walkPath: walkPath };
  }
  function faceTo(o, c, r) {
    var dx = c - o.c, dy = r - o.r;
    if (!dx && !dy) return '';
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  // The last direction pressed and still held leads (the shop's and the cabin's input).
  var DIRK = ['up', 'down', 'left', 'right'];
  function heldDir(inp, held) {
    for (var i = 0; i < DIRK.length; i++) {
      var k = DIRK[i], at = held.indexOf(k);
      if (inp.pressed(k)) { if (at >= 0) held.splice(at, 1); held.push(k); }
      else if (!inp.held(k) && at >= 0) held.splice(at, 1);
    }
    return held.length ? held[held.length - 1] : '';
  }

  // ---- Painting helpers -----------------------------------------------------------------------
  function dk(k) { return S.shift(k, -1); }
  function lt(k) { return S.shift(k, 1); }
  function r3(k) { return [dk(k), k, lt(k)]; }
  var tone = X.tone;
  var BOOT = ['outline', 'wood_deep', 'wood_dark', 'wood', 'wood_mid'];

  // ---- The fisher ---------------------------------------------------------------------------
  // 32×48, his feet at the bottom (y 46). dir 'down' (his face), 'up' (his back) or 'side'
  // (facing right; left is the mirror); fr 0 standing, 1 and 2 the walk's two strides.
  var FW = 32, FH = 48;
  function paintFisher(g, dir, fr, L) {
    var CO = [dk(L.coat[0]), L.coat[0], L.coat[1], L.coat[2], lt(L.coat[2])], TR = r3(L.trousers), SK = L.skin, HAIR = r3(L.hair);
    if (dir === 'side') return fisherSide(g, fr, L, CO, TR, SK, HAIR);
    var back = dir === 'up', lift = fr === 1 ? [2, 0] : (fr === 2 ? [0, 2] : [0, 0]), sw = fr === 1 ? 1 : (fr === 2 ? -1 : 0), s, x;
    // Legs, creased, and the boots (lifted on a stride).
    for (s = 0; s < 2; s++) {
      var x0 = s ? 17 : 10, yb = 42 - lift[s];
      g.fill(x0, 33, 5, yb - 33, function (x, y) {
        var v = 0.78 - (x - x0) / 5 * 0.55 - (s ? 0.15 : 0);
        if (y === 37 + (s ? 0 : 1) && x === x0 + 1) v += 0.3;                   // the knee
        if (x === x0 + 2 && y > 38) v -= 0.25;                                   // the crease
        return tone(TR, v);
      });
      g.ell(x0 + 2.5, yb + 1.6, 3.2, 2.2, BOOT, { bias: 0.1, rim: 0.1 });
      g.rect(BOOT[2], x0 - 0.5, yb - 0.5, 6, 1);
      g.rect('outline', x0 - 0.5, yb + 3.3, 6, 1);                               // the sole
      if (!back) { g.set('wood_mid', x0 + 1, yb + 0.5); g.set('wood_mid', x0 + 3, yb + 0.5); } // laces
    }
    g.rect(TR[0], 15, 33, 2, 3);                                                  // the crotch
    // The jacket: shoulders, a slight taper, the hem.
    g.poly([[7.5, 20], [10, 18], [22, 18], [24.5, 20], [24, 27], [23.5, 34], [8.5, 34], [8, 27]], function (x, y) {
      var v = 0.66 - (x - 8) / 16 * 0.5 - (y - 18) / 16 * 0.12;
      if ((x === 11 && y > 27 && y < 33) || (x === 21 && y > 26 && y < 32)) v -= 0.18;   // folds
      if (y === 33) v -= 0.25;
      return tone(CO, v);
    });
    if (L.check) g.over(7, 18, 18, 16, function (x, y, k) { return (x % 4 === 1 || y % 4 === 1) && CO.indexOf(k) >= 0 ? ((x % 4 === 1 && y % 4 === 1) ? dk(L.check) : L.check) : ''; });
    if (!back) {
      g.poly([[13, 18], [19, 18], [16, 23]], L.check ? 'paper_dark' : (SK[1]));   // the open collar
      g.line(CO[4], 12, 18, 15.5, 23); g.line(CO[1], 20, 18, 16.5, 23);           // the lapels
      g.line(CO[1], 16, 23, 16, 33);                                              // the zip
      g.set('chrome_hi', 16, 24);
      for (s = 0; s < 2; s++) { var px0 = s ? 18 : 10; g.rect(CO[1], px0, 26, 4, 4); g.rect(CO[3 - s], px0, 26, 4, 1); g.rect(CO[0], px0, 29, 4, 1); g.set('chrome', px0 + 2, 27); }
    } else {
      g.line(CO[1], 16, 21, 16, 33); g.line(CO[1], 9, 21, 23, 21);                // the seam and the yoke
      g.rect(CO[3], 11, 19, 10, 1);
    }
    // Arms and hands, swinging against the legs.
    g.cap(8.2, 20.5, 7 , 30.5 + sw, 2.2, CO, 0.05); g.cap(23.8, 20.5, 25, 30.5 - sw, 2.2, CO, -0.22);
    g.rect(CO[1], 5, 30 + sw, 5, 1); g.rect(CO[0], 23, 30 - sw, 5, 1);           // cuffs
    g.ell(7, 32.4 + sw, 1.9, 1.7, SK, { bias: 0.1 }); g.ell(25, 32.4 - sw, 1.9, 1.7, SK, { bias: -0.15 });
    // The neck, the ears, the head.
    g.rect(SK[1], 14, 16, 4, 3);
    g.ell(11.2, 12.4, 1.4, 1.9, SK, { bias: -0.1 }); g.ell(20.8, 12.4, 1.4, 1.9, SK, { bias: -0.3 });
    if (back) {
      g.ell(16, 12.2, 4.6, 4.9, SK, { bias: -0.1 });                               // the nape
      g.ell(16, 10.6, 4.8, 4.4, HAIR, { bias: 0.05 });
      g.fill(12, 13, 9, 2, function (x, y) { return (x + y) % 2 && Math.abs(x - 16) < 4 ? HAIR[1] : ''; }); // the hairline, ragged
    } else {
      g.ell(16, 11.8, 4.7, 5.3, SK, { bias: 0.08 });
      g.rect(L.hair, 11, 8, 2, 4); g.rect(L.hair, 20, 8, 2, 4);                    // hair under the hat
      g.rect(dk(L.hair), 13, 10, 2, 1); g.rect(dk(L.hair), 17, 10, 2, 1);           // brows
      g.set('outline', 14, 12); g.set('outline', 18, 12); g.set(SK[3], 13, 12); g.set(SK[3], 17, 12);
      g.set(SK[1], 16, 13); g.set(SK[1], 16, 14); g.set(SK[3], 15, 13);            // the nose
      g.set(SK[3], 13, 14); g.set(SK[2], 19, 14);
      if (L.beard) {
        var BD = L.beard;
        g.fill(11, 13, 11, 6, function (x, y) { var nx = (x - 16) / 4.9, ny = (y - 13.5) / 4.6; return nx * nx + ny * ny <= 1 && y >= 14 ? tone(BD, 0.75 - (x - 11) / 11 * 0.55 + (y === 14 ? 0.15 : 0)) : ''; });
        g.rect(BD[0], 15, 15, 3, 1);                                              // the mouth in it
      } else { g.rect(SK[0], 15, 15, 3, 1); g.rect(SK[1], 14, 16, 5, 1); }
    }
    HATS[L.hat](g, back ? 'up' : 'down', L.hatKeys, L);
    g.outline('outline');
  }

  function fisherSide(g, fr, L, CO, TR, SK, HAIR) {
    var st = fr === 1 ? 1 : (fr === 2 ? -1 : 0);
    // Legs: the far one first, darker; a stride scissors them.
    function leg(far, d) {
      var hx = 16 - (far ? 1 : 0), ax = hx + d * 3.5, ay = 42 - (d > 0 && fr ? 0 : 0);
      g.cap(hx, 34, (hx + ax) / 2 + d * 0.5, 38, 2.4, far ? [TR[0], TR[0], TR[1]] : TR, far ? -0.2 : 0.05);
      g.cap((hx + ax) / 2 + d * 0.5, 38, ax, ay, 2.2, far ? [TR[0], TR[0], TR[1]] : TR, far ? -0.2 : 0);
      g.poly([[ax - 2.5, ay - 1], [ax + 1.5, ay - 1], [ax + 4.5, ay + 1.5], [ax + 4.5, ay + 3.5], [ax - 2.5, ay + 3.5]], function (x, y) { return tone(BOOT, (far ? 0.25 : 0.55) - (y - ay) * 0.08 + (x < ax ? 0.1 : 0)); });
      g.rect('outline', ax - 2.5, ay + 3.5, 7, 1);
    }
    leg(true, -st); leg(false, st);
    // The far arm, behind.
    g.cap(16, 21, 16 - st * 3.5, 30.5, 2, [CO[0], CO[1], CO[1]], 0);
    // The jacket from the side: the back curved, the front straight with its zip.
    g.poly([[12, 20], [14.5, 18], [19, 18], [21.5, 21], [21.5, 34], [11.5, 34], [11, 27]], function (x, y) {
      var v = 0.62 - (x - 11) / 11 * 0.3 - (y - 18) / 16 * 0.15;
      if (x <= 12) v -= 0.2;
      if (y === 33) v -= 0.25;
      return tone(CO, v);
    });
    if (L.check) g.over(10, 18, 13, 16, function (x, y, k) { return (x % 4 === 1 || y % 4 === 1) && CO.indexOf(k) >= 0 ? L.check : ''; });
    g.line(CO[1], 21, 22, 21, 33); g.rect(CO[1], 17, 26, 4, 4); g.rect(CO[3], 17, 26, 4, 1);
    g.poly([[18, 18], [21, 18], [21, 21]], L.check ? 'paper_dark' : SK[1]);          // the collar
    // The near arm, swinging, the hand.
    g.cap(16, 21, 16 + st * 3.5, 30.5, 2.3, CO, 0.1);
    g.rect(CO[1], 14 + st * 3.5, 30, 5, 1);
    g.ell(16.5 + st * 3.5, 32.3, 1.9, 1.7, SK, { bias: 0.1 });
    // The head: the back of the hair, the face toward the right, the ear, the nose.
    g.rect(SK[1], 15, 16, 4, 3);
    g.ell(15, 11.5, 4, 5, HAIR, { bias: 0 });
    g.ell(17.4, 12, 3.9, 5, SK, { bias: 0.1 });
    g.ell(15, 12.6, 1.4, 1.9, SK, { bias: -0.25 }); g.set(SK[0], 15, 13);           // the ear
    g.set(SK[2], 21.5, 12); g.set(SK[2], 21.5, 13); g.set(SK[1], 21, 14);           // the nose
    g.set('outline', 19, 11); g.rect(dk(L.hair), 18, 9, 3, 1);
    if (L.beard) g.fill(14, 13, 9, 6, function (x, y) { var nx = (x - 18.5) / 3.6, ny = (y - 14.2) / 3.8; return nx * nx + ny * ny <= 1 && y >= 14 ? tone(L.beard, 0.7 - (x - 14) / 9 * 0.3) : ''; });
    else g.rect(SK[0], 19, 15, 2, 1);
    HATS[L.hat](g, 'side', L.hatKeys, L);
    g.outline('outline');
  }

  // Each hat facing down (the face below it), up (the back of the head) or to the side (right).
  var HATS = {
    cap: function (g, dir, H, L) {
      var HK = [dk(H[0]), H[0], H[1], H[2]];
      if (dir === 'side') {
        g.ell(16.5, 7.4, 4.8, 3.6, HK, { bias: 0.1 }); g.rect(HK[0], 12, 9, 9, 1);
        g.poly([[19, 8.5], [24.5, 9], [24, 10.6], [19, 10.4]], function (x) { return x > 22 ? H[0] : H[1]; });  // the brim, forward
        g.set(H[2], 17, 4);
      } else if (dir === 'down') {
        g.ell(16, 7.2, 5.4, 3.8, HK, { bias: 0.1 });
        g.line(H[0], 16, 4, 16, 8); g.set(H[2], 16, 3.5);                              // the panels' seam, the button
        g.ell(16, 9.6, 6.2, 1.5, [dk(H[0]), H[0], H[1]], { bias: 0.15 });           // the brim, toward us
        g.rect(HK[0], 11, 10, 10, 1);                                               // its shadow on his brow
        g.rect('bone', 14, 6, 4, 2); g.rect('paper_dark', 14, 7, 4, 1);           // a patch
      } else { g.ell(16, 8, 5.4, 4.8, HK, { bias: 0.1 }); g.rect('outline', 14, 11, 4, 1); g.rect('chrome', 15, 11, 2, 1); } // the strap
    },
    knit: function (g, dir, H) {
      var HK = [dk(H[0]), H[0], H[1], H[2]], cx = dir === 'side' ? 16 : 16;
      g.ell(cx, 7.4, dir === 'side' ? 5 : 5.6, 4.6, HK, { bias: 0.1 });
      g.fill(cx - 6, 9, 13, 2, function (x, y) { var d = Math.abs(x - cx); return d <= (dir === 'side' ? 5 : 5.8) ? (x % 2 ? H[0] : H[1]) : ''; }); // the cuff's ribs
      g.over(cx - 6, 3, 13, 6, function (x, y, k) { return HK.indexOf(k) >= 0 && (x + y) % 3 === 0 ? H[0] : ''; });              // the knit
      g.ell(dir === 'side' ? 14.5 : 16, 2.6, 2, 1.9, [H[0], H[1], H[2], lt(H[2])], { bias: 0.2 });                                   // the bobble
    },
    bucket: function (g, dir, H) {
      var HK = [dk(H[0]), H[0], H[1], H[2]];
      if (dir === 'side') { g.ell(15.5, 9.6, 8, 1.7, HK, { bias: 0.05 }); g.ell(16, 6.6, 4.4, 3.2, HK, { bias: 0.15 }); g.rect(H[0], 12, 8, 8, 1); return; }
      g.ell(16, 9.4, 8, 2.4, HK, { bias: dir === 'up' ? 0 : -0.05 });
      g.ell(16, 6.4, 4.8, 3.3, HK, { bias: 0.15 });
      g.rect(H[0], 11, 8, 10, 1);                                                    // the band
      if (dir === 'down') g.rect(HK[0], 10, 11, 12, 1);                              // the brim's shade
    },
    lamp: function (g, dir, H) {
      HATS.knit(g, dir, ['ink', 'stone_dark', 'stone']);
      if (dir === 'down') { g.rect('outline', 10, 8, 12, 1); g.slab(14, 6, 4, 3, ['outline', 'stone_dark', 'stone', 'stone_hi']); g.set('lamp_glow', 15, 7); g.set('cream', 16, 7); }
      else if (dir === 'side') { g.rect('outline', 12, 8, 9, 1); g.slab(20, 6, 3, 3, ['outline', 'stone_dark', 'stone', 'stone_hi']); g.set('lamp_glow', 22, 7); }
      else { g.rect('outline', 10, 9, 12, 1); g.slab(14, 8, 4, 2, ['outline', 'stone_dark', 'stone', 'stone_hi']); }
    }
  };

  // ---- The dog ------------------------------------------------------------------------------
  // From the side 40×32 (facing right; left is the mirror), from the front or behind 32×32;
  // the feet at y 30. fr 0 standing, 1 a stride, 2 the other stride, 3 sitting.
  var DW = 40, DH = 32;
  function paintDog(g, dir, fr, B) {
    var C = [dk(B.coat[0]), B.coat[0], B.coat[1], B.coat[2], lt(B.coat[2])], MZ = [B.muzzle[0], B.muzzle[0], B.muzzle[1], B.muzzle[2]];
    var LEG = B.paleLegs ? MZ : C, EAR = [dk(B.ear[1]), B.ear[1], B.ear[2], lt(B.ear[2])], k = B.bulk, sit = fr === 3;
    if (dir === 'side') return dogSide(g, fr, B, C, MZ, LEG, EAR, k, sit);
    var back = dir === 'up', st = fr === 1 ? 1 : (fr === 2 ? -1 : 0);
    if (back) {
      // From behind: the haunches and hind legs, the back, the head and its ears beyond, the tail.
      g.ell(16, 13, 5.4 * k, 6, C, { bias: 0.1 });                                   // the shoulders, beyond
      g.cap(11.5, 22, 11.5, 29 - (st > 0 ? 1 : 0), 1.9, LEG, 0); g.cap(20.5, 22, 20.5, 29 - (st < 0 ? 1 : 0), 1.9, LEG, -0.2);
      if (!sit) { g.cap(13, 18, 13, 29 - (st < 0 ? 1 : 0), 1.5, [C[0], C[0], C[1]], 0); g.cap(19, 18, 19, 29 - (st > 0 ? 1 : 0), 1.5, [C[0], C[0], C[1]], 0); }
      g.ell(16, sit ? 22 : 19.5, 7 * k, sit ? 7 : 6.5, C, { bias: 0.05 });           // the haunches
      g.line(C[1], 16, sit ? 17 : 14, 16, sit ? 26 : 24);                             // the spine's dip
      g.ell(16, 6.5, 4.5, 4, C, { bias: 0.15 });                                      // the head, from behind
      dogEarsFront(g, B, EAR, 6.5, true);
      if (B.curly) curls(g, B, 16, 18, 7, 8);
      dogTailBack(g, B, C, sit ? 27 : 24, st);
    } else {
      // From the front: the body behind, the legs and the chest, the head with its muzzle.
      g.ell(16, sit ? 20 : 17, 7 * k, sit ? 7.5 : 6, [C[0], C[1], C[1], C[2]], { bias: -0.1 }); // the body beyond
      if (sit) { g.ell(9.5, 26, 3.4, 3, C, { bias: 0 }); g.ell(22.5, 26, 3.4, 3, C, { bias: -0.2 }); } // the haunches at the sides
      else { g.cap(10.5, 20, 10.5, 28, 1.5, [C[0], C[0], C[1]], 0); g.cap(21.5, 20, 21.5, 28, 1.5, [C[0], C[0], C[1]], 0); }
      g.cap(13, 19, 13, 28 - (st > 0 ? 1 : 0), 1.8, LEG, 0.1); g.cap(19, 19, 19, 28 - (st < 0 ? 1 : 0), 1.8, LEG, -0.15);
      g.ell(12.8, 29 - (st > 0 ? 1 : 0), 2, 1.2, LEG, { bias: 0.2 }); g.ell(19.2, 29 - (st < 0 ? 1 : 0), 2, 1.2, LEG, { bias: 0 }); // paws
      g.ell(16, 17, 4.6, 5, [C[1], C[2], C[3], B.chest], { bias: 0.15 });            // the chest
      if (B.chest !== B.coat[2]) g.ell(16, 18, 2.6, 3.4, B.chest, {});
      g.ell(16, 8, 5.2, 4.8, C, { bias: 0.12 });                                      // the head
      if (B.face === 'mask') { g.ell(16, 10, 3.4, 2.6, B.chest, {}); g.set(B.chest, 13, 6); g.set(B.chest, 19, 6); }
      if (B.face === 'blaze') { g.rect(B.chest, 15, 3, 2, 6); g.ell(13.5, 7.5, 1.6, 1.2, C[1], {}); g.ell(18.5, 7.5, 1.6, 1.2, C[1], {}); }
      g.ell(16, 11.2, 2.9, 2.2, MZ, { bias: 0.15 });                                  // the muzzle
      g.rect('outline', 15, 10, 3, 2); g.set('chrome', 15, 10);                       // the nose, its shine
      g.set(MZ[0], 16, 12); g.rect(MZ[0], 15, 13, 3, 1);                              // the mouth
      g.set('outline', 13, 7); g.set('outline', 19, 7); g.set('ivory', 13, 6); g.set('ivory', 19, 6); // the eyes, their light
      dogEarsFront(g, B, EAR, 8, false);
      if (B.curly) { curls(g, B, 16, 5, 4, 2); curls(g, B, 16, 17, 4, 4); }
      if (st && !sit) g.set('pink_hi', 16, 14);                                       // the tongue, trotting
    }
    g.outline('outline');
  }
  function dogEarsFront(g, B, EAR, hy, back) {
    if (B.ears === 'prick') { g.poly([[10, hy - 1], [12, hy - 7], [14, hy - 2]], function (x) { return x < 12 ? EAR[2] : EAR[1]; }); g.poly([[18, hy - 2], [20, hy - 7], [22, hy - 1]], function (x) { return x < 20 ? EAR[2] : EAR[1]; }); if (!back) { g.set('pink', 12, hy - 4); g.set('pink', 20, hy - 4); } }
    else if (B.ears === 'heavy') { g.ell(10, hy + 2, 2.6, 4.4, EAR, { bias: 0.05 }); g.ell(22, hy + 2, 2.6, 4.4, EAR, { bias: -0.15 }); }
    else if (B.ears === 'pom') { g.ell(10, hy + 2.5, 2.6, 4, EAR, { bias: 0.15 }); g.ell(22, hy + 2.5, 2.6, 4, EAR, { bias: 0 }); g.ell(16, hy - 4.2, 3.4, 2.4, EAR, { bias: 0.2 }); }
    else { g.ell(10.6, hy + 1.6, 2.2, 3.8, EAR, { bias: 0.05 }); g.ell(21.4, hy + 1.6, 2.2, 3.8, EAR, { bias: -0.15 }); }
  }
  function dogTailBack(g, B, C, y, st) {
    if (B.tail === 'curl') { g.ell(16, y - 7, 3, 2.6, C, { bias: 0.3 }); g.set(C[1], 16, y - 7); }
    else if (B.tail === 'pom') { g.cap(16, y - 3, 16, y, 1, C, 0.1); g.ell(16, y + 1.5, 2.4, 2, C, { bias: 0.2 }); }
    else if (B.tail === 'low') g.cap(16, y - 2, 16 + st, y + 4, 1.5, C, 0.05);
    else { g.cap(16, y - 2, 16 + st * 2, y + 4, 1.7, C, 0.15); g.set(C[4], 15, y + 1); }
  }
  function curls(g, B, cx, cy, rx, ry) {
    g.over(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, function (x, y, k) { return ((x + (y >> 1) * 2) % 3 === 0 && y % 2 === 0) ? B.coat[0] : (((x + y) % 4 === 1) ? B.coat[2] : ''); });
  }

  function dogSide(g, fr, B, C, MZ, LEG, EAR, k, sit) {
    var st = fr === 1 ? 1 : (fr === 2 ? -1 : 0), FAR = [C[0], C[0], C[1], C[1]], FL = B.paleLegs ? [MZ[0], MZ[0], MZ[1], MZ[2]] : FAR;
    if (sit) {
      // Sitting: the hind leg folded under the haunch, the chest up, the front legs straight.
      dogTailSide(g, B, C, 6, 25, true);
      g.cap(22, 20, 22, 28, 1.6, FL, -0.1);                                            // the far foreleg
      g.ell(13, 22, 7 * k, 6.5 * k, C, { bias: 0.05 });                                // the haunch
      g.poly([[11, 16], [22, 9], [27, 13], [26, 22], [15, 26]], function (x, y) { return tone(C, 0.6 - (x - 11) / 16 * 0.25 - (y - 9) / 17 * 0.25); }); // the back rising
      g.ell(12.5, 22.5, 4.6, 4.2, C, { bias: 0.15 });                                  // the thigh, folded
      g.ell(13, 29, 4.4, 1.3, LEG, { bias: 0.15 });                                    // the hind foot flat
      g.ell(25, 16, 4, 5.5, [C[1], C[2], C[3], B.chest], { bias: 0.2 });                // the chest
      g.cap(25, 19, 25, 28.5, 1.8, LEG, 0.1); g.ell(26, 29.2, 2.2, 1.1, LEG, { bias: 0.2 });
      dogHead(g, B, C, MZ, EAR, 27, 7);
    } else {
      dogTailSide(g, B, C, 7, 12, false, st);
      // The far legs, darker, out of step with the near ones.
      dogLeg(g, 11, 17, -st, FL, true); dogForeleg(g, 27, 18, st, FL, true);
      // The body: the rump, the barrel, the deep chest; the belly tucked up behind.
      g.ell(11.5, 14.5, 5.2 * k, 5.4 * k, C, { bias: 0.1 });
      g.poly([[10, 9.5], [27, 9], [30, 13], [29, 20.5], [23, 20], [16, 18], [11, 19.5]], function (x, y) {
        var v = 0.72 - (y - 9) / 11 * 0.55;
        if (y >= 18 && x > 13 && x < 24) v -= 0.1;
        return tone(C, v);
      });
      g.ell(26, 15.5, 4.6 * k, 5.4 * k, [C[1], C[2], C[3], B.chest], { bias: 0.12 });   // the chest
      if (B.coat[0] !== B.chest && B.paleLegs) g.ell(27, 17, 2.6, 3.4, B.chest, {});
      if (B.tail === 'feather') { g.line(C[3], 15, 19, 22, 20); g.set(C[2], 17, 20); g.set(C[2], 20, 21); } // the belly's feathering
      dogLeg(g, 12, 16.5, st, LEG, false); dogForeleg(g, 25.5, 18, -st, LEG, false);
      dogHead(g, B, C, MZ, EAR, 30, 6.5);
      if (B.curly) curls(g, B, 19, 13, 9, 5);
    }
    g.outline('outline');
  }
  // A hind leg from the hip (hx, hy): the thigh, the angled hock, the paw; d the stride.
  function dogLeg(g, hx, hy, d, K, far) {
    var kx = hx + 1 + d * 1.5, ky = hy + 6, px = hx - 1 + d * 3, py = 29;
    g.cap(hx, hy, kx, ky, far ? 2.2 : 2.8, K, far ? -0.25 : 0.05);
    g.cap(kx, ky, kx - 1.6 + d, ky + 3, 1.4, K, far ? -0.25 : 0);
    g.cap(kx - 1.6 + d, ky + 3, px + 0.5, py - 0.5, 1.3, K, far ? -0.25 : 0);
    g.ell(px + 1.2, py, 2, 1.1, K, { bias: far ? -0.2 : 0.2 });
  }
  function dogForeleg(g, sx, sy, d, K, far) {
    var px = sx + d * 2.5, py = 29;
    g.cap(sx, sy, sx + d * 1.2, sy + 5, far ? 1.7 : 2, K, far ? -0.25 : 0.1);
    g.cap(sx + d * 1.2, sy + 5, px, py - 0.5, 1.5, K, far ? -0.25 : 0.05);
    g.ell(px + 1.2, py, 2, 1.1, K, { bias: far ? -0.2 : 0.2 });
  }
  // The head in profile at (hx, hy) (the skull's centre): the skull, the stop, the muzzle, the
  // nose, the mouth, the eye with its light, the ear.
  function dogHead(g, B, C, MZ, EAR, hx, hy) {
    g.cap(hx - 4, hy + 6, hx - 1, hy + 2, 3.6, C, 0.1);                                // the neck
    g.ell(hx, hy, 4.4, 4, C, { bias: 0.15 });
    g.cap(hx + 3, hy + 1.6, hx + 7, hy + 2.2, 2.1, MZ, 0.15);                          // the muzzle
    g.rect('outline', hx + 8, hy + 1, 2, 2); g.set('chrome', hx + 8, hy + 1);         // the nose
    g.line(MZ[0], hx + 4, hy + 3.6, hx + 7, hy + 3.6);                                // the mouth
    g.set('outline', hx + 1.5, hy - 0.5); g.set('ivory', hx + 1.5, hy - 1.5);         // the eye
    if (B.face === 'blaze') { g.line(B.chest, hx, hy - 3.5, hx + 4, hy - 0.5); }
    if (B.face === 'mask') { g.rect(B.chest, hx + 1, hy + 1, 3, 2); g.set(B.chest, hx + 1, hy - 2); }
    if (B.ears === 'prick') g.poly([[hx - 3.5, hy - 2], [hx - 1.5, hy - 8], [hx + 0.5, hy - 2.5]], function (x) { return x < hx - 1.5 ? EAR[2] : EAR[1]; });
    else if (B.ears === 'heavy') g.ell(hx - 2, hy + 2, 2.6, 4.6, EAR, { bias: 0.05 });
    else if (B.ears === 'pom') { g.ell(hx - 2, hy + 2.5, 2.4, 4, EAR, { bias: 0.15 }); g.ell(hx - 0.5, hy - 3.8, 3, 2, EAR, { bias: 0.25 }); }
    else g.ell(hx - 2, hy + 1.6, 2.1, 3.9, EAR, { bias: 0.05 });
  }
  function dogTailSide(g, B, C, x, y, sit, st) {
    st = st || 0;
    if (B.tail === 'curl') { g.ell(x + 3, y - 3, 3.2, 2.8, C, { bias: 0.25 }); g.set(C[1], x + 3, y - 3); }
    else if (B.tail === 'pom') { g.cap(x + 3, y, x, y - 2, 1, C, 0.1); g.ell(x - 1, y - 3, 2.4, 2.2, C, { bias: 0.2 }); }
    else if (B.tail === 'low') g.cap(x + 3, y, sit ? x - 3 : x - 1, sit ? y + 3 : y + 8, 1.6, C, 0.05);
    else {                                                                              // a feathered plume
      var ex = sit ? x - 5 : x - 4 - st, ey = sit ? y + 3 : y + 5;
      g.cap(x + 3, y, ex, ey, 1.6, C, 0.15);
      for (var i = 0; i < 4; i++) g.set(C[3], x + 1 - i * 1.4 + (sit ? 0 : -st * i * 0.3), y + 2.4 + i * (sit ? 0.6 : 1.3));
    }
  }

  // ---- Rusty ---------------------------------------------------------------------------------
  // 32×48, as the fisher. Old, worn down to the game's mood: a faded trucker cap with a fish
  // patch, grey tufts, round glasses over bagged eyes, a red nose, a yellowing beard, a red
  // flannel shirt, patched overalls with brass buckles and a pencil in the bib pocket, sloping
  // shoulders and a belly. Facing down, the side (right) or up (his back); frames 0 standing,
  // 1 blinking, 2 a sip from his mug, 3 reading the paper.
  var FLAN = ['blood', 'blood', 'crimson', 'rug_hi'], OVR = ['denim_dark', 'denim_dark', 'denim', 'denim_hi', 'denim_lit'];
  var RSK = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], BEARD = ['stone_hi', 'birch', 'paper', 'bone'], CAPF = ['reed_hi', 'paper_dark', 'paper', 'bone'];
  function paintRusty(g, dir, fr) {
    if (dir === 'side') return rustySide(g, fr);
    var back = dir === 'up';
    // Legs and boots (the counter hides them in the shop), the overalls' legs.
    g.fill(10, 34, 12, 8, function (x, y) { return x === 15 || x === 16 ? (y < 36 ? tone(OVR, 0.3) : '') : tone(OVR, 0.7 - (x - 10) / 12 * 0.5); });
    g.ell(12.5, 43.5, 3.2, 2.2, BOOT, { bias: 0.1 }); g.ell(19.5, 43.5, 3.2, 2.2, BOOT, { bias: 0 });
    // The flannel: sloping shoulders, a belly.
    g.poly([[6.5, 22], [10, 18.5], [22, 18.5], [25.5, 22], [26, 30], [25, 35], [7, 35], [6, 30]], function (x, y) {
      var v = 0.62 - (x - 6) / 20 * 0.45 - (y - 18) / 17 * 0.1;
      return tone(FLAN, v);
    });
    g.over(5, 18, 22, 18, function (x, y, k) { return FLAN.indexOf(k) < 0 ? '' : ((x % 5 === 2 && y % 4 === 1) ? 'outline' : ((x % 5 === 2 || y % 4 === 1) ? 'blood' : '')); });
    if (back) {
      g.fill(9, 24, 14, 11, function (x, y) { return (x === 11 || x === 20) && y < 30 ? tone(OVR, 0.5) : (y >= 30 ? tone(OVR, 0.65 - (x - 9) / 14 * 0.4) : ''); }); // the straps crossing
      g.line('denim', 11, 24, 20, 30); g.line('denim', 20, 24, 11, 30);
    } else {
      // The overalls' bib and straps, the buckles, the pocket and its pencil, a patch.
      g.fill(10, 25, 12, 10, function (x, y) { return tone(OVR, 0.72 - (x - 10) / 12 * 0.45 - (y === 25 ? -0.2 : 0)); });
      g.ell(16, 31.5, 8.6, 4.4, OVR, { bias: 0.05, only: false });                     // the belly
      g.rect('denim_dark', 11, 18, 2, 7); g.rect('denim_dark', 19, 18, 2, 7);
      g.rect('denim', 11, 18, 1, 7); g.rect('denim', 19, 18, 1, 7);
      g.slab(10, 24, 3, 2, ['rust', 'leaf_gold', 'brass_hi', 'brass_hi']); g.slab(19, 24, 3, 2, ['rust', 'leaf_gold', 'brass_hi', 'brass_hi']);
      g.rect('denim_dark', 14, 27, 5, 4); g.rect('denim_hi', 14, 27, 5, 1);           // the bib pocket
      g.rect('mustard_hi', 17, 25, 1, 3); g.set('pink', 17, 25);                       // the pencil
      g.rect('olive', 19, 31, 3, 3); g.set('olive_hi', 19, 31);                         // a patch on the belly
      g.rect('wood_dark', 12, 30, 2, 1);                                                // a stain
    }
    // Arms: frame 2 lifts the mug to his mouth; 3 holds the paper up; otherwise his hands rest.
    if (fr === 3 && !back) {
      g.cap(8, 22, 10, 31, 2.3, FLAN, 0); g.cap(24, 22, 22, 31, 2.3, FLAN, -0.2);
      g.slab(6, 26, 20, 10, ['paper_dark', 'paper_dark', 'paper', 'bone', 'cream']);  // the paper, its columns
      for (var y = 28; y < 35; y += 2) { g.rect('stone_hi', 8, y, 7, 1); g.rect('stone_hi', 17, y, 7, 1); }
      g.rect('stone', 8, 27, 16, 1); g.ell(9, 31, 1.8, 1.6, RSK, { bias: 0.1 }); g.ell(23, 31, 1.8, 1.6, RSK, {});
    } else if (fr === 2 && !back) {
      g.cap(7.5, 22, 7, 31, 2.3, FLAN, 0); g.ell(7, 32.5, 1.9, 1.7, RSK, { bias: 0.1 });
      g.cap(24.5, 22, 23, 26, 2.3, FLAN, -0.15); g.cap(23, 26, 19, 18, 2, FLAN, -0.1);
      g.slab(16, 14, 5, 5, ['paper_dark', 'paper', 'bone', 'cream']); g.rect('outline', 21, 15, 1, 3); // the mug at his mouth
      g.ell(19, 19, 1.9, 1.7, RSK, {});
    } else {
      g.cap(7.5, 22, 7, 31, 2.3, FLAN, 0); g.cap(24.5, 22, 25, 31, 2.3, FLAN, -0.2);
      g.ell(7, 32.5, 1.9, 1.7, RSK, { bias: 0.1 }); g.ell(25, 32.5, 1.9, 1.7, RSK, { bias: -0.1 });
      g.set('brass_hi', 24, 32);                                                         // a ring
    }
    // The head: ears, a tired face, the beard, the glasses; then the cap.
    g.ell(10.8, 13, 1.5, 2, RSK, { bias: -0.1 }); g.ell(21.2, 13, 1.5, 2, RSK, { bias: -0.3 });
    if (back) {
      g.ell(16, 12, 5, 5.4, ['stone', 'stone_hi', 'hair_lit', 'bone'], { bias: 0 });
      g.rect('skin_shadow', 13, 16, 6, 2);
    } else {
      var down = fr === 3;
      g.ell(16, 12.3 + (down ? 0.5 : 0), 4.9, 5.4, RSK, { bias: 0.05 });
      g.rect('hair_lit', 10, 9, 2, 5); g.rect('hair_lit', 21, 9, 2, 5); g.set('bone', 10, 9); g.set('stone_hi', 22, 13); // grey tufts
      // The beard and moustache, yellowing at the mouth.
      g.fill(10, 13, 13, 9, function (x, y) { var nx = (x - 16) / 5.4, ny = (y - 14.5) / 6.4; return nx * nx + ny * ny <= 1 && y >= 14 ? tone(BEARD, 0.8 - (x - 10) / 13 * 0.5 - (y > 18 ? 0.15 : 0)) : ''; });
      g.rect('paper_dark', 14, 15, 5, 1); g.rect('mustard_dark', 15, 16, 3, 1);         // the moustache, the stain
      g.set('rug_hi', 16, 13 + (down ? 1 : 0)); g.set('crimson', 16, 14 + (down ? 1 : 0)); g.set('pink_hi', 15, 13); // the red nose
      // Round glasses over bagged eyes; drooping brows.
      var ey = 11 + (down ? 1 : 0);
      for (var s = 0; s < 2; s++) {
        var gx = s ? 18 : 13;
        g.rect('chrome_dark', gx - 1, ey - 1, 3, 1); g.rect('chrome_dark', gx - 1, ey + 1, 3, 1); g.set('chrome_dark', gx - 2, ey); g.set('chrome_dark', gx + 2, ey);
        g.set(fr === 1 || down ? 'skin_shadow' : 'outline', gx, ey); g.set(down ? 'skin_shadow' : 'crt_glow', gx - 1, ey);
        g.set('skin_shadow', gx, ey + 2);                                                 // the bag
        g.line('stone_hi', gx - 2, ey - 2 + (s ? 0 : 1), gx + 1, ey - 2 + (s ? 1 : 0));   // the brow, drooping out
      }
      g.set('chrome_dark', 15, ey); g.set('chrome_dark', 16, ey);
    }
    // The cap: a faded front with a peeling fish patch, the mesh behind, a curved brim, a stain.
    if (back) { g.ell(16, 8.4, 5.6, 4.6, ['olive_dark', 'olive', 'olive_hi', 'olive_lit'], { bias: 0.1 }); g.over(10, 4, 13, 9, function (x, y, k) { return (x + y) % 2 ? 'olive_dark' : ''; }); g.rect('outline', 13, 11, 6, 1); g.rect('chrome', 14, 11, 4, 1); }
    else {
      g.ell(16, 7.4, 5.6, 4.2, ['olive_dark', 'olive', 'olive_hi', 'olive_lit'], { bias: 0.1 });
      g.fill(12, 3, 9, 6, function (x, y) { var nx = (x - 16) / 4, ny = (y - 7) / 4; return nx * nx + ny * ny <= 1 ? tone(CAPF, 0.85 - (y - 3) / 6 * 0.4 - (x - 12) / 9 * 0.2) : ''; });
      g.rect('teal', 14, 6, 4, 2); g.set('teal_lit', 14, 6); g.set('ink', 17, 6); g.set('paper', 18, 7); // the patch, peeling at a corner
      g.set('reed', 13, 4); g.set('reed', 19, 5);                                                       // the sweat stain
      g.ell(16, 9.8, 6.4, 1.6, ['olive_dark', 'olive_dark', 'olive', 'olive_hi'], { bias: 0.1 });
      g.rect('outline', 11, 11 - (fr === 3 ? 0 : 0), 10, 1);
    }
    g.outline('outline');
  }
  function rustySide(g, fr) {
    g.fill(13, 34, 7, 8, function (x) { return tone(OVR, 0.7 - (x - 13) / 7 * 0.4); });
    g.poly([[16, 41], [21.5, 41], [22, 45], [14.5, 45]], function (x) { return tone(BOOT, 0.5 - (x - 14) / 8 * 0.3); });
    g.poly([[11, 22], [14, 18.5], [19, 18.5], [22, 21], [24, 29], [23, 35], [11, 35], [10, 28]], function (x, y) { return tone(FLAN, 0.6 - (x - 10) / 14 * 0.3 - (x < 12 ? 0.2 : 0)); });
    g.over(9, 18, 16, 18, function (x, y, k) { return FLAN.indexOf(k) < 0 ? '' : ((x % 5 === 2 || y % 4 === 1) ? 'blood' : ''); });
    g.fill(15, 25, 9, 10, function (x, y) { var nx = (x - 18) / 6, ny = (y - 30) / 5.4; return nx * nx + ny * ny <= 1 || (y > 25 && x < 22) ? tone(OVR, 0.7 - (x - 15) / 9 * 0.3) : ''; });
    g.rect('denim_dark', 16, 18, 2, 7); g.slab(16, 24, 3, 2, ['rust', 'leaf_gold', 'brass_hi', 'brass_hi']);
    if (fr === 2) { g.cap(16, 22, 20, 25, 2.3, FLAN, 0); g.cap(20, 25, 22, 17, 2, FLAN, 0); g.slab(21, 13, 5, 5, ['paper_dark', 'paper', 'bone', 'cream']); g.ell(22, 18, 1.8, 1.6, RSK, {}); }
    else if (fr === 3) { g.cap(16, 22, 21, 28, 2.3, FLAN, 0); g.slab(19, 22, 6, 12, ['paper_dark', 'paper_dark', 'paper', 'bone', 'cream']); g.ell(21, 28, 1.8, 1.6, RSK, {}); }
    else { g.cap(16, 22, 18, 31, 2.3, FLAN, 0.05); g.ell(18.5, 32.5, 1.9, 1.7, RSK, { bias: 0.1 }); }
    g.ell(14.5, 12, 4, 5, ['stone', 'stone_hi', 'hair_lit', 'bone'], {});
    g.ell(17.5, 12.5, 4, 5.2, RSK, { bias: 0.1 });
    g.ell(15, 13, 1.4, 1.9, RSK, { bias: -0.3 });
    g.fill(14, 13, 10, 9, function (x, y) { var nx = (x - 19) / 4.2, ny = (y - 15) / 5.6; return nx * nx + ny * ny <= 1 && y >= 14 && x > 15 ? tone(BEARD, 0.75 - (y - 14) * 0.05) : ''; });
    g.set('rug_hi', 22, 12); g.set('crimson', 22, 13); g.set('rug_hi', 21, 13);
    g.rect('chrome_dark', 18, 10, 3, 1); g.rect('chrome_dark', 18, 12, 3, 1); g.set('chrome_dark', 17, 11); g.set('chrome_dark', 21, 11);
    g.set(fr === 1 || fr === 3 ? 'skin_shadow' : 'outline', 19, 11); g.set('skin_shadow', 19, 13);
    g.ell(16, 7.4, 5, 4, ['olive_dark', 'olive', 'olive_hi', 'olive_lit'], { bias: 0.1 });
    g.fill(16, 3, 6, 6, function (x, y) { var nx = (x - 17.5) / 3.5, ny = (y - 7) / 4; return nx * nx + ny * ny <= 1 ? tone(CAPF, 0.8 - (y - 3) * 0.06) : ''; });
    g.poly([[20, 8.5], [25.5, 9], [25, 10.6], [20, 10.4]], 'olive');
    g.outline('outline');
  }

  // ---- Phase 116: the people as minis -------------------------------------------------------
  // The fisher and Rusty are drawn for a 32×48 box; a mini view paints them shape by shape (as
  // X.scaled does), the head (above y 17) and the body each at their own scale. Callbacks get
  // the painter's own coordinates.
  // Phase 117: chibi, as the reference has them: the head at 1.45 (Rusty's 1.95), the body at 0.82.
  // Phase 118: the body wider than it is tall (BX), a stout little figure as in the reference.
  var MH = 1.5, MB = 0.78, MBX = 1.15, MY = 17, MC = 24, MW = 48, MHT = 52;
  var MINI = { fisher: [1.7, 0.86, 1.35], rusty: [1.95, 0.82, 1] };
  function useMini(kind) { var m = MINI[kind] || MINI.fisher; MH = m[0]; MB = m[1]; MBX = m[2]; MC = Math.ceil(16 * Math.max(MH, MBX)) + 1; MW = MC * 2; MHT = Math.ceil(mY(48)) + 1; }
  function msc(y) { return y < MY ? MH : MB; }
  function mscx(y) { return y < MY ? MH : MBX; }
  function mY(y) { return 1 + (y < MY ? y * MH : MY * MH + (y - MY) * MB); }
  function mX(x, y) { return MC + (x - 16) * mscx(y); }
  function iY(y) { y -= 1; return y < MY * MH ? y / MH : MY + (y - MY * MH) / MB; }
  function iX(x, sy) { return 16 + (x - MC) / mscx(sy); }
  function Mini(g) { this.g = g; this.w = MW; this.h = MHT; }
  var MQ = Mini.prototype;
  MQ.at = function (x, y) { return this.g.at(Math.round(mX(x, y)), Math.round(mY(y))); };
  MQ.set = function (key, x, y) { this.g.set(key, mX(x, y), mY(y)); return this; };
  MQ.clear = function (x, y) { this.g.clear(mX(x, y), mY(y)); return this; };
  MQ.rect = function (key, x, y, w, h) {
    var cy = y + h / 2, x0 = Math.round(mX(x, cy)), y0 = Math.round(mY(y));
    this.g.rect(key, x0, y0, Math.max(1, Math.round(mX(x + w, cy)) - x0), Math.max(1, Math.round(mY(y + h)) - y0)); return this;
  };
  MQ.fill = function (x0, y0, w, h, fn) {
    var g = this.g, b = Math.floor(mY(y0)), b1 = Math.ceil(mY(y0 + h));
    for (var y = b; y < b1; y++) {
      var sy = Math.floor(iY(y + 0.5)); if (sy < y0 || sy >= y0 + h) continue;
      var a = Math.floor(mX(x0, sy)), a1 = Math.ceil(mX(x0 + w, sy));
      for (var x = a; x < a1; x++) {
        var sx = Math.floor(iX(x + 0.5, sy)); if (sx < x0 || sx >= x0 + w) continue;
        var k = fn(sx, sy, g.at(x, y)); if (k) g.set(k, x, y);
      }
    }
    return this;
  };
  MQ.over = function (x0, y0, w, h, fn) { return this.fill(x0, y0, w, h, function (x, y, cur) { return cur ? fn(x, y, cur) : ''; }); };
  MQ.ell = function (cx, cy, rx, ry, keys, o) { this.g.ell(mX(cx, cy), mY(cy), Math.max(0.6, rx * mscx(cy)), Math.max(0.6, ry * msc(cy)), keys, o); return this; };
  MQ.cap = function (x0, y0, x1, y1, r, keys, bias) { this.g.cap(mX(x0, y0), mY(y0), mX(x1, y1), mY(y1), Math.max(0.55, r * (msc((y0 + y1) / 2) + mscx((y0 + y1) / 2)) / 2), keys, bias); return this; };
  MQ.line = function (key, x0, y0, x1, y1) { this.g.line(key, mX(x0, y0), mY(y0), mX(x1, y1), mY(y1)); return this; };
  MQ.poly = function (pts, fill) {
    var sp = [], i;
    for (i = 0; i < pts.length; i++) sp.push([mX(pts[i][0], pts[i][1]), mY(pts[i][1])]);
    this.g.poly(sp, typeof fill === 'string' ? fill : function (x, y) { var sy = Math.floor(iY(y + 0.5)); return fill(Math.floor(iX(x + 0.5, sy)), sy); }); return this;
  };
  MQ.slab = function (x, y, w, h, keys) {
    var cy = y + h / 2, x0 = Math.round(mX(x, cy)), y0 = Math.round(mY(y));
    this.g.slab(x0, y0, Math.max(2, Math.round(mX(x + w, cy)) - x0), Math.max(2, Math.round(mY(y + h)) - y0), keys); return this;
  };
  MQ.outline = function (key, diag) { this.g.outline(key, diag); return this; };
  MQ.canvas = function () { return this.g.canvas(); };

  // ---- The sprites, baked once per look, facing and frame -------------------------------------
  // kind 'fisher' | 'dog' | 'rusty'; dir 'down' | 'up' | 'left' | 'right'; fr as above; lk the
  // look's id or record (save.look's without it). Returns a canvas; ANCHOR gives its feet.
  var art = {};
  function look(kind, lk) {
    if (kind === 'rusty') return null;
    var list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers;
    return typeof lk === 'object' && lk ? lk : G.data.lookOf(list, lk || (G.state.save && G.state.save.look ? G.state.save.look[kind] : ''));
  }
  function sprite(kind, dir, fr, lk) {
    var L = look(kind, lk), flip = dir === 'left', d = dir === 'left' || dir === 'right' ? 'side' : dir;
    var key = kind + (L ? L.id : '') + d + fr + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr, L), 'x'));
    var w = kind === 'dog' ? (d === 'side' ? DW : 32) : FW, h = kind === 'dog' ? DH : FH, g;
    // Phase 63: the dog at its real size beside the fisher. The poses are drawn for a 40×32
    // box; a scaled grid paints them at the breed's size (data/looks.js size: a golden
    // retriever's back comes to a third of his height, as a real one's comes to a man's hip).
    if (kind === 'dog') { var s = dogScale(L); g = X.grid(Math.ceil(w * s) + 1, Math.ceil(h * s) + 1); paintDog(X.scaled(g, s), d, fr, L); }
    else { useMini(kind); g = X.grid(MW, MHT); var m = new Mini(g); if (kind === 'rusty') paintRusty(m, d, fr); else paintFisher(m, d, fr, L); }
    return (art[key] = g.canvas());
  }
  function dogScale(L) { return (L && L.size ? L.size : 0.7) * 1.45; }                 // Phase 118: a big puppy beside the chibi fisher
  // Where a sprite's feet are within it: [x, y]. lk: the dog's look (its size).
  var anc = [0, 0];
  function anchor(kind, dir, lk) {
    if (kind === 'dog') {
      var s = dogScale(look('dog', lk));
      anc[0] = Math.round((dir === 'left' || dir === 'right' ? 20 : 16) * s); anc[1] = Math.round(30 * s);
      return anc;
    }
    useMini(kind); anc[0] = MC; anc[1] = Math.round(mY(46));
    return anc;
  }
  // Paints a look's fisher or dog in every facing and frame. Returns the ms it took.
  function prebake(kind, lk) {
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0, DS = ['down', 'up', 'right', 'left'];
    for (var i = 0; i < 4; i++) for (var f = 0; f < 4; f++) sprite(kind, DS[i], f, lk);
    return typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  }
  // A soft shadow under feet, baked once: two stepped ellipses.
  var shadowImg = null;
  function shadow(ctx, x, y, w) {
    if (!shadowImg) shadowImg = G.gfx.bake.layer(28, 8, function (c) {
      var g = X.grid(28, 8); g.ell(14, 4, 13, 3.4, 'outline', {}); g.paint(c, 0, 0);
    });
    ctx.globalAlpha = 0.32; ctx.drawImage(shadowImg, Math.round(x - w / 2), Math.round(y - 3), w, 7); ctx.globalAlpha = 1;
  }
  // Draws a walking figure with its feet at (x, y), its shadow under it.
  function drawFigure(ctx, kind, dir, fr, x, y, lk) {
    var img = sprite(kind, dir, fr, lk), a = anchor(kind, dir, lk), ds = kind === 'dog' ? dogScale(look('dog', lk)) : 1;
    shadow(ctx, x, y, kind === 'dog' ? Math.round((dir === 'left' || dir === 'right' ? 26 : 18) * ds) : 26);
    ctx.drawImage(img, Math.round(x - a[0]), Math.round(y - a[1]));
  }

  // The fisher and the dog of a walk at their place (the one further down in front), with
  // their frames from the step. ox, oy: the room's origin; T its tile. Returns their feet's y
  // (for sorting against a room's props): [fisherY, dogY].
  var feet = [0, 0, 0, 0];
  function walkers(st, T, ox, oy) {
    var dg = st.dog, u = st.moving ? st.t : 1;
    feet[0] = ox + (st.c + (st.tc - st.c) * u) * T + T / 2; feet[1] = oy + (st.r + (st.tr - st.r) * u) * T + T - 3;
    feet[2] = ox + (dg.c + (dg.tc - dg.c) * u) * T + T / 2; feet[3] = oy + (dg.r + (dg.tr - dg.r) * u) * T + T - 4;
    return feet;
  }
  function frames(st) {
    var u = st.moving ? st.t : 1, mid = st.moving && u > 0.25 && u < 0.75;
    return [mid ? (st.steps & 1 ? 1 : 2) : 0, st.dog.sit ? 3 : (mid ? (st.steps & 1 ? 2 : 1) : 0)];
  }

  return { walker: walker, heldDir: heldDir, sprite: sprite, anchor: anchor, prebake: prebake, shadow: shadow, drawFigure: drawFigure,
    walkers: walkers, frames: frames, dogScale: function (lk) { return dogScale(look('dog', lk)); }, STEP: STEP, TURN: TURN, DIRS: DIRS };
})();
