var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The title (Phase 130, the user 2026-11-17: "sci-fi liminal letters ... saying the title of the
// game, related to the static of VHS, for the beginning of the game; always compatible with the
// phone"). An overlay (G.ui.menu, so the world waits under it) opened once at boot: the lake's
// first frame under a tape's playback. It comes up out of snow with TRACKING in the corner, then
// SOFTSTATIC in tall hollow serif capitals, wide apart, pale with a cyan glow and the red and
// cyan of a tape's colour bleed, a band of tracking noise rolling down through it, and now and
// then a glitch that slides strips of the letters sideways. The deck's on-screen display: PLAY
// and its arrow, SP and the tape's counter, the clock blinking 12:00 as an unset VCR's does.
// Space, Esc, any key or a tap (the phone) and the snow swells and clears into the lake.
// Everything is in the picture's own 640×360 pixels (so a phone shows it whole, scaled), palette
// keys only, the letters painted from shapes (no fillText) and the words in the bitmap font.
// Visual and input only: the noise comes from a hash, the time from the overlay's own clock.
// Skipped with ?seed (the test bots) or ?notitle; dbg.title() opens it again.
G.ui = G.ui || {};
G.ui.title = (function () {
  var S = G.gfx.sprites, P = S.PALETTE, F = S.fine;
  var CAP = 54, GAP = 13, TY = 112;                 // the capitals' height, the space between them, their top
  var IN_S = 2.4, OUT_S = 0.55, GUARD = 0.5;        // the snow settling, the clearing, a press ignored at first
  var t = 0, out = -1, word = null, glyphs = null, noise = null, lines = null;

  // ---- The letters ---------------------------------------------------------------------------
  // Each a filled shape on a mask (thick stems, thin hairlines, small bracketed serifs), drawn
  // later as its outline only: hollow letters like a sign's neon tubes switched off.
  function mask(w, h) { return { w: w, h: h, a: new Uint8Array(w * h) }; }
  function set(m, x, y) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.a[y * m.w + x] = 1; }
  function rect(m, x, y, w, h) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) set(m, xx, yy); }
  // A stroke from (x0, y0) to (x1, y1), w px wide across, filled row by row.
  function stroke(m, x0, y0, x1, y1, w) {
    for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      var u = y1 === y0 ? 0 : (y - y0) / (y1 - y0), xc = x0 + (x1 - x0) * u;
      for (var x = Math.round(xc - w / 2); x < Math.round(xc + w / 2); x++) set(m, x, y);
    }
  }
  // A bracketed serif: a foot bar of half width hw at row y (dir 1 at the top, -1 at the foot),
  // curving into a stem of half width sw at cx.
  function serif(m, cx, y, hw, sw, dir) {
    for (var k = 0; k < 5; k++) { var e = k < 2 ? hw : sw + Math.round((hw - sw) * Math.pow(1 - (k - 1) / 4, 2.2)); for (var x = cx - e; x < cx + e; x++) set(m, x, y + dir * k); }
  }
  // An elliptical ring: thick at the sides (th), thin at the top and foot (tv); keep(a) says which
  // angles (radians, 0 right, down positive) stay.
  function ring(m, cx, cy, rx, ry, th, tv, keep) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, o = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry), i = (dx * dx) / ((rx - th) * (rx - th)) + (dy * dy) / ((ry - tv) * (ry - tv));
      if (o <= 1 && i > 1 && (!keep || keep(Math.atan2(dy, dx)))) set(m, x, y);
    }
  }
  var H = CAP, ST = 7, HL = 2, SH = 8;               // the cap height, a stem, a hairline, a serif's half width
  var DRAW = {
    I: function () { var m = mask(22, H), c = 11; rect(m, c - ST / 2 | 0, 0, ST, H); serif(m, c, 0, SH, ST / 2, 1); serif(m, c, H - 1, SH, ST / 2, -1); return m; },
    T: function () {
      var w = 40, m = mask(w, H), c = w >> 1; rect(m, 0, 0, w, HL + 1); rect(m, c - (ST >> 1), 0, ST, H); serif(m, c, H - 1, SH + 1, ST / 2, -1);
      for (var k = 0; k < 10; k++) { var e = Math.max(1, 3 - (k >> 2)); rect(m, 0, k, e, 1); rect(m, w - e, k, e, 1); }   // the bar's ends turn down
      return m;
    },
    F: function () {
      var w = 34, m = mask(w, H), x0 = 5; rect(m, x0, 0, ST, H); rect(m, 0, 0, w - 1, HL + 1); serif(m, x0 + 3, H - 1, SH + 1, ST / 2, -1);
      rect(m, 0, 0, x0 + 1, HL + 1); rect(m, x0, (H >> 1) - 1, w - 12, HL + 1);
      for (var k = 0; k < 11; k++) rect(m, w - 3, k, Math.max(1, 3 - (k >> 2)), 1);                    // the top bar's end
      for (k = -5; k <= 5; k++) rect(m, x0 + w - 13, (H >> 1) + k, Math.abs(k) < 3 ? 2 : 1, 1);        // the middle bar's end
      return m;
    },
    A: function () {
      var w = 46, m = mask(w, H), c = w >> 1;
      stroke(m, c - 1, 0, 6, H - 1, HL + 1);                                                             // the thin left leg
      stroke(m, c, 0, w - 8, H - 1, ST + 1);                                                             // the thick right leg
      rect(m, c - 3, 0, 5, 2);                                                                           // the apex
      var by = Math.round(H * 0.64); for (var x = 0; x < w; x++) { var l = c - 1 + (6 - (c - 1)) * by / (H - 1), r = c + (w - 8 - c) * by / (H - 1); if (x > l && x < r) rect(m, x, by, 1, HL); }
      rect(m, 0, H - 2, 13, 2); rect(m, w - 16, H - 2, 16, 2);                                           // the feet
      return m;
    },
    O: function () { var m = mask(44, H); ring(m, 22, H / 2, 22, H / 2, ST + 1, HL, null); return m; },
    C: function () {
      var w = 40, m = mask(w, H), cx = 22, cy = H / 2, cut = 0.62;
      ring(m, cx, cy, 21, H / 2, ST + 1, HL, function (a) { return Math.abs(a) > cut; });
      for (var k = 0; k < 13; k++) { rect(m, w - 5, k + 1, 2 + (k < 6 ? 1 : 0), 1); rect(m, w - 5, H - 2 - k, 2 + (k < 6 ? 1 : 0), 1); } // the barbs at the ends
      return m;
    },
    S: function () {
      var w = 34, m = mask(w, H), cx = 17, hy = H * 0.26, ly = H * 0.74, rxu = 14.5, rxl = 16, ryu = H * 0.26, ryl = H * 0.26;
      // the upper bowl: from its top right round the top and the left down to the middle
      ring(m, cx, hy, rxu, ryu, ST, HL, function (a) { return a < -0.55 || a > Math.PI / 2; });
      // the lower bowl: from the middle round the right and the foot to its bottom left
      ring(m, cx, ly, rxl, ryl, ST, HL, function (a) { return a > -Math.PI / 2 && a < 2.55; });
      stroke(m, cx - 9, Math.round(H * 0.36), cx + 9, Math.round(H * 0.64), 4);                          // the spine
      for (var k = 0; k < 10; k++) { rect(m, w - 5, 2 + k, 2, 1); rect(m, 2, H - 3 - k, 2, 1); }          // the barbs
      return m;
    }
  };
  // The outline of a mask: its pixels that touch the outside.
  function edge(m, x, y) { return x < 0 || y < 0 || x >= m.w || y >= m.h || !m.a[y * m.w + x]; }
  function bakeWord(s) {
    var ms = [], w = 0, i;
    for (i = 0; i < s.length; i++) { var g = DRAW[s[i]](); ms.push(g); w += g.w + (i ? GAP : 0); }
    var W = w + 8, Hh = H + 8, fillC = G.gfx.bake.canvas(W, Hh), lineC = {}, glowC = G.gfx.bake.canvas(W, Hh), keys = ['bone', 'neon_red', 'neon_teal'];
    for (i = 0; i < keys.length; i++) lineC[keys[i]] = G.gfx.bake.canvas(W, Hh);
    var x0 = 4, fc = fillC.getContext('2d'), gc = glowC.getContext('2d');
    fc.fillStyle = P.night_ink; gc.fillStyle = P.crt_glow;
    for (i = 0; i < ms.length; i++) {
      var m = ms[i];
      for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
        if (!m.a[y * m.w + x]) continue;
        fc.fillRect(x0 + x, 4 + y, 1, 1);
        if (edge(m, x - 1, y) || edge(m, x + 1, y) || edge(m, x, y - 1) || edge(m, x, y + 1)) {
          for (var k = 0; k < keys.length; k++) { var c = lineC[keys[k]].getContext('2d'); c.fillStyle = P[keys[k]]; c.fillRect(x0 + x, 4 + y, 1, 1); }
          gc.fillRect(x0 + x - 2, 4 + y - 2, 5, 5);
        }
      }
      x0 += m.w + GAP;
    }
    return { w: W, h: Hh, fill: fillC, line: lineC, glow: glowC };
  }

  // ---- The tape ------------------------------------------------------------------------------
  // Snow: three frames at half size (a coarse grain, as a tape's), from a hash; and the scanlines.
  function bakeNoise() {
    var out = [], hash = S.hash, KEYS = ['fog_light', 'fog_mid', 'fog_dark', 'ink'];
    for (var f = 0; f < 3; f++) {
      out.push(G.gfx.bake.layer(320, 180, function (c) {
        for (var y = 0; y < 180; y++) {
          var row = hash(y, f * 977 + 13) % 100, bright = row < 7;                                   // now and then a brighter streak
          for (var x = 0; x < 320; x++) {
            var r = hash(x + f * 331, y * 7 + f * 53) % 100;
            var k = r < (bright ? 26 : 9) ? 0 : (r < (bright ? 44 : 22) ? 1 : (r < 40 ? 2 : (r < 52 ? 3 : -1)));
            if (k < 0) continue;
            c.fillStyle = P[KEYS[k]]; c.fillRect(x, y, 1, 1);
          }
        }
      }));
    }
    return out;
  }
  function bakeLines() { return G.gfx.bake.layer(640, 360, function (c) { c.fillStyle = P.ink; for (var y = 1; y < 360; y += 2) c.fillRect(0, y, 640, 1); }); }

  // Phase 134 (PLAN_UX.md): the tape's own menu under the letters, a VCR's: PLAY (CONTINUE once
  // a fish has been caught), SETTINGS, CONTROLS. W/S move; any other key, the action or a tap off
  // the rows does the chosen row, PLAY by default, so one key still plays as before. SETTINGS
  // and CONTROLS open their pages over the tape and come back to it (back = true).
  var ROWS = ['PLAY', 'SETTINGS', 'CONTROLS'], sel = 0, back = false, ROW_Y = 252, ROW_H = 16, ROW_W = 120;
  var hush = false;                                 // Phase 134: keys from the page just closed are ignored until released
  var woke0 = false;                                // the page's first touch only wakes it (input.js 90.4): on the title it plays too
  function first() { var j = G.state.save && G.state.save.journal, k; for (k in j) if (j[k].caught) return false; return true; }
  function open(arg) {
    if (arg === 'back') { t = IN_S + 0.5; out = -1; woke0 = true; hush = true; return; } // back from a page: the tape already settled; wait for the keys to lift
    t = 0; out = -1; woke0 = G.core.input.woke(); sel = 0; ROWS[0] = first() ? 'PLAY' : 'CONTINUE';
  }
  function close() { if (out < 0) { out = 0; if (G.audio && G.audio.engine) G.audio.engine.play('uiOk'); } }
  function choose(i) {
    if (i === 0) { close(); return true; }
    back = true; G.audio.engine.play('uiOk');
    G.ui.menu.open(i === 1 ? 'pause' : 'controls', i === 1 ? '@settings' : 'title');
    return false;
  }
  function update(dt) {
    var inp = G.core.input;
    t += dt;
    if (out >= 0) { out += dt; return out < OUT_S; }
    if (t <= GUARD) return true;
    if (hush) { if (inp.any()) return true; hush = false; }
    if (!woke0 && inp.woke()) { close(); inp.releaseAll(); return true; }
    var d = (inp.pressed('down') ? 1 : 0) - (inp.pressed('up') ? 1 : 0);
    if (d) { sel = (sel + d + ROWS.length) % ROWS.length; G.audio.engine.play('uiMove'); inp.releaseAll(); return true; }
    if (inp.pressed('up') || inp.pressed('down') || inp.held('up') || inp.held('down')) return true;
    if (inp.any() || inp.pressed('action') || inp.pressed('back') || inp.pressed('pause')) {
      var go = inp.pressed('back') || inp.pressed('pause') ? 0 : sel;
      inp.releaseAll();
      return choose(go) || out >= 0;
    }
    return true;
  }
  // Called by the menu when an overlay the title opened has closed: back to the tape.
  function returned() { if (!back) return false; back = false; return true; }

  // ---- Drawing -------------------------------------------------------------------------------
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  function osd(ctx, s, x, y, key) { F.drawText(ctx, s, x + 1, y + 1, 'ink'); F.drawText(ctx, s, x, y, key); }
  function draw(ctx) {
    if (!word) { word = bakeWord('SOFTSTATIC'); noise = bakeNoise(); lines = bakeLines(); }
    var settle = ease(t / IN_S), clear = out >= 0 ? ease(out / OUT_S) : 0, i, fr = Math.floor(t * 18) % 3;
    var cover = (1 - clear);
    // The lake's frame, dark and grey, as played back.
    ctx.globalAlpha = 0.78 * cover; ctx.fillStyle = P.night_ink; ctx.fillRect(0, 0, 640, 360);
    ctx.globalAlpha = 0.1 * cover; ctx.fillStyle = P.crt_dark; ctx.fillRect(0, 0, 640, 360);
    // Snow: thick while it finds the tracking, thin once it has, a burst as it clears.
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, (0.9 - 0.78 * settle) + (out >= 0 ? 0.7 * Math.sin(Math.PI * Math.min(1, out / OUT_S)) : 0)) * (out >= 0 ? 1 - 0.6 * clear : 1);
    ctx.drawImage(noise[fr], 0, 0, 640, 360);
    // The tracking band rolling down.
    var by = Math.round(((t * 34) % 470) - 60), bh = 16;
    ctx.globalAlpha = 0.4 * cover; ctx.drawImage(noise[(fr + 1) % 3], 0, Math.max(0, by >> 1), 320, bh >> 1, 0, by, 640, bh);
    ctx.globalAlpha = 0.3 * cover; ctx.fillStyle = P.fog_light; ctx.fillRect(0, by + bh - 2, 640, 1);
    ctx.globalAlpha = 0.22 * cover; ctx.drawImage(lines, 0, 0);
    ctx.globalAlpha = 1;
    // The letters: in from the snow, the glow, the colour bleed, the strips a glitch slides.
    var a = ease((t - 0.7) / 1.4) * cover;
    if (a > 0) {
      var x = (640 - word.w) >> 1, y = TY, gl = glitch(t), split = 1 + (gl > 0 ? 2 : 0) + Math.round(1 - settle);
      ctx.globalAlpha = 0.55 * a; ctx.drawImage(word.fill, x, y);
      ctx.globalAlpha = (0.1 + 0.04 * Math.sin(t * 2.3)) * a; ctx.drawImage(word.glow, x, y);
      for (var sy = 0; sy < word.h; sy += 3) {
        var off = 0, row = y + sy;
        if (gl > 0) off = (S.hash(sy, Math.floor(t * 20)) % 9) - 4;
        if (row >= by && row < by + bh) off += 2;                                                       // the band drags the letters
        ctx.globalAlpha = 0.45 * a; ctx.drawImage(word.line.neon_red, 0, sy, word.w, 3, x + off - split, row, word.w, 3);
        ctx.globalAlpha = 0.4 * a; ctx.drawImage(word.line.neon_teal, 0, sy, word.w, 3, x + off + split, row, word.w, 3);
        ctx.globalAlpha = (0.85 + 0.15 * Math.sin(t * 7 + sy)) * a; ctx.drawImage(word.line.bone, 0, sy, word.w, 3, x + off, row, word.w, 3);
      }
      ctx.globalAlpha = 1;
      // A line under it, spaced like the letters.
      var sub = 'A  TAPE  FOUND  BY  THE  LAKE', sw = F.measure(sub);
      ctx.globalAlpha = 0.75 * ease((t - 1.6) / 1.2) * cover; osd(ctx, sub, 320 - (sw >> 1), y + word.h + 16, 'fog_mid'); ctx.globalAlpha = 1;
    }
    // The deck's display.
    ctx.globalAlpha = cover;
    if (t < IN_S + 0.4) { if (Math.floor(t * 3) & 1) osd(ctx, 'TRACKING', 28, 24, 'fog_light'); for (i = 0; i < 8; i++) { ctx.fillStyle = P[i < Math.round(settle * 8) ? 'fog_light' : 'fog_dark']; ctx.fillRect(28 + i * 7, 38, 5, 4); } }
    else {
      osd(ctx, 'PLAY', 28, 24, 'fog_light');
      ctx.fillStyle = P.ink; for (i = 0; i < 5; i++) ctx.fillRect(63 + i, 26 + i - 0 + 1, 1, 9 - 2 * i);
      ctx.fillStyle = P.fog_light; for (i = 0; i < 5; i++) ctx.fillRect(62 + i, 25 + i, 1, 9 - 2 * i);
    }
    var sec = Math.floor(t), cnt = 'SP  0:' + (sec < 600 ? '0' : '') + Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
    osd(ctx, cnt, 612 - F.measure(cnt), 24, 'fog_light');
    if (Math.floor(t * 1.25) & 1) osd(ctx, '12:00', 612 - F.measure('12:00'), 322, 'fog_light');
    if (t > IN_S && out < 0) { // Phase 134: the tape's menu, the chosen row with a blinking play mark
      for (i = 0; i < ROWS.length; i++) {
        var on = i === sel, rw = F.measureBold(ROWS[i]), rx = 320 - (rw >> 1), ry = ROW_Y + i * ROW_H;
        F.bold(ctx, ROWS[i], rx + 1, ry + 1, 'ink'); F.bold(ctx, ROWS[i], rx, ry, on ? 'signal_amber' : 'fog_mid');
        if (on && G.ui.panel.blink()) { ctx.fillStyle = P.signal_amber; for (var k = 0; k < 4; k++) ctx.fillRect(rx - 10 + k, ry + 1 + k, 1, 7 - 2 * k); }
      }
      if ((Math.floor((t - IN_S) * 1.1) & 1) === 0) {
        var hintS = G.core.device.touch() ? 'TAP  TO  CHOOSE' : 'W/S  CHOOSE    SPACE  GO';
        osd(ctx, hintS, 320 - (F.measure(hintS) >> 1), ROW_Y + 3 * ROW_H + 10, 'fog_mid');
      }
    }
    ctx.globalAlpha = 1;
  }
  // A glitch now and then: a fifth of a second every 5-9 s (from the time alone).
  function glitch(tt) { var n = Math.floor(tt / 7), u = tt - n * 7, at = 2.6 + (S.hash(n, 71) % 40) / 10; return u > at && u < at + 0.2 ? 1 : 0; }

  return {
    native: true, open: open, update: update, draw: draw,
    // A tap on a row does it; anywhere else plays (Phase 134). gx, gy in game px (the title draws in them).
    tap: function (gx, gy) {
      if (t <= GUARD || out >= 0) return 'none';
      woke0 = true;                                                                   // a tap on a row is that row, even the page's first
      var k = Math.floor((gy - ROW_Y + 4) / ROW_H);
      if (t > IN_S && k >= 0 && k < ROWS.length && Math.abs(gx - 320) < (ROW_W >> 1)) { sel = k; choose(k); } else close();
      return 'none';
    },
    returned: returned,
    // dbg: where it is.
    state: function () { return { t: +t.toFixed(2), out: +out.toFixed(2), word: word ? [word.w, word.h] : null }; }
  };
})();
