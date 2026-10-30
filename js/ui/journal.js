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
// A phantom entry (12.4, from the tape) is a page in your handwriting for a fish you never
// caught: its picture shows faintly, and it counts for nothing until you really catch it.
// Phase 17: drawn at 640×360 as an open book. The left page is the selected entry (its
// picture on a plate, where it lives, how many were caught, the biggest catch, and the notes
// in handwriting); the right page is the count, the two filters and the grid of species.
G.ui = G.ui || {};
G.ui.journal = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, M = G.ui.menu, A = G.gfx.paint;
  var COLS = 5, ROWS = 5, CW = 44, CH = 44, GAP = 6, GX = 340, GY = 66;
  var NOTES_W = 252, NOTES_Y = 212, NOTES_MAX = 10;
  var RARITIES = ['all', 'common', 'uncommon', 'rare', 'legendary'];
  var HEAVY_NOTE = 'something heavier circles here';

  var locs = [], locIdx = 0, rarIdx = 0;
  var list = [];          // species indices passing the filters
  var focus = 2;          // 0 location filter, 1 rarity filter, 2 grid
  var sel = 0, top = 0;   // selected entry in list; first visible grid row
  var entry = [];         // every line of the entry page, built on selection: {s, key, hand}
  var notes = [];         // the handwritten part of it, wrapped for the page: {s, key}
  var page = { name: '', rarity: '', where: '', count: '', best: '', got: false, ghost: false };
  var title = { loc: '', rar: '', count: '', shown: '' }, selIsNew = false, heavyNote = false;
  var book = null;

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
    title.shown = n + ' / ' + list.length;
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
    // Phase 14: the rosters' other hint kinds (each is mechanically true; see data/fish.js).
    if (p[0] === 'hour' && p[1] === 'night') return 'Bites best at night, 20 to 06.';
    if (p[0] === 'bait') {
      var b = G.sim.economy.baitById(p[1], G.data);
      if (b) return 'Comes to ' + (b.label === false ? 'the jar with no label' : b.name.toLowerCase()) + '.';
    }
    if (ref === 'line') return 'Shy of the line: it saw mine and turned away. Only fluorocarbon fools it.'; // Phase 53
    if (ref === 'depth:deep') return 'Keeps to the deepest water here.';
    if (ref === 'depth:shallow') return 'Stays near the surface.';
    if (p[0] === 'spot') { var sp0 = spotById(sp, p[1]); if (sp0 && sp0.where) return 'Lives ' + sp0.where + '.'; }
    if (p[0] === 'mover') return 'Stays by the ' + p[1] + ', wherever it stands now. The ' + p[1] + ' moves.';
    if (ref === 'bait') return 'Takes ' + baitNames(sp) + '.';
    if (ref === 'depth') return 'Found ' + sp.habitat.depthMin + ' to ' + sp.habitat.depthMax + ' m down. ' + hoursText(sp);
    return ref;
  }

  // A spot of the species' own waters (data/loc_*.js spots) by id.
  function spotById(sp, id) {
    for (var l = 0; l < sp.locations.length; l++) {
      var L = G.data.locations[sp.locations[l]], s = (L && L.spots) || [];
      for (var i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
    }
    return null;
  }

  function hhmm(h) { var m = Math.round(h * 60); return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }

  function baitNames(sp) {
    var name = function (id) { var b = G.sim.economy.baitById(id, G.data); return b ? (b.label === false ? 'the unlabelled jar' : b.name.toLowerCase()) : id; };
    var s = sp.baitLikes.length ? sp.baitLikes.map(name).join(', ') : 'anything';
    // Phase 43: the lures it is proven to take: those it has been caught on.
    var j = G.state.save.journal[sp.id], on = j && j.took ? j.took.filter(function (id) { return G.sim.economy.isLure(id, G.data); }) : [];
    return on.length ? s + '; caught on ' + on.map(name).join(', ') : s;
  }

  function hoursText(sp) {
    if (!sp.timeLikes.length) return 'Any hour.';
    var a = sp.timeLikes[0], b = sp.timeLikes[sp.timeLikes.length - 1];
    return 'Likes ' + hhmm(a) + ' to ' + hhmm((b + 1) % 24) + '.';
  }

  // Builds the entry page for list[i]. Viewing a caught entry clears its NEW mark.
  function select(i) {
    sel = i;
    if (sel < top * COLS) top = Math.floor(sel / COLS);
    if (sel >= (top + ROWS) * COLS) top = Math.floor(sel / COLS) - ROWS + 1;
    entry.length = 0; notes.length = 0;
    selIsNew = false;
    page.name = ''; page.rarity = ''; page.where = ''; page.count = ''; page.best = ''; page.got = false; page.ghost = false;
    function add(s, key, hand) { entry.push({ s: s, key: key, hand: hand }); }
    function para(s, key, gap) {
      if (gap && notes.length) notes.push({ s: '', key: key });
      var ls = F.wrap(s, NOTES_W);
      for (var k = 0; k < ls.length; k++) { notes.push({ s: ls[k], key: key }); add(ls[k], key, true); }
    }
    if (!list.length) { para('Nothing here yet.', 'wood'); return; }
    var sp = G.data.fish[list[sel]], j = G.state.save.journal[sp.id], h, first = true;
    function note(ref) { para(hintText(ref, sp), j.late && j.late[ref] ? 'night_blue' : 'ink', first); first = false; }
    page.rarity = sp.rarity;
    page.where = sp.locations.map(function (id) { return G.data.locations[id] ? G.data.locations[id].name : id; }).join(', ');
    if (j) j.lateNew = false;
    if (j && !j.caught && j.phantom) {
      page.name = sp.name; page.ghost = true;
      add(sp.name, 'ink', true); add(sp.rarity, 'wood', false);
      para('My writing. I do not remember catching it.', 'ink'); first = false;
      for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
      return;
    }
    if (!j || !j.caught) {
      page.name = '???'; page.where = '';
      add('???', 'ink', true); add(sp.rarity, 'wood', false);
      para('Not caught yet.', 'wood'); first = false;
      if (j) for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
      return;
    }
    selIsNew = !j.read;
    j.read = true;
    page.name = sp.name; page.got = true;
    page.count = 'Caught ' + j.caught + (j.caught === 1 ? ' time' : ' times') + (j.released ? ', ' + j.released + ' let go' : ''); // Phase 51
    var bw = j.bestW < 0.1 ? Math.round(j.bestW * 1000) + ' g' : j.bestW.toFixed(2) + ' kg'; // Phase 44: small fish in grams
    page.best = j.bestLen.toFixed(1) + ' cm  |  ' + bw;
    add(sp.name, 'ink', true); add(sp.rarity, 'wood', false); add(page.count, 'ink', true); add('Best ' + j.bestLen.toFixed(1) + ' cm, ' + bw, 'ink', true);
    para(sp.desc, 'rust'); first = false;
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

  // ---- The book (baked once) --------------------------------------------------------------
  var PAGE = ['paper_dark', 'paper', 'bone', 'cream'];
  var LEATHER = ['wood_deep', 'rust_dark', 'rust', 'rust_hi'];
  function paintBook(c) {
    var x, y, i, tone = A.tone, px = A.px, box = A.box;
    A.reset();
    // The cover, with a stitched edge, seen around the pages.
    A.area(c, 12, 6, 616, 350, function (x, y) {
      var e = Math.min(x - 12, 627 - x, y - 6, 355 - y);
      if (e > 14 && x > 30 && x < 610 && y > 18 && y < 345) return '';
      return e < 2 ? 'ink' : (e < 5 ? 'rust_dark' : (e < 6 ? 'rust_hi' : 'rust'));
    });
    for (x = 22; x < 618; x += 6) { box(c, 'paper_dark', x, 11, 3, 1); box(c, 'paper_dark', x, 350, 3, 1); }
    // The page stack at the outer edges, then the two pages curving down into the spine.
    for (i = 0; i < 5; i++) { box(c, i % 2 ? 'paper_dark' : 'paper', 26 + i, 18 + i, 2, 330 - i * 2); box(c, i % 2 ? 'paper_dark' : 'paper', 612 - i, 18 + i, 2, 330 - i * 2); box(c, i % 2 ? 'paper_dark' : 'paper', 30, 344 - i, 580, 1); }
    A.area(c, 32, 20, 576, 320, function (x, y) {
      var d = Math.abs(x - 320), v = 1 - (d < 30 ? (30 - d) / 30 * 0.7 : 0) - (y > 333 ? 0.34 : 0);
      if (x < 38 || x > 602) v -= 0.34;
      return tone(PAGE, v, x, y);
    });
    box(c, 'reed_hi', 319, 20, 2, 320); box(c, 'paper_dark', 318, 20, 1, 320); box(c, 'paper_dark', 321, 20, 1, 320);
    // A coffee ring on the right page, and the ribbon bookmark out of the bottom.
    for (y = -26; y <= 26; y++) for (x = -26; x <= 26; x++) { var r = Math.sqrt(x * x + y * y); if (r > 21.5 && r < (x + y > 10 ? 24.5 : 23.2)) px(c, 'paper', 560 + x, 296 + y); }
    for (y = 0; y < 34; y++) box(c, y > 28 ? 'blood' : 'crimson', 326 + (y > 30 ? (y - 30) >> 1 : 0), 326 + y, 8 - (y > 30 ? (y - 30) : 0), 1);
    box(c, 'rug_hi', 326, 326, 2, 28);
    // Printed rules on the left page under the notes (handwriting sits on them).
    for (y = NOTES_Y + 10; y < 334; y += F.LINE_H) box(c, 'bone', 50, y, 254, 1);
    // The plate for the picture.
    for (y = 54; y < 146; y++) for (x = 50; x < 304; x++) {
      var cut = Math.min(x - 50, 303 - x) + Math.min(y - 54, 145 - y) < 4;
      if (cut) continue;
      px(c, x < 52 || y < 56 ? 'reed_hi' : (x > 301 || y > 143 ? 'bone' : 'paper_dark'), x, y);
    }
    // The name ribbon.
    for (y = 26; y < 46; y++) for (x = 70; x < 282; x++) {
      var notch = (x < 80 && Math.abs(y - 36) < 80 - x - 1) || (x > 271 && Math.abs(y - 36) < x - 271 - 1);
      if (notch) continue;
      px(c, y === 26 || y === 45 ? 'reed' : tone(['reed', 'reed_hi', 'paper_dark'], 0.75 - (y - 26) / 40, x, y), x, y);
    }
    // The page's headings.
    F.bold(c, '~ BIGGEST CATCH ~', 177 - (F.measureBold('~ BIGGEST CATCH ~') >> 1), 180, 'rust');
  }
  function bakeBook() { if (!book) book = G.gfx.bake.cached('journal:book640', function () { return G.gfx.bake.layer(640, 360, paintBook); }); }

  // A rounded tile: lighter when the species is known, framed in rust when selected.
  function drawCell(ctx, k, x, y) {
    var spIdx = list[k], sp = G.data.fish[spIdx], j = G.state.save.journal[sp.id], got = !!j && j.caught > 0;
    var on = focus === 2 && k === sel, ghost = !got && !!j && j.phantom;
    ctx.fillStyle = P[on ? 'rust' : 'paper_dark']; ctx.fillRect(x + 2, y, CW - 4, CH); ctx.fillRect(x, y + 2, CW, CH - 4); ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2);
    ctx.fillStyle = P[got || ghost ? 'bone' : 'reed_hi']; ctx.fillRect(x + 2, y + 2, CW - 4, CH - 4);
    ctx.fillStyle = P[got || ghost ? 'cream' : 'paper_dark']; ctx.fillRect(x + 3, y + 2, CW - 6, 1);
    var img = G.gfx.fishgen.portrait(spIdx, CW - 6, CH - 10, !(got || ghost));
    ctx.globalAlpha = ghost ? 0.35 : (got ? 1 : 0.4);
    ctx.drawImage(img, x + ((CW - img.width) >> 1), y + ((CH - img.height) >> 1));
    ctx.globalAlpha = 1;
    if (got && !j.read) { ctx.fillStyle = P.crimson; ctx.fillRect(x + CW - 9, y + CH - 9, 5, 5); ctx.fillStyle = P.rug_hi; ctx.fillRect(x + CW - 9, y + CH - 9, 2, 2); }
    if (j && j.lateNew) F.bold(ctx, '*', x + 4, y + 3, 'night_blue'); // a page that gained a line
  }

  // A filter as a pill; the focused one is filled dark like a pressed button.
  function pill(ctx, s, right, y, on) {
    var w = F.measure(s) + 12, x = right - w;
    ctx.fillStyle = P[on ? 'wood_dark' : 'paper_dark']; ctx.fillRect(x + 1, y, w - 2, 14); ctx.fillRect(x, y + 1, w, 12);
    if (on) { ctx.fillStyle = P.wood_mid; ctx.fillRect(x + 1, y + 1, w - 2, 1); }
    F.drawText(ctx, s, x + 6, y + 2, on ? 'cream' : 'wood_dark');
  }

  function draw(ctx) {
    var jt = jitter(), i;
    bakeBook();
    M.dim(ctx, 0.6);
    ctx.drawImage(book, 0, 0);

    // The left page: the entry.
    F.bold(ctx, page.name || ' ', 176 - (F.measureBold(page.name || ' ') >> 1), 31, 'wood_deep');
    if (list.length) {
      var img = G.gfx.fishgen.portrait(list[sel], 226, 70, !(page.got || page.ghost));
      if (page.ghost) ctx.globalAlpha = 0.35; else if (!page.got) ctx.globalAlpha = 0.4;
      ctx.drawImage(img, 177 - (img.width >> 1), 95 - (img.height >> 1));
      ctx.globalAlpha = 1;
      var rw = F.measure(page.rarity) + 12;
      ctx.fillStyle = P.reed_hi; ctx.fillRect(56, 128, rw, 12); ctx.fillStyle = P.paper_dark; ctx.fillRect(57, 129, rw - 2, 10);
      F.drawText(ctx, page.rarity, 62, 129, 'wood_deep');
      if (selIsNew) F.bold(ctx, 'NEW', 296 - F.measureBold('NEW'), 60, 'crimson');
    }
    if (page.where) {
      ctx.fillStyle = P.crimson; ctx.fillRect(53, 151, 7, 7); ctx.fillRect(54, 158, 5, 2); ctx.fillRect(55, 160, 3, 2);
      ctx.fillStyle = P.cream; ctx.fillRect(55, 153, 3, 3);
      F.drawText(ctx, page.where, 66, 150, 'wood_deep');
    }
    if (page.count) F.drawText(ctx, page.count, 66, 164, 'wood_deep');
    if (page.best) {
      ctx.fillStyle = P.rust; ctx.fillRect(52, 198, 12, 4); ctx.fillStyle = P.rust_hi; for (i = 0; i < 6; i++) ctx.fillRect(53 + i * 2, 198, 1, 2);
      F.drawText(ctx, page.best, 70, 195, 'wood_deep');
    } else F.drawText(ctx, '-', 70, 195, 'paper_dark');
    for (i = 0; i < notes.length && i < NOTES_MAX; i++) F.drawText(ctx, notes[i].s, 52, NOTES_Y + i * F.LINE_H, notes[i].key, jt, sel * 31 + i);

    // The right page: the count, the filters, the grid and its scrollbar.
    F.bold(ctx, title.shown, 340, 30, 'rust');
    pill(ctx, title.loc, 584, 24, focus === 0);
    pill(ctx, title.rar, 584, 42, focus === 1);
    var end = Math.min(list.length, (top + ROWS) * COLS);
    for (i = top * COLS; i < end; i++) {
      var c = i - top * COLS;
      drawCell(ctx, i, GX + (c % COLS) * (CW + GAP), GY + Math.floor(c / COLS) * (CH + GAP));
    }
    var rows = Math.max(ROWS, Math.ceil(list.length / COLS)), trackH = ROWS * (CH + GAP) - GAP, thumb = Math.max(16, Math.round(trackH * ROWS / rows));
    ctx.fillStyle = P.paper_dark; ctx.fillRect(594, GY, 5, trackH);
    ctx.fillStyle = P.rust; ctx.fillRect(594, GY + Math.round((trackH - thumb) * (rows > ROWS ? top / (rows - ROWS) : 0)), 5, thumb);
    if (heavyNote) F.drawText(ctx, HEAVY_NOTE, 342, 316, 'rust', Math.max(jt, 0.2), 47);
    F.drawText(ctx, 'W/S A/D browse   J close', 342, 330, 'paper_dark');
  }

  // dbg: draws the current page into a fresh canvas and returns it (handwriting checks).
  function render() {
    var cv = G.gfx.bake.canvas(640, 360), ctx = cv.getContext('2d');
    draw(ctx);
    return cv;
  }

  return {
    native: true,
    open: open, update: update, draw: draw, render: render, jitter: jitter, HEAVY_NOTE: HEAVY_NOTE, close: close,
    lastLate: function () { return lastLate; },
    state: function () { return { loc: locs[locIdx], rarity: RARITIES[rarIdx], list: list.slice(), sel: sel, focus: focus, heavyNote: heavyNote, count: title.count, entry: entry.map(function (e) { return e.s; }) }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  return 'journal jitter ' + G.ui.journal.jitter().toFixed(2) + (G.ui.menu.current() === 'journal' ? '  ' + JSON.stringify(G.ui.journal.state().loc) : '');
});
