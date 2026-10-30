var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fish data (V5), clock windows (§0.8) and rarity weights.
// Units: habitat depths in metres (px = m × 4), speed in fight units (V4: D grows by speed × 0.03/s;
// the swimming AI moves at speed × 10 px/s), awareness in px,
// caution 0..1 (chance to back off after nibbling), mass in kg (typical weight;
// the rod's mass limit is checked against it, D4).
// jumps 0..1 (optional, Phase 23): how often it leaps while pulling near the boat (fight.js).
// lures (Phase 43): lure id -> 2 loves it (it notices it from 1.3× as far), 1 takes it; a lure
// not listed is ignored (the fish swims past it). Live baits still go by baitLikes.
// lineShy (optional, Phase 53): it sees any line but fluorocarbon (gear lineTypes seen) and,
// having circled the lure, turns away instead of nibbling.
G.data = G.data || {};

G.data.windows = [
  { id: 'owl_247', from: 2.5, to: 3 + 10 / 60, cue: 2 + 47 / 60 },  // 02:30-03:10, owl at 02:47
  { id: 'owl_333', from: 3 + 20 / 60, to: 4, cue: 3 + 33 / 60 }     // 03:20-04:00, owl at 03:33
];

G.data.rarity = { common: 62, uncommon: 26, rare: 10, legendary: 2 };

