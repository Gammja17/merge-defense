'use strict';
// ── 화면 ──────────────────────────────────────────────────
function draw(dt) {
  BUTTONS = [];
  if (UI.coreShown == null) UI.coreShown = PROG.credits;
  UI.coreShown += (PROG.credits - UI.coreShown) * Math.min(1, dt * 5);
  if (Math.abs(PROG.credits - UI.coreShown) < 0.5) UI.coreShown = PROG.credits;
  ctx.save();
  if (S.shake > 0 && SET().shake) ctx.translate((Math.random() - .5) * 14 * S.shake, (Math.random() - .5) * 14 * S.shake);
  if (S.punch > 0 && SET().shake) { const z = 1 + S.punch * 0.035; ctx.translate(W / 2, 520); ctx.scale(z, z); ctx.translate(-W / 2, -520); }
  drawBg(dt, S.stage ? S.stage.s : 0);
  if (S.mode === 'title') { ctx.restore(); drawTitle(); drawOverlays(); return; }
  if (S.mode === 'map') { ctx.restore(); drawMap(); drawOverlays(); return; }
  if (S.mode === 'hangar') { ctx.restore(); drawHangar(); drawOverlays(); return; }
  if (S.mode === 'records') { ctx.restore(); drawRecords(); drawOverlays(); return; }

  ctx.strokeStyle = 'rgba(127,224,255,.2)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 10]);
  ctx.lineDashOffset = -S.time * 12;
  ctx.beginPath(); ctx.moveTo(0, FIRE_Y); ctx.lineTo(W, FIRE_Y); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = FU(10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(127,224,255,.55)'; ctx.fillText('WEAPONS RANGE', 8, FIRE_Y - 4);

  for (const c of S.caps) if (c.pair && c.x < c.pair.x && S.caps.includes(c.pair) && !c.carrier && !c.pair.carrier) {
    const y = (c.y + c.pair.y) / 2, mx = (c.x + c.pair.x) / 2;
    ctx.strokeStyle = 'rgba(255,217,102,.55)'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -S.time * 30;
    ctx.beginPath(); ctx.moveTo(c.x + 46, y); ctx.lineTo(c.pair.x - 46, y); ctx.stroke(); ctx.setLineDash([]);
    drawGlow('#ffd966', mx, y, 34, 0.35);
    ctx.fillStyle = 'rgba(20,14,4,.92)'; hexPath(mx, y, 22); ctx.fill();
    ctx.strokeStyle = '#ffd966'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = FT(13, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd966'; ctx.fillText('OR', mx, y + 1);
  }
  drawFieldStuff();
  for (const c of S.caps) drawCap(c);
  for (const e of S.enemies) drawEnemy(e);
  drawStrikes();

  ctx.drawImage(DECK, 0, LINE_Y - 10);
  drawShield();
  drawBaseLive();
  drawPads();
  drawAuras();
  drawAttacks();
  for (const u of gridUnits()) { const p = unitPos(u); drawUnit(u, p.x, p.y, drag && drag.unit === u && drag.moved ? 0.3 : 1, 1, true); }
  for (const u of gridUnits()) if (u.ice > 0) {
    const b = unitBox(u), a = Math.min(1, u.ice * 2);
    ctx.fillStyle = `rgba(170,235,255,${0.35 * a})`; chamfer(b.x, b.y, b.w, b.h, 9); ctx.fill();
    ctx.strokeStyle = `rgba(220,250,255,${0.9 * a})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = FU(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText(u.ice.toFixed(1), b.x + b.w / 2, b.y + 12, '#e8fbff', 3);
  }
  for (const u of gridUnits()) if (u.jam > 0 && u.jamBy) {   // 교란: 잡음 줄이 지글거리고, 교란함까지 지그재그 선
    const b = unitBox(u), p = unitPos(u), e = u.jamBy;
    ctx.save(); chamfer(b.x, b.y, b.w, b.h, 9); ctx.clip();
    ctx.fillStyle = 'rgba(20,24,8,.35)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    for (let k = 0; k < 9; k++) { const yy = b.y + Math.random() * b.h; ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '230,255,120' : '255,255,255'},${0.15 + Math.random() * 0.3})`; ctx.fillRect(b.x, yy, b.w, 1 + Math.random() * 3); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(230,255,90,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y);
    for (let k = 1; k < 10; k++) { const q = k / 10; ctx.lineTo(e.x + (p.x - e.x) * q + (Math.random() - .5) * 14, e.y + (p.y - e.y) * q); }
    ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.font = FK(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText(`교란 ${u.jam.toFixed(1)}`, b.x + b.w / 2, b.y + b.h - 12, '#eaff8a', 3);
  }
  drawUnitFrames(true);
  drawZoneMarks();
  S.reserve.forEach((u, k) => { if (!u) return; const p = resPos(k); drawUnit(u, p.x, p.y, drag && drag.unit === u && drag.moved ? 0.3 : 0.9, uSize(u) > 2 ? 0.26 : uSize(u) === 2 ? 0.34 : 0.58); });
  if (!(drag && drag.moved) && (S.mode === 'play' || S.mode === 'break')) {   // 합칠 수 있는 짝: 칸 모서리에 초록 꺾쇠가 천천히 깜빡
    const groups = {};
    for (const u of allUnits()) if (u.lv < MAX_LV) (groups[u.type + u.lv] = groups[u.type + u.lv] || []).push(u);
    const a = 0.6 + 0.35 * Math.sin(S.time * 2.6);
    ctx.strokeStyle = `rgba(160,255,170,${a})`; ctx.lineWidth = 3.5;
    for (const g of Object.values(groups)) if (g.length >= 2) for (const u of g) {
      let bx, by, bw, bh;
      if (u.res != null) { const q = resPos(u.res); bx = q.x - RES_W / 2; by = q.y - RES_W / 2; bw = bh = RES_W; }
      else { const b = unitBox(u); bx = b.x; by = b.y; bw = b.w; bh = b.h; }
      const k = Math.min(14, bw / 4); bx -= 2; by -= 2; bw += 4; bh += 4;
      for (const [cx, cy, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * k, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * k); ctx.stroke(); }
    }
  }
  drawDrones();
  drawBeams();
  drawShots();
  drawParts();
  drawFx();
  if (drag && drag.moved) {
    const du = drag.unit, c = cellAt(drag.x, drag.y);
    if (c >= 0) {
      const cells = cellsFor(du, c), ok = canPlace(du, cells);
      for (const cc of cells) { const q = cellPos(cc); ctx.strokeStyle = ok ? 'rgba(120,230,255,.8)' : 'rgba(255,90,90,.6)'; ctx.lineWidth = 2; chamfer(q.x - CW / 2 + 4, q.y - CH / 2 + 4, CW - 8, CH - 8, 9); ctx.stroke(); }
    }
    { // 합체 후보 강조
      const canM = tu => tu && tu !== du && tu.type === du.type && tu.lv === du.lv && du.lv < MAX_LV;
      const pulse = 0.5 + 0.5 * Math.sin(S.time * 10);
      for (const tu of allUnits()) {
        let bx, by, bw, bh;
        if (tu.res != null) { const q = resPos(tu.res); bx = q.x - RES_W / 2; by = q.y - RES_W / 2; bw = RES_W; bh = RES_W; }
        else { const xs = tu.cells.map(cc => cellPos(cc).x), ys = tu.cells.map(cc => cellPos(cc).y); bx = Math.min(...xs) - CW / 2 + 2; by = Math.min(...ys) - CH / 2 + 2; bw = Math.max(...xs) - Math.min(...xs) + CW - 4; bh = Math.max(...ys) - Math.min(...ys) + CH - 4; }
        if (tu === du) continue;
        if (!canM(tu)) { ctx.fillStyle = 'rgba(2,4,12,.55)'; chamfer(bx, by, bw, bh, 9); ctx.fill(); continue; }
        drawGlow('#8dff9a', bx + bw / 2, by + bh / 2, Math.max(bw, bh) * 0.8, 0.35 + 0.3 * pulse);
        ctx.strokeStyle = '#8dff9a'; ctx.lineWidth = 3 + 2 * pulse; chamfer(bx - 2, by - 2, bw + 4, bh + 4, 10); ctx.stroke();
        ctx.font = FK(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        outlineText('합체', bx + bw / 2, by - 10 - 4 * pulse, '#caffd0', 4);
      }
    }
    { // 해체 구역: 끄는 동안 선 위 전장을 붉게 덮고, 들어가면 번쩍인다
      const hot = drag.y < SCRAP_Y, zt = SCRAP_Y - 360, fl = hot ? 0.5 + 0.5 * Math.sin(S.time * 12) : 0;
      if (hot && !drag.wasHot) { play('zap', 0.3, 0.6); shake(0.12); }
      drag.wasHot = hot;
      // 들기만 했을 땐 선 근처만 옅게, 구역에 들어가면 전장 전체를 붉게
      const zt2 = hot ? zt : SCRAP_Y - 110, hg = ctx.createLinearGradient(0, zt2, 0, SCRAP_Y);
      hg.addColorStop(0, 'rgba(120,0,10,0)'); hg.addColorStop(0.45, `rgba(170,10,24,${hot ? 0.35 + 0.1 * fl : 0.06})`); hg.addColorStop(1, `rgba(255,40,40,${hot ? 0.7 + 0.15 * fl : 0.2})`);
      ctx.fillStyle = hg; ctx.fillRect(0, zt2, W, SCRAP_Y - zt2);
      // 경계: 움직이는 경고 줄무늬 띠
      const by = SCRAP_Y - 9;
      ctx.save(); ctx.globalAlpha = hot ? 1 : 0.45; ctx.beginPath(); ctx.rect(0, by, W, 18); ctx.clip();
      ctx.fillStyle = hot ? '#ff3a3a' : '#c8202c'; ctx.fillRect(0, by, W, 18);
      ctx.fillStyle = 'rgba(10,0,4,.8)';
      for (let x = -40 + (S.time * 40) % 28; x < W + 20; x += 28) { ctx.beginPath(); ctx.moveTo(x, by + 18); ctx.lineTo(x + 14, by); ctx.lineTo(x + 24, by); ctx.lineTo(x + 10, by + 18); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(20,0,6,.92)'; chamfer(W / 2 - 62, by - 6, 124, 30, 8); ctx.fill();
      ctx.strokeStyle = hot ? '#ffb0a0' : '#ff5a4a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = FK(18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = hot ? '#fff' : '#ffb8a8';
      ctx.fillText('▲ 해체 ▲', W / 2, by + 9);
      // 큰 글자는 손가락 반대쪽에 둬서 기체에 안 가리게
      const lx = drag.x < W / 2 ? W * 0.72 : W * 0.28;
      if (hot) { ctx.font = FK(52); outlineText('해체', lx, SCRAP_Y - 120, '#fff', 6); ctx.font = FK(24); outlineText(`부품 +${SCRAP_GEAR[du.lv - 1] * uSize(du)}`, lx, SCRAP_Y - 72, '#ffd6a0', 5); }
    }
    if (drag.y < SCRAP_Y) {
      drawGlow('#ff3a2a', drag.x, drag.y - 20, 80, 0.55 + 0.2 * Math.sin(S.time * 12));
      drawUnit(du, drag.x, drag.y - 20, 0.75, 0.85);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow('#ff2020', drag.x, drag.y - 20, 46, 0.6); ctx.restore();
    } else drawUnit(du, drag.x, drag.y - 20, 0.9, 1.1);
  }

  ctx.restore();
  drawShockwaves();
  if (S.whiteFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${S.whiteFlash * 0.8})`; ctx.fillRect(0, 0, W, H); }
  applyBloom();
  applyGrade();
  if (!SHOT_RAW) drawHud();
  drawOverlays();
}

function drawHud() {
  const st = S.stage;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 50); ctx.lineTo(W - 18, 60); ctx.lineTo(18, 60); ctx.lineTo(0, 50); ctx.closePath();
  const gr = ctx.createLinearGradient(0, 0, 0, 60);
  gr.addColorStop(0, 'rgba(4,10,30,.96)'); gr.addColorStop(1, 'rgba(6,16,44,.8)');
  ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = 'rgba(90,210,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  for (let x = 30; x < W - 20; x += 12) { ctx.fillStyle = 'rgba(90,210,255,.25)'; ctx.fillRect(x, 57, 1, 3); }

  ctx.font = FU(9); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  S.baseHitT = Math.max(0, (S.baseHitT || 0) - 1 / 60);
  if (drag && drag.moved && (S.mode === 'play' || S.mode === 'break')) {   // 느려진 동안 가장자리 청록빛
    const vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 640);
    vg.addColorStop(0, 'rgba(80,220,255,0)'); vg.addColorStop(1, 'rgba(80,220,255,.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  if (S.mode === 'play' || S.mode === 'break') {   // 방어선 가까이 온 적: 판 위에 빨간 화살표, 처음 들어오면 경고음
    const near = S.enemies.filter(e => shootable(e) && e.y > LINE_Y - 150).sort((p, q) => q.y - p.y).slice(0, 6);
    for (const e of near) {
      const k = Math.min(1, (e.y - (LINE_Y - 150)) / 130), y = LINE_Y - 1, pulse = 0.6 + 0.4 * Math.sin(S.time * 12);
      ctx.globalAlpha = 0.5 + 0.5 * k * pulse; ctx.fillStyle = '#ff3a4a';
      ctx.beginPath(); ctx.moveTo(e.x, y + 12); ctx.lineTo(e.x - 11, y - 4); ctx.lineTo(e.x - 4, y - 4); ctx.lineTo(e.x - 4, y - 14); ctx.lineTo(e.x + 4, y - 14); ctx.lineTo(e.x + 4, y - 4); ctx.lineTo(e.x + 11, y - 4); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (!e.nearWarned) { e.nearWarned = true; play('vo_prox', 0.6); }
    }
  }
  { // 화면 가장자리 붉은 빛: 맞은 순간 크게, 방어막이 3 이하면 약하게 맥박
    const hk = S.baseHitT / 0.6, low = S.hp <= 3 && (S.mode === 'play' || S.mode === 'break') ? 0.18 + 0.1 * Math.sin(S.time * 5) : 0, a = Math.max(hk * 0.75, low);
    if (a > 0.01) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 640);
      vg.addColorStop(0, 'rgba(255,20,40,0)'); vg.addColorStop(1, `rgba(255,20,40,${a})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }
  { const low = S.hp <= 3, segCol = low ? '#ff4a5a' : '#48d8ff', hk = S.baseHitT / 0.6, blink = low ? 0.6 + 0.4 * Math.sin(S.time * 8) : 1;
    ctx.save(); if (hk > 0) ctx.translate((Math.random() - .5) * 10 * hk, 0);
    if (hk > 0) drawGlow('#ff2a3a', 100, 30, 120, hk * 0.9, 0.45);
    // 방패 아이콘
    const ix = 24, iy = 30;
    drawGlow(segCol, ix, iy, 22, 0.35 * blink);
    ctx.fillStyle = segCol; ctx.globalAlpha = blink;
    ctx.beginPath(); ctx.moveTo(ix - 11, iy - 13); ctx.lineTo(ix + 11, iy - 13); ctx.lineTo(ix + 11, iy); ctx.quadraticCurveTo(ix + 9, iy + 10, ix, iy + 15); ctx.quadraticCurveTo(ix - 9, iy + 10, ix - 11, iy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(4,14,34,.8)'; ctx.fillRect(ix - 1.5, iy - 9, 3, 18); ctx.fillRect(ix - 7, iy - 3, 14, 3);
    ctx.globalAlpha = 1;
    ctx.font = FK(14); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = low ? '#ffb0b0' : '#cfefff'; ctx.fillText('방어막', 42, 13);
    ctx.font = FT(14, 900); ctx.textAlign = 'right'; outlineText(`${S.hp}/${S.maxHp}`, 190, 13, low ? '#ff8a8a' : '#ffffff', 3); ctx.textAlign = 'left';
    const x0 = 42, x1 = 192, sw = (x1 - x0) / S.maxHp;
    for (let k = 0; k < S.maxHp; k++) {
      const x = x0 + k * sw, full = k < S.hp;
      ctx.fillStyle = full ? segCol : 'rgba(255,255,255,.08)'; ctx.globalAlpha = full ? blink : 1;
      ctx.beginPath(); ctx.moveTo(x + 4, 24); ctx.lineTo(x + sw - 1, 24); ctx.lineTo(x + sw - 5, 44); ctx.lineTo(x, 44); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore(); }
  // 일시정지 버튼
  ctx.fillStyle = 'rgba(90,210,255,.1)'; chamfer(200, 14, 36, 34, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(120,220,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#bfefff'; ctx.fillRect(211, 22, 5, 18); ctx.fillRect(220, 22, 5, 18);
  BUTTONS.push({ x: 196, y: 8, w: 44, h: 46, act: 'pause' });

  ctx.textAlign = 'center';
  ctx.font = FT(15, 900);
  glitchText(S.daily ? 'DAILY' : st.endless ? 'ENDLESS' : `STAGE ${st.n}`, 330, 22, st.sector.color, 3, S.glitch * 6);
  ctx.font = FK(13); ctx.fillStyle = 'rgba(210,225,255,.8)';
  ctx.fillText(st.endless ? `SCORE ${S.score}` : st.sector.name, 330, 42);

  ctx.textAlign = 'right';
  ctx.font = FU(9); ctx.fillStyle = 'rgba(140,220,255,.7)';
  ctx.fillText('WAVE', W - 14, 14);
  if (st.endless) { ctx.font = FT(18, 900); ctx.fillStyle = '#ffd966'; ctx.fillText(String(S.wave), W - 14, 36); }
  else for (let k = 0; k < st.waves; k++) {
    const x = W - 20 - (st.waves - 1 - k) * 22, y = 33;
    const done = k + 1 < S.wave, cur = k + 1 === S.wave, boss = st.boss && k + 1 === st.waves;
    ctx.fillStyle = cur ? (boss ? '#ff4a5a' : '#ffd966') : done ? 'rgba(255,217,102,.45)' : boss ? 'rgba(255,74,90,.3)' : 'rgba(255,255,255,.12)';
    hexPath(x, y, 8); ctx.fill();
    if (cur) drawGlow(boss ? '#ff4a5a' : '#ffd966', x, y, 15, 0.4 + 0.2 * Math.sin(S.time * 5));
  }

  if (S.boss && !S.boss.dead) {
    const b = S.boss, bw = W - 60, r = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(20,0,6,.85)'; chamfer(28, 68, bw + 4, 18, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,90,90,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    const bg = ctx.createLinearGradient(30, 0, 30 + bw, 0);
    bg.addColorStop(0, '#ff2a4a'); bg.addColorStop(1, '#ff8a3a');
    ctx.fillStyle = bg; ctx.fillRect(30, 70, bw * r, 14);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let x = 30; x < 30 + bw; x += 8) ctx.fillRect(x, 70, 1, 14);
    if (b.maxShield) {
      const sr = Math.max(0, b.shield / b.maxShield);
      ctx.fillStyle = '#6ad0ff'; ctx.fillRect(30, 88, bw * sr, 4);
      if (sr > 0) drawGlow('#6ad0ff', 30 + bw * sr, 90, 10, 0.6);
    }
    ctx.font = FK(15); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    outlineText(ENEMY[b.k].name + (b.maxShield && b.shield <= 0 ? ', 보호막 해제!' : ''), 34, 104, '#ffd0d4', 3);
    ctx.textAlign = 'right'; ctx.font = FT(12);
    outlineText(Math.ceil(r * 100) + '%', W - 32, 104, '#ffd0d4', 3);
  }

  S.corePulse = Math.max(0, S.corePulse - 1 / 60);
  { const py = LINE_Y - 30, pw = fleetPower(), px = 164;   // 함선 배치 칸 바로 위: 기체를 만지는 자리에서 변화가 보이게
    if (S.powerShown == null) S.powerShown = pw;
    if (S.powerLast != null && Math.abs(pw - S.powerLast) >= 1 && S.mode !== 'win' && S.mode !== 'lose') (S.powerDeltas = S.powerDeltas || []).push({ v: pw - S.powerLast, t: S.time });
    S.powerLast = pw;
    S.powerShown += (pw - S.powerShown) * 0.12;
    ctx.fillStyle = 'rgba(4,12,34,.85)'; chamfer(px, py - 16, 116, 32, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,70,.55)'; ctx.lineWidth = 1; ctx.stroke();
    drawPowerIcon(px + 13, py, 8);
    ctx.font = FU(9); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,200,120,.8)'; ctx.fillText('전투력', px + 24, py - 8);
    ctx.font = FT(13, 900); outlineText(fmt(S.powerShown), px + 24, py + 6, '#ffe2a8', 3);
    if (S.mode === 'play' || S.mode === 'break') {   // 오른쪽: 소환 버튼
      { // 소환 왼쪽: 정비소 버튼 겸 지금 가진 부품
        const gx = SHOP_BX, gp = S.gearPulse || 0, canUp = S.gear >= Math.min(cellNewCost(), openRows() < ROWS ? ROW_ADD[openRows() - START_ROWS] : 99);
        if (gp > 0 || (canUp && !drag)) drawGlow('#ffb347', gx + 53, py, 56, gp * 0.8 + (canUp ? 0.15 + 0.1 * Math.sin(S.time * 5) : 0), 0.5);
        ctx.fillStyle = 'rgba(40,24,10,.92)'; chamfer(gx, py - 16, 106, 32, 7); ctx.fill();
        ctx.strokeStyle = canUp ? '#ffb347' : 'rgba(255,180,70,.6)'; ctx.lineWidth = canUp ? 1.8 : 1.2; ctx.stroke();
        drawGearIcon(gx + 15, py, 7);
        ctx.font = FK(13); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd6a0'; ctx.fillText('정비소', gx + 27, py + 1);
        ctx.font = FT(15, 900); ctx.textAlign = 'right'; outlineText(String(S.gear), gx + 99, py + 1, '#fff', 3);
        BUTTONS.push({ x: gx, y: py - 16, w: 106, h: 32, act: 'openshop' });
      }
      const cost = summonCost(), ok = S.gear >= cost, bx = W - 142, by = py - 16, bw = 130, bh = 32, slv = summonLv(), up = Math.max(0, 1 - (S.time - (S.summonUpT ?? -9)) / 1.2);
      if (ok || up) drawGlow('#ffb347', bx + bw / 2, py, 60, 0.18 + 0.1 * Math.sin(S.time * 5) + up * 0.6, 0.5);
      ctx.fillStyle = ok ? 'rgba(60,34,8,.92)' : 'rgba(4,12,34,.85)'; chamfer(bx, by, bw, bh, 7); ctx.fill();
      ctx.strokeStyle = ok ? '#ffb347' : 'rgba(255,180,70,.35)'; ctx.lineWidth = ok ? 1.8 : 1; ctx.stroke();
      ctx.font = FK(16); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; outlineText('소환', bx + 10, py + 1, ok ? '#fff' : 'rgba(255,255,255,.55)', 3);
      ctx.font = FU(14, 700); outlineText(`Lv${slv}`, bx + 46, py + 1, slv > 1 ? '#ffd24a' : ok ? '#e6f0ff' : 'rgba(230,240,255,.5)', 3);   // 다음에 나올 레벨
      drawGearIcon(bx + 88, py, 6);
      ctx.font = FU(15, 700); outlineText(String(cost), bx + 100, py + 1, ok ? '#ffd6a0' : 'rgba(255,214,160,.5)', 3);
      BUTTONS.push({ x: bx, y: by, w: bw, h: bh, act: 'summon' });
    }
    S.powerDeltas = (S.powerDeltas || []).filter(d => S.time - d.t < 1.2);
    for (const d of S.powerDeltas) { const q = (S.time - d.t) / 1.2; ctx.globalAlpha = 1 - q; ctx.font = FT(13, 900); outlineText(`${d.v > 0 ? '+' : ''}${fmt(d.v)}`, px + 58, py - 24 - q * 20, d.v > 0 ? '#5affc8' : '#ff6a7a', 3); ctx.globalAlpha = 1; }
  }
  // 콤보
  if ((S.combo || 0) >= 3 && S.time - S.comboT < 1.3) {
    S.comboPop = Math.max(0, (S.comboPop || 0) - 1 / 60);
    const a = Math.min(1, (1.3 - (S.time - S.comboT)) * 3), sc = 1 + S.comboPop * 2;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W - 70, 300); ctx.scale(sc, sc); ctx.textAlign = 'center';
    ctx.font = FU(11); ctx.fillStyle = '#ffb347'; ctx.fillText('COMBO', 0, -16);
    ctx.font = FT(28, 900); glitchText('×' + S.combo, 0, 8, S.combo >= 20 ? '#ff5a8a' : S.combo >= 10 ? '#ffd24a' : '#fff', 5, S.comboPop * 20);
    ctx.restore();
  }
  { const cy = S.boss ? 124 : 76, sc = 1 + S.corePulse;
    ctx.fillStyle = 'rgba(4,12,34,.75)'; chamfer(W - 96, cy - 13, 84, 26, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,232,255,.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(W - 54, cy); ctx.scale(sc, sc); coreLabel(0, 0, S.cores, 13, 'center'); ctx.restore(); }
  if (S.mut && S.mut.length) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = FK(12);
    const my = (S.boss ? 124 : 76) + 26, cnt = {};
    for (const id of S.mut) cnt[id] = (cnt[id] || 0) + 1;
    Object.keys(cnt).forEach((id, k) => outlineText(`변이: ${MUTATORS.find(m => m.id === id).name}${cnt[id] > 1 ? ' ×' + cnt[id] : ''}`, W - 14, my + k * 17, '#ff9ad8', 3));
  }
  if (S.crisis && S.mode === 'play') {
    const bl = 0.5 + 0.5 * Math.abs(Math.sin(S.time * 3));
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
    vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,20,40,${0.28 * bl})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  drawCmd();
  drawBanner();
  drawWarning();
  drawBossCine();
  drawBossDown();
  drawSkillPop();
  drawTut();

  if (S.mode === 'break') {
    ctx.font = FK(19); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlineText(`다음 웨이브까지 ${Math.ceil(S.breakT)}초, 지금 합치고 자리를 정리하세요`, W / 2, 480, '#cfe8ff');
  }
  for (const tx of S.texts) {
    const p = tx.t / tx.life;
    const sc = tx.t < 0.15 ? 1 + (0.15 - tx.t) * (tx.num ? 7 : 4) : 1;
    ctx.save();
    ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
    ctx.translate(tx.x, tx.y - p * (tx.num ? 26 : 40)); ctx.scale(sc, sc);
    ctx.font = tx.num ? FT(tx.size, 900) : FK(tx.size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlineText(tx.text, 0, 0, tx.color, tx.num ? 3 : 5);
    ctx.restore();
  }
  if (S.hint) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, S.hintT * 2);
    const hy = S.boss && !S.boss.dead ? 132 : S.tut || (S.cmdTut && S.cmdTut.on) ? 128 : 92;
    let fs = 17; ctx.font = FK(fs); while (fs > 12 && ctx.measureText(S.hint).width > W - 150) ctx.font = FK(--fs);
    const tw = Math.min(W - 110, ctx.measureText(S.hint).width + 34);
    ctx.fillStyle = 'rgba(4,12,34,.82)'; chamfer(W / 2 - tw / 2, hy - 16, tw, 32, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(90,210,255,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText(S.hint, W / 2, hy + 1, '#e6f2ff', 3);
    ctx.restore();
  }
  if (S.mode === 'win' || S.mode === 'lose') drawEnd();
}

function drawBanner() {
  const b = S.banner;
  if (!b) return;
  const ease = v => 1 - Math.pow(1 - v, 3);
  const inP = Math.min(1, b.t / 0.3), outP = Math.max(0, (b.t - (b.life - 0.3)) / 0.3);
  const off = (1 - ease(inP)) * -W + ease(outP) * W;
  const amt = (1 - inP) * 10 + outP * 10 + (Math.random() < 0.05 ? 5 : 0);
  const y = 400;
  ctx.save(); ctx.translate(off, 0);
  const gr = ctx.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, 'rgba(3,8,24,0)'); gr.addColorStop(.2, 'rgba(3,8,24,.9)');
  gr.addColorStop(.8, 'rgba(3,8,24,.9)'); gr.addColorStop(1, 'rgba(3,8,24,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, y - 52, W, 104);
  ctx.fillStyle = b.color; ctx.globalAlpha = .85;
  ctx.fillRect(50, y - 52, W - 100, 2); ctx.fillRect(50, y + 50, W - 100, 2);
  ctx.fillRect(50, y - 52, 30, 5); ctx.fillRect(W - 80, y + 47, 30, 5);
  ctx.globalAlpha = 1;
  drawGlow(b.color, W / 2, y - 10, 150, 0.22, 0.35);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(44, 900); glitchText(b.text, W / 2, y - 10, b.color, 7, amt);
  ctx.font = FK(19); outlineText(b.sub, W / 2, y + 30, '#e6ecff', 4);
  ctx.restore();
}
// 보스 실루엣: 스프라이트 모양만 남긴 캔버스 (색별로 한 번 만든다)
const SIL = {};
function silhouette(img, col) {
  const key = img + col, im = IMG[img];
  if (SIL[key] || !im || !im.width) return SIL[key];
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return SIL[key] = c;
}
function drawBossCine() {
  const c = S.bossCine;
  if (!c) return;
  const t = c.t, d = ENEMY[c.k], inA = Math.min(1, t * 5), outA = t > 1.9 ? Math.max(0, 1 - (t - 1.9) / 0.5) : 1, a = inA * outA;
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,4,${0.62 * a})`; ctx.fillRect(0, 0, W, H);
  const y = 330, slide = Math.pow(1 - Math.min(1, t / 0.5), 3);
  // 가로 띠
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(60,0,10,.75)'; ctx.fillRect(0, y - 150, W, 300);
  ctx.fillStyle = '#ff2a3a'; ctx.fillRect(0, y - 150, W, 3); ctx.fillRect(0, y + 147, W, 3);
  // 실루엣이 오른쪽에서 밀려 들어온다
  const im = IMG[d.img], asp = im && im.width ? im.height / im.width : 0.9, sw = Math.min(280, 190 / asp), sh = sw * asp, sx = W / 2 + slide * 360;
  const red = silhouette(d.img, '#ff2a3a'), blk = silhouette(d.img, '#06070e');
  drawGlow('#ff2a3a', sx, y - 20, 150, 0.22 * a);
  if (red) { ctx.globalAlpha = a * (0.55 + 0.25 * Math.sin(t * 20)); ctx.drawImage(red, sx - sw * 0.52, y - 20 - sh * 0.52, sw * 1.04, sh * 1.04); }
  if (blk) { ctx.globalAlpha = a; ctx.drawImage(blk, sx - sw / 2, y - 20 - sh / 2, sw, sh); }
  ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FU(16); glitchText('// HOSTILE CLASS: BOSS', W / 2 - slide * 200, y - 128, '#ff8a8a', 3, t < 0.4 ? 4 : 0);
  ctx.font = FK(46); glitchText(d.name, W / 2 - slide * 300, y + 112, '#fff', 7, t < 0.35 ? 6 : Math.random() < 0.04 ? 3 : 0);
  ctx.restore();
}
function drawBossDown() {
  const b = S.bossDown;
  if (!b) return;
  const t = b.t, a = Math.min(1, t * 4) * (t > 1.7 ? Math.max(0, 1 - (t - 1.7) / 0.5) : 1), sc = 1 + 0.4 * Math.pow(1 - Math.min(1, t / 0.3), 2);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(W / 2, 300); ctx.scale(sc, sc);
  ctx.font = FT(38, 900); glitchText('TARGET DOWN', 0, 0, '#ffd966', 7, t < 0.3 ? 5 : 0);
  ctx.font = FK(24); outlineText('보스 격추', 0, 44, '#fff', 5);
  ctx.restore();
}
function drawCmd() {
  if (S.cmdGuardT > 0) {   // 비상 방어막: 방어선 위 초록 막
    const a = Math.min(1, S.cmdGuardT) * (0.6 + 0.25 * Math.sin(S.time * 8));
    const gg = ctx.createLinearGradient(0, LINE_Y - 70, 0, LINE_Y); gg.addColorStop(0, 'rgba(90,255,200,0)'); gg.addColorStop(1, `rgba(90,255,200,${0.35 * a})`);
    ctx.fillStyle = gg; ctx.fillRect(0, LINE_Y - 70, W, 70);
    ctx.fillStyle = `rgba(160,255,225,${a})`; ctx.fillRect(0, LINE_Y - 2, W, 3);
  }
  if (S.iceT > 0) { ctx.fillStyle = `rgba(160,230,255,${0.3 * S.iceT})`; ctx.fillRect(0, 0, W, LINE_Y); }
  if (!cmdOpen() || !['play', 'break'].includes(S.mode)) return;
  const g = S.cmd || 0, x = 34, gy = 216, gh = 206;
  ctx.fillStyle = 'rgba(4,10,26,.75)'; ctx.fillRect(4, gy, 7, gh);
  ctx.fillStyle = g >= 40 ? '#ffd24a' : 'rgba(255,210,74,.55)'; ctx.fillRect(4, gy + gh * (1 - g / 100), 7, gh * g / 100);
  for (const c of CMD) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(2, gy + gh * (1 - c.cost / 100), 11, 1.5); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FU(10); ctx.fillStyle = 'rgba(255,220,140,.85)'; ctx.fillText('CMD', 20, gy - 12);
  CMD.forEach((c, i) => {
    const y = gy + 30 + i * 72, ready = g >= c.cost && S.mode === 'play', on = UI.aim === c.k;
    if (ready) drawGlow(c.col, x + 6, y, 34, 0.35 + 0.15 * Math.sin(S.time * 5));
    ctx.fillStyle = on ? 'rgba(80,20,10,.95)' : 'rgba(6,14,34,.88)'; ctx.beginPath(); ctx.arc(x + 6, y, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ready ? c.col : 'rgba(150,170,200,.35)'; ctx.lineWidth = on ? 3.5 : 2; ctx.stroke();
    ctx.save(); ctx.translate(x + 6, y); ctx.strokeStyle = ctx.fillStyle = ready ? c.col : 'rgba(150,170,200,.45)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (c.k === 'orbit') { ctx.arc(0, 0, 9, 0, Math.PI * 2); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { ctx.moveTo(dx * 6, dy * 6); ctx.lineTo(dx * 14, dy * 14); } }
    else if (c.k === 'guard') { ctx.moveTo(0, -12); ctx.lineTo(10, -7); ctx.lineTo(9, 3); ctx.lineTo(0, 12); ctx.lineTo(-9, 3); ctx.lineTo(-10, -7); ctx.closePath(); }
    else for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3; ctx.moveTo(Math.cos(an) * 12, Math.sin(an) * 12); ctx.lineTo(-Math.cos(an) * 12, -Math.sin(an) * 12); }
    ctx.stroke(); ctx.restore();
    if (c.k === 'guard' && S.cmdGuardT > 0) { ctx.strokeStyle = c.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 6, y, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.cmdGuardT / 10); ctx.stroke(); }
    ctx.font = FT(10, 900); ctx.fillStyle = ready ? '#fff' : 'rgba(170,190,220,.6)'; ctx.fillText(String(c.cost), x + 6, y + 33);
    BUTTONS.push({ x: x - 22, y: y - 28, w: 56, h: 56, act: 'cmd', k: c.k });
  });
  const C = S.cmdTut;
  if (C && C.on && !C.done) {
    tutLabel(UI.aim ? '적이 모인 곳 누르기' : '궤도 포격 써 보기');
    if (!UI.aim) tapDemo(x + 6, gy + 30);
    else { let best = null, bn = -1; for (const e of S.enemies) if (shootable(e) && e.y < LINE_Y - 60) { const n = S.enemies.filter(o => shootable(o) && Math.hypot(o.x - e.x, o.y - e.y) < 130).length; if (n > bn) { bn = n; best = e; } } if (best) tapDemo(best.x, best.y); }
  }
  if (UI.aim) {
    ctx.fillStyle = 'rgba(255,90,40,.08)'; ctx.fillRect(0, 60, W, LINE_Y - 60);
    if (!(C && C.on && !C.done)) { ctx.font = FK(20); outlineText('포격할 곳을 누르세요', W / 2 + 20, 140, '#ffd0a0', 5); }
    const p = UI.hoverP;
    if (p && p.y < LINE_Y) { ctx.strokeStyle = 'rgba(255,120,60,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 130, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x - 20, p.y); ctx.lineTo(p.x + 20, p.y); ctx.moveTo(p.x, p.y - 20); ctx.lineTo(p.x, p.y + 20); ctx.stroke(); }
  }
}
function drawWarning() {
  if (S.warning <= 0) return;
  const t = S.time, fade = Math.min(1, S.warning), blink = 0.55 + 0.45 * Math.abs(Math.sin(t * 5));
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,20,40,${0.4 * fade * blink})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const y = 400;
  ctx.save(); ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(40,0,8,.85)'; ctx.fillRect(0, y - 48, W, 96);
  for (const by of [y - 48, y + 36]) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, by, W, 12); ctx.clip();
    ctx.fillStyle = '#ff2a3a';
    const o = (t * 60) % 24;
    for (let x = -24 + o; x < W + 24; x += 24) { ctx.beginPath(); ctx.moveTo(x, by + 12); ctx.lineTo(x + 12, by); ctx.lineTo(x + 20, by); ctx.lineTo(x + 8, by + 12); ctx.fill(); }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = fade * blink;
  ctx.font = FT(40, 900); glitchText('WARNING', W / 2, y - 10, '#ff4a5a', 6, 3 + Math.random() * 3);
  ctx.globalAlpha = fade;
  ctx.font = FK(17); outlineText(S.warnText || `${ENEMY[S.stage.sector.boss].name}이 접근하고 있어요`, W / 2, y + 23, '#ffd0d4', 4);
  ctx.restore();
}
function drawSkillPop() {
  const k = S.skillPop;
  if (!k) return;
  const p = k.t / k.life;
  const sc = k.t < 0.18 ? 0.6 + k.t / 0.18 * 0.6 : 1.2 - Math.min(0.2, (k.t - 0.18) * 0.8);
  const a = p > 0.75 ? (1 - p) / 0.25 : 1;
  const y = 520;
  ctx.save(); ctx.globalAlpha = a;
  drawGlow(k.color, W / 2, y, 200, 0.35, 0.35);
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(k.t * 0.8); ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 12; q++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = k.color; ctx.globalAlpha = a * 0.1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(220, -10); ctx.lineTo(220, 10); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(3,8,24,.8)'; chamfer(W / 2 - 170, y - 50, 340, 96, 14); ctx.fill();
  ctx.strokeStyle = k.color; ctx.lineWidth = 2; ctx.stroke();
  ctx.translate(W / 2, y); ctx.scale(sc, sc);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FU(12); ctx.fillStyle = 'rgba(200,240,255,.9)';
  ctx.fillText(`UPGRADE COMPLETE // ${k.unit} LV.${k.lv}`, 0, -28);
  ctx.font = FK(34); glitchText(k.name + '!', 0, 4, k.color, 7, k.t < 0.3 ? (0.3 - k.t) * 30 : 0);
  ctx.font = FT(13, 900); ctx.fillStyle = '#5affc8'; ctx.fillText('▲ ' + k.cmp, 0, 32);
  lvBadge(k.lv, -138, 4, k.color, 1.3);   // 새 계급장
  ctx.restore();
}

function button(x, y, w, h, label, act, style = 'primary', extra) {
  const by = y + (style === 'primary' ? Math.sin(performance.now() / 250) * 2 : 0);
  if (style === 'primary') {
    const g = ctx.createLinearGradient(0, by, 0, by + h);
    g.addColorStop(0, '#7ff0ff'); g.addColorStop(1, '#2a9fd8');
    ctx.fillStyle = g; chamfer(x, by, w, h, Math.min(12, h / 3)); ctx.fill();
    drawGlow('#48c8ff', x + w / 2, by + h / 2, w * 0.6, 0.25, 0.4);
  } else if (style === 'danger') {
    ctx.fillStyle = 'rgba(255,60,90,.18)'; chamfer(x, by, w, h, Math.min(10, h / 3)); ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,130,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (style === 'gold') {
    const g = ctx.createLinearGradient(0, by, 0, by + h);
    g.addColorStop(0, '#ffe07a'); g.addColorStop(1, '#e09a20');
    ctx.fillStyle = g; chamfer(x, by, w, h, Math.min(10, h / 3)); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(90,210,255,.08)'; chamfer(x, by, w, h, Math.min(10, h / 3)); ctx.fill();
    ctx.strokeStyle = 'rgba(120,220,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.font = FK(Math.min(22, Math.round(h * 0.45))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = style === 'primary' ? '#031a2a' : style === 'gold' ? '#2a1600' : style === 'danger' ? '#ffd0d8' : '#dff4ff';
  if (label.startsWith('◆')) {
    const rest = label.slice(1).trim(), tw = ctx.measureText(rest).width, r = h * 0.2;
    drawCore(x + w / 2 - tw / 2 - r - 2, by + h / 2, r);
    ctx.fillText(rest, x + w / 2 + r + 2, by + h / 2 + 1);
  } else ctx.fillText(label, x + w / 2, by + h / 2 + 1);
  BUTTONS.push({ x, y, w, h, act, ...(extra || {}) });
}
function panel(x, y, w, h, col) {
  const pg = ctx.createLinearGradient(0, y, 0, y + h);
  pg.addColorStop(0, 'rgba(8,24,60,.97)'); pg.addColorStop(1, 'rgba(4,10,30,.97)');
  ctx.fillStyle = pg; chamfer(x, y, w, h, 18); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  brackets(x + 8, y + 8, w - 16, h - 16, 16, col, 1.5);
}

// 획득 코어: 1초 동안 카운트업, 아래에 보상과 전투 수집을 나눠 보여준다
function drawEarned(rx, y) {
  const q = Math.min(1, Math.max(0, performance.now() / 1000 - (S.endT || 0) - (S.introDur || 0)) / 1.1), v = Math.round(S.earned * (1 - Math.pow(1 - q, 3)));
  if (q < 1) drawGlow('#5ae8ff', rx - 30, y, 40, 0.4);
  coreLabel(rx, y, '+' + fmt(v), 17, 'right', '#bff6ff');
  ctx.font = FK(12); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(170,220,255,.75)';
  ctx.fillText(`보상 ${fmt(S.baseEarned)} + 전투 수집 ${fmt(S.cores)}`, rx, y + 18);
}
function drawEndlessEnd() {
  const col = '#ffd24a';
  ctx.fillStyle = 'rgba(2,3,12,.8)'; ctx.fillRect(0, 0, W, H);
  drawGlow(col, W / 2, 300, 220, 0.14);
  const dmg = S.dmgBy || {}, tot = Object.values(dmg).reduce((a, b) => a + b, 0) || 1;
  const types = [...new Set(Object.keys(dmg).concat(Object.keys(S.used || {})))].filter(t => UNIT[t]).sort((a, b) => (dmg[b] || 0) - (dmg[a] || 0)).slice(0, 5);
  const ph = 336 + Math.max(1, types.length) * 46 + 4 + (LB_URL ? 76 : 0) + 124, top = Math.max(40, (H - ph) / 2 - 20);
  panel(40, top, W - 80, ph, col);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FU(13); ctx.fillStyle = col; ctx.fillText(S.daily ? `// DAILY CHALLENGE / ${S.daily.day}` : '// ENDLESS DEFENSE / LINE BROKEN', W / 2, top + 30);
  ctx.font = FK(32); glitchText('방어선 붕괴', W / 2, top + 70, '#fff', 6, S.glitch * 8);
  ctx.font = FT(42, 900); glitchText(String(S.score), W / 2, top + 122, '#ffd24a', 6, S.rank === 1 ? 2 : 0);
  ctx.font = FU(12); ctx.fillStyle = 'rgba(255,230,160,.8)'; ctx.fillText('SCORE', W / 2, top + 152);
  if (S.rank === 1) { ctx.font = FK(18); glitchText(S.daily ? '오늘 최고 기록!' : '최고 기록 갱신!', W / 2, top + 174, '#5affc8', 4, 2); }
  ctx.font = FK(17);
  [['도달 웨이브', `${S.wave}`], S.daily ? ['오늘 내 최고', `${fmt(PROG.dailyBest.score)}점`] : ['내 기록 순위', S.rank ? `${S.rank}위` : '순위 밖'], ['획득 코어', '']].forEach(([k, v], i) => {
    const y = top + 204 + i * 28;
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(180,215,255,.75)'; ctx.fillText(k, 76, y);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; if (v) ctx.fillText(v, W - 76, y);
  });
  drawEarned(W - 76, top + 260);
  // 전투 분석: 기체 종류별로 넣은 피해와 1코(Lv1) 기준 투입량
  ctx.textAlign = 'left'; ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.85)'; ctx.fillText('// 전투 분석: 기체별 피해 비중과 투입량 (1코 = Lv1 한 대)', 62, top + 304);
  types.forEach((t2, i) => {
    const def = UNIT[t2], y = top + 336 + i * 46, d = dmg[t2] || 0, pct = Math.round(d / tot * 100);
    ctx.fillStyle = 'rgba(12,24,52,.9)'; chamfer(56, y - 20, W - 112, 40, 8); ctx.fill(); unitTint(56, y - 20, 48, 40, def.col, 8);
    drawUnitArt(t2, 1, 80, y, Math.min(30 / def.iw, 28 / def.ih), 1, null);
    ctx.textAlign = 'left'; ctx.font = FK(15); ctx.fillStyle = '#fff'; ctx.fillText(def.name, 104, y - 8);
    ctx.font = FK(12); ctx.fillStyle = 'rgba(190,215,245,.8)'; ctx.fillText(`1코 ${fmt(S.used && S.used[t2] || 0)}기 투입`, 104, y + 10);
    const bx = 250, bw = 150;
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(bx, y - 5, bw, 10);
    ctx.fillStyle = def.col; ctx.fillRect(bx, y - 5, bw * d / tot, 10);
    ctx.textAlign = 'right'; ctx.font = FT(14, 900); ctx.fillStyle = '#fff'; ctx.fillText(`${pct}%`, W - 66, y - 6);
    ctx.font = FU(10); ctx.fillStyle = 'rgba(190,215,245,.75)'; ctx.fillText(fmt(Math.round(d)), W - 66, y + 10);
  });
  let y2 = top + 336 + Math.max(1, types.length) * 46 + 4;
  if (LB_URL) {   // 온라인 순위에 올리기
    if (!S.lbSent) nickInput(64, y2, 250, 42);
    else { ctx.font = FK(18); ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(PROG.nick || '', 76, y2 + 21); }
    button(322, y2, 154, 42, S.lbSent ? '올렸어요' : S.lbSending ? '올리는 중' : '순위 올리기', 'lbSubmit', S.lbSent ? 'ghost' : 'gold');
    if (UI.lbMsg) { ctx.font = FK(15); ctx.textAlign = 'center'; ctx.fillStyle = S.lbSent ? '#5affc8' : '#ffd6a0'; ctx.fillText(UI.lbMsg, W / 2, y2 + 58); }
    y2 += 76;
  }
  button(W / 2 - 110, y2, 220, 48, '다시 도전', S.daily ? 'daily' : 'endless', 'primary');
  button(W / 2 - 110, y2 + 58, 105, 36, '기록 보기', 'records', 'ghost', S.daily ? { tab: 'daily' } : undefined);
  button(W / 2 + 5, y2 + 58, 105, 36, '지도로', 'map', 'ghost');
}
// 결과창 전에 뜨는 짧은 클리어/실패 연출
function drawEndIntro(win, e) {
  const col = win ? '#5affc8' : '#ff5a6a', a = Math.min(1, e * 4), out = e > 1.15 ? (1.4 - e) / 0.25 : 1;
  ctx.fillStyle = `rgba(2,3,12,${0.6 * a})`; ctx.fillRect(0, 0, W, H);
  if (e < 0.25) { ctx.fillStyle = `rgba(255,255,255,${(0.25 - e) * 2.4})`; ctx.fillRect(0, 0, W, H); }
  ctx.save(); ctx.globalAlpha = Math.max(0, out);
  ctx.translate(W / 2, 420); ctx.rotate(e * 0.6); ctx.globalCompositeOperation = 'lighter';
  for (let q = 0; q < 14; q++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = col; ctx.globalAlpha = 0.1 * Math.max(0, out); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(420, -16); ctx.lineTo(420, 16); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = Math.max(0, out);
  const sc = e < 0.2 ? 1.8 - e * 4 : 1;
  ctx.translate(W / 2, 400); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(3,8,24,.85)'; ctx.fillRect(-W, -58, W * 2, 116);
  ctx.fillStyle = col; ctx.fillRect(-W, -58, W * 2, 3); ctx.fillRect(-W, 55, W * 2, 3);
  ctx.font = FT(46, 900); glitchText(win ? 'STAGE CLEAR' : 'MISSION FAILED', 0, -12, col, 7, e < 0.4 ? (0.4 - e) * 25 : Math.random() < 0.05 ? 4 : 0);
  ctx.font = FK(22); outlineText(win ? `스테이지 ${S.stage.n} 방어 성공!` : '방어선이 무너졌어요', 0, 32, '#fff', 5);
  ctx.restore();
}
function drawEnd() {
  if (S.stage.endless) return drawEndlessEnd();
  const ie = performance.now() / 1000 - (S.endT || 0);
  if (ie < (S.introDur || 0)) return drawEndIntro(S.mode === 'win', ie);
  // 새 기체 소개가 떠 있는 동안은 결과 창을 미룬다. 닫으면 그때 결과가 올라온다
  if (S.mode === 'win' && (UI.pendingReveal || UI.reveal)) return drawEndIntro(true, Math.min(ie, 0.9));
  const win = S.mode === 'win', col = win ? '#5affc8' : '#ff5a6a', st = S.stage;
  ctx.fillStyle = 'rgba(2,3,12,.75)'; ctx.fillRect(0, 0, W, H);
  drawGlow(col, W / 2, 420, 220, 0.18);
  panel(50, 250, W - 100, 420, col);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FU(13); ctx.fillStyle = col;
  ctx.fillText(`// STAGE ${st.n} / ${win ? 'MISSION COMPLETE' : 'MISSION FAILED'}`, W / 2, 286);
  ctx.font = FK(40);
  const allClear = win && st.n === STAGE_COUNT;
  glitchText(allClear ? '모든 구역 방어 완료!' : win ? '방어 성공!' : '기지 함락', W / 2, 332, '#fff', 6, S.glitch * 8);
  if (win) for (let k = 0; k < 3; k++) {
    const on = k < S.stars, x = W / 2 + (k - 1) * 58, y = 392 - (k === 1 ? 8 : 0);
    if (on) drawGlow('#ffd24a', x, y, 36, 0.5);
    drawStar(x, y, 22, on ? '#ffd24a' : 'rgba(255,255,255,.12)');
  }
  const best = allUnits().reduce((m, u) => Math.max(m, u.lv), 0);
  ctx.font = FK(18);
  const rows = win ? [['남은 보호막', `${S.hp} / ${S.maxHp}`], ['잃은 기체', `${S.lost}기`], ['획득 코어', '']]
                   : [['버틴 웨이브', `${S.wave} / ${st.waves}`], ['잃은 기체', `${S.lost}기`], ['최고 기체 레벨', `Lv${best}`]];
  rows.forEach(([k, v], i) => {
    const y = 440 + i * 30;
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(180,215,255,.75)'; ctx.fillText(k, 90, y);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; if (v) ctx.fillText(v, W - 90, y);
  });
  if (win) drawEarned(W - 90, 500);
  const primary = win ? (st.n < STAGE_COUNT ? ['다음 스테이지', 'next'] : ['지도로', 'map']) : ['다시 하기', 'retry'];
  button(W / 2 - 110, 540, 220, 50, primary[0], primary[1], 'primary');
  if (primary[1] !== 'map') button(W / 2 - 110, 604, 105, 38, '지도로', 'map', 'ghost');
  button(primary[1] !== 'map' ? W / 2 + 5 : W / 2 - 110, 604, primary[1] !== 'map' ? 105 : 220, 38, '격납고', 'hangar', 'ghost');
}

// ── 지도 ──────────────────────────────────────────────────
const MAP_BAND = Math.floor((838 - 108) / SECTORS.length);   // 여섯 구역이 한 화면에
function mapNodePos(n) {
  const s = Math.floor((n - 1) / 5), i = (n - 1) % 5;
  const bandY = 108 + s * MAP_BAND;
  return { x: [78, 176, 274, 372, 468][i], y: bandY + 72 + (i === 4 ? -2 : i % 2 ? -6 : 6), r: i === 4 ? 25 : 19 };
}
function drawMap() {
  const t = performance.now() / 1000;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(30, 900);
  glitchText('SECTOR MAP', W / 2, 42, '#d8f6ff', 6, Math.random() < 0.04 ? 6 : 0);
  const total = Object.values(PROG.stars).reduce((a, b) => a + b, 0);
  drawStar(30, 84, 9, '#ffd24a');
  ctx.font = FT(14); ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9a8';
  ctx.fillText(`${total} / ${STAGE_COUNT * 3}`, 44, 85);
  coreLabel(W - 72, 85, UI.coreShown, 15, 'right');
  // 설정 버튼
  ctx.save(); ctx.translate(W - 36, 42); ctx.rotate(t * 0.5);
  ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = '#bfefff'; ctx.fillRect(-2.5, -15, 5, 6); }
  ctx.restore();
  BUTTONS.push({ x: W - 62, y: 16, w: 52, h: 52, act: 'settings' });

  SECTORS.forEach((sec, s) => {
    const y = 108 + s * MAP_BAND;
    const g = ctx.createLinearGradient(0, y, W, y + MAP_BAND - 6);
    g.addColorStop(0, sec.color + '26'); g.addColorStop(1, 'rgba(6,8,26,.45)');
    ctx.fillStyle = g; chamfer(16, y, W - 32, MAP_BAND - 6, 14); ctx.fill();
    ctx.strokeStyle = sec.color + '77'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 0.3; ctx.drawImage(PLANETS[s], W - 110, y + 4, 84, 84); ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = FU(10); ctx.fillStyle = sec.color;
    ctx.fillText(`// SECTOR ${String(s + 1).padStart(2, '0')}`, 30, y + 14);
    ctx.font = FK(18); outlineText(sec.name, 30, y + 32, '#fff', 4);
    ctx.font = FK(12); ctx.fillStyle = 'rgba(220,230,255,.8)';
    ctx.fillText(sec.info, 140, y + 32);
  });
  ctx.lineWidth = 2.5; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 20;
  for (let n = 1; n < STAGE_COUNT; n++) {
    const a = mapNodePos(n), b = mapNodePos(n + 1);
    ctx.strokeStyle = PROG.stars[n] ? 'rgba(90,255,200,.6)' : 'rgba(255,255,255,.15)';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  let next = 1;
  while (next < STAGE_COUNT && PROG.stars[next]) next++;
  for (let n = 1; n <= STAGE_COUNT; n++) {
    const p = mapNodePos(n), st = stageInfo(n), col = st.sector.color;
    const open = unlocked(n), stars = PROG.stars[n] || 0;
    if (n === next && open) {
      drawGlow(col, p.x, p.y, p.r * 2.4, 0.45 + 0.25 * Math.sin(t * 4));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t);
      brackets(-p.r - 8, -p.r - 8, p.r * 2 + 16, p.r * 2 + 16, 8, col, 2);
      ctx.restore();
    }
    ctx.fillStyle = open ? (stars ? col : 'rgba(8,14,36,.95)') : 'rgba(6,6,18,.9)';
    hexPath(p.x, p.y, p.r); ctx.fill();
    ctx.strokeStyle = open ? col : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2.5; ctx.stroke();
    if (st.boss) spr(ENEMY[st.sector.boss].img, p.x, p.y, p.r * 1.5, p.r * 1.4, 0, open ? 1 : 0.3);
    else {
      ctx.font = FT(15, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = open ? (stars ? '#04101e' : '#fff') : 'rgba(255,255,255,.25)';
      ctx.fillText(String(n), p.x, p.y + 1);
    }
    // 이 스테이지를 깨면 풀리는 기체
    const gift = UNIT_ORDER.find(k => UNIT[k].unlock.stage === n);
    if (gift && !isOwned(gift)) { ctx.font = FU(8); ctx.textAlign = 'center'; ctx.fillStyle = '#ffd24a'; ctx.fillText('NEW', p.x, p.y - p.r - 6); }
    if (!open) {
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(p.x + p.r * 0.35, p.y - p.r - 2, 12, 10);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x + p.r * 0.35 + 6, p.y - p.r - 2, 4, Math.PI, 0); ctx.stroke();
    }
    for (let k = 0; k < 3; k++) drawStar(p.x + (k - 1) * 12, p.y + p.r + 11, 5, k < stars ? '#ffd24a' : 'rgba(255,255,255,.14)');
    BUTTONS.push({ x: p.x - p.r - 8, y: p.y - p.r - 8, w: p.r * 2 + 16, h: p.r * 2 + 24, act: 'stage', n });
  }
  // 편성 요약 + 격납고
  const deckOk = PROG.deck.length >= 1;
  ctx.font = FU(10); ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(140,220,255,.7)'; ctx.fillText('// SQUADRON', 22, 858);
  PROG.deck.forEach((t2, k) => {
    const x = 42 + k * 50, y = 896;
    ctx.fillStyle = 'rgba(10,20,44,.8)'; chamfer(x - 22, y - 22, 44, 44, 7); ctx.fill(); unitTint(x - 22, y - 22, 44, 44, UNIT[t2].col, 7);
    ctx.strokeStyle = UNIT[t2].col; ctx.lineWidth = 1.2; ctx.stroke();
    const def = UNIT[t2], k2 = Math.min(34 / def.iw, 34 / def.ih);
    drawUnitArt(t2, 1, x, y, k2, 1, null);
  });
  button(296, 846, 226, 42, deckOk ? '격납고 (편성, 강화)' : '편성을 채워 주세요', 'hangar', deckOk ? 'ghost' : 'danger');
  if ((PROG.newUnits || []).length) { const pu = 0.7 + 0.3 * Math.sin(performance.now() / 150); drawGlow('#ff4a6e', 512, 850, 16, pu * 0.6); ctx.fillStyle = '#ff4a6e'; ctx.beginPath(); ctx.arc(512, 850, 7, 0, Math.PI * 2); ctx.fill(); ctx.font = FT(9, 900); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(PROG.newUnits.length), 512, 851); }
  button(296, 896, 226, 42, endlessOpen() ? '무한 방어선, 기록' : '무한 방어선 (5스테이지)', 'records', endlessOpen() ? 'gold' : 'ghost');
}

// ── 격납고 ────────────────────────────────────────────────
function drawHangar() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(28, 900); glitchText('HANGAR', W / 2, 40, '#d8f6ff', 6, Math.random() < 0.04 ? 5 : 0);
  ctx.font = FK(15); ctx.fillStyle = 'rgba(200,230,255,.8)'; ctx.fillText('격납고, 출격 편성', W / 2, 68);
  coreLabel(W - 20, 40, UI.coreShown, 15, 'right');
  // 편성 칸
  ctx.textAlign = 'left'; ctx.font = FU(10); ctx.fillStyle = 'rgba(140,220,255,.75)';
  ctx.fillText(`// SQUADRON ${PROG.deck.length}/${DECK_N} / 캡슐은 편성한 기체로만 나와요`, 20, 96);
  for (let k = 0; k < DECK_N; k++) {
    const x = 20 + k * 102, y = 108, t2 = PROG.deck[k];
    ctx.fillStyle = t2 ? 'rgba(10,26,56,.9)' : 'rgba(10,20,44,.4)'; chamfer(x, y, 94, 80, 10); ctx.fill();
    if (t2) unitTint(x, y, 94, 80, UNIT[t2].col, 10);
    ctx.strokeStyle = t2 ? UNIT[t2].col : 'rgba(120,220,255,.25)'; ctx.lineWidth = 1.5;
    if (!t2) ctx.setLineDash([4, 5]);
    ctx.stroke(); ctx.setLineDash([]);
    if (t2) {
      const def = UNIT[t2], k2 = Math.min(56 / def.iw, 48 / def.ih);
      drawUnitArt(t2, 1, x + 47, y + 34, k2, 1, null);
      ctx.font = FK(13); ctx.textAlign = 'center'; ctx.fillStyle = '#e6f4ff'; ctx.fillText(def.name, x + 47, y + 68);
      BUTTONS.push({ x, y, w: 94, h: 80, act: 'card', type: t2 });
    } else {
      ctx.font = FK(14); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(160,210,255,.5)'; ctx.fillText('빈 칸', x + 47, y + 40);
    }
  }
  // 기체 목록 4×5
  const cw = 120, ch = 118, gx = 16, gy = 204;
  UNIT_ORDER.forEach((t2, i) => {
    const x = gx + (i % 4) * (cw + 6), y = gy + Math.floor(i / 4) * (ch + 6), def = UNIT[t2];
    const own = isOwned(t2), inDeck = PROG.deck.includes(t2);
    ctx.fillStyle = own ? 'rgba(10,24,54,.88)' : 'rgba(8,10,24,.8)'; chamfer(x, y, cw, ch, 12); ctx.fill();
    unitTint(x, y, cw, ch, def.col, 12, own ? 0.8 : 0.3);
    ctx.strokeStyle = inDeck ? def.col : own ? def.col + '66' : 'rgba(255,255,255,.1)'; ctx.lineWidth = inDeck ? 2.5 : 1.2; ctx.stroke();
    if (inDeck) drawGlow(def.col, x + cw / 2, y + 56, 50, 0.18);
    const k2 = Math.min(76 / def.iw, 50 / def.ih);
    ctx.globalAlpha = own ? 1 : 0.35;
    drawUnitArt(t2, 1, x + cw / 2, y + 42, k2, own ? 1 : 0.35, null);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = FK(16); ctx.fillStyle = own ? '#fff' : 'rgba(255,255,255,.5)'; ctx.fillText(def.name, x + cw / 2, y + 80);
    ctx.font = FK(12); ctx.fillStyle = own ? 'rgba(235,245,255,.85)' : 'rgba(200,210,230,.45)'; ctx.fillText(def.role, x + cw / 2, y + 96);
    ctx.font = FU(10);
    if (inDeck) { ctx.fillStyle = '#fff'; ctx.fillText('● DEPLOYED', x + cw / 2, y + 110); }
    else if (!own) {
      const u = def.unlock;
      ctx.fillStyle = u.shop ? '#ffd24a' : 'rgba(255,190,120,.8)';
      if (u.shop) coreLabel(x + cw / 2, y + 110, u.shop, 11, 'center', '#ffd24a'); else ctx.fillText(`STAGE ${u.stage} 클리어`, x + cw / 2, y + 110);
    }
    if (!own) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + cw - 24, y + 12, 12, 10); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + cw - 18, y + 12, 4, Math.PI, 0); ctx.stroke(); }
    if (own && mkOf(t2)) { const mk = mkOf(t2); ctx.fillStyle = mk >= 10 ? '#ffd24a' : 'rgba(255,210,74,.2)'; hexPath(x + 20, y + 20, 13); ctx.fill(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = FT(11, 900); ctx.textAlign = 'center'; ctx.fillStyle = mk >= 10 ? '#2a1600' : '#ffe9a8'; ctx.fillText(String(mk), x + 20, y + 21); }
    if ((PROG.newUnits || []).includes(t2)) {
      const pu = 0.7 + 0.3 * Math.sin(performance.now() / 150);
      ctx.fillStyle = `rgba(255,70,110,${pu})`; chamfer(x + cw - 50, y + 6, 44, 18, 5); ctx.fill();
      ctx.font = FT(10, 900); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('NEW', x + cw - 28, y + 16);
      drawGlow('#ff4a6e', x + cw - 28, y + 15, 26, 0.3 * pu);
    }
    BUTTONS.push({ x, y, w: cw, h: ch, act: 'card', type: t2 });
  });
  ctx.font = FK(14); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,225,255,.7)';
  ctx.fillText('카드를 누르면 스킬과 성능을 볼 수 있어요', W / 2, 843);
  button(W / 2 - 110, 862, 220, 52, '지도로', 'map', PROG.deck.length >= 1 ? 'primary' : 'danger');
}

// 기체 소개 카드 (해금 팝업 겸용)
// 받침이 있으면 '과', 없으면 '와'
const josaWa = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '과' : '와'; };
function drawCard() {
  const c = UI.card, t2 = c.type, def = UNIT[t2], own = isOwned(t2), inDeck = PROG.deck.includes(t2), t = performance.now() / 1000;
  BUTTONS = [];
  ctx.fillStyle = 'rgba(2,3,12,.8)'; ctx.fillRect(0, 0, W, H);
  const x = 30, y = 10, w = W - 60, h = 930;
  const now = performance.now() / 1000, cdt = Math.min(0.05, now - (UI.lastT || now)); UI.lastT = now;
  drawGlow(def.col, W / 2, 200, 200, 0.2);
  panel(x, y, w, h, def.col);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (c.isNew) { ctx.font = FU(14); glitchText('// NEW UNIT UNLOCKED', W / 2, y + 30, '#ffd24a', 3, Math.random() < 0.1 ? 4 : 0.5); }
  else { ctx.font = FU(12); ctx.fillStyle = def.col; ctx.fillText(`// UNIT DATA / ${t2.toUpperCase()}`, W / 2, y + 30); }
  // 기체 그림: 레벨 1→8을 돌아가며 보여준다 (전투 중엔 그 기체의 레벨)
  const showLv = c.inGame ? c.u.lv : 1 + Math.floor(t / 1.2) % MAX_LV, sc = def.col;
  const k2 = Math.min(150 / def.iw, 130 / def.ih);
  drawGlow(sc, W / 2, y + 140, 90, 0.25);
  drawUnitArt(t2, showLv, W / 2, y + 140, k2, 1, null);
  lvBadge(showLv, W / 2 + 110, y + 70, sc, 1.4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FK(32); outlineText(def.name + (mkOf(t2) ? `  Mk.${mkOf(t2)}` : ''), W / 2, y + 232, mkOf(t2) ? '#ffe9a8' : '#fff', 5);
  ctx.font = FK(16); ctx.fillStyle = def.col; ctx.fillText(def.role + (def.shape === 1 ? ', 1칸' : ''), W / 2, y + 262);
  drawShapeIcon(t2, x + w - 52, y + 250, 11, def.col);
  ctx.font = FK(16); ctx.fillStyle = 'rgba(220,235,255,.9)';
  wrapLines(def.desc, w - 70).forEach((l, i) => ctx.fillText(l, W / 2, y + 290 + i * 22));
  // 성능: 지금 보이는 레벨 기준
  const atk = def.dmg ? Math.round(def.dmg * LV_MUL[showLv - 1] * mkMul(t2)) : 0;
  [['공격력', atk ? fmt(atk) : '없음'], ['공격 속도', def.dmg && def.cd ? `${(1 / def.cd).toFixed(1)}회/초` : '없음'], ['체력', String(unitMaxHp(t2, showLv))]].forEach(([k, v], i) => {
    const bw = (w - 64) / 3, bx = x + 24 + i * (bw + 8), by = y + 336;
    ctx.fillStyle = 'rgba(8,18,44,.9)'; chamfer(bx, by, bw, 46, 8); ctx.fill();
    ctx.strokeStyle = sc; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = FK(13); ctx.fillStyle = 'rgba(190,215,245,.85)'; ctx.fillText(k, bx + bw / 2, by + 14);
    ctx.font = FT(16, 900); outlineText(v, bx + bw / 2, by + 32, '#fff', 3);
  });
  // 레벨별 성장 그래프 (Lv1~8)
  const st8 = Array.from({ length: MAX_LV }, (_, i) => levelStat(t2, i + 1)), mx = Math.max(...st8.map(q => q.v)) || 1;
  const gx0 = x + 30, gw = (w - 60) / MAX_LV, gy0 = y + 466;
  ctx.textAlign = 'left'; ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.8)';
  ctx.fillText('// 합칠수록 이만큼 세져요', x + 36, y + 400);
  st8.forEach((q, i) => {
    const bh = 8 + 40 * Math.sqrt(q.v / mx), bx = gx0 + i * gw + gw * 0.2, bw = gw * 0.6, on = i + 1 === showLv, col = def.col;
    ctx.fillStyle = on ? col : 'rgba(120,200,255,.3)';
    ctx.fillRect(bx, gy0 - bh, bw, bh);
    if (on) drawGlow(col, bx + bw / 2, gy0 - bh, 18, 0.5);
    ctx.textAlign = 'center'; ctx.font = FT(9, 900); ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,.7)'; ctx.fillText(fmt(q.v), bx + bw / 2, gy0 - bh - 8);
    lvBadge(i + 1, bx + bw / 2, gy0 + 12, on ? col : 'rgba(120,200,255,.3)', 0.62);
  });
  // 합체 비교: 같은 기체 두 대를 그대로 둘 때와 합쳤을 때
  const cmpL = Math.min(showLv, 4), two = st8[cmpL - 1].v * 2, one = st8[cmpL].v, cells = SHAPES[def.shape].length, nextT = TRANSCEND[showLv - 5];
  ctx.font = FK(14); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,235,255,.9)';
  const cmpTxt = showLv < 5 ? `Lv${cmpL} 두 대 ${fmt(two)} (${cells * 2}칸)  →  Lv${cmpL + 1} 한 대 ${fmt(one)} (${cells}칸) + 새 스킬`
    : nextT ? `Lv${showLv} 두 대를 합치면 ${nextT}: 화력 ×2.3, 스킬 더 자주` : '최고 단계 초월 III';
  ctx.fillText(cmpTxt, W / 2, y + 494);
  // 스킬 목록 (Lv1~5) + 초월 한 줄 (Lv6~8)
  const rowsK = SKILLS[t2].map(([nm, ds], i) => [`LV${i + 1}`, nm, ds, i + 1 === Math.min(showLv, 5) && showLv <= 5, def.col]);
  rowsK.push(['LV6~8', '초월 I~III', transDesc(t2), showLv >= 6, def.col]);
  rowsK.forEach(([lvT, nm, ds, on, col], i) => {
    const sy = y + 530 + i * 42;
    ctx.fillStyle = on ? 'rgba(90,210,255,.12)' : 'rgba(255,255,255,.03)'; chamfer(x + 24, sy - 20, w - 48, 40, 8); ctx.fill();
    if (on) { ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = FK(12); const ln = wrapLines(ds, w - 130), two = ln.length > 1;
    lvBadge(i === 5 ? Math.max(6, Math.min(8, showLv)) : i + 1, x + 52, sy - 6, on ? col : 'rgba(150,180,220,.35)', 0.72);
    ctx.textAlign = 'center'; ctx.font = FT(8, 900); ctx.fillStyle = on ? '#fff' : 'rgba(200,215,240,.6)'; ctx.fillText(lvT, x + 52, sy + 12); ctx.textAlign = 'left';
    ctx.font = FK(15); ctx.fillStyle = '#fff'; ctx.fillText(nm, x + 88, sy - (two ? 11 : 7));
    ctx.font = FK(12); ctx.fillStyle = 'rgba(200,220,245,.85)';
    if (two) { ctx.fillText(ln[0], x + 88, sy + 4); ctx.fillText(ln.slice(1).join(' '), x + 88, sy + 15); }
    else ctx.fillText(ln[0], x + 88, sy + 11);
  });
  // 버튼
  const by = y + h - 58;
  if (!c.inGame && own) drawResearch(t2, x + 24, y + 776, w - 48, 88, y);
  if (c.inGame) {
    ctx.font = FK(17); ctx.textAlign = 'center'; ctx.fillStyle = '#bfefff';
    ctx.fillText(`지금 Lv${c.u.lv}, HP ${Math.max(0, Math.ceil(c.u.hp))}/${c.u.maxHp}, 전투 일시정지 중`, W / 2, by - 28);
    if (c.u.cells || c.u.res != null) button(x + 30, by, 190, 46, '해체하기', 'scrapInfo', 'danger');
  } else if (own) {
    if (inDeck) button(x + 30, by, 190, 46, '편성에서 빼기', 'undeploy', 'ghost', { type: t2 });
    else if (PROG.deck.length < DECK_N) button(x + 30, by, 190, 46, '편성하기', 'deploy', 'primary', { type: t2 });
    else button(x + 30, by, 190, 46, '교체하기', 'swapOpen', 'gold', { type: t2 });
  } else if (def.unlock.shop) {
    const can = PROG.credits >= def.unlock.shop;
    button(x + 30, by, 190, 46, can ? `◆ ${def.unlock.shop} 구매` : `◆ ${def.unlock.shop} 필요`, 'buy', can ? 'gold' : 'danger', { type: t2 });
  } else {
    ctx.font = FK(16); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,140,.9)';
    ctx.fillText(`스테이지 ${def.unlock.stage}을 깨면 해금돼요`, x + 125, by + 25);
  }
  button(x + w - 220, by, 190, 46, '닫기', 'closecard', 'ghost');
  if (c.swap && !c.inGame) {   // 편성이 꽉 찼을 때: 누구와 바꿀지 고른다
    const py = y + 690, ph = 170;
    ctx.fillStyle = 'rgba(4,10,28,.97)'; chamfer(x + 16, py, w - 32, ph, 12); ctx.fill();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FK(20); outlineText(`${def.name}${josaWa(def.name)} 바꿀 기체를 고르세요`, W / 2, py + 26, '#fff', 4);
    PROG.deck.forEach((ot, k) => {
      const sw = 76, sx = W / 2 - (DECK_N * (sw + 6) - 6) / 2 + k * (sw + 6), sy = py + 50, od = UNIT[ot];
      ctx.fillStyle = 'rgba(12,24,52,.95)'; chamfer(sx, sy, sw, 104, 9); ctx.fill(); unitTint(sx, sy, sw, 104, od.col, 9);
      ctx.strokeStyle = od.col; ctx.lineWidth = 1.5; ctx.stroke();
      drawUnitArt(ot, 1, sx + sw / 2, sy + 42, Math.min(54 / od.iw, 54 / od.ih), 1, null);
      ctx.font = FK(13); ctx.fillStyle = '#e6f0ff'; ctx.fillText(od.name, sx + sw / 2, sy + 90);
      BUTTONS.push({ x: sx, y: sy, w: sw, h: 104, act: 'swapWith', type: t2, old: ot });
    });
  }
  if (!c.inGame && own) {   // 바닥색 고르기: 왼쪽 위 색 칩
    const bx = x + 20, bY = y + 52;
    ctx.fillStyle = 'rgba(4,10,28,.9)'; chamfer(bx, bY, 92, 30, 7); ctx.fill(); ctx.strokeStyle = def.col; ctx.lineWidth = 1.5; ctx.stroke();
    unitTint(bx + 6, bY + 6, 18, 18, def.col, 4, 1.4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; chamfer(bx + 6, bY + 6, 18, 18, 4); ctx.stroke();
    ctx.font = FK(14); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6f4ff'; ctx.fillText('바닥색', bx + 32, bY + 16);
    BUTTONS.push({ x: bx, y: bY, w: 92, h: 30, act: 'colorOpen' });
  }
  if (c.color && !c.inGame) {
    const py = y + 90, ph = 176, sw = 38, g = 6, sx0 = W / 2 - (10 * (sw + g) - g) / 2;
    ctx.fillStyle = 'rgba(4,10,28,.97)'; chamfer(x + 16, py, w - 32, ph, 12); ctx.fill();
    ctx.strokeStyle = def.col; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FK(18); outlineText(`${def.name} 바닥색`, W / 2, py + 22, '#fff', 4);
    UNIT_ORDER.forEach((ot, k) => {
      const cc = UNIT[ot].col0, sx = sx0 + (k % 10) * (sw + g), sy = py + 44 + Math.floor(k / 10) * (sw + g);
      ctx.fillStyle = 'rgba(14,22,44,1)'; chamfer(sx, sy, sw, sw, 6); ctx.fill(); unitTint(sx, sy, sw, sw, cc, 6, 1.4);
      const on = cc === def.col;
      ctx.strokeStyle = on ? '#fff' : cc; ctx.lineWidth = on ? 3 : 1.2; chamfer(sx, sy, sw, sw, 6); ctx.stroke();
      if (cc === def.col0) { ctx.font = FK(11); ctx.fillStyle = '#fff'; ctx.fillText('기본', sx + sw / 2, sy + sw / 2); }
      BUTTONS.push({ x: sx, y: sy, w: sw, h: sw, act: 'colorPick', type: t2, col: cc });
    });
    ctx.font = FK(13); ctx.fillStyle = 'rgba(200,220,245,.8)'; ctx.fillText('판 위 칸 바닥과 테두리 색이 바뀌어요', W / 2, py + ph - 20);
  }
  if (UI.toast && UI.toast.until > t) { ctx.font = FK(16); ctx.textAlign = 'center'; outlineText(UI.toast.text, W / 2, y + 766, '#ffb0b0', 4); }
  // 카드 오른쪽 위 코어 계기
  coreLabel(x + w - 22, y + 30, UI.coreShown, 14, 'right');
  drawUpgradeFx(t2, W / 2, y + 140, x + w - 60, y + 30, cdt);
}

