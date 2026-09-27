'use strict';
// ── 적의 공격 (경고 → 발사) ────────────────────────────────
const occupied = i => !!S.slots[i];
function countOcc(cells) { return cells.reduce((n, c) => n + (occupied(c) ? 1 : 0), 0); }
function bestOf(cands) {
  let best = null, bn = 0;
  for (const cells of cands) { const n = countOcc(cells) + Math.random() * 0.5; if (n > bn) { bn = n; best = cells; } }
  return bn >= 1 ? best : null;
}
function pickCells(kind) {
  const all = [];
  if (kind === 'snipe') {
    const bag = [];
    for (let i = 0; i < COLS * ROWS; i++) if (occupied(i)) { const r = Math.floor(i / COLS); for (let k = 0; k < openRows() - r; k++) bag.push(i); }
    return bag.length ? [bag[Math.floor(Math.random() * bag.length)]] : null;
  }
  if (kind === 'column') for (let c = 0; c < COLS; c++) all.push([...Array(openRows())].map((_, r) => c + r * COLS));
  if (kind === 'row') for (let r = 0; r < openRows(); r++) all.push([...Array(COLS)].map((_, c) => r * COLS + c));
  if (kind === 'diag') for (let c = 0; c < COLS; c++) for (const d of [1, -1]) {
    if (c + 2 * d < 0 || c + 2 * d >= COLS) continue;
    all.push([c, COLS + c + d, 2 * COLS + c + 2 * d]);
  }
  if (kind === 'meteor' || kind === 'freeze') for (let r = 0; r < openRows() - 1; r++) for (let c = 0; c < COLS - 1; c++) {
    const i = r * COLS + c; all.push([i, i + 1, i + COLS, i + COLS + 1]);
  }
  if (kind === 'cross') for (let i = 0; i < COLS * ROWS; i++) if (occupied(i)) {
    const r = Math.floor(i / COLS), c = i % COLS, cells = new Set();
    for (let k = 0; k < COLS; k++) cells.add(r * COLS + k);
    for (let k = 0; k < ROWS; k++) cells.add(k * COLS + c);
    all.push([...cells]);
  }
  return bestOf(all);
}
function launchAttack(kind, src, dmg) {
  const cells = pickCells(kind);
  if (!cells) return false;
  const warn = kind === 'meteor' || kind === 'freeze' ? 1.8 : kind === 'row' || kind === 'cross' ? 1.9 : 1.5;
  S.attacks.push({ kind, cells, src, dmg, t: 0, warn });
  if (src && !src.boss) hintOnce('atkfocus', '공격하려는 적을 탭하면 집중 사격해요. 경고가 끝나기 전에 격추하면 공격이 취소돼요.');
  return true;
}
function cellsCenter(cells) {
  let x = 0, y = 0;
  for (const c of cells) { const p = cellPos(c); x += p.x; y += p.y; }
  return { x: x / cells.length, y: y / cells.length };
}
function resolveAttack(a) {
  if (a.kind === 'freeze') {   // 빙결: 피해 대신 4초 동안 못 쏜다
    const done = new Set();
    for (const c of a.cells) { const u = S.slots[c]; if (u && !done.has(u)) { done.add(u); u.ice = 4; const p = unitPos(u); addText(p.x, p.y - 24, '빙결!', '#bff4ff', 18, 0.8); } const q = cellPos(c); S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.5, color: '#bff4ff' }); }
    sparks(cellsCenter(a.cells).x, cellsCenter(a.cells).y, '#dff8ff', 16, 260, 'shard'); play('shield_crack', 0.45, 1.3);
    return;
  }
  // 방공포 요격
  if (a.kind === 'snipe' || a.kind === 'diag' || a.kind === 'meteor') {
    for (const u of gridUnits()) if (((u.type === 'a' && u.lv >= 3) || (u.type === 'w' && u.lv >= 2)) && u.t2 <= 0 && a.cells.some(c => u.cells.some(uc => cellDist(uc, c) <= 1))) {
      u.t2 = u.type === 'w' ? (u.lv >= 4 ? 5 : 8) : 7;
      const m = cellsCenter(a.cells), p = unitPos(u);
      S.fx.push({ kind: 'bolt', pts: [{ x: p.x, y: p.y - 20 }, { x: m.x, y: m.y - 60 }], t: 0, life: 0.25, col: '#ffffff' });
      boom(m.x, m.y - 60, 1.1, '#e0e8ff');
      addText(m.x, m.y - 30, '요격!', '#e6f0ff', 24);
      return;
    }
  }
  const hit = new Map();
  for (const c of a.cells) {
    const u = S.slots[c];
    if (!u || (drag && drag.unit === u && drag.moved)) continue;
    // 방공 돔: 주변 3×3 칸은 피해 없음
    if (gridUnits().some(d => d.type === 'a' && d.lv >= 5 && d.cells.some(dc => cellDist(dc, c) <= 1))) { const p = cellPos(c); addText(p.x, p.y - 20, '방어!', '#d0e8ff', 16, 0.7); continue; }
    hit.set(u, true);
  }
  for (const u of hit.keys()) {
    // 방패 드론이 주변 기체 대신 맞는다
    let taker = u, dmg = a.dmg;
    if (u.type !== 'g') {
      const g = [...crossOf(u)].find(o => o.type === 'g' && o.hp > 0 && o.cells);
      if (g) {
        taker = g; dmg = Math.max(1, Math.round(a.dmg * (g.lv >= 4 ? 0.4 - 0.05 * tier(g) : 0.7)));
        const p1 = unitPos(u), p2 = unitPos(g);
        S.fx.push({ kind: 'bolt', pts: [p1, p2], t: 0, life: 0.3, col: '#6ad0ff' });
      }
    }
    if (!u.cells) continue;
    damageUnit(taker, dmg);
    if (taker.type === 'g' && taker.cells && taker.lv >= 3 && a.src && !a.src.dead) {   // 방패 드론이 방금 파괴됐으면 반사 없음
      DMG_BY = 'g'; hitEnemy(a.src, UNIT.g.dmg * LV_MUL[taker.lv - 1] * 12, 'blast'); DMG_BY = null;
      const p = unitPos(taker);
      S.fx.push({ kind: 'bolt', pts: [p, { x: a.src.x, y: a.src.y }], t: 0, life: 0.3, col: '#6ad0ff' });
    }
  }
  const src = a.src ? { x: a.src.x, y: a.src.y + (a.src.boss ? a.src.h * 0.3 : 10) } : null;
  S.fx.push({ kind: 'atk', atk: a.kind, cells: a.cells, src, t: 0, life: 0.45 });
  if (a.kind === 'diag') a.cells.forEach((c, k) => { const p = cellPos(c); S.fx.push({ kind: 'boom', x: p.x, y: p.y, t: -k * 0.09, life: 0.5, size: 1, color: '#ffa020' }); });
  else for (const c of a.cells) { const p = cellPos(c); S.fx.push({ kind: 'boom', x: p.x, y: p.y, t: 0, life: 0.45, size: a.kind === 'meteor' ? 1.3 : 0.8, color: '#ff4a3a' }); }
  if (a.kind === 'meteor') { const m = cellsCenter(a.cells); sparks(m.x, m.y, '#ffb347', 30, 420); S.shake = Math.max(S.shake, 0.6); }
  S.shake = Math.max(S.shake, 0.3);
  play('shieldDown', 0.3);
}
function damageUnit(u, dmg) {
  if (!u.cells && u.res == null) return;   // 이미 파괴된 기체
  const p = unitPos(u);
  let red = cellDef(u);
  if (u.type === 'w') red = 1 - (1 - red) * (0.5 - 0.05 * tier(u));
  else if (u.cells && gridUnits().some(o => o.type === 'w' && o.lv >= 3 && crossOf(o).has(u))) red = 1 - (1 - red) * 0.75;
  if (red) { const v = dmg * (1 - red); dmg = Math.floor(v) + (Math.random() < v % 1 ? 1 : 0); }
  if (dmg <= 0) { addText(p.x, p.y - 30, '막음', '#6ad0ff', 18, 0.8); play('shield_hit', 0.3); return; }
  u.hp -= dmg; u.hurt = 0.35;
  play('base_hit', 0.35, 1.3);
  addText(p.x, p.y - 30, `-${dmg}`, '#ff5a6a', 22, 0.9, true);
  sparks(p.x, p.y, '#ff6a5a', 10, 220);
  if (u.hp <= 0) {
    // 수리 드론 Lv4: 긴급 무적
    const medic = gridUnits().find(m => m.type === 'm' && m.lv >= 4 && m.t3 <= 0 && m !== u);
    if (medic) {
      medic.t3 = 20; u.hp = 1;
      const q = unitPos(medic);
      S.fx.push({ kind: 'bolt', pts: [q, p], t: 0, life: 0.4, col: '#6dff8a' });
      addText(p.x, p.y - 8, '긴급 수리!', '#6dff8a', 20);
      return;
    }
    unplace(u);
    if (drag && drag.unit === u) drag = null;
    S.lost++;
    boom(p.x, p.y, 1.6, '#ff5a3a'); sheetFx(4, p.x, p.y, 300, 1);
    play('boom_big', 0.5, 1.1); play('kaboom', 0.6, 0.9); punch(0.8);
    sparks(p.x, p.y, '#c8d0e0', 16, 300, 'shard');
    S.glitch = Math.max(S.glitch, 0.35); S.shake = Math.max(S.shake, 0.7);
    addText(p.x, p.y - 8, '기체 파괴!', '#ff4a5a', 22, 1.3);
    hintOnce('lost', '파괴된 기체는 이번 판에서 돌아오지 않아요. 붉은 칸이 보이면 미리 옮기세요.');
    const rb = gridUnits().find(m => m.type === 'm' && m.lv >= 5 && m.t2 <= 0);
    if (rb) { rb.t2 = 25; S.rebuilds.push({ type: u.type, t: 2, from: unitPos(rb) }); }
  }
}

