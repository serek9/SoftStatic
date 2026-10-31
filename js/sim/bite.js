var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Bite and hook (V3.5). When a fish in the school reaches its `bite` state, a generous
// window opens (2 s). Reeling (holding action) inside it hooks the fish (input.auto hooks
// at once: the balance tool's model). Missing it is fine: the fish may come back once, otherwise it
// swims off. One bite at a time.
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.bite = (function () {
  var B = { hookWindow: 2, returnChance: 0.5 };
  var NONE = 0, HOOK = 1, MISS = 2;

  function create() { return { slot: -1, uid: 0, t: 0 }; }

  function reset(b) { b.slot = -1; b.uid = 0; b.t = 0; }

  // A missed fish comes back once (wanders off, then may notice the lure again) or leaves.
  function miss(f, rng) {
    if (!f.missed && rng.next() < B.returnChance) {
      f.missed = 1; f.state = 'wander'; f.t = 0; f.turnT = rng.range(1.5, 3);
    } else {
      f.state = 'leave'; f.t = 0;
    }
  }

  // step(bite, input, dt, rng, data, school): input is {reel, auto}. Returns NONE, HOOK or
  // MISS. On HOOK, bite.slot is the hooked fish; the caller takes it and calls reset().
  function step(b, input, dt, rng, data, school) {
    var fish = school.fish, i, f;
    if (b.slot >= 0) {
      f = fish[b.slot];
      if (!f.active || f.uid !== b.uid || f.state !== 'bite') reset(b);
    }
    if (b.slot < 0) {
      for (i = 0; i < fish.length; i++) if (fish[i].active && fish[i].state === 'bite') { b.slot = i; b.uid = fish[i].uid; b.t = 0; break; }
      if (b.slot < 0) return NONE;
    }
    for (i = 0; i < fish.length; i++) {
      if (i !== b.slot && fish[i].active && fish[i].state === 'bite') { fish[i].state = 'leave'; fish[i].t = 0; }
    }
    if (input.reel || input.auto) return HOOK;
    b.t += dt;
    if (b.t >= B.hookWindow) {
      miss(fish[b.slot], rng);
      reset(b);
      return MISS;
    }
    return NONE;
  }

  // Phase 23: the hook hold a hook-set gives, from how long the bite had waited (t s):
  // 1 at once, holdLate at the window's end. (Phase 52: passive mode and its holdPassive are gone.)
  function hold(t, data) {
    var k = data.gear.fight;
    return 1 - (1 - k.holdLate) * Math.min(1, Math.max(0, t) / B.hookWindow);
  }

  return { B: B, NONE: NONE, HOOK: HOOK, MISS: MISS, create: create, reset: reset, step: step, miss: miss, hold: hold };
})();
