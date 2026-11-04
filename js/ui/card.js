var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The catch card (V3.7): sprite, name, length, weight, size class (Phase 68: was the rarity), price, NEW on a first catch,
// RECORD on a heavier one, and SELL or KEEP. A/D (or arrows) choose, action confirms, a tap
// on either key picks it. What the species likes is the journal's (Phase 46). Drawn in the
// 640×360 view's pixels; it switches the view to
// native for itself.
G.ui = G.ui || {};
G.ui.card = (function () {
  var S = G.gfx.sprites, F = S.fine, U = G.ui.panel;
  // Phase 70: the portrait box grew from 80×40 to 96×56 for the real fish (PLAN_SPECIES.md 3.5),
  // and the card with it, to the small panel's widest (G.ui.panel.MAX_W).
  var W = 240, H = 98, PW = 96, PH = 56, KEY_Y = 81, HINT = 'A/D  SPACE';
  var RECT = U.place(W, H, 'top', [0, 0, W, H]), SELL = [0, 0, 0, U.KEY_H], KEEP = [0, 0, 0, U.KEY_H], FREE = [0, 0, 0, U.KEY_H];
  var CHOICES = ['sell', 'keep', 'release'];
  var cur = null, sel = 0, t = 0, at = 0; // at: how long it has been showing (the slide-in, P1-4)
  var txt = { size: '', sell: '', price: '', cls: '' }; // built once per card, not per frame

  // Builds the card for species spIdx from a hooked fish {len, w, q}, reading the journal for
  // NEW/RECORD. latched: the cast's clock windows; the first one marks this as a window catch.
  function build(spIdx, h, save, latched) {
    var sp = G.data.fish[spIdx], j = save.journal[sp.id], win = null;
    for (var k in latched) if (latched[k]) { win = k; break; }
    return {
      spIdx: spIdx, id: sp.id, name: sp.name, len: h.len, w: h.w, q: h.q,
      price: G.sim.economy.price(sp, h.q, G.data), isNew: !j || !j.caught, isRecord: !!j && j.caught > 0 && h.w > j.bestW,
      windowCatch: win,
      bait: G.state.run && G.state.run.cast ? G.state.run.cast.bait : '', // Phase 43: what it was caught on (the journal's "Caught on")
      pondK: h.pondK >= 0 ? h.pondK : -1, // Phase 85: one of the Back Pond's own fish (no SELL: stocking is free)
      trophy: h.w >= G.sim.pond.trophyKg(sp)
    };
  }

  // Phase 84: a piece of the Back Pond's trash landed: its name, its line, and one key, BIN.
  // No coins, nothing in the journal.
  function buildTrash(i) {
    var k = G.sim.pond.kindOf(G.data.pond.pieces[i][0], G.data);
    return { trash: i, kind: k.id, name: k.name, lines: F.wrap(k.card, W - 2 * U.PAD - PW + 8 - 8 - 8) };
  }

  function open(info) {
    cur = info; sel = 0; t = 0; at = 0;
    if (info.trash !== undefined) { SELL[0] = RECT[0] + U.PAD; SELL[1] = RECT[1] + KEY_Y; SELL[2] = U.keyW('BIN'); return; } // Phase 84
    txt.size = info.len.toFixed(1) + ' cm  ' + (info.w < 0.1 ? Math.round(info.w * 1000) + ' g' : info.w.toFixed(2) + ' kg'); // Phase 44: small fish in grams
    txt.sell = 'SELL ' + info.price + 'c';
    txt.price = info.price + 'c';
    txt.cls = 'Size ' + G.data.SIZE_CLASSES[G.data.sizeClass(info.w)].id; // Phase 68: S M L XL XXL, as the lures are sold
    SELL[0] = RECT[0] + U.PAD; SELL[1] = RECT[1] + KEY_Y; SELL[2] = U.keyW(txt.sell);
    KEEP[0] = SELL[0] + SELL[2] + 6; KEEP[1] = SELL[1]; KEEP[2] = U.keyW('KEEP');
    FREE[0] = KEEP[0] + KEEP[2] + 6; FREE[1] = SELL[1]; FREE[2] = U.keyW('RELEASE');
    if (info.pondK >= 0) { SELL[2] = 0; KEEP[0] = SELL[0]; FREE[0] = KEEP[0] + KEEP[2] + 6; sel = 2; txt.price = 'Yours, from the pond'; } // Phase 85: KEEP or RELEASE only
  }

  function isOpen() { return cur !== null; }
  // Called every step while the card shows.
  function tick(dt) { at += dt; }
  // 0 when it opens, 1 once it has slid into place (0.25 s, easing out).
  function shownBy() { var u = Math.min(1, at / 0.25); return 1 - (1 - u) * (1 - u) * (1 - u); }
  function info() { return cur; }

  // Returns 'sell', 'keep', 'release' or null. Input is ignored for the first 0.4 s so a held reel
  // button from the fight cannot pick for the player.
  function update(dt) {
    if (!cur) return null;
    t += dt;
    if (t < 0.4) return null;
    var inp = G.core.input;
    if (inp.pressed('left')) sel = Math.max(cur.pondK >= 0 ? 1 : 0, sel - 1);
    if (inp.pressed('right')) sel = Math.min(2, sel + 1);
    if (cur.trash !== undefined) return inp.pressed('action') ? 'bin' : null;       // Phase 84: only the bin
    if (inp.pressed('action')) return CHOICES[sel];
    return null;
  }

  // Writes the catch into the save, closes the card and autosaves (§0.12).
  function commit(choice, save) {
    if (cur.pondK >= 0 && choice === 'sell') choice = 'release';                     // Phase 85: never sold
    if (cur.trash !== undefined) { G.sim.pond.bin(save.pond, cur.trash, G.data); cur = null; G.core.save.autosave('catch'); return; } // Phase 84: binned
    G.sim.economy.recordCatch(save, cur, choice);
    if (cur.pondK >= 0) G.sim.pond.caughtBack(save.pond, cur.pondK, choice === 'keep', G.data); // Phase 85: back in the pond (shy a while), or out of it
    cur = null;
    G.core.save.autosave('catch');
  }

  // Phase 46: the compact card, a small panel (G.ui.panel) at the top centre over the world
  // (nothing dimmed): the fish's name on the tab, NEW or RECORD beside it, a small portrait,
  // the length and weight, the size class and the value, and SELL / KEEP as two keys. The long
  // text lives in the journal. RECT and the keys' rectangles are laid out in open().
  function draw(ctx) {
    if (!cur) return;
    G.core.view.begin(ctx, true);
    if (cur.trash !== undefined) { drawTrash(ctx); G.core.view.begin(ctx, false); return; } // Phase 84
    var e = shownBy(), img = G.gfx.fishgen.portrait(cur.spIdx, PW, PH, false), x = RECT[0], y = RECT[1] - Math.round((1 - e) * (H + 12));
    U.frame(ctx, x, y, W, H, cur.name, cur.isNew ? 'NEW!' : (cur.isRecord ? 'RECORD' : (cur.trophy ? 'TROPHY' : '')), cur.isNew ? 'neon_red' : (cur.isRecord ? 'teal_lit' : 'brass_hi')); // Phase 85: a trophy
    var ty = U.top(y);
    ctx.drawImage(img, x + U.PAD + ((PW - img.width) >> 1), ty + ((PH - img.height) >> 1));
    var rx = x + U.PAD + PW + 8;
    F.bold(ctx, txt.size, rx, ty + 1, 'bone');
    F.drawText(ctx, txt.cls, rx, ty + 1 + U.ROW + 1, 'fog_light');
    if (cur.pondK >= 0) F.drawText(ctx, txt.price, rx, ty + 1 + 2 * (U.ROW + 1), 'teal_lit');   // Phase 85: no price at the pond
    else { ctx.drawImage(G.ui.hud.coin(), rx, ty + 2 + 2 * (U.ROW + 1)); F.bold(ctx, txt.price, rx + 11, ty + 1 + 2 * (U.ROW + 1), 'signal_amber'); }
    var ky = y + KEY_Y;
    if (!(cur.pondK >= 0)) U.key(ctx, txt.sell, SELL[0], ky, sel === 0);
    U.key(ctx, 'KEEP', KEEP[0], ky, sel === 1);
    U.key(ctx, 'RELEASE', FREE[0], ky, sel === 2);
    F.drawText(ctx, HINT, x + W - U.PAD - F.measure(HINT), ky + 2, 'fog_mid');
    G.core.view.begin(ctx, false);
  }

  // Phase 84: the trash's card: the piece painted three times its size in the portrait box,
  // its line beside it, and BIN.
  function drawTrash(ctx) {
    var e = shownBy(), x = RECT[0], y = RECT[1] - Math.round((1 - e) * (H + 12)), im = G.scene.pondLook.trashImg(cur.kind), k = 3;
    U.frame(ctx, x, y, W, H, cur.name, '', 'teal_lit');
    var ty = U.top(y);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, x + U.PAD + ((PW - im.width * k) >> 1), ty + ((PH - im.height * k) >> 1), im.width * k, im.height * k);
    var rx = x + U.PAD + PW + 8;
    for (var i = 0; i < cur.lines.length && i < 4; i++) F.drawText(ctx, cur.lines[i], rx, ty + 1 + i * (U.ROW + 1), i ? 'fog_light' : 'bone');
    U.key(ctx, 'BIN', SELL[0], y + KEY_Y, true);
    F.drawText(ctx, 'SPACE', x + W - U.PAD - F.measure('SPACE'), y + KEY_Y + 2, 'fog_mid');
  }

  // Touch and the mouse (Phase 46): a tap on SELL, KEEP or RELEASE chooses it, and the caller presses
  // the action for it. Returns true when (gx, gy) is on one of the two keys.
  function tap(gx, gy) {
    if (!cur) return false;
    if (cur.trash !== undefined) return U.inside(SELL, gx, gy);                     // Phase 84: BIN
    if (SELL[2] && U.inside(SELL, gx, gy)) { sel = 0; return true; }
    if (U.inside(KEEP, gx, gy)) { sel = 1; return true; }
    if (U.inside(FREE, gx, gy)) { sel = 2; return true; }
    return false;
  }

  return { build: build, buildTrash: buildTrash, open: open, isOpen: isOpen, info: info, update: update, tick: tick, shownBy: shownBy, commit: commit, draw: draw, tap: tap,
    rect: function () { return RECT; }, keys: function () { return { sell: SELL, keep: KEEP, release: FREE }; }, choice: function () { return cur && cur.trash !== undefined ? 'bin' : CHOICES[sel]; } };
})();
