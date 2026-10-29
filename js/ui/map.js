var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The map (9.5): an overlay opened with M from the boat when no line is out. A baked paper
// chart with every water (open, for sale, or locked by a condition), the
// bait shop and the cabin. Choosing one fades to black, does the switch while the screen
// is dark (a location bakes all it draws in sailing.load, the first time only), then fades
// in. Opening a location spends its cost (economy.unlock) and autosaves (§0.12).
G.ui = G.ui || {};
G.ui.map = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, E = G.sim.economy;
  var CX = 8, CY = 8, CW = 304, CH = 164, FADE = 0.35;

  // Where each stop sits on the chart (presentation only), in map order.
  var STOPS = [
    { id: 'fog', kind: 'loc', x: 84, y: 92, rx: 34, ry: 15, fill: 'fog_light' },
    { id: 'creek', kind: 'loc', x: 150, y: 50, rx: 30, ry: 7, fill: 'fog_light' },
    { id: 'pines', kind: 'loc', x: 216, y: 98, rx: 27, ry: 13, fill: 'fog_light' },
    { id: 'red', kind: 'loc', x: 272, y: 48, rx: 20, ry: 11, fill: 'dusk_rose' },
    { id: 'shop', kind: 'shop', x: 38, y: 122 },
    { id: 'cabin', kind: 'cabin', x: 120, y: 124 }
  ];

  S.def('map_boat', { w: 'wood', d: 'ink' }, ['..d..', '.dd..', 'wwwww', '.www.']);
  S.def('map_house', { r: 'rust', w: 'wood', k: 'ink' }, ['..r..', '.rrr.', 'rrrrr', '.wkw.', '.wkw.']);

  function paintChart(ctx) {
    var rng = new G.core.rng.Rng(7717), i, y;
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = P.bone;
    for (i = 0; i < 120; i++) ctx.fillRect(rng.int(0, CW - 1), rng.int(0, CH - 1), rng.int(1, 3), 1); // grain
    // Route between the waters, dotted.
    ctx.fillStyle = P.wood_hi;
    for (i = 0; i < STOPS.length - 1; i++) {
      var a = STOPS[i], b = STOPS[i + 1];
      if (a.kind !== 'loc' && b.kind !== 'loc') continue;
      for (var u = 0; u <= 1; u += 0.02) {
        if ((u * 50 | 0) % 2) continue;
        ctx.fillRect(Math.round(a.x - CX + (b.x - a.x) * u), Math.round(a.y - CY + (b.y - a.y) * u + Math.sin(u * 3.14) * 6), 1, 1);
      }
    }
    // Each water as a rough blob with an ink shore.
    for (i = 0; i < STOPS.length; i++) {
      var s = STOPS[i];
      if (s.kind !== 'loc') continue;
      for (y = -s.ry; y <= s.ry; y++) {
        var hw = Math.round(s.rx * Math.sqrt(1 - (y * y) / (s.ry * s.ry)) + rng.range(-1.5, 1.5));
        if (hw <= 0) continue;
        ctx.fillStyle = P.wood; ctx.fillRect(s.x - CX - hw - 1, s.y - CY + y, hw * 2 + 3, 1);
        ctx.fillStyle = P[s.fill]; ctx.fillRect(s.x - CX - hw, s.y - CY + y, hw * 2 + 1, 1);
      }
    }
    // Fog banks drifting across the paper.
    ctx.fillStyle = P.stone_hi; ctx.globalAlpha = 0.25;
    for (i = 0; i < 14; i++) ctx.fillRect(rng.int(0, CW - 40), rng.int(10, CH - 30), rng.int(20, 60), 1);
    ctx.globalAlpha = 1;
    S.drawText(ctx, 'THE WATERS', 8, 6, 'ink');
  }

  var chart = null, sel = 0, phase = 'map', t = 0, dest = null, lastMs = 0, lastDest = '';
  var info = { name: '', status: '', key: 'wood', hint: '' };

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
    var s = STOPS[sel], save = G.state.save, v = verdict(s), L = G.data.locations[s.id];
    info.name = stopName(s); info.key = 'wood'; info.hint = '';
    if (s.kind === 'shop') { info.status = 'On the Fogbound shore. Coffee is on the house.'; info.hint = 'SPACE go in'; return; }
    if (s.kind === 'cabin') { info.status = 'Yours. ' + G.data.gear.cabin[save.cabinLevel].name + '.'; info.hint = 'SPACE go in'; return; }
    if (v === 'here') { info.status = 'You are here.'; return; }
    if (v === 'travel') { info.status = 'Open water.'; info.hint = 'SPACE travel'; return; }
    if (!stocked(s.id)) { info.status = 'The water is still settling. Nothing lives here yet.'; info.key = 'rust'; return; }
    var r = E.canUnlock(save, s.id, G.data);
    if (r === E.LOCKED) { info.status = 'It opens to someone who has fished while the owl calls.'; info.key = 'rust'; return; }
    info.status = 'Opens for ' + L.cost + 'c.';
    if (r === E.OK) info.hint = 'SPACE pay and travel'; else info.key = 'rust';
  }

  function open() {
    if (!chart) chart = G.gfx.bake.cached('map:chart', function () { return G.gfx.bake.layer(CW, CH, paintChart); });
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
    M.dim(ctx, 0.6);
    M.panel(ctx, CX, CY, CW, CH, 'wood_dark', 'paper');
    ctx.drawImage(chart, CX, CY);
    for (var i = 0; i < STOPS.length; i++) {
      var s = STOPS[i], on = i === sel;
      var open = s.kind !== 'loc' || !!G.state.save.unlocks[s.id];
      if (s.kind === 'loc') {
        ctx.fillStyle = P[open ? 'ink' : 'wood_hi']; ctx.fillRect(s.x - 1, s.y - 1, 3, 3);
      } else S.draw(ctx, 'map_house', s.x - 2, s.y - 4, 0, false);
      if (s.id === G.state.run.loc) S.draw(ctx, 'map_boat', s.x - 2, s.y - 6, 0, false);
      var name = stopName(s), lx = s.x - (S.measure(name) >> 1);
      S.drawText(ctx, name, lx, s.y + (s.ry || 4) + 3, on ? 'rust' : (open ? 'ink' : 'wood'));
      if (on) {
        ctx.fillStyle = P.signal_amber;
        ctx.fillRect(s.x - 5, s.y - 5, 3, 1); ctx.fillRect(s.x + 3, s.y - 5, 3, 1);
        ctx.fillRect(s.x - 5, s.y + 5, 3, 1); ctx.fillRect(s.x + 3, s.y + 5, 3, 1);
      }
    }
    M.panel(ctx, CX + 4, CY + CH - 24, CW - 8, 20, 'wood', 'ink');
    S.drawText(ctx, info.name, CX + 8, CY + CH - 21, 'bone');
    if (info.hint) S.drawText(ctx, info.hint, CX + CW - 8 - S.measure(info.hint), CY + CH - 21, 'signal_amber');
    S.drawText(ctx, info.status, CX + 8, CY + CH - 12, info.key === 'rust' ? 'rust_hi' : 'fog_light');
    if (phase === 'out') M.dim(ctx, t / FADE);
  }

  return {
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
