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
    gameCss: 1, gameLeft: 0, gameTop: 0, insL: 0, insR: 0, ver: 0, shown: false, mx: -1, my: -1, now: 0, kickT: -9 };

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
  function frameStart() { NR = 0; if (L.on && L.ctx) { L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, L.VW, L.VH); } }
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
  // Phase 131 (PLAN_UX.md): a VCR's on-screen display. The title is bold capitals with a play
  // mark and a one-pixel red/teal chroma split behind it; the body carries faint scanlines. All
  // from palette keys, drawn under whatever alpha the caller set (its fade).
  var PLAY_W = 6;                                                                  // the play mark and its gap
  function frame(ctx, x, y, w, h, title, aside, asideKey) {
    var tw = title ? F.measureBold(title) + 12 + PLAY_W : 0, tx = x + PAD;
    var aw = aside ? F.measureBold(aside) + 12 : 0, ax = x + w - PAD - aw;
    if (title) round(ctx, tx, y, tw, TAB + 3, 'paper', 'night_ink');
    if (aside) round(ctx, ax, y, aw, TAB + 3, 'paper', 'night_ink');
    round(ctx, x, y + TAB, w, h - TAB, 'paper', 'night_ink');
    ctx.fillStyle = P.night_ink;                                                   // the tabs open into the body
    if (title) ctx.fillRect(tx + 1, y + TAB, tw - 2, 3);
    if (aside) ctx.fillRect(ax + 1, y + TAB, aw - 2, 3);
    glass(ctx, x + 2, y + TAB + 2, w - 4, h - TAB - 4);
    if (NR < MAXR) { RC[NR] = ctx; RX[NR] = x; RY[NR] = y; RW[NR] = w; RH[NR] = h; RA[NR] = ctx.globalAlpha; NR++; } // the CRT pass (post) finds it
    if (title) {
      play(ctx, tx + 6, y + 4, 'signal_amber');
      osd(ctx, title, tx + 6 + PLAY_W, y + 3, 'bone');
    }
    if (aside) osd(ctx, aside, ax + 6, y + 3, asideKey || 'fog_light');
  }
  // kick() marks the moment a panel opens (the overlays call it on open); post() plays the CRT's
  // power-on from it.
  function kick() { L.kickT = L.now; if (G.audio && G.audio.engine) G.audio.engine.play('deck'); } // Phase 139: with the deck's key

  // ---- The CRT pass (the user's request, 2026-11-18: menus with a CRT / VHS feel) -------------
  // frame() records each panel it draws this frame (its context, bounds and alpha) in fixed
  // arrays; post(), called once after every panel has drawn, lays the tube over each one, on
  // top of its contents: scanlines through the text too, the tube's darker corners, a red/teal
  // fringe on the rims, a tracking band that drifts down shifting the rows it crosses a pixel or
  // two (the rows copied onto themselves, as a worn tape wobbles), a few specks of static, and
  // on open the power-on: the body opens from a pale line at its middle. Drawing only: the noise
  // is a hash of the UI clock (no RNG drawn from), nothing allocated. Under Reduce motion only
  // the still parts (scanlines, corners, fringe); under Reduce flashes the power-on line is dimmer.
  var MAXR = 16, NR = 0, RC = new Array(MAXR), RX = new Int16Array(MAXR), RY = new Int16Array(MAXR),
    RW = new Int16Array(MAXR), RH = new Int16Array(MAXR), RA = new Float32Array(MAXR);
  var ON_T = 0.24, BAND_T = 6.5, BAND_H = 5;
  function hash(i, k) { var h = (i * 374761393 + k * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function settings() { return G.state && G.state.save && G.state.save.settings; }
  // The lit glass under a panel's contents: every other row of the screen glows a dark CRT
  // teal, more so towards the middle, so the scanlines read between the lines of text.
  function glass(ctx, x, y, w, h) {
    var a = ctx.globalAlpha, k, r;
    ctx.fillStyle = P.crt_dark;
    ctx.globalAlpha = a * 0.5;
    for (r = 0; r < h; r += 2) ctx.fillRect(x, y + r, w, 1);
    for (k = 1; k <= 3; k++) {
      var m = k * Math.min(10, w >> 3, h >> 3);
      ctx.globalAlpha = a * 0.16;
      for (r = m; r < h - m; r += 2) ctx.fillRect(x + m, y + r, w - 2 * m, 1);
    }
    ctx.globalAlpha = a;
  }
  // The glow and colour fringe of a tube: the body copied onto a scratch canvas, multiplied by
  // red (and by teal), and added back a pixel to the left (and right), so light things on the
  // panel, the text above all, bleed red and teal at their edges and glow a little. Dark
  // things stay dark (multiply keeps them near black). The scratch canvas is made once.
  var scr = null, sctx = null;
  function fringe(ctx, bx, by, bw, bh, a) {
    if (!scr || scr.width < bw || scr.height < bh) {
      scr = G.gfx.bake.canvas(Math.max(bw, scr ? scr.width : 0, 640), Math.max(bh, scr ? scr.height : 0, 360));
      sctx = scr.getContext('2d'); sctx.imageSmoothingEnabled = false;
    }
    for (var c = 0; c < 2; c++) {
      sctx.globalCompositeOperation = 'copy'; sctx.globalAlpha = 1;
      sctx.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
      sctx.globalCompositeOperation = 'multiply'; sctx.fillStyle = c ? P.neon_teal : P.neon_red; sctx.fillRect(0, 0, bw, bh);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5;
      ctx.drawImage(scr, c ? 0 : 1, 0, bw - 1, bh, c ? bx + 1 : bx, by, bw - 1, bh); // red a pixel left, teal a pixel right
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  function post() {
    var st = settings(), still = !!(st && st.reduceMotion), dimLine = !!(st && st.reduceFlashes);
    var tick = Math.floor(L.now * 24), i, r, k;
    for (i = 0; i < NR; i++) {
      var ctx = RC[i], a = RA[i], x = RX[i], y = RY[i], w = RW[i], h = RH[i];
      var bx = x + 1, by = y + TAB + 1, bw = w - 2, bh = h - TAB - 2;
      if (bw < 8 || bh < 8) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // The tracking band: the rows it crosses slide sideways, under a faint pale wash.
      if (!still) {
        var u = ((L.now + i * 1.7) / BAND_T) % 1, ty = by + Math.floor(u * (bh + 2 * BAND_H)) - BAND_H;
        ctx.globalAlpha = 1;
        for (r = 0; r < BAND_H; r++) {
          var ry = ty + r; if (ry < by || ry >= by + bh) continue;
          var sh = Math.floor(hash(ry, tick) * 5) - 2; if (r === 0 || r === BAND_H - 1) sh = sh >> 1;
          if (sh) ctx.drawImage(ctx.canvas, sh > 0 ? bx : bx - sh, ry, bw - Math.abs(sh), 1, sh > 0 ? bx + sh : bx, ry, bw - Math.abs(sh), 1);
        }
        var t0 = Math.max(by, ty), t1 = Math.min(by + bh, ty + BAND_H);
        if (t1 > t0) {
          ctx.globalAlpha = a * 0.06; ctx.fillStyle = P.fog_light; ctx.fillRect(bx, t0, bw, t1 - t0);
          ctx.globalAlpha = a * 0.22;
          for (k = 0; k < 6; k++) { var dy = t0 + Math.floor(hash(k, tick + 7) * (t1 - t0)), dx = bx + Math.floor(hash(k + 9, tick) * bw), dl = 2 + Math.floor(hash(k, tick + 3) * 10); ctx.fillRect(dx, dy, Math.min(dl, bx + bw - dx), 1); }
        }
      }
      fringe(ctx, bx, by, bw, bh, a);
      // Scanlines through everything in the body, the text too.
      ctx.globalAlpha = a * 0.34; ctx.fillStyle = P.ink;
      for (r = 2; r < bh; r += 2) ctx.fillRect(bx, by + r, bw, 1); // the rows the glass leaves unlit
      // The tube: the rows at the top and bottom a touch darker, the corners darker still.
      ctx.globalAlpha = a * 0.16;
      ctx.fillRect(bx, by, bw, 2); ctx.fillRect(bx, by + bh - 2, bw, 2); ctx.fillRect(bx, by + 2, 2, bh - 4); ctx.fillRect(bx + bw - 2, by + 2, 2, bh - 4);
      for (k = 0; k < 4; k++) {
        var cl = 10 - k * 3; ctx.globalAlpha = a * 0.2;
        ctx.fillRect(bx, by + k, cl, 1); ctx.fillRect(bx + bw - cl, by + k, cl, 1);
        ctx.fillRect(bx, by + bh - 1 - k, cl, 1); ctx.fillRect(bx + bw - cl, by + bh - 1 - k, cl, 1);
      }
      // The fringe: the rims' red and teal ghosts, a pixel out.
      ctx.globalAlpha = a * 0.3;
      ctx.fillStyle = P.neon_red; ctx.fillRect(x - 1, y + TAB + 3, 1, h - TAB - 6);
      ctx.fillStyle = P.neon_teal; ctx.fillRect(x + w, y + TAB + 3, 1, h - TAB - 6);
      // Static: a few specks, anywhere in the body, new every 1/24 s.
      if (!still) {
        ctx.globalAlpha = a * 0.28; ctx.fillStyle = P.fog_light;
        for (k = 0; k < 5; k++) ctx.fillRect(bx + Math.floor(hash(k + i * 11, tick) * (bw - 2)), by + Math.floor(hash(k + 40, tick + i) * bh), 1 + (hash(k, tick) > 0.7 ? 1 : 0), 1);
      }
      // The power-on: the body dark but for a line that widens at its middle, then opens out from it.
      var p = (L.now - L.kickT) / ON_T;
      if (!still && p >= 0 && p < 1) {
        var cy = by + (bh >> 1), lw, oh;
        if (p < 0.3) { lw = Math.max(2, Math.floor(bw * p / 0.3)); oh = 0; } else { lw = bw; var q = (p - 0.3) / 0.7; oh = Math.floor(bh * q * (2 - q)); }
        var top = cy - (oh >> 1), bot = top + oh;
        ctx.globalAlpha = a; ctx.fillStyle = P.night_ink;
        if (top > by) ctx.fillRect(bx, by, bw, top - by);
        if (bot < by + bh) ctx.fillRect(bx, bot, bw, by + bh - bot);
        if (oh === 0) ctx.fillRect(bx, cy - 1, bw, 3);
        ctx.globalAlpha = a * (dimLine ? 0.25 : 0.55) * (1 - p); ctx.fillStyle = P.fog_light;
        ctx.fillRect(bx + ((bw - lw) >> 1), oh === 0 ? cy : top, lw, 1);
        if (oh > 0) ctx.fillRect(bx, bot - 1, bw, 1);
      }
      ctx.globalAlpha = 1;
      RC[i] = null;
    }
    NR = 0;
  }
  // Phase 140 (PLAN_UX.md): the Tape look, a setting (off by default): the whole picture as a tape
  // played back, faint scanlines and a soft vignette baked once into one layer, and one pale
  // tracking line drifting slowly down. One drawImage a frame; drawn over the scene only (the
  // panels have their own scanlines). Never brighter: ink over the picture, the line at 0.05.
  var tapeCv = null;
  function bakeTape() {
    return G.gfx.bake.layer(640, 360, function (c) {
      c.fillStyle = P.ink;
      c.globalAlpha = 0.14; for (var y = 1; y < 360; y += 2) c.fillRect(0, y, 640, 1);
      for (var k = 0; k < 14; k++) {                                                 // the vignette: nested frames, darker to the edge
        c.globalAlpha = 0.035 * (14 - k) / 14 + 0.01;
        var m = k * 3; c.fillRect(m, m, 640 - 2 * m, 3); c.fillRect(m, 360 - m - 3, 640 - 2 * m, 3); c.fillRect(m, m + 3, 3, 360 - 2 * m - 6); c.fillRect(640 - m - 3, m + 3, 3, 360 - 2 * m - 6);
      }
      c.globalAlpha = 1;
    });
  }
  function screen(ctx) {
    var st = G.state && G.state.save && G.state.save.settings;
    if (!st || !st.tapeLook) return;
    if (!tapeCv) tapeCv = bakeTape();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var sx = ctx.canvas.width / 640, sy = ctx.canvas.height / 360;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tapeCv, 0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!st.reduceMotion) { var ly = Math.floor((L.now * 14) % 420) - 30; ctx.globalAlpha = 0.05; ctx.fillStyle = P.fog_light; ctx.fillRect(0, ly * sy, ctx.canvas.width, 2 * sy); ctx.globalAlpha = 1; }
  }
  // The world behind an open menu, as a paused tape: the Tape look's scanlines and vignette (when
  // it is not on already), and a VCR's pause bar, a band of noise low in the picture that
  // wobbles a little. Only ever darker but for the bar's faint static. Still under Reduce motion.
  function paused(ctx) {
    var st = settings(), still = !!(st && st.reduceMotion), W = ctx.canvas.width, H = ctx.canvas.height, sx = W / 640, sy = H / 360, k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!st || !st.tapeLook) { if (!tapeCv) tapeCv = bakeTape(); ctx.imageSmoothingEnabled = false; ctx.drawImage(tapeCv, 0, 0, W, H); }
    var tick = still ? 0 : Math.floor(L.now * 20), by = 322 + (still ? 0 : Math.floor(hash(1, Math.floor(L.now * 3)) * 3) - 1);
    ctx.globalAlpha = 0.22; ctx.fillStyle = P.ink; ctx.fillRect(0, by * sy, W, 9 * sy);
    for (k = 0; k < 34; k++) {
      var hx = Math.floor(hash(k, tick) * 640), hy = by + 1 + Math.floor(hash(k + 77, tick) * 7), hl = 4 + Math.floor(hash(k + 5, tick) * 28);
      ctx.globalAlpha = 0.06 + hash(k + 3, tick) * 0.12; ctx.fillStyle = hash(k + 1, tick) > 0.5 ? P.fog_light : P.fog_mid;
      ctx.fillRect(hx * sx, hy * sy, hl * sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  // OSD capitals: the word in bold with its red and teal ghosts a pixel to each side.
  function osd(ctx, text, x, y, key) {
    var a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.55;
    F.bold(ctx, text, x - 1, y, 'neon_red');
    F.bold(ctx, text, x + 1, y, 'neon_teal');
    ctx.globalAlpha = a;
    F.bold(ctx, text, x, y, key);
  }
  // A VCR's play mark: a 4 × 7 right-pointing triangle.
  function play(ctx, x, y, key) {
    ctx.fillStyle = P[key];
    for (var i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 1, 7 - 2 * i);
  }
  // Faint scanlines over a body: every other row a touch darker.
  function scan(ctx, x, y, w, h) {
    var a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.22; ctx.fillStyle = P.ink;
    for (var r = 1; r < h; r += 2) ctx.fillRect(x, y + r, w, 1);
    ctx.globalAlpha = a;
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
  // Phase 131: cursor true adds a VCR menu's blinking play mark in the gap before the text
  // (lists whose text starts 6 px or more inside the bar); steady under Reduce motion.
  function row(ctx, x, y, w, h, cursor) {
    var rh = h || ROW, top = y - 2 - ((rh - ROW) >> 1);
    ctx.fillStyle = P.rust_dark; ctx.fillRect(x, top, w, rh - 1);
    ctx.fillStyle = P.signal_amber; ctx.fillRect(x, top, 2, rh - 1);
    if (cursor && blink()) {
      ctx.fillStyle = P.signal_amber;
      for (var i = 0; i < 3; i++) ctx.fillRect(x + 3 + i, y + i, 1, 5 - 2 * i);
    }
  }
  function blink() { var st = G.state && G.state.save && G.state.save.settings; return (st && st.reduceMotion) || (L.now * 1.6) % 1 < 0.65; }

  // True when the point (gx, gy) is inside the rectangle r = [x, y, w, h].
  function inside(r, gx, gy) { return !!r && gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3]; }

  return {
    TAB: TAB, PAD: PAD, ROW: ROW, KEY_H: KEY_H, MARGIN: MARGIN, MAX_W: MAX_W, MAX_H: MAX_H,
    place: place, frame: frame, osd: osd, play: play, scan: scan, blink: blink, kick: kick, screen: screen, post: post, paused: paused, asideX: asideX, top: top, left: left, key: key, keyW: keyW, hint: hint, hintW: hintW, row: row, inside: inside,
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
