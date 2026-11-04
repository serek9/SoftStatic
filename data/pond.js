var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Back Pond's cleanup and stocking (Phases 84-85, PLAN_WINTER.md 2.4-2.5; the reference's
// Old Moose Valley pond: 7 kinds of trash, 3 small, 2 medium and 2 large, a cleanup meter, the
// waterfall's blockage paid for in coins, then stocking).
// kinds: what lies on the bed. size small, medium or large; n of each; kg (the fight's mass: a
// heavy piece reels slowly); pull (its strength against the line in the fight); half (world px
// either side of its x that the lure touches it at); card: the line on its card. No piece pays.
// pieces: where each of the 21 lies (world x on the bed), in a fixed order (save.pond.got is a
// bit per piece). streamCost: the coins to clear the stream's jam (the reference's 750).
// rodKg: a large piece needs a rod that holds this much (rods.maxMass). clearHours: game hours
// the water takes to clear once the meter is full.
G.data = G.data || {};
G.data.pond = {
  streamCost: 750,
  rodKg: 7,
  clearHours: 1,
  shyHours: 10 / 60, // Phase 85: a released pond fish does not bite again for 10 game minutes
  kinds: [
    { id: 'bottle', name: 'A bottle', size: 'small', n: 5, kg: 0.4, pull: 0.25, half: 3, card: 'A bottle, green with slime. Into the bin with it.' },
    { id: 'can', name: 'A tin can', size: 'small', n: 5, kg: 0.3, pull: 0.25, half: 2, card: 'A rusted tin can. Into the bin with it.' },
    { id: 'boot', name: 'An old boot', size: 'small', n: 5, kg: 1.2, pull: 0.35, half: 4, card: 'An old boot. Into the bin with it.' },
    { id: 'tyre', name: 'A tyre', size: 'medium', n: 2, kg: 6, pull: 0.5, half: 6, card: 'A tyre, full of mud. Rolled up the bank for the dump.' },
    { id: 'crate', name: 'A sunk crate', size: 'medium', n: 2, kg: 5, pull: 0.5, half: 6, card: 'A sunk crate, nails and all. Onto the woodpile.' },
    { id: 'bike', name: 'A bicycle', size: 'large', n: 1, kg: 12, pull: 0.65, half: 10, card: 'A bicycle, wheels bent. Someone rode it in. Up the bank with it.' },
    { id: 'cart', name: 'A shopping cart', size: 'large', n: 1, kg: 16, pull: 0.7, half: 10, card: 'A shopping cart, a long way from any shop. Up the bank with it.' }
  ],
  // [kind id, world x]: 21 pieces across the bed, the big ones in the middle of the bowl.
  pieces: [
    ['bottle', 34], ['can', 52], ['boot', 70], ['bottle', 88], ['can', 104], ['tyre', 124], ['boot', 146],
    ['bottle', 160], ['crate', 176], ['can', 198], ['bike', 214], ['boot', 236], ['bottle', 252], ['cart', 270],
    ['can', 290], ['tyre', 306], ['boot', 322], ['crate', 340], ['bottle', 356], ['can', 370], ['boot', 384]
  ]
};
