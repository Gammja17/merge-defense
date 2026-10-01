'use strict';
// ── 그리기 도구 ───────────────────────────────────────────
function offscreen(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'));
  return c;
}
const glowCache = {};
function glowTex(color) {
  if (!glowCache[color]) glowCache[color] = offscreen(64, 64, g => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color; g.fillRect(0, 0, 64, 64);
  });
  return glowCache[color];
}
// 흰색 텍스처에 색을 입혀 캐시
const texCache = {};
function texTint(name, color) {
  const key = name + color;
  if (!texCache[key]) {
    const im = IMG['fx/' + name];
    if (!im || !im.width) return null;
    texCache[key] = offscreen(im.width, im.height, g => { g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, im.width, im.height); });
  }
  return texCache[key];
}
function drawTex(name, color, x, y, size, rot = 0, alpha = 1, add = true, sy = 1) {
  if (alpha <= 0) return;
  const tx = texTint(name, color);
  if (!tx) return;
  ctx.save();
  if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= Math.min(1, alpha);
  ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sy !== 1) ctx.scale(1, sy);
  ctx.drawImage(tx, -size / 2, -size / 2, size, size);
  ctx.restore();
}
function drawGlow(color, x, y, r, alpha = 1, sy = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= Math.min(1, alpha);
  ctx.drawImage(glowTex(color), x - r, y - r * sy, r * 2, r * 2 * sy);
  ctx.restore();
}
function chamfer(x, y, w, h, c) {
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c);
  ctx.closePath();
}
function brackets(x, y, w, h, len, color, lw = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
}
function hexPath(x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
function outlineText(t, x, y, color, lw = 4) {
  ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineJoin = 'round';
  ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
}
function glitchText(t, x, y, color, lw = 4, amt = 0) {
  if (amt > 0.3 && SET().fx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.75;
    ctx.fillStyle = '#ff2a6a'; ctx.fillText(t, x - amt, y + (Math.random() - .5) * amt * 0.5);
    ctx.fillStyle = '#2af0ff'; ctx.fillText(t, x + amt, y + (Math.random() - .5) * amt * 0.5);
    ctx.restore();
  }
  outlineText(t, x, y, color, lw);
}
function wrapLines(t, maxW) {
  const words = t.split(' '); let line = '', lines = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  return lines;
}
function wrapText(t, x, y, maxW, lh, color = '#eaf6ff') {
  const lines = wrapLines(t, maxW);
  lines.forEach((l, k) => outlineText(l, x, y + (k - (lines.length - 1) / 2) * lh, color, 4));
}
function drawStar(x, y, r, fill) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

// 에너지 코어: 게임 재화. 빛나는 육각 크리스탈
function drawPowerIcon(x, y, r) {
  drawGlow('#ffb347', x, y, r * 2, 0.4);
  ctx.fillStyle = '#ffc24a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 1.1); ctx.lineTo(x - r * 0.7, y + r * 0.15); ctx.lineTo(x - r * 0.05, y + r * 0.15);
  ctx.lineTo(x - r * 0.3, y + r * 1.1); ctx.lineTo(x + r * 0.7, y - r * 0.15); ctx.lineTo(x + r * 0.05, y - r * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function unitPower(u) {
  return levelStat(u.type, u.lv).v * cellAtk(u) * cellSpd(u) * (1 + u.buffDmg) * (1 + u.buffSpd) * pkDmg(u) * S.pk.spd;
}
const fleetPower = () => Math.round(gridUnits().reduce((a, u) => a + unitPower(u), 0));
function drawCore(x, y, r, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  drawGlow('#5ae8ff', x, y, r * 2.2, 0.45);
  ctx.beginPath();
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.1); }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, '#d8ffff'); g.addColorStop(0.45, '#5ae8ff'); g.addColorStop(1, '#1a6ad8');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1, r * 0.14); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r * 0.87, y - r * 0.55); ctx.lineTo(x, y); ctx.lineTo(x - r * 0.87, y - r * 0.55); ctx.closePath(); ctx.fill();
  ctx.restore();
}
const fmt = n => Math.round(n).toLocaleString('en-US');
// 코어 아이콘 + 숫자. align: 'left' | 'right' | 'center'
function coreLabel(x, y, value, size = 16, align = 'left', color = '#bff6ff') {
  ctx.font = FT(size, 900);
  const txt = typeof value === 'number' ? fmt(value) : value, tw = ctx.measureText(txt).width, r = size * 0.55, gap = size * 0.45;
  const total = r * 2 + gap + tw;
  const x0 = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  drawCore(x0 + r, y, r);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (color.startsWith('#2') || color.startsWith('#0')) { ctx.fillStyle = color; ctx.fillText(txt, x0 + r * 2 + gap, y + 1); }
  else outlineText(txt, x0 + r * 2 + gap, y + 1, color, 3);
}

const ENGINE_COL = { artillery: '#ff8a2a', jammer: '#e0ff3a', mother: '#3affc0', grunt: '#7dff7a', tank: '#a9b4ff', minion: '#ff7a5a', rusher: '#ffb35a', shield: '#6ad0ff', sniper: '#ff5ad8', gunship: '#ff4a4a', bomber: '#ffb040', phase: '#bff4ff', grav: '#c89bff' };

