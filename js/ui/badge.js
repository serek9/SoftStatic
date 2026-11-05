var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The size badge (Phase 94.3, PLAN_PLAYABILITY.md, after Cast n Chill's): when a catch is a size
// class not caught before for its species, or beats the species' record, a badge rises over the
// card before its keys: a round brass medallion with the fish's portrait and the size letter,
// the species' name, NEW SIZE: L or NEW RECORD, its length and weight, and the old best in small
// type (was 31.2 cm). A soft chime; it rises in RISE s, holds HOLD s, then settles into the
// card's corner as a small medallion. Any key or tap settles it at once, and the card's keys
// work all the while (§0.14: it never blocks). A trophy weight has a gold rim. The journal's
// tiles use medal() for the highest size caught. Drawing only reads; show() and step() change.
G.ui = G.ui || {};
G.ui.badge = (function () {
  var S = G.gfx.sprites, F = S.fine, P = S.PALETTE;
  var RISE = 0.25, HOLD = 1.6, BW = 196, BH = 62, MED = 44, SMALL = 15;
  var b = { on: false, t: 0, settled: false, kind: '', cls: '', sp: -1, name: '', size: '', was: '', trophy: false, shown: 0 };

  // A medallion of diameter d, baked per size, rim and letter: a disc in brass, lit at the top
  // left, a darker ring inside the rim (rim: 'brass' or 'gold' for a trophy).
  var cache = {};
  function disc(d, rim) {
    var k = d + rim;
    if (cache[k]) return cache[k];
    return (cache[k] = G.gfx.bake.layer(d, d, function (c) {
      var r = d / 2, keys = rim === 'gold' ? ['rust', 'lamp_glow', 'brass_hi', 'leaf_gold'] : ['outline', 'rust', 'brass_hi', 'leaf_gold'];
      for (var y = 0; y < d; y++) for (var x = 0; x < d; x++) {
        var dx = x + 0.5 - r, dy = y + 0.5 - r, q = Math.sqrt(dx * dx + dy * dy);
        if (q > r) continue;
        var key = q > r - 1 ? keys[0] : (q > r - 2.2 ? keys[1] : (q > r - 3.2 ? keys[2] : ((dx + dy) < -r * 0.6 ? keys[2] : keys[3])));
        c.fillStyle = P[key]; c.fillRect(x, y, 1, 1);
      }
    }));
  }
  // A medallion with its size letter, at x, y (top left). Used by the journal's tiles too.
  function medal(ctx, cls, x, y, d, trophy) {
    ctx.drawImage(disc(d, trophy ? 'gold' : 'brass'), x, y);
    if (!cls) return;
    var w = F.measureBold(cls);
    if (w <= d - 3) F.bold(ctx, cls, x + ((d - w) >> 1), y + ((d - F.FONT_H) >> 1), 'rust_dark');
    else { w = F.measure(cls); F.drawText(ctx, cls, x + ((d - w) >> 1), y + ((d - F.FONT_H) >> 1), 'rust_dark'); } // XXL on a small medallion
  }

  function fmtW(w) { return w < 0.1 ? Math.round(w * 1000) + ' g' : w.toFixed(2) + ' kg'; }

  // Called by the card as it opens, with the card's info and the journal entry as it was before
  // this catch. Returns true when a badge shows.
  function show(info, j) {
    b.on = false;
    if (!info || info.trash !== undefined || info.spIdx === undefined) return false;
    var cls = G.data.SIZE_CLASSES[G.data.sizeClass(info.w)].id, newSize = !j || !j.caught || !j.sizes || j.sizes.indexOf(cls) < 0;
    var record = !!j && j.caught > 0 && info.w > j.bestW;  // as the card's RECORD
    if (!newSize && !record) return false;
    b.on = true; b.t = 0; b.settled = false; b.kind = newSize ? 'NEW SIZE: ' + cls : 'NEW RECORD'; b.cls = cls; b.sp = info.spIdx;
    b.name = G.data.fish[info.spIdx].name; b.size = info.len.toFixed(1) + ' cm   ' + fmtW(info.w);
    b.was = j && j.caught ? 'was ' + j.bestLen.toFixed(1) + ' cm' : 'the first';
    b.trophy = !!info.trophy; b.shown++;
    G.audio.engine.play('badge');
    return true;
  }
  function hide() { b.on = false; }

  // One step while the card shows: time, and a key or tap settles it.
  function step(dt) {
    if (!b.on) return;
    b.t += dt;
    if (!b.settled && b.t > 0.05 && G.core.input.any()) b.settled = true;
    if (b.t >= RISE + HOLD) b.settled = true;
  }
  function showing() { return b.on && !b.settled; }

  // Drawn by the card on its context over the card (cx, cy: the card's top left, cw its width).
  function draw(ctx, cx, cy, cw) {
    if (!b.on) return;
    var st = G.state.save && G.state.save.settings, still = st && st.reduceMotion;
    if (b.settled) { medal(ctx, b.cls, cx + cw - SMALL - 4, cy + 3, SMALL, b.trophy); return; } // in the card's corner
    var u = still ? 1 : Math.min(1, b.t / RISE), e = 1 - (1 - u) * (1 - u), x = cx + ((cw - BW) >> 1), y = cy + 14 + Math.round((1 - e) * 24);
    var U = G.ui.panel;
    ctx.globalAlpha = still ? 1 : Math.min(1, u * 1.5);
    U.frame(ctx, x, y - U.TAB, BW, BH + U.TAB, '');                                 // no tab: the body from y
    medal(ctx, '', x + 6, y + ((BH - MED) >> 1), MED, b.trophy);
    var img = G.gfx.fishgen.portrait(b.sp, MED - 10, MED - 18, false);
    ctx.drawImage(img, x + 6 + ((MED - img.width) >> 1), y + ((BH - MED) >> 1) + 6 + ((MED - 18 - img.height) >> 1));
    var lw = F.measureBold(b.cls) + 6;                                                // the letter on a ribbon under the fish
    ctx.fillStyle = P.rust_dark; ctx.fillRect(x + 6 + ((MED - lw) >> 1), y + ((BH - MED) >> 1) + MED - 14, lw, F.FONT_H + 2);
    F.bold(ctx, b.cls, x + 6 + ((MED - lw) >> 1) + 3, y + ((BH - MED) >> 1) + MED - 13, 'leaf_gold');
    var tx = x + MED + 14, ty = y + 8;
    F.bold(ctx, b.name, tx, ty, 'bone');
    F.bold(ctx, b.kind, tx, ty + 13, b.kind === 'NEW RECORD' ? 'teal_lit' : 'signal_amber');
    F.drawText(ctx, b.size, tx, ty + 27, 'fog_light');
    F.drawText(ctx, b.was, tx, ty + 39, 'fog_mid');
    ctx.globalAlpha = 1;
  }

  // The gallery's badge page: a badge drawn as it holds, from st {sp, cls, kind, size, was, trophy}
  // (the module's own badge is put back as it was).
  var keep = {};
  function preview(ctx, cx, cy, cw, st) {
    var k;
    for (k in b) keep[k] = b[k];
    b.on = true; b.settled = false; b.t = RISE; b.sp = st.sp; b.cls = st.cls; b.kind = st.kind; b.size = st.size; b.was = st.was; b.trophy = !!st.trophy; b.name = G.data.fish[st.sp].name;
    draw(ctx, cx, cy, cw);
    for (k in keep) b[k] = keep[k];
  }

  return { show: show, hide: hide, step: step, draw: draw, medal: medal, showing: showing, preview: preview, RISE: RISE, HOLD: HOLD,
    info: function () { return { on: b.on, settled: b.settled, rising: b.on && !b.settled, kind: b.kind, cls: b.cls, name: b.name, size: b.size, was: b.was, trophy: b.trophy, shown: b.shown, t: +b.t.toFixed(2) }; } };
})();
