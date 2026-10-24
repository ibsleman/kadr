#!/usr/bin/env node
/**
 * harvest.mjs — add motions from the prompt-motion.com gallery to this skill.
 *
 *   node harvest.mjs --list                       # every slug in the gallery
 *   node harvest.mjs stephanlivera-df17a2         # one entry, by slug or URL
 *   node harvest.mjs templates/showreel --name showreel
 *   node harvest.mjs --all                        # the whole gallery
 *   node harvest.mjs --all --media video          # ...with full-quality references
 *
 * Plain HTTP, no browser: every page is server-rendered, so the prompt, the tags,
 * the model and the JSON-LD are all in the raw HTML. ~20s for the whole gallery.
 *
 * --media  preview (default, ~100 KB each) | poster (~18 KB) | video (~6 MB) | none
 * --concurrency N   default 12
 *
 * Writes motions/<name>/MOTION.md plus a reference file, then rebuilds
 * catalog.json and CREDITS.md. Credit for each prompt stays with whoever posted it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MOTIONS = path.join(ROOT, 'motions');
const SITE = 'https://prompt-motion.com';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 || !argv[i + 1] || argv[i + 1].startsWith('--') ? d : argv[i + 1];
};
const VALUE_FLAGS = new Set(['--name', '--limit', '--media', '--concurrency']);
const targets = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(argv[i - 1])));

const MEDIA = opt('media', 'preview');            // preview | poster | video | none
const CONC = Math.max(1, Number(opt('concurrency', 12)));

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48);
const toUrl = (t) => (t.startsWith('http') ? t : `${SITE}/${t.replace(/^\//, '')}`);

const unesc = (s) =>
  s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')
   .replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
   .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/')
   .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
   .trim();

const get = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'kadr-skill/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

/* run `fn` over `items`, at most `n` at a time */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      try { out[k] = await fn(items[k], k); }
      catch (e) { out[k] = null; console.error(`  ! ${items[k]}: ${e.message}`); }
    }
  }));
  return out.filter(Boolean);
}

/* ---------------------------------------------- the gallery index + media map */

async function index() {
  const html = await get(SITE);

  // the entry links are plain anchors in the markup
  const skip = new Set(['/templates', '/customize', '/sponsor', '/blog']);
  const slugs = [...new Set(
    [...html.matchAll(/href="(\/[a-z0-9][a-z0-9-]+)"/g)].map((m) => m[1])
  )].filter((h) => !skip.has(h));

  // only the first few cards are server-rendered as <video>; the rest of the
  // preview URLs sit in the page's data payload, nowhere near their link. So
  // index them by media folder instead of by position — the detail page's
  // poster URL carries the same folder, which is what joins the two.
  const preview = new Map();
  for (const m of html.matchAll(
    /https:\/\/media\.prompt-motion\.com\/([A-Za-z0-9._-]+)\/preview\.[a-z0-9]+\.mp4/g
  )) if (!preview.has(m[1])) preview.set(m[1], m[0]);

  return { slugs, preview };
}

