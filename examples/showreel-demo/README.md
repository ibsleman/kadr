# showreel-demo

A complete run of `motions/showreel`, built and rendered with this skill.

**Concept:** *the grid becomes type becomes form becomes signal.*

Six shots on a 120 BPM grid, each made out of the one before it:

1. the 12-column grid, a scan of orange across it, two rules, an orange wipe → **GRID**
2. the columns collapse into the letters of **MOTION**, one per beat; the O becomes a ring
3. the ring breaks into circle, square, triangle, bar — one per beat
4. the shapes stack into 3D contour forms
5. the forms slice into bands and become a running sequencer — the data moment
6. the band opens into the end title, then closes back into the grid of shot 1, so it loops

Everything is a pure function of `t` inside `window.seek(t)`. The soundtrack — kick, hats,
clap, bass stabs, a riser into the last bar, a hit on every shot change — is synthesized in
the page with `OfflineAudioContext`.

## Rebuild it

```bash
cd ../../scripts
node render.mjs --in ../examples/showreel-demo/motion.html --probe --probe-step 0.5
node render.mjs --in ../examples/showreel-demo/motion.html --out ../examples/showreel-demo/kadr-showreel.mp4
```

Open `motion.html` in a browser with no query string to watch it live.
