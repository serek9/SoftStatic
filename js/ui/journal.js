var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The field journal (9.3, V9): an overlay opened with J. Left page: location and rarity
// filters over a grid of species, a silhouette until caught, NEW until looked at. Right
// page: the entry, with the hints discovered so far. Entries are handwritten, and the
// handwriting degrades with the current location's unease (V10.8, §2).
// Hints are discovered by catching: the species' hintRefs on the first catch (economy
// records them), the baits it takes on the second, its depth and hours on the third.
// The margin note "something heavier circles here" (D4) shows while a fish too heavy for
// the rod has been near at that location and the rod still cannot hold it.
// Pages also gain text after you leave them (10.5, V10.8): closing the journal lets
// sim/unease.js lateHint write one true hint you never found. Those notes are in blue pen,
// even on pages of fish not caught yet, and a page with a new one is marked in the grid.
G.ui = G.ui || {};
G.ui.journal = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu;
  var BX = 10, BY = 8, BW = 300, BH = 164, SPINE = 160;
  var COLS = 3, ROWS = 3, CW = 44, CH = 34, GX = 17, GY = 45;
  var RARITIES = ['all', 'common', 'uncommon', 'rare', 'legendary'];
  var HEAVY_NOTE = 'something heavier circles here';

  var locs = [], locIdx = 0, rarIdx = 0;
  var list = [];          // species indices passing the filters
  var focus = 2;          // 0 location filter, 1 rarity filter, 2 grid
  var sel = 0, top = 0;   // selected entry in list; first visible grid row
  var entry = [];         // the right page, built on selection: {s, key, hand, y}
  var title = { loc: '', rar: '', count: '' }, selIsNew = false, heavyNote = false;

  function jitter() {
    var run = G.state.run;
    return run.loc ? G.sim.unease.get(G.state.save, run.loc) : 0;
  }

  // Filter choices: every location that has species, after 'all'.
  function buildLocs() {
    locs.length = 0;
    locs.push('all');
    for (var id in G.data.locations) {
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].locations.indexOf(id) >= 0) { locs.push(id); break; }
    }
  }

  function locName(id) {
    if (id === 'all') return 'Every water';
    return G.data.locations[id].name;
  }

  function caught(id) { var j = G.state.save.journal[id]; return !!j && j.caught > 0; }

  function filter() {
    var loc = locs[locIdx], rar = RARITIES[rarIdx], n = 0;
    list.length = 0;
    for (var i = 0; i < G.data.fish.length; i++) {
      var f = G.data.fish[i];
      if (loc !== 'all' && f.locations.indexOf(loc) < 0) continue;
      if (rar !== 'all' && f.rarity !== rar) continue;
      list.push(i);
      if (caught(f.id)) n++;
    }
    title.loc = '< ' + locName(loc) + ' >';
    title.rar = '< ' + (rar === 'all' ? 'all rarities' : rar) + ' >';
    title.count = n + ' of ' + list.length + ' caught';
    heavyNote = false;
    var rod = G.data.gear.rods[G.state.save.gear.rod].maxMass;
    for (var k = 0; k < G.data.fish.length; k++) {
      var sp = G.data.fish[k];
      for (var l = 0; l < sp.locations.length; l++) {
        var at = sp.locations[l];
        if ((loc === 'all' || loc === at) && G.state.save.flags.heavy[at] && sp.mass > rod) heavyNote = true;
      }
    }
    if (sel >= list.length) sel = Math.max(0, list.length - 1);
    select(sel);
  }

  function hintText(ref, sp) {
    var p = ref.split(':');
    if (p[0] === 'hour' && p[1] === 'grey') return 'Bites best in the grey hours, 07 to 17.';
    if (p[0] === 'window') {
      var w = G.sim.clock.windowById(G.data.windows, p[1]);
      if (w) return 'Only between ' + hhmm(w.from) + ' and ' + hhmm(w.to) + '. The owl calls at ' + hhmm(w.cue) + '.';
    }
    if (p[0] === 'unease') return 'Comes only after sitting still a long while at night.';
    if (ref === 'bait') return 'Takes ' + baitNames(sp) + '.';
    if (ref === 'depth') return 'Found ' + sp.habitat.depthMin + ' to ' + sp.habitat.depthMax + ' m down. ' + hoursText(sp);
    return ref;
  }

  function hhmm(h) { var m = Math.round(h * 60); return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }

  function baitNames(sp) {
    if (!sp.baitLikes.length) return 'anything';
    return sp.baitLikes.map(function (id) { var b = G.sim.economy.baitById(id, G.data); return b ? (b.label === false ? 'the unlabelled jar' : b.name.toLowerCase()) : id; }).join(', ');
  }

  function hoursText(sp) {
    if (!sp.timeLikes.length) return 'Any hour.';
    var a = sp.timeLikes[0], b = sp.timeLikes[sp.timeLikes.length - 1];
    return 'Likes ' + hhmm(a) + ' to ' + hhmm((b + 1) % 24) + '.';
  }

  // Builds the right page for list[i]. Viewing a caught entry clears its NEW mark.
  function select(i) {
    sel = i;
    if (sel < top * COLS) top = Math.floor(sel / COLS);
    if (sel >= (top + ROWS) * COLS) top = Math.floor(sel / COLS) - ROWS + 1;
    entry.length = 0;
    selIsNew = false;
    if (!list.length) { entry.push({ s: 'Nothing here yet.', key: 'wood', hand: true, y: 0 }); return; }
    var sp = G.data.fish[list[sel]], j = G.state.save.journal[sp.id], y = 0;
    function add(s, key, hand, gap) { y += gap || 0; entry.push({ s: s, key: key, hand: hand, y: y }); y += S.LINE_H; }
    function para(s, key, gap) { var ls = S.wrap(s, 132); for (var k = 0; k < ls.length; k++) add(ls[k], key, true, k ? 0 : gap); }
    var notes = 0, h;
    function note(ref) { para(hintText(ref, sp), j.late && j.late[ref] ? 'night_blue' : 'ink', notes++ ? 0 : 4); }
    if (j) j.lateNew = false;
    if (!j || !j.caught) {
      add('???', 'ink', true);
      add(sp.rarity, 'wood', false);
      add('Not caught yet.', 'wood', true, 4);
      if (j) for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
      return;
    }
    selIsNew = !j.read;
    j.read = true;
    add(sp.name, 'ink', true);
    add(sp.rarity, 'wood', false);
    add('Caught ' + j.caught + (j.caught === 1 ? ' time' : ' times'), 'ink', true, 4);
    add('Best ' + j.bestLen.toFixed(1) + ' cm, ' + j.bestW.toFixed(2) + ' kg', 'ink', true);
    para(sp.desc, 'rust', 4);
    for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
    if (j.caught >= 2 && j.hints.indexOf('bait') < 0) note('bait');
    if (j.caught >= 3 && j.hints.indexOf('depth') < 0) note('depth');
  }

  function open() {
    buildLocs();
    var here = locs.indexOf(G.state.run.loc);
    locIdx = here >= 0 ? here : 0;
    focus = 2; top = 0;
    filter();
  }

  // Leaving the journal: a page may gain a hint you never found, read next time (10.5).
  var lastLate = null;
  function close() {
    var run = G.state.run;
    if (!run.loc) return;
    lastLate = G.sim.unease.lateHint(G.state.save, run.loc, G.data, false);
    if (lastLate && G.core.debug) G.core.debug.log('a journal page gained a line: ' + lastLate.id + ' ' + lastLate.ref);
  }

  function update() {
    var inp = G.core.input;
    if (inp.pressed('journal') || inp.pressed('back')) { close(); return false; }
    var lr = M.axis('left', 'right'), ud = M.axis('up', 'down');
    if (focus < 2) {
      if (lr && focus === 0) { locIdx = (locIdx + lr + locs.length) % locs.length; sel = 0; top = 0; filter(); }
      if (lr && focus === 1) { rarIdx = (rarIdx + lr + RARITIES.length) % RARITIES.length; sel = 0; top = 0; filter(); }
      if (ud > 0) focus++;
      if (ud < 0 && focus > 0) focus--;
      return true;
    }
    if (ud < 0 && sel < COLS) { focus = 1; return true; }
    var next = sel + lr + ud * COLS;
    if ((lr || ud) && next >= 0 && next < list.length) select(next);
    return true;
  }

  function drawCell(ctx, k, x, y) {
    var spIdx = list[k], sp = G.data.fish[spIdx], j = G.state.save.journal[sp.id], got = !!j && j.caught > 0;
    var on = focus === 2 && k === sel;
    ctx.fillStyle = P[on ? 'rust' : 'wood_hi'];
    ctx.fillRect(x, y, CW, 1); ctx.fillRect(x, y + CH - 1, CW, 1); ctx.fillRect(x, y, 1, CH); ctx.fillRect(x + CW - 1, y, 1, CH);
    var name = got ? G.gfx.fishgen.sprite(spIdx) : G.gfx.fishgen.silhouette(spIdx), d = S.get(name);
    var sx = x + ((CW - d.w) >> 1), sy = y + ((CH - d.h) >> 1);
    if (d.w > CW - 2) { ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, CW - 2, CH - 2); ctx.clip(); S.draw(ctx, name, sx, sy, 0, false); ctx.restore(); }
    else S.draw(ctx, name, sx, sy, 0, false);
    if (got && !j.read) S.drawText(ctx, 'NEW', x + 2, y + 2, 'crimson');
    if (j && j.lateNew) S.drawText(ctx, '*', x + CW - 6, y + 2, 'night_blue'); // a page that gained a line
  }

  function draw(ctx) {
    var jt = jitter(), i;
    M.dim(ctx, 0.6);
    M.panel(ctx, BX, BY, BW, BH, 'wood_dark', 'paper');
    ctx.fillStyle = P.wood; ctx.fillRect(SPINE - 1, BY, 2, BH);

    // Left page: printed headings and filters, then the grid.
    S.drawText(ctx, 'FIELD JOURNAL', GX, BY + 5, 'ink');
    S.drawText(ctx, title.loc, GX, BY + 16, focus === 0 ? 'rust' : 'wood');
    S.drawText(ctx, title.rar, GX, BY + 25, focus === 1 ? 'rust' : 'wood');
    var end = Math.min(list.length, (top + ROWS) * COLS);
    for (i = top * COLS; i < end; i++) {
      var c = i - top * COLS;
      drawCell(ctx, i, GX + (c % COLS) * (CW + 2), GY + Math.floor(c / COLS) * (CH + 2));
    }
    if (top > 0) S.drawText(ctx, '^', SPINE - 8, GY, 'wood');
    if (end < list.length) S.drawText(ctx, 'v', SPINE - 8, GY + ROWS * (CH + 2) - 8, 'wood');
    S.drawText(ctx, title.count, GX, BY + BH - 10, 'wood', jt, 3);

    // Right page: the entry.
    var rx = SPINE + 7;
    if (list.length) {
      var spIdx = list[sel], got = caught(G.data.fish[spIdx].id);
      var name = got ? G.gfx.fishgen.sprite(spIdx) : G.gfx.fishgen.silhouette(spIdx), d = S.get(name);
      var scale = Math.max(1, Math.min(3, Math.floor(128 / d.w), Math.floor(34 / d.h)));
      ctx.save();
      ctx.translate(rx + 68 - (d.w * scale >> 1), BY + 26 - (d.h * scale >> 1));
      ctx.scale(scale, scale);
      S.draw(ctx, name, 0, 0, 0, false);
      ctx.restore();
      if (selIsNew) S.drawText(ctx, 'NEW', SPINE + BW / 2 - 24, BY + 5, 'crimson');
    }
    for (i = 0; i < entry.length; i++) {
      var e = entry[i];
      S.drawText(ctx, e.s, rx, BY + 48 + e.y, e.key, e.hand ? jt : 0, sel * 31 + i);
    }
    if (heavyNote) S.drawText(ctx, HEAVY_NOTE, rx, BY + BH - 10, 'rust', Math.max(jt, 0.2), 47);
  }

  // dbg: draws the current page into a fresh canvas and returns it (handwriting checks).
  function render() {
    var cv = G.gfx.bake.canvas(320, 180), ctx = cv.getContext('2d');
    draw(ctx);
    return cv;
  }

  return {
    open: open, update: update, draw: draw, render: render, jitter: jitter, HEAVY_NOTE: HEAVY_NOTE, close: close,
    lastLate: function () { return lastLate; },
    state: function () { return { loc: locs[locIdx], rarity: RARITIES[rarIdx], list: list.slice(), sel: sel, focus: focus, heavyNote: heavyNote, entry: entry.map(function (e) { return e.s; }) }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  return 'journal jitter ' + G.ui.journal.jitter().toFixed(2) + (G.ui.menu.current() === 'journal' ? '  ' + JSON.stringify(G.ui.journal.state().loc) : '');
});
