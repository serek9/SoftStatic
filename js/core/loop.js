var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fixed-timestep loop (1/60) with an accumulator. Real time beyond MAX_FRAME in one
// frame is dropped instead of simulated, so a stall or a hidden tab never causes a
// catch-up spiral. P opens the pause menu (G.ui.menu); setPaused is a hard freeze for debugging.
// While another tab owns the save (12.5, core/save.js) nothing steps: the frame still draws,
// and hooks.idle(ctx) draws over it.
G.core = G.core || {};
G.core.loop = (function () {
  var DT = 1 / 60;
  var MAX_FRAME = 0.1;  // seconds of real time accepted per frame (6 steps)
  var hooks = null, ctx = null, acc = 0, last = -1, paused = false, running = false;
  var stats = { fps: 0, ups: 0, steps: 0, dropped: 0, updMs: 0, drawMs: 0, worstMs: 0 };
  // 14.7: the cost of each frame (steps plus drawing), smoothed, and the worst in the last second.
  var worst = 0;
  var secT = 0, secFrames = 0, secSteps = 0;

  function step() {
    if (!paused && !G.core.save.lost()) hooks.update(DT);
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
    var n = 0, t0 = performance.now();
    while (acc >= DT) { step(); acc -= DT; n++; }
    stats.steps = n;
    var t1 = performance.now();

    hooks.draw(ctx);
    if (G.core.save.lost() && hooks.idle) hooks.idle(ctx);
    if (hooks.present) hooks.present(ctx);
    var t2 = performance.now();
    stats.updMs += (t1 - t0 - stats.updMs) * 0.1;
    stats.drawMs += (t2 - t1 - stats.drawMs) * 0.1;
    if (t2 - t0 > worst) worst = t2 - t0;

    secT += ft; secFrames++; secSteps += n;
    if (secT >= 1) {
      stats.fps = Math.round(secFrames / secT);
      stats.worstMs = worst; worst = 0;
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
    '  update ' + s.updMs.toFixed(2) + ' ms  draw ' + s.drawMs.toFixed(2) + ' ms  worst ' + s.worstMs.toFixed(1) + ' ms' +
    (G.core.loop.isPaused() ? '  PAUSED' : '') + (G.core.save.lost() ? '  IDLE (another tab owns the save)' : '') + (G.core.compact ? '  compact' : '');
});
