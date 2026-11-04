var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Milestones (Phase 94.1, PLAN_PLAYABILITY.md): judged from the save (and, for the two that are
// about one sitting, the run's counts passed in as sess: {pats, holeMax}), each paid once.
// save.milestones: id -> true once reached. A save from before Phase 94 carries flags.msSeed:
// its first check marks what it has already done as reached and pays nothing for the past.
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.milestones = (function () {
  var PR = [0, 0];

  function placed(sp) { return sp.locations.length > 0; }
  function journalOf(save, sp) { return save.journal[sp.id]; }

  // Each test writes [have, need] into out and returns it (no allocation).
  var TESTS = {
    caught: function (save, data, m, sess, out) { var n = 0; for (var k in save.journal) n += save.journal[k].caught || 0; out[0] = n; out[1] = m.arg; return out; },
    released: function (save, data, m, sess, out) { var n = 0; for (var k in save.journal) n += save.journal[k].released || 0; out[0] = n; out[1] = m.arg; return out; },
    // every size class a species comes in, caught (the closest species counts as the progress)
    allSizesOne: function (save, data, m, sess, out) {
      var bestH = 0, bestN = 1, bestF = -1;
      for (var i = 0; i < data.fish.length; i++) {
        var sp = data.fish[i], j = journalOf(save, sp);
        if (!placed(sp) || !j || !j.sizes || !j.sizes.length) continue;
        var want = G.sim.pond.wanted(sp, data), h = 0;
        for (var w = 0; w < want.length; w++) if (j.sizes.indexOf(want[w]) >= 0) h++;
        if (h / want.length > bestF) { bestF = h / want.length; bestH = h; bestN = want.length; }
      }
      out[0] = bestH; out[1] = bestN; return out;
    },
    species: function (save, data, m, sess, out) { return count(save, data, out, function (j) { return j.caught > 0; }, ''); },
    releasedSpecies: function (save, data, m, sess, out) { return count(save, data, out, function (j) { return j.released > 0; }, ''); },
    water: function (save, data, m, sess, out) { return count(save, data, out, function (j) { return j.caught > 0; }, m.arg); },
    // arg 0: a trophy of every species; arg n: n species with a trophy
    trophies: function (save, data, m, sess, out) {
      var n = 0, all = 0;
      for (var i = 0; i < data.fish.length; i++) {
        var sp = data.fish[i], j = journalOf(save, sp);
        if (!placed(sp)) continue;
        all++;
        if (j && j.caught > 0 && j.bestW >= G.sim.pond.trophyKg(sp)) n++;
      }
      out[0] = n; out[1] = m.arg || all; return out;
    },
    pats: function (save, data, m, sess, out) { out[0] = sess ? sess.pats | 0 : 0; out[1] = m.arg; return out; },
    hole: function (save, data, m, sess, out) { out[0] = sess ? sess.holeMax | 0 : 0; out[1] = m.arg; return out; },
    pondClean: function (save, data, m, sess, out) { var p = save.pond, Pd = G.sim.pond; out[1] = Pd.parts(data); out[0] = p ? Math.min(out[1], Pd.done(p, data)) : 0; if (p && Pd.clean(p, data)) out[0] = out[1]; return out; },
    pondFull: function (save, data, m, sess, out) { out[0] = save.pond && save.pond.stock ? save.pond.stock.length : 0; out[1] = G.sim.pond.capOf(data); return out; },
    pondCaught: function (save, data, m, sess, out) { out[0] = save.pond ? save.pond.caught | 0 : 0; out[1] = m.arg; return out; },
    cabin: function (save, data, m, sess, out) { out[0] = save.cabinLevel | 0; out[1] = data.gear.cabin.length - 1; return out; },
    rods: function (save, data, m, sess, out) { var r = save.gear.rods || []; out[0] = r.length; out[1] = data.gear.rods.length; return out; }
  };

  // Species placed (in water loc, or anywhere for ''), and of those how many pass ok(journal entry).
  function count(save, data, out, ok, loc) {
    var n = 0, all = 0;
    for (var i = 0; i < data.fish.length; i++) {
      var sp = data.fish[i];
      if (!placed(sp) || (loc && sp.locations.indexOf(loc) < 0)) continue;
      all++;
      var j = journalOf(save, sp);
      if (j && ok(j)) n++;
    }
    out[0] = n; out[1] = all; return out;
  }

  function progress(save, m, data, sess, out) {
    var t = TESTS[m.test];
    out = out || PR;
    if (!t) { out[0] = 0; out[1] = 1; return out; }
    return t(save, data, m, sess, out);
  }
  function met(save, m, data, sess) { var p = progress(save, m, data, sess, PR); return p[1] > 0 && p[0] >= p[1]; }
  function done(save, id) { return !!(save.milestones && save.milestones[id]); }

  // Judges every milestone; each newly reached one is marked and paid (save.coins += reward) and
  // its id pushed to out. A seeded (pre-Phase 94) save marks what it has already met, unpaid.
  // Returns how many were paid.
  function check(save, data, sess, out) {
    if (!save.milestones) save.milestones = {};
    var L = data.milestones, i, paid = 0;
    if (save.flags && save.flags.msSeed) {
      for (i = 0; i < L.length; i++) if (!done(save, L[i].id) && met(save, L[i], data, null)) save.milestones[L[i].id] = true;
      save.flags.msSeed = false;
    }
    for (i = 0; i < L.length; i++) {
      var m = L[i];
      if (done(save, m.id) || !met(save, m, data, sess)) continue;
      save.milestones[m.id] = true;
      save.coins += m.reward;
      paid++;
      if (out) out.push(m.id);
    }
    return paid;
  }

  // Problems with the data (--validate).
  function validate(data) {
    var errs = [], seen = {};
    for (var i = 0; i < data.milestones.length; i++) {
      var m = data.milestones[i], p = 'milestone ' + (m.id || i) + ': ';
      if (typeof m.id !== 'string' || seen[m.id]) errs.push(p + 'id missing or repeated');
      seen[m.id] = true;
      if (typeof m.name !== 'string' || !m.name) errs.push(p + 'name');
      if (!TESTS[m.test]) errs.push(p + 'test ' + m.test + ' is not one of ' + Object.keys(TESTS).join(', '));
      if (!(m.reward >= 25 && m.reward <= 500 && m.reward % 5 === 0)) errs.push(p + 'reward 25-500 coins');
      if (m.test === 'water' && !data.locations[m.arg]) errs.push(p + 'water ' + m.arg);
      if ((m.test === 'caught' || m.test === 'released' || m.test === 'pats' || m.test === 'hole' || m.test === 'pondCaught') && !(m.arg >= 1)) errs.push(p + 'arg must be 1 or more');
      if (['fish', 'release', 'size', 'water', 'book', 'trophy', 'dog', 'hole', 'pond', 'cabin', 'rod'].indexOf(m.icon) < 0) errs.push(p + 'icon ' + m.icon);
    }
    return errs;
  }

  return { TESTS: TESTS, progress: progress, met: met, done: done, check: check, validate: validate,
    byId: function (data, id) { for (var i = 0; i < data.milestones.length; i++) if (data.milestones[i].id === id) return data.milestones[i]; return null; } };
})();
