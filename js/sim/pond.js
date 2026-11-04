var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Back Pond (Phases 84-85, PLAN_WINTER.md 2.4-2.5): its state in the save (save.pond) and
// the rules on it. Pure: no DOM, no Math.random, no Date; runs in Node through vm.
// save.pond: {got (a bit per piece of trash fished out, data/pond.js pieces), stream (the jam
// cleared), clear (0..1, how far the water has cleared since the meter filled), stock (Phase
// 85: the fish in it, [{id, cls, w, len, shy}])}.
G.sim = G.sim || {};
G.sim.pond = (function () {
  var OK = 'ok', POOR = 'poor', DONE = 'done';

  function create() { return { got: 0, stream: false, clear: 0, stock: [] }; }

  function has(p, i) { return (p.got & (1 << i)) !== 0; }
  function kindOf(id, data) { var K = data.pond.kinds; for (var i = 0; i < K.length; i++) if (K[i].id === id) return K[i]; return null; }

  // Pieces still on the bed, all or of one kind.
  function left(p, data, kind) {
    var P = data.pond.pieces, n = 0;
    for (var i = 0; i < P.length; i++) if (!has(p, i) && (!kind || P[i][0] === kind)) n++;
    return n;
  }
  // The meter: the pieces out plus the stream, of all the pieces plus one.
  function parts(data) { return data.pond.pieces.length + 1; }
  function done(p, data) { return data.pond.pieces.length - left(p, data) + (p.stream ? 1 : 0); }
  function full(p, data) { return done(p, data) >= parts(data); }
  // Clean: the meter full and the water cleared (stocking opens).
  function clean(p, data) { return full(p, data) && p.clear >= 1; }

  // The murk, 1 brown and still to 0 clear: it lightens a little with each part of the meter,
  // and once the meter is full it clears over data.pond.clearHours.
  function murk(p, data) {
    data = data || G.data;
    var base = 1 - 0.35 * done(p, data) / parts(data);
    return full(p, data) ? base * (1 - p.clear) : base;
  }

  // One step (dt s; one real minute is one game hour): the water clears once the meter is full.
  function step(p, dt, data) {
    if (p.clear < 1 && full(p, data)) p.clear = Math.min(1, p.clear + dt / 60 / data.pond.clearHours);
  }

  // The piece the lure touches on the bed at world x, depth px (bed: the bed's depth px there),
  // or -1. A piece lies on the bed: the lure touches it within 3 px of the bed and half px of x.
  function touch(p, data, x, depth, bed) {
    if (depth < bed - 3) return -1;
    var P = data.pond.pieces;
    for (var i = 0; i < P.length; i++) {
      if (has(p, i)) continue;
      var k = kindOf(P[i][0], data);
      if (Math.abs(x - P[i][1]) <= k.half + 1) return i;
    }
    return -1;
  }

  // A piece landed: it is binned (no coins). Returns its kind.
  function bin(p, i, data) { p.got |= 1 << i; return kindOf(data.pond.pieces[i][0], data); }

  // Clearing the stream's jam: OK and paid, POOR, or DONE (already running).
  function clearStream(save, data) {
    var p = save.pond;
    if (p.stream) return DONE;
    if (save.coins < data.pond.streamCost) return POOR;
    save.coins -= data.pond.streamCost;
    p.stream = true;
    return OK;
  }

  return { OK: OK, POOR: POOR, DONE: DONE, create: create, has: has, kindOf: kindOf, left: left, parts: parts, done: done, full: full, clean: clean,
    murk: murk, step: step, touch: touch, bin: bin, clearStream: clearStream };
})();
