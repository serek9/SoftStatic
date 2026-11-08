var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish data (V5, as changed in Phase 68: PLAN_SPECIES.md) and the clock windows (§0.8).
// Phase 68: 59 real species, each in the waters it really lives in. No rarity and nothing
// strange: which species turns up comes from the water, the reach, the depth, the hour, the
// bait or lure and the lure's size (fish_ai).
// homes (Phase 75, PLAN_WATERS.md 3 and 4.1): where it lives, one entry per water (or per
// group of that water's reaches where it lives differently): {loc, reaches (ids in the
// water's reaches; absent or empty: the whole water), depth [min, max] in m, bed (true: on
// or within a metre of the bottom), hours (names in G.data.HOURS; empty: any hour)}. At load
// each home gains habitat {depthMin, depthMax} and timeLikes (whole hours), and each species
// locations (the waters of its homes), which the sim and the UI read (G.data.homeOf).
// Units: depths in metres (px = m × 4), speed in fight units (V4: D grows by speed × 0.03/s;
// the swimming AI moves at speed × 10 px/s), awareness in px,
// caution 0..1 (chance to back off after nibbling), mass in kg (typical weight;
// the rod's mass limit is checked against it, D4). lengthCm and weightKg: the range anglers
// catch, smallest to biggest (economy.size). price: coins for a fish of the middle size
// (× economy.sizeFactor), set by one rule: 12, 20 or 33 × mass^0.75 for a species buyers
// value low (suckers, carp, minnows, shad), middling (panfish, catfish, burbot, whitefish)
// or highly (walleye, bass, pike, trout, char, salmon, sturgeon); at least 3.
// latin: the scientific name; family: the journal's family filter.
// jumps 0..1 (optional, Phase 23): how often it leaps while pulling near the boat (fight.js).
// baitLikes: the live baits it takes (data/gear.js baits; a bait not listed is ignored).
// lureTypes (Phase 68): lure type -> 2 its favourite (it notices it from 1.3× as far), 1 takes
// it; a type not listed is ignored. A lure is taken only if its size classes (gear.lures
// sizes) cover some of the species' weights (G.data.SIZE_CLASSES), and the fish hooked on it
// is a size the lure is made for (economy.qRange).
// lineShy (optional, Phase 53): it sees any line but fluorocarbon (gear lineTypes seen) and,
// having circled the lure, turns away instead of nibbling.
// Phase 72: how a species looks is its anatomy spec in data/fishlooks.js (one for every species);
// the old look (a body plan, a palette, wrongness and parts) is gone.
G.data = G.data || {};

// The owl's windows: the owl still cries at 02:47 and 03:33 (no fish depends on them since Phase 68).
G.data.windows = [
  { id: 'owl_247', from: 2.5, to: 3 + 10 / 60, cue: 2 + 47 / 60 },  // 02:30-03:10, owl at 02:47
  { id: 'owl_333', from: 3 + 20 / 60, to: 4, cue: 3 + 33 / 60 }     // 03:20-04:00, owl at 03:33
];

// Phase 68: the size classes of fish and of lures, by weight: S under 0.45 kg, M to 2.3, L to
// 9.1, XL to 27, XXL above. The catch card shows a catch's class.
G.data.SIZE_CLASSES = [
  { id: 'S', maxKg: 0.45 }, { id: 'M', maxKg: 2.3 }, { id: 'L', maxKg: 9.1 }, { id: 'XL', maxKg: 27 }, { id: 'XXL', maxKg: 1e9 }
];
// The lure types (data/gear.js lures[].type; fish lureTypes keys).
G.data.LURE_TYPES = ['float', 'crank', 'spinner', 'spoon', 'dropshot', 'wacky', 'jighead', 'topwater', 'blade', 'glide', 'swim'];

// Phase 75: the four parts of the day the homes name, as whole game hours (PLAN_WATERS.md 3).
G.data.HOURS = {
  dawn: [5, 6, 7], day: [8, 9, 10, 11, 12, 13, 14, 15, 16], dusk: [17, 18, 19, 20], night: [21, 22, 23, 0, 1, 2, 3, 4]
};

