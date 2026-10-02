'use strict';
// ── 업데이트 ──────────────────────────────────────────────
function steer(s, tx, ty, turn, sp, dt) {
  const want = Math.atan2(ty - s.y, tx - s.x);
  let cur = Math.atan2(s.vy, s.vx);
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const near = Math.hypot(tx - s.x, ty - s.y) < 90;
  cur = near ? want : cur + Math.max(-turn * dt, Math.min(turn * dt, d));
  s.vx = Math.cos(cur) * sp; s.vy = Math.sin(cur) * sp;
}
function distToRay(px, py, x, y, ang) {
  const dx = px - x, dy = py - y, c = Math.cos(ang), s = Math.sin(ang);
  const along = dx * c + dy * s;
  if (along < 0) return 1e9;
  return Math.abs(-dx * s + dy * c);
}

// 보스 2단계(격노): 화면이 번쩍이고, 공격이 잦아지고, 부하를 더 빨리 부른다
function bossRage(e) {
  e.rage = true; e.atkT = Math.min(e.atkT, 1.5);
  if (S.mode !== 'play' || SHOT) return;
  S.whiteFlash = Math.max(S.whiteFlash, 0.6); S.glitch = Math.max(S.glitch, 0.5); shake(0.8);
  addText(e.x, Math.max(170, e.y + e.h * 0.4), '격노!', '#ff3a4a', 34, 1.4);
  play('vo_hostile', 0.7); play('drums', 0.5, 0.7);
}
function updateEnemy(e, dt) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.jit = Math.max(0, (e.jit || 0) - dt);
  e.sq = Math.max(0, (e.sq || 0) - dt * 3); e.tilt = (e.tilt || 0) * Math.pow(0.01, dt);
  e.sflash = Math.max(0, (e.sflash || 0) - dt);
  if (e.kbOff) e.kbOff = e.kbOff < 0.2 ? 0 : e.kbOff * Math.pow(0.0006, dt);   // 맞고 튕긴 자리에서 빠르게 돌아온다
  const d = ENEMY[e.k];
  // 해킹된 적: 멈춰서 주변 적을 쏜다
  if (e.trail) { for (const g of e.trail) g.a -= dt * 1.6; e.trail = e.trail.filter(g => g.a > 0); }
  if (e.hacked > 0) {
    e.hacked -= dt; e.hackT += dt;
    if (e.hackT >= 0.6) {
      e.hackT = 0;
      let tgt = null, td = 240;
      for (const o of S.enemies) if (o !== e && shootable(o)) { const dd = Math.hypot(o.x - e.x, o.y - e.y); if (dd < td) { td = dd; tgt = o; } }
      if (tgt) {
        const hk = e.hackBy, dmg = UNIT.k.dmg * LV_MUL[(hk ? hk.lv : 1) - 1] * mkMul('k') * S.pk.dmg;
        hitEnemy(tgt, dmg, 'laser');
        S.fx.push({ kind: 'bolt', pts: [{ x: e.x, y: e.y }, { x: tgt.x, y: tgt.y }], t: 0, life: 0.15, col: '#5aff9a' });
      }
    }
    if (e.hacked <= 0) {
      e.hacked = 0;
      if (e.hackBy && e.hackBy.lv >= 3) { const dmg = UNIT.k.dmg * LV_MUL[e.hackBy.lv - 1] * 2; boom(e.x, e.y, 1.3, '#5aff9a'); blast(e.x, e.y, 70, dmg, null); killEnemy(e); }
    }
    return;
  }
  if (e.burnT > 0) { e.burnT -= dt; DMG_BY = e.burnBy || null; hitEnemy(e, e.burnD * dt, 'fire', true); DMG_BY = null; if (Math.random() < 0.3) ember(e.x + (Math.random() - .5) * e.r, e.y, '#ff8a2a'); if (e.dead) return; }
  const held = e.stun > 0 || e.frozen > 0;
  e.stun = Math.max(0, e.stun - dt); e.frozen = Math.max(0, e.frozen - dt);
  e.slowT = Math.max(0, e.slowT - dt);
  if (held) return;
  const spd = 1 - (e.slowT > 0 ? e.slow * (e.boss ? 0.5 : 1) : 0);
  e.rot += e.spin * dt;
  if (d.regen && e.shield <= 0) {
    e.downT += dt;
    if (e.downT > d.regen) { e.shield = e.maxShield; S.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.6, color: '#7fd4ff', r0: e.r, grow: -1 }); addText(e.x, e.y - e.r, '보호막 재생', '#8fe0ff', 20); }
  }
  if (!e.boss && e.hp < e.maxHp && mutOn('regen')) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
  let hovering = false;
  if (d.atk && !e.boss && e.atkLeft > 0 && e.y >= e.hoverY) {
    hovering = true;
    e.x += Math.sin(e.t * 1.3) * 18 * dt;
    e.atkT -= dt;
    if (e.atkT <= 0 && !S.attacks.some(a => a.src === e)) {
      if (launchAttack(d.atk, e, d.atkDmg)) { e.atkLeft--; e.atkT = d.atkCd * (mutOn('rapid') ? 0.7 : 1) * endlessAtkMul(); } else e.atkT = 1;
    }
  }
  if (e.boss && e.y > 80) {
    e.weakCd = (e.weakCd == null ? 7 : e.weakCd) - dt;
    if (e.weak > 0) e.weak -= dt;
    if (e.weakCd <= 0) { e.weakCd = 10; e.weak = 3.5; play('vo_anomaly', 0.6); addText(e.x, e.y + e.h * 0.2, '약점 노출!', '#ffd24a', 26, 1.2); hintOnce('weak', '약점이 열린 동안 크게 맞아요'); }
  }
  if (e.boss && d.atk && e.y > 60) {
    e.atkT -= dt;
    if (e.atkT <= 0 && !S.attacks.some(a => a.src === e)) e.atkT = launchAttack(e.nextAtk || d.atk, e, d.atkDmg) ? d.atkCd * (mutOn('rapid') ? 0.7 : 1) * endlessAtkMul() * (e.rage ? 0.65 : 1) : 1;
  }
  // 2단계(격노): 진짜 보스는 체력이 절반 아래로 떨어지면 더 자주 쏘고 더 빨리 부하를 부른다
  if (e.boss && !e.mini && !e.rage && e.hp < e.maxHp * 0.5) bossRage(e);
  if (e.rage) e.spawnT += dt * 0.5;
  // 부서질수록 연기, 더 부서지면 불
  if (!e.boss && e.maxHp > 90 && e.k !== 'rock') {
    const r = e.hp / e.maxHp;
    if (r < 0.5 && Math.random() < dt * 8) smoke(e.x + (Math.random() - .5) * e.r, e.y - e.r * 0.3);
    if (r < 0.25 && Math.random() < dt * 12) ember(e.x + (Math.random() - .5) * e.r, e.y, '#ff8a2a');
  }
  switch (e.k) {
    case 'rusher': {
      e.dashT = (e.dashT == null ? 0.6 + Math.random() : e.dashT) - dt;
      if (e.dashT <= 0 && !e.tell && !e.dash && e.y > 40) { e.tell = 0.35; play('twoTone', 0.12, 1.6); }
      if (e.tell > 0) { e.tell -= dt; if (e.tell <= 0) { e.tell = 0; e.dash = 0.35; } return; }
      if (e.dash > 0) {
        e.dash -= dt; e.y += e.speed * 1.6 * spd * dt;
        (e.trail = e.trail || []).push({ x: e.x, y: e.y, a: 0.35 });
        if (e.dash <= 0) { e.dash = 0; e.dashT = 1.6 + Math.random() * 0.8; }
      }
      break;
    }
    case 'thief': {
      if (e.carry && e.carry.dead) e.carry = null;
      if (e.carry) {
        e.y -= 48 * spd * dt;
        e.carry.x = e.x; e.carry.y = e.y + 46;
        if (e.y < -70) { e.dead = true; e.carry.dead = true; addText(e.x, 120, '캡슐을 도둑맞았어요!', '#ff7070', 22); }
        return;
      }
      let best = null, bd = 1e9;
      for (const c of S.caps) if (!c.carrier && !c.dead && c.y > 0) { const dd = Math.hypot(c.x - e.x, c.y - e.y); if (dd < bd) { bd = dd; best = c; } }
      if (best) {
        const a = Math.atan2(best.y - e.y, best.x - e.x);
        e.x += Math.cos(a) * 115 * spd * dt; e.y += Math.sin(a) * 115 * spd * dt;
        if (bd < 38) { e.carry = best; best.carrier = e; if (S.focus === best) S.focus = null; }
        return;
      }
      break;
    }
    case 'healer': {
      e.skillT += dt;
      if (e.skillT > 1.6) {
        e.skillT = 0;
        let healed = false;
        for (const o of S.enemies) if (o !== e && !o.boss && !o.dead && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) < 150) {
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15); o.heal = 0.4; healed = true;
        }
        S.fx.push({ kind: 'pulse', x: e.x, y: e.y, t: 0, life: 0.7, color: '#6dff8a', r: 150 });
        if (healed) sparks(e.x, e.y, '#8dffa0', 8, 120);
      }
      break;
    }
    case 'artillery':   // 위쪽에 멈춰 좌우로 오가며 포격
      if (e.y >= e.hoverY - 1) { e.x += Math.cos(e.t * 0.6) * 70 * dt; e.x = Math.max(70, Math.min(W - 70, e.x)); }
      break;
    case 'mother': {   // 천천히 내려오며 작은 드론을 뿌린다
      e.spawnT += dt;
      if (e.spawnT > 4.5 && e.y > 30 && S.enemies.filter(o => o.k === 'minion' && !o.dead).length < 10) {
        e.spawnT = 0;
        for (const dx of [-50, 50]) { const m = spawnEnemy('minion', e.x + dx, e.y + 40); m.vx = dx * 1.2; }
        S.fx.push({ kind: 'ring', x: e.x, y: e.y + 30, t: 0, life: 0.4, color: '#3affc0' });
      }
      break;
    }
    case 'boss1':
      e.x = (e.cx || W / 2) + Math.sin(S.time * 0.6) * 60 * (e.cx ? 0.4 : 1);
      e.spawnT += dt;
      if (e.spawnT > 3.2 && e.y > 40) { e.spawnT = 0; spawnEnemy('minion', e.x - 70, e.y + 40); spawnEnemy('minion', e.x + 70, e.y + 40); }
      break;
    case 'boss2':
      e.x = (e.cx || W / 2) + Math.sin(S.time * 0.4) * 40 * (e.cx ? 0.4 : 1);
      e.spawnT += dt;
      if (e.spawnT > 4 && e.y > 40) { e.spawnT = 0; for (let i = 0; i < 4; i++) spawnEnemy('rock', e.x + (Math.random() - .5) * 160, e.y + 70); }
      if (e.phase < 3 && e.hp < e.maxHp * (0.75 - e.phase * 0.25)) {
        e.phase++; shake(0.7); boom(e.x, e.y + 60, 1.8, '#ff9a3c');
        for (const vx of [-120, 0, 120]) { const c = spawnEnemy('split', e.x + vx * 0.5, e.y + 60); c.vx = vx * 0.5; }
        addText(e.x, e.y + 100, '핵이 갈라져요!', '#ffb347', 24);
      }
      break;
    case 'boss3':
      e.x = (e.cx || W / 2) + Math.sin(S.time * 0.7) * 80 * (e.cx ? 0.4 : 1);
      e.spawnT += dt;
      if (e.spawnT > 4 && e.y > 40) { e.spawnT = 0; spawnEnemy('minion', e.x - 80, e.y + 50); spawnEnemy('minion', e.x + 80, e.y + 50); }
      if (e.phase < 1 && e.hp < e.maxHp * 0.5) { e.phase = 1; spawnEnemy('healer', e.x, e.y + 80); }
      break;
    case 'phase':
      e.phT = (e.phT == null ? 2 + Math.random() * 2 : e.phT) - dt;
      if (e.ph > 0) e.ph -= dt;
      if (e.phT <= 0 && e.y > 60) { e.phT = 4; e.ph = 1.2; if (S.focus === e) S.focus = null; }
      break;
    case 'grav': case 'boss6':
      if (!(e.hacked > 0)) for (const c of S.caps) if (!c.carrier && !c.dead && Math.hypot(c.x - e.x, c.y - e.y) < (e.boss ? 260 : 170)) {
        c.x += (e.x - c.x) * 0.5 * dt; c.y -= (e.boss ? 40 : 30) * dt; c.pulled = 0.2;
        if (c.y < -50) { c.dead = true; addText(c.x, 120, '캡슐이 끌려갔어요!', '#ffc46a', 20); }
      }
      if (e.k === 'boss6') {
        e.x = (e.cx || W / 2) + Math.sin(S.time * 0.45) * 70 * (e.cx ? 0.4 : 1);
        const kinds = ['cross', 'column', 'freeze', 'row', 'meteor'];
        if (!S.attacks.some(a => a.src === e)) e.nextAtk = kinds[Math.floor(S.time / 7) % kinds.length];
        e.spawnT += dt;
        if (e.spawnT > 6 && e.y > 40) { e.spawnT = 0; spawnEnemy('grav', e.x - 100, e.y + 50); spawnEnemy('phase', e.x + 100, e.y + 50); }
      }
      break;
    case 'boss5':
      e.x = (e.cx || W / 2) + Math.sin(S.time * 0.55) * 80 * (e.cx ? 0.4 : 1);
      e.spawnT += dt;
      if (e.spawnT > 5 && e.y > 40) { e.spawnT = 0; spawnEnemy('phase', e.x - 90, e.y + 40); spawnEnemy('phase', e.x + 90, e.y + 40); }
      if (e.phase < 1 && e.hp < e.maxHp * 0.5) { e.phase = 1; addText(e.x, e.y + 110, '얼음 폭풍!', '#bff4ff', 24); for (let k = 0; k < 2; k++) launchAttack('freeze', null, 0); }
      break;
    case 'boss4':
      e.x = (e.cx || W / 2) + Math.sin(S.time * 0.5) * 70 * (e.cx ? 0.4 : 1);
      e.spawnT += dt;
      if (e.spawnT > 4.5 && e.y > 40) { e.spawnT = 0; spawnEnemy('rusher', e.x - 90, e.y + 40); spawnEnemy('rusher', e.x + 90, e.y + 40); }
      if (e.phase < 2 && e.hp < e.maxHp * (0.66 - e.phase * 0.33)) {
        e.phase++; shake(0.7);
        spawnEnemy('thief', e.x - 60, e.y + 60); spawnEnemy('thief', e.x + 60, e.y + 60); spawnEnemy('tank', e.x, e.y + 80);
        addText(e.x, e.y + 110, '증원 함대 출격!', '#ff7a8a', 24);
      }
      break;
  }
  if (!hovering) e.y += (e.boss && e.y < 110 ? e.speed + 45 : e.speed * spd * S.pk.enemySpd * (mutOn('fast') ? 1.2 : 1)) * dt;
  if (e.vx) {
    e.x += e.vx * dt;
    if (e.x < 30 || e.x > W - 30) e.vx = -e.vx;
    e.vx *= Math.pow(0.6, dt);
  }
}

