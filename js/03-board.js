'use strict';
// ── 칸과 배치 ─────────────────────────────────────────────
const cellPos = i => ({ x: GRID_X + (i % COLS) * CW + CW / 2, y: GRID_Y + Math.floor(i / COLS) * CH + CH / 2 });
const resPos = k => ({ x: RES_X + RES_W / 2 + k * (RES_W + 4), y: LINE_Y - 30 });
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
  return k >= 0 && k < RES_N && x - RES_X - k * (RES_W + 4) <= RES_W + 2 ? k : -1;
}
function cellsFor(u, c) {
  // 누른 칸이 모양 가운데쯤 오게 두고, 판 밖으로 나가면 안쪽으로 민다
  const pts = shapePts(u.type), { h, w } = shapeDims(u.type);
  let r0 = Math.floor(c / COLS) - Math.floor((h - 1) / 2), c0 = c % COLS - Math.floor((w - 1) / 2);
  r0 = Math.max(0, Math.min(openRows() - h, r0)); c0 = Math.max(0, Math.min(COLS - w, c0));
  return pts.map(([r, cc]) => (r0 + r) * COLS + c0 + cc);
}
function canPlace(u, cells) {
  return cells.every(c => c >= 0 && c < COLS * openRows() && (!S.slots[c] || S.slots[c] === u));
}
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
  atk: { name: '화력', key: 'ATK', col: '#ffb347', v: [0.15, 0.28, 0.45], txt: v => `화력 +${Math.round(v * 100)}%` },
  spd: { name: '공속', key: 'SPD', col: '#48ffd8', v: [0.1, 0.2, 0.32], txt: v => `공격 속도 +${Math.round(v * 100)}%` },
  def: { name: '방어', key: 'DEF', col: '#6ad0ff', v: [0.15, 0.25, 0.35], txt: v => `받는 피해 -${Math.round(v * 100)}%` },
  rng: { name: '사거리', key: 'RNG', col: '#c89bff', v: [50, 90, 130], txt: v => `사거리 +${v}` },
};
const FX_KEYS = ['atk', 'spd', 'def', 'rng'];
const CELL_UP = [5, 8];              // 2단계, 3단계로 올리는 값
const START_ROWS = 2, ROW_ADD = [5, 9];   // 3줄, 4줄로 늘리는 값
const SHOP_BX = 286;   // 판 위 줄의 정비소 버튼 왼쪽 끝
const summonCost = () => 3 + (S.summons || 0);
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
  addText(x, y - 30, `부품 +${n}`, '#ffb347', 18);
  hintOnce('gear', '부품을 얻었어요! 소환 버튼으로 새 기체를 부르거나, 정비소 버튼을 눌러 칸을 강화하고 줄을 늘릴 수 있어요.');
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
let ENDLESS_GROWTH = 1.22;
const hpMul = () => S.stage.endless ? 0.9 * Math.pow(ENDLESS_GROWTH, S.wave - 1) * PACE[cyclePos(S.wave) - 1] * Math.pow(1.25, S.mut.filter(m => m === 'armor').length) : (1 + WAVE_GROWTH * (S.wave - 1)) * stageMul();
function spawnEnemy(k, x, y) {
  const d = ENEMY[k];
  const hp = d.hp * (d.boss ? BOSS_MUL * (S.stage.endless ? 0.7 * Math.pow(ENDLESS_GROWTH, S.wave - 10) : 1) : hpMul());
  const sh = d.shield ? d.shield * hp : mutOn('shield') && !d.boss && k !== 'rock' && k !== 'splitS' ? 0.3 * hp : 0;
  const e = { k, x, y, hp, maxHp: hp, shield: sh, maxShield: sh, downT: 0, pending: 0, r: d.r, speed: d.speed,
              vx: 0, rot: 0, spin: d.spin ? d.spin * (Math.random() < 0.5 ? -1 : 1) : 0, t: 0, flash: 0,
              img: d.img, w: d.w, h: d.h, boss: !!d.boss, phase: 0, spawnT: 0, skillT: 0,
              atkT: d.boss ? 3 : 1.2, atkLeft: 3, hoverY: 250 + Math.random() * 90,
              stun: 0, frozen: 0, slow: 0, slowT: 0, burnT: 0, burnD: 0, hacked: 0, hackT: 0 };
  if (k === 'rock') { e.img = Math.random() < 0.5 ? 'enemies/rock1' : 'enemies/rock2'; e.spin = (Math.random() - 0.5) * 4; }
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
    case 'freeze': launchAttack('freeze', null, 0); break;
    case 'gold': {
      const deck = PROG.deck.filter(t => isOwned(t) && UNIT[t].shape === 1);
      const left = Math.random() < 0.5, c = makeCap({ type: deck[Math.floor(Math.random() * deck.length)] || 'f', lv: 3, n: 1, gold: true }, left ? -40 : W + 40, 1);
      c.y = 250 + Math.random() * 80; c.vx = left ? 115 : -115; c.speed = 4; c.lock = true; c.hits = c.maxHits = Math.round(22 * (1 + 0.04 * S.stage.n));
      addText(W / 2, 300, '황금 캡슐!', '#ffd24a', 28, 1.4); play('unlock', 0.4, 1.2);
      hintOnce('gold', '황금 캡슐은 금방 지나가요. 탭해서 집중 사격하면 Lv3 기체가 나와요.');
      break;
    }
    case 'ambush': {
      const left = Math.random() < 0.5;
      for (let i = 0; i < 3; i++) { const e = spawnEnemy('rusher', left ? 20 : W - 20, 120 + i * 50); e.vx = left ? 160 : -160; }
      break;
    }
    case 'elite': hintOnce('elite', '엘리트 전함은 보호막과 세로줄 포격을 가진 중형 보스예요. 격추하면 고급 캡슐을 떨궈요.'); spawnEnemy('elite', W / 2, -60); break;
    case 'cap': {
      const mul = (1 + 0.25 * (S.wave - 1)) * (1 + 0.03 * (S.stage.n - 1));
      if (Array.isArray(ev.r)) {
        const a = makeCap(ev.r[0], 150, mul), b = makeCap(ev.r[1], W - 150, mul);
        a.pair = b; b.pair = a;
        hintOnce('pair', '두 캡슐이 묶여 오면 먼저 연 쪽만 얻어요. 나머지는 터져요.');
      } else makeCap(ev.r, rx(), mul);
      break;
    }
    default:
      if (ENEMY[ev.k].boss) {
        const b = spawnEnemy(ev.k, ev.x || W / 2, -120);
        if (ev.x) b.cx = ev.x;
        if (!S.boss || S.boss.dead) S.boss = b;
        if (!S.bossCine && !S.tut && !SHOT) { S.bossCine = { k: ev.k, t: 0 }; play('vo_hostile', 0.8); play('drums', 0.5, 0.8); }
        if (ev.k === 'boss3') hintOnce('b3', 'UFO 모선의 보호막은 레이저가 잘 안 먹혀요. 폭발이나 번개로 깨야 해요.');
      } else if (ev.k === 'grunt' && S.wave >= 2 && Math.random() < 0.25) {
        const x = 110 + Math.random() * (W - 220);
        for (const [dx, dy] of [[0, 0], [-46, -40], [46, -40]]) { const g = spawnEnemy('grunt', x + dx, -50 + dy); g.hp = g.maxHp = g.maxHp * 0.45; }
        S.fx.push({ kind: 'warp', x, y: 24, t: 0, life: 0.45 });
      } else { const e = spawnEnemy(ev.k, rx(), -50); S.fx.push({ kind: 'warp', x: e.x, y: 24, t: 0, life: 0.35 }); }
  }
}
function makeCap(rw, x, mul) {
  let hits = Math.max(1, rw.heal ? Math.round(12 * mul * S.pk.cap) : Math.round(UNIT[rw.type].cost * rw.n * [1, 3.2, 5.5][rw.lv - 1] * mul * S.pk.cap));
  const mh = hits;
  const c = { rw, x, y: -40, hits, maxHits: mh, pending: 0, r: 34, speed: 34, pair: null, bob: Math.random() * 6, carrier: null };
  S.caps.push(c);
  return c;
}
function capLook(rw) {
  if (rw.heal) return { cap: 'cap_heal', col: '#6dff8a', label: '수리' };
  if (rw.gold) return { cap: 'cap_up', col: '#ffd24a', label: '황금' };
  if (UNIT[rw.type].shape !== 1) return { cap: 'cap_t', col: '#ff8a4a', label: '대형' };
  if (rw.lv >= 2) return { cap: 'cap_up', col: '#ffd84a', label: 'Lv' + rw.lv };
  return { cap: 'cap_f', col: '#48c8ff', label: '+' + rw.n };
}

