# Kadr

**كادر** — the cinematic frame.

A Claude Code skill that makes motion graphics videos: one deterministic HTML file,
rendered frame by frame into a 1920×1080 60fps MP4, with a soundtrack written in code.

Ask for a motion. Claude picks a recipe from a catalog of **236**, binds it to your
subject, builds the page, checks one frame per beat, and renders the film.

**Two finished films, both made by this skill:**
[the showreel](examples/showreel-demo/kadr-showreel.mp4) · [the paper launch film](examples/paper-launch-demo/kadr-launch.mp4)

## Install

```bash
npx skills add https://github.com/ibsleman/kadr --skill "kadr"
```

Then, once, inside the skill directory:

```bash
cd scripts && npm install && npx playwright install chromium
node harvest.mjs --all
```

The first command installs the renderer. The second fetches the catalog's reference
videos (~15 seconds, ~25 MB) — they are not shipped in this repository; see
**Credit and rights** below.

**Also needs:** Node 18+ and ffmpeg on PATH (`brew install ffmpeg`).

## Use

> make me a 15 second showreel for my studio

> turn this landing page into a product film

> animate these numbers as a data film

> explain this in the paper style

## Why the videos don't look generated

Most browser-recorded motion looks like a screen capture. This does not, because of four
rules the skill never breaks:

1. **Every pixel is a pure function of time.** The page exposes `window.seek(t)` and
   nothing else. No CSS animations, no timers, no state carried between frames, no
   unseeded randomness. The same `t` always gives the same frame.
2. **Real motion blur.** Each output frame is three sub-frames averaged with ffmpeg
   `tmix` — a 1/60s shutter sampled three times, like a real camera.
3. **The soundtrack is synthesized in the page** with `OfflineAudioContext`, on the same
   beat grid as the visuals, so nothing drifts.
4. **One frame per beat is checked before the full render.** Cluttered, off-beat,
   overlapping or unreadable frames get fixed first.

There is also a ban list — particle bursts, glows, lens flares, camera shake, crossfades,
bouncy easing, default three.js materials — in `references/laws.md`.

## What is in here

| Path | What it is |
|---|---|
| `SKILL.md` | the workflow Claude follows |
| `catalog.json` | the index of all 236 motions: tags, author, source |
| `motions/<name>/MOTION.md` | one recipe: the prompt, who wrote it, how it was run |
| `references/pipeline.md` | the render pipeline, in full |
| `references/laws.md` | the design rules and the ban list |
| `references/audio.md` | synthesizing the soundtrack in code |
| `scripts/render.mjs` | frame capture → motion blur → mux |
| `scripts/harvest.mjs` | pull the catalog from the source gallery |
| `examples/showreel-demo/` | a finished showreel: HTML, MP4, shot list |
| `examples/paper-launch-demo/` | a finished paper-style launch film |

## The renderer on its own

`scripts/render.mjs` works on any page that defines `window.seek(t)`:

```bash
node render.mjs --in motion.html --probe --probe-step 0.5   # look before you render
node render.mjs --in motion.html --out motion.mp4           # 1920x1080, 60fps, 3 subframes
node render.mjs --in motion.html --out motion.mp4 --audio-only   # re-mix, keep the frames
```

Frames are piped straight into ffmpeg, so a 15s film never writes 2,700 PNGs to disk.

## Credit and rights

The recipes in `motions/` come from the public gallery at
**[prompt-motion.com](https://prompt-motion.com)**. Each prompt was written and posted by
the person named in its `MOTION.md` and in [CREDITS.md](CREDITS.md), where the gallery
offers it to be copied. This repository collects those prompts with attribution and a link
back, and adds the render pipeline around them.

**Reference videos are not redistributed here.** They are their creators' finished work.
`harvest.mjs` fetches them from the gallery onto your machine, and each `MOTION.md` keeps
the source URL.

Code in this repository is MIT (see [LICENSE](LICENSE)). Rights in each prompt stay with
its author. If you wrote one and want it out, open an issue.
