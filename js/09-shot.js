'use strict';
// ── 홍보 촬영 모드: 주소 끝에 #shot-battle 같은 표시를 붙이면 장면을 스스로 만든다 ──
// 스토어 이미지 제작용. 이 모드에서는 저장하지 않는다.
const SHOT = (location.hash || '').startsWith('#shot-') ? location.hash.slice(6) : null;
const SHOT_RAW = SHOT === 'raw' || SHOT === 'rawboss';
function shotArmy(list) {
  for (const u of allUnits()) unplace(u);
  for (const [t, lv, cell] of list) { const u = makeUnit(t, lv); const cells = cellsFor(u, cell); if (canPlace(u, cells)) place(u, cells); }
}
function shotRun(frames, maxLv = 4) {
  for (let i = 0; i < frames; i++) {
    let again = true;
    while (again) {
      again = false;
      const us = allUnits();
      outer: for (const A of us) for (const B of us) if (A !== B && A.type === B.type && A.lv === B.lv && A.lv < maxLv) { if (B.res != null && A.res == null) continue; mergeInto(B, A); again = true; break outer; }
    }
    for (const u of S.reserve.slice()) if (u) { const sp = findSpot(u); if (sp) place(u, sp); }
    S.skillPop = null; S.hint = null; S.hintQueue.length = 0;
    const danger = S.enemies.some(e => e.y > 430);
    S.focus = danger ? null : (S.caps.find(c => c.y > FIRE_Y) || null);
    if (S.mode === 'perk') doAction({ act: 'perk', i: 0 });
    update(1 / 60);
    S.hp = Math.max(S.hp, 7);
    for (const u of allUnits()) u.hp = Math.max(u.hp, 1);
  }
}
function setupShot(k) {
  save = () => {};
  PROG = freshProg(); PROG.owned = UNIT_ORDER.slice(); PROG.credits = 4280; applyColors();
  for (let n = 1; n <= 13; n++) PROG.stars[n] = n < 12 ? 3 : 2;
  PROG.mk = { f: 6, t: 3, b: 4, s: 2, e: 1 };
  PROG.seen = new Proxy({}, { get: () => true });
  if (SHOT_RAW) PROG.settings.fx = false;
  const army = [['f', 4, 1], ['f', 3, 3], ['t', 3, 8], ['t', 2, 10], ['e', 3, 4], ['b', 2, 13], ['c', 2, 6], ['f', 2, 15], ['s', 3, 0]];
  if (k === 'battle' || k === 'raw') {
    PROG.deck = ['f', 't', 'e', 'b', 'c'];
    startStage(12); shotArmy(army); S.wave = 2; startWave(3); shotRun(60 * 9);
  } else if (k === 'boss' || k === 'rawboss') {
    PROG.deck = ['f', 't', 's', 'b', 'e'];
    startStage(15); shotArmy([['f', 5, 2], ['f', 4, 3], ['t', 4, 8], ['s', 4, 0], ['b', 3, 13], ['e', 4, 5], ['t', 3, 10], ['f', 3, 15]]);
    S.wave = 4; startWave(5); shotRun(60 * 11, 5);
  } else if (k === 'merge') {
    PROG.deck = ['f', 't', 'e', 'b', 'c'];
    startStage(7); shotArmy(army); S.wave = 1; startWave(2); shotRun(60 * 7);
    const a = makeUnit('f', 5), b = makeUnit('f', 5); place(a, [2]); place(b, [5]); doMerge(a, b); S.skillPop.t = 0.3; S.hint = null; S.hintQueue = [];
    for (const f of S.fx) f.t = Math.max(f.t, 0.12); for (const w of S.waves || []) w.t = 0.16; S.whiteFlash = 0.05; S.punch = 0; S.frozen = true;   // 초월 팝업이 떠 있는 순간에 멈춘다
  } else if (k === 'hangar') {
    S = { mode: 'hangar' }; UI.card = { type: 'b' };
    UI.upFx = { type: 'b', mk: 5, t0: performance.now() / 1000 - 0.35, milestone: false, max: false }; PROG.mk.b = 5;
  } else if (k === 'endless') {
    PROG.deck = ['f', 't', 'e', 'b', 'c'];
    startStage(0, true); shotArmy(army); S.wave = 8; startWave(9); shotRun(60 * 12);
    S.mode = 'perk'; S.perkChoices = [PERKS[0], PERKS[3], PERKS[9]];
  } else if (k === 'legend') {   // 강화 등급: 전설, 희귀, 일반 한 장씩
    PROG.deck = ['f', 't', 'e', 'b', 'c'];
    startStage(12); shotArmy(army); S.wave = 2; startWave(3); shotRun(60 * 6);
    S.mode = 'perk'; S.perks = ['dmg', 'twin']; S.perkChoices = ['glass', 'lonely', 'spd'].map(id => PERKS.find(p => p.id === id)); S.perkT0 = 0;
  } else if (k === 'rage') {   // 체력이 절반 아래로 떨어져 격노한 보스
    PROG.deck = ['f', 't', 's', 'b', 'e'];
    startStage(15); shotArmy([['f', 5, 2], ['f', 4, 3], ['t', 4, 8], ['s', 4, 0], ['b', 3, 13], ['e', 4, 5], ['t', 3, 10], ['f', 3, 15]]);
    S.wave = 4; startWave(5); shotRun(60 * 9, 5);
    if (S.boss) S.boss.hp = S.boss.maxHp * 0.49;
    shotRun(40, 5); S.frozen = true;
  } else if (k === 'wreck' || k === 'rift') {   // 구역 7 부서진 칸 / 구역 8 옆에서 오는 캡슐
    PROG.deck = ['f', 't', 'e', 'b', 'c']; for (let n = 1; n <= 35; n++) PROG.stars[n] = 3;
    const big = army.map(([t, lv, c]) => [t, Math.min(6, lv + 2), c]);
    startStage(k === 'wreck' ? 32 : 37); shotArmy(big); S.wave = 1; startWave(2); shotRun(60 * (k === 'wreck' ? 6 : 4), 6);
    if (k === 'rift') { const c = S.caps.find(q => q.side) || S.caps[0]; if (!c) { const n = makeCap({ type: 'f', lv: 2, n: 1 }, 150, 1); sideCap(n); n.x = 70; } }
  } else if (k === 'boss7' || k === 'boss8') {
    PROG.deck = ['f', 't', 's', 'b', 'e']; for (let n = 1; n <= 39; n++) PROG.stars[n] = 3;
    startStage(k === 'boss7' ? 35 : 40); shotArmy([['f', 6, 2], ['f', 5, 3], ['t', 5, 8], ['s', 5, 0], ['b', 4, 13], ['e', 5, 5], ['t', 4, 10], ['f', 4, 15]]);
    S.wave = 4; startWave(5); shotRun(60 * 11, 6);
  } else if (k === 'fuse' || k === 'fused') {   // 특수 합체: 짝꿍 Lv8 둘이 금빛 선으로 이어진 모습 / 합친 직후
    PROG.deck = ['g', 'x', 'f', 'e', 't'];
    startStage(12); shotArmy([['g', 8, 1], ['x', 8, 4], ['f', 8, 7], ['e', 8, 10], ['f', 5, 0], ['f', 5, 2], ['t', 4, 12], ['t', 3, 15]]); S.wave = 2; startWave(3); shotRun(60 * 4, 1);
    if (k === 'fused') { const a = S.slots[1], b = S.slots[4]; doFuse(a, b, fuseOf(a, b)); shotRun(50, 1); }
  } else if (k === 'map2') { for (let n = 1; n <= 33; n++) PROG.stars[n] = 3; S = { mode: 'map' }; UI.mapPage = 1; }
  else if (k === 'map') S = { mode: 'map' };
  if (SHOT_RAW && S.stage) {
    // 연출용 한 순간: 빔, 폭격, 폭발, 탄환을 동시에 띄우고 멈춘다
    for (let k2 = 0; k2 < 3; k2++) { for (const u of gridUnits()) fireUnit(u); for (let f = 0; f < 5; f++) update(1 / 60); }
    const fs = gridUnits().filter(u => u.type === 'f').slice(0, 2);
    fs.forEach((u, i) => { const p = unitPos(u); S.beams.push({ u, x: p.x, y: p.y - 26, ang: -Math.PI / 2 + (i ? 0.16 : -0.12), t: 0.45, life: 1.3, dps: 0, capT: 0 }); });
    for (const e of S.enemies.filter(e => e.y > 120 && e.y < 600).slice(0, 5)) boom(e.x + 20, e.y + 10, 1.3, '#ffb347');
    S.fx.push({ kind: 'pillar', x: 150, y: 470, t: 0.06, life: 0.6 });
    boom(150, 470, 2.4, '#ffcf5a');
    for (const f of S.fx) if (f.kind === 'boom') f.t = 0.07;
    S.banner = null; S.warning = 0; S.skillPop = null;
    S.frozen = true;
  }
  else if (k === 'settings') { S = { mode: 'map' }; UI.settings = true; }
  else if (k === 'clear' || k === 'result') {
    PROG.stars = { 1: 3 }; PROG.deck = ['f', 't', 's', 'g', 'm'];
    startStage(2); shotArmy(army.slice(0, 6)); shotRun(60 * 4); S.cores = 14; S.hp = 9; endStage(true);
    if (k === 'result') { S.endT -= 1.9; UI.pendingReveal = null; }
  } else if (k === 'reveal') { S = { mode: 'map' }; UI.reveal = { type: 'e', t0: performance.now() / 1000 - 1.35, parts: [] }; }
  else if (k === 'shop') { PROG.deck = ['f', 't', 'e', 'b', 'c']; startStage(12); shotArmy(army); S.wave = 2; startWave(3); shotRun(60 * 5); S.gear = 11; S.rowsOpen = 3; S.cellFx[1] = { k: 'atk', lv: 2 }; S.cellFx[2] = { k: 'spd', lv: 1 }; S.cellFx[8] = { k: 'rng', lv: 1 }; UI.selCell = 1; S.hint = null; S.hintQueue = []; UI.shop = true; }
  else if (k === 'tut1' || k === 'tut3') {
    PROG.deck = ['f', 't']; PROG.stars = {}; startStage(1); S.tut = { step: k === 'tut1' ? 1 : 3, t: 0 };
    for (let i = 0; i < (k === 'tut1' ? 150 : 420); i++) update(1 / 60);
    S.hint = null; S.frozen = true;
  }
  else if (k === 'perf') {
    // 성능 측정: 전투를 그대로 돌리며 update, draw 시간을 잰다 (window.PERF)
    PROG.deck = ['f', 't', 'e', 'b', 'c']; startStage(12); shotArmy(army); S.wave = 3; startWave(4);
    const u0 = update, d0 = draw, P = window.PERF = { n: 0, up: 0, dr: 0, t0: performance.now() };
    update = dt => { const a = performance.now(); u0(dt); P.up += performance.now() - a; };
    draw = dt => { const a = performance.now(); d0(dt); P.dr += performance.now() - a; P.n++; if (S.mode !== 'play' && S.mode !== 'break') { S.hp = 10; } };
  }
  else if (k === 'shapes') {
    PROG.deck = ['w', 'l', 'q', 'y', 'f']; startStage(14); S.enemies = []; S.events = []; S.caps = [];
    for (const u of allUnits()) unplace(u);
    const add = (t, lv, c) => { const u = makeUnit(t, lv); const cs = cellsFor(u, c); if (canPlace(u, cs)) place(u, cs); };
    add('l', 3, 1); add('q', 5, 9); add('y', 4, 4); add('w', 6, 6); add('f', 2, 8); add('f', 4, 14);
    S.hint = null; S.hintQueue = []; S.banner = null; shotRun(60 * 4, 8); S.frozen = true;
  }
  else if (k === 'tiers') {
    PROG.deck = ['f', 't', 'e']; startStage(12); S.enemies = []; S.events = []; S.caps = [];
    for (const u of allUnits()) unplace(u);
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((lv, i) => place(makeUnit('f', lv), [i]));
    [5, 6, 7, 8].forEach((lv, i) => place(makeUnit('e', lv), [8 + i]));
    [1, 2, 3, 4, 5, 6].forEach((lv, i) => { const u = makeUnit('t', lv); if (i % 2) u.hp = Math.max(1, Math.round(u.maxHp * (i === 1 ? 0.2 : 0.5))); place(u, [12 + i]); });
    S.hint = null; S.hintQueue = []; S.banner = null; S.frozen = true;
  }
  else if (k === 'dragout') { PROG.deck = ['f', 't', 'e', 'b', 'c']; startStage(12); shotArmy(army); S.wave = 2; startWave(3); shotRun(60 * 5); S.hint = null; S.hintQueue = []; const du = gridUnits().find(u => u.type === 'c') || gridUnits()[0]; drag = { unit: du, x: 300, y: 560, sx: 0, sy: 0, moved: true, id: -1 }; S.frozen = true; }
  else if (k === 'trans') {
    PROG.deck = ['f', 't', 'e', 'b', 'c']; startStage(15);
    shotArmy([['f', 8, 1], ['f', 7, 3], ['t', 6, 8], ['e', 6, 4], ['b', 5, 13], ['c', 7, 6], ['f', 6, 15]]);
    S.wave = 2; startWave(3); shotRun(60 * 6, 8); S.hint = null; S.hintQueue = [];
  }
  else if (k === 'crisis') {
    PROG.deck = ['f', 't', 'e', 'b', 'c'];
    startStage(0, true); shotArmy(army); S.mut = ['shield', 'fast']; S.wave = 18; startWave(19); shotRun(60 * 7); S.hint = null; S.hintQueue = [];
  }
  else if (k === 'hits') { PROG.deck = ['f', 't', 'e', 'b', 'c']; startStage(12); shotArmy(army); S.wave = 3; startWave(4); shotRun(60 * 6);
    blastFx(150, 330, 1.4); blastFx(390, 250, 2.2); blastFx(300, 480, 1); for (const f of S.fx) if (f.kind === 'sheet') f.t = Math.max(f.t, 0) + f.life * 0.3; S.frozen = true; }
}
Promise.all([loadImages(), fontsReady()]).then(() => { fitEnemySizes(); buildTints(); if (SHOT) setupShot(SHOT); requestAnimationFrame(loop); });
