var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fixed-timestep loop (1/60) with an accumulator. Real time beyond MAX_FRAME in one
// frame is dropped instead of simulated, so a stall or a hidden tab never causes a
// catch-up spiral. P opens the pause menu (G.ui.menu); setPaused is a hard freeze for debugging.
G.core = G.core || {};
G.core.loop = (function () {
  var DT = 1 / 60;
  var MAX_FRAME = 0.1;  // seconds of real time accepted per frame (6 steps)
  var hooks = null, ctx = null, acc = 0, last = -1, paused = false, running = false;
  var stats = { fps: 0, ups: 0, steps: 0, dropped: 0 };
  var secT = 0, secFrames = 0, secSteps = 0;

  function step() {
    if (!paused) hooks.update(DT);
    G.core.input.endStep();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    var t = now / 1000;
    var ft = last < 0 ? 0 : t - last;
    last = t;
    if (ft > MAX_FRAME) { stats.dropped += ft - MAX_FRAME; ft = MAX_FRAME; }
    else if (ft < 0) ft = 0;

    acc += ft;
    var n = 0;
    while (acc >= DT) { step(); acc -= DT; n++; }
    stats.steps = n;

    hooks.draw(ctx);

    secT += ft; secFrames++; secSteps += n;
    if (secT >= 1) {
      stats.fps = Math.round(secFrames / secT);
      stats.ups = Math.round(secSteps / secT);
      secT = 0; secFrames = 0; secSteps = 0;
    }
  }

  function start(h, c) {
    if (running) return;
    hooks = h; ctx = c; running = true;
    document.addEventListener('visibilitychange', function () { if (!document.hidden) last = -1; });
    requestAnimationFrame(frame);
  }

  return {
    DT: DT, MAX_FRAME: MAX_FRAME, stats: stats, start: start,
    setPaused: function (p) { paused = !!p; },
    isPaused: function () { return paused; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var s = G.core.loop.stats;
  return 'fps ' + s.fps + '  ups ' + s.ups + '  steps ' + s.steps + '  dropped ' + s.dropped.toFixed(2) + 's' +
    (G.core.loop.isPaused() ? '  PAUSED' : '');
});
