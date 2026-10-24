---
name: kadr
description: Build broadcast-grade motion graphics videos from a prompt - one deterministic HTML file rendered frame-by-frame to MP4 with a code-written soundtrack. Use when the user asks for a motion graphics video, showreel, kinetic type, animated logo/intro, explainer, product film, 3D three.js piece, data or chart animation, or says "motion", "موشن", "حركة", "showreel", "animate this", "make a video from this", "motion design". Also use when the user names a motion from the catalog (e.g. "showreel", "3D gallery"). NOT for editing existing footage or talking-head video.
---

# Kadr

A catalog of motion-design recipes plus the render engine that turns any of them into a
finished 1920x1080 60fps MP4 with sound. Every recipe has been run; the reference video in
each motion folder is what it produced.

The point of this skill: **you never improvise a motion from scratch.** You pick a recipe
from `motions/`, bind it to the user's subject, and run it through one fixed pipeline.

---

## Workflow

### 1. Pick the motion

Read `catalog.json` (or the table below). Match on what the user wants to make, not on
wording. If nothing matches, use `motions/showreel/` as the base and adapt its direction
block — never start from a blank page.

If two recipes could fit, say which one you picked in one line and why, then continue. Do
not ask.

### 2. Bind it to the subject

Open the motion's `MOTION.md` and take its `<direction>`, `<structure>`, `<build>` and
`<start>` blocks. Replace only the subject-specific parts: the concept, the brand colors,
the typeface, the copy, the data. Keep every constraint — the ban list, the beat grid, the
`window.seek(t)` contract, the render settings. Those are what make it not look generated.

Then state the concept in one line and show a beat-by-beat (or shot-by-shot) storyboard
before writing any code.

### 3. Build

Read `references/pipeline.md` and follow it exactly. The hard contract:

- **One self-contained HTML file** at 1920x1080.
- **Every pixel is a pure function of time**, computed inside `window.seek(t)`.
  No CSS animations, no `requestAnimationFrame` driving state, no timers, no
  values carried between frames, no unseeded randomness.
- **The soundtrack is written in code** with `OfflineAudioContext` and rendered to WAV.
- Then render with `scripts/render.mjs`.

### 4. Check before the full render

Render one frame per beat (or per shot) and **look at them**. Fix anything cluttered,
off-beat, overlapping, clipping, or hard to read. Only then run the full render.

Check the audio too: `ffmpeg -i <out>.wav -af volumedetect -f null -` should show a max
around -2 dB, not 0.0. To re-mix without re-rendering the frames:

```bash
node render.mjs --in ../work/motion.html --out ../work/motion.mp4 --audio-only
```

Deliver the MP4 and the HTML file.

---

## Motion catalog

**236 motions.** `catalog.json` is the index: name, title, tags, author, source and
reference video for every one. Read it first and match on tags, then open that motion's
`MOTION.md` for the prompt.

| Tag | Motions |
|---|---|
| Product UI | 103 |
| Kinetic type | 96 |
| Music | 49 |
| Particles | 43 |
| Shapes | 42 |
| Charts | 34 |
| Diagrams | 31 |
| Characters | 27 |
| Photos | 23 |
| Phone | 22 |
| Code | 21 |

Two recipes are not single entries but reusable templates, and are the best starting point
when nothing else fits:

- `motions/showreel/` — the showreel: kinetic type, shape morphing, 2D-to-3D, a data
  moment, an end title, looping. Needs nothing from the user.
- `motions/realtime-3d/` — the three.js template: a film camera, physical materials, a
  signature pull-back shot.

Each `motions/<name>/reference.mp4` is what that prompt produced, unedited. Look at it
before building. For the full-quality version, the `full_video` field in the front matter
has the URL.

Two finished runs live in `examples/`. Read the one closest to what you are building:

- `examples/showreel-demo/` — the showreel: a beat grid, kinetic type, shape morphing,
  stacked 3D contours, a sequencer, a looping end title.
- `examples/paper-launch-demo/` — the paper launch film: closed-form physics with onion
  skin, draw-on strokes, handwriting revealed by a clip, one hard light/dark switch,
  a chart that argues a point, event-driven sound.

Between them they cover the whole `seek(t)` contract, the easing, the shot hand-offs and
the coded soundtrack.

## Setup, once

```bash
cd scripts && npm install && npx playwright install chromium
node harvest.mjs --all
```

ffmpeg must be on PATH. If `scripts/node_modules` is missing, run the first line before
rendering.

The reference videos are **not** stored in this repository — they belong to the people who
made them. `harvest.mjs --all` fetches them (~15s). Until then `motions/<name>/reference.*`
will be missing; the `full_video` URL in each `MOTION.md` front matter still points at the
original, so you can always look at one without a full harvest.

---

## The laws

Full list in `references/laws.md`. The short version, which applies to every motion:

**Banned, always:** particle bursts, glows, lens flares, camera shake, RGB split,
crossfades, generic gradients, bouncy easing, holds longer than half a second, default
three.js materials and lighting, floating text labels, a slowly spinning object as the
whole idea, anything that looks like a template.

**Required, always:** one concept named out loud before you start; one typeface; at most
three colors plus black and white; one consistent camera language; every shot made out of
the previous one, never cut or faded into; something happening on every beat.

---

## Adding a motion

Source gallery: <https://prompt-motion.com> — every entry there is a motion with the
prompt behind it, posted by its creator.

```bash
cd scripts
node harvest.mjs <slug-or-url> [--name my-motion]
```

That pulls the page, writes `motions/<name>/MOTION.md` with the prompt, author, model and
tags, downloads `reference.mp4`, and updates `catalog.json`.

Credit stays with the original poster: `MOTION.md` records the author handle and the
source URL, and `CREDITS.md` lists every one. Keep it that way.

---

## Files

- `references/pipeline.md` — the render pipeline, in full. Read it before building.
- `references/laws.md` — the design rules and the ban list.
- `references/audio.md` — writing the soundtrack in code.
- `scripts/render.mjs` — frame capture + motion blur + mux.
- `scripts/harvest.mjs` — add a motion from the gallery.
- `motions/<name>/MOTION.md` — one recipe.
- `motions/<name>/reference.mp4` — what that recipe produced.