// ── 조준 ──────────────────────────────────────────────────
function effHp(e) { return e.hp + e.shield * 2; }
let RANGE_Y = FIRE_Y;
function focusValid() {
  const f = S.focus;
  if (!f || f.dead || f.y <= RANGE_Y) return false;
  return f.maxHits ? S.caps.includes(f) : S.enemies.includes(f);
}
let DMG_BY = null;   // 지금 피해를 주는 기체 종류 (전투 분석용)
const shootable = e => !e.dead && !(e.hacked > 0) && !(e.ph > 0);
function pickTarget() {
  const fOk = focusValid();
  if (fOk && S.focus.pending < (S.focus.maxHits ? S.focus.hits : effHp(S.focus))) return S.focus;   // 탭한 목표가 언제나 먼저
  for (const e of S.enemies) if (e.carry && e.y > 70 && e.pending < effHp(e) && shootable(e)) return e;
  // 방어선 가까이 온 적이 없으면 캡슐부터 알아서 쏜다. 묶인 캡슐과 황금 캡슐은 직접 골라야 한다
  if (!S.enemies.some(e => shootable(e) && e.y > LINE_Y - 230)) {
    let bc = null, cy = -1e9;
    for (const c of S.caps) if (c.y > RANGE_Y && c.pending < c.hits && !c.lock && !c.carrier && !(c.pair && S.caps.includes(c.pair)) && c.y > cy) { cy = c.y; bc = c; }
    if (bc) return bc;
  }
  let best = null, by = -1e9;
  for (const e of S.enemies) {
    if (e.y < RANGE_Y || e.pending >= effHp(e) || !shootable(e)) continue;
    if (e.y > by) { by = e.y; best = e; }
  }
  if (best) return best;
  if (fOk) return S.focus;
  for (const e of S.enemies) if (shootable(e) && (e.y > RANGE_Y || (e.carry && e.y > 70)) && e.y > by) { by = e.y; best = e; }
  if (best) return best;
  for (const c of S.caps) if (c.y > RANGE_Y && c.pending < c.hits && c.y > by && !c.lock) { by = c.y; best = c; }
  return best;
}
function pickHeavy() {
  if (focusValid()) return S.focus;
  let best = null, bh = 0;
  for (const e of S.enemies) if (shootable(e) && e.y > RANGE_Y && e.pending < effHp(e) && effHp(e) > bh) { bh = effHp(e); best = e; }
  return best || pickTarget();
}
function pickFar() {
  if (focusValid()) return S.focus;
  let best = null, by = 1e9;
  for (const e of S.enemies) if (shootable(e) && e.y > 70 && e.pending < effHp(e) && e.y < by) { by = e.y; best = e; }
  return best || pickTarget();
}
function chargingAttacker() {
  for (const a of S.attacks) if (a.src && !a.src.boss && shootable(a.src) && a.src.y > RANGE_Y) return a.src;
  return null;
}