G.data.fish = [
  // ---- perches ----
  {
    id: 'yellow_perch', name: 'Yellow Perch', latin: 'Perca flavescens', family: 'perches',
    speed: 1.3, strength: 0.5, fatigue: 0.13, mass: 0.2,
    lengthCm: [12, 32], weightKg: [0.05, 0.6], awareness: 46, caution: 0.3, price: 6,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { wacky: 2, jighead: 1, dropshot: 1, spinner: 1, spoon: 1 },
    homes: [
      { loc: 'fog', depth: [1, 10], hours: ['day'] },
      { loc: 'pines', depth: [1, 10], hours: ['day'] },
      { loc: 'copper', reaches: ['the_split'], depth: [1, 6], hours: ['day'] },
      { loc: 'harts', reaches: ['the_weedbed'], depth: [1, 8], hours: ['day'] }
    ],
  },
  {
    id: 'walleye', name: 'Walleye', latin: 'Sander vitreus', family: 'perches',
    speed: 1.5, strength: 1, fatigue: 0.09, mass: 1.4,
    lengthCm: [30, 70], weightKg: [0.3, 5], awareness: 55, caution: 0.5, price: 42,
    baitLikes: ['minnow', 'worm'], lureTypes: { spoon: 2, spinner: 1, jighead: 1, crank: 1, blade: 1, dropshot: 1, wacky: 1 },
    homes: [
      { loc: 'fog', depth: [3, 14], hours: ['dusk', 'night', 'dawn'] },
      { loc: 'copper', reaches: ['the_split'], depth: [3, 9], hours: ['dusk', 'night', 'dawn'] },
      { loc: 'russet', reaches: ['mink_cove'], depth: [4, 12], hours: ['dusk', 'night', 'dawn'] }
    ],
  },
  // ---- sunfish & bass ----
  {
    id: 'rock_bass', name: 'Rock Bass', latin: 'Ambloplites rupestris', family: 'sunfish & bass',
    speed: 1.2, strength: 0.6, fatigue: 0.12, mass: 0.25,
    lengthCm: [12, 28], weightKg: [0.1, 0.6], awareness: 44, caution: 0.3, price: 7,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, spinner: 1, crank: 1, wacky: 1 },
    homes: [
      { loc: 'fog', depth: [1, 8], hours: ['dawn', 'dusk'] },
      { loc: 'copper', reaches: ['hollow_reach'], depth: [1, 5], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'smallmouth_bass', name: 'Smallmouth Bass', latin: 'Micropterus dolomieu', family: 'sunfish & bass',
    speed: 1.9, strength: 1.2, fatigue: 0.09, mass: 1, jumps: 0.6,
    lengthCm: [25, 50], weightKg: [0.3, 2.8], awareness: 58, caution: 0.45, price: 33,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { crank: 2, jighead: 1, spinner: 1, topwater: 1, wacky: 1, dropshot: 1, swim: 1, blade: 1 },
    homes: [
      { loc: 'fog', depth: [2, 12], hours: ['day'] },
      { loc: 'copper', reaches: ['the_split'], depth: [1, 5], hours: ['day'] }
    ],
  },
  {
    id: 'largemouth_bass', name: 'Largemouth Bass', latin: 'Micropterus salmoides', family: 'sunfish & bass',
    speed: 1.7, strength: 1.3, fatigue: 0.09, mass: 1.4, jumps: 0.7,
    lengthCm: [25, 60], weightKg: [0.3, 5], awareness: 56, caution: 0.4, price: 42,
    baitLikes: ['worm', 'minnow', 'cricket'], lureTypes: { jighead: 2, topwater: 1, crank: 1, spinner: 1, wacky: 1, swim: 1, dropshot: 1 },
    homes: [
      { loc: 'pines', depth: [0.5, 8], hours: ['dawn', 'dusk'] },
      { loc: 'copper', reaches: ['lodge_pool'], depth: [0.5, 4], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'bluegill', name: 'Bluegill Sunfish', latin: 'Lepomis macrochirus', family: 'sunfish & bass',
    speed: 1.3, strength: 0.4, fatigue: 0.15, mass: 0.15,
    lengthCm: [8, 25], weightKg: [0.03, 0.6], awareness: 44, caution: 0.3, price: 5,
    baitLikes: ['worm', 'cricket'], lureTypes: { wacky: 1, spinner: 1, jighead: 1 },
    homes: [
      { loc: 'pines', depth: [0.5, 5], hours: ['day'] },
      { loc: 'copper', reaches: ['the_split'], depth: [0.5, 3], hours: ['day'] },
      { loc: 'harts', reaches: ['birch_point'], depth: [0.5, 4], hours: ['day'] }
    ],
  },
  {
    id: 'crappie', name: 'Crappie', latin: 'Pomoxis nigromaculatus', family: 'sunfish & bass',
    speed: 1.2, strength: 0.5, fatigue: 0.13, mass: 0.35,
    lengthCm: [15, 35], weightKg: [0.1, 1.2], awareness: 48, caution: 0.35, price: 9,
    baitLikes: ['minnow', 'worm'], lureTypes: { spoon: 2, jighead: 1, spinner: 1, wacky: 1, swim: 1 },
    homes: [
      { loc: 'pines', depth: [1, 8], hours: ['dusk', 'night', 'dawn'] },
      { loc: 'copper', reaches: ['lodge_pool'], depth: [1, 5], hours: ['dawn', 'dusk'] }
    ],
  },
  // ---- temperate bass ----
  {
    id: 'white_bass', name: 'White Bass', latin: 'Morone chrysops', family: 'temperate bass',
    speed: 1.8, strength: 0.9, fatigue: 0.1, mass: 0.5, jumps: 0.3,
    lengthCm: [20, 40], weightKg: [0.2, 1.5], awareness: 54, caution: 0.35, price: 12,
    baitLikes: ['minnow', 'worm'], lureTypes: { spinner: 2, crank: 2, spoon: 1, jighead: 1, blade: 1, topwater: 1, swim: 1 },
    homes: [{ loc: 'russet', reaches: ['reed_flats'], depth: [1, 6], hours: ['day'] }],
  },
  {
    id: 'hybrid_striped_bass', name: 'Hybrid Striped Bass', latin: 'Morone saxatilis × M. chrysops', family: 'temperate bass',
    speed: 2.1, strength: 1.6, fatigue: 0.07, mass: 2.5, jumps: 0.3,
    lengthCm: [35, 65], weightKg: [1, 7], awareness: 62, caution: 0.45, price: 66,
    baitLikes: ['minnow', 'worm'], lureTypes: { jighead: 2, spinner: 1, crank: 1, spoon: 1, swim: 1, topwater: 1, blade: 1 },
    homes: [{ loc: 'russet', reaches: ['reed_flats'], depth: [1, 8], hours: ['dawn', 'dusk'] }],
  },
  {
    id: 'striped_bass', name: 'Striped Bass', latin: 'Morone saxatilis', family: 'temperate bass',
    speed: 1.9, strength: 1.5, fatigue: 0.08, mass: 9, jumps: 0.3,
    lengthCm: [50, 110], weightKg: [2, 25], awareness: 64, caution: 0.5, price: 172,
    baitLikes: ['minnow'], lureTypes: { crank: 2, swim: 1, topwater: 1, spoon: 1, jighead: 1 },
    homes: [
      { loc: 'wreck', reaches: ['the_shelf'], depth: [4, 14], hours: ['dusk', 'night'] },
      { loc: 'wreck', reaches: ['haul_out_rocks'], depth: [1, 6], hours: ['dusk', 'night'] }
    ],
  },
  // ---- pikes ----
  {
    id: 'northern_pike', name: 'Northern Pike', latin: 'Esox lucius', family: 'pikes',
    speed: 2.2, strength: 1.6, fatigue: 0.08, mass: 3, jumps: 0.4,
    lengthCm: [45, 100], weightKg: [0.9, 9], awareness: 70, caution: 0.45, price: 75,
    baitLikes: ['minnow'], lureTypes: { blade: 2, spoon: 2, spinner: 1, crank: 1, swim: 1, glide: 1, topwater: 1 },
    homes: [
      { loc: 'fog', depth: [1, 12], hours: ['day'] },
      { loc: 'pines', depth: [1, 12], hours: ['day'] },
      { loc: 'harts', reaches: ['the_weedbed'], depth: [1, 6], hours: ['day'] }
    ],
  },
  {
    id: 'muskie', name: 'Muskie', latin: 'Esox masquinongy', family: 'pikes',
    speed: 2.3, strength: 2.2, fatigue: 0.05, mass: 8, jumps: 0.5,
    lengthCm: [70, 130], weightKg: [3, 18], awareness: 80, caution: 0.65, price: 157,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, glide: 1, swim: 1, crank: 1, spinner: 1, topwater: 1, blade: 1 },
    homes: [{ loc: 'pines', depth: [2, 14], hours: [] }],
  },
  {
    id: 'tiger_muskie', name: 'Tiger Muskie', latin: 'Esox masquinongy × E. lucius', family: 'pikes',
    speed: 2.3, strength: 2, fatigue: 0.06, mass: 5, jumps: 0.5,
    lengthCm: [60, 110], weightKg: [2, 12], awareness: 74, caution: 0.6, price: 110,
    baitLikes: ['minnow'], lureTypes: { crank: 2, spoon: 1, glide: 1, swim: 1, spinner: 1, blade: 1 },
    homes: [{ loc: 'pines', depth: [2, 12], hours: ['day'] }],
  },
  // ---- trout & salmon ----
  {
    id: 'lake_trout', name: 'Lake Trout', latin: 'Salvelinus namaycush', family: 'trout & salmon',
    speed: 1.8, strength: 1.6, fatigue: 0.07, mass: 3.5, jumps: 0.1,
    lengthCm: [45, 90], weightKg: [1, 10], awareness: 66, caution: 0.5, price: 84,
    baitLikes: ['minnow'], lureTypes: { spinner: 2, spoon: 1, crank: 1, blade: 1, jighead: 1, swim: 1 },
    homes: [
      { loc: 'fog', depth: [14, 24], hours: [] },
      { loc: 'harts', reaches: ['birch_point'], depth: [16, 32], hours: ['dawn', 'day'] }
    ],
  },
  {
    id: 'arctic_char', name: 'Arctic Char', latin: 'Salvelinus alpinus', family: 'trout & salmon',
    speed: 1.7, strength: 1.2, fatigue: 0.08, mass: 1.6, jumps: 0.2,
    lengthCm: [30, 65], weightKg: [0.5, 5], awareness: 56, caution: 0.5, price: 47,
    baitLikes: ['minnow', 'worm'], lureTypes: { blade: 2, spoon: 1, spinner: 1, jighead: 1 },
    homes: [
      { loc: 'fog', depth: [16, 24], hours: ['dawn', 'day'] },
      { loc: 'harts', reaches: ['the_old_bench'], depth: [20, 32], hours: ['dawn'] },
      { loc: 'wreck', reaches: ['haul_out_rocks'], depth: [1, 8], hours: ['day'] }
    ],
  },
  {
    id: 'brook_trout', name: 'Brook Trout', latin: 'Salvelinus fontinalis', family: 'trout & salmon',
    speed: 1.6, strength: 0.7, fatigue: 0.11, mass: 0.35, jumps: 0.3,
    lengthCm: [15, 40], weightKg: [0.1, 1.5], awareness: 62, caution: 0.5, price: 15,
    baitLikes: ['worm', 'cricket'], lureTypes: { topwater: 2, spinner: 1, crank: 1, spoon: 1 },
    homes: [
      { loc: 'creek', depth: [0.5, 5], hours: ['dawn', 'dusk'] },
      { loc: 'stone', reaches: ['boulder_run'], depth: [0.5, 3], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'brown_trout', name: 'Brown Trout', latin: 'Salmo trutta', family: 'trout & salmon',
    speed: 1.8, strength: 1.2, fatigue: 0.09, mass: 1, jumps: 0.4,
    lengthCm: [25, 65], weightKg: [0.2, 4], awareness: 66, caution: 0.6, lineShy: true, price: 33,
    baitLikes: ['worm', 'minnow', 'cricket'], lureTypes: { crank: 2, spinner: 1, spoon: 1, swim: 1, jighead: 1, topwater: 1 },
    homes: [
      { loc: 'creek', depth: [1, 8], hours: ['dusk', 'night', 'dawn'] },
      { loc: 'copper', reaches: ['the_split'], depth: [1, 4], hours: ['dusk', 'night', 'dawn'] },
      { loc: 'copper', reaches: ['lodge_pool'], depth: [1, 5], hours: ['dusk', 'night'] }
    ],
  },
  {
    id: 'rainbow_trout', name: 'Rainbow Trout', latin: 'Oncorhynchus mykiss', family: 'trout & salmon',
    speed: 2, strength: 1.1, fatigue: 0.09, mass: 0.9, jumps: 0.8,
    lengthCm: [25, 60], weightKg: [0.2, 4], awareness: 56, caution: 0.45, price: 30,
    baitLikes: ['worm', 'cricket'], lureTypes: { blade: 2, spinner: 1, spoon: 1, crank: 1, wacky: 1, topwater: 1, dropshot: 1 },
    homes: [
      { loc: 'creek', depth: [1, 8], hours: [] },
      { loc: 'stone', reaches: ['boulder_run'], depth: [0.5, 4], hours: ['dawn', 'dusk'] },
      { loc: 'harts', reaches: ['the_weedbed'], depth: [1, 8], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'steelhead', name: 'Steelhead', latin: 'Oncorhynchus mykiss (sea-run)', family: 'trout & salmon',
    speed: 2.3, strength: 1.8, fatigue: 0.06, mass: 3.6, jumps: 0.9,
    lengthCm: [50, 90], weightKg: [2, 9], awareness: 64, caution: 0.55, price: 86,
    baitLikes: ['worm', 'minnow'], lureTypes: { spinner: 2, spoon: 1, jighead: 1, crank: 1, blade: 1 },
    homes: [
      { loc: 'creek', depth: [2, 12], hours: ['dawn', 'dusk'] },
      { loc: 'copper', reaches: ['hollow_reach'], depth: [2, 8], hours: ['dawn'] },
      { loc: 'sound', reaches: ['lamplight_head', 'harbour_cove'], depth: [1, 6], hours: ['dawn'] }
    ],
  },
  {
    id: 'tiger_trout', name: 'Tiger Trout', latin: 'Salmo trutta × Salvelinus fontinalis', family: 'trout & salmon',
    speed: 1.8, strength: 1.1, fatigue: 0.09, mass: 0.8, jumps: 0.3,
    lengthCm: [25, 55], weightKg: [0.2, 3], awareness: 58, caution: 0.5, price: 28,
    baitLikes: ['minnow', 'worm'], lureTypes: { spinner: 2, crank: 1, swim: 1, spoon: 1 },
    homes: [
      { loc: 'creek', depth: [1, 8], hours: ['dawn', 'dusk'] },
      { loc: 'harts', reaches: ['the_weedbed'], depth: [1, 6], hours: ['dawn', 'dusk'] },
      { loc: 'harts', reaches: ['birch_point'], depth: [2, 8], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'cutthroat_trout', name: 'Cutthroat Trout', latin: 'Oncorhynchus clarkii', family: 'trout & salmon',
    speed: 1.7, strength: 1, fatigue: 0.1, mass: 0.6, jumps: 0.4,
    lengthCm: [20, 50], weightKg: [0.15, 2.5], awareness: 56, caution: 0.45, price: 22,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, spoon: 1, topwater: 1, crank: 1 },
    homes: [
      { loc: 'creek', depth: [1, 6], hours: ['dawn', 'dusk'] },
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [0.5, 4], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'dolly_varden', name: 'Dolly Varden', latin: 'Salvelinus malma', family: 'trout & salmon',
    speed: 1.7, strength: 1.1, fatigue: 0.09, mass: 1, jumps: 0.2,
    lengthCm: [25, 60], weightKg: [0.2, 4], awareness: 56, caution: 0.45, price: 33,
    baitLikes: ['worm', 'minnow'], lureTypes: { spinner: 2, spoon: 1, jighead: 1, blade: 1, dropshot: 1 },
    homes: [
      { loc: 'creek', depth: [1, 10], hours: [] },
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [1, 6], hours: ['day'] },
      { loc: 'sound', reaches: ['harbour_cove'], depth: [1, 6], hours: ['day'] }
    ],
  },
  {
    id: 'arctic_grayling', name: 'Arctic Grayling', latin: 'Thymallus arcticus', family: 'trout & salmon',
    speed: 1.6, strength: 0.6, fatigue: 0.12, mass: 0.4, jumps: 0.3,
    lengthCm: [20, 45], weightKg: [0.1, 1.5], awareness: 54, caution: 0.4, price: 10,
    baitLikes: ['cricket', 'worm'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 },
    homes: [
      { loc: 'creek', depth: [0.5, 4], hours: ['day'] },
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [0.5, 3], hours: ['day'] }
    ],
  },
  {
    id: 'atlantic_salmon', name: 'Atlantic Salmon', latin: 'Salmo salar', family: 'trout & salmon',
    speed: 2.1, strength: 1.6, fatigue: 0.07, mass: 8, jumps: 0.9,
    lengthCm: [60, 110], weightKg: [2, 20], awareness: 70, caution: 0.6, price: 157,
    baitLikes: ['minnow'], lureTypes: { crank: 2, spoon: 1, spinner: 1 },
    homes: [
      { loc: 'wreck', reaches: ['the_shelf'], depth: [2, 10], hours: ['dawn'] },
      { loc: 'wreck', reaches: ['haul_out_rocks'], depth: [1, 6], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'king_salmon', name: 'King Salmon', latin: 'Oncorhynchus tshawytscha', family: 'trout & salmon',
    speed: 2.3, strength: 2.2, fatigue: 0.05, mass: 12, jumps: 0.5,
    lengthCm: [70, 120], weightKg: [5, 30], awareness: 70, caution: 0.6, price: 213,
    baitLikes: ['minnow'], lureTypes: { glide: 2, spoon: 1, crank: 1, jighead: 1 },
    homes: [{ loc: 'sound', reaches: ['skerry_reef'], depth: [6, 25], hours: ['dawn'] }],
  },
  {
    id: 'coho_salmon', name: 'Coho Salmon', latin: 'Oncorhynchus kisutch', family: 'trout & salmon',
    speed: 2.1, strength: 1.3, fatigue: 0.08, mass: 4, jumps: 0.8,
    lengthCm: [50, 80], weightKg: [2, 8], awareness: 66, caution: 0.5, price: 93,
    baitLikes: ['minnow'], lureTypes: { jighead: 2, spinner: 1, spoon: 1 },
    homes: [
      { loc: 'stone', reaches: ['boulder_run'], depth: [1, 5], hours: ['dawn', 'dusk'] },
      { loc: 'sound', reaches: ['skerry_reef'], depth: [1, 10], hours: ['dawn', 'day'] }
    ],
  },
  {
    id: 'sockeye_salmon', name: 'Sockeye Salmon', latin: 'Oncorhynchus nerka', family: 'trout & salmon',
    speed: 2, strength: 1.2, fatigue: 0.09, mass: 3, jumps: 0.6,
    lengthCm: [50, 70], weightKg: [2, 5], awareness: 64, caution: 0.55, price: 75,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, jighead: 1 },
    homes: [
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [2, 7], hours: ['dawn', 'day'] },
      { loc: 'sound', reaches: ['skerry_reef'], depth: [2, 12], hours: ['dawn'] }
    ],
  },
  {
    id: 'pink_salmon', name: 'Pink Salmon', latin: 'Oncorhynchus gorbuscha', family: 'trout & salmon',
    speed: 2, strength: 1.1, fatigue: 0.09, mass: 2, jumps: 0.6,
    lengthCm: [40, 65], weightKg: [1, 4], awareness: 60, caution: 0.45, price: 55,
    baitLikes: ['minnow'], lureTypes: { glide: 2, spoon: 1, spinner: 1, jighead: 1 },
    homes: [{ loc: 'sound', reaches: ['harbour_cove'], depth: [1, 8], hours: ['day'] }],
  },
  {
    id: 'chum_salmon', name: 'Chum Salmon', latin: 'Oncorhynchus keta', family: 'trout & salmon',
    speed: 2, strength: 1.5, fatigue: 0.08, mass: 7.5, jumps: 0.5,
    lengthCm: [55, 90], weightKg: [3, 10], awareness: 62, caution: 0.5, price: 150,
    baitLikes: ['minnow'], lureTypes: { jighead: 2, spoon: 1, spinner: 1 },
    homes: [
      { loc: 'stone', reaches: ['boulder_run'], depth: [2, 7], hours: ['dawn', 'dusk'] },
      { loc: 'sound', reaches: ['harbour_cove'], depth: [2, 10], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'masu_salmon', name: 'Masu Salmon', latin: 'Oncorhynchus masou', family: 'trout & salmon',
    speed: 1.9, strength: 1.1, fatigue: 0.09, mass: 2.5, jumps: 0.6,
    lengthCm: [40, 70], weightKg: [1, 5], awareness: 62, caution: 0.5, price: 66,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, spinner: 1 },
    homes: [
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [2, 6], hours: ['dawn'] },
      { loc: 'sound', reaches: ['skerry_reef'], depth: [2, 12], hours: ['dawn'] }
    ],
  },
  // ---- whitefish ----
  {
    id: 'cisco', name: 'Cisco', latin: 'Coregonus artedi', family: 'whitefish',
    speed: 1.6, strength: 0.6, fatigue: 0.12, mass: 0.4,
    lengthCm: [20, 40], weightKg: [0.1, 1], awareness: 50, caution: 0.4, price: 6,
    baitLikes: ['worm', 'minnow'], lureTypes: { spoon: 1, jighead: 1, blade: 1, wacky: 1 },
    homes: [
      { loc: 'fog', depth: [6, 22], hours: ['dawn', 'dusk'] },
      { loc: 'harts', reaches: ['the_weedbed'], depth: [6, 20], hours: ['dawn', 'dusk'] }
    ],
  },
  {
    id: 'lake_whitefish', name: 'Lake Whitefish', latin: 'Coregonus clupeaformis', family: 'whitefish',
    speed: 1.4, strength: 0.9, fatigue: 0.1, mass: 1.2,
    lengthCm: [30, 55], weightKg: [0.5, 3], awareness: 44, caution: 0.45, price: 23,
    baitLikes: ['worm', 'minnow'], lureTypes: { wacky: 2, jighead: 1, dropshot: 1, spoon: 1 },
    homes: [
      { loc: 'fog', depth: [8, 24], hours: [] },
      { loc: 'harts', reaches: ['birch_point'], depth: [10, 26], hours: ['day'] }
    ],
  },
  {
    id: 'round_whitefish', name: 'Round Whitefish', latin: 'Prosopium cylindraceum', family: 'whitefish',
    speed: 1.4, strength: 0.6, fatigue: 0.12, mass: 0.3,
    lengthCm: [20, 40], weightKg: [0.1, 1], awareness: 44, caution: 0.4, price: 5,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1, jighead: 1 },
    homes: [
      { loc: 'creek', depth: [2, 10], hours: ['day'] },
      { loc: 'harts', reaches: ['the_old_bench'], depth: [6, 20], hours: ['day'] }
    ],
  },
  {
    id: 'mountain_whitefish', name: 'Mountain Whitefish', latin: 'Prosopium williamsoni', family: 'whitefish',
    speed: 1.5, strength: 0.7, fatigue: 0.12, mass: 0.4,
    lengthCm: [20, 45], weightKg: [0.1, 1.5], awareness: 48, caution: 0.4, price: 6,
    baitLikes: ['worm', 'cricket'], lureTypes: { topwater: 2, wacky: 1, jighead: 1 },
    homes: [
      { loc: 'creek', depth: [1, 6], hours: [] },
      { loc: 'stone', reaches: ['boulder_run'], depth: [1, 5], hours: ['day'] }
    ],
  },
  {
    id: 'humpback_whitefish', name: 'Humpback Whitefish', latin: 'Coregonus pidschian', family: 'whitefish',
    speed: 1.4, strength: 0.8, fatigue: 0.1, mass: 1,
    lengthCm: [30, 50], weightKg: [0.5, 2.5], awareness: 46, caution: 0.45, price: 20,
    baitLikes: ['worm'], lureTypes: { spinner: 2, wacky: 1, jighead: 1 },
    homes: [{ loc: 'harts', reaches: ['the_old_bench'], depth: [14, 30], hours: [] }],
  },
  // ---- suckers ----
  {
    id: 'white_sucker', name: 'White Sucker', latin: 'Catostomus commersonii', family: 'suckers',
    speed: 1, strength: 0.9, fatigue: 0.1, mass: 0.9,
    lengthCm: [25, 50], weightKg: [0.4, 2.5], awareness: 36, caution: 0.35, price: 11,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 },
    homes: [
      { loc: 'fog', depth: [2, 12], bed: true, hours: [] },
      { loc: 'harts', reaches: ['the_old_bench'], depth: [2, 10], bed: true, hours: ['day'] }
    ],
  },
  {
    id: 'longnose_sucker', name: 'Longnose Sucker', latin: 'Catostomus catostomus', family: 'suckers',
    speed: 1, strength: 0.8, fatigue: 0.1, mass: 0.8,
    lengthCm: [25, 50], weightKg: [0.3, 2], awareness: 36, caution: 0.35, price: 10,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 },
    homes: [
      { loc: 'fog', depth: [6, 20], bed: true, hours: [] },
      { loc: 'copper', reaches: ['lodge_pool'], depth: [3, 9], bed: true, hours: ['day'] }
    ],
  },
  {
    id: 'shorthead_redhorse', name: 'Shorthead Redhorse', latin: 'Moxostoma macrolepidotum', family: 'suckers',
    speed: 1.1, strength: 0.9, fatigue: 0.1, mass: 0.9,
    lengthCm: [25, 50], weightKg: [0.3, 2.5], awareness: 38, caution: 0.35, price: 11,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 },
    homes: [
      { loc: 'creek', depth: [1, 8], bed: true, hours: ['day'] },
      { loc: 'copper', reaches: ['hollow_reach'], depth: [2, 9], bed: true, hours: ['day'] }
    ],
  },
  {
    id: 'largescale_sucker', name: 'Largescale Sucker', latin: 'Catostomus macrocheilus', family: 'suckers',
    speed: 1.1, strength: 1, fatigue: 0.09, mass: 1.2,
    lengthCm: [30, 55], weightKg: [0.5, 3], awareness: 36, caution: 0.35, price: 14,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 },
    homes: [
      { loc: 'creek', depth: [2, 12], bed: true, hours: [] },
      { loc: 'russet', reaches: ['mink_cove'], depth: [2, 12], bed: true, hours: ['day'] }
    ],
  },
  // ---- carp & minnows ----
  {
    id: 'common_carp', name: 'Common Carp', latin: 'Cyprinus carpio', family: 'carp & minnows',
    speed: 1.2, strength: 1.8, fatigue: 0.05, mass: 5, jumps: 0.1,
    lengthCm: [40, 90], weightKg: [1.5, 15], awareness: 40, caution: 0.6, price: 40,
    baitLikes: ['worm'], lureTypes: { crank: 2, wacky: 1 },
    homes: [
      { loc: 'pines', depth: [1, 10], hours: [] },
      { loc: 'harts', reaches: ['the_old_bench'], depth: [1, 5], hours: ['day'] }
    ],
  },
  {
    id: 'creek_chub', name: 'Creek Chub', latin: 'Semotilus atromaculatus', family: 'carp & minnows',
    speed: 1.5, strength: 0.35, fatigue: 0.16, mass: 0.06,
    lengthCm: [8, 25], weightKg: [0.01, 0.3], awareness: 46, caution: 0.3, price: 3,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, wacky: 1, topwater: 1 },
    homes: [
      { loc: 'creek', depth: [0.5, 4], hours: ['day'] },
      { loc: 'copper', reaches: ['hollow_reach'], depth: [0.5, 3], hours: ['day'] }
    ],
  },
  {
    id: 'longnose_dace', name: 'Longnose Dace', latin: 'Rhinichthys cataractae', family: 'carp & minnows',
    speed: 1.8, strength: 0.15, fatigue: 0.3, mass: 0.01,
    lengthCm: [5, 10], weightKg: [0.005, 0.02], awareness: 52, caution: 0.25, price: 3,
    baitLikes: ['worm'], lureTypes: {},
    homes: [
      { loc: 'creek', depth: [0.5, 3], hours: ['day'] },
      { loc: 'stone', reaches: ['osprey_bluff'], depth: [0.5, 2], hours: ['day'] }
    ],
  },
  {
    id: 'peamouth', name: 'Peamouth', latin: 'Mylocheilus caurinus', family: 'carp & minnows',
    speed: 1.4, strength: 0.4, fatigue: 0.14, mass: 0.15,
    lengthCm: [15, 30], weightKg: [0.05, 0.4], awareness: 46, caution: 0.3, price: 3,
    baitLikes: ['worm', 'cricket'], lureTypes: { wacky: 1 },
    homes: [
      { loc: 'creek', depth: [1, 6], hours: ['day'] },
      { loc: 'russet', reaches: ['reed_flats'], depth: [1, 5], hours: ['day'] },
      { loc: 'russet', reaches: ['mink_cove'], depth: [1, 6], hours: ['day'] }
    ],
  },
  {
    id: 'northern_pikeminnow', name: 'Northern Pikeminnow', latin: 'Ptychocheilus oregonensis', family: 'carp & minnows',
    speed: 1.8, strength: 1, fatigue: 0.09, mass: 0.8,
    lengthCm: [25, 55], weightKg: [0.2, 2.5], awareness: 56, caution: 0.4, price: 10,
    baitLikes: ['minnow', 'worm'], lureTypes: { swim: 2, spinner: 1, crank: 1, spoon: 1, jighead: 1 },
    homes: [
      { loc: 'creek', depth: [1, 10], hours: ['dawn', 'dusk'] },
      { loc: 'russet', reaches: ['mink_cove'], depth: [1, 8], hours: ['dawn', 'dusk'] }
    ],
  },
  // ---- catfish ----
  {
    id: 'bullhead_catfish', name: 'Bullhead Catfish', latin: 'Ameiurus nebulosus', family: 'catfish',
    speed: 1, strength: 0.8, fatigue: 0.11, mass: 0.5,
    lengthCm: [20, 40], weightKg: [0.2, 1.5], awareness: 34, caution: 0.3, price: 7,
    baitLikes: ['worm', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 },
    homes: [
      { loc: 'pines', depth: [1, 8], bed: true, hours: ['night'] },
      { loc: 'copper', reaches: ['lodge_pool'], depth: [2, 7], bed: true, hours: ['night'] }
    ],
  },
  {
    id: 'channel_catfish', name: 'Channel Catfish', latin: 'Ictalurus punctatus', family: 'catfish',
    speed: 1.4, strength: 1.7, fatigue: 0.06, mass: 3.5,
    lengthCm: [40, 90], weightKg: [1, 12], awareness: 40, caution: 0.45, price: 51,
    baitLikes: ['worm', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 },
    homes: [
      { loc: 'pines', depth: [3, 20], bed: true, hours: ['night'] },
      { loc: 'russet', reaches: ['reed_flats'], depth: [2, 8], bed: true, hours: ['night'] }
    ],
  },
  // ---- cod ----
  {
    id: 'burbot', name: 'Burbot', latin: 'Lota lota', family: 'cod',
    speed: 1, strength: 1.1, fatigue: 0.08, mass: 1.4,
    lengthCm: [35, 75], weightKg: [0.4, 3.5], awareness: 34, caution: 0.35, price: 26,
    baitLikes: ['worm', 'minnow'], lureTypes: { spoon: 2, jighead: 1, dropshot: 1 },
    homes: [
      { loc: 'fog', depth: [14, 24], bed: true, hours: ['night'] },
      { loc: 'copper', reaches: ['hollow_reach'], depth: [6, 10], bed: true, hours: ['night'] }
    ],
  },
  // ---- sturgeon ----
  {
    id: 'white_sturgeon', name: 'White Sturgeon', latin: 'Acipenser transmontanus', family: 'sturgeon',
    speed: 1.6, strength: 2.6, fatigue: 0.03, mass: 16, jumps: 0.3,
    lengthCm: [80, 220], weightKg: [5, 100], awareness: 50, caution: 0.5, price: 264,
    baitLikes: ['worm', 'minnow'], lureTypes: { swim: 2, dropshot: 1, jighead: 1 },
    homes: [{ loc: 'russet', reaches: ['mink_cove'], depth: [14, 24], bed: true, hours: ['night'] }],
  },
  // ---- mooneyes ----
  {
    id: 'mooneye', name: 'Mooneye', latin: 'Hiodon tergisus', family: 'mooneyes',
    speed: 1.8, strength: 0.6, fatigue: 0.12, mass: 0.25, jumps: 0.3,
    lengthCm: [20, 35], weightKg: [0.1, 0.6], awareness: 54, caution: 0.35, price: 4,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 },
    homes: [{ loc: 'harts', reaches: ['birch_point'], depth: [1, 6], hours: ['dusk', 'night'] }],
  },
  {
    id: 'goldeye', name: 'Goldeye', latin: 'Hiodon alosoides', family: 'mooneyes',
    speed: 1.8, strength: 0.7, fatigue: 0.12, mass: 0.4, jumps: 0.3,
    lengthCm: [25, 40], weightKg: [0.2, 1], awareness: 54, caution: 0.35, price: 6,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 },
    homes: [{ loc: 'harts', reaches: ['the_old_bench'], depth: [1, 5], hours: ['dusk', 'night'] }],
  },
  // ---- herring & shad ----
  {
    id: 'threadfin_shad', name: 'Threadfin Shad', latin: 'Dorosoma petenense', family: 'herring & shad',
    speed: 1.9, strength: 0.15, fatigue: 0.3, mass: 0.015,
    lengthCm: [5, 10], weightKg: [0.005, 0.03], awareness: 56, caution: 0.25, price: 3,
    baitLikes: ['worm'], lureTypes: {},
    homes: [{ loc: 'russet', reaches: ['reed_flats'], depth: [0.5, 4], hours: ['day'] }],
  },
  {
    id: 'pacific_herring', name: 'Pacific Herring', latin: 'Clupea pallasii', family: 'herring & shad',
    speed: 1.9, strength: 0.4, fatigue: 0.14, mass: 0.15,
    lengthCm: [15, 30], weightKg: [0.05, 0.4], awareness: 56, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: { spoon: 1 },
    homes: [{ loc: 'sound', reaches: ['lamplight_head', 'skerry_reef'], depth: [2, 12], hours: ['dawn', 'dusk'] }],
  },
  {
    id: 'american_shad', name: 'American Shad', latin: 'Alosa sapidissima', family: 'herring & shad',
    speed: 1.9, strength: 1.1, fatigue: 0.09, mass: 1.8, jumps: 0.6,
    lengthCm: [35, 60], weightKg: [1, 4], awareness: 60, caution: 0.45, price: 31,
    baitLikes: ['worm'], lureTypes: { spoon: 1, jighead: 1 },
    homes: [{ loc: 'wreck', reaches: ['haul_out_rocks'], depth: [1, 8], hours: ['day'] }],
  },
  // ---- smelt ----
  {
    id: 'eulachon', name: 'Eulachon', latin: 'Thaleichthys pacificus', family: 'smelt',
    speed: 1.9, strength: 0.25, fatigue: 0.2, mass: 0.05,
    lengthCm: [15, 25], weightKg: [0.03, 0.08], awareness: 54, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: {},
    homes: [{ loc: 'sound', reaches: ['harbour_cove'], depth: [5, 20], hours: ['night'] }],
  },
  {
    id: 'capelin', name: 'Capelin', latin: 'Mallotus villosus', family: 'smelt',
    speed: 1.8, strength: 0.2, fatigue: 0.22, mass: 0.03,
    lengthCm: [12, 20], weightKg: [0.02, 0.05], awareness: 54, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: {},
    homes: [
      { loc: 'wreck', reaches: ['the_shelf'], depth: [3, 15], hours: ['day', 'night'] },
      { loc: 'wreck', reaches: ['haul_out_rocks'], depth: [2, 10], hours: ['day'] }
    ],
  },
  // ---- greenlings ----
  {
    id: 'lingcod', name: 'Lingcod', latin: 'Ophiodon elongatus', family: 'greenlings',
    speed: 1.4, strength: 1.6, fatigue: 0.07, mass: 9,
    lengthCm: [50, 110], weightKg: [2, 25], awareness: 52, caution: 0.4, price: 104,
    baitLikes: ['minnow'], lureTypes: { jighead: 2, swim: 1, spoon: 1 },
    homes: [
      { loc: 'sound', reaches: ['lamplight_head'], depth: [15, 40], bed: true, hours: ['dawn', 'day'] },
      { loc: 'sound', reaches: ['skerry_reef'], depth: [12, 30], bed: true, hours: ['dawn', 'day'] }
    ],
  },
  // ---- flatfish ----
  {
    id: 'greenland_halibut', name: 'Greenland Halibut', latin: 'Reinhardtius hippoglossoides', family: 'flatfish',
    speed: 1.2, strength: 1.5, fatigue: 0.07, mass: 4,
    lengthCm: [45, 90], weightKg: [1.5, 10], awareness: 44, caution: 0.45, price: 57,
    baitLikes: ['minnow'], lureTypes: { blade: 2, jighead: 1 },
    homes: [{ loc: 'wreck', reaches: ['the_shelf'], depth: [30, 40], bed: true, hours: ['day'] }],
  },
  {
    id: 'pacific_halibut', name: 'Pacific Halibut', latin: 'Hippoglossus stenolepis', family: 'flatfish',
    speed: 1.3, strength: 2.2, fatigue: 0.04, mass: 15,
    lengthCm: [70, 180], weightKg: [5, 100], awareness: 48, caution: 0.5, price: 252,
    baitLikes: ['minnow'], lureTypes: { blade: 2, jighead: 1, swim: 1 },
    homes: [{ loc: 'sound', reaches: ['lamplight_head'], depth: [28, 40], bed: true, hours: ['day'] }],
  },
  // ---- rockfish ----
  {
    id: 'yelloweye_rockfish', name: 'Yelloweye Rockfish', latin: 'Sebastes ruberrimus', family: 'rockfish',
    speed: 1.2, strength: 1.4, fatigue: 0.08, mass: 3,
    lengthCm: [35, 70], weightKg: [1, 8], awareness: 46, caution: 0.45, price: 46,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, jighead: 1 },
    homes: [{ loc: 'sound', reaches: ['lamplight_head'], depth: [25, 40], bed: true, hours: ['day'] }],
  }
];

