var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The setup panel (Phase 45, PLAN_TACKLE.md 2.5): S on the boat, with the line out of the
// water, opens a small panel (G.ui.panel) with two columns: Rod (the rods you own, their power
// and action as two tiny bars, the heaviest fish they hold) and Hook (worms, the baits and
// lures you have, with their counts); Phase 53: and Line (the kinds of line you own: mono,
// fluorocarbon, braid). It is not an overlay: the world goes on behind it (the
// boat drifts, the clock runs); the sailing scene gives it the keys while it is open and does
// not sail or cast. ↑/↓ (and W) move, A/D or ←/→ switch column, Space picks, S or Esc closes.
// A pick goes into save.gear at once (rod, bait, line type), so the next cast uses it;
// what changed is kept for the scene, which plays the fisher's short act for it (changes()).
G.ui = G.ui || {};
G.ui.setup = (function () {
  var S = G.gfx.sprites, F = S.fine;
  var ROWS = 6, GAP = 6, BAR = 3, ICON_W = 46; // rows shown per column; px between the columns; px a bar cell takes
  var POWER = ['ultralight', 'light', 'medium light', 'medium', 'medium heavy', 'heavy'];
  var ACTION = ['slow', 'moderate', 'moderate fast', 'fast', 'extra fast'];
  var on = false, col = 0, sel = [0, 0, 0], top = 0, COLS = 3;
  var rods = [], hooks = [], lines = [];         // rod indices owned; hook ids shown; line type ids owned (Phase 53)
  var took = { rod: false, hook: false, rod0: 0, hook0: '' };
  var R = [0, 0, 0, 0];                          // the panel's bounds
  var L = { rodW: 0, hookW: 0, hookX: 0, nameW: 0, hookNameW: 0, lineW: 0, lineX: 0 };
  var W_MAX = 320; // Phase 53: three columns need more than the small panel's MAX_W
  var msg = '', posTop = -1, posLen = -1, posStr = '';

  function E() { return G.sim.economy; }
  function name(b) { return b.label === false ? '(no label)' : b.name; }
  // How many of a hook item are left: -1 without limit.
  function left(save, b) { return b.unlimited ? -1 : (save.baits[b.id] | 0); }
  function usable(save, b) { return b.unlimited || save.baits[b.id] > 0; }

  // The lists: the rods owned in the rack's order (the shop's), and worms, then every bait and
  // lure you have, then the one on the hook if it ran out (greyed, so you see it is gone).
  function build(save) {
    var g = G.data.gear, i, b;
    rods.length = 0; hooks.length = 0; lines.length = 0;
    for (i = 0; i < g.rods.length; i++) if (E().ownsRod(save, i)) rods.push(i);
    for (i = 0; i < g.lineTypes.length; i++) if (E().ownsLineType(save, g.lineTypes[i].id)) lines.push(g.lineTypes[i].id);
    var all = g.baits.concat(g.lures || []);
    for (i = 0; i < all.length; i++) {
      b = all[i];
      if (usable(save, b) || b.id === save.gear.bait) hooks.push(b.id);
    }
  }

  function layout() {
    var g = G.data.gear, U = G.ui.panel, i, w;
    L.nameW = 0; L.hookNameW = 0;
    var kgW = 0;
    for (i = 0; i < rods.length; i++) { L.nameW = Math.max(L.nameW, F.measure(g.rods[rods[i]].name)); kgW = Math.max(kgW, F.measure(g.rods[rods[i]].maxMass + 'kg')); }
    for (i = 0; i < hooks.length; i++) L.hookNameW = Math.max(L.hookNameW, F.measure(name(E().baitById(hooks[i], G.data))));
    L.rodW = Math.max(F.measureBold('ROD'), L.nameW + 4 + 6 * BAR + 4 + kgW);
    L.hookW = Math.max(F.measureBold('HOOK') + 12, L.hookNameW + 4 + F.measure('x99'));
    L.lineW = F.measureBold('LINE');
    for (i = 0; i < g.lineTypes.length; i++) L.lineW = Math.max(L.lineW, F.measure(g.lineTypes[i].name));
    L.lineW = Math.max(L.lineW, ICON_W); // Phase 73: the hook's icon goes under the lines
    w = Math.min(W_MAX, 2 * U.PAD + 6 + L.rodW + GAP + L.hookW + GAP + L.lineW);
    L.hookX = U.PAD + 3 + L.rodW + GAP;
    L.lineX = L.hookX + L.hookW + GAP;
    var h = U.TAB + U.PAD + U.ROW + ROWS * U.ROW + U.ROW + U.KEY_H + U.PAD;
    U.place(w, h, 'top', R);
    R[2] = w; R[3] = h;
  }

  function cursorTo(save) {
    sel[0] = Math.max(0, rods.indexOf(save.gear.rod));
    sel[1] = Math.max(0, hooks.indexOf(save.gear.bait));
    sel[2] = Math.max(0, lines.indexOf(save.gear.lineType));
    top = Math.max(0, Math.min(sel[1] - ROWS + 1, hooks.length - ROWS));
    if (top < 0) top = 0;
  }

  function open() {
    var save = G.state.save;
    build(save); layout(); cursorTo(save);
    col = 0; msg = ''; on = true;
    took.rod = false; took.hook = false; took.rod0 = save.gear.rod; took.hook0 = save.gear.bait; took.line0 = save.gear.lineType;
  }

  function close() {
    var save = G.state.save;
    on = false;
    took.rod = save.gear.rod !== took.rod0;
    took.hook = save.gear.bait !== took.hook0;
    if (took.rod || took.hook || save.gear.lineType !== took.line0) G.core.save.autosave('setup');
  }

  // Picks the row under the cursor in the active column. Returns true when the gear changed.
  function pick(save) {
    if (col === 0) {
      var i = rods[sel[0]];
      if (save.gear.rod === i) return false;
      E().useRod(save, i);
      return true;
    }
    if (col === 2) { // Phase 53: a line type (spooled at once; no act for it)
      var id = lines[sel[2]];
      if (save.gear.lineType === id) return false;
      E().useLineType(save, id);
      return true;
    }
    var b = E().baitById(hooks[sel[1]], G.data);
    if (!usable(save, b)) { msg = 'None left. Rusty sells more.'; return false; }
    if (save.gear.bait === b.id) return false;
    save.gear.bait = b.id;
    return true;
  }

  // One step while open: the keys go to the panel. Returns false on the step it closes.
  function update() {
    var inp = G.core.input, save = G.state.save;
    if (inp.pressed('back') || inp.pressed('setup')) { close(); return false; }
    var n = col === 0 ? rods.length : (col === 1 ? hooks.length : lines.length);
    var d = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
    if (d && n) { sel[col] = (sel[col] + d + n) % n; msg = ''; }
    var lr = (inp.pressed('right') ? 1 : 0) - (inp.pressed('left') ? 1 : 0);
    if (lr) { col = (col + lr + COLS) % COLS; msg = ''; }
    if (sel[1] < top) top = sel[1];
    if (sel[1] >= top + ROWS) top = sel[1] - ROWS + 1;
    if (inp.pressed('action')) pick(save);
    return true;
  }

  // What the cursor is on, said in a line under the columns.
  function detail(save) {
    if (msg) return msg;
    if (col === 0) {
      var r = G.data.gear.rods[rods[sel[0]]];
      return r.power + ', ' + ACTION[r.action] + ' action';
    }
    if (col === 2) return LINE_SAYS[lines[sel[2]]] || '';
    var b = E().baitById(hooks[sel[1]], G.data);
    if (!usable(save, b)) return 'None left.';
    if (!E().isLure(b.id, G.data)) return b.unlimited ? 'Live bait. Never runs out.' : 'Live bait. One a cast.';
    return (SWIM_SAYS[b.vary || b.swim] || 'A lure.') + ' ' + b.sizes[0] + (b.sizes.length > 1 ? '-' + b.sizes[b.sizes.length - 1] : ''); // Phase 69: its action and sizes
  }
  var SWIM_SAYS = { mid: 'Swims mid water.', dive: 'Dives as you reel.', top: 'Stays on the top.', lift: 'Sinks fast, lifts and falls.',
    float: 'A worm under a float.', flutter: 'Falls fluttering.', dropshot: 'Worm held over a weight.', wacky: 'Sinks slow and level.',
    glide: 'Glides side to side.', rattle: 'Lift it sharp; it shivers.', kick: 'Its paddle tail kicks.' };

  var LINE_SAYS = { mono: 'Stretches and forgives. Fish see it.', fluoro: 'Shy fish cannot see it. Sinks.', braid: 'No stretch: every touch shows. Seen.' };

  // Two tiny bars: power above, action below, n of max cells lit.
  function bars(ctx, x, y, p, a) {
    var P = S.PALETTE, i;
    for (i = 0; i < 6; i++) { ctx.fillStyle = P[i <= p ? 'teal_lit' : 'fog_dark']; ctx.fillRect(x + i * BAR, y + 1, BAR - 1, 2); }
    for (i = 0; i < 5; i++) { ctx.fillStyle = P[i <= a ? 'signal_amber' : 'fog_dark']; ctx.fillRect(x + i * BAR, y + 5, BAR - 1, 2); }
  }

  function draw(ctx) {
    if (!on) return;
    var U = G.ui.panel, save = G.state.save, g = G.data.gear, x = R[0], y = R[1], i, ry, key;
    G.core.view.begin(ctx, true);
    U.frame(ctx, x, y, R[2], R[3], 'TACKLE');
    var cx0 = x + U.PAD + 3, cx1 = x + L.hookX, ty = U.top(y);
    F.bold(ctx, 'ROD', cx0, ty, col === 0 ? 'bone' : 'fog_mid');
    F.bold(ctx, 'HOOK', cx1, ty, col === 1 ? 'bone' : 'fog_mid');
    var cx2 = x + L.lineX;
    F.bold(ctx, 'LINE', cx2, ty, col === 2 ? 'bone' : 'fog_mid');
    ty += U.ROW;
    for (i = 0; i < rods.length && i < ROWS; i++) {
      var r = g.rods[rods[i]], inUse = save.gear.rod === rods[i];
      ry = ty + i * U.ROW;
      if (col === 0 && i === sel[0]) U.row(ctx, cx0 - 3, ry, L.rodW + 6);
      key = inUse ? 'signal_amber' : 'fog_light';
      F.drawText(ctx, r.name, cx0, ry, key);
      bars(ctx, cx0 + L.nameW + 4, ry, POWER.indexOf(r.power), r.action);
      var kg = r.maxMass + 'kg';
      F.drawText(ctx, kg, cx0 + L.rodW - F.measure(kg), ry, inUse ? 'signal_amber' : 'fog_mid');
    }
    for (i = 0; i < ROWS && top + i < hooks.length; i++) {
      var b = E().baitById(hooks[top + i], G.data), n = left(save, b), ok = usable(save, b);
      ry = ty + i * U.ROW;
      if (col === 1 && top + i === sel[1]) U.row(ctx, cx1 - 3, ry, L.hookW + 6);
      key = !ok ? 'fog_dark' : (save.gear.bait === b.id ? 'signal_amber' : 'fog_light');
      F.drawText(ctx, name(b), cx1, ry, key);
      if (n >= 0) { var cnt = 'x' + n; F.drawText(ctx, cnt, cx1 + L.hookW - F.measure(cnt), ry, ok ? 'fog_mid' : 'fog_dark'); }
    }
    for (i = 0; i < lines.length; i++) {
      var lt = E().lineTypeById(lines[i], G.data);
      ry = ty + i * U.ROW;
      if (col === 2 && i === sel[2]) U.row(ctx, cx2 - 3, ry, L.lineW + 6);
      F.drawText(ctx, lt.name, cx2, ry, save.gear.lineType === lt.id ? 'signal_amber' : 'fog_light');
    }
    if (top > 0) F.drawText(ctx, '^', cx1 + L.hookW - 10, ty - U.ROW, 'fog_mid'); // more above or below, in the header
    if (top + ROWS < hooks.length) F.drawText(ctx, 'v', cx1 + L.hookW - 4, ty - U.ROW, 'fog_mid');
    if (hooks.length > ROWS) { // Phase 69: which page of the hooks (a tap on the marks turns it)
      if (posTop !== top || posLen !== hooks.length) { posTop = top; posLen = hooks.length; posStr = (((top + ROWS - 1) / ROWS) | 0) + 1 + '/' + Math.ceil(hooks.length / ROWS); }
      F.drawText(ctx, posStr, cx1 + L.hookW - 14 - F.measure(posStr), ty - U.ROW, 'fog_dark');
    }
    // Phase 73: the lure under the cursor in its own art, under the lines (fitted to the room left)
    var hb = hooks[sel[1]];
    if (hb && G.gfx.luregen.has(hb)) {
      var room = (ROWS - lines.length) * U.ROW - 2, ic = G.gfx.luregen.iconImg(hb, L.lineW, room);
      ctx.drawImage(ic, cx2 + ((L.lineW - ic.width) >> 1), ty + lines.length * U.ROW + 1 + ((room - ic.height) >> 1));
    }
    ry = ty + ROWS * U.ROW;
    F.drawText(ctx, detail(save), cx0, ry, msg ? 'signal_amber' : 'fog_light');
    var hx = x + U.PAD, hy = y + R[3] - U.PAD - U.KEY_H;
    hx += U.hint(ctx, 'SPACE', 'pick', hx, hy);
    hx += U.hint(ctx, 'A/D', 'column', hx, hy);
    U.hint(ctx, 'S', 'close', hx, hy);
    G.core.view.begin(ctx, false);
  }

  // Touch and the mouse: a tap on a row moves the cursor there and returns 'action' (the
  // caller presses it, which picks); elsewhere on the panel 'action' too; off it 'setup', which
  // closes it. '' while the panel is shut.
  function tap(gx, gy) {
    if (!on) return '';
    var U = G.ui.panel;
    if (!U.inside(R, gx, gy)) return 'setup';
    var y0 = U.top(R[1]) + U.ROW - 2, i = Math.floor((gy - y0) / U.ROW), cx0 = R[0] + U.PAD, cx1 = R[0] + L.hookX - 3, cx2 = R[0] + L.lineX - 3;
    if (i < 0 && hooks.length > ROWS && gx >= cx1 + L.hookW - 14 && gx < cx1 + L.hookW + 6) { // Phase 69: the ^ v marks page the hooks
      col = 1; msg = '';
      var pg = gx < cx1 + L.hookW - 2 ? -ROWS : ROWS;
      top = Math.max(0, Math.min(hooks.length - ROWS, top + pg)); sel[1] = top;
      return 'none';
    }
    if (i < 0 || i >= ROWS) return 'action';
    if (gx >= cx0 && gx < cx0 + L.rodW + 6 && i < rods.length) { col = 0; sel[0] = i; msg = ''; }
    else if (gx >= cx1 && gx < cx1 + L.hookW + 6 && top + i < hooks.length) { col = 1; sel[1] = top + i; msg = ''; }
    else if (gx >= cx2 && gx < cx2 + L.lineW + 6 && i < lines.length) { col = 2; sel[2] = i; msg = ''; }
    return 'action';
  }

  // dbg.setup(): whether it is open, the column and rows, and what it would show.
  function info() {
    return { open: on, col: col, sel: sel.slice(), top: top, rods: rods.slice(), hooks: hooks.slice(), lines: lines.slice(), rect: R.slice(), detail: on ? detail(G.state.save) : '' };
  }

  return {
    open: open, close: close, update: update, draw: draw, info: info, tap: tap,
    isOpen: function () { return on; },
    // What the last close changed (the scene plays the fisher's act for it), and forgets it.
    changes: function () { var c = { rod: took.rod, hook: took.hook }; took.rod = false; took.hook = false; return c; },
    rect: function () { return R; }
  };
})();
