var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Bake utilities (§0.11): everything expensive is drawn once into an offscreen canvas,
// and per-frame drawing is only drawImage.
G.gfx = G.gfx || {};
G.gfx.bake = (function () {
  var stats = { canvases: 0, ms: 0, lastKey: '', lastMs: 0 };
  var cache = {};

  function canvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').imageSmoothingEnabled = false;
    stats.canvases++;
    return cv;
  }

  // Bakes a layer of any width (wide parallax layers are ~1200 px): drawFn(ctx, w, h) runs once.
  function layer(w, h, drawFn) {
    var t0 = performance.now();
    var cv = canvas(w, h);
    drawFn(cv.getContext('2d'), w, h);
    var ms = performance.now() - t0;
    stats.ms += ms;
    stats.lastMs = ms;
    return cv;
  }

  // Mirrored copy of src: axis 'x' flips left-right (facing), 'y' flips top-bottom (reflections).
  function flipped(src, axis) {
    var cv = canvas(src.width, src.height), ctx = cv.getContext('2d');
    if (axis === 'y') { ctx.translate(0, src.height); ctx.scale(1, -1); }
    else { ctx.translate(src.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(src, 0, 0);
    return cv;
  }

  // Lazy cache: bakes with makeFn() the first time key is asked for, then reuses it.
  function cached(key, makeFn) {
    var cv = cache[key];
    if (cv) return cv;
    var t0 = performance.now();
    cv = cache[key] = makeFn();
    stats.lastKey = key;
    stats.lastMs = performance.now() - t0;
    stats.ms += stats.lastMs;
    return cv;
  }

  // Drops cached bakes whose key starts with prefix (e.g. a location's layers on travel).
  function drop(prefix) {
    for (var k in cache) if (k.indexOf(prefix) === 0) delete cache[k];
  }

  return { canvas: canvas, layer: layer, flipped: flipped, cached: cached, drop: drop, stats: stats };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var s = G.gfx.bake.stats;
  return 'bake ' + s.canvases + ' canvases  ' + s.ms.toFixed(1) + ' ms total  last ' + s.lastMs.toFixed(1) + ' ms';
});
