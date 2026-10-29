var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Mirror water (V6, §2 reflection deltas).
// Each frame the scene above the waterline is drawn once more, mirrored, into a small
// buffer; the buffer is then copied onto the water row by row at alpha 0.35 with a
// 1–2 px sine shift, and a baked overlay darkens it with depth.
// Reflection deltas (10.2) are things the shore does not have: they are drawn into the
// mirror buffer only (setDeltas + drawDelta), so they never appear above the waterline.
G.gfx = G.gfx || {};
G.gfx.water = (function () {
  var VIEW_W = 320, PAD = 2, ALPHA = 0.35;
  var buf = null, bctx = null, shade = null, bufH = 0;
  var deltaDrawer = null;
  var stats = { ms: 0 };

  function setup(h) {
    var B = G.gfx.bake, P = G.gfx.sprites.PALETTE;
    bufH = h;
    buf = B.canvas(VIEW_W + PAD * 2, h);
    bctx = buf.getContext('2d');
    // Depth shade in 3 px steps: clear at the surface, mostly water_deep at the bottom.
    shade = B.canvas(VIEW_W, h);
    var sctx = shade.getContext('2d');
    sctx.fillStyle = P.water_deep;
    for (var y = 0; y < h; y += 3) {
      sctx.globalAlpha = Math.min(0.9, 0.08 + 0.85 * (y / h));
      sctx.fillRect(0, y, VIEW_W, 3);
    }
  }

  // The slot for reflection deltas (P10.2): fn(ctx) draws in normal screen coordinates
  // and appears only in the reflection, never on the shore. null clears it.
  function setDeltas(fn) { deltaDrawer = fn; }

  // Glints (audit P1-3): short bright dashes drifting on the upper water, each blinking by a
  // hash of time, so nothing is random and nothing is allocated per frame.
  var GLINTS = 16;

  function drawGlints(ctx, waterY, h, t) {
    var S = G.gfx.sprites, rows = Math.min(h - 1, 26);
    ctx.fillStyle = S.PALETTE.water_hi;
    for (var i = 0; i < GLINTS; i++) {
      var ph = S.hash(i, 3) & 255;
      if ((S.hash(i, Math.floor(t * 1.2 + ph / 64)) & 3) !== 0) continue;
      var x = ((S.hash(i, 1) % VIEW_W) + t * (0.6 + (ph & 7) * 0.15)) % VIEW_W;
      var y = 1 + S.hash(i, 2) % rows;
      ctx.globalAlpha = 0.35 + 0.4 * (1 - y / rows);
      ctx.fillRect(Math.round(x), waterY + y, 1 + (ph & 1) + (y < 6 ? 1 : 0), 1);
    }
    ctx.globalAlpha = 1;
  }

  // The light path under a low light (the moon, or the dusk glow): broken dashes every other
  // row, narrow at the horizon and wider nearer, swaying with the mirrored rows.
  function drawPath(ctx, waterY, h, t, L) {
    var S = G.gfx.sprites, tick = Math.floor(t * 4);
    ctx.fillStyle = S.PALETTE[L.key];
    for (var r = 0; r < h; r += 2) {
      if ((S.hash(r, tick) & 7) === 0) continue;
      var f = r / h, w = 1 + Math.round(L.w * f);
      var dx = Math.round(Math.sin(t * 1.7 + r * 0.55) * (1 + f));
      ctx.globalAlpha = L.a * (1 - 0.75 * f);
      ctx.fillRect(Math.round(L.x - w / 2) + dx, waterY + r, w, 1);
    }
    ctx.globalAlpha = 1;
  }

  // drawAbove(ctx) draws everything above the waterline in screen coordinates.
  // t is a time in seconds for the ripple of the mirrored rows.
  // light (optional): {x, a, key, w}, the light path on the water (a = 0 for none).
  function draw(ctx, waterY, viewH, t, drawAbove, light) {
    var t0 = performance.now(), h = viewH - waterY;
    if (h !== bufH) setup(h);

    // Mirror about the waterline: screen row waterY - 1 lands on buffer row 0.
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, VIEW_W + PAD * 2, h);
    bctx.setTransform(1, 0, 0, -1, PAD, waterY);
    drawAbove(bctx);
    if (deltaDrawer) deltaDrawer(bctx);
    bctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = G.gfx.sprites.PALETTE.water_dark;
    ctx.fillRect(0, waterY, VIEW_W, h);
    ctx.globalAlpha = ALPHA * (light && light.mirror !== undefined ? light.mirror : 1);
    for (var r = 0; r < h; r++) {
      var amp = 1 + r / h; // 1 px at the surface, 2 px at the bottom
      var dx = Math.round(Math.sin(t * 1.7 + r * 0.55) * amp);
      ctx.drawImage(buf, PAD - dx, r, VIEW_W, 1, 0, waterY + r, VIEW_W, 1);
    }
    ctx.globalAlpha = 1;
    if (light && light.a > 0.01) drawPath(ctx, waterY, h, t, light);
    drawGlints(ctx, waterY, h, t);
    ctx.drawImage(shade, 0, waterY);
    stats.ms = performance.now() - t0;
  }

  // One reflection delta, in normal screen coordinates (the buffer's transform mirrors it).
  // what: figure | window | pier (empty_boat is the boat drawn without its fisher, which
  // the scene does in its mirror pass). sx: screen x of its centre; wy: the waterline.
  // alpha 0..1 fades it in and out. Light stays at the dusk ceiling (§0.9).
  function drawDelta(ctx, what, sx, wy, alpha) {
    var P = G.gfx.sprites.PALETTE, x;
    if (alpha <= 0 || what === 'empty_boat') return;
    ctx.globalAlpha = alpha;
    if (what === 'figure') {
      // Someone standing at the water's edge, quite still.
      ctx.fillStyle = P.fog_light;
      ctx.fillRect(sx - 1, wy - 17, 3, 3);                       // head
      ctx.fillRect(sx - 2, wy - 13, 5, 7);                       // coat
      ctx.fillRect(sx - 2, wy - 6, 2, 6); ctx.fillRect(sx + 1, wy - 6, 2, 6); // legs
      ctx.fillStyle = P.bone; ctx.fillRect(sx, wy - 16, 1, 1);
    } else if (what === 'window') {
      // A cabin on the shore with one lit window.
      ctx.fillStyle = P.night_ink;
      ctx.fillRect(sx - 8, wy - 12, 17, 12);
      for (var r = 0; r < 5; r++) ctx.fillRect(sx - 9 + r, wy - 13 - r, 19 - r * 2, 1);
      ctx.fillStyle = P.dusk_high; ctx.fillRect(sx - 4, wy - 9, 4, 3);
      ctx.fillStyle = P.dusk_amber; ctx.fillRect(sx - 4, wy - 6, 4, 1);
    } else if (what === 'pier') {
      // A second pier, like the real one, where there is none.
      ctx.fillStyle = P.wood_dark;
      for (x = sx - 30; x <= sx + 30; x += 8) ctx.fillRect(x, wy - 5, 2, 5);
      ctx.fillStyle = P.wood; ctx.fillRect(sx - 32, wy - 7, 65, 2);
      ctx.fillStyle = P.stone; ctx.fillRect(sx + 28, wy - 20, 1, 13);
    }
    ctx.globalAlpha = 1;
  }

  return { ALPHA: ALPHA, draw: draw, setDeltas: setDeltas, drawDelta: drawDelta, stats: stats };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  return 'water reflection ' + G.gfx.water.stats.ms.toFixed(2) + ' ms';
});
