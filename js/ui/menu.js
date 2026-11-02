var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Overlays and the pause menu (9.2).
// An overlay (pause, journal, map, the look picker) sits over whatever scene is up. While one is open the
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

  // arg: passed to the overlay's open() (Phase 47: the pause list's row; the picker's caller).
  function open(name, arg) {
    var o = { pause: pause, journal: G.ui.journal, map: G.ui.map, look: G.ui.look }[name] || null;
    if (!o) return false;
    cur = o; curName = name;
    o.open(arg);
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
    if (inp.pressed('pause') || (scene === 'sailing' && inp.pressed('back') && !G.ui.setup.isOpen() && !(G.ui.dock && G.ui.dock.busy()))) return open('pause'); // Esc closes the setup panel (Phase 45) and the pier's (Phase 67)
    if (inp.pressed('journal')) return open('journal');
    if (inp.pressed('map') && mapAllowed()) return open('map');
    return false;
  }

  function draw(ctx) { if (cur) cur.draw(ctx); }

  // ---- Pause menu ------------------------------------------------------------------------

  // Phase 47: 'Fisher & dog' opens the picker (G.ui.look), which comes back here on close.
  // Phase 59.3: 'Full screen' joins the list in touch mode where the browser has it (not on
  // an iPhone, not from the home screen); the panel grows a row for it (built on open).
  var BASE_ITEMS = ['Resume', 'Volume', 'Sound', 'Dog barks', 'Fisher & dog', 'Export save', 'Import save'];
  var FS_ITEMS = ['Resume', 'Volume', 'Sound', 'Dog barks', 'Full screen', 'Fisher & dog', 'Export save', 'Import save'];
  var ITEMS = BASE_ITEMS;
  // Phase 46: the panel's bounds (at the right edge), where the values and the message sit.
  var PRECT = G.ui.panel.place(176, 140, 'right', [0, 0, 176, 140]), VAL_X = 110, MSG_Y = 103;
  function layoutPause() {
    var fs = G.core.device && G.core.device.canFullscreen();
    ITEMS = fs ? FS_ITEMS : BASE_ITEMS;
    var extra = (ITEMS.length - BASE_ITEMS.length) * G.ui.panel.ROW;
    G.ui.panel.place(176, 140 + extra, 'right', PRECT); PRECT[2] = 176; PRECT[3] = 140 + extra; MSG_Y = 103 + extra;
  }
  function fullscreen() { var D = G.core.device; G.state.save.settings.fullscreen = !D.isFullscreen(); D.setFullscreen(G.state.save.settings.fullscreen); dirty = true; }
  var sel = 0, msg = '', msgLines = [], msgKey = 'fog_light', dirty = false, lastExport = '';

  // Volume as tenths so the shown bar and the stored value always agree.
  function volume(d) {
    var st = G.state.save.settings, v = Math.round(st.volume * 10) + d;
    st.volume = (v < 0 ? 0 : (v > 10 ? 10 : v)) / 10;
    dirty = true;
  }

  function say(s, key) { msg = s; msgLines = s ? S.fine.wrap(s, PRECT[2] - 2 * G.ui.panel.PAD) : []; msgKey = key || 'fog_light'; }

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
    open: function (at) { layoutPause(); sel = Math.max(0, ITEMS.indexOf(at)); say(''); dirty = false; },
    update: function () {
      var inp = G.core.input, st = G.state.save.settings;
      if (inp.pressed('pause') || inp.pressed('back')) { pause.close(); return false; }
      sel = (sel + axis('up', 'down') + ITEMS.length) % ITEMS.length;
      var lr = axis('left', 'right');
      if (ITEMS[sel] === 'Volume' && lr) volume(lr);
      if (ITEMS[sel] === 'Sound' && lr) { st.mute = !st.mute; dirty = true; }
      if (ITEMS[sel] === 'Dog barks' && lr) { st.dogBark = !st.dogBark; dirty = true; }
      if (ITEMS[sel] === 'Full screen' && lr) fullscreen();
      if (!inp.pressed('action')) return true;
      switch (ITEMS[sel]) {
        case 'Resume': pause.close(); return false;
        case 'Sound': st.mute = !st.mute; dirty = true; break;
        case 'Dog barks': st.dogBark = !st.dogBark; dirty = true; break; // Phase 42
        case 'Full screen': fullscreen(); break; // Phase 59.3
        case 'Fisher & dog': pause.close(); open('look', 'pause'); return true; // Phase 47: the picker is the overlay now
        case 'Export save': exportSave(); break;
        case 'Import save': askImport(); break;
      }
      return true;
    },
    // Phase 59.2: a touch on the list (input.zone). The row rule: a tap on a row selects it,
    // a tap on the selected row does it; on the selected Volume row, a tap on the ticks left
    // or right of the level turns it down or up. Anywhere else, nothing.
    tap: function (gx, gy) {
      var U = G.ui.panel, X = PRECT[0], Y = PRECT[1], W = PRECT[2];
      if (!U.inside(PRECT, gx, gy)) return 'none';
      var i = Math.floor((gy - (U.top(Y) - 2)) / U.ROW);
      if (i < 0 || i >= ITEMS.length || gx < X + 3 || gx >= X + W - 3) return 'none';
      if (i !== sel) { sel = i; say(''); return 'none'; }
      if (ITEMS[i] === 'Volume') {
        if (gx < X + VAL_X - 4) return 'none';
        var level = G.state.save.settings.mute ? 0 : Math.round(G.state.save.settings.volume * 10);
        return gx < X + VAL_X + level * 5 - 1 ? 'left' : 'right';
      }
      return 'action';
    },
    // The audio engine (js/audio/engine.js) reads save.settings.volume and mute every step.
    close: function () { if (dirty) G.core.save.autosave('settings'); dirty = false; },
    // Phase 46: a narrow list in the small panel (G.ui.panel) at the right edge, over the
    // world (nothing dimmed): the choices, the volume as ten ticks, a word from export or
    // import, and the keys.
    draw: function (ctx) {
      var U = G.ui.panel, st = G.state.save.settings, F = S.fine, X = PRECT[0], Y = PRECT[1], W = PRECT[2], i, x;
      U.frame(ctx, X, Y, W, PRECT[3], 'PAUSED');
      for (i = 0; i < ITEMS.length; i++) {
        var y = U.top(Y) + i * U.ROW, on = i === sel, key = on ? 'signal_amber' : 'fog_light';
        if (on) U.row(ctx, X + 3, y, W - 6);
        F.drawText(ctx, ITEMS[i], U.left(X) + 3, y, key);
        if (ITEMS[i] === 'Volume') {
          for (var k = 0; k < 10; k++) {
            ctx.fillStyle = P[k < Math.round(st.volume * 10) && !st.mute ? key : 'fog_dark'];
            ctx.fillRect(X + VAL_X + k * 5, y + 1, 3, 6);
          }
        } else if (ITEMS[i] === 'Sound') F.drawText(ctx, st.mute ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Dog barks') F.drawText(ctx, st.dogBark === false ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Full screen') F.drawText(ctx, G.core.device.isFullscreen() ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Fisher & dog') F.drawText(ctx, '>', X + W - U.PAD - 6, y, key);
      }
      for (i = 0; i < msgLines.length && i < 2; i++) F.drawText(ctx, msgLines[i], U.left(X), Y + MSG_Y + i * U.ROW, msgKey);
      x = U.left(X);
      x += U.hint(ctx, 'W/S', 'choose', x, Y + PRECT[3] - U.PAD - U.KEY_H);
      U.hint(ctx, 'A/D', 'change', x, Y + PRECT[3] - U.PAD - U.KEY_H);
    }
  };
  pause.native = true;

  return {
    open: open, update: update, draw: draw, mapAllowed: mapAllowed,
    isOpen: function () { return cur !== null; },
    // Phase 59.2: a touch on the open overlay: what to press (see input.overlayTap); '' to
    // leave it to the zones (an overlay with no tap of its own).
    tap: function (gx, gy) { return cur && cur.tap ? cur.tap(gx, gy) : ''; },
    native: function () { return !!(cur && cur.native); },
    current: function () { return curName; },
    exportSave: exportSave, importSave: importSave, rect: function () { return PRECT; },
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