// Phase 80 (PLAN_WINTER.md 2.2): the ten (Ice) species of Tamarack Lake, each its own species
// with its own journal page, made from its summer self: the same body, fight, sizes and live
// baits, its lure types kept to the ones that fish straight down a hole (G.data.ICE_TYPES), a
// price × ICE_PRICE for the cold (Phase 68's rule, the reference valuing its ice fish a little
// above the others), and how often it turns up (turnUp, the reference's rarity: common 1, rare
// 0.45, epic 0.2 of the reach's spawn weight; fish_ai, the one place a rarity appears). Their
// homes are PLAN_WINTER.md §3. `more` overrides a field (the muskies' typical weight is under
// the Ice Rod's 5 kg, so they can be found before the Hardwater Rod is sold). trophyKg: the
// weight from which a catch is the trophy (the Tiger Muskie (Ice): the journal's "The ice monster").
G.data.ICE_TYPES = ['float', 'spoon', 'dropshot', 'wacky', 'jighead', 'blade'];
G.data.TURN_UP = { common: 1, rare: 0.45, epic: 0.2 };
G.data.ICE_PRICE = 1.25;
(function () {
  var ICE = [
    ['yellow_perch', 'epic', [{ loc: 'tamarack', reaches: ['the_flats'], depth: [1.5, 5], hours: ['day'] }]],
    ['northern_pike', 'rare', [{ loc: 'tamarack', reaches: ['the_flats'], depth: [1.5, 5], hours: ['day'] }]],
    ['largemouth_bass', 'rare', [{ loc: 'tamarack', reaches: ['the_flats'], depth: [2, 5], bed: true, hours: ['day'] }]],
    ['walleye', 'rare', [{ loc: 'tamarack', reaches: ['pressure_ridge'], depth: [4, 12], hours: ['dawn', 'dusk'] }]],
    ['smallmouth_bass', 'common', [{ loc: 'tamarack', reaches: ['pressure_ridge'], depth: [6, 12], bed: true, hours: ['day'] }]],
    ['muskie', 'epic', [{ loc: 'tamarack', reaches: ['pressure_ridge'], depth: [4, 12], hours: [] }], { mass: 5 }],
    ['tiger_muskie', 'epic', [{ loc: 'tamarack', reaches: ['pressure_ridge'], depth: [4, 10], hours: ['day'] }], { trophyKg: 10 }],
    ['lake_trout', 'rare', [{ loc: 'tamarack', reaches: ['the_deep_hole'], depth: [12, 28], hours: ['dawn', 'day'] }]],
    ['arctic_char', 'rare', [{ loc: 'tamarack', reaches: ['the_deep_hole'], depth: [14, 28], hours: ['day'] }]],
    ['channel_catfish', 'common', [{ loc: 'tamarack', reaches: ['the_deep_hole'], depth: [18, 28], bed: true, hours: ['night'] }]]
  ];
  var KEEP = ['latin', 'family', 'speed', 'strength', 'fatigue', 'mass', 'jumps', 'lengthCm', 'weightKg', 'awareness', 'caution', 'baitLikes', 'bite', 'lineShy'];
  ICE.forEach(function (e) {
    var f = null, i, k;
    for (i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === e[0]) f = G.data.fish[i];
    var o = { id: 'ice_' + f.id, name: f.name + ' (Ice)', of: f.id, ice: true, turnUp: G.data.TURN_UP[e[1]], turnUpName: e[1] };
    KEEP.forEach(function (key) { if (f[key] !== undefined) o[key] = f[key]; });
    o.price = Math.round(f.price * G.data.ICE_PRICE);
    o.lureTypes = {};
    for (k in f.lureTypes) if (G.data.ICE_TYPES.indexOf(k) >= 0) o.lureTypes[k] = f.lureTypes[k];
    o.homes = e[2];
    for (k in e[3] || {}) o[k] = e[3][k];
    G.data.fish.push(o);
  });
})();

