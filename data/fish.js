var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish data (V5, as changed in Phase 68: PLAN_SPECIES.md) and the clock windows (§0.8).
// Phase 68: 59 real species, each in the waters it really lives in; a species with no
// locations lives in the sea or a big river that has not been made yet (it bites nowhere and
// the journal leaves it out). No rarity and nothing strange: which species turns up comes
// from the water, the depth, the hour, the bait or lure and the lure's size (fish_ai).
// Units: habitat depths in metres (px = m × 4), speed in fight units (V4: D grows by speed × 0.03/s;
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

G.data.fish = [
  // ---- perches ----
  {
    id: 'yellow_perch', name: 'Yellow Perch', latin: 'Perca flavescens', family: 'perches', locations: ['fog', 'pines'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.3, strength: 0.5, fatigue: 0.13, mass: 0.2,
    lengthCm: [12, 32], weightKg: [0.05, 0.6], awareness: 46, caution: 0.3, price: 6,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { wacky: 2, jighead: 1, dropshot: 1, spinner: 1, spoon: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'walleye', name: 'Walleye', latin: 'Sander vitreus', family: 'perches', locations: ['fog', 'red'],
    habitat: { depthMin: 3, depthMax: 14 }, speed: 1.5, strength: 1, fatigue: 0.09, mass: 1.4,
    lengthCm: [30, 70], weightKg: [0.3, 5], awareness: 55, caution: 0.5, price: 42,
    baitLikes: ['minnow', 'worm'], lureTypes: { spoon: 2, spinner: 1, jighead: 1, crank: 1, blade: 1, dropshot: 1, wacky: 1 }, timeLikes: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6], // from dusk to dawn
  },
  // ---- sunfish & bass ----
  {
    id: 'rock_bass', name: 'Rock Bass', latin: 'Ambloplites rupestris', family: 'sunfish & bass', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.2, strength: 0.6, fatigue: 0.12, mass: 0.25,
    lengthCm: [12, 28], weightKg: [0.1, 0.6], awareness: 44, caution: 0.3, price: 7,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, spinner: 1, crank: 1, wacky: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'smallmouth_bass', name: 'Smallmouth Bass', latin: 'Micropterus dolomieu', family: 'sunfish & bass', locations: ['fog'],
    habitat: { depthMin: 2, depthMax: 12 }, speed: 1.9, strength: 1.2, fatigue: 0.09, mass: 1, jumps: 0.6,
    lengthCm: [25, 50], weightKg: [0.3, 2.8], awareness: 58, caution: 0.45, price: 33,
    baitLikes: ['worm', 'cricket', 'minnow'], lureTypes: { crank: 2, jighead: 1, spinner: 1, topwater: 1, wacky: 1, dropshot: 1, swim: 1, blade: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'largemouth_bass', name: 'Largemouth Bass', latin: 'Micropterus salmoides', family: 'sunfish & bass', locations: ['pines'],
    habitat: { depthMin: 0.5, depthMax: 8 }, speed: 1.7, strength: 1.3, fatigue: 0.09, mass: 1.4, jumps: 0.7,
    lengthCm: [25, 60], weightKg: [0.3, 5], awareness: 56, caution: 0.4, price: 42,
    baitLikes: ['worm', 'minnow', 'cricket'], lureTypes: { jighead: 2, topwater: 1, crank: 1, spinner: 1, wacky: 1, swim: 1, dropshot: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'bluegill', name: 'Bluegill Sunfish', latin: 'Lepomis macrochirus', family: 'sunfish & bass', locations: ['pines'],
    habitat: { depthMin: 0.5, depthMax: 5 }, speed: 1.3, strength: 0.4, fatigue: 0.15, mass: 0.15,
    lengthCm: [8, 25], weightKg: [0.03, 0.6], awareness: 44, caution: 0.3, price: 5,
    baitLikes: ['worm', 'cricket'], lureTypes: { wacky: 1, spinner: 1, jighead: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'crappie', name: 'Crappie', latin: 'Pomoxis nigromaculatus', family: 'sunfish & bass', locations: ['pines', 'red'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.2, strength: 0.5, fatigue: 0.13, mass: 0.35,
    lengthCm: [15, 35], weightKg: [0.1, 1.2], awareness: 48, caution: 0.35, price: 9,
    baitLikes: ['minnow', 'worm'], lureTypes: { spoon: 2, jighead: 1, spinner: 1, wacky: 1, swim: 1 }, timeLikes: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6], // from dusk to dawn
  },
  // ---- temperate bass ----
  {
    id: 'white_bass', name: 'White Bass', latin: 'Morone chrysops', family: 'temperate bass', locations: ['red'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.8, strength: 0.9, fatigue: 0.1, mass: 0.5, jumps: 0.3,
    lengthCm: [20, 40], weightKg: [0.2, 1.5], awareness: 54, caution: 0.35, price: 12,
    baitLikes: ['minnow', 'worm'], lureTypes: { spinner: 2, crank: 2, spoon: 1, jighead: 1, blade: 1, topwater: 1, swim: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'hybrid_striped_bass', name: 'Hybrid Striped Bass', latin: 'Morone saxatilis × M. chrysops', family: 'temperate bass', locations: ['red'],
    habitat: { depthMin: 2, depthMax: 14 }, speed: 2.1, strength: 1.6, fatigue: 0.07, mass: 2.5, jumps: 0.3,
    lengthCm: [35, 65], weightKg: [1, 7], awareness: 62, caution: 0.45, price: 66,
    baitLikes: ['minnow', 'worm'], lureTypes: { jighead: 2, spinner: 1, crank: 1, spoon: 1, swim: 1, topwater: 1, blade: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'striped_bass', name: 'Striped Bass', latin: 'Morone saxatilis', family: 'temperate bass', locations: [],
    habitat: { depthMin: 2, depthMax: 20 }, speed: 2.1, strength: 2, fatigue: 0.06, mass: 7, jumps: 0.3,
    lengthCm: [50, 110], weightKg: [2, 25], awareness: 64, caution: 0.5, price: 142,
    baitLikes: ['minnow'], lureTypes: { crank: 2, swim: 1, topwater: 1, spoon: 1, jighead: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  // ---- pikes ----
  {
    id: 'northern_pike', name: 'Northern Pike', latin: 'Esox lucius', family: 'pikes', locations: ['fog', 'pines'],
    habitat: { depthMin: 1, depthMax: 12 }, speed: 2.2, strength: 1.6, fatigue: 0.08, mass: 3, jumps: 0.4,
    lengthCm: [45, 100], weightKg: [0.9, 9], awareness: 70, caution: 0.45, price: 75,
    baitLikes: ['minnow', 'worm'], lureTypes: { blade: 2, spoon: 2, spinner: 1, crank: 1, swim: 1, glide: 1, topwater: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'muskie', name: 'Muskie', latin: 'Esox masquinongy', family: 'pikes', locations: ['pines'],
    habitat: { depthMin: 2, depthMax: 14 }, speed: 2.3, strength: 2.2, fatigue: 0.05, mass: 8, jumps: 0.5,
    lengthCm: [70, 130], weightKg: [3, 18], awareness: 80, caution: 0.65, price: 157,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, glide: 1, swim: 1, crank: 1, spinner: 1, topwater: 1, blade: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'tiger_muskie', name: 'Tiger Muskie', latin: 'Esox masquinongy × E. lucius', family: 'pikes', locations: ['pines'],
    habitat: { depthMin: 2, depthMax: 12 }, speed: 2.3, strength: 2, fatigue: 0.06, mass: 5, jumps: 0.5,
    lengthCm: [60, 110], weightKg: [2, 12], awareness: 74, caution: 0.6, price: 110,
    baitLikes: ['minnow'], lureTypes: { crank: 2, spoon: 1, glide: 1, swim: 1, spinner: 1, blade: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  // ---- trout & salmon ----
  {
    id: 'lake_trout', name: 'Lake Trout', latin: 'Salvelinus namaycush', family: 'trout & salmon', locations: ['fog'],
    habitat: { depthMin: 14, depthMax: 24 }, speed: 1.8, strength: 1.6, fatigue: 0.07, mass: 3.5, jumps: 0.1,
    lengthCm: [45, 90], weightKg: [1, 10], awareness: 66, caution: 0.5, price: 84,
    baitLikes: ['minnow'], lureTypes: { spinner: 2, spoon: 1, crank: 1, blade: 1, jighead: 1, swim: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'arctic_char', name: 'Arctic Char', latin: 'Salvelinus alpinus', family: 'trout & salmon', locations: ['fog'],
    habitat: { depthMin: 16, depthMax: 24 }, speed: 1.7, strength: 1.2, fatigue: 0.08, mass: 1.6, jumps: 0.2,
    lengthCm: [30, 65], weightKg: [0.5, 5], awareness: 56, caution: 0.5, price: 47,
    baitLikes: ['minnow', 'worm'], lureTypes: { blade: 2, spoon: 1, spinner: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'brook_trout', name: 'Brook Trout', latin: 'Salvelinus fontinalis', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 5 }, speed: 1.6, strength: 0.7, fatigue: 0.11, mass: 0.35, jumps: 0.3,
    lengthCm: [15, 40], weightKg: [0.1, 1.5], awareness: 62, caution: 0.5, price: 15,
    baitLikes: ['worm', 'cricket'], lureTypes: { topwater: 2, spinner: 1, crank: 1, spoon: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'brown_trout', name: 'Brown Trout', latin: 'Salmo trutta', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.8, strength: 1.2, fatigue: 0.09, mass: 1, jumps: 0.4,
    lengthCm: [25, 65], weightKg: [0.2, 4], awareness: 66, caution: 0.6, lineShy: true, price: 33,
    baitLikes: ['worm', 'minnow', 'cricket'], lureTypes: { crank: 2, spinner: 1, spoon: 1, swim: 1, jighead: 1, topwater: 1 }, timeLikes: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6], // from dusk to dawn
  },
  {
    id: 'rainbow_trout', name: 'Rainbow Trout', latin: 'Oncorhynchus mykiss', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 2, strength: 1.1, fatigue: 0.09, mass: 0.9, jumps: 0.8,
    lengthCm: [25, 60], weightKg: [0.2, 4], awareness: 56, caution: 0.45, price: 30,
    baitLikes: ['worm', 'cricket'], lureTypes: { blade: 2, spinner: 1, spoon: 1, crank: 1, wacky: 1, topwater: 1, dropshot: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'steelhead', name: 'Steelhead', latin: 'Oncorhynchus mykiss (sea-run)', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 2, depthMax: 12 }, speed: 2.3, strength: 1.8, fatigue: 0.06, mass: 3.6, jumps: 0.9,
    lengthCm: [50, 90], weightKg: [2, 9], awareness: 64, caution: 0.55, price: 86,
    baitLikes: ['worm', 'minnow'], lureTypes: { spinner: 2, spoon: 1, jighead: 1, crank: 1, blade: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'tiger_trout', name: 'Tiger Trout', latin: 'Salmo trutta × Salvelinus fontinalis', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.8, strength: 1.1, fatigue: 0.09, mass: 0.8, jumps: 0.3,
    lengthCm: [25, 55], weightKg: [0.2, 3], awareness: 58, caution: 0.5, price: 28,
    baitLikes: ['minnow', 'worm'], lureTypes: { spinner: 2, crank: 1, swim: 1, spoon: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'cutthroat_trout', name: 'Cutthroat Trout', latin: 'Oncorhynchus clarkii', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 6 }, speed: 1.7, strength: 1, fatigue: 0.1, mass: 0.6, jumps: 0.4,
    lengthCm: [20, 50], weightKg: [0.15, 2.5], awareness: 56, caution: 0.45, price: 22,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, spoon: 1, topwater: 1, crank: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'dolly_varden', name: 'Dolly Varden', latin: 'Salvelinus malma', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.7, strength: 1.1, fatigue: 0.09, mass: 1, jumps: 0.2,
    lengthCm: [25, 60], weightKg: [0.2, 4], awareness: 56, caution: 0.45, price: 33,
    baitLikes: ['worm', 'minnow'], lureTypes: { spinner: 2, spoon: 1, jighead: 1, blade: 1, dropshot: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'arctic_grayling', name: 'Arctic Grayling', latin: 'Thymallus arcticus', family: 'trout & salmon', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 4 }, speed: 1.6, strength: 0.6, fatigue: 0.12, mass: 0.4, jumps: 0.3,
    lengthCm: [20, 45], weightKg: [0.1, 1.5], awareness: 54, caution: 0.4, price: 10,
    baitLikes: ['cricket', 'worm'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'atlantic_salmon', name: 'Atlantic Salmon', latin: 'Salmo salar', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 2.4, strength: 2.1, fatigue: 0.05, mass: 6, jumps: 0.9,
    lengthCm: [60, 110], weightKg: [2, 20], awareness: 70, caution: 0.6, price: 127,
    baitLikes: ['worm', 'minnow'], lureTypes: { crank: 2, spoon: 1, spinner: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'king_salmon', name: 'King Salmon', latin: 'Oncorhynchus tshawytscha', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 3, depthMax: 30 }, speed: 2.4, strength: 2.5, fatigue: 0.04, mass: 12, jumps: 0.5,
    lengthCm: [70, 120], weightKg: [5, 30], awareness: 70, caution: 0.6, price: 213,
    baitLikes: ['minnow'], lureTypes: { glide: 2, spoon: 1, crank: 1, jighead: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'coho_salmon', name: 'Coho Salmon', latin: 'Oncorhynchus kisutch', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 15 }, speed: 2.4, strength: 1.8, fatigue: 0.06, mass: 4, jumps: 0.8,
    lengthCm: [50, 80], weightKg: [2, 8], awareness: 66, caution: 0.5, price: 93,
    baitLikes: ['minnow', 'worm'], lureTypes: { jighead: 2, spinner: 1, spoon: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'sockeye_salmon', name: 'Sockeye Salmon', latin: 'Oncorhynchus nerka', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 15 }, speed: 2.3, strength: 1.6, fatigue: 0.07, mass: 3, jumps: 0.6,
    lengthCm: [50, 70], weightKg: [2, 5], awareness: 64, caution: 0.55, price: 75,
    baitLikes: ['worm'], lureTypes: { spoon: 2, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'pink_salmon', name: 'Pink Salmon', latin: 'Oncorhynchus gorbuscha', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 2.2, strength: 1.4, fatigue: 0.07, mass: 2, jumps: 0.6,
    lengthCm: [40, 65], weightKg: [1, 4], awareness: 60, caution: 0.45, price: 55,
    baitLikes: ['worm', 'minnow'], lureTypes: { glide: 2, spoon: 1, spinner: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'chum_salmon', name: 'Chum Salmon', latin: 'Oncorhynchus keta', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 15 }, speed: 2.2, strength: 2, fatigue: 0.06, mass: 5, jumps: 0.5,
    lengthCm: [55, 90], weightKg: [3, 10], awareness: 62, caution: 0.5, price: 110,
    baitLikes: ['minnow', 'worm'], lureTypes: { jighead: 2, spoon: 1, spinner: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'masu_salmon', name: 'Masu Salmon', latin: 'Oncorhynchus masou', family: 'trout & salmon', locations: [],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 2.1, strength: 1.5, fatigue: 0.07, mass: 2.5, jumps: 0.6,
    lengthCm: [40, 70], weightKg: [1, 5], awareness: 62, caution: 0.5, price: 66,
    baitLikes: ['worm', 'minnow'], lureTypes: { spoon: 2, spinner: 1 }, timeLikes: [], // any hour
  },
  // ---- whitefish ----
  {
    id: 'cisco', name: 'Cisco', latin: 'Coregonus artedi', family: 'whitefish', locations: ['fog'],
    habitat: { depthMin: 6, depthMax: 22 }, speed: 1.6, strength: 0.6, fatigue: 0.12, mass: 0.4,
    lengthCm: [20, 40], weightKg: [0.1, 1], awareness: 50, caution: 0.4, price: 6,
    baitLikes: ['worm', 'minnow'], lureTypes: { spoon: 1, jighead: 1, blade: 1, wacky: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'lake_whitefish', name: 'Lake Whitefish', latin: 'Coregonus clupeaformis', family: 'whitefish', locations: ['fog'],
    habitat: { depthMin: 8, depthMax: 24 }, speed: 1.4, strength: 0.9, fatigue: 0.1, mass: 1.2,
    lengthCm: [30, 55], weightKg: [0.5, 3], awareness: 44, caution: 0.45, price: 23,
    baitLikes: ['worm', 'minnow'], lureTypes: { wacky: 2, jighead: 1, dropshot: 1, spoon: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'round_whitefish', name: 'Round Whitefish', latin: 'Prosopium cylindraceum', family: 'whitefish', locations: ['creek'],
    habitat: { depthMin: 2, depthMax: 10 }, speed: 1.4, strength: 0.6, fatigue: 0.12, mass: 0.3,
    lengthCm: [20, 40], weightKg: [0.1, 1], awareness: 44, caution: 0.4, price: 5,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'mountain_whitefish', name: 'Mountain Whitefish', latin: 'Prosopium williamsoni', family: 'whitefish', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 6 }, speed: 1.5, strength: 0.7, fatigue: 0.12, mass: 0.4,
    lengthCm: [20, 45], weightKg: [0.1, 1.5], awareness: 48, caution: 0.4, price: 6,
    baitLikes: ['worm', 'cricket'], lureTypes: { topwater: 2, wacky: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'humpback_whitefish', name: 'Humpback Whitefish', latin: 'Coregonus pidschian', family: 'whitefish', locations: ['pines'],
    habitat: { depthMin: 12, depthMax: 28 }, speed: 1.4, strength: 0.8, fatigue: 0.1, mass: 1,
    lengthCm: [30, 50], weightKg: [0.5, 2.5], awareness: 46, caution: 0.45, price: 20,
    baitLikes: ['worm'], lureTypes: { spinner: 2, wacky: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  // ---- suckers ----
  {
    id: 'white_sucker', name: 'White Sucker', latin: 'Catostomus commersonii', family: 'suckers', locations: ['fog'],
    habitat: { depthMin: 2, depthMax: 12 }, speed: 1, strength: 0.9, fatigue: 0.1, mass: 0.9,
    lengthCm: [25, 50], weightKg: [0.4, 2.5], awareness: 36, caution: 0.35, price: 11,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'longnose_sucker', name: 'Longnose Sucker', latin: 'Catostomus catostomus', family: 'suckers', locations: ['fog'],
    habitat: { depthMin: 6, depthMax: 20 }, speed: 1, strength: 0.8, fatigue: 0.1, mass: 0.8,
    lengthCm: [25, 50], weightKg: [0.3, 2], awareness: 36, caution: 0.35, price: 10,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'shorthead_redhorse', name: 'Shorthead Redhorse', latin: 'Moxostoma macrolepidotum', family: 'suckers', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.1, strength: 0.9, fatigue: 0.1, mass: 0.9,
    lengthCm: [25, 50], weightKg: [0.3, 2.5], awareness: 38, caution: 0.35, price: 11,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'largescale_sucker', name: 'Largescale Sucker', latin: 'Catostomus macrocheilus', family: 'suckers', locations: ['creek'],
    habitat: { depthMin: 2, depthMax: 12 }, speed: 1.1, strength: 1, fatigue: 0.09, mass: 1.2,
    lengthCm: [30, 55], weightKg: [0.5, 3], awareness: 36, caution: 0.35, price: 14,
    baitLikes: ['worm'], lureTypes: { dropshot: 2, wacky: 1 }, timeLikes: [], // any hour
  },
  // ---- carp & minnows ----
  {
    id: 'common_carp', name: 'Common Carp', latin: 'Cyprinus carpio', family: 'carp & minnows', locations: ['pines', 'red'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.2, strength: 1.8, fatigue: 0.05, mass: 5, jumps: 0.1,
    lengthCm: [40, 90], weightKg: [1.5, 15], awareness: 40, caution: 0.6, price: 40,
    baitLikes: ['worm'], lureTypes: { crank: 2, dropshot: 1, wacky: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'creek_chub', name: 'Creek Chub', latin: 'Semotilus atromaculatus', family: 'carp & minnows', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 4 }, speed: 1.5, strength: 0.35, fatigue: 0.16, mass: 0.06,
    lengthCm: [8, 25], weightKg: [0.01, 0.3], awareness: 46, caution: 0.3, price: 3,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, wacky: 1, topwater: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'longnose_dace', name: 'Longnose Dace', latin: 'Rhinichthys cataractae', family: 'carp & minnows', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 3 }, speed: 1.8, strength: 0.15, fatigue: 0.3, mass: 0.01,
    lengthCm: [5, 10], weightKg: [0.005, 0.02], awareness: 52, caution: 0.25, price: 3,
    baitLikes: ['worm'], lureTypes: {}, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'peamouth', name: 'Peamouth', latin: 'Mylocheilus caurinus', family: 'carp & minnows', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 6 }, speed: 1.4, strength: 0.4, fatigue: 0.14, mass: 0.15,
    lengthCm: [15, 30], weightKg: [0.05, 0.4], awareness: 46, caution: 0.3, price: 3,
    baitLikes: ['worm', 'cricket'], lureTypes: { wacky: 1 }, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'northern_pikeminnow', name: 'Northern Pikeminnow', latin: 'Ptychocheilus oregonensis', family: 'carp & minnows', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.8, strength: 1, fatigue: 0.09, mass: 0.8,
    lengthCm: [25, 55], weightKg: [0.2, 2.5], awareness: 56, caution: 0.4, price: 10,
    baitLikes: ['minnow', 'worm'], lureTypes: { swim: 2, spinner: 1, crank: 1, spoon: 1, jighead: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  // ---- catfish ----
  {
    id: 'bullhead_catfish', name: 'Bullhead Catfish', latin: 'Ameiurus nebulosus', family: 'catfish', locations: ['pines'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1, strength: 0.8, fatigue: 0.11, mass: 0.5,
    lengthCm: [20, 40], weightKg: [0.2, 1.5], awareness: 34, caution: 0.3, price: 7,
    baitLikes: ['worm', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 }, timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], // at night
  },
  {
    id: 'channel_catfish', name: 'Channel Catfish', latin: 'Ictalurus punctatus', family: 'catfish', locations: ['pines', 'red'],
    habitat: { depthMin: 3, depthMax: 20 }, speed: 1.4, strength: 1.7, fatigue: 0.06, mass: 3.5,
    lengthCm: [40, 90], weightKg: [1, 12], awareness: 40, caution: 0.45, price: 51,
    baitLikes: ['worm', 'minnow'], lureTypes: { dropshot: 2, jighead: 1, wacky: 1 }, timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], // at night
  },
  // ---- cod ----
  {
    id: 'burbot', name: 'Burbot', latin: 'Lota lota', family: 'cod', locations: ['fog'],
    habitat: { depthMin: 14, depthMax: 24 }, speed: 1, strength: 1.1, fatigue: 0.08, mass: 1.4,
    lengthCm: [35, 75], weightKg: [0.4, 3.5], awareness: 34, caution: 0.35, price: 26,
    baitLikes: ['worm', 'minnow'], lureTypes: { spoon: 2, jighead: 1, dropshot: 1 }, timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], // at night
  },
  // ---- sturgeon ----
  {
    id: 'white_sturgeon', name: 'White Sturgeon', latin: 'Acipenser transmontanus', family: 'sturgeon', locations: ['red'],
    habitat: { depthMin: 10, depthMax: 20 }, speed: 1.6, strength: 2.6, fatigue: 0.03, mass: 16, jumps: 0.3,
    lengthCm: [80, 220], weightKg: [5, 100], awareness: 50, caution: 0.5, price: 264,
    baitLikes: ['worm', 'minnow'], lureTypes: { swim: 2, dropshot: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  // ---- mooneyes ----
  {
    id: 'mooneye', name: 'Mooneye', latin: 'Hiodon tergisus', family: 'mooneyes', locations: ['red'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.8, strength: 0.6, fatigue: 0.12, mass: 0.25, jumps: 0.3,
    lengthCm: [20, 35], weightKg: [0.1, 0.6], awareness: 54, caution: 0.35, price: 4,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 }, timeLikes: [5, 6, 7, 17, 18, 19, 20, 21], // at dawn and dusk
  },
  {
    id: 'goldeye', name: 'Goldeye', latin: 'Hiodon alosoides', family: 'mooneyes', locations: ['red'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.8, strength: 0.7, fatigue: 0.12, mass: 0.4, jumps: 0.3,
    lengthCm: [25, 40], weightKg: [0.2, 1], awareness: 54, caution: 0.35, price: 6,
    baitLikes: ['worm', 'cricket'], lureTypes: { spinner: 2, topwater: 1, wacky: 1 }, timeLikes: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6], // from dusk to dawn
  },
  // ---- herring & shad ----
  {
    id: 'threadfin_shad', name: 'Threadfin Shad', latin: 'Dorosoma petenense', family: 'herring & shad', locations: ['red'],
    habitat: { depthMin: 0.5, depthMax: 6 }, speed: 1.9, strength: 0.15, fatigue: 0.3, mass: 0.015,
    lengthCm: [5, 10], weightKg: [0.005, 0.03], awareness: 56, caution: 0.25, price: 3,
    baitLikes: ['worm'], lureTypes: {}, timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // by day
  },
  {
    id: 'pacific_herring', name: 'Pacific Herring', latin: 'Clupea pallasii', family: 'herring & shad', locations: [],
    habitat: { depthMin: 1, depthMax: 30 }, speed: 1.9, strength: 0.4, fatigue: 0.14, mass: 0.15,
    lengthCm: [15, 30], weightKg: [0.05, 0.4], awareness: 56, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: { jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'american_shad', name: 'American Shad', latin: 'Alosa sapidissima', family: 'herring & shad', locations: [],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 2.1, strength: 1.3, fatigue: 0.08, mass: 1.8, jumps: 0.6,
    lengthCm: [35, 60], weightKg: [1, 4], awareness: 60, caution: 0.45, price: 31,
    baitLikes: ['worm'], lureTypes: { spoon: 1, jighead: 1 }, timeLikes: [], // any hour
  },
  // ---- smelt ----
  {
    id: 'eulachon', name: 'Eulachon', latin: 'Thaleichthys pacificus', family: 'smelt', locations: [],
    habitat: { depthMin: 2, depthMax: 40 }, speed: 1.9, strength: 0.25, fatigue: 0.2, mass: 0.05,
    lengthCm: [15, 25], weightKg: [0.03, 0.08], awareness: 54, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: {}, timeLikes: [], // any hour
  },
  {
    id: 'capelin', name: 'Capelin', latin: 'Mallotus villosus', family: 'smelt', locations: [],
    habitat: { depthMin: 2, depthMax: 40 }, speed: 1.8, strength: 0.2, fatigue: 0.22, mass: 0.03,
    lengthCm: [12, 20], weightKg: [0.02, 0.05], awareness: 54, caution: 0.3, price: 3,
    baitLikes: ['worm'], lureTypes: {}, timeLikes: [], // any hour
  },
  // ---- greenlings ----
  {
    id: 'lingcod', name: 'Lingcod', latin: 'Ophiodon elongatus', family: 'greenlings', locations: [],
    habitat: { depthMin: 10, depthMax: 60 }, speed: 1.6, strength: 2.2, fatigue: 0.05, mass: 7,
    lengthCm: [50, 110], weightKg: [2, 25], awareness: 52, caution: 0.4, price: 86,
    baitLikes: ['minnow'], lureTypes: { jighead: 2, swim: 1, spoon: 1 }, timeLikes: [], // any hour
  },
  // ---- flatfish ----
  {
    id: 'greenland_halibut', name: 'Greenland Halibut', latin: 'Reinhardtius hippoglossoides', family: 'flatfish', locations: [],
    habitat: { depthMin: 30, depthMax: 90 }, speed: 1.3, strength: 1.8, fatigue: 0.06, mass: 4,
    lengthCm: [45, 90], weightKg: [1.5, 10], awareness: 44, caution: 0.45, price: 57,
    baitLikes: ['minnow'], lureTypes: { blade: 2, jighead: 1 }, timeLikes: [], // any hour
  },
  {
    id: 'pacific_halibut', name: 'Pacific Halibut', latin: 'Hippoglossus stenolepis', family: 'flatfish', locations: [],
    habitat: { depthMin: 20, depthMax: 90 }, speed: 1.4, strength: 2.6, fatigue: 0.03, mass: 15,
    lengthCm: [70, 180], weightKg: [5, 100], awareness: 48, caution: 0.5, price: 252,
    baitLikes: ['minnow'], lureTypes: { blade: 2, jighead: 1, swim: 1 }, timeLikes: [], // any hour
  },
  // ---- rockfish ----
  {
    id: 'yelloweye_rockfish', name: 'Yelloweye Rockfish', latin: 'Sebastes ruberrimus', family: 'rockfish', locations: [],
    habitat: { depthMin: 20, depthMax: 90 }, speed: 1.3, strength: 1.6, fatigue: 0.07, mass: 3,
    lengthCm: [35, 70], weightKg: [1, 8], awareness: 46, caution: 0.45, price: 46,
    baitLikes: ['minnow'], lureTypes: { spoon: 2, jighead: 1 }, timeLikes: [], // any hour
  }
];

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
    if (!strs(f.locations)) errs.push(p + 'locations');
    else for (var j = 0; j < f.locations.length; j++) {
      var loc = ref.locations[f.locations[j]];
      if (!loc) errs.push(p + 'unknown location ' + f.locations[j]);
      else if (f.habitat && f.habitat.depthMax * 4 > loc.maxDepth) errs.push(p + 'habitat deeper than ' + loc.id + ' maxDepth');
    }
    if (!f.habitat || !num(f.habitat.depthMin) || !num(f.habitat.depthMax) || f.habitat.depthMin < 0 || f.habitat.depthMin >= f.habitat.depthMax) errs.push(p + 'habitat');
    ['speed', 'strength', 'fatigue', 'mass', 'awareness', 'price'].forEach(function (k) { if (!num(f[k]) || f[k] <= 0) errs.push(p + k); });
    if (f.jumps !== undefined && !(num(f.jumps) && f.jumps >= 0 && f.jumps <= 1)) errs.push(p + 'jumps (0..1, optional; Phase 23)');
    if (!num(f.caution) || f.caution < 0 || f.caution > 1) errs.push(p + 'caution');
    if (!pair(f.lengthCm)) errs.push(p + 'lengthCm');
    if (!pair(f.weightKg)) errs.push(p + 'weightKg');
    else if (f.mass < f.weightKg[0] || f.mass > f.weightKg[1]) errs.push(p + 'mass outside weightKg');
    if (!strs(f.baitLikes) || !f.baitLikes.length) errs.push(p + 'baitLikes (every species takes some live bait)');
    if (!f.lureTypes || typeof f.lureTypes !== 'object') errs.push(p + 'lureTypes');
    else for (var k in f.lureTypes) if (types.indexOf(k) < 0 || [1, 2].indexOf(f.lureTypes[k]) < 0) errs.push(p + 'lureTypes.' + k + ' must be a lure type and 1 or 2');
    if (!f.timeLikes || !f.timeLikes.every(function (h) { return num(h) && h >= 0 && h < 24 && h % 1 === 0; })) errs.push(p + 'timeLikes');
    if (!ref.looks || !ref.looks[f.id]) errs.push(p + 'no anatomy spec in data/fishlooks.js (Phase 72: every species is painted)');
  }
  return errs;
};
