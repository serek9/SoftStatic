var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// What the walk-in rooms share (Phase 56): the bait shop (js/ui/shop_room.js) and the cabin
// (js/ui/cabin_room.js) are both small rooms seen from above at a three-quarter angle, walked
// tile by tile. This file has the walk (lifted from the shop's, Phase 36, unchanged in its
// rules), and the fisher, the dog and Rusty who walk them, as the user drew them (Phase 124,
// js/gfx/people_art.js). Every colour a palette key.
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
  var tone = X.tone;
  function dk(k) { return S.shift(k, -1); }
  function lt(k) { return S.shift(k, 1); }

  // ---- The sprites, baked once per look, facing and frame -------------------------------------
  // kind 'fisher' | 'dog' | 'rusty'; dir 'down' | 'up' | 'left' | 'right'; fr as above; lk the
  // look's id or record (save.look's without it). Returns a canvas; ANCHOR gives its feet.
  var art = {};
  function look(kind, lk) {
    if (kind === 'rusty') return null;
    var list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers;
    return typeof lk === 'object' && lk ? lk : G.data.lookOf(list, lk || (G.state.save && G.state.save.look ? G.state.save.look[kind] : ''));
  }
  // Phase 124: the people as the user drew them (their character sheet, js/gfx/people_art.js),
  // pixel for pixel: the fisher 30-32×53, Rusty 33-37×55, the dog sitting 31-40×38. A look
  // other than the first recolours the fisher by the art's roles (the coat, the hat, the hair,
  // the skin, the trousers onto the look's ramps, each pixel at its level); a breed other than
  // the golden recolours the dog's coat. Walking: the fisher lifts a boot a pixel, the other
  // stride the other; the dog, who sits in every drawing, bobs a pixel as it trots. Rusty's
  // frames: 1 his eyes shut (they are, smiling), 2 his mug raised, 3 the paper.
  var ART_CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ';
  function rampOf(kind, role, L) {
    if (kind === 'dog') return [dk(L.coat[0]), L.coat[0], L.coat[1], L.coat[2], lt(L.coat[2])];
    if (role === 'coat') return [dk(L.coat[0]), L.coat[0], L.coat[1], L.coat[2], lt(L.coat[2])];
    if (role === 'hat') return [dk(L.hatKeys[0]), L.hatKeys[0], L.hatKeys[1], L.hatKeys[2]];
    if (role === 'hair') return [dk(L.hair), L.hair, lt(L.hair)];
    if (role === 'skin') return L.skin.concat([lt(L.skin[3])]);
    if (role === 'trousers') { var k = L.trousers || 'stone_dark'; return [dk(k), k, lt(k)]; }
    return null;
  }
  function artKeys(kind, L) {
    var A = G.gfx.peopleArt[kind], list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers;
    if (kind === 'rusty' || !A.roles || !L || L.id === list[0].id) return A.keys;
    var out = [];
    for (var i = 0; i < A.keys.length; i++) { var r = rampOf(kind, A.roles[i], L); out.push(r ? X.tone(r, A.levels[i]) : A.keys[i]); }
    return out;
  }
  function lumKey(k) { var h = parseInt(P_[k].slice(1), 16); return 0.3 * (h >> 16) + 0.59 * ((h >> 8) & 255) + 0.11 * (h & 255); }
  var P_ = S.PALETTE, TOPM = 6, SIDEM = 4;                       // the margin round each drawing (a bobble, an ear, a stride)
  // Phase 125: a walk that reads as a walk. The fisher: from the front or behind a stride lifts
  // one leg two pixels and his body sinks a pixel; from the side his legs part, one forward and
  // one back. The dog sits in every drawing: walking, it trots on its feet from every side (a
  // body and chest, four legs stepping in pairs, a tail that wags, the drawing's head bobbing),
  // in the drawing's keys.
  function stamp(g, rows, keys, x0, y0, fn) {
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      var ch = rows[y][x]; if (ch === '.') continue;
      var d = fn ? fn(x, y) : null;
      if (d === false) continue;
      g.set(keys[ART_CH.indexOf(ch)], x0 + x + (d ? d[0] : 0), y0 + y + (d ? d[1] : 0));
    }
  }
  function firstRow(rows, roles, role) {
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) { var ch = rows[y][x]; if (ch !== '.' && roles[ART_CH.indexOf(ch)] === role) return y; }
    return rows.length;
  }
  function rampKeys(keys) {                                      // the drawing's keys from dark to light
    return keys.slice().sort(function (a, b) { return lumKey(a) - lumKey(b); });
  }
  // ---- Phase 127: every look and breed as the user drew it ---------------------------------------
  // The first sheet gives the red-cap fisher and the golden; the user's second sheet
  // (G.gfx.peopleArt.looks) the knit hat, the rain hat and the headlamp, the husky, the St.
  // Bernard and the curly dog, each its own drawing in its own keys (Phase 126's hats, beards,
  // coats and breeds painted over the first drawing are gone). A look without a drawing falls
  // back to the first drawing recoloured (artKeys).
  function drawn(kind, L) {
    var D = G.gfx.peopleArt.looks;
    return kind !== 'rusty' && L && D && D[L.id] ? D[L.id] : null;
  }
  var VIEW = { down: 0, right: 1, up: 2, left: 3 };

  // The sitting drawing of a kind, a facing and a look, on a grid with its margins (TOPM, SIDEM),
  // with its look's or breed's own pieces.
  function sitGrid(kind, dir, L) {
    var D = drawn(kind, L), rows = (D || G.gfx.peopleArt[kind])[dir], keys = D ? D.keys : artKeys(kind, L);
    var g = X.grid(rows[0].length + 2 * SIDEM, rows.length + TOPM + 1);
    stamp(g, rows, keys, SIDEM, TOPM, null);
    return g;
  }
  // The trotting dog, from the side (44×34), the front or behind (36×36): a body, four legs in
  // pairs, a tail that wags, and the sitting drawing's head, in the drawing's own keys (Phase 127:
  // a drawn breed's two ramps, D.coat and D.pale; its head placed by the golden's).
  function dogTrot(keys, A, dir, fr, B, golden, D) {
    var order = rampKeys(keys), OUT = order[0], st = fr === 1 ? 1 : -1, g, bob = fr === 1 ? -1 : 0;
    var WHITE = D ? D.pale : ['paper_dark', 'paper', 'bone', 'cream', 'ivory'], COAT = D ? D.coat : [dk(B.coat[0]), B.coat[0], B.coat[1], B.coat[2], lt(B.coat[2])];
    var C = golden ? order.slice(3) : COAT, FAR = golden ? order.slice(2, 7) : COAT.slice(0, 3), LEGC = B.id === 'husky' || B.id === 'saint' ? WHITE : C, BODY = B.id === 'saint' ? WHITE : C;
    var CHEST = B.id === 'golden' || (B.id === 'poodle' && !D) ? C : WHITE, TAIL = D && B.tail === 'pom' ? 'feather' : B.tail;
    var hv = dir === 'left' ? 'right' : dir, head = sitGrid('dog', hv, golden ? null : B), GR = G.gfx.peopleArt.dog[hv], HR = (D || A)[hv];
    var sx = HR[0].length / GR[0].length, sy = HR.length / GR.length, dx = hv === 'right' ? GR[0].length - HR[0].length : (GR[0].length - HR[0].length) >> 1;
    function paste(x0, y0, keep) { for (var y = 0; y < head.h; y++) for (var x = 0; x < head.w; x++) { var k = head.at(x, y); if (k && keep((x - SIDEM) / sx, (y - TOPM) / sy)) g.set(k, x0 + dx + x - SIDEM, y0 + y - TOPM); } }
    if (dir === 'right' || dir === 'left') {
      g = X.grid(44, 36);
      if (TAIL === 'curl') { g.ell(8, 15, 4.5, 4, C, { bias: 0.25 }); g.ell(8, 15, 2, 1.8, WHITE, {}); }
      else if (TAIL === 'pom') { g.cap(9, 18, 6, 13 - st, 1.2, C, 0.2); g.ell(5, 12 - st, 3.5, 3.5, C, { bias: 0.3 }); }
      else if (TAIL === 'low') g.cap(9, 19, 5 - st, 27, 2.2, C, 0.15);
      else { g.cap(9, 18, 3, 10 - st * 2, 2.4, C, 0.2); g.cap(3, 10 - st * 2, 1 + st, 7 - st * 2, 1.7, C, 0.3); }      // the plume, wagging
      g.cap(13, 24, 13 - st * 4, 33, 1.7, FAR, 0); g.cap(27, 24, 27 + st * 4, 33, 1.7, FAR, 0);                           // the far legs
      g.ell(13 - st * 4, 33.8, 2, 1.1, FAR, {}); g.ell(27 + st * 4, 33.8, 2, 1.1, FAR, {});
      g.ell(19, 22, 12, 6.2, BODY, { bias: 0.2 });                                                                         // the body
      if (B.id === 'saint') g.ell(18, 20, 9, 4.5, COAT, { bias: 0.25 });                                                    // its saddle
      if (B.id === 'husky') g.ell(20, 26, 9, 2.5, WHITE, { bias: 0.2 });                                                    // a pale belly
      g.ell(28, 21.5, 5, 6, CHEST, { bias: 0.3 });                             // the chest
      g.cap(10, 24, 10 + st * 4, 33, 2, LEGC, 0.1); g.cap(30, 24, 30 - st * 4, 33, 2, LEGC, 0.15);                         // the near legs
      g.ell(10.5 + st * 4, 33.8, 2.4, 1.3, LEGC, { bias: 0.2 }); g.ell(30.5 - st * 4, 33.8, 2.4, 1.3, LEGC, { bias: 0.2 });
      g.cap(29, 19, 32, 13, 4, B.id === 'saint' ? COAT : C, 0.25);                                                         // the neck
      paste(4, 1 + bob, function (x, y) { return x >= 14 && y < 17; });                                                    // the head
      if (B.curly && !D) g.over(0, 0, 44, 36, function (x, y, k) { return lumKey(k) > 120 && ((x * 5 + y * 3) % 7 === 0) ? C[1] : ''; });
      g.outline(OUT);
      return g.canvas();
    }
    g = X.grid(36, 38);
    var front = dir === 'down';
    if (!front) {
      paste(2, 0, function (x, y) { return y < 19; });                                                                     // the head beyond
      g.ell(18, 25, 9, 8, BODY, { bias: 0.15 });                                                                           // the rump
      if (B.id === 'saint') g.ell(18, 22, 8, 5, COAT, { bias: 0.25 });
      g.cap(13, 28, 13, 35 - (st > 0 ? 2 : 0), 2.2, LEGC, 0.1); g.cap(23, 28, 23, 35 - (st < 0 ? 2 : 0), 2.2, LEGC, -0.1);
      g.ell(13, 36 - (st > 0 ? 2 : 0), 2.4, 1.2, LEGC, {}); g.ell(23, 36 - (st < 0 ? 2 : 0), 2.4, 1.2, LEGC, {});
      if (TAIL === 'curl') { g.ell(18, 21, 4.5, 4, C, { bias: 0.25 }); g.ell(18, 21, 2, 1.6, WHITE, {}); }
      else if (TAIL === 'pom') { g.cap(18, 22, 18 + st * 2, 17, 1.2, C, 0.2); g.ell(18 + st * 2, 15, 3.5, 3.2, C, { bias: 0.3 }); }
      else g.cap(18, 21, 18 + st * 4, 13, 2.2, C, 0.3);                                                                   // the tail, wagging
    } else {
      g.cap(13, 26, 13, 34, 1.6, FAR, 0); g.cap(23, 26, 23, 34, 1.6, FAR, 0);                                             // the hind legs, beyond
      g.ell(18, 25, 8, 7, CHEST, { bias: 0.2 });                              // the chest
      g.cap(14.5, 26, 14.5, 35 - (st > 0 ? 2 : 0), 2.1, LEGC, 0.15); g.cap(21.5, 26, 21.5, 35 - (st < 0 ? 2 : 0), 2.1, LEGC, -0.05);
      g.ell(14.5, 36 - (st > 0 ? 2 : 0), 2.4, 1.2, LEGC, { bias: 0.2 }); g.ell(21.5, 36 - (st < 0 ? 2 : 0), 2.4, 1.2, LEGC, {});
      paste(2, 2 + bob, function (x, y) { return y < 19; });                                                               // the head
    }
    if (B.curly && !D) g.over(0, 0, 36, 38, function (x, y, k) { return lumKey(k) > 120 && ((x * 5 + y * 3) % 7 === 0) ? C[1] : ''; });
    g.outline(OUT);
    return g.canvas();
  }
  function sprite(kind, dir, fr, lk) {
    var L = look(kind, lk), key = kind + (L ? L.id : '') + dir + fr;
    if (art[key]) return art[key];
    var D = drawn(kind, L), A = D || G.gfx.peopleArt[kind], list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers, plain = !L || L.id === list[0].id;
    var rows = A[dir], keys = D ? D.keys : artKeys(kind, L), h = rows.length, w = rows[0].length, side = dir === 'left' || dir === 'right';
    var moving = fr === 1 || fr === 2, g, x0 = SIDEM, y0 = TOPM, cx = w / 2;
    if (kind === 'dog' && moving) {
      if (dir === 'left') return (art[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr, lk), 'x'));
      return (art[key] = dogTrot(keys, A, dir, fr, L || list[0], plain, D));
    }
    if (kind === 'dog') return (art[key] = sitGrid(kind, dir, L).canvas());
    g = X.grid(w + 2 * SIDEM, h + TOPM + 1);
    var legTop = kind !== 'fisher' ? h : (D ? D.legs[VIEW[dir]] : firstRow(rows, A.roles, 'trousers')), sink = kind === 'fisher' && moving ? 1 : 0;
    if (moving && kind === 'fisher') {
      stamp(g, rows, keys, x0, y0, function (x, y) {                                    // the legs, then the body over them, sunk a pixel
        if (y < legTop) return false;
        if (side) return [x < cx ? -2 : 2, 0];
        return [0, ((x < cx) === (fr === 1)) ? -2 : 0];
      });
    }
    var body = X.grid(g.w, g.h);
    stamp(body, rows, keys, x0, y0, moving && kind === 'fisher' ? function (x, y) { return y >= legTop ? false : null; } : null);
    for (var yy = 0; yy < body.h; yy++) for (var xx = 0; xx < body.w; xx++) { var kk = body.at(xx, yy); if (kk) g.set(kk, xx, yy + sink); }
    if (kind === 'rusty' && dir === 'down' && fr === 2) {                                // his mug at his mouth, his hand round it
      var mx = x0 + (w >> 1) + 2, my = y0 + 17;
      g.rect('outline', mx - 1, my - 1, 9, 9); g.slab(mx, my, 7, 7, ['paper_dark', 'paper', 'bone', 'cream']); g.rect('cedar_dark', mx + 1, my + 1, 5, 1); g.rect('outline', mx + 7, my + 2, 2, 4);
      g.ell(mx + 7, my + 7, 2.2, 2, ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], { bias: 0.2 });
    }
    if (kind === 'rusty' && dir === 'down' && fr === 3) {                                // the paper held up
      g.rect('outline', x0 + 4, y0 + 30, w - 8, 12); g.slab(x0 + 5, y0 + 31, w - 10, 10, ['paper_dark', 'paper_dark', 'paper', 'bone']);
      for (var y2 = y0 + 33; y2 < y0 + 40; y2 += 2) { g.rect('stone_hi', x0 + 7, y2, (w >> 1) - 9, 1); g.rect('stone_hi', x0 + (w >> 1) + 1, y2, (w >> 1) - 9, 1); }
    }
    return (art[key] = g.canvas());
  }
  // Where a sprite's feet are within it: [x, y]. lk: the dog's look (its size).
  var anc = [0, 0];
  function anchor(kind, dir, lk) {
    var rows = (drawn(kind, look(kind, lk)) || G.gfx.peopleArt[kind])[dir];
    anc[0] = (rows[0].length >> 1) + SIDEM; anc[1] = rows.length - 1 + TOPM;                // the feet at the drawing's foot
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
    if (kind === 'dog' && (fr === 1 || fr === 2)) { if (side) { a[0] = 22; a[1] = 34; } else { a[0] = 18; a[1] = 36; } }   // the trotting dog
    shadow(ctx, x, y, kind === 'dog' ? (side ? 32 : 26) : 24);
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
    // Phase 126: the dog trots through the whole step (two phases a step), never sitting between steps.
    var dogFr = st.dog.sit ? 3 : (st.moving ? ((u < 0.5) === !!(st.steps & 1) ? 1 : 2) : 0);
    return [mid ? (st.steps & 1 ? 1 : 2) : 0, dogFr];
  }

  return { walker: walker, heldDir: heldDir, sprite: sprite, anchor: anchor, prebake: prebake, shadow: shadow, drawFigure: drawFigure,
    walkers: walkers, frames: frames, STEP: STEP, TURN: TURN, DIRS: DIRS };
})();