const STARS = [];
[[70, 10, 1.1, .45], [40, 26, 1.6, .7], [16, 64, 2.2, 1]].forEach(([n, sp, sz, a], layer) => {
  for (let i = 0; i < n; i++)
    STARS.push({ x: Math.random() * W, y: Math.random() * H, sp, sz, a, tw: Math.random() * 6, layer });
});
const NEBULA = offscreen(W, H, g => {
  const blobs = [[120, 180, 260, '120,60,200'], [430, 520, 300, '40,90,200'], [200, 820, 240, '200,50,140'],
                 [480, 60, 200, '60,160,220'], [60, 560, 180, '150,70,220']];
  for (const [x, y, r, c] of blobs) for (const oy of [-H, 0, H]) {
    const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, r);
    gr.addColorStop(0, `rgba(${c},.28)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
});
function makePlanet([c0, c1, c2]) {
  return offscreen(260, 260, g => {
    const cx = 130, cy = 130, r = 78;
    g.save(); g.translate(cx, cy); g.rotate(-0.35);
    g.strokeStyle = 'rgba(200,210,255,.28)'; g.lineWidth = 9;
    g.beginPath(); g.ellipse(0, 0, 124, 26, 0, Math.PI, Math.PI * 2); g.stroke();
    g.restore();
    const body = g.createRadialGradient(cx - 30, cy - 30, 8, cx, cy, r);
    body.addColorStop(0, c0); body.addColorStop(0.5, c1); body.addColorStop(1, c2);
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(-0.35);
    for (let k = -4; k <= 4; k++) { g.fillStyle = k % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,40,.12)'; g.fillRect(-r, k * 17, r * 2, 9); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const sh = g.createRadialGradient(cx + 50, cy + 50, 10, cx + 20, cy + 20, r * 1.4);
    sh.addColorStop(0, 'rgba(5,5,20,.85)'); sh.addColorStop(1, 'rgba(5,5,20,0)');
    g.fillStyle = sh; g.fillRect(0, 0, 260, 260);
    g.restore();
    g.save(); g.translate(cx, cy); g.rotate(-0.35);
    g.strokeStyle = 'rgba(220,225,255,.5)'; g.lineWidth = 9;
    g.beginPath(); g.ellipse(0, 0, 124, 26, 0, 0, Math.PI); g.stroke();
    g.restore();
  });
}
const PLANETS = SECTORS.map(s => makePlanet(s.planet));
// 모함 갑판: 방어선 바로 아래 뱃머리 장갑띠, 금속판 이음새와 리벳, 칸 뒤 움푹 들어간 격납 구역
const DECK_TOP = LINE_Y - 10;
const DECK = offscreen(W, H - DECK_TOP, g => {
  const h = H - DECK_TOP, gy = GRID_Y - DECK_TOP;
  let gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#1d253d'); gr.addColorStop(0.2, '#121829'); gr.addColorStop(1, '#06080f');
  g.fillStyle = gr; g.fillRect(0, 0, W, h);
  const seam = (x0, y0, x1, y1) => {
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(150,180,230,.09)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1.5, y0 + 1.5); g.lineTo(x1 + 1.5, y1 + 1.5); g.stroke();
  };
  for (let y = 34; y < h; y += 62) seam(0, y, W, y);
  for (let x = 0; x <= W; x += 90) seam(x, 34, x, h);
  for (let y = 34; y < h; y += 62) for (let x = 0; x <= W; x += 90) for (const [dx, dy] of [[6, 6], [-6, 6]]) {
    g.fillStyle = '#2b3553'; g.beginPath(); g.arc(x + dx, y + dy, 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(190,215,255,.25)'; g.fillRect(x + dx - 1, y + dy - 1.5, 1, 1);
  }
  // 뱃머리 장갑띠: 비스듬한 장갑판이 이어진 띠
  g.fillStyle = '#222b47'; g.fillRect(0, 4, W, 26);
  for (let x = -30; x < W + 30; x += 60) {
    g.fillStyle = 'rgba(160,190,240,.06)';
    g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 44, 4); g.lineTo(x + 56, 30); g.lineTo(x + 12, 30); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 44, 4); g.lineTo(x + 56, 30); g.stroke();
  }
  g.fillStyle = 'rgba(180,225,255,.55)'; g.fillRect(0, 4, W, 1.5);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 30, W, 3);
  // 경고 줄무늬 (옅게)
  g.save(); g.beginPath(); g.rect(0, 25, W, 5); g.clip();
  for (let x = -10; x < W + 10; x += 14) { g.fillStyle = 'rgba(255,190,60,.35)'; g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 7, 25); g.lineTo(x + 12, 25); g.lineTo(x + 5, 30); g.closePath(); g.fill(); }
  g.restore();
  // 격납 구역: 칸과 대기함 뒤를 움푹 파인 홈으로
  const bay = (x, y, w, hh, col) => {
    g.fillStyle = 'rgba(0,0,6,.55)'; g.beginPath(); g.moveTo(x + 10, y); g.lineTo(x + w - 10, y); g.lineTo(x + w, y + 10); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.lineTo(x, y + 10); g.closePath(); g.fill();
    const sh = g.createLinearGradient(0, y, 0, y + 16); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(x, y, w, 16);
    g.strokeStyle = col; g.globalAlpha = 0.4; g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 1;
  };
  bay(GRID_X - 6, gy - 6, COLS * CW + 12, ROWS * CH + 20, '#48c8ff');
});
const SCAN = offscreen(4, 3, g => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, 4, 1); });
const HEX = offscreen(30, 52, g => {
  g.strokeStyle = 'rgba(160,230,255,1)'; g.lineWidth = 1.2;
  const r = 15, hx = (x, y) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58); } g.closePath(); g.stroke(); };
  hx(7.5, 13); hx(22.5, 39); hx(22.5, -13); hx(7.5, 65); hx(-7.5, 39); hx(37.5, 39);
});
let SCAN_PAT = null, HEX_PAT = null;

let nebY = 0, gridY = 0;
const BGX = SECTORS.map(() => [...Array(8)].map(() => ({ x: Math.random() * W, y: Math.random() * H, r: 20 + Math.random() * 50, sp: 6 + Math.random() * 12, rot: Math.random() * 6, vr: (Math.random() - .5) * 0.3, k: Math.random() })));
function drawSectorLayer(s, dt, t) {
  const list = BGX[s];
  for (const o of list) { o.y += o.sp * dt; o.rot += o.vr * dt; if (o.y > H + 120) { o.y = -120; o.x = Math.random() * W; } }
  if (s === 1) for (const o of list) spr(o.k < 0.5 ? 'enemies/split' : 'enemies/rock1', o.x, o.y, o.r * 1.4, o.r * 1.2, o.rot, 0.28);
  if (s === 2) for (const o of list) drawTex(o.k < 0.5 ? 'p_smoke2' : 'p_smoke1', o.k < 0.33 ? '#c060ff' : o.k < 0.66 ? '#ff5ab8' : '#6a5aff', o.x, o.y, o.r * 7, o.rot, 0.13, true);
  if (s === 3) {
    const g = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, H * 0.7);
    g.addColorStop(0, 'rgba(255,40,70,.18)'); g.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    list.slice(0, 3).forEach((o, i) => spr(i % 2 ? 'enemies/boss4_sh' : 'enemies/boss1_sh', o.x, o.y * 0.6 + 80, 150 + o.r * 2, 130 + o.r * 2, 0, 0.35));
  }
  if (s === 0) for (const o of list.slice(0, 4)) drawTex('p_light', '#48c8ff', o.x, o.y, o.r * 3, o.rot, 0.06, true);
  if (s === 4) for (const o of list) { spr('enemies/rock2', o.x, o.y, o.r * 0.9, o.r * 0.8, o.rot, 0.22); if (o.k < 0.4) drawTex('p_star', '#dff8ff', o.x, o.y, o.r * 1.2, o.rot, 0.25, true); }
  if (s === 5) {
    drawTex('p_ring', '#ffb84a', W / 2, 150, 420, t * 0.05, 0.14, true);
    const g = ctx.createRadialGradient(W / 2, 150, 10, W / 2, 150, 120);
    g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(W / 2 - 120, 30, 240, 240);
  }
}
function drawBg(dt, planetIdx = 0) {
  const t = performance.now() / 1000;
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#05041a'); gr.addColorStop(0.55, '#110a2c'); gr.addColorStop(1, '#07071a');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  nebY = (nebY + dt * 6) % H;
  ctx.drawImage(NEBULA, 0, nebY - H); ctx.drawImage(NEBULA, 0, nebY);
  ctx.globalAlpha = 0.85;
  ctx.drawImage(PLANETS[planetIdx], W - 190, 110 + Math.sin(t * 0.2) * 8);
  ctx.globalAlpha = 1;
  if (S.stage && S.mode !== 'map') drawSectorLayer(planetIdx, dt, t);
  for (const s of STARS) {
    s.y += s.sp * dt;
    if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
    const a = s.a * (0.65 + 0.35 * Math.sin(t * 3 + s.tw));
    ctx.fillStyle = `rgba(215,228,255,${a})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz * (1 + s.layer * 1.5));
    if (s.layer === 2) drawGlow('#9fc8ff', s.x + 1, s.y + 2, 6, a * 0.5);
  }
  gridY = (gridY + dt * 24) % 48;
  ctx.strokeStyle = 'rgba(80,200,255,.045)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 60 + gridY; y < LINE_Y; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  for (let x = 30; x < W; x += 80) { ctx.moveTo(x, 60); ctx.lineTo(x, LINE_Y); }
  ctx.stroke();
}
// 블룸: 밝은 부분만 흐리게 번져 보이게 한다 (화면 효과를 끄면 꺼짐)
const BLOOM = document.createElement('canvas'), bctx = BLOOM.getContext('2d');
const BLOOM2 = document.createElement('canvas'), b2ctx = BLOOM2.getContext('2d');   // 더 넓고 부드러운 두 번째 번짐
function applyBloom() {
  if (!SET().fx || LOWFX || !('filter' in ctx)) return;
  const bw = Math.max(1, cv.width >> 2), bh = Math.max(1, cv.height >> 2);
  const fresh = BLOOM.width !== bw || BLOOM.height !== bh;
  if (fresh) { BLOOM.width = bw; BLOOM.height = bh; }
  UI.bloomF = (UI.bloomF || 0) + 1;
  if (fresh || UI.bloomF % 2 === 0) {
  bctx.globalCompositeOperation = 'copy';
  bctx.filter = 'brightness(0.62) contrast(3.2) blur(3px)';
  bctx.drawImage(cv, 0, 0, bw, bh);
  bctx.filter = 'none';
  const w2 = Math.max(1, bw >> 1), h2 = Math.max(1, bh >> 1);
  if (BLOOM2.width !== w2 || BLOOM2.height !== h2) { BLOOM2.width = w2; BLOOM2.height = h2; }
  b2ctx.globalCompositeOperation = 'copy';
  b2ctx.filter = 'blur(4px)';
  b2ctx.drawImage(BLOOM, 0, 0, w2, h2);
  b2ctx.filter = 'none';
  // 넓은 번짐을 작은 번짐 위에 미리 더해 두고, 화면에는 한 번만 덮는다
  bctx.globalCompositeOperation = 'lighter'; bctx.globalAlpha = 0.75;
  bctx.drawImage(BLOOM2, 0, 0, bw, bh);
  bctx.globalAlpha = 1;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32;
  ctx.drawImage(BLOOM, 0, 0, cv.width, cv.height);
  ctx.restore();
}
let GRADE = null;
function applyGrade() {
  if (!SET().fx || LOWFX) return;
  ctx.save(); ctx.globalCompositeOperation = 'soft-light';
  if (!GRADE) { GRADE = ctx.createLinearGradient(0, 0, 0, H); GRADE.addColorStop(0, 'rgba(40,90,200,.5)'); GRADE.addColorStop(0.55, 'rgba(90,70,170,.3)'); GRADE.addColorStop(1, 'rgba(255,150,70,.35)'); }
  ctx.fillStyle = GRADE; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// 충격파 굴절: 퍼지는 고리 모양으로 잘라, 그 안의 화면을 살짝 확대해 다시 그린다
function shockwave(x, y, r) {
  if (!S.waves) S.waves = [];
  if (S.waves.length >= 3) S.waves.shift();
  S.waves.push({ x, y, r, t: 0, life: 0.55 });
}
function drawShockwaves() {
  if (!SET().fx || !S.waves) return;
  for (const w of S.waves) {
    const p = w.t / w.life, r = 20 + p * w.r, band = 30 * (1 - p);
    ctx.save();
    ctx.beginPath(); ctx.arc(w.x, w.y, r + band, 0, Math.PI * 2); ctx.arc(w.x, w.y, Math.max(0, r - band), 0, Math.PI * 2, true); ctx.clip();
    const z = 1 + 0.06 * (1 - p);
    ctx.translate(w.x, w.y); ctx.scale(z, z); ctx.translate(-w.x, -w.y);
    ctx.drawImage(cv, 0, 0, W, H);
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 * (1 - p);
    ctx.strokeStyle = '#cfefff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
let OVL = null;
function drawOverlay() {
  if (!SET().fx) return;
  // 스캔라인과 가장자리 어둠은 한 장으로 구워 두고 한 번만 덮는다 (화면 크기가 바뀌면 다시)
  if (!OVL || OVL.width !== cv.width || OVL.height !== cv.height) {
    OVL = document.createElement('canvas'); OVL.width = cv.width; OVL.height = cv.height;
    const g = OVL.getContext('2d'), k = cv.width / W; g.scale(k, k);
    g.globalAlpha = 0.18; g.fillStyle = g.createPattern(SCAN, 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,8,.45)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(OVL, 0, 0); ctx.restore();
  ctx.save();
  const t = performance.now() / 1000, sy = (t * 140) % (H + 200) - 100;
  const g = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
  g.addColorStop(0, 'rgba(120,220,255,0)'); g.addColorStop(0.5, 'rgba(120,220,255,.05)'); g.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, sy - 60, W, 120);
  ctx.restore();
  if (S.glitch > 0) {
    for (let k = 0; k < 5; k++) {
      if (Math.random() > S.glitch * 1.6) continue;
      const y = Math.random() * H, h = 2 + Math.random() * 10;
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,40,120,.28)' : 'rgba(40,240,255,.28)';
      ctx.fillRect((Math.random() - .5) * 30, y, W, h);
    }
  }
}

function drawFlame(x, y, len, wid, color, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  const gr = ctx.createLinearGradient(x, y, x, y + len);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.3, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(x - wid, y);
  ctx.quadraticCurveTo(x - wid * .6, y + len * .5, x, y + len);
  ctx.quadraticCurveTo(x + wid * .6, y + len * .5, x + wid, y);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  drawGlow(color, x, y + len * 0.3, wid * 2.6, 0.45 * alpha);
}

// 큰 그림을 화면에 그릴 크기로 한 번만 줄여 둔다. 매 프레임 300px을 60px로 줄여 그리지 않게 (8px 단위, 그림마다 최대 10개)
function fitImg(img, dw, dh) {
  const px = cv.width / W, tw = Math.ceil(dw * px / 8) * 8, th = Math.ceil(dh * px / 8) * 8;
  if (!img.width || tw * 1.5 > img.width) return img;
  const m = img._fit || (img._fit = new Map()), key = tw + 'x' + th;
  let c = m.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = tw; c.height = th;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, tw, th);
    if (m.size >= 10) m.delete(m.keys().next().value);
    m.set(key, c);
  }
  return c;
}
// 기체 그림 (칸 위, 대기함, 격납고 카드 공통)
function drawUnitArt(type, lv, x, y, s, alpha, u) {
  const def = UNIT[type], m = Math.min(lv, 3), t = performance.now() / 1000;
  const L = n => { for (let k = Math.min(lv, 8); k >= 4; k--) if (IMG[n + '_l' + k]) return n + '_l' + k; return n; };
  // 초월 III은 광택이 무지개색으로 돈다
  const SH = n => lv >= 8 && IMG[n + '_r0'] ? n + '_r' + (Math.floor(t * 6 + x * 0.02) % 6) : L(n);
  const shine = lv >= 4 ? (lv >= 8 ? 0.45 : lv >= 6 ? 0.3 : lv >= 5 ? 0.22 : 0.14) + 0.12 * Math.sin(t * 3 + x * 0.1) : 0;
  const ang = u ? u.ang : -Math.PI / 2, kick = u ? (u.kick || 0) : 0, flash = u ? (u.flash || 0) : 0;
  const col = def.col;
  let tier = Math.min(lv, 8), NI = IMG['units/' + type + tier];
  while (tier > 1 && !(NI && NI.width)) NI = IMG['units/' + type + --tier];   // 그 레벨 그림이 없으면 아래 단계 그림
  if (NI && NI.width) {
    // 배율은 종류마다 Lv5 본체가 칸에 맞는 크기로 고정. 모든 단계 그림이 같은 배율로 저장돼 있어서
    // 낮은 단계는 작게, Lv6~8은 본체 크기 그대로 홀로그램 날개만 칸 밖으로 퍼진다
    const dm = shapeDims(type), RI = IMG['units/' + type + '5'] && IMG['units/' + type + '5'].width ? IMG['units/' + type + '5'] : NI;
    const [bw, bh] = def.shape === 'h2' ? [150, 76] : def.shape === 'v2' ? [74, 152] : def.shape === 1 ? [70, 78] : def.shape === 'h3' ? [dm.w * CW - 10, CH * 1.25] : [dm.w * CW - 10, dm.h * CH - 8];   // 가로 3칸은 위아래로 살짝 넘쳐도 폭을 채운다
    const k = u ? s / U_SCALE / (1 + (lv - 1) * 0.05) : s * Math.max(def.iw, def.ih) / Math.max(bw, bh);
    const sc = Math.min(bw * k / RI.width, bh * k / RI.height, 1.3 * bw * k / NI.width, 1.3 * bh * k / NI.height), dw = NI.width * sc, dh = NI.height * sc, ky = kick * 30;   // 날개가 칸의 1.3배를 넘을 때만 줄인다
    const turns = def.rot || type === 't', rot = turns ? ang + Math.PI / 2 : 0;
    if (type === 'x') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha * 0.35;
      ctx.translate(x, y); ctx.rotate(t * 2);
      const g = ctx.createLinearGradient(0, 0, 40 * k, 0); g.addColorStop(0, '#48ffd8'); g.addColorStop(1, 'rgba(72,255,216,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 44 * k, -0.4, 0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (lv >= 6 && u && tier < lv) drawGlow(col, x, y + 4, 44 * k * (lv >= 8 ? 1.15 : 1), 0.35 + 0.12 * Math.sin(t * 4), 0.8);
    if (def.air) drawFlame(x, y + dh * 0.44 + ky, (8 + lv * 3) * (0.8 + Math.random() * 0.35) * k, 3 + tier, col, alpha * 0.8);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y - 2 + ky); if (rot) ctx.rotate(rot);
    ctx.drawImage(fitImg(NI, dw, dh), -dw / 2, -dh / 2, dw, dh);
    if (lv >= 6 && tier < lv) {
      const TI = IMG['units/' + type + '5_' + (lv >= 8 ? ['l6', 'l7', 'l8'][Math.floor(t * 4) % 3] : 'l' + lv)];
      if (TI && TI.width) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * (0.28 + 0.12 * Math.sin(t * 3 + x * 0.1)); ctx.drawImage(TI, -dw / 2, -dh / 2, dw, dh); }
    }
    ctx.restore();
    if (flash > 0) {
      const tx = turns ? x + Math.cos(ang) * dh * 0.5 : x, ty = turns ? y + Math.sin(ang) * dh * 0.5 : y - dh * 0.5;
      drawTex('p_muzzle', col, tx, ty, 34 * k, rot, flash * 12 * alpha); drawGlow('#ffffff', tx, ty, 14 * k, flash * 8 * alpha);
    }
    if (type === 'e' || type === 'k') drawGlow(col, x, y, 22 * k, (0.3 + 0.2 * Math.sin(t * 9)) * alpha);
    return;
  }
  if (type === 'f') {
    const ky = kick * 40, w = [66, 72, 70][m - 1] * s, h = [50, 52, 52][m - 1] * s;
    drawFlame(x, y - 12 + ky + h / 2, (12 + lv * 5) * (0.8 + Math.random() * 0.35) * s, 4 + lv, col, alpha);
    spr(L('f' + m), x, y - 6 + ky, w, h, 0, alpha);
    if (shine > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; spr(SH('f' + m), x, y - 6 + ky, w, h, 0, shine * alpha); ctx.restore(); }
    if (flash > 0) { drawTex('p_muzzle', col, x, y - 16 - h / 2, 34 * s, 0, flash * 13 * alpha); drawGlow('#ffffff', x, y - 8 - h / 2, 16, flash * 10 * alpha); }
    return;
  }
  if (type === 't') {
    spr(L('tbase'), x, y, 62 * s, 62 * s, 0, alpha);
    const bw = [17, 27, 26][m - 1] * 1.4 * s, bh = [38, 41, 41][m - 1] * 1.4 * s;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
    const im = IMG[L('t' + m)];
    if (im && im.width) ctx.drawImage(im, -bw / 2, -bh * 0.8 + kick * 60, bw, bh);
    ctx.restore();
    if (lv >= 3) drawGlow(lv >= 5 ? '#ffd24a' : '#ff6a3a', x, y, 16, (0.5 + 0.3 * Math.sin(t * 6)) * alpha);
    if (flash > 0) { const tip = bh * 0.9; drawTex('p_muzzle', '#ffb060', x + Math.cos(ang) * tip, y + Math.sin(ang) * tip, 40 * s, ang + Math.PI / 2, flash * 13 * alpha); drawGlow('#ffc070', x + Math.cos(ang) * tip, y + Math.sin(ang) * tip, 20, flash * 10 * alpha); }
    return;
  }
  const w = def.iw * s, h = def.ih * s, ky = kick * 30;
  if (def.air) {
    if (type === 'b') for (const ox of [-34, 34]) drawFlame(x + ox * s, y + 28 * s + ky, (16 + lv * 4) * (0.8 + Math.random() * 0.3) * s, 6, col, alpha);
    else drawFlame(x, y + h * 0.35 + ky, (12 + lv * 4) * (0.8 + Math.random() * 0.35) * s, 4 + lv, col, alpha);
  }
  if (type === 'r') drawFlame(x, y + h * 0.48, 16 * s * (0.8 + Math.random() * 0.4), 8, col, alpha * 0.8);
  if (type === 'x') {
    // 레이더 스윕
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha * 0.35;
    ctx.translate(x, y); ctx.rotate(t * 2);
    const g = ctx.createLinearGradient(0, 0, 40 * s, 0); g.addColorStop(0, '#48ffd8'); g.addColorStop(1, 'rgba(72,255,216,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 44 * s, -0.4, 0.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  spr(L(def.img), x, y - 4 + ky, w, h, def.rot ? ang + Math.PI / 2 : 0, alpha);
  if (shine > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; spr(SH(def.img), x, y - 4 + ky, w, h, def.rot ? ang + Math.PI / 2 : 0, shine * alpha); ctx.restore(); }
  if (flash > 0) { drawTex('p_flare', col, x + Math.cos(ang) * h * 0.45, y + Math.sin(ang) * h * 0.45, 44 * s, 0.5, flash * 12 * alpha); }
  if (type === 'e' || type === 'k') drawGlow(col, x, y, 22, (0.3 + 0.2 * Math.sin(t * 9)) * alpha);
}
function drawUnit(u, x, y, alpha = 1, big = 1, onPad = false) {
  const t = performance.now() / 1000;
  const s = (1 + u.pop * 0.8) * big * (1 + (u.lv - 1) * 0.05) * U_SCALE;
  const def = UNIT[u.type];
  const dm = shapeDims(u.type), wide = dm.w > 1 ? dm.w * 0.95 : 1, tall = dm.h > 1 ? dm.h * 0.95 : 1;
  drawGlow(def.col, x, y + 6, 40 * Math.max(wide, tall), (0.08 + 0.03 * Math.sin(t * 2 + x)) * alpha, 0.55 * tall / wide);   // 은은한 바탕 빛은 기체 고유색 (레벨은 계급장으로)
  // 발밑 그림자, 비행 기체는 살짝 둥실거린다
  ctx.fillStyle = `rgba(0,0,0,${0.35 * alpha})`; ctx.beginPath(); ctx.ellipse(x, y + 18 * tall, 26 * s * wide, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (def.air && u.cells) y += Math.sin(t * 2.2 + x * 0.07) * 1.8;
  // 레벨 그림이 없을 때만 발밑 회전 링으로 레벨을 알린다
  if (u.lv >= 4 && !(IMG['units/' + u.type + Math.min(u.lv, 8)] || {}).width) {
    const rc = def.col;
    drawTex('p_ring', rc, x, y + 14 * tall, 84 * s * wide, t * 1.5, (0.55 + 0.2 * Math.sin(t * 3)) * alpha, true, 0.36);
    if (u.lv >= 6) drawTex('p_ring', u.lv >= 8 ? RAINBOW[(Math.floor(t * 6) + 3) % 6] : rc, x, y + 14 * tall, 112 * s * wide, -t * 2.2, 0.4 * alpha, true, 0.36);
    drawTex('p_light', rc, x, y + 12 * tall, 70 * s * wide, -t, 0.3 * alpha, true, 0.4);
  }
  drawUnitArt(u.type, u.lv, x, y, s, alpha, u);
  if (u.hurt > 0) drawGlow('#ff2a3a', x, y, 40 * wide, u.hurt * 2 * alpha, 0.8);
  const bot = y + (tall > 1 ? CH * 0.95 : 26);
  if (!onPad) {
  // 레벨 = 금색 별 개수. 어두운 받침판 위에 그려 기체 그림이나 체력 바에 묻히지 않게. 초월 III(Lv8)만 무지개
  ctx.globalAlpha = alpha; lvBadge(u.lv, x, bot, def.col, big < 1 ? 0.85 : 1); ctx.globalAlpha = 1;
  if (u.maxHp) {
    const bw = wide > 1 ? 110 : 48, bx = x - bw / 2, by = bot + 7, r = Math.max(0, u.hp / u.maxHp);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = r > 0.5 ? '#5fd8ff' : r > 0.25 ? '#ffc04a' : '#ff4a5a'; ctx.fillRect(bx, by, bw * r, 3);
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    for (let k = 1; k < u.maxHp; k++) ctx.fillRect(bx + bw * k / u.maxHp, by, 1, 3);
    ctx.globalAlpha = 1;
  }
  }
  if (u.buffSpd > 0 && u.cells) drawGlow('#48ffd8', x + 22, y - 26, 6, 0.8);
  const rank = Math.floor(mkNow(u.type) / 3);
  if (rank > 0) {
    const cx0 = x - (wide > 1 ? 58 : 26), cy0 = y + 14;
    ctx.globalAlpha = alpha; ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1;
    for (let k = 0; k < rank; k++) { hexPath(cx0, cy0 + 4 - k * 8, 3.6); ctx.fill(); ctx.stroke(); }   // 연구 등급: 격납고 Mk 배지처럼 작은 육각형 (계급장 꺾쇠와 헷갈리지 않게)
    ctx.globalAlpha = 1;
  }
}

function drawCap(c) {
  const rw = c.rw, look = capLook(rw), col = look.col;
  const jx = c.jit > 0 ? (Math.random() - .5) * 7 : 0, jy = c.jit > 0 ? (Math.random() - .5) * 5 : 0;
  const x = c.x + jx, y = c.y + jy + (c.carrier ? 0 : Math.sin(S.time * 3 + c.bob) * 3);
  const s = 1, sq = c.sq || 0;
  drawGlow(col, x, y, 64, 0.32 + 0.14 * Math.sin(S.time * 4 + c.bob));
  if (look.gold) {   // 황금 캡슐: 기체 색 위에 금빛 테두리
    drawGlow('#ffd24a', x, y, 78, 0.35 + 0.15 * Math.sin(S.time * 6));
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 49, 0, Math.PI * 2); ctx.stroke();
  }
  if (S.focus === c) {
    drawGlow('#ff3040', x, y, 76, 0.28);
    ctx.save(); ctx.translate(x, y); ctx.rotate(S.time * 1.6);
    brackets(-52, -52, 104, 104, 16, '#ff4d5a', 3);
    ctx.restore();
    if (c.y <= FIRE_Y) { ctx.font = FK(14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText('사거리 밖, 들어오면 쏴요', x, y + 66, '#ffb0b0', 3); }
  }
  const ratio = Math.max(0, c.hits / c.maxHits);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x, y, 41, 0, Math.PI * 2); ctx.stroke();
  const segs = 24, on = Math.ceil(segs * ratio);
  ctx.strokeStyle = col;
  for (let k = 0; k < on; k++) {
    const a0 = -Math.PI / 2 + k * Math.PI * 2 / segs;
    ctx.beginPath(); ctx.arc(x, y, 41, a0 + 0.03, a0 + Math.PI * 2 / segs - 0.03); ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(c.tilt || 0); ctx.scale(1 + sq * 0.45, 1 - sq * 0.3); ctx.translate(-x, -y);
  spr(look.cap, x, y, 58 * s, 56 * s);
  if (!rw.heal) {
    const def = UNIT[rw.type], k = Math.min(40 / def.iw, 40 / def.ih);
    ctx.fillStyle = def.col + '50'; ctx.beginPath(); ctx.arc(x, y + 2, 21, 0, Math.PI * 2); ctx.fill();   // 캡슐 속도 기체 고유색
    drawUnitArt(rw.type, rw.lv, x, y + 2, k, 1, null);
  }
  if (c.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, c.flash * 8); spr(look.cap, x, y, 58, 56); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = /[가-힣]/.test(look.label) ? FK(22) : FT(19, 900);
  outlineText(look.label, x, y - 58, look.gold ? '#ffd24a' : '#fff');
  ctx.fillStyle = 'rgba(4,8,22,.92)'; chamfer(x - 22, y + 31, 44, 20, 5); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = FT(12, 900); ctx.fillStyle = '#fff';
  ctx.fillText(String(Math.max(0, c.hits)), x, y + 42);
}

// 맞고 튕긴 만큼 위로 밀어 그린다 (실제 위치는 그대로)
function drawEnemy(e) {
  const o = e.kbOff || 0;
  if (!o) return drawEnemyAt(e);
  e.y -= o; drawEnemyAt(e); e.y += o;
}
function drawEnemyAt(e) {
  if (e.ph > 0 && !e.ghostDraw) { ctx.save(); ctx.globalAlpha *= 0.22; e.ghostDraw = true; drawEnemy(e); e.ghostDraw = false; ctx.restore(); return; }
  if ((e.k === 'grav' || e.k === 'boss6') && !(e.hacked > 0)) {
    drawGlow(e.boss ? '#ffb84a' : '#b86bff', e.x, e.y, e.boss ? 200 : 80, 0.18 + 0.08 * Math.sin(S.time * 4));
    for (const c of S.caps) if (c.pulled > 0) {
      ctx.strokeStyle = e.boss ? 'rgba(255,190,90,.5)' : 'rgba(190,120,255,.55)'; ctx.lineWidth = 3; ctx.setLineDash([5, 7]); ctx.lineDashOffset = S.time * 40;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  if (e.carry) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(e.x, e.y, e.carry.x, e.carry.y);
    gr.addColorStop(0, 'rgba(255,80,90,.7)'); gr.addColorStop(1, 'rgba(255,80,90,.1)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(e.x - 10, e.y + 10); ctx.lineTo(e.x + 10, e.y + 10);
    ctx.lineTo(e.carry.x + 34, e.carry.y); ctx.lineTo(e.carry.x - 34, e.carry.y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  if (e.k === 'healer') drawGlow('#6dff8a', e.x, e.y, 60, 0.25 + 0.1 * Math.sin(S.time * 5));
  if (e.k === 'thief') drawGlow('#ff4a5a', e.x, e.y, 50, 0.3);
  if (e.k === 'shield' && !(e.hacked > 0)) for (const o of S.enemies) if (o.guarded && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 120) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(90,200,255,${0.35 + 0.2 * Math.sin(S.time * 8)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(o.x, o.y); ctx.stroke(); ctx.restore();
    drawGlow('#4ab8ff', o.x, o.y, o.r * 1.2, 0.2);
  }
  const charging = S.attacks.some(a => a.src === e);
  if (charging) drawGlow('#ff2a4a', e.x, e.y, e.r * 2.4, 0.35 + 0.3 * Math.sin(S.time * 18));
  if (e.boss) {
    const p = 0.5 + 0.5 * Math.sin(S.time * 4);
    const bc = { boss1: '#ff3a2a', boss2: '#ff8a3a', boss3: '#4ab8ff', boss4: '#ff3a5a', boss5: '#6ad8ff', boss6: '#ffb84a' }[e.k];
    drawGlow(bc, e.x, e.y - 20, 160, 0.22 + 0.1 * p);
    if (e.rage) drawGlow('#ff2a3a', e.x, e.y, e.r * 2.3, 0.28 + 0.16 * Math.sin(S.time * 9));   // 격노
    if (e.k === 'boss1' || e.k === 'boss4') for (const ox of [-58, 58]) drawGlow('#ff6a3a', e.x + ox, e.y - e.h * 0.45, 26, 0.6 + 0.3 * p, 1.4);
  } else if (ENGINE_COL[e.k] && !(e.frozen > 0) && !(e.hacked > 0)) {
    drawGlow(ENGINE_COL[e.k], e.x, e.y - e.h / 2 + 6, 14 + e.w * 0.12, 0.5 + 0.25 * Math.sin(S.time * 20 + e.x), 1.3);
  }
  const jx = e.jit > 0 ? (Math.random() - .5) * 7 * (e.boss ? 0.4 : 1) : 0, jy = e.jit > 0 ? (Math.random() - .5) * 5 * (e.boss ? 0.4 : 1) : 0;
  // 맞으면 찌그러졌다 돌아오고 살짝 기운다
  const sq = (e.sq || 0) * (e.boss ? 0.35 : 1), ew = e.w * (1 + sq * 0.45), eh = e.h * (1 - sq * 0.3), er = e.rot + (e.tilt || 0);
  if (e.trail) for (const g of e.trail) spr(e.img, g.x, g.y, e.w, e.h, e.rot, g.a);
  spr(e.img + '_sh', e.x + jx + 10, e.y + jy + 18, ew * 0.92, eh * 0.92, er, 0.32);
  spr(e.img, e.x + jx, e.y + jy, ew, eh, er, 1);
  if (e.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fa = Math.min(1, e.flash * 12); spr(e.img, e.x + jx, e.y + jy, ew, eh, er, fa); spr(e.img, e.x + jx, e.y + jy, ew, eh, er, fa * 0.6); ctx.restore(); }
  if (e.tell > 0) drawGlow('#ff3a3a', e.x, e.y, e.r * 2, 0.5 + 0.5 * Math.sin(S.time * 40));
  if (e.heal > 0) drawGlow('#6dff8a', e.x, e.y, e.r * 1.4, e.heal * 1.5);
  if (e.boss && e.weak > 0) {
    const pz = 0.5 + 0.5 * Math.sin(S.time * 10);
    drawGlow('#ffd24a', e.x, e.y + 10, 70 + 20 * pz, 0.7);
    ctx.save(); ctx.translate(e.x, e.y + 10); ctx.rotate(S.time * 2);
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 34 + 6 * pz, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -30); ctx.stroke(); }
    ctx.restore();
  }
  // 상태 이상
  if (e.frozen > 0) {
    drawGlow('#9ff0ff', e.x, e.y, e.r * 1.5, 0.55);
    ctx.strokeStyle = 'rgba(200,250,255,.8)'; ctx.lineWidth = 2; hexPath(e.x, e.y, e.r * 1.05); ctx.stroke();
  } else if (e.slowT > 0) drawGlow('#6ab8ff', e.x, e.y, e.r * 1.1, 0.25);
  if (e.stun > 0) for (let k = 0; k < 3; k++) { const a = S.time * 8 + k * 2.1; drawGlow('#ffe24a', e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 0.6 + Math.sin(a) * 6, 5, 0.9); }
  if (e.burnT > 0) drawGlow('#ff6a2a', e.x, e.y, e.r * 1.1, 0.25 + 0.15 * Math.sin(S.time * 20));
  if (e.hacked > 0) {
    drawGlow('#5aff9a', e.x, e.y, e.r * 1.6, 0.45);
    ctx.font = FU(10); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5aff9a'; ctx.fillText(`// HACKED ${e.hacked.toFixed(1)}`, e.x, e.y + e.h / 2 + 10);
  }
  if (e.shield > 0) {
    if (!HEX_PAT) HEX_PAT = ctx.createPattern(HEX, 'repeat');
    const r = e.shield / e.maxShield, rad = e.r * 1.35 + 6;
    drawGlow('#4ab8ff', e.x, e.y, rad * 1.1, 0.18 + 0.2 * r + (e.sflash > 0 ? 0.45 : 0));
    if (e.sflash > 0) drawTex('p_spark', '#9fe4ff', e.x, e.y, rad * 2.3, Math.random() * 6, e.sflash * 8);
    ctx.save();
    ctx.beginPath(); ctx.arc(e.x, e.y, rad, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 + 0.2 * r + (e.sflash > 0 ? 0.35 : 0);
    ctx.translate(e.x, e.y + S.time * 10);
    ctx.fillStyle = HEX_PAT; ctx.fillRect(-rad, -rad - S.time * 10, rad * 2, rad * 2);
    ctx.restore();
    ctx.strokeStyle = `rgba(140,220,255,${0.3 + 0.4 * r})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, rad, 0, Math.PI * 2); ctx.stroke();
  }
  const focused = S.focus === e;
  if (focused || e.pending > 0) {
    const bs = e.r * (focused ? 1.5 : 1.25) + Math.sin(S.time * 10) * 2;
    brackets(e.x - bs, e.y - bs, bs * 2, bs * 2, bs * 0.4, focused ? '#ff4d5a' : 'rgba(120,230,255,.55)', focused ? 3 : 1.5);
    if (focused && e.y <= FIRE_Y) { ctx.font = FK(14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; outlineText('사거리 밖, 들어오면 쏴요', e.x, e.y + bs + 14, '#ffb0b0', 3); }
  }
  if (!e.boss && (e.hp < e.maxHp || e.shield < e.maxShield)) {
    // 적 체력: 아군 게이지와 같은 결의 네온 칸 게이지 (붉은 자홍). 깎인 만큼 하얀 잔상이 잠깐 남는다
    const n = 8, bw = Math.max(40, e.w * 0.8), bx = e.x - bw / 2, by = e.y - e.h / 2 - 14, sw = bw / n, r = Math.max(0, e.hp / e.maxHp);
    e.hpLag = e.hpLag == null ? r : Math.max(r, e.hpLag - 0.012);
    const hc = r > 0.5 ? '#ff4a9a' : r > 0.25 ? '#ff5a4a' : '#ff2a3a';
    ctx.fillStyle = 'rgba(12,0,20,.88)'; chamfer(bx - 3, by - 3, bw + 6, 10, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,130,190,.55)'; ctx.lineWidth = 1; ctx.stroke();
    for (let k = 0; k < n; k++) {
      const x0 = bx + k * sw + 0.5, fw = sw - 1.5, f = Math.min(1, Math.max(0, r * n - k)), lg = Math.min(1, Math.max(0, e.hpLag * n - k));
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, by, fw, 4);
      if (lg > f) { ctx.fillStyle = 'rgba(255,225,235,.8)'; ctx.fillRect(x0 + fw * f, by, fw * (lg - f), 4); }
      if (f > 0) { ctx.fillStyle = hc; ctx.fillRect(x0, by, fw * f, 4); }
    }
    if (r > 0) drawGlow(hc, bx + bw * r, by + 2, 9, 0.6);
    if (e.maxShield) {
      const sr = Math.max(0, e.shield / e.maxShield);
      ctx.fillStyle = 'rgba(0,10,24,.85)'; ctx.fillRect(bx - 1, by - 8, bw + 2, 4);
      ctx.fillStyle = '#6ad0ff'; ctx.fillRect(bx, by - 7, bw * sr, 2);
      if (sr > 0) drawGlow('#6ad0ff', bx + bw * sr, by - 6, 7, 0.6);
    }
  }
  if (charging && !e.boss && !(e.hacked > 0)) {   // 이름표는 빼고, 노릴 때만 표시
    ctx.font = FU(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff6a7a'; ctx.fillText('▲ LOCK', e.x, e.y + e.h / 2 + 10);
  }
}

function drawAttacks() {
  for (const a of S.attacks) {
    const p = Math.min(1, a.t / a.warn), pulse = 0.5 + 0.5 * Math.sin(S.time * (10 + p * 20));
    const m = cellsCenter(a.cells);
    if (a.src) {
      ctx.strokeStyle = `rgba(255,60,90,${0.3 + 0.4 * p})`; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -S.time * 40;
      ctx.beginPath(); ctx.moveTo(a.src.x, a.src.y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const c of a.cells) {
      const q = cellPos(c), x = q.x - CW / 2 + 3, y = q.y - CH / 2 + 3, w = CW - 6, h = CH - 6;
      const jam = a.kind === 'jam';   // 교란은 노란 칸
      ctx.fillStyle = a.kind === 'freeze' ? `rgba(120,220,255,${0.14 + 0.2 * pulse * (0.5 + p)})` : jam ? `rgba(220,255,60,${0.12 + 0.2 * pulse * (0.5 + p)})` : `rgba(255,30,60,${0.12 + 0.2 * pulse * (0.5 + p)})`;
      chamfer(x, y, w, h, 8); ctx.fill();
      ctx.save(); chamfer(x, y, w, h, 8); ctx.clip();
      ctx.fillStyle = jam ? `rgba(230,255,90,${0.18 + 0.12 * p})` : `rgba(255,60,80,${0.18 + 0.12 * p})`;
      const o = (S.time * 50) % 18;
      for (let sx = x - h + o; sx < x + w; sx += 18) { ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + h, y); ctx.lineTo(sx + h + 7, y); ctx.lineTo(sx + 7, y + h); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = jam ? `rgba(230,255,90,${0.5 + 0.5 * pulse})` : `rgba(255,80,100,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2;
      chamfer(x, y, w, h, 8); ctx.stroke();
      ctx.fillStyle = '#ff4a5a'; ctx.fillRect(x + 6, y + h - 7, (w - 12) * (1 - p), 3);
    }
    if (a.kind === 'meteor') {
      ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.35 * p})`;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 20 + 70 * p, (20 + 70 * p) * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      if (p > 0.6) {
        const k = (p - 0.6) / 0.4, my = m.y - 600 * (1 - k);
        drawFlame(m.x, my - 90, 90, 18, '#ff8a3a');
        spr('enemies/split', m.x, my, 100, 100, S.time * 3);
        drawGlow('#ffb347', m.x, my, 60, 0.7);
      }
    }
    ctx.font = FU(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const top = Math.min(...a.cells.map(c => cellPos(c).y)) - CH / 2 - 8;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    outlineText(`⚠ INCOMING ${(a.warn - a.t).toFixed(1)}`, m.x, Math.max(top, LINE_Y + 6), '#ff6a7a', 3);
    ctx.globalAlpha = 1;
  }
}

function drawShield() {
  const t = S.time;
  const gr = ctx.createLinearGradient(0, LINE_Y - 56, 0, LINE_Y - 12);
  gr.addColorStop(0, 'rgba(80,200,255,0)');
  gr.addColorStop(1, `rgba(80,200,255,${0.18 + 0.07 * Math.sin(t * 2)})`);
  ctx.fillStyle = gr; ctx.fillRect(0, LINE_Y - 56, W, 44);
  if (!HEX_PAT) HEX_PAT = ctx.createPattern(HEX, 'repeat');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07;
  ctx.fillStyle = HEX_PAT; ctx.fillRect(0, LINE_Y - 44, W, 32);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(130,225,255,.85)'; ctx.fillRect(0, LINE_Y - 13, W, 2);
  ctx.restore();
  const sx = ((t * 180) % (W + 300)) - 150;
  drawGlow('#8fe6ff', sx, LINE_Y - 12, 90, 0.55, 0.14);
  for (const h of S.shieldHits) {
    const p = h.t / 0.8;
    drawGlow('#ff3a3a', h.x, LINE_Y - 18, 40 + 100 * p, (1 - p) * 0.95, 0.4);
  }
  // 맞으면 방어막 띠 전체가 빨갛게 번쩍
  const hk = (S.baseHitT || 0) / 0.6;
  if (hk > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,40,50,${0.55 * hk})`; ctx.fillRect(0, LINE_Y - 44, W, 34);
    ctx.fillStyle = `rgba(255,120,120,${0.9 * hk})`; ctx.fillRect(0, LINE_Y - 14, W, 3);
    ctx.restore();
  }
}

// 갑판의 움직이는 부분: 방어막 발생기(빛줄기가 방어막 선까지), 격납 구역 운항등
function drawBaseLive() {
  const t = S.time;
  for (let k = 0; k < 6; k++) {
    const x = 45 + k * 90, y = LINE_Y + 7, pulse = 0.6 + 0.4 * Math.sin(t * 3 + k * 1.3);
    const bg = ctx.createLinearGradient(0, LINE_Y - 13, 0, y);
    bg.addColorStop(0, 'rgba(120,220,255,0)'); bg.addColorStop(1, `rgba(120,220,255,${0.45 * pulse})`);
    ctx.fillStyle = bg; ctx.fillRect(x - 1.5, LINE_Y - 13, 3, y - LINE_Y + 13);
    ctx.fillStyle = '#2e3a5e'; hexPath(x, y, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(170,225,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
    drawGlow('#6ad8ff', x, y, 24, 0.55 * pulse);
    ctx.fillStyle = '#d8f6ff'; hexPath(x, y, 4.5); ctx.fill();
  }
  for (let k = 0; k < 6; k++) {
    const on = (Math.floor(t * 5) + 6 - k) % 6 === 0;
    for (const x of [GRID_X - 3, GRID_X + COLS * CW + 3]) { ctx.fillStyle = on ? '#ffd24a' : 'rgba(255,210,74,.2)'; ctx.fillRect(x - 1, GRID_Y + 18 + k * 46, 2, 7); if (on) drawGlow('#ffd24a', x, GRID_Y + 21 + k * 38, 10, 0.5); }
  }
}
// 기체 틀: 칸 테두리는 기체 고유색(칸 그릴 때), 체력 막대와 계급장(기체를 그린 뒤 맨 위)
// 기체가 차지하는 칸 모양을 작은 판 그림으로 (가운데 cx, cy)
function drawShapeIcon(type, cx, cy, cell, col, label) {
  const pts = SHAPES[UNIT[type].shape], hh = Math.max(...pts.map(p => p[0])) + 1, ww = Math.max(...pts.map(p => p[1])) + 1, g = 2;
  const x0 = cx - (ww * (cell + g) - g) / 2, y0 = cy - (hh * (cell + g) - g) / 2;
  for (let r = 0; r < Math.max(hh, 2); r++) for (let c = 0; c < Math.max(ww, 2); c++) { ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x0 + c * (cell + g), y0 + r * (cell + g), cell, cell); }
  for (const [r, c] of pts) { ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x0 + c * (cell + g), y0 + r * (cell + g), cell, cell); ctx.globalAlpha = 1; }
  if (label) { ctx.font = FK(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(210,230,255,.8)'; ctx.fillText(label, cx, y0 - 14); }
}
// 합칠 수 있는 짝 표시: 흰 원에 서로 다가가는 두 화살표
const MERGE_COL = '#ffffff';   // 흰색: 어느 기체 고유색과도 안 겹친다
function mergeBadge(x, y, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = MERGE_COL; ctx.strokeStyle = 'rgba(0,6,20,.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#06122a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-1.5, 0); ctx.lineTo(-6, 3); ctx.moveTo(6, -3); ctx.lineTo(1.5, 0); ctx.lineTo(6, 3); ctx.stroke();
  ctx.restore();
}
// 기체 고유색으로 칸 바닥 물들이기 (판, 격납고, 편성 칸, 카드가 같은 색을 쓴다)
function unitTint(x, y, w, h, col, c = 9, k = 1) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col + Math.round(0xa8 * k).toString(16).padStart(2, '0')); g.addColorStop(1, col + Math.round(0x50 * k).toString(16).padStart(2, '0'));
  ctx.fillStyle = g; chamfer(x, y, w, h, c); ctx.fill();
}
// 레벨 계급장: 꺾쇠 1~3개(Lv1~3), 별 1~2개(Lv4~5), 날개 달린 별(초월 Lv6~8, 날개 깃이 1~3개). 테두리는 기체 고유색
const RANK_GOLD = '#ffd24a';
function lvBadge(lv, cx, cy, col, sc = 1) {
  const hw = lv >= 6 ? 17 : 12, hh = lv <= 3 ? 10 + (lv - 1) * 2 : lv === 5 ? 15 : lv >= 6 ? 12 : 10;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,6,20,.94)'; chamfer(-hw, -hh, hw * 2, hh * 2, 5); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  rankIcons(lv);
  ctx.restore();
}
// 판 위 기체: 칸 오른쪽 위 모서리에 딱 붙은 계급장 탭 (ㄱ자 기체처럼 모서리가 빈 모양은 맨 윗줄 오른쪽 칸 기준)
function rankCorner(u, col) {
  const top = Math.min(...u.cells.map(c => Math.floor(c / COLS))), c0 = Math.max(...u.cells.filter(c => Math.floor(c / COLS) === top).map(c => c % COLS));
  const rx = GRID_X + (c0 + 1) * CW - 4, ty = GRID_Y + top * CH + 4, lv = u.lv, s = 0.8;
  const tw = lv >= 6 ? 30 : 23, th = lv <= 3 ? 11 + lv * 4.6 : lv === 5 ? 30 : lv >= 6 ? 23 : 20;
  ctx.fillStyle = 'rgba(0,6,20,.92)'; ctx.beginPath();
  ctx.moveTo(rx - tw + 5, ty); ctx.lineTo(rx - 6, ty); ctx.lineTo(rx, ty + 6); ctx.lineTo(rx, ty + th); ctx.lineTo(rx - tw + 5, ty + th); ctx.lineTo(rx - tw, ty + th - 5); ctx.lineTo(rx - tw, ty + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); ctx.translate(rx - tw / 2, ty + th / 2); ctx.scale(s, s); rankIcons(lv); ctx.restore();
}
function rankIcons(lv) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (lv <= 3) {
    ctx.strokeStyle = RANK_GOLD; ctx.lineWidth = 2.6;
    for (let k = 0; k < lv; k++) { const y = (k - (lv - 1) / 2) * 5.5 + 2.5; ctx.beginPath(); ctx.moveTo(-6.5, y); ctx.lineTo(0, y - 5); ctx.lineTo(6.5, y); ctx.stroke(); }
  } else if (lv <= 5) {
    for (let k = 0; k < lv - 3; k++) drawStar(0, (k - (lv - 4) / 2) * 12.5 + 0.5, 7, RANK_GOLD);   // 별 둘은 위아래로 쌓아 폭을 좁게
  } else {
    const star = lv >= 8 ? RAINBOW[Math.floor(performance.now() / 180) % 6] : RANK_GOLD;
    ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 2.2;
    for (const s of [-1, 1]) for (let k = 0; k < lv - 5; k++) { ctx.beginPath(); ctx.moveTo(s * 7.5, -1 + k * 4); ctx.lineTo(s * 14, -6 + k * 5); ctx.stroke(); }   // 짧은 날개 (깃 1~3개)
    drawStar(0, 0.5, 7.5, star);
  }
}
function unitBox(u) {
  const xs = u.cells.map(c => c % COLS), ys = u.cells.map(c => Math.floor(c / COLS));
  const x = GRID_X + Math.min(...xs) * CW + 4, y = GRID_Y + Math.min(...ys) * CH + 4;
  return { x, y, w: (Math.max(...xs) - Math.min(...xs) + 1) * CW - 8, h: (Math.max(...ys) - Math.min(...ys) + 1) * CH - 8 };
}
// 테두리: 기체 고유색 그대로, 레벨이 오를수록 화려하게. Lv2 굵게, Lv3 안쪽 두 줄, Lv4 모서리 장식, Lv5 빛나는 테두리, 초월 테두리를 따라 흐르는 빛
function frameFx(lv, boxes, col, t) {
  if (lv >= 5) for (const b of boxes) drawGlow(col, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.55, 0.12 + 0.04 * lv / 8 + 0.04 * Math.sin(t * 3), 1);
  ctx.save();
  if (lv >= 5) { ctx.shadowColor = col; ctx.shadowBlur = 6 + (lv - 5) * 3; }
  ctx.strokeStyle = col; ctx.lineWidth = lv >= 6 ? 3.2 : lv >= 2 ? 2.6 : 1.8;
  for (const b of boxes) { chamfer(b.x, b.y, b.w, b.h, 9); ctx.stroke(); }
  ctx.shadowBlur = 0;
  if (lv >= 3) { ctx.globalAlpha *= 0.55; ctx.lineWidth = 1.2; for (const b of boxes) { chamfer(b.x + 4, b.y + 4, b.w - 8, b.h - 8, 7); ctx.stroke(); } ctx.globalAlpha /= 0.55; }
  if (lv >= 4) {   // 모서리 장식: 밝은 ㄴ자 쇠붙이
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha *= 0.75; ctx.lineWidth = 2;
    for (const b of boxes) for (const [cx, cy, sx, sy] of [[b.x, b.y + 9, 1, 1], [b.x + b.w, b.y + b.h - 9, -1, -1]]) { ctx.beginPath(); ctx.moveTo(cx, cy + sy * 10); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 9, cy - sy * 9); ctx.stroke(); }
    ctx.globalAlpha /= 0.75;
  }
  if (lv >= 6) {   // 초월: 테두리를 따라 도는 흰 빛줄기 (Lv7, Lv8은 줄기가 늘어난다)
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.shadowColor = col; ctx.shadowBlur = 10;
    for (const b of boxes) { const per = 2 * (b.w + b.h); ctx.setLineDash([per * 0.09, per / (lv - 4) - per * 0.09]); ctx.lineDashOffset = -t * per * 0.35; chamfer(b.x, b.y, b.w, b.h, 9); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.restore();
}
// 바닥: 레벨이 오를수록 색이 진해지고, Lv4부터 옅은 사선 무늬, 초월은 바닥을 가로지르는 빛
function floorFx(lv, x, y, w, h, col, t) {
  unitTint(x, y, w, h, col, 9, Math.min(1.35, 0.9 + lv * 0.06));
  if (lv < 4) return;
  ctx.save(); chamfer(x, y, w, h, 9); ctx.clip();
  ctx.strokeStyle = col; ctx.globalAlpha = 0.16 + 0.03 * (lv - 4); ctx.lineWidth = 2;
  for (let k = -h; k < w; k += 12) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
  if (lv >= 6) {
    const p = ((t * 0.45) % 1.6) * (w + h) - h, g = ctx.createLinearGradient(x + p, y + h, x + p + 40, y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.1 + 0.05 * (lv - 6)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
function drawUnitFrames(top) {
  const t = S.time;
  for (const u of gridUnits()) {
    const { x, y, w, h } = unitBox(u), col = UNIT[u.type].col;
    ctx.globalAlpha = drag && drag.unit === u && drag.moved ? 0.3 : 1;
    if (!top) {
      const boxes = uSize(u) === (w + 8) / CW * (h + 8) / CH ? [{ x, y, w, h }] : u.cells.map(c => { const q = cellPos(c); return { x: q.x - CW / 2 + 4, y: q.y - CH / 2 + 4, w: CW - 8, h: CH - 8 }; });
      frameFx(u.lv, boxes, col, t + u.cells[0] * 0.3);
    } else {
      if (u.maxHp) {
        // 체력: 칸 왼쪽 가장자리의 굵은 세로 게이지 (늘 또렷하게, 위험하면 빨갛게 깜빡)
        const r = Math.max(0, u.hp / u.maxHp), n = u.maxHp, gx = x + 4, gy = y + 9, gh = h - 24, seg = gh / n;
        const hc = r > 0.5 ? '#5affa0' : r > 0.25 ? '#ffc04a' : '#ff4a5a';
        ctx.fillStyle = 'rgba(0,6,20,.92)'; ctx.fillRect(gx - 2, gy - 2, 11, gh + 4);
        ctx.strokeStyle = 'rgba(220,240,255,.55)'; ctx.lineWidth = 1; ctx.strokeRect(gx - 2, gy - 2, 11, gh + 4);
        for (let k = 0; k < n; k++) {
          const on = k < Math.ceil(u.hp - 1e-6), sy0 = gy + gh - (k + 1) * seg + 1;
          ctx.fillStyle = on ? hc : 'rgba(255,255,255,.1)'; ctx.fillRect(gx, sy0, 7, Math.max(1, seg - 2));
        }
        if (r < 1 && r <= 0.25) drawGlow('#ff4a5a', gx + 2, gy + gh / 2, 16, 0.4 + 0.3 * Math.sin(t * 8));
        ctx.globalAlpha = drag && drag.unit === u && drag.moved ? 0.3 : 1;
      }
      rankCorner(u, col);
    }
    ctx.globalAlpha = 1;
  }
}
// 주변 칸에 효과를 주는 기체: 효과가 닿는 칸을 그 기체 색으로 표시. 들고 있으면 놓을 자리 기준으로 진하게
const AURA = { x: { k: 'ring', lv: 1 }, m: { k: 'ring', lv: 1 }, g: { k: 'cross', lv: 1 }, w: { k: 'cross', lv: 3 }, a: { k: 'ring', lv: 5 } };
function auraArea(type, lv, cells) {
  const a = AURA[type];
  if (!a || lv < a.lv || !cells) return null;
  const set = new Set(), own = new Set(cells), rows = openRows();
  for (const c of cells) {
    const r = Math.floor(c / COLS), cc = c % COLS;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (a.k === 'cross' && Math.abs(dr) + Math.abs(dc) !== 1) continue;
      const nr = r + dr, nc = cc + dc, i = nr * COLS + nc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < COLS && !own.has(i)) set.add(i);
    }
  }
  return set;
}
// 구역 바닥: 빈 칸만 기체 색으로 옅게 (기체가 앉은 칸은 외곽선으로 보여 준다)
function drawAuras() {
  const t = S.time, du = drag && drag.moved ? drag.unit : null;
  const paint = (u, cells, strong) => {
    const area = auraArea(u.type, u.lv, cells);
    if (!area) return;
    const col = UNIT[u.type].col;
    for (const i of area) if (!S.slots[i] || S.slots[i] === du) {
      const q = cellPos(i);
      ctx.fillStyle = col; ctx.globalAlpha = strong ? 0.3 + 0.08 * Math.sin(t * 8) : 0.16; chamfer(q.x - CW / 2 + 4, q.y - CH / 2 + 4, CW - 8, CH - 8, 9); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  for (const u of gridUnits()) if (u !== du) paint(u, u.cells, false);
  if (du && AURA[du.type]) { const c = cellAt(drag.x, drag.y); if (c >= 0) paint(du, cellsFor(du, c), true); }
}
// 구역 외곽선: 효과가 닿는 칸 전체를 칸 사이 틈에 굵게 빛나는 선으로 두른다 (기체 그림을 가리지 않는다)
function zoneOutline(set, col, t, strong, k) {
  const rows = openRows(), has = (r, c) => r >= 0 && r < rows && c >= 0 && c < COLS && set.has(r * COLS + c), inset = 1 + k * 3;
  ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = strong ? 5 : 4;
  ctx.shadowColor = col; ctx.shadowBlur = strong ? 16 : 10; ctx.globalAlpha = strong ? 1 : 0.8 + 0.2 * Math.sin(t * 3);
  ctx.beginPath();
  for (const i of set) {
    const r = Math.floor(i / COLS), c = i % COLS, x0 = GRID_X + c * CW + inset, y0 = GRID_Y + r * CH + inset, x1 = GRID_X + (c + 1) * CW - inset, y1 = GRID_Y + (r + 1) * CH - inset;
    if (!has(r - 1, c)) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
    if (!has(r + 1, c)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
    if (!has(r, c - 1)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
    if (!has(r, c + 1)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
  }
  ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 22]); ctx.lineDashOffset = -t * 40; ctx.stroke();   // 선을 따라 흐르는 빛
  ctx.restore();
}
function drawZoneOutlines() {
  const t = S.time, du = drag && drag.moved ? drag.unit : null;
  let k = 0;
  const one = (u, cells, strong) => {
    const area = auraArea(u.type, u.lv, cells);
    if (!area) return;
    for (const c of cells) area.add(c);
    const kk = strong ? 0 : k++ % 3;
    zoneOutline(area, UNIT[u.type].col, t, strong, kk);
    // 구역 종류 표시는 구역마다 하나만, 왼쪽 위 모서리에: 방패(방패 드론, 방벽 요새, 방공 돔), 화살표(레이더), + (수리)
    const c0 = Math.min(...area), x = GRID_X + (c0 % COLS) * CW + 3 + kk * 3, y = GRID_Y + Math.floor(c0 / COLS) * CH + 3 + kk * 3;
    if (u.type === 'm') plusMark(x + 2, y + 2, 8, 1);
    else if (u.type === 'x') arrowMark(x + 2, y + 2, 8, UNIT.x.col, 1);
    else shieldMark(x + 2, y + 2, 9, 1);
  };
  for (const u of gridUnits()) if (u !== du) one(u, u.cells, false);
  if (du && AURA[du.type]) { const c = cellAt(drag.x, drag.y); if (c >= 0) one(du, cellsFor(du, c), true); }
}
// 구역 표시 그림: 방패(방패 드론, 방벽 요새 엄호, 방공 돔), 위쪽 화살표(레이더 강화), 초록 +(수리)
const ZONE_BLUE = '#6ad0ff';
function shieldMark(x, y, r, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.85, y - r * 0.6); ctx.lineTo(x + r * 0.78, y + r * 0.15);
  ctx.quadraticCurveTo(x + r * 0.55, y + r * 0.75, x, y + r); ctx.quadraticCurveTo(x - r * 0.55, y + r * 0.75, x - r * 0.78, y + r * 0.15);
  ctx.lineTo(x - r * 0.85, y - r * 0.6); ctx.closePath();
  ctx.fillStyle = 'rgba(4,16,40,.92)'; ctx.fill(); ctx.strokeStyle = ZONE_BLUE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = ZONE_BLUE; ctx.fillRect(x - 1.2, y - r * 0.55, 2.4, r * 1.2);
  ctx.restore();
}
function arrowMark(x, y, r, col, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x + r * 0.3, y); ctx.lineTo(x + r * 0.3, y + r); ctx.lineTo(x - r * 0.3, y + r); ctx.lineTo(x - r * 0.3, y); ctx.lineTo(x - r * 0.8, y); ctx.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}
function plusMark(x, y, r, a) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(x - r - 1.5, y - r * 0.36 - 1.5, r * 2 + 3, r * 0.72 + 3); ctx.fillRect(x - r * 0.36 - 1.5, y - r - 1.5, r * 0.72 + 3, r * 2 + 3);
  ctx.fillStyle = '#6dff8a'; ctx.fillRect(x - r, y - r * 0.36, r * 2, r * 0.72); ctx.fillRect(x - r * 0.36, y - r, r * 0.72, r * 2);
  ctx.restore();
}
function drawPads() {
  const t = S.time;
  if (S.popRow >= 0 && S.popRow < openRows() && S.lift >= 3 && S.popRow === 2) {   // 셋째 줄이 빈자리에서 튀어 올라오는 중
    const e = S.rowPop || 0;
    for (let c = 0; c < COLS; c++) {
      const p = cellPos(S.popRow * COLS + c), x = p.x - CW / 2 + 4, y = p.y - CH / 2 + 4 + (1 - e) * 70;
      ctx.globalAlpha = Math.max(0, Math.min(1, e * 1.5));
      ctx.fillStyle = 'rgba(20,30,56,.95)'; chamfer(x, y, CW - 8, CH - 8, 9); ctx.fill();
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < COLS * ROWS; i++) {
    // 편대 발진대: 금속 판 + 착륙 표적 + 칸 번호 + 유도등. 줄마다 색(앞 주황, 가운데 청록, 뒤 파랑)
    const p = cellPos(i), x = p.x - CW / 2 + 4, y = p.y - CH / 2 + 4, w = CW - 8, h = CH - 8;
    const r = Math.floor(i / COLS), c = i % COLS, f = S.cellFx[i], fc = f ? CELL_FX[f.k].col : '#5a86c8', u = S.slots[i], lit = u ? UNIT[u.type].col : fc;
    if (r >= openRows() || (r === S.popRow && r === 2)) continue;
    const pg = ctx.createLinearGradient(0, y, 0, y + h);
    pg.addColorStop(0, 'rgba(26,38,66,.94)'); pg.addColorStop(1, 'rgba(7,11,24,.94)');
    ctx.fillStyle = pg; chamfer(x, y, w, h, 9); ctx.fill();
    if (u) floorFx(u.lv, x, y, w, h, lit, t + u.cells[0] * 0.3);   // 기체가 앉은 칸은 바닥을 그 기체 고유색으로 물들인다 (이 색 = 이 기체)
    ctx.strokeStyle = fc; ctx.globalAlpha = f ? 0.85 : u ? 0.6 : 0.3; ctx.lineWidth = f ? 2 : 1.2; ctx.stroke();
    if (f) { ctx.fillStyle = fc; ctx.globalAlpha = 0.1 + 0.05 * f.lv; chamfer(x, y, w, h, 9); ctx.fill(); ctx.globalAlpha = 0.8; ctx.fillRect(x + 12, y, w - 24, 2.5); }   // 강화 칸: 효과 색으로 옅게 칠하고 윗변 띠
    ctx.save(); ctx.translate(p.x, p.y + 4); ctx.rotate(u ? t * 0.5 : 0);
    ctx.strokeStyle = lit; ctx.globalAlpha = u ? 0.55 : 0.2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -20); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    if (u) drawGlow(lit, p.x, p.y + 8, 36, 0.16 + 0.06 * Math.sin(t * 3 + i), 0.5);
    ctx.font = FU(8); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = fc; ctx.globalAlpha = 0.65;
    ctx.fillText('ABCD'[r] + (c + 1), x + 5, y + 5); ctx.globalAlpha = 1;
    if (f) for (let q = 0; q < f.lv; q++) { ctx.fillStyle = fc; hexPath(x + w - 8 - q * 9, y + 9, 3.5); ctx.fill(); }   // 오른쪽 위 단계 표시
    for (let k = 0; k < 5; k++) {
      const on = u && (Math.floor(t * 7) + 50 - k) % 5 === 0;
      ctx.fillStyle = on ? lit : 'rgba(255,255,255,.13)';
      ctx.fillRect(x + 14 + k * (w - 28) / 4 - 2, y + h - 5, 4, 2);
    }
    if (!u && f) {
      ctx.font = FU(9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fc;
      ctx.fillText(fxLabel(f), p.x, p.y + 4);
    }
    if (drag && drag.moved) {
      const du = drag.unit, tu = S.slots[i];
      if (tu && tu !== du && tu.type === du.type && tu.lv === du.lv && du.lv < MAX_LV) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 12);
        drawGlow('#8dff9a', p.x, p.y, 50, 0.3 + 0.3 * pulse);
        ctx.strokeStyle = `rgba(141,255,154,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2.5;
        chamfer(x, y, w, h, 9); ctx.stroke();
      }
    }
  }
  { const gx = GRID_X, gy = GRID_Y, gw = COLS * CW, gh = ROWS * CH;
    brackets(gx - 2, gy - 2, gw + 4, gh + 4, 16, 'rgba(120,220,255,.55)', 2);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    const sy = gy + ((t * 40) % (gh + 80)) - 40, sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
    sg.addColorStop(0, 'rgba(120,220,255,0)'); sg.addColorStop(0.5, 'rgba(120,220,255,.07)'); sg.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(gx, sy - 30, gw, 60); ctx.restore(); }
  drawUnitFrames(false);
  for (let k = 0; k < RES_N; k++) {   // 대기함 칸: 판 위 줄 왼쪽
    const q = resPos(k), hs = RES_W / 2, hot = drag && drag.moved && resAt(drag.x, drag.y) === k;
    ctx.fillStyle = hot ? 'rgba(120,40,110,.9)' : 'rgba(30,10,40,.85)'; chamfer(q.x - hs, q.y - hs, RES_W, RES_W, 7); ctx.fill();
    ctx.strokeStyle = hot ? '#ff8ae0' : 'rgba(255,120,220,.45)'; ctx.lineWidth = hot ? 2 : 1.2;
    if (!S.reserve[k]) { ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]); } else ctx.stroke();
  }
  if (!S.reserve.some(Boolean)) { ctx.font = FK(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,140,220,.75)'; ctx.fillText('대기함', RES_X + (RES_N * (RES_W + 4) - 4) / 2, LINE_Y - 58); }
}
function drawFieldStuff() {
  for (const z of S.zones) {
    const p = z.t / z.life, a = Math.min(1, (1 - p) * 3) * Math.min(1, z.t * 6);
    if (z.rect) {
      const g = ctx.createLinearGradient(0, z.y - z.h, 0, z.y + z.h);
      g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(0.5, `rgba(255,120,40,${0.45 * a})`); g.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, z.y - z.h, W, z.h * 2); ctx.restore();
      for (let x = 20; x < W; x += 45) drawFlame(x, z.y + 10 - 20, 20 + 8 * Math.sin(z.t * 12 + x), 9, '#ff7a2a', 0.8 * a);
      continue;
    }
    drawGlow('#ff5a1a', z.x, z.y, z.r * 1.3, 0.45 * a, 0.5);
    for (let k = 0; k < 5; k++) {
      const ox = Math.sin(z.t * 7 + k * 1.7) * z.r * 0.6, fl = 16 + 10 * Math.sin(z.t * 13 + k * 2.3);
      drawFlame(z.x + ox, z.y + 6 - fl, fl, 7, k % 2 ? '#ffb347' : '#ff5a2a', 0.8 * a);
    }
  }
  for (const f of S.fields.concat(S.holes)) {
    const hole = S.holes.includes(f), p = f.t / f.life, a = Math.min(1, f.t * 5) * Math.min(1, (1 - p) * 4);
    const col = hole ? '#8a3aff' : '#b86bff';
    drawGlow(col, f.x, f.y, f.r * 1.2, 0.35 * a);
    drawTex('p_twirl', col, f.x, f.y, f.r * 2.4, -f.t * (hole ? 7 : 4), 0.55 * a);
    drawTex('p_twirl', '#ffffff', f.x, f.y, f.r * 1.4, -f.t * (hole ? 9 : 5) + 2, 0.3 * a);
    ctx.save(); ctx.translate(f.x, f.y); ctx.globalAlpha = a;
    for (let k = 0; k < 3; k++) {
      const rr = f.r * (1 - ((f.t * 0.8 + k / 3) % 1));
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.rotate(f.t * (hole ? 6 : 3));
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, f.r * 0.5, 0, 1.1); ctx.stroke(); }
    ctx.restore();
    if (hole) { ctx.fillStyle = `rgba(0,0,0,${0.8 * a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, Math.PI * 2); ctx.fill(); drawGlow('#ffffff', f.x, f.y, 30, 0.3 * a); }
  }
  for (const m of S.mines) {
    const blink = Math.sin(S.time * 10 + m.x) > 0;
    drawGlow('#ff4a6a', m.x, m.y, 16, blink ? 0.7 : 0.3);
    spr('mine', m.x, m.y, 22, 22);
    if (m.t < 0.4) { const k = m.t / 0.4; drawGlow('#ff4a6a', m.px + (m.x - m.px) * k, m.py + (m.y - m.py) * k, 10, 1); }
  }
}
function drawStrikes() {
  for (const k of S.strikes) {
    if (k.done) continue;
    const p = k.t / k.delay, col = k.nuke ? '255,110,80' : '255,210,74';
    ctx.save(); ctx.translate(k.x, k.y);
    ctx.strokeStyle = `rgba(${col},${0.4 + 0.6 * p})`; ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.time * 60;
    ctx.beginPath(); ctx.arc(0, 0, k.r * (1.4 - 0.4 * p), 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(S.time * 3);
    for (let q = 0; q < 4; q++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(k.r * 0.25, 0); ctx.lineTo(k.r * 0.55, 0); ctx.stroke(); }
    ctx.restore();
    if (k.nuke) { ctx.font = FU(14); ctx.textAlign = 'center'; outlineText('☢ TACTICAL STRIKE', k.x, k.y - k.r - 10, '#ff8a6a', 3); }
    drawGlow(k.nuke ? '#ff6a4a' : '#ffd24a', k.x, k.y, k.r, 0.15 + 0.35 * p, 0.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = p * 0.6;
    const gr = ctx.createLinearGradient(0, 0, 0, k.y);
    gr.addColorStop(0, 'rgba(255,230,140,0)'); gr.addColorStop(1, 'rgba(255,230,140,.8)');
    ctx.fillStyle = gr; ctx.fillRect(k.x - 3, 0, 6, k.y);
    ctx.restore();
  }
}
function drawBeams() {
  for (const b of S.beams) {
    const p = b.t / b.life;
    const a = Math.min(1, b.t * 8) * Math.min(1, (1 - p) * 4);
    const len = 1200, wid = (b.w ? b.w * 1.4 : 30) * (0.8 + 0.2 * Math.sin(b.t * 40)), pur = b.col === '#b86bff';
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    let gr = ctx.createLinearGradient(0, -wid, 0, wid);
    gr.addColorStop(0, pur ? 'rgba(170,90,255,0)' : 'rgba(255,190,40,0)'); gr.addColorStop(0.5, pur ? 'rgba(190,120,255,.85)' : 'rgba(255,200,60,.85)'); gr.addColorStop(1, pur ? 'rgba(170,90,255,0)' : 'rgba(255,190,40,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, -wid, len, wid * 2);
    gr = ctx.createLinearGradient(0, -wid * 0.3, 0, wid * 0.3);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,240,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, -wid * 0.3, len, wid * 0.6);
    for (let k = 0; k < 8; k++) { const x = ((b.t * 900 + k * 150) % len); ctx.fillStyle = 'rgba(255,245,200,.6)'; ctx.fillRect(x, -wid * 0.55, 30, wid * 1.1); }
    ctx.restore();
    drawGlow(pur ? '#b86bff' : '#ffd24a', b.x, b.y, 50, a);
    drawTex('p_flare', pur ? '#d4a8ff' : '#ffe27a', b.x, b.y, 130, b.t * 3, a);
    drawGlow('#ffffff', b.x, b.y, 22, a);
    if (Math.random() < 0.6) sparks(b.x, b.y, '#ffe27a', 1, 200);
  }
}
function drawBolt(pts, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [lw, c, al] of [[6, col, 0.35], [2, '#ffffff', 0.9]]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.globalAlpha = a * al;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      for (let k = 1; k <= 4; k++) {
        const f = k / 4, jx = k < 4 ? (Math.random() - .5) * 16 : 0, jy = k < 4 ? (Math.random() - .5) * 16 : 0;
        ctx.lineTo(p0.x + (p1.x - p0.x) * f + jx, p0.y + (p1.y - p0.y) * f + jy);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawFx() {
  for (const f of S.fx) {
    if (f.t < 0) continue;
    const p = f.t / f.life;
    switch (f.kind) {
      case 'arrive': {
        if (!f.snd) { f.snd = true; play('arrive', 0.35); }   // 칸에 앉는 순간
        const big = f.big || 1, a = 1 - p;
        drawGlow('#ffffff', f.x, f.y, (40 + 50 * p) * big, a * 0.9);
        drawTex('p_flare', '#ffffff', f.x, f.y, (70 + 60 * p) * big, p * 0.8, a * 1.4);
        ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = a; ctx.lineWidth = 3 * a + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, (14 + 46 * p) * big, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2 + Math.PI / 4, r0 = (18 + 30 * p) * big, r1 = r0 + 14 * a * big; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(ang) * r0, f.y + Math.sin(ang) * r0); ctx.lineTo(f.x + Math.cos(ang) * r1, f.y + Math.sin(ang) * r1); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;
      }
      case 'pop': {   // 격추 순간: 흰 원이 번쩍 부풀고 고리가 퍼진다
        const a = 1 - p;
        drawGlow('#ffffff', f.x, f.y, f.r * (1.2 + 1.6 * p), a * a);
        ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = a; ctx.lineWidth = 7 * a + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.7 + 1.8 * p), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'heal': {   // 수리받은 기체 위로 초록 + 가 떠오른다
        plusMark(f.x + 10, f.y - 6 - p * 30, 8, Math.min(1, p * 6) * (1 - p));
        break;
      }
      case 'hit': {
        const c = f.color || '#7fe0ff', big = (f.big || 1) * 1.3;
        drawGlow(c, f.x, f.y, 26 * big, (1 - p) * 1.0);
        drawTex('p_star2', c, f.x, f.y, (34 + 40 * p) * big, p * 1.5, (1 - p) * 1.2);
        drawTex('p_flare', '#ffffff', f.x, f.y, (20 + 26 * p) * big, 0.6, (1 - p) * 1.2);
        ctx.strokeStyle = c; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, (6 + 26 * p) * big, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 'boom': {
        const z = f.size, r0 = f.rot0 || 0;
        drawTex('p_smoke1', '#6a6478', f.x, f.y - p * 22 * z, (34 + 96 * p) * z, r0 * 2 + p, (1 - p) * 0.5, false);
        drawTex('p_smoke2', '#4a4658', f.x + 8 * z, f.y - p * 30 * z, (26 + 80 * p) * z, -r0, (1 - p) * 0.35, false);
        drawGlow(f.color, f.x, f.y, (30 + 60 * p) * z, (1 - p) * 0.8);
        drawTex('p_fire', f.color, f.x, f.y, (46 + 70 * p) * z, r0 + p, (1 - p) * 1.1);
        drawTex('p_fire', '#fff2c0', f.x, f.y, (28 + 40 * p) * z, -r0 - p * 2, Math.max(0, 0.9 - p * 1.8));
        drawTex('p_scorch', f.color, f.x, f.y, (30 + 120 * p) * z, r0, (1 - p) * 0.8);
        drawTex('p_ring', '#ffe6c8', f.x, f.y, (24 + 170 * p) * z, 0, (1 - p) * 0.55);
        if (p < 0.3) drawTex('p_star', '#ffffff', f.x, f.y, (70 + 200 * p) * z, r0 * 0.5, (0.3 - p) * 3.3);
        break;
      }
      case 'ring': {
        const r = f.grow === -1 ? (f.r0 || 20) * (2 - p) : (f.r0 || 20) + 70 * p;
        ctx.strokeStyle = f.color; ctx.globalAlpha = Math.max(0, 1 - p); ctx.lineWidth = 5 * (1 - p) + 1;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case 'pulse':
        ctx.strokeStyle = f.color; ctx.globalAlpha = (1 - p) * 0.7; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * p, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        drawGlow(f.color, f.x, f.y, f.r * p, (1 - p) * 0.25);
        break;
      case 'beam': {
        const bw = 80 * (1 - p);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p;
        const gr = ctx.createLinearGradient(0, f.y - 300, 0, f.y);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, f.color || 'rgba(140,255,160,.7)');
        ctx.fillStyle = gr; ctx.fillRect(f.x - bw / 2, f.y - 300, bw, 300);
        ctx.restore();
        break;
      }
      case 'scan':
        ctx.save(); ctx.translate(f.x, f.y); ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = f.color; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.rotate(S.time * (k % 2 ? -4 : 5)); ctx.beginPath(); ctx.arc(0, 0, 30 + k * 12 + p * 20, 0, Math.PI * (0.6 + k * 0.3)); ctx.stroke(); }
        ctx.restore();
        break;
      case 'sheet': {
        const im = IMG[f.img];
        if (!im || !im.width) break;
        const fs = im.width / 8, fr = Math.min(31, Math.floor(p * 32));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(f.x, f.y); if (f.rot) ctx.rotate(f.rot);
        ctx.drawImage(im, fr % 8 * fs, Math.floor(fr / 8) * fs, fs, fs, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
        break;
      }
      case 'warp': {
        const a = 1 - p;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, `rgba(200,120,255,${0.5 * a})`); g.addColorStop(1, 'rgba(200,120,255,0)');
        ctx.fillStyle = g; ctx.fillRect(f.x - 3 - 8 * a, 0, 6 + 16 * a, 90); ctx.restore();
        drawGlow('#d49bff', f.x, f.y, 40 * a + 10, a);
        break;
      }
      case 'light': if (SET().fx) drawGlow(f.color, f.x, f.y, f.r, 0.4 * (1 - p) * (1 - p), 0.85); break;
      case 'pillar': {
        const bw = (f.nuke ? 170 : 120) * (1 - p * 0.7);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p;
        const gr = ctx.createLinearGradient(f.x - bw / 2, 0, f.x + bw / 2, 0);
        gr.addColorStop(0, 'rgba(255,200,60,0)'); gr.addColorStop(0.5, f.nuke ? 'rgba(255,230,210,1)' : 'rgba(255,250,220,1)'); gr.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = gr; ctx.fillRect(f.x - bw / 2, 0, bw, f.y);
        ctx.restore();
        ctx.strokeStyle = `rgba(255,230,150,${1 - p})`; ctx.lineWidth = 6 * (1 - p) + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, 40 + 180 * p, (40 + 180 * p) * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'fly': {
        const e = p * p * (3 - 2 * p);
        const x = f.x + (f.tx - f.x) * e, y = f.y + (f.ty - f.y) * e - Math.sin(p * Math.PI) * 60;
        drawGlow(f.color, x, y, 20, 1 - p * 0.5); drawGlow('#ffffff', x, y, 8, 1);
        if (p > 0.9) drawGlow(f.color, f.tx, f.ty, 50, (1 - p) * 8);
        break;
      }
      case 'bolt': drawBolt(f.pts, f.col, 1 - p); break;
      case 'rail': {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang); ctx.globalCompositeOperation = 'lighter';
        const wd = 22 * (1 - p);
        let g = ctx.createLinearGradient(0, -wd, 0, wd);
        g.addColorStop(0, 'rgba(120,255,140,0)'); g.addColorStop(0.5, `rgba(200,255,210,${1 - p})`); g.addColorStop(1, 'rgba(120,255,140,0)');
        ctx.fillStyle = g; ctx.fillRect(0, -wd, 1200, wd * 2);
        ctx.restore();
        break;
      }
      case 'emp':
        for (const [k, c] of [[1, '#ffe24a'], [0.8, '#ffffff']]) { ctx.strokeStyle = c; ctx.globalAlpha = (1 - p) * k; ctx.lineWidth = 4 * (1 - p) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, 40 + 700 * p * k, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;
      case 'frost':
        drawGlow('#9ff0ff', f.x, f.y - 200, 500 * p, (1 - p) * 0.4);
        ctx.strokeStyle = '#c8faff'; ctx.globalAlpha = 1 - p; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, 40 + 700 * p, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      case 'atk': drawAtkFx(f, p); break;
      case 'parts': {
        const tx = f.tx, ty = f.ty;
        for (let k = 0; k < 7; k++) {
          const q = Math.max(0, Math.min(1, p * 1.3 - k * 0.04)), e2 = q * q;
          const x = f.x + (tx - f.x) * e2 + Math.sin(k * 2.1) * 30 * Math.sin(q * Math.PI), y = f.y + (ty - f.y) * e2 - Math.sin(q * Math.PI) * 50;
          drawTex('p_star2', '#ffb347', x, y, 22, k, 1);
        }
        if (p > 0.95 && !f.done) { f.done = true; S.gearPulse = 0.5; play('coin', 0.3, 0.7); }
        break;
      }
      case 'debris': {
        const im = IMG[f.img];
        if (!im || !im.width) break;
        for (const q of f.pcs) {
          const x = f.x + q.ox + q.vx * f.t, y = f.y + q.oy + q.vy * f.t + 260 * f.t * f.t;
          ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p * p); ctx.translate(x, y); ctx.rotate(f.rot + q.vr * f.t);
          ctx.drawImage(im, q.sx, q.sy, im.width / 2, im.height / 2, -f.w / 4, -f.h / 4, f.w / 2, f.h / 2);
          ctx.restore();
          if (p < 0.6) drawGlow('#ff8a3a', x, y, 10, (0.6 - p) * 1.2);
        }
        break;
      }
      case 'coin': {
        const tx = W - 30, ty = S.boss ? 124 : 76, e = p * p;
        const x = f.x + f.sx * Math.sin(p * Math.PI) * 0.6 + (tx - f.x) * e, y = f.y - Math.sin(p * Math.PI) * 50 + (ty - f.y) * e;
        drawCore(x, y, 7 + (1 - p) * 3);
        if (p > 0.92 && !f.snd) { f.snd = 1; S.corePulse = 0.3; play('coin', 0.22, 1.1 + Math.random() * 0.2); }
        if (f.n && p < 0.35) { ctx.font = FT(14, 900); ctx.textAlign = 'center'; outlineText(`+${f.n}`, f.x, f.y - 30 - p * 40, '#bff6ff', 3); }
        break;
      }
    }
  }
}
function drawAtkFx(f, p) {
  const a = 1 - p;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const beamV = (x, y0, y1, w) => {
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,40,70,0)'); g.addColorStop(0.5, `rgba(255,220,230,${a})`); g.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = g; ctx.fillRect(x - w, y0, w * 2, y1 - y0);
  };
  const beamH = (y, w) => {
    const g = ctx.createLinearGradient(0, y - w, 0, y + w);
    g.addColorStop(0, 'rgba(255,40,70,0)'); g.addColorStop(0.5, `rgba(255,220,230,${a})`); g.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - w, W, w * 2);
  };
  if (f.atk === 'snipe' && f.src) {
    const q = cellPos(f.cells[0]);
    ctx.strokeStyle = `rgba(255,90,200,${a})`; ctx.lineWidth = 8 * a + 1;
    ctx.beginPath(); ctx.moveTo(f.src.x, f.src.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.src.x, f.src.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  } else if (f.atk === 'column') beamV(cellPos(f.cells[0]).x, f.src ? f.src.y : 0, H, 34 * (1 - p * 0.6));
  else if (f.atk === 'row') beamH(cellPos(f.cells[0]).y, 34 * (1 - p * 0.6));
  else if (f.atk === 'cross') {
    const rows = new Set(f.cells.map(c => Math.floor(c / COLS))), cols = new Set(f.cells.map(c => c % COLS));
    const r = [...rows].find(r => f.cells.filter(c => Math.floor(c / COLS) === r).length === COLS);
    const c = [...cols].find(c => f.cells.filter(x => x % COLS === c).length === openRows());
    if (r != null) beamH(cellPos(r * COLS).y, 30 * (1 - p * 0.6));
    if (c != null) beamV(cellPos(c).x, f.src ? f.src.y : 0, H, 30 * (1 - p * 0.6));
  }
  ctx.restore();
}

function drawParts() {
  ctx.fillStyle = '#9aa0b8';
  for (const p of S.parts) if (p.kind === 'smoke') {
    const k = 1 - p.t / p.life;
    ctx.globalAlpha = k * 0.3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of S.parts) if (p.kind === 'flame') { const k = 1 - p.t / p.life; drawGlow(p.color, p.x, p.y, p.size * (0.6 + (1 - k) * 1.2), k * 0.8); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const p of S.parts) {
    const k = 1 - p.t / p.life;
    if (p.kind === 'spark') {
      ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = p.size * k + 0.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke();
    } else if (p.kind === 'shard') {
      ctx.globalAlpha = k; ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 10);
      ctx.beginPath(); ctx.moveTo(0, -p.size * 2.2); ctx.lineTo(p.size, p.size); ctx.lineTo(-p.size, p.size); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawShots() {
  for (const s of S.shots) {
    const a = Math.atan2(s.vy, s.vx) + Math.PI / 2;
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    const trail = (tl, lw, c0, c1) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const tg = ctx.createLinearGradient(s.x - ux * tl, s.y - uy * tl, s.x, s.y);
      tg.addColorStop(0, c0); tg.addColorStop(1, c1);
      ctx.strokeStyle = tg; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(s.x - ux * tl, s.y - uy * tl); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.restore();
    };
    switch (s.type) {
      case 'f':
        trail(46, 3 + s.lv * 0.7, 'rgba(80,200,255,0)', 'rgba(80,200,255,.55)');
        drawGlow(LV_COL[s.lv - 1], s.x, s.y, 12 + s.lv * 2, 0.55);
        spr('laser', s.x, s.y, 7 + s.lv, 34, a);
        break;
      case 'p':
        trail(90, 12, 'rgba(170,90,255,0)', s.col + 'e0');
        trail(72, 4, 'rgba(255,255,255,0)', 'rgba(255,255,255,1)');
        drawGlow(s.col, s.x, s.y, 26, 0.8);
        break;
      case 's':
        trail(120, 3, 'rgba(120,255,140,0)', 'rgba(200,255,210,.95)');
        drawGlow('#7dff7a', s.x, s.y, 14, 0.9);
        break;
      case 'g': case 'm': case 'a':
        trail(26, 3, 'rgba(255,255,255,0)', UNIT[s.type].col);
        drawGlow(UNIT[s.type].col, s.x, s.y, 8, 0.7);
        break;
      case 'c':
        trail(30, 5, 'rgba(160,240,255,0)', 'rgba(200,250,255,.8)');
        drawGlow('#9ff0ff', s.x, s.y, 12, 0.9);
        ctx.fillStyle = '#e8ffff'; hexPath(s.x, s.y, 4); ctx.fill();
        break;
      case 'v': {
        const r = 10 + Math.sin(S.time * 20) * 2;
        drawGlow('#b86bff', s.x, s.y, r * 2.4, 0.9);
        ctx.fillStyle = '#10001e'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d8b0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r, S.time * 10, S.time * 10 + 4); ctx.stroke();
        break;
      }
      case 'r':
        drawGlow('#ff8a6a', s.x - ux * 18, s.y - uy * 18, 20, 0.85);
        spr('missile', s.x, s.y, 22, 46, a);
        break;
      case 'bomb': drawGlow('#ffcf5a', s.x, s.y, 12, 0.8); spr('bomblet', s.x, s.y, 12, 17, a); break;
      case 'b':
        drawGlow('#7fe8ff', s.x, s.y, 20, 0.8); drawGlow('#ffffff', s.x, s.y, 7, 1);
        trail(30, 5, 'rgba(127,232,255,0)', 'rgba(127,232,255,.5)');
        break;
      case 'plasma': {
        const r = 22 + Math.sin(S.time * 30) * 3;
        drawGlow('#7fe8ff', s.x, s.y, r * 2.4, 0.9); drawGlow('#ffffff', s.x, s.y, r * 0.8, 1);
        ctx.strokeStyle = 'rgba(190,250,255,.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, S.time * 8, S.time * 8 + 4); ctx.stroke();
        break;
      }
      default:
        drawGlow(s.lv >= 5 ? '#ffd24a' : '#ff8a3c', s.x - ux * 20, s.y - uy * 20, 18, 0.85);
        spr('missile', s.x, s.y, 16 + s.lv * 2, 34 + s.lv * 3, a);
    }
  }
}
function drawDrones() {
  for (const u of gridUnits()) if (u.type === 'd' || u.type === 'y') for (const d of u.drones) {
    if (d.gone > 0) continue;
    drawGlow('#ff6a5a', d.x, d.y, 12, 0.7);
    ctx.fillStyle = '#ffd0c8';
    ctx.beginPath(); ctx.moveTo(d.x, d.y - 7); ctx.lineTo(d.x + 6, d.y + 5); ctx.lineTo(d.x - 6, d.y + 5); ctx.closePath(); ctx.fill();
  }
}