// The rosters (V5, Phase 14): per water 4 common, 3 uncommon, 1 rare, 1 legendary. Every
// hint (desc, hintRefs) is mechanically true: bait (baitLikes), hour (timeLikes), depth
// (habitat), a window, unease, a legendary spot (legend ×4) or the lamp (rare ×2.5).
G.data.fish = [
  // ---- Fogbound Lake (14.1): 4 common, 3 uncommon, 1 rare, 1 legendary ----
  {
    id: 'gloam_perch', name: 'Gloam Perch', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.4, strength: 0.6, fatigue: 0.12, mass: 0.35,
    lengthCm: [14, 26], weightKg: [0.15, 0.5], awareness: 46, caution: 0.35,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 7, lures: { spinner: 2, grub: 1, popper: 1 },
    desc: 'It had a human tooth. The others were normal.', hintRefs: [],
    look: { base: 'perch', wrongness: 1, parts: ['human_mouth'], palette: 'olive', seed: 101 }
  },
  {
    id: 'pier_roach', name: 'Pier Roach', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 0.5, depthMax: 6 }, speed: 1.2, strength: 0.5, fatigue: 0.14, mass: 0.25,
    lengthCm: [12, 22], weightKg: [0.1, 0.4], awareness: 40, caution: 0.3,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 6, lures: { grub: 1, popper: 1 },
    desc: 'Stays near the top, just under the boards. One had a seam down its middle, like a doll.', hintRefs: ['depth:shallow'],
    look: { base: 'trout', wrongness: 1, parts: ['mannequin'], palette: 'silver', seed: 111 }
  },
  {
    id: 'rust_bream', name: 'Rust Bream', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 4, depthMax: 14 }, speed: 1.1, strength: 0.7, fatigue: 0.1, mass: 0.6,
    lengthCm: [18, 32], weightKg: [0.3, 0.9], awareness: 42, caution: 0.4,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 8, lures: { grub: 2, jig: 1 },
    desc: 'Grain like an old floorboard along its side. It wants worms and nothing else.', hintRefs: ['bait:worm'],
    look: { base: 'carp', wrongness: 1, parts: ['wood_grain'], palette: 'bronze', seed: 112 }
  },
  {
    id: 'lamp_shiner', name: 'Lamp Shiner', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.6, strength: 0.4, fatigue: 0.16, mass: 0.15,
    lengthCm: [8, 15], weightKg: [0.08, 0.25], awareness: 50, caution: 0.3,
    baitLikes: ['cricket', 'worm'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 6, lures: { spinner: 1, popper: 1 },
    desc: 'It comes up after dark, as if something up here were lit for it.', hintRefs: ['hour:night'],
    look: { base: 'perch', wrongness: 1, parts: ['static'], palette: 'pale', seed: 113 }
  },
  {
    id: 'mist_carp', name: 'Mist Carp', rarity: 'uncommon', locations: ['fog'],
    habitat: { depthMin: 6, depthMax: 20 }, speed: 1.0, strength: 1.0, fatigue: 0.07, mass: 2.2,
    lengthCm: [40, 70], weightKg: [1.2, 3.0], awareness: 38, caution: 0.5,
    baitLikes: ['worm'], timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], windows: [], uneaseMin: 0, lineShy: true, price: 22, lures: { grub: 1, jig: 1 },
    desc: 'Heavier in the grey hours, when the fog sits low on the water.', hintRefs: ['hour:grey'],
    look: { base: 'carp', wrongness: 1, parts: ['zipper'], palette: 'bronze', seed: 202 }
  },
  // Needs high unease: only after sitting still a long while at night.
  {
    id: 'hollow_pike', name: 'Hollow Pike', rarity: 'uncommon', locations: ['fog'],
    habitat: { depthMin: 4, depthMax: 16 }, speed: 2.2, strength: 1.6, fatigue: 0.08, mass: 2.8, jumps: 0.6,
    lengthCm: [55, 95], weightKg: [1.6, 4.0], awareness: 70, caution: 0.6,
    baitLikes: ['minnow', 'worm'], timeLikes: [22, 23, 0, 1, 2, 3, 4], windows: [], uneaseMin: 0.6, price: 60, lures: { spinner: 2, plug: 2, popper: 1 },
    desc: 'It only comes once you have waited. It knows you waited.', hintRefs: ['unease'],
    look: { base: 'pike', wrongness: 3, parts: ['vertebrae', 'human_eyes', 'static'], palette: 'silver', seed: 404 }
  },
  // Heavier than the starter rod (3 kg): the heavy-fish hints show for it until a better rod (D4).
  {
    id: 'wreck_catfish', name: 'Wreck Catfish', rarity: 'uncommon', locations: ['fog'],
    habitat: { depthMin: 10, depthMax: 22 }, speed: 0.9, strength: 1.4, fatigue: 0.06, mass: 3.6,
    lengthCm: [50, 85], weightKg: [2.4, 5.0], awareness: 36, caution: 0.5,
    baitLikes: ['worm', 'minnow'], timeLikes: [], windows: [], uneaseMin: 0, price: 26, lures: { grub: 1, jig: 2 },
    desc: 'Down in the deep water, dripping something dark and warm. The cane rod could never have held it.', hintRefs: ['depth:deep'],
    look: { base: 'catfish', wrongness: 1, parts: ['coffee_drip'], palette: 'ink', seed: 114 }
  },
  // Window-only: bites only on a cast latched in the 02:47 window.
  {
    id: 'owl_eel', name: 'Two-Forty-Seven', rarity: 'rare', locations: ['fog'],
    habitat: { depthMin: 12, depthMax: 24 }, speed: 1.6, strength: 1.3, fatigue: 0.09, mass: 1.4,
    lengthCm: [60, 110], weightKg: [0.8, 2.2], awareness: 60, caution: 0.55,
    baitLikes: ['minnow', 'worm'], timeLikes: [], windows: ['owl_247'], uneaseMin: 0, price: 90, lures: { jig: 1, grub: 1 },
    desc: 'Its eyes were already open when the owl called.', hintRefs: ['window:owl_247'],
    look: { base: 'eel', wrongness: 2, parts: ['owl_eyes', 'tail_face'], palette: 'ink', seed: 303 }
  },
  // Legendary of the cold hole (the dog barks there). Needs a rod for 9 kg.
  {
    id: 'sleeper', name: 'The Sleeper', rarity: 'legendary', locations: ['fog'],
    habitat: { depthMin: 18, depthMax: 24 }, speed: 1.8, strength: 2.2, fatigue: 0.05, mass: 9, jumps: 0.4,
    lengthCm: [120, 180], weightKg: [6, 12], awareness: 80, caution: 0.7,
    baitLikes: ['minnow', 'unlabelled'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0.3, price: 30, lures: { plug: 1, jig: 1 },
    desc: 'It sleeps with its eyes open, over the cold hole past the wreck. They are not fish eyes.', hintRefs: ['spot:cold_hole', 'depth:deep'],
    look: { base: 'gar', wrongness: 3, parts: ['human_eyes', 'fused_twins', 'static'], palette: 'silver', seed: 115 }
  },
  // ---- Blackwater Creek (14.2) ----
  {
    id: 'snag_trout', name: 'Snag Trout', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 2, depthMax: 8 }, speed: 1.5, strength: 0.7, fatigue: 0.12, mass: 0.5,
    lengthCm: [22, 36], weightKg: [0.3, 0.8], awareness: 44, caution: 0.4,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 11, lures: { spinner: 2, popper: 1, grub: 1, jig: 1, plug: 1 },
    desc: 'Holds in the slack water behind drowned branches. Bark grows on one fin.', hintRefs: ['depth:shallow'],
    look: { base: 'trout', wrongness: 1, parts: ['wood_grain'], palette: 'olive', seed: 121 }
  },
  {
    id: 'cabin_dace', name: 'Cabin Dace', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 6 }, speed: 1.7, strength: 0.5, fatigue: 0.15, mass: 0.2,
    lengthCm: [10, 18], weightKg: [0.1, 0.3], awareness: 48, caution: 0.3,
    baitLikes: ['cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 8, lures: { popper: 2, grub: 1 },
    desc: 'It watched the cabin window from the water. Only crickets would tempt it away.', hintRefs: ['bait:cricket'],
    look: { base: 'perch', wrongness: 1, parts: ['human_eyes'], palette: 'silver', seed: 122 }
  },
  {
    id: 'blackwater_chub', name: 'Blackwater Chub', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 4, depthMax: 12 }, speed: 1.0, strength: 0.8, fatigue: 0.1, mass: 0.9,
    lengthCm: [25, 40], weightKg: [0.5, 1.3], awareness: 40, caution: 0.45,
    baitLikes: ['worm'], timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], windows: [], uneaseMin: 0, price: 12, lures: { grub: 1, spinner: 1, plug: 1, popper: 1, jig: 1 },
    desc: 'Raw along one flank, as if it had been opened and closed again. Fatter by daylight.', hintRefs: ['hour:grey'],
    look: { base: 'carp', wrongness: 1, parts: ['muscle'], palette: 'ink', seed: 123 }
  },
  {
    id: 'kindling_darter', name: 'Kindling Darter', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 5 }, speed: 1.9, strength: 0.4, fatigue: 0.18, mass: 0.1,
    lengthCm: [6, 12], weightKg: [0.05, 0.15], awareness: 52, caution: 0.3,
    baitLikes: ['cricket', 'worm'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 9, lures: { grub: 1 },
    desc: 'Bright as a cinder in the dark water. It only rises at night.', hintRefs: ['hour:night'],
    look: { base: 'trout', wrongness: 1, parts: ['coffee_drip'], palette: 'pale', seed: 124 }
  },
  {
    id: 'zipper_pike', name: 'Zipped Pike', rarity: 'uncommon', locations: ['creek'],
    habitat: { depthMin: 6, depthMax: 14 }, speed: 2.0, strength: 1.5, fatigue: 0.08, mass: 3.2, jumps: 0.6,
    lengthCm: [60, 90], weightKg: [2.0, 4.5], awareness: 62, caution: 0.55,
    baitLikes: ['minnow'], timeLikes: [], windows: [], uneaseMin: 0, price: 30, lures: { plug: 2, spinner: 1 },
    desc: 'The zipper runs from gill to tail. It was closed when I caught it. Minnows, only minnows.', hintRefs: ['bait:minnow'],
    look: { base: 'pike', wrongness: 2, parts: ['zipper', 'human_mouth'], palette: 'silver', seed: 125 }
  },
  {
    id: 'lantern_eel', name: 'Lantern Eel', rarity: 'uncommon', locations: ['creek'],
    habitat: { depthMin: 8, depthMax: 16 }, speed: 1.4, strength: 1.1, fatigue: 0.09, mass: 1.1,
    lengthCm: [50, 80], weightKg: [0.7, 1.6], awareness: 54, caution: 0.5,
    baitLikes: ['worm', 'minnow'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 28, lures: { jig: 1, grub: 2 },
    desc: 'The growths glow faintly, deep down, at night. By day there is nothing there.', hintRefs: ['hour:night', 'depth:deep'],
    look: { base: 'eel', wrongness: 1, parts: ['growths'], palette: 'pale', seed: 126 }
  },
  {
    id: 'porch_catfish', name: 'Porch Catfish', rarity: 'uncommon', locations: ['creek'],
    habitat: { depthMin: 10, depthMax: 16 }, speed: 0.9, strength: 1.3, fatigue: 0.06, mass: 2.6,
    lengthCm: [45, 75], weightKg: [1.6, 3.8], awareness: 34, caution: 0.5,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 32, lures: { jig: 2, grub: 2 },
    desc: 'A strip of tape trails from its mouth: someone laughing on a porch. It lies on the deepest bottom.', hintRefs: ['depth:deep'],
    look: { base: 'catfish', wrongness: 2, parts: ['mannequin', 'vhs_ribbon'], palette: 'bronze', seed: 127 }
  },
  {
    id: 'ash_trout', name: 'Ash Trout', rarity: 'rare', locations: ['creek'],
    habitat: { depthMin: 4, depthMax: 12 }, speed: 1.8, strength: 1.3, fatigue: 0.08, mass: 1.6, jumps: 0.4,
    lengthCm: [40, 65], weightKg: [1.0, 2.4], awareness: 66, caution: 0.6,
    baitLikes: ['minnow', 'worm'], timeLikes: [1, 2, 3, 4], windows: [], uneaseMin: 0.4, lineShy: true, price: 85, lures: { spinner: 1, popper: 2, plug: 1, grub: 1, jig: 1 },
    desc: 'Two tails, and it swims with both. It comes after one in the morning, once the creek has gone quiet around you.', hintRefs: ['unease', 'hour:night'],
    look: { base: 'trout', wrongness: 2, parts: ['owl_eyes', 'second_tail'], palette: 'ink', seed: 128 }
  },
  // Legendary of the black pool. Needs a rod for 8 kg.
  {
    id: 'grandmother', name: 'Grandmother', rarity: 'legendary', locations: ['creek'],
    habitat: { depthMin: 12, depthMax: 16 }, speed: 1.2, strength: 2.0, fatigue: 0.04, mass: 8, jumps: 0.3,
    lengthCm: [110, 160], weightKg: [5.5, 11], awareness: 70, caution: 0.7,
    baitLikes: ['minnow', 'unlabelled'], timeLikes: [], windows: [], uneaseMin: 0, price: 32, lures: { jig: 1 },
    desc: 'Older than the cabins. Bark grows on her back. She lives in the black pool between them.', hintRefs: ['spot:black_pool', 'depth:deep'],
    look: { base: 'gar', wrongness: 3, parts: ['wood_grain', 'growths', 'human_eyes'], palette: 'bronze', seed: 129 }
  },
  // ---- The Pines (14.3) ----
  {
    id: 'diner_perch', name: 'Diner Perch', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.4, strength: 0.6, fatigue: 0.12, mass: 0.4,
    lengthCm: [15, 28], weightKg: [0.2, 0.6], awareness: 46, caution: 0.35,
    baitLikes: ['worm', 'cricket'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 23, lures: { spinner: 2, grub: 1, plug: 1 },
    desc: 'Smells of coffee, black and too strong. It bites while the diner is open: all night.', hintRefs: ['hour:night'],
    look: { base: 'perch', wrongness: 1, parts: ['coffee_drip'], palette: 'bronze', seed: 131 }
  },
  {
    id: 'keyback_bass', name: 'Keyback Bass', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 3, depthMax: 12 }, speed: 1.3, strength: 0.8, fatigue: 0.1, mass: 0.8,
    lengthCm: [24, 40], weightKg: [0.4, 1.2], awareness: 44, caution: 0.4,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 25, lures: { grub: 2, plug: 2, popper: 1, jig: 1 },
    desc: 'Typewriter keys along its spine. They spell nothing, the same nothing every time. Worms.', hintRefs: ['bait:worm'],
    look: { base: 'perch', wrongness: 1, parts: ['vertebrae'], palette: 'ink', seed: 132 }
  },
  {
    id: 'amber_shiner', name: 'Amber Shiner', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 1, depthMax: 6 }, speed: 1.8, strength: 0.4, fatigue: 0.16, mass: 0.2,
    lengthCm: [9, 16], weightKg: [0.1, 0.3], awareness: 50, caution: 0.3,
    baitLikes: ['cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 20, lures: { popper: 1, spinner: 1 },
    desc: 'It flickers like the signal over the road. Crickets bring it up.', hintRefs: ['bait:cricket'],
    look: { base: 'trout', wrongness: 1, parts: ['static'], palette: 'bronze', seed: 133 }
  },
  {
    id: 'leaf_carp', name: 'Leaf Carp', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 5, depthMax: 16 }, speed: 1.0, strength: 0.9, fatigue: 0.08, mass: 1.0,
    lengthCm: [28, 44], weightKg: [0.6, 1.5], awareness: 38, caution: 0.45,
    baitLikes: ['worm'], timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], windows: [], uneaseMin: 0, price: 27, lures: { grub: 1 },
    desc: 'The colour of the woods in October. It feeds in the grey hours and sleeps at night.', hintRefs: ['hour:grey'],
    look: { base: 'carp', wrongness: 1, parts: ['wood_grain'], palette: 'olive', seed: 134 }
  },
  {
    id: 'neon_koi', name: 'Neon Koi', rarity: 'uncommon', locations: ['pines'],
    habitat: { depthMin: 2, depthMax: 10 }, speed: 1.3, strength: 1.0, fatigue: 0.08, mass: 1.8,
    lengthCm: [35, 55], weightKg: [1.0, 2.6], awareness: 48, caution: 0.5,
    baitLikes: ['cricket', 'minnow'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, lineShy: true, price: 45, lures: { popper: 2 },
    desc: 'Red as the diner sign. It opens its mouth as if to order. Only after dark.', hintRefs: ['hour:night'],
    look: { base: 'koi', wrongness: 1, parts: ['human_mouth'], palette: 'koi', seed: 135 }
  },
  {
    id: 'lot_gar', name: 'Parking Lot Gar', rarity: 'uncommon', locations: ['pines'],
    habitat: { depthMin: 8, depthMax: 20 }, speed: 1.6, strength: 1.6, fatigue: 0.07, mass: 3.8,
    lengthCm: [70, 110], weightKg: [2.4, 5.2], awareness: 56, caution: 0.55,
    baitLikes: ['minnow', 'worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 48, lures: { plug: 1, spinner: 1 },
    desc: 'Very still, deep down, like a car waiting under the lamps for someone who never comes.', hintRefs: ['depth:deep'],
    look: { base: 'gar', wrongness: 2, parts: ['mannequin', 'zipper'], palette: 'silver', seed: 136 }
  },
  {
    id: 'signal_pike', name: 'Signal Pike', rarity: 'uncommon', locations: ['pines'],
    habitat: { depthMin: 10, depthMax: 22 }, speed: 2.1, strength: 1.7, fatigue: 0.08, mass: 4.2, jumps: 0.6,
    lengthCm: [70, 105], weightKg: [2.8, 5.6], awareness: 64, caution: 0.6,
    baitLikes: ['minnow'], timeLikes: [], windows: [], uneaseMin: 0, price: 50, lures: { plug: 2, spinner: 2, jig: 1 },
    desc: 'It strikes on the yellow. Bring minnows, and watch the light: when it hurries, so does the pike.', hintRefs: ['bait:minnow'],
    look: { base: 'pike', wrongness: 2, parts: ['owl_eyes', 'static'], palette: 'olive', seed: 137 }
  },
  // Window-only (03:33) and deep. Catching it is half of the Red Room's key (loc_red.js need).
  {
    id: 'three_thirty_three', name: 'Three-Thirty-Three', rarity: 'rare', locations: ['pines'],
    habitat: { depthMin: 20, depthMax: 28 }, speed: 1.5, strength: 1.3, fatigue: 0.09, mass: 2.0,
    lengthCm: [70, 120], weightKg: [1.2, 2.8], awareness: 60, caution: 0.5,
    baitLikes: ['worm', 'minnow'], timeLikes: [], windows: ['owl_333'], uneaseMin: 0, price: 95, lures: { jig: 2 },
    desc: 'It came up from the deepest water when the owl called the second time. The red room remembers who caught it.', hintRefs: ['window:owl_333', 'depth:deep'],
    look: { base: 'eel', wrongness: 2, parts: ['owl_eyes', 'human_eyes'], palette: 'ink', seed: 138 }
  },
  // Legendary of the drowned lane. Needs the longest rod (14 kg).
  {
    id: 'feathered_muskie', name: 'Feathered Muskie', rarity: 'legendary', locations: ['pines'],
    habitat: { depthMin: 16, depthMax: 28 }, speed: 2.0, strength: 2.4, fatigue: 0.05, mass: 14, jumps: 0.8,
    lengthCm: [130, 190], weightKg: [9, 18], awareness: 78, caution: 0.7,
    baitLikes: ['minnow', 'unlabelled'], timeLikes: [], windows: [], uneaseMin: 0, price: 35, lures: { plug: 1, popper: 1 },
    desc: 'The owl watches the water for it. Feathers where the scales should be. It keeps to the lane where the road goes under.', hintRefs: ['spot:lane_deep', 'bait:unlabelled'],
    look: { base: 'pike', wrongness: 3, parts: ['owl_eyes', 'growths', 'tail_face'], palette: 'ink', seed: 139 }
  },
  // ---- Red Room Reservoir (14.4) ----
  {
    id: 'velvet_perch', name: 'Velvet Perch', rarity: 'common', locations: ['red'],
    habitat: { depthMin: 1, depthMax: 8 }, speed: 1.3, strength: 0.7, fatigue: 0.11, mass: 0.5,
    lengthCm: [16, 28], weightKg: [0.25, 0.7], awareness: 44, caution: 0.35,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 30, lures: { spinner: 1, grub: 1 },
    desc: 'Soft as the curtains, and it keeps near the top. Seams at every joint, like a doll\'s.', hintRefs: ['depth:shallow'],
    look: { base: 'perch', wrongness: 1, parts: ['mannequin'], palette: 'koi', seed: 141 }
  },
  {
    id: 'zigzag_eel', name: 'Zigzag Eel', rarity: 'common', locations: ['red'],
    habitat: { depthMin: 2, depthMax: 10 }, speed: 1.5, strength: 0.8, fatigue: 0.1, mass: 0.7,
    lengthCm: [40, 60], weightKg: [0.4, 1.0], awareness: 48, caution: 0.4,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 32, lures: { grub: 2, plug: 1 },
    desc: 'Its stripes do not line up, and neither does the floor. It only ever wanted worms.', hintRefs: ['bait:worm'],
    look: { base: 'eel', wrongness: 1, parts: ['static'], palette: 'silver', seed: 142 }
  },
  {
    id: 'quiet_carp', name: 'Quiet Carp', rarity: 'common', locations: ['red'],
    habitat: { depthMin: 4, depthMax: 14 }, speed: 1.0, strength: 0.9, fatigue: 0.08, mass: 1.2,
    lengthCm: [30, 46], weightKg: [0.7, 1.7], awareness: 36, caution: 0.45,
    baitLikes: ['worm', 'cricket'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 34, lures: { grub: 1 },
    desc: 'It watched me with someone else\'s eyes. It is calmer at night, and easier to catch.', hintRefs: ['hour:night'],
    look: { base: 'carp', wrongness: 1, parts: ['human_eyes'], palette: 'bronze', seed: 143 }
  },
  {
    id: 'backwards_trout', name: 'Backwards Trout', rarity: 'common', locations: ['red'],
    habitat: { depthMin: 1, depthMax: 10 }, speed: 1.6, strength: 0.6, fatigue: 0.13, mass: 0.6,
    lengthCm: [20, 34], weightKg: [0.3, 0.9], awareness: 50, caution: 0.35,
    baitLikes: ['cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 30, lures: { popper: 2, spinner: 1 },
    desc: 'It has a face on its tail and swims toward it. Crickets.', hintRefs: ['bait:cricket'],
    look: { base: 'trout', wrongness: 1, parts: ['tail_face'], palette: 'pale', seed: 144 }
  },
  {
    id: 'lamp_koi', name: 'Lamp Koi', rarity: 'uncommon', locations: ['red'],
    habitat: { depthMin: 3, depthMax: 12 }, speed: 1.3, strength: 1.1, fatigue: 0.08, mass: 2.2,
    lengthCm: [36, 58], weightKg: [1.2, 3.2], awareness: 48, caution: 0.5,
    baitLikes: ['minnow', 'worm'], timeLikes: [], windows: [], uneaseMin: 0, lineShy: true, price: 70, lures: { popper: 1, grub: 1, plug: 1 },
    desc: 'A mouth where no mouth should be, and lumps under the skin. Minnows draw it.', hintRefs: ['bait:minnow'],
    look: { base: 'koi', wrongness: 2, parts: ['human_mouth', 'growths'], palette: 'koi', seed: 145 }
  },
  {
    id: 'statue_catfish', name: 'Statue Catfish', rarity: 'uncommon', locations: ['red'],
    habitat: { depthMin: 10, depthMax: 20 }, speed: 0.9, strength: 1.5, fatigue: 0.06, mass: 4.5,
    lengthCm: [55, 90], weightKg: [3.0, 6.0], awareness: 34, caution: 0.5,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 75, lures: { jig: 1 },
    desc: 'Joints like a mannequin and keys down its back. It lies on the bottom, as still as stone.', hintRefs: ['depth:deep'],
    look: { base: 'catfish', wrongness: 2, parts: ['mannequin', 'vertebrae'], palette: 'silver', seed: 146 }
  },
  {
    id: 'pour_gar', name: 'Pour Gar', rarity: 'uncommon', locations: ['red'],
    habitat: { depthMin: 6, depthMax: 16 }, speed: 1.7, strength: 1.4, fatigue: 0.07, mass: 3.0,
    lengthCm: [60, 95], weightKg: [1.8, 4.2], awareness: 58, caution: 0.55,
    baitLikes: ['minnow', 'worm'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 72, lures: { plug: 2, spinner: 1 },
    desc: 'It leaves a dark line in the water, like something poured slowly. Only at night.', hintRefs: ['hour:night'],
    look: { base: 'gar', wrongness: 2, parts: ['coffee_drip', 'zipper'], palette: 'ink', seed: 147 }
  },
  {
    id: 'speaks_backwards', name: 'Tiaw', rarity: 'rare', locations: ['red'],
    habitat: { depthMin: 8, depthMax: 18 }, speed: 1.6, strength: 1.4, fatigue: 0.08, mass: 2.4,
    lengthCm: [50, 80], weightKg: [1.4, 3.4], awareness: 62, caution: 0.6,
    baitLikes: ['unlabelled', 'minnow'], timeLikes: [], windows: [], uneaseMin: 0.5, price: 100, lures: { jig: 1 },
    desc: '.tiaw :dias ti kniht I .devom htuom stI It comes when you have stayed long, to the jar with no label, and most of all under the lamp.', hintRefs: ['unease', 'bait:unlabelled', 'mover:lamp'],
    look: { base: 'eel', wrongness: 2, parts: ['human_mouth', 'vhs_ribbon'], palette: 'koi', seed: 148 }
  },
  // Legendary, window-only (02:47), over the floor drain. Needs the longest rod (16 kg).
  {
    id: 'the_dreamer', name: 'The Dreamer', rarity: 'legendary', locations: ['red'],
    habitat: { depthMin: 14, depthMax: 20 }, speed: 1.4, strength: 2.3, fatigue: 0.04, mass: 16, jumps: 0.2,
    lengthCm: [140, 200], weightKg: [10, 20], awareness: 72, caution: 0.7,
    baitLikes: ['unlabelled', 'minnow'], timeLikes: [], windows: ['owl_247'], uneaseMin: 0, price: 40, lures: {},
    desc: 'Two of it, joined at the side, dreaming the same dream. It wakes over the drain in the floor when the owl calls at 02:47.', hintRefs: ['spot:floor_drain', 'window:owl_247'],
    look: { base: 'koi', wrongness: 3, parts: ['fused_twins', 'human_eyes', 'static'], palette: 'koi', seed: 149 }
  },

  // ---- Phase 44: the small fish, 3-10 cm and 5-60 g, two or three to a water. Appended so
  // the species above keep their indices. Cheap, quick to land, and mostly in the shallows,
  // so a cast near the top finds them; the Ultralight Wand is their rod. Not counted in the
  // V5 roster (G.data.isSmall); the swimmer draws them to scale with a plain painter.
  {
    id: 'dim_fry', name: 'Dim Fry', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 0.5, depthMax: 3.5 }, speed: 1.8, strength: 0.2, fatigue: 0.3, mass: 0.01,
    lengthCm: [3, 6], weightKg: [0.005, 0.02], awareness: 54, caution: 0.25,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 4, lures: { spinner: 1, grub: 1 },
    desc: 'A cloud of them just under the boat. Each one blinks out for a moment, like a bad channel.', hintRefs: ['depth:shallow'],
    look: { base: 'perch', wrongness: 1, parts: ['static'], palette: 'pale', seed: 501 }
  },
  {
    id: 'reed_stickleback', name: 'Reed Stickleback', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 4 }, speed: 1.6, strength: 0.25, fatigue: 0.28, mass: 0.015,
    lengthCm: [4, 8], weightKg: [0.008, 0.03], awareness: 50, caution: 0.3,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 5, lures: { grub: 1 },
    desc: 'Spines along its back, and one more than it should have. A worm, and nothing else.', hintRefs: ['bait:worm'],
    look: { base: 'trout', wrongness: 1, parts: ['vertebrae'], palette: 'olive', seed: 502 }
  },
  {
    id: 'wick_minnow', name: 'Wick Minnow', rarity: 'common', locations: ['fog'],
    habitat: { depthMin: 1, depthMax: 4.5 }, speed: 1.9, strength: 0.25, fatigue: 0.26, mass: 0.025,
    lengthCm: [5, 9], weightKg: [0.01, 0.05], awareness: 56, caution: 0.3,
    baitLikes: ['cricket', 'worm'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 6, lures: { popper: 1, spinner: 1 },
    desc: 'It comes up after dark toward any light at all, even a match.', hintRefs: ['hour:night'],
    look: { base: 'trout', wrongness: 1, parts: ['human_eyes'], palette: 'pale', seed: 503 }
  },
  {
    id: 'gravel_darter', name: 'Gravel Darter', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 1, depthMax: 4 }, speed: 2.0, strength: 0.25, fatigue: 0.28, mass: 0.015,
    lengthCm: [4, 8], weightKg: [0.006, 0.03], awareness: 48, caution: 0.3,
    baitLikes: ['worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 5, lures: { grub: 2, jig: 1 },
    desc: 'It lies flat on the stones of the shallow run and hops from one to the next. A worm, nothing else.', hintRefs: ['bait:worm'],
    look: { base: 'perch', wrongness: 1, parts: ['wood_grain'], palette: 'bronze', seed: 504 }
  },
  {
    id: 'penny_dace', name: 'Penny Dace', rarity: 'common', locations: ['creek'],
    habitat: { depthMin: 0.5, depthMax: 3.5 }, speed: 1.9, strength: 0.3, fatigue: 0.25, mass: 0.03,
    lengthCm: [5, 10], weightKg: [0.01, 0.06], awareness: 52, caution: 0.3,
    baitLikes: ['cricket', 'worm'], timeLikes: [], windows: [], uneaseMin: 0, price: 6, lures: { spinner: 1, popper: 1 },
    desc: 'Flat and bright as a coin. They hold in the shallow run where the water is quick.', hintRefs: ['depth:shallow'],
    look: { base: 'trout', wrongness: 1, parts: ['mannequin'], palette: 'silver', seed: 505 }
  },
  {
    id: 'napkin_bluegill', name: 'Napkin Bluegill', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 1, depthMax: 4.5 }, speed: 1.6, strength: 0.3, fatigue: 0.25, mass: 0.035,
    lengthCm: [5, 10], weightKg: [0.015, 0.06], awareness: 50, caution: 0.3,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 6, lures: { grub: 1, popper: 1, spinner: 1 },
    desc: 'Small enough to fold into a napkin. It took whatever I offered it.', hintRefs: [],
    look: { base: 'carp', wrongness: 1, parts: ['zipper'], palette: 'olive', seed: 506 }
  },
  {
    id: 'jukebox_shiner', name: 'Jukebox Shiner', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 0.5, depthMax: 4 }, speed: 1.9, strength: 0.2, fatigue: 0.3, mass: 0.012,
    lengthCm: [4, 8], weightKg: [0.006, 0.025], awareness: 54, caution: 0.25,
    baitLikes: ['cricket'], timeLikes: [20, 21, 22, 23, 0, 1, 2, 3, 4, 5], windows: [], uneaseMin: 0, price: 6, lures: { popper: 1 },
    desc: 'They rise under the pier lights after dark, all turning at once, in time with something.', hintRefs: ['hour:night'],
    look: { base: 'perch', wrongness: 1, parts: ['static'], palette: 'pale', seed: 507 }
  },
  {
    id: 'sugar_minnow', name: 'Sugar Minnow', rarity: 'common', locations: ['pines'],
    habitat: { depthMin: 1, depthMax: 4 }, speed: 1.7, strength: 0.2, fatigue: 0.3, mass: 0.008,
    lengthCm: [3, 6], weightKg: [0.005, 0.015], awareness: 50, caution: 0.3,
    baitLikes: ['worm'], timeLikes: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], windows: [], uneaseMin: 0, price: 5, lures: { grub: 1 },
    desc: 'Grains of something sweet in its scales, like a diner counter. Only in the grey hours.', hintRefs: ['hour:grey'],
    look: { base: 'trout', wrongness: 1, parts: ['coffee_drip'], palette: 'silver', seed: 508 }
  },
  {
    id: 'curtain_fry', name: 'Curtain Fry', rarity: 'common', locations: ['red'],
    habitat: { depthMin: 0.5, depthMax: 4 }, speed: 1.8, strength: 0.2, fatigue: 0.3, mass: 0.01,
    lengthCm: [3, 7], weightKg: [0.005, 0.02], awareness: 52, caution: 0.25,
    baitLikes: ['worm', 'cricket'], timeLikes: [], windows: [], uneaseMin: 0, price: 5, lures: { grub: 1, spinner: 1 },
    desc: 'Red as the curtains. They gather in the shallows where the floor meets the water.', hintRefs: ['depth:shallow'],
    look: { base: 'perch', wrongness: 1, parts: ['static'], palette: 'koi', seed: 509 }
  },
  // The small strange one: only once the room has gone strange.
  {
    id: 'thimble', name: 'The Thimble', rarity: 'uncommon', locations: ['red'],
    habitat: { depthMin: 2, depthMax: 5 }, speed: 1.5, strength: 0.25, fatigue: 0.25, mass: 0.008,
    lengthCm: [3, 5], weightKg: [0.005, 0.012], awareness: 46, caution: 0.4,
    baitLikes: ['cricket', 'unlabelled'], timeLikes: [], windows: [], uneaseMin: 0.3, price: 6, lures: { jig: 1 },
    desc: 'Small enough to sit on a fingertip. It looked up at me the way a person does. It only came once the room had gone strange.', hintRefs: ['unease'],
    look: { base: 'perch', wrongness: 2, parts: ['human_eyes', 'human_mouth'], palette: 'ink', seed: 510 }
  }
];

