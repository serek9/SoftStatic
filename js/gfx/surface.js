var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The water's surface (Phase 20): a 1D height field along the world, one column per view
// pixel (HI per world px), in view pixels, up positive. Two layers:
//   swell: a few travelling sines set per water (loc.swell), scaled by the weather;
//   ripples: a damped wave equation that everything touching the water pokes;
//   wake (Phase 26): a second wave equation for the waves the boat makes as it moves: the
//   stern drives them as it goes (a source swinging up and down, one wave per hull length),
//   and they travel at about the boat's full speed, so when it brakes they overrun it and rock
//   it, the way a real boat's wake catches it up after it stops.
// The waterline, the mirror, the caustics and whatever floats read it. Visual only: it uses
// G.vrng, never G.rng, and is stepped in update() at the fixed dt. Nothing is allocated
// after the arrays are sized for the widest water.
G.gfx = G.gfx || {};
G.gfx.surface = (function () {
  var HI = 2;
  var K = {
    c: 40,         // view px/s, how fast a ripple travels
    damp: 1.2,     // 1/s, ripple velocity damping (energy falls to 5% in about 2.5 s)
    relax: 0.2,    // 1/s, ripple height relaxing to flat
    pokeA: 2.2,    // view px of depression per unit of poke strength
    clampH: 3,     // view px, the surface never goes past ±clampH
    wc: 84,        // view px/s (42 world px/s, the boat's top speed), how fast the wake's waves travel (Phase 26)
    wsub: 2,       // substeps for them (wc × dt must stay under one column)
    wdamp: 0.2,    // 1/s, their velocity damping
    wrelax: 0.3,   // 1/s, their height relaxing to flat
    wakeA: 200,    // view px/s of push per unit of drive
    wlen: 30       // world px, one wave per hull length
  };
  var CALM = { amp: 0.6, mirror: 1, waves: [[90, 8, 0.6], [36, -5, 0.4]] }; // a water with no `swell`

  var n = 0, h = null, v = null;             // ripple heights and velocities per column
  var hw = null, vw = null;                  // the wake's (Phase 26)
  var cols = new Float32Array(642);          // the view's columns this frame (fill)
  var sw = CALM, ks = [], ws = [], as = [], ph = [];
  var t = 0, mult = 1, ampMax = 0, clampH = 3; // Phase 79: clampH per water (the sea's swell stands higher)
  var stats = { ms: 0, energy: 0, min: 0, max: 0, wake: 0 };

  // Sizes the arrays for a water and resets it. Called on location load (not a hot path).
  function setup(loc) {
    var need = loc.width * HI + 2;
    if (!h || h.length < need) { h = new Float32Array(need); v = new Float32Array(need); hw = new Float32Array(need); vw = new Float32Array(need); }
    else { h.fill(0); v.fill(0); hw.fill(0); vw.fill(0); }
    n = need;
    sw = loc.swell || CALM;
    clampH = sw.clamp || K.clampH;
    ks.length = ws.length = as.length = ph.length = 0;
    for (var i = 0; i < sw.waves.length; i++) {
      var w = sw.waves[i], k = 6.2832 / w[0];
      ks.push(k); ws.push(k * w[1]); as.push(sw.amp * w[2]); ph.push(G.vrng.range(0, 6.2832));
    }
    t = 0;
  }

  // m scales the swell (the weather: drizzle and the grey-hour wind make it rougher).
  function step(dt, m) {
    if (!h) return;
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    t += dt; mult = m || 1;
    ampMax = sw.amp * mult;
    var C2 = K.c * K.c, damp = 1 - K.damp * dt, relax = 1 - K.relax * dt, lim = clampH, e = 0, lo = 0, hi = 0, i;
    for (i = 1; i < n - 1; i++) {
      v[i] = (v[i] + C2 * (h[i - 1] + h[i + 1] - 2 * h[i]) * dt) * damp;
    }
    for (i = 1; i < n - 1; i++) {
      var y = (h[i] + v[i] * dt) * relax;
      h[i] = y > lim ? lim : (y < -lim ? -lim : y);
      var d = h[i] - h[i - 1];
      e += v[i] * v[i] / C2 + d * d;
      if (h[i] < lo) lo = h[i]; else if (h[i] > hi) hi = h[i];
    }
    stats.energy = e; stats.min = lo; stats.max = hi;
    // The wake: the same equation, faster-travelling and longer-lived, in substeps.
    var W2 = K.wc * K.wc, sd = dt / K.wsub, wd = 1 - K.wdamp * sd, wr = 1 - K.wrelax * sd, ew = 0, k;
    for (k = 0; k < K.wsub; k++) {
      for (i = 1; i < n - 1; i++) vw[i] = (vw[i] + W2 * (hw[i - 1] + hw[i + 1] - 2 * hw[i]) * sd) * wd;
      for (i = 1; i < n - 1; i++) { var yw = (hw[i] + vw[i] * sd) * wr; hw[i] = yw > lim ? lim : (yw < -lim ? -lim : yw); }
    }
    for (i = 1; i < n - 1; i++) ew += hw[i] * hw[i];
    stats.wake = ew;
    if (t0) stats.ms = performance.now() - t0;
  }

  // A disturbance at world x: strength 0..1.5 (a lure's splash is about 0.3–1), width in world
  // px. The shape holds no net water (a dip with a raised rim), so it spreads as a ripple train.
  function poke(x, s, width) {
    if (!h) return;
    s = Math.min(1.5, s); width = (width || 2.5) * HI;
    var c = Math.round(x * HI), r = Math.ceil(width * 6), A = s * K.pokeA, i0 = Math.max(1, c - r), i1 = Math.min(n - 2, c + r);
    for (var i = i0; i <= i1; i++) {
      var d = (i - c) / width, g1 = Math.exp(-d * d), g2 = Math.exp(-d * d * 0.25);
      h[i] -= A * (g1 - 0.5 * g2);
    }
  }

  // Phase 26: the moving boat drives its wake at the stern, world x, every step: a push up
  // and down (s 0..1, with speed) swinging once per wlen px travelled, over a few px.
  var wph = 0;
  function wake(x, s, speed, dt) {
    if (!vw || s <= 0) return;
    wph += 6.2832 * Math.abs(speed) / K.wlen * dt;
    var c = Math.round(x * HI), w = 4 * HI, push = K.wakeA * Math.min(1, s) * Math.sin(wph) * dt, i0 = Math.max(1, c - 3 * w), i1 = Math.min(n - 2, c + 3 * w);
    for (var i = i0; i <= i1; i++) { var d = (i - c) / w; vw[i] += push * Math.exp(-d * d); }
  }

  function swellAt(X) {
    var y = 0;
    for (var i = 0; i < ks.length; i++) y += as[i] * Math.sin(X * ks[i] - t * ws[i] + ph[i]);
    return y * mult;
  }

  function rippleAt(X) { // the ripples and the wake together
    var i = X | 0, f = X - i;
    if (i < 0 || i >= n - 1) return 0;
    return h[i] + (h[i + 1] - h[i]) * f + hw[i] + (hw[i + 1] - hw[i]) * f;
  }

  function lim(y) { return y > clampH ? clampH : (y < -clampH ? -clampH : y); }

  // Height (view px, up positive) at world x.
  function at(x) { var X = x * HI; return h ? lim(swellAt(X) + rippleAt(X)) : 0; }
  // The ripples' slope alone (view px per view px) at world x: what breaks the mirror.
  function rippleSlope(x) { var X = x * HI; return rippleAt(X + 1) - rippleAt(X - 1); }

  // Fills the view's columns for a camera at world x camX (column i is world camX + i / HI;
  // one extra column each side for slopes) and returns them: cols[i + 1] is column i.
  var lastX = NaN, lastT = -1;
  function fill(camX) {
    if (camX === lastX && t === lastT) return cols; // the sailing scene and the cross-section share a frame's columns
    lastX = camX; lastT = t;
    var X0 = camX * HI;
    for (var i = 0; i < 642; i++) cols[i] = h ? lim(swellAt(X0 + i - 1) + rippleAt(X0 + i - 1)) : 0;
    return cols;
  }

  return {
    K: K, setup: setup, step: step, poke: poke, wake: wake, at: at, rippleSlope: rippleSlope, fill: fill, stats: stats,
    amp: function () { return ampMax; },                 // the swell's largest height now (view px)
    mirror: function () { return sw.mirror * mult; },    // how much the swell shivers the reflection
    swellCurve: function () { var k = 0; for (var i = 0; i < ks.length; i++) k += as[i] * ks[i] * ks[i]; return k * mult; }
  };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var s = G.gfx.surface.stats;
  return 'surface energy ' + s.energy.toFixed(2) + '  min/max ' + s.min.toFixed(2) + '/' + s.max.toFixed(2) + '  swell ' + G.gfx.surface.amp().toFixed(2) + '  ' + s.ms.toFixed(3) + ' ms';
});
