var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Mirror water (V6, §2 reflection deltas).
// Each frame the scene above the waterline is drawn once more, mirrored, into a buffer;
// the buffer is then copied onto the water row by row with a 1–2 px sine shift, and a
// baked overlay darkens it with depth. Phase 18: the buffer is HI (2) times the world's
// resolution (the scene draws in world pixels through the view's ×2), and the rows, the
// streaks, the glints and the light path are all drawn in the 640×360 view's pixels.
// Reflection deltas (10.2) are things the shore does not have: they are drawn into the
// mirror buffer only (setDeltas + drawDelta), so they never appear above the waterline.
G.gfx = G.gfx || {};
G.gfx.water = (function () {
  var VIEW_W = 320, PAD = 2, ALPHA = 0.5, HI = 2, H1 = 1 / 2; // Phase 15: a clearer mirror (was 0.35)
  var buf = null, bctx = null, shade = null, bufH = 0;
  var deltaDrawer = null;
  var stats = { ms: 0 };

  function setup(h) {
    var B = G.gfx.bake, P = G.gfx.sprites.PALETTE;
    bufH = h;
    buf = B.canvas((VIEW_W + PAD * 2) * HI, h * HI);
    bctx = buf.getContext('2d');
    // Depth shade in 4 px steps: clear at the surface, mostly water_deep at the bottom.
    shade = B.canvas(VIEW_W * HI, h * HI);
    var sctx = shade.getContext('2d');
    sctx.fillStyle = P.water_deep;
    for (var y = 0; y < h * HI; y += 4) {
      sctx.globalAlpha = Math.min(0.9, 0.08 + 0.85 * (y / (h * HI)));
      sctx.fillRect(0, y, VIEW_W * HI, 4);
    }
  }

  // The slot for reflection deltas (P10.2): fn(ctx) draws in normal screen coordinates
  // and appears only in the reflection, never on the shore. null clears it.
  function setDeltas(fn) { deltaDrawer = fn; }

  // Glints (audit P1-3): short bright dashes drifting on the upper water, each blinking by a
  // hash of time, so nothing is random and nothing is allocated per frame.
  var GLINTS = 16;

  function drawGlints(ctx, waterY, h, t, camX) {
    var S = G.gfx.sprites, rows = Math.min(h - 1, 26), surf = G.gfx.surface, top = 0.15 * surf.amp();
    ctx.fillStyle = S.PALETTE.water_hi;
    for (var i = 0; i < GLINTS; i++) {
      var ph = S.hash(i, 3) & 255;
      if ((S.hash(i, Math.floor(t * 1.2 + ph / 64)) & 3) !== 0) continue;
      var x = ((S.hash(i, 1) % VIEW_W) + t * (0.6 + (ph & 7) * 0.15)) % VIEW_W;
      if (surf.at(camX + x) < top) continue; // Phase 20: only where the swell is cresting
      var y = 1 + (S.hash(i, 2) % (rows * HI)) * H1;
      ctx.globalAlpha = 0.35 + 0.4 * (1 - y / rows);
      ctx.fillRect(Math.round(x * HI) * H1, waterY + y, (1 + (ph & 3) + (y < 6 ? 2 : 0)) * H1, H1);
    }
    ctx.globalAlpha = 1;
  }

  // Phase 15: long broken horizontal streaks across the mirror, drifting slowly, the way a
  // still lake breaks a reflection into lines. By hash of time, nothing allocated.
  var STREAKS = 26;
  function drawStreaks(ctx, waterY, rows, t) {
    if (rows < 3) return;
    var S = G.gfx.sprites;
    ctx.fillStyle = S.PALETTE.water_hi;
    for (var i = 0; i < STREAKS; i++) {
      var r = 1 + (S.hash(i, 5) % ((rows - 1) * HI)) * H1, len = 4 + S.hash(i, 7) % 18;
      var x = Math.round((((S.hash(i, 6) % 420) + t * (1 + (S.hash(i, 8) & 3))) % 420 - 50) * HI) * H1;
      ctx.globalAlpha = 0.14 + 0.12 * (1 - r / rows);
      ctx.fillRect(x, waterY + r, len, H1);
      if (len > 12) ctx.fillRect(x + len + 2, waterY + r, 3, H1); // the line breaks
    }
    ctx.globalAlpha = 1;
  }

  // The light path under a low light (the moon, or the dusk glow): broken dashes every other
  // row, narrow at the horizon and wider nearer, swaying with the mirrored rows.
  function drawPath(ctx, waterY, h, t, L, camX) {
    var S = G.gfx.sprites, tick = Math.floor(t * 4), surf = G.gfx.surface, low = -0.3 * surf.amp();
    ctx.fillStyle = S.PALETTE[L.key];
    for (var r = 0; r < h; r += 1) {
      if ((S.hash(r, tick) & 7) === 0) continue;
      if (surf.at(camX + L.x + r * 2.3) < low) continue; // Phase 20: the path breaks in the troughs
      var f = r / h, w = 1 + Math.round(L.w * f * HI) * H1;
      var dx = Math.round(Math.sin(t * 1.7 + r * 0.55) * (1 + f) * HI) * H1;
      ctx.globalAlpha = L.a * (1 - 0.75 * f);
      ctx.fillRect(Math.round((L.x - w / 2) * HI) * H1 + dx, waterY + r, w, H1);
    }
    ctx.globalAlpha = 1;
  }

  // Phase 20: the mirrored rows shift with the surface (gfx/surface.js). The swell's shiver
  // is a sine per row scaled by the water's `mirror` (a still water barely moves); the
  // ripples bend it locally: each CH-px chunk of a row shifts by the ripples' slope under
  // it, less further from the shore. Chunks with the same shift are drawn as one piece, and
  // with no ripples a row is a single drawImage as before.
  var CH = 32, NCH = VIEW_W * HI / CH, GAIN = 10, MAXS = 6;
  var chunkF = new Float32Array(NCH);

  // Fills chunkF for a camera at world x camX; true if any chunk shifts.
  function chunkShifts(camX) {
    var surf = G.gfx.surface, any = false;
    for (var c = 0; c < NCH; c++) {
      var x = camX + (c * CH + CH / 2) * H1, s = surf.rippleSlope(x), s1 = surf.rippleSlope(x - 5), s2 = surf.rippleSlope(x + 5);
      if (Math.abs(s1) > Math.abs(s)) s = s1;
      if (Math.abs(s2) > Math.abs(s)) s = s2;
      s *= GAIN;
      chunkF[c] = s > MAXS ? MAXS : (s < -MAXS ? -MAXS : s);
      if (chunkF[c] >= 0.5 || chunkF[c] <= -0.5) any = true;
    }
    return any;
  }

  function rowBase(r, h, t) {
    var amp = (1 + r / (h * HI)) * HI * G.gfx.surface.mirror(); // 2 px at the surface, 4 at the bottom (view pixels), × the water's mirror
    return Math.round(Math.sin(t * 1.7 + r * 0.275) * amp);
  }

  // The shift (view px) of mirror row r (view rows from the waterline) at view column col,
  // as draw() uses it: for checks. h is the water's height below the waterline (world px).
  function rowShift(col, r, h, t, camX) {
    chunkShifts(camX);
    return rowBase(r, h, t) + Math.round(chunkF[Math.min(NCH - 1, Math.max(0, Math.floor(col / CH)))] * (1 - 0.4 * r / (h * HI)));
  }

  // drawAbove(ctx) draws everything above the waterline in screen coordinates.
  // t is a time in seconds for the ripple of the mirrored rows.
  // light (optional): {x, a, key, w}, the light path on the water (a = 0 for none).
  // band (optional, Phase 15): only the top `band` rows are mirror; the cross-section shows
  // below them (sailing draws it first).
  // camX (Phase 20): the camera's world x, where the surface is read.
  function draw(ctx, waterY, viewH, t, drawAbove, light, band, camX) {
    var t0 = performance.now(), h = viewH - waterY, rows = band === undefined ? h : Math.min(h, band);
    if (h !== bufH) setup(h);

    // Mirror about the waterline: screen row waterY - 1 lands on buffer row 0.
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, (VIEW_W + PAD * 2) * HI, h * HI);
    bctx.setTransform(HI, 0, 0, -HI, PAD * HI, waterY * HI);
    drawAbove(bctx);
    if (deltaDrawer) deltaDrawer(bctx);
    bctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = G.gfx.sprites.PALETTE.water_dark;
    ctx.fillRect(0, waterY, VIEW_W, rows);
    ctx.globalAlpha = ALPHA * (light && light.mirror !== undefined ? light.mirror : 1);
    // Row by row in the view's pixels; each row of 1/HI world px shifts (see chunkShifts).
    camX = camX || 0;
    var dyn = chunkShifts(camX);
    for (var r = 0; r < rows * HI; r++) {
      var dx = rowBase(r, h, t);
      if (!dyn) { ctx.drawImage(buf, PAD * HI - dx, r, VIEW_W * HI, 1, 0, waterY + r * H1, VIEW_W, H1); continue; }
      var wr = 1 - 0.4 * r / (h * HI), c0 = 0, s0 = dx + Math.round(chunkF[0] * wr);
      for (var c = 1; c <= NCH; c++) {
        var s = c < NCH ? dx + Math.round(chunkF[c] * wr) : 1e9;
        if (s === s0) continue;
        ctx.drawImage(buf, PAD * HI - s0 + c0 * CH, r, (c - c0) * CH, 1, c0 * CH * H1, waterY + r * H1, (c - c0) * CH * H1, H1);
        c0 = c; s0 = s;
      }
    }
    ctx.globalAlpha = 1;
    if (light && light.a > 0.01) drawPath(ctx, waterY, rows, t, light, camX);
    drawStreaks(ctx, waterY, rows, t);
    drawGlints(ctx, waterY, rows, t, camX);
    if (rows > 0) ctx.drawImage(shade, 0, 0, VIEW_W * HI, rows * HI, 0, waterY, VIEW_W, rows);
    stats.ms = performance.now() - t0;
  }

  // One reflection delta, in normal screen coordinates (the buffer's transform mirrors it).
  // what: figure | window | pier (empty_boat is the boat drawn without its fisher, which
  // the scene does in its mirror pass). sx: screen x of its centre; wy: the waterline.
  // alpha 0..1 fades it in and out. Light stays at the dusk ceiling (§0.9).
  function drawDelta(ctx, what, sx, wy, alpha) {
    var P = G.gfx.sprites.PALETTE, A = G.gfx.paint, x;
    if (alpha <= 0 || what === 'empty_boat') return;
    ctx.save(); ctx.scale(1 / HI, 1 / HI);                // Phase 18: in the view's pixels
    var X = Math.round(sx * HI), Y = wy * HI;
    ctx.globalAlpha = alpha;
    A.reset();
    if (what === 'figure') {
      // Someone standing at the water's edge, quite still, in a long coat.
      A.blob(ctx, X, Y - 32, 3, 3.5, ['fog_mid', 'fog_light']);
      A.box(ctx, 'fog_light', X - 4, Y - 27, 9, 15); A.box(ctx, 'fog_mid', X + 2, Y - 27, 3, 15);
      A.box(ctx, 'fog_light', X - 4, Y - 12, 3, 12); A.box(ctx, 'fog_mid', X + 1, Y - 12, 3, 12);
      A.px(ctx, 'bone', X, Y - 33);
    } else if (what === 'window') {
      // A cabin on the shore with one lit window.
      A.box(ctx, 'night_ink', X - 16, Y - 24, 34, 24);
      for (var r = 0; r < 10; r++) A.box(ctx, 'night_ink', X - 18 + r * 2, Y - 26 - r, 38 - r * 4, 1);
      A.box(ctx, 'dusk_high', X - 8, Y - 18, 8, 6); A.box(ctx, 'dusk_amber', X - 8, Y - 12, 8, 2); A.box(ctx, 'night_ink', X - 4, Y - 18, 1, 8);
    } else if (what === 'pier') {
      // A second pier, like the real one, where there is none.
      for (x = X - 60; x <= X + 60; x += 16) A.box(ctx, 'wood_dark', x, Y - 10, 4, 10);
      A.box(ctx, 'wood', X - 64, Y - 14, 130, 4); A.box(ctx, 'wood_hi', X - 64, Y - 14, 130, 1);
      A.box(ctx, 'stone', X + 56, Y - 40, 2, 26);
    }
    A.reset();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return { ALPHA: ALPHA, draw: draw, setDeltas: setDeltas, drawDelta: drawDelta, stats: stats, rowShift: rowShift };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  return 'water reflection ' + G.gfx.water.stats.ms.toFixed(2) + ' ms';
});
