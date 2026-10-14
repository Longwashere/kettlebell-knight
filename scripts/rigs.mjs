#!/usr/bin/env node
/**
 * rigs — reference sheet for every monster rig, for picking animations when writing moves.
 *
 *   npm run rigs                 → work/rigs.md (all monsters)
 *   npm run rigs -- kraken wolf  → just those (MONSTER_CATALOG ids or sprite types), printed to stdout too
 *
 * For each monster: catalog name and sprite type, rig files, scale / on-screen height / facing / hover
 * offset, the engine's anim roles (idle, attack, hit…), every Spine animation with its length in 60 fps
 * frames and Spine events, which animations its moves already use, and its moveset. Reads the sources
 * (GameEngine.ts MONSTER_RIGS, battle.ts MONSTER_CATALOG, monsterMovesets.ts, move files) and the Spine
 * JSON directly, so it needs no dev server. Portraits come from `npm run shot -- portraits` (work/rigs/<id>.png)
 * and are linked when present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- sources ----------
const engine = read('src/tv/engine/GameEngine.ts');
const rigsBlock = engine.slice(engine.indexOf('const MONSTER_RIGS'), engine.indexOf('\n};', engine.indexOf('const MONSTER_RIGS')));
const rigs = {};
for (const m of rigsBlock.matchAll(/\n {2}(\w+): \{([\s\S]*?)\n {2}\},/g)) {
  const [, sprite, body] = m;
  const field = (k) => body.match(new RegExp(`\\b${k}: ([^,\\n]+)`))?.[1]?.trim().replace(/^['`]|['`]$/g, '');
  rigs[sprite] = {
    skeleton: field('skeleton')?.replace('${MONSTER_DIR}', 'public/assets/spine/monsters'),
    scale: Number(field('scale')),
    height: Number(field('height')),
    flipX: field('flipX') !== 'false',
    offY: Number(field('offY') ?? 0),
    skin: field('skin'),
    roles: Object.fromEntries(['idle', 'appear', 'attack', 'heavyAttack', 'defend', 'hit', 'death'].map((k) => [k, field(k)]).filter(([, v]) => v)),
  };
}

const battle = read('src/types/battle.ts');
const catalogBlock = battle.slice(battle.indexOf('export const MONSTER_CATALOG'), battle.indexOf('\n];', battle.indexOf('export const MONSTER_CATALOG')));
const catalog = [...catalogBlock.matchAll(/id: '(\w+)',\s*name: '([^']+)',\s*title: '([^']+)',\s*maxHp: (\d+),\s*level: (\d+),\s*spriteType: '(\w+)'/g)]
  .map(([, id, name, title, hp, level, sprite]) => ({ id, name, title, hp: Number(hp), level: Number(level), sprite }));

const movesets = read('src/shared/monsterMovesets.ts');
const movesetOf = (id) => {
  const m = movesets.match(new RegExp(`\\n {2}${id}: \\[([\\s\\S]*?)\\n {2}\\],`));
  if (!m) return [];
  return [...m[1].matchAll(/type: '(\w+)', damage: (\d+),(?: block: (\d+),)? name: '((?:[^'\\]|\\.)+)'.*?durationSeconds: ([\d.]+)(?:, move: '(\w+)')?/g)]
    .map(([, type, damage, block, name, dur, move]) => ({ type, damage: Number(damage), block: block && Number(block), name: name.replace(/\\'/g, "'"), dur: Number(dur), move }));
};

// Animations each move function already uses: map move id → function, then scan that function's body
const moveSources = ['src/tv/engine/monsterMoves.ts', ...fs.readdirSync(path.join(ROOT, 'src/tv/engine/moves')).map((f) => `src/tv/engine/moves/${f}`)].map(read).join('\n');
const fnOfMove = {};
for (const m of moveSources.matchAll(/\n {2}(\w+): (\w+),/g)) fnOfMove[m[1]] = m[2];
const animsUsedBy = (fn) => {
  const start = moveSources.search(new RegExp(`(?:function ${fn}\\(|const ${fn}: MoveFn)`));
  if (start < 0) return [];
  const end = moveSources.indexOf('\n}', start) + 1 || moveSources.indexOf('\n};', start);
  const body = moveSources.slice(start, end);
  return [...new Set([...body.matchAll(/h\.anim\((?:`\$\{\w+\}([^`]+)`|'([^']+)')/g)].map((x) => x[1] ?? x[2]))];
};

// ---------- spine ----------
function maxTime(o) {
  let t = 0;
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (typeof v.time === 'number') t = Math.max(t, v.time);
      Object.values(v).forEach(walk);
    }
  };
  walk(o);
  return t;
}
const spineCache = {};
function animations(skeleton) {
  if (spineCache[skeleton]) return spineCache[skeleton];
  const json = JSON.parse(read(skeleton));
  const out = Object.entries(json.animations ?? {}).map(([name, a]) => ({
    name,
    frames: Math.round(maxTime(a) * 60),
    events: (a.events ?? []).map((e) => `${e.name}@f${Math.round((e.time ?? 0) * 60)}`),
  }));
  const skins = Array.isArray(json.skins) ? json.skins.map((s) => s.name) : Object.keys(json.skins ?? {});
  return (spineCache[skeleton] = { anims: out, skins, bones: json.bones?.length ?? 0 });
}

// ---------- output ----------
const want = process.argv.slice(2).map((a) => a.toLowerCase());
const list = want.length ? catalog.filter((c) => want.includes(c.id) || want.includes(c.sprite.toLowerCase())) : catalog;
if (!list.length) {
  console.error(`No monster matches ${want.join(', ')}. Known: ${catalog.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const lines = [
  '# Monster rigs',
  '',
  'Generated by `npm run rigs` — do not edit. Lengths are 60 fps frames (the move Timeline unit). A rig with',
  '`faces: left` is authored facing the knight; others are flipped by the engine. `height` is what moves use',
  'for `crown(h, up)` / `h.height`. Animations a rig lacks are silently ignored by `h.anim()` (and flagged by',
  '`npm run shot -- movecheck`). Pose 0-frame `pose_*` animations with `h.anim(name, true)` and end with `h.idle()`.',
  '',
];
for (const c of list) {
  const rig = rigs[c.sprite];
  lines.push(`## ${c.id} — ${c.name} (${c.title})`, '');
  if (fs.existsSync(path.join(ROOT, 'work', 'rigs', `${c.id}.png`))) lines.push(`![${c.id}](rigs/${c.id}.png)`, '');
  if (!rig) {
    lines.push(`No rig for sprite ${c.sprite}.`, '');
    continue;
  }
  const { anims, skins } = animations(rig.skeleton);
  const moves = movesetOf(c.id);
  const used = new Set(moves.flatMap((m) => (m.move && fnOfMove[m.move] ? animsUsedBy(fnOfMove[m.move]) : [])));
  lines.push(
    `- sprite \`${c.sprite}\` · lvl ${c.level} · ${c.hp} HP · rig \`${rig.skeleton}\``,
    `- scale ${rig.scale} · height ${rig.height}px · faces ${rig.flipX ? 'right (flipped)' : 'left'}${rig.offY ? ` · hovers ${-rig.offY}px` : ''}${rig.skin ? ` · skin \`${rig.skin}\`` : skins.length > 1 ? ` · skins ${skins.join(', ')}` : ''}`,
    `- roles: ${Object.entries(rig.roles).map(([k, v]) => `${k}=\`${v}\``).join(' · ')}`,
    '',
    '| animation | frames | events | used by moves |',
    '|---|---:|---|:-:|',
    ...anims.map((a) => `| \`${a.name}\` | ${a.frames} | ${a.events.join(' ') || ''} | ${used.has(a.name) ? '✓' : ''} |`),
    '',
  );
  if (moves.length) {
    lines.push('| move | intent | dmg / block | timer | choreography |', '|---|---|---:|---:|---|');
    for (const m of moves) lines.push(`| ${m.name} | ${m.type} | ${m.block ?? m.damage} | ${m.dur}s | ${m.move ? `\`${m.move}\`` : '— (generic lunge)'} |`);
    lines.push('');
  }
}

const md = lines.join('\n');
const file = path.join(ROOT, 'work', 'rigs.md');
fs.mkdirSync(path.dirname(file), { recursive: true });
if (!want.length) fs.writeFileSync(file, md);
else console.log(md);
console.log(`${want.length ? '' : `wrote ${path.relative(ROOT, file)} — `}${list.length} monster(s)`);
