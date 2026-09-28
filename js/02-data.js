'use strict';
// ── 배경음악: 상황별 곡, 교차 페이드 ──
const MUS = { tracks: {} };
const BOSS_TRACK = { boss1: 'boss1', boss2: 'boss1', boss3: 'boss2', boss4: 'boss3', boss5: 'boss2', boss6: 'boss3' };
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
       desc: '두 칸을 차지하지만 튼튼하고 화력이 강해요.', unlock: { stage: 12 } },
  r: { name: '요새포', role: '대형, 세로 2칸', img: 'u_r', iw: 76, ih: 150, hp: 8, dmg: 120, cd: 2.6, sp: 430, turn: 3, splash: 90, shape: 'v2', cost: 34, col: '#ff90bd', stat: [5, 1, 5],
       desc: '사거리 밖의 적까지 포격하는 초장거리 포대예요.', unlock: { stage: 15 } },
  h: { name: '화염방사기', role: '근거리 화력', img: 'u_h', iw: 48, ih: 48, rot: true, hp: 5, dmg: 55, cd: 0.1, shape: 1, cost: 16, col: '#ff8000', stat: [5, 5, 3],
       desc: '가까이 온 적을 불길로 녹여요. 사거리가 짧아요.', unlock: { shop: 300 } },
  n: { name: '기뢰 부설기', role: '함정', img: 'u_n', iw: 60, ih: 38, hp: 4, dmg: 75, cd: 2.5, shape: 1, cost: 16, col: '#ed0e90', stat: [4, 1, 2],
       desc: '전장에 기뢰를 깔아 지나가는 적을 터뜨려요.', unlock: { shop: 400 } },
  x: { name: '레이더 기지', role: '지원', img: 'u_x', iw: 42, ih: 70, hp: 4, dmg: 0, cd: 1, shape: 1, cost: 16, col: '#0aa982', stat: [0, 0, 2],
       desc: '주변 8칸 기체의 공격 속도와 화력을 올려요. 직접 쏘지는 않아요.', unlock: { shop: 500 } },
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
const LV_MUL = [1, 2.3, 5.3, 12.2, 28, 64, 147, 338];
const LV_COL = ['#48c8ff', '#48c8ff', '#5ae0ff', '#b86bff', '#ffd24a', '#4a8cff', '#ff3a5a', '#ff7ae0'];
// 초월(Lv6~8): 합칠 때마다 화력 ×2.3, Lv5 주기 스킬 대기시간 -25%. 초월 III 계급장 별은 무지갯빛
const RAINBOW = ['#ff4a6a', '#ffa03a', '#ffe24a', '#5aff9a', '#48c8ff', '#b86bff'];
const lvIdx = lv => Math.min(lv, 5) - 1;   // 레벨별 표(5칸)는 초월해도 Lv5 값을 쓴다
const tier = u => Math.max(0, u.lv - 5);
const TRANSCEND = ['초월 I', '초월 II', '초월 III'];
const TRANS_EXTRA = { w: '받는 피해가 더 줄어요.', g: '대신 받는 피해도 줄어요.', m: '수리 주기도 짧아져요.', x: '버프 효과도 커져요.', k: '해킹 간격도 짧아져요.', d: '드론도 더 빨리 쏴요.' };
const transDesc = t => '화력 ×2.3, 체력도 늘어요. ' + (SKILL_CD[t] ? 'Lv5 주기 스킬이 25% 더 자주 터져요.' : TRANS_EXTRA[t] || '');
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
  h: [['화염 분사', '가까운 적에게 불길을 계속 뿜어요.'], ['넓은 불길', '불길이 더 넓게 퍼져요.'], ['화상', '불이 붙은 적은 3초 동안 계속 타요.'], ['불벽', '6초마다 방어선 앞에 불벽을 세워요.'], ['플라즈마 분사', '푸른 플라즈마로 바뀌어 사거리와 화력이 크게 늘어요.']],
  n: [['기뢰', '적이 지나갈 길목에 기뢰를 깔아요.'], ['기뢰 2개', '한 번에 기뢰 2개를 깔아요.'], ['연쇄 기뢰', '폭발이 근처 기뢰를 함께 터뜨려요.'], ['중력 기뢰', '터지기 전에 주변 적을 끌어당겨요.'], ['블랙홀', '9초마다 적이 몰린 곳에 블랙홀을 열어요.']],
  x: [['신호 증폭', '주변 8칸 기체의 공격 속도 +20%.'], ['화력 보정', '주변 기체의 화력도 +15%.'], ['정밀 유도', '주변 기체 공격 속도 +30%, 화력 +25%.'], ['약점 스캔', '모든 적이 받는 피해 +15%.'], ['전군 강화', '모든 기체의 공격 속도와 화력 +15%.']],
  v: [['중력장', '맞은 자리에 적을 끌어당기고 느리게 하는 중력장을 만들어요.'], ['넓은 중력장', '중력장이 더 넓어져요.'], ['압착', '중력장 안의 적이 계속 피해를 받아요.'], ['쌍중력장', '중력탄 두 발을 쏴요.'], ['특이점', '중력장이 끝날 때 안쪽으로 붕괴하며 큰 피해를 줘요.']],
  w: [['방벽', '받는 피해가 절반이고, 산탄으로 적을 쏴요.'], ['요격', '8초에 한 번, 주변 칸을 노린 저격, 폭격, 운석을 쏴서 막아요.'], ['엄호', '상하좌우로 붙은 기체가 받는 피해 -25%.'], ['빠른 요격', '요격 간격이 5초로 짧아져요.'], ['방어선 복구', '15초마다 기지 방어막을 1 회복해요.']],
  l: [['레일탄', '적을 꿰뚫는 레일탄을 쏴요.'], ['쌍열 레일', '레일탄 두 발을 나란히 쏴요.'], ['삼열 레일', '레일탄 세 발을 부채꼴로 쏴요.'], ['과충전', '레일탄이 30% 확률로 2.5배 피해를 줘요.'], ['궤도 관통포', '6초마다 화면을 가르는 거대 레일로 한 줄의 적에게 막대한 피해를 줘요.']],
  q: [['이온 빔', '3초마다 자기 세로줄 위로 빔을 쏴요.'], ['긴 조사', '빔이 더 오래 나가요.'], ['광폭 빔', '빔이 더 넓어져요.'], ['이온 감속', '빔에 맞은 적이 느려져요.'], ['궤도 낙뢰', '8초마다 세 배 굵은 빔을 2초 동안 내리꽂아요.']],
  y: [['주포', '무거운 포탄을 쏘고 드론 3기를 띄워요.'], ['드론 증원', '드론이 4기로 늘어요.'], ['편대', '드론이 6기로 늘어요.'], ['자폭 드론', '5초마다 드론 하나가 강한 적에게 돌진해 터져요.'], ['함재기 폭격', '8초마다 적이 가장 많은 곳에 폭격을 떨어뜨려요.']],
  k: [['해킹', '7초마다 적 하나를 4초 동안 아군으로 만들어요.'], ['빠른 해킹', '해킹 간격이 짧아져요.'], ['자폭 명령', '해킹이 끝나면 그 적이 자폭해요.'], ['다중 해킹', '한 번에 두 기를 해킹해요.'], ['시스템 장악', '해킹이 6초로 길어지고 간격도 짧아져요.']],
};
const unitMaxHp = (type, lv) => Math.round(UNIT[type].hp * (1 + 0.3 * (lv - 1))) + Math.floor(mkNow(type) / 3) + (S && S.pk ? S.pk.hp : 0);
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
const isOwned = t => { const u = UNIT[t].unlock; return u === 'base' || (u.stage && PROG.stars[u.stage] > 0) || PROG.owned.includes(t); };
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
  boss1:   { img: 'enemies/boss1', hp: 8000,  speed: 11, r: 90,  dmg: 99, w: 224, h: 196, boss: true, name: '외계 모함', atk: 'column', atkCd: 7, atkDmg: 3 },
  boss2:   { img: 'enemies/boss2', hp: 9500,  speed: 10, r: 100, dmg: 99, w: 230, h: 226, boss: true, name: '거대 운석 핵', spin: 0.3, atk: 'meteor', atkCd: 6, atkDmg: 3 },
  boss3:   { img: 'enemies/boss3',  hp: 9000,  speed: 10, r: 96,  dmg: 99, w: 210, h: 210, boss: true, name: 'UFO 모선', spin: 0.8, shield: 0.35, regen: 6, atk: 'row', atkCd: 8, atkDmg: 3 },
  boss5:   { img: 'enemies/boss5', hp: 14000, speed: 9, r: 100, dmg: 99, w: 250, h: 210, boss: true, name: '빙결 요새', shield: 0.3, atk: 'freeze', atkCd: 6.5, atkDmg: 0 },
  boss6:   { img: 'enemies/boss6', hp: 17000, speed: 8, r: 104, dmg: 99, w: 250, h: 230, boss: true, name: '블랙홀 모함', regen: 8, atk: 'cross', atkCd: 7, atkDmg: 3 },
  boss4:   { img: 'enemies/boss4', hp: 12000, speed: 9,  r: 104, dmg: 99, w: 252, h: 216, boss: true, name: '최종 기함', shield: 0.25, regen: 8, atk: 'cross', atkCd: 8, atkDmg: 3 },
};
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
  sniper:  '저격함이 내 기체를 노려요! 붉게 표시된 칸에서 기체를 빼거나, 저격함을 탭해 먼저 격추하세요.',
  gunship: '포격함은 세로 한 줄을 통째로 쓸어요. 그 열에서 기체를 옮기세요.',
  bomber:  '폭격기는 대각선으로 폭탄을 떨어뜨려요.',
  meteor:  '운석이 떨어지는 자리에 그림자가 생겨요. 그 네 칸을 비우세요.',
  phase:   '위상함은 잠깐씩 투명해져서 공격이 통하지 않아요. 다시 보일 때 노리세요.',
  grav:    '중력함은 근처 캡슐을 끌어당겨 위로 데려가요. 캡슐을 지키려면 먼저 격추하세요.',
  freeze:  '파란 칸은 빙결 포격이에요. 맞은 기체는 4초 동안 얼어서 쏘지 못해요.',
};

