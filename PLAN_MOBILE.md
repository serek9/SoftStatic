# SoftStatic: Playing on a Phone, Phases 57–60 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3.

**The rule:** the PC game does not change. Keyboard and mouse play, the desktop scale, `js/sim` and `data/` stay as they are. Phone support sits beside them, switched on by a touch screen (`G.core.device.touch()`).

## 2. The phases

### Phase 57: The page on a phone
- **57.1** Touch mode fills the safe area: whole-number scale if it fills ≥95% of the limiting side, else fractional (nearest-neighbour). Safe-area insets respected; refits on resize, rotation, visual viewport and full-screen changes.
- **57.2** Behaves like an app: no zoom, overscroll, selection or callout; full screen and landscape lock on the first tap (once per load); `manifest.webmanifest` and iOS web-app metas.
- **57.3** Portrait keeps running with input and draws a large "turn the phone" notice. (Replaced in Phase 145: an upright phone gets the game turned a quarter, always sideways, with no notice.)
- **57.4** "Fishing in another tab" is taken back by a tap; audio unlocks on `touchend`/`pointerup`/`click` and resumes from iOS's `interrupted` state.
- **57.5** `dbg.device()` and an overlay line.

### Phase 58: Thumb controls (touch mode only)
- **58.1** On-screen buttons at least 44 CSS px, at the top right, clear of thumbs, HUD and catch card.
- **58.2** A steering pad bottom left and a round action button bottom right, fading with the HUD; the old zones still work behind them.
- **58.3** The action button's word from state: CAST, REEL, HOOK, SELL/KEEP, TALK, USE.
- **58.4** In the rooms the pad has four arrows; the button talks and uses; ESC leaves.

### Phase 59: Every key by touch
- **59.1** The key table below.
- **59.2** Tap the row you want in every list (pause, map, picker, shop, cabin); each overlay has `tap(gx, gy)`.
- **59.3** The still picture (H) is a long press on P; full screen toggles in the pause list.

### Phase 60: Fitting it in
A touch-mode frame budget that drops presentation-only extras if a throttled phone frame passes 16 ms; a `touch` gallery page; phone setup in HANDOFF.md.

## 2b. The key table (59.1)
Every key the game reads, from the code (`inp.pressed`/`held` in `js/scene/sailing.js`, `js/scene/underwater.js`, `js/ui/*`), and its touch after Phase 59. "ESC" is the on-screen ESC key; "row rule" is 59.2's: a tap on a row selects it, a tap on the selected row chooses it.

| Where | Key | What it does | Touch |
|---|---|---|---|
| Boat | A/D, ←/→ | move the boat | the pad's arrows (58.2); the screen's left and right edges |
| Boat | Space, Enter | cast (hold, let go), reel (hold), set the hook, pop the popper | the round button (58.2); a tap in the middle |
| Boat | S | the setup panel | S key (58.1) |
| Boat | ↓ | pet the dog | a tap on the dog (Phase 45) |
| Boat | J / M / P | journal / map / pause | J / M / P keys |
| Boat | Esc | pause | P key |
| Boat | H | hide the HUD for a still picture | a long press on P (0.6 s); again on the same corner to bring it back (59.3) |
| Catch card | A/D, Space | choose SELL, KEEP, RELEASE | a tap on its key (Phase 46) |
| Setup panel | W/S, A/D, Space, Esc/S | move, pick, close | a tap on a row picks; off the panel closes (Phase 45); ESC |
| Pause list | W/S, Space | choose a row, do it | row rule |
| Pause list | A/D | volume down/up, sound and barks on/off | on the selected Volume row a tap left or right of the level; Sound, Dog barks and Full screen by the row rule |
| Pause list | P, Esc | close | ESC |
| Fisher & dog | W/S, A/D | the row, turn its look | a tap on a cell's left or right part turns it (and picks the row) |
| Fisher & dog | Space, Esc, P | done | ESC, or its ESC hint |
| Map | W/S/A/D, Space | choose a stop, go | row rule on the stops; the card's SPACE hint goes |
| Map | M, Esc | close | ESC, or the card's M hint |
| Journal | A/D, W/S | the filters, the grid | a tap on a filter key turns it; a tap on a tile reads it; a tap on the scrollbar pages |
| Journal | J, Esc | close | ESC, or its J hint |
| Shop, cabin walking | arrows / WASD | walk | the four-way pad (58.4) |
| Shop, cabin walking | Space | talk, use | the round button (58.4) |
| Shop, cabin walking | Esc, M | leave | ESC |
| Shop text box | Space, Esc | the next page, close | a tap on the box; ESC |
| Shop Buy/Talk/Leave | W/S, Space, Esc | choose | row rule; ESC |
| Shop item window | W/S, Space, Esc | choose, buy, back | row rule; its SPACE and ESC hints; ESC |
| Cabin message | Space, Esc | close | a tap on the box; ESC |
| Cabin ledger | Space, Esc | pay, not now | its SPACE hint pays (nowhere else on the box, so a stray tap spends nothing); its ESC hint or ESC |
| Another tab owns the save | any key, click | take it back | a tap (57.4) |
| `?gallery` (debug) | A/D | pages | the screen's edges |

## 3. Out of scope
No change to the simulation, economy, fish or save version; no portrait layout; no libraries or build step; no app-store packaging. Saves move between devices by export and import (HANDOFF.md).
