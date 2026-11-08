var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The controls page (Phase 88.5, PLAN_PLAYABILITY.md): an overlay from the pause list's
// Controls row, in the small panel's style over the world. One table, ROWS, names every action
// the game reads, with the keys and mouse on a PC and the touch on a phone (PLAN_MOBILE.md §2b
// is its source); the page shows the column for the device in use. check() (dbg.controls())
// fails when an action in input.NAMES has no row, so the page cannot drift from input.js.
G.ui = G.ui || {};
G.ui.controls = (function () {
  var S = G.gfx.sprites, F = S.fine;
  // [what, PC, phone, the input actions it covers]
  var ROWS = [
    ['Steer the boat', 'A D or the arrows', 'the pad, bottom left', ['left', 'right']],
    ['Cast', 'hold SPACE, let go', 'hold CAST, let go', ['action']],
    ['Stop a sinking lure', 'tap SPACE', 'tap REEL', []],
    ['Reel in, work a lure', 'hold SPACE', 'hold REEL', []],
    ['Let out line (the lure falls or drifts)', 'hold S or down arrow', 'hold LINE', []], // Phase 103
    ['Set the hook', 'SPACE when it bites', 'tap HOOK', []],
    ['Fight a fish', 'hold to reel, let go when it runs', 'the same, on REEL', []],
    ['Sell, keep, release', 'A D and SPACE, or click', 'tap the card\'s key', []],
    ['Tackle (rod, hook, line)', 'S', 'the @setup key', ['setup']],
    ['Journal', 'J', 'the @journal key', ['journal']],
    ['Chart of the waters', 'M', 'the @map key', ['map']],
    ['Menu', 'P or ESC', 'the @pause key', ['pause', 'back']],
    ['The pier: shop, cabin', 'W by the pier', 'tap the pier\'s hint', ['up']],
    ['Pet the dog', 'down arrow, or click him', 'tap the dog', ['down']],
    ['Walk in a room', 'WASD or the arrows', 'the four-way pad', []],
    ['Hide the corners', 'H', 'hold the @pause key', ['still']],
    ['Menus', 'W S choose, SPACE go', 'tap a row, tap again', []]
  ];
  var R = [0, 0, 0, 0], lv = -1, top = 0, show = ROWS.length, openT = 0, COL = 0, TXT = [];
  // A phone's words: '@act' becomes the word on that key now (Book or Journal, Gear or Tackle).
  function said(i, touch) {
    var s = ROWS[i][touch ? 2 : 1];
    return touch ? s.replace(/@(\w+)/, function (m, a) { return G.ui.hud.touchParts.wordFor(a, G.core.input.layout().bs); }) : s;
  }

  function lay() {
    var U = G.ui.panel;
    if (lv === U.ver()) return;
    lv = U.ver();
    var touch = G.core.device.touch(), w0 = 0, w1 = 0, i;
    for (i = 0; i < ROWS.length; i++) { TXT[i] = said(i, touch); w0 = Math.max(w0, F.measure(ROWS[i][0])); w1 = Math.max(w1, F.measure(TXT[i])); }
    COL = w0 + 14;
    var p = U.pic(), w = Math.min(U.VW() - 16, 2 * U.PAD + COL + w1 + 6), foot = touch ? U.PAD : U.KEY_H + U.PAD + 2;
    show = Math.max(4, Math.min(ROWS.length, Math.floor((p[3] - 16 - U.TAB - U.PAD - foot) / U.ROW)));
    var h = U.TAB + U.PAD + show * U.ROW + foot;
    U.place(w, h, 'top', R); R[2] = w; R[3] = h;
  }

  function open() { lv = -1; lay(); top = 0; openT = G.ui.panel.now(); }
  function update() {
    var inp = G.core.input;
    if (inp.pressed('back') || inp.pressed('pause') || inp.pressed('action')) { G.ui.menu.open('pause', 'Controls'); return true; }
    var d = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
    if (d) top = Math.max(0, Math.min(ROWS.length - show, top + d));
    return true;
  }

  function draw(ctx0) {
    lay();
    var U = G.ui.panel, ctx = U.begin(ctx0), a = U.fadeIn(openT), touch = G.core.device.touch(), x = R[0], y = R[1] + Math.round((1 - a) * 4), i;
    ctx.globalAlpha = a;
    U.frame(ctx, x, y, R[2], R[3], 'CONTROLS', touch ? 'TOUCH' : 'KEYBOARD AND MOUSE', 'fog_light');
    for (i = 0; i < show && top + i < ROWS.length; i++) {
      var r = ROWS[top + i], ry = U.top(y) + i * U.ROW;
      F.drawText(ctx, r[0], U.left(x), ry, 'fog_light');
      F.drawText(ctx, TXT[top + i], U.left(x) + COL, ry, 'bone');
    }
    if (top > 0) F.drawText(ctx, '^', x + R[2] - U.PAD - 6, U.top(y), 'fog_mid');
    if (top + show < ROWS.length) F.drawText(ctx, 'v', x + R[2] - U.PAD - 6, U.top(y) + (show - 1) * U.ROW, 'fog_mid');
    if (!touch) { var hx = U.left(x), hy = y + R[3] - U.PAD - U.KEY_H; if (show < ROWS.length) hx += U.hint(ctx, 'W/S', 'scroll', hx, hy); U.hint(ctx, 'ESC', 'back', hx, hy); }
    ctx.globalAlpha = 1;
  }

  // A tap: the upper half of the panel scrolls up, the lower half down; off it, back.
  function tap(gx0, gy0) {
    lay();
    var U = G.ui.panel, gx = U.ux(gx0), gy = U.uy(gy0);
    if (!U.inside(R, gx, gy)) return 'back';
    return gy < R[1] + (R[3] >> 1) ? 'up' : 'down';
  }

  function check() {
    var names = G.core.input.NAMES, covered = {}, missing = [], i, k;
    for (i = 0; i < ROWS.length; i++) for (k = 0; k < ROWS[i][3].length; k++) covered[ROWS[i][3][k]] = true;
    for (i = 0; i < names.length; i++) if (names[i] !== 'none' && !covered[names[i]]) missing.push(names[i]);
    return { rows: ROWS.length, missing: missing, pass: missing.length === 0 };
  }

  return { native: true, open: open, update: update, draw: draw, tap: tap, check: check, rect: function () { lay(); return R; } };
})();
