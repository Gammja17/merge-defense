'use strict';
// ── 입력 ──────────────────────────────────────────────────
let drag = null;
function toLocal(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
}
function hitButton(p) {
  for (let i = BUTTONS.length - 1; i >= 0; i--) { const b = BUTTONS[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; }
  return null;
}
function setSlider(b, px) {
  const v = Math.round(Math.max(0, Math.min(1, (px - b.sx) / b.sw)) * 20) / 20;
  if (v === SET()[b.key]) return;
  PROG.settings[b.key] = v; save();
  if (b.key === 'sfxVol') play('coin', 0.4, 1.2);
}
function toast(text) { UI.toast = { text, until: performance.now() / 1000 + 1.8 }; }
function goMap() { S = { mode: 'map' }; UI.card = null; UI.shop = false; UI.enemyIntro = null; UI.introQ = null; }
function doAction(b) {
  const now = performance.now() / 1000;
  switch (b.act) {
    case 'stage':
      if (!PROG.deck.length) { S.toast = { text: '격납고에서 기체를 하나 이상 편성해 주세요', until: now + 1.8 }; return; }
      if (unlocked(b.n)) { UI.prep = { n: b.n }; play('open', 0.4); } else S.toast = { text: '앞 스테이지를 먼저 깨야 열려요', until: now + 1.6 };
      return;
    case 'next': { const n = S.stage.n + 1; goMap(); UI.prep = { n }; return; }
    case 'prepBack': UI.prep = null; return;
    case 'prepGo': {
      if (!PROG.deck.length) { toast('기체를 하나 이상 편성해 주세요'); denied(); return; }
      const P = UI.prep; UI.prep = null; if (P.endless) startStage(0, true); else startStage(P.n); return;
    }
    case 'prepToggle':
      if (PROG.deck.includes(b.type)) { if (PROG.deck.length <= 1) { toast('기체를 하나 이상 편성해야 해요'); denied(); return; } PROG.deck = PROG.deck.filter(t => t !== b.type); }
      else if (PROG.deck.length >= DECK_N) { toast('편성이 꽉 찼어요. 위에서 하나를 먼저 빼 주세요'); denied(); return; }
      else PROG.deck.push(b.type);
      save(); play('tap', 0.4); return;
    case 'retry': UI.shop = false; if (S.stage.endless) startStage(0, true, !!S.daily); else startStage(S.stage.n); return;
    case 'map':
      if (S.mode === 'hangar' && !PROG.deck.length) { toast('기체를 하나 이상 편성해야 해요'); return; }
      goMap(); return;
    case 'hangar': S = { mode: 'hangar' }; return;
    case 'card': UI.card = { type: b.type }; play('open', 0.45);
      if ((PROG.newUnits || []).includes(b.type)) { PROG.newUnits = PROG.newUnits.filter(k => k !== b.type); save(); }
      return;
    case 'revealDetail': if (S.mode === 'win') S.endT = performance.now() / 1000 - (S.introDur || 0); UI.reveal = null; UI.card = { type: b.type, isNew: true }; PROG.newUnits = (PROG.newUnits || []).filter(k => k !== b.type); save(); play('ui_open', 0.3); return;
    case 'introOk': UI.enemyIntro = null; return;
    case 'cmd':
      if (b.k === 'orbit') { if (UI.aim) { UI.aim = null; return; } if ((S.cmd || 0) < CMD[0].cost || S.mode !== 'play') return denied(); UI.aim = 'orbit'; return; }
      useCmd(b.k); return;
    case 'revealOk': if (S.mode === 'win') S.endT = performance.now() / 1000 - (S.introDur || 0); UI.reveal = null; return;
    case 'scrapInfo': if (UI.card && UI.card.u) scrapUnit(UI.card.u); UI.card = null; return;
    case 'closecard': UI.card = null; return;
    case 'closeshop': UI.shop = false; return;
    case 'tutskip': if (S.tut) { if (S.tut.e && !S.tut.e.dead) S.tut.e.dead = true; if (S.tut.atk) S.tut.atk.cancelled = true; S.tut = null; PROG.tut = true; save(); } return;
    case 'summon': {
      if (S.mode !== 'play' && S.mode !== 'break') return;
      const cost = summonCost(), p = { x: W - 77, y: LINE_Y - 26 };
      if (S.gear < cost) { addText(p.x, p.y - 26, `부품 ${cost - S.gear}개 부족`, '#ffb0b0', 16, 0.9); denied(); return; }
      const deck = battleDeck(), type = deck[Math.floor(Math.random() * deck.length)] || 'f', lv = summonLv();
      if (giveUnit(type, lv, p.x, p.y, UNIT[type].col) === 'lost') { addText(p.x, p.y - 26, '빈자리가 없어요', '#ffb0b0', 16, 0.9); denied(); return; }
      S.gear -= cost; S.summons = (S.summons || 0) + 1;
      play('unlock', 0.35, 1.3); sparks(p.x, p.y, '#ffb347', 12, 220);
      if (lv > 1) addText(p.x, p.y - 30, `Lv${lv}`, UNIT[type].col, 20, 0.9);
      if (summonLv() > lv) { S.summonUpT = S.time; addText(p.x, p.y - 56, `다음 소환 Lv${summonLv()}`, '#ffd24a', 18, 1.4); }
      return;
    }
    case 'openshop': if (S.mode === 'play' || S.mode === 'break') { UI.shop = true; play('open', 0.45); } return;
    case 'cellsel': UI.selCell = b.c; return;
    case 'cellfx': case 'cellup': {
      const f = S.cellFx[b.c], cost = f ? CELL_UP[f.lv - 1] : cellNewCost();
      if (f && f.lv >= 3) return;
      if (S.gear < cost) { toast(`부품이 ${cost - S.gear}개 부족해요`); denied(); return; }
      S.gear -= cost;
      if (f) f.lv++; else S.cellFx[b.c] = { k: b.k, lv: 1 };
      if (S.cellFx[b.c].lv >= 3) ach('workshop_max');
      play('upgrade', 0.5); play('levelup', 0.45, 1.1);
      const q = cellPos(b.c); S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.5, color: CELL_FX[S.cellFx[b.c].k].col });
      return;
    }
    case 'addrow': {
      const rows = openRows(); if (rows >= ROWS) return;
      const cost = ROW_ADD[rows - START_ROWS];
      if (S.gear < cost) { toast(`부품이 ${cost - S.gear}개 부족해요`); denied(); return; }
      S.gear -= cost; S.rowsOpen = rows + 1; S.liftT = 0; UI.shop = false;   // 창을 닫고 판이 올라가는 걸 보여준다
      return;
    }
    case 'deploy':
      if (PROG.deck.length >= DECK_N) { toast('편성에서 하나를 먼저 빼 주세요'); return; }
      PROG.deck.push(b.type); save(); UI.card = null; return;
    case 'swapOpen': if (UI.card) UI.card.swap = !UI.card.swap; return;
    case 'colorOpen': if (UI.card) { UI.card.color = !UI.card.color; UI.card.swap = false; } return;
    case 'colorPick': {
      PROG.colors = PROG.colors || {};
      if (b.col === UNIT[b.type].col0) delete PROG.colors[b.type]; else PROG.colors[b.type] = b.col;
      applyColors(); save(); if (UI.card) UI.card.color = false; play('confirm', 0.5); return;
    }
    case 'swapWith': { const i = PROG.deck.indexOf(b.old); if (i >= 0 && !PROG.deck.includes(b.type)) { PROG.deck[i] = b.type; save(); play('confirm', 0.5); } UI.card = null; return; }
    case 'undeploy': PROG.deck = PROG.deck.filter(t => t !== b.type); save(); UI.card = null; return;
    case 'buy': {
      const price = UNIT[b.type].unlock.shop;
      if (PROG.credits < price) { toast('코어가 부족해요. 전투에서 코어를 모으세요'); return; }
      PROG.credits -= price; PROG.owned.push(b.type); unlockUnit(b.type); save();
      UI.card = null; UI.pendingReveal = { type: b.type, at: performance.now() / 1000 };
      return;
    }
    case 'upgrade': {
      const cost = mkCost(b.type);
      if (mkOf(b.type) >= MK_MAX) return;
      if (PROG.credits < cost) { toast(`코어가 ${fmt(cost - PROG.credits)} 부족해요. 전투에서 모으세요`); return; }
      PROG.credits -= cost; PROG.mk[b.type] = mkOf(b.type) + 1; save();
      const mk = mkOf(b.type);
      if (mk >= MK_MAX) ach('mk_max');
      UI.upFx = { type: b.type, mk, t0: performance.now() / 1000, milestone: mk % 3 === 0, max: mk >= MK_MAX };
      play('upgrade', 0.45); setTimeout(() => { play('levelup', 0.6); play('boom_low', 0.35, 1.4); if (mk % 3 === 0) play('unlock', 0.4); }, 440);
      return;
    }
    case 'endless':
      if (!endlessOpen()) return;
      if (!PROG.deck.length) { toast('격납고에서 기체를 하나 이상 편성해 주세요'); return; }
      UI.card = null; S = { mode: 'map' }; UI.prep = { endless: true }; return;
    case 'daily':
      if (!endlessOpen()) return;
      UI.card = null; startStage(0, true, true); return;
    case 'records': S = { mode: 'records' }; UI.card = null; UI.recSel = null; if (b.tab) UI.recTab = b.tab; lbFetch(true); lbFetchDaily(true); return;
    case 'recTab': UI.recTab = b.tab; UI.recSel = null; if (b.tab === 'online') lbFetch(true); if (b.tab === 'daily') lbFetchDaily(true); return;
    case 'recRow': UI.recSel = b.r; return;
    case 'recClose': UI.recSel = null; return;
    case 'lbSubmit': lbSubmit(); return;
    case 'perk': {
      const pk = S.perkChoices[b.i];
      pk.apply(); S.perks.push(pk.id);
      S.perkChoices = null; S.mode = 'break'; S.breakT = 2;
      S.fx.push({ kind: 'ring', x: W / 2, y: 420, t: 0, life: 0.6, color: pk.col }); play('up_fx', 0.5);
      S.banner = { text: pk.name, sub: pk.desc, color: pk.col, t: 0, life: 1.8 };
      play('shieldUp', 0.4);
      return;
    }
    case 'pause': S.paused = true; return;
    case 'resume': S.paused = false; return;
    case 'settings': UI.settings = true; UI.resetArm = 0; return;
    case 'closesettings': UI.settings = false; return;
    case 'toggle': PROG.settings[b.key] = !PROG.settings[b.key]; save(); return;
    case 'slider': UI.sliding = b; setSlider(b, UI.lastP.x); return;
    case 'reset':
      if (UI.resetArm > now) { PROG = freshProg(); applyColors(); save(); UI.settings = false; goMap(); return; }
      UI.resetArm = now + 3; return;
  }
}
cv.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  const p = toLocal(ev);
  UI.lastP = p;
  loadSfx();
  if (S.mode === 'title') { goMap(); return; }
  const b = hitButton(p);
  if (b && b.act === 'prepToggle') {   // 출격 준비 칸: 짧게 누르면 넣고 빼기, 꾹 누르면 기체 정보
    const hold = UI.hold = { b, id: ev.pointerId };
    setTimeout(() => { if (UI.hold === hold) { UI.hold = null; doAction({ act: 'card', type: b.type }); } }, 450);
    return;
  }
  if (UI.reveal || UI.enemyIntro || UI.settings || UI.card || UI.shop || S.paused || ['map', 'hangar', 'records', 'win', 'lose', 'perk'].includes(S.mode)) { if (b) { if (b.act !== 'slider') play(b.act === 'closecard' || b.act === 'closesettings' || b.act === 'closeshop' ? 'close' : 'click', 0.35); doAction(b); } return; }
  if (b) { play('click', 0.35); doAction(b); return; }
  if (UI.aim) { if (p.y < LINE_Y && S.mode === 'play') useCmd('orbit', p.x, p.y); else UI.aim = null; return; }
  const c = cellAt(p.x, p.y), k = resAt(p.x, p.y);
  const u = c >= 0 ? S.slots[c] : k >= 0 ? S.reserve[k] : null;
  if (u) {
    if (ev.button === 2) return;
    const d = drag = { unit: u, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, id: ev.pointerId };
    cv.setPointerCapture(ev.pointerId);
    // 모바일: 꾹 누르고 있으면 정보 카드
    setTimeout(() => { if (drag === d && !d.moved && d.unit.hp > 0) { drag = null; openUnitInfo(d.unit); } }, 450);
    return;
  }
  let best = null, bd = 1e9;
  for (const cp of S.caps) { const d = Math.hypot(cp.x - p.x, cp.y - p.y); if (d < 60 && d < bd) { bd = d; best = cp; } }
  for (const e of S.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < e.r + 22 && d < bd && !(e.hacked > 0)) { bd = d; best = e; } }
  if (best) { if (best.lock) best.lock = false; S.focus = S.focus === best ? null : best; if (S.focus) snapFocus(S.focus); }
});
function unitAt(p) {
  if (!S.slots || !['play', 'break'].includes(S.mode)) return null;
  const c = cellAt(p.x, p.y), k = resAt(p.x, p.y);
  return c >= 0 ? S.slots[c] : k >= 0 ? S.reserve[k] : null;
}
function openUnitInfo(u) { UI.card = { type: u.type, inGame: true, u }; play('open', 0.45); }
cv.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  if (UI.card || UI.settings || UI.shop || S.paused) return;
  const u = unitAt(toLocal(ev));
  if (u) { drag = null; openUnitInfo(u); }
});
cv.addEventListener('pointermove', ev => {
  if (UI.aim) UI.hoverP = toLocal(ev);
  if (UI.sliding && ev.buttons) { setSlider(UI.sliding, toLocal(ev).x); return; }
  if (!drag || ev.pointerId !== drag.id) return;
  const p = toLocal(ev);
  drag.x = p.x; drag.y = p.y;
  if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) { drag.moved = true; play('tap', 0.3, 1.1, 0.03); }
});
function doMerge(target, from) {
  mergeInto(target, from);
  const q = unitPos(target), col = UNIT[target.type].col;
  boom(q.x, q.y, 1 + target.lv * 0.15, col);
  S.fx.push({ kind: 'ring', x: q.x, y: q.y, t: 0, life: 0.5, color: col },
            { kind: 'ring', x: q.x, y: q.y, t: -0.12, life: 0.6, color: '#ffffff' },
            { kind: 'scan', x: q.x, y: q.y, t: 0, life: 0.8, color: col },
            { kind: 'beam', x: q.x, y: q.y, t: 0, life: 0.7, color: col });
  sparks(q.x, q.y, col, 14 + target.lv * 5, 260 + target.lv * 30);
  S.whiteFlash = Math.max(S.whiteFlash, Math.min(0.45, 0.08 * target.lv));
  if (S.pk.arc && S.mode === 'play') {
    const near = S.enemies.filter(e => shootable(e)).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 3);
    for (const e of near) { S.fx.push({ kind: 'bolt', pts: [{ x: q.x, y: q.y - 20 }, { x: e.x, y: e.y }], t: 0, life: 0.35, col: '#9ad8ff' }); hitEnemy(e, e.maxHp * (e.boss ? 0.01 : 0.12) * target.lv * S.pk.arc, 'zap'); }
    if (near.length) play('zapfx', 0.5, 0.9);
  }
  shake(0.08 * target.lv);
  S.glitch = Math.max(S.glitch, 0.05 * target.lv);
  play('merge' + Math.min(5, Math.max(2, target.lv)), 0.55); play('latch', 0.3, 0.8);
  if (target.lv > 5) {
    play('unlock', 0.5); play('thud', 0.6, 0.8); punch(1.2); shockwave(q.x, q.y, 300);
    S.fx.push({ kind: 'pillar', x: q.x, y: q.y, t: 0, life: 0.6 });
    hintOnce('trans', 'Lv5 둘을 합치면 초월해요');
  }
}
function dropUnit(u, x, y) {
  const k = resAt(x, y);
  if (k < 0 && y < SCRAP_Y) { scrapUnit(u); return; }
  if (k >= 0) {
    const r = S.reserve[k];
    if (r === u) return;
    if (r && r.type === u.type && r.lv === u.lv && r.lv < MAX_LV) return doMerge(r, u);
    if (!r) { toReserve(u, k); clunk(); } else denied();
    return;
  }
  const c = cellAt(x, y);
  if (c < 0) return;
  const t = S.slots[c];
  if (t && t !== u && t.type === u.type && t.lv === u.lv && t.lv < MAX_LV) return doMerge(t, u);
  const cells = cellsFor(u, c);
  if (canPlace(u, cells)) { if (u.cells && u.cells.join() === cells.join()) return; place(u, cells); clunk(); return; }
  // 자리 바꾸기: 놓을 자리를 막은 기체가 하나뿐이고, 그 기체가 내가 있던 자리에 들어가면 서로 바꾼다
  const blockers = [...new Set(cells.map(i => S.slots[i]).filter(o => o && o !== u))];
  if (blockers.length === 1) {
    const b = blockers[0], uc = u.cells ? u.cells.slice() : null, rk = u.res, bc = b.cells.slice();
    unplace(b); unplace(u);
    let spot = null;
    if (canPlace(u, cells)) {
      place(u, cells);
      if (uc) for (const a of uc) { const cs = cellsFor(b, a); if (canPlace(b, cs)) { spot = cs; break; } }
    }
    if (spot || (u.cells && rk != null)) {
      if (spot) place(b, spot); else toReserve(b, rk);
      clunk(); setTimeout(() => clunk(1.15), 90);
      return;
    }
    unplace(u); place(b, bc); if (uc) place(u, uc); else toReserve(u, rk);
  }
  denied();
  const q = cellPos(c);
  addText(q.x, q.y - 20, uSize(u) > 1 ? `${uSize(u)}칸이 비어야 해요` : '자리가 없어요', '#ff9a9a', 16, 0.9);
}
// 해체: 기체를 부품으로 바꾼다. 부품은 정비소(해체 칸을 탭)에서 줄 강화에 쓴다
const SCRAP_GEAR = [1, 2, 4, 7, 12, 18, 26, 36];
function scrapUnit(u) {
  if (!u.cells && u.res == null) return;
  if (S.tut) S.tut.scrapped = true;
  const p = unitPos(u), val = SCRAP_GEAR[u.lv - 1] * uSize(u);
  unplace(u);
  if (drag && drag.unit === u) drag = null;
  sparks(p.x, p.y, '#ffb347', 16, 240, 'shard'); boom(p.x, p.y, 0.7, '#ff9a3c');
  play('scrap', 0.55); play('scrap_low', 0.35);
  addGear(val, p.x, p.y);
}
function clunk(rate = 1) { play('tap', 0.4, 0.9 * rate, 0.03); }   // 놓을 때 '톡'
function denied() { play('deny', 0.5); }
function endDrag(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.moved || !S.slots || d.unit.hp <= 0 || S.paused) return;
  const p = toLocal(ev);
  dropUnit(d.unit, p.x, p.y);
}
cv.addEventListener('pointerup', ev => {
  UI.sliding = null;
  if (UI.hold && UI.hold.id === ev.pointerId) { const h = UI.hold; UI.hold = null; play('click', 0.35); doAction(h.b); }
  endDrag(ev);
});
cv.addEventListener('pointercancel', ev => { UI.hold = null; endDrag(ev); });

