var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Red Room Reservoir (V6.4): impossible water. Curtains hang where mist would be, the
// shore is a zigzag floor, the reflection is crimson, and the structures standing in the
// water (a lamp, an armchair, a statue) are somewhere else after every cast. Each carries a
// spot, so following the moved structure finds where it fishes now (§2). Drawn by the 'red'
// scenery module (js/scene/scenery.js).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.red = {
  id: 'red',
  name: 'Red Room Reservoir',
  cost: 5500,
  // Also needs (V6) a specific fish caught in a specific clock window: the Pines'
  // Three-Thirty-Three, which bites only in the 03:33 window (economy.canUnlock).
  need: { windowCatch: 'owl_333', fish: 'three_thirty_three', text: 'It opens to someone who has caught what rises at 03:33 in The Pines.' },
  width: 1100,
  waterY: 112,
  maxDepth: 80,
  seed: 9001,
  start: 140,
  scenery: 'red',

  layers: [
    { id: 'curtains', kind: 'curtain', parallax: 0.15, color: 'crimson', dark: 'blood', hi: 'dusk_rose', hem: 104, panel: [70, 150], gap: [18, 46] },
    { id: 'valance', kind: 'curtain', parallax: 0.4, color: 'blood', dark: 'rust_dark', hi: 'crimson', hem: 22, panel: [200, 320], gap: [0, 0] },
    { id: 'floor', kind: 'zigzag', parallax: 0.6, color: 'ink', alt: 'bone', height: 6 },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],
  landmarks: [],
  // Indoors: no stars, moon, clouds or dusk glow (presentation only).
  sky: { stars: false, moon: false, clouds: false, glow: false },
  grade: false, // the room's light does not follow the hour

  // The structures that move. Each one's spot goes wherever it stands.
  movers: [
    { id: 'lamp', kind: 'floor_lamp', r: 26, rare: 2.5 },
    { id: 'chair', kind: 'armchair', r: 28, attract: 1.5 },
    { id: 'statue', kind: 'statue', r: 24, attract: 1.2, rare: 1.5 }
  ],
  moverGap: 140, // px kept between two structures

  underwater: {
    bottomAmp: 18, rock: 'ink', silt: 'blood',
    weed: 'crimson', weedDark: 'blood', weedDensity: 0.03, shaftEvery: 170
  },

  // These two stay put (the dog's stare and the legendary spot).
  spots: [
    { id: 'floor_drain', kind: 'legendary', x: 560, r: 20, legend: 4, where: 'over the drain in the floor' },
    { id: 'hem', kind: 'hidden', x: 990, r: 22, attract: 1.6, rare: 2 }
  ],

  reflect: { tint: 'crimson', alpha: 0.55 },

  // 11.3: where each mover stands (world x into xs) for a layout seed: the location's seed
  // when you arrive, then each cast's own seed. Pure and deterministic; keeps moverGap
  // between structures and 60 px from the world's ends.
  place: function (seed, xs) {
    var rng = new G.core.rng.Rng(seed), n = this.movers.length, lo = 60, hi = this.width - 60;
    for (var i = 0; i < n; i++) {
      var x = 0;
      for (var tries = 0; tries < 40; tries++) {
        x = Math.round(rng.range(lo, hi));
        var ok = true;
        for (var k = 0; k < i; k++) if (Math.abs(x - xs[k]) < this.moverGap) ok = false;
        if (ok) break;
      }
      xs[i] = x;
    }
    return xs;
  }
};
