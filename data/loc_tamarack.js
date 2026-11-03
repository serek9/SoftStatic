var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Tamarack Lake (Phase 80, PLAN_WINTER.md 2.2; the reference's Lake Hunkerdown): a frozen lake
// in the boreal north, spruce and tamarack on low shores, a frozen waterfall over a granite
// step, a pressure ridge across the ice, other people's shanties far off, snow on everything.
// Always frozen: a winter water, not a season. Three reaches: The Flats (shallow weedy flats by
// the landing), Pressure Ridge (a rocky hump under the ridge, a drop on each side) and The Deep
// Hole (the basin under the frozen falls). It opens free on the chart once a sea has been
// visited (need.seaSeen); getting onto it needs the Snow Machine (data/gear.js snow).
// ice: the ice's thickness (px; 1.5 m), the most holes open at once, and how long a hole left
// behind takes to skin over (game hours: 3 game minutes). No current: the drift is nil.
// Phase 80 paints it with the existing layer kinds in snow colours; Phase 82 gives it its own
// scenery (js/scene/ice.js).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.tamarack = {
  id: 'tamarack',
  name: 'Tamarack Lake',
  cost: 0,
  need: { seaSeen: true, text: 'Frozen hard, up past the coast road. It opens once you have been out to sea.' },
  width: 1400,
  waterY: 112,
  maxDepth: 112,
  seed: 4127,
  start: 170, // just past the landing's reach, so arriving does not open its panel
  dock: { x: 96, reach: 60 },
  water: 'lake',
  ice: { thick: 6, holes: 6, freeze: 3 / 60 },
  reaches: [
    { id: 'the_flats', name: 'The Flats', x: [0, 460] },
    { id: 'pressure_ridge', name: 'Pressure Ridge', x: [460, 900] },
    { id: 'the_deep_hole', name: 'The Deep Hole', x: [900, 1400] }
  ],
  // The ice does not move (view px; see loc_fog.js).
  swell: { amp: 0, mirror: 0.2, waves: [[110, 8, 0.5], [46, -5, 0.3], [24, 4, 0.2]] },
  current: { lake: true, speed: 0, wind: 0, sway: 0, ramp: 4, period: 240, slack: 0.75, bottom: 0 },

  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.06, base: 92, amp: 34, color: 'mount_far', lit: 'snow_dark', dark: 'night_deep', haze: 'mount_haze', snow: 'snow_hi', snowDark: 'snow' },
    { id: 'fog_far', kind: 'fog', parallax: 0.16, y: 88, h: 14, color: 'snow_dark', alpha: 0.2, drift: 0.6 },
    { id: 'far_woods', kind: 'forest', parallax: 0.26, base: 105, height: 20, gap: [2, 5], mix: { spruce: 0.6, pine: 0.4 },
      keys: { pine: { dark: 'pine_dark', mid: 'snow_deep', lit: 'snow_dark', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 100, h: 9, color: 'snow', alpha: 0.1, drift: 1.2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 34, gap: [10, 40], mix: { spruce: 0.5, pine: 0.3, dead: 0.2 }, place: 4141,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'snow_dark', trunk: 'pine_dark' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, reeds: 0, rockEvery: 40, place: 4157, pads: 0, trunks: 0, cattails: 0, ground: 'snow_dark',
      rock: { dark: 'snow_deep', mid: 'snow_dark', lit: 'snow_hi' }, features: [{ kind: 'posts', x: 70, n: 3 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 200, glowX: 120 },
  mist: { h: 5, alpha: 0.08, drift: 1.4 },
  life: {
    under: { cray: 0, snail: 3, fry: 4, tad: 0, turtle: false, eel: false, mussel: 4, caddis: false, litter: ['lure'], roots: 0, tree: 0, ribbon: 0.01, fern: 0, lily: 0, algae: 0.1 },
    above: {}
  },

  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 4102, from: 'left' },
    { id: 'marker_a', kind: 'marker', x: 700 }
  ],

  underwater: {
    bottomAmp: 40, rock: 'stone_dark', silt: 'wood_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.04, shaftEvery: 9999,
    // The bed ([x, depth px], 4 px a metre): The Flats at 2.5-5.5 m, the ridge's hump rising to
    // 4 m with a drop on each side, the Deep Hole down to 28 m under the falls.
    shape: [[0, 10], [200, 18], [440, 22], [500, 44], [580, 26], [660, 16], [760, 28], [860, 52], [920, 80], [1000, 104], [1150, 112], [1300, 108], [1400, 96]],
    weedBeds: [[30, 420, 0.12]]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 34 },
    { id: 'ridge_drop', kind: 'open', x: 860, r: 30, attract: 1.3 },
    { id: 'falls_hole', kind: 'hidden', x: 1150, r: 24, attract: 1.5 }
  ]
};