// ── 사격 ──────────────────────────────────────────────────
function shoot(type, x, y, dmg, lv, fan = 0, tgt = null, extra = null) {
  tgt = tgt || pickTarget();
  if (!tgt) return null;
  const isCap = !!tgt.maxHits;
  tgt.pending += isCap ? 1 : dmg;
  const ang = Math.atan2(tgt.y - y, tgt.x - x) + fan;
  const def = UNIT[type] || UNIT.f;
  const s = { type, x, y, vx: Math.cos(ang) * def.sp, vy: Math.sin(ang) * def.sp, sp: def.sp, turn: def.turn, tgt, dmg, lv, isCap };
  if (extra) Object.assign(s, extra);
  s.ut = DMG_BY; S.shots.push(s);
  return s;
}
// 탭한 목표로 곧바로: 날아가던 추적탄도 방향을 틀고, 기체들은 바로 다음 발을 쏜다
function snapFocus(f) {
  const cap = !!f.maxHits;
  for (const sh of S.shots) {
    if (!sh.tgt || sh.tgt === f || sh.hitSet || !sh.turn || sh.done) continue;
    const old = sh.tgt; old.pending = Math.max(0, (old.pending || 0) - (sh.isCap ? 1 : sh.dmg));
    sh.tgt = f; sh.isCap = cap; f.pending = (f.pending || 0) + (cap ? 1 : sh.dmg); sh.turn = Math.max(sh.turn, 10);
  }
  for (const u of gridUnits()) u.cd = Math.min(u.cd, 0.08);
}
function pierce(x, y, dmg, lv, tgt = null, col = '#b86bff', extra = null) {
  tgt = tgt || pickTarget();
  if (!tgt) return null;
  if (!tgt.maxHits) tgt.pending += dmg;
  const ang = Math.atan2(tgt.y - y, tgt.x - x);
  const s = { type: 'p', x, y, vx: Math.cos(ang) * 1150, vy: Math.sin(ang) * 1150, dmg, lv, hitSet: new Set(), col, tgt };
  if (extra) Object.assign(s, extra);
  s.ut = DMG_BY; S.shots.push(s);
  return s;
}
function lightning(from, first, dmg, lv) {
  const pts = [{ x: from.x, y: from.y }];
  if (first.maxHits) { hitCap(first); pts.push({ x: first.x, y: first.y }); S.fx.push({ kind: 'bolt', pts, t: 0, life: 0.18, col: '#ffe24a' }); return; }
  const n = [2, 3, 3, 5, 5][lv - 1], seen = new Set();
  let cur = first;
  for (let k = 0; k < n && cur; k++) {
    seen.add(cur); pts.push({ x: cur.x, y: cur.y });
    hitEnemy(cur, dmg, lv >= 3 ? 'emp3' : 'emp');
    if (lv >= 4 && !cur.boss) cur.stun = Math.max(cur.stun, 0.4);
    let nx = null, nd = 140;
    for (const e of S.enemies) if (!seen.has(e) && shootable(e)) { const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nx = e; } }
    cur = nx;
  }
  S.fx.push({ kind: 'bolt', pts, t: 0, life: 0.2, col: '#ffe24a' });
}
function layMines(u, base) {
  const own = S.mines.filter(m => m.owner === u).length;
  const n = Math.min([1, 2, 2, 2, 3][lvIdx(u.lv)], 6 - own);
  const p = unitPos(u);
  for (let k = 0; k < n; k++) {
    const near = S.enemies.filter(e => e.y > 40 && e.y < LINE_Y - 150 && shootable(e));
    const ref = near.length ? near[Math.floor(Math.random() * near.length)] : null;
    const x = ref ? ref.x + (Math.random() - .5) * 40 : 60 + Math.random() * (W - 120);
    const y = ref ? Math.min(LINE_Y - 110, ref.y + 70 + Math.random() * 60) : FIRE_Y + 60 + Math.random() * (LINE_Y - FIRE_Y - 170);
    S.mines.push({ x, y, owner: u, dmg: base, lv: u.lv, t: 0, px: p.x, py: p.y });
  }
  return n > 0;
}
function fireUnit(u) {
  const p = unitPos(u), L = Math.min(u.lv, 5), def = UNIT[u.type];
  const base = def.dmg * LV_MUL[u.lv - 1] * cellAtk(u) * (1 + u.buffDmg) * mkMul(u.type) * S.pk.dmg;
  let ok = null;
  switch (u.type) {
    case 'f': {
      const y = p.y - 22;
      if (L === 1) ok = shoot('f', p.x, y, base, L);
      else if (L === 2) { ok = shoot('f', p.x - 8, y, base / 2, L); shoot('f', p.x + 8, y, base / 2, L); }
      else if (L === 3) { ok = shoot('f', p.x, y, base / 3, L); shoot('f', p.x - 9, y, base / 3, L, -0.35); shoot('f', p.x + 9, y, base / 3, L, 0.35); }
      else { ok = pierce(p.x - 8, y, base / 2, L); pierce(p.x + 8, y, base / 2, L); }
      if (ok) play('shot', 0.17, 1 + L * 0.03);
      break;
    }
    case 't': {
      const n = L >= 2 ? 2 : 1;
      for (let k = 0; k < n; k++) { const s = shoot('t', p.x + (n === 2 ? (k ? 7 : -7) : 0), p.y - 6, base / n, L, n === 2 ? (k ? 0.18 : -0.18) : 0); if (s) ok = s; }
      break;
    }
    case 'b': {
      const guns = L >= 2 ? 2 : 1, side = L >= 4 ? 4 : L >= 3 ? 2 : 0;
      const shellDmg = base * (side ? 0.8 : 1) / guns;
      for (let k = 0; k < guns; k++) { const s = shoot('b', p.x + (guns === 2 ? (k ? 14 : -14) : 0), p.y - 28, shellDmg, L); if (s) ok = s; }
      for (let k = 0; k < side; k++) { const s = shoot('f', p.x + (k % 2 ? 44 : -44) * U_SCALE, p.y - 6, base * 0.2 / Math.max(1, side / 2), Math.min(L, 3), (k % 2 ? 0.3 : -0.3)); if (s) ok = ok || s; }
      break;
    }
    case 's': {
      const tgt = pickHeavy();
      if (!tgt) break;
      let dmg = base, crit = false;
      if (L >= 2 && Math.random() < 0.3) { dmg *= 2.5; crit = true; }
      if (L >= 4 && tgt.boss) dmg *= 1.5;
      ok = L >= 3 ? pierce(p.x, p.y - 22, dmg, L, tgt, '#7dff7a', { crit, exec: L >= 4 }) : shoot('s', p.x, p.y - 22, dmg, L, 0, tgt, { crit, exec: L >= 4 });
      break;
    }
    case 'g': case 'm': ok = shoot(u.type, p.x, p.y - 14, base, Math.min(L, 3)); break;
    case 'e': {
      const tgt = pickTarget();
      if (!tgt) break;
      lightning({ x: p.x, y: p.y - 20 }, tgt, base, L);
      ok = { tgt };
      break;
    }
    case 'c': ok = shoot('c', p.x, p.y - 18, base, L); break;
    case 'a': {
      const n = [3, 5, 5, 6, 7][L - 1], lock = L >= 4 && !focusValid() ? chargingAttacker() : null;
      for (let k = 0; k < n; k++) { const s = shoot('a', p.x, p.y - 16, base, Math.min(L, 3), (k - (n - 1) / 2) * 0.16, lock); if (s) ok = s; }
      break;
    }
    case 'h': {
      const R = L >= 5 ? 420 : L >= 3 ? 300 : 270, half = L >= 2 ? 0.55 : 0.4;
      let tgt = null, td = 1e9;
      if (focusValid() && !S.focus.maxHits && Math.hypot(S.focus.x - p.x, S.focus.y - p.y) < R) tgt = S.focus;
      else for (const e of S.enemies) if (shootable(e) && e.y < p.y) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R && d < td) { td = d; tgt = e; } }
      if (!tgt) break;
      const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x), dps = base * (L >= 5 ? 2 : 1);
      for (const e of S.enemies) {
        if (!shootable(e)) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > R + e.r) continue;
        let da = Math.atan2(e.y - p.y, e.x - p.x) - ang;
        while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > half) continue;
        hitEnemy(e, dps * UNIT.h.cd, 'fire', true);
        if (L >= 3 && !e.boss) { e.burnT = 3; e.burnD = base * 0.2; e.burnBy = DMG_BY; }
      }
      const col = L >= 5 ? '#6ad8ff' : '#ff8a2a';
      for (let k = 0; k < 3; k++) {
        const a = ang + (Math.random() - .5) * half * 2, v = R * (1.2 + Math.random() * 0.8);
        if (S.parts.length < 400) S.parts.push({ kind: 'flame', x: p.x, y: p.y - 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.45, size: 8 + Math.random() * 8, color: col });
      }
      u.ang = ang;
      ok = { tgt };
      break;
    }
    case 'n': ok = layMines(u, base) ? {} : null; break;
    case 'v': {
      const n = L >= 4 ? 2 : 1;
      for (let k = 0; k < n; k++) { const s = shoot('v', p.x + (n === 2 ? (k ? 10 : -10) : 0), p.y - 14, base, L, n === 2 ? (k ? 0.25 : -0.25) : 0); if (s) ok = s; }
      break;
    }
    case 'k': {
      const n = L >= 4 ? 2 : 1, dur = L >= 5 ? 6 : L >= 3 ? 5 : 4;
      const cands = S.enemies.filter(e => shootable(e) && !e.boss && e.y > RANGE_Y).sort((a, b) => b.maxHp - a.maxHp);
      for (let k = 0; k < n && k < cands.length; k++) {
        const e = cands[k];
        e.hacked = dur; e.hackBy = u; e.hackT = 0;
        for (const a of S.attacks) if (a.src === e) a.cancelled = true;
        S.fx.push({ kind: 'bolt', pts: [{ x: p.x, y: p.y - 16 }, { x: e.x, y: e.y }], t: 0, life: 0.4, col: '#5aff9a' });
        addText(e.x, e.y - e.r - 12, 'HACKED', '#5aff9a', 16, 1, true);
        ok = { tgt: e };
      }
      break;
    }
    case 'r': {
      const n = L >= 2 ? 2 : 1;
      for (let k = 0; k < n; k++) { const s = shoot('r', p.x + (n === 2 ? (k ? 12 : -12) : 0), p.y - 60, base / n, L, 0, pickFar()); if (s) ok = s; }
      break;
    }
    case 'x': return true;
    case 'w': {
      const n = [3, 3, 4, 4, 5][L - 1];
      for (let k = 0; k < n; k++) { const s2 = shoot('a', p.x, p.y - 16, base, Math.min(L, 3), (k - (n - 1) / 2) * 0.18); if (s2) ok = s2; }
      break;
    }
    case 'l': {
      const n = L >= 3 ? 3 : L >= 2 ? 2 : 1, tgt = pickHeavy();
      if (!tgt || tgt.maxHits) break;
      for (let k = 0; k < n; k++) {
        let dmg = base / (n === 1 ? 1 : 0.8 * n), crit = L >= 4 && Math.random() < 0.3;
        if (crit) dmg *= 2.5;
        const s2 = pierce(p.x + (k - (n - 1) / 2) * 30, p.y - 20, dmg, L, n === 3 && k !== 1 ? null : tgt, '#5ae0ff', { crit });
        if (s2) ok = s2;
      }
      break;
    }
    case 'q': {
      const wd = [18, 22, 30, 34, 40][L - 1];
      if (!S.enemies.some(e => shootable(e) && e.y < p.y && Math.abs(e.x - p.x) < wd + e.r)) break;
      S.beams.push({ u, x: p.x, y: p.y - 26, ang: -Math.PI / 2, t: 0, life: [1, 1.2, 1.4, 1.6, 1.8][L - 1], dps: base, capT: 0, col: '#b86bff', w: wd, slowB: L >= 4 });
      ok = {};
      break;
    }
    case 'y': ok = shoot('b', p.x, p.y - 34, base, Math.min(L, 3)); break;
  }
  if (ok) {
    const snd = { w: 'shot_retro', l: 'shot_big', q: 'beam', y: 'shot_big', t: 'shot_retro', a: 'shot_retro', v: 'shot_retro', s: 'shot_big', b: 'shot_big', r: 'boom_low', c: 'shot', g: 'shot', m: 'shot', e: 'zapfx' }[u.type];
    if (snd) play(snd, snd === 'shot_big' ? 0.3 : snd === 'boom_low' || snd === 'beam' ? 0.3 : snd === 'zapfx' ? 0.18 : 0.14, snd === 'shot' ? 1.1 : snd === 'shot_retro' ? 0.85 : 1);
    if (u.type === 'e') play('crackle', 0.16, 1.1);
    const t = ok.tgt || null;
    if (t && u.type !== 'h') u.ang = Math.atan2(t.y - p.y, t.x - p.x);
    u.kick = 0.08; u.flash = 0.07;
  }
  return !!ok;
}
// Lv5 주기 스킬
function densest(r = 110) {
  let best = null, bn = 0;
  for (const e of S.enemies) {
    if (e.y < RANGE_Y - 40 || !shootable(e)) continue;
    let n = 0;
    for (const o of S.enemies) if (Math.hypot(o.x - e.x, o.y - e.y) < r) n += o.boss ? 3 : 1;
    if (n > bn) { bn = n; best = e; }
  }
  return best;
}
function unitSkill(u) {
  const p = unitPos(u), base = UNIT[u.type].dmg * LV_MUL[u.lv - 1] * (1 + u.buffDmg) * mkMul(u.type) * S.pk.dmg;
  switch (u.type) {
    case 'f': {
      const tgt = pickTarget();
      if (!tgt) return false;
      S.beams.push({ u, x: p.x, y: p.y - 26, ang: Math.atan2(tgt.y - (p.y - 30), tgt.x - p.x), t: 0, life: 1.3, dps: base * 6.5, capT: 0, col: '#ffd24a' });
      S.shake = Math.max(S.shake, 0.25); play('zap', 0.3);
      return true;
    }
    case 'b': {
      const tgt = pickTarget();
      if (!tgt || tgt.maxHits) return false;
      const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      S.shots.push({ ut: DMG_BY, type: 'plasma', x: p.x, y: p.y - 30, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, sp: 520, turn: 3, tgt, dmg: base * 4, lv: 5 });
      S.fx.push({ kind: 'ring', x: p.x, y: p.y - 30, t: 0, life: 0.4, color: '#7fe8ff' });
      play('zap', 0.35);
      return true;
    }
    case 't': case 'r': {
      const best = densest(u.type === 'r' ? 150 : 110);
      if (!best) return false;
      const nuke = u.type === 'r';
      S.strikes.push({ ut: DMG_BY, x: best.x, y: Math.min(best.y + 30, LINE_Y - 60), t: 0, delay: nuke ? 1 : 0.75, dmg: base * (nuke ? 8 : 5), r: nuke ? 190 : 130, done: false, nuke });
      return true;
    }
    case 's': {
      const tgt = pickHeavy();
      if (!tgt || tgt.maxHits) return false;
      const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (const e of S.enemies) if (shootable(e) && distToRay(e.x, e.y, p.x, p.y, ang) < e.r + 10) hitEnemy(e, base * 10, 'laser');
      S.fx.push({ kind: 'rail', x: p.x, y: p.y - 20, ang, t: 0, life: 0.35 });
      S.shake = Math.max(S.shake, 0.4); play('zap', 0.35);
      return true;
    }
    case 'e': {
      let any = false;
      for (const e of S.enemies) if (shootable(e) && e.y > RANGE_Y - 40) {
        any = true;
        if (!e.boss) e.stun = Math.max(e.stun, 1.2);
        if (e.shield > 0) e.shield *= 0.5;
        e.flash = 0.2;
      }
      if (!any) return false;
      S.fx.push({ kind: 'emp', x: p.x, y: p.y, t: 0, life: 0.6 });
      S.glitch = Math.max(S.glitch, 0.3); play('zap', 0.3); play('crackle', 0.5, 0.9);
      return true;
    }
    case 'c': {
      let any = false;
      for (const e of S.enemies) if (shootable(e) && e.y > RANGE_Y - 40 && !e.boss) { e.frozen = Math.max(e.frozen, 2); any = true; }
      if (!any) return false;
      S.fx.push({ kind: 'frost', x: p.x, y: p.y, t: 0, life: 0.7 });
      return true;
    }
    case 'l': {
      const tgt = pickHeavy();
      if (!tgt || tgt.maxHits) return false;
      const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (const e of S.enemies) if (shootable(e) && distToRay(e.x, e.y, p.x, p.y, ang) < e.r + 22) hitEnemy(e, base * 10, 'laser');
      S.fx.push({ kind: 'rail', x: p.x, y: p.y - 20, ang, t: 0, life: 0.35 });
      S.shake = Math.max(S.shake, 0.45); play('zap', 0.35); punch(0.5);
      return true;
    }
    case 'q': {
      if (!S.enemies.some(e => shootable(e) && e.y < p.y && Math.abs(e.x - p.x) < 90 + e.r)) return false;
      S.beams.push({ u, x: p.x, y: p.y - 26, ang: -Math.PI / 2, t: 0, life: 2, dps: base * 3, capT: 0, col: '#b86bff', w: 90, slowB: true });
      S.shake = Math.max(S.shake, 0.4); play('zap', 0.4); punch(0.5);
      return true;
    }
    case 'y': {
      const best = densest(120);
      if (!best) return false;
      S.strikes.push({ ut: DMG_BY, x: best.x, y: Math.min(best.y + 30, LINE_Y - 60), t: 0, delay: 0.75, dmg: base * 4, r: 120, done: false, nuke: false });
      return true;
    }
    case 'n': {
      const best = densest(140);
      if (!best) return false;
      S.holes.push({ ut: DMG_BY, x: best.x, y: best.y, r: 160, t: 0, life: 2.2, dps: base * 3 });
      return true;
    }
  }
  return false;
}
const SKILL_CD = { f: 4, b: 5, t: 6, r: 9, s: 5, e: 6, c: 7, n: 9, l: 6, q: 8, y: 8 };

