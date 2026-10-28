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
    give: todo('give', 'TODO(P7.5)'),     // TODO(P7.5)
    money: todo('money', 'TODO(P8.2)'),   // TODO(P8.2)
    // dbg.hour(h) sets the game clock (0..24); dbg.hour() reads it. TODO(P6.1): the clock does not advance yet.
    hour: function (h) {
      if (h === undefined) return G.state.save.clock;
      G.state.save.clock = ((h % 24) + 24) % 24;
      return G.state.save.clock;
    },
    // dbg.dog(pose) switches the dog's pose; returns false for an unknown pose.
    dog: function (pose) {
      var ok = G.scene.dog.setPose(G.state.run.dog, pose);
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
    caught: todo('caught', 'TODO(P8.3)'), // TODO(P8.3)
    // dbg.sprite(name) bakes a sprite and returns how many pixels differ from its definition (0 = exact).
    sprite: function (name) { return G.gfx.sprites.verify(name || 'test'); },
    // dbg.fx(kind, n, x, y) emits particles; they show wherever a scene draws fx (the gallery's fx page).
    fx: function (kind, n, x, y) { return G.gfx.fx.emit(kind || 'splash', x === undefined ? 160 : x, y === undefined ? 110 : y, n || 20); }
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
