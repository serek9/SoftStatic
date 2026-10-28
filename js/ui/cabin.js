var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The cabin (9.6, V9, V10.9): a worn lakeside cabin restored with coins, stage by stage
// (data/gear.js cabin), reached from the map. Kept fish are mounted on plaques, heaviest
// first; each stage adds plaques. Some trophies face the door when you come in; how many
// follows the unease of the water you came from (§2). That is decided in enter() and only
// there, so a trophy never turns while it is on screen (draw only reads `turned`).
// Esc or M goes back out on the water.
G.ui = G.ui || {};
G.ui.cabin = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, B = G.gfx.bake;
  var PLAQUE_W = 32, PLAQUE_H = 18, COLS = 5, PX0 = 70, PY0 = 38, PDX = 38, PDY = 38;
  var DOOR_X = 10, WIN_X = 262;

  // Plaque centre for slot i (two rows of five on the back wall).
  function slotX(i) { return PX0 + (i % COLS) * PDX + (PLAQUE_W >> 1); }
  function slotY(i) { return PY0 + Math.floor(i / COLS) * PDY + (PLAQUE_H >> 1); }

  function paintCabin(ctx, level, plaques) {
    var x, y, i;
    // Log walls.
    for (y = 0; y < 150; y += 6) {
      ctx.fillStyle = P.wood_dark; ctx.fillRect(0, y, 320, 6);
      ctx.fillStyle = P.wood; ctx.fillRect(0, y + 1, 320, 1);
      ctx.fillStyle = P.ink; ctx.fillRect(0, y + 5, 320, 1);
    }
    // Floor.
    ctx.fillStyle = P.wood; ctx.fillRect(0, 150, 320, 30);
    ctx.fillStyle = P.wood_dark;
    for (x = 5; x < 320; x += 19) ctx.fillRect(x, 150, 1, 30);
    if (level < 1) {
      // Derelict: holes to the night outside, a broken board, cobwebs, debris.
      ctx.fillStyle = P.night_ink;
      ctx.fillRect(120, 0, 22, 5); ctx.fillRect(128, 5, 9, 4); ctx.fillRect(232, 98, 14, 5);
      ctx.fillStyle = P.night_blue; ctx.fillRect(131, 1, 2, 1);
      ctx.fillStyle = P.stone_hi;
      for (i = 0; i < 7; i++) { ctx.fillRect(300 - i * 2, i * 2, 1, 1); ctx.fillRect(300 + i, i * 3, 1, 1); ctx.fillRect(48 + i * 2, 4 + i, 1, 1); }
      ctx.fillStyle = P.stone_dark;
      for (i = 0; i < 9; i++) ctx.fillRect(70 + i * 23, 152 + (i * 7) % 20, 3 + i % 3, 2);
    }
    if (level >= 2) {
      // The stove, lit.
      ctx.fillStyle = P.stone_dark; ctx.fillRect(214, 112, 30, 38); ctx.fillRect(224, 40, 8, 72);
      ctx.fillStyle = P.stone; ctx.fillRect(216, 114, 26, 2);
      ctx.fillStyle = P.rust_hi; ctx.fillRect(220, 126, 18, 12);
      ctx.fillStyle = P.signal_amber; ctx.fillRect(223, 130, 12, 6);
      ctx.fillStyle = P.lamp_glow; ctx.fillRect(226, 133, 6, 3);
    }
    if (level >= 3) {
      // A rug with a zigzag border, and a lamp on a crate.
      ctx.fillStyle = P.crimson; ctx.fillRect(84, 160, 120, 12);
      ctx.fillStyle = P.blood;
      for (x = 84; x < 204; x += 4) { ctx.fillRect(x, 160, 2, 1); ctx.fillRect(x + 2, 161, 2, 1); ctx.fillRect(x, 171, 2, 1); ctx.fillRect(x + 2, 170, 2, 1); }
      ctx.fillStyle = P.wood_hi; ctx.fillRect(50, 136, 16, 14);
      ctx.fillStyle = P.rust; ctx.fillRect(55, 128, 6, 8);
      ctx.fillStyle = P.lamp_glow; ctx.fillRect(56, 130, 4, 4);
    }
    // Window with fog.
    ctx.fillStyle = P.wood_hi; ctx.fillRect(WIN_X, 30, 44, 40);
    ctx.fillStyle = P.fog_dark; ctx.fillRect(WIN_X + 3, 33, 38, 34);
    ctx.fillStyle = P.fog_mid; ctx.fillRect(WIN_X + 3, 52, 38, 15);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(WIN_X + 21, 33, 2, 34); ctx.fillRect(WIN_X + 3, 49, 38, 2);
    if (level < 1) { ctx.fillStyle = P.stone_hi; ctx.fillRect(WIN_X + 6, 36, 1, 10); ctx.fillRect(WIN_X + 7, 40, 6, 1); } // cracked pane
    if (level >= 4) {
      ctx.fillStyle = P.dusk_plum; ctx.fillRect(WIN_X - 4, 28, 8, 46); ctx.fillRect(WIN_X + 40, 28, 8, 46);
      ctx.fillStyle = P.dusk_violet; ctx.fillRect(WIN_X - 2, 28, 1, 46); ctx.fillRect(WIN_X + 42, 28, 1, 46);
    }
    // The door, on the left.
    ctx.fillStyle = P.ink; ctx.fillRect(DOOR_X - 1, 68, 32, 82);
    ctx.fillStyle = level >= 1 ? P.wood_hi : P.wood; ctx.fillRect(DOOR_X, 69, 30, 81);
    ctx.fillStyle = P.wood_dark;
    for (x = DOOR_X + 7; x < DOOR_X + 30; x += 8) ctx.fillRect(x, 69, 1, 81);
    ctx.fillStyle = P.rust_hi; ctx.fillRect(DOOR_X + 24, 110, 2, 2);
    // Plaques.
    for (i = 0; i < plaques; i++) {
      x = slotX(i) - (PLAQUE_W >> 1); y = slotY(i) - (PLAQUE_H >> 1);
      ctx.fillStyle = P.ink; ctx.fillRect(x - 1, y - 1, PLAQUE_W + 2, PLAQUE_H + 2);
      ctx.fillStyle = P.wood_hi; ctx.fillRect(x, y, PLAQUE_W, PLAQUE_H);
      ctx.fillStyle = P.wood; ctx.fillRect(x + 2, y + 2, PLAQUE_W - 4, PLAQUE_H - 4);
      ctx.fillStyle = P.stone_hi; ctx.fillRect(x + (PLAQUE_W >> 1), y - 4, 1, 3);
    }
  }

  var room = null, level = -1;
  var mounted = [];   // {spIdx, name, len}, decided in enter()
  var turned = [];    // per mounted trophy: faces the door; decided in enter() only
  var order = [];
  var stored = 0, msg = '', txt = { title: '', next: '', stored: '', coins: '' }, lastCoins = -1;

  function bakeRoom() {
    var lv = G.state.save.cabinLevel, st = G.data.gear.cabin[lv];
    level = lv;
    room = B.cached('cabin:' + lv, function () { return B.layer(320, 180, function (ctx) { paintCabin(ctx, lv, st.plaques); }); });
  }

  function texts() {
    var save = G.state.save, stages = G.data.gear.cabin, next = stages[save.cabinLevel + 1];
    txt.title = 'THE CABIN  ' + stages[save.cabinLevel].name;
    txt.next = next ? 'Restore: ' + next.name + ' ' + next.cost + 'c' : 'Fully restored.';
    txt.stored = stored > 0 ? '+' + stored + ' in the icebox' : '';
  }

  function speciesIndex(id) {
    for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) return i;
    return -1;
  }

  // Everything that must not change while the trophies are visible is decided here.
  function enter() {
    var save = G.state.save, kept = save.kept, cap = G.data.gear.cabin[save.cabinLevel].plaques, i, j;
    bakeRoom();
    order.length = 0;
    for (i = 0; i < kept.length; i++) if (speciesIndex(kept[i].id) >= 0) order.push(i);
    order.sort(function (a, b) { return kept[b].w - kept[a].w || a - b; });
    mounted.length = 0; turned.length = 0;
    for (i = 0; i < order.length && i < cap; i++) {
      var k = kept[order[i]], sp = speciesIndex(k.id);
      mounted.push({ spIdx: sp, name: G.gfx.fishgen.sprite(sp), len: Math.round(k.len) + 'cm' });
      turned.push(false);
    }
    stored = order.length - mounted.length;
    // How many face the door follows unease; which ones is a visual choice (G.vrng).
    var u = G.state.run.loc ? G.sim.unease.get(save, G.state.run.loc) : 0, n = Math.round(u * mounted.length);
    for (i = 0; i < n; i++) {
      do { j = G.vrng.int(0, mounted.length - 1); } while (turned[j]);
      turned[j] = true;
    }
    msg = '';
    texts();
  }

  function exit() {}

  function restore() {
    var r = G.sim.economy.restoreCabin(G.state.save, G.data);
    if (r === G.sim.economy.OK) {
      G.core.save.autosave('purchase');
      bakeRoom();
      msg = 'New plaques. The fish go up next time you come in.';
    } else msg = r === G.sim.economy.POOR ? 'Not enough coins.' : 'Nothing left to fix.';
    texts();
    return r;
  }

  function update(dt) {
    var inp = G.core.input;
    G.sim.clock.step(G.state.save, null, dt, G.rng, G.data);
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    if (inp.pressed('action')) restore();
  }

  function draw(ctx) {
    var save = G.state.save;
    ctx.drawImage(room, 0, 0);
    for (var i = 0; i < mounted.length; i++) {
      var m = mounted[i], d = S.get(m.name), cx = slotX(i), cy = slotY(i);
      S.draw(ctx, m.name, cx - (d.w >> 1), cy - (d.h >> 1), 0, turned[i]); // flipped: facing the door
      S.drawText(ctx, m.len, cx - (S.measure(m.len) >> 1), cy + (PLAQUE_H >> 1) + 3, 'bone');
    }
    M.panel(ctx, 40, 4, 240, 20, 'stone', 'ink');
    S.drawText(ctx, txt.title, 44, 7, 'bone');
    S.drawText(ctx, msg || txt.next, 44, 16, msg ? 'fog_light' : 'signal_amber');
    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '' + save.coins; }
    S.draw(ctx, 'hud_coin', 276 - S.measure(txt.coins) - 6, 8, 0, false);
    S.drawText(ctx, txt.coins, 276 - S.measure(txt.coins), 7, 'paper');
    if (txt.stored && !msg) S.drawText(ctx, txt.stored, 276 - S.measure(txt.stored), 16, 'fog_mid');
    S.drawText(ctx, 'SPACE restore  ESC leave', 316 - S.measure('SPACE restore  ESC leave'), 172, 'fog_light');
  }

  return {
    enter: enter, exit: exit, update: update, draw: draw, restore: restore,
    // dbg: what is on the wall now.
    state: function () { return { level: level, mounted: mounted.length, turned: turned.filter(Boolean).length, facing: turned.slice(), stored: stored }; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  if (G.core.state.sceneName() !== 'cabin') return 'cabin level ' + (G.state.save ? G.state.save.cabinLevel : '-');
  var s = G.ui.cabin.state();
  return 'cabin level ' + s.level + '  mounted ' + s.mounted + '  facing door ' + s.turned + '  icebox ' + s.stored;
});
