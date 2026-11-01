# SoftStatic: Playing on a Phone, Phases 57–60

**Date:** 2026-11-01. **Repo state:** Phases 1–56 done (PLAN.md §8.1), `main` at `338eaba`.
**Status:** Asked for by the user on 2026-11-01 ("before making any more things or improvements, the game should be playable either from a pc like now or with a phone, make a plan to adapt it and start it"). Phase 57 was started the same day and is done; Phase 58 was started by the user the same day ("continue with phase 58") and is done; Phase 59 was started the same day ("Start Phase 59") and is done; Phase 60 was started the same day ("Start phase 60") and is done. **The plan is complete.**
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like PLAN_TACKLE.md, this file adds phases after the approved spec and does not edit §0–§7 or Appendix V. Decisions go in §8.3.

**The rule for every phase:** the PC game does not change. Keyboard and mouse play exactly as they do now, the picture on a desktop is scaled exactly as now, and `js/sim` and `data/` are untouched, so the replay hash and every Node check stay as they are in 8.5. Phone support is added next to them, switched on by a touch screen.

---

## 1. What exists today (checked in the code and in an emulated phone)

Phase 14.6 gave the game basic touch: `js/core/input.js` maps a touch to a zone (in play the left 128 px steer left, the right 128 px steer right, the middle is the action; in a menu the top and bottom middle are up and down), five on-screen buttons (J, M, S, P, ESC, 28 × 22 game px) show once a touch is seen, a tap on the catch card's keys, the setup panel's rows and the dog work, and the shop walks by the menu zones (8.3 #71, #206, #245). An emulated phone (headless Chromium, 3× pixel ratio) shows what is still missing:

| Problem | What happens now | Where |
|---|---|---|
| The picture is small | `fit()` uses the largest whole-number scale. An 844 × 390 phone in landscape gets 3 device px per game px (640 × 360 CSS px, 76% of the width). With the browser's bars showing (750 × 340) it drops to 2: **427 × 240, 57% of the width**. In portrait it is a 390-wide strip in a black screen. | `index.html` `fit()` |
| Browser chrome | No full screen, no orientation hint, no home-screen manifest; the notch and the home bar are not kept clear (no `viewport-fit`, no safe-area insets). Pinch and double-tap zoom work on the black margins; a long press can select or call up the callout. | `index.html` |
| Portrait | Nothing says to turn the phone. Text drawn at 0.6 CSS px per game px is unreadable. | — |
| "Fishing in another tab" | Cleared only by a mouse click or a key. On a phone a touch never sends `mousedown` (input.js cancels the touch), so **the page cannot be taken back by touch**, and it says "Click". | `index.html` `reclaim` |
| Sound on iPhone | The audio context is made on `touchstart`, which iOS Safari does not count as a user gesture (it wants `touchend`); iOS's `interrupted` state (a call, the lock screen) is never resumed. | `js/audio/engine.js` `unlock`, `attach` |
| Controls you cannot see | The steering and action zones are invisible. The buttons are 37 × 29 CSS px on an 844-wide phone (Apple and Google ask for 44–48). Nothing shows what a tap will do (cast, reel, hook, sell). | `js/core/input.js`, `js/ui/hud.js` |
| Keys with no touch | H (still picture) has no touch. Menus move by the up/down zones rather than a tap on the row you want (pause list, map stops, the journal's pages, the shop's item window, the picker). The rooms walk by zones only, four ways, with no pad. | `js/ui/*` |
| Phone performance | Unmeasured. The night frame with the reflection costs ~3 ms on a desktop; a mid phone may be 4–6× slower. | — |

## 2. The phases

### Phase 57: The page on a phone
The page itself, before any control changes. New file `js/core/device.js` (`G.core.device`, loaded after `input.js`), and `index.html`.

| Task | What | Files | Done when |
|---|---|---|---|
| 57.1 | **Touch mode and the fit.** `device.touch()` is true on a coarse pointer, or once a touch has been seen. In touch mode the picture fills the safe area: the whole-number scale is kept when it fills at least 95% of the limiting side, otherwise the fractional scale (still nearest-neighbour). Not in touch mode, the fit is the old one, unchanged. The canvas is placed inside the safe-area insets (`viewport-fit=cover`, `env(safe-area-inset-*)` read from a probe element) and refits on resize, orientation change, the visual viewport's resize and full-screen changes. | `js/core/device.js`, `index.html` | `dbg.device()` in an emulated 844 × 390 and 750 × 340 phone reports the picture filling ≥ 95% of the limiting side; a 1920 × 1080 and a 1366 × 657 desktop report the same size as before |
| 57.2 | **The page behaves like an app.** No zoom (`user-scalable=no`, `touch-action: none` on the page), no overscroll, no text selection, no callout or tap highlight. The first tap in touch mode asks for full screen and a landscape lock (where the browser allows; once per load, so leaving full screen is respected). A `manifest.webmanifest` (`display: fullscreen`, `orientation: landscape`) and the iOS web-app metas, so "Add to Home Screen" plays without the browser's bars. | `index.html`, `manifest.webmanifest`, `js/core/device.js` | `dbg.device()` reports the request made once after the first tap and not again; the manifest is linked and parses |
| 57.3 | **Portrait.** In touch mode with the screen taller than wide, the game keeps running and keeps its input (§0.14), and a notice drawn large over it in the bitmap font says to turn the phone sideways. | `js/core/device.js`, `index.html` | In a 390 × 844 phone `dbg.device().portrait` is true and the notice is drawn; a tap still casts; turning to landscape removes it |
| 57.4 | **Touch fixes.** "Fishing in another tab" is taken back by a touch, and says "Tap" in touch mode; the audio unlocks on `touchend`/`pointerup`/`click` too, and resumes from iOS's `interrupted` state on the next touch. | `index.html`, `js/audio/engine.js` | In a headless phone: another tab claims the save, a tap reloads and takes it back; the audio context is running after one tap |
| 57.5 | **`dbg.device()` and an overlay line**: viewport, pixel ratio, scale and how much of the screen it fills, safe insets, touch, portrait, full screen, the audio's state. | `js/core/device.js`, `js/core/debug.js` | The line shows in `?debug`; every Node check as in 8.5 |

### Phase 58: Thumb controls
The controls you can see, in touch mode only (with a mouse nothing changes).

| Task | What | Files | Done when |
|---|---|---|---|
| 58.1 | **Bigger buttons.** In touch mode the on-screen buttons grow to at least 44 CSS px at the current scale (worked out from `device.scale()`), and move to the top right, clear of the thumbs, the HUD's clock and the catch card. | `js/core/input.js`, `js/ui/hud.js` | Every button ≥ 44 × 44 CSS px on 844 × 390 and 667 × 375; none overlaps another or the HUD |
| 58.2 | **A steering pad and an action button.** Bottom left, two arrows (left, right) as a pad; bottom right, one round action button. Drawn quietly in the panel's colours, fading with the HUD's idle fade (P1-7) and back on a touch. The old zones still work behind them, so a tap anywhere in the middle still casts. | `js/core/input.js`, `js/ui/hud.js` | `input.touch()` on the pad's arrows moves the boat, on the button charges and casts; the pad and button are drawn in touch mode only |
| 58.3 | **The button says what it does.** A word under the action button from the scene's state: CAST, REEL, HOOK, SELL / KEEP on the card, TALK in the shop by Rusty, USE in the cabin. Read from state only. | `js/ui/hud.js`, `js/scene/sailing.js` (one read-only `actionWord()`), `js/ui/shop.js`, `js/ui/cabin.js` | `dbg.device().word` gives the right word through a cast, a bite, a fight and the card |
| 58.4 | **The rooms' pad.** In the shop and the cabin the pad becomes four arrows, held to walk; the action button talks and uses; ESC leaves. | `js/core/input.js`, `js/ui/hud.js` | `dbg.shopWalk`'s routes walked by touching the pad alone reach Rusty, the rack and the tank; the cabin's bench by touch |

### Phase 59: Every key by touch
Nothing in the game needs a keyboard.

| Task | What | Files | Done when |
|---|---|---|---|
| 59.1 | **The key table.** A table in this file of every key in every scene and overlay and its touch (written first, from the code), so nothing is missed. | `PLAN_MOBILE.md` | Every row has a touch |
| 59.2 | **Tap the row you want.** The pause list, the map's stops, the setup panel (already), the picker, the shop's Buy/Talk/Leave and item window, the cabin's ledger: a tap on a row picks it, a tap on a picked row chooses it. The journal turns its pages by a tap on its left or right half, closes by ESC. Each overlay gives `tap(gx, gy)` as the card and setup do; `input.zone` asks the open one first. | `js/ui/menu.js`, `js/ui/map.js`, `js/ui/look.js`, `js/ui/journal.js`, `js/ui/shop.js`, `js/ui/cabin.js`, `js/core/input.js` | A headless phone plays by taps alone: open the map and travel to the shop, buy a worm pack, leave, open the journal and turn two pages, change the dog in the picker, set the volume |
| 59.3 | **The rest.** The still picture (H) as a long press on the P button; full screen on and off in the pause list (touch mode only; saved in `save.settings`, defaulting to on, with no version bump since settings are read with defaults). | `js/core/input.js`, `js/ui/menu.js`, `js/core/device.js` | Both work by touch; `--saves` PASS |

### Phase 60: Fitting it in
| Task | What | Files | Done when |
|---|---|---|---|
| 60.1 | **A phone's frame.** The night frame (reflection, life, drizzle, an anomaly) and the under-water frame measured under Chromium's 4× and 6× CPU throttle. If a frame is over 16 ms, the touch-mode budget drops the costliest presentation-only extras (the reflection's row shifts every other frame, fewer far shoals), never anything the sim reads. | `js/core/device.js`, the scenes as measured | 60 fps (or the budget's choice reported) at 4×; the PC frame unchanged |
| 60.2 | **A gallery page** `touch`: the pad, the button with each word, the buttons, the portrait notice; and a home-screen icon painted from palette keys at boot and handed to the manifest as a data URL, if the browsers take one (otherwise a `TODO`). | `js/core/debug.js`, `js/core/device.js` | The page shows every touch sprite |
| 60.3 | **How to play on a phone** in HANDOFF.md: serving on the local network (`--bind 0.0.0.0`) and opening the address on the phone, adding it to the home screen; every check as in 8.5; the PC game played through once by keyboard and once by mouse to show it is as before. | `HANDOFF.md`, PLAN.md §8 | Every check PASS; the PC check's numbers equal 8.5's |

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

## 3. What this plan does not do
- No change to the simulation, the economy, the fish or the save's version.
- No portrait layout: the game is a wide side view and stays landscape. Portrait shows the game with a notice.
- No virtual gamepad library, no dependencies, no build step (§0.2). Everything is drawn in the bitmap font and palette keys.
- No multiplayer, cloud saves or app-store packaging. Moving a save between the PC and a phone stays the pause menu's export and import (HANDOFF.md).
