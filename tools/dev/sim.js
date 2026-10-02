// 자동 플레이 밸런스 시뮬레이션 (브라우저 없이 node로)
//   python tools/bundle.py js /tmp/game.js
//   node tools/dev/sim.js /tmp/game.js '{"bots":["smart"],"reps":2,"from":1,"to":30}'   캠페인: 스테이지별 결과 (숫자 = 이긴 판의 남은 방어막, L3 = 웨이브 3에서 짐)
//   node tools/dev/sim.js /tmp/game.js '{"endless":4}'                                   무한 방어선: 몇 웨이브까지 버티는지
// 설정: bots(smart, nododge, idle), reps, from, to, deck, endless, growth, mk(연구 단계), nofocus
// 스테이지 1은 튜토리얼 때문에 늘 L1로 나오니 무시한다
const fs = require('fs');
const any = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : (k === 'width' || k === 'height' ? 64 : k === 'measureText' ? () => ({ width: 40 }) : any()), apply: () => any(), set: () => true });
const canvas = () => ({ getContext: () => any(), style: {}, width: 64, height: 64, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture() {} });
global.document = { addEventListener() {}, hidden: false, getElementById: canvas, createElement: canvas, documentElement: {}, fonts: { load: () => Promise.resolve() } };
global.getComputedStyle = () => ({ paddingTop: '0', paddingBottom: '0' });
global.window = global; global.location = { hash: '' }; global.innerWidth = 540; global.innerHeight = 960; global.devicePixelRatio = 1;
global.addEventListener = () => {}; global.localStorage = { getItem: () => null, setItem() {} };
global.Image = class { set src(v) { this.width = 10; this.height = 10; setTimeout(() => this.onload && this.onload()); } };
global.Audio = class { play() { return Promise.resolve(); } pause() {} };
global.requestAnimationFrame = () => {}; global.fetch = () => Promise.reject(new Error('x'));
let fakeNow = 1000; global.performance = { now: () => fakeNow };
const cfg = JSON.parse(process.argv[3] || '{}');
const code = fs.readFileSync(process.argv[2], 'utf8');
eval(code + `
;setTimeout(() => { (function(){
buildTints(); play = () => {}; save = () => {};
const CS = { mk: 0, cl: 0, gv: 0 }; const GS = { got: 0, runs: 0, sum: 0, cell: 0, row: 0 }; { const ag = addGear; addGear = (n, ...r) => { GS.got += n; return ag(n, ...r); }; const da = doAction; doAction = b => { const g0 = S.gear; da(b); const used = g0 - S.gear; if (used > 0) { if (b.act === 'summon') GS.sum += used; else if (b.act === 'addrow') GS.row += used; else GS.cell += used; } }; } { const a = makeCap, b = claimCap, c = giveUnit; makeCap = (...x) => { CS.mk++; return a(...x); }; claimCap = (...x) => { CS.cl++; return b(...x); }; giveUnit = (...x) => { CS.gv++; return c(...x); }; }
PROG.owned = UNIT_ORDER.slice(); PROG.lvl = 99; PROG.xp = 0;   // 계정 레벨로 잠긴 강화도 모두 풀린 상태
if (cfg.mk != null) { PROG.mk = {}; for (const t of UNIT_ORDER) PROG.mk[t] = cfg.mk; }
// 강화 고르기: 사람처럼. 유리 대포는 피하고, 시너지를 켜는 카드, 높은 등급, 갈래(공격 > 방어 > 특수 > 보급) 순
function botPerk() {
  const W8 = { atk: 4, def: 3, sp: 2, sup: 1 };
  const score = p => (p.id === 'glass' ? -100 : 0) + (!S.syn[p.cat] && catCount(p.cat) + 1 >= SYN_N ? 20 : 0) + p.tier * 5 + W8[p.cat] + (S.hp <= 4 && p.cat === 'def' ? 10 : 0);
  const cs = S.perkChoices; let best = 0;
  cs.forEach((p, i) => { if (score(p) > score(cs[best])) best = i; });
  return best;
}
function botMerge() {
  let again = true;
  while (again) { again = false; const us = allUnits();
    outer: for (const A of us) for (const B of us) if (A !== B && A.type === B.type && A.lv === B.lv && A.lv < MAX_LV) { if (B.res != null && A.res == null) continue; mergeInto(B, A); again = true; break outer; } }
  for (const u of S.reserve.slice()) if (u) { const sp = findSpot(u); if (sp) place(u, sp); }
}
function botShop() { for (let g = 0; g < 30; g++) {
  const rows = openRows();
  if (cfg.summon !== false && S.gear >= summonCost() && S.slots.slice(0, COLS * rows).filter(Boolean).length < COLS * rows * 0.6 && (S.mode === 'play' || S.mode === 'break')) { const had = S.gear; doAction({ act: 'summon' }); if (S.gear < had) continue; }
  if (rows < ROWS && S.gear >= ROW_ADD[rows - START_ROWS] && (rows === START_ROWS || S.cellFx.filter(Boolean).length >= 3)) { doAction({ act: 'addrow' }); continue; }
  let done = false;
  for (const u of gridUnits().sort((a, b) => b.lv - a.lv)) { for (const c of u.cells) { const f = S.cellFx[c];
    if (!f && S.gear >= cellNewCost()) { doAction({ act: 'cellfx', c, k: 'atk' }); done = true; break; }
    if (f && f.lv < 3 && S.gear >= CELL_UP[f.lv - 1]) { doAction({ act: 'cellup', c }); done = true; break; } } if (done) break; }
  if (!done) return; } }
function botDodge() {
  const soon = S.attacks.filter(a => a.t > a.warn - 0.9); if (!soon.length) return;
  const danger = new Set(); for (const a of S.attacks) for (const c of a.cells) danger.add(c);
  for (const a of soon) for (const c of a.cells) { const u = S.slots[c]; if (!u) continue; let moved = false;
    for (let i = 0; i < COLS * ROWS && !moved; i++) { const cells = cellsFor(u, i); if (canPlace(u, cells) && cells.every(x => !danger.has(x))) { place(u, cells); moved = true; } }
    if (!moved) { const k = S.reserve.findIndex(r => !r); if (k >= 0) toReserve(u, k); } }
}
let clearSeen = 0; const FILL = { n: 0, f: 0, rows: 0 };
function run(n, bot) {
  startStage(n); GS.runs++;
  for (let i = 0; i < 60 * 480 && S.mode !== 'win' && S.mode !== 'lose'; i++) {
    fakeNow += 16.7;
    if (S.mode === 'perk') doAction({ act: 'perk', i: botPerk() });
    if (bot !== 'idle') { botMerge(); botShop();
      const atkSrc = S.attacks.map(a => a.src).find(e => e && !e.boss && !e.dead && e.y > FIRE_Y);
      const danger = S.enemies.some(e => e.y > 430);
      S.focus = cfg.nofocus ? (atkSrc || null) : atkSrc || (danger ? null : (S.caps.find(c => c.y > FIRE_Y && !c.carrier) || null));
      if (bot === 'smart') botDodge(); }
    const was = S.mode; update(1 / 60); if (was === 'clearing') clearSeen++;
    if (i % 60 === 0 && S.mode === 'play') { FILL.n++; FILL.f += S.slots.slice(0, COLS * openRows()).filter(Boolean).length / (COLS * openRows()); FILL.rows += openRows(); }
  }
  return (S.mode === 'win' ? String(S.hp) : 'L' + S.wave) + (S.lost ? 'x' + S.lost : '');
}
function runEndless(bot) {
  startStage(0, true); let maxLv = 0;
  for (let i = 0; i < 60 * 60 * 40 && S.mode !== 'lose'; i++) {
    fakeNow += 16.7;
    if (S.mode === 'perk') doAction({ act: 'perk', i: botPerk() });
    botMerge(); botShop();
    const atkSrc = S.attacks.map(a => a.src).find(e => e && !e.boss && !e.dead && e.y > FIRE_Y);
    const danger = S.enemies.some(e => e.y > 430);
    S.focus = atkSrc || (danger ? null : (S.caps.find(c => c.y > FIRE_Y && !c.carrier) || null));
    if (bot === 'smart') botDodge();
    update(1 / 60);
    for (const u of allUnits()) maxLv = Math.max(maxLv, u.lv);
  }
  const tot = Object.values(S.dmgBy).reduce((a, b) => a + b, 0); const DMGREPORT = Object.entries(S.dmgBy).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + Math.round(v / tot * 100) + '%').join(' ') + ' used ' + JSON.stringify(S.used);
  return 'ci' + cyclePos(S.wave) + ' ' + DMGREPORT + ' W' + S.wave + '/lv' + maxLv + '/g' + S.rowsOpen + 'r' + S.cellFx.filter(Boolean).length + '/m' + S.mut.length;
}
if (cfg.growth) ENDLESS_GROWTH = cfg.growth;
if (cfg.endless) { for (let k = 0; k < cfg.endless; k++) console.log('endless', runEndless('smart')); console.log('RUNTIME_OK'); return; }
PROG.deck = cfg.deck || ['f', 't', 's', 'g', 'm'];
for (const bot of (cfg.bots || ['smart', 'nododge', 'idle'])) {
  const row = []; for (let n = (cfg.from || 1); n <= (cfg.to || 20); n++) { const r = []; for (let k = 0; k < (cfg.reps || 2); k++) r.push(run(n, bot)); row.push(n + ':' + r.join(',')); }
  console.log(bot.padEnd(8), row.join(' '));
}
console.log('frames spent clearing:', clearSeen, 'fill', (FILL.f / FILL.n).toFixed(2), 'avgRows', (FILL.rows / FILL.n).toFixed(2), 'caps', JSON.stringify(CS), 'gear/run', JSON.stringify(Object.fromEntries(Object.entries(GS).map(([k, v]) => [k, k === 'runs' ? v : +(v / GS.runs).toFixed(1)]))));
console.log('RUNTIME_OK');
})(); }, 30);`);
