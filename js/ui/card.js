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
  var lv = -1, KH = U.KEY_H; // Phase 90: the layout's UI version; the keys' height (taller for a thumb)
  var CHOICES = ['sell', 'keep', 'release'];
  var cur = null, sel = 0, t = 0, at = 0; // at: how long it has been showing (the slide-in, P1-4)
  var txt = { size: '', sell: '', price: '', cls: '', bonus: '' }; // built once per card, not per frame

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
      trophy: h.w >= G.sim.pond.trophyKg(sp),
      bonus: (!j || !j.caught) && !(h.pondK >= 0) ? G.sim.economy.firstBonus(sp, G.data) : 0 // Phase 94.2: paid with any choice
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
    if (info.trash === undefined) {
      txt.size = info.len.toFixed(1) + ' cm  ' + (info.w < 0.1 ? Math.round(info.w * 1000) + ' g' : info.w.toFixed(2) + ' kg'); // Phase 44: small fish in grams
      txt.sell = 'SELL ' + info.price + 'c';
      txt.price = info.price + 'c';
      txt.cls = 'Size ' + G.data.SIZE_CLASSES[G.data.sizeClass(info.w)].id; // Phase 68: S M L XL XXL, as the lures are sold
      txt.bonus = info.bonus > 0 ? 'First catch +' + info.bonus + 'c' : '';        // Phase 94.2
      if (info.pondK >= 0) { sel = 2; txt.price = 'Yours, from the pond'; } // Phase 85: KEEP or RELEASE only
    }
    lv = -1; lay();
    if (info.trash === undefined) G.ui.badge.show(info, G.state.save.journal[info.id]); else G.ui.badge.hide(); // Phase 94.3: before the catch is written
  }

  // Phase 90: the card and its keys, laid out for the UI layer now (again whenever it changes).
  // A PC: the keys at their words' width with the key hint at the right. A phone: the keys share
  // the card's width, as tall as a thumb wants, and no key hint (they are tapped).
  function lay() {
    if (lv === U.ver() || !cur) return;
    lv = U.ver();
    var touch = U.touch(), x0 = 0, gap = 6, inner = W - 2 * U.PAD, i;
    KH = U.btnH(); H = KEY_Y + KH + U.PAD;
    U.place(W, H, 'top', RECT); RECT[2] = W; RECT[3] = H;
    x0 = RECT[0] + U.PAD;
    var keys = cur.trash !== undefined ? [SELL] : (cur.pondK >= 0 ? [KEEP, FREE] : [SELL, KEEP, FREE]);
    var words = cur.trash !== undefined ? ['BIN'] : (cur.pondK >= 0 ? ['KEEP', 'RELEASE'] : [txt.sell, 'KEEP', 'RELEASE']);
    SELL[2] = KEEP[2] = FREE[2] = 0;
    for (i = 0; i < keys.length; i++) {
      var w = touch ? Math.floor((inner - gap * (keys.length - 1)) / keys.length) : U.buttonW(words[i]);
      keys[i][0] = x0; keys[i][1] = RECT[1] + KEY_Y; keys[i][2] = w; keys[i][3] = KH;
      x0 += w + gap;
    }
  }

  function isOpen() { return cur !== null; }
  // Called every step while the card shows.
  function tick(dt) { at += dt; G.ui.badge.step(dt); }
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
    G.sim.economy.recordCatch(save, cur, choice);                                  // Phase 94.2: with the first-catch bonus
    G.ui.badge.hide();
    if (cur.pondK >= 0) G.sim.pond.caughtBack(save.pond, cur.pondK, choice === 'keep', G.data); // Phase 85: back in the pond (shy a while), or out of it
    cur = null;
    G.core.save.autosave('catch');
    G.ui.milestones.checkNow();                                                     // Phase 94.1: judged after each catch
  }

  // Phase 46: the compact card, a small panel (G.ui.panel) at the top centre over the world
  // (nothing dimmed): the fish's name on the tab, NEW or RECORD beside it, a small portrait,
  // the length and weight, the size class and the value, and SELL / KEEP as two keys. The long
  // text lives in the journal. RECT and the keys' rectangles are laid out in open().
  // A key's state for the shared button: chosen (or under the mouse), pressed while the action is held.
  function keyState(i, r) { return sel === i ? (G.core.input.held('action') && t >= 0.4 ? 2 : 1) : (U.hot(r) ? 1 : 0); }

  function draw(ctx0) {
    if (!cur) return;
    lay();
    var ctx = U.begin(ctx0);
    if (cur.trash !== undefined) { drawTrash(ctx); G.core.view.begin(ctx0, false); return; } // Phase 84
    var e = shownBy(), img = G.gfx.fishgen.portrait(cur.spIdx, PW, PH, false), x = RECT[0], y = RECT[1] - Math.round((1 - e) * (H + 12));
    U.frame(ctx, x, y, W, H, cur.name, cur.isNew ? 'NEW!' : (cur.isRecord ? 'RECORD' : (cur.trophy ? 'TROPHY' : '')), cur.isNew ? 'neon_red' : (cur.isRecord ? 'teal_lit' : 'brass_hi')); // Phase 85: a trophy
    var ty = U.top(y);
    ctx.drawImage(img, x + U.PAD + ((PW - img.width) >> 1), ty + ((PH - img.height) >> 1));
    var rx = x + U.PAD + PW + 8;
    F.bold(ctx, txt.size, rx, ty + 1, 'bone');
    F.drawText(ctx, txt.cls, rx, ty + 1 + U.ROW + 1, 'fog_light');
    if (txt.bonus) F.drawText(ctx, txt.bonus, rx + F.measure(txt.cls) + 8, ty + 1 + U.ROW + 1, 'moss_lit'); // Phase 94.2
    if (cur.pondK >= 0) F.drawText(ctx, txt.price, rx, ty + 1 + 2 * (U.ROW + 1), 'teal_lit');   // Phase 85: no price at the pond
    else { ctx.drawImage(G.ui.hud.coin(), rx, ty + 2 + 2 * (U.ROW + 1)); F.bold(ctx, txt.price, rx + 11, ty + 1 + 2 * (U.ROW + 1), 'signal_amber'); }
    var ky = y + KEY_Y;
    if (!(cur.pondK >= 0)) U.button(ctx, txt.sell, SELL[0], ky, SELL[2], KH, keyState(0, SELL));
    U.button(ctx, 'KEEP', KEEP[0], ky, KEEP[2], KH, keyState(1, KEEP));
    U.button(ctx, 'RELEASE', FREE[0], ky, FREE[2], KH, keyState(2, FREE));
    if (!U.touch() && !G.core.device.touch()) F.drawText(ctx, HINT, x + W - U.PAD - F.measure(HINT), ty + 1 + 2 * (U.ROW + 1), 'fog_mid'); // 90.4: no keys named on a phone; 90.5: over the keys, at the right
    G.ui.badge.draw(ctx, x, y, W);                                                   // Phase 94.3: the size badge, over the card
    G.core.view.begin(ctx0, false);
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
    U.button(ctx, 'BIN', SELL[0], y + KEY_Y, SELL[2], KH, G.core.input.held('action') && t >= 0.4 ? 2 : 1);
    if (!U.touch() && !G.core.device.touch()) F.drawText(ctx, 'SPACE', SELL[0] + SELL[2] + 8, y + KEY_Y + 2, 'fog_mid');
  }

  // Touch and the mouse (Phase 46): a tap on SELL, KEEP or RELEASE chooses it, and the caller presses
  // the action for it. Returns true when (gx, gy) is on one of the two keys.
  function tap(gx0, gy0) {
    if (!cur) return false;
    lay();
    var gx = U.ux(gx0), gy = U.uy(gy0); // Phase 90: the card is laid out in UI px
    if (cur.trash !== undefined) return U.inside(SELL, gx, gy);                     // Phase 84: BIN
    if (SELL[2] && U.inside(SELL, gx, gy)) { sel = 0; return true; }
    if (U.inside(KEEP, gx, gy)) { sel = 1; return true; }
    if (U.inside(FREE, gx, gy)) { sel = 2; return true; }
    return false;
  }

  return { build: build, buildTrash: buildTrash, open: open, isOpen: isOpen, info: info, update: update, tick: tick, shownBy: shownBy, commit: commit, draw: draw, tap: tap,
    rect: function () { lay(); return RECT; }, keys: function () { return { sell: SELL, keep: KEEP, release: FREE }; }, choice: function () { return cur && cur.trash !== undefined ? 'bin' : CHOICES[sel]; } };
})();
