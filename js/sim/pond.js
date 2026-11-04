var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Back Pond (Phases 84-85, PLAN_WINTER.md 2.4-2.5): its state in the save (save.pond) and
// the rules on it. Pure: no DOM, no Math.random, no Date; runs in Node through vm.
// save.pond: {got (a bit per piece of trash fished out, data/pond.js pieces), stream (the jam
// cleared), clear (0..1, how far the water has cleared since the meter filled), stock (Phase
// 85: the fish in it, [{id, cls, w, len, shy}]), caught (Phase 85: stocked fish caught again),
// watch (Phase 85: s of Pond Cam watched)}.
// Phase 85 (PLAN_WINTER.md 2.5): stocking. A freshwater species (not the sea's, not the ice's)
// can be stocked once the journal holds a catch in every size class it comes in (classes()),
// free, one fish at a time in a class caught, up to the pond's capacity, once the pond is clean.
// A stocked fish has its class's middle weight and length. A released one is shy for a while.
G.sim = G.sim || {};
G.sim.pond = (function () {
  var OK = 'ok', POOR = 'poor', DONE = 'done';

  function create() { return { got: 0, stream: false, clear: 0, stock: [], caught: 0, watch: 0 }; }

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

  // ---- Phase 85: stocking ---------------------------------------------------------------------
  var FULL = 'full', NOT = 'not', DIRTY = 'dirty', SIZE = 'size';
  var Q_TOP = 0.845; // the size quantile one catch in ten reaches (u 0.9 on the size curve, 1.6)
  // The size classes [lo, hi] (indices into data.SIZE_CLASSES) a species comes in: from its
  // smallest weight to the weight one catch in ten reaches.
  function classes(sp, data, out) {
    var w = sp.weightKg[0] + (sp.weightKg[1] - sp.weightKg[0]) * Math.pow(Q_TOP, 1.3);
    out = out || [0, 0];
    out[0] = data.sizeClass(sp.weightKg[0]); out[1] = Math.max(out[0], data.sizeClass(w));
    return out;
  }
  function freshwater(sp, data) {
    if (sp.ice) return false;
    for (var i = 0; i < sp.locations.length; i++) { var L = data.locations[sp.locations[i]]; if (L && L.water !== 'sea' && !L.ice) return true; }
    return false;
  }
  // The class ids of species sp caught (from the journal), in order.
  var CL = [0, 0];
  function caughtSizes(save, sp, data) {
    var j = save.journal[sp.id], o = [];
    if (!j || !j.sizes) return o;
    for (var i = 0; i < data.SIZE_CLASSES.length; i++) if (j.sizes.indexOf(data.SIZE_CLASSES[i].id) >= 0) o.push(data.SIZE_CLASSES[i].id);
    return o;
  }
  // The class ids species sp comes in, and which of them are still to catch.
  function wanted(sp, data) { classes(sp, data, CL); var o = []; for (var i = CL[0]; i <= CL[1]; i++) o.push(data.SIZE_CLASSES[i].id); return o; }
  function missingSizes(save, sp, data) { var w = wanted(sp, data), j = save.journal[sp.id], o = []; for (var i = 0; i < w.length; i++) if (!j || !j.sizes || j.sizes.indexOf(w[i]) < 0) o.push(w[i]); return o; }
  function capOf(data) { for (var id in data.locations) if (data.locations[id].pond) return data.locations[id].pond.cap; return 0; }
  // Can species sp be stocked now: OK, NOT (not freshwater), SIZE (a class not caught yet),
  // DIRTY (the pond is not clean yet) or FULL.
  function canStock(save, sp, data) {
    if (!freshwater(sp, data)) return NOT;
    if (missingSizes(save, sp, data).length) return SIZE;
    if (!clean(save.pond, data)) return DIRTY;
    if (save.pond.stock.length >= capOf(data)) return FULL;
    return OK;
  }
  // Stocks one fish of species index spIdx in class id cls (one caught): its class's middle size.
  var QR = [0, 1], SZ = { len: 0, w: 0 };
  function stock(save, spIdx, cls, data) {
    var sp = data.fish[spIdx], r = canStock(save, sp, data);
    if (r !== OK) return r;
    if (caughtSizes(save, sp, data).indexOf(cls) < 0) return SIZE;
    if (!G.sim.economy.qRange(sp, [cls], data, QR)) return SIZE;
    G.sim.economy.size(sp, (QR[0] + QR[1]) / 2, SZ);
    save.pond.stock.push({ id: sp.id, cls: cls, w: SZ.w, len: SZ.len, shy: 0 });
    return OK;
  }
  // Each step: shy fish count down (game hours; one real minute is one game hour).
  function shyStep(p, dt) { for (var i = 0; i < p.stock.length; i++) if (p.stock[i].shy > 0) p.stock[i].shy = Math.max(0, p.stock[i].shy - dt / 60); }
  // Stocked fish that can bite now, counted by species id into out (the keys reset to 0 first),
  // less those already swimming (busy: {id: n}). Returns the total.
  function available(p, out, busy) {
    var k, n = 0, i;
    for (k in out) out[k] = 0;
    for (i = 0; i < p.stock.length; i++) if (p.stock[i].shy <= 0) out[p.stock[i].id] = (out[p.stock[i].id] || 0) + 1;
    for (k in out) { if (busy && busy[k]) out[k] = Math.max(0, out[k] - busy[k]); n += out[k]; }
    return n;
  }
  // The stocked fish a bite of species id is: the first that is not shy (-1 none of it).
  function pick(p, id) {
    var i;
    for (i = 0; i < p.stock.length; i++) if (p.stock[i].id === id && p.stock[i].shy <= 0) return i;
    for (i = 0; i < p.stock.length; i++) if (p.stock[i].id === id) return i;      // (a shy one, if that is all there is)
    return -1;
  }
  // Caught from the pond: released, it goes back and is shy for data.pond.shyHours; kept, it leaves.
  function caughtBack(p, k, kept, data) {
    if (k < 0 || k >= p.stock.length) return;
    p.caught = (p.caught || 0) + 1;
    if (kept) p.stock.splice(k, 1); else p.stock[k].shy = data.pond.shyHours;
  }
  // A trophy: its own trophyKg, or the weight one catch in ten reaches.
  function trophyKg(sp) { return sp.trophyKg || sp.weightKg[0] + (sp.weightKg[1] - sp.weightKg[0]) * Math.pow(Q_TOP, 1.3); }

  return { FULL: FULL, NOT: NOT, DIRTY: DIRTY, SIZE: SIZE, classes: classes, freshwater: freshwater, caughtSizes: caughtSizes, wanted: wanted, missingSizes: missingSizes, capOf: capOf,
    canStock: canStock, stock: stock, shyStep: shyStep, available: available, pick: pick, caughtBack: caughtBack, trophyKg: trophyKg,
    OK: OK, POOR: POOR, DONE: DONE, create: create, has: has, kindOf: kindOf, left: left, parts: parts, done: done, full: full, clean: clean,
    murk: murk, step: step, touch: touch, bin: bin, clearStream: clearStream };
})();