// Phase 75: each home's habitat and timeLikes, each species' locations (built once, at load).
G.data.fish.forEach(function (f) {
  f.locations = [];
  (f.homes || []).forEach(function (h) {
    h.reaches = h.reaches || [];
    h.habitat = { depthMin: h.depth[0], depthMax: h.depth[1] };
    h.timeLikes = [];
    (h.hours || []).forEach(function (n) { (G.data.HOURS[n] || []).forEach(function (hr) { if (h.timeLikes.indexOf(hr) < 0) h.timeLikes.push(hr); }); });
    if (f.locations.indexOf(h.loc) < 0) f.locations.push(h.loc);
  });
});

// Phase 75: species f's home in water loc at reach (a reach id, or '' for anywhere in it): the
// home listing that reach, else one for the whole water; null if it does not live there.
// The user's fixes (2026-11-03): how a species takes the hook, felt in the rod and seen in the
// line (presentation only: the hook window is the same for all, sim/bite.js). By family, a
// species' own `bite` first:
//   tap: quick light taps (a perch, a sunfish, the small minnows and the shoal fish)
//   thump: one solid knock, then a heavy weight (the black bass, the walleye, the bottom fish)
//   slam: no pecking; it hits and turns, and the rod goes down (the pike, the trout and salmon)
//   mouth: slow bobs and a pull that builds (the suckers, carp, catfish, sturgeon, the burbot)
G.data.BITE_BY_FAMILY = {
  'perches': 'tap', 'sunfish & bass': 'tap', 'temperate bass': 'slam', 'pikes': 'slam', 'trout & salmon': 'slam',
  'whitefish': 'tap', 'suckers': 'mouth', 'carp & minnows': 'tap', 'catfish': 'mouth', 'cod': 'mouth', 'sturgeon': 'mouth',
  'mooneyes': 'tap', 'herring & shad': 'tap', 'smelt': 'tap', 'greenlings': 'slam', 'flatfish': 'thump', 'rockfish': 'thump'
};
G.data.BITE_OWN = { walleye: 'thump', smallmouth_bass: 'thump', largemouth_bass: 'thump', common_carp: 'mouth', northern_pikeminnow: 'slam', american_shad: 'slam' };
// Phase 105 (PLAN_FISHING.md): how each fish feeds, after the real fish. zone: where it takes
// food (bed: on the bottom; low: within 2-3 m of it; mid: open water; top: at the surface); pace:
// how fast it likes its food to move (still, slow, steady, fast); triggers: what sets it off
// (fall: something sinking past; pause: a running bait that stops dead; flash; thump: vibration;
// bed: a bait knocking the bottom; scent: live bait; top: a commotion on the surface); follows: it
// chases a moving lure and strikes when it stops. By family, with a few species of their own.
G.data.FEED_BY_FAMILY = {
  'perches': { zone: 'low', pace: 'slow', triggers: ['bed', 'fall', 'scent'], follows: false },
  'sunfish & bass': { zone: 'mid', pace: 'slow', triggers: ['scent', 'fall'], follows: false },
  'temperate bass': { zone: 'mid', pace: 'fast', triggers: ['flash', 'thump'], follows: true },
  'pikes': { zone: 'mid', pace: 'fast', triggers: ['flash', 'thump', 'pause', 'scent'], follows: true },
  'trout & salmon': { zone: 'mid', pace: 'steady', triggers: ['flash', 'scent'], follows: true },
  'whitefish': { zone: 'low', pace: 'slow', triggers: ['scent', 'fall', 'bed'], follows: false },
  'suckers': { zone: 'bed', pace: 'still', triggers: ['scent'], follows: false },
  'carp & minnows': { zone: 'mid', pace: 'slow', triggers: ['scent', 'flash'], follows: false },
  'catfish': { zone: 'bed', pace: 'still', triggers: ['scent', 'thump'], follows: false },
  'cod': { zone: 'bed', pace: 'slow', triggers: ['scent', 'bed', 'thump'], follows: false },
  'sturgeon': { zone: 'bed', pace: 'still', triggers: ['scent'], follows: false },
  'mooneyes': { zone: 'top', pace: 'steady', triggers: ['flash', 'top'], follows: false },
  'herring & shad': { zone: 'mid', pace: 'fast', triggers: ['flash'], follows: false },
  'smelt': { zone: 'mid', pace: 'slow', triggers: ['flash', 'scent'], follows: false },
  'greenlings': { zone: 'bed', pace: 'slow', triggers: ['bed', 'thump', 'fall'], follows: false },
  'flatfish': { zone: 'bed', pace: 'slow', triggers: ['bed', 'scent', 'fall'], follows: false },
  'rockfish': { zone: 'low', pace: 'slow', triggers: ['fall', 'scent', 'bed'], follows: false }
};
G.data.FEED_OWN = {
  walleye: { zone: 'low', pace: 'slow', triggers: ['bed', 'scent', 'pause'], follows: false },
  ice_walleye: { zone: 'low', pace: 'slow', triggers: ['bed', 'scent', 'pause'], follows: false },
  smallmouth_bass: { zone: 'low', pace: 'steady', triggers: ['bed', 'thump', 'pause'], follows: true },
  ice_smallmouth_bass: { zone: 'low', pace: 'steady', triggers: ['bed', 'thump', 'pause'], follows: true },
  largemouth_bass: { zone: 'mid', pace: 'steady', triggers: ['thump', 'pause', 'top', 'fall'], follows: true },
  ice_largemouth_bass: { zone: 'mid', pace: 'steady', triggers: ['thump', 'pause', 'fall'], follows: true },
  crappie: { zone: 'mid', pace: 'slow', triggers: ['fall', 'flash', 'scent'], follows: false },
  lake_trout: { zone: 'low', pace: 'steady', triggers: ['flash', 'thump', 'fall'], follows: true },
  ice_lake_trout: { zone: 'low', pace: 'steady', triggers: ['flash', 'thump', 'fall'], follows: true },
  arctic_char: { zone: 'low', pace: 'steady', triggers: ['flash', 'fall'], follows: true },
  ice_arctic_char: { zone: 'low', pace: 'steady', triggers: ['flash', 'fall'], follows: true },
  brook_trout: { zone: 'mid', pace: 'steady', triggers: ['flash', 'scent', 'top'], follows: true },
  arctic_grayling: { zone: 'top', pace: 'slow', triggers: ['top', 'flash', 'scent'], follows: false },
  common_carp: { zone: 'bed', pace: 'still', triggers: ['scent'], follows: false },
  northern_pikeminnow: { zone: 'mid', pace: 'fast', triggers: ['flash', 'thump'], follows: true },
  lingcod: { zone: 'bed', pace: 'slow', triggers: ['bed', 'thump', 'fall', 'pause'], follows: false },
  white_sturgeon: { zone: 'bed', pace: 'still', triggers: ['scent', 'thump'], follows: false }
};
G.data.FEED_ANY = { zone: 'mid', pace: 'slow', triggers: ['scent'], follows: false };
G.data.feedOf = function (f) { return (f && (f.feed || G.data.FEED_OWN[f.id] || G.data.FEED_BY_FAMILY[f.family])) || G.data.FEED_ANY; };

