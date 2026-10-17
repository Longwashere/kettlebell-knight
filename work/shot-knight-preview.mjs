import { spawn } from 'child_process';
import fs from 'fs';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--window-size=1800,1000',
  '--remote-debugging-port=9444',
  '--user-data-dir=/tmp/cdp-knight-prof',
  'about:blank'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2500));
const tabs = await (await fetch('http://localhost:9444/json')).json();
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 0;
const pending = {};
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending[m.id]) {
    pending[m.id](m.result);
    delete pending[m.id];
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    console.log('CONSOLE', m.params.type, m.params.args.map(a => a.value || a.description).join(' '));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    console.log('EXC', JSON.stringify(m.params.exceptionDetails).slice(0, 500));
  }
};

const send = (method, params = {}) => new Promise(r => {
  const i = ++id;
  pending[i] = r;
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send('Runtime.enable');
await send('Network.enable');
await send('Page.enable');

console.log('Navigating to knight spine preview...');
await send('Page.navigate', { url: 'http://localhost:5173/work/knight-spine-preview.html' });

// Wait for __previewReady
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 250));
  const res = await send('Runtime.evaluate', { expression: 'window.__previewReady' });
  if (res?.result?.value === true) {
    console.log('Preview is ready!');
    break;
  }
}

await new Promise(r => setTimeout(r, 1000));
const shot = await send('Page.captureScreenshot');
fs.writeFileSync('work/knight_excalibell_spine_verification.png', Buffer.from(shot.data, 'base64'));
console.log('Saved work/knight_excalibell_spine_verification.png');

chrome.kill();
process.exit(0);
