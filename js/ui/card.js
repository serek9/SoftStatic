var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The catch card (V3.7): sprite, name, length, weight, rarity, price, the species' cryptic
// line (which carries its real hint, hintRefs), NEW on a first catch, RECORD on a heavier
// one, and SELL or KEEP. A/D (or arrows) choose, action confirms.
// Phase 18: drawn in the 640×360 view's pixels: a paper card in a wooden frame, the fish
// painted on a plate (fishgen.portrait), its name on a ribbon, the numbers, the line in
// handwriting, and the two choices as pills. It switches the view to native for itself.
G.ui = G.ui || {};
G.ui.card = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine, A = G.gfx.paint;
  var X = 120, Y = 56, W = 400, H = 248;
  var cur = null, sel = 0, t = 0, at = 0; // at: how long it has been showing (the slide-in, P1-4)
  var txt = { len: '', wt: '', sell: '', price: '', rarity: '', lines: [] }; // built once per card, not per frame

  // Builds the card for species spIdx from a hooked fish {len, w, q}, reading the journal for
  // NEW/RECORD. latched: the cast's clock windows; the first one marks this as a window catch.
  function build(spIdx, h, save, latched) {
    var sp = G.data.fish[spIdx], j = save.journal[sp.id], win = null;
    for (var k in latched) if (latched[k]) { win = k; break; }
    return {
      spIdx: spIdx, id: sp.id, name: sp.name, rarity: sp.rarity, len: h.len, w: h.w, q: h.q,
      price: G.sim.economy.price(sp, h.q, G.data), isNew: !j || !j.caught, isRecord: !!j && j.caught > 0 && h.w > j.bestW,
      desc: sp.desc, hintRefs: sp.hintRefs, windowCatch: win,
      bait: G.state.run && G.state.run.cast ? G.state.run.cast.bait : '' // Phase 43: what it was caught on (the journal's "Caught on")
    };
  }

  function open(info) {
    cur = info; sel = 0; t = 0; at = 0;
    txt.len = 'LEN ' + info.len.toFixed(1) + ' cm';
    txt.wt = 'WT  ' + info.w.toFixed(2) + ' kg';
    txt.sell = 'SELL ' + info.price;
    txt.price = info.price + 'c';
    txt.rarity = info.rarity;
    txt.lines = F.wrap(info.desc, W - 48);
  }

  function isOpen() { return cur !== null; }
  // Called every step while the card shows, in active and passive play alike.
  function tick(dt) { at += dt; }
  // 0 when it opens, 1 once it has slid into place (0.25 s, easing out).
  function shownBy() { var u = Math.min(1, at / 0.25); return 1 - (1 - u) * (1 - u) * (1 - u); }
  function info() { return cur; }

  // Returns 'sell', 'keep' or null. Input is ignored for the first 0.4 s so a held reel
  // button from the fight cannot pick for the player.
  function update(dt) {
    if (!cur) return null;
    t += dt;
    if (t < 0.4) return null;
    var inp = G.core.input;
    if (inp.pressed('left')) sel = 0;
    if (inp.pressed('right')) sel = 1;
    if (inp.pressed('action')) return sel ? 'keep' : 'sell';
    return null;
  }

  // Writes the catch into the save, closes the card and autosaves (§0.12).
  function commit(choice, save) {
    G.sim.economy.recordCatch(save, cur, choice);
    cur = null;
    G.core.save.autosave('catch');
  }

  // The frame and the paper, baked once.
  var frame = null;
  function paintFrame(c) {
    A.reset();
    A.box(c, 'ink', 0, 0, W, H);
    A.area(c, 1, 1, W - 2, H - 2, function (x, y) {
      var e = Math.min(x - 1, W - 2 - x, y - 1, H - 2 - y);
      if (e < 2) return e === 0 ? 'wood_hi' : 'wood_mid';
      if (e < 8) return e < 6 ? 'wood' : 'wood_dark';
      return e < 9 ? 'paper_dark' : (e < 11 ? 'paper' : 'bone');
    });
    // The plate for the fish, the ribbon for the name.
    A.area(c, 22, 44, 176, 106, function (x, y) {
      var cut = Math.min(x - 22, 197 - x) + Math.min(y - 44, 149 - y) < 4;
      return cut ? '' : (x < 24 || y < 46 ? 'reed_hi' : (x > 195 || y > 147 ? 'cream' : 'paper_dark'));
    });
    A.area(c, 60, 14, W - 120, 22, function (x, y) {
      var notch = (x < 70 && Math.abs(y - 25) < 70 - x) || (x > W - 71 && Math.abs(y - 25) < x - (W - 71));
      if (notch) return '';
      return y === 14 || y === 35 ? 'reed' : (y < 20 ? 'paper_dark' : 'reed_hi');
    });
    for (var y = 176; y < H - 46; y += F.LINE_H) A.box(c, 'paper', 24, y + 10, W - 48, 1);   // ruled lines
    A.reset();
  }

  function pill(ctx, s, x, y, on) {
    var w = F.measureBold(s) + 20;
    ctx.fillStyle = P.ink; ctx.fillRect(x - 1, y - 1, w + 2, 22);
    ctx.fillStyle = P[on ? 'rust' : 'paper_dark']; ctx.fillRect(x, y, w, 20);
    ctx.fillStyle = P[on ? 'rust_hi' : 'paper']; ctx.fillRect(x, y, w, 1);
    F.bold(ctx, s, x + 10, y + 6, on ? 'cream' : 'wood_dark');
  }

  function stamp(ctx, s, x, y, key) {
    var w = F.measureBold(s) + 10;
    ctx.fillStyle = P[key]; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 15, w, 1); ctx.fillRect(x, y, 1, 16); ctx.fillRect(x + w - 1, y, 1, 16);
    F.bold(ctx, s, x + 5, y + 4, key);
  }

  function draw(ctx) {
    if (!cur) return;
    G.core.view.begin(ctx, true);
    if (!frame) frame = G.gfx.bake.layer(W, H, paintFrame);
    var e = shownBy(), img = G.gfx.fishgen.portrait(cur.spIdx, 160, 90, false);
    ctx.globalAlpha = 0.55 * e; ctx.fillStyle = P.night_ink; ctx.fillRect(0, 0, 640, 360); ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(0, Math.round((1 - e) * 140));
    ctx.drawImage(frame, X, Y);
    F.bold(ctx, cur.name, X + (W >> 1) - (F.measureBold(cur.name) >> 1), Y + 21, 'wood_deep');
    ctx.drawImage(img, X + 110 - (img.width >> 1), Y + 97 - (img.height >> 1));
    var rx = X + 214;
    F.drawText(ctx, txt.rarity, rx, Y + 50, 'wood');
    F.bold(ctx, txt.len, rx, Y + 70, 'wood_deep');
    F.bold(ctx, txt.wt, rx, Y + 86, 'wood_deep');
    ctx.drawImage(G.ui.hud.coin(), rx, Y + 106);
    F.bold(ctx, txt.price, rx + 12, Y + 106, 'rust');
    if (cur.isNew) stamp(ctx, 'NEW', X + W - 64, Y + 46, 'crimson');
    if (cur.isRecord) stamp(ctx, 'RECORD', X + W - 90, cur.isNew ? Y + 68 : Y + 46, 'teal');

    for (var i = 0; i < txt.lines.length && i < 4; i++) F.drawText(ctx, txt.lines[i], X + 24, Y + 166 + i * F.LINE_H, 'rust', 0.15, cur.spIdx * 13 + i);

    pill(ctx, txt.sell, X + 90, Y + H - 40, sel === 0);
    pill(ctx, 'KEEP', X + W - 170, Y + H - 40, sel === 1);
    ctx.restore();
    G.core.view.begin(ctx, false);
  }

  return { build: build, open: open, isOpen: isOpen, info: info, update: update, tick: tick, shownBy: shownBy, commit: commit, draw: draw };
})();
