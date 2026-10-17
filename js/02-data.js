'use strict';
// ── 배경음악: 상황별 곡, 교차 페이드 ──
const MUS = { tracks: {} };
const BOSS_TRACK = { boss1: 'boss1', boss2: 'boss1', boss3: 'boss2', boss4: 'boss3', boss5: 'boss2', boss6: 'boss3', boss7: 'boss3', boss8: 'boss2', boss9: 'boss1',
  boss11: 'boss1', boss12: 'boss2', boss13: 'boss1', boss14: 'boss3', boss15: 'boss2', boss16: 'boss1', boss17: 'boss3', boss18: 'boss2', boss19: 'boss3', boss20: 'boss3' };
function musicTrack(k) {
  if (!MUS.tracks[k]) {
    const a = new Audio('assets/bgm/' + k + '.mp3');
    a.loop = true; a.preload = 'auto';
    const t = { a, vol: 0, g: null };
    // WebAudio로 볼륨을 조절해야 아이폰에서도 페이드가 된다
    try { const src = AC.createMediaElementSource(a); t.g = AC.createGain(); t.g.gain.value = 0; src.connect(t.g); t.g.connect(AC.destination); } catch (e) {}
    MUS.tracks[k] = t;
  }
  return MUS.tracks[k];
}
function wantedMusic() {
  const st = S.stage;
  if (!st) return 'menu';
  if (S.warning > 0 || (S.boss && !S.boss.dead)) return BOSS_TRACK[st.sector.boss] || 'boss1';
  if (st.endless) return 'endless';
  return st.s <= 1 ? 'battle1' : 'battle2';
}
function updateMusic(dt) {
  if (!AC) return;
  const want = SET().bgmVol > 0 ? wantedMusic() : null;
  let dz = 0;
  if (S.stage && (S.mode === 'play' || S.mode === 'break') && !S.paused) {
    for (const e of S.enemies) if (!e.dead) dz = Math.max(dz, Math.min(1, (e.y - (LINE_Y - 320)) / 260));
    if (S.hp <= 3) dz = Math.max(dz, 0.7);
  }
  MUS.danger = (MUS.danger || 0) + (dz - (MUS.danger || 0)) * Math.min(1, dt * (dz > (MUS.danger || 0) ? 3 : 0.8));
  if (MUS.danger > 0.4 && SET().bgmVol > 0) { MUS.beatT = (MUS.beatT || 0) - dt; if (MUS.beatT <= 0) { MUS.beatT = 0.95 - 0.35 * MUS.danger; play('pulse_fx', 0.2 + 0.25 * MUS.danger); } }
  MUS.duckT = Math.max(0, (MUS.duckT || 0) - dt);
  const duck = S.paused || UI.settings || UI.card || UI.shop || S.mode === 'win' || S.mode === 'lose' ? 0.4 : 1;
  if (want) musicTrack(want);
  for (const k in MUS.tracks) {
    const t = MUS.tracks[k], target = k === want ? 0.6 * SET().bgmVol * duck : 0;
    t.vol += (target - t.vol) * Math.min(1, dt * 1.6);
    if (target > 0 && t.a.paused) { if (t.vol < 0.02 && k.startsWith('boss')) t.a.currentTime = 0; t.a.play().catch(() => {}); }
    if (target === 0 && t.vol < 0.01 && !t.a.paused) t.a.pause();
    const v = t.vol * (MUS.duckT > 0 ? 0.6 : 1);   // 큰 한 방이면 음악을 아주 잠깐 줄인다
    if (t.g) t.g.gain.value = v; else t.a.volume = Math.max(0, Math.min(1, v));
    const rate = k === want ? 1 + 0.07 * (MUS.danger || 0) : 1;
    if (Math.abs(t.a.playbackRate - rate) > 0.01) { t.a.preservesPitch = true; t.a.playbackRate = rate; }
  }
}
function spr(name, x, y, w, h, rot = 0, alpha = 1) {
  const im = IMG[name];
  if (!im || !im.width) return;
  if (w == null) { w = im.width; h = im.height; }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(name.startsWith('enemies/') ? fitImg(im, w, h) : im, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ── 기체 20종 ─────────────────────────────────────────────
// stat: [화력, 연사, 내구] 1~5 (카드 표시용)
// col: 기체마다 겹치지 않는 고유색. 칸 바닥, 테두리, 격납고, 캡슐이 이 색을 쓴다 (레벨은 색이 아니라 계급장)
const UNIT = {
  f: { name: '레이저 전투기', role: '연사', img: 'f1', iw: 66, ih: 50, air: true, hp: 3, dmg: 6, cd: 0.35, sp: 950, turn: 9, shape: 1, cost: 8, col: '#1a90f0', stat: [2, 5, 1],
       desc: '빠르게 레이저를 쏘는 기본 기체예요. 캡슐을 까는 데 강해요.', unlock: 'base' },
  t: { name: '미사일 포탑', role: '범위 폭발', img: 't1', iw: 60, ih: 60, hp: 4, dmg: 22, cd: 1.3, sp: 520, turn: 5, splash: 70, shape: 1, cost: 18, col: '#ffc870', stat: [3, 2, 3],
       desc: '느리지만 폭발로 몰려오는 적을 쓸어요.', unlock: 'base' },
  s: { name: '저격기', role: '보스 저격', img: 'u_s', iw: 66, ih: 44, air: true, hp: 3, dmg: 45, cd: 1.7, sp: 1700, turn: 30, shape: 1, cost: 14, col: '#98ff20', stat: [4, 1, 1],
       desc: '가장 튼튼한 적을 골라 강한 한 방을 꽂아요.', unlock: { stage: 1 } },
  g: { name: '방패 드론', role: '보호', img: 'u_g', iw: 66, ih: 31, hp: 7, dmg: 5, cd: 0.6, sp: 950, turn: 9, shape: 1, cost: 14, col: '#10c0f0', stat: [1, 3, 5],
       desc: '상하좌우로 붙은 기체가 받는 공격을 대신 맞아 줘요.', unlock: { stage: 2 } },
  m: { name: '수리 드론', role: '회복', img: 'u_m', iw: 52, ih: 34, hp: 4, dmg: 5, cd: 0.6, sp: 950, turn: 9, shape: 1, cost: 14, col: '#1ed040', stat: [1, 3, 2],
       desc: '주변 8칸 구역 안의 다친 기체를 주기적으로 고쳐요.', unlock: { stage: 3 } },
  e: { name: '전자전기', role: '연쇄 번개', img: 'u_e', iw: 64, ih: 48, air: true, hp: 3, dmg: 6, cd: 0.8, shape: 1, cost: 14, col: '#fff34a', stat: [2, 4, 1],
       desc: '번개가 적 사이를 튀어 다니고, 레벨이 오르면 보호막을 잘 깨요.', unlock: { stage: 4 } },
  d: { name: '드론 모함', role: '캡슐 특화', img: 'u_d', iw: 64, ih: 49, air: true, hp: 3, dmg: 5, cd: 1, shape: 1, cost: 16, col: '#ff2a1a', stat: [2, 4, 1],
       desc: '드론을 띄워 캡슐을 먼저 까요. 캡슐이 없으면 적을 쏴요.', unlock: { stage: 5 } },
  c: { name: '빙결포', role: '감속, 빙결', img: 'u_c2', iw: 44, ih: 52, hp: 4, dmg: 7, cd: 0.7, sp: 800, turn: 8, shape: 1, cost: 14, col: '#8ee4ff', stat: [1, 4, 2],
       desc: '냉기로 적을 느리게 하고, 레벨이 오르면 얼려요.', unlock: { stage: 7 } },
  a: { name: '방공포', role: '산탄, 요격', img: 'u_a', iw: 52, ih: 53, rot: true, hp: 4, dmg: 4, cd: 0.75, sp: 1000, turn: 10, shape: 1, cost: 14, col: '#9aa0ac', stat: [2, 3, 3],
       desc: '산탄을 뿌리고, 레벨이 오르면 날아오는 공격을 요격해요.', unlock: { stage: 10 } },
  b: { name: '전함', role: '대형, 가로 2칸', img: 'u_b2', iw: 130, ih: 80, air: true, hp: 9, dmg: 34, cd: 1.0, sp: 680, turn: 4, splash: 62, shape: 'h2', cost: 36, col: '#4050ff', stat: [4, 3, 5],
       desc: '두 칸을 차지하지만 튼튼하고 공격력이 강해요.', unlock: { stage: 12 } },
  r: { name: '요새포', role: '대형, 세로 2칸', img: 'u_r', iw: 76, ih: 150, hp: 8, dmg: 120, cd: 2.6, sp: 430, turn: 3, splash: 90, shape: 'v2', cost: 34, col: '#ff90bd', stat: [5, 1, 5],
       desc: '사거리 밖의 적까지 포격하는 초장거리 포대예요.', unlock: { stage: 15 } },
  h: { name: '화염방사기', role: '근거리 공격', img: 'u_h', iw: 48, ih: 48, rot: true, hp: 5, dmg: 55, cd: 0.1, shape: 1, cost: 16, col: '#ff8000', stat: [5, 5, 3],
       desc: '가까이 온 적을 불길로 녹여요. 사거리가 짧아요.', unlock: { shop: 300 } },
  n: { name: '기뢰 부설기', role: '함정', img: 'u_n', iw: 60, ih: 38, hp: 4, dmg: 75, cd: 2.5, shape: 1, cost: 16, col: '#ed0e90', stat: [4, 1, 2],
       desc: '전장에 기뢰를 깔아 지나가는 적을 터뜨려요.', unlock: { shop: 400 } },
  x: { name: '레이더 기지', role: '지원', img: 'u_x', iw: 42, ih: 70, hp: 4, dmg: 0, cd: 1, shape: 1, cost: 16, col: '#0aa982', stat: [0, 0, 2],
       desc: '주변 8칸 기체의 공격 속도와 공격력을 올려요. 직접 쏘지는 않아요.', unlock: { shop: 500 } },
  v: { name: '중력포', role: '끌어모으기', img: 'u_v2', iw: 64, ih: 28, hp: 4, dmg: 40, cd: 2.2, sp: 360, turn: 3, shape: 1, cost: 16, col: '#f45bef', stat: [2, 1, 2],
       desc: '중력장으로 적을 한데 모으고 느리게 해요. 미사일과 잘 어울려요.', unlock: { shop: 600 } },
  w: { name: '방벽 요새', role: '대형, ㄱ자 3칸', img: 'u_a', iw: 130, ih: 130, hp: 14, dmg: 5, cd: 0.8, sp: 1000, turn: 10, shape: 'L', cost: 30, col: '#ab7042', stat: [1, 3, 5],
       desc: 'ㄱ자로 세 칸을 차지하는 요새예요. 받는 피해가 절반이고, 주변 칸을 노린 공격을 쏴서 막아요.', unlock: { stage: 6 } },
  l: { name: '레일 포대', role: '대형, 가로 3칸', img: 'u_s', iw: 200, ih: 70, hp: 10, dmg: 70, cd: 2.2, shape: 'h3', cost: 40, col: '#b8a0ff', stat: [5, 2, 4],
       desc: '가로 세 칸짜리 레일건이에요. 적을 꿰뚫는 레일탄으로 한 줄에 선 적을 모두 뚫어요.', unlock: { stage: 8 } },
  q: { name: '이온 캐논', role: '대형, 세로 3칸', img: 'u_v2', iw: 60, ih: 200, hp: 12, dmg: 38, cd: 3, shape: 'v3', cost: 44, col: '#9a3cff', stat: [4, 2, 4],
       desc: '세로 한 줄을 통째로 쓰는 빔 포탑이에요. 자기 줄 위로 오는 적을 모두 태워요. 어느 줄에 둘지가 중요해요.', unlock: { stage: 11 } },
  y: { name: '대형 모함', role: '대형, 2×2 4칸', img: 'u_b2', iw: 140, ih: 140, hp: 16, dmg: 24, cd: 1.4, sp: 620, turn: 4, splash: 55, shape: 'sq', cost: 50, col: '#a8a010', stat: [3, 4, 5],
       desc: '네 칸을 차지하는 거대 모함이에요. 주포를 쏘고 드론 편대를 띄워 캡슐과 적을 동시에 노려요.', unlock: { stage: 14 } },
  k: { name: '해커', role: '적 탈취', img: 'u_k', iw: 50, ih: 44, hp: 3, dmg: 25, cd: 7, shape: 1, cost: 16, col: '#7afdc7', stat: [3, 1, 1],
       desc: '적 함선을 해킹해 잠시 우리 편으로 싸우게 해요.', unlock: { shop: 700 } },
};
const UNIT_ORDER = ['f', 't', 's', 'g', 'm', 'e', 'd', 'w', 'c', 'l', 'a', 'q', 'b', 'y', 'r', 'h', 'n', 'x', 'v', 'k'];
// 기체 색 바꾸기: 격납고 카드에서 기체마다 바닥색을 고를 수 있다 (col0이 기본 고유색)
for (const t in UNIT) UNIT[t].col0 = UNIT[t].col;
function applyColors() { for (const t in UNIT) UNIT[t].col = (PROG.colors && PROG.colors[t]) || UNIT[t].col0; }
applyColors();
const LV_MUL = [1, 2.3, 5.3, 12.2, 28, 64, 147, 338];
const LV_COL = ['#48c8ff', '#48c8ff', '#5ae0ff', '#b86bff', '#ffd24a', '#4a8cff', '#ff3a5a', '#ff7ae0'];
// 초월(Lv6~8): 합칠 때마다 화력 ×2.3, Lv5 주기 스킬 대기시간 -25%. 초월 III 계급장 별은 무지갯빛
const RAINBOW = ['#ff4a6a', '#ffa03a', '#ffe24a', '#5aff9a', '#48c8ff', '#b86bff'];
const lvIdx = lv => Math.min(lv, 5) - 1;   // 레벨별 표(5칸)는 초월해도 Lv5 값을 쓴다
const tier = u => Math.max(0, u.lv - 5);
const TRANSCEND = ['초월 I', '초월 II', '초월 III'];
const TRANS_EXTRA = { w: '받는 피해가 더 줄어요.', g: '대신 받는 피해도 줄어요.', m: '수리 주기도 짧아져요.', x: '버프 효과도 커져요.', k: '해킹 간격도 짧아져요.', d: '드론도 더 빨리 쏴요.' };
const transDesc = t => '공격력 ×2.3, 체력도 늘어요. ' + (SKILL_CD[t] ? 'Lv5 주기 스킬이 25% 더 자주 터져요.' : TRANS_EXTRA[t] || '');
const SKILLS = {
  f: [['단발 레이저', '레이저를 한 줄씩 빠르게 쏴요.'], ['쌍발 레이저', '레이저 두 줄을 나란히 쏴요.'], ['확산 레이저', '세 갈래로 퍼져서 여러 적을 한꺼번에 노려요.'], ['관통 레이저', '적을 뚫고 지나가며 한 줄에 선 적을 모두 맞혀요.'], ['대형 빔', '4초마다 금색 빔으로 한 줄을 통째로 녹여요.']],
  t: [['미사일', '폭발하는 미사일을 쏴요.'], ['2연장 미사일', '포신 두 개로 미사일을 동시에 쏴요.'], ['화염 지대', '터진 자리에 불바다가 남아 계속 피해를 줘요.'], ['분열탄', '폭발하면 작은 폭탄 네 개가 사방으로 튀어요.'], ['궤도 폭격', '6초마다 적이 가장 많은 곳에 거대한 폭격을 떨어뜨려요.']],
  s: [['저격탄', '가장 튼튼한 적을 노려 쏴요.'], ['약점 사격', '30% 확률로 2.5배 치명타가 터져요.'], ['관통탄', '탄이 적을 뚫고 지나가요.'], ['처형', '체력이 25% 아래로 떨어진 적을 즉시 격추해요. 보스에게는 피해 +50%.'], ['레일건', '5초마다 화면을 가르는 레일건으로 한 줄의 적에게 막대한 피해를 줘요.']],
  g: [['대신 맞기', '상하좌우 4칸 기체가 받는 공격의 70%를 대신 받아요.'], ['보호막 재생', '4초마다 체력이 1씩 차요.'], ['피해 반사', '공격을 대신 맞으면 공격한 적에게 되돌려줘요.'], ['강화 방패', '대신 받는 피해가 40%로 줄어요.'], ['방어선 보호막', '12초마다 기지로 새어 든 적 하나의 피해를 막아요.']],
  m: [['응급 수리', '3초마다 주변 8칸에서 가장 다친 기체를 1 고쳐요.'], ['범위 수리', '주변 8칸의 다친 기체를 모두 고쳐요.'], ['기지 수리', '15초마다 기지 보호막을 1 회복해요.'], ['긴급 무적', '20초에 한 번, 주변 8칸에서 파괴될 기체를 체력 1로 버티게 해요.'], ['재건', '25초에 한 번, 파괴된 기체를 Lv1로 다시 만들어요.']],
  e: [['연쇄 번개', '번개가 적 2기를 튀어 다녀요.'], ['3연쇄', '번개가 3기까지 튀어요.'], ['보호막 과부하', '보호막에 3배 피해를 줘요.'], ['5연쇄 마비', '5기까지 튀고, 맞은 적을 잠깐 멈춰요.'], ['전장 EMP', '6초마다 사거리 안 모든 적을 멈추고 보호막을 절반 깎아요.']],
  d: [['정찰 드론', '드론 1기가 여유 있을 때 캡슐을 먼저 까요.'], ['드론 2기', '드론이 2기로 늘어요.'], ['드론 4기', '드론이 4기로 늘어요.'], ['자폭 드론', '5초마다 드론 하나가 가장 강한 적에게 돌진해 터져요.'], ['드론 편대', '드론이 8기로 늘어요.']],
  c: [['냉기탄', '맞은 적을 2초 동안 35% 느리게 해요.'], ['냉기 폭발', '주변 적까지 느려져요.'], ['빙결', '12% 확률로 적을 1.5초 얼려요.'], ['파쇄', '얼어 있는 적은 모든 공격에 2배 피해를 받아요.'], ['절대영도', '7초마다 사거리 안 모든 적을 2초 얼려요.']],
  a: [['산탄', '탄 3발을 부채꼴로 뿌려요.'], ['넓은 산탄', '탄이 5발로 늘어요.'], ['요격', '7초에 한 번, 주변 칸을 노린 저격, 폭격, 운석을 쏴서 막아요.'], ['공격자 추적', '경고를 띄운 적을 먼저 노려요.'], ['방공 돔', '주변 3×3 칸은 적의 공격을 받지 않아요.']],
  b: [['주포', '무거운 포탄을 쏴요.'], ['주포 2문', '주포 두 문이 동시에 불을 뿜어요.'], ['부포대', '양옆 부포대가 레이저로 잔챙이를 정리해요.'], ['일제사격', '주포와 부포대가 한꺼번에 쏟아부어요.'], ['과충전 주포', '5초마다 거대한 플라즈마탄으로 넓은 범위를 날려버려요.']],
  r: [['초장거리 포격', '사거리 밖에서 다가오는 적까지 먼저 포격해요.'], ['2연발', '포탄 두 발을 쏴요.'], ['충격파', '폭발에 맞은 적이 잠깐 멈춰요.'], ['집속탄', '폭발하며 작은 폭탄 여섯 개를 흩뿌려요.'], ['전술핵', '9초마다 적이 가장 많은 곳에 핵 포격을 떨어뜨려요.']],
  h: [['화염 분사', '가까운 적에게 불길을 계속 뿜어요.'], ['넓은 불길', '불길이 더 넓게 퍼져요.'], ['화상', '불이 붙은 적은 3초 동안 계속 타요.'], ['불벽', '6초마다 방어선 앞에 불벽을 세워요.'], ['플라즈마 분사', '푸른 플라즈마로 바뀌어 사거리와 공격력이 크게 늘어요.']],
  n: [['기뢰', '적이 지나갈 길목에 기뢰를 깔아요.'], ['기뢰 2개', '한 번에 기뢰 2개를 깔아요.'], ['연쇄 기뢰', '폭발이 근처 기뢰를 함께 터뜨려요.'], ['중력 기뢰', '터지기 전에 주변 적을 끌어당겨요.'], ['블랙홀', '9초마다 적이 몰린 곳에 블랙홀을 열어요.']],
  x: [['신호 증폭', '주변 8칸 기체의 공격 속도 +20%.'], ['공격 보정', '주변 기체의 공격력도 +15%.'], ['정밀 유도', '주변 기체 공격 속도 +30%, 공격력 +25%.'], ['약점 스캔', '모든 적이 받는 피해 +15%.'], ['전군 강화', '모든 기체의 공격 속도와 공격력 +15%.']],
  v: [['중력장', '맞은 자리에 적을 끌어당기고 느리게 하는 중력장을 만들어요.'], ['넓은 중력장', '중력장이 더 넓어져요.'], ['압착', '중력장 안의 적이 계속 피해를 받아요.'], ['쌍중력장', '중력탄 두 발을 쏴요.'], ['특이점', '중력장이 끝날 때 안쪽으로 붕괴하며 큰 피해를 줘요.']],
  w: [['방벽', '받는 피해가 절반이고, 산탄으로 적을 쏴요.'], ['요격', '8초에 한 번, 주변 칸을 노린 저격, 폭격, 운석을 쏴서 막아요.'], ['엄호', '상하좌우로 붙은 기체가 받는 피해 -25%.'], ['빠른 요격', '요격 간격이 5초로 짧아져요.'], ['방어선 복구', '15초마다 기지 방어막을 1 회복해요.']],
  l: [['레일탄', '적을 꿰뚫는 레일탄을 쏴요.'], ['쌍열 레일', '레일탄 두 발을 나란히 쏴요.'], ['삼열 레일', '레일탄 세 발을 부채꼴로 쏴요.'], ['과충전', '레일탄이 30% 확률로 2.5배 피해를 줘요.'], ['궤도 관통포', '6초마다 화면을 가르는 거대 레일로 한 줄의 적에게 막대한 피해를 줘요.']],
  q: [['이온 빔', '3초마다 자기 세로줄 위로 빔을 쏴요.'], ['긴 조사', '빔이 더 오래 나가요.'], ['광폭 빔', '빔이 더 넓어져요.'], ['이온 감속', '빔에 맞은 적이 느려져요.'], ['궤도 낙뢰', '8초마다 세 배 굵은 빔을 2초 동안 내리꽂아요.']],
  y: [['주포', '무거운 포탄을 쏘고 드론 3기를 띄워요.'], ['드론 증원', '드론이 4기로 늘어요.'], ['편대', '드론이 6기로 늘어요.'], ['자폭 드론', '5초마다 드론 하나가 강한 적에게 돌진해 터져요.'], ['함재기 폭격', '8초마다 적이 가장 많은 곳에 폭격을 떨어뜨려요.']],
  k: [['해킹', '7초마다 적 하나를 4초 동안 아군으로 만들어요.'], ['빠른 해킹', '해킹 간격이 짧아져요.'], ['자폭 명령', '해킹이 끝나면 그 적이 자폭해요.'], ['다중 해킹', '한 번에 두 기를 해킹해요.'], ['시스템 장악', '해킹이 6초로 길어지고 간격도 짧아져요.']],
};
const mkHp = m => (m >= 4 ? 1 : 0) + (m >= 10 ? 2 : 0);   // Mk 체력: Mk.4에 +1, Mk.10에 +2 더
const unitMaxHp = (type, lv) => Math.round(UNIT[type].hp * (1 + 0.3 * (lv - 1))) + mkHp(mkNow(type)) + (S && S.pk ? S.pk.hp : 0);
// 레벨별 대표 수치: 공격 기체는 DPS(초당 피해, 단일 대상 기준), 지원 기체는 핵심 효과
function levelStat(type, lv) {
  const d = UNIT[type], m = LV_MUL[lv - 1];
  switch (type) {
    case 'g': return { v: Math.round(unitMaxHp(type, lv) * 12 * mkMul(type)), label: '전투력' };
    case 'm': return { v: Math.round([120, 220, 320, 420, 560][lvIdx(lv)] * mkMul(type) * Math.pow(1.4, Math.max(0, lv - 5))), label: '전투력' };
    case 'x': return { v: Math.round([150, 260, 420, 560, 800][lvIdx(lv)] * mkMul(type) * Math.pow(1.4, Math.max(0, lv - 5))), label: '전투력' };
    case 'k': return { v: Math.round([150, 220, 380, 480, 640][lvIdx(lv)] * mkMul(type) * Math.pow(1.4, Math.max(0, lv - 5))), label: '전투력' };
  }
  let dps;
  if (type === 'h') dps = d.dmg * m * (lv >= 5 ? 2 : 1);
  else if (type === 'e') dps = d.dmg * m / d.cd * [2, 3, 3, 5, 5][lvIdx(lv)];
  else if (type === 'd') dps = d.dmg * m * [1, 0.8, 0.6, 0.6, 0.5][lvIdx(lv)] * [1, 2, 4, 4, 8][lvIdx(lv)] / 0.45;
  else if (type === 'a') dps = d.dmg * m * [3, 5, 5, 6, 7][lvIdx(lv)] / d.cd;
  else if (type === 'n') dps = d.dmg * m * [1, 2, 2, 2, 3][lvIdx(lv)] / [2.5, 2.5, 2.2, 2, 1.8][lvIdx(lv)];
  else if (type === 's') dps = d.dmg * m * (lv >= 2 ? 1.45 : 1) / d.cd;
  else dps = d.dmg * m / d.cd;
  return { v: Math.round(dps * mkMul(type) * 10), label: '전투력' };
}
// 가짐: 기본 기체, 아니면 제작했거나 스테이지로 받은 기체
const isOwned = t => UNIT[t].unlock === 'base' || PROG.owned.includes(t);

// ── 등급과 설계도 ───────────────────────────────────────
// pack: 뽑기 한 번에 오는 설계도, craft: 제작에 드는 설계도 (묶음 하나), rate: 강화 설계도 배율, over: Mk.10 뒤 남는 설계도 한 장당 코어
const RARITY = [
  { name: '일반', col: '#b8c4d8', pack: 30, craft: 30, rate: 1, over: 5 },
  { name: '고급', col: '#5aff9a', pack: 15, craft: 15, rate: 0.375, over: 15 },
  { name: '희귀', col: '#48a8ff', pack: 8, craft: 8, rate: 0.15, over: 40 },
  { name: '영웅', col: '#c87bff', pack: 5, craft: 5, rate: 0.08, over: 80 },
  { name: '전설', col: '#ffb02a', pack: 3, craft: 3, rate: 0.05, over: 150 },
];
const UNIT_RARITY = { f: 0, t: 0, s: 0, g: 0, m: 1, e: 1, d: 1, c: 1, a: 1, b: 2, r: 2, h: 2, n: 2, x: 2, v: 3, w: 3, l: 3, q: 4, y: 4, k: 4 };
const rarityOf = t => RARITY[UNIT_RARITY[t]];
// Mk m → m+1에 드는 설계도 (일반 기준, 등급 배율을 곱해 올림)
const BP_UP = [20, 40, 75, 130, 215, 320, 450, 600, 780, 1040];
const bpOf = t => (PROG.bp && PROG.bp[t]) || 0;
const bpNeed = t => isOwned(t) ? Math.ceil(BP_UP[Math.min(mkOf(t), MK_MAX - 1)] * rarityOf(t).rate) : rarityOf(t).craft;
const bpReady = t => bpOf(t) >= bpNeed(t) && (!isOwned(t) || mkOf(t) < MK_MAX);
// 설계도 받기. 이미 Mk.10이면 코어로 바꿔 준다
function addBp(t, c) {
  if (isOwned(t) && mkOf(t) >= MK_MAX) { const core = c * rarityOf(t).over; PROG.credits += core; return { t, c, core }; }
  PROG.bp[t] = bpOf(t) + c; return { t, c, core: 0 };
}
// 등급 확률 (%): 일반, 고급, 희귀, 영웅, 전설
const GACHA_ODDS = [55, 30, 11, 3.2, 0.8];   // 보급 상자
const STAGE_ODDS = [70, 26, 3.5, 0.45, 0.05];   // 스테이지를 깰 때
const GOLD_ODDS = [40, 35, 18, 5.5, 1.5];   // 황금 캡슐
const PITY = 60, GEM_1 = 100, GEM_10 = 900, GOLD_BP = 0.25;   // 천장, 상자 값, 황금 캡슐에서 설계도가 나올 확률
function rollRarity(odds) { let r = Math.random() * 100, g = 0; while (g < 4 && (r -= odds[g]) > 0) g++; return g; }
const unitOfRarity = g => { const pool = UNIT_ORDER.filter(t => UNIT_RARITY[t] === g); return pool[Math.floor(Math.random() * pool.length)]; };
// 보급 상자 n번 (10번이면 희귀 이상 하나는 꼭). 천장: PITY번째까지 전설이 안 나오면 그 번은 전설
function pullBox(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    PROG.pity = (PROG.pity || 0) + 1;
    let g = PROG.pity >= PITY ? 4 : rollRarity(GACHA_ODDS);
    if (n === 10 && i === n - 1 && g < 2 && !out.some(r => r.g >= 2)) g = 2;
    if (g === 4) PROG.pity = 0;
    const t = unitOfRarity(g), fresh = !isOwned(t) && !bpOf(t), r = addBp(t, RARITY[g].pack);
    out.push({ ...r, g, fresh, craft: !isOwned(t) && bpOf(t) >= rarityOf(t).craft });
  }
  return out;
}
// 교환소: 날마다 바뀌는 세 칸 (코어 둘, 다이아 하나). 하루에 한 번씩
function shopOffers(day) {
  const rnd = mulberry(seedOf('shop' + day));
  const pick = g => { const pool = UNIT_ORDER.filter(t => UNIT_RARITY[t] === g); return pool[Math.floor(rnd() * pool.length)]; };
  const g0 = rnd() < 0.5 ? 0 : 1, g2 = rnd() < 0.25 ? 4 : 3;
  return [
    { t: pick(g0), c: RARITY[g0].pack, core: g0 ? 800 : 400 },
    { t: pick(2), c: RARITY[2].pack, core: 2500 },
    { t: pick(g2), c: RARITY[g2].pack, gem: g2 === 4 ? 200 : 120 },
  ];
}
// Mk 이정표: 숫자보다 눈에 보이는 변화
const MK_STONES = [
  { mk: 2, name: '정예 출고', desc: '캡슐에서 나올 때 15% 확률로 한 단계 높게' },
  { mk: 4, name: '보강 장갑', desc: '체력 +1' },
  { mk: 6, name: '보급 우선', desc: '캡슐에 이 기체가 더 자주 나와요' },
  { mk: 8, name: '정예 출고 II', desc: '캡슐에서 나올 때 30% 확률로 한 단계 높게' },
  { mk: 10, name: '금빛 기체', desc: '판 위에서 금빛으로 빛나요, 체력 +2' },
];
const eliteChance = t => mkNow(t) >= 8 ? 0.3 : mkNow(t) >= 2 ? 0.15 : 0;
const nextStone = t => MK_STONES.find(m => m.mk > mkOf(t));
// 다이아 (지금은 무료로만 얻는다)
const addGems = n => { PROG.gems = (PROG.gems || 0) + n; S.gemsGot = (S.gemsGot || 0) + n; };
// 예전 저장 옮기기: 스테이지로 이미 풀린 기체는 등급과 상관없이 가진 것으로. 처음 한 번 다이아 300 (상자 세 번)
if (!PROG.meta) {
  for (const t of UNIT_ORDER) { const u = UNIT[t].unlock; if (u.stage && PROG.stars[u.stage] > 0 && !PROG.owned.includes(t)) PROG.owned.push(t); }
  PROG.bp = PROG.bp || {}; PROG.gems = (PROG.gems || 0) + 300; PROG.meta = 1;
}
for (const t in PROG.mk) PROG.mk[t] = Math.min(MK_MAX, PROG.mk[t]);   // 20강 시험판 저장은 10강으로
// 편성은 1~5종. 아직 못 가진 기체가 저장에 남아 있으면 뺀다
PROG.deck = PROG.deck.filter(t => UNIT[t] && isOwned(t)).slice(0, DECK_N);
if (!PROG.deck.length) PROG.deck = ['f', 't'];

// ── 적 ────────────────────────────────────────────────────
const ENEMY = {
  grunt:   { img: 'enemies/grunt',   hp: 50,  speed: 60,  r: 30, dmg: 1, w: 70,  h: 63 },
  tank:    { img: 'enemies/tank',    hp: 260, speed: 24,  r: 36, dmg: 2, w: 82,  h: 84 },
  rock:    { img: 'enemies/rock1',   hp: 10,  speed: 70,  r: 16, dmg: 1, w: 30,  h: 30 },
  minion:  { img: 'enemies/minion',  hp: 22,  speed: 55,  r: 22, dmg: 1, w: 50,  h: 45 },
  rusher:  { img: 'enemies/rusher',  hp: 35,  speed: 135, r: 24, dmg: 1, w: 62,  h: 50 },
  split:   { img: 'enemies/split',   hp: 150, speed: 38,  r: 36, dmg: 2, w: 92,  h: 76, spin: 1 },
  splitS:  { img: 'enemies/splitS',  hp: 30,  speed: 65,  r: 18, dmg: 1, w: 40,  h: 40, spin: 3 },
  shield:  { img: 'enemies/shield',  hp: 150, speed: 30,  r: 36, dmg: 2, w: 82,  h: 84, shield: 0.7 },
  healer:  { img: 'enemies/heal',    hp: 110, speed: 28,  r: 34, dmg: 1, w: 68,  h: 68, spin: 1.5 },
  thief:   { img: 'enemies/thief',   hp: 70,  speed: 55,  r: 30, dmg: 1, w: 62,  h: 62, spin: 4 },
  elite:   { img: 'enemies/elite',   hp: 700, speed: 22,  r: 46, dmg: 3, w: 108, h: 110, shield: 0.4, atk: 'column', atkCd: 5, atkDmg: 3, name: '엘리트 전함' },
  sniper:  { img: 'enemies/sniper',  hp: 80,  speed: 60,  r: 30, dmg: 1, w: 66,  h: 60, atk: 'snipe',  atkCd: 4.5, atkDmg: 2, name: '저격함' },
  gunship: { img: 'enemies/gunship', hp: 210, speed: 32,  r: 36, dmg: 2, w: 80,  h: 82, atk: 'column', atkCd: 6,   atkDmg: 3, name: '포격함' },
  bomber:  { img: 'enemies/bomber',  hp: 130, speed: 48,  r: 30, dmg: 1, w: 76,  h: 62, atk: 'diag',   atkCd: 5.5, atkDmg: 2, name: '폭격기' },
  phase:   { img: 'enemies/phase',   hp: 90,  speed: 58,  r: 28, dmg: 1, w: 64,  h: 66,  name: '위상함' },
  grav:    { img: 'enemies/grav',    hp: 190, speed: 30,  r: 34, dmg: 2, w: 78,  h: 78,  name: '중력함' },
  // 새 적
  artillery: { img: 'enemies/artillery', hp: 900, speed: 26, r: 50, dmg: 3, w: 118, h: 140, shield: 0.2, atk: 'barrage', atkCd: 5.5, atkDmg: 2, atkN: 6, hover: [200, 290], name: '포격 순양함' },
  jammer:  { img: 'enemies/jammer',  hp: 150, speed: 42,  r: 32, dmg: 1, w: 72,  h: 72,  atk: 'jam',    atkCd: 6,   atkDmg: 0, atkN: 4, name: '교란함' },
  mother:  { img: 'enemies/mother',  hp: 1000, speed: 13, r: 62, dmg: 3, w: 160, h: 158, name: '침공 모함' },
  wreck:   { img: 'enemies/wreck',   hp: 240, speed: 30,  r: 36, dmg: 2, w: 82,  h: 84,  name: '난파선' },
  rift:    { img: 'enemies/rift',    hp: 110, speed: 52,  r: 28, dmg: 1, w: 64,  h: 66,  name: '균열함' },
  boss1:   { img: 'enemies/boss1', hp: 8000,  speed: 11, r: 90,  dmg: 99, w: 224, h: 196, boss: true, name: '외계 모함', atk: 'column', atkCd: 7, atkDmg: 3 },
  boss2:   { img: 'enemies/boss2', hp: 9500,  speed: 10, r: 100, dmg: 99, w: 230, h: 226, boss: true, name: '거대 운석 핵', spin: 0.3, atk: 'meteor', atkCd: 6, atkDmg: 3 },
  boss3:   { img: 'enemies/boss3',  hp: 9000,  speed: 10, r: 96,  dmg: 99, w: 210, h: 210, boss: true, name: 'UFO 모선', spin: 0.8, shield: 0.35, regen: 6, atk: 'row', atkCd: 8, atkDmg: 3 },
  boss5:   { img: 'enemies/boss5', hp: 14000, speed: 9, r: 100, dmg: 99, w: 250, h: 210, boss: true, name: '빙결 요새', shield: 0.3, atk: 'freeze', atkCd: 6.5, atkDmg: 0 },
  boss6:   { img: 'enemies/boss6', hp: 17000, speed: 8, r: 104, dmg: 99, w: 250, h: 230, boss: true, name: '블랙홀 모함', regen: 8, atk: 'cross', atkCd: 7, atkDmg: 3 },
  boss7:   { img: 'enemies/boss7', hp: 17000, speed: 8, r: 104, dmg: 99, w: 252, h: 216, boss: true, name: '폐허 기함', shield: 0.2, atk: 'barrage', atkCd: 6, atkDmg: 3 },
  boss8:   { img: 'enemies/boss8', hp: 24000, speed: 8, r: 104, dmg: 99, w: 250, h: 230, boss: true, name: '균열 군주', regen: 8, atk: 'cross', atkCd: 6.5, atkDmg: 3 },
  boss9:   { img: 'enemies/boss9', hp: 30000, speed: 8, r: 100, dmg: 99, w: 236, h: 232, boss: true, name: '황금 운석 핵', spin: 0.3, shield: 0.15, atk: 'meteor', atkCd: 5.5, atkDmg: 3 },
  // 11~20구역 보스: 기존 보스의 공격과 성질을 물려받은 변종 (색만 다른 임시 그림, 20구역 공허 황제는 새 그림)
  boss11:  { img: 'enemies/boss11', hp: 32000, speed: 9, r: 90, dmg: 99, w: 224, h: 196, boss: true, name: '안개 군주', atk: 'column', atkCd: 5.5, atkDmg: 3 },
  boss12:  { img: 'enemies/boss12', hp: 34000, speed: 9, r: 96, dmg: 99, w: 210, h: 210, boss: true, name: '정전 모선', spin: 0.8, shield: 0.3, regen: 6, atk: 'row', atkCd: 6.5, atkDmg: 3 },
  boss13:  { img: 'enemies/boss13', hp: 36000, speed: 9, r: 100, dmg: 99, w: 230, h: 226, boss: true, name: '재생 핵', spin: 0.3, regen: 5, atk: 'meteor', atkCd: 5.5, atkDmg: 3 },
  boss14:  { img: 'enemies/boss14', hp: 38000, speed: 9, r: 104, dmg: 99, w: 250, h: 230, boss: true, name: '급류 모함', regen: 8, atk: 'cross', atkCd: 6, atkDmg: 3 },
  boss15:  { img: 'enemies/boss15', hp: 40000, speed: 8, r: 100, dmg: 99, w: 250, h: 210, boss: true, name: '분열 여왕', shield: 0.3, atk: 'freeze', atkCd: 5.5, atkDmg: 0 },
  boss16:  { img: 'enemies/boss16', hp: 43000, speed: 8, r: 100, dmg: 99, w: 236, h: 232, boss: true, name: '운석 거신', spin: 0.3, shield: 0.15, atk: 'meteor', atkCd: 5, atkDmg: 3 },
  boss17:  { img: 'enemies/boss17', hp: 46000, speed: 8, r: 104, dmg: 99, w: 252, h: 216, boss: true, name: '역풍 요새', shield: 0.25, atk: 'barrage', atkCd: 5.5, atkDmg: 3 },
  boss18:  { img: 'enemies/boss18', hp: 49000, speed: 8, r: 104, dmg: 99, w: 250, h: 230, boss: true, name: '혼돈 쌍두', regen: 7, atk: 'cross', atkCd: 5.5, atkDmg: 3 },
  boss19:  { img: 'enemies/boss19', hp: 52000, speed: 8, r: 104, dmg: 99, w: 252, h: 216, boss: true, name: '심연 기함', shield: 0.25, regen: 8, atk: 'cross', atkCd: 6, atkDmg: 3 },
  boss20:  { img: 'enemies/boss20', hp: 60000, speed: 7, r: 110, dmg: 99, w: 270, h: 271, boss: true, name: '공허 황제', shield: 0.25, regen: 8, atk: 'barrage', atkCd: 5, atkDmg: 3 },
  boss4:   { img: 'enemies/boss4', hp: 12000, speed: 9,  r: 104, dmg: 99, w: 252, h: 216, boss: true, name: '최종 기함', shield: 0.25, regen: 8, atk: 'cross', atkCd: 8, atkDmg: 3 },
};
// ── 특수 합체: 짝꿍 두 기체가 둘 다 최종 단계(Lv8)면 하나를 다른 하나에 겹쳐 합친다 ──
// col: 짝마다 다른 색 (편성 화면의 테두리, 짝꿍 표시, 판 위 연결선). keep: 합친 뒤 남는 기체 종류 (그 기체의 공격을 그대로 쓰고, 특수 능력이 붙는다). 화력 ×1.6, 체력 ×1.5
const FUSE = [
  { id: 'aegis', short: '주변 기체 보호와 강화', a: 'g', b: 'x', keep: 'g', name: '이지스 지휘함', col: '#3ad8ff', desc: '주변 8칸 기체가 받는 피해 절반, 공격력과 공격 속도 크게 증가. 10초마다 기지 보호막 +1' },
  { id: 'bolt', short: '레이저 + 연쇄 번개',  a: 'f', b: 'e', keep: 'f', name: '번개 요격기',   col: '#ffe03a', desc: '레이저가 맞힌 적에서 번개가 튀어요' },
  { id: 'sing', short: '끌어모아 대폭발',  a: 't', b: 'v', keep: 't', name: '특이점 포대',   col: '#b86bff', desc: '6초마다 적을 한데 끌어모은 뒤 그 자리에 큰 폭발' },
  { id: 'zero', short: '저격 + 빙결',  a: 's', b: 'c', keep: 's', name: '절대영도 저격기', col: '#ff5ab4', desc: '저격탄이 적을 얼리고, 언 적은 2배 피해' },
  { id: 'pyro', short: '산탄 + 화염',  a: 'a', b: 'h', keep: 'a', name: '화염 산탄포',   col: '#ff7a2a', desc: '산탄에 맞은 적이 불타요' },
  { id: 'dock', short: '드론 + 전체 수리',  a: 'd', b: 'm', keep: 'd', name: '정비 모함',     col: '#4aff7a', desc: '3초마다 판의 모든 기체를 고치고, 12초마다 기지 보호막 +1' },
];
const FUSE_BY = Object.fromEntries(FUSE.map(f => [f.id, f]));
const fuseOf = (p, q) => p && q && p !== q && !p.fuse && !q.fuse && p.lv >= MAX_LV && q.lv >= MAX_LV && FUSE.find(f => (f.a === p.type && f.b === q.type) || (f.b === p.type && f.a === q.type)) || null;
const fuseFor = t => FUSE.find(f => f.a === t || f.b === t);
// 처음 만난 적 카드에 쓰는 이름과 그림 (ENEMY에 이름이 없는 것들)
const INTRO_NAME = { tank: '중장갑 함선', rocks: '운석 떼', split: '분열 운석', rusher: '돌격기', shield: '보호막함', healer: '수리선', thief: '캡슐 도둑', meteor: '운석 낙하', freeze: '빙결 포격' };
const INTRO_IMG = { rocks: 'enemies/rock1', meteor: 'enemies/rock2' };
const ENEMY_HINT = {
  tank:    '중장갑 함선은 아주 튼튼해요. 기체를 합쳐서 한 방을 키워야 뚫려요.',
  rocks:   '운석 떼는 약하지만 수가 많아요. 폭발 공격이 잘 들어요.',
  split:   '분열 운석은 깨지면 작은 운석 세 개로 갈라져요.',
  rusher:  '돌격기는 붉게 번쩍인 다음 급가속해요. 번쩍일 때가 잡을 기회예요.',
  shield:  '보호막함은 레이저를 대부분 막고, 선으로 이어진 주변 적이 받는 피해도 줄여요. 폭발이나 번개로 먼저 깨세요.',
  healer:  '수리선은 주변 적을 계속 고쳐요. 먼저 떨어뜨리는 게 좋아요.',
  thief:   '캡슐 도둑이 캡슐을 낚아채 달아나요. 놓치기 전에 격추하면 캡슐이 다시 떨어져요.',
  sniper:  '저격함이 내 기체를 쏴요. 저격함을 탭해서 먼저 격추하세요.',
  gunship: '포격함은 세로 한 줄을 통째로 쓸어요. 그 열에서 기체를 옮기세요.',
  bomber:  '폭격기는 대각선으로 폭탄을 떨어뜨려요.',
  meteor:  '운석이 네 칸에 한꺼번에 떨어져요. 체력이 많은 기체로 버텨요.',
  phase:   '위상함은 잠깐씩 투명해져서 공격이 통하지 않아요. 다시 보일 때 노리세요.',
  grav:    '중력함은 근처 캡슐을 끌어당겨 위로 데려가요. 캡슐을 지키려면 먼저 격추하세요.',
  freeze:  '파란 칸은 빙결 포격이에요. 맞은 기체는 4초 동안 얼어서 쏘지 못해요.',
  artillery: '포격 순양함은 위쪽에 버티고 서서 여러 칸에 포탄을 떨어뜨려요. 먼저 격추하세요.',
  jammer:  '교란함이 노란 칸의 기체를 전파로 묶어 못 쏘게 해요. 교란함을 격추하면 바로 풀려요.',
  wreck:   '난파선을 격추하면 잔해가 떨어져 칸 하나를 잠시 막아요.',
  rift:    '균열함은 몇 초마다 앞으로 순간이동해요. 빨리 잡으세요.',
  mother:  '침공 모함은 천천히 내려오며 작은 드론을 계속 뿌려요. 드론이 쌓이기 전에 모함을 노리세요.',
};

// ── 구역과 스테이지 ───────────────────────────────────────
const SECTORS = [
  { name: '궤도 방어선', color: '#48c8ff', planet: ['#7fe0d0', '#3a6fa8', '#1d1f4a'],
    info: '졸개, 중장갑, 운석 떼, 저격함', pool: ['tank', 'rocks'], atk: ['sniper'], fresh: [], boss: 'boss1' },
  { name: '소행성대', color: '#ffb347', planet: ['#ffd08a', '#b0643a', '#3a1d18'],
    info: '새 적: 분열 운석, 돌격기, 포격함, 운석 낙하, 교란함', pool: ['tank', 'rocks', 'split', 'rusher'], atk: ['sniper', 'gunship', 'meteor', 'jammer'], fresh: ['split', 'rusher'], boss: 'boss2' },
  { name: '성운', color: '#c77dff', planet: ['#f0a8ff', '#7a3fb0', '#24123e'],
    info: '새 적: 보호막함, 수리선, 폭격기, 침공 모함', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'mother'], atk: ['sniper', 'gunship', 'jammer', 'bomber'], fresh: ['shield', 'healer', 'mother'], boss: 'boss3' },
  { name: '적 본성', color: '#ff5a6a', planet: ['#ff9a8a', '#a8323a', '#2a0a14'],
    info: '새 적: 캡슐 도둑, 포격 순양함', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor'], fresh: ['thief'], boss: 'boss4' },
  { name: '얼음 고리', color: '#a8f0ff', planet: ['#effcff', '#6ab8d8', '#12304a'],
    info: '새 적: 위상함, 빙결 포격', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'freeze'], fresh: ['phase'], boss: 'boss5' },
  { name: '블랙홀', color: '#ffc46a', planet: ['#fff0c8', '#c07a2a', '#1a0f06'],
    info: '새 적: 중력함', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: ['grav'], boss: 'boss6' },
  // 구역마다 판 규칙 하나 (rule): 폐허 함대는 부서진 칸, 차원 균열은 옆에서 오는 캡슐
  { name: '폐허 함대', color: '#9ab8d8', planet: ['#dfe8f2', '#5a6a80', '#121822'], rule: 'wreck', ruleName: '부서진 칸',
    info: '규칙: 부서진 칸, 새 적: 난파선', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: ['wreck'], boss: 'boss7' },
  { name: '차원 균열', color: '#ff6ad8', planet: ['#ffd0f4', '#a83a90', '#1e0a1a'], rule: 'side', ruleName: '옆에서 오는 캡슐',
    info: '규칙: 옆에서 오는 캡슐, 새 적: 균열함', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: ['rift'], boss: 'boss8' },  // 9 황금 성단: 캡슐이 절반이지만 한 단계 높고 황금 캡슐이 꼭 나온다. 보스는 맞을수록 황금 캡슐을 떨군다
  { name: '황금 성단', color: '#ffe066', planet: ['#fff6c8', '#d8a020', '#2a1a04'], rule: 'rich', ruleName: '귀한 캡슐',
    info: '', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: ['thief'], boss: 'boss9' },
  // 10 쌍성계: 큰 적이 둘씩 나란히 온다. 마지막엔 폐허 기함과 균열 군주가 함께
  { name: '쌍성계', color: '#5affc8', planet: ['#d8fff0', '#2a9a7a', '#06201a'], rule: 'twin', ruleName: '쌍둥이 적',
    info: '', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: ['rift'], boss: 'boss7', duo: 'boss8' },
  // 구역 11~20: 새 적 없이 구역마다 판 규칙 하나 (19, 20은 둘). 보스는 기존 보스의 색과 이름을 바꾼 변종, 20구역만 새 그림
  { name: '안개 성운', color: '#9ad0c8', planet: ['#e8fffb', '#5a9a92', '#0e2422'], rule: 'fog', ruleName: '안개',
    info: '규칙: 안개, 가까이 와야 쏠 수 있어요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss11' },
  { name: '정전 지대', color: '#ffe85a', planet: ['#fffbd0', '#b0a030', '#2a2606'], rule: 'blackout', ruleName: '정전',
    info: '규칙: 정전, 가끔 한 줄이 멈춰요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss12' },
  { name: '재생 군단', color: '#6dff8a', planet: ['#e0ffe8', '#3aa85a', '#08200e'], rule: 'regen', ruleName: '재생',
    info: '규칙: 재생, 적이 체력을 되찾아요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss13' },
  { name: '급류 항로', color: '#5ae8ff', planet: ['#e0fbff', '#2a98b8', '#06202a'], rule: 'caprush', ruleName: '빠른 캡슐',
    info: '규칙: 캡슐이 빨리 떨어져요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss14' },
  { name: '분열 성단', color: '#ff8ad8', planet: ['#ffe4f6', '#b84a98', '#2a0a22'], rule: 'split', ruleName: '분열',
    info: '규칙: 적이 가끔 둘로 갈라져요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss15' },
  { name: '운석 지대', color: '#ffa04a', planet: ['#fff0dc', '#b8682a', '#2a1606'], rule: 'meteor', ruleName: '운석 낙하',
    info: '규칙: 운석이 칸을 잠깐 막아요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss16' },
  { name: '역풍 회랑', color: '#c8e0ff', planet: ['#f4f8ff', '#7890b8', '#121a2a'], rule: 'wind', ruleName: '역풍',
    info: '규칙: 날아가는 탄이 느려요', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss17' },
  { name: '혼돈 경계', color: '#ff5a5a', planet: ['#ffe0e0', '#b83a3a', '#2a0808'], rule: ['blackout', 'split'], ruleName: '정전, 분열',
    info: '규칙: 정전과 분열', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss18' },
  { name: '심연', color: '#8a6aff', planet: ['#ece4ff', '#5a3ab8', '#0e0826'], rule: ['fog', 'regen'], ruleName: '안개, 재생',
    info: '규칙: 안개와 재생', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss19' },
  { name: '공허의 끝', color: '#d0a0ff', planet: ['#f6ecff', '#8a5ac8', '#14081e'], rule: ['twin', 'wind'], ruleName: '쌍둥이 적, 역풍',
    info: '규칙: 쌍둥이 적과 역풍, 마지막엔 보스 셋', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'mother', 'phase', 'grav', 'wreck', 'rift'], atk: ['sniper', 'gunship', 'bomber', 'jammer', 'meteor', 'freeze'], fresh: [], boss: 'boss20', duo: 'boss19', trio: 'boss18' },
];
const ENDLESS_SECTORS = 6;   // 무한 방어선은 1~6구역 보스와 배율만 쓴다 (밸런스 유지)
const STAGE_COUNT = SECTORS.length * 5;
// 스테이지 종류: 구역마다 섞는다. 기본(5웨이브), 장기전(7웨이브, 천천히 강해지고 캡슐이 많다), 러시(3웨이브, 적이 몰려온다),
// 포위(포격 순양함과 교란함 위주), 보스 러시(중간 보스가 여러 번, 마지막에 보스)
const STAGE_KINDS = {
  base:  { name: '', sub: '' },
  long:  { name: '장기전', sub: '7웨이브, 천천히 강해지고 캡슐이 많아요', waves: 7, col: '#5affc8' },
  rush:  { name: '러시', sub: '3웨이브, 짧지만 적이 몰려와요', waves: 3, col: '#ff8a4a' },
  siege: { name: '포위', sub: '포격 순양함과 교란함이 에워싸요', col: '#e0ff5a' },
  brush: { name: '보스 러시', sub: '중간 보스가 여러 번, 마지막에 보스', col: '#ff5a6a' },
};
const STAGE_PLAN = [
  ['base', 'base', 'rush', 'long', 'base'],
  ['base', 'rush', 'long', 'siege', 'base'],
  ['long', 'rush', 'siege', 'base', 'brush'],
  ['rush', 'siege', 'long', 'base', 'brush'],
  ['siege', 'long', 'rush', 'base', 'base'],
  ['rush', 'long', 'siege', 'base', 'brush'],
  ['base', 'long', 'rush', 'siege', 'brush'],
  ['rush', 'siege', 'long', 'base', 'brush'],
  ['long', 'rush', 'siege', 'base', 'base'],
  ['rush', 'long', 'siege', 'brush', 'base'],
  ['base', 'long', 'rush', 'siege', 'base'],
  ['rush', 'siege', 'long', 'base', 'brush'],
  ['long', 'rush', 'base', 'siege', 'base'],
  ['rush', 'long', 'siege', 'base', 'brush'],
  ['siege', 'rush', 'long', 'base', 'base'],
  ['long', 'siege', 'rush', 'base', 'brush'],
  ['rush', 'long', 'base', 'siege', 'base'],
  ['siege', 'rush', 'long', 'base', 'brush'],
  ['long', 'rush', 'siege', 'base', 'brush'],
  ['rush', 'long', 'siege', 'brush', 'base'],
];
// 함대 성격: 웨이브 전체 체력은 그대로 두고, 나눠 오는 모양만 바꾼다. 어떤 기체가 잘 맞는지는 기체 특성대로 자연스럽게 갈린다
// 대형: 튼튼한 적이 적게 (한 방이 센 기체), 물량: 약한 적이 떼로 (범위 공격), 고속: 빠른 적 (발 묶기), 보호막: 모든 적이 보호막 (번개, 폭발), 포격: 멀리서 쏘는 적 (방어, 요격)
const FLEETS = {
  heavy:   { name: '대형 함대', desc: '튼튼한 적이 적게 와요', col: '#ff9a5a' },
  swarm:   { name: '물량 함대', desc: '약한 적이 떼로 몰려와요', col: '#7dff7a' },
  fast:    { name: '고속 함대', desc: '빠른 적이 파고들어요', col: '#5ae8ff' },
  shield:  { name: '보호막 함대', desc: '모든 적이 보호막을 둘러요', col: '#6ad0ff' },
  barrage: { name: '포격 함대', desc: '멀리서 쏘는 적이 많아요', col: '#e0ff5a' },
};
// STAGE_PLAN과 같은 모양. 보스 스테이지는 섞어서 (null). 포위 스테이지는 원래 포격 함대
const FLEET_PLAN = [
  [null, 'heavy', 'swarm', null, null],
  ['swarm', 'heavy', 'fast', 'barrage', null],
  ['heavy', 'swarm', 'barrage', 'shield', null],
  ['fast', 'barrage', 'shield', 'heavy', null],
  ['barrage', 'swarm', 'fast', 'shield', null],
  ['swarm', 'heavy', 'barrage', 'shield', null],
  ['heavy', 'shield', 'fast', 'barrage', null],
  ['fast', 'barrage', 'heavy', 'swarm', null],
  ['shield', 'swarm', 'barrage', 'heavy', null],
  ['swarm', 'heavy', 'barrage', 'fast', null],
  ['heavy', 'swarm', 'fast', 'barrage', null],
  ['fast', 'barrage', 'heavy', 'shield', null],
  ['heavy', 'fast', 'swarm', 'barrage', null],
  ['swarm', 'shield', 'barrage', 'heavy', null],
  ['barrage', 'fast', 'heavy', 'shield', null],
  ['shield', 'barrage', 'swarm', 'heavy', null],
  ['heavy', 'swarm', 'shield', 'barrage', null],
  ['barrage', 'heavy', 'fast', 'swarm', null],
  ['shield', 'fast', 'barrage', 'heavy', null],
  ['swarm', 'heavy', 'barrage', 'fast', null],
];
function stageInfo(n) {
  const s = Math.floor((n - 1) / 5), i = (n - 1) % 5, kind = STAGE_PLAN[s][i];
  return { n, s, i, sector: SECTORS[s], boss: i === 4, kind, waves: STAGE_KINDS[kind].waves || 5, fleet: FLEET_PLAN[s][i] };
}
// 기체 특성 꼬리표 (기체 카드에 보인다). 고르는 건 플레이어 몫
const TRAIT = { one: ['한 방', '#ff9a5a'], area: ['범위', '#7dff7a'], hold: ['발 묶기', '#5ae8ff'], pierce: ['보호막 파괴', '#6ad0ff'], guard: ['방어', '#e0ff5a'], aid: ['지원', '#c89bff'] };
const UNIT_TRAIT = { f: ['one'], t: ['area', 'pierce'], s: ['one', 'pierce'], g: ['guard'], m: ['guard', 'aid'], e: ['area', 'pierce'], d: ['aid'], c: ['hold'], a: ['area', 'guard'],
  b: ['one', 'area'], r: ['one', 'area'], h: ['area'], n: ['area', 'hold'], x: ['aid'], v: ['hold', 'area'], w: ['guard'], l: ['one', 'pierce'], q: ['area', 'pierce'], y: ['area', 'aid'], k: ['aid'] };
// 함대 성격을 웨이브에 입힌다 (빠진 잔챙이 체력만큼 다른 적으로 채운다)
function applyFleet(ev, st, w) {
  const f = st.fleet; if (!f || f === 'barrage') return;
  const has = k => st.sector.pool.includes(k);
  const grunts = ev.filter(e => e.k === 'grunt');
  if (f === 'heavy') {   // 잔챙이 열에 일곱을 빼고 그만큼 튼튼한 적
    const out = grunts.filter(() => R() < 0.7), big = ['tank'].concat(has('shield') ? ['shield'] : [], has('wreck') ? ['wreck'] : [], has('mother') && w >= 3 ? ['mother'] : []);
    let budget = out.length * ENEMY.grunt.hp;
    for (const e of out) ev.splice(ev.indexOf(e), 1);
    const t0 = ev.length ? 3 : 2;
    for (let k = 0; budget > 0; k++) { const b = big[Math.floor(R() * big.length)]; budget -= ENEMY[b].hp; ev.push({ t: t0 + R() * 16, k: b }); }
  } else if (f === 'swarm') {   // 잔챙이 하나를 작은 적 둘로, 큰 적 절반은 분열 운석으로
    for (const e of grunts) { e.k = 'minion'; ev.push({ t: e.t + 0.4, k: 'minion', surge: e.surge }); }
    for (const e of ev) if (['tank', 'shield', 'mother', 'wreck', 'healer'].includes(e.k) && R() < 0.5) e.k = 'split';
    ev.push({ t: 6 + R() * 10, k: 'rocks' });
  } else if (f === 'fast') {   // 잔챙이 열에 넷을 돌격기로, 큰 적은 위상함이나 균열함
    for (const e of grunts) if (R() < 0.4) e.k = 'rusher';
    const quick = (has('phase') ? ['phase'] : []).concat(has('rift') ? ['rift'] : []);
    for (const e of ev) if (['tank', 'wreck', 'mother'].includes(e.k)) { if (quick.length) e.k = quick[Math.floor(R() * quick.length)]; else { e.k = 'rusher'; ev.push({ t: e.t + 0.6, k: 'rusher' }, { t: e.t + 1.2, k: 'rusher' }); } }
  } else if (f === 'shield') {   // 모든 적이 보호막 (startStage에서 변이). 그만큼 잔챙이를 열에 넷 줄이고, 큰 적 절반은 보호막함
    for (const e of grunts) if (R() < 0.4) ev.splice(ev.indexOf(e), 1);
    for (const e of ev) if (['tank', 'split', 'wreck'].includes(e.k) && R() < 0.5) e.k = 'shield';
  }
}

const kindName = st => st.boss && st.kind === 'base' ? '보스' : STAGE_KINDS[st.kind || 'base'].name;
// 이 웨이브를 기본 5웨이브 흐름의 어디쯤으로 볼지 (적 체력과 구성). 장기전은 7웨이브에 걸쳐 천천히, 러시는 중반부터 시작
const wavePw = (st, w) => st.kind === 'long' ? 1 + (w - 1) * 4 / 6 : st.kind === 'rush' ? [1, 2, 3.4][w - 1] || 3.4 : w;
const twistWave = st => st.kind === 'long' ? 5 : st.kind === 'rush' || st.kind === 'brush' ? 0 : 4;
let WAVE_BASE = 0.7, WAVE_GROWTH = 0.475, IN_SECTOR = 0.05, BOSS_MUL = 1.0;   // 보스 약점(피해 2배) 몫만큼 올림
// 구역 적 체력 (보통 칸 승률 80%쯤, 구역마다 그때 실제로 가질 Mk 기준. 플레이어 모형과 시뮬로 맞춤. 정전, 운석처럼 규칙이 센 구역은 낮게)
let SECTOR_MUL = [1.27, 2.31, 2.47, 6.49, 8.92, 12.33, 10.34, 15.87, 11.89, 21.23, 21.76, 14.22, 29.64, 25.4, 33.6, 36.0, 38.4, 40.8, 43.2, 51.2];
// 구역이 올라갈수록 기지가 보강된 상태로 시작한다 (편성 앞쪽 공격 기체부터)
const START_LV = [[1, 1, 1, 1], [2, 1, 1, 1], [2, 2, 2, 1], [3, 2, 2, 2], [3, 3, 2, 2], [3, 3, 3, 2], [3, 3, 3, 3], [4, 3, 3, 3], [4, 4, 3, 3], [4, 4, 4, 3],
  [4, 4, 4, 4], [4, 4, 4, 4], [5, 4, 4, 4], [5, 4, 4, 4], [5, 5, 4, 4], [5, 5, 4, 4], [5, 5, 5, 4], [5, 5, 5, 4], [5, 5, 5, 5], [5, 5, 5, 5]];

function pickWeighted(pool, fresh) {
  const bag = [];
  for (const k of pool) { bag.push(k); if (fresh.includes(k)) bag.push(k, k); }
  return bag[Math.floor(R() * bag.length)];
}
// 캡슐 내용: 편성한 5종에서만 나온다
// 캡슐 보상: 기체 말고 아이템도 나온다. 수리, 부품, 승급(짝 없는 낮은 기체 한 단계), 폭탄(주변 적 쓸기), 과열(6초 공격 속도)
const CAP_ITEMS = {
  heal: { name: '수리', col: '#6dff8a' },
  gear: { name: '부품', col: '#ffb347' },
  up:   { name: '승급', col: '#c89bff' },
  bomb: { name: '폭탄', col: '#ff5a3a' },
  rush: { name: '과열', col: '#48ffd8' },
};
function rollItem(n) {
  const r = R();
  return r < 0.22 ? { item: 'heal', heal: 2 } : r < 0.5 ? { item: 'gear', n: 3 + Math.floor(n / 10) } : r < 0.68 ? { item: 'up' } : r < 0.86 ? { item: 'bomb' } : { item: 'rush' };
}
function rollReward(n, w, avoid) {
  if (n <= 1) { if (R() < 0.05) return { item: 'heal', heal: 2 }; }
  else if (R() < 0.12 && !(avoid && avoid.item)) return rollItem(n);   // 묶인 캡슐 둘이 모두 아이템이진 않게
  const deck = battleDeck();
  let type, guard = 0;
  const wt = deck.map(t => mkNow(t) >= 6 ? 1.3 : 1), sum = wt.reduce((a, b) => a + b, 0);   // Mk.6 보급 우선: 더 자주
  do { let r = R() * sum, i = 0; while (i < deck.length - 1 && (r -= wt[i]) >= 0) i++; type = deck[i]; } while (avoid && type === avoid.type && guard++ < 8);
  const r = R() + 0.035 * (n - 1) + 0.12 * (w - 1) + 0.25;   // 캡슐이 드문 만큼 하나하나 넉넉하게
  let lv = 1, cnt = 1;
  if (UNIT[type].shape !== 1) { lv = 1; cnt = 1; }
  else if (r < 0.55) cnt = type === 'f' ? 1 + Math.floor(R() * 2) : 1;
  else if (r < 1.05) { if (R() < 0.5) lv = 2; else cnt = type === 'f' ? 3 : 2; }
  else lv = R() < 0.5 ? 3 : 2;
  return { type, lv, n: cnt };
}
// 한 판 = 5웨이브. 기(정찰) 승(본대) 승(공격형 합류) 전(반전 이벤트) 결(총공세 또는 보스)
const TWISTS = ['elite', 'ambush', 'meteors', 'supply'];
const TWIST_TEXT = { elite: 'ELITE', ambush: 'AMBUSH', meteors: 'METEOR STORM', supply: 'SUPPLY RUN' };
const twistOf = st => st.twist || TWISTS[(st.n - 1) % TWISTS.length];
const midWave = st => Math.ceil(st.waves / 2);   // 5웨이브는 3, 7웨이브는 4, 3웨이브는 2
let MID_HP = [0.3, 0.32, 0.34, 0.36, 0.38];   // 중간 보스 체력 = 이 구역 보스의 몇 배 (구역 안 몇 번째 스테이지인지에 따라)
function buildWave(st, w) {
  const ev = [], kind = st.kind || 'base';
  const last = w === st.waves, lw = Math.round(wavePw(st, w)), bossWave = st.boss && last;
  const twist = w === twistWave(st) ? twistOf(st) : null;
  const dur = bossWave ? 50 : last ? 28 : 22;
  let gap = bossWave ? 3.2 : Math.max(0.75, 1.75 - 0.12 * (lw - 1) - 0.05 * st.i - (last ? 0.2 : 0));
  if (kind === 'rush' && !bossWave) gap *= 0.84;   // 러시: 잔챙이가 우다다
  for (let t = 1; t < dur; t += gap) ev.push({ t, k: 'grunt' });
  let pool = st.sector.pool;
  if (st.n === 1) pool = w <= 3 ? ['tank'] : ['tank', 'rocks'];
  let count = st.n === 1 ? Math.max(0, w - 2) : (bossWave ? 1 + Math.min(st.s, 2) : Math.ceil(lw * 0.7) + Math.floor(st.i / 2) + Math.min(st.s, 2));
  if (w === 1) count = Math.min(count, kind === 'rush' ? 2 : 1);
  if (kind === 'rush') count = Math.round(count * 1.15);
  if (kind === 'siege' || kind === 'brush') count = Math.round(count * 0.65);
  for (let k = 0; k < count; k++) {
    let type = pickWeighted(pool, st.sector.fresh);
    if (k === 0 && st.i === 0 && st.sector.fresh.length && w >= 2) type = st.sector.fresh[w % st.sector.fresh.length];
    ev.push({ t: 3 + (k + 0.5) * (dur - 6) / count, k: type });
  }
  if (st.n >= 2 && !bossWave && w >= 2) {
    let atkN = Math.min(3, (lw >= 3 ? 1 : 0) + (lw >= 5 ? 1 : 0) + (st.i >= 3 ? 1 : 0) + (st.s >= 2 ? 1 : 0) + (st.n === 2 && w === 2 ? 1 : 0));
    const pool2 = kind === 'siege' ? ['jammer', 'jammer'].concat(st.sector.atk) : st.sector.atk;
    if (kind === 'siege') atkN += 1;
    for (let k = 0; k < atkN; k++) {
      const type = k === 0 && st.i === 0 ? pool2[pool2.length - 1] : pool2[Math.floor(R() * pool2.length)];
      ev.push({ t: 4 + (k + 0.3) * (dur - 8) / Math.max(1, atkN), k: type });
    }
  }
  if (twist === 'elite') ev.push({ t: 4, k: 'elite' });
  // 중간 보스: 스테이지 3부터 판 한가운데 웨이브에 지금까지 만난 보스 하나가 체력을 줄여 나온다. 잡으면 전설 강화
  const midBoss = st.n >= 3 && !st.endless && w === midWave(st);
  if (midBoss) {
    const bs = SECTORS.slice(0, st.s + 1).map(x => x.boss), k = bs[Math.floor(R() * bs.length)];
    ev.push({ t: 4, k, mini: MID_HP[st.i] * ENEMY[st.sector.boss].hp / ENEMY[k].hp * (st.boss ? 0.6 : 1) });   // 구역 보스 칸: 벽은 보스 본체에 (중간 보스에서 막히면 보스도 못 보고 진다)
  }
  if (kind === 'base' && st.s >= 3 && !bossWave && w === 3 && !midBoss && (st.i === 0 || R() < 0.4)) ev.push({ t: 7, k: 'artillery' });   // 적 본성부터: 중간 보스 포격 순양함
  if (kind === 'siege' && ((w === 3 && !midBoss) || last)) ev.push({ t: 5, k: 'artillery' });
  if (kind === 'brush' && !bossWave && w >= 2 && !midBoss) {   // 보스 러시: 웨이브마다 중간 보스
    if (w !== 3) ev.push({ t: 4, k: 'elite' });
    if (w >= 3) ev.push({ t: w === 3 ? 4 : 12, k: 'artillery' });
  }
  if (twist === 'ambush') for (let k = 0; k < 4; k++) ev.push({ t: 4 + k * 4.5, k: 'ambush' });
  if (twist === 'meteors') for (let k = 0; k < 3; k++) { ev.push({ t: 5 + k * 5.5, k: 'meteor' }); ev.push({ t: 3 + k * 6, k: 'rocks' }); }
  if (bossWave && st.sector.trio) ev.push({ t: 1.5, k: st.sector.boss, x: W / 2, hpMul: 0.6 }, { t: 9, k: st.sector.duo, x: 130, hpMul: 0.35, quiet: true }, { t: 16, k: st.sector.trio, x: W - 130, hpMul: 0.35, quiet: true });   // 공허의 끝: 보스 셋이 차례로
  else if (bossWave && st.sector.duo) ev.push({ t: 1.5, k: st.sector.boss, x: 150, hpMul: 0.62 }, { t: 2.6, k: st.sector.duo, x: W - 150, hpMul: 0.62, quiet: true });   // 보스 둘
  else if (bossWave) ev.push({ t: 1.5, k: st.sector.boss });
  // 몰아치기: 웨이브 중간에 잠깐 조용하다가 몇 초 동안 적이 확 몰려오고, 다시 잠잠해진다 (오르내림)
  if (st.n >= 2 && w >= 2 && !bossWave) {
    const t0 = 8 + R() * (dur - 16), n = 3 + Math.min(3, lw) + (kind === 'rush' ? 2 : 0);
    for (let k = ev.length - 1; k >= 0; k--) if (ev[k].k === 'grunt' && ev[k].t > t0 - 2.5 && ev[k].t < t0 + 6) ev.splice(k, 1);
    ev.push({ t: t0, k: 'surge' });
    for (let k = 0; k < n; k++) ev.push({ t: t0 + 0.4 + k * 0.3, k: k % 4 === 3 && st.s >= 1 ? 'rusher' : 'grunt', surge: true });
  }
  if (st.n >= 2 && w >= 2 && !bossWave && R() < 0.3) ev.push({ t: 6 + R() * 10, k: 'gold' });
  let capT = bossWave ? [6, 16, 26, 36] : last ? [3, 9, 15, 21, 26] : [3, 8.5, 14, 19.5];   // 캡슐은 웨이브에 넷 (마지막 다섯), 넷 중 하나쯤은 아이템. 너무 자주 얻지 않게
  if ((kind === 'long' || kind === 'rush') && !bossWave) capT = capT.concat([6.5]);   // 장기전: 캡슐이 많아 오래 키운다. 러시: 짧은 만큼 빨리 채운다
  if (twist === 'supply') {
    capT = [2, 6, 10, 14, 18];
    for (let k = 0; k < 2; k++) ev.push({ t: 6 + k * 7, k: st.s >= 3 ? 'thief' : st.s >= 1 ? 'rusher' : 'grunt' });
  }
  const rich = hasRule(st.sector.rule, 'rich') && !st.endless;   // 귀한 캡슐: 절반만, 한 단계 높게, 황금 캡슐은 꼭
  if (rich) { capT = capT.filter((_, k) => k % 2 === 0); if (w >= 2 && !bossWave && !ev.some(e => e.k === 'gold')) ev.push({ t: 6 + R() * 8, k: 'gold' }); }
  const richUp = r => { if (rich && r.type && UNIT[r.type].shape === 1) r.lv = Math.min(3, r.lv + 1); return r; };
  // 기체 캡슐 종류: 그냥, 둘 중 하나(OR), 성장(쏠수록 +1 또는 레벨이 오르다가 방어선 앞에서 열린다), 룰렛(깨는 순간 보이던 기체)
  capT.forEach((t, k) => {
    const a = richUp(rollReward(st.n, Math.min(lw, 3))), q = R();
    if (a.type && st.n >= 2 && UNIT[a.type].shape === 1 && q < 0.24) { a.grow = R() < 0.6 ? 'n' : 'lv'; a.n = 1; a.lv = a.grow === 'lv' ? 1 : Math.min(a.lv, 2); }
    else if (a.type && st.n >= 2 && q < 0.36) a.spin = true;
    ev.push({ t, k: 'cap', r: k % 2 && !a.grow && !a.spin ? [a, richUp(rollReward(st.n, Math.min(lw, 3), a))] : a });
  });
  if (!st.endless && !st.training) applyFleet(ev, st, w);
  return ev.sort((a, b) => a.t - b.t);
}

// 무한 방어선: 10웨이브가 한 주기. 1~3 평이, 4 반전, 5 중간 보스, 6 새 변이, 9 위기, 10 보스(20웨이브부터 둘, 격노), 다음 주기 첫 판은 보급. 강화는 2웨이브마다와 보스 뒤
const MUTATORS = [
  { id: 'fast', name: '추진기 과부하', desc: '적 이동 속도 +20%' },
  { id: 'shield', name: '보호막 장착', desc: '모든 적이 보호막을 달고 와요' },
  { id: 'regen', name: '자가 수복', desc: '적 체력이 초당 2%씩 차올라요' },
  { id: 'rapid', name: '속사 조준', desc: '공격형 함선의 공격 주기 -30%' },
  { id: 'swarm', name: '대군', desc: '잔챙이가 1.6배로 몰려와요' },
  { id: 'armor', name: '중장갑', desc: '적 체력 +25%' },
  { id: 'raid', name: '강습대', desc: '웨이브마다 공격형 함선 +2' },
];
const mutOn = id => !!S.mut && S.mut.includes(id);
const cyclePos = w => (w - 1) % 10 + 1;
// 한 주기: 1 숨 돌리기, 2~4 오름, 5 미니보스, 6 숨 돌리기(변이), 7~8 오름, 9 위기, 10 보스
const PACE = [0.75, 0.9, 1, 1.1, 1.35, 0.75, 0.95, 1.05, 1.15, 1];
const LULL = ci => ci === 1 || ci === 6;
// 무한 방어선: 주기마다 적의 공격 간격이 8%씩 짧아진다
const endlessAtkMul = () => S.stage && S.stage.endless ? Math.pow(0.92, Math.floor((S.wave - 1) / 10)) : 1;
function buildEndlessWave(w) {
  const ci = cyclePos(w), cyc = Math.floor((w - 1) / 10);
  const tier = Math.min(3, Math.floor((w - 1) / 6));
  const bossW = ci === 10, bs = Math.floor(R() * ENDLESS_SECTORS), supply = ci === 1 && w > 10;
  S.crisis = ci === 9;
  S.stage.s = bossW ? bs : tier; S.stage.sector = SECTORS[S.stage.s];
  const st = { n: Math.min(20, 3 + w), s: tier, i: Math.min(3, Math.floor(w / 5)), sector: SECTORS[S.stage.s], boss: bossW, waves: 5, twist: supply ? 'supply' : TWISTS[1 + cyc % 2] };
  const ev = buildWave(st, bossW ? 5 : supply ? 4 : [2, 3, 4, 4, 5, 2, 3, 4, 5][ci - 1]);
  if (ci === 5) {   // 5웨이브째도 보스 (체력을 줄여서). 2주기부터는 엘리트 호위도
    ev.push({ t: 3, k: SECTORS[Math.floor(R() * ENDLESS_SECTORS)].boss, mini: 0.4 + 0.1 * Math.min(3, cyc) });
    if (cyc >= 1) ev.push({ t: 12, k: 'elite' });
  }
  if (LULL(ci) && !supply) for (const t of [5, 13]) ev.push({ t, k: 'cap', r: rollReward(st.n, 3) });   // 숨 돌리는 웨이브엔 캡슐을 더
  const atk = st.sector.atk, add = (k, t, x) => ev.push({ t, k, x });
  if (S.crisis) {
    for (let k = 0; k < 3; k++) add(atk[k % atk.length], 5 + k * 5);
    for (let t = 2; t < 26; t += 1.6) add('grunt', t);
  }
  if (mutOn('raid') && !bossW) for (let k = 0; k < 2; k++) add(atk[Math.floor(R() * atk.length)], 6 + k * 7);
  // 주기가 돌수록 처음엔 중간 보스였던 적이 졸병처럼 섞여 나온다: 2주기 엘리트 전함, 3주기 포격 순양함과 교란함
  if (!bossW && !LULL(ci) && ci !== 5) {
    for (let k = 0; k < Math.min(3, cyc); k++) add('elite', 5 + k * 7 + R() * 3);
    if (cyc >= 2) { add('artillery', 8 + R() * 6); for (let k = 0; k < Math.min(2, cyc - 1); k++) add('jammer', 4 + k * 8 + R() * 4); }
  }
  if (mutOn('swarm')) { const gs = ev.filter(e => e.k === 'grunt'); for (let k = 0; k < Math.round(gs.length * 0.6); k++) add('grunt', gs[k].t + 0.5); }
  if (bossW && w >= 20) ev.find(e => ENEMY[e.k] && ENEMY[e.k].boss).rage = true;   // 3주기부터 10웨이브 보스는 처음부터 격노
  if (bossW && w >= 20) {
    const b1 = ev.find(e => ENEMY[e.k] && ENEMY[e.k].boss);
    let k2; do { k2 = SECTORS[Math.floor(R() * ENDLESS_SECTORS)].boss; } while (k2 === b1.k);
    b1.x = 160; add(k2, 4, W - 160);
  }
  return ev.sort((a, b) => a.t - b.t);
}
const PERKS = [
  { tier: 1, id: 'dmg', cat: 'atk', name: '공격력 증폭', desc: '모든 기체 공격력 +15%', col: '#ff8a4a', apply: () => { S.pk.dmg *= 1.15; } },
  { tier: 1, id: 'spd', cat: 'atk', name: '냉각 개선', desc: '모든 기체 공격 속도 +12%', col: '#48c8ff', apply: () => { S.pk.spd *= 1.12; } },
  { tier: 1, id: 'shield', cat: 'def', name: '방어선 보강', desc: '기지 보호막 최대치 +3, 즉시 +3', col: '#5affc8', apply: () => { S.maxHp += 3; S.hp += 3; } },
  { tier: 1, id: 'armor', cat: 'def', name: '장갑 강화', desc: '모든 기체 최대 체력 +2', col: '#6ad0ff', apply: () => { S.pk.hp += 2; for (const u of allUnits()) { u.maxHp += 2; u.hp += 2; } } },
  { tier: 1, id: 'cap', cat: 'sup', name: '보급 효율', desc: '캡슐을 까는 데 필요한 타수 -20%', col: '#ffd84a', apply: () => { S.pk.cap *= 0.8; } },
  { tier: 1, id: 'slow', cat: 'def', name: '중력 교란', desc: '모든 적 이동 속도 -10%', col: '#b86bff', apply: () => { S.pk.enemySpd *= 0.9; } },
  { tier: 1, id: 'repair', cat: 'def', name: '자동 수리', desc: '웨이브를 넘길 때마다 기지 보호막 +1', col: '#6dff8a', apply: () => { S.pk.regen += 1; } },
  { tier: 1, id: 'gift', cat: 'sup', name: '긴급 증원', desc: '가장 높은 기체보다 한 단계 아래 기체를 지급 (Lv3 이상)', col: '#ffe24a', apply: () => {   // 후반에도 쓸모 있게: 판의 최고 레벨 -1 (Lv3~6)
      const pool = battleDeck().filter(t => UNIT[t].shape === 1), top = allUnits().reduce((m, u) => Math.max(m, u.lv), 1);
      giveUnit(pool[Math.floor(Math.random() * pool.length)] || 'f', Math.max(3, Math.min(6, top - 1)), W / 2, 420, '#ffe24a'); } },
  { tier: 1, id: 'crit', cat: 'atk', name: '약점 분석', desc: '모든 공격이 15% 확률로 2배 피해', col: '#ff5a8a', apply: () => { S.pk.crit += 0.15; } },
  { tier: 1, id: 'salvage', cat: 'sup', name: '부품 회수', desc: '격추한 적이 부품을 두 배 자주 떨궈요', col: '#ffc86a', apply: () => { S.pk.gear *= 2; } },
  { tier: 1, id: 'summon', cat: 'sup', name: '소환 할인', desc: '소환에 드는 부품 -25%', col: '#ffe08a', apply: () => { S.pk.summonOff += 1; } },
  { tier: 1, id: 'elite', cat: 'sup', name: '정예 소환', desc: '소환하면 나오는 기체 레벨 +1', col: '#ffc24a', ok: () => summonLv() < 5, apply: () => { S.pk.summonLv += 1; } },
  { tier: 1, id: 'cmdup', cat: 'sp', name: '지휘 통신', desc: '사령관 게이지가 60% 더 빨리 차요', col: '#ffd24a', ok: () => cmdOpen(), apply: () => { S.pk.cmd *= 1.6; } },
  { tier: 1, id: 'chain', cat: 'sp', name: '연쇄 폭발', desc: '격추한 적이 터지며 주변 적에게 피해를 줘요', col: '#ff6a3a', apply: () => { S.pk.chain += 0.35; } },
  { tier: 1, id: 'arc', cat: 'sp', name: '합체 방전', desc: '합체할 때마다 가까운 적 셋에게 번개가 떨어져요', col: '#9ad8ff', apply: () => { S.pk.arc += 1; } },
  { tier: 1, id: 'killrush', cat: 'atk', name: '전투 열기', desc: '적을 격추하면 2초 동안 공격 속도 +15%', col: '#ff7a5a', apply: () => { S.pk.killRush = (S.pk.killRush || 0) + 0.15; } },
  { tier: 1, id: 'vanguard', cat: 'atk', name: '선봉대', desc: '맨 앞줄 기체 공격력 +25%', col: '#ff9a4a', apply: () => { S.pk.vanguard = (S.pk.vanguard || 0) + 0.25; } },
  { tier: 1, id: 'capslow', cat: 'def', name: '냉각 캡슐', desc: '캡슐을 까면 주변 적이 3초 동안 느려져요', col: '#7fd4ff', apply: () => { S.pk.capSlow = (S.pk.capSlow || 0) + 1; } },
  { tier: 1, id: 'wavegear', cat: 'sup', name: '보급선', desc: '웨이브마다 부품 +2, 5웨이브마다 1씩 더 늘어요', col: '#ffd84a', apply: () => { S.pk.waveGear = (S.pk.waveGear || 0) + 1; } },
  { tier: 1, id: 'refund', cat: 'sup', name: '분해 전문가', desc: '기체를 해체하면 부품을 2배로 받아요', col: '#ffc24a', apply: () => { S.pk.refund = (S.pk.refund || 0) + 1; } },
  { tier: 1, id: 'caprush', cat: 'atk', name: '보급 열기', desc: '캡슐을 까면 3초 동안 공격력 +20%', col: '#7fe0ff', apply: () => { S.pk.capRush = (S.pk.capRush || 0) + 0.2; } },
  { tier: 1, id: 'emptyslot', cat: 'atk', name: '빈자리 활용', desc: '판의 빈 칸 하나마다 공격력 +3%', col: '#5affc8', apply: () => { S.pk.empty = (S.pk.empty || 0) + 0.03; } },
  // 고급: 판 흐름을 바꾸는 강화
  { tier: 2, id: 'recycle', cat: 'sup', name: '재활용 합체', desc: '합체할 때마다 부품 +1', col: '#ffc24a', apply: () => { S.pk.recycle = (S.pk.recycle || 0) + 1; } },
  { tier: 2, id: 'mergeheal', cat: 'def', name: '합체 수리', desc: '합체하면 기지 보호막 +1 (5초에 한 번)', col: '#b88aff', apply: () => { S.pk.mergeHeal = 1; } },
  { tier: 2, id: 'execboom', cat: 'atk', name: '처형 폭발', desc: '마무리 사격이나 치명타로 격추한 적이 크게 터져요', col: '#ff6a4a', apply: () => { S.pk.execBoom = (S.pk.execBoom || 0) + 1; } },
  { tier: 2, id: 'adversity', cat: 'def', name: '역경', desc: '기지 보호막이 3 이하면 공격 속도 +50%', col: '#ff4a7a', apply: () => { S.pk.adversity = (S.pk.adversity || 0) + 0.5; } },
  { tier: 2, id: 'gamble', cat: 'sup', name: '도박사', desc: '캡슐이 30% 확률로 한 단계 높게, 20% 확률로 꽝', col: '#ffb020', apply: () => { S.pk.gamble = 1; } },
  { tier: 2, id: 'few', cat: 'atk', name: '소수 정예', desc: '판에 기체가 6기 이하면 공격력 +60%', col: '#ff6a8a', apply: () => { S.pk.few = (S.pk.few || 0) + 0.6; } },
  { tier: 2, id: 'many', cat: 'atk', name: '물량전', desc: '판의 기체 하나마다 공격력 +4% (최대 +60%)', col: '#ffa04a', apply: () => { S.pk.many = (S.pk.many || 0) + 0.04; } },
  { tier: 2, id: 'vamp', cat: 'def', name: '흡수 방벽', desc: '적을 25기 격추할 때마다 기지 보호막 +1', col: '#6dff8a', apply: () => { S.pk.vamp = (S.pk.vamp || 0) + 1; } },
  { tier: 2, id: 'overkill', cat: 'atk', name: '넘치는 피해', desc: '격추하고 남은 피해가 주변 적에게 터져요', col: '#ff5a3a', apply: () => { S.pk.overkill = (S.pk.overkill || 0) + 0.7; } },
  { tier: 2, id: 'interest', cat: 'sup', name: '부품 이자', desc: '웨이브를 넘길 때 가진 부품 10개마다 +1 (최대 +5)', col: '#ffe08a', apply: () => { S.pk.interest = (S.pk.interest || 0) + 1; } },
  { tier: 2, id: 'twin', cat: 'sp', name: '쌍둥이 합체', desc: '합체할 때 20% 확률로 한 단계 더 올라요', col: '#9affd8', apply: () => { S.pk.twin += 0.2; } },
  { tier: 2, id: 'lonely', cat: 'atk', name: '고독한 에이스', desc: '주변 8칸이 빈 기체는 공격력 2배', col: '#ff9a5a', apply: () => { S.pk.lonely += 1; } },
  { tier: 2, id: 'fin', cat: 'atk', name: '마무리 사격', desc: '체력이 12% 아래로 떨어진 적은 바로 격추 (보스 빼고)', col: '#ff5a5a', apply: () => { S.pk.fin += S.pk.fin ? 0.06 : 0.12; } },
  { tier: 2, id: 'hunt', cat: 'atk', name: '거함 격파', desc: '보스, 엘리트, 순양함, 모함에게 주는 피해 +50%', col: '#ffb84a', apply: () => { S.pk.hunt += 0.5; } },
  { tier: 2, id: 'capbomb', cat: 'sup', name: '캡슐 폭탄', desc: '캡슐을 까면 그 자리에서 크게 터져 주변 적을 쓸어요', col: '#ffd84a', apply: () => { S.pk.capBomb += 1; } },
  { tier: 2, id: 'fixall', cat: 'def', name: '긴급 복구', desc: '봉쇄된 칸을 모두 되살려요', col: '#ff8a8a', ok: () => S.broken.some(b => b.seal), apply: () => { S.broken = S.broken.filter(b => !b.seal); addText(W / 2, LINE_Y - 60, '칸 복구!', '#8dff9a', 26, 1.2); } },
  { tier: 2, id: 'heat', cat: 'sp', name: '합체 열기', desc: '합체하면 4초 동안 모든 기체 공격 속도 +40%', col: '#ff7ae0', apply: () => { S.pk.heat += 0.4; } },
  // 전설: 보스를 잡으면 하나는 꼭 나온다
  { tier: 3, id: 'glass', once: true, cat: 'atk', name: '유리 대포', desc: '공격력 2배, 대신 기지 보호막 최대치가 절반', col: '#ff3a5a', apply: () => { S.pk.dmg *= 2; S.maxHp = Math.max(1, Math.ceil(S.maxHp / 2)); S.hp = Math.min(S.hp, S.maxHp); } },
  { tier: 3, id: 'oc', once: true, cat: 'sp', name: '과충전', desc: '사령관 스킬을 쓰면 6초 동안 모든 기체 공격 속도 2배', col: '#ffe24a', ok: () => cmdOpen(), apply: () => { S.pk.oc = 1; } },
  { tier: 3, id: 'berserk', cat: 'atk', name: '광전사', desc: '기지 보호막을 1칸 잃을 때마다 공격력 +15%', col: '#ff3a3a', apply: () => { S.pk.berserk = (S.pk.berserk || 0) + 0.15; } },
  { tier: 3, id: 'goldcap', cat: 'sup', name: '황금 손', desc: '캡슐의 12%가 Lv3 황금 캡슐로 바뀌어요', col: '#ffd24a', apply: () => { S.pk.goldCap = (S.pk.goldCap || 0) + 0.12; } },
  { tier: 3, id: 'bulwark', cat: 'def', name: '철옹성', desc: '기지 보호막 최대치 +10, 즉시 +10. 대신 공격력 -20%', col: '#5affc8', apply: () => { S.maxHp += 10; S.hp += 10; S.pk.dmg *= 0.8; } },
  { tier: 3, id: 'laststand', cat: 'sup', name: '배수진', desc: '기지 보호막이 3 이하면 모든 캡슐이 Lv3 황금 캡슐', col: '#ff4a7a', apply: () => { S.pk.lastStand = 1; } },
  { tier: 3, id: 'scrap', need: 3, cat: 'atk', name: '고철 무장', desc: '가진 부품 10개마다 공격력 +4%. 모아 둘수록 세져요', col: '#ffc86a', apply: () => { S.pk.scrap += 0.04; } },
  { tier: 3, id: 'revive', need: 6, once: true, cat: 'def', name: '최후의 방벽', desc: '기지 보호막이 처음 0이 되면 5로 버티고 적이 3초 멈춰요', col: '#5affc8', apply: () => { S.pk.revive = 1; } },
];

// 계정 레벨: 판이 끝날 때 경험치를 받는다. 다음 레벨까지 100 + 40 × 지금 레벨
const xpNeed = l => 100 + 40 * l;
function lvlOf(xp) { let l = 1; while (xp >= xpNeed(l)) { xp -= xpNeed(l); l++; } return { lvl: l, cur: xp, need: xpNeed(l) }; }
const LEVEL_REWARDS = {
  2: { core: 300 }, 3: { perk: 'scrap' }, 4: { core: 500 }, 5: { title: '신참 지휘관' }, 6: { perk: 'revive' }, 7: { core: 800 },
  8: { floor: 'hatch' }, 10: { title: '베테랑', core: 1000 }, 12: { floor: 'grid' }, 15: { title: '에이스' },
};
const levelReward = l => LEVEL_REWARDS[l] || (l >= 16 ? { core: 500 } : null);   // 16부터는 레벨마다 코어 500
const FLOORS = { '': '기본', hatch: '빗금', grid: '격자 테두리' };
const floorsOwned = () => [''].concat(Object.keys(LEVEL_REWARDS).filter(l => l <= (PROG.lvl || 1) && LEVEL_REWARDS[l].floor).map(l => LEVEL_REWARDS[l].floor));
function titleOf() { let t = ''; for (let l = 2; l <= (PROG.lvl || 1); l++) { const r = levelReward(l); if (r && r.title) t = r.title; } return t; }
function payLevel(l) { const r = levelReward(l); if (!r) return; if (r.core) PROG.credits += r.core; if (r.floor) PROG.floor = r.floor; }
// 경험치를 더하고 오른 레벨의 보상을 준다. 결과 화면이 S.xpFrom / S.xpGain / S.lvlUps로 막대와 보상 카드를 보여 준다
function gainXp(n) {
  S.xpFrom = PROG.xp || 0; S.xpGain = n; S.lvlUps = [];
  PROG.xp = S.xpFrom + n;
  const L = lvlOf(PROG.xp).lvl;
  for (let l = (PROG.lvl || 1) + 1; l <= L; l++) { payLevel(l); addGems(50); if (levelReward(l)) S.lvlUps.push(l); }   // 보상 없는 레벨은 막대 반짝임만. 레벨마다 다이아 50
  PROG.lvl = Math.max(PROG.lvl || 1, L);
}
// 레벨이 생기기 전 저장: 깬 스테이지마다 100으로 쳐서 레벨을 맞추고 보상은 조용히 준다
if (PROG.xp == null) {
  PROG.xp = Object.keys(PROG.stars).length * 100; PROG.lvl = lvlOf(PROG.xp).lvl;
  for (let l = 2; l <= PROG.lvl; l++) payLevel(l);
}

const catCount = cat => S.perks.filter(id => { const p = PERKS.find(q => q.id === id); return p && p.cat === cat; }).length;

const PERK_CAT = { atk: ['공격', '#ff8a4a'], def: ['방어', '#5affc8'], sup: ['보급', '#ffd84a'], sp: ['특수', '#b88aff'] };
// 등급: 일반(1), 고급(2), 전설(3). 한 번 고를 때 셋 다 같은 등급, 보스를 잡은 뒤 첫 선택은 셋 다 전설
// 빌드: 서로 잘 어울리는 강화 묶음. 카드에 빌드 이름표, 가진 강화와 빌드가 겹치면 그 색으로 빛난다
const BUILD = { gear: ['부품', '#ffc24a'], cap: ['캡슐', '#7fe0ff'], merge: ['합체', '#b88aff'], kill: ['연쇄', '#ff6a4a'], risk: ['위기', '#ff4a7a'], place: ['배치', '#5affc8'] };
const PERK_BUILD = {
  salvage: ['gear'], summon: ['gear'], elite: ['gear'], interest: ['gear'], wavegear: ['gear'], scrap: ['gear'], refund: ['gear'], recycle: ['gear', 'merge'],
  cap: ['cap'], capslow: ['cap'], capbomb: ['cap'], gamble: ['cap'], goldcap: ['cap'], gift: ['cap'], caprush: ['cap', 'kill'], laststand: ['cap', 'risk'],
  twin: ['merge'], heat: ['merge'], arc: ['merge'], mergeheal: ['merge', 'risk'],
  chain: ['kill'], overkill: ['kill'], killrush: ['kill'], vamp: ['kill'], fin: ['kill'], crit: ['kill'], execboom: ['kill'],
  berserk: ['risk'], glass: ['risk'], revive: ['risk'], bulwark: ['risk'], shield: ['risk'], repair: ['risk'], adversity: ['risk'],
  lonely: ['place'], few: ['place'], many: ['place'], vanguard: ['place'], emptyslot: ['place'],
};
const ownBuilds = () => { const s = new Set(); for (const id of S.perks) for (const b of PERK_BUILD[id] || []) s.add(b); return s; };
// 같은 강화를 여러 번 고르면 쌓이는 효과 (n개일 때). 강화 카드에 "2개: +32% → +52%"처럼 보여 준다
const pct = v => `${Math.round(v * 100)}%`;
const PERK_SUM = {
  dmg: n => `공격력 +${pct(Math.pow(1.15, n) - 1)}`, spd: n => `공격 속도 +${pct(Math.pow(1.12, n) - 1)}`,
  shield: n => `보호막 최대치 +${3 * n}`, armor: n => `기체 체력 +${2 * n}`, cap: n => `캡슐 타수 -${pct(1 - Math.pow(0.8, n))}`,
  slow: n => `적 속도 -${pct(1 - Math.pow(0.9, n))}`, repair: n => `웨이브마다 보호막 +${n}`,
  crit: n => `치명타 확률 ${15 * n}%`, salvage: n => `부품 ×${Math.pow(2, n)}`, summon: n => `소환 비용 -${pct(1 - Math.pow(0.75, n))}`,
  elite: n => `소환 레벨 +${n}`, cmdup: n => `게이지 속도 +${pct(Math.pow(1.6, n) - 1)}`, chain: n => `폭발 피해 ${35 * n}%`, arc: n => `번개 피해 ×${n}`,
  killrush: n => `공격 속도 +${15 * n}%`, vanguard: n => `앞줄 공격력 +${25 * n}%`, wavegear: n => `웨이브마다 부품 +${2 * n}부터`,
  few: n => `공격력 +${60 * n}%`, many: n => `기체마다 +${4 * n}% (최대 60%)`, vamp: n => `${Math.ceil(25 / n)}기마다 보호막 +1`, overkill: n => `남은 피해 ${70 * n}%`,
  interest: n => `10개마다 +${n} (최대 ${5 * n})`, twin: n => `확률 ${20 * n}%`, lonely: n => `공격력 ×${1 + n}`, fin: n => `${12 + 6 * (n - 1)}% 아래 격추`,
  hunt: n => `큰 적 피해 +${50 * n}%`, capbomb: n => `폭발 ×${n}`, heat: n => `공격 속도 +${40 * n}%`, berserk: n => `한 칸마다 +${15 * n}%`,
  goldcap: n => `황금 캡슐 ${12 * n}%`, refund: n => `해체 부품 ×${1 + n}`, caprush: n => `캡슐 뒤 공격력 +${20 * n}%`, emptyslot: n => `빈 칸마다 +${3 * n}%`, recycle: n => `합체마다 부품 +${n}`, execboom: n => `폭발 ×${n}`, adversity: n => `공격 속도 +${50 * n}%`, bulwark: n => `보호막 +${10 * n}, 공격력 -${pct(1 - Math.pow(0.8, n))}`, scrap: n => `10개마다 +${4 * n}%`,
};
// 등급마다 확실히 다르게: 테두리 색과 굵기, 바탕, 별 개수 (일반 ★, 고급 ★★, 전설 ★★★)
const PERK_TIER = {
  1: { name: '일반', col: '#a8b4c8', bg: ['rgba(20,26,42,.97)', 'rgba(10,14,26,.97)'], lw: 1.5 },
  2: { name: '고급', col: '#4ab8ff', bg: ['rgba(12,44,96,.97)', 'rgba(6,16,46,.97)'], lw: 3.5 },
  3: { name: '전설', col: '#ffb020', bg: ['rgba(84,50,6,.97)', 'rgba(34,18,2,.97)'], lw: 4.5 },
};
function rollPerks() {
  const can = p => (!p.ok || p.ok()) && !(p.once && S.perks.includes(p.id)) && (PROG.lvl || 1) >= (p.need || 0);   // need: 계정 레벨로 풀리는 강화
  // 한 번에 등급 하나 (롤체 증강처럼): 셋 다 같은 등급, 효과만 다르다. 보스를 잡은 뒤엔 셋 다 전설
  const r = R(), want = S.legendNext ? 3 : r < 0.1 ? 3 : r < 0.45 ? 2 : 1, out = [];
  for (let tier = want; tier >= 1 && out.length < 3; tier--) {   // 그 등급이 모자라면 아래 등급으로 채운다
    while (out.length < 3) {
      const bag = PERKS.filter(p => p.tier === tier && can(p) && !out.includes(p));
      if (!bag.length) break;
      const fresh = bag.filter(p => !out.some(q => q.cat === p.cat));
      const pick = fresh.length ? fresh : bag;
      // 이미 가진 강화는 가진 개수만큼 확률이 절반씩 (운이 좋으면 겹친다)
      const wt = p => Math.pow(0.5, S.perks.filter(q => q === p.id).length), tot = pick.reduce((a, p) => a + wt(p), 0);
      let r2 = R() * tot, sel = pick[pick.length - 1];
      for (const p of pick) { r2 -= wt(p); if (r2 <= 0) { sel = p; break; } }
      out.push(sel);
    }
  }
  S.legendNext = false;
  S.perkT0 = performance.now() / 1000;
  return out;
}

// ── 게임 상태 ─────────────────────────────────────────────
let S = { mode: 'title' };
let BUTTONS = [];
let UI = { card: null, settings: false, resetArm: 0, toast: null, coreShown: null, upFx: null, parts: [], lastT: 0 };
function startStage(n, endless = false, daily = false) {
  UI.enemyIntro = null; UI.introQ = null; UI.aim = null;
  const st = n === 'train' ? { n: 0, s: 0, i: 0, sector: SECTORS[0], boss: false, waves: 1, kind: 'base', training: true }   // 훈련장: 튜토리얼 전용, 지지 않는다
    : endless ? { n: 0, s: 0, i: 0, sector: SECTORS[0], boss: false, waves: Infinity, endless: true } : stageInfo(n);
  S = {
    mode: 'play', stage: st, paused: false,
    wave: 0, waveT: 0, events: [], breakT: 0,
    hp: 10, maxHp: 10,
    slots: new Array(COLS * ROWS).fill(null),
    reserve: new Array(RES_N).fill(null),
    enemies: [], caps: [], shots: [], fx: [], texts: [],
    zones: [], strikes: [], beams: [], attacks: [], mines: [], fields: [], holes: [], rebuilds: [],
    focus: null, boss: null, baseGuardT: 0,
    hint: null, hintT: 0, hintQueue: [],
    shake: 0, time: 0, glitch: 0, lost: 0,
    parts: [], shieldHits: [], banner: null, warning: 0, whiteFlash: 0, skillPop: null,
    score: 0, perks: [], perkChoices: null, cores: 0, corePulse: 0, dmgBy: {}, used: {}, bpGot: [], gemsGot: 0,
    pk: { dmg: 1, spd: 1, hp: 0, cap: 1, enemySpd: 1, regen: 0, crit: 0, gear: 1, summonOff: 0, summonLv: 0, cmd: 1, chain: 0, arc: 0, twin: 0, lonely: 0, fin: 0, hunt: 1, capBomb: 0, heat: 0, oc: 0, scrap: 0, revive: 0 }, chainQ: [], heatT: 0, ocT: 0, legendNext: false,
    gear: 0, rowsOpen: START_ROWS, mut: [], crisis: false, punch: 0, broken: [],
  };
  RES_W = 46;
  if (daily === 'weekly') { const wk = weekKey(); S.daily = { day: wk, weekly: true, rule: weeklyRule(wk), deck: weeklyDeck(wk) }; lbFetchWeekly(true); }
  else if (daily) { S.daily = { day: dayKey(), deck: dailyDeck(dayKey()) }; lbFetchDaily(true); }
  const types = battleDeck().filter(t => UNIT[t].shape === 1).sort((a, b) => UNIT[b].stat[0] * UNIT[b].stat[1] - UNIT[a].stat[0] * UNIT[a].stat[1]);
  START_LV[endless ? 1 : st.s].forEach((lv, j) => { const u = makeUnit(types[j % types.length] || 'f', lv); S.used[u.type] = (S.used[u.type] || 0) + Math.pow(2, lv - 1); const sp = findSpot(u); if (sp) place(u, sp); });
  hintOnce('info', '기체를 꾹 누르면 정보가 나와요');
  if (endless) hintOnce('endless4', '2웨이브마다 강화, 5웨이브마다 보스');
  if (st.training) S.tut = { step: 1, t: 0 };
  if (!SHOT && !PROG.seen.cmdTut && cmdOpen() && !st.training) S.cmdTut = {};
  if (S.daily && S.daily.rule && S.daily.rule.start) S.daily.rule.start();   // 이번 주 규칙
  if (st.fleet === 'shield') S.mut.push('shield');   // 보호막 함대: 모든 적이 보호막
  if (!endless && hasRule(st.sector.rule, 'regen')) S.mut.push('regen');   // 재생 군단: 모든 적이 체력을 되찾는다
  // 구역 런: 바로 앞 스테이지를 깨고 이어서 왔으면 그때 강화를 다시 건다 (한 번 쓰고 끝나는 강화는 빼고)
  const run = PROG.run;
  if (!endless && !st.training && run && run.s === st.s && run.n === st.n - 1) for (const id of run.perks) { const p = PERKS.find(q => q.id === id); if (p && id !== 'gift' && id !== 'fixall') { p.apply(); S.perks.push(id); } }
  startWave(1);
  if (!SHOT) play('vo_welcome', 0.6);   // 전투 시작 음성
}
function makeUnit(type, lv) {
  const hp = unitMaxHp(type, lv);
  return { type, lv, hp, maxHp: hp, cells: null, res: null, cd: Math.random() * 0.3, sk: 2, ang: -Math.PI / 2,
           pop: 0.4, hurt: 0, drones: [], t1: 0, t2: 0, t3: 0, buffSpd: 0, buffDmg: 0 };
}
// 모양 = 기준 칸에서의 [행, 열] 목록
const SHAPES = { 1: [[0, 0]], h2: [[0, 0], [0, 1]], v2: [[0, 0], [1, 0]], h3: [[0, 0], [0, 1], [0, 2]], v3: [[0, 0], [1, 0], [2, 0]], L: [[0, 0], [1, 0], [1, 1]], sq: [[0, 0], [0, 1], [1, 0], [1, 1]] };
const shapePts = type => SHAPES[UNIT[type].shape];
function shapeDims(type) {
  const pts = shapePts(type);
  return { h: Math.max(...pts.map(p => p[0])) + 1, w: Math.max(...pts.map(p => p[1])) + 1 };
}
const uSize = u => SHAPES[UNIT[u.type].shape].length;

function startWave(n) {
  const st = S.stage;
  S.wave = n; S.waveT = 0; S.mode = 'play';
  if (S.pk.waveGear && n > 1) addGear(S.pk.waveGear * (2 + Math.floor(n / 5)), W / 2, LINE_Y - 80);
  if (st.endless) {
    const ci = cyclePos(n);
    let mut = null;
    if (ci === 6) {
      const left = MUTATORS.filter(m => !S.mut.includes(m.id));
      if (S.daily) S.rng = mulberry(seedOf('mut' + S.daily.day + n));
      mut = left.length ? left[Math.floor(R() * left.length)] : MUTATORS.find(m => m.id === 'armor');
      S.mut.push(mut.id);
    }
    if (S.daily) S.rng = mulberry(seedOf('wave' + S.daily.day + n));
    S.events = buildEndlessWave(n);
    S.rng = null;
    if (ci === 10) { S.warning = 3; S.banner = null; play('drums', 0.7); }
    else if (mut) { S.banner = { text: 'MUTATION', color: '#ff5ad8', t: 0, life: 3.2 }; play('drums', 0.55, 1.1); S.glitch = 0.5; }
    else if (ci === 9) { S.banner = { text: 'CRISIS', color: '#ff3a4a', t: 0, life: 2.8 }; play('drums', 0.7); shake(0.5); }
    else if (ci === 5) { S.banner = { text: 'MID BOSS', color: '#ffb347', t: 0, life: 2.8 }; play('drums', 0.6); }
    else if (ci === 1 && n > 10) { const cy = Math.floor((n - 1) / 10); S.banner = { text: `CYCLE ${cy + 1}`, color: '#ff5ad8', t: 0, life: 3.2 }; play('drums', 0.6, 0.9); }
    else if (LULL(ci) && !(ci === 1 && n > 10)) S.banner = { text: 'LULL', color: '#5affc8', t: 0, life: 2.6 };
    else if (ci === 4 || (ci === 1 && n > 10)) { S.banner = { text: TWIST_TEXT[ci === 4 ? TWISTS[1 + Math.floor((n - 1) / 10) % 2] : 'supply'], color: '#ff8a4a', t: 0, life: 2.6 }; }
    else S.banner = { text: `WAVE ${n}`, color: ci === 5 ? '#ff5a6a' : '#ffd966', t: 0, life: 2 };
    return;
  }
  S.events = st.training ? [] : buildWave(st, n);   // 훈련장은 튜토리얼이 필요한 적만 꺼낸다
  if (hasRule(st.sector.rule, 'wreck')) { S.broken = S.broken.filter(b => !b.wreck); breakCells(2 + (Math.random() < 0.5 ? 1 : 0), Infinity, true); }   // 폐허 함대: 웨이브마다 부서진 칸이 바뀐다
  const K = STAGE_KINDS[st.kind || 'base'], lastW = n === st.waves;
  if (st.boss && lastW) { S.warning = 3; S.banner = null; play('drums', 0.7); }
  else if (n === 1 && st.training) S.banner = { text: 'TRAINING', color: '#5affc8', t: 0, life: 2.6 };
  else if (n === 1) S.banner = { text: `STAGE ${st.n}`, color: K.col || st.sector.color, t: 0, life: 2.6 };
  else if (st.n >= 3 && n === midWave(st)) { S.banner = { text: 'MID BOSS', color: '#ff5a6a', t: 0, life: 2.6 }; play('drums', 0.6); }
  else if (n === twistWave(st)) { S.banner = { text: TWIST_TEXT[twistOf(st)], color: '#ff8a4a', t: 0, life: 2.8 }; }
  else if (st.kind === 'brush') S.banner = { text: `WAVE ${n}`, color: '#ff5a6a', t: 0, life: 2.4 };
  else S.banner = { text: `WAVE ${n}`, color: lastW ? '#ff5a6a' : '#ffd966', t: 0, life: 2.4 };
}
// 튜토리얼: 훈련장에서 한 단계씩 직접 해 본다
const TUT_STEPS = ['캡슐 누르기', '같은 기체 겹치기', '부품으로 소환', '위로 끌어 해체', '강화 고르기', '사령관 스킬 쓰기'];
function updateTut(dt) {
  const T = S.tut;
  T.t += dt;
  S.hp = S.maxHp;   // 훈련장에서는 지지 않는다
  if (T.step === 1) {
    if (!T.cap || (T.cap.dead && !T.cap.claimed)) {
      T.cap = makeCap({ type: PROG.deck[0] || 'f', lv: 1, n: 1 }, W / 2, 1);
      T.cap.lock = true; T.cap.y = 150; T.cap.speed = 16; T.cap.hits = T.cap.maxHits = 8;
    }
    if (T.cap.claimed) { T.step = 2; T.t = 0; tutOk(); }
  } else if (T.step === 2) {
    if (!pairOnGrid()) { const u = gridUnits()[0]; if (u) giveUnit(u.type, u.lv, W / 2, 420, '#8dff9a'); }
    if (T.merged) { T.step = 3; T.t = 0; tutOk(); }
  } else if (T.step === 3) {   // 소환: 부품을 채워 주고 소환 버튼
    if (T.sum0 == null) { T.sum0 = S.summons || 0; const need = summonCost() - S.gear; if (need > 0) addGear(need, W / 2, 420); }
    if ((S.summons || 0) > T.sum0) { T.step = 4; T.t = 0; tutOk(); }
  } else if (T.step === 4) {   // 해체: 부품 얻기
    if (!T.s4) { T.s4 = true; if (!allUnits().some(u => u.lv === 1 && uSize(u) === 1)) giveUnit(PROG.deck[0] || 'f', 1, W / 2, 420, '#8dff9a'); }
    if (T.scrapped) { T.step = 5; T.t = 0; tutOk(); }
  } else if (T.step === 5) {   // 강화 고르기: 같은 등급 세 장
    if (!T.s7 && T.t > 0.6) { T.s7 = true; S.mode = 'perk'; S.perkChoices = ['dmg', 'spd', 'crit'].map(id => PERKS.find(p => p.id === id)); S.perkT0 = performance.now() / 1000; }
    if (S.perks.length) { T.step = 6; T.t = 0; tutOk(); }
  } else if (T.step === 6) {   // 사령관 스킬: 게이지를 채워 주고 궤도 포격
    if (!T.s9) { T.s9 = true; S.cmd = 100; S.cmdTut = {}; for (const e of S.enemies) e.dead = true; for (let k = 0; k < 5; k++) { const e = spawnEnemy('grunt', W / 2 + (k - 2) * 46, 190 + (k % 2) * 40); e.speed *= 0.3; } }   // 한데 모인 적 다섯
    if (S.cmdTut && S.cmdTut.done) { T.step = 7; T.t = 0; }
  } else if (T.t > 1.6 && !T.end) {
    T.end = true;
    for (const e of S.enemies) e.dead = true;
    const first = !PROG.trained; PROG.trained = true; PROG.tut = true; PROG.seen.cmdTut = true;
    if (first) PROG.credits += 200;
    save(); play('clear_fx', 0.6);
    S.banner = { text: '훈련 완료', color: '#5affc8', t: 0, life: 2.6 };
    setTimeout(() => { if (S.tut === T) { goMap(); UI.prep = { n: 1 }; } }, 2600);   // 1스테이지 출격 준비로
  }
}
function pairOnGrid() {
  const us = allUnits();
  return us.some(a => us.some(b => a !== b && a.type === b.type && a.lv === b.lv));
}
// 손가락 그림: (x, y)가 손끝. press 0~1이면 누르는 중
function drawHand(x, y, press = 0, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(1 - 0.1 * press, 1 - 0.1 * press);
  const rr = (x0, y0, w, h, r) => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); };
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a2238'; ctx.lineWidth = 3;
  rr(-8, 0, 16, 40, 8); ctx.fill(); ctx.stroke();                 // 집게손가락
  rr(-14, 30, 40, 38, 12); ctx.fill(); ctx.stroke();              // 손바닥
  for (const fx of [8, 18]) { rr(fx - 1, 24, 12, 22, 6); ctx.fill(); ctx.stroke(); }
  rr(-24, 40, 14, 22, 7); ctx.fill(); ctx.stroke();               // 엄지
  ctx.shadowColor = 'transparent';
  rr(-8, 0, 16, 40, 8); ctx.fill();
  ctx.restore();
}
function tapRipple(x, y, k) { ctx.strokeStyle = `rgba(255,236,150,${1 - k})`; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(x, y, 10 + 34 * k, 0, Math.PI * 2); ctx.stroke(); }
// 누르기 시연: 손이 내려와 톡 누르고 물결이 퍼진다
function tapDemo(x, y) {
  const c = (S.time % 1.3) / 1.3, press = c > 0.35 && c < 0.55 ? 1 : 0;
  if (c > 0.4) tapRipple(x, y, Math.min(1, (c - 0.4) / 0.5));
  drawHand(x + (c < 0.35 ? (0.35 - c) * 60 : 0), y + (c < 0.35 ? (0.35 - c) * 90 : 0), press, c > 0.85 ? (1 - c) / 0.15 : 1);
}
// 끌기 시연: 반투명한 기체를 들고 손이 목적지까지 간다
function dragDemo(from, to, u) {
  if (drag && drag.moved) return;
  const c = (S.time % 1.9) / 1.9, k = Math.max(0, Math.min(1, (c - 0.18) / 0.55)), e = k * k * (3 - 2 * k);
  const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e, a = c > 0.88 ? (1 - c) / 0.12 : 1;
  ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = '#ffe690'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore();
  if (u && c > 0.12) { ctx.save(); ctx.globalAlpha = 0.6 * a; drawUnit(u, x, y - 18, 0.75, 0.9); ctx.restore(); }
  if (c > 0.74) tapRipple(to.x, to.y, Math.min(1, (c - 0.74) / 0.2));
  drawHand(x, y, c > 0.12 && c < 0.76 ? 1 : 0, a);
}
// 해냈을 때 가운데에 잠깐 뜨는 초록 체크
function tutOk() { S.tutOkT = S.time; play('confirm', 0.5); }
function drawTutOk() {
  const k = (S.time - (S.tutOkT ?? -9)) / 0.9;
  if (k < 0 || k > 1) return;
  const sc = k < 0.25 ? 0.5 + k * 2.4 : 1.1 - (k - 0.25) * 0.1, a = k > 0.7 ? (1 - k) / 0.3 : 1, cx = W / 2, cy = 330;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
  drawGlow('#5aff9a', 0, 0, 70, 0.5);
  ctx.fillStyle = 'rgba(10,40,24,.92)'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6dff9a'; ctx.lineWidth = 5; ctx.stroke();
  ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-5, 16); ctx.lineTo(20, -14); ctx.stroke();
  ctx.restore();
}
// 위쪽 이름표: 단계 번호와 두세 단어
function tutLabel(txt, step, total) {
  ctx.font = FK(19); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lab = total ? `${step}/${total}  ${txt}` : txt, w = ctx.measureText(lab).width + 36, y = 92;
  ctx.fillStyle = 'rgba(4,12,34,.85)'; chamfer(W / 2 - w / 2, y - 18, w, 36, 10); ctx.fill();
  ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.5; ctx.stroke();
  outlineText(lab, W / 2, y + 1, '#fff', 4);
}
function drawTut() {
  drawTutOk();
  const T = S.tut;
  if (!T || T.step > TUT_STEPS.length) return;
  tutLabel(TUT_STEPS[T.step - 1], T.step, TUT_STEPS.length);
  if (T.step === 1 && T.cap && !T.cap.dead) tapDemo(T.cap.x, T.cap.y + 10);
  if (T.step === 2) {
    const us = allUnits();
    for (const a of us) { const b = us.find(o => o !== a && o.type === a.type && o.lv === a.lv); if (b && a.cells && b.cells) { dragDemo(unitPos(a), unitPos(b), a); break; } }
  }
  if (T.step === 3) tapDemo(W - 77, LINE_Y - 26);   // 소환 버튼
  if (T.step === 4) {
    const u = allUnits().filter(q => uSize(q) === 1 && q.cells).sort((a, b) => a.lv - b.lv)[0];
    if (u) { const p = unitPos(u); dragDemo(p, { x: p.x, y: SCRAP_Y - 110 }, u); }
  }
  button(12, 74, 92, 32, '건너뛰기', 'tutskip', 'ghost');
}
function hint(msg) {
  if (S.hint === msg || S.hintQueue.includes(msg)) return;
  S.hintQueue.push(msg);
}
function hintOnce(key, msg) {
  if (PROG.seen[key]) return;
  PROG.seen[key] = true; save();
  hint(msg);
}

