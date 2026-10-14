/**
 * Renders the procedural sound bank (src/shared/sfx/bank.ts) to work/sfx/<name>.wav plus an index.html
 * player for auditioning, and prints each sound's length, size and render time.
 *
 *   npm run sfx                 # every sound
 *   npm run sfx -- slash ice    # just these
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SFX_BANK, SR, type SoundId } from '../src/shared/sfx/bank';

const OUT = join(process.cwd(), 'work', 'sfx');
mkdirSync(OUT, { recursive: true });

function wav(data: Float32Array): Buffer {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  return b;
}

const want = process.argv.slice(2);
const ids = (Object.keys(SFX_BANK) as SoundId[]).filter((id) => !want.length || want.includes(id));
let totalBytes = 0;
let totalMs = 0;
const rows: string[] = [];
for (const id of ids) {
  const t0 = performance.now();
  const data = SFX_BANK[id].render();
  const ms = performance.now() - t0;
  let bad = 0;
  for (const v of data) if (!Number.isFinite(v)) bad++;
  totalMs += ms;
  totalBytes += data.byteLength;
  writeFileSync(join(OUT, `${id}.wav`), wav(data));
  rows.push(`<tr><td>${id}</td><td>${(data.length / SR).toFixed(2)}s</td><td><audio controls preload="none" src="${id}.wav"></audio></td></tr>`);
  console.log(`${id.padEnd(14)} ${(data.length / SR).toFixed(2)}s  ${(data.byteLength / 1024).toFixed(0).padStart(4)} KB  ${ms.toFixed(1)} ms${bad ? `  !! ${bad} non-finite samples` : ''}`);
}
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>KK sound bank</title>
<style>body{font:14px monospace;background:#0f0e17;color:#fffbea}td{padding:2px 10px}</style>
<p>Press a row's play button. Keys 1-9 aren't bound; this is just a list.</p><table>${rows.join('\n')}</table>`);
console.log(`\n${ids.length} sounds · ${(totalBytes / 1024 / 1024).toFixed(2)} MB of PCM in memory · ${totalMs.toFixed(0)} ms to render (Node) → ${OUT}`);
