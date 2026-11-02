var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The map (9.5): an overlay opened with M from the boat when no line is out. A baked paper
// chart with every water (open, for sale, or locked by a condition), the
// bait shop and the cabin. Choosing one fades to black, does the switch while the screen
// is dark (a location bakes all it draws in sailing.load, the first time only), then fades
// in. Opening a location spends its cost (economy.unlock) and autosaves (§0.12).
// Phase 18: drawn in the 640×360 view's pixels: a folded paper chart with the waters as
// painted lakes (shallows, a shore line), pines and peaks around them, a dotted route, a
// compass, the shop and the cabin as little houses and the boat where you are.
// Phase 54: in the shared panel style (G.ui.panel), as every menu: the chart is a panel titled
// THE WATERS over the world (nothing dimmed), drawn in the panel's night colours: a faint grid
// for the folds, the lakes in water keys inside a pale shore, the route and the compass in fog,
// the names in bone and the chosen one in amber on the list's bar.
G.ui = G.ui || {};
G.ui.map = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, E = G.sim.economy, F = S.fine, A = G.gfx.paint;
  var FX = 8, FY = 8, FW = 624, FH = 344;
  var MAP_RECTS = [[FX, FY, FW, FH]];                               // the panel (Phase 54)
  var CX = 16, CY = 16 + 6, CW = 608, CH = 322, FADE = 0.35;           // the chart inside it

  // Where each stop sits on the chart (presentation only), in map order. Phase 74: nine
  // waters: the inland lakes and rivers on the left, the coast and its two seas on the right
  // (sea: drawn as bays of the sea, deeper blue). Rivers are long and narrow (a small ry).
  var STOPS = [
    { id: 'fog', kind: 'loc', x: 168, y: 192, rx: 58, ry: 26 },
    { id: 'creek', kind: 'loc', x: 190, y: 92, rx: 52, ry: 12 },
    { id: 'copper', kind: 'loc', x: 330, y: 300, rx: 60, ry: 10 },
    { id: 'pines', kind: 'loc', x: 334, y: 214, rx: 44, ry: 22 },
    { id: 'harts', kind: 'loc', x: 338, y: 122, rx: 44, ry: 22 },
    { id: 'stone', kind: 'loc', x: 466, y: 84, rx: 44, ry: 10 },
    { id: 'russet', kind: 'loc', x: 468, y: 196, rx: 44, ry: 22 },
    { id: 'sound', kind: 'loc', x: 580, y: 110, rx: 30, ry: 26, sea: true },
    { id: 'wreck', kind: 'loc', x: 580, y: 252, rx: 30, ry: 26, sea: true },
    // Phase 66: the shop and the cabin stand on Fogbound's west shore by the pier (Phase 67).
    { id: 'shop', kind: 'shop', x: 70, y: 226 },
    { id: 'cabin', kind: 'cabin', x: 56, y: 150 }
  ];
  // Phase 74: the coast, in view px: x of the shoreline at view row y (the sea lies east of it).
  function coastX(y) { return 532 + Math.round(8 * Math.sin(y * 0.05) + 5 * Math.sin(y * 0.13 + 1)); }
  // Phase 74: the dotted routes between the waters (pairs of stop ids).
  var ROUTE = [['fog', 'creek'], ['fog', 'copper'], ['fog', 'pines'], ['creek', 'harts'], ['harts', 'pines'], ['harts', 'stone'], ['pines', 'russet'], ['stone', 'sound'], ['russet', 'wreck'], ['sound', 'wreck']];
  var PIER = [98, 190];                                             // where the pier runs out into Fogbound
  var KM = 0.022;                                                    // km a chart pixel
  // Phase 66: more on the chart: rivers between the waters, the shore road and its bridge,
  // soundings in each lake (its deepest, in metres) and the names of things.
  // Phase 74: rivers join the waters, the coast's two run out to the sea; the road runs along
  // the south with its bridge over the river down to Copperbend.
  var RIVERS = [[[146, 102], [138, 130], [150, 156], [160, 166]], [[242, 94], [270, 102], [296, 116]], [[422, 86], [396, 98], [380, 108]],
    [[510, 84], [530, 92], [548, 100]], [[338, 144], [344, 170], [336, 192]], [[378, 212], [400, 206], [424, 200]], [[506, 206], [528, 226], [550, 246]],
    [[198, 214], [230, 250], [272, 294]], [[390, 298], [430, 270], [456, 216]]];
  var ROAD = [[60, 250], [140, 262], [240, 262], [330, 252], [420, 262], [508, 250]];
  var BRIDGE = [224, 256];

  function stopById(id) { for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === id) return STOPS[i]; return null; }

  // The chart, baked once: paper with fold creases, the route, the lakes, trees and peaks,
  // the compass and the title.
  function paintChart(ctx) {
    var rng = new G.core.rng.Rng(7717), i, x, y;
    A.reset();
    A.area(ctx, 0, 0, CW, CH, function (xx, yy) {
      var fx = xx % (CW / 4), fy = yy % (CH / 2);
      if ((fx === 0 || fy === 0) && (xx + yy) % 3 === 0) return 'fog_dark';             // the folds, a faint grid
      return 'night_ink';
    });
    // Peaks along the top and pines scattered over the land.
    for (i = 0; i < 9; i++) {
      var mx = 30 + i * 66 + rng.int(-10, 10), my = 46 + rng.int(-6, 8), mh = rng.int(14, 22);
      if (mx + CX > coastX(my + CY) - 30 || mx < 130) continue;              // Phase 74: no peaks at sea or over the legend
      for (y = 0; y < mh; y++) { A.box(ctx, 'fog_dark', mx - y, my - mh + y, y + 1, 1); A.box(ctx, 'night_blue', mx + 1, my - mh + y, y, 1); }
      A.box(ctx, 'fog_mid', mx - 2, my - mh + 2, 3, 2);
    }
    for (i = 0; i < 70; i++) {
      var tx = rng.int(20, CW - 20), ty = rng.int(64, CH - 30), near = false;
      for (var k = 0; k < STOPS.length; k++) { var st = STOPS[k]; if (st.kind === 'loc' && Math.abs(tx - st.x + CX) < st.rx + 10 && Math.abs(ty - st.y + CY) < st.ry + 12) near = true; }
      if (tx < 126 && ty < 84) near = true;                               // Phase 66: the legend (Phase 74: top left; the place card has the bottom left)
      if (tx + CX > coastX(ty + CY) - 8) near = true;                     // Phase 74: the sea
      if (Math.abs(tx - 60) < 30 && ty > 120 && ty < 230) near = true;   // the shop, the cabin and their paths
      if (near) continue;
      for (y = 0; y < 7; y++) A.box(ctx, y % 3 === 2 ? 'pine_dark' : 'moss_dark', tx - (y >> 1), ty + y, (y >> 1) * 2 + 1, 1);
      A.px(ctx, 'wood_dark', tx, ty + 7);
    }
    // Phase 74: the sea east of the coast: a pale shore line, shallows, then deep water.
    for (y = 0; y < CH; y++) {
      var c0 = coastX(y + CY) - CX;
      A.px(ctx, 'fog_light', c0, y);
      for (x = c0 + 1; x < CW; x++) A.px(ctx, x - c0 < 5 ? 'water_hi' : ((x * 7 + y * 13) % 41 === 0 ? 'water_mid' : 'water_dark'), x, y);
    }
    // The routes between the waters, dotted.
    for (i = 0; i < ROUTE.length; i++) {
      var a = stopById(ROUTE[i][0]), b = stopById(ROUTE[i][1]);
      for (var u = 0; u <= 1; u += 0.006) {
        if ((u * 160 | 0) % 3) continue;
        A.box(ctx, 'fog_mid', Math.round(a.x - CX + (b.x - a.x) * u), Math.round(a.y - CY + (b.y - a.y) * u + Math.sin(u * 3.14) * 12), 2, 2);
      }
    }
    // Each water as a lake: a pale shore, a band of shallows, deeper water inside.
    for (i = 0; i < STOPS.length; i++) {
      var s = STOPS[i];
      if (s.kind !== 'loc') continue;
      var sea = !!s.sea, wob = [rng.range(0, 6.28), rng.range(0, 6.28)];
      for (y = -s.ry - 2; y <= s.ry + 2; y++) for (x = -s.rx - 3; x <= s.rx + 3; x++) {
        var ang = Math.atan2(y / s.ry, x / s.rx), r = 1 + 0.08 * Math.sin(ang * 3 + wob[0]) + 0.05 * Math.sin(ang * 5 + wob[1]);
        var e = Math.sqrt((x * x) / (s.rx * s.rx) + (y * y) / (s.ry * s.ry)) / r;
        if (e > 1.06) continue;
        if (sea && e > 1) continue;                                       // a bay of the sea has no shore of its own
        var key = e > 1 ? 'fog_light' : (e > 0.82 ? 'water_mid' : (sea ? 'water_deep' : 'water_mid'));
        if (e <= 0.82 && e > 0.55 && (x + y * 3) % 23 === 0) key = 'water_hi';
        A.px(ctx, key, s.x - CX + x, s.y - CY + y);
      }
    }
    // Phase 66: relief: hachures down the peaks' flanks and a contour ring round every lake.
    var rr = new G.core.rng.Rng(7718);
    for (i = 0; i < 9; i++) {
      var hx0 = 30 + i * 66 + rr.int(-10, 10);
      if (hx0 + CX > coastX(70) - 30 || hx0 < 130) continue;                 // Phase 74: none at sea or over the legend
      for (var hk = 0; hk < 6; hk++) A.line(ctx, 'fog_dark', hx0 - 4 - hk * 3, 48 + hk, hx0 - 6 - hk * 3, 52 + hk);
    }
    for (i = 0; i < STOPS.length; i++) {
      var sl = STOPS[i];
      if (sl.kind !== 'loc') continue;
      for (var ang2 = 0; ang2 < 6.283; ang2 += 0.05) {
        if (((ang2 * 20) | 0) % 3 === 0) continue;
        A.px(ctx, 'fog_dark', Math.round(sl.x - CX + Math.cos(ang2) * (sl.rx + 9)), Math.round(sl.y - CY + Math.sin(ang2) * (sl.ry + 7)));
        A.px(ctx, sl.sea ? 'water_mid' : 'water_mid', Math.round(sl.x - CX + Math.cos(ang2) * sl.rx * 0.42), Math.round(sl.y - CY + Math.sin(ang2) * sl.ry * 0.42)); // a depth contour
      }
      var L = G.data.locations[sl.id];
      if (L) F.drawText(ctx, '' + Math.round(L.maxDepth * 0.25), sl.x - CX + 10, sl.y - CY + (sl.ry < 14 ? -3 : 2), 'water_hi'); // the sounding
    }
    // Rivers: a winding line two pixels wide, lighter on its upper bank.
    for (i = 0; i < RIVERS.length; i++) poly(ctx, RIVERS[i], function (x, y, k) { A.box(ctx, 'water_mid', x, y, 2, 2); A.px(ctx, 'water_hi', x, y); }, 0.5);
    // The shore road, dashed, and its bridge over the creek's outflow.
    poly(ctx, ROAD, function (x, y, k) { if ((k >> 2) % 2 === 0) A.box(ctx, 'wood_mid', x, y, 2, 1); }, 1);
    A.slab(ctx, BRIDGE[0] - CX, BRIDGE[1] - CY, 13, 6, ['wood_dark', 'wood', 'wood_mid']); A.box(ctx, 'wood_hi', BRIDGE[0] - CX, BRIDGE[1] - CY, 13, 1);
    // The pier into Fogbound's west shore, and the path up to the shop and the cabin.
    A.slab(ctx, PIER[0] - CX, PIER[1] - CY - 1, 16, 3, ['wood_dark', 'wood', 'wood_hi']);
    for (i = 0; i < 4; i++) A.px(ctx, 'wood_dark', PIER[0] - CX + 2 + i * 4, PIER[1] - CY + 2);
    poly(ctx, [[PIER[0], PIER[1]], [80, 200], [70, 220]], function (x, y, k) { if (k % 3 === 0) A.px(ctx, 'paper_dark', x, y); }, 1);
    poly(ctx, [[PIER[0], PIER[1]], [74, 172], [56, 154]], function (x, y, k) { if (k % 3 === 0) A.px(ctx, 'paper_dark', x, y); }, 1);
    F.drawText(ctx, 'PIER', PIER[0] - CX + 2, PIER[1] - CY - 12, 'wood_hi');
    // A legend at the top right and a scale bar.
    var lgx = 12, lgy = 12;                                             // Phase 74: top left (the coast took the right, the place card the bottom left)
    A.box(ctx, 'night_deep', lgx - 6, lgy - 6, 112, 70); A.box(ctx, 'fog_dark', lgx - 6, lgy - 6, 112, 1); A.box(ctx, 'fog_dark', lgx - 6, lgy + 63, 112, 1);
    A.box(ctx, 'fog_dark', lgx - 6, lgy - 6, 1, 70); A.box(ctx, 'fog_dark', lgx + 105, lgy - 6, 1, 70);
    for (i = 0; i < 4; i++) A.box(ctx, 'fog_mid', lgx + i * 4, lgy + 4, 2, 2);
    F.drawText(ctx, 'by water', lgx + 22, lgy, 'fog_light');
    for (i = 0; i < 8; i++) A.box(ctx, i % 2 ? 'water_hi' : 'water_mid', lgx + i * 2, lgy + 16 + ((i >> 1) % 2), 2, 2);
    F.drawText(ctx, 'river', lgx + 22, lgy + 14, 'fog_light');
    for (i = 0; i < 3; i++) A.box(ctx, 'wood_mid', lgx + i * 6, lgy + 31, 4, 1);
    F.drawText(ctx, 'road', lgx + 22, lgy + 28, 'fog_light');
    A.box(ctx, 'water_hi', lgx + 2, lgy + 44, 10, 1); F.drawText(ctx, '24', lgx, lgy + 38, 'water_hi');
    F.drawText(ctx, 'deepest, m', lgx + 22, lgy + 42, 'fog_light');
    var sbx = 400, sby = CH - 10;
    for (i = 0; i < 4; i++) A.box(ctx, i % 2 ? 'fog_dark' : 'fog_mid', sbx + i * 23, sby, 23, 3);
    F.drawText(ctx, '0', sbx - 2, sby - 12, 'fog_mid'); F.drawText(ctx, Math.round(92 * KM) + ' km', sbx + 80, sby - 12, 'fog_mid');
    // The paper's border with tick marks.
    for (x = 0; x < CW; x++) { A.px(ctx, 'fog_dark', x, 0); A.px(ctx, 'fog_dark', x, CH - 1); if (x % 16 === 0) { A.box(ctx, 'fog_mid', x, 1, 1, 3); A.box(ctx, 'fog_mid', x, CH - 4, 1, 3); } }
    for (y = 0; y < CH; y++) { A.px(ctx, 'fog_dark', 0, y); A.px(ctx, 'fog_dark', CW - 1, y); if (y % 16 === 0) { A.box(ctx, 'fog_mid', 1, y, 3, 1); A.box(ctx, 'fog_mid', CW - 4, y, 3, 1); } }
    // A compass rose in the corner.
    var cxr = 470, cyr = 128;                                           // Phase 74: on land, west of the coast
    for (i = -14; i <= 14; i++) { A.px(ctx, 'fog_mid', cxr + i, cyr); A.px(ctx, 'fog_mid', cxr, cyr + i); }
    for (i = 0; i < 6; i++) { A.box(ctx, 'signal_amber', cxr - (5 - i) / 2 | 0, cyr - 14 + i * 2, 6 - i, 2); }
    F.bold(ctx, 'N', cxr - 2, cyr - 26, 'fog_light');
    A.reset();
  }

  // Walks a polyline in chart coordinates (view px), calling fn(x, y, k) on its pixels (k counts
  // them, for dashes); wob bends each leg a little so a river winds.
  function poly(ctx, pts, fn, wob) {
    var k = 0;
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (var j = 0; j < n; j++) { var u = j / n, w = Math.sin(u * Math.PI * 2 + i) * 3 * wob; fn(Math.round(a[0] - CX + (b[0] - a[0]) * u - (b[1] - a[1]) / n * w), Math.round(a[1] - CY + (b[1] - a[1]) * u + (b[0] - a[0]) / n * w), k++); }
    }
  }

  // Little painted marks for the chart: a house (shop, cabin) and the boat.
  var marks = {};
  function mark(kind) {
    if (marks[kind]) return marks[kind];
    return (marks[kind] = G.gfx.bake.layer(14, 14, function (c) {
      A.reset();
      if (kind === 'house') {
        for (var y = 0; y < 6; y++) A.box(c, y < 2 ? 'rust_hi' : 'rust', 6 - y, y, y * 2 + 2, 1);
        A.slab(c, 2, 6, 10, 7, ['wood_dark', 'wood', 'wood_mid']); A.box(c, 'ink', 6, 9, 2, 4); A.box(c, 'lamp_glow', 3, 8, 2, 2);
      } else {
        A.box(c, 'ink', 6, 1, 1, 7); A.box(c, 'cream', 7, 2, 4, 4);
        for (var x = 0; x < 12; x++) A.box(c, x === 0 || x === 11 ? 'wood_dark' : 'wood', 1 + x, 9, 1, x > 1 && x < 10 ? 3 : 2);
      }
      A.reset();
    }));
  }

  var chart = null, sel = 0, phase = 'map', t = 0, dest = null, lastMs = 0, lastDest = '';
  var cur = { x: 0, y: 0 };                                          // Phase 66: the selection's brackets, sliding to the chosen stop
  var info = { name: '', status: '', key: 'wood', hint: '', lines: [] }; // hint: what Space does here
  // Phase 46: the place card, a small panel (G.ui.panel) at the bottom left, over the chart.
  var CARD = G.ui.panel.place(240, 74, 'bl', [0, 0, 240, 74]);
  CARD[0] += 10; CARD[1] -= 10; // Phase 54: inside the chart's panel

  function stopName(s) {
    if (s.kind === 'shop') return 'Bait Shop';
    if (s.kind === 'cabin') return 'The Cabin';
    return G.data.locations[s.id].name;
  }

  // True when some species lives in water id. A water without fish is not sold yet, so nobody
  // pays for an empty lake (audit P0-2); one already bought stays open.
  function stocked(id) {
    var fish = G.data.fish;
    for (var i = 0; i < fish.length; i++) if (fish[i].locations.indexOf(id) >= 0) return true;
    return false;
  }

  // What choosing stop s does now: 'here', 'travel', 'buy', or '' (nothing yet).
  function verdict(s) {
    if (s.kind !== 'loc') return 'travel';
    if (s.id === G.state.run.loc) return 'here';
    if (G.state.save.unlocks[s.id]) return 'travel';
    if (!stocked(s.id)) return '';
    return E.canUnlock(G.state.save, s.id, G.data) === E.OK ? 'buy' : '';
  }

  function describe() {
    describeStop();
    info.lines = F.wrap(info.status, CARD[2] - 2 * G.ui.panel.PAD);
  }
  function describeStop() {
    var s = STOPS[sel], save = G.state.save, v = verdict(s), L = G.data.locations[s.id];
    info.name = stopName(s); info.key = 'wood'; info.hint = '';
    var far = away(s);
    if (s.kind === 'shop') { info.status = 'Up the path from the Fogbound pier. Coffee is on the house.' + far; info.hint = 'go in'; return; }
    if (s.kind === 'cabin') { info.status = 'Yours, up the path from the pier. ' + G.data.gear.cabin[save.cabinLevel].name + '.' + far; info.hint = 'go in'; return; }
    if (v === 'here') { info.status = 'You are here. ' + Math.round(L.maxDepth * 0.25) + ' m at its deepest.'; return; }
    if (v === 'travel') { info.status = 'Open water, ' + Math.round(L.maxDepth * 0.25) + ' m at its deepest.' + far; info.hint = 'travel'; return; }
    if (!stocked(s.id)) { info.status = 'The water is still settling. Nothing lives here yet.'; info.key = 'rust'; return; }
    var r = E.canUnlock(save, s.id, G.data);
    if (r === E.LOCKED) { info.status = (L.need && L.need.text) || 'It opens to someone who has fished while the owl calls.'; info.key = 'rust'; return; }
    info.status = 'Opens for ' + L.cost + 'c.';
    if (r === E.OK) info.hint = 'pay and travel'; else info.key = 'rust';
  }

  // Phase 66: how far a stop is from the water you are on, along the chart.
  function away(s) {
    var h = null;
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === G.state.run.loc) h = STOPS[i];
    if (!h || h === s) return '';
    var d = Math.hypot(s.x - h.x, s.y - h.y) * KM;
    return ' ' + (d < 1 ? Math.round(d * 10) * 100 + ' m' : d.toFixed(1) + ' km') + ' from here.';
  }
  // Phase 66: the arrows go to the nearest stop that way: ahead of the chosen one along the
  // arrow (within about 60 degrees of it), the nearest by distance along it plus twice the
  // distance across. -1 if there is none that way.
  function toward(from, ax, ay) {
    var a = STOPS[from], best = -1, bs = 1e9;
    for (var j = 0; j < STOPS.length; j++) {
      if (j === from) continue;
      var dx = STOPS[j].x - a.x, dy = STOPS[j].y - a.y, p = dx * ax + dy * ay, q = Math.abs(dx * ay - dy * ax);
      if (p <= 0 || q > p * 1.75) continue;
      if (p + 2 * q < bs) { bs = p + 2 * q; best = j; }
    }
    return best;
  }

  var names = [], nameW = [];
  // Phase 74: where stop i's name sits (view px), kept inside the chart (Coldharbor Sound's
  // and Wreckhollow Bay's names are wider than the sea east of them).
  function labelX(i) { var s = STOPS[i]; return Math.max(CX + 4, Math.min(CX + CW - 4 - nameW[i], s.x - (nameW[i] >> 1))); }
  function open() {
    if (!chart) chart = G.gfx.bake.cached('map:chart640night', function () { return G.gfx.bake.layer(CW, CH, paintChart); });
    for (var k = 0; k < STOPS.length; k++) { names[k] = stopName(STOPS[k]); nameW[k] = F.measureBold(names[k]); }
    sel = 0;
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === G.state.run.loc) sel = i;
    phase = 'map'; t = 0; dest = null;
    cur.x = STOPS[sel].x; cur.y = STOPS[sel].y;
    describe();
  }

  // The switch itself, at full black. Timed for the dbg check (one frame is ~16.7 ms).
  function arrive() {
    var t0 = performance.now();
    if (dest.kind === 'loc') {
      G.scene.sailing.load(dest.id);
      G.core.save.autosave('travel');
    } else {
      // Phase 67: the shop and the cabin are up the path from Fogbound's pier, so the trip
      // ends with the boat tied up there, and that is where he comes back to.
      if (G.state.run.loc !== 'fog') G.scene.sailing.load('fog');
      G.scene.sailing.tp(G.data.locations.fog.dock.x + 30);
      G.ui.dock.disarm();
      G.core.save.autosave('travel');
      G.core.state.change(dest.kind);
    }
    lastMs = performance.now() - t0;
    lastDest = dest.id;
  }

  function go(s) {
    var v = verdict(s);
    if (v === 'buy') {
      if (E.unlock(G.state.save, s.id, G.data) !== E.OK) return false;
      G.core.save.autosave('purchase');
      v = 'travel';
    }
    if (v !== 'travel') return false;
    dest = s; phase = 'out'; t = 0;
    return true;
  }

  function update(dt) {
    var inp = G.core.input;
    if (phase === 'out') {
      t += dt;
      if (t >= FADE) { arrive(); phase = 'in'; t = 0; }
      return true;
    }
    if (phase === 'in') { t += dt; return t < FADE; }
    if (inp.pressed('map') || inp.pressed('back')) return false;
    var ax = M.axis('left', 'right'), ay = M.axis('up', 'down');
    if (ax || ay) { var n = toward(sel, ax, ay); if (n >= 0) { sel = n; describe(); } }
    var k = Math.min(1, 14 * dt);
    cur.x += (STOPS[sel].x - cur.x) * k; cur.y += (STOPS[sel].y - cur.y) * k;
    if (inp.pressed('action')) go(STOPS[sel]);
    return true;
  }

  function draw(ctx) {
    if (phase === 'in') { M.dim(ctx, 1 - t / FADE); return; }
    var U = G.ui.panel;
    U.frame(ctx, FX, FY, FW, FH, 'THE WATERS', G.state.save.coins + 'c', 'signal_amber');
    ctx.drawImage(chart, CX, CY);
    for (var i = 0; i < STOPS.length; i++) {
      var s = STOPS[i], on = i === sel;
      var open = s.kind !== 'loc' || !!G.state.save.unlocks[s.id];
      if (s.kind === 'loc') {
        ctx.fillStyle = P[open ? 'bone' : 'fog_mid']; ctx.fillRect(s.x - 2, s.y - 2, 5, 5);
        if (open) { ctx.fillStyle = P.night_ink; ctx.fillRect(s.x - 1, s.y - 1, 3, 3); }
      } else ctx.drawImage(mark('house'), s.x - 7, s.y - 10);
      if (s.id === G.state.run.loc) ctx.drawImage(mark('boat'), s.x - 6, s.y - 18);
      var name = names[i], lx = labelX(i), ly = s.y + (s.ry || 8) + 6;
      if (on) { ctx.fillStyle = P.rust_dark; ctx.fillRect(lx - 4, ly - 2, nameW[i] + 8, 13); ctx.fillStyle = P.signal_amber; ctx.fillRect(lx - 4, ly - 2, 1, 13); }
      F.bold(ctx, name, lx, ly, on ? 'signal_amber' : (open ? 'bone' : 'fog_mid'));
    }
    // Phase 66: the brackets slide to the chosen stop.
    var bx = Math.round(cur.x), by = Math.round(cur.y);
    ctx.fillStyle = P.signal_amber;
    ctx.fillRect(bx - 10, by - 10, 6, 2); ctx.fillRect(bx + 5, by - 10, 6, 2); ctx.fillRect(bx - 10, by - 10, 2, 5); ctx.fillRect(bx + 9, by - 10, 2, 5);
    ctx.fillRect(bx - 10, by + 9, 6, 2); ctx.fillRect(bx + 5, by + 9, 6, 2); ctx.fillRect(bx - 10, by + 6, 2, 5); ctx.fillRect(bx + 9, by + 6, 2, 5);
    var x = CARD[0], y = CARD[1];
    U.frame(ctx, x, y, CARD[2], CARD[3], info.name);
    for (i = 0; i < info.lines.length && i < 3; i++) F.drawText(ctx, info.lines[i], U.left(x), U.top(y) + i * U.ROW, info.key === 'rust' ? 'rust_hi' : 'fog_light');
    var hx = U.left(x), hy = y + CARD[3] - U.PAD - U.KEY_H;
    if (info.hint) hx += U.hint(ctx, 'SPACE', info.hint, hx, hy);
    U.hint(ctx, 'M', 'close', hx, hy);
    if (phase === 'out') M.dim(ctx, t / FADE);
  }

  // Phase 59.2: a touch on the map. A stop (its mark or its name) by the row rule: the first
  // tap selects it, a tap on the selected stop goes; the card's SPACE hint goes too, its M
  // hint closes. Anywhere else (and while travelling), nothing.
  function tap(gx, gy) {
    if (phase !== 'map') return 'none';
    var U = G.ui.panel, i;
    for (i = 0; i < STOPS.length; i++) {
      var s = STOPS[i], lx = labelX(i), ly = s.y + (s.ry || 8) + 6;
      var onMark = Math.abs(gx - s.x) <= 10 && Math.abs(gy - s.y) <= 11;
      var onName = gx >= lx - 4 && gx < lx + nameW[i] + 4 && gy >= ly - 2 && gy < ly + 11;
      if (onMark || onName) {
        if (i !== sel) { sel = i; describe(); return 'none'; }
        return 'action';
      }
    }
    var hx = U.left(CARD[0]), hy = CARD[1] + CARD[3] - U.PAD - U.KEY_H;
    if (gy >= hy - 2 && gy < hy + U.KEY_H + 2) {
      if (info.hint) { var w = U.hintW('SPACE', info.hint); if (gx >= hx && gx < hx + w) return 'action'; hx += w; }
      if (gx >= hx && gx < hx + U.hintW('M', 'close')) return 'back';
    }
    return 'none';
  }

  return {
    native: true, CARD: CARD, tap: tap,
    // The on-screen ESC key keeps off what is open (8.4 #38): the chart's panel.
    rects: function () { return MAP_RECTS; },
    open: open, update: update, draw: draw, STOPS: STOPS, verdict: verdict, stocked: stocked,
    // dbg: travel to a stop id through the same path as the menu (fade included).
    travel: function (id) {
      for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === id) { sel = i; describe(); return go(STOPS[i]); }
      return false;
    },
    info: function () { return info; },
    // Phase 66 (dbg.mapNav): every stop reached from every other by the arrows, and every
    // arrow press landing on a stop that lies that way.
    nav: function () {
      var D = [[1, 0], [-1, 0], [0, 1], [0, -1]], bad = [], reach = 0, i, j;
      for (i = 0; i < STOPS.length; i++) {
        var seen = {}, q = [i]; seen[i] = 1;
        while (q.length) { var a = q.shift(); for (j = 0; j < 4; j++) { var n = toward(a, D[j][0], D[j][1]); if (n >= 0) { if ((STOPS[n].x - STOPS[a].x) * D[j][0] + (STOPS[n].y - STOPS[a].y) * D[j][1] <= 0) bad.push(STOPS[a].id + '>' + STOPS[n].id); if (!seen[n]) { seen[n] = 1; q.push(n); } } } }
        if (Object.keys(seen).length === STOPS.length) reach++;
      }
      return { stops: STOPS.length, reachAll: reach === STOPS.length, wrongWay: bad, ok: reach === STOPS.length && !bad.length };
    },
    last: function () { return { dest: lastDest, ms: lastMs }; },
    busy: function () { return phase !== 'map'; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var l = G.ui.map.last();
  return 'map last travel ' + (l.dest || '-') + (l.dest ? ' ' + l.ms.toFixed(1) + ' ms' : '');
});
