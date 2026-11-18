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
    var o = { pause: pause, journal: G.ui.journal, map: G.ui.map, look: G.ui.look, controls: G.ui.controls, milestones: G.ui.milestones, title: G.ui.title }[name] || null; // milestones: Phase 94.1; title: Phase 130
    if (!o) return false;
    cur = o; curName = name;
    if (G.ui.tips) G.ui.tips.opened(name); // the journal / chart tip is done when the page opens (the scene does not step under a menu)
    o.open(arg);
    G.ui.panel.kick(); // Phase 131: the panel rolls in
    return true;
  }

  function mapAllowed() { return G.core.state.sceneName() === 'sailing' && G.state.run.fsm === 'sailing'; }

  // Called each step before the scene. Returns true when an overlay has the step (the scene
  // must not update), false to let the scene run.
  function update(dt) {
    var inp = G.core.input, scene = G.core.state.sceneName();
    if (cur) {
      var was = cur;
      if (!cur.update(dt) && cur === was) { cur = null; curName = ''; if (G.ui.title && G.ui.title.returned()) open('title', 'back'); } // Phase 134: a page opened from the tape returns to it
      return true;
    }
    if (scene === 'gallery') return false;
    if (inp.pressed('pause') || (scene === 'sailing' && inp.pressed('back') && !G.ui.setup.isOpen() && !(G.ui.dock && G.ui.dock.busy()))) return open('pause'); // Esc closes the setup panel (Phase 45) and the pier's (Phase 67)
    if (inp.pressed('journal')) return open('journal');
    if (inp.pressed('map') && mapAllowed()) return open('map');
    return false;
  }

  // The world waits while a menu is open, so it is drawn as a paused tape behind it (the title has its own tape).
  function draw(ctx) {
    if (!cur) return;
    if (curName !== 'title') { G.ui.panel.paused(ctx); G.core.view.begin(ctx, !!cur.native); }
    cur.draw(ctx);
  }

  // ---- Pause menu ------------------------------------------------------------------------

  // Phase 47: 'Fisher & dog' opens the picker (G.ui.look), which comes back here on close.
  // Phase 59.3: 'Full screen' joins the list in touch mode where the browser has it (not on
  // an iPhone, not from the home screen). Phase 88: 'Tips' (the first-time tips on or off) and
  // 'Controls' (the controls page). Phase 90: 'Text size' (normal or large: the UI layer).
  // The panel grows a row for each, and on a short screen shows a window of the rows, scrolled
  // to the chosen one, with marks for more above and below.
  // Phase 91.3: 'Vibration' in touch mode. A page's list keeps the rows that apply here.
  // Phase 92: Music, World and Effects under the master Volume; Reduce flashes, Reduce motion and Reel (hold or toggle).
  // Phase 132 (PLAN_UX.md): a VCR's MENU in pages instead of one long list. MENU holds the
  // places to go; SETTINGS holds every switch and slider under quiet headings ('#' rows, never
  // chosen); SAVE TAPE holds export and import. Back (Esc) on a page returns to MENU.
  var PAGES = {
    menu: { title: 'MENU', rows: ['Resume', 'Journal', 'Chart', 'Milestones', 'Fisher & dog', 'Settings', 'Controls', 'Save tape'] },
    settings: { title: 'SETTINGS', rows: ['#SOUND', 'Volume', 'Music', 'World', 'Effects', 'Sound', 'Dog barks', '#PLAY', 'Reel', 'Tips', 'Key hints', '#SCREEN', 'Text size', 'Tape look', 'Reduce flashes', 'Reduce motion', 'Full screen', 'Vibration'] },
    save: { title: 'SAVE TAPE', rows: ['Export save', 'Import save'] }
  };
  var PAGE_OF = { Settings: 'settings', 'Save tape': 'save' };
  var page = 'menu', solo = false, nextTxt = '';
  var SLIDER = { Volume: 'volume', Music: 'music', World: 'world', Effects: 'effects' };
  var ITEMS = [];
  function head(r) { return r && r.charAt(0) === '#'; }
  function buildItems() {
    var D = G.core.device, fs = D && D.canFullscreen(), t = D && D.touch(), rows = PAGES[page].rows;
    ITEMS.length = 0;
    for (var i = 0; i < rows.length; i++) if ((rows[i] !== 'Full screen' || fs) && (rows[i] !== 'Vibration' || t)) ITEMS.push(rows[i]);
  }
  function pageOf(row) { for (var k in PAGES) if (PAGES[k].rows.indexOf(row) >= 0) return k; return 'menu'; }
  // Moves sel by d (±1) to the next row that is not a heading, wrapping.
  function stepSel(d) { var n = ITEMS.length; for (var k = 0; k < n; k++) { sel = (sel + d + n) % n; if (!head(ITEMS[sel])) return; } }
  function goPage(name, at) {
    page = name; layoutPause(); TOP = 0;
    sel = Math.max(0, ITEMS.indexOf(at)); if (head(ITEMS[sel])) stepSel(1);
    say(''); scrollTo(); G.ui.panel.kick();
  }
  // Phase 46: the panel's bounds (at the right edge), where the values and the message sit.
  var PW = 176, PRECT = G.ui.panel.place(PW, 140, 'right', [0, 0, PW, 140]), VAL_X = 110, MSG_Y = 103, RH = 12, SHOW = 7, TOP = 0, lv = -1, openT = 0;
  function layoutPause() {
    var U = G.ui.panel;
    buildItems();
    RH = U.rowH();
    var foot = U.touch() ? U.PAD : U.KEY_H + U.PAD, fixed = U.TAB + U.PAD + 3 * U.ROW + foot + 1; // Phase 138: three lines at the foot
    SHOW = Math.max(3, Math.min(ITEMS.length, Math.floor((U.pic()[3] - 2 * U.MARGIN - fixed) / RH)));
    var h = fixed + SHOW * RH;
    U.place(PW, h, 'right', PRECT); PRECT[2] = PW; PRECT[3] = h; MSG_Y = U.TAB + U.PAD + SHOW * RH + 1;
    lv = U.ver();
  }
  // Phase 138: TAPE  3 FISH  +87c  26 cm (the longest), rebuilt when the card's tape changes; '' before a fish.
  var tapeTxt = '', tapeVer = -1;
  function tape() {
    var T = G.ui.card.tape();
    if (!T.fish) return '';
    if (T.ver !== tapeVer) { tapeVer = T.ver; tapeTxt = 'TAPE  ' + T.fish + ' FISH  +' + T.coins + 'c  ' + Math.round(T.best) + ' cm'; } // the best length, whole cm, to fit the panel
    return tapeTxt;
  }
  // Phase 132: PLAY, the clock and the water, as a VCR's status line; rebuilt only when they change.
  var stTxt = '', stMin = -1, stLoc = '';
  function status() {
    var save = G.state.save, run = G.state.run, m = Math.floor(G.sim.clock.wrap(save.clock || 0) * 60), loc = (run && run.loc) || save.loc || '';
    if (m !== stMin || loc !== stLoc) {
      stMin = m; stLoc = loc;
      var L = G.data.locations[loc];
      stTxt = 'PLAY  ' + G.ui.hud.clockText(save.clock || 0) + '  ' + (L ? L.name.toUpperCase() : '');
    }
    return stTxt;
  }
  function scrollTo() { if (sel < TOP) TOP = sel; if (sel >= TOP + SHOW) TOP = sel - SHOW + 1; if (TOP > ITEMS.length - SHOW) TOP = Math.max(0, ITEMS.length - SHOW); }
  function fullscreen() { var D = G.core.device; G.state.save.settings.fullscreen = !D.isFullscreen(); D.setFullscreen(G.state.save.settings.fullscreen); dirty = true; }
  var reminded = 0, sel = 0, msg = '', msgLines = [], msgKey = 'fog_light', dirty = false, lastExport = '';

  // Volume as tenths so the shown bar and the stored value always agree.
  function volume(d, key) {
    var st = G.state.save.settings, k = key || 'volume', cur = typeof st[k] === 'number' ? st[k] : 1, v = Math.round(cur * 10) + d;
    st[k] = (v < 0 ? 0 : (v > 10 ? 10 : v)) / 10;
    dirty = true;
  }
  function sliderLevel(row) { var st = G.state.save.settings, k = SLIDER[row], v = typeof st[k] === 'number' ? st[k] : 1; return st.mute ? 0 : Math.round(v * 10); }
  function flip(k) { var st = G.state.save.settings; st[k] = !st[k]; dirty = true; }
  function reelMode() { var st = G.state.save.settings; st.reel = st.reel === 'toggle' ? 'hold' : 'toggle'; dirty = true; }

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
  // Phase 129: the key hints and the cabin's heading, the first time only (off) or always (on).
  function hints() { var st = G.state.save.settings; st.hints = !st.hints; dirty = true; }
  function vibration() { var st = G.state.save.settings; st.vibration = st.vibration === false; dirty = true; if (st.vibration) G.core.device.buzz('bite'); }

  // 91.2: once a week, while the browser has not promised to keep the save and there is a save
  // worth keeping (a fish caught), the pause list opens on Export save with a line saying why.
  var WEEK = 7 * 24 * 3600 * 1000;
  function remindDue() {
    var s = G.state.save, f = s.flags || {}, n = 0;
    if (G.core.device.persisted() === true || G.core.save.tour()) return false;
    for (var k in s.journal) n += s.journal[k].caught || 0;
    if (n > 0 && !f.exportAt && !f.remindAt && s.flags) { s.flags.remindAt = Date.now(); return false; } // Phase 135: the week starts at the first fish, not in 1970
    return n > 0 && Date.now() - Math.max(f.exportAt || 0, f.remindAt || 0) > WEEK;
  }

  var pause = {
    open: function (at) {
      solo = at === '@settings'; if (solo) at = 'Volume'; // Phase 134: SETTINGS alone, from the tape: Back closes it
      var nx = G.ui.milestones.next(G.state.run && G.state.run.loc); nextTxt = '';
      if (nx.id) { var lab = nx.label, tail = '  ' + nx.a + '/' + nx.b, room = PW - 2 * G.ui.panel.PAD - 12; while (lab.length > 4 && S.fine.measure('NEXT  ' + lab + tail) > room) lab = lab.slice(0, -1); nextTxt = 'NEXT  ' + (lab !== nx.label ? lab.replace(/\s+$/, '') + '.' : lab) + tail; } // Phase 135
      page = pageOf(at); layoutPause(); sel = Math.max(0, ITEMS.indexOf(at)); TOP = 0; say(''); dirty = false; openT = G.ui.panel.now();
      if (!at && remindDue()) { G.state.save.flags.remindAt = Date.now(); dirty = true; page = 'save'; layoutPause(); sel = ITEMS.indexOf('Export save'); reminded++; say('This browser may clear the save. Export a copy to keep it.', 'signal_amber'); }
      scrollTo();
    },
    update: function () {
      var inp = G.core.input, st = G.state.save.settings, was = sel;
      if (lv !== G.ui.panel.ver()) { layoutPause(); scrollTo(); }
      if (inp.pressed('back') && page !== 'menu' && !solo) { var from = page === 'settings' ? 'Settings' : 'Save tape'; G.audio.engine.play('uiMove'); goPage('menu', from); return true; }
      if (inp.pressed('pause') || inp.pressed('back')) { pause.close(); return false; }
      var dv = axis('up', 'down'); if (dv) stepSel(dv);
      if (sel !== was) { scrollTo(); G.audio.engine.play('uiMove'); }
      var lr = axis('left', 'right');
      if (SLIDER[ITEMS[sel]] && lr) volume(lr, SLIDER[ITEMS[sel]]);
      if (ITEMS[sel] === 'Reduce flashes' && lr) flip('reduceFlashes');
      if (ITEMS[sel] === 'Tape look' && lr) flip('tapeLook'); // Phase 140
      if (ITEMS[sel] === 'Reduce motion' && lr) flip('reduceMotion');
      if (ITEMS[sel] === 'Reel' && lr) reelMode();
      if (ITEMS[sel] === 'Sound' && lr) { st.mute = !st.mute; dirty = true; }
      if (ITEMS[sel] === 'Dog barks' && lr) { st.dogBark = !st.dogBark; dirty = true; }
      if (ITEMS[sel] === 'Full screen' && lr) fullscreen();
      if (ITEMS[sel] === 'Text size' && lr) textSize();
      if (ITEMS[sel] === 'Tips' && lr) tips();
      if (ITEMS[sel] === 'Key hints' && lr) hints();
      if (ITEMS[sel] === 'Vibration' && lr) vibration();
      if (!inp.pressed('action')) return true;
      G.audio.engine.play('uiOk');
      switch (ITEMS[sel]) {
        case 'Resume': pause.close(); return false;
        case 'Journal': pause.close(); open('journal'); return true; // Phase 132
        case 'Chart': if (mapAllowed()) { pause.close(); open('map'); return true; } say('Reel in first.', 'signal_amber'); break;
        case 'Settings': case 'Save tape': goPage(PAGE_OF[ITEMS[sel]]); break;
        case 'Sound': st.mute = !st.mute; dirty = true; break;
        case 'Dog barks': st.dogBark = !st.dogBark; dirty = true; break; // Phase 42
        case 'Full screen': fullscreen(); break; // Phase 59.3
        case 'Text size': textSize(); break; // Phase 90
        case 'Tips': tips(); break; // Phase 88
        case 'Key hints': hints(); break; // Phase 129
        case 'Vibration': vibration(); break; // Phase 91.3
        case 'Reduce flashes': flip('reduceFlashes'); break; // Phase 92.2
        case 'Tape look': flip('tapeLook'); break; // Phase 140
        case 'Reduce motion': flip('reduceMotion'); break;
        case 'Reel': reelMode(); break;
        case 'Controls': pause.close(); open('controls'); return true; // Phase 88.5
        case 'Milestones': pause.close(); open('milestones', 'pause'); return true; // Phase 94.1
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
      if (k < 0 || k >= SHOW || i >= ITEMS.length || gx < X + 3 || gx >= X + W - 3 || head(ITEMS[i])) return 'none';
      if (i !== sel) { sel = i; say(''); G.audio.engine.play('uiMove'); return 'none'; }
      if (SLIDER[ITEMS[i]]) {
        if (gx < X + VAL_X - 4) return 'none';
        var level = sliderLevel(ITEMS[i]);
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
      U.frame(ctx, X, Y, W, PRECT[3], PAGES[page].title);
      for (var k = 0; k < SHOW && TOP + k < ITEMS.length; k++) {
        i = TOP + k;
        var y = U.top(Y) + k * RH + ((RH - U.ROW) >> 1), on = i === sel, key = on ? 'signal_amber' : 'fog_light';
        if (head(ITEMS[i])) { // Phase 132: a quiet heading with a rule after it
          var hw = F.measure(ITEMS[i].slice(1));
          F.drawText(ctx, ITEMS[i].slice(1), U.left(X) + 2, y, 'fog_mid');
          ctx.fillStyle = P.fog_dark; ctx.fillRect(U.left(X) + hw + 6, y + 3, W - 2 * U.PAD - hw - 8, 1);
          continue;
        }
        if (on) U.row(ctx, X + 3, y, W - 6, RH, true);
        else if (U.hot([X + 3, y - 2 - ((RH - U.ROW) >> 1), W - 6, RH])) { ctx.fillStyle = P.night_deep; ctx.fillRect(X + 3, y - 2 - ((RH - U.ROW) >> 1), W - 6, RH - 1); } // 90.5: hover
        F.drawText(ctx, ITEMS[i], U.left(X) + 6, y, key);
        if (k === 0 && TOP > 0) F.drawText(ctx, '^', X + W - U.PAD - 6, y, 'fog_mid');
        if (k === SHOW - 1 && TOP + SHOW < ITEMS.length) F.drawText(ctx, 'v', X + W - U.PAD - 6, y, 'fog_mid');
        if (SLIDER[ITEMS[i]]) {
          var lvl = sliderLevel(ITEMS[i]);
          for (var t = 0; t < 10; t++) {
            ctx.fillStyle = P[t < lvl ? key : 'fog_dark'];
            ctx.fillRect(X + VAL_X + t * 5, y + 1, 3, 6);
          }
        } else if (ITEMS[i] === 'Sound') F.drawText(ctx, st.mute ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Dog barks') F.drawText(ctx, st.dogBark === false ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Full screen') F.drawText(ctx, G.core.device.isFullscreen() ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Text size') F.drawText(ctx, st.textSize === 'large' ? 'large' : 'normal', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Tips') F.drawText(ctx, st.tips === false ? 'off' : 'on', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Key hints') F.drawText(ctx, st.hints ? 'always' : 'first time', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Tape look') F.drawText(ctx, st.tapeLook ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Reduce flashes') F.drawText(ctx, st.reduceFlashes ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Reduce motion') F.drawText(ctx, st.reduceMotion ? 'on' : 'off', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Reel') F.drawText(ctx, st.reel === 'toggle' ? 'tap on/off' : 'hold', X + VAL_X, y, key);
        else if (ITEMS[i] === 'Vibration') F.drawText(ctx, st.vibration === false ? 'off' : (G.core.device.canVibrate() ? 'on' : 'on (none here)'), X + VAL_X, y, key);
        else if ((ITEMS[i] === 'Fisher & dog' || ITEMS[i] === 'Controls' || ITEMS[i] === 'Milestones' || ITEMS[i] === 'Journal' || ITEMS[i] === 'Chart' || PAGE_OF[ITEMS[i]]) && !(k === SHOW - 1 && TOP + SHOW < ITEMS.length)) F.drawText(ctx, '>', X + W - U.PAD - 6, y, key);
      }
      for (i = 0; i < msgLines.length && i < 2; i++) F.drawText(ctx, msgLines[i], U.left(X), Y + MSG_Y + i * U.ROW, msgKey);
      if (!msgLines.length) { // Phase 132: the VCR's status line
        U.play(ctx, U.left(X) + 2, Y + MSG_Y + 2, 'neon_teal');
        F.drawText(ctx, status(), U.left(X) + 9, Y + MSG_Y + 2, 'fog_mid');
        if (page === 'menu' && tape()) F.drawText(ctx, tapeTxt, U.left(X) + 9, Y + MSG_Y + 2 + U.ROW, 'bone'); // Phase 138: this sitting's tape
        if (page === 'menu' && nextTxt) F.drawText(ctx, nextTxt, U.left(X) + 9, Y + MSG_Y + 2 + (tape() ? 2 : 1) * U.ROW, 'neon_teal'); // Phase 135: the goal to chase
      }
      x = U.left(X);
      if (page !== 'menu') x += U.hint(ctx, 'ESC', 'back', x, Y + PRECT[3] - U.PAD - U.KEY_H);
      if (page !== 'settings') x += U.hint(ctx, 'W/S', 'choose', x, Y + PRECT[3] - U.PAD - U.KEY_H); // three hints do not fit the panel
      if (page === 'settings') U.hint(ctx, 'A/D', 'change', x, Y + PRECT[3] - U.PAD - U.KEY_H);
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
