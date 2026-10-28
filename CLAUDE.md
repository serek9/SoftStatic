# SoftStatic

A calm, liminal side-view fishing game in plain JavaScript (no libraries, no build step).

- **The plan:** [PLAN.md](PLAN.md). Read **§0 Shared Conventions** before any coding task, then only the phase or task you were given.
- **Where things stand:** [HANDOFF.md](HANDOFF.md) has the completed phases, open TODOs and decisions made along the way.

## How we work

- Work one phase at a time, and only after the user says to start it. When a phase is done, report and stop.
- Implement only what the task names. If something outside it is missing, leave a `// TODO(Px.y)` stub and mention it (§0.1).
- "Done" means a `dbg.*` or Node check passes, never "I played for a while" (§0.13). Report the actual check output.
- Commit once per phase: `Phase N: <name> (tasks N.1-N.k)`, with a body saying what was built. Never push without asking.
- Never rewrite PLAN.md; record departures from it in HANDOFF.md under "Decisions".

## Rules that are easy to break (§0)

- One global `G`. Every JS file starts with `var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});` and attaches to one namespace (`G.core`, `G.data`, `G.sim`, `G.gfx`, `G.scene`, `G.ui`, `G.audio`).
- `js/sim/*` and `data/*` are pure: no `window`, `document`, `Math.random`, `Date` or `performance`. They must load in Node through `vm`; `node tools/balance.js --validate` lints this.
- `G.rng` is for simulation, `G.vrng` for visuals only. Fixed step dt = 1/60.
- `update()` never draws; `draw()` never changes state. No allocations in hot paths.
- Colours are palette keys from `js/gfx/sprites.js`, never hex elsewhere. Text uses the bitmap font, never `fillText`. Sky and water never go brighter than `dusk_high`.
- Tone: no jumpscares, no fail states, never block input, never harm the dog.

## Running and checking

```bash
python3 -m http.server 5517 --bind 127.0.0.1    # then open http://127.0.0.1:5517/?debug
node tools/balance.js --validate                 # data and code checks (exit 1 on errors)
node tools/balance.js --replay 12345             # determinism
node tools/balance.js --pacing                   # economy against the V8 targets
```

On Windows, use `python` instead of `python3`. URL flags: `?debug` (overlay, `dbg` console API), `?seed=N`, `?gallery`.
