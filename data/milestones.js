var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Milestones (Phase 94.1, PLAN_PLAYABILITY.md): quiet goals judged from what the save already
// counts, each paid once in coins (js/sim/milestones.js judges them; save.milestones marks the
// ones reached). Pure data.
//   id      the save's key
//   name    as the journal's MILESTONES page and the HUD's line say it
//   test    what js/sim/milestones.js measures (one of its TESTS); arg: the test's argument
//   reward  coins, 25 for the small ones up to 500 for a whole collection
//   icon    the mark drawn beside it: fish, release, size, water, book, trophy, dog, hole, pond, cabin, rod
// The waters' rows ("every species in a water") are made below from the waters' own data, so a
// new water gets one.
G.data = G.data || {};
G.data.milestones = [
  { id: 'first_fish', name: 'The first fish', test: 'caught', arg: 1, reward: 25, icon: 'fish' },
  { id: 'fish_50', name: 'Fifty fish', test: 'caught', arg: 50, reward: 100, icon: 'fish' },
  { id: 'first_release', name: 'Let one go', test: 'released', arg: 1, reward: 25, icon: 'release' },
  { id: 'every_size', name: 'Every size of one fish', test: 'allSizesOne', reward: 100, icon: 'size' },
  { id: 'every_species', name: 'Every fish in the book', test: 'species', reward: 500, icon: 'book' },
  { id: 'release_every', name: 'One of each, let go', test: 'releasedSpecies', reward: 500, icon: 'release' },
  { id: 'first_trophy', name: 'A trophy', test: 'trophies', arg: 1, reward: 50, icon: 'trophy' },
  { id: 'trophy_every', name: 'A trophy of every fish', test: 'trophies', arg: 0, reward: 500, icon: 'trophy' },
  { id: 'pats_10', name: 'Ten pats in one sitting', test: 'pats', arg: 10, reward: 25, icon: 'dog' },
  { id: 'hole_12', name: 'Twelve from one hole', test: 'hole', arg: 12, reward: 100, icon: 'hole' },
  { id: 'pond_clean', name: 'The pond cleaned', test: 'pondClean', reward: 100, icon: 'pond' },
  { id: 'pond_full', name: 'The pond full', test: 'pondFull', reward: 150, icon: 'pond' },
  { id: 'pond_back', name: 'A stocked fish caught', test: 'pondCaught', arg: 1, reward: 50, icon: 'pond' },
  { id: 'cabin_done', name: 'The cabin restored', test: 'cabin', reward: 250, icon: 'cabin' },
  { id: 'every_rod', name: 'Every rod on the rack', test: 'rods', reward: 250, icon: 'rod' }
];
// One a water (not the Back Pond, which holds only what is stocked): every species placed there caught.
G.data.milestoneWaters = function (locations, out) {
  for (var id in locations) if (!locations[id].pond) out.push({ id: 'water_' + id, name: 'Every fish of ' + locations[id].name, test: 'water', arg: id, reward: 150, icon: 'water' });
  return out;
};
if (G.data.locations) G.data.milestoneWaters(G.data.locations, G.data.milestones);