// ── 피해 ──────────────────────────────────────────────────
function hitEnemy(e, dmg, src = 'laser', quiet = false) {
  if (e.dead || e.ph > 0) return;
  if (e.frozen > 0 && S.shatter) dmg *= 2;
  if (e.guarded) dmg *= 0.7;
  if (e.boss && e.weak > 0) dmg *= 2;
  if (S.pk.crit && Math.random() < S.pk.crit) dmg *= 2;
  if (S.scan) dmg *= 1.15;
  if (e.shield > 0) {
    const m = src === 'laser' || src === 'fire' ? 0.25 : src === 'beam' ? 0.5 : src === 'emp3' ? 3 : 1;
    const sd = dmg * m;
    if (DMG_BY && S.dmgBy) S.dmgBy[DMG_BY] = (S.dmgBy[DMG_BY] || 0) + Math.min(sd, e.shield) / m;
    if (sd < e.shield) {
      e.shield -= sd;
      if (!quiet) { e.sflash = 0.12; play('shield_hit', 0.12, 1.2); }
      return;
    }
    dmg = (sd - e.shield) / m;
    e.shield = 0; e.downT = 0;
    shieldBreak(e);
  }
  if (DMG_BY && S.dmgBy) S.dmgBy[DMG_BY] = (S.dmgBy[DMG_BY] || 0) + Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  if (!quiet) {
    e.flash = 0.1; e.jit = 0.12;
    const heavy = dmg / e.maxHp;
    e.sq = Math.min(0.4, (e.sq || 0) + 0.1 + Math.min(0.25, heavy));
    e.tilt = (Math.random() - .5) * (e.boss ? 0.08 : 0.35);
    if (heavy > 0.12 || (e.boss && dmg > 60)) { sheetFx(1, e.x + (Math.random() - .5) * e.r, e.y + (Math.random() - .5) * e.r * 0.6, 60 + Math.min(60, heavy * 200), 0.35); play('hit', 0.18, 0.8); if (heavy > 0.3) shake(0.1); }
    if (!e.boss && !(e.hacked > 0) && dmg > e.maxHp * 0.08) e.y -= Math.min(3, dmg / e.maxHp * 10);
    // 맞는 순간 짧고 단단한 "퍽". 세게 맞힐수록 크고 낮게. 폭발과 센 한 방은 한 겹 더
    play('thwack', 0.16 + Math.min(0.2, heavy * 0.8), 1.15 - Math.min(0.35, heavy * 1.2), 0.08);
    if (src === 'blast') play('imp_h', 0.12 + Math.min(0.2, heavy * 0.7), e.boss ? 0.8 : 1);
    else if (heavy > 0.15 || dmg >= 150) play('imp_s', 0.14 + Math.min(0.18, heavy * 0.6), 1.05);
    if (heavy > 0.12 || (e.boss && dmg > 120)) { play('imp_p', 0.3 + Math.min(0.3, heavy), 0.85); MUS.duckT = 0.18; }
    if (e.boss) play('bosshit', 0.22, 1.35);
    if (SET().nums && dmg >= 20 && S.texts.length < 45) addText(e.x + (Math.random() - .5) * 20, e.y - e.r * 0.6, String(Math.round(dmg)), dmg >= 200 ? '#ffd24a' : '#e6f4ff', dmg >= 200 ? 24 : 16, 0.55, true);
  }
  if (e.hp <= 0) killEnemy(e);
}
function shieldBreak(e) {
  play('shield_crack', 0.5); play('shield_break', 0.25);
  S.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, color: '#7fd4ff', r0: e.r });
  sparks(e.x, e.y, '#a8e6ff', e.boss ? 40 : 16, e.boss ? 420 : 280, 'shard');
  addText(e.x, e.y - e.r - 10, '보호막 파괴!', '#8fe0ff', e.boss ? 26 : 18);
  if (e.boss) { S.shake = Math.max(S.shake, 0.5); S.glitch = Math.max(S.glitch, 0.25); }
}
function killEnemy(e) {
  e.dead = true;
  const drop = e.boss ? 30 : e.k === 'elite' ? 10 : ENEMY[e.k].atk ? 2 : (e.k === 'tank' || e.k === 'shield' || e.k === 'healer') && Math.random() < 0.35 ? 1 : 0;
  if (drop) {
    S.cores += drop;
    for (let k = 0; k < Math.min(drop, 8); k++) S.fx.push({ kind: 'coin', x: e.x + (Math.random() - .5) * 30, y: e.y + (Math.random() - .5) * 30, t: -k * 0.04, life: 0.7, sx: (Math.random() - .5) * 160, n: k === 0 ? drop : 0 });
    hintOnce('core', '적을 격추하면 에너지 코어가 떨어져요. 코어로 기체를 사고 연구소에서 강화해요.');
  }
  S.score += e.boss ? 1000 : e.k === 'elite' ? 200 : 10;
  if (e.carry) { e.carry.carrier = null; e.carry = null; }
  for (const a of S.attacks) if (a.src === e && a.t < a.warn && !a.cancelled) {
    a.cancelled = true;
    const m = cellsCenter(a.cells);
    addText(m.x, m.y - 20, '공격 취소!', '#7fffd4', 22);
    ach('cancel_attack');
    S.fx.push({ kind: 'ring', x: m.x, y: m.y, t: 0, life: 0.5, color: '#7fffd4' });
  }
  const size = e.boss ? 3 : e.k === 'elite' ? 2.2 : e.k === 'tank' || e.k === 'shield' || e.k === 'gunship' ? 1.4 : e.k === 'split' ? 1.3 : e.k === 'rock' || e.k === 'splitS' ? 0.6 : 1;
  boom(e.x, e.y, size, e.k === 'healer' ? '#7dff9a' : '#ffb347');
  blastFx(e.x, e.y, size);
  // 연속 격추 콤보
  S.combo = S.time - (S.comboT || -9) < 1.3 ? (S.combo || 0) + 1 : 1; S.comboT = S.time;
  if (S.combo >= 3) S.comboPop = 0.25;
  if (S.combo >= 20 && S.mode !== 'clearing') ach('combo_20');   // 클리어 소탕 연쇄는 세지 않는다
  const pitch = 1 + Math.min(S.combo, 20) * 0.015;
  play('thwack', 0.3 + Math.min(0.2, size * 0.1), 0.85 / Math.max(1, size * 0.8), 0.05);   // 격추는 더 큰 "퍽!"
  if (size >= 1) play('debris', 0.18 + Math.min(0.3, (size - 1) * 0.25), pitch);
  if (size >= 1.3) { play('imp_p', 0.35 + Math.min(0.3, (size - 1.3) * 0.4), 0.7); MUS.duckT = 0.25; }
  if (size >= 2) { shockwave(e.x, e.y, e.boss ? 460 : 260); play('kaboom', 0.8, 0.8); play('thud', 0.7); play('boom_big', 0.45); S.hitStop = 0.09; punch(1); }
  else if (size >= 1.3) { play('kaboom', 0.55, pitch * 0.95); play('thud', 0.35, 1.2); S.hitStop = Math.max(S.hitStop || 0, 0.045); shake(0.2); punch(0.45); }
  else if (size >= 1) { play('kaboom', 0.32, pitch * 1.15); play('boom_s', 0.18, pitch); S.hitStop = Math.max(S.hitStop || 0, 0.02); punch(0.15); }
  else play('boom_s', 0.2, pitch * 1.3);
  // 기체 파편: 스프라이트를 네 조각으로 나눠 흩뿌린다
  const im = IMG[e.img];
  if (im && im.width && e.k !== 'rock' && e.k !== 'splitS') {
    const pcs = [];
    for (let k = 0; k < 4; k++) {
      const qx = k % 2, qy = k >> 1, a = Math.atan2(qy - 0.5, qx - 0.5) + (Math.random() - .5) * 0.8, v = 190 + Math.random() * 240;
      pcs.push({ sx: qx * im.width / 2, sy: qy * im.height / 2, ox: (qx - 0.5) * e.w / 2, oy: (qy - 0.5) * e.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, vr: (Math.random() - .5) * 16 });
    }
    S.fx.push({ kind: 'debris', img: e.img, x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot, pcs, t: 0, life: 0.75 });
  }
  if (e.boss) addGear(8, e.x, e.y); else if (e.k === 'elite') addGear(4, e.x, e.y);
  else if (!(e.hacked > 0) && e.k !== 'rock' && e.k !== 'splitS' && Math.random() < (ENEMY[e.k].atk ? 0.5 : 0.15)) addGear(1, e.x, e.y);
  if (e.k === 'split') for (const vx of [-90, 0, 90]) { const c = spawnEnemy('splitS', e.x + vx * 0.2, e.y); c.vx = vx; }
  if (e.k === 'elite') {
    const rw = rollReward(S.stage.n, 3); if (!rw.heal && UNIT[rw.type].shape === 1) rw.lv = Math.max(rw.lv, 2);
    const c = makeCap(rw, Math.max(60, Math.min(W - 60, e.x)), 0.6); c.y = Math.max(FIRE_Y + 30, e.y); c.speed = 26;
    addText(e.x, e.y - 60, '고급 보급 캡슐!', '#ffd24a', 22); shake(0.6);
  }
  if (e.boss) {
    S.shake = 1.2; S.whiteFlash = 1; S.glitch = 0.8;
    const g = S;
    for (let i = 0; i < 12; i++) setTimeout(() => {
      if (S === g) boom(e.x + (Math.random() - .5) * 200, e.y + (Math.random() - .5) * 160, 1.6, i % 2 ? '#ffb347' : '#ff6a3a');
    }, i * 90);
  }
}
function blast(x, y, r, dmg, main, extra) {
  for (const e of S.enemies) {
    if (!shootable(e)) continue;
    const inR = e === main || Math.hypot(e.x - x, e.y - y) < r + e.r;
    if (!inR) continue;
    hitEnemy(e, e === main ? dmg : dmg * 0.6, 'blast', e !== main);
    if (extra && extra.stun && !e.boss) e.stun = Math.max(e.stun, extra.stun);
  }
}
function hitCap(c, n = 1) {
  if (c.dead) return;
  const before = c.hits / c.maxHits;
  c.hits -= n; c.flash = 0.1; c.jit = 0.12;
  c.sq = Math.min(0.35, (c.sq || 0) + 0.12 * n); c.tilt = (Math.random() - .5) * 0.4;
  if (!c.carrier) c.y -= 1.2 * n;
  const col = capLook(c.rw).col;
  sparks(c.x + (Math.random() - .5) * 30, c.y + 10 + Math.random() * 16, col, 3 + n, 200);
  play('caphit', 0.18, 1 + Math.random() * 0.08);
  // 3분의 1씩 깎일 때마다 금 가는 소리와 큰 불꽃
  const after = c.hits / c.maxHits;
  if (c.hits > 0 && Math.floor(before * 3) !== Math.floor(after * 3)) {
    play('shield_crack', 0.3, 1.2); sparks(c.x, c.y, col, 14, 300, 'shard'); sheetFx(1, c.x, c.y, 70, 0.3);
    S.fx.push({ kind: 'ring', x: c.x, y: c.y, t: 0, life: 0.35, color: col, r0: 30 });
  }
  if (c.hits <= 0) claimCap(c);
}
function giveUnit(type, lv, fromX, fromY, col) {
  const u = makeUnit(type, lv);
  if (S.used) S.used[type] = (S.used[type] || 0) + Math.pow(2, lv - 1);
  const spot = findSpot(u);
  let where;
  if (spot) { place(u, spot); where = unitPos(u); }
  else {
    const k = S.reserve.findIndex(r => !r);
    if (k < 0) return 'lost';
    toReserve(u, k); where = resPos(k);
    if (shapeDims(type).h > openRows()) hintOnce('tall', '세로 3칸 기체는 줄을 늘려야 올릴 수 있어요. 필요 없으면 위 전장으로 끌어 해체하면 부품이 나와요.');
    hintOnce('reserve', '자리가 없어서 대기함으로 갔어요. 대기 중인 기체는 쏘지 않아요. 칸을 비우고 끌어다 놓거나, 같은 기체에 겹쳐 합체하세요.');
  }
  S.fx.push({ kind: 'fly', x: fromX, y: fromY, tx: where.x, ty: where.y, t: 0, life: 0.45, color: col });
  S.fx.push({ kind: 'arrive', x: where.x, y: where.y, t: -0.42, life: 0.5, big: spot && uSize(u) > 1 ? 1.5 : 1 });   // 날아와 앉는 순간 하얗게 짜잔
  return spot ? 'placed' : 'reserve';
}
function claimCap(c) {
  c.dead = true; c.claimed = true;
  const rw = c.rw, look = capLook(rw), col = look.col;
  play('capbreak', 0.5);
  boom(c.x, c.y, 0.8, col);
  S.fx.push({ kind: 'ring', x: c.x, y: c.y, t: 0, life: 0.5, color: col });
  sparks(c.x, c.y, col, 20, 280);
  if (rw.heal) {
    const before = S.hp;
    S.hp = Math.min(S.maxHp, S.hp + rw.heal);
    for (const u of allUnits()) u.hp = Math.min(u.maxHp, u.hp + 1);
    addText(c.x, c.y - 30, `기지 +${S.hp - before}, 기체 +1 수리`, '#8dff9a', 22);
    play('shieldUp', 0.35);
  } else {
    let placed = 0, reserved = 0, lost = 0;
    for (let k = 0; k < rw.n; k++) {
      const r = giveUnit(rw.type, rw.lv, c.x, c.y, col);
      if (r === 'placed') placed++; else if (r === 'reserve') reserved++; else lost++;
    }
    const name = UNIT[rw.type].name + (rw.lv > 1 ? ` Lv${rw.lv}` : '');
    addText(c.x, c.y - 30, `${name} +${placed + reserved}`, '#7fe0ff', 20);
    if (reserved) addText(c.x, c.y - 6, `대기함으로 ${reserved}기`, '#ffd24a', 18);
    if (lost) { addText(c.x, c.y + 18, `자리 없음! ${lost}기 손실`, '#ff7070', 18); hint('칸과 대기함이 모두 차면 새 기체가 사라져요. 미리 합쳐서 자리를 비워 두세요.'); }
    if (UNIT[rw.type].shape !== 1) hintOnce('big', '대형 기체는 여러 칸을 차지해요. 옮길 때도 그만큼 비어야 하니 회피할 자리를 미리 생각하세요.');
    checkMergeHint();
  }
  if (c.pair && !c.pair.dead) {
    c.pair.dead = true;
    boom(c.pair.x, c.pair.y, 0.7, '#999');
    addText(c.pair.x, c.pair.y - 20, '소멸', '#aaa', 20);
  }
  if (S.focus === c || (c.pair && S.focus === c.pair)) S.focus = null;
}
function checkMergeHint() {
  const seen = {};
  for (const u of allUnits()) {
    const key = u.type + u.lv;
    if (seen[key]) { hintOnce('merge', '같은 종류, 같은 레벨 기체를 끌어서 겹치면 합체해요. 레벨마다 새 스킬이 생겨요!'); return; }
    seen[key] = true;
  }
}
function mergeInto(t, from) {
  if (S.tut) S.tut.merged = true;
  if (from) unplace(from);
  t.lv += 1; t.pop = 0.5; t.cd = 0.2; t.sk = 1.5;
  t.maxHp = unitMaxHp(t.type, t.lv); t.hp = t.maxHp;
  const [name, desc] = t.lv > 5 ? [TRANSCEND[t.lv - 6], transDesc(t.type)] : SKILLS[t.type][t.lv - 1];
  const sa = levelStat(t.type, t.lv - 1), sb = levelStat(t.type, t.lv);
  if (t.lv >= 5) ach('gold_unit');
  if (t.lv >= 6) ach('transcend');
  if (t.lv >= 8) ach('rainbow');
  S.skillPop = { lv: t.lv, name, color: LV_COL[t.lv - 1], t: 0, life: 1.9, unit: UNIT[t.type].name, cmp: `전투력 ${fmt(sa.v)} → ${fmt(sb.v)}` };
  hintOnce('sk_' + t.type + t.lv, `${UNIT[t.type].name} Lv${t.lv} ${name}: ${desc}`);
}

