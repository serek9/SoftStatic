var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Wreckhollow Bay (Phase 74, PLAN_WATERS.md 2; the reference's Old Wreck Bay): a north Atlantic
// bay with a schooner's wreck on its side, a shelf dropping into deep water, and low rocks where
// seals haul out. Two reaches: The Shelf (the wreck and the drop beyond it) and Haul-out Rocks
// (low rocks, kelp and sand), where the pier is. Phase 74 painted it with the lake painters in
// sea colours; Phase 79 gives it its own scenery (js/scene/seas.js): the schooner on its side on
// the bank with its masts out over the water and its hull going down to the bed, the drop past
// it, the haul-out rocks with their seals and kelp, the swell, whitecaps and tide.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.wreck = {
  id: 'wreck',
  name: 'Wreckhollow Bay',
  cost: 9500,
  width: 1400,
  waterY: 112,
  maxDepth: 160,
  seed: 4871,
  start: 1230, // just past the pier's reach
  dock: { x: 1304, reach: 60 },
  water: 'sea',
  scenery: 'wreck', // Phase 79 (js/scene/seas.js)
  reaches: [
    { id: 'the_shelf', name: 'The Shelf', x: [0, 700] },
    { id: 'haul_out_rocks', name: 'Haul-out Rocks', x: [700, 1400] }
  ],
  // A long, slow ocean swell (view px; see loc_fog.js).
  swell: { amp: 2.6, mirror: 1.2, clamp: 5, waves: [[200, 12, 0.5], [64, -8, 0.3], [28, 6, 0.2]] },
  // Phase 79: the sea's live parts (see loc_sound.js): an Atlantic tide a little bigger.
  sea: { tide: { amp: 3.5, high: 7 }, storm: 1.8, caps: 0.26, kelpTop: [[860, 1080]] },
  current: { lake: true, speed: 0.35, wind: 0.18, sway: 0.25, ramp: 4, period: 170, slack: 0.7, bottom: 0.15 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'heads', kind: 'mountains', parallax: 0.06, base: 102, amp: 30, color: 'rock_dark', lit: 'rock', dark: 'night_deep', haze: 'mount_haze', snow: 'rock', snowDark: 'rock_dark' },
    { id: 'sea_fog', kind: 'fog', parallax: 0.14, y: 92, h: 20, color: 'fog_mid', alpha: 0.26, drift: 1.4 },
    { id: 'downs', kind: 'mountains', parallax: 0.22, base: 108, amp: 14, color: 'moss_dark', lit: 'moss', dark: 'night_deep', snow: 'moss', snowDark: 'moss_dark' },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 10, color: 'fog_light', alpha: 0.15, drift: 3.2 },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 5, reeds: 0.1, rockEvery: 10, reedH: 8, place: 4889, ground: 'rock_dark',
      features: [{ kind: 'posts', x: 120, n: 4 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 140, glowX: 300 },
  mist: { h: 8, alpha: 0.15, drift: 4 },
  life: {
    // Phase 79: the sea floor's life (see loc_sound.js); grey seals on the haul-out rocks.
    under: { cray: 0, crab: 7, snail: 0, star: 6, anemone: 12, flat: 4, fry: 6, tad: 0, turtle: false, eel: false, mussel: 12, caddis: false, litter: ['bottle', 'pot', 'lure'], roots: 0, tree: 0, ribbon: 0.025, fern: 0, lily: 0, algae: 0.7 },
    above: {
      ducks: { p: 0.9, x: [700, 1200], young: 0, hours: [[5, 20]] },
      heron: { x: [1120, 1220], hours: [[5, 10], [16, 21]] },
      gulls: { n: 4, perches: [{ x: 1276, y: 13 }, { x: 1287, y: 13 }, { x: 317, y: 48 }, { x: 375, y: 43 }], hours: [[5.5, 20]] },
      cormorant: { perches: [{ x: 397, y: 17.5 }, { x: 1015, y: 5.5 }], x: [260, 1100], hours: [[5, 20.5]] },
      seal: { n: 4, x: [760, 1160], spots: [{ x: 906, y: 9.5 }, { x: 922, y: 9.5 }, { x: 986, y: 7.5 }, { x: 1000, y: 9.5 }], hours: [[0, 24]] }
    }
  },

  // Phase 79: the schooner on its side (half its length; masts: where each leaves the deck and
  // how long it is, world px), the buoy off the drop, the two haul-out rocks (hs: each rock's
  // height), the pier.
  landmarks: [
    { id: 'wreck', kind: 'schooner', x: 380, half: 54, h: 18, masts: [[352, 46], [404, 38]], seed: 4811 },
    { id: 'buoy_a', kind: 'marker', x: 640 },
    { id: 'rocks_a', kind: 'haulout', x: 914, half: 30, hs: [7, 9, 9, 6], foam: true, r: 30, seed: 4812 },
    { id: 'rocks_b', kind: 'haulout', x: 1000, half: 22, hs: [7, 9, 5], foam: true, r: 22, seed: 4813 },
    { id: 'pier', kind: 'pier', x: 1304, seed: 4802, from: 'right' }
  ],

  underwater: {
    bottomAmp: 70, rock: 'rock_dark', silt: 'stone', sand: 'paper_dark', rocks: { dark: 'rock_dark', mid: 'rock', lit: 'rock_lit' },
    weed: 'olive', weedDark: 'olive_dark', weedDensity: 0.03, shaftEvery: 170,
    // Phase 79: the bed: the drop to 40 m west of the wreck (the Greenland halibut), the bank
    // the schooner lies on at 5-6 m, the shelf east of it at 13-14 m (the striped bass), shoaling
    // to the haul-out rocks' kelp and the sand by the pier.
    shape: [[0, 160], [150, 158], [250, 140], [300, 92], [330, 40], [360, 24], [400, 22], [440, 30], [520, 52], [620, 56], [700, 48], [780, 36], [880, 18], [950, 10], [1030, 14], [1120, 28], [1250, 34], [1330, 24], [1400, 18]],
    rockBed: [[0, 310], [840, 1100]],
    kelp: [[850, 1090, 0.22]],
    hulk: { x: 380, half: 50 }                         // the schooner's hull under the water, down to the bank
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 1304, r: 34 },
    { id: 'wreck_hull', kind: 'open', x: 380, r: 36, attract: 1.3 },
    { id: 'shelf_drop', kind: 'open', x: 600, r: 30 },
    { id: 'seal_gut', kind: 'hidden', x: 980, r: 22, attract: 1.6 }
  ]
};
