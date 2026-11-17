# tools/art: the user's pictures into palette-keyed data (Phases 124-126)

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
replaced with the data, never one without the other. The other looks and breeds are painted
over these drawings in code (`js/ui/room.js`, Phase 126), not traced.