G.data.biteStyle = function (f) {
  return (f && (f.bite || G.data.BITE_OWN[f.id] || G.data.BITE_BY_FAMILY[f.family])) || 'tap';
};

G.data.homeOf = function (f, loc, reach) {
  var hs = f.homes, whole = null;
  for (var i = 0; i < hs.length; i++) {
    var h = hs[i];
    if (h.loc !== loc) continue;
    if (!h.reaches.length) whole = h;
    else if (!reach || h.reaches.indexOf(reach) >= 0) return h;
  }
  return whole;
};
// Phase 75: the id of water L's reach at world x ('' if L has none there).
G.data.reachAt = function (L, x) {
  var R = L && L.reaches;
  if (!R) return '';
  for (var i = 0; i < R.length; i++) if (x < R[i].x[1]) return R[i].id;
  return R.length ? R[R.length - 1].id : '';
};

// Phase 44: a small fish is one whose longest is SMALL_CM or less; the swimmer draws it to scale.
G.data.SMALL_CM = 10;
G.data.isSmall = function (f) { return f.lengthCm[1] <= G.data.SMALL_CM; };

// Phase 68: the size class of a weight in kg: its index in SIZE_CLASSES.
G.data.sizeClass = function (kg) {
  var c = G.data.SIZE_CLASSES;
  for (var i = 0; i < c.length - 1; i++) if (kg < c[i].maxKg) return i;
  return c.length - 1;
};