// 기체들의 지속 효과 (레이더 버프, 수리, 방패 재생, 드론)
function updateAuras(dt) {
  const us = gridUnits();
  for (const u of allUnits()) { u.buffSpd = 0; u.buffDmg = 0; }
  S.shatter = us.some(u => u.type === 'c' && u.lv >= 4);
  S.scan = us.some(u => u.type === 'x' && u.lv >= 4);
  const global = us.some(u => u.type === 'x' && u.lv >= 5);
  for (const r of us) if (r.type === 'x') {
    const L = Math.min(r.lv, 5), spd = [0.2, 0.2, 0.3, 0.3, 0.4][L - 1] + 0.1 * tier(r), dmg = [0, 0.15, 0.25, 0.25, 0.35][L - 1] + 0.1 * tier(r);
    for (const o of neighborsOf(r)) { o.buffSpd = Math.max(o.buffSpd, spd); o.buffDmg = Math.max(o.buffDmg, dmg); }
  }
  if (global) for (const u of us) { u.buffSpd += 0.15; u.buffDmg += 0.15; }
  for (const u of us) {
    u.t1 += dt; u.t2 = Math.max(0, u.t2 - dt); u.t3 = Math.max(0, u.t3 - dt);
    if (u.type === 'g' && u.lv >= 2 && u.t1 >= 4) { u.t1 = 0; if (u.hp < u.maxHp) u.hp++; }
    if (u.type === 'm') {
      if (u.t1 >= 3 * Math.pow(0.75, tier(u))) {
        u.t1 = 0;
        // 칠해진 구역(주변 8칸) 안에서만 고친다. Lv1은 가장 다친 기체 하나, Lv2부터 다친 기체 모두
        const hurt = [...neighborsOf(u)].filter(o => o.hp < o.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const targets = u.lv >= 2 ? hurt : hurt.slice(0, 1);
        const p = unitPos(u);
        for (const o of targets) { o.hp = Math.min(o.maxHp, o.hp + 1); const q = unitPos(o); S.fx.push({ kind: 'bolt', pts: [p, q], t: 0, life: 0.3, col: '#6dff8a' }); S.fx.push({ kind: 'heal', x: q.x, y: q.y, t: 0, life: 0.6 }); }
      }
      if (u.lv >= 3) { u.baseT = (u.baseT || 0) + dt; if (u.baseT >= 15) { u.baseT = 0; if (S.hp < S.maxHp) { S.hp++; addText(W / 2, LINE_Y - 30, '기지 수리 +1', '#6dff8a', 18); } } }
    }
    if (u.type === 'd' || u.type === 'y') updateDrones(u, dt);
    if (u.type === 'w' && u.lv >= 5) { u.baseT = (u.baseT || 0) + dt; if (u.baseT >= 15) { u.baseT = 0; if (S.hp < S.maxHp) { S.hp++; addText(W / 2, LINE_Y - 30, '방어선 복구 +1', '#6ad0ff', 18); } } }
  }
  S.baseGuardT = Math.max(0, S.baseGuardT - dt);
  if (S.chainQ && S.chainQ.length) {
    const q = S.chainQ.splice(0, 6);
    for (const c of q) { S.fx.push({ kind: 'ring', x: c.x, y: c.y, t: 0, life: 0.35, color: '#ff8a4a' }); blast(c.x, c.y, 80, c.d); }
  }
  S.heatT = Math.max(0, (S.heatT || 0) - dt); S.ocT = Math.max(0, (S.ocT || 0) - dt); S.iceT = Math.max(0, (S.iceT || 0) - dt * 1.5);
  for (const rb of S.rebuilds) {
    rb.t -= dt;
    if (rb.t <= 0 && !rb.done) { rb.done = true; if (giveUnit(rb.type, 1, rb.from.x, rb.from.y, '#6dff8a') !== 'lost') addText(rb.from.x, rb.from.y - 30, '재건 완료', '#6dff8a', 18); }
  }
  S.rebuilds = S.rebuilds.filter(r => !r.done);
}
function updateDrones(u, dt) {
  DMG_BY = u.type;
  const n = (u.type === 'y' ? [3, 4, 6, 6, 8] : [1, 2, 4, 4, 8])[lvIdx(u.lv)], p = unitPos(u);
  while (u.drones.length < n) u.drones.push({ x: p.x, y: p.y, cd: Math.random() * 0.4, a: Math.random() * 6, gone: 0 });
  u.drones.length = n;
  const dmg = UNIT.d.dmg * LV_MUL[u.lv - 1] * [1, 0.8, 0.6, 0.6, 0.5][lvIdx(u.lv)] * (1 + u.buffDmg) * cellAtk(u) * mkMul('d') * pkDmg(u);
  // 적이 가까이 오지 않았을 때만 캡슐을 먼저 노린다
  let capT = null;
  const safe = !S.enemies.some(e => shootable(e) && e.y > LINE_Y - 260);
  if (safe) for (const c of S.caps) if (c.y > FIRE_Y && !c.dead && (!capT || c.y > capT.y)) capT = c;
  if (u.lv >= 4) {
    u.kamT = (u.kamT || 0) + dt;
    if (u.kamT >= 5) {
      const tgt = pickHeavy();
      const dr = u.drones.find(d => d.gone <= 0);
      if (tgt && !tgt.maxHits && dr) {
        u.kamT = 0; dr.gone = 2;
        S.fx.push({ kind: 'bolt', pts: [{ x: dr.x, y: dr.y }, { x: tgt.x, y: tgt.y }], t: 0, life: 0.25, col: '#ff6a5a' });
        boom(tgt.x, tgt.y, 1.2, '#ff6a5a'); blast(tgt.x, tgt.y, 60, dmg * 8, tgt);
      }
    }
  }
  u.drones.forEach((d, i) => {
    if (d.gone > 0) { d.gone -= dt; d.x = p.x; d.y = p.y; return; }
    const tgt = focusValid() ? S.focus : capT || pickTarget();
    d.a += dt * 3;
    const ox = Math.cos(d.a + i * 1.3) * 46, oy = Math.sin(d.a + i * 1.3) * 22 + 70;
    const tx = tgt ? tgt.x + ox : p.x + Math.cos(d.a + i) * 30, ty = tgt ? tgt.y + oy : p.y - 40 + Math.sin(d.a + i) * 10;
    const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy), sp = 320;
    if (dist > 2) { d.x += dx / dist * Math.min(dist, sp * dt); d.y += dy / dist * Math.min(dist, sp * dt); }
    d.cd -= dt * (1 + u.buffSpd) * cellSpd(u);
    if (tgt && d.cd <= 0 && Math.hypot(tgt.x - d.x, tgt.y - d.y) < 150) {
      d.cd = 0.45 * Math.pow(0.8, tier(u));
      if (tgt.maxHits) hitCap(tgt, capPow(u.lv)); else hitEnemy(tgt, dmg, 'laser', true);
      S.fx.push({ kind: 'bolt', pts: [{ x: d.x, y: d.y }, { x: tgt.x, y: tgt.y }], t: 0, life: 0.1, col: '#ff8a7a' });
    }
  });
}

