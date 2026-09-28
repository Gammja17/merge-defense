// 헤드리스 크롬으로 페이지를 열고 잡히지 않은 오류를 모아 보여 준다
// node tools/dev/cons.mjs http://127.0.0.1:8765/index.html#shot-battle [ms]   (CHROME 환경 변수로 크롬 경로 지정)
import { spawn } from 'node:child_process';
const port = 9335, url = process.argv[2];
const chrome = spawn(process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome'), ['--headless=new', '--disable-gpu', '--mute-audio', `--remote-debugging-port=${port}`, '--window-size=540,960', `--user-data-dir=${process.env.TEMP || '/tmp'}/consprof`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws; for (let i = 0; i < 40; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = j.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(250); }
await new Promise(r => ws.onopen = r);
let id = 0; const errs = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; const k = (e.exception && e.exception.description || e.text).split('\n').slice(0, 3).join(' | '); errs.set(k, (errs.get(k) || 0) + 1); } };
const send = (method, params = {}) => { ws.send(JSON.stringify({ id: ++id, method, params })); };
send('Runtime.enable'); send('Page.enable'); send('Page.navigate', { url });
await sleep(+(process.argv[3] || 8000));
for (const [k, v] of errs) console.log(v + 'x', k);
if (!errs.size) console.log('no errors');
chrome.kill(); process.exit(0);