// Schema check (V5 as changed in Phase 68). Returns a list of problems; empty means valid.
// ref: {locations, looks} to check cross-references against (looks: G.data.fishLooks).
// tools/balance.js --validate runs this along with its other checks.
G.data.validateFish = function (fish, ref) {
  var errs = [], seen = {}, types = G.data.LURE_TYPES;
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function pair(v) { return v && v.length === 2 && num(v[0]) && num(v[1]) && v[0] <= v[1]; }
  function strs(v) { if (!v || typeof v.length !== 'number') return false; for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false; return true; }
  for (var i = 0; i < fish.length; i++) {
    var f = fish[i], p = (f && f.id ? f.id : '#' + i) + ': ';
    if (!f || typeof f.id !== 'string') { errs.push(p + 'id'); continue; }
    if (seen[f.id]) errs.push(p + 'duplicate id');
    seen[f.id] = true;
    ['name', 'latin', 'family'].forEach(function (k) { if (typeof f[k] !== 'string' || !f[k]) errs.push(p + k); });
    ['rarity', 'windows', 'uneaseMin', 'desc', 'hintRefs', 'lures'].forEach(function (k) { if (f[k] !== undefined) errs.push(p + k + ' was removed in Phase 68'); });
    if (f.look !== undefined) errs.push(p + 'look was removed in Phase 72 (the spec in data/fishlooks.js paints it)');
    // Phase 75: homes. Every species has one; each names a water and reaches it has, a depth
    // inside that water, and known hours; no two homes of a water claim the same reach.
    ['locations', 'habitat', 'timeLikes'].forEach(function (k) { if (f.homes && f.homes.length && k !== 'locations' && f[k] !== undefined) errs.push(p + k + ' was replaced by homes in Phase 75'); });
    if (!f.homes || !f.homes.length) errs.push(p + 'homes (every species lives somewhere)');
    else {
      var claimed = {};
      for (var j = 0; j < f.homes.length; j++) {
        var h = f.homes[j], q = p + 'home ' + j + ' (' + h.loc + '): ', loc = ref.locations[h.loc];
        if (!loc) { errs.push(q + 'unknown water'); continue; }
        if (!pair(h.depth) || h.depth[0] < 0 || h.depth[0] >= h.depth[1]) errs.push(q + 'depth [min, max]');
        else if (h.depth[1] * 4 > loc.maxDepth) errs.push(q + 'deeper than the water (' + loc.maxDepth / 4 + ' m)');
        if (h.bed !== undefined && h.bed !== true) errs.push(q + 'bed is true or absent');
        if (!strs(h.hours) || h.hours.some(function (n) { return !G.data.HOURS[n]; })) errs.push(q + 'hours must be names in G.data.HOURS');
        var rs = h.reaches && h.reaches.length ? h.reaches : ['*'];
        rs.forEach(function (r) {
          if (r !== '*' && !(loc.reaches || []).some(function (x) { return x.id === r; })) errs.push(q + 'unknown reach ' + r);
          var key = h.loc + ':' + r;
          if (claimed[key] || (r === '*' && Object.keys(claimed).some(function (k) { return k.indexOf(h.loc + ':') === 0; })) || (r !== '*' && claimed[h.loc + ':*'])) errs.push(q + 'two homes claim ' + key);
          claimed[key] = true;
        });
      }
    }
    ['speed', 'strength', 'fatigue', 'mass', 'awareness', 'price'].forEach(function (k) { if (!num(f[k]) || f[k] <= 0) errs.push(p + k); });
    if (f.jumps !== undefined && !(num(f.jumps) && f.jumps >= 0 && f.jumps <= 1)) errs.push(p + 'jumps (0..1, optional; Phase 23)');
    if (!num(f.caution) || f.caution < 0 || f.caution > 1) errs.push(p + 'caution');
    if (!pair(f.lengthCm)) errs.push(p + 'lengthCm');
    if (!pair(f.weightKg)) errs.push(p + 'weightKg');
    else if (f.mass < f.weightKg[0] || f.mass > f.weightKg[1]) errs.push(p + 'mass outside weightKg');
    if (!strs(f.baitLikes) || !f.baitLikes.length) errs.push(p + 'baitLikes (every species takes some live bait)');
    if (!f.lureTypes || typeof f.lureTypes !== 'object') errs.push(p + 'lureTypes');
    else for (var k in f.lureTypes) if (types.indexOf(k) < 0 || [1, 2].indexOf(f.lureTypes[k]) < 0) errs.push(p + 'lureTypes.' + k + ' must be a lure type and 1 or 2');
    if (!ref.looks || !ref.looks[f.id]) errs.push(p + 'no anatomy spec in data/fishlooks.js (Phase 72: every species is painted)');
    // Phase 80: an (Ice) species lives only on the ice and takes only what fishes down a hole;
    // no other species lives there; turnUp is one of the reference's rarities.
    var onIce = (f.homes || []).some(function (h) { return ref.locations[h.loc] && ref.locations[h.loc].ice; });
    if (f.ice) {
      if ((f.homes || []).some(function (h) { return !(ref.locations[h.loc] && ref.locations[h.loc].ice); })) errs.push(p + 'an (Ice) species lives only on the ice');
      for (var lt in f.lureTypes) if (G.data.ICE_TYPES.indexOf(lt) < 0) errs.push(p + 'lureTypes.' + lt + ' needs open water (only ' + G.data.ICE_TYPES.join(', ') + ' through the ice)');
      var tu = G.data.TURN_UP; if (!(f.turnUp === tu.common || f.turnUp === tu.rare || f.turnUp === tu.epic)) errs.push(p + 'turnUp (common, rare or epic)');
      if (!/ \(Ice\)$/.test(f.name)) errs.push(p + 'an ice species is named "... (Ice)"');
    } else if (onIce) errs.push(p + 'only the (Ice) species live on the ice');
    else if (f.turnUp !== undefined) errs.push(p + 'turnUp is for the (Ice) species only');
    if (f.trophyKg !== undefined && !(num(f.trophyKg) && f.trophyKg > f.weightKg[0] && f.trophyKg < f.weightKg[1])) errs.push(p + 'trophyKg inside weightKg');
  }
  return errs;
};
