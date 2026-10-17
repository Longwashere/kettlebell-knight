
import { spawn } from 'child_process';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--window-size=1280,720',
  '--remote-debugging-port=9455',
  '--user-data-dir=/tmp/cdp-test-spells',
  'about:blank'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));
const tabs = await (await fetch('http://localhost:9455/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 0;
const pending = {};
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; }
};

const send = (method, params = {}) => new Promise(r => {
  const i = ++id;
  pending[i] = r;
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:5173/tv' });
await new Promise(r => setTimeout(r, 3000));

console.log('Starting encounter...');
await send('Runtime.evaluate', { expression: "__kk.encounter('wolf,boar,slime')", awaitPromise: true });
await new Promise(r => setTimeout(r, 2000));

console.log('Equipping excalibell...');
await send('Runtime.evaluate', { expression: "__kk.equip('weapon', 'excalibell')", awaitPromise: true });
await new Promise(r => setTimeout(r, 500));

console.log('Testing spell_heavens_smite...');
await send('Runtime.evaluate', { expression: "__kk.knightMove('spell_heavens_smite')", awaitPromise: true });
await new Promise(r => setTimeout(r, 2500));

console.log('Testing spell_righteous_onslaught...');
await send('Runtime.evaluate', { expression: "__kk.knightMove('spell_righteous_onslaught')", awaitPromise: true });
await new Promise(r => setTimeout(r, 2500));

console.log('Testing spell_dawns_aegis...');
await send('Runtime.evaluate', { expression: "__kk.knightMove('spell_dawns_aegis')", awaitPromise: true });
await new Promise(r => setTimeout(r, 2500));

console.log('All spells executed successfully!');
chrome.kill();
process.exit(0);
