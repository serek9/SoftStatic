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
    var U = G.ui.panel, L = U && U.layer;                                           // Phase 90: the UI layer (the margins too) fades with it
    if (L && L.on && L.ctx && ctx !== L.ctx) { L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.globalAlpha = a; L.ctx.fillStyle = P.night_ink; L.ctx.fillRect(0, 0, L.VW, L.VH); L.ctx.globalAlpha = 1; }
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
    var o = { pause: pause, journal: G.ui.journal, map: G.ui.map, look: G.ui.look, controls: G.ui.controls }[name] || null;
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
  // an iPhone, not from the home screen). Phase 88: 'Tips' (the first-time tips on or off) and
  // 'Controls' (the controls page). Phase 90: 'Text size' (normal or large: the UI layer).
  // The panel grows a row for each, and on a short screen shows a window of the rows, scrolled
  // to the chosen one, with marks for more above and below.
  // Phase 91.3: 'Vibration' in touch mode. The list is built from ALL, keeping the rows that apply.
  var ALL = ['Resume', 'Volume', 'Sound', 'Dog barks', 'Full screen', 'Vibration', 'Text size', 'Tips', 'Controls', 'Fisher & dog', 'Export save', 'Import save'];
  var ITEMS = [];
  function buildItems() {
    var D = G.core.device, fs = D && D.canFullscreen(), t = D && D.touch();
    ITEMS.length = 0;
    for (var i = 0; i < ALL.length; i++) if ((ALL[i] !== 'Full screen' || fs) && (ALL[i] !== 'Vibration' || t)) ITEMS.push(ALL[i]);
  }
  // Phase 46: the panel's bounds (at the right edge), where the values and the message sit.
  var PW = 176, PRECT = G.ui.panel.place(PW, 140, 'right', [0, 0, PW, 140]), VAL_X = 110, MSG_Y = 103, RH = 12, SHOW = 7, TOP = 0, lv = -1, openT = 0;
  function layoutPause() {
    var U = G.ui.panel;
    buildItems();
    RH = U.rowH();
    var foot = U.touch() ? U.PAD : U.KEY_H + U.PAD, fixed = U.TAB + U.PAD + 2 * U.ROW + foot + 1;
    SHOW = Math.max(3, Math.min(ITEMS.length, Math.floor((U.pic()[3] - 2 * U.MARGIN - fixed) / RH)));
    var h = fixed + SHOW * RH;
    U.place(PW, h, 'right', PRECT); PRECT[2] = PW; PRECT[3] = h; MSG_Y = U.TAB + U.PAD + SHOW * RH + 1;
    lv = U.ver();
  }
  function scrollTo() { if (sel < TOP) TOP = sel; if (sel >= TOP + SHOW) TOP = sel - SHOW + 1; if (TOP > ITEMS.length - SHOW) TOP = Math.max(0, ITEMS.length - SHOW); }
  function fullscreen() { var D = G.core.device; G.state.save.settings.fullscreen = !D.isFullscreen(); D.setFullscreen(G.state.save.settings.fullscreen); dirty = true; }
  var reminded = 0, sel = 0, msg = '', msgLines = [], msgKey = 'fog_light', dirty = false, lastExport = '';

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
    if (save.flags) save.flags.exportAt = Date.now(); // 91.2: the weekly reminder counts from here
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

  // Phase 90: Text size, normal or large; the fit lays the UI layer out again.
  function textSize() { var st = G.state.save.settings; st.textSize = st.textSize === 'large' ? 'normal' : 'large'; dirty = true; G.core.device.fit(); layoutPause(); scrollTo(); }
  function tips() { var st = G.state.save.settings; st.tips = st.tips === false; dirty = true; }
  function vibration() { var st = G.state.save.settings; st.vibration = st.vibration === false; dirty = true; if (st.vibration) G.core.device.buzz('bite'); }

  // 91.2: once a week, while the browser has not promised to keep the save and there is a save
  // worth keeping (a fish caught), the pause list opens on Export save with a line saying why.
  var WEEK = 7 * 24 * 3600 * 1000;
  function remindDue() {
    var s = G.state.save, f = s.flags || {}, n = 0;
    if (G.core.device.persisted() === true || G.core.save.tour()) return false;
    for (var k in s.journal) n += s.journal[k].caught || 0;
    return n > 0 && Date.now() - Math.max(f.exportAt || 0, f.remindAt || 0) > WEEK;
  }

  var pause = {
    open: function (at) {
      layoutPause(); sel = Math.max(0, ITEMS.indexOf(at)); TOP = 0; say(''); dirty = false; openT = G.ui.panel.now();
      if (!at && remindDue()) { G.state.save.flags.remindAt = Date.now(); dirty = true; sel = ITEMS.indexOf('Export save'); reminded++; say('This browser may clear the save. Export a copy to keep it.', 'signal_amber'); }
      scrollTo();
    },
    update: function () {
      var inp = G.core.input, st = G.state.save.settings, was = sel;
      if (lv !== G.ui.panel.ver()) { layoutPause(); scrollTo(); }
      if (inp.pressed('pause') || inp.pressed('back')) { pause.close(); return false; }
      sel = (sel + axis('up', 'down') + ITEMS.length) % ITEMS.length;
      if (sel !== was) { scrollTo(); G.audio.engine.play('uiMove'); }
      var lr = axis('left', 'right');
      if (ITEMS[sel] === 'Volume' && lr) volume(lr);
      if (ITEMS[sel] === 'Sound' && lr) { st.mute = !st.mute; dirty = true; }
      if (ITEMS[sel] === 'Dog barks' && lr) { st.dogBark = !st.dogBark; dirty = true; }
      if (ITEMS[sel] === 'Full screen' && lr) fullscreen();
      if (ITEMS[sel] === 'Text size' && lr) textSize();
      if (ITEMS[sel] === 'Tips' && lr) tips();
      if (ITEMS[sel] === 'Vibration' && lr) vibration();
      if (!inp.pressed('action')) return true;
      G.audio.engine.play('uiOk');
      switch (ITEMS[sel]) {
        case 'Resume': pause.close(); return false;
        case 'Sound': st.mute = !st.mute; dirty = true; break;
        case 'Dog barks': st.dogBark = !st.dogBark; dirty = true; break; // Phase 42
        case 'Full screen': fullscreen(); break; // Phase 59.3
        case 'Text size': textSize(); break; // Phase 90
        case 'Tips': tips(); break; // Phase 88
        case 'Vibration': vibration(); break; // Phase 91.3
        case 'Controls': pause.close(); open('controls'); return true; // Phase 88.5
        case 'Fisher & dog': pause.close(); open('look', 'pause'); return true; // Phase 47: the picker is the overlay now
        case 'Export save': exportSave(); break;
        case 'Import save': askImport(); break;
      }
      return true;
    },
    // Phase 59.2: a touch on the list (input.zone). The row rule: a tap on a row selects it,
    // a tap on the selected row does it; on the selected Volume row, a tap on the ticks left
    // or right of the level turns it down or up. Anywhere else, nothing.
    tap: function (gx0, gy0) {
      var U = G.ui.panel, X = PRECT[0], Y = PRECT[1], W = PRECT[2], gx = U.ux(gx0), gy = U.uy(gy0);
      if (!U.inside(PRECT, gx, gy)) return 'none';
      var k = Math.floor((gy - (U.top(Y) - 2 - ((RH - U.ROW) >> 1))) / RH);
      if (k >= 0 && k < SHOW && (k === 0 && TOP > 0 || k === SHOW - 1 && TOP + SHOW < ITEMS.length) && gx >= X + W - U.PAD - 12) { // the marks scroll
        TOP = Math.max(0, Math.min(ITEMS.length - SHOW, TOP + (k === 0 ? -1 : 1))); return 'none';
      }
      var i = TOP + k;
      if (k < 0 || k >= SHOW || i >= ITEMS.length || gx < X + 3 || gx >= X + W - 3) return 'none';
      if (i !== sel) { sel = i; say(''); G.audio.engine.play('uiMove'); return 'none'; }
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
    draw: function (ctx0) {
      var U = G.ui.panel, ctx = U.begin(ctx0), st = G.state.save.settings, F = S.fine, a = U.fadeIn(openT), X = PRECT[0], Y = PRECT[1] + Math.round((1 - a) * 4), W = PRECT[2], i, x;
      if (lv !== U.ver()) { layoutPause(); scrollTo(); X = PRECT[0]; Y = PRECT[1]; W = PRECT[2]; }
      ctx.globalAlpha = a;
      U.frame(ctx, X, Y, W, PRECT[3], 'PAUSED');
      for (var k = 0; k < SHOW && TOP + k < ITEMS.length; k++) {
        i = TOP + k;
        var y = U.top(Y) + k * RH + ((RH - U.ROW) >> 1), on = i === sel, key = on ? 'signal_amber' : 'fog_light';
        if (on) U.row(ctx, X + 3, y, W - 6, RH);
        else if (U.hot([X + 3, y - 2 - ((RH - U.ROW) >> 1), W - 6, RH])) { ctx.fillStyle = P.night_deep; ctx.fillRect(X + 3, y - 2 - ((RH - U.ROW) >> 1), W - 6, RH - 1); } // 90.5: hover
        F.drawText(ctx, ITEMS[i], U.left(X) + 3, y, key);
        if (k === 0 && TOP > 0) F.drawText(ctx, '^', X + W - U.PAD - 6, y, 'fog_mid');
        if (k === SHOW - 1 && TOP + SHOW < ITEMS.length) F.drawText(ctx, 'v', X + W - U.PAD - 6, y, 'fog_mid');
        if (ITEMS[i] === 'Volume') {
          for (var t = 0; t < 10; t++) {
            ctx.fillStyle = P[t < Math.round(st.volume * 10) && !st.mute ? key : 'fog_dark'];
            ctx.fillRect(X + VAL_X + t * 5, y + 1, 3, 6);
          }
        } else if (ITEMS[i] === 'Sound') F.drawText(ctx, st.mute ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Dog barks') F.drawText(ctx, st.dogBark === false ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Full screen') F.drawText(ctx, G.core.device.isFullscreen() ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Text size') F.drawText(ctx, st.textSize === 'large' ? 'large' : 'normal', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Tips') F.drawText(ctx, st.tips === false ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Vibration') F.drawText(ctx, st.vibration === false ? 'off' : (G.core.device.canVibrate() ? 'on' : 'on (none here)'), X + VAL_X, y, key);
        else if ((ITEMS[i] === 'Fisher & dog' || ITEMS[i] === 'Controls') && !(k === SHOW - 1 && TOP + SHOW < ITEMS.length)) F.drawText(ctx, '>', X + W - U.PAD - 6, y, key);
      }
      for (i = 0; i < msgLines.length && i < 2; i++) F.drawText(ctx, msgLines[i], U.left(X), Y + MSG_Y + i * U.ROW, msgKey);
      x = U.left(X);
      x += U.hint(ctx, 'W/S', 'choose', x, Y + PRECT[3] - U.PAD - U.KEY_H);
      U.hint(ctx, 'A/D', 'change', x, Y + PRECT[3] - U.PAD - U.KEY_H);
      ctx.globalAlpha = 1;
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
    exportSave: exportSave, importSave: importSave, rect: function () { if (lv !== G.ui.panel.ver()) layoutPause(); return PRECT; },
    lastExport: function () { return lastExport; }, items: function () { if (!ITEMS.length) buildItems(); return ITEMS.slice(); },
    reminded: function () { return reminded; }, remindDue: remindDue, // Phase 91.2
    message: function () { return msg; },
    dim: dim, panel: panel, centre: centre, axis: axis
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var st = G.state.save && G.state.save.settings;
  return 'ui ' + (G.ui.menu.current() || '-') + (st ? '  volume ' + st.volume.toFixed(1) + (st.mute ? ' muted' : '') : '') +
    (G.ui.menu.message() ? '  msg "' + G.ui.menu.message() + '"' : '');
});
