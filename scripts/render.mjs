#!/usr/bin/env node
/**
 * render.mjs — turn a deterministic motion page into an MP4.
 *
 *   node render.mjs --in motion.html --out motion.mp4
 *   node render.mjs --in motion.html --probe --probe-step 0.5
 *   node render.mjs --in motion.html --probe-at 0,1.5,3.25
 *
 * The page must define window.seek(t) and should define window.DURATION.
 * If it defines window.renderAudio() returning a WAV ArrayBuffer, the audio is muxed in.
 *
 * Frames are piped straight to ffmpeg; nothing large touches the disk.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  return next === undefined || next.startsWith('--') ? true : next;
};
const num = (name, fallback) => {
  const v = flag(name);
  return v === undefined || v === true ? fallback : Number(v);
};

const input = flag('in');
if (!input) {
  console.error('render.mjs: --in <page.html> is required');
  process.exit(1);
}
const inPath = path.resolve(input);
if (!fs.existsSync(inPath)) {
  console.error(`render.mjs: no such file: ${inPath}`);
  process.exit(1);
}

const width = num('width', 1920);
const height = num('height', 1080);
const fps = num('fps', 60);
const sub = Math.max(1, num('sub', 3));
const crf = num('crf', 16);
const outPath = path.resolve(flag('out', inPath.replace(/\.html?$/i, '.mp4')));
const workDir = path.dirname(outPath);

const audioOnly = flag('audio-only') === true;
const isProbe = flag('probe') === true || flag('probe-at') !== undefined;
const probeStep = num('probe-step', 0.5);
const probeAt = flag('probe-at');
const probeDir = path.resolve(flag('probe-dir', path.join(workDir, 'probe')));

const log = (...a) => console.log('[render]', ...a);

// ---------------------------------------------------------------- page

const browser = await chromium.launch({
  args: ['--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

page.on('pageerror', (e) => console.error('[page error]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[page console]', m.text());
});

const url = pathToFileURL(inPath).href + '?render';
await page.goto(url, { waitUntil: 'load' });

// fonts, images and videos must be ready before the first screenshot
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((img) =>
      img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })
    )
  );
  await Promise.all(
    [...document.querySelectorAll('video')].map((v) =>
      v.readyState >= 2 ? null : new Promise((r) => { v.onloadeddata = v.onerror = r; })
    )
  );
});

const hasSeek = await page.evaluate(() => typeof window.seek === 'function');
if (!hasSeek) {
  console.error('render.mjs: the page does not define window.seek(t)');
  await browser.close();
  process.exit(1);
}

const duration = num('duration', await page.evaluate(() => window.DURATION || 15));
log(`${path.basename(inPath)} · ${width}x${height} · ${fps}fps · ${duration}s · ${sub} subframe(s)`);

const seek = async (t) => {
  await page.evaluate((tt) => window.seek(tt), t);
  // let any layout/style the page just set actually commit
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
};

// ---------------------------------------------------------------- probe

if (isProbe) {
  fs.mkdirSync(probeDir, { recursive: true });
  const times =
    probeAt && probeAt !== true
      ? String(probeAt).split(',').map(Number).filter((n) => !Number.isNaN(n))
      : Array.from({ length: Math.floor(duration / probeStep) + 1 }, (_, i) => i * probeStep);

  for (const t of times) {
    await seek(t);
    const name = `t${t.toFixed(2).padStart(6, '0')}.png`;
    await page.screenshot({ path: path.join(probeDir, name), type: 'png' });
  }
  log(`${times.length} probe frames -> ${probeDir}`);
  log('open them and look before rendering in full');
  await browser.close();
  process.exit(0);
}

// ---------------------------------------------------------------- audio

let audioPath = null;
try {
  const b64 = await page.evaluate(async () => {
    if (typeof window.renderAudio !== 'function') return null;
    const buf = await window.renderAudio();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  });
  if (b64) {
    audioPath = path.join(workDir, path.basename(outPath, path.extname(outPath)) + '.wav');
    fs.writeFileSync(audioPath, Buffer.from(b64, 'base64'));
    log(`audio -> ${path.basename(audioPath)} (${(fs.statSync(audioPath).size / 1e6).toFixed(1)} MB)`);
  } else {
    log('no window.renderAudio() — rendering silent');
  }
} catch (e) {
  console.error('[render] renderAudio() failed, continuing silent:', e.message);
}

// --audio-only: keep the rendered frames, swap in a freshly mixed track
if (audioOnly) {
  await browser.close();
  if (!audioPath) { console.error('render.mjs: --audio-only needs window.renderAudio()'); process.exit(1); }
  if (!fs.existsSync(outPath)) { console.error(`render.mjs: --audio-only needs an existing ${outPath}`); process.exit(1); }
  const tmp = outPath.replace(/\.mp4$/i, '.remux.mp4');
  const mux = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', outPath, '-i', audioPath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp,
  ], { stdio: 'inherit' });
  const [mc] = await once(mux, 'close');
  if (mc !== 0) process.exit(mc ?? 1);
  fs.renameSync(tmp, outPath);
  log(`audio replaced in ${outPath}`);
  process.exit(0);
}

// ---------------------------------------------------------------- ffmpeg

const vf = [];
if (sub > 1) {
  vf.push(`tmix=frames=${sub}:weights='${Array(sub).fill(1).join(' ')}'`);
  vf.push(`select='eq(mod(n\\,${sub})\\,${sub - 1})'`);
}
vf.push(`setpts=N/${fps}/TB`);

const args = [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(fps * sub), '-i', '-',
];
if (audioPath) args.push('-i', audioPath);
args.push(
  '-vf', vf.join(','),
  '-r', String(fps),
  '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart'
);
if (audioPath) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push(outPath);

fs.mkdirSync(workDir, { recursive: true });
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = once(ff, 'close');
ff.stdin.on('error', () => {}); // ffmpeg exiting early must not crash the loop

const totalFrames = Math.round(duration * fps);
const t0 = Date.now();

for (let n = 0; n < totalFrames; n++) {
  for (let k = 0; k < sub; k++) {
    await seek((n + k / sub) / fps);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await once(ff.stdin, 'drain');
  }
  if (n % Math.max(1, Math.round(fps)) === 0 || n === totalFrames - 1) {
    const pct = ((n + 1) / totalFrames) * 100;
    const el = (Date.now() - t0) / 1000;
    const eta = el / ((n + 1) / totalFrames) - el;
    process.stdout.write(
      `\r[render] ${String(Math.round(pct)).padStart(3)}%  ${n + 1}/${totalFrames} frames  eta ${Math.round(eta)}s   `
    );
  }
}
process.stdout.write('\n');

ff.stdin.end();
await browser.close();

const [code] = await ffDone;
if (code !== 0) {
  console.error(`render.mjs: ffmpeg exited ${code}`);
  process.exit(code ?? 1);
}

const mb = (fs.statSync(outPath).size / 1e6).toFixed(1);
log(`done in ${Math.round((Date.now() - t0) / 1000)}s -> ${outPath} (${mb} MB)`);