// 새 적이 처음 나오면 잠깐 뒤(화면에 보일 즈음) 게임을 멈추고 소개 카드를 띄운다
function introOnce(k) {
  if (PROG.seen['e_' + k] || S.tut || SHOT || S.stage.endless) { if (!PROG.seen['e_' + k] && S.stage.endless && ENEMY_HINT[k]) hintOnce('e_' + k, ENEMY_HINT[k]); return; }
  PROG.seen['e_' + k] = true; save();
  UI.introQ = { k, at: S.time + (ENEMY[k] ? 1.1 : 0.2) };
}
function update(dt) {
  DMG_BY = null;
  if (UI.introQ && S.time >= UI.introQ.at) { UI.enemyIntro = { k: UI.introQ.k, t0: performance.now() / 1000 }; UI.introQ = null; play('open', 0.4); }
  S.time += dt;
  tickLift(dt);
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2);
  if (S.punch > 0) S.punch = Math.max(0, S.punch - dt * 5);
  S.glitch = Math.max(0, S.glitch - dt);

  if (S.hint) { S.hintT -= dt; if (S.hintT <= 0) S.hint = null; }
  if (!S.hint && S.hintQueue.length && !S.tut) { S.hint = S.hintQueue.shift(); S.hintT = 4; }

  for (const t of S.texts) t.t += dt;
  S.texts = S.texts.filter(t => t.t < t.life);
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < f.life);
  if (S.waves) S.waves = S.waves.filter(w => (w.t += dt) < w.life);
  const damp = Math.pow(0.9, dt * 60);
  for (const p of S.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind !== 'flame') { p.vx *= damp; p.vy *= damp; } }
  S.parts = S.parts.filter(p => p.t < p.life);
  for (const h of S.shieldHits) h.t += dt;
  S.shieldHits = S.shieldHits.filter(h => h.t < 0.8);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.life) S.banner = null; }
  if (S.skillPop) { S.skillPop.t += dt; if (S.skillPop.t > S.skillPop.life) S.skillPop = null; }
  S.warning = Math.max(0, S.warning - dt);
  S.whiteFlash = Math.max(0, S.whiteFlash - dt * 1.5);

  if (S.mode === 'win' || S.mode === 'lose' || S.mode === 'perk') return;

  if (S.mode === 'break') {
    S.breakT -= dt;
    if (S.breakT <= 0) startWave(S.wave + 1);
  } else if (S.mode === 'play') {
    if (S.tut) updateTut(dt);
    if (S.cmdTut && !S.cmdTut.on && S.mode === 'play' && S.enemies.filter(e => shootable(e) && e.y > 90 && e.y < LINE_Y - 150).length >= 3) { S.cmdTut.on = true; S.cmd = Math.max(S.cmd || 0, 50); play('open', 0.4); }
    if (S.cmdTut && S.cmdTut.done && S.time - S.cmdTut.done > 1.2) S.cmdTut = null;
    else {
      S.waveT += dt;
      while (S.events.length && S.events[0].t <= S.waveT) runEvent(S.events.shift());
    }
  } else if (S.mode === 'clearing') {
    // 소탕: 남은 적을 차례로 터뜨리고, 화면이 가라앉으면 클리어
    S.clearT += dt; S.clearK = (S.clearK || 0) + dt;
    while (S.clearK > 0.08) { S.clearK -= 0.08; const e = S.enemies.find(x => !x.dead); if (!e) break; killEnemy(e); }
    for (const c of S.caps) if (!c.dead) { c.dead = true; S.fx.push({ kind: 'ring', x: c.x, y: c.y, t: 0, life: 0.4, color: '#8899aa' }); }
    const calm = !S.enemies.some(x => !x.dead) && !S.fx.some(f => f.kind === 'boom' || f.kind === 'debris' || f.kind === 'pillar') && !S.shots.length;
    if ((S.clearT > 1.1 && calm) || S.clearT > 3.2) { S.enemies = S.enemies.filter(x => !x.dead); endStage(true); return; }
  }

  const guards = S.enemies.filter(g => g.k === 'shield' && !g.dead && !(g.hacked > 0));
  for (const e of S.enemies) e.guarded = e.k !== 'shield' && !e.boss && guards.some(g => Math.hypot(g.x - e.x, g.y - e.y) < 120);
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (S.mode === 'clearing') continue;
    updateEnemy(e, dt);
    if (e.heal) e.heal = Math.max(0, e.heal - dt);
    if (!e.dead && e.y + (e.boss ? e.h * 0.35 : 0) >= LINE_Y) {
      e.dead = true;
      if (e.carry) e.carry.carrier = null;
      const guard = !e.boss && S.baseGuardT <= 0 && gridUnits().some(u => u.type === 'g' && u.lv >= 5);
      if (guard) {
        S.baseGuardT = 12;
        boom(e.x, LINE_Y, 1.2, '#6ad0ff');
        addText(e.x, LINE_Y - 30, '방어선 보호막!', '#6ad0ff', 22);
        S.shieldHits.push({ x: e.x, t: 0 });
        continue;
      }
      const hitDmg = e.mini ? 5 : ENEMY[e.k].dmg;   // 미니보스로 나온 예전 보스는 방어막 -5
      if (e.boss && !e.mini) { S.hp = 0; S.noRevive = true; }
      else S.hp -= hitDmg;
      shake(0.5);
      S.shieldHits.push({ x: e.x, t: 0 });
      play('vo_shields', 0.7) || play('base_hit', 0.45);
      boom(e.x, LINE_Y, 1.2, '#ff5050');
      addText(e.x, LINE_Y - 30, e.boss && !e.mini ? '방어막 붕괴!' : `방어막 -${hitDmg}`, '#ff6060', 24); S.baseHitT = 0.6;
      play('shieldDown', 0.4);
    }
  }
  for (const a of S.attacks) {
    if (a.cancelled) continue;
    // 공격자가 멈춰 있으면 조준도 멈춘다
    if (a.src && (a.src.stun > 0 || a.src.frozen > 0)) continue;
    a.t += dt;
    if (a.t >= a.warn) { a.done = true; resolveAttack(a); }
  }
  S.attacks = S.attacks.filter(a => !a.done && !a.cancelled);

  for (const c of S.caps) {
    c.flash = Math.max(0, (c.flash || 0) - dt); c.pulled = Math.max(0, (c.pulled || 0) - dt); c.jit = Math.max(0, (c.jit || 0) - dt);
    c.sq = Math.max(0, (c.sq || 0) - dt * 3); c.tilt = (c.tilt || 0) * Math.pow(0.01, dt);
    if (c.carrier && !c.carrier.dead) continue;
    c.carrier = null;
    c.y += c.speed * dt;
    if (c.vx) { c.x += c.vx * dt; if (!c.dead && (c.x < -70 || c.x > W + 70)) { c.dead = true; if (S.focus === c) S.focus = null; } }
    if (c.y > LINE_Y + 10 && !c.dead) {
      c.dead = true;
      addText(c.x, LINE_Y - 20, '놓침', '#aaa', 20);
      if (c.pair && !c.pair.dead) c.pair.dead = true;
    }
  }

  updateAuras(dt);
  for (const u of allUnits()) {
    u.pop = Math.max(0, u.pop - dt);
    u.kick = Math.max(0, (u.kick || 0) - dt);
    u.flash = Math.max(0, (u.flash || 0) - dt);
    u.hurt = Math.max(0, u.hurt - dt);
    if (u.res != null) continue;
    if (u.hp < u.maxHp * 0.5 && Math.random() < 0.08) { const p = unitPos(u); smoke(p.x + (Math.random() - .5) * 20, p.y - 10); }
    DMG_BY = u.type; CUR_U = u;
    if (drag && drag.unit === u) continue;
    if (S.mode === 'clearing') continue;
    if (u.ice > 0) { u.ice -= dt; continue; }
    if (u.jam > 0) {
      if (!u.jamBy || u.jamBy.dead || u.jamBy.hacked > 0) { u.jam = 0; const p = unitPos(u); addText(p.x, p.y - 24, '교란 해제', '#e8ff6a', 16, 0.8); }
      else { u.jam -= dt; continue; }
    }
    RANGE_Y = FIRE_Y - cellRange(u);
    u.cd -= dt * (1 + u.buffSpd) * pkSpd() * cellSpd(u);
    if (u.cd <= 0) {
      const cd = u.type === 'k' ? [7, 6, 5, 4.5, 4][lvIdx(u.lv)] * Math.pow(0.75, tier(u)) : u.type === 'n' ? [2.5, 2.5, 2.2, 2, 1.8][lvIdx(u.lv)] : UNIT[u.type].cd;
      u.cd = fireUnit(u) ? cd : Math.min(0.1, cd);
    }
    if (u.lv >= 5 && SKILL_CD[u.type]) {
      u.sk -= dt;
      if (u.sk <= 0) u.sk = unitSkill(u) ? SKILL_CD[u.type] * Math.pow(0.75, tier(u)) : 0.3;
    }
    RANGE_Y = FIRE_Y;
  }
  CUR_U = null;

  for (const s of S.shots) {
    DMG_BY = s.ut || null;
    if (s.type === 'p') {
      s.x += s.vx * dt; s.y += s.vy * dt;
      for (const e of S.enemies) if (shootable(e) && !s.hitSet.has(e) && Math.hypot(e.x - s.x, e.y - s.y) < e.r + 8) {
        s.hitSet.add(e);
        hitEnemy(e, s.dmg, 'laser', !s.crit);
        if (s.exec && !e.dead && !e.boss && e.hp < e.maxHp * 0.25) { killEnemy(e); addText(e.x, e.y - e.r, '처형', '#7dff7a', 16, 0.8); }
        S.fx.push({ kind: 'hit', x: s.x, y: s.y, t: 0, life: 0.2, color: s.col, big: 1.4 });
        impactSparks(s.x, s.y, s.vx, s.vy, s.col, 6);
        sparks(s.x, s.y, s.col, 4, 200);
      }
      for (const c of S.caps) if (!c.dead && !s.hitSet.has(c) && Math.hypot(c.x - s.x, c.y - s.y) < c.r + 6) { s.hitSet.add(c); hitCap(c, Math.max(2, s.cp || 2)); }
    } else if (s.type === 'bomb') {
      s.t = (s.t || 0) + dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= Math.pow(0.1, dt); s.vy *= Math.pow(0.1, dt);
      if (Math.random() < 0.5) smoke(s.x, s.y);
      if (s.t > s.life) { s.done = true; boom(s.x, s.y, 0.55, '#ffcf5a'); blast(s.x, s.y, 48, s.dmg, null); }
      continue;
    } else {
      const t = s.tgt;
      if (t && !t.dead) steer(s, t.x, t.y, s.turn, s.sp, dt);
      if ((s.type === 't' || s.type === 'b' || s.type === 'r') && Math.random() < 0.6) smoke(s.x - s.vx * 0.04, s.y - s.vy * 0.04);
      if (s.type === 'plasma' && Math.random() < 0.8) ember(s.x, s.y, '#7fe8ff');
      if (s.type === 'v' && Math.random() < 0.6) ember(s.x, s.y, '#c89bff');
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (t && !t.dead && Math.hypot(t.x - s.x, t.y - s.y) < t.r) { s.done = true; impact(s, t); }
    }
    if (s.y < -60 || s.y > H || s.x < -60 || s.x > W + 60) s.done = true;
  }
  S.shots = S.shots.filter(s => !s.done);

  for (const z of S.zones) {
    DMG_BY = z.ut || null;
    z.t += dt;
    for (const e of S.enemies) {
      if (!shootable(e)) continue;
      const inside = z.rect ? Math.abs(e.y - z.y) < z.h / 2 + e.r * 0.5 : Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r * 0.5;
      if (inside) hitEnemy(e, z.dps * dt, 'fire', true);
    }
    if (Math.random() < (z.rect ? 1 : 0.5)) ember(z.rect ? Math.random() * W : z.x + (Math.random() - .5) * z.r * 1.4, z.rect ? z.y + (Math.random() - .5) * z.h : z.y + (Math.random() - .5) * z.r * 0.6, Math.random() < 0.5 ? '#ffb347' : '#ff6a3a');
  }
  S.zones = S.zones.filter(z => z.t < z.life);

  // 중력장과 블랙홀
  const pullAll = (list) => {
    for (const f of list) {
      f.t += dt; DMG_BY = f.ut || null;
      for (const e of S.enemies) {
        if (!shootable(e)) continue;
        const dx = f.x - e.x, dy = f.y - e.y, d = Math.hypot(dx, dy);
        if (d > f.r + e.r) continue;
        if (!e.boss && d > 4) { const pull = (f.pull || 40) * dt; e.x += dx / d * Math.min(d, pull); e.y += dy / d * Math.min(d, pull); }
        e.slow = Math.max(e.slow, 0.5); e.slowT = Math.max(e.slowT, 0.2);
        if (f.dps) hitEnemy(e, f.dps * dt, 'blast', true);
      }
      if (f.t >= f.life && !f.done) {
        f.done = true;
        if (f.implode) { boom(f.x, f.y, 1.8, '#b86bff'); blast(f.x, f.y, f.r, f.implode, null); shake(0.4); }
      }
    }
  };
  pullAll(S.fields); pullAll(S.holes);
  S.fields = S.fields.filter(f => !f.done);
  S.holes = S.holes.filter(f => !f.done);

  // 기뢰
  for (const m of S.mines) {
    m.t += dt;
    if (m.t < 0.5 || m.boom) continue;
    if (S.enemies.some(e => shootable(e) && Math.hypot(e.x - m.x, e.y - m.y) < 32 + e.r * 0.5)) m.boom = 0.001;
  }
  for (const m of S.mines) if (m.boom && !m.done) {
    DMG_BY = m.owner ? m.owner.type : null;
    m.boom -= dt;
    if (m.boom > 0) continue;
    m.done = true;
    if (m.lv >= 4) for (const e of S.enemies) if (!e.boss && shootable(e)) { const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < 110 && d > 1) { e.x += (m.x - e.x) * 0.5; e.y += (m.y - e.y) * 0.5; } }
    boom(m.x, m.y, 1, '#ff4a6a'); sheetFx(3, m.x, m.y, 180, 0.5);
    blast(m.x, m.y, m.lv >= 3 ? 75 : 60, m.dmg, null);
    if (m.lv >= 3) for (const o of S.mines) if (!o.done && !o.boom && Math.hypot(o.x - m.x, o.y - m.y) < 90) o.boom = 0.12;
  }
  S.mines = S.mines.filter(m => !m.done && m.owner.cells);

  for (const k of S.strikes) {
    DMG_BY = k.ut || null;
    k.t += dt;
    if (!k.done && k.t >= k.delay) {
      k.done = true;
      for (const e of S.enemies) if (shootable(e) && Math.hypot(e.x - k.x, e.y - k.y) < k.r + e.r) hitEnemy(e, k.dmg, 'blast');
      boom(k.x, k.y, k.nuke ? 3.4 : 2.6, k.nuke ? '#ff8a5a' : '#ffcf5a'); sheetFx(4, k.x, k.y, k.nuke ? 640 : 500, 1.1);
      play('boom_big', k.nuke ? 0.7 : 0.5, k.nuke ? 0.8 : 1); play('kaboom', 0.8, k.nuke ? 0.7 : 0.9); play('thud', 0.75, k.nuke ? 0.75 : 0.9); punch(k.nuke ? 1.3 : 0.9); shockwave(k.x, k.y, k.nuke ? 440 : 320);
      sparks(k.x, k.y, '#fff2b0', 30, 520);
      S.fx.push({ kind: 'pillar', x: k.x, y: k.y, t: 0, life: 0.6, nuke: k.nuke });
      shake(k.nuke ? 1 : 0.8); S.whiteFlash = Math.max(S.whiteFlash, k.nuke ? 0.5 : 0.25); S.glitch = Math.max(S.glitch, 0.25);
    }
  }
  S.strikes = S.strikes.filter(k => k.t < k.delay + 0.1);

  for (const b of S.beams) {
    DMG_BY = b.u ? b.u.type : null;
    b.t += dt;
    if (b.u.cells) { const p = unitPos(b.u); b.x = p.x; b.y = p.y - 26; }
    for (const e of S.enemies) if (shootable(e) && distToRay(e.x, e.y, b.x, b.y, b.ang) < e.r + (b.w || 18)) {
      if (b.slowB && !e.boss) { e.slow = Math.max(e.slow, 0.4); e.slowT = Math.max(e.slowT, 0.3); }
      hitEnemy(e, b.dps * dt, 'beam', true);
      if (Math.random() < 0.3) sparks(e.x, e.y, '#ffe27a', 1, 260);
    }
    b.capT += dt;
    if (b.capT > 0.1) { b.capT = 0; for (const c of S.caps) if (!c.dead && distToRay(c.x, c.y, b.x, b.y, b.ang) < c.r + 18) hitCap(c, b.u ? capPow(b.u.lv) : 1); }
  }
  S.beams = S.beams.filter(b => b.t < b.life && b.u.cells);

  const bossDead = S.boss && S.boss.dead && S.boss.hp <= 0, midDead = bossDead && S.boss.mini;
  S.enemies = S.enemies.filter(e => !e.dead);
  S.caps = S.caps.filter(c => !c.dead);
  if (S.focus && (S.focus.dead || !(S.caps.includes(S.focus) || S.enemies.includes(S.focus)))) S.focus = null;

  if (S.hp <= 0 && S.pk.revive && !S.noRevive) {   // 최후의 방벽 강화: 한 번 버틴다
    S.pk.revive = 0; S.hp = Math.min(5, S.maxHp);
    for (const e of S.enemies) if (!e.dead && !e.boss) e.frozen = Math.max(e.frozen, 3);
    S.whiteFlash = 0.8; shake(0.8); addText(W / 2, LINE_Y - 90, '최후의 방벽!', '#5affc8', 30, 1.5); play('shieldUp', 0.7);
  }
  if (S.hp <= 0) { S.hp = 0; endStage(false); return; }
  const st = S.stage;
  if (bossDead) { S.boss = S.enemies.find(e => e.boss) || null; if (!st.endless && !midDead) { beginClear(); return; } }   // 중간 보스를 잡으면 판은 이어진다
  const cleared = !S.events.length && !S.enemies.some(e => !(e.hacked > 0));
  if (S.mode === 'play' && !st.boss && S.wave === st.waves && cleared) { beginClear(); return; }
  if (S.mode === 'play' && S.wave < st.waves && cleared) {
    S.mode = 'break'; S.breakT = 3;
    S.attacks = [];
    S.hp = Math.min(S.maxHp, S.hp + S.pk.regen);
    const gg = S.crisis ? 3 : 2;
    addGear(gg, W / 2, LINE_Y - 80);
    S.banner = { text: 'CLEAR', sub: `웨이브 ${S.wave} 방어 성공, 부품 +${gg}`, color: '#8dff9a', t: 0, life: 2 };
    S.crisis = false;
    if (st.endless && S.wave >= 10) ach('endless_10');
    if (st.endless && S.wave >= 30) ach('endless_30');
    if (!st.endless && st.n >= 2 && !S.tut && S.wave % 2 === 0) { S.mode = 'perk'; S.perkChoices = rollPerks(); S.banner = null; }   // 2웨이브마다 강화 (마지막 웨이브 빼고)
    if (st.endless) { S.score += 100; if (S.wave % 2 === 0 || S.wave % 5 === 0) { S.mode = 'perk'; if (S.daily) S.rng = mulberry(seedOf('perk' + S.daily.day + S.wave)); S.perkChoices = rollPerks(); S.rng = null; S.banner = null; } }
  }
}
function impact(s, t) {
  impactSparks(s.x, s.y, s.vx, s.vy, s.isCap ? '#ffe9a8' : s.type === 'f' ? LV_COL[s.lv - 1] : UNIT[s.type] ? UNIT[s.type].col : '#ffb347', s.type === 'f' || s.type === 'a' ? 4 : 7);
  if (s.isCap) { hitCap(t, s.cp || 1); t.pending = Math.max(0, t.pending - (s.cp || 1)); S.fx.push({ kind: 'hit', x: s.x, y: s.y, t: 0, life: 0.15 }); return; }
  t.pending = Math.max(0, t.pending - s.dmg);
  switch (s.type) {
    case 't': {
      const r = UNIT.t.splash * (1 + 0.12 * (s.lv - 1));
      boom(s.x, s.y, 0.5 + r / 140, '#ff9a3c'); sheetFx(3, s.x, s.y, 120 + r, 0.5);
      blast(s.x, s.y, r, s.dmg, t);
      if (s.lv >= 3) S.zones.push({ ut: DMG_BY, x: s.x, y: s.y, r: 58 + s.lv * 4, dps: s.dmg * 0.45, t: 0, life: 2 });
      if (s.lv >= 4) for (let k = 0; k < 4; k++) { const a = Math.PI * 2 * k / 4 + Math.random() * 0.8; S.shots.push({ ut: DMG_BY, type: 'bomb', x: s.x, y: s.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, dmg: s.dmg * 0.35, lv: s.lv, t: 0, life: 0.35 }); }
      break;
    }
    case 'b': boom(s.x, s.y, 0.7, '#7fe8ff'); blast(s.x, s.y, UNIT.b.splash, s.dmg, t); break;
    case 'plasma': boom(s.x, s.y, 2.4, '#7fe8ff'); sparks(s.x, s.y, '#bff6ff', 26, 460); blast(s.x, s.y, 150, s.dmg, t); shake(0.6); punch(0.6); play('kaboom', 0.6, 1.1); shockwave(s.x, s.y, 220); S.glitch = Math.max(S.glitch, 0.2); break;
    case 'r': {
      const r = UNIT.r.splash * (1 + 0.1 * (s.lv - 1));
      boom(s.x, s.y, 1.5, '#ffb0a0'); sheetFx(3, s.x, s.y, 230, 0.55); shake(0.25);
      blast(s.x, s.y, r, s.dmg, t, s.lv >= 3 ? { stun: 0.5 } : null);
      if (s.lv >= 4) for (let k = 0; k < 6; k++) { const a = Math.PI * 2 * k / 6 + Math.random() * 0.5; S.shots.push({ ut: DMG_BY, type: 'bomb', x: s.x, y: s.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, dmg: s.dmg * 0.25, lv: s.lv, t: 0, life: 0.35 }); }
      break;
    }
    case 'c': {
      const freeze = e => { e.slow = Math.max(e.slow, 0.35); e.slowT = Math.max(e.slowT, 2); if (s.lv >= 3 && !e.boss && Math.random() < 0.12) e.frozen = Math.max(e.frozen, 1.5); };
      hitEnemy(t, s.dmg, 'laser'); freeze(t);
      if (s.lv >= 2) { for (const e of S.enemies) if (e !== t && shootable(e) && Math.hypot(e.x - s.x, e.y - s.y) < 55 + e.r) { hitEnemy(e, s.dmg * 0.5, 'laser', true); freeze(e); } S.fx.push({ kind: 'ring', x: s.x, y: s.y, t: 0, life: 0.35, color: '#9ff0ff', r0: 10 }); }
      S.fx.push({ kind: 'hit', x: s.x, y: s.y, t: 0, life: 0.2, color: '#9ff0ff' });
      break;
    }
    case 'v': {
      const L = s.lv;
      S.fields.push({ ut: DMG_BY, x: s.x, y: s.y, r: [70, 85, 90, 90, 110][L - 1], t: 0, life: 2, pull: 45, dps: L >= 3 ? s.dmg * 0.6 : 0, implode: L >= 5 ? s.dmg * 6 : 0 });
      hitEnemy(t, s.dmg, 'blast');
      break;
    }
    case 's': {
      hitEnemy(t, s.dmg, 'laser', !s.crit);
      S.fx.push({ kind: 'hit', x: s.x, y: s.y, t: 0, life: 0.2, color: '#7dff7a' });
      break;
    }
    default:
      hitEnemy(t, s.dmg, 'laser');
      S.fx.push({ kind: 'hit', x: s.x, y: s.y, t: 0, life: 0.15, color: s.type === 'f' ? LV_COL[s.lv - 1] : UNIT[s.type] ? UNIT[s.type].col : '#7fe0ff' });
  }
}
function beginClear() {
  if (S.mode === 'clearing') return;
  S.mode = 'clearing'; S.clearT = 0; S.attacks = []; S.focus = null; S.banner = null;
}
function endStage(win) {
  S.endT = performance.now() / 1000; S.introDur = S.stage.endless ? 0 : 1.4;
  S.mode = win ? 'win' : 'lose';
  S.attacks = [];
  if (drag) drag = null;
  if (S.stage.endless) {
    const score = S.score;
    S.baseEarned = 20 + S.wave * 20 + Math.floor(S.wave / 10) * 100;   // 웨이브마다 20, 10웨이브마다 도달 보너스 100
    if (S.daily && PROG.dailyPaid !== S.daily.day) { S.baseEarned *= 2; PROG.dailyPaid = S.daily.day; S.dailyBonus = true; }   // 오늘의 도전: 그날 첫 판은 2배
    S.earned = S.baseEarned + S.cores; S.endT = performance.now() / 1000;
    PROG.credits += S.earned;
    S.lastBoard = gridUnits().sort((a, b) => b.lv - a.lv).map(u => u.type + Math.min(u.lv, 8)).join(','); UI.lbMsg = '';
    if (S.daily) {
      const b = PROG.dailyBest && PROG.dailyBest.day === S.daily.day ? PROG.dailyBest : null;
      S.rank = !b || score > b.score || (score === b.score && S.wave > b.wave) ? 1 : 0;
      if (S.rank) PROG.dailyBest = { day: S.daily.day, score, wave: S.wave };
    } else {
      const rec = { score, wave: S.wave, date: new Date().toISOString().slice(0, 10), deck: PROG.deck.slice(), board: S.lastBoard };
      PROG.records = (PROG.records || []).concat([rec]).sort((a, b) => b.score - a.score || b.wave - a.wave).slice(0, 10);
      S.rank = PROG.records.indexOf(rec) + 1;
    }
    gainXp(S.wave * 8);
    save(); play('vo_fail', 0.7); S.glitch = 0.6;
    return;
  }
  gainXp(win ? S.stage.waves * 10 + 50 : (S.wave - 1) * 10);   // 캠페인: 깬 웨이브 × 10, 이기면 +50
  if (!win) { save(); play('vo_fail', 0.7); S.glitch = 0.6; return; }
  S.stars = S.hp >= 8 ? 3 : S.hp >= 4 ? 2 : 1;
  const n = S.stage.n, first = !PROG.stars[n];
  S.baseEarned = (first ? 90 : 30) + S.stars * 25 + S.stage.s * 25;
  S.earned = S.baseEarned + S.cores; S.endT = performance.now() / 1000;
  PROG.credits += S.earned;
  if ((PROG.stars[n] || 0) < S.stars) PROG.stars[n] = S.stars;
  if (n === 1) ach('first_clear');
  if (n % 5 === 0) ach('boss_' + n / 5);
  if (S.stars === 3) ach('three_star');
  if (Array.from({ length: STAGE_COUNT }, (_, i) => PROG.stars[i + 1]).every(v => v === 3)) ach('all_stars');
  save();
  // 이 스테이지로 풀리는 기체가 있으면 소개 카드
  if (first) { const t = UNIT_ORDER.find(k => UNIT[k].unlock.stage === n); if (t) { unlockUnit(t); UI.pendingReveal = { type: t, at: performance.now() / 1000 + S.introDur }; } }
  play('clear_fx', 0.6);
}