// 연구소 패널: Mk 배지, 10칸 진행 막대, 지금→다음 효과, 강화 버튼
function drawResearch(t2, px, py, pw, ph, cardY) {
  const mk = mkOf(t2), cost = mkCost(t2), can = PROG.credits >= cost, max = mk >= MK_MAX, now = performance.now() / 1000;
  const fx = UI.upFx && UI.upFx.type === t2 ? now - UI.upFx.t0 : 9;
  ctx.fillStyle = 'rgba(40,28,6,.55)'; chamfer(px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,74,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = FU(10); ctx.fillStyle = 'rgba(255,210,120,.85)';
  ctx.fillText('// RESEARCH LAB / 연구소', px + 14, py + 13);
  // Mk 배지
  const bx = px + 44, bY = py + 52, pulse = fx < 0.8 ? 1 + Math.max(0, 0.8 - fx) * 0.6 : 1;
  drawGlow('#ffd24a', bx, bY, 34 * pulse, 0.35 + (fx < 0.8 ? 0.5 : 0));
  ctx.fillStyle = max ? '#ffd24a' : 'rgba(30,20,4,.95)'; hexPath(bx, bY, 26 * pulse); ctx.fill();
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = FU(9); ctx.fillStyle = max ? '#2a1600' : '#ffd24a'; ctx.fillText('MK', bx, bY - 10);
  ctx.font = FT(18, 900); ctx.fillStyle = max ? '#2a1600' : '#fff'; ctx.fillText(String(mk), bx, bY + 7);
  // 진행 막대
  const sx = px + 84, sw = pw - 84 - 140, segW = sw / MK_MAX;
  for (let k = 0; k < MK_MAX; k++) {
    const on = k < mk, fresh = on && k === mk - 1 && fx < 1.2, x0 = sx + k * segW;
    ctx.fillStyle = on ? ((k + 1) % 3 === 0 ? '#ffb347' : '#ffd24a') : 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.moveTo(x0 + 3, py + 30); ctx.lineTo(x0 + segW - 1, py + 30); ctx.lineTo(x0 + segW - 3, py + 42); ctx.lineTo(x0 + 1, py + 42); ctx.closePath(); ctx.fill();
    if (fresh) drawGlow('#fff2b0', x0 + segW / 2, py + 36, 22, (1.2 - fx) * 1.5);
    if ((k + 1) % 3 === 0) { ctx.fillStyle = 'rgba(255,180,80,.7)'; ctx.fillRect(x0 + segW / 2 - 1, py + 44, 2, 4); }
  }
  ctx.textAlign = 'left'; ctx.font = FK(14);
  const pct = n => `+${n * 8}%`, hp = n => Math.floor(n / 3);
  if (max) { ctx.fillStyle = '#ffe9a8'; ctx.fillText(`화력 ${pct(mk)}, 체력 +${hp(mk)}, 연구 완료`, sx, py + 64); }
  else {
    ctx.fillStyle = 'rgba(230,240,255,.85)'; ctx.fillText(`화력 ${pct(mk)}`, sx, py + 64);
    const w1 = ctx.measureText(`화력 ${pct(mk)} `).width;
    ctx.fillStyle = '#5affc8'; ctx.fillText(`→ ${pct(mk + 1)}${(mk + 1) % 3 === 0 ? `  체력 +${hp(mk + 1)}` : ''}`, sx + w1, py + 64);
  }
  // 강화 버튼
  const bw = 124, bh = 56, bxx = px + pw - bw - 10, byy = py + ph / 2 - bh / 2 + 6;
  if (max) {
    ctx.font = FK(18); ctx.textAlign = 'center'; outlineText('MAX', bxx + bw / 2, byy + bh / 2, '#ffd24a', 4);
    return;
  }
  const glow = can ? 0.35 + 0.25 * Math.sin(now * 5) : 0;
  if (can) {
    drawGlow('#ffd24a', bxx + bw / 2, byy + bh / 2, bw * 0.7, glow, 0.5);
    const g = ctx.createLinearGradient(0, byy, 0, byy + bh); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.5, '#ffc83a'); g.addColorStop(1, '#d88a10');
    ctx.fillStyle = g;
  } else ctx.fillStyle = 'rgba(40,40,60,.8)';
  chamfer(bxx, byy, bw, bh, 12); ctx.fill();
  ctx.strokeStyle = can ? '#fff6c8' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (can) { ctx.save(); chamfer(bxx, byy, bw, bh, 12); ctx.clip(); const sh = ((now * 160) % (bw + 80)) - 40; const g2 = ctx.createLinearGradient(bxx + sh - 30, 0, bxx + sh + 30, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,.45)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillRect(bxx, byy, bw, bh); ctx.restore(); }
  ctx.font = FK(19); ctx.textAlign = 'center'; ctx.fillStyle = can ? '#2a1600' : 'rgba(255,255,255,.5)';
  ctx.fillText('강화', bxx + bw / 2, byy + 17);
  coreLabel(bxx + bw / 2, byy + 39, cost, 12, 'center', can ? '#2a1600' : '#ff9a9a');
  if (!can) { ctx.font = FK(11); ctx.fillStyle = '#ff9a9a'; ctx.textAlign = 'center'; ctx.fillText(`${fmt(cost - PROG.credits)} 부족`, bxx + bw / 2, byy + bh + 9); }
  BUTTONS.push({ x: bxx, y: byy, w: bw, h: bh, act: 'upgrade', type: t2 });
}
// 강화 연출: 코어가 계기에서 기체로 빨려 들어가고, 번쩍, 스캔 링, 육각 파편, "Mk.N 달성!"
function drawUpgradeFx(t2, ax, ay, cx, cy, dt) {
  const f = UI.upFx;
  for (const p of UI.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy = p.vy * 0.93 + 200 * dt; }
  UI.parts = UI.parts.filter(p => p.t < p.life);
  if (!f || f.type !== t2) { UI.parts.length = 0; return; }
  const e = performance.now() / 1000 - f.t0;
  if (e > 2) { UI.upFx = null; return; }
  const col = f.max ? `hsl(${(e * 400) % 360},100%,65%)` : f.milestone ? '#ffb347' : '#ffd24a';
  // 1) 코어가 날아든다
  if (e < 0.45) for (let k = 0; k < 8; k++) {
    const q = Math.min(1, Math.max(0, (e - k * 0.03) / 0.35)), ease = q * q;
    if (q <= 0 || q >= 1) continue;
    const mx = (cx + ax) / 2 + (k - 3.5) * 22, my = Math.min(cy, ay) - 60;
    const x = (1 - ease) * (1 - ease) * cx + 2 * (1 - ease) * ease * mx + ease * ease * ax;
    const y = (1 - ease) * (1 - ease) * cy + 2 * (1 - ease) * ease * my + ease * ease * ay;
    drawCore(x, y, 7);
  }
  // 2) 도착 순간 폭발
  if (e >= 0.45 && !f.burst) {
    f.burst = true;
    for (let k = 0; k < (f.milestone || f.max ? 46 : 28); k++) {
      const a = Math.random() * Math.PI * 2, v = 180 + Math.random() * 320;
      UI.parts.push({ x: ax, y: ay, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, life: 0.6 + Math.random() * 0.6, r: 3 + Math.random() * 4, rot: Math.random() * 6 });
    }
  }
  if (e >= 0.45) {
    const q = e - 0.45;
    drawGlow('#ffffff', ax, ay, 90 + q * 120, Math.max(0, 0.9 - q * 1.6));
    drawGlow(f.max ? '#ff6ad8' : col, ax, ay, 130 + q * 200, Math.max(0, 0.6 - q * 0.5));
    ctx.save(); ctx.translate(ax, ay);
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = k === 1 ? '#ffffff' : (f.max ? `hsl(${(e * 400 + k * 120) % 360},100%,65%)` : col);
      ctx.globalAlpha = Math.max(0, 1 - q * 0.9); ctx.lineWidth = 3 - k * 0.7;
      ctx.rotate(e * (k % 2 ? -4 : 5));
      ctx.beginPath(); ctx.arc(0, 0, 50 + q * (140 + k * 40), 0, Math.PI * (1 + k * 0.3)); ctx.stroke();
    }
    ctx.restore();
    // 문구
    const sc = q < 0.2 ? 0.6 + q * 3 : 1.2 - Math.min(0.2, (q - 0.2));
    const a = q > 1.2 ? Math.max(0, 1 - (q - 1.2) * 3) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, ay + 54 - q * 20); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = FT(30, 900); glitchText(f.max ? 'RESEARCH COMPLETE' : `MK.${f.mk}`, 0, -14, f.max ? '#ffffff' : col, 6, q < 0.3 ? (0.3 - q) * 30 : 0);
    ctx.font = FK(22); outlineText(f.max ? '연구 완료! 화력 +80%, 체력 +3' : `강화 성공! 화력 +8%${f.milestone ? ', 체력 +1' : ''}`, 0, 20, '#5affc8', 5);
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of UI.parts) {
    const k = 1 - p.t / p.life;
    ctx.globalAlpha = k; ctx.fillStyle = f.max ? `hsl(${(p.rot * 60 + e * 300) % 360},100%,70%)` : p.r > 5 ? '#fff2b0' : col;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 8);
    hexPath(0, 0, p.r); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// 설정창과 일시정지
