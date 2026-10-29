var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fishing line as a rope (Phase 21): a Verlet chain of N points in world px, point 0 at
// the rod tip and point N-1 at the lure (or the fish's mouth). Its rest length is how much
// line is out; the scene sets it every step (paying out, slack, reeling, tension). In the air
// the line falls and drags; on the water it floats, then sinks from the lure end; under it,
// strong drag and a slow sink. Segments only resist stretching, so a long line hangs slack
// and a short one pulls straight. Visual only: no randomness, stepped in update() at the
// fixed dt, nothing allocated after load.
G.gfx = G.gfx || {};
G.gfx.rope = (function () {
  var N = 48, ITER = 8;
  var K = {
    g: 40,          // px/s², gravity in the air (9.8 m/s² at 0.25 m per px)
    airDrag: 0.8,   // 1/s
    waterG: 3,      // px/s², what is left of gravity for a nylon line under water
    waterDrag: 7,   // 1/s
    float0: 0.4,    // s a point at the lure end floats before it sinks
    float1: 3.2     // s more for a point at the rod end: the line sinks from the lure end
  };
  var x = new Float32Array(N), y = new Float32Array(N), ox = new Float32Array(N), oy = new Float32Array(N);
  var wet = new Float32Array(N);   // s each point has lain on the surface (-1 once it has sunk)
  var st = {
    mode: 0,          // OFF, PINNED (both ends held) or LOOSE (the far end free: a snap or a thrown fish)
    rest: 0,          // px of line out
    ax: 0, ay: 0,     // the rod tip
    bx: 0, by: 0,     // the far end's anchor (PINNED)
    flowX: 0,         // px/s of current on points under water (TODO(P22.2): Phase 22 fills this; 0 until then)
    pull: 0,          // 0..1: tension straightening the line toward the line between its ends
    taut: 0, sagMax: 0, span: 0, ms: 0
  };
  var OFF = 0, PINNED = 1, LOOSE = 2;

  // Starts a line with every point at (px, py), as when the lure leaves the rod tip.
  function reset(px, py) {
    for (var i = 0; i < N; i++) { x[i] = ox[i] = px; y[i] = oy[i] = py; wet[i] = 0; }
    st.rest = 0; st.mode = PINNED;
    st.ax = st.bx = px; st.ay = st.by = py;
  }

  function off() { st.mode = OFF; st.rest = 0; st.taut = 0; st.sagMax = 0; st.span = 0; }

  // The rod tip and (pinned) the far end, in world px.
  function anchors(ax, ay, bx, by) { st.ax = ax; st.ay = ay; st.bx = bx; st.by = by; }

  // Lets the far end go: it keeps its momentum, plus a kick (px/s) toward the rod tip.
  function loosen(kick) {
    if (st.mode !== PINNED) return;
    st.mode = LOOSE;
    var dx = st.ax - x[N - 1], dy = st.ay - y[N - 1], d = Math.sqrt(dx * dx + dy * dy) || 1;
    ox[N - 1] -= dx / d * kick / 60; oy[N - 1] -= dy / d * kick / 60;
  }

  // surfY(x) gives the water's surface (world y) at world x; null for no water.
  function step(dt, surfY) {
    if (st.mode === OFF) return;
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0, i, k;
    var last = st.mode === PINNED ? N - 1 : N;
    for (i = 1; i < last; i++) {
      var vx = x[i] - ox[i], vy = y[i] - oy[i], s = surfY(x[i]);
      ox[i] = x[i]; oy[i] = y[i];
      if (y[i] < s - 0.25) {                                  // in the air
        var a = 1 - K.airDrag * dt;
        x[i] += vx * a; y[i] += vy * a + K.g * dt * dt;
      } else if (wet[i] >= 0) {                               // lying on the surface
        wet[i] += dt;
        x[i] += vx * (1 - 4 * dt); y[i] = s;
        if (wet[i] > K.float0 + (K.float1 - K.float0) * (1 - i / (N - 1))) wet[i] = -1;
      } else {                                                // under water
        var w = 1 - K.waterDrag * dt;
        x[i] += vx * w + st.flowX * dt * K.waterDrag * dt; y[i] += vy * w + K.waterG * dt * dt;
        if (y[i] < s) y[i] = s;
      }
    }
    var seg = st.rest / (N - 1);
    for (k = 0; k < ITER; k++) {
      x[0] = st.ax; y[0] = st.ay;
      if (st.mode === PINNED) { x[N - 1] = st.bx; y[N - 1] = st.by; }
      for (i = 0; i < N - 1; i++) {
        var dx = x[i + 1] - x[i], dy = y[i + 1] - y[i], d = Math.sqrt(dx * dx + dy * dy);
        if (d <= seg || d === 0) continue;                   // a line resists stretching only
        var f = (d - seg) / d * 0.5, wa = i === 0 ? 0 : 1, wb = i + 1 === N - 1 && st.mode === PINNED ? 0 : 1;
        if (wa + wb === 0) continue;
        var ka = f * 2 * wa / (wa + wb), kb = f * 2 * wb / (wa + wb);
        x[i] += dx * ka; y[i] += dy * ka; x[i + 1] -= dx * kb; y[i + 1] -= dy * kb;
      }
    }
    x[0] = st.ax; y[0] = st.ay;
    if (st.mode === PINNED) { x[N - 1] = st.bx; y[N - 1] = st.by; }
    // Under tension a real line is straight at once; a chain of 48 links solved 8 times would
    // take many steps to get there, so each point is also drawn toward its place on the chord.
    if (st.pull > 0 && st.mode === PINNED) {
      for (i = 1; i < N - 1; i++) {
        var u = i / (N - 1);
        x[i] += (st.ax + (st.bx - st.ax) * u - x[i]) * st.pull;
        y[i] += (st.ay + (st.by - st.ay) * u - y[i]) * st.pull;
      }
    }
    measure();
    if (t0) st.ms = performance.now() - t0;
  }

  // span: tip to far end; taut: span over the line out (1 = straight); sagMax: the furthest
  // point from the straight line between the ends, in world px.
  function measure() {
    var dx = x[N - 1] - x[0], dy = y[N - 1] - y[0], d = Math.sqrt(dx * dx + dy * dy), m = 0;
    st.span = d;
    st.taut = st.rest > 0 ? Math.min(1, d / st.rest) : 0;
    if (d > 0.01) {
      for (var i = 1; i < N - 1; i++) {
        var e = Math.abs((x[i] - x[0]) * dy - (y[i] - y[0]) * dx) / d;
        if (e > m) m = e;
      }
    }
    st.sagMax = m;
  }

  // A small sideways and downward jolt to the points nearest the lure (nibbles, a head shake).
  function twitch(count, jx, jy) {
    for (var i = Math.max(1, N - 1 - count); i < N - 1; i++) {
      var u = (i - (N - 1 - count)) / count;
      ox[i] -= jx * u; oy[i] -= jy * u;
    }
  }

  // How much line is out (px).
  function setRest(len) { st.rest = Math.max(0, len); }

  return {
    N: N, K: K, st: st, x: x, y: y, wet: wet, OFF: OFF, PINNED: PINNED, LOOSE: LOOSE,
    reset: reset, off: off, anchors: anchors, loosen: loosen, step: step, twitch: twitch, setRest: setRest
  };
})();

if (G.core && G.core.debug) G.core.debug.addLine(function () {
  var s = G.gfx.rope.st;
  if (s.mode === 0) return 'rope off';
  return 'rope ' + (s.mode === 1 ? 'pinned' : 'loose') + '  len ' + s.rest.toFixed(1) + '  taut ' + s.taut.toFixed(2) + '  sag ' + s.sagMax.toFixed(1) + ' px  ' + s.ms.toFixed(3) + ' ms';
});
