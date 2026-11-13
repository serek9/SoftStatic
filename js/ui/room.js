var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// What the walk-in rooms share (Phase 56): the bait shop (js/ui/shop_room.js) and the cabin
// (js/ui/cabin_room.js) are both small rooms seen from above at a three-quarter angle, walked
// tile by tile. This file has the walk (lifted from the shop's, Phase 36, unchanged in its
// rules), and the fisher, the dog and Rusty who walk them, painted as the boat paints them
// (Phase 119: js/scene/fisher.js, js/scene/dog.js), in the rooms' three-quarter view. Every
// colour a palette key.
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

  // ---- Phase 119: the fisher and the dog as on the boat ---------------------------------------
  // The user asked for the people of the rooms to look as they do in the boat, in the room's
  // three-quarter view: the boat's own way of painting (js/scene/fisher.js, js/scene/dog.js):
  // soft round shapes shaded by their ramps with 'ink' at the rim, no drawn outline, an eye a
  // single ink pixel, the same keys from the look. The fisher stands 26×44 (his feet at y 42):
  // the boat's head (4.8×5), its round body (7.5×8), its arms as limbs, and the legs and boots
  // the boat hides. The dog 30×24 from the side, 22×24 from the front and behind, sitting as
  // it sits in the bow (the boat's own painting).
  var BA = G.gfx.paint, BOOTB = ['ink', 'wood_deep', 'wood_dark', 'wood'];
  function bootR(L) {
    var c = L.coat, k = L.trousers || 'stone_dark';
    return { COAT: ['ink', c[0], c[1], c[2]], FAR: ['ink', 'ink', c[0], c[1]], SKIN: L.skin, H: L.hatKeys, HAIR: [dk(L.hair), L.hair, lt(L.hair)],
      TR: ['ink', dk(k), k, lt(k)], TF: ['ink', 'ink', dk(k), k] };
  }
  function bChecks(c, L, cx, cy, rx, ry) {
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
      var h = y % 4 === 1, v = x % 4 === 1, nx = (x - cx) / rx, ny = (y - cy) / ry;
      if ((h || v) && nx * nx + ny * ny < 0.7) BA.px(c, h && v ? L.check : L.coat[0], x, y);
    }
  }
  function bHat(c, L, R, dir) {
    var H = R.H, side = dir === 'side', back = dir === 'up';
    if (L.hat === 'cap') {
      BA.blob(c, 13, 6.5, side ? 5 : 5.4, 3.6, H, { bias: 0.1 }); BA.box(c, H[0], side ? 9 : 8, 8, side ? 9 : 11, 1);
      if (side) { BA.box(c, H[1], 15, 8, 5, 2); BA.box(c, H[0], 15, 9, 5, 1); }                       // the brim, forward
      else if (!back) { BA.box(c, H[1], 8, 9, 11, 2); BA.box(c, H[0], 8, 10, 11, 1); }                   // the brim, toward us
      else { BA.box(c, 'ink', 11, 9, 5, 1); }                                                            // the strap
    } else if (L.hat === 'knit' || L.hat === 'lamp') {
      var K = L.hat === 'lamp' ? ['ink', 'stone_dark', 'stone'] : H;
      BA.blob(c, 13, 6.5, side ? 5.2 : 5.6, 4.2, K, { bias: 0.1 }); BA.box(c, K[0], side ? 9 : 8, 8, side ? 9 : 11, 2);
      for (var x = 9; x < 18; x += 2) BA.px(c, K[1], x, 8);
      if (L.hat === 'knit') BA.blob(c, side ? 11.5 : 13, 2.2, 1.8, 1.5, H, { bias: 0.2 });                // the bobble
      else if (side) { BA.box(c, 'ink', 16, 6, 3, 3); BA.px(c, 'lamp_glow', 18, 7); }
      else if (!back) { BA.box(c, 'ink', 11, 6, 5, 3); BA.px(c, 'lamp_glow', 13, 7); BA.px(c, 'cream', 12, 7); }
    } else {                                                                                            // the bucket: a soft crown, the brim all round
      BA.blob(c, 13, 6, 4.6, 3.4, H, { bias: 0.1 }); BA.blob(c, 13, 9, side ? 7.5 : 8, 1.8, H, { bias: back ? -0.1 : 0.05 }); BA.box(c, H[0], 9, 8, 9, 1);
    }
  }
  function boatFisher(c, dir, fr, L) {
    var R = bootR(L), k = L.skin, st = fr === 1 ? 1 : (fr === 2 ? -1 : 0), s;
    if (dir === 'side') {
      // Legs scissoring, the far one darker; boots toe forward.
      for (s = 1; s >= 0; s--) {
        var d = (s ? -st : st) * 3, keys = s ? R.TF : R.TR;
        BA.limb(c, 13, 29, 13 + d * 0.5, 34, 2.7, keys, 0.05); BA.limb(c, 13 + d * 0.5, 34, 13 + d, 38, 2.4, keys, 0);
        var bx = Math.round(13 + d);
        BA.box(c, BOOTB[s ? 0 : 1], bx - 2, 38, 5, 3); BA.box(c, BOOTB[s ? 1 : 2], bx - 2, 38, 5, 1); BA.box(c, 'ink', bx - 2, 41, 7, 1);
      }
      BA.limb(c, 13, 19, 13 - st * 3, 27, 2.2, R.FAR, 0); BA.blob(c, 13 - st * 3, 28.5, 1.6, 1.5, [k[0], k[0], k[1], k[2]], {});   // the far arm
      BA.blob(c, 13, 24, 6, 8, R.COAT, { bias: 0.05 });
      if (L.check) bChecks(c, L, 13, 24, 6, 8);
      BA.box(c, L.coat[0], 16, 18, 1, 12);                                                                // the zip at the front
      BA.limb(c, 13, 19, 13 + st * 3, 27, 2.4, R.COAT, 0.1); BA.blob(c, 13 + st * 3, 28.5, 1.7, 1.6, k, { bias: 0.1 }); // the near arm
      BA.box(c, L.coat[2], 11, 16, 5, 1); BA.box(c, L.coat[0], 12, 17, 4, 1);                            // the collar
      BA.blob(c, 13.5, 12, 4.6, 5, k, { bias: 0.1 });
      BA.blob(c, 9.8, 11.5, 1.8, 3.2, R.HAIR, { bias: 0.1 });                                             // hair at the back
      BA.px(c, k[0], 11, 12); BA.px(c, 'ink', 16, 11); BA.px(c, k[3], 16, 12); BA.px(c, k[1], 18, 13); BA.box(c, k[1], 15, 15, 2, 1);
      if (L.beard) BA.blob(c, 15, 15, 3, 2.2, L.beard, { bias: 0.1 });
      bHat(c, L, R, 'side');
      return;
    }
    var back = dir === 'up', lift = fr === 1 ? [2, 0] : (fr === 2 ? [0, 2] : [0, 0]);
    for (s = 0; s < 2; s++) {
      var lx = s ? 15.5 : 10.5, ly = 38 - lift[s];
      BA.limb(c, lx, 29, lx, ly, 2.6, s ? R.TF : R.TR, s ? -0.1 : 0.05);
      BA.box(c, BOOTB[1], lx - 2.5, ly, 5, 3); BA.box(c, BOOTB[2], lx - 2.5, ly, 5, 1); BA.box(c, 'ink', lx - 2.5, ly + 3, 5, 1);
    }
    BA.blob(c, 13, 24, 7.5, 8, R.COAT, { bias: 0.05 });
    if (L.check) bChecks(c, L, 13, 24, 7.5, 8);
    if (!back) { BA.box(c, L.coat[0], 13, 18, 1, 13); BA.box(c, L.coat[2], 10, 16, 7, 1); BA.box(c, L.coat[0], 11, 17, 5, 1); BA.px(c, 'chrome_hi', 13, 20); }
    else { BA.box(c, L.coat[0], 13, 20, 1, 11); BA.box(c, L.coat[2], 9, 18, 9, 1); }
    // The arms at his sides, swinging against the legs; the hands.
    BA.limb(c, 6.5, 19, 5.5, 27 + st, 2.4, R.COAT, 0.1); BA.limb(c, 19.5, 19, 20.5, 27 - st, 2.4, R.FAR, 0);
    BA.blob(c, 5.5, 28.5 + st, 1.7, 1.6, k, { bias: 0.1 }); BA.blob(c, 20.5, 28.5 - st, 1.7, 1.6, k, { bias: -0.1 });
    if (back) {
      BA.box(c, k[1], 11, 15, 5, 2);                                                                     // the nape
      BA.blob(c, 13, 11.5, 4.8, 4.8, R.HAIR, { bias: 0.05 });
      BA.px(c, k[1], 8, 12); BA.px(c, k[1], 18, 12);                                                     // the ears
    } else {
      BA.blob(c, 13, 12, 4.8, 5, k, { bias: 0.1 });
      BA.px(c, k[0], 8, 12); BA.px(c, k[0], 18, 12);
      BA.box(c, L.hair, 8, 9, 2, 3); BA.box(c, L.hair, 17, 9, 2, 3);
      BA.px(c, 'ink', 11, 12); BA.px(c, 'ink', 15, 12);
      BA.px(c, k[1], 13, 13); BA.box(c, k[1], 12, 15, 3, 1);
      if (L.beard) BA.blob(c, 13, 15.2, 4, 2.4, L.beard, { bias: 0.1 });
    }
    bHat(c, L, R, back ? 'up' : 'down');
  }
  function boatDog(c, dir, fr, B) {
    var D = B.coat, EAR = B.ear, MZ = B.muzzle, b = B.bulk, LEG = B.paleLegs ? MZ : D, FAR = [D[0], D[0], D[1]], st = fr === 1 ? 1 : (fr === 2 ? -1 : 0), sit = fr === 3;
    if (dir === 'side') {
      // Standing or trotting: the tail, the far legs, the body and chest, the near legs, the head.
      var t = B.tail;
      if (t === 'curl') { BA.limb(c, 6, 10, 5, 5, 1.4, D, 0.1); BA.limb(c, 5, 5, 8, 4, 1.3, D, 0.2); }
      else if (t === 'low') BA.limb(c, 6, 11, 3, 16, 1.7, D, 0);
      else if (t === 'pom') { BA.limb(c, 6, 10, 4, 7, 0.9, D, 0.1); BA.blob(c, 3.5, 6.5, 1.9, 1.8, D, { bias: 0.15 }); }
      else BA.limb(c, 6, 10, 2, 7 - st, 1.4, D, 0.1);
      BA.limb(c, 9, 13, 9 - st * 2, 21, 1.4, FAR, 0); BA.limb(c, 19, 13, 19 + st * 2, 21, 1.4, FAR, 0);
      BA.blob(c, 13, 12, 7.5 * b, 4.2 * b, D, { bias: 0.05 });
      BA.blob(c, 19, 12.5, 3.6 * b, 4 * b, D, { bias: 0.15 }); BA.box(c, B.chest, 20, 12, 2, 3);
      BA.limb(c, 10, 14, 10 + st * 2, 21, 1.5, LEG, 0.1); BA.limb(c, 18, 14, 18 - st * 2, 21, 1.5, LEG, 0.1);
      BA.box(c, LEG[1], 9 + st * 2, 21, 3, 1); BA.box(c, LEG[1], 17 - st * 2, 21, 3, 1);
      BA.limb(c, 19, 10, 21, 6.5, 2.4 * b, D, 0.15);                                                     // the neck
      var hx = 22, hy = 5;
      BA.blob(c, hx, hy, 4, 3.6, D, { bias: 0.1 });
      BA.blob(c, hx + 3.6, hy + 1.4, 2.6, 1.7, MZ, { bias: 0.25 });
      if (B.face === 'mask') BA.box(c, B.chest, hx, hy, 3, 1);
      if (B.face === 'blaze') BA.box(c, B.chest, hx + 2, hy - 3, 1, 3);
      BA.px(c, 'ink', hx + 6, hy + 1); BA.px(c, 'ink', hx + 1, hy - 1);
      if (B.ears === 'prick') BA.limb(c, hx - 1, hy - 2, hx - 0.5, hy - 6, 1.4, EAR, 0.1);
      else if (B.ears === 'heavy') BA.limb(c, hx - 2, hy - 2, hx - 3.2, hy + 2.8, 1.9, EAR, 0);
      else if (B.ears === 'pom') { BA.blob(c, hx - 2.6, hy + 1.4, 1.9, 3.1, EAR, { bias: 0.15 }); BA.blob(c, hx - 0.5, hy - 3.2, 2.6, 1.8, D, { bias: 0.2 }); }
      else BA.limb(c, hx - 2, hy - 2, hx - 3, hy + 2, 1.4, EAR, 0);
      if (st) BA.px(c, 'pink_hi', hx + 4, hy + 3);
      return;
    }
    var back = dir === 'up';
    // From the front or behind: the body beyond, the legs, the chest (or the haunches), the head.
    BA.blob(c, 11, sit ? 15 : 13, 5.5 * b, sit ? 5.5 : 5, back ? D : [D[0], D[0], D[1]], { bias: 0.05 });
    if (sit) { BA.blob(c, 6, 19, 3, 2.6, D, { bias: 0.1 }); BA.blob(c, 16, 19, 3, 2.6, D, { bias: -0.1 }); }
    BA.limb(c, 8.5, 14, 8.5, 21 - (st > 0 ? 1 : 0), 1.5, LEG, 0.1); BA.limb(c, 13.5, 14, 13.5, 21 - (st < 0 ? 1 : 0), 1.5, LEG, -0.1);
    BA.box(c, LEG[1], 7, 21 - (st > 0 ? 1 : 0), 3, 1); BA.box(c, LEG[1], 12, 21 - (st < 0 ? 1 : 0), 3, 1);
    if (back) {
      BA.blob(c, 11, 14, 5 * b, 5, D, { bias: 0.1 });                                                    // the haunches
      if (B.tail === 'curl') BA.blob(c, 11, 9, 2.4, 2, D, { bias: 0.3 }); else BA.limb(c, 11, 15, 11 + st, 20, 1.3, D, 0.1);
      BA.blob(c, 11, 6, 4, 3.6, D, { bias: 0.1 });
    } else {
      BA.blob(c, 11, 12, 3.8 * b, 4.2 * b, D, { bias: 0.15 }); BA.box(c, B.chest, 10, 11, 3, 4);
      BA.blob(c, 11, 6, 4.2, 3.8, D, { bias: 0.1 });
      BA.blob(c, 11, 8, 2.4, 1.6, MZ, { bias: 0.25 }); BA.box(c, 'ink', 10, 7, 3, 1);
      if (B.face === 'mask') { BA.px(c, B.chest, 9, 5); BA.px(c, B.chest, 13, 5); }
      if (B.face === 'blaze') BA.box(c, B.chest, 11, 2, 1, 4);
      BA.px(c, 'ink', 9, 5); BA.px(c, 'ink', 13, 5);
      if (st) BA.px(c, 'pink_hi', 11, 9);
    }
    if (B.ears === 'prick') { BA.limb(c, 8, 4, 7.5, 0.5, 1.3, EAR, 0.1); BA.limb(c, 14, 4, 14.5, 0.5, 1.3, EAR, 0.1); }
    else if (B.ears === 'heavy') { BA.blob(c, 6.6, 7, 1.7, 3, EAR, { bias: 0.1 }); BA.blob(c, 15.4, 7, 1.7, 3, EAR, { bias: 0.1 }); }
    else if (B.ears === 'pom') { BA.blob(c, 6.6, 7.5, 1.8, 3, EAR, { bias: 0.15 }); BA.blob(c, 15.4, 7.5, 1.8, 3, EAR, { bias: 0.15 }); BA.blob(c, 11, 2.5, 2.6, 1.8, D, { bias: 0.2 }); }
    else { BA.limb(c, 7.5, 4, 6.8, 8.5, 1.4, EAR, 0); BA.limb(c, 14.5, 4, 15.2, 8.5, 1.4, EAR, 0); }
  }

  // Rusty as the boat would paint him: the red flannel (its check in blood), an olive cap, grey
  // tufts and a white beard. fr 0 still, 1 a blink, 2 a sip from his mug, 3 reading the paper.
  var RUSTY_L = { id: 'rusty', coat: ['blood', 'crimson', 'rug_hi'], check: 'blood', hat: 'cap', hatKeys: ['olive_dark', 'olive', 'olive_hi'],
    hair: 'hair_lit', beard: ['stone_hi', 'paper', 'bone'], skin: ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], trousers: 'denim' };
  function boatRusty(c, dir, fr) {
    boatFisher(c, dir, 0, RUSTY_L);
    var k = RUSTY_L.skin;
    if (dir !== 'down') return;
    BA.box(c, 'denim', 9, 17, 2, 10); BA.box(c, 'denim', 16, 17, 2, 10); BA.px(c, 'brass_hi', 9, 21); BA.px(c, 'brass_hi', 16, 21);   // the overall straps
    if (fr === 1) { BA.px(c, k[1], 11, 12); BA.px(c, k[1], 15, 12); }                                // a blink
    if (fr === 2) { BA.box(c, 'ink', 14, 13, 6, 6); BA.box(c, 'cream', 15, 14, 4, 4); BA.box(c, 'paper_dark', 18, 14, 1, 4); BA.blob(c, 19, 19, 1.7, 1.6, k, {}); }  // the mug at his mouth
    if (fr === 3) {                                                                                    // the paper held up, his eyes down on it
      BA.px(c, k[1], 11, 12); BA.px(c, k[1], 15, 12);
      BA.box(c, 'paper_dark', 4, 18, 18, 11); BA.box(c, 'paper', 5, 18, 16, 10); BA.box(c, 'stone', 6, 19, 14, 1);
      for (var y = 21; y < 28; y += 2) { BA.box(c, 'stone_hi', 6, y, 6, 1); BA.box(c, 'stone_hi', 14, y, 6, 1); }
      BA.blob(c, 4, 23, 1.7, 1.6, k, {}); BA.blob(c, 22, 23, 1.7, 1.6, k, {});
    }
  }

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
    if (kind === 'dog') {
      if (d === 'side' && fr === 3) return (art[key] = G.scene.dog.art('idle', 0, false, L));            // sitting, as in the bow
      return (art[key] = G.gfx.bake.layer(d === 'side' ? 30 : 22, 24, function (c) { BA.reset(); boatDog(c, d, fr, L); BA.reset(); }));
    }
    return (art[key] = G.gfx.bake.layer(26, 44, function (c) { BA.reset(); if (kind === 'rusty') boatRusty(c, d, fr); else boatFisher(c, d, fr, L); BA.reset(); }));
  }
  // Where a sprite's feet are within it: [x, y]. lk: the dog's look (its size).
  var anc = [0, 0];
  function anchor(kind, dir, lk) {
    if (kind === 'dog') { anc[0] = dir === 'left' || dir === 'right' ? 13 : 11; anc[1] = 22; return anc; }   // Phase 119: the boat's dog
    anc[0] = 13; anc[1] = 41;                                                               // the fisher and Rusty
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
    var img = sprite(kind, dir, fr, lk), a = anchor(kind, dir, lk), side = dir === 'left' || dir === 'right';
    if (kind === 'dog' && side && fr === 3) { a[0] = 12; a[1] = 19; }                     // the bow's sitting painting
    shadow(ctx, x, y, kind === 'dog' ? (side ? 22 : 14) : (kind === 'fisher' ? 18 : 26));
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
    walkers: walkers, frames: frames, STEP: STEP, TURN: TURN, DIRS: DIRS };
})();
