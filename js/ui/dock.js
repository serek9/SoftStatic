var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The pier (Phase 67, PLAN_PLACES.md): Fogbound's pier stands at the lake's west end, under
// the shore where the bait shop and the cabin are. Steer the boat to it and stop beside it,
// with the line in, and a small panel (G.ui.panel) asks where to go: the Bait Shop, the Cabin,
// or stay on the water. It opens once each time the boat comes to the pier (W or the up
// arrow opens it again while he is there); the world goes on behind it, and staying, Esc, or
// sailing off closes it. Choosing a place fades to black and walks him up (the scene changes,
// as the map's travel does); leaving the shop or the cabin brings him back to the boat at the
// pier. The water's `dock` ({x, reach} in world px) says where. Presentation and input only.
// Phase 76 (PLAN_WATERS.md 4.3): every water has its pier (no signposts since the user's fixes, 2026-11-03). The panel offers
// the Bait Shop and staying everywhere, The Cabin only where the dock says `cabin` (Fogbound);
// the shop leaves the run as it was, so he comes back to the boat at the pier he left from.
G.ui = G.ui || {};
G.ui.dock = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine;
  var WITH = { rows: ['Bait Shop', 'The Cabin', 'Stay on the water'], dest: ['shop', 'cabin', ''], says: ['Rusty has the coffee on.', '', 'The boat knocks against the posts.'] };
  var PLAIN = { rows: ['Bait Shop', 'Stay on the water'], dest: ['shop', ''], says: ['Rusty has the coffee on.', 'The boat knocks against the posts.'] };
  // Phase 83: the Back Pond's dock: up the steps to the cabin's back door, or stay.
  var POND = { rows: ['The Cabin', 'Stay on the water'], dest: ['cabin', ''], says: ['', 'The boat bumps the dock.'] };
  // Phase 84: at the Back Pond's stream (its lip, while the jam is in it): pay to clear the jam.
  var STREAM = { title: 'THE STREAM', rows: ['Clear the jam', 'Leave it'], dest: ['clear', ''], says: ['', 'Brown water lies still behind it.'] }, STREAM_R = 50;
  var where = 'pier', msg = '';
  var M = WITH, ROWS = M.rows, DEST = M.dest, SAYS = M.says; // the open panel's rows (Phase 76)
  function menuOf(loc) { return loc && loc.pond ? POND : (loc && loc.dock && loc.dock.cabin ? WITH : PLAIN); }
  var on = false, sel = 0, armed = false, phase = '', t = 0, dest = '', FADE = 0.35, near = false;
  var R = [0, 0, 0, 0], RECTS = [R];

  // True when the boat sits by the pier of water loc (stopped or not).
  function at(run, loc) {
    var d = loc && loc.dock;
    return !!(d && run && run.boat && Math.abs(run.boat.x - d.x) <= d.reach);
  }

  function layout() {
    var U = G.ui.panel, w = 0, i;
    for (i = 0; i < ROWS.length; i++) w = Math.max(w, F.measure(ROWS[i]));
    w = Math.max(w + 2 * U.PAD + 16, U.hintW('SPACE', 'go') + U.hintW('ESC', 'stay') + 2 * U.PAD + 8, 170);
    var h = U.TAB + U.PAD + ROWS.length * U.ROW + 4 + U.ROW + U.KEY_H + U.PAD;
    U.place(w, h, 'top', R); R[1] += 34;
    R[2] = w; R[3] = h;
  }
  function open(loc) { M = where === 'stream' ? STREAM : menuOf(loc); msg = ''; ROWS = M.rows; DEST = M.dest; SAYS = M.says; layout(); on = true; sel = 0; armed = false; }
  function close() { on = false; }

  // One step from the sailing scene, before it casts or sails. Returns true while the dock has
  // the keys (the panel open, or the fade out to a place).
  function step(run, loc, dt) {
    var inp = G.core.input;
    if (phase === 'out') {
      t += dt;
      if (t >= FADE) { phase = ''; on = false; G.core.state.change(dest); }
      return true;
    }
    var wh = at(run, loc) ? 'pier' : (atStream(run, loc) ? 'stream' : '');            // Phase 84: or the stream's lip
    if (wh && wh !== where && on) close();
    if (wh) where = wh;
    near = !!wh;
    if (!near) { armed = true; if (on) close(); return false; }
    if (on) {
      if (run.fsm !== 'sailing') { close(); return false; }
      if (inp.pressed('back')) { close(); return true; }
      var d = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
      if (d) sel = (sel + d + ROWS.length) % ROWS.length;
      if (inp.pressed('action')) choose(sel);
      return true;
    }
    if (run.fsm === 'sailing' && run.boat.stopped && (armed || inp.pressed('up'))) { open(loc); return true; }
    return false;
  }
  // Phase 84: by the stream's lip with the jam still in it.
  function atStream(run, loc) {
    var p = G.state.save.pond;
    return !!(loc && loc.pond && p && !p.stream && run && run.boat && Math.abs(run.boat.x - loc.pond.stream) <= STREAM_R);
  }
  function choose(i) {
    if (!DEST[i]) { close(); return; }
    if (DEST[i] === 'clear') {                                                     // Phase 84: pay to clear the jam
      var r = G.sim.pond.clearStream(G.state.save, G.data);
      if (r === G.sim.pond.OK) { close(); G.core.save.autosave('purchase'); G.ui.hud.say('The jam drags free. The stream runs into the pond.'); G.audio.engine.cue('plop', G.state.run.boat.x); }
      else msg = r === G.sim.pond.POOR ? 'Not enough coins.' : 'It runs already.';
      return;
    }
    dest = DEST[i]; phase = 'out'; t = 0;
    G.core.save.autosave('travel');
  }

  function draw(ctx) {
    var U = G.ui.panel, run = G.state.run, i;
    if (!on && phase !== 'out' && !near) return;
    G.core.view.begin(ctx, true);                                                   // the panel draws in the 640×360 view's pixels
    if (phase === 'out') { G.ui.menu.dim(ctx, t / FADE); }
    if (!on) {
      // At the pier with the panel shut: a quiet hint where to step off.
      if (near && run && run.fsm === 'sailing' && run.boat.stopped && !G.ui.setup.isOpen() && !G.ui.menu.current()) U.hint(ctx, G.core.device && G.core.device.touch && G.core.device.touch() ? 'TAP' : 'W', where === 'stream' ? 'the stream' : 'the pier', 280, 66);
      return;
    }
    var x = R[0], y = R[1];
    U.frame(ctx, x, y, R[2], R[3], M.title || 'THE PIER');
    for (i = 0; i < ROWS.length; i++) {
      var ry = U.top(y) + i * U.ROW, here = i === sel;
      if (here) { ctx.fillStyle = P.rust_dark; ctx.fillRect(x + 3, ry - 1, R[2] - 6, U.ROW); ctx.fillStyle = P.signal_amber; ctx.fillRect(x + 3, ry - 1, 1, U.ROW); }
      F.drawText(ctx, ROWS[i], U.left(x) + 6, ry + 1, here ? 'signal_amber' : 'bone');
    }
    var say = msg || (DEST[sel] === 'clear' ? G.data.pond.streamCost + 'c. You have ' + G.state.save.coins + '.' : '') || (DEST[sel] === 'cabin' ? (M === POND ? 'Up the steps to the back door.' : 'Yours. ' + G.data.gear.cabin[G.state.save.cabinLevel].name + '.') : SAYS[sel]);
    F.drawText(ctx, say, U.left(x), U.top(y) + ROWS.length * U.ROW + 4, 'fog_mid');
    var hx = U.left(x), hy = y + R[3] - U.PAD - U.KEY_H;
    hx += U.hint(ctx, 'SPACE', 'go', hx, hy);
    U.hint(ctx, 'ESC', 'stay', hx, hy);
  }

  // A touch: a row by the row rule (the first tap selects, a tap on the selected row goes);
  // the hint "the pier" opens it; anything else, nothing.
  function tap(gx, gy) {
    var U = G.ui.panel;
    if (!on) {
      if (near && gx >= 280 && gx < 280 + U.hintW('TAP', 'the pier') && gy >= 62 && gy < 80) { var r = G.state.run; open(r && r.loc ? G.data.locations[r.loc] : null); return 'none'; }
      return '';
    }
    if (gx < R[0] || gx >= R[0] + R[2] || gy < R[1] || gy >= R[1] + R[3]) return '';
    var i = Math.floor((gy - U.top(R[1]) + 1) / U.ROW);
    if (i < 0 || i >= ROWS.length) return 'none';
    if (i !== sel) { sel = i; return 'none'; }
    return 'action';
  }

  return {
    step: step, draw: draw, tap: tap, at: at,
    isOpen: function () { return on; },
    busy: function () { return on || phase === 'out'; },
    rects: function () { return on ? RECTS : null; },
    // The map's trips to the shop and the cabin start from the pier too (Phase 67): no panel
    // until the boat leaves the pier and comes back.
    disarm: function () { armed = false; on = false; },
    // dbg.dock(): where the pier is, which shore it runs out from, its rows (Phase 76), and
    // whether the boat is at it.
    info: function () {
      var run = G.state.run, loc = run && run.loc ? G.data.locations[run.loc] : null, k, from = '';
      for (k = 0; loc && k < loc.landmarks.length; k++) if (loc.landmarks[k].kind === 'pier') from = loc.landmarks[k].from || '';
      return { stop: where, loc: run ? run.loc : '', pier: loc && loc.dock ? loc.dock.x : null, from: from, rows: (where === 'stream' && loc && loc.pond ? STREAM : menuOf(loc)).rows.slice(), boat: run && run.boat ? +run.boat.x.toFixed(1) : null, at: at(run, loc), open: on, row: on ? ROWS[sel] : '', armed: armed };
    },
    choose: function (i) { if (!on) return false; choose(i); return true; }
  };
})();
