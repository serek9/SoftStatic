var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// `?debug` overlay, on-screen errors and the `dbg` console API (V12).
// The overlay and errors are DOM text above the canvas, not game text, so they stay
// readable at any scale and keep working after the game loop has crashed.
// Errors are shown in red even without ?debug.
G.core = G.core || {};
G.core.debug = (function () {
  var on = /[?&]debug(=|&|$)/.test(location.search);
  var lines = [];   // functions returning one overlay line each
  var logs = [];    // last few log messages
  var errors = [];  // {msg, count}
  var overlayEl = null, errorEl = null;

  function el(css) {
    var e = document.createElement('pre');
    e.style.cssText = 'position:fixed;left:0;margin:0;padding:4px 6px;font:12px/1.35 monospace;' +
      'pointer-events:none;white-space:pre-wrap;z-index:10;' + css;
    document.body.appendChild(e);
    return e;
  }

  // Each feature registers its own overlay line (§0.13).
  function addLine(fn) { lines.push(fn); }

  function log(msg) {
    logs.push(msg);
    if (logs.length > 5) logs.shift();
    if (on) console.log('[dbg] ' + msg);
  }

  function error(msg) {
    for (var i = 0; i < errors.length; i++) {
      if (errors[i].msg === msg) { errors[i].count++; renderErrors(); return; }
    }
    errors.push({ msg: msg, count: 1 });
    if (errors.length > 8) errors.shift();
    renderErrors();
  }

  function renderErrors() {
    if (!document.body) return;
    if (!errorEl) errorEl = el('bottom:0;right:0;color:#ff4a4a;background:rgba(20,0,0,.85);');
    var s = '';
    for (var i = 0; i < errors.length; i++) {
      s += errors[i].msg + (errors[i].count > 1 ? '  (x' + errors[i].count + ')' : '') + '\n';
    }
    errorEl.textContent = s;
  }

  window.addEventListener('error', function (e) {
    var where = e.filename ? '  @ ' + e.filename.split('/').pop() + ':' + e.lineno : '';
    error((e.error && e.error.stack ? e.error.stack.split('\n')[0] : e.message) + where);
  });
  window.addEventListener('unhandledrejection', function (e) {
    error('unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
  window.addEventListener('DOMContentLoaded', function () {
    if (errors.length) renderErrors();
    if (!on) return;
    overlayEl = el('top:0;color:#cfe8e0;background:rgba(0,0,0,.6);');
    setInterval(renderOverlay, 100);
  });

  function renderOverlay() {
    var s = '';
    for (var i = 0; i < lines.length; i++) {
      try { s += lines[i]() + '\n'; } catch (e) { s += '(line error: ' + e.message + ')\n'; }
    }
    for (var j = 0; j < logs.length; j++) s += '> ' + logs[j] + '\n';
    overlayEl.textContent = s;
  }

  function todo(name, task) {
    return function () { console.warn('dbg.' + name + ' is not implemented yet (' + task + ')'); };
  }

  var dbg = {
    // dbg.state() returns the current fishing state; dbg.state(name) tries a transition.
    state: function (name) {
      var run = G.state.run;
      if (name === undefined) return run.fsm;
      var ok = G.core.state.go(run, name);
      console.log(ok ? 'fsm -> ' + name : 'refused: ' + run.fsm + ' -> ' + name);
      return ok;
    },
    // dbg.give(id) puts a fish of that species on the bite (the lure must be in the water).
    // dbg.give(id, true) also hooks it and lands it at once, straight to its card.
    give: function (id, quick) {
      var run = G.state.run, sp = -1;
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) sp = i;
      if (sp < 0) { console.log('species: ' + G.data.fish.map(function (f) { return f.id; }).join(', ')); return false; }
      if (!run.lureIn.active) { console.log('cast first: the lure must be in the water'); return false; }
      if (run.fsm === 'sinking') G.core.state.go(run, 'waiting');
      var f = G.sim.fish_ai.spawn(run.school, sp, run.lureIn.x - 5, run.lureIn.y, 1, G.rng, G.data);
      if (!f) return false;
      f.state = 'bite'; f.t = 0;
      if (run.fsm === 'waiting') G.core.state.go(run, 'interest');
      if (quick) {
        G.core.input.inject('action', true);
        setTimeout(function () { G.core.input.inject('action', false); }, 120);
        setTimeout(function () { dbg.land(); }, 600); // after the 0.3 s hooked beat
      }
      return true;
    },
    // dbg.land() wins the current fight on the next step.
    // (tired, so an un-reeled step cannot push D back up before the win check)
    land: function () { var F = G.state.run.fight; if (!F.active) return false; F.D = 0; F.mode = 'tired'; F.modeT = 9; return true; },
    // dbg.rod(kg) overrides the rod's mass limit (D4) for testing; dbg.rod(0) restores it.
    rod: function (kg) { return G.scene.sailing.setRodMax(kg); },
    // dbg.money(n) adds n coins (negative takes them); returns the balance.
    money: function (n) { G.state.save.coins = Math.max(0, G.state.save.coins + (n || 0)); return G.state.save.coins; },
    // dbg.buy(kind) buys the next 'rod' | 'reel' | 'line' | 'lantern' | 'depthFinder', or dbg.buy('bait', id, n).
    buy: function (kind, id, n) {
      var E = G.sim.economy, save = G.state.save;
      var r = kind === 'bait' ? E.buyBait(save, id, n || 10, G.data) : E.buy(save, kind, G.data);
      if (r === E.OK) { if (kind === 'bait') save.gear.bait = id; G.core.save.autosave('purchase'); }
      return ['ok', 'maxed', 'not enough coins', 'locked', 'unknown'][r];
    },
    // dbg.save() saves now; dbg.wipe() deletes the save (reload for a new game).
    save: function () { return G.core.save.autosave('dbg'); },
    wipe: function () { localStorage.removeItem(G.core.save.KEY); return 'save deleted; reload'; },
    // dbg.hour(h) sets the game clock (0..24); dbg.hour() reads it.
    hour: function (h) {
      if (h === undefined) return G.state.save.clock;
      G.state.save.clock = ((h % 24) + 24) % 24;
      return G.state.save.clock;
    },
    // dbg.dog(pose) switches the dog's pose; returns false for an unknown pose.
    dog: function (pose) {
      var ok = G.scene.dog.setPose(G.state.run.dog, pose, 5);
      if (!ok) console.log('poses: ' + G.scene.dog.POSES.join(', '));
      return ok;
    },
    // dbg.unease(v) sets the current location's unease (0..1); dbg.unease() reads it.
    unease: function (v) {
      var loc = G.state.run.loc;
      if (v !== undefined) G.sim.unease.set(G.state.save, loc, v);
      return G.sim.unease.get(G.state.save, loc);
    },
    // dbg.spawn(id) puts a fish of that species beside the lure (lure must be in the water).
    spawn: function (id) {
      var run = G.state.run, sp = -1;
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) sp = i;
      if (sp < 0 || !run.lureIn.active) return false;
      var h = G.data.fish[sp].habitat;
      return !!G.sim.fish_ai.spawn(run.school, sp, run.lureIn.x - 60, (h.depthMin + h.depthMax) * 2, 1, G.rng, G.data);
    },
    // dbg.cast(charge) casts at once with charge 0..1 (default 0.3); returns the landing x.
    cast: function (charge) { return G.scene.sailing.forceCast(charge === undefined ? 0.3 : charge); },
    // dbg.lure(m, x) puts an underwater lure at m metres (clamped to the bottom), optionally at world x.
    lure: function (m, x) {
      var sc = G.scene.sailing;
      return G.scene.underwater.setLure(G.state.run, sc.loc(), m, x);
    },
    // dbg.tp(x) moves the boat to world x, stops it and snaps the camera.
    tp: function (x) { return G.scene.sailing.tp(x); },
    // dbg.caught(n) records one catch of each of the first n species in the journal (no coins).
    caught: function (n) {
      var save = G.state.save, list = G.data.fish;
      for (var i = 0; i < Math.min(n || list.length, list.length); i++) {
        var sp = list[i];
        G.sim.economy.recordCatch(save, { id: sp.id, len: sp.lengthCm[0], w: sp.weightKg[0], price: 0, hintRefs: sp.hintRefs, windowCatch: null }, 'sell');
      }
      return Object.keys(save.journal).length;
    },
    // dbg.ui(name) opens 'pause' | 'journal' | 'map' over the scene, or goes into 'shop' | 'cabin'
    // (from the boat, between casts); dbg.ui() closes nothing and returns what is open.
    ui: function (name) {
      if (name === 'shop' || name === 'cabin') {
        if (G.state.run.fsm !== 'sailing') return 'reel in first';
        G.core.state.change(name);
        return name;
      }
      if (name) G.ui.menu.open(name);
      return G.ui.menu.current() || G.core.state.sceneName();
    },
    // dbg.travel(id) travels to a location (or 'shop' / 'cabin') through the map, fade and all.
    travel: function (id) {
      if (!G.ui.menu.mapAllowed() && G.ui.menu.current() !== 'map') return 'only from the boat, between casts';
      if (G.ui.menu.current() !== 'map') G.ui.menu.open('map');
      return G.ui.map.travel(id) ? 'travelling' : G.ui.map.info().status;
    },
    // dbg.anomaly(id) forces that anomaly now, near the boat (refused while one is active);
    // dbg.anomaly() returns the active one, or null.
    anomaly: function (id) {
      var A = G.state.run.anom;
      if (id === undefined) return A.on ? { id: A.id, x: Math.round(A.x), t: +A.t.toFixed(2), dur: +A.dur.toFixed(2) } : null;
      if (A.on) return 'one is active already: ' + A.id;
      if (!G.scene.sailing.forceAnomaly(id)) return 'anomalies: ' + G.data.anomalies.list.map(function (a) { return a.id; }).join(', ');
      return dbg.anomaly();
    },
    // dbg.passive(true|false) turns passive mode on or off (as TAB does); dbg.passive() reads it.
    passive: function (on) { return on === undefined ? G.state.run.passive.on : G.scene.sailing.setPassive(on); },
    // dbg.away(seconds) plays out that much time away now (12.3), as a reload would, and opens the tape.
    away: function (secs) {
      var save = G.state.save, now = Date.now();
      if (G.state.run.fsm !== 'sailing') return 'reel in first';
      save.lastSeen = now - (secs || 0) * 1000;
      var tp = G.ui.tape.away(now);
      return tp ? { caught: tp.caught, lost: tp.lost, coins: tp.coins, lines: tp.entries.length, gap: tp.gap, phantom: tp.phantom } : 'under a minute: nothing to fish';
    },
    // dbg.tape(i) returns saved tape i (0 is the newest) as its shown lines.
    tape: function (i) {
      var tp = G.state.save.tapes[i || 0];
      if (!tp) return null;
      G.ui.tape.show(tp);
      return G.ui.tape.rows();
    },
    // dbg.restore() pays for the next cabin stage; returns the level.
    restore: function () { G.sim.economy.restoreCabin(G.state.save, G.data); G.core.save.autosave('purchase'); return G.state.save.cabinLevel; },
    // dbg.sprite(name) bakes a sprite and returns how many pixels differ from its definition (0 = exact).
    sprite: function (name) { return G.gfx.sprites.verify(name || 'test'); },
    // dbg.fx(kind, n, x, y) emits particles; they show wherever a scene draws fx (the gallery's fx page).
    fx: function (kind, n, x, y) { return G.gfx.fx.emit(kind || 'splash', x === undefined ? 160 : x, y === undefined ? 110 : y, n || 20); },
    // dbg.sky(h) checks the sky at hour h (default: now) from the top to the horizon: the
    // brightest luminance against the ceiling, and the night, grey and dusk light shares.
    sky: function (h) {
      var sc = G.scene.sailing, S = G.gfx.sprites, out = [0, 0, 0], max = 0;
      h = h === undefined ? sc.hourNow() : h;
      for (var i = 0; i <= 20; i++) {
        sc.skyColor(h, i / 20, out);
        max = Math.max(max, 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]);
      }
      var L = sc.light(G.sim.clock.wrap(h));
      return { hour: h, top: sc.skyColor(h, 0, [0, 0, 0]), horizon: sc.skyColor(h, 1, [0, 0, 0]), maxLum: +max.toFixed(1),
        ceiling: +S.CEILING.toFixed(1), safe: max <= S.CEILING + 0.001, night: +L.night.toFixed(2), grey: +L.grey.toFixed(2), dusk: +L.dusk.toFixed(2) };
    },
    // dbg.audio() returns the audio context's state, the gains, the limiter and the last events;
    // dbg.audio(ev) plays one sound by name (no name: the list).
    audio: function (ev) { return ev === undefined ? G.audio.engine.info() : G.audio.engine.play(ev); },
    // dbg.fog() returns the alpha fog layers and the mist are drawn at now, the moon and the light on the water.
    fog: function () {
      var sc = G.scene.sailing, w = sc.waterLight();
      return { alpha: +sc.fogAlpha().toFixed(3), moon: sc.moon(), light: { x: w.x, a: +w.a.toFixed(2), key: w.key } };
    }
  };
  if (on) window.dbg = dbg;

  // `?gallery`: pages of everything the gfx layer can draw. A/D or arrows change page.
  var gallery = (function () {
    var pages = [], page = 0, t = 0, emitT = 0;
    var SAMPLE = 'The quick brown fox jumps over the lazy dog.';
    var CELL_W = 80, CELL_H = 42, COLS = 4, ROWS = 4;

    function enter() {
      if (G.gfx.fishgen) G.gfx.fishgen.defineGallery(); // every part on every base
      var names = G.gfx.sprites.names, per = COLS * ROWS;
      pages = ['palette', 'font'];
      for (var i = 0; i < names.length; i += per) pages.push('sprites:' + i);
      pages.push('fx');
      page = 0; t = 0;
    }

    function update(dt) {
      var inp = G.core.input;
      if (inp.pressed('right')) page = (page + 1) % pages.length;
      if (inp.pressed('left')) page = (page + pages.length - 1) % pages.length;
      t += dt;
      if (pages[page] === 'fx') {
        emitT -= dt;
        if (emitT <= 0) {
          emitT = 0.3;
          G.gfx.fx.emit('splash', 50, 110, 14);
          G.gfx.fx.emit('wake', 130, 110, 6);
          G.gfx.fx.emit('bubbles', 210, 168, 3);
          G.gfx.fx.emit('dust', 280, 60, 2);
        }
      }
      G.gfx.fx.update(dt);
    }

    function draw(ctx) {
      var S = G.gfx.sprites, P = S.PALETTE, name = pages[page];
      ctx.fillStyle = P.night_ink;
      ctx.fillRect(0, 0, 320, 180);
      S.drawText(ctx, 'GALLERY  ' + name.split(':')[0] + '  ' + (page + 1) + '/' + pages.length + '   A/D: page', 4, 2, 'dusk_high');

      if (name === 'palette') {
        var keys = Object.keys(P);
        for (var i = 0; i < keys.length; i++) {
          var cx = 4 + Math.floor(i / 14) * 106, cy = 13 + (i % 14) * 11;
          ctx.fillStyle = P[keys[i]];
          ctx.fillRect(cx, cy, 8, 8);
          S.drawText(ctx, keys[i] + (S.SKY_WATER.test(keys[i]) ? '*' : ''), cx + 11, cy + 1, 'fog_light');
        }
        S.drawText(ctx, '* sky/water: never brighter than ' + S.CEILING_KEY, 4, 171, 'fog_mid');
      } else if (name === 'font') {
        for (var c = 32; c < 127; c++) {
          var k = c - 32;
          S.drawText(ctx, String.fromCharCode(c), 6 + (k % 24) * 12, 14 + Math.floor(k / 24) * 10, 'bone');
        }
        for (var j = 0; j < 4; j++) {
          S.drawText(ctx, 'jitter ' + (j / 3).toFixed(2), 4, 66 + j * 14, 'fog_mid');
          S.drawText(ctx, SAMPLE, 60, 66 + j * 14, 'paper', j / 3, 7);
        }
        S.drawText(ctx, 'width of sample: ' + S.measure(SAMPLE) + ' px', 4, 126, 'fog_mid');
      } else if (name.indexOf('sprites:') === 0) {
        var start = +name.split(':')[1], names = S.names;
        for (var s = start; s < Math.min(names.length, start + COLS * ROWS); s++) {
          var cell = s - start, x0 = 4 + (cell % COLS) * CELL_W, y0 = 13 + Math.floor(cell / COLS) * CELL_H;
          var d = S.get(names[s]), f = Math.floor(t * 3);
          ctx.save();
          ctx.beginPath(); ctx.rect(x0, y0, CELL_W - 2, CELL_H - 2); ctx.clip();
          S.draw(ctx, names[s], x0, y0, f, false);
          S.draw(ctx, names[s], x0 + d.w + 4, y0, f, true);
          S.drawText(ctx, names[s] + ' ' + d.w + 'x' + d.h + ' x' + d.n, x0, y0 + CELL_H - 10, 'fog_light');
          ctx.restore();
        }
      } else if (name === 'fx') {
        ctx.fillStyle = P.water_dark;
        ctx.fillRect(0, 110, 320, 70);
        G.gfx.fx.draw(ctx, 0, 0);
        S.drawText(ctx, 'splash', 50 - (S.measure('splash') >> 1), 172, 'fog_mid');
        S.drawText(ctx, 'wake', 130 - (S.measure('wake') >> 1), 172, 'fog_mid');
        S.drawText(ctx, 'bubbles', 210 - (S.measure('bubbles') >> 1), 120, 'fog_mid');
        S.drawText(ctx, 'dust', 280 - (S.measure('dust') >> 1), 80, 'fog_mid');
        S.drawText(ctx, 'live ' + G.gfx.fx.count() + '/' + G.gfx.fx.MAX, 4, 14, 'fog_light');
      }
    }

    return { enter: enter, exit: function () { G.gfx.fx.clear(); }, update: update, draw: draw };
  })();

  return { on: on, addLine: addLine, log: log, error: error, dbg: dbg, gallery: gallery };
})();
