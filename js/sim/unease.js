var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Unease (V10.1): a hidden 0..1 value per location. It rises at night, much faster when
// the boat sits still, and falls in the grey hours and at the shop. It never punishes:
// it opens rarer, stranger fish (fish_ai.speciesWeights).
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.unease = (function () {
  // Change per real second.
  var P = {
    stillNight: 1 / 600,   // still at night: 0 -> 1 in 10 game hours (from 17:00, full by about 03:00)
    movingNight: 1 / 2400, // sailing at night
    grey: -1 / 300,        // grey hours: 1 -> 0 in 5 game hours
    shop: -1 / 40          // at the shop: 1 -> 0 in 40 s   TODO(P9.4): the shop sets atShop
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

  // TODO(P10.1): anomaly eligibility and scheduling live here.

  return { P: P, get: get, set: set, step: step };
})();
