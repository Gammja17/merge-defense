'use strict';
// ── 기본 설정 ─────────────────────────────────────────────
const W = 540, H = 960;
let LINE_Y = 584;                 // 방어선
const FIRE_Y = 190;                 // 이 아래로 들어와야 사격 가능 (사거리)
const COLS = 6, ROWS = 4, CW = 86, CH = 86, GRID_X = 12;
let GRID_Y = 606;
const RES_X = 12, RES_W = 46, RES_N = 3;    // 대기함: 판 위 줄 왼쪽의 작은 칸 셋
const MAX_LV = 8, U_SCALE = 0.85, DECK_N = 5;
const FT = (s, w = 700) => `${w} ${s}px Orbitron, "Do Hyeon", sans-serif`;
const FU = (s, w = 700) => `${w} ${s}px "Chakra Petch", "Do Hyeon", sans-serif`;
// 작은 글씨는 잘 읽히는 IBM Plex Sans KR, 큰 글씨는 도현체
const FK = (s) => s <= 17 ? `700 ${Math.max(12, Math.round(s * 0.94))}px "Plex KR", "Do Hyeon", "Malgun Gothic", sans-serif` : `${s}px "Do Hyeon", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let scale = 1;
function resize() {
  const cs = getComputedStyle(document.documentElement);
  const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  scale = Math.min(innerWidth / W, (innerHeight - padY) / H);
  const dpr = Math.min(2, window.devicePixelRatio || 1);   // 3배 폰에서 칠할 픽셀을 절반 아래로
  cv.style.width = W * scale + 'px';
  cv.style.height = H * scale + 'px';
  cv.width = Math.round(W * scale * dpr);
  cv.height = Math.round(H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}
addEventListener('resize', resize);
resize();

// ── 에셋 ──────────────────────────────────────────────────
const IMG_NAMES = ['f1','f2','f3','tbase','t1','t2','t3','laser','hit','missile','bomblet','mine',
  'cap_f','cap_t','cap_up','cap_heal','aura2',
  'u_s','u_e','u_d','u_k','u_c','u_a','u_g','u_m','u_x','u_h','u_n','u_v','u_r','u_b',
  ...['p_ring','p_orb','p_fire','p_smoke1','p_smoke2','p_smokering','p_light','p_flare','p_star','p_star2','p_muzzle','p_spark','p_bolt','p_trace','p_scorch','p_twirl','ex1','ex2','ex3','ex4'].map(n => 'fx/' + n),
  ...[...'ftsgmedcabrhnxvkwlqy'].flatMap(t => [1, 2, 3, 4, 5, 6, 7, 8].map(k => 'units/' + t + k)),
  ...['grunt','tank','rusher','shield','minion','heal','thief','sniper','gunship','bomber','elite','rock1','rock2','split','splitS','boss1','boss2','boss3','boss4','phase','grav','boss5','boss6'].map(n => 'enemies/' + n)];
const IMG = {};
function loadImages() {
  return Promise.all(IMG_NAMES.map(n => new Promise(res => {
    const im = new Image();
    im.onload = res; im.onerror = res;
    im.src = 'assets/' + n + (/^(units|enemies)\//.test(n) || /^fx\/ex\d$/.test(n) ? '.webp' : '.png');   // 큰 그림은 WebP
    IMG[n] = im;
  })));
}
// 기존 스프라이트에 색을 입혀 새 적과 기체 변형을 만든다
function makeTint(src, color, key, amount = 0.5, flip = false) {
  const im = IMG[src];
  if (!im || !im.width) return;
  IMG[key] = offscreen(im.width, im.height, g => {
    if (flip) { g.translate(im.width, im.height); g.rotate(Math.PI); }
    g.drawImage(im, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = amount; g.fillStyle = color; g.fillRect(0, 0, im.width, im.height);
  });
}
// 새 그림 비율에 맞춰 적 크기를 다시 잡는다 (긴 변은 그대로)
function fitEnemySizes() {
  for (const d of Object.values(ENEMY)) {
    const im = IMG[d.img]; if (!im || !im.width) continue;
    const m = Math.max(d.w, d.h) * (d.boss ? 1.12 : 1.08), r = im.width / im.height;
    if (r >= 1) { d.w = m; d.h = m / r; } else { d.h = m; d.w = m * r; }
  }
}
function buildTints() {
  const enemyImgs = [...new Set(Object.values(ENEMY).map(d => d.img).concat(['enemies/rock2']))];
  setTimeout(() => { for (const n of enemyImgs) makeTint(n, '#000000', n + '_sh', 1); }, 0);
  makeTint('u_b', '#4ab8ff', 'u_b2', 0.3, true);
  makeTint('u_c', '#6af0ff', 'u_c2', 0.45);
  makeTint('u_v', '#b86bff', 'u_v2', 0.45);
}

// ── 온라인 순위표 (docs/leaderboard: 구글 시트 + Apps Script). 비어 있으면 내 기록만 ──
const LB_URL = 'https://script.google.com/macros/s/AKfycbynNTAN-EhnufymMQg-Oy1ESt2GS9uYpC119zx1HBN6YlFHBAYDstlPyYE5v4dlo9uv/exec';
const LB = { top: null, t: 0, loading: false, err: '' };
// ── 오늘의 도전: 한국 시간 날짜가 같으면 모두 같은 편성, 같은 웨이브, 같은 강화 후보 ──
const dayKey = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
function seedOf(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function mulberry(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = () => (S.rng ? S.rng() : Math.random());   // 웨이브를 짤 때만 씨앗을 쓴다 (전투 중 우연은 그대로)
function dailyDeck(day) {
  const r = mulberry(seedOf('deck' + day)), ones = UNIT_ORDER.filter(t => UNIT[t].shape === 1), deck = [];
  while (deck.length < 2) { const t = ones[Math.floor(r() * ones.length)]; if (!deck.includes(t)) deck.push(t); }   // 1칸 기체 둘은 꼭 (시작 기체와 캡슐)
  while (deck.length < DECK_N) { const t = UNIT_ORDER[Math.floor(r() * UNIT_ORDER.length)]; if (!deck.includes(t)) deck.push(t); }
  return deck;
}
const battleDeck = () => S.daily ? S.daily.deck : PROG.deck.filter(t => isOwned(t));
const LBD = { top: null, t: 0, loading: false, err: '', day: '', ok: null };
function lbFetchDaily(force) {
  const day = dayKey();
  if (!LB_URL || LBD.loading || (!force && LBD.day === day && LBD.t && performance.now() - LBD.t < 30000)) return;
  LBD.loading = true; LBD.err = ''; LBD.day = day;
  fetch(LB_URL + '?daily=' + day).then(r => r.json()).then(d => {
    LBD.ok = d.v >= 2; LBD.top = LBD.ok ? d.top || [] : []; LBD.total = d.total || 0; LBD.t = performance.now();
    if (!LBD.ok) LBD.err = '오늘의 순위는 준비 중이에요';
  }).catch(() => { LBD.err = '순위를 불러오지 못했어요'; LBD.t = performance.now(); }).finally(() => { LBD.loading = false; });
}
function lbFetch(force) {
  if (!LB_URL || LB.loading || (!force && LB.top && performance.now() - LB.t < 30000)) return;
  LB.loading = true; LB.err = '';
  fetch(LB_URL).then(r => r.json()).then(d => { LB.top = d.top || []; LB.total = d.total || 0; LB.t = performance.now(); })
    .catch(() => { LB.err = '순위를 불러오지 못했어요'; LB.t = performance.now(); }).finally(() => { LB.loading = false; });
}
function lbSubmit() {
  const name = (NICK.el ? NICK.el.value : '').trim().slice(0, 12);
  if (!name) { UI.lbMsg = '닉네임을 입력해 주세요'; return; }
  if (S.lbSending || S.lbSent) return;
  if (S.daily && !LBD.ok) { UI.lbMsg = LBD.loading ? '잠시 뒤에 다시 눌러 주세요' : '오늘의 순위는 준비 중이에요'; lbFetchDaily(true); return; }
  PROG.nick = name; save(); S.lbSending = true; UI.lbMsg = '올리는 중...';
  fetch(LB_URL, { method: 'POST', body: JSON.stringify({ name, score: S.score, wave: S.wave, deck: battleDeck().join(''), board: S.lastBoard || '', mode: S.daily ? 'daily' : undefined, day: S.daily ? S.daily.day : undefined }) })
    .then(r => r.json()).then(d => {
      if (d.ok) { S.lbSent = true; UI.lbMsg = `${S.daily ? '오늘의 도전' : '온라인'} ${d.rank}위! (전체 ${d.total}명)`; LB.t = 0; LBD.t = 0; play('levelup', 0.4); }
      else UI.lbMsg = d.err === 'wait' ? '잠시 뒤에 다시 올려 주세요' : '올리지 못했어요';
    }).catch(() => { UI.lbMsg = '연결에 실패했어요. 다시 눌러 주세요'; }).finally(() => { S.lbSending = false; });
}
// 닉네임 입력칸: 캔버스 위에 진짜 입력칸을 띄운다 (그린 프레임에만 보인다)
const NICK = { el: null, show: false };
function nickInput(x, y, w, h) {
  if (!NICK.el) {
    const el = document.createElement('input');
    el.maxLength = 12; el.placeholder = '닉네임'; el.autocomplete = 'off'; el.value = PROG.nick || '';
    Object.assign(el.style, { position: 'fixed', zIndex: 5, background: 'rgba(8,16,40,.96)', color: '#fff', border: '2px solid #ffd24a', borderRadius: '8px', padding: '0 10px', outline: 'none', boxSizing: 'border-box', fontFamily: '"Plex KR", "Do Hyeon", sans-serif', fontWeight: 700 });
    el.addEventListener('keydown', ev => { if (ev.key === 'Enter') lbSubmit(); });
    document.body.appendChild(el); NICK.el = el;
  }
  const r = cv.getBoundingClientRect(), k = r.width / W;
  Object.assign(NICK.el.style, { left: r.left + x * k + 'px', top: r.top + y * k + 'px', width: w * k + 'px', height: h * k + 'px', fontSize: Math.max(16, Math.round(17 * k)) + 'px', display: 'block' });
  NICK.show = true;
}
const boardList = b => (b || '').split(',').filter(x => /^[a-z][1-8]$/.test(x) && UNIT[x[0]]).map(x => ({ t: x[0], lv: +x[1] }));

// ── 저장 (이 브라우저에만) ────────────────────────────────
const SAVE_KEY = 'mergeDefense.v1';
const DEFAULT_SETTINGS = { sfxVol: 0.8, bgmVol: 0.7, shake: true, fx: true, nums: true };
function freshProg() { return { stars: {}, seen: {}, deck: ['f', 't'], owned: [], credits: 0, mk: {}, records: [], settings: { ...DEFAULT_SETTINGS } }; }
let PROG = freshProg();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s && s.stars) PROG = { ...freshProg(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  if (PROG.settings.sfx === false) PROG.settings.sfxVol = 0;
  if (PROG.settings.bgm === false) PROG.settings.bgmVol = 0;
} catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(PROG)); } catch (e) {} }
const unlocked = n => n === 1 || (PROG.stars[n - 1] || 0) > 0;
const endlessOpen = () => (PROG.stars[5] || 0) > 0;
// 연구소: 기체 종류별 영구 강화 Mk.0~10
const MK_MAX = 10;
const mkOf = t => (PROG.mk && PROG.mk[t]) || 0;
// 오늘의 도전은 모두 같은 조건: 연구 강화를 빼고 겨룬다
const mkNow = t => S.daily ? 0 : mkOf(t);
const mkMul = t => 1 + 0.08 * mkNow(t);
const mkCost = t => Math.round(100 * Math.pow(1.5, mkOf(t)));
const SET = () => PROG.settings;
// SKEAM 업적: SKEAM 안에서 돌 때만 알린다. 같은 업적을 또 알려도 한 번만 센다. 촬영 모드에서는 알리지 않는다
const ach = id => { if (!SHOT && window.SKEAM) SKEAM.unlock(id); };

const SFX_FILES = [
  'twoTone', 'shieldUp', 'shot_a', 'shot_b', 'shot_c', 'shot_big', 'shot_retro', 'boom_s1', 'boom_s2', 'boom_low', 'boom_big', 'hit_1',
  'hit_2', 'shield_hit', 'shield_break', 'coin_1', 'coin_2', 'coin_3', 'base_hit', 'swap', 'deny', 'open', 'close', 'confirm', 'capsule',
  'scrap', 'scrap_low', 'kaboom_s1', 'kaboom_s2', 'thud', 'drums', 'crackle1', 'crackle2', 'shield_crack', 'imp_l1', 'imp_l2',
  'imp_l3', 'imp_h1', 'imp_h2', 'imp_h3', 'imp_s1', 'imp_s2', 'imp_p1', 'imp_p2', 'debris1', 'debris2', 'debris3', 'fire_a', 'fire_b', 'beam', 'tap',
  'hitfx', 'caphit', 'capbreak', 'arrive', 'merge_fx', 'up_fx', 'vo_access', 'zapfx', 'vo_shields', 'vo_prox', 'vo_welcome', 'vo_hostile',
  'boom_fx', 'clear_fx', 'vo_fail', 'click_fx', 'vo_anomaly', 'pulse_fx'];   // 폭발, 클리어 반짝: Lentikula (CC0), 버튼, 위기 박동: Owlish Media (CC0)   // 발사 fire_, 빔, 명중, 합체, 강화, 전자전, 음성 vo_: Lentikula (CC0). tap: Owlish Media (CC0)   // fire_, beam: Sci-Fi Weapon Shots (Lentikula, CC0), tap: Kenney Impact Sounds   // gun_: Gunshot Sounds (Vincent Sevedge, OpenGameArt)   // imp_, debris: Kenney Impact Sounds (CC0)
// 같은 소리의 최소 재생 간격(초). 연사가 많아도 귀가 따갑지 않게
const SFX_GAP = { capbreak: 0.08, arrive: 0.08, caphit: 0.05, vo_access: 3, vo_shields: 5, vo_prox: 6, vo_welcome: 5, vo_hostile: 4, vo_fail: 3, vo_anomaly: 4, pulse_fx: 0.2, zapfx: 0.12, hitfx: 0.06, merge_fx: 0.1, up_fx: 0.15, beam: 0.5, tap: 0.06, thwack: 0.06, twoTone: 1, pew: 0.06, pick: 0.08, drop: 0.08, imp_l: 0.05, imp_h: 0.07, imp_s: 0.09, imp_p: 0.12, debris: 0.08, shot: 0.06, shot_big: 0.1, shot_retro: 0.08, hit: 0.09, boom_s: 0.035, boom_low: 0.08, coin: 0.04, shield_hit: 0.08, zap: 0.08, kaboom: 0.07, thud: 0.14, bosshit: 0.3, crackle: 0.1, drums: 1, shield_crack: 0.1 };
const VARIANTS = { thwack: ['hitfx'], imp_l: ['imp_l1', 'imp_l2', 'imp_l3'], imp_h: ['imp_h1', 'imp_h2', 'imp_h3'], imp_s: ['imp_s1', 'imp_s2'], imp_p: ['imp_p1', 'imp_p2'], debris: ['debris1', 'debris2', 'debris3'], shot: ['fire_a'], shot_retro: ['fire_a'], shot_big: ['fire_b'], pew: ['pew1', 'pew2', 'pew3', 'pew4'], boom_s: ['kaboom_s1', 'kaboom_s2'], hit: ['hit_1', 'hit_2'], coin: ['coin_1', 'coin_2', 'coin_3'],
  kaboom: ['boom_fx'], crackle: ['crackle1', 'crackle2'], bosshit: ['thud'] };
let AC = null, MASTER = null;
const BUF = {}, lastPlay = {};
function loadSfx() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AC = new Ctx(); MASTER = AC.createGain(); MASTER.gain.value = 0.9;
  // 효과음 음색: 저음을 올리고 쨍한 고음을 깎아 묵직하게, 가볍게 눌러 뭉치지 않게 (음악은 따로 나간다)
  const lo = AC.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 150; lo.gain.value = 5;
  const hi = AC.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 4500; hi.gain.value = -2;
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.18;
  MASTER.connect(lo); lo.connect(hi); hi.connect(comp); comp.connect(AC.destination);
  for (const n of SFX_FILES) fetch('assets/sfx/' + n + '.mp3').then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).then(buf => { BUF[n] = buf; }).catch(() => {});
}
const UI_SFX = new Set(['click_fx', 'clear_fx', 'arrive', 'tap', 'merge_fx', 'up_fx', 'click', 'open', 'close', 'confirm', 'deny', 'pick', 'drop', 'latch', 'swap', 'ui_open', 'coin', 'levelup', 'unlock', 'upgrade', 'merge2', 'merge3', 'merge4', 'merge5', 'capsule']);
const SWEEP_SFX = new Set(['pew', 'laser1']);   // 총소리는 미끄러지지 않게
// 사운드 고르기에서 뺀 전자음: 없애거나 고른 계열의 묵직한 소리로 바꾼다
const SFX_REMAP = { click: ['click_fx', 1], zap: ['zapfx', 1], levelup: ['up_fx', 1], upgrade: ['up_fx', 1], unlock: ['vo_access', 1], shieldDown: null, ui_open: null, laser1: ['zapfx', 1.1],
  merge2: ['merge_fx', 1.05], merge3: ['merge_fx', 1], merge4: ['merge_fx', 0.95], merge5: ['merge_fx', 0.9], latch: ['tap', 1], drop: ['tap', 0.9], pick: ['tap', 1.1] };
function play(n, vol = 0.4, rate = 1, jitter = 0.06) {
  if (!SET().sfxVol || !AC) return;
  if (n in SFX_REMAP) { const m = SFX_REMAP[n]; if (!m) return false; n = m[0]; rate *= m[1]; }
  if (n.startsWith('vo_')) { rate = 1; jitter = 0; }   // 음성은 원래 목소리 그대로
  const now = AC.currentTime;
  if (lastPlay[n] && now - lastPlay[n] < (SFX_GAP[n] || 0.02)) return false;
  lastPlay[n] = now;
  const name = VARIANTS[n] ? VARIANTS[n][Math.floor(Math.random() * VARIANTS[n].length)] : n;
  const buf = BUF[name];
  if (!buf) return false;
  const src = AC.createBufferSource(), g = AC.createGain();
  src.buffer = buf;
  // 무기와 타격음은 음을 낮춰 무게감을, 발사음은 높은음에서 낮은음으로 미끄러져 "쥐잉". 버튼 같은 소리는 그대로
  let r = rate * (1 + (Math.random() - .5) * 2 * jitter);
  if (!UI_SFX.has(n) && !n.startsWith('vo_')) r *= 0.94;
  src.playbackRate.value = r;
  if (SWEEP_SFX.has(n)) { src.playbackRate.setValueAtTime(r * 1.2, now); src.playbackRate.exponentialRampToValueAtTime(r * 0.8, now + 0.14); }
  g.gain.value = vol * SET().sfxVol * 1.25;
  src.connect(g); g.connect(MASTER); src.start();
  return true;
}
