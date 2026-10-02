'use strict';
// ── 칸과 배치 ─────────────────────────────────────────────
const cellPos = i => ({ x: GRID_X + (i % COLS) * CW + CW / 2, y: GRID_Y + Math.floor(i / COLS) * CH + CH / 2 });
const resPos = k => ({ x: RES_X + RES_W / 2 + k * (RES_W + 4), y: LINE_Y - 30 });
function fitReserve() { const n = S.reserve.length; RES_W = Math.min(46, Math.floor((SHOP_BX - 6 - RES_X) / n) - 4); }
function unitPos(u) {
  if (u.res != null) return resPos(u.res);
  const xs = u.cells.map(c => cellPos(c).x), ys = u.cells.map(c => cellPos(c).y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
function cellAt(x, y) {
  const c = Math.floor((x - GRID_X) / CW), r = Math.floor((y - GRID_Y) / CH);
  if (c < 0 || c >= COLS || r < 0 || r >= openRows()) return -1;
  return r * COLS + c;
}
let SCRAP_Y = LINE_Y - 20;   // 이 선보다 위(전장)에 놓으면 해체
// 판 올리기: k는 판 위치를 정하는 줄 수(소수). 2줄일 땐 3줄 자리에 두고 셋째 줄을 비워 둔다
function setLift(k) { S.lift = k; const off = (ROWS - k) * CH; GRID_Y = 606 + off; LINE_Y = 584 + off; SCRAP_Y = LINE_Y - 20; }
function tickLift(dt) {
  const want = S.rowsOpen || START_ROWS, pos = Math.max(3, want);
  if (S.lift == null || S.shown == null || S.shown > want) { setLift(pos); S.shown = want; S.popRow = -1; return; }
  if (S.shown >= want) return;
  // 0.6초 동안: 셋째 줄은 빈자리에서 튀어 올라오고, 넷째 줄은 판이 통째로 올라간다. 끝에서 철컹
  S.liftT = (S.liftT || 0) + dt;
  const p = Math.min(1, S.liftT / 0.6), c1 = 1.4, q = p - 1, e = p < 1 ? 1 + (c1 + 1) * q * q * q + c1 * q * q : 1;
  S.popRow = want - 1; S.rowPop = e;
  if (pos > S.lift) { setLift(pos - 1 + e); for (const en of S.enemies) if (en.y > LINE_Y - 24) en.y = LINE_Y - 24; }
  if (p < 1) return;
  setLift(pos); S.shown = want; S.popRow = -1;
  shake(0.45); play('thud', 0.9); play('upgrade', 0.4);
  for (let c = (want - 1) * COLS; c < want * COLS; c++) { const q2 = cellPos(c); S.fx.push({ kind: 'ring', x: q2.x, y: q2.y, t: -Math.abs(c % COLS - 2.5) * 0.04, life: 0.5, color: '#ffb347' }); }
  addText(W / 2, GRID_Y + (want - 0.5) * CH, '줄 추가!', '#ffd6a0', 26, 1.2);
}
function resAt(x, y) {
  if (Math.abs(y - (LINE_Y - 30)) > RES_W / 2 + 4) return -1;
  const k = Math.floor((x - RES_X) / (RES_W + 4));
  return k >= 0 && k < S.reserve.length && x - RES_X - k * (RES_W + 4) <= RES_W + 2 ? k : -1;
}
function cellsFor(u, c) {
  // 누른 칸이 모양 가운데쯤 오게 두고, 판 밖으로 나가면 안쪽으로 민다
  const pts = shapePts(u.type), { h, w } = shapeDims(u.type);
  let r0 = Math.floor(c / COLS) - Math.floor((h - 1) / 2), c0 = c % COLS - Math.floor((w - 1) / 2);
  r0 = Math.max(0, Math.min(openRows() - h, r0)); c0 = Math.max(0, Math.min(COLS - w, c0));
  return pts.map(([r, cc]) => (r0 + r) * COLS + c0 + cc);
}
function canPlace(u, cells) {
  return cells.every(c => c >= 0 && c < COLS * openRows() && (!S.slots[c] || S.slots[c] === u) && !isBroken(c));
}
// 구역 7 폐허 함대: 놓을 수 없는 부서진 칸. 웨이브마다 2~3칸 새로 (t = Infinity), 난파선 잔해는 몇 초 (t = 남은 시간)
const isBroken = c => !!(S.broken && S.broken.some(b => b.c === c));
function breakCells(n, life, wreck = false) {
  const free = [];
  for (let c = 0; c < COLS * openRows(); c++) if (!S.slots[c] && !isBroken(c)) free.push(c);
  for (let k = 0; k < n && free.length; k++) {
    const c = free.splice(Math.floor(Math.random() * free.length), 1)[0], q = cellPos(c);
    S.broken.push({ c, t: life, wreck });
    S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.5, color: '#9ab8d8' }); sparks(q.x, q.y, '#c8d8ea', 10, 160);
  }
  hintOnce('wreck', '부서진 칸엔 못 놓아요');
}
// 구역 8 차원 균열: 캡슐이 화면 옆에서 날아 들어와 제자리에 선 뒤 내려간다
function sideCap(c) {
  c.tx = c.x; c.side = c.x < W / 2 ? -1 : 1; c.x = c.side < 0 ? -40 : W + 40; c.y = 130 + Math.random() * 170; c.sp0 = c.speed; c.speed = 0;
  hintOnce('side', '캡슐이 옆에서 와요');
}
const stageRule = () => S.stage && !S.stage.endless ? S.stage.sector.rule : null;
function unplace(u) {
  if (u.cells) for (const c of u.cells) if (S.slots[c] === u) S.slots[c] = null;
  u.cells = null;
  if (u.res != null) { if (S.reserve[u.res] === u) S.reserve[u.res] = null; u.res = null; }
}
function place(u, cells) { unplace(u); u.cells = cells; for (const c of cells) S.slots[c] = u; }
function toReserve(u, k) { unplace(u); S.reserve[k] = u; u.res = k; }
function gridUnits() { return S.slots.filter((u, i) => u && u.cells[0] === i); }
function allUnits() { return gridUnits().concat(S.reserve.filter(Boolean)); }
function findSpot(u) {
  for (const r of [1, 2, 0]) for (let c = 0; c < COLS; c++) {
    const cells = cellsFor(u, r * COLS + c);
    if (cells[0] === r * COLS + c && canPlace(u, cells)) return cells;
  }
  for (let i = 0; i < COLS * ROWS; i++) { const cells = cellsFor(u, i); if (canPlace(u, cells)) return cells; }
  return null;
}
// ── 칸 강화: 정비소에서 칸마다 효과 하나를 골라 3단계까지. 기체는 올라선 칸들의 효과를 더해 받는다 (이번 전투에서만) ──
const CELL_FX = {
  atk: { name: '공격력', key: 'ATK', col: '#ffb347', v: [0.15, 0.28, 0.45], txt: v => `공격력 +${Math.round(v * 100)}%` },
  spd: { name: '공속', key: 'SPD', col: '#48ffd8', v: [0.1, 0.2, 0.32], txt: v => `공격 속도 +${Math.round(v * 100)}%` },
  def: { name: '방어', key: 'DEF', col: '#6ad0ff', v: [0.15, 0.25, 0.35], txt: v => `받는 피해 -${Math.round(v * 100)}%` },
  rng: { name: '사거리', key: 'RNG', col: '#c89bff', v: [50, 90, 130], txt: v => `사거리 +${v}` },
};
const FX_KEYS = ['atk', 'spd', 'def', 'rng'];
const CELL_UP = [5, 8];              // 2단계, 3단계로 올리는 값
const START_ROWS = 2, ROW_ADD = [20, 45];   // 3줄, 4줄로 늘리는 값 (주인: 초반에 다 열리지 않게)
const RES_ADD = [12, 20, 30];   // 대기함 4, 5, 6칸째 (정비소에서 산다)
const SHOP_BX = 286;   // 판 위 줄의 정비소 버튼 왼쪽 끝
const summonCost = () => Math.max(1, Math.round((3 + (S.summons || 0)) * Math.pow(0.75, S.pk.summonOff)));   // 소환 할인: 고를 때마다 -25%
// 소환할수록 비싸지지만 더 좋은 기체가 나온다: 0~2번째 Lv1, 3~5번째 Lv2, 6~9번째 Lv3, 10번째부터 Lv4. 정예 소환 강화마다 +1 (Lv5까지)
const SUMMON_LV = [3, 6, 10];
const summonLv = () => Math.min(5, 1 + SUMMON_LV.filter(n => (S.summons || 0) >= n).length + (S.pk.summonLv || 0));
const cellNewCost = () => 3 + S.cellFx.filter(Boolean).length;   // 새로 찍을수록 조금씩 비싸진다
const openRows = () => S.rowsOpen || START_ROWS;
const cellVal = (i, k) => { const f = S.cellFx && S.cellFx[i]; return f && f.k === k ? CELL_FX[k].v[f.lv - 1] * (k === 'atk' ? 1 + S.pk.front : 1) : 0; };
const cellSum = (u, k) => u.cells ? u.cells.reduce((a, c) => a + cellVal(c, k), 0) : 0;
const cellAtk = u => 1 + cellSum(u, 'atk');
const cellSpd = u => 1 + cellSum(u, 'spd');
const cellRange = u => Math.min(200, cellSum(u, 'rng'));
const cellDef = u => Math.min(0.6, cellSum(u, 'def'));
const fxLabel = f => { const d = CELL_FX[f.k], v = d.v[f.lv - 1]; return d.key + (f.k === 'def' ? ' -' : ' +') + (f.k === 'rng' ? v : Math.round(v * 100) + '%'); };
// 부품: 해체, 엘리트와 보스 격추, 웨이브 돌파로 얻는다. 해체 칸으로 날아가 쌓인다
function addGear(n, x, y) {
  S.gear += n;
  S.fx.push({ kind: 'parts', x, y, tx: SHOP_BX + 53, ty: LINE_Y - 30, n, t: 0, life: 0.6 });
  if (n >= 2) addText(x, y - 30, `부품 +${n}`, '#ffb347', 18);   // 1개는 날아가는 부품만
}
function neighborsOf(u) {
  const set = new Set();
  if (!u.cells) return set;
  for (const c of u.cells) {
    const r = Math.floor(c / COLS), cc = c % COLS;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = cc + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const o = S.slots[nr * COLS + nc];
      if (o && o !== u) set.add(o);
    }
  }
  return set;
}
// 상하좌우로 붙은 기체 (방패 드론이 지키는 범위)
function crossOf(u) {
  const set = new Set();
  if (!u.cells) return set;
  for (const c of u.cells) {
    const r = Math.floor(c / COLS), cc = c % COLS;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = cc + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const o = S.slots[nr * COLS + nc];
      if (o && o !== u) set.add(o);
    }
  }
  return set;
}
const cellDist = (a, b) => Math.max(Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)), Math.abs(a % COLS - b % COLS));

