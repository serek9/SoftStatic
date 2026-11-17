# SoftStatic: Handoff

How to pick the project up on another computer. **PLAN.md §8 is the authoritative status** (phases, architecture, decisions, known issues, baselines, next task). Working rules for Claude Code are in [CLAUDE.md](CLAUDE.md).

## Setup

1. **Clone:** `git clone https://github.com/serek9/SoftStatic.git`.
2. **Install** Node (any recent LTS) and Python 3 to serve the files. There are no dependencies and no build step.
3. **Run:** `python3 -m http.server 5517 --bind 127.0.0.1` (on Windows, `python`), then open `http://127.0.0.1:5517/?debug`.
   - `?tour` opens every water on the map for free and saves nothing, so the real save stays as it was.
4. **Check:** every command in CLAUDE.md should end with OK or PASS and exit 0. The expected output is in PLAN.md §8.5.
5. **Claude Code:** open the folder; Claude reads CLAUDE.md, then PLAN.md §8.6 for the next task. Visual work is checked with screenshots from Playwright's Chromium against the local server (`?debug&seed=N`, then `dbg.hour(h)`, `dbg.tp(x)`, `dbg.ui(name)`, `G.scene.sailing.load(id)`).

## Moving a save

Saves live in each browser (localStorage `softstatic_save_v1`, format `SS1.<base64>.<checksum>`) and do not travel with git. Only one tab plays a save at a time. In the game press P → **Export save** (copies the string, or shows it in a box to copy), and on the other machine P → **Import save** (between casts). Console equivalents: `G.core.save.exportString(G.state.save)` and `G.ui.menu.importSave(s)`.

## Playing on a phone

The phone and the computer must be on the same network.
- Serve to the network: `python3 -m http.server 5517 --bind 0.0.0.0`. Anyone on the network can open it, so stop it when done.
- Find the computer's address (Windows `ipconfig`, macOS Wi-Fi details, Linux `hostname -I`), e.g. `192.168.1.20`, and open `http://192.168.1.20:5517/` on the phone, held sideways.
- For full screen without browser bars, add it to the home screen (iOS: Share → Add to Home Screen; Android: browser menu → Add to Home screen). It opens full screen and landscape (`manifest.webmanifest`).
- Controls: the arrows bottom left steer; the round button bottom right does what its word says (CAST, REEL, HOOK, SELL…); J M S P at the top right; in menus tap a row to select it and again to choose. The full key table is PLAN_MOBILE.md §2b.
- Over plain `http://` the clipboard is not allowed, so Export save shows the string in a box.
- A slow phone lowers the reflection's cost by itself (`dbg.budget()`); a PC never does.
- `sw.js` caches the game for offline play on phones (`?sw` turns it on for localhost too).

## Regenerating the rooms' art

The shop, the cabin and the rooms' people come from the user's own pictures in `tools/art/ref/`; see [tools/art/README.md](tools/art/README.md) (Python 3, numpy, Pillow; not part of the game). Data and palette must always be replaced together.

## Portability

Line endings are LF (`.gitattributes`). Script paths in `index.html` match file case exactly. No absolute paths; `tools/balance.js` uses `path.join`.

## Things most likely to surprise

- **640×360 view over a 320×180 sim:** only drawing changed, so the replay hash and balance did not move.
- **Pixel-art rules** (PLAN.md 8.3 #84): no scaling of art, no dithering, no random speckle, 3–6 flat keys per material, light that steps.
- **The rope never moves the lure:** the lure's path is the sim's; the rope is pinned to where it is drawn.
- **Fish can get away on a slack line** (Phase 23): quiet, never a fail screen.
- **Every sound is synthesised** at the first key press (no sound files); scenes send one-off events with `G.audio.engine.cue(...)`.
- **No passive income** (Phase 52): coins come only from fish landed and sold; time away does nothing.
- **Overlays freeze the world** (pause, journal, map): nothing moves, including the clock.
- **Anomalies run only in the game,** never in the balance sessions, so they cannot move the baselines.
- **Rusty** is an original shopkeeper; his lines are in `data/dialogue.js`.
