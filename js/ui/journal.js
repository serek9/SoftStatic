var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The field journal (9.3, V9): an overlay opened with J. Left page: location and family
// (Phase 68: was rarity) filters over a grid of species, a silhouette until caught, NEW until
// looked at. Right page: the entry, with the hints discovered so far. Entries are
// handwritten, and the handwriting degrades with the current location's unease (V10.8, §2).
// Phase 68: species that live in no water yet (the sea's) are left out. Hints are discovered
// by catching: its favourite lure type on the first catch, the baits it takes on the second,
// its depth and hours on the third.
// The margin note "something heavier circles here" (D4) shows while a fish too heavy for
// the rod has been near at that location and the rod still cannot hold it.
// Pages also gain text after you leave them (10.5, V10.8): closing the journal lets
// sim/unease.js lateHint write one true hint you never found. Those notes are in blue pen,
// even on pages of fish not caught yet, and a page with a new one is marked in the grid.
// A phantom entry (12.4, from the tape) is a page in your handwriting for a fish you never
// caught: its picture shows faintly, and it counts for nothing until you really catch it.
// Phase 17: drawn at 640×360 as an open book. Phase 54: two panels in the shared style
// (G.ui.panel), like every other menu: the entry on the left (its picture on a plate, where it
// lives, how many were caught, the biggest catch, and the notes in handwriting), and the
// count, the two filters and the grid of species on the right.
// Phase 85 (PLAN_WINTER.md 2.5): a caught freshwater species' page says which size classes have
// been caught (counted from Phase 85 on) of those it comes in; at the Back Pond the page has a
// STOCK row: Space stocks one fish of it in a size caught (the row steps through them), free,
// once every size is caught and the pond is clean, up to its capacity.
G.ui = G.ui || {};
G.ui.journal = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, M = G.ui.menu;
  var COLS = 5, ROWS = 5, CW = 52, CH = 46, GAP = 6, GX = 322, GY = 46; // Phase 54: the grid in the right panel
  var NOTES_W = 286, NOTES_MAX = 14, WHERE_W = 276;
  // Phase 90: the layout for the UI layer. On a PC at the normal text size it is Phase 54's,
  // number for number. On the layer (a phone, or large text) the two panels share the screen
  // when they fit (four columns of tiles on a phone); when they do not, one panel shows the grid
  // and Space or a tap on the chosen tile turns to its page (`reading`), Esc turns back.
  var narrow = false, reading = false, lv = -1, openT = 0;
  function lay() {
    var U = G.ui.panel;
    if (lv === U.ver()) return false;
    lv = U.ver();
    if (!U.on()) {
      LP[0] = 8; LP[1] = 8; LP[2] = 300; LP[3] = 344; RP[0] = 316; RP[1] = 8; RP[2] = 316; RP[3] = 344;
      COLS = 5; ROWS = 5; GX = 322; GY = 46; NOTES_W = 286; NOTES_MAX = 14; WHERE_W = 276; narrow = false;
    } else {
      var p = U.pic(), insL = U.layer.insL, insR = U.layer.insR, bx = Math.max(insL, p[0] - 40) + 8, bw = Math.min(U.VW() - insR, p[0] + p[2] + 40) - 8 - bx, by = 8, bh = U.VH() - 16;
      var gridW = function (c) { return 2 * U.PAD + c * (CW + GAP) - GAP + 14; };
      COLS = bw >= 300 + 8 + gridW(5) ? 5 : 4;
      var rw = gridW(COLS), lw = bw - rw - 8;
      narrow = lw < 250;
      if (narrow) { COLS = Math.max(3, Math.floor((bw - 2 * U.PAD - 14 + GAP) / (CW + GAP))); rw = bw; lw = bw; }
      RP[0] = narrow ? bx : bx + lw + 8; RP[1] = by; RP[2] = rw; RP[3] = bh;
      LP[0] = bx; LP[1] = by; LP[2] = lw; LP[3] = bh;
      GX = RP[0] + U.PAD; GY = by + 38;
      ROWS = Math.max(2, Math.floor((bh - 38 - 34) / (CH + GAP)));
      NOTES_W = lw - 2 * U.PAD - 2; WHERE_W = NOTES_W - 10;
      NOTES_MAX = Math.max(3, Math.floor((bh - (U.TAB + U.PAD + PLATE_H + 6 + 3 * U.ROW + 4) - U.PAD - (U.touch() ? 0 : U.KEY_H)) / F.LINE_H));
    }
    return true;
  }
  var FAMILIES = ['all'];  // Phase 68: 'all' and every family with a species in some water, in data order
  // Phase 68: what each lure type is called in the notes.
  var TYPE_NAMES = { float: 'a float', crank: 'crankbaits', spinner: 'spinnerbaits', spoon: 'spoons', dropshot: 'a dropshot',
    wacky: 'a wacky worm', jighead: 'jigheads', topwater: 'topwater lures', blade: 'bladebaits', glide: 'glidebaits', swim: 'swimbaits' };
  var HEAVY_NOTE = 'something heavier circles here';

  var locs = [], locIdx = 0, famIdx = 0;
  var list = [];          // species indices passing the filters
  var focus = 2;          // 0 location filter, 1 family filter, 2 grid
  var sel = 0, top = 0;   // selected entry in list; first visible grid row
  var entry = [];         // every line of the entry page, built on selection: {s, key, hand}
  var notes = [];         // the handwritten part of it, wrapped for the page: {s, key}
  var page = { name: '', family: '', where: '', count: '', best: '', got: false, ghost: false, bestAt: '', parts: [] }; // Phase 93.2: bestAt, parts
  var title = { loc: '', rar: '', count: '', shown: '' }, selIsNew = false, heavyNote = false;

  function jitter() {
    var run = G.state.run;
    return run.loc ? G.sim.unease.get(G.state.save, run.loc) : 0;
  }

  // Filter choices: every location that has species, after 'all'; every family (Phase 68).
  function buildLocs() {
    locs.length = 0;
    locs.push('all');
    for (var id in G.data.locations) {
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].locations.indexOf(id) >= 0) { locs.push(id); break; }
    }
    FAMILIES.length = 1;
    for (var k = 0; k < G.data.fish.length; k++) {
      var f = G.data.fish[k];
      if (f.locations.length && FAMILIES.indexOf(f.family) < 0) FAMILIES.push(f.family);
    }
  }

  function locName(id) {
    if (id === 'all') return 'Every water';
    return G.data.locations[id].name;
  }

  function caught(id) { var j = G.state.save.journal[id]; return !!j && j.caught > 0; }

  function filter() {
    var loc = locs[locIdx], fam = FAMILIES[famIdx] || 'all', n = 0;
    list.length = 0;
    for (var i = 0; i < G.data.fish.length; i++) {
      var f = G.data.fish[i];
      if (!f.locations.length) continue;                       // Phase 68: not in any water yet
      if (loc !== 'all' && f.locations.indexOf(loc) < 0) continue;
      if (fam !== 'all' && f.family !== fam) continue;
      list.push(i);
      if (caught(f.id)) n++;
    }
    title.loc = '< ' + locName(loc) + ' >';
    title.rar = '< ' + (fam === 'all' ? 'all families' : fam) + ' >';
    title.count = n + ' of ' + list.length + ' caught';
    title.shown = n + ' / ' + list.length;
    heavyNote = false;
    var rod = G.data.gear.rods[G.sim.economy.rodInHand(G.state.save, G.data)].maxMass;
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

  // Phase 68: every note is read from the species' data, so each is true: 'lure' (its
  // favourite lure type and the others it takes), 'bait', 'depth' (and its hours), 'line'.
  function hintText(ref, sp) {
    if (ref === 'line') return 'Shy of the line: it saw mine and turned away. Only fluorocarbon fools it.'; // Phase 53
    if (ref === 'lure') return lureText(sp);
    if (ref === 'bait') return 'Takes ' + baitNames(sp) + '.';
    if (ref === 'depth') return homeLines(sp).join(' ');
    return '';
  }

  // Phase 75 (PLAN_WATERS.md 4.1): where it lives, how deep and when, one line a home:
  // "Hartsmere Lake, The Old Bench: 20 to 32 m, at dawn."
  var WHEN = { dawn: 'at dawn', day: 'by day', dusk: 'at dusk', night: 'at night' };
  function homeLines(sp) {
    return sp.homes.map(function (h) {
      var L = G.data.locations[h.loc], rn = h.reaches.map(function (id) { for (var i = 0; i < L.reaches.length; i++) if (L.reaches[i].id === id) return L.reaches[i].name; return id; });
      var when = h.hours.length ? h.hours.map(function (n) { return WHEN[n]; }) : ['at any hour'];
      if (when.length > 1) when = [when.slice(0, -1).join(', ') + ' and ' + when[when.length - 1]];
      return L.name + (rn.length ? ', ' + rn.join(' and ') : '') + ': ' + h.depth[0] + ' to ' + h.depth[1] + ' m' + (h.bed ? ' on the bottom' : '') + ', ' + when[0] + '.';
    });
  }

  // Phase 93.2: its best parts of the day: the hours of its home at the water the boat is on,
  // or else its first home's (none for a fish that bites at any hour).
  function bestParts(sp, out) {
    var r = G.state.run, here = r && r.loc, h = null, i;
    for (i = 0; i < sp.homes.length && !h; i++) if (sp.homes[i].loc === here) h = sp.homes[i];
    h = h || sp.homes[0];
    out.length = 0;
    if (h) for (i = 0; i < h.hours.length; i++) out.push(h.hours[i]);
    return out;
  }

  function lureText(sp) {
    var fav = [], also = [];
    for (var k in sp.lureTypes) (sp.lureTypes[k] === 2 ? fav : also).push(TYPE_NAMES[k] || k);
    if (!fav.length && !also.length) return 'Ignores lures. Only live bait, on a float or not.';
    var s = fav.length ? 'Its favourite lure: ' + fav.join(', ') + '.' : '';
    if (also.length) s += s ? ' Also takes ' + also.join(', ') + '.' : 'Takes ' + also.join(', ') + '.';
    return s;
  }


  function baitNames(sp) {
    var name = function (id) { var b = G.sim.economy.baitById(id, G.data); return b ? (b.label === false ? 'the unlabelled jar' : b.name.toLowerCase()) : id; };
    var s = sp.baitLikes.map(name).join(', ');
    // Phase 43: the lures it is proven to take: those it has been caught on.
    var j = G.state.save.journal[sp.id], on = j && j.took ? j.took.filter(function (id) { return G.sim.economy.isLure(id, G.data); }) : [];
    return on.length ? s + '; caught on ' + on.map(name).join(', ') : s;
  }

  // Builds the entry page for list[i]. Viewing a caught entry clears its NEW mark.
  function select(i) {
    sel = i;
    if (sel < top * COLS) top = Math.floor(sel / COLS);
    if (sel >= (top + ROWS) * COLS) top = Math.floor(sel / COLS) - ROWS + 1;
    entry.length = 0; notes.length = 0;
    selIsNew = false;
    page.name = ''; page.family = ''; page.where = ''; page.count = ''; page.best = ''; page.got = false; page.ghost = false; page.bestAt = ''; page.parts.length = 0;
    function add(s, key, hand) { entry.push({ s: s, key: key, hand: hand }); }
    function para(s, key, gap) {
      if (gap && notes.length) notes.push({ s: '', key: key });
      var ls = F.wrap(s, NOTES_W);
      for (var k = 0; k < ls.length; k++) { notes.push({ s: ls[k], key: key }); add(ls[k], key, true); }
    }
    if (!list.length) { para('Nothing here yet.', 'wood'); return; }
    var sp = G.data.fish[list[sel]], j = G.state.save.journal[sp.id], h, first = true;
    function note(ref) {
      var key = j.late && j.late[ref] ? 'night_blue' : 'ink';
      if (ref === 'depth') homeLines(sp).forEach(function (s, k) { para(s, key, first && k === 0); }); // Phase 75: a line a home
      else para(hintText(ref, sp), key, first);
      first = false;
    }
    page.family = sp.family;
    page.where = sp.locations.map(function (id) { return G.data.locations[id] ? G.data.locations[id].name : id; }).join(', ');
    if (F.measure(page.where) > WHERE_W) page.where = sp.locations.length + ' waters (where, below)';                // Phase 75: too many to name on one line
    if (j) j.lateNew = false;
    if (j && !j.caught && j.phantom) {
      page.name = sp.name; page.ghost = true;
      add(sp.name, 'ink', true); add(sp.family, 'wood', false);
      para('My writing. I do not remember catching it.', 'ink'); first = false;
      for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
      return;
    }
    if (!j || !j.caught) {
      page.name = '???'; page.where = '';
      add('???', 'ink', true); add(sp.family, 'wood', false);
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
    page.bestAt = j.bestAt || '';                                                    // Phase 93.2: when the best was caught (from Phase 93 on)
    if (page.bestAt) page.best += '  ' + WHEN[page.bestAt];
    bestParts(sp, page.parts);
    add(sp.name, 'ink', true); add(sp.family, 'wood', false); add(page.count, 'ink', true); add('Best ' + j.bestLen.toFixed(1) + ' cm, ' + bw, 'ink', true);
    para(sp.latin + '.', 'rust'); first = false;                   // Phase 68: the Latin name where the riddle was
    for (h = 0; h < j.hints.length; h++) note(j.hints[h]);
    if (j.hints.indexOf('lure') < 0) note('lure');
    if (j.caught >= 2 && j.hints.indexOf('bait') < 0) note('bait');
    if (j.hints.indexOf('depth') < 0) note('depth');                // Phase 75: where, how deep and when, from the first catch
    if (sp.ice) para(ICE_SAYS[sp.turnUpName] || '', 'wood', true);   // Phase 80: how often it turns up under the ice
    sizesNote(sp, j, para);
    if (j.ways && j.ways.length) para('Took ' + j.ways.join('; ') + '.', 'wood', true); // Phase 105: how it took the hook
    if (sp.trophyKg && j.bestW >= sp.trophyKg) para('The ice monster. ' + j.bestW.toFixed(2) + ' kg, out of a hole in the ice.', 'rust', true); // Phase 80: the one named trophy
  }
  // Phase 85: the size classes caught, of those the species comes in; and the STOCK row's state.
  function sizesNote(sp, j, para) {
    var Pd = G.sim.pond;
    if (!Pd.freshwater(sp, G.data)) return;
    var got = Pd.caughtSizes(G.state.save, sp, G.data), all = Pd.wanted(sp, G.data);
    para('Sizes caught: ' + (got.length ? got.join(' ') : 'none noted') + ' (of ' + all.join(' ') + ').' + (j.caught > (j.sized || 0) ? ' Catches from before the pond went unsized.' : ''), 'wood', true);
  }
  var stockRow = { show: false, ok: false, cls: '', text: '', idx: 0, said: '' };
  function stockState() {
    var r = G.state.run, L = r && r.loc ? G.data.locations[r.loc] : null, Pd = G.sim.pond, save = G.state.save;
    stockRow.show = !!(L && L.pond && list.length && save.pond);
    if (!stockRow.show) return;
    var sp = G.data.fish[list[sel]], j = save.journal[sp.id], v = Pd.canStock(save, sp, G.data), got = Pd.caughtSizes(save, sp, G.data);
    if (!j || !j.caught) { stockRow.show = false; return; }
    stockRow.ok = v === Pd.OK;
    stockRow.cls = got.length ? got[stockRow.idx % got.length] : '';
    stockRow.text = stockRow.said || (v === Pd.OK ? 'Space: one goes in, free. Pond ' + save.pond.stock.length + ' / ' + Pd.capOf(G.data) + '.' :
      (v === Pd.NOT ? 'Not a fish for the pond.' : (v === Pd.SIZE ? 'Catch it in every size first: still ' + Pd.missingSizes(save, sp, G.data).join(' ') + '.' :
      (v === Pd.DIRTY ? 'Not until the pond runs clear.' : 'The pond is full.'))));
  }
  function stockOne() {
    var save = G.state.save, Pd = G.sim.pond, sp = G.data.fish[list[sel]];
    if (!stockRow.show || !stockRow.ok) return;
    var r = Pd.stock(save, list[sel], stockRow.cls, G.data);
    if (r === Pd.OK) { stockRow.said = 'In it goes: ' + sp.name + ', size ' + stockRow.cls + '. Pond ' + save.pond.stock.length + ' / ' + Pd.capOf(G.data) + '.'; stockRow.idx++; G.core.save.autosave('stock'); }
    stockState();
  }

  // Phase 80: the reference's rarity, said as how often it comes to a hole.
  var ICE_SAYS = { common: 'Comes to a hole often enough.', rare: 'Comes to a hole now and then.', epic: 'Seldom comes to a hole. Worth the wait.' };

  function open() {
    lv = -1; lay(); reading = false; openT = G.ui.panel.now();
    buildLocs();
    var here = locs.indexOf(G.state.run.loc);
    locIdx = here >= 0 ? here : 0;
    focus = 2; top = 0; stockRow.idx = 0; stockRow.said = '';
    filter();
    stockState();
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
    if (lay()) select(sel);                                                        // Phase 90: re-wrapped for a new layout
    if (narrow && reading && (inp.pressed('back') || inp.pressed('left') || inp.pressed('right') || inp.pressed('up') || inp.pressed('down'))) { if (inp.pressed('back')) { reading = false; return true; } }
    if (narrow && reading && inp.pressed('action') && !stockRow.show) { reading = false; return true; }
    if (inp.pressed('journal') || inp.pressed('back')) { close(); return false; }
    if (inp.pressed('map')) { G.ui.menu.open('milestones', 'journal'); return true; } // Phase 94.1: M, the milestones page (back returns here)
    if (narrow && !reading && focus === 2 && inp.pressed('action') && list.length) { reading = true; return true; } // Phase 90: one panel: turn to the page
    var lr = M.axis('left', 'right'), ud = M.axis('up', 'down');
    if (focus < 2) {
      if (lr && focus === 0) { locIdx = (locIdx + lr + locs.length) % locs.length; sel = 0; top = 0; filter(); stockState(); }
      if (lr && focus === 1) { famIdx = (famIdx + lr + FAMILIES.length) % FAMILIES.length; sel = 0; top = 0; filter(); stockState(); }
      if (ud > 0) focus++;
      if (ud < 0 && focus > 0) focus--;
      return true;
    }
    if (ud < 0 && sel < COLS) { focus = 1; return true; }
    var next = sel + lr + ud * COLS;
    if ((lr || ud) && next >= 0 && next < list.length) { select(next); stockRow.idx = 0; stockRow.said = ''; stockState(); }
    if (inp.pressed('action')) stockOne();                                          // Phase 85: STOCK at the pond
    return true;
  }

  // ---- Drawing (Phase 54: the shared panel style) ------------------------------------------
  // Two panels (G.ui.panel) side by side over the world, nothing dimmed, as every menu since
  // Phase 46: the entry on the left (the fish's name on its tab, its family beside it, the
  // picture on a dark plate, where it lives, how many, the biggest, then the notes, still in
  // handwriting that degrades with unease), and on the right the JOURNAL with the count, the
  // two filters as key caps and the grid of species with its scrollbar. The open book of
  // Phase 17 is gone; its colours are mapped onto the panel's (INK below).
  var LP = [8, 8, 300, 344], RP = [316, 8, 316, 344], J_RECTS = [LP, RP], J_ONE = [RP];
  // Phase 70: the plate holds a portrait at its native size (the real fish are painted at most
  // 104×60, PLAN_SPECIES.md 3.5), never scaled: PORT_W × PORT_H, on a plate PLATE_H tall.
  var PLATE_H = 68, PORT_W = 104, PORT_H = 60;
  // The book's ink keys, read on night ink: the notes, the plain words, the description, the late blue pen.
  var INK = { ink: 'bone', wood: 'fog_mid', rust: 'dusk_high', night_blue: 'teal_lit' };

  // A rounded tile: the species' portrait (a silhouette until known), lit when selected.
  function drawCell(ctx, k, x, y) {
    var spIdx = list[k], sp = G.data.fish[spIdx], j = G.state.save.journal[sp.id], got = !!j && j.caught > 0;
    var on = focus === 2 && k === sel, ghost = !got && !!j && j.phantom;
    var rim = on ? 'signal_amber' : (got ? 'fog_mid' : 'fog_dark'), fill = on ? 'rust_dark' : 'night_deep';
    ctx.fillStyle = P[rim]; ctx.fillRect(x + 1, y, CW - 2, CH); ctx.fillRect(x, y + 1, CW, CH - 2);
    ctx.fillStyle = P[fill]; ctx.fillRect(x + 1, y + 1, CW - 2, CH - 2);
    var img = G.gfx.fishgen.portrait(spIdx, CW - 6, CH - 10, !(got || ghost));
    ctx.globalAlpha = ghost ? 0.35 : (got ? 1 : 0.5);
    ctx.drawImage(img, x + ((CW - img.width) >> 1), y + ((CH - img.height) >> 1));
    ctx.globalAlpha = 1;
    if (got && !j.read) { ctx.fillStyle = P.neon_red; ctx.fillRect(x + CW - 7, y + CH - 7, 4, 4); }
    if (j && j.lateNew) F.bold(ctx, '*', x + 3, y + 3, 'teal_lit'); // a page that gained a line
    if (got && j.sizes && j.sizes.length) {                                          // Phase 94.3: the highest size caught, as a medallion
      var hi = -1; for (var q = 0; q < j.sizes.length; q++) for (var c = 0; c < G.data.SIZE_CLASSES.length; c++) if (G.data.SIZE_CLASSES[c].id === j.sizes[q] && c > hi) hi = c;
      if (hi >= 0) G.ui.badge.medal(ctx, G.data.SIZE_CLASSES[hi].id, x + 2, y + CH - 17, 15, j.bestW >= G.sim.pond.trophyKg(sp));
    }
  }

  // A filter as a key cap with its arrows; the focused one is lit.
  function filterKey(ctx, s, x, y, on) {
    var U = G.ui.panel;
    return U.key(ctx, s, x, y, on);
  }

  function draw(ctx0) {
    var U = G.ui.panel, ctx = U.begin(ctx0), jt = jitter(), i, x, y, a = U.fadeIn(openT);
    if (lv !== U.ver()) { lay(); }
    ctx.globalAlpha = a;
    if (!narrow || reading) drawEntry(ctx, jt);
    if (!narrow || !reading) drawGrid(ctx, jt);
    ctx.globalAlpha = 1;
  }

  function drawEntry(ctx, jt) {
    var U = G.ui.panel, i, x, y;
    // The left panel: the entry.
    x = LP[0]; y = LP[1];
    U.frame(ctx, x, y, LP[2], LP[3], page.name || ' ', selIsNew ? 'NEW' : (page.family || ''), selIsNew ? 'neon_red' : 'fog_light');
    var lx = U.left(x), ty = U.top(y), iw = LP[2] - 2 * U.PAD;
    ctx.fillStyle = P.night_deep; ctx.fillRect(lx + 1, ty, iw - 2, PLATE_H); ctx.fillRect(lx, ty + 1, iw, PLATE_H - 2);
    ctx.fillStyle = P.fog_dark; ctx.fillRect(lx + 1, ty + PLATE_H - 1, iw - 2, 1);
    if (list.length) {
      var img = G.gfx.fishgen.portrait(list[sel], PORT_W, PORT_H, !(page.got || page.ghost));
      if (page.ghost) ctx.globalAlpha = 0.35; else if (!page.got) ctx.globalAlpha = 0.5;
      ctx.drawImage(img, lx + ((iw - img.width) >> 1), ty + ((PLATE_H - img.height) >> 1));
      ctx.globalAlpha = 1;
    }
    var ry = ty + PLATE_H + 6;
    if (page.where) {
      ctx.fillStyle = P.neon_red; ctx.fillRect(lx + 1, ry + 1, 5, 5); ctx.fillRect(lx + 2, ry + 6, 3, 1);
      ctx.fillStyle = P.night_ink; ctx.fillRect(lx + 3, ry + 3, 1, 1);
      F.drawText(ctx, page.where, lx + 10, ry, 'fog_light');
    }
    if (page.count) F.drawText(ctx, page.count, lx + 10, ry + U.ROW, 'bone');
    if (page.got) for (i = 0; i < page.parts.length; i++) G.ui.cabin.partIcon(ctx, page.parts[i], lx + iw - 9 - (page.parts.length - 1 - i) * 9, ry + U.ROW); // Phase 93.2: its best parts of the day
    if (page.best) {
      ctx.fillStyle = P.signal_amber; ctx.fillRect(lx + 1, ry + 2 * U.ROW + 3, 6, 2);
      F.drawText(ctx, 'Best ' + page.best, lx + 10, ry + 2 * U.ROW, 'signal_amber');
    }
    var ny = ry + 3 * U.ROW + 4;
    ctx.fillStyle = P.fog_dark; ctx.fillRect(lx, ny - 4, iw, 1);
    var nmax = stockRow.show ? NOTES_MAX - 3 : NOTES_MAX;                       // Phase 85: room for the STOCK row
    for (i = 0; i < notes.length && i < nmax; i++) F.drawText(ctx, notes[i].s, lx, ny + i * F.LINE_H, INK[notes[i].key] || notes[i].key, jt, sel * 31 + i);

    if (stockRow.show) {                                                           // Phase 85: the STOCK row at the pond
      var sy = y + LP[3] - U.PAD - U.KEY_H, kw = U.key(ctx, 'STOCK ' + (stockRow.cls || '-'), lx, sy, stockRow.ok);
      ctx.fillStyle = P.fog_dark; ctx.fillRect(lx, sy - 6, iw, 1);
      var tl = F.wrap(stockRow.text, iw - kw - 8);
      for (i = 0; i < tl.length && i < 2; i++) F.drawText(ctx, tl[i], lx + kw + 8, sy - 3 + i * (F.LINE_H), stockRow.ok ? 'teal_lit' : 'fog_light');
    }

    if (narrow) { var bh0 = y + LP[3] - U.PAD - U.KEY_H; if (!stockRow.show && !U.touch()) U.hint(ctx, 'ESC', 'back to the grid', lx, bh0); }
  }

  function drawGrid(ctx, jt) {
    var U = G.ui.panel, i, x, y;
    // The right panel: the count, the filters, the grid and its scrollbar.
    x = RP[0]; y = RP[1];
    U.frame(ctx, x, y, RP[2], RP[3], 'JOURNAL', title.shown, 'bone');
    var rx = U.left(x), fy = U.top(y);
    var w0 = filterKey(ctx, title.loc, rx, fy, focus === 0);
    filterKey(ctx, title.rar, rx + w0 + 6, fy, focus === 1);
    var end = Math.min(list.length, (top + ROWS) * COLS);
    for (i = top * COLS; i < end; i++) {
      var c = i - top * COLS;
      drawCell(ctx, i, GX + (c % COLS) * (CW + GAP), GY + Math.floor(c / COLS) * (CH + GAP));
    }
    var rows = Math.max(ROWS, Math.ceil(list.length / COLS)), trackH = ROWS * (CH + GAP) - GAP, thumb = Math.max(16, Math.round(trackH * ROWS / rows));
    var sx = GX + COLS * (CW + GAP) - GAP + 4;
    ctx.fillStyle = P.night_deep; ctx.fillRect(sx, GY, 3, trackH);
    ctx.fillStyle = P.fog_mid; ctx.fillRect(sx, GY + Math.round((trackH - thumb) * (rows > ROWS ? top / (rows - ROWS) : 0)), 3, thumb);
    if (heavyNote) F.drawText(ctx, HEAVY_NOTE, rx, GY + trackH + 6, 'dusk_high', Math.max(jt, 0.2), 47);
    var hx = rx, hy = y + RP[3] - U.PAD - U.KEY_H;
    hx += U.hint(ctx, 'W/S A/D', 'browse', hx, hy);
    if (narrow) hx += U.hint(ctx, 'SPACE', 'read', hx, hy);
    hx += U.hint(ctx, 'J', 'close', hx, hy);
    if (!U.touch() && !G.core.device.touch()) U.hint(ctx, 'M', 'milestones', hx, hy); // Phase 94.1 (on a phone: the pause list's row)
  }

  // Phase 59.2: a touch on the journal. A filter key turns it (as D does with it focused); a
  // tile reads its page; the scrollbar's upper or lower half pages the grid up or down; the J
  // hint closes. The entry panel and anywhere else, nothing.
  function tap(gx0, gy0) {
    var U = G.ui.panel, gx = U.ux(gx0), gy = U.uy(gy0);                            // Phase 90: UI px
    if (lay()) select(sel);
    if (narrow && reading) { if (stockRow.show) return 'action'; reading = false; return 'none'; } // one panel: a tap on the page turns back (or stocks)
    var rx = U.left(RP[0]), fy = U.top(RP[1]), w0 = U.keyW(title.loc), w1 = U.keyW(title.rar), i;
    if (gy >= fy - 2 && gy < fy + U.KEY_H + 2) {
      if (gx >= rx && gx < rx + w0) { focus = 0; return 'right'; }
      if (gx >= rx + w0 + 6 && gx < rx + w0 + 6 + w1) { focus = 1; return 'right'; }
    }
    var end = Math.min(list.length, (top + ROWS) * COLS);
    for (i = top * COLS; i < end; i++) {
      var c = i - top * COLS, x = GX + (c % COLS) * (CW + GAP), y = GY + Math.floor(c / COLS) * (CH + GAP);
      if (gx >= x && gx < x + CW && gy >= y && gy < y + CH) { focus = 2; if (i !== sel) { select(i); stockRow.idx = 0; stockRow.said = ''; stockState(); } else if (narrow) reading = true; return 'none'; }
    }
    var trackH = ROWS * (CH + GAP) - GAP, sx = GX + COLS * (CW + GAP) - GAP + 4;
    if (list.length && gx >= sx - 4 && gx < sx + 10 && gy >= GY && gy < GY + trackH) {
      focus = 2;
      select(gy < GY + trackH / 2 ? Math.max(0, sel - COLS * ROWS) : Math.min(list.length - 1, sel + COLS * ROWS));
      return 'none';
    }
    var hx = rx + U.hintW('W/S A/D', 'browse'), hy = RP[1] + RP[3] - U.PAD - U.KEY_H;
    if (gy >= hy - 2 && gy < hy + U.KEY_H + 2 && gx >= hx && gx < hx + U.hintW('J', 'close')) return 'back';
    return 'none';
  }

  // 8.4 #24: bakes the grid's pictures ahead of the journal's first opening, n a call (index.html
  // asks for one a frame from boot), so the opening is not one long frame: every species' tile,
  // as a silhouette and in colour. The entry's plate shows one picture and bakes it when shown.
  // True once all are baked.
  var warmK = 0;
  function warm(n) {
    var total = G.data.fish.length * 2;
    for (; n > 0 && warmK < total; n--, warmK++) G.gfx.fishgen.portrait(warmK >> 1, CW - 6, CH - 10, (warmK & 1) === 1);
    return warmK >= total;
  }

  // dbg: draws the current page into a fresh canvas and returns it (handwriting checks).
  function render() {
    var cv = G.gfx.bake.canvas(640, 360), ctx = cv.getContext('2d');
    draw(ctx);
    return cv;
  }

  return {
    native: true,
    open: open, update: update, draw: draw, render: render, tap: tap, warm: warm,
    rects: function () { lay(); return narrow ? J_ONE : J_RECTS; }, // 8.4 #38: what the ESC key keeps off
    jitter: jitter, HEAVY_NOTE: HEAVY_NOTE, close: close, // Phase 68: a comment had swallowed these since Phase 61
    lastLate: function () { return lastLate; },
    stock: function () { stockState(); return { show: stockRow.show, ok: stockRow.ok, cls: stockRow.cls, text: stockRow.text }; }, // Phase 85
    stockOne: stockOne,
    state: function () { return { narrow: narrow, reading: reading, cols: COLS, rows: ROWS, loc: locs[locIdx], family: FAMILIES[famIdx], list: list.slice(), sel: sel, focus: focus, heavyNote: heavyNote, count: title.count, entry: entry.map(function (e) { return e.s; }), best: page.best, bestAt: page.bestAt, parts: page.parts.slice() }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  return 'journal jitter ' + G.ui.journal.jitter().toFixed(2) + (G.ui.menu.current() === 'journal' ? '  ' + JSON.stringify(G.ui.journal.state().loc) : '');
});
