var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The small panel (Phase 46, PLAN_TACKLE.md 2.7): the one frame the catch card, the pause
// list, the tape, the map's place card and the shop's item window share. A small rounded
// rectangle in night_ink with a one-pixel paper rim and a title tab on its top edge, drawn in
// the 640×360 view's pixels with the fine font, never over a dimmed world. A panel's bounds
// (x, y, w, h) include its tab: the tab takes the top TAB rows, the body the rest. At most
// MAX_W × MAX_H, anchored to a corner or the top of the screen (place). Drawing only: the
// callers lay their panels out when they open, and draw() reads that.
// Phase 90 (PLAN_PLAYABILITY.md): the UI layer. On a PC at the normal text size nothing changes:
// the panels draw on the game canvas in its 640×360 pixels, exactly as before. On a phone
// (touch mode), or on a PC with Text size: large, they draw on a second canvas over the whole
// screen (the black margins too) whose pixel is a whole number of device pixels, chosen so the
// fine font's capitals are at least 9 CSS px tall (6.6 on an iPhone before). Its space is
// VW × VH UI px; the picture sits in it at PX, PY, PW × PH, and panels are placed on the picture
// (place). begin(ctx) gives the context to draw a panel on; ux/uy turn a game pixel into a UI
// pixel, so the panels' taps (which input.js still sends in game px) find their rows.
G.ui = G.ui || {};
G.ui.panel = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine;
  var TAB = 13, PAD = 6, ROW = 12, KEY_H = 11, MARGIN = 8, MAX_W = 240, MAX_H = 140;
  var CAPS_CSS = 9, ROW_CSS = 28, BTN_CSS = 44;   // touch: the capitals' least CSS px, a tappable row's, a button's
  var L = { on: false, touch: false, large: false, cv: null, ctx: null, css: 1, k: 1, VW: 640, VH: 360, PX: 0, PY: 0, PW: 640, PH: 360,
    gameCss: 1, gameLeft: 0, gameTop: 0, insL: 0, insR: 0, ver: 0, shown: false, mx: -1, my: -1, now: 0 };

  // Called by G.core.device.fit with the page's measures: o = {touch, large, compact, dpr, vw,
  // vh, left, top, cssW, cssH, gameCss}. Rebuilds the layer when anything changed (ver bumps).
  function configure(o) {
    var on = !o.compact && (o.touch || o.large), k = 1;
    if (on) {
      k = o.touch ? Math.ceil(CAPS_CSS / 7 * o.dpr) : Math.round(1.5 * o.gameCss * o.dpr);
      if (o.touch && o.large) k++;
      k = Math.max(k, 1);
    }
    var css = on ? k / o.dpr : o.gameCss;
    var VW = on ? Math.floor(o.vw / css) : 640, VH = on ? Math.floor(o.vh / css) : 360;
    var PX = on ? Math.round(o.left / css) : 0, PY = on ? Math.round(o.top / css) : 0;
    var PW = on ? Math.round(o.cssW / css) : 640, PH = on ? Math.round(o.cssH / css) : 360;
    var same = on === L.on && k === L.k && VW === L.VW && VH === L.VH && PX === L.PX && PY === L.PY && PW === L.PW && PH === L.PH && o.touch === L.touch;
    L.gameCss = o.gameCss; L.gameLeft = o.left; L.gameTop = o.top; L.touch = !!o.touch; L.large = !!o.large;
    L.insL = on ? Math.ceil((o.insL || 0) / css) : 0; L.insR = on ? Math.ceil((o.insR || 0) / css) : 0; // the notch's side, in UI px
    if (same) return;
    L.on = on; L.k = k; L.css = css; L.VW = VW; L.VH = VH; L.PX = PX; L.PY = PY; L.PW = PW; L.PH = PH; L.ver++;
    if (on) {
      if (!L.cv) {
        L.cv = document.createElement('canvas'); L.cv.id = 'ui';
        L.cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;image-rendering:crisp-edges;image-rendering:pixelated;';
        document.body.appendChild(L.cv);
        L.ctx = L.cv.getContext('2d');
      }
      L.cv.width = VW; L.cv.height = VH;
      L.cv.style.width = VW * css + 'px'; L.cv.style.height = VH * css + 'px';
      L.cv.style.display = '';
      L.ctx.imageSmoothingEnabled = false;
    } else if (L.cv) L.cv.style.display = 'none';
  }

  // Once a frame before anything draws: the layer starts clear.
  function frameStart() { if (L.on && L.ctx) { L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, L.VW, L.VH); } }
  // The context a panel draws on, its transform reset: the layer, or the game canvas in its own pixels.
  function begin(ctx) {
    if (!L.on || !L.ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); return ctx; }
    L.ctx.setTransform(1, 0, 0, 1, 0, 0);
    return L.ctx;
  }
  // A game pixel as a UI pixel (and back); identity while the layer is off.
  function ux(gx) { return L.on ? (gx * L.gameCss + L.gameLeft) / L.css : gx; }
  function uy(gy) { return L.on ? (gy * L.gameCss + L.gameTop) / L.css : gy; }
  function gx(u) { return L.on ? (u * L.css - L.gameLeft) / L.gameCss : u; }
  function gy(u) { return L.on ? (u * L.css - L.gameTop) / L.gameCss : u; }
  // UI px from CSS px (sizes for thumbs), never under lo.
  function fromCss(css, lo) { return Math.max(lo || 0, Math.ceil(css / L.css)); }
  // A tappable list's row and a button's height: taller for a thumb in touch mode.
  function rowH() { return L.touch && L.on ? Math.max(ROW, fromCss(ROW_CSS)) : ROW; }
  function btnH() { return L.touch && L.on ? Math.max(KEY_H, fromCss(BTN_CSS)) : KEY_H; }

  // The top-left of a w × h panel at an anchor: 'top', 'tl', 'tr', 'bl', 'br' or 'right'
  // (the right edge, centred down it), on the picture. Writes out[0], out[1] and returns out.
  function place(w, h, anchor, out) {
    var X0 = L.PX, Y0 = L.PY, W = L.PW, H = L.PH;
    if (w > W - 2 * MARGIN) { X0 = 0; W = L.VW; }                                   // wider than the picture: on the screen
    if (h > H - 2 * MARGIN) { Y0 = 0; H = L.VH; }
    var x = X0 + ((W - w) >> 1), y = Y0 + MARGIN;
    if (anchor === 'tl' || anchor === 'bl') x = X0 + MARGIN;
    if (anchor === 'tr' || anchor === 'br' || anchor === 'right') x = X0 + W - MARGIN - w;
    if (anchor === 'bl' || anchor === 'br') y = Y0 + H - MARGIN - h;
    if (anchor === 'right') y = Y0 + ((H - h) >> 1);
    out[0] = Math.max(0, x); out[1] = Math.max(0, y);
    return out;
  }

  // 90.5: the UI's own clock (stepped from the boot loop's update, never from a draw), for
  // panels that fade in: a panel records now() when it opens and draws at fadeIn(that).
  function step(dt) { L.now += dt; }
  function now() { return L.now; }
  var FADE = 0.12;
  // Phase 92.2: nothing fades or slides under Reduce motion.
  function fadeIn(t0) { var st = G.state && G.state.save && G.state.save.settings; if (st && st.reduceMotion) return 1; var u = (L.now - t0) / FADE; return u >= 1 ? 1 : (u <= 0 ? 0 : u * (2 - u)); }
  // 90.5: where the mouse is, in UI px (hover); -1 when it has left.
  function pointer(x, y) { L.mx = x; L.my = y; }
  function hot(r) { return L.mx >= 0 && inside(r, L.mx, L.my); }

  // A filled rectangle with its corner pixels cut (a 1 px rounding), the rim in rim and the
  // inside in fill. open: leave the top rim out between x0 and x1 (where the tab joins).
  function round(ctx, x, y, w, h, rim, fill, x0, x1) {
    ctx.fillStyle = P[rim];
    if (x0 === undefined) ctx.fillRect(x + 2, y, w - 4, 1);
    else { ctx.fillRect(x + 2, y, x0 - x - 2, 1); ctx.fillRect(x1, y, x + w - 2 - x1, 1); }
    ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
    ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    ctx.fillStyle = P[fill];
    ctx.fillRect(x + 2, y + 1, w - 4, h - 2); ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
  }

  // The frame: the body, the tab with title in it at the top left (none when title is ''),
  // and aside, a short word (a count, a price, NEW!) in asideKey on a second tab at the top
  // right (none when ''). Neither tab takes room from the body.
  function frame(ctx, x, y, w, h, title, aside, asideKey) {
    var tw = title ? F.measureBold(title) + 12 : 0, tx = x + PAD;
    var aw = aside ? F.measureBold(aside) + 12 : 0, ax = x + w - PAD - aw;
    if (title) round(ctx, tx, y, tw, TAB + 3, 'paper', 'night_ink');
    if (aside) round(ctx, ax, y, aw, TAB + 3, 'paper', 'night_ink');
    round(ctx, x, y + TAB, w, h - TAB, 'paper', 'night_ink');
    ctx.fillStyle = P.night_ink;                                                   // the tabs open into the body
    if (title) ctx.fillRect(tx + 1, y + TAB, tw - 2, 3);
    if (aside) ctx.fillRect(ax + 1, y + TAB, aw - 2, 3);
    if (title) F.bold(ctx, title, tx + 6, y + 3, 'bone');
    if (aside) F.bold(ctx, aside, ax + 6, y + 3, asideKey || 'fog_light');
  }
  // Where an aside's text starts (for an icon drawn before it).
  function asideX(x, w, aside) { return x + w - PAD - F.measureBold(aside) - 6; }

  // Where a panel's content starts: below the tab, inside the padding.
  function top(y) { return y + TAB + PAD; }
  function left(x) { return x + PAD; }

  // A key cap with label in it; on lights it. Returns its width.
  function key(ctx, label, x, y, on) {
    var w = F.measure(label) + 6;
    round(ctx, x, y, w, KEY_H, on ? 'signal_amber' : 'fog_mid', on ? 'rust_dark' : 'night_deep');
    F.drawText(ctx, label, x + 3, y + 2, on ? 'signal_amber' : 'fog_light');
    return w;
  }
  function keyW(label) { return F.measure(label) + 6; }

  // 90.5: the one button (PLAN_PLAYABILITY.md §7): a rounded key with a verb, w × h, its label
  // in the bold title weight, centred. state: 0 idle, 1 chosen (or hovered), 2 pressed (1 px
  // down), 3 disabled (half contrast). Used where a thumb or a click picks it.
  var BTN_RIM = ['fog_mid', 'signal_amber', 'signal_amber', 'fog_dark'], BTN_FILL = ['night_deep', 'rust_dark', 'rust_dark', 'night_ink'], BTN_TXT = ['bone', 'signal_amber', 'signal_amber', 'fog_dark'];
  function button(ctx, label, x, y, w, h, state) {
    var d = state === 2 ? 1 : 0;
    if (state !== 2) { ctx.fillStyle = P.ink; ctx.fillRect(x + 2, y + h, w - 4, 1); }   // a 1 px shadow under it
    round(ctx, x, y + d, w, h, BTN_RIM[state], BTN_FILL[state]);
    if (state === 1) { ctx.fillStyle = P.signal_amber; ctx.fillRect(x + 2, y + d + 1, w - 4, 1); } // the chosen one's lit top edge
    F.bold(ctx, label, x + ((w - F.measureBold(label)) >> 1), y + d + ((h - F.FONT_H) >> 1), BTN_TXT[state]);
  }
  function buttonW(label) { return F.measureBold(label) + 16; }

  // 8.4 #36: on a phone (touch mode) a hint names what you touch, not a keyboard key: SPACE
  // is TAP (a row, the box, the hint itself), the arrow-key hints are left out (rows are
  // tapped instead), and J, M and S as "close" are the on-screen ESC. Constant strings; ''
  // drops the hint. hint() and hintW() both read it, so the panels' taps (Phase 59) that
  // measure hints by hintW() land where the hints are drawn.
  var TOUCH_KEYS = { 'SPACE': 'TAP', 'W/S': '', 'A/D': '', 'W/S A/D': 'TAP', 'J': 'ESC', 'M': 'ESC', 'S': 'ESC' };
  function shown(label) {
    if (!G.core.device || !G.core.device.touch()) return label;
    var t = TOUCH_KEYS[label];
    return t === undefined ? label : t;
  }

  // A key hint: the key's cap, then what it does. Returns the width used (with a gap after).
  function hint(ctx, label, does, x, y) {
    label = shown(label);
    if (!label) return 0;
    var w = key(ctx, label, x, y, false);
    F.drawText(ctx, does, x + w + 3, y + 2, 'fog_mid');
    return w + 3 + F.measure(does) + 8;
  }
  function hintW(label, does) { label = shown(label); return label ? keyW(label) + 3 + F.measure(does) + 8 : 0; }

  // The bar under a chosen row of a list (y is the text's top); h: the row's height (ROW).
  // 90.5: the selection is never colour alone: a lit edge bar (2 px) on its left.
  function row(ctx, x, y, w, h) {
    var rh = h || ROW, top = y - 2 - ((rh - ROW) >> 1);
    ctx.fillStyle = P.rust_dark; ctx.fillRect(x, top, w, rh - 1);
    ctx.fillStyle = P.signal_amber; ctx.fillRect(x, top, 2, rh - 1);
  }

  // True when the point (gx, gy) is inside the rectangle r = [x, y, w, h].
  function inside(r, gx, gy) { return !!r && gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3]; }

  return {
    TAB: TAB, PAD: PAD, ROW: ROW, KEY_H: KEY_H, MARGIN: MARGIN, MAX_W: MAX_W, MAX_H: MAX_H,
    place: place, frame: frame, asideX: asideX, top: top, left: left, key: key, keyW: keyW, hint: hint, hintW: hintW, row: row, inside: inside,
    shown: shown, // 8.4 #36: the label a hint shows now ('' when it is left out)
    // Phase 90: the UI layer and the shared pieces of §7
    configure: configure, frameStart: frameStart, begin: begin, ux: ux, uy: uy, gx: gx, gy: gy, fromCss: fromCss, rowH: rowH, btnH: btnH,
    button: button, buttonW: buttonW, step: step, now: now, fadeIn: fadeIn, pointer: pointer, hot: hot,
    on: function () { return L.on; }, touch: function () { return L.touch && L.on; }, ver: function () { return L.ver; },
    VW: function () { return L.VW; }, VH: function () { return L.VH; }, pic: function () { return [L.PX, L.PY, L.PW, L.PH]; },
    css: function () { return L.css; }, textPx: function () { return +(7 * L.css).toFixed(2); },
    layer: L
  };
})();
