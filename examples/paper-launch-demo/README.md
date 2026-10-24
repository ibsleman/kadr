# paper-launch-demo

A run of `motions/paper-style-product-launch-film`, built and rendered with this skill.
Recipe by Ittehadul Karim (@ik_builds) — see that motion's `MOTION.md` for the source.

**Concept:** *the ball never gets higher on its own.*

Six shots, 100 BPM, a new idea every 1.5-2s:

1. a rule draws across; a ball drops in and bounces with real physics, losing height —
   a handwritten note arrives: *one idea*
2. four paper cards fly in tilted — storyboard, timing, sound, render — and the line that
   carries the film writes itself across the middle: *the work nobody sees*
3. **one hard cut to charcoal.** No fade. A ring leaves where the page was
4. huge kinetic type assembles out of scattered pieces: **ONE PROMPT / ONE FILM**
5. the type scatters downward and becomes a chart: a flat wobbly line under *the ceiling*,
   then a rising curve with the same ball riding its head, over *same team*
6. hard cut back to paper; the ball arcs in and lands as the apex of the mark

## What it demonstrates beyond the showreel

- **Real physics as a pure function of time.** The bounce table is computed once, so
  `ballH(t)` is closed-form and seek-safe — no simulation state between frames.
- **Onion-skin trails** sampled from the same function at `t - k/60`.
- **Draw-on strokes.** `strokePath(points, k, …)` renders the first `k` of any polyline:
  every rule, arrow and curve arrives that way.
- **Handwriting** revealed through a clip that grows left to right. Cursive faces overhang
  their advance width, so the clip is padded or the last letter is lost.
- **One hard light/dark switch**, never a crossfade.
- **Sound designed per event** — a pop pitched down on every bounce, pen scribbles under
  the handwriting, whooshes on the cards, drums only under the claim and the chart, a sub
  hit on the logo.

## Rebuild it

```bash
cd ../../scripts
node render.mjs --in ../examples/paper-launch-demo/motion.html --probe --probe-step 0.5
node render.mjs --in ../examples/paper-launch-demo/motion.html --out ../examples/paper-launch-demo/kadr-launch.mp4
```