// Phase 44: a small fish is one whose longest is SMALL_CM or less. Not counted in the V5 roster.
G.data.SMALL_CM = 10;
G.data.isSmall = function (f) { return f.lengthCm[1] <= G.data.SMALL_CM; };

// Schema check (V5). Returns a list of problems; empty means valid.
// ref: {locations, windows, bases, parts} to check cross-references against.
// tools/balance.js --validate runs this along with its other checks.
G.data.validateFish = function (fish, ref) {
  var errs = [], seen = {}, rar = G.data.rarity;
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function pair(v) { return v && v.length === 2 && num(v[0]) && num(v[1]) && v[0] <= v[1]; }
  function strs(v) { if (!v || typeof v.length !== 'number') return false; for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string') return false; return true; }
  for (var i = 0; i < fish.length; i++) {
    var f = fish[i], p = (f && f.id ? f.id : '#' + i) + ': ';
    if (!f || typeof f.id !== 'string') { errs.push(p + 'id'); continue; }
    if (seen[f.id]) errs.push(p + 'duplicate id');
    seen[f.id] = true;
    if (typeof f.name !== 'string' || !f.name) errs.push(p + 'name');
    if (!rar[f.rarity]) errs.push(p + 'rarity "' + f.rarity + '"');
    if (!strs(f.locations) || !f.locations.length) errs.push(p + 'locations');
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
    if (!strs(f.baitLikes)) errs.push(p + 'baitLikes');
    if (!f.timeLikes || !f.timeLikes.every(function (h) { return num(h) && h >= 0 && h < 24 && h % 1 === 0; })) errs.push(p + 'timeLikes');
    if (!strs(f.windows)) errs.push(p + 'windows');
    else f.windows.forEach(function (w) { if (!ref.windows.some(function (x) { return x.id === w; })) errs.push(p + 'unknown window ' + w); });
    if (!num(f.uneaseMin) || f.uneaseMin < 0 || f.uneaseMin > 1) errs.push(p + 'uneaseMin');
    if (typeof f.desc !== 'string' || !f.desc) errs.push(p + 'desc');
    if (!strs(f.hintRefs)) errs.push(p + 'hintRefs');
    var L = f.look;
    if (!L) { errs.push(p + 'look'); continue; }
    if (ref.bases.indexOf(L.base) < 0) errs.push(p + 'look.base "' + L.base + '"');
    if (!(L.wrongness >= 0 && L.wrongness <= 3 && L.wrongness % 1 === 0)) errs.push(p + 'look.wrongness');
    if (!strs(L.parts)) errs.push(p + 'look.parts');
    else {
      L.parts.forEach(function (pt) { if (ref.parts.indexOf(pt) < 0) errs.push(p + 'unknown part ' + pt); });
      // V5: wrongness 0 has no parts, 1 has one, 2 and 3 have at least two.
      var need = [0, 1, 2, 2][L.wrongness];
      if (L.wrongness === 0 ? L.parts.length !== 0 : L.parts.length < need) errs.push(p + 'parts do not match wrongness ' + L.wrongness);
    }
    if (typeof L.palette !== 'string') errs.push(p + 'look.palette');
    if (!num(L.seed)) errs.push(p + 'look.seed');
  }
  return errs;
};