function drawSettings() {
  BUTTONS = [];
  ctx.fillStyle = 'rgba(2,3,12,.8)'; ctx.fillRect(0, 0, W, H);
  const x = 40, y = 150, w = W - 80, h = 640;
  panel(x, y, w, h, '#48c8ff');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(24, 900); glitchText('SETTINGS', W / 2, y + 44, '#d8f6ff', 5, 0);
  ctx.font = FK(15); ctx.fillStyle = 'rgba(200,230,255,.75)'; ctx.fillText('설정', W / 2, y + 72);
  const rows = [['sfxVol', '효과음'], ['bgmVol', '배경음악'], ['shake', '화면 흔들림'], ['fx', '화면 효과 (빛 번짐, 충격파, 스캔라인)'], ['nums', '피해 숫자 표시']];
  rows.forEach(([key, label], i) => {
    const ry = y + 116 + i * 58, on = SET()[key];
    ctx.fillStyle = 'rgba(255,255,255,.04)'; chamfer(x + 24, ry - 24, w - 48, 50, 8); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = FK(19); ctx.fillStyle = '#fff'; ctx.fillText(label, x + 44, ry + 1);
    if (key.endsWith('Vol')) {
      // 볼륨 슬라이더: 막대를 누르거나 끌어서 조절
      const v = SET()[key], sx = x + 150, sw = w - 250, sy = ry;
      ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(sx, sy - 3, sw, 6);
      const g = ctx.createLinearGradient(sx, 0, sx + sw, 0); g.addColorStop(0, '#2a9fd8'); g.addColorStop(1, '#7ff0ff');
      ctx.fillStyle = g; ctx.fillRect(sx, sy - 3, sw * v, 6);
      for (let k = 1; k < 10; k++) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(sx + sw * k / 10, sy - 3, 1, 6); }
      drawGlow('#7ff0ff', sx + sw * v, sy, 16, 0.5);
      ctx.fillStyle = '#e8fbff'; hexPath(sx + sw * v, sy, 9); ctx.fill();
      ctx.strokeStyle = '#48c8ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = FT(12, 900); ctx.textAlign = 'right'; ctx.fillStyle = v ? '#bff6ff' : 'rgba(255,255,255,.4)';
      ctx.fillText(v ? `${Math.round(v * 100)}%` : 'OFF', x + w - 36, ry + 1);
      BUTTONS.push({ x: sx - 14, y: ry - 24, w: sw + 28, h: 50, act: 'slider', key, sx, sw });
      return;
    }
    const tx = x + w - 110, ty = ry - 15;
    ctx.fillStyle = on ? 'rgba(90,255,200,.25)' : 'rgba(255,255,255,.08)'; chamfer(tx, ty, 70, 30, 8); ctx.fill();
    ctx.strokeStyle = on ? '#5affc8' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = on ? '#5affc8' : 'rgba(255,255,255,.4)'; chamfer(on ? tx + 38 : tx + 4, ty + 4, 28, 22, 6); ctx.fill();
    ctx.font = FU(10); ctx.textAlign = 'center'; ctx.fillStyle = on ? '#5affc8' : 'rgba(255,255,255,.5)'; ctx.fillText(on ? 'ON' : 'OFF', tx - 20, ry + 1);
    BUTTONS.push({ x: x + 24, y: ry - 24, w: w - 48, h: 50, act: 'toggle', key });
  });
  const armed = UI.resetArm > performance.now() / 1000;
  button(x + 30, y + 418, w - 60, 44, armed ? '한 번 더 누르면 진행이 모두 지워져요' : '진행 초기화', 'reset', 'danger');
  ctx.font = FK(13); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,210,240,.7)';
  ctx.fillText('그래픽, 효과음: Kenney (CC0)', W / 2, y + 488);
  ctx.fillText('음악: MintoDog, wipics, Deva (OpenGameArt, CC0)', W / 2, y + 508);
  ctx.fillText('폰트: Orbitron, Chakra Petch, 도현 (SIL OFL)', W / 2, y + 528);
  ctx.fillText('진행 상황은 이 기기의 브라우저에만 저장돼요', W / 2, y + 548);
  button(W / 2 - 100, y + h - 76, 200, 50, '닫기', 'closesettings', 'primary');
}
function drawPause() {
  BUTTONS = [];
  ctx.fillStyle = 'rgba(2,3,12,.72)'; ctx.fillRect(0, 0, W, H);
  panel(90, 280, W - 180, 380, '#48c8ff');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(26, 900); glitchText('PAUSED', W / 2, 330, '#d8f6ff', 5, Math.random() < 0.05 ? 4 : 0);
  button(W / 2 - 120, 380, 240, 52, '계속하기', 'resume', 'primary');
  button(W / 2 - 120, 446, 240, 44, '설정', 'settings', 'ghost');
  button(W / 2 - 120, 502, 240, 44, '다시 하기', 'retry', 'ghost');
  button(W / 2 - 120, 558, 240, 44, '지도로 (이번 판 포기)', 'map', 'danger');
}
// 정비소: 부품으로 줄을 강화한다. 여는 동안 전투가 멈춘다
function drawGearIcon(x, y, r, col = '#ffb347') {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = col;
  for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillRect(-r * 0.25, -r * 1.6, r * 0.5, r * 0.6); }
  ctx.restore();
}
function drawShop() {
  BUTTONS = [];
  ctx.fillStyle = 'rgba(2,3,12,.85)'; ctx.fillRect(0, 0, W, H);
  const x = 14, y = 70, w = W - 28, h = 830;
  panel(x, y, w, h, '#ffb347');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(32, 900); glitchText('WORKSHOP', W / 2, y + 48, '#ffd6b0', 5, Math.random() < 0.05 ? 4 : 0);
  ctx.font = FK(19); ctx.fillStyle = 'rgba(230,236,255,.92)';
  ctx.fillText('칸을 골라 강화해요. 이번 전투 동안 유지돼요.', W / 2, y + 88);
  ctx.fillStyle = 'rgba(40,24,10,.8)'; chamfer(W / 2 - 90, y + 110, 180, 48, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,180,70,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  drawGearIcon(W / 2 - 54, y + 134, 12);
  ctx.font = FK(20); ctx.textAlign = 'left'; ctx.fillStyle = '#ffd6a0'; ctx.fillText('부품', W / 2 - 32, y + 135);
  ctx.font = FT(26, 900); outlineText(String(S.gear), W / 2 + 22, y + 135, '#fff', 4);
  // 작은 판: 칸을 눌러 고른다
  const mw = 72, mh = 60, mx0 = W / 2 - COLS * mw / 2, my0 = y + 180, rows = openRows(), tt = performance.now() / 1000;
  const mpos = i => ({ x: mx0 + (i % COLS) * mw + mw / 2, y: my0 + Math.floor(i / COLS) * mh + mh / 2 });
  let guide = null;
  if (UI.selCell == null && !S.cellFx.some(Boolean)) { const best = gridUnits().sort((a, b) => b.lv - a.lv)[0]; if (best) guide = best.cells[0]; }
  for (let i = 0; i < COLS * rows; i++) {
    const q = mpos(i), f = S.cellFx[i], fc = f ? CELL_FX[f.k].col : '#5a86c8';
    ctx.fillStyle = 'rgba(10,18,40,.95)'; chamfer(q.x - mw / 2 + 3, q.y - mh / 2 + 3, mw - 6, mh - 6, 8); ctx.fill();
    if (f) { ctx.fillStyle = fc; ctx.globalAlpha = 0.14 + 0.06 * f.lv; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = fc; ctx.globalAlpha = f ? 0.9 : 0.35; ctx.lineWidth = f ? 2 : 1.2; ctx.stroke(); ctx.globalAlpha = 1;
    BUTTONS.push({ x: q.x - mw / 2, y: q.y - mh / 2, w: mw, h: mh, act: 'cellsel', c: i });
  }
  for (const u of gridUnits()) { const xs = u.cells.map(c => mpos(c).x), ys = u.cells.map(c => mpos(c).y); drawUnit(u, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, 0.55, 0.78); }
  for (let i = 0; i < COLS * rows; i++) {
    const q = mpos(i), f = S.cellFx[i];
    if (f) { ctx.font = FU(9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText(fxLabel(f), q.x, q.y + mh / 2 - 12, CELL_FX[f.k].col, 3); }
    if (i === UI.selCell || i === guide) {
      const a = i === guide ? 0.5 + 0.5 * Math.sin(tt * 6) : 1;
      ctx.strokeStyle = '#fff'; ctx.globalAlpha = a; ctx.lineWidth = 3; chamfer(q.x - mw / 2 + 1, q.y - mh / 2 + 1, mw - 2, mh - 2, 9); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  if (guide != null) { const q = mpos(guide); if (S.tut && S.tut.step === 5) tapDemo(q.x, q.y); else { ctx.font = FK(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText('칸을 눌러 보세요', q.x, q.y - mh / 2 - 12, '#fff', 4); } }
  // 고른 칸
  const py = my0 + rows * mh + 18, sc = UI.selCell, sf = sc != null ? S.cellFx[sc] : null;
  ctx.fillStyle = 'rgba(10,20,44,.9)'; chamfer(x + 16, py, w - 32, 150, 12); ctx.fill();
  ctx.strokeStyle = sf ? CELL_FX[sf.k].col : 'rgba(255,180,70,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (sc == null || sc >= COLS * rows) { ctx.font = FK(18); ctx.fillStyle = 'rgba(210,230,255,.85)'; ctx.fillText('강화할 칸을 누르세요', W / 2, py + 75); }
  else {
    const nm = 'ABCD'[Math.floor(sc / COLS)] + (sc % COLS + 1);
    if (!sf) {
      const cost = cellNewCost();
      ctx.font = FK(18); ctx.fillStyle = '#fff'; ctx.fillText(`${nm} 칸에 붙일 효과를 고르세요 (부품 ${cost})`, W / 2, py + 24);
      FX_KEYS.forEach((k, j) => {
        const d = CELL_FX[k], bw2 = 112, bx2 = W / 2 - 2 * (bw2 + 8) + 4 + j * (bw2 + 8);
        button(bx2, py + 48, bw2, 54, d.name, 'cellfx', S.gear >= cost ? 'gold' : 'ghost', { c: sc, k });
        if (j === 0 && S.tut && S.tut.step === 5) UI.tutFx = { x: bx2 + bw2 / 2, y: py + 75 };
        ctx.font = FK(14); ctx.fillStyle = d.col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(d.txt(d.v[0]), bx2 + bw2 / 2, py + 124);
      });
    } else {
      const d = CELL_FX[sf.k];
      ctx.font = FK(20); outlineText(`${nm} 칸, ${d.name} Lv${sf.lv}`, W / 2, py + 26, d.col, 4);
      ctx.font = FK(16); ctx.fillStyle = 'rgba(210,230,255,.92)'; ctx.textAlign = 'left';
      ctx.fillText(`지금 ${d.txt(d.v[sf.lv - 1])}`, x + 40, py + 70);
      if (sf.lv < 3) {
        ctx.fillStyle = d.col; ctx.fillText(`다음 ${d.txt(d.v[sf.lv])}`, x + 40, py + 100);
        const cost = CELL_UP[sf.lv - 1];
        button(x + w - 190, py + 58, 160, 58, `부품 ${cost}`, 'cellup', S.gear >= cost ? 'gold' : 'ghost', { c: sc });
      } else { ctx.textAlign = 'center'; ctx.font = FT(22, 900); outlineText('MAX', x + w - 110, py + 86, d.col, 4); }
    }
  }
  // 줄 추가
  const ry = py + 166;
  if (rows < ROWS) {
    const cost = ROW_ADD[rows - START_ROWS];
    ctx.fillStyle = 'rgba(40,24,10,.85)'; chamfer(x + 16, ry, w - 32, 76, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,70,.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = FK(20); outlineText(`줄 추가 (${rows + 1}줄로)`, x + 36, ry + 26, '#ffd6a0', 4);
    ctx.font = FK(14); ctx.fillStyle = 'rgba(255,220,180,.85)';
    ctx.fillText(rows === 2 ? '칸 6개가 늘고, 세로 3칸 기체를 올릴 수 있어요' : '칸 6개가 늘어요', x + 36, ry + 54);
    button(x + w - 170, ry + 10, 140, 56, `부품 ${cost}`, 'addrow', S.gear >= cost ? 'gold' : 'ghost');
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = FK(15); ctx.fillStyle = 'rgba(255,214,160,.85)';
  ctx.fillText('필요 없는 기체를 위 전장으로 끌어 놓으면 부품이 나와요.', W / 2, y + h - 96);
  button(W / 2 - 120, y + h - 70, 240, 54, '전투로 돌아가기', 'closeshop', 'primary');
  if (UI.toast && UI.toast.until > performance.now() / 1000) { ctx.font = FK(18); outlineText(UI.toast.text, W / 2, y + 160, '#ffb0b0', 4); }
  if (S.tut && S.tut.step === 5 && UI.selCell != null && UI.tutFx && !S.cellFx.some(Boolean)) tapDemo(UI.tutFx.x, UI.tutFx.y);
  UI.tutFx = null;
}
function drawPerk() {
  BUTTONS = [];
  ctx.fillStyle = 'rgba(2,3,12,.78)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const e = performance.now() / 1000 - (S.perkT0 || 0);
  ctx.font = FT(26, 900); glitchText('UPGRADE', W / 2, 196, '#ffd24a', 5, e < 0.3 ? 5 : Math.random() < 0.06 ? 4 : 0);
  ctx.font = FK(18); ctx.fillStyle = '#e6ecff'; ctx.fillText(`웨이브 ${S.wave} 돌파! 강화를 하나 고르세요`, W / 2, 232);
  ctx.font = FK(14); ctx.fillStyle = 'rgba(180,205,240,.75)'; ctx.fillText(S.stage.endless ? '고른 강화는 이번 도전이 끝날 때까지 이어져요' : '고른 강화는 이번 스테이지 동안만 이어져요', W / 2, 258);
  (S.perkChoices || []).forEach((pk, i) => {
    const k = Math.max(0, Math.min(1, (e - i * 0.09) / 0.28)), ease = 1 - Math.pow(1 - k, 3);
    const x = 44 + (1 - ease) * 80, y = 284 + i * 140, w = W - 88, h = 124, [cn, cc] = PERK_CAT[pk.cat];
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(8,20,50,.96)'; chamfer(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = pk.col; ctx.lineWidth = 2; ctx.stroke();
    drawGlow(pk.col, x + 62, y + h / 2, 50, 0.3 + 0.08 * Math.sin(e * 4 + i));
    ctx.fillStyle = 'rgba(4,12,30,.95)'; hexPath(x + 62, y + h / 2, 34); ctx.fill(); ctx.strokeStyle = pk.col; ctx.lineWidth = 2.5; ctx.stroke();
    perkIcon(pk.cat, x + 62, y + h / 2, pk.col);
    ctx.textAlign = 'left';
    ctx.font = FK(13); const tw = ctx.measureText(cn).width + 16;
    ctx.fillStyle = cc + '33'; chamfer(x + 116, y + 18, tw, 22, 6); ctx.fill(); ctx.fillStyle = cc; ctx.fillText(cn, x + 124, y + 30);
    ctx.font = FK(24); outlineText(pk.name, x + 116, y + 62, '#fff', 4);
    ctx.font = FK(15); ctx.fillStyle = 'rgba(220,235,255,.9)';
    wrapLines(pk.desc, w - 140).slice(0, 2).forEach((l, j) => ctx.fillText(l, x + 116, y + 92 + j * 20));
    const cnt = S.perks.filter(q => q === pk.id).length;
    if (cnt) { ctx.textAlign = 'right'; ctx.font = FK(13); ctx.fillStyle = pk.col; ctx.fillText(`가진 것 ${cnt}개`, x + w - 16, y + 30); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    if (k >= 1) BUTTONS.push({ x, y, w, h, act: 'perk', i });
  });
  if (S.perks.length) {   // 지금 가진 강화
    ctx.font = FK(13); ctx.fillStyle = 'rgba(180,205,240,.75)'; ctx.fillText('지금 가진 강화', W / 2, 718);
    const cnt = {}; for (const id of S.perks) cnt[id] = (cnt[id] || 0) + 1;
    const chips = Object.keys(cnt).map(id => PERKS.find(p => p.id === id)).filter(Boolean);
    ctx.font = FK(13);
    const ws = chips.map(p => ctx.measureText(p.name + (cnt[p.id] > 1 ? ` ×${cnt[p.id]}` : '')).width + 20);
    let row = 0, cx = 0; const rows = [[]];
    ws.forEach((w2, j) => { if (cx + w2 > W - 60 && rows[row].length) { rows[++row] = []; cx = 0; } rows[row].push(j); cx += w2 + 8; });
    rows.forEach((r, ri) => {
      let x = W / 2 - (r.reduce((a, j) => a + ws[j] + 8, 0) - 8) / 2;
      for (const j of r) { const p = chips[j]; ctx.fillStyle = p.col + '26'; chamfer(x, 732 + ri * 30, ws[j], 24, 6); ctx.fill(); ctx.fillStyle = p.col; ctx.textAlign = 'left'; ctx.fillText(p.name + (cnt[p.id] > 1 ? ` ×${cnt[p.id]}` : ''), x + 10, 744 + ri * 30); x += ws[j] + 8; }
    });
    ctx.textAlign = 'center';
  }
}
// 강화 갈래 그림: 공격 과녁, 방어 방패, 보급 상자, 특수 번개
function perkIcon(cat, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  if (cat === 'atk') { ctx.arc(0, 0, 12, 0, Math.PI * 2); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { ctx.moveTo(dx * 8, dy * 8); ctx.lineTo(dx * 19, dy * 19); } ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
  else if (cat === 'def') { ctx.moveTo(0, -17); ctx.lineTo(14, -10); ctx.lineTo(12, 4); ctx.lineTo(0, 17); ctx.lineTo(-12, 4); ctx.lineTo(-14, -10); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-1, 5); ctx.lineTo(7, -5); ctx.stroke(); }
  else if (cat === 'sup') { ctx.rect(-14, -8, 28, 22); ctx.moveTo(-14, -8); ctx.lineTo(-8, -16); ctx.lineTo(8, -16); ctx.lineTo(14, -8); ctx.moveTo(0, -8); ctx.lineTo(0, 14); ctx.stroke(); }
  else { ctx.moveTo(4, -18); ctx.lineTo(-8, 2); ctx.lineTo(2, 2); ctx.lineTo(-4, 18); ctx.lineTo(10, -4); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawRecords() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(26, 900); glitchText('LEADERBOARD', W / 2, 44, '#d8f6ff', 5, Math.random() < 0.04 ? 5 : 0);
  const tab = UI.recTab || (LB_URL ? 'online' : 'mine');
  if (LB_URL) {
    [['online', '온라인 순위'], ['daily', '오늘의 도전'], ['mine', '내 기록']].forEach(([k, l], i) => button(24 + i * 168, 66, 156, 38, l, 'recTab', tab === k ? 'primary' : 'ghost', { tab: k }));
  } else { ctx.font = FK(16); ctx.fillStyle = 'rgba(200,230,255,.8)'; ctx.fillText('무한 방어선 내 기록 순위', W / 2, 80); }
  panel(24, 116, W - 48, 604, '#48c8ff');
  let rows = [], note = '';
  if (tab === 'online') {
    lbFetch();
    rows = (LB.top || []).slice(0, 10).map((r, i) => ({ ...r, rank: i + 1, deck: [...(r.deck || '')] }));
    note = '닉네임마다 최고 기록으로 매겨요. 점수가 같으면 웨이브가 높은 쪽이 위예요.';
    if (!rows.length) { ctx.font = FK(18); ctx.fillStyle = 'rgba(200,220,255,.7)'; ctx.fillText(LB.loading || !LB.t ? '불러오는 중...' : LB.err || '아직 기록이 없어요. 첫 기록을 올려 보세요!', W / 2, 400); }
  } else if (tab === 'daily') {
    lbFetchDaily();
    const day = dayKey(), deck = dailyDeck(day);
    ctx.font = FK(14); ctx.fillStyle = 'rgba(140,220,255,.9)'; ctx.fillText(`${day} 오늘의 편성, 모두 같은 기체로 겨뤄요`, W / 2, 138);
    deck.forEach((t2, k) => {
      const def = UNIT[t2], x = W / 2 + (k - 2) * 84, y = 186;
      ctx.fillStyle = 'rgba(12,24,52,.95)'; chamfer(x - 38, y - 32, 76, 64, 9); ctx.fill(); unitTint(x - 38, y - 32, 76, 64, def.col, 9); ctx.strokeStyle = def.col; ctx.lineWidth = 1.5; ctx.stroke();
      drawUnitArt(t2, 1, x, y - 6, Math.min(46 / def.iw, 36 / def.ih), 1, null);
      ctx.font = FK(12); ctx.fillStyle = '#e6f0ff'; ctx.fillText(def.name, x, y + 22);
    });
    rows = (LBD.top || []).slice(0, 8).map((r, i) => ({ ...r, rank: i + 1, deck: [], y0: 250 }));
    note = '한국 시간 0시에 바뀌어요. 연구 강화 없이 모두 같은 조건이에요.';
    if (!rows.length) { ctx.font = FK(18); ctx.fillStyle = 'rgba(200,220,255,.7)'; ctx.fillText(LBD.loading || !LBD.t ? '불러오는 중...' : LBD.err || '아직 오늘 기록이 없어요. 첫 기록을 올려 보세요!', W / 2, 440); }
    if (PROG.dailyBest && PROG.dailyBest.day === day) { ctx.font = FK(14); ctx.fillStyle = '#5affc8'; ctx.fillText(`오늘 내 최고 ${fmt(PROG.dailyBest.score)}점, 웨이브 ${PROG.dailyBest.wave}`, W / 2, 700); }
  } else {
    rows = (PROG.records || []).map((r, i) => ({ ...r, rank: i + 1, name: r.date }));
    note = '이 기기에 저장된 내 기록이에요. 줄을 누르면 쓴 조합이 보여요.';
    if (!rows.length) { ctx.font = FK(18); ctx.fillStyle = 'rgba(200,220,255,.7)'; ctx.fillText('아직 기록이 없어요. 무한 방어선에 도전해 보세요!', W / 2, 400); }
  }
  rows.forEach((r, i) => {
    const y = (r.y0 || 150) + i * 57, top = i === 0, mine = tab !== 'mine' && PROG.nick && r.name === PROG.nick;
    ctx.fillStyle = mine ? 'rgba(90,255,200,.12)' : top ? 'rgba(255,210,74,.12)' : 'rgba(255,255,255,.03)'; chamfer(40, y - 23, W - 80, 50, 8); ctx.fill();
    if (mine) { ctx.strokeStyle = '#5affc8'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.font = FT(18, 900); ctx.fillStyle = top ? '#ffd24a' : i < 3 ? '#bfefff' : 'rgba(200,220,255,.7)';
    ctx.fillText(String(r.rank).padStart(2, '0'), 54, y + 3);
    ctx.font = FK(15); ctx.fillStyle = '#fff'; ctx.fillText(r.name, 100, y - 7);
    ctx.font = FK(13); ctx.fillStyle = 'rgba(190,215,245,.85)'; ctx.fillText(`${fmt(r.score)}점, 웨이브 ${r.wave}`, 100, y + 13);
    (r.deck || []).forEach((t2, k) => { const def = UNIT[t2]; if (def) drawUnitArt(t2, 1, 330 + k * 34, y + 2, Math.min(28 / def.iw, 26 / def.ih), 0.9, null); });
    BUTTONS.push({ x: 40, y: y - 23, w: W - 80, h: 50, act: 'recRow', r });
  });
  ctx.font = FK(13); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(180,205,240,.65)';
  ctx.fillText(note, W / 2, 740);
  if (endlessOpen()) button(W / 2 - 130, 772, 260, 54, tab === 'daily' ? '오늘의 도전 시작' : '무한 방어선 도전', tab === 'daily' ? 'daily' : 'endless', tab === 'daily' ? 'gold' : 'primary');
  else { ctx.font = FK(16); ctx.fillStyle = 'rgba(255,200,140,.9)'; ctx.fillText('스테이지 5를 깨면 무한 방어선이 열려요', W / 2, 798); }
  button(W / 2 - 110, 844, 220, 46, '지도로', 'map', 'ghost');
  // 고른 기록의 조합: 편성 5종과 마지막 판의 기체
  const sel = UI.recSel;
  if (sel) {
    BUTTONS = [];
    ctx.fillStyle = 'rgba(2,3,12,.8)'; ctx.fillRect(0, 0, W, H);
    const px = 40, py = 200, pw = W - 80, ph = 520;
    panel(px, py, pw, ph, '#ffd24a');
    ctx.textAlign = 'center'; ctx.font = FK(24); outlineText(sel.name, W / 2, py + 40, '#fff', 4);
    ctx.font = FK(15); ctx.fillStyle = '#ffd6a0'; ctx.fillText(`${fmt(sel.score)}점, 웨이브 ${sel.wave}`, W / 2, py + 70);
    ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.8)'; ctx.fillText('// 출격 편성', W / 2, py + 104);
    (sel.deck || []).forEach((t2, k, a) => {
      const def = UNIT[t2]; if (!def) return;
      const x = W / 2 + (k - (a.length - 1) / 2) * 84, y = py + 150;
      ctx.fillStyle = 'rgba(12,24,52,.95)'; chamfer(x - 38, y - 34, 76, 76, 9); ctx.fill(); unitTint(x - 38, y - 34, 76, 76, def.col, 9); ctx.strokeStyle = def.col; ctx.lineWidth = 1.5; ctx.stroke();
      drawUnitArt(t2, 1, x, y - 4, Math.min(50 / def.iw, 44 / def.ih), 1, null);
      ctx.font = FK(12); ctx.fillStyle = '#e6f0ff'; ctx.fillText(def.name, x, y + 30);
    });
    const bl = boardList(sel.board);
    ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.8)'; ctx.fillText(bl.length ? '// 마지막 판의 기체' : '// 마지막 판 기록이 없어요', W / 2, py + 218);
    bl.forEach((u, k) => {
      const col = k % 6, row = Math.floor(k / 6), x = px + 44 + col * 66, y = py + 262 + row * 70, def = UNIT[u.t];
      ctx.fillStyle = 'rgba(12,24,52,.9)'; chamfer(x - 30, y - 30, 60, 60, 8); ctx.fill(); unitTint(x - 30, y - 30, 60, 60, def.col, 8);
      ctx.strokeStyle = def.col; ctx.lineWidth = 1.5; ctx.stroke();
      drawUnitArt(u.t, u.lv, x, y - 2, Math.min(44 / def.iw, 40 / def.ih), 1, null);
      lvBadge(u.lv, x, y + 27, def.col, 0.85);
    });
    button(W / 2 - 90, py + ph - 64, 180, 46, '닫기', 'recClose', 'ghost');
    BUTTONS.push({ x: 0, y: 0, w: W, h: py, act: 'recClose' }); BUTTONS.push({ x: 0, y: py + ph, w: W, h: H - py - ph, act: 'recClose' });
  }
}
function drawOverlays() {
  if (S.mode === 'perk') drawPerk();
  if (UI.shop) drawShop();
  if (S.paused && !UI.settings) drawPause();
  if (UI.settings) drawSettings();
  else if (UI.card) drawCard();
  else if (UI.prep && S.mode === 'map') drawPrep();
  const now = performance.now() / 1000;
  if (UI.pendingReveal && now >= UI.pendingReveal.at && !UI.card && !UI.settings) { UI.reveal = { type: UI.pendingReveal.type, t0: now, parts: [] }; UI.pendingReveal = null; }
  if (UI.reveal) drawReveal();
  if (UI.enemyIntro) drawEnemyIntro();
  drawOverlay();
}
// 출격 준비: 스테이지에 들어가기 전(지도에서 누를 때, 다음 스테이지)에 바로 편성을 바꾼다
function drawPrep() {
  BUTTONS = [];
  const P = UI.prep, x = 22, y = 64, w = W - 44, h = 800;
  ctx.fillStyle = 'rgba(2,3,12,.82)'; ctx.fillRect(0, 0, W, H);
  const st = P.endless ? null : stageInfo(P.n), col = st ? st.sector.color : '#ffd24a';
  panel(x, y, w, h, col);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FT(26, 900); glitchText(st ? `STAGE ${P.n}` : 'ENDLESS', W / 2, y + 38, '#fff', 5, 0);
  ctx.font = FK(16); ctx.fillStyle = col; ctx.fillText(st ? `${st.sector.name}${st.boss ? ', 보스' : ''}` : '무한 방어선', W / 2, y + 70);
  if (st) { ctx.font = FK(13); ctx.fillStyle = 'rgba(200,220,245,.8)'; ctx.fillText(st.sector.info, W / 2, y + 94); }
  ctx.textAlign = 'left'; ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.8)';
  ctx.fillText(`// 출격 편성 ${PROG.deck.length}/${DECK_N}`, x + 22, y + 124);
  const sw = 84, g = 8, sx0 = W / 2 - (DECK_N * (sw + g) - g) / 2;
  for (let k = 0; k < DECK_N; k++) {
    const t2 = PROG.deck[k], sx = sx0 + k * (sw + g), sy = y + 138;
    ctx.fillStyle = t2 ? 'rgba(10,26,56,.9)' : 'rgba(10,20,44,.4)'; chamfer(sx, sy, sw, 76, 9); ctx.fill();
    if (t2) unitTint(sx, sy, sw, 76, UNIT[t2].col, 9);
    ctx.strokeStyle = t2 ? UNIT[t2].col : 'rgba(120,220,255,.25)'; ctx.lineWidth = 1.5; if (!t2) ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center';
    if (t2) {
      const def = UNIT[t2]; drawUnitArt(t2, 1, sx + sw / 2, sy + 32, Math.min(52 / def.iw, 44 / def.ih), 1, null);
      ctx.font = FK(12); ctx.fillStyle = '#fff'; ctx.fillText(def.name, sx + sw / 2, sy + 64);
      BUTTONS.push({ x: sx, y: sy, w: sw, h: 76, act: 'prepToggle', type: t2 });
    } else { ctx.font = FK(13); ctx.fillStyle = 'rgba(160,210,255,.5)'; ctx.fillText('빈 칸', sx + sw / 2, sy + 38); }
  }
  ctx.textAlign = 'left'; ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.8)';
  ctx.fillText('// 격납고: 누르면 넣고 빼요', x + 22, y + 238);
  const tw = 86, tg = 6, tx0 = W / 2 - (5 * (tw + tg) - tg) / 2;
  UNIT_ORDER.forEach((t2, i) => {
    const def = UNIT[t2], own = isOwned(t2), inDeck = PROG.deck.includes(t2), tx = tx0 + (i % 5) * (tw + tg), ty = y + 252 + Math.floor(i / 5) * (tw + tg);
    ctx.fillStyle = own ? 'rgba(10,24,54,.9)' : 'rgba(8,10,24,.8)'; chamfer(tx, ty, tw, tw, 9); ctx.fill();
    unitTint(tx, ty, tw, tw, def.col, 9, own ? (inDeck ? 1.2 : 0.55) : 0.2);
    ctx.strokeStyle = inDeck ? '#fff' : own ? def.col + '88' : 'rgba(255,255,255,.1)'; ctx.lineWidth = inDeck ? 2.5 : 1.2; ctx.stroke();
    ctx.globalAlpha = own ? 1 : 0.3;
    drawUnitArt(t2, 1, tx + tw / 2, ty + 36, Math.min(58 / def.iw, 46 / def.ih), 1, null);
    ctx.textAlign = 'center'; ctx.font = FK(12); ctx.fillStyle = '#fff'; ctx.fillText(def.name, tx + tw / 2, ty + 72);
    ctx.globalAlpha = 1;
    if (inDeck) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx + tw - 12, ty + 12, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#0a1a30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx + tw - 16, ty + 12); ctx.lineTo(tx + tw - 13, ty + 15); ctx.lineTo(tx + tw - 8, ty + 9); ctx.stroke(); }
    if (own) BUTTONS.push({ x: tx, y: ty, w: tw, h: tw, act: 'prepToggle', type: t2 });
  });
  ctx.textAlign = 'center'; ctx.font = FK(13); ctx.fillStyle = 'rgba(190,215,245,.75)';
  ctx.fillText('캡슐은 편성한 기체로만 나와요', W / 2, y + 640);
  if (UI.toast && UI.toast.until > performance.now() / 1000) { ctx.font = FK(16); outlineText(UI.toast.text, W / 2, y + 666, '#ffb0b0', 4); }
  button(x + 26, y + h - 96, 170, 56, '뒤로', 'prepBack', 'ghost');
  button(x + w - 26 - 250, y + h - 96, 250, 56, '출격', 'prepGo', PROG.deck.length ? 'primary' : 'danger');
}
function drawEnemyIntro() {
  BUTTONS = [];
  const k = UI.enemyIntro.k, d = ENEMY[k], e = performance.now() / 1000 - UI.enemyIntro.t0, a = Math.min(1, e * 4);
  ctx.fillStyle = `rgba(2,3,12,${0.78 * a})`; ctx.fillRect(0, 0, W, H);
  const x = 44, w = W - 88, h = 470, y = 230 + (1 - a) * 30;
  ctx.globalAlpha = a;
  panel(x, y, w, h, '#ff5a6a');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = FU(13); glitchText('// NEW THREAT DETECTED', W / 2, y + 30, '#ff8a8a', 3, e < 0.3 ? 4 : Math.random() < 0.05 ? 3 : 0);
  const img = d ? d.img : INTRO_IMG[k], cy = y + 150;
  drawGlow('#ff4a5a', W / 2, cy, 120, 0.25 + 0.1 * Math.sin(e * 4));
  if (img) { const im = IMG[img], s = im && im.width ? Math.min(170 / im.width, 150 / im.height) : 1; spr(img, W / 2, cy, im ? im.width * s : 120, im ? im.height * s : 120, k === 'rocks' || k === 'meteor' ? e * 0.6 : 0, 1); }
  else { ctx.strokeStyle = '#8fe6ff'; ctx.lineWidth = 4; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + e * 0.5; ctx.beginPath(); ctx.moveTo(W / 2, cy); ctx.lineTo(W / 2 + Math.cos(an) * 60, cy + Math.sin(an) * 60); ctx.stroke(); } }
  ctx.font = FK(34); outlineText((d && d.name) || INTRO_NAME[k] || k, W / 2, y + 262, '#fff', 6);
  ctx.font = FK(17); ctx.fillStyle = 'rgba(225,235,255,.95)';
  wrapLines(ENEMY_HINT[k] || '', w - 60).forEach((l, i) => ctx.fillText(l, W / 2, y + 306 + i * 26));
  ctx.globalAlpha = 1;
  if (e > 0.5) button(W / 2 - 100, y + h - 74, 200, 52, '확인', 'introOk', 'primary');
}
function unlockUnit(t) {
  PROG.newUnits = (PROG.newUnits || []).filter(k => k !== t).concat([t]);
  if (PROG.deck.length < DECK_N && !PROG.deck.includes(t)) PROG.deck.push(t);   // 빈자리가 있으면 바로 편성
  save();
}
// 해금 연출: 신호 수신 → 검은 실루엣이 떨림 → 섬광과 함께 기체가 드러남
function drawReveal() {
  BUTTONS = [];
  const r = UI.reveal, def = UNIT[r.type], now = performance.now() / 1000, e = now - r.t0, T = 1.0;
  const dt = Math.min(0.05, now - (r.last || now)); r.last = now;
  ctx.fillStyle = `rgba(1,2,10,${Math.min(0.92, e * 2.5)})`; ctx.fillRect(0, 0, W, H);
  if (!HEX_PAT) HEX_PAT = ctx.createPattern(HEX, 'repeat');
  ctx.save(); ctx.globalAlpha = 0.06 + 0.05 * Math.sin(e * 6); ctx.fillStyle = HEX_PAT; ctx.fillRect(0, 0, W, H); ctx.restore();
  const cx = W / 2, cy = 380, k = Math.min(210 / def.iw, 180 / def.ih);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (e < T) {
    const q = e / T, jx = (Math.random() - .5) * 10 * q, jy = (Math.random() - .5) * 10 * q;
    if (!r.s1) { r.s1 = 1; play('zap', 0.4, 0.6); play('open', 0.4, 0.8); }
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(90,210,255,${0.3 + 0.5 * q})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 60 + (1 - q) * (160 + i * 60), 0, Math.PI * 2); ctx.stroke();
    }
    drawGlow('#48c8ff', cx, cy, 120 + q * 60, 0.25 + q * 0.4);
    ctx.save();
    if ('filter' in ctx) ctx.filter = 'brightness(0)'; else ctx.globalAlpha = 0.35;
    drawUnitArt(r.type, 1, cx + jx, cy + jy, k, 1, null);
    ctx.restore();
    ctx.font = FU(16); ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(e * 12));
    outlineText('// INCOMING SIGNAL', cx, 190, '#7fe0ff', 3); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(cx - 120, 600, 240, 6);
    ctx.fillStyle = '#48c8ff'; ctx.fillRect(cx - 120, 600, 240 * q, 6);
    ctx.font = FK(18); outlineText('새 기체 신호 해독 중...', cx, 630, '#bfefff', 4);
    return;
  }
  const q = e - T;
  if (!r.s2) {
    r.s2 = 1; play('boom_low', 0.55); play('unlock', 0.6); play('levelup', 0.4);
    for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, v = 150 + Math.random() * 420; r.parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: 0.8 + Math.random() * 0.8, sz: 2 + Math.random() * 5, rot: Math.random() * 6 }); }
  }
  // 빛살
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(q * 0.5); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = def.col; ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(520, -22); ctx.lineTo(520, 22); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  drawGlow(def.col, cx, cy, 220, 0.45);
  drawGlow('#ffffff', cx, cy, 90, Math.max(0.25, 1 - q * 1.5));
  for (let i = 0; i < 2; i++) { ctx.strokeStyle = i ? '#ffffff' : def.col; ctx.globalAlpha = Math.max(0, 1 - q * 1.2); ctx.lineWidth = 4 - i * 2; ctx.beginPath(); ctx.arc(cx, cy, 70 + q * (300 + i * 80), 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const sc = q < 0.22 ? 0.5 + q * 3.6 : 1.29 - Math.min(0.29, (q - 0.22) * 0.8);
  if (def.shape === 1) spr('aura2', cx, cy - 6, 230 * Math.min(1, q * 3), 220 * Math.min(1, q * 3), q * 1.5, 0.5);
  drawUnitArt(r.type, 1 + Math.min(4, Math.floor(q / 0.9)), cx, cy, k * sc, 1, null);
  // 파편
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of r.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 160 * dt; const a = 1 - p.t / p.life; if (a <= 0) continue; ctx.globalAlpha = a; ctx.fillStyle = p.sz > 5 ? '#ffffff' : def.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 8); hexPath(0, 0, p.sz); ctx.fill(); ctx.restore(); }
  ctx.restore();
  if (q < 0.3) { ctx.fillStyle = `rgba(255,255,255,${(0.3 - q) * 3})`; ctx.fillRect(0, 0, W, H); }
  ctx.font = FT(26, 900); glitchText('NEW UNIT UNLOCKED', cx, 170, '#ffd24a', 6, q < 0.4 ? (0.4 - q) * 30 : Math.random() < 0.04 ? 5 : 0.5);
  ctx.font = FK(44); outlineText(def.name, cx, 590, '#ffffff', 7);
  ctx.font = FK(19); ctx.fillStyle = def.col; ctx.fillText(def.role, cx, 632);
  drawShapeIcon(r.type, cx + 170, 470, 16, def.col, '차지하는 칸');
  ctx.font = FK(17); ctx.fillStyle = 'rgba(220,235,255,.9)';
  wrapLines(def.desc, W - 100).forEach((l, i) => ctx.fillText(l, cx, 670 + i * 24));
  ctx.font = FK(15); ctx.fillStyle = 'rgba(160,220,255,.8)'; ctx.fillText(PROG.deck.includes(r.type) ? '편성에 들어갔어요. 이제 캡슐로 나와요' : '격납고에서 편성하면 캡슐로 나와요', cx, 736);
  if (q > 0.6) {
    button(cx - 200, 790, 190, 52, '자세히 보기', 'revealDetail', 'ghost', { type: r.type });
    button(cx + 10, 790, 190, 52, '확인', 'revealOk', 'primary');
  }
}

