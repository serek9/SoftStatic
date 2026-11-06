var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Blackwater Creek (V6.2): a winding forest river with decaying cabins, snags of dead
// branches, and a slow current that carries the lure downstream (drift, below).
// Same units as loc_fog.js: world pixels, layer features in layer pixels, depths in px.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.creek = {
  id: 'creek',
  name: 'Blackwater Creek',
  cost: 250, // Phase 96.1 (was 550)
  width: 1300,
  waterY: 112,
  maxDepth: 64,
  seed: 5113,
  start: 160,
  dock: { x: 96, reach: 60 }, // Phase 74: the pier at the west end (js/ui/dock.js)
  // Phase 20: the surface's swell (view px; see loc_fog.js): short and choppy, running with the current.
  swell: { amp: 2, mirror: 1.1, waves: [[52, 22, 0.45], [27, 15, 0.35], [13, 9, 0.2]] },

  // 2026-11-06 (the user's third reference: a blush dusk over snow): snowy ranges lit rose,
  // rounded slopes of conifers in mist, a dark line of spruce, old pines with flat ragged crowns
  // (one with an eagle's nest), a bank of violet granite with rust brush and gold larches, and
  // mist on the water. Painters: js/scene/creek.js (oldpines, granite; fbhills from fogbound.js)
  // and js/gfx/paint.js (mountains, forest, bank). The cabins and snags are the landmarks.
  scenery: 'creek',
  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 90, amp: 58, cap: 2.2, capFrom: 0.5, color: 'mtnc', lit: 'mtnc_lit', dark: 'mtnc_dark', haze: 'mtnc_haze', snow: 'snowp_lit', snowDark: 'snowp' },
    { id: 'range', kind: 'mountains', parallax: 0.08, base: 94, amp: 30, cap: 1.8, capFrom: 0.6, color: 'mtnc', lit: 'mtnc_lit', dark: 'mtnc_dark', haze: 'mtnc_haze', snow: 'snowp_lit', snowDark: 'snowp' },
    { id: 'fog_high', kind: 'fog', parallax: 0.09, y: 76, h: 20, color: 'fog_mauve', alpha: 0.3, drift: 0.6 },
    { id: 'hills', kind: 'fbhills', parallax: 0.12, base: 100, amp: 34, domes: 4, trees: 2.2,
      keys: { mid: 'hillc_mid', lit: 'hillc_lit', dark: 'hillc_dark', haze: 'hillc_haze', tree: 'hillc_dark' } },
    { id: 'fog_far', kind: 'fog', parallax: 0.2, y: 88, h: 16, color: 'fog_mauve', alpha: 0.45, drift: 0.8 },
    { id: 'forest', kind: 'forest', parallax: 0.32, base: 102, height: 26, gap: [2, 6], mix: { spruce: 0.58, pine: 0.31, larch: 0.06, dead: 0.05 },
      keys: { pine: { dark: 'pinec_dark', mid: 'pinec_mid', lit: 'pinec_lit', trunk: 'pinec_dark' }, larch: { dark: 'larch_dark', mid: 'larch_mid', lit: 'larch_lit', trunk: 'pinec_trunk' } } },
    { id: 'fog_mid', kind: 'fog', parallax: 0.4, y: 96, h: 12, color: 'fog_mauve', alpha: 0.34, drift: 1.2 },
    { id: 'old', kind: 'oldpines', parallax: 0.5, base: 106, height: 72, gap: [30, 90], mix: { old: 0.5, spruce: 0.35, pine: 0.15 }, place: 3391,
      features: [{ kind: 'nest', x: 520 }] },
    { id: 'fog_near', kind: 'fog', parallax: 0.56, y: 102, h: 8, color: 'fog_mauve', alpha: 0.2, drift: 1.6 },
    { id: 'granite', kind: 'granite', parallax: 0.6, base: 111, size: [40, 84], gap: [50, 120], trees: 0.45, brush: 3, place: 8147 },
    // Phase 49: the bank's things (see loc_fog.js): fallen trunks reaching into the water, the beaver's lodge, an old dock's posts.
    { id: 'bank', kind: 'bank', parallax: 0.7, height: 5, reeds: 0.5, rockEvery: 30, reedH: 12, place: 5521, trunks: 4, cattails: 3,
      rock: { dark: 'grn_dark', mid: 'grn', lit: 'grn_mid' }, ground: 'grn_dark', reedKeys: ['shrub_dk', 'shrub', 'reed_gold'],
      features: [{ kind: 'lodge', x: 640 }, { kind: 'posts', x: 300, n: 3 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only (see loc_fog.js). 2026-11-06: the creek's own sky: dusk a blush of rose over
  // mauve with an orchid band at the peaks and long banded clouds lit underneath, dawn rose over
  // lilac, the grey hours a cool lavender haze, the night violet; the layers grade toward violet at
  // night and lavender by day; mauve water under a clear mirror; a thick mist on the water.
  sky: {
    moonX: 90, glowX: 80, glowKey: 'dusk_blush_hi',
    keys: [
      [0, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [3, ['night_violet_ink', 'night_violet_ink', 'night_violet', 'night_plum']],
      [5, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [6.25, ['dusk_lilac_dk', 'dusk_mauve', 'dusk_blush', 'dusk_peach']],
      [7.5, ['dusk_lilac_dk', 'fog_lav_dk', 'fog_lav', 'dusk_peach']],
      [9, ['fog_lav_dk', 'fog_lav', 'fog_mauve', 'fog_mauve_hi']],
      [12.5, ['fog_lav_dk', 'fog_lav', 'fog_lav_hi', 'fog_mauve_hi']],
      [16, ['fog_lav_dk', 'fog_lav', 'fog_mauve', 'fog_mauve_hi']],
      [17.5, ['dusk_blush_dk', 'dusk_blush', 'dusk_blush_hi', 'dusk_orchid']],
      [19, ['dusk_blush_dk', 'dusk_blush_hi', 'dusk_blush_lt', 'dusk_orchid']],
      [20.5, ['night_plum', 'dusk_blush_dk', 'dusk_blush', 'dusk_blush_hi']],
      [22, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [24, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']]
    ],
    cloudKeys: [['night_violet', 'night_plum', 'night_mauve'], ['fog_lav_dk', 'fog_lav', 'fog_mauve_hi'], ['dusk_blush_dk', 'dusk_blush_hi', 'dusk_blush_lt'], [null, null, 'dusk_blush_lt']]
  },
  grade: { night: ['night_violet', 0.6], grey: ['fog_lav_dk', 0.3] },
  waterBase: 'water_mauve',
  reflect: 1.5,
  mist: { h: 7, alpha: 0.18, drift: 2, color: 'fog_mauve' },
  // Life (see loc_fog.js). Fireflies along the bank at night (audit P2-1).
  life: {
    fireflies: 16,
    under: { cray: 9, snail: 4, fry: 4, tad: 2, turtle: false, eel: true, mussel: 6, caddis: true, litter: ['bottle', 'lure'], roots: 5, tree: 0, ribbon: 0.03, fern: 0.008, lily: 0, algae: 0.5 },
    above: {
      ducks: { p: 0.9, x: [200, 1100], young: 3, hours: [[5.5, 20.5]] },
      heron: { x: [1120, 1230], hours: [[4.5, 10.5], [15.5, 21.5]] },
      kingfisher: { perches: [{ x: 250, y: 31 }, { x: 720, y: 28 }], hours: [[6, 19]] },
      dragonflies: { n: 6, x: [[30, 300], [1000, 1270]], hours: [[9.5, 17]] },
      deer: { layer: 'bank', x: [180, 330], hours: [[5, 7.75], [17.25, 20]] },
      beaver: { layer: 'bank', hours: [[18.5, 5.5]] },
      eagle: { n: 1, x: [120, 1180], y: [64, 92], hours: [[8, 17.5]] } // 2026-11-06: the nest's eagle, soaring by day
    }
  },

  // cabin: on stilts at the water's edge, roof sagging. snag: dead branches out of the water;
  // the same branches reach down to the bottom in the cross-section (underwater.snags).
  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 5102, from: 'left' }, // Phase 74: a pier in every water (PLAN_WATERS.md 4.3)
    { id: 'cabin_a', kind: 'cabin', x: 250 },
    { id: 'snag_a', kind: 'snag', x: 470 },
    { id: 'cabin_b', kind: 'cabin', x: 720, sag: 3 },
    { id: 'snag_b', kind: 'snag', x: 960 },
    { id: 'snag_c', kind: 'snag', x: 1190 }
  ],

  // snags: {x, top} branches standing up from the bottom to depth `top` px (0 breaks the surface).
  underwater: {
    bottomAmp: 20, rock: 'stone_dark', silt: 'wood_dark',
    grad: ['water_slate_lit', 'water_slate_mid', 'water_slate_dark', 'water_slate_deep'], // 2026-11-06: the mauve creek's water, slate under it
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.05, shaftEvery: 190,
    snags: [{ x: 470, top: 0 }, { x: 610, top: 30 }, { x: 960, top: 0 }, { x: 1080, top: 38 }, { x: 1190, top: 0 }]
  },

  spots: [
    { id: 'cabin_steps', kind: 'open', x: 250, r: 32 },
    { id: 'snag_eddy', kind: 'open', x: 470, r: 26 },
    { id: 'black_pool', kind: 'open', x: 830, r: 22, attract: 1.3 },
    { id: 'undercut', kind: 'hidden', x: 1060, r: 24, attract: 1.6 }
  ],

  // The current. dir +1 flows to the right. speed px/s once it has the lure (after about
  // `ramp` s), swaying by ±sway every `period` s in a phase set by the cast's seed. Deeper
  // water is slower (slack: share lost at maxDepth); on the bottom the lure only creeps.
  current: { dir: 1, speed: 3, ramp: 2.5, sway: 0.45, period: 7, slack: 0.5, bottom: 0.2 },

  // 11.1: px/s the lure drifts at t s after landing, on the cast with this seed, at depth px.
  // Phase 74: the rivers share G.data.riverDrift (below), each with its own current.
  drift: function (seed, t, depth, onBottom, wind, x) { return G.data.riverDrift(this, seed, t, depth, onBottom, wind, x); },
  // Phase 74 (PLAN_WATERS.md): what kind of water it is, and its stretches by world x.
  water: 'river',
  reaches: [{ id: 'blackwater', name: 'Blackwater Creek', x: [0, 1300] }]
};

// 11.1: a river's current. px/s the lure drifts at t s after landing, on the cast with this
// seed, at depth px, in water L (its current and maxDepth). Pure: the same arguments always
// give the same answer, so a cast's path is fixed by its seed and the fixed dt (sailing steps
// it in underwater.lureStep). Phase 74: shared by every river (Blackwater, Copperbend, Stonehorn).
// Phase 77 (PLAN_WATERS.md 4.5): x is the lure's world x; the current runs at the reach's
// `flow` there (G.data.reachK). Blackwater has no per-reach current, so its casts drift
// exactly as before, and a call without x (the old five arguments) gets the plain current.
G.data.riverDrift = function (L, seed, t, depth, onBottom, wind, x) {
  var c = L.current, ph = (Math.imul(seed | 0, 0x9e3779b1) >>> 0) / 4294967296 * 6.2832;
  var v = c.speed * (1 - Math.exp(-t / c.ramp)) * (1 + c.sway * Math.sin(t * 6.2832 / c.period + ph));
  v *= 1 - c.slack * Math.min(1, Math.max(0, depth) / L.maxDepth);
  if (c.reach && typeof x === 'number') v *= G.data.reachK(L, x, 'flow', 1);
  return c.dir * v * (onBottom ? c.bottom : 1);
};

// Phase 77: a reach's number `key` from L.current.reach[reachId] (def where a reach has none)
// at world x, blended linearly over EDGE px either side of a reach's edge, so the water does
// not change speed in a step. Pure and allocation-free.
G.data.reachK = (function () {
  function reachKOf(L, j, key, def) {
    var q = L.current && L.current.reach && L.current.reach[L.reaches[j].id];
    return q && typeof q[key] === 'number' ? q[key] : def;
  }
  return function (L, x, key, def) {
    var R = L.reaches, EDGE = 30, i, r, a, b, n = R ? R.length : 0;
    if (!n) return def;
    for (i = 0; i < n - 1 && x >= R[i].x[1]; i++);
    r = R[i]; b = reachKOf(L, i, key, def);
    if (i > 0 && x < r.x[0] + EDGE) { a = reachKOf(L, i - 1, key, def); return a + (b - a) * (0.5 + 0.5 * (x - r.x[0]) / EDGE); }
    if (i < n - 1 && x > r.x[1] - EDGE) { a = reachKOf(L, i + 1, key, def); return b + (a - b) * (0.5 - 0.5 * (r.x[1] - x) / EDGE); }
    return b;
  };
})();
