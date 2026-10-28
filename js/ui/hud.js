var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// HUD. Phase 5 has only the depth readout; coins, clock and bait come in P9.1.
G.ui = G.ui || {};
G.ui.hud = (function () {
  var S = G.gfx.sprites;
  var lastTenths = -1, depthStr = '';

  // Depth in metres for a depth in pixels (§0.10).
  function metres(px) { return px * 0.25; }

  // The readout string, rebuilt only when the shown value changes (no per-frame strings).
  function depthText(px) {
    var tenths = Math.round(metres(px) * 10);
    if (tenths !== lastTenths) {
      lastTenths = tenths;
      depthStr = (tenths / 10).toFixed(1) + ' m';
    }
    return depthStr;
  }

  function draw(ctx, run, waterY) {
    if (!G.scene.underwater.UNDER[run.fsm]) return;
    var s = depthText(Math.max(0, run.cast.ly - waterY));
    S.drawText(ctx, s, 316 - S.measure(s), 4, 'fog_light');
  }

  return { metres: metres, depthText: depthText, draw: draw };
})();
