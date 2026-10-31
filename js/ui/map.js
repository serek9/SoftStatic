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
  var FX = 8, FY = 8, FW = 624, FH = 344;                               // the panel (Phase 54)
  var CX = 16, CY = 16 + 6, CW = 608, CH = 322, FADE = 0.35;           // the chart inside it

  // Where each stop sits on the chart (presentation only), in map order.
  var STOPS = [
    { id: 'fog', kind: 'loc', x: 168, y: 184, rx: 68, ry: 30, fill: 'fog_light' },
    { id: 'creek', kind: 'loc', x: 300, y: 100, rx: 60, ry: 14, fill: 'fog_light' },
    { id: 'pines', kind: 'loc', x: 432, y: 196, rx: 54, ry: 26, fill: 'fog_light' },
    { id: 'red', kind: 'loc', x: 544, y: 96, rx: 40, ry: 22, fill: 'dusk_rose' },
    { id: 'shop', kind: 'shop', x: 76, y: 244 },
    { id: 'cabin', kind: 'cabin', x: 240, y: 248 }
  ];

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
      for (y = 0; y < mh; y++) { A.box(ctx, 'fog_dark', mx - y, my - mh + y, y + 1, 1); A.box(ctx, 'night_blue', mx + 1, my - mh + y, y, 1); }
      A.box(ctx, 'fog_mid', mx - 2, my - mh + 2, 3, 2);
    }
    for (i = 0; i < 70; i++) {
      var tx = rng.int(20, CW - 20), ty = rng.int(64, CH - 30), near = false;
      for (var k = 0; k < STOPS.length; k++) { var st = STOPS[k]; if (st.kind === 'loc' && Math.abs(tx - st.x + CX) < st.rx + 10 && Math.abs(ty - st.y + CY) < st.ry + 12) near = true; }
      if (near) continue;
      for (y = 0; y < 7; y++) A.box(ctx, y % 3 === 2 ? 'pine_dark' : 'moss_dark', tx - (y >> 1), ty + y, (y >> 1) * 2 + 1, 1);
      A.px(ctx, 'wood_dark', tx, ty + 7);
    }
    // The route between the waters, dotted.
    for (i = 0; i < STOPS.length - 1; i++) {
      var a = STOPS[i], b = STOPS[i + 1];
      if (a.kind !== 'loc' && b.kind !== 'loc') continue;
      for (var u = 0; u <= 1; u += 0.006) {
        if ((u * 160 | 0) % 3) continue;
        A.box(ctx, 'fog_mid', Math.round(a.x - CX + (b.x - a.x) * u), Math.round(a.y - CY + (b.y - a.y) * u + Math.sin(u * 3.14) * 12), 2, 2);
      }
    }
    // Each water as a lake: a pale shore, a band of shallows, deeper water inside.
    for (i = 0; i < STOPS.length; i++) {
      var s = STOPS[i];
      if (s.kind !== 'loc') continue;
      var red = s.fill === 'dusk_rose', wob = [rng.range(0, 6.28), rng.range(0, 6.28)];
      for (y = -s.ry - 2; y <= s.ry + 2; y++) for (x = -s.rx - 3; x <= s.rx + 3; x++) {
        var ang = Math.atan2(y / s.ry, x / s.rx), r = 1 + 0.08 * Math.sin(ang * 3 + wob[0]) + 0.05 * Math.sin(ang * 5 + wob[1]);
        var e = Math.sqrt((x * x) / (s.rx * s.rx) + (y * y) / (s.ry * s.ry)) / r;
        if (e > 1.06) continue;
        var key = e > 1 ? 'fog_light' : (e > 0.82 ? (red ? 'blood' : 'water_hi') : (red ? 'crimson' : 'water_mid'));
        if (e <= 0.82 && e > 0.55 && (x + y * 3) % 23 === 0) key = red ? 'dusk_rose' : 'water_hi';
        A.px(ctx, key, s.x - CX + x, s.y - CY + y);
      }
    }
    // A compass rose in the corner.
    var cxr = CW - 50, cyr = CH - 64;
    for (i = -14; i <= 14; i++) { A.px(ctx, 'fog_mid', cxr + i, cyr); A.px(ctx, 'fog_mid', cxr, cyr + i); }
    for (i = 0; i < 6; i++) { A.box(ctx, 'signal_amber', cxr - (5 - i) / 2 | 0, cyr - 14 + i * 2, 6 - i, 2); }
    F.bold(ctx, 'N', cxr - 2, cyr - 26, 'fog_light');
    A.reset();
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
    if (s.kind === 'shop') { info.status = 'On the Fogbound shore. Coffee is on the house.'; info.hint = 'go in'; return; }
    if (s.kind === 'cabin') { info.status = 'Yours. ' + G.data.gear.cabin[save.cabinLevel].name + '.'; info.hint = 'go in'; return; }
    if (v === 'here') { info.status = 'You are here.'; return; }
    if (v === 'travel') { info.status = 'Open water.'; info.hint = 'travel'; return; }
    if (!stocked(s.id)) { info.status = 'The water is still settling. Nothing lives here yet.'; info.key = 'rust'; return; }
    var r = E.canUnlock(save, s.id, G.data);
    if (r === E.LOCKED) { info.status = (L.need && L.need.text) || 'It opens to someone who has fished while the owl calls.'; info.key = 'rust'; return; }
    info.status = 'Opens for ' + L.cost + 'c.';
    if (r === E.OK) info.hint = 'pay and travel'; else info.key = 'rust';
  }

  var names = [], nameW = [];
  function open() {
    if (!chart) chart = G.gfx.bake.cached('map:chart640night', function () { return G.gfx.bake.layer(CW, CH, paintChart); });
    for (var k = 0; k < STOPS.length; k++) { names[k] = stopName(STOPS[k]); nameW[k] = F.measureBold(names[k]); }
    sel = 0;
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === G.state.run.loc) sel = i;
    phase = 'map'; t = 0; dest = null;
    describe();
  }

  // The switch itself, at full black. Timed for the dbg check (one frame is ~16.7 ms).
  function arrive() {
    var t0 = performance.now();
    if (dest.kind === 'loc') {
      G.scene.sailing.load(dest.id);
      G.core.save.autosave('travel');
    } else G.core.state.change(dest.kind);
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
    var d = M.axis('up', 'down') + M.axis('left', 'right');
    if (d) { sel = (sel + d + STOPS.length) % STOPS.length; describe(); }
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
      var name = names[i], lx = s.x - (nameW[i] >> 1), ly = s.y + (s.ry || 8) + 6;
      if (on) { ctx.fillStyle = P.rust_dark; ctx.fillRect(lx - 4, ly - 2, nameW[i] + 8, 13); ctx.fillStyle = P.signal_amber; ctx.fillRect(lx - 4, ly - 2, 1, 13); }
      F.bold(ctx, name, lx, ly, on ? 'signal_amber' : (open ? 'bone' : 'fog_mid'));
      if (on) {
        ctx.fillStyle = P.signal_amber;
        ctx.fillRect(s.x - 10, s.y - 10, 6, 2); ctx.fillRect(s.x + 5, s.y - 10, 6, 2);
        ctx.fillRect(s.x - 10, s.y + 9, 6, 2); ctx.fillRect(s.x + 5, s.y + 9, 6, 2);
      }
    }
    var x = CARD[0], y = CARD[1];
    U.frame(ctx, x, y, CARD[2], CARD[3], info.name);
    for (i = 0; i < info.lines.length && i < 3; i++) F.drawText(ctx, info.lines[i], U.left(x), U.top(y) + i * U.ROW, info.key === 'rust' ? 'rust_hi' : 'fog_light');
    var hx = U.left(x), hy = y + CARD[3] - U.PAD - U.KEY_H;
    if (info.hint) hx += U.hint(ctx, 'SPACE', info.hint, hx, hy);
    U.hint(ctx, 'M', 'close', hx, hy);
    if (phase === 'out') M.dim(ctx, t / FADE);
  }

  return {
    native: true, CARD: CARD,
    open: open, update: update, draw: draw, STOPS: STOPS, verdict: verdict, stocked: stocked,
    // dbg: travel to a stop id through the same path as the menu (fade included).
    travel: function (id) {
      for (var i = 0; i < STOPS.length; i++) if (STOPS[i].id === id) { sel = i; describe(); return go(STOPS[i]); }
      return false;
    },
    info: function () { return info; },
    last: function () { return { dest: lastDest, ms: lastMs }; },
    busy: function () { return phase !== 'map'; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var l = G.ui.map.last();
  return 'map last travel ' + (l.dest || '-') + (l.dest ? ' ' + l.ms.toFixed(1) + ' ms' : '');
});
