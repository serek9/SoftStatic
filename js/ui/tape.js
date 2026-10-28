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
G.ui = G.ui || {};
G.ui.tape = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu;
  var X = 18, Y = 22, ROWS = 12, PLAY = 0.15, AUTO = 6; // text left, first row, rows shown, s per line while playing
  var tape = null, rows = [], shown = 0, top = 0, t = 0, totals = '', head = '';

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
      else rows.push({ s: hhmm(e.h) + '  ' + sp.name + '  ' + e.len.toFixed(1) + ' cm  +' + e.c + 'c', key: 'bone', hand: false });
    }
    if (tape.gap && !gapShown) rows.push({ s: hhmm(tape.gap.from) + '-' + hhmm(tape.gap.to) + '  recording missing', key: 'fog_mid', hand: false });
    if (!rows.length) rows.push({ s: 'Nothing on the line. Only water.', key: 'fog_mid', hand: false });
    totals = tape.caught + ' caught  ' + tape.lost + ' lost  +' + tape.coins + 'c';
    head = (tape.kind === 'away' ? 'WHILE YOU WERE AWAY' : 'PASSIVE') + '  ' + G.data.locations[tape.loc].name.toUpperCase();
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

  // VHS: scanlines, a tracking band drifting down, a line of the picture now and then
  // slipping sideways. All from a hash of time, so drawing changes nothing.
  function draw(ctx) {
    if (!tape) return;
    var frame = Math.floor(t * 12), i, y;
    ctx.fillStyle = P.night_ink; ctx.fillRect(0, 0, 320, 180);
    var band = Math.floor((t * 14) % 220) - 20;
    ctx.fillStyle = P.fog_dark;
    for (i = 0; i < 90; i++) {
      var h = S.hash(frame, i);
      ctx.globalAlpha = 0.35; ctx.fillRect(h % 320, band + ((h >>> 9) % 8), 1 + ((h >>> 13) & 7), 1);
    }
    ctx.globalAlpha = 1;
    var slip = (S.hash(frame, 777) & 15) === 0 ? 1 : 0;
    S.drawText(ctx, 'PLAY >', 8 + slip, 6, 'bone');
    S.drawText(ctx, head, 312 - S.measure(head), 6, 'fog_light');
    var end = Math.min(shown, top + ROWS);
    for (i = top; i < end; i++) {
      var r = rows[i];
      y = Y + (i - top) * 11;
      S.drawText(ctx, r.s, X + ((S.hash(frame, i) & 31) === 0 ? 1 : 0), y, r.key, r.hand ? 0.35 : 0, i * 13 + 5);
    }
    if (top > 0) S.drawText(ctx, '^', 306, Y, 'fog_mid');
    if (end < rows.length && shown >= rows.length) S.drawText(ctx, 'v', 306, Y + (ROWS - 1) * 11, 'fog_mid');
    // The counter runs from the start of the recording to its end as it plays.
    var at = rows.length ? Math.min(1, shown / rows.length) : 1;
    S.drawText(ctx, 'SP ' + hhmm(tape.from + G.sim.clock.wrap(tape.to - tape.from) * at), 8, 164, 'fog_light');
    S.drawText(ctx, totals, 312 - S.measure(totals), 164, 'bone');
    ctx.fillStyle = P.black; ctx.globalAlpha = 0.3;
    for (y = 0; y < 180; y += 2) ctx.fillRect(0, y, 320, 1); // scanlines
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
    show: show, open: open, update: update, draw: draw, away: away,
    rows: function () { return rows.map(function (r) { return r.s; }); },
    current: function () { return tape; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var tp = G.ui.tape.current();
  return 'tape ' + (tp ? tp.kind + ' ' + tp.entries.length + ' lines, ' + tp.caught + ' caught +' + tp.coins + 'c' + (tp.gap ? ' gap' : '') + (tp.phantom ? ' phantom ' + tp.phantom : '') : '-');
});
