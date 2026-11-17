# SoftStatic: Fish Swimming, Phases 27–30 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3. Goal: fish swim realistically.

## Phase 27: The swimming body (presentation)
- **27.1** Side-view tail beat: rest → away (foreshortened, shaded) → rest → near; same canvas size and mid row per frame (`js/gfx/fishgen.js`).
- **27.2** Turning frames: each look narrowed to 0.6 and 0.3 of its length; a reversal plays wide → narrow → flipped over 0.2–0.4 s.
- **27.3** Per-fish body state stepped in `update()`: beat rate from speed over length (≈0.7–6 Hz), glides, facing changes only through a turn, pitch up to ≈24° toward travel. Wrongness effects stay.
- **27.4** The hooked fish, heavy shadow and far silhouettes all use it; the line meets the drawn mouth in every frame.
- **27.5** `dbg.fishBody(i | 'hook')` → `{face, turn, beatHz, phase, glide, pitch, frame}`.

## Phase 28: Swimming that steers (sim, moves the replay hash)
- **28.1** Heading and speed with species-limited turn rate; depth changes by pitching (vertical ≤ ≈0.6 of speed); no reversal under 0.25 s.
- **28.2** Burst and glide, 1–3 s cycles; approach times within 15% of before.
- **28.3** Current carries fish; in the creek idle fish face upstream and hold station.
- **28.4** Inspect circles and nibbles are steered darts; pacing targets still pass.

## Phase 29: The hooked fish swims (presentation)
- **29.1** Heads along its run, dives and rises, turns through turn frames; beat follows pull. No jitter.
- **29.2** Head shakes bend the head (synced to `fight.shake`); a tired fish beats slowly and rolls to show its belly.

## Phase 30: Shoals and reactions (presentation)
- **30.1** Far silhouettes swim in loose shoals of 3–7 (separation, alignment, cohesion).
- **30.2** A splash or the boat startles nearby far fish into a burst within 0.3 s, then they regroup.
