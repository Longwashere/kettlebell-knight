#!/usr/bin/env node
/**
 * shrink-vfx — TV-sized copies of the Spine VFX rigs.
 *
 *   npm run vfx:shrink              public/assets/spine/vfx/<name>/ → public/assets/spine/vfx-tv/<name>/
 *   npm run vfx:shrink -- --max 384 (longest atlas page side in px, default 512)
 *
 * The source atlases are authored for 1080p (pages up to 3040², ~37 MB of VRAM each), but the game renders
 * at 426×240. This resizes each atlas page with macOS `sips` and scales every region's bounds/offsets by the
 * same factor. Attachment sizes live in the skeleton JSON, so the rig renders at the same size, just from a
 * smaller texture. The skeleton JSON is copied unchanged. Re-run after adding or updating a VFX.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public/assets/spine/vfx');
const OUT = path.join(ROOT, 'public/assets/spine/vfx-tv');
const maxArg = process.argv.indexOf('--max');
const MAX = maxArg > 0 ? Number(process.argv[maxArg + 1]) : 512;

const NUMERIC = new Set(['size', 'bounds', 'offsets', 'xy', 'offset', 'orig']);

function shrinkAtlas(text, factor) {
  const out = [];
  const pages = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(\s*)(\w+):\s*(.+)$/);
    if (m && NUMERIC.has(m[2]) && /^[\d,\s-]+$/.test(m[3])) {
      const nums = m[3].split(',').map((n) => Math.max(m[2] === 'offsets' || m[2] === 'offset' || m[2] === 'xy' ? 0 : 1, Math.round(Number(n) * factor)));
      out.push(`${m[1]}${m[2]}:${nums.join(',')}`);
      continue;
    }
    // A page header is a bare file name line (e.g. "BlastTNT.png")
    if (/\.(png|webp|jpg)$/i.test(line.trim())) pages.push(line.trim());
    out.push(line);
  }
  return { text: out.join('\n'), pages };
}

const report = [];
for (const name of fs.readdirSync(SRC).filter((d) => fs.statSync(path.join(SRC, d)).isDirectory())) {
  const dir = path.join(SRC, name);
  const atlasFile = fs.readdirSync(dir).find((f) => f.endsWith('.atlas'));
  const jsonFile = fs.readdirSync(dir).find((f) => f.endsWith('.json'));
  if (!atlasFile || !jsonFile) continue;
  const atlas = fs.readFileSync(path.join(dir, atlasFile), 'utf8');
  const sizes = [...atlas.matchAll(/^size:\s*(\d+),(\d+)/gm)].map((m) => Math.max(Number(m[1]), Number(m[2])));
  const factor = Math.min(1, MAX / Math.max(...sizes));
  const outDir = path.join(OUT, name);
  fs.mkdirSync(outDir, { recursive: true });
  const { text, pages } = shrinkAtlas(atlas, factor);
  fs.writeFileSync(path.join(outDir, atlasFile), text);
  fs.copyFileSync(path.join(dir, jsonFile), path.join(outDir, jsonFile));
  for (const page of pages) {
    const sizeLine = atlas.slice(atlas.indexOf(page)).match(/size:\s*(\d+),(\d+)/);
    const w = Math.max(1, Math.round(Number(sizeLine[1]) * factor));
    const h = Math.max(1, Math.round(Number(sizeLine[2]) * factor));
    execFileSync('sips', ['-z', String(h), String(w), path.join(dir, page), '--out', path.join(outDir, page)], { stdio: 'ignore' });
    const before = Number(sizeLine[1]) * Number(sizeLine[2]) * 4 / 1048576;
    report.push(`${name.padEnd(17)} ${sizeLine[1]}x${sizeLine[2]} → ${w}x${h}   VRAM ~${before.toFixed(1)} MB → ~${(w * h * 4 / 1048576).toFixed(2)} MB`);
  }
}
console.log(report.join('\n'));
console.log(`→ ${path.relative(ROOT, OUT)}/`);
