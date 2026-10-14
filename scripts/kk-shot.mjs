#!/usr/bin/env node
/**
 * kk-shot — drive the TV app in headless Chrome and capture screenshots + state.
 *
 * Uses the dev-only window.__kk bridge (src/tv/debug/agentBridge.ts). Starts the Vite dev
 * server automatically if nothing is listening on --base.
 *
 *   npm run shot -- encounter:wolf_pack freeze shot:start cast idle shot:after state
 *   npm run shot -- --route /tv goto:BLACKSMITH idle canvas:shop textures
 *
 * Steps run in order:
 *   ready                     wait for engine init + asset loads (implicit after page load)
 *   goto:<VIEW>               HUB | BLACKSMITH | COMBAT | ALCHEMIST | SANCTUARY
 *   encounter:<id|index>      ENCOUNTERS id/index, or comma list of monsters: encounter:wolf,boar
 *   bg:<BATTLE_MAPS key>      e.g. bg:BLOOD_CEMETERY
 *   freeze | unfreeze         pause/resume monster ATB timers
 *   rep[:EXERCISE[:power]]    inject one rep via the telemetry path (defaults to focused card)
 *   cast                      send reps until the focused card fires
 *   card:<i> | target:<i>     focus hand card i / target monster slot i
 *   key:<name>                Enter, ArrowLeft/Right/Up/Down, Escape, Space
 *   wait:<ms>                 fixed delay
 *   idle                      wait until VFX/animations settle
 *   shot:<name>               full-page PNG (canvas + React overlay) at --size
 *   canvas:<name>             Pixi-only PNG at native 426x240
 *   sheet[:slot[:frames]]     contact sheet of every animation on a monster slot (freezes timers)
 *   attack:<slot>:<move>      play a monster move now (move id or name, e.g. attack:0:wolf_throat_bite)
 *   film:<slot>:<move>[:n[:step]]  film strip of a move: n frames, every `step` 60fps frames (default 16, 6)
 *   state | textures          print __kk.state() / GPU texture stats as JSON
 *   eval:<js>                 evaluate an expression in the page (awaited) and print it
 *
 * Options:
 *   --base <url>      default http://localhost:5173
 *   --route <path>    default /tv (query strings allowed, e.g. /tv?view=COMBAT)
 *   --out <dir>       default work/shots/<timestamp>
 *   --size <WxH>      default 1278x720 (3x the 426x240 render)
 *   --timeout <ms>    per-step timeout, default 15000
 *   --verbose         also print console.log/info from the page
 *
 * Exit code is 1 if a step fails or the page throws an uncaught exception.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- args ----------
const opts = { base: 'http://localhost:5173', route: '/tv', out: null, size: '1278x720', timeout: 15000, verbose: false };
const steps = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--help' || a === '-h') {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    console.log(src.slice(src.indexOf('/**') + 3, src.indexOf('*/')).replace(/^ \* ?/gm, ''));
    process.exit(0);
  } else if (a === '--verbose') opts.verbose = true;
  else if (a.startsWith('--')) {
    const [k, inline] = a.slice(2).split('=');
    if (!(k in opts)) fail(`unknown option --${k}`);
    opts[k] = inline ?? argv[++i];
  } else steps.push(a);
}
if (steps.length === 0) steps.push('shot:initial', 'state');
const [W, H] = opts.size.split('x').map(Number);
opts.timeout = Number(opts.timeout);
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const outDir = path.resolve(ROOT, opts.out ?? `work/shots/${stamp}`);

function fail(msg) {
  console.error(`kk-shot: ${msg}`);
  process.exit(1);
}

// ---------- dev server ----------
async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let server = null;
async function ensureServer() {
  if (await reachable(opts.base)) return;
  const port = new URL(opts.base).port || '5173';
  console.log(`· starting vite on :${port}`);
  server = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--port', port, '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await reachable(opts.base)) return;
  }
  fail(`dev server did not come up at ${opts.base}`);
}

