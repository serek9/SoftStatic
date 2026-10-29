var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// HUD (9.1): the clock, coins and the bait going on the hook in the top-left corner (over
// the sky, clear of the boat), and the depth readout in the top-right while the lure is
// under water. Hidden while the catch card is open, and in the ?compact view (12.5). Between
// casts the top-right says how to start passive mode, and while it is on, what it just
// caught (12.2). Every string is rebuilt only when the value it shows changes, never per frame.
G.ui = G.ui || {};
G.ui.hud = (function () {
  var S = G.gfx.sprites;
  var X = 4, Y = 4;
  var lastTenths = -1, depthStr = '';
  var lastMin = -1, clockStr = '';
  var lastCoins = -1, coinStr = '';
  var lastBait = '', lastCount = -1, baitStr = '';
  // Audit P1-7: after IDLE s with nothing happening (no input, no new coins or bait, no line
  // out, no passive news) the corner text fades out over FADE s, and comes back at once. The
  // "TAB passive" hint goes away once passive has been used this session.
  var IDLE = 6, FADE = 1, idle = 0, seenCoins = -1, seenBait = '', tabUsed = false;
  var still = false; // audit P3-2: H hides every corner until pressed again

  function update(dt, run) {
    var save = G.state.save, pv = run.passive;
    idle += dt;
    if (G.core.input.pressed('still')) still = !still;
    if (pv.on) tabUsed = true;
    if (G.core.input.any() || run.fsm !== 'sailing' || pv.noteT > 0 || save.coins !== seenCoins || run.gearFx.bait !== seenBait) idle = 0;
    seenCoins = save.coins; seenBait = run.gearFx.bait;
  }

  // 1 while the HUD shows, falling to 0 as it fades.
  function alpha() { return idle < IDLE ? 1 : Math.max(0, 1 - (idle - IDLE) / FADE); }

  S.def('hud_coin', { a: 'signal_amber', h: 'lamp_glow', d: 'rust_hi' }, ['.aa.', 'ahad', 'aaad', '.dd.']);

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

  // Line tint for fight tension (7.4): plain, then amber, then red. Secondary to the line's shape.
  function tensionKey(T) { return T < 0.5 ? 'fog_light' : (T < 0.8 ? 'signal_amber' : 'neon_red'); }

  // Text with a 1 px ink shadow, so it reads over the fog and the sky at 1×.
  function label(ctx, s, x, y, key) {
    S.drawText(ctx, s, x + 1, y + 1, 'ink');
    S.drawText(ctx, s, x, y, key);
  }

  // Depth finder (V8): ticks every `bands` metres down the left edge, labelled every other one.
  // Labels stay below the clock and coins.
  var bandLabels = [];
  function drawBands(ctx, run, waterY, bands) {
    var top = waterY - Math.round(run.cam.y), step = bands * 4; // px per band
    ctx.fillStyle = S.PALETTE.fog_mid;
    for (var i = 1; top + i * step < 180; i++) {
      var y = top + i * step;
      ctx.fillRect(0, y, i % 2 ? 2 : 4, 1);
      if (i % 2 === 0 && y > Y + 22) {
        if (!bandLabels[i]) bandLabels[i] = (i * bands) + 'm';
        S.drawText(ctx, bandLabels[i], 6, y - 3, 'fog_mid');
      }
    }
  }

  var PASSIVE_ON = 'PASSIVE  TAB', PASSIVE_OFF = 'TAB passive';

  function draw(ctx, run, waterY) {
    if (G.ui.card.isOpen() || G.core.compact || still) return;
    var save = G.state.save, s = clockText(save.clock || 0), cx = X + S.measure(s) + 6, a = alpha();
    if (a > 0) {
      ctx.globalAlpha = a;
      label(ctx, s, X, Y, 'fog_light');
      S.draw(ctx, 'hud_coin', cx, Y + 1, 0, false);
      label(ctx, coinText(save.coins), cx + 6, Y, 'paper');
      label(ctx, baitText(save, run.gearFx.bait), X, Y + 9, 'fog_light');
      var pv = run.passive;
      if (pv.on) {
        label(ctx, PASSIVE_ON, 316 - S.measure(PASSIVE_ON), Y, 'signal_amber');
      } else if (run.fsm === 'sailing' && !tabUsed) S.drawText(ctx, PASSIVE_OFF, 316 - S.measure(PASSIVE_OFF), Y, 'fog_mid'); // also a button (14.6)
      ctx.globalAlpha = 1;
    }
    if (run.passive.on && run.passive.noteT > 0) label(ctx, run.passive.note, 316 - S.measure(run.passive.note), Y + 9, 'paper');

    if (!G.scene.underwater.UNDER[run.fsm]) return;
    if (run.gearFx.depthBands && run.uw.alpha >= 1) drawBands(ctx, run, waterY, run.gearFx.depthBands);
    s = depthText(Math.max(0, run.cast.ly - waterY));
    label(ctx, s, 316 - S.measure(s), Y, 'fog_light');
  }

  // 14.6: the on-screen buttons (TAB, J, M, P, ESC), over menus too (index.html draws them
  // last). Shown once a touch has been seen, or while the mouse is near them.
  function drawButtons(ctx) {
    var I = G.core.input;
    if (G.core.compact || still || !I.showButtons()) return;
    var B = I.BUTTONS, P = S.PALETTE;
    for (var i = 0; i < B.length; i++) {
      var b = B[i], on = I.held(b.act);
      ctx.globalAlpha = 0.7; ctx.fillStyle = P.ink; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = 1;
      ctx.fillStyle = P[on ? 'signal_amber' : 'fog_dark'];
      ctx.fillRect(b.x, b.y, b.w, 1); ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1); ctx.fillRect(b.x, b.y, 1, b.h); ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
      S.drawText(ctx, b.label, b.x + ((b.w - S.measure(b.label)) >> 1), b.y + 2, on ? 'signal_amber' : 'fog_light');
    }
  }

  // What the HUD shows right now (dbg checks compare these against the save).
  function shown() {
    return { clock: clockStr, coins: coinStr, bait: baitStr, depth: G.scene.underwater.UNDER[G.state.run.fsm] ? depthStr : '' };
  }

  return { metres: metres, depthText: depthText, clockText: clockText, tensionKey: tensionKey, update: update, alpha: alpha, drawButtons: drawButtons, isStill: function () { return still; }, draw: draw, shown: shown };
})();
