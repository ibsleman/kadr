# Writing the soundtrack in code

No music files, no samples. The page synthesizes its own track with `OfflineAudioContext`
and hands back a WAV. This keeps the motion one self-contained file and keeps the audio
locked to the same beat grid as the visuals.

## The shape of it

```js
const BPM = 120, BEAT = 60 / BPM, SR = 48000;

window.renderAudio = async function () {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * window.DURATION), SR);
  const bus = ctx.createDynamicsCompressor();
  bus.threshold.value = -14; bus.ratio.value = 4; bus.attack.value = 0.003;

  // soft clipper. Without it the kick transients hit 0 dBFS and the WAV clips:
  // check with `ffmpeg -i out.wav -af volumedetect -f null -`, aim for max ≈ -2 dB
  const shaper = ctx.createWaveShaper();
  const N = 4096, curve = new Float32Array(N), drive = 1.7;
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  shaper.curve = curve; shaper.oversample = '4x';
  const master = ctx.createGain(); master.gain.value = 0.72;
  bus.connect(shaper).connect(master).connect(ctx.destination);

  const beats = Math.floor(window.DURATION / BEAT);
  for (let b = 0; b < beats; b++) kick(ctx, bus, b * BEAT);
  // ...hats, bass, stabs, riser, hits...

  return encodeWAV(await ctx.startRendering());
};
```

## Voices

Everything below is an oscillator or noise plus an envelope. That is all you need.

```js
const env = (ctx, node, t, a, d, peak = 1) => {
  const g = node.gain;
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(peak, t + a);
  g.exponentialRampToValueAtTime(0.0001, t + a + d);
};

// KICK — sine with a fast pitch drop
function kick(ctx, out, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
  env(ctx, g, t, 0.002, 0.26, 0.9);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
}

// NOISE buffer, reused for hats, claps and risers
function noise(ctx, dur) {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
  return b;
}

// HAT — highpassed noise, very short
function hat(ctx, out, t, open = false) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx, 0.2);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
  const g = ctx.createGain(); env(ctx, g, t, 0.001, open ? 0.14 : 0.035, 0.25);
  src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + 0.3);
}

// CLAP — bandpassed noise with three quick repeats
function clap(ctx, out, t) {
  [0, 0.011, 0.023].forEach((o, i) => {
    const src = ctx.createBufferSource(); src.buffer = noise(ctx, 0.3);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 1.2;
    const g = ctx.createGain(); env(ctx, g, t + o, 0.001, i === 2 ? 0.18 : 0.04, 0.4);
    src.connect(f).connect(g).connect(out); src.start(t + o); src.stop(t + o + 0.4);
  });
}

// BASS / STAB — saw through a moving lowpass
function stab(ctx, out, t, freq, dur = 0.22, type = 'sawtooth') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(freq * 10, t);
  f.frequency.exponentialRampToValueAtTime(freq * 2, t + dur);
  const g = ctx.createGain(); env(ctx, g, t, 0.004, dur, 0.3);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.1);
}

// RISER — noise sweeping up into the last full bar
function riser(ctx, out, t, dur) {
  const src = ctx.createBufferSource(); src.buffer = noise(ctx, dur + 0.2);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(9000, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + dur + 0.2);
}
```

## Arrangement

- **Kick on every beat.** That is the spine the eye locks onto.
- **Hat on every eighth**, open on the last eighth of a bar.
- **Clap on beats 2 and 4.**
- **A hit on every scene change** — a short noise burst plus a low sine thump, so the cut
  is heard as well as seen.
- **A riser into the last full bar**, ending exactly on the downbeat of the strongest
  moment.
- **Drop everything but the kick for one bar** somewhere in the middle. Silence is a
  technique.

## WAV encoding

```js
function encodeWAV(buf) {
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, ch, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
    }
  return out.buffer;
}
```

`render.mjs` calls `window.renderAudio()`, receives this buffer, writes `audio.wav` and
muxes it. If the function is not defined, the render is silent and still succeeds.

## Re-mixing without re-rendering the video

The frames and the audio are independent. To change the track after a full render:

```bash
node render.mjs --in motion.html --out motion.mp4 --audio-only
```

That re-runs `window.renderAudio()`, writes a fresh WAV and swaps it into the existing
MP4 with `-c:v copy` — seconds instead of minutes.