// ── 스폰 ──────────────────────────────────────────────────
const stageMul = () => (1 + IN_SECTOR * Math.min(S.stage.i, 3)) * SECTOR_MUL[S.stage.s];
let ENDLESS_GROWTH = 1.29, ENDLESS_BASE = 1.35, ENDLESS_BOSS = 0.17;   // 초반을 1.5배 세게, 대신 성장을 조금 낮춰 30웨이브쯤은 예전과 비슷. 보스는 그 웨이브 적 체력에 맞춘다
const hpMul = () => S.stage.endless ? ENDLESS_BASE * Math.pow(ENDLESS_GROWTH, S.wave - 1) * PACE[cyclePos(S.wave) - 1] * Math.pow(1.25, S.mut.filter(m => m === 'armor').length) : (1 + WAVE_GROWTH * (wavePw(S.stage, S.wave) - 1)) * stageMul();
const AFFIX = { fast: ['가속', '#ff9a3a'], armor: ['장갑', '#7fd4ff'], split: ['분열', '#8dff9a'], bomb: ['자폭', '#ff4a8a'] }, AFFIX_KEYS = Object.keys(AFFIX);
// 보스 기믹: 칸을 영구 봉쇄 (그 칸의 기체는 사라진다), 기체 분해
// ── 보스 기믹 (못 피함). 치명적: 칸 봉쇄, 강등, 줄 빙결, 대기함 비우기, (격노) 분해. 짜증: 부품 차단, 화력 감소, 단단한 캡슐, 게이지 깎기 ──
const GIMMICK = {
  seal:     { name: '칸 봉쇄', lethal: true, run: b => sealCells(1, b) },
  demote:   { name: '강등', lethal: true, run: b => {
    const us = gridUnits().filter(u => u.lv >= 3 && !u.fuse); if (!us.length) return false;
    const u = us[Math.floor(Math.random() * us.length)], p = unitPos(u);
    u.lv -= 2; u.maxHp = unitMaxHp(u.type, u.lv); u.hp = Math.min(u.hp, u.maxHp);
    S.fx.push({ kind: 'bolt', pts: [{ x: b.x, y: b.y + 40 }, p], t: 0, life: 0.4, col: '#ff3a8a' }); sparks(p.x, p.y, '#ff6aa0', 20, 300);
    addText(p.x, p.y - 30, `강등! Lv${u.lv}`, '#ff6aa0', 22, 1.2); play('shield_break', 0.45);
  } },
  rowfreeze: { name: '한 줄 빙결 8초', lethal: true, run: b => {
    const r = Math.floor(Math.random() * openRows());
    for (let c = r * COLS; c < (r + 1) * COLS; c++) { const u = S.slots[c], q = cellPos(c); if (u) u.ice = Math.max(u.ice || 0, 8); S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.5, color: '#bff4ff' }); sparks(q.x, q.y, '#dff8ff', 8, 200, 'shard'); }
    play('shield_crack', 0.5, 1.1);
  } },
  purge:    { name: '대기함 비우기', lethal: true, run: b => { const rs = S.reserve.filter(Boolean); if (!rs.length) return false; for (const u of rs) destroyUnit(u, '소각!'); } },
  shatter:  { name: '분해', lethal: true, run: b => { const us = gridUnits(); if (us.length < 2) return false; const u = us[Math.floor(Math.random() * us.length)]; S.fx.push({ kind: 'bolt', pts: [{ x: b.x, y: b.y + 40 }, unitPos(u)], t: 0, life: 0.4, col: '#ff3a4a' }); destroyUnit(u, '분해!'); } },
  nogear:   { name: '부품 차단 60초', run: () => { S.debuff.nogear = 60; } },
  weak:     { name: '공격력 -30% 20초', run: () => { S.debuff.weak = 20; } },
  hardcap:  { name: '단단한 캡슐 30초', run: () => { S.debuff.hardcap = 30; } },
  drain:    { name: '사령관 게이지 절반', run: () => { if (!cmdOpen() || !S.cmd) return false; S.cmd = Math.floor(S.cmd / 2); } },
};
const DEBUFF_NAME = { nogear: '부품 차단', weak: '공격력 -30%', hardcap: '단단한 캡슐' };
function bossGimmick(b, when) {
  S.debuff = S.debuff || {};
  const keys = Object.keys(GIMMICK).filter(k => k !== 'shatter'), lethal = keys.filter(k => GIMMICK[k].lethal), annoy = keys.filter(k => !GIMMICK[k].lethal);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const todo = when === 'rage' ? ['shatter', pick(annoy)] : when === 'mini' ? [pick(keys)] : [pick(lethal), pick(annoy)];
  todo.forEach((k, i) => later(i * 0.9, () => {
    if (b.dead || S.mode !== 'play') return;
    let g = GIMMICK[k];
    if (g.run(b) === false) { g = GIMMICK.seal; g.run(b); }   // 할 게 없으면 칸 봉쇄로
    addText(W / 2, 250 + i * 34, g.name + '!', g.lethal ? '#ff4a5a' : '#ffb04a', 26, 1.6);
    S.glitch = Math.max(S.glitch, 0.3); play('zap', 0.4, 0.6);
  }));
  hintOnce('gimmick', '보스가 방해 기술을 써요');
}
// 게임 시간으로 잠시 뒤에 할 일 (일시정지, 정지장, 배속, 시뮬과 맞게)
function later(t, fn) { (S.later || (S.later = [])).push({ t, fn }); }
function destroyUnit(u, why) {
  const p = unitPos(u); unplace(u); u.hp = 0; S.lost++;
  boom(p.x, p.y, 1.4, '#ff4a5a'); sparks(p.x, p.y, '#ff8a8a', 24, 340); shake(0.5);
  addText(p.x, p.y - 30, why, '#ff6a7a', 22, 1.2); play('shield_break', 0.5); play('boom_low', 0.4);
}
function sealCells(n, from) {
  for (let k = 0; k < n; k++) {
    const pool = []; for (let c = 0; c < COLS * openRows(); c++) if (!isBroken(c)) pool.push(c);
    if (pool.length <= 2) return;   // 판이 너무 막히지 않게 두 칸은 남긴다
    const c = pool[Math.floor(Math.random() * pool.length)], u = S.slots[c], q = cellPos(c);
    if (u) destroyUnit(u, '봉쇄!');
    S.broken.push({ c, t: Infinity, seal: true });
    if (from) S.fx.push({ kind: 'bolt', pts: [{ x: from.x, y: from.y + 40 }, q], t: 0, life: 0.35, col: '#ff4a5a' });
    S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.6, color: '#ff4a5a' }); sparks(q.x, q.y, '#ff6a6a', 16, 260);
  }
  addText(W / 2, LINE_Y - 60, '칸 봉쇄!', '#ff5a6a', 26, 1.3); play('zap', 0.45, 0.6);
  hintOnce('seal', '붉은 칸은 봉쇄됐어요');
}
function spawnEnemy(k, x, y) {
  const d = ENEMY[k];
  const hp = d.hp * (d.boss ? BOSS_MUL * (S.stage.endless ? ENDLESS_BOSS * hpMul() : 1) : hpMul());
  const sh = d.shield ? d.shield * hp : mutOn('shield') && !d.boss && k !== 'rock' && k !== 'splitS' ? 0.3 * hp : 0;
  const e = { k, x, y, hp, maxHp: hp, shield: sh, maxShield: sh, downT: 0, pending: 0, r: d.r, speed: d.speed,
              vx: 0, rot: 0, spin: d.spin ? d.spin * (Math.random() < 0.5 ? -1 : 1) : 0, t: 0, flash: 0,
              img: d.img, w: d.w, h: d.h, boss: !!d.boss, phase: 0, spawnT: 0, skillT: 0,
              atkT: d.boss ? 3 : 1.2, atkLeft: d.atkN || 3, hoverY: d.hover ? d.hover[0] + Math.random() * (d.hover[1] - d.hover[0]) : 250 + Math.random() * 90,
              stun: 0, frozen: 0, slow: 0, slowT: 0, burnT: 0, burnD: 0, hacked: 0, hackT: 0 };
  if (k === 'rock') { e.img = Math.random() < 0.5 ? 'enemies/rock1' : 'enemies/rock2'; e.spin = (Math.random() - 0.5) * 4; }
  // 무한 11웨이브부터 일반 적 일부가 정예로: 가속, 장갑, 분열, 자폭 (색 고리로 구분)
  if (S.stage.endless && !d.boss && S.wave >= 11 && !['rock', 'splitS', 'minion'].includes(k) && Math.random() < Math.min(0.3, 0.1 + 0.01 * (S.wave - 11))) {
    e.aff = AFFIX_KEYS[Math.floor(Math.random() * AFFIX_KEYS.length)];
    if (e.aff === 'fast') e.speed *= 1.5;
    if (e.aff === 'armor' && !e.shield) { e.shield = e.maxShield = 0.6 * hp; }
    hintOnce('aff', '색 고리 = 정예 적');
  }
  S.enemies.push(e);
  return e;
}
function runEvent(ev) {
  const rx = () => 60 + Math.random() * (W - 120);
  if (ENEMY_HINT[ev.k]) introOnce(ev.k);
  switch (ev.k) {
    case 'rocks': {
      const cx = 90 + Math.random() * (W - 180);
      for (let i = 0; i < 6; i++) spawnEnemy('rock', cx + (Math.random() - 0.5) * 110, -30 - Math.random() * 70);
      break;
    }
    case 'meteor': launchAttack('meteor', null, 3); break;
    case 'surge': addText(W / 2, 250, '몰아치기!', '#ff8a6a', 30, 1.3); play('drums', 0.45, 1.2); S.fx.push({ kind: 'warp', x: W / 2, y: 24, t: 0, life: 0.5 }); break;
    case 'freeze': launchAttack('freeze', null, 0); break;
    case 'gold': {
      const deck = battleDeck().filter(t => UNIT[t].shape === 1);
      const left = Math.random() < 0.5, c = makeCap({ type: deck[Math.floor(Math.random() * deck.length)] || 'f', lv: 3, n: 1, gold: true }, left ? -40 : W + 40, 1);
      c.y = 250 + Math.random() * 80; c.vx = left ? 115 : -115; c.speed = 4; c.lock = true; c.hits = c.maxHits = Math.round(22 * (1 + 0.04 * S.stage.n));
      addText(W / 2, 300, '황금 캡슐!', '#ffd24a', 28, 1.4); play('unlock', 0.4, 1.2);
      hintOnce('gold', '황금 캡슐을 누르면 Lv3 기체');
      break;
    }
    case 'ambush': {
      const left = Math.random() < 0.5;
      for (let i = 0; i < 3; i++) { const e = spawnEnemy('rusher', left ? 20 : W - 20, 120 + i * 50); e.vx = left ? 160 : -160; }
      break;
    }
    case 'elite': hintOnce('elite', '엘리트 전함을 잡으면 고급 캡슐'); spawnEnemy('elite', W / 2, -60); break;
    case 'cap': {
      const mul = (1 + 0.25 * (S.wave - 1)) * (1 + 0.015 * (S.stage.n - 1));   // 뒤 스테이지일수록 조금씩 단단해진다 (예전 0.03의 절반)
      if (Array.isArray(ev.r)) {
        const a = makeCap(ev.r[0], 150, mul), b = makeCap(ev.r[1], W - 150, mul);
        a.pair = b; b.pair = a;
        hintOnce('pair', '묶인 캡슐은 하나만 얻어요');
        if (stageRule() === 'side') { sideCap(a); sideCap(b); }
      } else {
        const rw = ((S.pk.goldCap && Math.random() < S.pk.goldCap) || (S.pk.lastStand && S.hp <= 3)) && !ev.r.heal ?   // 황금 손, 배수진
           (() => { const d = battleDeck().filter(t => UNIT[t].shape === 1); return { type: d[Math.floor(Math.random() * d.length)] || 'f', lv: 3, n: 1, gold: true }; })() : ev.r;   // 황금 손
        const c = makeCap(rw, rx(), mul); if (stageRule() === 'side') sideCap(c);
      }
      break;
    }
    default:
      if (ENEMY[ev.k].boss) {
        const b = spawnEnemy(ev.k, ev.x || W / 2, -120);
        if (ev.x) b.cx = ev.x;
        if (ev.mini) { const f = ev.mini === true ? 0.4 : ev.mini; for (const k of ['hp', 'maxHp', 'shield', 'maxShield']) b[k] *= f; b.mini = true; }   // 중간 보스로 나온 보스 (체력을 줄여서)
        if (ev.rage) bossRage(b);
        if (!SHOT && !S.tut) later(2.6, () => { if (!b.dead && S.mode === 'play') bossGimmick(b, b.mini ? 'mini' : 'spawn'); });   // 보스, 중간 보스: 나타나면 기믹
        if (!S.boss || S.boss.dead) S.boss = b;
        if (!S.bossCine && !S.tut && !SHOT) { S.bossCine = { k: ev.k, t: 0 }; play('vo_hostile', 0.8); play('drums', 0.5, 0.8); }
        if (ev.k === 'boss3') hintOnce('b3', '모선 보호막은 폭발이나 번개로');
      } else if (ev.k === 'grunt' && !ev.surge && S.wave >= 2 && Math.random() < 0.25) {
        const x = 110 + Math.random() * (W - 220);
        for (const [dx, dy] of [[0, 0], [-46, -40], [46, -40]]) { const g = spawnEnemy('grunt', x + dx, -50 + dy); g.hp = g.maxHp = g.maxHp * 0.45; }
        S.fx.push({ kind: 'warp', x, y: 24, t: 0, life: 0.45 });
      } else { const e = spawnEnemy(ev.k, rx(), -50); S.fx.push({ kind: 'warp', x: e.x, y: 24, t: 0, life: 0.35 }); }
  }
}
function makeCap(rw, x, mul) {
  if (S.debuff && S.debuff.hardcap > 0) mul *= 1.5;   // 단단한 캡슐 기믹
  let hits = Math.max(1, rw.heal ? Math.round(12 * mul * S.pk.cap) : Math.round(UNIT[rw.type].cost * rw.n * [1, 3.2, 5.5][Math.min(rw.lv, 3) - 1] * mul * S.pk.cap));
  const mh = hits;
  const c = { rw, x, y: -40, hits, maxHits: mh, pending: 0, r: 34, speed: 34, pair: null, bob: Math.random() * 6, carrier: null };
  S.caps.push(c);
  return c;
}
// 캡슐 색 = 안에 든 기체의 색 (격납고에서 고른 색 포함). 종류는 위 글자로 구분
function capLook(rw) {
  if (rw.heal) return { cap: 'cap_heal', col: '#6dff8a', label: '수리' };
  const col = UNIT[rw.type].col, cap = capTint(col);
  if (rw.gold) return { cap, col, label: '황금', gold: true };
  if (UNIT[rw.type].shape !== 1) return { cap, col, label: '대형' };
  if (rw.lv >= 2) return { cap, col, label: 'Lv' + rw.lv };
  return { cap, col, label: '+' + rw.n };
}
// 캡슐 그림에 기체 색을 입힌다 (밝기는 그대로, 색만 바꿈). 색마다 한 번 만든다
function capTint(col) {
  const key = 'capc' + col, im = IMG.cap_f;
  if (!IMG[key] && im && im.width) IMG[key] = offscreen(im.width, im.height, g => {
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'color'; g.fillStyle = col; g.fillRect(0, 0, im.width, im.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
  });
  return IMG[key] ? key : 'cap_f';
}