function drawTitle() {
  const t = performance.now() / 1000;
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.18 + k / 3) % 1;
    const x = [100, 270, 440][k] + Math.sin(t + k) * 10, y = H + 60 - ph * (H + 160);
    drawFlame(x, y + 18, 26, 6, LV_COL[k + 2], 0.6);
    spr(['f3', 'u_s', 'u_d'][k], x, y, 60, 46, 0, 0.55);
  }
  drawGlow('#ff3a2a', W / 2, 170, 150, 0.22 + 0.1 * Math.sin(t * 2));
  const by = 190 + Math.sin(t * 1.2) * 8;
  for (const ox of [-58, 58]) drawGlow('#ff6a3a', W / 2 + ox, by - 88, 24, 0.7, 1.4);
  { const im = IMG['enemies/boss1'], r = im && im.width ? im.width / im.height : 1.14; spr('enemies/boss1', W / 2, by, 230, 230 / r); }
  brackets(W / 2 - 130, by - 110, 260, 220, 22, 'rgba(255,90,90,.5)', 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawGlow('#48c8ff', W / 2, 385, 220, 0.25, 0.4);
  const amt = Math.random() < 0.06 ? 4 + Math.random() * 6 : 0.4;
  ctx.save();
  ctx.font = FT(62, 900); glitchText('OVERRIDE', W / 2, 360, '#eef8ff', 7, amt);
  ctx.font = FK(22); ctx.fillStyle = '#9fdcff'; ctx.fillText('SF 머지 디펜스', W / 2, 408);
  ctx.restore();
  ctx.font = FU(11); ctx.fillStyle = 'rgba(140,220,255,.7)';
  ctx.fillText('// ORBITAL DEFENSE PROGRAM v0.5', W / 2, 442);
  const cyc = (t % 2.4) / 2.4, cy = 580;
  if (cyc < 0.55) {
    const k = cyc / 0.55, gap = 70 * (1 - k * k);
    for (const sx of [-1, 1]) { drawFlame(W / 2 + sx * gap, cy + 14, 16, 5, '#48c8ff'); drawUnitArt('f', 1, W / 2 + sx * gap, cy, 0.85, 1, null); }
  } else {
    const k = (cyc - 0.55) / 0.45;
    if (k < 0.3) drawGlow('#5ae0ff', W / 2, cy, 90, (0.3 - k) * 3);
    drawGlow('#5ae0ff', W / 2, cy + 6, 60, 0.25);
    drawFlame(W / 2, cy + 18, 24, 7, '#5ae0ff');
    const sc = 1 + Math.max(0, 0.25 - k) * 1.5;
    drawUnitArt('f', 3, W / 2, cy, 0.95 * sc, 1, null);
    ctx.font = FK(17); glitchText('확산 레이저!', W / 2, cy - 50, '#5ae0ff', 4, k < 0.2 ? 6 : 0);
  }
  ctx.font = FT(20, 900);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
  outlineText('TAP TO START', W / 2, 850, '#ffd966', 4);
  ctx.font = FK(15); ctx.fillStyle = 'rgba(255,230,160,.8)'; ctx.fillText('탭해서 시작', W / 2, 878);
  ctx.globalAlpha = 1;
}

