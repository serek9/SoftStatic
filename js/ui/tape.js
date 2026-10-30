var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The tape (12.4, V10.3): what passive fishing caught, played back as a VHS recording.
// An overlay (G.ui.menu.open('tape')) shown when you come back from time away and when
// passive mode ends. Lines appear one by one as it plays; action shows the rest, then
// closes; W/S scroll; Esc closes. In the ?compact view (12.5), where nobody may be watching,
// it closes by itself AUTO s after it has played. sim/passive.js decided everything on it:
//   - a catch listed as ??? is still a real catch (coins, journal) with its name lost;
//   - a missing range hides the lines inside it ("recording missing"), counted all the same;
//   - a phantom is a line in your own handwriting for a fish you never caught. The journal
//     gains the entry (phantom: true) and it stays out of every count until you catch it.
// The totals at the bottom count only what really happened.
// Phase 18: drawn in the 640×360 view's pixels with the fine font; Phase 46: in the small panel.
G.ui = G.ui || {};
G.ui.tape = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, F = S.fine;
  var ROWS = 7, PLAY = 0.15, AUTO = 6; // rows shown, s per line while playing
  var RECT = G.ui.panel.place(240, 140, 'top', [0, 0, 240, 140]), ROW_W = 240 - 2 * G.ui.panel.PAD - 8; // the panel; a row's widest text (clear of the scroll marks)
  var tape = null, rows = [], shown = 0, top = 0, t = 0, totals = '', title = '', place = '';

  function hhmm(h) {
    var m = Math.floor(G.sim.clock.wrap(h) * 60);
    return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60);
  }

  // The tape's lines, built once when it is shown.
  function build() {
    rows.length = 0;
    var gapShown = false;
    for (var i = 0; i < tape.entries.length; i++) {
      var e = tape.entries[i], sp = null;
      for (var k = 0; k < G.data.fish.length; k++) if (G.data.fish[k].id === e.id) sp = G.data.fish[k];
      if (e.g) {
        if (!gapShown) rows.push({ s: hhmm(tape.gap.from) + '-' + hhmm(tape.gap.to) + '  recording missing', key: 'fog_mid', hand: false });
        gapShown = true;
        continue;
      }
      if (e.ph) rows.push({ s: hhmm(e.h) + '  ' + sp.name + '. I kept this one.', key: 'fog_light', hand: true });
      else if (e.r === G.sim.passive.LOST) rows.push({ s: hhmm(e.h) + '  something took the line', key: 'fog_mid', hand: false });
      else if (e.q) rows.push({ s: hhmm(e.h) + '  ???  +' + e.c + 'c', key: 'bone', hand: false });
      else {
        var full = hhmm(e.h) + '  ' + sp.name + '  ' + e.len.toFixed(1) + ' cm  +' + e.c + 'c';
        rows.push({ s: F.measure(full) <= ROW_W ? full : hhmm(e.h) + '  ' + sp.name + '  +' + e.c + 'c', key: 'bone', hand: false }); // Phase 46: a long name drops the length
      }
    }
    if (tape.gap && !gapShown) rows.push({ s: hhmm(tape.gap.from) + '-' + hhmm(tape.gap.to) + '  recording missing', key: 'fog_mid', hand: false });
    if (!rows.length) rows.push({ s: 'Nothing on the line. Only water.', key: 'fog_mid', hand: false });
    totals = tape.caught + ' caught  ' + tape.lost + ' lost  +' + tape.coins + 'c';
    title = 'PLAY > ' + (tape.kind === 'away' ? 'AWAY' : 'PASSIVE');
    place = G.data.locations[tape.loc].name;
  }

  function show(tp) { tape = tp; build(); }

  function open() { shown = 0; top = 0; t = 0; }

  function update(dt) {
    var inp = G.core.input;
    t += dt;
    if (inp.pressed('back')) return false;
    if (inp.pressed('action')) {
      if (shown < rows.length) shown = rows.length;
      else return false;
    }
    if (shown < rows.length) shown = Math.min(rows.length, Math.floor(t / PLAY));
    if (G.core.compact && t > rows.length * PLAY + AUTO) return false;
    var max = Math.max(0, rows.length - ROWS);
    top = Math.max(0, Math.min(max, top + M.axis('up', 'down')));
    if (shown < rows.length && shown > top + ROWS) top = shown - ROWS; // follow the playback
    return true;
  }

  // Phase 46: the tape in the small panel (G.ui.panel) at the top centre, the world showing
  // round it. VHS inside the frame: scanlines, a tracking band drifting down, a line of the
  // picture now and then slipping sideways. All from a hash of time, so drawing changes nothing.
  function draw(ctx) {
    if (!tape) return;
    var U = G.ui.panel, frame = Math.floor(t * 12), i, y, X = RECT[0], Y = RECT[1], W = RECT[2], H = RECT[3], ix = U.left(X), iw = W - 2 * U.PAD;
    var slip = (S.hash(frame, 777) & 15) === 0 ? 1 : 0;
    U.frame(ctx, X + slip, Y, W, H, title, place, 'fog_light');
    var band = U.top(Y) + Math.floor((t * 14) % (H - U.TAB - 8));
    ctx.fillStyle = P.fog_dark; ctx.globalAlpha = 0.35;
    for (i = 0; i < 24; i++) { var h = S.hash(frame, i); ctx.fillRect(ix + h % (iw - 16), band + ((h >>> 9) % 6), 2 + ((h >>> 13) & 15), 1); }
    ctx.globalAlpha = 1;
    var end = Math.min(shown, top + ROWS), y0 = U.top(Y);
    for (i = top; i < end; i++) {
      var r = rows[i];
      y = y0 + (i - top) * U.ROW;
      F.drawText(ctx, r.s, ix + ((S.hash(frame, i) & 31) === 0 ? 1 : 0), y, r.key, r.hand ? 0.35 : 0, i * 13 + 5);
    }
    if (top > 0) F.drawText(ctx, '^', X + W - U.PAD - 5, y0, 'fog_mid');
    if (end < rows.length && shown >= rows.length) F.drawText(ctx, 'v', X + W - U.PAD - 5, y0 + (ROWS - 1) * U.ROW, 'fog_mid');
    // The counter runs from the start of the recording to its end as it plays.
    var at = rows.length ? Math.min(1, shown / rows.length) : 1;
    y = y0 + ROWS * U.ROW + 3;
    F.drawText(ctx, 'SP ' + hhmm(tape.from + G.sim.clock.wrap(tape.to - tape.from) * at), ix, y, 'fog_light');
    F.bold(ctx, totals, X + W - U.PAD - F.measureBold(totals), y, 'bone');
    var x = ix, ky = Y + H - U.PAD - U.KEY_H;
    x += U.hint(ctx, 'SPACE', shown < rows.length ? 'all' : 'close', x, ky);
    if (rows.length > ROWS) U.hint(ctx, 'W/S', 'scroll', x, ky);
    ctx.fillStyle = P.black; ctx.globalAlpha = 0.3;
    for (y = Y + U.TAB + 2; y < Y + H - 1; y += 2) ctx.fillRect(X + 1, y, W - 2, 1); // scanlines
    ctx.globalAlpha = 1;
  }

  // Time away (12.3), on load and from dbg.away: the passive sim fishes it, the save keeps
  // the tape, and the tape opens over the scene. now is the real clock in ms.
  function away(now) {
    var tp = G.sim.passive.away(G.state.save, now, G.rng, G.data);
    if (!tp) return null;
    G.core.save.autosave('time away');
    show(tp);
    G.ui.menu.open('tape');
    return tp;
  }

  return {
    native: true, RECT: RECT, ROW_W: ROW_W,
    show: show, open: open, update: update, draw: draw, away: away,
    rows: function () { return rows.map(function (r) { return r.s; }); },
    current: function () { return tape; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var tp = G.ui.tape.current();
  return 'tape ' + (tp ? tp.kind + ' ' + tp.entries.length + ' lines, ' + tp.caught + ' caught +' + tp.coins + 'c' + (tp.gap ? ' gap' : '') + (tp.phantom ? ' phantom ' + tp.phantom : '') : '-');
});
