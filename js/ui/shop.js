var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The bait shop (9.4, V9, V10.7): a scene reached from the map. A baked interior, three
// shelves as a grid (gear tiers, equipment, bait), a panel that states each item's practical
// effect, and the shopkeeper, who says one line per visit (data/dialogue.js). Time passes
// here and unease drains (V10.1). Esc or M goes back out on the water.
G.ui = G.ui || {};
G.ui.shop = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, M = G.ui.menu, E = G.sim.economy;

  // Shelves, top to bottom. kind: a gear kind for economy.buy, or 'bait' with an id.
  var SHELVES = [
    [{ kind: 'rod', spr: 'shop_rod' }, { kind: 'reel', spr: 'shop_reel' }, { kind: 'line', spr: 'shop_line' }],
    [{ kind: 'lantern', spr: 'shop_lantern' }, { kind: 'depthFinder', spr: 'shop_finder' }],
    [{ kind: 'bait', id: 'worm', spr: 'shop_worm' }, { kind: 'bait', id: 'cricket', spr: 'shop_cricket' },
     { kind: 'bait', id: 'minnow', spr: 'shop_minnow' }, { kind: 'bait', id: 'unlabelled', spr: 'shop_jar' }]
  ];
  var SHELF_Y = [48, 82, 116], SLOT_X = 26, SLOT_W = 44;
  var KEEPER_X = 250, KEEPER_Y = 92, COUNTER_Y = 118;
  var REVEAL = 160; // px of speech shown per second

  // ---- Sprites ---------------------------------------------------------------------------
  S.def('shop_rod', { w: 'wood_hi', r: 'stone_hi', g: 'rust' }, [
    '..........w', '.........w.', '........w..', '.......w...', '......w....', '.....w.....',
    '....w......', '...rw......', '..rrr......', '..gw.......', '.g.........'
  ]);
  S.def('shop_reel', { s: 'stone_hi', d: 'stone', h: 'wood_hi' }, [
    '..sss...', '.sdddsh.', 'sdsssdsh', 'sdsdsds.', 'sdsssds.', '.sdddsh.', '..sss...'
  ]);
  S.def('shop_line', { w: 'wood_hi', t: 'paper', d: 'wood' }, [
    'wwwwwww', '.ttttt.', '.ttttt.', '.ttttt.', '.ttttt.', 'ddddddd'
  ]);
  S.def('shop_lantern', { r: 'rust', g: 'lamp_glow', h: 'rust_hi' }, [
    '..h..', '.rrr.', 'r.r.r', 'rgggr', 'rgggr', 'rgggr', '.rrr.', 'rrrrr'
  ]);
  S.def('shop_finder', { s: 'stone', t: 'neon_teal', d: 'stone_dark', k: 'ink' }, [
    'ssssssssss', 'sddddddds.', 'sdttktdds.', 'sdtktttds.', 'sddddddds.', 'ssssssssss'
  ]);
  S.def('shop_worm', { s: 'stone_hi', r: 'rust', d: 'stone' }, [
    '.ssssss.', 'sdddddds', 'srrrrrrs', 'srrrrrrs', 'sdddddds', '.ssssss.'
  ]);
  S.def('shop_cricket', { p: 'wood_hi', d: 'wood', k: 'ink' }, [
    'ppppppppp', 'pkpdpdpkp', 'ppppppppp', 'pdddddddp', 'pdddddddp', 'ppppppppp'
  ]);
  S.def('shop_minnow', { s: 'stone', w: 'water_hi', h: 'stone_hi' }, [
    '.hhhhhhh.', 'h.......h', 'swwwwwwws', 'swwwwwwws', '.swwwwws.', '.sssssss.'
  ]);
  S.def('shop_jar', { g: 'fog_light', b: 'blood', l: 'stone_hi' }, [
    'llllll', '.gggg.', 'gbbbbg', 'gbbbbg', 'gbbbbg', 'gbbbbg', '.gggg.'
  ]);
  // The shopkeeper (original): grey bun, round glasses, cardigan and apron. Frame 1 blinks.
  var KEEPER_MAP = { h: 'stone_hi', f: 'flesh', g: 'fog_light', k: 'ink', m: 'flesh_dark', c: 'dusk_plum', p: 'paper', a: 'bone' };
  var KEEPER = [
    '......hhhh......', '.....hhhhhh.....', '....hhhhhhhh....', '....hffffffh....',
    '....fkgffkgf....', '....ffffffff....', '....ffffmfff....', '.....ffffff.....',
    '......ffff......', '...ccccppcccc...', '..cccccppccccc..', '..cccaaaaaaccc..',
    '.ccccaaaaaacccc.', '.ccccaaaaaacccc.', '.cc.caaaaaac.cc.', '.cc.caaaaaac.cc.',
    '.ff.caaaaaac.ff.', '....caaaaaac....', '....caaaaaac....', '....caaaaaac....',
    '....caaaaaac....', '....caaaaaac....', '....caaaaaac....', '....caaaaaac....',
    '....caaaaaac....', '....caaaaaac....'
  ];
  var BLINK = KEEPER.slice();
  BLINK[4] = '....fkkffkkf....';
  S.def('shopkeeper', KEEPER_MAP, [KEEPER, BLINK]);

  // ---- Backdrop (baked once) ---------------------------------------------------------------
  function paintRoom(ctx) {
    var x, i;
    ctx.fillStyle = P.wood_dark; ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = P.ink;
    for (x = 7; x < 320; x += 11) ctx.fillRect(x, 0, 1, 150);
    ctx.fillStyle = P.wood;
    for (i = 0; i < 40; i++) ctx.fillRect((i * 83) % 320, (i * 37) % 150, 1, 2 + (i % 3)); // knots
    // Window: fog outside, never brighter than the dusk ceiling.
    ctx.fillStyle = P.wood_hi; ctx.fillRect(220, 8, 84, 46);
    ctx.fillStyle = P.fog_dark; ctx.fillRect(223, 11, 78, 40);
    ctx.fillStyle = P.fog_mid; ctx.fillRect(223, 33, 78, 18);
    ctx.fillStyle = P.fog_light;
    for (i = 0; i < 9; i++) ctx.fillRect(223 + (i * 29) % 70, 26 + (i * 7) % 20, 6 + (i % 4) * 3, 1);
    ctx.fillStyle = P.night_ink; ctx.fillRect(223, 45, 78, 6);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(261, 11, 2, 40); ctx.fillRect(223, 30, 78, 2);
    // Sign.
    ctx.fillStyle = P.wood_hi; ctx.fillRect(38, 4, 120, 13);
    ctx.fillStyle = P.wood; ctx.fillRect(39, 5, 118, 11);
    S.drawText(ctx, 'BAIT & TACKLE', 98 - (S.measure('BAIT & TACKLE') >> 1), 8, 'paper');
    // Shelves with brackets.
    for (i = 0; i < SHELF_Y.length; i++) {
      var y = SHELF_Y[i];
      ctx.fillStyle = P.wood_hi; ctx.fillRect(10, y, 186, 2);
      ctx.fillStyle = P.wood; ctx.fillRect(10, y + 2, 186, 2);
      ctx.fillStyle = P.ink; ctx.fillRect(18, y + 4, 2, 5); ctx.fillRect(186, y + 4, 2, 5);
    }
    // Floor and counter.
    ctx.fillStyle = P.wood; ctx.fillRect(0, 150, 320, 30);
    ctx.fillStyle = P.wood_dark;
    for (x = 0; x < 320; x += 23) ctx.fillRect(x, 150, 1, 30);
    ctx.fillStyle = P.wood_hi; ctx.fillRect(200, COUNTER_Y, 120, 3);
    ctx.fillStyle = P.wood; ctx.fillRect(202, COUNTER_Y + 3, 118, 32);
    ctx.fillStyle = P.wood_dark;
    for (x = 210; x < 320; x += 16) ctx.fillRect(x, COUNTER_Y + 6, 1, 26);
    // A register on the counter.
    ctx.fillStyle = P.stone; ctx.fillRect(284, COUNTER_Y - 9, 20, 9);
    ctx.fillStyle = P.stone_hi; ctx.fillRect(286, COUNTER_Y - 12, 12, 3);
  }

  // ---- Dialogue (pure: no DOM) ------------------------------------------------------------

  // One line for this visit. Counts the visit and marks a special line as said. Returns a
  // line from D.special, or {id: '', kind: 'small', text} for small talk.
  function pickLine(save, D, hour) {
    var f = save.flags, v = ++f.shopVisits, last = 0, id, i;
    for (id in f.lines) if (f.lines[id] > last) last = f.lines[id];
    if (v - last >= D.gap) {
      for (i = 0; i < D.special.length; i++) {
        var s = D.special[i];
        if (f.lines[s.id] || v < s.after || (s.night && G.sim.clock.isGrey(hour))) continue;
        f.lines[s.id] = v; // the visit it was said on
        return s;
      }
    }
    return { id: '', kind: 'small', text: D.small[(v * 4) % D.small.length] };
  }

  // What the keeper actually says: reversed lines run backwards, repeated lines twice.
  function spoken(line) {
    if (line.kind === 'reverse') return [line.text.split('').reverse().join('')];
    if (line.kind === 'repeat') return [line.text, line.text];
    return [line.text];
  }

  // ---- Scene ----------------------------------------------------------------------------
  var room = null, row = 0, col = 0, t = 0, line = null, speech = [], speechH = 0;
  var txt = { name: '', price: '', desc: [], status: '', msg: '', msgKey: 'fog_light', coins: '' }, lastCoins = -1;
  var uneaseIn = { loc: 'fog', still: true, atShop: true };

  function item() { return SHELVES[row][col]; }

  function pct(r) { return Math.round((r - 1) * 100); }

  // Fills txt for the selected item: what it is, what it costs, what it does.
  function describe() {
    var it = item(), save = G.state.save, g = G.data.gear, desc = '', next, cur;
    txt.price = ''; txt.status = '';
    if (it.kind === 'rod' || it.kind === 'reel' || it.kind === 'line') {
      var tiers = g[E.TIERED[it.kind]];
      cur = tiers[save.gear[it.kind]]; next = E.nextItem(save, it.kind, G.data);
      if (!next) { txt.name = cur.name; txt.status = 'In use. Nothing finer on the shelf.'; }
      else {
        txt.name = next.name; txt.price = next.cost + 'c';
        if (it.kind === 'rod') desc = 'Casts ' + pct(next.castMax / cur.castMax) + '% farther and holds fish up to ' + next.maxMass + ' kg (yours: ' + cur.maxMass + ' kg).';
        if (it.kind === 'reel') desc = 'Reels a tired fish in ' + pct(next.speed / cur.speed) + '% faster.';
        if (it.kind === 'line') desc = 'Tension builds ' + Math.round((1 - cur.strength / next.strength) * 100) + '% slower while a fish pulls.';
        txt.status = 'In use: ' + cur.name + '.';
      }
    } else if (it.kind === 'lantern' || it.kind === 'depthFinder') {
      cur = g[it.kind]; txt.name = cur.name;
      desc = it.kind === 'lantern' ? 'Deep fish show in colour at night, not just as shapes.' : 'Marks the depth every ' + cur.bands + ' m while the lure is down.';
      if (save.gear[it.kind]) txt.status = 'Yours already.'; else txt.price = cur.cost + 'c';
    } else {
      var b = E.baitById(it.id, G.data), have = save.baits[b.id] || 0, on = E.baitInUse(save, G.data).id === b.id;
      txt.name = b.label === false ? '(no label)' : b.name;
      if (b.unlimited) desc = 'Free, and they never run out. Most fish take them.';
      else {
        txt.price = b.pack + ' for ' + b.pack * b.cost + 'c';
        if (b.label === false) desc = 'No label. The jar is warm.';
        else desc = 'Fish turn up ' + pct(b.attract) + '% sooner' + (b.rareBoost > 1 ? ', and rare ones are ' + pct(b.rareBoost) + '% likelier.' : '.');
      }
      txt.status = (b.unlimited ? '' : 'You have ' + have + '. ') + (on ? 'On the hook.' : '');
    }
    txt.desc = S.wrap(desc, 182);
  }

  function say(s, key) { txt.msg = s; txt.msgKey = key || 'fog_light'; }

  function act() {
    var it = item(), save = G.state.save, r;
    if (it.kind === 'bait') {
      var b = E.baitById(it.id, G.data);
      if (b.unlimited || (save.gear.bait !== b.id && save.baits[b.id] > 0)) { save.gear.bait = b.id; say('On the hook next cast.'); describe(); return; }
      r = E.buyBait(save, b.id, b.pack, G.data);
      if (r === E.OK) save.gear.bait = b.id;
    } else r = E.buy(save, it.kind, G.data);
    if (r === E.OK) { G.core.save.autosave('purchase'); say('Thank you kindly.', 'neon_teal'); }
    else if (r === E.POOR) say('Not enough coins.', 'signal_amber');
    else if (r === E.MAXED) say('Nothing finer on the shelf.');
    describe();
  }

  function enter() {
    var save = G.state.save;
    if (!room) room = G.gfx.bake.cached('shop:room', function () { return G.gfx.bake.layer(320, 180, paintRoom); });
    row = 0; col = 0; t = 0;
    line = pickLine(save, G.data.dialogue, save.clock);
    speech.length = 0;
    var said = spoken(line);
    for (var i = 0; i < said.length; i++) {
      var ls = S.wrap(said[i], 108);
      for (var k = 0; k < ls.length; k++) speech.push({ s: ls[k], w: S.measure(ls[k]), y: speech.length * S.LINE_H + i * 3, at: 0 });
    }
    // Each line starts revealing when the one before it is done; a repeat waits a beat first.
    var at = 0.3;
    for (i = 0; i < speech.length; i++) {
      if (i > 0 && speech[i].y - speech[i - 1].y > S.LINE_H) at += 1.2;
      speech[i].at = at; at += speech[i].w / REVEAL;
    }
    speechH = speech.length ? speech[speech.length - 1].y + S.LINE_H : 0;
    say('');
    describe();
  }

  function exit() {}

  function update(dt) {
    var save = G.state.save, inp = G.core.input;
    t += dt;
    G.sim.clock.step(save, null, dt, G.rng, G.data);
    uneaseIn.loc = G.state.run.loc;
    G.sim.unease.step(save, uneaseIn, dt, G.rng, G.data);
    if (inp.pressed('back') || inp.pressed('map')) { G.core.state.change('sailing'); return; }
    var ud = M.axis('up', 'down'), lr = M.axis('left', 'right');
    if (ud || lr) {
      row = (row + ud + SHELVES.length) % SHELVES.length;
      col = Math.max(0, Math.min(SHELVES[row].length - 1, col + lr));
      say('');
      describe();
    }
    if (inp.pressed('action')) act();
  }

  function draw(ctx) {
    var save = G.state.save, i;
    ctx.drawImage(room, 0, 0);
    for (var r = 0; r < SHELVES.length; r++) {
      for (var c = 0; c < SHELVES[r].length; c++) {
        var it = SHELVES[r][c], d = S.get(it.spr), x = SLOT_X + c * SLOT_W, owned = (it.kind === 'lantern' || it.kind === 'depthFinder') && save.gear[it.kind];
        if (r === row && c === col) {
          ctx.globalAlpha = 0.5; ctx.fillStyle = P.wood_hi; ctx.fillRect(x - 10, SHELF_Y[r] - d.h - 4, 20, d.h + 4); ctx.globalAlpha = 1;
          ctx.fillStyle = P.signal_amber; ctx.fillRect(x - 10, SHELF_Y[r] + 5, 20, 1);
        }
        if (owned) ctx.globalAlpha = 0.4;
        S.draw(ctx, it.spr, x - (d.w >> 1), SHELF_Y[r] - d.h, 0, false);
        ctx.globalAlpha = 1;
      }
    }
    // Keeper, blinking now and then (a fixed rhythm; no RNG in draw).
    S.draw(ctx, 'shopkeeper', KEEPER_X, KEEPER_Y, (t % 4.3) > 4.15 ? 1 : 0, false); // stands just behind the counter

    // Speech, revealed left to right.
    if (speech.length) {
      var by = KEEPER_Y - 6 - speechH - 6;
      M.panel(ctx, 202, by, 114, speechH + 6, 'stone', 'ink');
      ctx.fillStyle = P.ink; ctx.fillRect(KEEPER_X + 4, by + speechH + 6, 3, 2);
      for (i = 0; i < speech.length; i++) {
        var sp = speech[i], w = Math.min(sp.w + 1, Math.max(0, (t - sp.at) * REVEAL));
        if (w <= 0) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(205, by + 3 + sp.y, w, S.LINE_H); ctx.clip();
        S.drawText(ctx, sp.s, 205, by + 3 + sp.y, line.kind === 'reverse' ? 'dusk_rose' : 'bone');
        ctx.restore();
      }
    }

    // Item panel.
    M.panel(ctx, 6, 124, 190, 52, 'stone', 'ink');
    S.drawText(ctx, txt.name, 10, 127, 'bone');
    if (txt.price) S.drawText(ctx, txt.price, 192 - S.measure(txt.price), 127, 'signal_amber');
    for (i = 0; i < txt.desc.length && i < 3; i++) S.drawText(ctx, txt.desc[i], 10, 137 + i * S.LINE_H, 'fog_light');
    S.drawText(ctx, txt.msg || txt.status, 10, 166, txt.msg ? txt.msgKey : 'fog_mid');

    if (save.coins !== lastCoins) { lastCoins = save.coins; txt.coins = '' + save.coins; }
    S.draw(ctx, 'hud_coin', 206, 159, 0, false);
    S.drawText(ctx, txt.coins, 212, 158, 'paper');
    S.drawText(ctx, 'SPACE buy  ESC leave', 316 - S.measure('SPACE buy  ESC leave'), 170, 'fog_mid');
  }

  return {
    enter: enter, exit: exit, update: update, draw: draw, pickLine: pickLine, spoken: spoken,
    line: function () { return line; },
    select: function (r, c) { row = r; col = c; describe(); return txt.name; },
    act: function () { act(); return txt.msg; },
    text: function () { return txt; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var f = G.state.save && G.state.save.flags, l = G.ui.shop.line();
  if (!f) return 'shop: -';
  return 'shop visits ' + f.shopVisits + '  special said ' + Object.keys(f.lines).join(',') + (l && G.core.state.sceneName() === 'shop' ? '  now ' + (l.id || 'small') : '');
});
