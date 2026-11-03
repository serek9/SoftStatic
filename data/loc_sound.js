var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Coldharbor Sound (Phase 74, PLAN_WATERS.md 2; the reference's Icewater Sea): a north Pacific
// coast of dark rock headlands, a lighthouse, kelp and a breakwater. Swell, not current. Three
// reaches: Lamplight Head (the lighthouse's headland, rock to the bottom), Skerry Reef (rocks
// awash, kelp forest) and Harbour Cove (behind the breakwater, calm, sand), where the pier is.
// Phase 74 painted it with the lake painters in sea colours; Phase 79 gives it its own scenery
// (js/scene/seas.js): the headland and its lighthouse (the beam turning at night), the skerries
// awash in kelp, the breakwater and the boats moored behind it, the swell, whitecaps and tide,
// a rock bed under the head and the reef and sand in the cove, and the sea's own life.
// The sea's real depths are pressed into 40 m: deep-water fish are fished on the bottom.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.sound = {
  id: 'sound',
  name: 'Coldharbor Sound',
  cost: 7000,
  width: 1500,
  waterY: 112,
  maxDepth: 160,
  seed: 5557,
  start: 1330, // just past the pier's reach
  dock: { x: 1404, reach: 60 },
  water: 'sea',
  scenery: 'sound', // Phase 79 (js/scene/seas.js)
  reaches: [
    { id: 'lamplight_head', name: 'Lamplight Head', x: [0, 500] },
    { id: 'skerry_reef', name: 'Skerry Reef', x: [500, 1000] },
    { id: 'harbour_cove', name: 'Harbour Cove', x: [1000, 1500] }
  ],
  // A long, slow ocean swell (view px; see loc_fog.js), bigger than any lake's.
  // Phase 79: clamp lets the sea's swell stand higher than a lake's 3 px (a storm lifts it).
  swell: { amp: 2.8, mirror: 1.2, clamp: 5, waves: [[180, 14, 0.5], [70, -9, 0.3], [26, 7, 0.2]] },
  // Phase 79 (PLAN_WATERS.md 4.5): the sea's live parts. tide: the water up the rocks over the
  // day (world px above the low-water line, a high water at `high` and every 12.42 h after);
  // storm: how much more a storm lifts the swell than on a lake; caps: whitecaps on the swell's
  // crests (how many at a calm noon); kelpTop: the kelp's fronds lying on the surface.
  sea: { tide: { amp: 3, high: 4.5 }, storm: 1.8, caps: 0.22, kelpTop: [[560, 720], [800, 900]] },
  // No current: the wind's drift, stronger than on a lake (G.data.lakeDrift in loc_fog.js).
  current: { lake: true, speed: 0.35, wind: 0.18, sway: 0.25, ramp: 4, period: 160, slack: 0.7, bottom: 0.15 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'heads', kind: 'mountains', parallax: 0.06, base: 100, amp: 40, color: 'rock_dark', lit: 'rock', dark: 'night_deep', haze: 'mount_haze', snow: 'rock', snowDark: 'rock_dark' },
    { id: 'sea_fog', kind: 'fog', parallax: 0.14, y: 92, h: 18, color: 'fog_mid', alpha: 0.24, drift: 1.6 },
    { id: 'cliffs', kind: 'mountains', parallax: 0.22, base: 108, amp: 22, color: 'rock', lit: 'rock_lit', dark: 'rock_dark', snow: 'rock_lit', snowDark: 'rock' },
    { id: 'spruce', kind: 'forest', parallax: 0.32, base: 108, height: 14, gap: [6, 22], mix: { spruce: 0.7, pine: 0.3 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 10, color: 'fog_light', alpha: 0.14, drift: 3 },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 6, reeds: 0, rockEvery: 12, place: 5571, ground: 'rock_dark',
      features: [{ kind: 'posts', x: 760, n: 6 }] }, // Phase 79: the moored boats are behind the breakwater now
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 280, glowX: 120 },
  mist: { h: 8, alpha: 0.14, drift: 4 },
  life: {
    // Phase 79: sea-floor life in place of crayfish and snails: shore crabs, starfish on the
    // rocks, anemones, flatfish lying in the cove's sand; kelp on the reef's rock.
    under: { cray: 0, crab: 8, snail: 0, star: 7, anemone: 16, flat: 3, fry: 7, tad: 0, turtle: false, eel: false, mussel: 14, caddis: false, litter: ['bottle', 'pot', 'pot'], roots: 0, tree: 0, ribbon: 0.02, fern: 0, lily: 0, algae: 0.8 },
    above: {
      ducks: { p: 0.9, x: [500, 1200], young: 0, hours: [[5, 20]] },
      heron: { x: [1160, 1260], hours: [[5, 10], [16, 21]] },
      gulls: { n: 4, perches: [{ x: 1376, y: 13 }, { x: 1387, y: 13 }, { x: 1013, y: 20 }, { x: 656, y: 11 }], hours: [[5.5, 20]] },
      // Phase 79: cormorants on the skerries (drying their wings, diving off the reef) and
      // harbour seals hauled out on the outer skerry.
      cormorant: { perches: [{ x: 636, y: 13 }, { x: 848, y: 11 }], x: [520, 980], hours: [[5, 20.5]] },
      seal: { n: 2, x: [560, 1000], spots: [{ x: 832, y: 6.5 }, { x: 864, y: 5.5 }], hours: [[0, 24]] }
    }
  },

  // Phase 79: Lamplight Head (the cliff and its lighthouse, half its width and its height, world
  // px; light: the tower's x and height), the bell buoy off it, the skerries (each rock's height,
  // world px, evenly over half either side), the breakwater
  // (its light at its seaward end) and two boats on moorings behind it.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 1404, seed: 5502, from: 'right' },
    { id: 'head', kind: 'headland', x: 170, half: 190, h: 46, light: { x: 236, tower: 30 }, seed: 5511 },
    { id: 'buoy_a', kind: 'marker', x: 430 },
    { id: 'skerry_a', kind: 'skerries', x: 646, half: 40, hs: [8, 12, 10, 5], foam: true, r: 34, seed: 5512 },
    { id: 'skerry_b', kind: 'skerries', x: 848, half: 24, hs: [6, 10, 5], foam: true, r: 22, seed: 5513 },
    { id: 'breakwater', kind: 'breakwater', x: 1080, half: 70, h: 8, foam: true, r: 66, seed: 5514 },
    { id: 'boat_a', kind: 'mooring', x: 1196, hull: 'teal', seed: 5515 },
    { id: 'boat_b', kind: 'mooring', x: 1284, hull: 'rust', seed: 5516 }
  ],

  underwater: {
    bottomAmp: 50, rock: 'rock_dark', silt: 'stone', sand: 'paper_dark', rocks: { dark: 'rock_dark', mid: 'rock', lit: 'rock_lit' },
    weed: 'olive', weedDark: 'olive_dark', weedDensity: 0.03, shaftEvery: 170,
    // Phase 79: the bed ([x, depth px], 4 px a metre): the head's rock falling sheer to 40 m
    // (the halibut, the yelloweye), the reef rising to the skerries with deep gullies between
    // (the lingcod, the king salmon), and the cove's sand shoaling to the pier.
    shape: [[0, 40], [40, 96], [110, 150], [200, 160], [380, 160], [470, 124], [540, 86], [600, 36], [640, 16], [690, 22], [730, 70], [770, 92], [820, 34], [850, 14], [880, 30], [940, 80], [1000, 92], [1060, 70], [1160, 56], [1300, 44], [1420, 30], [1500, 22]],
    rockBed: [[0, 560], [580, 920]],                 // rock under the head and the reef; sand beyond
    kelp: [[460, 540, 0.05], [560, 740, 0.25], [790, 910, 0.25]]
  },
  spots: [
    { id: 'pier_shade', kind: 'open', x: 1404, r: 34 },
    { id: 'head_ledge', kind: 'open', x: 300, r: 34, attract: 1.3 },
    { id: 'reef_edge', kind: 'open', x: 760, r: 40 },
    { id: 'kelp_gap', kind: 'hidden', x: 700, r: 22, attract: 1.6 }
  ]
};
