var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fisher-and-dog picker (Phase 47, PLAN_TACKLE.md 2.8): an overlay in the small panel
// (G.ui.panel), opened from the pause list (Fisher & dog) or at the cabin's door. Two cells
// side by side, the fisher and the dog, each standing at the gunwale as the boat shows them;
// W/S choose which, A/D turn through the looks, Space or Esc is done. Every look is open from
// the start and costs nothing. A turn writes save.look at once and bakes the new look's
// paintings (the boat's fisher or dog, and the shop's sprite) in the same step, so the next
// frame shows it, here and in the world behind the panel. From the pause list it goes back to
// the pause list; from the cabin, back to the room.
G.ui = G.ui || {};
G.ui.look = (function () {
  var S = G.gfx.sprites, F = S.fine, P = S.PALETTE;
  var W = 232, H = 124, PREV = 56, GAP = 8, Z = 4; // the panel; a preview's height; px between the cells; view px per world px in a preview
  var R = [0, 0, W, H], row = 0, from = '', changed = false, bakeMs = 0, bakes = 0, t = 0;
  var KIND = ['fisher', 'dog'];
  var still = { nx: 2.2, ny: -4.2, fx: 1.2, fy: -4.4, head: 0, item: '', cord: -1 }; // his hands on his knees (fisher.POSES.knees)
  var pup = { pose: 'idle', t: 0 };

  function list(kind) { return kind === 'dog' ? G.data.looks.dogs : G.data.looks.fishers; }
  function now(kind) { return G.data.lookOf(list(kind), G.state.save.look && G.state.save.look[kind]); }

  // Sets the look for kind ('fisher' or 'dog') to id and bakes it. Returns the bake's ms
  // (0 when nothing changed, -1 for an unknown id).
  function set(kind, id) {
    var L = list(kind), save = G.state.save, i;
    for (i = 0; i < L.length && L[i].id !== id; i++);
    if (i === L.length) return -1;
    if (!save.look) save.look = {};
    if (now(kind).id === id && save.look[kind] === id) return 0;
    save.look[kind] = id;
    var t0 = performance.now();
    if (kind === 'dog') G.scene.dog.prebake(id); else G.scene.fisher.prebake(id);
    G.ui.shopRoom.prebake(kind, id);
    bakeMs = performance.now() - t0; bakes++; changed = true;
    return bakeMs;
  }

  function turn(d) {
    var kind = KIND[row], L = list(kind), i = L.indexOf(now(kind));
    set(kind, L[(i + d + L.length) % L.length].id);
  }

  function open(src) {
    from = src || ''; row = 0; changed = false; t = 0;
    G.ui.panel.place(W, H, from === 'cabin' ? 'bl' : 'right', R);
  }

  // Saves a change, then hands back: to the pause list (the overlay stays up) or to the scene.
  function close() {
    if (changed) G.core.save.autosave('look');
    changed = false;
    if (from === 'pause') { G.ui.menu.open('pause', 'Fisher & dog'); return true; }
    return false;
  }

  function update(dt) {
    var inp = G.core.input;
    t += dt;
    if (inp.pressed('back') || inp.pressed('pause') || inp.pressed('action')) return close();
    if (inp.pressed('up') || inp.pressed('down')) row = 1 - row;
    if (inp.pressed('left')) turn(-1);
    if (inp.pressed('right')) turn(1);
    return true;
  }

  // One cell: the heading, the preview (night, the figure at Z×, the gunwale and the hull
  // before him, as the boat hides his legs) and the look's name between arrows. The seat line
  // sits SEAT view px under the preview's top, so his hat clears it and the hull ends at its foot.
  var SEAT = 62, RAIL = 18;
  function cell(ctx, i, x, y, cw) {
    var U = G.ui.panel, kind = KIND[i], L = now(kind), on = row === i;
    F.bold(ctx, kind === 'dog' ? 'DOG' : 'FISHER', x, y, on ? 'bone' : 'fog_mid');
    var py = y + U.ROW, seat = Math.round((py + SEAT) / Z), rail = seat * Z - RAIL;
    ctx.fillStyle = P.night_deep; ctx.fillRect(x, py, cw, PREV);
    ctx.setTransform(Z, 0, 0, Z, 0, 0);
    var wx = Math.round((x + (cw >> 1)) / Z);
    if (kind === 'dog') { pup.t = t; G.scene.dog.draw(ctx, pup, wx - 6, Math.round((rail - 36) / Z), false, 0, L); }
    else G.scene.fisher.draw(ctx, still, wx + 1, seat, 1, 0, 0, t, 0, L);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = P.wood_dark; ctx.fillRect(x, rail, cw, py + PREV - rail);       // the hull
    ctx.fillStyle = P.wood; ctx.fillRect(x, rail, cw, 3);                           // the gunwale
    ctx.fillStyle = P.wood_hi; ctx.fillRect(x, rail, cw, 1);
    if (on) { ctx.fillStyle = P.signal_amber; ctx.fillRect(x, py, 1, PREV); }
    var key = on ? 'signal_amber' : 'fog_light', ny = py + PREV + 4;
    F.drawText(ctx, '<', x, ny, on ? key : 'fog_mid');
    F.drawText(ctx, '>', x + cw - F.measure('>'), ny, on ? key : 'fog_mid');
    F.drawText(ctx, L.name, x + ((cw - F.measure(L.name)) >> 1), ny, key);
  }

  function draw(ctx) {
    var U = G.ui.panel, x = R[0], y = R[1], cw = (W - 2 * U.PAD - GAP) >> 1;
    U.frame(ctx, x, y, W, H, 'FISHER & DOG');
    cell(ctx, 0, U.left(x), U.top(y), cw);
    cell(ctx, 1, U.left(x) + cw + GAP, U.top(y), cw);
    var hx = U.left(x), hy = y + H - U.PAD - U.KEY_H;
    hx += U.hint(ctx, 'W/S', 'choose', hx, hy);
    hx += U.hint(ctx, 'A/D', 'turn', hx, hy);
    U.hint(ctx, 'ESC', 'done', hx, hy);
  }

  // Phase 59.2: a touch on the picker. A cell's left or right third turns its look (and makes
  // it the row), its middle only picks the row; the ESC hint is done. Anywhere else, nothing.
  function tap(gx, gy) {
    var U = G.ui.panel, x0 = U.left(R[0]), y0 = U.top(R[1]), cw = (W - 2 * U.PAD - GAP) >> 1, y1 = y0 + U.ROW + PREV + 4 + F.LINE_H + 2;
    for (var i = 0; i < 2; i++) {
      var cx = x0 + i * (cw + GAP);
      if (gx >= cx && gx < cx + cw && gy >= y0 - 2 && gy < y1) {
        row = i;
        if (gx < cx + cw / 3) return 'left';
        if (gx >= cx + 2 * cw / 3) return 'right';
        return 'none';
      }
    }
    var hy = R[1] + H - U.PAD - U.KEY_H, hx = U.left(R[0]) + U.hintW('W/S', 'choose') + U.hintW('A/D', 'turn');
    if (gy >= hy - 2 && gy < hy + U.KEY_H + 2 && gx >= hx && gx < hx + U.hintW('ESC', 'done')) return 'back';
    return 'none';
  }

  // Checks and dbg: what is chosen, the last bake's ms, how many bakes, the panel's bounds.
  function info() {
    return { row: row, from: from, fisher: now('fisher').id, dog: now('dog').id, bakeMs: +bakeMs.toFixed(2), bakes: bakes, rect: R.slice() };
  }

  return { native: true, open: open, update: update, draw: draw, set: set, info: info, tap: tap, rect: function () { return R; } };
})();
