var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Passive mode (V7). One cycle is one cast that fishes itself through the same sim as
// active play: a wait of base / (rod × bait attract), the species from fish_ai.pickSpecies,
// an automatic hook, the fight played by fight.autoPlayer at skill 0.8, and the sale scaled
// by passive.incomeMult (data/gear.js, D5). Live passive mode (scene/sailing.js) and time
// away (offline, on load) run the very same plan/apply, so they cannot drift apart (§5).
//   plan(ps, rng, data)  decides a cycle starting now: how long, what bites, how it ends
//   apply(ps, data)      writes a planned cycle's catch into the save
//   cycle(ps, rng, data) plan, let the clock and unease run for its length, apply
//   offline(ps, elapsed, rng, data, tape)  up to 200 cycles in at most 8 hours away
// The tape (V10.3) is decided here too, from the same rng: catches listed as ???, a
// missing range, and a phantom journal entry for a species you can really catch here.
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.passive = (function () {
  var DT = 1 / 60;
  var P = {
    base: 48,             // s of waiting per cycle at attract 1, so a cycle takes about as long as an active cast
    spread: [0.6, 1.4],   // × the wait, per cycle
    skill: 0.8,           // the auto-player's fight skill (V7)
    depthM: 8,            // where the passive lure sits (kept above the location's bottom)
    fightMax: 120,        // s; a fight still going after this ends as an escape
    chunk: 1,             // s per clock and unease step while a cycle's time passes
    cap: 8 * 3600,        // s of time away that count (V7)
    cycles: 200,          // cycles at most for time away (V7)
    awayMin: 60           // s away before it counts at all
  };
  // The tape (V10.3). unknown: chance a catch is listed as ??? (× unease × (1 + wrongness)).
  // gap: chance per tape (× unease, from gapMin) of one missing range of gapLen game hours.
  // phantom: chance per tape (× unease, from phantomMin) of a phantom entry. keep: tapes saved.
  var TAPE = { unknown: 0.1, gapMin: 0.3, gap: 0.6, gapLen: [0.25, 0.67], phantomMin: 0.5, phantom: 0.5, keep: 3 };
  var EMPTY = 0, CAUGHT = 1, LOST = 2;

  function create(save, loc, data) {
    return {
      save: save, loc: loc, fx: {}, fight: G.sim.fight.create(), ctx: G.sim.fish_ai.createSchool(data).ctx,
      boost: { attract: 1, rare: 1, legend: 1 }, latched: {}, uIn: { loc: loc, still: true, atShop: false },
      plan: { wait: 0, fightT: 0, total: 0, sp: -1, result: EMPTY, len: 0, w: 0, price: 0, coins: 0, win: null }
    };
  }

  function plan(ps, rng, data) {
    var save = ps.save, E = G.sim.economy, C = G.sim.clock, fx = E.effects(save, data, ps.fx), c = ps.ctx, pl = ps.plan;
    var loc = data.locations[ps.loc], bait = E.useBait(save, data), k;
    C.clearLatch(ps.latched);
    C.latch(ps.latched, save.clock, data.windows); // the lure lands now (D1)
    pl.wait = P.base / (fx.attract * ps.boost.attract) * rng.range(P.spread[0], P.spread[1]);
    c.loc = ps.loc; c.hour = C.advance(save.clock, pl.wait); c.unease = G.sim.unease.get(save, ps.loc);
    c.depthM = Math.min(P.depthM, loc.maxDepth * 0.25 - 1); c.bait = bait; c.latched = ps.latched;
    c.rodMaxMass = fx.maxMass; c.attract = fx.attract; c.rareBoost = fx.rareBoost * ps.boost.rare; c.legendBoost = ps.boost.legend;
    c.maxDepthPx = loc.maxDepth;
    pl.sp = G.sim.fish_ai.pickSpecies(c, rng);
    pl.fightT = 0; pl.len = 0; pl.w = 0; pl.price = 0; pl.coins = 0; pl.win = null;
    if (pl.sp < 0) { pl.result = EMPTY; pl.total = pl.wait; return pl; }

    var sp = data.fish[pl.sp], F = G.sim.fight, st = ps.fight, inp = { reel: false }, r = F.NONE;
    F.start(st, pl.sp, sp, fx, rng, data); // hooked by itself (V3.5)
    while (r === F.NONE && pl.fightT < P.fightMax) {
      inp.reel = F.autoPlayer(st, P.skill, rng) === 1;
      r = F.step(st, inp, DT, rng, data);
      pl.fightT += DT;
    }
    pl.result = r === F.WIN ? CAUGHT : LOST;
    if (pl.result === CAUGHT) {
      var q = rng.next();
      pl.len = Math.round((sp.lengthCm[0] + (sp.lengthCm[1] - sp.lengthCm[0]) * q) * 10) / 10;
      pl.w = Math.round((sp.weightKg[0] + (sp.weightKg[1] - sp.weightKg[0]) * Math.pow(q, 1.3)) * 100) / 100;
      pl.price = E.price(sp, q, data);
      pl.coins = Math.round(pl.price * data.gear.passive.incomeMult);
      for (k in ps.latched) { pl.win = k; break; }
    }
    pl.total = pl.wait + pl.fightT;
    return pl;
  }

  // The catch goes into the journal and is sold (passive never keeps fish).
  function apply(ps, data) {
    var pl = ps.plan;
    if (pl.result !== CAUGHT) return pl.result;
    var sp = data.fish[pl.sp];
    G.sim.economy.recordCatch(ps.save, { id: sp.id, len: pl.len, w: pl.w, price: pl.coins, hintRefs: sp.hintRefs, windowCatch: pl.win }, 'sell');
    return CAUGHT;
  }

  // The clock and unease run for s seconds with the boat still (V10.1).
  function passTime(ps, s) {
    ps.uIn.loc = ps.loc;
    while (s > 1e-9) {
      var d = Math.min(P.chunk, s);
      G.sim.clock.step(ps.save, null, d);
      G.sim.unease.step(ps.save, ps.uIn, d);
      s -= d;
    }
  }

  // One whole cycle (offline and the balance checks). Returns its length in s.
  function cycle(ps, rng, data) {
    plan(ps, rng, data);
    passTime(ps, ps.plan.total);
    apply(ps, data);
    return ps.plan.total;
  }

  // ---- The tape (V10.3) -------------------------------------------------------------------
  // {kind 'away'|'live', loc, from, to (game hours), secs, peak (highest unease while it
  //  recorded), entries, gap {from, to} | null, coins, caught, lost, phantom id | null}. An entry: {h, id, len, w, c (coins), r (result),
  //  q (listed as ???), g (inside the missing range), ph (a phantom: never caught)}.

  function newTape(save, loc, kind) {
    return { kind: kind, loc: loc, from: save.clock, to: save.clock, secs: 0, peak: G.sim.unease.get(save, loc), entries: [], gap: null, coins: 0, caught: 0, lost: 0, phantom: null };
  }

  // Adds the cycle just applied. Empty cycles pass time but leave nothing on the tape.
  function record(tape, ps, rng, data) {
    var pl = ps.plan, save = ps.save;
    var u = G.sim.unease.get(save, ps.loc);
    tape.secs += pl.total;
    tape.to = save.clock;
    if (u > tape.peak) tape.peak = u;
    if (pl.result === EMPTY) return;
    var sp = data.fish[pl.sp];
    var unknown = pl.result === CAUGHT && rng.next() < u * TAPE.unknown * (1 + sp.look.wrongness);
    tape.entries.push({ h: save.clock, id: sp.id, len: pl.len, w: pl.w, c: pl.coins, r: pl.result, q: unknown, g: false, ph: false });
    if (pl.result === CAUGHT) { tape.caught++; tape.coins += pl.coins; } else tape.lost++;
  }

  // Game hours from a to b going forward (wrapping past midnight).
  function span(a, b) { return G.sim.clock.wrap(b - a); }

  // A species you could really catch here now that has never been caught (or seen as a phantom).
  function phantomPick(save, loc, u, rng, data) {
    var rod = data.gear.rods[save.gear.rod].maxMass, pool = [];
    for (var i = 0; i < data.fish.length; i++) {
      var f = data.fish[i], j = save.journal[f.id];
      if (f.locations.indexOf(loc) < 0 || f.mass > rod || f.uneaseMin > u) continue;
      if (j && (j.caught > 0 || j.phantom)) continue;
      pool.push(f.id);
    }
    return pool.length ? pool[rng.int(0, pool.length - 1)] : null;
  }

  // Decides the missing range and the phantom (by the highest unease while it recorded),
  // writes the phantom into the journal, and keeps the tape (newest first, at most
  // TAPE.keep). Returns the tape.
  function finish(tape, save, rng, data) {
    var u = tape.peak, len = tape.secs / 60, i, e; // game hours
    if (u >= TAPE.gapMin && len >= 1 && rng.next() < u * TAPE.gap) {
      var g = rng.range(TAPE.gapLen[0], TAPE.gapLen[1]), at = rng.range(0, len - g);
      tape.gap = { from: G.sim.clock.wrap(tape.from + at), to: G.sim.clock.wrap(tape.from + at + g) };
      for (i = 0; i < tape.entries.length; i++) {
        e = tape.entries[i];
        e.g = span(tape.from, e.h) >= at && span(tape.from, e.h) < at + g;
      }
    }
    if (u >= TAPE.phantomMin && tape.entries.length && rng.next() < u * TAPE.phantom) {
      var id = phantomPick(save, tape.loc, u, rng, data);
      if (id) {
        var j = save.journal[id];
        if (!j) j = save.journal[id] = { caught: 0, bestLen: 0, bestW: 0, hints: [], seen: false, phantom: false };
        j.phantom = true; // economy.recordCatch clears it when the fish is really caught
        tape.phantom = id;
        var h = G.sim.clock.wrap(tape.from + rng.range(0, Math.max(0.01, len))), k = 0;
        while (k < tape.entries.length && span(tape.from, tape.entries[k].h) <= span(tape.from, h)) k++;
        tape.entries.splice(k, 0, { h: h, id: id, len: 0, w: 0, c: 0, r: CAUGHT, q: false, g: false, ph: true });
      }
    }
    save.tapes.unshift(tape);
    if (save.tapes.length > TAPE.keep) save.tapes.length = TAPE.keep;
    return tape;
  }

  // ---- Time away (12.3) ---------------------------------------------------------------------
  // elapsed real seconds, capped at P.cap; at most P.cycles cycles fit in it, back to back,
  // and whatever time is left passes with the boat still. Returns the number of cycles.
  function offline(ps, elapsed, rng, data, tape) {
    var left = Math.min(Math.max(0, elapsed), P.cap), n = 0;
    while (n < P.cycles) {
      plan(ps, rng, data);
      if (ps.plan.total > left) break;
      passTime(ps, ps.plan.total);
      apply(ps, data);
      if (tape) record(tape, ps, rng, data);
      left -= ps.plan.total;
      n++;
    }
    passTime(ps, left);
    if (tape) tape.to = ps.save.clock;
    return n;
  }

  // On load: if the save has been away long enough, fish the time away at its location and
  // return the finished tape (or null). now is the caller's clock in ms (the sim reads no Date).
  function away(save, now, rng, data) {
    var elapsed = save.lastSeen ? (now - save.lastSeen) / 1000 : 0;
    if (elapsed < P.awayMin) return null;
    var loc = data.locations[save.loc] ? save.loc : 'fog', ps = create(save, loc, data), tape = newTape(save, loc, 'away');
    offline(ps, elapsed, rng, data, tape);
    return finish(tape, save, rng, data);
  }

  return {
    P: P, TAPE: TAPE, EMPTY: EMPTY, CAUGHT: CAUGHT, LOST: LOST,
    create: create, plan: plan, apply: apply, passTime: passTime, cycle: cycle,
    newTape: newTape, record: record, finish: finish, offline: offline, away: away
  };
})();
