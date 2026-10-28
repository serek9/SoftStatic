var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Seeded RNG (mulberry32). G.rng is for simulation only, G.vrng for visuals only (§0.6).
// The whole state is one 32-bit integer, so it saves as a plain number.
// No window, Date or Math.random here: this file must also run in Node through vm.
G.core = G.core || {};
G.core.rng = (function () {
  function Rng(seed) { this.s = seed | 0; }

  Rng.prototype.seed = function (n) { this.s = n | 0; };
  Rng.prototype.getState = function () { return this.s; };
  Rng.prototype.setState = function (s) { this.s = s | 0; };

  // Float in [0, 1).
  Rng.prototype.next = function () {
    var t = this.s = (this.s + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Float in [a, b).
  Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };

  // Integer in [a, b], both inclusive.
  Rng.prototype.int = function (a, b) { return a + Math.floor((b - a + 1) * this.next()); };

  // Random element of arr (undefined if arr is empty).
  Rng.prototype.pick = function (arr) { return arr[Math.floor(arr.length * this.next())]; };

  // Index chosen in proportion to weights[i], or to weights[i][key] when key is given.
  // Weights of 0 or less are never chosen. Returns -1 when nothing can be chosen.
  Rng.prototype.weighted = function (weights, key) {
    var total = 0, last = -1, i, w;
    for (i = 0; i < weights.length; i++) {
      w = key ? weights[i][key] : weights[i];
      if (w > 0) { total += w; last = i; }
    }
    if (last < 0) return -1;
    var r = this.next() * total;
    for (i = 0; i < last; i++) {
      w = key ? weights[i][key] : weights[i];
      if (w > 0) { r -= w; if (r < 0) return i; }
    }
    return last;
  };

  // Seeds both streams from one number; vrng gets a different stream so visuals never shift the sim.
  function seedAll(n) {
    G.rng.seed(n);
    G.vrng.seed(n ^ 0x5BD1E995);
    G.core.rng.seedValue = n | 0;
  }

  return { Rng: Rng, seedAll: seedAll, seedValue: 1 };
})();

G.rng = new G.core.rng.Rng(1);
G.vrng = new G.core.rng.Rng(1 ^ 0x5BD1E995);

if (G.core.debug) G.core.debug.addLine(function () {
  return 'seed ' + G.core.rng.seedValue + '  rng ' + (G.rng.getState() >>> 0).toString(16) +
    '  vrng ' + (G.vrng.getState() >>> 0).toString(16);
});
