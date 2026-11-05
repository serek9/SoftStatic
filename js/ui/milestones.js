var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Milestones on screen (Phase 94.1, 94.4, PLAN_PLAYABILITY.md). Three things:
//  - step(dt): twice a second (and at once after a catch is written) G.sim.milestones.check runs
//    on the save with this sitting's counts (pats of the dog since the page loaded, the most
//    fish from one ice hole); a milestone reached is paid there, autosaved, and queued here.
//  - the HUD's line (94.4): one at a time at the top centre, its mark, its name and +Nc, for 3 s;
//    never while a fish bites or fights, and behind the size badge (G.ui.badge).
//  - the page: an overlay (menu.open('milestones')) from the pause list's Milestones row or M in
//    the journal: each milestone with its mark, its progress (7 / 12) or a tick, and its reward.
G.ui = G.ui || {};
G.ui.milestones = (function () {
  var S = G.gfx.sprites, F = S.fine, P = S.PALETTE;
  var CHECK_S = 0.5, SHOW_S = 3;
  var sess = { pats: 0, holeMax: 0 }, lastPose = '', checkT = 0, queue = [], cur = '', curT = 0, got = [], paidN = 0;
  var PR = [0, 0];

  // 9×9 marks from palette keys: [key, x, y, w, h].
  var MARKS = {
    fish: [['teal_hi', 1, 3, 5, 3], ['teal_hi', 6, 2, 2, 5], ['ink', 2, 4, 1, 1]],
    release: [['water_mid', 0, 6, 9, 2], ['teal_hi', 2, 2, 4, 2], ['teal_hi', 6, 1, 1, 4], ['fog_light', 4, 5, 1, 1]],
    size: [['brass_hi', 2, 0, 5, 9], ['brass_hi', 0, 2, 9, 5], ['rust', 4, 2, 1, 5], ['rust', 3, 6, 3, 1]],
    water: [['water_mid', 0, 4, 9, 5], ['water_hi', 0, 4, 9, 1], ['pine_dark', 3, 0, 3, 4]],
    book: [['paper', 0, 1, 4, 7], ['paper', 5, 1, 4, 7], ['paper_dark', 4, 1, 1, 7], ['wood', 0, 8, 9, 1]],
    trophy: [['brass_hi', 1, 0, 7, 4], ['brass_hi', 3, 4, 3, 2], ['brass_hi', 2, 7, 5, 2], ['rust', 4, 5, 1, 2]],
    dog: [['dog', 1, 3, 6, 4], ['dog', 6, 1, 3, 3], ['dog_hi', 7, 1, 1, 1], ['dog', 1, 7, 1, 2], ['dog', 5, 7, 1, 2]],
    hole: [['ice_hi', 0, 2, 9, 5], ['water_dark', 2, 3, 5, 3], ['ice', 0, 6, 9, 1]],
    pond: [['moss', 0, 6, 9, 3], ['water_mid', 1, 3, 7, 3], ['moss_hi', 0, 1, 1, 5], ['moss_hi', 8, 0, 1, 6]],
    cabin: [['wood', 1, 4, 7, 5], ['rust', 0, 3, 9, 1], ['rust', 2, 2, 5, 1], ['rust', 3, 1, 3, 1], ['lamp_glow', 3, 6, 2, 2]],
    rod: [['wood_hi', 1, 7, 1, 2], ['stone_hi', 2, 5, 2, 2], ['stone_hi', 4, 3, 2, 2], ['stone_hi', 6, 1, 2, 2], ['fog_light', 8, 0, 1, 5]],
    tick: [['moss_lit', 1, 4, 2, 2], ['moss_lit', 3, 6, 2, 2], ['moss_lit', 5, 2, 2, 4], ['moss_lit', 7, 0, 2, 3]]
  };
  function mark(ctx, icon, x, y, alpha) {
    var r = MARKS[icon];
    if (!r) return;
    for (var i = 0; i < r.length; i++) { ctx.fillStyle = P[r[i][0]]; ctx.fillRect(x + r[i][1], y + r[i][2], r[i][3], r[i][4]); }
  }

  function holeMax() {
    var I = G.state.run && G.state.run.ice, n = 0;
    if (I && I.holes) for (var i = 0; i < I.holes.length; i++) if (I.holes[i].catches > n) n = I.holes[i].catches;
    return n;
  }

  // Judges now; returns how many were paid.
  function checkNow() {
    var save = G.state.save;
    if (!save || !G.data.milestones) return 0;
    got.length = 0;
    var n = G.sim.milestones.check(save, G.data, sess, got);
    for (var i = 0; i < got.length; i++) queue.push(got[i]);
    if (n) { paidN += n; G.core.save.autosave('milestone'); }
    return n;
  }

  function step(dt) {
    var run = G.state.run, sc = G.core.state.sceneName && G.core.state.sceneName();
    if (!G.state.save || sc === 'gallery') return;
    var pose = run && run.dog ? run.dog.pose : '';
    if (pose === 'pet' && lastPose !== 'pet') sess.pats++;
    lastPose = pose;
    var hm = holeMax(); if (hm > sess.holeMax) sess.holeMax = hm;
    checkT += dt;
    if (checkT >= CHECK_S) { checkT = 0; checkNow(); }
    // the HUD's line: the next one when nothing bites, fights or shows the badge
    if (curT > 0) curT -= dt;
    else if (queue.length && !busy(run)) { cur = queue.shift(); curT = SHOW_S; G.audio.engine.play('uiOk'); }
  }
  function busy(run) {
    var f = run && run.fsm;
    return (run && run.bite && run.bite.slot >= 0) || f === 'hooked' || f === 'fighting' || f === 'landing' || (G.ui.badge && G.ui.badge.showing());
  }

  // 94.4: drawn by the HUD on its context, at the picture's top centre (under the reach's name).
  var lineStr = '', lineFor = '', lineW = 0;
  function drawLine(ctx, pic, Y) {
    if (curT <= 0 || !cur) return;
    var m = G.sim.milestones.byId(G.data, cur);
    if (!m) return;
    if (lineFor !== cur) { lineFor = cur; lineStr = m.name + '  +' + m.reward + 'c'; lineW = F.measure(lineStr) + 13; }
    var a = Math.min(1, curT * 2, (SHOW_S - curT) * 4), x = pic[0] + ((pic[2] - lineW) >> 1), y = Y + 52;
    ctx.globalAlpha = 0.75 * a; ctx.fillStyle = P.night_ink; ctx.fillRect(x - 6, y - 4, lineW + 12, 16); ctx.globalAlpha = a;
    mark(ctx, m.icon, x, y - 1);
    F.drawText(ctx, lineStr, x + 13, y, 'signal_amber');
    ctx.globalAlpha = 1;
  }

  // ---- The page --------------------------------------------------------------------------------
  var R = [0, 0, 0, 0], lv = -1, top = 0, show = 8, openT = 0, from = '', COLN = 0;
  function lay() {
    var U = G.ui.panel;
    if (lv === U.ver()) return;
    lv = U.ver();
    var L = G.data.milestones, w0 = 0, i, p = U.pic(), touch = U.touch(), rh = U.rowH();
    for (i = 0; i < L.length; i++) w0 = Math.max(w0, F.measure(L[i].name));
    COLN = 14 + w0 + 10;
    var w = Math.min(U.VW() - 16, 2 * U.PAD + COLN + F.measure('99 / 99') + 12 + F.measure('500c')), foot = touch ? U.PAD : U.KEY_H + U.PAD + 2;
    show = Math.max(4, Math.min(L.length, Math.floor((p[3] - 16 - U.TAB - U.PAD - foot) / rh)));
    U.place(w, U.TAB + U.PAD + show * rh + foot, 'top', R); R[2] = w; R[3] = U.TAB + U.PAD + show * rh + foot;
  }
  function count() { var n = 0, L = G.data.milestones; for (var i = 0; i < L.length; i++) if (G.sim.milestones.done(G.state.save, L[i].id)) n++; return n; }
  var head = '', headN = -1;
  function open(arg) { from = arg || ''; lv = -1; lay(); top = 0; openT = G.ui.panel.now(); }
  function back() { if (from === 'journal') G.ui.menu.open('journal'); else G.ui.menu.open('pause', 'Milestones'); }
  function update() {
    var inp = G.core.input, L = G.data.milestones;
    if (inp.pressed('back') || inp.pressed('pause') || inp.pressed('action') || inp.pressed('map') || inp.pressed('journal')) { back(); return true; }
    var d = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
    if (d) top = Math.max(0, Math.min(L.length - show, top + d));
    return true;
  }
  function draw(ctx0) {
    lay();
    var U = G.ui.panel, ctx = U.begin(ctx0), a = U.fadeIn(openT), save = G.state.save, L = G.data.milestones, x = R[0], y = R[1] + Math.round((1 - a) * 4), rh = U.rowH(), i;
    var n = count();
    if (n !== headN) { headN = n; head = n + ' of ' + L.length; }
    ctx.globalAlpha = a;
    U.frame(ctx, x, y, R[2], R[3], 'MILESTONES', head, 'fog_light');
    for (i = 0; i < show && top + i < L.length; i++) {
      var m = L[top + i], ry = U.top(y) + i * rh + ((rh - U.ROW) >> 1), ok = G.sim.milestones.done(save, m.id), lx = U.left(x);
      mark(ctx, ok ? 'tick' : m.icon, lx, ry - 1);
      F.drawText(ctx, m.name, lx + 14, ry, ok ? 'bone' : 'fog_light');
      var pr = G.sim.milestones.progress(save, m, G.data, sess, PR), ps = ok ? 'done' : Math.min(pr[0], pr[1]) + ' / ' + pr[1], rs = m.reward + 'c';
      F.drawText(ctx, ps, lx + COLN, ry, ok ? 'moss_lit' : 'fog_mid');
      F.drawText(ctx, rs, x + R[2] - U.PAD - F.measure(rs), ry, ok ? 'fog_mid' : 'signal_amber');
    }
    if (top > 0) F.drawText(ctx, '^', x + R[2] - U.PAD - 40, U.top(y), 'fog_mid');
    if (top + show < L.length) F.drawText(ctx, 'v', x + R[2] - U.PAD - 40, U.top(y) + (show - 1) * rh, 'fog_mid');
    if (!U.touch()) { var hx = U.left(x), hy = y + R[3] - U.PAD - U.KEY_H; if (show < L.length) hx += U.hint(ctx, 'W/S', 'scroll', hx, hy); U.hint(ctx, 'ESC', 'back', hx, hy); }
    ctx.globalAlpha = 1;
  }
  // A tap: the upper half scrolls up, the lower half down; off the panel, back.
  function tap(gx0, gy0) {
    lay();
    var U = G.ui.panel, gx = U.ux(gx0), gy = U.uy(gy0);
    if (!U.inside(R, gx, gy)) return 'back';
    return gy < R[1] + (R[3] >> 1) ? 'up' : 'down';
  }

  return {
    native: true, open: open, update: update, draw: draw, tap: tap, step: step, drawLine: drawLine, checkNow: checkNow, mark: mark, MARKS: MARKS,
    rect: function () { lay(); return R; },
    // dbg.milestones(): each with done or its progress; this sitting's counts; the queue
    info: function () {
      var L = G.data.milestones, o = [], save = G.state.save;
      for (var i = 0; i < L.length; i++) { var p = G.sim.milestones.progress(save, L[i], G.data, sess, PR); o.push(L[i].id + ' ' + (G.sim.milestones.done(save, L[i].id) ? 'done' : p[0] + '/' + p[1])); }
      return { list: o, done: count(), of: L.length, sess: { pats: sess.pats, holeMax: sess.holeMax }, showing: curT > 0 ? cur : '', queue: queue.slice(), paid: paidN };
    }
  };
})();
