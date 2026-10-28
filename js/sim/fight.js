var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fight (V4): tension T 0..1, distance D 0..1 (1 far, 0 at the boat), stamina S 0..1,
// and a mode that alternates between `pull` and `tired`. No catch bar, no mashing.
//  pull:  lasts rand(1.2, 3) × (0.5 + S) s. Reeling: T rises at (strength / line) × 0.5 /s
//         and D does not shrink. Not reeling: T falls at 0.7× that rate and D grows by
//         speed × 0.03 /s. S falls by fatigue /s.
//  tired: lasts rand(1, 2.5) × (1.5 − S) s. Reeling: D shrinks at reel / sqrt(mass) /s and
//         T rises only 0.06 /s. Not reeling: T drops 0.45 /s. S recovers 0.03 /s.
//  The first time T reaches 1 is a slip (T = 0.6, D + 0.1); the second time the line snaps.
//  Won at D <= 0. A gentle escape if D stays at 1 for 3 s.
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.fight = (function () {
  var DT = 1 / 60;
  // TODO(P8.1): these move to data/gear.js with the other fight constants; step() already
  // prefers data.fightK when it exists.
  var K = {
    pull0: 1.2, pull1: 3, tired0: 1, tired1: 2.5,
    pullRise: 0.5, easeFall: 0.7, run: 0.03,
    tiredRise: 0.06, release: 0.45, recover: 0.03,
    slipT: 0.6, slipD: 0.1, escape: 3,
    d0: 0.6 // where D starts when the fish is hooked
  };
  var NONE = 0, WIN = 1, SNAP = 2, ESCAPE = 3;

  function create() {
    return {
      active: false, sp: -1, T: 0, D: 0, D0: 0, S: 1, mode: 'pull', modeT: 0, slips: 0, escT: 0,
      result: NONE, slipped: false, t: 0,
      strength: 0, speed: 0, fatigue: 0, mass: 1, lineStrength: 1, reelSpeed: 0,
      ap: { mode: '', delay: 0, err: 0, prev: 0 } // auto-player memory
    };
  }

  // Starts a fight with species fish (a data/fish.js entry) on gear {lineStrength, reelSpeed}.
  function start(st, sp, fish, gear, rng, k) {
    k = k || K;
    st.active = true; st.sp = sp;
    st.T = 0; st.D = st.D0 = k.d0; st.S = 1; st.slips = 0; st.escT = 0; st.result = NONE; st.slipped = false; st.t = 0;
    st.strength = fish.strength; st.speed = fish.speed; st.fatigue = fish.fatigue; st.mass = fish.mass;
    st.lineStrength = gear.lineStrength; st.reelSpeed = gear.reelSpeed;
    st.mode = 'pull';
    st.modeT = rng.range(k.pull0, k.pull1) * (0.5 + st.S);
    st.ap.mode = ''; st.ap.delay = 0; st.ap.err = 0; st.ap.prev = 0;
  }

  // step(state, input, dt, rng, data): input is {reel}. Returns NONE, WIN, SNAP or ESCAPE.
  function step(st, input, dt, rng, data) {
    var k = (data && data.fightK) || K;
    st.slipped = false;
    st.t += dt;
    if (st.mode === 'pull') {
      var rise = (st.strength / st.lineStrength) * k.pullRise;
      if (input.reel) st.T += rise * dt;
      else { st.T -= rise * k.easeFall * dt; st.D += st.speed * k.run * dt; }
      st.S -= st.fatigue * dt;
    } else {
      if (input.reel) { st.D -= st.reelSpeed / Math.sqrt(st.mass) * dt; st.T += k.tiredRise * dt; }
      else st.T -= k.release * dt;
      st.S += k.recover * dt;
    }
    if (st.S < 0) st.S = 0; else if (st.S > 1) st.S = 1;

    if (st.T >= 1) {
      if (st.slips === 0) { st.slips = 1; st.T = k.slipT; st.D = Math.min(1, st.D + k.slipD); st.slipped = true; }
      else { st.T = 1; st.result = SNAP; st.active = false; return SNAP; }
    }
    if (st.T < 0) st.T = 0;
    if (st.D <= 0) { st.D = 0; st.result = WIN; st.active = false; return WIN; }
    if (st.D >= 1) {
      st.D = 1;
      st.escT += dt;
      if (st.escT >= k.escape) { st.result = ESCAPE; st.active = false; return ESCAPE; }
    } else st.escT = 0;

    st.modeT -= dt;
    if (st.modeT <= 0) {
      if (st.mode === 'pull') { st.mode = 'tired'; st.modeT = rng.range(k.tired0, k.tired1) * (1.5 - st.S); }
      else { st.mode = 'pull'; st.modeT = rng.range(k.pull0, k.pull1) * (0.5 + st.S); }
    }
    return NONE;
  }

  // The auto-player (V7): reels when the fish is tired, eases when it pulls. skill 0..1 sets
  // how fast it notices a mode change and how often it slips into the wrong action.
  // Returns 1 (reel) or 0 (ease) for this step.
  var AP = {
    delay0: 0.5, delay1: 2,  // s to react to a mode change, × (1 - skill)
    errRate: 1.5,            // wrong-action spells per s, × (1 - skill)
    err0: 0.4, err1: 1.5     // s each spell lasts
  };

  function autoPlayer(st, skill, rng) {
    var ap = st.ap, reel;
    if (ap.mode !== st.mode) { ap.mode = st.mode; ap.delay = (1 - skill) * rng.range(AP.delay0, AP.delay1); }
    if (ap.delay > 0) { ap.delay -= DT; return ap.prev; }
    reel = st.mode === 'tired';
    if (ap.err > 0) { ap.err -= DT; reel = !reel; }
    else if (rng.next() < (1 - skill) * AP.errRate * DT) ap.err = rng.range(AP.err0, AP.err1);
    ap.prev = reel ? 1 : 0;
    return ap.prev;
  }

  return { K: K, AP: AP, NONE: NONE, WIN: WIN, SNAP: SNAP, ESCAPE: ESCAPE, create: create, start: start, step: step, autoPlayer: autoPlayer };
})();
