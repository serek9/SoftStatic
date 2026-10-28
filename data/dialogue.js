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
    // Mist carp are heavier and likelier in the grey hours (data/fish.js timeLikes).
    { id: 'carp_fog', kind: 'hint', after: 2,
      text: 'My sister only goes out once the fog sits low. Says the carp get heavy in the grey hours.' },
    { id: 'quiet', kind: 'repeat', after: 4,
      text: 'Quiet out there tonight.' },
    // Two-Forty-Seven bites only on a cast made in the 02:30-03:10 window.
    { id: 'owl', kind: 'hint', after: 6,
      text: 'That owl is not keeping time. Something under it is. Quarter to three, give or take.' },
    // Hollow pike need high unease: sitting still at night.
    { id: 'wait', kind: 'reverse', after: 8, night: true,
      text: 'The pike only come to the ones who sit still and wait.' },
    // The unlabelled jar is a real rare bait (data/gear.js rareBoost 3).
    { id: 'jar', kind: 'hint', after: 10,
      text: 'That jar on the bottom shelf? Never stocked it. The rare ones seem to like it, though.' },
    // D4: a fish too heavy for the rod never bites; a better rod lets it.
    { id: 'heavy', kind: 'hint', after: 12,
      text: 'Something big lives under that lake. It will not look twice at a cane rod.' }
  ]
};
