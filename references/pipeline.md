# The render pipeline

This is the only way motions in this skill get made. It is what separates a video that
looks rendered from a browser recording that looks like a screen capture.

Four stages: **deterministic page → coded soundtrack → frame capture with motion blur → mux.**

---

## 1. The page: one HTML file, every pixel a function of time

Write exactly one self-contained `.html` file. Inline the CSS and JS. Fonts come from
Google Fonts (or are embedded as base64). No build step, no bundler, no local server
needed beyond `file://`.

The page must expose one global:

```js
window.DURATION = 15;        // seconds
window.seek = function (t) { /* draw the frame at time t */ };
```

### The contract, which is not negotiable

`seek(t)` must produce **the same pixels for the same `t`, every time, in any order.**

That means:

| Banned | Use instead |
|---|---|
| CSS `@keyframes`, `transition`, `animation` | styles computed in `seek(t)` |
| `requestAnimationFrame` advancing state | `seek(t)` called by the renderer |
| `setTimeout` / `setInterval` | time branches inside `seek(t)` |
| `Date.now()`, `performance.now()` | the `t` argument |
| `Math.random()` | a seeded PRNG, reseeded per element from its index |
| variables mutated across frames | pure functions of `t` |
| video/GIF elements playing on their own clock | `video.currentTime = t` set inside `seek` |

A seeded PRNG that is enough:

```js
const rand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
};
```

### Preview mode

Add a driver so a human can watch it in a browser, but keep it outside `seek`:

```js
if (!location.search.includes('render')) {
  const t0 = performance.now();
  const loop = () => {
    window.seek(((performance.now() - t0) / 1000) % window.DURATION);
    requestAnimationFrame(loop);
  };
  loop();
}
```

The renderer loads the page with `?render`, so this loop never runs during capture.

### Easing

Linear tweens are the single clearest tell of generated motion. Use these, written as
pure functions of normalized time:

```js
const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOutExpo  = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const easeInOutCubic = x => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
// critically-damped spring, settles with no ring
const spring = (x, w = 12) => 1 - Math.exp(-w * x) * (1 + w * x);
// local progress of a segment that starts at `a` and lasts `d`
const seg = (t, a, d) => clamp01((t - a) / d);
```

Directional blur follows speed: take the derivative of the position you just computed
(`(p(t) - p(t - 1/60)) * 60`) and map its magnitude to a `blur()` or a smear, so fast
moves stay readable.

---

## 2. The soundtrack, written in code

Silent motion reads as a draft. Render a WAV with `OfflineAudioContext` — see
`references/audio.md` for the synth recipes (kick, clap, hat, bass, stab, riser, hit).

Expose it from the page:

```js
window.renderAudio = async function () {
  const ctx = new OfflineAudioContext(2, 48000 * window.DURATION, 48000);
  // ...schedule everything on the same beat grid the visuals use...
  const buf = await ctx.startRendering();
  return encodeWAV(buf);   // returns an ArrayBuffer of a 16-bit PCM WAV
};
```

The renderer calls it, writes `audio.wav`, and muxes it in. If `window.renderAudio` is
absent the render still succeeds, silently.

**The beat grid is shared.** Define `const BPM = 120, BEAT = 60 / BPM;` once and let both
the visuals and the audio read from it. Every visual change lands on a beat.

---

## 3. Frame capture with real motion blur

```bash
cd scripts
node render.mjs --in ../work/motion.html --out ../work/motion.mp4
```

What it does:

1. Opens the page in Chromium at the exact pixel size, `deviceScaleFactor: 1`, with
   `?render` in the URL.
2. Waits for `document.fonts.ready` and for every `<img>`/`<video>` to be decoded.
3. For output frame `n` and subframe `k` of `S`, calls
   `await window.seek((n + k / S) / fps)` and screenshots.
4. Pipes every PNG straight into ffmpeg — nothing is written to disk.
5. ffmpeg averages each group of `S` subframes (`tmix`) and keeps one per group, which
   *is* motion blur: a 1/60s shutter sampled 3 times, exactly like a real camera.
6. Muxes `audio.wav` if the page produced one.

The filter chain, for the record:

```
tmix=frames=3:weights='1 1 1',select='eq(mod(n\,3)\,2)',setpts=N/60/TB
```

Encoded `-c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p` with BT.709 tags, plus AAC
at 192k when there is audio.

**Defaults:** 1920x1080, 60fps, 3 subframes, duration from `window.DURATION`.

Raise `--sub` to 5 for pieces with very fast moves; lower it to 1 for a quick look.

---

## 4. Check before you commit to the full render

Never run the full render first. Run:

```bash
node render.mjs --in ../work/motion.html --probe --probe-step 0.5 --probe-dir ../work/probe
```

That writes one PNG every half second (or pass `--probe-at 0,1.2,3.4` for exact beats).
**Then open them and look.** You are checking for:

- type overlapping type, or running off the frame
- a shot that is just a held image for more than half a second
- anything off the beat grid
- contrast too low to read at a glance
- a transition that cuts instead of transforming

Fix, re-probe, and only then render in full.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Frames differ between runs | unseeded randomness or carried state | seed every random; make `seek` pure |
| Text renders in the wrong font | fonts not ready at first screenshot | the renderer awaits `document.fonts.ready`; also `await document.fonts.load('700 100px Geist')` |
| Video posters are black | `<video>` not seeked | set `video.currentTime` inside `seek`, and await `seeked` once at startup |
| Smearing looks wrong, not blurred | subframes too far apart | that is correct behaviour for a 180° shutter; lower `--sub` or slow the move |
| Render is very slow | screenshots at >1 scale, or a heavy canvas | keep `deviceScaleFactor: 1`; profile the page at 60fps in preview first |
| Audio drifts from the visuals | two different clocks | both must read the same `BPM`/`BEAT` constants |
