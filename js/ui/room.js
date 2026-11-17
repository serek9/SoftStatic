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
  // Phase 125-126: a walk that reads as a walk, and every look and breed as its own drawing.
  // The fisher: from the front or behind a stride lifts one leg two pixels and his body sinks a
  // pixel; from the side his legs part, one forward and one back. His hat is the drawing's crown
  // in the look's keys with the look's own hat on it: a cap's visor and patch, a knit's ribs and
  // bobble, a bucket's brim all round, a headlamp's strap and lamp; a beard where the look has
  // one. The dog sits in every drawing: walking, it trots on its feet from every side (a body and
  // chest, four legs stepping in pairs, a tail that wags, the drawing's head bobbing), in the
  // drawing's keys. A breed other than the golden changes its ears (a husky's pricked, a St.
  // Bernard's heavy and dark, a poodle's pompoms), its face (a husky's pale mask, a St.
  // Bernard's blaze and white chest) and its coat (a poodle's curls and topknot).
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
  // ---- Phase 126: every look and breed drawn as its own (the picker's people, the sheet's style)
  // The sheet gives the first look and the golden. The others keep only the sheet's body and face
  // and get their own: the hat (the red cap with its visor, the tall knit beanie, the yellow
  // sou'wester, the dark beanie with its headlamp), a beard, the coat's make (the slicker's shine
  // and toggles, the flannel's check, the work coat's fleece collar); the dogs their own coat and
  // shape (the husky grey over white with its mask, pricked ears and curled tail; the St.
  // Bernard white with brown patches, a blaze and heavy ears; the poodle cream and all curls,
  // its topknot and pompoms). Each piece is painted on its own grid, outlined in the sheet's dark
  // brown, and laid over the figure.
  function overlay(g, w, h, out, paint) {
    var o = X.grid(w, h); paint(o); o.outline(out);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var k = o.at(x, y); if (k) g.set(k, x, y); }
  }
  function mir(f, W) { return f < 0 ? function (x) { return W - 1 - x; } : function (x) { return x; }; }
  // Clears the sheet's beanie: every pixel above the hat's line, and below it the hat's own pixels.
  function clearHat(g, rows, roles, x0, y0, dir) {
    var w = rows[0].length, f = dir === 'left' ? -1 : 1;
    for (var y = 0; y < rows.length && y < 26; y++) for (var x = 0; x < w; x++) {
      var ch = rows[y][x]; if (ch === '.') continue;
      var role = roles[ART_CH.indexOf(ch)], ax = f < 0 ? w - 1 - x : x;
      var line = dir === 'down' ? 11 : (dir === 'up' ? 15 : (ax < 12 ? 15 : (ax < 20 ? 13 : 10)));
      if (y <= line && role !== 'skin') { g.clear(x0 + x, y0 + y); continue; }
      if (role === 'hat' && y <= line + 6) g.clear(x0 + x, y0 + y);
    }
  }
  function paintHat(o, L, dir, x0, y0, w) {
    var H = [dk(L.hatKeys[0]), L.hatKeys[0], L.hatKeys[1], L.hatKeys[2], lt(L.hatKeys[2])], side = dir === 'left' || dir === 'right', back = dir === 'up';
    var f = dir === 'left' ? -1 : 1, mx = mir(f, w), X0 = function (x) { return x0 + mx(x); }, Y0 = function (y) { return y0 + y; };
    var cx = side ? 13 : 15;
    var HR = [dk(dk(L.hair)), dk(L.hair), L.hair, lt(L.hair)];
    function ell(x, y, rx, ry, keys, b) { o.ell(X0(x), Y0(y), rx, ry, keys, { bias: b || 0.15 }); }
    function poly(pts, fn) { var q = []; for (var i = 0; i < pts.length; i++) q.push([X0(pts[i][0]), Y0(pts[i][1])]); o.poly(q, fn); }
    function rect(k, x, y, rw, rh) { o.rect(k, Math.min(X0(x), X0(x + rw - 1)), Y0(y), rw, rh); }        // mirrored for the left
    if (back) ell(15, 15, 11.5, 6, HR, 0.1); else if (side) ell(9, 14.5, 8.5, 5.5, HR, 0.1);                  // the hair under the hat, behind
    if (L.hat === 'cap') {
      ell(cx, 7.5, side ? 11 : 11.5, 7, H, 0.2);
      o.line(H[1], X0(cx), Y0(1), X0(cx), Y0(11)); o.set(H[4], X0(cx), Y0(1));                        // the seam, the button
      if (side) poly([[20, 10], [31, 10.5], [31, 12.5], [20, 13]], function (x, y) { return y - y0 > 11.5 ? H[0] : H[2]; });     // the visor, forward
      else if (!back) { ell(15, 11.8, 12.5, 2.4, [H[0], H[1], H[2], H[3]], 0.3); rect(H[0], 4, 13, 23, 1); }               // the visor, toward us
      else { rect('outline', 12, 12, 7, 2); rect(H[2], 13, 12, 5, 1); }                                         // the strap at the back
    } else if (L.hat === 'knit') {
      var tip = side ? 9 : 15;
      poly(side ? [[2, 13], [25, 12], [24, 5], [19, -1], [tip, -5], [6, 0], [3, 6]] : [[3.5, 12.5], [26.5, 12.5], [24, 5], [19, -1], [15, -5], [11, -1], [6, 5]], function (x, y) { return tone(H, 0.75 - (x - X0(0)) / 30 * 0.45 * f - (y - y0 + 5) / 18 * 0.15 + (((x + y) % 5) === 0 ? -0.12 : 0)); });
      for (var k = 0; k < 24; k++) rect(k % 2 ? H[1] : H[2], 3 + k, 8, 1, 5);                         // the turned-up cuff's ribs
      rect(H[3], 4, 8, 22, 1);
    } else if (L.hat === 'bucket') {
      ell(side ? 14 : 15, back ? 13 : 12, 16, back ? 4.2 : 3.4, [H[0], H[1], H[2], H[3]], back ? -0.1 : 0.2);                      // the brim, all round (longer behind)
      ell(cx, 6.5, 9, 6.5, H, 0.25);
      rect(H[0], cx - 8, 10, 17, 1);                                                                                     // the band
      if (!back) o.set(H[4], X0(cx - 4), Y0(3));
    } else if (L.hat === 'lamp') {
      ell(cx, 7, side ? 11.5 : 12, 7.5, ['ink', 'stone_dark', 'stone', 'stone_hi'], 0.15);
      for (var r = 0; r < 24; r++) rect(r % 2 ? 'stone_dark' : 'stone', 3 + r, 10, 1, 3);                               // the cuff
      rect('ink', 2, 7, side ? 25 : 27, 2);                                                                              // the strap
      if (side) { o.slab(Math.min(X0(23), X0(26)), Y0(4), 4, 5, ['outline', 'stone_dark', 'stone', 'stone_hi']); o.set('lamp_glow', X0(26), Y0(6)); }
      else if (!back) { o.slab(X0(12), Y0(3), 7, 6, ['outline', 'stone_dark', 'stone', 'stone_hi']); o.rect('lamp_glow', X0(14), Y0(5), 3, 2); o.set('cream', X0(14), Y0(5)); }
    }
  }
  function paintBeard(o, L, dir, x0, y0, w) {
    if (!L.beard || dir === 'up') return;
    var B = [dk(L.beard[0])].concat(L.beard).concat([lt(L.beard[2])]), side = dir === 'left' || dir === 'right', f = dir === 'left' ? -1 : 1, mx = mir(f, w);
    if (side) { o.ell(x0 + mx(22), y0 + 21, 5, 4.2, B, { bias: 0.25 }); o.ell(x0 + mx(24), y0 + 18.5, 3, 1.4, B, { bias: 0.4 }); }
    else { o.ell(x0 + 15, y0 + 21, 8.5, 4.6, B, { bias: 0.25 }); o.ell(x0 + 12.5, y0 + 18.3, 3, 1.4, B, { bias: 0.4 }); o.ell(x0 + 17.5, y0 + 18.3, 3, 1.4, B, { bias: 0.3 }); }
  }
  function coatMake(g, rows, roles, keys, L, dir, x0, y0) {
    var w = rows[0].length, front = dir === 'down';
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < w; x++) {
      var ch = rows[y][x]; if (ch === '.' || roles[ART_CH.indexOf(ch)] !== 'coat') continue;
      var gx = x0 + x, gy = y0 + y;
      if (L.check) { if (x % 4 === 0 || y % 4 === 0) g.set(x % 4 === 0 && y % 4 === 0 ? dk(L.check) : L.check, gx, gy); }      // the flannel's check
      else if (L.hat === 'bucket') { if ((x * 2 + y) % 11 === 0) g.set(lt(L.coat[2]), gx, gy); }                                 // the slicker's shine
    }
    if (L.hat === 'bucket' && front) for (var t = 0; t < 3; t++) { g.rect('outline', x0 + 14, y0 + 31 + t * 3, 3, 2); g.rect('wood_mid', x0 + 15, y0 + 31 + t * 3, 1, 1); }   // the toggles
    if (L.hat === 'knit' && dir !== 'up') { var cx = dir === 'down' ? 15 : (dir === 'right' ? 17 : w - 18); g.ell(x0 + cx, y0 + 27, dir === 'down' ? 7 : 4, 2.2, ['paper_dark', 'paper', 'bone', 'cream'], { bias: 0.3 }); }    // the fleece collar
  }

  // The breeds. tint() recolours what is there inside a region onto another ramp, keeping its
  // light; the regions are in the sitting drawing's own pixels (view: down, up, right, left).
  function tint(g, rows, keys, x0, y0, inside, ramp) {
    var order = rampKeys(keys), lo = lumKey(order[3]), hi = lumKey(order[order.length - 1]);
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      var ch = rows[y][x]; if (ch === '.') continue;
      var k = keys[ART_CH.indexOf(ch)], l = lumKey(k);
      if (l <= lumKey(order[1]) || !inside(x, y)) continue;
      g.set(tone(ramp, (l - lo) / Math.max(1, hi - lo)), x0 + x, y0 + y);
    }
  }
  function inEll(cx, cy, rx, ry) { return function (x, y) { var u = (x - cx) / rx, v = (y - cy) / ry; return u * u + v * v <= 1; }; }
  function any() { var fs = arguments; return function (x, y) { for (var i = 0; i < fs.length; i++) if (fs[i](x, y)) return true; return false; }; }
  function breedSit(g, rows, keys, B, dir, x0, y0) {
    var w = rows[0].length, f = dir === 'left' ? -1 : 1, side = dir === 'left' || dir === 'right', mx = mir(f, w), OUT = rampKeys(keys)[0];
    var WHITE = ['paper_dark', 'paper', 'bone', 'cream', 'ivory'], COAT = [dk(B.coat[0]), B.coat[0], B.coat[1], B.coat[2], lt(B.coat[2])], EAR = [dk(B.ear[1]), B.ear[1], B.ear[2], lt(B.ear[2])];
    function S(fn) { return function (x, y) { return fn(mx(x), y); }; }                                     // a region drawn for the right, mirrored for the left
    var hx = side ? 28 : 15.5, hy = side ? 6 : 9;
    // Ears: the sheet's drop ears go for pricked or pompom ones.
    if (B.ears === 'prick' || B.ears === 'pom') for (var y = 0; y < 20; y++) for (var x = 0; x < w; x++) {
      var ax = mx(x), drop = side ? (ax >= 15 && ax <= 22 && y >= 6 && y <= 17) : ((ax < 7 || ax > 24) && y >= 6 && y <= 19);
      if (drop && rows[y][x] !== '.') { if (side) g.set(tone(COAT, 0.55 + ((x + y) % 2) * 0.1), x0 + x, y0 + y); else g.clear(x0 + x, y0 + y); }
    }
    if (B.id === 'husky') {
      tint(g, rows, keys, x0, y0, side ? S(any(inEll(33, 9, 6, 4.5), inEll(27, 25, 5, 8), function (x, y) { return y > 30; }, inEll(29, 3, 2, 1.5)))
        : (dir === 'up' ? function (x, y) { return y > 32; } : any(inEll(15.5, 12, 6.5, 4.5), inEll(10, 6, 2.5, 1.5), inEll(21, 6, 2.5, 1.5), inEll(15.5, 26, 6, 7), function (x, y) { return y > 31; })), WHITE);
    } else if (B.id === 'saint') {
      tint(g, rows, keys, x0, y0, function () { return true; }, WHITE);                                    // white, then the brown patches
      tint(g, rows, keys, x0, y0, side ? S(any(function (x, y) { return y < 17 && !inEll(33, 9, 6, 4.5)(x, y) && !(x > 26 && x < 30 && y < 6); }, inEll(18, 25, 9, 6), inEll(5, 26, 5, 8)))
        : (dir === 'up' ? any(function (x, y) { return y < 18; }, inEll(15.5, 26, 10, 7)) : any(function (x, y) { return y < 17 && !inEll(15.5, 12, 6.5, 4.5)(x, y) && !(x > 13 && x < 18); }, inEll(6, 28, 4, 6), inEll(25, 28, 4, 6))), COAT);
    } else if (B.id === 'poodle') {
      tint(g, rows, keys, x0, y0, function () { return true; }, COAT);
    } else tint(g, rows, keys, x0, y0, function () { return true; }, COAT);
    overlay(g, g.w, g.h, OUT, function (o) {
      var X0 = function (x) { return x0 + mx(x); };
      if (B.ears === 'prick') {
        if (side) o.poly([[X0(20), y0 + 5], [X0(23), y0 - 4], [X0(26), y0 + 3]], function (x, y) { return y - y0 < 0 ? EAR[3] : EAR[2]; });
        else { o.poly([[x0 + 5, y0 + 6], [x0 + 8, y0 - 4], [x0 + 12, y0 + 3]], function () { return EAR[2]; }); o.poly([[x0 + 19, y0 + 3], [x0 + 23, y0 - 4], [x0 + 26, y0 + 6]], function () { return EAR[1]; }); if (dir === 'down') { o.set('pink', x0 + 8, y0 + 1); o.set('pink', x0 + 23, y0 + 1); } }
      } else if (B.ears === 'heavy') {
        if (side) o.ell(X0(19), y0 + 10, 4, 7.5, EAR, { bias: 0.15 });
        else { o.ell(x0 + 4, y0 + 11, 4, 7.5, EAR, { bias: 0.15 }); o.ell(x0 + 27, y0 + 11, 4, 7.5, EAR, { bias: -0.05 }); }
      } else if (B.ears === 'pom') {
        var CR = COAT.slice(1);
        if (side) o.ell(X0(19), y0 + 11, 4.5, 6, CR, { bias: 0.2 });
        else { o.ell(x0 + 4, y0 + 12, 4.5, 6.5, CR, { bias: 0.25 }); o.ell(x0 + 27, y0 + 12, 4.5, 6.5, CR, { bias: 0.05 }); }
        o.ell(side ? X0(26) : x0 + 15.5, y0 - 1, 7, 4.5, CR, { bias: 0.3 });                              // the topknot
        if (side) o.ell(X0(4), y0 + 18, 4.5, 4.5, CR, { bias: 0.3 });                                     // the tail's pompom
        if (dir === 'up') o.ell(x0 + 15.5, y0 + 30, 4, 3.5, CR, { bias: 0.3 });
      }
      if (B.tail === 'curl' && side) { o.ell(X0(7), y0 + 19, 5, 4.5, COAT, { bias: 0.2 }); o.ell(X0(7), y0 + 19, 2.2, 2, WHITE, {}); }
      if (B.tail === 'curl' && dir === 'up') { o.ell(x0 + 15.5, y0 + 22, 5, 4, COAT, { bias: 0.25 }); o.ell(x0 + 15.5, y0 + 22, 2, 1.6, WHITE, {}); }
      if (B.face === 'blaze' && !side && dir !== 'up') o.rect('ivory', x0 + 14, y0 + 1, 3, 9);
    });
    if (B.curly) g.over(0, 0, g.w, g.h, function (x, y, k) { var l = lumKey(k); return l > 120 && ((x * 5 + y * 3) % 7 === 0) ? COAT[1] : (l > 120 && ((x * 3 + y * 7) % 9 === 0) ? COAT[4] : ''); });
  }

  // The sitting drawing of a kind, a facing and a look, on a grid with its margins (TOPM, SIDEM),
  // with its look's or breed's own pieces.
  function sitGrid(kind, dir, L) {
    var A = G.gfx.peopleArt[kind], list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers, plain = !L || L.id === list[0].id;
    var rows = A[dir], keys = artKeys(kind, L), w = rows[0].length, h = rows.length, g = X.grid(w + 2 * SIDEM, h + TOPM + 1);
    stamp(g, rows, keys, SIDEM, TOPM, null);
    if (kind === 'dog' && !plain) breedSit(g, rows, keys, L, dir, SIDEM, TOPM);
    return g;
  }
  // The trotting dog, from the side (44×34), the front or behind (36×36): a body, four legs in
  // pairs, a tail that wags, and the sitting drawing's head (with the breed's ears and face).
  function dogTrot(keys, A, dir, fr, B, golden) {
    var order = rampKeys(keys), OUT = order[0], st = fr === 1 ? 1 : -1, g, bob = fr === 1 ? -1 : 0;
    var WHITE = ['paper_dark', 'paper', 'bone', 'cream', 'ivory'], COAT = [dk(B.coat[0]), B.coat[0], B.coat[1], B.coat[2], lt(B.coat[2])];
    var C = golden ? order.slice(3) : COAT, FAR = golden ? order.slice(2, 7) : COAT.slice(0, 3), LEGC = B.id === 'husky' || B.id === 'saint' ? WHITE : C, BODY = B.id === 'saint' ? WHITE : C;
    var head = sitGrid('dog', dir === 'left' ? 'right' : dir, golden ? null : B);
    function paste(x0, y0, keep) { for (var y = 0; y < head.h; y++) for (var x = 0; x < head.w; x++) { var k = head.at(x, y); if (k && keep(x - SIDEM, y - TOPM)) g.set(k, x0 + x - SIDEM, y0 + y - TOPM); } }
    if (dir === 'right' || dir === 'left') {
      g = X.grid(44, 36);
      if (B.tail === 'curl') { g.ell(8, 15, 4.5, 4, C, { bias: 0.25 }); g.ell(8, 15, 2, 1.8, WHITE, {}); }
      else if (B.tail === 'pom') { g.cap(9, 18, 6, 13 - st, 1.2, C, 0.2); g.ell(5, 12 - st, 3.5, 3.5, C, { bias: 0.3 }); }
      else if (B.tail === 'low') g.cap(9, 19, 5 - st, 27, 2.2, C, 0.15);
      else { g.cap(9, 18, 3, 10 - st * 2, 2.4, C, 0.2); g.cap(3, 10 - st * 2, 1 + st, 7 - st * 2, 1.7, C, 0.3); }      // the plume, wagging
      g.cap(13, 24, 13 - st * 4, 33, 1.7, FAR, 0); g.cap(27, 24, 27 + st * 4, 33, 1.7, FAR, 0);                           // the far legs
      g.ell(13 - st * 4, 33.8, 2, 1.1, FAR, {}); g.ell(27 + st * 4, 33.8, 2, 1.1, FAR, {});
      g.ell(19, 22, 12, 6.2, BODY, { bias: 0.2 });                                                                         // the body
      if (B.id === 'saint') g.ell(18, 20, 9, 4.5, COAT, { bias: 0.25 });                                                    // its saddle
      if (B.id === 'husky') g.ell(20, 26, 9, 2.5, WHITE, { bias: 0.2 });                                                    // a pale belly
      g.ell(28, 21.5, 5, 6, B.id === 'golden' || B.id === 'poodle' ? C : WHITE, { bias: 0.3 });                             // the chest
      g.cap(10, 24, 10 + st * 4, 33, 2, LEGC, 0.1); g.cap(30, 24, 30 - st * 4, 33, 2, LEGC, 0.15);                         // the near legs
      g.ell(10.5 + st * 4, 33.8, 2.4, 1.3, LEGC, { bias: 0.2 }); g.ell(30.5 - st * 4, 33.8, 2.4, 1.3, LEGC, { bias: 0.2 });
      g.cap(29, 19, 32, 13, 4, B.id === 'saint' ? COAT : C, 0.25);                                                         // the neck
      paste(4, 1 + bob, function (x, y) { return x >= 14 && y < 17; });                                                    // the head
      if (B.curly) g.over(0, 0, 44, 36, function (x, y, k) { return lumKey(k) > 120 && ((x * 5 + y * 3) % 7 === 0) ? C[1] : ''; });
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
      if (B.tail === 'curl') { g.ell(18, 21, 4.5, 4, C, { bias: 0.25 }); g.ell(18, 21, 2, 1.6, WHITE, {}); }
      else if (B.tail === 'pom') { g.cap(18, 22, 18 + st * 2, 17, 1.2, C, 0.2); g.ell(18 + st * 2, 15, 3.5, 3.2, C, { bias: 0.3 }); }
      else g.cap(18, 21, 18 + st * 4, 13, 2.2, C, 0.3);                                                                   // the tail, wagging
    } else {
      g.cap(13, 26, 13, 34, 1.6, FAR, 0); g.cap(23, 26, 23, 34, 1.6, FAR, 0);                                             // the hind legs, beyond
      g.ell(18, 25, 8, 7, B.id === 'golden' || B.id === 'poodle' ? C : WHITE, { bias: 0.2 });                              // the chest
      g.cap(14.5, 26, 14.5, 35 - (st > 0 ? 2 : 0), 2.1, LEGC, 0.15); g.cap(21.5, 26, 21.5, 35 - (st < 0 ? 2 : 0), 2.1, LEGC, -0.05);
      g.ell(14.5, 36 - (st > 0 ? 2 : 0), 2.4, 1.2, LEGC, { bias: 0.2 }); g.ell(21.5, 36 - (st < 0 ? 2 : 0), 2.4, 1.2, LEGC, {});
      paste(2, 2 + bob, function (x, y) { return y < 19; });                                                               // the head
    }
    if (B.curly) g.over(0, 0, 36, 38, function (x, y, k) { return lumKey(k) > 120 && ((x * 5 + y * 3) % 7 === 0) ? C[1] : ''; });
    g.outline(OUT);
    return g.canvas();
  }
  function sprite(kind, dir, fr, lk) {
    var L = look(kind, lk), key = kind + (L ? L.id : '') + dir + fr;
    if (art[key]) return art[key];
    var A = G.gfx.peopleArt[kind], list = kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers, plain = !L || L.id === list[0].id;
    var rows = A[dir], keys = artKeys(kind, L), h = rows.length, w = rows[0].length, side = dir === 'left' || dir === 'right';
    var moving = fr === 1 || fr === 2, g, x0 = SIDEM, y0 = TOPM, cx = w / 2;
    if (kind === 'dog' && moving) {
      if (dir === 'left') return (art[key] = G.gfx.bake.flipped(sprite(kind, 'right', fr, lk), 'x'));
      return (art[key] = dogTrot(keys, A, dir, fr, L || list[0], plain));
    }
    if (kind === 'dog') return (art[key] = sitGrid(kind, dir, L).canvas());
    g = X.grid(w + 2 * SIDEM, h + TOPM + 1);
    var legTop = kind === 'fisher' ? firstRow(rows, A.roles, 'trousers') : h, sink = kind === 'fisher' && moving ? 1 : 0;
    if (moving && kind === 'fisher') {
      stamp(g, rows, keys, x0, y0, function (x, y) {                                    // the legs, then the body over them, sunk a pixel
        if (y < legTop) return false;
        if (side) return [x < cx ? -2 : 2, 0];
        return [0, ((x < cx) === (fr === 1)) ? -2 : 0];
      });
    }
    var body = X.grid(g.w, g.h);
    stamp(body, rows, keys, x0, y0, moving && kind === 'fisher' ? function (x, y) { return y >= legTop ? false : null; } : null);
    if (kind === 'fisher' && !plain) {
      clearHat(body, rows, A.roles, x0, y0, dir);
      coatMake(body, rows, A.roles, keys, L, dir, x0, y0);
      var OUT = rampKeys(A.keys)[0];
      overlay(body, body.w, body.h, OUT, function (o) { paintBeard(o, L, dir, x0, y0, w); });
      overlay(body, body.w, body.h, OUT, function (o) { paintHat(o, L, dir, x0, y0, w); });
    }
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
    var rows = G.gfx.peopleArt[kind][dir];
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
