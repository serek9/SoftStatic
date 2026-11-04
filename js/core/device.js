var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The page on a phone (Phase 57, PLAN_MOBILE.md). Touch mode, the picture's fit inside the
// screen's safe area, full screen and the landscape lock, the portrait notice and dbg.device().
// Touch mode is on with a coarse pointer, or once a touch has been seen. Without it every
// behaviour here is the one the page had before (the whole-number fit, nothing requested).
G.core = G.core || {};
G.core.device = (function () {
  var FILL = 0.95;                  // 57.1: a whole-number scale is kept while it fills this much of the limiting side
  var NOTICE_S = 3;                 // 57.3: the portrait notice is drawn at 3× (0.6 CSS px a game px in portrait)
  var NOTICE_A = 'Turn your phone sideways', NOTICE_B = 'The lake is wide.';

  var canvas = null, W = 640, H = 360, probe = null;
  var coarse = false, touchSeen = false;
  var info = {
    touch: false, coarse: false, portrait: false, fullscreen: false, standalone: false,
    vw: 0, vh: 0, dpr: 1, insets: [0, 0, 0, 0], // top, right, bottom, left (CSS px)
    scale: 1, whole: true, cssW: 0, cssH: 0, fill: 0, left: 0, top: 0,
    fsAsked: 0, fsResult: '', lock: '', fits: 0, audio: '-'
  };

  function touch() { return coarse || touchSeen; }

  // 60.1: the phone's frame budget. Once a second, in touch mode with the page shown and the
  // game drawing (not another tab's idle notice), a frame rate under SLOW_FPS two seconds
  // running raises the level by one (to MAX_LEVEL); it never falls back within a visit, so
  // the picture does not flicker between levels. A PC stays at 0 whatever its frame rate.
  // dbg.budget(n) holds a level (null gives it back).
  var SLOW_FPS = 50, MAX_LEVEL = 2, level = 0, slow = 0, held = -1, raised = [];
  function apply() { var w = G.gfx && G.gfx.water; if (w && w.setBudget) w.setBudget(held >= 0 ? held : level); }
  function budgetTick() {
    if (held >= 0 || !touch() || document.hidden || (G.core.save && G.core.save.lost())) { slow = 0; return; }
    var fps = G.core.loop ? G.core.loop.stats.fps : 60;
    slow = fps > 0 && fps < SLOW_FPS ? slow + 1 : 0;
    if (slow >= 2 && level < MAX_LEVEL) { level++; slow = 0; raised.push(fps); apply(); if (G.core.debug) G.core.debug.log('phone budget ' + level + ' at ' + fps + ' fps'); }
  }
  function budget(n) {
    if (n !== undefined) { held = n === null ? -1 : Math.max(0, Math.min(MAX_LEVEL, n | 0)); apply(); }
    return { level: held >= 0 ? held : level, held: held >= 0, raisedAt: raised.slice() };
  }

  // The safe-area insets, read from a fixed probe whose padding is env(safe-area-inset-*).
  function insets(out) {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(probe);
    }
    var cs = getComputedStyle(probe);
    out[0] = parseFloat(cs.paddingTop) || 0; out[1] = parseFloat(cs.paddingRight) || 0;
    out[2] = parseFloat(cs.paddingBottom) || 0; out[3] = parseFloat(cs.paddingLeft) || 0;
    return out;
  }

  // 57.1: the fit. Not in touch mode: the largest whole-number scale in device pixels (below
  // 1× a fractional one), centred, exactly as index.html did before Phase 57. In touch mode,
  // inside the safe area, and fractional when the whole-number scale would leave over 5% empty.
  function fit() {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1, vw = window.innerWidth, vh = window.innerHeight, ins = info.insets;
    var t = touch();
    if (t) insets(ins); else { ins[0] = ins[1] = ins[2] = ins[3] = 0; }
    var aw = Math.max(1, vw - ins[1] - ins[3]), ah = Math.max(1, vh - ins[0] - ins[2]);
    var fitScale = Math.min(aw * dpr / W, ah * dpr / H);
    var scale = fitScale >= 1 ? Math.floor(fitScale) : fitScale;
    if (t && scale / fitScale < FILL) scale = fitScale;
    var cw = W * scale / dpr, ch = H * scale / dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    info.left = ins[3] + (aw - cw) / 2; info.top = ins[0] + (ah - ch) / 2;
    // Phase 90.3: on a phone wider than the picture, the margins hold the controls: the left
    // one the steering pad (it needs more), the right one the column of keys and the action
    // button, so the picture sits a little right of centre (60% of the spare width on the left).
    if (t && aw - cw > 24) info.left = ins[3] + Math.round((aw - cw) * MARGIN_L);
    info.left = Math.round(info.left * dpr) / dpr; info.top = Math.round(info.top * dpr) / dpr; // on whole device pixels
    canvas.style.left = info.left + 'px';
    canvas.style.top = info.top + 'px';
    var c2 = canvas.getContext('2d');
    if (c2) c2.imageSmoothingEnabled = false;

    info.touch = t; info.coarse = coarse; info.vw = vw; info.vh = vh; info.dpr = dpr;
    info.scale = scale / dpr; info.whole = scale === Math.floor(scale); info.cssW = cw; info.cssH = ch;
    info.fill = Math.max(cw / aw, ch / ah);
    info.portrait = t && vh > vw;
    info.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    info.fits++;
    // Phase 90.1: the UI layer, sized from the same measures.
    var st = G.state && G.state.save && G.state.save.settings;
    if (G.ui && G.ui.panel) G.ui.panel.configure({ touch: t, large: !!(st && st.textSize === 'large'), compact: !!G.core.compact || !!(G.core.state && G.core.state.sceneName && G.core.state.sceneName() === 'gallery'),
      dpr: dpr, vw: vw, vh: vh, insL: ins[3], insR: ins[1], left: info.left, top: info.top, cssW: cw, cssH: ch, gameCss: scale / dpr });
  }
  var MARGIN_L = 0.6;

  // 57.2: on the first tap in touch mode, full screen and a landscape lock, where the browser
  // allows them. Asked once per load: leaving full screen afterwards is the player's choice.
  function askFullscreen() {
    if (info.fsAsked || !touch() || info.standalone) return;
    var st = G.state && G.state.save && G.state.save.settings;
    if (st && st.fullscreen === false) { info.fsAsked = 1; info.fsResult = 'off in the pause list'; return; } // 59.3
    var el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    info.fsAsked = 1;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) { info.fsResult = req ? 'already' : 'unsupported'; return; }
    try {
      var p = req.call(el, { navigationUI: 'hide' });
      info.fsResult = 'asked';
      var lock = function () {
        var o = screen.orientation;
        if (!o || !o.lock) { info.lock = 'unsupported'; return; }
        try { o.lock('landscape').then(function () { info.lock = 'locked'; }, function () { info.lock = 'refused'; }); } catch (e) { info.lock = 'refused'; }
      };
      if (p && p.then) p.then(function () { info.fsResult = 'on'; lock(); }, function () { info.fsResult = 'refused'; });
      else lock();
    } catch (e) { info.fsResult = 'refused'; }
  }

  // 59.3: the pause list's Full screen row. Offered in touch mode where the browser has an
  // element full screen (not an iPhone's Safari, not from the home screen).
  function canFullscreen() {
    var el = document.documentElement;
    return touch() && !info.standalone && !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }
  function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  // Called from the step after a tap (Chrome's transient activation still holds then).
  function setFullscreen(on) {
    try {
      if (on && !isFullscreen()) { info.fsAsked = 0; askFullscreen(); }
      else if (!on && isFullscreen()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) { var p = ex.call(document); if (p && p.catch) p.catch(function () {}); } }
    } catch (e) {}
  }

  // 60.2: the home-screen icon, painted from palette keys on a 32×32 grid and scaled up whole:
  // a dusk sky (nothing above dusk_high), a moon, the pines, the water with the moon's path,
  // and the boat with the fisher and the dog. The gallery's notice page paints it here;
  // `node tools/icon.js` writes the same grid as icon-192.png and icon-512.png for the
  // manifest and the page's icon links (8.4 #37: Chrome installs only from an image file).
  var ICON = [
    // [key, x, y, w, h]
    ['night_blue', 0, 0, 32, 6], ['dusk_violet', 0, 6, 32, 5], ['dusk_plum', 0, 11, 32, 3], ['dusk_rose', 0, 14, 32, 2], ['dusk_amber', 0, 16, 32, 3],
    ['dusk_high', 22, 4, 3, 5], ['dusk_high', 21, 5, 5, 3],                                  // the moon
    ['pine_dark', 0, 15, 2, 5], ['pine_dark', 2, 13, 2, 7], ['pine_dark', 4, 16, 3, 4], ['pine_dark', 7, 14, 2, 6], ['pine_dark', 9, 17, 3, 3],
    ['pine_dark', 25, 16, 2, 4], ['pine_dark', 27, 13, 2, 7], ['pine_dark', 29, 15, 3, 5], ['pine_dark', 12, 18, 13, 2],
    ['water_dark', 0, 20, 32, 12], ['water_hi', 0, 20, 32, 1],
    ['dusk_amber', 21, 22, 5, 1], ['dusk_amber', 22, 24, 3, 1], ['dusk_amber', 21, 26, 4, 1], ['dusk_amber', 22, 28, 3, 1], // its path on the water
    ['wood_dark', 9, 19, 12, 2], ['wood', 10, 19, 10, 1],                                    // the boat
    ['coat', 12, 16, 2, 3], ['flesh', 12, 15, 2, 1], ['cap', 12, 14, 3, 1],                  // the fisher
    ['dog', 16, 17, 3, 2], ['dog_hi', 18, 16, 2, 1],                                         // the dog
    ['stone', 14, 11, 1, 6]                                                                  // the rod
  ];
  function paintIcon(px) {
    var P = G.gfx.sprites.PALETTE, s = Math.max(1, Math.floor(px / 32)), cv = document.createElement('canvas');
    cv.width = cv.height = 32 * s;
    var c = cv.getContext('2d');
    for (var i = 0; i < ICON.length; i++) { var r = ICON[i]; c.fillStyle = P[r[0]]; c.fillRect(r[1] * s, r[2] * s, r[3] * s, r[4] * s); }
    return cv;
  }

  function attach(cv, w, h) {
    canvas = cv; W = w; H = h;
    var mq = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    coarse = !!(mq && mq.matches);
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { coarse = mq.matches; fit(); });
    info.standalone = !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches));
    // The first touch turns touch mode on (a touch laptop has a fine pointer) and refits.
    window.addEventListener('touchstart', function () { if (!touchSeen) { touchSeen = true; fit(); } }, { capture: true, passive: true });
    // touchend is a user activation where touchstart is not (iOS), so full screen is asked here.
    window.addEventListener('touchend', askFullscreen, { capture: true, passive: true });
    var refit = function () { fit(); };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', refit);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);
    document.addEventListener('fullscreenchange', refit);
    document.addEventListener('webkitfullscreenchange', refit);
    setInterval(budgetTick, 1000); // 60.1
    fit();
  }

  // 57.3: the portrait notice, over the running game (input still goes through), in the
  // bitmap font at NOTICE_S× in the 640×360 view. Drawing only. force: drawn anyway (the gallery).
  function drawNotice(ctx, force) {
    if ((!info.portrait && !force) || !G.ui || !G.ui.panel) return;
    var F = G.gfx.sprites.fine, Pn = G.ui.panel, s = NOTICE_S;
    if (Pn.on() && !force) { // Phase 90: over the UI layer, at 2 UI px a pixel in the middle of the screen
      var c = Pn.begin(ctx), m0 = Pn.PAD + 2, w0 = Math.max(F.measureBold(NOTICE_A), F.measure(NOTICE_B)) + 2 * m0 + 2, h0 = Pn.TAB + 2 * m0 + 2 * F.LINE_H + 3;
      var k = Pn.VW() >= 2 * w0 + 16 ? 2 : 1;
      c.setTransform(k, 0, 0, k, Math.round((Pn.VW() - w0 * k) / 2), Math.round((Pn.VH() - h0 * k) / 2));
      Pn.frame(c, 0, 0, w0, h0, '');
      F.bold(c, NOTICE_A, m0, Pn.TAB + m0, 'bone');
      F.drawText(c, NOTICE_B, m0, Pn.TAB + m0 + F.LINE_H + 3, 'fog_light');
      c.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    // No title tab: the body starts TAB rows down, and the two lines sit evenly inside it.
    var m = Pn.PAD + 2, w = Math.max(F.measureBold(NOTICE_A), F.measure(NOTICE_B)) + 2 * m + 2, h = Pn.TAB + 2 * m + 2 * F.LINE_H + 3;
    var ox = Math.round((640 - w * s) / 2), oy = Math.round((360 - h * s) / 2);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    Pn.frame(ctx, 0, 0, w, h, '');
    F.bold(ctx, NOTICE_A, m, Pn.TAB + m, 'bone');
    F.drawText(ctx, NOTICE_B, m, Pn.TAB + m + F.LINE_H + 3, 'fog_light');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 57.5: what dbg.device() reports.
  function report() {
    var e = G.audio && G.audio.engine;
    info.audio = e && e.state ? e.state() : '-';
    info.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    return {
      touch: info.touch, coarse: info.coarse, portrait: info.portrait, fullscreen: info.fullscreen, standalone: info.standalone,
      viewport: [info.vw, info.vh], dpr: info.dpr, insets: info.insets.slice(),
      scale: +info.scale.toFixed(3), whole: info.whole, css: [+info.cssW.toFixed(1), +info.cssH.toFixed(1)], at: [+info.left.toFixed(1), +info.top.toFixed(1)],
      fill: +info.fill.toFixed(3), fsAsked: info.fsAsked, fsResult: info.fsResult, lock: info.lock, fits: info.fits, audio: info.audio, budget: held >= 0 ? held : level,
      // Phase 58: the touch layout's mode and the action button's word
      layout: G.core.input.layout().mode, word: G.ui && G.ui.hud ? G.ui.hud.word() : '',
      // Phase 90: the UI layer: on, its pixel in CSS px, the capitals' height in CSS px, its size
      ui: G.ui && G.ui.panel ? { on: G.ui.panel.on(), css: +G.ui.panel.css().toFixed(3), textPx: G.ui.panel.textPx(), size: [G.ui.panel.VW(), G.ui.panel.VH()], pic: G.ui.panel.pic() } : null
    };
  }

  return {
    attach: attach, fit: fit, touch: touch, drawNotice: drawNotice, report: report,
    canFullscreen: canFullscreen, isFullscreen: isFullscreen, setFullscreen: setFullscreen, budget: budget, paintIcon: paintIcon, ICON: ICON,
    portrait: function () { return info.portrait; },
    scale: function () { return info.scale; },
    info: info
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var d = G.core.device.info;
  return 'device ' + (d.touch ? 'touch' : 'pc') + (d.portrait ? ' portrait' : '') + '  ' + d.vw + 'x' + d.vh + ' @' + d.dpr +
    '  scale ' + d.scale.toFixed(2) + (d.whole ? '' : ' (fractional)') + '  fill ' + Math.round(d.fill * 100) + '%' +
    (d.fsAsked ? '  fullscreen ' + d.fsResult : '') + (d.fullscreen ? ' (on)' : '') + '  budget ' + G.core.device.budget().level;
});
