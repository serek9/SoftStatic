var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Overlays and the pause menu (9.2).
// An overlay (pause, journal, map, and the tape of 12.4) sits over whatever scene is up. While one is open the
// boot loop gives it the input and the scene does not update, so the world waits: no
// clock, no fish, no fight. P (or Esc on the water) pauses, J opens the journal anywhere,
// M opens the map from the boat when no line is out. An overlay is
//   {open(), update(dt) -> true while it stays open, draw(ctx)}.
// The pause menu holds the settings (volume, mute) and moving a save (export/import).
G.ui = G.ui || {};
G.ui.menu = (function () {
  var S = G.gfx.sprites, P = S.PALETTE;
  var cur = null, curName = '';

  // ---- Shared drawing helpers (journal, map, shop, cabin) ----------------------------

  // Covers the whole view in either space (an oversized fill is clipped).
  function dim(ctx, a) {
    ctx.globalAlpha = a; ctx.fillStyle = P.night_ink; ctx.fillRect(0, 0, G.core.view.W, G.core.view.H); ctx.globalAlpha = 1;
  }

  // A box with a 1 px border.
  function panel(ctx, x, y, w, h, border, fill) {
    ctx.fillStyle = P[border]; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = P[fill]; ctx.fillRect(x, y, w, h);
  }

  function centre(ctx, s, cx, y, key, jitter, seed) { S.drawText(ctx, s, cx - (S.measure(s) >> 1), y, key, jitter, seed); }

  // -1, 0 or 1 from a pair of actions pressed this step.
  function axis(neg, pos) { var i = G.core.input; return (i.pressed(pos) ? 1 : 0) - (i.pressed(neg) ? 1 : 0); }

  // ---- Overlay manager -----------------------------------------------------------------

  function open(name) {
    var o = { pause: pause, journal: G.ui.journal, map: G.ui.map, tape: G.ui.tape }[name] || null;
    if (!o) return false;
    cur = o; curName = name;
    o.open();
    return true;
  }

  function mapAllowed() { return G.core.state.sceneName() === 'sailing' && G.state.run.fsm === 'sailing'; }

  // Called each step before the scene. Returns true when an overlay has the step (the scene
  // must not update), false to let the scene run.
  function update(dt) {
    var inp = G.core.input, scene = G.core.state.sceneName();
    if (cur) {
      if (!cur.update(dt)) { cur = null; curName = ''; }
      return true;
    }
    if (scene === 'gallery') return false;
    if (inp.pressed('pause') || (scene === 'sailing' && inp.pressed('back'))) return open('pause');
    if (inp.pressed('journal')) return open('journal');
    if (inp.pressed('map') && mapAllowed()) return open('map');
    return false;
  }

  function draw(ctx) { if (cur) cur.draw(ctx); }

  // ---- Pause menu ------------------------------------------------------------------------

  var ITEMS = ['Resume', 'Volume', 'Sound', 'Export save', 'Import save'];
  var PX = 70, PY = 34, PW = 180, PH = 112;
  var sel = 0, msg = '', msgKey = 'fog_light', dirty = false, lastExport = '';

  // Volume as tenths so the shown bar and the stored value always agree.
  function volume(d) {
    var st = G.state.save.settings, v = Math.round(st.volume * 10) + d;
    st.volume = (v < 0 ? 0 : (v > 10 ? 10 : v)) / 10;
    dirty = true;
  }

  function say(s, key) { msg = s; msgKey = key || 'fog_light'; }

  // Saves first (so lastSeen and the RNG are current), then copies the string. Without
  // clipboard access the browser's own prompt shows it for copying.
  function exportSave() {
    var save = G.state.save;
    G.core.save.persist(save);
    lastExport = G.core.save.exportString(save);
    var done = function () { say('Copied to the clipboard.'); };
    var manual = function () {
      window.prompt('Your SoftStatic save. Copy it:', lastExport);
      G.core.input.releaseAll();
      say('Save shown for copying.');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastExport).then(done, manual);
      else manual();
    } catch (e) { manual(); }
    return lastExport;
  }

  // Replaces the save with str (an exported string) and restarts the run at its location.
  // Only between casts, so no card, fight or lure is left pointing at the old save.
  function importSave(str) {
    if (G.state.run.fsm !== 'sailing') { say('Reel in first.', 'signal_amber'); return false; }
    var r = G.core.save.importString(str);
    if (!r.ok) { say('Not loaded: ' + r.error, 'neon_red'); return false; }
    G.state.save = r.save;
    if (r.save.rng !== null) G.rng.setState(r.save.rng);
    G.core.save.persist(r.save);
    G.state.run = G.core.state.newRun();
    G.core.state.change('sailing'); // enter() builds the run at save.loc
    say('Save restored.', 'neon_teal');
    return true;
  }

  function askImport() {
    if (G.state.run.fsm !== 'sailing') { say('Reel in first.', 'signal_amber'); return; }
    var str = window.prompt('Paste a SoftStatic save:', '');
    G.core.input.releaseAll();
    if (str) importSave(str);
  }

  var pause = {
    open: function () { sel = 0; msg = ''; dirty = false; },
    update: function () {
      var inp = G.core.input, st = G.state.save.settings;
      if (inp.pressed('pause') || inp.pressed('back')) { pause.close(); return false; }
      sel = (sel + axis('up', 'down') + ITEMS.length) % ITEMS.length;
      var lr = axis('left', 'right');
      if (ITEMS[sel] === 'Volume' && lr) volume(lr);
      if (ITEMS[sel] === 'Sound' && lr) { st.mute = !st.mute; dirty = true; }
      if (!inp.pressed('action')) return true;
      switch (ITEMS[sel]) {
        case 'Resume': pause.close(); return false;
        case 'Sound': st.mute = !st.mute; dirty = true; break;
        case 'Export save': exportSave(); break;
        case 'Import save': askImport(); break;
      }
      return true;
    },
    // The audio engine (js/audio/engine.js) reads save.settings.volume and mute every step.
    close: function () { if (dirty) G.core.save.autosave('settings'); dirty = false; },
    // Phase 18: drawn in the 640×360 view's pixels: a wooden board with the choices.
    draw: function (ctx) {
      var st = G.state.save.settings, F = S.fine, X = 180, Y = 72, W = 280, H = 216, i;
      dim(ctx, 0.6);
      ctx.fillStyle = P.ink; ctx.fillRect(X - 3, Y - 3, W + 6, H + 6);
      ctx.fillStyle = P.wood_mid; ctx.fillRect(X - 2, Y - 2, W + 4, H + 4);
      ctx.fillStyle = P.wood_dark; ctx.fillRect(X, Y, W, H);
      ctx.fillStyle = P.wood_deep; ctx.fillRect(X + 6, Y + 6, W - 12, H - 12);
      F.bold(ctx, 'PAUSED', X + (W >> 1) - (F.measureBold('PAUSED') >> 1), Y + 16, 'bone');
      for (i = 0; i < ITEMS.length; i++) {
        var y = Y + 46 + i * 24, on = i === sel, key = on ? 'signal_amber' : 'fog_light';
        if (on) { ctx.fillStyle = P.rust_dark; ctx.fillRect(X + 16, y - 5, W - 32, 19); F.bold(ctx, '>', X + 24, y, key); }
        F.bold(ctx, ITEMS[i], X + 38, y, key);
        if (ITEMS[i] === 'Volume') {
          for (var k = 0; k < 10; k++) {
            ctx.fillStyle = P[k < Math.round(st.volume * 10) && !st.mute ? (on ? 'signal_amber' : 'fog_light') : 'fog_dark'];
            ctx.fillRect(X + 140 + k * 11, y + 1, 8, 7);
          }
        } else if (ITEMS[i] === 'Sound') F.bold(ctx, st.mute ? 'off' : 'on', X + 140, y, key);
      }
      if (msg) F.drawText(ctx, msg, X + (W >> 1) - (F.measure(msg) >> 1), Y + H - 44, msgKey);
      F.drawText(ctx, PAUSE_HINT, X + (W >> 1) - (F.measure(PAUSE_HINT) >> 1), Y + H - 24, 'fog_mid');
    }
  };
  pause.native = true;
  var PAUSE_HINT = 'W/S choose   A/D change';

  return {
    open: open, update: update, draw: draw, mapAllowed: mapAllowed,
    isOpen: function () { return cur !== null; },
    native: function () { return !!(cur && cur.native); },
    current: function () { return curName; },
    exportSave: exportSave, importSave: importSave,
    lastExport: function () { return lastExport; },
    message: function () { return msg; },
    dim: dim, panel: panel, centre: centre, axis: axis
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var st = G.state.save && G.state.save.settings;
  return 'ui ' + (G.ui.menu.current() || '-') + (st ? '  volume ' + st.volume.toFixed(1) + (st.mute ? ' muted' : '') : '') +
    (G.ui.menu.message() ? '  msg "' + G.ui.menu.message() + '"' : '');
});