// ── 구역과 스테이지 ───────────────────────────────────────
const SECTORS = [
  { name: '궤도 방어선', color: '#48c8ff', planet: ['#7fe0d0', '#3a6fa8', '#1d1f4a'],
    info: '졸개, 중장갑, 운석 떼, 저격함', pool: ['tank', 'rocks'], atk: ['sniper'], fresh: [], boss: 'boss1' },
  { name: '소행성대', color: '#ffb347', planet: ['#ffd08a', '#b0643a', '#3a1d18'],
    info: '새 적: 분열 운석, 돌격기, 포격함, 운석 낙하', pool: ['tank', 'rocks', 'split', 'rusher'], atk: ['sniper', 'gunship', 'meteor'], fresh: ['split', 'rusher'], boss: 'boss2' },
  { name: '성운', color: '#c77dff', planet: ['#f0a8ff', '#7a3fb0', '#24123e'],
    info: '새 적: 보호막함, 수리선, 폭격기', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer'], atk: ['sniper', 'gunship', 'bomber'], fresh: ['shield', 'healer'], boss: 'boss3' },
  { name: '적 본성', color: '#ff5a6a', planet: ['#ff9a8a', '#a8323a', '#2a0a14'],
    info: '새 적: 캡슐 도둑', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief'], atk: ['sniper', 'gunship', 'bomber', 'meteor'], fresh: ['thief'], boss: 'boss4' },
  { name: '얼음 고리', color: '#a8f0ff', planet: ['#effcff', '#6ab8d8', '#12304a'],
    info: '새 적: 위상함, 빙결 포격', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'phase'], atk: ['sniper', 'gunship', 'bomber', 'freeze'], fresh: ['phase'], boss: 'boss5' },
  { name: '블랙홀', color: '#ffc46a', planet: ['#fff0c8', '#c07a2a', '#1a0f06'],
    info: '새 적: 중력함', pool: ['tank', 'rocks', 'split', 'rusher', 'shield', 'healer', 'thief', 'phase', 'grav'], atk: ['sniper', 'gunship', 'bomber', 'meteor', 'freeze'], fresh: ['grav'], boss: 'boss6' },
];
const STAGE_COUNT = SECTORS.length * 5;
function stageInfo(n) {
  const s = Math.floor((n - 1) / 5), i = (n - 1) % 5;
  return { n, s, i, sector: SECTORS[s], boss: i === 4, waves: 5 };
}
let WAVE_GROWTH = 0.4, IN_SECTOR = 0.05, BOSS_MUL = 1.0;   // 보스 약점(피해 2배) 몫만큼 올림
let SECTOR_MUL = [0.95, 1.35, 1.6, 3.0, 3.9, 4.8].map(v => v * 1.12);   // 부품이 넉넉해진 만큼 적도 조금 튼튼하게
// 구역이 올라갈수록 기지가 보강된 상태로 시작한다 (편성 앞쪽 공격 기체부터)
const START_LV = [[1, 1, 1, 1], [2, 1, 1, 1], [2, 2, 2, 1], [3, 2, 2, 2], [3, 3, 2, 2], [3, 3, 3, 2]];

function pickWeighted(pool, fresh) {
  const bag = [];
  for (const k of pool) { bag.push(k); if (fresh.includes(k)) bag.push(k, k); }
  return bag[Math.floor(R() * bag.length)];
}
// 캡슐 내용: 편성한 5종에서만 나온다
function rollReward(n, w, avoid) {
  if (R() < 0.05 + 0.01 * Math.floor((n - 1) / 5)) return { heal: 2 };
  const deck = battleDeck();
  let type, guard = 0;
  do { type = deck[Math.floor(R() * deck.length)]; } while (avoid && type === avoid.type && guard++ < 8);
  const r = R() + 0.035 * (n - 1) + 0.12 * (w - 1);
  let lv = 1, cnt = 1;
  if (UNIT[type].shape !== 1) { lv = 1; cnt = 1; }
  else if (r < 0.55) cnt = type === 'f' ? 1 + Math.floor(R() * 2) : 1;
  else if (r < 1.05) { if (R() < 0.5) lv = 2; else cnt = type === 'f' ? 3 : 2; }
  else lv = R() < 0.5 ? 3 : 2;
  return { type, lv, n: cnt };
}
// 한 판 = 5웨이브. 기(정찰) 승(본대) 승(공격형 합류) 전(반전 이벤트) 결(총공세 또는 보스)
const TWISTS = ['elite', 'ambush', 'meteors', 'supply'];
const TWIST_TEXT = {
  elite:   ['ELITE', '엘리트 전함이 나타났어요. 격추하면 고급 캡슐을 떨궈요'],
  ambush:  ['AMBUSH', '측면 기습! 돌격기가 양옆에서 파고들어요'],
  meteors: ['METEOR STORM', '운석우가 쏟아져요. 그림자를 피하세요'],
  supply:  ['SUPPLY RUN', '보급 캡슐이 쏟아져요. 욕심낼 때와 버틸 때를 가리세요'],
};
const twistOf = st => st.twist || TWISTS[(st.n - 1) % TWISTS.length];
function buildWave(st, w) {
  const ev = [];
  const bossWave = st.boss && w === st.waves;
  const twist = w === 4 ? twistOf(st) : null;
  const dur = bossWave ? 50 : w === 5 ? 28 : 22;
  const gap = bossWave ? 3.2 : Math.max(0.75, 1.75 - 0.12 * (w - 1) - 0.05 * st.i - (w === 5 ? 0.2 : 0));
  for (let t = 1; t < dur; t += gap) ev.push({ t, k: 'grunt' });
  let pool = st.sector.pool;
  if (st.n === 1) pool = w <= 3 ? ['tank'] : ['tank', 'rocks'];
  let count = st.n === 1 ? Math.max(0, w - 2) : (bossWave ? 1 + Math.min(st.s, 2) : Math.ceil(w * 0.7) + Math.floor(st.i / 2) + Math.min(st.s, 2));
  if (w === 1) count = Math.min(count, 1);
  for (let k = 0; k < count; k++) {
    let type = pickWeighted(pool, st.sector.fresh);
    if (k === 0 && st.i === 0 && st.sector.fresh.length && w >= 2) type = st.sector.fresh[w % st.sector.fresh.length];
    ev.push({ t: 3 + (k + 0.5) * (dur - 6) / count, k: type });
  }
  if (st.n >= 2 && !bossWave && w >= 2) {
    const atkN = Math.min(3, (w >= 3 ? 1 : 0) + (w >= 5 ? 1 : 0) + (st.i >= 3 ? 1 : 0) + (st.s >= 2 ? 1 : 0) + (st.n === 2 && w === 2 ? 1 : 0));
    for (let k = 0; k < atkN; k++) {
      const pool2 = st.sector.atk;
      const type = k === 0 && st.i === 0 ? pool2[pool2.length - 1] : pool2[Math.floor(R() * pool2.length)];
      ev.push({ t: 4 + (k + 0.3) * (dur - 8) / Math.max(1, atkN), k: type });
    }
  }
  if (twist === 'elite') ev.push({ t: 4, k: 'elite' });
  if (twist === 'ambush') for (let k = 0; k < 4; k++) ev.push({ t: 4 + k * 4.5, k: 'ambush' });
  if (twist === 'meteors') for (let k = 0; k < 3; k++) { ev.push({ t: 5 + k * 5.5, k: 'meteor' }); ev.push({ t: 3 + k * 6, k: 'rocks' }); }
  if (bossWave) ev.push({ t: 1.5, k: st.sector.boss });
  if (st.n >= 2 && w >= 2 && !bossWave && R() < 0.3) ev.push({ t: 6 + R() * 10, k: 'gold' });
  let capT = bossWave ? [6, 14, 24, 32, 40] : w === 5 ? [3, 8, 13, 18, 22, 26] : [3, 7.5, 12, 16.5, 21];   // 판이 작게 시작하니 기체가 자주 와야 한다
  if (twist === 'supply') {
    capT = [2, 5, 8, 11, 14, 17, 20];
    for (let k = 0; k < 2; k++) ev.push({ t: 6 + k * 7, k: st.s >= 3 ? 'thief' : st.s >= 1 ? 'rusher' : 'grunt' });
  }
  capT.forEach((t, k) => {
    const a = rollReward(st.n, Math.min(w, 3));
    ev.push({ t, k: 'cap', r: k % 2 ? [a, rollReward(st.n, Math.min(w, 3), a)] : a });
  });
  return ev.sort((a, b) => a.t - b.t);
}

// 무한 방어선: 10웨이브가 한 주기. 1~3 평이, 4 반전, 5 강화 선택, 6 새 변이, 9 위기, 10 보스(30웨이브부터 둘), 다음 주기 첫 판은 보급
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
function buildEndlessWave(w) {
  const ci = cyclePos(w), cyc = Math.floor((w - 1) / 10);
  const tier = Math.min(3, Math.floor((w - 1) / 6));
  const bossW = ci === 10, bs = Math.floor(R() * SECTORS.length), supply = ci === 1 && w > 10;
  S.crisis = ci === 9;
  S.stage.s = bossW ? bs : tier; S.stage.sector = SECTORS[S.stage.s];
  const st = { n: Math.min(20, 3 + w), s: tier, i: Math.min(3, Math.floor(w / 5)), sector: SECTORS[S.stage.s], boss: bossW, waves: 5, twist: supply ? 'supply' : TWISTS[1 + cyc % 2] };
  const ev = buildWave(st, bossW ? 5 : supply ? 4 : [2, 3, 4, 4, 5, 2, 3, 4, 5][ci - 1]);
  if (ci === 5) { ev.push({ t: 4, k: 'elite' }); if (cyc >= 2) ev.push({ t: 12, k: 'elite' }); }   // 미니보스
  if (LULL(ci) && !supply) for (const t of [5, 13]) ev.push({ t, k: 'cap', r: rollReward(st.n, 3) });   // 숨 돌리는 웨이브엔 캡슐을 더
  const atk = st.sector.atk, add = (k, t, x) => ev.push({ t, k, x });
  if (S.crisis) {
    for (let k = 0; k < 3; k++) add(atk[k % atk.length], 5 + k * 5);
    for (let t = 2; t < 26; t += 1.6) add('grunt', t);
  }
  if (mutOn('raid') && !bossW) for (let k = 0; k < 2; k++) add(atk[Math.floor(R() * atk.length)], 6 + k * 7);
  if (mutOn('swarm')) { const gs = ev.filter(e => e.k === 'grunt'); for (let k = 0; k < Math.round(gs.length * 0.6); k++) add('grunt', gs[k].t + 0.5); }
  if (bossW && w >= 30) {
    const b1 = ev.find(e => ENEMY[e.k] && ENEMY[e.k].boss);
    let k2; do { k2 = SECTORS[Math.floor(R() * SECTORS.length)].boss; } while (k2 === b1.k);
    b1.x = 160; add(k2, 4, W - 160);
  }
  return ev.sort((a, b) => a.t - b.t);
}
const PERKS = [
  { id: 'dmg', cat: 'atk', name: '화력 증폭', desc: '모든 기체 화력 +15%', col: '#ff8a4a', apply: () => { S.pk.dmg *= 1.15; } },
  { id: 'spd', cat: 'atk', name: '냉각 개선', desc: '모든 기체 공격 속도 +12%', col: '#48c8ff', apply: () => { S.pk.spd *= 1.12; } },
  { id: 'shield', cat: 'def', name: '방어선 보강', desc: '기지 보호막 최대치 +3, 즉시 +3', col: '#5affc8', apply: () => { S.maxHp += 3; S.hp += 3; } },
  { id: 'armor', cat: 'def', name: '장갑 강화', desc: '모든 기체 최대 체력 +2', col: '#6ad0ff', apply: () => { S.pk.hp += 2; for (const u of allUnits()) { u.maxHp += 2; u.hp += 2; } } },
  { id: 'cap', cat: 'sup', name: '보급 효율', desc: '캡슐을 까는 데 필요한 타수 -20%', col: '#ffd84a', apply: () => { S.pk.cap *= 0.8; } },
  { id: 'front', cat: 'atk', name: '화력 정비', desc: '정비소 공격 칸 효과 +50%', col: '#ffb347', apply: () => { S.pk.front += 0.5; } },
  { id: 'slow', cat: 'def', name: '중력 교란', desc: '모든 적 이동 속도 -10%', col: '#b86bff', apply: () => { S.pk.enemySpd *= 0.9; } },
  { id: 'repair', cat: 'def', name: '자동 수리', desc: '웨이브를 넘길 때마다 기지 보호막 +1', col: '#6dff8a', apply: () => { S.pk.regen += 1; } },
  { id: 'gift', cat: 'sup', name: '긴급 증원', desc: '편성 기체 중 하나를 Lv3으로 지급', col: '#ffe24a', apply: () => {
      const pool = battleDeck().filter(t => UNIT[t].shape === 1); giveUnit(pool[Math.floor(Math.random() * pool.length)] || 'f', 3, W / 2, 420, '#ffe24a'); } },
  { id: 'crit', cat: 'atk', name: '약점 분석', desc: '모든 공격이 15% 확률로 2배 피해', col: '#ff5a8a', apply: () => { S.pk.crit += 0.15; } },
  { id: 'salvage', cat: 'sup', name: '부품 회수', desc: '격추한 적이 부품을 두 배 자주 떨궈요', col: '#ffc86a', apply: () => { S.pk.gear *= 2; } },
  { id: 'summon', cat: 'sup', name: '소환 할인', desc: '소환에 드는 부품 -2', col: '#ffe08a', apply: () => { S.pk.summonOff += 2; } },
  { id: 'elite', cat: 'sup', name: '정예 소환', desc: '소환하면 나오는 기체 레벨 +1', col: '#ffc24a', ok: () => summonLv() < 5, apply: () => { S.pk.summonLv += 1; } },
  { id: 'cmdup', cat: 'sp', name: '지휘 통신', desc: '사령관 게이지가 60% 더 빨리 차요', col: '#ffd24a', ok: () => cmdOpen(), apply: () => { S.pk.cmd *= 1.6; } },
  { id: 'chain', cat: 'sp', name: '연쇄 폭발', desc: '격추한 적이 터지며 주변 적에게 피해를 줘요', col: '#ff6a3a', apply: () => { S.pk.chain += 0.35; } },
  { id: 'arc', cat: 'sp', name: '합체 방전', desc: '합체할 때마다 가까운 적 셋에게 번개가 떨어져요', col: '#9ad8ff', apply: () => { S.pk.arc += 1; } },
];
const PERK_CAT = { atk: ['공격', '#ff8a4a'], def: ['방어', '#5affc8'], sup: ['보급', '#ffd84a'], sp: ['특수', '#b88aff'] };
function rollPerks() {
  const bag = PERKS.filter(p => !p.ok || p.ok()), out = [];
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  for (const p of bag) if (out.length < 3 && !out.some(q => q.cat === p.cat)) out.push(p);
  for (const p of bag) if (out.length < 3 && !out.includes(p)) out.push(p);
  S.perkT0 = performance.now() / 1000;
  return out;
}

// ── 게임 상태 ─────────────────────────────────────────────
let S = { mode: 'title' };
let BUTTONS = [];
let UI = { card: null, settings: false, resetArm: 0, toast: null, coreShown: null, upFx: null, parts: [], lastT: 0 };
function startStage(n, endless = false, daily = false) {
  UI.enemyIntro = null; UI.introQ = null; UI.aim = null;
  const st = endless ? { n: 0, s: 0, i: 0, sector: SECTORS[0], boss: false, waves: Infinity, endless: true } : stageInfo(n);
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
    score: 0, perks: [], perkChoices: null, cores: 0, corePulse: 0, dmgBy: {}, used: {},
    pk: { dmg: 1, spd: 1, hp: 0, cap: 1, front: 0, enemySpd: 1, regen: 0, crit: 0, gear: 1, summonOff: 0, summonLv: 0, cmd: 1, chain: 0, arc: 0 }, chainQ: [],
    gear: 0, cellFx: new Array(COLS * ROWS).fill(null), rowsOpen: START_ROWS, mut: [], crisis: false, punch: 0,
  };
  if (daily) { S.daily = { day: dayKey(), deck: dailyDeck(dayKey()) }; lbFetchDaily(true); }
  const types = battleDeck().filter(t => UNIT[t].shape === 1).sort((a, b) => UNIT[b].stat[0] * UNIT[b].stat[1] - UNIT[a].stat[0] * UNIT[a].stat[1]);
  START_LV[endless ? 1 : st.s].forEach((lv, j) => { const u = makeUnit(types[j % types.length] || 'f', lv); S.used[u.type] = (S.used[u.type] || 0) + Math.pow(2, lv - 1); const sp = findSpot(u); if (sp) place(u, sp); });
  hintOnce('info', '기체를 꾹 누르면 정보가 나와요');
  if (endless) hintOnce('endless3', '5웨이브마다 강화, 10웨이브마다 보스');
  if (n === 1 && !endless && !PROG.tut && !PROG.stars[1] && !SHOT) S.tut = { step: 1, t: 0 };
  if (!SHOT && !PROG.seen.cmdTut && cmdOpen()) S.cmdTut = {};
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
    S.warnText = null;
    if (ci === 10) { S.warning = 3; S.banner = null; play('drums', 0.7); if (n >= 30) S.warnText = '보스 두 척이 한꺼번에 접근하고 있어요'; }
    else if (mut) { S.banner = { text: 'MUTATION', sub: `${mut.name}: ${mut.desc}`, color: '#ff5ad8', t: 0, life: 3.2 }; play('drums', 0.55, 1.1); S.glitch = 0.5; }
    else if (ci === 9) { S.banner = { text: 'CRISIS', sub: '보스 전 총공세! 공격형 함선이 몰려와요', color: '#ff3a4a', t: 0, life: 2.8 }; play('drums', 0.7); shake(0.5); }
    else if (ci === 5) { S.banner = { text: 'MINI BOSS', sub: '엘리트 전함이 나타났어요. 넘기면 강화를 고를 수 있어요', color: '#ffb347', t: 0, life: 2.8 }; play('drums', 0.6); }
    else if (LULL(ci) && !(ci === 1 && n > 10)) S.banner = { text: 'LULL', sub: '잠시 잠잠해요. 캡슐을 모으고 기체를 합칠 때예요', color: '#5affc8', t: 0, life: 2.6 };
    else if (ci === 4 || (ci === 1 && n > 10)) { const [tt, sub] = TWIST_TEXT[ci === 4 ? TWISTS[1 + Math.floor((n - 1) / 10) % 2] : 'supply']; S.banner = { text: tt, sub, color: '#ff8a4a', t: 0, life: 2.6 }; }
    else S.banner = { text: `WAVE ${n}`, sub: `${ci === 4 ? '다음은 미니보스예요. 대비하세요' : ci === 8 ? '다음은 위기, 그다음은 보스예요. 대비하세요' : '끝없는 방어선'}`, color: ci === 5 ? '#ff5a6a' : '#ffd966', t: 0, life: 2 };
    return;
  }
  S.events = buildWave(st, n);
  if (st.boss && n === st.waves) { S.warning = 3; S.banner = null; play('drums', 0.7); }
  else if (n === 1) S.banner = { text: `STAGE ${st.n}`, sub: '정찰대가 방어선을 떠보고 있어요', color: st.sector.color, t: 0, life: 2.4 };
  else if (n === 4) { const [tt, sub] = TWIST_TEXT[twistOf(st)]; S.banner = { text: tt, sub, color: '#ff8a4a', t: 0, life: 2.8 }; }
  else S.banner = { text: `WAVE ${n}`, sub: n === 2 ? '적 본대가 도착했어요' : n === 3 ? (st.n >= 2 ? '공격형 함선이 합류했어요' : '적의 공세가 거세져요') : '마지막 총공세! 버텨내세요', color: n === 5 ? '#ff5a6a' : '#ffd966', t: 0, life: 2.4 };
}
// 튜토리얼: 1 캡슐 탭하기, 2 같은 기체 합체하기, 3 붉은 칸 피하기. 끝나야 첫 웨이브가 시작된다
function updateTut(dt) {
  const T = S.tut;
  T.t += dt;
  if (T.step === 1) {
    if (!T.cap || (T.cap.dead && !T.cap.claimed)) {
      T.cap = makeCap({ type: PROG.deck[0] || 'f', lv: 1, n: 1 }, W / 2, 1);
      T.cap.lock = true; T.cap.y = 150; T.cap.speed = 16; T.cap.hits = T.cap.maxHits = 8;
    }
    if (T.cap.claimed) { T.step = 2; T.t = 0; tutOk(); }
  } else if (T.step === 2) {
    if (!pairOnGrid()) { const u = gridUnits()[0]; if (u) giveUnit(u.type, u.lv, W / 2, 420, '#8dff9a'); }
    if (T.merged) { T.step = 3; T.t = 0; tutOk(); }
  } else if (T.step === 3) {
    if (!T.e) {
      T.unit = gridUnits().filter(u => uSize(u) === 1).sort((a, b) => a.cells[0] - b.cells[0])[0];
      T.cell = T.unit.cells[0];
      T.e = spawnEnemy('sniper', cellPos(T.cell).x, -50);
      T.e.hp *= 30; T.e.maxHp *= 30; T.e.atkT = 999; T.e.hoverY = 300;
    }
    if (!T.atk && T.e.y >= T.e.hoverY - 4) { T.atk = { kind: 'snipe', cells: [T.cell], src: T.e, dmg: 1, t: 0, warn: 4.5 }; S.attacks.push(T.atk); }
    if (T.atk && T.unit.cells && !T.unit.cells.includes(T.cell)) T.dodged = true;
    if (T.atk && (T.atk.done || T.atk.cancelled || T.e.dead)) {
      T.step = 4; T.t = 0;
      if (!T.e.dead) { T.e.hp = T.e.maxHp = T.e.maxHp / 30; T.e.atkLeft = 0; }
      if (T.dodged) tutOk(); else { addText(W / 2, 420, '붉은 칸에서 빼 주세요', '#ffb08a', 24, 1.6); play('deny', 0.5); }
    }
  } else if (T.step === 4) {   // 해체: 부품 얻기
    if (!T.s4) { T.s4 = true; if (!allUnits().some(u => u.lv === 1 && uSize(u) === 1)) giveUnit(PROG.deck[0] || 'f', 1, W / 2, 420, '#8dff9a'); }
    if (T.scrapped) { T.step = 5; T.t = 0; tutOk(); }
  } else if (T.step === 5) {   // 정비소: 칸 강화
    if (!T.s5 && T.t > 0.8) { T.s5 = true; const need = cellNewCost() - S.gear; if (need > 0) addGear(need, W / 2, 420); }
    if (S.cellFx.some(Boolean)) { T.step = 6; T.t = 0; tutOk(); }
  } else if (T.t > 1.4) {
    S.tut = null; PROG.tut = true; save();
    S.banner = { text: 'WAVE 1', sub: '이제 실전이에요', color: S.stage.sector.color, t: 0, life: 2.4 };
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
  if (!T || T.step > 5) return;
  tutLabel(['캡슐 누르기', '같은 기체 겹치기', '붉은 칸에서 빼기', '위로 끌어 해체', '정비소에서 칸 강화'][T.step - 1], T.step, 5);
  if (T.step === 1 && T.cap && !T.cap.dead) tapDemo(T.cap.x, T.cap.y + 10);
  if (T.step === 2) {
    const us = allUnits();
    for (const a of us) { const b = us.find(o => o !== a && o.type === a.type && o.lv === a.lv); if (b && a.cells && b.cells) { dragDemo(unitPos(a), unitPos(b), a); break; } }
  }
  if (T.step === 3 && T.atk && T.unit && T.unit.cells && T.unit.cells.includes(T.cell)) {
    const c = T.cell, r = Math.floor(c / COLS), free = [c + 1, c - 1, c + COLS, c - COLS].find(i => i >= 0 && i < COLS * openRows() && Math.floor(i / COLS) === r + (i === c + COLS ? 1 : i === c - COLS ? -1 : 0) && !S.slots[i]);
    if (free != null) dragDemo(unitPos(T.unit), cellPos(free), T.unit);
  }
  if (T.step === 4) {
    const u = allUnits().filter(q => uSize(q) === 1 && q.cells).sort((a, b) => a.lv - b.lv)[0];
    if (u) { const p = unitPos(u); dragDemo(p, { x: p.x, y: SCRAP_Y - 110 }, u); }
  }
  if (T.step === 5 && !UI.shop) tapDemo(SHOP_BX + 53, LINE_Y - 24);
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

