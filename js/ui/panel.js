var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The small panel (Phase 46, PLAN_TACKLE.md 2.7): the one frame the catch card, the pause
// list, the tape, the map's place card and the shop's item window share. A small rounded
// rectangle in night_ink with a one-pixel paper rim and a title tab on its top edge, drawn in
// the 640×360 view's pixels with the fine font, never over a dimmed world. A panel's bounds
// (x, y, w, h) include its tab: the tab takes the top TAB rows, the body the rest. At most
// MAX_W × MAX_H, anchored to a corner or the top of the screen (place). Drawing only: the
// callers lay their panels out when they open, and draw() reads that.
G.ui = G.ui || {};
G.ui.panel = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine;
  var TAB = 13, PAD = 6, ROW = 12, KEY_H = 11, MARGIN = 8, MAX_W = 240, MAX_H = 140;

  // The top-left of a w × h panel at an anchor: 'top', 'tl', 'tr', 'bl', 'br' or 'right'
  // (the right edge, centred down it). Writes out[0], out[1] and returns out.
  function place(w, h, anchor, out) {
    var x = (640 - w) >> 1, y = MARGIN;
    if (anchor === 'tl' || anchor === 'bl') x = MARGIN;
    if (anchor === 'tr' || anchor === 'br' || anchor === 'right') x = 640 - MARGIN - w;
    if (anchor === 'bl' || anchor === 'br') y = 360 - MARGIN - h;
    if (anchor === 'right') y = (360 - h) >> 1;
    out[0] = x; out[1] = y;
    return out;
  }

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

  // The bar under a chosen row of a list (y is the text's top).
  function row(ctx, x, y, w) {
    ctx.fillStyle = P.rust_dark; ctx.fillRect(x, y - 2, w, ROW - 1);
    ctx.fillStyle = P.signal_amber; ctx.fillRect(x, y - 2, 1, ROW - 1);
  }

  // True when the point (gx, gy) is inside the rectangle r = [x, y, w, h].
  function inside(r, gx, gy) { return !!r && gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3]; }

  return {
    TAB: TAB, PAD: PAD, ROW: ROW, KEY_H: KEY_H, MARGIN: MARGIN, MAX_W: MAX_W, MAX_H: MAX_H,
    place: place, frame: frame, asideX: asideX, top: top, left: left, key: key, keyW: keyW, hint: hint, hintW: hintW, row: row, inside: inside,
    shown: shown // 8.4 #36: the label a hint shows now ('' when it is left out)
  };
})();
