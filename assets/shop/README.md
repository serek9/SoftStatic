# Miniature bait shop

Original artwork generated for SoftStatic from the user's approved miniature-shop
concept on 2026-11-13. The user explicitly requested that this image's style be
implemented faithfully in the game. This is the documented exception to the
earlier procedural-art-only convention; there is no external asset service at runtime.

- `room.png`: transparent clean plate, without player, dog or shopkeeper.
- `characters.png`: four facings, columns front/right/back/left; rows player/dog/Rusty.
- `dog-walk.png`: four facings across two alternating walking strides.

`js/ui/shop_art.js` extracts and bakes native-resolution sprites, anchors them to
the existing walk, and draws foreground furniture above characters when appropriate.
The source images stay at full resolution here; rendering uses small cached canvases.
All three assets are preloaded and cached by the service worker for offline play.
The procedural room remains available if artwork cannot load.
