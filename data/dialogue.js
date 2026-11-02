var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The shopkeeper (V10.7, §2): cheerful small talk with occasional non sequiturs that turn
// out to be true hints, one line spoken twice and one line spoken backwards.
// The shop says one line per visit. A special line is said once per save (save.flags.lines),
// no sooner than visit `after`, at least `gap` visits after the last special one, and with
// night: true only outside the grey hours. Lines are written forwards; kind 'reverse' is
// shown reversed, kind 'repeat' is said twice.
G.data = G.data || {};
G.data.dialogue = {
  gap: 2,

  small: [
    'Evening! Or whatever it is out there.',
    'Crickets are fresh. Well. Fresh enough.',
    'Mind the third step on the way out, it hums.',
    'Fog came in early. It always comes in early.',
    'You look like someone who catches fish.',
    'I had a dog like yours once. Or he had me.',
    'Coffee is on the house. The house insists.',
    'Lantern oil? No, we are out. We are always out.',
    'Nice night for it. They are all nice nights.'
  ],

  special: [
    // Phase 68: every hint is true of the real fish (data/fish.js). Walleye bite from dusk to
    // dawn (timeLikes) in Fogbound and the Red Room.
    { id: 'walleye_dusk', kind: 'hint', after: 2,
      text: 'My sister only goes out once the light goes. Says the walleye come up at dusk and stay till dawn.' },
    { id: 'quiet', kind: 'repeat', after: 4,
      text: 'Quiet out there tonight.' },
    // Burbot: Fogbound's deep water (14-24 m), at night.
    { id: 'burbot', kind: 'hint', after: 6,
      text: 'There are burbot in Fogbound. Right down on the bottom, and only after dark.' },
    // Northern pike: spoons and bladebaits are their favourites (lureTypes 2).
    { id: 'pike', kind: 'reverse', after: 8, night: true,
      text: 'The pike will take a spoon before anything else I sell.' },
    // The unlabelled jar: taken as a worm, and fish come to it a little sooner (data/gear.js).
    { id: 'jar', kind: 'hint', after: 10,
      text: 'That jar on the bottom shelf? Never stocked it. They take it like a worm, only quicker.' },
    // D4: a fish too heavy for the rod never bites; a better rod lets it (Fogbound's lake trout, 3.5 kg).
    { id: 'heavy', kind: 'hint', after: 12,
      text: 'Something big lives under that lake. It will not look twice at a cane rod.' }
  ]
};