// ── 이펙트 ────────────────────────────────────────────────
// 폭발 애니메이션 (8칸 × 4줄 = 32프레임). delay만큼 늦게 터지고, rot을 주면 돌려서 그린다
function sheetFx(n, x, y, size, life, delay = 0, rot = 0) {
  if (S.fx.length > 260) return;
  S.fx.push({ kind: 'sheet', img: 'fx/ex' + n, x, y, size, life, t: -delay, rot });
}
// 격추 폭발: 크기에 따라 시트를 고르고, 큰 적은 한 번 더 터진다
function blastFx(x, y, size) {
  if (size < 1) sheetFx(1, x, y, 70 + 40 * size, 0.42);
  else if (size < 1.3) sheetFx(3, x, y, 200, 0.55);
  else if (size < 2) {
    sheetFx(3, x, y, 250, 0.6);
    sheetFx(2, x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 30, 240, 0.65, 0.16, Math.random() * 6.28);
    const g = S; setTimeout(() => { if (S === g) { play('kaboom', 0.4, 1.05); shake(0.2); } }, 160);
  } else {
    sheetFx(4, x, y, 200 * size, 1.1);
    sheetFx(3, x + (Math.random() - .5) * 60, y + (Math.random() - .5) * 40, 300, 0.6, 0.22);
    const g = S; setTimeout(() => { if (S === g) { play('kaboom', 0.6, 0.85); punch(0.6); } }, 220);
  }
}
function boom(x, y, size = 1, color = '#ffb347') {
  S.fx.push({ kind: 'boom', x, y, t: 0, life: 0.62, size, color, rot0: Math.random() * 6 });
  if (size >= 1.3) S.fx.push({ kind: 'light', x, y, t: 0, life: 0.45, r: 110 + 110 * size, color });
  sparks(x, y, color, Math.round(6 + 8 * size), 160 + 120 * size);
}
function impactSparks(x, y, vx, vy, color, n = 5) {
  const back = Math.atan2(-vy, -vx);
  for (let i = 0; i < n && S.parts.length < 400; i++) {
    const a = back + (Math.random() - .5) * 1.6, v = 160 + Math.random() * 260;
    S.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.18 + Math.random() * 0.2, size: 1.2 + Math.random() * 1.8, color });
  }
}
function sparks(x, y, color, n, speed = 240, kind = 'spark') {
  for (let i = 0; i < n && S.parts.length < 400; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
    S.parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0,
                   life: 0.35 + Math.random() * 0.4, size: 1.5 + Math.random() * 2.5, color, rot: Math.random() * 6 });
  }
}
function ember(x, y, color) {
  if (S.parts.length < 400)
    S.parts.push({ kind: 'spark', x, y, vx: (Math.random() - .5) * 40, vy: -40 - Math.random() * 60, t: 0,
                   life: 0.4 + Math.random() * 0.4, size: 1.2 + Math.random() * 1.8, color });
}
function smoke(x, y) {
  if (S.parts.length < 400)
    S.parts.push({ kind: 'smoke', x, y, vx: (Math.random() - .5) * 20, vy: Math.random() * 10 - 5, t: 0, life: 0.5, size: 3 + Math.random() * 3 });
}
function addText(x, y, text, color, size = 22, life = 1.2, num = false) {
  S.texts.push({ x, y, text, color, size, t: 0, life, num });
}
function shake(v) { S.shake = Math.max(S.shake, v); }
// 화면이 순간 앞으로 튀는 줌 펀치 (큰 폭발)
function punch(v) { S.punch = Math.max(S.punch || 0, v); }