// ---------- chrome ----------
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) fail('Chrome not found; set CHROME_PATH');
  return found;
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-shot-'));
const chrome = spawn(
  findChrome(),
  [
    '--headless=new',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${W},${H}`,
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

function cleanup() {
  chrome.kill();
  server?.kill();
  try {
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // Chrome may still be flushing its profile; a leftover temp dir is harmless.
  }
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

async function connect() {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) fail('Chrome did not start (no DevToolsActivePort)');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
  return ws;
}

// ---------- CDP plumbing ----------
let ws;
let msgId = 0;
const pending = new Map();
let pageErrors = 0;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function onMessage(e) {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    const { type, args } = m.params;
    if (type === 'error' || type === 'warning' || opts.verbose) {
      const text = args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 500);
      console.log(`  [console.${type}] ${text}`);
    }
  } else if (m.method === 'Runtime.exceptionThrown') {
    pageErrors++;
    const d = m.params.exceptionDetails;
    console.log(`  [exception] ${(d.exception?.description ?? d.text).split('\n').slice(0, 4).join(' | ')}`);
  } else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    console.log(`  [http ${m.params.response.status}] ${m.params.response.url}`);
  } else if (m.method === 'Network.loadingFailed' && !m.params.canceled) {
    console.log(`  [net fail] ${m.params.errorText} (${m.params.type})`);
  }
}

/** Evaluates a JS expression in the page, awaiting promises, and returns the JSON value. */
async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: opts.timeout,
  });
  if (res.exceptionDetails) {
    const d = res.exceptionDetails;
    throw new Error(d.exception?.description?.split('\n')[0] ?? d.text);
  }
  return res.result.value;
}

const kk = (expr) => evaluate(`(async () => { if (!window.__kk) throw new Error('window.__kk missing (dev server only, /tv route)'); return ${expr}; })()`);
const js = (v) => JSON.stringify(v);

function save(name, base64) {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(base64, 'base64'));
  return path.relative(ROOT, file);
}

const KEYS = {
  Enter: 13, Escape: 27, Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Backspace: 8,
};

// ---------- steps ----------
async function runStep(step) {
  const [cmd, ...rest] = step.split(':');
  const arg = rest.join(':');
  switch (cmd) {
    case 'ready':
      await kk('__kk.ready()');
      return 'ok';
    case 'goto':
      await kk(`__kk.goto(${js(arg)})`);
      await kk('__kk.ready()');
      return arg.toUpperCase();
    case 'encounter': {
      const which = /^\d+$/.test(arg) ? Number(arg) : arg.includes(',') ? arg.split(',') : arg;
      const s = await kk(`__kk.encounter(${js(which)})`);
      return s.battle?.monsters?.map((m) => m.name).join(', ');
    }
    case 'bg':
      await kk(`__kk.background(${js(arg)})`);
      return arg;
    case 'freeze':
    case 'unfreeze':
      await kk(`__kk.freeze(${cmd === 'freeze'})`);
      return 'ok';
    case 'rep': {
      const [exercise, power] = arg ? arg.split(':') : [];
      await kk(`__kk.rep(${exercise ? js(exercise.toUpperCase()) : 'undefined'}, ${Number(power) || 100})`);
      return exercise || '(focused card)';
    }
    case 'cast': {
      const s = await kk('__kk.cast()');
      return s.battle?.log ?? 'ok';
    }
    case 'card':
      await kk(`__kk.call('focusCard', ${Number(arg)})`);
      return arg;
    case 'target':
      await kk(`__kk.call('target', ${Number(arg)})`);
      return arg;
    case 'key': {
      const code = KEYS[arg];
      if (!code) throw new Error(`unknown key ${arg} (known: ${Object.keys(KEYS).join(', ')})`);
      const key = arg === 'Space' ? ' ' : arg;
      for (const type of ['keyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', {
          type, key, code: arg, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, text: key === ' ' ? ' ' : undefined,
        });
      }
      await sleep(50);
      return arg;
    }
    case 'wait':
      await sleep(Number(arg) || 0);
      return `${arg}ms`;
    case 'idle':
      await kk(`__kk.idle(${opts.timeout})`);
      return 'settled';
    case 'shot': {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      return save(arg || `shot-${msgId}`, data);
    }
    case 'canvas': {
      const url = await kk('__kk.snapshot()');
      return save(arg || `canvas-${msgId}`, url.replace(/^data:image\/png;base64,/, ''));
    }
    case 'sheet': {
      const [slot, frames] = arg.split(':');
      const url = await kk(`__kk.freeze(true), __kk.sheet(${Number(slot) || 0}, ${Number(frames) || 6})`);
      return save(`sheet-${slot || 0}-${msgId}`, url.replace(/^data:image\/png;base64,/, ''));
    }
    case 'attack': {
      const [slot, move] = arg.split(':');
      await kk(`__kk.call('attack', ${Number(slot) || 0}, ${js(move)})`);
      return move;
    }
    case 'film': {
      const [slot, move, count, step] = arg.split(':');
      const url = await kk(`__kk.film(${Number(slot) || 0}, ${js(move)}, ${Number(count) || 16}, ${Number(step) || 6})`);
      return save(`film-${move}`, url.replace(/^data:image\/png;base64,/, ''));
    }
    case 'state':
      return '\n' + JSON.stringify(await kk('__kk.state()'), null, 2);
    case 'textures': {
      const t = await kk('__kk.textures()');
      const lines = t.textures.map((x) => `    ${(x.bytes / 1048576).toFixed(2).padStart(6)} MB  ${x.width}x${x.height}  ${x.label}`);
      return `${t.count} textures, ~${t.totalMB} MB\n${lines.join('\n')}`;
    }
    case 'eval':
      return '\n' + JSON.stringify(await evaluate(`(async () => (${arg}))()`), null, 2);
    default:
      throw new Error(`unknown step "${cmd}"`);
  }
}

// ---------- main ----------
await ensureServer();
ws = await connect();
ws.onmessage = onMessage;
await send('Runtime.enable');
await send('Network.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

const url = new URL(opts.route, opts.base).href;
console.log(`· ${url}  →  ${path.relative(ROOT, outDir)}/`);
await send('Page.navigate', { url });

// Wait for the bridge (TV route) or just the load event elsewhere.
let hasBridge = false;
for (let i = 0; i < 100; i++) {
  hasBridge = await evaluate('!!window.__kk').catch(() => false);
  if (hasBridge || (i > 20 && (await evaluate('document.readyState').catch(() => '')) === 'complete')) break;
  await sleep(100);
}
if (hasBridge) await kk('__kk.ready()');
else console.log('· window.__kk not found; only shot/wait/key/eval steps will work');

let failed = false;
for (const step of steps) {
  const t0 = Date.now();
  try {
    const result = await runStep(step);
    console.log(`✓ ${step} (${Date.now() - t0}ms)${result ? `  ${result}` : ''}`);
  } catch (err) {
    failed = true;
    console.log(`✗ ${step}  ${err.message}`);
    break;
  }
}

if (pageErrors) console.log(`! ${pageErrors} uncaught page exception(s)`);
process.exit(failed || pageErrors ? 1 : 0);
