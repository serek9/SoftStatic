var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Unease (V10.1): a hidden 0..1 value per location. It rises at night, much faster when
// the boat sits still, and falls in the grey hours and at the shop. It never punishes:
// it opens rarer, stranger fish (fish_ai.speciesWeights) and makes anomalies likelier.
// This file also schedules anomalies (10.1), works out what a cast's landing spot is worth,
// and decides when journal pages gain hints (10.5).
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.unease = (function () {
  // Change per real second.
  var P = {
    stillNight: 1 / 600,   // still at night: 0 -> 1 in 10 game hours (from 17:00, full by about 03:00)
    movingNight: 1 / 2400, // sailing at night
    grey: -1 / 300,        // grey hours: 1 -> 0 in 5 game hours
    shop: -1 / 40          // at the shop (ui/shop.js sets atShop): 1 -> 0 in 40 s
  };

  function get(save, loc) { return (save.unease && save.unease[loc]) || 0; }

  function set(save, loc, v) {
    if (!save.unease) save.unease = {};
    save.unease[loc] = v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  // step(save, input, dt): input is {loc, still, atShop}. Changes save.unease[input.loc] only.
  function step(save, input, dt) {
    var rate;
    if (input.atShop) rate = P.shop;
    else if (G.sim.clock.isGrey(save.clock || 0)) rate = P.grey;
    else rate = input.still ? P.stillNight : P.movingNight;
    set(save, input.loc, get(save, input.loc) + rate * dt);
  }

  // ---- Anomalies (10.1) ------------------------------------------------------------
  // The scheduler keeps its state in run state (never saved): the one active anomaly, the
  // gap since the last one, the next roll, and each anomaly's cooldown. Saved "seen"
  // counts are the scene's job (anomalyStep only changes the state passed in).
  var NONE = 0, STARTED = 1, ENDED = 2;

  function createAnomalies() {
    return { on: false, idx: -1, id: '', what: '', t: 0, dur: 0, x: 0, gap: 0, roll: 0, cool: {} };
  }

  function inHours(h, hours) {
    if (!hours) return true;
    return hours[0] <= hours[1] ? (h >= hours[0] && h < hours[1]) : (h >= hours[0] || h < hours[1]);
  }

  // input: {loc, hour, unease}. Cooldowns and the one-at-a-time rule are checked by the caller.
  function eligible(a, input) {
    return a.locations.indexOf(input.loc) >= 0 && input.unease >= a.uneaseMin && inHours(input.hour, a.hours);
  }

  // Starts list[idx] (also used by dbg to force one). input: {boatX, reach, width}.
  function startAnomaly(A, idx, input, rng, data) {
    var a = data.anomalies.list[idx], q = a.params;
    A.on = true; A.idx = idx; A.id = a.id; A.what = q.what; A.t = 0;
    A.dur = rng.range(q.dur[0], q.dur[1]);
    if (q.place === 'boat') A.x = input.boatX;
    else {
      var side = rng.next() < 0.5 ? -1 : 1, d = rng.range(40, Math.max(41, input.reach));
      A.x = input.boatX + side * d;
      if (A.x < 20 || A.x > input.width - 20) A.x = input.boatX - side * d; // the other side fits
    }
    return STARTED;
  }

  // step for anomalies: input {loc, hour, unease, boatX, reach, width}. Returns NONE,
  // STARTED or ENDED. It always ends by itself after its duration.
  function anomalyStep(A, input, dt, rng, data) {
    var D = data.anomalies, k;
    for (k in A.cool) if (A.cool[k] > 0) A.cool[k] -= dt;
    if (A.on) {
      A.t += dt;
      if (A.t < A.dur) return NONE;
      A.on = false; A.gap = D.gap; A.cool[A.id] = D.list[A.idx].cooldown;
      return ENDED;
    }
    if (A.gap > 0) { A.gap -= dt; return NONE; }
    A.roll -= dt;
    if (A.roll > 0) return NONE;
    A.roll = D.check;
    if (rng.next() >= D.chance * input.unease) return NONE;
    var n = 0, i;
    for (i = 0; i < D.list.length; i++) if (eligible(D.list[i], input) && !(A.cool[D.list[i].id] > 0)) n++;
    if (!n) return NONE;
    var pick = rng.int(0, n - 1);
    for (i = 0; i < D.list.length; i++) {
      if (!eligible(D.list[i], input) || A.cool[D.list[i].id] > 0) continue;
      if (pick-- === 0) return startAnomaly(A, i, input, rng, data);
    }
    return NONE;
  }

  // Where a cast lands matters (§2): fills out {attract, rare, legend} for a lure landing at
  // world x. An active spotBoost anomaly within reach raises rare weights; the location's
  // spots add their own (data/loc_*.js: hidden spots attract and rare, legendary spots legend).
  function castBoost(A, loc, x, data, out) {
    out.attract = 1; out.rare = 1; out.legend = 1;
    if (A && A.on) {
      var a = data.anomalies.list[A.idx];
      if (a.effect === 'spotBoost' && Math.abs(x - A.x) <= a.params.r) out.rare *= a.params.rare;
    }
    var spots = loc.spots || [];
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (Math.abs(x - s.x) > s.r) continue;
      if (s.attract) out.attract *= s.attract;
      if (s.rare) out.rare *= s.rare;
      if (s.legend) out.legend *= s.legend;
    }
    return out;
  }

  // ---- Late journal hints (10.5, and the revealHint effect) ------------------------------
  // When the journal is closed, a page may gain one true hint the player never found: the
  // species' hintRefs, then 'bait' and 'depth'. Uncaught species come first, in data order.
  // Deterministic: the same save gives the same hint. Unless forced, it needs this
  // location's unease >= LATE.unease and at least one catch since the last late hint.
  // Writes save.journal (j.hints, j.late[ref], j.lateNew) and save.flags.lateAt.
  var LATE = { unease: 0.4 };

  function lateHint(save, loc, data, force) {
    var total = 0, id, pass, i, r;
    for (id in save.journal) total += save.journal[id].caught;
    if (!force && (get(save, loc) < LATE.unease || total <= save.flags.lateAt)) return null;
    for (pass = 0; pass < 2; pass++) {
      for (i = 0; i < data.fish.length; i++) {
        var sp = data.fish[i], j = save.journal[sp.id], caught = j ? j.caught : 0;
        if (sp.locations.indexOf(loc) < 0 || (caught > 0) !== (pass === 1)) continue;
        var refs = sp.hintRefs.concat(['bait', 'depth']);
        for (r = 0; r < refs.length; r++) {
          var ref = refs[r];
          if (j && j.hints.indexOf(ref) >= 0) continue;
          if ((ref === 'bait' && caught >= 2) || (ref === 'depth' && caught >= 3)) continue; // already shown by catching
          if (!j) j = save.journal[sp.id] = { caught: 0, bestLen: 0, bestW: 0, hints: [], seen: false, phantom: false };
          j.hints.push(ref);
          j.late = j.late || {};
          j.late[ref] = true;
          j.lateNew = true;
          save.flags.lateAt = total;
          return { id: sp.id, ref: ref };
        }
      }
    }
    return null;
  }

  return {
    P: P, get: get, set: set, step: step,
    NONE: NONE, STARTED: STARTED, ENDED: ENDED, LATE: LATE,
    createAnomalies: createAnomalies, inHours: inHours, eligible: eligible, startAnomaly: startAnomaly,
    anomalyStep: anomalyStep, castBoost: castBoost, lateHint: lateHint
  };
})();