// ── 루프 ──────────────────────────────────────────────────
let last = performance.now();
// 가려지면 음악과 소리를 멈추고 전투는 일시정지. 돌아오면 소리만 다시 켠다 (음악은 updateMusic이 이어서 튼다)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    for (const k in MUS.tracks) MUS.tracks[k].a.pause();
    if (AC && AC.state === 'running') AC.suspend();
    if (S.stage && (S.mode === 'play' || S.mode === 'break')) S.paused = true;
  } else if (AC && AC.state === 'suspended') AC.resume();
});
let LOWFX = false, slowT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  // 프레임 상한: 전투 60, 메뉴와 창이 떠 있을 때 30 (120Hz 폰에서 두 배로 그리지 않게)
  const calm = !S.stage || S.paused || UI.settings || UI.card || UI.shop || UI.reveal || UI.enemyIntro || !['play', 'break', 'clearing'].includes(S.mode);
  if (now - last < (calm ? 1000 / 30 : 1000 / 60) - 2) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // 약한 폰: 전투 중 4초 넘게 초당 45프레임을 못 내면 빛 번짐과 색 보정을 이번 세션 동안 끈다
  if (!calm && !LOWFX && !SHOT) { slowT = dt > 1 / 45 ? slowT + dt : Math.max(0, slowT - dt); if (slowT > 4) LOWFX = true; }
  let gdt = dt;
  if (S.hitStop > 0) { S.hitStop -= dt; gdt = dt * 0.15; }
  if (drag && drag.moved && (S.mode === 'play' || S.mode === 'break')) gdt *= 0.3;   // 기체를 들고 있는 동안은 전투가 느려진다
  if (UI.aim) { if (S.mode !== 'play') UI.aim = null; else gdt *= 0.35; }
  else if (S.cmdTut && S.cmdTut.on && !S.cmdTut.done) gdt *= 0.35;   // 처음 써 보는 동안 느리게   // 포격 조준 중에도
  if (S.stage && !S.paused && !UI.settings && !UI.enemyIntro) {
    if (S.bossCine) { S.bossCine.t += dt; if (S.bossCine.t < 1.9) gdt *= 0.15; if (S.bossCine.t > 2.4) S.bossCine = null; }
    if (S.slowmo > 0) { S.slowmo -= dt; gdt *= 0.25 + 0.75 * Math.max(0, 1 - S.slowmo / 1.3) ** 2; }
    if (S.bossDown) { S.bossDown.t += dt; if (S.bossDown.t > 2.2) S.bossDown = null; }
  }
  if (S.stage && !S.paused && !S.frozen && !UI.settings && !UI.reveal && !UI.enemyIntro && !UI.shop && !(UI.card && S.mode !== 'win')) update(gdt);
  updateMusic(dt);
  draw(dt);
  if (NICK.el && !NICK.show) NICK.el.style.display = 'none';
  NICK.show = false;
}
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const want = ['900 20px Orbitron', '700 20px "Chakra Petch"', '20px "Do Hyeon"', '700 14px "Plex KR"'].map(f => document.fonts.load(f, 'A가').catch(() => {}));
  return Promise.race([Promise.all(want), new Promise(r => setTimeout(r, 2500))]);
}
