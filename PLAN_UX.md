# SoftStatic: UX/UI Round 1, Phases 131–135

Asked for by the user on 2026-11-17: an audit of the whole game as a senior engineer would do it, then phases that make the UX and UI clearly better on phones and on a PC, with **menus in a 90s VHS style**, more fun and pull, and **no change to how the game plays or to its look and mood**. PLAN.md §0 holds throughout: palette keys only, the bitmap font, `update()` never draws, no allocations in hot paths, nothing blocks input, no jumpscares or harsh flashes. Every phase keeps `js/sim` and `data/` untouched unless it says so, so the replay hash and the pacing stay as in PLAN.md §8.5.

## 1. Audit (2026-11-17, headless Chromium at 1280×720 and an emulated phone, 0 page errors)

**Good, keep:** the title on tape; the world's art and light; the compact catch card with big phone keys; the fight's EASE/REEL word; the rooms; the phone's side controls with icons and words; the journal grid.

**Problems, by weight:**
1. **The pause menu is a flat list of 18–20 rows** mixing actions, sliders and switches (Resume, four volumes, eight switches, three pages, export, import). On a phone it shows 8 rows at a time and has to scroll; Journal and Chart are not in it at all. It is the most used menu and the hardest to read.
2. **The menus do not share the game's tape identity.** The title is a VHS tape (tracking bar, SP counter, chroma-split letters), but every panel after it is a plain dark box with a tab. The user wants the menus to feel like a 90s VCR's on-screen display.
3. **The shop's Buy list is one list of 64 items** ("1/64", "A/D page"): rods, reels, lines, lures, bait and gear mixed. Finding a lure means paging.
4. **Small breakages:** the catch card's NEW tab is half covered by the size medallion, and a loose `A/D  SPACE` hint floats on the card on a PC; the pier panel's flavour line is cut off ("The boat knocks against the pos"); on the chart, water names run over the lakes' outlines, and on a phone the place card covers a third of the chart.
5. **The title is only "press space".** There is no menu on the tape: no Continue, no Settings, no Controls before playing.
6. **Little pull between catches.** After the card closes nothing says what to chase next. The milestones exist (24, paid) but live two menus deep.

## 2. The phases

### Phase 131: The VCR menu skin
One change in `js/ui/panel.js`, so every panel gets it:
- **Frame:** the title tab reads like an on-screen display: bold capitals with a one-pixel red/teal chroma split behind them, and a small play mark.
- **Body:** faint scanlines (every other row a touch darker), drawn from palette keys.
- **Selection:** the chosen row keeps its lit edge bar and gains a blinking ▶ cursor, like a VCR menu.
- **Opening:** a panel rolls in with a brief tracking band (about 150 ms); none under *Reduce motion*, no flicker under *Reduce flashes*.

Done when: `dbg.uiCheck()` passes in PC and touch mode, the PC panels keep their sizes, and screenshots of each panel show the skin.

### Phase 132: A menu you can read at a glance
The pause panel becomes a VCR **MENU** with pages:
- **MENU:** Resume · Journal · Chart · Milestones · Fisher & dog · Settings ▸ · Controls · Save tape ▸
- **SETTINGS:** grouped under quiet headings (SOUND: Volume, Music, World, Effects, Sound, Dog barks · PLAY: Reel, Tips, Key hints · SCREEN: Text size, Reduce flashes, Reduce motion, Full screen, Vibration).
- **SAVE TAPE:** Export save, Import save.

Esc or Back on a page returns to MENU. A status line at the foot reads like a VCR: `▶ PLAY 19:12  FOGBOUND LAKE`. Every row keeps the row rule for taps. The MENU page fits a phone without scrolling.

Done when: `dbg.uiCheck()` passes, every old row is reachable, `--saves` PASS.

### Phase 133: Fixes and a shop that finds things
- The catch card: the NEW tab sits clear of the size medallion, and the stray hint is gone.
- The pier panel wraps its line.
- The chart: water names placed clear of their outlines; on a phone the place card is a slim strip.
- The shop's Buy window gets **tabs by kind** (Rods · Reels · Lines · Lures · Bait · Gear), switched with A/D or a tap.

Done when: `dbg.uiCheck()` passes, every item can still be bought, and the screenshots are clean.

