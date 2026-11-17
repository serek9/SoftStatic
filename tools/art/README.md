# tools/art: the user's pictures into palette-keyed data (Phases 124-128)

The rooms' people (`js/gfx/people_art.js`) and the bait shop (`js/gfx/shop_art.js`) are the
user's own pictures (`ref/people_sheet.webp`, `ref/shop.png`), sampled to the game's size and
held to short palettes of their own. These Python scripts made them; they are not part of the
game and need Python 3 with numpy and Pillow. Run them from this folder.

People (the fisher, the golden puppy, Rusty, four sides each):

```bash
python3 extract.py      # the sheet's 12 drawings sampled cell by cell to the rooms' size (fisher 53 px tall)
python3 km.py           # each character held to its own palette (k-means: 26, 14, 28 keys)
python3 export.py       # people_art.js (rows, keys, roles, levels) and pal.txt (the pf*, pd*, pr* keys)
```

The shop (384×340, 64 keys):

```bash
python3 room.py         # paints the boy, the dog and Rusty out of the picture (ref_clean.png)
python3 room2.py        # samples it to the room and finds its 64 keys (room.pkl, room_q.png)
python3 room3.py        # shop_art.js (rows, keys, bulbs) and room_pal.txt (the ps* keys)
```

Then copy the `.js` into `js/gfx/` and the palette lines into `js/gfx/sprites.js` (replacing the
`pf*`/`pd*`/`pr*` or `ps*` block, and keeping the keys in the INTERIOR list), and run
`node tools/balance.js --validate`. A new k-means run gives new keys, so the palette must be
replaced with the data, never one without the other. The other looks and breeds (Phase 127) are the user's second sheet (`ref/people_sheet2.webp`:
the knit hat, the rain hat, the headlamp, the husky, the St. Bernard, the curly dog):

```bash
python3 extract2.py     # cells found from the sheet's alpha, sampled (fishers 52/266, dogs 38/206)
python3 km2.py          # a palette each (24, 24, 24, 14, 16, 16 keys); out2/q.png is a preview
python3 export2.py      # out2/people_art2.js (goes in people_art.js under looks) and out2/pal2.txt
```

The cabin (Phase 128; 528×352, 64 keys, `ref/cabin.webp`):

```bash
python3 cabin.py        # the picture sampled to the room (median per cell) and its 64 keys (out3/cabin.pkl, out3/cabin_q2.png)
python3 cabin2.py       # the 16 cuts' spans; out3/cabin_art.js (goes to js/gfx/) and out3/cabin_pal.txt (the pv* keys)
```

A cut is a rectangle and a foot in `cabin2.py`'s CUTS; its spans skip the floor and rug keys, so move a
rectangle there (out3/cuts.png shows the cuts lit over the darkened room) and keep the objects' tiles in
`js/ui/cabin.js` OBJECTS to match.
