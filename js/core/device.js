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
  }

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
    fit();
  }

  // 57.3: the portrait notice, over the running game (input still goes through), in the
  // bitmap font at NOTICE_S× in the 640×360 view. Drawing only.
  function drawNotice(ctx) {
    if (!info.portrait || !G.ui || !G.ui.panel) return;
    var F = G.gfx.sprites.fine, Pn = G.ui.panel, s = NOTICE_S;
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
      fill: +info.fill.toFixed(3), fsAsked: info.fsAsked, fsResult: info.fsResult, lock: info.lock, fits: info.fits, audio: info.audio,
      // Phase 58: the touch layout's mode and the action button's word
      layout: G.core.input.layout().mode, word: G.ui && G.ui.hud ? G.ui.hud.word() : ''
    };
  }

  return {
    attach: attach, fit: fit, touch: touch, drawNotice: drawNotice, report: report,
    canFullscreen: canFullscreen, isFullscreen: isFullscreen, setFullscreen: setFullscreen,
    portrait: function () { return info.portrait; },
    scale: function () { return info.scale; },
    info: info
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var d = G.core.device.info;
  return 'device ' + (d.touch ? 'touch' : 'pc') + (d.portrait ? ' portrait' : '') + '  ' + d.vw + 'x' + d.vh + ' @' + d.dpr +
    '  scale ' + d.scale.toFixed(2) + (d.whole ? '' : ' (fractional)') + '  fill ' + Math.round(d.fill * 100) + '%' +
    (d.fsAsked ? '  fullscreen ' + d.fsResult : '') + (d.fullscreen ? ' (on)' : '');
});
