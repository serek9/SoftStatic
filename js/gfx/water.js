var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Mirror water (V6, §2 reflection deltas).
// Each frame the scene above the waterline is drawn once more, mirrored, into a small
// buffer; the buffer is then copied onto the water row by row at alpha 0.35 with a
// 1–2 px sine shift, and a baked overlay darkens it with depth.
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

  // drawAbove(ctx) draws everything above the waterline in screen coordinates.
  // t is a time in seconds for the ripple of the mirrored rows.
  function draw(ctx, waterY, viewH, t, drawAbove) {
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
    ctx.globalAlpha = ALPHA;
    for (var r = 0; r < h; r++) {
      var amp = 1 + r / h; // 1 px at the surface, 2 px at the bottom
      var dx = Math.round(Math.sin(t * 1.7 + r * 0.55) * amp);
      ctx.drawImage(buf, PAD - dx, r, VIEW_W, 1, 0, waterY + r, VIEW_W, 1);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(shade, 0, waterY);
    stats.ms = performance.now() - t0;
  }

  return { ALPHA: ALPHA, draw: draw, setDeltas: setDeltas, stats: stats };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  return 'water reflection ' + G.gfx.water.stats.ms.toFixed(2) + ' ms';
});