const mediaFolder = (url) => (url || '').match(/prompt-motion\.com\/([^/]+)\//)?.[1] || null;

/* ---------------------------------------------- parse one page */

function parse(html, url) {
  const pick = (re) => { const m = html.match(re); return m ? m[1] : null; };

  let ld = null;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); if (j['@type'] === 'VideoObject') { ld = j; break; } } catch {}
  }

  const meta = {};
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))
    meta[unesc(m[1])] = unesc(m[2]);

  const blocks = [...html.matchAll(/<div[^>]*whitespace-pre-wrap[^>]*>([\s\S]*?)<\/div>/g)]
    .map((m) => unesc(m[1])).filter(Boolean);

  const tags = [...html.matchAll(/<a[^>]*href="\/tags\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => unesc(m[1])).filter(Boolean);

  return {
    url,
    title: unesc(pick(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ''),
    blocks,
    meta,
    tags: [...new Set(tags)],
    template: pick(/href="(\/templates\/[a-z0-9-]+)"/),
    post: pick(/href="(https:\/\/x\.com\/[^"]+\/status\/[^"]+)"/),
    install: (() => { const m = html.match(/(npx skills add[^<]{0,300})/); return m ? unesc(m[1]) : null; })(),
    poster: ld?.thumbnailUrl?.[0] || pick(/(https:\/\/media\.prompt-motion\.com\/[A-Za-z0-9._-]+\/poster\.[a-z0-9]+\.webp)/),
    video: ld?.contentUrl || pick(/(https:\/\/media\.prompt-motion\.com\/[A-Za-z0-9._-]+\/video\.[a-z0-9]+\.mp4)/),
    ld,
  };
}

/* ---------------------------------------------- write one motion */

async function emit(d, media, name) {
  const dir = path.join(MOTIONS, name);
  fs.mkdirSync(dir, { recursive: true });

  const author = d.ld?.creator?.name || null;
  const handle = d.ld?.creator?.url?.replace(/^https?:\/\/x\.com\//, '') || null;

  const sorted = [...d.blocks].sort((a, b) => b.length - a.length);
  const prompt = sorted[0] || null;
  const original = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  // reference file
  let ref = null;
  const src = MEDIA === 'none' ? null
    : MEDIA === 'video' ? d.video
    : MEDIA === 'poster' ? d.poster
    : (media || d.poster);
  if (src) {
    const ext = src.endsWith('.webp') ? 'webp' : 'mp4';
    const other = ext === 'mp4' ? 'webp' : 'mp4';
    try {
      const r = await fetch(src);
      if (r.ok) {
        fs.writeFileSync(path.join(dir, `reference.${ext}`), Buffer.from(await r.arrayBuffer()));
        ref = `reference.${ext}`;
        // drop a reference left by an earlier run with a different --media
        const stale = path.join(dir, `reference.${other}`);
        if (fs.existsSync(stale)) fs.rmSync(stale);
      }
    } catch (e) { console.error(`  ! media: ${e.message}`); }
  }

  const fm = [
    '---',
    `name: ${name}`,
    `title: ${JSON.stringify(d.title)}`,
    `source: ${d.url}`,
    author ? `author: ${JSON.stringify(author)}` : null,
    handle ? `handle: "@${handle}"` : null,
    d.post ? `post: ${d.post}` : null,
    `tags: [${d.tags.map((t) => JSON.stringify(t)).join(', ')}]`,
    d.meta.Model ? `model: ${JSON.stringify(d.meta.Model)}` : null,
    d.meta.Effort ? `effort: ${JSON.stringify(d.meta.Effort)}` : null,
    d.ld?.uploadDate ? `posted: ${d.ld.uploadDate}` : null,
    d.template ? `template: ${SITE}${d.template}` : null,
    ref ? `reference: ${ref}` : null,
    d.video ? `full_video: ${d.video}` : null,
    '---',
  ].filter(Boolean).join('\n');

  const body = [
    '',
    `# ${d.title}`,
    '',
    d.tags.length ? `**Makes:** ${d.tags.join(' · ')}` : null,
    author ? `**Prompt by:** ${author} (@${handle})${d.post ? ` — [original post](${d.post})` : ''}` : null,
    d.meta.Model ? `**Run on:** ${d.meta.Model}${d.meta.Effort ? `, effort ${d.meta.Effort}` : ''}` : null,
    '',
    '## Prompt',
    '',
    '```',
    prompt || '(none captured — open the source page)',
    '```',
    '',
    original && original !== prompt ? ['## Original prompt', '', '```', original, '```', ''].join('\n') : null,
    d.install ? ['## Install', '', '```bash', d.install.trim(), '```', ''].join('\n') : null,
    d.template ? `A stronger version of this prompt: ${SITE}${d.template}` : null,
    '',
    '## Notes',
    '',
    '- Keep the ban list and the beat grid from `references/laws.md`.',
    '- Build and render with `references/pipeline.md`. Probe before the full render.',
    ref ? `- \`${ref}\` is what this prompt produced, unedited. If it is missing, run \`node scripts/harvest.mjs --all\`.` : null,
    d.video ? `- Full-quality reference: ${d.video}` : null,
    '',
  ].filter((l) => l !== null).join('\n');

  fs.writeFileSync(path.join(dir, 'MOTION.md'), fm + '\n' + body);
  return { name, title: d.title };
}

/* Two entries can share a title, so names are assigned in one pass, in slug
   order, after every page is parsed — never inside the concurrent pool. */
function assignNames(parsed, forcedName) {
  const taken = new Set();
  return parsed.map((d) => {
    if (forcedName) return forcedName;
    const base = slugify(d.title) || 'motion';
    if (!taken.has(base)) { taken.add(base); return base; }
    const handle = d.ld?.creator?.url?.replace(/^https?:\/\/x\.com\//, '') || '';
    for (const suffix of [slugify(handle), (d.url.match(/-([a-z0-9]+)$/) || [])[1] || '']) {
      const n = `${base}-${suffix}`.replace(/-+$/, '');
      if (suffix && !taken.has(n)) { taken.add(n); return n; }
    }
    let i = 2, n = `${base}-${i}`;
    while (taken.has(n)) n = `${base}-${++i}`;
    taken.add(n); return n;
  });
}

async function collect(urls, preview, forcedName) {
  const parsed = (await pool(urls, CONC, async (u) => {
    const d = parse(await get(u), u);
    return d.title ? d : null;
  }));
  const names = assignNames(parsed, forcedName);
  let done = 0;
  const out = await pool(parsed, CONC, async (d, i) => {
    const r = await emit(d, preview.get(mediaFolder(d.poster)), names[i]);
    process.stdout.write(`\r  ${++done}/${parsed.length}   `);
    return r;
  });
  if (parsed.length > 1) process.stdout.write('\n');
  return out;
}

/* ---------------------------------------------- catalog + credits */

function rebuildCatalog() {
  const entries = [];
  for (const name of fs.readdirSync(MOTIONS).sort()) {
    const f = path.join(MOTIONS, name, 'MOTION.md');
    if (!fs.existsSync(f)) continue;
    const fm = fs.readFileSync(f, 'utf8').split('---')[1] || '';
    const g = (k) => {
      const m = fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
      if (!m) return null;
      try { return JSON.parse(m[1]); } catch { return m[1].trim().replace(/^["']|["']$/g, ''); }
    };
    const tl = fm.match(/^tags:\s*\[(.*)\]$/m);
    const refName = g('reference');
    entries.push({
      name,
      title: g('title'),
      tags: tl && tl[1].trim() ? JSON.parse(`[${tl[1]}]`) : [],
      author: g('author'),
      handle: g('handle'),
      model: g('model'),
      source: g('source'),
      post: g('post'),
      reference: refName ? `motions/${name}/${refName}` : null,
      path: `motions/${name}/MOTION.md`,
    });
  }
  fs.writeFileSync(path.join(ROOT, 'catalog.json'), JSON.stringify({
    source: SITE,
    references: 'Not redistributed. Run `node scripts/harvest.mjs --all` to fetch them from the source gallery.',
    count: entries.length,
    motions: entries,
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(ROOT, 'CREDITS.md'), [
    '# Credits',
    '',
    `Every motion in this skill comes from the public gallery at <${SITE}>.`,
    'The prompt behind each one was written and posted by the person named below.',
    'This skill collects them, adds the render pipeline, and keeps the attribution.',
    '',
    '| Motion | Prompt by | Source |',
    '|---|---|---|',
    ...entries.map((e) =>
      `| ${e.title || e.name} | ${e.author ? `${e.author} (${e.handle})` : (/\/templates\//.test(e.source || '') ? 'Prompt Motion' : '—')} | [page](${e.source})${e.post ? ` · [post](${e.post})` : ''} |`),
    '',
  ].join('\n'));

  console.log(`catalog.json + CREDITS.md rebuilt — ${entries.length} motion(s)`);
}

/* ---------------------------------------------- main */

const t0 = Date.now();

if (has('list')) {
  const { slugs } = await index();
  console.log(slugs.join('\n'));
  console.log(`\n${slugs.length} entries`);
} else if (has('all')) {
  const { slugs, preview } = await index();
  const list = slugs.slice(0, Number(opt('limit', 1e9)));
  console.log(`harvesting ${list.length} entries · media=${MEDIA} · ${CONC} at a time`);
  const ok = await collect(list.map(toUrl), preview);
  console.log(`${ok.length} written in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  rebuildCatalog();
} else if (targets.length) {
  const preview = MEDIA === 'preview' ? (await index()).preview : new Map();
  const ok = await collect(targets.map(toUrl), preview,
                           targets.length === 1 ? opt('name', null) : null);
  for (const r of ok) console.log(`  + ${r.name}`);
  rebuildCatalog();
} else {
  console.log(`usage:
  node harvest.mjs --list
  node harvest.mjs <slug|url> [--name x]
  node harvest.mjs --all [--limit N] [--media preview|poster|video|none] [--concurrency N]`);
}