### Phase 134: The tape's menu
The title gains a small VCR menu under the letters: **▶ PLAY** (or CONTINUE when a save exists) · SETTINGS · CONTROLS. Space or a tap anywhere still plays at once (never slower than today). SETTINGS and CONTROLS open their pages over the tape.

Done when: the title plays on one key or tap as before, and both pages open and return.

### Phase 135: Something to chase
- After a catch, the card's foot shows the nearest milestone's progress (`Fogbound Lake 3 / 12`), ticking up when this fish counts.
- The MENU page's status line names the next goal.
- Journal tiles for fish never caught at the present water and hour carry a small "here now" mark (from data the journal already shows).

UI only: no new rewards or rules.

Done when: `--milestones` PASS (unchanged), and `dbg.milestones()` agrees with the card's line.

## 3. After the round
Re-audit with the same screenshots, write the next round here, and continue.

---

# Round 2, Phases 136–138

## 4. Audit (2026-11-17, after round 1; a scripted session: tackle, cast, bite, hook-set, runs, card, milestone, a lost fish, travel, the cabin, controls, milestones; PC and phone, 0 page errors)

**Better since round 1:** every panel shares the VCR look; the MENU fits a phone; the shop has shelves; the card names a goal.

**Problems, by weight:**
1. **The HUD's messages talk over each other.** Why a fish got away is loose text at the top left (no plate, a different place from every other message), while the journal tip and the milestone line stack at the top centre. A lost fish, a tip and a milestone can all show at once.
2. **Travelling is a plain black fade.** The rest of the game now reads as a tape; moving between waters is the natural place for the tape to fast-forward.
3. **No sense of a sitting.** The MENU says what to chase but nothing says what this sitting has brought in, the small "one more cast" pull.
4. **The milestones page doesn't point at the goal** the MENU and the card name; you scroll a list of 24 to find it.

## 5. The phases

### Phase 136: One voice for the HUD
Every passing message is an OSD plate at the top centre, in one place and one style: why a fish got away, the tips, the milestone line. One shows at a time; a reason for a lost fish takes the tip's place while it shows, and the milestone line sits under it.

Done when: `dbg` forces each message and only one plate shows at the top centre; screenshots on PC and phone.

### Phase 137: Fast-forward between waters
The travel fade plays as a VCR fast-forward: `▶▶ FF` in the corner, the tape counter running, a few rolling static lines, then the new water's name as a channel card (`CH 03  BLACKWATER CREEK`) as it fades in. Same length as today, nothing waits on it; a plain fade under Reduce motion.

Done when: travel takes as long as before (`dbg.travel`), screenshots mid-travel, and Reduce motion gives the plain fade.

### Phase 138: This tape
- The MENU's foot shows this sitting's tape: fish landed, coins taken, the best fish (`TAPE  3 FISH  +87c  BEST 26 cm`).
- The milestones page opens scrolled to the next goal and marks it with the play mark.

UI only, counted from the catches the card shows; nothing saved.

Done when: the counts match a scripted sitting, and the page opens on the goal.

---

# Round 3, Phases 139–140

## 6. Audit (2026-11-17, after round 2; tackle, bite, fight, badge, the shop and Rusty, the cabin, controls, the picker; PC and phone, 0 page errors)

**Better since round 2:** one place for passing messages; travel reads as a tape; the MENU shows the sitting and the next goal.

**Problems, by weight:**
1. **The menus look like a VCR but sound like generic UI.** Opening a panel and travelling are silent apart from the row clicks.
2. **Some players will want the whole picture to read as tape** (the user's 90s VHS wish), but the game's look must stay as it is by default.
3. **The SETTINGS page's key hints run past its edge** on a PC (three hints in a 176 px panel).
4. (Looked at, left as is) The tackle panel is mostly empty on a fresh save, but sizing it to its content saves only two rows, because the hook's icon needs the room.

## 7. The phases

### Phase 139: Tape sounds
A cassette deck's key as a panel opens (a low click, a small thunk, a breath of hiss), and the tape winding on during travel. Quiet, on the effects bus, at or under the existing UI clicks.

### Phase 140: The Tape look
SETTINGS → SCREEN → **Tape look**, off by default: faint scanlines, a soft vignette and one slow tracking line over the picture, baked once and drawn in one call, only ever darker. It also fixes the SETTINGS page's hints.
