---
name: paper-style-product-launch-film
title: "Paper-style product launch film"
source: https://prompt-motion.com/ik-builds-b8bdcf
author: "Ittehadul Karim"
handle: "@ik_builds"
post: https://x.com/ik_builds/status/2103890476885585923
tags: ["Charts", "Diagrams", "Music"]
model: "Opus 5.5"
effort: "Medium"
posted: 2026-09-26
reference: reference.mp4
full_video: https://media.prompt-motion.com/ik-builds-i-was-quoted-3000/video.12e81ac7.mp4
---

# Paper-style product launch film

**Makes:** Charts · Diagrams · Music
**Prompt by:** Ittehadul Karim (@ik_builds) — [original post](https://x.com/ik_builds/status/2103890476885585923)
**Run on:** Opus 5.5, effort Medium

## Prompt

```
Create a 15s motion-graphics film explaining {{PRODUCT}}. HyperFrames + GSAP, no voiceover, no footage.
Style: paper-light canvas, marker notes that draw on, real physics, huge kinetic type,
hard light/dark switches, a new idea every 1.5–2 s, a sound on every hit.

COPY: read {{POSITIONING_DOCS}} first. {{ONE_LINER}} For {{AUDIENCE}}. {{WHAT_IT_DOES}}
Name what the product learns, never the abstraction.

RULES
- No chrome (scrubber, timecode, fps, headers). No animator jargon on screen
  ("squash", "stagger", "easing"...). Every word speaks to the buyer.
- No invented results: no %, multipliers, customer names or figures.
- Never use: {{BANNED_WORDS}}.
- Logo: real mark {{LOGO_FILE}} + "{{PRODUCT}}" in {{WORDMARK_FONT}}; never a boxed logo file.

CRAFT
- Colours {{COLOR_CANVAS}} / {{COLOR_INK}} / {{COLOR_ACCENT_1}} / {{COLOR_ACCENT_2}}; notes in the
  accents; dark mode = charcoal matching the palette.
- Fonts {{BRAND_FONTS}}; Anton for kinetic type; Caveat handwriting via stroke-dashoffset.
- Real easing, squash/stretch, stagger, overlap, onion skin, smear, follow-through. Check the
  HyperFrames registry first. Set every from-state at t=0 (seek-safe); never cover an exit.
  One primary move per transition; no generic push/slide/rotate-swing.
- Music in sections: drums drop on the dark switch and while the ball is airborne, slam back
  on the type and the logo. SFX: pops, pen scribbles, whooshes, logo sub-hit. CC0 or generated
  only; log sources. Master -14 LUFS, -2 dBTP, re-measured after AAC encode.
```


## Notes

- Keep the ban list and the beat grid from `references/laws.md`.
- Build and render with `references/pipeline.md`. Probe before the full render.
- `reference.mp4` is what this prompt produced, unedited. If it is missing, run `node scripts/harvest.mjs --all`.
- Full-quality reference: https://media.prompt-motion.com/ik-builds-i-was-quoted-3000/video.12e81ac7.mp4
