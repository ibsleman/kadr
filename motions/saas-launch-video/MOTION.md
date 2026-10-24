---
name: saas-launch-video
title: "SaaS launch video"
source: https://prompt-motion.com/aschapmann-131210
author: "Axel Schapmann"
handle: "@aschapmann"
post: https://x.com/aschapmann/status/2104230888812724497
tags: ["Product UI", "Music"]
model: "Opus 5.5"
posted: 2026-09-27
reference: reference.mp4
full_video: https://media.prompt-motion.com/aschapmann-i-couldn-t-resist-to/video.fb3e8bec.mp4
---

# SaaS launch video

**Makes:** Product UI · Music
**Prompt by:** Axel Schapmann (@aschapmann) — [original post](https://x.com/aschapmann/status/2104230888812724497)
**Run on:** Opus 5.5

## Prompt

```
Act as a senior motion designer and build a 30-second launch video for [product] in Remotion, entirely in code so I can edit and re-render it: first read my landing page and codebase to pull the real story, copy, colors, font and logo file (trace the logo to SVG so it stays sharp and can be animated), then write the video as one story (why the market matters, why it's painful today, how [product] fixes it, what you get) in 4 to 5 scenes with one short title each, animate everything like a premium product film (kinetic typography word by word, spring easing, smooth camera pushes and pans, depth and glow, elements that build in on the beat instead of just appearing), keep each scene on screen long enough to read, add one soft sound effect for every element that appears and silence otherwise, and end on a memorable animated logo reveal with the tagline and URL, then render it, check the frames yourself and fix anything that overlaps, clips or feels rushed before showing me the result.
```


## Notes

- Keep the ban list and the beat grid from `references/laws.md`.
- Build and render with `references/pipeline.md`. Probe before the full render.
- `reference.mp4` is what this prompt produced, unedited. If it is missing, run `node scripts/harvest.mjs --all`.
- Full-quality reference: https://media.prompt-motion.com/aschapmann-i-couldn-t-resist-to/video.fb3e8bec.mp4
