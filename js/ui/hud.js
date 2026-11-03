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
  var X = 8, Y = 8;
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

  function draw(ctx, run, waterY) {
    if (G.ui.card.isOpen() || G.core.compact || still) return;
    V.begin(ctx, true);
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
    if (reachT > 0 && reachName) { ctx.globalAlpha = Math.min(1, reachT, (REACH - reachT) * 2) * 0.9; label(ctx, reachName, 320 - (reachW >> 1), Y + 22, 'bone'); ctx.globalAlpha = 1; } // Phase 75

    if (G.scene.underwater.UNDER[run.fsm]) {
      s = depthText(Math.max(0, run.cast.ly - waterY));
      // Phase 58: in touch mode the depth goes under the top-right row of buttons
      var dy = G.core.device.touch() ? Math.max(Y, G.core.input.layout().rowBottom + 4) : Y;
      label(ctx, s, 632 - F.measure(s), dy, 'fog_light');
    }
    V.begin(ctx, false);
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

  function drawTouch(ctx) {
    var I = G.core.input, L = I.layout(), i;
    if (!L.mode) return;
    V.begin(ctx, true);
    // on the boat the controls fade with the HUD's idle fade (P1-7), never below 0.35
    var a = L.mode === 'boat' ? 0.35 + 0.65 * alpha() : 1;
    ctx.globalAlpha = a;
    for (i = 0; i < L.buttons.length; i++) {
      var b = L.buttons[i];
      if (!b.on) continue;
      var on = I.held(b.act);
      keyBox(ctx, b.x, b.y, b.w, b.h, on);
      F.drawText(ctx, b.label, b.x + ((b.w - F.measure(b.label)) >> 1), b.y + ((b.h - F.FONT_H) >> 1), on ? 'signal_amber' : 'fog_light');
    }
    for (i = 0; i < L.pad.length; i++) {
      var p = L.pad[i];
      if (!p.on) continue;
      var held = I.held(p.act);
      keyBox(ctx, p.x, p.y, p.w, p.h, held);
      arrow(ctx, p, p.act, held ? 'signal_amber' : 'fog_light');
    }
    if (L.act.on) {
      var r = L.act, w = word(), down = I.held('action');
      ctx.globalAlpha = a * (w ? 0.85 : 0.4);
      ctx.drawImage(roundImg(r.w, down), r.x, r.y);
      if (w) F.bold(ctx, w, r.x + ((r.w - F.measureBold(w)) >> 1), r.y + ((r.h - F.FONT_H) >> 1), down ? 'signal_amber' : 'bone');
    }
    ctx.globalAlpha = 1;
    V.begin(ctx, false);
  }

  // What the HUD shows right now (dbg checks compare these against the save).
  function shown() {
    return { clock: clockStr, coins: coinStr, bait: baitStr, depth: G.scene.underwater.UNDER[G.state.run.fsm] ? depthStr : '' };
  }

  return { coin: coinImg, metres: metres, depthText: depthText, clockText: clockText, tensionKey: tensionKey, update: update, say: say, note: function () { return noteT > 0 ? note : ''; }, reach: function () { return { name: reachName, shown: reachT > 0 }; }, alpha: alpha, drawButtons: drawButtons, word: word,
    // Phase 60.2: the touch layout's pieces for the gallery's touch page.
    touchParts: { keyBox: keyBox, arrow: arrow, round: roundImg }, isStill: function () { return still; }, draw: draw, shown: shown };
})();
