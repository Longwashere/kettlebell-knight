import { spawn } from 'child_process';
import fs from 'fs';
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 ['--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--window-size=1900,700','--remote-debugging-port=9333','--user-data-dir=/tmp/cdp-prof','about:blank'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,2500));
const tabs = await (await fetch('http://localhost:9333/json')).json();
const ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let id=0; const pending={};
ws.onmessage=e=>{const m=JSON.parse(e.data);
 if(m.id&&pending[m.id]){pending[m.id](m.result);delete pending[m.id];}
 if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type)) console.log('CONSOLE',m.params.type,m.params.args.map(a=>a.value||a.description).join(' ').slice(0,400));
 if(m.method==='Runtime.exceptionThrown') console.log('EXC',JSON.stringify(m.params.exceptionDetails).slice(0,500));
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400) console.log('HTTP',m.params.response.status,m.params.response.url);
};
const send=(method,params={})=>new Promise(r=>{const i=++id;pending[i]=r;ws.send(JSON.stringify({id:i,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const shot=async n=>{const r=await send('Page.captureScreenshot');fs.writeFileSync(`work/preview-${n}.png`,Buffer.from(r.data,'base64'));};
const key=async(k,code)=>{for(const t of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type:t,key:k,code:k,windowsVirtualKeyCode:code,text:k===' '?' ':undefined});};
await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
await send('Page.navigate',{url:'http://localhost:5173/work/monster-preview.html'});
await sleep(6000); await shot('rigs');

chrome.kill(); process.exit(0);
