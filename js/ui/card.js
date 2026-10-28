var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The catch card (V3.7): sprite, name, length, weight, rarity, price, the species' cryptic
// line (which carries its real hint, hintRefs), NEW on a first catch, RECORD on a heavier
// one, and SELL or KEEP. A/D (or arrows) choose, action confirms.
G.ui = G.ui || {};
G.ui.card = (function () {
  var S = G.gfx.sprites, P = S.PALETTE;
  var X = 36, Y = 28, W = 248, H = 124;
  var cur = null, sel = 0, t = 0;
  var txt = { len: '', wt: '', sellOn: '', sellOff: '', rarity: '', lines: [] }; // built once per card, not per frame

  // Builds the card for species spIdx from a hooked fish {len, w, q}, reading the journal for
  // NEW/RECORD. latched: the cast's clock windows; the first one marks this as a window catch.
  function build(spIdx, h, save, latched) {
    var sp = G.data.fish[spIdx], j = save.journal[sp.id], win = null;
    for (var k in latched) if (latched[k]) { win = k; break; }
    return {
      spIdx: spIdx, id: sp.id, name: sp.name, rarity: sp.rarity, len: h.len, w: h.w, q: h.q,
      price: G.sim.economy.price(sp, h.q, G.data), isNew: !j || !j.caught, isRecord: !!j && j.caught > 0 && h.w > j.bestW,
      desc: sp.desc, hintRefs: sp.hintRefs, windowCatch: win
    };
  }

  function open(info) {
    cur = info; sel = 0; t = 0;
    txt.len = 'LEN ' + info.len.toFixed(1) + ' cm';
    txt.wt = 'WT  ' + info.w.toFixed(2) + ' kg';
    txt.sellOn = '[SELL ' + info.price + ']';
    txt.sellOff = ' SELL ' + info.price + ' ';
    txt.rarity = info.rarity;
    txt.lines = S.wrap(info.desc, W - 16);
  }

  function isOpen() { return cur !== null; }
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

  function draw(ctx) {
    if (!cur) return;
    var name = G.gfx.fishgen.sprite(cur.spIdx), d = S.get(name);
    ctx.globalAlpha = 0.55; ctx.fillStyle = P.night_ink; ctx.fillRect(0, 0, 320, 180); ctx.globalAlpha = 1;
    ctx.fillStyle = P.stone; ctx.fillRect(X - 1, Y - 1, W + 2, H + 2);
    ctx.fillStyle = P.ink; ctx.fillRect(X, Y, W, H);

    ctx.fillStyle = P.water_dark; ctx.fillRect(X + 6, Y + 6, 76, 42);
    ctx.save();
    ctx.translate(X + 44 - d.w, Y + 27 - d.h);
    ctx.scale(2, 2);
    S.draw(ctx, name, 0, 0, 0, false);
    ctx.restore();

    S.drawText(ctx, cur.name, X + 90, Y + 8, 'bone');
    S.drawText(ctx, txt.rarity, X + 90, Y + 18, 'fog_light');
    S.drawText(ctx, txt.len, X + 90, Y + 30, 'paper');
    S.drawText(ctx, txt.wt, X + 90, Y + 39, 'paper');
    if (cur.isNew) S.drawText(ctx, 'NEW', X + W - 22, Y + 6, 'signal_amber');
    if (cur.isRecord) S.drawText(ctx, 'RECORD', X + W - 34, cur.isNew ? Y + 15 : Y + 6, 'neon_teal');

    for (var i = 0; i < txt.lines.length && i < 5; i++) S.drawText(ctx, txt.lines[i], X + 8, Y + 56 + i * S.LINE_H, 'fog_light', 0.15, cur.spIdx * 13 + i);

    var by = Y + H - 14;
    S.drawText(ctx, sel === 0 ? txt.sellOn : txt.sellOff, X + 40, by, sel === 0 ? 'signal_amber' : 'fog_mid');
    S.drawText(ctx, sel === 1 ? '[KEEP]' : ' KEEP ', X + W - 80, by, sel === 1 ? 'signal_amber' : 'fog_mid');
  }

  return { build: build, open: open, isOpen: isOpen, info: info, update: update, commit: commit, draw: draw };
})();
