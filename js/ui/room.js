var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// What the walk-in rooms share (Phase 56): the bait shop (js/ui/shop_room.js) and the cabin
// (js/ui/cabin_room.js) are both small rooms seen from above at a three-quarter angle, walked
// tile by tile. This file has the walk (lifted from the shop's, Phase 36, unchanged in its
// rules), and the fisher, the dog and Rusty who walk them, as overworld sprites at 2× (Phase
// 120). Every colour a palette key.
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

  // ---- Phase 120: the people as overworld sprites -------------------------------------------
  // The user asked for the rooms' people a little bigger, at the cat's own pixel size, all of a
  // piece, the way a Pokémon game draws its people: small sprites with a dark outline, a big
  // head, a compact body, painted on a grid and shown at 2× (each art pixel 2×2), as the
  // shop's cat is. The fisher and Rusty are 16×26 (32×52 on screen), the dog 22×15 from the
  // side and 14×15 from the front and behind (44×30 and 28×30), so the dog stands longer than
  // the cat curled up and the fisher a head and more over the dog. The look's own keys: the
  // coat, the hat and its shape, the hair, a beard, the skin, the trousers; the breed's coat,
  // ears, tail, muzzle, mask or blaze.
  var PX = 2, BOOTK = ['outline', 'wood_deep', 'wood_dark', 'wood'];
  function hatTop(g, L, dir) {
    var H = [dk(L.hatKeys[0]), L.hatKeys[0], L.hatKeys[1], L.hatKeys[2]], side = dir === 'side', back = dir === 'up';
    if (L.hat === 'cap') {
      g.ell(8, 5.5, 6.2, 4.6, H, { bias: 0.15 });
      if (side) { g.rect(H[1], 9, 8, 6, 2); g.rect(H[2], 9, 8, 5, 1); }                       // the brim, forward
      else if (!back) { g.rect(H[0], 2, 8, 12, 2); g.rect(H[2], 3, 8, 10, 1); g.rect('bone', 6, 4, 4, 2); } // the brim toward us, a patch
      else g.rect(H[0], 6, 8, 4, 1);                                                           // the strap
    } else if (L.hat === 'knit' || L.hat === 'lamp') {
      var K = L.hat === 'lamp' ? ['ink', 'stone_dark', 'stone', 'stone_hi'] : H;
      g.ell(8, 5.5, 6.2, 5, K, { bias: 0.15 }); g.rect(K[1], 2, 8, 12, 2);
      for (var x = 3; x < 14; x += 2) g.set(K[3], x, 8);
      if (L.hat === 'knit') g.ell(side ? 6 : 8, 0.8, 1.8, 1.4, H, { bias: 0.3 });
      else if (side) { g.rect('ink', 12, 5, 3, 3); g.set('lamp_glow', 14, 6); }
      else if (!back) { g.rect('ink', 6, 5, 4, 3); g.set('lamp_glow', 7, 6); g.set('cream', 8, 6); }
    } else {                                                                                    // the bucket
      g.ell(8, 4.8, 5, 4, H, { bias: 0.15 }); g.ell(8, 8, 7.6, 1.8, H, { bias: back ? -0.1 : 0.1 }); g.rect(H[0], 3, 7, 10, 1);
    }
  }
  function trainer(g, dir, fr, L, rusty) {
    var c = L.coat, CO = [dk(c[0]), c[0], c[1], c[2]], k = L.skin, tr = L.trousers || 'stone_dark', TR = [dk(tr), tr, lt(tr)];
    var HAIR = [dk(L.hair), L.hair, lt(L.hair)], st = fr === 1 ? 1 : (fr === 2 ? -1 : 0), s;
    if (rusty) st = 0;
    if (dir === 'side') {
      for (s = 1; s >= 0; s--) {                                                                // the legs scissor, the far one darker
        var d = (s ? -st : st) * 2, x0 = 6 + d;
        g.rect(s ? TR[0] : TR[1], x0, 20, 3, 4); g.rect(BOOTK[s ? 1 : 2], x0, 23, 4, 2); g.rect(BOOTK[3], x0 + 1, 23, 2, 1);
      }
      g.cap(8, 15, 8 - st * 2, 19, 1.3, [CO[0], CO[0], CO[1]], 0); g.set(k[1], 8 - st * 2, 20);   // the far arm
      g.slab(4, 13, 8, 9, CO);                                                                  // the coat
      if (L.check) g.over(4, 13, 8, 9, function (x, y, kk) { return (x % 3 === 0 || y % 3 === 0) && CO.indexOf(kk) >= 0 ? L.check : ''; });
      g.rect(CO[0], 10, 14, 1, 7);
      g.cap(8, 15, 8 + st * 2, 19, 1.4, CO, 0.2); g.ell(8 + st * 2, 20, 1.2, 1.1, k, { bias: 0.2 }); // the near arm, the hand
      g.ell(8.5, 8.5, 5.5, 5.5, k, { bias: 0.2 });                                              // the head
      g.ell(4.5, 9, 2, 3.5, HAIR, { bias: 0.1 });                                               // hair at the back
      g.rect(k[0], 6, 10, 1, 2);                                                                // the ear
      g.rect('outline', 11, 10, 1, 2); g.set(k[3], 13, 11); g.set(k[3], 10, 12);                 // the eye, the nose, a cheek
      if (L.beard) g.ell(11, 12, 2.6, 1.8, [dk(L.beard[0])].concat(L.beard), { bias: 0.2 });
      hatTop(g, L, 'side');
      g.outline('outline');
      return;
    }
    var back = dir === 'up', lift = fr === 1 ? [1, 0] : (fr === 2 ? [0, 1] : [0, 0]);
    if (rusty) lift = [0, 0];
    for (s = 0; s < 2; s++) {                                                                   // the legs and boots
      var lx = s ? 8 : 4, ly = 20 - lift[s];
      g.rect(s ? TR[0] : TR[1], lx, ly, 4, 4); g.rect(s ? TR[1] : TR[2], lx, ly, 1, 3);
      g.rect(BOOTK[2], lx, ly + 3, 4, 2); g.rect(BOOTK[3], lx + 1, ly + 3, 2, 1);
    }
    g.slab(3, 13, 10, 9, CO);                                                                   // the coat
    if (L.check) g.over(3, 13, 10, 9, function (x, y, kk) { return (x % 3 === 0 || y % 3 === 0) && CO.indexOf(kk) >= 0 ? L.check : ''; });
    if (!back) { g.rect(CO[0], 8, 14, 1, 8); g.rect(CO[3], 5, 13, 6, 1); g.set(k[1], 7, 13); g.set(k[1], 8, 13); }
    else { g.rect(CO[0], 8, 15, 1, 7); g.rect(CO[3], 4, 13, 8, 1); }
    if (rusty && !back) { g.rect('denim', 5, 14, 1, 8); g.rect('denim', 10, 14, 1, 8); g.set('brass_hi', 5, 16); g.set('brass_hi', 10, 16); }
    g.rect(CO[2], 1, 14 + st, 2, 6); g.rect(CO[1], 13, 14 - st, 2, 6);                          // the arms, swinging
    g.rect(k[2], 1, 20 + st, 2, 1); g.rect(k[1], 13, 20 - st, 2, 1);                            // the hands
    if (back) {
      g.ell(8, 8.5, 5.6, 5.5, HAIR, { bias: 0.15 }); g.rect(k[1], 6, 13, 4, 1);                 // the back of the head, the nape
      g.set(k[1], 2, 9); g.set(k[1], 13, 9);
    } else {
      g.ell(8, 9, 5.6, 5.2, k, { bias: 0.2 });                                                  // the face
      g.rect(L.hair, 2, 7, 2, 4); g.rect(L.hair, 12, 7, 2, 4);
      if (rusty && fr === 1 || rusty && fr === 3) { g.rect(k[0], 5, 11, 2, 1); g.rect(k[0], 9, 11, 2, 1); }
      else { g.rect('outline', 5, 10, 1, 2); g.rect('outline', 10, 10, 1, 2); g.set('ivory', 5, 10); g.set('ivory', 10, 10); }
      g.set(k[3], 4, 12); g.set(k[3], 11, 12);                                                  // the cheeks
      if (L.beard) { var BD = [dk(L.beard[0])].concat(L.beard); g.ell(8, 12.8, 4.4, 2, BD, { bias: 0.25 }); g.rect(BD[1], 6, 12, 4, 1); }
      else g.rect(k[0], 7, 13, 2, 1);
    }
    hatTop(g, L, back ? 'up' : 'down');
    if (rusty && !back && fr === 2) { g.slab(9, 10, 5, 5, ['outline', 'paper_dark', 'paper', 'cream']); g.rect(k[2], 12, 14, 2, 2); }   // his mug at his mouth
    if (rusty && !back && fr === 3) { g.slab(2, 14, 12, 7, ['paper_dark', 'paper_dark', 'paper', 'bone']); for (var y = 16; y < 20; y += 2) { g.rect('stone_hi', 3, y, 4, 1); g.rect('stone_hi', 9, y, 4, 1); } }
    g.outline('outline');
  }
  function puppy(g, dir, fr, B) {
    var D = [dk(B.coat[0]), B.coat[0], B.coat[1], B.coat[2]], EAR = B.ear, MZ = B.muzzle, LEG = B.paleLegs ? MZ : B.coat, FAR = [D[0], D[0], D[1]];
    var st = fr === 1 ? 1 : (fr === 2 ? -1 : 0), sit = fr === 3;
    if (dir === 'side') {
      var t = B.tail;                                                                           // the tail
      if (t === 'curl') g.ell(3.5, 4, 2, 1.8, D, { bias: 0.3 });
      else if (t === 'pom') { g.line(D[1], 4, 7, 2, 4); g.ell(2, 3.5, 1.6, 1.5, D, { bias: 0.3 }); }
      else if (t === 'low') g.cap(4, 7, 2, 11, 1, D, 0.1);
      else g.cap(4, 7, 1, sit ? 11 : 4 - st, 1.2, D, 0.2);
      if (sit) {
        g.ell(7, 10, 4.5, 3.8, D, { bias: 0.15 });                                              // the haunch
        g.ell(12, 8.5, 3.6, 4.2, D, { bias: 0.2 }); g.rect(B.chest, 13, 8, 2, 4);               // the chest
        g.rect(LEG[1], 12, 11, 2, 3); g.rect(LEG[2], 12, 11, 1, 3); g.rect(LEG[1], 5, 13, 4, 1); // the forelegs, the folded hind paw
        var hx = 14, hy = 4.5;
      } else {
        g.rect(FAR[1], 6 - st, 10, 2, 4); g.rect(FAR[1], 14 + st, 10, 2, 4);                    // the far legs
        g.ell(9.5, 8.5, 7, 3.6, D, { bias: 0.15 });                                             // the body
        g.ell(14.5, 8.5, 3, 3.4, D, { bias: 0.25 }); g.rect(B.chest, 15, 8, 2, 3);
        g.rect(LEG[1], 5 + st, 11, 2, 3); g.rect(LEG[1], 13 - st, 11, 2, 3); g.rect(LEG[2], 5 + st, 11, 1, 2); g.rect(LEG[2], 13 - st, 11, 1, 2);
        hx = 17; hy = 5;
      }
      g.ell(hx, hy, 3.8, 3.4, D, { bias: 0.2 });                                                // the head
      g.ell(hx + 3, hy + 1.3, 2.2, 1.5, MZ, { bias: 0.3 }); g.set('outline', hx + 5, hy + 0.5); // the muzzle, the nose
      g.set('outline', hx + 1, hy - 1); if (st && !sit) g.set('pink_hi', hx + 3, hy + 3);
      if (B.face === 'mask') g.rect(B.chest, hx, hy, 2, 1);
      if (B.face === 'blaze') g.rect(B.chest, hx + 1, hy - 3, 1, 3);
      if (B.ears === 'prick') g.poly([[hx - 2, hy - 2], [hx - 1, hy - 6], [hx + 0.5, hy - 2]], EAR[1]);
      else if (B.ears === 'pom') { g.ell(hx - 2, hy + 1, 1.6, 2.6, EAR, { bias: 0.2 }); g.ell(hx - 0.5, hy - 3, 2.2, 1.5, D, { bias: 0.3 }); }
      else g.ell(hx - 1.8, hy + 1, 1.4, B.ears === 'heavy' ? 3 : 2.4, EAR, { bias: 0.1 });
      if (B.curly) g.over(0, 0, 22, 15, function (x, y, kk) { return D.indexOf(kk) >= 0 && (x + y * 2) % 4 === 0 ? D[1] : ''; });
      g.outline('outline');
      return;
    }
    var back = dir === 'up', cx = 7;
    if (sit) { g.ell(3.5, 12, 2.4, 2.2, D, { bias: 0.1 }); g.ell(10.5, 12, 2.4, 2.2, D, { bias: 0.1 }); }
    g.ell(cx, 10, 4.2, 3.6, back ? D : FAR.concat([D[2]]), { bias: 0.1 });                      // the body
    g.rect(LEG[1], 4, 11 - (st > 0 ? 1 : 0), 2, 3); g.rect(LEG[1], 8, 11 - (st < 0 ? 1 : 0), 2, 3);
    if (back) {
      if (B.tail === 'curl') g.ell(cx, 7.5, 1.8, 1.5, D, { bias: 0.3 }); else g.cap(cx, 10, cx + st, 13.5, 1, D, 0.2);
      g.ell(cx, 4.5, 4, 3.6, D, { bias: 0.2 });
    } else {
      g.ell(cx, 9, 3, 3.2, D, { bias: 0.25 }); g.rect(B.chest, 6, 8, 3, 4);                    // the chest
      g.ell(cx, 4.5, 4.4, 3.8, D, { bias: 0.2 });                                               // the head
      g.ell(cx, 6.5, 2, 1.4, MZ, { bias: 0.3 }); g.rect('outline', 6, 5, 2, 1);                 // the muzzle, the nose
      g.set('outline', 5, 3); g.set('outline', 9, 3);
      if (B.face === 'mask') { g.set(B.chest, 5, 2); g.set(B.chest, 9, 2); }
      if (B.face === 'blaze') g.rect(B.chest, 7, 0, 1, 3);
      if (st) g.set('pink_hi', 7, 8);
    }
    if (B.ears === 'prick') { g.poly([[3, 3], [3.5, -1], [5.5, 2]], EAR[1]); g.poly([[8.5, 2], [10.5, -1], [11, 3]], EAR[1]); }
    else if (B.ears === 'pom') { g.ell(2.6, 5, 1.6, 2.4, EAR, { bias: 0.2 }); g.ell(11.4, 5, 1.6, 2.4, EAR, { bias: 0.2 }); g.ell(cx, 1, 2, 1.3, D, { bias: 0.3 }); }
    else { g.ell(2.8, 5, 1.4, B.ears === 'heavy' ? 3 : 2.4, EAR, { bias: 0.1 }); g.ell(11.2, 5, 1.4, B.ears === 'heavy' ? 3 : 2.4, EAR, { bias: 0.1 }); }
    g.outline('outline');
  }
  var RUSTY_L = { id: 'rusty', coat: ['blood', 'crimson', 'rug_hi'], check: 'blood', hat: 'cap', hatKeys: ['olive_dark', 'olive', 'olive_hi'],
    hair: 'hair_lit', beard: ['stone_hi', 'paper', 'bone'], skin: ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], trousers: 'denim' };

  // ---- The sprites, baked once per look, facing and frame -------------------------------------
  // kind 'fisher' | 'dog' | 'rusty'; dir 'down' | 'up' | 'left' | 'right'; fr as above; lk the
  // look's id or record (save.look's without it). Returns a canvas; ANCHOR gives its feet.
  var art = {};
  function look(kind, lk) {
    if (kind === 'rusty') return null;
    var list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers;
    return typeof lk === 'object' && lk ? lk : G.data.lookOf(list, lk || (G.state.save && G.state.save.look ? G.state.save.look[kind] : ''));
  }
  // Phase 123: the user wants fine detail, not fat pixels, with the people's cozy proportions
  // kept: the same designs are painted at twice their size through a scaled view (X.scaled), so
  // the head, the coat, the hat and the dog's body are rasterised at the full resolution with a
  // 1 px outline and their ramps' shading, while the eyes and small marks keep their single
  // pixels. The fisher and Rusty 32×52, the dog 44×30 from the side and 28×30 front and back.
  function sprite(kind, dir, fr, lk) {
    var L = look(kind, lk), flip = dir === 'left', d = dir === 'left' || dir === 'right' ? 'side' : dir;
    var key = kind + (L ? L.id : '') + d + fr + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr, L), 'x'));
    var g = kind === 'dog' ? X.grid((d === 'side' ? 22 : 14) * PX, 15 * PX) : X.grid(16 * PX, 26 * PX), v = X.scaled(g, PX);
    if (kind === 'dog') puppy(v, d, fr, L); else trainer(v, d, fr, kind === 'rusty' ? RUSTY_L : L, kind === 'rusty');
    return (art[key] = g.canvas());
  }
  // Where a sprite's feet are within it: [x, y]. lk: the dog's look (its size).
  var anc = [0, 0];
  function anchor(kind, dir, lk) {
    if (kind === 'dog') { anc[0] = dir === 'left' || dir === 'right' ? 22 : 14; anc[1] = 29; return anc; }   // Phase 120: at 2×
    anc[0] = 16; anc[1] = 51;                                                               // the fisher and Rusty
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
    shadow(ctx, x, y, kind === 'dog' ? (side ? 34 : 22) : 24);
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
