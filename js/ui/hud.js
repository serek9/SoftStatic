var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// HUD (9.1): the clock, coins and the bait going on the hook in the top-left corner (over
// the sky, clear of the boat), and the depth readout in the top-right while the lure is
// under water. Hidden while the catch card is open, and in the ?compact view (12.5).
// (Phase 52: the passive-mode hints are gone with it.) Every string is rebuilt only when the value it shows changes, never per frame.
G.ui = G.ui || {};
// Phase 18: drawn in the 640×360 view's pixels with the fine font (it switches the view to
// native for itself, since the sailing scene that calls it draws in world pixels).
G.ui.hud = (function () {
  var S = G.gfx.sprites, F = S.fine, V = G.core.view;
  var lastTenths = -1, depthStr = '';
  var lastMin = -1, clockStr = '';
  var lastCoins = -1, coinStr = '';
  var lastBait = '', lastCount = -1, baitStr = '';
  // Audit P1-7: after IDLE s with nothing happening (no input, no new coins or bait, no line
  // out) the corner text fades out over FADE s, and comes back at once.
  var IDLE = 6, FADE = 1, idle = 0, seenCoins = -1, seenBait = '';
  var still = false; // audit P3-2: H hides every corner until pressed again
  // Phase 43: a short note under the bait (a lure lost), shown for NOTE s.
  var NOTE = 4, note = '', noteT = 0;
  function say(s) { note = s; noteT = NOTE; idle = 0; }
  // Phase 75 (PLAN_WATERS.md 4.2): the reach's name, quietly at the top centre for REACH s when
  // the boat crosses into one (or arrives at a water), fading in and out.
  var REACH = 3.5, reachAt = '', reachName = '', reachT = 0, reachW = 0;

  function update(dt, run) {
    var save = G.state.save;
    idle += dt;
    if (noteT > 0) noteT -= dt;
    if (G.core.input.pressed('still')) still = !still;
    if (G.core.input.any() || run.fsm !== 'sailing' || save.coins !== seenCoins || run.gearFx.bait !== seenBait) idle = 0;
    seenCoins = save.coins; seenBait = run.gearFx.bait;
    if (reachT > 0) reachT -= dt;
    var L = run.loc && G.data.locations[run.loc];
    if (L && run.boat) {
      var rid = run.loc + ':' + G.data.reachAt(L, run.boat.x);
      if (rid !== reachAt) {
        reachAt = rid; reachT = REACH;
        for (var i = 0; i < L.reaches.length; i++) if (run.loc + ':' + L.reaches[i].id === rid) reachName = L.reaches[i].name;
        reachW = F.measure(reachName);
      }
    }
  }

  // 1 while the HUD shows, falling to 0 as it fades.
  function alpha() { return idle < IDLE ? 1 : Math.max(0, 1 - (idle - IDLE) / FADE); }

  // The coin at 640×360: brass, lit on the top left, a stamped centre (8×8).
  var coin = null;
  function coinImg() {
    var A = G.gfx.paint;
    return coin || (coin = G.gfx.bake.layer(8, 8, function (c) { A.reset(); A.blob(c, 4, 4, 3.6, 3.6, ['rust', 'leaf_gold', 'brass_hi'], { bias: 0.1, rim: 0 }); A.box(c, 'rust', 3, 3, 2, 2); A.px(c, 'brass_hi', 2, 2); A.reset(); }));
  }

  // Depth in metres for a depth in pixels (§0.10).
  function metres(px) { return px * 0.25; }

  // The readout string, rebuilt only when the shown value changes (no per-frame strings).
  function depthText(px) {
    var tenths = Math.round(metres(px) * 10);
    if (tenths !== lastTenths) {
      lastTenths = tenths;
      depthStr = (tenths / 10).toFixed(1) + ' m';
    }
    return depthStr;
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }

  // HH:MM for a game hour 0..24.
  function clockText(hour) {
    var min = Math.floor(G.sim.clock.wrap(hour) * 60);
    if (min !== lastMin) {
      lastMin = min;
      clockStr = two(Math.floor(min / 60)) + ':' + two(min % 60);
    }
    return clockStr;
  }

  function coinText(coins) {
    if (coins !== lastCoins) { lastCoins = coins; coinStr = '' + coins; }
    return coinStr;
  }

  // The bait that goes on next cast, with how many are left (worms never run out).
  function baitText(save, id) {
    var b = G.sim.economy.baitById(id, G.data), n = b.unlimited ? -1 : (save.baits[id] || 0);
    if (id !== lastBait || n !== lastCount) {
      lastBait = id; lastCount = n;
      baitStr = (b.label === false ? '???' : b.name) + (n >= 0 ? ' x' + n : '');
    }
    return baitStr;
  }

  // Phase 73: the chip before the hook's name: a lure's icon painted at CHIP's size, or a
  // bait's own body as it looks under water.
  var CHIP = [16, 10];
  function chip(id) {
    if (G.gfx.luregen.has(id)) return G.gfx.luregen.iconImg(id, CHIP[0], CHIP[1]);
    return G.scene.underwater.lureImg(id, 0, 0);
  }

  // Line tint for fight tension (7.4): plain, then amber, then red. Secondary to the line's shape.
  function tensionKey(T) { return T < 0.5 ? 'fog_light' : (T < 0.8 ? 'signal_amber' : 'neon_red'); }

  // Text with a 1 px ink shadow, so it reads over the fog and the sky.
  function label(ctx, s, x, y, key) {
    F.drawText(ctx, s, x + 1, y + 1, 'ink');
    F.drawText(ctx, s, x, y, key);
  }

  function draw(ctx0, run, waterY) {
    if (G.ui.card.isOpen() || G.core.compact || still) return;
    var ov = G.ui.menu.current();
    if (G.ui.panel.on() && (ov === 'map' || ov === 'journal' || ov === 'controls')) return; // Phase 90: the layer is above the full-screen overlays
    var Pn = G.ui.panel, ctx = Pn.begin(ctx0), pic = Pn.pic(), X = pic[0] + 8, Y = pic[1] + 8, RX = pic[0] + pic[2] - 8; // Phase 90: on the UI layer, on the picture
    var save = G.state.save, s = clockText(save.clock || 0), cx = X + F.measure(s) + 9, a = alpha();
    if (a > 0) {
      ctx.globalAlpha = a;
      label(ctx, s, X, Y, 'fog_light');
      ctx.drawImage(coinImg(), cx, Y);
      label(ctx, coinText(save.coins), cx + 12, Y, 'paper');
      var ch = chip(run.gearFx.bait);                                              // Phase 73: the hook's chip, then its name
      ctx.drawImage(ch, X + ((CHIP[0] - ch.width) >> 1), Y + 18 - (ch.height >> 1));
      label(ctx, baitText(save, run.gearFx.bait), X + CHIP[0] + 3, Y + 14, 'fog_light');
      ctx.globalAlpha = 1;
    }
    if (noteT > 0) { ctx.globalAlpha = Math.min(1, noteT); label(ctx, note, X, Y + 28, 'paper'); ctx.globalAlpha = 1; }
    if (reachT > 0 && reachName) { ctx.globalAlpha = Math.min(1, reachT, (REACH - reachT) * 2) * 0.9; label(ctx, reachName, pic[0] + (pic[2] >> 1) - (reachW >> 1), Y + 22, 'bone'); ctx.globalAlpha = 1; } // Phase 75

    if (a > 0 && run.loc && G.data.locations[run.loc] && G.data.locations[run.loc].pond && save.pond) pondLine(ctx, save.pond, a, G.data.locations[run.loc], X, Y); // Phase 84
    if (G.scene.underwater.UNDER[run.fsm]) {
      s = depthText(Math.max(0, run.cast.ly - waterY));
      // Phase 58: in touch mode the depth goes under the column of keys where it lies over the picture
      var dy = G.core.device.touch() ? Math.max(Y, G.core.input.layout().rowBottom + 4) : Y;
      var kx = G.core.device.touch() && G.core.input.layout().inPic ? Math.min(RX, G.core.input.layout().buttons[0].x - 6) : RX;
      label(ctx, s, kx - F.measure(s), dy, 'fog_light');
    }
    if (G.ui.tips) G.ui.tips.draw(ctx, run, X, Y, pic);                              // Phase 88: a first-time tip, by the boat
    V.begin(ctx0, false);
  }

  // Phase 84 (PLAN_WINTER.md 2.4): at the Back Pond, a quiet line under the hook: the cleanup
  // meter (the pieces out and the stream, as a bar of segments) until the water is clear, then
  // (Phase 85) how many fish it holds of its capacity. Strings rebuilt only when they change.
  var pondKey = '', pondStr = '';
  function pondLine(ctx, p, a, L, X, Y) {
    var Pd = G.sim.pond, P = S.PALETTE, clean = Pd.clean(p, G.data), n = clean ? (p.stock || []).length : Pd.done(p, G.data), key = (clean ? 'p' : 'c') + n;
    if (key !== pondKey) { pondKey = key; pondStr = clean ? 'Pond ' + n + ' / ' + L.pond.cap : 'Cleanup'; }
    ctx.globalAlpha = a * 0.85;
    label(ctx, pondStr, X, Y + 40, 'fog_light');
    if (!clean) {
      var parts = Pd.parts(G.data), bx = X + F.measure(pondStr) + 6, by = Y + 43, full = Pd.full(p, G.data);
      for (var i = 0; i < parts; i++) {
        ctx.fillStyle = P.ink; ctx.fillRect(bx + i * 3, by, 3, 5);
        ctx.fillStyle = P[i < n ? (full ? 'teal_lit' : 'teal_hi') : 'fog_dark']; ctx.fillRect(bx + i * 3, by + 1, 2, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // 14.6: the on-screen buttons (TAB, J, M, S, P, ESC), over menus too (index.html draws them
  // last). Shown once a touch has been seen, or while the mouse is near them.
  function drawButtons(ctx) {
    var I = G.core.input;
    if (G.core.compact || still || !I.showButtons()) return;
    if (G.core.device.touch()) { drawTouch(ctx); return; }
    var B = I.BUTTONS, P = S.PALETTE;
    V.begin(ctx, true);
    for (var i = 0; i < B.length; i++) {
      var b = B[i], on = I.held(b.act);
      ctx.globalAlpha = 0.7; ctx.fillStyle = P.ink; ctx.fillRect(b.x + 1, b.y, b.w - 2, b.h); ctx.fillRect(b.x, b.y + 1, b.w, b.h - 2); ctx.globalAlpha = 1;
      ctx.fillStyle = P[on ? 'signal_amber' : 'fog_dark'];
      ctx.fillRect(b.x + 1, b.y, b.w - 2, 1); ctx.fillRect(b.x + 1, b.y + b.h - 1, b.w - 2, 1); ctx.fillRect(b.x, b.y + 1, 1, b.h - 2); ctx.fillRect(b.x + b.w - 1, b.y + 1, 1, b.h - 2);
      F.drawText(ctx, b.label, b.x + ((b.w - F.measure(b.label)) >> 1), b.y + 5, on ? 'signal_amber' : 'fog_light');
    }
    V.begin(ctx, false);
  }

  // ---- Phase 58: the touch layout (PLAN_MOBILE.md 58.1-58.4) --------------------------------

  // A key-like box: ink at 0.7 with a 1 px rim (amber while held), as the old buttons.
  function keyBox(ctx, x, y, w, h, on) {
    var P = S.PALETTE;
    ctx.save(); ctx.globalAlpha *= 0.7; ctx.fillStyle = P.ink; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2); ctx.restore();
    ctx.fillStyle = P[on ? 'signal_amber' : 'fog_dark'];
    ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x + 1, y + h - 1, w - 2, 1); ctx.fillRect(x, y + 1, 1, h - 2); ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
  }

  // An arrow in the middle of a pad key, pointing at dir ('left', 'right', 'up', 'down'), as rows of pixels.
  function arrow(ctx, r, dir, key) {
    var n = Math.max(3, Math.round(r.w * 0.18)), cx = r.x + (r.w >> 1), cy = r.y + (r.h >> 1), i;
    ctx.fillStyle = S.PALETTE[key];
    for (i = 0; i < n; i++) {
      var len = 2 * i + 1;
      if (dir === 'left') ctx.fillRect(cx - (n >> 1) + i, cy - i, 1, len);
      else if (dir === 'right') ctx.fillRect(cx + (n >> 1) - i, cy - i, 1, len);
      else if (dir === 'up') ctx.fillRect(cx - i, cy - (n >> 1) + i, len, 1);
      else ctx.fillRect(cx - i, cy + (n >> 1) - i, len, 1);
    }
  }

  // The round action button, baked for its size, up and held (rebaked only when the size changes).
  var roundD = 0, roundUp = null, roundOn = null;
  function roundImg(d, on) {
    if (d !== roundD) {
      roundD = d;
      var paint = function (rim, fill) {
        return G.gfx.bake.layer(d, d, function (c) {
          var P = S.PALETTE, rr = d / 2;
          for (var y = 0; y < d; y++) {
            var dy = y + 0.5 - rr, hw = Math.sqrt(Math.max(0, rr * rr - dy * dy)), x0 = Math.round(rr - hw), w = d - 2 * x0;
            if (w <= 0) continue;
            c.fillStyle = P[rim]; c.fillRect(x0, y, w, 1);
            var hi = Math.sqrt(Math.max(0, (rr - 1) * (rr - 1) - dy * dy)), x1 = Math.round(rr - hi), w1 = d - 2 * x1;
            if (w1 > 0 && y > 0 && y < d - 1) { c.fillStyle = P[fill]; c.fillRect(x1, y, w1, 1); }
          }
        });
      };
      roundUp = paint('fog_mid', 'ink'); roundOn = paint('signal_amber', 'rust_dark');
    }
    return on ? roundOn : roundUp;
  }

  // 58.3: what the action button does now, from the scene's state (read only, constant strings).
  function word() {
    var sc = G.core.state.sceneName();
    if (sc === 'sailing') return G.scene.sailing.actionWord();
    if (sc === 'shop') return G.ui.shop.word();
    if (sc === 'cabin') return G.ui.cabin.word();
    return '';
  }

  // 90.3: the keys' icons (12×12, palette keys, baked once): an open book, a folded chart, a
  // tackle box, the menu's bars and a cross for ESC; and the words under them, the short one
  // when the long one does not fit the key.
  var ICONS = {
    journal: [['paper', 1, 2, 5, 8], ['paper', 6, 2, 5, 8], ['paper_dark', 6, 2, 1, 8], ['fog_mid', 2, 4, 3, 1], ['fog_mid', 2, 6, 3, 1], ['fog_mid', 7, 4, 3, 1], ['fog_mid', 7, 6, 3, 1], ['wood', 0, 9, 12, 1]],
    map: [['paper', 1, 2, 3, 8], ['paper_dark', 4, 1, 4, 8], ['paper', 8, 2, 3, 8], ['water_mid', 2, 5, 2, 2], ['water_mid', 5, 4, 2, 3], ['neon_red', 9, 5, 1, 1]],
    setup: [['rust', 1, 4, 10, 7], ['rust_hi', 1, 4, 10, 1], ['brass_hi', 5, 6, 2, 2], ['wood_dark', 4, 2, 4, 1], ['wood_dark', 3, 2, 1, 2], ['wood_dark', 8, 2, 1, 2]],
    pause: [['paper', 2, 3, 8, 2], ['paper', 2, 6, 8, 2], ['paper', 2, 9, 8, 2]],
    back: [['paper', 2, 2, 2, 2], ['paper', 4, 4, 2, 2], ['paper', 6, 6, 2, 2], ['paper', 8, 8, 2, 2], ['paper', 8, 2, 2, 2], ['paper', 2, 8, 2, 2], ['paper', 4, 6, 2, 2], ['paper', 6, 4, 2, 2]]
  };
  var WORDS = { journal: ['Journal', 'Book'], map: ['Chart', 'Map'], setup: ['Tackle', 'Gear'], pause: ['Menu', 'Menu'], back: ['Close', 'Esc'] };
  var iconImgs = {};
  function iconImg(act) {
    if (iconImgs[act]) return iconImgs[act];
    var parts = ICONS[act] || [];
    return (iconImgs[act] = G.gfx.bake.layer(12, 12, function (c) { for (var i = 0; i < parts.length; i++) { var r = parts[i]; if (r[3] && r[4]) { c.fillStyle = S.PALETTE[r[0]]; c.fillRect(r[1], r[2], r[3], r[4]); } } }));
  }
  function wordFor(act, w) { var ws = WORDS[act] || ['', '']; return F.measure(ws[0]) <= w - 4 ? ws[0] : ws[1]; }

  function drawTouch(ctx0) {
    var I = G.core.input, L = I.layout(), i, Pn = G.ui.panel;
    if (!L.mode || !Pn) return;
    var ctx = Pn.begin(ctx0);
    // on the boat the controls fade with the HUD's idle fade (P1-7): never below 0.35, and
    // lighter still where they lie over the picture (no margin), so the water shows through
    var a = L.mode === 'boat' ? 0.35 + 0.65 * alpha() : 1;
    for (i = 0; i < L.buttons.length; i++) {
      var b = L.buttons[i];
      if (!b.on) continue;
      var on = I.held(b.act), w = wordFor(b.act, b.w), ic = iconImg(b.act);
      ctx.globalAlpha = a * (L.inPic && L.mode === 'boat' ? 0.8 : 1);
      keyBox(ctx, b.x, b.y, b.w, b.h, on);
      var iy = b.y + Math.max(2, ((b.h - 12 - 2 - F.FONT_H) >> 1));
      ctx.drawImage(ic, b.x + ((b.w - 12) >> 1), iy + (on ? 1 : 0));
      F.drawText(ctx, w, b.x + ((b.w - F.measure(w)) >> 1), iy + 14, on ? 'signal_amber' : 'fog_light');
    }
    for (i = 0; i < L.pad.length; i++) {
      var p = L.pad[i];
      if (!p.on) continue;
      var held = I.held(p.act);
      ctx.globalAlpha = a * 0.85;
      keyBox(ctx, p.x, p.y, p.w, p.h, held);
      arrow(ctx, p, p.act, held ? 'signal_amber' : 'fog_light');
    }
    if (L.act.on) {
      var r = L.act, wd = word(), down = I.held('action');
      ctx.globalAlpha = a * (wd ? 0.85 : 0.4);
      ctx.drawImage(roundImg(r.w, down), r.x, r.y);
      if (!wd && L.mode === 'room') wd = 'WALK';                                    // 90.4: never an empty circle in a room
      if (wd) F.bold(ctx, wd, r.x + ((r.w - F.measureBold(wd)) >> 1), r.y + ((r.h - F.FONT_H) >> 1), down ? 'signal_amber' : (word() ? 'bone' : 'fog_mid'));
    }
    ctx.globalAlpha = 1;
    V.begin(ctx0, false);
  }

  // What the HUD shows right now (dbg checks compare these against the save).
  function shown() {
    return { clock: clockStr, coins: coinStr, bait: baitStr, depth: G.scene.underwater.UNDER[G.state.run.fsm] ? depthStr : '' };
  }

  return { coin: coinImg, metres: metres, depthText: depthText, clockText: clockText, tensionKey: tensionKey, update: update, say: say, note: function () { return noteT > 0 ? note : ''; }, reach: function () { return { name: reachName, shown: reachT > 0 }; }, alpha: alpha, drawButtons: drawButtons, word: word,
    // Phase 60.2: the touch layout's pieces for the gallery's touch page.
    touchParts: { keyBox: keyBox, arrow: arrow, round: roundImg, icon: iconImg, wordFor: wordFor }, isStill: function () { return still; }, draw: draw, shown: shown };
})();
