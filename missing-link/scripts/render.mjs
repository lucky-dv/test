#!/usr/bin/env node
/*
 * Export the motion graphic to MP4 (and optional stills).
 *
 *   node scripts/render.mjs                          → out/missing-link-4x5.mp4 (1080 × 1350)
 *   node scripts/render.mjs --format landscape       → out/missing-link-3x2.mp4 (1536 × 1024)
 *   node scripts/render.mjs --fps 60                 → 60 fps export
 *   node scripts/render.mjs --stills 0,3,6,9,12,16   → PNG stills only
 *   node scripts/render.mjs --verify                 → check the final frame against the source
 *
 * Frames are rendered by the same page used for preview (index.html?render),
 * captured losslessly and piped into ffmpeg (H.264, yuv420p, BT.709).
 * Every export first verifies that the fully revealed page equals the source.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf('--' + name);
  return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
};

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const g = execSync('npm root -g').toString().trim();
  return createRequire(path.join(g, 'noop.js'))('playwright');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
function serve() {
  const server = createServer(async (req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const { chromium } = await loadPlaywright();
const server = await serve();
const port = server.address().port;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
});
const format = String(arg('format', 'portrait'));
const dims = { portrait: [1080, 1350], landscape: [1536, 1024] }[format];
if (!dims) { console.error('unknown --format', format); process.exit(1); }
const page = await browser.newPage({ viewport: { width: dims[0], height: dims[1] }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => { console.error('[page error]', e); process.exit(1); });
await page.goto(`http://127.0.0.1:${port}/index.html?render&format=${format}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const cfg = await page.evaluate(() => window.MOTION_CONFIG);
const fmt = await page.evaluate(() => window.__format);

// The final, fully revealed page must be the supplied artwork, pixel for pixel.
const v = await page.evaluate(() => window.__verify());
console.log('verify:', JSON.stringify(v));
if (v.differingPixels || v.unassigned || v.empty.length) {
  console.error('final frame does not match the source artwork; refusing to export');
  process.exit(1);
}
if (args.includes('--verify')) { await browser.close(); server.close(); process.exit(0); }

const clip = { x: 0, y: 0, width: fmt.width, height: fmt.height };
const shot = async t => {
  await page.evaluate(t => window.__renderFrame(t), t);
  return page.screenshot({ type: 'png', clip, animations: 'disabled' });
};

await mkdir(path.join(root, 'out'), { recursive: true });

const stills = arg('stills', null);
if (stills) {
  const { writeFile } = await import('node:fs/promises');
  for (const s of String(stills).split(',')) {
    const t = parseFloat(s);
    const f = path.join(root, 'out', `still-${format}-${t.toFixed(2)}.png`);
    await writeFile(f, await shot(t));
    console.log('wrote', path.relative(root, f));
  }
} else {
  const fps = Number(arg('fps', cfg.fps));
  const outFile = path.join(root, arg('out', format === 'landscape' ? 'out/missing-link-3x2.mp4' : 'out/missing-link-4x5.mp4'));
  const frames = Math.round(cfg.duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'stillimage',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const buf = await shot(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 30 === 0) process.stdout.write(`\rframe ${f}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\rwrote ${path.relative(root, outFile)} · ${frames} frames @ ${fps}fps · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

await browser.close();
server.close();
